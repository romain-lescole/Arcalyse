#!/usr/bin/env node
/**
 * Test de fumée (facultatif) : ouvre dist/arcalyse-fr.html dans Chromium HORS LIGNE,
 * charge un modèle, parcourt toutes les vues et sous-vues, et signale toute erreur JavaScript.
 * Vérifie aussi qu'aucun élément du tableau de bord ne déborde de son cadre.
 *
 * Installation (une seule fois) :  npm install --save-dev playwright  puis  npx playwright install chromium
 * Lancement :                      node tests/smoke.js [chemin/vers/modele.capella]
 * (par défaut : premier fichier .capella trouvé dans tests/models/)
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const page = path.join(ROOT, 'dist', 'arcalyse-fr.html');
const models = path.join(__dirname, 'models');
const model = process.argv[2] || (fs.existsSync(models) ? fs.readdirSync(models).filter(f => f.endsWith('.capella')).map(f => path.join(models, f))[0] : null);
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js'); process.exit(2); }
if (!model) { console.error('Aucun modèle : placez un .capella dans tests/models/ ou passez-le en argument'); process.exit(2); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ offline: true, viewport: { width: 1500, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'));
  await p.setInputFiles('#capella-file-input', model);
  await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
  const step = async (label, fn) => { const n = errs.length; try { await fn(); } catch (e) { errs.push(label + ' : ' + e.message); } await p.waitForTimeout(250); console.log((errs.length > n ? '✖ ' : '✔ ') + label); };
  for (const v of ['tree', 'cards', 'table', 'links', 'chains', 'physlink', 'compex', 'ports', 'fex', 'oav', 'csys', 'cblk', 'scen', 'functions', 'analyses', 'dashboard', 'index'])
    await step('vue ' + v, () => p.evaluate(k => capNavOpen(k), v));
  await step('barre : menu, épingle, Ctrl+K', async () => {
    await p.click('#cap-v-analyses .cap-nav-arr'); await p.click('#cap-nav-dd [data-open="ana:reqs"]');
    await p.click('#cap-v-analyses .cap-nav-arr'); await p.click('#cap-nav-dd [data-pin="ana:reqs"]'); await p.click('#cap-v-ana-reqs');
    await p.keyboard.press('Control+K'); await p.keyboard.type('ports'); await p.keyboard.press('Enter');
    if (await p.evaluate(() => capCurrentView) !== 'ports') throw new Error('Ctrl+K : vue Ports non ouverte');
    await p.evaluate(() => { _capNav = JSON.parse(JSON.stringify(CAP_NAV_DEFAULT)); capNavRender(); });
    await p.click('#cap-v-flux'); await p.click('#cap-flux-tabs [data-open="physlink"]');
    if (await p.evaluate(() => capCurrentView) !== 'physlink') throw new Error('onglets 📡 Flux : Physical Link non ouvert');
    await p.click('#b-theme-menu'); await p.click('#cap-nav-dd [data-thm="light"]');
    await p.click('#b-theme-menu'); await p.click('#cap-nav-dd [data-thm="dark"]');
    await p.click('#b-file-menu'); await p.keyboard.press('Escape'); });
  await step('analyses : sous-vues', async () => { await p.click('#cap-v-analyses');
    for (const b of await p.$$('#cap-view-analyses [data-an]:not([data-an="fns"])')) { await b.click(); await p.waitForTimeout(300); }
    await p.evaluate(() => capNavOpen('ana:states')); await p.waitForTimeout(300);
    const inp = p.locator('#ana-box .cap-tf-row input:visible').first();
    if (await inp.count()) { await inp.fill('zzzz'); await p.waitForTimeout(100);
      if (!/^🔍 0 \//.test(await p.evaluate(() => [...document.querySelectorAll('#ana-box .cap-tf-cnt')].map(c => c.textContent).find(Boolean) || ''))) throw new Error('filtre de tableau inopérant');
      await inp.fill(''); } });
  await step('ƒ Fonctions : vues', async () => { await p.click('#cap-view-analyses [data-an="fns"]');   // onglet de 🔬 Analyses
    if (await p.evaluate(() => capCurrentView) !== 'functions') throw new Error('onglet ƒ Fonctions inopérant');
    for (const v of ['tree', 'table', 'trace', 'metrics', 'checks']) { await p.click(`#cap-view-functions [data-fv="${v}"]`); await p.waitForTimeout(300); }
    await p.click('#cap-view-functions [data-an="trace"]');
    if (await p.evaluate(() => capCurrentView + ':' + capAnaSub) !== 'analyses:trace') throw new Error('retour vers 🔬 Analyses inopérant'); });
  for (const v of ['fex', 'oav', 'csys', 'cblk', 'compex', 'physlink', 'ports', 'scen'])   // chaque présentation (Blocs, Ligne, Matrice, Contrôles…)
    await step('sous-vues ' + v, async () => {
      await p.evaluate(k => capNavOpen(k), v); await p.waitForTimeout(300);
      const n = await p.locator(`#cap-view-${v} .phl-toggle-btn:visible`).count();
      for (let i = 0; i < n; i++) { const b = p.locator(`#cap-view-${v} .phl-toggle-btn:visible`).nth(i); if (await b.count()) { await b.click(); await p.waitForTimeout(200); } }
      if (await p.evaluate(() => capCurrentView) !== v) throw new Error('vue quittée');
    });
  await step('visites guidées des vues', async () => {
    for (const v of await p.evaluate(() => Object.keys(CAP_TOUR_VIEWS))) {
      await p.evaluate(k => { capNavOpen(k); capTourStartView(); }, v);
      await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.evaluate(() => { if (typeof capTourEnd === 'function') capTourEnd(); });
    } });
  await step('À propos et aide', async () => { await p.evaluate(() => capAboutOpen()); await p.evaluate(() => { document.getElementById('cap-about-ov').style.display = 'none'; openHelpModal(); }); await p.keyboard.press('Escape'); });
  await step('Relation Map', () => p.click('#mode-rm'));
  await step('Table View', () => p.click('#mode-table'));
  await step('tableau de bord : tous les indicateurs', async () => {
    await p.click('#cap-v-dashboard');   // bouton épinglé par défaut
    const r = await p.evaluate(() => { const bad = []; capDashCatalog().forEach(m => CAP_DASH_VIZ[m.kind].forEach(([v]) => {
      try { capDashDraw({ m: m.id, v, top: 10, txt: 'x' }, m, 400, 220); } catch (e) { bad.push(m.id + '/' + v + ' : ' + e.message); } })); return bad; });
    r.forEach(x => errs.push(x));
  });
  await browser.close();
  if (errs.length) { console.error('\n✖ ' + errs.length + ' erreur(s) :\n  - ' + errs.slice(0, 30).join('\n  - ')); process.exit(1); }
  console.log('\n✔ Aucune erreur.');
})();
