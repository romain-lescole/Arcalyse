#!/usr/bin/env node
/**
 * Test de fumée (facultatif) : ouvre dist/relation-map-capella-fr.html dans Chromium HORS LIGNE,
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
const page = path.join(ROOT, 'dist', 'relation-map-capella-fr.html');
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
  for (const v of ['tree', 'cards', 'table', 'links', 'chains', 'physlink', 'compex', 'ports', 'analyses', 'dashboard', 'index'])
    await step('vue ' + v, () => p.click('#cap-v-' + v));
  await step('analyses : sous-vues', async () => { await p.click('#cap-v-analyses');
    for (const b of await p.$$('#cap-view-analyses [data-an]')) { await b.click(); await p.waitForTimeout(300); } });
  await step('ƒ Fonctions : vues', async () => { await p.click('#cap-view-analyses [data-an="fns"]');
    for (const v of ['tree', 'table', 'trace', 'metrics', 'checks']) { await p.click(`#cap-view-analyses [data-fv="${v}"]`); await p.waitForTimeout(300); } });
  await step('Relation Map', () => p.click('#mode-rm'));
  await step('Table View', () => p.click('#mode-table'));
  await step('tableau de bord : tous les indicateurs', async () => {
    await p.click('#cap-v-dashboard');
    const r = await p.evaluate(() => { const bad = []; capDashCatalog().forEach(m => CAP_DASH_VIZ[m.kind].forEach(([v]) => {
      try { capDashDraw({ m: m.id, v, top: 10, txt: 'x' }, m, 400, 220); } catch (e) { bad.push(m.id + '/' + v + ' : ' + e.message); } })); return bad; });
    r.forEach(x => errs.push(x));
  });
  await browser.close();
  if (errs.length) { console.error('\n✖ ' + errs.length + ' erreur(s) :\n  - ' + errs.slice(0, 30).join('\n  - ')); process.exit(1); }
  console.log('\n✔ Aucune erreur.');
})();
