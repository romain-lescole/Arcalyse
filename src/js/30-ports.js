/* ═══════════════════════════════════════════════════════════════════
   VUE 🧩 PORTS — traçabilité Function Port ↔ Component Port ↔ Physical Port
   (PortAllocation : ComponentPort ↔ FunctionPort ; ComponentPortAllocation : PhysicalPort ↔ ComponentPort)
═══════════════════════════════════════════════════════════════════ */
var _capPortsCache=null; // (var : lu avant sa déclaration au rechargement) résultat de capComputePortLinks (remis à zéro au chargement d'un modèle)

/** Badge d'orientation / de direction d'un port (IN, OUT, INOUT, UNSET), version globale.
 * @param {string} o - Orientation normalisée
 * @returns {string} HTML du badge
 */
function capOrientBadge(o){
  const os=CAP_ORIENT_STYLE[o]||CAP_ORIENT_STYLE.UNSET;
  return `<span title="${os.t}" style="font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;border:1px solid ${os.c};color:${os.c};margin-left:4px;white-space:nowrap;${o==='UNSET'?'opacity:.6;':''}">${o==='INOUT'?_L('⇄ INOUT'):o}</span>`;
}

/** Collecte tous les ports du modèle et leurs liens d'allocation et d'échange :
 * FunctionPorts (entrée/sortie de fonction, reliés par les Functional Exchanges),
 * ComponentPorts (reliés par les Component Exchanges), PhysicalPorts (reliés par les Physical Links),
 * plus les allocations FE→CE et CE→PL pour les contrôles de cohérence.
 * @returns {{fps:object, cps:object, pps:object, fes:object[], ces:object[], pls:object[]}} Index par id
 */
function capComputePortLinks(){
  if(_capPortsCache) return _capPortsCache;
  const empty={fps:{},cps:{},pps:{},fes:[],ces:[],pls:[]};
  if(!cap_xmlDoc) return empty;
  const allNodes=[...cap_xmlDoc.getElementsByTagName('*')];
  const xmap=capBuildIdMap(allNodes);
  const rid=r=>(r||'').trim().replace(/^.*#/,'');
  const N=n=>n||'—';
  const FP_DIR={FunctionInputPort:'IN', FunctionOutputPort:'OUT'};
  const fps={}, cps={}, pps={};
  for(const el of allNodes){
    const t=capTName(el), id=capXId(el); if(!id) continue;
    const par=el.parentElement;
    if(FP_DIR[t]) fps[id]={id, name:N(capXName(el)), dir:FP_DIR[t], ownId:par?capXId(par):'', ownName:par?N(capXName(par)):'—', layer:capArchLayerOf(el), cps:[], fes:[]};
    else if(t==='ComponentPort') cps[id]={id, name:N(capXName(el)), orient:capNormOrient(el.getAttribute('orientation')), ownId:par?capXId(par):'', ownName:par?N(capXName(par)):'—', ownType:par?capTName(par):'', layer:capArchLayerOf(el), fps:[], pps:[], ces:[]};
    else if(t==='PhysicalPort') pps[id]={id, name:N(capXName(el)), ownId:par?capXId(par):'', ownName:par?N(capXName(par)):'—', ownType:par?capTName(par):'', layer:capArchLayerOf(el), cps:[], pls:[]};
  }
  const fes=[], ces=[], pls=[], feToCE={}, ceToPL={}, fnComp={};
  for(const el of allNodes){
    const t=capTName(el), id=capXId(el);
    if(t==='FunctionalExchange'){
      const a=rid(el.getAttribute('source')), b=rid(el.getAttribute('target'));
      const x={id, name:N(capXName(el)), src:a, tgt:b}; fes.push(x);
      if(fps[a]) fps[a].fes.push({id, name:x.name, role:'out', other:fps[b]?fps[b].ownName:'?'});
      if(fps[b]) fps[b].fes.push({id, name:x.name, role:'in', other:fps[a]?fps[a].ownName:'?'});
    } else if(t==='ComponentExchange'){
      const a=rid(el.getAttribute('source')), b=rid(el.getAttribute('target'));
      const x={id, name:N(capXName(el)), src:a, tgt:b, kind:el.getAttribute('kind')||'UNSET'}; ces.push(x);
      if(cps[a]) cps[a].ces.push({id, name:x.name, other:cps[b]?cps[b].ownName:'?'});
      if(cps[b]) cps[b].ces.push({id, name:x.name, other:cps[a]?cps[a].ownName:'?'});
    } else if(t==='PhysicalLink'){
      const ends=(el.getAttribute('linkEnds')||'').trim().split(/\s+/).filter(Boolean).map(rid);
      const x={id, name:N(capXName(el)), ends}; pls.push(x);
      ends.forEach((e,i)=>{ if(pps[e]) pps[e].pls.push({id, name:x.name, other:pps[ends[1-i]]?pps[ends[1-i]].ownName:'?'}); });
    } else if(/Allocation$/.test(t)){
      const a=xmap[rid(el.getAttribute('sourceElement'))]||el.parentElement;
      const b=xmap[rid(el.getAttribute('targetElement'))];
      if(!a||!b) continue;
      const ia=capXId(a), ib=capXId(b);
      if(t==='ComponentExchangeFunctionalExchangeAllocation'){ (feToCE[ib]=feToCE[ib]||[]).push(ia); continue; }
      if(t==='ComponentExchangeAllocation'){ (ceToPL[ib]=ceToPL[ib]||[]).push(ia); continue; }
      if(t==='ComponentFunctionalAllocation'){ fnComp[ib]=ia; continue; }
      // Allocations de ports : classement par types, quel que soit le sens source/cible
      const cp=cps[ia]?ia:(cps[ib]?ib:null), other=cp===ia?ib:ia;
      if(cp&&fps[other]){ if(!cps[cp].fps.includes(other)) cps[cp].fps.push(other); if(!fps[other].cps.includes(cp)) fps[other].cps.push(cp); }
      else if(cp&&pps[other]){ if(!cps[cp].pps.includes(other)) cps[cp].pps.push(other); if(!pps[other].cps.includes(cp)) pps[other].cps.push(cp); }
    }
  }
  // Fonction → composant d'allocation, et composants qui possèdent des ComponentPorts
  const compWithCP=new Set(Object.values(cps).map(c=>c.ownId));
  Object.values(fps).forEach(fp=>{ fp.allocComp=fnComp[fp.ownId]||''; fp.compHasCP=!!fp.allocComp&&compWithCP.has(fp.allocComp); });
  _capPortsCache={fps, cps, pps, fes, ces, pls, feToCE, ceToPL};
  return _capPortsCache;
}

/** Construit les lignes de la table de traçabilité : une ligne par couple ComponentPort ↔ FunctionPort,
 * plus les ComponentPorts sans FunctionPort et les FunctionPorts non alloués.
 * @param {object} d - Résultat de capComputePortLinks
 * @returns {object[]} Lignes {layer, fp, cp, ppList, incomplete}
 */
function capPortsTraceRows(d){
  const rows=[];
  Object.values(d.cps).forEach(cp=>{
    const ppl=cp.pps.map(i=>d.pps[i]).filter(Boolean);
    const needPP=cp.layer==='PA';
    if(!cp.fps.length) rows.push({layer:cp.layer, fp:null, cp, ppl, incomplete:true});
    cp.fps.forEach(fid=>rows.push({layer:cp.layer, fp:d.fps[fid], cp, ppl, incomplete:needPP&&!ppl.length}));
  });
  Object.values(d.fps).filter(fp=>!fp.cps.length).forEach(fp=>rows.push({layer:fp.layer, fp, cp:null, ppl:[], incomplete:true}));
  const key=r=>(r.cp?r.cp.ownName+' '+r.cp.name:'~'+(r.fp?r.fp.ownName:''))+' '+(r.fp?r.fp.name:'');
  return rows.sort((a,b)=>CAP_CHAIN_LAYER_ORDER.indexOf(a.layer)-CAP_CHAIN_LAYER_ORDER.indexOf(b.layer)||key(a).localeCompare(key(b),'fr'));
}

/** Contrôles de cohérence entre les trois niveaux de ports et les allocations d'échanges.
 * @param {object} d - Résultat de capComputePortLinks
 * @returns {object[]} Sections pour capDiagHtml
 */
function capPortsDiagSections(d){
  const L=capDetLink;
  const fpCell=fp=>fp?`${L(fp.ownId,fp.ownName,'font-weight:600')} <span style="color:var(--c-dim)">⬦</span> ${L(fp.id,fp.name)}${capOrientBadge(fp.dir)}`:'—';
  const cpCell=cp=>cp?`${L(cp.ownId,cp.ownName,'font-weight:600')} <span style="color:var(--c-dim)">⬦</span> ${L(cp.id,cp.name)}${capOrientBadge(cp.orient)}`:'—';
  const ppCell=pp=>pp?`${L(pp.ownId,pp.ownName,'font-weight:600')} <span style="color:var(--c-dim)">⬦</span> ${L(pp.id,pp.name)}`:'—';
  const fps=Object.values(d.fps), cps=Object.values(d.cps), pps=Object.values(d.pps);
  // Sens incohérents : port de sortie de fonction sur un port composant IN (et inversement)
  const dirBad=[];
  cps.forEach(cp=>cp.fps.forEach(fid=>{ const fp=d.fps[fid]; if(!fp) return;
    if((fp.dir==='OUT'&&cp.orient==='IN')||(fp.dir==='IN'&&cp.orient==='OUT')) dirBad.push(`<tr><td>${fpCell(fp)}</td><td>${cpCell(cp)}</td></tr>`); }));
  // FE alloué à un CE : chaque port de fonction du FE doit être alloué à l'un des ports du CE
  const feCe=[];
  const ceById={}; d.ces.forEach(c=>ceById[c.id]=c);
  // Délégations : un port de CE équivaut à tous les ports qui lui sont reliés par des CE DELEGATION (fermeture)
  const deleg={}; d.ces.filter(c=>c.kind==='DELEGATION').forEach(c=>{ (deleg[c.src]=deleg[c.src]||[]).push(c.tgt); (deleg[c.tgt]=deleg[c.tgt]||[]).push(c.src); });
  const closure=p=>{ const seen=new Set([p]), stack=[p]; while(stack.length){ const x=stack.pop(); (deleg[x]||[]).forEach(y=>{ if(!seen.has(y)){ seen.add(y); stack.push(y); } }); } return [...seen]; };
  d.fes.forEach(fe=>(d.feToCE[fe.id]||[]).forEach(ceId=>{
    const ce=ceById[ceId]; if(!ce) return;
    const cePorts=[...closure(ce.src),...closure(ce.tgt)];
    const miss=[['source',fe.src],['cible',fe.tgt]].filter(([,fid])=>d.fps[fid]&&!d.fps[fid].cps.some(c=>cePorts.includes(c))).map(([k])=>k);
    if(miss.length) feCe.push(_L(`<tr><td>${L(fe.id,fe.name,'font-weight:600')}</td><td>${L(ce.id,ce.name)}</td><td>Port ${miss.join(_L(' et '))} du FE non alloué aux ports du CE</td></tr>`));
  }));
  // CE alloué à un PL : chaque port du CE doit être alloué à l'un des ports physiques du PL
  const cePl=[];
  const plById={}; d.pls.forEach(p=>plById[p.id]=p);
  d.ces.forEach(ce=>(d.ceToPL[ce.id]||[]).forEach(plId=>{
    const pl=plById[plId]; if(!pl) return;
    const miss=[['source',ce.src],['cible',ce.tgt]].filter(([,cid])=>d.cps[cid]&&!closure(cid).some(c=>d.cps[c]&&d.cps[c].pps.some(p=>pl.ends.includes(p)))).map(([k])=>k);
    if(miss.length) cePl.push(_L(`<tr><td>${L(ce.id,ce.name,'font-weight:600')}</td><td>${L(pl.id,pl.name)}</td><td>Port ${miss.join(_L(' et '))} du CE non alloué aux ports physiques du lien</td></tr>`));
  }));
  return [
    {icon:'ƒ', title:_L('Function Ports non alloués alors que la fonction est allouée à un composant qui a des ports'),
      tip:_L(`Aucune PortAllocation · ${fps.filter(fp=>!fp.cps.length&&!fp.compHasCP).length} autres ports non alloués ignorés (fonction non allouée ou composant sans ports)`), cols:[_L('Fonction ⬦ Port'),_L('Couche')],
      items:fps.filter(fp=>!fp.cps.length&&fp.compHasCP).map(fp=>`<tr><td>${fpCell(fp)}</td><td>${fp.layer}</td></tr>`)},
    {icon:'⬦', title:_L('Component Ports sans Function Port alloué'), tip:_L('Port de composant sans comportement associé'), cols:[_L('Composant ⬦ Port'),_L('Couche')],
      items:cps.filter(cp=>!cp.fps.length).map(cp=>`<tr><td>${cpCell(cp)}</td><td>${cp.layer}</td></tr>`)},
    {icon:'🔌', title:_L('Component Ports (PA) non alloués à un Physical Port'), tip:_L('Aucune ComponentPortAllocation'), cols:[_L('Composant ⬦ Port')],
      items:cps.filter(cp=>cp.layer==='PA'&&!cp.pps.length).map(cp=>`<tr><td>${cpCell(cp)}</td></tr>`)},
    {icon:'◌', title:_L('Physical Ports sans Component Port alloué'), tip:_L('Port physique sans port logique porté'), cols:[_L('Composant ⬦ Port physique')],
      items:pps.filter(pp=>!pp.cps.length).map(pp=>`<tr><td>${ppCell(pp)}</td></tr>`)},
    {icon:'⇆', title:_L('Sens incohérent Function Port / Component Port'), tip:_L('Sortie de fonction sur port IN, ou entrée sur port OUT'), cols:[_L('Function Port'),_L('Component Port')], items:dirBad},
    {icon:'∦', title:_L('Functional Exchange ↔ Component Exchange : ports non alignés'), tip:_L('Les ports du FE doivent être alloués aux ports du CE qui le porte'), cols:[_L('Functional Exchange'),_L('Component Exchange'),_L('Écart')], items:feCe},
    {icon:'∦', title:_L('Component Exchange ↔ Physical Link : ports non alignés'), tip:_L('Les ports du CE doivent être alloués aux ports physiques du lien qui le porte'), cols:[_L('Component Exchange'),_L('Physical Link'),_L('Écart')], items:cePl},
  ];
}

/** Rend la vue 🧩 Ports : table de traçabilité FP ↔ CP ↔ PP, cartes par composant et contrôles de cohérence. */
function capRenderPorts(){
  const container=document.getElementById('cap-view-ports'); if(!container) return;
  const d=capComputePortLinks();
  if(!container._prt) container._prt={view:'trace', q:'', layer:'all', incomplete:false};
  const st=container._prt;
  const L=capDetLink;
  const allRows=capPortsTraceRows(d);
  const layers=CAP_CHAIN_LAYER_ORDER.filter(k=>allRows.some(r=>r.layer===k));
  const MAX=600;

  /** Lignes de traçabilité retenues par les filtres (couche, texte, incomplètes). */
  function filteredRows(){
    const q=st.q.trim().toLowerCase();
    return allRows.filter(r=>{
      if(st.layer!=='all'&&r.layer!==st.layer) return false;
      if(st.incomplete&&!r.incomplete) return false;
      if(!q) return true;
      const txt=[r.fp&&r.fp.ownName,r.fp&&r.fp.name,r.cp&&r.cp.ownName,r.cp&&r.cp.name,...r.ppl.map(p=>p.ownName+' '+p.name),
        ...(r.fp?r.fp.fes.map(f=>f.name):[]),...(r.cp?r.cp.ces.map(c=>c.name):[])].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }
  /** Liste compacte d'échanges (FE, CE ou PL) avec le nom de l'élément distant. */
  const xList=(arr,arrow)=>arr.length?arr.map(x=>`<div class="prt-x">${x.role==='in'?'←':x.role==='out'?'→':arrow} ${L(x.id,x.name)} <span style="color:var(--c-dim)">(${capEsc(x.other)})</span></div>`).join(''):'<span style="color:var(--c-dim)">—</span>';

  /** Table de traçabilité (limitée à MAX lignes à l'écran ; l'export CSV contient tout). */
  function buildTrace(rows){
    if(!rows.length) return _L('<div class="phl-empty">Aucun port ne correspond au filtre.</div>');
    const body=rows.slice(0,MAX).map(r=>`<tr class="${r.incomplete?'prt-inc':''}">
      <td>${capChainLayerBadge(r.layer)}</td>
      <td>${r.fp?L(r.fp.ownId,r.fp.ownName,'font-weight:600'):'<span class="prt-miss">∅</span>'}</td>
      <td>${r.fp?L(r.fp.id,r.fp.name)+capOrientBadge(r.fp.dir):''}</td>
      <td>${r.fp?xList(r.fp.fes,''):''}</td>
      <td>${r.cp?L(r.cp.ownId,r.cp.ownName,'font-weight:600'):_L('<span class="prt-miss">∅ non alloué</span>')}</td>
      <td>${r.cp?L(r.cp.id,r.cp.name)+capOrientBadge(r.cp.orient):''}</td>
      <td>${r.cp?xList(r.cp.ces,'↔'):''}</td>
      <td>${r.ppl.length?r.ppl.map(p=>`<div>${L(p.ownId,p.ownName,'font-weight:600')} ⬦ ${L(p.id,p.name)}</div>`).join(''):(r.cp&&r.cp.layer==='PA'?'<span class="prt-miss">∅</span>':'<span style="color:var(--c-dim)">—</span>')}</td>
      <td>${r.ppl.length?xList(r.ppl.flatMap(p=>p.pls),'↔'):''}</td>
    </tr>`).join('');
    return _L(`<div class="prt-wrap"><table class="prt-t"><thead><tr>
      <th>Couche</th><th>Fonction</th><th>Function Port</th><th>Functional Exchanges</th>
      <th>Composant</th><th>Component Port</th><th>Component Exchanges</th><th>Physical Port</th><th>Physical Links</th>
    </tr></thead><tbody>${body}</tbody></table></div>
    ${rows.length>MAX?_L(`<div class="cap-mx-hint">Affichage limité aux ${MAX} premières lignes sur ${rows.length} — affinez le filtre ou exportez en CSV.</div>`):''}`);
  }

  /** Cartes par composant : ports physiques (et ComponentPorts portés), ComponentPorts (et FunctionPorts alloués). */
  function buildComp(){
    const q=st.q.trim().toLowerCase();
    const comps={};
    const get=(id,name,type,layer)=>comps[id]=comps[id]||{id,name,type,layer,cps:[],pps:[]};
    Object.values(d.cps).forEach(cp=>get(cp.ownId,cp.ownName,cp.ownType,cp.layer).cps.push(cp));
    Object.values(d.pps).forEach(pp=>get(pp.ownId,pp.ownName,pp.ownType,pp.layer).pps.push(pp));
    const list=Object.values(comps).filter(c=>(st.layer==='all'||c.layer===st.layer)&&(!q||c.name.toLowerCase().includes(q)))
      .sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    if(!list.length) return _L('<div class="phl-empty">Aucun composant ne correspond au filtre.</div>');
    return list.map(c=>{
      const ppRows=c.pps.map(pp=>`<div class="phl-link-row"><span style="min-width:18px">🔌</span>${L(pp.id,pp.name,'font-weight:600;min-width:140px')}
        <span style="color:var(--c-dim);margin:0 8px">porte</span>
        <span>${pp.cps.map(i=>d.cps[i]).filter(Boolean).map(cp=>`${capEsc(cp.ownName)} ⬦ ${L(cp.id,cp.name)}${capOrientBadge(cp.orient)}`).join(' · ')||_L('<span class="prt-miss">∅ aucun Component Port</span>')}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--c-dim)">${pp.pls.map(p=>capEsc(p.name)).join(', ')||_L('∅ lien')}</span></div>`).join('');
      const cpRows=c.cps.map(cp=>{
        const f=cp.fps.map(i=>d.fps[i]).filter(Boolean);
        return `<div class="phl-link-row"><span style="min-width:18px">⬦</span>${L(cp.id,cp.name,'font-weight:600;min-width:140px')}${capOrientBadge(cp.orient)}
        <span style="color:var(--c-dim);margin:0 8px">←</span>
        <span>${f.map(fp=>`${capEsc(fp.ownName)} ⬦ ${L(fp.id,fp.name)}${capOrientBadge(fp.dir)}`).join(' · ')||_L('<span class="prt-miss">∅ aucun Function Port</span>')}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--c-dim)">${cp.pps.length?'🔌 '+cp.pps.map(i=>d.pps[i]?capEsc(d.pps[i].name):'?').join(', '):''}${cp.ces.length?' · ↔ '+cp.ces.length+' CE':''}</span></div>`;
      }).join('');
      const issues=c.cps.filter(cp=>!cp.fps.length||(cp.layer==='PA'&&!cp.pps.length)).length+c.pps.filter(pp=>!pp.cps.length).length;
      return _L(`<div class="phl-comp-card">
        <div class="phl-comp-hdr" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');this.querySelector('.phl-comp-toggle').classList.toggle('open')">
          ${capChainLayerBadge(c.layer)}
          <span class="phl-comp-title">${L(c.id,c.name)}</span>
          <span class="phl-comp-cnt">${c.pps.length?c.pps.length+_L(' port(s) physique(s) · '):''}${c.cps.length} component port(s)${issues?` · <b style="color:var(--c-warn,#e3b341)">⚠ ${issues}</b>`:''}</span>
          <span class="phl-comp-toggle">▶</span>
        </div>
        <div class="phl-comp-body">${ppRows?_L(`<div class="prt-sec">Ports physiques → Component Ports alloués</div>${ppRows}`):''}${cpRows?_L(`<div class="prt-sec">Component Ports ← Function Ports alloués</div>${cpRows}`):''}</div>
      </div>`);
    }).join('');
  }

  /** Contenu principal selon la vue active. */
  function content(){
    if(st.view==='diag') return capDiagHtml(capPortsDiagSections(d));
    if(st.view==='comp') return buildComp();
    return buildTrace(filteredRows());
  }
  /** Met à jour le contenu et le compteur sans reconstruire la barre (garde le focus du champ). */
  function update(){
    const main=container.querySelector('#prt-main'); if(main) main.innerHTML=content();
    const ctr=container.querySelector('#prt-counter');
    if(ctr) ctr.textContent=st.view==='trace'?_L(`${filteredRows().length}/${allRows.length} lignes`):'';
  }
  const nFp=Object.keys(d.fps).length, nCp=Object.keys(d.cps).length, nPp=Object.keys(d.pps).length;
  container.innerHTML=_L(`
    <div class="phl-toggle-bar">
      <button class="phl-toggle-btn${st.view==='trace'?' active':''}" data-pv="trace" title="Une ligne par Function Port ↔ Component Port ↔ Physical Port">≡ Traçabilité</button>
      <button class="phl-toggle-btn${st.view==='comp'?' active':''}" data-pv="comp" title="Ports regroupés par composant">▣ Par composant</button>
      <button class="phl-toggle-btn${st.view==='diag'?' active':''}" data-pv="diag" title="Ports non alloués, sens incohérents, ports d'échanges non alignés">🩺 Contrôles</button>
      <span style="font-size:11px;color:var(--c-dim);margin-left:10px">ƒ ${nFp} function ports · ⬦ ${nCp} component ports · 🔌 ${nPp} physical ports</span>
      <span id="prt-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace;margin-left:auto"></span>
    </div>
    ${st.view!=='diag'?_L(`<div class="phl-filter-bar" style="margin-bottom:8px;flex-wrap:wrap">
      <button class="cap-lf-btn${st.layer==='all'?' active':''}" data-ly="all">Toutes couches</button>
      ${layers.map(k=>`<button class="cap-lf-btn${st.layer===k?' active':''}" data-ly="${k}">${k==='?'?_L('Non classé'):k}</button>`).join('')}
      <input id="prt-q" type="text" class="phl-filter-input" placeholder="🔍 Fonction, composant, port, échange…" value="${capEsc(st.q)}" style="width:240px;margin-left:8px">
      ${st.view==='trace'?_L(`<label class="cap-chx-opt"><input type="checkbox" id="prt-inc"${st.incomplete?' checked':''}> Seulement les chaînes incomplètes</label>`):''}
      <div style="margin-left:auto"><button class="phl-export-btn" id="prt-csv">⬇ CSV</button></div>
    </div>`):_L(`<div class="phl-filter-bar" style="margin-bottom:8px"><div style="margin-left:auto"><button class="phl-export-btn" id="prt-csv">⬇ CSV</button></div></div>`)}
    <div id="prt-main"></div>`);
  update();
  container.querySelectorAll('[data-pv]').forEach(b=>b.addEventListener('click',()=>{ st.view=b.dataset.pv; capRenderPorts(); }));
  container.querySelectorAll('[data-ly]').forEach(b=>b.addEventListener('click',()=>{ st.layer=b.dataset.ly; capRenderPorts(); }));
  let deb; container.querySelector('#prt-q')?.addEventListener('input',e=>{ st.q=e.target.value; clearTimeout(deb); deb=setTimeout(update,150); });
  container.querySelector('#prt-inc')?.addEventListener('change',e=>{ st.incomplete=e.target.checked; update(); });
  container.querySelector('#prt-csv')?.addEventListener('click',()=>{
    if(st.view==='diag'){
      const rows=[]; capPortsDiagSections(d).forEach(sec=>sec.items.forEach(h=>{
        const tmp=document.createElement('tr'); tmp.innerHTML=h.replace(/^<tr>|<\/tr>$/g,'');
        rows.push([sec.title,...[...tmp.children].map(td=>td.textContent.replace(/\s+/g,' ').trim())]); }));
      capCsvDownload(_L('controles-ports.csv'),[_L('Contrôle'),_L('Élément'),_L('Détail'),_L('Complément')],rows); return;
    }
    // Export enrichi (53) : chaque colonne d'élément porte ses identifiants
    const fx=a=>capCx(a.map(x=>`${x.name} (${x.other})`).join(', '), a.map(x=>x.id));
    capCsvExport(_L('tracabilite-ports.csv'),
      [_L('Couche'),_L('Fonction'),_L('Function Port'),_L('Direction'),_L('Functional Exchanges'),_L('Composant'),_L('Component Port'),_L('Orientation'),_L('Component Exchanges'),_L('Physical Ports'),_L('Physical Links'),_L('Incomplet')],
      filteredRows().map(r=>[r.layer, r.fp?capCx(r.fp.ownName,r.fp.ownId):'', r.fp?capCx(r.fp.name,r.fp.id):'', r.fp?r.fp.dir:'', r.fp?fx(r.fp.fes):'',
        r.cp?capCx(r.cp.ownName,r.cp.ownId):'', r.cp?capCx(r.cp.name,r.cp.id):'', r.cp?r.cp.orient:'', r.cp?fx(r.cp.ces):'',
        capCx(r.ppl.map(p=>p.ownName+' ⬦ '+p.name).join(', '), r.ppl.map(p=>p.id)), fx(r.ppl.flatMap(p=>p.pls)), r.incomplete?_L('oui'):'']));
  });
}