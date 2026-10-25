// ── 📜 Scripts : instantané du modèle et analyses servies à la console ────────
// Côté page (accès aux moteurs d'Arcalyse). L'instantané (capScrSnapshot) est confié au worker des scripts (81) :
// éléments, relations de 🔗 Liens traduites dans les noms de relations de l'API d'Arcature, diagrammes du .aird.
// Les analyses (capScrAnalyse) sont calculées à la demande d'un script (await analysis.xxx()) avec les moteurs et
// leurs caches (_capAnaCache) ; leur résultat est rendu « propre » (capScrNettoyer : Set / Map / nœuds XML / cycles →
// JSON ; tout objet portant un `id` d'élément reçoit `$el`, que le noyau transforme en propriété `element`).

/** Relations de 🔗 Liens (CAP_LINK_SECTIONS) → relations publiques de l'API (noms d'Arcature) ; les décompositions ne sont pas reprises (children()). */
const CAP_SCR_RELATIONS={ pcBeh_fn:'allocation', lc_lf:'allocation', sc_sf:'allocation', entity_oa:'allocation', pcNode_pcBeh:'deployment',
  cap_comp:'involvement', lcap_lcomp:'involvement', pcap_pcomp:'involvement', ocap_entity:'involvement', mission_comp:'involvement', mission_cap:'exploitation',
  fe_fn:'functionalExchange', ce_comp:'componentExchange', pl_pc:'physicalLink', ex_ei:'exchangedItem', fn_real:'realization', comp_real:'realization',
  fe_real:'realization', ce_fe:'exchangeAllocation', pl_ce:'componentExchangeAllocation', pp_cp:'portAllocation', fc_fn:'involvement', fc_fe:'involvement',
  cap_fn:'involvement', cap_fc:'involvement' };

/**
 * Instantané du modèle affiché pour un script : éléments (attributs compris), relations, diagrammes et leurs éléments.
 * @param {string[]} [selection] - Identifiants sélectionnés (élément du panneau de détail)
 * @returns {object} Instantané { fileName, elements, technical, links, diagrams, diagramsOf, selection }
 */
function capScrSnapshot(selection){
  const {parentOf}=capGetParentIndex();
  const elements=capAllElements.map(e=>({id:e.id, type:e.typeName, fullType:e.fullType||'', layer:e.layer||'', attrs:e.attrs||{}, parent:parentOf[e.id]||''}));
  const L=capLinksData||(capLinksData=capComputeLinks()), links=[];
  for(const [key,rel] of Object.entries(CAP_SCR_RELATIONS)) for(const r of L[key]||[]) if(r.src&&r.tgt&&r.src.id&&r.tgt.id) links.push({rel, src:r.src.id, tgt:r.tgt.id, via:r.via&&r.via.id||''});
  const d=capScrDiagrammes();
  return { fileName:capCurrentFileName||'', elements, technical:[...CAP_TECHNICAL_TYPES],
    links, diagrams:d.liste, diagramsOf:d.parElement, selection:selection||[] };
}

/**
 * Diagrammes du .aird chargé (visionneuse d'Arcature) et, pour chaque élément, les diagrammes qui le montrent ou le ciblent.
 * Index gardé dans _capAnaCache (vidé au chargement d'un modèle ou d'un .aird) ; calcul borné à quelques secondes.
 * @returns {{liste:object[], parElement:Object<string,string[]>}} Diagrammes et index
 */
function capScrDiagrammes(){
  const reps=typeof capDiagReps==='function'?capDiagReps():[];
  if(!reps.length) return {liste:[], parElement:{}};
  const cle=reps.length+'|'+(reps[0]&&reps[0].uid);
  if(_capAnaCache.scrDiag&&_capAnaCache.scrDiag.cle===cle) return _capAnaCache.scrDiag;
  const cible={}, parElement={}, t0=Date.now();
  for(const e of capAllElements){
    if(Date.now()-t0>4000) break;   // modèle énorme : index partiel (les éléments restants n'ont pas de diagrammes connus)
    let r; try{ r=_capDiag.vis.diagrammesDe(e.id); }catch(x){ continue; }
    const ids=[...new Set([...(r.cibles||[]), ...(r.presences||[])].map(x=>x.uid))];
    if(ids.length) parElement[e.id]=ids;
    (r.cibles||[]).forEach(x=>{ if(!cible[x.uid]) cible[x.uid]=e.id; });
  }
  const liste=reps.map(r=>({id:r.uid, name:r.nom||'', type:r.type||'', code:r.sigle||'', layer:r.couche||'', kind:r.genre==='sequence'?'sequence':r.genre==='tableau'?'table':'diagram', target:cible[r.uid]||''}));
  return (_capAnaCache.scrDiag={cle, liste, parElement});
}

/**
 * Rend un résultat d'analyse transportable et exploitable par un script : copie profonde sans fonctions ni clés privées
 * (`_x`), Set → tableau, Map → objet, nœud XML → { $el } ; tout objet dont `id` (ou `linkId`) est un élément du modèle
 * reçoit `$el` (le noyau y attache l'élément). Les cycles sont coupés.
 * @param {*} v - Valeur
 * @param {number} [prof] - Profondeur (bornée)
 * @param {Set} [pile] - Objets en cours de copie (cycles)
 * @returns {*} Valeur propre
 */
function capScrNettoyer(v, prof, pile){
  prof=prof||0; pile=pile||new Set();
  if(v==null||typeof v!=='object') return typeof v==='function'?undefined:v;
  if(typeof Node!=='undefined'&&v instanceof Node){ const id=v.getAttribute&&(v.getAttribute('id')||capXId(v)); return id&&capGetElementById_(id)?{$el:id}:{id:id||'', tag:v.tagName||''}; }
  if(prof>12||pile.has(v)) return undefined;
  pile.add(v);
  let r;
  if(Array.isArray(v)) r=v.map(x=>capScrNettoyer(x,prof+1,pile)).filter(x=>x!==undefined);
  else if(v instanceof Set) r=[...v].map(x=>capScrNettoyer(x,prof+1,pile)).filter(x=>x!==undefined);
  else if(v instanceof Map){ r={}; for(const [k,x] of v){ const y=capScrNettoyer(x,prof+1,pile); if(y!==undefined) r[String(k)]=y; } }
  else {
    r={};
    for(const [k,x] of Object.entries(v)){ if(k[0]==='_'||k==='$el') continue; const y=capScrNettoyer(x,prof+1,pile); if(y!==undefined) r[k]=y; }
    const id=typeof v.id==='string'?v.id:typeof v.linkId==='string'?v.linkId:'';
    if(id&&capGetElementById_(id)) r.$el=id;
  }
  pile.delete(v);
  return r;
}

/** Cellules d'une ligne de contrôle (HTML de capDiagHtml) : texte, ou { $el, name } pour une cellule qui désigne un élément.
 * @param {string} html - Ligne `<tr>…</tr>` @returns {Array<string|{$el:string, name:string}>} */
function capScrCellules(html){
  const doc=new DOMParser().parseFromString('<table>'+html+'</table>','text/html');
  const tr=doc.querySelector('tr'); if(!tr) return [];
  return [...tr.cells].map(td=>{ const m=td.innerHTML.match(/capOpenDetail(?:ById)?\('([^']+)'/); const name=td.textContent.replace(/\s+/g,' ').trim();
    return m&&capGetElementById_(m[1])?{$el:m[1], name}:name; });
}

/**
 * Contrôles 🩺 de toutes les vues (ou d'une vue), avec le profil appliqué : lignes parsées depuis le HTML des sections.
 * @param {string} [vue] - Clé de vue (CAP_CHK_VIEWS : 'functions', 'chains', 'ana:reqs'…)
 * @returns {object[]} Sections { view, title, tip, severity, columns, rows:[[cellule…]] }
 */
function capScrControles(vue){
  const res=[];
  for(const [k,fn] of CAP_CHK_VIEWS){
    if(vue&&k!==vue) continue;
    let sections; try{ sections=capChkFilter(fn()); }catch(e){ res.push({view:k, title:_L('(erreur de calcul)'), tip:e.message, severity:'err', columns:[], rows:[]}); continue; }
    for(const s of sections) res.push({view:k, title:s.title, tip:s.tip||'', severity:s.sev||'warn', columns:(s.cols||[]).map(c=>String(c).replace(/<[^>]+>/g,'')), rows:(s.items||[]).map(capScrCellules)});
  }
  if(vue&&!res.length) throw new Error(_L(`Vue de contrôles inconnue : ${vue} (${CAP_CHK_VIEWS.map(v=>v[0]).join(', ')})`));
  return res;
}

/** Analyses servies aux scripts : nom public → calcul (arguments du script, { $id } pour un élément). */
const CAP_SCR_ANALYSES={
  functions:()=>capScrNettoyer(capComputeFunctions().list),
  chains:()=>capComputeChains().map(c=>({ $el:c.id, id:c.id, name:c.name, type:c.type, layer:c.layer||'', description:c.desc||'',
    steps:((c.graph&&c.graph.nodes)||[]).map(n=>Object.assign({kind:'function', nodeId:n.id, name:n.name||'', type:n.elemType||''}, n.refId&&capGetElementById_(n.refId)?{$el:n.refId}:{})),
    exchanges:((c.graph&&c.graph.edges)||[]).map(e=>Object.assign({name:e.name||'', from:e.srcId||'', to:e.tgtId||''}, e.refId&&capGetElementById_(e.refId)?{$el:e.refId}:{})),
    graph:capScrNettoyer(c.graph) })),
  traceability:o=>{ const t=capComputeTrace(!!(o&&o.transfo), !(o&&o.leafOnly===false)); return {links:capScrNettoyer(t.links), elements:capScrNettoyer(t.els), up:capScrNettoyer(t.up), down:capScrNettoyer(t.down)}; },
  capabilities:()=>capScrNettoyer(capComputeCapabilities()),
  states:()=>capScrNettoyer(capComputeStates()),
  health:()=>capScrNettoyer(capSanteCompute()),
  requirements:()=>capScrNettoyer(capComputeRequirements()),
  properties:()=>capScrNettoyer(capComputePvmt()),
  data:()=>capScrNettoyer(capComputeDataModel()),
  constraints:()=>capScrNettoyer(capComputeConstraints()),
  status:()=>capScrNettoyer(capComputeStatus()),
  categories:()=>capScrNettoyer(capComputeExchangeCategories()),
  rec:()=>capScrNettoyer(capComputeRec()),
  libraries:()=>capScrNettoyer(capLibScan()),
  scenarios:()=>capScrNettoyer(capComputeScenarios().list),
  ports:()=>{ const P=capComputePortLinks(); return capScrNettoyer({functionPorts:Object.values(P.fps), componentPorts:Object.values(P.cps), physicalPorts:Object.values(P.pps), functionalExchanges:P.fes, componentExchanges:P.ces, physicalLinks:P.pls}); },
  functionalExchanges:()=>capScrNettoyer(capComputeFunctionalExchanges().list),
  componentExchanges:()=>capScrNettoyer(capComputeCompExchanges()),
  physicalLinks:()=>capScrNettoyer(capComputePhysLinks()),
  deployment:()=>capScrNettoyer(capComputeDeploy()),
  sysml:()=>typeof _capSysml!=='undefined'&&_capSysml.lecture?capScrNettoyer(Object.assign(_capSysml.lecture.json(), {vues:capSyVuesListe()})):null,   // 🧩 SysML v2 (87) : null pour un modèle Capella
  checks:vue=>capScrControles(vue==null?'':String(vue)),
  nameQuality:nom=>capScrNettoyer(capNameQuality(String(nom==null?'':nom))),
  diagramsOf:el=>{ const id=el&&el.$id||String(el||''); return capScrDiagrammes().parElement[id]||[]; }
};

/**
 * Calcule une analyse demandée par un script (console : requête du worker, ou exécution dans la page).
 * @param {string} nom - Nom public de l'analyse (CAP_SCR_ANALYSES)
 * @param {Array} [args] - Arguments du script
 * @returns {*} Résultat propre, ou { $error } si l'analyse échoue
 */
function capScrAnalyse(nom, args){
  const f=CAP_SCR_ANALYSES[nom];
  if(!f) return {$error:_L(`Analyse inconnue : ${nom} (${Object.keys(CAP_SCR_ANALYSES).join(', ')})`)};
  try{ const r=f(...(args||[])); return r===undefined?null:r; }
  catch(e){ return {$error:_L(`Analyse ${nom} : ${e.message}`)}; }
}
