/* ── 3. MODES & ÉTATS ───────────────────────────────────────────── */
/** Calcule les machines à états : régions, états / modes / pseudo-états (imbrication comprise),
 * transitions (déclencheurs, garde, effet), activités d'état et disponibilité des fonctions (availableInStates).
 * @returns {{sms:object[], avail:object, usesAvail:Set}} Machines, disponibilité état → fonctions, couches utilisant la disponibilité
 */
function capComputeStates(){
  if(_capAnaCache.states) return _capAnaCache.states;
  const {all,res,resList}=capAnaCtx();
  const isStateT=t=>/(State|Mode)$/.test(t)&&t!=='StateMachine';
  const nm=el=>el?(capXName(el)||capTName(el)):'?';
  /** Texte d'une contrainte (nom, sinon corps de sa spécification). */
  const constraintText=c=>{ if(!c) return ''; const b=c.querySelector('bodies'); return capXName(c)||(b?b.textContent.trim():''); };
  // Disponibilité : état → fonctions
  const avail={}, usesAvail=new Set();
  all.forEach(el=>{ const v=el.getAttribute('availableInStates'); if(!v) return;
    usesAvail.add(capArchLayerOf(el));
    resList(v).forEach(s=>{ (avail[capXId(s)]=avail[capXId(s)]||[]).push(capAnaEl(el)); }); });
  const sms=[];
  all.forEach(sm=>{
    if(capTName(sm)!=='StateMachine') return;
    const owner=sm.parentElement;
    const states=[], trans=[];
    /** Parcourt récursivement régions et sous-états. */
    const walk=(node,parentState,region)=>{
      for(const ch of node.children){
        const t=capTName(ch);
        if(t==='Region') walk(ch,parentState,ch);
        else if(isStateT(t)){
          const s={...capAnaEl(ch), name:capXName(ch)||capAnaHuman(t), parent:parentState?parentState.name:'', regionId:region?capXId(region):'',
            pseudo:/PseudoState$/.test(t), final:t==='FinalState',
            entry:resList(ch.getAttribute('entry')).map(nm), exit:resList(ch.getAttribute('exit')).map(nm), doAct:resList(ch.getAttribute('doActivity')).map(nm),
            fns:avail[capXId(ch)]||[]};
          states.push(s); walk(ch,s,region);
        } else if(t==='StateTransition'){
          trans.push({id:capXId(ch), src:(ch.getAttribute('source')||'').replace(/^.*#/,''), tgt:(ch.getAttribute('target')||'').replace(/^.*#/,''),
            triggers:resList(ch.getAttribute('triggers')).map(x=>capTName(x)==='ChangeEvent'?constraintText(res(x.getAttribute('expression')))||nm(x):nm(x)),
            trigDesc:(ch.getAttribute('triggerDescription')||'').trim(),
            guard:constraintText(res(ch.getAttribute('guard'))), effect:resList(ch.getAttribute('effect')).map(nm)});
        }
      }
    };
    walk(sm,null,null);
    sms.push({id:capXId(sm), name:capXName(sm)||'State Machine', owner:capAnaEl(owner), layer:capArchLayerOf(sm), states, trans});
  });
  return _capAnaCache.states={sms, avail, usesAvail};
}

/** Contrôles d'une machine à états : régions sans état initial, états inatteignables, états sans issue,
 * transitions sans déclencheur. Les règles ne s'appliquent qu'aux régions qui en ont le sens.
 * @param {object} sm - Machine à états
 * @returns {object} {noInit:[region], unreach:[s], deadEnd:[s], noTrig:[t]}
 */
function capStateChecks(sm){
  const byId={}; sm.states.forEach(s=>byId[s.id]=s);
  const regions={}; sm.states.forEach(s=>(regions[s.regionId]=regions[s.regionId]||[]).push(s));
  const inc={}, out={}; sm.trans.forEach(t=>{ (inc[t.tgt]=inc[t.tgt]||[]).push(t); (out[t.src]=out[t.src]||[]).push(t); });
  const noInit=[], unreach=[], deadEnd=[];
  Object.values(regions).forEach(list=>{
    const real=list.filter(s=>!s.pseudo&&!s.final);
    const hasInit=list.some(s=>s.type==='InitialPseudoState');
    if(real.length>1&&!hasInit) noInit.push(real[0]);
    if(hasInit) real.forEach(s=>{ if(!(inc[s.id]||[]).some(t=>t.src!==s.id)) unreach.push(s); });
    if(sm.trans.length) real.forEach(s=>{ if(!(out[s.id]||[]).some(t=>t.tgt!==s.id)&&real.length>1) deadEnd.push(s); });
  });
  const noTrig=sm.trans.filter(t=>!t.triggers.length&&!t.trigDesc&&!t.guard&&!(byId[t.src]&&byId[t.src].pseudo));
  return {noInit, unreach, deadEnd, noTrig};
}

/** Diagramme SVG d'une machine à états (disposition en couches, style proche de Capella) :
 * états arrondis, modes en jaune, pseudo-états (initial ●, final ◉, choix ◆), transitions étiquetées.
 * @param {object} sm - Machine à états
 * @returns {string} Balisage SVG
 */
function capStateDiagramSvg(sm){
  if(!sm.states.length) return '<div class="ana-dim" style="padding:10px">Machine vide.</div>';
  const nodes=sm.states.map(s=>({id:s.id})), ids=new Set(sm.states.map(s=>s.id));
  const edges=sm.trans.filter(t=>ids.has(t.src)&&ids.has(t.tgt)&&t.src!==t.tgt).map(t=>({srcId:t.src,tgtId:t.tgt,t}));
  const lay=capChainLayout({nodes,edges});
  const byId={}; sm.states.forEach(s=>byId[s.id]=s);
  const W=170,H=46,DW=10,GX=40,GY=70,PAD=24;
  const isD=id=>id[0]==='~', small=id=>byId[id]&&(byId[id].pseudo||byId[id].final);
  const wOf=id=>isD(id)?DW:small(id)?28:W, hOf=id=>isD(id)?H:small(id)?28:H;
  const widths=lay.layers.map(l=>l.reduce((s,id)=>s+wOf(id),0)+Math.max(0,l.length-1)*GX), maxW=Math.max(...widths);
  const cx={}, cy={};
  lay.layers.forEach((l,Li)=>{ let x=PAD+(maxW-widths[Li])/2; l.forEach(id=>{ cx[id]=x+wOf(id)/2; cy[id]=PAD+Li*(H+GY)+H/2; x+=wOf(id)+GX; }); });
  const back=lay.routes.filter(r=>r.back).length;
  const selfN=sm.trans.filter(t=>t.src===t.tgt&&ids.has(t.src)).length;
  const svgW=PAD*2+maxW+(back?30+back*14:0)+(selfN?40:0), svgH=PAD*2+lay.layers.length*(H+GY)-GY;
  const uid='sm'+(++_capChainSvgSeq), EC='#4a5568';
  const lab=t=>[t.triggers.join(', ')||t.trigDesc, t.guard?`[${t.guard}]`:'', t.effect.length?'/ '+t.effect.join(', '):''].filter(Boolean).join(' ');
  let es='', ls='';
  lay.routes.forEach((r,ri)=>{
    const t=r.edge.t;
    if(r.back){
      const k=lay.routes.filter((x,xi)=>x.back&&xi<ri).length, lane=PAD+maxW+18+k*14;
      const s=r.pts[0], g=r.pts[1];
      es+=`<path d="M${cx[s]+wOf(s)/2},${cy[s]} H${lane} V${cy[g]} H${cx[g]+wOf(g)/2+2}" fill="none" stroke="${EC}" stroke-width="1.3" stroke-dasharray="5,3" marker-end="url(#${uid})"/>`;
      if(lab(t)) ls+=`<text x="${lane+3}" y="${(cy[s]+cy[g])/2}" class="sml">${capEsc(lab(t))}</text>`;
      return;
    }
    const pts=r.pts.map((id,i)=>[cx[id], i===0?cy[id]+hOf(id)/2:(i===r.pts.length-1?cy[id]-hOf(id)/2:cy[id])]);
    es+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${EC}" stroke-width="1.3" marker-end="url(#${uid})"/>`;
    if(lab(t)){ const a=pts[0], b=pts[1]; ls+=`<text x="${(a[0]+b[0])/2+4}" y="${(a[1]+b[1])/2}" class="sml">${capEsc(lab(t))}</text>`; }
  });
  sm.trans.filter(t=>t.src===t.tgt&&cx[t.src]!=null).forEach(t=>{
    const x=cx[t.src]+W/2, y=cy[t.src];
    es+=`<path d="M${x},${y-8} C${x+30},${y-26} ${x+30},${y+26} ${x+2},${y+8}" fill="none" stroke="${EC}" stroke-width="1.3" marker-end="url(#${uid})"/>`;
    if(lab(t)) ls+=`<text x="${x+32}" y="${y+4}" class="sml">${capEsc(lab(t))}</text>`;
  });
  let ns='';
  sm.states.forEach(s=>{
    const x=cx[s.id], y=cy[s.id]; if(x==null) return;
    const tip=`${s.name} — ${capAnaHuman(s.type)}${s.parent?' · dans '+s.parent:''}${s.fns.length?' · '+s.fns.length+' fonction(s) disponible(s)':''}`;
    let shape;
    if(s.type==='InitialPseudoState') shape=`<circle cx="${x}" cy="${y}" r="9" fill="#222"/>`;
    else if(s.final||s.type==='TerminatePseudoState') shape=`<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="6" fill="#222"/>`;
    else if(s.type==='ChoicePseudoState') shape=`<path d="M${x},${y-13} L${x+13},${y} L${x},${y+13} L${x-13},${y} Z" fill="#fff" stroke="#222" stroke-width="1.4"/>`;
    else if(s.pseudo) shape=`<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#222" stroke-width="1.4"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="10" font-weight="700">${/History/.test(s.type)?'H':'•'}</text>`;
    else {
      const mode=s.type==='Mode', fill=mode?'#fff4d6':'#e8f0fb', stroke=mode?'#b08800':'#4a6fa5';
      const lines=capWrapLines(s.name,22,2);
      shape=`<rect x="${x-W/2}" y="${y-H/2}" width="${W}" height="${H}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`+
        lines.map((l,i)=>`<text x="${x}" y="${y+4-(lines.length-1)*7+i*14}" text-anchor="middle" font-size="12" fill="#111">${capEsc(l)}</text>`).join('')+
        (s.parent?`<text x="${x-W/2+8}" y="${y-H/2+10}" font-size="8" fill="${stroke}">${capEsc(s.parent.slice(0,24))} ›</text>`:'')+
        (s.fns.length?`<text x="${x+W/2-6}" y="${y+H/2-5}" text-anchor="end" font-size="8.5" font-weight="700" fill="${stroke}">ƒ ${s.fns.length}</text>`:'');
    }
    ns+=`<g class="ccn" data-ref="${capEsc(s.id)}" style="cursor:pointer"><title>${capEsc(tip)}</title>${shape}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block;margin:0 auto;font-family:Segoe UI,Arial,sans-serif">
    <defs><marker id="${uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9" fill="none" stroke="${EC}" stroke-width="1.5"/></marker>
    <style>.sml{font-size:10.5px;fill:#333;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}</style></defs>
    <rect width="100%" height="100%" fill="#fff"/>${es}${ns}${ls}</svg>`;
}

/** Rend la sous-vue Modes & états : diagrammes par machine, matrice de disponibilité des fonctions, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderStates(box){
  const st=box._sm=box._sm||{view:'diag', layer:'all'};
  const {sms, usesAvail}=capComputeStates(), L=capDetLink;
  const layers=CAP_ANA_LAYERS.filter(k=>sms.some(s=>s.layer===k));
  const shown=sms.filter(s=>st.layer==='all'||s.layer===st.layer);
  let body='';
  if(!sms.length) body='<div class="phl-empty">Aucune machine à états dans ce modèle.</div>';
  else if(st.view==='diag'){
    body=shown.map(sm=>{
      const ck=capStateChecks(sm), nIss=ck.noInit.length+ck.unreach.length+ck.deadEnd.length+ck.noTrig.length;
      const real=sm.states.filter(s=>!s.pseudo&&!s.final);
      const nameOf=id=>(sm.states.find(s=>s.id===id)||{}).name||'?';
      return `<div class="phl-comp-card" data-sm="${capEsc(sm.id)}"><div class="phl-comp-hdr sm-hdr">
        ${capChainLayerBadge(sm.layer)}<span class="phl-comp-title">${sm.owner?L(sm.owner.id,sm.owner.name):''} <span class="ana-dim">›</span> ${L(sm.id,sm.name)}</span>
        <span class="phl-comp-cnt">${real.filter(s=>s.type==='Mode').length} mode(s) · ${real.filter(s=>s.type!=='Mode').length} état(s) · ${sm.trans.length} transition(s)${nIss?` · <b style="color:var(--c-warn,#e3b341)">⚠ ${nIss}</b>`:''}</span>
        <span class="phl-comp-toggle">▶</span></div>
        <div class="phl-comp-body"><div class="cap-chain-diagram sm-svg"></div>
          <div class="cap-chain-tables">
            <details class="cap-chain-xdet" open><summary>États et modes (${real.length})</summary><table class="cap-chain-xtable cap-chain-ft"><tr><th>Nom</th><th>Type</th><th>Parent</th><th>Entry / Do / Exit</th><th>Fonctions disponibles</th></tr>
              ${real.map(s=>`<tr><td>${L(s.id,s.name)}</td><td>${capEsc(capAnaHuman(s.type))}</td><td>${capEsc(s.parent||'—')}</td><td>${[s.entry.length?'entry: '+s.entry.join(', '):'',s.doAct.length?'do: '+s.doAct.join(', '):'',s.exit.length?'exit: '+s.exit.join(', '):''].filter(Boolean).map(capEsc).join('<br>')||'—'}</td><td>${s.fns.map(f=>L(f.id,f.name)).join(', ')||'—'}</td></tr>`).join('')}</table></details>
            <details class="cap-chain-xdet" open><summary>Transitions (${sm.trans.length})</summary><table class="cap-chain-xtable cap-chain-ft"><tr><th>Source</th><th></th><th>Cible</th><th>Déclencheur</th><th>Garde</th><th>Effet</th></tr>
              ${sm.trans.map(t=>`<tr><td>${capEsc(nameOf(t.src))}</td><td>→</td><td>${capEsc(nameOf(t.tgt))}</td><td>${capEsc(t.triggers.join(', ')||t.trigDesc||'—')}</td><td>${capEsc(t.guard||'—')}</td><td>${capEsc(t.effect.join(', ')||'—')}</td></tr>`).join('')}</table></details>
          </div></div></div>`;
    }).join('');
  } else if(st.view==='matrix'){
    // Disponibilité des fonctions par état / mode (attribut availableInStates)
    const cols=shown.flatMap(sm=>sm.states.filter(s=>!s.pseudo&&!s.final&&s.fns.length).map(s=>({...s, sm})));
    const fnMap={}; cols.forEach(c=>c.fns.forEach(f=>fnMap[f.id]=f));
    const rows=Object.values(fnMap).sort((a,b)=>a.layer.localeCompare(b.layer)||a.name.localeCompare(b.name,'fr'));
    box._smMx={rows,cols};
    body=rows.length?`<p class="ana-help">Fonctions disponibles dans chaque état ou mode (attribut <code>availableInStates</code>).</p><div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">Fonction ↓ / État →</th>
      ${cols.map(c=>`<th class="cap-mx-col" title="${capEsc((c.sm.owner?c.sm.owner.name+' › ':'')+c.name)}"><div>${capEsc(c.name)}</div></th>`).join('')}</tr></thead><tbody>
      ${rows.map(f=>`<tr><th class="cap-mx-row" title="${capEsc(f.name)}">${capChainLayerBadge(f.layer)} ${capEsc(f.name)}</th>${cols.map(c=>c.fns.some(x=>x.id===f.id)?'<td class="ana-dot">●</td>':'<td></td>').join('')}</tr>`).join('')}
      </tbody></table></div>`:'<div class="phl-empty">Aucune fonction n\'utilise la disponibilité par état (availableInStates) dans ce modèle.</div>';
  } else {
    const rows=[]; const add=(arr,sm,fmt)=>arr.forEach(x=>rows.push(fmt(x,sm)));
    const all={noInit:[],unreach:[],deadEnd:[],noTrig:[]};
    shown.forEach(sm=>{ const ck=capStateChecks(sm); Object.keys(all).forEach(k=>ck[k].forEach(x=>all[k].push({x,sm}))); });
    const smCell=sm=>`${capChainLayerBadge(sm.layer)} ${capEsc(sm.owner?sm.owner.name:'')} › ${capEsc(sm.name)}`;
    const sRow=({x,sm})=>`<tr><td>${smCell(sm)}</td><td>${L(x.id,x.name)} <span class="ana-dim">${capEsc(capAnaHuman(x.type))}</span></td></tr>`;
    const nameIn=(sm,id)=>(sm.states.find(s=>s.id===id)||{}).name||'?';
    // Fonctions jamais disponibles : seulement dans les couches qui utilisent availableInStates
    const {avail}=capComputeStates(); const availIds=new Set(Object.values(avail).flat().map(f=>f.id));
    const d=capComputeTrace(false,true);
    const never=d.els.filter(e=>e.cat==='fn'&&usesAvail.has(e.layer)&&!availIds.has(e.id));
    body=capDiagHtml([
      {icon:'●', title:'Régions sans état initial', tip:'Région de plusieurs états sans InitialPseudoState', cols:['Machine','Premier état de la région'], items:all.noInit.map(sRow)},
      {icon:'⛔', title:'États ou modes inatteignables', tip:'Aucune transition entrante depuis un autre état', cols:['Machine','État'], items:all.unreach.map(sRow)},
      {icon:'⤓', title:'États ou modes sans transition sortante', tip:'Peut être voulu (état terminal) : à vérifier', cols:['Machine','État'], items:all.deadEnd.map(sRow)},
      {icon:'⚡', title:'Transitions sans déclencheur, description ni garde', cols:['Machine','Transition'],
        items:all.noTrig.map(({x,sm})=>`<tr><td>${smCell(sm)}</td><td>${capEsc(nameIn(sm,x.src))} → ${capEsc(nameIn(sm,x.tgt))}</td></tr>`)},
      {icon:'ƒ', title:'Fonctions feuilles disponibles dans aucun état', tip:'Couches qui utilisent availableInStates', cols:['Fonction','Couche'],
        items:never.map(e=>`<tr><td>${L(e.id,e.name)}</td><td>${e.layer}</td></tr>`)},
    ]);
  }
  box.innerHTML=`<div class="phl-filter-bar" style="flex-wrap:wrap;margin-bottom:8px">
      <button class="cap-lf-btn${st.view==='diag'?' active':''}" data-smv="diag">◈ Machines à états (${sms.length})</button>
      <button class="cap-lf-btn${st.view==='matrix'?' active':''}" data-smv="matrix">▦ Fonctions × états</button>
      <button class="cap-lf-btn${st.view==='checks'?' active':''}" data-smv="checks">🩺 Contrôles</button>
      <span class="tsep"></span><button class="cap-lf-btn${st.layer==='all'?' active':''}" data-sml="all">Toutes</button>
      ${layers.map(k=>`<button class="cap-lf-btn${st.layer===k?' active':''}" data-sml="${k}">${k}</button>`).join('')}
      <button class="phl-export-btn" id="ana-sm-csv" style="margin-left:auto">⬇ CSV</button>
    </div>${body}`;
  box.querySelectorAll('[data-smv]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.smv; capRenderStates(box); });
  box.querySelectorAll('[data-sml]').forEach(b=>b.onclick=()=>{ st.layer=b.dataset.sml; capRenderStates(box); });
  box.querySelectorAll('.sm-hdr').forEach(h=>h.onclick=()=>{
    const card=h.parentElement, bodyEl=h.nextElementSibling, svgBox=card.querySelector('.sm-svg');
    if(!svgBox.dataset.done){ const sm=sms.find(s=>s.id===card.dataset.sm); svgBox.innerHTML=capStateDiagramSvg(sm); svgBox.dataset.done='1';
      svgBox.querySelectorAll('.ccn').forEach(n=>n.addEventListener('click',()=>capOpenDetailById(n.dataset.ref))); }
    h.classList.toggle('open'); bodyEl.classList.toggle('open'); h.querySelector('.phl-comp-toggle').classList.toggle('open');
  });
  box.querySelector('#ana-sm-csv').onclick=()=>{
    if(st.view==='matrix'&&box._smMx){ const {rows,cols}=box._smMx;
      capCsvDownload('fonctions-x-etats.csv',['Couche','Fonction',...cols.map(c=>(c.sm.owner?c.sm.owner.name+' › ':'')+c.name)],rows.map(f=>[f.layer,f.name,...cols.map(c=>c.fns.some(x=>x.id===f.id)?'X':'')]));
    } else {
      const rows=[]; shown.forEach(sm=>{ const nameOf=id=>(sm.states.find(s=>s.id===id)||{}).name||'?';
        sm.trans.forEach(t=>rows.push([sm.layer,sm.owner?sm.owner.name:'',sm.name,nameOf(t.src),nameOf(t.tgt),t.triggers.join(', ')||t.trigDesc,t.guard,t.effect.join(', ')])); });
      capCsvDownload('transitions.csv',['Couche','Propriétaire','Machine','Source','Cible','Déclencheur','Garde','Effet'],rows);
    }
  };
}
/* ── 4. COMPARAISON DE VERSIONS ─────────────────────────────────── */
let capDiffDoc=null, capDiffName='', capDiffSwap=false; // version chargée pour comparaison, et sens (false : elle est l'ANCIENNE)

/** Indexe un document Capella pour la comparaison : pour chaque élément identifié, type, nom, parent,
 * attributs normalisés (listes de références triées) et signature du contenu non identifié (textes, corps…).
 * @param {Document} doc - Document XML
 * @returns {object} id → {id,type,name,parent,layer,attrs,content,el}
 */
function capDiffIndex(doc){
  const idx={};
  const SKIP=new Set(['id','xmi:id','xsi:type']);
  for(const el of doc.getElementsByTagName('*')){
    const id=capXId(el); if(!id) continue;
    const attrs={};
    for(const a of el.attributes){
      if(SKIP.has(a.name)||a.name.startsWith('xmlns')) continue;
      let v=a.value;
      if(/^#\S+(\s+#\S+)*$/.test(v.trim())) v=v.trim().split(/\s+/).sort().join(' '); // ordre des références sans importance
      attrs[a.name]=v;
    }
    let content='';
    for(const ch of el.children) if(!capXId(ch)) content+=`<${ch.tagName}>${ch.textContent.trim()}`;
    let p=el.parentElement; while(p&&!capXId(p)) p=p.parentElement;
    idx[id]={id, type:capTName(el)||el.tagName, name:capXName(el), parent:p?capXId(p):'', layer:capArchLayerOf(el), attrs, content, el};
  }
  return idx;
}

/** Compare deux index : éléments ajoutés, supprimés, modifiés (attributs, contenu, type) et déplacés (propriétaire).
 * Les références (#id) sont traduites en noms pour la lecture.
 * @param {object} A - Index de l'ancienne version
 * @param {object} B - Index de la nouvelle version
 * @returns {object[]} Différences {status:'add'|'del'|'mod', e, changes:[{k,a,b, ref?, added?, removed?}], moved}
 */
function capDiffCompute(A, B){
  const nameOf=(ix,v)=>String(v||'').split(/\s+/).map(tok=>{ if(!tok.startsWith('#')) return tok; const e=ix[tok.slice(1)]; return e?(e.name||e.type):tok; }).join(', ');
  const isRef=v=>/^#\S+/.test(String(v||'').trim());
  const out=[];
  Object.values(B).forEach(b=>{ if(!A[b.id]) out.push({status:'add', e:b, changes:[]}); });
  Object.values(A).forEach(a=>{
    const b=B[a.id];
    if(!b){ out.push({status:'del', e:a, changes:[]}); return; }
    const changes=[];
    if(a.type!==b.type) changes.push({k:'type', a:a.type, b:b.type});
    new Set([...Object.keys(a.attrs),...Object.keys(b.attrs)]).forEach(k=>{
      const va=a.attrs[k]??'', vb=b.attrs[k]??'';
      if(va===vb) return;
      const clean=v=>k==='description'?String(v).replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim():v;
      if(k==='description'&&clean(va)===clean(vb)) return;
      const ref=isRef(va)||isRef(vb), c={k, a:isRef(va)?nameOf(A,va):clean(va), b:isRef(vb)?nameOf(B,vb):clean(vb)};
      if(ref){   // références : noms ajoutés / retirés (rapport de comparaison)
        const ta=new Set(String(va).split(/\s+/).filter(Boolean)), tb=new Set(String(vb).split(/\s+/).filter(Boolean));
        c.ref=true; c.added=[...tb].filter(t=>!ta.has(t)).map(t=>nameOf(B,t)); c.removed=[...ta].filter(t=>!tb.has(t)).map(t=>nameOf(A,t));
      }
      changes.push(c);
    });
    if(a.content!==b.content) changes.push({k:'contenu', a:a.content.replace(/<[^>]+>/g,' ').trim(), b:b.content.replace(/<[^>]+>/g,' ').trim()});
    const moved=a.parent!==b.parent;
    if(moved) changes.push({k:'propriétaire', a:A[a.parent]?(A[a.parent].name||A[a.parent].type):a.parent, b:B[b.parent]?(B[b.parent].name||B[b.parent].type):b.parent});
    if(changes.length) out.push({status:'mod', e:b, changes, moved});
  });
  return out;
}

/** Rend la sous-vue Comparaison : chargement d'une autre version du modèle (ancienne / nouvelle, ⇄ pour inverser),
 * puis rapport par catégories et niveaux (capDrRender, 45-comparaison-rapport.js).
 * @param {HTMLElement} box - Conteneur
 */
function capRenderDiff(box){
  const cur=capCurrentFileName||'modèle chargé';
  const oldName=capDiffSwap?cur:capDiffName, newName=capDiffSwap?capDiffName:cur;
  const head=`<div class="ana-diff-head">
      <div class="ana-diff-file"><span class="ana-dim">Ancienne version (référence)</span><b>${capEsc(oldName||'—')}</b></div>
      <button class="cap-lf-btn" id="ana-df-swap" title="Inverser ancienne / nouvelle"${capDiffDoc?'':' disabled'}>⇄</button>
      <div class="ana-diff-file"><span class="ana-dim">Nouvelle version</span><b>${capEsc(newName||'—')}</b></div>
      <label class="cw-btn ana-diff-load">📂 ${capDiffDoc?'Changer la version à comparer…':'Charger une autre version (.capella)…'}<input type="file" id="ana-df-file"${capIsMobile()?'':' accept=".capella,.melodymodeller,.xml"'} style="display:none"></label>
    </div>`;
  if(!capDiffDoc){
    box.innerHTML=head+`<div class="phl-empty">Chargez une autre version du même modèle (par défaut considérée comme l'<b>ancienne</b> version ; ⇄ pour inverser).<br>Les éléments sont appariés par identifiant ; le rapport classe les changements en créations, suppressions, renommages, descriptions, propriétés, liens, déplacements et changements de type, du plus synthétique au plus complet, et se copie dans Word, Outlook, Teams ou Excel.</div>`;
    wire(); return;
  }
  if(!_capAnaCache.diff||_capAnaCache.diffSwap!==capDiffSwap){
    const cIdx=capDiffIndex(cap_xmlDoc), oIdx=capDiffIndex(capDiffDoc);
    const A=capDiffSwap?cIdx:oIdx, B=capDiffSwap?oIdx:cIdx;
    _capAnaCache.diff=capDiffCompute(A,B); _capAnaCache.diffIdx={A,B}; _capAnaCache.diffSwap=capDiffSwap;
  }
  box.innerHTML=head+'<div id="ana-dr"></div>';
  const host=box.querySelector('#ana-dr');
  if(box._drState) host._dr=box._drState;   // réglages conservés d'un rendu à l'autre
  capDrRender(host, _capAnaCache.diff, _capAnaCache.diffIdx.A, _capAnaCache.diffIdx.B, {oldName, newName});
  box._drState=host._dr;
  wire();
  /** Branche le chargement de la version à comparer et l'inversion. */
  function wire(){
    box.querySelector('#ana-df-file')?.addEventListener('change',e=>{
      const file=e.target.files[0]; if(!file) return;
      const r=new FileReader();
      r.onload=ev=>{ const doc=new DOMParser().parseFromString(ev.target.result,'application/xml');
        if(doc.querySelector('parsererror')){ alert('Fichier XML invalide'); return; }
        capDiffDoc=doc; capDiffName=file.name; delete _capAnaCache.diff; if(box._drState) box._drState.ex.clear(); capRenderDiff(box); };
      r.readAsText(file);
    });
    box.querySelector('#ana-df-swap')?.addEventListener('click',()=>{ capDiffSwap=!capDiffSwap; if(box._drState) box._drState.ex.clear(); capRenderDiff(box); });
  }
}
