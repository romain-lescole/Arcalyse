/* ═══════════════════════════════════════════════════════════════════════
   CAP TABLE — Vue Index des types : liste de tous les TYPES Capella
   (Metaclass) présents dans le fichier chargé (depuis capTypeRegistry),
   avec leur nom technique, leur nom humain et leur description (issus du
   CSV de référence des types CAP_HUMAN_NAMES). Sert de glossaire/référence
   rapide, distinct de la vue Tableau qui liste les éléments individuels.
   ═══════════════════════════════════════════════════════════════════════ */
let _capIndexSort = {col:'humanType', dir:1};
let _capIndexSearch = '';

/** Construit la vue « Index des types » : barre de recherche, en-têtes triables et
 * conteneur de tableau, puis délègue le rendu des lignes à capRenderIndexBody.
 */
function capRenderIndex(){
  const container=document.getElementById('cap-view-index'); if(!container) return;
  container.innerHTML='';

  const toolbar=document.createElement('div');
  toolbar.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--c-border);flex-shrink:0;';
  const searchInp=document.createElement('input'); searchInp.className='inp';
  searchInp.placeholder=_L('🔍 Rechercher par type, nom humain ou description…'); searchInp.value=_capIndexSearch;
  searchInp.style.cssText='flex:1;max-width:360px;font-size:12px;padding:5px 10px;';
  searchInp.oninput=()=>{ _capIndexSearch=searchInp.value; capRenderIndexBody(); };
  toolbar.appendChild(searchInp);
  const countSpan=document.createElement('span'); countSpan.id='cap-index-count';
  countSpan.style.cssText='font-size:11px;color:var(--c-dim);margin-left:auto;';
  toolbar.appendChild(countSpan);
  container.appendChild(toolbar);

  const scrollWrap=document.createElement('div'); scrollWrap.style.cssText='flex:1;overflow:auto;';
  const table=document.createElement('table'); table.id='cap-index-table';
  table.style.cssText='border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed;';
  const thead=document.createElement('thead'); thead.id='cap-index-thead';
  const tbody=document.createElement('tbody'); tbody.id='cap-index-tbody';
  table.appendChild(thead); table.appendChild(tbody);
  scrollWrap.appendChild(table);
  container.appendChild(scrollWrap);

  capRenderIndexBody();
}

/** Rend les lignes de l'Index des types : un type Capella distinct par ligne
 * (nom technique, Human Type, nombre d'occurrences, description), trié et filtré.
 */
function capRenderIndexBody(){
  const thead=document.getElementById('cap-index-thead'); const tbody=document.getElementById('cap-index-tbody');
  if (!thead||!tbody) return;

  const COLS=[
    {key:'type', label:'Type', width:220},
    {key:'humanType', label:'Human Type', width:220},
    {key:'count', label:'Nb', width:60},
    {key:'description', label:_L('Description'), width:0}, // 0 = prend le reste
  ];

  thead.innerHTML='';
  const hrow=document.createElement('tr');
  COLS.forEach(c=>{
    const th=document.createElement('th');
    th.style.cssText=`position:sticky;top:0;background:var(--c-bg3);color:var(--c-dim);font-size:10px;
      font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:7px 11px;
      border:1px solid var(--c-border);white-space:nowrap;cursor:pointer;z-index:2;
      box-sizing:border-box;${c.width?`width:${c.width}px;`:''}`;
    const sortIco = _capIndexSort.col===c.key ? (_capIndexSort.dir===1?' ▲':' ▼') : '';
    th.textContent = c.label+sortIco;
    th.onclick=()=>{
      _capIndexSort = _capIndexSort.col===c.key ? {col:c.key, dir:-_capIndexSort.dir} : {col:c.key, dir:1};
      capRenderIndexBody();
    };
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);

  // Construit les lignes : un type Capella distinct par ligne (depuis capTypeRegistry,
  // qui contient tous les types réellement présents dans le fichier chargé), avec
  // Human Type et Description issus de CAP_HUMAN_NAMES (référence CSV des types Capella).
  const q=_capIndexSearch.trim().toLowerCase();
  let rows = Object.entries(capTypeRegistry).map(([typeName, info])=>{
    const human=(CAP_HUMAN_NAMES[typeName]||{}).h||'';
    const desc=(CAP_HUMAN_NAMES[typeName]||{}).d||'';
    return {type:typeName, humanType:human, description:desc, count:info.count, layer:info.layer};
  });
  if (q) rows = rows.filter(r=>
    r.type.toLowerCase().includes(q) || r.humanType.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  );
  rows.sort((a,b)=>{
    if (_capIndexSort.col==='count') return (a.count-b.count)*_capIndexSort.dir;
    const av=(a[_capIndexSort.col]||'').toLowerCase(), bv=(b[_capIndexSort.col]||'').toLowerCase();
    return av<bv ? -_capIndexSort.dir : av>bv ? _capIndexSort.dir : 0;
  });

  const countSpan=document.getElementById('cap-index-count');
  if (countSpan) countSpan.textContent = _L(`${rows.length} type(s)`);

  tbody.innerHTML='';
  rows.forEach(r=>{
    const lv=CAP_LAYERS[r.layer]||{color:'#8b949e', bg:'rgba(139,148,158,.1)'};
    const tr=document.createElement('tr');
    tr.onmouseenter=()=>tr.style.background='var(--c-bg3)';
    tr.onmouseleave=()=>tr.style.background='';
    const tdType=document.createElement('td');
    tdType.innerHTML=`<span class="cap-type-badge" style="color:${lv.color};background:${lv.bg}">${capEsc(r.type)}</span>`;
    tdType.style.cssText='padding:6px 11px;border:1px solid var(--c-border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const tdHuman=document.createElement('td'); tdHuman.textContent=r.humanType||'—';
    tdHuman.style.cssText='padding:6px 11px;border:1px solid var(--c-border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;';
    const tdCount=document.createElement('td'); tdCount.textContent=r.count;
    tdCount.style.cssText='padding:6px 11px;border:1px solid var(--c-border);text-align:center;color:var(--c-dim);font-family:monospace;';
    const tdDesc=document.createElement('td'); tdDesc.textContent=r.description||'—'; tdDesc.title=r.description;
    tdDesc.style.cssText='padding:6px 11px;border:1px solid var(--c-border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--c-dim);font-size:11px;';
    tr.appendChild(tdType); tr.appendChild(tdHuman); tr.appendChild(tdCount); tr.appendChild(tdDesc);
    tbody.appendChild(tr);
  });
}