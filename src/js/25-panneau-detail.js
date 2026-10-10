// ── Detail panel ──
/** Ouvre le panneau de détail (colonne droite de l'overlay) pour un élément Capella.
 * @param {string} id - ID XML de l'élément
 */
function capOpenDetail(id){
  const el=capAllElements.find(e=>e.id===id); if(!el) return;
  const lv=CAP_LAYERS[el.layer]||{color:'#8b949e',bg:'rgba(139,148,158,.1)'};
  const name=el.attrs.name||'—sans nom—';
  const human=(CAP_HUMAN_NAMES[el.typeName]||{});
  const {parentOf, childrenOf}=capGetParentIndex();

  // ── Répartit les attributs : littéraux vs références sortantes (résolues) ──
  const literalRows=[]; const outgoingRefs=[];
  Object.entries({id:el.id, layer:el.layer, fullType:el.fullType, ...el.attrs}).forEach(([k,v])=>{
    if(!v) return;
    if(k!=='id' && k!=='layer' && k!=='fullType'){
      const refs=capParseAttrRefs_(String(v));
      const resolved=refs.map(r=>capGetElementById_(r)).filter(Boolean);
      if(resolved.length){ outgoingRefs.push({attrKey:k, targets:resolved}); return; }
    }
    literalRows.push([k,v]);
  });

  // ── Références entrantes (navigation inverse) : qui me référence ? ──
  const incoming=[];
  capAllElements.forEach(cand=>{
    if(cand.id===el.id) return;
    Object.entries(cand.attrs||{}).forEach(([k,v])=>{
      if(k==='name') return;
      if(capParseAttrRefs_(String(v)).includes(el.id)) incoming.push({from:cand, attrKey:k});
    });
  });

  // ── Owner (parent direct) et Owned elements (enfants directs, groupés par type) ──
  const parentId=parentOf[el.id];
  const parent=parentId?capAllElements.find(c=>c.id===parentId):null;
  const children=(childrenOf[el.id]||[]).map(cid=>capAllElements.find(c=>c.id===cid)).filter(Boolean);
  const childrenByType={};
  children.forEach(c=>{ (childrenByType[c.typeName]=childrenByType[c.typeName]||[]).push(c); });

  // ── Helpers HTML ──
  const elLink=e=>{
    const elv=CAP_LAYERS[e.layer]||{color:'#8b949e',bg:'rgba(139,148,158,.1)'};
    return `<span class="cap-det-link" onclick="capOpenDetail('${capEsc(e.id)}')" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:2px 6px;border-radius:4px;border:1px solid var(--c-border);margin:2px 3px 2px 0;font-size:11px;background:var(--c-bg2);" onmouseenter="this.style.borderColor='var(--c-accent)'" onmouseleave="this.style.borderColor='var(--c-border)'"><span style="color:${elv.color};font-size:9px;font-weight:700">${capEsc(e.typeName)}</span><span style="color:var(--c-text)">${capEsc(e.attrs.name||e.id.slice(0,12))}</span></span>`;
  };
  const secTitle=(txt,color)=>`<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${color||'var(--c-dim)'};margin:16px 0 6px;">${txt}</div>`;

  let html=`<span class="cap-type-badge" style="color:${lv.color};background:${lv.bg};display:inline-block;margin-bottom:6px">${capEsc(el.typeName)}</span>`;
  if(human.h) html+=`<div style="font-size:11px;color:var(--c-accent);font-weight:600;margin-bottom:2px;">${capEsc(human.h)}</div>`;
  if(human.d) html+=`<div style="font-size:11px;color:var(--c-dim);margin-bottom:8px;line-height:1.5;">${capEsc(human.d)}</div>`;
  html+=`<h3 style="font-size:14px;font-weight:600;margin-bottom:10px;word-break:break-word">${capEsc(name)}</h3>`;

  // Attributs littéraux
  html+=secTitle('Attributs');
  html+=`<table style="width:100%;border-collapse:collapse">${literalRows.map(([k,v])=>`<tr><td style="color:var(--c-dim);font-family:monospace;font-size:11px;padding:5px 0;width:100px;padding-right:10px;border-bottom:1px solid var(--c-border);vertical-align:top;">${capEsc(k)}</td><td style="color:var(--c-text);word-break:break-all;font-size:12px;padding:5px 0;border-bottom:1px solid var(--c-border);">${capEsc(String(v).slice(0,400))}</td></tr>`).join('')}</table>`;

  // Références sortantes (attributs → autres éléments, cliquables)
  if(outgoingRefs.length){
    html+=secTitle('Références sortantes →','#4dd880');
    outgoingRefs.forEach(r=>{
      html+=`<div style="margin-bottom:6px;"><span style="font-family:monospace;font-size:10px;color:var(--c-dim);">${capEsc(r.attrKey)}</span><div style="margin-top:2px;">${r.targets.map(elLink).join('')}</div></div>`;
    });
  }

  // Références entrantes (navigation inverse, cliquables)
  if(incoming.length){
    html+=secTitle('Références entrantes ← <span style="font-weight:400;text-transform:none;letter-spacing:0">(navigation inverse)</span>','#f0883e');
    const byAttr={};
    incoming.forEach(inc=>{ const key=inc.from.typeName+'.'+inc.attrKey; (byAttr[key]=byAttr[key]||[]).push(inc.from); });
    Object.entries(byAttr).forEach(([key,els])=>{
      html+=`<div style="margin-bottom:6px;"><span style="font-family:monospace;font-size:10px;color:var(--c-dim);">← ${capEsc(key)}</span><div style="margin-top:2px;">${els.map(elLink).join('')}</div></div>`;
    });
  }

  // Exigences, propriétés (PVMT) et contraintes de l'élément
  html+=capXtDetail(el.id, secTitle);

  // Owner
  if(parent){
    html+=secTitle('Owner (parent)','#a78bfa');
    html+=`<div>${elLink(parent)}</div>`;
  }

  // Owned elements
  if(children.length){
    html+=secTitle(`Owned elements (${children.length})`,'#58a6ff');
    Object.entries(childrenByType).sort().forEach(([t,els])=>{
      html+=`<div style="margin-bottom:6px;"><span style="font-family:monospace;font-size:10px;color:var(--c-dim);">${capEsc(t)} (${els.length})</span><div style="margin-top:2px;">${els.map(elLink).join('')}</div></div>`;
    });
  }

  document.getElementById('cap-detail-content').innerHTML=html;
  const det=document.getElementById('cap-detail');
  if(det){ det.style.display='flex'; }
}
/** Ouvre le panneau de détail à partir d'un nœud de l'arborescence Capella. */
function capOpenDetailNode(node){
  const el=capAllElements.find(e=>e.id===node.id);
  if(el) capOpenDetail(el.id);
}
document.getElementById('cap-detail-close')?.addEventListener('click',()=>{const d=document.getElementById('cap-detail');if(d)d.style.display='none';});

// ── Sub-toolbar wiring ──
// ── Capella toolbar view buttons (now in main toolbar) ──
const CAP_ELEM_VIEWS=['tree','cards','index']; // vues regroupées sous le menu 🧭 Explorateur (▤ Tableau : bouton direct)
let capElemView='cards';                               // dernier onglet ouvert dans 🧭 Explorateur
/** Met à jour les boutons actifs et les groupes de contrôles visibles
 * selon la vue Capella courante (tree/cards/table/links/chains/physlink).
 * @param {string} view
 */
function capUpdateToolbarForView(view){
  // Show/hide layer+csv group and tree group
  const layerGrp=document.getElementById('cap-tb-layer-grp');
  const treeGrp=document.getElementById('cap-tb-tree-grp');
  if(layerGrp) layerGrp.style.display=(view==='cards'||view==='table')?'flex':'none';
  if(treeGrp)  treeGrp.style.display=(view==='tree')?'flex':'none';
  // ▤ Tableau : son propre ⬇ CSV exporte les colonnes affichées ; celui de la barre (attributs bruts) reste pour ▦ Cartes
  const expCsv=document.getElementById('cap-exp-csv'); if(expCsv) expCsv.style.display=view==='table'?'none':'';
  // Barre de recherche / statistiques et compteur : inutiles dans les vues qui ont leurs propres filtres
  const own=['functions','analyses','dashboard','links','chains','physlink','compex','fex','oav','scen','cblk','csys','ports','index'].includes(view);
  const sub=document.getElementById('cap-sub-toolbar'), rc=document.getElementById('cap-result-count');
  // ▤ Tableau : ni recherche ni filtre de couche (filtres par colonne), mais le compteur reste
  if(sub) sub.style.display=(own||view==='table')?'none':'flex'; if(rc) rc.style.display=own?'none':'';
  // ▤ Tableau : chaque onglet a ses propres types cochés (51-tableau.js)
  if(typeof capTableTypesView==='function') capTableTypesView(view==='table');
  // Barre latérale des types : inutile dans les vues de 🔗 Liens à 📐 Tableau de bord
  const noSide=['links','chains','physlink','compex','fex','oav','scen','cblk','csys','ports','functions','analyses','dashboard'].includes(view);
  ['cap-sidebar','cap-sidebar-resizer'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display=noSide?'none':'flex'; });
  // Menu 🧭 Explorateur : regroupe Arborescence, Cartes et Index des types (onglets #cap-elem-tabs)
  const isElem=CAP_ELEM_VIEWS.includes(view);
  if(isElem) capElemView=view;
  const tabs=document.getElementById('cap-elem-tabs');
  if(tabs){ tabs.style.display=isElem?'flex':'none';
    tabs.querySelectorAll('[data-ev]').forEach(b=>b.classList.toggle('active', b.dataset.ev===view)); }
  // État actif des boutons de vue (barre générée par capNavRender)
  capNavSync(true);
}

/** Affiche une vue Capella (bascule en mode capella si besoin).
 * @param {string} view - 'tree'|'cards'|'table'|'index'|'links'|'chains'|…
 */
function capShowView(view){
  capCurrentView=view; capPage=0;
  capUpdateToolbarForView(view);
  if(currentMode!=='capella') applyMode('capella'); // bascule depuis la Relation Map
  else capRenderCurrentView();
}
// Boutons de vue de la barre du haut : voir 41-barre-vues.js (menus, épingles, Ctrl+K)
document.querySelectorAll('#cap-elem-tabs [data-ev]').forEach(b=>b.addEventListener('click',()=>capShowView(b.dataset.ev)));
// Tree expand/collapse
document.getElementById('cap-expand-all')?.addEventListener('click',()=>{
  const c=document.getElementById('cap-view-tree');if(!c)return;
  c.querySelectorAll('.cap-tree-children').forEach(e=>e.classList.add('open'));
  c.querySelectorAll('.cap-tree-tog:not(.leaf)').forEach(e=>e.classList.add('open'));
});
document.getElementById('cap-collapse-all')?.addEventListener('click',()=>{
  const c=document.getElementById('cap-view-tree');if(!c)return;
  c.querySelectorAll('.cap-tree-children').forEach(e=>e.classList.remove('open'));
  c.querySelectorAll('.cap-tree-tog:not(.leaf)').forEach(e=>e.classList.remove('open'));
});
document.getElementById('cap-search')?.addEventListener('input',e=>{capSearch=e.target.value;capPage=0;capRenderCurrentView();});
document.getElementById('cap-type-search')?.addEventListener('input',e=>capRenderSidebar(e.target.value));
document.getElementById('cap-sb-all')?.addEventListener('click',()=>{for(const t of Object.keys(capTypeRegistry)){capTypeRegistry[t].checked=true;capEnabledTypes.add(t);}capRenderSidebar();capRenderCurrentView();});
document.getElementById('cap-sb-none')?.addEventListener('click',()=>{for(const t of Object.keys(capTypeRegistry)){capTypeRegistry[t].checked=false;}capEnabledTypes.clear();capRenderSidebar();capRenderCurrentView();});
document.getElementById('cap-sb-def')?.addEventListener('click',()=>{for(const t of Object.keys(capTypeRegistry)){capTypeRegistry[t].checked=!CAP_TECHNICAL_TYPES.has(t);}capEnabledTypes=new Set(Object.keys(capTypeRegistry).filter(t=>capTypeRegistry[t].checked));capRenderSidebar();capRenderCurrentView();});
// Layer filter buttons (in toolbar)
document.querySelectorAll('#cap-tb-layer-grp .tbtn[data-layer]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#cap-tb-layer-grp .tbtn[data-layer]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');capCurrentLayer=btn.dataset.layer||'all';capPage=0;capRenderCurrentView();
  });
});
document.getElementById('cap-btn-prev')?.addEventListener('click',()=>{capPage--;capRenderTableBodyOnly();});
document.getElementById('cap-btn-next')?.addEventListener('click',()=>{capPage++;capRenderTableBodyOnly();});
document.getElementById('cap-page-size')?.addEventListener('change',e=>{capPageSize=+e.target.value;capPage=0;capRenderTableBodyOnly();});

// Exports
document.getElementById('cap-exp-json')?.addEventListener('click',()=>{
  const data={};for(const k of Object.keys(CAP_LAYERS))data[k]=[];
  for(const el of capAllElements)if(capEnabledTypes.has(el.typeName))(data[el.layer]||data.Shared).push({typeName:el.typeName,id:el.id,...el.attrs});
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='capella-export.json';a.click();URL.revokeObjectURL(a.href);
});
document.getElementById('cap-exp-csv')?.addEventListener('click',()=>{
  const cols=['layer','typeName','id',...CAP_ATTR_KEYS];
  const filtered=capAllElements.filter(e=>capEnabledTypes.has(e.typeName));
  const rows=filtered.map(el=>cols.map(k=>{const v=k==='layer'?el.layer:k==='typeName'?el.typeName:k==='id'?el.id:(el.attrs[k]||'');return'"'+String(v).replace(/"/g,'""')+'"';}).join(';')).join('\n');
  const blob=new Blob(['\uFEFF'+cols.join(';')+'\n'+rows],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='capella-export.csv';a.click();URL.revokeObjectURL(a.href);
});