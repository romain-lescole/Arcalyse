/* ═══════════════════════════════════════════════════════════════════════
   🗂 VUES DE LA RELATION MAP — onglets Vue 1 · Vue 2 · ＋ (comme ▤ Tableau)
   Chaque onglet retient le contexte, la profondeur, la disposition, les filtres
   (types, relations), les options d'affichage, les éléments masqués, les nœuds
   repliés, le zoom et la chaîne affichée. Tout changement est enregistré dans
   l'onglet actif (rmViewSync, appelé à la fin de render() et après un zoom).
   ═══════════════════════════════════════════════════════════════════════ */
var rmViews = {tabs:[], idx:0};   // tabs : [{name, auto, prefix, v}] ; v = état capturé (rmViewCapture)
var _rmViewApplying = false;      // application d'une vue en cours : pas d'enregistrement

/** Options d'affichage retenues dans une vue (clé de S → bouton de la barre 2). */
const RM_VIEW_FLAGS = {showNums:'b-num', showRelNames:'b-rln', cutNames:'b-cut', singleNode:'b-single', compact:'b-compact', showLegend:'b-leg'};

/** Préréglages proposés par le menu ＋ : relations cochées (clés relType de CAP_LINK_SECTIONS). */
const RM_VIEW_PRESETS = [
  {key:'struct', label:_L('🧱 Structure'), prefix:'🧱 ', rels:['PC NODE→PC NODE','PC BEHAVIOR→PC BEHAVIOR','PC Root→PC','LogicalComponent→LogicalComponent','SystemComponent→SystemComponent',
    'LogicalFunction→LogicalFunction','SystemFunction→SystemFunction','PhysicalFunction→PhysicalFunction','OperationalActivity→OperationalActivity','PC NODE→PC BEHAVIOR']},
  {key:'func', label:_L('ƒ Fonctionnel'), prefix:'ƒ ', rels:['LogicalFunction→LogicalFunction','SystemFunction→SystemFunction','PhysicalFunction→PhysicalFunction','OperationalActivity→OperationalActivity',
    'Entity→OperationalActivity','LogicalComponent→LogicalFunction','PC BEHAVIOR→PhysicalFunction','SystemComponent→SystemFunction',
    'FunctionalExchange: Function→Function','FunctionalChain→Function','FunctionalChain→FunctionalExchange']},
  {key:'itf', label:_L('🔌 Interfaces'), prefix:'🔌 ', rels:['ComponentExchange: Component→Component','PhysicalLink: PhysicalComponent→PhysicalComponent','Exchange→ExchangeItem',
    'ComponentExchange→FunctionalExchange','PhysicalLink→ComponentExchange','PhysicalPort→ComponentPort','PC NODE→PC BEHAVIOR']},
  {key:'trace', label:_L('🧬 Traçabilité'), prefix:'🧬 ', rels:['ComponentRealization: Component→Component','FunctionRealization: Function→Function',
    'FunctionalExchangeRealization: FunctionalExchange→FunctionalExchange','Mission→Capability','Capability→Function','Capability→FunctionalChain']},
  {key:'all', label:_L('⚡ Tout'), prefix:'', rels:null},
];

/** Capture l'état affiché de la Relation Map (contenu d'une vue).
 * @returns {object} État sérialisable
 */
function rmViewCapture(){
  const collapsed=[];
  const walk=n=>{ if(!n) return; if(n._saved&&n._saved.length&&!(n.children&&n.children.length)) collapsed.push(n.eid); (n.children||[]).forEach(walk); };
  walk(treeData);
  const t=d3.zoomTransform(svg.node());
  const v={ctx:S.ctx, depth:S.depth, layout:S.layout, relF:{...S.relF}, typF:{...S.typF}, hidden:[...S.hidden],
    legColl:!!S.legColl, collapsed, zoom:{k:t.k, x:t.x, y:t.y}, chain:S.chainView?S.chainView.id:null};
  Object.keys(RM_VIEW_FLAGS).forEach(k=>v[k]=!!S[k]);
  return v;
}

/** Nom automatique d'une vue : élément de contexte (et sa couche) ou chaîne affichée.
 * @param {object} tab - Onglet
 * @returns {string} Nom
 */
function rmViewAutoName(tab){
  const v=tab.v||{};
  if (v.chain) { const c=(capChainsForModal||[]).find(x=>x.id===v.chain); if (c) return (tab.prefix||'')+'⚡ '+c.name; }
  const el=v.ctx && MODEL.elements.find(e=>e.id===v.ctx);
  if (!el) return (tab.prefix||'')+_L(`Vue ${rmViews.tabs.indexOf(tab)+1}`);
  const lay=(capGetElementById_(v.ctx)||{}).layer;
  return (tab.prefix||'')+el.name+(lay?` (${lay})`:'');
}

/** Enregistre l'état affiché dans l'onglet actif (appelé à la fin de render() et après un zoom). */
function rmViewSync(){
  if (!rmViews.tabs.length || _rmViewApplying || _capBulk) return;
  const tab=rmViews.tabs[rmViews.idx]; if (!tab) return;
  tab.v=rmViewCapture();
  if (tab.auto) { const nm=rmViewAutoName(tab); if (nm!==tab.name) { tab.name=nm; rmViewsRender(); } }
}

/** Met les boutons de la barre 2 (options, profondeur, disposition) en accord avec S. */
function rmViewSyncToolbar(){
  Object.entries(RM_VIEW_FLAGS).forEach(([k,id])=>document.getElementById(id)?.classList.toggle('active', !!S[k]));
  document.getElementById('dep-inp').value=S.depth;
  document.querySelectorAll('.lbtn').forEach(b=>b.classList.toggle('active', b.dataset.l===S.layout));
  rmLayoutLabel();
}

/** Recopie dans S les filtres (types, relations) et les éléments masqués de l'onglet actif —
 * appelé par applyMode au retour en Relation Map, qui sinon recoche tout. */
function rmViewRestoreFilters(){
  const tab=rmViews.tabs[rmViews.idx]; if (!tab||!tab.v) return;
  const v=tab.v;
  if (v.relF) Object.keys(S.relF).forEach(t=>{ if (t in v.relF) S.relF[t]=v.relF[t]; });
  if (v.typF) Object.keys(S.typF).forEach(t=>{ if (t in v.typF) S.typF[t]=v.typF[t]; });
}

/** Applique une vue à la Relation Map : réglages, filtres, graphe, nœuds repliés, chaîne et zoom.
 * Les types et relations inconnus du modèle sont ignorés ; un contexte introuvable laisse le graphe vide.
 * @param {object} v - État capturé (rmViewCapture)
 */
function rmViewApply(v){
  v=v||{};
  _rmViewApplying=true;
  try {
    const ids=new Set(MODEL.elements.map(e=>e.id));
    S.depth=v.depth||3; S.layout=v.layout||'LR'; S.legColl=!!v.legColl;
    Object.keys(RM_VIEW_FLAGS).forEach(k=>{ if (k in v) S[k]=!!v[k]; });
    Object.keys(S.relF).forEach(t=>{ S.relF[t] = v.relF && (t in v.relF) ? v.relF[t] : true; });
    Object.keys(S.typF).forEach(t=>{ S.typF[t] = v.typF && (t in v.typF) ? v.typF[t] : true; });
    S.hidden=new Set((v.hidden||[]).filter(id=>ids.has(id)));
    S.ctx = v.ctx && ids.has(v.ctx) ? v.ctx : null;
    S.selNode=null;
    if (S.chainView) { S.chainView=null; rmChainBanner(null); }
    rmViewSyncToolbar();
    buildPanel(); setupMarkers(); rebuildTree();
    // Nœuds repliés à la main (par élément)
    const coll=new Set(v.collapsed||[]);
    if (coll.size) { const walk=n=>{ if(!n) return; if (coll.has(n.eid)&&n.children&&n.children.length) { n._saved=n.children; n.children=[]; } (n.children||[]).forEach(walk); }; walk(treeData); render(); }
    const chain=v.chain && (capChainsForModal||[]).find(c=>c.id===v.chain);
    if (chain) { S.chainView=chain; rmChainBanner(chain); render(); }
  } finally { _rmViewApplying=false; }
  if (v.zoom && isFinite(v.zoom.k)) svg.call(zoomBeh.transform, d3.zoomIdentity.translate(v.zoom.x, v.zoom.y).scale(v.zoom.k));
  else setTimeout(()=>fitView(false), 60);
  rmViewSync();
}

/** Crée un onglet.
 * @param {object} v - État de la vue
 * @param {object} [o] - {name, prefix} ; sans nom, le nom suit le contexte
 * @returns {object} Onglet
 */
function rmViewNewTab(v, o={}){
  return {name:o.name||'', auto:!o.name, prefix:o.prefix||'', v:JSON.parse(JSON.stringify(v))};
}

/** Affiche un onglet (après avoir enregistré l'onglet quitté). @param {number} i - Indice */
function rmViewSelect(i){
  if (i<0 || i>=rmViews.tabs.length) return;
  rmViewSync();
  rmViews.idx=i; rmViewsRender();
  rmViewApply(rmViews.tabs[i].v);
}

/** Ajoute un onglet et l'affiche.
 * @param {'copy'|'empty'|string} kind - Copie de la vue affichée, vue vide, ou clé d'un préréglage
 */
function rmViewAdd(kind){
  rmViewSync();
  const cur=rmViewCapture();
  let v=cur, o={};
  if (kind==='empty') {
    v={ctx:cur.ctx, depth:3, layout:'LR', relF:{}, typF:{}, hidden:[], collapsed:[], zoom:null, chain:null,
       showNums:false, showRelNames:true, cutNames:false, singleNode:true, compact:false, showLegend:true, legColl:false};
  } else if (kind!=='copy') {
    const p=RM_VIEW_PRESETS.find(x=>x.key===kind); if (!p) return;
    const keep=p.rels && new Set(p.rels);
    v={...cur, relF:Object.fromEntries(Object.keys(S.relF).map(t=>[t, !keep || keep.has(t)])), collapsed:[], zoom:null, chain:null};
    o.prefix=p.prefix;
  } else { v={...cur, zoom:null}; }
  const tab=rmViewNewTab(v, o);
  rmViews.tabs.push(tab);
  tab.name=rmViewAutoName(tab);
  rmViews.idx=rmViews.tabs.length-1; rmViewsRender();
  rmViewApply(tab.v);
}

/** Ferme un onglet (au moins un onglet reste). @param {number} i - Indice */
function rmViewClose(i){
  const tab=rmViews.tabs[i]; if (!tab || rmViews.tabs.length<2) return;
  if (!confirm(_L(`Fermer la vue « ${tab.name} » ?`))) return;
  rmViews.tabs.splice(i,1);
  const was=rmViews.idx;
  rmViews.idx = i<was ? was-1 : Math.min(was, rmViews.tabs.length-1);
  rmViewsRender();
  if (i===was) rmViewApply(rmViews.tabs[rmViews.idx].v);
}

/** Dessine la barre d'onglets des vues (#rm-tabs). */
function rmViewsRender(){
  const bar=document.getElementById('rm-tabs-list'); if (!bar) return;
  bar.innerHTML='';
  const ids=new Set(MODEL.elements.map(e=>e.id));
  rmViews.tabs.forEach((tab,i)=>{
    const t=document.createElement('div'); t.className='rm-tab'+(i===rmViews.idx?' on':''); t.draggable=true;
    t.title=_L('Clic : afficher · double-clic : renommer · glisser : déplacer');
    const lost=tab.v&&tab.v.ctx&&!ids.has(tab.v.ctx);
    const nm=document.createElement('span'); nm.className='rm-tab-n'; nm.textContent=tab.name||_L(`Vue ${i+1}`);
    t.appendChild(nm);
    if (lost) { const w=document.createElement('span'); w.className='rm-tab-w'; w.textContent='⚠'; w.title=_L('Élément de contexte introuvable dans ce modèle : choisissez-en un autre (arborescence ou double-clic)'); t.appendChild(w); }
    if (rmViews.tabs.length>1) { const x=document.createElement('span'); x.className='rm-tab-x'; x.textContent='✕'; x.title=_L('Fermer cette vue');
      x.onclick=ev=>{ ev.stopPropagation(); rmViewClose(i); }; t.appendChild(x); }
    t.onclick=()=>{ if (i!==rmViews.idx) rmViewSelect(i); };
    t.ondblclick=()=>{
      const inp=document.createElement('input'); inp.className='rm-tab-in'; inp.value=tab.name;
      nm.replaceWith(inp); inp.focus(); inp.select();
      const done=ok=>{ const val=inp.value.trim(); if (ok&&val) { tab.name=val; tab.auto=false; } else if (ok&&!val) { tab.auto=true; tab.name=rmViewAutoName(tab); } rmViewsRender(); };
      inp.onkeydown=ev=>{ if (ev.key==='Enter') done(true); if (ev.key==='Escape') done(false); ev.stopPropagation(); };
      inp.onblur=()=>done(true);
    };
    // Glisser-déposer : réordonne les onglets
    t.ondragstart=ev=>{ ev.dataTransfer.setData('text/plain', String(i)); t.classList.add('drag'); };
    t.ondragend=()=>t.classList.remove('drag');
    t.ondragover=ev=>ev.preventDefault();
    t.ondrop=ev=>{ ev.preventDefault(); const from=+ev.dataTransfer.getData('text/plain'); if (isNaN(from)||from===i) return;
      const active=rmViews.tabs[rmViews.idx]; const [m]=rmViews.tabs.splice(from,1); rmViews.tabs.splice(i,0,m);
      rmViews.idx=rmViews.tabs.indexOf(active); rmViewsRender(); };
    bar.appendChild(t);
  });
}

/** Télécharge la vue affichée dans un fichier .json (💾 Sauver vue). */
function rmViewSave(){
  rmViewSync();
  const tab=rmViews.tabs[rmViews.idx]; if (!tab) return;
  const data={type:'arcalyse-rm-view', version:1, name:tab.name, auto:tab.auto, prefix:tab.prefix, view:tab.v};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download='relation-map-vue-'+(tab.name||'vue').replace(/[\\/:*?"<>|]+/g,'_').slice(0,60)+'.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/** Charge une vue enregistrée (📂 Charger vue) : elle s'ouvre dans un nouvel onglet.
 * @param {File} file - Fichier .json produit par 💾 Sauver vue
 */
function rmViewLoadFile(file){
  const r=new FileReader();
  r.onload=ev=>{
    try {
      const d=JSON.parse(ev.target.result);
      if (d.type!=='arcalyse-rm-view' || !d.view) throw new Error(_L('ce fichier n\'est pas une vue de la Relation Map'));
      rmViewSync();
      const tab=rmViewNewTab(d.view, {name:d.auto?'':d.name, prefix:d.prefix});
      rmViews.tabs.push(tab); if (tab.auto) tab.name=rmViewAutoName(tab);
      rmViews.idx=rmViews.tabs.length-1; rmViewsRender(); rmViewApply(tab.v);
    } catch(err) { alert(_L('Vue illisible : ')+err.message); }
  };
  r.readAsText(file);
}

/** Après le chargement d'un modèle : crée la première vue, ou réapplique la vue active (vues gardées). */
function rmViewsOnModelLoad(){
  // Première vue : réglages de départ (au chargement, les relations Capella sont décochées ; l'entrée en
  // Relation Map les coche toutes) — relF / typF vides = tout coché
  if (!rmViews.tabs.length) { const tab=rmViewNewTab({...rmViewCapture(), relF:{}, typF:{}, zoom:null}); rmViews.tabs=[tab]; rmViews.idx=0; tab.name=rmViewAutoName(tab); rmViewsRender(); return; }
  rmViews.idx=Math.min(Math.max(0, rmViews.idx|0), rmViews.tabs.length-1);
  rmViews.tabs.forEach(t=>{ if (t.auto) t.name=rmViewAutoName(t); });
  rmViewsRender();
  rmViewApply(rmViews.tabs[rmViews.idx].v);
}

/** État des vues pour la 💾 Page HTML et le fichier ⚙ Interface et vues.
 * @returns {{tabs:Array, idx:number}} Vues */
function rmViewsCfgGet(){ rmViewSync(); return {tabs:rmViews.tabs, idx:rmViews.idx}; }

/** Remplace les vues par celles d'une configuration (page enregistrée ou fichier ⚙).
 * @param {{tabs:Array, idx:number}} c - Vues */
function rmViewsCfgSet(c){
  if (!c || !Array.isArray(c.tabs) || !c.tabs.length) return;
  rmViews={tabs:c.tabs.filter(t=>t&&t.v).map(t=>({name:t.name||'', auto:!!t.auto, prefix:t.prefix||'', v:t.v})), idx:c.idx|0};
  if (!rmViews.tabs.length) { rmViews={tabs:[], idx:0}; return; }
  if (capLoaded) rmViewsOnModelLoad(); else rmViewsRender();
}

// ── Câblage : menu ＋, sauver / charger, zoom ──
{
  const add=document.getElementById('rm-tab-add'), dd=document.getElementById('rm-tab-add-dd');
  dd.innerHTML=`<div class="ctx-i" data-k="copy">${_L('⧉ Copie de la vue affichée')}</div><div class="ctx-i" data-k="empty">${_L('□ Vue vide (réglages de départ)')}</div>`
    +`<div class="rm-dd-l">${_L('Préréglages (relations cochées)')}</div>`+RM_VIEW_PRESETS.map(p=>`<div class="ctx-i" data-k="${p.key}">${p.label}</div>`).join('');
  add.onclick=ev=>{ ev.stopPropagation(); dd.classList.toggle('open'); };
  dd.querySelectorAll('[data-k]').forEach(it=>it.onclick=()=>{ dd.classList.remove('open'); rmViewAdd(it.dataset.k); });
  document.addEventListener('click', ev=>{ if (!ev.target.closest('#rm-tab-add-wrap')) dd.classList.remove('open'); });
  document.getElementById('rm-view-save').onclick=rmViewSave;
  const inp=document.getElementById('rm-view-input');
  document.getElementById('rm-view-load').onclick=()=>inp.click();
  inp.onchange=()=>{ if (inp.files[0]) rmViewLoadFile(inp.files[0]); inp.value=''; };
  zoomBeh.on('end.rmviews', ()=>rmViewSync());
}
