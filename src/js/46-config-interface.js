/* ══ ⚙ INTERFACE ET VUES : ENREGISTRER / CHARGER ═══════════════════════════════════
 * Réglages de l'interface, indépendants du modèle, enregistrables dans un fichier .json et rechargeables
 * (autre modèle, nouvelle version de la page) : barre des vues, tableaux de bord, ▤ Tableau (onglets de vues,
 * colonnes, colonnes par chemin, tri, filtres, largeurs), thème, règles de nommage.
 * La 💾 Page HTML les conserve aussi : le ▤ Tableau et le thème choisi sont écrits dans le bloc
 * JSON « cap-ui-views » au moment de l'enregistrement et réappliqués à l'ouverture de la page.
 * Les réglages de l'ancienne 📊 Table View (partie « tv ») sont convertis en onglets du tableau (capTableImportTv).
 */
var CAP_CFG_PARTS=[
  ['toolbar','☰ Barre des vues','menus affichés, vues épinglées'],
  ['dash',   '📐 Tableaux de bord','pages, indicateurs, disposition'],
  ['table',  '▤ Tableau','onglets de vues, colonnes affichées, colonnes par chemin, tri, filtres, largeurs'],
  ['csv',    '⬇ Exports CSV','colonnes retirées ou ajoutées (ID, owner, attributs…) pour chaque export'],
  ['theme',  '🎨 Thème','thème choisi et thème personnalisé'],
  ['names',  '🔤 Règles de nommage','verbes acceptés, mots refusés']
];

/** Sérialise en JSON en conservant les ensembles (Set). @param {*} o @returns {string} */
function capCfgSer(o){ return JSON.stringify(o,(k,v)=>v instanceof Set?{__set:[...v]}:v); }
/** Relit un JSON produit par capCfgSer (ensembles reconstitués). @param {string} t @returns {*} */
function capCfgRev(t){ return JSON.parse(t,(k,v)=>v&&typeof v==='object'&&Array.isArray(v.__set)?new Set(v.__set):v); }

/** État courant d'une partie de l'interface.
 * @param {string} k - Clé de partie (CAP_CFG_PARTS)
 * @returns {*} État (copie sérialisable)
 */
function capCfgGet(k){
  if(k==='toolbar') return _capNav;
  if(k==='dash') return capDashStore;
  if(k==='table') return capTableCfgGet();
  if(k==='csv') return _capCsvCfg;
  if(k==='theme') return {current:currentTheme, custom:capThemeStore};
  if(k==='names') return capNameRules;
  return null;
}

/** Applique une partie de configuration à l'interface (et la mémorise dans la page).
 * @param {string} k - Clé de partie
 * @param {*} v - État (tel que produit par capCfgGet, relu par capCfgRev)
 */
function capCfgSet(k, v){
  if(v==null) return;
  if(k==='toolbar'){ if(v.groups&&Array.isArray(v.pins)){ _capNav=capNavMigrate(v); capNavSave(); capNavRender(); } }
  else if(k==='dash'){ capDashStore=v; capDashSave(); const dv=document.getElementById('cap-view-dashboard'); if(dv&&dv.style.display!=='none'&&capLoaded) capRenderDashboard(dv); }
  else if(k==='table'){
    capTableCfgSet(v);
    if(capLoaded&&capCurrentView==='table') capRenderTable();
  }
  else if(k==='csv'){ if(typeof v==='object') _capCsvCfg=v; }
  else if(k==='tv'){   // ancienne 📊 Table View : onglets convertis en onglets du ▤ Tableau
    capTableImportTv(v);
    if(capLoaded&&capCurrentView==='table') capRenderTable();
  }
  else if(k==='theme'){
    if(v.custom!==undefined){ capThemeStore=v.custom; capThemeSave(); if(typeof capThemeRegister==='function') capThemeRegister(); }
    const sel=document.getElementById('theme-sel');
    if(v.current&&THEMES[v.current]&&sel){ sel.value=v.current; applyTheme(v.current); }
  }
  else if(k==='names'){ if(v.verbs) capSaveNameRules(v); }
}

/** Écrit dans la page (bloc JSON « cap-ui-views ») ce que les autres blocs ne conservent pas encore :
 * ▤ Tableau, thème choisi. Appelé avant chaque enregistrement de la 💾 Page HTML. */
function capCfgStoreViews(){
  let el=document.getElementById('cap-ui-views');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-ui-views'; document.head.appendChild(el); }
  el.textContent=capCfgSer({table:capCfgGet('table'), csv:_capCsvCfg, theme:currentTheme}).replace(/</g,'\\u003c');
}

/** Réapplique à l'ouverture de la page les vues mémorisées par capCfgStoreViews. */
function capCfgRestoreViews(){
  const el=document.getElementById('cap-ui-views'); if(!el) return;
  try{
    const o=capCfgRev(el.textContent);
    if(o.table) capCfgSet('table',o.table);
    if(o.csv) capCfgSet('csv',o.csv);
    if(o.tv) capCfgSet('tv',o.tv);   // page enregistrée par une version qui avait la 📊 Table View
    if(o.theme) capCfgSet('theme',{current:o.theme});
  }catch(e){ console.warn('Vues enregistrées illisibles :',e); }
}

/** Fenêtre de choix des parties à enregistrer ou à charger.
 * @param {'save'|'load'} mode - Enregistrer (vers un fichier) ou charger (depuis un fichier)
 * @param {object} [data] - Configuration lue (mode 'load')
 */
function capCfgDialog(mode, data){
  let ov=document.getElementById('cap-cfg-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-cfg-ov'; document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  // Un fichier d'une version antérieure peut contenir la partie « tv » (📊 Table View) : rattachée au ▤ Tableau
  const parts=mode==='load'?CAP_CFG_PARTS.filter(([k])=>data.parts&&(data.parts[k]!=null||(k==='table'&&data.parts.tv!=null))):CAP_CFG_PARTS;
  const nb=k=>k==='dash'?(()=>{ const d=mode==='load'?data.parts.dash:capDashStore; const n=d&&d.list?d.list.length:0; return ` <span class="ana-dim">(${n} page${n>1?'s':''})</span>`; })()
    :k==='table'?(()=>{ const t=(mode==='load'?data.parts.table:capCfgGet('table'))||{}, o=(t.tabs||[]).length||1, n=(t.customCols||[]).length;
      const tv=mode==='load'&&data.parts.tv?` + anciens onglets 📊 Table View`:'';
      return ` <span class="ana-dim">(${o} onglet${o>1?'s':''}${n?`, ${n} colonne${n>1?'s':''} par chemin`:''}${tv})</span>`; })():'';
  ov.innerHTML=`<div class="cw-d-box" style="max-width:560px">
    <div class="cw-d-hdr"><b>${mode==='save'?'⚙ Enregistrer l\'interface et les vues':'⚙ Charger une interface et des vues'}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body">
      <div class="cw-d-sub">${mode==='save'?'Fichier <b>.json</b> sans le modèle : à recharger avec un autre modèle ou une nouvelle version de la page.'
        :`Fichier enregistré le <b>${capEsc(data.date||'—')}</b>. Les parties cochées remplaceront les réglages actuels.`}</div>
      ${parts.length?parts.map(([k,l,t])=>`<label class="cfg-part"><input type="checkbox" data-k="${k}" checked> <span><b>${l}</b>${nb(k)}<br><span class="ana-dim">${t}</span></span></label>`).join('')
        :'<div class="phl-empty">Ce fichier ne contient aucun réglage reconnu.</div>'}
    </div>
    <div class="cw-d-ftr"><span style="flex:1"></span><button class="cap-lf-btn" data-c="x">Annuler</button>
      ${parts.length?`<button class="phl-export-btn" data-c="ok">${mode==='save'?'💾 Enregistrer':'📂 Appliquer'}</button>`:''}</div></div>`;
  ov.style.display='flex';
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  ov.querySelector('[data-c="ok"]')?.addEventListener('click',()=>{
    const keys=[...ov.querySelectorAll('[data-k]:checked')].map(c=>c.dataset.k);
    ov.style.display='none';
    if(!keys.length) return;
    if(mode==='save'){
      const out={type:'capella-interface', version:1, date:new Date().toLocaleString('fr-FR'), parts:{}};
      keys.forEach(k=>out.parts[k]=capCfgGet(k));
      capDownloadBlob(new Blob([capCfgSer(out)],{type:'application/json'}),'interface-et-vues.json');
    } else {
      keys.forEach(k=>{ try{ if(data.parts[k]!=null) capCfgSet(k,data.parts[k]); if(k==='table'&&data.parts.tv) capCfgSet('tv',data.parts.tv); }catch(e){ console.error(e); alert('Réglage « '+k+' » non appliqué : '+e.message); } });
      if(typeof capWatchFlash==='function') capWatchFlash(`✔ ${keys.length} réglage(s) appliqué(s)`);
    }
  });
}

/** Ouvre un fichier .json d'interface et propose les parties à appliquer. */
function capCfgLoadFile(){
  const inp=document.createElement('input'); inp.type='file'; if(!capIsMobile()) inp.accept='.json';
  inp.onchange=()=>{
    const f=inp.files[0]; if(!f) return;
    f.text().then(t=>{
      let o; try{ o=capCfgRev(t); }catch(e){ alert('Fichier illisible : JSON invalide.'); return; }
      if(!o||o.type!=='capella-interface'||!o.parts){ alert('Ce fichier n\'est pas un fichier « interface et vues » d\'Arcalyse.'); return; }
      capCfgDialog('load',o);
    });
  };
  inp.click();
}

/** Charge une mise à jour du modèle depuis un autre fichier : comparaison, delta, puis mise à jour après validation (🔄 Suivi). */
function capCfgLoadUpdate(){
  if(!capLoaded){ alert('Ouvrez d\'abord un modèle Capella : la mise à jour se compare au modèle affiché.'); return; }
  capWatchPickNewVersion();
}

capCfgRestoreViews();   // vues mémorisées dans une 💾 Page HTML enregistrée
