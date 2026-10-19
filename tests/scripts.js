#!/usr/bin/env node
/**
 * Test de l'API de scripts (📜 Scripts, modules 79 à 82) dans le navigateur hors ligne (Playwright, comme tests/smoke.js).
 *
 *   node tests/scripts.js [modele.capella]     (par défaut : tests/models/In-Flight_Entertainment_System.capella, avec son .aird)
 *   CHROMIUM_PATH=/chemin/vers/chrome pour un Chromium déjà installé.
 *
 *   1. Console : ouverture (Alt+4), bouton, exécution dans un worker.
 *   2. Exemples fournis : chacun s'exécute sans erreur (les questions reçoivent la première réponse).
 *   3. Cohérence de l'API avec les données de la page : éléments, types (héritage), couches, chemins (findByPath(e.path) === e),
 *      liaisons (🔗 Liens), références, sélection, diagrammes, métamodèle, analyses (fonctions, chaînes, santé, contrôles…).
 *   4. Erreurs : type inconnu, syntaxe (ligne), exception (ligne), arrêt d'une boucle sans fin, globales masquées.
 *   5. Sorties : liens cliquables (panneau de détail), tableau + CSV, fichier ; bibliothèque (💾, bloc de la page).
 * Code de sortie ≠ 0 au premier échec.
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const page = path.join(ROOT, 'dist', 'arcalyse-fr.html');
const model = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'tests', 'models', 'In-Flight_Entertainment_System.capella');
if (!fs.existsSync(page)) { console.error('dist/arcalyse-fr.html absent : node build.js'); process.exit(2); }
let echecs = 0;
/** Affiche le résultat d'un contrôle. */
function ok(cond, msg) { console.log((cond ? '  ✔ ' : '  ✖ ') + msg); if (!cond) echecs++; return cond; }

(async () => {
  const exe = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ offline: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'));
  await p.evaluate(() => { window._capDlgAuto = 'ok'; });
  await p.setInputFiles('#capella-file-input', model);
  await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
  const airdGz = model.replace(/\.capella$/i, '.aird.gz');
  if (fs.existsSync(airdGz)) {
    const aird = path.join(os.tmpdir(), path.basename(airdGz, '.gz'));
    fs.writeFileSync(aird, zlib.gunzipSync(fs.readFileSync(airdGz)));
    await p.evaluate(() => capNavOpen('diag')); await p.setInputFiles('#cdg-fichier', aird);
    await p.waitForFunction(() => document.querySelectorAll('#diag-liste li[data-diag]').length > 10, null, { timeout: 60000 });
  }
  console.log('\n▶ ' + path.basename(model));
  await p.evaluate(() => { capNavOpen('cards'); const e = capAllElements.find(x => x.typeName === 'LogicalFunction' && x.attrs.name && !/^Root/.test(x.attrs.name)); capOpenDetail(e.id); });

  // ── 1. Console ──
  await p.keyboard.press('Alt+4'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('cap-scripts').style.display === 'flex' && document.getElementById('b-scripts').classList.contains('active')), 'console ouverte par Alt+4, bouton 📜 actif');

  /** Exécute un script et attend sa fin (questions : première réponse proposée). */
  const run = async code => {
    await p.evaluate(c => { document.getElementById('scr-code').value = c; capScrExecuter(); }, code);
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      const st = await p.evaluate(() => ({ enCours: _capScr.enCours, q: !!document.querySelector('#scr-sortie .scr-question:not(.repondue)') }));
      if (!st.enCours) break;
      if (st.q) await p.evaluate(() => { const c = document.querySelector('#scr-sortie .scr-question:not(.repondue)'); const r = c.querySelector('.scr-q-liste input'); if (r) r.checked = true; (c.querySelector('[data-q="ok"]') || c.querySelector('[data-q="oui"]')).click(); });
      await p.waitForTimeout(100);
    }
    return p.evaluate(() => ({ etat: document.getElementById('scr-etat').textContent, worker: !!document.querySelector('#scr-sortie .scr-av') === false,
      lignes: [...document.querySelectorAll('#scr-sortie .scr-l:not(.scr-fic)')].map(x => x.textContent), tables: document.querySelectorAll('#scr-sortie .scr-tableau').length,
      liens: document.querySelectorAll('#scr-sortie [data-id]').length, fichiers: document.querySelectorAll('#scr-sortie .scr-fic').length,
      err: [...document.querySelectorAll('#scr-sortie .scr-err')].map(x => x.textContent).join(' | ') }));
  };

  // ── 2. Exemples ──
  const ex = await p.evaluate(() => capScrApi().exemples().map(x => [x.cle, x.code]));
  for (const [cle, code] of ex) { const r = await run(code); ok(!r.err && /Terminé/.test(r.etat), `exemple « ${cle} » : ${r.etat}${r.err ? ' — ' + r.err.slice(0, 120) : ''}`); }
  ok(!(await p.evaluate(() => [...document.querySelectorAll('#scr-sortie .scr-av')].some(x => /sans isolement/.test(x.textContent)))), 'exécution dans un worker isolé');

  // ── 3. Cohérence avec les données de la page ──
  const attendu = await p.evaluate(() => {
    const { parentOf } = capGetParentIndex(); const L = capLinksData || capComputeLinks();
    const sel = document.querySelector('#cap-detail #crv-det-sec').dataset.el, e = capGetElementById_(sel);
    const noms = []; for (let id = sel; id && capGetElementById_(id); id = parentOf[id]) noms.unshift(capGetElementById_(id).attrs.name || '');
    return { n: capAllElements.length, tech: capAllElements.filter(x => CAP_TECHNICAL_TYPES.has(x.typeName)).length, lf: capAllElements.filter(x => x.typeName === 'LogicalFunction').length,
      la: capAllElements.filter(x => x.layer === 'LA').length, sel, selName: e.attrs.name, selPath: noms.join('/'),
      alloc: ['pcBeh_fn', 'lc_lf', 'sc_sf', 'entity_oa'].reduce((s, k) => s + (L[k] || []).length, 0), fe: (L.fe_fn || []).length,
      diag: typeof capDiagReps === 'function' ? capDiagReps().length : 0, fns: capComputeFunctions().list.length, chains: capComputeChains().length, sante: capSanteCompute().score };
  });
  const r = await run(`
    const e = model.selection[0];
    const alloc = model.elements('Component').reduce((s, c) => s + c.links('allocation', 'out').length, 0);
    const allocIn = model.elements('AbstractFunction').reduce((s, f) => s + f.links('allocation', 'in').length, 0);
    const fes = model.elements('FunctionalExchange').filter(x => x.links('source').length === 1 && x.links('target').length === 1).length;
    let bad = 0; for (const x of model.elements()) { if (!x.owner && x !== model.root) continue; const y = model.findByPath(x.path); if (y !== x && (!y || y.path !== x.path)) bad++; }   // homonymes : premier élément de même chemin ; éléments sans propriétaire hors racine (ModelInformation…) ignorés
    out.print(JSON.stringify({ n: model.elements().length, tech: model.count({ technical: true }), lf: model.count({ exactType: 'LogicalFunction' }), lfA: model.count('la:LogicalFunction'),
      la: model.count({ layer: 'LA' }), sel: e && e.id, selName: e && e.name, selPath: e && e.path, same: e === model.getElementById(e.id), owner: e && e.owner && e.owner.type,
      isA: e && e.isA('AbstractFunction') && !e.isA('Component'), alloc, allocIn, fe: fes, bad, diag: model.diagrams.length, diagSel: e.diagrams.length,
      metaA: metamodel.isA('LogicalComponent', 'Component'), metaN: metamodel.types().length, root: model.root.type, laType: model.layer('LA').type,
      refs: e.references().length >= 0 && e.referencedBy().every(x => x.references().includes(e)),
      fns: (await analysis.functions()).length, chains: (await analysis.chains()).length, sante: (await analysis.health()).score,
      checks: (await analysis.checks('functions')).length > 0, checkEl: (await analysis.checks('functions')).some(c => c.rows.some(r => r.some(x => x && x.element))),
      nq: (await analysis.nameQuality('Compute route')).verb, dep: (await analysis.deployment()).nodes.length >= 0 }));`);
  let got = {}; try { got = JSON.parse(r.lignes[0]); } catch (e) { /* sortie absente */ }
  ok(!r.err, 'script de cohérence sans erreur' + (r.err ? ' — ' + r.err : ''));
  ok(got.n === attendu.n && got.tech === attendu.tech, `éléments : ${got.n} (techniques ${got.tech})`);
  ok(got.lf === attendu.lf && got.lfA === attendu.lf && got.la === attendu.la, `types et couches : LogicalFunction ${got.lf}, la:LogicalFunction ${got.lfA}, LA ${got.la}`);
  ok(got.sel === attendu.sel && got.selName === attendu.selName && got.same === true, `sélection = élément du panneau de détail (${got.selName})`);
  ok(got.selPath === attendu.selPath && got.bad === 0, `path et findByPath : ${got.selPath}`);
  ok(got.isA === true && got.metaA === true && got.metaN > 300 && got.root === 'SystemEngineering' && got.laType === 'LogicalArchitecture', `isA, metamodel (${got.metaN} types), root ${got.root}, layer LA`);
  ok(got.alloc === attendu.alloc && got.allocIn === attendu.alloc, `liaisons allocation (${got.alloc}) vues des deux côtés`);
  ok(got.fe === attendu.fe, `échanges fonctionnels avec source et target : ${got.fe}`);
  ok(got.refs === true, 'références sortantes / entrantes cohérentes');
  ok(got.diag === attendu.diag && (attendu.diag === 0 || got.diagSel >= 0), `diagrammes : ${got.diag}`);
  ok(got.fns === attendu.fns && got.chains === attendu.chains && got.sante === attendu.sante, `analyses : ${got.fns} fonctions, ${got.chains} chaînes, santé ${got.sante}`);
  ok(got.checks === true && got.checkEl === true && got.nq === true && got.dep === true, 'contrôles (lignes avec éléments), qualité des noms, déploiement');

  // ── 4. Erreurs ──
  let r2 = await run('model.elements(\'Nope\')');
  ok(/Type inconnu/.test(r2.err), 'type inconnu : erreur explicite');
  r2 = await run('out.print(1);\nconst a=;\n');
  ok(/ligne 2/.test(r2.etat), 'erreur de syntaxe : ligne 2');
  r2 = await run('out.print(1);\nout.print(2);\nthrow new Error("boum");');
  ok(/ligne 3/.test(r2.etat) && /boum/.test(r2.err), 'exception : ligne 3');
  r2 = await run('out.print(typeof document, typeof window, typeof capAllElements, typeof fetch)');
  ok(r2.lignes[0] === 'undefined undefined undefined undefined', 'globales masquées : document, window, capAllElements, fetch');
  await p.evaluate(() => { document.getElementById('scr-code').value = 'while(true){}'; capScrExecuter(); }); await p.waitForTimeout(500);
  await p.click('#scr-arreter'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !_capScr.enCours && /Erreur/.test(document.getElementById('scr-etat').textContent)), 'boucle sans fin arrêtée par ■');

  // ── 5. Sorties et bibliothèque ──
  const r3 = await run('const c = model.find("LogicalComponent"); out.print(c); out.table([{ a: c, b: 1 }], null, { title: "t" }); out.file("x.csv", out.csv([{ a: "x;y", b: 2 }]));');
  ok(r3.liens >= 2 && r3.tables === 1 && r3.fichiers === 1, 'sortie : liens, tableau, fichier');
  await p.click('#scr-sortie [data-id]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /LogicalComponent/.test(document.querySelector('#cap-detail-content .cap-type-badge').textContent)), 'clic sur un lien : panneau de détail');
  await p.evaluate(() => { document.getElementById('scr-code').value = 'out.print(42)'; }); await p.evaluate(() => capScrEnregistrer()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => _capScr.bib.length === 1 && _capScr.choix === 'bib:0' && JSON.parse(document.getElementById('cap-scripts-data').textContent).bib.length === 1), 'script enregistré dans le projet (bloc cap-scripts-data)');
  await p.evaluate(() => capScrSupprimer()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => _capScr.bib.length === 0), 'script supprimé');
  await browser.close();
  if (errs.length) { console.error('\n✖ erreurs JS : ' + errs.join(' | ')); echecs++; }
  if (echecs) { console.error(`\n✖ ${echecs} échec(s)`); process.exit(1); }
  console.log('\n✔ API de scripts conforme.');
})();
