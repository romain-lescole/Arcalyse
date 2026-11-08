#!/usr/bin/env node
'use strict';
/**
 * Captures d'écran du README (docs/captures/*.png) : ouvre dist/arcalyse-fr.html dans Chromium HORS LIGNE, thème Clair, fenêtre
 * 1440 × 860, charge le modèle d'exemple IFE et ses diagrammes (.aird), puis refait chaque capture de la vitrine ; ensuite VehiculeDemo
 * (SysML v2) et les modèles UML / SysML v1 de tests/models/uml. Complète tools/guide-captures.js (captures du guide).
 *
 * Prérequis : node build.js, puis Playwright (npm i -D playwright && npx playwright install chromium).
 * Lancement : node tools/readme-captures.js [nom…]   (sans argument : toutes ; nom = début du fichier, ex. 03 ou 14-revue)
 */
const path = require('path'), fs = require('fs'), zlib = require('zlib'), os = require('os');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright absent : npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'captures');
const PAGE = path.join(ROOT, 'dist', 'arcalyse-fr.html');
const M = path.join(ROOT, 'tests', 'models');
const IFE = path.join(M, 'In-Flight_Entertainment_System.capella');
const W = 1440, H = 860;
let p; const errs = [];
const wait = ms => p.waitForTimeout(ms);

/** Enregistre la fenêtre entière. @param {string} nom - Nom du fichier sans extension */
async function shot(nom) { await p.screenshot({ path: path.join(OUT, nom + '.png') }); console.log('✔ ' + nom); }
/** Ouvre une vue par sa clé (`capNavOpen`). @param {string} k - Clé */
async function vue(k) { await p.evaluate(k => capNavOpen(k), k); await wait(700); await p.evaluate(() => { document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); }); }
/** Ferme le panneau de détail et les fenêtres ouvertes. */
async function propre() { await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.evaluate(() => { const d = document.getElementById('cap-detail'); if (d) d.style.display = 'none'; if (typeof capRevToggle === 'function') capRevToggle(false); }); await wait(200); }
/** Identifiant d'un élément Capella par son nom (et sa couche). @param {string} n - Nom @param {string} [l] - Couche */
const idOf = (n, l) => p.evaluate(([n, l]) => (capAllElements.find(e => e.attrs.name === n && (!l || e.layer === l)) || {}).id, [n, l]);
/** Charge un fichier modèle par le sélecteur de l'accueil, remplacement accepté. @param {string} f - Chemin @param {Function} pret - Condition de fin */
async function charger(f, pret) {
  await p.setInputFiles('#capella-file-input', f); await wait(400);
  await p.click('#cap-replace-ov [data-c="go"]').catch(() => {});
  await p.waitForFunction(pret, null, { timeout: 180000 }); await wait(800);
}

/** Copie modifiée d'IFE (renommage) pour 🔄 la mise à jour du modèle. @returns {string} Chemin */
function modelV2(id) {
  const d = path.join(os.tmpdir(), 'arcalyse-readme-v2'); fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, 'In-Flight_Entertainment_System.capella');
  fs.writeFileSync(f, fs.readFileSync(IFE, 'utf8').replace(new RegExp('<[^>]*id="' + id + '"[^>]*>'), t => t.replace('name="Cabin Terminal"', 'name="Cabin Terminal Unit"'))); return f;
}

/** Captures, dans l'ordre (nom → geste). */
const C = [
  ['00-accueil', async () => { await vue('home'); }],
  ['01-relation-map', async () => { await vue('@rm'); const id = await idOf('Cabin Terminal', 'LA'); await p.evaluate(id => setCtx(id), id); await wait(1500); }],
  ['02-chaines', async () => {
    await vue('chains');
    await p.locator('#cap-view-chains .cap-chain-card', { hasText: 'Watch Imposed Video' }).first().locator('.cap-chain-hdr').click(); await wait(800);
    await p.evaluate(() => { const c = [...document.querySelectorAll('#cap-view-chains .cap-chain-card')].find(c => /Watch Imposed Video/.test(c.textContent)); if (c) c.scrollIntoView({ block: 'start' }); }); await wait(400); }],
  ['03-functional-exchange', async () => { await vue('fex'); }],
  ['04-logical-component', async () => { await vue('cblk'); }],
  ['05-scenarios', async () => { await vue('scen'); await wait(800); }],
  ['06-fonctions', async () => { await vue('functions'); await wait(600); }],
  ['07-tracabilite', async () => { await vue('ana:trace'); await wait(800); }],
  ['08-tableau-de-bord', async () => { await vue('dashboard'); await wait(1200); }],
  ['09-physical-link', async () => { await vue('physlink'); }],
  ['10-colonne-par-chemin', async () => {
    await vue('table');
    await p.click('#cap-table-toolbar >> text=✨ Colonne par chemin'); await wait(500);
    await p.evaluate(() => { const s = document.querySelector('#cap-customcol-steps select'); s.value = 'LogicalComponent'; s.dispatchEvent(new Event('change')); }); await wait(300);
    await p.evaluate(() => { const s = document.querySelectorAll('#cap-customcol-steps select')[1]; const o = [...s.options].find(o => /fonction \(réalise\)/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); } }); await wait(300);
    await p.click('#cap-customcol-addstep'); await wait(300);
    await p.evaluate(() => { const l = document.querySelectorAll('#cap-customcol-steps .cap-step-row'); const s = l[l.length - 1].querySelector('select'); const o = [...s.options].find(o => /^Name\b|Nom/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); } });
    await wait(700); }, async () => { await p.click('#cap-customcol-close').catch(() => {}); }],
  ['11-diagrammes', async () => {
    await vue('diag');
    await p.evaluate(() => { const r = capDiagReps().find(x => /\[LAB\]/.test(x.nom) && x.genre !== 'tableau') || capDiagReps().find(x => x.genre !== 'tableau'); capDiagOpen(r.uid); }); await wait(2500); }],
  ['12-diagrammes-export', async () => { await p.click('#cap-view-diag >> text=⬇ Exporter…'); await wait(1000); },
    async () => { await p.keyboard.press('Escape'); await p.evaluate(() => { const o = document.getElementById('cdg-export-ov'); if (o) o.style.display = 'none'; }); }],
  ['13-diagrammes-detail', async () => {
    const el = (await p.$$('#vd-svg .vd-f[data-sem]')).find(Boolean);
    const all = await p.$$('#vd-svg .vd-f[data-sem]'); const t = all[Math.min(4, all.length - 1)] || el;
    if (t) { const b = await t.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + 8); await wait(1000); } }],
  ['14-revue', async () => {
    await propre();
    await p.evaluate(() => { const n = [...document.querySelectorAll('#vd-svg .vd-f[data-sem]')].find(x => capGetElementById_(x.getAttribute('data-sem')) && x.getBoundingClientRect().width > 60);
      const r = n.getBoundingClientRect(); capRevDiagNoteAt(r.left + r.width + 30, r.top, n.getAttribute('data-sem')); });
    await p.fill('#crv-ed-text', 'Vérifier l\'allocation de cette fonction.'); await p.click('#crv-ov [data-ok]'); await wait(800);
    await p.evaluate(() => capRevToggle(true, 'list')); await wait(800); }],
  ['15-revue-verifier', async () => {
    await p.evaluate(() => capRevToggle(false));
    await vue('cblk'); const id = await idOf('Cabin Terminal', 'LA'); await p.evaluate(id => capOpenDetail(id), id); await wait(600);
    await p.evaluate(id => capRevNew([{ id, field: '' }]), id); await wait(400);
    await p.fill('#crv-ed-text', 'Le nom ne respecte pas la convention : ajouter le préfixe du sous-système.');
    await p.click('#crv-ov [data-ok]'); await wait(400); await propre();
    const fc = p.waitForEvent('filechooser');
    await p.evaluate(() => { window.showOpenFilePicker = undefined; capWatchPickNewVersion(); });
    await (await fc).setFiles(modelV2(id)); await wait(3000);
    await p.evaluate(() => capWatchApply()); await wait(4000);
    await p.click('#cap-replace-ov [data-c="go"]').catch(() => {}); await wait(500);
    await p.click('#cdg-maj-ov [data-c="garder"]', { timeout: 3000 }).catch(() => {}); await wait(300);
    await vue('cblk'); await p.evaluate(() => capRevToggle(true, 'check')); await wait(1000); }],
  ['16-description', async () => {
    await p.evaluate(() => capRevToggle(false)); await vue('functions');
    const id = await p.evaluate(() => { const e = capAllElements.find(e => /<a |<b>|<ul>/.test(e.attrs.description || '') && /Function/.test(e.typeName || e.type || '')) || capAllElements.find(e => (e.attrs.description || '').length > 200); return e && e.id; });
    await p.evaluate(id => { _capNav.det = 'fiche'; capOpenDetail(id); }, id); await wait(1000); }],
  ['17-sante-modele', async () => { await propre(); await vue('ana:sante'); await wait(1500); }],
  ['18-deploiement', async () => { await vue('ana:deploy'); await wait(800); }],
  ['19-scripts', async () => {
    await vue('cards');
    await p.evaluate(() => { const ex = capScrApi().exemples(); const e = ex.find(x => /sant|health/i.test(x.cle + ' ' + (x.nom || ''))) || ex.find(x => x.cle === 'non-allouees') || ex[0];
      capScrToggle(true); document.getElementById('scr-code').value = e.code; _capScr.choix = 'ex:' + e.cle; capScrListe(); capScrExecuter(); });
    await p.waitForFunction(() => !_capScr.enCours, null, { timeout: 60000 }); await wait(600);
    await p.evaluate(() => { const c = document.getElementById('scr-code'); c.scrollTop = 0; c.blur(); }); }, async () => { await p.evaluate(() => capScrToggle(false)); }],
  // ── SysML v2 ──
  ['20-sysml-vues', async () => {
    await charger(path.join(M, 'VehiculeDemo.sysml'), () => typeof _capSysml !== 'undefined' && _capSysml.lecture && capLoaded);
    await p.evaluate(() => { _capSyVues.mode = 'visuel'; }); await vue('diag');
    await p.evaluate(() => { const r = capDiagReps().find(x => /GV|générale/i.test((x.sigle || '') + ' ' + (x.nom || ''))) || capDiagReps()[0]; capDiagOuvrirUid(r.uid); }); await wait(1500);
    const g = await p.$('#cdg-sy svg.sy-vue-svg [data-sem]'); if (g) { const b = await g.boundingBox(); await p.mouse.click(b.x + Math.min(30, b.width / 2), b.y + 10); await wait(800); } }],
  ['21-sysml-elements', async () => { await propre(); await p.evaluate(() => { _capSy.view = 'els'; }); await vue('ana:sysml'); await wait(800); }],
  // ── UML / SysML v1 ──
  ['22-uml-diagnostics', async () => {
    await charger(path.join(M, 'uml', 'Satellite-sysml1.xmi'), () => typeof _capSysml !== 'undefined' && _capSysml.lecture && _capSysml.format === 'sysml1' && capLoaded);
    await p.evaluate(() => { _capSy.view = 'diag'; }); await vue('ana:uml');
    await p.click('#ana-box [data-hold="uml"] [data-umlfiche]').catch(() => {}); await wait(500); await p.evaluate(() => { const t = document.getElementById('cap-watch-flash'); if (t) t.remove(); }); }],
  ['23-uml-etats', async () => {
    await charger(path.join(M, 'uml', 'Ascenseur-uml.xmi'), () => typeof _capSysml !== 'undefined' && _capSysml.lecture && capLoaded);
    await vue('ana:umlstm');
    await p.click('#ana-box [data-hold="umlstm"] tr.ud-ap-ligne td:nth-child(3)').catch(() => {}); await wait(800); await p.evaluate(() => { const t = document.getElementById('cap-watch-flash'); if (t) t.remove(); }); }]
];

(async () => {
  const want = process.argv.slice(2);
  const exe = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ offline: true, viewport: { width: W, height: H }, locale: 'fr-FR' });
  p = await ctx.newPage();
  p.on('pageerror', e => { errs.push(e.message); console.log('  ✖ JS : ' + e.message); });
  p.on('dialog', d => d.accept());
  await p.goto('file://' + PAGE.replace(/\\/g, '/'));
  await p.evaluate(() => { applyTheme('light'); if (typeof _capDlgAuto !== 'undefined') _capDlgAuto = 'ok'; }); await wait(300);
  await charger(IFE, () => typeof capLoaded !== 'undefined' && capLoaded);
  const aird = path.join(os.tmpdir(), 'In-Flight_Entertainment_System.aird');
  fs.writeFileSync(aird, zlib.gunzipSync(fs.readFileSync(IFE.replace(/\.capella$/, '.aird.gz'))));
  await vue('diag'); await p.setInputFiles('#cdg-fichier', aird);
  await p.waitForFunction(() => document.querySelectorAll('#diag-liste li[data-diag]').length > 10, null, { timeout: 60000 });
  for (const [nom, geste, apres] of C) {
    const fait = !want.length || want.some(w => nom.startsWith(w));
    try {
      await geste();   // les gestes s'enchaînent (état commun) : même une capture non demandée prépare la suivante
      if (fait) await shot(nom);
      if (apres) await apres();
    } catch (e) { errs.push(nom + ' : ' + e.message.split('\n')[0]); console.log('  ✖ ' + nom + ' : ' + e.message.split('\n')[0]); }
  }
  await browser.close();
  try { const { execFileSync } = require('child_process');
    for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.png'))) execFileSync('convert', [path.join(OUT, f), '-colors', '256', 'PNG8:' + path.join(OUT, f)]);
    console.log('✔ Images allégées (PNG 256 couleurs)'); } catch (e) { console.log('ℹ ImageMagick absent : images non allégées'); }
  if (errs.length) { console.error('\n✖ ' + errs.length + ' problème(s) :\n  - ' + errs.join('\n  - ')); process.exit(1); }
  console.log('\n✔ Captures enregistrées dans docs/captures/');
})();
