#!/usr/bin/env node
/**
 * 🤖 Test du serveur MCP (mcp/serveur.js) : protocole (initialize, tools/list), ouverture d'IFE avec son .aird,
 * chaque outil du catalogue (89-ia-outils.js), erreurs, arrêt d'un script sans fin, modèle SysML v2, modèles UML / SysML v1
 * de tests/models/uml/ (Bibliotheque.uml avec son .notation trouvé à côté, Drone-2026x.mdzip de Cameo, Drone-ea.qea
 * d'Enterprise Architect) : résumé, recherche, fiche (stéréotypes, attributs, liaisons, diagrammes), diagrammes, traçabilité
 * (satisfy…), contrôles du lecteur, scripts, erreurs propres à Capella.
 * Prérequis : node build.js, Playwright (comme tests/oracles.js ; CHROMIUM_PATH=… pour un Chromium déjà installé).
 * Usage : node tests/mcp.js
 */
'use strict';
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MODELES = path.join(ROOT, 'tests', 'models');
const UML = path.join(MODELES, 'uml');
const env = Object.assign({}, process.env);
if (process.env.CHROMIUM_PATH) env.ARCALYSE_NAVIGATEUR = process.env.CHROMIUM_PATH;

const srv = spawn(process.execPath, [path.join(ROOT, 'mcp', 'serveur.js')], { stdio: ['pipe', 'pipe', 'pipe'], env });
let tampon = '', n = 0, ko = 0, journal = '';
const attentes = new Map();
srv.stderr.on('data', d => { journal += d; });
srv.stdout.on('data', d => {
  tampon += d; let i;
  while ((i = tampon.indexOf('\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 1); const m = JSON.parse(l); const f = attentes.get(m.id); attentes.delete(m.id); if (f) f(m); }
});

/** Envoie une requête JSON-RPC. @param {string} method @param {object} params @returns {Promise<object>} Réponse */
function req(method, params) { return new Promise(r => { const id = ++n; attentes.set(id, r); srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); }); }
/** Appelle un outil. @param {string} name @param {object} args @returns {Promise<{texte:string, erreur:boolean}>} */
async function outil(name, args) { const r = await req('tools/call', { name, arguments: args || {} }); return { texte: r.result.content[0].text, erreur: !!r.result.isError }; }
/** Vérifie une condition. @param {string} nom @param {boolean} ok @param {string} [detail] */
function verifier(nom, ok, detail) { if (ok) console.log('✔ ' + nom); else { ko++; console.error('✖ ' + nom + (detail ? ' — ' + String(detail).slice(0, 300) : '')); } }

(async () => {
  const init = await req('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  verifier('initialize', init.result && init.result.serverInfo.name === 'arcalyse' && init.result.capabilities.tools);
  srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const outils = (await req('tools/list', {})).result.tools.map(t => t.name);
  verifier('tools/list', ['open_model', 'model_summary', 'search_elements', 'get_element', 'diagrams', 'traceability', 'checks', 'run_script', 'script_api_reference'].every(x => outils.includes(x)), outils.join(', '));
  verifier('méthode inconnue → erreur', !!(await req('nimporte/quoi', {})).error);
  verifier('outil sans modèle → erreur', (await outil('model_summary')).erreur);

  let r = await outil('open_model', { path: path.join(MODELES, 'In-Flight_Entertainment_System.capella') });
  const res = JSON.parse(r.texte);
  verifier('open_model IFE (+ .aird)', !r.erreur && res.format === 'Capella' && res.elements > 5000 && res.diagrams > 100 && res.check_views.includes('functions') && !res.check_views.includes('ana:uml'), r.texte);
  r = await outil('search_elements', { query: 'broadcast audio video stream', layer: 'LA' });
  const items = JSON.parse(r.texte).items;
  verifier('search_elements', !r.erreur && items.length === 1 && /^E\d+$/.test(items[0].id), r.texte);
  const id = items[0].id;
  r = await outil('get_element', { id });
  const fiche = JSON.parse(r.texte);
  verifier('get_element (relations, chemin, diagrammes)', fiche.links && fiche.links['allocation in'] && fiche.path.includes('Logical') && fiche.diagrams && fiche.diagrams.length && /^D\d+$/.test(fiche.diagrams[0].id), r.texte);
  r = await outil('diagrams', { limit: 3 });
  verifier('diagrams : liste (Capella, paginée)', !r.erreur && JSON.parse(r.texte).total > 100 && JSON.parse(r.texte).items.length === 3, r.texte);
  r = await outil('diagrams', { id: fiche.diagrams[0].id, limit: 200 });
  verifier('diagrams : éléments d\'un diagramme (Capella)', !r.erreur && JSON.parse(r.texte).items.some(x => x.id === id), r.texte);
  verifier('diagrams : diagramme inconnu → erreur', (await outil('diagrams', { id: 'D99999' })).erreur);
  r = await outil('traceability', { id });
  verifier('traceability d\'un élément', JSON.parse(r.texte).realizes.some(x => x.layer === 'SA'), r.texte);
  r = await outil('traceability', {});
  verifier('traceability : couverture', JSON.parse(r.texte).coverage.some(c => c.category === 'fn' && c.from === 'SA'), r.texte);
  r = await outil('traceability', { category: 'fn', layer: 'SA', limit: 2 });
  verifier('traceability : non couverts (paginé)', JSON.parse(r.texte).items.length <= 2, r.texte);
  r = await outil('checks', {});
  const synthese = JSON.parse(r.texte);
  verifier('checks : synthèse', synthese.failing > 0, r.texte);
  r = await outil('checks', { view: synthese.checks[0].view, limit: 2 });
  verifier('checks : détail d\'une vue', JSON.parse(r.texte).sections[0].items.length <= 2, r.texte);
  r = await outil('run_script', { code: "out.print(model.count({type:'LogicalFunction'}));\nconst c=await analysis.chains(); out.table(c.slice(0,2).map(x=>({name:x.name})));" });
  const s = JSON.parse(r.texte);
  verifier('run_script', s.ok && /^\d+\n/.test(s.output) && s.output.includes('name'), r.texte);
  r = await outil('run_script', { code: 'while(true){}', timeout_s: 1 });
  verifier('run_script : arrêt d\'un script sans fin', JSON.parse(r.texte).ok === false, r.texte);
  r = await outil('run_script', { code: 'x(' });
  verifier('run_script : erreur de syntaxe', JSON.parse(r.texte).ok === false, r.texte);
  verifier('get_element inconnu → erreur', (await outil('get_element', { id: 'E999999' })).erreur);
  verifier('script_api_reference', (await outil('script_api_reference')).texte.includes('interface'));
  r = await outil('open_model', { path: path.join(MODELES, 'VehiculeDemo.sysml') });
  verifier('open_model SysML v2', !r.erreur && JSON.parse(r.texte).format === 'SysML v2' && JSON.parse(r.texte).check_views.join() === 'ana:sysml', r.texte);
  r = await outil('traceability', {});
  verifier('traceability SysML v2 : couverture des exigences', !r.erreur && JSON.parse(r.texte).requirements > 0, r.texte);
  verifier('open_model : fichier absent → erreur', (await outil('open_model', { path: path.join(MODELES, 'absent.capella') })).erreur);

  // 🧬 UML : Bibliotheque.uml, son .notation (diagrammes de Papyrus) trouvé à côté
  r = await outil('open_model', { path: path.join(UML, 'Bibliotheque.uml') });
  const bib = r.erreur ? {} : JSON.parse(r.texte);
  verifier('open_model UML (.uml + .notation trouvé à côté)', bib.format === 'UML' && /Bibliotheque\.notation$/.test(bib.notation || '') && bib.diagrams === 5 && !bib.computed_views
    && bib.by_family && bib.by_family.STR > 0 && bib.check_views.join() === 'ana:uml' && !('aird' in bib), r.texte);
  r = await outil('search_elements', { query: 'document', type: 'Class' });
  const doc = r.erreur ? [] : JSON.parse(r.texte).items;
  verifier('search_elements UML (type, sans couche)', doc.length === 1 && doc[0].name === 'Document' && !('layer' in doc[0]), r.texte);
  r = await outil('search_elements', { query: 'Bibliotheque::Domaine::Livre' });
  verifier('search_elements UML : nom qualifié', !r.erreur && JSON.parse(r.texte).items.some(x => x.name === 'Livre'), r.texte);
  r = await outil('get_element', { id: doc[0] && doc[0].id });
  const fd = r.erreur ? {} : JSON.parse(r.texte);
  verifier('get_element UML (nom qualifié, liaisons, diagramme de Papyrus)', fd.qualified_name === 'Bibliotheque::Domaine::Document' && fd.family === 'STR'
    && fd.links && (fd.links['generalisation in'] || []).length === 2 && (fd.diagrams || []).some(x => x.origin === 'papyrus' && x.name === 'Domaine'), r.texte);
  r = await outil('diagrams', {});
  const dl = r.erreur ? { items: [] } : JSON.parse(r.texte);
  verifier('diagrams UML : diagrammes de Papyrus seulement (pas de vues calculées pour UML / SysML v1)', dl.total === 5 && dl.items.every(x => x.origin === 'papyrus'), r.texte);
  const dom = dl.items.find(x => x.name === 'Domaine') || {};
  r = await outil('diagrams', { id: dom.id, text: true });
  const dd = r.erreur ? {} : JSON.parse(r.texte);
  verifier('diagrams UML : éléments et texte d\'un diagramme', (dd.items || []).some(x => x.id === doc[0].id) && dd.shapes > 0 && /Document/.test(dd.text || ''), r.texte);
  r = await outil('traceability', {});
  verifier('traceability UML : couverture des exigences', !r.erreur && JSON.parse(r.texte).format === 'UML' && JSON.parse(r.texte).requirements === 0, r.texte);
  verifier('traceability UML : catégorie ARCADIA → erreur', (await outil('traceability', { category: 'fn', layer: 'SA' })).erreur);
  r = await outil('checks', {});
  verifier('checks UML : validation du lecteur seulement', !r.erreur && JSON.parse(r.texte).failing === 0, r.texte);
  verifier('checks UML : vue de Capella → erreur', (await outil('checks', { view: 'functions' })).erreur);
  verifier('search_elements UML : couche ARCADIA → erreur', (await outil('search_elements', { layer: 'LA' })).erreur);
  verifier('open_model : .notation seul → erreur', (await outil('open_model', { path: path.join(UML, 'Bibliotheque.notation') })).erreur);
  verifier('open_model : notation pour un autre format → erreur', (await outil('open_model', { path: path.join(UML, 'Drone-ea.qea'), notation: path.join(UML, 'Bibliotheque.notation') })).erreur);

  // 🧬 SysML v1 : projet Cameo (.mdzip)
  r = await outil('open_model', { path: path.join(UML, 'Drone-2026x.mdzip') });
  const dz = r.erreur ? {} : JSON.parse(r.texte);
  verifier('open_model SysML v1 (.mdzip de Cameo)', dz.format === 'SysML v1' && dz.diagrams === 2 && /Cameo/.test(dz.tool || '') && !('notation' in dz), r.texte);
  r = await outil('search_elements', { query: 'drone', type: 'Block' });
  const dr = r.erreur ? [] : JSON.parse(r.texte).items;
  r = await outil('get_element', { id: dr[0] && dr[0].id });
  const fz = r.erreur ? {} : JSON.parse(r.texte);
  verifier('get_element SysML v1 (stéréotype, métaclasse, diagramme de Cameo)', (fz.stereotypes || []).includes('Block') && fz.metaclass === 'Class' && (fz.diagrams || []).some(x => x.origin === 'cameo'), r.texte);
  r = await outil('run_script', { code: "out.print(model.count({type:'Block'}));\nconst s=await analysis.sysml(); out.print(s.format+' '+s.vues.length);" });
  const sz = r.erreur ? {} : JSON.parse(r.texte);
  verifier('run_script SysML v1 (types du lecteur, analysis.sysml)', sz.ok && /^3\nsysml1 \d+/.test(sz.output || ''), r.texte);

  // 🧬 SysML v1 : projet Enterprise Architect (.qea) — exigences, satisfy, diagnostics de la validation
  r = await outil('open_model', { path: path.join(UML, 'Drone-ea.qea') });
  const ea = r.erreur ? {} : JSON.parse(r.texte);
  verifier('open_model SysML v1 (.qea d\'Enterprise Architect)', ea.format === 'SysML v1' && ea.diagrams === 7 && ea.diagnostics && ea.diagnostics.errors > 0, r.texte);
  r = await outil('checks', {});
  const ce = r.erreur ? {} : JSON.parse(r.texte);
  verifier('checks SysML v1 : erreurs de la validation', ce.failing > 0 && ce.checks.every(c => c.view === 'ana:uml'), r.texte);
  r = await outil('checks', { view: 'ana:uml', limit: 2 });
  verifier('checks SysML v1 : lignes (éléments [E12])', !r.erreur && JSON.parse(r.texte).sections[0].items.length === 2 && /\[E\d+\]/.test(r.texte), r.texte);
  r = await outil('search_elements', { query: 'autonomie', family: 'REQ' });
  const ex = r.erreur ? [] : JSON.parse(r.texte).items;
  r = await outil('get_element', { id: ex[0] && ex[0].id });
  const fe = r.erreur ? {} : JSON.parse(r.texte);
  verifier('get_element SysML v1 : exigence (attributs écrits, satisfy)', (fe.stereotypes || []).includes('Requirement') && (fe.attributes || []).some(x => /30 minutes/.test(x.value)) && (fe.links && fe.links['satisfy in'] || []).length === 1, r.texte);
  r = await outil('traceability', { id: ex[0] && ex[0].id });
  verifier('traceability SysML v1 d\'une exigence', !r.erreur && JSON.parse(r.texte).incoming.some(x => x.relation === 'satisfy' && x.type === 'Block'), r.texte);
  r = await outil('traceability', {});
  const tr = r.erreur ? {} : JSON.parse(r.texte);
  verifier('traceability SysML v1 : exigences non satisfaites', tr.requirements === 3 && tr.satisfied === 1 && tr.items.length === 2, r.texte);
  srv.stdin.end();
  srv.on('exit', () => {
    if (ko) { console.error(`\n✖ ${ko} échec(s). Journal du serveur :\n${journal}`); process.exit(1); }
    console.log('\n✔ Serveur MCP conforme.');
  });
})().catch(e => { console.error(e); console.error(journal); process.exit(1); });
