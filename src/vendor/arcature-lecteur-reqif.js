/* Arcature — lecteur ReqIF (fr), assemblé par « node build.js --lecteur-reqif ». Licence Apache 2.0.
   Expose ArcatureLecteurReqif (voir src/lecteur-reqif/socle-fin.js, docs/LECTEUR-REQIF.md, docs/api/lecteur-reqif.d.ts). */
(function (racine, fabrique) {
  if (typeof module === 'object' && module && module.exports) module.exports = fabrique();
  else racine.ArcatureLecteurReqif = fabrique();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
'use strict';
/* ── src/js/01-config.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   01. CONFIGURATION ET TEXTES
   ═══════════════════════════════════════════════════════════════════════ */


/** Version d'Arcature (à mettre à jour à chaque livraison). */
const ARC_VERSION = '0.1.0';

/**
 * Texte affiché. Le texte français sert de clé : dans la version française, renvoyé tel quel ;
 * pour la version anglaise, `node build.js --lang en` remplace l'argument par sa traduction
 * (dictionnaire src/i18n/en.json). N'envelopper que des textes AFFICHÉS, jamais une valeur
 * comparée ou une clé.
 * @param {string} texte texte français (littéral entre apostrophes)
 * @returns {string}
 */
function _L(texte) { return texte; }

/**
 * Texte affiché avec paramètres : « {n} élément(s) » → remplace {n} par p.n.
 * Même mécanisme de traduction que _L (la phrase entière est traduite, pas ses morceaux).
 * @param {string} texte texte français avec des repères {nom}
 * @param {Object<string,*>} p valeurs des repères
 * @returns {string}
 */
function _Lp(texte, p) { return texte.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)); }

/* ── src/js/10-xml-texte.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   10. XML TEXTE — lecture sans perte et réécriture au format EMF
   ───────────────────────────────────────────────────────────────────────
   Principe : chaque élément garde ses positions dans le texte source.
   - Un élément non modifié est recopié TEL QUEL depuis le texte d'origine
     (round-trip sans perte garanti par construction).
   - Seuls les éléments modifiés sont réécrits, en imitant la sérialisation
     EMF / Capella (indentation, retour à la ligne des attributs, entités).
   On n'utilise PAS DOMParser / XMLSerializer pour l'écriture : XMLSerializer
   réécrit toute la mise en forme et peut écrire les retours à la ligne des
   attributs en clair (ils redeviennent des espaces au rechargement).
   Ce module ne dépend d'aucun autre : il est chargé tel quel par les tests Node. Il sert les formats XML : Capella
   et UML (XMI écrit par EMF, Eclipse UML2 et Papyrus, ou par d'autres outils).
   ═══════════════════════════════════════════════════════════════════════ */

/** Largeur de ligne d'EMF : un attribut passe à la ligne si la ligne courante la dépasse. */
const XT_LARGEUR = 80;
/** Indentation par niveau de profondeur (EMF : 2 espaces). */
const XT_INDENT = '  ';
/** Indentation supplémentaire des lignes de continuation d'attributs (EMF : 4 espaces). */
const XT_CONTINUATION = '    ';

/**
 * Erreur de lecture XML localisée (ligne, colonne).
 * @param {string} src texte source
 * @param {number} pos position de l'erreur
 * @param {string} msg message
 * @returns {Error}
 */
function xtErreur(src, pos, msg) {
  const avant = src.slice(0, pos);
  const ligne = (avant.match(/\n/g) || []).length + 1;
  const col = pos - avant.lastIndexOf('\n');
  const e = new Error(`XML invalide (ligne ${ligne}, colonne ${col}) : ${msg}`);
  e.ligne = ligne; e.colonne = col;
  return e;
}

/**
 * Décode les entités XML d'une valeur d'attribut ou d'un texte.
 * @param {string} s valeur brute (telle qu'écrite dans le fichier)
 * @returns {string} valeur décodée
 */
function xtDecode(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|lt|gt|amp|quot|apos);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[e];
  });
}

/**
 * Encode une valeur d'attribut comme EMF : &, <, " et les caractères de contrôle
 * (tabulation, retour chariot, saut de ligne) ; « > » et l'apostrophe restent en clair.
 * Entre apostrophes (fichiers qui les emploient, comme ceux de Cameo), l'apostrophe est encodée et le guillemet reste en clair ;
 * « > » est encodé si le fichier le fait (Cameo).
 * @param {string} s valeur décodée
 * @param {string} [guillemet] délimiteur de la valeur (« " » par défaut)
 * @param {boolean} [chevron] encoder aussi « > »
 * @returns {string} valeur prête à écrire entre ses délimiteurs
 */
function xtEncodeAttr(s, guillemet, chevron) {
  const apo = guillemet === "'";
  const re = apo ? (chevron ? /[&<>'\t\n\r]/g : /[&<'\t\n\r]/g) : (chevron ? /[&<>"\t\n\r]/g : /[&<"\t\n\r]/g);
  return String(s).replace(re, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;', '\t': '&#x9;', '\n': '&#xA;', '\r': '&#xD;' }[c]));
}

/**
 * Encode le contenu texte d'un élément comme EMF.
 * @param {string} s texte décodé
 * @returns {string} texte prêt à écrire
 */
function xtEncodeTexte(s) {
  return String(s).replace(/[&<"\r]/g, c => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\r': '&#xD;' }[c]));
}

/**
 * Lit un texte XML et construit l'arbre des éléments avec leurs positions.
 * Chaque nœud : { tag, attrs:[{n, v, brut, q (délimiteur s'il n'est pas « " »)}], enfants:[], parent, texte (décodé, null si aucun),
 *   s (début de « < »), fo (fin de la balise ouvrante), e (fin de l'élément), autoFerme,
 *   prof (profondeur), et des drapeaux de modification (balise, structure, desc).
 * Le prologue (déclaration, commentaires) et ce qui suit la racine sont conservés tels quels.
 * @param {string} src texte complet du fichier
 * @returns {{src:string, racine:object, nl:string, parId:Map, modifie:boolean}} document
 */
function xtLire(src) {
  const n = src.length;
  let i = 0, racine = null;
  const pile = [];
  /** Avance jusqu'à la sous-chaîne `fin`, renvoie la position après elle. */
  const jusqua = (fin, depuis, quoi) => { const k = src.indexOf(fin, depuis); if (k < 0) throw xtErreur(src, depuis, quoi + ' non terminé'); return k + fin.length; };
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    const courant = pile[pile.length - 1];
    // Texte entre deux balises : conservé pour les éléments feuilles (<bodies>texte</bodies>)
    if (courant && lt > i) {
      const t = src.slice(i, lt);
      if (/\S/.test(t)) {
        if (courant.enfants.length) courant.mixte = true;
        courant.texteBrut = (courant.texteBrut || '') + t;
      }
    }
    const c = src[lt + 1];
    if (c === '?') { i = jusqua('?>', lt, 'Instruction de traitement'); continue; }
    if (c === '!') {
      if (src.startsWith('<!--', lt)) { if (courant) courant.commentaire = true; i = jusqua('-->', lt + 4, 'Commentaire'); continue; }
      if (src.startsWith('<![CDATA[', lt)) { if (courant) courant.cdata = true; i = jusqua(']]>', lt, 'Section CDATA'); continue; }
      i = jusqua('>', lt, 'Déclaration'); continue;
    }
    if (c === '/') {                                   // balise fermante
      const fin = src.indexOf('>', lt);
      if (fin < 0) throw xtErreur(src, lt, 'balise fermante non terminée');
      const tag = src.slice(lt + 2, fin).trim();
      const el = pile.pop();
      if (!el || el.tag !== tag) throw xtErreur(src, lt, `fermeture </${tag}> inattendue` + (el ? ` (attendu </${el.tag}>)` : ''));
      el.fc = lt;                                     // début de la balise fermante
      el.e = fin + 1;
      // Élément sans enfant écrit <a>…</a> : son texte (éventuellement vide) est une valeur, distincte de <a/>
      if (!el.enfants.length) { if (!el.commentaire && !el.cdata) el.texte = xtDecode(src.slice(el.fo, lt)); }
      else if (el.texteBrut != null) el.mixte = true;
      i = fin + 1;
      continue;
    }
    // Balise ouvrante
    let k = lt + 1;
    while (k < n && !/[\s/>]/.test(src[k])) k++;
    const tag = src.slice(lt + 1, k);
    if (!tag) throw xtErreur(src, lt, 'nom de balise vide');
    const attrs = [];
    for (;;) {
      while (k < n && /\s/.test(src[k])) k++;
      if (k >= n) throw xtErreur(src, lt, `balise <${tag}> non terminée`);
      if (src[k] === '>' || (src[k] === '/' && src[k + 1] === '>')) break;
      const eq = src.indexOf('=', k);
      if (eq < 0) throw xtErreur(src, k, 'attribut sans valeur');
      const nom = src.slice(k, eq).trim();
      let q = eq + 1;
      while (/\s/.test(src[q])) q++;
      const guil = src[q];
      if (guil !== '"' && guil !== "'") throw xtErreur(src, q, `valeur de l'attribut ${nom} sans guillemets`);
      const fq = src.indexOf(guil, q + 1);
      if (fq < 0) throw xtErreur(src, q, `valeur de l'attribut ${nom} non terminée`);
      const brut = src.slice(q + 1, fq);
      attrs.push(guil === '"' ? { n: nom, v: xtDecode(brut), brut } : { n: nom, v: xtDecode(brut), brut, q: guil });
      k = fq + 1;
    }
    const autoFerme = src[k] === '/';
    const fo = autoFerme ? k + 2 : k + 1;
    const el = { tag, attrs, enfants: [], parent: courant || null, texte: null, s: lt, fo, e: autoFerme ? fo : -1, autoFerme,
      prof: pile.length, balise: false, structure: false, desc: false };
    if (courant) courant.enfants.push(el);
    else if (racine) throw xtErreur(src, lt, 'plusieurs éléments racines');
    else racine = el;
    if (!autoFerme) pile.push(el);
    i = fo;
  }
  if (pile.length) throw xtErreur(src, n, `élément <${pile[pile.length - 1].tag}> non fermé`);
  if (!racine) throw xtErreur(src, 0, 'aucun élément racine');
  const doc = { src, racine, nl: src.indexOf('\r\n') >= 0 ? '\r\n' : '\n', parId: new Map(), modifie: false };
  xtIndexer(doc);
  return doc;
}

/**
 * Identifiant d'un nœud : attribut « id » des fichiers Capella récents, ou « xmi:id » des anciens ; « xmi:id » seul si le
 * document le demande (doc.xmiSeul : en XMI, « id » est une propriété comme une autre, l'identifiant d'une exigence SysML).
 * @param {object} doc document
 * @param {object} el nœud
 * @returns {string|undefined}
 */
function xtIdNoeud(doc, el) { return doc.xmiSeul ? xtAttr(el, 'xmi:id') : xtAttr(el, 'id') ?? xtAttr(el, 'xmi:id'); }

/**
 * (Re)construit l'index id → nœud du document (xtIdNoeud).
 * @param {object} doc document lu par xtLire
 */
function xtIndexer(doc) {
  doc.parId.clear();
  const pile = [doc.racine];
  while (pile.length) {
    const el = pile.pop();
    const id = xtIdNoeud(doc, el);
    if (id != null) doc.parId.set(id, el);
    for (let j = el.enfants.length - 1; j >= 0; j--) pile.push(el.enfants[j]);
  }
}

/**
 * Valeur décodée d'un attribut, ou undefined s'il est absent.
 * @param {object} el nœud
 * @param {string} nom nom de l'attribut (avec préfixe éventuel : « xsi:type »)
 * @returns {string|undefined}
 */
function xtAttr(el, nom) {
  for (const a of el.attrs) if (a.n === nom) return a.v;
  return undefined;
}

/**
 * Parcourt tous les éléments en profondeur (ordre du document).
 * @param {object} el nœud de départ
 * @param {function(object):void} fn appelée pour chaque élément
 */
function xtParcourir(el, fn) {
  const pile = [el];
  while (pile.length) {
    const x = pile.pop();
    fn(x);
    for (let j = x.enfants.length - 1; j >= 0; j--) pile.push(x.enfants[j]);
  }
}

/* ─────────────────────────────── Écriture ─────────────────────────────── */

/**
 * Sérialise le document : recopie verbatim des parties intactes, réécriture EMF des parties modifiées.
 * @param {object} doc document
 * @returns {string} nouveau texte du fichier
 */
function xtEcrire(doc) {
  const r = doc.racine;
  if (!r.balise && !r.structure && !r.desc) return doc.src;
  return doc.src.slice(0, r.s) + xtEcrireElement(doc, r) + doc.src.slice(r.e);
}

/**
 * Indentation d'un élément selon sa profondeur : celle du document si elle est fixée (doc.indent : une tabulation pour
 * les fichiers de Cameo), sinon celle d'EMF. doc.decalageProf : écart entre la profondeur des nœuds et leur profondeur
 * dans le texte (document dont les nœuds sont greffés plus bas dans l'arbre d'un autre : partie partagée d'un projet Cameo).
 * @param {number} prof profondeur (0 = racine)
 * @param {object} [doc] document
 * @returns {string}
 */
function xtIndentDe(prof, doc) { return ((doc && doc.indent) || XT_INDENT).repeat(Math.max(0, prof - ((doc && doc.decalageProf) || 0))); }

/**
 * Écrit la balise ouvrante d'un élément au format EMF (sans « > » ni « /> »).
 * Règle EMF : un attribut est précédé d'un saut de ligne + indentation de continuation
 * lorsque la ligne courante dépasse déjà la largeur ; sinon d'une espace. Largeur : doc.largeur
 * si elle est fixée (Infinity pour le .aird, que Sirius écrit sans retour à la ligne), sinon XT_LARGEUR.
 * Délimiteur des valeurs : doc.guillemet s'il est fixé (apostrophe des fichiers de Cameo), sinon « " » ; « > » encodé si
 * doc.chevron est vrai.
 * @param {object} doc document (pour le séparateur de lignes)
 * @param {object} el nœud
 * @returns {string}
 */
function xtBaliseOuvrante(doc, el) {
  const ind = xtIndentDe(el.prof, doc), cont = ind + XT_CONTINUATION, max = doc.largeur ?? XT_LARGEUR, q = doc.guillemet || '"';
  let out = '<' + el.tag;
  let largeur = ind.length + out.length;            // largeur de la ligne courante, indentation comprise
  for (const a of el.attrs) {
    // Valeur intacte : recopiée avec son délimiteur d'origine (a.q, noté à la lecture s'il n'est pas « " »)
    const txt = a.brut != null ? a.n + '=' + (a.q || '"') + a.brut + (a.q || '"') : a.n + '=' + q + xtEncodeAttr(a.v, q, doc.chevron) + q;
    if (largeur > max) { out += doc.nl + cont; largeur = cont.length; }
    else { out += ' '; largeur += 1; }
    out += txt;
    const dernierNl = txt.lastIndexOf('\n');
    largeur = dernierNl >= 0 ? txt.length - dernierNl - 1 : largeur + txt.length;
  }
  return out;
}

/**
 * Écrit un élément : verbatim s'il est intact, sinon réécrit (en réutilisant le texte
 * source de tout ce qui n'a pas changé : enfants intacts, espacements, balise ouvrante).
 * Nœud greffé depuis un autre document (partie partagée d'un projet Cameo) : présenté dans l'arbre de son hôte (parent),
 * il n'est écrit que par son propre document, sous son « foyer » (son parent dans ce document).
 * @param {object} doc document
 * @param {object} el nœud
 * @returns {string}
 */
function xtEcrireElement(doc, el) {
  if (el.enfants.some(c => (c.foyer || c.parent) !== el)) el = { ...el, enfants: el.enfants.filter(c => (c.foyer || c.parent) === el) };
  const src = doc.src;
  const neuf = el.s == null;                         // créé par l'outil : pas de texte source
  if (!neuf && !el.balise && !el.structure && !el.desc) return src.slice(el.s, el.e);
  // Contenu XML fourni tel quel par l'outil (valeur XHTML d'un fichier ReqIF), écrit entre les balises
  if (neuf && el.brutInterieur != null) return xtBaliseOuvrante(doc, el) + '>' + el.brutInterieur + '</' + el.tag + '>';
  // Commentaire entre des enfants : gardé (écarts d'origine recopiés) ; dans un texte réécrit, il serait perdu
  if (el.mixte || el.cdata || (el.commentaire && el.texteModifie)) {
    if (el.balise || el.structure) throw new Error(`Réécriture impossible de <${el.tag}> (contenu mixte, CDATA ou commentaire) : modification refusée`);
  }
  const ind = xtIndentDe(el.prof, doc);
  const vide = !el.enfants.length && el.texte == null;
  // Tous les enfants retirés d'un élément à commentaires : les commentaires écrits après le dernier enfant restent
  if (vide && !neuf && el.commentaire && el.fc != null) return (el.balise ? xtBaliseOuvrante(doc, el) + '>' : src.slice(el.s, el.fo)) + src.slice(xtDebutEcart(src, el.fc), el.e);
  // Balise ouvrante
  let ouv;
  const reecrireBalise = neuf || el.balise || (el.structure && (vide !== el.autoFerme));
  // Élément vide : « <x/> », ou « <x></x> » si le document l'écrit ainsi (doc.videOuvert : contenus des diagrammes de Cameo)
  const ferme = vide && !doc.videOuvert;
  if (reecrireBalise && !(vide && doc.videOuvert && !neuf && !el.balise && !el.autoFerme)) ouv = xtBaliseOuvrante(doc, el) + (ferme ? '/>' : '>');
  else ouv = src.slice(el.s, el.fo);
  if (ferme) return ouv;
  if (vide) return !reecrireBalise && el.autoFerme ? ouv : ouv + '</' + el.tag + '>';   // « <x/> » d'origine intact : gardé
  // Élément feuille avec texte
  if (!el.enfants.length) {
    if (!neuf && !el.balise && !el.structure && !el.texteModifie) return src.slice(el.s, el.e);
    return ouv + xtEncodeTexte(el.texte) + '</' + el.tag + '>';
  }
  // Enfants
  let out = ouv;
  const struct = neuf || el.structure;
  // Élément aux commentaires entre ses enfants, dont la liste des enfants a changé : chaque enfant d'origine (resté à sa
  // place) garde l'écart qui le précédait dans le texte (blancs et commentaires)
  const ecarts = struct && !neuf && el.commentaire && el.fc != null;
  const dOrigine = c => c.s != null && c.s > el.fo && c.e <= el.fc && c.prof === el.prof + 1;
  let prec = null;
  for (const c of el.enfants) {
    if (ecarts && dOrigine(c)) out += src.slice(xtDebutEcart(src, c.s), c.s);
    else if (struct || c.s == null || (prec && prec.s == null)) out += doc.nl + xtIndentDe(c.prof, doc);
    else out += src.slice(prec ? prec.e : el.fo, c.s);    // espacement d'origine entre balises
    out += xtEcrireElement(doc, c);
    prec = c;
  }
  if (ecarts) out += src.slice(xtDebutEcart(src, el.fc), el.e);
  else if (struct || prec.s == null || !el.fc) out += doc.nl + ind + '</' + el.tag + '>';
  else out += src.slice(prec.e, el.e);
  return out;
}

/**
 * Début de l'écart qui précède une position du texte source : blancs et commentaires écrits juste avant une balise.
 * @param {string} src texte source
 * @param {number} pos position (début d'une balise)
 * @returns {number} début de l'écart
 */
function xtDebutEcart(src, pos) {
  let i = pos;
  for (;;) {
    while (i > 0 && /\s/.test(src[i - 1])) i--;
    if (i < 3 || src.slice(i - 3, i) !== '-->') return i;
    const d = src.lastIndexOf('<!--', i - 3);
    if (d < 0) return i;
    i = d;
  }
}

/* ─────────────────────────────── Modifications ─────────────────────────────── */

/**
 * Marque les ancêtres d'un nœud comme « descendant modifié » (ils ne sont plus recopiables tels quels).
 * @param {object} doc document
 * @param {object} el nœud modifié
 */
function xtMarquerAncetres(doc, el) {
  doc.modifie = true;
  for (let p = el.parent; p && !p.desc; p = p.parent) p.desc = true;
}

/**
 * Modifie, ajoute ou supprime (valeur null) un attribut. Un nouvel attribut est ajouté en fin de liste,
 * ou, si l'ordre des attributs du type est donné (ordre EMF des propriétés), à sa place dans cet ordre.
 * @param {object} doc document
 * @param {object} el nœud
 * @param {string} nom nom de l'attribut
 * @param {string|null} valeur nouvelle valeur décodée, ou null pour supprimer
 * @param {string[]} [ordre] noms des attributs dans l'ordre d'écriture d'EMF
 * @returns {string|undefined} ancienne valeur (pour l'annulation)
 */
function xtDefinirAttr(doc, el, nom, valeur, ordre) {
  const k = el.attrs.findIndex(a => a.n === nom);
  const ancienne = k >= 0 ? el.attrs[k].v : undefined;
  if (valeur == null) { if (k < 0) return ancienne; el.attrs.splice(k, 1); }
  else if (k >= 0) { if (el.attrs[k].v === valeur) return ancienne; el.attrs[k] = { n: nom, v: valeur, brut: null }; }
  else {
    const rang = ordre ? ordre.indexOf(nom) : -1;
    const apres = rang < 0 ? -1 : el.attrs.findIndex(a => ordre.indexOf(a.n) > rang);
    el.attrs.splice(apres < 0 ? el.attrs.length : apres, 0, { n: nom, v: valeur, brut: null });
  }
  el.balise = true;
  xtMarquerAncetres(doc, el);
  if ((nom === 'id' && !doc.xmiSeul) || nom === 'xmi:id') { if (ancienne != null) doc.parId.delete(ancienne); if (valeur != null) doc.parId.set(valeur, el); }
  return ancienne;
}

/**
 * Remplace le texte d'un élément feuille (ex. <bodies>…</bodies>).
 * @param {object} doc document
 * @param {object} el nœud sans enfants
 * @param {string|null} texte nouveau texte, null pour vider
 * @returns {string|null} ancien texte
 */
function xtDefinirTexte(doc, el, texte) {
  if (el.enfants.length) throw new Error(`<${el.tag}> a des éléments enfants : texte non modifiable`);
  const ancien = el.texte;
  el.texte = texte;
  el.texteModifie = true;
  el.structure = true;
  xtMarquerAncetres(doc, el);
  return ancien;
}

/**
 * Fixe la profondeur d'un sous-arbre (après création ou déplacement). Si la profondeur change,
 * tout le sous-arbre doit être réécrit (l'indentation d'origine ne convient plus).
 * @param {object} el racine du sous-arbre
 * @param {number} prof nouvelle profondeur
 */
function xtFixerProfondeur(el, prof) {
  if (el.prof === prof && el.s != null) return;
  xtParcourir(el, x => {
    const p = x.parent && x !== el ? x.parent.prof + 1 : prof;
    if (x.prof !== p) { x.prof = p; x.balise = true; x.structure = true; x.desc = true; }
  });
}

/**
 * Crée un élément détaché (sans parent) : il sera placé par xtInserer, qui fixe sa profondeur.
 * Sert aux opérations de création du journal, qui insèrent, retirent et réinsèrent le même nœud.
 * @param {string} tag nom de la balise (nom de la feature EMF, ex. « ownedFunctions »)
 * @param {Array<[string,string]>} attrs attributs dans l'ordre d'écriture, ex. [['xsi:type','…'],['id','…'],['name','…']]
 * @returns {object} le nouveau nœud
 */
function xtNouveau(tag, attrs) {
  return { tag, attrs: attrs.map(([n, v]) => ({ n, v, brut: null })), enfants: [], parent: null, texte: null,
    s: null, fo: null, e: null, autoFerme: true, prof: -1, balise: true, structure: true, desc: true };
}

/**
 * Ajoute à l'index les identifiants d'un sous-arbre (après création ou réinsertion).
 * @param {object} doc document
 * @param {object} el racine du sous-arbre
 */
function xtIndexerSousArbre(doc, el) {
  xtParcourir(el, x => { const id = xtIdNoeud(doc, x); if (id != null) doc.parId.set(id, x); });
}

/**
 * Crée un élément et l'insère dans un parent.
 * @param {object} doc document
 * @param {object} parent nœud parent
 * @param {string} tag nom de la balise (nom de la feature EMF, ex. « ownedFunctions »)
 * @param {Array<[string,string]>} attrs attributs dans l'ordre d'écriture, ex. [['xsi:type','…'],['id','…'],['name','…']]
 * @param {number} [index] position parmi les enfants (fin par défaut)
 * @returns {object} le nouveau nœud
 */
function xtCreer(doc, parent, tag, attrs, index) {
  const el = xtNouveau(tag, attrs);
  xtInserer(doc, parent, el, index);
  xtIndexerSousArbre(doc, el);
  return el;
}

/**
 * Insère un nœud (nouveau ou détaché) dans un parent.
 * @param {object} doc document
 * @param {object} parent nœud parent
 * @param {object} el nœud à insérer
 * @param {number} [index] position (fin par défaut)
 */
function xtInserer(doc, parent, el, index) {
  if (parent.texte != null) throw new Error(`<${parent.tag}> contient du texte : impossible d'y ajouter un élément`);
  const i = index == null ? parent.enfants.length : Math.max(0, Math.min(index, parent.enfants.length));
  parent.enfants.splice(i, 0, el);
  el.parent = parent;
  xtFixerProfondeur(el, parent.prof + 1);
  parent.structure = true;
  xtMarquerAncetres(doc, el);
}

/**
 * Détache un nœud de son parent (suppression, ou première étape d'un déplacement).
 * Les références vers ce nœud ne sont PAS nettoyées ici : c'est le rôle des opérations de plus haut niveau.
 * @param {object} doc document
 * @param {object} el nœud à détacher
 * @returns {{parent:object, index:number}} position d'origine (pour l'annulation)
 */
function xtDetacher(doc, el) {
  const parent = el.parent;
  if (!parent) throw new Error('La racine du modèle ne peut pas être supprimée');
  const index = parent.enfants.indexOf(el);
  parent.enfants.splice(index, 1);
  parent.structure = true;
  xtMarquerAncetres(doc, el);
  el.parent = null;
  return { parent, index };
}

/**
 * Supprime un nœud et retire ses identifiants de l'index.
 * @param {object} doc document
 * @param {object} el nœud
 * @returns {{parent:object, index:number}} position d'origine
 */
function xtSupprimer(doc, el) {
  const pos = xtDetacher(doc, el);
  xtParcourir(el, x => { const id = xtIdNoeud(doc, x); if (id != null && doc.parId.get(id) === x) doc.parId.delete(id); });
  return pos;
}

/**
 * Déplace un nœud vers un autre parent (ou une autre position).
 * @param {object} doc document
 * @param {object} el nœud
 * @param {object} parent nouveau parent
 * @param {number} [index] position (fin par défaut)
 * @returns {{parent:object, index:number}} position d'origine
 */
function xtDeplacer(doc, el, parent, index) {
  for (let p = parent; p; p = p.parent) if (p === el) throw new Error('Un élément ne peut pas être déplacé dans sa propre descendance');
  const pos = xtDetacher(doc, el);
  xtInserer(doc, parent, el, index);
  return pos;
}

/**
 * Nouvel identifiant Capella (UUID v4, minuscules), garanti absent du document : ni présent dans
 * l'index, ni déjà distribué (nœuds préparés pas encore insérés, ou retirés par une annulation).
 * Le contrôle est une recherche dans l'index et ne ralentit pas la création.
 * @param {object} [doc] document dont on évite les identifiants
 * @returns {string}
 */
function xtNouvelId(doc) {
  for (;;) {
    const id = xtTirerUuid();
    if (!doc) return id;
    if (!doc.idsDonnes) doc.idsDonnes = new Set();
    if (doc.parId.has(id) || doc.idsDonnes.has(id)) continue;
    doc.idsDonnes.add(id);
    return id;
  }
}

/**
 * Tire un UUID v4 au hasard (crypto si disponible, sinon Math.random).
 * @returns {string}
 */
function xtTirerUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
}

/**
 * Marque tout le document comme modifié pour forcer sa réécriture complète au format EMF
 * (test de fidélité du sérialiseur : le résultat doit être identique au fichier d'origine).
 * @param {object} doc document
 */
function xtToutReecrire(doc) {
  xtParcourir(doc.racine, x => {
    x.balise = true; x.structure = true; x.desc = true;
    for (const a of x.attrs) a.brut = null;
    if (x.texte != null) x.texteModifie = true;
  });
  doc.modifie = true;
}

/* ── src/js/28-formats.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   28. FORMATS — couche entre l'interface et le format du modèle
   L'interface (arborescence, détail, recherche, création, journal, enregistrement) ne connaît
   que l'adaptateur du format ouvert (ARC.fmt). Chaque format fournit le même contrat :
   lire, présenter, modifier, écrire. Chaque format inclus s'inscrit dans FORMATS depuis son propre
   module (Capella : 29-format-capella.js ; SysML v2 : sysml/30-format.js ; UML : uml/50-format.js ; SysML v1 : sysml1/30-format.js ; ReqIF : reqif/30-format.js) : une version d'un seul
   format (node build.js --formats capella | sysml | uml | sysml1 | reqif) n'embarque que ses modules. Sans DOM : chargé aussi par les tests Node.

   Contrat d'un adaptateur
   ─ Document (lire) : { racine, parId: Map(id → nœud), … propre au format }.
   ─ Nœud : { parent, enfants:[], prof, attrs:[{n, v}], tag } — même forme pour tous les formats.
   ─ Fichier : cle, nom, fichiers { description, mime, extensions, dossier (extensions cherchées dans un dossier
     de projet), parDefaut }, reconnait(nom, texte),
     lire(texte, nom), ecrire(doc), controler(doc, texte) → message d'erreur ou null ; binaire(nom) facultatif : vrai si
     le fichier se lit et s'écrit en octets (lire reçoit un Uint8Array, ecrire en rend un, le même objet que doc.src s'il
     n'a pas changé — SysML v2 : archive .kpar) ; lireDossier(fichiers [{chemin, texte}], nom) facultatif : projet rangé en
     dossier, ses fichiers lus ensemble (SysML v2 : .sysml) ; ecrire rend alors [{chemin, texte}] et controler les reçoit.
     avertirEcriture(doc) facultatif → message ou null : avertissement montré après l'enregistrement, sans le bloquer
     (SysML v2 : erreurs du texte nouvelles depuis l'ouverture). apresEnregistrement(doc) facultatif : le texte écrit devient
     la référence du format (le document n'est pas relu après l'enregistrement : le journal de la session garde ses
     opérations ; SysML v2 : diagnostics d'origine).
   ─ Couches du filtre : couches [[valeur, libellé]], titreCouches.
   ─ Lecture métier : id, type, libelle, couche, chemin, ossature, technique, icone (initiales),
     iconeSvg(el, doc, taille) (icône dessinée, ou ''), iconeType(regle, taille) facultatif (icône du type qu'une règle de
     création produit : sous-menu « Nouveau ▸ »), attr, parcourir, infos(doc) ; jeux d'icônes facultatifs : jeuxIcones() →
     [{id, libelle}], jeuIcones() → id du jeu en cours, choisirJeuIcones(id) → booléen (UML et SysML v1 : jeu d'Arcature par
     défaut, icônes d'Eclipse UML2 redessinées par Papyrus Web en remplacement).
   ─ Relations : liaisons(doc), groupes(index, el), estReference(nom, valeur) ; titreCategorie(g) facultatif : intitulé d'un
     groupe de liaisons dans le navigateur sémantique (Capella : requêtes du Semantic Browser ; sinon g.libelle).
   ─ Édition (opérations du journal) : champs (noms des champs du formulaire), modifiable(el, champ), definirAttr(doc, el, n, v, ordre?), inserer, supprimer, indexerSousArbre, indexInsertion,
     liesAuxChangements(el, changements) (renommage en cascade…), liesALaCreation(etapes) (changements d'éléments existants entraînés par des insertions).
   ─ Attributs simples : attributsSimples(doc, el) → champs { n, libelle, genre (texte, entier, reel, booleen, choix),
     valeur, options, modifiable, raison } ; valeurAttribut(el, n, saisie) → valeur écrite, ou null (attribut retiré).
   ─ Liens tracés sans diagramme : liensDepuis(doc, el) → [{cle, libelle}], ciblesLien(doc, el, cle) → cibles,
     preparerLien(doc, el, cle, cible) → { conteneur, etapes, crees } (opération « creation »), ou { op } (opération propre au
     format : SysML v2, texte du lien écrit).
   ─ Champs de relations (vue des propriétés) : relations(doc, el) → [{cle, libelle, valeurs, modifiable, raison, verrous}],
     candidatsRelation(doc, el, cle) → éléments, preparerRelation(doc, el, cle, ajouts, retraits) → { libelle, etapes
     (liens à insérer sous l'élément), retraits [{noeud, parent, index}], changements (facultatifs : attributs changés,
     [{id, n, avant, apres, ordre}]) } (opérations « creation », « suppression » et « attributs ») ; max: 1 dans un champ :
     une seule valeur (choix unique).
   ─ Déplacement : raisonDeplacement(doc, el, cible) → raison du refus ou null, preparerDeplacement(doc, el, cible)
     → [{noeud, parent, tag}] (opération « deplacement ») ; opDeplacer(doc, el, cible) facultatif : le format fournit
     l'opération elle-même (SysML v2 : texte déplacé et relu ; op.id, nouvel identifiant de l'élément).
   ─ Place parmi les frères (facultative) : indexPres(doc, parent, tag, voisin, avant) → index où insérer sous parent un
     nœud de balise tag juste avant (avant vrai) ou juste après le frère voisin, ou null si le format ne permet pas d'y
     choisir sa place (le nœud va alors à sa place par défaut : indexInsertion). Une étape de création ou de déplacement
     qui porte place { voisin, avant } y est insérée (calculée à l'application, après les retraits) : frère créé juste après
     l'élément choisi (Entrée dans l'arborescence), élément remonté juste après son ancien parent (Maj+Tab), ordre changé
     parmi les frères (Alt+↑ / Alt+↓, absent sans indexPres). Capella, UML, SysML v1 : frère de même balise seulement
     (fmtIndexPresMemeBalise : ordre des features d'EMF gardé) ; ReqIF : places d'une spécification. Un format qui réécrit
     son texte (SysML v2) fournit opReordonner(doc, el, voisin, avant) → son opération (membre écrit avant ou après son
     frère), et reçoit la place d'un frère créé : opCreer(doc, parent, elements, { voisin, avant }).
   ─ Règle d'un élément (facultative) : regleDe(doc, el, regles) → règle de création (parmi regles, celles de son parent)
     qui créerait un élément du même type, pour un frère créé à la suite (Entrée) ; sans elle, la règle de même balise
     dont le type et les attributs ressemblent le plus à ceux de l'élément (edRegleSoeur, 40-edition.js).
   ─ Suppression : preparerSuppression(doc, selection) → { elements (supprimés, contenus compris), racines (sous-arbres
     retirés), changements (références retirées des éléments restants), blocages (raisons de refus), details (lignes
     d'aperçu), opsFormat (opérations du journal propres au format, ED_TYPES), avertissement }.
   ─ Transitions entre niveaux : transitions(doc, el) → [{cle, libelle}], preparerTransition(doc, el, cle) → { etapes
     (nœuds à insérer), crees, liens (attributs d'éléments existants mis à jour), resume, libelle } (opération « creation »).
   ─ capacites { modifier, creer, diagnostic, relecture } — relecture : le document est relu après chaque
     modification (nœuds recréés, identifiants gardés) et l'interface reconstruit ses index.
   ─ diagrammesSysml (facultatif, booléen) — les diagrammes du format sont SysML : icône des genres repris d'UML marquée
     SysML (couche UML commune : uicDiagrammeSysml).
   ─ Création : capacites, regles(doc, el), menu(doc, el), noeuds(regle, nom, parent) → { noeud, part, annexes (nœuds
     insérés ailleurs : [{noeud, parent, tag}]) }, balisePart(parent),
     nomDefaut(parent, regle), nouveau(tag, attrs), decouperListe(texte) ; opCreer(doc, parent, elements) facultatif : le format
     fournit l'opération de création elle-même (SysML v2 : texte réécrit, opération propre au format ; op.crees rempli à
     l'exécution) au lieu de nœuds à insérer. preparerSuppression et preparerRelation peuvent rendre leurs changements en
     opérations propres au format (opsFormat).
   ─ Diagrammes (facultatif, null si le format n'en a pas) : diagrammes { extensions, reconnait(nom),
     associer(modele, entrees), charger(f, poignee), enregistrer(), enAttente(), messageAbsent(nom), messageSeul(),
     apresModification(op), apresCreation(op), redessiner(), apresValidation(), marquerProblemes() (facultatif : élément choisi ou
     affichage des problèmes changé, marques du diagramme affiché seulement), apresChoix(el), rubrique(el), ouvrir(uid, semId, opts?) (opts.nouvelOnglet : diagramme déjà ouvert redemandé dans un nouvel onglet),
     arborescence() facultatif → [{ cle (passée à ouvrir), nom, type (libellé du type), icone (HTML), cible (identifiant de
     l'élément sous lequel l'explorateur de projet le range : Capella, cible de la représentation ; Papyrus, Cameo, propriétaire) }],
     reinitialiser(), types(el), creer(el, choix), coller(analyse) facultatif (Ctrl+V dans le diagramme affiché : analyse du
     presse-papier par colAnalyser, 38-collage.js ; menu des outils de la palette permis au point du collage, éléments et vues
     créés en une opération ; rend true, ou la raison d'un refus) } — Capella : le .aird (29-format-capella.js) ; UML : le .notation de Papyrus
     (créé au besoin par creer) et des vues calculées (uml/50-format.js) ; SysML v2 : vues calculées depuis le texte, sans fichier
     de diagrammes ni création (sysml/60-vues.js : extensions vide, reconnait faux, enregistrer sans objet). Une opération du journal propre aux diagrammes porte diagrammeSeul (gardée au
     journal si le fichier des diagrammes n'a pas pu être écrit).
   ─ Règles de création : { cle, libelle, tag, type, attrs, secondaire? } ; une règle secondaire n'est pas dans le menu
     contextuel mais dans « Autre élément… » (UML : métaclasses moins usuelles admises par le métamodèle).
   ─ Stéréotypes (facultatifs) : stereotypes { definitions(doc) → [{id, cle, domaine, nom, classes, niveaux, proprietes [{id, nom,
     genre, litteraux, defaut (valeur affichée)}], modifiable, raison}], applicables(doc, el), appliques(doc, el) → [{groupe, def, …}],
     valeurs(doc, el, a) → champs [{cle, libelle, genre, valeur, options, modifiable, raison}], preparerValeur(doc, el, a, cle, saisie)
     → { noeud, valeurs } (opération « attributs ») ou { op }, preparerRetrait(doc, el, a) → { elements } (suppression) ou { op },
     preparerApplication(doc, el, def) et preparerDefinition(doc, spec) → { etapes, crees, liens? } (opération « creation ») ou
     { op, cle }, preparerModification(doc, def, spec) → { changements, etapes, retraits, crees } ou { op, cle },
     selectionSuppression(doc, def) (suppression) ou preparerSuppression(doc, def) → { op }, nbApplications(doc, def), types(doc),
     typeDe(el) (facultatif : type proposé, sinon ARC.fmt.type), couches, couchesDe(def), textes { domaine, liste, definition, tous },
     concepts (facultatif) : [[concept, [types]]] — correspondance des types du format avec des concepts neutres (composant,
     partie, fonction…), le premier type d'un concept étant le préféré : un profil exporté d'un format s'importe dans un autre
     (43-domaines.js : domImporterProfil) }
     — { op } : opération propre au format, toute prête (ED_TYPES) ; null : rien ne change. Capella : PVMT (48-stereotypes.js) ;
     SysML v2 : définitions de métadonnées (sysml/40-stereotypes.js) ; UML et SysML v1 : profils UML du XMI (uml/45-stereotypes.js,
     xsAdaptateur).
     Types de domaine (P2, P3, docs/STEREOTYPAGE.md) : domaines(doc) → Map(id du stéréotype → { nom, couleur, cacher, menu,
     contenus, cibles, obligatoires, numerotation, derivees, groupes, liens, extremites } : fmtDomaineNettoye ; règles, numérotation et
     initialisation appliquées par 43-domaines.js),
     porteurs(doc, def) → éléments qui portent le stéréotype, preparerDomaine(doc, def, perso | null) → { noeud, changements }
     (opération « attributs »), { parent, etapes, crees } (« creation »), { retrait } (« suppression ») ou { op } ; null : rien ne
     change. Rangés dans le mécanisme natif du format : paire clé / valeur du projet (Capella), <xmi:Extension extender="Arcature">
     du stéréotype (UML, SysML v1), annotation @Arcature::TypeDeDomaine de la définition (SysML v2).
   ─ Types de vues (facultatifs) : vues { tous(doc), utilisateur(doc), pour(doc, el), preparerTypes(doc, types) → changements
     (opération « attributs » ou « creation »), ouvrir(el, type), tracer(el, lien) (lien tracé dans la vue affichée), typesElements(doc), relations(), regles(), dispositions() }
     — Capella : diagrammes calculés (49-vues.js), dessinés par la vue des diagrammes ; UML : pour et ouvrir seulement (vues
     calculées, sans types de l'utilisateur : la fenêtre « Types de vues… » demande preparerTypes).
   ─ Conversions (facultatives) : conversions [{ cle, libelle, extension, mime, description, doc (document des correspondances),
     options [{ cle, libelle, id? }] (cases de la fenêtre, passées à convertir), convertir(doc, options) → { texte, convertis,
     ignores (par type d'élément), avertissements, nbAvertissements, nbElements, remarques? } }] — Capella : vers SysML v2
     (47-conversion-sysml.js) et vers SysML 1.7 en XMI de l'OMG (47-conversion-sysml1.js) ; plusieurs : choisies par
     creChoisirConversion (56) ou la commande « Convertir le modèle… » (65).
   ─ Archives (facultatives) : archives { extensions, mime, lire(octets, nom) → Promise<document> (doc.archive : l'archive
     lue), ecrire(doc, texte) → Promise<Uint8Array> (archive réécrite avec le texte du modèle, les autres entrées recopiées),
     modifiee(doc) → vrai si une autre entrée que le modèle est à réécrire (diagrammes mis en page) }
     — SysML v1 : le .mdzip de Cameo (32-archives.js). Le document d'une archive garde doc.src : le texte du modèle.
     Un document importé d'un autre outil (SysML v1 : projet Enterprise Architect .qea) porte doc.importe { nom (nom du
     modèle à enregistrer, dans le format : .xmi), message (affiché à l'ouverture) } : le fichier lu n'est jamais réécrit.
   ─ Démarrage et outils (facultatifs) : initialiser() (interface propre au format, appelée une fois pour chaque format
     inclus), diagnostiquer() (si capacites.diagnostic) ; vuesPropres : clés des vues de la page (.vue[data-vue], écrites dans
     un bloc @@SI@@) que seul ce format remplit — l'interface les retire pour les autres formats (Capella : « methode »).
   ─ Validation (facultative, absente si le format n'en a pas) : validation { regles() → [{id, categorie, severite ('E' | 'W'),
     actif (par défaut), source ('capella' | 'uml' | 'arcature'…), nom, genre? ('lisibilite' : défauts de dessin d'un
     diagramme, en calque à part ; 'suivi' : justification d'une transition ; profils de 38-problemes.js)}], sources() → [{cle, titre, filtre, prereglage?}] (origines
     des règles : fenêtre des règles et filtre), presentation() (texte de la fenêtre), valider(doc, actives) → { problemes, ms }, preparer(ms) →
     travail restant (préparation par tranches, sans bloquer l'interface ; facultatif), corrections(pb) → [{libelle, action}],
     nomDiagramme(uid), ouvrirDiagramme(pb), diagrammesDe(pb) → [{uid, nom}] (facultatif : diagrammes où paraît le problème,
     regroupement « par diagramme ») } — Capella : 47-validation.js.
     Problème : { regle, severite, source, el (élément du modèle), elements (éléments concernés, marqués), message, donnees,
     rep (uid d'un diagramme : problème d'un diagramme), vues }. Action d'une correction, exécutée par l'interface commune
     (54-problemes.js) : { genre : 'attributs' {el, valeurs} | 'supprimer' {elements} | 'relation' {el, cle, ajouts, retraits}
     | 'champ' {el, cle} | 'choisir' {titre, candidats(), puis(choisi) → action} | 'transition' {el, cle} | 'renommer' {el}
     | 'montrer' {el} | 'format' {executer()} | 'operation' {executer() → opération exécutée du journal} }.
   ─ Simulation (facultative, plan : docs/SIMULATION.md) : simulation { simulables(doc) → [{el, libelle, genre, nb}] (éléments
     simulables du modèle : machines à états…), pour(doc, el) → [{cle, libelle, genre}] (simulations proposées sur un élément),
     preparer(doc, el, cle) → représentation neutre (32-simulation.js) ou { erreur }, diagrammes(ids, cible) → [{uid, nom, n}]
     (diagrammes où animer la simulation : ceux dont cible est l'élément représenté, puis les plus fournis), affiche() → uid du diagramme affiché, ouvrir(uid),
     animer(marques) (dessin du format : { actifs, franchies, visites, points } ensembles d'identifiants du modèle ;
     null : effacer), exigences(doc, ids) → [{id, identifiant, nom, texte, elements: [{id, nom, simules}]}] (facultatif : exigences
     liées aux éléments simulés, qui reçoivent leurs résultats) } — Capella : 42-simulation-capella.js, SysML v2 :
     sysml/40-simulation.js, UML : uml/80-simulation.js. La simulation lit le modèle et n'écrit jamais.
   ─ Nouveau projet (facultatif, N.1 ; fenêtre commune : 68-nouveau-projet.js) : projetVide { libelle (nom du langage dans la
     fenêtre), description (une phrase), nomDefaut (nom proposé), ordre (rang dans la liste des langages), options() → [{ cle, libelle, genre ('choix' | 'booleen' |
     'texte'), valeur (défaut), choix [[valeur, libellé]] (genre 'choix'), aide (bulle), si { cle: valeur } (option montrée
     seulement quand une autre a cette valeur) }], creer(nom, options) → { fichiers: [{ nom, texte }], principal (nom du fichier
     du modèle), diagrammes (nom du fichier des diagrammes parmi fichiers, facultatif), dossier (nom du dossier du projet) } }
     — gabarit écrit comme l'outil d'origine l'écrit pour un projet vide, identifiants neufs (Capella 7.0.1 : .capella, .aird,
     .afm, .project ; SysML v2 : .sysml ; UML et SysML v1 : .uml ou .xmi, .notation de Papyrus au choix ; ReqIF : .reqif).
     Le projet s'ouvre comme un fichier tout juste lu, sans accès direct (30-fichier.js : arcOuvrirNeuf) : le premier
     enregistrement écrit tous ses fichiers dans un dossier choisi, sinon les télécharge. diagrammes.neuf(poignee) facultatif :
     le fichier des diagrammes d'un projet neuf (poignée de son fichier créé dans le dossier, ou null) est écrit au prochain
     enregistrement, même sans modification.
   ─ API de scripts (facultative ; l'API, 39-api.js, n'emploie sinon que le contrat ci-dessus) : api { metamodele { version,
     existe(type), supertypes(type) → [type, parents…] ou null, types() → « paquetage:Type » } (métamodèle : objet metamodel des
     scripts), testType(type, exact) → test (nœud → booléen) ou null pour un type hors métamodèle (le type affiché est alors
     comparé), attributPermis(el, n) → booléen (champ texte name / summary / description que le type de l'élément porte),
     allocations [clés des champs de relations par lesquels allocateTo alloue], echanges [clés des liens que connect trace],
     variantes { suffixe de clé de règle : nom public } } — Capella : 29-format-capella.js ; UML et SysML v1 : métamodèle de
     l'OMG, stéréotypes de SysML et d'UAF (umlApiExtension).
   ═══════════════════════════════════════════════════════════════════════ */

/** Formats inclus dans cette version, dans l'ordre d'essai à l'ouverture d'un fichier (chaque format s'y ajoute). */
const FORMATS = [];

/**
 * Adaptateur du format d'un fichier, d'après son nom (et son contenu si besoin).
 * @param {string} nom nom du fichier
 * @param {string} [texte] contenu
 * @returns {object|null} adaptateur, ou null si aucun format ne le reconnaît
 */
function fmtPour(nom, texte) {
  return FORMATS.find(f => f.reconnait(nom, texte)) || null;
}

/**
 * Extensions acceptées par l'ouverture de fichier (tous formats).
 * @param {boolean} [avecDiagrammes] ajouter les fichiers de diagrammes (Capella : .aird)
 * @returns {string[]} extensions (« .capella »…)
 */
function fmtExtensions(avecDiagrammes) {
  return [...new Set(FORMATS.flatMap(f => [...f.fichiers.extensions, ...(f.archives ? f.archives.extensions : []), ...(avecDiagrammes && f.diagrammes ? f.diagrammes.extensions : [])]))];
}

/**
 * Format dont un fichier est une archive (SysML v1 : .mdzip de Cameo), d'après son nom.
 * @param {string} nom nom du fichier
 * @returns {object|null} adaptateur, ou null
 */
function fmtArchivePour(nom) {
  const n = (nom || '').toLowerCase();
  return FORMATS.find(f => f.archives && f.archives.extensions.some(e => n.endsWith(e))) || null;
}

/**
 * Types de fichiers proposés par la boîte de dialogue d'ouverture (showOpenFilePicker) : un par format,
 * fichiers de diagrammes compris.
 * @returns {Array<{description:string, accept:Object<string,string[]>}>}
 */
function fmtTypesFichiers() {
  return FORMATS.map(f => ({ description: f.fichiers.description,
    accept: { [f.fichiers.mime]: [...f.fichiers.extensions, ...(f.diagrammes ? f.diagrammes.extensions : [])], ...(f.archives ? { [f.archives.mime]: f.archives.extensions } : {}) } }));
}

/**
 * Format dont un fichier est le fichier de diagrammes (Capella : .aird) ; le format ouvert d'abord quand plusieurs le
 * reconnaissent (.notation de Papyrus : UML et SysML v1).
 * @param {string} nom nom du fichier
 * @param {object|null} [prefere] format ouvert
 * @returns {object|null} adaptateur, ou null
 */
function fmtDiagrammesPour(nom, prefere) {
  if (prefere && prefere.diagrammes && prefere.diagrammes.reconnait(nom)) return prefere;
  return FORMATS.find(f => f.diagrammes && f.diagrammes.reconnait(nom)) || null;
}

/**
 * Personnalisation d'un type de domaine, nettoyée (P2 : un stéréotype présenté comme un type d'élément) : nom affiché,
 * couleur « #rrggbb », type de base caché (« Calculateur » au lieu de « Class «Calculateur» »), proposé dans « Nouveau » ;
 * règles (P3) : types de domaine proposés comme contenus (contenus), seuls types de domaine permis au bout de ses relations
 * (cibles), propriétés du stéréotype obligatoires (obligatoires) ; numérotation automatique (P4) ; propriétés dérivées par chemins de relations (P5) ; groupes de propriétés du détail (P6) ; initialisation à
 * l'application (P6 : liens créés, stéréotypes des extrémités d'une relation). Commune aux formats, qui la rangent chacun à leur façon
 * (ARC.fmt.stereotypes.preparerDomaine). Clés toujours dans le même ordre : deux personnalisations se comparent par leur JSON.
 * @param {object|null} p personnalisation lue ou saisie
 * @returns {{nom:string, couleur:string, cacher:boolean, menu:boolean, contenus:string[], cibles:string[], obligatoires:string[],
 *   numerotation:({champ:string, motif:string, partage:string}|null), derivees:Array<{nom:string, chemin:string[], types:string[]}>,
 *   groupes:Array<{nom:string, proprietes:string[]}>, liens:Array<{lien:string, cible:string}>, extremites:{source:string, cible:string}}|null}
 *   null : pas de type de domaine (nom vide)
 */
function fmtDomaineNettoye(p) {
  if (!p || typeof p !== 'object') return null;
  const nom = String(p.nom || '').trim();
  if (!nom) return null;
  const couleur = /^#[0-9a-f]{6}$/i.test(String(p.couleur || '')) ? String(p.couleur).toLowerCase() : '';
  const liste = l => [...new Set((Array.isArray(l) ? l : []).map(x => String(x).trim()).filter(Boolean))];
  // Numérotation (P4) : champ (attribut du stéréotype, ou « :nom » : nom de l'élément), motif avec {n} ou {n:000}, compteur
  // partagé entre les types de même clé (vide : compteur du type seul)
  const n = p.numerotation && typeof p.numerotation === 'object' ? p.numerotation : null;
  const numerotation = n && String(n.champ || '').trim() && /\{n(:0+)?\}/.test(String(n.motif || ''))
    ? { champ: String(n.champ).trim(), motif: String(n.motif).trim(), partage: String(n.partage || '').trim() } : null;
  // Propriétés dérivées (P5) : nom, chemin d'étapes « relation|sens » (ou :contenus, :proprietaire), types de domaine d'arrivée
  const derivees = (Array.isArray(p.derivees) ? p.derivees : []).map(d => d && typeof d === 'object' ? { nom: String(d.nom || '').trim(), chemin: liste(d.chemin), types: liste(d.types) } : null)
    .filter(d => d && d.nom && d.chemin.length);
  // Groupes de propriétés (P6, Property Groups) : nom et propriétés du stéréotype, dans l'ordre où le détail les montre
  const groupes = (Array.isArray(p.groupes) ? p.groupes : []).map(g => g && typeof g === 'object' ? { nom: String(g.nom || '').trim(), proprietes: liste(g.proprietes) } : null)
    .filter(g => g && g.nom && g.proprietes.length);
  // Initialisation (P6, Initializing a Custom Model) : liens créés à l'application du stéréotype (genre de lien du format,
  // élément visé : « Super Types » de CATIA Magic), stéréotypes appliqués aux extrémités d'une relation (Apply to Source / Target)
  const liens = (Array.isArray(p.liens) ? p.liens : []).map(l => l && typeof l === 'object' ? { lien: String(l.lien || '').trim(), cible: String(l.cible || '').trim() } : null)
    .filter((l, i, t) => l && l.lien && l.cible && t.findIndex(m => m && m.lien === l.lien && m.cible === l.cible) === i);
  const x = p.extremites && typeof p.extremites === 'object' ? p.extremites : {};
  const extremites = { source: String(x.source || '').trim(), cible: String(x.cible || '').trim() };
  return { nom, couleur, cacher: p.cacher === true || p.cacher === 'true', menu: p.menu === true || p.menu === 'true',
    contenus: liste(p.contenus), cibles: liste(p.cibles), obligatoires: liste(p.obligatoires), numerotation, derivees, groupes, liens, extremites };
}

/**
 * Place d'un nœud juste avant ou juste après un frère de même balise (contrat indexPres des formats XML qui gardent l'ordre
 * des features d'EMF : un nœud ne se glisse qu'entre des nœuds de sa balise).
 * @param {object} parent nœud parent @param {string} tag balise du nœud inséré
 * @param {object|null} voisin frère de référence @param {boolean} avant juste avant lui (sinon juste après)
 * @returns {number|null} index d'insertion, ou null (voisin d'une autre balise ou d'un autre parent)
 */
function fmtIndexPresMemeBalise(parent, tag, voisin, avant) {
  if (!parent || !voisin || voisin.parent !== parent || voisin.tag !== tag) return null;
  const i = parent.enfants.indexOf(voisin);
  return i < 0 ? null : avant ? i : i + 1;
}

/**
 * Format d'un modèle trouvé dans un dossier de projet (extensions « dossier » du format, plus strictes
 * que celles de l'ouverture : pas de .xml quelconque).
 * @param {string} nom nom du fichier
 * @returns {object|null} adaptateur, ou null
 */
function fmtModeleDeDossier(nom) {
  const n = (nom || '').toLowerCase();
  // Extension cherchée, puis reconnaissance sans contenu : un .uml d'un dossier va au format UML s'il est inclus (son .notation
  // l'accompagne), sinon à SysML v1 ; le contenu tranche ensuite à l'ouverture (fmtPour)
  const candidats = FORMATS.filter(f => f.fichiers.dossier.some(e => n.endsWith(e)));
  return candidats.find(f => f.reconnait(nom)) || candidats[0] || fmtArchivePour(nom);
}

/**
 * Formats de cette version qui savent créer un projet vide (extension projetVide), dans l'ordre de présentation (projetVide.ordre).
 * @returns {object[]} adaptateurs
 */
function fmtNouveaux() { return FORMATS.filter(f => f.projetVide && typeof f.projetVide.creer === 'function').sort((a, b) => (a.projetVide.ordre || 0) - (b.projetVide.ordre || 0)); }

/**
 * Nom de projet nettoyé : espaces de tête et de fin retirés, caractères interdits dans un nom de fichier remplacés par « _ ».
 * @param {string} nom nom saisi
 * @returns {string} nom utilisable pour les fichiers du projet ('' si vide)
 */
function fmtNomProjet(nom) {
  // eslint-disable-next-line no-control-regex
  return String(nom || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '');
}

/**
 * Extensions cherchées dans un dossier de projet (tous formats).
 * @returns {string[]}
 */
function fmtExtensionsDossier() {
  return [...new Set(FORMATS.flatMap(f => [...f.fichiers.dossier, ...(f.archives ? f.archives.extensions : [])]))];
}

/* ── src/js/32-archives.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   32. ARCHIVES — lecture et réécriture sans perte d'une archive zip (commun, sans DOM)
   Un projet enregistré en archive (Cameo : .mdzip) garde le modèle dans une de ses entrées, à côté de bien
   d'autres (diagrammes, options, profils utilisés). Réécrire l'archive ne touche qu'aux entrées remplacées :
   les autres sont recopiées octet pour octet (en-tête local, données compressées, descripteur), leur entrée du
   répertoire central aussi, seule leur position étant mise à jour. Décompression et compression par
   DecompressionStream / CompressionStream (deflate brut), présents dans les navigateurs et dans Node.
   ═══════════════════════════════════════════════════════════════════════ */

/** Table du CRC-32 (polynôme 0xEDB88320) de zip. */
const ARZ_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();

/**
 * CRC-32 d'un contenu, comme zip le calcule.
 * @param {Uint8Array} o octets
 * @returns {number}
 */
function arzCrc32(o) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < o.length; i++) c = ARZ_CRC[(c ^ o[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Empreinte SHA-1 d'un contenu, en hexadécimal (Cameo : contentHash du contenu d'un diagramme).
 * @param {Uint8Array} o octets
 * @returns {string} 40 chiffres hexadécimaux
 */
function arzSha1(o) {
  const n = o.length, l = ((n + 9 + 63) >> 6) << 6, m = new Uint8Array(l), dv = new DataView(m.buffer), w = new Uint32Array(80);
  m.set(o); m[n] = 0x80;
  dv.setUint32(l - 8, Math.floor(n / 0x20000000), false); dv.setUint32(l - 4, (n * 8) >>> 0, false);
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  const rot = (x, k) => (x << k) | (x >>> (32 - k));
  for (let b = 0; b < l; b += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(b + 4 * i, false);
    for (let i = 16; i < 80; i++) w[i] = rot(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0, bb = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? (bb & c) | (~bb & d) : i < 40 ? bb ^ c ^ d : i < 60 ? (bb & c) | (bb & d) | (c & d) : bb ^ c ^ d;
      const k = i < 20 ? 0x5A827999 : i < 40 ? 0x6ED9EBA1 : i < 60 ? 0x8F1BBCDC : 0xCA62C1D6;
      const t = (rot(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rot(bb, 30) >>> 0; bb = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + bb) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map(x => x.toString(16).padStart(8, '0')).join('');
}

/**
 * Lit le répertoire central d'une archive zip : une entrée par fichier, avec ses positions dans l'archive.
 * @param {Uint8Array} octets archive
 * @returns {{octets:Uint8Array, entrees:object[], parNom:Map<string,object>, commentaire:Uint8Array}}
 *   entrée : { nom, methode, drapeaux, crc, taille (compressée), tailleBrute, local (position de l'en-tête local),
 *   central (position de l'entrée du répertoire central), longueurCentrale }
 * @throws {Error} archive illisible
 */
function arzLire(octets) {
  const o = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  let fin = -1;
  for (let i = o.length - 22; i >= Math.max(0, o.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  // Fichier marqué par un conflit de fusion de git (« <<<<<<< HEAD » … « ======= » …) : deux versions collées, aucune n'est sûre
  if (o.length > 8 && new TextDecoder().decode(o.subarray(0, 8)) === '<<<<<<< ') throw new Error(_L('Archive zip illisible : le fichier porte un conflit de fusion de git (« <<<<<<< HEAD »), deux versions y sont collées. Reprenez une version propre du fichier.'));
  if (fin < 0) throw new Error(_L('Archive zip illisible (répertoire central introuvable).'));
  const n = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const entrees = [], parNom = new Map();
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error(_L('Archive zip illisible (répertoire central abîmé).'));
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true);
    const e = { nom: new TextDecoder().decode(o.subarray(p + 46, p + 46 + ln)), drapeaux: v.getUint16(p + 8, true), methode: v.getUint16(p + 10, true),
      crc: v.getUint32(p + 16, true), taille: v.getUint32(p + 20, true), tailleBrute: v.getUint32(p + 24, true), local: v.getUint32(p + 42, true),
      central: p, longueurCentrale: 46 + ln + le + lc };
    if (e.taille === 0xFFFFFFFF || e.local === 0xFFFFFFFF) throw new Error(_L('Archive zip64 : non prise en charge.'));
    entrees.push(e); parNom.set(e.nom, e);
    p += e.longueurCentrale;
  }
  return { octets: o, entrees, parNom, commentaire: o.slice(fin + 22, fin + 22 + v.getUint16(fin + 20, true)) };
}

/**
 * Position des données compressées d'une entrée et fin de son enregistrement local (descripteur de données compris).
 * @param {object} arch archive (arzLire) @param {object} e entrée
 * @returns {{debut:number, finDonnees:number, fin:number}}
 */
function arzPlage(arch, e) {
  const o = arch.octets, v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  if (v.getUint32(e.local, true) !== 0x04034b50) throw new Error(_Lp('Archive zip illisible (en-tête de « {n} » abîmé).', { n: e.nom }));
  const debut = e.local + 30 + v.getUint16(e.local + 26, true) + v.getUint16(e.local + 28, true), finDonnees = debut + e.taille;
  let fin = finDonnees;
  if (e.drapeaux & 8) fin += finDonnees + 4 <= o.length && v.getUint32(finDonnees, true) === 0x08074b50 ? 16 : 12;   // descripteur de données
  return { debut, finDonnees, fin };
}

/**
 * Contenu décompressé d'une entrée.
 * @param {object} arch archive (arzLire) @param {string} nom entrée
 * @returns {Promise<Uint8Array>}
 * @throws {Error} entrée absente ou compression inconnue
 */
async function arzDonnees(arch, nom) {
  const e = arch.parNom.get(nom);
  if (!e) throw new Error(_Lp('Entrée « {n} » absente de l\'archive.', { n: nom }));
  const { debut, finDonnees } = arzPlage(arch, e), brut = arch.octets.subarray(debut, finDonnees);
  if (e.methode === 0) return brut;
  if (e.methode !== 8) throw new Error(_Lp('Entrée « {n} » : compression inconnue ({m}).', { n: nom, m: e.methode }));
  const flux = new Blob([brut]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/**
 * Texte UTF-8 d'une entrée.
 * @param {object} arch @param {string} nom @returns {Promise<string>}
 */
async function arzTexte(arch, nom) { return new TextDecoder('utf-8').decode(await arzDonnees(arch, nom)); }

/**
 * Compresse un contenu (deflate brut, méthode 8 de zip).
 * @param {Uint8Array} o @returns {Promise<Uint8Array>}
 */
async function arzCompresser(o) {
  const flux = new Blob([o]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/**
 * Réécrit l'archive avec des entrées remplacées : chaque autre entrée est recopiée telle quelle (enregistrement local et
 * entrée du répertoire central, position mise à jour) ; une entrée remplacée est recompressée, son en-tête écrit avec
 * ses tailles et son CRC (sans descripteur de données), sa date et son nom gardés. L'ordre des entrées est conservé.
 * @param {object} arch archive (arzLire)
 * @param {Map<string, Uint8Array>} remplacements nouveau contenu (décompressé) par nom d'entrée
 * @returns {Promise<Uint8Array>} nouvelle archive
 */
async function arzEcrire(arch, remplacements) {
  const o = arch.octets, v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  const morceaux = [], centraux = [];
  let pos = 0;
  for (const e of arch.entrees) {
    const central = o.slice(e.central, e.central + e.longueurCentrale), vc = new DataView(central.buffer);
    vc.setUint32(42, pos, true);
    if (remplacements.has(e.nom)) {
      const brut = remplacements.get(e.nom), comp = await arzCompresser(brut), crc = arzCrc32(brut);
      const ln = v.getUint16(e.central + 28, true), nom = o.subarray(e.central + 46, e.central + 46 + ln);
      const tete = new Uint8Array(30 + ln), vt = new DataView(tete.buffer);
      vt.setUint32(0, 0x04034b50, true); vt.setUint16(4, v.getUint16(e.central + 6, true), true);   // version nécessaire
      vt.setUint16(6, e.drapeaux & ~8, true); vt.setUint16(8, 8, true);
      vt.setUint16(10, v.getUint16(e.central + 12, true), true); vt.setUint16(12, v.getUint16(e.central + 14, true), true);   // heure, date
      vt.setUint32(14, crc, true); vt.setUint32(18, comp.length, true); vt.setUint32(22, brut.length, true);
      vt.setUint16(26, ln, true); vt.setUint16(28, 0, true); tete.set(nom, 30);
      vc.setUint16(8, e.drapeaux & ~8, true); vc.setUint16(10, 8, true);
      vc.setUint32(16, crc, true); vc.setUint32(20, comp.length, true); vc.setUint32(24, brut.length, true);
      morceaux.push(tete, comp); pos += tete.length + comp.length;
    } else {
      const { fin } = arzPlage(arch, e), bloc = o.subarray(e.local, fin);
      morceaux.push(bloc); pos += bloc.length;
    }
    centraux.push(central);
  }
  const debutCentral = pos, tailleCentral = centraux.reduce((t, c) => t + c.length, 0);
  const finCentral = new Uint8Array(22 + arch.commentaire.length), vf = new DataView(finCentral.buffer);
  vf.setUint32(0, 0x06054b50, true); vf.setUint16(8, arch.entrees.length, true); vf.setUint16(10, arch.entrees.length, true);
  vf.setUint32(12, tailleCentral, true); vf.setUint32(16, debutCentral, true); vf.setUint16(20, arch.commentaire.length, true);
  finCentral.set(arch.commentaire, 22);
  const res = new Uint8Array(pos + tailleCentral + finCentral.length);
  let k = 0;
  for (const m of [...morceaux, ...centraux, finCentral]) { res.set(m, k); k += m.length; }
  return res;
}

/* ── src/js/reqif/10-lecture.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   REQIF/10. FORMAT ReqIF — lecture et présentation
   ReqIF (OMG Requirements Interchange Format 1.0 à 1.2, https://www.omg.org/reqif/) : fichier XML d'échange
   d'exigences (DOORS, Polarion, ReqIF Studio, Enterprise Architect, Capella Requirements…). Le fichier est lu par
   le cœur XML sans perte (10-xml-texte.js, partagé avec Capella) ; ce module en tire le modèle ReqIF (types de
   données, types, objets, spécifications et leur hiérarchie, relations, groupes) et l'arbre présenté à
   l'interface (contrat de 28-formats.js) : un nœud par objet, placé à sa première place dans une spécification.
   Sans DOM : chargé aussi par les tests Node.
   ═══════════════════════════════════════════════════════════════════════ */

/** Espace de noms XHTML (valeurs mises en forme, ATTRIBUTE-VALUE-XHTML). */
const RQ_NS_XHTML = 'http://www.w3.org/1999/xhtml';

/** Parties du fichier : elles jouent le rôle des couches ARCADIA (pastilles, filtre de la recherche). */
const RQ_PARTIES = { SPEC: _L('Spécifications et exigences'), REL: _L('Relations'), TYPE: _L('Types et données') };

/** Conteneurs de REQ-IF-CONTENT, dans l'ordre du schéma ReqIF. */
const RQ_CONTENEURS = ['DATATYPES', 'SPEC-TYPES', 'SPEC-OBJECTS', 'SPEC-RELATIONS', 'SPECIFICATIONS', 'SPEC-RELATION-GROUPS'];

/** Noms d'attributs de la présentation qui portent des identifiants (références). */
const RQ_ATTRS_REFS = new Set(['type', 'datatype', 'source', 'target', 'object', 'sourceSpecification', 'targetSpecification', 'relations']);

/** Noms réservés de la présentation : une définition d'attribut de même nom prend un suffixe. */
const RQ_RESERVES = new Set(['id', 'name', 'description', 'summary', 'IDENTIFIER', 'LONG-NAME', 'DESC', 'LAST-CHANGE', ...RQ_ATTRS_REFS]);

/** Métaclasse ReqIF présentée pour chaque balise d'élément. */
const RQ_TYPES = {
  'SPEC-OBJECT': 'SpecObject', 'SPECIFICATION': 'Specification', 'SPEC-RELATION': 'SpecRelation', 'RELATION-GROUP': 'RelationGroup',
  'SPEC-HIERARCHY': 'SpecHierarchy', 'SPEC-OBJECT-TYPE': 'SpecObjectType', 'SPECIFICATION-TYPE': 'SpecificationType',
  'SPEC-RELATION-TYPE': 'SpecRelationType', 'RELATION-GROUP-TYPE': 'RelationGroupType', 'ENUM-VALUE': 'EnumValue'
};

/** Lettres de l'icône de chaque métaclasse présentée. */
const RQ_ICONES = { ReqIF: '▣', Specifications: '▣', SpecObjects: '▣', SpecRelations: '▣', SpecRelationGroups: '▣', SpecTypes: '▣', Datatypes: '▣',
  Specification: '▤', SpecObject: 'R', SpecHierarchy: '↪', SpecRelation: '⇢', RelationGroup: '⇉', SpecObjectType: 'T', SpecificationType: 'T',
  SpecRelationType: 'T', RelationGroupType: 'T', EnumValue: 'e' };

/**
 * Nom local d'une balise (préfixe d'espace de noms retiré : « reqif:SPEC-OBJECT » → « SPEC-OBJECT »).
 * @param {string} tag balise @returns {string}
 */
function rqLocal(tag) { const i = tag.indexOf(':'); return i < 0 ? tag : tag.slice(i + 1); }

/**
 * Premier enfant d'un nœud XML de nom local donné.
 * @param {object} el nœud XML @param {string} nom nom local @returns {object|null}
 */
function rqEnfant(el, nom) {
  if (el) for (const c of el.enfants) if (rqLocal(c.tag) === nom) return c;
  return null;
}

/**
 * Enfants d'un nœud XML de nom local donné.
 * @param {object} el nœud XML @param {string} nom nom local @returns {object[]}
 */
function rqEnfants(el, nom) { return el ? el.enfants.filter(c => rqLocal(c.tag) === nom) : []; }

/**
 * Identifiants cités par une référence : <TYPE><SPEC-OBJECT-TYPE-REF>id</…></TYPE> (texte des enfants du conteneur).
 * @param {object} el nœud XML porteur @param {string} nom conteneur de la référence (TYPE, OBJECT, SOURCE…) @returns {string[]}
 */
function rqRefs(el, nom) {
  const c = rqEnfant(el, nom);
  return c ? c.enfants.map(r => (r.texte != null ? r.texte.trim() : '')).filter(Boolean) : [];
}

/**
 * Premier identifiant cité par une référence, ou null.
 * @param {object} el nœud XML porteur @param {string} nom conteneur de la référence @returns {string|null}
 */
function rqRef(el, nom) { return rqRefs(el, nom)[0] || null; }

/**
 * Genre de donnée d'une balise de type, de définition ou de valeur (« ATTRIBUTE-VALUE-XHTML » → « XHTML »).
 * @param {string} tag balise @returns {string} STRING, INTEGER, REAL, BOOLEAN, DATE, ENUMERATION ou XHTML
 */
function rqGenre(tag) { return rqLocal(tag).replace(/^(DATATYPE-DEFINITION|ATTRIBUTE-DEFINITION|ATTRIBUTE-VALUE)-/, ''); }

/**
 * Contenu XML d'un nœud, tel qu'écrit dans le fichier (THE-VALUE d'une valeur XHTML) ; contenu d'un nœud créé par
 * Arcature : son texte brut (brutInterieur).
 * @param {object} xml document XML (xtLire) @param {object} n nœud @returns {string}
 */
function rqInterieur(xml, n) {
  if (n.brutInterieur != null) return n.brutInterieur;
  return n.s != null && n.fc != null ? xml.src.slice(n.fo, n.fc) : '';
}

/**
 * Lit le modèle ReqIF d'un document XML : en-tête, types de données (et valeurs énumérées), types et définitions
 * d'attributs, objets, spécifications (hiérarchie), relations et groupes.
 * @param {object} xml document lu par xtLire
 * @returns {object} modèle
 */
function rqModele(xml) {
  const racine = xml.racine;
  if (rqLocal(racine.tag) !== 'REQ-IF') throw new Error(_Lp('Fichier ReqIF attendu : l\'élément racine est <{t}> au lieu de <REQ-IF>.', { t: racine.tag }));
  const M = { xml, racine, datatypes: new Map(), valeursEnum: new Map(), definitions: new Map(), types: new Map(), objets: new Map(),
    specs: [], hierarchies: new Map(), relations: [], groupes: [], conteneurs: {} };
  M.entete = rqEnfant(rqEnfant(racine, 'THE-HEADER'), 'REQ-IF-HEADER');
  M.contenu = rqEnfant(rqEnfant(racine, 'CORE-CONTENT'), 'REQ-IF-CONTENT');
  for (const k of RQ_CONTENEURS) M.conteneurs[k] = rqEnfant(M.contenu, k);
  // Types de données
  for (const d of (M.conteneurs.DATATYPES || { enfants: [] }).enfants) {
    const dt = { id: xtAttr(d, 'IDENTIFIER'), xml: d, genre: rqGenre(d.tag), valeurs: [] };
    for (const v of rqEnfants(rqEnfant(d, 'SPECIFIED-VALUES'), 'ENUM-VALUE')) {
      const ev = { id: xtAttr(v, 'IDENTIFIER'), xml: v, nom: xtAttr(v, 'LONG-NAME') || '', datatype: dt };
      const ev2 = rqEnfant(rqEnfant(v, 'PROPERTIES'), 'EMBEDDED-VALUE');
      ev.cle = ev2 ? xtAttr(ev2, 'KEY') : undefined;
      dt.valeurs.push(ev); M.valeursEnum.set(ev.id, ev);
    }
    M.datatypes.set(dt.id, dt);
  }
  // Types (objets, spécifications, relations, groupes) et définitions de leurs attributs
  for (const t of (M.conteneurs['SPEC-TYPES'] || { enfants: [] }).enfants) {
    const ty = { id: xtAttr(t, 'IDENTIFIER'), xml: t, sorte: rqLocal(t.tag), nom: xtAttr(t, 'LONG-NAME') || '', attributs: [] };
    for (const a of (rqEnfant(t, 'SPEC-ATTRIBUTES') || { enfants: [] }).enfants) {
      const genre = rqGenre(a.tag), dv = rqEnfant(a, 'DEFAULT-VALUE');
      const def = { id: xtAttr(a, 'IDENTIFIER'), xml: a, genre, nom: xtAttr(a, 'LONG-NAME') || xtAttr(a, 'IDENTIFIER'), porteur: ty,
        datatype: rqRef(a, 'TYPE'), multi: xtAttr(a, 'MULTI-VALUED') === 'true', editable: xtAttr(a, 'IS-EDITABLE') !== 'false',
        defaut: dv && dv.enfants.length ? dv.enfants[0] : null };
      ty.attributs.push(def); M.definitions.set(def.id, def);
    }
    M.types.set(ty.id, ty);
  }
  // Objets
  for (const o of rqEnfants(M.conteneurs['SPEC-OBJECTS'], 'SPEC-OBJECT')) {
    const id = xtAttr(o, 'IDENTIFIER');
    M.objets.set(id, { id, xml: o, type: rqRef(o, 'TYPE') });
  }
  // Spécifications et leur hiérarchie
  const hierarchie = (el, parent) => rqEnfants(rqEnfant(el, 'CHILDREN'), 'SPEC-HIERARCHY').map(h => {
    const x = { id: xtAttr(h, 'IDENTIFIER'), xml: h, objet: rqRef(h, 'OBJECT'), parent };
    M.hierarchies.set(x.id, x);
    x.enfants = hierarchie(h, x);
    return x;
  });
  for (const s of rqEnfants(M.conteneurs.SPECIFICATIONS, 'SPECIFICATION')) {
    const sp = { id: xtAttr(s, 'IDENTIFIER'), xml: s, type: rqRef(s, 'TYPE') };
    sp.enfants = hierarchie(s, null);
    M.specs.push(sp);
  }
  // Relations et groupes
  for (const r of rqEnfants(M.conteneurs['SPEC-RELATIONS'], 'SPEC-RELATION'))
    M.relations.push({ id: xtAttr(r, 'IDENTIFIER'), xml: r, type: rqRef(r, 'TYPE'), source: rqRef(r, 'SOURCE'), cible: rqRef(r, 'TARGET') });
  for (const g of rqEnfants(M.conteneurs['SPEC-RELATION-GROUPS'], 'RELATION-GROUP'))
    M.groupes.push({ id: xtAttr(g, 'IDENTIFIER'), xml: g, type: rqRef(g, 'TYPE'), sourceSpec: rqRef(g, 'SOURCE-SPECIFICATION'),
      cibleSpec: rqRef(g, 'TARGET-SPECIFICATION'), relations: rqRefs(g, 'SPEC-RELATIONS') });
  return M;
}

/**
 * Valeurs d'attributs portées par un élément (VALUES), par identifiant de définition.
 * @param {object} el nœud XML (SPEC-OBJECT, SPECIFICATION, SPEC-RELATION) @returns {Map<string,object>} définition → nœud de valeur
 */
function rqValeurs(el) {
  const res = new Map();
  for (const v of (rqEnfant(el, 'VALUES') || { enfants: [] }).enfants) {
    const d = (rqEnfant(v, 'DEFINITION') || { enfants: [] }).enfants[0];
    const id = d && d.texte != null ? d.texte.trim() : null;
    if (id && !res.has(id)) res.set(id, v);
  }
  return res;
}

/* ─────────────────────────────── XHTML ─────────────────────────────── */

/**
 * XHTML d'une valeur (contenu de THE-VALUE) → HTML de l'éditeur de description : préfixes et déclarations
 * d'espace de noms retirés, éléments vides écrits « <div></div> » (le HTML ne connaît pas « <div/> »).
 * @param {string} x contenu XML @returns {string} HTML
 */
function rqXhtmlVersHtml(x) {
  const VIDES = /^(br|hr|img|col|area|base|input|link|meta|param)$/i;
  return String(x || '').trim()
    .replace(/<(\/?)[\w.-]+:(?=[\w.-]+[\s/>])/g, '<$1')
    .replace(/\s+xmlns(?::[\w.-]+)?\s*=\s*("[^"]*"|'[^']*')/g, '')
    .replace(/<([\w.-]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/>/g, (m, t, a) => (VIDES.test(t) ? `<${t}${a}/>` : `<${t}${a}></${t}>`));
}

/**
 * Décode les entités d'un texte HTML ou XML (entités nommées courantes et numériques) ; une entité inconnue est laissée.
 * @param {string} s texte @returns {string}
 */
function rqDecoderEntites(s) {
  const N = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€', copy: '©', reg: '®', deg: '°', middot: '·', bull: '•', times: '×' };
  return String(s).replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m; }
    return N[e] ?? m;
  });
}

/**
 * Texte brut d'un contenu XHTML ou HTML : blocs et sauts de ligne gardés, balises retirées, entités décodées.
 * @param {string} x contenu @returns {string}
 */
function rqXhtmlVersTexte(x) {
  return rqDecoderEntites(String(x || '').replace(/\r/g, '')
    .replace(/<\/?(?:[\w.-]+:)?(?:p|div|h[1-6]|li|tr|pre|blockquote|dd|dt|table|ul|ol)\b[^>]*>/gi, '\n').replace(/<(?:[\w.-]+:)?br\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t ]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n').trim();
}

/**
 * Indique si un contenu XHTML n'est qu'un texte (au plus un bloc div ou p, sans mise en forme) : il se modifie alors
 * comme un texte simple sans rien perdre.
 * @param {string} x contenu @returns {boolean}
 */
function rqXhtmlSimple(x) {
  const h = rqXhtmlVersHtml(x);
  return /^(?:<(div|p)>[^<]*<\/\1>|[^<]*)$/.test(h);
}

/** Éléments XHTML admis dans une valeur ReqIF (modules de XHTML 1.1 retenus par ReqIF), en minuscules. */
const RQ_XHTML_ELEMENTS = new Set(['div', 'p', 'br', 'span', 'em', 'strong', 'b', 'i', 'u', 'tt', 'big', 'small', 'sub', 'sup', 'del', 'ins', 'code', 'pre', 'kbd',
  'samp', 'var', 'cite', 'abbr', 'acronym', 'dfn', 'q', 'blockquote', 'address', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'a',
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'col', 'colgroup', 'object', 'param']);

/** Attributs XHTML gardés. */
const RQ_XHTML_ATTRS = new Set(['href', 'title', 'class', 'style', 'colspan', 'rowspan', 'align', 'valign', 'data', 'type', 'width', 'height', 'name', 'value',
  'cite', 'datetime', 'span', 'border', 'cellpadding', 'cellspacing', 'summary', 'abbr', 'scope']);

/**
 * HTML de l'éditeur de description → XHTML d'une valeur ReqIF : balises admises préfixées comme dans le fichier
 * (xhtml:p…) ou espace de noms déclaré sur le bloc englobant, éléments vides fermés, entités HTML écrites en caractères,
 * balises inconnues retirées (leur texte gardé), image (img) écrite en object. Le tout tient dans un seul bloc div
 * (contenu XHTML de ReqIF : un div ou un p).
 * @param {string} html HTML @param {string|null} prefixe préfixe XHTML du fichier, ou null (espace de noms par défaut)
 * @returns {string} XHTML
 */
function rqHtmlVersXhtml(html, prefixe) {
  const p = prefixe ? prefixe + ':' : '', VIDES = new Set(['br', 'hr', 'col', 'param']);
  const encT = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const encA = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const morceaux = [], pile = [];
  let i = 0;
  const src = String(html || '');
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const texte = src.slice(i, lt < 0 ? src.length : lt);
    if (texte) morceaux.push({ t: 'texte', v: encT(rqDecoderEntites(texte)) });
    if (lt < 0) break;
    if (src.startsWith('<!--', lt)) { const f = src.indexOf('-->', lt); i = f < 0 ? src.length : f + 3; continue; }
    const gt = src.indexOf('>', lt);
    if (gt < 0) { morceaux.push({ t: 'texte', v: encT(src.slice(lt)) }); break; }
    const m = /^<(\/?)([a-zA-Z][\w.:-]*)([\s\S]*?)(\/?)>$/.exec(src.slice(lt, gt + 1));
    i = gt + 1;
    if (!m) { morceaux.push({ t: 'texte', v: encT(src.slice(lt, gt + 1)) }); continue; }
    let nom = rqLocal(m[2]).toLowerCase();
    const attrs = [];
    for (const a of m[3].matchAll(/([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) attrs.push([a[1].toLowerCase(), rqDecoderEntites(a[3] ?? a[4] ?? a[5] ?? '')]);
    if (nom === 'img') {                                // image de l'éditeur : object (module Object de XHTML)
      const s = (attrs.find(a => a[0] === 'src') || [])[1];
      if (!s) continue;
      const ext = (/\.(\w+)(?:[?#].*)?$/.exec(s) || [])[1] || 'png';
      morceaux.push({ t: 'ouvre', nom: 'object', attrs: [['data', s], ['type', 'image/' + (ext.toLowerCase() === 'jpg' ? 'jpeg' : ext.toLowerCase())]], vide: false });
      morceaux.push({ t: 'ferme', nom: 'object' });
      continue;
    }
    if (!RQ_XHTML_ELEMENTS.has(nom)) continue;          // balise inconnue : retirée, son texte reste
    if (m[1]) { morceaux.push({ t: 'ferme', nom }); continue; }
    morceaux.push({ t: 'ouvre', nom, attrs: attrs.filter(a => RQ_XHTML_ATTRS.has(a[0])), vide: VIDES.has(nom) || !!m[4] });
  }
  // Écriture : éléments équilibrés (fermetures orphelines ignorées, éléments restés ouverts fermés)
  let out = '';
  for (const x of morceaux) {
    if (x.t === 'texte') out += x.v;
    else if (x.t === 'ouvre') {
      const a = x.attrs.map(([n, v]) => ` ${n}="${encA(v)}"`).join('');
      if (x.vide) out += `<${p}${x.nom}${a}/>`;
      else { out += `<${p}${x.nom}${a}>`; pile.push(x.nom); }
    } else {
      const k = pile.lastIndexOf(x.nom);
      if (k < 0) continue;
      while (pile.length > k) out += `</${p}${pile.pop()}>`;
    }
  }
  while (pile.length) out += `</${p}${pile.pop()}>`;
  // Un seul bloc englobant (div ou p) ; sinon, enveloppé dans un div
  const re = new RegExp(`^<${p.replace(/[.]/g, '\\.')}(div|p)[\\s>][\\s\\S]*</${p.replace(/[.]/g, '\\.')}\\1>$`);
  const seul = re.test(out) && (() => {                // le premier bloc se ferme-t-il à la fin ?
    let prof = 0;
    for (const t of out.matchAll(/<(\/?)([\w.:-]+)[^>]*?(\/?)>/g)) {
      if (t[3]) continue;
      prof += t[1] ? -1 : 1;
      if (prof === 0 && t.index + t[0].length < out.length) return false;
    }
    return true;
  })();
  const ns = prefixe ? '' : ` xmlns="${RQ_NS_XHTML}"`;
  if (seul) return ns ? out.replace(/^<(div|p)/, `<$1${ns}`) : out;
  return `<${p}div${ns}>${out}</${p}div>`;
}

/**
 * Texte brut → HTML de l'éditeur (paragraphes séparés par une ligne vide, sauts de ligne gardés).
 * @param {string} t texte @returns {string} HTML
 */
function rqTexteVersHtml(t) {
  t = String(t || '');
  if (!t.trim()) return '';
  return t.replace(/\r/g, '').split(/\n\s*\n/).map(p => '<p>' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>').join('');
}

/* ─────────────────────────────── Présentation ─────────────────────────────── */

/**
 * Valeur lisible d'un nœud de valeur, selon le mode : « attr » (valeur de l'attribut présenté : texte, nombre, booléen,
 * identifiants des valeurs énumérées séparés par une espace, texte brut d'un XHTML), « html » (XHTML en HTML de
 * l'éditeur), « texte » (texte brut).
 * @param {object} M modèle @param {object} v nœud de valeur (ATTRIBUTE-VALUE-…) @param {string} mode attr, html ou texte
 * @returns {string|undefined} undefined : aucune valeur
 */
function rqLireValeur(M, v, mode) {
  const genre = rqGenre(v.tag);
  if (genre === 'XHTML') {
    const tv = rqEnfant(v, 'THE-VALUE');
    if (!tv) return undefined;
    const x = rqInterieur(M.xml, tv);
    return mode === 'html' ? rqXhtmlVersHtml(x) : rqXhtmlVersTexte(x);
  }
  if (genre === 'ENUMERATION') {
    const ids = rqRefs(v, 'VALUES');
    return mode === 'attr' ? ids.join(' ') : ids.map(id => (M.valeursEnum.get(id) || { nom: id }).nom).join(', ');
  }
  const t = xtAttr(v, 'THE-VALUE');
  return mode === 'html' && t != null ? rqTexteVersHtml(t) : t;
}

/**
 * Définition d'attribut d'un type par son nom long (« ReqIF.Name »…), ou null.
 * @param {object|null} ty type @param {string} nom @returns {object|null}
 */
function rqDefNommee(ty, nom) { return ty ? ty.attributs.find(a => a.nom === nom) || null : null; }

/**
 * Sources du nom et de la description d'un élément typé (objet, spécification, relation), d'après les attributs
 * conventionnels du guide d'implémentation de ReqIF : nom = ReqIF.ChapterName (titre) s'il est renseigné, sinon
 * ReqIF.Name s'il est renseigné, sinon LONG-NAME s'il est présent, sinon ReqIF.Name si le type le définit, sinon
 * LONG-NAME ; description = ReqIF.Text, sinon ReqIF.Description, sinon le premier attribut XHTML du type, sinon DESC.
 * @param {object} M modèle @param {object} x nœud XML @param {object|null} ty type @param {Map} valeurs valeurs portées
 * @returns {{nom:object, desc:object}} sources : { genre:'valeur', def } ou { genre:'attr', n }
 */
function rqSources(M, x, ty, valeurs) {
  const chap = rqDefNommee(ty, 'ReqIF.ChapterName'), nomD = rqDefNommee(ty, 'ReqIF.Name');
  const rempli = d => !!(d && valeurs.has(d.id) && rqLireValeur(M, valeurs.get(d.id), 'texte'));
  const nomTexte = nomD && /^(STRING|XHTML)$/.test(nomD.genre) ? nomD : null;
  const nomDef = rempli(chap) ? chap : rempli(nomTexte) ? nomTexte : xtAttr(x, 'LONG-NAME') ? null : nomTexte;
  const nom = nomDef ? { genre: 'valeur', def: nomDef } : { genre: 'attr', n: 'LONG-NAME' };
  const texte = ['ReqIF.Text', 'ReqIF.Description'].map(n => rqDefNommee(ty, n)).find(d => d && /^(STRING|XHTML)$/.test(d.genre) && d !== nomDef)
    || (ty ? ty.attributs.find(d => d.genre === 'XHTML' && d !== nomDef && d !== chap) : null);
  return { nom, desc: texte ? { genre: 'valeur', def: texte } : { genre: 'attr', n: 'DESC' } };
}

/**
 * Construit l'arbre présenté à l'interface (contrat de 28-formats.js) : racine (en-tête), spécifications et leurs
 * exigences (un nœud par objet, à sa première place ; ses autres places : nœuds SpecHierarchy qui le citent), objets
 * hors spécification, relations, groupes de relations, types et types de données.
 * @param {object} M modèle (rqModele)
 * @returns {{racine:object, parId:Map}} présentation
 */
function rqPresenter(M) {
  const parId = new Map(), places = new Map(), nomsAutres = new Set(), clesEnum = new Set();
  for (const d of M.definitions.values()) if (d.genre !== 'ENUMERATION') nomsAutres.add(d.nom);
  /** Clé d'un attribut de valeur dans la présentation (nom long de sa définition, sans collision ; un attribut énuméré ne
   *  partage jamais sa clé avec un attribut d'un autre genre : ses valeurs sont des références). */
  const cle = (d, prises) => {
    let k = d.nom;
    if (RQ_RESERVES.has(k) || (d.genre === 'ENUMERATION' && nomsAutres.has(k)) || prises.has(k)) k = d.nom + ' [' + d.id + ']';
    prises.add(k);
    if (d.genre === 'ENUMERATION') clesEnum.add(k);
    return k;
  };
  /** Nouveau nœud présenté. */
  const noeud = (tag, id, parent, rq) => {
    const n = { tag, parent, enfants: [], prof: parent ? parent.prof + 1 : 0, attrs: [{ n: 'id', v: id }], rq: Object.assign({ M }, rq) };
    if (parent) parent.enfants.push(n);
    if (!parId.has(id)) parId.set(id, n);
    return n;
  };
  const ajout = (n, a, v) => { if (v != null && v !== '' && !n.attrs.some(x => x.n === a)) n.attrs.push({ n: a, v: String(v) }); };
  /** Attributs d'un élément identifiable : nom long, description, date de modification. */
  const identifiable = (n, x, sources) => {
    const s = sources || { nom: { genre: 'attr', n: 'LONG-NAME' }, desc: { genre: 'attr', n: 'DESC' } };
    n.rq.nom = s.nom; n.rq.desc = s.desc;
    const v = n.rq.valeurs || new Map();
    const lire = (src, mode) => (src.genre === 'attr' ? (mode === 'html' ? rqTexteVersHtml(xtAttr(x, src.n)) : xtAttr(x, src.n)) : v.has(src.def.id) ? rqLireValeur(M, v.get(src.def.id), mode) : undefined);
    ajout(n, 'name', lire(s.nom, 'texte'));
    ajout(n, 'description', lire(s.desc, 'html'));
    for (const a of ['LONG-NAME', 'DESC', 'LAST-CHANGE']) if (!(s.nom.genre === 'attr' && s.nom.n === a) && !(s.desc.genre === 'attr' && s.desc.n === a)) ajout(n, a, xtAttr(x, a));
  };
  /** Élément typé : type, sources du nom et de la description, attributs de valeur. */
  const type = (n, x) => {
    const ty = M.types.get(n.rq.type) || null, valeurs = rqValeurs(x);
    n.rq.ty = ty; n.rq.valeurs = valeurs;
    identifiable(n, x, rqSources(M, x, ty, valeurs));
    n.rq.titre = !!(n.rq.nom.def && n.rq.nom.def.nom === 'ReqIF.ChapterName');
    ajout(n, 'type', n.rq.type);
    const prises = new Set(), cles = new Map();
    const defs = [...(ty ? ty.attributs : []), ...[...valeurs.keys()].filter(id => !ty || !ty.attributs.some(a => a.id === id)).map(id => M.definitions.get(id) || { id, nom: id, genre: rqGenre(valeurs.get(id).tag), orpheline: true })];
    for (const d of defs) {
      if ((n.rq.nom.def && n.rq.nom.def === d) || (n.rq.desc.def && n.rq.desc.def === d)) continue;
      const k = cle(d, prises);
      cles.set(k, d);
      if (valeurs.has(d.id)) ajout(n, k, rqLireValeur(M, valeurs.get(d.id), 'attr'));
    }
    n.rq.cles = cles;
  };
  // Racine : l'en-tête du fichier (titre, commentaire)
  const E = M.entete;
  const racine = noeud('ReqIF', (E && xtAttr(E, 'IDENTIFIER')) || '§reqif', null, { genre: 'racine', xml: E });
  const champ = nom => { const c = rqEnfant(E, nom); return c && c.texte != null ? c.texte : undefined; };
  ajout(racine, 'name', E ? champ('TITLE') : undefined);
  ajout(racine, 'description', E ? rqTexteVersHtml(champ('COMMENT')) : undefined);
  if (E) for (const c of E.enfants) if (!/^(TITLE|COMMENT)$/.test(rqLocal(c.tag)) && c.texte != null) ajout(racine, rqLocal(c.tag), c.texte.trim());
  // Spécifications et exigences
  const dossier = (tag, id, nom, conteneur) => { const d = noeud(tag, id, racine, { genre: 'dossier', conteneur }); ajout(d, 'name', nom); return d; };
  const dossierSpecs = dossier('Specifications', '§specifications', _L('Spécifications'), 'SPECIFICATIONS');
  const placer = (h, parent) => {
    const o = M.objets.get(h.objet);
    let n;
    if (o && !places.has(o.id)) {
      n = noeud('SpecObject', o.id, parent, { genre: 'objet', xml: o.xml, objet: o, hier: h, hierXml: h.xml, type: o.type });
      type(n, o.xml);
      places.set(o.id, n);
    } else {
      n = noeud('SpecHierarchy', h.id || '§h' + parId.size, parent, { genre: 'occurrence', xml: h.xml, hier: h, hierXml: h.xml });
      identifiable(n, h.xml);
      ajout(n, 'object', h.objet);
    }
    for (const c of h.enfants) placer(c, n);
  };
  for (const s of M.specs) {
    const n = noeud('Specification', s.id, dossierSpecs, { genre: 'spec', xml: s.xml, spec: s, type: s.type });
    type(n, s.xml);
    for (const h of s.enfants) placer(h, n);
  }
  // Objets hors spécification
  const libres = [...M.objets.values()].filter(o => !places.has(o.id));
  if (libres.length) {
    const d = dossier('SpecObjects', '§objets', _L('Objets hors spécification'), 'SPEC-OBJECTS');
    for (const o of libres) { const n = noeud('SpecObject', o.id, d, { genre: 'objet', xml: o.xml, objet: o, hier: null, type: o.type }); type(n, o.xml); places.set(o.id, n); }
  }
  // Relations et groupes
  if (M.conteneurs['SPEC-RELATIONS'] || M.relations.length) {
    const d = dossier('SpecRelations', '§relations', _L('Relations'), 'SPEC-RELATIONS');
    for (const r of M.relations) {
      const n = noeud('SpecRelation', r.id, d, { genre: 'relation', xml: r.xml, relation: r, type: r.type });
      type(n, r.xml);
      ajout(n, 'source', r.source); ajout(n, 'target', r.cible);
    }
  }
  if (M.groupes.length) {
    const d = dossier('SpecRelationGroups', '§groupes', _L('Groupes de relations'), 'SPEC-RELATION-GROUPS');
    for (const g of M.groupes) {
      const n = noeud('RelationGroup', g.id, d, { genre: 'groupe', xml: g.xml, groupe: g, type: g.type });
      identifiable(n, g.xml);
      ajout(n, 'type', g.type); ajout(n, 'sourceSpecification', g.sourceSpec); ajout(n, 'targetSpecification', g.cibleSpec); ajout(n, 'relations', g.relations.join(' '));
    }
  }
  // Types et définitions d'attributs
  if (M.types.size) {
    const d = dossier('SpecTypes', '§types', _L('Types'), 'SPEC-TYPES');
    for (const ty of M.types.values()) {
      const n = noeud(RQ_TYPES[ty.sorte] || ty.sorte, ty.id, d, { genre: 'type', xml: ty.xml, ty });
      identifiable(n, ty.xml);
      for (const def of ty.attributs) {
        const a = noeud('AttributeDefinition' + def.genre[0] + def.genre.slice(1).toLowerCase(), def.id, n, { genre: 'definition', xml: def.xml, def });
        identifiable(a, def.xml);
        ajout(a, 'datatype', def.datatype);
        for (const k of ['MULTI-VALUED', 'IS-EDITABLE']) ajout(a, k, xtAttr(def.xml, k));
        if (def.defaut) ajout(a, 'default', rqLireValeur(M, def.defaut, 'texte'));
      }
    }
  }
  // Types de données (et valeurs énumérées)
  if (M.datatypes.size) {
    const d = dossier('Datatypes', '§datatypes', _L('Types de données'), 'DATATYPES');
    for (const dt of M.datatypes.values()) {
      const n = noeud('DatatypeDefinition' + dt.genre[0] + dt.genre.slice(1).toLowerCase(), dt.id, d, { genre: 'datatype', xml: dt.xml, dt });
      identifiable(n, dt.xml);
      for (const a of dt.xml.attrs) if (!/^(IDENTIFIER|LONG-NAME|DESC|LAST-CHANGE)$/.test(a.n)) ajout(n, a.n, a.v);
      for (const ev of dt.valeurs) {
        const e = noeud('EnumValue', ev.id, n, { genre: 'enum', xml: ev.xml, ev });
        identifiable(e, ev.xml);
        ajout(e, 'key', ev.cle);
      }
    }
  }
  // Libellés : nom, sinon début du texte, sinon type entre chevrons ; relation : « source → cible »
  const court = s => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 80 ? s.slice(0, 79) + '…' : s; };
  const texteDe = n => { const h = n.attrs.find(a => a.n === 'description'); return h ? court(rqXhtmlVersTexte(h.v)) : ''; };
  /** Première valeur de texte d'un élément typé (attributs de son type dans l'ordre) : libellé de repli. */
  const valeurDe = n => {
    for (const [k, d] of n.rq.cles || []) if (/^(STRING|XHTML)$/.test(d.genre)) { const a = n.attrs.find(x => x.n === k); if (a && a.v.trim()) return court(a.v); }
    return '';
  };
  for (const n of parId.values()) {
    const nom = (n.attrs.find(a => a.n === 'name') || {}).v;
    n.rq.libelle = nom ? court(nom) : texteDe(n) || valeurDe(n);
  }
  for (const n of parId.values()) {
    if (n.rq.libelle) continue;
    if (n.tag === 'SpecRelation') {
      const b = id => { const x = parId.get(id); return x ? x.rq.libelle || '‹' + x.tag + '›' : '?'; };
      n.rq.libelle = b(n.rq.relation.source) + ' → ' + b(n.rq.relation.cible);
    } else if (n.tag === 'SpecHierarchy') {
      const o = parId.get(n.rq.hier.objet);
      n.rq.libelle = o ? o.rq.libelle || '‹SpecObject›' : _Lp('‹objet introuvable : {id}›', { id: n.rq.hier.objet || '?' });
    }
  }
  return { racine, parId, clesEnum };
}

/** Clés des attributs énumérés du document ouvert (leurs valeurs sont des références vers les valeurs énumérées). */
const RQ_CLES_ENUM = { cles: new Set() };

/**
 * Identifiants cités par un attribut de la présentation, ou null (attribut de texte).
 * @param {string} nom nom de l'attribut @param {string} v valeur
 * @param {Set<string>} [clesEnum] clés des attributs énumérés (par défaut : celles du document ouvert)
 * @returns {string[]|null}
 */
function rqEstReference(nom, v, clesEnum) {
  if (!v || (!RQ_ATTRS_REFS.has(nom) && !(clesEnum || RQ_CLES_ENUM.cles).has(nom))) return null;
  return String(v).split(/\s+/).filter(Boolean);
}

/**
 * Liaisons du document ReqIF : références brutes (attributs portant des identifiants) sortantes et entrantes, et relations
 * (SPEC-RELATION) vues des deux côtés, par type de relation. Même forme que liaCalculer.
 * @param {object} doc document ReqIF @returns {{doc:object, metier:Map, sortantes:Map, entrantes:Map}}
 */
function rqLiaisons(doc) {
  const metier = new Map(), sortantes = new Map(), entrantes = new Map();
  const pousser = (m, el, x) => { const l = m.get(el); if (l) l.push(x); else m.set(el, [x]); };
  for (const n of doc.parId.values()) for (const a of n.attrs) {
    const r = rqEstReference(a.n, a.v, doc.clesEnum); if (!r) continue;
    for (const id of r) { const c = doc.parId.get(id) || null; pousser(sortantes, n, { attr: a.n, cible: c, id }); if (c) pousser(entrantes, c, { attr: a.n, source: n }); }
  }
  for (const n of doc.parId.values()) {
    if (n.tag !== 'SpecRelation') continue;
    const a = doc.parId.get(n.rq.relation.source), b = doc.parId.get(n.rq.relation.cible);
    if (!a || !b) continue;
    const rel = 'rel:' + (n.rq.type || '');
    pousser(metier, a, { rel, sens: 'sortant', autre: b, via: n });
    pousser(metier, b, { rel, sens: 'entrant', autre: a, via: n });
  }
  return { doc, metier, sortantes, entrantes };
}

/* ── src/js/reqif/30-format.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   REQIF/30. FORMAT ReqIF — adaptateur et écriture sans perte
   Contrat de 28-formats.js. Le fichier est modifié par le cœur XML (10-xml-texte.js) : ce qui n'a pas changé est
   recopié tel quel. Une valeur d'attribut modifiée est réécrite en entier (ATTRIBUTE-VALUE-…), au format des outils
   ReqIF ; un élément modifié reçoit une nouvelle date LAST-CHANGE. Chaque emplacement garde l'historique de ses états
   (nœuds d'origine, attributs bruts) : annuler et rétablir retrouvent le texte exact, octet pour octet.
   La présentation (10-lecture.js) est recalculée après chaque modification (capacité « relecture »).
   Sans DOM : chargé aussi par les tests Node.
   ═══════════════════════════════════════════════════════════════════════ */

/** Ordre d'écriture des attributs d'un élément identifiable (celui du schéma ReqIF). */
const RQ_ORDRE_ATTRS = ['DESC', 'IDENTIFIER', 'LAST-CHANGE', 'LONG-NAME'];

/** Genres d'attributs simples de l'interface pour chaque genre de donnée ReqIF. */
const RQ_GENRES_SAISIE = { STRING: 'texte', INTEGER: 'entier', REAL: 'reel', BOOLEAN: 'booleen', DATE: 'texte', XHTML: 'texte', ENUMERATION: 'choix' };

/**
 * Document ReqIF : le document XML (xtLire) et sa présentation, recalculée à la demande après une modification
 * (racine, parId et M sont lus à travers rqActualiser).
 * @param {object} xml document XML
 * @returns {object} document
 */
function rqDocument(xml) {
  xml.largeur = Infinity;                           // les outils ReqIF écrivent les attributs d'un élément sur une ligne
  const r = xml.racine, idents = new Set();
  xtParcourir(r, x => { const id = xtAttr(x, 'IDENTIFIER'); if (id != null) idents.add(id); });
  // Repères fixes du fichier, lus sans recalculer la présentation : préfixe des balises ReqIF, préfixe XHTML, en-tête, contenu
  const pfx = r.attrs.filter(a => /^xmlns:/.test(a.n) && a.v === RQ_NS_XHTML).map(a => a.n.slice(6));
  const doc = { xml, src: xml.src, sale: true, origines: new Map(), historiques: new Map(), crees: new Map(), idents,
    prefixe: r.tag.slice(0, r.tag.length - rqLocal(r.tag).length), prefixeXhtml: pfx.includes('xhtml') ? 'xhtml' : pfx[0] || null,
    entete: rqEnfant(rqEnfant(r, 'THE-HEADER'), 'REQ-IF-HEADER'), contenu: rqEnfant(rqEnfant(r, 'CORE-CONTENT'), 'REQ-IF-CONTENT') };
  for (const k of ['M', 'racine', 'parId', 'clesEnum']) Object.defineProperty(doc, k, { get() { rqActualiser(doc); return doc['_' + k]; }, enumerable: true });
  return doc;
}

/**
 * Recalcule le modèle et la présentation d'un document modifié depuis sa dernière lecture.
 * @param {object} doc document ReqIF
 */
function rqActualiser(doc) {
  if (!doc.sale) return;
  const M = rqModele(doc.xml), p = rqPresenter(M);
  doc.sale = false;
  doc._M = M; doc._racine = p.racine; doc._parId = p.parId; doc._clesEnum = p.clesEnum;
  RQ_CLES_ENUM.cles = p.clesEnum;
}

/* ─────────────────────────────── Modifications du XML (annuler exact) ─────────────────────────────── */

/**
 * État d'origine d'un nœud XML, noté avant sa première modification (attributs bruts, enfants, texte, drapeaux).
 * @param {object} doc @param {object} n nœud XML @returns {object}
 */
function rqOrigine(doc, n) {
  let o = doc.origines.get(n);
  if (!o) { o = { attrs: n.attrs.slice(), enfants: n.enfants.slice(), texte: n.texte, balise: n.balise, structure: n.structure, texteModifie: n.texteModifie }; doc.origines.set(n, o); }
  return o;
}

/**
 * Nœud revenu à son état d'origine : ses attributs bruts et ses drapeaux sont rétablis, il est de nouveau recopié tel quel.
 * @param {object} doc @param {object} n nœud XML
 */
function rqRetablirOrigine(doc, n) {
  const o = doc.origines.get(n);
  if (!o) return;
  if (n.attrs.length === o.attrs.length && n.attrs.every((a, i) => a.n === o.attrs[i].n && a.v === o.attrs[i].v)) { n.attrs = o.attrs.slice(); n.balise = o.balise; }
  if (!n.enfants.length && !o.enfants.length && n.texte == null && o.texte != null && /^\s*$/.test(o.texte)) n.texte = o.texte;
  if (n.enfants.length === o.enfants.length && n.enfants.every((c, i) => c === o.enfants[i]) && n.texte === o.texte) { n.structure = o.structure; n.texteModifie = o.texteModifie; }
}

/**
 * Fixe (ou retire avec null) un attribut XML d'un nœud.
 * @param {object} doc @param {object} n nœud XML @param {string} nom @param {string|null} v
 */
function rqAttrXml(doc, n, nom, v) {
  rqOrigine(doc, n);
  xtDefinirAttr(doc.xml, n, nom, v, RQ_ORDRE_ATTRS);
  rqRetablirOrigine(doc, n);
  doc.sale = true;
}

/**
 * Insère un nœud XML (nouveau, ou retiré auparavant) dans un parent ; un parent qui ne contenait que des blancs les perd.
 * @param {object} doc @param {object} parent @param {object} n @param {number} [index] position (fin par défaut)
 */
function rqInsererXml(doc, parent, n, index) {
  rqOrigine(doc, parent);
  if (parent.texte != null && /^\s*$/.test(parent.texte) && !parent.enfants.length) parent.texte = null;
  xtInserer(doc.xml, parent, n, index);
  rqRetablirOrigine(doc, parent);
  doc.sale = true;
}

/**
 * Retire un nœud XML de son parent (il peut être réinséré à l'identique).
 * @param {object} doc @param {object} n @returns {{parent:object, index:number}} place d'origine
 */
function rqRetirerXml(doc, n) {
  const p = n.parent;
  rqOrigine(doc, p);
  const pos = xtDetacher(doc.xml, n);
  rqRetablirOrigine(doc, p);
  doc.sale = true;
  return pos;
}

/**
 * Fixe le texte d'un élément feuille (TITLE, COMMENT de l'en-tête).
 * @param {object} doc @param {object} n @param {string} t
 */
function rqTexteXml(doc, n, t) {
  rqOrigine(doc, n);
  xtDefinirTexte(doc.xml, n, t);
  rqRetablirOrigine(doc, n);
  doc.sale = true;
}

/**
 * Nouveau nœud XML (balise préfixée comme la racine du fichier), avec ses enfants ou son texte.
 * @param {object} doc @param {string} local nom local @param {Array<[string,string]>} [attrs] @param {object[]} [enfants] @param {string} [texte]
 * @returns {object}
 */
function rqElement(doc, local, attrs, enfants, texte) {
  const n = xtNouveau(doc.prefixe + local, attrs || []);
  for (const c of enfants || []) { c.parent = n; n.enfants.push(c); }
  if (texte != null) n.texte = texte;
  return n;
}

/**
 * Référence ReqIF : <TYPE><SPEC-OBJECT-TYPE-REF>id</SPEC-OBJECT-TYPE-REF></TYPE>.
 * @param {object} doc @param {string} conteneur @param {string} balise @param {string[]} ids @returns {object}
 */
function rqRefXml(doc, conteneur, balise, ids) { return rqElement(doc, conteneur, [], ids.map(id => rqElement(doc, balise, [], [], id))); }

/**
 * Nouvel identifiant ReqIF (« _ » suivi d'un UUID : un xsd:ID valide), absent du fichier.
 * @param {object} doc @returns {string}
 */
function rqNouvelIdent(doc) {
  for (;;) {
    const id = '_' + xtTirerUuid();
    if (!doc.idents.has(id)) { doc.idents.add(id); return id; }
  }
}

/**
 * Conteneur créé par Arcature sous un parent (VALUES, CHILDREN, SPEC-OBJECTS…) : le même nœud est repris d'une fois sur
 * l'autre (annuler puis rétablir écrivent le même texte).
 * @param {object} doc @param {object} parent nœud XML @param {string} local nom local @returns {object}
 */
function rqCree(doc, parent, local) {
  let m = doc.crees.get(parent);
  if (!m) doc.crees.set(parent, m = {});
  return m[local] || (m[local] = rqElement(doc, local));
}

/**
 * Date et heure courantes au format xsd:dateTime, avec le décalage horaire local (LAST-CHANGE).
 * @returns {string}
 */
function rqMaintenant() {
  const d = new Date(), z = -d.getTimezoneOffset(), p = x => String(Math.floor(Math.abs(x))).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    (z ? (z > 0 ? '+' : '-') + p(z / 60) + ':' + p(z % 60) : 'Z');
}

/**
 * Historique d'un emplacement (attribut d'un nœud, valeur d'un attribut d'un élément) : états déjà pris, avec la saisie
 * qui y mène. Retrouver un état noté rend le nœud ou la valeur d'origine exacts (annuler, rétablir).
 * @param {object} doc @param {object} n nœud XML @param {string} cle emplacement @returns {object[]}
 */
function rqHistorique(doc, n, cle) {
  let m = doc.historiques.get(n);
  if (!m) doc.historiques.set(n, m = new Map());
  if (!m.has(cle)) m.set(cle, []);
  return m.get(cle);
}

/**
 * Fixe un attribut XML d'après une saisie : valeur notée pour cette saisie (état déjà pris), sinon convertie.
 * @param {object} doc @param {object} n nœud XML @param {string} nom attribut
 * @param {string|null} saisie @param {function(string):(string|null)} convertir saisie → valeur
 * @param {function(?string):(string|null)} lire valeur → saisie (état courant noté)
 */
function rqFixerAttr(doc, n, nom, saisie, convertir, lire) {
  const h = rqHistorique(doc, n, '@' + nom), actuel = xtAttr(n, nom) ?? null;
  if (saisie === '') saisie = null;                 // valeur vide et attribut absent sont présentés de la même façon
  if (!h.some(e => e.valeur === actuel)) h.push({ saisie: actuel == null ? null : lire(actuel) || null, valeur: actuel });
  let e = h.find(x => x.saisie === saisie);
  if (!e) h.push(e = { saisie, valeur: saisie == null ? null : convertir(saisie) });
  if (e.valeur !== actuel) rqAttrXml(doc, n, nom, e.valeur);
}

/**
 * Conteneur VALUES d'un élément, créé au besoin (après ALTERNATIVE-ID).
 * @param {object} doc @param {object} porteur nœud XML @returns {object}
 */
function rqConteneurValeurs(doc, porteur) {
  let v = rqEnfant(porteur, 'VALUES');
  if (v) return v;
  v = rqCree(doc, porteur, 'VALUES');
  rqInsererXml(doc, porteur, v, rqEnfant(porteur, 'ALTERNATIVE-ID') ? 1 : 0);
  return v;
}

/**
 * Retire un conteneur créé par Arcature resté vide (VALUES, CHILDREN, SPEC-RELATIONS…) ; il est gardé pour être réinséré.
 * @param {object} doc @param {object|null} c conteneur
 */
function rqNettoyer(doc, c) {
  if (c && c.s == null && c.parent && !c.enfants.length) rqRetirerXml(doc, c);
}

/**
 * Nouveau nœud de valeur d'un attribut (ATTRIBUTE-VALUE-…), au format des outils ReqIF.
 * @param {object} doc @param {object} def définition @param {string} saisie valeur
 * @param {string} mode 'attr' (valeur de l'attribut présenté), 'texte' (texte brut) ou 'html' (HTML de l'éditeur de description)
 * @returns {object} nœud XML
 */
function rqNouvelleValeur(doc, def, saisie, mode) {
  const g = def.genre;
  const d = rqRefXml(doc, 'DEFINITION', 'ATTRIBUTE-DEFINITION-' + g + '-REF', [def.id]);
  if (g === 'XHTML') {
    const html = mode === 'html' ? saisie : '<div>' + saisie.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>') + '</div>';
    const tv = rqElement(doc, 'THE-VALUE');
    tv.brutInterieur = rqHtmlVersXhtml(html, doc.prefixeXhtml);
    return rqElement(doc, 'ATTRIBUTE-VALUE-XHTML', [], [d, tv]);
  }
  if (g === 'ENUMERATION') return rqElement(doc, 'ATTRIBUTE-VALUE-ENUMERATION', [], [d, rqRefXml(doc, 'VALUES', 'ENUM-VALUE-REF', saisie.split(/\s+/).filter(Boolean))]);
  return rqElement(doc, 'ATTRIBUTE-VALUE-' + g, [['THE-VALUE', mode === 'html' ? rqXhtmlVersTexte(saisie) : saisie]], [d]);
}

/**
 * Fixe la valeur d'un attribut d'un élément : nœud de valeur remplacé en entier (ou retiré avec null, ou ajouté), à la même
 * place ; un état déjà pris (valeur d'origine…) retrouve son nœud exact.
 * @param {object} doc @param {object} porteur nœud XML (SPEC-OBJECT, SPECIFICATION, SPEC-RELATION) @param {object} def définition
 * @param {string|null} saisie valeur @param {string} mode 'attr', 'texte' ou 'html' (voir rqLireValeur)
 */
function rqFixerValeur(doc, porteur, def, saisie, mode) {
  const L = { xml: doc.xml, valeursEnum: new Map() };
  const h = rqHistorique(doc, porteur, def.id), actuel = rqValeurs(porteur).get(def.id) || null;
  const lire = n => (n ? rqLireValeur(L, n, mode) || null : null);   // valeur vide présentée comme absente
  if (saisie === '') saisie = null;
  if (!h.some(e => e.noeud === actuel && e.mode === mode)) h.push({ saisie: lire(actuel), mode, noeud: actuel });
  let e = h.find(x => x.mode === mode && x.saisie === saisie);
  if (!e) h.push(e = { saisie, mode, noeud: saisie == null ? null : rqNouvelleValeur(doc, def, saisie, mode) });
  if (e.noeud === actuel) return;
  let index = null;
  const V = actuel ? actuel.parent : null;
  if (actuel) { index = V.enfants.indexOf(actuel); actuel.rqIndex = index; rqRetirerXml(doc, actuel); }
  if (e.noeud) {
    const C = V || rqConteneurValeurs(doc, porteur);
    rqInsererXml(doc, C, e.noeud, index ?? e.noeud.rqIndex ?? C.enfants.length);
  } else rqNettoyer(doc, V);
}

/**
 * Fixe un champ texte de l'en-tête (TITLE, COMMENT) d'après une saisie : élément créé au besoin (à sa place dans l'ordre
 * alphabétique des champs, celui du schéma), retiré s'il avait été créé et redevient vide ; un état déjà pris retrouve
 * son texte exact.
 * @param {object} doc @param {string} local nom de l'élément @param {string|null} saisie
 * @param {function(string):string} convertir saisie → texte @param {function(string):string} lire texte → saisie
 */
function rqFixerEntete(doc, local, saisie, convertir, lire) {
  const E = doc.entete;
  if (!E) throw new Error(_L('Ce fichier ReqIF n\'a pas d\'en-tête (REQ-IF-HEADER) : titre et commentaire ne se modifient pas.'));
  const h = rqHistorique(doc, E, 'entete:' + local);
  let c = rqEnfant(E, local);
  const actuel = c ? c.texte : null;
  if (saisie === '') saisie = null;
  if (!h.some(e => e.texte === actuel)) h.push({ saisie: actuel == null ? null : lire(actuel) || null, texte: actuel });
  let e = h.find(x => x.saisie === saisie);
  if (!e) h.push(e = { saisie, texte: saisie == null || saisie === '' ? null : convertir(saisie) });
  if (e.texte === actuel) return;
  if (e.texte == null) { if (c.s == null) rqRetirerXml(doc, c); else rqTexteXml(doc, c, ''); return; }
  if (!c) {
    c = rqCree(doc, E, local);
    c.texte = e.texte; c.texteModifie = true;
    let i = 0;
    while (i < E.enfants.length && rqLocal(E.enfants[i].tag) < local) i++;
    rqInsererXml(doc, E, c, i);
    return;
  }
  rqTexteXml(doc, c, e.texte);
}

/**
 * Modifie un attribut présenté d'un élément ReqIF (nom, description, LONG-NAME, DESC, LAST-CHANGE ou valeur d'un attribut
 * de son type).
 * @param {object} doc document @param {object} el nœud présenté @param {string} n attribut @param {string|null} v valeur
 */
function rqDefinirAttr(doc, el, n, v) {
  const r = el.rq || {}, x = r.xml;
  if (r.genre === 'racine') {
    if (n === 'name') rqFixerEntete(doc, 'TITLE', v, t => t, t => t);
    else if (n === 'description') rqFixerEntete(doc, 'COMMENT', v, rqXhtmlVersTexte, rqTexteVersHtml);
    else throw new Error(_Lp('« {a} » ne se modifie pas ici.', { a: n }));
    return;
  }
  if (!x || r.genre === 'dossier') throw new Error(_Lp('« {a} » ne se modifie pas ici.', { a: n }));
  const brut = s => s, html = s => (s == null ? null : rqTexteVersHtml(s));
  const texte = s => { const t = rqXhtmlVersTexte(s); return t === '' ? null : t; };
  if (n === 'name' || n === 'description') {
    const src = n === 'name' ? r.nom : r.desc;
    if (src.genre === 'valeur') rqFixerValeur(doc, x, src.def, v === '' ? null : v, n === 'name' ? 'texte' : 'html');
    else if (n === 'name') rqFixerAttr(doc, x, src.n, v === '' ? null : v, brut, brut);
    else rqFixerAttr(doc, x, src.n, v === '' ? null : v, texte, html);
    return;
  }
  if (n === 'LONG-NAME' || n === 'DESC' || n === 'LAST-CHANGE') { rqFixerAttr(doc, x, n, v === '' ? null : v, brut, brut); return; }
  const def = r.cles && r.cles.get(n);
  if (!def) throw new Error(_Lp('« {a} » ne se modifie pas ici.', { a: n }));
  rqFixerValeur(doc, x, def, v === '' ? null : v, 'attr');
}

/* ─────────────────────────────── Saisie des attributs ─────────────────────────────── */

/**
 * Attributs simples d'un élément : valeurs des attributs de son type (texte, nombre, booléen, date, valeur énumérée,
 * texte XHTML sans mise en forme), et LONG-NAME / DESC quand ils ne servent pas de nom ou de description.
 * @param {object} doc @param {object} el nœud présenté
 * @returns {Array<{n:string, libelle:string, genre:string, valeur:string, options?:Array, modifiable:boolean, raison?:string}>}
 */
function rqAttributsSimples(doc, el) {
  const r = el.rq || {}, res = [];
  if (!r.cles) return res;
  const M = doc.M;
  for (const [k, d] of r.cles) {
    const v = FMT_REQIF.attr(el, k) ?? '', dt = M.datatypes.get(d.datatype);
    const c = { n: k, libelle: d.nom, genre: RQ_GENRES_SAISIE[d.genre] || 'texte', valeur: v, modifiable: !d.orpheline && d.editable !== false };
    if (d.orpheline) c.raison = _L('Valeur d\'un attribut que le type de l\'élément ne définit pas.');
    else if (d.editable === false) c.raison = _L('Attribut déclaré non modifiable (IS-EDITABLE="false").');
    if (d.genre === 'BOOLEAN') c.valeur = v === 'true' ? 'true' : '';
    if (d.genre === 'DATE') c.libelle = _Lp('{a} (date AAAA-MM-JJ)', { a: d.nom });
    if (d.genre === 'ENUMERATION') {
      c.options = dt ? dt.valeurs.map(e => ({ valeur: e.id, libelle: e.nom || e.id })) : [];
      if (d.multi) { c.genre = 'texte'; c.libelle = _Lp('{a} (valeurs séparées par « ; »)', { a: d.nom }); c.valeur = v.split(/\s+/).filter(Boolean).map(id => { const e = M.valeursEnum.get(id); return e && e.nom || id; }).join('; '); }
    }
    if (d.genre === 'XHTML' && r.valeurs.has(d.id)) {
      const tv = rqEnfant(r.valeurs.get(d.id), 'THE-VALUE');
      if (tv && !rqXhtmlSimple(rqInterieur(M.xml, tv))) { c.modifiable = false; c.raison = _L('Texte mis en forme (XHTML) : il ne se modifie pas comme un texte simple.'); }
    }
    res.push(c);
  }
  if (r.nom && !(r.nom.genre === 'attr' && r.nom.n === 'LONG-NAME')) res.push({ n: 'LONG-NAME', libelle: _L('Nom long (LONG-NAME)'), genre: 'texte', valeur: FMT_REQIF.attr(el, 'LONG-NAME') ?? '', modifiable: true });
  if (r.desc && !(r.desc.genre === 'attr' && r.desc.n === 'DESC')) res.push({ n: 'DESC', libelle: _L('Description courte (DESC)'), genre: 'texte', valeur: FMT_REQIF.attr(el, 'DESC') ?? '', modifiable: true });
  return res;
}

/**
 * Valeur écrite pour une saisie, contrôlée selon le type de données (entier et bornes, réel, date xsd:dateTime, longueur
 * maximale, valeurs énumérées) ; null : valeur retirée.
 * @param {object} el nœud présenté @param {string} n attribut @param {string} saisie
 * @returns {string|null}
 * @throws {Error} saisie invalide
 */
function rqValeurAttribut(el, n, saisie) {
  const r = el.rq || {}, def = r.cles && r.cles.get(n);
  saisie = String(saisie ?? '');
  if (!def) return saisie === '' ? null : saisie;
  const M = r.M, dt = M.datatypes.get(def.datatype), x = dt ? dt.xml : null, s = saisie.trim();
  if (def.genre === 'BOOLEAN') return saisie === 'true' ? 'true' : 'false';
  if (s === '') return null;
  const borne = (val, entier) => {
    const min = x && xtAttr(x, 'MIN'), max = x && xtAttr(x, 'MAX');
    if ((min != null && val < +min) || (max != null && val > +max)) throw new Error(_Lp('« {a} » : {v} hors des bornes [{min} ; {max}].', { a: def.nom, v: s, min: min ?? '−∞', max: max ?? '+∞' }));
    return entier;
  };
  switch (def.genre) {
    case 'INTEGER':
      if (!/^[+-]?\d+$/.test(s)) throw new Error(_Lp('« {a} » attend un nombre entier : « {v} ».', { a: def.nom, v: s }));
      return borne(+s, String(BigInt(s)));
    case 'REAL': {
      const t = s.replace(',', '.');
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) throw new Error(_Lp('« {a} » attend un nombre : « {v} ».', { a: def.nom, v: s }));
      return borne(+t, t);
    }
    case 'DATE': {
      const m = /^(\d{4}-\d\d-\d\d)(T\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)?)?$/.exec(s);
      if (!m) throw new Error(_Lp('« {a} » attend une date AAAA-MM-JJ (ou AAAA-MM-JJThh:mm:ss) : « {v} ».', { a: def.nom, v: s }));
      return m[2] ? (m[3] ? s : s.replace(/(T\d\d:\d\d)/, '$1:00')) : s + 'T00:00:00';
    }
    case 'STRING': {
      const max = x && xtAttr(x, 'MAX-LENGTH');
      if (max != null && saisie.length > +max) throw new Error(_Lp('« {a} » : {n} caractères au plus.', { a: def.nom, n: max }));
      return saisie;
    }
    case 'ENUMERATION': {
      const vals = dt ? dt.valeurs : [];
      if (!def.multi) { if (!vals.some(e => e.id === s)) throw new Error(_Lp('« {a} » : valeur inconnue « {v} ».', { a: def.nom, v: s })); return s; }
      return s.split(/\s*[;\n]\s*/).filter(Boolean).map(nom => {
        const e = vals.find(z => z.nom === nom) || vals.find(z => z.id === nom) || vals.find(z => z.nom.toLowerCase() === nom.toLowerCase());
        if (!e) throw new Error(_Lp('« {a} » : valeur inconnue « {v} » (valeurs : {l}).', { a: def.nom, v: nom, l: vals.map(z => z.nom).join(', ') }));
        return e.id;
      }).join(' ');
    }
    default: return saisie;
  }
}

/* ─────────────────────────────── Création, déplacement, suppression ─────────────────────────────── */

/**
 * Conteneur de REQ-IF-CONTENT (SPEC-OBJECTS, SPECIFICATIONS…), créé au besoin à sa place dans l'ordre du schéma.
 * @param {object} doc @param {string} local @returns {object}
 */
function rqConteneur(doc, local) {
  const C = doc.contenu;
  if (!C) throw new Error(_L('Ce fichier ReqIF n\'a pas de contenu (REQ-IF-CONTENT) : rien ne peut y être créé.'));
  let c = rqEnfant(C, local);
  if (c) return c;
  c = rqCree(doc, C, local);
  const rang = RQ_CONTENEURS.indexOf(local);
  let i = 0;
  while (i < C.enfants.length && RQ_CONTENEURS.indexOf(rqLocal(C.enfants[i].tag)) < rang && RQ_CONTENEURS.indexOf(rqLocal(C.enfants[i].tag)) >= 0) i++;
  rqInsererXml(doc, C, c, i);
  return c;
}

/**
 * Conteneur CHILDREN d'une spécification ou d'une place (SPEC-HIERARCHY), créé au besoin.
 * @param {object} doc @param {object} x nœud XML (SPECIFICATION ou SPEC-HIERARCHY) @returns {object}
 */
function rqConteneurEnfants(doc, x) {
  let c = rqEnfant(x, 'CHILDREN');
  if (c) return c;
  c = rqCree(doc, x, 'CHILDREN');
  rqInsererXml(doc, x, c, rqLocal(x.tag) === 'SPEC-HIERARCHY' ? (rqEnfant(x, 'ALTERNATIVE-ID') ? 1 : 0) : x.enfants.length);
  return c;
}

/**
 * Nœud XML qui reçoit les places des enfants d'un nœud présenté : la spécification, ou la place (SPEC-HIERARCHY) de l'objet.
 * @param {object} p nœud présenté @returns {object|null}
 */
function rqPorteurPlaces(p) {
  const r = p && p.rq || {};
  if (r.nouveau === 'objet') return r.hier;
  if (r.nouveau === 'spec' || r.genre === 'spec') return r.xml;
  return r.hierXml || null;
}

/**
 * Règles de création proposées sous un élément : une exigence (SPEC-OBJECT placé dans la spécification) par type
 * d'objet sous une spécification ou une exigence placée ; une spécification par type de spécification sous le dossier
 * des spécifications.
 * @param {object} doc @param {object} el nœud présenté (ou élément fictif d'une liste collée)
 * @returns {Array<{cle:string, libelle:string, tag:string, type:string}>}
 */
function rqRegles(doc, el) {
  const types = sorte => [...doc.M.types.values()].filter(t => t.sorte === sorte);
  const placable = el.tag === 'Specification' || el.tag === 'SpecHierarchy' || (el.tag === 'SpecObject' && (!el.rq || el.rq.hierXml || el.rq.nouveau));
  if (placable) {
    const t = types('SPEC-OBJECT-TYPE');
    return t.map(x => ({ cle: 'objet:' + x.id, libelle: t.length > 1 ? _Lp('Exigence ({t})', { t: x.nom || x.id }) : _L('Exigence'), tag: 'SpecObject', type: x.id }));
  }
  if (el.tag === 'Specifications') {
    const t = types('SPECIFICATION-TYPE');
    return t.map(x => ({ cle: 'spec:' + x.id, libelle: t.length > 1 ? _Lp('Spécification ({t})', { t: x.nom || x.id }) : _L('Spécification'), tag: 'Specification', type: x.id }));
  }
  return [];
}

/**
 * Nœuds d'une création : objet et sa place (exigence), ou spécification ; le nom est écrit dans ReqIF.Name si le type le
 * définit, sinon dans LONG-NAME.
 * @param {object} doc @param {object} regle règle (rqRegles) @param {string} nom
 * @returns {{noeud:object, part:null}} nœud présenté, porteur des nœuds XML à insérer
 */
function rqNoeuds(doc, regle, nom) {
  const ty = doc.M.types.get(regle.type), t = rqMaintenant(), id = rqNouvelIdent(doc);
  const nomDef = [rqDefNommee(ty, 'ReqIF.Name')].find(d => d && /^(STRING|XHTML)$/.test(d.genre));
  const enfants = nomDef && nom ? [rqElement(doc, 'VALUES', [], [rqNouvelleValeur(doc, nomDef, nom, 'texte')])] : [];
  const attrs = [['IDENTIFIER', id], ['LAST-CHANGE', t], ...(nom && !nomDef ? [['LONG-NAME', nom]] : [])];
  const noeud = { tag: regle.tag, parent: null, enfants: [], prof: 0, attrs: [{ n: 'id', v: id }, { n: 'name', v: nom }], rq: { libelle: nom } };
  if (regle.tag === 'Specification') {
    noeud.rq.nouveau = 'spec';
    noeud.rq.xml = rqElement(doc, 'SPECIFICATION', attrs, [...enfants, rqRefXml(doc, 'TYPE', 'SPECIFICATION-TYPE-REF', [ty.id])]);
  } else {
    noeud.rq.nouveau = 'objet';
    noeud.rq.objet = rqElement(doc, 'SPEC-OBJECT', attrs, [...enfants, rqRefXml(doc, 'TYPE', 'SPEC-OBJECT-TYPE-REF', [ty.id])]);
    noeud.rq.hier = rqElement(doc, 'SPEC-HIERARCHY', [['IDENTIFIER', rqNouvelIdent(doc)], ['LAST-CHANGE', t]], [rqRefXml(doc, 'OBJECT', 'SPEC-OBJECT-REF', [id])]);
  }
  return { noeud, part: null };
}

/**
 * Insère les nœuds XML d'un nœud présenté : création (objet et sa place, spécification, relation), suppression annulée
 * (plan défait), ou place déplacée sous un autre parent.
 * @param {object} doc @param {object} parent nœud présenté parent @param {object} noeud nœud présenté @param {number} index rang parmi les enfants
 */
function rqInserer(doc, parent, noeud, index) {
  const r = noeud.rq || {};
  if (r.plan) { rqDefairePlan(doc, r.plan); return; }
  if (r.nouveau === 'objet') {
    rqInsererXml(doc, rqConteneur(doc, 'SPEC-OBJECTS'), r.objet);
    const p = rqPorteurPlaces(parent);
    if (!p) throw new Error(_L('Une exigence se crée sous une spécification ou sous une exigence placée.'));
    const C = rqConteneurEnfants(doc, p);              // place choisie (indexPres : après une exigence), sinon à la fin
    rqInsererXml(doc, C, r.hier, Math.min(index ?? C.enfants.length, C.enfants.length));
    return;
  }
  if (r.nouveau === 'spec') { rqInsererXml(doc, rqConteneur(doc, 'SPECIFICATIONS'), r.xml); return; }
  if (r.nouveau === 'relation') { rqInsererXml(doc, rqConteneur(doc, 'SPEC-RELATIONS'), r.xml); return; }
  if (r.hierXml) {                                    // déplacement : la place rejoint le nouveau parent
    const p = rqPorteurPlaces(parent);
    if (!p) throw new Error(_L('Une exigence se place sous une spécification ou sous une autre exigence placée.'));
    const C = rqConteneurEnfants(doc, p);
    rqInsererXml(doc, C, r.hierXml, Math.min(index ?? C.enfants.length, C.enfants.length));
    return;
  }
  throw new Error(_L('Insertion impossible ici (format ReqIF).'));
}

/**
 * Retire les nœuds XML d'un nœud présenté : création annulée, suppression (plan exécuté) ou place déplacée.
 * @param {object} doc @param {object} noeud nœud présenté
 */
function rqSupprimer(doc, noeud) {
  const r = noeud.rq || {};
  if (r.plan) { rqExecuterPlan(doc, r.plan); return; }
  if (r.nouveau === 'objet') {
    const c1 = r.hier.parent, c2 = r.objet.parent;
    rqRetirerXml(doc, r.hier); rqRetirerXml(doc, r.objet);
    rqNettoyer(doc, c1); rqNettoyer(doc, c2);
    return;
  }
  if (r.nouveau) { const c = r.xml.parent; rqRetirerXml(doc, r.xml); rqNettoyer(doc, c); return; }
  if (r.hierXml) { const c = r.hierXml.parent; rqRetirerXml(doc, r.hierXml); rqNettoyer(doc, c); return; }
  throw new Error(_L('Retrait impossible ici (format ReqIF).'));
}

/**
 * Exécute un plan de suppression : nœuds XML retirés dans l'ordre, places notées pour les réinsérer.
 * @param {object} doc @param {{noeuds:object[], faits:Array}} plan
 */
function rqExecuterPlan(doc, plan) {
  plan.faits = [];
  for (const x of plan.noeuds) {
    const p = x.parent;
    if (!p) continue;
    const i = p.enfants.indexOf(x);
    rqRetirerXml(doc, x);
    plan.faits.push([x, p, i]);
  }
}

/**
 * Défait un plan de suppression : nœuds réinsérés à leur place, en ordre inverse.
 * @param {object} doc @param {{faits:Array}} plan
 */
function rqDefairePlan(doc, plan) {
  for (const [x, p, i] of (plan.faits || []).slice().reverse()) rqInsererXml(doc, p, x, i);
  plan.faits = [];
}

/**
 * Plan de suppression d'éléments présentés : une exigence emporte sa place et ses sous-exigences (un objet n'est retiré
 * que si plus aucune place ne le cite), une spécification sa hiérarchie ; les relations d'un objet retiré, les citations
 * d'une relation retirée dans les groupes et les groupes d'une spécification retirée suivent. Un type, une définition,
 * un type de données ou une valeur énumérée encore utilisés ne se suppriment pas.
 * @param {object} doc @param {object[]} selection nœuds présentés
 * @returns {object} plan au format du contrat (preparerSuppression)
 */
function rqPreparerSuppression(doc, selection) {
  const M = doc.M, retirer = new Set(), blocages = [], candidats = new Set();
  const nom = n => '« ' + FMT_REQIF.libelle(n) + ' »';
  const sousArbre = (x, f) => xtParcourir(x, f);
  const placesRetirees = new Set();
  const retirerPlace = hx => { retirer.add(hx); sousArbre(hx, y => { if (rqLocal(y.tag) === 'SPEC-HIERARCHY') { placesRetirees.add(y); const o = rqRef(y, 'OBJECT'); if (o) candidats.add(o); } }); };
  // Identifiants cités par le contenu (hors sous-arbre retiré) : types et valeurs encore utilisés
  const cites = exclu => {
    const ids = new Map();
    if (M.contenu) xtParcourir(M.contenu, y => {
      if (/-REF$/.test(rqLocal(y.tag)) && y.texte != null) { let dans = false; for (let p = y; p; p = p.parent) if (p === exclu) { dans = true; break; } if (!dans) ids.set(y.texte.trim(), (ids.get(y.texte.trim()) || 0) + 1); }
    });
    return ids;
  };
  for (const s of selection) {
    const r = s.rq || {};
    if (!r.xml || r.genre === 'dossier' || r.genre === 'racine') { blocages.push(_Lp('{e} ne se supprime pas : partie du fichier ReqIF.', { e: nom(s) })); continue; }
    if (r.genre === 'spec') { retirer.add(r.xml); for (const h of rqEnfants(rqEnfant(r.xml, 'CHILDREN'), 'SPEC-HIERARCHY')) retirerPlace(h); continue; }
    if (r.genre === 'objet') { if (r.hierXml) retirerPlace(r.hierXml); else { retirer.add(r.xml); candidats.add(r.objet.id); } continue; }
    if (r.genre === 'occurrence') { retirerPlace(r.hierXml); continue; }
    if (r.genre === 'relation' || r.genre === 'groupe') { retirer.add(r.xml); continue; }
    // Types, définitions, types de données, valeurs énumérées : refusés s'ils sont encore cités ailleurs
    const ids = new Set();
    sousArbre(r.xml, y => { const id = xtAttr(y, 'IDENTIFIER'); if (id) ids.add(id); });
    const c = cites(r.xml), n = [...ids].reduce((t, id) => t + (c.get(id) || 0), 0);
    if (n) blocages.push(_Lp('{e} est encore utilisé ({n} référence(s)) : retirez d\'abord ses usages.', { e: nom(s), n }));
    else retirer.add(r.xml);
  }
  // Objets dont plus aucune place ne reste
  const objetsRetires = new Set();
  for (const id of candidats) {
    const o = M.objets.get(id);
    if (!o) continue;
    const restantes = [...M.hierarchies.values()].filter(h => h.objet === id && !placesRetirees.has(h.xml));
    if (!restantes.length) { retirer.add(o.xml); objetsRetires.add(id); }
  }
  // Relations des objets retirés, citations des relations retirées, groupes des spécifications retirées
  const relRetirees = new Set();
  for (const rel of M.relations) if (retirer.has(rel.xml) || objetsRetires.has(rel.source) || objetsRetires.has(rel.cible)) { retirer.add(rel.xml); relRetirees.add(rel.id); }
  const specsRetirees = new Set(M.specs.filter(sp => retirer.has(sp.xml)).map(sp => sp.id));
  for (const g of M.groupes) {
    if (retirer.has(g.xml)) continue;
    if (specsRetirees.has(g.sourceSpec) || specsRetirees.has(g.cibleSpec)) { retirer.add(g.xml); continue; }
    for (const ref of rqEnfants(rqEnfant(g.xml, 'SPEC-RELATIONS'), 'SPEC-RELATION-REF')) if (ref.texte != null && relRetirees.has(ref.texte.trim())) retirer.add(ref);
  }
  // Nœuds XML retirés (sans ceux qu'emporte déjà un ancêtre retiré), éléments présentés touchés
  const dansRetire = x => { for (let p = x; p; p = p.parent) if (retirer.has(p)) return true; return false; };
  const noeuds = [...retirer].filter(x => { for (let p = x.parent; p; p = p.parent) if (retirer.has(p)) return false; return true; });
  const elements = [...doc.parId.values()].filter(n => n.rq && n.rq.genre !== 'dossier' && n.rq.genre !== 'racine' && (dansRetire(n.rq.xml) || (n.rq.hierXml && dansRetire(n.rq.hierXml))));
  const choisis = new Set(selection);
  const racines = selection.filter(s => { for (let p = s.parent; p; p = p.parent) if (choisis.has(p)) return false; return true; })
    .map((s, i) => ({ tag: s.tag, parent: s.parent, enfants: [], prof: s.prof, attrs: s.attrs, rq: { plan: i === 0 ? { noeuds, faits: [] } : { noeuds: [], faits: [] }, libelle: FMT_REQIF.libelle(s) } }));
  const nO = elements.filter(n => n.tag === 'SpecObject').length, nR = relRetirees.size;
  return { elements, racines, changements: [], blocages, opsFormat: [], avertissement: null,
    details: [_Lp('{o} exigence(s) et {r} relation(s) supprimée(s).', { o: nO, r: nR })] };
}

/**
 * Raison pour laquelle un élément ne peut pas être déplacé sous une cible, ou null : seule une exigence placée (ou une
 * autre place d'un objet) se déplace, sous une spécification ou une exigence placée, hors de sa propre descendance.
 * @param {object} doc @param {object} el @param {object} cible @returns {string|null}
 */
function rqRaisonDeplacement(doc, el, cible) {
  if (!el.rq || !el.rq.hierXml) return _L('Seule une exigence placée dans une spécification se déplace.');
  if (!rqPorteurPlaces(cible)) return _L('Une exigence se place sous une spécification ou sous une autre exigence placée.');
  for (let p = cible; p; p = p.parent) if (p === el) return _L('Une exigence ne se place pas dans sa propre descendance.');
  if (el.parent === cible) return _L('L\'exigence est déjà à cet endroit.');
  return null;
}

/* ─────────────────────────────── Adaptateur ─────────────────────────────── */

/** Adaptateur du format ReqIF (.reqif) : lecture, modification sans perte, exigences, relations. */
const FMT_REQIF = {
  cle: 'reqif',
  nom: 'ReqIF',
  fichiers: { description: _L('Exigences ReqIF'), mime: 'application/xml', extensions: ['.reqif'], dossier: ['.reqif'], parDefaut: 'exigences.reqif' },
  capacites: { modifier: true, creer: true, diagnostic: false, relecture: true },
  /** Pas de diagrammes en ReqIF. */
  diagrammes: null,
  /** Champs du formulaire de détail (pas de résumé en ReqIF). */
  champs: ['name', 'description'],
  couches: Object.entries(RQ_PARTIES).map(([k, l]) => [k, l]),
  titreCouches: _L('Partie du fichier ReqIF'),

  /** @param {string} nom @returns {boolean} vrai pour un fichier .reqif */
  reconnait(nom) { return /\.reqif$/i.test(nom || ''); },
  /**
   * Lit le texte : XML lu sans perte, puis modèle ReqIF et présentation.
   * @param {string} texte contenu @returns {object} document
   */
  lire(texte) {
    const doc = rqDocument(xtLire(texte));
    rqActualiser(doc);
    return doc;
  },
  /** Texte à écrire : recopie de ce qui n'a pas changé. @param {object} doc @returns {string} */
  ecrire(doc) { return xtEcrire(doc.xml); },
  /**
   * Contrôle avant écriture : le texte se relit comme un fichier ReqIF et retrouve tous les éléments.
   * @param {object} doc @param {string} texte @returns {string|null} message, ou null
   */
  controler(doc, texte) {
    const cles = RQ_CLES_ENUM.cles;
    try {
      const relu = FMT_REQIF.lire(texte);
      if (relu.parId.size !== doc.parId.size) return _Lp('Contrôle avant écriture : {a} éléments relus au lieu de {b}. Enregistrement annulé.', { a: relu.parId.size, b: doc.parId.size });
      for (const id of doc.parId.keys()) if (!relu.parId.has(id)) return _Lp('Contrôle avant écriture : élément {id} absent à la relecture. Enregistrement annulé.', { id });
      return null;
    } finally { RQ_CLES_ENUM.cles = cles; }
  },
  /**
   * Indique si un champ du formulaire se modifie : nom et description des éléments du fichier (titre et commentaire de
   * l'en-tête pour la racine), sauf attribut déclaré non modifiable.
   * @param {object} el @param {string} champ @returns {boolean}
   */
  modifiable(el, champ) {
    const r = el.rq || {};
    if (champ !== 'name' && champ !== 'description') return false;
    if (r.genre === 'racine') return !!r.xml;
    if (!r.xml || r.genre === 'dossier') return false;
    const src = champ === 'name' ? r.nom : r.desc;
    return !!src && (src.genre !== 'valeur' || src.def.editable !== false);
  },

  /** @param {object} el @returns {string|undefined} identifiant ReqIF (IDENTIFIER), ou repère d'une partie du fichier */
  id(el) { return el.attrs.length && el.attrs[0].n === 'id' ? el.attrs[0].v : undefined; },
  /** @param {object} el @returns {string} métaclasse ReqIF (SpecObject, Specification…) */
  type(el) { return el.tag; },
  /** @param {object} el @returns {string} nom, sinon début du texte, sinon métaclasse entre chevrons */
  libelle(el) { return (el.rq && el.rq.libelle) || FMT_REQIF.attr(el, 'name') || '‹' + el.tag + '›'; },
  /** @param {object} el @returns {string} partie du fichier (SPEC, REL, TYPE), '' pour la racine */
  couche(el) {
    if (!el.parent) return '';
    if (/^(Specifications?|SpecObjects?|SpecHierarchy)$/.test(el.tag)) return 'SPEC';
    if (/^(SpecRelations?|RelationGroup|SpecRelationGroups)$/.test(el.tag)) return 'REL';
    return 'TYPE';
  },
  /** @param {object} el @returns {object[]} ancêtres, racine exclue */
  chemin(el) { const ch = []; for (let p = el.parent; p && p.parent; p = p.parent) ch.unshift(p); return ch; },
  /** @param {object} el @returns {string|null} racine et parties du fichier protégées */
  ossature(el) {
    const g = el.rq && el.rq.genre;
    return g === 'racine' ? _L('en-tête du fichier ReqIF') : g === 'dossier' ? _L('partie du fichier ReqIF') : null;
  },
  /** @returns {boolean} aucun élément technique masqué */
  technique() { return false; },
  /** @param {object} el @returns {string} lettres de l'icône (§ : titre de chapitre) */
  icone(el) {
    if (el.tag === 'SpecObject' && el.rq && el.rq.titre) return '§';
    return RQ_ICONES[el.tag] || (/^AttributeDefinition/.test(el.tag) ? 'A' : /^DatatypeDefinition/.test(el.tag) ? 'D' : el.tag[0]);
  },
  /** Icône dessinée : aucune (initiales seules). @returns {string} */
  iconeSvg() { return ''; },
  /** @param {object} el @param {string} n @returns {string|undefined} valeur de l'attribut présenté */
  attr(el, n) { const a = el.attrs.find(x => x.n === n); return a ? a.v : undefined; },
  /** Parcours en profondeur. @param {object} racine @param {function(object)} f */
  parcourir(racine, f) { const pile = [racine]; while (pile.length) { const n = pile.pop(); f(n); for (let i = n.enfants.length - 1; i >= 0; i--) pile.push(n.enfants[i]); } },
  /**
   * Informations générales : version de ReqIF, titre, outil source.
   * @param {object} doc @returns {{version:string, nom:string, approche:string}}
   */
  infos(doc) {
    const E = doc.entete, champ = n => { const c = rqEnfant(E, n); return c && c.texte ? c.texte.trim() : ''; };
    const outil = champ('SOURCE-TOOL-ID') || champ('REQ-IF-TOOL-ID');
    return { version: champ('REQ-IF-VERSION'), nom: champ('TITLE'), approche: outil ? _Lp('produit par {o}', { o: outil }) : '' };
  },

  /** @param {object} doc @returns {object} liaisons ReqIF (références, relations) */
  liaisons(doc) { return rqLiaisons(doc); },
  /**
   * Relations d'un élément groupées par type de relation et par sens.
   * @param {object} index résultat de rqLiaisons @param {object} el @returns {object[]}
   */
  groupes(index, el) {
    const g = new Map(), M = index.doc.M;
    for (const l of index.metier.get(el) || []) {
      const k = l.rel + '|' + l.sens;
      if (!g.has(k)) {
        const t = M.types.get(l.rel.slice(4)), nom = t ? t.nom || t.id : l.rel.slice(4) || '?';
        g.set(k, { rel: l.rel, sens: l.sens, libelle: l.sens === 'sortant' ? _Lp('Relation « {t} » vers', { t: nom }) : _Lp('Relation « {t} » depuis', { t: nom }), liens: [] });
      }
      g.get(k).liens.push(l);
    }
    return [...g.values()].sort((a, b) => a.libelle.localeCompare(b.libelle) || (a.sens === 'sortant' ? -1 : 1));
  },
  /** @param {string} nom @param {string} v @returns {string[]|null} */
  estReference(nom, v) { return rqEstReference(nom, v); },

  /** Modifie un attribut présenté (nom, description, valeurs…). @param {object} doc @param {object} el @param {string} n @param {string|null} v */
  definirAttr(doc, el, n, v) { return rqDefinirAttr(doc, el, n, v); },
  /** Insère (création, suppression annulée, déplacement). @param {object} doc @param {object} parent @param {object} noeud @param {number} index */
  inserer(doc, parent, noeud, index) { return rqInserer(doc, parent, noeud, index); },
  /** Retire (création annulée, suppression, déplacement). @param {object} doc @param {object} noeud */
  supprimer(doc, noeud) { return rqSupprimer(doc, noeud); },
  /** Rien à indexer : la présentation est recalculée. */
  indexerSousArbre() {},
  /**
   * Fin de la liste des places (index dans CHILDREN, comme indexPres), lue dans le XML : la présentation d'un parent peut
   * dater d'avant une création précédente (recalculée à la demande), et des exigences créées à la suite s'inverseraient.
   * @param {object} doc @param {object} parent @returns {number}
   */
  indexInsertion(doc, parent) {
    const p = rqPorteurPlaces(parent), c = p && rqEnfant(p, 'CHILDREN');
    return p ? (c ? c.enfants.length : 0) : parent.enfants.length;
  },
  /**
   * Place d'une exigence juste avant ou après une autre place de la même spécification (ou de la même exigence) : index dans
   * CHILDREN, que reçoit inserer.
   * @param {object} doc @param {object} parent @param {string} tag @param {object} voisin @param {boolean} avant
   * @returns {number|null}
   */
  indexPres(doc, parent, tag, voisin, avant) {
    const p = rqPorteurPlaces(parent), r = (voisin && voisin.rq) || {}, h = r.nouveau === 'objet' ? r.hier : r.hierXml;
    const c = p && rqEnfant(p, 'CHILDREN'), i = c && h ? c.enfants.indexOf(h) : -1;
    return i < 0 ? null : avant ? i : i + 1;
  },
  /**
   * Règle d'une exigence de même type que l'élément (type d'objet de sa place), pour un frère créé à la suite.
   * @param {object} doc @param {object} el @param {object[]} regles @returns {object|null}
   */
  regleDe(doc, el, regles) {
    const r = el.rq || {}, h = r.hier && !r.objet ? doc.M.objets.get(r.hier.objet) : null, type = r.type || (h && h.type);
    return regles.find(x => (x.tag === el.tag || (el.tag === 'SpecHierarchy' && x.tag === 'SpecObject')) && x.type === type) ||
      regles.find(x => x.tag === el.tag) || null;
  },
  /**
   * Changement entraîné par toute modification d'un élément : sa date LAST-CHANGE (exigée par ReqIF pour suivre les échanges).
   * @param {object} el @param {Array<{n:string}>} changements
   * @returns {Array<{n:string, avant:(string|null), apres:string}>}
   */
  liesAuxChangements(el, changements) {
    const r = el.rq || {};
    if (!r.xml || r.genre === 'racine' || r.genre === 'dossier' || changements.some(c => c.n === 'LAST-CHANGE')) return [];
    return [{ n: 'LAST-CHANGE', avant: xtAttr(r.xml, 'LAST-CHANGE') ?? null, apres: rqMaintenant() }];
  },
  /** @param {object} doc @param {object} el @returns {object[]} attributs simples (rqAttributsSimples) */
  attributsSimples(doc, el) { return rqAttributsSimples(doc, el); },
  /** @param {object} el @param {string} n @param {string} saisie @returns {string|null} valeur contrôlée (rqValeurAttribut) */
  valeurAttribut(el, n, saisie) { return rqValeurAttribut(el, n, saisie); },
  /**
   * Relations qu'on peut tracer depuis une exigence : une par type de relation (SPEC-RELATION-TYPE).
   * @param {object} doc @param {object} el @returns {Array<{cle:string, libelle:string}>}
   */
  liensDepuis(doc, el) {
    if (el.tag !== 'SpecObject' || !el.rq || !el.rq.objet) return [];
    return [...doc.M.types.values()].filter(t => t.sorte === 'SPEC-RELATION-TYPE').map(t => ({ cle: 'rel:' + t.id, libelle: _Lp('Relation « {t} »', { t: t.nom || t.id }) }));
  },
  /** @param {object} doc @param {object} el @returns {object[]} exigences du fichier, sauf l'élément */
  ciblesLien(doc, el) { return [...doc.parId.values()].filter(n => n.tag === 'SpecObject' && n.rq && n.rq.objet && n !== el); },
  /**
   * Nouvelle relation (SPEC-RELATION) de l'élément vers une cible, dans SPEC-RELATIONS (créé au besoin).
   * @param {object} doc @param {object} el source @param {string} cle type (liensDepuis) @param {object} cible
   * @returns {{conteneur:object, etapes:Array, crees:object[]}}
   */
  preparerLien(doc, el, cle, cible) {
    const ty = doc.M.types.get(cle.slice(4));
    if (!ty || !el.rq || !el.rq.objet || !cible || !cible.rq || !cible.rq.objet) throw new Error(_L('Relation impossible : source et cible doivent être des exigences.'));
    const id = rqNouvelIdent(doc), libelle = FMT_REQIF.libelle(el) + ' → ' + FMT_REQIF.libelle(cible);
    const xml = rqElement(doc, 'SPEC-RELATION', [['IDENTIFIER', id], ['LAST-CHANGE', rqMaintenant()]], [
      rqRefXml(doc, 'SOURCE', 'SPEC-OBJECT-REF', [el.rq.objet.id]), rqRefXml(doc, 'TARGET', 'SPEC-OBJECT-REF', [cible.rq.objet.id]),
      rqRefXml(doc, 'TYPE', 'SPEC-RELATION-TYPE-REF', [ty.id])]);
    const noeud = { tag: 'SpecRelation', parent: null, enfants: [], prof: 0, attrs: [{ n: 'id', v: id }], rq: { nouveau: 'relation', xml, libelle } };
    const conteneur = doc.parId.get('§relations') || doc.racine;
    return { conteneur, etapes: [{ noeud, parent: conteneur, tag: 'SpecRelation', index: conteneur.enfants.length }], crees: [noeud] };
  },
  /** Aucun champ de relations dans le détail : les relations se tracent depuis le menu. @returns {Array} */
  relations() { return []; },
  /** @returns {Array} aucun candidat */
  candidatsRelation() { return []; },
  /** Sans objet. */
  preparerRelation() { throw new Error(_L('Format ReqIF : aucun champ de relations.')); },
  /** @param {object} doc @param {object} el @param {object} cible @returns {string|null} raison du refus (rqRaisonDeplacement) */
  raisonDeplacement(doc, el, cible) { return rqRaisonDeplacement(doc, el, cible); },
  /** @param {object} doc @param {object} el @param {object} cible @returns {Array} la place de l'exigence rejoint la cible */
  preparerDeplacement(doc, el, cible) {
    const r = rqRaisonDeplacement(doc, el, cible);
    if (r) throw new Error(r);
    return [{ noeud: el, parent: cible, tag: el.tag }];
  },
  /** @param {object} doc @param {object[]} selection @returns {object} plan de suppression (rqPreparerSuppression) */
  preparerSuppression(doc, selection) { return rqPreparerSuppression(doc, selection); },
  /** Aucune transition entre niveaux. @returns {Array} */
  transitions() { return []; },
  /** Sans objet. */
  preparerTransition() { throw new Error(_L('Format ReqIF : aucune transition.')); },
  /** Aucun changement entraîné par une création. @returns {Array} */
  liesALaCreation() { return []; },

  /** @param {object} doc @param {object} el @returns {object[]} règles de création (rqRegles) */
  regles(doc, el) { return rqRegles(doc, el); },
  /** @returns {Array} aucun autre type proposé */
  menu() { return []; },
  /** @param {object} regle @param {string} nom @returns {{noeud:object, part:null}} nœuds à insérer (rqNoeuds) */
  noeuds(regle, nom) { return rqNoeuds(ARC.doc, regle, nom); },
  /** @returns {string} sans objet */
  balisePart() { return ''; },
  /**
   * Nom par défaut d'un nouvel élément (« Exigence 12 », « Spécification 2 »).
   * @param {object} parent @param {object} regle @returns {string}
   */
  nomDefaut(parent, regle) {
    const M = ARC.doc.M;
    return regle.tag === 'Specification' ? _Lp('Spécification {n}', { n: M.specs.length + 1 }) : _Lp('Exigence {n}', { n: M.objets.size + 1 });
  },
  /** Nœud détaché minimal (élément fictif). @param {string} tag @param {Array} attrs @returns {object} */
  nouveau(tag, attrs) { return { tag, parent: null, enfants: [], prof: 0, attrs: (attrs || []).map(([n, v]) => ({ n, v })) }; },
  /**
   * Découpe une liste collée en lignes avec leur niveau (indentation : tabulation ou 2 espaces ; colonnes d'Excel).
   * @param {string} texte @returns {Array<{nom:string, niveau:number}>}
   */
  decouperListe(texte) {
    const res = [];
    for (const ligne of String(texte || '').split(/\r?\n/)) {
      if (!ligne.trim()) continue;
      let nom, niveau;
      if (ligne.replace(/^\t+/, '').includes('\t')) { const cel = ligne.split('\t'); niveau = cel.findIndex(c => c.trim()); nom = cel[niveau].trim(); }
      else { const m = /^([\t ]*)(.*)$/.exec(ligne); niveau = (m[1].match(/\t/g) || []).length + Math.floor(m[1].replace(/\t/g, '').length / 2); nom = m[2].replace(/^[-*•·]\s+/, '').trim(); }
      if (!nom) continue;
      const prec = res.length ? res[res.length - 1].niveau : -1;
      res.push({ nom, niveau: Math.min(niveau, prec + 1) });
    }
    return res;
  }
};

FORMATS.push(FMT_REQIF);

/* ── src/lecteur-reqif/socle-fin.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   LECTEUR ReqIF — API (après les modules de lecture)
   ───────────────────────────────────────────────────────────────────────
   ArcatureLecteurReqif : lecteur autonome d'exigences ReqIF (.reqif, archive .reqifz avec ses pièces jointes, fichiers
   d'un dossier), en lecture seule, pour une application hôte (Arcalyse). Reprend tels quels le cœur XML (10), le
   registre des formats (28), les archives zip (32) et le format ReqIF d'Arcature (reqif/10, reqif/30) ; ajoute ici les
   pièces jointes (images des valeurs XHTML), le plan de chaque spécification, les diagnostics de la lecture et des
   icônes. Assemblé par « node build.js --lecteur-reqif » en un seul fichier JS sans dépendance (page, worker, Node.js).
     lire(contenu, nom)            → Promise<lecture> : texte d'un .reqif, octets d'un .reqif ou d'un .reqifz
     lireTexte(texte, nom)         → lecture (synchrone)
     lireArchive(octets, nom)      → Promise<lecture> : tous les .reqif de l'archive et ses pièces jointes
     lireFichiers(fichiers, nom)   → Promise<lecture> : [{ chemin, texte | octets }] d'un dossier (.reqif et pièces jointes)
     reconnait(nom)  binaire(nom)  familles  regles()  icone(typeOuElement, taille)  iconeType(type, taille)  libelleRelation(rel, sens)
   Une lecture expose des éléments en objets simples (sérialisables, désignés par leur identifiant) :
     elements()  element(id)  racine  enfants(id)  proprietaire(id)  descendants(id)  arbre([id])  json()
     diagnostics  erreurs  avertissements  documents  fichiers  image(chemin)  html(id, options)  valeurHtml(id, cle, options)
     attributs(id)  liaisons(id)  toutesLiaisons()  references(id)  extrait(id)  texte(chemin)
     specifications()  plan(idSpecification)  types()  vues()  vuesPour(id)  vue(cle)   (pas de diagrammes en ReqIF : listes vides)
     document  noeud(id)                                   → objets internes d'Arcature
   Contrat : docs/api/lecteur-reqif.d.ts ; mode d'emploi : docs/LECTEUR-REQIF.md.
   ═══════════════════════════════════════════════════════════════════════ */

/** Extensions des images que montre un navigateur (les autres pièces jointes sont citées par leur nom). */
const LRQ_IMAGES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' };

/** Familles des éléments : parties du fichier ReqIF. */
const LRQ_FAMILLES = Object.assign({}, RQ_PARTIES);

/** Règles des diagnostics de la lecture : code, sévérité, intitulé. */
const LRQ_REGLES = [
  { id: 'RQ-REF', severite: 'erreur', nom: _L('Référence vers un identifiant introuvable') },
  { id: 'RQ-ID', severite: 'erreur', nom: _L('Identifiant en double') },
  { id: 'RQ-TYPE', severite: 'avertissement', nom: _L('Valeur d\'un attribut que le type de l\'élément ne définit pas') },
  { id: 'RQ-HORS-SPEC', severite: 'avertissement', nom: _L('Objet présent dans aucune spécification') },
  { id: 'RQ-PIECE', severite: 'avertissement', nom: _L('Pièce jointe citée absente') }
];

/** Genres de présentation (rqPresenter) exposés comme techniques : définitions, types de données, valeurs énumérées. */
const LRQ_TECHNIQUES = new Set(['definition', 'datatype', 'enum']);

/**
 * Chemin normalisé d'une pièce jointe citée par une valeur XHTML (« data » d'un object) : séparateurs « / », « ./ » retiré,
 * caractères encodés décodés.
 * @param {string} c chemin écrit @returns {string}
 */
function lrqChemin(c) {
  let s = String(c || '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^file:\/+/i, '');
  try { s = decodeURIComponent(s); } catch (e) { /* chemin laissé tel quel */ }
  return s;
}

/**
 * Type MIME d'une image d'après son nom ou le type déclaré, ou '' si le navigateur ne sait pas la montrer.
 * @param {string} chemin @param {string} [type] type déclaré (attribut type de l'object) @returns {string}
 */
function lrqTypeImage(chemin, type) {
  const t = String(type || '').toLowerCase();
  if (/^image\/(png|jpeg|gif|svg\+xml|webp|bmp)$/.test(t)) return t;
  const ext = (/\.(\w+)(?:[?#].*)?$/.exec(chemin) || [])[1];
  return ext ? LRQ_IMAGES[ext.toLowerCase()] || '' : '';
}

/**
 * Base 64 d'octets.
 * @param {Uint8Array} o @returns {string}
 */
function lrqBase64(o) {
  if (typeof btoa !== 'function') return Buffer.from(o).toString('base64');
  let s = '';
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Échappe un texte pour un attribut HTML.
 * @param {string} s @returns {string}
 */
function lrqEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

/**
 * Attributs d'une balise HTML (nom en minuscules → valeur décodée).
 * @param {string} a texte des attributs @returns {Object<string,string>}
 */
function lrqAttrs(a) {
  const r = {};
  for (const m of String(a || '').matchAll(/([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) r[m[1].toLowerCase()] = rqDecoderEntites(m[3] ?? m[4] ?? m[5] ?? '');
  return r;
}

/**
 * Pièces jointes citées par un HTML (object data, img src), dans l'ordre.
 * @param {string} html @returns {string[]} chemins normalisés
 */
function lrqCitees(html) {
  const out = [];
  for (const m of String(html || '').matchAll(/<(object|img)\b([^>]*)>/gi)) {
    const a = lrqAttrs(m[2]), c = m[1].toLowerCase() === 'img' ? a.src : a.data;
    if (c && !/^data:/i.test(c)) out.push(lrqChemin(c));
  }
  return out;
}

/**
 * Remplace les pièces jointes d'un HTML (valeur XHTML convertie) : une image devient une balise img, une autre pièce jointe
 * (objet OLE…) son image de repli si elle en a une, sinon son nom ; une pièce absente est signalée par son nom. Les objets
 * imbriqués (objet OLE et son image de repli, comme les écrit DOORS) sont traités du plus profond au plus haut.
 * @param {string} html HTML (rqXhtmlVersHtml)
 * @param {function(string):(object|null)} trouver pièce jointe d'un chemin cité ({ chemin, type, image, dataUri() }), ou null
 * @param {string} mode « data » (img src = data URI), « marque » (img data-reqif = chemin, sans src : l'hôte la résout) ou « nom » (nom seul)
 * @returns {string} HTML
 */
function lrqHtmlPieces(html, trouver, mode) {
  const IMG = '\u0001img\u0001';                       // repère d'une image déjà produite (repli d'un objet englobant)
  const nomDe = c => c.split('/').pop() || c;
  const rendre = (c, typeDeclare) => {
    const p = trouver(c), nom = nomDe(c);
    const typeImg = lrqTypeImage(p ? p.chemin : c, typeDeclare);
    if (p && typeImg && mode === 'data') return `<img ${IMG} src="${p.dataUri()}" alt="${lrqEsc(nom)}" data-reqif="${lrqEsc(p.chemin)}">`;
    if (p && typeImg && mode === 'marque') return `<img ${IMG} data-reqif="${lrqEsc(p.chemin)}" alt="${lrqEsc(nom)}">`;
    if (typeImg) return `<span class="rq-piece${p ? '' : ' rq-absente'}" data-reqif-piece="${lrqEsc(c)}">🖼 ${lrqEsc(nom)}</span>`;
    return `<span class="rq-piece${p ? '' : ' rq-absente'}" data-reqif-piece="${lrqEsc(c)}">📎 ${lrqEsc(nom)}</span>`;
  };
  let h = String(html || '');
  // Objets les plus profonds d'abord : <object …>contenu sans autre object</object>, puis object vide « <object …/> »
  const re = /<object\b([^>]*?)(?:\/>|>((?:(?!<object\b)[\s\S])*?)<\/object>)/gi;
  for (let tour = 0; tour < 20 && /<object\b/i.test(h); tour++) {
    h = h.replace(re, (m, a, dedans) => {
      const at = lrqAttrs(a), c = at.data ? lrqChemin(at.data) : '';
      dedans = dedans || '';
      if (c && lrqTypeImage(c, at.type)) return rendre(c, at.type);
      if (dedans.includes(IMG)) return dedans;             // objet (OLE…) et son image de repli : l'image seule
      if (c) return rendre(c, at.type);
      return dedans;
    });
  }
  h = h.replace(/<img\b([^>]*)>/gi, (m, a) => {
    if (m.includes(IMG)) return m;
    const at = lrqAttrs(a);
    return at.src && !/^data:/i.test(at.src) ? rendre(lrqChemin(at.src), '') : m;
  });
  return h.split(IMG + ' ').join('').split(IMG).join('');
}

/**
 * Lecture d'un ou plusieurs fichiers ReqIF : enveloppe des documents de l'adaptateur d'Arcature, exposée à l'hôte.
 * @param {Array<{chemin:string, doc:object}>} docs documents (FMT_REQIF.lire), dans l'ordre
 * @param {string} nom nom du fichier, de l'archive ou du dossier
 * @param {Array<{chemin:string, octets:Uint8Array}>} pieces pièces jointes (archive, dossier)
 * @param {boolean} avecPieces vrai si les pièces jointes pouvaient être fournies (archive, dossier) : sinon une pièce citée n'est pas signalée absente
 * @returns {object} lecture (voir l'en-tête du module)
 */
function lrqLecture(docs, nom, pieces, avecPieces) {
  const elements = [], parId = new Map(), noeuds = new Map(), docDe = new Map(), diagnostics = [], liaisons = [];
  const multi = docs.length > 1, racineProjet = multi ? '§projet' : null;
  const piecesParChemin = new Map(), piecesParNom = new Map();
  for (const p of pieces) {
    const x = { chemin: p.chemin, taille: p.octets.length, type: lrqTypeImage(p.chemin, ''), octets: p.octets, _uri: null };
    x.image = !!x.type;
    x.dataUri = () => x._uri || (x._uri = 'data:' + (x.type || 'application/octet-stream') + ';base64,' + lrqBase64(x.octets));
    piecesParChemin.set(lrqChemin(p.chemin).toLowerCase(), x);
    const n = lrqChemin(p.chemin).split('/').pop().toLowerCase();
    if (!piecesParNom.has(n)) piecesParNom.set(n, x);
  }
  /** Pièce jointe d'un chemin cité par un document (chemin relatif au fichier ReqIF, puis tel quel, puis par le seul nom). */
  const trouverPiece = (c, cheminDoc) => {
    const d = cheminDoc && cheminDoc.includes('/') ? cheminDoc.slice(0, cheminDoc.lastIndexOf('/') + 1) : '';
    const k = lrqChemin(c).toLowerCase();
    return piecesParChemin.get((d + k).toLowerCase()) || piecesParChemin.get(k) || piecesParNom.get(k.split('/').pop()) || null;
  };
  const diag = (code, message, element, fichier) => {
    const r = LRQ_REGLES.find(x => x.id === code);
    diagnostics.push({ severite: r ? r.severite : 'avertissement', code, regle: code, message, element: element || null, fichier: fichier || '', ligne: 0, colonne: 0 });
  };
  const idDe = n => (n ? n.attrs[0].v : null);
  const attr = (n, k) => { const a = n.attrs.find(x => x.n === k); return a ? a.v : undefined; };
  if (multi) {
    const e = { id: racineProjet, type: 'ReqIFProject', genre: 'projet', nom: nom || '', libelle: nom || '', description: '', texte: '', titre: false,
      famille: '', technique: false, racine: true, projet: true, proprietaire: null, enfants: [], references: {}, typeReqif: '', typeId: '',
      identifiant: '', derniereModification: '', images: 0, pieces: 0, objet: null, fichier: '' };
    elements.push(e); parId.set(e.id, e);
  }
  for (const { chemin, doc } of docs) {
    const M = doc.M, idsVus = new Map();
    // Éléments : arbre présenté, dans l'ordre du fichier
    const parcourir = (n, parentId) => {
      const id = idDe(n), rq = n.rq || {}, ty = rq.ty || null;
      if (parId.has(id)) { diag('RQ-ID', _Lp('Identifiant « {id} » déjà employé par un autre fichier ReqIF lu ensemble : élément ignoré.', { id }), null, chemin); return; }
      const desc = attr(n, 'description') || '';
      const valeurs = rq.valeurs || new Map();
      const foreign = ty ? rqDefNommee(ty, 'ReqIF.ForeignID') : null;
      const citees = lrqCitees(desc);
      const e = { id, type: n.tag, genre: rq.genre || '', nom: attr(n, 'name') || '', libelle: rq.libelle || attr(n, 'name') || '', description: desc,
        texte: rqXhtmlVersTexte(desc), titre: !!rq.titre, famille: FMT_REQIF.couche(n), technique: LRQ_TECHNIQUES.has(rq.genre),
        racine: rq.genre === 'racine' && !multi, projet: false, proprietaire: n.parent ? idDe(n.parent) : parentId, enfants: n.enfants.map(idDe),
        references: {}, typeReqif: ty ? ty.nom || ty.id : '', typeId: rq.type || '', identifiant: foreign && valeurs.has(foreign.id) ? String(rqLireValeur(M, valeurs.get(foreign.id), 'texte') || '') : '',
        derniereModification: attr(n, 'LAST-CHANGE') || '', images: citees.filter(c => lrqTypeImage(c, '')).length, pieces: citees.length,
        objet: rq.genre === 'occurrence' ? attr(n, 'object') || null : null, fichier: chemin };
      for (const a of n.attrs) { const r = rqEstReference(a.n, a.v, doc.clesEnum); if (r) e.references[a.n] = r; }
      elements.push(e); parId.set(id, e); noeuds.set(id, n); docDe.set(id, { chemin, doc });
      for (const c of n.enfants) parcourir(c, id);
    };
    parcourir(doc.racine, racineProjet);
    if (multi) parId.get(racineProjet).enfants.push(idDe(doc.racine));
    // Diagnostics du fichier : identifiants en double, références introuvables, valeurs hors type, objets hors spécification, pièces absentes
    xtParcourir(M.racine, x => { const id = xtAttr(x, 'IDENTIFIER'); if (id != null) idsVus.set(id, (idsVus.get(id) || 0) + 1); });
    for (const [id, k] of idsVus) if (k > 1) diag('RQ-ID', _Lp('Identifiant « {id} » écrit {k} fois dans le fichier.', { id, k }), doc.parId.has(id) ? id : null, chemin);
    const connu = id => idsVus.has(id);
    for (const h of M.hierarchies.values()) if (h.objet && !M.objets.has(h.objet)) diag('RQ-REF', _Lp('Place {h} : objet « {o} » introuvable.', { h: h.id || '?', o: h.objet }), doc.parId.has(h.id) ? h.id : null, chemin);
    for (const o of M.objets.values()) if (o.type && !M.types.has(o.type)) diag('RQ-REF', _Lp('Type « {t} » introuvable.', { t: o.type }), o.id, chemin);
    for (const r of M.relations) {
      if (r.source && !connu(r.source)) diag('RQ-REF', _Lp('Relation : source « {s} » introuvable.', { s: r.source }), doc.parId.has(r.id) ? r.id : null, chemin);
      if (r.cible && !connu(r.cible)) diag('RQ-REF', _Lp('Relation : cible « {s} » introuvable.', { s: r.cible }), doc.parId.has(r.id) ? r.id : null, chemin);
      if (r.type && !M.types.has(r.type)) diag('RQ-REF', _Lp('Type « {t} » introuvable.', { t: r.type }), doc.parId.has(r.id) ? r.id : null, chemin);
    }
    for (const n of doc.parId.values()) {
      const rq = n.rq || {}, id = idDe(n);
      if (rq.valeurs) for (const [d, v] of rq.valeurs) {
        if (!M.definitions.has(d)) { diag('RQ-REF', _Lp('Définition d\'attribut « {d} » introuvable.', { d }), id, chemin); continue; }
        if (rq.ty && !rq.ty.attributs.some(a => a.id === d)) diag('RQ-TYPE', _Lp('Attribut « {a} » absent du type « {t} ».', { a: M.definitions.get(d).nom, t: rq.ty.nom || rq.ty.id }), id, chemin);
        if (rqGenre(v.tag) === 'ENUMERATION') for (const ev of rqRefs(v, 'VALUES')) if (!M.valeursEnum.has(ev)) diag('RQ-REF', _Lp('Valeur énumérée « {v} » introuvable.', { v: ev }), id, chemin);
      }
      if (rq.genre === 'objet' && !rq.hier && n.parent && n.parent.rq && n.parent.rq.genre === 'dossier') diag('RQ-HORS-SPEC', _L('Objet présent dans aucune spécification.'), id, chemin);
    }
    // Liaisons : relations (SPEC-RELATION) par type, nommées par le nom de leur type
    const L = rqLiaisons(doc);
    for (const [n, ls] of L.metier) for (const x of ls) if (x.sens === 'sortant') {
      const t = M.types.get(x.rel.slice(4));
      liaisons.push({ relation: (t && t.nom) || x.rel.slice(4) || _L('relation'), typeRelation: x.rel.slice(4), source: idDe(n), cible: idDe(x.autre), via: idDe(x.via) });
    }
  }
  // Pièces jointes citées : absentes (seulement si elles pouvaient être fournies)
  if (avecPieces) for (const e of elements) if (e.pieces) for (const c of lrqCitees(e.description)) if (!trouverPiece(c, e.fichier)) diag('RQ-PIECE', _Lp('Pièce jointe « {c} » absente.', { c }), e.id, e.fichier);
  const liaisonsDe = new Map();
  for (const l of liaisons) {
    for (const [a, b, sens] of [[l.source, l.cible, 'sortant'], [l.cible, l.source, 'entrant']]) {
      let t = liaisonsDe.get(a); if (!t) liaisonsDe.set(a, t = []);
      t.push({ relation: l.relation, libelle: ArcatureLecteurReqif.libelleRelation(l.relation, sens), sens, autre: b, via: l.via });
    }
  }
  /** Valeurs d'attributs d'un nœud présenté : une par définition du type (et valeurs hors type), dans l'ordre du type. */
  const valeursDe = id => {
    const n = noeuds.get(id), rq = n && n.rq; if (!rq || !rq.valeurs) return [];
    const M = docDe.get(id).doc.M, ty = rq.ty, out = [];
    const defs = [...(ty ? ty.attributs : []), ...[...rq.valeurs.keys()].filter(d => !ty || !ty.attributs.some(a => a.id === d)).map(d => M.definitions.get(d) || { id: d, nom: d, genre: rqGenre(rq.valeurs.get(d).tag), orpheline: true })];
    const cles = new Map([...(rq.cles || new Map())].map(([k, d]) => [d, k]));
    for (const d of defs) {
      const v = rq.valeurs.get(d.id), role = rq.nom && rq.nom.def === d ? 'nom' : rq.desc && rq.desc.def === d ? 'texte' : '';
      out.push({ nom: d.nom, cle: cles.get(d) || d.nom, definition: d.id, genre: d.genre, role, renseigne: !!v,
        valeur: v ? String(rqLireValeur(M, v, 'texte') ?? '') : '', html: v && d.genre === 'XHTML' ? rqLireValeur(M, v, 'html') : '',
        valeursEnum: v && d.genre === 'ENUMERATION' ? rqRefs(v, 'VALUES') : [] });
    }
    return out;
  };
  const piecesListe = [...piecesParChemin.values()];
  const lec = {
    /** Nom du fichier, de l'archive ou du dossier lu. */
    nom: nom || '',
    /** Fichiers ReqIF lus : chemin, titre, version de ReqIF, outil, date de création. */
    documents: docs.map(({ chemin, doc }) => { const E = doc.entete, c = k => { const x = rqEnfant(E, k); return x && x.texte ? x.texte.trim() : ''; };
      return { chemin, titre: c('TITLE'), version: c('REQ-IF-VERSION'), outil: c('SOURCE-TOOL-ID') || c('REQ-IF-TOOL-ID'), date: c('CREATION-TIME'), commentaire: c('COMMENT'), racine: idDe(doc.racine) }; }),
    /** Pièces jointes lues (archive, dossier) : chemin, taille en octets, type d'image ('' si ce n'est pas une image montrable). */
    fichiers: piecesListe.map(p => ({ chemin: p.chemin, taille: p.taille, type: p.type, image: p.image })),
    /** Identifiant de la racine : en-tête du fichier, ou projet si plusieurs fichiers ont été lus ensemble. */
    racine: multi ? racineProjet : idDe(docs[0].doc.racine),
    /** Diagnostics de la lecture. */
    diagnostics,
    /** Nombre d'erreurs. */
    erreurs: diagnostics.filter(d => d.severite === 'erreur').length,
    /** Nombre d'avertissements. */
    avertissements: diagnostics.filter(d => d.severite === 'avertissement').length,
    /** Documents internes d'Arcature (FMT_REQIF.lire), dans l'ordre des fichiers. */
    document: docs.length === 1 ? docs[0].doc : docs.map(d => d.doc),
    /** @returns {object[]} tous les éléments, racine en tête, dans l'ordre du fichier */
    elements() { return elements.slice(); },
    /** @param {string} id @returns {object|null} */
    element(id) { return parId.get(id) || null; },
    /** @param {string} id @returns {object[]} éléments contenus directement */
    enfants(id) { const e = parId.get(id); return e ? e.enfants.map(x => parId.get(x)).filter(Boolean) : []; },
    /** @param {string} id @returns {object|null} */
    proprietaire(id) { const e = parId.get(id); return e && e.proprietaire ? parId.get(e.proprietaire) || null : null; },
    /** @param {string} id @returns {object[]} descendants, en profondeur */
    descendants(id) { const out = []; const rec = x => { for (const c of lec.enfants(x)) { out.push(c); rec(c.id); } }; if (parId.has(id)) rec(id); return out; },
    /** @param {string} [id] @returns {{element:object, enfants:object[]}|null} arbre des éléments */
    arbre(id) { const e = parId.get(id || lec.racine); if (!e) return null; const rec = x => ({ element: x, enfants: lec.enfants(x.id).map(rec) }); return rec(e); },
    /**
     * Valeurs des attributs d'un élément typé (objet, spécification, relation), dans l'ordre de son type ; rôle « nom » ou
     * « texte » pour celles qui donnent son nom et sa description.
     * @param {string} id @returns {Array<{nom:string, cle:string, definition:string, genre:string, role:string, renseigne:boolean, valeur:string, html:string, valeursEnum:string[]}>}
     */
    attributs(id) { return valeursDe(id); },
    /**
     * HTML de la description d'un élément, pièces jointes remplacées.
     * @param {string} id @param {{images?:string}} [o] images : « data » (défaut), « marque » ou « nom »
     * @returns {string}
     */
    html(id, o) { const e = parId.get(id); return e ? lrqHtmlPieces(e.description, c => trouverPiece(c, e.fichier), (o && o.images) || 'data') : ''; },
    /**
     * HTML d'une valeur XHTML d'un élément (clé ou nom de l'attribut), pièces jointes remplacées.
     * @param {string} id @param {string} cle @param {{images?:string}} [o] @returns {string}
     */
    valeurHtml(id, cle, o) { const e = parId.get(id), a = valeursDe(id).find(x => x.cle === cle || x.nom === cle); return e && a ? lrqHtmlPieces(a.html || lrqEsc(a.valeur), c => trouverPiece(c, e.fichier), (o && o.images) || 'data') : ''; },
    /**
     * Pièce jointe d'un chemin cité.
     * @param {string} chemin @param {string} [depuis] identifiant de l'élément qui la cite (chemin relatif à son fichier)
     * @returns {{chemin:string, taille:number, type:string, image:boolean, octets:Uint8Array, dataUri:function():string}|null}
     */
    image(chemin, depuis) { const e = depuis ? parId.get(depuis) : null; return trouverPiece(chemin, e ? e.fichier : ''); },
    /** @param {string} id @returns {Array<{relation:string, libelle:string, sens:string, autre:string, via:(string|null)}>} relations vues de l'élément */
    liaisons(id) { return (liaisonsDe.get(id) || []).slice(); },
    /** @returns {Array<{relation:string, typeRelation:string, source:string, cible:string, via:(string|null)}>} toutes les relations, chacune une fois */
    toutesLiaisons() { return liaisons.slice(); },
    /** @param {string} id @returns {{sortantes:object[], entrantes:object[]}} références brutes (type, objet cité, source, cible, valeurs énumérées) */
    references(id) {
      const e = parId.get(id); if (!e) return { sortantes: [], entrantes: [] };
      const sortantes = Object.entries(e.references).flatMap(([a, ids]) => ids.map(c => ({ attribut: a, cible: parId.has(c) ? c : null })));
      const entrantes = [];
      for (const x of elements) for (const [a, ids] of Object.entries(x.references)) if (ids.includes(id)) entrantes.push({ attribut: a, source: x.id });
      return { sortantes, entrantes };
    },
    /** @param {string} id @returns {string} XML de l'élément dans son fichier */
    extrait(id) { const n = noeuds.get(id), x = n && n.rq && n.rq.xml; return x && x.s != null && x.e != null ? docDe.get(id).doc.xml.src.slice(x.s, x.e) : ''; },
    /** @param {string} [chemin] fichier ReqIF lu (le premier sinon) @returns {string} son texte */
    texte(chemin) { const d = chemin ? docs.find(x => x.chemin === chemin) : docs[0]; return d ? d.doc.xml.src : ''; },
    /** @returns {object[]} spécifications, dans l'ordre des fichiers */
    specifications() { return elements.filter(e => e.genre === 'spec'); },
    /**
     * Plan d'une spécification, dans l'ordre de sa hiérarchie : chaque place (objet à sa première place, ou autre place du même
     * objet) avec son niveau et son numéro de chapitre (titres numérotés 1, 1.1… ; exigences numérotées dans leur chapitre).
     * @param {string} idSpec @returns {Array<{id:string, objet:string, niveau:number, numero:string, titre:boolean, occurrence:boolean}>}
     */
    plan(idSpec) {
      const out = [], s = parId.get(idSpec); if (!s) return out;
      const rec = (id, niveau, prefixe) => {
        let k = 0;
        for (const c of lec.enfants(id)) {
          if (c.genre !== 'objet' && c.genre !== 'occurrence') continue;
          k++;
          const o = c.genre === 'occurrence' ? parId.get(c.objet) || c : c, num = (prefixe ? prefixe + '.' : '') + k;
          out.push({ id: c.id, objet: o.id, niveau, numero: num, titre: !!o.titre, occurrence: c.genre === 'occurrence' });
          rec(c.id, niveau + 1, num);
        }
      };
      rec(idSpec, 0, '');
      return out;
    },
    /** @returns {Array<{id:string, nom:string, sorte:string, attributs:Array<{id:string, nom:string, genre:string}>, nombre:number}>} types (objets, spécifications, relations, groupes) et nombre d'éléments de chacun */
    types() {
      const nb = new Map(); for (const e of elements) if (e.typeId && e.genre !== 'type') nb.set(e.typeId, (nb.get(e.typeId) || 0) + 1);
      return docs.flatMap(({ doc }) => [...doc.M.types.values()].map(t => ({ id: t.id, nom: t.nom || t.id, sorte: t.sorte, attributs: t.attributs.map(a => ({ id: a.id, nom: a.nom, genre: a.genre })), nombre: nb.get(t.id) || 0 })));
    },
    /** @returns {Array} aucune vue : ReqIF n'a pas de diagrammes */
    vues() { return []; },
    /** @returns {Array} aucune vue */
    vuesPour() { return []; },
    /** @returns {null} aucune vue */
    vue() { return null; },
    /** @param {string} id @returns {object|null} nœud présenté par l'adaptateur d'Arcature ({ tag, attrs, enfants, parent, rq }) */
    noeud(id) { return noeuds.get(id) || null; },
    /** @returns {object} ce qui se sérialise en JSON : nom, documents, pièces jointes, racine, éléments, diagnostics, liaisons */
    json() { return { nom: lec.nom, documents: lec.documents, fichiers: lec.fichiers, racine: lec.racine, elements: lec.elements(), diagnostics: diagnostics.slice(), liaisons: liaisons.slice() }; }
  };
  return lec;
}

/**
 * Octets d'un contenu binaire fourni par l'hôte (Uint8Array, ArrayBuffer, Buffer de Node).
 * @param {*} contenu @returns {Uint8Array}
 */
function lrqOctets(contenu) {
  if (contenu instanceof Uint8Array) return contenu;
  if (contenu instanceof ArrayBuffer) return new Uint8Array(contenu);
  if (contenu && contenu.buffer instanceof ArrayBuffer) return new Uint8Array(contenu.buffer, contenu.byteOffset || 0, contenu.byteLength);
  throw new Error(_L('Contenu binaire attendu (Uint8Array ou ArrayBuffer).'));
}

/**
 * Texte d'octets : UTF-8 (marque d'ordre retirée), ou UTF-16 si une marque d'ordre l'annonce.
 * @param {Uint8Array} o @returns {string}
 */
function lrqTexte(o) {
  if (o[0] === 0xFF && o[1] === 0xFE) return new TextDecoder('utf-16le').decode(o.subarray(2));
  if (o[0] === 0xFE && o[1] === 0xFF) return new TextDecoder('utf-16be').decode(o.subarray(2));
  return new TextDecoder('utf-8').decode(o).replace(/^﻿/, '');
}

/**
 * Vrai pour des octets d'archive zip (signature « PK »).
 * @param {Uint8Array} o @returns {boolean}
 */
function lrqEstZip(o) { return o.length > 4 && o[0] === 0x50 && o[1] === 0x4B && o[2] === 0x03 && o[3] === 0x04; }

/**
 * Lit des fichiers ReqIF et leurs pièces jointes (archive ou dossier) : chaque .reqif en document d'Arcature, le reste en pièces.
 * @param {Array<{chemin:string, octets:Uint8Array}>} fichiers @param {string} nom @returns {object} lecture
 * @throws {Error} aucun fichier .reqif
 */
function lrqLireEnsemble(fichiers, nom) {
  const reqif = fichiers.filter(f => /\.reqif$/i.test(f.chemin)), pieces = fichiers.filter(f => !/\.reqif$/i.test(f.chemin) && !/\/$/.test(f.chemin));
  if (!reqif.length) throw new Error(_L('Aucun fichier .reqif dans l\'archive ou le dossier.'));
  reqif.sort((a, b) => a.chemin.localeCompare(b.chemin));
  return lrqLecture(reqif.map(f => ({ chemin: f.chemin, doc: FMT_REQIF.lire(lrqTexte(f.octets)) })), nom, pieces, true);
}

/** Icônes des éléments ReqIF (dessins d'Arcature, repère 0 0 16 16) : couleur, corps SVG. */
const LRQ_ICONES = {
  ReqIF: ['#6e7681', '<rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="none" stroke="currentColor"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor"/>'],
  ReqIFProject: ['#6e7681', '<path d="M1.5 4.5v9h13v-8h-7l-1.5-1.5h-4.5z" fill="none" stroke="currentColor"/>'],
  dossier: ['#6e7681', '<path d="M1.5 4.5v9h13v-8h-7l-1.5-1.5h-4.5z" fill="none" stroke="currentColor"/>'],
  Specification: ['#58a6ff', '<path d="M3.5 1.5h6l3 3v10h-9z" fill="none" stroke="currentColor"/><path d="M9.5 1.5v3h3M5.5 7.5h5M5.5 10h5M5.5 12.5h3" stroke="currentColor"/>'],
  SpecObject: ['#e3b341', '<rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">R</text>'],
  titre: ['#a78bfa', '<text x="8" y="12.5" text-anchor="middle" font-size="13" font-family="serif" font-weight="700" fill="currentColor">§</text>'],
  SpecHierarchy: ['#8b949e', '<rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-dasharray="2 1.5"/><path d="M5 6v4h6M9 8l2 2-2 2" fill="none" stroke="currentColor"/>'],
  SpecRelation: ['#3fb950', '<circle cx="3.5" cy="8" r="2" fill="none" stroke="currentColor"/><circle cx="12.5" cy="8" r="2" fill="none" stroke="currentColor"/><path d="M5.5 8h4.5M8.5 6l2 2-2 2" fill="none" stroke="currentColor"/>'],
  RelationGroup: ['#3fb950', '<path d="M2 5h9M2 11h9M9 3l2 2-2 2M9 9l2 2-2 2" fill="none" stroke="currentColor"/>'],
  type: ['#8b949e', '<rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">T</text>'],
  definition: ['#8b949e', '<rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">A</text>'],
  datatype: ['#8b949e', '<rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">D</text>'],
  enum: ['#8b949e', '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor"/><text x="8" y="11" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="700" fill="currentColor">e</text>']
};

/**
 * Clé d'icône d'un type présenté ou d'un élément de la lecture.
 * @param {string|object} t type (« SpecObject ») ou élément @returns {string}
 */
function lrqCleIcone(t) {
  const e = t && typeof t === 'object' ? t : null, type = e ? e.type : String(t || '');
  if (e && e.titre) return 'titre';
  if (e && e.genre === 'dossier') return 'dossier';
  if (LRQ_ICONES[type]) return type;
  if (/^AttributeDefinition/.test(type)) return 'definition';
  if (/^DatatypeDefinition/.test(type)) return 'datatype';
  if (type === 'EnumValue') return 'enum';
  if (/Type$/.test(type)) return 'type';
  if (/^(Specifications|SpecObjects|SpecRelations|SpecRelationGroups|SpecTypes|Datatypes)$/.test(type)) return 'dossier';
  return '';
}

/** Lecteur ReqIF autonome exposé à l'hôte. */
const ArcatureLecteurReqif = {
  /** Version d'Arcature dont le lecteur est tiré. */
  version: ARC_VERSION,
  /**
   * Lit des exigences : texte d'un .reqif, octets d'un .reqif ou d'une archive .reqifz (reconnue à son contenu).
   * @param {string|Uint8Array|ArrayBuffer} contenu @param {string} [nom] @returns {Promise<object>} lecture
   */
  async lire(contenu, nom) {
    if (typeof contenu === 'string') return ArcatureLecteurReqif.lireTexte(contenu, nom);
    const o = lrqOctets(contenu);
    return lrqEstZip(o) ? ArcatureLecteurReqif.lireArchive(o, nom) : ArcatureLecteurReqif.lireTexte(lrqTexte(o), nom);
  },
  /** @param {string} texte texte d'un .reqif @param {string} [nom] @returns {object} lecture (sans pièces jointes) */
  lireTexte(texte, nom) {
    const n = nom || 'exigences.reqif';
    return lrqLecture([{ chemin: n.split(/[\\/]/).pop(), doc: FMT_REQIF.lire(String(texte == null ? '' : texte).replace(/^﻿/, '')) }], n, [], false);
  },
  /** @param {Uint8Array|ArrayBuffer} octets archive .reqifz @param {string} [nom] @returns {Promise<object>} lecture */
  async lireArchive(octets, nom) {
    const arch = arzLire(lrqOctets(octets)), fichiers = [];
    for (const e of arch.entrees) if (!/\/$/.test(e.nom)) fichiers.push({ chemin: e.nom, octets: await arzDonnees(arch, e.nom) });
    return lrqLireEnsemble(fichiers, nom || 'exigences.reqifz');
  },
  /**
   * Lit les fichiers d'un dossier : les .reqif ensemble, les autres en pièces jointes (images citées par les textes).
   * @param {Array<{chemin:string, texte?:string, octets?:(Uint8Array|ArrayBuffer)}>} fichiers @param {string} [nom] @returns {Promise<object>} lecture
   */
  async lireFichiers(fichiers, nom) {
    const liste = (fichiers || []).map(f => ({ chemin: String(f.chemin || f.nom || ''), octets: f.octets != null ? lrqOctets(f.octets) : new TextEncoder().encode(String(f.texte || '')) }));
    const zips = liste.filter(f => /\.reqifz$/i.test(f.chemin));
    if (!liste.some(f => /\.reqif$/i.test(f.chemin)) && zips.length) return ArcatureLecteurReqif.lireArchive(zips[0].octets, nom || zips[0].chemin);
    return lrqLireEnsemble(liste, nom || _L('Exigences ReqIF'));
  },
  /** @param {string} nom @returns {boolean} vrai pour un .reqif ou un .reqifz */
  reconnait(nom) { return /\.reqifz?$/i.test(String(nom || '')); },
  /** @param {string} nom @returns {boolean} vrai si le fichier se lit en octets (.reqifz) */
  binaire(nom) { return /\.reqifz$/i.test(String(nom || '')); },
  /** Familles des éléments (parties du fichier ReqIF) et leur libellé. */
  familles: LRQ_FAMILLES,
  /** @returns {Array<{id:string, severite:string, nom:string}>} règles des diagnostics */
  regles() { return LRQ_REGLES.map(r => Object.assign({}, r)); },
  /**
   * Libellé d'une relation vue d'un côté.
   * @param {string} relation nom du type de relation @param {string} sens « sortant » ou « entrant » @returns {string}
   */
  libelleRelation(relation, sens) { return sens === 'entrant' ? _Lp('{r} (depuis)', { r: relation }) : String(relation || ''); },
  /**
   * Icône d'un type présenté ou d'un élément de la lecture : élément svg de classe ico.
   * @param {string|object} typeOuElement @param {number} [taille] côté (16 par défaut) @returns {string} SVG, '' si aucune icône
   */
  icone(typeOuElement, taille) {
    const k = lrqCleIcone(typeOuElement), d = LRQ_ICONES[k]; if (!d) return '';
    const t = taille || 16;
    return `<svg class="ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${t}" height="${t}" style="color:${d[0]}" aria-hidden="true">${d[1]}</svg>`;
  },
  /** @param {string} type @param {number} [taille] @returns {string} SVG */
  iconeType(type, taille) { return ArcatureLecteurReqif.icone(String(type || ''), taille); },
  /**
   * HTML d'une valeur XHTML de ReqIF (contenu de THE-VALUE) pour l'hôte, sans pièces jointes résolues.
   * @param {string} xhtml @returns {string}
   */
  xhtmlVersHtml(xhtml) { return rqXhtmlVersHtml(xhtml); },
  /** @param {string} html @returns {string} texte brut */
  htmlVersTexte(html) { return rqXhtmlVersTexte(html); }
};

return ArcatureLecteurReqif;
});
