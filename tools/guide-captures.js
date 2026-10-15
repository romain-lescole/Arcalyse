#!/usr/bin/env node
/**
 * Captures d'écran du guide d'utilisation (docs/GUIDE-UTILISATION.md) : ouvre dist/arcalyse-fr.html dans Chromium
 * HORS LIGNE, thème Clair, charge le modèle d'exemple IFE et ses diagrammes (.aird), puis parcourt les vues, menus
 * et fenêtres en enregistrant des captures (pleine fenêtre, zones recadrées, boutons isolés, repères numérotés)
 * dans docs/guide/img/.
 *
 * Prérequis : node build.js, puis Playwright (npm i -D playwright && npx playwright install chromium).
 * Lancement : node tools/guide-captures.js [partie…]   (sans argument : toutes les parties)
 */
'use strict';
const path = require('path'), fs = require('fs'), zlib = require('zlib'), os = require('os');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { try { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
  catch (e2) { console.error('Playwright absent : npm install --save-dev playwright'); process.exit(2); } }

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'guide', 'img');
const PAGE = path.join(ROOT, 'dist', 'arcalyse-fr.html');
const MODEL = path.join(ROOT, 'tests', 'models', 'In-Flight_Entertainment_System.capella');
const AIRD_GZ = MODEL.replace(/\.capella$/, '.aird.gz');
const W = 1600, H = 900;
fs.mkdirSync(OUT, { recursive: true });

/** Page Playwright courante et liste des erreurs JavaScript rencontrées. */
let p; const errs = [];

/** Pause.
 * @param {number} ms - Durée en millisecondes
 */
const wait = ms => p.waitForTimeout(ms);

/** Rectangle englobant (coordonnées de la fenêtre) des éléments visibles désignés par une ou plusieurs sélections CSS.
 * @param {string|string[]} sels - Sélecteur(s) CSS
 * @returns {Promise<{x:number,y:number,width:number,height:number}|null>} Rectangle, ou null si rien n'est visible
 */
async function bbox(sels) {
  return p.evaluate(list => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of list) for (const e of document.querySelectorAll(s)) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }, [].concat(sels));
}

/** Enregistre une capture : fenêtre entière, ou zone englobant des éléments (avec marge), ou rectangle donné.
 * @param {string} name - Nom du fichier (sans .png)
 * @param {object} [o] - {sel: sélecteur(s), pad: marge, clip: rectangle, maxH: hauteur maximale}
 */
async function shot(name, o = {}) {
  let clip = o.clip || null;
  if (o.sel) {
    const r = await bbox(o.sel);
    if (!r) { console.log('  ⚠ ' + name + ' : rien de visible pour ' + o.sel); errs.push(name + ' : sélection invisible'); return; }
    const pad = o.pad ?? 6;
    clip = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad) };
    clip.width = Math.min(W, r.x + r.width + pad) - clip.x;
    clip.height = Math.min(o.maxH ? clip.y + o.maxH : HH, r.y + r.height + pad) - clip.y;
  }
  if (clip && o.maxH) clip.height = Math.min(clip.height, o.maxH);
  await p.screenshot({ path: path.join(OUT, name + '.png'), clip: clip || undefined });
  console.log('✔ ' + name);
}

/** Pose des pastilles numérotées (repères) sur des éléments de la page, pour une capture annotée.
 * @param {Array<string|Element>} sels - Sélecteurs CSS, numérotés 1, 2, 3… dans l'ordre
 * @param {string} [pos] - Position de la pastille : 'tl' (coin haut gauche, défaut), 'tr', 'bl', 'l' (à gauche, centrée)
 */
async function marks(sels, pos = 'tl') {
  await p.evaluate(([list, pos]) => {
    document.querySelectorAll('.guide-mark').forEach(x => x.remove());
    list.forEach((s, i) => {
      const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e) return;
      const r = e.getBoundingClientRect(); if (!r.width) return;
      const m = document.createElement('div'); m.className = 'guide-mark'; m.textContent = i + 1;
      const x = pos === 'tr' ? r.right - 9 : pos === 'l' ? r.left - 18 : r.left - 7;
      const y = pos === 'bl' ? r.bottom - 9 : pos === 'l' ? r.top + r.height / 2 - 9 : r.top - 8;
      Object.assign(m.style, { position: 'fixed', left: Math.max(0, x) + 'px', top: Math.max(0, y) + 'px', zIndex: 2147483647,
        width: '18px', height: '18px', borderRadius: '50%', background: '#d62828', color: '#fff', font: 'bold 11px/18px Arial,sans-serif',
        textAlign: 'center', boxShadow: '0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.5)', pointerEvents: 'none' });
      document.body.appendChild(m);
    });
  }, [sels, pos]);
}
/** Retire les pastilles numérotées. */
/** Donne l'identifiant « guide-dlg » à la fenêtre (enfant direct d'un calque en position fixe) qui contient un élément.
 * @param {string} s - Sélecteur d'un élément de la fenêtre
 * @returns {Promise<string>} Sélecteur de la fenêtre
 */
async function dlg(s) {
  await p.evaluate(s => { document.getElementById('guide-dlg')?.removeAttribute('id'); let e = document.querySelector(s);
    while (e && e.parentElement && getComputedStyle(e.parentElement).position !== 'fixed') e = e.parentElement; if (e) e.id = 'guide-dlg'; }, s);
  return '#guide-dlg';
}
const unmark = () => p.evaluate(() => document.querySelectorAll('.guide-mark').forEach(x => x.remove()));

/** Capture chaque élément d'une liste isolément (icônes de bouton pour les tableaux du guide).
 * @param {string} prefix - Préfixe des noms de fichiers
 * @param {Array<[string,string]>} list - Paires [suffixe, sélecteur CSS]
 */
async function each(prefix, list) {
  for (const [n, s] of list) {
    const el = await p.$(s);
    if (!el || !(await el.isVisible())) { console.log('  ⚠ ' + prefix + n + ' invisible : ' + s); continue; }
    const b = await el.boundingBox();
    await p.screenshot({ path: path.join(OUT, prefix + n + '.png'), clip: { x: Math.max(0, b.x - 2), y: Math.max(0, b.y - 2), width: b.width + 4, height: b.height + 4 } });
  }
  console.log('✔ ' + prefix + '* (' + list.length + ')');
}

/** Exécute une suite d'actions avec une fenêtre plus haute (menus et fenêtres longs), puis revient à la taille normale.
 * @param {Function} fn - Actions asynchrones
 * @param {number} [h] - Hauteur temporaire
 */
async function tall(fn, h = 1400) { await p.setViewportSize({ width: W, height: h }); await wait(300); HH = h; try { await fn(); } finally { HH = H; await p.setViewportSize({ width: W, height: H }); await wait(300); } }
/** Hauteur courante de la fenêtre (modifiée par tall). */
let HH = H;

/** Ouvre une vue par sa clé de navigation (comme le menu ☰).
 * @param {string} k - Clé ('tree', 'ana:trace'…)
 */
async function view(k) { await p.evaluate(k => capNavOpen(k), k); await wait(600); }
/** Ferme les menus et fenêtres ouverts (Échap, clic neutre). */
async function esc() { await p.keyboard.press('Escape'); await wait(150); }
/** Fait défiler en haut toutes les zones défilantes. */
const top = () => p.evaluate(() => { document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); window.scrollTo(0, 0); });

/** Ouvre l'application, applique le thème Clair, charge le modèle IFE et ses diagrammes. */
async function setup(browser) {
  const ctx = await browser.newContext({ offline: true, viewport: { width: W, height: H }, locale: 'fr-FR' });
  p = await ctx.newPage();
  p.on('pageerror', e => { errs.push(e.message); console.log('  ✖ JS : ' + e.message); });
  p.on('dialog', d => d.accept());
  await p.goto('file://' + PAGE.replace(/\\/g, '/'));
  await p.evaluate(() => applyTheme('light'));
  await wait(300);
}
/** Charge le modèle d'exemple et son .aird (décompressé dans le dossier temporaire). */
async function load() {
  await p.setInputFiles('#capella-file-input', MODEL);
  await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
  const aird = path.join(os.tmpdir(), 'In-Flight_Entertainment_System.aird');
  fs.writeFileSync(aird, zlib.gunzipSync(fs.readFileSync(AIRD_GZ)));
  await view('diag');
  await p.setInputFiles('#cdg-fichier', aird);
  await p.waitForFunction(() => document.querySelectorAll('#diag-liste li[data-diag]').length > 10, null, { timeout: 60000 });
  await view('home');
}

/** Parties du guide : chacune enregistre ses captures. */
const PARTS = {};

/* @@PARTIES@@ */
/** Identifiant d'un élément par son nom (et sa couche, facultative).
 * @param {string} name - Nom
 * @param {string} [layer] - Couche (OA, SA, LA, PA)
 */
const idOf = (name, layer) => p.evaluate(([n, l]) => (capAllElements.find(e => e.attrs.name === n && (!l || e.layer === l)) || {}).id, [name, layer]);
/** Écran d'accueil (avant chargement). */
PARTS.accueil = async () => {
  await shot('00-ecran-accueil');
  await marks(['#cw-start', '#cw-browse', '#cw-folder', '#cw-projet', '#cw-help-link', '#cw-tour-link', '#cw-about-link']);
  await shot('00-ecran-accueil-reperes', { sel: ['#cw-start', '#cap-drop-zone'], pad: 24 });
  await unmark();
};

/** 🗺 Relation Map. */
PARTS.rm = async () => {
  await p.click('#mode-rm'); await wait(500);
  const id = await idOf('Cabin Terminal', 'LA') || await idOf('Cabin Terminal');
  await p.evaluate(id => setCtx(id), id); await wait(1200);
  await shot('10-rm-vue-ensemble');
  await shot('10-rm-barre2', { sel: ['#toolbar2', '#rm-tabs'], pad: 0 });
  await each('10-rm-btn-', [['zi', '#b-zi'], ['zo', '#b-zo'], ['fit', '#b-fit'], ['filtres', '#b-filters'], ['ea', '#b-ea'], ['ca', '#b-ca'],
    ['prof', '#rm-tb-depth'], ['lay', '#b-lay-wrap'], ['num', '#b-num'], ['leg', '#b-leg'], ['rln', '#b-rln'], ['cut', '#b-cut'],
    ['single', '#b-single'], ['compact', '#b-compact'], ['exp', '#b-exp-wrap'], ['tabadd', '#rm-tab-add-wrap'], ['vsave', '#rm-view-save'], ['vload', '#rm-view-load']]);
  // Tiroir des filtres
  await p.click('#b-filters'); await wait(500);
  await shot('10-rm-filtres', { sel: '#rm-filters', pad: 4 });
  await p.click('#rm-filters-close').catch(() => {}); await wait(200);
  // Menus disposition, export, nouvelle vue
  await p.click('#b-lay-menu'); await wait(250); await shot('10-rm-menu-disposition', { sel: ['#b-lay-wrap', '#b-lay-dd'], pad: 6 }); await p.mouse.click(800, 700);
  await p.click('#b-exp-menu'); await wait(250); await shot('10-rm-menu-export', { sel: ['#b-exp-wrap', '#b-exp-dd'], pad: 6 }); await p.mouse.click(800, 700);
  await p.click('#rm-tab-add'); await wait(250); await shot('10-rm-menu-nouvelle-vue', { sel: ['#rm-tab-add-wrap', '#rm-tab-add-dd'], pad: 6 }); await p.mouse.click(800, 700);
  // Panneau gauche (arborescence)
  await shot('10-rm-panneau-gauche', { sel: '#panel', pad: 0 });
  // Clic droit sur un nœud
  const n = await p.$$('#g-nodes g rect[fill="transparent"]');
  if (n[1]) { await n[1].click({ button: 'right' }); await wait(300); await shot('10-rm-menu-contextuel', { sel: '#ctxmenu', pad: 60 }); }
  await p.click('#cx-detail').catch(() => {}); await wait(500);
  await shot('10-rm-detail', { sel: ['#rm-detail'], pad: 0 });
  await p.click('#rm-detail-close').catch(() => {});
  // Survol d'un nœud : infobulle + voisins en évidence
  if (n[2]) { await n[2].hover(); await wait(400); await shot('10-rm-survol'); await p.mouse.move(5, 5); }
  // Barre d'état et légende
  await shot('10-rm-barre-etat', { sel: '#infobar', pad: 0 });
  await shot('10-rm-legende', { sel: '#legend', pad: 4 });
  // Vues en onglets : préréglage Interfaces
  await p.click('#rm-tab-add'); await wait(250);
  const pre = await p.$$('#rm-tab-add-dd [data-preset], #rm-tab-add-dd button, #rm-tab-add-dd div[data-k]');
  if (pre.length > 3) { await pre[pre.length - 2].click(); await wait(1200); }
  await shot('10-rm-onglets', { sel: '#rm-tabs', pad: 0 });
  await p.evaluate(() => document.querySelector('#b-lay-dd [data-lay="radial"], #b-lay-dd [data-v="radial"]')?.click()); await wait(1000);
  // Vue chaîne
  await p.evaluate(() => { const c = capComputeChains().find(c => c.graph && c.graph.nodes.length > 4); capShowChainInMap(c); }); await wait(1500);
  await shot('10-rm-vue-chaine');
  await p.click('#rm-chain-close').catch(() => {});
};

/** ▤ Tableau. */
PARTS.tableau = async () => {
  await view('table'); await top();
  await shot('20-tableau-vue');
  await shot('20-tableau-barre', { sel: ['#cap-table-tabs', '#cap-table-toolbar'], pad: 2 });
  const tbs = await p.$$eval('#cap-table-toolbar > *', l => l.length);
  await marks(Array.from({ length: tbs }, (_, i) => `#cap-table-toolbar > :nth-child(${i + 1})`), 'tr');
  await shot('20-tableau-barre-reperes', { sel: ['#cap-table-tabs', '#cap-table-toolbar'], pad: 8 }); await unmark();
  // Barre latérale des types
  await shot('20-tableau-types', { sel: '#cap-sidebar', pad: 0, maxH: 520 });
  // Menu ⊞ Colonnes (avec recherche « rel » pour voir les relations)
  await p.click('#cap-table-toolbar >> text=⊞ Colonnes'); await wait(300);
  await tall(async () => { await shot('20-tableau-menu-colonnes', { sel: '.cap-colpicker-menu.open', pad: 4 }); }, 1300);
  await p.fill('.cap-colpicker-menu.open input', 'fonction'); await wait(300);
  await shot('20-tableau-menu-colonnes-relations', { sel: '.cap-colpicker-menu.open', pad: 4 });
  await p.fill('.cap-colpicker-menu.open input', ''); await p.mouse.click(1000, 880); await wait(200);
  // ✨ Colonne par chemin : Logical Component → fonctions allouées
  await p.click('#cap-table-toolbar >> text=✨ Colonne par chemin'); await wait(500);
  await p.evaluate(() => { const s = document.querySelector('#cap-customcol-steps select'); s.value = 'LogicalComponent'; s.dispatchEvent(new Event('change')); });
  await wait(300);
  await p.evaluate(() => { const s = document.querySelectorAll('#cap-customcol-steps select')[1]; const o = [...s.options].find(o => /fonction \(réalise\)/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); } });
  await wait(300);
  await p.click('#cap-customcol-addstep'); await wait(300);
  await p.evaluate(() => { const l = document.querySelectorAll('#cap-customcol-steps .cap-step-row'); const s = l[l.length - 1].querySelector('select'); const o = [...s.options].find(o => /^Name\b|Nom/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); } });
  await wait(500);
  await shot('20-tableau-colonne-chemin', { sel: '#cap-customcol-panel', pad: 0 });
  await p.click('#cap-customcol-close'); await wait(400);
  // 🎯 Portée
  await p.click('#cap-table-toolbar >> text=🎯 Portée'); await wait(400);
  await p.locator('.cap-sc-row input').nth(3).check().catch(() => {}); await wait(300);
  await shot('20-tableau-portee', { sel: '#cap-scope-ov .cw-d, #cap-scope-ov > div', pad: 2 });
  await p.click('#cap-scope-ov [data-c="clr"]').catch(() => {}); await p.click('#cap-scope-ov .cw-d-ftr [data-c="x"]').catch(() => {}); await wait(200);
  // 🌳 Arbre et son menu
  await p.click('#cap-table-toolbar >> text=🌳 Arbre'); await wait(400);
  await p.click('#cap-table-toolbar button[title^="Options de l\'arbre"]'); await wait(300);
  await shot('20-tableau-menu-arbre', { sel: ['.cap-tmenu'], pad: 40 });
  await p.click('.cap-tmenu >> text=⊞ Tout déplier'); await wait(500);
  await shot('20-tableau-arbre', { clip: { x: 240, y: 40, width: 1360, height: 560 } });
  await p.click('#cap-table-toolbar >> text=☰ Lignes'); await wait(400);
  // Tri + filtre de colonne
  await p.click('#cap-table-head tr:first-child th:nth-child(1)'); await wait(300);
  await p.fill('#cap-table-head input >> nth=0', 'Cabin'); await wait(500);
  await shot('20-tableau-tri-filtre', { clip: { x: 240, y: 40, width: 1360, height: 420 } });
  // Sélection de cellules et pastille 📋
  const c1 = await p.$('#cap-table-body tr:nth-child(1) td:nth-child(1)'), c2 = await p.$('#cap-table-body tr:nth-child(4) td:nth-child(3)');
  if (c1 && c2) { const a = await c1.boundingBox(), b = await c2.boundingBox();
    await p.mouse.move(a.x + 20, a.y + 8); await p.mouse.down(); await p.mouse.move(b.x + 20, b.y + 8, { steps: 5 }); await p.mouse.up(); await wait(300);
    await shot('20-tableau-selection', { sel: ['#cap-table-body tr:nth-child(1)', '#cap-table-body tr:nth-child(6)', '#cap-cs-pill'], pad: 10 }); }
  await esc();
  await p.fill('#cap-table-head input >> nth=0', ''); await p.click('#cap-table-head tr:first-child th:nth-child(1)'); await p.click('#cap-table-head tr:first-child th:nth-child(1)');
  // Nouvel onglet
  await p.click('#cap-table-tabs .cap-ttab-add'); await wait(400);
  await shot('20-tableau-onglets', { sel: '#cap-table-tabs', pad: 2 });
  await p.click('#cap-table-tabs .cap-ttab');
};

/** 🧭 Explorateur et 🔗 Liens. */
PARTS.explorateur = async () => {
  await view('tree'); await top();
  await p.fill('#cap-view-tree input[type=search], #cap-view-tree input', 'Seat').catch(() => {}); await wait(600);
  await shot('30-explorateur-arborescence');
  await p.fill('#cap-view-tree input[type=search], #cap-view-tree input', '').catch(() => {});
  await view('cards'); await top(); await shot('30-explorateur-cartes');
  await view('index'); await top(); await shot('30-explorateur-index');
  await view('links'); await top(); await shot('31-liens');
};

/** ⚡ Chaînes. */
PARTS.chaines = async () => {
  await view('chains'); await top();
  await shot('40-chaines-vue');
  await shot('40-chaines-barre', { sel: '#cap-view-chains > :first-child', pad: 2, maxH: 260 });
  const card = p.locator('#cap-view-chains .cap-chain-card', { hasText: 'Watch Imposed Video' }).first();
  await card.locator('.cap-chain-hdr').click(); await wait(800);
  await p.evaluate(() => { const c = [...document.querySelectorAll('#cap-view-chains .cap-chain-card')].find(c => /Watch Imposed Video/.test(c.textContent)); c.id = 'guide-card'; c.scrollIntoView(); });
  await wait(300);
  await tall(async () => { await p.evaluate(() => document.getElementById('guide-card').scrollIntoView()); await wait(300); await shot('40-chaines-carte', { sel: '#guide-card', pad: 4 }); }, 1500);
  await top();
  await p.click('#cap-view-chains >> text=🗺 Vue Relation Map'); await wait(1500);
  await shot('40-chaines-vue-rm');
  await p.click('#cap-view-chains >> text=▦ Diagrammes'); await wait(500);
};

/** Vues de 📡 Flux & interfaces : vue par défaut, barre annotée, chaque présentation. */
PARTS.flux = async () => {
  for (const [k, nom] of [['fex', '50-fex'], ['oav', '51-oav'], ['csys', '52-csys'], ['cblk', '53-cblk'], ['compex', '54-compex'], ['physlink', '55-physlink'], ['ports', '56-ports'], ['scen', '57-scen']]) {
    await view(k); await top(); await wait(400);
    await shot(nom + '-vue');
    const n = await p.locator(`#cap-view-${k} .phl-toggle-btn:visible`).count();
    for (let i = 1; i < n; i++) {
      const b = p.locator(`#cap-view-${k} .phl-toggle-btn:visible`).nth(i);
      const lab = ((await b.textContent()) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 20);
      await b.click(); await wait(700); await top();
      await shot(nom + '-' + lab);
    }
    if (n) { await p.locator(`#cap-view-${k} .phl-toggle-btn:visible`).nth(0).click(); await wait(500); }
  }
};

/** 🔲 Diagrammes Capella. */
PARTS.diagrammes = async () => {
  await view('diag'); await top();
  await shot('60-diag-liste');
  await p.selectOption('#cap-view-diag select', { index: 1 }).catch(() => {}); await wait(400);
  await shot('60-diag-classement', { sel: '#cap-view-diag select', pad: 120, maxH: 400 });
  await p.selectOption('#cap-view-diag select', { index: 0 }).catch(() => {});
  await p.evaluate(() => { const r = capDiagReps().find(x => /\[LAB\] Cabin|\[LAB\]/.test(x.nom) && x.genre !== 'tableau') || capDiagReps().find(x => x.genre !== 'tableau'); capDiagOpen(r.uid); });
  await wait(2500);
  await shot('60-diag-ouvert');
  await shot('60-diag-barres', { sel: ['#cap-view-diag .cdg-vd-barre, #cap-view-diag .vd-barre, #cap-view-diag [class*=barre]'], pad: 2, maxH: 120 });
  // Clic sur un élément du diagramme → panneau de détail
  const el = await p.$('#vd-svg .vd-f[data-sem]');
  if (el) { const b = await el.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + 8); await wait(800); await shot('60-diag-clic-detail'); }
  await esc();
  // Export groupé
  await p.click('#cap-view-diag >> text=⬇ Exporter…'); await wait(800);
  await tall(async () => { await shot('60-diag-export', { sel: await dlg('.cdg-x-corps'), pad: 2 }); }, 1200);
  await p.locator('#guide-dlg button', { hasText: 'Fermer' }).first().click().catch(() => {}); await wait(300);
  await p.click('#cap-view-diag >> text=ℹ Infos').catch(() => {}); await wait(800);
  await shot('60-diag-infos');
};

/** 🔬 Analyses : chaque onglet et chaque présentation. */
PARTS.analyses = async () => {
  for (const k of ['trace', 'caps', 'states', 'diff', 'reqs', 'pvmt', 'data', 'cts']) {
    await view('ana:' + k); await top(); await wait(500);
    await shot('70-ana-' + k);
    const subs = { trace: ['Chemins de traçabilité', 'Liens ('], caps: ['▦ Matrice', '🩺 Contrôles'], states: ['Fonctions × états', '🩺 Contrôles'],
      data: ['🔌 Interfaces', 'Classes & types', '🩺 Contrôles'], cts: ['🩺 Contrôles'], reqs: [], pvmt: [], diff: [] }[k];
    for (const t of subs) {
      const b = p.locator('#cap-view-analyses button:visible', { hasText: t }).first();
      if (!(await b.count())) { console.log('  ⚠ ' + k + ' : ' + t + ' absent'); continue; }
      const lab = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 20);
      await b.click(); await wait(900); await top();
      await shot('70-ana-' + k + '-' + lab);
    }
  }
};

/** ƒ Fonctions. */
PARTS.fonctions = async () => {
  await view('functions'); await top(); await wait(500);
  for (const v of ['tree', 'table', 'trace', 'metrics', 'checks']) {
    await p.click(`#cap-view-functions [data-fv="${v}"]`); await wait(900); await top();
    await shot('71-fn-' + v);
  }
  await p.click('#cap-view-functions [data-fv="tree"]'); await wait(600);
  const f = await p.$('#cap-view-functions [data-fid], #cap-view-functions .lf-node, #cap-view-functions li');
  if (f) { await f.click(); await wait(600); await shot('71-fn-tree-fiche'); }
  await p.click('#cap-view-functions [data-fv="table"]'); await wait(700);
  const dd = await p.$('#cap-view-functions th .lf-dd, #cap-view-functions th [title*="Filtrer par valeurs"], #cap-view-functions th button');
  if (dd) { await dd.click(); await wait(400); await shot('71-fn-table-filtre-valeurs', { clip: { x: 0, y: 40, width: 1000, height: 600 } }); await esc(); }
};

/** 📐 Tableau de bord. */
PARTS.tableaubord = async () => {
  await view('dashboard'); await top(); await wait(800);
  await shot('80-dash-vue');
  await p.click('#dash-edit'); await wait(500);
  await shot('80-dash-edition');
  await p.click('#dash-add'); await wait(800);
  await p.locator('.dash-cat-g', { hasText: /Fonctions SA/i }).first().click().catch(() => {}); await wait(300);
  await p.locator('.dash-cat-i').nth(1).click().catch(() => {}); await wait(600);
  await shot('80-dash-catalogue', { sel: '.dash-dlg', pad: 2 });
  await esc(); await p.mouse.click(5, 890);
  await p.click('#dash-edit').catch(() => {}); await wait(300);
};

/** Copie modifiée du modèle d'exemple (renommage, description, suppression) pour ⚖ Comparaison et 🔄 mise à jour.
 * @returns {string} Chemin du fichier
 */
function modelV2() {
  const f = path.join(os.tmpdir(), 'In-Flight_Entertainment_System-v2.capella');
  let t = fs.readFileSync(MODEL, 'utf8');
  t = t.replace(/name="Cabin Terminal"/, 'name="Cabin Terminal Unit"').replace(/name="Media Server"/, 'name="Media Server (MS)"');
  t = t.replace(/name="Play Sound in Cabin"/, 'name="Play Sound in Cabin Area"');
  fs.writeFileSync(f, t); return f;
}

/** ⚖ Comparaison de versions et 🔄 Suivi (mise à jour). */
PARTS.comparaison = async () => {
  await view('ana:diff'); await top();
  await p.setInputFiles('#ana-df-file', modelV2()); await wait(4000);
  await shot('72-diff-rapport');
  await shot('72-diff-barre', { sel: '#cap-view-analyses .ana-diff-bar, #cap-view-analyses .tb-grp', pad: 4, maxH: 200 });
  // Mise à jour du modèle : notification, puis delta avant validation
  const fc = p.waitForEvent('filechooser');
  await p.evaluate(() => { window.showOpenFilePicker = undefined; capWatchPickNewVersion(); });
  await (await fc).setFiles(modelV2()); await wait(3000);
  await shot('73-suivi-notification', { sel: '#cap-watch-note', pad: 4 });
  await p.click('#cap-watch-note [data-cw="delta"]'); await wait(1500);
  await shot('73-suivi-delta');
  await esc(); await p.evaluate(() => { capWatchModalClose(); _capWatch.dismissed = true; capWatchNote(false); }); await wait(300);
  await p.click('#b-cap-watch-main').catch(() => {}); await wait(300);
  await shot('01-menu-suivi', { sel: ['#b-cap-watch', '#cap-watch-dd'], pad: 8 }); await p.mouse.click(800, 880);
};

/** 🔎 Panneau de détail et 💬 Revue. */
PARTS.revue = async () => {
  await view('cblk'); await top();
  const id = await idOf('Cabin Terminal', 'LA');
  await p.evaluate(id => capOpenDetail(id), id); await wait(800);
  await shot('90-detail');
  await shot('90-detail-panneau', { sel: '#cap-detail', pad: 0 });
  // Commentaire depuis le panneau de détail
  await p.click('#cap-detail-content .crv-det-bar button'); await wait(500);
  await p.fill('#crv-ed-text', 'Le nom ne respecte pas la convention : ajouter le préfixe du sous-système.');
  await p.locator('#crv-ov button', { hasText: 'Majeure' }).first().click().catch(() => {});
  await p.locator('#crv-ov button', { hasText: 'Erreur' }).first().click().catch(() => {});
  await p.fill('#crv-ov input[placeholder="Votre nom"]', 'R. Lescole').catch(() => {});
  await shot('91-revue-editeur', { sel: '#crv-ov > div', pad: 2 });
  await p.click('#crv-ov [data-ok]'); await wait(500);
  // Note sur un diagramme
  await view('diag');
  await p.evaluate(() => { const r = capDiagReps().find(x => /\[LAB\]/.test(x.nom)) || capDiagReps().find(x => x.genre !== 'tableau'); capDiagOpen(r.uid); }); await wait(2500);
  await p.evaluate(() => { const n = [...document.querySelectorAll('#vd-svg .vd-f[data-sem]')].find(x => capGetElementById_(x.getAttribute('data-sem')) && x.getBoundingClientRect().width > 60);
    const r = n.getBoundingClientRect(); capRevDiagNoteAt(r.left + r.width + 30, r.top, n.getAttribute('data-sem')); });
  await p.fill('#crv-ed-text', 'Vérifier l\'allocation de cette fonction.'); await p.click('#crv-ov [data-ok]'); await wait(800);
  await shot('92-revue-note-diagramme');
  // Panneau de revue : onglets
  for (const t of ['list', 'check', 'report', 'cfg']) { await p.evaluate(k => capRevToggle(true, k), t); await wait(600); await shot('93-revue-panneau-' + t, { sel: '#crv-panel', pad: 0 }); }
  // 💾 Revue ▾ et 📤 Revue ciblée
  await p.evaluate(() => capRevToggle(true, 'list')); await wait(300);
  const m = p.locator('#crv-panel button', { hasText: 'Revue' }).first();
  if (await m.count()) { await m.click(); await wait(300); await shot('93-revue-menu', { sel: ['#crv-panel'], pad: 0, maxH: 320 }); await esc(); }
  await p.evaluate(() => capRevCibleeDialog({})); await wait(600);
  await shot('94-revue-ciblee', { sel: await dlg('#crv-rc-titre'), pad: 2 });
  await p.click('#crv-ov [data-x]').catch(() => {}); await wait(300);
  await p.evaluate(() => capRevToggle(false)); await wait(300);
  // Clic droit sur un élément du diagramme
  const el = (await p.$$('#vd-svg .vd-f[data-sem]'))[3];
  if (el) { const b = await el.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + 10, { button: 'right' }); await wait(400);
    await shot('95-revue-clic-droit', { sel: ['#crv-ctx'], pad: 40 }); await p.mouse.click(5, 890); }
};

/** 🏠 Accueil du projet : check-lists, plans de revue, tableaux blancs. */
PARTS.home = async () => {
  await view('home'); await top();
  await shot('05-home-projet');
  await p.locator('#cap-view-home button:visible', { hasText: 'Check-lists & plans' }).first().click(); await wait(500);
  await p.selectOption('#cap-view-home [data-new="list"]', { index: 2 }); await wait(600);
  await p.locator('#cap-view-home .hm-item input[type=checkbox]').nth(0).check(); await p.locator('#cap-view-home .hm-item input[type=checkbox]').nth(1).check(); await wait(300);
  await shot('05-home-checklist');
  await p.selectOption('#cap-view-home [data-new="plan"]', { index: 3 }); await wait(600);
  await shot('05-home-plan');
  await p.locator('#cap-view-home button:visible', { hasText: 'Tableaux blancs' }).first().click(); await wait(500);
  await p.locator('#cap-view-home button', { hasText: 'Texte' }).first().click().catch(() => {}); await wait(500);
  await p.keyboard.type('Points à revoir avec l\'équipe système'); await wait(300);
  await shot('05-home-tableau-blanc');
};

/** Thème personnalisé, interface et vues, À propos, aide, visites guidées. */
PARTS.divers = async () => {
  await p.evaluate(() => capThemeEditor()); await wait(600);
  await tall(async () => { await shot('95-theme-perso', { sel: await dlg('#thm-ok'), pad: 2 }); }, 1200);
  await p.click('#thm-cancel').catch(() => {});
  await p.evaluate(() => applyTheme('light'));
  await p.evaluate(() => capCfgDialog('save')); await wait(500);
  await shot('96-config-interface', { sel: '#cap-cfg-ov .cw-d-box', pad: 2 });
  await p.locator('#cap-cfg-ov [data-c="x"]').first().click().catch(() => {}); await esc();
  await p.evaluate(() => capAboutOpen()); await wait(500);
  await shot('97-a-propos', { sel: '#cap-about-ov > div', pad: 2 });
  await p.evaluate(() => { document.getElementById('cap-about-ov').style.display = 'none'; openHelpModal(); }); await wait(500);
  await shot('97-aide', { sel: '#help-ov > div', pad: 2 });
  await esc(); await p.evaluate(() => { const h = document.getElementById('help-ov'); if (h) h.style.display = 'none'; });
  await view('fex'); await p.evaluate(() => capTourStartView()); await wait(800);
  await shot('98-visite-vue');
  await esc(); await p.evaluate(() => { if (typeof capTourEnd === 'function') capTourEnd(); }); await wait(300);
  await p.click('#b-help', { force: true }); await wait(300); await shot('01-menu-aide', { sel: ['#b-help', '#cap-nav-dd'], pad: 8 }); await esc();
};

/** 📑 Exigences et 🏷 Propriétés (PVMT) avec le modèle AIDA, qui en contient (à lancer en dernier : remplace le modèle). */
PARTS.aida = async () => {
  const old = p; p = await old.context().newPage(); await old.close();
  p.on('pageerror', e => { errs.push(e.message); console.log('  ✖ JS : ' + e.message); }); p.on('dialog', d => d.accept());
  await p.goto('file://' + PAGE.replace(/\\/g, '/')); await p.evaluate(() => applyTheme('light'));
  await p.setInputFiles('#capella-file-input', path.join(ROOT, 'tests', 'models', 'AIDA.capella'));
  await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 }); await wait(1500);
  for (const [k, subs] of [['reqs', ['▦ Couverture', '🩺 Contrôles']], ['pvmt', ['Σ Synthèse', '📖 Définitions', '🩺 Contrôles']]]) {
    await view('ana:' + k); await top(); await wait(800);
    await shot('70-ana-' + k);
    for (const t of subs) {
      const b = p.locator('#cap-view-analyses button:visible', { hasText: t }).first();
      if (!(await b.count())) { console.log('  ⚠ ' + k + ' : ' + t + ' absent'); continue; }
      const lab = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 20);
      await b.click(); await wait(900); await top();
      await shot('70-ana-' + k + '-' + lab);
    }
  }
};

/** Barre d'outils principale et ses menus. */
PARTS.interface = async () => {
  await view('home'); await top();
  await shot('01-barre-principale', { sel: '#toolbar', pad: 0 });
  const tb = ['#cap-tb-home .tbtn', '#mode-rm', '[data-open="diag"]', '#cap-v-elements', '[data-open="table"]', '#cap-v-flux', '[data-open="chains"]',
    '#cap-v-analyses', '[data-open="dashboard"]', '#cap-nav-cfg', '#b-file-menu', '#b-save-direct', '#b-cap-watch', '#b-review', '#b-theme-menu', '#b-help'];
  await marks(tb, 'tr');
  await shot('01-barre-principale-reperes', { sel: '#toolbar', pad: 2 });
  await unmark();
  // Menus déroulants
  const dd = async (btn, name) => { await p.click(btn); await wait(300); await shot(name, { sel: [btn, '#cap-nav-dd'], pad: 8 }); await esc(); await p.mouse.click(800, 600); await wait(150); };
  await dd('#cap-v-elements .cap-nav-arr', '01-menu-explorateur');
  await dd('#cap-v-flux .cap-nav-arr', '01-menu-flux');
  await dd('#cap-v-analyses .cap-nav-arr', '01-menu-analyses');
  await dd('#b-file-menu', '01-menu-fichier');
  await dd('#b-theme-menu', '01-menu-theme');
  await dd('#b-help', '01-menu-aide');
  await tall(async () => { await p.click('#cap-nav-cfg'); await wait(300); await shot('01-menu-toutes-vues', { sel: ['#cap-nav-cfg', '#cap-nav-dd'], pad: 8 }); await esc(); });
  await p.keyboard.press('Control+K'); await p.keyboard.type('fonc'); await wait(300);
  await shot('01-ctrl-k-recherche', { sel: ['#cap-nav-dd'], pad: 8 }); await esc();
  await p.click('#b-cap-watch-main').catch(() => {}); await wait(300);
  await shot('01-menu-suivi', { sel: ['#b-cap-watch', '#cap-watch-dd'], pad: 8 }); await esc(); await p.mouse.click(800, 600);
};

{ const a = PARTS.aida; delete PARTS.aida; PARTS.aida = a; }   // AIDA en dernier (remplace le modèle d'exemple)

if (require.main === module) (async () => {
  const want = process.argv.slice(2);
  const browser = await chromium.launch();
  await setup(browser);
  for (const [k, fn] of Object.entries(PARTS)) {
    if (k !== 'accueil' && !(await p.evaluate(() => typeof capLoaded !== 'undefined' && capLoaded))) await load();
    if (want.length && !want.includes(k)) continue;
    console.log('— ' + k);
    try { await fn(); } catch (e) { errs.push(k + ' : ' + e.message); console.log('  ✖ ' + k + ' : ' + e.message.split('\n')[0]); }
    await unmark(); await esc(); await esc();
    await p.evaluate(() => { const d = document.getElementById('cap-detail'); if (d) d.style.display = 'none'; });
  }
  await browser.close();
  // Allègement des images (palette de 256 couleurs, ImageMagick facultatif) : les captures d'interface s'y prêtent bien
  try { const { execFileSync } = require('child_process');
    for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.png'))) execFileSync('convert', [path.join(OUT, f), '-colors', '256', 'PNG8:' + path.join(OUT, f)]);
    console.log('✔ Images allégées (PNG 256 couleurs)'); } catch (e) { console.log('ℹ ImageMagick absent : images non allégées'); }
  if (errs.length) { console.error('\n✖ ' + errs.length + ' problème(s) :\n  - ' + errs.join('\n  - ')); process.exit(1); }
  console.log('\n✔ Captures enregistrées dans docs/guide/img/');
})();
