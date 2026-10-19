#!/usr/bin/env node
/**
 * Test de fumée (facultatif) : ouvre dist/arcalyse-fr.html dans Chromium HORS LIGNE,
 * charge un modèle, parcourt toutes les vues et sous-vues, et signale toute erreur JavaScript.
 * Vérifie aussi qu'aucun élément du tableau de bord ne déborde de son cadre.
 *
 * Installation (une seule fois) :  npm install --save-dev playwright  puis  npx playwright install chromium
 * Lancement :                      node tests/smoke.js [chemin/vers/modele.capella]   (CHROMIUM_PATH=/chemin/vers/chrome pour un Chromium déjà installé)
 * Version anglaise :               node tests/smoke.js --en [modele]  (après node build.js --lang en)
 * Version multilingue :            node tests/smoke.js --multi [--fr] [modele]  (après node build.js --lang multi ; anglais par défaut)
 * (par défaut : premier fichier .capella trouvé dans tests/models/)
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2), EN = args.includes('--en'), MULTI = args.includes('--multi');
const page = path.join(ROOT, 'dist', MULTI ? 'arcalyse-multi.html' : EN ? 'arcalyse-en.html' : 'arcalyse-fr.html');
const models = path.join(__dirname, 'models');
const model = args.find(a => !a.startsWith('--')) || (fs.existsSync(models) ? fs.readdirSync(models).filter(f => f.endsWith('.capella')).map(f => path.join(models, f))[0] : null);
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js' + (MULTI ? ' --lang multi' : EN ? ' --lang en' : '')); process.exit(2); }
if (!model) { console.error('Aucun modèle : placez un .capella dans tests/models/ ou passez-le en argument'); process.exit(2); }

(async () => {
  const exe = process.env.CHROMIUM_PATH;   // Chromium déjà installé (sinon : npx playwright install chromium)
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ offline: true, viewport: { width: 1500, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.addInitScript(() => { window._capDlgAuto = 'cancel'; });   // dialogues maison (12) : réponse automatique « Annuler » pendant le parcours
  await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:') + (MULTI ? '?lang=' + (args.includes('--fr') ? 'fr' : 'en') : ''));
  await p.setInputFiles('#capella-file-input', model);
  await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
  const step = async (label, fn) => { const n = errs.length; try { await fn(); } catch (e) { errs.push(label + ' : ' + e.message); } await p.waitForTimeout(250); console.log((errs.length > n ? '✖ ' : '✔ ') + label); };
  for (const v of ['home', 'tree', 'cards', 'table', 'links', 'chains', 'physlink', 'compex', 'ports', 'fex', 'oav', 'csys', 'cblk', 'scen', 'diag', 'functions', 'analyses', 'dashboard', 'index'])
    await step('vue ' + v, () => p.evaluate(k => capNavOpen(k), v));
  // 🗺 Diagrammes : .aird du modèle (s'il accompagne le modèle dans tests/models, compressé) ; détail → diagramme → clic → détail
  const airdGz = model.replace(/\.capella$/i, '.aird.gz');
  if (fs.existsSync(airdGz)) await step('diagrammes : .aird, détail → diagramme, clic → détail', async () => {
    const aird = path.join(require('os').tmpdir(), path.basename(airdGz, '.gz'));
    fs.writeFileSync(aird, require('zlib').gunzipSync(fs.readFileSync(airdGz)));
    await p.evaluate(() => capNavOpen('diag'));
    await p.setInputFiles('#cdg-fichier', aird);
    await p.waitForFunction(() => document.querySelectorAll('#diag-liste li[data-diag]').length > 10, null, { timeout: 60000 });
    // Panneau de détail d'une fonction : section « Diagrammes », lien vers un diagramme où elle est dessinée
    const id = await p.evaluate(() => { const e = capAllElements.find(x => x.attrs.name === 'Manage Video and Audio Diffusion'); capOpenDetail(e.id); return e.id; });
    const lien = await p.$('#cap-detail-content .cdg-lien');
    if (!lien) throw new Error('section « Diagrammes » absente du panneau de détail');
    await lien.click(); await p.waitForTimeout(300);
    if (!(await p.$(`#vd-svg .vd-sel[data-sem="${id}"]`))) throw new Error('élément non mis en évidence dans le diagramme ouvert');
    await p.evaluate(() => capOpenDetail(capAllElements.find(x => x.attrs.name === 'Root System Function').id));
    await p.click(`#vd-svg .vd-f[data-sem="${id}"]`); await p.waitForTimeout(300);
    if (!(await p.textContent('#cap-detail-content')).includes('Manage Video and Audio Diffusion')) throw new Error('clic dans le diagramme : détail de l\'élément non affiché');
  });
  // 💬 Revue : commentaire depuis le panneau de détail, note sur un diagramme, onglets du panneau, rapport
  await step('revue : commentaire, note de diagramme, vérification, rapport', async () => {
    await p.evaluate(() => { const e = capAllElements.find(x => x.attrs.name === 'Manage Video and Audio Diffusion') || capAllElements.find(x => x.attrs.name && x.layer === 'SA') || capAllElements.find(x => x.attrs.name); capOpenDetail(e.id); });
    await p.click('#cap-detail-content .crv-det-bar button');
    await p.fill('#crv-ed-text', 'smoke'); await p.click('#crv-ov [data-ok]');
    if (await p.evaluate(() => _capRev.comments.length) < 1) throw new Error('commentaire non enregistré');
    if (!(await p.$('#cap-detail-content .crv-det-c'))) throw new Error('section « Commentaires de revue » absente du panneau de détail');
    if (await p.evaluate(() => typeof capDiagReps === 'function' && capDiagReps().length > 0)) {
      await p.evaluate(() => { const r = capDiagReps().find(x => x.genre !== 'tableau'); capDiagOpen(r.uid); }); await p.waitForTimeout(300);
      await p.evaluate(() => { const n = [...document.querySelectorAll('#vd-svg [data-sem]')].find(x => capGetElementById_(x.getAttribute('data-sem')));
        const r = n.getBoundingClientRect(); capRevDiagNoteAt(r.left, r.top, n.getAttribute('data-sem')); });
      await p.fill('#crv-ed-text', 'note smoke'); await p.click('#crv-ov [data-ok]'); await p.waitForTimeout(200);
      if (!(await p.$('#crv-layer .crv-note'))) throw new Error('note absente du calque du diagramme');
      // Trait tiré de la poignée ● de la note vers un autre élément : il est lié à la note
      const [h, t] = await p.evaluate(() => { const c = _capRev.comments[_capRev.comments.length - 1], ids = new Set(c.targets.map(x => x.id));
        const n = [...document.querySelectorAll('#vd-svg .vd-f[data-sem]')].find(x => !ids.has(x.getAttribute('data-sem')) && capGetElementById_(x.getAttribute('data-sem')) && x.getBoundingClientRect().width > 20);
        const a = document.querySelector('#crv-layer .crv-note-ln').getBoundingClientRect(), b = n.getBoundingClientRect();
        return [{ x: a.x + a.width / 2, y: a.y + a.height / 2 }, { x: b.x + 6, y: b.y + b.height / 2 }]; });
      await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(t.x, t.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
      if (await p.evaluate(() => _capRev.comments[_capRev.comments.length - 1].targets.length) < 2) throw new Error('trait vers un élément : lien non créé');
    }
    for (const t of ['list', 'check', 'report', 'cfg']) await p.evaluate(k => capRevToggle(true, k), t);
    await p.evaluate(() => { capRevReportList(); capRevSynthese(_capRev.comments); _capRev.comments = []; _capRev.seq = 0; capRevSave(); capRevToggle(false); });
  });
  await step('dialogues maison : confirm, prompt, Entrée / Échap', async () => {
    await p.evaluate(() => { window._capDlgAuto = null; });
    const c1 = p.evaluate(() => capConfirm('Question ?', { danger: true })); await p.waitForSelector('.cap-dlg-ov [data-c="ok"]'); await p.click('.cap-dlg-ov [data-c="ok"]');
    if (await c1 !== true) throw new Error('capConfirm : OK attendu');
    const c2 = p.evaluate(() => capConfirm('Question ?')); await p.waitForSelector('.cap-dlg-ov'); await p.keyboard.press('Escape');
    if (await c2 !== false) throw new Error('capConfirm : Échap doit annuler');
    const c3 = p.evaluate(() => capPrompt('Nom :', 'abc')); await p.waitForSelector('.cap-dlg-ov input'); await p.keyboard.type('d'); await p.keyboard.press('Enter');
    if (await c3 !== 'd') throw new Error('capPrompt : « d » attendu (valeur initiale sélectionnée), obtenu ' + JSON.stringify(await c3));
    const c4 = p.evaluate(() => capAlert('Info')); await p.waitForSelector('.cap-dlg-ov[data-kind="alert"]'); await p.keyboard.press('Enter'); await c4;
    if (await p.$('.cap-dlg-ov')) throw new Error('boîte de dialogue restée ouverte');
    await p.evaluate(() => { window._capDlgAuto = 'cancel'; });
  });
  await step('barre : menu, épingle, Ctrl+K', async () => {
    await p.click('#cap-v-analyses .cap-nav-arr'); await p.click('#cap-nav-dd [data-open="ana:reqs"]');
    await p.click('#cap-v-analyses .cap-nav-arr'); await p.click('#cap-nav-dd [data-pin="ana:reqs"]'); await p.click('#cap-v-ana-reqs');
    await p.keyboard.press('Control+K'); await p.keyboard.type('ports'); await p.keyboard.press('Enter');
    if (await p.evaluate(() => capCurrentView) !== 'ports') throw new Error('Ctrl+K : vue Ports non ouverte');
    // 🔍 Palette : un élément du modèle par son nom → panneau de détail
    const nomEl = await p.evaluate(() => (capAllElements.find(x => /Function$/.test(x.typeName) && x.attrs.name && x.attrs.name.length > 12) || {}).attrs?.name);
    if (nomEl) { await p.keyboard.press('Control+K'); await p.keyboard.type(nomEl); await p.waitForTimeout(150);
      if (!(await p.$('#cap-nav-res [data-pal="el"]'))) throw new Error('Ctrl+K : aucun élément trouvé pour « ' + nomEl + ' »');
      await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      if (!(await p.textContent('#cap-detail-content')).includes(nomEl)) throw new Error('Ctrl+K : détail de « ' + nomEl + ' » non ouvert'); }
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
  await step('▤ Tableau : onglet, tri, colonne de relation, glisser-déposer', async () => {
    await p.click('#cap-v-table');
    await p.click('#cap-table-tabs .cap-ttab-add');
    if (await p.evaluate(() => capTableTabs.length) < 2) throw new Error('onglet non ajouté');
    if (await p.evaluate(() => capEnabledTypes.size)) throw new Error('nouvel onglet : des types sont cochés');
    await p.click('#cap-table-tabs .cap-ttab');   // retour au 1er onglet (types cochés)
    await p.click('#cap-table-head tr:first-child th:nth-child(1)');
    if (await p.evaluate(() => capTableSort.col) !== 'name') throw new Error('tri non appliqué');
    const n = await p.evaluate(() => { const ix = capTableRelIndex(); const s = CAP_LINK_SECTIONS.find(x => ix[x.key]);
      capTableVisibleCols.push('rel:' + s.key + ':out'); capRenderTableBodyOnly();
      return [...document.querySelectorAll('#cap-table-body tr')].length; });
    if (!n) throw new Error('tableau vide après ajout d\'une colonne de relation');
    await p.dragAndDrop('#cap-table-head tr:first-child th:nth-child(1)', '#cap-table-head tr:first-child th:nth-child(3)');
    await p.click('#cap-table-toolbar [data-tc="scope"]'); await p.locator('.cap-sc-row input').nth(1).check();   // repères data-tc : indépendants de la langue
    if (!await p.evaluate(() => capTableScope.ids.length)) throw new Error('portée non appliquée');
    await p.click('#cap-scope-ov [data-c="clr"]'); await p.click('#cap-scope-ov .cw-d-ftr [data-c="x"]');
    await p.click('#cap-table-toolbar [data-tc="tree"]'); await p.click('#cap-table-toolbar [data-tc="menu"]'); await p.click('.cap-tmenu [data-tc="grey"]'); await p.click('.cap-tmenu [data-tc="open"]');
    if (!await p.evaluate(() => document.querySelectorAll('#cap-table-body .cap-ttree-td').length)) throw new Error('affichage en arbre vide');
    await p.click('#cap-table-toolbar [data-tc="rows"]'); });
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
