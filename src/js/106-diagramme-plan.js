/* ═══════════════════════════════════════════════════════════════════════
   ☷ PLAN DU DIAGRAMME (« Outline » de Capella) — vue 🔲 Diagrammes
   ───────────────────────────────────────────────────────────────────────
   Volet sous l'explorateur (#cdg-plan, entre la liste des diagrammes et la ▣ carte) : les éléments du modèle
   présents dans le diagramme ouvert, pour tous les formats (diagrammes Capella du .aird, diagrammes et vues des
   lecteurs SysML / UML).
   Regroupements : 🧩 Composition (par défaut : chaque élément sous celui qui le contient DANS LE DESSIN —
   composant › fonction › ports, liens à part), par type, par couche, de A à Z, 🌳 arborescence du modèle
   (propriétaires). Filtre ; clic = élément centré dans le diagramme et ouvert dans le panneau de détail ;
   l'élément cliqué dans le dessin est repéré dans le plan. ⧉ détache le plan dans une fenêtre séparée.
   Exports (⬇) : éléments de ce diagramme, des diagrammes sélectionnés ou de tous les diagrammes (une ligne par
   diagramme et par élément, avec le conteneur graphique), par la fenêtre « Colonnes de l'export » (53 : ID,
   owner, chemin, description, attributs… ; CSV ou Excel selon ⚙ Préférences), ou 📋 copie pour Excel / Word.
   Les formes dessinées sont lues dans le dessin affiché (attributs data-sem / data-v) ; leur imbrication vient
   du .aird (nœuds GMF « children » imbriqués, capPlanAird) ou des formes du lecteur (`parent`). Une Part est
   ramenée à son composant et une implication sans nom à l'élément impliqué (capDosEoReel, 102) ; les éléments
   techniques sans nom ne sont pas listés (leur nombre est rappelé).
   ═══════════════════════════════════════════════════════════════════════ */

/** État du plan : replié, hauteur, filtre, regroupement, groupes repliés, élément repéré, diagramme et signature du contenu affiché,
 * lignes (un élément par ligne), formes dessinées et leur parent, volet (`zone`, gardé quand il est dans la fenêtre séparée `win`), imbrications lues dans le .aird. */
const _capPlan = { reduit: false, h: 200, q: '', groupe: 'compo', plies: new Set(), sel: '', uid: '', sig: null, lignes: [], vues: [], parent: () => '',
  parSem: new Map(), horsListe: 0, zone: null, win: null, aird: null };

/** @returns {string} représentation ouverte dans la vue 🔲 ('' : aucune) */
function capPlanUid() {
  if (capDiagSy()) return typeof _capSyVues !== 'undefined' && _capSyVues.cle ? 'sy:' + _capSyVues.cle : '';
  return _capDiag.actif || '';
}

/** @returns {?Window} fenêtre séparée du plan, si elle est ouverte */
function capPlanPop() { const w = _capPlan.win; return w && !w.closed ? w : null; }

/** @returns {?HTMLElement} volet du plan : dans la page, ou dans sa fenêtre séparée */
function capPlanZone() {
  if (capPlanPop() && _capPlan.zone) return _capPlan.zone;
  return (_capPlan.zone = document.getElementById('cdg-plan'));
}

/**
 * Imbrication des formes d'un diagramme Capella, lue dans le .aird sans la visionneuse (gardée par .aird et par diagramme) : les nœuds
 * de notation GMF (« children », « edges ») sont imbriqués comme le dessin (conteneur › compartiment › nœud › port de bord) et
 * désignent chacun un élément de diagramme Sirius (`element`), dont la cible (`target`) est l'élément du modèle.
 * @param {string} uid - Représentation
 * @returns {?{par:Map<string,string>, elt:Map<string,string>, cible:Map<string,string>, liens:Set<string>, ordre:string[]}}
 *   nœud → nœud parent, nœud → élément de diagramme, élément de diagramme → élément du modèle, nœuds qui sont des liens, nœuds dans l'ordre du fichier
 */
function capPlanAird(uid) {
  const t = _capDiag.texteAird; if (!t || typeof capDgAnalyser !== 'function') return null;
  if (!_capPlan.aird || _capPlan.aird.t !== t) _capPlan.aird = { t, m: new Map() };
  const m = _capPlan.aird.m; if (m.has(uid)) return m.get(uid);
  const d = capDgAnalyser(t).get(uid), corps = d ? d.corps : '';
  const att = (a, k) => { const r = new RegExp('\\s' + k + '="([^"]*)"').exec(a); return r ? r[1] : ''; };
  const par = new Map(), elt = new Map(), cible = new Map(), liens = new Set(), ordre = [], pile = [];
  const re = /<(\/?)(children|edges)\b((?:[^>"]|"[^"]*")*?)(\/?)>/g;
  let x;
  while ((x = re.exec(corps))) {
    if (x[1]) { pile.pop(); continue; }
    const id = att(x[3], 'xmi:id'), el = att(x[3], 'element');
    if (id) { par.set(id, pile.length ? pile[pile.length - 1] : '');
      if (el) { elt.set(id, el); ordre.push(id); if (x[2] === 'edges') liens.add(id); } }
    if (!x[4]) pile.push(id);
  }
  // Cible de chaque élément de diagramme : première balise « target » qui suit son ouverture
  const ro = /<(?:ownedDiagramElements|ownedBorderedNodes|ownedElements)\b((?:[^>"]|"[^"]*")*?)>/g, rt = /<target\b[^>]*?href="[^"#]*#([^"]+)"/g;
  while ((x = ro.exec(corps))) {
    const u = att(x[1], 'uid'); if (!u || x[1].endsWith('/')) continue;
    rt.lastIndex = ro.lastIndex; const y = rt.exec(corps);
    if (y && y.index - ro.lastIndex < 300) cible.set(u, y[1]);
  }
  const r = { par, elt, cible, liens, ordre };
  m.set(uid, r);
  return r;
}

/**
 * Formes d'un diagramme et leur imbrication graphique.
 * Diagramme Capella ouvert : formes du dessin de la visionneuse (`data-v` = nœud de notation, `data-sem` = élément) ; autre diagramme
 * Capella : nœuds du .aird dont l'élément est dessiné (index des présences, 102), sans l'ouvrir ; vue d'un lecteur : formes (`parent`),
 * lignes de leurs compartiments, liens. Un tableau n'a pas de forme.
 * @param {string} uid - Représentation
 * @returns {{vues:{v:string, sem:string, lien?:boolean, port?:boolean}[], parent:function(string):string}} formes dans l'ordre du dessin, forme → forme parente ('' : aucune)
 */
function capPlanVues(uid) {
  const vide = { vues: [], parent: () => '' };
  if (!uid) return vide;
  if (String(uid).startsWith('sy:')) {
    const v = capSyVue(uid.slice(3)); if (!v || v.tableau) return vide;
    const vues = [], par = new Map(), ports = new Set(), vus = new Set();
    (v.formes || []).forEach(f => (f.ports || []).forEach(p => ports.add(p)));
    (v.formes || []).forEach(f => {
      par.set(f.id, f.parent || '');
      if (f.element) { vues.push({ v: f.id, sem: f.element, port: ports.has(f.id) }); vus.add(f.element); }
      (f.compartiments || []).forEach(c => (c.lignes || []).forEach(l => { if (!l.element) return; const k = f.id + '§' + l.element; vues.push({ v: k, sem: l.element }); par.set(k, f.id); vus.add(l.element); }));
    });
    (v.liens || []).forEach(l => { if (l.element) { vues.push({ v: l.id, sem: l.element, lien: true }); vus.add(l.element); } });
    (String(v.svg || '').match(/data-sem="[^"]+"/g) || []).forEach(a => { const id = a.slice(10, -1); if (!vus.has(id)) { vus.add(id); vues.push({ v: '§' + id, sem: id }); } });
    return { vues, parent: k => par.get(k) || '' };
  }
  const r = capDiagReps().find(x => x.uid === uid);
  if (!r || r.genre === 'tableau') return vide;
  const A = capPlanAird(uid), parent = k => (A && A.par.get(k)) || '';
  if (uid === capPlanUid()) return { parent, vues: [...document.querySelectorAll('#vd-svg [data-sem]')].map((e, i) => ({ v: e.getAttribute('data-v') || '§' + i, sem: e.getAttribute('data-sem'),
    lien: e.classList.contains('vd-l'), port: e.classList.contains('vd-port') })) };
  const dessines = typeof capDosDiagEls === 'function' ? capDosDiagEls(uid).vus : new Set(), vus = new Set(), vues = [];
  if (A) A.ordre.forEach(k => { const sem = A.cible.get(A.elt.get(k)) || ''; if (sem && dessines.has(sem)) { vus.add(sem); vues.push({ v: k, sem, lien: A.liens.has(k) }); } });
  dessines.forEach(id => { if (!vus.has(id)) vues.push({ v: '§' + id, sem: id }); });   // dessiné mais non retrouvé dans le .aird : à la racine
  return { vues, parent };
}

/**
 * Élément du modèle désigné par un identifiant dessiné : Part → composant, implication sans nom → élément impliqué (102).
 * @param {string} id - Identifiant dessiné
 * @returns {?object} élément nommé, ou null (élément technique sans nom, élément absent du modèle)
 */
function capPlanReel(id) {
  if (typeof capDosEoReel === 'function') return capDosEoReel(id);
  const e = capGetElementById_(id); return e && e.attrs.name ? e : null;
}

/**
 * Ligne du plan pour un élément.
 * @param {object} e - Élément du modèle
 * @param {string} sem - Identifiant dessiné qui le désigne
 * @returns {{id:string, sem:string, nom:string, typeName:string, type:string, couche:string}}
 */
function capPlanLigne(e, sem) {
  return { id: e.id, sem, nom: e.attrs.name || '', typeName: e.typeName, type: (CAP_HUMAN_NAMES[e.typeName] || {}).h || e.typeName, couche: capDiagSy() ? '' : e.layer || '' };
}

/**
 * Lignes du plan pour une liste d'identifiants dessinés (un élément par ligne, triées par nom).
 * @param {string[]} ids - Identifiants dessinés
 * @returns {{lignes:object[], parSem:Map<string,string>, hors:number}} lignes, identifiant dessiné → élément listé, nombre d'identifiants sans élément nommé
 */
function capPlanLignesDe(ids) {
  const vus = new Map(), parSem = new Map(), faits = new Set(); let hors = 0;
  ids.forEach(sem => {
    if (faits.has(sem)) return; faits.add(sem);
    const e = capPlanReel(sem); if (!e) { hors++; return; }
    parSem.set(sem, e.id);
    if (!vus.has(e.id)) vus.set(e.id, capPlanLigne(e, sem));
  });
  const lignes = [...vus.values()].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true }) || a.type.localeCompare(b.type));
  return { lignes, parSem, hors };
}

/** Lignes affichées : celles du diagramme ouvert, filtrées par le champ de recherche (nom, type, couche). @returns {object[]} */
function capPlanFiltrees() {
  const q = _capPlan.q.trim().toLowerCase();
  return q ? _capPlan.lignes.filter(l => (l.nom + ' ' + l.type + ' ' + l.typeName + ' ' + l.couche).toLowerCase().includes(q)) : _capPlan.lignes;
}

/**
 * 🧩 Composition du diagramme : chaque élément sous celui qui le contient dans le dessin (composant › sous-composant ou fonction › ports),
 * formes sans élément nommé sautées, formes d'un même élément réunies (ligne de vie et ses exécutions, élément dessiné deux fois dans le
 * même conteneur) ; les liens (échanges, allocations…) sont réunis dans un groupe en fin de liste.
 * @param {object[]} vues - Formes (capPlanVues)
 * @param {function(string):string} parent - Forme → forme parente
 * @param {?Set<string>} [garder] - Éléments retenus par le filtre (leurs conteneurs sont gardés) ; null : tous
 * @returns {object[]} racines {cle, id, sem, nom, typeName, type, couche, present, port?, groupe?, enfants}
 */
function capPlanCompo(vues, parent, garder) {
  const noeuds = new Map(), liens = new Map();
  vues.forEach(x => {
    const e = capPlanReel(x.sem); if (!e) return;
    if (x.lien) { if (!liens.has(e.id)) liens.set(e.id, { cle: x.v, ...capPlanLigne(e, x.sem), present: true, enfants: [] }); return; }
    noeuds.set(x.v, { cle: x.v, ...capPlanLigne(e, x.sem), present: true, port: !!x.port, enfants: [] });
  });
  // Forme parente listée la plus proche (les compartiments et les formes sans élément nommé sont traversés)
  const pere = new Map();
  noeuds.forEach((n, v) => { let p = parent(v), k = 0; while (p && !noeuds.has(p) && k++ < 60) p = parent(p); pere.set(v, p && noeuds.has(p) ? p : ''); });
  const canon = v => { let k = 0; while (pere.get(v) && noeuds.get(pere.get(v)).id === noeuds.get(v).id && k++ < 60) v = pere.get(v); return v; };   // même élément que son conteneur : une seule ligne
  const racines = [];
  noeuds.forEach((n, v) => { if (canon(v) !== v) return; const p = pere.get(v); (p ? noeuds.get(canon(p)).enfants : racines).push(n); });
  /** Réunit les lignes d'un même élément, filtre, puis trie : formes par nom, ports ensuite. */
  const ranger = l => {
    const parId = new Map(), out = [];
    l.forEach(n => { const d = parId.get(n.id); if (d) d.enfants.push(...n.enfants); else { parId.set(n.id, n); out.push(n); } });
    out.forEach(n => { n.enfants = ranger(n.enfants); });
    return out.filter(n => !garder || garder.has(n.id) || n.enfants.length)
      .sort((a, b) => (a.port ? 1 : 0) - (b.port ? 1 : 0) || a.nom.localeCompare(b.nom, undefined, { numeric: true }));
  };
  const arbre = ranger(racines), dessines = new Set();
  const noter = l => l.forEach(n => { dessines.add(n.id); noter(n.enfants); }); noter(arbre);
  const ll = [...liens.values()].filter(n => !dessines.has(n.id) && (!garder || garder.has(n.id))).sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true }));
  if (ll.length) arbre.push({ cle: '@liens', id: '', sem: '', nom: _L('Liens et échanges'), typeName: '', type: '', couche: '', present: false, groupe: true, enfants: ll });
  return arbre;
}

/**
 * Conteneur graphique de chaque élément d'un diagramme (premier conteneur rencontré).
 * @param {object[]} racines - capPlanCompo
 * @returns {Map<string,{id:string, nom:string}>} élément → conteneur
 */
function capPlanConteneurs(racines) {
  const m = new Map();
  const walk = (l, p) => l.forEach(n => { if (p && p.present && n.id && !m.has(n.id)) m.set(n.id, { id: p.id, nom: p.nom }); walk(n.enfants, n); });
  walk(racines, null);
  return m;
}

/**
 * 🌳 Arborescence du modèle réduite aux éléments du diagramme : chaque élément sous ses propriétaires nommés, à partir du
 * premier propriétaire qui n'est pas commun à tous.
 * @param {object[]} lignes - Lignes du plan
 * @returns {object[]} racines {cle, id, sem, nom, typeName, type, couche, present, enfants} (`present` : faux pour un propriétaire absent du diagramme)
 */
function capPlanArbre(lignes) {
  const { parentOf } = capGetParentIndex();
  const chemins = lignes.map(l => {
    const ch = []; let p = parentOf[l.id], k = 0;
    while (p && k++ < 100) { const e = capGetElementById_(p); if (e && e.attrs.name && e.typeName !== 'Project') ch.unshift(e); p = parentOf[p]; }
    return ch;
  });
  let commun = 0;   // propriétaires communs à toutes les lignes : seul le dernier est gardé
  if (chemins.length > 1) while (chemins.every(c => c.length > commun + 1 && c[commun].id === chemins[0][commun].id)) commun++;
  const racines = [], noeuds = new Map();
  const noeud = (e, pere) => {
    let n = noeuds.get(e.id);
    if (!n) { n = { cle: e.id, ...capPlanLigne(e, e.id), present: false, enfants: [] }; noeuds.set(e.id, n); (pere ? pere.enfants : racines).push(n); }
    return n;
  };
  lignes.forEach((l, i) => {
    let pere = null;
    chemins[i].slice(commun).forEach(e => { pere = noeud(e, pere); });
    const n = noeud(capGetElementById_(l.id), pere); n.present = true; n.sem = l.sem;
  });
  const trier = l => { l.sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true })); l.forEach(n => trier(n.enfants)); };
  trier(racines);
  return racines;
}

/** Contenu du volet : en-tête (replier, nombre, 📋, ⬇, ⧉), filtre et regroupement, liste. @returns {string} HTML */
function capPlanHtml() {
  const esc = capEsc, P = _capPlan, uid = capPlanUid(), sy = capDiagSy(), tous = P.lignes, l = capPlanFiltrees(), pop = !!capPlanPop();
  const rep = uid ? capDiagReps().find(x => x.uid === uid) : null;
  const nSel = _capDiag.sel.size, nReps = capDiagCharge() ? capDiagReps().length : 0;
  let h = `<div class="cdg-carte-tete cdg-plan-tete">` +
    (pop ? `<b title="${rep ? esc(rep.nom) : ''}">${_L('☷ Plan')}</b>` : `<span class="cdg-carte-tog" data-plan="tog" title="${_L('Plan du diagramme (Outline) : éléments du modèle présents dans le diagramme ouvert')}"><span class="cdg-tog">${P.reduit ? '▸' : '▾'}</span><b>${_L('☷ Plan')}</b></span>`) +
    `<span class="cdg-cnt">${uid ? (l.length < tous.length ? _L(`${l.length} / ${tous.length} élément(s)`) : _L(`${tous.length} élément(s)`)) : ''}</span><span style="flex:1"></span>` +
    `<button class="cap-lf-btn" data-plan="copier" title="${_L('Copier la liste affichée (à coller dans Excel ou Word)')}"${l.length ? '' : ' disabled'}>📋</button>` +
    `<span class="sy-menu-w"><button class="cap-lf-btn" data-plan="menu" title="${_L('Exporter les éléments des diagrammes (CSV ou Excel, colonnes au choix)')}"${nReps ? '' : ' disabled'}>⬇ ▾</button>` +
    `<div class="sy-menu" id="cdg-plan-menu" hidden>` +
    `<button data-plan-exp="ici"${tous.length ? '' : ' disabled'}>${_L(`Ce diagramme (${tous.length} élément(s))`)}</button>` +
    (l.length < tous.length ? `<button data-plan-exp="filtre">${_L(`Ce diagramme, liste filtrée (${l.length})`)}</button>` : '') +
    (nSel ? `<button data-plan-exp="sel">${_L(`Diagrammes sélectionnés (${nSel})`)}</button>` : '') +
    `<button data-plan-exp="tous">${_L(`Tous les diagrammes (${nReps})`)}</button></div></span>` +
    (pop ? `<button class="cap-lf-btn" data-plan="back" title="${_L('Ramener le plan dans la page')}">⧈</button>`
      : `<button class="cap-lf-btn" data-plan="pop" title="${_L('Détacher le plan dans une fenêtre séparée (par exemple sur un autre écran)')}">⧉</button>`) + `</div>`;
  if (pop && rep) h += `<div class="cdg-plan-diag" title="${esc(rep.type)}"><span class="cdg-sigle">${esc(rep.sigle)}</span> ${esc(rep.nom)}</div>`;
  h += `<div class="cdg-plan-corps"${P.reduit && !pop ? ' hidden' : ''}>`;
  if (!uid || !rep) return h + `<div class="cdg-aide">${_L('Ouvrez un diagramme : les éléments qu\'il montre sont listés ici.')}</div></div>`;
  const grp = [['compo', _L('🧩 Composition')], ['type', _L('Par type')], ...(sy ? [] : [['couche', _L('Par couche')]]), ['nom', _L('Nom (A → Z)')], ['arbo', _L('🌳 Arborescence')]];
  const g = grp.some(x => x[0] === P.groupe) ? P.groupe : 'compo';
  const aideGrp = _L('Regroupement — Composition : chaque élément sous celui qui le contient dans le dessin (ports sous leur fonction ou leur composant) ; Arborescence : sous ses propriétaires dans le modèle');
  h += `<div class="cdg-outils"><input id="cdg-plan-q" type="search" placeholder="${_L('Filtrer (nom, type)…')}" value="${esc(P.q)}" autocomplete="off">` +
    `<div class="cdg-ligne"><select id="cdg-plan-groupe" title="${aideGrp}">${grp.map(([v, t]) => `<option value="${v}"${g === v ? ' selected' : ''}>${t}</option>`).join('')}</select>` +
    (g === 'nom' ? '' : `<button class="cap-lf-btn" data-plan="deplier" title="${_L('Tout déplier')}">⊞</button><button class="cap-lf-btn" data-plan="replier" title="${_L('Tout replier')}">⊟</button>`) + `</div></div>`;
  /** Ligne d'un élément (retrait selon le niveau ; type rappelé hors regroupement par type). */
  const ligne = (x, niv, avecType) => `<div class="cdg-pl-it${x.id === P.sel ? ' actif' : ''}" data-plan-id="${esc(x.id)}" data-plan-sem="${esc(x.sem)}" style="padding-left:${niv * 12 + 8}px" title="${esc(x.type)}${x.couche ? ' · ' + esc(x.couche) : ''} — ${_L('clic : centrer dans le diagramme et ouvrir le détail')}">` +
    `<span class="cdg-ico">${capIco(x.id, 13)}</span><span class="cdg-pl-nom">${esc(x.nom)}</span>${avecType ? `<span class="cdg-at">${esc(x.type)}</span>` : ''}</div>`;
  /** En-tête repliable d'un groupe. */
  const tete = (cle, titre, n, niv, ico) => `<div class="cdg-pl-gh" data-plan-g="${esc(cle)}" style="padding-left:${niv * 12 + 4}px"><span class="cdg-tog">${P.plies.has(g + '|' + cle) ? '▸' : '▾'}</span>${ico || ''}<span class="cdg-pl-nom">${titre}</span><span class="cdg-cnt">${n}</span></div>`;
  /** Nœud d'un arbre : feuille = ligne d'élément ; sinon en-tête repliable, lui-même cliquable s'il est dans le diagramme (grisé sinon ; groupe : simple titre). */
  const compte = n => n.enfants.reduce((s, c) => s + (c.present ? 1 : 0) + compte(c), 0);
  const bloc = (n, niv) => {
    if (!n.enfants.length) return n.present ? ligne(n, niv + 1, true) : '';
    const plie = P.plies.has(g + '|' + n.cle);
    return `<div class="cdg-pl-gh${n.present ? ' cdg-pl-it' + (n.id === P.sel ? ' actif' : '') : n.groupe ? '' : ' hors'}" data-plan-g="${esc(n.cle)}"${n.present ? ` data-plan-id="${esc(n.id)}" data-plan-sem="${esc(n.sem)}"` : ''} style="padding-left:${niv * 12 + 4}px" title="${esc(n.type)}${n.present || n.groupe ? '' : ' — ' + _L('absent du diagramme')}">` +
      `<span class="cdg-tog">${plie ? '▸' : '▾'}</span>${n.groupe ? '' : `<span class="cdg-ico">${capIco(n.id, 13)}</span>`}<span class="cdg-pl-nom">${esc(n.nom)}</span>${n.groupe ? '' : `<span class="cdg-at">${esc(n.type)}</span>`}<span class="cdg-cnt">${compte(n)}</span></div>` +
      (plie ? '' : n.enfants.map(c => bloc(c, niv + 1)).join(''));
  };
  let corps = '';
  if (!l.length) corps = `<div class="cdg-aide">${tous.length ? _L('Aucun élément ne correspond.') : _L('Aucun élément du modèle dans ce diagramme.')}</div>`;
  else if (g === 'nom') corps = l.map(x => ligne(x, 1, true)).join('');
  else if (g === 'compo') corps = capPlanCompo(P.vues, P.parent, l.length < tous.length ? new Set(l.map(x => x.id)) : null).map(n => bloc(n, 0)).join('');
  else if (g === 'arbo') corps = capPlanArbre(l).map(n => bloc(n, 0)).join('');
  else {
    const groupes = new Map();
    l.forEach(x => { const k = g === 'couche' ? x.couche || '' : x.typeName; if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(x); });
    const ordre = [...groupes.entries()].sort((a, b) => g === 'couche' ? capDiagRang(a[0]) - capDiagRang(b[0]) : a[1][0].type.localeCompare(b[1][0].type));
    corps = ordre.map(([k, els]) => {
      const lv = g === 'couche' ? capDiagCouche(k) : null;
      const titre = lv ? `<span class="cdg-badge" style="background:${lv.color};color:${capInk(lv.color)}">${esc(k || '—')}</span> ${esc(lv.label)}` : esc(els[0].type);
      return tete(k, titre, els.length, 0, lv ? '' : `<span class="cdg-ico">${capIcoType(k, 13)}</span>`) + (P.plies.has(g + '|' + k) ? '' : els.map(x => ligne(x, 1, g === 'couche')).join(''));
    }).join('');
  }
  h += `<div class="cdg-plan-liste">${corps}` +
    (P.horsListe ? `<div class="cdg-aide cdg-plan-note" title="${_L('Liens d\'implication, extrémités, formes sans élément nommé…')}">${_L(`+ ${P.horsListe} élément(s) technique(s) sans nom, non listé(s)`)}</div>` : '') + `</div></div>`;
  return h;
}

/**
 * Met le plan à jour pour le diagramme ouvert. Sans effet si rien n'a changé (même diagramme, mêmes formes dessinées),
 * pour garder le défilement et la saisie en cours ; `force` redessine (filtre, regroupement, repli).
 * @param {boolean} [force] - Redessiner même sans changement
 */
function capPlanMaj(force) {
  const z = capPlanZone(); if (!z) return;
  const uid = capPlanUid(), V = capPlanVues(uid);
  const sig = uid + '|' + (capDiagCharge() ? capDiagReps().length : 0) + '|' + _capDiag.sel.size + '|' + V.vues.map(x => x.v + ':' + x.sem).join(' ');
  if (!force && sig === _capPlan.sig) return;
  if (sig !== _capPlan.sig) {
    const r = capPlanLignesDe(V.vues.map(x => x.sem));
    if (uid !== _capPlan.uid) { _capPlan.q = ''; _capPlan.sel = ''; }   // autre diagramme : filtre et repère de l'ancien oubliés
    Object.assign(_capPlan, { uid, sig, lignes: r.lignes, vues: V.vues, parent: V.parent, parSem: r.parSem, horsListe: r.hors });
  }
  const D = z.ownerDocument, liste = z.querySelector('.cdg-plan-liste'), defil = liste ? liste.scrollTop : 0;
  const q = D.activeElement && D.activeElement.id === 'cdg-plan-q' ? D.activeElement.selectionStart : -1;
  z.innerHTML = capPlanHtml();
  const l2 = z.querySelector('.cdg-plan-liste'); if (l2 && defil) l2.scrollTop = defil;
  if (q >= 0) { const f = z.querySelector('#cdg-plan-q'); if (f) { f.focus(); f.setSelectionRange(q, q); } }
  if (capPlanPop()) { const rep = capDiagReps().find(x => x.uid === uid); D.title = _L('☷ Plan du diagramme') + (rep ? ' — ' + rep.nom : ''); }
}

/**
 * Repère dans le plan l'élément choisi (ligne encadrée, amenée à l'écran).
 * @param {string} id - Élément listé, ou identifiant dessiné
 */
function capPlanMarquer(id) {
  const z = capPlanZone(); if (!z) return;
  _capPlan.sel = _capPlan.parSem.get(id) || id;
  let vu = null;
  z.querySelectorAll('[data-plan-id]').forEach(e => { const on = e.dataset.planId === _capPlan.sel; e.classList.toggle('actif', on); if (on && !vu) vu = e; });
  if (vu && (!_capPlan.reduit || capPlanPop())) vu.scrollIntoView({ block: 'nearest' });
}

/**
 * Clic sur un élément du plan : il est centré et mis en évidence dans le diagramme, et ouvert dans le panneau de détail.
 * @param {string} id - Élément listé
 * @param {string} sem - Identifiant dessiné correspondant
 */
function capPlanAller(id, sem) {
  const uid = capPlanUid();
  capPlanMarquer(id);
  if (String(uid).startsWith('sy:')) capSyVueOuvrir(uid.slice(3), sem || id);
  else if (_capDiag.vis && uid) { try { _capDiag.vis.ouvrir(uid, sem || id); } catch (e) { console.warn(e); } capDiagCarte(); }
  if (typeof capOpenDetailById === 'function') capOpenDetailById(id); else capOpenDetail(id);
}

/**
 * Lignes d'export : une ligne par diagramme et par élément (diagramme, type de diagramme, couche ou famille, élément, type, couche,
 * conteneur graphique de l'élément dans ce diagramme).
 * @param {'ici'|'filtre'|'sel'|'tous'} portee - Diagramme ouvert (toute la liste ou la liste filtrée), diagrammes sélectionnés, tous
 * @returns {{nom:string, entetes:string[], lignes:Array[]}} nom du fichier, colonnes, lignes (cellules « élément » : capCx)
 */
function capPlanExportLignes(portee) {
  const sy = capDiagSy(), reps = capDiagReps(), lignes = [], ici = capPlanUid();
  const entetes = [_L('Diagramme'), _L('Type de diagramme'), sy ? _L('Famille') : _L('Couche du diagramme'), _L('Élément'), 'Type', ...(sy ? [] : [_L('Couche')]), _L('Contenu dans')];
  const ajouter = (r, els, V) => { const C = capPlanConteneurs(capPlanCompo(V.vues, V.parent, null));
    els.forEach(x => { const c = C.get(x.id); lignes.push([r.nom, r.type, r.couche || '', capCx(x.nom, x.id), x.type, ...(sy ? [] : [x.couche]), c ? capCx(c.nom, c.id) : '']); }); };
  if (portee === 'ici' || portee === 'filtre') {
    const r = reps.find(x => x.uid === ici);
    if (r) ajouter(r, portee === 'filtre' ? capPlanFiltrees() : _capPlan.lignes, _capPlan);
    return { nom: _L('diagramme-elements.csv'), entetes, lignes };
  }
  (portee === 'sel' ? reps.filter(r => _capDiag.sel.has(r.uid)) : reps).forEach(r => {
    if (r.genre === 'tableau') return;
    // Diagramme ouvert : ce qui est dessiné ; les autres : .aird et index des présences (102), ou formes du lecteur, sans les ouvrir un à un
    if (r.uid === ici) { ajouter(r, _capPlan.lignes, _capPlan); return; }
    const V = capPlanVues(r.uid);
    ajouter(r, capPlanLignesDe(V.vues.map(x => x.sem)).lignes, V);
  });
  return { nom: _L('diagrammes-elements.csv'), entetes, lignes };
}

/**
 * Exporte les éléments des diagrammes par la fenêtre « Colonnes de l'export » (53) : colonnes au choix, informations
 * ajoutées sur les éléments (ID, owner, chemin, description, attributs…), CSV ou Excel selon ⚙ Préférences.
 * La fenêtre s'ouvre dans la page : elle est ramenée au premier plan quand le plan est détaché.
 * @param {'ici'|'filtre'|'sel'|'tous'} portee - Voir capPlanExportLignes
 */
function capPlanExporter(portee) {
  const x = capPlanExportLignes(portee);
  if (!x.lignes.length) { capToast(_L('Aucun élément à exporter.')); return; }
  if (capPlanPop()) window.focus();
  capCsvExport(x.nom, x.entetes, x.lignes);
}

/** 📋 Copie la liste affichée (élément, type, couche, conteneur dans le diagramme, identifiant) : texte tabulé et tableau, pour Excel ou Word. */
function capPlanCopier() {
  const l = capPlanFiltrees(), sy = capDiagSy(), z = capPlanZone(); if (!l.length || !z) return;
  const C = capPlanConteneurs(capPlanCompo(_capPlan.vues, _capPlan.parent, null));
  const grille = [[_L('Élément'), 'Type', ...(sy ? [] : [_L('Couche')]), _L('Contenu dans'), 'ID'], ...l.map(x => [x.nom, x.type, ...(sy ? [] : [x.couche]), (C.get(x.id) || { nom: '' }).nom, x.id])];
  const fait = () => { const b = z.querySelector('[data-plan="copier"]'); if (b) { b.textContent = '✔'; setTimeout(() => { b.textContent = '📋'; }, 1200); } capToast(_L(`✔ ${l.length} élément(s) copié(s)`)); };
  const D = z.ownerDocument;
  if (D === document) { capClipCopy(grille, fait); return; }
  // Fenêtre séparée : la copie se fait dans son document (celui qui a la main)
  const tsv = grille.map(r => r.map(v => String(v == null ? '' : v).replace(/\t/g, ' ')).join('\t')).join('\r\n');
  let ok = false; const h = e => { e.clipboardData.setData('text/plain', tsv); e.preventDefault(); ok = true; };
  D.addEventListener('copy', h); try { D.execCommand('copy'); } catch (e) { /* repli ci-dessous */ } D.removeEventListener('copy', h);
  if (ok) fait(); else { const nav = D.defaultView.navigator; if (nav.clipboard && nav.clipboard.writeText) nav.clipboard.writeText(tsv).then(fait, () => {}); }
}

/**
 * Séparateur entre la liste des diagrammes et le plan : glisser vers le haut agrandit le plan ; double-clic : hauteur par défaut.
 * @param {HTMLElement} sp - Séparateur
 */
function capPlanSplit(sp) {
  const g = () => document.getElementById('cdg-gauche');
  const poser = h => { _capPlan.h = h; g().style.setProperty('--cdg-plan-h', h + 'px'); };
  sp.addEventListener('pointerdown', e => {
    const corps = document.querySelector('#cdg-plan .cdg-plan-corps'); if (!corps) return;
    e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('on');
    const y0 = e.clientY, h0 = corps.offsetHeight || _capPlan.h, max = Math.max(120, g().clientHeight - 220);
    const bouge = ev => poser(Math.round(Math.min(max, Math.max(80, h0 - (ev.clientY - y0)))));
    const fin = () => { sp.classList.remove('on'); sp.removeEventListener('pointermove', bouge); sp.removeEventListener('pointerup', fin); capDiagCartePoignees(); };
    sp.addEventListener('pointermove', bouge); sp.addEventListener('pointerup', fin);
  });
  sp.addEventListener('dblclick', () => { poser(200); capDiagCartePoignees(); });
}

/** Rappel laissé dans la colonne de gauche pendant que le plan est dans sa fenêtre : titre et ⧈ pour le ramener. @returns {HTMLElement} */
function capPlanRappel() {
  const s = document.createElement('div'); s.id = 'cdg-plan-rappel'; s.className = 'cdg-plan';
  s.innerHTML = `<div class="cdg-carte-tete"><b>${_L('☷ Plan')}</b><span class="cdg-cnt">${_L('dans une fenêtre séparée')}</span><span style="flex:1"></span>` +
    `<button class="cap-lf-btn" data-plan-back="1" title="${_L('Ramener le plan dans la page')}">⧈</button></div>`;
  return s;
}

/**
 * ⧉ Détache le plan dans une fenêtre séparée (une seule, ramenée au premier plan si elle existe) : le volet y est déplacé tel quel
 * (ses écouteurs suivent) et continue de suivre le diagramme ouvert dans la page ; un rappel prend sa place dans la colonne de gauche.
 */
function capPlanDetacher() {
  if (capPlanPop()) { capPlanPop().focus(); return; }
  const z = capPlanZone(); if (!z) return;
  const w = window.open('', 'arcalyse-plan', 'width=420,height=780');
  if (!w) { capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
  const D = w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="cdg-plan-pop"></body></html>'); D.close();
  document.querySelectorAll('style').forEach(st => D.head.appendChild(D.importNode(st, true)));
  capRevPopTheme(w);
  z.replaceWith(capPlanRappel());
  document.getElementById('cdg-gauche').classList.add('plan-detache');
  D.body.appendChild(D.adoptNode(z));
  _capPlan.zone = z; _capPlan.win = w;
  D.addEventListener('click', e => { const m = z.querySelector('#cdg-plan-menu'); if (m && !m.hidden && !e.target.closest('.sy-menu-w')) m.hidden = true; });
  D.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.cdg-pl-it,.cdg-pl-gh')) { e.preventDefault(); e.target.click(); } });
  w.addEventListener('pagehide', capPlanRattacher);
  capPlanMaj(true);
  capDiagCartePoignees();
}

/** ⧈ Ramène le plan dans la page (bouton du plan ou du rappel, fenêtre fermée) : le volet reprend sa place dans la colonne de gauche. */
function capPlanRattacher() {
  const z = _capPlan.zone, w = _capPlan.win, rappel = document.getElementById('cdg-plan-rappel');
  _capPlan.win = null;
  if (z && z.ownerDocument !== document) {
    document.adoptNode(z);
    const sp = document.getElementById('cdg-split-p');
    if (rappel) rappel.replaceWith(z); else if (sp) sp.after(z);
  } else if (rappel) rappel.remove();
  const g = document.getElementById('cdg-gauche'); if (g) g.classList.remove('plan-detache');
  if (w && !w.closed) w.close();
  capPlanMaj(true);
  if (typeof capDiagCartePoignees === 'function') capDiagCartePoignees();
}

/** Branche le volet (une fois, à la création de la vue 🔲 : capDiagEnsure, 54) : clics, filtre, regroupement, séparateur, repère de l'élément cliqué dans le dessin, thème de la fenêtre séparée. */
function capPlanInit() {
  const z = document.getElementById('cdg-plan'), box = document.getElementById('cap-view-diag'); if (!z || z._plan) return;
  z._plan = true;
  if (capPlanPop()) { z.replaceWith(capPlanRappel()); document.getElementById('cdg-gauche').classList.add('plan-detache'); }   // vue recréée pendant que le plan est détaché
  else _capPlan.zone = z;
  document.getElementById('cdg-gauche').style.setProperty('--cdg-plan-h', _capPlan.h + 'px');
  const sp = document.getElementById('cdg-split-p'); if (sp) capPlanSplit(sp);
  const menu = () => { const p = capPlanZone(); return p ? p.querySelector('#cdg-plan-menu') : null; };
  z.addEventListener('click', e => {
    const t = e.target;   // attributs data-plan… : aucun n'est lu par capDiagClic (explorateur)
    const exp = t.closest('[data-plan-exp]');
    if (exp) { menu().hidden = true; capPlanExporter(exp.dataset.planExp); return; }
    const a = t.closest('[data-plan]');
    if (a) switch (a.dataset.plan) {
      case 'tog': _capPlan.reduit = !_capPlan.reduit; capPlanMaj(true); capDiagCartePoignees(); return;
      case 'menu': menu().hidden = !menu().hidden; return;
      case 'copier': capPlanCopier(); return;
      case 'pop': capPlanDetacher(); return;
      case 'back': capPlanRattacher(); return;
      case 'deplier': [..._capPlan.plies].filter(k => k.startsWith(_capPlan.groupe + '|')).forEach(k => _capPlan.plies.delete(k)); capPlanMaj(true); return;
      case 'replier': z.querySelectorAll('[data-plan-g]').forEach(g => _capPlan.plies.add(_capPlan.groupe + '|' + g.dataset.planG)); capPlanMaj(true); return;
    }
    if (menu() && !menu().hidden) menu().hidden = true;
    const gh = t.closest('[data-plan-g]');
    if (gh && (!gh.dataset.planId || t.closest('.cdg-tog'))) { const k = _capPlan.groupe + '|' + gh.dataset.planG; if (_capPlan.plies.has(k)) _capPlan.plies.delete(k); else _capPlan.plies.add(k); capPlanMaj(true); return; }
    const it = t.closest('[data-plan-id]');
    if (it) capPlanAller(it.dataset.planId, it.dataset.planSem);
  });
  z.addEventListener('input', e => { if (e.target.id === 'cdg-plan-q') { _capPlan.q = e.target.value; capPlanMaj(true); } });
  z.addEventListener('change', e => { if (e.target.id === 'cdg-plan-groupe') { _capPlan.groupe = e.target.value; capPlanMaj(true); } });
  if (box._plan) return;   // écouteurs de la page : une seule fois, même si la vue est recréée
  box._plan = true;
  document.addEventListener('click', e => { const m = menu(); if (m && m.ownerDocument === document && !m.hidden && !e.target.closest('#cdg-plan .sy-menu-w')) m.hidden = true; });
  box.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-plan-back]')) { capPlanRattacher(); return; }
    // Élément cliqué dans le dessin (visionneuse ou vue d'un lecteur) : repéré dans le plan
    const s = e.target.closest && e.target.closest('#vd-svg [data-sem], svg.sy-vue-svg [data-sem]'); if (s) capPlanMarquer(s.getAttribute('data-sem'));
  });
  new MutationObserver(() => { const w = capPlanPop(); if (w) capRevPopTheme(w); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tone', 'style'] });
  window.addEventListener('pagehide', () => { const w = capPlanPop(); if (w) w.close(); });
}
