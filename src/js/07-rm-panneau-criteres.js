/* ═══════════════════════════════════════════════════════════════════════
   16. PANEL GAUCHE (critères de filtre)
   ═══════════════════════════════════════════════════════════════════════ */
/** Reconstruit entièrement le panneau gauche : critères de relation, types d'éléments.
 * Appelé après tout changement de RCFG, TCFG ou de mode.
 */
function buildPanel() {
  if (_capBulk) { _capBulkDirty=true; return; } // chargement en cours : un seul rendu à la fin
  // Contexte
  const sel=document.getElementById('ctx-sel'); sel.innerHTML='';
  MODEL.elements.forEach(el=>{
    const o=document.createElement('option'); o.value=el.id; o.textContent=el.name;
    if (el.id===S.ctx) o.selected=true; sel.appendChild(o);
  });
  sel.onchange=()=>setCtx(sel.value);

  // ── Relations ──────────────────────────────────────────────────────────
  const rb=document.getElementById('rel-body'); rb.innerHTML='';
  const mCfg=MODES[currentMode==='PBS'?'PBS':currentMode]==='capella'?null:MODES[currentMode==='PBS'?'PBS':currentMode];
  const _mCfg=MODES[currentMode];

  /** Crée une ligne de configuration d'un type de relation (couleur, style, visibilité) dans le panneau gauche.
   */
  function makeRelRow(t, cfg, readOnly) {
    const row=document.createElement('div'); row.className='row';
    if (_mCfg && !_mCfg.rel?.includes(t)) row.style.display='none';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=S.relF[t]!==false; cb.dataset.type=t;
    cb.onchange=()=>{ S.relF[t]=cb.checked; rebuildTree(); };
    const sw=document.createElement('div'); sw.className='clr-sw'; sw.style.background=cfg.color;
    sw.title='Changer la couleur';
    if (!readOnly) sw.onclick=()=>{ const ci=document.createElement('input'); ci.type='color'; ci.value=cfg.color; ci.oninput=()=>{ cfg.color=ci.value; sw.style.background=ci.value; setupMarkers(); render(); }; ci.click(); };
    const nm=document.createElement('span'); nm.className='rname';
    nm.textContent = cfg.label || t; // nom humain si défini (relations Capella), sinon clé technique
    if (cfg.label) nm.title = t; // tooltip = nom technique réel (ex: "PC NODE→PC NODE")
    row.appendChild(cb); row.appendChild(sw); row.appendChild(nm);
    if (cfg._capella) { const n=MODEL.relations.filter(r=>r.type===t).length; const c=document.createElement('span'); c.className='typ-cnt'; c.textContent=n; c.title=`${n} relation(s) de ce type`; row.appendChild(c); }
    if (!readOnly) {
      const icoStyle='cursor:pointer;color:var(--c-dim);font-size:10px;flex-shrink:0;padding:0 2px';
      const edit=document.createElement('span'); edit.textContent='✏'; edit.title='Modifier ce critère'; edit.style.cssText=icoStyle;
      edit.onclick=()=>showEditRelCriteriaForm(rb, row, t, cfg);
      const del=document.createElement('span'); del.textContent='✕'; del.title='Supprimer ce critère'; del.style.cssText=icoStyle;
      del.onclick=()=>{ if(!confirm(`Supprimer le critère "${t}" ?`)) return; delete RCFG[t]; delete S.relF[t]; MODEL.relations=MODEL.relations.filter(r=>r.type!==t); onModelChanged(); };
      row.appendChild(edit); row.appendChild(del);
    }
    return row;
  }

  // SysML group (collapsible)
  const SYSML_RELS_SET=new Set(['Composition','Aggregation','Association','DirectedAssociation','Containment','Generalization','Realization','Dependency','Usage','Abstraction','Refine','Trace','Satisfy','Verify','DeriveReqt','Copy','Allocation']);
  const sysmlHdr=document.createElement('div');
  sysmlHdr.innerHTML='<div style="display:flex;align-items:center;gap:6px;padding:5px 8px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-dim);cursor:pointer;user-select:none;border-radius:4px;margin:1px 2px;" class="rel-grp-hdr"><span style="font-size:9px;transition:transform .15s" class="grp-arr">▼</span><span>SysML</span><input type="checkbox" checked id="rel-grp-sysml-cb" style="margin-left:auto;cursor:pointer;accent-color:var(--c-accent);" onclick="event.stopPropagation();this.closest(\'.rel-grp-hdr\').parentElement.nextElementSibling.querySelectorAll(\'input[type=checkbox]\').forEach(cb=>{cb.checked=this.checked;const t=cb.dataset.type;if(t){S.relF[t]=this.checked;}});rebuildTree();" title="Tout cocher/décocher SysML"></div>';
  const sysmlBody=document.createElement('div'); sysmlBody.style.cssText='overflow:hidden;';
  let sysmlColl=false;
  sysmlHdr.querySelector('.rel-grp-hdr').onclick=()=>{ sysmlColl=!sysmlColl; sysmlBody.style.maxHeight=sysmlColl?'0':(sysmlBody.scrollHeight+200)+'px'; sysmlHdr.querySelector('.grp-arr').style.transform=sysmlColl?'rotate(-90deg)':''; };
  sysmlBody.style.maxHeight='2000px';
  Object.entries(RCFG).filter(([t])=>SYSML_RELS_SET.has(t)).forEach(([t,cfg])=>sysmlBody.appendChild(makeRelRow(t,cfg,false)));
  if (sysmlBody.children.length) { rb.appendChild(sysmlHdr); rb.appendChild(sysmlBody); }

  // Capella links group (collapsible)
  const capRelEntries=Object.entries(RCFG).filter(([t])=>!SYSML_RELS_SET.has(t)&&t.startsWith('cap_'));
  if (capRelEntries.length) {
    const capHdr=document.createElement('div');
    capHdr.innerHTML='<div style="display:flex;align-items:center;gap:6px;padding:5px 8px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3b82f6;cursor:pointer;user-select:none;border-radius:4px;margin:1px 2px;" class="rel-grp-hdr"><span style="font-size:9px;transition:transform .15s" class="grp-arr">▼</span><span>🔷 Capella</span><input type="checkbox" id="rel-grp-cap-cb" style="margin-left:auto;cursor:pointer;accent-color:var(--c-accent);" onclick="event.stopPropagation();this.closest(\'.rel-grp-hdr\').parentElement.nextElementSibling.querySelectorAll(\'input[type=checkbox]\').forEach(cb=>{cb.checked=this.checked;const t=cb.dataset.type;if(t){S.relF[t]=this.checked;}});rebuildTree();" title="Tout cocher/décocher Capella"></div>';
    const capBody=document.createElement('div'); capBody.style.cssText='overflow:hidden;';
    let capColl=false;
    capHdr.querySelector('.rel-grp-hdr').onclick=()=>{ capColl=!capColl; capBody.style.maxHeight=capColl?'0':(capBody.scrollHeight+200)+'px'; capHdr.querySelector('.grp-arr').style.transform=capColl?'rotate(-90deg)':''; };
    capBody.style.maxHeight='2000px';
    capRelEntries.forEach(([t,cfg])=>capBody.appendChild(makeRelRow(t,cfg,true)));
    rb.appendChild(capHdr); rb.appendChild(capBody);
  }

  // Custom (non-SysML, non-Capella) relations
  const relCount={}; MODEL.relations.forEach(r=>{ if(!r._capViz) relCount[r.type]=(relCount[r.type]||0)+1; });
  const customRelEntries=Object.entries(RCFG).filter(([t])=>!SYSML_RELS_SET.has(t)&&!t.startsWith('cap_'))
    .filter(([t,cfg])=>!cfg._capella||relCount[t]); // relations Capella absentes du modèle : non listées
  customRelEntries.forEach(([t,cfg])=>rb.appendChild(makeRelRow(t,cfg,false)));

  // Bouton créer nouveau critère de relation
  const addRel=document.createElement('div'); addRel.className='add-btn';
  addRel.textContent='+ Nouveau critère de relation';
  addRel.onclick=()=>showNewRelCriteriaForm(rb);
  rb.appendChild(addRel);

  // ── Types d'éléments ────────────────────────────────────────────────────
  {
  const tb=document.getElementById('typ-body'); tb.innerHTML='';
  const SYSML_TYPES_SET=new Set(['Block','Component','Class','Interface','Requirement','Package']);
  // Avec un modèle Capella chargé : uniquement les types réellement présents dans l'arborescence
  // (plus les types créés à la main), triés par couche ARCADIA puis par nom — et non tout TCFG,
  // qui accumule les types des modèles précédents.
  const capEls=MODEL.elements.filter(e=>e._capella&&!e._capViz);
  const typCount={}; MODEL.elements.filter(e=>!e._capViz).forEach(e=>typCount[e.type]=(typCount[e.type]||0)+1);
  const LORD=['OA','SA','LA','PA','EPBS'];
  const layerOfType=t=>{ const base=t.replace(/ \((NODE|BEHAVIOR)\)$/,''); const r=(typeof capTypeRegistry!=='undefined'&&capTypeRegistry)?capTypeRegistry[base]:null; const i=r?LORD.indexOf(r.layer):-1; return i<0?9:i; };
  const labelOf=t=>(TCFG[t]&&TCFG[t].label)||t;
  const allTypList=capEls.length
    ? [...new Set([...Object.keys(typCount), ...Object.keys(TCFG).filter(t=>!TCFG[t]._capella&&!t.startsWith('cap_')&&!SYSML_TYPES_SET.has(t))])]
        .sort((a,b)=>layerOfType(a)-layerOfType(b)||labelOf(a).localeCompare(labelOf(b),'fr'))
    : [...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])];

  // Champ de recherche en haut du panneau Types d'éléments — filtre les lignes en direct
  // (l'état du texte saisi est conservé via S.typSearch pour survivre aux reconstructions du panneau)
  if (!('typSearch' in S)) S.typSearch = '';
  const searchWrap=document.createElement('div'); searchWrap.style.cssText='padding:2px 4px 6px;';
  const searchInp=document.createElement('input'); searchInp.type='text';
  searchInp.placeholder='🔍 Filtrer les types…'; searchInp.value=S.typSearch;
  searchInp.style.cssText='width:100%;padding:4px 8px;background:var(--c-bg3);border:1px solid var(--c-border);'+
    'border-radius:6px;color:var(--c-text);font-size:11px;outline:none;box-sizing:border-box;';
  searchInp.oninput=()=>{
    S.typSearch=searchInp.value.trim().toLowerCase();
    tb.querySelectorAll('.row[data-search-key]').forEach(row=>{
      const key=row.dataset.searchKey;
      row.style.display = (!S.typSearch || key.includes(S.typSearch)) ? '' : 'none';
    });
    // Masque aussi les groupes devenus entièrement vides après filtrage
    tb.querySelectorAll('[data-grp-body]').forEach(body=>{
      const anyVisible=[...body.querySelectorAll('.row[data-search-key]')].some(r=>r.style.display!=='none');
      body.previousElementSibling.style.display = anyVisible ? '' : 'none';
      body.style.display = anyVisible ? '' : 'none';
    });
  };
  searchWrap.appendChild(searchInp);
  tb.appendChild(searchWrap);

  /** Crée une ligne de configuration d'un type d'élément (couleur, abréviation, visibilité) dans le panneau gauche.
   */
  function makeTypRow(t, cfg, readOnly) {
    if (!(t in S.typF)) S.typF[t]=true;
    const row=document.createElement('div'); row.className='row';
    if (_mCfg && _mCfg.typ && !_mCfg.typ.includes(t)) row.style.display='none';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=S.typF[t]; cb.dataset.type=t;
    cb.onchange=()=>{ S.typF[t]=cb.checked; rebuildTree(); };
    const sw=document.createElement('div'); sw.className='clr-sw'; sw.style.background=cfg.color;
    if (!readOnly) { sw.title='Changer la couleur'; sw.onclick=()=>{ const ci=document.createElement('input'); ci.type='color'; ci.value=cfg.color; ci.oninput=()=>{ cfg.color=ci.value; sw.style.background=ci.value; render(); }; ci.click(); }; }
    const nm=document.createElement('span'); nm.className='rname';
    // Affiche le nom humain ; pour les variantes Physical Component (NODE)/(BEHAVIOR),
    // ajoute explicitement la nature en complément (ex: "Physical Component · NODE").
    let displayLabel = cfg.label || t;
    const natureMatch = t.match(/^PhysicalComponent \((NODE|BEHAVIOR)\)$/);
    if (natureMatch) {
      const baseHuman = (CAP_HUMAN_NAMES['PhysicalComponent']||{}).h || 'Physical Component';
      displayLabel = `${baseHuman} · ${natureMatch[1]}`;
    }
    nm.textContent = displayLabel;
    if (capEls.length && typCount[t]) { const c=document.createElement('span'); c.className='typ-cnt'; c.textContent=typCount[t]; c.title=`${typCount[t]} élément(s) de ce type dans l'arborescence`; nm._cnt=c; }
    // Au survol : description du type (CSV) si disponible, sinon nom technique en repli
    const baseTypeForDesc = natureMatch ? 'PhysicalComponent' : t;
    const desc = (CAP_HUMAN_NAMES[baseTypeForDesc]||{}).d;
    nm.title = desc || t;
    // Clé de recherche utilisée par le filtre texte : nom affiché + nom technique, en minuscules
    row.dataset.searchKey = (displayLabel + ' ' + t).toLowerCase();
    if (S.typSearch && !row.dataset.searchKey.includes(S.typSearch)) row.style.display='none';
    row.appendChild(cb); row.appendChild(sw); row.appendChild(nm); if (nm._cnt) row.appendChild(nm._cnt);
    if (!readOnly) {
      const icoS='cursor:pointer;color:var(--c-dim);font-size:10px;flex-shrink:0;padding:0 2px';
      const edit=document.createElement('span'); edit.textContent='✏'; edit.title='Modifier ce type'; edit.style.cssText=icoS; edit.onclick=()=>showEditTypeForm(tb,row,t,cfg);
      const del=document.createElement('span'); del.textContent='✕'; del.title='Supprimer ce type'; del.style.cssText=icoS; del.onclick=()=>{ const used=MODEL.elements.filter(e=>e.type===t); if(used.length>0){alert(`Ce type est utilisé par ${used.length} élément(s).`);return;} if(!confirm(`Supprimer le type "${t}" ?`)) return; delete TCFG[t]; delete S.typF[t]; onModelChanged(); };
      row.appendChild(edit); row.appendChild(del);
    }
    return row;
  }

  // Helper: make collapsible group header
  /** Crée un groupe repliable de types d'éléments dans le panneau gauche (ex. SysML,
   * Capella), avec en-tête coloré, compteur et cases à cocher de visibilité.
   * @param {string} label - Titre du groupe
   * @param {string} color - Couleur de l'en-tête
   * @param {string[]} items - Types à lister
   * @param {boolean} readOnly - Empêche la modification des couleurs/abréviations
   */
  function makeTypGrp(label, color, items, readOnly) {
    if (!items.length) return; // groupe vide (ex. SysML en version Capella) : non affiché
    const hdr=document.createElement('div');
    const grpId='typ-grp-'+label.replace(/[^a-z]/gi,'');
    hdr.innerHTML=`<div style="display:flex;align-items:center;gap:6px;padding:5px 8px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${color};cursor:pointer;user-select:none;border-radius:4px;margin:1px 2px;"><span style="font-size:9px;transition:transform .15s" class="grp-arr">▼</span><span>${label}</span><input type="checkbox" checked id="${grpId}-cb" style="margin-left:auto;cursor:pointer;accent-color:var(--c-accent);" onclick="event.stopPropagation();" title="Tout cocher/décocher"></div>`;
    const body=document.createElement('div'); body.style.cssText='overflow:hidden;max-height:2000px;'; body.dataset.grpBody='1';
    let coll=false;
    hdr.querySelector('div').onclick=(e)=>{
      if(e.target.type==='checkbox'){
        const checked=e.target.checked;
        body.querySelectorAll('input[type=checkbox]').forEach(cb=>{cb.checked=checked;const t=cb.dataset&&cb.dataset.type;if(t){S.typF[t]=checked;}});
        rebuildTree();
        return;
      }
      coll=!coll; body.style.maxHeight=coll?'0':'2000px'; hdr.querySelector('.grp-arr').style.transform=coll?'rotate(-90deg)':'';
    };
    items.forEach(t=>{ if(!TCFG[t]) TCFG[t]={color:nextColor(),abbr:t.slice(0,3).toUpperCase()}; body.appendChild(makeTypRow(t,TCFG[t],readOnly)); });
    tb.appendChild(hdr); tb.appendChild(body);
  }

  // 'Package' est toujours exclu de la liste affichée (élément structurel technique,
  // pas un type métier pertinent à filtrer/visualiser pour l'utilisateur).
  const allTypListNoPkg = allTypList.filter(t=>t!=='Package');

  makeTypGrp('SysML','var(--c-dim)',allTypListNoPkg.filter(t=>SYSML_TYPES_SET.has(t)),false);

  // Groupe 🔷 Capella (types injectés depuis le fichier, avec la différenciation NODE / BEHAVIOR)
  const capTypList = allTypListNoPkg.filter(t=>(TCFG[t]&&TCFG[t]._capella) || t.startsWith('cap_'));
  if (capTypList.length) makeTypGrp('🔷 Capella','#3b82f6',capTypList,true);

  const groupedTypes = new Set([
    ...allTypListNoPkg.filter(t=>SYSML_TYPES_SET.has(t)),
    ...capTypList
  ]);
  allTypListNoPkg.filter(t=>!groupedTypes.has(t)).forEach(t=>{ if(!TCFG[t]) TCFG[t]={color:nextColor(),abbr:t.slice(0,3).toUpperCase()}; tb.appendChild(makeTypRow(t,TCFG[t],false)); });

  const addTyp=document.createElement('div'); addTyp.className='add-btn';
  addTyp.textContent="+ Nouveau type d'élément";
  addTyp.onclick=()=>showNewTypeForm(tb);
  tb.appendChild(addTyp);
  }

  // Portée (section cachée — basée sur les éléments Package)
  const sb=document.getElementById('scp-body'); sb.innerHTML='';
  MODEL.elements.filter(e=>e.type==='Package').forEach(pe=>{
    const p=pe.name;
    if (!(p in S.pkgF)) S.pkgF[p]=true;
    const row=document.createElement('div'); row.className='row';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=S.pkgF[p];
    cb.onchange=()=>{ S.pkgF[p]=cb.checked; rebuildTree(); };
    const nm=document.createElement('span'); nm.className='rname'; nm.textContent='📂 '+p;
    row.appendChild(cb); row.appendChild(nm); sb.appendChild(row);
  });

  buildArbo();
  // Register chain click handler (called from arbo when a chain element is clicked)
  window._capChainClickHandler=(elId)=>{
    const chain=capChainsForModal.find(c=>c.id===elId);
    if(!chain) return;
    capShowChainInMap(chain);
  };
}

/** Visualise une chaîne fonctionnelle dans la Relation Map en préservant ses ramifications
 * réelles (un même élément peut avoir plusieurs liens sortants et/ou entrants — cf. chain.graph
 * construit par capComputeChains). Crée des éléments et relations _capViz temporaires.
 * @param {object} chain - Objet chaîne issu de capComputeChains()
 */
function capShowChainInMap(chain){
  // Nettoyage d'anciennes visualisations temporaires (versions précédentes)
  MODEL.elements=MODEL.elements.filter(e=>!e._capViz);
  MODEL.relations=MODEL.relations.filter(r=>!r._capViz);
  if(!chain||!chain.graph||!chain.graph.nodes.length){ alert("Cette chaîne ne contient aucune étape à visualiser."); return; }
  S.chainView=chain; S.selNode=null;
  S.showRelNames=true; document.getElementById('b-rln')?.classList.add('active');
  applyMode('default');           // reconstruit le panneau et appelle render() → renderChainView
  rmChainBanner(chain);
  setTimeout(()=>fitView(true),120);
}

document.querySelectorAll('.sec-hdr').forEach(h=>h.addEventListener('click',()=>h.classList.toggle('coll')));