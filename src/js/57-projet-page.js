/* ═══════════════════════════════════════════════════════════════════════
   📄 PROJET DE TRAVAIL — reprise d'une page HTML enregistrée (💾) dans cette version d'Arcalyse
   ───────────────────────────────────────────────────────────────────────
   Une page enregistrée contient le modèle (bloc XML « cap-embedded-xml »), les diagrammes (« cap-embedded-aird »,
   depuis la 2.2) et le travail fait dessus, dans des blocs JSON de la page : revue (cap-review), accueil (cap-home),
   tableaux de bord (cap-dashboards), barre des vues (cap-toolbar), ▤ Tableau / exports CSV / vues de la Relation Map /
   thème choisi (cap-ui-views), thème personnalisé (cap-theme-custom), règles de nommage (cap-name-rules).
   Ouvrir cette page dans une version plus récente d'Arcalyse (📁 Fichier › 📄 Ouvrir un projet de travail, écran
   d'accueil, ou dépôt du fichier .html) relit ces blocs SANS exécuter l'ancienne page, puis applique ce qui a été
   coché : le travail passe dans la nouvelle version. Format garanti lisible à partir des pages de la version 2.1.
   ═══════════════════════════════════════════════════════════════════════ */

/** Page de projet ouverte : nom du fichier (proposé à l'enregistrement). */
const _capProjetPage = { nom: '' };
/** Plus ancienne version d'Arcalyse dont les pages enregistrées sont reprises sans réserve. */
const CAP_PROJET_VERSION_MIN = '2.1';
/** Blocs JSON d'une page enregistrée repris à l'ouverture d'un projet de travail. */
const CAP_PROJET_BLOCS = ['cap-review', 'cap-home', 'cap-dashboards', 'cap-toolbar', 'cap-ui-views', 'cap-theme-custom', 'cap-name-rules'];

/**
 * 📄 Ouvrir un projet de travail : choix de la page HTML (sélecteur à accès direct quand le navigateur le permet,
 * pour réenregistrer ensuite dans le même fichier), après l'avertissement habituel si un modèle est affiché.
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté
 */
async function capProjetPagePick(confirme) {
  if (capLoaded && !confirme) { if (await capReplaceConfirm('')) capProjetPagePick(true); return; }
  if (window.showOpenFilePicker && !(typeof _capPickerKo !== 'undefined' && _capPickerKo)) {
    try {
      const [h] = await window.showOpenFilePicker({ id: 'arcalyse-projet-page', types: [{ description: _L('Page HTML Arcalyse'), accept: { 'text/html': ['.html', '.htm'] } }] });
      capProjetPageOuvrir(await h.getFile(), h, true);
      return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const inp = document.createElement('input'); inp.type = 'file'; if (!capIsMobile()) inp.accept = '.html,.htm';
  inp.onchange = () => { const f = inp.files[0]; if (f) capProjetPageOuvrir(f, null, true); };
  inp.click();
}

/**
 * Lit une page HTML de projet (choisie ou déposée), analyse son contenu et propose ce qu'il faut reprendre.
 * @param {File} f - Page HTML
 * @param {?FileSystemFileHandle} [handle] - Accès direct au fichier (pour réenregistrer dans le même fichier)
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté
 */
function capProjetPageOuvrir(f, handle, confirme) {
  if (capLoaded && !confirme) { capReplaceConfirm(f.name).then(ok => { if (ok) capProjetPageOuvrir(f, handle, true); else capShowWelcome(false); }); return; }
  capWelcomeStatus(_L(`Lecture de « ${f.name} »…`), 'busy');
  capShowWelcome(true);
  f.text().then(t => {
    let info;
    try { info = capProjetPageLire(t); } catch (e) { info = null; }
    if (!info || (!info.xml && !Object.keys(info.blocs).length)) {
      capWelcomeStatus(_L(`« ${f.name} » n'est pas une page enregistrée par Arcalyse (ni modèle ni travail reconnu).`), 'err');
      return;
    }
    capWelcomeStatus('', '');
    capProjetPageDialogue(info, f.name, handle || null);
  }).catch(e => capWelcomeStatus(_L('Lecture impossible : ') + (e && e.message || e), 'err'));
}

/**
 * Analyse le texte d'une page HTML enregistrée, sans l'exécuter.
 * @param {string} texte - Code HTML de la page
 * @returns {{version:string, xml:string, nomModele:string, aird:string, nomAird:string, blocs:Object<string,string>}}
 *   version : version d'Arcalyse qui l'a produite ('' si inconnue) ; blocs : texte des blocs JSON repris
 */
function capProjetPageLire(texte) {
  const doc = new DOMParser().parseFromString(texte, 'text/html');
  const v = texte.match(/CAP_APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  const x = doc.getElementById('cap-embedded-xml'), a = doc.getElementById('cap-embedded-aird');
  const blocs = {};
  CAP_PROJET_BLOCS.forEach(id => { const b = doc.getElementById(id); if (b && b.textContent.trim()) blocs[id] = b.textContent; });
  return { version: v ? v[1] : '', xml: x ? x.textContent : '', nomModele: x ? x.getAttribute('data-name') || '' : '',
    aird: a ? a.textContent : '', nomAird: a ? a.getAttribute('data-name') || '' : '', blocs };
}

/**
 * Compare deux numéros de version (« 2.1 », « 2.10.1 »).
 * @param {string} a @param {string} b
 * @returns {number} < 0 si a est antérieure à b, 0 si égales, > 0 sinon
 */
function capProjetVersionCmp(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0), pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
}

/**
 * Relit un bloc JSON d'une page enregistrée (ensembles « __set » reconstitués, comme les fichiers ⚙ d'interface).
 * @param {object} info - Résultat de capProjetPageLire
 * @param {string} id - Identifiant du bloc
 * @returns {*} contenu, ou null s'il est absent ou illisible
 */
function capProjetBloc(info, id) {
  if (!info.blocs[id]) return null;
  try { return capCfgRev(info.blocs[id]); } catch (e) { console.warn('Bloc illisible :', id, e); return null; }
}

/**
 * Parties d'une page de projet, avec ce qu'elles contiennent (pour la fenêtre de choix).
 * @param {object} info - Résultat de capProjetPageLire
 * @returns {{k:string, l:string, d:string}[]} parties présentes
 */
function capProjetParties(info) {
  const P = [], n = (x, s) => _L(`${x} ${s}`);
  if (info.xml) P.push({ k: 'modele', l: _L('🔷 Modèle Capella'), d: (info.nomModele || _L('(sans nom)')) + ' · ' + Math.round(info.xml.length / 1024) + ' ' + _L('Ko') });
  if (info.aird) P.push({ k: 'aird', l: _L('🔲 Diagrammes (.aird)'), d: (info.nomAird || '.aird') + ' · ' + Math.round(info.aird.length / 1024) + ' ' + _L('Ko') });
  const rev = capProjetBloc(info, 'cap-review');
  if (rev && Array.isArray(rev.comments)) P.push({ k: 'revue', l: _L('💬 Revue'), d: n(rev.comments.length, _L('commentaire(s)')) });
  const home = capProjetBloc(info, 'cap-home');
  if (home) P.push({ k: 'accueil', l: _L('🏠 Accueil'), d: _L(`fiche projet, ${(home.docs || []).length} check-list(s) ou plan(s) de revue, ${(home.boards || []).length} tableau(x) blanc(s)`) });
  const dash = capProjetBloc(info, 'cap-dashboards');
  if (dash) P.push({ k: 'dash', l: _L('📐 Tableaux de bord'), d: n((dash.list || []).length, _L('page(s)')) });
  const ui = capProjetBloc(info, 'cap-ui-views');
  if (ui && (ui.table || ui.csv || ui.rm || ui.tv)) P.push({ k: 'vues', l: _L('▤ Tableau, 🗺 vues de la Relation Map, ⬇ exports CSV'), d: _L('onglets, colonnes, filtres, vues enregistrées') });
  if (info.blocs['cap-toolbar']) P.push({ k: 'toolbar', l: _L('☰ Barre des vues et ⚙ préférences'), d: _L('affichage des menus, vues épinglées, enregistrement automatique') });
  if ((ui && ui.theme) || info.blocs['cap-theme-custom']) P.push({ k: 'theme', l: _L('🎨 Thème'), d: _L('thème choisi et thème personnalisé') });
  if (info.blocs['cap-name-rules']) P.push({ k: 'names', l: _L('🔤 Règles de nommage'), d: _L('verbes acceptés, mots refusés') });
  return P;
}

/**
 * Fenêtre « Ouvrir un projet de travail » : version de la page, compatibilité, parties à reprendre (cochées),
 * réenregistrement dans le même fichier.
 * @param {object} info - Résultat de capProjetPageLire
 * @param {string} nom - Nom de la page
 * @param {?FileSystemFileHandle} handle - Accès direct à la page, ou null
 */
function capProjetPageDialogue(info, nom, handle) {
  let ov = document.getElementById('cap-projet-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'cap-projet-ov'; ov.className = 'cap-projet-ov'; document.body.appendChild(ov); }
  const parts = capProjetParties(info), esc = capEsc, v = info.version;
  const compat = !v ? _L('⚠ Version d\'Arcalyse inconnue (page antérieure à la 2.0 ?) : la reprise est tentée, certains réglages peuvent manquer.')
    : capProjetVersionCmp(v, CAP_PROJET_VERSION_MIN) < 0 ? _L(`⚠ Page enregistrée par la version ${esc(v)}, antérieure à la ${CAP_PROJET_VERSION_MIN} : la reprise est tentée, certains réglages peuvent manquer.`)
    : capProjetVersionCmp(v, CAP_APP_VERSION) > 0 ? _L(`⚠ Page enregistrée par une version plus récente (${esc(v)}) que celle-ci (${esc(CAP_APP_VERSION)}) : ce qu'elle seule connaît sera ignoré.`)
    : _L(`✔ Page enregistrée par la version ${esc(v)} : reprise complète dans la version ${esc(CAP_APP_VERSION)}.`);
  const warn = !v || capProjetVersionCmp(v, CAP_PROJET_VERSION_MIN) < 0 || capProjetVersionCmp(v, CAP_APP_VERSION) > 0;
  ov.innerHTML = `<div class="cw-d-box" style="max-width:600px">
    <div class="cw-d-hdr"><b>${_L('📄 Ouvrir un projet de travail')}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body">
      <div class="cw-d-sub">${_L('Page')} : <b>${esc(nom)}</b></div>
      <p style="font-size:12.5px;margin:8px 0;${warn ? 'color:var(--c-warn,#e3b341)' : 'color:var(--c-ok,#3fb950)'}">${compat}</p>
      ${info.xml ? '' : `<p style="font-size:12.5px;margin:8px 0;color:var(--c-warn,#e3b341)">${_L('Cette page ne contient pas de modèle : seuls le travail et les réglages cochés seront repris.')}</p>`}
      <div class="cw-d-sub" style="margin-top:8px">${_L('À reprendre dans cette version :')}</div>
      ${parts.map(p => `<label class="cfg-part"><input type="checkbox" data-k="${p.k}" checked${p.k === 'modele' ? ' disabled' : ''}> <span><b>${p.l}</b><br><span class="ana-dim">${esc(p.d)}</span></span></label>`).join('')}
      ${handle ? `<label class="cfg-part"><input type="checkbox" id="cap-projet-meme" checked> <span><b>${_L('💾 Enregistrer ensuite dans ce même fichier')}</b><br><span class="ana-dim">${_L('Ctrl+S remplacera l\'ancienne page par la page de cette version, avec tout le travail (le navigateur demandera l\'autorisation d\'écrire).')}</span></span></label>`
        : `<p class="ana-dim" style="font-size:11.5px;margin:8px 0">${_L('Pensez ensuite à enregistrer (💾, Ctrl+S) : la page enregistrée sera celle de cette version, avec tout le travail.')}</p>`}
    </div>
    <div class="cw-d-ftr"><span style="flex:1"></span><button class="cap-lf-btn" data-c="x">${_L('Annuler')}</button>
      <button class="phl-export-btn" data-c="ok" style="margin-left:0">${_L('📄 Ouvrir le projet')}</button></div></div>`;
  ov.style.display = 'flex';
  const fin = () => { ov.style.display = 'none'; if (capLoaded) capShowWelcome(false); };
  ov.onclick = e => {
    if (e.target === ov || e.target.closest('[data-c="x"]')) { fin(); return; }
    if (!e.target.closest('[data-c="ok"]')) return;
    const keys = new Set([...ov.querySelectorAll('[data-k]:checked')].map(c => c.dataset.k));
    const meme = !!(handle && ov.querySelector('#cap-projet-meme:checked'));
    ov.style.display = 'none';
    capProjetPageAppliquer(info, keys, nom, meme ? handle : null);
  };
}

/**
 * Applique une page de projet : travail et réglages cochés, puis modèle et diagrammes ; ouvre 🏠 Accueil.
 * @param {object} info - Résultat de capProjetPageLire
 * @param {Set<string>} keys - Parties cochées (capProjetParties)
 * @param {string} nom - Nom de la page (proposé à l'enregistrement)
 * @param {?FileSystemFileHandle} handle - Fichier où réenregistrer (Ctrl+S), ou null
 */
function capProjetPageAppliquer(info, keys, nom, handle) {
  const essai = (k, fn) => { try { fn(); } catch (e) { console.error(e); alert(_L(`Partie « ${k} » non reprise : `) + (e && e.message || e)); } };
  const ui = capProjetBloc(info, 'cap-ui-views') || {};
  if (keys.has('toolbar')) essai('toolbar', () => capCfgSet('toolbar', capProjetBloc(info, 'cap-toolbar')));
  if (keys.has('dash')) essai('dash', () => capCfgSet('dash', capProjetBloc(info, 'cap-dashboards')));
  if (keys.has('vues')) essai('vues', () => { ['table', 'csv', 'rm', 'tv'].forEach(k => { if (ui[k]) capCfgSet(k, ui[k]); }); });
  if (keys.has('theme')) essai('theme', () => { const c = capProjetBloc(info, 'cap-theme-custom'); capCfgSet('theme', Object.assign({ current: ui.theme || '' }, c ? { custom: c } : {})); });
  if (keys.has('names')) essai('names', () => capCfgSet('names', capProjetBloc(info, 'cap-name-rules')));
  if (keys.has('revue')) essai('revue', () => { _capRev = capRevNorm(capProjetBloc(info, 'cap-review')); _capRev.comments.forEach(c => _capRevUnsaved.add(c.id)); capRevSave(); });
  if (keys.has('accueil')) essai('accueil', () => capHomeSetData(capProjetBloc(info, 'cap-home')));
  if (!info.xml) { capShowWelcome(!capLoaded); if (typeof capWatchFlash === 'function') capWatchFlash(_L('✔ Travail et réglages de la page repris')); return; }
  let doc;
  try {
    doc = new DOMParser().parseFromString(info.xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error(_L('XML invalide'));
  } catch (e) { capWelcomeStatus(_L('Modèle de la page illisible : ') + e.message, 'err'); capShowWelcome(true); return; }
  capDiagAvantNouveauModele();   // diagrammes de l'ancien modèle retirés
  if (keys.has('aird') && info.aird) { capDiagSetAird(info.aird, info.nomAird, null, 0); _capDiag.attente = false; }
  const nomModele = info.nomModele || _L('modele.capella');
  capWelcomeStatus(_L(`Chargement de « ${nomModele} »…`), 'busy');
  capShowWelcome(true);
  setTimeout(() => {
    try {
      capCurrentView = 'home';
      capApplyXmlDoc(doc, nomModele);
      capWatchSetSource(new File([info.xml], nomModele, { lastModified: Date.now() }), null, info.xml);
      _capProjetPage.nom = nom;
      if (handle) _capSaveHandle = handle;
      capWelcomeStatus('', ''); capShowWelcome(false);
      if (typeof capWatchFlash === 'function') setTimeout(() => capWatchFlash(_L(`✔ Projet « ${nom} » repris dans la version ${CAP_APP_VERSION} — pensez à l'enregistrer (💾)`)), 300);
    } catch (e) {
      capWelcomeStatus(_L('Erreur de chargement : ') + e.message, 'err'); capShowWelcome(true);
    }
  }, 30);
}
