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
 * Version réduite à un format :    node tests/smoke.js --format capella|sysml2|uml [--en | --multi]  (après node build.js --format … ;
 *                                  capella : parcours complet sans les étapes 🧩 / 🧬 ; sysml2, uml : parcours propre — une carte,
 *                                  aide filtrée, .capella refusé, vues, accueil, menus)
 * (par défaut : premier fichier .capella trouvé dans tests/models/)
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2), EN = args.includes('--en'), MULTI = args.includes('--multi');
const fa = args.indexOf('--format'), FORMAT = fa >= 0 ? args[fa + 1] : '';   // version réduite à un format (node build.js --format capella)
const page = path.join(ROOT, 'dist', `arcalyse-${FORMAT ? FORMAT + '-' : ''}${MULTI ? 'multi' : EN ? 'en' : 'fr'}.html`);
const models = path.join(__dirname, 'models');
const model = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--format') || (fs.existsSync(models) ? fs.readdirSync(models).filter(f => f.endsWith('.capella')).map(f => path.join(models, f))[0] : null);
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js' + (FORMAT ? ' --format ' + FORMAT : '') + (MULTI ? ' --lang multi' : EN ? ' --lang en' : '')); process.exit(2); }
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
  if (FORMAT === 'sysml2' || FORMAT === 'uml') {   // version SysML v2 seul ou UML / SysML v1 seul : parcours propre (pas de .capella)
    const ok = (c, m) => { if (!c) errs.push(m); console.log((c ? '✔ ' : '✖ ') + m); };
    const w = await p.evaluate(() => ({ ed: CAP_EDITION, cartes: [...document.querySelectorAll('.cw-card')].map(c => c.id), aide: [...document.querySelectorAll('[data-hfmt]')].filter(n => n.style.display !== 'none').map(n => n.dataset.hfmt) }));
    ok(w.ed === FORMAT && w.cartes.join() === 'cw-card-' + FORMAT, 'écran d\'ouverture : une seule carte, celle du format');
    ok(w.aide.every(k => k === FORMAT), 'aide : onglets et sections des autres formats masqués');
    await p.setInputFiles('#capella-file-input', model); await p.waitForTimeout(800);
    ok(await p.evaluate(() => !capLoaded && /Capella/.test(document.getElementById('cw-status').textContent)), 'fichier .capella refusé avec un message');
    await p.setInputFiles('#capella-file-input', FORMAT === 'sysml2' ? path.join(models, 'VehiculeDemo.sysml') : path.join(models, 'uml', 'Drone-2026x.mdzip'));
    await p.waitForFunction(() => capLoaded, null, { timeout: 120000 }); await p.waitForTimeout(500);
    for (const v of ['home', 'tree', 'cards', 'table', 'diag', FORMAT === 'uml' ? 'ana:uml' : 'ana:sysml', 'ana:sante', 'ana:diff', 'dashboard']) {
      const n = errs.length; try { await p.evaluate(k => capNavOpen(k), v); await p.waitForTimeout(400); } catch (e) { errs.push('vue ' + v + ' : ' + e.message); }
      console.log((errs.length > n ? '✖ ' : '✔ ') + 'vue ' + v);
    }
    const r = await p.evaluate(async () => { capNavOpen('home'); await new Promise(r => setTimeout(r, 300)); const E = capNavEff();
      const id = capAllElements.find(e => e.attrs && e.attrs.name).id; capOpenDetail(id);
      return { cases: document.querySelectorAll('#cap-view-home .hm-case').length, ico: !!document.querySelector('#cap-view-home .hm-layer-t svg'),
        menus: !E.hide.has('functions') || !E.hide.has(CAP_EDITION === 'uml' ? 'ana:sysml' : 'ana:uml') ? 'vues d\'un autre format visibles' : '', vues: capSyVuesListe().length }; });
    ok(r.cases === 3 && r.ico && r.vues > 1, 'accueil : cases « Fichiers du projet », icônes, vues ' + JSON.stringify(r));
    ok(!r.menus, 'menus : vues des autres formats absentes');
    await browser.close();
    if (errs.length) { console.error('\n✖ ' + errs.length + ' erreur(s) :\n  - ' + errs.join('\n  - ')); process.exit(1); }
    console.log('\n✔ Aucune erreur.'); return;
  }
  await p.setInputFiles('#capella-file-input', model);
  await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
  const step = async (label, fn) => { const n = errs.length; try { await fn(); } catch (e) { errs.push(label + ' : ' + e.message); } await p.waitForTimeout(250); console.log((errs.length > n ? '✖ ' : '✔ ') + label); };
  for (const v of ['home', 'tree', 'cards', 'table', 'matrix', 'chains', 'physlink', 'compex', 'ports', 'fex', 'oav', 'csys', 'cblk', 'scen', 'diag', 'functions', 'analyses', 'dashboard'])
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
    if (await p.$('#cap-detail-content [data-dtab="diag"]')) await p.click('#cap-detail-content [data-dtab="diag"]');   // 🗂 onglet 🔲 Diagrammes du panneau (77)
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
      if (!(await p.$('.crv-layer .crv-note'))) throw new Error('note absente du calque du diagramme');
      // Trait tiré de la poignée ● de la note vers un autre élément : il est lié à la note
      const [h, t] = await p.evaluate(() => { const c = _capRev.comments[_capRev.comments.length - 1], ids = new Set(c.targets.map(x => x.id));
        const n = [...document.querySelectorAll('#vd-svg .vd-f[data-sem]')].find(x => !ids.has(x.getAttribute('data-sem')) && capGetElementById_(x.getAttribute('data-sem')) && x.getBoundingClientRect().width > 20);
        const a = document.querySelector('.crv-layer .crv-note-ln').getBoundingClientRect(), b = n.getBoundingClientRect();
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
  await step('profil de contrôles : désactiver puis réactiver', async () => {
    await p.evaluate(() => capNavOpen('functions')); await p.waitForTimeout(300); await p.click('#cap-view-functions [data-fv="checks"]'); await p.waitForTimeout(300);
    const t = await p.evaluate(() => document.querySelector('#cap-view-functions details.cap-diag b')?.textContent); if (!t) throw new Error('aucun contrôle affiché');
    await p.evaluate(() => capChkDialog()); await p.waitForSelector('#cap-chk-ov tr.chk-r');
    await p.evaluate(t => { const tr = [...document.querySelectorAll('#cap-chk-ov tr.chk-r')].find(x => x.dataset.t === t); tr.querySelector('[data-on]').click(); }, t); await p.waitForTimeout(300);
    await p.click('#cap-chk-ov [data-c="x"]');
    if (await p.evaluate(t => [...document.querySelectorAll('#cap-view-functions details.cap-diag:not(.cap-diag-offl) b')].some(b => b.textContent === t), t)) throw new Error('contrôle désactivé encore affiché : ' + t);
    if (!(await p.$('#cap-view-functions .cap-diag-offl'))) throw new Error('liste des contrôles désactivés absente');
    await p.evaluate(() => { capChkSet({ off: {}, sev: {}, params: {} }); }); await p.waitForTimeout(300); await p.click('#cap-view-functions [data-fv="checks"]'); await p.waitForTimeout(300);
    if (!await p.evaluate(t => [...document.querySelectorAll('#cap-view-functions details.cap-diag b')].some(b => b.textContent === t), t)) throw new Error('contrôle non réactivé : ' + t);
  });
  await step('barre : menu, épingle, Ctrl+K, Essentiel / Complet', async () => {
    // Vue du menu ✅ Vérifier ouverte puis épinglée : 🧾 Exigences, ou la première vue du menu si le modèle n'a pas d'exigence
    // (en Essentiel, les vues sans données sont retirées des menus : IFE)
    await p.click('#cap-v-verif');
    const cle = await p.evaluate(() => { const x = document.querySelector('#cap-nav-dd [data-pin="ana:reqs"]') || document.querySelector('#cap-nav-dd [data-pin^="ana:"]'); return x && x.dataset.pin; });
    if (!cle) throw new Error('menu ✅ Vérifier : aucune vue à épingler');
    await p.click(`#cap-nav-dd [data-open="${cle}"]`);
    await p.click('#cap-v-verif'); await p.click(`#cap-nav-dd [data-pin="${cle}"]`); await p.click('#cap-v-' + cle.replace(':', '-'));
    // Niveau Essentiel (par défaut) : vues avancées absentes du menu ✅ Vérifier ; Complet : présentes
    await p.click('#cap-v-verif'); if (await p.$('#cap-nav-dd [data-open="ana:rec"]')) throw new Error('Essentiel : REC / RPL présent dans le menu');
    await p.keyboard.press('Escape'); await p.click('#cap-nav-lvl [data-lvl="complet"]');
    await p.click('#cap-v-verif'); if (!(await p.$('#cap-nav-dd [data-open="ana:rec"]'))) throw new Error('Complet : REC / RPL absent du menu');
    await p.keyboard.press('Escape'); await p.click('#cap-nav-lvl [data-lvl="essentiel"]');
    await p.click('#cap-v-revue'); await p.click('#cap-nav-dd [data-open="home:docs"]');
    if (await p.evaluate(() => capCurrentView + ':' + _capHomeUi.tab) !== 'home:docs') throw new Error('💬 Revue & documents : check-lists non ouvertes');
    await p.keyboard.press('Control+K'); await p.keyboard.type('ports'); await p.keyboard.press('Enter');
    if (await p.evaluate(() => capCurrentView) !== 'ports') throw new Error('Ctrl+K : vue Ports non ouverte');
    // 🔍 Palette : un élément du modèle par son nom → panneau de détail
    const nomEl = await p.evaluate(() => (capAllElements.find(x => /Function$/.test(x.typeName) && x.attrs.name && x.attrs.name.length > 12) || {}).attrs?.name);
    if (nomEl) { await p.keyboard.press('Control+K'); await p.keyboard.type(nomEl); await p.waitForTimeout(150);
      if (!(await p.$('#cap-nav-res [data-pal="el"]'))) throw new Error('Ctrl+K : aucun élément trouvé pour « ' + nomEl + ' »');
      await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      if (!(await p.textContent('#cap-detail-content')).includes(nomEl)) throw new Error('Ctrl+K : détail de « ' + nomEl + ' » non ouvert'); }
    await p.evaluate(() => { _capNav = JSON.parse(JSON.stringify(CAP_NAV_DEFAULT)); capNavRender(); });
    await p.click('#cap-v-arch'); await p.click('#cap-nav-dd [data-open="grp:comp"]'); await p.click('#cap-flux-tabs [data-open="physlink"]');
    if (await p.evaluate(() => capCurrentView) !== 'physlink') throw new Error('barre de famille : Physical Link non ouvert');
    await p.click('#b-prefs'); await p.click('#cap-nav-dd [data-act="theme"]'); await p.click('#cap-nav-dd [data-thm="light"]');
    await p.click('#b-prefs'); await p.click('#cap-nav-dd [data-act="theme"]'); await p.click('#cap-nav-dd [data-thm="dark"]');
    await p.click('#b-file-menu'); await p.keyboard.press('Escape'); });
  await step('🏠 Accueil : en-tête du projet, tâches, vues sans données', async () => {
    await p.evaluate(() => { _capHomeUi.tab = 'projet'; capNavOpen('home'); }); await p.waitForTimeout(300);
    if ((await p.$$('#cap-view-home .hm-head .hm-case')).length !== 3) throw new Error('en-tête du projet absent : 3 cases « Fichiers du projet » attendues');
    if (!(await p.$('#cap-view-home .hm-head .cw-fmt'))) throw new Error('en-tête du projet : pastille de format absente');
    if ((await p.$$('#cap-view-home .hm-tache')).length !== 6) throw new Error('« Que voulez-vous faire ? » : 6 tâches attendues');
    await p.click('#cap-view-home .hm-tache[data-nav="table"]');
    if (await p.evaluate(() => capCurrentView) !== 'table') throw new Error('tâche « Sortir un tableau Excel » : ▤ Tableau non ouvert');
    const k = await p.evaluate(() => [...capNavVides()].find(x => CAP_NAV_ITEMS.find(i => i.k === x && i.g === 'verif' && !i.x && !i.m)));   // vue sans données du menu ✅ Vérifier
    { await p.evaluate(() => capNavSetMode('essentiel'));
      if (k) { await p.click('#cap-v-verif'); if (await p.$(`#cap-nav-dd [data-open="${k}"]`)) throw new Error('vue sans données encore dans le menu : ' + k); await p.keyboard.press('Escape'); } }
    await p.evaluate(() => capNavSetMode('complet')); });
  await step('💚 Santé & contrôles : pastille, filtre par vue, ouvrir dans la vue', async () => {
    await p.evaluate(() => capNavOpen('fex')); await p.waitForTimeout(300);
    await p.click('#cap-flux-tabs .cap-nav-chk'); await p.waitForTimeout(800);
    if (await p.evaluate(() => capCurrentView + ':' + capAnaSub) !== 'analyses:sante') throw new Error('pastille : 💚 Santé non ouverte');
    if (!(await p.$('.sante-vues [data-svue="fex"].active'))) throw new Error('💚 Santé : filtre sur ƒ⇆ non appliqué');
    const t = await p.evaluate(() => document.querySelector('[data-sgo]')?.dataset.st);
    if (t) { await p.click('[data-sgo]'); await p.waitForTimeout(1500);
      if (!(await p.evaluate(t => [...document.querySelectorAll('#cap-view-fex details.cap-diag[open] summary b')].some(b => b.textContent === t), t))) throw new Error('« Ouvrir ↗ » : section non dépliée — ' + t); }
    await p.click('#cap-view-fex .cap-diag-cfg'); await p.waitForTimeout(500);
    if (await p.evaluate(() => capAnaSub) !== 'sante') throw new Error('bouton 💚 des contrôles inopérant'); });
  await step('💬 Revue & documents : faire relire, rapports, retour à l\'accueil', async () => {
    await p.click('#cap-v-revue'); await p.click('#cap-nav-dd [data-open="home:rap"]'); await p.waitForTimeout(300);
    if (await p.evaluate(() => capNavCurKey()) !== 'home:rap') throw new Error('📘 Rapports automatiques non ouverts');
    if (!(await p.$('#cap-view-home [data-dos-gab]'))) throw new Error('📘 : plans types absents');
    await p.click('#cap-view-home [data-tab="dos"]'); await p.click('#cap-view-home [data-da="new"]'); await p.waitForTimeout(300);
    if (await p.evaluate(() => capNavCurKey() + ':' + capDosOnglet(capDosCur())) !== 'home:dos:dos') throw new Error('📑 Faire relire : nouveau dossier mal rangé');
    await p.click('#cap-tb-home .tbtn'); await p.waitForTimeout(300);
    if (await p.evaluate(() => _capHomeUi.tab) !== 'projet') throw new Error('🏠 Accueil : onglet Projet attendu'); });
  await step('🗂 Familles de vues : menu, puces, couche commune', async () => {
    await p.click('#cap-v-arch'); if (await p.$('#cap-nav-dd [data-open="csys"]')) throw new Error('vue d\'une famille encore seule dans le menu');
    await p.click('#cap-nav-dd [data-open="grp:comp"]'); await p.click('#cap-flux-tabs [data-open="cblk"]');
    if (await p.evaluate(() => capCurrentView + ':' + _capNav.couche) !== 'cblk:LA') throw new Error('puce LA : couche non mémorisée');
    await p.click('#cap-v-arch'); await p.click('#cap-nav-dd [data-open="grp:fonc"]'); await p.waitForTimeout(500);
    // La famille s'ouvre sur sa dernière vue (ƒ Fonctions ou ƒ⇆) : la couche commune LA doit y être appliquée
    if (await p.evaluate(() => capNavCoucheLue(capCurrentView))!== 'LA') throw new Error('ƒ Fonctions & échanges : couche commune LA non appliquée (' + await p.evaluate(() => capCurrentView) + ')');
    await p.click('#cap-flux-tabs [data-open="functions"]'); await p.waitForTimeout(500);
    if (await p.evaluate(() => capNavCoucheLue('functions')) !== 'LA') throw new Error('ƒ Fonctions : couche commune LA non appliquée');
    await p.click('#cap-flux-tabs [data-couche=""]'); await p.waitForTimeout(300);
    if (await p.evaluate(() => capNavCoucheLue('functions'))) throw new Error('couche « Toutes » non appliquée');
    await p.click('#cap-v-verif'); await p.click('#cap-nav-dd [data-open="grp:trac"]'); await p.click('#cap-flux-tabs [data-open="ana:xlay"]');
    if (await p.evaluate(() => capAnaSub) !== 'xlay') throw new Error('🧬 Traçabilité : graphe non ouvert'); });
  await step('⚙ Préférences : rubriques, thème, suivi enregistré', async () => {
    await p.evaluate(() => capPrefDialog());
    for (const t of ['aff', 'theme', 'suivi', 'save', 'cfg', 'ctl', 'exp']) { await p.click(`#cap-pref-ov [data-ptab="${t}"]`); await p.waitForTimeout(100); }
    await p.click('#cap-pref-ov [data-ptab="theme"]'); await p.click('#cap-pref-ov label:has([data-pt="office2007"])');
    if (await p.evaluate(() => currentTheme) !== 'office2007') throw new Error('thème Office 2007 non appliqué');
    await p.click('#cap-pref-ov label:has([data-pt="dark"])');
    await p.click('#cap-pref-ov [data-ptab="suivi"]'); await p.selectOption('#cap-pref-ov [data-pw="period"]', '60');
    if (await p.evaluate(() => JSON.parse(document.getElementById('cap-toolbar').textContent).watch?.period) !== 60) throw new Error('période du suivi non enregistrée');
    if (await p.evaluate(() => { applyTheme('blue'); return currentTheme; }) !== 'dark') throw new Error('ancien thème Marine non converti en Sombre');
    await p.click('#cap-pref-ov .cw-d-hdr [data-pa="x"]'); });
  await step('scripts 📜 : console, exemple, lien', async () => {
    await p.evaluate(() => capScrToggle(true));
    if (await p.evaluate(() => document.getElementById('cap-scripts').style.display) !== 'flex') throw new Error('console non ouverte');
    await p.evaluate(() => { document.getElementById('scr-code').value = capScrApi().exemples()[0].code; capScrExecuter(); });
    await p.waitForFunction(() => !_capScr.enCours, null, { timeout: 60000 });
    if (await p.$('#scr-sortie .scr-err')) throw new Error('exemple en erreur : ' + await p.textContent('#scr-sortie .scr-err'));
    if (!(await p.$('#scr-sortie [data-id]'))) throw new Error('aucun lien d\'élément dans la sortie');
    await p.evaluate(() => capScrToggle(false)); });
  await step('pagination ⏭ : ports, page suivante, tout afficher', async () => {
    await p.evaluate(() => capNavOpen('ports'));
    const bar = await p.$('#cap-view-ports .cap-pg-bar');
    if (bar) { const first = await p.evaluate(() => document.querySelector('#cap-view-ports .cap-pg-body tr').textContent);
      await p.click('#cap-view-ports .cap-pg-bar [data-pg-go="next"]');
      if (await p.evaluate(() => document.querySelector('#cap-view-ports .cap-pg-body tr').textContent) === first) throw new Error('page suivante : mêmes lignes');
      await p.click('#cap-view-ports .cap-pg-bar [data-pg-go="all"]');
      if (!(await p.$('#cap-view-ports .cap-pg-bar [data-pg-go="0"]'))) throw new Error('Tout afficher : barre non mise à jour'); }
    else console.log('  (moins de 200 lignes : pas de pagination sur ce modèle)'); });
  await step('panneau de détail : onglets', async () => {
    await p.evaluate(() => { capNavOpen('cards'); const e = capAllElements.find(x => x.typeName === 'SystemFunction' && x.attrs.name); capOpenDetail(e.id); });
    if (!(await p.$('#cap-detail-content .cap-det-tab.active'))) throw new Error('onglets du panneau absents');
    await p.click('#cap-detail-content [data-dtab="liens"]');
    if (!(await p.$('#cap-detail-content .cap-det-pane[data-pane="liens"].on'))) throw new Error('onglet 🔗 Liens non affiché');
    await p.click('#cap-detail-content [data-dtab="all"]'); await p.evaluate(() => { _capNav.det = 'fiche'; capNavSave(); }); });
  await step('historique ◀ ▶ : retour, Alt+→, liste', async () => {
    await p.evaluate(() => { capNavOpen('tree'); capNavOpen('cards'); });
    await p.click('#b-hist-back'); if (await p.evaluate(() => capCurrentView) !== 'tree') throw new Error('◀ : vue Arborescence non rétablie');
    await p.keyboard.press('Alt+ArrowRight'); if (await p.evaluate(() => capCurrentView) !== 'cards') throw new Error('Alt+→ : vue Cartes non rétablie');
    await p.click('#b-hist-back', { button: 'right' }); if (!(await p.$('#cap-hist-dd [data-hi]'))) throw new Error('clic droit : liste des étapes absente');
    await p.keyboard.press('Escape'); await p.evaluate(() => capHistClose()); });
  await step('analyses : sous-vues', async () => { await p.evaluate(() => { capNavSetMode('complet'); capNavOpen('ana:trace'); }); await p.waitForTimeout(300);   // Complet : tous les onglets
    for (const k of await p.evaluate(() => CAP_NAV_ITEMS.filter(i => i.k.startsWith('ana:')).map(i => i.k))) { await p.evaluate(k => capNavOpen(k), k); await p.waitForTimeout(300); }   // sous-vues par les menus ☰ (la barre d'onglets a été retirée)
    if (!(await p.$('#ana-recalc'))) throw new Error('↻ Recalculer absent de la barre de la sous-vue');
    await p.evaluate(() => capNavOpen('ana:states')); await p.waitForTimeout(300);
    const inp = p.locator('#ana-box .cap-tf-row input:visible').first();
    if (await inp.count()) { await inp.fill('zzzz'); await p.waitForTimeout(100);
      if (!/^🔍 0 \//.test(await p.evaluate(() => [...document.querySelectorAll('#ana-box .cap-tf-cnt')].map(c => c.textContent).find(Boolean) || ''))) throw new Error('filtre de tableau inopérant');
      await inp.fill(''); } });
  await step('ƒ Fonctions : vues', async () => { await p.evaluate(() => capNavOpen('functions')); await p.waitForTimeout(300);
    if (await p.evaluate(() => capCurrentView) !== 'functions') throw new Error('vue ƒ Fonctions non ouverte');
    for (const v of ['tree', 'table', 'trace', 'metrics', 'checks']) { await p.click(`#cap-view-functions [data-fv="${v}"]`); await p.waitForTimeout(300); }
    await p.evaluate(() => capNavOpen('ana:trace')); await p.waitForTimeout(300);
    if (await p.evaluate(() => capCurrentView + ':' + capAnaSub) !== 'analyses:trace') throw new Error('ouverture de 🧬 Traçabilité inopérante'); });
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
  await step('Relation Map', async () => { await p.click('#cap-v-arch'); await p.click('#cap-nav-dd [data-open="@rm"]');
    if (await p.evaluate(() => currentMode) !== 'default') throw new Error('Relation Map non ouverte'); });
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
  await step('▦ Matrice : préréglage, cellule, clavier, critère, chemin, marques, axes, tri, exports, Ctrl+K', async () => {
    await p.click('#cap-v-matrix');
    if (await p.evaluate(() => capCurrentView) !== 'matrix') throw new Error('vue non ouverte par son bouton direct');
    await p.click('#cmx-tabs [data-mx="presets"]'); await p.click('.cmx-menu .ctx-i:not(.off)');
    if (await p.evaluate(() => _capMx.tabs.length) < 2) throw new Error('préréglage non ouvert dans un onglet');
    if (!await p.evaluate(() => _capMxX && _capMxX.nl)) throw new Error('préréglage : matrice vide');
    await p.click('#cmx-cells .cmx-c', { force: true }); if (!(await p.$('.cmx-pop'))) throw new Error('fenêtre des liens de la cellule absente');
    await p.keyboard.press('Escape');
    await p.focus('#cmx-body'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.keyboard.press('Escape');
    await p.click('#cmx-crit [data-mx="rels"]'); if (!(await p.$('.cmx-pop [data-r]'))) throw new Error('critère : aucune relation proposée');
    await p.click('.cmx-pop [data-chnew]'); await p.waitForSelector('#cap-mx-ov .cmx-step'); await p.click('#cap-mx-ov .cw-d-ftr [data-c="x"]');
    await p.click('#cmx-bar [data-mx="styles"]'); await p.selectOption('.cmx-pop .cmx-sty [data-f]', 'losange'); await p.keyboard.press('Escape');
    if (!await p.evaluate(() => Object.values(capMxTab().vue.styles).some(s => s.f === 'losange'))) throw new Error('marque non personnalisée');
    await p.click('#cmx-crit [data-mx="swap"]'); await p.click('#cmx-bar [data-mxgrp="proprietaire"]'); await p.click('#cmx-bar [data-mxcel="nombre"]');
    await p.click('#cmx-bar [data-mx="tri"]'); await p.selectOption('.cmx-pop [data-tri="triL"]', 'nombre'); await p.keyboard.press('Escape');
    if (!await p.evaluate(() => capMxLignes('liens').length > 1)) throw new Error('export : aucune ligne de lien');
    await p.evaluate(() => { capMxExport('mat'); capMxXlsx(); });
    const nom = await p.evaluate(() => capMxTab().nom.split(' ')[0]);
    await p.keyboard.press('Control+K'); await p.keyboard.type(nom); await p.waitForTimeout(150);
    if (!(await p.$('#cap-nav-res [data-pal="mx"]'))) throw new Error('Ctrl+K : onglet de matrice introuvable');
    await p.keyboard.press('Escape'); });
  await step('tableau de bord : tous les indicateurs', async () => {
    await p.click('#cap-v-revue'); await p.click('#cap-nav-dd [data-open="dashboard"]');   // menu 💬 Revue & documents
    const r = await p.evaluate(() => { const bad = []; capDashCatalog().forEach(m => CAP_DASH_VIZ[m.kind].forEach(([v]) => {
      try { capDashDraw({ m: m.id, v, top: 10, txt: 'x' }, m, 400, 220); } catch (e) { bad.push(m.id + '/' + v + ' : ' + e.message); } })); return bad; });
    r.forEach(x => errs.push(x));
  });
  // 🧩 SysML v2 (87) : modèle d'essai ouvert à la place du .capella (confirmation du remplacement), vue, détail, accueil
  const sysml = path.join(models, 'VehiculeDemo.sysml');
  if (fs.existsSync(sysml) && (!FORMAT || FORMAT === 'sysml2')) await step('🧩 SysML v2 : ouverture, vue, détail, santé, vues calculées (groupes, main, carte, note, texte), accueil', async () => {
    await p.setInputFiles('#capella-file-input', sysml); await p.waitForTimeout(300);
    await p.click('#cap-replace-ov [data-c="go"]');
    await p.waitForFunction(() => capCurrentFileName === 'VehiculeDemo.sysml', null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(async () => { const o = { n: capAllElements.length, rel: MODEL.relations.filter(x => String(x.type).startsWith('sysml:')).length, vides: capNavVides().has('functions') };
      capNavOpen('ana:sysml'); await new Promise(r => setTimeout(r, 300)); const box = document.querySelector('#ana-box');
      for (const v of ['els', 'lia', 'diag', 'fic']) { _capSy.view = v; capRenderSysml(box.querySelector('[data-hold="sysml"]')); } _capSy.view = 'els';
      o.fic = box.querySelectorAll('.sy-ln').length;
      const boite = capAllElements.find(e => e.attrs.name === 'boite'); capOpenDetail(boite.id); await new Promise(r => setTimeout(r, 200));
      o.detail = /part boite : Boite/.test(document.querySelector('#cap-detail').innerText);
      o.sante = capSanteCompute().checks.some(c => c.view === 'ana:sysml');
      capNavOpen('diag'); await new Promise(r => setTimeout(r, 300)); const dv = document.getElementById('cap-view-diag'); o.vues = dv.querySelectorAll('.sy-vue-it').length;   // 🔲 vues calculées
      const it = dv.querySelector('.sy-vue-it'); if (it) { it.click(); await new Promise(r => setTimeout(r, 300)); } const svg = dv.querySelector('svg.sy-vue-svg'); o.svg = svg ? svg.querySelectorAll('[data-sem]').length : 0;
      if (svg) { svg.querySelector('g[data-sem]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 200)); o.clic = /capDiagOpen\('sy:/.test(document.querySelector('#cap-detail').innerHTML); }   // section « Diagrammes » commune (54) : vues de l'élément (langue indifférente)
      o.carte = !!dv.querySelector('#cdg-carte-sy .sy-carte-panneau .sy-carte-vp'); o.main = svg && getComputedStyle(svg.closest('.sy-vue-hote')).cursor === 'grab';   // ▣ carte sous l'explorateur, main
      const bc = dv.querySelector('#cdg-carte-sy [data-carte="diagramme"]'); if (bc) { bc.click(); await new Promise(r => setTimeout(r, 200)); o.carte = o.carte && !!dv.querySelector('.sy-vue-droite-corps > .sy-carte') && !dv.querySelector('.sy-carte-panneau'); dv.querySelector('#cdg-carte-sy [data-carte="panneau"]').click(); await new Promise(r => setTimeout(r, 200)); }   // ⇲ dans la vue, ⇱ retour
      const dsvg = document.querySelector('#cap-detail h3 svg'); o.ico = !dsvg || dsvg.getBoundingClientRect().width <= 24;   // CSS du lecteur restreinte aux vues : icônes de la page intactes
      const grp = dv.querySelector('#cdg-liste .cdg-gh'); if (grp) { const n0 = dv.querySelectorAll('.sy-vue-it').length; grp.click(); await new Promise(r => setTimeout(r, 150)); o.pli = dv.querySelectorAll('.sy-vue-it').length < n0; dv.querySelector('#cdg-liste .cdg-gh').click(); await new Promise(r => setTimeout(r, 150)); }   // groupes repliables
      if (typeof capRevDiagNoteAt === 'function' && dv.querySelector('#sy-crv-note')) {   // 📝 note de revue posée sur la vue (55) : calque, liée à l'élément cliqué
        const g = [...dv.querySelectorAll('svg.sy-vue-svg [data-sem]')].find(x => capGetElementById_(x.getAttribute('data-sem')) && x.getBoundingClientRect().width > 30 && x.getBoundingClientRect().top < innerHeight - 100);
        if (g) { const r = g.getBoundingClientRect(); window._capDlgAuto = 'ok'; capRevDiagNoteAt(r.left + 8, r.top + 8, g.getAttribute('data-sem')); await new Promise(r => setTimeout(r, 300));
          const ta = document.getElementById('crv-ed-text'); if (ta) { ta.value = 'note sysml'; document.querySelector('#crv-ov [data-ok]').click(); await new Promise(r => setTimeout(r, 300)); }
          const c = _capRev.comments[_capRev.comments.length - 1]; o.note = !!(c && c.diag && /^sy:/.test(c.diag.uid) && c.targets.length === 1 && dv.querySelector('.sy-vue-cadre > .crv-layer .crv-note'));
          _capRev.comments = _capRev.comments.filter(x => x !== c); capRevSave(); } else o.note = true; } else o.note = true;
      const bt = dv.querySelector('[data-symode="texte"]'); if (bt) { bt.click(); await new Promise(r => setTimeout(r, 200)); } o.texte = !!dv.querySelector('.sy-vue-texte') && dv.querySelectorAll('.sy-vue-texte .sy-tk-kw').length > 0;   // ≡ texte coloré
      if (o.texte) { dv.querySelector('[data-symode="visuel"]').click(); await new Promise(r => setTimeout(r, 200)); const q = dv.querySelector('#sy-q'); const sv = dv.querySelector('#cdg-sy svg.sy-vue-svg');   // barres communes (54 / 87) : 🔍 recherche, zoom 1:1 / ⤢, thème, ⬇▾, ⧩ filtres, ℹ Infos, classement 🌳
        q.value = 'boite'; q.dispatchEvent(new Event('input')); o.cherche = sv.querySelectorAll('.sy-hit').length > 0 && /\/ /.test(dv.querySelector('#sy-q-n').textContent); q.value = ''; q.dispatchEvent(new Event('input'));
        dv.querySelector('[data-syzoom="1"]').click(); o.zoom = dv.querySelector('#sy-zoom-pct').textContent === '100 %'; dv.querySelector('[data-syzoom="tout"]').click();
        const th = dv.querySelector('#sy-theme'); th.value = 'sombre'; th.dispatchEvent(new Event('change')); o.theme = sv.classList.contains('sombre'); th.value = 'auto'; th.dispatchEvent(new Event('change'));
        dv.querySelector('#sy-export-bt').click(); o.menu = dv.querySelectorAll('#sy-export [data-syexp]').length === 5; dv.querySelector('#sy-export-bt').click();
        dv.querySelector('#sy-filtres-bt').click(); dv.querySelector('input[data-syf="comp"]').click(); await new Promise(r => setTimeout(r, 100)); o.filtre = dv.querySelector('#sy-filtres-bt').classList.contains('active'); dv.querySelector('button[data-syf="tout"]').click(); await new Promise(r => setTimeout(r, 200));
        await capDiagInfo(_capDiag.actif); await new Promise(r => setTimeout(r, 200)); o.infos = document.querySelector('#cap-detail-content').innerHTML.includes(_capSyVues.cle);   // ℹ Infos d'une vue (clé affichée)
        const cl = document.getElementById('cdg-classement'); cl.value = 'arbo'; cl.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 200)); o.arbo = dv.querySelectorAll('#cdg-liste .cdg-an').length > 0 && dv.querySelectorAll('.sy-vue-it').length === o.vues;   // classement 🌳 Arborescence
        const cl2 = document.getElementById('cdg-classement'); cl2.value = 'genre-origine'; cl2.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 100));
        dv.querySelector('[data-symode="texte"]').click(); await new Promise(r => setTimeout(r, 200)); }
      if (o.texte) { const f0 = dv.querySelector('.sy-vue-texte').style.fontSize; dv.querySelector('[data-syzoom="+"]').click(); o.texte = dv.querySelector('.sy-vue-texte').style.fontSize !== f0; dv.querySelector('[data-syzoom="0"]').click(); }   // taille du texte (− ⊡ +, Ctrl + molette)
      capNavOpen('home'); await new Promise(r => setTimeout(r, 300)); o.pastille = document.querySelectorAll('#cap-view-home .hm-case').length === 3 && !!document.querySelector('#cap-view-home .hm-tache[data-nav="ana:sysml"]');   // cases « Fichiers du projet » et tâche 🧩 de l'accueil (langue indifférente)
      return o; });
    if (r.n < 40 || r.rel < 20) throw new Error('modèle SysML : ' + r.n + ' éléments, ' + r.rel + ' liaisons');
    if (!r.vides) throw new Error('vues Capella non marquées sans données');
    if (!r.fic || !r.detail || !r.sante || !r.pastille) throw new Error('vue, détail, santé ou accueil SysML incomplets : ' + JSON.stringify(r));
    if (r.cherche === false || r.zoom === false || r.theme === false || r.menu === false || r.filtre === false || r.infos === false || r.arbo === false) throw new Error('barres communes de la vue 🔲 (recherche, zoom, thème, ⬇▾, ⧩, ℹ, 🌳) : ' + JSON.stringify(r));
    if (r.vues < 5 || !r.svg || !r.clic || !r.texte || !r.carte || !r.main || !r.pli || !r.note || !r.ico) throw new Error('vues calculées : ' + JSON.stringify(r)); });
  // ▦ Matrice d'un modèle SysML / UML : chaque préréglage applicable ouvert dans un onglet (liens des lecteurs, relation par chemin)
  const matFmt = async fmt => { const r = await p.evaluate(async () => { capNavOpen('matrix'); await new Promise(r => setTimeout(r, 200));
      const P = capMxPresets().filter(x => x.ok), o = { fmt: capMxFormat(), n: P.length, liens: 0 };
      for (const x of P) { _capMx.tabs.push(capMxTabDePreset(x)); _capMx.idx = _capMx.tabs.length - 1; capRenderMatrix(); o.liens += _capMxX.nl; }
      o.cellules = document.querySelectorAll('#cmx-cells .cmx-c').length; return o; });
    if (r.fmt !== fmt || !r.n || !r.liens) throw new Error('▦ Matrice ' + fmt + ' : ' + JSON.stringify(r)); };
  if (fs.existsSync(sysml) && (!FORMAT || FORMAT === 'sysml2')) await step('▦ Matrice : préréglages SysML v2', () => matFmt('sysml2'));
  // 🧬 UML / SysML v1 (88) : projet Cameo ouvert à la place du modèle affiché, vue 🧬, détail (stéréotype), diagrammes de Cameo dessinés,
  // icônes du lecteur ; puis un .uml avec son .notation déposés ensemble (diagrammes de Papyrus)
  const uml = path.join(models, 'uml');
  if (fs.existsSync(path.join(uml, 'Drone-2026x.mdzip')) && (!FORMAT || FORMAT === 'uml')) await step('🧬 UML / SysML v1 : ouverture (.mdzip, .uml + .notation), vue, détail, santé, diagrammes, icônes, accueil', async () => {
    await p.setInputFiles('#capella-file-input', path.join(uml, 'Drone-2026x.mdzip')); await p.waitForTimeout(300);
    await p.click('#cap-replace-ov [data-c="go"]');
    await p.waitForFunction(() => typeof _capSysml !== 'undefined' && _capSysml.format === 'sysml1' && capLoaded, null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(async () => { const o = { n: capAllElements.length, rel: MODEL.relations.filter(x => String(x.type).startsWith('sysml:')).length, vides: capNavVides().has('functions') && capNavVides().has('ana:sysml') && !capNavVides().has('ana:uml') };
      capNavOpen('ana:uml'); await new Promise(r => setTimeout(r, 300)); const box = document.querySelector('#ana-box [data-hold="uml"]');
      for (const v of ['els', 'lia', 'diag']) { _capSy.view = v; capRenderUml(box); } _capSy.view = 'els'; capRenderUml(box);
      o.lignes = box.querySelectorAll('tbody tr').length;
      const bloc = capAllElements.find(e => e.typeName === 'Block'); capOpenDetail(bloc.id); await new Promise(r => setTimeout(r, 200));
      o.detail = /«Block»/.test(document.querySelector('#cap-detail').innerText) || /Block/.test(document.querySelector('#cap-detail').innerText);
      o.ico = /<svg class="ico"/.test(capIco(bloc.id)) && /<svg class="ico"/.test(capIcoType('Requirement'));
      o.sante = capSanteCompute().checks.some(c => c.view === 'ana:uml');
      _capSyVues.mode = 'visuel';   // mode gardé d'une vue à l'autre (la partie SysML finit en texte)
      capNavOpen('diag'); await new Promise(r => setTimeout(r, 300)); const dv = document.getElementById('cap-view-diag'); o.vues = dv.querySelectorAll('.sy-vue-it').length;
      const it = dv.querySelector('.sy-vue-it'); if (it) { it.click(); await new Promise(r => setTimeout(r, 300)); } const svg = dv.querySelector('svg.sy-vue-svg'); o.svg = svg ? svg.querySelectorAll('[data-sem]').length : 0;
      o.cameo = !!(svg && svg.querySelector('.s1-forme, .s1-cadre'));
      capNavOpen('home'); await new Promise(r => setTimeout(r, 300)); o.pastille = document.querySelectorAll('#cap-view-home .hm-case').length === 3 && !!document.querySelector('#cap-view-home .hm-tache[data-nav="ana:uml"]');
      return o; });
    if (r.n < 10 || r.rel < 3 || !r.vides || !r.lignes || !r.detail || !r.ico || !r.sante || r.vues < 2 || !r.svg || !r.cameo || !r.pastille) throw new Error('UML / SysML v1 : ' + JSON.stringify(r));
    await matFmt('uml');   // ▦ Matrice : préréglages UML / SysML v1
    // .uml et .notation déposés ensemble : diagrammes de Papyrus
    await p.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.id = 'smoke-uml'; i.onchange = () => capUmlOuvrirFichiers([...i.files], true); document.body.appendChild(i); });
    await p.setInputFiles('#smoke-uml', [path.join(uml, 'Bibliotheque.uml'), path.join(uml, 'Bibliotheque.notation')]);
    await p.waitForFunction(() => _capSysml.format === 'uml' && capLoaded, null, { timeout: 60000 }); await p.waitForTimeout(400);
    const pap = await p.evaluate(() => capSyVuesListe().filter(v => v.origine === 'papyrus').length);
    if (pap !== 5) throw new Error('diagrammes de Papyrus : ' + pap); });
  // 📎 Projet UML sur plusieurs fichiers (tests/models/uml-multi) : modèle principal trouvé, références vers les autres fichiers relevées
  const multi = path.join(models, 'uml-multi');
  if (fs.existsSync(path.join(multi, 'Systeme.uml')) && (!FORMAT || FORMAT === 'uml')) await step('📎 UML sur plusieurs fichiers : modèle principal, références relevées (non lu, absent, format), contrôle 🩺', async () => {
    await p.setInputFiles('#smoke-uml', ['lib/Types.uml', 'Sous-systeme.uml', 'Systeme.uml', 'Profil.profile.uml'].map(f => path.join(multi, f)));
    await p.waitForFunction(() => _capSysml.nom === 'Systeme.uml' && capLoaded, null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ f: capUmlExt().fichiers.map(f => f.nom + ':' + f.etat).sort().join(' '), chk: (capSyChecks('uml').find(s => s.icon === '📎') || { items: [] }).items.length }));
    if (r.f !== 'Journal.mdxml:format Profil.profile.uml:nonlu Sous-systeme.uml:nonlu Station.uml:absent Types.uml:nonlu' || r.chk !== 8) throw new Error('relevé inattendu : ' + JSON.stringify(r)); });
  // 🔲 Relation Map de Cameo (90) : arbre dessiné, clic → détail, ℹ Infos, préréglage de la 🗺 Relation Map
  if (fs.existsSync(path.join(uml, 'Cartes-cameo.xmi')) && (!FORMAT || FORMAT === 'uml')) await step('🔲 Relation Map de Cameo : arbre, ⊕ / ⊖, légende, diagramme membre, détail, ℹ Infos, onglet de 🗺 Relation Map', async () => {
    await p.setInputFiles('#capella-file-input', path.join(uml, 'Cartes-cameo.xmi')); await p.waitForTimeout(300);
    if (await p.$('#cap-replace-ov [data-c="go"]')) await p.click('#cap-replace-ov [data-c="go"]');
    await p.waitForFunction(() => _capSysml.nom === 'Cartes-cameo.xmi' && capLoaded, null, { timeout: 60000 }); await p.waitForTimeout(300);
    const r = await p.evaluate(async () => { const o = {}, att = () => new Promise(r => setTimeout(r, 300)), dv = document.getElementById('cap-view-diag');
      _capSyVues.mode = 'visuel'; capNavOpen('diag'); await att();
      const v = capSyVuesListe().find(x => x.nom === 'Carte du système'); capSyVueOuvrir(v.cle); await att();
      const nb = () => dv.querySelectorAll('svg.sy-rm-svg .sy-rm-n').length;
      o.noeuds = nb(); o.legende = dv.querySelectorAll('svg.sy-rm-svg .sy-rm-leg text').length;
      dv.querySelector('svg.sy-rm-svg .sy-rm-pli[data-etat="replie"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await att(); o.deplie = nb();
      dv.querySelector('[data-sytab-plis]').click(); await att(); o.retour = nb();
      const dg = dv.querySelector('svg.sy-rm-svg [data-sydiag]'), cle = dg.dataset.sydiag; dg.dispatchEvent(new MouseEvent('click', { bubbles: true })); await att(); o.diag = _capSyVues.cle === cle;
      capSyVueOuvrir(v.cle); await att();
      dv.querySelectorAll('svg.sy-rm-svg .sy-rm-n')[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); await att(); o.detail = document.getElementById('cap-detail').style.display === 'flex';
      dv.querySelector('[data-sytab-info]').click(); await att(); o.info = /Namespace::member/.test(document.getElementById('cap-detail-content').textContent);
      dv.querySelector('[data-symode="texte"]').click(); await att(); o.texte = /\[Types des parts\] Moteur/.test((dv.querySelector('.sy-vue-texte') || {}).textContent || ''); dv.querySelector('[data-symode="visuel"]').click(); await att();
      dv.querySelector('[data-sytab-rm]').click(); await new Promise(r => setTimeout(r, 900));
      o.rm = currentMode === 'default' && S.ctx === 'crt_systeme' && S.depth === 2 && S.relF['sysml:composition'] === true && /Carte du système/.test(rmViews.tabs[rmViews.idx].name);
      capNavOpen('home'); await att();
      return o; });
    if (r.noeuds !== 30 || r.legende !== 3 || r.deplie !== 32 || r.retour !== 30 || !r.diag || !r.detail || !r.info || !r.texte || !r.rm) throw new Error('Relation Map de Cameo : ' + JSON.stringify(r)); });
  // 🔲 Tableaux et matrices de Cameo (90) : AIDA (CC BY-SA 4.0, tests d'Arcature) lu dans le dépôt Arcature voisin s'il est là
  const aida = path.join(__dirname, '..', '..', 'arcature', 'tests', 'models', 'sysml1', 'AIDA_Reference_Architecture_V2.3.2.mdzip');
  if (fs.existsSync(aida) && (!FORMAT || FORMAT === 'uml')) await step('🔲 Tableaux et matrices de Cameo (AIDA d\'Arcature) : liste sans vues calculées, étiquette « S », tableau trié et filtré, matrice, détail, ℹ Infos, ▤ Tableau', async () => {
    await p.setInputFiles('#capella-file-input', aida); await p.waitForTimeout(300);
    await p.click('#cap-replace-ov [data-c="go"]');
    await p.waitForFunction(() => _capSysml.format === 'sysml1' && /AIDA/.test(_capSysml.nom) && capLoaded, null, { timeout: 120000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(async () => { const o = {}, att = () => new Promise(r => setTimeout(r, 250)), dv = document.getElementById('cap-view-diag');
      _capSyVues.mode = 'visuel'; capNavOpen('diag'); await att();
      const tabs = capSyVuesListe().filter(v => v.tableau); o.tabs = tabs.length; o.groupes = /Matrice|Matrix/.test((dv.querySelector('#cdg-liste') || {}).textContent || '');   // explorateur commun (54)
      const ico = t => (dv.querySelector(`.cdg-it[data-uid="${CSS.escape('sy:' + t.cle)}"] .cdg-ico`) || {}).innerHTML || '';
      o.calc = capSyVuesListe().some(v => v.origine === 'calculee');
      o.s = tabs.filter(t => /^SysML |Requirement (Table|Matrix)/.test(t.type)).every(t => ico(t).includes('data-sysml')) && tabs.filter(t => /^(Dependency Matrix|Generic Table|Instance Table)$/.test(t.type)).every(t => !ico(t).includes('data-sysml'));
      capSyVueOuvrir(tabs.find(v => v.nom === 'Safety Requirement').cle); await att();
      o.lignes = dv.querySelectorAll('.sy-tab-t tbody tr').length;
      dv.querySelectorAll('.sy-tab-t thead th')[1].click(); await att(); o.tri = /▲/.test(dv.querySelectorAll('.sy-tab-t thead th')[1].textContent);
      const q = dv.querySelector('[data-sytab-q]'); q.value = 'Motor'; q.dispatchEvent(new Event('input')); await att(); o.filtre = dv.querySelectorAll('.sy-tab-t tbody tr').length;
      dv.querySelector('.sy-tab-t tbody .sy-tab-ref:not(.sy-tab-abs)').click(); await att(); o.detail = document.getElementById('cap-detail').style.display === 'flex';
      capSyVueOuvrir(tabs.find(v => v.nom === 'Basic Unit Categories').cle); await att();
      o.vert = dv.querySelectorAll('.sy-tab-m thead .sy-tab-vert').length; o.rel = dv.querySelectorAll('.sy-tab-m td.sy-tab-rel').length;
      dv.querySelector('[data-sytab-relies]').click(); await att(); o.relies = dv.querySelectorAll('.sy-tab-m tbody tr').length;
      dv.querySelector('[data-sytab-info]').click(); await att(); o.info = /Package Import/.test(document.getElementById('cap-detail-content').textContent);
      const cl = document.getElementById('cdg-classement'); cl.value = 'arbo'; cl.dispatchEvent(new Event('change', { bubbles: true })); await att(); o.projet = dv.querySelectorAll('#cdg-liste .cdg-an').length > 20; cl.value = 'genre-origine'; cl.dispatchEvent(new Event('change', { bubbles: true })); await att();
      capSyVueOuvrir(tabs.find(v => v.nom === 'Safety Requirement').cle); await att();
      dv.querySelector('[data-sytab-table]').click(); await new Promise(r => setTimeout(r, 600));
      o.table = capCurrentView === 'table' && capTableRows().length === 59 && capTableVisibleCols.some(k => /^cameo:/.test(k)) && !!document.querySelector('[data-tc="lignes"]');
      return o; });
    if (r.tabs !== 20 || !r.groupes || r.calc || !r.s || r.lignes !== 59 || !r.tri || !r.filtre || r.filtre >= 59 || !r.detail || r.vert !== 17 || r.rel !== 16 || r.relies < 1 || !r.info || !r.projet || !r.table)
      throw new Error('tableaux de Cameo : ' + JSON.stringify(r)); });
  // 🧱 Blocs & ports (◎ Voisinage), ƒ Activités & flux (⇶ Couloirs) (92), 🧾 Exigences SysML (93) sur Satellite-sysml1.xmi : famille de vues, toutes les présentations,
  // aller au bloc distant, ouverture depuis le panneau de détail
  if (fs.existsSync(path.join(uml, 'Satellite-sysml1.xmi')) && (!FORMAT || FORMAT === 'uml')) await step('🧱 Blocs & ports, ƒ Activités & flux, 🧾 Exigences SysML, 🚦 Machines à états, 🎬 Interactions, 🎯 Cas d\'utilisation, ⇶ Traçabilité par niveaux, 🗃 Interfaces, ⚖ Budgets, 🔒 Paramétrique (UML / SysML v1)', async () => {
    await p.setInputFiles('#capella-file-input', path.join(uml, 'Satellite-sysml1.xmi')); await p.waitForTimeout(300);
    await p.click('#cap-replace-ov [data-c="go"]');
    await p.waitForFunction(() => capLoaded && _capSysml.format === 'sysml1' && _capSysml.lecture.elements().some(e => e.nom === 'Satellite'), null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(async () => { const o = { grp: !capNavEff().vides.has('grp:uml') };
      const att = () => new Promise(r => setTimeout(r, 250)), box = k => document.querySelector(`#ana-box [data-hold="${k}"]`);
      for (const k of ['umlblk', 'umlact']) { capNavOpen('ana:' + k); await att(); const b = box(k); o[k] = { ouverture: b.querySelectorAll(k === 'umlact' ? '.cul-svg [data-det]' : '.fex-blk, .ubc').length, puces: document.querySelectorAll('#cap-flux-tabs [data-open]').length };
        for (const v of [k === 'umlblk' ? 'focus' : 'lanes', 'line', 'matrix', 'diag', 'block']) { b.querySelector(`[data-pv="${v}"]`).click(); await att(); o[k][v] = b.querySelector('#ub-main').innerText.length > 20 || !!b.querySelector('#ub-main .cul-svg'); }
        o[k].blocs = b.querySelectorAll('.fex-blk, .ubc').length; }
      { const b = box('umlblk'); b.querySelector('[data-pv="focus"]').click(); await att(); const c1 = b.querySelector('#ub-focus').value, v = b.querySelector('.cul-svg [data-uf]');   // ◎ Voisinage : un voisin passe au centre
        if (v) { v.dispatchEvent(new MouseEvent('click', { bubbles: true })); await att(); o.voisin = b.querySelector('#ub-focus').value !== c1 && !!b.querySelector('#ub-main .cul-svg'); }
        b.querySelector('[data-pv="block"]').click(); await att(); }
      const go = box('umlblk').querySelector('[data-go]'); if (go) { capNavOpen('ana:umlblk'); await att(); box('umlblk').querySelector('[data-go]').click(); await att(); o.go = !!box('umlblk').querySelector('#ub-back'); }
      capNavOpen('ana:umlreq'); await att(); const q = box('umlreq'); o.req = q.querySelectorAll('tbody tr').length;
      for (const v of ['tree', 'cov', 'mx', 'diag', 'list']) { q.querySelector(`[data-xv="${v}"]`).click(); await att(); o['req_' + v] = q.innerText.length > 50; }
      const cam = _capSysml.lecture.elements().find(e => e.nom === 'Camera'); capOpenDetail(cam.id); await att(); const btn = [...document.querySelectorAll('#cap-detail button')].find(b => /◧/.test(b.textContent));
      if (btn) { btn.click(); await att(); o.det = capAnaSub === 'umlblk' && !!box('umlblk').querySelector('.fex-blk.fex-flash, .fex-blk, .ubc.fex-flash, .ubc'); }
      for (const k of ['umlstm', 'umlseq']) { capNavOpen('ana:' + k); await att(); const b = box(k); o[k] = b.querySelectorAll('tbody tr').length;
        for (const v of ['one', 'dg', 'mx', 'diag', 'list']) { b.querySelector(`[data-xv="${v}"]`).click(); await att(); o[k + '_' + v] = v === 'dg' ? !!b.querySelector('.sc-svg svg .sc-ref') : b.innerText.length > 50; } }
      const sm = _capSysml.lecture.elements().find(e => e.nom === 'Camera modes'); capOpenDetail(sm.id); await att();
      const b2 = [...document.querySelectorAll('#cap-detail button')].find(b => /🚦/.test(b.textContent)); if (b2) { b2.click(); await att(); o.stm = capAnaSub === 'umlstm' && /Standby/.test(box('umlstm').innerText); }
      capNavOpen('ana:umlucs'); await att(); o.ucs = box('umlucs').querySelectorAll('tbody tr').length; for (const v of ['mx', 'diag', 'list']) { box('umlucs').querySelector(`[data-xv="${v}"]`).click(); await att(); }
      capNavOpen('ana:umltrace'); await att(); const tr = box('umltrace'); o.niveaux = tr.querySelectorAll('tbody tr').length;
      tr.querySelector('[data-xv="graph"]').click(); await att(); o.graphe = box('umltrace').querySelectorAll('svg rect').length; for (const v of ['list', 'diag', 'cov']) { box('umltrace').querySelector(`[data-xv="${v}"]`).click(); await att(); }
      capNavOpen('ana:umlicd'); await att(); o.icd = box('umlicd').querySelectorAll('tbody tr').length; for (const v of ['icd', 'diag', 'list']) { box('umlicd').querySelector(`[data-xv="${v}"]`).click(); await att(); }
      capNavOpen('ana:umlbudget'); await att(); o.budget = box('umlbudget').querySelectorAll('tbody tr').length; o.marge = /⛔/.test(box('umlbudget').innerText) || (() => { const s = box('umlbudget').querySelector('select[data-xs="g"]'); s.value = 'mass'; s.dispatchEvent(new Event('change')); return /⛔/.test(box('umlbudget').innerText); })();
      for (const v of ['list', 'diag', 'tree']) { box('umlbudget').querySelector(`[data-xv="${v}"]`).click(); await att(); }
      capNavOpen('ana:umlpar'); await att(); o.par = box('umlpar').querySelectorAll('tbody tr').length; for (const v of ['bind', 'ct', 'diag', 'cb']) { box('umlpar').querySelector(`[data-xv="${v}"]`).click(); await att(); }
      o.sante = ['ana:umlblk', 'ana:umlact', 'ana:umlreq', 'ana:umlstm', 'ana:umlseq', 'ana:umlucs', 'ana:umltrace', 'ana:umlicd', 'ana:umlbudget', 'ana:umlpar'].every(k => capSanteCompute().checks.some(c => c.view === k && c.n > 0));
      return o; });
    const ok = r.grp && r.umlblk.blocs === 4 && r.umlblk.ouverture === 4 && r.umlact.blocs >= 9 && r.umlact.ouverture >= 5 && r.voisin && r.umlblk.puces === 8 && ['line', 'matrix', 'diag', 'block'].every(v => r.umlblk[v] && r.umlact[v]) && r.umlblk.focus && r.umlact.lanes && r.go && r.req === 8 && r.det && r.sante && ['tree', 'cov', 'mx', 'diag', 'list'].every(v => r['req_' + v])
      && r.umlstm === 2 && r.umlseq === 2 && r.ucs === 4 && r.niveaux === 5 && r.icd === 5 && r.budget >= 5 && r.marge && r.par === 2 && r.graphe >= 15 && r.stm && ['umlstm', 'umlseq'].every(k => ['one', 'dg', 'mx', 'diag', 'list'].every(v => r[k + '_' + v]));
    if (!ok) throw new Error('vues UML / SysML v1 : ' + JSON.stringify(r)); });
  // 🖼 Diagrammes calculés (98) sur Ascenseur-uml.xmi : machine à états (composites, régions, pseudo-états, contournements),
  // diagramme de séquence (fragments combinés imbriqués, référence, exécutions, invariant), clic → détail, référence → interaction, export SVG
  if (fs.existsSync(path.join(uml, 'Ascenseur-uml.xmi')) && (!FORMAT || FORMAT === 'uml')) await step('🖼 Diagrammes calculés : 🚦 machine à états et 🎬 interaction (Ascenseur-uml.xmi)', async () => {
    await p.setInputFiles('#capella-file-input', path.join(uml, 'Ascenseur-uml.xmi')); await p.waitForTimeout(300);
    const rep = await p.$('#cap-replace-ov [data-c="go"]'); if (rep) await rep.click();
    await p.waitForFunction(() => capLoaded && _capSysml.nom === 'Ascenseur-uml.xmi', null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(async () => { const o = {}, att = () => new Promise(r => setTimeout(r, 250)), box = k => document.querySelector(`#ana-box [data-hold="${k}"]`);
      const M = capUmlEtats().machines[0]; capUmlEiOuvrir(M.id, 'dg'); await att(); const b = box('umlstm'), svg = b.querySelector('.sc-svg svg');
      o.etats = svg ? svg.querySelectorAll('.sc-ref').length : 0; o.composites = svg ? svg.querySelectorAll('rect[rx="12"]').length : 0;
      o.regions = svg ? svg.querySelectorAll('line[stroke-dasharray="7,5"]').length : 0; o.zoom = (b.querySelector('[data-udz="1"]').click(), await att(), box('umlstm')._ust.zoom > 1);
      const st = [...box('umlstm').querySelectorAll('.sc-svg .sc-ref')].find(g => g.dataset.ref === 'asc_st_mvt'); if (st) { st.dispatchEvent(new MouseEvent('click', { bubbles: true })); await att(); }
      o.detail = !!st && /En mouvement/.test((document.querySelector('#cap-detail') || {}).innerText || '');
      const I = capUmlInteractions().list.find(x => x.name === 'Appel de la cabine'); capUmlEiOuvrir(I.id, 'dg'); await att(); const q = box('umlseq'), s2 = q.querySelector('.sc-svg svg');
      o.cadres = s2 ? (s2.innerHTML.match(/>(alt|opt|loop|par)</g) || []).length : 0; o.exec = s2 ? s2.querySelectorAll('rect[width="10"]').length : 0;
      const iu = q.querySelector('.sc-svg .sc-iu'); if (iu) { iu.dispatchEvent(new MouseEvent('click', { bubbles: true })); await att(); } o.ref = box('umlseq')._usq.sel === 'asc_int2';
      o.svg = /^<svg xmlns/.test(capUmlStmSvg(M).svg) && /^<svg xmlns/.test(capUmlSeqSvg(I).svg);
      return o; });
    if (!(r.etats >= 30 && r.composites === 3 && r.regions >= 2 && r.zoom && r.detail && r.cadres === 4 && r.exec >= 2 && r.ref && r.svg)) throw new Error('diagrammes calculés : ' + JSON.stringify(r)); });
  if (fs.existsSync(path.join(uml, 'Boutique-uml.xmi')) && (!FORMAT || FORMAT === 'uml')) await step('📦 Paquetages & classes (UML logiciel)', async () => {
    await p.setInputFiles('#capella-file-input', path.join(uml, 'Boutique-uml.xmi')); await p.waitForTimeout(300);
    await p.click('#cap-replace-ov [data-c="go"]');
    await p.waitForFunction(() => capLoaded && _capSysml.format === 'uml' && _capSysml.lecture.elements().some(e => e.nom === 'Boutique'), null, { timeout: 60000 }); await p.waitForTimeout(400);
    const r = await p.evaluate(async () => { const att = () => new Promise(r => setTimeout(r, 250)); capNavOpen('ana:umlsoft'); await att(); const b = document.querySelector('#ana-box [data-hold="umlsoft"]');
      const o = { pkg: b.querySelectorAll('tbody tr').length, cycle: /↻/.test(b.innerText) };
      for (const v of ['cls', 'dep', 'diag', 'pkg']) { b.querySelector(`[data-xv="${v}"]`).click(); await att(); o['v_' + v] = b.innerText.length > 50; }
      o.sante = capSanteCompute().checks.some(c => c.view === 'ana:umlsoft' && c.n > 0); return o; });
    if (r.pkg !== 5 || !r.cycle || !r.v_cls || !r.v_dep || !r.v_diag || !r.sante) throw new Error('UML logiciel : ' + JSON.stringify(r)); });
  await browser.close();
  if (errs.length) { console.error('\n✖ ' + errs.length + ' erreur(s) :\n  - ' + errs.slice(0, 30).join('\n  - ')); process.exit(1); }
  console.log('\n✔ Aucune erreur.');
})();
