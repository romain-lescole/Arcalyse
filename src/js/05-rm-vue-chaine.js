/* ═══════════════════════════════════════════════════════════════════════
   8b. VUE « CHAÎNE » DE LA RELATION MAP — graphe orienté complet
   (plusieurs entrées, plusieurs sorties, ramifications, boucles), disposé en couches
   comme les diagrammes de la vue ⚡ Chaînes, dans le style des nœuds de la Relation Map.
   ═══════════════════════════════════════════════════════════════════════ */
/** Affiche ou masque le bandeau « chaîne affichée » au-dessus du graphe.
 * @param {object|null} chain - Chaîne affichée, ou null
 */
function rmChainBanner(chain){
  let b=document.getElementById('rm-chain-banner');
  if(!b){ b=document.createElement('div'); b.id='rm-chain-banner'; document.getElementById('graph').appendChild(b); }
  if(!chain){ b.style.display='none'; return; }
  const lay=capChainLayout(chain.graph);
  b.innerHTML=`<span class="rmcb-t">⚡ ${capEsc(CAP_CHAIN_LABELS[chain.type]||chain.type)}</span> <b>${capEsc(chain.name)}</b>
    <span class="rmcb-m">${chain.graph.nodes.length} ${chain.type==='PhysicalPath'?'composants':'fonctions'} · ${chain.graph.edges.length} échanges · ${lay.entries.length} entrée(s) · ${lay.exits.length} sortie(s)</span>
    <span class="rmcb-leg"><i style="background:#58a6ff"></i>acteur <i style="background:#4dd880"></i>système <i style="background:#8b949e"></i>non alloué</span>
    <button id="rm-chain-close" title="Revenir à la Relation Map">✕ Quitter la chaîne</button>`;
  b.style.display='flex';
  b.querySelector('#rm-chain-close').onclick=()=>{ S.chainView=null; rmChainBanner(null); rebuildTree(); setTimeout(()=>fitView(true),80); };
}

/** Rendu de la vue chaîne : disposition en couches (capChainLayout) orientée selon la disposition choisie
 * (→ LR, ↓ TB, ← RL ; radiale et zigzag retombent sur LR), arêtes routées par les nœuds fictifs,
 * étiquetées par l'échange, nœuds colorés par type avec un liseré acteur / système / non alloué.
 * @param {object} C - Couleurs du thème
 */
function renderChainView(C){
  const chain=S.chainView, g=chain.graph;
  const lay=capChainLayout(g);
  const byId={}; g.nodes.forEach(n=>byId[n.id]=n);
  const dir=S.layout==='TB'||!['LR','RL','radial','zigzag'].includes(S.layout)?'TB':(S.layout==='RL'?'RL':'LR');
  const W_N=cw(), H_N=ch(), isD=id=>id[0]==='~';
  const flowGap=dir==='TB'?H_N+74:W_N+96, crossGap=dir==='TB'?W_N+34:H_N+34;
  const pos={};
  lay.layers.forEach((layer,L)=>{
    const n=layer.length;
    layer.forEach((id,i)=>{
      const c=(i-(n-1)/2)*crossGap, f=L*flowGap;
      pos[id]=dir==='TB'?{x:c,y:f}:{x:dir==='RL'?-f:f,y:c};
    });
  });
  const ent=new Set(lay.entries), ext=new Set(lay.exits);
  const light=capIsLight(), EC=light?'#1a6e2e':'#4ade80';
  const KIND={actor:'#58a6ff', system:'#4dd880', none:'#8b949e'};
  // Bords de sortie / d'entrée d'un nœud selon l'orientation
  const outPt=id=>{ const p=pos[id]; if(isD(id)) return [p.x,p.y]; return dir==='TB'?[p.x,p.y+H_N/2]:[p.x+(dir==='RL'?-W_N/2:W_N/2),p.y]; };
  const inPt=id=>{ const p=pos[id]; if(isD(id)) return [p.x,p.y]; return dir==='TB'?[p.x,p.y-H_N/2]:[p.x+(dir==='RL'?W_N/2:-W_N/2),p.y]; };
  const line=d3.line().curve(dir==='TB'?d3.curveMonotoneY:d3.curveMonotoneX);
  gL.selectAll('*').remove(); gN.selectAll('*').remove();
  // Arêtes
  const bounds={x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity};
  Object.entries(pos).forEach(([id,p])=>{ if(isD(id)) return; bounds.x0=Math.min(bounds.x0,p.x-W_N/2); bounds.x1=Math.max(bounds.x1,p.x+W_N/2); bounds.y0=Math.min(bounds.y0,p.y-H_N/2); bounds.y1=Math.max(bounds.y1,p.y+H_N/2); });
  let backK=0;
  lay.routes.forEach(r=>{
    const e=r.edge, grp=gL.append('g').attr('class','lkg cv-e').attr('data-s',e.srcId).attr('data-t',e.tgtId);
    let d, lx, ly;
    if(r.back){
      // Boucle : contournement à l'extérieur du graphe (côté droit en TB, dessous en LR/RL)
      const k=backK++, s=pos[e.srcId], t=pos[e.tgtId];
      if(dir==='TB'){ const lane=bounds.x1+30+k*16; d=`M${s.x+W_N/2},${s.y} H${lane} V${t.y} H${t.x+W_N/2+3}`; lx=lane+4; ly=(s.y+t.y)/2; }
      else { const lane=bounds.y1+30+k*16; d=`M${s.x},${s.y+H_N/2} V${lane} H${t.x} V${t.y+H_N/2+3}`; lx=(s.x+t.x)/2; ly=lane+12; }
      grp.append('path').attr('d',d).attr('fill','none').attr('stroke',EC).attr('stroke-width',1.6).attr('stroke-dasharray','6,4').attr('marker-end','url(#cv-arr)');
    } else {
      const pts=r.pts.map((id,i)=>i===0?outPt(id):i===r.pts.length-1?inPt(id):[pos[id].x,pos[id].y]);
      // Petit segment droit à chaque extrémité pour une arrivée franche sur le bord du nœud
      const a=pts[0], b=pts[pts.length-1];
      const lead=dir==='TB'?[[a[0],a[1]+14]]:[[a[0]+(dir==='RL'?-14:14),a[1]]];
      const tail=dir==='TB'?[[b[0],b[1]-14]]:[[b[0]+(dir==='RL'?14:-14),b[1]]];
      const all=[a,...lead,...pts.slice(1,-1),...tail,b];
      d=line(all);
      grp.append('path').attr('d',d).attr('fill','none').attr('stroke',EC).attr('stroke-width',1.7).attr('stroke-linecap','round').attr('marker-end','url(#cv-arr)');
      const m=all[Math.floor(all.length/2)-(all.length%2?0:1)], m2=all[Math.floor(all.length/2)];
      lx=(m[0]+m2[0])/2; ly=(m[1]+m2[1])/2;
    }
    grp.append('title').text(`${byId[e.srcId]?.name||''} → ${e.name||''} → ${byId[e.tgtId]?.name||''}`);
    if(S.showRelNames&&e.name)
      grp.append('text').attr('x',lx+(dir==='TB'?6:0)).attr('y',ly-(dir==='TB'?0:6)).attr('text-anchor',dir==='TB'?'start':'middle')
        .attr('class','rm-elabel').attr('fill',capTextOn(EC)).text(S.cutNames&&e.name.length>S.cutLen+10?e.name.slice(0,S.cutLen+10)+'…':e.name);
  });
  // Nœuds
  g.nodes.forEach(n=>{
    const p=pos[n.id]; if(!p) return;
    const el={id:n.refId, name:n.name, type:n.elemType, pkg:n.owner?'alloué à '+n.owner:''};
    const tcfg=TCFG[n.elemType]||TCFG[n.elemType+' (BEHAVIOR)']||TCFG[n.elemType+' (NODE)']||{color:'#7f849c',abbr:(n.elemType||'???').slice(0,3).toUpperCase()};
    const grp=gN.append('g').attr('class','ng cv-n').attr('data-id',n.id).attr('transform',`translate(${p.x-W_N/2},${p.y-H_N/2})`);
    const io=ent.has(n.id)||ext.has(n.id), kc=KIND[n.kind]||KIND.none, sel=S.selNode===n.id;
    let label=n.name; if(S.cutNames&&label.length>S.cutLen) label=label.slice(0,S.cutLen)+'…';
    const {lines}=computeNodeDims(label);
    if(S.compact){
      grp.append('rect').attr('class','rm-card').attr('width',W_N).attr('height',H_N).attr('rx',H_N/2).attr('fill',tcfg.color).attr('stroke',sel?C.accent:kc).attr('stroke-width',io?3:1.5);
      lines.forEach((ln,i)=>grp.append('text').attr('x',W_N/2).attr('y',H_N*(i+1)/(lines.length+1)+1).attr('text-anchor','middle').attr('dominant-baseline','central')
        .attr('fill','rgba(0,0,0,.78)').attr('font-size',lines.length>1?10:11).attr('font-weight',600).attr('pointer-events','none').text(ln));
    } else {
      grp.append('rect').attr('class','rm-card').attr('width',NW).attr('height',NH).attr('rx',6).attr('fill',C.nodeBg).attr('stroke',sel?C.accent:io?kc:C.border).attr('stroke-width',sel||io?2.2:1);
      grp.append('path').attr('d',`M0,${NHH} V6 Q0,0 6,0 H${NW-6} Q${NW},0 ${NW},6 V${NHH} Z`).attr('fill',tcfg.color).attr('opacity',.9);
      grp.append('rect').attr('x',0).attr('y',NHH).attr('width',4).attr('height',NH-NHH-6).attr('fill',kc);
      const hdr=(tcfg.label||tcfg.abbr||'');
      grp.append('text').attr('x',7).attr('y',NHH-5).attr('fill',capInk(tcfg.color)).attr('font-size',10).attr('font-weight',700).attr('pointer-events','none')
        .text(hdr.length>24?hdr.slice(0,23)+'…':hdr);
      if(io) grp.append('text').attr('x',NW-5).attr('y',NHH-5).attr('text-anchor','end').attr('fill',capInk(tcfg.color)).attr('font-size',8).attr('font-weight',800).attr('pointer-events','none')
        .text(ent.has(n.id)&&ext.has(n.id)?'E/S':ent.has(n.id)?'ENTRÉE':'SORTIE');
      const bodyH=NH-NHH, fs=lines.length===1?12:lines.length===2?11:10;
      lines.forEach((ln,i)=>grp.append('text').attr('x',NW/2+2).attr('y',NHH+bodyH*(i+1)/(lines.length+1)+2).attr('text-anchor','middle').attr('dominant-baseline','central')
        .attr('fill',C.nodeTxt).attr('font-size',fs).attr('pointer-events','none').text(ln));
    }
    grp.append('rect').attr('width',W_N).attr('height',H_N).attr('fill','transparent').style('cursor','pointer')
      .on('mouseenter',ev=>{ showTip(ev,el); rmHighlight(n.id,true); })
      .on('mousemove',ev=>moveTip(ev))
      .on('mouseleave',()=>{ hideTip(); rmHighlight(null,true); })
      .on('click',ev=>{ ev.stopPropagation(); S.selNode=n.id; if(n.refId&&MODEL.elements.some(x=>x.id===n.refId)){ S.propEl=n.refId; buildPropertiesPanel(); } render(); })
      .on('dblclick',ev=>{ ev.stopPropagation(); if(n.refId&&MODEL.elements.some(x=>x.id===n.refId)){ S.chainView=null; rmChainBanner(null); setCtx(n.refId); } });
  });
  // Marqueur de flèche propre à la vue chaîne
  const defs=d3.select('#defs'); defs.select('#cv-arr').remove();
  defs.append('marker').attr('id','cv-arr').attr('viewBox','0 -5 10 10').attr('refX',9).attr('refY',0).attr('markerWidth',8).attr('markerHeight',8).attr('orient','auto')
    .append('path').attr('d','M0,-4L9,0L0,4').attr('fill','none').attr('stroke',EC).attr('stroke-width',1.8);
  S._chainBounds={x0:bounds.x0-(dir!=='TB'?0:0), x1:bounds.x1+(backK&&dir==='TB'?40+backK*16:0), y0:bounds.y0, y1:bounds.y1+(backK&&dir!=='TB'?40+backK*16:0)};
  document.getElementById('info-txt').textContent=`Chaîne : ${chain.name}  |  ${g.nodes.length} nœuds  |  ${g.edges.length} échanges  |  ${lay.entries.length} entrée(s) · ${lay.exits.length} sortie(s)`;
  updateLegend();
}

/** Met en évidence un nœud et ses voisins directs (les autres sont estompés) ; null pour tout rétablir.
 * @param {string|null} key - uid (vue normale) ou id de nœud (vue chaîne)
 * @param {boolean} chainMode - true en vue chaîne
 */
function rmHighlight(key, chainMode){
  if(key==null){ gN.selectAll('.ng').classed('rm-dim',false); gL.selectAll('.lkg').classed('rm-dim',false); return; }
  if(chainMode){
    const nb=new Set([key]);
    gL.selectAll('.cv-e').each(function(){ const s=this.dataset.s, t=this.dataset.t; if(s===key) nb.add(t); if(t===key) nb.add(s); });
    gL.selectAll('.cv-e').classed('rm-dim',function(){ return this.dataset.s!==key&&this.dataset.t!==key; });
    gN.selectAll('.cv-n').classed('rm-dim',function(){ return !nb.has(this.dataset.id); });
    return;
  }
  gL.selectAll('.lkg').classed('rm-dim',d=>!(d.source.data.uid===key||d.target.data.uid===key));
  gN.selectAll('.ng').classed('rm-dim',d=>!(d.data.uid===key||(d.parent&&d.parent.data.uid===key)||(d.children||[]).some(c=>c.data.uid===key)));
}