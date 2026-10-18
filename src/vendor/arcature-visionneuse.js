/* Arcature — visionneuse de diagrammes Capella (fr), assemblée par « node build.js --visionneuse ».
   Licence Apache 2.0. Expose window.ArcatureVisionneuse (voir src/visionneuse/socle-fin.js). */
(function () {
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
   Ce module ne dépend d'aucun autre : il est chargé tel quel par les tests Node.
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
 * @param {string} s valeur décodée
 * @returns {string} valeur prête à écrire entre guillemets
 */
function xtEncodeAttr(s) {
  return String(s).replace(/[&<"\t\n\r]/g, c => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\t': '&#x9;', '\n': '&#xA;', '\r': '&#xD;' }[c]));
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
 * Chaque nœud : { tag, attrs:[{n, v, brut}], enfants:[], parent, texte (décodé, null si aucun),
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
      attrs.push({ n: nom, v: xtDecode(brut), brut });
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
 * (Re)construit l'index id → nœud du document (attribut « id » des fichiers Capella récents,
 * ou « xmi:id » des anciens).
 * @param {object} doc document lu par xtLire
 */
function xtIndexer(doc) {
  doc.parId.clear();
  const pile = [doc.racine];
  while (pile.length) {
    const el = pile.pop();
    const id = xtAttr(el, 'id') ?? xtAttr(el, 'xmi:id');
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
 * Indentation d'un élément selon sa profondeur.
 * @param {number} prof profondeur (0 = racine)
 * @returns {string}
 */
function xtIndentDe(prof) { return XT_INDENT.repeat(prof); }

/**
 * Écrit la balise ouvrante d'un élément au format EMF (sans « > » ni « /> »).
 * Règle EMF : un attribut est précédé d'un saut de ligne + indentation de continuation
 * lorsque la ligne courante dépasse déjà la largeur ; sinon d'une espace. Largeur : doc.largeur
 * si elle est fixée (Infinity pour le .aird, que Sirius écrit sans retour à la ligne), sinon XT_LARGEUR.
 * @param {object} doc document (pour le séparateur de lignes)
 * @param {object} el nœud
 * @returns {string}
 */
function xtBaliseOuvrante(doc, el) {
  const ind = xtIndentDe(el.prof), cont = ind + XT_CONTINUATION, max = doc.largeur ?? XT_LARGEUR;
  let out = '<' + el.tag;
  let largeur = ind.length + out.length;            // largeur de la ligne courante, indentation comprise
  for (const a of el.attrs) {
    const txt = a.n + '="' + (a.brut != null ? a.brut : xtEncodeAttr(a.v)) + '"';
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
 * @param {object} doc document
 * @param {object} el nœud
 * @returns {string}
 */
function xtEcrireElement(doc, el) {
  const src = doc.src;
  const neuf = el.s == null;                         // créé par l'outil : pas de texte source
  if (!neuf && !el.balise && !el.structure && !el.desc) return src.slice(el.s, el.e);
  if (el.mixte || el.cdata || el.commentaire) {
    if (el.balise || el.structure) throw new Error(`Réécriture impossible de <${el.tag}> (contenu mixte, CDATA ou commentaire) : modification refusée`);
  }
  const ind = xtIndentDe(el.prof);
  const vide = !el.enfants.length && el.texte == null;
  // Balise ouvrante
  let ouv;
  const reecrireBalise = neuf || el.balise || (el.structure && (vide !== el.autoFerme));
  if (reecrireBalise) ouv = xtBaliseOuvrante(doc, el) + (vide ? '/>' : '>');
  else ouv = src.slice(el.s, el.fo);
  if (vide) return ouv;
  // Élément feuille avec texte
  if (!el.enfants.length) {
    if (!neuf && !el.balise && !el.structure && !el.texteModifie) return src.slice(el.s, el.e);
    return ouv + xtEncodeTexte(el.texte) + '</' + el.tag + '>';
  }
  // Enfants
  let out = ouv;
  const struct = neuf || el.structure;
  let prec = null;
  for (const c of el.enfants) {
    if (struct || c.s == null || (prec && prec.s == null)) out += doc.nl + xtIndentDe(c.prof);
    else out += src.slice(prec ? prec.e : el.fo, c.s);    // espacement d'origine entre balises
    out += xtEcrireElement(doc, c);
    prec = c;
  }
  if (struct || prec.s == null || !el.fc) out += doc.nl + ind + '</' + el.tag + '>';
  else out += src.slice(prec.e, el.e);
  return out;
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
  if (nom === 'id' || nom === 'xmi:id') { if (ancienne != null) doc.parId.delete(ancienne); if (valeur != null) doc.parId.set(valeur, el); }
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
  xtParcourir(el, x => { const id = xtAttr(x, 'id') ?? xtAttr(x, 'xmi:id'); if (id != null) doc.parId.set(id, x); });
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
  xtParcourir(el, x => { const id = xtAttr(x, 'id') ?? xtAttr(x, 'xmi:id'); if (id != null && doc.parId.get(id) === x) doc.parId.delete(id); });
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

/* ── src/js/20-modele.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   20. MODÈLE CAPELLA — lecture métier au-dessus de l'arbre XML
   Types, couches ARCADIA, libellés, ossature protégée.
   Ne dépend que de 10-xml-texte.js (chargé aussi par les tests Node).
   ═══════════════════════════════════════════════════════════════════════ */

/** Couches ARCADIA par type d'architecture. */
const MOD_COUCHES = {
  OperationalAnalysis: 'OA', SystemAnalysis: 'SA', LogicalArchitecture: 'LA',
  PhysicalArchitecture: 'PA', EPBSArchitecture: 'EPBS'
};

/**
 * Type court d'un élément (« SystemFunction » pour « org.polarsys…ctx:SystemFunction »).
 * @param {object} el nœud
 * @returns {string} type court (pour la racine sans xsi:type : partie locale de la balise)
 */
function modType(el) {
  const t = xtAttr(el, 'xsi:type') || el.tag;
  const k = t.lastIndexOf(':');
  return k >= 0 ? t.slice(k + 1) : t;
}

/**
 * Identifiant Capella d'un élément (« id », ou « xmi:id » des anciens modèles).
 * @param {object} el nœud
 * @returns {string|undefined}
 */
function modId(el) { return xtAttr(el, 'id') ?? xtAttr(el, 'xmi:id'); }

/**
 * Architecture (niveau ARCADIA) qui contient l'élément.
 * @param {object} el nœud
 * @returns {object|null} nœud d'architecture, ou null (éléments du projet)
 */
function modArchitecture(el) {
  for (let p = el; p; p = p.parent) if (p.tag === 'ownedArchitectures') return p;
  return null;
}

/**
 * Couche ARCADIA d'un élément : OA, SA, LA, PA, EPBS, ou '' hors architecture.
 * @param {object} el nœud
 * @returns {string}
 */
function modCouche(el) {
  const a = modArchitecture(el);
  return a ? (MOD_COUCHES[modType(a)] || '') : '';
}

/**
 * Libellé lisible d'un élément : son nom, ou à défaut son type.
 * @param {object} el nœud
 * @returns {string}
 */
function modLibelle(el) {
  const n = xtAttr(el, 'name');
  return n != null && n !== '' ? n.replace(/\s*\n\s*/g, ' ') : '‹' + modType(el) + '›';
}

/**
 * Chemin de l'élément depuis la racine (liste des ancêtres, racine exclue).
 * @param {object} el nœud
 * @returns {object[]} ancêtres, du plus haut au parent direct
 */
function modChemin(el) {
  const ch = [];
  for (let p = el.parent; p && p.parent; p = p.parent) ch.unshift(p);
  return ch;
}

/**
 * Indique si un élément appartient à l'ossature créée par Capella avec le projet
 * (projet, ingénierie système, architectures, paquetages racines, fonction racine,
 * composant système racine). Ces éléments ne doivent être ni supprimés ni déplacés.
 * L'unicité dépend de la POSITION et non du type : la Root System Function est un
 * SystemFunction comme les autres.
 * @param {object} el nœud
 * @returns {string|null} raison de la protection, ou null si l'élément est libre
 */
function modOssature(el) {
  const p = el.parent;
  if (!p) return _L('racine du projet');
  if (el.tag === 'ownedModelRoots') return _L('ingénierie système');
  if (el.tag === 'ownedArchitectures') return _L('niveau d\'architecture');
  if (p.tag === 'ownedArchitectures' && /Pkg$/.test(el.tag)) return _L('paquetage racine du niveau');
  if (p.tag === 'ownedArchitectures' && /Realizations$/.test(el.tag)) return _L('réalisation entre niveaux');
  // Fonction racine : fonction directement sous le paquetage de fonctions racine du niveau
  if (p.tag === 'ownedFunctionPkg' && p.parent && p.parent.tag === 'ownedArchitectures' && /Function|Activity/.test(modType(el)) && !/Pkg$/.test(modType(el)))
    return _L('fonction racine');
  // Composant système racine (System, Logical System, Physical System) : composant non acteur
  // directement sous le paquetage de structure racine du niveau SA, LA ou PA
  // (Capella permet d'en créer d'autres à côté : seul le premier est le Système)
  if (/^owned(System|Logical|Physical)Components$/.test(el.tag) && p.parent && p.parent.tag === 'ownedArchitectures' && xtAttr(el, 'actor') !== 'true'
    && p.enfants.find(c => c.tag === el.tag && xtAttr(c, 'actor') !== 'true') === el)
    return _L('composant système racine');
  if (el.tag === 'ownedConfigurationItems' && p.parent && p.parent.tag === 'ownedArchitectures') return _L('élément de configuration racine');
  return null;
}

/** Types techniques (liens, traces, valeurs, éléments de scénario) masqués par défaut dans l'arborescence,
 * comme dans le Project Explorer de Capella. Complété par les règles de modTechnique. */
const MOD_TECHNIQUES = new Set([
  'TransfoLink', 'GenericTrace', 'Part', 'PartDeploymentLink', 'CatalogElementLink', 'Generalization', 'KeyValue',
  'ModelInformation', 'LiteralNumericValue', 'LiteralBooleanValue', 'LiteralStringValue', 'OpaqueExpression',
  'CapabilityExploitation', 'AbstractCapabilityInclude', 'AbstractCapabilityExtend', 'AbstractCapabilityGeneralization',
  'FunctionalChainReference', 'SequenceLink', 'MessageEnd', 'ExecutionEnd', 'Execution', 'ExecutionEvent',
  'EventSentOperation', 'EventReceiptOperation', 'InstanceRole', 'InteractionState', 'FragmentEnd', 'StateFragment',
  'InteractionOperand', 'ChangeEvent'
]);

/**
 * Indique si un élément est technique (allocation, réalisation, implication, trace, valeur…) :
 * il porte une liaison entre deux éléments plutôt qu'un concept du modèle.
 * @param {object} el nœud
 * @returns {boolean}
 */
function modTechnique(el) {
  const t = modType(el);
  return MOD_TECHNIQUES.has(t) || (/Realization$/.test(t) && t !== 'CapabilityRealization') || /Allocation$|Involvement/.test(t);
}

/**
 * Abréviation du type pour l'icône de l'arborescence : initiales des mots du type
 * (« LogicalFunction » → « LF »), « ▣ » pour un paquetage.
 * @param {object} el nœud
 * @returns {string}
 */
function modIcone(el) {
  const t = modType(el);
  if (/Pkg$/.test(t)) return '▣';
  const ini = t.replace(/[^A-Z]/g, '');
  return (ini || t).slice(0, 2);
}

/**
 * Informations générales du modèle : version de Capella (commentaire d'en-tête), nom,
 * approche de projet (« SingletonComponents » ou « ReusableComponents »).
 * @param {object} doc document
 * @returns {{version:string, nom:string, approche:string}}
 */
function modInfos(doc) {
  const m = doc.src.slice(0, doc.racine.s).match(/Capella_Version_([\d.]+)/);
  let approche = '';
  for (const c of doc.racine.enfants) if (c.tag === 'keyValuePairs' && xtAttr(c, 'key') === 'projectApproach') approche = xtAttr(c, 'value') || '';
  const se = doc.racine.enfants.find(c => c.tag === 'ownedModelRoots');
  return { version: m ? m[1] : '', nom: xtAttr(se || doc.racine, 'name') || '', approche };
}

/* ── src/js/23-styles-capella.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   23. STYLES DE CAPELLA — GÉNÉRÉ par tools/styles-capella.js, ne pas modifier
   ───────────────────────────────────────────────────────────────────────
   Styles des diagrammes absents du .aird, lus dans les descriptions Sirius de Capella
   (org.polarsys.capella.core.sirius.analysis/description : EPBS.odesign, common.odesign, context.odesign, logical.odesign, oa.odesign, physical.odesign),
   style principal de chaque mapping. Sans DOM.
   ═══════════════════════════════════════════════════════════════════════ */

/** Angles arrondis : mapping → arcWidth (roundedCorner="true") ; rayon dessiné = arc / 2. */
const STY_ARRONDIS = { "CCDI_ExchangeItem": 12, "DT_Class": 12, "DT_Collection": 12, "FullInterface1": 12, "IDB_ExchangeItem": 12, "IDB_Interface": 12, "LDFB_Function": 18, "MSM_ModeState_Container": 12, "OAIB Operational Activity": 18, "PAB_Deployment": 18, "PDFB_Function": 18, "SDFB_Function": 18, "SM_InnerModeState_Container": 12, "SM_ModeState_Container": 12 };

/** Mappings de nœuds et de conteneurs dont le libellé n'affiche pas d'icône (showIcon="false"). */
const STY_SANS_ICONE = new Set([
  "CA Component Port", "CA Flow Port on System Function", "CA_InputPin by Categorie", "CA_Interface",
  "CA_OutputPin by Categorie", "CCDI_Port", "CCEI_Port", "CCII_Interface", "CCII_Port",
  "CCRI CapabilityRealization", "COC2_OperationalCapabilities", "COC_OperationalCapabilities",
  "CRB CapabilityRealization", "CRI_Capability", "CRI_CapabilityRealization", "CRI_CapabilityRealization_1",
  "CRI_CapabilityRealization_int", "CRI_CapabilityRealization_int_int", "CapNode", "CapNode2", "Capability3",
  "CapabilityNode4", "CombinedFragment", "CombinedFragmentAIS", "CombinedFragmentDF", "CombinedFragmentFS",
  "CombinedFragmentOA", "DT_TitleBlockColumnContainer", "DT_TitleBlockContainer", "DT_TitleBlockLineContainer",
  "Execution", "Execution AIS", "Execution DF", "Execution FS", "Execution OA", "FC_FunctionalChainStacked",
  "IDB_Port", "InteractionState Mapping", "InteractionState Mapping AIS", "InteractionState Mapping FS",
  "InteractionState Mapping OA", "InteractionStateFunction", "InteractionUse", "InteractionUse AIS",
  "InteractionUse OA", "InteractionUseDF", "InteractionUseFS", "LAB ComponentPort",
  "LAB Flow Port on Logical Function", "LAB InputPin by Categorie", "LAB OutputPin by Categorie",
  "LAB_ComponentCategory_Pin", "LAB_PhysicalCategory_Pin", "LAB_PhysicalPort", "LDFB_InputPin by Categorie",
  "LDFB_OutputPin by Categorie", "LDFB_Pin", "Lifeline deletion mapping", "Lifeline deletion mapping AIS",
  "Lifeline deletion mapping DF", "Lifeline deletion mapping FS", "Lifeline deletion mapping OA", "MSM_DoActivity",
  "MSM_Entry", "MSM_EntryPoint", "MSM_Exit", "MSM_ExitPoint", "MSM_Region", "MissionNode", "MissionNode2",
  "MissionNode3", "MissionNode4", "ModeState_Activity", "ModeState_Entry", "ModeState_Exit", "ObservationPoint",
  "ObservationPoint AIS", "ObservationPoint DF", "ObservationPoint FS", "ObservationPointOA", "Operand",
  "OperandAIS", "OperandDF", "OperandFS", "OperandOA", "PAB InputPin by Categorie", "PAB OutputPin by Categorie",
  "PAB_ComponentCategory_Pin", "PAB_PhysicalCategory_Pin", "PAB_Pin", "PAB_Port", "PDFB_InputPin by Categorie",
  "PDFB_OutputPin by Categorie", "PDFB_Pin", "PhysicalLinkInCI mapping", "PhysicalPortInCI mapping",
  "SAB_ComponentCategory_Pin", "SAB_PhysicalCategory_Pin", "SAB_PhysicalPort", "SDFB_InputPin by Categorie",
  "SDFB_OutputPin by Categorie", "SDFB_Pin", "SM_EntryPoint", "SM_ExitPoint", "default execution",
  "default execution AIS", "default execution DF", "default execution FS", "default execution OA", "endOfLife",
  "endOfLife FS", "endOfLifeAIS", "endOfLifeDF", "endOfLifeOA", "postconditionMapping", "postconditionMappingDF",
  "postconditionMappingFS", "preconditionMapping", "preconditionMappingDF", "preconditionMappingFS"
]);

/** Mappings de liens dont l'étiquette centrale n'affiche pas d'icône (centerLabelStyleDescription showIcon="false"). */
const STY_LIENS_SANS_ICONE = new Set([
  "AbsCapExtends3", "AbsCapExtends4int", "AbsCapInclude3", "AbsCapInclude4int", "Basic message mapping",
  "Basic message mapping AIS", "Basic message mapping DF", "Basic message mapping FS", "Basic message mapping OA",
  "CA PortRealization FunctionPort to ComponentPort", "CA_Actor_Generalization", "CA_InternLink",
  "CCDI_Generalization", "CCEI_FilteredLabel", "CCEI_Generalization", "CCII_Connection", "CCII_FilteredLabel",
  "CCII_Generalization", "CCII_PortAllocation", "COC2_OC_Extends", "COC2_OC_Include", "COC_CommunicationMeans",
  "COC_OC_Extends", "COC_OC_Include", "CRB Cap Realization Extends", "CRB Cap Realization Include",
  "ConstraintDuration", "ConstraintDuration AIS", "ConstraintDuration DF", "ConstraintDuration FS",
  "ConstraintDurationOA", "DT_CollectionType", "DT_ContrainedElements", "DT_ExchangeItemElement",
  "DT_Generalization", "FC_SequenceLink", "IDB_Connection", "IDB_FilteredLabel", "IDB_FilteredLabel_DiagramBased",
  "IDB_Generalization", "IDB_PortAllocation", "LAB PortAllocation", "LAB PortRealization FlowPort to ComponentPort",
  "LAB_ComponentPortAllocation", "LAB_FC_SequenceLink", "LAB_InternLink", "LAB_InternPhysicalPathLink",
  "LDFB_InternLink", "MSM_ComputedTransition", "MSM_Transition", "OAB_CommunicationMean", "OAB_FC_SequenceLink",
  "PAB PortAllocation", "PAB PortRealization", "PAB_ComponentPortAllocation", "PAB_FC_SequenceLink",
  "PAB_InternLink", "PAB_InternPhysicalPathLink", "PDFB_InternLink", "PD_PkgDependency",
  "SAB_ComponentPortAllocation", "SAB_FC_SequenceLink", "SAB_InternPhysicalPathLink", "SDFB_InternLink",
  "SM_Transition", "Scenario_ContrainedElements", "Scenario_ExchangeContext", "Timer message mapping",
  "Timer message mapping DF", "Timer message mapping OA", "creation message mapping",
  "creation message mapping AIS", "creation message mapping DF", "creation message mapping FS",
  "creation message mapping OA", "destruction message mapping", "destruction message mapping AIS",
  "destruction message mapping DF", "destruction message mapping FS", "destruction message mapping OA",
  "return message mapping", "return message mapping AIS", "return message mapping DF", "return message mapping FS",
  "return message mapping OA"
]);

/**
 * Outils des palettes de Capella qui créent un port (NodeCreationDescription, calque par défaut) : f (description),
 * o (nom de l'outil), m (mapping du port, chemin tel qu'écrit dans le .aird), t (type créé), r (balise), v (valeurs posées,
 * ordre EMF), c (conteneur du port : '' = élément visé, getComponentType, abstractType), pre (précondition AQL, transcrite
 * dans 26-diagrammes.js) ; d (représentation, chemin décodé) seulement si le mapping n'est pas dans la représentation
 * de l'outil ; p (autres mappings parents, chemins décodés : reusedBorderedNodeMappings) — le parent du mapping en est un.
 */
const STY_OUTILS_PORTS = [];   // outils de création : sans objet dans la visionneuse

/** Dossier des images des descriptions de Capella (préfixe des workspacePath des styles de ports). */
const STY_IMAGES = "/org.polarsys.capella.core.sirius.analysis/description/images/";

/**
 * Mappings de ports (chemin tel qu'écrit dans le .aird) : f (description), pre (précondition du mapping), styles
 * (conditionnels dans l'ordre, puis principal) : q (prédicat, '' pour le style principal), c (rang du style conditionnel,
 * -1 pour le principal), t (type Sirius), a (attributs écrits dans le .aird ; workspacePath sans le dossier des images de
 * Capella, STY_IMAGES), taille (largeur et hauteur en unités Sirius).
 */
const STY_MAPPINGS_PORTS = {};   // outils de création : sans objet dans la visionneuse

/**
 * Outils des palettes de Capella qui créent un lien par un service Java connu (EdgeCreationDescription) : f (description),
 * o (nom de l'outil), s (service : createDFFunctionalExchange, createABFunctionalExchange), m (mapping du lien, chemin tel
 * qu'écrit dans le .aird), src / tgt (mappings permis en source et en cible, chemins décodés), pre (précondition),
 * conn (précondition du début du tracé), mpre (précondition du mapping du lien) — expressions transcrites dans 26-diagrammes.js.
 */
const STY_OUTILS_LIENS = [];   // outils de création : sans objet dans la visionneuse

/**
 * Outils des palettes de Capella qui créent un élément dessiné en conteneur (ContainerCreationDescription) ou en nœud
 * (NodeCreationDescription) : g (genre : fonction — getDFTarget, createFunction, allocateToCapability, CreateView ; composant —
 * getABTarget, createComponent et sa Part ; entite — getABTarget, Entity ; allouee — nœud : fonction de la fonction racine
 * allouée au composant visé, CreateView), f (description), o (nom de l'outil), m (mapping créé, chemin tel qu'écrit dans le
 * .aird), pre (précondition de l'outil), mpre (précondition du mapping), st (type du style principal), q (prédicats des
 * styles conditionnels, dans l'ordre), haut (mapping au premier niveau du diagramme), p (mappings qui peuvent le contenir,
 * chemins décodés), n (nature d'un composant physique) — expressions transcrites dans 26-diagrammes.js.
 */
const STY_OUTILS_CONTENEURS = [];   // outils de création : sans objet dans la visionneuse

/**
 * Outils de dépôt depuis l'arborescence (ContainerDropDescription, dragSource PROJECT_EXPLORER) qui ajoutent la vue de
 * l'élément déposé, par représentation où ils servent : g (genre : vue, fonction, part), o (nom), r (représentation, chemin
 * décodé), pre (précondition), diagramme (dépôt sur le fond accepté), conteneurs (mappings, chemins décodés, qui acceptent le
 * dépôt), mappings (vues possibles, dans l'ordre : chemins décodés, décrits dans STY_MAPPINGS_DEPOTS) ; un chemin de la
 * représentation de l'outil est écrit sans elle (« /@defaultLayer/… » : préfixer par r).
 */
const STY_OUTILS_DEPOTS = [];   // outils de création : sans objet dans la visionneuse

/**
 * Types de diagrammes de Capella (DiagramDescription, hors séquences et tableaux) : r (chemin décodé de la description, comme
 * la description d'une représentation du .aird), d (domainClass), pre (précondition sur l'élément cible), titre (titleExpression).
 */
const STY_DIAGRAMMES = [];   // outils de création : sans objet dans la visionneuse

/** Mappings des outils de dépôt (chemin décodé) : d (domainClass), pre (précondition), noeud (DNode, sinon conteneur), q (prédicats des styles conditionnels). */
const STY_MAPPINGS_DEPOTS = {};   // outils de création : sans objet dans la visionneuse

/* ── src/js/25-liaisons.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   25. LIAISONS — relations entre éléments, calculées depuis le XML
   ───────────────────────────────────────────────────────────────────────
   Deux niveaux, comme dans Arcalyse :
   - liaisons métier : allocations, échanges (avec leurs ports remontés à la
     fonction ou au composant), réalisations, implications, déploiements… ;
     l'élément technique qui porte la liaison est gardé comme « via » ;
   - références brutes : tout attribut « #id » sortant, et la navigation inverse
     (qui référence cet élément ?).
   Lecture seule. Ne touche pas au DOM : chargé aussi par les tests Node.
   ═══════════════════════════════════════════════════════════════════════ */

/** Attributs de texte libre : jamais interprétés comme des références, même s'ils commencent par « # ». */
const LIA_ATTRS_TEXTE = new Set(['id', 'xmi:id', 'href', 'name', 'description', 'summary', 'value', 'key', 'sid']);

/** Ports : une liaison qui aboutit à un port aboutit en fait à son propriétaire (fonction, composant). */
const LIA_PORTS = new Set(['FunctionInputPort', 'FunctionOutputPort', 'ComponentPort', 'PhysicalPort']);

/** Allocations connues : type de l'élément de liaison → relation (source = sourceElement, cible = targetElement). */
const LIA_ALLOCATIONS = {
  ComponentFunctionalAllocation: 'allocation', ActivityAllocation: 'allocation',
  ComponentExchangeFunctionalExchangeAllocation: 'alloc-echange', ComponentExchangeAllocation: 'alloc-echange-composant',
  PortAllocation: 'alloc-port', ComponentPortAllocation: 'alloc-port'
};

/** Échanges : type → relation, attributs des extrémités. */
const LIA_ECHANGES = {
  FunctionalExchange: 'echange-fonctionnel', ComponentExchange: 'echange-composants', CommunicationMean: 'moyen-communication'
};

/** Ordre d'affichage des relations (les autres suivent, dans l'ordre de rencontre). */
const LIA_ORDRE = ['source', 'cible', 'allocation', 'echange-fonctionnel', 'echange-composants', 'lien-physique', 'moyen-communication',
  'element-echange', 'alloc-echange', 'alloc-echange-composant', 'alloc-port', 'deploiement', 'implication', 'exploitation',
  'inclusion', 'extension', 'generalisation', 'realisation', 'trace', 'transfo', 'allocation-autre'];

/**
 * Libellé d'une relation vue depuis l'un de ses deux côtés.
 * @param {string} rel clé de relation
 * @param {'sortant'|'entrant'} sens côté de l'élément affiché
 * @returns {string}
 */
function liaLibelle(rel, sens) {
  const s = sens === 'sortant';
  switch (rel) {
    case 'source': return _L('Source');
    case 'cible': return _L('Cible');
    case 'allocation': return s ? _L('Fonctions allouées') : _L('Allouée à');
    case 'echange-fonctionnel': return s ? _L('Échanges fonctionnels sortants') : _L('Échanges fonctionnels entrants');
    case 'echange-composants': return s ? _L('Échanges de composants sortants') : _L('Échanges de composants entrants');
    case 'lien-physique': return _L('Liens physiques');
    case 'moyen-communication': return s ? _L('Moyens de communication sortants') : _L('Moyens de communication entrants');
    case 'element-echange': return s ? _L('Éléments échangés') : _L('Échangé par');
    case 'alloc-echange': return s ? _L('Échanges fonctionnels alloués') : _L('Alloué à l\'échange de composants');
    case 'alloc-echange-composant': return s ? _L('Échanges de composants alloués') : _L('Alloué au lien ou chemin physique');
    case 'alloc-port': return s ? _L('Ports alloués') : _L('Alloué au port');
    case 'deploiement': return s ? _L('Déploie') : _L('Déployé sur');
    case 'implication': return s ? _L('Implique') : _L('Impliqué dans');
    case 'exploitation': return s ? _L('Exploite') : _L('Exploitée par');
    case 'inclusion': return s ? _L('Inclut') : _L('Incluse dans');
    case 'extension': return s ? _L('Étend') : _L('Étendue par');
    case 'generalisation': return s ? _L('Hérite de') : _L('Spécialisé par');
    case 'realisation': return s ? _L('Réalise') : _L('Réalisé par');
    case 'trace': return s ? _L('Trace vers') : _L('Trace depuis');
    case 'transfo': return s ? _L('Lien de transition vers') : _L('Lien de transition depuis');
    default: return s ? _L('Alloue') : _L('Alloué par');
  }
}

/**
 * Identifiants référencés par une valeur d'attribut « #a #b », ou null si ce n'est pas une liste de références.
 * @param {string} nom nom de l'attribut
 * @param {string} v valeur décodée
 * @returns {string[]|null}
 */
function liaRefs(nom, v) {
  if (LIA_ATTRS_TEXTE.has(nom) || !/^#\S+( #\S+)*$/.test(v)) return null;
  return v.split(' ').map(r => r.slice(1));
}

/**
 * Calcule toutes les liaisons du document (une passe, quelques dizaines de ms sur AIDA).
 * @param {object} doc document xtLire
 * @returns {{doc:object, metier:Map, sortantes:Map, entrantes:Map}} index par nœud :
 *   metier → [{rel, sens, autre, via}], sortantes → [{attr, cible|null, id}], entrantes → [{attr, source}]
 */
function liaCalculer(doc) {
  const metier = new Map(), sortantes = new Map(), entrantes = new Map();
  const pousser = (m, el, x) => { const l = m.get(el); if (l) l.push(x); else m.set(el, [x]); };
  const res = id => (id ? doc.parId.get(id.replace(/^#/, '')) || null : null);
  const attr = (el, n) => xtAttr(el, n) || '';
  /** Remonte d'un port à son propriétaire, d'une Part au composant qu'elle type. */
  const proprio = el => {
    if (el && LIA_PORTS.has(modType(el)) && el.parent) el = el.parent;
    if (el && modType(el) === 'Part') el = res(attr(el, 'abstractType')) || el;
    return el;
  };
  /** Ajoute une liaison métier, vue des deux côtés. */
  const lier = (rel, a, b, via) => {
    if (!a || !b || a === b) return;
    pousser(metier, a, { rel, sens: 'sortant', autre: b, via: via || null });
    pousser(metier, b, { rel, sens: rel === 'lien-physique' ? 'sortant' : 'entrant', autre: a, via: via || null });   // lien physique : non orienté
  };
  /** Ajoute une liaison visible d'un seul côté (extrémités d'un échange). */
  const lier1 = (rel, a, b) => { if (a && b) pousser(metier, a, { rel, sens: 'sortant', autre: b, via: null }); };

  xtParcourir(doc.racine, el => {
    if (modId(el) == null) return;
    // Références brutes
    for (const a of el.attrs) {
      const ids = liaRefs(a.n, a.v);
      if (!ids) continue;
      for (const id of ids) {
        const c = doc.parId.get(id) || null;
        pousser(sortantes, el, { attr: a.n, cible: c, id });
        if (c) pousser(entrantes, c, { attr: a.n, source: el });
      }
    }
    // Liaisons métier
    const t = modType(el);
    if (LIA_ECHANGES[t]) {
      const s = proprio(res(attr(el, 'source'))), c = proprio(res(attr(el, 'target')));
      lier(LIA_ECHANGES[t], s, c, el);
      lier1('source', el, s); lier1('cible', el, c);
      for (const id of attr(el, 'exchangedItems').split(/\s+/).filter(Boolean)) lier('element-echange', el, res(id), null);
    } else if (t === 'PhysicalLink') {
      const bouts = attr(el, 'linkEnds').split(/\s+/).filter(Boolean).map(id => proprio(res(id)));
      if (bouts.length === 2) { lier('lien-physique', bouts[0], bouts[1], el); lier1('source', el, bouts[0]); lier1('cible', el, bouts[1]); }
    } else if (xtAttr(el, 'involved') != null && (/Involvement/.test(t) || t === 'FunctionalChainReference')) {
      lier('implication', el.parent, proprio(res(attr(el, 'involved'))), el);
    } else if (t === 'CapabilityExploitation') {
      lier('exploitation', el.parent, res(attr(el, 'capability')), el);
    } else if (t === 'AbstractCapabilityInclude') {
      lier('inclusion', el.parent, res(attr(el, 'included')), el);
    } else if (t === 'AbstractCapabilityExtend') {
      lier('extension', el.parent, res(attr(el, 'extended')), el);
    } else if (t === 'AbstractCapabilityGeneralization' || t === 'Generalization') {
      lier('generalisation', el.parent, res(attr(el, 'super')), el);
    } else if (t === 'PartDeploymentLink') {
      lier('deploiement', proprio(res(attr(el, 'location'))), proprio(res(attr(el, 'deployedElement'))), el);
    } else if (xtAttr(el, 'sourceElement') != null && xtAttr(el, 'targetElement') != null) {
      const rel = LIA_ALLOCATIONS[t] || (t === 'TransfoLink' ? 'transfo' : /Realization$/.test(t) ? 'realisation'
        : /Allocation$/.test(t) ? 'allocation-autre' : 'trace');
      lier(rel, res(attr(el, 'sourceElement')), res(attr(el, 'targetElement')), el);
    }
  });
  return { doc, metier, sortantes, entrantes };
}

/**
 * Liaisons métier d'un élément regroupées par relation et par sens, dans l'ordre d'affichage.
 * @param {object} index résultat de liaCalculer
 * @param {object} el nœud
 * @returns {Array<{rel:string, sens:string, libelle:string, liens:object[]}>}
 */
function liaGroupes(index, el) {
  const groupes = new Map();
  for (const l of index.metier.get(el) || []) {
    const k = l.rel + '|' + l.sens;
    if (!groupes.has(k)) groupes.set(k, { rel: l.rel, sens: l.sens, libelle: liaLibelle(l.rel, l.sens), liens: [] });
    groupes.get(k).liens.push(l);
  }
  const rang = g => { const i = LIA_ORDRE.indexOf(g.rel); return (i < 0 ? LIA_ORDRE.length : i) * 2 + (g.sens === 'sortant' ? 0 : 1); };
  return [...groupes.values()].sort((a, b) => rang(a) - rang(b));
}

/* ── src/js/26-diagrammes.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   26. DIAGRAMMES — lecture du .aird (lecture seule, sans DOM)
   ───────────────────────────────────────────────────────────────────────
   Le .aird (Sirius) contient, pour chaque représentation :
   - un descripteur (DRepresentationDescriptor : nom, type, élément cible) ;
   - le diagramme Sirius (DDiagramElement : élément représenté, libellé, style) ;
   - sa notation GMF (notation:Diagram : positions et tailles, points des liens).
   diaLire indexe les représentations ; diaScene calcule, à la demande, la scène
   d'un diagramme en coordonnées absolues (formes et liens), prête à dessiner.
   Le .aird est lu par xtLire (même tokenizer sans perte que le .capella).
   Ne dépend que de 10-xml-texte.js et 23-styles-capella.js (chargés aussi par les tests Node).
   ═══════════════════════════════════════════════════════════════════════ */

/** Sigles Capella des types de représentation (nom de la description Sirius → sigle). */
const DIA_SIGLES = {
  'Operational Entity Breakdown': 'OEBD', 'Operational Entity Blank': 'OAB', 'Operational Activity Breakdown': 'OABD',
  'Operational Activity Interaction Blank': 'OAIB', 'Operational Process Description': 'OPD', 'Operational Capabilities Blank': 'OCB',
  'Operational Interaction Scenario': 'OES', 'Operational Activity Interaction Scenario': 'OAS', 'Operational Role Blank': 'ORB',
  'Missions Capabilities Blank': 'MCB', 'Contextual Mission': 'CM', 'Contextual Capability': 'CC', 'Contextual System Actors': 'CSA',
  'System Function Breakdown': 'SFBD', 'System Data Flow Blank': 'SDFB', 'System Architecture Blank': 'SAB',
  'Logical Function Breakdown': 'LFBD', 'Logical Data Flow Blank': 'LDFB', 'Logical Architecture Blank': 'LAB',
  'Logical Component Breakdown': 'LCBD', 'Physical Function Breakdown': 'PFBD', 'Physical Data Flow Blank': 'PDFB',
  'Physical Architecture Blank': 'PAB', 'Physical Component Breakdown': 'PCBD', 'Physical Path Description': 'PPD',
  'EPBS Architecture Blank': 'EAB', 'EPBS Architecture Breakdown': 'EABD', 'Functional Chain Description': 'FCD',
  'Class Diagram Blank': 'CDB', 'Mode State Machine': 'MSM', 'Contextual Component Detailed Interfaces': 'CDI',
  'Contextual Component External Interfaces': 'CEI', 'Contextual Component Internal Interfaces': 'CII',
  'Component Exchanges Scenario': 'ES', 'Functional Scenario': 'FS', 'Interface Scenario': 'IS', 'Exchange Scenario': 'ES',
  'Interfaces Diagram Blank': 'IDB', 'Contextual Operational Capability': 'COC',
  // Titres des descriptions de Capella 7.0.1 (titleExpression des .odesign)
  'Missions Blank': 'MB', 'Capability Realization Blank': 'CRB', 'Contextual Capability Realization Involvement': 'CRI',
  'Capability Realization Refinement': 'CRR', 'Component Interfaces Scenario': 'IS', 'Activity Interaction Scenario': 'OAS',
  'Configuration Items Breakdown': 'CIBD', 'Modes & States': 'M&S', 'Package Dependencies': 'PD', 'Interface Delegations': 'ID', 'Interface Diagram': 'ID'
};

/** Décalage du compartiment d'un conteneur Sirius : origine de ses enfants par rapport au coin du conteneur
 * (mesuré sur les points de passage des liens, qui sont exprimés à la fois depuis la source et depuis la cible). */
const DIA_COMPARTIMENT = { x: 5, y: 6 };
/** Unité de taille des nœuds Sirius (DNode width / height) en pixels. */
const DIA_UNITE = 10;

/**
 * Identifiant visé par une référence href (« fichier.capella#id » → « id »).
 * @param {string|undefined} href référence
 * @returns {string} identifiant, ou ''
 */
function diaHrefId(href) {
  const k = href ? href.lastIndexOf('#') : -1;
  return k >= 0 ? href.slice(k + 1) : '';
}

/**
 * Premier enfant d'une balise donnée.
 * @param {object} el nœud
 * @param {string} tag balise
 * @returns {object|undefined}
 */
function diaEnfant(el, tag) { return el.enfants.find(c => c.tag === tag); }

/**
 * Couleur Sirius « r,g,b » en couleur CSS.
 * @param {string|undefined} v valeur Sirius
 * @param {string} defaut couleur CSS si absente
 * @returns {string}
 */
function diaCouleur(v, defaut) {
  return v && /^\d+,\d+,\d+$/.test(v) ? 'rgb(' + v + ')' : defaut;
}

/**
 * Couleur GMF (entier : rouge dans l'octet de poids faible) en couleur CSS.
 * @param {string|undefined} v valeur GMF
 * @param {string} defaut couleur CSS si absente
 * @returns {string}
 */
function diaCouleurGmf(v, defaut) {
  if (v == null || !/^\d+$/.test(v)) return defaut;
  const n = +v;
  return `rgb(${n & 255},${(n >> 8) & 255},${(n >> 16) & 255})`;
}

/**
 * Nom d'un élément d'une description Sirius cité par son href (« …[name='SC_System'] » → « SC_System »).
 * @param {string|undefined} href référence vers un fichier .odesign
 * @param {string} quoi nature cherchée (« ownedRepresentations », « nodeMappings »…), ou '' pour le dernier nommé
 * @returns {string}
 */
function diaNomDescription(href, quoi) {
  if (!href) return '';
  const re = /@(\w+)\[name='([^']*)'\]/g;
  let m, nom = '';
  while ((m = re.exec(href))) if (!quoi || m[1] === quoi) nom = m[2];
  try { return decodeURIComponent(nom); } catch (e) { return nom; }
}

/**
 * Sigle d'un type de représentation : table Capella, sinon initiales.
 * @param {string} type nom de la description Sirius
 * @returns {string}
 */
function diaSigle(type) {
  return DIA_SIGLES[type] || type.split(/\s+/).map(m => m[0] || '').join('').toUpperCase();
}

/**
 * Lit un .aird et indexe ses représentations.
 * @param {string} texte contenu du .aird
 * @returns {{doc:object, reps:object[], parUid:Map, parVue:Map, cibles:Map, presences:Map, ressources:string[]}}
 *   reps : { uid, nom, type, sigle, genre ('diagramme' | 'sequence' | 'tableau' | 'autre'), croise, cibleId, noeud } ;
 *   cibles : id d'élément → représentations dont il est la cible ;
 *   presences : id d'élément → représentations où il est dessiné (diagrammes) ou listé (tableaux : lignes, colonnes, cellules).
 */
function diaLire(texte) {
  const doc = xtLire(texte);
  doc.largeur = Infinity;                            // Sirius écrit le .aird sans retour à la ligne dans les balises
  const parUid = new Map(), parVue = new Map(), descripteurs = [], ressources = [];
  xtParcourir(doc.racine, el => {
    const u = xtAttr(el, 'uid'); if (u) parUid.set(u, el);
    const x = xtAttr(el, 'xmi:id'); if (x) parVue.set(x, el);
    if (el.tag === 'ownedRepresentationDescriptors') descripteurs.push(el);
    else if (el.tag === 'semanticResources' && el.texte) ressources.push(el.texte);
  });
  const reps = [], cibles = new Map(), presences = new Map();
  const ajouter = (m, id, r) => { if (!id) return; let s = m.get(id); if (!s) m.set(id, s = new Set()); s.add(r); };
  for (const d of descripteurs) {
    const desc = diaEnfant(d, 'description');
    const href = desc ? xtAttr(desc, 'href') : '';
    const type = diaNomDescription(href, 'ownedRepresentations') || diaNomDescription(href, '');
    const dt = desc ? xtAttr(desc, 'xmi:type') || '' : '';
    const noeud = parUid.get((xtAttr(d, 'repPath') || '').replace(/^#/, '')) || null;
    const r = {
      uid: xtAttr(d, 'uid') || '', nom: xtAttr(d, 'name') || '', type, sigle: diaSigle(type), description: diaDecoderChemin(href),
      genre: /Sequence/.test(dt) ? 'sequence' : /Table/.test(dt) ? 'tableau' : /DiagramDescription/.test(dt) ? 'diagramme' : 'autre',
      croise: /CrossTable/.test(dt),                    // tableau croisé (sinon tableau d'édition)
      cibleId: diaHrefId(xtAttr(diaEnfant(d, 'target') || { attrs: [] }, 'href')), noeud, scene: null
    };
    reps.push(r);
    ajouter(cibles, r.cibleId, r);
    if (noeud) {
      // Éléments dessinés (diagrammes) ; lignes, colonnes et cellules (tableaux)
      const balises = r.genre === 'tableau' ? /^(lines|columns|cells)$/ : /^(ownedDiagramElements|ownedBorderedNodes|ownedElements)$/;
      xtParcourir(noeud, el => {
        if (!balises.test(el.tag)) return;
        const t = diaEnfant(el, 'target');
        if (t) ajouter(presences, diaHrefId(xtAttr(t, 'href')), r);
      });
    }
  }
  return { doc, reps, parUid, parVue, cibles, presences, ressources };
}

/* ─────────────────────────────── Scène ─────────────────────────────── */

/**
 * Indique si un élément de diagramme est masqué : invisible (Sirius ou GMF), filtré (HideFilter),
 * ou replié (CollapseFilter, sauf si on garde les éléments repliés).
 * @param {object} vue nœud GMF
 * @param {object|undefined} s élément Sirius
 * @param {boolean} [garderReplis] un élément replié n'est pas masqué (formes : ses liens restent)
 * @returns {boolean}
 */
function diaMasque(vue, s, garderReplis) {
  if (xtAttr(vue, 'visible') === 'false') return true;
  if (!s) return false;
  if (xtAttr(s, 'visible') === 'false') return true;
  return s.enfants.some(c => c.tag === 'graphicalFilters' && (garderReplis ? /HideFilter/ : /HideFilter|CollapseFilter/).test(xtAttr(c, 'xmi:type') || ''));
}

/**
 * Indique si un élément Sirius est replié (CollapseFilter : ports masqués par un filtre de Capella). Il n'est pas
 * dessiné, mais ses liens restent, accrochés à sa position.
 * @param {object} s élément Sirius
 * @returns {boolean}
 */
function diaReplie(s) {
  return s.enfants.some(c => c.tag === 'graphicalFilters' && /CollapseFilter/.test(xtAttr(c, 'xmi:type') || ''));
}

/**
 * Position et taille déclarées d'une vue GMF (Bounds / Location). Taille -1 = calculée.
 * @param {object} vue nœud GMF
 * @returns {{x:number, y:number, w:number, h:number}}
 */
function diaBornes(vue) {
  const l = diaEnfant(vue, 'layoutConstraint');
  const v = (n, d) => { const a = l ? xtAttr(l, n) : undefined; return a != null && a !== '' ? +a : d; };
  return { x: v('x', 0), y: v('y', 0), w: v('width', -1), h: v('height', -1) };
}

/**
 * Police d'une vue GMF : taille en pixels, gras, italique, couleur.
 * @param {object} vue nœud GMF
 * @param {object|undefined} style style Sirius (labelFormat, labelColor)
 * @returns {{taille:number, gras:boolean, italique:boolean, couleur:string}}
 */
function diaPolice(vue, style) {
  const st = vue.enfants.find(c => c.tag === 'styles' && /ShapeStyle|FontStyle/.test(xtAttr(c, 'xmi:type') || ''));
  const pt = st && xtAttr(st, 'fontHeight') ? +xtAttr(st, 'fontHeight') : 9;
  const formats = style ? style.enfants.filter(c => c.tag === 'labelFormat').map(c => c.texte || '') : [];
  return {
    taille: Math.round(pt * 4 / 3 * 10) / 10,
    gras: (st && xtAttr(st, 'bold') === 'true') || formats.includes('bold'),
    italique: (st && xtAttr(st, 'italic') === 'true') || formats.includes('italic'),
    couleur: diaCouleur(style && xtAttr(style, 'labelColor'), st ? diaCouleurGmf(xtAttr(st, 'fontColor'), '#000') : '#000')
  };
}

/**
 * Place horizontale de l'icône d'un libellé (icône et espace), pour les tailles calculées par Sirius.
 * @param {object} f forme (icone, police)
 * @returns {number} pixels
 */
function diaPlaceIcone(f) { return f.icone ? Math.round(f.police.taille * 1.2) + 3 : 0; }

/**
 * Largeur estimée d'un texte (sans mesure DOM).
 * @param {string} t texte
 * @param {number} taille taille de police en pixels
 * @returns {number}
 */
function diaLargeurTexte(t, taille) { return String(t).length * taille * 0.56; }

/**
 * Nombre de lignes d'un texte replié à une largeur (mots entiers, mot trop long coupé), d'après la largeur estimée.
 * @param {string} t texte
 * @param {number} largeur largeur disponible
 * @param {number} taille taille de police
 * @returns {number}
 */
function diaNbLignes(t, largeur, taille) {
  largeur = Math.max(largeur, taille);               // largeur nulle ou négative : une lettre par ligne, pas de boucle sans fin
  let n = 1, l = 0;
  const esp = diaLargeurTexte(' ', taille);
  for (const mot of String(t).split(/\s+/).filter(Boolean)) {
    const m = diaLargeurTexte(mot, taille);
    if (l && l + esp + m > largeur) { n++; l = 0; }
    l = l ? l + esp + m : m;
    while (l > largeur * 1.05) { n++; l -= largeur; }
  }
  return n;
}

/**
 * Calcule la scène d'un diagramme : formes (conteneurs, nœuds, ports, listes, notes) dans l'ordre
 * de dessin, liens avec leurs points absolus, et cadre englobant. Mise en cache sur la représentation.
 * Forme : { vue, genre, x, y, w, h, semId, typeSem, texte, police, fond, fond2, bord, epBord, figure, arrondi (rayon des angles),
 *   image, posTexte ('centre' | 'haut' | 'dessous' | 'bord' | 'aucun'), alignTexte, tx, ty, parent }.
 * Lien : { vue, semId, typeSem, points, recalees (extrémités recalées sur leur forme), source, cible (formes), couleur, epaisseur, trait, flecheCible, flecheSource,
 *   texte, texteDebut, texteFin, police, decalages (enregistrés par GMF, à placer par diaEtiquette) }.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @returns {{formes:object[], liens:object[], cadre:{x:number,y:number,w:number,h:number}}|null} null si non dessinable
 */
function diaScene(aird, rep) {
  if (rep.scene) return rep.scene;
  if (!rep.noeud || rep.genre === 'tableau') return null;
  let notation = null;
  for (const a of rep.noeud.enfants) {
    if (a.tag === 'ownedAnnotationEntries' && xtAttr(a, 'source') === 'GMF_DIAGRAMS') { notation = diaEnfant(a, 'data'); break; }
  }
  if (!notation) return null;
  const formes = [], liens = [], parVue = new Map(), sequence = rep.genre === 'sequence';

  /** Élément sémantique d'un élément Sirius : identifiant et type court. */
  const semantique = s => {
    const t = s && diaEnfant(s, 'target');
    if (!t) return { semId: '', typeSem: '' };
    const ty = xtAttr(t, 'xmi:type') || '';
    return { semId: diaHrefId(xtAttr(t, 'href')), typeSem: ty.slice(ty.lastIndexOf(':') + 1) };
  };

  /**
   * Place une vue GMF et ses enfants.
   * @param {object} vue nœud GMF
   * @param {number} ox abscisse de l'origine (coin du parent ou de son compartiment)
   * @param {number} oy ordonnée de l'origine
   * @param {object|null} parent forme parente
   */
  const placer = (vue, ox, oy, parent) => {
    const type = xtAttr(vue, 'type') || '';
    if (type === 'Note' || type === 'Text') { placerNote(vue, ox, oy, type); return; }
    const s = aird.parUid.get(xtAttr(vue, 'element'));
    if (!s || diaMasque(vue, s, true)) return;
    const st = xtAttr(s, 'xmi:type') || '';
    const genre = /DNodeContainer/.test(st) ? 'conteneur' : /DNodeListElement/.test(st) ? 'ligne' : /DNodeList/.test(st) ? 'liste'
      : /DNode/.test(st) ? (/^30(01|12)$/.test(type) ? 'port' : 'noeud') : '';
    if (!genre) return;
    const b = diaBornes(vue), style = diaEnfant(s, 'ownedStyle');
    const sty = style ? xtAttr(style, 'xmi:type') || '' : '';
    const f = {
      vue: xtAttr(vue, 'xmi:id'), uid: xtAttr(s, 'uid'), genre, x: ox + b.x, y: oy + b.y, w: b.w, h: b.h, parent,
      ...semantique(s), texte: xtAttr(s, 'name') || '', police: diaPolice(vue, style),
      fond: '#fff', fond2: '', bord: '#888', epBord: 1, figure: 'rect', image: '', posTexte: 'centre', alignTexte: 'centre', tx: 0, ty: 0,
      mapping: diaNomDescription(xtAttr(diaEnfant(s, 'actualMapping') || { attrs: [] }, 'href'), '')
    };
    f.arrondi = (STY_ARRONDIS[f.mapping] || 0) / 2;              // angles arrondis de la description Capella
    // Icône dans le libellé : showIcon du style calculé (style conditionnel compris), sinon celui de la description
    f.icone = style ? xtAttr(style, 'showIcon') !== 'false' : !STY_SANS_ICONE.has(f.mapping);
    // Style Sirius
    if (style) {
      const a = n => xtAttr(style, n);
      f.epBord = a('borderSize') != null ? +a('borderSize') : 1;
      f.bord = diaCouleur(a('borderColor'), '#000');
      if (/FlatContainerStyle/.test(sty)) {
        f.fond = diaCouleur(a('backgroundColor'), '#fff');
        f.fond2 = diaCouleur(a('foregroundColor'), 'rgb(209,209,209)');
        if (a('backgroundStyle') === 'Liquid' || a('backgroundStyle') === 'GradientTopToBottom') f.degrade = 'vertical';
        else f.degrade = 'horizontal';
      } else if (/Square|Lozenge|Ellipse|Dot|BundledImage/.test(sty)) {
        f.fond = diaCouleur(a('color'), 'rgb(136,136,136)');
        f.figure = /Lozenge/.test(sty) ? 'losange' : /Ellipse|Dot/.test(sty) ? 'ellipse' : 'rect';
        if (/BundledImage/.test(sty)) f.figure = (a('shape') || 'square').toLowerCase();
      } else if (/WorkspaceImage/.test(sty)) {
        f.figure = 'image';
        f.image = (a('workspacePath') || '').replace(/^.*\//, '').replace(/\.\w+$/, '');
        // Image propre au projet (pas une image des plugins de Capella ou de Sirius) : chemin dans l'espace de travail
        if (!/^\/?(org\.polarsys|org\.eclipse)\./.test(a('workspacePath') || '')) f.cheminImage = a('workspacePath') || '';
        f.bord = diaCouleur(a('borderColor'), '');
      }
      if (/ListContainerStyle/.test(sty)) { f.fond = diaCouleur(a('backgroundColor'), '#fff'); f.fond2 = diaCouleur(a('foregroundColor'), ''); }
      // Étiquette masquée : visibilité du nœud d'étiquette GMF (type 50xx) quand il existe ; hideLabelByDefault n'est
      // que la valeur appliquée à la création (Capella affiche une étiquette rendue visible depuis)
      const nomGmf = vue.enfants.find(c => c.tag === 'children' && /^50\d\d$/.test(xtAttr(c, 'type') || '') && !xtAttr(c, 'element'));
      if (nomGmf ? xtAttr(nomGmf, 'visible') === 'false' : a('hideLabelByDefault') === 'true') f.posTexte = 'aucun';
      if (a('labelAlignment') === 'LEFT') f.alignTexte = 'gauche';
      else if (a('labelAlignment') === 'RIGHT') f.alignTexte = 'droite';
      if (f.posTexte !== 'aucun') {
        if (genre === 'conteneur' || genre === 'liste') f.posTexte = 'haut';
        else if (genre === 'ligne') { f.posTexte = 'centre'; f.alignTexte = 'gauche'; }
        else if (a('labelPosition') !== 'node' || f.figure === 'image') f.posTexte = genre === 'port' ? 'bord' : 'dessous';
      }
    }
    if (s.enfants.some(c => c.tag === 'graphicalFilters' && /HideLabelFilter/.test(xtAttr(c, 'xmi:type') || ''))) f.posTexte = 'aucun';
    if (diaReplie(s)) { f.replie = true; f.posTexte = 'aucun'; }   // replié : non dessiné, ses liens restent
    // Diagramme de séquence : l'exécution racine d'une instance est sa ligne de vie (trait vertical en tirets)
    if (/^default ?execution/i.test(f.mapping)) { f.figure = 'vie'; f.posTexte = 'aucun'; }
    // Fragments de séquence : combiné (opérateur dans l'onglet), opérande (garde), référence (scénario cité)
    if (sequence) {
      f.sequence = true;
      if (f.typeSem === 'CombinedFragment') { f.fragment = 'combine'; f.operateur = f.texte.trim(); }
      else if (f.typeSem === 'InteractionOperand') f.fragment = 'operande';
      else if (f.typeSem === 'InteractionUse') { f.fragment = 'reference'; f.operateur = f.texte.trim() || 'ref'; }
      if (/endOfLife/i.test(f.mapping)) f.finDeVie = true;
    }
    // Région d'un état (conteneur empilé) : Capella affiche son libellé (« [region] ») en haut à gauche
    if (parent && parent.pile) f.region = true;
    const presentation = xtAttr(s, 'childrenPresentation') || '';
    if (genre === 'conteneur' && /Stack/.test(presentation)) f.pile = /Horizontal/.test(presentation) ? 'horizontale' : 'verticale';
    // Position de l'étiquette externe (nœud GMF 5xxx sans élément)
    const lab = vue.enfants.find(c => c.tag === 'children' && /^5\d{3}$/.test(xtAttr(c, 'type') || ''));
    if (lab) { const lb = diaBornes(lab); f.tx = lb.x; f.ty = lb.y; f.etiquette = true; }
    // Taille par défaut d'un nœud : DNode width / height (unités Sirius)
    if (genre === 'noeud' || genre === 'port') {
      const sw = +(xtAttr(s, 'width') || (style && xtAttr(style, 'width')) || 0), sh = +(xtAttr(s, 'height') || (style && xtAttr(style, 'height')) || 0);
      if (f.w <= 0) f.w = sw > 0 ? sw * DIA_UNITE : (genre === 'port' ? 10 : 40);
      if (f.h <= 0) f.h = sh > 0 ? sh * DIA_UNITE : (genre === 'port' ? 10 : 40);
    }
    parVue.set(f.vue, f);
    formes.push(f);
    // Enfants : compartiment (conteneur, liste), puis nœuds en bordure
    const enfants = vue.enfants.filter(c => c.tag === 'children');
    const comp = enfants.filter(c => /^7\d{3}$/.test(xtAttr(c, 'type') || ''));
    if (genre === 'liste') {
      const lignes = [];
      for (const c of comp) for (const l of c.enfants) if (l.tag === 'children') lignes.push(l);
      const hl = f.police.taille + 6;
      let cumul = 0, larg = diaLargeurTexte(f.texte, f.police.taille) + 16 + diaPlaceIcone(f);
      for (const l of lignes) {
        const n = formes.length;
        placer(l, f.x + 4, f.y + hl + 4 + cumul, f);
        const fl = formes[n];
        if (n < formes.length && fl.genre === 'ligne') {
          // Largeur de la liste enregistrée : comme Capella, une ligne trop longue se replie (hauteur en conséquence)
          const nb = f.w > 0 ? Math.min(6, diaNbLignes(fl.texte, f.w - 14 - diaPlaceIcone(fl), fl.police.taille)) : 1;
          fl.y = f.y + hl + 4 + cumul; fl.x = f.x + 4; fl.h = hl + (nb - 1) * fl.police.taille * 1.25;
          // Marge : estimation sans mesure, qui sous-évalue les majuscules
          larg = Math.max(larg, diaLargeurTexte(fl.texte, fl.police.taille) * 1.25 + 16 + diaPlaceIcone(fl));
          cumul += fl.h;
        }
      }
      if (f.w <= 0) f.w = Math.max(80, larg);
      if (f.h <= 0) f.h = hl + 8 + cumul;
      for (const fl of formes) if (fl.parent === f && fl.genre === 'ligne') fl.w = f.w - 8;
    } else if (f.pile) {
      // Conteneur empilé (état et ses régions) : Sirius dispose les enfants sous le titre, l'un après l'autre,
      // sans position enregistrée ; chaque enfant prend toute la largeur (ou la hauteur) disponible
      const entete = f.posTexte === 'aucun' ? 2 : f.police.taille + 8, blocs = [];
      for (const c of comp) for (const x of c.enfants) {
        if (x.tag !== 'children') continue;
        const n0 = formes.length;
        placer(x, 0, 0, f);
        if (formes.length > n0) blocs.push([n0, formes.length]);
      }
      let pos = 0, epais = 0;
      for (const [n0, n1] of blocs) {
        const b = formes[n0], dx = f.x + 1 + (f.pile === 'horizontale' ? pos : 0) - b.x, dy = f.y + entete + (f.pile === 'verticale' ? pos : 0) - b.y;
        for (let k = n0; k < n1; k++) { formes[k].x += dx; formes[k].y += dy; }
        pos += f.pile === 'verticale' ? b.h : b.w;
        epais = Math.max(epais, f.pile === 'verticale' ? b.w : b.h);
      }
      if (f.w <= 0) f.w = Math.max(f.pile === 'verticale' ? epais : pos, diaLargeurTexte(f.texte, f.police.taille) + 16) + 2;
      if (f.h <= 0) f.h = entete + (f.pile === 'verticale' ? pos : epais) + 2;
      // Les enfants s'étirent sur toute l'épaisseur du conteneur
      for (const [n0] of blocs) { if (f.pile === 'verticale') formes[n0].w = f.w - 2; else formes[n0].h = f.h - entete - 1; formes[n0].calculee = true; }
      if (blocs.length) formes[blocs[0][0]].premiere = true;     // première région : séparée du titre par un trait plein
    } else {
      // Séquence : les opérandes d'un fragment combiné sont posés depuis le coin du fragment (sans décalage
      // de compartiment) et occupent toute sa largeur
      const origine = sequence && f.fragment === 'combine' ? { x: 0, y: 0 } : DIA_COMPARTIMENT;
      for (const c of comp) for (const x of c.enfants) if (x.tag === 'children') placer(x, f.x + origine.x, f.y + origine.y, f);
      if (origine !== DIA_COMPARTIMENT) {
        const operandes = formes.filter(g => g.parent === f && g.fragment === 'operande').sort((a, b) => a.y - b.y);
        operandes.forEach((g, i) => { g.x = f.x; g.w = f.w; g.premier = i === 0; });
      }
      if (genre === 'conteneur' && (f.w <= 0 || f.h <= 0)) {
        // Taille calculée : englobe le contenu et le titre
        let r = f.x + Math.max(60, diaLargeurTexte(f.texte, f.police.taille) + 20 + diaPlaceIcone(f)), bas = f.y + f.police.taille + 24;
        for (const g of formes) if (g.parent === f && g.genre !== 'port') { r = Math.max(r, g.x + g.w + 10); bas = Math.max(bas, g.y + g.h + 10); }
        if (f.w <= 0) f.w = r - f.x;
        if (f.h <= 0) f.h = bas - f.y;
      }
    }
    if (b.w <= 0 || b.h <= 0) f.calculee = true;        // taille estimée ici : son centre est approché
    if (f.w <= 0) f.w = 40;
    if (f.h <= 0) f.h = 20;
    const avantPorts = formes.length;
    for (const c of enfants) {
      const t = xtAttr(c, 'type') || '';
      if (!/^30(01|12)$/.test(t)) continue;
      const n0 = formes.length;
      placer(c, f.x, f.y, f);
      // Séquence : Sirius recalcule l'abscisse des lignes de vie, exécutions et états (x enregistré non fiable) :
      // centrés sous l'instance ou sur leur ligne de vie ; une exécution imbriquée est décalée d'une demi-largeur
      if (sequence && formes.length > n0) {
        const b = formes[n0], imbrique = f.genre === 'port' && f.figure !== 'vie' && b.w < f.w + 4 && b.figure !== 'ellipse' && b.w <= 20;
        const dx = f.x + f.w / 2 - b.w / 2 + (imbrique ? f.w / 2 : 0) - b.x;
        for (let k = n0; k < formes.length; k++) formes[k].x += dx;
      }
    }
    // Taille calculée par Sirius (non enregistrée) : les ports posés sur le bord droit ou bas la révèlent
    // (position relative = largeur − taille du port)
    if (!sequence && (b.w <= 0 || b.h <= 0)) {
      for (let k = avantPorts; k < formes.length; k++) {
        const p = formes[k];
        if (p.parent !== f) continue;
        if (b.w <= 0 && p.x + p.w > f.x + f.w) f.w = p.x + p.w - f.x;
        if (b.h <= 0 && p.y + p.h > f.y + f.h) f.h = p.y + p.h - f.y;
      }
    }
  };

  /** Place une note GMF (texte libre du diagramme). */
  const placerNote = (vue, ox, oy, type) => {
    if (xtAttr(vue, 'visible') === 'false') return;
    const b = diaBornes(vue);
    // Texte et couleurs : sur le style (ShapeStyle) ou directement sur la vue (notation:Shape)
    const st = vue.enfants.find(c => c.tag === 'styles' && /ShapeStyle/.test(xtAttr(c, 'xmi:type') || '')) || vue;
    const texte = xtAttr(st, 'description') || xtAttr(vue, 'description') || '';
    const f = {
      vue: xtAttr(vue, 'xmi:id'), uid: '', genre: 'note', x: ox + b.x, y: oy + b.y, w: b.w > 0 ? b.w : 120, h: b.h > 0 ? b.h : 50, parent: null,
      semId: '', typeSem: '', texte, police: diaPolice(vue, null),
      fond: type === 'Text' ? 'none' : diaCouleurGmf(xtAttr(st, 'fillColor'), 'rgb(255,255,206)'), fond2: '',
      bord: type === 'Text' ? 'none' : diaCouleurGmf(xtAttr(st, 'lineColor'), '#999'), epBord: 1,
      figure: 'note', image: '', posTexte: 'note', alignTexte: 'gauche', tx: 0, ty: 0, mapping: ''
    };
    // Note liée à un diagramme (« representationlink ») : son élément est le descripteur de la représentation citée
    const lie = xtAttr(vue, 'element');
    const rep = lie && aird.reps.find(r => r.uid === lie || (r.noeud && xtAttr(r.noeud, 'uid') === lie));
    if (rep) f.lienDiagramme = rep.uid;
    parVue.set(f.vue, f);
    formes.push(f);
  };

  for (const c of notation.enfants) if (c.tag === 'children') placer(c, 0, 0, null);

  // Liens
  for (const e of notation.enfants) {
    if (e.tag !== 'edges' || xtAttr(e, 'visible') === 'false') continue;
    const src = parVue.get(xtAttr(e, 'source')), cib = parVue.get(xtAttr(e, 'target'));
    if (!src || !cib) continue;
    const typeVue = xtAttr(e, 'type') || '';
    const s = aird.parUid.get(xtAttr(e, 'element'));
    if (typeVue !== 'NoteAttachment' && (!s || diaMasque(e, s))) continue;
    const style = s && diaEnfant(s, 'ownedStyle');
    const a = n => (style ? xtAttr(style, n) : undefined);
    /** Point de référence d'une ancre : position relative (IdentityAnchor « (0.5,0.3) »), centre par défaut. */
    const ancre = (tag, f) => { const [fx, fy] = diaFraction(e, tag); return [f.x + f.w * fx, f.y + f.h * fy]; };
    const rs = ancre('sourceAnchor', src), rc = ancre('targetAnchor', cib);
    const bp = diaEnfant(e, 'bendpoints'), brut = bp ? xtAttr(bp, 'points') || '' : '';
    // Chaque point est enregistré depuis l'ancre source et depuis l'ancre cible : on part de l'extrémité dont la
    // taille est enregistrée (son ancre est exacte). En séquence, les messages sont recalculés (diaPointsMessage).
    const bruts = brut.split('$').map(p => p.replace(/[[\]\s]/g, '').split(',').map(Number)).filter(p => p.length === 4 && p.every(Number.isFinite));
    const depuisCible = src.calculee && !cib.calculee;
    let points = bruts.map(p => (depuisCible ? [rc[0] + p[2], rc[1] + p[3]] : [rs[0] + p[0], rs[1] + p[1]]));
    // Comme GMF, les extrémités suivent les formes : une extrémité écartée de sa forme (points périmés,
    // diagramme réarrangé par Capella à l'ouverture) est recalée sur le bord ; si les deux le sont, trait direct
    const ecart = (p, f) => Math.hypot(Math.max(f.x - p[0], 0, p[0] - f.x - f.w), Math.max(f.y - p[1], 0, p[1] - f.y - f.h)) > 3;
    let recalees = 0;
    const mapping = s ? diaNomDescription(xtAttr(diaEnfant(s, 'actualMapping') || { attrs: [] }, 'href'), '') : '';
    const crochet = /BracketEdgeStyle/.test(style ? xtAttr(style, 'xmi:type') || '' : '');
    const message = sequence && typeVue !== 'NoteAttachment' && !crochet ? diaGenreMessage(mapping, a('lineStyle')) : '';
    if (crochet && sequence) {
      points = [];                                     // contrainte de durée : tracée après le recalage des points d'observation
    } else if (message) {
      // Message de séquence : Sirius recalcule les abscisses ; seules les ordonnées enregistrées sont fiables
      points = diaPointsMessage(src, cib, bruts.length ? [rs[1] + bruts[0][1], rs[1] + bruts[bruts.length - 1][1]] : null);
      if (message === 'destruction' && cib.finDeVie) cib.detruite = true;
    } else if (a('routingStyle') === 'tree') {
      // Routage en arbre : recalculé par Sirius à l'affichage (points enregistrés périmés) ; du haut de l'enfant
      // au bas du parent, avec un palier horizontal à mi-hauteur
      const [h, b] = src.y >= cib.y + cib.h ? [cib, src] : [src, cib];
      const xh = h.x + h.w / 2, xb = b.x + b.w / 2, ym = (h.y + h.h + b.y) / 2;
      points = [[xb, b.y], [xb, ym], [xh, ym], [xh, h.y + h.h]];
      if (h === src) points.reverse();
    } else if (points.length >= 3 && !sequence && a('routingStyle') === 'manhattan') {
      // Routage orthogonal : tracé enregistré gardé, segments extrêmes recalés sur leurs formes à angle droit
      recalees = ecart(points[0], src) + ecart(points[points.length - 1], cib);
      points = diaOrthogonaliser(points, src, cib);
    } else if (points.length >= 2 && !sequence) {
      const e0 = ecart(points[0], src), e1 = ecart(points[points.length - 1], cib);
      recalees = e0 + e1;
      if (e0 && e1) points = [];
      else if (e0) points[0] = diaBordVers(src, points[1]);
      else if (e1) points[points.length - 1] = diaBordVers(cib, points[points.length - 2]);
      // Comme les ancres de GMF : une extrémité dont le segment traverse sa forme (ancre d'une forme de taille
      // calculée, « (0.5,0.0) » d'un état relié par le bas…) glisse jusqu'au point où le segment en sort
      // Sans point intermédiaire, GMF trace la droite entre les points de référence des deux ancres, coupée aux bords
      // (les points enregistrés ne servent pas) ; le routage orthogonal ajoute ses coudes : non concerné
      if (points.length === 2 && !e0 && !e1 && a('routingStyle') !== 'manhattan' && src !== cib) points = [rs.slice(), rc.slice()];
      // Routage orthogonal à deux points non alignés : le routeur de GMF ajoute un coude (d'abord dans le sens de la
      // sortie : horizontal depuis un côté gauche ou droit, vertical depuis le haut ou le bas)
      else if (points.length === 2 && a('routingStyle') === 'manhattan' && src !== cib) {
        const [p, q] = points;
        if (Math.abs(p[0] - q[0]) > 1 && Math.abs(p[1] - q[1]) > 1) {
          const lateral = Math.min(Math.abs(p[0] - src.x), Math.abs(p[0] - src.x - src.w)) < Math.min(Math.abs(p[1] - src.y), Math.abs(p[1] - src.y - src.h));
          points = [p, lateral ? [q[0], p[1]] : [p[0], q[1]], q];
        }
      }
      if (points.length >= 2) {
        points[0] = diaSortie(src, points[0], points[1]);
        const n = points.length;
        points[n - 1] = diaSortie(cib, points[n - 1], points[n - 2]);
      }
    }
    if (points.length < 2 && !(crochet && sequence)) points = [diaBordVers(src, rc), diaBordVers(cib, rs)];
    const etiquettes = e.enfants.filter(c => c.tag === 'children');
    const decalage = t => { const l = etiquettes.find(c => xtAttr(c, 'type') === t); if (!l) return [0, 0]; const b = diaBornes(l); return [b.x, b.y]; };
    const bornesCentre = (() => { const l = etiquettes.find(c => xtAttr(c, 'type') === '6001'); return l ? diaBornes(l) : null; })();
    const centre = style && diaEnfant(style, 'centerLabelStyle');
    const masqueTexte = s && s.enfants.some(c => c.tag === 'graphicalFilters' && /HideLabelFilter/.test(xtAttr(c, 'xmi:type') || ''));
    const pol = diaPolice(e, centre);
    liens.push({
      vue: xtAttr(e, 'xmi:id'), uid: s ? xtAttr(s, 'uid') : '', ...semantique(s), points, recalees, source: src, cible: cib, mapping, message,
      reflexif: !!message && diaInstance(src) === diaInstance(cib), duree: crochet && sequence,
      attacheNote: typeVue === 'NoteAttachment',
      icone: !!s && typeVue !== 'NoteAttachment' && (centre ? xtAttr(centre, 'showIcon') !== 'false' : !STY_LIENS_SANS_ICONE.has(mapping)),
      couleur: typeVue === 'NoteAttachment' ? '#888' : diaCouleur(a('strokeColor'), 'rgb(136,136,136)'),
      epaisseur: a('size') != null ? Math.max(1, +a('size')) : 1,
      trait: typeVue === 'NoteAttachment' ? 'dot' : message === 'retour' ? 'dash' : (a('lineStyle') || 'solid'),
      flecheCible: typeVue === 'NoteAttachment' ? 'NoDecoration' : (a('targetArrow') || 'InputArrow'),
      flecheSource: a('sourceArrow') || 'NoDecoration',
      texte: masqueTexte || !s ? '' : xtAttr(s, 'name') || '',
      texteDebut: masqueTexte || !s ? '' : xtAttr(s, 'beginLabel') || '', texteFin: masqueTexte || !s ? '' : xtAttr(s, 'endLabel') || '',
      police: pol, decalages: { centre: decalage('6001'), debut: decalage('6002'), fin: decalage('6003') },
      largeurEtiquette: bornesCentre && bornesCentre.w > 0 ? bornesCentre.w : 0,     // largeur de l'étiquette centrale enregistrée (GMF), 0 sinon
      etiquetteGmf: !!bornesCentre,                                                    // nœud GMF de l'étiquette centrale (6001) présent
      arbre: a('routingStyle') === 'tree'                                              // routage en arbre (décompositions), recalculé par Sirius
    });
  }

  if (sequence) diaDureesSequence(formes, liens);

  // Cadre englobant
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const etendre = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
  for (const f of formes) {
    etendre(f.x, f.y); etendre(f.x + f.w, f.y + f.h);
    if (f.posTexte === 'dessous') {
      const e = diaEtiquetteExterne(f), lt = e.uneLigne ? diaLargeurTexte(f.texte, f.police.taille) : Math.min(diaLargeurTexte(f.texte, f.police.taille), 160);
      const g = e.ancre === 'start' ? e.x : e.ancre === 'end' ? e.x - lt : e.x - lt / 2;
      etendre(g, e.y); etendre(g + lt, e.y + f.police.taille * 2.5);
    } else if (f.posTexte === 'bord') etendre(f.x + f.w / 2, f.y + f.h + f.police.taille * 2);
  }
  for (const l of liens) {
    for (const p of l.points) etendre(p[0], p[1]);
    if (l.texte && (l.reflexif || l.duree)) {
      const [x, y] = diaEtiquetteReflexive(l.points);
      etendre(x + Math.min(diaLargeurTexte(l.texte, l.police.taille), 220), y);
    } else if (l.texte) {
      const [cx, cy] = diaEtiquette(l.points, l.decalages.centre, 'centre');
      const demi = Math.min(diaLargeurTexte(l.texte, l.police.taille), 220) / 2;
      etendre(cx - demi, cy - l.police.taille); etendre(cx + demi, cy + l.police.taille);
    }
  }
  if (x0 === Infinity) { x0 = y0 = 0; x1 = y1 = 100; }
  rep.scene = { formes, liens, cadre: { x: x0 - 20, y: y0 - 20, w: x1 - x0 + 40, h: y1 - y0 + 40 } };
  return rep.scene;
}

/**
 * Placement de l'étiquette externe d'un nœud (pseudo-états, capacités, acteurs, extrémités de chaîne…),
 * comme GMF (BorderItemLocator) : la position enregistrée (nœud 5xxx, coin haut-gauche relatif au nœud)
 * ne sert qu'à choisir le côté du nœud le plus proche du centre de l'étiquette (findClosestSideOfParent) ;
 * l'étiquette est ensuite recollée contre ce côté (locateOnBorder), en gardant l'autre coordonnée.
 * Une étiquette ainsi placée tient sur une ligne. Sans position enregistrée : centrée sous le nœud.
 * @param {object} f forme (tx, ty, etiquette, texte, police)
 * @returns {{x:number, y:number, ancre:'start'|'middle'|'end', uneLigne:boolean}} point d'ancrage et haut du texte
 */
function diaEtiquetteExterne(f) {
  if (!f.etiquette) return { x: f.x + f.w / 2, y: f.y + f.h + 2, ancre: 'middle', uneLigne: false };
  const lw = diaLargeurTexte(f.texte, f.police.taille) * 0.9, lh = f.police.taille * 1.25;
  // Côté le plus proche (GMF : comparaison des centres, puis des distances aux coins)
  const cx = f.tx + lw / 2, cy = f.ty + lh / 2, px = f.w / 2, py = f.h / 2;
  let cote;
  // Entièrement au-dessus ou au-dessous du nœud : ce côté, quelle que soit la largeur (estimée) du texte
  if (f.ty + lh <= 0) cote = 'nord';
  else if (f.ty >= f.h) cote = 'sud';
  else if (cx < px) {
    if (cy < py) cote = cx <= cy ? 'ouest' : 'nord';
    else cote = cx <= f.h - cy ? 'ouest' : 'sud';
  } else if (cy < py) cote = f.w - cx <= cy ? 'est' : 'nord';
  else cote = f.w - cx <= f.h - cy ? 'est' : 'sud';
  if (cote === 'est') return { x: f.x + f.w + 2, y: f.y + f.ty, ancre: 'start', uneLigne: true };
  if (cote === 'ouest') return { x: f.x - 2, y: f.y + f.ty, ancre: 'end', uneLigne: true };
  // Au-dessus ou au-dessous : centrée sur le nœud, comme Capella (abscisse enregistrée ignorée ; souvent 0, non calculée)
  return { x: f.x + f.w / 2, y: cote === 'nord' ? f.y - lh - 1 : f.y + f.h + 1, ancre: 'middle', uneLigne: true };
}

/* ─────────────────────────────── Séquences ─────────────────────────────── */

/**
 * Diagrammes dont un élément est la cible (ex. : diagrammes d'un scénario cité par une référence),
 * séquences d'abord.
 * @param {object} aird résultat de diaLire
 * @param {string} id identifiant de l'élément du modèle
 * @returns {object[]} représentations dessinables
 */
function diaRepresentationsDe(aird, id) {
  const reps = [...(aird.cibles.get(id) || [])].filter(r => r.genre !== 'tableau' && r.noeud);
  return reps.sort((a, b) => (b.genre === 'sequence') - (a.genre === 'sequence'));
}

/** Écart horizontal du crochet d'une contrainte de durée à droite de ses points d'observation. */
const DIA_CROCHET = 16;

/** Écart horizontal d'un message réflexif (vers la même ligne de vie) à droite des exécutions. */
const DIA_REFLEXIF = 20;

/**
 * Genre d'un message de séquence, d'après le nom de son mapping Sirius (et son trait, pour un retour).
 * @param {string} mapping nom du mapping (« Basic message mapping DF », « Reply… », « Create… », « Destruction… »)
 * @param {string|undefined} trait style de trait enregistré
 * @returns {'appel'|'retour'|'creation'|'destruction'}
 */
function diaGenreMessage(mapping, trait) {
  if (/destr|delet/i.test(mapping)) return 'destruction';
  if (/creat/i.test(mapping)) return 'creation';
  if (/reply|return|retour/i.test(mapping) || trait === 'dash') return 'retour';
  return 'appel';
}

/**
 * Instance (tête de ligne de vie) portant une forme de séquence : ancêtre sans parent.
 * @param {object} f forme
 * @returns {object}
 */
function diaInstance(f) {
  let p = f;
  while (p.parent) p = p.parent;
  return p;
}

/**
 * Abscisse où un message touche une forme de séquence, du côté tourné vers l'autre extrémité :
 * axe de la ligne de vie (trait ou fin de vie), sinon bord gauche ou droit (exécution, état, instance).
 * @param {object} f forme
 * @param {number} sens +1 si l'autre extrémité est à droite, -1 à gauche
 * @returns {number}
 */
function diaBordMessage(f, sens) {
  if (f.figure === 'vie' || f.finDeVie) return f.x + f.w / 2;
  return sens > 0 ? f.x + f.w : f.x;
}

/**
 * Points d'un message de séquence. Sirius recalcule les abscisses à l'affichage : seules les ordonnées
 * enregistrées sont fiables. Message entre deux lignes de vie : horizontal, d'un bord à l'autre
 * (création : vers le côté de l'instance créée, à mi-hauteur) ; message réflexif : boucle à droite.
 * @param {object} src forme source
 * @param {object} cib forme cible
 * @param {number[]|null} ys ordonnées enregistrées du départ et de l'arrivée, ou null
 * @returns {number[][]}
 */
function diaPointsMessage(src, cib, ys) {
  const y1 = ys ? ys[0] : cib.y, y2 = ys ? ys[1] : cib.y;
  if (diaInstance(src) === diaInstance(cib)) {
    const xs = diaBordMessage(src, 1), xt = diaBordMessage(cib, 1), xr = Math.max(xs, xt) + DIA_REFLEXIF;
    return [[xs, y1], [xr, y1], [xr, y2], [xt, y2]];
  }
  const sens = cib.x + cib.w / 2 >= src.x + src.w / 2 ? 1 : -1;
  const y = !cib.parent ? cib.y + cib.h / 2 : y1;   // création : arrivée sur le côté de l'instance
  return [[diaBordMessage(src, sens), y], [diaBordMessage(cib, -sens), y]];
}

/**
 * Séquence : recale chaque point d'observation sur l'extrémité de message la plus proche (Sirius les
 * accroche l'un à l'autre ; la position enregistrée en est écartée de quelques pixels), puis trace les
 * contraintes de durée en crochet vertical à droite de leurs deux points.
 * @param {object[]} formes formes de la scène (modifiées)
 * @param {object[]} liens liens de la scène (modifiés)
 */
function diaDureesSequence(formes, liens) {
  const extremites = liens.filter(l => l.message).flatMap(l => [l.points[0], l.points[l.points.length - 1]]);
  for (const o of formes) {
    if (!/Observation/i.test(o.mapping)) continue;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    let meilleur = null, dm = 20;
    for (const p of extremites) { const d = Math.hypot(p[0] - cx, p[1] - cy); if (d < dm) { dm = d; meilleur = p; } }
    if (meilleur) { o.x = meilleur[0] - o.w / 2; o.y = meilleur[1] - o.h / 2; }
  }
  for (const l of liens) {
    if (!l.duree) continue;
    const ps = [l.source.x + l.source.w / 2, l.source.y + l.source.h / 2], pc = [l.cible.x + l.cible.w / 2, l.cible.y + l.cible.h / 2];
    const xb = Math.max(ps[0], pc[0]) + DIA_CROCHET;
    l.points = [ps, [xb, ps[1]], [xb, pc[1]], pc];
  }
}

/**
 * Point d'ancrage (à gauche, mi-hauteur) de l'étiquette d'un message réflexif ou d'une contrainte de durée :
 * à droite de la boucle ou du crochet.
 * @param {number[][]} p points du message (diaPointsMessage)
 * @returns {number[]}
 */
function diaEtiquetteReflexive(p) { return [p[1][0] + 5, (p[1][1] + p[2][1]) / 2]; }

/**
 * Point du bord d'une forme rectangulaire sur la droite qui joint son centre à un point.
 * @param {{x:number,y:number,w:number,h:number}} f forme
 * @param {number[]} p point visé [x, y]
 * @returns {number[]} point du bord
 */
function diaBordVers(f, p) {
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2, dx = p[0] - cx, dy = p[1] - cy;
  if (!dx && !dy) return [cx, cy];
  const k = Math.min(dx ? (f.w / 2) / Math.abs(dx) : Infinity, dy ? (f.h / 2) / Math.abs(dy) : Infinity);
  return [cx + dx * k, cy + dy * k];
}

/**
 * Repère d'une étiquette de lien : point de référence (début, fin, ou milieu de la ligne) et segment qui le porte.
 * @param {number[][]} pts points du lien
 * @param {'debut'|'fin'|'centre'} quoi étiquette
 * @returns {{ref:number[], a:number[], b:number[]}}
 */
function diaRepereEtiquette(pts, quoi) {
  let ref, a, b;
  if (quoi === 'debut') { ref = pts[0]; a = pts[0]; b = pts[1]; }
  else if (quoi === 'fin') { ref = pts[pts.length - 1]; a = pts[pts.length - 2]; b = pts[pts.length - 1]; }
  else {
    ref = diaPointSur(pts, 0.5);
    // Segment qui porte le milieu
    let reste = 0;
    for (let i = 1; i < pts.length; i++) reste += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    reste /= 2; a = pts[pts.length - 2]; b = pts[pts.length - 1];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (reste <= l) { a = pts[i - 1]; b = pts[i]; break; }
      reste -= l;
    }
  }
  return { ref, a, b };
}

/**
 * Position (centre) d'une étiquette de lien, comme GMF (LabelHelper) : le décalage enregistré est exprimé
 * dans le repère du segment qui porte le point de référence (milieu du lien, ou son extrémité), x le long
 * du segment dans son sens de parcours, y à sa gauche ; il tourne donc avec le segment.
 * Vérifié sur IFE : 5 étiquettes sur 778 tombent sur une boîte, contre 171 sans rotation.
 * @param {number[][]} pts points du lien
 * @param {number[]} decalage décalage enregistré [x, y]
 * @param {'centre'|'debut'|'fin'} quoi étiquette
 * @returns {number[]} [x, y]
 */
function diaEtiquette(pts, decalage, quoi) {
  const { ref, a, b } = diaRepereEtiquette(pts, quoi);
  const [x, y] = decalage, dx = b[0] - a[0], dy = b[1] - a[1];
  let o;
  if (Math.abs(dy) < 1) o = dx < 0 ? [-x, -y] : [x, y];                 // horizontal (de droite à gauche : demi-tour)
  else if (Math.abs(dx) < 1) o = dy > 0 ? [-y, x] : [y, -x];            // vertical, vers le bas ou vers le haut
  else { const t = Math.atan2(dy, dx), c = Math.cos(t), si = Math.sin(t); o = [x * c - y * si, x * si + y * c]; }
  return [ref[0] + o[0], ref[1] + o[1]];
}

/**
 * Décalage GMF qui place une étiquette de lien en un point (inverse de diaEtiquette : décalage tourné avec le segment).
 * @param {number[][]} pts points du lien
 * @param {number[]} point position voulue de l'étiquette
 * @param {'debut'|'fin'|'centre'} quoi étiquette
 * @returns {number[]} décalage [x, y] (entiers)
 */
function diaDecalageEtiquette(pts, point, quoi) {
  const { ref, a, b } = diaRepereEtiquette(pts, quoi);
  const ox = point[0] - ref[0], oy = point[1] - ref[1], dx = b[0] - a[0], dy = b[1] - a[1];
  let d;
  if (Math.abs(dy) < 1) d = dx < 0 ? [-ox, -oy] : [ox, oy];
  else if (Math.abs(dx) < 1) d = dy > 0 ? [oy, -ox] : [-oy, ox];
  else { const t = Math.atan2(dy, dx), c = Math.cos(t), si = Math.sin(t); d = [ox * c + oy * si, -ox * si + oy * c]; }
  return d.map(Math.round);
}

/** Décalages par défaut des étiquettes de liens écrits par Sirius à la création (centre au-dessus, extrémités au-dessous). */
const DIA_DECALAGES_DEFAUT = { centre: [0, -10], debut: [0, 10], fin: [0, 10] };

/**
 * Lien orthogonal dont les extrémités sont décalées (formes de taille calculée, points périmés) : chaque segment
 * extrême est déplacé parallèlement à lui-même pour toucher sa forme (le coude voisin suit, l'angle droit est
 * gardé), et l'extrémité est posée sur le bord tourné vers le coude.
 * @param {number[][]} pts points (trois au moins)
 * @param {object} src forme source
 * @param {object} cib forme cible
 * @returns {number[][]}
 */
function diaOrthogonaliser(pts, src, cib) {
  pts = pts.map(p => p.slice());
  const borne = (v, a, b) => Math.min(Math.max(v, a), b);
  const recaler = (f, a, b) => {
    if (Math.abs(a[1] - b[1]) <= Math.abs(a[0] - b[0])) {
      // Segment horizontal : à une hauteur de la forme, extrémité sur le côté gauche ou droit
      const y = borne(b[1], f.y + 1, f.y + f.h - 1);
      a[1] = b[1] = y;
      if (b[0] >= f.x + f.w) a[0] = f.x + f.w; else if (b[0] <= f.x) a[0] = f.x;
    } else {
      // Segment vertical : à une abscisse de la forme, extrémité sur le haut ou le bas
      const x = borne(b[0], f.x + 1, f.x + f.w - 1);
      a[0] = b[0] = x;
      if (b[1] >= f.y + f.h) a[1] = f.y + f.h; else if (b[1] <= f.y) a[1] = f.y;
    }
  };
  recaler(src, pts[0], pts[1]);
  recaler(cib, pts[pts.length - 1], pts[pts.length - 2]);
  return pts;
}

/**
 * Extrémité d'un lien ramenée au bord de sa forme : si le segment [p, q] traverse la forme, point où il en sort
 * (le plus proche de q, direction du segment conservée) ; sinon p inchangé.
 * @param {object} f forme (x, y, w, h)
 * @param {number[]} p extrémité
 * @param {number[]} q point voisin
 * @returns {number[]}
 */
function diaSortie(f, p, q) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  let t0 = 0, t1 = 1;
  // Découpage de Liang-Barsky du segment par le rectangle de la forme
  for (const [a, b] of [[-dx, p[0] - f.x], [dx, f.x + f.w - p[0]], [-dy, p[1] - f.y], [dy, f.y + f.h - p[1]]]) {
    if (Math.abs(a) < 1e-9) { if (b < 0) return p; continue; }
    const t = b / a;
    if (a < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
  }
  if (t1 <= t0 || t1 >= 1) return p;                     // hors de la forme, ou voisin dedans
  if (Math.hypot(dx, dy) * (t1 - t0) < 2) return p;      // segment qui ne fait que toucher le bord
  return [p[0] + dx * t1, p[1] + dy * t1];
}

/**
 * Point situé à une fraction de la longueur d'une ligne brisée.
 * @param {number[][]} pts points
 * @param {number} t fraction (0 = début, 1 = fin)
 * @returns {number[]}
 */
function diaPointSur(pts, t) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let reste = total * t;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (reste <= l && l > 0) { const k = reste / l; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
    reste -= l;
  }
  return pts[pts.length - 1].slice();
}

/**
 * Position relative de l'ancre d'un lien GMF dans sa forme (IdentityAnchor « (0.5,0.3) ») ; centre par défaut.
 * @param {object} e vue GMF du lien
 * @param {string} tag « sourceAnchor » ou « targetAnchor »
 * @returns {number[]} [fx, fy] entre 0 et 1
 */
function diaFraction(e, tag) {
  const an = diaEnfant(e, tag), m = an && (xtAttr(an, 'id') || '').match(/\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
  return m ? [+m[1], +m[2]] : [0.5, 0.5];
}

/* ─────────────────────────────── Mise en page ─────────────────────────────── */
/* Calcul des modifications de la notation GMF pour une mise en page (déplacer, redimensionner, retracer
   un lien). Rien n'est modifié ici : on renvoie la liste des changements d'attributs, que l'édition
   applique en une opération du journal. Les points des liens sont mis à jour par décalages, exacts même
   quand la taille d'une forme n'est pas enregistrée (taille calculée par Sirius). */

/**
 * Extrémité d'un lien glissée sur le pourtour de sa forme (E3) : point du bord le plus proche du point visé, fraction de la
 * forme (ancre GMF) et nouveau tracé : le lien sort perpendiculairement au côté choisi puis rejoint le reste de son tracé par
 * un coude (points alignés fusionnés). Un port garde son ancre (trop petit pour y glisser).
 * @param {object} l lien de la scène
 * @param {'source'|'cible'} bout extrémité
 * @param {number[]} point point visé (coordonnées du diagramme)
 * @returns {{points:number[][], fraction:number[]}|null} tracé absolu et fraction [fx, fy], null pour un port
 */
function diaExtremite(l, bout, point) {
  const f = bout === 'source' ? l.source : l.cible;
  if (!f || f.genre === 'port' || f.w <= 0 || f.h <= 0) return null;
  // Point du bord le plus proche : ramené dans la forme, puis poussé sur le côté le plus proche
  let x = Math.min(Math.max(point[0], f.x), f.x + f.w), y = Math.min(Math.max(point[1], f.y), f.y + f.h);
  const d = { g: x - f.x, d: f.x + f.w - x, h: y - f.y, b: f.y + f.h - y }, cote = Object.keys(d).reduce((a, b) => (d[b] < d[a] ? b : a));
  if (cote === 'g') x = f.x; else if (cote === 'd') x = f.x + f.w; else if (cote === 'h') y = f.y; else y = f.y + f.h;
  x = Math.round(x); y = Math.round(y);
  // Tracé côté extrémité : le lien sort perpendiculairement au côté choisi (12 px), puis rejoint le point suivant par un coude
  const pts = bout === 'source' ? l.points.map(p => p.slice()) : l.points.map(p => p.slice()).reverse();
  const n = { g: [-1, 0], d: [1, 0], h: [0, -1], b: [0, 1] }[cote], sortie = [x + n[0] * 12, y + n[1] * 12];
  const reste = pts.slice(1), suivant = reste[0];
  const coude = n[0] ? [sortie[0], suivant[1]] : [suivant[0], sortie[1]];
  const neufs = [[x, y], sortie, coude, ...reste].filter((p, k, t) => k === 0 || p[0] !== t[k - 1][0] || p[1] !== t[k - 1][1]);
  // Points alignés consécutifs retirés (segments prolongés)
  const net = neufs.filter((p, k, t) => k === 0 || k === t.length - 1 || !((t[k - 1][0] === p[0] && p[0] === t[k + 1][0]) || (t[k - 1][1] === p[1] && p[1] === t[k + 1][1])));
  const arrondi = v => Math.round(v * 10000) / 10000;
  return { points: bout === 'source' ? net : net.reverse(), fraction: [arrondi((x - f.x) / f.w), arrondi((y - f.y) / f.h)] };
}

/**
 * Extrémité d'un lien tracé en angles droits sur une forme : d'un port, son centre, perpendiculairement au côté de son
 * parent ; sinon sur le côté tourné vers l'autre extrémité, au milieu de la partie commune quand les formes se chevauchent
 * sur un axe (trait droit), sinon au milieu de ce côté.
 * @param {object} f forme de l'extrémité
 * @param {object} autre forme de l'autre extrémité
 * @returns {{p:number[], n:number[], port:boolean}} point, direction de sortie, extrémité sur un port
 */
function diaBoutOrthogonal(f, autre) {
  const centre = g => [g.x + g.w / 2, g.y + g.h / 2];
  if (f.genre === 'port' && f.parent) {
    const cote = diaCotePort(f), n = { gauche: [-1, 0], droite: [1, 0], haut: [0, -1], bas: [0, 1] }[cote];
    return { p: centre(f).map(Math.round), n, port: true };
  }
  const a = autre.genre === 'port' && autre.parent ? { x: centre(autre)[0], y: centre(autre)[1], w: 0, h: 0 } : autre;
  const ry = [Math.max(f.y, a.y), Math.min(f.y + f.h, a.y + a.h)], rx = [Math.max(f.x, a.x), Math.min(f.x + f.w, a.x + a.w)];
  const [cf, ca] = [centre(f), centre(a)];
  let n, p;
  if (ry[1] - ry[0] >= 4 && (a.x >= f.x + f.w || a.x + a.w <= f.x)) { n = [ca[0] > cf[0] ? 1 : -1, 0]; p = [n[0] > 0 ? f.x + f.w : f.x, (ry[0] + ry[1]) / 2]; }
  else if (rx[1] - rx[0] >= 4 && (a.y >= f.y + f.h || a.y + a.h <= f.y)) { n = [0, ca[1] > cf[1] ? 1 : -1]; p = [(rx[0] + rx[1]) / 2, n[1] > 0 ? f.y + f.h : f.y]; }
  else if (Math.abs(ca[0] - cf[0]) >= Math.abs(ca[1] - cf[1])) { n = [ca[0] > cf[0] ? 1 : -1, 0]; p = [n[0] > 0 ? f.x + f.w : f.x, cf[1]]; }
  else { n = [0, ca[1] > cf[1] ? 1 : -1]; p = [cf[0], n[1] > 0 ? f.y + f.h : f.y]; }
  return { p: p.map(Math.round), n, port: false };
}

/**
 * Tracé en angles droits d'un lien (E3) : extrémités sur les côtés en vis-à-vis — au milieu de la partie commune quand les
 * formes se chevauchent sur un axe (trait droit), sinon au milieu du côté tourné vers l'autre forme ; d'un port, depuis son
 * centre, perpendiculairement au côté de son parent. Entre deux amorces (12 px), plus court chemin orthogonal qui contourne
 * les autres formes (marge 8) sur une grille clairsemée (bords des obstacles), avec une pénalité par coude ; les conteneurs
 * communs aux deux extrémités ne sont pas des obstacles. Sans chemin libre : tracé en Z à mi-distance.
 * Avec des tracés déjà posés (routage séquentiel), longer l'un d'eux sur une même droite et le croiser ont un coût
 * (DIA_COUTS_ROUTAGE) : le lien prend de préférence un couloir libre (droites décalées de part et d'autre des tracés posés
 * proches, ajoutées à la grille).
 * @param {object} scene scène du diagramme
 * @param {object} l lien
 * @param {Array<Array>} [deja] segments déjà posés ([a, b, lien], d'équerre ; lien facultatif : longer un lien qui part de la
 *   même forme ou du même port ne coûte rien, faisceau écarté ensuite)
 * @param {{source?:object, cible?:object}} [imposes] extrémités imposées ({p, n, port} : diaRepartirBouts)
 * @returns {{points:number[][], ancres:{source?:number[], cible?:number[]}}} tracé absolu et fractions des ancres (formes)
 */
function diaRouteOrthogonale(scene, l, deja, imposes) {
  const COUTS = DIA_COUTS_ROUTAGE;  // (PENALITE ci-dessus : coût d'un coude)
  const s = l.source, c = l.cible, M = 8, AMORCE = 12, PENALITE = DIA_COUTS_ROUTAGE.coude;
  const arrondi = v => Math.round(v * 10000) / 10000;
  // Extrémités et directions de sortie (imposées : liens répartis sur un côté partagé, diaRepartirBouts)
  const bs = (imposes && imposes.source) || diaBoutOrthogonal(s, c), bc = (imposes && imposes.cible) || diaBoutOrthogonal(c, s);
  const ancres = {};
  if (!bs.port) ancres.source = [arrondi((bs.p[0] - s.x) / s.w), arrondi((bs.p[1] - s.y) / s.h)];
  if (!bc.port) ancres.cible = [arrondi((bc.p[0] - c.x) / c.w), arrondi((bc.p[1] - c.y) / c.h)];
  const as = [bs.p[0] + bs.n[0] * AMORCE, bs.p[1] + bs.n[1] * AMORCE], ac = [bc.p[0] + bc.n[0] * AMORCE, bc.p[1] + bc.n[1] * AMORCE];
  // Obstacles : formes (hors ports, lignes de liste, éléments contenus dans une extrémité) qui ne contiennent pas les deux extrémités
  const ancetres = f => { const r = new Set(); for (let p = f; p; p = p.parent) r.add(p); return r; };
  const aS = ancetres(s), aC = ancetres(c), communs = new Set([...aS].filter(x => aC.has(x)));
  const dansUnBout = f => { for (let p = f.parent; p; p = p.parent) if (p === s || p === c) return true; return false; };
  const zone = { x0: Math.min(as[0], ac[0]) - 250, y0: Math.min(as[1], ac[1]) - 250, x1: Math.max(as[0], ac[0]) + 250, y1: Math.max(as[1], ac[1]) + 250 };
  const obstacles = scene.formes.filter(f => f.genre !== 'port' && f.genre !== 'ligne' && f.genre !== 'note' && !communs.has(f) && !dansUnBout(f) && f.w > 0 && f.h > 0
    && f.x < zone.x1 && f.x + f.w > zone.x0 && f.y < zone.y1 && f.y + f.h > zone.y0)
    .map(f => ({ x0: f.x - M, y0: f.y - M, x1: f.x + f.w + M, y1: f.y + f.h + M, f }));
  // Une amorce dans un obstacle (formes serrées) : cet obstacle est ignoré
  const dedans = (o, p) => p[0] > o.x0 && p[0] < o.x1 && p[1] > o.y0 && p[1] < o.y1;
  const obs = obstacles.filter(o => !dedans(o, as) && !dedans(o, ac));
  const coupe = (a, b) => obs.some(o => {
    if (a[1] === b[1]) return a[1] > o.y0 && a[1] < o.y1 && Math.max(a[0], b[0]) > o.x0 && Math.min(a[0], b[0]) < o.x1;
    return a[0] > o.x0 && a[0] < o.x1 && Math.max(a[1], b[1]) > o.y0 && Math.min(a[1], b[1]) < o.y1;
  });
  // Tracés déjà posés dans la zone : horizontaux par ordonnée, verticaux par abscisse
  const horiz = new Map(), vert = new Map(), dansZone = (a, b) => Math.max(a[0], b[0]) >= zone.x0 && Math.min(a[0], b[0]) <= zone.x1 && Math.max(a[1], b[1]) >= zone.y0 && Math.min(a[1], b[1]) <= zone.y1;
  const hListe = [], vListe = [];
  // (faisceau : longer un lien qui part de la même forme ou du même port ne coûte rien, diaEcarterTraces les écarte ensuite
  // dans l'ordre qui ne les croise pas)
  const frere = o => o && (o.source === s || o.cible === s || o.source === c || o.cible === c);
  for (const [a, b, o] of deja || []) {
    if (!dansZone(a, b) || (a[0] === b[0] && a[1] === b[1])) continue;
    const f = frere(o);
    if (a[1] === b[1]) { const sg = [Math.min(a[0], b[0]), Math.max(a[0], b[0]), a[1], f]; (horiz.get(a[1]) || horiz.set(a[1], []).get(a[1])).push(sg); hListe.push(sg); }
    else if (a[0] === b[0]) { const sg = [Math.min(a[1], b[1]), Math.max(a[1], b[1]), a[0], f]; (vert.get(a[0]) || vert.set(a[0], []).get(a[0])).push(sg); vListe.push(sg); }
  }
  // Segments posés triés par leur coordonnée fixe (recherche dichotomique des segments croisés)
  vListe.sort((p, q) => p[2] - q[2]); hListe.sort((p, q) => p[2] - q[2]);
  const premier = (liste, v) => { let g = 0, d = liste.length; while (g < d) { const m = (g + d) >> 1; if (liste[m][2] <= v) g = m + 1; else d = m; } return g; };
  /** Surcoût d'un pas d'équerre de a à b : longer un tracé posé (par pixel commun), croiser un tracé posé (DIA_COUTS_ROUTAGE). */
  const surcout = (a, b) => {
    if (!hListe.length && !vListe.length) return 0;
    let c = 0;
    if (a[1] === b[1]) {
      const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
      for (const [d, f, , fr] of horiz.get(a[1]) || []) { const o = Math.min(f, x1) - Math.max(d, x0); if (o > 0 && !fr) c += COUTS.longer * o; }
      for (let i = premier(vListe, x0); i < vListe.length && vListe[i][2] < x1; i++) if (a[1] > vListe[i][0] && a[1] < vListe[i][1]) c += COUTS.croiser;
    } else {
      const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      for (const [d, f, , fr] of vert.get(a[0]) || []) { const o = Math.min(f, y1) - Math.max(d, y0); if (o > 0 && !fr) c += COUTS.longer * o; }
      for (let i = premier(hListe, y0); i < hListe.length && hListe[i][2] < y1; i++) if (a[0] > hListe[i][0] && a[0] < hListe[i][1]) c += COUTS.croiser;
    }
    return c;
  };
  // Grille clairsemée : amorces, bords des obstacles (avec marge), milieu ; couloirs voisins des tracés posés
  // (couloirs : seulement près du rectangle des deux amorces, pour garder une grille petite)
  const pres = { x0: Math.min(as[0], ac[0]) - COUTS.marge, x1: Math.max(as[0], ac[0]) + COUTS.marge, y0: Math.min(as[1], ac[1]) - COUTS.marge, y1: Math.max(as[1], ac[1]) + COUTS.marge };
  // (un tracé ne peut en longer un autre que sur une ligne de la grille : seuls ces tracés-là ouvrent des couloirs voisins)
  const baseX = new Set([as[0], ac[0], Math.round((as[0] + ac[0]) / 2), ...obs.flatMap(o => [o.x0, o.x1])]);
  const baseY = new Set([as[1], ac[1], Math.round((as[1] + ac[1]) / 2), ...obs.flatMap(o => [o.y0, o.y1])]);
  const voisins = (l2, k, base) => [...new Set(l2.filter(sg => base.has(sg[2]) && (k ? sg[1] >= pres.x0 && sg[0] <= pres.x1 : sg[1] >= pres.y0 && sg[0] <= pres.y1))
    .flatMap(sg => [sg[2] - COUTS.couloir, sg[2] + COUTS.couloir]))].filter(v => (k ? v >= pres.y0 && v <= pres.y1 : v >= pres.x0 && v <= pres.x1));
  const xs = [...new Set([...baseX, ...voisins(vListe, 0, baseX)])].sort((a, b) => a - b);
  const ys = [...new Set([...baseY, ...voisins(hListe, 1, baseY)])].sort((a, b) => a - b);
  const ix = new Map(xs.map((v, i) => [v, i])), iy = new Map(ys.map((v, i) => [v, i]));
  // Nœuds dans un obstacle et pas d'une ligne à la suivante qui le traversent, marqués une fois (indices par recherche
  // dichotomique : les bords des obstacles sont des lignes de la grille)
  const nx = xs.length, ny = ys.length, occupe = new Uint8Array(nx * ny), bloqueH = new Uint8Array(nx * ny), bloqueV = new Uint8Array(nx * ny);
  const indice = (t, v) => { let g = 0, d = t.length; while (g < d) { const m = (g + d) >> 1; if (t[m] < v) g = m + 1; else d = m; } return g; };
  for (const o of obs) {
    const i0 = indice(xs, o.x0), i1 = indice(xs, o.x1), j0 = indice(ys, o.y0), j1 = indice(ys, o.y1);
    for (let i = i0; i < nx && xs[i] <= o.x1; i++) for (let j = j0; j < ny && ys[j] <= o.y1; j++) {
      const x = xs[i], y = ys[j], ox = x > o.x0 && x < o.x1, oy = y > o.y0 && y < o.y1;
      if (ox && oy) occupe[i * ny + j] = 1;
      // pas horizontal de (i, j) à (i + 1, j) : traverse l'obstacle si son milieu y est
      if (oy && i + 1 < nx && (x + xs[i + 1]) / 2 > o.x0 && (x + xs[i + 1]) / 2 < o.x1) bloqueH[i * ny + j] = 1;
      if (ox && j + 1 < ny && (y + ys[j + 1]) / 2 > o.y0 && (y + ys[j + 1]) / 2 < o.y1) bloqueV[i * ny + j] = 1;
    }
    void i1; void j1;
  }
  const libre = (i, j) => !occupe[i * ny + j];
  const bloque = (i, j, ni, nj) => (nj === j ? bloqueH[Math.min(i, ni) * ny + j] : bloqueV[i * ny + Math.min(j, nj)]) === 1;
  // Plus court chemin (Dijkstra) sur les états (nœud, direction d'arrivée) ; directions 0 →, 1 ←, 2 ↓, 3 ↑
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]], dirDe = n => (n[0] > 0 ? 0 : n[0] < 0 ? 1 : n[1] > 0 ? 2 : 3);
  const depart = [ix.get(as[0]), iy.get(as[1])], arrivee = [ix.get(ac[0]), iy.get(ac[1])], dArr = dirDe([-bc.n[0], -bc.n[1]]);
  const cle = (i, j, d) => (i * ys.length + j) * 4 + d, dist = new Map(), prec = new Map(), file = [];
  // File de priorité : tas binaire de [valeur, état]
  const pousser = (k, v) => {
    file.push([v, k]);
    for (let i = file.length - 1; i > 0;) { const p = (i - 1) >> 1; if (file[p][0] <= file[i][0]) break; [file[p], file[i]] = [file[i], file[p]]; i = p; }
  };
  const extraire = () => {
    const h = file[0], dernier = file.pop();
    if (file.length) {
      file[0] = dernier;
      for (let i = 0; ;) {
        const g = 2 * i + 1, dr = g + 1;
        let m = i;
        if (g < file.length && file[g][0] < file[m][0]) m = g;
        if (dr < file.length && file[dr][0] < file[m][0]) m = dr;
        if (m === i) break;
        [file[m], file[i]] = [file[i], file[m]]; i = m;
      }
    }
    return h;
  };
  const d0 = dirDe(bs.n), k0 = cle(depart[0], depart[1], d0);
  dist.set(k0, 0); pousser(k0, 0);
  let fin = null;
  while (file.length) {
    const [v, k] = extraire();
    if (v > (dist.get(k) ?? Infinity)) continue;
    const d = k % 4, n = (k - d) / 4, i = Math.floor(n / ys.length), j = n % ys.length;
    if (i === arrivee[0] && j === arrivee[1]) { const v2 = v + (d === dArr ? 0 : PENALITE); if (!fin || v2 < fin.v) fin = { k, v: v2 }; continue; }
    for (let nd = 0; nd < 4; nd++) {
      if ((d ^ 1) === nd) continue;                    // pas de demi-tour
      const ni = i + D[nd][0], nj = j + D[nd][1];
      if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) continue;
      const a = [xs[i], ys[j]], b = [xs[ni], ys[nj]];
      if (!(ni === arrivee[0] && nj === arrivee[1]) && !libre(ni, nj)) continue;
      if (bloque(i, j, ni, nj)) continue;
      const nk = cle(ni, nj, nd), nv = v + Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) + (nd === d ? 0 : PENALITE) + surcout(a, b);
      if (nv < (dist.get(nk) ?? Infinity)) { dist.set(nk, nv); prec.set(nk, k); pousser(nk, nv); }
    }
  }
  let milieu;
  if (fin) {
    milieu = [];
    for (let k = fin.k; k !== undefined; k = prec.get(k)) { const n = (k - (k % 4)) / 4; milieu.unshift([xs[Math.floor(n / ys.length)], ys[n % ys.length]]); }
  } else {
    // Sans chemin libre : Z à mi-distance
    milieu = bs.n[0] ? [as, [Math.round((as[0] + ac[0]) / 2), as[1]], [Math.round((as[0] + ac[0]) / 2), ac[1]], ac] : [as, [as[0], Math.round((as[1] + ac[1]) / 2)], [ac[0], Math.round((as[1] + ac[1]) / 2)], ac];
  }
  // Points : extrémité, amorce, chemin, amorce, extrémité ; doublons et points alignés retirés
  const tous = [bs.p, ...milieu, bc.p].filter((p, k, t) => k === 0 || p[0] !== t[k - 1][0] || p[1] !== t[k - 1][1]);
  const points = tous.filter((p, k, t) => k === 0 || k === t.length - 1 || !((t[k - 1][0] === p[0] && p[0] === t[k + 1][0]) || (t[k - 1][1] === p[1] && p[1] === t[k + 1][1])));
  return { points, ancres };
}

/**
 * Coûts du routage séquentiel (diaRouteOrthogonale avec des tracés déjà posés), réglés au banc de mesure
 * (tools/banc-disposition.js) : longer un tracé posé (par pixel commun), le croiser, écart des couloirs voisins ajoutés à la
 * grille, marge autour des deux amorces où ces couloirs sont cherchés ; coût d'un coude (tout tracé).
 */
const DIA_COUTS_ROUTAGE = { coude: 40, longer: 1, croiser: 150, couloir: 8, marge: 60 };

/** Ordre EMF des attributs d'une ancre GMF (IdentityAnchor). */
const DIA_ORDRE_ANCRE = ['xmi:type', 'xmi:id', 'id'];

/** Ordre EMF des attributs d'une contrainte de position GMF (Bounds, Location). */
const DIA_ORDRE_BORNES = ['xmi:type', 'xmi:id', 'x', 'y', 'width', 'height'];
/** Ordre EMF des attributs des points d'un lien GMF (RelativeBendpoints). */
const DIA_ORDRE_POINTS = ['xmi:type', 'xmi:id', 'points'];

/**
 * Indique si un diagramme peut être mis en page (les diagrammes de séquence sont disposés par Sirius).
 * @param {object} rep représentation
 * @returns {boolean}
 */
function diaModifiable(rep) { return rep.genre === 'diagramme'; }

/**
 * Indique si le mode « Mise en page » s'ouvre sur un diagramme : diagrammes, et séquences (lignes de vie déplacées à
 * l'horizontale seulement, diaMiseEnPageSequence ; aucun outil de création).
 * @param {object} rep représentation
 * @returns {boolean}
 */
function diaMiseEnPagePermise(rep) { return rep.genre === 'diagramme' || rep.genre === 'sequence'; }

/**
 * Indique si une forme peut être déplacée : position enregistrée, et ni ligne de liste, ni ligne de vie,
 * ni région d'un état (disposées par Sirius) ; dans une séquence, seulement une instance (tête de ligne de vie).
 * @param {object} aird résultat de diaLire
 * @param {object} f forme
 * @returns {boolean}
 */
function diaDeplacable(aird, f) {
  if (f.sequence) return !f.parent && f.typeSem === 'InstanceRole';     // séquence : seules les instances (lignes de vie)
  if (f.genre === 'ligne' || f.figure === 'vie' || (f.parent && f.parent.pile)) return false;
  const v = aird.parVue.get(f.vue);
  return !!(v && diaEnfant(v, 'layoutConstraint'));
}

/**
 * Indique si une forme peut être redimensionnée (contrainte Bounds, hors ports et formes de séquence ; une région d'un état
 * aussi, dans le sens de la pile : diaPoignees).
 * @param {object} aird résultat de diaLire
 * @param {object} f forme
 * @returns {boolean}
 */
function diaRedimensionnable(aird, f) {
  if (f.genre === 'port' || f.sequence || (!f.region && !diaDeplacable(aird, f))) return false;
  const lc = diaEnfant(aird.parVue.get(f.vue), 'layoutConstraint');
  return /Bounds/.test(xtAttr(lc, 'xmi:type') || '');
}

/**
 * Poignées de taille d'une forme redimensionnable : les huit (côtés et coins) ; une région d'un état (conteneur empilé)
 * ne change que dans le sens de la pile (bas pour une pile verticale, droite pour une horizontale) : Sirius la place et
 * l'étire sur toute la largeur de l'état.
 * @param {object} f forme
 * @returns {string[]} poignées : n, s, e, w, ne, nw, se, sw
 */
function diaPoignees(f) {
  if (f.region) return [f.parent.pile === 'horizontale' ? 'e' : 's'];
  return ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
}

/**
 * Côté du parent sur lequel est posé un port, d'après sa position.
 * @param {object} f forme du port
 * @returns {'gauche'|'droite'|'haut'|'bas'}
 */
function diaCotePort(f) {
  const p = f.parent, cx = f.x + f.w / 2 - p.x, cy = f.y + f.h / 2 - p.y;
  const d = { gauche: cx, droite: p.w - cx, haut: cy, bas: p.h - cy };
  return Object.keys(d).reduce((a, b) => (d[b] < d[a] ? b : a));
}

/**
 * Nouvelle boîte d'une forme redimensionnée par une poignée (n, s, e, w et coins), bornée (E1, E2) : taille minimale ; un
 * conteneur garde tout son contenu (marge de 8) et la place de son titre ; la forme reste dans le compartiment de son
 * conteneur (taille connue). Une poignée gauche ou haute déplace la forme et contre-déplace son contenu, qui reste en place.
 * @param {object} scene scène du diagramme
 * @param {object} f forme
 * @param {string} quoi poignée : n, s, e, w, ne, nw, se, sw
 * @param {number} dx décalage du pointeur
 * @param {number} dy décalage du pointeur
 * @returns {{tailles:Map<object,number[]>, deplacements:Map<object,number[]>, boite:number[]}} taille et déplacements (la
 *   forme, son contenu hors ports) à appliquer, boîte [x, y, w, h]
 */
function diaRedimensionner(scene, f, quoi, dx, dy) {
  const formes = scene.formes, contenu = formes.filter(q => q.parent === f && q.genre !== 'port');
  if (f.region) return diaRedimensionnerRegion(f, contenu, f.parent.pile === 'horizontale' ? dx : dy);
  let x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.h;
  if (quoi.includes('w')) x0 += dx; if (quoi.includes('e')) x1 += dx;
  if (quoi.includes('n')) y0 += dy; if (quoi.includes('s')) y1 += dy;
  // Contenu et titre : bornes qu'un bord ne franchit pas ; taille minimale
  const marge = 8, minW = 20, minH = f.genre === 'conteneur' ? Math.max(16, f.police.taille + 12) : 16;
  if (contenu.length) {
    const cx0 = Math.min(...contenu.map(q => q.x)) - marge, cy0 = Math.min(...contenu.map(q => q.y)) - marge;
    const cx1 = Math.max(...contenu.map(q => q.x + q.w)) + marge, cy1 = Math.max(...contenu.map(q => q.y + q.h)) + marge;
    if (quoi.includes('w')) x0 = Math.min(x0, cx0); if (quoi.includes('e')) x1 = Math.max(x1, cx1);
    if (quoi.includes('n')) y0 = Math.min(y0, cy0 - minH + marge); if (quoi.includes('s')) y1 = Math.max(y1, cy1);
  }
  if (x1 - x0 < minW) { if (quoi.includes('w')) x0 = x1 - minW; else x1 = x0 + minW; }
  if (y1 - y0 < minH) { if (quoi.includes('n')) y0 = y1 - minH; else y1 = y0 + minH; }
  // Dans le compartiment du conteneur
  const p = f.parent;
  if (p && !p.calculee && f.genre !== 'port' && f.genre !== 'note') {
    const px0 = p.x + DIA_COMPARTIMENT.x, py0 = p.y + DIA_COMPARTIMENT.y, px1 = p.x + p.w - 2, py1 = p.y + p.h - 2;
    if (quoi.includes('w')) x0 = Math.max(x0, px0); if (quoi.includes('e')) x1 = Math.min(x1, px1);
    if (quoi.includes('n')) y0 = Math.max(y0, py0); if (quoi.includes('s')) y1 = Math.min(y1, py1);
  }
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const ddx = x0 - f.x, ddy = y0 - f.y, deplacements = new Map();
  if (ddx || ddy) {
    deplacements.set(f, [ddx, ddy]);
    for (const q of contenu) deplacements.set(q, [-ddx, -ddy]);
    // Ports : chacun suit son bord (gauche, haut : avec la forme ; droite, bas : diaMiseEnPage ajoute la variation de taille)
    // et garde sa position absolue le long de ce bord
    for (const q of formes) {
      if (q.parent !== f || q.genre !== 'port') continue;
      const c = diaCotePort(q), vertical = c === 'gauche' || c === 'droite';
      deplacements.set(q, [vertical ? 0 : -ddx, vertical ? -ddy : 0]);
    }
  }
  return { tailles: new Map([[f, [x1 - x0, y1 - y0]]]), deplacements, boite: [x0, y0, x1 - x0, y1 - y0] };
}

/**
 * Région d'un état agrandie ou réduite dans le sens de sa pile (diaRedimensionner) : au moins son contenu (marge 8) et
 * 20 px ; l'état qui la contient grandit d'autant (diaMiseEnPage), dans le compartiment de son propre conteneur.
 * @param {object} f région
 * @param {object[]} contenu formes contenues (hors ports)
 * @param {number} d variation voulue dans le sens de la pile
 * @returns {{tailles:Map<object,number[]>, deplacements:Map, boite:number[]}}
 */
function diaRedimensionnerRegion(f, contenu, d) {
  const vertical = f.parent.pile !== 'horizontale', debut = vertical ? f.y : f.x, taille = vertical ? f.h : f.w;
  let fin = debut + taille + d;
  const bout = q => (vertical ? q.y + q.h : q.x + q.w);
  if (contenu.length) fin = Math.max(fin, Math.max(...contenu.map(bout)) + 8);
  fin = Math.max(fin, debut + 20);
  // L'état grandit d'autant : il reste dans le compartiment de son conteneur (taille connue)
  const etat = f.parent, pp = etat.parent;
  if (pp && !pp.calculee && !pp.pile) fin = Math.min(fin, debut + taille + (vertical ? pp.y + pp.h - 2 - (etat.y + etat.h) : pp.x + pp.w - 2 - (etat.x + etat.w)));
  const n = Math.round(fin - debut);
  const t = vertical ? [f.w, n] : [n, f.h];
  return { tailles: new Map([[f, t]]), deplacements: new Map(), boite: [f.x, f.y, t[0], t[1]] };
}

/**
 * Position (coin) d'un port posé sur le bord de son parent au plus près d'un point, comme Sirius :
 * à gauche ou en haut, 2 px à l'extérieur ; à droite ou en bas, collé au bord intérieur.
 * @param {object} f forme du port
 * @param {number} cx abscisse visée du centre
 * @param {number} cy ordonnée visée du centre
 * @param {{x:number,y:number,w:number,h:number}} [p] parent (sa forme par défaut)
 * @returns {number[]} [x, y] absolus
 */
function diaPlacerPort(f, cx, cy, p) {
  p = p || f.parent;
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));
  const d = { gauche: Math.abs(cx - p.x), droite: Math.abs(p.x + p.w - cx), haut: Math.abs(cy - p.y), bas: Math.abs(p.y + p.h - cy) };
  const cote = Object.keys(d).reduce((a, b) => (d[b] < d[a] ? b : a));
  const x = borne(cx - f.w / 2, p.x - 2, p.x + p.w - f.w), y = borne(cy - f.h / 2, p.y - 2, p.y + p.h - f.h);
  if (cote === 'gauche') return [p.x - 2, y];
  if (cote === 'droite') return [p.x + p.w - f.w, y];
  if (cote === 'haut') return [x, p.y - 2];
  return [x, p.y + p.h - f.h];
}

/**
 * Lit les points enregistrés d'un lien (sourceX, sourceY, cibleX, cibleY relatifs aux ancres).
 * @param {object} aird résultat de diaLire
 * @param {object} l lien de la scène
 * @returns {{el:object, points:number[][]}|null} élément RelativeBendpoints et points, ou null
 */
function diaPointsBruts(aird, l) {
  const e = aird.parVue.get(l.vue), bp = e && diaEnfant(e, 'bendpoints');
  if (!bp) return null;
  const points = (xtAttr(bp, 'points') || '').split('$').map(p => p.replace(/[[\]\s]/g, '').split(',').map(Number))
    .filter(p => p.length === 4 && p.every(Number.isFinite));
  return { el: bp, points };
}

/**
 * Écrit des points de lien au format GMF : « [sx, sy, cx, cy]$[…] » (entiers).
 * @param {number[][]} points points bruts
 * @returns {string}
 */
function diaFormatPoints(points) {
  return points.map(p => '[' + p.map(v => Math.round(v)).join(', ') + ']').join('$');
}

/**
 * Décalage de chaque point d'un lien dont les extrémités bougent : chaque extrémité suit sa forme,
 * le premier et le dernier coude gardent l'alignement horizontal ou vertical de leur segment ;
 * les autres coudes restent en place.
 * @param {number[][]|null} aff points affichés (pour juger des alignements), ou null
 * @param {number} n nombre de points
 * @param {number[]} dS décalage de l'extrémité source
 * @param {number[]} dC décalage de l'extrémité cible
 * @returns {number[][]} décalage [dx, dy] de chaque point
 */
function diaDeltasLien(aff, n, dS, dC) {
  const delta = Array.from({ length: n }, () => [0, 0]);
  delta[0] = dS.slice(); delta[n - 1] = dC.slice();
  if (aff && n >= 3) {
    const suivre = (i, j, d) => {
      if (Math.abs(aff[i][1] - aff[j][1]) < 1) delta[j][1] = d[1];
      else if (Math.abs(aff[i][0] - aff[j][0]) < 1) delta[j][0] = d[0];
    };
    suivre(0, 1, dS);
    suivre(n - 1, n - 2, dC);
  }
  return delta;
}

/**
 * Points affichés d'un lien après le déplacement de ses extrémités (même règle que diaDeltasLien).
 * @param {number[][]} points points absolus
 * @param {number[]} dS décalage de l'extrémité source
 * @param {number[]} dC décalage de l'extrémité cible
 * @returns {number[][]}
 */
function diaPointsSuivis(points, dS, dC) {
  if (dS[0] === dC[0] && dS[1] === dC[1]) return points.map(p => [p[0] + dS[0], p[1] + dS[1]]);
  const d = diaDeltasLien(points, points.length, dS, dC);
  return points.map((p, i) => [p[0] + d[i][0], p[1] + d[i][1]]);
}

/**
 * Calcule les changements de la notation GMF pour une mise en page.
 * - deplacements : forme → [dx, dy] (la forme et tout son contenu, ports compris) ;
 * - tailles : forme → [largeur, hauteur] nouvelles (les ports des côtés droit et bas suivent le bord ; par la gauche
 *   ou le haut, la forme est aussi déplacée et son contenu contre-déplacé : diaRedimensionner) ;
 * - traces : lien → points absolus voulus (après déplacements), extrémités comprises ;
 * - ancres : lien → { source?, cible? } : fractions [fx, fy] de la forme où l'extrémité s'accroche (IdentityAnchor), avec un
 *   tracé imposé (diaExtremite).
 * - etiquettes : lien → { centre?, debut?, fin? } : décalages GMF [x, y] des étiquettes (diaDecalageEtiquette).
 * Les liens touchés suivent : un lien dont les deux extrémités bougent ensemble garde ses points ; sinon
 * chaque extrémité suit sa forme, et le premier ou dernier coude garde l'alignement horizontal ou vertical.
 * @param {object} aird résultat de diaLire
 * @param {object} scene scène du diagramme (diaScene)
 * @param {{deplacements?:Map, tailles?:Map, traces?:Map, ancres?:Map, etiquettes?:Map}} m modifications voulues
 * @returns {Array<{el:object, n:string, avant:(string|null), apres:(string|null), ordre:string[]}>} changements
 */
function diaMiseEnPage(aird, scene, m) {
  const deplacements = new Map(m.deplacements || []), tailles = m.tailles || new Map(), traces = m.traces || new Map(), ancres = m.ancres || new Map();

  const changements = new Map();                   // élément → Map(nom → [valeur, ordre])
  const definir = (el, n, v, ordre) => { if (!changements.has(el)) changements.set(el, new Map()); changements.get(el).set(n, [v, ordre]); };
  const entier = v => Math.round(v);
  const valeurBorne = (v, defaut) => (entier(v) === defaut ? null : String(entier(v)));
  // Étiquettes de liens : position GMF (x, y) du nœud d'étiquette (6001 centre, 6002 début, 6003 fin)
  for (const [l, dec] of m.etiquettes || []) {
    const e = aird.parVue.get(l.vue);
    for (const [quoi, type] of [['centre', '6001'], ['debut', '6002'], ['fin', '6003']]) {
      if (!dec[quoi] || !e) continue;
      const et = e.enfants.find(c => c.tag === 'children' && xtAttr(c, 'type') === type), lc = et && diaEnfant(et, 'layoutConstraint');
      if (!lc) throw new Error(_L('Étiquette du lien introuvable dans la notation.'));
      definir(lc, 'x', dec[quoi][0] ? String(dec[quoi][0]) : null, DIA_ORDRE_BORNES);
      definir(lc, 'y', dec[quoi][1] ? String(dec[quoi][1]) : null, DIA_ORDRE_BORNES);
    }
  }
  // Redimensionnement : nouvelle taille enregistrée ; ports des côtés droit et bas déplacés avec le bord
  const decalRef = new Map();                      // forme → décalage de son point de référence dû à la taille
  for (const [f, [w, h]] of tailles) {
    const lc = diaEnfant(aird.parVue.get(f.vue), 'layoutConstraint');
    if (f.region) {
      // Région : seule la dimension de la pile est écrite (Sirius étire l'autre) ; l'état grandit d'autant si sa taille
      // est enregistrée (sinon Sirius la calcule)
      const vertical = f.parent.pile !== 'horizontale', n = vertical ? 'height' : 'width', v = vertical ? h : w, d = v - (vertical ? f.h : f.w);
      definir(lc, n, String(entier(v)), DIA_ORDRE_BORNES);
      const lp = diaEnfant(aird.parVue.get(f.parent.vue), 'layoutConstraint'), vp = lp && +(xtAttr(lp, n) || 0);
      if (vp > 0) definir(lp, n, String(entier(vp + d)), DIA_ORDRE_BORNES);
      continue;
    }
    definir(lc, 'width', String(entier(w)), DIA_ORDRE_BORNES);
    definir(lc, 'height', String(entier(h)), DIA_ORDRE_BORNES);
    const dw = w - f.w, dh = h - f.h;
    decalRef.set(f, [dw, dh]);
    for (const p of scene.formes) {
      if (p.parent !== f || p.genre !== 'port') continue;
      const cote = diaCotePort(p);
      const d = cote === 'droite' ? [dw, 0] : cote === 'bas' ? [0, dh] : null;
      if (d) { const a = deplacements.get(p) || [0, 0]; deplacements.set(p, [a[0] + d[0], a[1] + d[1]]); }
    }
  }
  // Déplacements : position relative au parent (x, y absents quand ils valent 0)
  for (const [f, [dx, dy]] of deplacements) {
    if (!dx && !dy) continue;
    const lc = diaEnfant(aird.parVue.get(f.vue), 'layoutConstraint');
    const b = diaBornes(aird.parVue.get(f.vue));
    if (dx) definir(lc, 'x', valeurBorne(b.x + dx, 0), DIA_ORDRE_BORNES);
    if (dy) definir(lc, 'y', valeurBorne(b.y + dy, 0), DIA_ORDRE_BORNES);
  }
  /** Décalage total d'une forme : le sien et celui de ses conteneurs. */
  const decalage = f => {
    let x = 0, y = 0;
    for (let p = f; p; p = p.parent) { const d = deplacements.get(p); if (d) { x += d[0]; y += d[1]; } }
    return [x, y];
  };
  /** Décalage du point de référence d'une extrémité de lien (ancre dans la forme). */
  const decalAncre = (f, e, tag) => {
    const [x, y] = decalage(f), r = decalRef.get(f);
    if (!r) return [x, y];
    const [fx, fy] = diaFraction(e, tag);
    return [x + r[0] * fx, y + r[1] * fy];
  };

  for (const l of scene.liens) {
    const e = aird.parVue.get(l.vue), bruts = diaPointsBruts(aird, l);
    if (!e || !bruts) continue;
    const dS = decalAncre(l.source, e, 'sourceAnchor'), dC = decalAncre(l.cible, e, 'targetAnchor');
    let nouveaux = null;
    if (traces.has(l)) {
      // Tracé imposé : points absolus rapportés aux ancres après déplacement
      /** Point de référence de l'ancre après déplacement et redimensionnement. */
      const ref = (f, tag) => {
        const a = ancres.get(l), imposee = a && (tag === 'sourceAnchor' ? a.source : a.cible);
        const [x, y] = decalage(f), [w, h] = tailles.get(f) || [f.w, f.h], [fx, fy] = imposee || diaFraction(e, tag);
        return [f.x + x + w * fx, f.y + y + h * fy];
      };
      // Ancre imposée (extrémité glissée sur le pourtour) : IdentityAnchor « (fx,fy) »
      const a = ancres.get(l);
      for (const [tag, fr] of [['sourceAnchor', a && a.source], ['targetAnchor', a && a.cible]]) {
        if (!fr) continue;
        const an = diaEnfant(e, tag);
        if (!an) throw new Error(_L('Ce lien n\'a pas d\'ancre GMF à déplacer.'));
        definir(an, 'id', '(' + fr[0] + ',' + fr[1] + ')', DIA_ORDRE_ANCRE);
      }
      const rs = ref(l.source, 'sourceAnchor'), rc = ref(l.cible, 'targetAnchor');
      nouveaux = traces.get(l).map(p => [p[0] - rs[0], p[1] - rs[1], p[0] - rc[0], p[1] - rc[1]]);
    } else {
      if (dS[0] === dC[0] && dS[1] === dC[1]) continue;      // tout le lien se déplace d'un bloc : points inchangés
      const n = bruts.points.length;
      if (n < 2) continue;
      const delta = diaDeltasLien(l.points.length === n ? l.points : null, n, dS, dC);
      nouveaux = bruts.points.map((p, i) => [p[0] + delta[i][0] - dS[0], p[1] + delta[i][1] - dS[1], p[2] + delta[i][0] - dC[0], p[3] + delta[i][1] - dC[1]]);
    }
    definir(bruts.el, 'points', diaFormatPoints(nouveaux), DIA_ORDRE_POINTS);
  }

  const res = [];
  for (const [el, vals] of changements) {
    for (const [n, [v, ordre]] of vals) {
      const avant = xtAttr(el, n) ?? null;
      if (avant !== v) res.push({ el, n, avant, apres: v, ordre });
    }
  }
  return res;
}

/** Ordre EMF des attributs d'un filtre AbsoluteBoundsFilter de Sirius (constaté dans les .aird d'IFE et d'AIDA). */
const DIA_ORDRE_FILTRE = ['xmi:type', 'uid', 'x', 'y', 'height', 'width'];

/**
 * Mise en page d'un diagramme de séquence, comme Sirius l'accepte : une instance (ligne de vie) se déplace à l'horizontale,
 * avec tout ce qu'elle porte (exécutions, états, fin de vie). Sirius garde dans chaque élément un filtre
 * AbsoluteBoundsFilter (position absolue de la dernière mise en page) : décalé avec la forme. Les fragments (combinés,
 * références) restent calés sur les bords des lignes de vie qu'ils couvrent (constaté sur les 77 séquences d'IFE et d'AIDA) :
 * leur abscisse et leur largeur suivent, opérandes compris. Refus : têtes qui se chevaucheraient, fragment qui couvrirait
 * une autre ligne de vie (Sirius n'admet pas qu'un fragment traverse une ligne de vie qu'il ne couvre pas).
 * Ordre gauche → droite des instances rendu pour réordonner le modèle (InstanceRoleReorderTool : DoIRReorderExternalAction).
 * @param {object} aird résultat de diaLire
 * @param {object} scene scène de la séquence
 * @param {Map<object, number[]>} deplacements forme → [dx, dy] (dy ignoré ; formes autres que les instances ignorées)
 * @returns {{changements:Array, ordre:string[]}} changements du .aird et identifiants des instances dans leur nouvel ordre
 * @throws {Error} déplacement refusé
 */
function diaMiseEnPageSequence(aird, scene, deplacements) {
  const irs = scene.formes.filter(f => !f.parent && f.typeSem === 'InstanceRole'), dx = new Map();
  for (const [f, d] of deplacements) if (irs.includes(f) && Math.round(d[0])) dx.set(f, Math.round(d[0]));
  if (!dx.size) return { changements: [], ordre: [] };
  const nx = f => f.x + (dx.get(f) || 0), centre = (f, x) => x + f.w / 2;
  const tries = irs.slice().sort((a, b) => nx(a) - nx(b));
  for (let i = 1; i < tries.length; i++) {
    const a = tries[i - 1], b = tries[i];
    if (nx(a) + a.w > nx(b)) throw new Error(_Lp('Les lignes de vie « {a} » et « {b} » se chevaucheraient.', { a: a.texte, b: b.texte }));
  }
  if (tries.some(f => nx(f) < 0)) throw new Error(_L('Une ligne de vie sortirait du diagramme.'));
  // Fragments : lignes de vie couvertes (centre de la tête dans le cadre), nouveau cadre calé sur leurs bords
  const cadres = new Map();
  for (const fr of scene.formes.filter(f => !f.parent && (f.fragment === 'combine' || f.fragment === 'reference'))) {
    const couvertes = irs.filter(i => centre(i, i.x) > fr.x && centre(i, i.x) < fr.x + fr.w);
    if (!couvertes.length || !couvertes.some(i => dx.has(i))) continue;
    const g = Math.min(...couvertes.map(i => nx(i))) - (Math.min(...couvertes.map(i => i.x)) - fr.x);
    const d = Math.max(...couvertes.map(i => nx(i) + i.w)) + (fr.x + fr.w - Math.max(...couvertes.map(i => i.x + i.w)));
    const intrus = irs.find(i => !couvertes.includes(i) && centre(i, nx(i)) > g && centre(i, nx(i)) < d);
    if (intrus) throw new Error(_Lp('« {i} » se trouverait dans le fragment « {f} » sans en faire partie.', { i: intrus.texte, f: fr.operateur || fr.texte }));
    if (g !== fr.x || d - g !== fr.w) cadres.set(fr, [g, d - g]);
  }
  // Notation GMF : instances déplacées (contenu relatif), fragments déplacés et élargis, opérandes élargis
  const dep = new Map([...dx].map(([f, d]) => [f, [d, 0]])), tailles = new Map();
  for (const [fr, [g, w]] of cadres) {
    if (g !== fr.x) dep.set(fr, [g - fr.x, 0]);
    if (w !== fr.w) {
      tailles.set(fr, [w, fr.h]);
      for (const o of scene.formes) if (o.parent === fr && o.fragment === 'operande') tailles.set(o, [w, o.h]);
    }
  }
  const changements = diaMiseEnPage(aird, scene, { deplacements: dep, tailles });
  // Filtres AbsoluteBoundsFilter : contenu des instances décalé, fragments et opérandes recalés
  const filtre = f => { const s = aird.parUid.get(f.uid); return s && s.enfants.find(c => c.tag === 'graphicalFilters' && /AbsoluteBoundsFilter/.test(xtAttr(c, 'xmi:type') || '')); };
  const poser = (f, n, v) => {
    const fl = filtre(f);
    if (!fl || xtAttr(fl, n) == null) return;
    const avant = xtAttr(fl, n), apres = String(Math.round(v));
    if (avant !== apres) changements.push({ el: fl, n, avant, apres, ordre: DIA_ORDRE_FILTRE });
  };
  for (const f of scene.formes) {
    const i = diaInstance(f), d = dx.get(i);
    if (d) { const fl = filtre(f); if (fl && xtAttr(fl, 'x') != null) poser(f, 'x', +xtAttr(fl, 'x') + d); }
  }
  for (const [fr, [g, w]] of cadres) {
    for (const o of [fr, ...scene.formes.filter(o => o.parent === fr && o.fragment === 'operande')]) { poser(o, 'x', g); poser(o, 'width', w); }
  }
  return { changements, ordre: tries.map(f => f.semId) };
}

/* ─────────────────────────────── Mise en page automatique (E5) ─────────────────────────────── */

/**
 * Sens dominant des liens entre des formes sœurs (pour la disposition en couches) : côté des ports d'où partent les liens
 * (un port de sortie à droite : vers la droite), sinon position de la cible par rapport à la source ; vers la droite à égalité.
 * @param {object} scene scène du diagramme
 * @param {object[]} formes formes sœurs
 * @returns {'droite'|'gauche'|'bas'|'haut'}
 */
function diaSensDominant(scene, formes) {
  const ens = new Set(formes), racine = f => { for (let p = f; p; p = p.parent) if (ens.has(p)) return p; return null; };
  const voix = { droite: 0, gauche: 0, bas: 0, haut: 0 };
  for (const l of scene.liens) {
    const a = racine(l.source), b = racine(l.cible);
    if (l.attacheNote || !a || !b || a === b) continue;
    if (l.source.genre === 'port' && l.source.parent) { voix[diaCotePort(l.source)]++; continue; }
    const dx = b.x + b.w / 2 - a.x - a.w / 2, dy = b.y + b.h / 2 - a.y - a.h / 2;
    voix[Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'droite' : 'gauche') : (dy >= 0 ? 'bas' : 'haut')]++;
  }
  return Object.keys(voix).reduce((m, k) => (voix[k] > voix[m] ? k : m), 'droite');
}

/** Écarts de la mise en page automatique : entre deux couches (ou niveaux), entre deux formes, marge dans un conteneur. */
const DIA_ECARTS = { couche: 80, forme: 30, marge: 12 };

/**
 * Débord d'une forme dû à son nom écrit dehors (sous un acteur, une capacité, un pseudo-état… : diaEtiquetteExterne), à
 * réserver autour d'elle quand on la place.
 * @param {object} f forme
 * @returns {{gauche:number, droite:number, haut:number, bas:number}} marges (px) au-delà de la forme
 */
function diaDebordEtiquette(f) {
  const zero = { gauche: 0, droite: 0, haut: 0, bas: 0 };
  if (f.posTexte !== 'dessous' || !f.texte) return zero;
  const e = diaEtiquetteExterne(f), t = f.police.taille, lt = e.uneLigne ? diaLargeurTexte(f.texte, t) : Math.min(diaLargeurTexte(f.texte, t), 160);
  const lh = e.uneLigne ? t * 1.4 : diaNbLignes(f.texte, 160, t) * t * 1.25 + 2;
  const x0 = e.ancre === 'start' ? e.x : e.ancre === 'end' ? e.x - lt : e.x - lt / 2, y0 = e.y;
  return { gauche: Math.max(0, f.x - x0), droite: Math.max(0, x0 + lt - f.x - f.w), haut: Math.max(0, f.y - y0), bas: Math.max(0, y0 + lh - f.y - f.h) };
}

/**
 * Diagramme en étoile (diagrammes de capacités, de missions, de contexte…) : une forme, le pivot, est reliée à au moins trois
 * autres et toutes les formes reliées le sont au pivot (les liens qui ne le touchent pas sont au plus un sur cinq) ; le pivot
 * ne contient pas d'autres formes et ses liens le touchent lui-même (au moins quatre sur cinq : pas ses ports ni son contenu).
 * @param {object} scene scène du diagramme
 * @param {object[]} formes formes sœurs à disposer
 * @returns {{pivot:object, voisins:object[]}|null} pivot et ses voisins (dans l'ordre de lecture), null si ce n'est pas une étoile
 */
function diaEtoile(scene, formes) {
  const ens = new Set(formes), racine = f => { for (let p = f; p; p = p.parent) if (ens.has(p)) return p; return null; };
  const voisins = new Map(formes.map(f => [f, new Set()])), arcs = [];
  for (const l of scene.liens) {
    if (l.attacheNote) continue;
    const a = racine(l.source), b = racine(l.cible);
    if (!a || !b || a === b) continue;
    voisins.get(a).add(b); voisins.get(b).add(a); arcs.push([a, b]);
  }
  const pivot = formes.slice().sort((a, b) => voisins.get(b).size - voisins.get(a).size)[0];
  if (!pivot || voisins.get(pivot).size < 3) return null;
  if (scene.liens.some(l => l.arbre && (racine(l.source) === pivot || racine(l.cible) === pivot))) return null;   // décomposition : un arbre
  // Pivot simple : il ne contient pas d'autres formes, et ses liens le touchent lui-même (pas ses ports ni son contenu)
  if (scene.formes.some(f => f.parent === pivot && f.genre !== 'port')) return null;
  const siens = scene.liens.filter(l => !l.attacheNote && (racine(l.source) === pivot || racine(l.cible) === pivot));
  if (siens.filter(l => l.source === pivot || l.cible === pivot).length < siens.length * 0.8) return null;
  const lies = formes.filter(f => voisins.get(f).size);
  if (lies.some(f => f !== pivot && !voisins.get(f).has(pivot))) return null;
  if (arcs.filter(([a, b]) => a !== pivot && b !== pivot).length > arcs.length / 5) return null;
  return { pivot, voisins: [...voisins.get(pivot)].sort((a, b) => (Math.abs(a.y - b.y) > 10 ? a.y - b.y : a.x - b.x)) };
}

/**
 * Mise en page automatique de formes sœurs (même conteneur, ou le diagramme) : chacune se déplace d'un bloc avec son
 * contenu ; les liens entre elles (portés par elles, leurs ports ou leur contenu) donnent le graphe.
 * - « couches » : graphe orienté en couches (méthode de Sugiyama) — cycles rompus (arcs retour inversés), couche = plus long
 *   chemin depuis les sources, ordre dans la couche par barycentres (allers-retours), couches dans le sens voulu (droite,
 *   gauche, bas, haut), nœuds fictifs sur les arcs qui sautent des couches, échanges de voisins, chaque forme tirée vers ses
 *   voisines ; ports reliés replacés sur le côté tourné vers l'autre extrémité ; formes sans lien rangées en grille après le graphe ;
 * - « arbre » : arbre de haut en bas, racine en haut (décompositions de Capella : lien de l'enfant vers son parent ; le sens
 *   est déduit des liens, celui où chaque forme a un seul parent ; premier parent retenu), arbre compact à contours
 *   (Reingold–Tilford : sous-arbres frères rapprochés à chaque profondeur), parent centré au-dessus de ses enfants extrêmes,
 *   frères et racines dans leur ordre actuel de gauche à droite ; arbres indépendants rangés en rangées (rapport d'écran) ;
 *   une feuille dont le nom ne tient pas grandit pour le loger (noms jamais coupés) ;
 * - « grille » : grille compacte dans l'ordre de lecture (lignes puis colonnes), colonnes de la largeur de leur plus large forme ;
 * - « etoile » : diagramme en étoile (diaEtoile) équilibré, pivot au centre, voisins répartis autour par genre (sinon : couches).
 * Le coin haut gauche de l'ensemble est gardé (dans un conteneur : au moins à la marge de son compartiment) ; un conteneur
 * trop petit grandit, et ses propres conteneurs avec lui. Les liens touchés sont retracés (angles droits, ou direct) sur les positions nouvelles.
 * @param {object} aird résultat de diaLire (ancres GMF des liens)
 * @param {object} scene scène du diagramme
 * @param {object[]} formes formes sœurs à disposer (au moins deux)
 * @param {'couches'|'arbre'|'grille'|'etoile'} genre disposition
 * @param {{sens?:('droite'|'gauche'|'bas'|'haut'), trace?:('orthogonal'|'direct'|null)}} [opt] sens des couches (droite par
 *   défaut ; diaSensDominant donne celui des liens existants), tracé
 *   des liens (angles droits par défaut ; null : les liens suivent leurs formes)
 * @returns {{deplacements:Map<object,number[]>, tailles:Map<object,number[]>, traces:Map<object,number[][]>, ancres:Map}}
 */
function diaDisposer(aird, scene, formes, genre, opt) {
  opt = opt || {};
  const ens = new Set(formes), parent = formes[0].parent || null, E = DIA_ECARTS;
  const racine = f => { for (let p = f; p; p = p.parent) if (ens.has(p)) return p; return null; };
  // Graphe : arcs entre formes distinctes de l'ensemble (sans doublon), dans l'ordre des liens
  const succ = new Map(formes.map(f => [f, []])), pred = new Map(formes.map(f => [f, []])), vus = new Set();
  for (const l of scene.liens) {
    if (l.attacheNote) continue;
    const a = racine(l.source), b = racine(l.cible);
    if (!a || !b || a === b || vus.has(a.vue + '>' + b.vue)) continue;
    vus.add(a.vue + '>' + b.vue); succ.get(a).push(b); pred.get(b).push(a);
  }
  const x0 = Math.max(Math.min(...formes.map(f => f.x)), parent ? parent.x + DIA_COMPARTIMENT.x + E.marge : -Infinity);
  const y0 = Math.max(Math.min(...formes.map(f => f.y)), parent ? parent.y + DIA_COMPARTIMENT.y + parent.police.taille + E.marge : -Infinity);
  const pos = new Map(), niveau = new Map();          // niveau : couche ou profondeur (côté des ports)
  const lecture = (a, b) => (Math.abs(a.y - b.y) > 10 ? a.y - b.y : a.x - b.x);
  /** Grille compacte de formes à partir d'un coin ; rend la boîte occupée. */
  const grille = (fs, gx, gy) => {
    const n = fs.length, cols = Math.max(1, Math.ceil(Math.sqrt(n))), larg = [], haut = [];
    fs.forEach((f, i) => { const c = i % cols, r = Math.floor(i / cols); larg[c] = Math.max(larg[c] || 0, f.w); haut[r] = Math.max(haut[r] || 0, f.h); });
    fs.forEach((f, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      pos.set(f, [gx + larg.slice(0, c).reduce((s, v) => s + v + E.forme, 0), gy + haut.slice(0, r).reduce((s, v) => s + v + E.forme, 0)]);
    });
    return { w: larg.reduce((s, v) => s + v, 0) + E.forme * (larg.length - 1), h: haut.reduce((s, v) => s + v, 0) + E.forme * (haut.length - 1) };
  };
  // Arbre : une feuille (rien d'autre que des ports) dont le nom ne tient pas grandit pour le loger (jamais ne rétrécit) :
  // plus large par pas de 10 jusqu'à 260, puis plus haute
  const neuves = new Map(), T = f => neuves.get(f) || [f.w, f.h];
  if (genre === 'arbre') for (const f of formes) {
    if (!f.texte || f.posTexte === 'dessous' || f.replie || f.pile || f.region || f.calculee || scene.formes.some(g => g.parent === f && g.genre !== 'port')) continue;
    // (le plus long mot tient sur une ligne : jamais coupé au milieu)
    const t = f.police.taille, ligne = t * 1.25, mot = Math.max(...f.texte.split(/\s+/).map(m => diaLargeurTexte(m, t)));
    const loge = (w, h) => w - 34 >= mot && diaNbLignes(f.texte, w - 34, t) * ligne + 10 <= h;
    if (loge(f.w, f.h)) continue;
    let w = f.w;
    while (w < 260 && !loge(w, f.h)) w += 10;
    const h = loge(w, f.h) ? f.h : Math.max(f.h, Math.ceil(diaNbLignes(f.texte, w - 34, t) * ligne + 10));
    neuves.set(f, [Math.round(w), Math.round(h)]);
  }
  const etoile = genre === 'etoile' ? diaEtoile(scene, formes) : null;
  let bus = null;                                     // étoile : côtés des voisins, pour tracer les liens en bus
  if (genre === 'etoile' && !etoile) genre = 'couches';
  if (genre === 'grille') grille(formes.slice().sort(lecture), x0, y0);
  else if (genre === 'etoile') {
    // Étoile équilibrée (#3014 de Capella : pivot collé à un bord, liens éventaillés) : pivot au centre ; flux : entrées à
    // gauche, sorties à droite ; sinon voisins groupés par genre (type de l'élément) : le plus grand groupe en rangée sous le
    // pivot (partagé avec une rangée au-dessus s'il dépasse six), le suivant partagé à gauche et à droite, les autres
    // au-dessus ; un seul genre : réparti sur les quatre côtés, à peu près au carré ; chaque rangée et colonne centrée sur le pivot,
    // noms écrits dehors réservés (diaDebordEtiquette) ; formes sans lien en grille dessous
    const { pivot, voisins } = etoile, D = new Map(formes.map(f => [f, diaDebordEtiquette(f)]));
    const larg = f => f.w + D.get(f).gauche + D.get(f).droite, haut = f => f.h + D.get(f).haut + D.get(f).bas;
    const groupes = new Map();
    for (const v of voisins) { const k = v.typeSem || v.genre; if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(v); }
    const tries = [...groupes.values()].sort((a, b) => b.length - a.length);
    const bas = [], dessus = [], gauche = [], droite = [];
    const partager = (g, a, b) => g.forEach((f, i) => (i % 2 ? b : a).push(f));
    // Flux (échanges fonctionnels, de composants, interactions) : les voisins qui envoient au pivot à gauche, ceux qui en reçoivent à droite, ceux qui font
    // les deux dessous ; une colonne trop haute (plus de six) déborde en rangée au-dessus ou au-dessous
    const flux = scene.liens.some(l => (l.source === pivot || l.cible === pivot) && /Exchange|Interaction/.test(l.typeSem || ''));
    const entre = flux ? voisins.filter(v => succ.get(v).includes(pivot) && !pred.get(v).includes(pivot)) : [];
    const sort = flux ? voisins.filter(v => pred.get(v).includes(pivot) && !succ.get(v).includes(pivot)) : [];
    if (entre.length && sort.length) {
      gauche.push(...entre.slice(0, 6)); droite.push(...sort.slice(0, 6));
      dessus.push(...entre.slice(6)); bas.push(...voisins.filter(v => !entre.includes(v) && !sort.includes(v)), ...sort.slice(6));
    } else if (tries.length === 1) {
      // Un seul genre : réparti sur les quatre côtés, à peu près au carré (une colonne empile ses formes : chacune prend
      // trois voisins sur dix, les rangées le reste)
      const g = tries[0], c = Math.max(1, Math.round(g.length * 0.3));
      partager(g.slice(0, 2 * c), gauche, droite); partager(g.slice(2 * c), bas, dessus);
    } else {
      if (tries[0].length > 6) partager(tries[0], bas, dessus); else bas.push(...tries[0]);
      partager(tries[1], gauche, droite);
      for (const g of tries.slice(2)) dessus.push(...g);
    }
    const ecart = E.couche, pas = E.forme;
    const rangee = fs => fs.reduce((t, f) => t + larg(f), 0) + pas * Math.max(0, fs.length - 1);
    const colonne = fs => fs.reduce((t, f) => t + haut(f), 0) + pas * Math.max(0, fs.length - 1);
    const hRangee = fs => Math.max(0, ...fs.map(haut)), lColonne = fs => Math.max(0, ...fs.map(larg));
    // Pivot : centré dans l'espace laissé par les colonnes et la rangée du dessus
    const cx = x0 + Math.max(lColonne(gauche) + (gauche.length ? ecart : 0) + larg(pivot) / 2, rangee(dessus) / 2, rangee(bas) / 2);
    const cy = y0 + (dessus.length ? hRangee(dessus) + ecart : 0) + Math.max(haut(pivot), colonne(gauche), colonne(droite)) / 2;
    const poser = (f, gx, gy) => pos.set(f, [gx + D.get(f).gauche, gy + D.get(f).haut]);
    poser(pivot, cx - larg(pivot) / 2, cy - haut(pivot) / 2);
    const enRangee = (fs, y) => { let x = cx - rangee(fs) / 2; for (const f of fs) { poser(f, x, y); x += larg(f) + pas; } };
    const enColonne = (fs, x, aDroite) => { let y = cy - colonne(fs) / 2; for (const f of fs) { poser(f, aDroite ? x : x - larg(f), y); y += haut(f) + pas; } };
    enRangee(dessus, y0);
    enColonne(gauche, cx - larg(pivot) / 2 - ecart, false);
    enColonne(droite, cx + larg(pivot) / 2 + ecart, true);
    const yBas = cy + Math.max(haut(pivot), colonne(gauche), colonne(droite)) / 2 + ecart;
    enRangee(bas, yBas);
    const seuls = formes.filter(f => !pos.has(f));
    if (seuls.length) grille(seuls.sort(lecture), x0, yBas + (bas.length ? hRangee(bas) + ecart : 0));
    for (const f of formes) niveau.set(f, f === pivot ? 1 : bas.includes(f) ? 2 : dessus.includes(f) ? 0 : 1);
    bus = { pivot, bas, dessus, gauche, droite, D };
  }
  else if (genre === 'arbre') {
    // Sens des liens : dans un arbre, chaque forme a un seul parent. Les liens de décomposition de Capella vont de l'enfant
    // au parent (…_subFunctions, …_subComponents) : le parent est alors la cible. Le sens retenu est celui où le moins de
    // formes ont plusieurs parents (à égalité : le parent est la source)
    const plusieurs = m => formes.filter(f => m.get(f).length > 1).length;
    const versParent = plusieurs(succ) < plusieurs(pred);
    const parents = versParent ? succ : pred;
    // Parent de chaque forme : premier lien vers un parent qui ne crée pas de cycle
    const pere = new Map(), enfants = new Map(formes.map(f => [f, []]));
    const ancetre = (a, b) => { for (let p = a; p; p = pere.get(p)) if (p === b) return true; return false; };
    for (const f of formes.slice().sort((a, b) => a.x - b.x)) for (const p of parents.get(f)) if (!pere.has(f) && !ancetre(p, f)) { pere.set(f, p); enfants.get(p).push(f); }
    for (const l of enfants.values()) l.sort((a, b) => a.x + a.w / 2 - b.x - b.w / 2);
    const prof = new Map(), hauteurs = [];
    const descendre = (f, d) => { prof.set(f, d); niveau.set(f, d); hauteurs[d] = Math.max(hauteurs[d] || 0, T(f)[1]); for (const c of enfants.get(f)) descendre(c, d + 1); };
    const racines = formes.filter(f => !pere.has(f)).sort((a, b) => a.x + a.w / 2 - b.x - b.w / 2);
    for (const r of racines) descendre(r, 0);
    const yDe = d => y0 + hauteurs.slice(0, d).reduce((s, v) => s + v + E.couche * 0.75, 0);
    // Arbre compact (Reingold–Tilford) : chaque sous-arbre est décrit par son contour (bords gauche et droit à chaque
    // profondeur, relatifs au centre de sa racine) ; les sous-arbres frères sont rapprochés jusqu'à ce que leurs contours
    // soient à l'écart voulu à chaque profondeur commune (un sous-arbre peu profond se glisse contre un voisin profond),
    // puis le parent est centré sur ses enfants extrêmes
    const decalage = new Map();                        // forme → abscisse de son centre relative au centre de son parent
    /** Rapproche des sous-arbres (contours) de gauche à droite ; rend leurs décalages et le contour réuni. */
    const accoler = contours => {
      const dec = [0], gauche = contours[0].map(c => c[0]), droite = contours[0].map(c => c[1]);
      for (let i = 1; i < contours.length; i++) {
        const c = contours[i];
        let x = -Infinity;
        for (let d = 0; d < Math.min(c.length, droite.length); d++) x = Math.max(x, droite[d] - c[d][0] + E.forme);
        if (x === -Infinity) x = 0;
        dec.push(x);
        c.forEach((v, d) => {
          gauche[d] = d < gauche.length ? Math.min(gauche[d], x + v[0]) : x + v[0];
          droite[d] = d < droite.length ? Math.max(droite[d], x + v[1]) : x + v[1];
        });
      }
      return { dec, contour: gauche.map((g, d) => [g, droite[d]]) };
    };
    const contourDe = f => {
      const cs = enfants.get(f), propre = [-T(f)[0] / 2, T(f)[0] / 2];
      if (!cs.length) return [propre];
      const { dec, contour } = accoler(cs.map(contourDe)), milieu = (dec[0] + dec[dec.length - 1]) / 2;
      cs.forEach((c, i) => decalage.set(c, dec[i] - milieu));
      return [propre, ...contour.map(([g, d]) => [g - milieu, d - milieu])];
    };
    // Arbres indépendants (racines) rangés en rangées, dans leur ordre : largeur visée d'après la surface totale, pour un
    // rapport largeur / hauteur proche de celui d'un écran (16 / 10) ; jamais moins large que l'arbre le plus large. Seules
    // les racines passent à la ligne : sous un même parent, le routage en arbre de Sirius veut les enfants sur une rangée
    const contours = racines.map(contourDe), etendue = c => Math.max(...c.map(v => v[1])) - Math.min(...c.map(v => v[0]));
    const hauteurDe = c => yDe(c.length) - y0 - E.couche * 0.75;
    const visee = Math.max(...contours.map(etendue), Math.sqrt(contours.reduce((t, c) => t + (etendue(c) + E.forme) * (hauteurDe(c) + E.couche), 0) * 1.6));
    const rangees = [[]];
    for (let i = 0; i < racines.length; i++) {
      const r = rangees[rangees.length - 1], essai = accoler([...r, i].map(k => contours[k]));
      if (r.length && Math.max(...essai.contour.map(v => v[1])) - Math.min(...essai.contour.map(v => v[0])) > visee) rangees.push([i]); else r.push(i);
    }
    const placer = (f, cx, dy) => { pos.set(f, [cx - T(f)[0] / 2, yDe(prof.get(f)) + dy]); for (const c of enfants.get(f)) placer(c, cx + decalage.get(c), dy); };
    let dy = 0;
    for (const r of rangees) {
      const t = accoler(r.map(k => contours[k])), gauche = Math.min(...t.contour.map(c => c[0]));
      r.forEach((k, i) => placer(racines[k], x0 - gauche + t.dec[i], dy));
      dy += Math.max(...r.map(k => hauteurDe(contours[k]))) + E.couche;
    }
  } else {
    const sens = opt.sens || 'droite', horizontal = sens === 'droite' || sens === 'gauche';
    const lies = formes.filter(f => succ.get(f).length || pred.get(f).length), seuls = formes.filter(f => !lies.includes(f));
    // Cycles rompus : arcs retour d'un parcours en profondeur (dans l'ordre de lecture) inversés
    const S = new Map(lies.map(f => [f, []])), P = new Map(lies.map(f => [f, []])), etat = new Map();
    const parcourir = f => {
      etat.set(f, 1);
      for (const g of succ.get(f)) {
        if (etat.get(g) === 1) { S.get(g).push(f); P.get(f).push(g); }        // arc retour : inversé
        else { S.get(f).push(g); P.get(g).push(f); if (!etat.has(g)) parcourir(g); }
      }
      etat.set(f, 2);
    };
    for (const f of lies.slice().sort(lecture)) if (!etat.has(f)) parcourir(f);
    // Couches : plus long chemin depuis les sources
    const couche = new Map();
    const rang = f => { if (couche.has(f)) return couche.get(f); couche.set(f, 0); const r = P.get(f).length ? Math.max(...P.get(f).map(rang)) + 1 : 0; couche.set(f, r); return r; };
    for (const f of lies) rang(f);
    for (const f of lies) niveau.set(f, couche.get(f));
    // Nœuds fictifs sur les arcs qui sautent des couches : ils réservent le passage du lien et comptent dans l'ordre
    const H = new Map(lies.map(f => [f, S.get(f).slice()])), B = new Map(lies.map(f => [f, P.get(f).slice()]));
    const tous = lies.slice(), fictif = new Set();
    for (const f of lies) for (const g of S.get(f)) {
      const d = couche.get(g) - couche.get(f);
      if (d <= 1) continue;
      let prec = f;
      H.get(f).splice(H.get(f).indexOf(g), 1); B.get(g).splice(B.get(g).indexOf(f), 1);
      for (let k = 1; k < d; k++) {
        const v = { x: 0, y: 0, w: horizontal ? 1 : 10, h: horizontal ? 10 : 1, vue: '' };
        fictif.add(v); tous.push(v); couche.set(v, couche.get(f) + k); H.set(v, []); B.set(v, [prec]); H.get(prec).push(v);
        v.x = f.x + (g.x - f.x) * k / d; v.y = f.y + (g.y - f.y) * k / d;
        prec = v;
      }
      H.get(prec).push(g); B.get(g).push(prec);
    }
    const couches = [];
    for (const f of tous) (couches[couche.get(f)] = couches[couche.get(f)] || []).push(f);
    const axe = f => (horizontal ? f.y + f.h / 2 : f.x + f.w / 2);
    for (const c of couches) c.sort((a, b) => axe(a) - axe(b));
    // Ordre : barycentres (allers vers les successeurs, retours vers les prédécesseurs), puis échanges de voisins qui
    // réduisent les croisements ; le meilleur ordre trouvé est gardé
    const indice = new Map();
    const noter = () => { for (const c of couches) c.forEach((f, i) => indice.set(f, i)); };
    const croisementsEntre = (c) => {
      let n = 0;
      const arcs = [];
      for (const f of c) for (const g of H.get(f)) arcs.push([indice.get(f), indice.get(g)]);
      for (let a = 0; a < arcs.length; a++) for (let b = a + 1; b < arcs.length; b++) if ((arcs[a][0] - arcs[b][0]) * (arcs[a][1] - arcs[b][1]) < 0) n++;
      return n;
    };
    const total = () => couches.slice(0, -1).reduce((s, c) => s + croisementsEntre(c), 0);
    noter();
    let meilleur = couches.map(c => c.slice()), score = total();
    for (let it = 0; it < 12 && score > 0; it++) {
      const aller = it % 2 === 0, ordre = aller ? couches.slice(1) : couches.slice(0, -1).reverse();
      for (const c of ordre) {
        const bary = f => { const v = (aller ? B : H).get(f); return v.length ? v.reduce((s, g) => s + indice.get(g), 0) / v.length : indice.get(f); };
        const b = new Map(c.map(f => [f, bary(f)]));
        c.sort((x, y) => b.get(x) - b.get(y) || indice.get(x) - indice.get(y));
        c.forEach((f, i) => indice.set(f, i));
      }
      // Échanges de voisins (transpose)
      for (let ameliore = true, tour = 0; ameliore && tour < 4; tour++) {
        ameliore = false;
        for (let r = 0; r < couches.length; r++) {
          const c = couches[r];
          for (let i = 0; i + 1 < c.length; i++) {
            const avant = (r > 0 ? croisementsEntre(couches[r - 1]) : 0) + croisementsEntre(c);
            [c[i], c[i + 1]] = [c[i + 1], c[i]]; c.forEach((f, k) => indice.set(f, k));
            const apres = (r > 0 ? croisementsEntre(couches[r - 1]) : 0) + croisementsEntre(c);
            if (apres < avant) ameliore = true;
            else { [c[i], c[i + 1]] = [c[i + 1], c[i]]; c.forEach((f, k) => indice.set(f, k)); }
          }
        }
      }
      const t = total();
      if (t < score) { score = t; meilleur = couches.map(c => c.slice()); }
    }
    meilleur.forEach((c, r) => { couches[r] = c; });
    noter();
    // Coordonnées : dans chaque couche, formes dans leur ordre ; chaque forme tirée vers le centre de ses voisines
    // (allers-retours), écart minimal gardé ; couches successives séparées de leur épaisseur
    const long = f => (horizontal ? f.h : f.w), ecart = (a, b) => (fictif.has(a) || fictif.has(b) ? E.forme / 2 : E.forme);
    const centreDe = new Map();
    for (const c of couches) { let q = 0; c.forEach((f, i) => { if (i) q += ecart(c[i - 1], f); centreDe.set(f, q + long(f) / 2); q += long(f); }); }
    const tasser = (c, voulu) => {
      // Ordre gardé, écarts minimaux respectés, au plus près des positions voulues (moyenne d'un passage dans chaque sens)
      const n = c.length, g = new Array(n), d = new Array(n);
      for (let i = 0; i < n; i++) g[i] = i ? Math.max(voulu[i], g[i - 1] + long(c[i - 1]) / 2 + ecart(c[i - 1], c[i]) + long(c[i]) / 2) : voulu[i];
      for (let i = n - 1; i >= 0; i--) d[i] = i < n - 1 ? Math.min(voulu[i], d[i + 1] - long(c[i + 1]) / 2 - ecart(c[i], c[i + 1]) - long(c[i]) / 2) : voulu[i];
      const m = c.map((_, i) => (g[i] + d[i]) / 2);
      for (let i = 1; i < n; i++) m[i] = Math.max(m[i], m[i - 1] + long(c[i - 1]) / 2 + ecart(c[i - 1], c[i]) + long(c[i]) / 2);
      c.forEach((f, i) => centreDe.set(f, m[i]));
    };
    for (let it = 0; it < 8; it++) {
      const aller = it % 2 === 0, ordre = aller ? couches.slice(1) : couches.slice(0, -1).reverse();
      for (const c of ordre) {
        const voulu = c.map(f => { const v = [...B.get(f), ...H.get(f)]; return v.length ? v.reduce((s, g) => s + centreDe.get(g), 0) / v.length : centreDe.get(f); });
        tasser(c, voulu);
      }
    }
    const mini = Math.min(...tous.map(f => centreDe.get(f) - long(f) / 2));
    const epais = c => Math.max(...c.map(f => (horizontal ? f.w : f.h)));
    let p = 0, L = 0;
    for (const c of couches) {
      const e = epais(c);
      for (const f of c) {
        const a = p + (e - (horizontal ? f.w : f.h)) / 2, q = centreDe.get(f) - long(f) / 2 - mini;
        L = Math.max(L, q + long(f));
        if (!fictif.has(f)) pos.set(f, horizontal ? [x0 + a, y0 + q] : [x0 + q, y0 + a]);
      }
      p += e + E.couche;
    }
    // Sens inverse (vers la gauche, vers le haut) : couches en miroir dans leur étendue
    if (sens === 'gauche' || sens === 'haut') {
      const fin = Math.max(...lies.map(f => (horizontal ? pos.get(f)[0] + f.w : pos.get(f)[1] + f.h)));
      for (const f of lies) { const [x, y] = pos.get(f); pos.set(f, horizontal ? [x0 + fin - x - f.w, y] : [x, y0 + fin - y - f.h]); }
    }
    // Formes sans lien : en grille, sous le graphe (couches horizontales) ou à sa droite (couches verticales)
    if (seuls.length) {
      const fs = seuls.slice().sort(lecture);
      if (!lies.length) grille(fs, x0, y0);
      else if (horizontal) grille(fs, x0, y0 + L + E.couche / 2);
      else grille(fs, x0 + L + E.couche / 2, y0);
    }
  }
  const deplacements = new Map();
  for (const f of formes) { const [x, y] = pos.get(f); const d = [Math.round(x - f.x), Math.round(y - f.y)]; if (d[0] || d[1]) deplacements.set(f, d); }
  // Ports reliés (couches, arbre) : sur le côté tourné vers l'autre extrémité (couche suivante, précédente, ou même couche),
  // répartis le long du bord dans l'ordre des extrémités opposées
  if (genre !== 'grille') {
    const sens = genre === 'arbre' || genre === 'etoile' ? 'bas' : opt.sens || 'droite', horizontal = sens === 'droite' || sens === 'gauche';
    const oppose = { droite: 'gauche', gauche: 'droite', bas: 'haut', haut: 'bas' };
    const centre = f => { const [x, y] = pos.get(f); return [x + T(f)[0] / 2, y + T(f)[1] / 2]; };
    for (const f of formes) {
      const cotes = { gauche: [], droite: [], haut: [], bas: [] };
      for (const q of scene.formes) {
        if (q.parent !== f || q.genre !== 'port') continue;
        const l = scene.liens.find(x => !x.attacheNote && (x.source === q || x.cible === q));
        const autre = l && racine(l.source === q ? l.cible : l.source);
        if (!autre || autre === f) continue;
        const na = niveau.get(autre), nf = niveau.get(f), [ax, ay] = centre(autre), [fx, fy] = centre(f);
        const cote = na != null && nf != null && na !== nf
          ? (na > nf ? sens : oppose[sens])
          : (horizontal ? (ay > fy ? 'bas' : 'haut') : (ax > fx ? 'droite' : 'gauche'));
        cotes[cote].push({ q, a: cote === 'gauche' || cote === 'droite' ? ay : ax });
      }
      const [x, y] = pos.get(f), [fw, fh] = T(f), boite = { x, y, w: fw, h: fh };
      for (const [cote, qs] of Object.entries(cotes)) {
        qs.sort((a, b) => a.a - b.a);
        qs.forEach(({ q }, i) => {
          const t = (i + 1) / (qs.length + 1);
          const cx = cote === 'gauche' ? x : cote === 'droite' ? x + fw : x + fw * t, cy = cote === 'haut' ? y : cote === 'bas' ? y + fh : y + fh * t;
          const [px, py] = diaPlacerPort(q, cx, cy, boite), d = deplacements.get(f) || [0, 0];
          // diaMiseEnPage décale déjà avec le bord les ports droit et bas d'une forme agrandie
          const ca = diaCotePort(q), auto = [ca === 'droite' ? fw - f.w : 0, ca === 'bas' ? fh - f.h : 0];
          const dq = [Math.round(px - (q.x + d[0]) - auto[0]), Math.round(py - (q.y + d[1]) - auto[1])];
          if (dq[0] || dq[1]) deplacements.set(q, dq);
        });
      }
    }
  }
  // Conteneur trop petit : il grandit (jamais ne rétrécit)
  const tailles = new Map(neuves);
  if (parent && !parent.calculee) {
    const d = f => deplacements.get(f) || [0, 0];
    const r = Math.max(...formes.map(f => f.x + d(f)[0] + T(f)[0])) + E.marge, b = Math.max(...formes.map(f => f.y + d(f)[1] + T(f)[1])) + E.marge;
    let enfant = parent, droite = r, bas = b;
    // Le conteneur, puis chacun de ses conteneurs (E1 : un élément ne dépasse jamais le sien), grandissent au besoin
    while (enfant && !enfant.calculee) {
      const w = Math.max(enfant.w, Math.round(droite - enfant.x)), h = Math.max(enfant.h, Math.round(bas - enfant.y));
      if (w === enfant.w && h === enfant.h) break;
      tailles.set(enfant, [w, h]);
      droite = enfant.x + w + E.marge; bas = enfant.y + h + E.marge; enfant = enfant.parent;
    }
  }
  // Liens touchés retracés sur une copie de la scène aux positions nouvelles
  const r = opt.trace === null ? { traces: new Map(), ancres: new Map() }
    : diaRetracer(aird, scene, deplacements, tailles, opt.trace, l => !!(racine(l.source) || racine(l.cible)));
  // Étoile : liens du pivot à ses voisins en bus, comme à la main — un tronc commun par côté (du bas du pivot à mi-chemin de
  // la rangée du dessous, puis vers chaque voisin), sans passer sur les noms écrits dehors
  if (bus && opt.trace === 'orthogonal') {
    const { pivot, D } = bus, B = f => { const [x, y] = pos.get(f), [w, h] = T(f); return { x, y, w, h }; }, P = B(pivot);
    const pcx = Math.round(P.x + P.w / 2), pcy = Math.round(P.y + P.h / 2);
    const milieu = (a, b) => Math.round((a + b) / 2);
    const cote = new Map([...bus.bas.map(f => [f, 'bas']), ...bus.dessus.map(f => [f, 'dessus']), ...bus.gauche.map(f => [f, 'gauche']), ...bus.droite.map(f => [f, 'droite'])]);
    // (les bus des rangées passent entre la rangée et le haut ou le bas des colonnes : ils ne coupent pas leurs troncs)
    const cols = [...bus.gauche, ...bus.droite], haut0 = Math.min(P.y - D.get(pivot).haut, ...cols.map(f => B(f).y - D.get(f).haut));
    const bas0 = Math.max(P.y + P.h + D.get(pivot).bas, ...cols.map(f => B(f).y + B(f).h + D.get(f).bas));
    const yb = bus.bas.length ? milieu(bas0, Math.min(...bus.bas.map(f => B(f).y - D.get(f).haut))) : 0;
    const yh = bus.dessus.length ? milieu(haut0, Math.max(...bus.dessus.map(f => B(f).y + B(f).h + D.get(f).bas))) : 0;
    const xg = bus.gauche.length ? milieu(P.x - D.get(pivot).gauche, Math.max(...bus.gauche.map(f => B(f).x + B(f).w + D.get(f).droite))) : 0;
    const xd = bus.droite.length ? milieu(P.x + P.w + D.get(pivot).droite, Math.min(...bus.droite.map(f => B(f).x - D.get(f).gauche))) : 0;
    for (const l of scene.liens) {
      if (l.attacheNote || l.source === l.cible) continue;
      const voisin = l.source === pivot ? l.cible : l.cible === pivot ? l.source : null;
      if (!voisin || !cote.has(voisin)) continue;           // lien d'un port, ou sans le pivot : tracé par diaRetracer
      const V = B(voisin), vcx = Math.round(V.x + V.w / 2), vcy = Math.round(V.y + V.h / 2), c = cote.get(voisin);
      let pts = c === 'bas' ? [[pcx, P.y + P.h], [pcx, yb], [vcx, yb], [vcx, V.y]]
        : c === 'dessus' ? [[pcx, P.y], [pcx, yh], [vcx, yh], [vcx, V.y + V.h]]
          : c === 'gauche' ? [[P.x, pcy], [xg, pcy], [xg, vcy], [V.x + V.w, vcy]]
            : [[P.x + P.w, pcy], [xd, pcy], [xd, vcy], [V.x, vcy]];
      pts = pts.map(q => q.map(Math.round)).filter((q, k, t) => k === 0 || q[0] !== t[k - 1][0] || q[1] !== t[k - 1][1]);
      pts = pts.filter((q, k, t) => k === 0 || k === t.length - 1 || !((t[k - 1][0] === q[0] && q[0] === t[k + 1][0]) || (t[k - 1][1] === q[1] && q[1] === t[k + 1][1])));
      if (l.source !== pivot) pts.reverse();
      r.traces.set(l, pts);
      // Ancres GMF réécrites là où le lien en a (IdentityAnchor), comme diaRetracer
      const e = aird.parVue.get(l.vue), an = {}, frac = (q, b) => [Math.round((q[0] - b.x) / b.w * 10000) / 10000, Math.round((q[1] - b.y) / b.h * 10000) / 10000];
      if (e && diaEnfant(e, 'sourceAnchor')) an.source = frac(pts[0], l.source === pivot ? P : V);
      if (e && diaEnfant(e, 'targetAnchor')) an.cible = frac(pts[pts.length - 1], l.cible === pivot ? P : V);
      if (an.source || an.cible) r.ancres.set(l, an); else r.ancres.delete(l);
    }
  }
  return { deplacements, tailles, traces: r.traces, ancres: r.ancres };
}

/**
 * Liens retracés après des déplacements et des redimensionnements, sur une copie de la scène aux positions nouvelles :
 * en angles droits (diaRouteOrthogonale, ancres GMF réécrites là où le lien en a, segments parallèles écartés :
 * diaEcarterTraces) ou en ligne droite. Un lien dont les deux
 * extrémités bougent ensemble n'est pas retracé (ses points suivent).
 * @param {object} aird résultat de diaLire
 * @param {object} scene scène du diagramme
 * @param {Map<object,number[]>} deplacements forme → [dx, dy] (le sien, sans celui de ses conteneurs)
 * @param {Map<object,number[]>} tailles forme → [largeur, hauteur]
 * @param {'orthogonal'|'direct'} mode tracé
 * @param {function(object):boolean} garde liens à considérer
 * @returns {{traces:Map<object,number[][]>, ancres:Map}}
 */
function diaRetracer(aird, scene, deplacements, tailles, mode, garde) {
  const traces = new Map(), ancres = new Map();
  const decal = f => { let x = 0, y = 0; for (let p = f; p; p = p.parent) { const v = deplacements.get(p); if (v) { x += v[0]; y += v[1]; } } return [x, y]; };
  const copies = new Map();
  const copie = f => {
    if (!f) return null;
    if (!copies.has(f)) {
      const [dx, dy] = decal(f), t = tailles.get(f), c = { ...f, x: f.x + dx, y: f.y + dy };
      if (t) { c.w = t[0]; c.h = t[1]; }
      copies.set(f, c); c.parent = copie(f.parent);
    }
    return copies.get(f);
  };
  const virtuelle = { ...scene, formes: scene.formes.map(copie) }, deja = [];
  // Les liens les plus courts d'abord (les longs contournent), comme diaTracesOrthogonales
  const longueur = l => Math.abs(l.source.x - l.cible.x) + Math.abs(l.source.y - l.cible.y);
  const aRetracer = [];
  for (const l of scene.liens.slice().sort((a, b) => longueur(a) - longueur(b))) {
    if (l.attacheNote || !garde(l)) continue;
    const ds = decal(l.source), dc = decal(l.cible);
    if (ds[0] === dc[0] && ds[1] === dc[1] && !tailles.has(l.source) && !tailles.has(l.cible)) continue;   // déplacé d'un bloc
    aRetracer.push([l, { ...l, source: copie(l.source), cible: copie(l.cible) }]);
  }
  // Liens retracés d'un même côté répartis le long de celui-ci (diaRepartirBouts)
  const imposes = mode === 'direct' ? new Map() : diaRepartirBouts(aRetracer.map(([, v]) => v));
  for (const [l, v] of aRetracer) {
    if (mode === 'direct') {
      const cs = [v.source.x + v.source.w / 2, v.source.y + v.source.h / 2], cc = [v.cible.x + v.cible.w / 2, v.cible.y + v.cible.h / 2];
      traces.set(l, [diaBordVers(v.source, cc), diaBordVers(v.cible, cs)].map(p => p.map(Math.round)));
    } else {
      const r = diaRouteOrthogonale(virtuelle, v, deja, imposes.get(v));      // routage séquentiel : évite les liens déjà retracés
      for (let i = 1; i < r.points.length; i++) deja.push([r.points[i - 1], r.points[i], v]);
      traces.set(l, r.points);
      // Ancres réécrites seulement là où le lien en a (IdentityAnchor), comme eddRetracer
      const e = aird.parVue.get(l.vue), an = {};
      if (r.ancres.source && e && diaEnfant(e, 'sourceAnchor')) an.source = r.ancres.source;
      if (r.ancres.cible && e && diaEnfant(e, 'targetAnchor')) an.cible = r.ancres.cible;
      if (an.source || an.cible) ancres.set(l, an);
    }
  }
  return { traces: mode === 'direct' ? traces : diaEcarterTraces(virtuelle, traces), ancres };
}

/**
 * Répartit sur un côté de forme les extrémités des liens tracés ensemble qui en partent (ports exceptés : un port est un
 * point). Sans cela, tous partiraient du même point (milieu du côté ou de la partie commune) et se croiseraient en sortant.
 * Ordre le long du côté : celui de la direction de l'autre extrémité (angle vu du côté, comme l'ordre des ports d'ELK), à
 * égalité celui des liens donnés (deux liens entre les deux mêmes formes restent parallèles) ; places au plus près des
 * points voulus, écartées d'au moins 16 px (moins sur un petit côté), dans le côté.
 * @param {object[]} liens liens à tracer (source et cible : formes de la scène, éventuellement déplacées)
 * @returns {Map<object,{source?:object, cible?:object}>} lien → extrémités imposées ({p, n, port} : diaRouteOrthogonale)
 */
function diaRepartirBouts(liens) {
  const groupes = new Map(), res = new Map();
  liens.forEach((l, rang) => {
    if (!l.source || !l.cible || l.source === l.cible) return;
    for (const [bout, f, autre] of [['source', l.source, l.cible], ['cible', l.cible, l.source]]) {
      if (f.genre === 'port' || !(f.w > 0 && f.h > 0)) continue;
      const b = diaBoutOrthogonal(f, autre), cle = f;
      if (!groupes.has(cle)) groupes.set(cle, new Map());
      const parCote = groupes.get(cle), cote = b.n.join(',');
      if (!parCote.has(cote)) parCote.set(cote, []);
      parCote.get(cote).push({ l, bout, b, autre, rang });
    }
  });
  for (const [f, parCote] of groupes) for (const liste of parCote.values()) {
    if (liste.length < 2) continue;
    const n = liste[0].b.n, k = n[0] ? 1 : 0;                       // axe du côté : y pour un côté gauche ou droit
    const debut = k ? f.y : f.x, long = k ? f.h : f.w, m = liste.length;
    // Direction de l'autre extrémité vue du côté : composante le long du côté, composante vers l'extérieur
    for (const e of liste) {
      const o = [e.autre.x + e.autre.w / 2, e.autre.y + e.autre.h / 2], d = [o[0] - e.b.p[0], o[1] - e.b.p[1]];
      e.angle = Math.atan2(d[k], d[0] * n[0] + d[1] * n[1]);
    }
    liste.sort((a, b) => a.angle - b.angle || a.rang - b.rang);
    // Places croissantes écartées d'au moins G, au plus près des points voulus (régression isotone des points décalés)
    const G = Math.min(16, long / (m + 1)), lo = debut + G, hi = debut + long - G;
    const blocs = [];
    liste.forEach((e, i) => {
      blocs.push({ somme: e.b.p[k] - i * G, n: 1 });
      while (blocs.length > 1 && blocs[blocs.length - 2].somme / blocs[blocs.length - 2].n > blocs[blocs.length - 1].somme / blocs[blocs.length - 1].n) {
        const b = blocs.pop(); blocs[blocs.length - 1].somme += b.somme; blocs[blocs.length - 1].n += b.n;
      }
    });
    const places = [];
    for (const b of blocs) for (let j = 0; j < b.n; j++) places.push(b.somme / b.n + places.length * G);
    const dec = Math.max(0, lo - places[0]) - Math.max(0, places[m - 1] + Math.max(0, lo - places[0]) - hi);
    liste.forEach((e, i) => {
      const p = e.b.p.slice();
      p[k] = Math.round(Math.min(Math.max(places[i] + dec, debut), debut + long));
      if (!res.has(e.l)) res.set(e.l, {});
      res.get(e.l)[e.bout] = { p, n, port: false };
    });
  }
  return res;
}

/**
 * Tracés en angles droits d'un ensemble de liens (diaRouteOrthogonale, routage séquentiel : chaque lien évite de longer
 * ou de croiser les tracés déjà posés, ceux des autres liens compris ; extrémités d'un même côté réparties, diaRepartirBouts), puis, au besoin, écartés les uns des autres
 * (diaEcarterTraces) ; ancres GMF réécrites là où le lien en a (IdentityAnchor).
 * @param {object} aird résultat de diaLire
 * @param {object} scene scène du diagramme
 * @param {object[]} liens liens à retracer
 * @param {boolean} [ecarter] écarter les segments parallèles (vrai par défaut)
 * @returns {{traces:Map<object,number[][]>, ancres:Map}}
 */
function diaTracesOrthogonales(aird, scene, liens, ecarter) {
  const traces = new Map(), ancres = new Map(), vises = new Set(liens);
  // Routage séquentiel : les autres liens (qui ne bougent pas) puis chaque lien tracé comptent comme déjà posés ; les plus
  // courts d'abord (les longs contournent)
  const deja = [];
  const poser = (pts, l) => { for (let i = 1; i < pts.length; i++) deja.push([pts[i - 1], pts[i], l]); };
  for (const l of scene.liens) if (!vises.has(l) && !l.attacheNote) poser(l.points, l);
  const longueur = l => Math.abs(l.source.x - l.cible.x) + Math.abs(l.source.y - l.cible.y);
  const imposes = diaRepartirBouts(liens.filter(l => !l.attacheNote));     // liens d'un même côté répartis le long de celui-ci
  for (const l of liens.slice().sort((a, b) => longueur(a) - longueur(b))) {
    if (l.attacheNote) continue;
    const r = diaRouteOrthogonale(scene, l, deja, imposes.get(l));
    poser(r.points, l);
    traces.set(l, r.points);
    const e = aird.parVue.get(l.vue), an = {};
    if (r.ancres.source && e && diaEnfant(e, 'sourceAnchor')) an.source = r.ancres.source;
    if (r.ancres.cible && e && diaEnfant(e, 'targetAnchor')) an.cible = r.ancres.cible;
    if (an.source || an.cible) ancres.set(l, an);
  }
  const fixes = [];
  for (const l of scene.liens) if (!vises.has(l) && !l.attacheNote) for (let i = 1; i < l.points.length; i++) fixes.push([l.points[i - 1], l.points[i]]);
  return { traces: ecarter === false ? traces : diaEcarterTraces(scene, traces, { fixes }), ancres };
}

/**
 * Toutes les permutations d'une liste (petite).
 * @param {Array} l liste
 * @returns {Array<Array>}
 */
function diaPermutations(l) {
  if (l.length <= 1) return [l.slice()];
  const res = [];
  l.forEach((x, i) => { for (const p of diaPermutations([...l.slice(0, i), ...l.slice(i + 1)])) res.push([x, ...p]); });
  return res;
}

/**
 * Deux segments se coupent-ils strictement (hors extrémités communes et segments alignés) ?
 * @param {number[]} a @param {number[]} b premier segment @param {number[]} c @param {number[]} d second segment
 * @returns {boolean}
 */
function diaSegmentsSeCoupent(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/**
 * Écartement des liens parallèles (« nudging », comme libavoid) : dans un ensemble de tracés d'équerre, les segments
 * intérieurs (ni le premier, ni le dernier : leurs extrémités tiennent aux formes et aux ports) qui se superposent sur une même
 * droite sont écartés de part et d'autre de celle-ci, d'un pas fixe, dans l'ordre qui évite de les croiser (un lien qui vient
 * d'en haut ou y repart passe en haut). Un segment déplacé entraîne ses deux voisins, qui restent d'équerre ; un écart qui
 * ferait entrer un segment dans une forme étrangère au lien, ou retournerait un voisin, est réduit de moitié, puis abandonné.
 * Seuls les tracés donnés changent : les autres liens ne bougent jamais.
 * Parmi les ordres et les places possibles, celui qui croise le moins les autres liens (tous, fixes compris) est retenu, et
 * seulement s'il ne croise pas plus qu'avant : écarter ne crée jamais de croisement.
 * @param {object} scene scène (positions des formes, nouvelles si une copie de la scène est donnée)
 * @param {Map<object,number[][]>} traces lien → points absolus (d'équerre)
 * @param {{ecart?:number, fixes?:Array<number[][]>}} [opt] pas d'écartement (8 par défaut) ; segments des liens qui ne
 *   bougent pas
 * @returns {Map<object,number[][]>} nouveaux tracés (copies)
 */
function diaEcarterTraces(scene, traces, opt) {
  const PAS = (opt && opt.ecart) || 8, fixes = (opt && opt.fixes) || [];
  const res = new Map([...traces].map(([l, pts]) => [l, pts.map(q => q.slice())]));
  const formes = scene.formes.filter(f => f.genre !== 'port' && f.genre !== 'ligne' && f.genre !== 'note' && f.w > 0 && f.h > 0);
  const exclus = new Map();
  for (const l of res.keys()) { const e = new Set(); for (const b of [l.source, l.cible]) for (let q = b; q; q = q.parent) e.add(q); exclus.set(l, e); }
  /** Un segment d'équerre entre-t-il dans une forme (intérieur rétréci d'un pixel) ? */
  const heurte = (a, b, l) => formes.some(f => !exclus.get(l).has(f) && Math.max(a[0], b[0]) > f.x + 1 && Math.min(a[0], b[0]) < f.x + f.w - 1
    && Math.max(a[1], b[1]) > f.y + 1 && Math.min(a[1], b[1]) < f.y + f.h - 1);
  /**
   * Croisements de segments déplacés (par lien : trois segments) avec ceux des autres liens : les autres tracés (dans leur
   * état courant, ceux du groupe pris dans leur nouvel état) et les liens fixes.
   */
  let proches = [];                                  // segments des autres liens près du groupe en cours : [lien, a, b]
  const croisements = nouveaux => {
    const remplaces = new Set(nouveaux.map(x => x.l));
    let c = 0;
    for (let x = 0; x < nouveaux.length; x++) {
      for (let y = x + 1; y < nouveaux.length; y++) for (const s1 of nouveaux[x].segs) for (const s2 of nouveaux[y].segs) if (diaSegmentsSeCoupent(s1[0], s1[1], s2[0], s2[1])) c++;
      for (const s1 of nouveaux[x].segs) for (const [l2, a, b] of proches) if (!remplaces.has(l2) && diaSegmentsSeCoupent(s1[0], s1[1], a, b)) c++;
    }
    return c;
  };
  /** Segments des autres tracés et des liens fixes qui touchent un rectangle. */
  const dans = (x0, y0, x1, y1) => {
    const r = [], touche = (a, b) => Math.max(a[0], b[0]) >= x0 && Math.min(a[0], b[0]) <= x1 && Math.max(a[1], b[1]) >= y0 && Math.min(a[1], b[1]) <= y1;
    for (const [l2, p2] of res) for (let i = 1; i < p2.length; i++) if (touche(p2[i - 1], p2[i])) r.push([l2, p2[i - 1], p2[i]]);
    for (const [a, b] of fixes) if (touche(a, b)) r.push([null, a, b]);
    return r;
  };
  // Fourches : des liens qui partent d'un même point (port partagé) dans la même direction gardent une amorce commune
  // (AMORCE), puis un décrochement de longueur nulle (deux points confondus) : la suite du premier segment devient intérieure
  // et peut être écartée comme les autres ; les décrochements inutilisés sont retirés à la fin
  const AMORCE = 12, bouts = new Map();
  for (const [l, p] of res) {
    if (p.length < 3) continue;
    for (const fin of [false, true]) {
      const a = fin ? p[p.length - 1] : p[0], b = fin ? p[p.length - 2] : p[1], d = [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
      if (Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) < AMORCE + PAS || (d[0] && d[1])) continue;
      const cle = a.join(',') + '|' + d.join(',');
      if (!bouts.has(cle)) bouts.set(cle, []);
      bouts.get(cle).push({ p, fin, a, d });
    }
  }
  for (const liste of bouts.values()) {
    if (liste.length < 2) continue;
    for (const { p, fin, a, d } of liste) {
      const q = [a[0] + d[0] * AMORCE, a[1] + d[1] * AMORCE];
      if (fin) p.splice(p.length - 1, 0, q, q.slice()); else p.splice(1, 0, q, q.slice());
    }
  }
  /** Point d'un décrochement (confondu avec son voisin) : le segment voisin y devient perpendiculaire. */
  const decroche = (p, i, j) => p[i][0] === p[j][0] && p[i][1] === p[j][1];
  for (let passe = 0; passe < 2; passe++) {
    for (const k of [1, 0]) {                        // k = 1 : segments horizontaux (y commun) ; k = 0 : verticaux (x commun)
      const autre = 1 - k, segs = [];
      for (const [l, p] of res) for (let i = 1; i + 2 < p.length; i++) {
        const a = p[i], b = p[i + 1];
        if (a[k] !== b[k] || a[autre] === b[autre]) continue;
        segs.push({ l, p, i, c: a[k], d: Math.min(a[autre], b[autre]), f: Math.max(a[autre], b[autre]) });
      }
      // Groupes : même droite, étendues qui se recouvrent (de proche en proche)
      segs.sort((x, y) => x.c - y.c || x.d - y.d);
      const groupes = [];
      for (const sg of segs) {
        const g = groupes[groupes.length - 1];
        if (g && g.c === sg.c && sg.d < g.fin - 1 && g.liens.has(sg.l) === false) { g.segs.push(sg); g.fin = Math.max(g.fin, sg.f); g.liens.add(sg.l); }
        else groupes.push({ c: sg.c, fin: sg.f, segs: [sg], liens: new Set([sg.l]) });
      }
      for (const g of groupes) {
        if (g.segs.length < 2) continue;
        const n = g.segs.length;
        // Ordres essayés : toutes les permutations (au plus 4 segments), sinon celui des extrémités voisines
        const cle = sg => (sg.p[sg.i - 1][k] + sg.p[sg.i + 2][k]) / 2 - g.c;
        const base = g.segs.slice().sort((x, y) => cle(x) - cle(y) || x.d - y.d);
        const ordres = n <= 4 ? diaPermutations(base) : [base];
        // Segments proches : rectangle des segments du groupe et de leurs voisins, élargi des écarts possibles
        const pts = g.segs.flatMap(sg => [sg.p[sg.i - 1], sg.p[sg.i], sg.p[sg.i + 1], sg.p[sg.i + 2]]), marge = n * PAS;
        proches = dans(Math.min(...pts.map(q => q[0])) - marge, Math.min(...pts.map(q => q[1])) - marge, Math.max(...pts.map(q => q[0])) + marge, Math.max(...pts.map(q => q[1])) + marge);
        // Places essayées : de part et d'autre de la droite, puis d'un seul côté (couloir le long d'une forme), au pas puis au demi-pas
        const places = [];
        for (const pas of [PAS, PAS / 2]) for (const depart of [-(n - 1) / 2, 0, -(n - 1)]) places.push(j => Math.round(g.c + (depart + j) * pas));
        let meilleur = null;
        for (const place of places) {
          for (const ordre of ordres) {
            const nouveaux = [];
            const possible = ordre.every((sg, j) => {
              const v = place(j), av = sg.p[sg.i - 1], ap = sg.p[sg.i + 2];
              // Les voisins ne se retournent pas (sauf un décrochement de fourche), et rien n'entre dans une forme étrangère au lien
              if ((!decroche(sg.p, sg.i - 1, sg.i) && Math.sign(av[k] - v) !== Math.sign(av[k] - g.c))
                || (!decroche(sg.p, sg.i + 1, sg.i + 2) && Math.sign(ap[k] - v) !== Math.sign(ap[k] - g.c))) return false;
              const a = sg.p[sg.i].slice(), b = sg.p[sg.i + 1].slice();
              a[k] = v; b[k] = v;
              if (heurte(a, b, sg.l) || heurte(av, a, sg.l) || heurte(b, ap, sg.l)) return false;
              nouveaux.push({ l: sg.l, segs: [[av, a], [a, b], [b, ap]] });
              return true;
            });
            if (!possible) continue;
            const c = croisements(nouveaux);
            if (!meilleur || c < meilleur.c) meilleur = { c, ordre, place };
            if (c === 0) break;
          }
          if (meilleur && meilleur.c === 0) break;  // première place sans croisement (la plus centrée, au plus grand pas)
        }
        const avant = croisements(g.segs.map(sg => ({ l: sg.l, segs: [[sg.p[sg.i - 1], sg.p[sg.i]], [sg.p[sg.i], sg.p[sg.i + 1]], [sg.p[sg.i + 1], sg.p[sg.i + 2]]] })));
        if (meilleur && meilleur.c <= avant) meilleur.ordre.forEach((sg, j) => { const v = meilleur.place(j); sg.p[sg.i][k] = v; sg.p[sg.i + 1][k] = v; });
      }
    }
  }
  // Points confondus et points alignés retirés (décrochements inutilisés)
  for (const [l, p] of res) {
    const t = p.filter((q, k, u) => k === 0 || q[0] !== u[k - 1][0] || q[1] !== u[k - 1][1]);
    res.set(l, t.filter((q, k, u) => k === 0 || k === u.length - 1 || !((u[k - 1][0] === q[0] && q[0] === u[k + 1][0]) || (u[k - 1][1] === q[1] && q[1] === u[k + 1][1]))));
  }
  return res;
}

/* ─────────────────────────────── Placement des étiquettes (E5) ─────────────────────────────── */

/**
 * Boîte de l'étiquette centrale d'un lien dessinée en un point, comme vdLien : texte replié à la largeur enregistrée par GMF
 * (220 sinon), quatre lignes au plus, icône comprise, bloc centré sur le point (première ligne remontée).
 * @param {object} l lien de la scène (texte, police, icone, largeurEtiquette)
 * @param {number[]} point position de l'étiquette (diaEtiquette)
 * @returns {{x:number, y:number, w:number, h:number}|null} null sans texte
 */
function diaBoiteEtiquette(l, point) {
  if (!l.texte) return null;
  const t = Math.max(10, (l.police && l.police.taille) || 10), icone = l.icone ? Math.round(t * 1.2) + 3 : 0;
  const largeur = l.largeurEtiquette ? Math.max(30, l.largeurEtiquette - icone) : 220;
  const n = Math.min(4, diaNbLignes(l.texte, largeur, t)), w = Math.min(diaLargeurTexte(l.texte, t), largeur) + icone, h = n * t * 1.25;
  const haut = point[1] - (n - 1) * t * 0.625 - t * 0.85;
  return { x: point[0] - w / 2, y: haut, w, h };
}

/** Étiquette centrale d'un lien à placer : texte, nœud GMF de l'étiquette présent, ni réflexive, ni durée de séquence, ni attache de note. */
function diaAEtiquette(l) { return !!l.texte && l.etiquetteGmf !== false && !l.reflexif && !l.duree && !l.attacheNote; }

/**
 * Place les étiquettes centrales de liens (E5) : pour chacune, positions essayées le long de son tracé (milieu de chaque
 * segment, et jusqu'à sept places sur un long segment ; au-dessus ou au-dessous d'un segment horizontal, à gauche ou à droite d'un segment
 * vertical, à 3 px du trait, ou sur le trait, masqué par le halo du texte ; une rangée plus loin) ; retenue : celle qui recouvre le moins les formes (d'un conteneur qui la loge, seule sa barre
 * de titre compte),
 * les autres étiquettes (déjà placées, ou de liens qui ne changent pas) et le moins de traits de liens, au plus près du
 * milieu du lien (au-dessus de préférence, comme Sirius). Les liens les plus courts d'abord (moins de places possibles). Une
 * étiquette dont le lien garde son tracé garde aussi sa place si elle n'est pas pire. Seules les étiquettes données changent.
 * @param {object} scene scène (positions des formes : nouvelles si une copie de la scène est donnée)
 * @param {Map<object,number[][]>} traces lien → points (absolus) de chaque lien dont l'étiquette est à placer
 * @param {{autres?:Map<object,number[][]>}} [opt] points des autres liens quand ils changent (scène virtuelle)
 * @returns {Map<object,{centre:number[]}>} lien → décalage GMF de l'étiquette centrale (diaMiseEnPage : etiquettes)
 */
function diaPlacerEtiquettes(scene, traces, opt) {
  const res = new Map(), autres = (opt && opt.autres) || new Map(), ECART = 3, TITRE = 24;
  const points = l => traces.get(l) || autres.get(l) || l.points;
  // Index en grille (cases de 128 px) des formes, des traits de liens et des étiquettes posées
  const CASE = 128, grille = new Map();
  const ajouter = (o, x0, y0, x1, y1) => {
    for (let i = Math.floor(x0 / CASE); i <= Math.floor(x1 / CASE); i++) for (let j = Math.floor(y0 / CASE); j <= Math.floor(y1 / CASE); j++) {
      const k = i + ',' + j;
      if (!grille.has(k)) grille.set(k, []);
      grille.get(k).push(o);
    }
  };
  const voisins = b => {
    const vus = new Set();
    for (let i = Math.floor(b.x / CASE); i <= Math.floor((b.x + b.w) / CASE); i++) for (let j = Math.floor(b.y / CASE); j <= Math.floor((b.y + b.h) / CASE); j++)
      for (const o of grille.get(i + ',' + j) || []) vus.add(o);
    return vus;
  };
  for (const f of scene.formes) if (f.w > 0 && f.h > 0 && f.genre !== 'ligne') ajouter({ f }, f.x, f.y, f.x + f.w, f.y + f.h);
  const poser = b => ajouter({ e: b }, b.x, b.y, b.x + b.w, b.y + b.h);
  // Étiquettes fixes (liens dont l'étiquette ne change pas), traits de tous les liens
  for (const l of scene.liens) if (!traces.has(l) && diaAEtiquette(l)) { const b = diaBoiteEtiquette(l, diaEtiquette(points(l), l.decalages.centre, 'centre')); if (b) poser(b); }
  for (const l of scene.liens) {
    const p = points(l);
    for (let i = 1; i < p.length; i++) ajouter({ l, a: p[i - 1], d: p[i] }, Math.min(p[i - 1][0], p[i][0]), Math.min(p[i - 1][1], p[i][1]), Math.max(p[i - 1][0], p[i][0]), Math.max(p[i - 1][1], p[i][1]));
  }
  const recouvre = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const contient = (f, b) => b.x >= f.x && b.y >= f.y && b.x + b.w <= f.x + f.w && b.y + b.h <= f.y + f.h;
  /** Un segment d'équerre (ou oblique : boîte englobante) traverse-t-il l'intérieur de la boîte ? */
  const traverse = (a, c, b) => Math.max(a[0], c[0]) > b.x + 1 && Math.min(a[0], c[0]) < b.x + b.w - 1 && Math.max(a[1], c[1]) > b.y + 1 && Math.min(a[1], c[1]) < b.y + b.h - 1;
  const cout = (l, b) => {
    let c = 0;
    for (const o of voisins(b)) {
      if (o.f) {
        const f = o.f, v = recouvre(f, b);
        if (v <= 0) continue;
        // Un conteneur qui loge l'étiquette : seule sa barre de titre compte (elle compte toujours, son titre y est écrit)
        if (f.genre === 'conteneur') c += 6 * recouvre({ x: f.x, y: f.y, w: f.w, h: TITRE }, b);
        if (!(f.genre === 'conteneur' && contient(f, b))) c += 3 * v;
      } else if (o.e) c += 5 * recouvre(o.e, b);
      else if (traverse(o.a, o.d, b)) c += o.l === l ? 60 : 400;
    }
    return c;
  };
  const longueur = p => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]); return s; };
  const liste = [...traces.keys()].filter(diaAEtiquette).sort((a, b) => longueur(traces.get(a)) - longueur(traces.get(b)));
  for (const l of liste) {
    const p = traces.get(l), total = longueur(p), essai = diaBoiteEtiquette(l, [0, 0]);
    // Décalage du point d'ancrage (diaEtiquette) par rapport au centre de la boîte
    const dy = -(essai.y + essai.h / 2);
    const candidats = [];
    let parcouru = 0;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], d = p[i], lg = Math.abs(d[0] - a[0]) + Math.abs(d[1] - a[1]);
      if (lg >= 8) for (const f of lg >= 120 ? [0.5, 0.35, 0.65, 0.2, 0.8, 0.08, 0.92] : lg >= 60 ? [0.5, 0.25, 0.75] : [0.5]) {
        const m = [a[0] + (d[0] - a[0]) * f, a[1] + (d[1] - a[1]) * f], eloigne = Math.abs(parcouru + lg * f - total / 2);
        const horizontal = Math.abs(d[1] - a[1]) <= Math.abs(d[0] - a[0]);
        // Contre le trait, de part et d'autre ; une rangée plus loin ; sur le trait (le halo du texte le masque)
        const centres = horizontal
          ? [[m[0], m[1] - ECART - essai.h / 2, 0], [m[0], m[1] + ECART + essai.h / 2, 8], [m[0], m[1] - 2 * ECART - 1.5 * essai.h, 30], [m[0], m[1] + 2 * ECART + 1.5 * essai.h, 34], [m[0], m[1], 20]]
          : [[m[0] + ECART + essai.w / 2, m[1], 2], [m[0] - ECART - essai.w / 2, m[1], 4], [m[0], m[1], 12]];
        for (const [cx, cy, cote] of centres) candidats.push({ centre: [cx, cy], penalite: 0.3 * eloigne + cote });
      }
      parcouru += lg;
    }
    // Place actuelle gardée si le tracé ne change pas (et qu'elle n'est pas pire)
    const meme = p.length === l.points.length && p.every((q, k) => q[0] === l.points[k][0] && q[1] === l.points[k][1]);
    if (meme) { const b = diaBoiteEtiquette(l, diaEtiquette(p, l.decalages.centre, 'centre')); candidats.push({ centre: [b.x + b.w / 2, b.y + b.h / 2], penalite: -20 }); }
    if (!candidats.length) continue;
    let meilleur = null;
    for (const k of candidats) {
      const b = { x: k.centre[0] - essai.w / 2, y: k.centre[1] - essai.h / 2, w: essai.w, h: essai.h }, v = cout(l, b) + k.penalite;
      if (!meilleur || v < meilleur.v) meilleur = { v, b, centre: k.centre };
    }
    poser(meilleur.b);
    res.set(l, { centre: diaDecalageEtiquette(p, [meilleur.centre[0], meilleur.centre[1] + dy], 'centre') });
  }
  return res;
}

/**
 * Étiquettes d'une mise en page (diaDisposer, diaResultatElk) : placées (diaPlacerEtiquettes) sur la scène telle qu'elle sera
 * (formes déplacées et redimensionnées, liens retracés ; un lien dont les deux extrémités bougent ensemble est décalé d'autant),
 * pour les seuls liens retracés.
 * @param {object} scene scène du diagramme
 * @param {{deplacements?:Map, tailles?:Map, traces?:Map}} plan mise en page voulue
 * @returns {Map<object,{centre:number[]}>} lien → décalages (diaMiseEnPage : etiquettes)
 */
function diaAvecEtiquettes(scene, plan) {
  const deplacements = plan.deplacements || new Map(), tailles = plan.tailles || new Map(), traces = plan.traces || new Map();
  if (!traces.size) return new Map();
  const decal = f => { let x = 0, y = 0; for (let p = f; p; p = p.parent) { const v = deplacements.get(p); if (v) { x += v[0]; y += v[1]; } } return [x, y]; };
  const copies = new Map();
  const copie = f => {
    if (!f) return null;
    if (!copies.has(f)) {
      const [dx, dy] = decal(f), t = tailles.get(f), c = { ...f, x: f.x + dx, y: f.y + dy };
      if (t) { c.w = t[0]; c.h = t[1]; }
      copies.set(f, c); c.parent = copie(f.parent);
    }
    return copies.get(f);
  };
  const virtuelle = { ...scene, formes: scene.formes.map(copie) }, autres = new Map();
  for (const l of scene.liens) {
    if (traces.has(l)) continue;
    const ds = decal(l.source), dc = decal(l.cible);
    if (ds[0] === dc[0] && ds[1] === dc[1] && (ds[0] || ds[1])) autres.set(l, l.points.map(q => [q[0] + ds[0], q[1] + ds[1]]));
  }
  return diaPlacerEtiquettes(virtuelle, traces, { autres });
}

/* ─────────────────────────────── Mise en page par ELK (E5) ─────────────────────────────── */
/* ELK (Eclipse Layout Kernel, elkjs, embarqué dans la page : src/vendor/elk.bundled.js, EPL-2.0) calcule la mise en page ;
   ces deux fonctions, sans DOM, traduisent la scène en graphe ELK puis le résultat en changements de mise en page
   (diaMiseEnPage). Le calcul lui-même (asynchrone) est lancé par l'appelant. */

/** Sens des couches → direction d'ELK. */
const DIA_ELK_DIRECTIONS = { droite: 'RIGHT', gauche: 'LEFT', bas: 'DOWN', haut: 'UP' };

/**
 * Options d'ELK pour une disposition : algorithme en couches (layered) ou en arbre (mrtree), hiérarchie (contenu des
 * conteneurs disposé avec le reste, liens entre niveaux compris), tracé orthogonal, écarts serrés. Placement des nœuds par
 * simplexe de réseau et compactage des longueurs : banc de mesure, surface −17 % sur 294 diagrammes, −29 % sur les grands
 * PAB / LAB (1,94 → 1,38 fois la main), croisements inchangés, longueur −17 %, mais 17 % de coudes en plus et des
 * étiquettes plus souvent sur une forme (+31 %).
 * @param {'couches'|'arbre'} genre disposition
 * @param {string} sens droite, gauche, bas, haut
 * @returns {Object<string,string>}
 */
function diaOptionsElk(genre, sens) {
  if (genre === 'arbre') return { 'elk.algorithm': 'mrtree', 'elk.direction': 'DOWN', 'elk.spacing.nodeNode': '30', 'elk.mrtree.weighting': 'CONSTRAINT' };
  return {
    'elk.algorithm': 'layered', 'elk.direction': DIA_ELK_DIRECTIONS[sens] || 'RIGHT', 'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.edgeRouting': 'ORTHOGONAL', 'elk.spacing.nodeNode': '20', 'elk.layered.spacing.nodeNodeBetweenLayers': '30',
    'elk.spacing.edgeNode': '10', 'elk.layered.spacing.edgeNodeBetweenLayers': '10', 'elk.spacing.edgeEdge': '6',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '6', 'elk.spacing.portPort': '10', 'elk.spacing.labelNode': '5',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX', 'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
    'elk.layered.thoroughness': '20', 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.layered.mergeEdges': 'false', 'elk.layered.unnecessaryBendpoints': 'false', 'elk.edgeLabels.placement': 'CENTER',
  };
}

/**
 * Graphe ELK de formes sœurs à disposer : chaque forme est un nœud (sa taille ; une feuille, qui ne contient que des ports,
 * reprend sa taille naturelle : celle de son nom, agrandie par ELK pour loger ses ports, jamais plus grande que l'actuelle),
 * ses ports des ports ELK de côté libre ;
 * un conteneur (ni empilé, ni replié, ni liste) emporte son contenu, disposé avec lui (avec la hiérarchie) ; les liens entre
 * éléments du graphe sont des arcs ELK, d'un port au port ou au nœud, avec la taille de leur étiquette centrale (place
 * réservée). Les enfants sont donnés dans leur ordre actuel (ELK le garde autant que possible).
 * @param {object} scene scène du diagramme
 * @param {object[]} formes formes sœurs à disposer
 * @param {'couches'|'arbre'} genre disposition
 * @param {{sens?:string, hierarchie?:boolean, etiquettes?:boolean, compacter?:boolean, options?:Object<string,string>}} [opt] sens des couches ;
 *   hierarchie : disposer aussi le contenu des conteneurs (vrai par défaut pour les couches) ; etiquettes : réserver la place
 *   des étiquettes des liens (faux par défaut : le banc de mesure montre des liens plus longs et plus de croisements) ;
 *   compacter : taille naturelle des feuilles (vrai par défaut : banc de mesure, un tiers de surface en moins pour 2,5 % de
 *   croisements en plus) ; options : options d'ELK ajoutées (banc de mesure)
 * @returns {{graphe:object, formes:Map<string,object>, liens:Map<string,object>, compactes:Set<string>}} graphe (à donner à
 *   elk.layout), correspondances identifiant ELK → forme (nœuds et ports) ou lien, nœuds ramenés à leur taille naturelle
 */
function diaGrapheElk(scene, formes, genre, opt) {
  opt = opt || {};
  const hierarchie = genre === 'couches' && opt.hierarchie !== false, parId = new Map(), ids = new Map(), liens = new Map(), compactes = new Set();
  let n = 0;
  const libre = f => f.genre !== 'port' && f.genre !== 'ligne' && !f.region && f.genre !== 'note';
  const avant = (a, b) => (Math.abs(a.y - b.y) > 10 ? a.y - b.y : a.x - b.x);
  const noeud = f => {
    const id = 'n' + n++, x = { id, width: Math.max(1, f.w), height: Math.max(1, f.h), ports: [], children: [] };
    parId.set(id, f); ids.set(f, id);
    for (const q of scene.formes) if (q.parent === f && q.genre === 'port') { const pid = 'p' + n++; parId.set(pid, q); ids.set(q, pid); x.ports.push({ id: pid, width: q.w, height: q.h }); }
    if (x.ports.length) x.layoutOptions = { 'elk.portConstraints': 'FREE' };
    const contenu = hierarchie && f.genre === 'conteneur' && !f.pile && !f.replie ? scene.formes.filter(g => g.parent === f && libre(g)).sort(avant) : [];
    if (contenu.length) {
      const titre = f.posTexte === 'aucun' ? 0 : f.police.taille + 8;
      x.layoutOptions = { ...(x.layoutOptions || {}), 'elk.padding': `[top=${DIA_COMPARTIMENT.y + titre + 10},left=${DIA_COMPARTIMENT.x + 10},bottom=12,right=12]`,
        'elk.nodeSize.constraints': '[MINIMUM_SIZE]', 'elk.nodeSize.minimum': `(${Math.round(Math.min(f.w, diaLargeurTexte(f.texte, f.police.taille) + 30))}, ${titre + 30})` };
      delete x.width; delete x.height;
      x.children = contenu.map(noeud);
    } else if (opt.compacter !== false && (f.genre === 'conteneur' || f.genre === 'noeud') && !f.replie && !f.pile && !f.region && !f.calculee
      && !scene.formes.some(g => g.parent === f && g.genre !== 'port')) {
      // Feuille (rien d'autre que des ports) : taille naturelle (celle du nom), agrandie par ELK pour loger les ports ; jamais
      // plus grande que l'actuelle
      const t = f.police.taille, lt = diaLargeurTexte(f.texte || '', t), w = Math.min(f.w, Math.max(80, Math.min(200, lt + 40)));
      const h = Math.min(f.h, Math.max(40, diaNbLignes(f.texte || '', Math.max(w - 30, 20), t) * t * 1.3 + 16));
      x.width = Math.round(w); x.height = Math.round(h); compactes.add(id);
      x.layoutOptions = { ...(x.layoutOptions || {}), 'elk.nodeSize.constraints': '[PORTS, MINIMUM_SIZE]', 'elk.nodeSize.minimum': `(${x.width}, ${x.height})` };
    }
    return x;
  };
  const graphe = { id: 'racine', layoutOptions: { ...diaOptionsElk(genre, opt.sens || 'droite'), ...(opt.options || {}) }, children: formes.slice().sort(avant).map(noeud), edges: [] };
  // Extrémité d'un lien : son port (s'il est dans le graphe), sinon la première forme du graphe qui la contient
  const bout = f => { for (let p = f; p; p = p.parent) if (ids.has(p)) return ids.get(p); return null; };
  for (const l of scene.liens) {
    if (l.attacheNote) continue;
    const a = bout(l.source), b = bout(l.cible);
    if (!a || !b || a === b) continue;
    const id = 'e' + n++, e = { id, sources: [a], targets: [b] };
    if (l.texte && genre === 'couches' && opt.etiquettes) e.labels = [{ text: l.texte, width: Math.round(diaLargeurTexte(l.texte, l.police.taille)) + 8, height: Math.round(l.police.taille * 1.4) }];
    liens.set(id, l);
    graphe.edges.push(e);
  }
  return { graphe, formes: parId, liens, compactes };
}

/**
 * Changements de mise en page d'un résultat d'ELK (diaGrapheElk puis elk.layout) : déplacements (le sien, sans celui des
 * conteneurs), tailles des conteneurs disposés et des feuilles ramenées à leur taille naturelle (et du conteneur commun, qui
 * grandit au besoin avec les siens), ports recalés
 * sur leur côté comme Sirius (diaPlacerPort), tracés des liens (points d'ELK ; extrémité sur un port : son centre) et ancres
 * GMF ; les autres liens touchés sont retracés en angles droits. Le coin haut gauche de l'ensemble est gardé.
 * @param {object} aird résultat de diaLire
 * @param {object} scene scène du diagramme
 * @param {object[]} formes formes sœurs disposées
 * @param {object} res graphe disposé par ELK
 * @param {{formes:Map, liens:Map, compactes?:Set}} carte correspondances de diaGrapheElk
 * @returns {{deplacements:Map, tailles:Map, traces:Map, ancres:Map}}
 */
function diaResultatElk(aird, scene, formes, res, carte) {
  const parent = formes[0].parent || null, E = DIA_ECARTS;
  const x0 = Math.max(Math.min(...formes.map(f => f.x)), parent ? parent.x + DIA_COMPARTIMENT.x + E.marge : -Infinity);
  const y0 = Math.max(Math.min(...formes.map(f => f.y)), parent ? parent.y + DIA_COMPARTIMENT.y + parent.police.taille + E.marge : -Infinity);
  const enfants = res.children || [];
  const ox = x0 - Math.min(...enfants.map(c => c.x)), oy = y0 - Math.min(...enfants.map(c => c.y));
  const abs = new Map([['racine', [ox, oy]]]), boites = new Map(), deplacements = new Map(), tailles = new Map(), total = new Map();
  // Nœuds : position absolue, déplacement propre (sans celui des conteneurs), taille des conteneurs disposés
  const visiter = (x, px, py, dParent) => {
    const f = carte.formes.get(x.id), ax = px + x.x, ay = py + x.y;
    abs.set(x.id, [ax, ay]);
    const w = x.width, h = x.height;
    boites.set(f, { x: ax, y: ay, w, h });
    const d = [Math.round(ax - f.x - dParent[0]), Math.round(ay - f.y - dParent[1])];
    if (d[0] || d[1]) deplacements.set(f, d);
    const t = [dParent[0] + d[0], dParent[1] + d[1]];
    total.set(f, t);
    const redim = ((x.children || []).length || (carte.compactes && carte.compactes.has(x.id))) && (Math.round(w) !== Math.round(f.w) || Math.round(h) !== Math.round(f.h));
    if (redim) tailles.set(f, [Math.round(w), Math.round(h)]);
    // Ports : centre d'ELK, recalé sur le côté le plus proche comme Sirius
    for (const p of x.ports || []) {
      const q = carte.formes.get(p.id), cx = ax + p.x + p.width / 2, cy = ay + p.y + p.height / 2;
      const [qx, qy] = diaPlacerPort(q, cx, cy, { x: ax, y: ay, w, h });
      boites.set(q, { x: qx, y: qy, w: q.w, h: q.h });
      // diaMiseEnPage décale déjà avec le bord les ports des côtés droit et bas d'une forme redimensionnée
      const cote = diaCotePort(q), auto = redim ? [cote === 'droite' ? Math.round(w) - f.w : 0, cote === 'bas' ? Math.round(h) - f.h : 0] : [0, 0];
      const dq = [Math.round(qx - q.x - t[0] - auto[0]), Math.round(qy - q.y - t[1] - auto[1])];
      if (dq[0] || dq[1]) deplacements.set(q, dq);
    }
    for (const c of x.children || []) visiter(c, ax, ay, t);
  };
  for (const c of enfants) visiter(c, ox, oy, [0, 0]);
  // Conteneur commun trop petit : il grandit avec les siens
  if (parent && !parent.calculee) {
    let enfant = parent, droite = Math.max(...formes.map(f => boites.get(f).x + boites.get(f).w)) + E.marge, bas = Math.max(...formes.map(f => boites.get(f).y + boites.get(f).h)) + E.marge;
    while (enfant && !enfant.calculee) {
      const w = Math.max(enfant.w, Math.round(droite - enfant.x)), h = Math.max(enfant.h, Math.round(bas - enfant.y));
      if (w === enfant.w && h === enfant.h) break;
      tailles.set(enfant, [w, h]);
      droite = enfant.x + w + E.marge; bas = enfant.y + h + E.marge; enfant = enfant.parent;
    }
  }
  // Liens d'ELK : points de sa première section, rapportés au conteneur du lien
  const traces = new Map(), ancres = new Map(), centre = b => [b.x + b.w / 2, b.y + b.h / 2];
  const elkAbs = new Map([['racine', [ox, oy]]]);
  const absElk = (x, px, py) => { const a = [px + x.x, py + x.y]; elkAbs.set(x.id, a); for (const c of x.children || []) absElk(c, a[0], a[1]); };
  for (const c of enfants) absElk(c, ox, oy);
  const tousLesArcs = [];
  const collecter = x => { for (const e of x.edges || []) tousLesArcs.push(e); for (const c of x.children || []) collecter(c); };
  collecter(res);
  for (const e of tousLesArcs) {
    const l = carte.liens.get(e.id), sec = e.sections && e.sections[0];
    if (!l || !sec) continue;
    const [cx, cy] = elkAbs.get(e.container || 'racine') || [ox, oy];
    const pts = [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint].map(p => [Math.round(p.x + cx), Math.round(p.y + cy)]);
    // Extrémité sur un port : son centre (le port d'ELK est hors du bord, celui de Sirius dessus) ; puis segments remis
    // d'équerre (un coude ajouté si besoin)
    for (const [k, f] of [[0, l.source], [pts.length - 1, l.cible]]) { const b = boites.get(f); if (f.genre === 'port' && b) pts[k] = centre(b).map(Math.round); }
    const net = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = net[net.length - 1], b = pts[i];
      if (a[0] !== b[0] && a[1] !== b[1]) net.push(i === 1 ? [b[0], a[1]] : [a[0], b[1]]);
      net.push(b);
    }
    traces.set(l, net);
    const g = aird.parVue.get(l.vue), an = {}, frac = (f, p) => { const b = boites.get(f); return b ? [Math.min(1, Math.max(0, (p[0] - b.x) / b.w)), Math.min(1, Math.max(0, (p[1] - b.y) / b.h))].map(v => Math.round(v * 10000) / 10000) : null; };
    if (l.source.genre !== 'port' && g && diaEnfant(g, 'sourceAnchor')) an.source = frac(l.source, net[0]);
    if (l.cible.genre !== 'port' && g && diaEnfant(g, 'targetAnchor')) an.cible = frac(l.cible, net[net.length - 1]);
    if (an.source || an.cible) ancres.set(l, an);
  }
  // Autres liens touchés (vers des formes hors du graphe, ou ramenés à un même nœud) : retracés en angles droits
  const dans = f => { for (let p = f; p; p = p.parent) if (boites.has(p)) return true; return false; };
  const r = diaRetracer(aird, scene, deplacements, tailles, 'orthogonal', l => !traces.has(l) && (dans(l.source) || dans(l.cible)));
  for (const [l, t] of r.traces) traces.set(l, t);
  for (const [l, a] of r.ancres) ancres.set(l, a);
  return { deplacements, tailles, traces, ancres };
}

/**
 * Score d'une disposition (plus bas : meilleure), pour choisir entre plusieurs résultats (sens des couches) : croisements
 * entre les liens retracés, segments qui traversent une forme étrangère au lien (positions nouvelles), coudes, longueur.
 * @param {object} scene scène du diagramme
 * @param {{deplacements:Map, tailles:Map, traces:Map}} p disposition (diaResultatElk, diaDisposer)
 * @returns {{score:number, croisements:number, traversees:number, coudes:number, longueur:number}}
 */
function diaScoreDisposition(scene, p) {
  const decal = f => { let x = 0, y = 0; for (let q = f; q; q = q.parent) { const v = p.deplacements.get(q); if (v) { x += v[0]; y += v[1]; } } return [x, y]; };
  const boites = scene.formes.filter(f => f.genre !== 'port' && f.genre !== 'ligne' && f.genre !== 'note' && f.w > 4 && f.h > 4)
    .map(f => { const [dx, dy] = decal(f), t = p.tailles.get(f); return { f, x: f.x + dx, y: f.y + dy, w: t ? t[0] : f.w, h: t ? t[1] : f.h }; });
  const seg = [];
  let coudes = 0, longueur = 0;
  for (const [l, pts] of p.traces) {
    coudes += Math.max(0, pts.length - 2);
    for (let i = 1; i < pts.length; i++) { seg.push({ a: pts[i - 1], b: pts[i], l }); longueur += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); }
  }
  const o = (p1, q, r) => Math.sign((q[0] - p1[0]) * (r[1] - p1[1]) - (q[1] - p1[1]) * (r[0] - p1[0]));
  const coupe = (a, b, c, d) => o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  let croisements = 0, traversees = 0;
  for (let i = 0; i < seg.length; i++) for (let j = i + 1; j < seg.length; j++) if (seg[i].l !== seg[j].l && coupe(seg[i].a, seg[i].b, seg[j].a, seg[j].b)) croisements++;
  const lies = l => { const s = new Set(); for (const e of [l.source, l.cible]) for (let q = e; q; q = q.parent) s.add(q); return s; };
  const memo = new Map();
  for (const s of seg) {
    if (!memo.has(s.l)) memo.set(s.l, lies(s.l));
    const ex = memo.get(s.l);
    for (const b of boites) {
      if (ex.has(b.f)) continue;
      const x0 = b.x + 2, y0 = b.y + 2, x1 = b.x + b.w - 2, y1 = b.y + b.h - 2;
      if (Math.max(s.a[0], s.b[0]) > x0 && Math.min(s.a[0], s.b[0]) < x1 && Math.max(s.a[1], s.b[1]) > y0 && Math.min(s.a[1], s.b[1]) < y1) traversees++;
    }
  }
  return { score: croisements * 10 + traversees * 10 + coudes + longueur / 100, croisements, traversees, coudes, longueur };
}

/* ─────────────────────────────── Création de ports (E8, palier 2) ─────────────────────────────── */
/* Reproduit les outils de palette de Capella qui créent un port (STY_OUTILS_PORTS, générés depuis les .odesign) :
   l'outil crée le port dans le modèle (règle de 45-regles.js), puis Sirius crée sa vue dans le conteneur visé.
   Ici, sans DOM : outils proposés sur une forme, style choisi comme Sirius (styles conditionnels), et nœuds Sirius
   (DNode) et GMF (Node) à insérer dans le .aird, construits sur le modèle des ports qu'écrit Sirius. */

/** Types de ports qu'Arcature sait créer depuis un diagramme. */
const DIA_TYPES_PORTS = new Set(['ComponentPort', 'FunctionInputPort', 'FunctionOutputPort', 'PhysicalPort']);

/** Préfixe des types du modèle Capella dans les références du .aird. */
const DIA_NS_CAPELLA = 'org.polarsys.capella.core.data.';

/**
 * Prédicats des styles conditionnels des mappings de ports, transcrits des services Java de Capella
 * (CsServices / PortExt : isStandardPort, isInStrictFlowPort… ; FaServices.isAFunctionOutputPort ; CsServices.isAPhysicalPort)
 * et des expressions AQL des .odesign. Port : { type (court), kind, orientation, requises, fournies (nombres d'interfaces) }.
 */
const DIA_PREDICATS_PORTS = {
  'service:isStandardPort()': p => p.type === 'ComponentPort' && p.kind === 'STANDARD',
  'service:isInStrictFlowPort()': p => p.type === 'ComponentPort' && p.kind === 'FLOW' && p.orientation === 'IN',
  'service:isOutStrictFlowPort()': p => p.type === 'ComponentPort' && p.kind === 'FLOW' && p.orientation === 'OUT',
  'service:isInoutStrictFlowPort()': p => p.type === 'ComponentPort' && p.kind === 'FLOW' && p.orientation === 'INOUT',
  'service:isAPhysicalPort()': p => p.type === 'PhysicalPort',
  'service:isAFunctionOutputPort()': p => p.type === 'FunctionOutputPort',
  'aql:self.kind = fa::ComponentPortKind::FLOW and self.orientation = fa::OrientationPortKind::IN': p => p.kind === 'FLOW' && p.orientation === 'IN',
  'aql:self.kind = fa::ComponentPortKind::FLOW and self.orientation = fa::OrientationPortKind::OUT': p => p.kind === 'FLOW' && p.orientation === 'OUT',
  'aql:self.kind = fa::ComponentPortKind::FLOW and self.orientation = fa::OrientationPortKind::INOUT': p => p.kind === 'FLOW' && p.orientation === 'INOUT',
  'aql:self.requiredInterfaces->size() > 0 and self.providedInterfaces->size() > 0 and self.kind = fa::ComponentPortKind::STANDARD': p => p.requises > 0 && p.fournies > 0 && p.kind === 'STANDARD',
  'aql:self.requiredInterfaces->size() > 0 and self.providedInterfaces->size() = 0 and self.kind = fa::ComponentPortKind::STANDARD': p => p.requises > 0 && p.fournies === 0 && p.kind === 'STANDARD',
  'aql:self.requiredInterfaces->size() = 0 and self.providedInterfaces->size() > 0 and self.kind = fa::ComponentPortKind::STANDARD': p => p.requises === 0 && p.fournies > 0 && p.kind === 'STANDARD'
};

/**
 * Préconditions des outils et des mappings de ports, transcrites du Java et de l'AQL de Capella. Contexte :
 * { container (élément du modèle visé), type (composant : getComponentType), vue (élément Sirius visé, jamais le diagramme ici) }.
 * - FaServices.isValidCreationFunctionInputPort / OutputPort : une fonction de contrôle à une seule entrée
 *   (DUPLICATE, SPLIT, SELECT — FunctionExt.isControlNodeOneInput) ou à une seule sortie (GATHER, ROUTE) n'en reçoit
 *   qu'une ; FunctionExt.getRelatedFunction : l'élément lui-même ou sa fonction englobante ;
 * - ABServices.isValidABComponentPort : la vue parente n'est pas le diagramme ;
 * - PhysicalServices.isValidPhysicalPort(container) : l'élément visé est une Part dont le type peut avoir un port
 *   physique (canHavePhysicalPort : composant système ou physique ; composant logique s'il est le système du niveau,
 *   ou si son plus haut composant englobant n'est pas ce système). Aides de 45-regles.js (REG_H).
 */
const DIA_PRECONDITIONS_PORTS = {
  '': () => true,
  'aql:container.oclIsKindOf(cs::Part)': c => modType(c.container) === 'Part',
  'aql:container.oclIsKindOf(cs::Part) and (container.getComponentType().nature != pa::PhysicalComponentNature::NODE or container.getComponentType().isActor())':
    c => modType(c.container) === 'Part' && !!c.type && ((xtAttr(c.type, 'nature') || 'UNSET') !== 'NODE' || xtAttr(c.type, 'actor') === 'true'),
  'aql:container.getComponentType().nature != pa::PhysicalComponentNature::BEHAVIOR': c => !!c.type && (xtAttr(c.type, 'nature') || 'UNSET') !== 'BEHAVIOR',
  'aql:containerView.isValidCreationFunctionInputPort()': c => {
    const f = diaFonctionLiee(c.container);
    return !f || !/^(DUPLICATE|SPLIT|SELECT)$/.test(xtAttr(f, 'kind') || '') || !f.enfants.some(x => x.tag === 'inputs');
  },
  'aql:containerView.isValidCreationFunctionOutputPort()': c => {
    const f = diaFonctionLiee(c.container);
    return !f || !/^(GATHER|ROUTE)$/.test(xtAttr(f, 'kind') || '') || !f.enfants.some(x => x.tag === 'outputs');
  },
  'service:isValidABComponentPort(containerView)': c => !!c.vue,
  'aql:self.isValidPhysicalPort(container)': c => diaPeutAvoirPortPhysique(c),
  'service:isValidPhysicalPort(container)': c => diaPeutAvoirPortPhysique(c)
};

/**
 * PhysicalServices.isValidPhysicalPort(container) puis canHavePhysicalPort(type de la Part).
 * @param {{container:object, type:object}} c contexte de la précondition
 * @returns {boolean}
 */
function diaPeutAvoirPortPhysique(c) {
  if (modType(c.container) !== 'Part' || !c.type) return false;
  const t = modType(c.type);
  if (t === 'LogicalComponent') {
    const systeme = REG_H.systeme(c.type), sommet = REG_H.composantSommet(c.type);
    return c.type === systeme || (!!sommet && sommet !== systeme);
  }
  return t === 'SystemComponent' || t === 'PhysicalComponent';
}

/**
 * Décode un chemin Sirius (fragment d'URI après « # ») pour le comparer.
 * @param {string} href référence (avec ou sans ressource)
 * @returns {string}
 */
function diaDecoderChemin(href) {
  const f = String(href || '').replace(/^[^#]*#/, '');
  try { return decodeURIComponent(f); } catch (e) { return f; }
}

/**
 * Fonction concernée par un élément (FunctionExt.getRelatedFunction) : l'élément s'il est une fonction, sinon la
 * fonction qui le contient.
 * @param {object|null} el nœud du modèle
 * @returns {object|null}
 */
function diaFonctionLiee(el) { return regFonctionLiee(el); }

/**
 * Élément du modèle désigné par une référence « #id » d'un attribut (y compris un élément provisoire : regAvecProvisoires).
 * @param {object} doc modèle
 * @param {object} el nœud
 * @param {string} n nom de l'attribut
 * @returns {object|null}
 */
function diaReference(doc, el, n) {
  const v = (xtAttr(el, n) || '').split(/\s+/)[0].replace(/^#/, '');
  return v ? doc.parId.get(v) || (doc.provisoires && doc.provisoires.get(v)) || null : null;
}

/**
 * Composant d'un élément visé (CsServices.getComponentType) : une Part donne son type, un composant lui-même,
 * un port son composant.
 * @param {object} doc modèle
 * @param {object|null} el nœud
 * @returns {object|null}
 */
function diaTypeComposant(doc, el) {
  if (!el) return null;
  const t = modType(el);
  if (t === 'Part') return diaReference(doc, el, 'abstractType');
  if (/Port$/.test(t)) return el.parent || null;
  return /Component$|^Entity$|^ConfigurationItem$/.test(t) ? el : null;
}

/**
 * Représentation (palette) d'un outil de port : écrite dans l'outil, sinon celle qui contient son mapping.
 * @param {object} o outil (STY_OUTILS_PORTS)
 * @returns {string} chemin décodé
 */
function diaRepresentationOutil(o) {
  if (o.d) return o.d;
  const seg = diaDecoderChemin(o.m).split('/@');
  return '//@' + seg[1] + '/@' + seg[2];
}

/**
 * Mappings parents qui portent le port d'un outil : le parent de son mapping, et ceux qui le réutilisent.
 * @param {object} o outil (STY_OUTILS_PORTS)
 * @returns {string[]} chemins décodés
 */
function diaParentsOutil(o) { return [diaDecoderChemin(o.m).replace(/\/@[^/]+$/, ''), ...(o.p || [])]; }

/**
 * Outils de création de ports proposés sur une forme d'un diagramme : ceux de la palette du diagramme dont le mapping
 * de port est porté par le mapping de la forme, dont la précondition (outil et mapping) est vraie, et dont le
 * type est géré par Arcature. Le port est créé dans le conteneur que donne l'outil (élément visé, ou son composant).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} f forme visée (conteneur ou nœud, pas un port) ; ou forme d'un élément créé dans la même opération
 *   (diaPreparerConteneur : nœuds Sirius et GMF pas encore insérés dans sirius, gmf, élément du modèle dans el)
 * @param {object} doc modèle (.capella)
 * @returns {Array<{outil:object, conteneur:object}>} outils et élément du modèle qui recevra le port
 */
function diaOutilsPorts(aird, rep, f, doc) {
  if (!f || f.genre === 'port' || f.genre === 'ligne' || f.genre === 'note' || !diaModifiable(rep)) return [];
  const s = f.sirius || aird.parUid.get(f.uid), am = s && diaEnfant(s, 'actualMapping');
  if (!am) return [];
  const mapping = diaDecoderChemin(xtAttr(am, 'href')), container = f.el || doc.parId.get(f.semId) || null;
  if (!container) return [];
  const res = [];
  for (const o of STY_OUTILS_PORTS) {
    if (!DIA_TYPES_PORTS.has(o.t) || diaRepresentationOutil(o) !== rep.description || !diaParentsOutil(o).includes(mapping)) continue;
    const type = diaTypeComposant(doc, container);
    const ctx = { container, type, vue: s };
    const preOutil = DIA_PRECONDITIONS_PORTS[o.pre], preMapping = DIA_PRECONDITIONS_PORTS[(STY_MAPPINGS_PORTS[o.m] || {}).pre || ''];
    if (!preOutil || !preMapping || !preOutil(ctx) || !preMapping(ctx)) continue;
    const conteneur = o.c === '' ? container : o.c === 'abstractType' ? diaReference(doc, container, 'abstractType') : type;
    if (conteneur) res.push({ outil: o, conteneur });
  }
  return res;
}

/**
 * Style d'un port tel que Sirius le choisit : premier style conditionnel dont le prédicat est vrai, sinon le style principal.
 * @param {string} mapping chemin du mapping du port
 * @param {{type:string, kind:string, orientation:string, requises:number, fournies:number}} port caractéristiques du port
 * @returns {object|null} style (q, c, t, a, taille), null si un prédicat n'est pas transcrit ; chemin : chemin de sa description
 */
function diaStylePort(mapping, port) {
  const m = STY_MAPPINGS_PORTS[mapping];
  if (!m) return null;
  for (const st of m.styles) {
    const p = st.q ? DIA_PREDICATS_PORTS[st.q] : () => true;
    if (!p) return null;
    if (p(port)) {
      return Object.assign({}, st, {
        chemin: mapping + (st.c < 0 ? '/@style' : '/@conditionnalStyles.' + st.c + '/@style'),
        a: st.a.map(([n, v]) => [n, n === 'workspacePath' ? STY_IMAGES + v : v])
      });
    }
  }
  return null;
}

/**
 * Identifiant au format d'EMF (EcoreUtil.generateUUID) : « _ » suivi de 22 caractères base64 (- et _).
 * @returns {string}
 */
function diaNouvelUid() {
  const o = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(o);
  else for (let i = 0; i < 16; i++) o[i] = Math.random() * 256 | 0;
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let s = '_', bits = 0, n = 0;
  for (const b of o) {
    bits = (bits << 8) | b; n += 8;
    while (n >= 6) { n -= 6; s += abc[(bits >> n) & 63]; }
  }
  return s + abc[(bits << (6 - n)) & 63];
}

/**
 * Préfixe déclaré (xmlns) pour un espace de noms à la racine d'un document.
 * @param {object} doc document
 * @param {string} uri espace de noms
 * @returns {string|null}
 */
function diaPrefixe(doc, uri) {
  const a = doc.racine.attrs.find(x => x.n.startsWith('xmlns:') && x.v === uri);
  return a ? a.n.slice(6) : null;
}

/**
 * Prépare la création de la vue d'un port dans un diagramme, sans rien modifier : nœud Sirius (DNode dans
 * ownedBorderedNodes de la forme) et nœud GMF (Node parmi les enfants de la vue de la forme), écrits comme Sirius
 * (structure relevée sur les .aird de Capella : étiquette masquée, nœud de style, police et taille des ports voisins).
 * Le port est posé sur le bord de la forme au plus près du point visé (diaPlacerPort).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} f forme parente (ou forme d'un élément créé dans la même opération : voir diaOutilsPorts)
 * @param {object} outil outil (STY_OUTILS_PORTS)
 * @param {{id:string, nom:string, attrs:Array<[string,string]>}} port port créé dans le modèle (identifiant, nom, attributs posés)
 * @param {number[]} centre point visé [x, y] (coordonnées du diagramme)
 * @param {string} uriFa espace de noms du paquetage fa dans le modèle (pour le déclarer dans le .aird s'il y manque ; celui de cs,
 *   pour un port physique, s'en déduit)
 * @returns {{etapes:Array<{parent:object, noeud:object, index:number}>, attrs:Array<{el:object, n:string, avant:null, apres:string}>, vue:string,
 *   sirius:object, gmf:object, boite:{x:number, y:number, w:number, h:number}}}
 *   nœuds à insérer (dans l'ordre), attributs à ajouter (déclaration d'espace de noms), vue GMF du port ; nœuds Sirius et
 *   GMF du port et sa boîte (coordonnées du diagramme), pour y accrocher un lien
 */
function diaPreparerPort(aird, rep, f, outil, port, centre, uriFa) {
  const s = f.sirius || aird.parUid.get(f.uid), vueParent = f.gmf || aird.parVue.get(f.vue), doc = aird.doc;
  if (!s || !vueParent) throw new Error(_L('Forme introuvable dans le .aird.'));
  const val = n => (port.attrs.find(a => a[0] === n) || [])[1];
  const style = diaStylePort(outil.m, { type: outil.t, kind: val('kind') || 'STANDARD', orientation: val('orientation') || 'UNSET', requises: 0, fournies: 0 });
  if (!style) throw new Error(_L('Style du port inconnu pour ce diagramme.'));
  const attrs = [];
  // Espaces de noms : ceux de Sirius sont déclarés dès qu'un diagramme existe ; celui du modèle (fa) peut manquer
  const pDiagramme = diaPrefixe(doc, 'http://www.eclipse.org/sirius/diagram/1.1.0');
  const pDescription = diaPrefixe(doc, 'http://www.eclipse.org/sirius/diagram/description/1.1.0');
  const pStyle = diaPrefixe(doc, 'http://www.eclipse.org/sirius/diagram/description/style/1.1.0');
  if (!pDiagramme || !pDescription || !pStyle) throw new Error(_L('Espaces de noms de Sirius absents du .aird.'));
  // Paquetage du port : fa (ports de fonction, de composant), cs (port physique) ; son espace de noms se déduit de celui de fa
  const paquet = outil.t === 'PhysicalPort' ? 'cs' : 'fa', pFa = DIA_NS_CAPELLA + paquet, uri = uriFa && uriFa.replace(/\/fa\//, '/' + paquet + '/');
  if (diaPrefixe(doc, uri) !== pFa) {
    if (xtAttr(doc.racine, 'xmlns:' + pFa) != null || !uri) throw new Error(_L('Espace de noms du modèle incompatible dans le .aird.'));
    attrs.push({ el: doc.racine, n: 'xmlns:' + pFa, avant: null, apres: uri });
  }
  // Ressource du modèle : celle de la forme parente
  const cible = diaEnfant(s, 'target'), ressource = (xtAttr(cible, 'href') || '').replace(/#.*$/, '');
  const typeXsi = pFa + ':' + outil.t, href = ressource + '#' + port.id;
  const plateforme = 'platform:/plugin/org.polarsys.capella.core.sirius.analysis/description/' + outil.f + '#';
  const neuf = (tag, a, enfants) => { const n = xtNouveau(tag, a); for (const e of enfants || []) { e.parent = n; n.enfants.push(e); } return n; };
  // Nœud Sirius (ownedBorderedNodes) : cible, éléments sémantiques, étiquette masquée par défaut, style, mapping
  const uid = diaNouvelUid(), uidStyle = diaNouvelUid(), cache = style.a.some(a => a[0] === 'hideLabelByDefault' && a[1] === 'true');
  const dnode = neuf('ownedBorderedNodes', [['xmi:type', pDiagramme + ':DNode'], ['uid', uid], ['name', port.nom], ['width', String(style.taille)], ['height', String(style.taille)]], [
    xtNouveau('target', [['xmi:type', typeXsi], ['href', href]]),
    xtNouveau('semanticElements', [['xmi:type', typeXsi], ['href', href]]),
    ...(cache ? [xtNouveau('graphicalFilters', [['xmi:type', pDiagramme + ':HideLabelFilter'], ['uid', diaNouvelUid()]])] : []),
    neuf('ownedStyle', [['xmi:type', pDiagramme + ':' + style.t], ['uid', uidStyle], ...style.a], [
      xtNouveau('description', [['xmi:type', pStyle + ':' + style.t + 'Description'], ['href', plateforme + style.chemin]])]),
    xtNouveau('actualMapping', [['xmi:type', pDescription + ':NodeMapping'], ['href', plateforme + outil.m]])
  ]);
  // Position : sur le bord de la forme, relative à son coin (taille d'un port : unités Sirius × 10)
  const w = style.taille * DIA_UNITE, h = w;
  const [x, y] = diaPlacerPort({ w, h }, centre[0], centre[1], f).map(Math.round);
  // Police : celle des ports voisins (Sirius l'écrit selon la machine), sinon celle de la forme
  const portVoisin = vueParent.enfants.find(c => c.tag === 'children' && /^30(01|12)$/.test(xtAttr(c, 'type') || ''));
  const police = v => { const st = v && v.enfants.find(c => c.tag === 'styles' && /ShapeStyle/.test(xtAttr(c, 'xmi:type') || '')); return st ? xtAttr(st, 'fontName') : null; };
  const fontName = police(portVoisin) ?? police(vueParent);
  const avecPolice = a => (fontName != null ? [...a, ['fontName', fontName]] : a);
  const conteneur = /DNodeContainer/.test(xtAttr(s, 'xmi:type') || '');
  const id = () => diaNouvelUid();
  const gmf = neuf('children', [['xmi:type', 'notation:Node'], ['xmi:id', id()], ['type', conteneur ? '3012' : '3001'], ['element', uid]], [
    neuf('children', [['xmi:type', 'notation:Node'], ['xmi:id', id()], ...(cache ? [['visible', 'false']] : []), ['type', conteneur ? '5010' : '5001']], [
      xtNouveau('layoutConstraint', [['xmi:type', 'notation:Location'], ['xmi:id', id()], ['y', String(h + 1)]])]),
    neuf('children', [['xmi:type', 'notation:Node'], ['xmi:id', id()], ['type', style.t === 'Square' ? '3003' : '3005'], ['element', uidStyle]], [
      xtNouveau('styles', avecPolice([['xmi:type', 'notation:ShapeStyle'], ['xmi:id', id()]])),
      xtNouveau('layoutConstraint', [['xmi:type', 'notation:Bounds'], ['xmi:id', id()]])]),
    xtNouveau('styles', [...avecPolice([['xmi:type', 'notation:ShapeStyle'], ['xmi:id', id()]]), ['fontHeight', '8']]),
    xtNouveau('layoutConstraint', [['xmi:type', 'notation:Bounds'], ['xmi:id', id()], ...(x - f.x ? [['x', String(x - f.x)]] : []), ...(y - f.y ? [['y', String(y - f.y)]] : []), ['width', String(w)], ['height', String(h)]])
  ]);
  // Places : après les ports existants ; sinon après la cible, les éléments sémantiques et les filtres (Sirius),
  // après l'étiquette et le compartiment (GMF)
  const apres = (el, test) => { let i = -1; el.enfants.forEach((c, k) => { if (test(c)) i = k; }); return i + 1; };
  const iSirius = s.enfants.some(c => c.tag === 'ownedBorderedNodes') ? apres(s, c => c.tag === 'ownedBorderedNodes') : apres(s, c => /^(target|semanticElements|graphicalFilters)$/.test(c.tag));
  const iGmf = apres(vueParent, c => c.tag === 'children' && /^(5\d{3}|7\d{3}|3001|3012)$/.test(xtAttr(c, 'type') || ''));
  return { etapes: [{ parent: s, noeud: dnode, index: iSirius }, { parent: vueParent, noeud: gmf, index: iGmf }], attrs, vue: xtAttr(gmf, 'xmi:id'),
    sirius: dnode, gmf, boite: { x, y, w, h } };
}

/* ─────────────────────────────── Création de liens (E8, palier 3) ─────────────────────────────── */
/* Outils de palette qui créent un échange fonctionnel (STY_OUTILS_LIENS, services FaServices.createABFunctionalExchange /
   DFServices.createDFFunctionalExchange) : ports créés au besoin, échange rangé dans la fonction ancêtre commune, vues des
   ports et du lien. Le style du lien (dont sa description calculée, partagée dans le registre du .aird) est repris d'un lien
   de même mapping écrit par Sirius, sans ses personnalisations : Sirius recalcule le reste à l'ouverture. */

/** Ordre EMF des attributs des nœuds Sirius (DNode, DNodeContainer…) touchés par un nouveau lien. */
const DIA_ORDRE_DNODE = ['xmi:type', 'uid', 'name', 'visible', 'outgoingEdges', 'incomingEdges', 'width', 'height', 'resizeKind', 'childrenPresentation'];

/** Ordre EMF des attributs des éléments Sirius (nœuds et liens : DDiagramElement, EdgeTarget, DEdge). */
const DIA_ORDRE_ELEMENT = ['xmi:type', 'uid', 'name', 'visible', 'outgoingEdges', 'incomingEdges', 'sourceNode', 'targetNode', 'width', 'height', 'resizeKind', 'childrenPresentation'];

/**
 * Préconditions des outils de liens et de leurs mappings, transcrites du Java et de l'AQL de Capella. Contexte :
 * { doc, source, cible (éléments du modèle visés), vueSource, vueCible (éléments Sirius des formes qui porteront le lien :
 * port, ou fonction si le port reste à créer) }.
 * - FaServices.isValidCreationFunctionalExchange(source) et (source, cible) : diaSourceEchangeValide, diaEchangeValide ;
 * - DFServices.isValidDFFunctionalExchangeEdge / ABServices.isValidABFunctionalExchangeEdge : pas de lien « interne »
 *   (CapellaServices.areInternalEdgePorts : le conteneur d'une extrémité contient l'autre) ; un nouvel échange n'a pas de
 *   catégorie (isACategoryDisplayed faux) ;
 * - ABServices.isValidABInteractionEdge : extrémités distinctes ; OAServices.getInteractionSourceInDiagram /
 *   getInteractionTargetInDiagram : activités distinctes (déjà garanti par isValidCreationFunctionalExchange) ;
 * - CsServices.isValidCreationABComponentExchange / isValidCreationPABComponentExchange : diaEchangeComposantsValide ;
 * - CsServices.isValidComponentExchangeEdge / isValidPhysicalLinkEdge : un nouveau lien tracé entre les vues de ses propres
 *   ports est valide (isValidLinkEdge) et n'a pas de catégorie (is…CategoryEdgeDisplayed faux) ;
 * - PhysicalServices.isValidCreationPhysicalLink(source, cible) / canBeInvolvedInPhysicalLink : diaPeutLienPhysique ;
 * - implications : la source n'implique pas déjà la cible (CapabilityRealizationExt.isComponentTargetAvailableForCapInvolvement ;
 *   ownedCapabilityInvolvements.systemComponent, ownedEntityOperationalCapabilityInvolvements.involved ; pour une mission,
 *   eInverse('mission') lu comme ses MissionInvolvement) ; CCRI : expression invalide dans l'odesign (parenthèse en trop),
 *   outil refusé ;
 *   CsServices.isValidCreationPhysicalLink / isValidCreationABPhysicalLink (PAB) : composants nœuds (getComponentType
 *   ramène un port à son composant).
 */
const DIA_PRECONDITIONS_LIENS = {
  '': () => true,
  'aql:self.isValidCreationFunctionalExchange(preSource)': c => diaSourceEchangeValide(c.doc, c.source),
  'aql:self.isValidCreationFunctionalExchange(preSource,preTarget)': c => diaEchangeValide(c.doc, c.source, c.cible),
  'service:isValidDFFunctionalExchangeEdge(sourceView, targetView)': c => !diaLienInterne(c.vueSource, c.vueCible),
  'service:isValidABFunctionalExchangeEdge(sourceView, targetView)': c => c.vueSource !== c.vueCible && !diaLienInterne(c.vueSource, c.vueCible),
  'service:isValidABInteractionEdge(sourceView, targetView)': c => c.vueSource !== c.vueCible,
  'aql:self.getInteractionSourceInDiagram(diagram) != self.getInteractionTargetInDiagram(diagram)': c => diaFonctionLiee(c.source) !== diaFonctionLiee(c.cible),
  'aql:self.isValidCreationABComponentExchange(preSourceView,preTargetView)': c => diaEchangeComposantsValide(c.doc, c.source, c.cible),
  'aql:self.isValidCreationPABComponentExchange(preSourceView,preTargetView)': c => diaEchangeComposantsValide(c.doc, c.source, c.cible)
    && diaActeurOuPasNoeud(diaTypeComposant(c.doc, c.source)) && diaActeurOuPasNoeud(diaTypeComposant(c.doc, c.cible)),
  'aql:self.isValidCreationPABComponentExchange(preSourceView)': c => !REG_H.est(c.source, 'PhysicalPort') && diaActeurOuPasNoeud(diaTypeComposant(c.doc, c.source)),
  'service:isValidComponentExchangeEdge(sourceView, targetView)': () => true,
  'service:isValidPhysicalLinkEdge(sourceView, targetView)': () => true,
  'aql:preSourceView.target.canBeInvolvedInPhysicalLink()': c => diaPeutLienPhysique(c.doc, c.source),
  'aql:preSourceView.target.isValidCreationPhysicalLink(preTargetView.target)': c => !(REG_H.est(c.source, 'PhysicalPort') && c.source === c.cible)
    && diaPeutLienPhysique(c.doc, c.source) && diaPeutLienPhysique(c.doc, c.cible),
  'aql:self.isValidCreationPhysicalLink()': c => diaNoeud(diaTypeComposant(c.doc, c.source)),
  'aql:self.isValidCreationABPhysicalLink(preSourceView,preTargetView)': c => {
    if (c.source === c.cible) return !REG_H.est(c.source, 'PhysicalPort');
    const accepte = x => REG_H.est(x, 'PhysicalPort') || REG_H.est(x, 'Component') || (REG_H.est(x, 'Part') && REG_H.est(diaReference(c.doc, x, 'abstractType'), 'Component'));
    return accepte(c.source) && accepte(c.cible) && diaNoeud(diaTypeComposant(c.doc, c.source)) && diaNoeud(diaTypeComposant(c.doc, c.cible));
  },
  // Implications (diagrammes de capacités et de missions)
  'aql:self.isComponentTargetAvailableForCapInvolvement(preSource,preTarget)': c => !diaImpliques(c.doc, c.source, 'ownedCapabilityRealizationInvolvements').includes(c.cible),
  'aql:not self.isComponentInvolvedWithCapability(preSource, preTarget))': () => false,
  'aql:not (preSource.ownedCapabilityInvolvements.systemComponent->includes(preTarget))': c => !diaImpliques(c.doc, c.source, 'ownedCapabilityInvolvements').includes(c.cible),
  "aql:preSource.eInverse('mission')->filter(ctx::MissionInvolvement)->select(x | x.systemComponent = preTarget)->size() = 0": c => !diaImpliques(c.doc, c.source, 'ownedMissionInvolvements').includes(c.cible),
  'aql:not (preSource.ownedEntityOperationalCapabilityInvolvements.involved->includes(preTarget))': c => !diaImpliques(c.doc, c.source, 'ownedEntityOperationalCapabilityInvolvements').includes(c.cible)
};

/**
 * Éléments impliqués (involved) par les implications d'une source, d'une balise donnée.
 * @param {object} doc modèle
 * @param {object} source capacité, mission…
 * @param {string} tag balise des implications
 * @returns {object[]}
 */
function diaImpliques(doc, source, tag) {
  return source ? source.enfants.filter(x => x.tag === tag).map(x => diaReference(doc, x, 'involved')).filter(Boolean) : [];
}

/**
 * CsServices.isNodeComponent : composant physique de nature nœud.
 * @param {object|null} c composant
 * @returns {boolean}
 */
function diaNoeud(c) { return !!c && REG_H.est(c, 'PhysicalComponent') && (xtAttr(c, 'nature') || 'UNSET') === 'NODE'; }

/**
 * PhysicalServices.canBeInvolvedInPhysicalLink : une Part dont le type peut avoir un port physique (canHavePhysicalPort),
 * ou un port physique.
 * @param {object} doc modèle
 * @param {object} el élément visé
 * @returns {boolean}
 */
function diaPeutLienPhysique(doc, el) {
  if (REG_H.est(el, 'Part')) return diaPeutAvoirPortPhysique({ container: el, type: diaReference(doc, el, 'abstractType') });
  return REG_H.est(el, 'PhysicalPort');
}

/**
 * CsServices.isAbstractActorOrNotNodeComponent : un acteur, ou un composant physique qui n'est pas un nœud.
 * @param {object|null} c composant
 * @returns {boolean}
 */
function diaActeurOuPasNoeud(c) {
  return !!c && ((REG_H.est(c, 'Component') && xtAttr(c, 'actor') === 'true') || (REG_H.est(c, 'PhysicalComponent') && (xtAttr(c, 'nature') || 'UNSET') !== 'NODE'));
}

/**
 * CsServices.isValidCreationABComponentExchange : un port source doit être de flux sortant (OUT ou INOUT) ou standard, un
 * port cible de flux entrant (IN ou INOUT) ou standard ; un composant physique nœud n'en reçoit pas, sauf s'il est acteur.
 * @param {object} doc modèle
 * @param {object} s élément source
 * @param {object} t élément cible
 * @returns {boolean}
 */
function diaEchangeComposantsValide(doc, s, t) {
  const sens = (p, o) => (xtAttr(p, 'kind') || 'STANDARD') === 'STANDARD' || ((xtAttr(p, 'kind') === 'FLOW') && [o, 'INOUT'].includes(xtAttr(p, 'orientation') || 'UNSET'));
  if (REG_H.est(s, 'ComponentPort') && !sens(s, 'OUT')) return false;
  if (REG_H.est(t, 'ComponentPort') && !sens(t, 'IN')) return false;
  const noeud = c => REG_H.est(c, 'PhysicalComponent') && (xtAttr(c, 'nature') || 'UNSET') === 'NODE' && xtAttr(c, 'actor') !== 'true';
  return !noeud(diaTypeComposant(doc, s)) && !noeud(diaTypeComposant(doc, t));
}

/**
 * Indique si un élément est un ancêtre (au sens large) d'un autre.
 * @param {object} a ancêtre supposé
 * @param {object} b élément
 * @returns {boolean}
 */
function diaEstAncetre(a, b) { for (let x = b; x; x = x.parent) if (x === a) return true; return false; }

/**
 * CapellaServices.areInternalEdgePorts : le conteneur (élément Sirius parent) d'une extrémité contient l'autre extrémité.
 * Pour une extrémité dont le port reste à créer, la vue est la fonction, qui sera son conteneur.
 * @param {object} vs vue source (port, ou conteneur futur)
 * @param {object} vc vue cible
 * @returns {boolean}
 */
function diaLienInterne(vs, vc) {
  const ps = vs.tag === 'ownedBorderedNodes' ? vs.parent : vs, pc = vc.tag === 'ownedBorderedNodes' ? vc.parent : vc;
  return diaEstAncetre(ps, pc) || diaEstAncetre(pc, ps);
}

/**
 * Échanges fonctionnels du modèle dont la source (ou la cible) est un élément (ActivityNode.getOutgoing / getIncoming).
 * @param {object} doc modèle
 * @param {object} el nœud (fonction ou port)
 * @param {'source'|'target'} bout extrémité
 * @returns {object[]}
 */
function diaEchangesDe(doc, el, bout) {
  const id = modId(el), res = [];
  xtParcourir(doc.racine, x => { if (modType(x) === 'FunctionalExchange' && (xtAttr(x, bout) || '').replace(/^#/, '') === id) res.push(x); });
  return res;
}

/**
 * FaServices.isValidCreationFunctionalExchange(context, source) : la source est un ActivityNode qui n'est pas une entrée ;
 * une fonction de contrôle à une seule sortie (GATHER, ROUTE : FunctionExt.isControlNodeOneOutput) n'a pas déjà d'échange
 * sortant, et la source est son port de sortie ou elle n'en a pas.
 * @param {object} doc modèle
 * @param {object} s élément source
 * @returns {boolean}
 */
function diaSourceEchangeValide(doc, s) {
  if (!s || REG_H.est(s, 'InputPin') || !REG_H.est(s, 'ActivityNode')) return false;
  const f = diaFonctionLiee(s);
  if (f && /^(GATHER|ROUTE)$/.test(xtAttr(f, 'kind') || '')) {
    if (diaEchangesDe(doc, f, 'source').length) return false;
    if (!(REG_H.est(s, 'OutputPin') || !f.enfants.some(x => x.tag === 'outputs'))) return false;
  }
  return true;
}

/**
 * FaServices.isValidCreationFunctionalExchange(context, source, target) : la cible est un ActivityNode qui n'est pas une
 * sortie ; fonctions différentes, aucune ne contient l'autre ; une fonction de contrôle à une seule entrée (DUPLICATE,
 * SPLIT, SELECT) n'a pas déjà d'échange entrant, et la cible est son port d'entrée ou elle n'en a pas ; puis la source.
 * @param {object} doc modèle
 * @param {object} s élément source
 * @param {object} t élément cible
 * @returns {boolean}
 */
function diaEchangeValide(doc, s, t) {
  if (!t || REG_H.est(t, 'OutputPin') || !REG_H.est(t, 'ActivityNode')) return false;
  const fs = diaFonctionLiee(s), ft = diaFonctionLiee(t);
  if (!fs || !ft || fs === ft || diaEstAncetre(fs, ft) || diaEstAncetre(ft, fs)) return false;
  if (/^(DUPLICATE|SPLIT|SELECT)$/.test(xtAttr(ft, 'kind') || '')) {
    if (diaEchangesDe(doc, ft, 'target').length) return false;
    if (!(REG_H.est(t, 'InputPin') || !ft.enfants.some(x => x.tag === 'inputs'))) return false;
  }
  return diaSourceEchangeValide(doc, s);
}

/**
 * Mapping (chemin décodé) d'une forme de la scène.
 * @param {object} aird résultat de diaLire
 * @param {object} f forme
 * @returns {string}
 */
function diaMappingForme(aird, f) {
  const s = aird.parUid.get(f.uid), am = s && diaEnfant(s, 'actualMapping');
  return am ? diaDecoderChemin(xtAttr(am, 'href')) : '';
}

/**
 * Représentation (palette) d'un outil de lien : celle qui contient son mapping.
 * @param {object} o outil (STY_OUTILS_LIENS)
 * @returns {string}
 */
function diaRepresentationLien(o) { const seg = diaDecoderChemin(o.m).split('/@'); return '//@' + seg[1] + '/@' + seg[2]; }

/**
 * Outils de liens qu'on peut commencer depuis une forme (mapping permis en source, précondition de début de tracé).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} f forme source
 * @param {object} doc modèle
 * @returns {object[]} outils (STY_OUTILS_LIENS)
 */
function diaOutilsLiens(aird, rep, f, doc) {
  if (!f || !f.semId || !diaModifiable(rep)) return [];
  const mapping = diaMappingForme(aird, f), source = doc.parId.get(f.semId);
  if (!mapping || !source) return [];
  return STY_OUTILS_LIENS.filter(o => diaRepresentationLien(o) === rep.description && o.src.includes(mapping)
    && DIA_PRECONDITIONS_LIENS[o.conn] && DIA_PRECONDITIONS_LIENS[o.conn]({ doc, source }));
}

/**
 * Indique si un lien peut être tracé entre deux formes avec un outil : mapping permis en cible, précondition de l'outil et
 * précondition du mapping du lien (sur les vues qui porteront le lien : les ports, ou les fonctions si les ports restent à créer).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} o outil
 * @param {object} fs forme source
 * @param {object} fc forme cible
 * @param {object} doc modèle
 * @returns {boolean}
 */
function diaLienPossible(aird, rep, o, fs, fc, doc) {
  if (!fc || !fc.semId || fs === fc || !o.tgt.includes(diaMappingForme(aird, fc))) return false;
  const c = { doc, source: doc.parId.get(fs.semId), cible: doc.parId.get(fc.semId), vueSource: aird.parUid.get(fs.uid), vueCible: aird.parUid.get(fc.uid) };
  if (!c.source || !c.cible || !c.vueSource || !c.vueCible) return false;
  const pre = DIA_PRECONDITIONS_LIENS[o.pre], mpre = DIA_PRECONDITIONS_LIENS[o.mpre];
  return !!pre && !!mpre && pre(c) && mpre(c);
}

/**
 * Lien écrit par Sirius à reprendre comme modèle : même mapping de lien, de préférence entre les mêmes mappings
 * de source et de cible, avec le moins de personnalisations (customFeatures).
 * @param {object} aird résultat de diaLire
 * @param {string} mapping chemin du mapping du lien (tel qu'écrit dans l'outil)
 * @param {string} mSource mapping (décodé) de la vue source
 * @param {string} mCible mapping (décodé) de la vue cible
 * @param {function(object):boolean} [prefere] critère supplémentaire (lien du même genre…) : préféré s'il est vrai
 * @returns {{dedge:object, edge:object}|null}
 */
function diaModeleLien(aird, mapping, mSource, mCible, prefere) {
  const voulu = diaDecoderChemin(mapping), parGmf = new Map();
  for (const v of aird.parVue.values()) if (v.tag === 'edges') parGmf.set(xtAttr(v, 'element'), v);
  let meilleur = null, score = Infinity;
  for (const s of aird.parUid.values()) {
    if (s.tag !== 'ownedDiagramElements' || !/DEdge/.test(xtAttr(s, 'xmi:type') || '')) continue;
    const am = diaEnfant(s, 'actualMapping');
    if (!am || diaDecoderChemin(xtAttr(am, 'href')) !== voulu) continue;
    const edge = parGmf.get(xtAttr(s, 'uid')), st = diaEnfant(s, 'ownedStyle');
    if (!edge || !st || !(xtAttr(st, 'description') || diaEnfant(st, 'description'))) continue;
    const bout = n => { const x = aird.parUid.get(xtAttr(s, n)); const m = x && diaEnfant(x, 'actualMapping'); return m ? diaDecoderChemin(xtAttr(m, 'href')) : ''; };
    let perso = 0;
    xtParcourir(st, x => { if (x.tag === 'customFeatures') perso++; });
    const sc = (prefere && !prefere(s) ? 1000 : 0) + (bout('sourceNode') === mSource ? 0 : 100) + (bout('targetNode') === mCible ? 0 : 100) + perso + s.enfants.filter(c => c.tag === 'semanticElements').length;
    if (sc < score) { score = sc; meilleur = { dedge: s, edge }; }
  }
  return meilleur;
}

/**
 * Copie d'un style Sirius (lien, conteneur) pour un nouvel élément : nouveaux uid, personnalisations retirées (balises
 * customFeatures, attributs et valeurs multiples qu'elles nomment : Sirius les recalcule depuis la description à l'ouverture).
 * @param {object} st style (ownedStyle) de l'élément modèle
 * @returns {object} nœud neuf
 */
function diaCopierStyle(st) {
  const copier = n => {
    const perso = new Set(n.enfants.filter(c => c.tag === 'customFeatures').map(c => c.texte || ''));
    const x = xtNouveau(n.tag, n.attrs.filter(a => !perso.has(a.n)).map(a => [a.n, a.n === 'uid' ? diaNouvelUid() : a.v]));
    for (const c of n.enfants) if (c.tag !== 'customFeatures' && !perso.has(c.tag)) { const y = copier(c); y.parent = x; x.enfants.push(y); }
    if (!n.enfants.length && n.texte != null) x.texte = n.texte;
    return x;
  };
  return copier(st);
}

/**
 * Prépare la vue d'un échange fonctionnel dans un diagramme, sans rien modifier : DEdge Sirius (dans le diagramme) et
 * Edge GMF (dans la notation), écrits sur le modèle d'un lien de même mapping, et liens déclarés sur les nœuds des
 * extrémités (outgoingEdges, incomingEdges). Une extrémité est soit une forme existante, soit un port préparé
 * (diaPreparerPort, nœuds pas encore insérés).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} outil outil (STY_OUTILS_LIENS)
 * @param {{sirius:object, gmf:object, boite:{x:number,y:number,w:number,h:number}}} bs extrémité source
 * @param {{sirius:object, gmf:object, boite:{x:number,y:number,w:number,h:number}}} bc extrémité cible
 * @param {{id:string, nom:string, type:string, prefere?:function}} echange échange créé dans le modèle (type : nom court du type ;
 *   prefere : critère de choix du lien modèle)
 * @returns {{etapes:Array<{parent:object, noeud:object, index:number}>, attrs:Array, vue:string}}
 */
function diaPreparerLien(aird, rep, outil, bs, bc, echange) {
  const doc = aird.doc, mSource = diaDecoderChemin(xtAttr(diaEnfant(bs.sirius, 'actualMapping'), 'href')), mCible = diaDecoderChemin(xtAttr(diaEnfant(bc.sirius, 'actualMapping'), 'href'));
  const modele = diaModeleLien(aird, outil.m, mSource, mCible, echange.prefere);
  if (!modele) throw new Error(_L('Aucun lien de ce type dans le .aird à prendre pour modèle : tracez-en un premier dans Capella.'));
  const diagramme = rep.noeud;
  let notation = null;
  for (const a of diagramme.enfants) if (a.tag === 'ownedAnnotationEntries' && xtAttr(a, 'source') === 'GMF_DIAGRAMS') notation = diaEnfant(a, 'data');
  if (!notation) throw new Error(_L('Notation du diagramme introuvable dans le .aird.'));
  const cible = diaEnfant(modele.dedge, 'target');
  const ressource = (xtAttr(diaEnfant(bs.sirius, 'target'), 'href') || '').replace(/#.*$/, '');
  const typeXsi = (xtAttr(cible, 'xmi:type') || '').replace(/:.*$/, '') + ':' + echange.type, href = ressource + '#' + echange.id;
  const neuf = (tag, a, enfants) => { const n = xtNouveau(tag, a); for (const e of enfants || []) { e.parent = n; n.enfants.push(e); } return n; };
  // Lien Sirius : uid, nom, extrémités ; cible et élément sémantique ; style repris ; mapping
  const uid = diaNouvelUid(), st = diaCopierStyle(diaEnfant(modele.dedge, 'ownedStyle'));
  const am = diaEnfant(modele.dedge, 'actualMapping');
  const dedge = neuf('ownedDiagramElements', [['xmi:type', xtAttr(modele.dedge, 'xmi:type')], ['uid', uid], ...(echange.nom ? [['name', echange.nom]] : []), ['sourceNode', xtAttr(bs.sirius, 'uid')], ['targetNode', xtAttr(bc.sirius, 'uid')]], [
    xtNouveau('target', [['xmi:type', typeXsi], ['href', href]]),
    xtNouveau('semanticElements', [['xmi:type', typeXsi], ['href', href]]),
    st,
    xtNouveau('actualMapping', [['xmi:type', xtAttr(am, 'xmi:type')], ['href', xtAttr(am, 'href')]])
  ]);
  // Lien GMF : étiquettes (centre au-dessus, extrémités au-dessous), routage du style Sirius, police du modèle, trait direct
  // d'un centre à l'autre (ancres au centre : chaque point relatif à l'ancre source puis à l'ancre cible)
  const id = () => diaNouvelUid();
  const police = (modele.edge.enfants.find(c => c.tag === 'styles' && /FontStyle/.test(xtAttr(c, 'xmi:type') || '')) || { attrs: [] }).attrs.filter(a => !/^(xmi:type|xmi:id)$/.test(a.n)).map(a => [a.n, a.v]);
  const cs = [bs.boite.x + bs.boite.w / 2, bs.boite.y + bs.boite.h / 2], cc = [bc.boite.x + bc.boite.w / 2, bc.boite.y + bc.boite.h / 2];
  const dx = Math.round(cs[0] - cc[0]), dy = Math.round(cs[1] - cc[1]);
  const etiquette = (type, y) => neuf('children', [['xmi:type', 'notation:Node'], ['xmi:id', id()], ['type', type]], [xtNouveau('layoutConstraint', [['xmi:type', 'notation:Bounds'], ['xmi:id', id()], ['y', String(y)]])]);
  // Étiquettes du lien modèle (types GMF), à leur place par défaut : centre au-dessus, extrémités au-dessous
  const etiquettes = modele.edge.enfants.filter(c => c.tag === 'children').map(c => xtAttr(c, 'type'));
  const edge = neuf('edges', [['xmi:type', 'notation:Edge'], ['xmi:id', id()], ['type', xtAttr(modele.edge, 'type') || '4001'], ['element', uid], ['source', xtAttr(bs.gmf, 'xmi:id')], ['target', xtAttr(bc.gmf, 'xmi:id')]], [
    ...(etiquettes.length ? etiquettes : ['6001', '6002', '6003']).map(t => etiquette(t, t === '6001' ? -10 : 10)),
    xtNouveau('styles', [['xmi:type', 'notation:ConnectorStyle'], ['xmi:id', id()], ...(xtAttr(st, 'routingStyle') === 'manhattan' ? [['routing', 'Rectilinear']] : [])]),
    xtNouveau('styles', [['xmi:type', 'notation:FontStyle'], ['xmi:id', id()], ...police]),
    xtNouveau('bendpoints', [['xmi:type', 'notation:RelativeBendpoints'], ['xmi:id', id()], ['points', diaFormatPoints([[0, 0, dx, dy], [-dx, -dy, 0, 0]])]]),
    xtNouveau('sourceAnchor', [['xmi:type', 'notation:IdentityAnchor'], ['xmi:id', id()], ['id', '(0.5,0.5)']]),
    xtNouveau('targetAnchor', [['xmi:type', 'notation:IdentityAnchor'], ['xmi:id', id()], ['id', '(0.5,0.5)']])
  ]);
  // Liens déclarés sur les nœuds des extrémités : attribut ajouté au nœud neuf, ou changement du nœud existant
  const attrs = [];
  const declarer = (n, nom) => {
    const avant = xtAttr(n, nom) ?? null, apres = (avant ? avant + ' ' : '') + uid;
    if (aird.parUid.get(xtAttr(n, 'uid')) === n) attrs.push({ el: n, n: nom, avant, apres, ordre: DIA_ORDRE_DNODE });
    else xtDefinirAttr({ parId: new Map() }, n, nom, apres, DIA_ORDRE_DNODE);   // nœud neuf, pas encore inséré
  };
  declarer(bs.sirius, 'outgoingEdges');
  declarer(bc.sirius, 'incomingEdges');
  const apres = (el, test) => { let i = -1; el.enfants.forEach((c, k) => { if (test(c)) i = k; }); return i + 1; };
  return {
    etapes: [{ parent: diagramme, noeud: dedge, index: apres(diagramme, c => c.tag === 'ownedDiagramElements') },
      { parent: notation, noeud: edge, index: apres(notation, c => c.tag === 'children' || c.tag === 'edges') }],
    attrs, vue: xtAttr(edge, 'xmi:id')
  };
}

/**
 * Prépare les vues d'un échange créé entre deux formes : vues des ports créés (FaServices.createViewPin,
 * CsServices.createViewOrGetPort : outil de port de la palette sur la forme, posé sur le bord tourné vers l'autre
 * extrémité), puis vue du lien (sur le modèle d'un lien de même mapping, de préférence d'un échange du même genre).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} outil outil de lien (STY_OUTILS_LIENS)
 * @param {object} fs forme source
 * @param {object} fc forme cible
 * @param {{source?:{id:string,nom:string,attrs:Array,type:string}, cible?:{id:string,nom:string,attrs:Array,type:string}}} ports ports créés
 * @param {{id:string, nom:string, type:string, attrs:Array}} echange échange créé (type court, attributs du nœud du modèle)
 * @param {object} doc modèle
 * @param {string} uriFa espace de noms du paquetage fa du modèle
 * @returns {{etapes:Array, attrs:Array, vue:string, vuesPorts:string[]}}
 */
function diaPreparerEchange(aird, rep, outil, fs, fc, ports, echange, doc, uriFa) {
  const etapes = [], attrs = [], vuesPorts = [];
  const centre = f => [f.x + f.w / 2, f.y + f.h / 2];
  const bout = (f, port, autre) => {
    if (!port) return { sirius: f.sirius || aird.parUid.get(f.uid), gmf: f.gmf || aird.parVue.get(f.vue), boite: f };
    const o = diaOutilsPorts(aird, rep, f, doc).find(x => x.outil.t === port.type);
    if (!o) throw new Error(_L('Ce diagramme ne permet pas d\'ajouter le port nécessaire sur cet élément.'));
    const r = diaPreparerPort(aird, rep, f, o.outil, port, diaBordVers(f, centre(autre)), uriFa);
    etapes.push(...r.etapes);
    for (const a of r.attrs) if (!attrs.some(x => x.el === a.el && x.n === a.n)) attrs.push(a);
    vuesPorts.push(r.vue);
    return r;
  };
  const bs = bout(fs, ports.source, fc), bc = bout(fc, ports.cible, fs);
  // Lien modèle préféré : échange du même genre (kind), qui a le même style conditionnel
  const genre = (echange.attrs.find(a => a.n === 'kind') || {}).v;
  const prefere = genre ? s => { const el = doc.parId.get(diaHrefId(xtAttr(diaEnfant(s, 'target'), 'href'))); return !!el && xtAttr(el, 'kind') === genre; } : null;
  const lien = diaPreparerLien(aird, rep, outil, bs, bc, { id: echange.id, nom: echange.nom, type: echange.type, prefere });
  return { etapes: [...etapes, ...lien.etapes], attrs: [...attrs, ...lien.attrs], vue: lien.vue, vuesPorts };
}

/* ─────────────────────────────── Lien vers un nouvel élément (E8, palier 3) ─────────────────────────────── */
/* Outils « fonction » des palettes « Data Flow » et « composant » des palettes LAB / PAB (STY_OUTILS_CONTENEURS) : pendant le
   tracé d'un lien, un clic sur le fond du diagramme ou dans un conteneur crée l'élément cible (FaServices.createFunction ;
   CsServices.createComponent et sa Part) et sa vue, puis le lien. La vue (DNodeContainer et Node GMF) est écrite sur le
   modèle d'un élément de même mapping, de même style et de même niveau du .aird, sans ses enfants ni ses personnalisations. */

/**
 * Prédicats des styles conditionnels des mappings créés, transcrits des services Java et de l'AQL de Capella :
 * FaServices.isDuplicateFunction… (genre de la fonction), isAllocatedInActor (fonction allouée à un acteur),
 * isNotLeafAndisAllLeavesFunctionActorAllocated (fonction non feuille dont toutes les feuilles sont allouées à des acteurs) ;
 * composant acteur (getComponentType().isActor()), nature d'un composant physique ; acteur humain ; élément du conteneur
 * (aql:self = container : l'élément cible du diagramme contextuel). Élément : { kind, feuille, acteur, feuillesActeurs,
 * nature, humain, estConteneur }.
 */
const DIA_PREDICATS_CONTENEURS = {
  'service:isDuplicateFunction()': f => f.kind === 'DUPLICATE',
  'service:isGatherFunction()': f => f.kind === 'GATHER',
  'service:isRouteFunction()': f => f.kind === 'ROUTE',
  'service:isSelectFunction()': f => f.kind === 'SELECT',
  'service:isSplitFunction()': f => f.kind === 'SPLIT',
  'service:isAllocatedInActor()': f => f.acteur,
  'service:isNotLeafAndisAllLeavesFunctionActorAllocated()': f => !f.feuille && f.feuillesActeurs,
  'service:isNotLeaf()': f => !f.feuille,
  'aql:self.human = true': f => !!f.humain,
  'aql:self.human = false': f => !f.humain,
  'aql:self = container': f => !!f.estConteneur,
  'aql:(self.getComponentType()->filter(cs::Component)->select(c | c.isActor())->size() > 0)': f => f.acteur,
  'aql:(self.getComponentType().nature = pa::PhysicalComponentNature::BEHAVIOR)': f => f.nature === 'BEHAVIOR',
  'aql:(self.getComponentType().nature = pa::PhysicalComponentNature::NODE)': f => f.nature === 'NODE'
};

/**
 * Élément créé par un outil, pour les prédicats des styles : fonction de genre FUNCTION, feuille (et, sauf l'outil des
 * architectures, allouée à aucun composant ; isAllocatedInActor n'est pas employé par les mappings de ces outils-là) ;
 * composant non acteur, de la nature posée par l'outil.
 * @param {object} o outil (STY_OUTILS_CONTENEURS)
 * @returns {object}
 */
function diaElementNeuf(o) {
  return o.g === 'fonction' || o.g === 'allouee' ? { kind: 'FUNCTION', feuille: true, acteur: false, feuillesActeurs: false } : { acteur: false, nature: o.n || null };
}

/**
 * Style que Sirius donne à l'élément créé par un outil : premier style conditionnel dont le prédicat est vrai, sinon le style
 * principal.
 * @param {object} o outil (STY_OUTILS_CONTENEURS)
 * @returns {string|null} chemin de la description du style (décodé), null si un prédicat n'est pas transcrit
 */
function diaStyleNeuf(o) {
  const el = diaElementNeuf(o), m = diaDecoderChemin(o.m);
  for (let i = 0; i < o.q.length; i++) {
    const p = DIA_PREDICATS_CONTENEURS[o.q[i]];
    if (!p) return null;
    if (p(el)) return m + '/@conditionnalStyles.' + i + '/@style';
  }
  return m + '/@style';
}

/**
 * ComponentExt.canCreateABComponent : un composant peut être créé dans l'élément (une Part : dans son type). Composant : ni
 * humain, ni composant système (SystemComponent) ; paquetage : celui de son composant englobant ; paquetage racine de
 * composants système, logiques ou physiques : seulement s'il ne contient encore aucun composant non acteur.
 * @param {object} doc modèle
 * @param {object|null} x élément
 * @returns {boolean}
 */
function diaPeutCreerComposant(doc, x) {
  if (REG_H.est(x, 'Part')) x = diaReference(doc, x, 'abstractType');
  if (REG_H.est(x, 'Component')) return xtAttr(x, 'human') !== 'true' && !REG_H.est(x, 'SystemComponent');
  if (!REG_H.est(x, 'ComponentPkg')) return false;
  let parent = null;
  for (let p = x.parent; p && !REG_H.est(p, 'BlockArchitecture'); p = p.parent) if (REG_H.est(p, 'Component')) { parent = p; break; }
  if (parent) return diaPeutCreerComposant(doc, parent);
  if (/^(SystemComponentPkg|LogicalComponentPkg|PhysicalComponentPkg)$/.test(modType(x))) {
    let racine = x;
    while (racine.parent && !REG_H.est(racine.parent, 'BlockArchitecture')) racine = racine.parent;
    if (REG_H.est(racine, 'ComponentPkg') && racine.enfants.some(c => /^owned(SystemComponents|LogicalComponents|PhysicalComponents)$/.test(c.tag) && xtAttr(c, 'actor') !== 'true')) return false;
  }
  return true;
}

/**
 * CsServices.getComponentType (d'un élément) : composant lui-même, composant d'un port, type d'une Part, paquetage de composants.
 * @param {object} doc modèle
 * @param {object|null} x élément
 * @returns {object|null}
 */
function diaTypeOuPaquetage(doc, x) {
  if (REG_H.est(x, 'ComponentPkg')) return x;
  if (REG_H.est(x, 'Port')) return x.parent || null;
  return REG_H.est(x, 'Part') ? diaReference(doc, x, 'abstractType') : REG_H.est(x, 'Component') ? x : null;
}

/**
 * CsServices.getABTarget : élément où créer un composant. Vue d'un élément : sa cible. Fond du diagramme : si la cible du
 * diagramme y est dessinée (elle-même ou une Part qu'elle type, avec le mapping de l'outil), son conteneur sémantique
 * (getSemanticParentContainer : premier ancêtre où un composant peut être créé, ou l'architecture) ; sinon la cible si un
 * composant peut y être créé ; sinon ce conteneur, ou le système du niveau quand c'est l'architecture et qu'il l'accepte.
 * @param {object} rep représentation
 * @param {object} o outil (mapping du composant)
 * @param {object|null} fp forme visée, null pour le fond
 * @param {object} doc modèle
 * @returns {object|null}
 */
function diaCibleAB(rep, o, fp, doc) {
  if (fp) return doc.parId.get(fp.semId) || null;
  const t = doc.parId.get(rep.cibleId) || null;
  if (!t) return null;
  const parentSemantique = () => { for (let p = t.parent; p; p = p.parent) if (REG_H.est(p, 'BlockArchitecture') || diaPeutCreerComposant(doc, p)) return p; return null; };
  const voulu = diaDecoderChemin(o.m);
  const dessinee = rep.noeud.enfants.some(c => {
    if (c.tag !== 'ownedDiagramElements' || diaDecoderChemin(xtAttr(diaEnfant(c, 'actualMapping') || { attrs: [] }, 'href')) !== voulu) return false;
    const x = doc.parId.get(diaHrefId(xtAttr(diaEnfant(c, 'target') || { attrs: [] }, 'href')));
    return x === t || (REG_H.est(x, 'Part') && diaReference(doc, x, 'abstractType') === t);
  });
  if (dessinee) return parentSemantique();
  if (diaPeutCreerComposant(doc, t)) return t;
  const parent = parentSemantique();
  if (REG_H.est(parent, 'BlockArchitecture') && diaPeutCreerComposant(doc, REG_H.systeme(parent))) return REG_H.systeme(parent);
  return parent;
}

/**
 * Préconditions des outils de création (fonctions, composants) et de leurs mappings. Contexte : { doc, rep, o (outil),
 * fp (forme visée, null pour le fond), cible (élément de la vue visée, ou cible du diagramme) }.
 * - DFServices.isValidCreationDFFunction : une capacité, ou une fonction qui n'est pas une fonction de contrôle
 *   (FunctionExt.isControlNode : genre autre que FUNCTION) ;
 * - ABServices.isValidCreationABComponent(getABTarget) : diaPeutCreerComposant(diaCibleAB) ;
 * - ABServices.isValidCreationABBehaviorPC / isValidCreationABNodePC : de plus, le composant de la vue visée
 *   (getComponentType(containerView)) n'est pas un composant physique nœud (resp. de comportement) ;
 * - fonction allouée (SAB, LAB, PAB) : l'élément visé désigne un composant (getComponentType), la vue est un conteneur ; en
 *   PAB, pas un nœud (PhysicalServices.isNode) sauf acteur ; CapellaServices.isAllocatedFunction(fonction, conteneur, vue) :
 *   vraie pour la fonction neuve, allouée au composant de la vue, si la vue est un conteneur.
 */
const DIA_PRECONDITIONS_CONTENEURS = {
  '': () => true,
  'aql:containerView.isValidCreationDFFunction()': c => REG_H.est(c.cible, 'AbstractCapability')
    || (REG_H.est(c.cible, 'AbstractFunction') && (xtAttr(c.cible, 'kind') || 'FUNCTION') === 'FUNCTION'),
  'aql:containerView.getABTarget().isValidCreationABComponent()': c => diaPeutCreerComposant(c.doc, diaCibleAB(c.rep, c.o, c.fp, c.doc)),
  'aql:containerView.isValidCreationABBehaviorPC()': c => diaPeutCreerComposant(c.doc, diaCibleAB(c.rep, c.o, c.fp, c.doc))
    && xtAttr(diaTypeOuPaquetage(c.doc, c.cible) || { attrs: [] }, 'nature') !== 'NODE',
  'aql:containerView.isValidCreationABNodePC()': c => diaPeutCreerComposant(c.doc, diaCibleAB(c.rep, c.o, c.fp, c.doc))
    && xtAttr(diaTypeOuPaquetage(c.doc, c.cible) || { attrs: [] }, 'nature') !== 'BEHAVIOR',
  'aql:self.getComponentType().oclIsKindOf(cs::Component)': c => REG_H.est(diaTypeOuPaquetage(c.doc, c.cible), 'Component'),
  'aql:self.getComponentType().oclIsKindOf(cs::Component) and containerView->filter(diagram::DNodeContainer)->size() != 0':
    c => REG_H.est(diaTypeOuPaquetage(c.doc, c.cible), 'Component') && !!c.fp && c.fp.genre === 'conteneur',
  'aql:(not self.isNode() or self.isActor()) and self.getComponentType().oclIsKindOf(cs::Component) and containerView->filter(diagram::DNodeContainer)->size() != 0': c => {
    const t = diaTypeOuPaquetage(c.doc, c.cible);
    return REG_H.est(t, 'Component') && (xtAttr(t, 'nature') !== 'NODE' || xtAttr(t, 'actor') === 'true') && !!c.fp && c.fp.genre === 'conteneur';
  },
  'service:isAllocatedFunction(container, containerView)': c => !!c.fp && c.fp.genre === 'conteneur'
};

/**
 * Outils de création proposés à un endroit (le fond du diagramme, ou un conteneur qui contiendra l'élément) : outils de la
 * palette du diagramme dont le mapping est permis à cet endroit, préconditions vraies, style de l'élément neuf transcrit,
 * avec le plan du modèle — fonction : DFServices.getDFTarget puis FaServices.createFunction (regPlanFonction) ; un diagramme
 * dont la cible est une capacité est refusé (FaServices.allocateToCapability, implication dans la capacité : non reproduit) ;
 * composant : getComponentType(getABTarget) puis CsServices.createComponent et sa Part (regPlanComposant).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object|null} fp forme qui contiendra l'élément (conteneur), null pour le fond du diagramme
 * @param {object} doc modèle
 * @returns {Array<{outil:object, conteneur:object, regle:object, typeCourt:string}>}
 */
function diaOutilsConteneurs(aird, rep, fp, doc) {
  if (!diaModifiable(rep) || (fp && (fp.genre !== 'conteneur' || fp.replie || fp.pile))) return [];
  const cibleDiagramme = doc.parId.get(rep.cibleId) || null;
  if (!cibleDiagramme) return [];
  const cible = fp ? doc.parId.get(fp.semId) || null : cibleDiagramme, mappingParent = fp ? diaMappingForme(aird, fp) : '', res = [];
  for (const o of STY_OUTILS_CONTENEURS) {
    if (o.g === 'allouee' || diaRepresentationLien(o) !== rep.description || (fp ? !o.p.includes(mappingParent) : !o.haut) || !cible || !diaStyleNeuf(o)) continue;
    const ctx = { doc, rep, o, fp, cible }, pre = DIA_PRECONDITIONS_CONTENEURS[o.pre], mpre = DIA_PRECONDITIONS_CONTENEURS[o.mpre];
    if (!pre || !mpre || !pre(ctx) || !mpre(ctx)) continue;
    let plan = null;
    if (o.g === 'fonction') {
      if (REG_H.est(cibleDiagramme, 'AbstractCapability')) continue;
      // DFServices.getDFTarget : sur le fond, la cible du diagramme, ou sa fonction englobante si elle y est dessinée
      let t = cible;
      if (!fp) {
        const voulu = diaDecoderChemin(o.m);
        const dessinee = rep.noeud.enfants.some(c => c.tag === 'ownedDiagramElements' && diaHrefId(xtAttr(diaEnfant(c, 'target') || { attrs: [] }, 'href')) === rep.cibleId
          && diaDecoderChemin(xtAttr(diaEnfant(c, 'actualMapping') || { attrs: [] }, 'href')) === voulu);
        if (dessinee) t = cible.parent;
      }
      plan = t && regPlanFonction(doc, t);
    } else if (o.g === 'composant') plan = regPlanComposant(doc, diaTypeOuPaquetage(doc, diaCibleAB(rep, o, fp, doc)), o.n);
    if (plan) res.push(Object.assign({ outil: o }, plan));
  }
  return res;
}

/**
 * Éléments du modèle préparés pour un plan de création (pas encore insérés, posés sous leur futur parent) : l'élément, et
 * pour un composant sa Part, qui est alors la cible du lien (comme la vue, qui désigne la Part).
 * @param {object} plan plan (diaOutilsConteneurs)
 * @param {string} nom nom de l'élément
 * @returns {{noeud:object, part:(object|null), cible:object}}
 */
function diaNoeudsNeufs(plan, nom) {
  const { noeud, part } = regNoeuds(plan.regle, nom);
  noeud.parent = plan.conteneur;
  if (part) { part.tag = regBalisePart(plan.conteneur); part.parent = plan.conteneur; }
  return { noeud, part, cible: part || noeud };
}

/**
 * Plan de l'élément à créer pour un lien tracé depuis une forme vers un endroit (fond du diagramme ou conteneur) : premier
 * outil de création (diaOutilsConteneurs) dont le mapping est permis en cible du lien et pour lequel les préconditions de
 * l'outil de lien et de son mapping sont vraies sur l'élément à venir (éléments et vue posés à leur place, non insérés).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} o outil de lien (STY_OUTILS_LIENS)
 * @param {object} fs forme source
 * @param {object|null} fp forme qui contiendra l'élément, null pour le fond
 * @param {object} doc modèle
 * @returns {object|null} plan (diaOutilsConteneurs), null si impossible
 */
function diaLienVersNouveau(aird, rep, o, fs, fp, doc) {
  const source = doc.parId.get(fs.semId), vueSource = aird.parUid.get(fs.uid), parentVue = fp ? aird.parUid.get(fp.uid) : rep.noeud;
  if (!source || !vueSource || !parentVue) return null;
  for (const plan of diaOutilsConteneurs(aird, rep, fp, doc)) {
    if (!o.tgt.includes(diaDecoderChemin(plan.outil.m))) continue;
    const n = diaNoeudsNeufs(plan, '?'), vueCible = xtNouveau('ownedDiagramElements', []);
    vueCible.parent = parentVue;
    const c = { doc, source, cible: n.cible, vueSource, vueCible };
    const pre = DIA_PRECONDITIONS_LIENS[o.pre], mpre = DIA_PRECONDITIONS_LIENS[o.mpre];
    if (pre && mpre && regAvecProvisoires(doc, [n.noeud, ...(n.part ? [n.part] : [])], () => pre(c) && mpre(c))) return plan;
  }
  return null;
}

/**
 * Éléments écrits par Sirius à reprendre comme modèles de vue (DNodeContainer ; DNode pour une fonction allouée), avec le
 * moins de personnalisations : nœud Sirius de même
 * mapping, même style, mêmes types de cible et d'éléments sémantiques (de préférence de même niveau) ; nœud GMF d'un élément
 * de même mapping et de même niveau (premier niveau du diagramme ou compartiment d'un conteneur : les types GMF diffèrent),
 * celui du nœud Sirius s'il convient.
 * @param {object} aird résultat de diaLire
 * @param {string} mapping chemin du mapping (tel qu'écrit dans l'outil)
 * @param {boolean} haut vue au premier niveau du diagramme
 * @param {string|null} style chemin (décodé) de la description du style ; null : style d'une vue du même élément (opts.cibleId)
 * @param {string[]} types types courts de la cible puis des éléments sémantiques
 * @param {{noeud?:boolean, cibleId?:string}} [opts] noeud : DNode (sinon selon l'outil) ; cibleId : élément dessiné, dont une
 *   vue de même mapping est préférée (même style par construction)
 * @returns {{sirius:object, gmf:object, memeElement:boolean}|null}
 */
function diaModeleConteneur(aird, mapping, haut, style, types, opts) {
  const o = opts || {};
  const noeud = o.noeud ?? STY_OUTILS_CONTENEURS.some(x => x.m === mapping && x.g === 'allouee');
  const voulu = diaDecoderChemin(mapping), parGmf = new Map(), court = x => (xtAttr(x, 'xmi:type') || '').replace(/^.*:/, '');
  for (const v of aird.parVue.values()) if (v.tag === 'children' && xtAttr(v, 'element')) parGmf.set(xtAttr(v, 'element'), v);
  let sirius = null, gmfSirius = null, score = Infinity, gmf = null, scoreGmf = Infinity;
  for (const s of aird.parUid.values()) {
    if (s.tag !== 'ownedDiagramElements' || !(noeud ? /:DNode$/ : /DNodeContainer/).test(xtAttr(s, 'xmi:type') || '')) continue;
    const am = diaEnfant(s, 'actualMapping'), st = diaEnfant(s, 'ownedStyle'), cible = diaEnfant(s, 'target'), g = parGmf.get(xtAttr(s, 'uid'));
    if (!am || !st || !cible || !g || diaDecoderChemin(xtAttr(am, 'href')) !== voulu) continue;
    const niveau = (xtAttr(g.parent, 'xmi:type') === 'notation:Diagram') === haut;
    let perso = 0;
    xtParcourir(st, x => { if (x.tag === 'customFeatures') perso++; });
    const base = perso * 10 + s.enfants.filter(c => c.tag === 'ownedDiagramElements' || c.tag === 'ownedBorderedNodes').length;
    if (niveau && base < scoreGmf) { scoreGmf = base; gmf = g; }
    const d = xtAttr(st, 'description') ? xtAttr(st, 'description') : xtAttr(diaEnfant(st, 'description') || { attrs: [] }, 'href');
    const t = [cible, ...s.enfants.filter(c => c.tag === 'semanticElements')].map(court);
    const meme = !!o.cibleId && diaHrefId(xtAttr(cible, 'href')) === o.cibleId;
    if ((style === null ? !meme : diaDecoderChemin(d) !== style) || t.join(' ') !== types.join(' ')) continue;
    const sc = base + (niveau ? 0 : 1000) - (meme ? 100000 : 0);
    if (sc < score) { score = sc; sirius = s; gmfSirius = niveau ? g : null; }
  }
  const g = gmfSirius || gmf;
  return sirius && g ? { sirius, gmf: g, memeElement: !!o.cibleId && diaHrefId(xtAttr(diaEnfant(sirius, 'target'), 'href')) === o.cibleId } : null;
}

/**
 * Prépare la vue d'un élément créé (fonction : CreateViewAction ; composant : vue de sa Part que le rafraîchissement de
 * Sirius ajoute au conteneur visé), sans rien modifier : DNodeContainer Sirius et Node GMF écrits sur le modèle d'un
 * élément de même mapping (diaModeleConteneur) : attributs, style (sans personnalisations), mapping ; étiquette et
 * compartiment GMF, sans les vues contenues. L'élément est centré sur le point visé, à une taille qui loge son nom.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} outil outil (STY_OUTILS_CONTENEURS)
 * @param {object|null} fp forme qui contient la vue, null pour le fond du diagramme
 * @param {{nom:string, cible:{id:string, type:string}, semantiques:Array<{id:string, type:string}>}} el élément dessiné :
 *   nom, cible de la vue et éléments sémantiques (types courts)
 * @param {number[]} point centre visé [x, y] (coordonnées du diagramme)
 * @param {{style?:(string|null), noeud?:boolean}} [opts] style imposé (null : celui d'une vue du même élément), DNode
 * @returns {{etapes:Array<{parent:object, noeud:object, index:number}>, attrs:Array, vue:string,
 *   forme:{sirius:object, gmf:object, genre:string, x:number, y:number, w:number, h:number}}} nœuds à insérer, vue GMF, forme
 *   de l'élément (pour y créer des ports et y accrocher un lien : diaPreparerEchange)
 */
function diaPreparerConteneur(aird, rep, outil, fp, el, point, opts) {
  const o = opts || {};
  const modele = diaModeleConteneur(aird, outil.m, !fp, o.style !== undefined ? o.style : diaStyleNeuf(outil), [el.cible.type, ...el.semantiques.map(x => x.type)], { noeud: o.noeud, cibleId: el.cible.id });
  if (!modele) throw new Error(_L('Aucun élément de ce type et de ce niveau dans le .aird à prendre pour modèle : créez-en un premier dans Capella.'));
  let notation = null;
  for (const a of rep.noeud.enfants) if (a.tag === 'ownedAnnotationEntries' && xtAttr(a, 'source') === 'GMF_DIAGRAMS') notation = diaEnfant(a, 'data');
  const parentSirius = fp ? aird.parUid.get(fp.uid) : rep.noeud;
  const vueParent = fp ? aird.parVue.get(fp.vue) : notation;
  const compartiment = fp ? vueParent && vueParent.enfants.find(c => c.tag === 'children' && /^7\d{3}$/.test(xtAttr(c, 'type') || '') && !xtAttr(c, 'element')) : notation;
  if (!parentSirius || !compartiment) throw new Error(_L('Forme introuvable dans le .aird.'));
  const neuf = (tag, a, enfants) => { const n = xtNouveau(tag, a); for (const e of enfants || []) { e.parent = n; n.enfants.push(e); } return n; };
  // Références : types et ressource repris du modèle (mêmes espaces de noms), identifiants des éléments créés
  const refsModele = [diaEnfant(modele.sirius, 'target'), ...modele.sirius.enfants.filter(c => c.tag === 'semanticElements')];
  const ref = (tag, x, i) => xtNouveau(tag, [['xmi:type', xtAttr(refsModele[i], 'xmi:type')], ['href', (xtAttr(refsModele[i], 'href') || '').replace(/#.*$/, '') + '#' + x.id]]);
  // Nœud Sirius : attributs du modèle (nouvel uid, nom ; sans liens), cible, éléments sémantiques, style, mapping
  const uid = diaNouvelUid(), am = diaEnfant(modele.sirius, 'actualMapping');
  const attrs = modele.sirius.attrs.filter(a => !/^(outgoingEdges|incomingEdges)$/.test(a.n)).map(a => [a.n, a.n === 'uid' ? uid : a.n === 'name' ? el.nom : a.v]);
  const sirius = neuf('ownedDiagramElements', attrs, [
    ref('target', el.cible, 0),
    ...el.semantiques.map((x, i) => ref('semanticElements', x, i + 1)),
    diaCopierStyle(diaEnfant(modele.sirius, 'ownedStyle')),
    xtNouveau('actualMapping', [['xmi:type', xtAttr(am, 'xmi:type')], ['href', xtAttr(am, 'href')]])
  ]);
  // Nœud de style GMF d'un DNode : il désigne le style de l'élément Sirius du modèle GMF (qui peut différer du modèle Sirius)
  const siriusGmf = aird.parUid.get(xtAttr(modele.gmf, 'element'));
  const styleModele = xtAttr(diaEnfant(siriusGmf || modele.sirius, 'ownedStyle') || { attrs: [] }, 'uid'), styleNeuf = xtAttr(diaEnfant(sirius, 'ownedStyle'), 'uid');
  const noeud = !/DNodeContainer/.test(xtAttr(sirius, 'xmi:type') || '');
  // Taille : celle d'une autre vue du même élément (nœud), sinon de quoi loger le nom ; position : centrée sur le point visé,
  // relative à l'origine du compartiment parent
  const police = diaPolice(modele.gmf, diaEnfant(modele.sirius, 'ownedStyle')).taille;
  const vueMeme = modele.memeElement ? [...aird.parVue.values()].find(v => v.tag === 'children' && xtAttr(v, 'element') === xtAttr(modele.sirius, 'uid')) : null;
  const bm = vueMeme ? diaBornes(vueMeme) : null;
  const w = noeud && bm && bm.w > 0 ? bm.w : Math.max(noeud ? 80 : 120, Math.round(diaLargeurTexte(el.nom, police) + (noeud ? 20 : 40)));
  const h = noeud && bm && bm.h > 0 ? bm.h : noeud ? 40 : 60;
  // Dans un conteneur : la vue reste dedans (sous son titre) quand elle y tient
  let x = Math.round(point[0] - w / 2), y = Math.round(point[1] - h / 2);
  if (fp) {
    const x0 = fp.x + DIA_COMPARTIMENT.x + 4, y0 = fp.y + 24, x1 = fp.x + fp.w - 4 - w, y1 = fp.y + fp.h - 4 - h;
    if (x1 >= x0) x = Math.min(Math.max(x, x0), x1);
    if (y1 >= y0) y = Math.min(Math.max(y, y0), y1);
  }
  const ox = fp ? fp.x + DIA_COMPARTIMENT.x : 0, oy = fp ? fp.y + DIA_COMPARTIMENT.y : 0;
  // Nœud GMF : structure du modèle sans les vues contenues (enfants qui désignent un élément Sirius, sauf le nœud de style
  // d'un DNode, qui désigne alors le style neuf), nouveaux identifiants
  const copier = n => {
    const a = n.attrs.map(t => [t.n, t.n === 'xmi:id' ? diaNouvelUid() : t.v]);
    if (n === modele.gmf) for (const t of a) if (t[0] === 'element') t[1] = uid;
    if (n !== modele.gmf && xtAttr(n, 'element') === styleModele) for (const t of a) if (t[0] === 'element') t[1] = styleNeuf;
    if (n.tag === 'layoutConstraint' && n.parent === modele.gmf) {
      const garder = a.filter(t => !/^(x|y|width|height)$/.test(t[0]));
      return xtNouveau(n.tag, [...garder, ...(x - ox ? [['x', String(x - ox)]] : []), ...(y - oy ? [['y', String(y - oy)]] : []), ['width', String(w)], ['height', String(h)]]);
    }
    const c = xtNouveau(n.tag, a);
    for (const e of n.enfants) if (!(e.tag === 'children' && xtAttr(e, 'element') && xtAttr(e, 'element') !== styleModele)) { const y2 = copier(e); y2.parent = c; c.enfants.push(y2); }
    if (!n.enfants.length && n.texte != null) c.texte = n.texte;
    return c;
  };
  const gmf = copier(modele.gmf);
  // Places : après les vues sœurs ; sinon après les annotations (diagramme) ou le mapping (conteneur) ; GMF : après les
  // enfants du compartiment (ou du diagramme), sinon en tête
  const apres = (e, test) => { let i = -1; e.enfants.forEach((c, k) => { if (test(c)) i = k; }); return i + 1; };
  const iSirius = parentSirius.enfants.some(c => c.tag === 'ownedDiagramElements') ? apres(parentSirius, c => c.tag === 'ownedDiagramElements')
    : apres(parentSirius, c => c.tag === (fp ? 'actualMapping' : 'ownedAnnotationEntries'));
  const iGmf = apres(compartiment, c => c.tag === 'children');
  return {
    etapes: [{ parent: parentSirius, noeud: sirius, index: iSirius }, { parent: compartiment, noeud: gmf, index: iGmf }],
    attrs: [], vue: xtAttr(gmf, 'xmi:id'), forme: { sirius, gmf, genre: noeud ? 'noeud' : 'conteneur', x, y, w, h }
  };
}

/**
 * Prépare la vue d'une fonction allouée créée dans un composant (CreateViewAction : DNode dans la vue du composant), centrée
 * sur le point visé.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} plan plan (diaOutilsContenus)
 * @param {object} f forme du composant
 * @param {{id:string, nom:string}} fonction fonction créée
 * @param {number[]} point centre visé
 * @returns {{etapes:Array, attrs:Array, vue:string, forme:object}}
 */
function diaPreparerFonctionAllouee(aird, rep, plan, f, fonction, point) {
  const fn = { id: fonction.id, type: plan.typeCourt };
  return diaPreparerConteneur(aird, rep, plan.outil, f, { nom: fonction.nom, cible: fn, semantiques: [fn] }, point);
}

/**
 * Outils « function » des palettes d'architecture proposés sur une forme (SAB, LAB, PAB) : fonction créée dans la fonction
 * racine et allouée au composant de la forme, dessinée dedans. Mapping permis dans celui de la forme, préconditions, style
 * de la fonction neuve transcrit, plan du modèle (regPlanFonctionAllouee).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} f forme visée (conteneur d'un composant)
 * @param {object} doc modèle
 * @returns {Array<object>} plans (outil, conteneur, regle, typeCourt, allocation, composant)
 */
function diaOutilsContenus(aird, rep, f, doc) {
  if (!f || !diaModifiable(rep) || f.genre !== 'conteneur' || f.replie || f.pile) return [];
  const cible = doc.parId.get(f.semId) || null, mapping = diaMappingForme(aird, f), res = [];
  if (!cible) return res;
  for (const o of STY_OUTILS_CONTENEURS) {
    if (o.g !== 'allouee' || diaRepresentationLien(o) !== rep.description || !o.p.includes(mapping) || !diaStyleNeuf(o)) continue;
    const ctx = { doc, rep, o, fp: f, cible }, pre = DIA_PRECONDITIONS_CONTENEURS[o.pre], mpre = DIA_PRECONDITIONS_CONTENEURS[o.mpre];
    if (!pre || !mpre || !pre(ctx) || !mpre(ctx)) continue;
    const comp = diaTypeOuPaquetage(doc, cible), plan = regPlanFonctionAllouee(doc, comp);
    if (plan) res.push(Object.assign({ outil: o, composant: comp }, plan));
  }
  return res;
}

/**
 * Prépare la vue d'un élément créé par un outil de création (fonction, ou composant dessiné par sa Part), centrée sur le
 * point visé.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {{outil:object, fp:(object|null), point:number[], nom:string, typeCourt:string, noeud:object, part:(object|null)}} nouveau
 *   élément créé (voir diaPreparerEchangeNouveau)
 * @returns {{etapes:Array, attrs:Array, vue:string, forme:object}} forme.el : élément dessiné (la Part d'un composant)
 */
function diaPreparerNouveau(aird, rep, nouveau) {
  const elem = { id: xtAttr(nouveau.noeud, 'id'), type: nouveau.typeCourt }, part = nouveau.part && { id: xtAttr(nouveau.part, 'id'), type: 'Part' };
  const f = diaPreparerConteneur(aird, rep, nouveau.outil, nouveau.fp, { nom: nouveau.nom, cible: part || elem, semantiques: part ? [part, elem] : [elem] }, nouveau.point);
  f.forme.el = nouveau.part || nouveau.noeud;
  return f;
}

/**
 * Prépare les vues d'un lien tracé vers un élément créé avec lui : vue de l'élément (diaPreparerConteneur : la fonction, ou la
 * Part du composant avec le composant), puis vues des ports et du lien (diaPreparerEchange, l'élément neuf en cible).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} outil outil de lien (STY_OUTILS_LIENS)
 * @param {object} fs forme source
 * @param {{outil:object, fp:(object|null), point:number[], nom:string, typeCourt:string, noeud:object, part:(object|null)}} nouveau
 *   élément créé (outil de création, forme qui le contient, point visé, nom, type court, nœud du modèle, Part d'un composant)
 * @param {object} ports ports créés (voir diaPreparerEchange)
 * @param {object} echange échange créé (voir diaPreparerEchange)
 * @param {object} doc modèle
 * @param {string} uriFa espace de noms du paquetage fa du modèle
 * @returns {{etapes:Array, attrs:Array, vue:string, vueElement:string}}
 */
function diaPreparerEchangeNouveau(aird, rep, outil, fs, nouveau, ports, echange, doc, uriFa) {
  const f = diaPreparerNouveau(aird, rep, nouveau);
  const e = diaPreparerEchange(aird, rep, outil, fs, f.forme, ports, echange, doc, uriFa);
  return { etapes: [...f.etapes, ...e.etapes], attrs: [...f.attrs, ...e.attrs], vue: e.vue, vueElement: f.vue };
}

/* ─────────────────────────────── Ajouter un élément existant (E7) ─────────────────────────────── */
/* Outils de dépôt depuis l'arborescence (STY_OUTILS_DEPOTS) : l'élément glissé est dessiné dans le conteneur visé (ou sur le
   fond) avec le mapping de l'outil, sans changer le modèle. Ses ports et ses liens ne sont pas ajoutés : Capella les ajoute au
   rafraîchissement d'un diagramme synchronisé. */

/**
 * Couche d'un élément (architecture qui le contient) : OA, SA, LA, PA, EPBS, ou '' hors architecture.
 * @param {object} el élément
 * @returns {string}
 */
function diaCoucheDe(el) {
  const a = REG_H.est(el, 'BlockArchitecture') || REG_H.est(el, 'OperationalAnalysis') ? el : REG_H.conteneur(el, 'ModellingArchitecture') || REG_H.conteneur(el, 'BlockArchitecture');
  const t = a ? modType(a) : '';
  return { OperationalAnalysis: 'OA', SystemAnalysis: 'SA', LogicalArchitecture: 'LA', PhysicalArchitecture: 'PA', EPBSArchitecture: 'EPBS' }[t] || '';
}

/**
 * CapellaLayerCheckingExt.isElementFromCurrentOrUpperLayer : l'élément est de la couche courante ou d'une couche plus haute
 * (OA ⊂ SA ⊂ LA ⊂ PA ; EPBS à part).
 * @param {object} x élément à vérifier
 * @param {object} courant élément de la couche courante
 * @returns {boolean}
 */
function diaCoucheAdmise(x, courant) {
  const c = diaCoucheDe(courant), e = diaCoucheDe(x);
  if (c === 'OA') return e === 'OA';
  if (c === 'SA') return e === 'OA' || e === 'SA';
  if (c === 'LA') return e !== 'PA' && e !== 'EPBS';
  if (c === 'PA') return e !== 'EPBS';
  return c === 'EPBS' && e === 'EPBS';
}

/**
 * DragAndDropServices.canBeDropped (et, plus strict, aucune vue du même élément dans le diagramme) : élément de la couche
 * courante ou plus haute ; sur le fond, accepté ; dans un conteneur, l'élément doit être contenu (à toute profondeur) dans
 * l'élément du conteneur (CapellaServices.isChild).
 * @param {{doc:object, aird:object, rep:object, el:object, fp:(object|null), cibleVue:object}} c contexte
 * @param {object} [el] élément à vérifier (c.el par défaut)
 * @returns {boolean}
 */
function diaPeutDeposer(c, el) {
  const x = el || c.el, reps = c.aird.presences.get(modId(x));
  if (reps && reps.has(c.rep)) return false;
  if (!c.cibleVue || !diaCoucheAdmise(x, c.cibleVue)) return false;
  return !c.fp || (x !== c.cibleVue && diaEstAncetre(c.cibleVue, x));
}

/**
 * Préconditions des outils de dépôt et de leurs mappings, transcrites du Java et de l'AQL de Capella. Contexte : { doc, aird,
 * rep, el (élément déposé), fp (forme visée, null pour le fond), cibleVue (élément de la vue visée, ou cible du diagramme),
 * self (élément dessiné : précondition d'un mapping) }. isLibraryElementOf : faux (un seul modèle ouvert) ;
 * DragAndDropServices.partitionableElementCanBeDropped (entités) : pas déjà dessinée ; dans un conteneur, contenue dans
 * l'entité visée (Parts ancêtres) ; ComponentExt.isActor : composant acteur, ou Part typée par un acteur.
 */
const DIA_PRECONDITIONS_DEPOTS = (() => {
  const lib = ' and not element.isLibraryElementOf(newViewContainer)', depot = ' and element.canBeDropped(newViewContainer)' + lib;
  const acteur = (doc, x) => xtAttr(REG_H.est(x, 'Part') ? diaReference(doc, x, 'abstractType') || { attrs: [] } : x, 'actor') === 'true';
  const p = {
    '': () => true,
    ['aql:element.isActor()' + depot]: c => acteur(c.doc, c.el) && diaPeutDeposer(c),
    ['aql:element.oclIsKindOf(cs::Component) and element.isActor()' + depot]: c => REG_H.est(c.el, 'Component') && acteur(c.doc, c.el) && diaPeutDeposer(c),
    ['aql:element.oclIsKindOf(oa::Entity) and element.partitionableElementCanBeDropped(newViewContainer)' + lib]: c => REG_H.est(c.el, 'Entity') && diaPeutDeposer(c),
    ['aql:element.getComponentType().oclIsKindOf(cs::Component)' + depot]: c => REG_H.est(diaTypeComposant(c.doc, c.el), 'Component') && diaPeutDeposer(c),
    ['aql:element.getComponentType().oclIsKindOf(cs::Component) and element.getComponentType().isActor()' + depot]:
      c => REG_H.est(diaTypeComposant(c.doc, c.el), 'Component') && acteur(c.doc, diaTypeComposant(c.doc, c.el)) && diaPeutDeposer(c),
    'aql:self.isActor()': c => acteur(c.doc, c.self)
  };
  for (const t of ['fa::AbstractFunction', 'oa::OperationalActivity', 'oa::OperationalCapability', 'oa::Role', 'ctx::Capability', 'ctx::Mission', 'la::CapabilityRealization']) {
    p['aql:element.oclIsKindOf(' + t + ')' + depot] = c => REG_H.est(c.el, t.replace(/^.*::/, '')) && diaPeutDeposer(c);
  }
  return p;
})();

/**
 * Descripteur d'un élément existant pour les prédicats des styles (DIA_PREDICATS_CONTENEURS) : genre, feuille, allocation à
 * un acteur (fonction : composants qui l'allouent ; composant ou Part : acteur), feuilles toutes allouées à des acteurs,
 * nature, humain, élément du conteneur (aql:self = container).
 * @param {object} doc modèle
 * @param {object} el élément dessiné
 * @param {object|null} conteneur élément de la vue parente (ou cible du diagramme)
 * @returns {object}
 */
function diaDescripteur(doc, el, conteneur) {
  const type = REG_H.est(el, 'Part') ? diaReference(doc, el, 'abstractType') : el;
  const allouePar = f => {
    const id = '#' + modId(f), res = [];
    xtParcourir(doc.racine, x => { if (x.tag === 'ownedFunctionalAllocation' && xtAttr(x, 'targetElement') === id) res.push(x.parent); });
    return res;
  };
  const acteurF = f => allouePar(f).some(c => xtAttr(c, 'actor') === 'true');
  const sous = f => f.enfants.filter(x => x.tag === 'ownedFunctions');
  const feuilles = f => (sous(f).length ? sous(f).flatMap(feuilles) : [f]);
  const fonction = REG_H.est(el, 'AbstractFunction');
  return {
    kind: xtAttr(el, 'kind') || 'FUNCTION', feuille: fonction ? !sous(el).length : true,
    acteur: fonction ? acteurF(el) : xtAttr(type || { attrs: [] }, 'actor') === 'true',
    feuillesActeurs: fonction && sous(el).length ? feuilles(el).every(acteurF) : false,
    nature: xtAttr(type || { attrs: [] }, 'nature') || null, humain: xtAttr(type || { attrs: [] }, 'human') === 'true', estConteneur: !!conteneur && el === conteneur
  };
}

/**
 * Dépôt possible d'un élément de l'arborescence à un endroit du diagramme : premier outil de dépôt de la représentation qui
 * accepte cet endroit (fond, ou mapping du conteneur visé) et l'élément (précondition), puis premier mapping de l'outil qui
 * l'accepte (domainClass, précondition) ; style : premier style conditionnel vrai (prédicats transcrits), sinon celui d'une
 * autre vue du même élément. Genre « fonction » : refusé si la cible du diagramme n'est pas une fonction (implication dans la
 * capacité, non reproduite) ; « part » : un composant déposé est dessiné par sa première Part.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object|null} fp forme visée (conteneur), null pour le fond
 * @param {object} el élément déposé
 * @param {object} doc modèle
 * @returns {{outil:object, mapping:object, cible:object, semantiques:object[], style:(string|null)}|null}
 */
function diaDepot(aird, rep, fp, el, doc) {
  if (!el || !diaModifiable(rep) || (fp && (fp.genre !== 'conteneur' || fp.replie || fp.pile))) return null;
  const cibleDiagramme = doc.parId.get(rep.cibleId) || null, cibleVue = fp ? doc.parId.get(fp.semId) || null : cibleDiagramme;
  const mappingParent = fp ? diaMappingForme(aird, fp) : '';
  for (const o of STY_OUTILS_DEPOTS) {
    const plein = c => (c.startsWith('/@') ? o.r + c : c);       // chemins écrits sans la représentation
    if (o.r !== rep.description || (fp ? !o.conteneurs.some(c => plein(c) === mappingParent) : !o.diagramme)) continue;
    const c = { doc, aird, rep, el, fp, cibleVue }, pre = DIA_PRECONDITIONS_DEPOTS[o.pre];
    if (!pre || !pre(c)) continue;
    if (o.g === 'fonction' && !REG_H.est(cibleDiagramme, 'AbstractFunction')) continue;
    // Élément dessiné : la Part pour un composant (CreateView de sa première Part)
    const cible = o.g === 'part' && !REG_H.est(el, 'Part') ? regPartsDe(doc, el)[0] : el;
    if (!cible || (cible !== el && !diaPeutDeposer(c, cible))) continue;
    for (const cm of o.mappings) {
      const chemin = plein(cm), m = Object.assign({ m: chemin }, STY_MAPPINGS_DEPOTS[chemin]);
      if (!REG_H.est(cible, m.d.replace(/^.*(::|\.)/, ''))) continue;
      const mpre = DIA_PRECONDITIONS_DEPOTS[m.pre];
      if (!mpre || !mpre(Object.assign({ self: cible }, c))) continue;
      // Style : premier prédicat vrai ; un prédicat non transcrit : style d'une autre vue du même élément
      const d = diaDescripteur(doc, cible, cibleVue);
      let style = m.m + '/@style';
      for (let i = 0; i < m.q.length; i++) {
        const q = DIA_PREDICATS_CONTENEURS[m.q[i]];
        if (!q) { style = null; break; }
        if (q(d)) { style = m.m + '/@conditionnalStyles.' + i + '/@style'; break; }
      }
      const semantiques = REG_H.est(cible, 'Part') ? [cible, diaReference(doc, cible, 'abstractType')].filter(Boolean) : [cible];
      return { outil: o, mapping: m, cible, semantiques, style };
    }
  }
  return null;
}

/**
 * Prépare la vue d'un élément déposé (diaDepot), centrée sur le point visé ; une vue du même élément ailleurs donne sa taille.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {object} depot résultat de diaDepot
 * @param {object|null} fp forme qui contient la vue, null pour le fond
 * @param {number[]} point centre visé
 * @returns {{etapes:Array, attrs:Array, vue:string, forme:object}}
 */
function diaPreparerDepot(aird, rep, depot, fp, point) {
  const ref = x => ({ id: modId(x), type: modType(x) });
  return diaPreparerConteneur(aird, rep, { m: depot.mapping.m }, fp, { nom: xtAttr(depot.cible, 'name') || '', cible: ref(depot.cible), semantiques: depot.semantiques.map(ref) },
    point, { style: depot.style, noeud: depot.mapping.noeud });
}

/* ─────────────────────────────── Créer un diagramme (E7) ─────────────────────────────── */
/* Les outils de création de diagramme de Capella (DiagramCreationDescription) ne changent pas le modèle : le diagramme est créé
   vide, Sirius le remplit au premier rafraîchissement selon ses mappings. Arcature écrit la représentation vide (descripteur
   dans la vue du point de vue, DSemanticDiagram et sa notation GMF) sur le modèle d'un diagramme du même type du .aird :
   filtres et calques activés, préoccupation courante, le jeu le plus fréquent parmi ces diagrammes. */

/**
 * Évalue une précondition AQL de type de diagramme sur l'élément cible, pour la forme qu'emploient les descriptions de
 * Capella : « or », « and », « not », parenthèses, false, self.oclIsKindOf(ns::T), self.getComponentType().oclIsKindOf(ns::T),
 * self.eContainerOrSelf(cs::BlockArchitecture).oclIsKindOf(ns::T), self.isActor().
 * @param {string} expr expression (avec « aql: »), '' : vraie
 * @param {object} doc modèle
 * @param {object} el élément cible
 * @returns {boolean|null} null si l'expression n'est pas reconnue (parenthèses déséquilibrées, autre appel)
 */
function diaAqlCible(expr, doc, el) {
  if (!expr) return true;
  const src = expr.replace(/^aql:/, ''), jetons = src.match(/\(|\)|[^\s()]+(?:\([^()]*\))?(?:\.[A-Za-z]+\([^()]*\))*/g);
  if (!jetons || jetons.join('').replace(/\s/g, '') !== src.replace(/\s/g, '')) return null;
  let i = 0;
  const est = (x, t) => { try { return REG_H.est(x, t.replace(/^.*::/, '')); } catch (e) { return false; } };
  const atome = j => {
    let m;
    if (j === 'false') return false;
    if (j === 'true') return true;
    if ((m = j.match(/^self\.oclIsKindOf\(([\w:]+)\)$/))) return est(el, m[1]);
    if ((m = j.match(/^self\.getComponentType\(\)\.oclIsKindOf\(([\w:]+)\)$/))) return est(diaTypeOuPaquetage(doc, el), m[1]);
    if ((m = j.match(/^self\.eContainerOrSelf\(cs::BlockArchitecture\)\.oclIsKindOf\(([\w:]+)\)$/))) return est(REG_H.est(el, 'BlockArchitecture') ? el : REG_H.conteneur(el, 'BlockArchitecture'), m[1]);
    if (j === 'self.isActor()') return xtAttr(REG_H.est(el, 'Part') ? diaReference(doc, el, 'abstractType') || { attrs: [] } : el, 'actor') === 'true';
    throw new Error('?');
  };
  const primaire = () => {
    const j = jetons[i++];
    if (j === 'not') return !primaire();
    if (j === '(') { const v = ou(); if (jetons[i++] !== ')') throw new Error('?'); return v; }
    if (j == null || j === ')') throw new Error('?');
    return atome(j);
  };
  const et = () => { let v = primaire(); while (jetons[i] === 'and') { i++; const w = primaire(); v = v && w; } return v; };
  const ou = () => { let v = et(); while (jetons[i] === 'or') { i++; const w = et(); v = v || w; } return v; };
  try { const v = ou(); return i === jetons.length ? v : null; } catch (e) { return null; }
}

/**
 * Types de diagrammes que l'on peut créer sur un élément : description de Capella (STY_DIAGRAMMES) dont la domainClass
 * accepte l'élément, dont la précondition est vraie, au titre simple ('[SIGLE] ' + self.name), et dont un diagramme existe
 * dans le .aird pour servir de modèle.
 * @param {object} aird résultat de diaLire
 * @param {object} doc modèle
 * @param {object} el élément cible
 * @returns {Array<{type:object, nom:string, sigle:string, modele:object}>} modele : représentation à reprendre
 */
function diaTypesDiagrammes(aird, doc, el) {
  if (!aird || !el) return [];
  const res = [];
  for (const t of STY_DIAGRAMMES) {
    const titre = t.titre.match(/^aql:'(\[[^\]]+\]) ' \+ self\.name$/);
    let accepte = false;
    try { accepte = REG_H.est(el, t.d.replace(/^.*::/, '')); } catch (e) { accepte = false; }
    if (!titre || !accepte || diaAqlCible(t.pre, doc, el) !== true) continue;
    const modele = diaModeleDiagramme(aird, t.r);
    if (modele) res.push({ type: t, nom: titre[1] + ' ' + (xtAttr(el, 'name') || ''), sigle: titre[1].slice(1, -1), modele });
  }
  return res;
}

/**
 * Diagramme du .aird à reprendre pour un type : parmi les diagrammes de cette description, ceux dont les filtres, calques et
 * préoccupation activés forment le jeu le plus fréquent, et parmi eux celui qui a le moins d'éléments.
 * @param {object} aird résultat de diaLire
 * @param {string} description chemin décodé de la description
 * @returns {object|null} représentation
 */
function diaModeleDiagramme(aird, description) {
  const reps = aird.reps.filter(r => r.description === description && r.genre === 'diagramme' && r.noeud && aird.parUid.get(r.uid) && diaDescripteur_(aird, r));
  if (!reps.length) return null;
  const sig = r => r.noeud.enfants.filter(c => /^(activatedFilters|activatedLayers|currentConcern)$/.test(c.tag)).map(c => c.tag + diaDecoderChemin(xtAttr(c, 'href'))).sort().join('|');
  const nb = new Map();
  for (const r of reps) nb.set(sig(r), (nb.get(sig(r)) || 0) + 1);
  const taille = r => r.noeud.enfants.filter(c => c.tag === 'ownedDiagramElements').length;
  return reps.slice().sort((a, b) => (nb.get(sig(b)) - nb.get(sig(a))) || (taille(a) - taille(b)))[0];
}

/**
 * Descripteur (DRepresentationDescriptor) d'une représentation.
 * @param {object} aird résultat de diaLire
 * @param {object} r représentation
 * @returns {object|null}
 */
function diaDescripteur_(aird, r) {
  const d = aird.parUid.get(r.uid);
  return d && d.tag === 'ownedRepresentationDescriptors' ? d : null;
}

/**
 * Prépare un diagramme vide d'un type sur un élément, sans rien modifier : descripteur (dans la même vue que celui du
 * modèle : nom, repPath, changeId, description, cible), DSemanticDiagram (racine du .aird, après les autres) avec sa notation
 * GMF (sans formes ni liens) et, du modèle, la description, les filtres, calques et préoccupation activés, un nouvel
 * historique des variables de filtre ; synchronisé (valeur par défaut de Sirius).
 * @param {object} aird résultat de diaLire
 * @param {{type:object, nom:string, sigle:string, modele:object}} choix type (diaTypesDiagrammes)
 * @param {object} el élément cible
 * @param {string} [nom] nom du diagramme (choix.nom par défaut)
 * @returns {{etapes:Array, attrs:Array, rep:object}} nœuds à insérer et représentation à indexer
 */
function diaPreparerDiagramme(aird, choix, el, nom) {
  const m = choix.modele, desc = diaDescripteur_(aird, m), racine = aird.doc.racine;
  const uidRep = diaNouvelUid(), uidDesc = diaNouvelUid(), id = () => diaNouvelUid();
  const neuf = (tag, a, enfants) => { const n = xtNouveau(tag, a); for (const e of enfants || []) { e.parent = n; n.enfants.push(e); } return n; };
  const cibleModele = diaEnfant(m.noeud, 'target');
  const cible = () => xtNouveau('target', [['xmi:type', (xtAttr(cibleModele, 'xmi:type') || '').replace(/:.*$/, '') + ':' + modType(el)], ['href', (xtAttr(cibleModele, 'href') || '').replace(/#.*$/, '') + '#' + modId(el)]]);
  const copie = n => xtNouveau(n.tag, n.attrs.map(a => [a.n, a.v]));
  // Descripteur
  const nomDiag = nom || choix.nom;
  const descripteur = neuf('ownedRepresentationDescriptors', [['xmi:type', xtAttr(desc, 'xmi:type')], ['uid', uidDesc], ['name', nomDiag], ['repPath', '#' + uidRep], ['changeId', String(Date.now())]],
    [copie(diaEnfant(desc, 'description')), cible()]);
  // Diagramme : notation GMF vide, puis les références du modèle
  const notationModele = m.noeud.enfants.find(c => c.tag === 'ownedAnnotationEntries' && xtAttr(c, 'source') === 'GMF_DIAGRAMS');
  const dataModele = diaEnfant(notationModele, 'data');
  const data = neuf('data', dataModele.attrs.map(a => [a.n, a.n === 'xmi:id' ? id() : a.n === 'element' ? uidRep : a.v]),
    dataModele.enfants.filter(c => c.tag !== 'children' && c.tag !== 'edges').map(c => xtNouveau(c.tag, c.attrs.map(a => [a.n, a.n === 'xmi:id' ? id() : a.v]))));
  const enfants = [neuf('ownedAnnotationEntries', notationModele.attrs.map(a => [a.n, a.n === 'uid' ? id() : a.v]), [data])];
  for (const c of m.noeud.enfants) {
    if (c.tag === 'description' || c.tag === 'activatedFilters' || c.tag === 'activatedLayers' || c.tag === 'currentConcern') enfants.push(copie(c));
    else if (c.tag === 'filterVariableHistory') enfants.push(xtNouveau(c.tag, c.attrs.map(a => [a.n, a.n === 'uid' ? id() : a.v])));
    else if (c.tag === 'target') enfants.push(cible());
  }
  const diagramme = neuf(m.noeud.tag, m.noeud.attrs.filter(a => a.n !== 'synchronized').map(a => [a.n, a.n === 'uid' ? uidRep : a.v]), enfants);
  // Représentation indexée par diaIndexer à l'insertion du diagramme (retirée en annulant)
  const rep = { uid: uidDesc, nom: nomDiag, type: m.type, sigle: m.sigle, description: m.description, genre: 'diagramme', croise: false, cibleId: modId(el), noeud: diagramme, scene: null };
  diagramme.repArcature = rep;
  const vue = desc.parent, apres = (e, test) => { let i = -1; e.enfants.forEach((c, k) => { if (test(c)) i = k; }); return i + 1; };
  return {
    etapes: [{ parent: vue, noeud: descripteur, index: apres(vue, c => c.tag === 'ownedRepresentationDescriptors') }, { parent: racine, noeud: diagramme, index: racine.enfants.length }],
    attrs: [], rep
  };
}

/* ─────────────────────────────── Style des éléments (2.2) ─────────────────────────────── */
/* Comme l'onglet « Apparence » de Sirius : la valeur est écrite dans le style Sirius de l'élément (ownedStyle, ou le style
   de l'étiquette centrale d'un lien), et la propriété inscrite dans ses customFeatures — sans quoi le rafraîchissement de
   Sirius la remettrait à la valeur de la description. La police est reflétée dans le style GMF de la vue (fontColor,
   fontHeight, bold, italic), comme le fait Sirius. Constaté dans les .aird d'IFE et d'AIDA : customFeatures et labelFormat
   sont des éléments enfants (<customFeatures>labelColor</customFeatures>), avant la description. */

/** Ordre EMF des attributs des styles Sirius (constaté dans les .aird d'IFE et d'AIDA). */
const DIA_ORDRE_STYLES = {
  FlatContainerStyle: ['xmi:type', 'uid', 'labelSize', 'labelColor', 'showIcon', 'labelAlignment', 'description', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'borderLineStyle', 'hideLabelByDefault', 'backgroundStyle', 'backgroundColor', 'foregroundColor'],
  ListContainerStyle: ['xmi:type', 'uid', 'labelSize', 'labelColor', 'showIcon', 'labelAlignment', 'description', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'borderLineStyle', 'hideLabelByDefault', 'backgroundColor', 'foregroundColor'],
  Square: ['xmi:type', 'uid', 'description', 'labelSize', 'showIcon', 'iconPath', 'labelAlignment', 'labelColor', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'hideLabelByDefault', 'labelPosition', 'width', 'height', 'color'],
  Lozenge: ['xmi:type', 'uid', 'labelSize', 'showIcon', 'labelColor', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'labelPosition', 'width', 'height', 'color'],
  Ellipse: ['xmi:type', 'uid', 'labelSize', 'showIcon', 'labelColor', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'labelPosition', 'horizontalDiameter', 'verticalDiameter', 'color'],
  Dot: ['xmi:type', 'uid', 'labelSize', 'showIcon', 'labelColor', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'labelPosition', 'backgroundColor', 'strokeSizeComputationExpression'],
  WorkspaceImage: ['xmi:type', 'uid', 'labelSize', 'showIcon', 'labelColor', 'borderSize', 'hideLabelByDefault', 'borderSizeComputationExpression', 'borderColor', 'labelPosition', 'workspacePath'],
  BundledImage: ['xmi:type', 'uid', 'labelSize', 'showIcon', 'labelAlignment', 'labelColor', 'borderSize', 'borderSizeComputationExpression', 'borderColor', 'labelPosition', 'shape', 'color'],
  EdgeStyle: ['xmi:type', 'uid', 'description', 'lineStyle', 'sourceArrow', 'targetArrow', 'foldingStyle', 'size', 'routingStyle', 'centered', 'strokeColor'],
  CenterLabelStyle: ['xmi:type', 'uid', 'iconPath', 'labelSize', 'showIcon', 'labelColor'],
};
/** Ordre EMF des attributs d'un style GMF (ShapeStyle, FontStyle). */
const DIA_ORDRE_STYLE_GMF = ['xmi:type', 'xmi:id', 'fontColor', 'fontName', 'description', 'fontHeight', 'bold', 'italic', 'fillColor', 'transparency', 'lineColor', 'lineWidth'];
/** Valeurs par défaut des propriétés de style de Sirius (non écrites) : constatées absentes des .aird pour ces valeurs. */
const DIA_DEFAUTS_STYLE = { labelSize: '8', labelColor: '0,0,0', borderSize: '0', size: '1', lineStyle: 'solid' };
/** Motifs de trait des liens (LineStyle de Sirius). */
const DIA_MOTIFS = ['solid', 'dash', 'dot', 'dash_dot'];

/**
 * Propriétés de style qu'un style Sirius porte, selon son type : clé → attributs Sirius (feature de customFeatures).
 * remplissage : couleur de fond (les deux couleurs du dégradé d'un conteneur) ; bordure, epBordure ; couleurTexte,
 * tailleTexte, gras, italique (étiquette) ; trait, epTrait, motif (liens).
 * @param {string} type type court du style (FlatContainerStyle, Square, EdgeStyle…)
 * @returns {Object<string, string[]>}
 */
function diaProprietesStyle(type) {
  const etiquette = { couleurTexte: ['labelColor'], tailleTexte: ['labelSize'], gras: ['labelFormat'], italique: ['labelFormat'] };
  if (type === 'EdgeStyle') return { trait: ['strokeColor'], epTrait: ['size'], motif: ['lineStyle'], ...etiquette };
  if (!DIA_ORDRE_STYLES[type]) return {};
  const bord = { bordure: ['borderColor'], epBordure: ['borderSize'] };
  if (/ContainerStyle/.test(type)) return { remplissage: ['backgroundColor', 'foregroundColor'], ...bord, ...etiquette };
  if (type === 'WorkspaceImage') return { ...bord, ...etiquette };
  if (type === 'Dot') return { remplissage: ['backgroundColor'], ...bord, ...etiquette };
  return { remplissage: ['color'], ...bord, ...etiquette };
}

/** Couleur Sirius « r,g,b » en « #rrggbb ». @param {string} v @returns {string} */
const diaHexa = v => '#' + v.split(',').map(n => (+n).toString(16).padStart(2, '0')).join('');
/** Couleur « #rrggbb » en couleur Sirius « r,g,b ». @param {string} h @returns {string} */
const diaRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');

/**
 * Nœuds de style d'un élément de diagramme : style Sirius (et celui de l'étiquette centrale pour un lien), style GMF de la
 * vue (police).
 * @param {object} aird résultat de diaLire
 * @param {object} x forme ou lien de la scène
 * @returns {{s:object, style:object, type:string, etiquette:object, gmf:object|null}|null} null sans style Sirius
 */
function diaNoeudsStyle(aird, x) {
  const s = x.uid && aird.parUid.get(x.uid), style = s && diaEnfant(s, 'ownedStyle');
  if (!style) return null;
  const type = (xtAttr(style, 'xmi:type') || '').replace(/^.*:/, ''), lien = type === 'EdgeStyle';
  const etiquette = lien ? diaEnfant(style, 'centerLabelStyle') : style, vue = aird.parVue.get(x.vue);
  const gmf = vue ? vue.enfants.find(c => c.tag === 'styles' && /ShapeStyle|FontStyle/.test(xtAttr(c, 'xmi:type') || '')) || null : null;
  return { s, style, type, etiquette, gmf };
}

/**
 * Valeurs des propriétés de style lues dans des nœuds de style Sirius (couleurs « #rrggbb », nombres, booléens, motif).
 * @param {object} style style Sirius (ownedStyle)
 * @param {string} type type court du style
 * @param {object|null} etiquette nœud qui porte l'étiquette (le style lui-même, ou le style de l'étiquette centrale d'un lien)
 * @returns {Object<string,*>}
 */
function diaValeursStyle(style, type, etiquette) {
  const v = {}, props = diaProprietesStyle(type), formats = etiquette ? etiquette.enfants.filter(c => c.tag === 'labelFormat').map(c => c.texte) : [];
  const attr = (el, a, d) => (el && xtAttr(el, a) != null ? xtAttr(el, a) : d);
  for (const k of Object.keys(props)) {
    if (k === 'remplissage') v[k] = diaHexa(attr(style, props[k][0], /ContainerStyle/.test(type) ? '255,255,255' : '136,136,136'));
    else if (k === 'bordure') v[k] = diaHexa(attr(style, 'borderColor', '0,0,0'));
    else if (k === 'epBordure') v[k] = +attr(style, 'borderSize', DIA_DEFAUTS_STYLE.borderSize);
    else if (k === 'trait') v[k] = diaHexa(attr(style, 'strokeColor', '136,136,136'));
    else if (k === 'epTrait') v[k] = +attr(style, 'size', DIA_DEFAUTS_STYLE.size);
    else if (k === 'motif') v[k] = attr(style, 'lineStyle', 'solid');
    else if (!etiquette) continue;
    else if (k === 'couleurTexte') v[k] = diaHexa(attr(etiquette, 'labelColor', DIA_DEFAUTS_STYLE.labelColor));
    else if (k === 'tailleTexte') v[k] = +attr(etiquette, 'labelSize', DIA_DEFAUTS_STYLE.labelSize);
    else if (k === 'gras') v[k] = formats.includes('bold');
    else if (k === 'italique') v[k] = formats.includes('italic');
  }
  return v;
}

/**
 * Style d'un élément du diagramme, pour l'onglet de style : propriétés modifiables et leurs valeurs, et celles qui sont
 * personnalisées (customFeatures).
 * @param {object} aird résultat de diaLire
 * @param {object} x forme ou lien
 * @returns {{genre:('forme'|'lien'), valeurs:Object<string,*>, personnalise:boolean}|null} null sans style modifiable
 */
function diaStyleDe(aird, x) {
  const n = diaNoeudsStyle(aird, x);
  if (!n || !Object.keys(diaProprietesStyle(n.type)).length) return null;
  const perso = [n.style, n.etiquette].some(st => st && st.enfants.some(c => c.tag === 'customFeatures' && !['routingStyle', 'uid', 'workspacePath', 'showIcon', 'hideLabelByDefault', 'labelPosition'].includes(c.texte)));
  return { genre: n.type === 'EdgeStyle' ? 'lien' : 'forme', valeurs: diaValeursStyle(n.style, n.type, n.etiquette), personnalise: perso };
}

/**
 * Style modèle d'un élément, pour rétablir son style par défaut : un autre style du .aird de même description (même
 * description de style, conditionnelle comprise) sans propriété personnalisée — Sirius y a écrit les valeurs calculées
 * depuis la description.
 * @param {object} aird résultat de diaLire
 * @param {object} style style Sirius de l'élément
 * @returns {object|null}
 */
function diaModeleStyle(aird, style) {
  const cle = st => { const d = diaEnfant(st, 'description'); return d ? xtAttr(d, 'href') : xtAttr(st, 'description') || ''; };
  const voulue = cle(style), libre = st => !st || !st.enfants.some(c => c.tag === 'customFeatures');
  if (!voulue) return null;
  let modele = null;
  xtParcourir(aird.doc.racine, el => {
    if (!modele && el.tag === 'ownedStyle' && el !== style && cle(el) === voulue && libre(el) && libre(diaEnfant(el, 'centerLabelStyle'))) modele = el;
  });
  return modele;
}

/**
 * Changements du .aird pour donner un style à des éléments du diagramme : attributs des styles Sirius et GMF, éléments
 * enfants customFeatures et labelFormat ajoutés ou retirés.
 * - valeurs données : écrites, chaque propriété inscrite dans les customFeatures de son style ;
 * - defaut (« Style par défaut ») : chaque attribut reprend la valeur du style modèle (diaModeleStyle) et sort des
 *   customFeatures ; sans modèle, les valeurs par défaut sûres de Sirius (taille, couleur du texte, épaisseurs, motif), les
 *   couleurs restant celles écrites jusqu'au rafraîchissement de Sirius.
 * La police est reflétée dans le style GMF de la vue (fontColor : rouge dans l'octet de poids faible, fontHeight, bold,
 * italic).
 * @param {object} aird résultat de diaLire
 * @param {object[]} elements formes et liens
 * @param {Object<string,*>} valeurs propriétés voulues (celles qu'un élément n'a pas sont ignorées)
 * @param {boolean} [defaut] rétablir le style par défaut (valeurs ignorées)
 * @returns {{attrs:Array<{el:object, n:string, avant:(string|null), apres:(string|null), ordre:string[]}>, etapes:Array<{genre:('ajout'|'retrait'), parent:object, noeud:object, index:number}>}}
 */
function diaPreparerStyle(aird, elements, valeurs, defaut) {
  const attrs = [], etapes = [], enfants = new Map();
  const liste = p => { if (!enfants.has(p)) enfants.set(p, p.enfants.slice()); return enfants.get(p); };
  const poser = (el, n, v, ordre) => {
    const avant = xtAttr(el, n) ?? null;
    if (avant !== v) attrs.push({ el, n, avant, apres: v, ordre: ordre || el.attrs.map(a => a.n).concat(n) });
  };
  const retirer = (p, noeud) => { const l = liste(p), i = l.indexOf(noeud); if (i < 0) return; l.splice(i, 1); etapes.push({ genre: 'retrait', parent: p, noeud, index: i }); };
  const ajouter = (p, noeud, i) => { liste(p).splice(i, 0, noeud); etapes.push({ genre: 'ajout', parent: p, noeud, index: i }); };
  const texte = (tag, t) => { const x = xtNouveau(tag, []); x.texte = t; return x; };
  /** Inscrit (oui) ou retire une feature des customFeatures d'un style. */
  const perso = (st, feature, oui) => {
    const l = liste(st), ex = l.find(c => c.tag === 'customFeatures' && c.texte === feature);
    if (oui && !ex) ajouter(st, texte('customFeatures', feature), l.map(c => c.tag).lastIndexOf('customFeatures') + 1);
    if (!oui && ex) retirer(st, ex);
  };
  const valeur = (k, v) => {
    if (k === 'epBordure' || k === 'epTrait' || k === 'tailleTexte') return String(Math.max(0, Math.round(+v)));
    if (k === 'motif') return DIA_MOTIFS.includes(v) ? v : 'solid';
    return diaRgb(v);
  };
  for (const x of elements) {
    const n = diaNoeudsStyle(aird, x);
    if (!n) continue;
    const props = diaProprietesStyle(n.type), cour = diaValeursStyle(n.style, n.type, n.etiquette);
    const modele = defaut ? diaModeleStyle(aird, n.style) : null;
    const modeleEt = modele && (n.etiquette === n.style ? modele : diaEnfant(modele, 'centerLabelStyle'));
    const ordreDe = st => DIA_ORDRE_STYLES[st === n.style ? n.type : 'CenterLabelStyle'];
    let formats = null;                              // libellés de labelFormat voulus (italic, bold), null : inchangés
    const n0 = attrs.length;
    for (const k of Object.keys(props)) {
      const etiq = /Texte|gras|italique/.test(k), st = etiq ? n.etiquette : n.style, mst = etiq ? modeleEt : modele;
      if (!st) continue;
      if (k === 'gras' || k === 'italique') {
        if (defaut) formats = modeleEt ? modeleEt.enfants.filter(c => c.tag === 'labelFormat').map(c => c.texte) : [];
        else if (k in valeurs && !!valeurs[k] !== cour[k]) {
          const g = 'gras' in valeurs ? !!valeurs.gras : cour.gras, it = 'italique' in valeurs ? !!valeurs.italique : cour.italique;
          formats = [...(it ? ['italic'] : []), ...(g ? ['bold'] : [])];
        }
        continue;
      }
      if (defaut) {
        for (const a of props[k]) {
          const v = mst ? xtAttr(mst, a) ?? null : (a in DIA_DEFAUTS_STYLE ? null : xtAttr(st, a) ?? null);
          poser(st, a, v, ordreDe(st));
          perso(st, a, false);
        }
      } else if (k in valeurs && valeurs[k] !== cour[k]) {
        const v = valeur(k, valeurs[k]);
        for (const a of props[k]) { poser(st, a, DIA_DEFAUTS_STYLE[a] === v && xtAttr(st, a) == null ? null : v, ordreDe(st)); perso(st, a, true); }
      }
    }
    if (formats && n.etiquette) {
      // labelFormat : éléments enfants dans l'ordre de FontFormat (italic, bold), après les customFeatures ; inchangés si
      // la liste est la même
      const st = n.etiquette, actuels = liste(st).filter(c => c.tag === 'labelFormat');
      if (actuels.map(c => c.texte).join() !== formats.join()) {
        for (const c of actuels) retirer(st, c);
        for (const f of formats) {
          const k = liste(st).findIndex(c => c.tag !== 'customFeatures' && c.tag !== 'labelFormat');
          ajouter(st, texte('labelFormat', f), k < 0 ? liste(st).length : k);
        }
      }
      perso(st, 'labelFormat', !defaut);
    }
    // Reflet GMF de la police (seulement si elle a changé) : valeurs finales du style de l'étiquette
    if (n.gmf && n.etiquette && (formats || attrs.slice(n0).some(c => c.el === n.etiquette && /^label/.test(c.n)))) {
      const final = a => { for (let i = attrs.length - 1; i >= 0; i--) if (attrs[i].el === n.etiquette && attrs[i].n === a) return attrs[i].apres; return xtAttr(n.etiquette, a) ?? null; };
      const couleur = final('labelColor') || DIA_DEFAUTS_STYLE.labelColor, taille = final('labelSize') || DIA_DEFAUTS_STYLE.labelSize;
      const [r, g, b] = couleur.split(',').map(Number), e = r + (g << 8) + (b << 16);
      if (xtAttr(n.gmf, 'fontColor') != null || e) poser(n.gmf, 'fontColor', e ? String(e) : null, DIA_ORDRE_STYLE_GMF);
      if (final('labelSize') != null || xtAttr(n.gmf, 'fontHeight') != null) poser(n.gmf, 'fontHeight', taille, DIA_ORDRE_STYLE_GMF);
      const f = formats || liste(n.etiquette).filter(c => c.tag === 'labelFormat').map(c => c.texte);
      poser(n.gmf, 'bold', f.includes('bold') ? 'true' : null, DIA_ORDRE_STYLE_GMF);
      poser(n.gmf, 'italic', f.includes('italic') ? 'true' : null, DIA_ORDRE_STYLE_GMF);
    }
  }
  return { attrs, etapes };
}

/* ─────────────────────────────── Masquer (E7) ─────────────────────────────── */

/** Ordre EMF des attributs d'une vue GMF (Node, Edge) touchés par le masquage. */
const DIA_ORDRE_GMF = ['xmi:type', 'xmi:id', 'visible', 'type', 'element', 'source', 'target'];

/**
 * Prépare le masquage d'éléments d'un diagramme, comme la commande « Hide » de Capella (Sirius HideFilter) : sur chaque
 * élément, visible="false" et un filtre HideFilter, et visible="false" sur sa vue GMF ; les liens qui touchent l'élément
 * (ou ses ports, ses éléments contenus) sont masqués aussi, sans filtre, comme Sirius les écrit après rafraîchissement.
 * Réversible (opération « insertion » : attributs et filtres retirés en annulant).
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation
 * @param {string[]} uids éléments Sirius à masquer (formes ou liens)
 * @returns {{etapes:Array, attrs:Array, n:number}} changements (n : éléments masqués, liens compris)
 */
function diaMasquer(aird, rep, uids) {
  const p = diaPrefixe(aird.doc, 'http://www.eclipse.org/sirius/diagram/1.1.0');
  if (!p) throw new Error(_L('Espaces de noms de Sirius absents du .aird.'));
  const parGmf = new Map();
  for (const v of aird.parVue.values()) if ((v.tag === 'children' || v.tag === 'edges') && xtAttr(v, 'element')) parGmf.set(xtAttr(v, 'element'), v);
  const etapes = [], attrs = [], vus = new Set();
  const invisible = (el, ordre) => { if (el && xtAttr(el, 'visible') !== 'false') attrs.push({ el, n: 'visible', avant: xtAttr(el, 'visible') ?? null, apres: 'false', ordre }); };
  const masquer = (s, filtre) => {
    if (!s || vus.has(s)) return;
    vus.add(s);
    invisible(s, DIA_ORDRE_ELEMENT);
    invisible(parGmf.get(xtAttr(s, 'uid')), DIA_ORDRE_GMF);
    if (filtre && !s.enfants.some(c => c.tag === 'graphicalFilters' && /HideFilter/.test(xtAttr(c, 'xmi:type') || ''))) {
      let i = -1;
      s.enfants.forEach((c, k) => { if (/^(target|semanticElements|graphicalFilters)$/.test(c.tag)) i = k; });
      etapes.push({ parent: s, noeud: xtNouveau('graphicalFilters', [['xmi:type', p + ':HideFilter'], ['uid', diaNouvelUid()]]), index: i + 1 });
    }
  };
  // Éléments demandés, puis les liens dont une extrémité est dans l'un d'eux (lui-même, ses ports, son contenu)
  const dedans = new Set();
  for (const u of uids) {
    const s = aird.parUid.get(u);
    masquer(s, true);
    if (s) xtParcourir(s, x => { const v = xtAttr(x, 'uid'); if (v) dedans.add(v); });
  }
  xtParcourir(rep.noeud, x => {
    if (x.tag === 'ownedDiagramElements' && /DEdge/.test(xtAttr(x, 'xmi:type') || '') && (dedans.has(xtAttr(x, 'sourceNode')) || dedans.has(xtAttr(x, 'targetNode')))) masquer(x, false);
  });
  return { etapes, attrs, n: vus.size };
}

/**
 * Tient à jour les index d'un .aird après l'insertion ou le retrait d'un sous-arbre (uid, vues GMF, présences des
 * éléments du modèle dans la représentation, liste des représentations pour un diagramme créé), et oublie la scène calculée
 * de la représentation.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation concernée
 * @param {object} noeud racine du sous-arbre
 * @param {boolean} ajout true après une insertion, false après un retrait
 */
function diaIndexer(aird, rep, noeud, ajout) {
  // Diagramme créé (diaPreparerDiagramme) : sa représentation entre dans la liste du .aird, ou en sort
  if (noeud.repArcature) {
    const r = noeud.repArcature, i = aird.reps.indexOf(r);
    if (ajout && i < 0) aird.reps.push(r);
    if (!ajout && i >= 0) aird.reps.splice(i, 1);
    if (!aird.cibles.has(r.cibleId)) aird.cibles.set(r.cibleId, new Set());
    if (ajout) aird.cibles.get(r.cibleId).add(r); else aird.cibles.get(r.cibleId).delete(r);
  }
  xtParcourir(noeud, el => {
    const u = xtAttr(el, 'uid'), x = xtAttr(el, 'xmi:id');
    if (u) { if (ajout) aird.parUid.set(u, el); else if (aird.parUid.get(u) === el) aird.parUid.delete(u); }
    if (x) { if (ajout) aird.parVue.set(x, el); else if (aird.parVue.get(x) === el) aird.parVue.delete(x); }
    if (el.tag === 'ownedBorderedNodes' || el.tag === 'ownedDiagramElements' || el.tag === 'ownedElements') {
      const id = diaHrefId(xtAttr(diaEnfant(el, 'target') || { attrs: [] }, 'href'));
      if (!id) return;
      if (ajout) { if (!aird.presences.has(id)) aird.presences.set(id, new Set()); aird.presences.get(id).add(rep); }
      else if (aird.presences.has(id)) { aird.presences.get(id).delete(rep); if (!aird.presences.get(id).size) aird.presences.delete(id); }
    }
  });
  rep.scene = null;
}

/* ─────────────────────── Suppression d'éléments du modèle (1.5) ─────────────────────── */

/**
 * Vues du .aird à retirer avec des éléments supprimés du modèle, comme Capella et Sirius le font : les représentations dont
 * la cible est supprimée (DeleteRepresentationCommand : descripteur et représentation) ; puis, comme DanglingRefRemovalTrigger
 * et la synchronisation GMF, les éléments de diagramme et de tableau (nœuds, conteneurs, liens, lignes, colonnes, cellules)
 * dont la cible est supprimée, les entrées semanticElements et les références des annotations vers eux ; enfin, jusqu'au
 * point fixe, les vues qui en dépendent : vue GMF de l'élément retiré, liens GMF et liens Sirius dont une extrémité est
 * retirée, cellules d'une colonne retirée ; les listes d'identifiants (outgoingEdges…) perdent les éléments retirés.
 * @param {object} aird .aird lu (diaLire)
 * @param {Set<string>} ids identifiants des éléments supprimés du modèle (contenus compris)
 * @returns {{retraits:Array<{noeud:object, parent:object, index:number, rep:(object|null)}>, attrs:Array, reps:object[],
 *   vues:number, restes:string[]}} restes : références au modèle supprimé qui resteraient (suppression à refuser)
 */
function diaPlanSuppression(aird, ids) {
  const retires = new Set(), parNoeud = new Map(aird.reps.filter(r => r.noeud).map(r => [r.noeud, r]));
  const vise = el => { const t = diaEnfant(el, 'target'); return !!t && ids.has(diaHrefId(xtAttr(t, 'href'))); };
  const balisesVues = /^(ownedDiagramElements|ownedBorderedNodes|ownedElements|lines|columns|cells)$/;
  // Un seul parcours : vues visées, références internes qui font dépendre un élément d'un autre (vue GMF → élément Sirius,
  // extrémités des liens GMF et Sirius, colonne d'une cellule)
  const dependants = new Map(), ajouter = (id, el) => { if (!dependants.has(id)) dependants.set(id, []); dependants.get(id).push(el); };
  const repsRetirees = aird.reps.filter(r => ids.has(r.cibleId));
  for (const r of repsRetirees) { const d = aird.parUid.get(r.uid); if (d) retires.add(d); if (r.noeud) retires.add(r.noeud); }
  xtParcourir(aird.doc.racine, el => {
    const t = xtAttr(el, 'xmi:type') || '';
    if (balisesVues.test(el.tag) && vise(el)) retires.add(el);
    else if ((el.tag === 'semanticElements' || el.tag === 'references') && ids.has(diaHrefId(xtAttr(el, 'href')))) retires.add(el);
    const n = t === 'notation:Edge' ? ['element', 'source', 'target'] : /^notation:/.test(t) ? ['element'] : t === 'diagram:DEdge' ? ['sourceNode', 'targetNode'] : el.tag === 'cells' ? ['column'] : null;
    if (n) for (const k of n) { const v = xtAttr(el, k); if (v) ajouter(v, el); }
  });
  // Point fixe : ce qui dépend d'un élément retiré l'est aussi (avec son contenu)
  const morts = new Set(), file = [...retires];
  while (file.length) {
    xtParcourir(file.shift(), x => {
      for (const k of ['uid', 'xmi:id']) {
        const v = xtAttr(x, k);
        if (!v || morts.has(v)) continue;
        morts.add(v);
        for (const d of dependants.get(v) || []) if (!retires.has(d)) { retires.add(d); file.push(d); }
      }
    });
  }
  // Racines des sous-arbres retirés, index d'origine (décroissants sous un même parent), représentation de chacune
  const racines = [...retires].filter(x => { for (let p = x.parent; p; p = p.parent) if (retires.has(p)) return false; return !!x.parent; });
  const repDe = x => { for (let p = x; p; p = p.parent) if (parNoeud.has(p)) return parNoeud.get(p); return null; };
  const retraits = racines.map(x => ({ noeud: x, parent: x.parent, index: x.parent.enfants.indexOf(x), rep: repDe(x) })).sort((a, b) => b.index - a.index);
  // Listes d'identifiants internes qui citent un élément retiré ; références au modèle supprimé qui resteraient
  const attrs = [], restes = [];
  const visiter = el => {
    if (retires.has(el)) return;
    for (const a of el.attrs) {
      if (a.n === 'uid' || a.n === 'xmi:id') continue;
      if (a.v.includes('#')) { if (a.v.split(/\s+/).some(v => ids.has(v.slice(v.indexOf('#') + 1)))) restes.push((xtAttr(el, 'xmi:type') || el.tag) + ' @' + a.n); continue; }
      if (a.v[0] !== '_') continue;                    // identifiants internes du .aird : « _… »
      const jetons = a.v.split(' ');
      if (!jetons.some(j => morts.has(j))) continue;
      const reste = jetons.filter(j => !morts.has(j));
      attrs.push({ el, n: a.n, avant: a.v, apres: reste.length ? reste.join(' ') : null, ordre: el.attrs.map(x => x.n) });
    }
    for (const c of el.enfants) visiter(c);
  };
  visiter(aird.doc.racine);
  let vues = 0;
  for (const r of racines) xtParcourir(r, x => { if (balisesVues.test(x.tag)) vues++; });
  return { retraits, attrs, reps: repsRetirees, vues, restes };
}

/**
 * Index uid et xmi:id du .aird pour un sous-arbre retiré ou remis (les présences sont tenues par diaIndexer).
 * @param {object} aird .aird lu @param {object} noeud racine du sous-arbre @param {boolean} ajout remis (vrai) ou retiré
 */
function diaIndexerRetrait(aird, noeud, ajout) {
  xtParcourir(noeud, el => {
    const u = xtAttr(el, 'uid'), x = xtAttr(el, 'xmi:id');
    if (u) { if (ajout) aird.parUid.set(u, el); else if (aird.parUid.get(u) === el) aird.parUid.delete(u); }
    if (x) { if (ajout) aird.parVue.set(x, el); else if (aird.parVue.get(x) === el) aird.parVue.delete(x); }
  });
}

/* ─────────────────────────────── Tableaux ─────────────────────────────── */

/**
 * Élément désigné par une ligne, une colonne ou une cellule de tableau (balise « target »).
 * @param {object} el nœud du tableau
 * @returns {{semId:string, typeSem:string}}
 */
function diaCibleTableau(el) {
  const t = diaEnfant(el, 'target');
  if (!t) return { semId: '', typeSem: '' };
  const ty = xtAttr(t, 'xmi:type') || '';
  return { semId: diaHrefId(xtAttr(t, 'href')), typeSem: ty.slice(ty.lastIndexOf(':') + 1) };
}

/**
 * Contenu d'un tableau de Capella (Sirius DTable : tableau croisé ou d'édition), tel qu'enregistré dans le .aird.
 * Le .aird ne garde ni style ni couleur des tableaux : seulement les libellés calculés, les largeurs, l'état
 * replié des lignes et la visibilité des colonnes.
 * @param {object} aird résultat de diaLire
 * @param {object} rep représentation (genre « tableau »)
 * @returns {object|null} { largeurEntete, colonnes, lignes } ;
 *   colonnes : { uid, texte, largeur, visible, attribut (DFeatureColumn : nom de l'attribut affiché), semId, typeSem } ;
 *   lignes (aplaties, ordre de l'arbre) : { uid, texte, profondeur, replie, visible, enfants (nombre), parent (indice ou -1),
 *   semId, typeSem, cellules : Map uid de colonne → { uid, texte, semId, typeSem } }
 */
function diaTableau(aird, rep) {
  const t = rep && rep.genre === 'tableau' ? rep.noeud : null;
  if (!t) return null;
  const colonnes = t.enfants.filter(c => c.tag === 'columns').map(c => ({
    uid: xtAttr(c, 'uid') || '', texte: xtAttr(c, 'label') || '', largeur: +(xtAttr(c, 'width') || 0) || 0,
    visible: xtAttr(c, 'visible') !== 'false', attribut: xtAttr(c, 'featureName') || '', ...diaCibleTableau(c)
  }));
  const lignes = [];
  const parcourir = (el, profondeur, parent) => {
    for (const l of el.enfants) {
      if (l.tag !== 'lines') continue;
      const cellules = new Map();
      for (const c of l.enfants) if (c.tag === 'cells') cellules.set(xtAttr(c, 'column') || '', { uid: xtAttr(c, 'uid') || '', texte: xtAttr(c, 'label') || '', ...diaCibleTableau(c) });
      const ligne = {
        uid: xtAttr(l, 'uid') || '', texte: xtAttr(l, 'label') || '', profondeur, replie: xtAttr(l, 'collapsed') === 'true',
        visible: xtAttr(l, 'visible') !== 'false', enfants: l.enfants.filter(c => c.tag === 'lines').length, parent, ...diaCibleTableau(l), cellules
      };
      const i = lignes.push(ligne) - 1;
      parcourir(l, profondeur + 1, i);
    }
  };
  parcourir(t, 0, -1);
  return { largeurEntete: +(xtAttr(t, 'headerColumnWidth') || 0) || 0, colonnes, lignes };
}

/**
 * Texte d'un tableau au format CSV (séparateur « ; », lignes repliées comprises, colonnes visibles).
 * @param {object} t tableau (diaTableau)
 * @returns {string}
 */
function diaTableauCsv(t) {
  const q = v => /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const cols = t.colonnes.filter(c => c.visible);
  const lignes = [['', ...cols.map(c => c.texte)]];
  for (const l of t.lignes) if (l.visible) lignes.push(['  '.repeat(l.profondeur) + l.texte, ...cols.map(c => (l.cellules.get(c.uid) || {}).texte || '')]);
  return lignes.map(l => l.map(q).join(';')).join('\r\n') + '\r\n';
}

/* ── src/js/27-icones.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   27. ICÔNES — icônes des éléments Capella (sans DOM)
   ───────────────────────────────────────────────────────────────────────
   Inventaire et règles : docs/ICONES.md (Capella 7.0.1).
   - icoVariante : variante d'icône d'un élément, choisie comme les décorateurs de Capella
     (org.polarsys.capella.core.data.gen.edit.decorators, *ItemProviderDecorator.getImage) :
     sigle de couche, acteur, humain, nature, genre de fonction, mécanisme d'élément échangé,
     analyse opérationnelle… Le nom rendu est celui de l'image de Capella (« PhysicalActorNode »).
   - icoSvg : dessin SVG d'une variante. Les images de Capella (EPL-2.0) ne sont pas reprises :
     elles sont redessinées ici (formes, couleurs et sigles de Capella), sur une grille de 16 × 16.
   Dépend de 10-xml-texte.js (xtAttr, xtParcourir) et 20-modele.js (modType, modId).
   ═══════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────── Variantes ─────────────────────────────── */

/** Index par document : fonctions allouées à un acteur (FunctionExt.isActorFunction de Capella). */
const ICO_INDEX = new WeakMap();

/**
 * Index des informations de modèle utiles au choix des icônes (calculé une fois par document).
 * @param {object} doc document lu par xtLire
 * @returns {{fonctionsActeurs:Set<string>}}
 */
function icoIndex(doc) {
  let ix = ICO_INDEX.get(doc);
  if (ix) return ix;
  ix = { fonctionsActeurs: new Set() };
  xtParcourir(doc.racine, el => {
    if (el.tag !== 'ownedFunctionalAllocation') return;
    // L'allocation appartient au composant qui alloue la fonction (sourceElement)
    const comp = el.parent;
    if (comp && xtAttr(comp, 'actor') === 'true') ix.fonctionsActeurs.add((xtAttr(el, 'targetElement') || '').replace(/^#/, ''));
  });
  ICO_INDEX.set(doc, ix);
  return ix;
}

/**
 * Élément visé par une référence (« #id » ou « fichier#id ») ; premier si plusieurs.
 * @param {object} doc document
 * @param {object} el élément
 * @param {string} attr attribut de référence
 * @returns {object|null}
 */
function icoCible(doc, el, attr) {
  const v = (xtAttr(el, attr) || '').split(' ')[0];
  const id = v.slice(v.lastIndexOf('#') + 1);
  return (id && doc.parId.get(id)) || null;
}

/** Préfixes Capella des genres de fonctions (FunctionKind) ayant une icône propre. */
const ICO_GENRES_FONCTION = { DUPLICATE: 'Duplicate', GATHER: 'Gather', ROUTE: 'Route', SELECT: 'Select', SPLIT: 'Split' };

/**
 * Variante d'icône d'un élément du modèle, comme les décorateurs de Capella.
 * @param {object} el élément du modèle
 * @param {object} doc document qui le contient
 * @returns {string} nom de l'image Capella (clé de icoSvg), ou '' si aucune
 */
function icoVariante(el, doc) {
  if (!el) return '';
  const t = modType(el), a = n => xtAttr(el, n);
  const acteur = a('actor') === 'true', humain = a('human') === 'true';
  switch (t) {
    case 'SystemFunction': case 'LogicalFunction': case 'PhysicalFunction': case 'OperationalActivity':
      if (ICO_GENRES_FONCTION[a('kind')]) return 'FunctionKind_' + ICO_GENRES_FONCTION[a('kind')];
      return t !== 'OperationalActivity' && icoIndex(doc).fonctionsActeurs.has(modId(el)) ? 'Actor' + t : t;
    case 'SystemComponent':
      return acteur ? (humain ? 'SystemActorHuman' : 'SystemActor') : 'SystemComponent';
    case 'LogicalComponent':
      return acteur ? (humain ? 'LogicalActorHuman' : 'LogicalActor') : (humain ? 'LogicalComponentHuman' : 'LogicalComponent');
    case 'PhysicalComponent': {
      const nature = a('nature');
      if (acteur) return humain ? 'PhysicalActorHuman' : nature === 'BEHAVIOR' ? 'PhysicalActorBehavior' : 'PhysicalActorNode';
      if (nature === 'NODE') return humain ? 'PhysicalComponentHumanNode' : 'PhysicalComponentNode';
      if (nature === 'BEHAVIOR') return humain ? 'PhysicalComponentHumanBehavior' : 'PhysicalComponentBehavior';
      return humain ? 'PhysicalComponentHumanUnset' : 'PhysicalComponent';
    }
    case 'Entity':
      return acteur ? (humain ? 'Actor' : 'OperationalActor') : 'Entity';
    case 'Part': {
      // Capella : icône du type, avec la surcouche « Part » (PartItemProviderDecorator, ovr16/PartOverlay)
      const type = icoCible(doc, el, 'abstractType');
      const v = type ? icoVariante(type, doc) : '';
      return v ? v.split('|')[0] + '|Part' : 'Part';
    }
    case 'ExchangeItemAllocation': {
      const item = icoCible(doc, el, 'allocatedItem');
      return item ? icoVariante(item, doc) : t;
    }
    case 'StateFragment': {
      // Icône de l'état ou de la fonction, avec la surcouche « StateFragment » (ovr16/StateFragmentOverlay)
      const cible = icoCible(doc, el, 'relatedAbstractState') || icoCible(doc, el, 'relatedAbstractFunction');
      const v = cible ? icoVariante(cible, doc) : '';
      return v ? v.split('|')[0] + '|Etat' : t;
    }
    case 'FunctionalExchange': {
      // Opérationnel si la source ou la cible (fonction, ou fonction propriétaire du pin) est une activité
      const bout = n => { let x = icoCible(doc, el, n); if (x && /Port$|Pin$/.test(modType(x))) x = x.parent; return x && modType(x) === 'OperationalActivity'; };
      return bout('source') || bout('target') ? 'FunctionalExchange_OA' : t;
    }
    case 'FunctionalChainInvolvementFunction':
      return el.parent && modType(el.parent) === 'OperationalProcess' ? 'FunctionalChainInvolvementFunction_OA' : t;
    case 'FunctionalChainReference':
      return el.parent && modType(el.parent) === 'OperationalProcess' ? 'FunctionalChainReference_OA' : t;
    case 'FunctionalChainInvolvementLink': {
      const oa = el.parent && modType(el.parent) === 'OperationalProcess', impl = icoCible(doc, el, 'involved');
      const vers = impl && /Function$|^OperationalActivity$/.test(modType(impl)) ? 'ToFunction' : 'ToExchange';
      return 'FunctionalChainInvolvementLink' + (oa ? 'OA_' : '_') + vers;
    }
    case 'ComponentPort':
      if ((a('kind') || 'STANDARD') === 'STANDARD') return 'StandardPort';
      return a('orientation') === 'IN' ? 'InFlowPort' : a('orientation') === 'OUT' ? 'OutFlowPort' : 'FlowPort';
    case 'ControlNode':
      return { AND: 'ControlNode_And', OR: 'ControlNode_Or', ITERATE: 'ControlNode_Iterate' }[a('kind')] || t;
    case 'ExchangeItem':
      return { EVENT: 'ExchangeItemEvent', FLOW: 'ExchangeItemFlow', OPERATION: 'ExchangeItemOperation', SHARED_DATA: 'ExchangeItemData' }[a('exchangeMechanism')] || t;
    case 'SequenceMessage': {
      const k = a('kind') || '';
      if (k === 'REPLY') return 'SequenceMessageReply';
      if (k === 'CREATE') return 'SequenceMessageCreate';
      if (k === 'DELETE') return 'SequenceMessageDelete';
      if (k === 'TIMER') {
        // Armement ou annulation, d'après l'événement d'une extrémité (ArmTimerEvent / CancelTimerEvent)
        const evt = ['receivingEnd', 'sendingEnd'].map(n => icoCible(doc, el, n)).filter(Boolean).map(f => icoCible(doc, f, 'event')).find(Boolean);
        return evt && modType(evt) === 'CancelTimerEvent' ? 'SequenceMessageCancelTimer' : 'SequenceMessageArmTimer';
      }
      if (k === 'ASYNCHRONOUS_CALL' && !a('receivingEnd') && a('sendingEnd')) return 'LostMessage';
      if (k === 'ASYNCHRONOUS_CALL' && !a('sendingEnd') && a('receivingEnd')) return 'FoundMessage';
      return t;
    }
    case 'SystemEngineering':
      return el.parent && modType(el.parent) === 'Library' ? 'SystemEngineeringInLibrary' : 'SystemEngineering';
    case 'CommunicationLink': {
      const genres = { PRODUCE: 'Produce', CONSUME: 'Consume', SEND: 'Send', RECEIVE: 'Receive', CALL: 'Call', EXECUTE: 'Execute',
        WRITE: 'Write', ACCESS: 'Access', ACQUIRE: 'Acquire', TRANSMIT: 'Transmit' };
      return 'CommunicationLink' + (genres[a('kind')] || '');
    }
    default:
      return icoVarianteType(t);
  }
}

/**
 * Variante d'icône d'après le seul type (élément absent du modèle, ou type sans décorateur).
 * @param {string} t type court
 * @returns {string} nom de l'image Capella, ou ''
 */
function icoVarianteType(t) {
  if (!t) return '';
  if (ICO_DESSINS[t]) return t;
  if (/Pkg$/.test(t)) return 'Dossier';
  if (/^(SystemAnalysis|LogicalArchitecture|PhysicalArchitecture|OperationalAnalysis|EPBSArchitecture)$/.test(t)) return 'SystemAnalysis';
  if (/Allocation$/.test(t)) return 'ActivityAllocation';
  if (/Realization$/.test(t)) return 'FunctionRealization';
  if (/Involvement$/.test(t)) return 'CapabilityInvolvement';
  if (/PseudoState$/.test(t)) return 'ChoicePseudoState';
  if (/^Literal.*Value$/.test(t)) return 'LiteralNumericValue';
  // Propriétés et valeurs de propriétés (PVMT) : dessins des énumérations et des valeurs
  if (t === 'EnumerationPropertyType') return 'Enumeration';
  if (t === 'EnumerationPropertyLiteral') return 'EnumerationLiteral';
  if (/PropertyValue$/.test(t)) return 'LiteralNumericValue';
  if (t === 'PropertyValueGroup') return 'Dossier';
  return '';
}

/* ─────────────────────────────── Dessins ─────────────────────────────── */

/**
 * SVG d'une icône à une position et une taille (dans un dessin SVG).
 * @param {string} nom variante (icoVariante)
 * @param {number} x abscisse du coin haut-gauche
 * @param {number} y ordonnée du coin haut-gauche
 * @param {number} taille côté en pixels
 * @returns {string} SVG, ou '' si la variante n'a pas de dessin
 */
function icoSvg(nom, x, y, taille) {
  const d = icoDessin(nom);
  if (!d) return '';
  return `<g class="vd-icone" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(taille / 16).toFixed(3)})" stroke-linejoin="round" font-family="Arial,Helvetica,sans-serif">${d}</g>`;
}

/**
 * Icône autonome (élément <svg> de 16 × 16 à la taille voulue), pour le HTML (arborescence…).
 * @param {string} nom variante (icoVariante)
 * @param {number} [taille] côté en pixels (16 par défaut)
 * @returns {string} SVG, ou '' si la variante n'a pas de dessin
 */
function icoSvgSeul(nom, taille) {
  const d = icoDessin(nom);
  if (!d) return '';
  taille = taille || 16;
  return `<svg class="ico" viewBox="0 0 16 16" width="${taille}" height="${taille}" aria-hidden="true" stroke-linejoin="round" font-family="Arial,Helvetica,sans-serif">${d}</svg>`;
}

/**
 * Dessin d'une variante, surcouche comprise (« PhysicalComponentNode|Part ») : la surcouche de Capella
 * occupe le coin bas-gauche, détourée de blanc.
 * @param {string} nom variante, éventuellement suivie de « |Part » ou « |Etat »
 * @returns {string} contenu SVG (grille 16 × 16), ou ''
 */
function icoDessin(nom) {
  const [base, sur] = String(nom || '').split('|');
  const d = ICO_DESSINS[base];
  if (!d || !sur) return d || '';
  return d + (ICO_SURCOUCHES[sur] || '');
}

/** Surcouches de Capella (icons/full/ovr16), coin bas-gauche. */
const ICO_SURCOUCHES = {
  // PartOverlay : petit anneau pointillé
  Part: '<circle cx="3.6" cy="12.4" r="3.4" fill="#fff" stroke="none"/><circle cx="3.6" cy="12.4" r="2.3" fill="#fff" stroke="#111" stroke-width="1.2" stroke-dasharray="1.2 .9"/>',
  // StateFragmentOverlay : morceau de ligne de vie et son état
  Etat: '<rect x="0" y="8.5" width="8" height="7.5" fill="#fff" stroke="none"/><path d="M4 8.5V16" stroke="#111"/><rect x="1" y="10.5" width="6" height="3.4" rx="1" fill="#fff" stroke="#111" stroke-width="1.1"/>'
};

/* Briques de dessin (grille 16 × 16) */

/** Sigle centré. */
const icoSigle = (s, cx, cy, taille, couleur) =>
  `<text x="${cx}" y="${cy}" font-size="${taille}" font-weight="700" text-anchor="middle" fill="${couleur || '#111'}" stroke="none">${s}</text>`;

/** Pastille ovale à sigle (fonctions, activités, capacités, missions, rôle). */
function icoPastille(sigle, fond, trait, o) {
  o = o || {};
  const t = sigle.length > 1 ? 6.2 : 7.5;
  return `<ellipse cx="8" cy="8" rx="7.2" ry="${o.ry || 5.6}" fill="${fond}" stroke="${trait}" stroke-width="1.1"${o.tirets ? ' stroke-dasharray="1.6 1.1"' : ''}/>` +
    (o.reflet === false ? '' : `<ellipse cx="7" cy="5.6" rx="4.6" ry="1.9" fill="#fff" opacity=".45" stroke="none"/>`) +
    icoSigle(sigle, 8, 8 + t * 0.36, t);
}

/** Composant (boîte à deux languettes) à sigle, ou à silhouette humaine. */
function icoComposant(sigle, fond, o) {
  o = o || {};
  let h = `<rect x="3.5" y="2" width="11.5" height="12" fill="${fond}" stroke="#111" stroke-width="1.2"/>` +
    `<rect x="1.3" y="4" width="4.2" height="2.4" fill="#fff" stroke="#111" stroke-width=".9"/><rect x="1.3" y="9.4" width="4.2" height="2.4" fill="#fff" stroke="#111" stroke-width=".9"/>`;
  if (o.humain) h += icoHumain(9.6, 3.6, 0.55);
  else if (o.carres) h += '<rect x="6.5" y="5" width="3" height="3" fill="#111"/><rect x="10" y="4" width="2.6" height="2.6" fill="#111"/><rect x="10" y="9.2" width="2.6" height="2.6" fill="#111"/><path d="M8 8V10.5H10" fill="none" stroke="#111" stroke-width=".8"/>';
  else if (sigle) h += icoSigle(sigle, sigle.length > 1 ? 9.6 : 9.3, sigle.length > 1 ? 10.4 : 10.8, sigle.length > 1 ? 6.2 : 8);
  return h;
}

/**
 * Silhouette humaine.
 * @param {number} cx abscisse de l'axe
 * @param {number} haut ordonnée du haut de la tête
 * @param {number} k échelle
 * @param {boolean} [halo] halo clair dessous (acteur seul, lisible sur fond sombre)
 * @returns {string} SVG
 */
function icoHumain(cx, haut, k, halo) {
  const s = v => (v * k).toFixed(2), ep = Math.max(0.9, 1.5 * k);
  const corps = `M0 ${s(4.3)}V${s(9)}M${s(-3.6)} ${s(6)}H${s(3.6)}M0 ${s(9)}L${s(-3)} ${s(13)}M0 ${s(9)}L${s(3)} ${s(13)}`;
  // Halo clair sous la silhouette (comme le gris clair de l'icône de Capella) : lisible aussi sur fond sombre
  return `<g transform="translate(${cx} ${haut})" fill="none" stroke-linecap="round">` +
    (halo ? `<path d="${corps}" stroke="#e6e6e6" stroke-width="${(ep + 1.6).toFixed(2)}"/><circle cx="0" cy="${s(2.2)}" r="${s(2.1)}" stroke="#e6e6e6" stroke-width="${(ep + 1.6).toFixed(2)}"/>` : '') +
    `<g stroke="#333" stroke-width="${ep.toFixed(2)}"><circle cx="0" cy="${s(2.2)}" r="${s(2.1)}" fill="#ddd"/><path d="${corps}"/></g></g>`;
}

/** Échange (deux carrés reliés par une flèche). */
function icoEchange(fond, fleche) {
  return `<rect x="1" y="4.5" width="4" height="7" fill="${fond}" stroke="#111" stroke-width="1.1"/><rect x="11" y="4.5" width="4" height="7" fill="${fond}" stroke="#111" stroke-width="1.1"/>` +
    `<path d="M5 8H10.5" stroke="${fleche}" stroke-width="2"/><path d="M8.6 5.6L11 8L8.6 10.4Z" fill="${fleche}" stroke="${fleche}" stroke-width=".6"/>`;
}

/** Catégorie (« Cat » et barre de couleur). */
const icoCategorie = barre => icoSigle('Cat', 8, 8.4, 6.6, '#444') + `<rect x="1.5" y="10.5" width="13" height="3" fill="${barre}" stroke="#333" stroke-width=".8"/>`;

/** Boîte de donnée (bordure bordeaux, en-tête) avec un contenu. */
const icoDonnee = contenu => `<rect x="1.5" y="1.5" width="13" height="13" fill="#f6e4e4" stroke="#7a1414" stroke-width="1.2"/><path d="M1.5 4.5H14.5" stroke="#7a1414" stroke-width="1.2"/>${contenu}`;

/** Dossier coloré (paquetages). */
const icoDossier = (fond, trait) => `<path d="M1 4V13.5H13L15 7H4.5L3 4.8L2.5 3.5H6.5L7.5 4.8H12.5V7" fill="${fond}" stroke="${trait}" stroke-width="1.1"/><path d="M1 13.5L3.5 7H15" fill="none" stroke="${trait}" stroke-width="1.1"/>`;

/** Exigence (extension « basic.requirement ») : page beige à coin plié, sigle ; trait au-dessus pour « non fonctionnelle ». */
function icoExigence(sigle, non) {
  return '<path d="M2 1H10.5L14 4.5V15H2Z" fill="#cdb2a4" stroke="#111" stroke-width="1.2"/><path d="M10.5 1V4.5H14" fill="#7a6458" stroke="#111" stroke-width="1"/>' +
    (non ? '<path d="M3.6 6.6H6.4" stroke="#111" stroke-width="1.3"/>' : '') + icoSigle(sigle, sigle.length > 2 ? 8 : 7.6, 13, sigle.length > 2 ? 5.6 : 6.6);
}

/** État ou mode (cartouche gris arrondi à sigle). */
const icoEtat = (sigle, fond) => `<rect x="1" y="3.5" width="14" height="9" rx="2.5" fill="${fond}" stroke="#666" stroke-width="1.1"/>` +
  `<rect x="2.5" y="4.5" width="11" height="2.5" rx="1" fill="#fff" opacity=".6" stroke="none"/>` + icoSigle(sigle, 8, 11.2, 7, '#222');

/** Flèche de message de séquence, avec une terminaison. */
const icoMessage = (fin, trait) => `<path d="M1 8H${fin === 'x' ? 10 : 11.5}" stroke="#111" stroke-width="1.3"${trait ? ' stroke-dasharray="1.6 1.4"' : ''}/>`;

/** Lien de communication : abrégé du genre au-dessus d'une flèche pointillée. */
const icoCommunication = code => icoSigle(code, 8, 6.4, code.length > 3 ? 5 : 5.8) +
  '<path d="M1 11.5H12.5" stroke="#111" stroke-width="1.2" stroke-dasharray="1.6 1.1"/><path d="M10.5 9L13.5 11.5L10.5 14" fill="none" stroke="#111" stroke-width="1.2"/>';

/** Lien d'implication (petite flèche d'angle) sur un symbole. */
const icoImplication = '<path d="M15 1L11.2 4.8M11.2 2.4V4.8H13.6" fill="none" stroke="#111" stroke-width="1.2"/>';

/** Dessins des icônes (grille 16 × 16), nommés comme les images de Capella. */
const ICO_DESSINS = {
  // ── Fonctions et activités
  SystemFunction: icoPastille('SF', '#a5dd8e', '#3c7a2a'),
  LogicalFunction: icoPastille('LF', '#a5dd8e', '#3c7a2a'),
  PhysicalFunction: icoPastille('PF', '#a5dd8e', '#3c7a2a'),
  ActorSystemFunction: icoPastille('SF', '#a9c4e6', '#3e5f8f'),
  ActorLogicalFunction: icoPastille('LF', '#a9c4e6', '#3e5f8f'),
  ActorPhysicalFunction: icoPastille('PF', '#a9c4e6', '#3e5f8f'),
  OperationalActivity: icoPastille('OA', '#f8b45c', '#9a5a10'),
  FunctionKind_Duplicate: '<rect x="1" y="2.5" width="14" height="11" fill="#e2f3dc" stroke="#111" stroke-width="1.2"/><path d="M3.5 8H7M7 5V11M7 5H12M7 11H12" fill="none" stroke="#111" stroke-width="1.2"/>',
  FunctionKind_Gather: '<rect x="1" y="2.5" width="14" height="11" fill="#e2f3dc" stroke="#111" stroke-width="1.2"/><path d="M3.5 5H8V11H3.5M8 8H12.5" fill="none" stroke="#111" stroke-width="1.2"/>',
  FunctionKind_Route: '<rect x="1" y="2.5" width="14" height="11" fill="#e2f3dc" stroke="#111" stroke-width="1.2"/><path d="M3.5 5.5L12.5 8.5M3.5 11L6 9" fill="none" stroke="#111" stroke-width="1.2"/><path d="M10.5 6.5L12.5 8.5L9.8 9" fill="none" stroke="#111" stroke-width="1"/>',
  FunctionKind_Select: '<rect x="1" y="2.5" width="14" height="11" fill="#e2f3dc" stroke="#111" stroke-width="1.2"/><path d="M12.5 5.5L3.5 9M7 10.5L12.5 11.5" fill="none" stroke="#111" stroke-width="1.2"/><path d="M5.2 7L3.5 9L6 9.7" fill="none" stroke="#111" stroke-width="1"/>',
  // Capella dessine Split comme Duplicate
  FunctionKind_Split: '<rect x="1" y="2.5" width="14" height="11" fill="#e2f3dc" stroke="#111" stroke-width="1.2"/><path d="M3.5 8H7M7 5V11M7 5H12M7 11H12" fill="none" stroke="#111" stroke-width="1.2"/>',
  // ── Composants, acteurs, entités
  SystemComponent: icoComposant('', '#d9e3f0', { carres: true }),
  SystemActor: icoComposant('SA', '#bdf3fb'),
  SystemActorHuman: icoHumain(8, 1, 1, true),
  LogicalComponent: icoComposant('L', '#dce7f4'),
  LogicalComponentHuman: icoComposant('', '#dce7f4', { humain: true }),
  LogicalActor: icoComposant('LA', '#bdf3fb'),
  LogicalActorHuman: icoHumain(8, 1, 1, true),
  PhysicalComponent: icoComposant('P', '#dfe7f1'),
  PhysicalComponentNode: icoComposant('P', '#ffff4a'),
  PhysicalComponentBehavior: icoComposant('P', '#a9c2e8'),
  PhysicalComponentHumanNode: icoComposant('', '#ffff4a', { humain: true }),
  PhysicalComponentHumanBehavior: icoComposant('', '#a9c2e8', { humain: true }),
  PhysicalComponentHumanUnset: icoComposant('', '#dfe7f1', { humain: true }),
  PhysicalActorNode: icoComposant('PA', '#bdf3fb'),
  PhysicalActorBehavior: icoComposant('PA', '#a9c2e8'),
  PhysicalActorHuman: icoHumain(8, 1, 1, true),
  Entity: icoComposant('OE', '#e1e7ee'),
  OperationalActor: icoComposant('OA', '#e1e7ee'),
  Actor: icoHumain(8, 1, 1, true),
  ConfigurationItem: icoComposant('CI', '#e1e7ee'),
  Part: icoComposant('', '#eef3f8'),
  PhysicalNode: '<path d="M1.5 5.5L4.5 2.5H14.5V11.5L11.5 14.5H1.5Z" fill="#fff" stroke="#111" stroke-width="1.1"/><path d="M1.5 5.5H11.5V14.5M11.5 5.5L14.5 2.5" fill="none" stroke="#111" stroke-width="1.1"/>',
  Role: icoPastille('R', '#c99db3', '#6c3d55'),
  // ── Échanges, liens, catégories
  FunctionalExchange: icoEchange('#8fd27a', '#2e8b2e'),
  FunctionalExchange_OA: icoEchange('#f8b45c', '#c86a00'),
  ComponentExchange: icoEchange('#b5cde3', '#5b7fa6'),
  PhysicalLink: icoEchange('#ffff4a', '#e00000'),
  ExchangeCategory: icoCategorie('#5aae3c'),
  ComponentExchangeCategory: icoCategorie('#9ab6d4'),
  PhysicalLinkCategory: icoCategorie('#e00000'),
  Association: '<path d="M2 2V14M14 2V14" stroke="#7a1414" stroke-width="1.6"/><path d="M5 6H7M9 6H11M3 10H13" stroke="#333" stroke-width="1.1"/>',
  Generalization: '<path d="M1 8H10" stroke="#111" stroke-width="1.3"/><path d="M10 4.5L15 8L10 11.5Z" fill="#fff" stroke="#111" stroke-width="1.2"/>',
  // Liens de communication (CommunicationLinkItemProviderDecorator) : genre en abrégé au-dessus d'une flèche pointillée
  CommunicationLink: icoCommunication('LNK'), CommunicationLinkProduce: icoCommunication('PRD'), CommunicationLinkConsume: icoCommunication('CSM'),
  CommunicationLinkSend: icoCommunication('SND'), CommunicationLinkReceive: icoCommunication('RCV'), CommunicationLinkCall: icoCommunication('CALL'),
  CommunicationLinkExecute: icoCommunication('EXC'), CommunicationLinkWrite: icoCommunication('WRT'), CommunicationLinkAccess: icoCommunication('ACC'),
  CommunicationLinkAcquire: icoCommunication('ACQ'), CommunicationLinkTransmit: icoCommunication('TRM'),
  // ── Éléments échangés (mécanismes)
  ExchangeItem: '<rect x="1" y="3.5" width="14" height="9" fill="#9b4848" stroke="#5a1a1a" stroke-width="1.1"/><rect x="2" y="4.5" width="12" height="3" fill="#fff" opacity=".35" stroke="none"/><path d="M7 5.5L11 8L7 10.5Z" fill="#3a0a0a"/>',
  ExchangeItemEvent: '<path d="M9.5 1L4 8.5H8L5.5 15L12.5 6.5H8.5L10.5 1Z" fill="#f2d2d2" stroke="#111" stroke-width="1"/>',
  ExchangeItemFlow: '<path d="M1.5 3.5H10.5L14.5 8L10.5 12.5H1.5L4.5 8Z" fill="#e9c8c8" stroke="#111" stroke-width="1.1"/>',
  ExchangeItemOperation: '<circle cx="8" cy="8" r="4.6" fill="#e9c8c8" stroke="#7a1414" stroke-width="1.1"/><circle cx="8" cy="8" r="1.6" fill="#7a1414"/><path d="M8 1.5V3.4M8 12.6V14.5M1.5 8H3.4M12.6 8H14.5M3.4 3.4L4.8 4.8M11.2 11.2L12.6 12.6M3.4 12.6L4.8 11.2M11.2 4.8L12.6 3.4" stroke="#7a1414" stroke-width="1.4"/>',
  ExchangeItemData: '<path d="M3.5 3.5V12.5A4.5 2 0 0 0 12.5 12.5V3.5" fill="#e9c8c8" stroke="#111" stroke-width="1.1"/><ellipse cx="8" cy="3.5" rx="4.5" ry="2" fill="#f6e4e4" stroke="#111" stroke-width="1.1"/>',
  ExchangeItemElement: '<path d="M1.5 5.5H14.5M1.5 10.5H14.5" stroke="#7a1414" stroke-width="1.5"/><rect x="1.5" y="5.5" width="13" height="5" fill="#f6e4e4" stroke="none"/>',
  // ── Données
  Class: icoDonnee('<path d="M1.5 9.5H14.5" stroke="#7a1414" stroke-width="1"/>'),
  Collection: '<rect x="1" y="1" width="9" height="9" fill="#f6e4e4" stroke="#7a1414"/><rect x="3.5" y="3.5" width="9" height="9" fill="#f6e4e4" stroke="#7a1414"/>' +
    '<rect x="6" y="6" width="9" height="9" fill="#f6e4e4" stroke="#7a1414" stroke-width="1.2"/><path d="M6 8.5H15M6 12H15" stroke="#7a1414"/>',
  Union: icoDonnee(icoSigle('U', 8, 12.6, 8, '#111')),
  Enumeration: icoDonnee(icoSigle('123', 8, 12.4, 6.2, '#111')),
  EnumerationLiteral: '<path d="M1.5 3.5H14.5M1.5 12.5H14.5" stroke="#7a1414" stroke-width="1.5"/>' + icoSigle('EL', 8, 10.6, 7, '#111'),
  BooleanType: icoDonnee(icoSigle('01', 8, 12.4, 7, '#111')),
  NumericType: icoDonnee(icoSigle('##', 8, 12.4, 7, '#111')),
  StringType: icoDonnee(icoSigle('abc', 8, 12.2, 6, '#111')),
  PhysicalQuantity: icoDonnee(icoSigle('phy', 8, 12.2, 5.8, '#111')),
  DataType: icoDonnee(icoSigle('T', 8, 12.6, 8, '#111')),
  Unit: '<path d="M3 3.5H13M3 12.5H13" stroke="#7a1414" stroke-width="1.5"/>' + icoSigle('U', 8, 11, 7.5, '#111'),
  Property: '<path d="M1.5 4.5H14.5M1.5 11H10" stroke="#7a1414" stroke-width="1.4"/><circle cx="12.3" cy="11" r="2.2" fill="#fff" stroke="#7a1414" stroke-width="1.1"/>',
  LiteralNumericValue: '<path d="M2 3.5H14M2 12.5H14" stroke="#7a1414" stroke-width="1.4"/>' + icoSigle('L', 8, 11, 7.5, '#111'),
  LiteralStringValue: '<path d="M2 3.5H14M2 12.5H14" stroke="#7a1414" stroke-width="1.4"/>' + icoSigle('L', 8, 11, 7.5, '#111'),
  LiteralBooleanValue: '<path d="M2 3.5H14M2 12.5H14" stroke="#7a1414" stroke-width="1.4"/>' + icoSigle('L', 8, 11, 7.5, '#111'),
  Interface: '<circle cx="8" cy="8" r="6" fill="#ecc4c4" stroke="#7a1414" stroke-width="1.2"/><ellipse cx="6.6" cy="5.8" rx="2.6" ry="1.6" fill="#fff" opacity=".7" stroke="none"/>',
  Constraint: icoSigle('{C}', 8, 10.8, 8, '#222'),
  ConstraintDuration: icoSigle('{C}', 8, 10.8, 8, '#222'),
  // ── États, modes, pseudo-états
  State: icoEtat('S', '#d9d9d9'),
  Mode: icoEtat('M', '#d9d9d9'),
  Region: icoEtat('R', '#f0f0f0'),
  InitialPseudoState: '<circle cx="8" cy="8" r="3.4" fill="#555" stroke="#222"/>',
  FinalState: '<circle cx="8" cy="8" r="6" fill="#ddd" stroke="#444" stroke-width="1.2"/><circle cx="8" cy="8" r="3.2" fill="#111"/>',
  ChoicePseudoState: '<path d="M8 3L13 8L8 13L3 8Z" fill="#ccc" stroke="#222" stroke-width="1.1"/><path d="M8 0.5V3M8 13V15.5" stroke="#222"/>',
  ForkPseudoState: '<rect x="6.5" y="1.5" width="3" height="13" fill="#bbb" stroke="#222"/><path d="M1 8H6.5M9.5 4H14.5M9.5 12H14.5" stroke="#222" stroke-width="1.1"/>',
  JoinPseudoState: '<rect x="6.5" y="1.5" width="3" height="13" fill="#bbb" stroke="#222"/><path d="M1 4H6.5M1 12H6.5M9.5 8H14.5" stroke="#222" stroke-width="1.1"/>',
  DeepHistoryPseudoState: '<circle cx="8" cy="8" r="6.5" fill="#333" stroke="#111"/>' + icoSigle('H*', 8, 10.8, 7.5, '#fff'),
  ShallowHistoryPseudoState: '<circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#111" stroke-width="1.3"/>' + icoSigle('H', 8, 11, 8.5, '#111'),
  EntryPointPseudoState: '<circle cx="8" cy="8" r="5.5" fill="#eee" stroke="#444" stroke-width="1.2"/>',
  ExitPointPseudoState: '<circle cx="8" cy="8" r="5.5" fill="#ddd" stroke="#444" stroke-width="1.2"/><path d="M4.2 4.2L11.8 11.8M11.8 4.2L4.2 11.8" stroke="#444" stroke-width="1.2"/>',
  TerminatePseudoState: '<path d="M3 3L13 13M13 3L3 13" stroke="#111" stroke-width="2"/>',
  // ── Capacités, missions
  Capability: icoPastille('C', '#efe3b5', '#94761e', { ry: 4.8, reflet: false }),
  OperationalCapability: icoPastille('OC', '#efe3b5', '#94761e', { ry: 4.8, reflet: false }),
  CapabilityRealization: icoPastille('C', '#efe3b5', '#94761e', { ry: 4.8, reflet: false, tirets: true }),
  Mission: icoPastille('M', '#efe3b5', '#94761e', { ry: 4.8, reflet: false }),
  // ── Chaînes, processus, chemins, implications
  FunctionalChain: '<path d="M4.5 4.5L11.5 11.5" stroke="#111" stroke-width="1.3"/><circle cx="4.5" cy="4.5" r="3" fill="#a5dd8e" stroke="#3c7a2a"/><circle cx="11.5" cy="11.5" r="3" fill="#a5dd8e" stroke="#3c7a2a"/>',
  OperationalProcess: '<path d="M4.5 4.5L11.5 11.5" stroke="#111" stroke-width="1.3"/><circle cx="4.5" cy="4.5" r="3" fill="#f8b45c" stroke="#9a5a10"/><circle cx="11.5" cy="11.5" r="3" fill="#f8b45c" stroke="#9a5a10"/>',
  PhysicalPath: '<path d="M2 2L14 14" stroke="#e00000" stroke-width="1.6"/><rect x="0.5" y="0.5" width="4" height="4" fill="#ffff4a" stroke="#555"/><rect x="6" y="6" width="4" height="4" fill="#ffff4a" stroke="#555"/><rect x="11.5" y="11.5" width="4" height="4" fill="#ffff4a" stroke="#555"/>',
  FunctionalChainInvolvementFunction: '<circle cx="6.5" cy="9.5" r="5.5" fill="#a5dd8e" stroke="#3c7a2a"/>' + icoSigle('F', 6.5, 12.3, 7.5) + icoImplication,
  FunctionalChainInvolvementFunction_OA: '<ellipse cx="7" cy="10" rx="6.5" ry="4.8" fill="#f8b45c" stroke="#9a5a10"/>' + icoSigle('OA', 7, 12.2, 6) + icoImplication,
  FunctionalChainInvolvementLink_ToExchange: '<rect x="1" y="3" width="3" height="5" fill="#8fd27a" stroke="#111"/><rect x="8" y="3" width="3" height="5" fill="#8fd27a" stroke="#111"/><path d="M4 5.5H8" stroke="#2e8b2e" stroke-width="1.6"/><path d="M1 12.5H14M11.5 10L14 12.5L11.5 15" fill="none" stroke="#111" stroke-width="1.1"/>' + icoImplication,
  FunctionalChainInvolvementLink_ToFunction: '<circle cx="5.5" cy="5.5" r="4" fill="#a5dd8e" stroke="#3c7a2a"/>' + icoSigle('F', 5.5, 7.5, 5.5) + '<path d="M1 12.5H14M11.5 10L14 12.5L11.5 15" fill="none" stroke="#111" stroke-width="1.1"/>' + icoImplication,
  FunctionalChainInvolvementLinkOA_ToExchange: '<rect x="1" y="3" width="3" height="5" fill="#f8b45c" stroke="#111"/><rect x="8" y="3" width="3" height="5" fill="#f8b45c" stroke="#111"/><path d="M4 5.5H8" stroke="#c86a00" stroke-width="1.6"/><path d="M1 12.5H14M11.5 10L14 12.5L11.5 15" fill="none" stroke="#111" stroke-width="1.1"/>' + icoImplication,
  FunctionalChainInvolvementLinkOA_ToFunction: '<ellipse cx="6" cy="5.5" rx="5" ry="3.6" fill="#f8b45c" stroke="#9a5a10"/>' + icoSigle('OA', 6, 7.3, 4.6) + '<path d="M1 12.5H14M11.5 10L14 12.5L11.5 15" fill="none" stroke="#111" stroke-width="1.1"/>' + icoImplication,
  FunctionalChainReference: '<path d="M3.5 5.5L10 12" stroke="#111" stroke-width="1.3"/><circle cx="3.5" cy="5.5" r="2.6" fill="#a5dd8e" stroke="#3c7a2a"/><circle cx="10" cy="12" r="2.6" fill="#a5dd8e" stroke="#3c7a2a"/>' + icoImplication,
  FunctionalChainReference_OA: '<path d="M3.5 5.5L10 12" stroke="#111" stroke-width="1.3"/><circle cx="3.5" cy="5.5" r="2.6" fill="#f8b45c" stroke="#9a5a10"/><circle cx="10" cy="12" r="2.6" fill="#f8b45c" stroke="#9a5a10"/>' + icoImplication,
  PhysicalPathInvolvement: '<path d="M1.5 1.5L14.5 14.5" stroke="#e00000" stroke-width="1.8"/><rect x="5.5" y="5.5" width="5" height="5" fill="#ffff4a" stroke="#555"/>',
  PhysicalPathReference: '<path d="M1.5 1.5L14.5 14.5" stroke="#e00000" stroke-width="1.8"/><rect x="5.5" y="5.5" width="5" height="5" fill="#ffff4a" stroke="#555"/>' + icoImplication,
  // ── Séquences
  SequenceMessage: icoMessage() + '<path d="M11 5L14.5 8L11 11" fill="none" stroke="#111" stroke-width="1.3"/>',
  SequenceMessageReply: '<path d="M4 8H15" stroke="#111" stroke-width="1.3" stroke-dasharray="1.8 1.6"/><path d="M5 5L1.5 8L5 11" fill="none" stroke="#111" stroke-width="1.3"/>',
  SequenceMessageCreate: '<path d="M1 8H8.5M6 5.5L8.5 8L6 10.5" fill="none" stroke="#111" stroke-width="1.3"/><path d="M15 4.5H10.5V11.5H15" fill="none" stroke="#111" stroke-width="1.4"/>',
  SequenceMessageDelete: '<path d="M1 8H8.5M6 5.5L8.5 8L6 10.5" fill="none" stroke="#111" stroke-width="1.3"/><path d="M10 5L15 11M15 5L10 11" stroke="#111" stroke-width="1.5"/>',
  SequenceMessageArmTimer: '<path d="M4 3L1.5 5.5L4 8L6.5 5.5Z" fill="#fff" stroke="#111"/><path d="M6.5 5.5H14V11H3M5.5 8.5L3 11L5.5 13.5" fill="none" stroke="#111" stroke-width="1.1"/>',
  SequenceMessageCancelTimer: '<path d="M4 3L1.5 5.5L4 8L6.5 5.5Z" fill="#fff" stroke="#111"/><path d="M6.5 5.5H14V11H5M1.5 9L4.5 13M4.5 9L1.5 13" fill="none" stroke="#111" stroke-width="1.1"/>',
  LostMessage: '<path d="M1 8H10M7.5 5.5L10 8L7.5 10.5" fill="none" stroke="#111" stroke-width="1.3"/><rect x="11.5" y="5.5" width="4" height="5" fill="#111"/>',
  FoundMessage: '<rect x="0.5" y="5.5" width="4" height="5" fill="#111"/><path d="M5 8H14.5M12 5.5L14.5 8L12 10.5" fill="none" stroke="#111" stroke-width="1.3"/>',
  Scenario: '<path d="M2.5 1V15M13.5 1V15" stroke="#111" stroke-width="1.3"/><path d="M2.5 4.5H13.5M2.5 10.5H13.5" stroke="#b08a2a" stroke-width="2"/>',
  InstanceRole: '<rect x="2" y="1" width="10" height="3.5" fill="#fff" stroke="#111"/><path d="M7 4.5V15" stroke="#111" stroke-width="1.3"/><path d="M8 11H14M12 9L14 11L12 13" fill="none" stroke="#111"/>',
  CombinedFragment: '<rect x="1" y="1.5" width="14" height="13" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M1 6H6L7.5 4.5V1.5" fill="none" stroke="#111"/><path d="M3 11.5H13" stroke="#111" stroke-dasharray="1.5 1"/>',
  InteractionUse: '<rect x="1" y="1.5" width="14" height="13" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M1 7H7L8.5 5.5V1.5" fill="none" stroke="#111"/>' + icoSigle('R', 4.2, 6, 5),
  InteractionOperand: '<rect x="1.5" y="2" width="13" height="12" fill="#f4f4f4" stroke="#888"/><path d="M1.5 3H14.5" stroke="#888" stroke-dasharray="1.5 1"/>' + icoSigle('?', 6, 11, 7, '#333'),
  Execution: '<path d="M8 1V15" stroke="#111"/><rect x="5.5" y="4" width="5" height="8" fill="#ddd" stroke="#111"/>',
  StateFragment: '<path d="M8 1V15" stroke="#111"/><rect x="3" y="5" width="10" height="6" rx="2" fill="#ddd" stroke="#111"/>',
  // ── Nœuds de contrôle
  ControlNode: '<circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#111" stroke-width="1.2"/>',
  ControlNode_And: '<circle cx="8" cy="8" r="7" fill="#fff" stroke="#111" stroke-width="1.1"/>' + icoSigle('AND', 8, 10, 5.2),
  ControlNode_Or: '<circle cx="8" cy="8" r="7" fill="#fff" stroke="#111" stroke-width="1.1"/>' + icoSigle('OR', 8, 10.2, 6),
  ControlNode_Iterate: '<circle cx="8" cy="8" r="7" fill="#fff" stroke="#111" stroke-width="1.1"/>' + icoSigle('IT', 8, 10.4, 6.5),
  // ── Ports
  FunctionInputPort: '<rect x="1.5" y="1.5" width="13" height="13" fill="#c6480f"/><path d="M5 4L12 8L5 12Z" fill="#fff"/>',
  FunctionOutputPort: '<rect x="1.5" y="1.5" width="13" height="13" fill="#0a5d2e"/><path d="M11 4L4 8L11 12Z" fill="#fff"/>',
  InFlowPort: '<rect x="5" y="2.5" width="10" height="11" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M1 8H11M8.5 5.5L11 8L8.5 10.5" fill="none" stroke="#111" stroke-width="1.3"/>',
  OutFlowPort: '<rect x="1" y="2.5" width="10" height="11" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M6 8H15M12.5 5.5L15 8L12.5 10.5" fill="none" stroke="#111" stroke-width="1.3"/>',
  FlowPort: '<rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#111" stroke-width="1.6"/>',
  StandardPort: '<rect x="2" y="2" width="12" height="12" fill="#c08a88" stroke="#2d1917" stroke-width="1.4"/><rect x="3" y="3" width="10" height="4" fill="#fff" opacity=".35" stroke="none"/>',
  ComponentPort: '<rect x="2" y="2" width="12" height="12" fill="#c08a88" stroke="#2d1917" stroke-width="1.4"/>',
  PhysicalPort: '<rect x="2" y="2" width="12" height="12" fill="#fff59e" stroke="#7b694f" stroke-width="1.2"/>',
  // ── Paquetages, architectures, projet
  Dossier: icoDossier('#e4ecf6', '#333'),          // paquetage sans icône propre (repli d'Arcature)
  GenericPkg: '<rect x="1.5" y="1.5" width="13" height="13" fill="#f3d9b0" stroke="#8a5a20"/><path d="M1.5 6H14.5M1.5 10.5H14.5M6 1.5V14.5M10.5 1.5V14.5" stroke="#8a5a20"/>',
  SystemFunctionPkg: icoDossier('#a5dd8e', '#2c5a1e'), LogicalFunctionPkg: icoDossier('#a5dd8e', '#2c5a1e'), PhysicalFunctionPkg: icoDossier('#a5dd8e', '#2c5a1e'),
  OperationalActivityPkg: icoDossier('#f8b45c', '#7a4508'),
  SystemComponentPkg: icoDossier('#d9e6f3', '#333'), LogicalComponentPkg: icoDossier('#d9e6f3', '#333'), PhysicalComponentPkg: icoDossier('#d9e6f3', '#333'),
  DataPkg: icoDossier('#e8b4b4', '#6a1010'), InterfacePkg: icoDossier('#e8b4b4', '#6a1010'),
  CapabilityPkg: icoDossier('#f4e6b8', '#6a5410'), CapabilityRealizationPkg: icoDossier('#f4e6b8', '#6a5410'), OperationalCapabilityPkg: icoDossier('#f4e6b8', '#6a5410'), MissionPkg: icoDossier('#f4e6b8', '#6a5410'),
  SystemAnalysis: '<rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#222" stroke-width="1.4"/><path d="M8 0.5V15.5M0.5 8H15.5" stroke="#222" stroke-width="1.4"/><rect x="3.5" y="3.5" width="3" height="3" fill="#ddd" stroke="none"/><rect x="9.5" y="9.5" width="3" height="3" fill="#ddd" stroke="none"/>',
  Project: icoDossier('#f4e6b8', '#6a5410') + '<path d="M6 2.5L9 4.5L12 2.5" fill="none" stroke="#2c6aa0"/><rect x="4.5" y="1" width="2.5" height="2.5" fill="#fff" stroke="#2c6aa0"/><rect x="8" y="3.5" width="2.5" height="2.5" fill="#fff" stroke="#2c6aa0"/><rect x="11.5" y="1" width="2.5" height="2.5" fill="#fff" stroke="#2c6aa0"/>',
  SystemEngineeringInLibrary: '<path d="M2.5 1H10.5L13.5 4V15H2.5Z" fill="#e43b3b" stroke="#7a1010"/><path d="M5 6L8 9L11 6M8 9V12" fill="none" stroke="#fff"/><rect x="3.5" y="4.5" width="3" height="3" fill="#fff" stroke="#7a1010"/><rect x="9.5" y="4.5" width="3" height="3" fill="#fff" stroke="#7a1010"/><rect x="6.5" y="10.5" width="3" height="3" fill="#fff" stroke="#7a1010"/>',
  SystemEngineering: '<path d="M2.5 1H10.5L13.5 4V15H2.5Z" fill="#fff" stroke="#555"/><path d="M5 6L8 9L11 6M8 9V12" fill="none" stroke="#2c6aa0"/><rect x="3.5" y="4.5" width="3" height="3" fill="#cfe2f3" stroke="#2c6aa0"/><rect x="9.5" y="4.5" width="3" height="3" fill="#cfe2f3" stroke="#2c6aa0"/><rect x="6.5" y="10.5" width="3" height="3" fill="#cfe2f3" stroke="#2c6aa0"/>',
  // ── Exigences (extension « basic.requirement » de Capella)
  RequirementsPkg: icoDossier('#cdb2a4', '#3a2a22'),
  SystemFunctionalRequirement: icoExigence('FR'), SystemFunctionalInterfaceRequirement: icoExigence('FIR'),
  SystemNonFunctionalRequirement: icoExigence('FR', true), SystemNonFunctionalInterfaceRequirement: icoExigence('FIR', true),
  SystemUserRequirement: icoExigence('UR'),
  RequirementsTrace: '<path d="M1 11H12" stroke="#111" stroke-width="1.1" stroke-dasharray="1.5 1.2"/><path d="M10 8.5L13 11L10 13.5" fill="none" stroke="#111" stroke-width="1.1"/><path d="M3 1.5V9" stroke="#111" stroke-width="1.1"/>',
  // ── Liens de traçabilité (allocations, réalisations, implications)
  ActivityAllocation: '<path d="M1 11H12" stroke="#111" stroke-width="1.1" stroke-dasharray="1.5 1.2"/><path d="M10 8.5L13 11L10 13.5" fill="none" stroke="#111" stroke-width="1.1"/>' + icoSigle('A', 4, 7, 7),
  FunctionRealization: '<path d="M1 11H12" stroke="#111" stroke-width="1.1" stroke-dasharray="1.5 1.2"/><path d="M10 8.5L13 11L10 13.5" fill="none" stroke="#111" stroke-width="1.1"/>' + icoSigle('R', 4, 7, 7),
  CapabilityInvolvement: '<path d="M1 8H12" stroke="#111" stroke-width="1.1" stroke-dasharray="1.5 1.2"/><path d="M10 5.5L13 8L10 10.5" fill="none" stroke="#111" stroke-width="1.1"/>'
};

/* ─────────────────────────────── Diagrammes ─────────────────────────────── */
/* Capella montre, dans l'explorateur de projet, les icônes génériques de Sirius (diagramme, séquence,
   tableau, tableau croisé : DescriptionImageDescriptorHelper) et, dans l'Activity Explorer, un pictogramme
   par type de diagramme (org.polarsys.capella.core.explorer.activity.ui/icons/full/ctool). Arcature
   reprend les pictogrammes par type, et les icônes génériques en repli. */

/** Pictogramme de diagramme par sigle (pictogrammes de l'Activity Explorer de Capella). */
const ICO_SIGLES_DIAGRAMMES = {
  OEBD: 'Diagramme_EntitesArbre', OABD: 'Diagramme_ActivitesArbre', OAIB: 'Diagramme_InteractionsOperationnelles', OAB: 'Diagramme_EntitesOperationnelles',
  ORB: 'Diagramme_Roles', OCB: 'Diagramme_CapacitesOperationnelles', COC: 'Diagramme_CapacitesOperationnelles', OPD: 'Diagramme_Chaine',
  OES: 'Diagramme_ScenarioInteraction', OAS: 'Diagramme_ScenarioActivite',
  MCB: 'Diagramme_Missions', MB: 'Diagramme_Missions', CM: 'Diagramme_Missions', CC: 'Diagramme_Missions', CRB: 'Diagramme_Missions',
  CRI: 'Diagramme_Missions', CRR: 'Diagramme_Missions', CSA: 'Diagramme_ActeursContexte',
  SFBD: 'Diagramme_FonctionsArbre', LFBD: 'Diagramme_FonctionsArbre', PFBD: 'Diagramme_FonctionsArbre',
  SDFB: 'Diagramme_Flux', LDFB: 'Diagramme_Flux', PDFB: 'Diagramme_Flux',
  SAB: 'Diagramme_ArchitectureSysteme', LAB: 'Diagramme_ArchitectureLogique', PAB: 'Diagramme_ArchitecturePhysique',
  LCBD: 'Diagramme_ComposantsLogiquesArbre', PCBD: 'Diagramme_ComposantsPhysiquesArbre', EABD: 'Diagramme_ComposantsPhysiquesArbre', CIBD: 'Diagramme_ComposantsPhysiquesArbre',
  ES: 'Diagramme_ScenarioEchange', FS: 'Diagramme_ScenarioFonction', IS: 'Diagramme_ScenarioInterface',
  MSM: 'Diagramme_Etats', 'M&S': 'Diagramme_Etats', CDB: 'Diagramme_Classes', IDB: 'Diagramme_Classes',
  CDI: 'Diagramme_InterfacesDetaillees', CEI: 'Diagramme_InterfacesExternes', CII: 'Diagramme_InterfacesInternes', ID: 'Diagramme_InterfacesDetaillees',
  FCD: 'Diagramme_Chaine', PPD: 'Diagramme_Chemin',
  EAB: 'Diagramme_ArchitectureEPBS'   // sans pictogramme dans l'Activity Explorer : dessiné par Arcature (éléments de configuration)
};

/**
 * Pictogramme d'un diagramme d'après son sigle, sinon l'icône générique de Sirius selon son genre.
 * @param {string} sigle sigle Capella (« SAB »…)
 * @param {string} genre « diagramme », « sequence », « tableau » ou « autre »
 * @param {boolean} [croise] tableau croisé
 * @returns {string} variante (icoSvg)
 */
function icoDiagramme(sigle, genre, croise) {
  if (genre === 'tableau') return croise ? 'Diagramme_TableauCroise' : 'Diagramme_Tableau';
  return ICO_SIGLES_DIAGRAMMES[sigle] || (genre === 'sequence' ? 'Diagramme_Sequence' : 'Diagramme_Generique');
}

/** Petite boîte (diagrammes). */
const icoB = (x, y, w, h, fond, trait) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fond}" stroke="${trait || '#555'}" stroke-width=".8"/>`;
/** Petite pastille (diagrammes). */
const icoE = (cx, cy, rx, ry, fond, trait) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fond}" stroke="${trait || '#555'}" stroke-width=".8"/>`;
/** Arbre de décomposition : une boîte en haut, deux en bas. */
const icoArbre = (haut, bas1, bas2) => '<path d="M8 5V8M4 8H12M4 8V10.5M12 8V10.5" fill="none" stroke="#666" stroke-width=".9"/>' +
  icoB(5.5, 1, 5, 4, haut) + icoB(1.5, 10.5, 5, 4, bas1) + icoB(9.5, 10.5, 5, 4, bas2 || bas1);
/** Scénario : trois lignes de vie, une exécution colorée. */
const icoScenario = couleur => '<path d="M3 4V15M8 4V15M13 4V15" stroke="#555" stroke-width=".9"/>' + icoB(1, 1, 4, 3, '#e3ebf4') + icoB(6, 1, 4, 3, '#e3ebf4') + icoB(11, 1, 4, 3, '#e3ebf4') +
  icoB(6.8, 6, 2.4, 6, couleur) + '<path d="M3 7H6.4M9.4 10.5H12.6" stroke="#333" stroke-width=".8"/>';
/** Petit composant (diagrammes). */
const icoC = (x, y, w, h, fond) => icoB(x, y, w, h, fond, '#444') + `<rect x="${x - 1}" y="${y + 1}" width="2" height="1.4" fill="#fff" stroke="#444" stroke-width=".5"/>`;

Object.assign(ICO_DESSINS, {
  // Icônes génériques de Sirius (explorateur de projet de Capella)
  Diagramme_Generique: '<path d="M8 5V8M4 8H12M4 8V10M12 8V10" fill="none" stroke="#555" stroke-width=".9"/>' + icoB(5, 1, 6, 4, '#f6c66b', '#8a5a10') + icoB(1, 10, 6, 5, '#7fa7d8', '#2c5a90') + icoB(9, 10, 6, 5, '#7cc47c', '#2c6a2c'),
  Diagramme_Sequence: '<path d="M4 4.5V15M12 4.5V15" stroke="#4a78b0" stroke-width="1.4"/><rect x="1" y="1" width="6" height="3.5" fill="#cfe0f3" stroke="#4a78b0"/><rect x="9" y="1" width="6" height="3.5" fill="#cfe0f3" stroke="#4a78b0"/><path d="M4.5 8H11M9 6L11 8L9 10" fill="none" stroke="#4a78b0" stroke-width="1.1"/>',
  Diagramme_Tableau: '<rect x="1" y="2" width="14" height="12" fill="#fff" stroke="#8a5a20"/><rect x="1" y="2" width="14" height="3" fill="#e2943a" stroke="#8a5a20"/><path d="M1 8H15M1 11H15M5.5 5V14M10.5 5V14" stroke="#b08a50" stroke-width=".8"/>',
  Diagramme_TableauCroise: '<rect x="1" y="2" width="14" height="12" fill="#fff" stroke="#6a3a5a"/><rect x="1" y="2" width="14" height="3" fill="#d0624a" stroke="#6a3a5a"/><rect x="1" y="2" width="3.5" height="12" fill="#e9a0a0" stroke="#6a3a5a"/><path d="M6 6.5L8 9M8 6.5L6 9M10.5 9.5L12.5 12M12.5 9.5L10.5 12" stroke="#6a3a5a" stroke-width=".9"/>',
  // Pictogrammes par type (Activity Explorer de Capella)
  Diagramme_EntitesArbre: icoArbre('#c9d3dd', '#c9d3dd'),
  Diagramme_ActivitesArbre: icoArbre('#f6c34a', '#f6c34a'),
  Diagramme_FonctionsArbre: icoArbre('#9ccf8c', '#9ccf8c'),
  Diagramme_ComposantsLogiquesArbre: icoArbre('#c9d3dd', '#c9d3dd'),
  Diagramme_ComposantsPhysiquesArbre: icoArbre('#f6d34a', '#f6d34a', '#c9d3dd'),
  Diagramme_InteractionsOperationnelles: '<path d="M5 5L11 8M5 11L11 8" stroke="#888"/>' + icoE(4.5, 4, 3.5, 2.5, '#f8d38a') + icoE(11.5, 8, 3.5, 2.5, '#f8d38a') + icoE(4.5, 12, 3.5, 2.5, '#f8d38a'),
  Diagramme_EntitesOperationnelles: icoC(2.5, 1.5, 9, 6, '#d4dce6') + icoE(7, 4.8, 3, 1.8, '#f8d38a') + icoC(6.5, 9, 8.5, 6, '#d4dce6') + icoE(11, 12.2, 3, 1.8, '#f8d38a') + '<path d="M9 7.5L10 9" stroke="#666"/>',
  Diagramme_Roles: icoB(1, 1.5, 9, 6, '#b45bb4', '#5a205a') + icoE(5.5, 4.5, 3, 1.8, '#f8d38a') + icoB(6, 9, 9, 6, '#b45bb4', '#5a205a') + icoE(10.5, 12, 3, 1.8, '#f8d38a') + '<path d="M8 7.5L9 9" stroke="#666"/>',
  Diagramme_CapacitesOperationnelles: icoE(4.5, 4, 3.6, 2.6, '#f2d3a0', '#94761e') + icoE(12, 5, 3.6, 2.6, '#f2d3a0', '#94761e') + icoHumain(3.5, 8.5, 0.45) + icoC(9, 10.5, 5.5, 4, '#d4dce6') + '<path d="M5 6.5L4 8.5M11 7.5L11 10.5" stroke="#777" stroke-width=".7"/>',
  Diagramme_Missions: icoE(8, 4, 3.6, 2.6, '#f2d3a0', '#94761e') + icoSigle('M', 8, 5.6, 4.4, '#333') + icoE(4, 12, 3.4, 2.4, '#f2d3a0', '#94761e') + icoE(12, 12, 3.4, 2.4, '#f2d3a0', '#94761e') + '<path d="M6.5 6L5 9.6M9.5 6L11 9.6" stroke="#777" stroke-width=".7"/>',
  Diagramme_ActeursContexte: icoHumain(3.5, 1, 0.5) + icoHumain(12.5, 1, 0.5) + icoHumain(8, 8.5, 0.5) + '<path d="M5.5 4.5H10.5M5 7L7 9M11 7L9 9" stroke="#777" stroke-width=".7"/>',
  Diagramme_Flux: '<path d="M6 5L9 11M10 4.5L12 9" stroke="#3c7a2a" stroke-width=".9"/>' + icoE(4.5, 4, 3.6, 2.5, '#b5e3a3', '#3c7a2a') + icoE(12, 4, 3.4, 2.4, '#b5e3a3', '#3c7a2a') + icoE(9.5, 12, 4, 2.6, '#b5e3a3', '#3c7a2a') + icoB(6.5, 3, 1.6, 1.6, '#e8701e', '#a04000'),
  Diagramme_ArchitectureSysteme: icoC(2.5, 1.5, 10, 6, '#c9d6e6') + icoE(8, 4.6, 3.2, 1.8, '#b5e3a3', '#3c7a2a') + icoC(5, 9.5, 10, 5.5, '#dfe8e8') + icoHumain(9, 10.2, 0.32) + '<path d="M9 7.5L10 9.5" stroke="#3c9a3c"/>',
  Diagramme_ArchitectureLogique: icoC(2.5, 1.5, 10, 6, '#c9d6e6') + icoE(8, 4.6, 3.2, 1.8, '#b5e3a3', '#3c7a2a') + icoC(5, 9, 10, 6, '#c9d6e6') + icoE(10.5, 12, 3.2, 1.8, '#b5e3a3', '#3c7a2a') + '<path d="M9 7.5L10 9" stroke="#3c9a3c"/>',
  Diagramme_ArchitecturePhysique: icoC(2.5, 1, 10, 7, '#f6e46a') + icoC(5.5, 3, 5, 3, '#9fbde3') + icoC(4.5, 9, 10, 6, '#f6e46a') + icoC(7.5, 11, 5, 3, '#9fbde3') + '<path d="M8 8L9 9" stroke="#c03030"/>',
  Diagramme_ScenarioInteraction: icoScenario('#f6c34a'),
  Diagramme_ScenarioActivite: icoScenario('#f8b45c'),
  Diagramme_ScenarioEchange: icoScenario('#c9d3dd'),
  Diagramme_ScenarioFonction: icoScenario('#9ccf8c'),
  Diagramme_ScenarioInterface: icoScenario('#e3b5b5'),
  Diagramme_Etats: '<rect x="1" y="1" width="14" height="14" rx="2" fill="#e8e8e8" stroke="#888"/><rect x="2.5" y="2.5" width="7.5" height="5" rx="1.5" fill="#fafafa" stroke="#444" stroke-width=".9"/><rect x="6" y="8.5" width="7.5" height="5" rx="1.5" fill="#fafafa" stroke="#444" stroke-width=".9"/>' +
    icoSigle('M', 6.2, 6.6, 4.6, '#222') + icoSigle('S', 9.8, 12.6, 4.6, '#222'),
  Diagramme_Classes: '<path d="M7 5L10 10" stroke="#555"/>' + icoB(1, 1, 7, 5.5, '#e9c8c8', '#7a1414') + '<path d="M1 3H8" stroke="#7a1414" stroke-width=".7"/>' + icoB(8, 9.5, 7, 5.5, '#e9c8c8', '#7a1414') + '<path d="M8 11.5H15" stroke="#7a1414" stroke-width=".7"/>',
  Diagramme_InterfacesDetaillees: icoB(1, 1, 6, 5, '#e9c8c8', '#7a1414') + icoB(9, 1, 6, 5, '#e9c8c8', '#7a1414') + icoC(5, 10, 7, 5, '#d4dce6') + '<path d="M4 6L7 10M12 6L10 10" stroke="#555" stroke-width=".7"/>',
  Diagramme_InterfacesExternes: icoC(2, 1.5, 8, 6, '#d4dce6') + '<circle cx="12.5" cy="4.5" r="2" fill="#ecc4c4" stroke="#7a1414" stroke-width=".7"/><circle cx="6" cy="12.5" r="2" fill="#ecc4c4" stroke="#7a1414" stroke-width=".7"/>' + icoC(10, 10.5, 5, 4, '#d4dce6') + '<path d="M10 4.5H10.5M6 7.5V10.5M8 12.5H10" stroke="#555" stroke-width=".7"/>',
  Diagramme_InterfacesInternes: icoC(2, 1, 13, 14, '#e6ecf2') + icoC(4, 3.5, 4.5, 3.5, '#c9d3dd') + icoC(9.5, 9.5, 4.5, 3.5, '#c9d3dd') + '<circle cx="11.5" cy="5" r="1.5" fill="#ecc4c4" stroke="#7a1414" stroke-width=".6"/><path d="M8.5 5.2H10M6.2 7V11H9.5" fill="none" stroke="#555" stroke-width=".7"/>',
  Diagramme_ArchitectureEPBS: icoC(2.5, 1.5, 9, 6, '#e1e7ee') + icoSigle('CI', 7, 6.2, 4.2) + icoC(6, 9, 9, 6, '#e1e7ee') + icoSigle('CI', 10.5, 13.7, 4.2) + '<path d="M7 7.5L9 9" stroke="#666"/>',
  Diagramme_Chaine: ICO_DESSINS.FunctionalChain,
  Diagramme_Chemin: ICO_DESSINS.PhysicalPath
});

/* ── src/visionneuse/socle-debut.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   VISIONNEUSE — SOCLE (avant le dessin)
   ───────────────────────────────────────────────────────────────────────
   Substituts des fonctions d'interface d'Arcature utilisées par le dessin des diagrammes
   (js/57-vue-diagramme.js) : la visionneuse est en lecture seule, sans arborescence ni journal ;
   le choix d'un élément est transmis à l'application hôte (options.choix).
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la visionneuse : conteneur, options de l'hôte, vues réorganisées en mémoire (jeton : calcul en cours). */
const VIS = { racine: null, options: {}, dispositions: new Map(), jeton: 0 };   // dispositions : vues réorganisées (uid → changements)

/**
 * Élément de la visionneuse par son identifiant.
 * @param {string} id identifiant
 * @returns {HTMLElement|null}
 */
const $ = id => document.getElementById(id);

/** Modèle ouvert (lu par xtLire) : consulté pour les icônes, les liaisons, les chaînes. */
const ARC = { doc: null, nom: '', poignee: null, ressources: null };

/** Élément choisi, liaisons calculées. */
const UI = { courant: null, rubriquesFermees: new Set(), liaisons: null };

/** Nombre maximal de puces affichées dans une liste. */
const UI_MAX_PUCES = 300;

/** Journal (vide : la visionneuse ne modifie rien). */
const ED = { faites: [], defaites: [] };

/** Mode « Mise en page » : jamais actif dans la visionneuse. */
const EDD = { actif: false, rep: null, choix: new Set(), lien: '' };

/**
 * Échappe un texte pour le HTML.
 * @param {*} s texte
 * @returns {string}
 */
function uiEsc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/**
 * Message éphémère en bas de la visionneuse.
 * @param {string} msg message
 * @param {boolean} [erreur] style d'erreur
 */
function uiToast(msg, erreur) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg; t.className = 'visible' + (erreur ? ' err' : '');
  clearTimeout(uiToast.minuterie);
  uiToast.minuterie = setTimeout(() => { t.className = ''; }, erreur ? 7000 : 3500);
}

/**
 * Puce d'un élément : icône, type coloré selon la couche, nom.
 * @param {object} el nœud du modèle
 * @returns {string} HTML
 */
function uiPuce(el) {
  const c = modCouche(el), nomme = !!xtAttr(el, 'name');
  const ico = icoSvgSeul(icoVariante(el, ARC.doc), 14);
  return `<a class="puce${nomme ? '' : ' sans-nom'}" data-id="${uiEsc(modId(el))}" title="${uiEsc(modType(el) + ' — ' + modId(el))}">` +
    (ico ? `<span class="puce-i">${ico}</span>` : '') +
    `<span class="puce-t" data-c="${c}">${uiEsc(modType(el))}</span>${nomme ? uiEsc(modLibelle(el)) : ''}</a>`;
}

/**
 * Rubrique repliable (rubrique « Diagrammes »).
 * @param {string} cle clé
 * @param {string} titre titre
 * @param {number|null} nb nombre affiché
 * @param {string} corps HTML
 * @param {string} [classe] classe
 * @returns {string} HTML
 */
function uiRubrique(cle, titre, nb, corps, classe) {
  return `<details class="rubrique ${classe || ''}" data-rub="${cle}" open><summary>${uiEsc(titre)}${nb != null ? ` <span class="nb">${nb}</span>` : ''}</summary>` +
    `<div class="rub-corps">${corps}</div></details>`;
}

/**
 * Groupe « libellé → puces ».
 * @param {string} libelle libellé
 * @param {string} corps HTML
 * @returns {string} HTML
 */
function uiGroupe(libelle, corps) {
  return `<div class="groupe"><div class="groupe-l">${uiEsc(libelle)}</div><div class="groupe-c">${corps}</div></div>`;
}

/**
 * Liaisons métier du modèle ouvert (calculées à la première demande).
 * @returns {object} résultat de liaCalculer
 */
function uiLiaisons() {
  if (!UI.liaisons || UI.liaisons.doc !== ARC.doc) UI.liaisons = liaCalculer(ARC.doc);
  return UI.liaisons;
}

/**
 * Choix d'un élément dans le diagramme : transmis à l'application hôte.
 * @param {object} el nœud du modèle
 * @returns {boolean} toujours vrai (l'élément est mis en évidence)
 */
function uiChoisir(el) {
  UI.courant = el;
  if (el && typeof VIS.options.choix === 'function') {
    try { VIS.options.choix(modId(el), { type: modType(el), nom: xtAttr(el, 'name') || '', couche: modCouche(el) }); } catch (e) { console.error(e); }
  }
  return true;
}

/** Sans objet dans la visionneuse (pas de panneau de détail ni d'arborescence). */
function uiAfficherLiaisons() {}
/** Sans objet dans la visionneuse. */
function uiMajEtat() {}
/** Sans objet dans la visionneuse. */
function arbOnglet() {}

/**
 * Décode un fichier en UTF-8.
 * @param {ArrayBuffer} buf octets
 * @returns {string}
 */
function arcDecoder(buf) { return new TextDecoder('utf-8').decode(buf); }

/** Lecture seule : aucune écriture. */
async function arcEcrirePoignee() { throw new Error(_L('Visionneuse en lecture seule')); }
/** Lecture seule : aucun téléchargement de .aird. */
function arcTelecharger() {}

/** Lecture seule : bouton « Mise en page » masqué. */
function eddMajBarre() { const b = $('vd-edition'); if (b) b.hidden = true; const o = $('vd-outils'); if (o) o.hidden = true; }
/** Lecture seule : pas de poignées. */
function eddCalque() {}
/**
 * Haut du contenu de chaque conteneur (place du titre).
 * @param {object} scene scène
 * @returns {Map<object,number>}
 */
function eddHautContenu(scene) {
  const m = new Map();
  for (const f of scene.formes) if (f.parent && f.genre !== 'port') m.set(f.parent, Math.min(m.get(f.parent) ?? Infinity, f.y));
  return m;
}
/** Lecture seule : aucun geste d'édition. @returns {boolean} */
function eddDebut() { return false; }
/** Lecture seule. @returns {boolean} */
function eddMouvement() { return false; }
/** Lecture seule. @returns {boolean} */
function eddFin() { return false; }
/** Lecture seule. */
function eddVider() {}

/* ── src/js/57-vue-diagramme.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   57. VUE DIAGRAMME — diagrammes existants du .aird (lecture seule)
   ───────────────────────────────────────────────────────────────────────
   Ouverture du .aird à côté du .capella, liste des représentations (onglet
   « Diagrammes »), dessin SVG d'après la notation GMF (positions de Capella),
   zoom à la molette, déplacement en glissant, sélection synchronisée avec
   l'arborescence et le détail. Rubrique « Diagrammes » du détail d'un élément.
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la vue diagramme. */
const VD = {
  aird: null,            // résultat de diaLire, ou null
  nom: '',               // nom du fichier .aird
  noms: new Map(),       // id d'élément → nom au chargement du .aird (pour suivre les renommages)
  presences: new Map(),  // id d'élément du modèle → représentations où il est dessiné (Parts rattachées à leur composant)
  rep: null,             // représentation affichée
  historique: [],        // diagrammes quittés par une référence de séquence : { uid, vb, selection } (« Retour »)
  vb: null,              // fenêtre visible { x, y, w, h } en coordonnées du diagramme
  selection: '',         // id de l'élément sélectionné dans le diagramme
  filtre: '',            // filtre de la liste des diagrammes
  ponts: true,           // ponts de croisement des liens (Line Jumps)
  theme: 'capella',      // thème du diagramme : « capella », « clair », « sombre »
  degrades: new Map(),   // dégradés du dernier dessin (thème Capella) : clé → identifiant
  police: '',            // police des textes du dernier dessin (mesure des largeurs)
  images: new Map(),     // images propres au projet : chemin → data URL, '' en cours de lecture, null introuvable
  trouves: [],           // résultats de la recherche dans le diagramme : formes et liens
  iTrouve: -1,           // résultat courant
  requete: '',           // texte cherché (normalisé)
  carte: false,          // mini-carte affichée
  masques: { ports: false, etiquettes: false, notes: false, types: new Set(), cats: new Set() },   // filtres d'affichage
  chaine: '',            // chaîne fonctionnelle ou chemin physique mis en évidence (id), ou ''
  tableau: null,         // tableau affiché (diaTableau), ou null pour un dessin
  replies: new Set(),    // lignes repliées du tableau affiché (uid)
  parcours: [],          // diagrammes ouverts, dans l'ordre (précédent / suivant : Alt+← / Alt+→)
  iParcours: -1,         // position dans le parcours
  recents: []            // derniers diagrammes ouverts (uid), le plus récent d'abord
};

/** Oublie le .aird (nouveau modèle ouvert). */
function vdReinitialiser() {
  VD.aird = null; VD.nom = ''; VD.noms = new Map(); VD.presences = new Map(); VD.rep = null; VD.selection = '';
  VD.images = new Map();
  VD.poignee = null; VD.aEnregistrer = false;
  vdFermer();
  vdListe();
}

/** Ouvre la boîte de dialogue de choix du .aird. */
async function vdOuvrirDialogue() {
  if (!ARC.doc) { uiToast(_L('Ouvrez d\'abord le modèle .capella.'), true); return; }
  if (!window.showOpenFilePicker) { $('entree-aird').click(); return; }
  let h;
  try {
    [h] = await window.showOpenFilePicker({ types: [{ description: _L('Diagrammes Capella'), accept: { 'application/xml': ['.aird'] } }] });
  } catch (e) {
    if (e.name !== 'AbortError') $('entree-aird').click();
    return;
  }
  await vdChargerFichier(await h.getFile(), h);
}

/**
 * Charge un fichier .aird (diagrammes du modèle ouvert). Les mises en page non enregistrées d'un
 * .aird déjà ouvert sont abandonnées (après confirmation).
 * @param {File} f fichier
 * @param {FileSystemFileHandle|null} [poignee] accès direct pour l'enregistrement sur place
 */
/**
 * Recalcule les présences des éléments du modèle dans les représentations (VD.presences : une Part compte pour son
 * composant), après un changement du .aird qui en retire ou en remet.
 */
function vdIndexerPresences() {
  VD.presences = new Map();
  if (!VD.aird) return;
  for (const [id, reps] of VD.aird.presences) {
    const m = vdIdModele(id);
    if (!VD.presences.has(m)) VD.presences.set(m, new Set());
    for (const r of reps) VD.presences.get(m).add(r);
  }
}

async function vdChargerFichier(f, poignee) {
  if (!ARC.doc) { uiToast(_L('Ouvrez d\'abord le modèle .capella.'), true); return; }
  const enAttente = ED.faites.some(op => op.type === 'diagramme' || op.type === 'groupe' || op.type === 'insertion') || VD.aEnregistrer;
  if (enAttente && !confirm(_L('Des mises en page de diagrammes ne sont pas enregistrées. Les abandonner ?'))) return;
  try {
    const t0 = performance.now();
    const aird = diaLire(arcDecoder(await f.arrayBuffer()));
    ED.faites = ED.faites.filter(op => op.type !== 'diagramme'); ED.defaites = ED.defaites.filter(op => op.type !== 'diagramme');
    VD.aird = aird; VD.nom = f.name; VD.rep = null; VD.selection = '';
    VD.poignee = poignee || null; VD.dateDisque = f.lastModified; VD.tailleDisque = f.size; VD.aEnregistrer = false;
    VD.noms = new Map(); VD.presences = new Map();
    for (const [id, reps] of aird.presences) {
      const el = ARC.doc.parId.get(id);
      if (el) VD.noms.set(id, xtAttr(el, 'name') ?? '');
      const m = vdIdModele(id);
      if (!VD.presences.has(m)) VD.presences.set(m, new Set());
      for (const r of reps) VD.presences.get(m).add(r);
    }
    vdFermer();
    vdListe();
    arbOnglet('diagrammes');
    if (UI.courant) uiAfficherLiaisons(UI.courant);
    const nb = aird.reps.filter(r => r.genre !== 'tableau').length;
    // Le .aird cite le .capella qu'il décrit : avertir s'il ne s'agit pas du modèle ouvert
    const decode = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };
    const capella = aird.ressources.map(decode).filter(r => /\.(capella|melodymodeller)$/i.test(r));
    const norm = s => s.replace(/^.*\//, '').replace(/[\s_]+/g, ' ').toLowerCase();
    const autre = capella.length && !capella.some(r => norm(r) === norm(ARC.nom));
    uiMajEtat();
    uiToast(_Lp('{f} : {n} diagramme(s) lus en {ms} ms', { f: f.name, n: nb, ms: Math.round(performance.now() - t0) }) +
      (autre ? ' — ' + _Lp('attention, ce .aird décrit {m}', { m: capella.join(', ') }) : ''), !!autre);
  } catch (e) {
    uiToast(_Lp('Lecture du .aird impossible : {m}', { m: e.message }), true);
  }
}

/**
 * Enregistre le .aird s'il a été modifié (mise en page) : sur le fichier d'origine si l'accès direct est
 * disponible (avec contrôle de modification externe), sinon dans un fichier choisi ou par téléchargement.
 * Le texte écrit est relu (même nombre d'identifiants) puis devient la nouvelle référence.
 * @returns {Promise<{ok:boolean, message:string}>} ok faux si l'écriture a échoué ou a été abandonnée
 */
async function vdEnregistrer() {
  if (!VD.aird) return { ok: true, message: '' };
  const texte = xtEcrire(VD.aird.doc);
  if (texte === VD.aird.doc.src) return { ok: true, message: '' };
  try {
    const relu = xtLire(texte);
    if (relu.parId.size !== VD.aird.doc.parId.size) throw new Error(_Lp('Contrôle avant écriture du .aird : {a} identifiants relus au lieu de {b}. Diagrammes non enregistrés.', { a: relu.parId.size, b: VD.aird.doc.parId.size }));
  } catch (e) { VD.aEnregistrer = true; return { ok: false, message: e.message }; }
  let message = '', h = null;
  try {
    if (VD.poignee) {
      if (VD.poignee.requestPermission && (await VD.poignee.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error(_L('Écriture refusée par le navigateur'));
      const f = await VD.poignee.getFile();
      if ((f.lastModified !== VD.dateDisque || f.size !== VD.tailleDisque) &&
        !confirm(_L('Le .aird a été modifié sur le disque depuis son ouverture (par Capella ou par quelqu\'un d\'autre). L\'écraser quand même ?'))) {
        VD.aEnregistrer = true;
        return { ok: false, message: _L('Diagrammes non enregistrés.') };
      }
      await arcEcrirePoignee(VD.poignee, texte);
      h = VD.poignee;
      message = _Lp('Diagrammes enregistrés dans {f}', { f: VD.nom });
    } else if (window.showSaveFilePicker) {
      h = await window.showSaveFilePicker({ suggestedName: VD.nom, types: [{ description: _L('Diagrammes Capella'), accept: { 'application/xml': ['.aird'] } }] });
      await arcEcrirePoignee(h, texte);
      message = _Lp('Diagrammes enregistrés dans {f}', { f: h.name });
    } else {
      arcTelecharger(texte, VD.nom);
      message = _L('.aird téléchargé : remplacez celui du projet par ce fichier.');
    }
  } catch (e) {
    VD.aEnregistrer = true;
    return { ok: false, message: e.name === 'AbortError' ? _L('Diagrammes non enregistrés.') : _Lp('Diagrammes non enregistrés : {m}', { m: e.message }) };
  }
  // Le texte écrit devient la référence : .aird relu, diagramme affiché retrouvé, vue conservée
  const uid = VD.rep && VD.rep.uid, vb = VD.vb, affiche = VD.rep && !$('vue-diagramme').hidden;
  VD.aird = diaLire(texte);
  VD.presences = new Map();
  for (const [id, reps] of VD.aird.presences) {
    const m = vdIdModele(id);
    if (!VD.presences.has(m)) VD.presences.set(m, new Set());
    for (const r of reps) VD.presences.get(m).add(r);
  }
  VD.aEnregistrer = false;
  if (h) { VD.poignee = h; try { const f = await h.getFile(); VD.dateDisque = f.lastModified; VD.tailleDisque = f.size; } catch (e) { /* sans importance */ } }
  VD.rep = uid ? VD.aird.reps.find(r => r.uid === uid) || null : null;
  EDD.rep = VD.rep;
  if (VD.rep && affiche) { diaScene(VD.aird, VD.rep); vdRedessiner(); if (vb) { VD.vb = vb; vdAppliquerVue(); } }
  vdListe();
  return { ok: true, message };
}

/**
 * Identifiant de l'élément du modèle désigné par un élément de diagramme. Les diagrammes d'architecture
 * dessinent la Part d'un composant (élément technique) : elle désigne le composant qui la type ; une
 * instance de scénario (InstanceRole) désigne l'élément qu'elle représente, un état de ligne de vie
 * (InteractionState) la fonction ou l'état concerné.
 * @param {string} id identifiant de la cible Sirius
 * @returns {string}
 */
function vdIdModele(id) {
  const el = id && ARC.doc ? ARC.doc.parId.get(id) : null;
  if (!el) return id;
  const t = modType(el);
  // Part → composant qui la type ; instance d'un scénario → élément représenté (Part, fonction…) ;
  // état posé sur une ligne de vie → fonction ou état concerné
  const ref = t === 'Part' ? 'abstractType' : t === 'InstanceRole' ? 'representedInstance'
    : t === 'InteractionState' ? (xtAttr(el, 'relatedAbstractFunction') ? 'relatedAbstractFunction' : 'relatedAbstractState') : '';
  const cible = ref ? (xtAttr(el, ref) || '').replace(/^#/, '').split(' ')[0] : '';
  return cible && cible !== id && ARC.doc.parId.has(cible) ? vdIdModele(cible) : id;
}

/* ─────────────────────────────── Liste ─────────────────────────────── */

/**
 * Couche ARCADIA de l'élément cible d'une représentation ('' si inconnue).
 * @param {object} r représentation
 * @returns {string}
 */
function vdCouche(r) {
  const el = ARC.doc && ARC.doc.parId.get(r.cibleId);
  return el ? modCouche(el) : '';
}

/**
 * Pictogramme d'une représentation (type de diagramme, comme l'Activity Explorer de Capella ; génériques de Sirius en repli).
 * @param {object} r représentation
 * @param {number} [taille] côté en pixels
 * @returns {string} SVG
 */
function vdIconeDiagramme(r, taille) {
  return icoSvgSeul(icoDiagramme(r.sigle, r.genre, r.croise), taille || 16);
}

/**
 * Sigle affiché d'une représentation : celui du nom (« [SAB] … »), sinon celui du type.
 * @param {object} r représentation
 * @returns {string}
 */
function vdSigle(r) {
  const m = r.nom.match(/^\s*\[([^\]]{1,8})\]/);
  return m ? m[1] : r.sigle;
}

/** Affiche la liste des diagrammes du .aird (onglet « Diagrammes »), groupés par couche. */
function vdListe() {
  const ul = $('diag-liste');
  if (!ul) return;
  if (!VD.aird) {
    $('diag-info').textContent = ARC.doc ? _L('Aucun .aird ouvert : il se trouve à côté du .capella, dans le dossier du projet.') : '';
    ul.innerHTML = '';
    return;
  }
  const mots = VD.filtre.toLowerCase().split(/\s+/).filter(Boolean);
  const groupes = new Map();
  let n = 0;
  for (const r of VD.aird.reps) {
    const cle = (r.nom + ' ' + r.type + ' ' + vdSigle(r)).toLowerCase();
    if (mots.some(m => !cle.includes(m))) continue;
    const c = vdCouche(r);
    if (!groupes.has(c)) groupes.set(c, []);
    groupes.get(c).push(r);
    n++;
  }
  const ordre = ['OA', 'SA', 'LA', 'PA', 'EPBS', ''];
  $('diag-info').textContent = _Lp('{f} — {n} représentation(s)', { f: VD.nom, n });
  // Récents (sans filtre) : les derniers diagrammes ouverts, en tête de liste
  const recents = mots.length ? [] : VD.recents.map(u => VD.aird.reps.find(r => r.uid === u)).filter(Boolean);
  const ligne = (r, c) => `<li data-diag="${uiEsc(r.uid)}" class="${r === VD.rep ? 'actif' : ''}" title="${uiEsc(r.type)}">` +
    `<span class="diag-ico">${vdIconeDiagramme(r)}</span><span class="diag-sigle" data-c="${c}">${uiEsc(vdSigle(r))}</span><span class="diag-nom">${uiEsc(r.nom || '‹' + r.type + '›')}</span></li>`;
  ul.innerHTML = (recents.length > 1 ? `<li class="diag-groupe">🕘 ${uiEsc(_L('Récents'))} <span class="dim">${recents.length}</span></li>` + recents.map(r => ligne(r, vdCouche(r))).join('') : '') + ordre.filter(c => groupes.has(c)).map(c =>
    `<li class="diag-groupe"><span class="pastille" data-c="${c}">${c || '—'}</span> ${uiEsc(c ? vdNomCouche(c) : _L('Autres'))} <span class="dim">${groupes.get(c).length}</span></li>` +
    groupes.get(c).sort((a, b) => a.nom.localeCompare(b.nom)).map(r =>
      `<li data-diag="${uiEsc(r.uid)}" class="${r === VD.rep ? 'actif' : ''}" title="${uiEsc(r.type)}">` +
      `<span class="diag-ico">${vdIconeDiagramme(r)}</span><span class="diag-sigle" data-c="${c}">${uiEsc(vdSigle(r))}</span><span class="diag-nom">${uiEsc(r.nom || '‹' + r.type + '›')}</span></li>`).join('')
  ).join('');
}

/**
 * Nom d'une couche ARCADIA (texte affiché).
 * @param {string} c sigle de la couche
 * @returns {string}
 */
function vdNomCouche(c) {
  return { OA: _L('Analyse opérationnelle'), SA: _L('Analyse système'), LA: _L('Architecture logique'), PA: _L('Architecture physique'), EPBS: _L('EPBS') }[c] || c;
}

/* ─────────────────────────────── Ouverture ─────────────────────────────── */

/**
 * Ouvre une représentation dans le panneau central.
 * @param {string} uid identifiant du descripteur de représentation
 * @param {string} [semId] élément à mettre en évidence et à centrer
 */
function vdOuvrir(uid, semId) {
  const r = VD.aird && VD.aird.reps.find(x => x.uid === uid);
  if (!r) return;
  const tableau = r.genre === 'tableau' ? diaTableau(VD.aird, r) : null;
  const scene = tableau ? null : diaScene(VD.aird, r);
  if (!scene && !tableau) { uiToast(_L('Cette représentation n\'a pas de dessin enregistré dans le .aird.'), true); return; }
  VD.rep = r;
  // Parcours (précédent / suivant) et récents ; une navigation dans le parcours ne le modifie pas
  if (!VD.naviguer && VD.parcours[VD.iParcours] !== uid) { VD.parcours = VD.parcours.slice(0, VD.iParcours + 1).concat(uid); VD.iParcours = VD.parcours.length - 1; }
  VD.recents = [uid, ...VD.recents.filter(u => u !== uid)].slice(0, 6);
  VD.selection = semId || (UI.courant ? modId(UI.courant) : '') || '';
  $('vd-nom').textContent = r.nom;
  $('vd-sigle').textContent = vdSigle(r);
  $('vd-ico').innerHTML = vdIconeDiagramme(r);
  $('vd-sigle').dataset.c = vdCouche(r);
  $('vd-nom').title = r.type;
  const cible = ARC.doc.parId.get(r.cibleId);
  $('vd-cible').innerHTML = cible ? uiPuce(cible) : '';
  $('vd-onglet-nom').textContent = r.nom;
  $('vue-diagramme').classList.toggle('mode-tableau', !!tableau);
  if (tableau) {
    // Tableau : HTML à la place du dessin (ni zoom, ni thème de dessin, ni mise en page)
    VD.tableau = tableau; VD.vb = null;
    VD.replies = new Set(tableau.lignes.filter(l => l.replie).map(l => l.uid));
    $('vd-svg').innerHTML = '';
  } else {
    VD.tableau = null;
    $('vd-tableau').innerHTML = '';
    $('vd-svg').innerHTML = vdRendu(scene, vdTheme());
  }
  if (VD.rep !== EDD.rep) { EDD.rep = VD.rep; EDD.choix.clear(); EDD.lien = ''; }
  vdOnglet('diagramme');
  if (tableau) vdTableauRendu(); else vdAjuster();
  vdMarquer(VD.selection, !!semId);
  if (!tableau) vdChercher($('vd-chercher').value, false);
  if (!$('vd-filtres').hidden) vdPanneauFiltres();
  if (!tableau) vdListeChaines();
  vdListe();
  vdMajRetour();
  eddMajBarre(); eddCalque();
}

/** Ferme le diagramme affiché et revient au détail de l'élément. */
function vdFermer() {
  VD.rep = null;
  VD.historique = [];
  if (!$('centre-onglets')) return;
  VD.tableau = null;
  $('vd-svg').innerHTML = '';
  $('vd-tableau').innerHTML = '';
  $('centre-onglets').hidden = true;
  vdOnglet('detail');
  vdListe();
}

/**
 * Affiche le détail de l'élément ou le diagramme dans le panneau central.
 * @param {string} nom « detail » ou « diagramme »
 */
function vdOnglet(nom) {
  const diag = nom === 'diagramme' && !!VD.rep;
  $('panneau-detail').classList.toggle('mode-diagramme', diag);
  $('vue-diagramme').hidden = !diag;
  $('centre-onglets').hidden = !VD.rep;
  for (const b of $('centre-onglets').querySelectorAll('[data-centre]')) b.classList.toggle('actif', b.dataset.centre === (diag ? 'diagramme' : 'detail'));
}

/* ─────────────────────────────── Dessin ─────────────────────────────── */
/* Rendu propre à Arcature (pas une copie de Capella) : couleur selon la nature de l'élément,
   formes arrondies, liens adoucis, étiquettes en pastilles, thèmes clair et sombre. */

/** Couleurs de base par nature d'élément (teinte ; fonds, bords et textes en sont dérivés). */
const VD_NATURES = {
  fonction: '#12a26f', composant: '#3d6fe0', acteur: '#8b5cf6', materiel: '#d18a17', capacite: '#e0457b',
  etat: '#0ea1b5', donnee: '#6366f1', chaine: '#f2711c', execution: '#2f9fe0', fragment: '#7a8599',
  entree: '#12a26f', sortie: '#e5484d', message: '#5b6b85', note: '#d9a400', neutre: '#7a8599'
};

/** Couleurs du fond et des textes, par thème. */
const VD_THEMES = {
  clair: { toile: '#f6f8fc', surface: '#ffffff', texte: '#1d2433', doux: '#5d6679', ombre: 'rgba(30,40,70,.10)' },
  sombre: { toile: '#131621', surface: '#1b1f2d', texte: '#e7eaf3', doux: '#9aa3b8', ombre: 'rgba(0,0,0,.45)' }
};

/** Police des diagrammes (polices du système, aucune ressource externe). */
const VD_POLICE = "'Segoe UI Variable Text','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";

/**
 * Mélange deux couleurs hexadécimales.
 * @param {string} a couleur « #rrggbb »
 * @param {string} b couleur « #rrggbb »
 * @param {number} t part de b (0 → a, 1 → b)
 * @returns {string} « #rrggbb »
 */
function vdMelange(a, b, t) {
  const c = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const x = c(a), y = c(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/**
 * Palette d'une nature pour un thème : remplissage d'un nœud, d'un conteneur et de son en-tête, bord, texte.
 * Mémorisée par thème.
 * @param {string} nature clé de VD_NATURES
 * @param {boolean} sombre thème sombre
 * @returns {{k:string, noeud:string, conteneur:string, entete:string, bord:string, texte:string}}
 */
function vdCouleurs(nature, sombre) {
  const cle = (sombre ? 's:' : 'c:') + nature;
  vdCouleurs.cache = vdCouleurs.cache || new Map();
  if (vdCouleurs.cache.has(cle)) return vdCouleurs.cache.get(cle);
  const t = VD_THEMES[sombre ? 'sombre' : 'clair'];
  const k = sombre ? vdMelange(VD_NATURES[nature] || VD_NATURES.neutre, '#ffffff', 0.18) : (VD_NATURES[nature] || VD_NATURES.neutre);
  const c = {
    k,
    noeud: vdMelange(t.surface, k, sombre ? 0.24 : 0.13),
    conteneur: vdMelange(t.surface, k, sombre ? 0.08 : 0.045),
    entete: vdMelange(t.surface, k, sombre ? 0.17 : 0.11),
    bord: vdMelange(t.surface, k, sombre ? 0.72 : 0.62),
    texte: vdMelange(t.texte, k, sombre ? 0.12 : 0.28)
  };
  vdCouleurs.cache.set(cle, c);
  return c;
}

/**
 * Nature d'un élément de diagramme, d'après le type de l'élément représenté (et le modèle :
 * acteur, nature d'un composant physique) : elle donne sa couleur.
 * @param {object} f forme de la scène
 * @returns {string} clé de VD_NATURES
 */
function vdNature(f) {
  if (f.genre === 'note') return 'note';
  if (f.image === 'Actor' || f.image === 'Operator') return 'acteur';
  if (/Capability|Mission/.test(f.image)) return 'capacite';
  // Type de l'élément du modèle désigné (composant typant une Part, fonction d'un état de séquence…)
  const el = f.semId && ARC.doc ? ARC.doc.parId.get(vdIdModele(f.semId)) : null;
  const t = (f.genre !== 'port' && el ? modType(el) : '') || f.typeSem || '';
  if (/^FunctionInputPort$/.test(t) || f.image === 'FunctionInputPort' || f.image === 'CategoryInput') return 'entree';
  if (/^FunctionOutputPort$/.test(t) || f.image === 'FunctionOutputPort' || f.image === 'CategoryOutput') return 'sortie';
  if (/^PhysicalPort$/.test(t)) return 'materiel';
  if (/Port$/.test(t)) return 'composant';
  if (/^(Execution|ExecutionEnd)$/.test(t)) return 'execution';
  if (/CombinedFragment|InteractionOperand|InteractionUse/.test(t)) return 'fragment';
  if (/Capability|Mission/.test(t)) return 'capacite';
  if (/FunctionalChain|PhysicalPath/.test(t)) return 'chaine';
  if (/State|Mode|Region|Pseudo/.test(t)) return 'etat';
  if (/Class|DataType|Enumeration|ExchangeItem|Property|Union|Collection|NumericType|StringType|BooleanType|Interface/.test(t)) return 'donnee';
  if (/Function$|Activity$/.test(t)) return 'fonction';
  // Composants, entités, Parts, instances : acteur ou composant (nœud matériel en PA)
  if (el) {
    if (xtAttr(el, 'actor') === 'true') return 'acteur';
    if (xtAttr(el, 'nature') === 'NODE') return 'materiel';
  }
  if (/Component|Part|Entity|ConfigurationItem|InstanceRole|Actor|Role/.test(t)) return 'composant';
  return 'neutre';
}

/**
 * Nature d'un lien (couleur du trait).
 * @param {object} l lien de la scène
 * @returns {string} clé de VD_NATURES
 */
function vdNatureLien(l) {
  const t = l.typeSem || '';
  if (/FunctionalExchange/.test(t)) return 'fonction';
  if (/ComponentExchange/.test(t)) return 'composant';
  if (/PhysicalLink/.test(t)) return 'materiel';
  if (/SequenceMessage/.test(t)) return 'message';
  if (/Transition/.test(t)) return 'etat';
  if (/Association|Generalization|Property/.test(t)) return 'donnee';
  if (/FunctionalChain|PhysicalPath|Sequence/.test(t)) return 'chaine';
  if (/Involvement|Exploitation|Extend|Include/.test(t)) return 'capacite';
  return 'neutre';
}

/**
 * Coupe un texte en lignes tenant dans une largeur (estimation sans mesure DOM).
 * @param {string} texte texte (retours à la ligne conservés)
 * @param {number} largeur largeur disponible en pixels
 * @param {number} taille taille de police en pixels
 * @returns {string[]}
 */
function vdLignes(texte, largeur, taille) {
  const res = [];
  for (const para of String(texte).split(/\r?\n/)) {
    let l = '';
    for (const mot of para.split(/\s+/).filter(Boolean)) {
      if (!l) l = mot;
      else if (vdLargeur(l + ' ' + mot, taille) <= largeur) l += ' ' + mot;
      else { res.push(l); l = mot; }
      // Mot trop long pour la ligne : coupé où il déborde, comme Capella (« Announce / ment »)
      while (l.length > 1 && vdLargeur(l, taille) > largeur * 1.05) {
        let n = l.length - 1;
        while (n > 1 && vdLargeur(l.slice(0, n), taille) > largeur) n--;
        res.push(l.slice(0, n)); l = l.slice(n);
      }
    }
    res.push(l);
  }
  return res;
}

/**
 * Largeur d'un texte dans la police du diagramme : mesurée par le navigateur (canvas), sinon estimée.
 * @param {string} texte texte d'une ligne
 * @param {number} taille taille de police en pixels
 * @returns {number} largeur en pixels
 */
function vdLargeur(texte, taille) {
  if (vdLargeur.ctx === undefined) {
    vdLargeur.ctx = null;
    try {
      // jsdom (tests) ne dessine pas : estimation
      if (!/jsdom/i.test(navigator.userAgent)) { const c = document.createElement('canvas').getContext('2d'); if (c && c.measureText) vdLargeur.ctx = c; }
    } catch (e) { /* mesure indisponible */ }
  }
  const ctx = vdLargeur.ctx;
  if (!ctx) return diaLargeurTexte(texte, taille) * 0.93;
  ctx.font = `${taille}px ${VD.police || VD_POLICE}`;
  return ctx.measureText(String(texte)).width;
}

/**
 * Limite un nombre de lignes, la dernière terminée par « … » si du texte est coupé.
 * @param {string[]} lignes lignes
 * @param {number} n nombre maximal
 * @returns {string[]}
 */
function vdCouper(lignes, n) {
  if (lignes.length <= n) return lignes;
  const r = lignes.slice(0, Math.max(1, n));
  r[r.length - 1] = r[r.length - 1].replace(/\s*\S{0,3}$/, '') + '…';
  return r;
}

/**
 * Élément SVG <text> de plusieurs lignes.
 * @param {string[]} lignes lignes
 * @param {number} x abscisse (selon l'ancrage)
 * @param {number} y ordonnée de la première ligne de base
 * @param {{taille:number, poids?:number, italique?:boolean, couleur:string}} p police
 * @param {string} ancre « start », « middle » ou « end »
 * @param {string} [classe] classe CSS
 * @returns {string}
 */
function vdTexte(lignes, x, y, p, ancre, classe) {
  const h = p.taille * 1.25;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${p.taille}" fill="${p.couleur}" text-anchor="${ancre}"` +
    `${p.poids ? ` font-weight="${p.poids}"` : ''}${p.italique ? ' font-style="italic"' : ''}${classe ? ` class="${classe}"` : ''}>` +
    lignes.map((l, i) => `<tspan x="${x.toFixed(1)}" dy="${i ? h : 0}">${uiEsc(l)}</tspan>`).join('') + '</text>';
}

/**
 * Icône du libellé d'une forme ou d'un lien, comme Capella (Sirius affiche l'icône de l'élément représenté,
 * choisie par les décorateurs de Capella : icoVariante). Une instance de scénario montre celle de l'élément
 * qu'elle représente (composant, acteur, fonction…).
 * @param {object} x forme ou lien de la scène (icone : affichée selon la description Capella)
 * @returns {string} variante d'icône (icoSvg), ou ''
 */
function vdCleIcone(x) {
  if (!x.icone) return '';
  let el = x.semId && ARC.doc ? ARC.doc.parId.get(x.semId) : null;
  if (el && modType(el) === 'InstanceRole') el = icoCible(ARC.doc, el, 'representedInstance') || el;
  if (el) return icoVariante(el, ARC.doc);
  // Élément absent du modèle : type enregistré dans le .aird, sauf s'il ne fait que désigner un autre élément
  return /Part|InstanceRole|StateFragment|Allocation/.test(x.typeSem || '') ? '' : icoVarianteType(x.typeSem);
}

/**
 * Lignes de texte précédées d'une icône, comme les libellés de Capella (draw2d) : l'icône est centrée
 * verticalement sur le bloc de lignes ; le bloc est centré (ancre « middle »), ses lignes aussi, ou alignées
 * à gauche dans le bloc (titres des conteneurs).
 * @param {string[]} lignes lignes
 * @param {number} x abscisse d'ancrage
 * @param {number} y ligne de base de la première ligne
 * @param {{taille:number, couleur:string, poids?:number, italique?:boolean}} p police
 * @param {string} ancre « start », « middle » ou « end »
 * @param {string} classe classe CSS du texte, ou ''
 * @param {string} cle icône (icoCle), ou '' : texte seul
 * @param {boolean} [aGauche] lignes alignées à gauche dans le bloc centré
 * @returns {string} SVG
 */
function vdTexteIcone(lignes, x, y, p, ancre, classe, cle, aGauche) {
  if (!lignes.some(l => l.trim())) return '';             // libellé vide : ni texte ni icône
  const s = cle ? Math.round(p.taille * 1.2) : 0, e = cle ? s + 3 : 0;
  const bloc = aGauche && ancre === 'middle' && lignes.length > 1;
  // Largeur du bloc : celle de la ligne la plus large (l'icône se place à sa gauche)
  const w = Math.max(...lignes.map(l => vdLargeur(l, p.taille)));
  let xi = x, xt = x, at = ancre;
  if (ancre === 'start') xt = x + e;
  else if (ancre === 'end') xi = x - w - e;
  else { xi = x - (w + e) / 2; xt = bloc ? xi + e : x + e / 2; if (bloc) at = 'start'; }
  const milieu = y - p.taille * 0.36 + (lignes.length - 1) * p.taille * 0.625;     // milieu du bloc de lignes
  return (cle ? icoSvg(cle, xi, milieu - s / 2, s) : '') + vdTexte(lignes, xt, y, p, at, classe);
}

/**
 * Libellé affiché d'un élément de diagramme : le nom actuel de l'élément s'il était affiché tel quel
 * au chargement du .aird (suit les renommages faits ici), sinon le libellé enregistré par Capella.
 * @param {object} f forme ou lien de la scène
 * @returns {string}
 */
function vdLibelle(f) {
  if (f.semId && VD.noms.has(f.semId) && VD.noms.get(f.semId) === f.texte) {
    const el = ARC.doc.parId.get(f.semId);
    if (el) return xtAttr(el, 'name') ?? f.texte;
  }
  return f.texte;
}

/** Couleurs des ports dans le thème Capella (images de Capella : FunctionInputPort.svg, InFlowPort.svg…). */
const VD_PORTS_CAPELLA = {
  entree: '#c6480f', sortie: '#0a5d2e', flux: '#ffffff', fluxTrait: '#1a1d22', physique: '#fff59e', physiqueTrait: '#7b694f',
  standard: '#c08a88', standardTrait: '#2d1917', signe: '#ffffff'
};

/**
 * Port (image Capella posée sur un bord), orienté comme Capella selon le côté du parent (variantes _left,
 * _right, _top, _bottom des images) : dessiné pour le côté haut (intérieur = vers le bas), puis tourné.
 * - FunctionInputPort / CategoryInput : carré orange, triangle blanc vers l'intérieur ;
 * - FunctionOutputPort / CategoryOutput : carré vert, triangle blanc vers l'extérieur ;
 * - InFlowPort / OutFlowPort : carré blanc, chevron vers l'intérieur / l'extérieur ; FlowPort : carré blanc ;
 * - PhysicalPort : carré jaune ; StandardPortSmall : carré brun-rose ;
 * - StandardPort_provided / _required / _providedrequired : carré contre le composant, tige vers l'extérieur
 *   terminée par un rond (interface fournie) ou une demi-lune (interface requise).
 * @param {object} f forme du port (image, parent)
 * @param {object} p couleurs : thème Capella (VD_PORTS_CAPELLA), ou { fond, trait, signe, arrondi } (Arcature)
 * @returns {string} SVG
 */
function vdPort(f, p) {
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2, img = f.image;
  const angle = { haut: 0, droite: 90, bas: 180, gauche: 270 }[f.parent ? diaCotePort(f) : 'haut'];
  const capella = !!p.entree;
  // Repère local : carré de 16 × 16 centré, intérieur du parent vers le bas
  const g = contenu => `<g class="vd-c"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>` +
    `<g transform="translate(${cx} ${cy}) rotate(${angle}) scale(${(w / 16).toFixed(3)} ${(h / 16).toFixed(3)}) translate(-8 -8)">${contenu}</g></g>`;
  const carre = (fond, trait, ep) => `<rect x=".5" y=".5" width="15" height="15" rx="${capella ? 0 : p.arrondi * 16 / w}" fill="${fond}" stroke="${trait}" stroke-width="${ep}"/>`;
  const vers = { bas: 'M3.5 4.5H12.5L8 12Z', haut: 'M3.5 11.5H12.5L8 4Z' };
  if (/^(FunctionInputPort|CategoryInput)$/.test(img)) return g(carre(capella ? p.entree : p.fond, capella ? p.entree : p.trait, 1) + `<path d="${vers.bas}" fill="${p.signe}"/>`);
  if (/^(FunctionOutputPort|CategoryOutput)$/.test(img)) return g(carre(capella ? p.sortie : p.fond, capella ? p.sortie : p.trait, 1) + `<path d="${vers.haut}" fill="${p.signe}"/>`);
  if (/^(In|Out)?FlowPort$/.test(img)) {
    const fond = capella ? p.flux : p.fond, trait = capella ? p.fluxTrait : p.signe;
    const chevron = img === 'InFlowPort' ? 'M4 5L8 11L12 5' : img === 'OutFlowPort' ? 'M4 11L8 5L12 11' : '';
    return g(carre(fond, capella ? p.fluxTrait : p.trait, capella ? 2 : 1) + (chevron ? `<path d="${chevron}" fill="none" stroke="${trait}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : ''));
  }
  if (img === 'PhysicalPort') return g(carre(capella ? p.physique : p.fond, capella ? p.physiqueTrait : p.trait, 1));
  if (img === 'StandardPortSmall') return g(carre(capella ? p.standard : p.fond, capella ? p.standardTrait : p.trait, 1.2));
  // Port standard à interfaces : carré contre le composant (en bas), tige vers l'extérieur (en haut)
  const fond = capella ? p.standard : p.fond, trait = capella ? p.standardTrait : p.signe;
  const boite = `<rect x="5.5" y="10.5" width="5" height="5" fill="${fond}" stroke="${trait}" stroke-width=".7"/>`;
  const rond = (cx2, cy2) => `<circle cx="${cx2}" cy="${cy2}" r="2" fill="${fond}" stroke="${trait}" stroke-width=".7"/>`;
  const lune = (cx2, cy2) => `<path d="M${cx2 - 2.6} ${cy2 - 1.6}A2.6 2.6 0 0 0 ${cx2 + 2.6} ${cy2 - 1.6}" fill="none" stroke="${trait}" stroke-width="1"/>`;
  if (img === 'StandardPort_provided') return g(boite + `<path d="M8 10.5V4.5" stroke="${trait}" stroke-width=".9"/>` + rond(8, 2.6));
  if (img === 'StandardPort_required') return g(boite + `<path d="M8 10.5V4" stroke="${trait}" stroke-width=".9"/>` + lune(8, 4));
  if (img === 'StandardPort_providedrequired') return g(boite + `<path d="M8 10.5L4 4.5M8 10.5L12 4.5" stroke="${trait}" stroke-width=".9"/>` + lune(4, 4.5) + rond(12, 2.8));
  return g(boite);
}

/**
 * Image de Capella qui reprend en grand une icône d'élément : composants et acteurs des diagrammes de capacités
 * (core.ui.resources/icons/full/svg), fonctions de genre particulier (FunctionDuplicateDiagram…), liens physiques
 * des éléments de configuration. Dessinée avec l'icône d'Arcature de même nom, centrée, proportions conservées.
 * @param {object} f forme (image, bornes)
 * @returns {string} SVG, ou '' si l'image n'a pas d'icône correspondante
 */
function vdImageIcone(f) {
  const genre = /^Function(Duplicate|Gather|Route|Select|Split)Diagram$/.exec(f.image);
  const nom = genre ? 'FunctionKind_' + genre[1] : f.image;
  if (!nom || !ICO_DESSINS[nom]) return '';
  const t = Math.min(f.w, f.h);
  return `<g class="vd-c"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="transparent"/>` +
    icoSvg(nom, f.x + (f.w - t) / 2, f.y + (f.h - t) / 2, t) + '</g>';
}

/**
 * Image propre au projet (WorkspaceImage hors des plugins de Capella, ex. « Projet/images/info.jpg ») : lue dans
 * le dossier du projet ouvert (ARC.ressources), en data URL (l'export SVG la garde), puis le diagramme est redessiné.
 * Sans dossier, ou introuvable : pictogramme d'image.
 * @param {object} f forme (cheminImage, bornes)
 * @returns {string} SVG ('' si la forme n'est pas une image du projet)
 */
function vdImageProjet(f) {
  if (!f.cheminImage) return '';
  const { x, y, w, h } = f, url = VD.images.get(f.cheminImage);
  if (url) return `<g class="vd-c"><title>${uiEsc(f.cheminImage)}</title><image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></g>`;
  if (url === undefined && ARC.ressources) {
    VD.images.set(f.cheminImage, '');
    ARC.ressources.lire(f.cheminImage).then(b => new Promise(ok => {
      if (!b) { ok(null); return; }
      const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(b);
    })).then(u => { VD.images.set(f.cheminImage, u); if (u) vdRedessiner(); });
  }
  // Pictogramme d'image (cadre, montagne, soleil) : image absente ou en cours de lecture
  const t = Math.min(w, h) * 0.7, cx = x + w / 2, cy = y + h / 2;
  return `<g class="vd-c"><title>${uiEsc(_Lp('Image du projet : {c} (ouvrez le dossier du projet pour l\'afficher)', { c: f.cheminImage }))}</title>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>` +
    `<rect x="${cx - t / 2}" y="${cy - t * 0.38}" width="${t}" height="${t * 0.76}" rx="${t * 0.06}" fill="#f4f6fa" stroke="#8a94a8" stroke-width="${Math.max(1, t * 0.04)}"/>` +
    `<path d="M${cx - t * 0.4} ${cy + t * 0.3}L${cx - t * 0.12} ${cy - t * 0.05}L${cx + t * 0.05} ${cy + t * 0.14}L${cx + t * 0.18} ${cy + t * 0.02}L${cx + t * 0.4} ${cy + t * 0.3}Z" fill="#9fb0c8"/>` +
    `<circle cx="${cx + t * 0.22}" cy="${cy - t * 0.17}" r="${t * 0.08}" fill="#e3b341"/></g>`;
}

/**
 * Glyphe d'une image Capella (acteur, port, capacité, état…), redessiné dans le style d'Arcature.
 * @param {object} f forme
 * @param {object} c couleurs de la nature (vdCouleurs)
 * @param {object} t couleurs du thème (VD_THEMES)
 * @returns {string} SVG
 */
function vdGlyphe(f, c, t) {
  if (f.cheminImage) return vdImageProjet(f);
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
  switch (f.image) {
    case 'Actor': case 'Operator': {
      // Pastille ronde et silhouette
      const R = Math.min(w, h) / 2 - 1;
      return `<g class="vd-c"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.4"/>` +
        `<circle cx="${cx}" cy="${cy - R * 0.28}" r="${R * 0.24}" fill="${c.k}"/>` +
        `<path d="M${cx - R * 0.5} ${cy + R * 0.52}a${R * 0.5} ${R * 0.42} 0 0 1 ${R} 0Z" fill="${c.k}"/></g>`;
    }
    case 'Capability': case 'OperationalCapability':
      return `<ellipse class="vd-c" cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.4"/>`;
    case 'Mission':
      return `<path class="vd-c" d="M${x + h / 2} ${y}H${x + w - h / 2}L${x + w} ${cy}L${x + w - h / 2} ${y + h}H${x + h / 2}L${x} ${cy}Z" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.4" stroke-linejoin="round"/>`;
    case 'FunctionInputPort': case 'FunctionOutputPort': case 'CategoryInput': case 'CategoryOutput': case 'FlowPort': case 'InFlowPort':
    case 'OutFlowPort': case 'PhysicalPort': case 'StandardPortSmall': case 'StandardPort': case 'StandardPort_provided':
    case 'StandardPort_required': case 'StandardPort_providedrequired':
      return vdPort(f, { fond: c.k, trait: t.surface, signe: t.surface, arrondi: Math.min(3, w / 3) });
    case 'PhysicalLink':
      return `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(3, w / 3)}" fill="${c.k}" stroke="${t.surface}" stroke-width="1.4"/>`;
    case 'initialState':
      return `<circle class="vd-c" cx="${cx}" cy="${cy}" r="${r}" fill="${t.texte}"/>`;
    case 'finalState':
      return `<g class="vd-c"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.surface}" stroke="${t.texte}" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="${t.texte}"/></g>`;
    case 'handlelifeline':
      return `<rect class="vd-c" x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="2" fill="${t.doux}"/>`;
    case 'observation':
      return `<circle class="vd-c" cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="${t.surface}" stroke="${t.texte}" stroke-width="1.3"/>`;
    default: {
      const lettre = /history/i.test(f.image) ? 'H' : /And/.test(f.image) ? '&' : /Iterate/.test(f.image) ? '↻' : /Fork|Join/.test(f.image) ? '|' : '';
      if (lettre) return `<g class="vd-c"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.4"/>` +
        `<text x="${cx}" y="${cy + r * 0.36}" font-size="${r}" font-weight="600" text-anchor="middle" fill="${c.texte}">${uiEsc(lettre)}</text></g>`;
      const icone = vdImageIcone(f);
      if (icone) return icone;
      return `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c.noeud}" stroke="${c.bord}" stroke-dasharray="4 3"/>`;
    }
  }
}

/**
 * Nom du scénario cité par une référence de séquence (InteractionUse), lu dans le modèle.
 * @param {object} f forme de la référence
 * @returns {string} nom, ou '' si le modèle ne le donne pas
 */
function vdScenarioCite(f) {
  const cite = vdElementCite(f);
  return cite ? xtAttr(cite, 'name') || '' : '';
}

/**
 * Scénario cité par une référence de séquence (InteractionUse), lu dans le modèle.
 * @param {object} f forme de la référence
 * @returns {object|null} élément du modèle, ou null
 */
function vdElementCite(f) {
  const el = f.semId && ARC.doc ? ARC.doc.parId.get(vdIdModele(f.semId)) : null;
  return (el && ARC.doc.parId.get((xtAttr(el, 'referencedScenario') || '').replace(/^#/, ''))) || null;
}

/**
 * Diagramme du scénario cité par une référence (le premier s'il y en a plusieurs).
 * @param {object} f forme de la référence
 * @returns {object|null} représentation, ou null
 */
function vdDiagrammeCite(f) {
  const cite = vdElementCite(f);
  return (cite && VD.aird && diaRepresentationsDe(VD.aird, modId(cite))[0]) || null;
}

/**
 * Ouvre le diagramme du scénario cité par une référence ; le diagramme courant et sa vue sont gardés
 * pour « Retour ».
 * @param {string} vue identifiant de la vue GMF de la référence
 * @returns {boolean} vrai si un diagramme a été ouvert
 */
function vdOuvrirReference(vue) {
  const f = VD.rep && VD.rep.scene && VD.rep.scene.formes.find(x => x.vue === vue);
  if (!f || (f.fragment !== 'reference' && !f.lienDiagramme)) return false;
  const r = f.lienDiagramme ? VD.aird.reps.find(x => x.uid === f.lienDiagramme) : vdDiagrammeCite(f);
  if (!r) { uiToast(_L('Le scénario cité n\'a pas de diagramme dans ce .aird.'), true); return true; }
  VD.historique.push({ uid: VD.rep.uid, vb: VD.vb ? { ...VD.vb } : null, selection: VD.selection });
  vdOuvrir(r.uid);
  return true;
}

/** Revient au diagramme quitté par une référence, avec sa vue et sa sélection. */
function vdRetour() {
  const h = VD.historique.pop();
  if (!h) return;
  vdOuvrir(h.uid, h.selection || undefined);
  if (h.vb) { VD.vb = h.vb; vdAppliquerVue(); }
}

/**
 * Diagramme précédent ou suivant dans le parcours (Alt+← / Alt+→), comme un navigateur.
 * @param {number} sens -1 précédent, +1 suivant
 */
function vdNaviguer(sens) {
  let i = VD.iParcours + sens;
  while (i >= 0 && i < VD.parcours.length && !(VD.aird && VD.aird.reps.some(r => r.uid === VD.parcours[i]))) i += sens;   // diagramme retiré : sauté
  if (i < 0 || i >= VD.parcours.length) return;
  VD.iParcours = i; VD.naviguer = true;
  try { vdOuvrir(VD.parcours[i]); } finally { VD.naviguer = false; }
}

/** Affiche le bouton « Retour » quand un diagramme a été ouvert depuis une référence. */
function vdMajRetour() {
  const b = $('vd-retour'), h = VD.historique[VD.historique.length - 1];
  b.hidden = !h;
  const r = h && VD.aird && VD.aird.reps.find(x => x.uid === h.uid);
  b.title = r ? _Lp('Revenir au diagramme « {nom} »', { nom: r.nom }) : '';
}

/**
 * SVG d'un fragment de séquence, comme dans Capella : fragment combiné et référence encadrés, opérateur
 * (LOOP, ALT, PAR…, « ref ») dans un onglet en haut à gauche, scénario cité au centre d'une référence ;
 * opérande sans cadre, séparé du précédent par un trait en tirets, garde en haut à gauche.
 * Le cadre ne capte les clics que sur son trait (les éléments couverts restent cliquables).
 * @param {object} f forme (f.fragment : « combine », « operande » ou « reference »)
 * @param {{trait:string, epaisseur:number, fond:string, onglet:string, lien:string, police:object}} st couleurs et police
 * @returns {{fig:string, lib:string}} figure et libellés
 */
function vdFragment(f, st) {
  const { x, y, w, h } = f, pol = st.police, taille = pol.taille;
  const clic = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="transparent" stroke-width="7" pointer-events="stroke"/>`;
  if (f.fragment === 'operande') {
    const sep = f.premier ? '' : `<path d="M${x} ${y}H${x + w}" stroke="${st.trait}" stroke-width="${st.epaisseur}" stroke-dasharray="6 4"/>`;
    const garde = vdLibelle(f).trim();
    return {
      fig: `<g class="vd-c">${clic}${sep}</g>`,
      lib: garde ? vdTexte([garde], x + 6, y + (f.premier ? 6 : 4) + taille, pol, 'start', 'vd-halo') : ''
    };
  }
  const op = f.operateur || '', lo = Math.max(36, vdLargeur(op, taille) * 1.1 + 18), ho = taille + 9;
  const fond = f.fragment === 'reference' ? st.fond : 'none';
  // Fond du fragment combiné (thème Capella : dégradé), en « multiply » pour laisser voir les lignes de vie
  const teinte = f.fragment === 'combine' && st.fondCombine ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.fondCombine}" style="mix-blend-mode:multiply" pointer-events="none"/>` : '';
  let fig = `<g class="vd-c">${teinte}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fond}" stroke="${st.trait}" stroke-width="${st.epaisseur}"${fond === 'none' ? ' pointer-events="stroke"' : ''}/>${clic}` +
    `<path d="M${x} ${y}H${x + lo}V${y + ho - 6}L${x + lo - 6} ${y + ho}H${x}Z" fill="${st.onglet}" stroke="${st.trait}" stroke-width="${st.epaisseur}"/></g>`;
  let lib = vdTexte([op], x + 7, y + ho / 2 + taille * 0.36, { ...pol, poids: st.poidsOperateur || 700 }, 'start');
  if (f.fragment === 'reference') {
    const nom = vdScenarioCite(f), cible = nom && vdDiagrammeCite(f);
    const texte = vdTexte(vdCouper(vdLignes(nom + (cible ? ' ↗' : ''), w - 20, taille), 2), x + w / 2, y + Math.max(ho, h / 2) + taille * 0.36,
      cible ? { ...pol, couleur: st.lien } : pol, 'middle', cible ? 'vd-lien-ref' : '');
    if (cible) lib += `<g data-ref="${uiEsc(f.vue)}"><title>${uiEsc(_Lp('Ouvrir le diagramme « {nom} »', { nom: cible.nom }))}</title>${texte}</g>`;
    else if (nom) lib += texte;
  }
  return { fig, lib };
}

/**
 * En-tête d'une note liée à un diagramme, comme Capella : pictogramme et nom du diagramme cité, centrés, en lien
 * (clic : ouvre le diagramme, « Retour » revient).
 * @param {object} f note (lienDiagramme)
 * @param {object} pol police
 * @param {string} couleur couleur du lien
 * @returns {{svg:string, h:number}} SVG et hauteur occupée
 */
function vdEnteteNote(f, pol, couleur) {
  const r = f.lienDiagramme && VD.aird ? VD.aird.reps.find(x => x.uid === f.lienDiagramme) : null;
  if (!r) return { svg: '', h: 0 };
  const lignes = vdCouper(vdLignes(r.nom, f.w - 30, pol.taille), 2);
  const svg = `<g data-ref="${uiEsc(f.vue)}"><title>${uiEsc(_Lp('Ouvrir le diagramme « {nom} »', { nom: r.nom }))}</title>` +
    vdTexteIcone(lignes, f.x + f.w / 2, f.y + pol.taille + 5, { ...pol, couleur }, 'middle', 'vd-lien-ref', icoDiagramme(r.sigle, r.genre, r.croise)) + '</g>';
  return { svg, h: lignes.length * pol.taille * 1.25 + 6 };
}

/**
 * Fin de vie d'une instance : petit carré, ou croix si un message de destruction y aboutit.
 * @param {object} f forme de fin de vie
 * @param {string} couleur couleur du trait
 * @returns {string} SVG
 */
function vdFinDeVie(f, couleur) {
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2;
  if (!f.detruite) return `<rect class="vd-c" x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" fill="${couleur}" fill-opacity=".55" stroke="${couleur}"/>`;
  const r = Math.max(w, h) * 0.8;
  return `<g class="vd-c"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="transparent"/>` +
    `<path d="M${cx - r} ${cy - r}L${cx + r} ${cy + r}M${cx + r} ${cy - r}L${cx - r} ${cy + r}" stroke="${couleur}" stroke-width="2" stroke-linecap="round"/></g>`;
}

/**
 * Groupe SVG d'une forme : figure, libellé, infobulle et attributs de sélection.
 * @param {object} f forme
 * @param {string} fig figure
 * @param {string} lib libellé
 * @param {string} texte libellé affiché (infobulle)
 * @returns {string}
 */
function vdGroupeForme(f, fig, lib, texte) {
  const el = f.semId && ARC.doc.parId.get(f.semId);
  return `<g class="vd-f vd-${f.genre}${f.semId && !el ? ' vd-absent' : ''}" data-v="${uiEsc(f.vue)}"${f.semId ? ` data-sem="${uiEsc(vdIdModele(f.semId))}"` : ''}>${fig}${lib}</g>`;
}

/**
 * Coupe un texte d'une ligne à une largeur, terminé par « … » s'il dépasse (estimation sans mesure DOM).
 * @param {string} texte texte
 * @param {number} largeur largeur disponible en pixels
 * @param {number} taille taille de police en pixels
 * @returns {string}
 */
function vdRogner(texte, largeur, taille) {
  if (vdLargeur(texte, taille) <= largeur) return texte;
  let n = texte.length - 1;
  while (n > 1 && vdLargeur(texte.slice(0, n) + '…', taille) > largeur) n--;
  return texte.slice(0, n).trimEnd() + '…';
}

/**
 * SVG d'une forme de la scène (figure et libellé).
 * @param {object} f forme
 * @param {string} theme thème du diagramme : « capella », « clair » ou « sombre »
 * @param {Map<object,number>} hautContenu forme → ordonnée du haut de son contenu (conteneurs non vides)
 * @returns {string}
 */
function vdForme(f, theme, hautContenu) {
  if (f.replie) return '';                            // élément replié (filtre de Capella) : non dessiné
  if (theme === 'capella') return vdFormeCapella(f, hautContenu);
  const sombre = theme === 'sombre', { x, y, w, h } = f, t = VD_THEMES[sombre ? 'sombre' : 'clair'];
  const nature = vdNature(f), c = vdCouleurs(nature, sombre);
  let pos = f.posTexte;
  const taille = Math.max(10.5, Math.min(f.police.taille, 14));
  const pol = { taille, couleur: c.texte, poids: 500, italique: f.police.italique };
  const ombre = !f.parent && /conteneur|noeud|liste/.test(f.genre) && f.figure !== 'vie' ? ' filter="url(#vd-ombre)"' : '';
  if (f.region) f = { ...f, posTexte: 'aucun' };      // région d'un état : sans titre dans les thèmes d'Arcature
  if (f.fragment) {
    const r = vdFragment(f, { trait: c.bord, epaisseur: 1.2, fond: t.surface, onglet: c.entete, lien: 'var(--vd-accent)', police: { ...pol, couleur: t.texte } });
    return vdGroupeForme(f, r.fig, r.lib, vdLibelle(f));
  }
  if (f.finDeVie) return vdGroupeForme(f, vdFinDeVie(f, t.doux), '', '');
  let fig = '', entete = 0, lignesTitre = null;
  const cle = vdCleIcone(f), ei = cle ? Math.round(taille * 1.2) + 3 : 0;   // icône du libellé et sa place
  if (f.genre === 'note') {
    const k = Math.min(12, w / 4, h / 4);
    fig = `<path class="vd-c" d="M${x + 4} ${y}H${x + w - k}L${x + w} ${y + k}V${y + h - 4}Q${x + w} ${y + h} ${x + w - 4} ${y + h}H${x + 4}Q${x} ${y + h} ${x} ${y + h - 4}V${y + 4}Q${x} ${y} ${x + 4} ${y}Z" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1"${ombre}/>` +
      `<path d="M${x + w - k} ${y}V${y + k}H${x + w}" fill="${c.entete}" stroke="${c.bord}" stroke-width="1" stroke-linejoin="round"/>`;
    pol.couleur = t.texte; pol.poids = 400;
  } else if (f.figure === 'image') fig = vdGlyphe(f, c, t);
  else if (f.figure === 'vie') fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>` +
    `<path d="M${x + w / 2} ${y}V${y + h}" stroke="${t.doux}" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="5 5" stroke-linecap="round"/>`;
  else if (f.genre === 'ligne') {
    fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="transparent"/>` +
      (cle ? '' : `<circle cx="${x + 6}" cy="${y + h / 2}" r="2" fill="${c.bord}"/>`);
    pol.couleur = t.texte; pol.poids = 400;
  } else if (f.figure === 'ellipse') fig = `<ellipse class="vd-c" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.3"${ombre}/>`;
  else if (f.figure === 'losange') fig = `<path class="vd-c" d="M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.3" stroke-linejoin="round"${ombre}/>`;
  else if (f.genre === 'port' && nature !== 'execution' && f.w > 16 && f.h > 16) {
    // Grand élément en bordure (état ou fonction sur une ligne de vie) : dessiné comme un nœud
    const r = Math.min(7, w / 4, h / 4);
    fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.3"/>`;
  } else if (f.genre === 'port') fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(3, w / 3)}" fill="${nature === 'execution' ? c.noeud : c.k}" stroke="${nature === 'execution' ? c.bord : t.surface}" stroke-width="${nature === 'execution' ? 1.2 : 1.4}"/>`;
  else if (f.genre === 'conteneur' && !hautContenu.has(f) && f.posTexte === 'haut' && nature !== 'fragment') {
    // Conteneur vide (composant sans sous-élément) : dessiné comme un nœud, nom centré et replié
    const r = Math.min(8, w / 4, h / 4);
    fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c.noeud}" stroke="${c.bord}" stroke-width="1.3"${ombre}/>`;
    pos = 'centre';
  } else if (f.genre === 'conteneur' || f.genre === 'liste') {
    const r = Math.min(10, w / 6, h / 4);
    // En-tête d'une ou deux lignes, selon la place laissée au-dessus du contenu
    lignesTitre = vdLignes(vdLibelle(f), w - 14 - ei, taille);
    const place = hautContenu.has(f) ? hautContenu.get(f) - y : h;
    if (lignesTitre.length > 1 && place < taille * 2.5 + 12) lignesTitre = vdCouper(lignesTitre, 1);
    lignesTitre = vdCouper(lignesTitre, 2);
    entete = f.posTexte === 'haut' ? lignesTitre.length * taille * 1.25 + 10 : 0;
    const tirets = nature === 'fragment' || (f.parent && f.parent.pile) ? ' stroke-dasharray="5 4"' : '';
    // Fragment de séquence (LOOP, ALT…) : contour seul
    fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${nature === 'fragment' ? 'transparent' : c.conteneur}" stroke="${c.bord}" stroke-width="1.2"${tirets}${ombre}/>`;
    if (entete && entete < h - 4) {
      // En-tête teinté, coins supérieurs arrondis
      fig += `<path d="M${x + 0.6} ${y + entete}V${y + r}Q${x + 0.6} ${y + 0.6} ${x + r} ${y + 0.6}H${x + w - r}Q${x + w - 0.6} ${y + 0.6} ${x + w - 0.6} ${y + r}V${y + entete}Z" fill="${c.entete}"/>` +
        `<path d="M${x} ${y + entete}H${x + w}" stroke="${c.bord}" stroke-opacity=".45" stroke-width="1"/>`;
    }
    pol.poids = 600;
  } else {
    const r = Math.min(7, w / 4, h / 4), fragment = nature === 'fragment';
    fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fragment ? 'transparent' : c.noeud}" stroke="${c.bord}" stroke-width="1.3"${fragment ? ' stroke-dasharray="5 4"' : ombre}/>`;
  }
  // Libellé
  const texte = vdLibelle(f);
  let lib = '';
  if ((texte || f.lienDiagramme) && pos !== 'aucun') {
    const ancre = f.alignTexte === 'gauche' ? 'start' : f.alignTexte === 'droite' ? 'end' : 'middle';
    const ax = ancre === 'start' ? x + 8 : ancre === 'end' ? x + w - 8 : x + w / 2;
    if (pos === 'haut') lib = vdTexteIcone(lignesTitre || vdCouper(vdLignes(texte, w - 14 - ei, taille), 1), ax, y + 5 + taille * 0.95, pol, ancre, '', cle);
    else if (pos === 'note') {
      const e = vdEnteteNote(f, pol, 'var(--vd-accent)');
      lib = e.svg + vdTexte(vdCouper(vdLignes(texte, w - 16, taille), Math.max(1, Math.floor((h - 8 - e.h) / (taille * 1.25)))), x + 8, y + e.h + taille + 5, pol, 'start');
    }
    else if (pos === 'centre') {
      // Ligne de liste (attribut, littéral) : coupée à la largeur de la liste, ou repliée si la scène lui a donné
      // la hauteur de plusieurs lignes (icône sur la première)
      const nl = Math.max(1, Math.floor((h - 4) / (taille * 1.25))), xl = x + (cle ? 4 : 13);
      const lignes = f.genre === 'ligne' ? (nl > 1 ? vdCouper(vdLignes(texte, w - 18 - ei, taille), nl) : [vdRogner(texte, w - 18 - ei, taille)])
        : vdCouper(vdLignes(texte, w - 10 - ei, taille), nl);
      const y0 = y + h / 2 - (lignes.length - 1) * taille * 0.625 + taille * 0.36;
      lib = f.genre === 'ligne' && lignes.length > 1
        ? vdTexteIcone([lignes[0]], xl, y0, pol, 'start', '', cle) + vdTexte(lignes.slice(1), xl + ei, y0 + taille * 1.25, pol, 'start')
        : vdTexteIcone(lignes, f.genre === 'ligne' ? xl : ancre === 'start' ? x + 6 : ax, y0, pol, f.genre === 'ligne' ? 'start' : ancre, '', cle);
    } else if (pos === 'bord') lib = vdTexte([texte], x + f.tx, y + f.ty + taille, { taille: taille - 1, couleur: t.doux, poids: 500 }, 'start', 'vd-halo');
    else {
      const e = diaEtiquetteExterne(f);
      lib = vdTexteIcone(e.uneLigne ? [texte] : vdCouper(vdLignes(texte, Math.max(w + 40, 120), taille), 3), e.x, e.y + taille, { ...pol, couleur: t.texte }, e.ancre, 'vd-halo', cle);
    }
  }
  return vdGroupeForme(f, fig, lib, texte);
}

/** Rayon des ponts de croisement (Line Jumps). */
const VD_PONT = 4;

/**
 * Chemin SVG d'une ligne brisée aux angles arrondis, avec des ponts de croisement.
 * @param {number[][]} p points
 * @param {number} rayon rayon maximal des angles
 * @param {Map<number,number[]>} [ponts] segment → distances (depuis son début) où sauter un autre lien
 * @returns {string}
 */
function vdChemin(p, rayon, ponts) {
  const f = n => n.toFixed(1);
  // Rognage des segments par les arrondis : r[i] = longueur retirée de chaque côté du coude i
  const r = p.map((q, i) => {
    if (i === 0 || i === p.length - 1) return 0;
    const l1 = Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]), l2 = Math.hypot(p[i + 1][0] - q[0], p[i + 1][1] - q[1]);
    const v = Math.min(rayon, l1 / 2, l2 / 2);
    return v < 0.5 ? 0 : v;
  });
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, ay] = p[i], [bx, by] = p[i + 1], L = Math.hypot(bx - ax, by - ay);
    const ux = L ? (bx - ax) / L : 0, uy = L ? (by - ay) / L : 0, at = k => `${f(ax + ux * k)} ${f(ay + uy * k)}`;
    // Ponts : demi-cercle par-dessus l'autre lien (vers le haut, ou vers la gauche sur un segment vertical)
    const balayage = ux > 0.01 || (Math.abs(ux) <= 0.01 && uy < 0) ? 1 : 0;
    for (const t of (ponts && ponts.get(i)) || []) {
      if (t - VD_PONT <= r[i] + 1 || t + VD_PONT >= L - r[i + 1] - 1) continue;
      d += `L${at(t - VD_PONT)}A${VD_PONT} ${VD_PONT} 0 0 ${balayage} ${at(t + VD_PONT)}`;
    }
    if (i + 1 < p.length - 1 && r[i + 1]) {
      const [cx, cy] = p[i + 2], l2 = Math.hypot(cx - bx, cy - by);
      d += `L${at(L - r[i + 1])}Q${f(bx)} ${f(by)} ${f(bx + (cx - bx) / l2 * r[i + 1])} ${f(by + (cy - by) / l2 * r[i + 1])}`;
    } else d += `L${f(bx)} ${f(by)}`;
  }
  return d;
}

/**
 * Ponts de croisement : quand deux liens se croisent, celui dessiné après saute par-dessus l'autre.
 * @param {object[]} liens liens de la scène, dans l'ordre de dessin
 * @returns {Map<object, Map<number,number[]>>} lien → segment → distances des ponts
 */
function vdSauts(liens) {
  const segs = liens.map(l => {
    const r = [];
    for (let i = 0; i < l.points.length - 1; i++) {
      const [x1, y1] = l.points[i], [x2, y2] = l.points[i + 1];
      r.push([x1, y1, x2, y2, Math.hypot(x2 - x1, y2 - y1), Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2)]);
    }
    return r;
  });
  const res = new Map();
  for (let i = 1; i < liens.length; i++) {
    for (let s = 0; s < segs[i].length; s++) {
      const [ax, ay, bx, by, la, minx, maxx, miny, maxy] = segs[i][s];
      if (la < 3 * VD_PONT) continue;
      for (let j = 0; j < i; j++) {
        for (const [cx, cy, dx, dy, lc, minx2, maxx2, miny2, maxy2] of segs[j]) {
          if (maxx < minx2 || maxx2 < minx || maxy < miny2 || maxy2 < miny || lc < 1) continue;
          const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
          if (Math.abs(den) < 1e-9) continue;                    // segments parallèles
          const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
          // Croisement franc, loin des extrémités des deux segments (pas une jonction de liens)
          if (t * la < VD_PONT * 2 || (1 - t) * la < VD_PONT * 2 || u * lc < 2 || (1 - u) * lc < 2) continue;
          if (!res.has(liens[i])) res.set(liens[i], new Map());
          const m = res.get(liens[i]);
          if (!m.has(s)) m.set(s, []);
          m.get(s).push(t * la);
        }
      }
    }
  }
  for (const m of res.values()) for (const [k, ts] of m) {
    // Ponts triés, ceux trop proches fusionnés
    ts.sort((a, b) => a - b);
    m.set(k, ts.filter((t, n) => !n || t - ts[n - 1] > VD_PONT * 2.5));
  }
  return res;
}

/**
 * Pointe de flèche à l'extrémité d'un lien (décorations Sirius, dessin adouci).
 * @param {string} type décoration Sirius (InputArrow, OutputClosedArrow, FillDiamond…)
 * @param {number[]} p extrémité
 * @param {number[]} q point précédent (donne la direction)
 * @param {string} couleur couleur du trait
 * @param {string} fond couleur de fond (pointes creuses)
 * @returns {string} SVG
 */
function vdFleche(type, p, q, couleur, fond) {
  if (!type || type === 'NoDecoration') return '';
  let dx = p[0] - q[0], dy = p[1] - q[1];
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const L = 8.5, W = 4;
  const pt = (a, b) => `${(p[0] - dx * a - dy * b).toFixed(1)} ${(p[1] - dy * a + dx * b).toFixed(1)}`;
  let h = '';
  if (/Diamond/.test(type)) h += `<path d="M${pt(0, 0)}L${pt(L, W)}L${pt(2 * L, 0)}L${pt(L, -W)}Z" fill="${/FillDiamond/.test(type) ? couleur : fond}" stroke="${couleur}" stroke-width="1.2" stroke-linejoin="round"/>`;
  if (/Arrow/.test(type)) {
    // « Input » : la pointe touche l'extrémité ; « Output » : flèche inversée
    const inv = /^Output/.test(type);
    const a = inv ? pt(L, 0) : pt(0, 0), b1 = inv ? pt(0, W) : pt(L, W), b2 = inv ? pt(0, -W) : pt(L, -W);
    if (/Closed/.test(type) && !/Fill/.test(type)) h += `<path d="M${a}L${b1}L${b2}Z" fill="${fond}" stroke="${couleur}" stroke-width="1.2" stroke-linejoin="round"/>`;
    else h += `<path d="M${a}L${b1}Q${pt(L * 0.72, 0)} ${b2}Z" fill="${couleur}" stroke="${couleur}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  return h;
}

/**
 * Étiquette en pastille (fond arrondi) centrée sur un point.
 * @param {string} texte texte
 * @param {number} cx abscisse du centre
 * @param {number} cy ordonnée du centre
 * @param {number} taille taille de police
 * @param {object} c couleurs de la nature
 * @param {object} t couleurs du thème
 * @returns {string} SVG
 */
function vdPastille(texte, cx, cy, taille, c, t, cle) {
  const lignes = vdCouper(vdLignes(texte, 200, taille), 2), ei = cle ? Math.round(taille * 1.2) + 3 : 0;
  const lw = Math.max(...lignes.map(l => vdLargeur(l, taille))) + 12 + ei, lh = lignes.length * taille * 1.25 + 5;
  return `<rect x="${(cx - lw / 2).toFixed(1)}" y="${(cy - lh / 2).toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}" rx="${Math.min(lh / 2, 9)}" fill="${t.surface}" fill-opacity=".94" stroke="${c.bord}" stroke-opacity=".55" stroke-width=".8"/>` +
    vdTexteIcone(lignes, cx, cy - lh / 2 + taille + 1.5, { taille, couleur: c.texte, poids: 500 }, 'middle', '', cle);
}

/**
 * SVG d'une contrainte de durée de séquence : crochet vertical entre les deux instants observés
 * (repères en pointillés depuis les points d'observation), durée écrite à droite.
 * @param {object} l lien de la scène (l.duree)
 * @param {string} theme thème du diagramme : « capella », « clair » ou « sombre »
 * @returns {string}
 */
function vdDuree(l, theme) {
  const capella = theme === 'capella', t = capella ? VD_THEME_CAPELLA : VD_THEMES[theme === 'sombre' ? 'sombre' : 'clair'];
  const couleur = capella ? l.couleur : vdCouleurs('message', theme === 'sombre').bord;
  const [p0, p1, p2, p3] = l.points, k = 5;
  const d = `M${p1[0] - k} ${p1[1]}H${p1[0]}V${p2[1]}H${p2[0] - k}`;
  let h = `<path d="M${p0[0]} ${p0[1]}H${p1[0] - k}M${p3[0]} ${p3[1]}H${p2[0] - k}" stroke="${couleur}" stroke-width=".8" stroke-dasharray="1.5 3" fill="none"/>` +
    `<path class="vd-c" d="${d}" fill="none" stroke="${couleur}" stroke-width="1.4"/>` +
    `<path class="vd-zone-clic" d="${d}" fill="none" stroke="transparent" stroke-width="9" pointer-events="stroke"/>`;
  const texte = vdLibelle(l), taille = Math.max(10, l.police.taille);
  if (texte) {
    const [ex, ey] = diaEtiquetteReflexive(l.points);
    h += vdTexte([texte], ex, ey + taille * 0.36, { taille, couleur: capella ? l.police.couleur : t.texte, poids: 600 }, 'start', 'vd-halo');
  }
  const el = l.semId && ARC.doc.parId.get(l.semId);
  return `<g class="vd-l${l.semId && !el ? ' vd-absent' : ''}" data-v="${uiEsc(l.vue)}" data-s="${uiEsc(l.source.vue)}" data-c="${uiEsc(l.cible.vue)}"${vdAttrsFiltre(l)}` +
    `${l.semId ? ` data-sem="${uiEsc(vdIdModele(l.semId))}"` : ''}>${h}</g>`;
}

/**
 * SVG d'un lien de la scène (trait adouci, pointes, étiquettes en pastilles).
 * @param {object} l lien
 * @param {string} theme thème du diagramme : « capella », « clair » ou « sombre »
 * @param {Map<number,number[]>} [ponts] ponts de croisement du lien (vdSauts)
 * @returns {string}
 */
function vdLien(l, theme, ponts) {
  if (l.duree) return vdDuree(l, theme);
  if (theme === 'capella') return vdLienCapella(l, ponts);
  const sombre = theme === 'sombre', t = VD_THEMES[sombre ? 'sombre' : 'clair'], c = vdCouleurs(vdNatureLien(l), sombre);
  const p = l.points, d = vdChemin(p, 8, ponts), couleur = c.bord;
  const tirets = { dash: '6 5', dot: '1.5 4', dash_dot: '7 4 1.5 4' }[l.trait] || '';
  const ep = Math.min(3.5, 1.15 + (l.epaisseur - 1) * 0.6);
  let h = `<path class="vd-c" d="${d}" fill="none" stroke="${couleur}" stroke-width="${ep.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>` +
    `<path class="vd-zone-clic" d="${d}" fill="none" stroke="transparent" stroke-width="9" pointer-events="stroke"/>`;
  h += vdFleche(l.flecheCible, p[p.length - 1], p[p.length - 2], couleur, t.surface) + vdFleche(l.flecheSource, p[0], p[1], couleur, t.surface);
  const texte = vdLibelle(l), taille = Math.max(9.5, Math.min(l.police.taille - 0.5, 12));
  if (texte && l.reflexif) {
    const [ex, ey] = diaEtiquetteReflexive(p);
    h += vdTexteIcone([texte], ex + 2, ey + taille * 0.36, { taille, couleur: c.texte, poids: 500 }, 'start', 'vd-halo', vdCleIcone(l));
  } else if (texte) {
    const [ex, ey] = diaEtiquette(p, l.decalages.centre, 'centre');
    h += vdPastille(texte, ex, ey, taille, c, t, vdCleIcone(l));
  }
  const petit = { taille: taille - 0.5, couleur: t.doux, poids: 500 };
  if (l.texteDebut) { const [ex, ey] = diaEtiquette(p, l.decalages.debut, 'debut'); h += vdTexte([l.texteDebut], ex, ey, petit, 'middle', 'vd-halo'); }
  if (l.texteFin) { const [ex, ey] = diaEtiquette(p, l.decalages.fin, 'fin'); h += vdTexte([l.texteFin], ex, ey, petit, 'middle', 'vd-halo'); }
  const el = l.semId && ARC.doc.parId.get(l.semId);
  return `<g class="vd-l${l.semId && !el ? ' vd-absent' : ''}" data-v="${uiEsc(l.vue)}" data-s="${uiEsc(l.source.vue)}" data-c="${uiEsc(l.cible.vue)}"${vdAttrsFiltre(l)}` +
    `${l.semId ? ` data-sem="${uiEsc(vdIdModele(l.semId))}"` : ''}>${h}</g>`;
}

/* ─────────────────────────────── Thème Capella ─────────────────────────────── */
/* Rendu au plus près de Capella : couleurs, dégradés, bordures, polices et styles de traits enregistrés
   dans le .aird (Sirius), angles vifs ; lisibilité améliorée (texte net, étiquettes détourées, ponts). */

/** Couleurs du thème Capella (toile blanche, comme l'éditeur de diagrammes de Capella). */
const VD_THEME_CAPELLA = { toile: '#ffffff', surface: '#ffffff', texte: '#000000', doux: '#555555', ombre: 'rgba(0,0,0,0)' };

/** Police du thème Capella (celle de Capella sous Windows, sinon équivalentes du système). */
const VD_POLICE_CAPELLA = "'Segoe UI',Tahoma,system-ui,-apple-system,Arial,sans-serif";


/**
 * Identifiant du dégradé d'un conteneur (créé au besoin dans VD.degrades, écrit par vdDefsDegrades).
 * @param {object} f forme (fond, fond2, degrade)
 * @returns {string}
 */
function vdDegrade(f) {
  const cle = f.fond + '|' + f.fond2 + '|' + (f.degrade || 'horizontal');
  if (!VD.degrades.has(cle)) VD.degrades.set(cle, 'vdg' + VD.degrades.size);
  return VD.degrades.get(cle);
}

/**
 * Définitions SVG des dégradés utilisés par le dernier dessin.
 * @returns {string}
 */
function vdDefsDegrades() {
  // Dégradés des images de Capella (capacités, missions, sphères des pseudo-états, tête des acteurs)
  const fixes = '<radialGradient id="vd-g-beige" cx=".42" cy=".38" r=".62"><stop offset="0" stop-color="#fff6ec"/><stop offset=".55" stop-color="#ecd2b6"/><stop offset="1" stop-color="#c9935e"/></radialGradient>' +
    '<radialGradient id="vd-g-sphere" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#e8e8e8"/><stop offset=".45" stop-color="#6e6e6e"/><stop offset="1" stop-color="#111"/></radialGradient>' +
    '<radialGradient id="vd-g-tete" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e4edf2"/><stop offset="1" stop-color="#8ea6b4"/></radialGradient>';
  return fixes + [...VD.degrades].map(([cle, id]) => {
    const [a, b, sens] = cle.split('|');
    // Sirius : de la couleur de fond (en haut, à gauche) vers la couleur de premier plan (constaté sur captures de Capella)
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${sens === 'vertical' ? 0 : 1}" y2="${sens === 'vertical' ? 1 : 0}">` +
      `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  }).join('');
}

/**
 * Glyphe d'une image Capella (acteur, port, capacité, état…), dessiné sans ressource externe.
 * @param {object} f forme
 * @returns {string} SVG
 */
function vdGlypheCapella(f) {
  if (f.cheminImage) return vdImageProjet(f);
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
  // Ellipse beige en dégradé marquée d'un sigle (Mission.svg, Capability.svg…)
  const ovale = sigle => `<g class="vd-c"><ellipse cx="${cx}" cy="${cy}" rx="${w / 2 - 0.5}" ry="${h / 2 - 0.5}" fill="url(#vd-g-beige)" stroke="#5a3a1a" stroke-width="1"/>` +
    `<text x="${cx}" y="${cy + h * 0.17}" font-size="${(h * 0.5).toFixed(1)}" font-weight="900" text-anchor="middle" fill="#111" font-family="Arial Black,Arial,sans-serif">${sigle}</text></g>`;
  // Cercle blanc à bord épais marqué d'un mot (nœuds de contrôle)
  const rond = mot => `<g class="vd-c"><circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="#faf9f7" stroke="#000" stroke-width="${Math.max(1.5, r * 0.09).toFixed(2)}"/>` +
    `<text x="${cx}" y="${cy + r * 0.24}" font-size="${(r * (mot.length > 2 ? 0.62 : 0.72)).toFixed(1)}" font-weight="700" text-anchor="middle" fill="#000">${mot}</text></g>`;
  switch (f.image) {
    case 'Actor': {
      // Silhouette noire, tête gris-bleu (Actor.svg)
      const t = Math.min(w, h * 0.8), ep = Math.max(1.6, h * 0.035);
      return `<g class="vd-c" fill="none" stroke="#000" stroke-width="${ep.toFixed(2)}" stroke-linecap="round"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" stroke="none"/>` +
        `<circle cx="${cx}" cy="${y + t * 0.18}" r="${t * 0.15}" fill="url(#vd-g-tete)"/><path d="M${cx} ${y + t * 0.33}V${y + h * 0.62}M${cx - t * 0.32} ${y + h * 0.42}H${cx + t * 0.32}` +
        `M${cx} ${y + h * 0.62}L${cx - t * 0.27} ${y + h * 0.97}M${cx} ${y + h * 0.62}L${cx + t * 0.27} ${y + h * 0.97}"/></g>`;
    }
    case 'Operator': {
      // Opérateur (image de Capella : buste en veste bleue, casque) : redessiné simplement
      const t = Math.min(w, h);
      return `<g class="vd-c"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>` +
        `<path d="M${cx - t * 0.36} ${y + h}V${y + h * 0.78}Q${cx - t * 0.36} ${y + h * 0.55} ${cx} ${y + h * 0.55}Q${cx + t * 0.36} ${y + h * 0.55} ${cx + t * 0.36} ${y + h * 0.78}V${y + h}Z" fill="#3b78d8" stroke="#1d4f9a"/>` +
        `<circle cx="${cx}" cy="${y + h * 0.32}" r="${t * 0.22}" fill="#f6c58f" stroke="#b07a40"/>` +
        `<path d="M${cx - t * 0.22} ${y + h * 0.3}Q${cx} ${y + h * 0.02} ${cx + t * 0.22} ${y + h * 0.3}" fill="#9a5a20"/>` +
        `<path d="M${cx - t * 0.25} ${y + h * 0.36}Q${cx - t * 0.22} ${y + h * 0.5} ${cx - t * 0.08} ${y + h * 0.5}" fill="none" stroke="#333" stroke-width="${(t * 0.04).toFixed(2)}"/></g>`;
    }
    case 'Mission': return ovale('M');
    case 'Capability': return ovale('C');
    case 'CapabilityRealization': return ovale('Cr');
    case 'OperationalCapability': return ovale('OC');
    case 'ControlNode_And': return rond('AND');
    case 'ControlNode_Or': return rond('OR');
    case 'ControlNode_Iterate': return rond('IT');
    case 'FunctionInputPort': case 'FunctionOutputPort': case 'CategoryInput': case 'CategoryOutput': case 'FlowPort': case 'InFlowPort':
    case 'OutFlowPort': case 'PhysicalPort': case 'StandardPortSmall': case 'StandardPort': case 'StandardPort_provided':
    case 'StandardPort_required': case 'StandardPort_providedrequired':
      return vdPort(f, VD_PORTS_CAPELLA);
    case 'initialState':
      return `<circle class="vd-c" cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="url(#vd-g-sphere)" stroke="#000" stroke-width="${Math.max(1, r * 0.1).toFixed(2)}"/>`;
    case 'finalState':
      return `<g class="vd-c"><circle cx="${cx}" cy="${cy}" r="${r * 0.92}" fill="#fff" stroke="#000" stroke-width="${Math.max(1, r * 0.14).toFixed(2)}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="#000"/></g>`;
    case 'Pseudostate_deepHistory': case 'Pseudostate_shallowHistory':
      return `<g class="vd-c"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#vd-g-sphere)"/>` +
        `<text x="${cx}" y="${cy + r * 0.38}" font-size="${(r * 1.1).toFixed(1)}" font-weight="700" text-anchor="middle" fill="#fff">${/deep/.test(f.image) ? 'H*' : 'H'}</text></g>`;
    case 'handlelifeline':
      return `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="#bbb" stroke="#666"/>`;
    case 'observation':
      return `<circle class="vd-c" cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="#9a9a9a"/>`;
    default: {
      const icone = vdImageIcone(f);
      if (icone) return icone;
      return `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="#eee" stroke="#999" stroke-dasharray="3 2"/>`;
    }
  }
}

/**
 * SVG d'une forme dans le thème Capella : couleurs, dégradé, bordure et police enregistrés dans le .aird.
 * @param {object} f forme
 * @param {Map<object,number>} hautContenu forme → ordonnée du haut de son contenu
 * @returns {string}
 */
function vdFormeCapella(f, hautContenu) {
  if (f.replie) return '';                            // élément replié (filtre de Capella) : non dessiné
  const { x, y, w, h } = f;
  const taille = Math.max(10, f.police.taille);
  const pol = { taille, couleur: f.police.couleur, poids: f.police.gras ? 700 : 400, italique: f.police.italique };
  const trait = `stroke="${f.bord || 'none'}" stroke-width="${f.epBord}"`;
  if (f.fragment) {
    // Fragment combiné : dégradé horizontal de la couleur de fond vers celle de premier plan (comme Sirius)
    const fondCombine = f.fragment === 'combine' && f.fond2 ? `url(#${vdDegrade({ fond: f.fond, fond2: f.fond2, degrade: 'horizontal' })})` : '';
    const r = vdFragment(f, { trait: f.bord && f.bord !== 'none' ? f.bord : '#555', epaisseur: Math.max(1, f.epBord), fond: '#fff', onglet: '#fff', lien: '#1a5fb4',
      fondCombine, poidsOperateur: 400, police: { ...pol, couleur: '#000' } });
    return vdGroupeForme(f, r.fig, r.lib, vdLibelle(f));
  }
  if (f.finDeVie) return vdGroupeForme(f, vdFinDeVie(f, '#666'), '', '');
  let fig = '', pos = f.posTexte, lignesTitre = null;
  const cle = vdCleIcone(f), ei = cle ? Math.round(taille * 1.2) + 3 : 0;   // icône du libellé et sa place
  if (f.genre === 'note') {
    const k = Math.min(10, w / 4, h / 4);
    fig = `<path class="vd-c" d="M${x} ${y}H${x + w - k}L${x + w} ${y + k}V${y + h}H${x}Z" fill="${f.fond}" ${trait}/>` +
      (f.bord !== 'none' ? `<path d="M${x + w - k} ${y}V${y + k}H${x + w}" fill="none" ${trait}/>` : '');
  } else if (f.figure === 'image') fig = vdGlypheCapella(f);
  else if (f.figure === 'vie') fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>` +
    `<path d="M${x + w / 2} ${y}V${y + h}" stroke="#666" stroke-width="1.2" stroke-dasharray="6 4"/>`;
  else if (f.genre === 'ligne') fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`;
  else if (f.figure === 'ellipse') fig = `<ellipse class="vd-c" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${f.fond}" ${trait}/>`;
  else if (f.figure === 'losange') fig = `<path class="vd-c" d="M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z" fill="${f.fond}" ${trait}/>`;
  else if (f.genre === 'conteneur' || f.genre === 'liste') {
    const fragment = /CombinedFragment|InteractionOperand/.test(f.typeSem || ''), region = f.region;
    const fond = fragment ? 'transparent' : f.genre === 'conteneur' && f.fond2 ? `url(#${vdDegrade(f)})` : f.fond;
    const rx = f.arrondi ? ` rx="${Math.min(f.arrondi, w / 4, h / 4)}"` : '';
    // Ombre portée des conteneurs, comme Sirius (décalée de 3 en bas à droite)
    const ombre = fragment || region ? '' : `<rect x="${x + 3}" y="${y + 3}" width="${w}" height="${h}"${rx} fill="#000" opacity=".16" pointer-events="none"/>`;
    if (region) {
      // Région d'un état : pas de cadre ; trait plein sous le titre de l'état (première région), tirets entre régions
      const verticale = f.parent.pile === 'verticale', plein = f.premiere && verticale;
      const sep = verticale || f.premiere ? `M${x - 1} ${y}H${x + w + 1}` : `M${x} ${y}V${y + h}`;
      fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="${fond}"/>` +
        `<path d="${sep}" stroke="${f.parent.bord || f.bord}" stroke-width="${f.epBord}"${plein || (f.premiere && !verticale) ? '' : ' stroke-dasharray="5 4"'}/>`;
    } else fig = ombre + `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}"${rx} fill="${fond}" ${trait}${fragment ? ' stroke-dasharray="5 4"' : ''}/>`;
    if (f.genre === 'liste') fig += `<path d="M${x} ${y + taille + 8}H${x + w}" stroke="${f.bord}" stroke-width=".8"/>`;
    if (pos === 'haut') {
      // Titre replié sur autant de lignes que la place le permet : au-dessus du contenu, ou toute la hauteur
      // d'un conteneur vide (coupé par « … » au-delà)
      // Capella : marges étroites, et le titre se replie sur deux lignes même s'il empiète sur le contenu
      const place = hautContenu.has(f) ? hautContenu.get(f) - y : h;
      lignesTitre = f.genre === 'liste' ? [vdRogner(vdLibelle(f), w - 6 - ei, taille)]
        : vdCouper(vdLignes(vdLibelle(f), w - 6 - ei, taille), Math.max(2, Math.floor((place - 4) / (taille * 1.25))));
    }
  } else fig = `<rect class="vd-c" x="${x}" y="${y}" width="${w}" height="${h}" fill="${f.fond}" ${trait}/>`;
  // Libellé
  const texte = vdLibelle(f);
  let lib = '';
  if ((texte || f.lienDiagramme) && pos !== 'aucun') {
    const ancre = f.alignTexte === 'gauche' ? 'start' : f.alignTexte === 'droite' ? 'end' : 'middle';
    const ax = ancre === 'start' ? x + 5 : ancre === 'end' ? x + w - 5 : x + w / 2;
    if (pos === 'haut') lib = vdTexteIcone(lignesTitre, ax, y + taille + 3, pol, ancre, '', cle, true);
    else if (pos === 'note') {
      const e = vdEnteteNote(f, pol, '#1a5fb4');
      lib = e.svg + vdTexte(vdCouper(vdLignes(texte, w - 10, taille), Math.max(1, Math.floor((h - 6 - e.h) / (taille * 1.25)))), x + 5, y + e.h + taille + 3, pol, 'start');
    }
    else if (pos === 'centre') {
      const nl = Math.max(1, Math.floor((h - 4) / (taille * 1.25)));
      // Ligne de liste : repliée si la scène lui a donné la hauteur de plusieurs lignes (icône sur la première)
      const lignes = f.genre === 'ligne' ? (nl > 1 ? vdCouper(vdLignes(texte, w - 8 - ei, taille), nl) : [vdRogner(texte, w - 8 - ei, taille)])
        : vdCouper(vdLignes(texte, w - 6 - ei, taille), nl);
      const y0 = y + h / 2 - (lignes.length - 1) * taille * 0.625 + taille * 0.36;
      lib = f.genre === 'ligne' && lignes.length > 1
        ? vdTexteIcone([lignes[0]], x + 4, y0, pol, 'start', '', cle) + vdTexte(lignes.slice(1), x + 4 + ei, y0 + taille * 1.25, pol, 'start')
        : vdTexteIcone(lignes, f.genre === 'ligne' ? x + 4 : ancre === 'start' ? x + 4 : ax, y0, pol, f.genre === 'ligne' ? 'start' : ancre, '', cle);
    } else if (pos === 'bord') lib = vdTexte([texte], x + f.tx, y + f.ty + taille, pol, 'start', 'vd-halo');
    else {
      const e = diaEtiquetteExterne(f);
      lib = vdTexteIcone(e.uneLigne ? [texte] : vdCouper(vdLignes(texte, Math.max(w + 40, 120), taille), 3), e.x, e.y + taille, pol, e.ancre, 'vd-halo', cle);
    }
  }
  return vdGroupeForme(f, fig, lib, texte);
}

/**
 * Pointe de flèche Sirius, dessin d'origine (traits fins, pointes creuses ou pleines).
 * @param {string} type décoration Sirius (InputArrow, OutputClosedArrow, FillDiamond…)
 * @param {number[]} p extrémité
 * @param {number[]} q point précédent (donne la direction)
 * @param {string} couleur couleur du trait
 * @returns {string} SVG
 */
function vdFlecheCapella(type, p, q, couleur) {
  if (!type || type === 'NoDecoration') return '';
  let dx = p[0] - q[0], dy = p[1] - q[1];
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const L = 9, W = 4.5;
  const pt = (a, b) => `${(p[0] - dx * a - dy * b).toFixed(1)} ${(p[1] - dy * a + dx * b).toFixed(1)}`;
  let h = '';
  if (/Diamond/.test(type)) h += `<path d="M${pt(0, 0)}L${pt(L, W)}L${pt(2 * L, 0)}L${pt(L, -W)}Z" fill="${/FillDiamond/.test(type) ? couleur : '#fff'}" stroke="${couleur}"/>`;
  if (/Arrow/.test(type)) {
    // « Input » : la pointe touche l'extrémité ; « Output » : flèche inversée
    const inv = /^Output/.test(type);
    const a = inv ? pt(L, 0) : pt(0, 0), b1 = inv ? pt(0, W) : pt(L, W), b2 = inv ? pt(0, -W) : pt(L, -W);
    if (/Closed/.test(type)) h += `<path d="M${a}L${b1}L${b2}Z" fill="${/Fill/.test(type) ? couleur : '#fff'}" stroke="${couleur}"/>`;
    else h += `<path d="M${b1}L${a}L${b2}" fill="none" stroke="${couleur}"/>`;
  }
  return h;
}

/**
 * SVG d'un lien dans le thème Capella : couleur, épaisseur, style de trait et pointes enregistrés,
 * angles vifs, ponts de croisement, étiquettes détourées pour rester lisibles.
 * @param {object} l lien
 * @param {Map<number,number[]>} [ponts] ponts de croisement du lien (vdSauts)
 * @returns {string}
 */
function vdLienCapella(l, ponts) {
  const p = l.points, d = vdChemin(p, 0, ponts);
  const tirets = { dash: '6 4', dot: '2 3', dash_dot: '6 3 2 3' }[l.trait] || '';
  let h = `<path class="vd-c" d="${d}" fill="none" stroke="${l.couleur}" stroke-width="${l.epaisseur}"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>` +
    `<path class="vd-zone-clic" d="${d}" fill="none" stroke="transparent" stroke-width="9" pointer-events="stroke"/>`;
  h += vdFlecheCapella(l.flecheCible, p[p.length - 1], p[p.length - 2], l.couleur) + vdFlecheCapella(l.flecheSource, p[0], p[1], l.couleur);
  const texte = vdLibelle(l), pol = { taille: Math.max(10, l.police.taille), couleur: l.police.couleur, poids: l.police.gras ? 700 : 400, italique: l.police.italique };
  if (texte && l.reflexif) {
    const [ex, ey] = diaEtiquetteReflexive(p);
    h += vdTexteIcone([texte], ex, ey + pol.taille * 0.36, pol, 'start', 'vd-halo', vdCleIcone(l));
  } else if (texte) {
    const [ex, ey] = diaEtiquette(p, l.decalages.centre, 'centre'), cle = vdCleIcone(l);
    // Coupée à la largeur enregistrée par GMF (icône comprise), comme Capella ; centrée verticalement sur son point
    const largeur = l.largeurEtiquette ? Math.max(30, l.largeurEtiquette - (cle ? Math.round(pol.taille * 1.2) + 3 : 0)) : 220;
    const lignes = vdCouper(vdLignes(texte, largeur, pol.taille), 4);
    h += vdTexteIcone(lignes, ex, ey - (lignes.length - 1) * pol.taille * 0.625, pol, 'middle', 'vd-halo', cle);
  }
  if (l.texteDebut) { const [ex, ey] = diaEtiquette(p, l.decalages.debut, 'debut'); h += vdTexte([l.texteDebut], ex, ey, pol, 'middle', 'vd-halo'); }
  if (l.texteFin) { const [ex, ey] = diaEtiquette(p, l.decalages.fin, 'fin'); h += vdTexte([l.texteFin], ex, ey, pol, 'middle', 'vd-halo'); }
  const el = l.semId && ARC.doc.parId.get(l.semId);
  return `<g class="vd-l${l.semId && !el ? ' vd-absent' : ''}" data-v="${uiEsc(l.vue)}" data-s="${uiEsc(l.source.vue)}" data-c="${uiEsc(l.cible.vue)}"${vdAttrsFiltre(l)}` +
    `${l.semId ? ` data-sem="${uiEsc(vdIdModele(l.semId))}"` : ''}>${h}</g>`;
}

/**
 * Thème du diagramme choisi : « capella » (par défaut), « clair » ou « sombre ».
 * @returns {string}
 */
function vdTheme() { return VD.theme === 'clair' || VD.theme === 'sombre' ? VD.theme : 'capella'; }

/**
 * Choisit le thème du diagramme (mémorisé dans le navigateur) et redessine.
 * @param {string} theme « capella », « clair » ou « sombre »
 */
function vdChoisirTheme(theme) {
  VD.theme = theme === 'clair' || theme === 'sombre' ? theme : 'capella';
  try { localStorage.setItem('arcature-theme-diagramme', VD.theme); } catch (e) { /* stockage indisponible */ }
  $('vd-zone').dataset.theme = VD.theme;
  if ($('vd-theme').value !== VD.theme) $('vd-theme').value = VD.theme;
  vdRedessiner();
}

/**
 * Contenu SVG d'une scène : style, ombre, formes dans l'ordre de dessin, puis liens par-dessus.
 * @param {object} scene scène de diaScene
 * @param {string} theme thème du diagramme : « capella », « clair » ou « sombre »
 * @param {boolean} [fond] peint le fond de la toile (export)
 * @returns {string}
 */
function vdRendu(scene, theme, fond) {
  const t = theme === 'capella' ? VD_THEME_CAPELLA : VD_THEMES[theme === 'sombre' ? 'sombre' : 'clair'], c = scene.cadre;
  const sauts = VD.ponts ? vdSauts(scene.liens) : null;
  // Haut du contenu de chaque conteneur (hors ports) : vide → nom centré ; sinon place de l'en-tête
  const hautContenu = eddHautContenu(scene);
  VD.degrades = new Map();                           // dégradés des conteneurs (thème Capella), remplis au dessin
  VD.police = theme === 'capella' ? VD_POLICE_CAPELLA : VD_POLICE;   // police des textes (mesure des largeurs)
  const corps = scene.formes.map(f => vdForme(f, theme, hautContenu)).join('') +
    scene.liens.map(l => vdLien(l, theme, sauts && sauts.get(l))).join('');
  const halo = `.vd-halo{paint-order:stroke;stroke:${t.toile};stroke-width:3.5px;stroke-linejoin:round}`;
  return `<style>${halo}</style><defs><filter id="vd-ombre" x="-10%" y="-10%" width="120%" height="130%">` +
    `<feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-color="${t.ombre.replace(/rgba\((.*),[^,]*\)/, 'rgb($1)')}" flood-opacity="${t.ombre.replace(/.*,\s*([\d.]+)\)$/, '$1')}"/></filter>` +
    vdDefsDegrades() + `</defs>` +
    `<rect class="vd-fond" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${fond ? t.toile : 'transparent'}"/>` +
    `<g id="vd-dessin" font-family="${theme === 'capella' ? VD_POLICE_CAPELLA : VD_POLICE}">${corps}</g><g id="vd-calque"></g>`;
}

/** Redessine le diagramme affiché (changement de thème, renommage), en gardant la vue et la sélection. */
function vdRedessiner() {
  if (!VD.rep || !VD.rep.scene) return;
  $('vd-svg').innerHTML = vdRendu(VD.rep.scene, vdTheme());
  vdAppliquerVue();
  vdMarquer(VD.selection);
  vdSurlignerTrouves();
  vdAppliquerChaine();
  eddCalque();
}

/* ─────────────────────────────── Zoom et sélection ─────────────────────────────── */

/** Applique la fenêtre visible au SVG et affiche le zoom. */
function vdAppliquerVue() {
  const v = VD.vb, z = $('vd-zone');
  if (!v) return;
  // La fenêtre garde le rapport largeur / hauteur de la zone (barre d'outils affichée, fenêtre redimensionnée…) :
  // l'échelle est alors la même dans les deux sens, et un point de l'écran tombe sur le bon point du diagramme
  if (z.clientWidth && z.clientHeight) v.h = v.w * z.clientHeight / z.clientWidth;
  $('vd-svg').setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  const k = (z.clientWidth || 800) / v.w;
  $('vd-zoom').textContent = Math.round(k * 100) + ' %';
  if (EDD.actif) eddCalque();                         // poignées à taille constante à l'écran
  vdMajCarte();
}

/** Ajuste le zoom pour voir tout le diagramme. */
function vdAjuster() {
  const s = VD.rep && VD.rep.scene;
  if (!s) return;
  const z = $('vd-zone'), W = z.clientWidth || 800, H = z.clientHeight || 600, c = s.cadre;
  const k = Math.min(W / c.w, H / c.h, 1.5);
  VD.vb = { x: c.x + c.w / 2 - W / k / 2, y: c.y + c.h / 2 - H / k / 2, w: W / k, h: H / k };
  vdAppliquerVue();
}

/**
 * Zoome d'un facteur autour d'un point de l'écran (centre de la zone par défaut).
 * @param {number} f facteur (> 1 : rapproche)
 * @param {number} [px] abscisse dans la zone, en pixels
 * @param {number} [py] ordonnée dans la zone, en pixels
 */
function vdZoomer(f, px, py) {
  const v = VD.vb, z = $('vd-zone');
  if (!v) return;
  const W = z.clientWidth || 800, H = z.clientHeight || 600;
  const k = W / v.w;
  if ((k * f > 8 && f > 1) || (k * f < 0.05 && f < 1)) return;
  const ax = px == null ? W / 2 : px, ay = py == null ? H / 2 : py;
  const gx = v.x + ax / k, gy = v.y + ay / k;
  v.w /= f; v.h /= f;
  v.x = gx - ax / (k * f); v.y = gy - ay / (k * f);
  vdAppliquerVue();
}

/** Zoom 100 % (taille réelle de Capella), centré sur la vue actuelle. */
function vdTailleReelle() {
  const v = VD.vb, z = $('vd-zone');
  if (!v) return;
  vdZoomer(v.w / (z.clientWidth || 800));
}

/**
 * Met en évidence les représentations d'un élément dans le diagramme affiché.
 * @param {string} id identifiant de l'élément ('' pour effacer)
 * @param {boolean} [centrer] amène l'élément au centre de la vue
 * @returns {boolean} true si l'élément est dessiné dans le diagramme
 */
function vdMarquer(id, centrer) {
  VD.selection = id || '';
  if (VD.tableau) return vdMarquerTableau(VD.selection, centrer);
  const svg = $('vd-svg');
  svg.querySelectorAll('.vd-sel,.vd-proche,.vd-lie').forEach(g => g.classList.remove('vd-sel', 'vd-proche', 'vd-lie'));
  svg.classList.remove('vd-focus');
  if (!id || !VD.rep) return false;
  const gs = [...svg.querySelectorAll('[data-sem]')].filter(g => g.dataset.sem === id);
  gs.forEach(g => g.classList.add('vd-sel'));
  vdFocus(gs);
  if (centrer && gs.length && VD.vb) {
    const f = VD.rep.scene.formes.find(x => x.semId && vdIdModele(x.semId) === id);
    const l = !f && VD.rep.scene.liens.find(x => x.semId && vdIdModele(x.semId) === id);
    const c = f ? [f.x + f.w / 2, f.y + f.h / 2] : l ? diaPointSur(l.points, 0.5) : null;
    if (c) { VD.vb.x = c[0] - VD.vb.w / 2; VD.vb.y = c[1] - VD.vb.h / 2; vdAppliquerVue(); }
  }
  return gs.length > 0;
}

/**
 * Mode focus : autour des représentations choisies, met en avant leurs liens (y compris ceux de leurs
 * ports), les éléments à l'autre bout et leurs conteneurs ; le reste du diagramme est estompé.
 * @param {Element[]} gs groupes SVG des représentations choisies
 */
function vdFocus(gs) {
  if (!gs.length) return;
  const svg = $('vd-svg'), scene = VD.rep.scene;
  const parVue = new Map(scene.formes.map(f => [f.vue, f]));
  const choisies = new Set();
  for (const g of gs) {
    const f = g.dataset.v && parVue.get(g.dataset.v);
    if (f) { choisies.add(f); for (const p of scene.formes) if (p.parent === f && p.genre === 'port') choisies.add(p); }
  }
  const proches = new Set();
  const avecAncetres = f => { for (let p = f; p; p = p.parent) proches.add(p.vue); };
  choisies.forEach(avecAncetres);
  for (const g of svg.querySelectorAll('.vd-l')) {
    const s = parVue.get(g.dataset.s), c = parVue.get(g.dataset.c);
    const lie = g.classList.contains('vd-sel') || choisies.has(s) || choisies.has(c) ||
      (s && s.genre === 'port' && choisies.has(s.parent)) || (c && c.genre === 'port' && choisies.has(c.parent));
    if (!lie) continue;
    g.classList.add('vd-lie');
    for (const f of [s, c]) if (f) { avecAncetres(f); if (f.genre === 'port' && f.parent) avecAncetres(f.parent); }
  }
  for (const g of svg.querySelectorAll('.vd-f')) if (proches.has(g.dataset.v) && !g.classList.contains('vd-sel')) g.classList.add('vd-proche');
  svg.classList.add('vd-focus');
}

/**
 * Après le choix d'un élément (arborescence, recherche, détail) : le marque dans le diagramme
 * affiché ; s'il n'y est pas dessiné, revient au détail de l'élément.
 * @param {object|null} el nœud choisi
 */
function vdApresChoix(el) {
  if (!VD.rep || !$('vue-diagramme')) return;
  const id = el ? modId(el) : '';
  if (id === VD.selection) return;
  if (!vdMarquer(id, false) && id && !$('vue-diagramme').hidden) vdOnglet('detail');
}

/**
 * Rubrique « Diagrammes » du détail d'un élément : représentations dont il est la cible
 * (comme sous l'élément dans le Project Explorer de Capella) et diagrammes où il est dessiné.
 * @param {object} el nœud
 * @returns {string} HTML ('' sans .aird ou sans diagramme)
 */
function vdRubrique(el) {
  if (!VD.aird) return '';
  const id = modId(el);
  const cibles = [...(VD.aird.cibles.get(id) || [])], presences = [...(VD.presences.get(id) || [])];
  if (!cibles.length && !presences.length) return '';
  const puce = r => `<a class="puce vd-lien" data-diag="${uiEsc(r.uid)}" data-sem="${uiEsc(id)}" title="${uiEsc(r.type)}">` +
    `<span class="puce-i">${vdIconeDiagramme(r, 14)}</span><span class="puce-t" data-c="${vdCouche(r)}">${uiEsc(vdSigle(r))}</span>${uiEsc(r.nom)}</a>`;
  const tri = l => l.sort((a, b) => a.nom.localeCompare(b.nom)).slice(0, UI_MAX_PUCES).map(puce).join('');
  return uiRubrique('diagrammes', _L('Diagrammes'), new Set([...cibles, ...presences]).size,
    (cibles.length ? uiGroupe(_L('Représentations de l\'élément'), tri(cibles)) : '') +
    (presences.length ? uiGroupe(_L('Dessiné dans'), tri(presences)) : ''), 'r-diagrammes');
}

/**
 * Télécharge un contenu sous un nom de fichier.
 * @param {Blob} blob contenu
 * @param {string} nom nom du fichier
 */
function vdTelecharger(blob, nom) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom.replace(/[\\/:*?"<>|]+/g, '_');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * SVG autonome du diagramme affiché, tel qu'il est vu : thème, filtres d'affichage et chaîne mise en évidence
 * compris (sélection, recherche et poignées exclues), tout le diagramme, fond peint.
 * @returns {string} document SVG
 */
function vdSvgExport() {
  const c = VD.rep.scene.cadre, theme = vdTheme();
  const t = theme === 'capella' ? VD_THEME_CAPELLA : VD_THEMES[theme === 'sombre' ? 'sombre' : 'clair'];
  const copie = $('vd-svg').cloneNode(true);
  copie.removeAttribute('id');
  copie.classList.remove('vd-focus');
  copie.querySelectorAll('.vd-sel,.vd-proche,.vd-lie,.vd-trouve,.vd-courant').forEach(g => g.classList.remove('vd-sel', 'vd-proche', 'vd-lie', 'vd-trouve', 'vd-courant'));
  const calque = copie.querySelector('#vd-calque'); if (calque) calque.remove();
  const fond = copie.querySelector('.vd-fond'); if (fond) fond.setAttribute('fill', t.toile);
  // Règles reprises de l'écran : filtres d'affichage, chaîne mise en évidence, couleurs d'accent
  const accent = theme === 'sombre' ? '#7aa7ff' : '#2f5fd0';
  const regles = `svg{--vd-accent:${accent};--vd-chaine:#1f6feb}\n` + $('vd-filtres-style').textContent.replace(/#vd-svg/g, 'svg') +
    '\nsvg.vd-mode-chaine .vd-f:not(.vd-chaine):not(.vd-chaine-proche),svg.vd-mode-chaine .vd-l:not(.vd-chaine){opacity:.22}' +
    '\nsvg .vd-chaine>.vd-c,svg .vd-chaine>.vd-c>*{stroke:#1f6feb;stroke-width:2.6px}\nsvg .vd-l.vd-chaine>path.vd-c{stroke:#1f6feb;stroke-width:3px}';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${c.x} ${c.y} ${c.w} ${c.h}" width="${Math.round(c.w)}" height="${Math.round(c.h)}"` +
    `${copie.classList.contains('vd-mode-chaine') ? ' class="vd-mode-chaine"' : ''}><style>${regles}</style>${copie.innerHTML}</svg>`;
}

/** Télécharge le diagramme affiché en SVG (tel qu'il est vu). */
function vdExporterSvg() {
  if (!VD.rep || !VD.rep.scene) return;
  vdTelecharger(new Blob([vdSvgExport()], { type: 'image/svg+xml' }), (VD.rep.nom || 'diagramme') + '.svg');
}

/**
 * Télécharge le diagramme affiché en PNG (SVG dessiné dans un canevas).
 * @param {number} echelle 1 (taille réelle) ou 2 (haute définition)
 */
function vdExporterPng(echelle) {
  if (!VD.rep || !VD.rep.scene) return;
  const c = VD.rep.scene.cadre, w = Math.round(c.w * echelle), h = Math.round(c.h * echelle);
  if (w * h > 120e6) { uiToast(_L('Diagramme trop grand pour une image PNG à cette échelle : exportez en SVG.'), true); return; }
  const img = new Image(), url = URL.createObjectURL(new Blob([vdSvgExport()], { type: 'image/svg+xml' }));
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    cv.toBlob(b => { if (b) vdTelecharger(b, (VD.rep.nom || 'diagramme') + '.png'); else uiToast(_L('Export PNG impossible dans ce navigateur.'), true); }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); uiToast(_L('Export PNG impossible dans ce navigateur.'), true); };
  img.src = url;
}

/**
 * Imprime le diagramme (ou le tableau) affiché sur une page ajustée, avec son nom : l'impression du navigateur
 * permet aussi d'enregistrer en PDF.
 */
function vdImprimer() {
  if (!VD.rep) return;
  const contenu = VD.tableau ? $('vd-tableau').innerHTML : vdSvgExport();
  const paysage = VD.tableau ? true : VD.rep.scene.cadre.w >= VD.rep.scene.cadre.h;
  const styleTableau = VD.tableau ? 'table{border-collapse:collapse;font:10px sans-serif}th,td{border:1px solid #bbb;padding:2px 4px;white-space:nowrap}' +
    'thead th{background:#eee}.vt-pli{display:none}.vt-ico{display:inline-flex;vertical-align:-3px;margin-right:3px}' : 'svg{width:100%;height:auto;max-height:180mm}';
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>${uiEsc(VD.rep.nom)}</title><style>@page{size:A4 ${paysage ? 'landscape' : 'portrait'};margin:10mm}` +
    `body{margin:0;font:12px sans-serif;color:#000;background:#fff}h1{font-size:13px;margin:0 0 6px}${styleTableau}</style></head>` +
    `<body><h1>${uiEsc(VD.rep.nom)}</h1>${contenu}</body></html>`;
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.onload = () => {
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { uiToast(_L('Impression impossible dans ce navigateur.'), true); }
    setTimeout(() => f.remove(), 60000);
  };
  f.srcdoc = page;
}

/** Remplit le menu « Exporter » selon la vue (diagramme ou tableau). */
function vdMenuExport() {
  const opt = (k, t) => `<button class="vf-case" data-export="${k}">${uiEsc(t)}</button>`;
  $('vd-export').innerHTML = VD.tableau
    ? opt('csv', _L('CSV (tableur)')) + opt('imprimer', _L('Imprimer / PDF…'))
    : opt('svg', _L('SVG (vectoriel)')) + opt('png', _L('PNG, taille réelle')) + opt('png2', _L('PNG, haute définition (×2)')) + opt('imprimer', _L('Imprimer / PDF…'));
}

/* ─────────────────────────────── Recherche, zoom sur un élément, mini-carte ─────────────────────────────── */

/**
 * Texte normalisé pour la recherche : minuscules, sans accents.
 * @param {string} t texte
 * @returns {string}
 */
function vdNormaliser(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Cherche un texte dans le diagramme affiché (libellés des formes et des liens) ; les résultats sont surlignés.
 * @param {string} q texte cherché ('' : efface)
 * @param {boolean} [aller] va au premier résultat (zoom et choix)
 */
function vdChercher(q, aller) {
  const s = VD.rep && VD.rep.scene, n = vdNormaliser(q).trim();
  VD.trouves = []; VD.iTrouve = -1; VD.requete = n;
  if (s && n) {
    for (const f of s.formes) if (!f.replie && f.figure !== 'vie' && vdNormaliser(vdLibelle(f)).includes(n)) VD.trouves.push(f);
    for (const l of s.liens) if (vdNormaliser(vdLibelle(l) + ' ' + (l.texteDebut || '') + ' ' + (l.texteFin || '')).includes(n)) VD.trouves.push(l);
    // Ordre de lecture : de haut en bas, de gauche à droite
    const centre = x => (x.points ? diaPointSur(x.points, 0.5) : [x.x + x.w / 2, x.y + x.h / 2]);
    VD.trouves.sort((a, b) => { const [ax, ay] = centre(a), [bx, by] = centre(b); return Math.abs(ay - by) > 10 ? ay - by : ax - bx; });
  }
  vdSurlignerTrouves();
  if (aller && VD.trouves.length) vdAllerTrouve(1);
  else vdMajTrouves();
}

/** Affiche le décompte des résultats (« 2 / 5 ») et l'état des boutons. */
function vdMajTrouves() {
  const n = VD.trouves.length, q = $('vd-chercher').value.trim();
  $('vd-trouves').textContent = !q ? '' : n ? `${VD.iTrouve + 1 || '–'} / ${n}` : '0';
  $('vd-chercher').classList.toggle('sans-resultat', !!q && !n);
  $('vd-precedent').disabled = $('vd-suivant').disabled = n < 1;
}

/** Surligne les résultats de la recherche (et le résultat courant) dans le dessin. */
function vdSurlignerTrouves() {
  const svg = $('vd-svg');
  svg.querySelectorAll('.vd-trouve,.vd-courant').forEach(g => g.classList.remove('vd-trouve', 'vd-courant'));
  const groupes = new Map([...svg.querySelectorAll('[data-v]')].map(g => [g.dataset.v, g]));
  VD.trouves.forEach((x, i) => { const g = groupes.get(x.vue); if (g) g.classList.add(i === VD.iTrouve ? 'vd-courant' : 'vd-trouve'); });
}

/**
 * Passe au résultat suivant ou précédent : zoom dessus et choix de l'élément (détail, arborescence).
 * @param {number} sens 1 (suivant) ou -1 (précédent)
 */
function vdAllerTrouve(sens) {
  const n = VD.trouves.length;
  if (!n) return;
  VD.iTrouve = ((VD.iTrouve < 0 && sens < 0 ? 0 : VD.iTrouve) + sens + n) % n;
  const x = VD.trouves[VD.iTrouve];
  vdZoomSur(x);
  vdSurlignerTrouves();
  vdMajTrouves();
  if (x.semId) {
    const id = vdIdModele(x.semId), el = ARC.doc.parId.get(id);
    VD.selection = id;
    if (el) uiChoisir(el);
    vdMarquer(id);
  }
}

/**
 * Cadre la vue sur une forme ou un lien : centré, assez grand pour être lu (zoom borné entre 60 % et 150 %).
 * @param {object} x forme ou lien de la scène
 */
function vdZoomSur(x) {
  const z = $('vd-zone'), W = z.clientWidth || 800, H = z.clientHeight || 600;
  let b;
  if (x.points) {
    const xs = x.points.map(p => p[0]), ys = x.points.map(p => p[1]);
    b = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  } else b = { x: x.x, y: x.y, w: x.w, h: x.h };
  const k = Math.max(0.6, Math.min(1.5, W / (b.w * 3 + 80), H / (b.h * 3 + 80)));
  VD.vb = { x: b.x + b.w / 2 - W / k / 2, y: b.y + b.h / 2 - H / k / 2, w: W / k, h: H / k };
  vdAppliquerVue();
}

/** Zoome sur l'élément choisi s'il est dessiné dans le diagramme (sa première représentation). */
function vdZoomChoix() {
  const s = VD.rep && VD.rep.scene, id = VD.selection;
  if (!s || !id) { uiToast(_L('Aucun élément choisi dans ce diagramme.'), true); return; }
  const x = s.formes.find(f => f.semId && vdIdModele(f.semId) === id && !f.replie) || s.liens.find(l => l.semId && vdIdModele(l.semId) === id);
  if (x) vdZoomSur(x); else uiToast(_L('L\'élément choisi n\'est pas dessiné dans ce diagramme.'), true);
}

/** Met à jour la mini-carte : tout le diagramme (dessin réutilisé par référence) et la partie visible. */
function vdMajCarte() {
  const c = $('vd-carte'), s = VD.rep && VD.rep.scene;
  if (!c) return;
  const masquee = !VD.carte || !s || !VD.vb;
  c.toggleAttribute('hidden', masquee);              // SVG : pas de propriété « hidden », l'attribut seulement
  if (masquee) return;
  const k = s.cadre, v = VD.vb;
  c.setAttribute('viewBox', `${k.x} ${k.y} ${k.w} ${k.h}`);
  if (!c.querySelector('use')) c.innerHTML = '<use href="#vd-dessin"/><rect class="vd-carte-vue"/>';
  const r = c.querySelector('rect');
  r.setAttribute('x', v.x); r.setAttribute('y', v.y); r.setAttribute('width', v.w); r.setAttribute('height', v.h);
}

/**
 * Affiche ou masque la mini-carte (choix mémorisé dans le navigateur).
 * @param {boolean} [etat] état voulu (bascule par défaut)
 */
function vdBasculerCarte(etat) {
  VD.carte = etat == null ? !VD.carte : !!etat;
  try { localStorage.setItem('arcature-carte', VD.carte ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
  $('vd-carte-bt').classList.toggle('actif', VD.carte);
  vdMajCarte();
}

/**
 * Déplace la vue vers un point de la mini-carte (clic ou glisser).
 * @param {PointerEvent} e événement sur la mini-carte
 */
function vdCarteAller(e) {
  const c = $('vd-carte'), s = VD.rep && VD.rep.scene;
  if (!s || !VD.vb) return;
  const r = c.getBoundingClientRect(), k = s.cadre;
  // Échelle « meet » : le diagramme est centré dans la mini-carte
  const e2 = Math.min(r.width / k.w, r.height / k.h), ox = (r.width - k.w * e2) / 2, oy = (r.height - k.h * e2) / 2;
  const x = k.x + (e.clientX - r.left - ox) / e2, y = k.y + (e.clientY - r.top - oy) / e2;
  VD.vb.x = x - VD.vb.w / 2; VD.vb.y = y - VD.vb.h / 2;
  vdAppliquerVue();
}

/* ─────────────────────────────── Filtres d'affichage ─────────────────────────────── */

/** Index des catégories d'échanges du document : id d'échange (ou de lien physique) → ids de ses catégories. */
const VD_CATEGORIES = new WeakMap();

/**
 * Catégories d'échanges du document ouvert (ExchangeCategory, ComponentExchangeCategory : « exchanges » ;
 * PhysicalLinkCategory : « links »), calculées une fois par document.
 * @returns {{parEchange:Map<string,string[]>, noms:Map<string,string>}}
 */
function vdCategories() {
  const doc = ARC.doc;
  let ix = doc && VD_CATEGORIES.get(doc);
  if (ix) return ix;
  ix = { parEchange: new Map(), noms: new Map() };
  if (doc) xtParcourir(doc.racine, el => {
    if (!/Category$/.test(modType(el))) return;
    const id = modId(el), refs = (xtAttr(el, 'exchanges') || xtAttr(el, 'links') || '').split(' ').filter(Boolean);
    ix.noms.set(id, modLibelle(el));
    for (const r of refs) { const e = r.replace(/^#/, ''); if (!ix.parEchange.has(e)) ix.parEchange.set(e, []); ix.parEchange.get(e).push(id); }
  });
  if (doc) VD_CATEGORIES.set(doc, ix);
  return ix;
}

/**
 * Type d'un lien pour les filtres : type de l'élément, « Note » pour l'attache d'une note.
 * @param {object} l lien de la scène
 * @returns {string}
 */
function vdTypeLien(l) { return l.attacheNote ? 'Note' : l.typeSem || ''; }

/**
 * Catégories d'un lien : celles de son échange, ou la sienne s'il représente une catégorie.
 * @param {object} l lien de la scène
 * @returns {string[]} identifiants
 */
function vdCategoriesLien(l) {
  if (!l.semId) return [];
  if (/Category$/.test(l.typeSem)) return [l.semId];
  return vdCategories().parEchange.get(l.semId) || [];
}

/**
 * Attributs des filtres sur le groupe d'un lien : type (data-t) et catégories (data-cat).
 * @param {object} l lien de la scène
 * @returns {string}
 */
function vdAttrsFiltre(l) {
  const c = vdCategoriesLien(l);
  return ` data-t="${uiEsc(vdTypeLien(l))}"${c.length ? ` data-cat="${uiEsc(c.join(' '))}"` : ''}`;
}

/**
 * Libellé lisible d'un type de lien (filtres).
 * @param {string} t type
 * @returns {string}
 */
function vdNomTypeLien(t) {
  return {
    FunctionalExchange: _L('Échanges fonctionnels'), ComponentExchange: _L('Échanges de composants'), PhysicalLink: _L('Liens physiques'),
    ExchangeCategory: _L('Catégories d\'échanges fonctionnels'), ComponentExchangeCategory: _L('Catégories d\'échanges de composants'),
    PhysicalLinkCategory: _L('Catégories de liens physiques'), ComponentPortAllocation: _L('Allocations de ports'), PortAllocation: _L('Allocations de ports'),
    Involvement: _L('Implications'), CapabilityInvolvement: _L('Implications'), MissionInvolvement: _L('Implications'),
    SequenceMessage: _L('Messages'), StateTransition: _L('Transitions'), Note: _L('Attaches des notes')
  }[t] || t;
}

/** Écrit les règles CSS des filtres d'affichage (masquage dans le dessin et la mini-carte). */
function vdAppliquerFiltres() {
  const m = VD.masques, r = [];
  if (m.ports) r.push('#vd-svg .vd-port{display:none}');
  if (m.notes) r.push('#vd-svg .vd-note{display:none}');
  if (m.etiquettes) r.push('#vd-svg .vd-l text,#vd-svg .vd-l .vd-icone{display:none}');
  const q = v => String(v).replace(/["\\]/g, '\\$&');      // valeur d'attribut entre guillemets
  for (const t of m.types) r.push(`#vd-svg .vd-l[data-t="${q(t)}"]{display:none}`);
  for (const c of m.cats) r.push(`#vd-svg .vd-l[data-cat~="${q(c)}"]{display:none}`);
  $('vd-filtres-style').textContent = r.join('\n');
  $('vd-filtres-bt').classList.toggle('actif', r.length > 0);
  try { localStorage.setItem('arcature-filtres', JSON.stringify({ ...m, types: [...m.types], cats: [...m.cats] })); } catch (e) { /* stockage indisponible */ }
}

/** Remplit le panneau des filtres d'après le diagramme affiché (types de liens et catégories présents). */
function vdPanneauFiltres() {
  const s = VD.rep && VD.rep.scene, m = VD.masques;
  if (!s) return;
  const compte = (cle, x) => cle.set(x, (cle.get(x) || 0) + 1);
  const types = new Map(), cats = new Map(), noms = vdCategories().noms;
  for (const l of s.liens) { const t = vdTypeLien(l); if (t) compte(types, t); for (const c of vdCategoriesLien(l)) compte(cats, c); }
  const nPorts = s.formes.filter(f => f.genre === 'port' && !f.replie).length, nNotes = s.formes.filter(f => f.genre === 'note').length;
  const caseFiltre = (cle, val, libelle, n, masque) => `<label class="vf-case"><input type="checkbox" data-filtre="${cle}" data-val="${uiEsc(val)}"${masque ? '' : ' checked'}> ` +
    `${uiEsc(libelle)}${n != null ? ` <span class="dim">(${n})</span>` : ''}</label>`;
  let h = `<div class="vf-titre">${uiEsc(_L('Afficher'))}</div>` +
    (nPorts ? caseFiltre('ports', '', _L('Ports'), nPorts, m.ports) : '') +
    caseFiltre('etiquettes', '', _L('Étiquettes des liens'), null, m.etiquettes) +
    (nNotes ? caseFiltre('notes', '', _L('Notes'), nNotes, m.notes) : '');
  if (types.size) h += `<div class="vf-titre">${uiEsc(_L('Liens'))}</div>` + [...types].sort((a, b) => vdNomTypeLien(a[0]).localeCompare(vdNomTypeLien(b[0])))
    .map(([t, n]) => caseFiltre('types', t, vdNomTypeLien(t), n, m.types.has(t))).join('');
  if (cats.size) h += `<div class="vf-titre">${uiEsc(_L('Catégories d\'échanges'))}</div>` + [...cats].sort((a, b) => (noms.get(a[0]) || '').localeCompare(noms.get(b[0]) || ''))
    .map(([c, n]) => caseFiltre('cats', c, noms.get(c) || c, n, m.cats.has(c))).join('');
  h += `<div class="vf-pied"><button class="bt bt-petit" data-filtre="tout">${uiEsc(_L('Tout afficher'))}</button></div>`;
  $('vd-filtres').innerHTML = h;
}

/**
 * Change un filtre d'après une case du panneau.
 * @param {HTMLElement} c case ou bouton (data-filtre, data-val)
 */
function vdChangerFiltre(c) {
  const m = VD.masques, cle = c.dataset.filtre;
  if (cle === 'tout') { m.ports = m.etiquettes = m.notes = false; m.types.clear(); m.cats.clear(); vdPanneauFiltres(); }
  else if (cle === 'types' || cle === 'cats') { if (c.checked) m[cle].delete(c.dataset.val); else m[cle].add(c.dataset.val); }
  else m[cle] = !c.checked;
  vdAppliquerFiltres();
}

/* ─────────────────────────────── Chaînes fonctionnelles et chemins physiques ─────────────────────────────── */

/** Types d'éléments mis en évidence comme chaînes (Capella : chaînes fonctionnelles, processus opérationnels, chemins physiques). */
const VD_TYPES_CHAINES = new Set(['FunctionalChain', 'OperationalProcess', 'PhysicalPath']);

/**
 * Éléments impliqués dans une chaîne fonctionnelle (fonctions, échanges, chaînes citées, récursivement) ou un
 * chemin physique (composants, liens physiques) ; une Part désigne son composant (vdIdModele).
 * @param {object} chaine élément FunctionalChain, OperationalProcess ou PhysicalPath
 * @param {Set<object>} [vus] chaînes déjà parcourues (références circulaires)
 * @returns {Set<string>} identifiants des éléments du modèle
 */
function vdElementsChaine(chaine, vus) {
  vus = vus || new Set();
  const res = new Set();
  if (vus.has(chaine)) return res;
  vus.add(chaine);
  for (const c of chaine.enfants) {
    if (c.tag !== 'ownedFunctionalChainInvolvements' && c.tag !== 'ownedPhysicalPathInvolvements') continue;
    const id = (xtAttr(c, 'involved') || '').replace(/^#/, '').split(' ')[0], el = id && ARC.doc.parId.get(id);
    if (!el) continue;
    if (VD_TYPES_CHAINES.has(modType(el))) for (const x of vdElementsChaine(el, vus)) res.add(x);   // chaîne citée
    else res.add(vdIdModele(id));
  }
  return res;
}

/**
 * Chaînes et chemins du modèle dont au moins un élément est dessiné dans le diagramme affiché.
 * @returns {Array<{el:object, ids:Set<string>, n:number}>} triées par nombre d'éléments dessinés
 */
function vdChainesDuDiagramme() {
  const s = VD.rep && VD.rep.scene;
  if (!s || !ARC.doc) return [];
  const dessines = new Set([...s.formes, ...s.liens].filter(x => x.semId).map(x => vdIdModele(x.semId)));
  const res = [];
  xtParcourir(ARC.doc.racine, el => {
    if (!VD_TYPES_CHAINES.has(modType(el))) return;
    const ids = vdElementsChaine(el);
    const n = [...ids].filter(id => dessines.has(id)).length;
    if (n || dessines.has(modId(el))) res.push({ el, ids, n });
  });
  return res.sort((a, b) => b.n - a.n || modLibelle(a.el).localeCompare(modLibelle(b.el)));
}

/** Remplit la liste des chaînes du diagramme affiché (masquée s'il n'y en a aucune). */
function vdListeChaines() {
  const sel = $('vd-chaine'), chaines = vdChainesDuDiagramme();
  if (VD.chaine && !chaines.some(c => modId(c.el) === VD.chaine)) VD.chaine = '';
  sel.hidden = !chaines.length;
  sel.innerHTML = `<option value="">${uiEsc(_L('Chaînes et chemins…'))}</option>` + chaines.map(c =>
    `<option value="${uiEsc(modId(c.el))}"${modId(c.el) === VD.chaine ? ' selected' : ''}>${uiEsc(modLibelle(c.el))} (${c.n})</option>`).join('');
  vdAppliquerChaine();
}

/**
 * Met en évidence la chaîne choisie (VD.chaine) : ses éléments et échanges, les ports qu'ils traversent ; les
 * conteneurs restent lisibles, le reste est estompé.
 */
function vdAppliquerChaine() {
  const svg = $('vd-svg');
  svg.querySelectorAll('.vd-chaine,.vd-chaine-proche').forEach(g => g.classList.remove('vd-chaine', 'vd-chaine-proche'));
  const el = VD.chaine && ARC.doc && ARC.doc.parId.get(VD.chaine);
  svg.classList.toggle('vd-mode-chaine', !!el);
  if (!el || !VD.rep || !VD.rep.scene) return;
  const ids = vdElementsChaine(el), scene = VD.rep.scene;
  const parVue = new Map(scene.formes.map(f => [f.vue, f])), groupes = new Map([...svg.querySelectorAll('[data-v]')].map(g => [g.dataset.v, g]));
  const marquer = (f, classe) => { const g = groupes.get(f.vue); if (g && !g.classList.contains('vd-chaine')) g.classList.add(classe); };
  const ancetres = f => { for (let p = f.parent; p; p = p.parent) marquer(p, 'vd-chaine-proche'); };
  for (const f of scene.formes) if (f.semId && ids.has(vdIdModele(f.semId))) { marquer(f, 'vd-chaine'); ancetres(f); }
  for (const l of scene.liens) {
    if (!l.semId || !ids.has(vdIdModele(l.semId))) continue;
    marquer(l, 'vd-chaine');
    // Ports aux extrémités de l'échange, et leurs propriétaires
    for (const f of [l.source, l.cible]) if (f) { const g = parVue.get(f.vue); if (g) { if (g.genre === 'port') marquer(g, 'vd-chaine'); ancetres(g); } }
  }
}

/* ─────────────────────────────── Infobulle ─────────────────────────────── */

/**
 * Contenu de l'infobulle d'un élément du diagramme : icône et nom, type et couche, chemin, extrait du résumé ou
 * de la description, principales liaisons, nombre de diagrammes où il est dessiné.
 * @param {string} id identifiant de l'élément du modèle
 * @returns {string} HTML ('' si l'élément est inconnu)
 */
function vdInfobulle(id) {
  const el = ARC.doc && ARC.doc.parId.get(id);
  if (!el) return `<div class="vb-titre">${uiEsc(_L('Élément absent du modèle ouvert'))}</div><div class="vb-ligne dim">${uiEsc(id)}</div>`;
  const ico = icoSvgSeul(icoVariante(el, ARC.doc), 16);
  const couche = modCouche(el);
  let h = `<div class="vb-titre">${ico}<span>${uiEsc(modLibelle(el))}</span></div>` +
    `<div class="vb-ligne dim">${uiEsc(modType(el))}${couche ? ' · ' + uiEsc(vdNomCouche(couche)) : ''}</div>`;
  const chemin = modChemin(el).slice(-2).map(modLibelle);
  if (chemin.length) h += `<div class="vb-ligne dim">${uiEsc(chemin.join(' › '))}</div>`;
  // Résumé, sinon début de la description (texte sans balises)
  const texte = (xtAttr(el, 'summary') || String(xtAttr(el, 'description') || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '')).replace(/\s+/g, ' ').trim();
  if (texte) h += `<div class="vb-texte">${uiEsc(texte.length > 220 ? texte.slice(0, 217) + '…' : texte)}</div>`;
  // Principales liaisons métier (quatre groupes, trois éléments chacun)
  const groupes = liaGroupes(uiLiaisons(), el).slice(0, 4);
  for (const g of groupes) {
    const noms = g.liens.slice(0, 3).map(l => modLibelle(l.autre)).join(', ') + (g.liens.length > 3 ? _Lp(' (+{n})', { n: g.liens.length - 3 }) : '');
    h += `<div class="vb-ligne"><b>${uiEsc(g.libelle)}</b> : ${uiEsc(noms)}</div>`;
  }
  const n = (VD.presences.get(id) || new Set()).size;
  if (n > 1) h += `<div class="vb-ligne dim">${uiEsc(_Lp('Dessiné dans {n} diagrammes', { n }))}</div>`;
  return h;
}

/**
 * Affiche l'infobulle d'un élément près du pointeur (dans la zone du diagramme), ou la masque.
 * @param {string} id identifiant de l'élément ('' : masque)
 * @param {number} [cx] abscisse du pointeur (écran)
 * @param {number} [cy] ordonnée du pointeur (écran)
 */
function vdMontrerBulle(id, cx, cy) {
  const b = $('vd-bulle');
  if (!id) { b.hidden = true; b.dataset.id = ''; return; }
  if (b.dataset.id !== id) { b.innerHTML = vdInfobulle(id); b.dataset.id = id; }
  b.hidden = false;
  const z = $('vd-zone').getBoundingClientRect();
  // Placée en bas à droite du pointeur, ramenée dans la zone
  let x = cx - z.left + 14, y = cy - z.top + 16;
  if (x + b.offsetWidth > z.width - 6) x = Math.max(6, cx - z.left - b.offsetWidth - 10);
  if (y + b.offsetHeight > z.height - 6) y = Math.max(6, cy - z.top - b.offsetHeight - 10);
  b.style.left = x + 'px'; b.style.top = y + 'px';
}

/* ─────────────────────────────── Tableaux ─────────────────────────────── */
/* Tableaux de Capella (croisés et d'édition) : libellés enregistrés dans le .aird, en-têtes de lignes en arbre
   repliable, en-têtes collants ; un clic choisit l'élément de la ligne, de la colonne ou de la cellule. */

/**
 * Icône de l'élément d'une ligne, d'une colonne ou d'une cellule de tableau.
 * @param {{semId:string, typeSem:string}} x entrée du tableau
 * @returns {string} HTML ('' sans icône)
 */
function vdTableauIcone(x) {
  const el = x.semId && ARC.doc ? ARC.doc.parId.get(x.semId) : null;
  const nom = el ? icoVariante(el, ARC.doc) : icoVarianteType(x.typeSem);
  const svg = nom ? icoSvgSeul(nom, 14) : '';
  return svg ? `<span class="vt-ico">${svg}</span>` : '';
}

/**
 * Attributs HTML d'une case de tableau : élément désigné (sélection), classes, infobulle.
 * @param {{semId:string, typeSem:string}} x entrée du tableau
 * @param {string} texte libellé (infobulle)
 * @param {string} classe classes propres à la case
 * @param {boolean} [enTete] en-tête de ligne ou de colonne : sans élément, il est périmé (tableau non rafraîchi)
 * @returns {string}
 */
function vdTableauSem(x, texte, classe, enTete) {
  const cl = [classe];
  let titre = texte;
  if (x.semId) {
    if (ARC.doc && !ARC.doc.parId.get(x.semId)) cl.push('vt-absent');
    titre = (texte ? texte + ' — ' : '') + x.typeSem;
  } else if (enTete) {
    cl.push('vt-absent');
    titre = _Lp('{nom} — élément absent du modèle (tableau à rafraîchir dans Capella)', { nom: texte });
  }
  return `${x.semId ? ` data-sem="${uiEsc(x.semId)}"` : ''} class="${cl.filter(Boolean).join(' ')}"${titre ? ` title="${uiEsc(titre)}"` : ''}`;
}

/**
 * Indique si une ligne du tableau est affichée : visible, et aucune ligne parente repliée.
 * @param {object} t tableau (diaTableau)
 * @param {number} i indice de la ligne
 * @returns {boolean}
 */
function vdLigneAffichee(t, i) {
  if (!t.lignes[i].visible) return false;
  for (let p = t.lignes[i].parent; p >= 0; p = t.lignes[p].parent) if (VD.replies.has(t.lignes[p].uid) || !t.lignes[p].visible) return false;
  return true;
}

/** Dessine le tableau affiché (VD.tableau) dans la vue, en gardant le défilement. */
function vdTableauRendu() {
  const t = VD.tableau, z = $('vd-tableau');
  if (!t) return;
  const cols = t.colonnes.filter(c => c.visible);
  const haut = z.scrollTop, gauche = z.scrollLeft;
  const largeur = (w, min) => `width:${Math.max(w || 0, min)}px;min-width:${Math.max(w || 0, min)}px;max-width:${Math.max(w || 0, min)}px`;
  let h = `<table class="vt"><thead><tr><th class="vt-coin" style="${largeur(t.largeurEntete, 160)}"></th>` +
    cols.map(c => `<th data-col="${uiEsc(c.uid)}" style="${largeur(c.largeur, 40)}"${vdTableauSem(c, c.texte, 'vt-col', !c.attribut)}>` +
      `${vdTableauIcone(c)}<span class="vt-t">${uiEsc(c.texte)}</span></th>`).join('') + '</tr></thead><tbody>';
  t.lignes.forEach((l, i) => {
    if (!vdLigneAffichee(t, i)) return;
    const pli = l.enfants ? `<button class="vt-pli" data-pli="${uiEsc(l.uid)}" title="${uiEsc(VD.replies.has(l.uid) ? _L('Déplier') : _L('Replier'))}">${VD.replies.has(l.uid) ? '▸' : '▾'}</button>` : '<span class="vt-pli"></span>';
    h += `<tr data-ligne="${i}"><th style="padding-left:${4 + l.profondeur * 14}px"${vdTableauSem(l, l.texte, 'vt-lig', true)}>${pli}${vdTableauIcone(l)}<span class="vt-t">${uiEsc(l.texte)}</span></th>` +
      cols.map(c => {
        const x = l.cellules.get(c.uid);
        return x ? `<td data-col="${uiEsc(c.uid)}"${vdTableauSem(x, x.texte, '')}>${uiEsc(x.texte)}</td>` : `<td data-col="${uiEsc(c.uid)}"></td>`;
      }).join('') + '</tr>';
  });
  h += '</tbody></table>';
  if (!t.lignes.length && !cols.length) h = `<p class="dim vt-vide">${uiEsc(_L('Ce tableau est vide.'))}</p>`;
  z.innerHTML = h;
  z.scrollTop = haut; z.scrollLeft = gauche;
  $('vd-zoom').textContent = '';
  $('vd-tableau-info').textContent = _Lp('{l} lignes · {c} colonnes', { l: t.lignes.filter(l => l.visible).length, c: cols.length });
}

/**
 * Replie ou déplie une ligne du tableau affiché.
 * @param {string} uid identifiant de la ligne
 */
function vdTableauPli(uid) {
  if (VD.replies.has(uid)) VD.replies.delete(uid); else VD.replies.add(uid);
  vdTableauRendu();
  vdMarquerTableau(VD.selection, false);
}

/**
 * Met en évidence un élément dans le tableau affiché : ses cases, et la ligne ou la colonne qu'il désigne.
 * @param {string} id identifiant de l'élément ('' pour effacer)
 * @param {boolean} [centrer] déplie ses lignes parentes et fait défiler jusqu'à lui
 * @returns {boolean} true si l'élément figure dans le tableau
 */
function vdMarquerTableau(id, centrer) {
  const z = $('vd-tableau'), t = VD.tableau;
  z.querySelectorAll('.vd-sel,.vt-axe').forEach(x => x.classList.remove('vd-sel', 'vt-axe'));
  if (!id || !t) return false;
  // Lignes repliées qui cachent l'élément : dépliées si on le demande
  const lignes = t.lignes.map((l, i) => (l.semId === id || [...l.cellules.values()].some(x => x.semId === id) ? i : -1)).filter(i => i >= 0);
  const present = lignes.length > 0 || t.colonnes.some(c => c.visible && c.semId === id);
  if (centrer && lignes.length && !lignes.some(i => vdLigneAffichee(t, i))) {
    for (let p = t.lignes[lignes[0]].parent; p >= 0; p = t.lignes[p].parent) VD.replies.delete(t.lignes[p].uid);
    vdTableauRendu();
  }
  const cases = [...z.querySelectorAll('[data-sem]')].filter(x => x.dataset.sem === id);
  for (const x of cases) {
    x.classList.add('vd-sel');
    if (x.classList.contains('vt-lig')) x.parentElement.classList.add('vt-axe');
    if (x.classList.contains('vt-col')) z.querySelectorAll(`td[data-col="${CSS.escape(x.dataset.col)}"]`).forEach(td => td.classList.add('vt-axe'));
  }
  if (centrer && cases.length) cases[0].scrollIntoView({ block: 'center', inline: 'center' });
  return present;
}

/** Télécharge le tableau affiché en CSV (UTF-8 avec BOM, lisible par un tableur). */
function vdExporterCsv() {
  if (!VD.tableau) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + diaTableauCsv(VD.tableau)], { type: 'text/csv;charset=utf-8' }));
  a.download = (VD.rep.nom || 'tableau').replace(/[\\/:*?"<>|]+/g, '_') + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Branche les commandes de la vue diagramme et de l'onglet « Diagrammes ». */
function vdInitialiser() {
  $('bt-ouvrir-aird').onclick = vdOuvrirDialogue;
  $('entree-aird').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) vdChargerFichier(f, null); };
  let minuterie;
  $('diag-filtre').oninput = () => { clearTimeout(minuterie); minuterie = setTimeout(() => { VD.filtre = $('diag-filtre').value; vdListe(); }, 120); };
  $('diag-liste').onclick = e => { const li = e.target.closest('[data-diag]'); if (li) vdOuvrir(li.dataset.diag); };
  $('centre-onglets').onclick = e => { const b = e.target.closest('[data-centre]'); if (b) vdOnglet(b.dataset.centre); };
  $('vd-fermer').onclick = vdFermer;
  $('vd-retour').onclick = vdRetour;
  $('vd-ajuster').onclick = vdAjuster;
  $('vd-reel').onclick = vdTailleReelle;
  $('vd-plus').onclick = () => vdZoomer(1.25);
  $('vd-moins').onclick = () => vdZoomer(1 / 1.25);
  // Menu « Exporter » : SVG, PNG, impression (PDF) ; CSV et impression pour un tableau
  $('vd-export-bt').onclick = e => { e.stopPropagation(); const m = $('vd-export'); m.hidden = !m.hidden; if (!m.hidden) vdMenuExport(); };
  $('vd-export').onclick = e => {
    e.stopPropagation();
    const b = e.target.closest('[data-export]');
    if (!b) return;
    $('vd-export').hidden = true;
    ({ svg: vdExporterSvg, png: () => vdExporterPng(1), png2: () => vdExporterPng(2), csv: vdExporterCsv, imprimer: vdImprimer })[b.dataset.export]();
  };
  document.addEventListener('click', () => { $('vd-export').hidden = true; });
  // Filtres d'affichage (mémorisés dans le navigateur)
  try {
    const f = JSON.parse(localStorage.getItem('arcature-filtres') || 'null');
    if (f) VD.masques = { ports: !!f.ports, etiquettes: !!f.etiquettes, notes: !!f.notes, types: new Set(f.types || []), cats: new Set(f.cats || []) };
  } catch (e) { /* stockage indisponible */ }
  vdAppliquerFiltres();
  $('vd-filtres-bt').onclick = e => { e.stopPropagation(); const p = $('vd-filtres'); p.hidden = !p.hidden; if (!p.hidden) vdPanneauFiltres(); };
  $('vd-filtres').onchange = e => { if (e.target.dataset.filtre) vdChangerFiltre(e.target); };
  $('vd-filtres').onclick = e => { e.stopPropagation(); const b = e.target.closest('button[data-filtre]'); if (b) vdChangerFiltre(b); };
  document.addEventListener('click', () => { $('vd-filtres').hidden = true; });

  // Recherche dans le diagramme
  let minuterieRecherche;
  $('vd-chercher').oninput = () => { clearTimeout(minuterieRecherche); minuterieRecherche = setTimeout(() => vdChercher($('vd-chercher').value, false), 150); };
  $('vd-chercher').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault(); clearTimeout(minuterieRecherche);
      // Requête changée depuis la dernière recherche : nouvelle recherche, sinon résultat suivant ou précédent
      if (vdNormaliser($('vd-chercher').value).trim() !== VD.requete) vdChercher($('vd-chercher').value, true);
      else vdAllerTrouve(e.shiftKey ? -1 : 1);
    }
    else if (e.key === 'Escape') { e.preventDefault(); $('vd-chercher').value = ''; vdChercher('', false); $('vd-zone').focus(); }
  };
  $('vd-suivant').onclick = () => vdAllerTrouve(1);
  $('vd-precedent').onclick = () => vdAllerTrouve(-1);
  $('vd-zoom-choix').onclick = vdZoomChoix;
  $('vd-chaine').onchange = () => { VD.chaine = $('vd-chaine').value; vdAppliquerChaine(); };
  // Mini-carte
  try { VD.carte = localStorage.getItem('arcature-carte') === '1'; } catch (e) { /* stockage indisponible */ }
  $('vd-carte-bt').onclick = () => vdBasculerCarte();
  $('vd-carte-bt').classList.toggle('actif', VD.carte);
  let carteGlisse = false;
  $('vd-carte').addEventListener('pointerdown', e => { e.stopPropagation(); carteGlisse = true; if ($('vd-carte').setPointerCapture) $('vd-carte').setPointerCapture(e.pointerId); vdCarteAller(e); });
  $('vd-carte').addEventListener('pointermove', e => { if (carteGlisse) { e.stopPropagation(); vdCarteAller(e); } });
  $('vd-carte').addEventListener('pointerup', e => { e.stopPropagation(); carteGlisse = false; });
  $('vd-carte').addEventListener('wheel', e => e.stopPropagation());
  // Tableau : clic sur une case → élément ; sur le triangle → replier / déplier ; double-clic → détail
  $('vd-tableau').onclick = e => {
    const pli = e.target.closest('[data-pli]');
    if (pli) { vdTableauPli(pli.dataset.pli); return; }
    vdClic(e.target.closest('[data-sem]'));
  };
  $('vd-tableau').ondblclick = e => {
    const x = e.target.closest('[data-sem]');
    if (x && !e.target.closest('[data-pli]') && ARC.doc.parId.get(x.dataset.sem)) vdOnglet('detail');
  };
  // Thème du diagramme : Capella par défaut, choix mémorisé
  try { VD.theme = localStorage.getItem('arcature-theme-diagramme') || 'capella'; } catch (e) { /* stockage indisponible */ }
  VD.theme = vdTheme();
  $('vd-theme').value = VD.theme;
  $('vd-zone').dataset.theme = VD.theme;
  $('vd-theme').onchange = () => vdChoisirTheme($('vd-theme').value);
  $('vd-cible').onclick = e => { const a = e.target.closest('[data-id]'); if (a) { uiChoisir(ARC.doc.parId.get(a.dataset.id)); vdOnglet('detail'); } };

  const zone = $('vd-zone');
  zone.addEventListener('wheel', e => {
    e.preventDefault();
    const r = zone.getBoundingClientRect();
    vdZoomer(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // Glisser : déplace la vue ; un clic sans déplacement sélectionne l'élément sous le pointeur
  let glisse = null;
  zone.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !VD.vb) return;
    if (zone.focus) zone.focus({ preventScroll: true });      // le clavier (flèches, Échap) agit sur le diagramme
    if (eddDebut(e)) { glisse = null; return; }      // mode « Mise en page » : sélection, déplacement…
    glisse = { x: e.clientX, y: e.clientY, vx: VD.vb.x, vy: VD.vb.y, bouge: false };
  });
  zone.addEventListener('pointermove', e => {
    if (eddMouvement(e)) return;
    if (!glisse) return;
    const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
    if (!glisse.bouge && Math.hypot(dx, dy) < 4) return;
    // Capture du pointeur au début du glissement seulement : clics et double-clics gardent leur cible
    if (!glisse.bouge && zone.setPointerCapture) zone.setPointerCapture(e.pointerId);
    glisse.bouge = true; zone.classList.add('glisse');
    const k = (zone.clientWidth || 800) / VD.vb.w;
    VD.vb.x = glisse.vx - dx / k; VD.vb.y = glisse.vy - dy / k;
    vdAppliquerVue();
  });
  const finGlisse = e => {
    if (eddFin(e)) return;
    if (!glisse) return;
    const clic = !glisse.bouge;
    glisse = null; zone.classList.remove('glisse');
    if (clic && e.type === 'pointerup') {
      if (EDD.actif) eddVider();                    // clic sur le fond : sélection d'édition vidée
      const ref = !EDD.actif && e.target.closest ? e.target.closest('[data-ref]') : null;
      if (ref) { vdOuvrirReference(ref.dataset.ref); return; }   // lien vers le diagramme du scénario cité
      vdClic(e.target.closest ? e.target.closest('[data-sem]') : null);
    }
  };
  zone.addEventListener('pointerup', finGlisse);
  zone.addEventListener('pointercancel', finGlisse);
  zone.addEventListener('dblclick', e => {
    const g = e.target.closest('[data-sem]');
    // Référence de séquence : double-clic = diagramme du scénario cité
    if (g && !EDD.actif && g.dataset.v && vdOuvrirReference(g.dataset.v)) return;
    if (g && ARC.doc.parId.get(g.dataset.sem)) vdOnglet('detail');
  });
  // Infobulle : après un court arrêt sur un élément ; masquée au glisser, au clic, en sortant de la zone
  let minuterieBulle = null, survol = '';
  zone.addEventListener('pointermove', e => {
    if (glisse || EDD.actif || e.target.closest('#vd-carte')) { clearTimeout(minuterieBulle); vdMontrerBulle(''); survol = ''; return; }
    const g = e.target.closest ? e.target.closest('[data-sem]') : null, id = g ? g.dataset.sem : '';
    if (id !== survol) { survol = id; clearTimeout(minuterieBulle); vdMontrerBulle(''); }
    if (id) {
      const x = e.clientX, y = e.clientY;
      clearTimeout(minuterieBulle);
      if (!$('vd-bulle').hidden) vdMontrerBulle(id, x, y);
      else minuterieBulle = setTimeout(() => vdMontrerBulle(id, x, y), 450);
    }
  });
  zone.addEventListener('pointerleave', () => { clearTimeout(minuterieBulle); survol = ''; vdMontrerBulle(''); });
  zone.addEventListener('pointerdown', () => { clearTimeout(minuterieBulle); vdMontrerBulle(''); }, true);
  window.addEventListener('resize', () => { if (VD.rep && !$('vue-diagramme').hidden) vdAppliquerVue(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (VD.rep && !$('vue-diagramme').hidden) vdAppliquerVue(); }).observe(zone);
}

/**
 * Clic dans le diagramme : sélectionne l'élément représenté (détail et arborescence mis à jour).
 * @param {Element|null} g groupe SVG portant data-sem, ou null (fond)
 */
function vdClic(g) {
  if (!g) { vdMarquer(''); return; }
  const id = g.dataset.sem, el = ARC.doc.parId.get(id);
  if (!el) { vdMarquer(id); uiToast(_L('Cet élément est absent du modèle ouvert.'), true); return; }
  VD.selection = id;                                  // évite le retour au détail déclenché par le choix
  if (uiChoisir(el)) vdMarquer(id);
}

/** Gabarit HTML de la visionneuse. */
const ARCV_GABARIT = "<div class=\"arcv\">\n  <aside class=\"arcv-gauche\">\n    <div class=\"diag-barre\">\n      <button class=\"bt bt-petit\" id=\"bt-ouvrir-aird\" hidden></button>\n      <input type=\"file\" id=\"entree-aird\" accept=\".aird\" hidden>\n      <span id=\"diag-info\" class=\"dim\"></span>\n    </div>\n    <input id=\"diag-filtre\" type=\"search\" placeholder=\"Filtrer les diagrammes (nom, type)…\" autocomplete=\"off\">\n    <ul id=\"diag-liste\"></ul>\n  </aside>\n  <section id=\"panneau-detail\" class=\"arcv-centre\">\n    <div id=\"centre-onglets\" class=\"onglets\" hidden>\n      <button class=\"onglet\" data-centre=\"detail\"></button>\n      <button class=\"onglet\" data-centre=\"diagramme\"><span id=\"vd-onglet-nom\"></span></button>\n    </div>\n    <div id=\"vue-diagramme\" hidden>\n      <div class=\"vd-barre\">\n        <button class=\"bt bt-petit\" id=\"vd-retour\" hidden>↩ Retour</button>\n        <span id=\"vd-ico\" class=\"diag-ico\"></span>\n        <span id=\"vd-sigle\" class=\"diag-sigle\"></span>\n        <span id=\"vd-nom\"></span>\n        <span id=\"vd-cible\"></span>\n        <span class=\"ressort\"></span>\n        <span class=\"vd-chercher\">\n          <input id=\"vd-chercher\" type=\"search\" placeholder=\"Chercher dans le diagramme (Ctrl+F)\" autocomplete=\"off\" title=\"Entrée : suivant · Maj+Entrée : précédent · Échap : effacer\">\n          <span id=\"vd-trouves\" class=\"dim\"></span>\n          <button class=\"bt bt-petit\" id=\"vd-precedent\" title=\"Résultat précédent (Maj+Entrée)\">▲</button>\n          <button class=\"bt bt-petit\" id=\"vd-suivant\" title=\"Résultat suivant (Entrée)\">▼</button>\n        </span>\n        <button class=\"bt bt-petit\" id=\"vd-edition\" title=\"Modifier la mise en page : déplacer, redimensionner, retracer les liens\">✎ Mise en page</button>\n        <button class=\"bt bt-petit\" id=\"vd-ponts\" title=\"Ponts aux croisements des liens\">⌒ Ponts</button>\n        <select id=\"vd-theme\" class=\"bt-petit\" title=\"Thème du diagramme\">\n          <option value=\"capella\">Thème Capella</option>\n          <option value=\"clair\">Arcature clair</option>\n          <option value=\"sombre\">Arcature sombre</option>\n        </select>\n        <button class=\"bt bt-petit\" id=\"vd-moins\" title=\"Dézoomer\">−</button>\n        <span id=\"vd-zoom\" class=\"dim\"></span>\n        <button class=\"bt bt-petit\" id=\"vd-plus\" title=\"Zoomer\">+</button>\n        <button class=\"bt bt-petit\" id=\"vd-ajuster\" title=\"Voir tout le diagramme\">⤢ Ajuster</button>\n        <button class=\"bt bt-petit\" id=\"vd-reel\" title=\"Taille réelle (100 %)\">1:1</button>\n        <button class=\"bt bt-petit\" id=\"vd-zoom-choix\" title=\"Zoomer sur l'élément choisi\">⌖</button>\n        <button class=\"bt bt-petit\" id=\"vd-carte-bt\" title=\"Mini-carte : vue d'ensemble, clic pour s'y déplacer\">▣ Carte</button>\n        <select id=\"vd-chaine\" class=\"bt-petit\" title=\"Mettre en évidence une chaîne fonctionnelle ou un chemin physique (nombre d'éléments dessinés)\" hidden></select>\n        <span class=\"vd-filtres-ancre\">\n          <button class=\"bt bt-petit\" id=\"vd-filtres-bt\" title=\"Filtres d'affichage : ports, étiquettes, notes, types de liens, catégories d'échanges\">⧩ Filtres</button>\n          <div id=\"vd-filtres\" hidden></div>\n        </span>\n        <span id=\"vd-tableau-info\" class=\"dim\"></span>\n        <span class=\"vd-filtres-ancre\">\n          <button class=\"bt bt-petit\" id=\"vd-export-bt\" title=\"Exporter : SVG, PNG, impression ou PDF (tableau : CSV)\">⬇ Exporter</button>\n          <div id=\"vd-export\" class=\"vd-menu\" hidden></div>\n        </span>\n        <button class=\"bt bt-petit\" id=\"vd-fermer\" title=\"Fermer le diagramme\">✕</button>\n      </div>\n      <div id=\"vd-outils\" class=\"vd-barre\" hidden>\n        <span class=\"dim\">Aligner</span>\n        <button class=\"bt bt-petit\" data-aligner=\"gauche\" title=\"Aligner à gauche\">⇤</button>\n        <button class=\"bt bt-petit\" data-aligner=\"centre\" title=\"Centrer horizontalement\">↔</button>\n        <button class=\"bt bt-petit\" data-aligner=\"droite\" title=\"Aligner à droite\">⇥</button>\n        <button class=\"bt bt-petit\" data-aligner=\"haut\" title=\"Aligner en haut\">⤒</button>\n        <button class=\"bt bt-petit\" data-aligner=\"milieu\" title=\"Centrer verticalement\">↕</button>\n        <button class=\"bt bt-petit\" data-aligner=\"bas\" title=\"Aligner en bas\">⤓</button>\n        <span class=\"sep\"></span>\n        <span class=\"dim\">Répartir</span>\n        <button class=\"bt bt-petit\" data-repartir=\"h\" title=\"Répartir horizontalement (3 éléments ou plus)\">⋯</button>\n        <button class=\"bt bt-petit\" data-repartir=\"v\" title=\"Répartir verticalement (3 éléments ou plus)\">⋮</button>\n        <span class=\"sep\"></span>\n        <span class=\"dim\">Taille</span>\n        <button class=\"bt bt-petit\" data-meme=\"largeur\" title=\"Même largeur que le premier élément choisi\">⟷</button>\n        <button class=\"bt bt-petit\" data-meme=\"hauteur\" title=\"Même hauteur que le premier élément choisi\">↨</button>\n        <button class=\"bt bt-petit\" data-meme=\"taille\" title=\"Même taille que le premier élément choisi\">⧈</button>\n        <span class=\"sep\"></span>\n        <span class=\"dim\">Liens</span>\n        <button class=\"bt bt-petit\" id=\"vd-orthogonal\" title=\"Retracer en angles droits le lien choisi, ou les liens des éléments choisis\">⌐ Angles droits</button>\n        <button class=\"bt bt-petit\" id=\"vd-direct\" title=\"Retracer en ligne droite le lien choisi, ou les liens des éléments choisis\">⟋ Direct</button>\n        <button class=\"bt bt-petit\" id=\"vd-etiquettes\" title=\"Placer les étiquettes du lien choisi, des liens des éléments choisis, ou de tous les liens : loin des formes, des autres étiquettes et des traits\">≣ Étiquettes</button>\n        <span class=\"sep\"></span>\n        <span class=\"dim\">Disposer</span>\n        <button class=\"bt bt-petit\" data-disposer=\"couches\" title=\"En couches, dans le sens des liens : les éléments choisis, le contenu du conteneur choisi, ou tout le diagramme\">⇉ Couches</button>\n        <button class=\"bt bt-petit\" data-disposer=\"couches\" data-sens=\"bas\" title=\"En couches, de haut en bas\">⇊</button>\n        <button class=\"bt bt-petit\" data-disposer=\"arbre\" title=\"En arbre, de haut en bas (décompositions)\">⊤ Arbre</button>\n        <button class=\"bt bt-petit\" data-disposer=\"grille\" title=\"En grille compacte, dans l'ordre de lecture\">▦ Grille</button>\n        <span class=\"ressort\"></span>\n        <span class=\"dim vd-aide\">Maj+clic : ajouter · Maj+glisser : sélection par cadre · Ctrl+glisser : pousser · Alt+clic : même type · flèches : décaler · Alt : sans aimantation · F2 : renommer · Suppr : masquer · clic droit : créer · ? : aide</span>\n      </div>\n      <div id=\"vd-zone\" tabindex=\"0\" title=\"Molette : zoom · glisser : déplacer · clic : choisir l'élément · double-clic : son détail\">\n        <svg id=\"vd-svg\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMinYMin meet\"></svg>\n        <svg id=\"vd-carte\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid meet\" hidden></svg>\n        <div id=\"vd-bulle\" role=\"tooltip\" hidden></div>\n        <style id=\"vd-filtres-style\"></style>\n      </div>\n      <div id=\"vd-tableau\" tabindex=\"0\"></div>\n      <div class=\"vd-pied dim vd-pied-tableau\">Tableau tel qu'enregistré par Capella dans le .aird (libellés calculés à son dernier rafraîchissement). Clic : choisir l'élément · double-clic : son détail.</div>\n      <div class=\"vd-pied dim vd-pied-dessin\">Dessin d'après les positions enregistrées par Capella. La mise en page modifie seulement le .aird, enregistré avec le modèle (Ctrl+S).</div>\n    </div>\n    <div id=\"arcv-vide\" class=\"dim\">Choisissez un diagramme dans la liste.</div>\n  </section>\n  <div id=\"toast\"></div>\n</div>\n";
/** Styles de la visionneuse, préfixés par .arcv. */
const ARCV_CSS = ".arcv *{box-sizing:border-box;margin:0;padding:0}\n.arcv button,.arcv input,.arcv select,.arcv textarea{font:inherit;color:inherit}\n.arcv code{font-family:Consolas,'Cascadia Mono',monospace;font-size:12px}\n.arcv .dim{color:var(--c-dim)}\n.arcv [hidden]{display:none !important}\n.arcv #barre{display:flex;align-items:center;gap:5px;padding:6px 10px;background:var(--c-bg2);border-bottom:1px solid var(--c-border)}\n.arcv #barre>*{flex-shrink:0}\n.arcv .marque{font-weight:800;letter-spacing:.03em;margin-right:8px;color:var(--c-accent)}\n.arcv .bt{padding:4px 10px;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px;cursor:pointer;white-space:nowrap}\n.arcv .bt:hover:not(:disabled){border-color:var(--c-accent)}\n.arcv .bt:disabled{opacity:.45;cursor:default}\n.arcv .bt.principal{background:var(--c-accent);border-color:var(--c-accent);color:var(--c-bg2);font-weight:600}\n.arcv .sep{width:1px;height:20px;background:var(--c-border);margin:0 3px}\n.arcv .ressort{flex:1 1 0}\n.arcv #barre>#fichier-info{color:var(--c-dim);margin-left:8px;font-size:12px;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.arcv #etat-modifs{font-size:12px;color:var(--c-warn);font-weight:600}\n.arcv #accueil{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:18px}\n.arcv #zone-depot{width:min(580px,94%);border:2px dashed var(--c-border);border-radius:14px;padding:40px 30px;text-align:center;\n  background:var(--c-bg2);cursor:pointer;transition:border-color .15s,transform .15s}\n.arcv #zone-depot:hover,.arcv #zone-depot.survol{border-color:var(--c-accent)}\n.arcv #zone-depot.survol{transform:scale(1.02)}\n.arcv .acc-marque{font-size:32px;font-weight:800;color:var(--c-accent)}\n.arcv .acc-slogan{font-style:italic;color:var(--c-dim);margin:4px 0 22px}\n.arcv .acc-titre{font-size:17px;font-weight:700}\n.arcv .acc-dossier{margin:16px 0 4px;padding:8px 18px;font-size:14px}\n.arcv .choix-modele{display:flex;flex-direction:column;gap:6px;min-width:360px}\n.arcv .choix-modele .bt{text-align:left;padding:8px 12px}\n.arcv .choix-modele .dim{font-size:11px}\n.arcv .acc-sous{color:var(--c-dim);margin-top:6px}\n.arcv .acc-avert{margin-top:22px;padding:10px 12px;border-radius:8px;background:color-mix(in srgb,var(--c-warn) 12%,transparent);\n  color:var(--c-warn);font-size:12px;text-align:left}\n.arcv #acc-statut{margin-top:14px;min-height:18px;font-weight:600}\n.arcv #acc-statut.err{color:var(--c-err)}\n.arcv .acc-pied{color:var(--c-dim);font-size:11px;text-align:center}\n.arcv #travail{flex:1;display:grid;grid-template-columns:minmax(260px,26%) 5px 1fr 5px minmax(240px,20%);overflow:hidden}\n.arcv #travail>section{overflow:auto;padding:10px;min-width:0}\n.arcv .separateur{cursor:col-resize;background:var(--c-border);background-clip:content-box;padding:0 2px;touch-action:none}\n.arcv .separateur:hover,.arcv .separateur.actif{background:var(--c-accent);background-clip:content-box;padding:0 1px}\n.arcv #panneau-gauche{display:flex;flex-direction:column;gap:6px;overflow:hidden !important}\n.arcv .onglets{display:flex;gap:2px;border-bottom:1px solid var(--c-border);flex-shrink:0}\n.arcv .onglet{flex:1;padding:5px 8px;background:none;border:0;border-bottom:2px solid transparent;cursor:pointer;color:var(--c-dim);font-weight:600}\n.arcv .onglet:hover{color:var(--c-text)}\n.arcv .onglet.actif{color:var(--c-accent);border-bottom-color:var(--c-accent)}\n.arcv .vue-gauche{display:flex;flex-direction:column;gap:6px;flex:1;min-height:0}\n.arcv #vue-recherche{overflow:auto}\n.arcv #arbre-filtre{width:100%;padding:6px 8px;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px}\n.arcv .arbre-barre{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px}\n.arcv .bt-petit{padding:1px 7px;font-size:12px}\n.arcv .arbre-opt{display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--c-dim)}\n.arcv #arbre-info{margin-left:auto}\n.arcv #arbre{flex:1;min-height:0;overflow:auto;outline:none;font-size:12.5px;border-top:1px solid var(--c-border);padding-top:4px}\n.arcv #arbre ul{list-style:none}\n.arcv .a-ligne{display:flex;align-items:center;gap:5px;padding-top:2px;padding-bottom:2px;padding-right:4px;border-radius:4px;cursor:pointer;white-space:nowrap}\n.arcv .a-ligne:hover{background:var(--c-bg3)}\n.arcv .a-ligne.actif{background:var(--c-bg4);outline:1px solid var(--c-accent)}\n.arcv #arbre:focus .a-ligne.actif{background:color-mix(in srgb,var(--c-accent) 22%,var(--c-bg4))}\n.arcv .a-tog{width:14px;flex-shrink:0;text-align:center;font-size:9px;color:var(--c-dim);transition:transform .12s}\n.arcv .a-tog.ouvert{transform:rotate(90deg)}\n.arcv .a-tog.feuille{cursor:default}\n.arcv .a-ico{flex-shrink:0;min-width:20px;height:16px;padding:0 3px;border-radius:3px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;\n  background:var(--c-bg3);color:var(--c-dim)}\n.arcv .a-ico[data-c=OA],.arcv .puce-t[data-c=OA]{color:var(--c-OA);background:color-mix(in srgb,var(--c-OA) 16%,transparent)}\n.arcv .a-ico[data-c=SA],.arcv .puce-t[data-c=SA]{color:var(--c-SA);background:color-mix(in srgb,var(--c-SA) 16%,transparent)}\n.arcv .a-ico[data-c=LA],.arcv .puce-t[data-c=LA]{color:var(--c-LA);background:color-mix(in srgb,var(--c-LA) 16%,transparent)}\n.arcv .a-ico[data-c=PA],.arcv .puce-t[data-c=PA]{color:var(--c-PA);background:color-mix(in srgb,var(--c-PA) 16%,transparent)}\n.arcv .a-ico[data-c=EPBS],.arcv .puce-t[data-c=EPBS]{color:var(--c-EPBS);background:color-mix(in srgb,var(--c-EPBS) 16%,transparent)}\n.arcv .a-nom{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}\n.arcv .a-nom.sans-nom,.arcv .a-technique .a-nom{color:var(--c-dim);font-style:italic}\n.arcv .a-oss{font-size:9px}\n.arcv .a-nb{font-size:10px;color:var(--c-dim);font-family:Consolas,'Cascadia Mono',monospace}\n.arcv .a-type{font-size:10px;color:var(--c-dim);opacity:.8;max-width:42%;overflow:hidden;text-overflow:ellipsis}\n.arcv .a-terne>.a-nom,.arcv .a-terne>.a-ico,.arcv .a-terne>.a-type{opacity:.45}\n.arcv .a-ico.ico-svg{min-width:16px;padding:0;background:none}\n.arcv .puce-i{display:inline-flex;vertical-align:-2px;margin-right:3px}\n.arcv .diag-ico{display:inline-flex;flex-shrink:0;vertical-align:-3px}\n.arcv #diag-liste .diag-ico{align-self:flex-start;margin-top:1px}\n.arcv .a-trouve>.a-nom{color:var(--c-accent);font-weight:600}\n.arcv .a-reste{font-size:11px;padding:3px 0}\n.arcv #recherche,.arcv select,.arcv input[type=text],.arcv textarea{width:100%;padding:6px 8px;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px}\n.arcv #recherche:focus,.arcv input:focus,.arcv textarea:focus,.arcv select:focus{outline:1px solid var(--c-accent);border-color:var(--c-accent)}\n.arcv .filtres{display:flex;gap:6px}\n.arcv #resultats-info{font-size:11px;color:var(--c-dim)}\n.arcv #resultats,.arcv #journal{list-style:none}\n.arcv #resultats li{padding:4px 6px;border-radius:4px;cursor:pointer;display:flex;gap:6px;align-items:baseline;line-height:1.35}\n.arcv #resultats li:hover{background:var(--c-bg3)}\n.arcv #resultats li.actif{background:var(--c-bg4);outline:1px solid var(--c-accent)}\n.arcv .r-nom{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.arcv .r-type{font-size:11px;color:var(--c-dim);white-space:nowrap}\n.arcv .pastille{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:9px;background:var(--c-bg3);color:var(--c-dim)}\n.arcv .pastille[data-c=OA]{color:var(--c-OA)}\n.arcv .pastille[data-c=SA]{color:var(--c-SA)}\n.arcv .pastille[data-c=LA]{color:var(--c-LA)}\n.arcv .pastille[data-c=PA]{color:var(--c-PA)}\n.arcv .pastille[data-c=EPBS]{color:var(--c-EPBS)}\n.arcv .a-ico[data-c=STR],.arcv .puce-t[data-c=STR]{color:var(--c-STR);background:color-mix(in srgb,var(--c-STR) 16%,transparent)}\n.arcv .pastille[data-c=STR]{color:var(--c-STR)}\n.arcv .a-ico[data-c=BEH],.arcv .puce-t[data-c=BEH]{color:var(--c-BEH);background:color-mix(in srgb,var(--c-BEH) 16%,transparent)}\n.arcv .pastille[data-c=BEH]{color:var(--c-BEH)}\n.arcv .a-ico[data-c=REQ],.arcv .puce-t[data-c=REQ]{color:var(--c-REQ);background:color-mix(in srgb,var(--c-REQ) 16%,transparent)}\n.arcv .pastille[data-c=REQ]{color:var(--c-REQ)}\n.arcv .a-ico[data-c=ORG],.arcv .puce-t[data-c=ORG]{color:var(--c-ORG);background:color-mix(in srgb,var(--c-ORG) 16%,transparent)}\n.arcv .pastille[data-c=ORG]{color:var(--c-ORG)}\n.arcv #detail-formulaire.lecture-seule input,.arcv #detail-formulaire.lecture-seule textarea{opacity:.85;cursor:default}\n.arcv .pastille.ossature{color:var(--c-warn)}\n.arcv #panneau-detail{padding:14px 18px !important}\n.arcv #detail-vide{color:var(--c-dim);margin-top:40px;text-align:center}\n.arcv #detail{display:flex;flex-direction:column;gap:10px;max-width:960px}\n.arcv #detail-formulaire{display:flex;flex-direction:column;gap:10px;min-width:0}\n.arcv #travail.cote #detail{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 22px;max-width:none;align-items:start}\n.arcv #travail.cote #detail-liens{position:sticky;top:0;max-height:calc(100vh - 80px);overflow:auto;margin-top:0;padding-right:4px}\n.arcv #detail-chemin{font-size:11px;color:var(--c-dim);display:flex;flex-wrap:wrap;gap:2px}\n.arcv #detail-chemin a{color:var(--c-dim);cursor:pointer;text-decoration:none}\n.arcv #detail-chemin a:hover{color:var(--c-accent);text-decoration:underline}\n.arcv .detail-entete{display:flex;gap:8px;align-items:center;font-size:15px;font-weight:700}\n.arcv .detail-id{font-size:11px;color:var(--c-dim)}\n.arcv #detail label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--c-dim)}\n.arcv #detail label input,.arcv #detail label textarea{color:var(--c-text);font-size:13px}\n.arcv textarea{resize:vertical;font-family:Consolas,'Cascadia Mono',monospace;font-size:12px !important}\n.arcv .detail-proprietes{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 14px;align-items:end}\n.arcv #detail .detail-proprietes label.case{min-height:30px}\n.arcv #detail .detail-proprietes label.case{flex-direction:row;align-items:center;gap:6px}\n.arcv #detail .detail-proprietes label.grise{opacity:.6}\n.arcv .detail-proprietes select{color:var(--c-text);font-size:13px}\n.arcv .detail-proprietes .modifie{outline:2px solid var(--c-accent);outline-offset:1px}\n.arcv .detail-relations{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--c-border);padding-top:8px}\n.arcv .rel-titre{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--c-dim)}\n.arcv .rel-titre .bt{margin-left:auto}\n.arcv .rel-valeurs{display:flex;flex-wrap:wrap;gap:4px}\n.arcv .rel-valeur{display:inline-flex;align-items:center;gap:2px}\n.arcv .rel-retirer{border:0;background:none;color:var(--c-dim);cursor:pointer;padding:0 3px;font-size:11px}\n.arcv .bt.petit{padding:1px 8px;font-size:11px}\n.arcv .rel-retirer:disabled{opacity:.35;cursor:not-allowed}\n.arcv .rel-retirer:hover:not(:disabled){color:var(--c-err,#e66)}\n.arcv .detail-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.arcv .detail-actions .apercu-l{flex-direction:row !important;align-items:center;margin-left:auto}\n.arcv .champ-desc{display:flex;flex-direction:column;gap:4px;position:relative}\n.arcv .desc-entete{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--c-dim)}\n.arcv .desc-modes{display:inline-flex;border:1px solid var(--c-border);border-radius:5px;overflow:hidden}\n.arcv .desc-mode{padding:2px 10px;background:var(--c-bg3);border:0;cursor:pointer;font-size:11px;color:var(--c-dim)}\n.arcv .desc-mode.actif{background:var(--c-accent);color:var(--c-bg2);font-weight:600}\n.arcv .desc-outils{display:flex;align-items:center;gap:2px;flex-wrap:wrap;padding:3px;background:var(--c-bg2);border:1px solid var(--c-border);border-radius:5px 5px 0 0}\n.arcv .desc-outils.inactif{opacity:.4;pointer-events:none}\n.arcv .desc-outils button{min-width:26px;height:24px;padding:0 5px;background:none;border:1px solid transparent;border-radius:4px;cursor:pointer;font-size:12px}\n.arcv .desc-outils button:hover{background:var(--c-bg3);border-color:var(--c-border)}\n.arcv .desc-outils button.actif{background:color-mix(in srgb,var(--c-accent) 25%,transparent);border-color:var(--c-accent)}\n.arcv .desc-outils select{width:auto;padding:2px 4px;font-size:12px}\n.arcv .desc-outils .sep{height:16px}\n.arcv #desc-editeur{display:block;width:100%;height:240px;border:1px solid var(--c-border);border-top:0;border-radius:0 0 6px 6px;background:var(--c-bg3);resize:vertical}\n.arcv #desc-editeur[hidden]{display:none}\n.arcv #champ-description{min-height:240px;border-radius:0 0 6px 6px}\n.arcv .choix-element{position:absolute;z-index:20;top:62px;right:8px;width:min(420px,90%);background:var(--c-bg2);border:1px solid var(--c-accent);border-radius:6px;\n  box-shadow:0 8px 24px rgba(0,0,0,.35);padding:6px;display:flex;flex-direction:column;gap:4px}\n.arcv .choix-element input{width:100%;padding:5px 8px;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:4px}\n.arcv .choix-element ul{list-style:none;max-height:260px;overflow:auto}\n.arcv .choix-element li{padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;gap:6px;align-items:baseline}\n.arcv .choix-element li:hover{background:var(--c-bg3)}\n.arcv #detail h3,.arcv #panneau-journal h3{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--c-dim);margin-top:6px}\n.arcv .modifie{border-color:var(--c-warn) !important}\n.arcv #detail-liens{display:flex;flex-direction:column;gap:4px;margin-top:6px}\n.arcv .rubrique{border-top:1px solid var(--c-border);padding-top:6px}\n.arcv .rubrique>summary{cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-dim);padding:2px 0;list-style-position:inside}\n.arcv .rubrique>summary .nb{font-weight:400;opacity:.8}\n.arcv .r-liaisons>summary{color:var(--c-accent)}\n.arcv .r-sortantes>summary{color:var(--c-ok)}\n.arcv .r-entrantes>summary{color:var(--c-warn)}\n.arcv .r-proprietaire>summary{color:var(--c-EPBS)}\n.arcv .r-contenus>summary{color:var(--c-LA)}\n.arcv .rub-corps{padding:6px 0 8px}\n.arcv .attributs{width:100%;border-collapse:collapse}\n.arcv .attributs td{padding:4px 0;border-bottom:1px solid var(--c-border);vertical-align:top;font-size:12px;word-break:break-all}\n.arcv .attributs td:first-child{width:170px;padding-right:10px;color:var(--c-dim);font-family:Consolas,'Cascadia Mono',monospace;font-size:11px;word-break:normal}\n.arcv .groupe{margin-bottom:8px}\n.arcv .groupe-l{font-family:Consolas,'Cascadia Mono',monospace;font-size:10.5px;color:var(--c-dim);margin-bottom:2px}\n.arcv .groupe-c{display:flex;flex-wrap:wrap;align-items:center}\n.arcv .liaison{display:flex;align-items:center;flex-wrap:wrap;width:100%}\n.arcv .via{display:inline-flex;align-items:center;gap:2px;font-size:10.5px;color:var(--c-dim);margin-left:4px}\n.arcv .puce{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;margin:2px 4px 2px 0;border:1px solid var(--c-border);border-radius:4px;\n  background:var(--c-bg2);font-size:11.5px;cursor:pointer;color:var(--c-text);text-decoration:none;max-width:100%}\n.arcv .puce:hover{border-color:var(--c-accent)}\n.arcv .puce.sans-nom{padding:2px 4px;border-style:dotted}\n.arcv .puce-t{font-size:9px;font-weight:700;padding:0 3px;border-radius:3px;color:var(--c-dim)}\n.arcv .puce.absente{cursor:default;color:var(--c-dim);font-family:Consolas,'Cascadia Mono',monospace;font-size:10.5px;border-style:dashed}\n.arcv #journal li{padding:6px 8px;margin-bottom:5px;border-radius:5px;background:var(--c-bg2);border-left:3px solid var(--c-accent);font-size:12px;cursor:pointer}\n.arcv #journal li:hover{background:var(--c-bg3)}\n.arcv #journal li.annulee{opacity:.45;border-left-color:var(--c-border);text-decoration:line-through}\n.arcv .j-quoi{font-weight:600}\n.arcv .j-detail{color:var(--c-dim);word-break:break-word}\n.arcv #journal-vide{font-size:12px;margin-top:8px}\n.arcv .menu{position:fixed;z-index:70;min-width:240px;max-width:min(480px,94vw);max-height:80vh;overflow:auto;background:var(--c-bg2);border:1px solid var(--c-border);\n  border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:4px 0;font-size:12.5px}\n.arcv #menu-dispo{left:auto}\n.arcv .menu-titre{padding:6px 12px 4px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.arcv .menu-section{padding:6px 12px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-dim)}\n.arcv .menu-item{display:flex;width:100%;align-items:center;justify-content:space-between;gap:16px;padding:5px 12px;background:none;border:0;text-align:left;cursor:pointer}\n.arcv .menu-item:hover,.arcv .menu-item:focus{background:var(--c-bg3);outline:none}\n.arcv .menu-item kbd,.arcv .menu kbd{font-family:inherit;font-size:10.5px;color:var(--c-dim);border:1px solid var(--c-border);border-radius:3px;padding:0 4px}\n.arcv .menu-sep{height:1px;background:var(--c-border);margin:4px 0}\n.arcv .menu-vide{padding:5px 12px;color:var(--c-dim);font-size:11.5px}\n.arcv .liste-l{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--c-dim)}\n.arcv .liste-l select,.arcv .liste-l textarea{color:var(--c-text)}\n.arcv .liste-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n.arcv .choix-filtre{color:var(--c-text);font-size:13px;padding:5px 8px}\n.arcv .choix-liste{list-style:none;margin:0;max-height:min(420px,60vh);overflow:auto;background:var(--c-bg);border-radius:5px;padding:4px}\n.arcv .choix-liste li{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;cursor:pointer;min-width:0}\n.arcv .choix-liste li:hover,.arcv .choix-liste li:focus{background:var(--c-bg3);outline:none}\n.arcv .choix-liste .puce{pointer-events:none;flex:none;max-width:60%}\n.arcv .import-apercu{max-height:min(360px,45vh);overflow:auto}\n.arcv .import-table{border-collapse:collapse;font-size:12px;width:100%}\n.arcv .import-table td{padding:2px 6px;border-bottom:1px solid var(--c-border);vertical-align:top}\n.arcv .import-table tr.imp-erreur td:nth-child(2){color:var(--c-err)}\n.arcv .import-table tr.imp-creation td:nth-child(2){color:var(--c-ok)}\n.arcv .supp-liste{display:flex;flex-wrap:wrap;gap:4px;max-height:min(320px,45vh)}\n.arcv .bt.danger{background:var(--c-err);border-color:var(--c-err)}\n.arcv .a-ligne.a-depot{outline:2px solid var(--c-accent);outline-offset:-2px;background:var(--c-bg3)}\n.arcv .a-ligne.a-depot-ko{cursor:not-allowed}\n.arcv .choix-chemin{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.arcv #liste-apercu{list-style:none;max-height:260px;overflow:auto;background:var(--c-bg);border-radius:5px;padding:6px 8px;color:var(--c-text);font-size:12px}\n.arcv #fenetre{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:50}\n.arcv .fenetre-cadre{width:min(760px,94vw);max-height:86vh;overflow:auto;background:var(--c-bg2);border:1px solid var(--c-border);border-radius:10px;padding:16px 18px}\n.arcv .fenetre-titre{display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:700;margin-bottom:12px}\n.arcv #fenetre-corps{display:flex;flex-direction:column;gap:8px;line-height:1.45}\n.arcv .diag-ligne{display:flex;gap:8px}\n.arcv .diag-ok{color:var(--c-ok)}\n.arcv .diag-ko{color:var(--c-err)}\n.arcv .diag-av{color:var(--c-warn)}\n.arcv #fenetre-corps pre{background:var(--c-bg);padding:8px;border-radius:5px;overflow:auto;font-size:11px;white-space:pre-wrap}\n.arcv #toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:6px;background:var(--c-bg3);\n  border:1px solid var(--c-border);opacity:0;pointer-events:none;transition:opacity .2s;z-index:60;max-width:80vw}\n.arcv #toast.visible{opacity:1}\n.arcv #toast.err{border-color:var(--c-err);color:var(--c-err)}\n.arcv .diag-barre{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.arcv #diag-info{font-size:11px}\n.arcv #diag-filtre{width:100%;padding:6px 8px;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px}\n.arcv #diag-liste{list-style:none;flex:1;min-height:0;overflow:auto;border-top:1px solid var(--c-border);padding-top:4px;font-size:12.5px}\n.arcv #diag-liste li[data-diag]{display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-radius:4px;cursor:pointer;line-height:1.35}\n.arcv #diag-liste li[data-diag]:hover{background:var(--c-bg3)}\n.arcv #diag-liste li.actif{background:var(--c-bg4);outline:1px solid var(--c-accent)}\n.arcv .diag-groupe{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--c-dim);padding:8px 4px 3px}\n.arcv .diag-sigle{font-size:9.5px;font-weight:700;padding:0 4px;border-radius:3px;color:var(--c-dim);background:var(--c-bg3);\n  font-family:Consolas,'Cascadia Mono',monospace;flex-shrink:0;min-width:34px;text-align:center}\n.arcv .diag-sigle[data-c=OA]{color:var(--c-OA)}\n.arcv .diag-sigle[data-c=SA]{color:var(--c-SA)}\n.arcv .diag-sigle[data-c=LA]{color:var(--c-LA)}\n.arcv .diag-sigle[data-c=PA]{color:var(--c-PA)}\n.arcv .diag-sigle[data-c=EPBS]{color:var(--c-EPBS)}\n.arcv .diag-nom{overflow:hidden;text-overflow:ellipsis}\n.arcv .r-diagrammes>summary{color:var(--c-EPBS)}\n.arcv #centre-onglets{margin:-6px -8px 8px}\n.arcv #centre-onglets .onglet{flex:0 1 auto;max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.arcv #panneau-detail.mode-diagramme{display:flex;flex-direction:column;overflow:hidden !important;padding:8px 10px !important}\n.arcv #panneau-detail.mode-diagramme #centre-onglets{margin:0 0 6px}\n.arcv #panneau-detail.mode-diagramme>#detail,.arcv #panneau-detail.mode-diagramme>#detail-vide{display:none}\n.arcv #vue-diagramme{display:flex;flex-direction:column;flex:1;min-height:0;gap:6px}\n.arcv #vue-diagramme[hidden]{display:none}\n.arcv .vd-barre{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.arcv #vd-nom{font-weight:700}\n.arcv #vd-nom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto}\n.arcv #vd-zoom{font-size:11px;min-width:44px;text-align:center;font-family:Consolas,'Cascadia Mono',monospace}\n.arcv #vd-cible .puce{margin:0}\n.arcv #vd-svg .vd-lien-ref{cursor:pointer;text-decoration:underline}\n.arcv #vd-svg [data-ref]:hover .vd-lien-ref{text-decoration-thickness:2px}\n.arcv #vd-zone{flex:1;min-height:0;border:1px solid var(--c-border);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;\n  --vd-toile:#ffffff;--vd-point:transparent;--vd-accent:#2f5fd0;\n  background:radial-gradient(circle,var(--vd-point) 1px,transparent 1.3px) 0 0/20px 20px,var(--vd-toile)}\n.arcv #vd-zone[data-theme=\"clair\"]{--vd-toile:#f6f8fc;--vd-point:#dde3ee;--vd-accent:#2f5fd0}\n.arcv #vd-zone[data-theme=\"sombre\"]{--vd-toile:#131621;--vd-point:#262b3c;--vd-accent:#7aa7ff}\n.arcv #vd-theme{width:auto;padding:2px 6px;font-size:12px}\n.arcv #vd-zone.glisse{cursor:grabbing}\n.arcv #vd-zone:focus{outline:none}\n.arcv #vd-zone:focus-visible{outline:2px solid var(--c-accent)}\n.arcv #vd-svg{width:100%;height:100%;display:block;user-select:none;text-rendering:geometricPrecision}\n.arcv #vd-svg [data-sem]{cursor:pointer}\n.arcv #vd-svg .vd-f,.arcv #vd-svg .vd-l{transition:opacity .18s}\n.arcv #vd-svg .vd-f[data-sem]:hover>.vd-c,.arcv #vd-svg .vd-f[data-sem]:hover>.vd-c>*{stroke:var(--vd-accent);stroke-width:1.8px}\n.arcv #vd-svg .vd-l[data-sem]:hover>path.vd-c{stroke:var(--vd-accent)}\n.arcv #vd-svg .vd-sel>.vd-c,.arcv #vd-svg .vd-sel>.vd-c>*{stroke:var(--vd-accent) !important;stroke-width:2.6px;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--vd-accent) 55%,transparent))}\n.arcv #vd-svg .vd-l.vd-sel>path.vd-c,.arcv #vd-svg .vd-l.vd-lie>path.vd-c{stroke:var(--vd-accent) !important;stroke-width:2.2px}\n.arcv #vd-svg.vd-focus .vd-f:not(.vd-sel):not(.vd-proche),.arcv #vd-svg.vd-focus .vd-l:not(.vd-sel):not(.vd-lie){opacity:.28}\n.arcv #vd-svg .vd-absent{opacity:.35}\n.arcv #vd-zone.edition #vd-svg.vd-focus .vd-f,.arcv #vd-zone.edition #vd-svg.vd-focus .vd-l{opacity:1}\n.arcv #vd-edition.actif,.arcv #vd-ponts.actif{background:color-mix(in srgb,var(--c-accent) 22%,var(--c-bg3));border-color:var(--c-accent);color:var(--c-accent)}\n.arcv #vd-outils{padding:3px 6px;border:1px solid var(--c-border);border-radius:8px;background:var(--c-bg2)}\n.arcv #vd-outils[hidden]{display:none}\n.arcv #vd-outils .dim{font-size:11px}\n.arcv .vd-aide{font-size:10.5px !important}\n.arcv #vd-zone.edition #vd-svg .vd-f[data-v]{cursor:move}\n.arcv #vd-zone.edition #vd-svg .vd-l[data-v]{cursor:pointer}\n.arcv #vd-zone.calcul,.arcv #vd-zone.calcul *{cursor:progress!important}\n.arcv #vd-svg .edd-choix{fill:none;stroke:var(--vd-accent);pointer-events:none}\n.arcv #vd-svg .edd-poignee{fill:var(--vd-toile);stroke:var(--vd-accent);cursor:nwse-resize}\n.arcv #vd-svg .edd-e,.arcv #vd-svg .edd-w{cursor:ew-resize}\n.arcv #vd-svg .edd-s,.arcv #vd-svg .edd-n{cursor:ns-resize}\n.arcv #vd-svg .edd-ne,.arcv #vd-svg .edd-sw{cursor:nesw-resize}\n.arcv #vd-svg circle.edd-poignee{cursor:move}\n.arcv #vd-svg .edd-bout{cursor:crosshair}\n.arcv #vd-svg .edd-etiq{cursor:move}\n.arcv #vd-svg .edd-etiq-defaut{stroke:var(--vd-accent);pointer-events:none}\n.arcv #vd-svg .edd-info{fill:var(--vd-accent);pointer-events:none;font-family:system-ui,sans-serif}\n.arcv .edd-aide td{padding:3px 10px;vertical-align:top}\n.arcv .edd-aide kbd{white-space:nowrap}\n.arcv #vd-svg .edd-lien{fill:none;stroke:var(--vd-accent);stroke-opacity:.25;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.arcv #vd-svg .edd-guide{stroke:#e5484d;stroke-dasharray:4 3;pointer-events:none}\n.arcv .bco{position:absolute;z-index:4;display:flex;flex-direction:column;gap:1px;padding:3px;background:var(--c-bg2);border:1px solid var(--c-border);\n  border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:default}\n.arcv .bco[hidden]{display:none}\n.arcv .bco-bt{width:26px;height:26px;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:5px;background:none;\n  color:var(--c-text);font-size:14px;line-height:1;cursor:pointer}\n.arcv .bco-bt:hover,.arcv .bco-bt:focus-visible{background:var(--c-bg3);outline:none}\n.arcv .bco-plus{height:16px;font-size:10px;color:var(--c-dim)}\n.arcv .bco-menu{position:absolute;z-index:5;min-width:220px;max-width:360px;max-height:60%;overflow:auto;padding:4px 0;background:var(--c-bg2);\n  border:1px solid var(--c-border);border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.2);cursor:default}\n.arcv .bco-menu[hidden]{display:none}\n.arcv .bco-menu .menu-item{justify-content:flex-start;gap:4px;font-size:12px;color:var(--c-text)}\n.arcv .bco-menu .bco-menu-titre{padding:4px 8px;font-size:11px}\n.arcv .bco-menu .sty{display:grid;gap:4px;padding:2px 10px 6px}\n.arcv .bco-menu .sty-ligne{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:var(--c-text)}\n.arcv .bco-menu .sty-ligne input[type=color]{width:36px;height:22px;padding:0;border:1px solid var(--c-border);border-radius:4px;background:none;cursor:pointer}\n.arcv .bco-menu .sty-ligne input[type=number]{width:56px}\n.arcv .bco-menu .sty-ligne select{max-width:130px}\n.arcv .bco-menu .sty-actions{display:flex;flex-wrap:wrap;gap:4px;padding:6px 10px 4px;border-top:1px solid var(--c-border)}\n.arcv #vd-zone.placement,.arcv #vd-zone.placement #vd-svg .vd-f[data-v]{cursor:crosshair}\n.arcv #vd-svg .bco-trace{stroke:var(--vd-accent);fill:none;pointer-events:none}\n.arcv #vd-svg .bco-trace.ko{stroke:#e5484d}\n.arcv #vd-svg .bco-cible{fill:color-mix(in srgb,var(--vd-accent) 12%,transparent);stroke:var(--vd-accent);pointer-events:none}\n.arcv #vd-svg .bco-cible.ko{fill:color-mix(in srgb,#e5484d 12%,transparent);stroke:#e5484d}\n.arcv #vd-svg .bco-nouveau{fill:color-mix(in srgb,var(--vd-accent) 10%,transparent);stroke:var(--vd-accent);pointer-events:none}\n.arcv #vd-svg .bco-nouveau-texte{fill:var(--vd-accent);pointer-events:none}\n.arcv #vd-svg .bco-fantome{fill:color-mix(in srgb,var(--vd-accent) 30%,transparent);stroke:var(--vd-accent);pointer-events:none}\n.arcv .bco-port{flex:none;width:10px;height:10px;margin-right:6px;border:1.5px solid var(--c-text);background:var(--c-bg2);border-radius:1px}\n.arcv .bco-port-in{background:linear-gradient(135deg,transparent 45%,var(--c-text) 45% 55%,transparent 55%)}\n.arcv .bco-port-out{background:linear-gradient(45deg,transparent 45%,var(--c-text) 45% 55%,transparent 55%)}\n.arcv .bco-port-inout{background:var(--c-dim)}\n.arcv .bco-port-phys{background:#fff477;border-color:#7b694f}\n.arcv .bco-renommer{position:absolute;z-index:5;padding:3px 6px;font:inherit;font-size:13px;color:var(--c-text);background:var(--c-bg2);\n  border:2px solid var(--c-accent);border-radius:5px;box-shadow:0 2px 8px rgba(0,0,0,.18)}\n.arcv #vd-svg .edd-cadre{fill:color-mix(in srgb,var(--vd-accent) 10%,transparent);stroke:var(--vd-accent);pointer-events:none}\n.arcv .vd-pied{font-size:11px}\n.arcv .vd-chercher{display:inline-flex;align-items:center;gap:4px}\n.arcv #vd-chercher{width:190px;padding:3px 7px;font-size:12px}\n.arcv #vd-trouves{font-size:11px;min-width:34px;text-align:center}\n.arcv #vd-chercher.sans-resultat{border-color:var(--c-err);background:color-mix(in srgb,var(--c-err) 10%,var(--c-bg2))}\n.arcv #vd-zone{position:relative}\n.arcv #vd-svg .vd-trouve>.vd-c,.arcv #vd-svg .vd-trouve>.vd-c>*{stroke:#e8590c !important;stroke-width:2.4px}\n.arcv #vd-svg .vd-l.vd-trouve>path.vd-c{stroke:#e8590c !important}\n.arcv #vd-svg .vd-courant>.vd-c,.arcv #vd-svg .vd-courant>.vd-c>*{stroke:#e8590c !important;stroke-width:3.4px;filter:drop-shadow(0 0 6px #e8590c)}\n.arcv #vd-carte{position:absolute;right:10px;bottom:10px;width:220px;height:150px;background:var(--vd-toile,#fff);border:1px solid var(--c-border);\n  border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:crosshair;opacity:.95}\n.arcv #vd-carte[hidden]{display:none}\n.arcv #vd-bulle{position:absolute;z-index:5;max-width:340px;padding:8px 10px;border-radius:8px;background:var(--c-bg2);color:var(--c-text);\n  border:1px solid var(--c-border);box-shadow:0 6px 18px rgba(0,0,0,.3);font-size:12px;line-height:1.4;pointer-events:none}\n.arcv #vd-bulle[hidden]{display:none}\n.arcv .vd-filtres-ancre{position:relative;display:inline-flex}\n.arcv #vd-filtres{position:absolute;top:calc(100% + 4px);right:0;z-index:20;min-width:240px;max-height:60vh;overflow:auto;padding:8px 10px;\n  background:var(--c-bg2);border:1px solid var(--c-border);border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.3);font-size:12px}\n.arcv #vd-filtres[hidden]{display:none}\n.arcv .vd-menu{position:absolute;top:calc(100% + 4px);right:0;z-index:20;min-width:210px;padding:4px;background:var(--c-bg2);border:1px solid var(--c-border);\n  border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.3);font-size:12px;display:flex;flex-direction:column}\n.arcv .vd-menu[hidden]{display:none}\n.arcv .vd-menu button{all:unset;padding:5px 8px;border-radius:5px;cursor:pointer;white-space:nowrap}\n.arcv .vd-menu button:hover{background:var(--c-bg3)}\n.arcv #vd-chaine{max-width:230px}\n.arcv #vd-chaine[hidden]{display:none}\n.arcv #vd-svg{--vd-chaine:#1f6feb}\n.arcv #vd-svg.vd-mode-chaine .vd-f:not(.vd-chaine):not(.vd-chaine-proche),.arcv #vd-svg.vd-mode-chaine .vd-l:not(.vd-chaine){opacity:.22}\n.arcv #vd-svg .vd-chaine>.vd-c,.arcv #vd-svg .vd-chaine>.vd-c>*{stroke:var(--vd-chaine) !important;stroke-width:2.6px}\n.arcv #vd-svg .vd-l.vd-chaine>path.vd-c{stroke:var(--vd-chaine) !important;stroke-width:3px}\n.arcv #vue-diagramme.mode-tableau #vd-chaine{display:none !important}\n.arcv #vd-filtres .vf-titre{font-weight:700;margin:8px 0 3px;color:var(--c-dim);font-size:11px;text-transform:uppercase;letter-spacing:.04em}\n.arcv #vd-filtres .vf-titre:first-child{margin-top:0}\n.arcv #vd-filtres .vf-case{display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer;white-space:nowrap}\n.arcv #vd-filtres .vf-pied{margin-top:8px;text-align:right}\n.arcv #vd-bulle .vb-titre{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;margin-bottom:2px}\n.arcv #vd-bulle .vb-titre svg{flex:none}\n.arcv #vd-bulle .vb-ligne{margin-top:2px}\n.arcv #vd-bulle .vb-texte{margin:5px 0 3px;padding-left:6px;border-left:2px solid var(--c-border)}\n.arcv #vd-carte .vd-carte-vue{fill:color-mix(in srgb,var(--vd-accent) 14%,transparent);stroke:var(--vd-accent);vector-effect:non-scaling-stroke;stroke-width:1.5px}\n.arcv #vue-diagramme.mode-tableau :is(.vd-chercher,#vd-zoom-choix,#vd-carte-bt,.vd-filtres-ancre:has(#vd-filtres)){display:none !important}\n.arcv #vd-tableau,.arcv #vd-tableau-info,.arcv .vd-pied-tableau{display:none}\n.arcv #vue-diagramme.mode-tableau #vd-tableau{display:block}\n.arcv #vue-diagramme.mode-tableau #vd-tableau-info{display:inline-flex}\n.arcv #vue-diagramme.mode-tableau .vd-pied-tableau{display:block}\n.arcv #vue-diagramme.mode-tableau :is(#vd-zone,#vd-outils,.vd-pied-dessin,#vd-edition,#vd-ponts,#vd-theme,#vd-moins,#vd-zoom,#vd-plus,#vd-ajuster,#vd-reel){display:none !important}\n.arcv #vd-tableau{flex:1;min-height:0;overflow:auto;border:1px solid var(--c-border);border-radius:10px;background:var(--c-bg2)}\n.arcv #vd-tableau:focus{outline:none}\n.arcv .vt{border-collapse:separate;border-spacing:0;font-size:12px;table-layout:fixed}\n.arcv .vt th,.arcv .vt td{border-right:1px solid var(--c-bg3);border-bottom:1px solid var(--c-bg3);padding:3px 6px;height:22px;\n  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box}\n.arcv .vt thead th{position:sticky;top:0;z-index:2;background:var(--c-bg4);font-weight:600;text-align:left;border-bottom-color:var(--c-border)}\n.arcv .vt .vt-lig{position:sticky;left:0;z-index:1;background:var(--c-bg3);font-weight:400;text-align:left;border-right-color:var(--c-border)}\n.arcv .vt thead .vt-coin{left:0;z-index:3}\n.arcv .vt td{text-align:center;color:var(--c-text)}\n.arcv .vt [data-sem]{cursor:pointer}\n.arcv .vt [data-sem]:hover{color:var(--c-accent)}\n.arcv .vt .vt-axe{background:color-mix(in srgb,var(--c-accent) 10%,transparent)}\n.arcv .vt tr.vt-axe>.vt-lig{background:color-mix(in srgb,var(--c-accent) 18%,var(--c-bg3))}\n.arcv .vt .vd-sel{outline:2px solid var(--c-accent);outline-offset:-2px;background:color-mix(in srgb,var(--c-accent) 22%,var(--c-bg2))}\n.arcv .vt .vt-lig.vd-sel{background:color-mix(in srgb,var(--c-accent) 28%,var(--c-bg3))}\n.arcv .vt .vt-absent{opacity:.5}\n.arcv .vt-ico{display:inline-flex;vertical-align:-3px;margin-right:4px}\n.arcv .vt-pli{display:inline-block;width:14px;padding:0;margin-right:2px;border:0;background:none;color:var(--c-dim);cursor:pointer;font-size:10px}\n.arcv .vt-vide{padding:16px}\n.arcv #detail-formulaire.lecture-seule #bt-appliquer,.arcv #detail-formulaire.lecture-seule #bt-defaire-saisie{display:none}\n/* Visionneuse : disposition propre (le reste des styles vient de src/css/styles.css, préfixé par .arcv) */\n.arcv{--c-OA:#d9a400;--c-SA:#3fa33f;--c-LA:#1f9ab3;--c-PA:#d8742f;--c-EPBS:#8a5ce0;\n  display:grid;grid-template-columns:minmax(220px,24%) 1fr;gap:10px;height:100%;min-height:0;font-size:13px;color:var(--c-text);position:relative}\n.arcv.sans-liste{grid-template-columns:1fr}\n.arcv.sans-liste .arcv-gauche{display:none}\n.arcv-gauche{display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden}\n.arcv-gauche #diag-liste{flex:1;overflow:auto;list-style:none;margin:0;padding:0}\n.arcv-centre{display:flex;flex-direction:column;min-height:0;min-width:0}\n.arcv #panneau-detail.mode-diagramme{padding:0 !important}\n#arcv-vide{margin:auto;font-size:14px}\n.arcv #toast{position:absolute}\n.arcv .vd-pied-dessin,.arcv #vd-edition,.arcv #vd-outils{display:none !important}\n";
/* ── src/visionneuse/socle-fin.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   VISIONNEUSE — API (après le dessin)
   ───────────────────────────────────────────────────────────────────────
   window.ArcatureVisionneuse : visionneuse autonome des diagrammes Capella (.aird), en lecture seule.
     creer(conteneur, { choix(id, infos), liste, elk })     → crée la visionneuse dans un élément
     chargerModele(texteCapella, nom)                      → modèle .capella (icônes, liaisons, chaînes)
     chargerAird(texteAird, nom)                           → diagrammes ; renvoie le nombre de représentations
     representations()                                     → [{ uid, nom, type, sigle, genre, couche }]
     diagrammesDe(id)                                      → { cibles, presences } : représentations d'un élément
     ouvrir(uid, [id])  choisir(id)  fermer()  theme('capella' | 'clair' | 'sombre')
     icone(id, [taille]) / iconeType(type, [taille])        → icône SVG d'un élément (variante comme Capella) ou d'un type
     disposer(mode) → Promise                               → vue réorganisée du diagramme ouvert (mise en page automatique
                                                              d'Arcature, en mémoire : le .aird n'est jamais modifié)
     origine(vrai)  disposition([uid])  oublier([uid])      → bascule vue d'origine / réorganisée, état, retour définitif
   ARCV_GABARIT (HTML) et ARCV_CSS (styles préfixés par .arcv) sont produits par node build.js --visionneuse.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Affichage de la vue : le diagramme s'il y en a un d'ouvert, sinon l'invitation à en choisir un
 * (remplace la bascule Élément / diagramme d'Arcature).
 */
function vdOnglet() {
  const ouvert = !!VD.rep;
  $('vue-diagramme').hidden = !ouvert;
  $('arcv-vide').hidden = ouvert;
  $('panneau-detail').classList.toggle('mode-diagramme', ouvert);
  $('centre-onglets').hidden = true;
}

/**
 * Représentation exposée à l'hôte.
 * @param {object} r représentation (diaLire)
 * @returns {{uid:string, nom:string, type:string, sigle:string, genre:string, couche:string}}
 */
function arcvRep(r) { return { uid: r.uid, nom: r.nom, type: r.type, sigle: vdSigle(r), genre: r.genre, couche: vdCouche(r) }; }

/** Recalcule les présences des éléments (Parts rattachées à leur composant) d'après le modèle et le .aird. */
function arcvPresences() {
  VD.presences = new Map(); VD.noms = new Map();
  if (!VD.aird) return;
  for (const [id, reps] of VD.aird.presences) {
    const el = ARC.doc && ARC.doc.parId.get(id);
    if (el) VD.noms.set(id, xtAttr(el, 'name') ?? '');
    const m = vdIdModele(id);
    if (!VD.presences.has(m)) VD.presences.set(m, new Set());
    for (const r of reps) VD.presences.get(m).add(r);
  }
}

/* ── Vue réorganisée : mise en page automatique (E5) appliquée en mémoire, réversible ─────────────────
   Les changements GMF calculés par diaMiseEnPage sont posés sur le .aird lu en mémoire (VD.aird.doc) et gardés pour être
   défaits : la vue d'origine revient à l'identique, le fichier .aird de l'hôte n'est jamais touché (aucune écriture). */

/** Modes de réorganisation proposés à l'hôte. */
const ARCV_MODES = ['etiquettes', 'liens', 'auto', 'couches', 'arbre', 'grille'];

/**
 * Moteur ELK (elkjs) : fourni par l'hôte (options.elk : instance, ou fonction qui la renvoie), sinon lu dans le bloc
 * « arc-elk » de la page (texte évalué au premier usage, comme dans Arcature), sinon absent (disposition maison). Une absence
 * n'est pas retenue (l'hôte peut fournir le moteur plus tard) ; un échec de chargement l'est.
 * @returns {object|null} instance d'ELK (layout(graphe) → Promise), ou null
 */
function arcvElk() {
  if (VIS.elk || VIS.elk === false) return VIS.elk || null;
  try {
    const o = VIS.options.elk;
    let elk = typeof o === 'function' ? o() : o || null;
    if (!elk) {
      const s = document.getElementById('arc-elk');
      if (typeof window.ELK !== 'function' && s && s.textContent.trim()) (0, eval)(s.textContent);   // définit window.ELK
      if (typeof window.ELK === 'function') elk = new window.ELK();
    }
    if (elk) VIS.elk = elk;
  } catch (e) { console.error(e); VIS.elk = false; }
  return VIS.elk || null;
}

/**
 * Applique ou défait la réorganisation d'une représentation, puis recalcule sa scène (et redessine le diagramme affiché, ajusté).
 * @param {object} rep représentation
 * @param {boolean} active vrai : vue réorganisée ; faux : vue d'origine
 */
function arcvActiver(rep, active) {
  const d = VIS.dispositions.get(rep.uid);
  if (!d || d.active === active) return;
  const sens = active ? 'apres' : 'avant', liste = active ? d.changements : d.changements.slice().reverse();
  for (const c of liste) xtDefinirAttr(VD.aird.doc, c.el, c.n, c[sens], c.ordre);
  d.active = active;
  rep.scene = null;
  if (VD.rep === rep) { diaScene(VD.aird, rep); vdRedessiner(); vdAjuster(); }
}

/**
 * Plan de mise en page d'un diagramme (modifications voulues par diaMiseEnPage), calculé sur sa scène d'origine :
 * étiquettes seules replacées, liens retracés en angles droits (formes gardées), ou tout le premier niveau disposé (contenu
 * des conteneurs avec ELK ; « auto » : étoile pour un diagramme en étoile, arbre pour une décomposition, couches sinon).
 * @param {object} rep représentation (genre « diagramme »)
 * @param {string} mode un des ARCV_MODES
 * @returns {Promise<{plan:object, genre:string, moteur:string}>}
 * @throws {Error} rien à réorganiser
 */
async function arcvPlan(rep, mode) {
  const sc = rep.scene, aird = VD.aird;
  if (mode === 'etiquettes') {
    const liens = sc.liens.filter(diaAEtiquette);
    if (!liens.length) throw new Error(_L('Aucune étiquette de lien à placer.'));
    return { plan: { etiquettes: diaPlacerEtiquettes(sc, new Map(liens.map(l => [l, l.points]))) }, genre: mode, moteur: 'maison' };
  }
  let plan, genre = mode, moteur = 'maison';
  if (mode === 'liens') {
    if (!sc.liens.length) throw new Error(_L('Aucun lien à retracer.'));
    const r = diaTracesOrthogonales(aird, sc, sc.liens);
    plan = { traces: r.traces, ancres: r.ancres };
  } else {
    const formes = sc.formes.filter(f => !f.parent && f.genre !== 'port' && f.genre !== 'ligne' && diaDeplacable(aird, f));
    if (formes.length < 2) throw new Error(_L('Rien à disposer : il faut au moins deux éléments.'));
    const sens = diaSensDominant(sc, formes);
    if (mode === 'auto') {
      genre = 'couches';
      const liensDe = sc.liens.filter(l => !l.attacheNote && formes.some(f => f === l.source || f === l.cible));
      if (diaEtoile(sc, formes)) genre = 'etoile';
      else if (liensDe.length && liensDe.every(l => l.arbre)) genre = 'arbre';
    }
    const elk = genre === 'couches' ? arcvElk() : null;
    if (elk) {
      const g = diaGrapheElk(sc, formes, 'couches', { sens });
      plan = diaResultatElk(aird, sc, formes, await elk.layout(g.graphe), g);
      moteur = 'elk';
    } else plan = diaDisposer(aird, sc, formes, genre, { sens, trace: 'orthogonal' });
  }
  plan.etiquettes = diaAvecEtiquettes(sc, plan);       // étiquettes des liens retracés placées
  return { plan, genre, moteur };
}

/**
 * État de réorganisation exposé à l'hôte.
 * @param {object} d disposition gardée
 * @returns {{mode:string, genre:string, moteur:string, origine:boolean, changements:number}}
 */
function arcvDispoInfo(d) { return { mode: d.mode, genre: d.genre, moteur: d.moteur, origine: !d.active, changements: d.changements.length }; }

const ArcatureVisionneuse = {
  /** Version d'Arcature dont provient la visionneuse. */
  version: ARC_VERSION,

  /**
   * Crée la visionneuse dans un conteneur (une seule par page).
   * @param {HTMLElement} conteneur élément hôte (sa hauteur fixe celle de la visionneuse)
   * @param {{choix?:function(string, object):void, liste?:boolean, elk?:(object|function():object)}} [options] choix : appelé au
   *   clic sur un élément (identifiant du modèle, { type, nom, couche }) ; liste : liste des diagrammes à gauche (vrai par
   *   défaut) ; elk : moteur ELK pour la réorganisation en couches (sinon bloc « arc-elk » de la page, sinon disposition maison)
   * @returns {object} l'API
   */
  creer(conteneur, options) {
    VIS.options = options || {};
    if (!document.getElementById('arcv-styles')) {
      const st = document.createElement('style');
      st.id = 'arcv-styles'; st.textContent = ARCV_CSS;
      document.head.appendChild(st);
    }
    conteneur.innerHTML = ARCV_GABARIT;
    VIS.racine = conteneur.querySelector('.arcv');
    VIS.racine.classList.toggle('sans-liste', VIS.options.liste === false);
    vdInitialiser();
    eddMajBarre();
    // Ctrl+F : recherche dans le diagramme affiché
    VIS.racine.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && VD.rep && !VD.tableau) { e.preventDefault(); $('vd-chercher').focus(); $('vd-chercher').select(); }
    });
    vdListe();
    vdOnglet();
    return this;
  },

  /**
   * Charge le modèle .capella (texte) : noms, icônes, liaisons et chaînes des éléments dessinés.
   * @param {string} texte contenu du .capella
   * @param {string} [nom] nom du fichier
   */
  chargerModele(texte, nom) {
    ARC.doc = xtLire(texte); ARC.nom = nom || '';
    UI.liaisons = null; UI.courant = null; VD.images = new Map();
    arcvPresences();
    if (VD.rep) vdRedessiner();
    vdListe();
  },

  /**
   * Charge les diagrammes (.aird, texte). Le modèle doit être chargé avant pour les icônes et les noms à jour.
   * @param {string} texte contenu du .aird
   * @param {string} [nom] nom du fichier
   * @returns {number} nombre de représentations
   */
  chargerAird(texte, nom) {
    VIS.dispositions = new Map(); VIS.jeton++;
    VD.aird = diaLire(texte); VD.nom = nom || ''; VD.rep = null; VD.selection = ''; VD.historique = [];
    arcvPresences();
    vdFermer();
    vdListe();
    vdOnglet();
    return VD.aird.reps.length;
  },

  /** @returns {object[]} représentations du .aird (diagrammes et tableaux) */
  representations() { return VD.aird ? VD.aird.reps.map(arcvRep) : []; },

  /**
   * Représentations d'un élément : celles dont il est la cible et celles où il est dessiné.
   * @param {string} id identifiant de l'élément du modèle
   * @returns {{cibles:object[], presences:object[]}}
   */
  diagrammesDe(id) {
    if (!VD.aird) return { cibles: [], presences: [] };
    return { cibles: [...(VD.aird.cibles.get(id) || [])].map(arcvRep), presences: [...(VD.presences.get(id) || [])].map(arcvRep) };
  },

  /**
   * Ouvre une représentation, et met en évidence un élément.
   * @param {string} uid identifiant de la représentation
   * @param {string} [id] élément à centrer
   */
  ouvrir(uid, id) { vdOuvrir(uid, id); vdOnglet(); },

  /**
   * Met en évidence un élément dans le diagramme affiché (centré).
   * @param {string} id identifiant de l'élément du modèle
   * @returns {boolean} vrai si l'élément y est dessiné
   */
  choisir(id) { return VD.rep ? vdMarquer(id, true) : false; },

  /** Ferme le diagramme affiché. */
  fermer() { vdFermer(); vdOnglet(); },

  /**
   * Thème du dessin.
   * @param {string} t « capella », « clair » ou « sombre »
   */
  theme(t) { vdChoisirTheme(t); },

  /**
   * Icône d'un élément du modèle chargé, choisie comme dans Capella (acteur, humain, nature, genre de fonction,
   * mécanisme d'élément échangé…, surcouches comprises) ; à défaut, icône de son type.
   * @param {string} id identifiant de l'élément du modèle
   * @param {number} [taille] côté en pixels (16 par défaut)
   * @returns {string} élément <svg> autonome, ou '' (élément inconnu ou sans dessin)
   */
  icone(id, taille) {
    const el = ARC.doc && ARC.doc.parId.get(id);
    if (!el) return '';
    return icoSvgSeul(icoVariante(el, ARC.doc), taille) || icoSvgSeul(icoVarianteType(modType(el)), taille);
  },

  /**
   * Icône d'un type d'élément (sans variante), utilisable sans modèle chargé.
   * @param {string} type type court (« SystemFunction »)
   * @param {number} [taille] côté en pixels (16 par défaut)
   * @returns {string} élément <svg> autonome, ou ''
   */
  iconeType(type, taille) { return icoSvgSeul(icoVarianteType(type), taille); },

  /** Modes de réorganisation : etiquettes, liens, auto, couches, arbre, grille. */
  modes: ARCV_MODES.slice(),

  /** @returns {boolean} vrai si le moteur ELK est disponible (couches hiérarchiques ; sinon disposition maison) */
  elkDisponible() { return !!arcvElk(); },

  /**
   * Réorganise le diagramme ouvert et affiche cette vue réorganisée (la précédente, s'il y en a une, est d'abord défaite) :
   * - etiquettes : étiquettes des liens replacées seules (formes et tracés gardés) ;
   * - liens : liens retracés en angles droits, contournant les formes, écartés (formes gardées) ;
   * - auto, couches, arbre, grille : premier niveau disposé (auto : étoile, arbre ou couches selon le diagramme).
   * Tout se passe en mémoire : le .aird chargé n'est pas modifié, origine(true) rend la vue d'origine à l'identique.
   * @param {string} mode un des modes
   * @returns {Promise<object|null>} état (disposition()), ou null si un autre diagramme a été ouvert pendant le calcul
   * @throws {Error} diagramme absent ou non réorganisable (séquence, tableau), rien à réorganiser
   */
  async disposer(mode) {
    const rep = VD.rep;
    if (!ARCV_MODES.includes(mode)) throw new Error(_Lp('Mode de réorganisation inconnu : {m}', { m: mode }));
    if (!rep || !diaModifiable(rep)) throw new Error(_L('Seuls les diagrammes se réorganisent (ni les séquences ni les tableaux).'));
    arcvActiver(rep, false);
    VIS.dispositions.delete(rep.uid);
    const sc = diaScene(VD.aird, rep), jeton = ++VIS.jeton, zone = $('vd-zone');
    let r;
    try { if (zone) zone.classList.add('calcul'); r = await arcvPlan(rep, mode); }
    finally { if (zone) zone.classList.remove('calcul'); }
    if (jeton !== VIS.jeton || rep.scene !== sc) return null;   // diagramme ou .aird changé pendant le calcul : résultat abandonné
    const d = { mode, genre: r.genre, moteur: r.moteur, changements: diaMiseEnPage(VD.aird, sc, r.plan), active: false };
    VIS.dispositions.set(rep.uid, d);
    arcvActiver(rep, true);
    return arcvDispoInfo(d);
  },

  /**
   * Vue d'origine (telle qu'enregistrée dans le .aird) ou vue réorganisée du diagramme ouvert, déjà calculée par disposer.
   * @param {boolean} vrai vrai : vue d'origine ; faux : vue réorganisée
   * @returns {boolean} vrai si le diagramme ouvert a une vue réorganisée
   */
  origine(vrai) {
    if (!VD.rep || !VIS.dispositions.has(VD.rep.uid)) return false;
    arcvActiver(VD.rep, !vrai);
    return true;
  },

  /**
   * État de réorganisation d'une représentation.
   * @param {string} [uid] représentation (par défaut : celle ouverte)
   * @returns {{mode:string, genre:string, moteur:string, origine:boolean, changements:number}|null} null : jamais réorganisée
   */
  disposition(uid) {
    const u = uid || (VD.rep && VD.rep.uid), d = u && VIS.dispositions.get(u);
    return d ? arcvDispoInfo(d) : null;
  },

  /**
   * Abandonne la vue réorganisée d'une représentation (vue d'origine rendue, calcul oublié).
   * @param {string} [uid] représentation (par défaut : celle ouverte ; '*' : toutes)
   */
  oublier(uid) {
    const uids = uid === '*' ? [...VIS.dispositions.keys()] : [uid || (VD.rep && VD.rep.uid)];
    for (const u of uids) {
      const rep = u && VD.aird && VD.aird.reps.find(x => x.uid === u);
      if (rep) arcvActiver(rep, false);
      VIS.dispositions.delete(u);
    }
  }
};

window.ArcatureVisionneuse = ArcatureVisionneuse;

})();
