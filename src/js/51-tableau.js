/* ══ ▤ TABLEAU — onglets de vues, tri, ordre des colonnes, colonnes de relations, export CSV ══
 * Complète le tableau de 21-capella-vues-base.js (⊞ Colonnes, filtres par colonne, largeurs,
 * ✨ Colonne par chemin) avec ce que proposait l'ancienne 📊 Table View, retirée :
 *  - onglets de vues (chacun : colonnes affichées et leur ordre, filtres, largeurs, tri) ;
 *  - tri par clic sur l'en-tête (▲ / ▼ / sans tri) et déplacement des colonnes par glisser-déposer ;
 *  - colonnes de relations : les relations de 🔗 Liens (CAP_LINK_SECTIONS), dans les deux sens ;
 *  - export CSV des colonnes affichées (toutes les lignes filtrées, dans l'ordre du tri).
 * Les réglages de l'ancienne Table View (page enregistrée, fichier ⚙, vue .json) sont convertis en onglets.
 * L'état des onglets (capTableTabs, capTableTabIdx, capTableSort) est déclaré dans 21, car il est relu
 * au chargement de la page par capCfgRestoreViews (46).
 */

/** Crée un onglet de vue du tableau.
 * @param {string} name - Nom de l'onglet
 * @param {object} [from] - Onglet dont on copie les colonnes et largeurs (nouvel onglet = copie de la vue, sans type coché)
 * @returns {object} {id, name, visibleCols, colFilters, colWidths, sort, types, scope}
 */
function capTableTabNew(name, from){
  return {
    id:'ttab-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
    name:name||'Vue 1',
    visibleCols: from&&from.visibleCols ? [...from.visibleCols] : null,
    colFilters:{},
    colWidths: from ? {...(from.colWidths||{})} : {},
    sort:{col:null, dir:1},
    // Types cochés propres à l'onglet : aucun pour un nouvel onglet ; null = reprendre ceux des autres vues
    types: from ? [] : null,
    scope:{ids:[], direct:false}   // 🎯 portée : vide = tout le modèle
  };
}

/** Garantit l'existence d'au moins un onglet ; le premier reprend l'état courant du tableau. */
function capTableTabsEnsure(){
  if (capTableTabs && capTableTabs.length) return;
  capTableTabs=[capTableTabNew('Vue 1')]; capTableTabIdx=0;
  capTableSyncToTab();
}

/** Copie l'état de travail du tableau (colonnes, filtres, largeurs, tri) dans l'onglet actif. */
function capTableSyncToTab(){
  const t=capTableTabs&&capTableTabs[capTableTabIdx]; if(!t) return;
  t.visibleCols=capTableVisibleCols; t.colFilters=capTableColFilters; t.colWidths=capTableColWidths; t.sort=capTableSort; t.scope=capTableScope;
  if (_capTableTypesOn) t.types=[...capEnabledTypes];
}

/** Charge l'état de l'onglet actif dans les variables de travail du tableau. */
function capTableSyncFromTab(){
  const t=capTableTabs&&capTableTabs[capTableTabIdx]; if(!t) return;
  capTableVisibleCols=t.visibleCols||null; capTableColFilters=t.colFilters||{};
  capTableColWidths=t.colWidths||{}; capTableSort=t.sort||{col:null, dir:1};
  capTableScope=t.scope&&Array.isArray(t.scope.ids) ? t.scope : (t.scope={ids:[], direct:false});
  if (_capTableTypesOn) { capTableTypesLoad(); capTableSidebar(); }
}

/* ── Types cochés propres à chaque onglet ──────────────────────────────────────
 * Pendant que le ▤ Tableau est affiché, la barre latérale des types montre et modifie les types de
 * l'onglet actif ; ceux des autres vues (Cartes, Arborescence…) sont mis de côté puis rétablis. */
var _capTableTypesOn=false;  // vrai : capEnabledTypes contient les types de l'onglet actif (remis à faux au chargement d'un modèle, 20)
var _capTypesGlobal=null;    // types cochés des autres vues, mis de côté pendant l'affichage du tableau

/** Applique un ensemble de types cochés à la barre latérale (registre) et aux filtres.
 * @param {Iterable<string>} types - Types à cocher
 */
function capTableTypesApply(types){
  capEnabledTypes=new Set(types);
  Object.entries(capTypeRegistry).forEach(([t,info])=>{ info.checked=capEnabledTypes.has(t); });
}

/** Charge les types de l'onglet actif (un onglet sans réglage reprend les types des autres vues). */
function capTableTypesLoad(){
  const t=capTableTabs&&capTableTabs[capTableTabIdx]; if(!t) return;
  if (!Array.isArray(t.types)) t.types=[...(_capTypesGlobal||capEnabledTypes)];
  capTableTypesApply(t.types);
}

/** Redessine la barre latérale des types en gardant la recherche saisie. */
function capTableSidebar(){
  if (typeof capRenderSidebar==='function') capRenderSidebar((document.getElementById('cap-type-search')||{}).value||'');
}

/** Entrée dans le ▤ Tableau ou sortie : échange les types cochés de l'onglet et ceux des autres vues.
 * Appelé à chaque changement de vue (capUpdateToolbarForView).
 * @param {boolean} on - Vrai si la vue affichée est le tableau
 */
function capTableTypesView(on){
  if (on===_capTableTypesOn || !capLoaded) return;
  if (on) {
    capTableTabsEnsure();
    _capTypesGlobal=new Set(capEnabledTypes); _capTableTypesOn=true;
    capTableTypesLoad();
  } else {
    const t=capTableTabs&&capTableTabs[capTableTabIdx]; if (t) t.types=[...capEnabledTypes];
    _capTableTypesOn=false;
    capTableTypesApply(_capTypesGlobal||capEnabledTypes); _capTypesGlobal=null;
  }
  capTableSidebar();
}

/** Active un onglet du tableau (l'état de l'onglet quitté est conservé).
 * @param {number} idx - Index de l'onglet
 */
function capTableTabSwitch(idx){
  capTableSyncToTab();
  capTableTabIdx=Math.max(0, Math.min(idx, capTableTabs.length-1));
  capTableSyncFromTab(); capPage=0;
  capRenderTable();
}

/** Rend la barre d'onglets du tableau : clic = ouvrir, double-clic = renommer, ✕ = fermer,
 * + = nouvel onglet (copie des colonnes de la vue affichée). */
function capRenderTableTabs(){
  const bar=document.getElementById('cap-table-tabs'); if(!bar) return;
  capTableTabsEnsure();
  bar.innerHTML='';
  capTableTabs.forEach((tab, idx)=>{
    const el=document.createElement('div');
    el.className='cap-ttab'+(idx===capTableTabIdx?' active':'');
    el.title='Clic : afficher · double-clic : renommer';
    const nm=document.createElement('span'); nm.textContent=tab.name;
    nm.ondblclick=ev=>{
      ev.stopPropagation();
      const inp=document.createElement('input'); inp.className='cap-ttab-rename'; inp.value=tab.name;
      nm.replaceWith(inp); inp.focus(); inp.select();
      const commit=()=>{ tab.name=inp.value.trim()||tab.name; capRenderTableTabs(); };
      inp.onblur=commit;
      inp.onkeydown=e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') capRenderTableTabs(); };
    };
    el.appendChild(nm);
    if (capTableTabs.length>1) {
      const x=document.createElement('span'); x.className='cap-ttab-close'; x.textContent='✕'; x.title='Fermer cet onglet';
      x.onclick=ev=>{
        ev.stopPropagation();
        if (!confirm(`Fermer l'onglet « ${tab.name} » ?`)) return;
        capTableSyncToTab();
        capTableTabs.splice(idx,1);
        if (capTableTabIdx>idx || capTableTabIdx>=capTableTabs.length) capTableTabIdx=Math.max(0,capTableTabIdx-1);
        capTableSyncFromTab(); capPage=0; capRenderTable();
      };
      el.appendChild(x);
    }
    el.onclick=()=>{ if(idx!==capTableTabIdx) capTableTabSwitch(idx); };
    bar.appendChild(el);
  });
  const add=document.createElement('span'); add.className='cap-ttab-add'; add.textContent='+';
  add.title='Nouvel onglet (copie des colonnes de la vue affichée)';
  add.onclick=()=>{
    capTableSyncToTab();
    capTableTabs.push(capTableTabNew('Vue '+(capTableTabs.length+1), capTableTabs[capTableTabIdx]));
    capTableTabSwitch(capTableTabs.length-1);
  };
  bar.appendChild(add);
}

/* ── Colonnes de relations (relations de 🔗 Liens) ─────────────────────────────── */
var _capTableRelIdx=null; // index des relations par élément, recalculé quand capLinksData change (var : remis à zéro par 20)

/** Index des relations Capella par élément : pour chaque relation, éléments cibles (out) et sources (in).
 * @returns {object} {cléRelation: {out:{id:[{name,id}]}, in:{id:[…]}, n}}
 */
function capTableRelIndex(){
  if (!capLinksData) capLinksData=capComputeLinks();
  if (_capTableRelIdx && _capTableRelIdx._src===capLinksData) return _capTableRelIdx;
  const idx={_src:capLinksData};
  CAP_LINK_SECTIONS.forEach(sec=>{
    const rows=capLinksData[sec.key]||[]; if(!rows.length) return;
    const out={}, inn={};
    rows.forEach(r=>{
      if (!r.src||!r.tgt||!r.src.id||!r.tgt.id) return;
      (out[r.src.id]=out[r.src.id]||[]).push(r.tgt);
      (inn[r.tgt.id]=inn[r.tgt.id]||[]).push(r.src);
    });
    idx[sec.key]={out, in:inn, n:rows.length};
  });
  return _capTableRelIdx=idx;
}

/** Décode une clé de colonne de relation « rel:<relation>:out|in ».
 * @param {string} colKey - Clé de colonne
 * @returns {{sec:object, dir:string}|null} Relation et sens, ou null
 */
function capTableRelParse(colKey){
  const m=/^rel:([^:]+):(out|in)$/.exec(colKey||''); if(!m) return null;
  const sec=CAP_LINK_SECTIONS.find(s=>s.key===m[1]);
  return sec ? {sec, dir:m[2]} : null;
}

/** Libellés lisibles des deux extrémités d'une relation (types source et cible).
 * @param {object} sec - Relation de CAP_LINK_SECTIONS
 * @returns {string[]} [source, cible]
 */
function capTableRelEnds(sec){
  const h=t=>(CAP_HUMAN_NAMES[t]||{}).h||t;
  if (sec.srcT||sec.tgtT) return [h(sec.srcT||''), h(sec.tgtT||'')];
  const p=(sec.relType||'').replace(/^[^:→]*:\s*/,'').split('→').map(s=>s.trim());
  return [h(p[0]||''), h(p[1]||'')];
}

/** Valeurs d'une colonne de relation pour un élément : noms des éléments liés (sans doublon).
 * @param {object} el - Élément capAllElements
 * @param {string} colKey - Clé « rel:… »
 * @returns {string[]} Noms des éléments liés
 */
function capTableRelValues(el, colKey){
  const p=capTableRelParse(colKey); if(!p) return [];
  const ix=capTableRelIndex()[p.sec.key]; if(!ix) return [];
  const seen=new Set(), res=[];
  (ix[p.dir][el.id]||[]).forEach(x=>{ if(seen.has(x.id)) return; seen.add(x.id); res.push(x.name||x.id); });
  return res;
}

/** Libellé d'en-tête d'une colonne de relation.
 * @param {string} colKey - Clé « rel:… »
 * @returns {string} Libellé
 */
function capTableRelLabel(colKey){
  const p=capTableRelParse(colKey); if(!p) return colKey;
  const h=p.sec.humanLabel||p.sec.relType;
  return p.dir==='out' ? `${h} → cibles` : `${h} ← sources`;
}

/** Ajoute au menu ⊞ Colonnes les sections « Relations — … » (groupes de 🔗 Liens) : une entrée par
 * relation présente dans le modèle, avec son nombre de liens, les types reliés et deux cases :
 * « → cibles » (éléments vers lesquels pointe la ligne) et « ← sources » (éléments qui pointent vers elle).
 * @param {HTMLElement} listWrap - Liste du menu
 * @param {string} q - Recherche en minuscules
 * @param {function(string, boolean)} onToggle - Affiche / masque une colonne
 * @returns {boolean} Vrai si au moins une relation est listée
 */
function capTableRelPicker(listWrap, q, onToggle){
  const ix=capTableRelIndex(), vis=capTableVisibleCols||CAP_TABLE_BUILTIN_COLS;
  const groups=[...CAP_LINK_GROUPS, {key:'', label:'Autres'}];
  const known=new Set(CAP_LINK_GROUPS.map(g=>g.key));
  let any=false;
  groups.forEach(g=>{
    const secs=CAP_LINK_SECTIONS.filter(s=>ix[s.key] && (g.key ? s.grp===g.key : !known.has(s.grp)));
    const shown=secs.filter(s=>{ if(!q) return true; const [a,b]=capTableRelEnds(s);
      return [s.humanLabel, s.relType, a, b, g.label].join(' ').toLowerCase().includes(q); });
    if (!shown.length) return;
    any=true;
    const h=document.createElement('div'); h.className='cap-colpicker-section'; h.textContent='Relations — '+g.label;
    listWrap.appendChild(h);
    shown.forEach(s=>{
      const [st,tt]=capTableRelEnds(s);
      const it=document.createElement('div'); it.className='cap-cpr';
      it.innerHTML=`<div class="cap-cpr-l"><span>${capEsc(s.humanLabel||s.relType)}</span><span class="cap-cpr-n" title="Nombre de liens dans le modèle">${ix[s.key].n}</span></div>`;
      const d=document.createElement('div'); d.className='cap-cpr-d';
      [['out', `→ cibles (${tt})`, `Colonne sur les lignes ${st} : les ${tt} liés`],
       ['in',  `← sources (${st})`, `Colonne sur les lignes ${tt} : les ${st} liés`]].forEach(([dir,lab,tip])=>{
        const key='rel:'+s.key+':'+dir;
        const l=document.createElement('label'); l.className='cap-cpr-c'; l.title=tip;
        const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=vis.includes(key);
        cb.onclick=ev=>ev.stopPropagation();
        cb.onchange=()=>onToggle(key, cb.checked);
        l.appendChild(cb); l.appendChild(document.createTextNode(' '+lab));
        d.appendChild(l);
      });
      it.appendChild(d);
      listWrap.appendChild(it);
    });
  });
  return any;
}

/* ── Lignes, tri, glisser-déposer, export ──────────────────────────────────────── */

/** Lignes du tableau : éléments filtrés (types cochés et portée de l'onglet, filtres par colonne), triés
 * selon le tri de l'onglet actif (les cellules vides restent en bas).
 * @returns {object[]} Éléments capAllElements
 */
function capTableRows(){
  // Types cochés de l'onglet seulement : la recherche et le filtre de couche des autres vues ne s'appliquent pas ici
  const inScope=capTableScopeSet();   // 🎯 portée de l'onglet (null = tout le modèle)
  let rows=capAllElements.filter(el=>capEnabledTypes.has(el.typeName) && (!inScope||inScope.has(el.id)));
  Object.entries(capTableColFilters).forEach(([colKey,val])=>{
    if (!val) return;
    const q=val.toLowerCase();
    rows=rows.filter(el=>capTableGetVal(el,colKey).toLowerCase().includes(q));
  });
  const vis=capTableVisibleCols||CAP_TABLE_BUILTIN_COLS, c=capTableSort.col, d=capTableSort.dir||1;
  if (c && vis.includes(c)) {
    const cache=new Map();
    const v=el=>{ let x=cache.get(el); if(x===undefined){ x=capTableGetVal(el,c); cache.set(el,x); } return x; };
    rows=rows.slice().sort((a,b)=>{ const A=v(a), B=v(b);
      if (!A&&B) return 1; if (A&&!B) return -1;
      return A.localeCompare(B,'fr',{numeric:true, sensitivity:'base'})*d; });
  }
  return rows;
}

/** Passe au tri suivant sur une colonne : croissant ▲, décroissant ▼, puis sans tri.
 * @param {string} colKey - Clé de colonne
 */
function capTableSortCycle(colKey){
  if (capTableSort.col!==colKey) capTableSort={col:colKey, dir:1};
  else if (capTableSort.dir===1) capTableSort={col:colKey, dir:-1};
  else capTableSort={col:null, dir:1};
  capPage=0; capRenderTableBodyOnly();
}

var _capTableDragCol=null; // colonne en cours de déplacement

/** Rend un en-tête déplaçable : glisser-déposer sur un autre en-tête pour changer l'ordre des colonnes.
 * @param {HTMLElement} th - En-tête
 * @param {string} colKey - Clé de la colonne
 * @param {HTMLElement} thead - En-tête du tableau (nettoyage des repères)
 */
function capTableColDnD(th, colKey, thead){
  th.draggable=true;
  th.ondragstart=ev=>{
    if (_capColResizing) { ev.preventDefault(); return; }
    _capTableDragCol=colKey;
    ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain', colKey);
    requestAnimationFrame(()=>th.classList.add('cap-col-dragging'));
  };
  th.ondragend=()=>{
    th.classList.remove('cap-col-dragging'); _capTableDragCol=null;
    thead.querySelectorAll('.cap-col-drag-over').forEach(e=>e.classList.remove('cap-col-drag-over'));
  };
  th.ondragover=ev=>{
    if (!_capTableDragCol||_capTableDragCol===colKey) return;
    ev.preventDefault(); th.classList.add('cap-col-drag-over');
  };
  th.ondragleave=ev=>{ if(!th.contains(ev.relatedTarget)) th.classList.remove('cap-col-drag-over'); };
  th.ondrop=ev=>{
    ev.preventDefault(); th.classList.remove('cap-col-drag-over');
    const src=_capTableDragCol; if (!src||src===colKey) return;
    const o=capTableVisibleCols, from=o.indexOf(src), to=o.indexOf(colKey); if (from<0||to<0) return;
    o.splice(from,1); o.splice(to,0,src);
    capRenderTableBodyOnly();
  };
}

/** Exporte en CSV les colonnes affichées, pour toutes les lignes filtrées (dans l'ordre du tri). */
function capTableCsv(){
  const cols=capTableVisibleCols||CAP_TABLE_BUILTIN_COLS;
  const tab=capTableTabs&&capTableTabs[capTableTabIdx];
  const nm=(tab?tab.name:'tableau').replace(/[^\w\-àâäéèêëîïôöùûüç ]+/gi,'').trim().replace(/\s+/g,'-')||'tableau';
  capCsvDownload('tableau-'+nm+'.csv', cols.map(capTableColLabel), capTableRows().map(el=>cols.map(c=>capTableGetVal(el,c))));
}

/* ── Réglages enregistrés (⚙, 💾 Page HTML, 💾 Sauver vue) ─────────────────────── */

/** État du tableau pour l'enregistrement : onglets, colonnes par chemin, affichage des cellules multiples.
 * Les champs de l'onglet actif sont aussi écrits à plat (lecture par une version antérieure).
 * @returns {object} État sérialisable
 */
function capTableCfgGet(){
  capTableTabsEnsure(); capTableSyncToTab();
  return {tabs:capTableTabs, active:capTableTabIdx, customCols:capTableCustomCols, multiValDisplay:capTableMultiValDisplay,
    visibleCols:capTableVisibleCols, colFilters:capTableColFilters, colWidths:capTableColWidths};
}

/** Applique un état enregistré du tableau (format à onglets, ou ancien format à une seule vue).
 * @param {object} v - État produit par capTableCfgGet (ou ancien format)
 */
function capTableCfgSet(v){
  capTableCustomCols=v.customCols||[]; capTableMultiValDisplay=v.multiValDisplay||'inline';
  if (Array.isArray(v.tabs)&&v.tabs.length) {
    capTableTabs=v.tabs.map(t=>Object.assign(capTableTabNew(t.name), t));
    capTableTabIdx=Math.min(v.active||0, capTableTabs.length-1);
  } else {
    capTableTabs=[Object.assign(capTableTabNew('Vue 1'), {visibleCols:v.visibleCols||null, colFilters:v.colFilters||{}, colWidths:v.colWidths||{}})];
    capTableTabIdx=0;
  }
  capTableSyncFromTab();
}


/** Colonnes par chemin de l'ancienne Table View reprises telles quelles : celles qui ne suivent aucune
 * relation de la Relation Map (relations propres à l'ancienne vue, sans équivalent ici).
 * @param {Array} cc - Colonnes personnalisées de la Table View
 * @returns {Array} Colonnes reprises
 */
function capTableTvCustom(cc){
  return (cc||[]).filter(c=>c&&c.key&&Array.isArray(c.steps)&&c.steps.length&&c.steps.every(s=>s&&s.property&&s.property.kind!=='rel'))
    .map(c=>({key:c.key, label:c.label, steps:c.steps}));
}

/** Convertit un onglet (ou une vue .json) de l'ancienne Table View en onglet du tableau.
 * @param {object} t - {name, colOrder, hiddenCols, filters, colWidths, sort}
 * @param {function(string):boolean} ok - Colonne reprise ?
 * @returns {object} Onglet du tableau
 */
function capTableTvTab(t, ok){
  // Correspondance des colonnes de l'ancienne Table View (fonction appelée au chargement de la page,
  // avant l'exécution de ce module : pas de constante de premier niveau ici)
  const MAP={'Name':'name','ID':'id','Type':'typeName','Human Type':'humanType','Parent':'parent','Owned element':'ownedElement'};
  const m=k=>MAP[k]||k;
  const hidden=t.hiddenCols instanceof Set ? t.hiddenCols : new Set(t.hiddenCols||[]);
  const vis=(t.colOrder||Object.keys(MAP)).filter(k=>!hidden.has(k)).map(m).filter(ok);
  const f={}, w={};
  Object.entries(t.filters||{}).forEach(([k,v])=>{ if(v&&ok(m(k))) f[m(k)]=v; });
  Object.entries(t.colWidths||{}).forEach(([k,v])=>{ if(ok(m(k))) w[m(k)]=v; });
  const s=t.sort&&t.sort.col&&ok(m(t.sort.col)) ? {col:m(t.sort.col), dir:t.sort.dir||1} : {col:null, dir:1};
  return Object.assign(capTableTabNew(t.name||'Vue'), {visibleCols:vis.length?vis:null, colFilters:f, colWidths:w, sort:s});
}

/** Reprend les réglages de l'ancienne 📊 Table View (page enregistrée ou fichier ⚙) : ses onglets
 * deviennent des onglets « … (Table View) » du tableau, ses colonnes par chemin compatibles sont ajoutées.
 * Rien n'est repris si la Table View n'avait pas été personnalisée.
 * @param {object} v - {tabs, active, customCols, multiValDisplay}
 * @returns {number} Nombre d'onglets ajoutés
 */
function capTableImportTv(v){
  if (!v) return 0;
  const tabs=Array.isArray(v.tabs)?v.tabs:[];
  const used=(v.customCols||[]).length || tabs.length>1 ||
    tabs.some(t=>Object.values(t.filters||{}).some(Boolean) || (t.sort&&t.sort.col));
  if (!used) return 0;
  capTableTabsEnsure(); capTableSyncToTab();
  const kept=capTableTvCustom(v.customCols);
  kept.forEach(c=>{ if(!capTableCustomCols.some(x=>x.key===c.key)) capTableCustomCols.push(c); });
  const keys=new Set(kept.map(c=>c.key));
  const ok=k=>!/^tvcustom_/.test(k) || keys.has(k);
  tabs.forEach(t=>{ const nt=capTableTvTab(t, ok); nt.name=(t.name||'Vue')+' (Table View)'; capTableTabs.push(nt); });
  capTableSyncFromTab();
  return tabs.length;
}

/** Applique un fichier 📂 Charger vue à l'onglet actif : vue du tableau (« capella-table-view »)
 * ou vue de l'ancienne Table View (« table-view-config »).
 * @param {object} data - Contenu du fichier
 * @returns {boolean} Vrai si le format est reconnu
 */
function capTableApplyViewFile(data){
  if (data.type==='capella-table-view') {
    capTableCustomCols=data.customCols||[];
    capTableVisibleCols=data.visibleCols||null; capTableColFilters=data.colFilters||{};
    capTableColWidths=data.colWidths||{}; capTableMultiValDisplay=data.multiValDisplay||'inline';
    capTableSort=data.sort||{col:null, dir:1};
    if (data.scope&&Array.isArray(data.scope.ids)) capTableScope={ids:[...data.scope.ids], direct:!!data.scope.direct};
    if (data.name && capTableTabs && capTableTabs[capTableTabIdx]) capTableTabs[capTableTabIdx].name=data.name;
    return true;
  }
  if (data.type==='table-view-config') {
    const kept=capTableTvCustom(data.customCols);
    kept.forEach(c=>{ if(!capTableCustomCols.some(x=>x.key===c.key)) capTableCustomCols.push(c); });
    const keys=new Set(kept.map(c=>c.key));
    const t=capTableTvTab({name:'Vue', colOrder:data.colOrder, hiddenCols:data.hiddenCols, filters:data.filters, colWidths:data.colWidths}, k=>!/^tvcustom_/.test(k)||keys.has(k));
    capTableVisibleCols=t.visibleCols; capTableColFilters=t.colFilters; capTableColWidths=t.colWidths; capTableSort={col:null, dir:1};
    capTableMultiValDisplay=data.multiValDisplay||capTableMultiValDisplay;
    return true;
  }
  return false;
}

/* ── 🎯 Portée de l'onglet ──────────────────────────────────────────────────────
 * Critères d'un onglet : types des lignes (barre latérale), portée, filtres par colonne.
 * La portée (facultative) limite les lignes aux éléments contenus dans des éléments choisis du modèle
 * (paquetages, composants, fonctions…), à tous les niveaux ou directement ; vide = tout le modèle.
 * Les éléments de portée eux-mêmes ne sont pas des lignes (seulement leur contenu). */
var _capScopeMemo=null;   // ensemble des ids en portée, recalculé quand la portée ou le modèle change
var _capScopeOpen={};     // nœuds dépliés dans l'arbre de la fenêtre 🎯 Portée
var _capScopeQ='';        // recherche dans la fenêtre 🎯 Portée

/** Ensemble des identifiants des éléments en portée (contenu des éléments choisis).
 * @returns {Set<string>|null} Identifiants, ou null si la portée est vide (tout le modèle)
 */
function capTableScopeSet(){
  const sc=capTableScope; if (!sc||!sc.ids||!sc.ids.length) return null;
  const key=sc.ids.join('|')+'#'+(sc.direct?1:0);
  if (_capScopeMemo && _capScopeMemo.key===key && _capScopeMemo.doc===cap_xmlDoc) return _capScopeMemo.set;
  const {childrenOf}=capGetParentIndex(), set=new Set();
  sc.ids.forEach(id=>{
    if (sc.direct) { (childrenOf[id]||[]).forEach(c=>set.add(c)); return; }
    const stack=[...(childrenOf[id]||[])];
    while (stack.length) { const c=stack.pop(); if (set.has(c)) continue; set.add(c); (childrenOf[c]||[]).forEach(x=>stack.push(x)); }
  });
  _capScopeMemo={key, doc:cap_xmlDoc, set};
  return set;
}

/** Libellé court de la portée pour le bouton de la barre du tableau.
 * @returns {string} « tout le modèle », nom de l'élément, ou nombre d'éléments
 */
function capTableScopeLabel(){
  const ids=(capTableScope&&capTableScope.ids)||[];
  if (!ids.length) return 'tout le modèle';
  if (ids.length===1) { const e=capGetElementById_(ids[0]); return e ? (e.attrs.name||e.typeName) : '1 élément'; }
  return ids.length+' éléments';
}

/** Bouton « 🎯 Portée » de la barre du tableau (info-bulle : éléments choisis et mode).
 * @returns {HTMLElement} Bouton
 */
function capTableScopeButton(){
  const ids=(capTableScope&&capTableScope.ids)||[];
  const b=document.createElement('div'); b.className='tbtn'+(ids.length?' active':'');
  b.textContent='🎯 Portée : '+capTableScopeLabel();
  b.title=ids.length
    ? 'Lignes limitées au contenu ('+(capTableScope.direct?'directement contenu':'à tous les niveaux')+') de :\n'
      + ids.map(id=>{ const e=capGetElementById_(id); return '• '+(e?(e.attrs.name||'(sans nom)')+' ['+((CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName)+']':id); }).join('\n')
    : 'Portée de l\'onglet : limiter les lignes aux éléments contenus dans des paquetages, composants… choisis (vide = tout le modèle)';
  b.onclick=()=>capTableScopeDialog();
  return b;
}

/** Ouvre la fenêtre 🎯 Portée de l'onglet : éléments choisis (✕ pour retirer), mode (à tous les niveaux /
 * directement contenus), arbre du modèle (▶ déplier, case = ajouter / retirer) et recherche par nom ou type.
 * Chaque changement s'applique immédiatement au tableau. */
function capTableScopeDialog(){
  let ov=document.getElementById('cap-scope-ov');
  if (!ov) { ov=document.createElement('div'); ov.id='cap-scope-ov'; document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const tab=capTableTabs&&capTableTabs[capTableTabIdx];
  ov.innerHTML=`<div class="cw-d-box" style="max-width:640px">
    <div class="cw-d-hdr"><b>🎯 Portée de l'onglet « ${capEsc(tab?tab.name:'')} »</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body">
      <div class="cw-d-sub">Les lignes du tableau sont les éléments des <b>types cochés</b> (menu de gauche) <b>contenus</b> dans les éléments choisis ici. Sans élément choisi : tout le modèle. Les filtres de colonnes s'appliquent ensuite.</div>
      <div class="cap-sc-sel"></div>
      <div class="cap-sc-mode">
        <label><input type="radio" name="cap-sc-m" value="rec"${capTableScope.direct?'':' checked'}> Contenu à tous les niveaux</label>
        <label><input type="radio" name="cap-sc-m" value="dir"${capTableScope.direct?' checked':''}> Directement contenu seulement</label>
      </div>
      <input class="inp cap-sc-q" placeholder="🔍 Chercher un élément (nom ou type)…" value="${capEsc(_capScopeQ)}">
      <div class="cap-sc-tree"></div>
    </div>
    <div class="cw-d-ftr"><button class="cap-lf-btn" data-c="clr">Vider la portée (tout le modèle)</button><span style="flex:1"></span><button class="phl-export-btn" data-c="x">Fermer</button></div></div>`;
  ov.style.display='flex';
  const apply=()=>{ _capScopeMemo=null; capPage=0; capTableSyncToTab(); capRenderTable(); drawSel(); };
  const drawSel=()=>{
    const box=ov.querySelector('.cap-sc-sel'), ids=capTableScope.ids;
    box.innerHTML=ids.length ? ids.map(id=>{ const e=capGetElementById_(id);
      return `<span class="cap-sc-chip" title="${capEsc(e?((CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName):id)}">${capEsc(e?(e.attrs.name||'(sans nom)'):id)}<b data-rm="${capEsc(id)}" title="Retirer">✕</b></span>`; }).join('')
      : '<span class="ana-dim">Aucun élément choisi : tout le modèle.</span>';
    box.querySelectorAll('[data-rm]').forEach(x=>x.onclick=()=>{ capTableScope.ids=capTableScope.ids.filter(i=>i!==x.dataset.rm); apply(); drawTree(); });
  };
  const toggle=(id,on)=>{ const s=new Set(capTableScope.ids); if(on) s.add(id); else s.delete(id); capTableScope.ids=[...s]; apply(); };
  const isOpen=(id,depth)=>_capScopeOpen[id]!==undefined ? _capScopeOpen[id] : depth===0;   // 1er niveau déplié au départ
  const row=(n,depth,hasKids)=>{
    const lv=CAP_LAYERS[n.layer]||{color:'var(--c-dim)'};
    return `<div class="cap-sc-row" style="padding-left:${6+depth*14}px">
      <span class="cap-sc-tog" data-tog="${capEsc(n.id)}" data-d="${depth}">${hasKids?(isOpen(n.id,depth)?'▼':'▶'):''}</span>
      <input type="checkbox" data-id="${capEsc(n.id)}"${capTableScope.ids.includes(n.id)?' checked':''}>
      <span class="cap-sc-t" style="color:${lv.color}">${capEsc((CAP_HUMAN_NAMES[n.typeName]||{}).h||n.typeName)}</span>
      <span class="cap-sc-n">${capEsc(n.name||'(sans nom)')}</span></div>`;
  };
  const drawTree=()=>{
    const host=ov.querySelector('.cap-sc-tree'); let h='';
    const q=_capScopeQ.trim().toLowerCase();
    if (q) {
      // Recherche : liste à plat des éléments qui ont un contenu (seuls utiles comme portée)
      const {childrenOf}=capGetParentIndex();
      const hits=capAllElements.filter(e=>(childrenOf[e.id]||[]).length && ((e.attrs.name||'')+' '+e.typeName+' '+((CAP_HUMAN_NAMES[e.typeName]||{}).h||'')).toLowerCase().includes(q));
      h=hits.slice(0,300).map(e=>row({id:e.id, name:e.attrs.name, typeName:e.typeName, layer:e.layer},0,false)).join('')
        +(hits.length>300?`<div class="ana-dim" style="padding:6px">… ${hits.length-300} autre(s) : précisez la recherche.</div>`:'')
        +(hits.length?'':'<div class="ana-dim" style="padding:6px">Aucun élément ne correspond.</div>');
    } else {
      // Arbre du modèle (nœuds ayant un contenu), déplié à la demande
      const walk=(n,d)=>{ const kids=(n.children||[]).filter(c=>c.children&&c.children.length);
        if (n.typeName!=='Project') h+=row(n,d,kids.length);
        if (n.typeName==='Project' || isOpen(n.id,d)) kids.forEach(c=>walk(c, n.typeName==='Project'?d:d+1)); };
      if (capTreeData) walk(capTreeData,0);
    }
    host.innerHTML=h;
    host.querySelectorAll('[data-tog]').forEach(t=>t.onclick=()=>{ const id=t.dataset.tog, d=+t.dataset.d; _capScopeOpen[id]=!isOpen(id,d); drawTree(); });
    host.querySelectorAll('input[data-id]').forEach(cb=>cb.onchange=()=>toggle(cb.dataset.id, cb.checked));
  };
  ov.querySelector('.cap-sc-q').oninput=e=>{ _capScopeQ=e.target.value; drawTree(); };
  ov.querySelectorAll('input[name="cap-sc-m"]').forEach(r=>r.onchange=()=>{ capTableScope.direct=r.value==='dir'; apply(); });
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  ov.querySelector('[data-c="clr"]').onclick=()=>{ capTableScope.ids=[]; apply(); drawTree(); };
  drawSel(); drawTree();
}
