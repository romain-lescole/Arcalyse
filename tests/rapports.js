#!/usr/bin/env node
/**
 * 🧩 Modèles de rapport génériques (100-rapports-sysml.js) : génère les plans SSS / SSDD SysML à adapter et le modèle
 * « ✚ Nouveau modèle » sur les modèles SysML de test, et vérifie ce qu'ils doivent contenir (sujet, parts, fonctions
 * allouées avec leurs entrées / sorties, ports et connexions, exigences avec ce qui les satisfait, diagrammes du lecteur).
 * Vérifie aussi qu'un modèle Capella garde ses plans et son ✚ Nouveau modèle d'origine.
 *
 * Prérequis : comme tests/oracles.js (Playwright ; CHROMIUM_PATH=… pour un Chromium déjà installé), après node build.js.
 * Lancement : node tests/rapports.js
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..'), page = path.join(ROOT, 'dist', 'arcalyse-fr.html'), M = path.join(__dirname, 'models');
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js'); process.exit(2); }

/** Génère dans la page un plan (sss, ssdd) ou le modèle par défaut (nouveau) et renvoie un résumé à plat du rapport.
 * @param {string} k - 'sss' | 'ssdd' | 'nouveau' @returns {Object} {sujet, lignes, erreurs} */
function generer(k) {
  capShowView('home'); _capHomeUi.tab = 'rap';
  const m = k === 'nouveau' ? capRapNouveau() : capRapModeleSs(k);
  capHomeRender(); capRapGenerer(m); capHomeRender();
  const d = _capHome.dossiers[_capHome.dossiers.length - 1], L = [];
  const w = (l, ind) => l.forEach(x => {
    if (x.k === 'chap') { L.push(ind + '§ ' + x.titre); w(x.blocs, ind + '  '); }
    else if (x.k === 'liste') { const t = capDosListeLignes(x); L.push(ind + '▤ ' + x.titre + ' : ' + t.rows.map(r => r.c.filter(Boolean).join(' | ')).join(' ;; ')); }
    else if (x.k === 'diag') L.push(ind + '🔲 ' + x.ref.nom);
    else if (x.k === 'el') L.push(ind + '◆ ' + x.ref.nom);
    else if (x.k === 'txt') L.push(ind + '¶ ' + x.txt);
  });
  w(d.blocs, '');
  return { sujet: m.sujet ? m.sujet.nom : '', texte: L.join('\n') };
}

const CAS = [
  { modele: path.join(M, 'uml', 'Satellite-sysml1.xmi'), attendus: {
    ssdd: ['§ cam', '§ Acquire image', 'Sorties de « Acquire image » : image | OUT | Image', 'Ports, pins et paramètres de « cam » : img | OUT | ImageIF',
      'video | Camera.img | OBC.imgIn | Image, ImageReady', '§ Process image', '§ Camera modes', '§ Acquisition sequence', 'Resolution | SAT-1.1 | Camera | Image quality test'],
    sss: ['Cas d\'utilisation de « Satellite » : Acquire images', 'États de « Camera modes » : Off', 'Ports de « Satellite » : down | OUT | ImageIF',
      'Exigences repérées : Communications informatiques : Downlink', 'Méthode de qualification de chaque exigence : ', 'Resolution | SAT-1.1 | Image quality test'],
    nouveau: ['§ cam', '§ Acquire image', 'Exigences : Imaging | SAT-1'] }, sujet: 'Satellite' },
  { modele: path.join(M, 'VehiculeDemo.sysml'), attendus: {
    ssdd: ['🔲 Interconnexion — Vehicule', 'Composants : boite | Boite', '§ boite', 'entree | IN | ArbrePort | Moteur.arbre', '§ demarrage', '§ etats',
      'Connexions internes de « vehicule » : moteurs.arbre ↔ boite.entree | Moteur.arbre | Boite.entree', 'masseVehicule | vehicule'],
    sss: ['🔲 États — EtatsMoteur', 'États de « etats » : arret', '🔲 Flux d\'actions — Demarrage', 'masse | 1800 [kg]', 'MasseMax | R-001 | La masse totale ne dépasse pas la limite.'] }, sujet: 'vehicule' },
];

(async () => {
  const exe = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let ko = 0;
  const ouvrir = async modele => {
    const p = await browser.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'));
    await p.setInputFiles('#capella-file-input', modele);
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
    return { p, errs };
  };
  for (const c of CAS) {
    const { p, errs } = await ouvrir(c.modele), nom = path.basename(c.modele);
    for (const k of Object.keys(c.attendus)) {
      const r = await p.evaluate(generer, k), manque = c.attendus[k].filter(a => !r.texte.includes(a));
      if (r.sujet !== c.sujet) manque.unshift(`sujet « ${c.sujet} » (obtenu : « ${r.sujet} »)`);
      if (manque.length) { ko++; console.log(`✖ ${nom} › ${k} : absent du rapport :\n    ` + manque.join('\n    ')); }
      else console.log(`✔ ${nom} › ${k}`);
    }
    if (errs.length) { ko++; console.log(`✖ ${nom} : erreurs JavaScript :\n    ` + errs.join('\n    ')); }
    await p.close();
  }
  // Capella : plans d'origine, ✚ Nouveau modèle Capella, pas de bouton des plans SysML
  {
    const { p, errs } = await ouvrir(path.join(M, 'In-Flight_Entertainment_System.capella'));
    const r = await p.evaluate(() => { capShowView('home'); _capHomeUi.tab = 'rap'; capHomeRender();
      const sy = !!document.querySelector('#cap-view-home [data-da="rap-sss"]'), m = capRapNouveau();
      return { sy, types: JSON.stringify(m.blocs).match(/"type":"(\w+)"/g) }; });
    const ok = !r.sy && r.types && r.types.includes('"type":"fn"') && r.types.includes('"type":"node"');
    if (!ok || errs.length) { ko++; console.log('✖ IFE (Capella) : ' + JSON.stringify(r) + ' ' + errs.join(' ; ')); }
    else console.log('✔ IFE (Capella) : plans et ✚ Nouveau modèle d\'origine');
    await p.close();
  }
  await browser.close();
  console.log(ko ? `\n✖ ${ko} échec(s)` : '\n✔ Rapports génériques conformes.');
  process.exit(ko ? 1 : 0);
})();
