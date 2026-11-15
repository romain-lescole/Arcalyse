#!/usr/bin/env node
/**
 * 🔄 Suivi du fichier du modèle (40) pour tous les formats : Capella, SysML v2, UML / SysML v1, ReqIF.
 *
 * Pour chaque format, le modèle de test est ouvert, puis une version modifiée (fabriquée à la volée, rien n'est écrit sur le
 * disque) apparaît « sur le disque » par un accès direct simulé : la vérification la détecte, le delta compte exactement les
 * changements faits (numéros de ligne ignorés), la mise à jour s'applique, la vue affichée est gardée, ⇄ Avant / après garde la
 * version d'avant, et une nouvelle vérification trouve le modèle à jour. Puis « Charger une mise à jour » avec un fichier choisi,
 * refus d'un fichier d'un autre format, et ⚖ Comparaison de versions avec une version .xmi.
 *
 * Lancement : node tests/suivi.js   (après node build.js ; Playwright, CHROMIUM_PATH=… pour un Chromium déjà installé)
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const M = path.join(__dirname, 'models'), page = path.join(__dirname, '..', 'dist', 'arcalyse-fr.html');
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js'); process.exit(2); }
let echecs = 0;
const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) echecs++; };
const lire = f => fs.readFileSync(path.join(M, f), 'utf8');

/** Cas : fichier d'origine, version modifiée, delta attendu. */
const CAS = [
  { fmt: 'Capella', nom: 'In-Flight_Entertainment_System.capella', texte: lire('In-Flight_Entertainment_System.capella'),
    modif: t => t.replace('name="Passenger"', 'name="Passager"'), attendu: { add: 0, del: 0, mod: 1 } },
  { fmt: 'SysML v2', nom: 'VehiculeDemo.sysml', texte: lire('VehiculeDemo.sysml'),
    modif: t => t.replace('part def Pignon;', 'part def Pignon;\n    part def Frein;').replace('part def MoteurHybride :> Moteur;', ''), attendu: { add: 1, del: 1, mod: 0 } },
  { fmt: 'UML / SysML v1', nom: 'Rover-cameo.xmi', texte: lire('uml/Rover-cameo.xmi'),
    modif: t => t.replace("name='Rover'>", "name='RoverBis'>"), attendu: { add: 0, del: 0, mod: 1 } },
  { fmt: 'ReqIF', nom: 'ExigencesDemo.reqif', texte: lire('reqif/ExigencesDemo.reqif'),
    modif: t => t.replace(/LONG-NAME="([^"]+)"/, 'LONG-NAME="$1 (modifié)"'), attendu: { add: 0, del: 0, mod: 1 } }
];

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }), erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message)); p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'));
  await p.evaluate(() => { window._capDlgAuto = 'ok'; });
  const ouvrir = async (nom, texte) => {
    await p.evaluate(([n, t]) => { _capReplaceOk = Date.now(); capLoadFile(new File([t], n), null, true); }, [nom, texte]);
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 }); await p.waitForTimeout(2500);
  };
  // 🎯 Visites des analyses Capella : nommées d'après la sous-vue, étapes sur ses zones
  await ouvrir(CAS[0].nom, CAS[0].texte);
  const vc = await p.evaluate(async () => { const r = {};
    for (const k of ['trace', 'status', 'caps']) { capNavOpen('ana:' + k); await new Promise(z => setTimeout(z, 800));
      const v = capTourCtx(); r[k] = { l: v.l, zones: v.steps.filter(st => st.s && !(st.skip && st.skip()) && capTourEls(st).length).length }; }
    return r; });
  ok(vc.trace.l === '🧬 Traçabilité inter-couches' && vc.trace.zones >= 7 && vc.status.zones >= 10 && vc.caps.zones >= 8,
    `🎯 Visites des analyses Capella (${Object.values(vc).map(v => v.l + ' : ' + v.zones + ' zones').join(', ')})`);
  for (const c of CAS) {
    await ouvrir(c.nom, c.texte);
    const r = await p.evaluate(async ([n, t]) => {
      capAnaSub = 'status'; capShowView('analyses');
      const out = { suivi: _capWatch.name === n && !!_capWatch.file };
      const f = new File([t], n, { lastModified: Date.now() + 5000 });
      _capWatch.handle = { getFile: async () => f };   // accès direct simulé : nouvelle version enregistrée
      await capWatchCheck(true);
      const pd = _capWatch.pending; out.counts = pd ? pd.counts : null;
      await capWatchApply(); await new Promise(z => setTimeout(z, 1200));
      out.applique = !_capWatch.pending && _capWatch.history.length === 1; out.vue = capCurrentView + '/' + capAnaSub;
      out.avant = !!(typeof capAvRef === 'function' && capAvRef());
      await capWatchCheck(true); out.aJour = !_capWatch.pending;
      return out;
    }, [c.nom, c.modif(c.texte)]);
    ok(r.suivi, `${c.fmt} : fichier suivi dès l'ouverture`);
    ok(r.counts && r.counts.add === c.attendu.add && r.counts.del === c.attendu.del && r.counts.mod === c.attendu.mod,
      `${c.fmt} : nouvelle version détectée, delta ${JSON.stringify(r.counts && { add: r.counts.add, del: r.counts.del, mod: r.counts.mod })}`);
    ok(r.applique && r.vue === 'analyses/status' && r.aJour, `${c.fmt} : mise à jour appliquée, vue gardée (${r.vue}), modèle à jour ensuite`);
    if (c.fmt !== 'ReqIF') ok(r.avant, `${c.fmt} : ⇄ Avant / après garde la version d'avant`);
  }
  // « Charger une mise à jour » avec un fichier choisi, refus d'un autre format, ⚖ Comparaison
  const xmi = CAS[2];
  await ouvrir(xmi.nom, xmi.texte);
  const m = await p.evaluate(async ([n, t, autre, bib, nota]) => {
    _capPickerKo = true; const inp = document.getElementById('cap-watch-input');
    const choisir = async f => { capWatchPickNewVersion(); const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event('change')); await new Promise(z => setTimeout(z, 1500)); };
    _capDlgAuto = null; const alertes = []; const a0 = window.capAlert; window.capAlert = (x) => { alertes.push(String(x)); return Promise.resolve(true); };
    await choisir(new File([autre], 'VehiculeDemo.sysml'));
    const refus = !_capWatch.pending && alertes.some(x => /SysML v2/.test(x));
    _capDlgAuto = 'ok';
    await choisir(new File([t], n));
    const pd = _capWatch.pending; window.capAlert = a0;
    capDiffDoc = null; capAnaSub = 'diff'; capShowView('analyses'); await new Promise(z => setTimeout(z, 300));
    const dt = new DataTransfer(); dt.items.add(new File([t], n.replace('.xmi', ' v2.xmi'))); const fi = document.getElementById('ana-df-file'); fi.files = dt.files; fi.dispatchEvent(new Event('change'));
    await new Promise(z => setTimeout(z, 1500));
    const entete = document.querySelector('.ana-diff-head').innerText;
    // 🎓 Visite de ⚖ Comparaison de versions : visite propre, textes de SysML v1 (aucun reste de Capella)
    capTourStartView(); const tour = { cle: capTourCtxKey(), etapes: 0, capella: 0 };
    for (let k = 0; k < 30 && _capTour; k++) { const st = _capTour.steps[_capTour.i], x = typeof st.x === 'function' ? st.x() : st.x; tour.etapes++; if (/\.aird|ARCADIA/.test(x)) tour.capella++; capTourGo(1); }
    if (_capTour) capTourEnd(); capTourDiffVue('modele');
    // 🎯 Visites propres aux analyses : nommées d'après la sous-vue, étapes sur ses zones
    const visites = {};
    for (const k of ['uml', 'sante']) { capNavOpen('ana:' + k); await new Promise(z => setTimeout(z, 800));
      const v = capTourCtx(); visites[k] = { l: v.l, zones: v.steps.filter(st => st.s && !(st.skip && st.skip()) && capTourEls(st).length).length }; }
    capAnaSub = 'diff'; capShowView('analyses'); await new Promise(z => setTimeout(z, 300));
    // Diagrammes : Bibliotheque (.uml + .notation de Papyrus) comparé à une version où la classe Livre est renommée
    _capReplaceOk = Date.now(); capUmlOuvrirFichiers([new File([bib], 'Bibliotheque.uml'), new File([nota], 'Bibliotheque.notation')], true);
    await new Promise(z => setTimeout(z, 2500));
    capAnaSub = 'diff'; _capDg.vue = 'diag'; capShowView('analyses'); await new Promise(z => setTimeout(z, 300));
    const dt2 = new DataTransfer(); dt2.items.add(new File([bib.replace('name="Livre"', 'name="Ouvrage"')], 'Bibliotheque-v2.uml'));
    const fi2 = document.getElementById('ana-df-file'); fi2.files = dt2.files; fi2.dispatchEvent(new Event('change'));
    await new Promise(z => setTimeout(z, 2000));
    const R = capDgComparer();
    // ⇄ Avant / après depuis l'onglet 🔲 Diagrammes : la version comparée sert de version d'avant, ⏮ ⏭ dans la liste
    document.querySelector('[data-dg="revue"]')?.click(); await new Promise(z => setTimeout(z, 2500));
    const av = { ouvert: _capAv.ouvert, comp: !!(capAvRef() && capAvRef().comparaison), tour: !!document.querySelector('[data-cav-tour="retour"]'), dessin: !!document.querySelector('#cav-a svg') && !!document.querySelector('#cav-b svg') };
    capAvFermer();
    return { av, tour, visites, refus, choisi: pd && pd.counts.mod, comparaison: (_capAnaCache.diff || []).length, infos: (entete.match(/élément\(s\)/g) || []).length,
      diag: R && R.ref && R.lecteur ? R.rows.filter(x => x.etats.size).length : -1, tous: R && R.rows ? R.rows.length : 0, aird: !!document.querySelector('#dg-ref') };
  }, [xmi.nom, xmi.modif(xmi.texte), CAS[1].texte, lire('uml/Bibliotheque.uml'), lire('uml/Bibliotheque.notation')]);
  ok(m.refus, 'Charger une mise à jour : fichier d\'un autre format refusé avec un message');
  ok(m.choisi === 1, 'Charger une mise à jour : version choisie comparée (1 modification)');
  ok(m.comparaison === 1, '⚖ Comparaison de versions : autre version .xmi, sous un autre nom, lue par son lecteur (1 différence : le nom du fichier n\'en est pas une)');
  ok(m.infos === 2, '⚖ Comparaison de versions : informations des deux versions (outil, éléments, date)');
  ok(m.diag >= 1 && m.diag < m.tous && !m.aird, `⚖ Comparaison › 🔲 Diagrammes : diagrammes de Papyrus des deux versions (autre nom de fichier) comparés, .notation repris de l'ouverture, sans .aird (${m.diag} touché(s) sur ${m.tous})`);
  ok(m.tour.cle === 'diff' && m.tour.etapes >= 10 && !m.tour.capella, `🎓 Visite de ⚖ Comparaison de versions (${m.tour.etapes} étapes, sans texte propre à Capella pour un .xmi)`);
  ok(m.visites.uml.l === '🧬 UML / SysML v1' && m.visites.uml.zones >= 7 && m.visites.sante.l === '💚 Santé & contrôles' && m.visites.sante.zones >= 7,
    `🎯 Visites des analyses nommées d'après la vue (${m.visites.uml.l} : ${m.visites.uml.zones} zones, ${m.visites.sante.l} : ${m.visites.sante.zones} zones)`);
  ok(m.av.ouvert && m.av.comp && m.av.tour && m.av.dessin, '⚖ Comparaison › 🔲 Diagrammes › ⇄ Passer en revue : diagramme ouvert en avant / après sur la version comparée, ⏮ ⏭ ↩ dans la barre');
  ok(!erreurs.length, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await b.close();
  console.log(echecs ? `\n✖ ${echecs} échec(s)` : '\n✔ Suivi du fichier OK');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
