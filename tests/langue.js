#!/usr/bin/env node
/**
 * 🌐 Changement de langue (version multilingue) : un aller-retour FR → EN → FR doit garder tout le travail — modèle (et son
 * lecteur pour SysML / UML / ReqIF), dossiers et rapports, commentaires de revue, dossier ouvert, vue affichée.
 *
 * Prérequis : node build.js --lang multi, puis Playwright (comme tests/oracles.js ; CHROMIUM_PATH=… pour un Chromium déjà installé).
 * Lancement : node tests/langue.js
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const page = path.join(__dirname, '..', 'dist', 'arcalyse-multi.html'), M = path.join(__dirname, 'models');
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js --lang multi'); process.exit(2); }
const MODELES = [path.join(M, 'In-Flight_Entertainment_System.capella'), path.join(M, 'uml', 'Satellite-sysml1.xmi'), path.join(M, 'VehiculeDemo.sysml'), path.join(M, 'reqif', 'ExigencesImages.reqifz')];

/** État observé dans la page. @returns {Object} */
function etat() {
  return { lang: document.documentElement.lang, elements: capAllElements.length, format: capRapFormat(), lecteur: !!(_capSysml && _capSysml.lecture),
    dossiers: _capHome.dossiers.map(d => d.titre).join(' | '), ouvert: _capDosUi.cur, revue: _capRev.comments.map(c => c.text).join(' | '),
    vue: capCurrentView, onglet: _capHomeUi.tab };
}

(async () => {
  const exe = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let ko = 0;
  for (const m of MODELES) {
    const p = await browser.newPage(), errs = [], nom = path.basename(m);
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:') + '?lang=fr');
    await p.setInputFiles('#capella-file-input', m);
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
    await p.evaluate(() => {
      capShowView('home'); _capHomeUi.tab = 'rap';
      const md = capRapFormat() === 'capella' ? capRapNouveau() : capRapModeleSs('ssdd'); capRapGenerer(md);
      _capRev.comments.push({ id: 'c-langue', text: 'commentaire à garder', targets: [], date: new Date().toISOString(), status: 'open' }); capRevSave();
      capHomeRender();
    });
    const avant = await p.evaluate(etat);
    const basculer = async () => {
      await Promise.all([p.waitForNavigation({ timeout: 60000 }), p.click('#b-lang')]);
      await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
      await p.waitForFunction(() => capCurrentView === 'home' && _capHomeUi.tab === 'rap', null, { timeout: 20000 }).catch(() => {});
      return p.evaluate(etat);
    };
    const en = await basculer(), fr = await basculer();
    const ecarts = [];
    for (const [lib, e, lang] of [['EN', en, 'en'], ['FR', fr, 'fr']]) {
      if (e.lang !== lang) ecarts.push(`${lib} : langue ${e.lang}`);
      for (const k of ['elements', 'format', 'lecteur', 'dossiers', 'ouvert', 'revue', 'vue', 'onglet']) if (k !== 'lecteur' && e[k] !== avant[k]) ecarts.push(`${lib} : ${k} « ${e[k]} » au lieu de « ${avant[k]} »`);
      if (avant.format !== 'capella' && !e.lecteur) ecarts.push(`${lib} : lecteur ${avant.format} absent`);
    }
    if (errs.length) ecarts.push('erreurs JavaScript : ' + errs.join(' ; '));
    if (ecarts.length) { ko++; console.log(`✖ ${nom} :\n    ` + ecarts.join('\n    ')); }
    else console.log(`✔ ${nom} : modèle, ${avant.dossiers.split(' | ').length} dossier(s), revue et vue gardés (FR → EN → FR)`);
    await p.close();
  }
  // Plusieurs modèles ouverts ensemble (comme un 📁 dossier) : le modèle principal choisi est rouvert sans nouvelle question
  {
    const p = await browser.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:') + '?lang=fr');
    const F = ['Satellite-sysml1.xmi', 'Rover-cameo.xmi', 'Drone-2026x.mdzip'].map(n => ({ n, b64: fs.readFileSync(path.join(M, 'uml', n)).toString('base64') }));
    await p.evaluate(F => capUmlOuvrirFichiers(F.map(x => { const s = atob(x.b64), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return new File([o], x.n); })), F);
    await p.locator('button.cw-choix-b', { hasText: 'Drone-2026x.mdzip' }).click({ timeout: 20000 });
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 60000 });
    await Promise.all([p.waitForNavigation({ timeout: 60000 }), p.click('#b-lang')]);
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 60000 }).catch(() => {});
    const r = await p.evaluate(() => ({ nom: capCurrentFileName, question: !!document.querySelector('button.cw-choix-b') }));
    if (r.nom !== 'Drone-2026x.mdzip' || r.question || errs.length) { ko++; console.log('✖ dossier de plusieurs modèles : ' + JSON.stringify(r) + ' ' + errs.join(' ; ')); }
    else console.log('✔ dossier de plusieurs modèles : Drone-2026x.mdzip rouvert sans redemander le choix');
    await p.close();
  }
  await browser.close();
  console.log(ko ? `\n✖ ${ko} échec(s)` : '\n✔ Changement de langue sans perte.');
  process.exit(ko ? 1 : 0);
})();
