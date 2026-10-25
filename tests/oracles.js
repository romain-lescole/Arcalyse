#!/usr/bin/env node
/**
 * Oracles de non-régression des moteurs de calcul.
 *
 * Ouvre dist/arcalyse-fr.html dans Chromium HORS LIGNE, charge chaque modèle de test, relève les
 * résultats des moteurs (éléments par couche et par type, relations, chaînes, fonctions, qualité des
 * noms, listes de contrôles de toutes les vues, traçabilité, ports, scénarios, exigences, PVMT,
 * données, et la valeur de tous les indicateurs du tableau de bord), puis compare ce relevé à
 * l'oracle enregistré dans tests/oracles/<modèle>.json. Toute différence est listée chemin par chemin.
 *
 * Installation (une seule fois) :  npm install --save-dev playwright  puis  npx playwright install chromium
 *   (ou CHROMIUM_PATH=/chemin/vers/chrome pour utiliser un Chromium déjà installé)
 * Lancement :                      node tests/oracles.js [modèle.capella…]      (après node build.js)
 * Mettre à jour les oracles :      node tests/oracles.js --update [modèle…]     (après un changement voulu des résultats)
 * Version anglaise :               node tests/oracles.js --en                    (après node build.js --lang en ; les titres
 *                                  des contrôles et des indicateurs étant traduits, les oracles sont distincts : <modèle>.en.json)
 * (par défaut : tous les .capella de tests/models/)
 *
 * Quand une différence est voulue (nouveau contrôle, correction d'un calcul), relancer avec --update et
 * relire le diff du .json avant de le committer : c'est lui qui documente le changement de résultat.
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2), UPDATE = args.includes('--update'), EN = args.includes('--en');
const page = path.join(ROOT, 'dist', EN ? 'arcalyse-en.html' : 'arcalyse-fr.html');
const modelsDir = path.join(__dirname, 'models'), oraclesDir = path.join(__dirname, 'oracles');
const models = args.filter(a => !a.startsWith('--')).map(a => path.resolve(a));
if (!models.length && fs.existsSync(modelsDir))
  fs.readdirSync(modelsDir).filter(f => /\.(capella|sysml)$/.test(f)).sort().forEach(f => models.push(path.join(modelsDir, f)));   // .sysml : lus par le lecteur SysML v2 (87)
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js' + (EN ? ' --lang en' : '')); process.exit(2); }
if (!models.length) { console.error('Aucun modèle : placez un .capella dans tests/models/ ou passez-le en argument'); process.exit(2); }

/** Relevé exécuté dans la page : un objet JSON stable (clés triées, pas de HTML) décrivant les résultats des moteurs.
 * @returns {Object} Relevé */
function releve() {
  const tri = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  const compte = (arr, f) => { const m = {}; arr.forEach(x => { const k = String(f(x)); m[k] = (m[k] || 0) + 1; }); return tri(m); };
  const somme = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const taille = c => c == null ? 0 : Array.isArray(c) ? c.length : (c instanceof Map || c instanceof Set) ? c.size : Object.keys(c).length;
  const sections = secs => { const o = {}; (secs || []).forEach(s => { o[s.title] = (s.items || s.rows || []).length; }); return o; };
  const R = {};

  // Modèle
  R.modele = { elements: capAllElements.length, parCouche: compte(capAllElements, e => e.layer), parType: compte(capAllElements, e => e.typeName) };

  // Relations (vue 🔗 Liens et Relation Map)
  const L = capComputeLinks(); R.relations = {};
  CAP_LINK_SECTIONS.forEach(s => { const n = (L[s.key] || []).length; if (n) R.relations[s.key] = n; });

  // ⚡ Chaînes
  const CH = capComputeChains();
  R.chaines = { nombre: CH.length, parType: compte(CH, c => c.type), parCouche: compte(CH, c => c.layer),
    noeuds: somme(CH, c => c.graph.nodes.length), aretes: somme(CH, c => c.graph.edges.length), vides: CH.filter(c => capChainIsEmpty(c)).length };

  // ƒ Fonctions
  const F = capComputeFunctions();
  R.fonctions = { nombre: F.list.length, parCouche: compte(F.list, f => f.layer), feuilles: F.list.filter(f => f.leaf).length,
    allouees: F.list.filter(f => f.alloc.length).length, parAllocation: compte(F.list, f => capFnAllocKind(f)),
    realisees: F.list.filter(f => f.realizedBy.length).length, avecDescription: F.list.filter(f => f.desc).length };
  R.qualiteNoms = { langues: compte(F.list, f => capFnNQ(f).lang), defauts: compte(F.list.flatMap(f => capFnNQ(f).issues), i => i.code) };

  // 🧬 Traçabilité inter-couches (cases utilisées de la matrice de couverture)
  R.tracabilite = capTraceCoverage(capComputeTrace(false, false)).filter(c => c.used)
    .map(c => ({ cat: c.cat, de: c.hi, vers: c.lo, haut: c.upAll.length, hautOk: c.upOk.length, bas: c.loAll.length, basOk: c.loOk.length }));

  // 📡 Flux & interfaces
  const X = capComputeFunctionalExchanges();
  R.functionalExchange = { echanges: X.list.length, parCouche: compte(X.list, x => x.layer), fonctions: X.fns.length };
  const CB = capComputeComponentBlocks();
  R.composants = { composants: CB.comps.length, parCouche: compte(CB.comps, c => c.layer), acteurs: CB.comps.filter(c => c.actor).length,
    ports: somme(CB.comps, c => c.ports.length), liens: CB.links.length };
  const CE = capComputeCompExchanges();
  R.componentExchange = { nombre: CE.length, parCouche: compte(CE, l => l.layer), parSens: compte(CE, l => l.dir), incoherents: CE.filter(l => l.warn).length,
    avecFe: CE.filter(l => l.fes.length).length, avecPl: CE.filter(l => l.pls.length).length };
  R.behaviorExchange = { nombre: capBehaviorExchanges().length };
  const PL = capComputePhysLinks();
  R.physicalLink = { nombre: PL.length, avecCe: PL.filter(l => l.ces.length).length, ces: somme(PL, l => l.ces.length) };
  const P = capComputePortLinks();
  R.ports = { fp: taille(P.fps), cp: taille(P.cps), pp: taille(P.pps), fe: taille(P.fes), ce: taille(P.ces), pl: taille(P.pls),
    feVersCe: taille(P.feToCE), ceVersPl: taille(P.ceToPL) };
  const SC = capComputeScenarios().list;
  R.scenarios = { nombre: SC.length, parCouche: compte(SC, s => s.layer), parType: compte(SC, s => s.ks), messages: somme(SC, s => s.nMsg || 0) };

  // 🔬 Analyses
  const CAPS = capComputeCapabilities();
  R.capacites = { nombre: CAPS.length, parCouche: compte(CAPS, c => c.layer), avecFonctions: CAPS.filter(c => c.fns.length).length,
    avecChaines: CAPS.filter(c => c.chains.length).length, avecScenarios: CAPS.filter(c => c.scen.length).length };
  const ST = capComputeStates();
  R.etats = { machines: ST.sms.length, etats: somme(ST.sms, m => m.states.length), transitions: somme(ST.sms, m => m.trans.length) };
  const RQ = capComputeRequirements();
  R.exigences = { nombre: RQ.list.length, parSource: compte(RQ.list, r => r.src), parType: compte(RQ.list, r => r.kind), elementsLies: Object.keys(RQ.byEl).length };
  const PV = capComputePvmt();
  R.pvmt = { definitions: PV.defs.length, valeurs: PV.vals.length, elementsValues: Object.keys(PV.byEl).length };
  const DM = capComputeDataModel();
  R.donnees = { exchangeItems: DM.eis.length, interfaces: DM.itfs.length, types: DM.types.length, fes: DM.fes.length, ces: DM.ces.length };
  R.liensCouches = {};   // ⇶ par catégorie (fonctions, composants, chaînes…), tous les liens
  CAP_TRACE_CATS.forEach(c => { const XL = capXlCompute({ mode: 'cat', cat: c.k, dir: 'all', fnCh: true }); R.liensCouches[c.k] = { noeuds: taille(XL.nodes), aretes: taille(XL.edges), tronque: !!XL.trop }; });

  const ST2 = capComputeStatus();
  R.statutRevue = { elements: ST2.list.length, avecStatut: ST2.list.filter(e => e.status).length, avecCommentaire: ST2.list.filter(e => e.review).length, litteraux: ST2.lits.map(l => l.name + ':' + l.cls), parStatut: compte(ST2.list, e => e.status || '(sans)'), parClasse: compte(ST2.list, e => e.cls || '(sans)') };

  const EC = capComputeExchangeCategories();
  R.categoriesEchanges = { categories: EC.cats.length, parNature: compte(EC.cats, c => c.kind), parCouche: compte(EC.cats, c => c.layer), echangesCategorises: Object.keys(EC.byEx).length, introuvables: somme(EC.cats, c => c.broken) };

  const DP = capComputeDeploy();
  R.deploiement = { noeuds: DP.nodes.length, comportements: DP.behaviors.length, deployes: Object.keys(DP.onNode).length, cis: DP.cis.length, ciKinds: compte(DP.cis, c => c.kind || '(sans)'), ceNonRelies: DP.ceBad.length };

  const RC = capComputeRec();
  R.recRpl = { recs: RC.recs.length, rpls: RC.rpls.length, elements: Object.keys(RC.byEl).length, conformes: RC.rpls.filter(r => r.rec && !capRecEcarts(r)).length, ecarts: RC.rpls.map(r => r.name + ':' + capRecEcarts(r)).sort() };

  const LB = capLibScan();
  R.bibliotheques = { references: LB.refs.length, bibliotheques: LB.libs.length, declarees: LB.declared.size };

  // 🧩 SysML v2 (87) : éléments par métaclasse et famille, liaisons par relation, diagnostics par code
  if (typeof _capSysml !== 'undefined' && _capSysml.lecture) {
    const lec = _capSysml.lecture, els = lec.elements();
    R.sysml = { elements: els.length, parType: compte(els, e => e.type), parFamille: compte(els, e => e.famille || '(sans)'), techniques: els.filter(e => e.technique).length,
      liaisons: compte(lec.toutesLiaisons(), l => l.relation), diagnostics: compte(lec.diagnostics, d => d.severite + ':' + d.code), fichiers: (lec.fichiers || []).length,
      xml: { elements: capAllElements.length, references: somme(capAllElements, e => Object.keys(e.attrs).filter(k => /^#/.test(String(e.attrs[k]))).length) },
      relationMap: compte(MODEL.relations.filter(r => String(r.type).startsWith('sysml:')), r => r.type), vuesVides: [...capNavVides()].sort(),
      vues: Object.fromEntries(capSyVuesListe().map(v => { const vue = capSyVue(v.cle); return [v.sigle + ' ' + v.nom, { formes: vue.formes.length, liens: vue.liens.length, texte: vue.texte.length }]; })) };
  }
  const SA = capSanteCompute();
  R.sante = { score: SA.score, points: SA.points, bloquants: SA.bloquants, info: SA.info, pop: SA.pop, nChecks: SA.nChecks, nOk: SA.nOk, couches: Object.fromEntries(Object.entries(SA.couches).map(([k, v]) => [k, v.score])) };

  // 🩺 Contrôles de toutes les vues : nombre de lignes par contrôle
  const etatsCtl = { noInit: 0, unreach: 0, deadEnd: 0, noTrig: 0 };
  ST.sms.forEach(m => { const c = capStateChecks(m); Object.keys(etatsCtl).forEach(k => { etatsCtl[k] += (c[k] || []).length; }); });
  R.controles = {
    fonctions: sections(capFnChecks(F, 'all')), functionalExchange: sections(capFexChecks('all')), composants: sections(capCbChecks('all')),
    scenarios: sections(capScChecks()), sysml: sections(capSyChecks()), exigences: sections(capReqChecks()), pvmt: sections(capPvChecks()), donnees: sections(capDmChecks()),
    contraintes: sections(capCtChecks()), statutRevue: sections(capStChecks()), chaines: sections(capChChecks('all')), categories: sections(capEcChecks()), bibliotheques: sections(capLibChecks()), recRpl: sections(capRecChecks()), deploiement: sections(capDepChecks()), etats: etatsCtl };

  // 📐 Tableau de bord : valeur de chaque indicateur (texte, diagramme et image exclus : pas de valeur calculée)
  R.tableauDeBord = {};
  capDashCatalog().forEach(m => {
    if (['text', 'diag', 'xlay'].includes(m.kind) || m.id === 'sante.hist') return;   // sante.hist : libellés horodatés (non déterministe)
    const v = capDashValue(m); let n = null;
    if (v == null) n = null;
    else if (m.kind === 'n') n = v.n;
    else if (m.kind === 'pct') n = { pct: v.v, num: v.num, den: v.den };
    else if (m.kind === 'series') { n = {}; v.cats.forEach(c => { n[c.l] = c.v; }); }
    else if (m.kind === 'multi') { n = { cats: v.cats, series: {} }; v.series.forEach(s => { n.series[s.l] = s.vals; }); }
    else if (m.kind === 'table') n = { cols: v.cols, lignes: v.rows.length, rows: v.rows.slice(0, 50) };
    R.tableauDeBord[m.id] = n;
  });
  R.tableauDeBord = tri(R.tableauDeBord);
  return JSON.parse(JSON.stringify(R));   // valeurs non sérialisables (undefined, Map) neutralisées : le relevé est exactement ce que l'oracle enregistre
}

/** Compare deux valeurs JSON et liste les différences (chemin → attendu / obtenu).
 * @param {*} a - Valeur attendue (oracle)
 * @param {*} b - Valeur obtenue
 * @param {string} chemin - Chemin courant
 * @param {string[]} out - Différences accumulées
 * @returns {string[]} Différences */
function diff(a, b, chemin, out) {
  const isObj = v => v && typeof v === 'object';
  if (isObj(a) && isObj(b) && Array.isArray(a) === Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    keys.forEach(k => {
      const p = chemin ? (Array.isArray(a) ? `${chemin}[${k}]` : `${chemin}.${k}`) : k;
      if (!(k in a)) out.push(`${p} : nouveau → ${JSON.stringify(b[k])}`);
      else if (!(k in b)) out.push(`${p} : disparu (attendu ${JSON.stringify(a[k])})`);
      else diff(a[k], b[k], p, out);
    });
  } else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${chemin} : attendu ${JSON.stringify(a)}, obtenu ${JSON.stringify(b)}`);
  return out;
}

(async () => {
  const exe = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let ko = 0;
  for (const model of models) {
    const nom = path.basename(model).replace(/\.(capella|sysml)$/, ''), oracle = path.join(oraclesDir, nom + (EN ? '.en' : '') + '.json');
    const ctx = await browser.newContext({ offline: true, viewport: { width: 1500, height: 900 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'));
    await p.setInputFiles('#capella-file-input', model);
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 });
    const t0 = Date.now();
    let R; try { R = await p.evaluate(releve); } catch (e) { errs.push('relevé : ' + e.message); }
    await ctx.close();
    const ms = Date.now() - t0;
    if (errs.length) { ko++; console.error(`✖ ${nom} : ${errs.length} erreur(s) JS\n  - ${errs.slice(0, 10).join('\n  - ')}`); continue; }
    if (UPDATE || !fs.existsSync(oracle)) {
      const existait = fs.existsSync(oracle);
      fs.mkdirSync(oraclesDir, { recursive: true });
      fs.writeFileSync(oracle, JSON.stringify(R, null, 1) + '\n');
      console.log(`${existait ? '✔' : '✚'} ${nom} : oracle ${existait ? 'mis à jour' : 'créé'} → ${path.relative(ROOT, oracle)} (${ms} ms)`);
      continue;
    }
    const attendu = JSON.parse(fs.readFileSync(oracle, 'utf8'));
    const d = diff(attendu, R, '', []);
    if (d.length) { ko++; console.error(`✖ ${nom} : ${d.length} différence(s) avec ${path.relative(ROOT, oracle)} (${ms} ms)\n  - ${d.slice(0, 40).join('\n  - ')}${d.length > 40 ? `\n  … et ${d.length - 40} autre(s)` : ''}`); }
    else console.log(`✔ ${nom} : conforme à l'oracle (${ms} ms)`);
  }
  await browser.close();
  if (ko) { console.error(`\n✖ ${ko} modèle(s) en écart. Si le changement est voulu : node tests/oracles.js --update`); process.exit(1); }
  console.log('\n✔ Oracles conformes.');
})();
