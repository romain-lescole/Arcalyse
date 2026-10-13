/* ═══════════════════════════════════════════════════════════════════════
   🔲 DIAGRAMMES CAPELLA — diagrammes du projet (.aird), dessinés par la visionneuse d'Arcature
   ───────────────────────────────────────────────────────────────────────
   La visionneuse (src/vendor/arcature-visionneuse*.js, produite par Arcature : node build.js --visionneuse)
   n'expose que window.ArcatureVisionneuse ; elle lit le modèle (texte du .capella) et le .aird, en lecture seule.
   Ici : chargement du .aird (sélecteur ouvert dans le dossier du .capella ; 📁 dossier du projet depuis l'écran d'accueil),
   liste classée (couche › type de diagramme, repliable, cases à cocher) à la place de celle de la visionneuse,
   export groupé en planches (en-tête, cartouche) : PDF, ZIP PNG / SVG, rapport HTML ;
   section « Diagrammes » du panneau de détail. Clic sur un élément d'un diagramme → panneau de détail de l'élément.
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la vue : visionneuse, .aird en attente ou chargé, modèle transmis, liste classée, sélection, largeur, carte, options d'export. */
const _capDiag = { vis: null, texteAird: '', nomAird: '', airdCharge: false, modele: null, nbReps: 0,
  classement: 'couche', bascule: new Set(), sel: new Set(), choix: false, filtre: '', actif: '', icones: null, meta: null,
  largeur: 330, carte: 'panneau', carteReduite: false,
  exportOpts: { portee: 'sel', cadre: true, cartouche: true, desc: true, annexe: true, sommaire: true, scale: 2 } };
/** Ordre des couches ARCADIA dans la liste et les exports. */
const CAP_DIAG_COUCHES = ['OA', 'SA', 'LA', 'PA', 'EPBS'];

/** @returns {boolean} vrai si la visionneuse d'Arcature est embarquée dans la page */
function capDiagDispo() { return typeof window.ArcatureVisionneuse === 'object'; }

/**
 * Charge un fichier .aird (diagrammes du projet). Sans modèle chargé, il est gardé en attente du .capella.
 * @param {File} f - fichier .aird
 */
function capDiagLoadAird(f) {
  const r = new FileReader();
  r.onerror = () => capWelcomeStatus(_L(`Impossible de lire « ${f.name} ».`), 'err');
  r.onload = ev => {
    _capDiag.texteAird = ev.target.result; _capDiag.nomAird = f.name; _capDiag.airdCharge = false;
    if (!capLoaded) {
      capWelcomeStatus(_L(`Diagrammes « ${f.name} » gardés : déposez maintenant le fichier .capella du projet.`), '');
      capShowWelcome(true);
      return;
    }
    capWelcomeStatus('', ''); capShowWelcome(false);
    capNavOpen('diag');
  };
  r.readAsText(f, 'UTF-8');
}

/**
 * 📂 Ouvrir le .aird : sélecteur à accès direct ouvert dans le dossier du .capella (Edge/Chrome,
 * modèle ouvert par 📂 avec accès direct), sinon sélecteur classique.
 */
async function capDiagPickAird() {
  const inp = document.getElementById('cdg-fichier');
  if (!window.showOpenFilePicker || (typeof _capPickerKo !== 'undefined' && _capPickerKo)) { inp.click(); return; }
  const o = { id: 'arcalyse-aird', types: [{ description: _L('Diagrammes Capella (.aird)'), accept: { 'application/xml': ['.aird'] } }] };
  if (typeof _capWatch !== 'undefined' && _capWatch.handle) o.startIn = _capWatch.handle;
  try {
    const [h] = await window.showOpenFilePicker(o);
    capDiagLoadAird(await h.getFile());
  } catch (e) {
    if (!e || e.name !== 'AbortError') inp.click();
  }
}

/**
 * 📁 Dossier du projet (écran d'accueil) : charge ensemble le modèle .capella et ses diagrammes .aird.
 * Le dossier est lu sur 2 niveaux ; s'il contient plusieurs modèles, le choix est proposé dans l'écran d'accueil.
 * Edge/Chrome : sélecteur de dossier (l'accès direct au .capella permet le 🔄 suivi) ; sinon sélecteur classique de dossier.
 */
async function capOpenProjectFolder() {
  if (!window.showDirectoryPicker || (typeof _capPickerKo !== 'undefined' && _capPickerKo)) { document.getElementById('cw-folder-input').click(); return; }
  let d;
  try { d = await window.showDirectoryPicker({ id: 'arcalyse-projet', mode: 'read' }); }
  catch (e) { if (!e || e.name !== 'AbortError') document.getElementById('cw-folder-input').click(); return; }
  capProjectScanDir(d);
}

/**
 * Lit un dossier du projet (sélecteur ou dossier déposé) sur 2 niveaux et charge le modèle et ses diagrammes.
 * @param {FileSystemDirectoryHandle} d - Dossier
 */
async function capProjectScanDir(d) {
  const fichiers = [];
  /** Parcourt un dossier jusqu'à la profondeur donnée. */
  const scan = async (dir, chemin, prof) => {
    for await (const [nom, h] of dir.entries()) {
      if (h.kind === 'file' && /\.(capella|melodymodeller|aird)$/i.test(nom)) fichiers.push({ nom, chemin: chemin + nom, h });
      else if (h.kind === 'directory' && prof > 0 && !nom.startsWith('.')) await scan(h, chemin + nom + '/', prof - 1);
    }
  };
  try { await scan(d, '', 1); } catch (e) { capWelcomeStatus(_L('Lecture du dossier impossible : ') + (e && e.message || e), 'err'); capShowWelcome(true); return; }
  capProjectFromFiles(fichiers.map(f => ({ nom: f.nom, chemin: f.chemin, lire: () => f.h.getFile(), h: f.h })));
}

/**
 * Charge un projet à partir des fichiers d'un dossier : le .capella (choisi dans l'écran d'accueil s'il y en a plusieurs)
 * puis le .aird du même nom (ou du même dossier, ou le seul présent).
 * @param {{nom:string, chemin:string, lire:function():Promise<File>, h:?FileSystemFileHandle}[]} fichiers - Fichiers trouvés
 */
function capProjectFromFiles(fichiers) {
  const mods = fichiers.filter(f => /\.(capella|melodymodeller)$/i.test(f.nom)).sort((a, b) => a.chemin.split('/').length - b.chemin.split('/').length || a.chemin.localeCompare(b.chemin));
  const airds = fichiers.filter(f => /\.aird$/i.test(f.nom));
  capShowWelcome(true);
  if (!mods.length) { capWelcomeStatus(_L('Aucun fichier .capella dans ce dossier (ni dans ses sous-dossiers).'), 'err'); return; }
  /** Charge un modèle et son .aird. */
  const charger = async m => {
    const base = m.nom.replace(/\.[^.]+$/, '').toLowerCase(), dossier = m.chemin.slice(0, m.chemin.length - m.nom.length);
    const a = airds.find(x => x.nom.toLowerCase() === base + '.aird') || airds.find(x => x.chemin.startsWith(dossier) && !x.chemin.slice(dossier.length).includes('/')) || (airds.length === 1 ? airds[0] : null);
    try {
      const f = await m.lire(), fa = a ? await a.lire() : null;
      _capDiag.texteAird = fa ? await fa.text() : ''; _capDiag.nomAird = fa ? fa.name : ''; _capDiag.airdCharge = false;
      capLoadFile(f, m.h || null);
    } catch (e) { capWelcomeStatus(_L('Lecture impossible : ') + (e && e.message || e), 'err'); }
  };
  if (mods.length === 1) { charger(mods[0]); return; }
  const st = document.getElementById('cw-status');
  capWelcomeStatus(_L(`${mods.length} modèles dans ce dossier : choisissez celui à ouvrir.`), '');
  st.insertAdjacentHTML('beforeend', `<div class="cw-choix">${mods.map((m, i) => `<button type="button" class="cw-choix-b" data-mod="${i}">🔷 ${capEsc(m.chemin)}</button>`).join('')}</div>`);
  st.querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); charger(mods[+b.dataset.mod]); }));
}

/** Affiche un message bref dans la barre de la vue. @param {string} t - Texte */
function capDiagMsg(t) { const s = document.getElementById('cdg-statut'); if (s) s.textContent = t; }

/** Crée la vue (une fois) : barre (ouvrir, export, sélection), liste classée à gauche, hôte de la visionneuse. */
function capDiagEnsure() {
  const box = document.getElementById('cap-view-diag');
  if (_capDiag.vis || !box || !capDiagDispo()) return;
  box.innerHTML = `<div class="cdg-barre" id="cdg-barre"></div>` +
    `<div class="cdg-corps"><aside class="cdg-gauche" id="cdg-gauche" style="width:${_capDiag.largeur}px"><div id="cdg-liste" class="cdg-liste"></div>` +
    `<div id="cdg-carte-zone" class="cdg-carte-zone"></div></aside>` +
    `<div class="cdg-split" id="cdg-split" title="${_L('Glisser pour régler la largeur de l\'explorateur')}"></div><div id="cdg-hote" class="cdg-hote"></div></div>` +
    `<input type="file" id="cdg-fichier" accept=".aird" style="display:none">`;
  document.getElementById('cdg-fichier').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) capDiagLoadAird(f); };
  box.addEventListener('click', capDiagClic);
  box.addEventListener('change', capDiagChange);
  box.addEventListener('input', e => { if (e.target.id === 'cdg-filtre') { _capDiag.filtre = e.target.value; capDiagListe(); } });
  _capDiag.vis = window.ArcatureVisionneuse.creer(document.getElementById('cdg-hote'), {
    choix: id => { if (typeof capOpenDetailById === 'function') capOpenDetailById(id); else capOpenDetail(id); }
  });
  // Diagramme ouvert depuis la visionneuse elle-même (onglets, retour, liens) : suivi de l'élément actif
  const liste = document.getElementById('diag-liste');
  if (liste) new MutationObserver(() => {
    const li = liste.querySelector('li.actif[data-diag]'), uid = li ? li.dataset.diag : '';
    if (uid !== _capDiag.actif) { _capDiag.actif = uid; capDiagMarquerActif(); }
    if (uid && !_capDiag.export) capDiagCarte();
  }).observe(liste, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  window.addEventListener('resize', () => { if (capCurrentView === 'diag') capDiagFit(); });
  capDiagSplit(document.getElementById('cdg-split'));
  if (window.ResizeObserver) new ResizeObserver(() => { if (capCurrentView === 'diag') capDiagFit(); }).observe(document.getElementById('cdg-barre'));
}

/**
 * Séparateur entre l'explorateur et le diagramme : glisser pour régler la largeur de l'explorateur.
 * @param {HTMLElement} sp - Séparateur
 */
function capDiagSplit(sp) {
  sp.addEventListener('pointerdown', e => {
    e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('on');
    const g = document.getElementById('cdg-gauche'), x0 = e.clientX, w0 = g.offsetWidth;
    const max = Math.max(260, document.getElementById('cap-view-diag').clientWidth * 0.6);
    const bouge = ev => { _capDiag.largeur = Math.round(Math.min(max, Math.max(200, w0 + ev.clientX - x0))); g.style.width = _capDiag.largeur + 'px'; };
    const fin = () => { sp.classList.remove('on'); sp.removeEventListener('pointermove', bouge); sp.removeEventListener('pointerup', fin);
      window.dispatchEvent(new Event('resize')); };   // la visionneuse se réajuste
    sp.addEventListener('pointermove', bouge); sp.addEventListener('pointerup', fin);
  });
  sp.addEventListener('dblclick', () => { _capDiag.largeur = 330; document.getElementById('cdg-gauche').style.width = '330px'; window.dispatchEvent(new Event('resize')); });
}

/**
 * ▣ Carte (mini-carte de la visionneuse) : sous l'explorateur (repliable) ou dans le diagramme, comme dans la visionneuse.
 * La carte de la visionneuse est déplacée telle quelle (ses écouteurs suivent) ; son bouton ▣ Carte est masqué sous l'explorateur.
 */
function capDiagCarte() {
  const zone = document.getElementById('cdg-carte-zone'), c = document.getElementById('vd-carte');
  if (!zone || !c) return;
  const bt = document.getElementById('vd-carte-bt'), vz = document.getElementById('vd-zone'), pan = _capDiag.carte === 'panneau';
  if (!zone.firstChild) zone.innerHTML = `<div class="cdg-carte-tete"></div><div id="cdg-carte-corps" class="cdg-carte-corps"></div>`;
  const tete = zone.firstChild, corps = document.getElementById('cdg-carte-corps');
  tete.innerHTML = pan
    ? `<span class="cdg-carte-tog" data-carte-tog="1"><span class="cdg-tog">${_capDiag.carteReduite ? '▸' : '▾'}</span><b>${_L('▣ Carte')}</b></span><span style="flex:1"></span>` +
      `<button class="cap-lf-btn" data-carte="diagramme" title="${_L('Afficher la carte dans le diagramme')}">⇲</button>`
    : `<b>${_L('▣ Carte')}</b><span class="cdg-cnt">${_L('dans le diagramme')}</span><span style="flex:1"></span>` +
      `<button class="cap-lf-btn" data-carte="panneau" title="${_L('Afficher la carte sous l\'explorateur')}">⇱</button>`;
  if (pan) {
    if (c.parentElement !== corps) corps.appendChild(c);
    if (c.hasAttribute('hidden') && bt) bt.click();   // la visionneuse ne dessine la carte qu'affichée
    if (bt) bt.style.display = 'none';
    corps.hidden = _capDiag.carteReduite;
  } else {
    if (vz && c.parentElement !== vz) vz.appendChild(c);
    if (bt) bt.style.display = '';
    corps.hidden = true;
  }
}

/** Barre du haut : 📂 Ouvrir le .aird…, ⬇ Exporter…, ☐ Sélectionner…, fichier chargé. */
function capDiagBarre() {
  const b = document.getElementById('cdg-barre'); if (!b) return;
  const n = _capDiag.sel.size;
  const exp = _capDiag.airdCharge ? `<span class="tb-grp"><button class="tbtn" id="cdg-export" title="${_L('Exporter plusieurs diagrammes en planches (en-tête, description, cartouche, annexe) : PDF, ZIP PNG / SVG, rapport HTML')}">${_L('⬇ Exporter…')}${n ? ` <span class="cdg-nb">${n}</span>` : ''}</button>` +
    `<button class="tbtn${_capDiag.choix ? ' active' : ''}" id="cdg-choix" title="${_L('Choisir les diagrammes à exporter : cases à cocher dans l\'explorateur')}">${_capDiag.choix ? _L('☑ Terminer la sélection') : _L('☐ Sélectionner…')}</button></span>` : '';
  b.innerHTML = `<span class="tb-grp"><button class="tbtn" id="cdg-ouvrir" title="${_L('Choisir le fichier .aird (le sélecteur s\'ouvre dans le dossier du .capella quand le navigateur le permet)')}">${_L('📂 Ouvrir le .aird…')}</button>` +
    `</span>` + exp +
    `<span id="cdg-info" class="cdg-info">${_capDiag.airdCharge ? capEsc(_capDiag.nomAird) + ' — ' + _L(`${_capDiag.nbReps} diagramme(s)`) :
      _L('Ouvrez le fichier .aird du projet (à côté du .capella), ou déposez-le sur la fenêtre.')}</span>` +
    `<span id="cdg-statut" class="cdg-info"></span>`;
}

/** Ajuste la hauteur de la vue à la fenêtre. */
function capDiagFit() {
  const c = document.querySelector('#cap-view-diag .cdg-corps');
  if (!c) return;
  const bas = Math.min(window.innerHeight, document.getElementById('cap-view-diag').getBoundingClientRect().bottom);   // barre d'état en dessous
  c.style.height = Math.max(320, bas - c.getBoundingClientRect().top) + 'px';
}

/** Transmet à la visionneuse le modèle courant (texte XML) et le .aird en attente, si besoin. */
function capDiagSync() {
  const v = _capDiag.vis;
  if (!v) return;
  if (_capDiag.modele !== cap_xmlDoc && cap_xmlDoc) {
    v.chargerModele(new XMLSerializer().serializeToString(cap_xmlDoc), capCurrentFileName);
    _capDiag.modele = cap_xmlDoc;
    if (_capDiag.texteAird) _capDiag.airdCharge = false;   // diagrammes relus avec le nouveau modèle
    else if (_capDiag.airdCharge) { _capDiag.airdCharge = false; try { v.fermer(); } catch (e) {} }   // nouveau modèle sans .aird
  }
  if (_capDiag.texteAird && !_capDiag.airdCharge) {
    _capDiag.nbReps = v.chargerAird(_capDiag.texteAird, _capDiag.nomAird);
    _capDiag.airdCharge = true; _capDiag.icones = null; _capDiag.meta = null; _capDiag.sel.clear(); _capDiag.actif = '';
  }
  capDiagBarre();
  capDiagListe();
  capDiagCarte();
}

/** Rendu de la vue 🔲 Diagrammes Capella. */
function capRenderDiagrams() {
  const box = document.getElementById('cap-view-diag');
  if (!capDiagDispo()) {
    box.innerHTML = `<div class="cdg-vide">${_L('Visionneuse de diagrammes absente de cette page.')}</div>`;
    return;
  }
  capDiagEnsure();
  capDiagSync();
  capDiagFit();
}

/* ── Liste classée ─────────────────────────────────────────────────────── */

/** @returns {object[]} représentations du .aird chargé ({uid, nom, type, sigle, genre, couche}) */
function capDiagReps() { return _capDiag.vis && _capDiag.airdCharge ? _capDiag.vis.representations() : []; }

/** Libellé et couleur d'une couche ARCADIA. @param {string} c - OA, SA, LA, PA, EPBS… @returns {{label:string,color:string,bg:string}} */
function capDiagCouche(c) { return CAP_LAYERS[c] || { label: c || _L('Autres'), color: '#8b949e', bg: 'rgba(139,148,158,.15)' }; }

/** Rang d'une couche pour le tri. @param {string} c - Couche @returns {number} */
function capDiagRang(c) { const i = CAP_DIAG_COUCHES.indexOf(c); return i < 0 ? 99 : i; }

/** Icône de chaque diagramme, reprise de la liste (masquée) de la visionneuse. @returns {Map<string,string>} uid → SVG */
function capDiagIcones() {
  if (_capDiag.icones) return _capDiag.icones;
  const m = new Map();
  document.querySelectorAll('#diag-liste li[data-diag]').forEach(li => { const i = li.querySelector('.diag-ico'); if (i) m.set(li.dataset.diag, i.innerHTML); });
  if (m.size) _capDiag.icones = m;
  return m;
}

/** Représentations filtrées par la recherche (nom, type, sigle, couche). @returns {object[]} */
function capDiagFiltrees() {
  const q = _capDiag.filtre.trim().toLowerCase();
  const reps = capDiagReps();
  return q ? reps.filter(r => `${r.nom} ${r.type} ${r.sigle} ${r.couche}`.toLowerCase().includes(q)) : reps;
}

/**
 * Regroupe les représentations selon le classement choisi.
 * @param {object[]} reps - Représentations
 * @returns {object[]} groupes [{cle, titre, couche, sigle, reps, enfants}] (enfants : sous-groupes par type, ou null)
 */
function capDiagGroupes(reps) {
  const parNom = (a, b) => a.nom.localeCompare(b.nom);
  /** Groupe par type de diagramme (sigle + type). */
  const parType = (liste, prefixe) => {
    const m = new Map();
    liste.forEach(r => { const k = r.sigle + '|' + r.type; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
    return [...m.entries()].map(([k, l]) => ({ cle: prefixe + k, titre: l[0].type, sigle: l[0].sigle, couche: l[0].couche, reps: l.sort(parNom), enfants: null }))
      .sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.sigle.localeCompare(b.sigle));
  };
  /** Groupe par couche ARCADIA. */
  const parCouche = () => {
    const m = new Map();
    reps.forEach(r => { const c = r.couche || '?'; if (!m.has(c)) m.set(c, []); m.get(c).push(r); });
    return [...m.entries()].sort((a, b) => capDiagRang(a[0]) - capDiagRang(b[0]) || a[0].localeCompare(b[0]))
      .map(([c, l]) => ({ cle: 'c:' + c, titre: capDiagCouche(c).label, couche: c, reps: l.sort(parNom), enfants: null }));
  };
  switch (_capDiag.classement) {
    case 'couche': return parCouche();
    case 'type': {
      const m = new Map();
      reps.forEach(r => { if (!m.has(r.sigle)) m.set(r.sigle, []); m.get(r.sigle).push(r); });
      return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([s, l]) => ({ cle: 's:' + s, titre: [...new Set(l.map(r => r.type))].join(' / '), sigle: s,
        reps: l.sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || parNom(a, b)), enfants: null }));
    }
    case 'nom': return [{ cle: 'tout', titre: '', reps: reps.slice().sort(parNom), enfants: null, plat: true }];
    default: return parCouche().map(g => Object.assign(g, { enfants: parType(g.reps, g.cle + '/') }));
  }
}

/**
 * Un groupe est-il ouvert ? Couches ouvertes, types repliés par défaut ; tout est ouvert pendant une recherche.
 * @param {object} g - Groupe
 * @param {number} niveau - 1 (couche ou type seul) ou 2 (type dans une couche)
 * @returns {boolean} vrai si déplié
 */
function capDiagOuvert(g, niveau) {
  if (_capDiag.filtre.trim()) return true;
  const defaut = niveau === 1;
  return _capDiag.bascule.has(_capDiag.classement + '|' + g.cle) ? !defaut : defaut;
}

/** Rend la liste classée (panneau gauche). */
function capDiagListe() {
  const box = document.getElementById('cdg-liste'); if (!box) return;
  if (!_capDiag.airdCharge) {
    box.innerHTML = `<div class="cdg-aide">${_L('Aucun .aird chargé.')}<br><br>${_L('📂 Ouvrir le .aird… s\'ouvre dans le dossier du .capella (Edge / Chrome).')}<br>` +
      _L('Ou, depuis l\'écran d\'accueil, 📁 Dossier du projet… : le .capella et ses diagrammes sont chargés ensemble.') + `</div>`;
    return;
  }
  const reps = capDiagFiltrees(), ico = capDiagIcones(), S = _capDiag.sel;
  const groupes = capDiagGroupes(reps);
  const fo = document.activeElement && document.activeElement.id === 'cdg-filtre';
  /** Case d'un groupe (cochée, partielle ou vide). */
  const caseG = g => { if (!_capDiag.choix) return ''; const n = g.reps.filter(r => S.has(r.uid)).length;
    return `<input type="checkbox" class="cdg-gsel" data-g="${capEsc(g.cle)}"${n && n === g.reps.length ? ' checked' : ''}${n && n < g.reps.length ? ' data-partiel="1"' : ''} title="${_L('Cocher / décocher le groupe')}">`; };
  /** Ligne d'un diagramme. */
  const ligne = r => { const lv = capDiagCouche(r.couche);
    const nom = _capDiag.classement === 'couche-type' || _capDiag.classement === 'type' ? r.nom.replace(/^\[[^\]]*\]\s*/, '') : r.nom;
    return `<div class="cdg-it${r.uid === _capDiag.actif ? ' actif' : ''}" data-uid="${capEsc(r.uid)}" title="${capEsc(r.type)} · ${capEsc(lv.label)}">` +
      (_capDiag.choix ? `<input type="checkbox" class="cdg-sel" data-uid="${capEsc(r.uid)}"${S.has(r.uid) ? ' checked' : ''}>` : '') +
      `<span class="cdg-ico">${ico.get(r.uid) || ''}</span><span class="cdg-sigle" style="color:${lv.color};background:${lv.bg}">${capEsc(_capDiag.classement === 'type' ? r.couche || '—' : r.sigle)}</span>` +
      `<span class="cdg-nom">${capEsc(nom)}</span></div>`; };
  /** Bloc d'un groupe (en-tête repliable + contenu). */
  const bloc = (g, niveau) => {
    if (g.plat) return g.reps.map(ligne).join('');
    const ouvert = capDiagOuvert(g, niveau), lv = capDiagCouche(g.couche);
    const tete = niveau === 1 && _capDiag.classement !== 'type'
      ? `<span class="cdg-badge" style="background:${lv.color};color:${capInk(lv.color)}">${capEsc(g.couche)}</span><span class="cdg-gt">${capEsc(g.titre)}</span>`
      : `<span class="cdg-sigle cdg-sigle-g">${capEsc(g.sigle)}</span><span class="cdg-gt">${capEsc(g.titre)}</span>`;
    return `<div class="cdg-g n${niveau}"><div class="cdg-gh" data-tog="${capEsc(g.cle)}" data-niv="${niveau}">` +
      `<span class="cdg-tog">${ouvert ? '▾' : '▸'}</span>${caseG(g)}${tete}<span class="cdg-cnt">${g.reps.length}</span></div>` +
      (ouvert ? `<div class="cdg-gc">${g.enfants ? g.enfants.map(e => bloc(e, 2)).join('') : g.reps.map(ligne).join('')}</div>` : '') + `</div>`;
  };
  const nSelVis = reps.filter(r => S.has(r.uid)).length;
  const opt = (v, l) => `<option value="${v}"${_capDiag.classement === v ? ' selected' : ''}>${l}</option>`;
  box.innerHTML = `<div class="cdg-outils">` +
    `<input id="cdg-filtre" type="search" placeholder="${_L('Filtrer (nom, type, sigle, couche)…')}" value="${capEsc(_capDiag.filtre)}" autocomplete="off">` +
    `<div class="cdg-ligne"><select id="cdg-classement" title="${_L('Classement de la liste')}">${opt('couche-type', _L('Couche › type'))}${opt('couche', _L('Couche'))}${opt('type', _L('Type de diagramme'))}${opt('nom', _L('Nom (A → Z)'))}</select>` +
    `<button class="cap-lf-btn" data-tout="1" title="${_L('Tout déplier')}">⊞</button><button class="cap-lf-btn" data-tout="0" title="${_L('Tout replier')}">⊟</button></div>` +
    (!_capDiag.choix ? `<div class="cdg-ligne cdg-tous">${S.size ? _L(`${S.size} sélectionné(s) pour l'export`) : _L(`${reps.length} diagramme(s)`)}</div>` :
    `<label class="cdg-ligne cdg-tous"><input type="checkbox" id="cdg-tous"${nSelVis && nSelVis === reps.length ? ' checked' : ''}${nSelVis && nSelVis < reps.length ? ' data-partiel="1"' : ''}> ` +
    `<span>${S.size ? _L(`${S.size} sélectionné(s) pour l'export`) : _L(`${reps.length} diagramme(s) — cochez pour exporter`)}</span></label>`) + `</div>` +
    `<div class="cdg-arbre">${reps.length ? groupes.map(g => bloc(g, 1)).join('') : `<div class="cdg-aide">${_L('Aucun diagramme ne correspond.')}</div>`}</div>`;
  box.querySelectorAll('input[data-partiel]').forEach(c => { c.indeterminate = true; });
  if (fo) { const f = document.getElementById('cdg-filtre'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
}

/** Met en évidence le diagramme ouvert dans la liste. */
function capDiagMarquerActif() {
  document.querySelectorAll('#cdg-gauche .cdg-it').forEach(e => e.classList.toggle('actif', e.dataset.uid === _capDiag.actif));
}

/**
 * Représentations d'un groupe de la liste (selon la clé).
 * @param {string} cle - Clé du groupe
 * @returns {object[]} représentations filtrées du groupe
 */
function capDiagRepsGroupe(cle) {
  const tous = []; const parcourir = gs => gs.forEach(g => { if (g.cle === cle) tous.push(...g.reps); if (g.enfants) parcourir(g.enfants); });
  parcourir(capDiagGroupes(capDiagFiltrees()));
  return tous;
}

/** Clics de la vue : barre (ouvrir, export, sélection), carte, groupes repliables, diagrammes. @param {MouseEvent} e */
function capDiagClic(e) {
  const t = e.target;
  if (t.closest('#cdg-ouvrir')) { capDiagPickAird(); return; }
  if (t.closest('#cdg-export')) { capDiagExportDialog(); return; }
  if (t.closest('#cdg-choix')) { _capDiag.choix = !_capDiag.choix; capDiagBarre(); capDiagListe(); return; }
  const ca = t.closest('[data-carte]');
  if (ca) { _capDiag.carte = ca.dataset.carte; capDiagCarte(); return; }
  if (t.closest('[data-carte-tog]')) { _capDiag.carteReduite = !_capDiag.carteReduite; capDiagCarte(); return; }
  if (t.matches('input[type=checkbox]')) return;   // traité par capDiagChange
  const tout = t.closest('[data-tout]');
  if (tout) {
    const ouvrir = tout.dataset.tout === '1'; const B = _capDiag.bascule;
    [...B].filter(k => k.startsWith(_capDiag.classement + '|')).forEach(k => B.delete(k));
    const parcourir = (gs, niv) => gs.forEach(g => { const defaut = niv === 1; if (ouvrir !== defaut) B.add(_capDiag.classement + '|' + g.cle); if (g.enfants) parcourir(g.enfants, 2); });
    parcourir(capDiagGroupes(capDiagReps()), 1);
    capDiagListe(); return;
  }
  const gh = t.closest('[data-tog]');
  if (gh) { const k = _capDiag.classement + '|' + gh.dataset.tog; if (_capDiag.bascule.has(k)) _capDiag.bascule.delete(k); else _capDiag.bascule.add(k); capDiagListe(); return; }
  const it = t.closest('.cdg-it');
  if (it) { _capDiag.actif = it.dataset.uid; capDiagMarquerActif(); _capDiag.vis.ouvrir(it.dataset.uid); capDiagCarte(); }
}

/** Cases à cocher (diagramme, groupe, tout) et choix du classement. @param {Event} e */
function capDiagChange(e) {
  const t = e.target, S = _capDiag.sel;
  if (t.id === 'cdg-classement') { _capDiag.classement = t.value; capDiagListe(); return; }
  if (t.classList.contains('cdg-sel')) { if (t.checked) S.add(t.dataset.uid); else S.delete(t.dataset.uid); }
  else if (t.classList.contains('cdg-gsel')) capDiagRepsGroupe(t.dataset.g).forEach(r => { if (t.checked) S.add(r.uid); else S.delete(r.uid); });
  else if (t.id === 'cdg-tous') capDiagFiltrees().forEach(r => { if (t.checked) S.add(r.uid); else S.delete(r.uid); });
  else return;
  capDiagListe(); capDiagBarre();
}

/**
 * Ouvre un diagramme dans la vue 🔲 Diagrammes Capella et y met un élément en évidence.
 * @param {string} uid - identifiant de la représentation (.aird)
 * @param {string} [id] - élément du modèle à centrer
 */
function capDiagOpen(uid, id) {
  capNavOpen('diag');
  if (_capDiag.vis) { _capDiag.actif = uid; _capDiag.vis.ouvrir(uid, id); capDiagMarquerActif(); }
}

/**
 * Section « Diagrammes » du panneau de détail : représentations de l'élément et diagrammes où il est dessiné.
 * @param {string} id - identifiant de l'élément
 * @param {function(string, string):string} secTitle - titre de section du panneau
 * @returns {string} HTML ('' sans .aird chargé ou sans diagramme)
 */
function capDiagDetail(id, secTitle) {
  if (!_capDiag.vis || !_capDiag.airdCharge) return '';
  const { cibles, presences } = _capDiag.vis.diagrammesDe(id);
  const vus = new Set(), liste = [...cibles, ...presences].filter(r => !vus.has(r.uid) && vus.add(r.uid));
  if (!liste.length) return '';
  const lien = r => `<div class="cap-det-link cdg-lien" onclick="capDiagOpen('${capEsc(r.uid)}','${capEsc(id)}')" title="${capEsc(r.type)}">` +
    `<span class="cdg-sigle">${capEsc(r.sigle)}</span>${capEsc(r.nom || r.type)}</div>`;
  return secTitle(_L(`Diagrammes (${liste.length})`), '#58a6ff') + liste.sort((a, b) => a.nom.localeCompare(b.nom)).slice(0, 60).map(lien).join('');
}

/* ── Export groupé en planches ─────────────────────────────────────────── */

/**
 * SVG autonome d'un diagramme, tel que l'exporte la visionneuse (menu ⬇ Exporter › SVG) :
 * le diagramme est ouvert puis son export est intercepté (aucun téléchargement).
 * @param {string} uid - Représentation
 * @returns {Promise<string>} code SVG
 */
async function capDiagSvg(uid) {
  _capDiag.export = true;
  _capDiag.vis.ouvrir(uid);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bt = document.getElementById('vd-export-bt'), menu = document.getElementById('vd-export');
  let blob = null;
  const oCreer = URL.createObjectURL, oClic = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = b => { blob = b; return 'about:blank'; };
  HTMLAnchorElement.prototype.click = function () {};
  try {
    if (bt && menu && menu.hidden) bt.click();
    const it = document.querySelector('#cdg-hote [data-export="svg"]');
    if (!it) throw new Error(_L('export SVG de la visionneuse introuvable'));
    it.click();
  } finally {
    URL.createObjectURL = oCreer; HTMLAnchorElement.prototype.click = oClic;
    setTimeout(() => { _capDiag.export = false; }, 0);
    if (menu && !menu.hidden && bt) bt.click();
  }
  if (!blob) throw new Error(_L('diagramme vide ou non exportable'));
  return (await blob.text()).replace(/^\s*<\?xml[^>]*>\s*/, '');
}

/**
 * Planche d'un diagramme : cadre, en-tête (couche, sigle, nom, type), diagramme centré, cartouche technique
 * en bas à droite (projet, diagramme, type, couche, contenu, sources, date, planche) et signature Arcalyse.
 * Les décors suivent la taille du diagramme pour rester lisibles une fois la planche réduite à la page.
 * @param {object} rep - Représentation {uid, nom, type, sigle, couche}
 * @param {string} svg - SVG du diagramme (capDiagSvg)
 * @param {object} [o] - {cadre, cartouche, planche:'n / N'}
 * @returns {{svg:string, w:number, h:number}} planche
 */
function capDiagPlanche(rep, svg, o) {
  o = Object.assign({}, _capDiag.exportOpts, o || {});
  const tag = (svg.match(/^<svg[^>]*>/) || [''])[0];
  const att = k => { const m = tag.match(new RegExp('\\s' + k + '="([\\d.]+)')); return m ? +m[1] : 0; };
  let iw = att('width'), ih = att('height');
  if (!iw || !ih) { const vb = tag.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/); iw = vb ? +vb[1] : 800; ih = vb ? +vb[2] : 600; }
  if (!o.cadre && !o.cartouche) return { svg, w: iw, h: ih };
  const u = Math.max(1, Math.max(iw, ih * 1.414) / 1400);   // échelle des décors
  const F = 'Segoe UI,Arial,sans-serif', lv = capDiagCouche(rep.couche), esc = capEsc;
  const projet = (cap_xmlDoc && cap_xmlDoc.documentElement && cap_xmlDoc.documentElement.getAttribute('name')) || _L('Projet Capella');
  const nbElem = new Set((svg.match(/data-sem="[^"]+"/g) || [])).size;
  const M = 14 * u, P = 16 * u;
  const nom = rep.nom.replace(/^\[[^\]]*\]\s*/, '');
  const hH = o.cadre ? 44 * u : 0;
  // Cartouche : 2 paires de colonnes (clé | valeur)
  const lignes = [
    [_L('Projet'), projet, _L('Couche'), `${rep.couche || '—'} — ${lv.label}`],
    [_L('Diagramme'), nom, _L('Contenu'), _L(`${nbElem} élément(s)`)],
    ['Type', `${rep.sigle} — ${rep.type}`, _L('Date'), new Date().toLocaleDateString('fr-FR')],
    [_L('Sources'), [capCurrentFileName, _capDiag.nomAird].filter(Boolean).join(' · '), _L('Planche'), o.planche || '—'],
  ];
  const kw = 62, vw1 = 250, vw2 = 200, rh = 17, th = 19;
  const cw = (kw * 2 + vw1 + vw2) * u, ch = o.cartouche ? (th + lignes.length * rh) * u : 0;
  const W = Math.max(iw + 2 * (M + P), o.cartouche ? cw + 280 * u : 0, o.cadre ? capTextW(rep.nom, 17) * u + 260 * u : 0);
  // Description Capella du diagramme et élément représenté, sous l'en-tête (6 lignes au plus)
  const meta = o.desc ? capDiagMeta(rep.uid) : null;
  const dl = meta && meta.desc ? capWrapLines(meta.desc, Math.max(60, Math.floor((W / u - 2 * (M + P) / u) / 6.1)), 6) : [];
  const ctx = meta && meta.cible ? meta.cible : null;
  const dH = dl.length || ctx ? ((dl.length + (ctx ? 1 : 0)) * 15 + 10) * u : 0;
  const H = M + hH + dH + P + ih + P + (ch ? ch + 8 * u : 22 * u) + M;
  let s = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  const x0 = M, y0 = M, fw = W - 2 * M, fh = H - 2 * M;
  const sw = capTextW(rep.sigle, 11) * 1.25 + 14;   // largeur de la pastille du sigle (gras)
  if (o.cadre) {
    s += `<rect x="${x0}" y="${y0}" width="${fw}" height="${fh}" fill="none" stroke="#2b2f36" stroke-width="${1.3 * u}"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${fw}" height="${hH}" fill="#f5f7fa"/>`;
    s += `<rect x="${x0}" y="${y0 + hH - 3 * u}" width="${fw}" height="${3 * u}" fill="${lv.color}"/>`;
    s += `<g transform="translate(${x0},${y0}) scale(${u})" font-family="${F}">` +
      `<rect x="10" y="10" width="44" height="22" rx="4" fill="${lv.color}"/><text x="32" y="25.5" font-size="12" font-weight="700" text-anchor="middle" fill="${capInk(lv.color)}">${esc(rep.couche || '—')}</text>` +
      `<rect x="60" y="10" width="${sw}" height="22" rx="4" fill="#fff" stroke="${lv.color}" stroke-width="1.4"/><text x="${60 + sw / 2}" y="25" font-size="11" font-weight="700" text-anchor="middle" fill="#24292f">${esc(rep.sigle)}</text>` +
      `<text x="${72 + sw}" y="27" font-size="17" font-weight="700" fill="#111">${esc(nom)}</text>` +
      `<text x="${fw / u - 12}" y="20" font-size="10.5" text-anchor="end" fill="#57606a">${esc(rep.type)}</text>` +
      `<text x="${fw / u - 12}" y="34" font-size="10.5" text-anchor="end" fill="#57606a">${esc(lv.label)}</text></g>`;
  }
  if (dH) {
    let t = '', y = 18;
    if (ctx) { t += `<text x="0" y="${y}" font-size="10.5" fill="#57606a">${esc(_L('Élément représenté'))} : <tspan font-weight="700" fill="#24292f">${esc(ctx.nom)}</tspan> (${esc(ctx.type)})</text>`; y += 15; }
    dl.forEach(l => { t += `<text x="0" y="${y}" font-size="11" font-style="italic" fill="#333">${esc(l)}</text>`; y += 15; });
    s += `<g transform="translate(${M + P},${M + hH}) scale(${u})" font-family="${F}">${t}</g>`;
  }
  s += svg.replace(/^<svg /, `<svg x="${(W - iw) / 2}" y="${M + hH + dH + P}" `);
  const yb = H - M - (ch ? ch : 22 * u);
  s += `<g transform="translate(${x0 + 10 * u},${H - M - 9 * u}) scale(${u})" font-family="${F}"><text font-size="9.5" fill="#8c959f">` +
    esc(_L(`Arcalyse · planche générée le ${new Date().toLocaleDateString('fr-FR')}`)) + `</text></g>`;
  if (o.cartouche) {
    const cx = W - M - cw, cy = yb;
    let c = `<rect width="${cw / u}" height="${ch / u}" fill="#fbfcfd" stroke="#2b2f36" stroke-width="1"/>` +
      `<rect width="${cw / u}" height="${th}" fill="${lv.color}"/><text x="8" y="13.5" font-size="10.5" font-weight="700" fill="${capInk(lv.color)}">${esc(_L('CARTOUCHE'))} · ${esc(projet)}</text>` +
      `<text x="${cw / u - 8}" y="13.5" font-size="10" text-anchor="end" fill="${capInk(lv.color)}">ARCALYSE</text>`;
    const cols = [0, kw, kw + vw1, kw * 2 + vw1], larg = [kw, vw1, kw, vw2];
    lignes.forEach((l, i) => {
      const y = th + i * rh;
      if (i) c += `<line x1="0" y1="${y}" x2="${cw / u}" y2="${y}" stroke="#d0d7de" stroke-width=".7"/>`;
      l.forEach((v, j) => {
        let t = String(v); const max = Math.floor((larg[j] - 10) / ((j % 2 ? 10 : 9) * 0.56)); if (t.length > max) t = t.slice(0, max - 1) + '…';
        c += `<text x="${cols[j] + 5}" y="${y + 12}" font-size="${j % 2 ? 10 : 9}"${j % 2 ? '' : ' font-weight="700"'} fill="${j % 2 ? '#111' : '#57606a'}"${i === 1 && j === 1 ? ' font-weight="700"' : ''}>${esc(t)}</text>`;
      });
    });
    [kw, kw + vw1, kw * 2 + vw1].forEach((x, j) => { c += `<line x1="${x}" y1="${th}" x2="${x}" y2="${ch / u}" stroke="${j === 1 ? '#2b2f36' : '#d0d7de'}" stroke-width="${j === 1 ? 1 : .7}"/>`; });
    s += `<g transform="translate(${cx},${cy}) scale(${u})" font-family="${F}">${c}</g>`;
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`, w: W, h: H };
}

/**
 * Texte brut d'une description Capella (attribut XML contenant du HTML).
 * @param {string} s - Valeur brute de l'attribut (entités XML)
 * @returns {string} texte sur une ligne
 */
function capDiagTexte(s) {
  if (!s) return '';
  const t = document.createElement('textarea'); t.innerHTML = s;
  const d = new DOMParser().parseFromString(t.value.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, ' '), 'text/html');
  return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Description et élément représenté d'un diagramme, lus dans le .aird (DRepresentationDescriptor : documentation, target).
 * @param {string} uid - Représentation
 * @returns {{desc:string, cible:?{id:string,nom:string,type:string}}} métadonnées
 */
function capDiagMeta(uid) {
  if (!_capDiag.meta) {
    const m = new Map(), re = /<ownedRepresentationDescriptors\b((?:[^>"]|"[^"]*")*?)(\/>|>([\s\S]*?)<\/ownedRepresentationDescriptors>)/g;
    const att = (a, k) => { const r = a.match(new RegExp('\\s' + k + '="([^"]*)"')); return r ? r[1] : ''; };
    let x;
    while ((x = re.exec(_capDiag.texteAird))) {
      const u = att(x[1], 'uid'); if (!u) continue;
      m.set(u, { doc: att(x[1], 'documentation'), cible: ((x[3] || '').match(/<target\b[^>]*href="[^"#]*#([^"]+)"/) || [])[1] || '' });
    }
    _capDiag.meta = m;
  }
  const r = _capDiag.meta.get(uid) || { doc: '', cible: '' }, e = r.cible && capGetElementById_(r.cible);
  return { desc: capDiagTexte(r.doc), cible: e ? { id: e.id, nom: e.attrs.name || e.id, type: (CAP_HUMAN_NAMES[e.typeName] || {}).h || e.typeName } : null };
}

/**
 * Annexe d'un diagramme : éléments du modèle représentés (attributs data-sem du SVG), triés par couche, type et nom.
 * @param {string} svg - SVG du diagramme
 * @returns {{id:string, nom:string, type:string, couche:string}[]} lignes
 */
function capDiagElements(svg) {
  const ids = new Set((svg.match(/data-sem="[^"]+"/g) || []).map(a => a.slice(10, -1)));
  return [...ids].map(id => { const e = capGetElementById_(id);
    return e ? { id, nom: e.attrs.name || '', type: (CAP_HUMAN_NAMES[e.typeName] || {}).h || e.typeName, couche: e.layer || '' } : null; })
    .filter(Boolean).sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.type.localeCompare(b.type) || a.nom.localeCompare(b.nom));
}

/**
 * Annexe au format CSV (séparateur ;, BOM) : en-tête du diagramme, description, puis éléments représentés.
 * @param {object} rep - Représentation
 * @param {object[]} lignes - capDiagElements
 * @returns {string} texte CSV
 */
function capDiagAnnexeCsv(rep, lignes) {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', l = a => a.map(q).join(';'), m = capDiagMeta(rep.uid);
  return '\uFEFF' + [l([rep.nom, rep.type, rep.couche]), l([_L('Élément représenté'), m.cible ? m.cible.nom : '']), l(['Description', m.desc]), '',
    l(['N°', _L('Élément'), 'Type', _L('Couche'), 'ID']), ...lignes.map((r, i) => l([i + 1, r.nom, r.type, r.couche, r.id]))].join('\n');
}

/** Lignes d'annexe par page PDF. */
const CAP_DIAG_ANX = 34;

/**
 * Pages d'annexe du PDF (A4 paysage) : tableau des éléments représentés.
 * @param {object} rep - Représentation
 * @param {object[]} lignes - capDiagElements
 * @param {string[]} etiquettes - Numéro de chaque page (« n / N »)
 * @returns {HTMLCanvasElement[]} pages
 */
function capDiagAnnexePages(rep, lignes, etiquettes) {
  const W = 1754, H = 1240, out = [], lv = capDiagCouche(rep.couche), n = Math.max(1, Math.ceil(lignes.length / CAP_DIAG_ANX));
  const cols = [[80, 'N°', 70], [150, _L('Élément'), 700], [870, 'Type', 430], [1320, _L('Couche'), 120], [1450, 'ID', 230]];
  for (let k = 0; k < n; k++) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2b2f36'; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60);
    x.fillStyle = '#f5f7fa'; x.fillRect(32, 32, W - 64, 88); x.fillStyle = lv.color; x.fillRect(32, 117, W - 64, 5);
    x.fillStyle = lv.color; x.fillRect(60, 56, 70, 36); x.fillStyle = capInk(lv.color); x.font = '700 20px Segoe UI, Arial, sans-serif'; x.fillText(rep.couche || '—', 72, 82);
    x.fillStyle = '#111'; x.font = '700 28px Segoe UI, Arial, sans-serif';
    x.fillText(`[${rep.sigle}] ${rep.nom.replace(/^\[[^\]]*\]\s*/, '')} — ${_L('annexe')}${n > 1 ? ` ${k + 1}/${n}` : ''}`, 150, 84);
    x.textAlign = 'right'; x.font = '20px Segoe UI, Arial, sans-serif'; x.fillStyle = '#57606a';
    x.fillText(_L(`${lignes.length} élément(s) représenté(s)`) + (etiquettes[k] ? ` · ${_L('Planche')} ${etiquettes[k]}` : ''), W - 70, 84); x.textAlign = 'left';
    x.font = '700 18px Segoe UI, Arial, sans-serif'; x.fillStyle = '#57606a';
    cols.forEach(([cx, t]) => x.fillText(t, cx, 165));
    x.fillStyle = '#2b2f36'; x.fillRect(70, 175, W - 140, 2);
    x.font = '18px Segoe UI, Arial, sans-serif';
    lignes.slice(k * CAP_DIAG_ANX, (k + 1) * CAP_DIAG_ANX).forEach((r, i) => {
      const y = 205 + i * 29, num = k * CAP_DIAG_ANX + i + 1;
      if (i % 2) { x.fillStyle = '#f6f8fa'; x.fillRect(70, y - 21, W - 140, 29); }
      [num, r.nom, r.type, r.couche, r.id].forEach((v, j) => {
        let t = String(v); x.fillStyle = j === 4 ? '#8c959f' : '#111';
        while (x.measureText(t).width > cols[j][2] - 12 && t.length > 3) t = t.slice(0, -2) + '…';
        x.fillText(t, cols[j][0], y);
      });
    });
    out.push(c);
  }
  return out;
}

/**
 * Diagrammes visés par l'export, dans l'ordre de la liste (couche, type, nom).
 * @param {string} portee - 'sel' (cochés), 'vis' (affichés par le filtre) ou 'tous'
 * @returns {object[]} représentations
 */
function capDiagCibles(portee) {
  const reps = portee === 'tous' ? capDiagReps() : capDiagFiltrees();
  const l = (portee === 'sel' ? reps.filter(r => _capDiag.sel.has(r.uid)) : reps).filter(r => r.genre !== 'tableau');   // tableaux : pas de planche
  return l.slice().sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.sigle.localeCompare(b.sigle) || a.nom.localeCompare(b.nom));
}

/** Fenêtre « Exporter des diagrammes » : portée, mise en page, aperçu de la planche, formats. */
function capDiagExportDialog() {
  let ov = document.getElementById('cdg-export-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'cdg-export-ov'; document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.style.display = 'none'; }); }
  const o = _capDiag.exportOpts;
  if (o.portee === 'sel' && !_capDiag.sel.size) o.portee = 'vis';
  const nb = { sel: capDiagCibles('sel').length, vis: capDiagCibles('vis').length, tous: capDiagReps().length };
  const rad = (v, l) => `<label class="cdg-x-opt"><input type="radio" name="cdg-portee" value="${v}"${o.portee === v ? ' checked' : ''}${nb[v] ? '' : ' disabled'}> ${l} <b>${nb[v]}</b></label>`;
  const chk = (k, l, t) => `<label class="cdg-x-opt" title="${t}"><input type="checkbox" data-xo="${k}"${o[k] ? ' checked' : ''}> ${l}</label>`;
  ov.innerHTML = `<div class="cw-d-box" style="max-width:980px">
    <div class="cw-d-hdr"><b>${_L('⬇ Exporter des diagrammes')}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body cdg-x-corps"><div class="cdg-x-gauche">
      <div class="cdg-x-tit">${_L('Diagrammes')}</div>
      ${rad('sel', _L('Cochés dans la liste'))}${rad('vis', _L('Affichés (filtre en cours)'))}${rad('tous', _L('Tous'))}
      <div class="cdg-x-tit">${_L('Mise en page')}</div>
      ${chk('cadre', _L('Cadre et en-tête'), _L('Cadre, bandeau de couche, sigle, nom et type du diagramme'))}
      ${chk('cartouche', _L('Cartouche'), _L('Cartouche technique en bas à droite : projet, diagramme, type, couche, contenu, sources, date, planche'))}
      ${chk('desc', _L('Description'), _L('Description Capella du diagramme et élément représenté, sous l\'en-tête'))}
      ${chk('annexe', _L('Annexes'), _L('Éléments représentés dans chaque diagramme : PDF, page(s) d\'annexe après la planche · ZIP, un CSV par diagramme · HTML, tableau repliable'))}
      ${chk('sommaire', _L('Sommaire'), _L('PDF : page de sommaire par couche et type · HTML : onglet Sommaire'))}
      <label class="cdg-x-opt" title="${_L('Résolution des images PNG / PDF')}">${_L('Résolution')} <select id="cdg-x-scale">${[1, 2, 3].map(v => `<option value="${v}"${o.scale === v ? ' selected' : ''}>×${v}</option>`).join('')}</select></label>
      <div class="cdg-x-tit">${_L('Format')}</div>
      <div class="cdg-x-fmts">
        <button class="cap-lf-btn" data-fmt="pdf" title="${_L('Un PDF : sommaire, une planche par diagramme (A4 orientée automatiquement), signets')}">📄 PDF</button>
        <button class="cap-lf-btn" data-fmt="zip-png" title="${_L('Archive ZIP des planches en PNG, un dossier par couche')}">🗜 ZIP PNG</button>
        <button class="cap-lf-btn" data-fmt="zip-svg" title="${_L('Archive ZIP des planches en SVG (vectoriel), un dossier par couche')}">🗜 ZIP SVG</button>
        <button class="cap-lf-btn" data-fmt="html" title="${_L('Rapport HTML autonome : sommaire et planches classées par couche et type, repliables')}">🌐 HTML</button>
      </div>
      <div id="cdg-x-statut" class="cdg-info"></div>
    </div><div class="cdg-x-droite"><div class="cdg-x-tit">${_L('Aperçu de la planche')}</div><div id="cdg-x-apercu" class="cdg-x-apercu"></div></div></div>
    <div class="cw-d-ftr"><span style="flex:1"></span><button class="cap-lf-btn" data-c="x">${_L('Fermer')}</button></div></div>`;
  ov.style.display = 'flex';
  ov.querySelectorAll('[data-c="x"]').forEach(b => b.onclick = () => { ov.style.display = 'none'; });
  ov.querySelectorAll('[name="cdg-portee"]').forEach(r => r.onchange = () => { o.portee = r.value; capDiagApercu(); });
  ov.querySelectorAll('[data-xo]').forEach(c => c.onchange = () => { o[c.dataset.xo] = c.checked; capDiagApercu(); });
  ov.querySelector('#cdg-x-scale').onchange = e => { o.scale = +e.target.value; };
  ov.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => capDiagExport(b.dataset.fmt));
  capDiagApercu();
}

/** Aperçu de la planche du premier diagramme visé (diagramme ouvert s'il en fait partie). */
async function capDiagApercu() {
  const box = document.getElementById('cdg-x-apercu'); if (!box) return;
  const l = capDiagCibles(_capDiag.exportOpts.portee);
  const rep = l.find(r => r.uid === _capDiag.actif) || l[0];
  if (!rep) { box.innerHTML = `<div class="cdg-aide">${_L('Aucun diagramme.')}</div>`; return; }
  const retour = _capDiag.actif;
  try {
    const p = capDiagPlanche(rep, await capDiagSvg(rep.uid), { planche: `1 / ${l.length}` });
    box.innerHTML = `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg)}">`;
  } catch (e) { box.innerHTML = `<div class="cdg-aide">⚠ ${capEsc(e.message)}</div>`; }
  if (retour && retour !== rep.uid) _capDiag.vis.ouvrir(retour);
}

/**
 * Page de sommaire du PDF (paysage A4) : projet, date, nombre de planches, liste par couche et type avec numéros de page.
 * @param {object[]} l - Représentations exportées
 * @param {number[]} pages - Numéro de page de chacune
 * @returns {HTMLCanvasElement[]} une ou plusieurs pages
 */
function capDiagPdfSommaire(l, pages) {
  const W = 1754, H = 1240, parCol = 30, cols = 2, parPage = parCol * cols, out = [];
  const projet = (cap_xmlDoc && cap_xmlDoc.documentElement && cap_xmlDoc.documentElement.getAttribute('name')) || _L('Projet Capella');
  // Lignes : en-têtes de couche puis diagrammes
  const items = []; let cour = null;
  l.forEach((r, i) => { if (r.couche !== cour) { cour = r.couche; items.push({ couche: r.couche }); } items.push({ r, p: pages[i] }); });
  const nPages = Math.max(1, Math.ceil(items.length / parPage));
  for (let k = 0; k < nPages; k++) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2b2f36'; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60);
    x.fillStyle = '#f5f7fa'; x.fillRect(32, 32, W - 64, 150); x.fillStyle = '#5aa2e8'; x.fillRect(32, 178, W - 64, 5);
    x.fillStyle = '#111'; x.font = '700 46px Segoe UI, Arial, sans-serif'; x.fillText(_L('Diagrammes Capella'), 80, 105);
    x.font = '26px Segoe UI, Arial, sans-serif'; x.fillStyle = '#444';
    x.fillText(`${projet}${capCurrentFileName ? ' — ' + capCurrentFileName : ''}${_capDiag.nomAird ? ' · ' + _capDiag.nomAird : ''}`, 80, 148);
    x.textAlign = 'right';
    x.fillText(`${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · ${_L(`${l.length} planche(s)`)}${nPages > 1 ? ` · ${k + 1}/${nPages}` : ''}`, W - 80, 148);
    x.textAlign = 'left';
    const colW = (W - 160) / cols;
    items.slice(k * parPage, (k + 1) * parPage).forEach((it, i) => {
      const cx = 80 + Math.floor(i / parCol) * colW, cy = 245 + (i % parCol) * 31;
      if (it.couche !== undefined) {
        const lv = capDiagCouche(it.couche);
        x.fillStyle = lv.color; x.fillRect(cx, cy - 20, 54, 26);
        x.fillStyle = capInk(lv.color); x.font = '700 17px Segoe UI, Arial, sans-serif'; x.fillText(it.couche || '—', cx + 8, cy);
        x.fillStyle = '#111'; x.font = '700 21px Segoe UI, Arial, sans-serif'; x.fillText(lv.label, cx + 66, cy);
        return;
      }
      const lv = capDiagCouche(it.r.couche);
      x.fillStyle = lv.color; x.fillRect(cx, cy - 17, 5, 22);
      x.font = '700 15px Segoe UI, Arial, sans-serif'; x.fillStyle = '#57606a'; x.fillText(it.r.sigle, cx + 16, cy);
      x.font = '19px Segoe UI, Arial, sans-serif'; x.fillStyle = '#111';
      let t = it.r.nom.replace(/^\[[^\]]*\]\s*/, ''); while (x.measureText(t).width > colW - 190 && t.length > 4) t = t.slice(0, -2) + '…';
      x.fillText(t, cx + 92, cy);
      x.fillStyle = '#57606a'; x.textAlign = 'right'; x.fillText(String(it.p), cx + colW - 30, cy); x.textAlign = 'left';
    });
    out.push(c);
  }
  return out;
}

/** Seuil (Mo) au-delà duquel l'export PDF demande confirmation. */
const CAP_DIAG_PDF_ALERTE = 40;

/**
 * Taille estimée du PDF, d'après la surface des planches rastérisées (même bornes que capSvgToCanvas)
 * et le nombre de pages d'annexe et de sommaire (coefficients mesurés sur des modèles réels, JPEG 0,92 / 0,8).
 * @param {object[]} items - Diagrammes ({p:{w,h}, nAnx})
 * @param {number} scale - Résolution choisie
 * @param {number} nSom - Pages de sommaire
 * @returns {number} taille estimée en Mo
 */
function capDiagPdfEstimation(items, scale, nSom) {
  let o = nSom * 170e3;
  items.forEach(it => {
    const w = it.p.w, h = it.p.h, k = Math.max(0.5, Math.min(scale || 2, 8000 / Math.max(w, h), Math.sqrt(40e6 / (w * h))));
    o += w * h * k * k * 0.075 + it.nAnx * 170e3;
  });
  return o / 1048576;
}

/**
 * Export groupé des diagrammes en planches : capture de tous les diagrammes, puis pagination
 * (sommaire, planche, pages d'annexe) et écriture du format choisi.
 * @param {string} fmt - 'pdf' | 'zip-png' | 'zip-svg' | 'html'
 */
async function capDiagExport(fmt) {
  const o = _capDiag.exportOpts, l = capDiagCibles(o.portee);
  const st = t => { const s = document.getElementById('cdg-x-statut'); if (s) s.textContent = t; capDiagMsg(t); };
  if (!l.length) { st(_L('Aucun diagramme à exporter.')); return; }
  const projet = (cap_xmlDoc && cap_xmlDoc.documentElement && cap_xmlDoc.documentElement.getAttribute('name')) || 'Capella';
  const date = new Date().toISOString().slice(0, 10), retour = _capDiag.actif;
  const enc = new TextEncoder(), fichiers = [], pdf = [];
  const jpg = async (c, q) => new Uint8Array(await (await capCanvasBlob(c, 'image/jpeg', q || 0.92)).arrayBuffer());
  document.querySelectorAll('#cdg-export-ov [data-fmt]').forEach(b => { b.disabled = true; });
  try {
    // 1. Capture des diagrammes et de leurs éléments
    const items = [], echecs = [];
    for (let i = 0; i < l.length; i++) {
      st(`⏳ ${i + 1}/${l.length} — ${l[i].nom}`);
      await new Promise(res => setTimeout(res, 0));
      let svg;
      try { svg = await capDiagSvg(l[i].uid); } catch (e) { console.warn(l[i].nom, e); echecs.push(l[i].nom); continue; }
      items.push({ r: l[i], svg, el: o.annexe ? capDiagElements(svg) : [] });
    }
    if (!items.length) throw new Error(_L('aucun diagramme exportable'));
    l.splice(0, l.length, ...items.map(it => it.r));
    // 2. Pagination du PDF : sommaire(s), puis pour chaque diagramme sa planche et ses pages d'annexe
    const nSom = fmt === 'pdf' && o.sommaire ? Math.max(1, Math.ceil((l.length + new Set(l.map(r => r.couche)).size) / 60)) : 0;
    let total = nSom;
    items.forEach(it => { it.page = total + 1; it.nAnx = fmt === 'pdf' && o.annexe && it.el.length ? Math.ceil(it.el.length / CAP_DIAG_ANX) : 0; total += 1 + it.nAnx; });
    items.forEach((it, i) => { it.p = capDiagPlanche(it.r, it.svg, { planche: fmt === 'pdf' ? `${it.page} / ${total}` : `${i + 1} / ${l.length}` }); });
    // PDF lourd : estimation (dimensions réelles des planches) et confirmation au-delà du seuil
    if (fmt === 'pdf') {
      const mo = capDiagPdfEstimation(items, o.scale, nSom);
      if (mo > CAP_DIAG_PDF_ALERTE && !confirm(_L(`Le PDF fera environ ${Math.round(mo)} Mo (${total} pages).\n\nPour l'alléger : résolution ×1, sans annexes, ou moins de diagrammes (☐ Sélectionner…).\n\nContinuer quand même ?`))) {
        st(_L(`Export annulé : PDF estimé à ${Math.round(mo)} Mo.`)); return;
      }
    }
    if (nSom) for (const c of capDiagPdfSommaire(l, items.map(it => it.page))) pdf.push({ jpeg: await jpg(c, 0.8), iw: c.width, ih: c.height, pw: 842, ph: 595, title: _L('Sommaire') });
    // 3. Planches
    for (let i = 0; i < items.length; i++) {
      const it = items[i], r = it.r;
      st(`⏳ ${_L('Planche')} ${i + 1}/${items.length} — ${r.nom}`);
      await new Promise(res => setTimeout(res, 0));
      const base = `${r.couche || _L('Autres')}/${String(i + 1).padStart(3, '0')} - ${capSafeFileName(r.nom)}`;
      if (fmt !== 'pdf' && fmt !== 'html' && o.annexe) fichiers.push({ name: base + _L(' - annexe') + '.csv', data: enc.encode(capDiagAnnexeCsv(r, it.el)) });
      if (fmt === 'zip-svg') { fichiers.push({ name: base + '.svg', data: enc.encode(it.p.svg) }); continue; }
      if (fmt === 'html') continue;
      const c = await capSvgToCanvas(it.p.svg, it.p.w, it.p.h, o.scale);
      if (fmt === 'zip-png') { fichiers.push({ name: base + '.png', data: new Uint8Array(await (await capCanvasBlob(c, 'image/png')).arrayBuffer()) }); continue; }
      const pays = it.p.w >= it.p.h, titre = `[${r.sigle}] ${r.nom.replace(/^\[[^\]]*\]\s*/, '')}`;
      pdf.push({ jpeg: await jpg(c), iw: c.width, ih: c.height, pw: pays ? 842 : 595, ph: pays ? 595 : 842, title: titre });
      if (it.nAnx) {
        const cvs = capDiagAnnexePages(r, it.el, [...Array(it.nAnx)].map((_, k) => `${it.page + 1 + k} / ${total}`));
        for (let k = 0; k < cvs.length; k++) pdf.push({ jpeg: await jpg(cvs[k], 0.8), iw: cvs[k].width, ih: cvs[k].height, pw: 842, ph: 595, title: `${titre} — ${_L('annexe')}${cvs.length > 1 ? ' ' + (k + 1) : ''}` });
      }
    }
    const racine = `${capSafeFileName(projet)} - ${_L('diagrammes')}`;
    if (fmt === 'pdf') capDownloadBlob(capPdfBuild(pdf, _L(`Diagrammes — ${projet}`)), `${racine} - ${date}.pdf`);
    else if (fmt === 'html') capDiagExportHtml(items, racine);
    else capDownloadBlob(capZipBuild(fichiers), `${racine} ${fmt === 'zip-svg' ? 'SVG' : 'PNG'} - ${date}.zip`);
    st(_L(`✔ ${l.length} diagramme(s) exporté(s)`) + (fmt === 'pdf' ? _L(` (${pdf.length} pages)`) : '') +
      (echecs.length ? _L(` — ${echecs.length} ignoré(s) : `) + echecs.join(', ') : ''));
  } catch (e) { console.error(e); st(_L('⚠ Échec de l\'export : ') + e.message); }
  finally {
    document.querySelectorAll('#cdg-export-ov [data-fmt]').forEach(b => { b.disabled = false; });
    if (retour) { _capDiag.vis.ouvrir(retour); _capDiag.actif = retour; capDiagMarquerActif(); }
  }
}

/**
 * Rapport HTML autonome : onglet Sommaire (tableau avec liens) et onglet Planches
 * (groupes repliables par couche puis type, une carte repliable par diagramme : planche vectorielle, annexe).
 * @param {{r:object, p:{svg:string,w:number,h:number}, el:object[]}[]} items - Diagrammes exportés, dans l'ordre
 * @param {string} racine - Début du nom de fichier
 */
function capDiagExportHtml(items, racine) {
  const o = _capDiag.exportOpts;
  const img = p => `<img loading="lazy" alt="" style="max-width:100%;height:auto;background:#fff;border:1px solid var(--c-border);border-radius:4px" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg).replace(/'/g, '%27')}">`;
  const badge = c => { const lv = capDiagCouche(c); return `<span style="display:inline-block;min-width:34px;text-align:center;padding:1px 6px;border-radius:4px;font-weight:700;font-size:11px;background:${lv.color};color:${capInk(lv.color)}">${capEsc(c || '—')}</span>`; };
  const sigle = r => { const lv = capDiagCouche(r.couche); return `<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;color:${lv.color};background:${lv.bg}">${capEsc(r.sigle)}</span>`; };
  const nbEl = it => new Set((it.p.svg.match(/data-sem="[^"]+"/g) || [])).size;
  const sommaire = `<table class="cap-diag-t" style="border-collapse:collapse;width:100%"><tr><th>N°</th><th>${_L('Couche')}</th><th>${_L('Sigle')}</th><th>Type</th><th>${_L('Diagramme')}</th><th>${_L('Éléments')}</th></tr>` +
    items.map((it, i) => `<tr><td class="num">${i + 1}</td><td>${badge(it.r.couche)}</td><td>${sigle(it.r)}</td><td>${capEsc(it.r.type)}</td>` +
      `<td><a href="#dg-${i}" onclick="var t=document.querySelector('.rtab[data-t=pl]');if(t)t.click();var d=document.getElementById('dg-${i}');if(d){d.open=true;var g=d.parentElement.closest('details');while(g){g.open=true;g=g.parentElement.closest('details');}}" style="color:var(--c-accent)">${capEsc(it.r.nom)}</a></td>` +
      `<td class="num">${nbEl(it)}</td></tr>`).join('') + `</table>`;
  const css = `<style>.dg-c>summary{font-size:15px;font-weight:700;padding:8px 4px}
.dg-t{margin:4px 0 4px 14px}.dg-t>summary{font-weight:600;padding:5px 4px;color:var(--c-text)}
.dg-p{margin:6px 0 10px 14px;border:1px solid var(--c-border);border-radius:6px;background:var(--c-bg2)}.dg-p>summary{padding:6px 10px}
.dg-p>div{padding:8px 10px;text-align:center}.dg-n{color:var(--c-dim);font-weight:400;font-size:12px}
.dg-a{text-align:left;margin-top:8px}.dg-a>summary{padding:4px 0;color:var(--c-dim)}.dg-a table{border-collapse:collapse;width:100%;font-size:12px}
.dg-a td,.dg-a th{border-bottom:1px solid var(--c-border);padding:3px 6px;text-align:left}</style>`;
  const annexe = it => !o.annexe || !it.el.length ? '' :
    `<details class="dg-a"><summary>${_L('Annexe')} — ${_L(`${it.el.length} élément(s) représenté(s)`)}</summary><table class="ana-t"><tr><th>N°</th><th>${_L('Élément')}</th><th>Type</th><th>${_L('Couche')}</th><th>ID</th></tr>` +
    it.el.map((e, k) => `<tr><td class="num">${k + 1}</td><td>${capEsc(e.nom)}</td><td>${capEsc(e.type)}</td><td>${capEsc(e.couche)}</td><td class="ana-dim">${capEsc(e.id)}</td></tr>`).join('') + `</table></details>`;
  let corps = '';
  const parC = new Map(); items.forEach((it, k) => { const c = it.r.couche || ''; if (!parC.has(c)) parC.set(c, []); parC.get(c).push(Object.assign(it, { k })); });
  parC.forEach((lc, c) => {
    const parT = new Map(); lc.forEach(x => { const t = x.r.sigle + '|' + x.r.type; if (!parT.has(t)) parT.set(t, []); parT.get(t).push(x); });
    corps += `<details class="dg-c" open><summary>${badge(c)} ${capEsc(capDiagCouche(c).label)} <span class="dg-n">${lc.length}</span></summary>`;
    parT.forEach(lt => {
      corps += `<details class="dg-t" open><summary>${sigle(lt[0].r)} ${capEsc(lt[0].r.type)} <span class="dg-n">${lt.length}</span></summary>`;
      lt.forEach(it => { corps += `<details class="dg-p cap-chain-card" id="dg-${it.k}"${lt.length <= 3 ? ' open' : ''}><summary>${sigle(it.r)} <b>${capEsc(it.r.nom.replace(/^\[[^\]]*\]\s*/, ''))}</b> <span class="dg-n">${it.k + 1}</span></summary><div>${img(it.p)}${annexe(it)}</div></details>`; });
      corps += `</details>`;
    });
    corps += `</details>`;
  });
  capHtmlReport({ title: _L('🔲 Diagrammes Capella'), subtitle: _L(`${items.length} diagramme(s)`) + (_capDiag.nomAird ? ' · ' + _capDiag.nomAird : ''), active: o.sommaire ? 'sum' : 'pl',
    tabs: [o.sommaire ? { key: 'sum', label: _L('📋 Sommaire'), html: sommaire } : null, { key: 'pl', label: _L('🔲 Planches'), html: css + corps }].filter(Boolean),
    filename: `${racine}.html` });
}
