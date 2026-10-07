/* ══ 🎬 SCÉNARIOS (DIAGRAMMES DE SÉQUENCE) ══════════════════════════════════════════
 * Redessine les scénarios Capella (Exchange, Functional, Operational Entity / Activity, Interface Scenarios) à partir
 * du seul fichier .capella : la chronologie est donnée par l'ordre des ownedInteractionFragments (MessageEnd,
 * ExecutionEnd, InteractionState, FragmentEnd, InteractionOperand) ; Execution, StateFragment, CombinedFragment et
 * InteractionUse sont bornés par ces fragments. La mise en page (espacements, largeurs) est calculée : elle n'est
 * pas lue dans le .aird, le rendu suit le contenu et l'ordre du modèle, pas la position exacte au pixel.
 */
var _capScSel=null;                 // scénario affiché
var _capScState={q:'', layer:'all', kind:'all', view:'diagram', zoom:1};
/** Types de scénarios Capella (attribut kind) : sigle et libellé. */
var CAP_SC_KINDS={DATA_FLOW:{s:'ES',l:'Exchange Scenario'}, FUNCTIONAL:{s:'FS',l:'Functional Scenario'}, INTERACTION:{s:'ES',l:'Interaction Scenario'},
  INTERFACE:{s:'IS',l:'Interface Scenario'}, UNSET:{s:'SC',l:'Scénario'}};
/** Couleurs façon Capella (diagramme sur fond blanc dans tous les thèmes). */
var CAP_SC_COL={
  actor:{f:'#c6e6ff', s:'#4a4aa8', t:'#111'}, sys:{f:'#96b1da', s:'#4a4aa8', t:'#111'}, node:{f:'#fffbb4', s:'#8a6d00', t:'#111'},
  entity:{f:'#e1e1e1', s:'#5a5a5a', t:'#111'}, fn:{f:'#c6ffa4', s:'#1f6b1f', t:'#111'}, act:{f:'#f8dc7c', s:'#6b4f2a', t:'#111'},
  exec:{f:'#c2f5a8', s:'#2e7d2e'}, fbox:{f:'#c2f5a8', s:'#2e8b2e', t:'#1f6b1f'}, abox:{f:'#f8dc7c', s:'#6b4f2a', t:'#3a2a00'},
  state:{f:'#e6e6e6', s:'#9a9a9a', t:'#111'}, mode:{f:'#a9b8b5', s:'#6d7c79', t:'#111'}, line:'#222', frag:'#111'};

/** Sigle d'un scénario selon son type et sa couche (OES / OAS en OA, ES / FS / IS ailleurs).
 * @param {string} kind - Attribut kind @param {string} layer - Couche @returns {string} */
function capScKindShort(kind, layer){
  if(layer==='OA') return kind==='FUNCTIONAL'?'OAS':'OES';
  return (CAP_SC_KINDS[kind]||CAP_SC_KINDS.UNSET).s;
}

/** Texte d'une contrainte Capella (corps de la spécification, sinon nom). Le « texte lié » Capella
 * (<a href="id"/>) est remplacé par le nom de l'élément désigné.
 * @param {Element} c @returns {string} */
function capScConstraintText(c){
  if(!c) return '';
  const {res}=capAnaCtx();
  const b=[...c.getElementsByTagName('bodies')].map(x=>x.textContent.trim()).filter(Boolean)
    .map(t=>t.replace(/<a\s+href="([^"]*)"\s*\/>/g,(m,h)=>{ const el=res(h); return el?capXName(el):''; })
      .replace(/<a\s+href="[^"]*"\s*>(.*?)<\/a>/g,'$1').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').trim());
  return b.filter(Boolean).length?b.filter(Boolean).join(' '):(capXName(c)||'');
}

/** Liste des scénarios du modèle (résumé, sans mise en page), mise en cache.
 * @returns {{list:object[], byId:object}} */
function capComputeScenarios(){
  if(_capAnaCache.scen) return _capAnaCache.scen;
  const {all,res}=capAnaCtx();
  const list=[];
  all.forEach(el=>{
    if(capTName(el)!=='Scenario') return;
    const layer=capArchLayerOf(el)||'?', kind=el.getAttribute('kind')||'UNSET', cap=el.parentElement;
    const kids=t=>[...el.children].filter(c=>c.tagName===t);
    const roles=kids('ownedInstanceRoles').map(r=>capScRole(r,res,layer));
    const msgs=kids('ownedMessages');
    const msgOps=msgs.map(m=>{ const se=res(m.getAttribute('sendingEnd')), ev=se&&res(se.getAttribute('event')); return ev&&res(ev.getAttribute('operation')); });
    const tl=kids('ownedTimeLapses');
    list.push({id:capXId(el), name:capXName(el)||'(sans nom)', kind, ks:capScKindShort(kind,layer), layer, el,
      capId:cap?capXId(cap):'', capName:cap?(capXName(cap)||''):'', capType:cap?capTName(cap):'',
      roles, nMsg:msgs.length, nNoEx:msgOps.filter(o=>!o).length,
      nFrag:tl.filter(t=>capTName(t)==='CombinedFragment').length, nRef:tl.filter(t=>capTName(t)==='InteractionUse').length,
      nState:tl.filter(t=>capTName(t)==='StateFragment').length,
      refs:tl.filter(t=>capTName(t)==='InteractionUse').map(t=>{ const s=res(t.getAttribute('referencedScenario')); return s?capXId(s):''; }).filter(Boolean)});
  });
  const byId={}; list.forEach(s=>byId[s.id]=s);
  return _capAnaCache.scen={list, byId};
}

/** Ligne de vie : élément représenté (composant, acteur, entité, fonction) et sa nature (couleur).
 * @param {Element} r - InstanceRole @param {Function} res - Résolution d'une référence @param {string} layer
 * @returns {{id:string,name:string,refId:string,refType:string,nat:string}} */
function capScRole(r, res, layer){
  const inst=res(r.getAttribute('representedInstance'));
  let tgt=inst, nat='sys';
  if(inst&&capTName(inst)==='Part'){ const t=res(inst.getAttribute('abstractType')); if(t) tgt=t; }
  const tt=tgt?capTName(tgt):'';
  if(/Function$|^OperationalActivity$/.test(tt)) nat=layer==='OA'?'act':'fn';
  else if(tgt&&capIsActorEl(tgt)) nat='actor';
  else if(layer==='OA') nat='entity';
  else if(tgt&&tgt.getAttribute('nature')==='NODE') nat='node';
  // Libellé affiché par Capella : nom de la partie (ou de la fonction) représentée ; à défaut, celui de l'InstanceRole
  return {id:capXId(r), name:(inst&&capXName(inst))||(tgt&&capXName(tgt))||capXName(r)||'?', refId:tgt?capXId(tgt):'', refType:tt, nat};
}

/** Mesure approximative d'un texte (px) à la taille donnée. @param {string} s @param {number} [fs] @returns {number} */
function capScTextW(s, fs){ return (s||'').length*(fs||12)*0.56; }

/** Calcule la mise en page d'un scénario : colonnes, ordonnées des fragments, messages, exécutions, états, fragments combinés.
 * @param {object} sc - Scénario (capComputeScenarios) @returns {object} Modèle de dessin */
function capScLayout(sc){
  const {res}=capAnaCtx(), el=sc.el, kids=t=>[...el.children].filter(c=>c.tagName===t);
  const roles=sc.roles, rIdx={}; roles.forEach((r,i)=>rIdx[r.id]=i);
  const frags=kids('ownedInteractionFragments');
  const fIdx={}; frags.forEach((f,i)=>fIdx[capXId(f)]=i);
  const cov=f=>(f.getAttribute('coveredInstanceRoles')||'').trim().split(/\s+/).filter(Boolean).map(x=>x.replace(/^.*#/,''));
  const rid=v=>(v||'').trim().replace(/^.*#/,'');
  // Messages
  const msgs=kids('ownedMessages').map(m=>{
    const se=res(m.getAttribute('sendingEnd')), re=res(m.getAttribute('receivingEnd'));
    const ev=se&&res(se.getAttribute('event')), op=ev&&res(ev.getAttribute('operation'));
    const ctx=res(m.getAttribute('exchangeContext'));
    const name=capXName(m)||(op&&capXName(op))||'';
    const label=sc.kind==='DATA_FLOW'?`${name} {${capScConstraintText(ctx)}}`:name;
    return {id:capXId(m), name, label, kind:m.getAttribute('kind')||'ASYNCHRONOUS_CALL', send:se?capXId(se):'', recv:re?capXId(re):'',
      from:se?rIdx[cov(se)[0]]:undefined, to:re?rIdx[cov(re)[0]]:undefined, opId:op?capXId(op):'', opType:op?capTName(op):''};
  });
  const bySend={}, byRecv={}; msgs.forEach(m=>{ if(m.send) bySend[m.send]=m; if(m.recv) byRecv[m.recv]=m; });
  // Intervalles
  const execs=[], states=[], cfs=[], ius=[];
  kids('ownedTimeLapses').forEach(t=>{
    const T=capTName(t), st=rid(t.getAttribute('start')), fi=rid(t.getAttribute('finish'));
    if(T==='Execution') execs.push({id:capXId(t), st, fi});
    else if(T==='StateFragment'){
      const s=res(t.getAttribute('relatedAbstractState')), fn=res(t.getAttribute('relatedAbstractFunction')), x=s||fn;
      const xt=x?capTName(x):'';
      states.push({id:capXId(t), st, fi, refId:x?capXId(x):'', name:x?capXName(x):(capXName(t)||'?'), k:fn?(sc.layer==='OA'?'abox':'fbox'):(xt==='Mode'?'mode':'state')});
    }
    else if(T==='CombinedFragment') cfs.push({id:capXId(t), st, fi, op:t.getAttribute('operator')||'', operands:(t.getAttribute('referencedOperands')||'').trim().split(/\s+/).filter(Boolean).map(x=>x.replace(/^.*#/,''))});
    else if(T==='InteractionUse'){ const s=res(t.getAttribute('referencedScenario')); ius.push({id:capXId(t), st, fi, scId:s?capXId(s):'', name:s?capXName(s):(capXName(t)||'ref')}); }
  });
  const execByEnd={}; execs.forEach(x=>execByEnd[x.fi]=x);
  const stStart={}, stEnd={}; states.forEach(s=>{ stStart[s.st]=s; stEnd[s.fi]=s; });
  const cfStart={}, cfEnd={}; cfs.forEach(c=>{ cfStart[c.st]=c; cfEnd[c.fi]=c; });
  const iuStart={}, iuEnd={}; ius.forEach(c=>{ iuStart[c.st]=c; iuEnd[c.fi]=c; });
  const opnd={}; cfs.forEach(c=>c.operands.forEach((o,i)=>opnd[o]={cf:c,i}));
  // Ordonnées
  const Y={}; let y=96;
  const HEAD=24, TOP=96;
  for(let i=0;i<frags.length;i++){
    const f=frags[i], id=capXId(f), T=capTName(f);
    if(T==='MessageEnd'){
      const ms=bySend[id], mr=byRecv[id];
      if(ms){ y+=34; Y[id]=y; }
      else if(mr){ const ys=Y[mr.send];
        if(ys===undefined){ y+=34; Y[id]=y; }
        else if(mr.from===mr.to){ Y[id]=Math.max(ys+20,y); y=Y[id]; }
        else { Y[id]=ys; if(ys<y){ /* message oblique : réception après d'autres événements */ Y[id]=y; } }
      } else { y+=14; Y[id]=y; }
    } else if(T==='ExecutionEnd'){ const xs=execByEnd[id], ys=xs&&Y[xs.st]; y=Math.max(y+10, ys!==undefined?ys+34:0); Y[id]=y; }   // barre d'activation : 34 px au moins, comme Capella
    else if(T==='InteractionState'){
      const s=stStart[id], e=stEnd[id];
      if(s){ const next=frags[i+1];
        if(next&&capXId(next)===s.fi){ y+=14; Y[id]=y; y+=s.k==='fbox'||s.k==='abox'?40:32; Y[s.fi]=y; i++; }
        else { y+=14; Y[id]=y; y+=s.k==='fbox'||s.k==='abox'?40:34; }
      } else if(e){ y+=10; Y[id]=y; }
      else { y+=10; Y[id]=y; }
    } else if(T==='FragmentEnd'){
      if(cfStart[id]){ y+=18; Y[id]=y; y+=20; }
      else if(iuStart[id]){ y+=16; Y[id]=y; y+=34; }
      else if(cfEnd[id]||iuEnd[id]){ y+=12; Y[id]=y; y+=4; }
      else { y+=10; Y[id]=y; }
    } else if(T==='InteractionOperand'){
      const o=opnd[id];
      if(o&&o.i>0){ y+=14; Y[id]=y; y+=18; } else { Y[id]=y; y+=o&&capScOperandGuard(f)?14:0; }
    } else { y+=8; Y[id]=y; }
  }
  const bottom=y+40;
  // Colonnes : largeur des en-têtes, des étiquettes de messages et des boîtes d'états
  const n=roles.length, hw=roles.map(r=>Math.min(230,Math.max(120,capScTextW(r.name,12.5)+56)));
  const gap=Array(Math.max(0,n-1)).fill(0).map((_,k)=>(hw[k]+hw[k+1])/2+30);
  msgs.forEach(m=>{ if(m.from===undefined||m.to===undefined) return;
    const a=Math.min(m.from,m.to), b=Math.max(m.from,m.to), w=capScTextW(m.label,12)+30;
    if(a===b){ if(a<n-1) gap[a]=Math.max(gap[a], w+50); return; }
    const need=w/(b-a); for(let k=a;k<b;k++) gap[k]=Math.max(gap[k],need); });
  states.forEach(s=>{ const f=frags[fIdx[s.st]]; const r=f?rIdx[cov(f)[0]]:undefined; if(r===undefined) return;
    const w=Math.min(190,capScTextW(s.name,12)+30)/2+12; if(r>0) gap[r-1]=Math.max(gap[r-1],w+hw[r-1]/2-30); if(r<n-1) gap[r]=Math.max(gap[r],w+hw[r+1]/2-30); });
  const X=[]; let x=24+hw[0]/2+20; roles.forEach((r,i)=>{ X[i]=x; if(i<n-1) x+=gap[i]; });
  // Étiquettes des messages réflexifs de la dernière colonne : place à droite
  const selfLast=msgs.filter(m=>m.from===n-1&&m.to===n-1).reduce((w,m)=>Math.max(w,capScTextW(m.label,12)+50),0);
  const width=(n?X[n-1]+Math.max(hw[n-1]/2,selfLast):200)+70;
  return {roles, X, hw, Y, frags, fIdx, cov, rIdx, msgs, execs, states, cfs, ius, bottom, width, top:TOP, head:HEAD};
}

/** Garde (condition) d'un opérande de fragment combiné. @param {Element} f - InteractionOperand @returns {string} */
function capScOperandGuard(f){
  const {res}=capAnaCtx(); const g=res(f.getAttribute('guard'));
  return g?capScConstraintText(g):'';
}

/** Découpe un texte en lignes d'environ n caractères (2 lignes au plus, « … » au-delà).
 * @param {string} s @param {number} n @returns {string[]} */
function capScWrap(s, n){
  const w=(s||'').split(/\s+/), out=[]; let cur='';
  w.forEach(x=>{ if((cur+' '+x).trim().length>n&&cur){ out.push(cur); cur=x; } else cur=(cur+' '+x).trim(); });
  if(cur) out.push(cur);
  return out.length>2?[out[0], out.slice(1).join(' ').slice(0,n-1)+'…']:out;
}

/** Dessine un scénario en SVG façon Capella (fond blanc).
 * @param {object} sc - Scénario @returns {{svg:string,w:number,h:number,L:object}} */
function capScenarioSvg(sc){
  const L=capScLayout(sc), C=CAP_SC_COL, e=capEsc, {X,Y,roles,frags,cov,rIdx}=L;
  const H=L.bottom+20, W=L.width;
  const yOf=id=>Y[id];
  const roleOfFrag=id=>{ const f=frags[L.fIdx[id]]; return f?rIdx[cov(f)[0]]:undefined; };
  const ref=(id,inner,tip,cls)=>`<g class="sc-ref${cls?' '+cls:''}" data-ref="${e(id||'')}" style="cursor:${id?'pointer':'default'}"><title>${e(tip||'')}</title>${inner}</g>`;
  let out='';
  // Fragments combinés et références (sous le reste) — profondeur d'imbrication pour les marges
  const boxes=[...L.cfs.map(c=>({c, y1:yOf(c.st), y2:yOf(c.fi), t:'cf'})), ...L.ius.map(c=>({c, y1:yOf(c.st), y2:yOf(c.fi), t:'iu'}))].filter(b=>b.y1!==undefined&&b.y2!==undefined);
  boxes.forEach(b=>{ const f=frags[L.fIdx[b.c.st]]; const rs=f?cov(f).map(r=>rIdx[r]).filter(v=>v!==undefined):[];
    b.r1=rs.length?Math.min(...rs):0; b.r2=rs.length?Math.max(...rs):roles.length-1;
    b.depth=boxes.filter(o=>o!==b&&o.y1<b.y1&&o.y2>b.y2).length; });
  boxes.sort((a,b)=>a.depth-b.depth).forEach(b=>{
    const m=Math.max(18, 74-b.depth*12), x1=X[b.r1]-Math.min(L.hw[b.r1]/2+6,m), x2=X[b.r2]+Math.min(L.hw[b.r2]/2+6,m), y1=b.y1-14, y2=b.y2;
    if(b.t==='cf'){
      const lab=b.c.op||'?', lw=capScTextW(lab,11)+16;
      out+=`<g><rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="url(#scg)" stroke="${C.frag}" stroke-width="1.3"/>
        <path d="M${x1},${y1} H${x1+lw} V${y1+12} L${x1+lw-8},${y1+20} H${x1} Z" fill="#fff" stroke="${C.frag}" stroke-width="1"/>
        <text x="${x1+6}" y="${y1+14}" font-size="11">${e(lab)}</text>`;
      b.c.operands.forEach((o,i)=>{ const f=frags[L.fIdx[o]]; if(!f) return; const yo=yOf(o), g=capScOperandGuard(f);
        if(i>0) out+=`<line x1="${x1}" y1="${yo}" x2="${x2}" y2="${yo}" stroke="${C.frag}" stroke-dasharray="6,4"/>`;
        if(g) out+=`<text x="${x1+(i>0?8:lw+8)}" y="${(i>0?yo:y1)+14}" font-size="11" fill="#333">[${e(g)}]</text>`; });
      out+='</g>';
    } else {
      out+=`<g class="sc-iu" data-sc="${e(b.c.scId)}" style="cursor:${b.c.scId?'pointer':'default'}"><title>Référence au scénario ${e(b.c.name)}${b.c.scId?' — clic : l\'ouvrir':''}</title>
        <rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${C.frag}" stroke-width="1.3"/>
        <path d="M${x1},${y1} H${x1+34} V${y1+12} L${x1+26},${y1+20} H${x1} Z" fill="#fff" stroke="${C.frag}"/>
        <text x="${x1+6}" y="${y1+14}" font-size="11">ref</text>
        <text x="${(x1+x2)/2}" y="${(y1+y2)/2+5}" font-size="12.5" text-anchor="middle" fill="#1a4f8a" text-decoration="underline">${e(b.c.name)}</text></g>`;
    }
  });
  // Lignes de vie
  roles.forEach((r,i)=>{ const c=C[r.nat]||C.sys, w=L.hw[i], x=X[i];
    out+=`<line x1="${x}" y1="${L.head+46}" x2="${x}" y2="${L.bottom}" stroke="#777" stroke-width="1.2" stroke-dasharray="6,5"/>
      <line x1="${x-8}" y1="${L.bottom}" x2="${x+8}" y2="${L.bottom}" stroke="#777" stroke-width="3"/>`;
    const lines=capScWrap(r.name,Math.max(10,Math.floor((w-40)/7)));
    out+=ref(r.refId, `<rect x="${x-w/2}" y="${L.head}" width="${w}" height="46" fill="${c.f}" stroke="${c.s}" stroke-width="1.4"/>
      <g transform="translate(${x-w/2+10},${L.head+15})" stroke="#111" fill="none" stroke-width="1.6"><path d="M5,0 V16 M1,0 H9 M0,9 H4 M7,9 H12 M10,6 L13,9 L10,12"/></g>
      ${lines.map((l,k)=>`<text x="${x+8}" y="${L.head+23+(k-(lines.length-1)/2)*14+4}" font-size="12.5" text-anchor="middle" fill="${c.t}">${e(l)}</text>`).join('')}`,
      `${r.name} — ${r.refType||'?'} (clic : détail)`);
  });
  // Exécutions (barres), avec décalage si imbriquées sur la même ligne de vie
  const ex=L.execs.map(x=>({...x, r:roleOfFrag(x.st), y1:yOf(x.st), y2:yOf(x.fi)})).filter(x=>x.r!==undefined&&x.y1!==undefined&&x.y2!==undefined);
  ex.forEach(x=>{ x.lvl=ex.filter(o=>o!==x&&o.r===x.r&&o.y1<=x.y1&&o.y2>=x.y2&&(o.y1<x.y1||o.y2>x.y2)).length; });
  ex.sort((a,b)=>a.lvl-b.lvl).forEach(x=>{ out+=`<rect x="${X[x.r]-5+x.lvl*6}" y="${x.y1}" width="10" height="${Math.max(8,x.y2-x.y1)}" fill="${C.exec.f}" stroke="${C.exec.s}" stroke-width="1.2"/>`; });
  const lvlAt=(r,yy)=>ex.filter(x=>x.r===r&&x.y1<=yy&&x.y2>=yy).reduce((m,x)=>Math.max(m,x.lvl+1),0);
  // États, modes, fonctions
  L.states.forEach(s=>{ const r=roleOfFrag(s.st), y1=yOf(s.st), y2=yOf(s.fi); if(r===undefined||y1===undefined) return;
    const c=C[s.k], x=X[r], yb=y2===undefined?y1+30:y2, lines=capScWrap(s.name,24), w=Math.min(190,Math.max(90,capScTextW(lines[0],12)+30));
    if(s.k==='fbox'||s.k==='abox'){ const h=Math.max(34,Math.min(yb-y1,lines.length*15+12)), ty=y1+h/2-(lines.length-1)*7.5+4;
      out+=ref(s.refId,`<rect x="${x-w/2}" y="${y1}" width="${w}" height="${h}" fill="${c.f}" stroke="${c.s}" stroke-width="1.3"/>
        ${lines.map((l,k)=>`<text x="${x}" y="${ty+k*15}" font-size="12" text-anchor="middle" fill="${c.t}">${e(l)}</text>`).join('')}`, `${s.name} — fonction (clic : détail)`);
    } else { const h=Math.max(26,Math.min(yb-y1,lines.length*15+12)), cy=y1+h/2;
      out+=ref(s.refId,`<ellipse cx="${x}" cy="${cy}" rx="${w/2}" ry="${h/2}" fill="${c.f}" stroke="${c.s}" stroke-width="1.2"/>
        ${lines.map((l,k)=>`<text x="${x}" y="${cy-(lines.length-1)*7.5+4+k*15}" font-size="12" text-anchor="middle" fill="${c.t}">${e(l)}</text>`).join('')}`, `${s.name} — ${s.k==='mode'?'mode':'état'} (clic : détail)`);
    }
  });
  // Messages
  L.msgs.forEach(m=>{ const ys=yOf(m.send), yr=yOf(m.recv); if(m.from===undefined||m.to===undefined||ys===undefined) return;
    const y2=yr===undefined?ys:yr, dash=m.kind==='REPLY'||m.kind==='CREATE'?' stroke-dasharray="6,4"':'', head=m.kind==='SYNCHRONOUS_CALL'?'scf':'sco';
    const tip=`${m.name}${m.opType?' — '+m.opType:''} (${m.kind})`;
    if(m.from===m.to){ const x=X[m.from]+5+lvlAt(m.from,ys)*6-(lvlAt(m.from,ys)?6:0), xo=x+34;
      out+=ref(m.opId||m.id,`<path d="M${x},${ys} H${xo} V${y2} H${x+(lvlAt(m.to,y2+1)?6:0)+1}" fill="none" stroke="${C.line}" stroke-width="1.4"${dash} marker-end="url(#${head})"/>
        <text x="${xo+6}" y="${ys-6}" font-size="12" fill="#111" class="sc-lab">${e(m.label)}</text>`, tip);
      return; }
    const dir=m.to>m.from?1:-1, off=r=>{ const l=lvlAt(r,ys+1); return l?5+(l-1)*6:0; };
    const x1=X[m.from]+dir*off(m.from), x2=X[m.to]-dir*(off(m.to)||1);
    out+=ref(m.opId||m.id,`<line x1="${x1}" y1="${ys}" x2="${x2}" y2="${y2}" stroke="${C.line}" stroke-width="1.4"${dash} marker-end="url(#${head})"/>
      ${m.kind==='DELETE'?`<path d="M${x2-7},${y2-7} L${x2+7},${y2+7} M${x2-7},${y2+7} L${x2+7},${y2-7}" stroke="#111" stroke-width="2"/>`:''}
      <text x="${(x1+x2)/2}" y="${Math.min(ys,y2)-6}" font-size="12" text-anchor="middle" fill="#111" class="sc-lab">${e(m.label)}</text>`, tip);
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif" style="display:block;background:#fff">
    <defs><marker id="sco" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1,1 L9.5,5 L1,9" fill="none" stroke="#111" stroke-width="1.5"/></marker>
      <marker id="scf" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1,1 L9.5,5 L1,9 Z" fill="#111"/></marker>
      <linearGradient id="scg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ececec"/></linearGradient>
      <style>.sc-lab{paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}</style></defs>
    <rect width="${W}" height="${H}" fill="#fff"/>${out}</svg>`;
  return {svg, w:W, h:H, L};
}

/** Sections de contrôle des scénarios (🩺 et tableau de bord). @returns {object[]} */
function capScChecks(){
  const S=capComputeScenarios().list, {res}=capAnaCtx();
  const fl=(id,n)=>`<span class="cex-det" style="cursor:pointer" onclick="capOpenDetailById('${capEsc(id)}')">${capEsc(n)}</span>`;
  const row=(s,extra)=>`<tr><td>${s.layer}</td><td>${s.ks}</td><td>${fl(s.id,s.name)}</td><td>${s.capName?fl(s.capId,s.capName):'—'}</td><td>${extra}</td></tr>`;
  const cols=['Couche','Type','Scénario','Capacité','Détail'];
  const noRef=S.flatMap(s=>s.roles.filter(r=>!r.refId).map(r=>row(s,`ligne de vie « ${capEsc(r.name)} »`)));
  return [
    {icon:'∅', title:'Scénarios vides (aucun message)', tip:'Scénario sans SequenceMessage', cols, items:S.filter(s=>!s.nMsg).map(s=>row(s,`${s.roles.length} ligne(s) de vie`))},
    {icon:'⇢', title:'Messages sans échange', tip:'SequenceMessage dont l\'événement n\'invoque aucun échange (Functional / Component Exchange…)', cols, items:S.filter(s=>s.nNoEx).map(s=>row(s,`${s.nNoEx} message(s)`))},
    {icon:'?', title:'Lignes de vie sans élément représenté', tip:'InstanceRole sans representedInstance résolu', cols, items:noRef},
    {icon:'🎯', title:'Scénarios hors capacité', tip:'Scénario qui n\'est pas rangé sous une capacité ou une réalisation de capacité', cols,
      items:S.filter(s=>!/Capability/.test(s.capType)).map(s=>row(s,capEsc(s.capType||'—')))},
    {icon:'↗', title:'Références vers un scénario introuvable', tip:'InteractionUse sans referencedScenario résolu', cols,
      items:S.filter(s=>s.nRef>s.refs.length).map(s=>row(s,`${s.nRef-s.refs.length} référence(s)`))}
  ];
}

/** Indicateurs 🎬 Scénarios pour le catalogue du tableau de bord.
 * @param {Function} add - Ajout d'un indicateur @param {Function} LC - Couleur d'une couche */
function capScDashCatalog(add, LC){
  const S=()=>capComputeScenarios().list;
  add('Scénarios','sc.n','Scénarios — nombre','n',()=>({n:S().length, sub:`${S().reduce((t,s)=>t+s.nMsg,0)} message(s)`}));
  add('Scénarios','sc.layer','Scénarios — par couche','series',()=>({order:'natural',cats:CAP_ANA_LAYERS.map(k=>({l:k,v:S().filter(s=>s.layer===k).length,c:LC(k)})).filter(c=>c.v)}));
  add('Scénarios','sc.kind','Scénarios — par type','series',()=>{ const m={}; S().forEach(s=>m[s.ks]=(m[s.ks]||0)+1); return {cats:Object.entries(m).map(([l,v])=>({l,v})).sort((a,b)=>b.v-a.v)}; });
  add('Scénarios','sc.chk','Scénarios — contrôles','series',()=>({cats:capScChecks().map(s=>({l:s.title,v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}

/** Ouvre un scénario dans la vue 🎬 Scénarios. @param {string} id */
function capScOpen(id){ _capScSel=id; _capScState.view='diagram'; if(capCurrentView!=='scen') capNavOpen('scen'); else capRenderScenarios(); }

/** Exporte le scénario affiché : 'svg', 'png' ou 'clip' (PNG dans le presse-papiers). @param {string} fmt */
function capScExport(fmt){
  const sc=capComputeScenarios().byId[_capScSel]; if(!sc) return;
  const {svg,w,h}=capScenarioSvg(sc), base=(sc.ks+'-'+sc.name).replace(/[^\w\-]+/g,'_').slice(0,80);
  if(fmt==='svg'){ capDownloadBlob(new Blob([svg],{type:'image/svg+xml'}), base+'.svg'); return; }
  capSvgToCanvas(svg,w,h,2).then(c=>capCanvasBlob(c,'image/png')).then(b=>{
    if(fmt==='png') capDownloadBlob(b, base+'.png');
    else if(navigator.clipboard&&window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(()=>{ if(typeof capWatchFlash==='function') capWatchFlash('✔ Diagramme copié'); },()=>alert('Copie impossible dans ce navigateur.'));
    else alert('Copie d\'image non disponible dans ce navigateur.');
  }).catch(err=>alert('Export impossible : '+err.message));
}

/** Ajuste la hauteur de la liste et du diagramme au bas réel de la vue (la barre d'état ne doit pas masquer
 * la barre de défilement horizontale du diagramme). @param {HTMLElement} box - #cap-view-scen */
function capScFit(box){
  if(!box||!box.offsetParent) return;
  const bottom=box.getBoundingClientRect().bottom;
  box.querySelectorAll('.sc-list,.sc-scroll').forEach(el=>{ el.style.height=Math.max(160, bottom-el.getBoundingClientRect().top-2)+'px'; });
}

/** Déplacement du diagramme par cliquer-glisser (en plus des barres de défilement, de la molette et de Maj + molette).
 * @param {HTMLElement} sc - Zone défilante .sc-scroll */
function capScPan(sc){
  if(!sc) return;
  sc.addEventListener('mousedown',ev=>{
    if(ev.button!==0||ev.target.closest('.sc-ref,.sc-iu,a,button')) return;
    const x0=ev.clientX, y0=ev.clientY, l0=sc.scrollLeft, t0=sc.scrollTop; let moved=false;
    const mv=e=>{ const dx=e.clientX-x0, dy=e.clientY-y0; if(!moved&&Math.abs(dx)+Math.abs(dy)<4) return; moved=true; sc.classList.add('sc-pan'); sc.scrollLeft=l0-dx; sc.scrollTop=t0-dy; e.preventDefault(); };
    const up=()=>{ sc.classList.remove('sc-pan'); document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
}
window.addEventListener('resize',()=>capScFit(document.getElementById('cap-view-scen')));

/** Rend la vue 🎬 Scénarios : liste filtrable à gauche, diagramme de séquence (ou contrôles) à droite. */
function capRenderScenarios(){
  const box=document.getElementById('cap-view-scen'); if(!box) return;
  const S=capComputeScenarios(), st=_capScState, e=capEsc;
  if(!S.list.length){ box.innerHTML='<div class="phl-empty">Ce modèle ne contient aucun scénario (Scenario).</div>'; return; }
  if(!_capScSel||!S.byId[_capScSel]) _capScSel=(S.list.find(s=>s.nMsg)||S.list[0]).id;
  const layers=CAP_ANA_LAYERS.filter(k=>S.list.some(s=>s.layer===k)), kinds=[...new Set(S.list.map(s=>s.ks))];
  const q=st.q.trim().toLowerCase();
  const vis=S.list.filter(s=>(st.layer==='all'||s.layer===st.layer)&&(st.kind==='all'||s.ks===st.kind)&&(!q||(s.name+' '+s.capName+' '+s.roles.map(r=>r.name).join(' ')).toLowerCase().includes(q)));
  // Liste groupée par couche puis capacité
  const groups=new Map(); vis.forEach(s=>{ const k=s.layer+'\u0001'+(s.capName||'—'); if(!groups.has(k)) groups.set(k,{layer:s.layer,cap:s.capName||'—',capId:s.capId,items:[]}); groups.get(k).items.push(s); });
  const listHtml=[...groups.values()].map(g=>`<div class="sc-grp"><span class="cap-type-badge">${g.layer}</span> <span class="sc-cap"${g.capId?` data-det="${e(g.capId)}" title="Capacité — clic : détail"`:''}>🎯 ${e(g.cap)}</span></div>`+
    g.items.map(s=>`<div class="sc-item${s.id===_capScSel?' on':''}" data-sc="${e(s.id)}" title="${e(s.name)}"><span class="sc-k">${s.ks}</span> ${e(s.name)} <span class="sc-n">${s.nMsg} msg</span></div>`).join('')).join('')
    ||'<div class="phl-empty">Aucun scénario ne correspond au filtre.</div>';
  const sc=S.byId[_capScSel];
  let main='';
  if(st.view==='diag') main=capDiagHtml(capScChecks());
  else {
    const D=capScenarioSvg(sc);
    main=`<div class="sc-head"><span class="sc-k">${sc.ks}</span> <b class="cex-det" data-det="${e(sc.id)}" style="cursor:pointer">${e(sc.name)}</b>
        <span class="ana-dim">· ${e((CAP_SC_KINDS[sc.kind]||CAP_SC_KINDS.UNSET).l)} · ${sc.layer} · ${sc.roles.length} ligne(s) de vie · ${sc.nMsg} message(s)${sc.nFrag?` · ${sc.nFrag} fragment(s)`:''}${sc.nRef?` · ${sc.nRef} référence(s)`:''}</span>
        ${sc.capName?`<span class="ana-dim">· 🎯 <span class="cex-det" data-det="${e(sc.capId)}" style="cursor:pointer">${e(sc.capName)}</span></span>`:''}</div>
      <div class="sc-scroll"><div class="sc-band" style="width:${D.w*st.zoom}px">${sc.roles.map((r,i)=>`<span style="left:${D.L.X[i]*st.zoom}px;background:${(CAP_SC_COL[r.nat]||CAP_SC_COL.sys).f}">${e(r.name)}</span>`).join('')}</div>
        <div class="sc-svg" style="width:${D.w*st.zoom}px">${D.svg.replace('<svg ',`<svg style="width:${D.w*st.zoom}px;height:${D.h*st.zoom}px" `)}</div></div>`;
  }
  box.innerHTML=`<div class="phl-filter-bar">
      <span class="tb-grp">${[['diagram','🎬 Diagramme'],['diag','🩺 Contrôles']].map(([k,l])=>`<button class="phl-toggle-btn${st.view===k?' active':''}" data-scv="${k}">${l}</button>`).join('')}</span>
      <span class="tb-grp"><span class="tb-grp-l">Couche</span>${[['all','Toutes'],...layers.map(k=>[k,k])].map(([k,l])=>`<button class="cap-lf-btn${st.layer===k?' active':''}" data-scl="${k}">${l} (${k==='all'?S.list.length:S.list.filter(s=>s.layer===k).length})</button>`).join('')}</span>
      <span class="tb-grp"><span class="tb-grp-l">Type</span>${[['all','Tous'],...kinds.map(k=>[k,k])].map(([k,l])=>`<button class="cap-lf-btn${st.kind===k?' active':''}" data-sck="${k}" title="${k==='ES'?'Exchange Scenario':k==='FS'?'Functional Scenario':k==='OES'?'Operational Entity Scenario':k==='OAS'?'Operational Activity Scenario':k==='IS'?'Interface Scenario':'Tous les types'}">${l}</button>`).join('')}</span>
      <span class="tb-grp"><input id="sc-q" class="phl-filter-input" placeholder="🔍 Scénario, capacité, ligne de vie…" value="${e(st.q)}" style="width:220px"><span class="ana-fn-cnt">${vis.length} / ${S.list.length}</span></span>
      ${st.view==='diagram'?`<span class="tb-grp" style="margin-left:auto"><button class="cap-lf-btn" data-scz="-1" title="Réduire">−</button><button class="cap-lf-btn" data-scz="0" title="Taille réelle">${Math.round(st.zoom*100)} %</button><button class="cap-lf-btn" data-scz="1" title="Agrandir">+</button></span>
      <span class="tb-grp"><button class="phl-export-btn" data-sce="png">⬇ PNG</button><button class="phl-export-btn" data-sce="svg">⬇ SVG</button><button class="phl-export-btn" data-sce="clip" title="Copier l'image dans le presse-papiers">📋 Copier</button></span>`:''}
    </div>
    <div class="sc-split"><div class="sc-list">${listHtml}</div><div class="sc-main">${main}</div></div>`;
  // Écouteurs
  box.querySelectorAll('[data-scv]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.scv; capRenderScenarios(); });
  box.querySelectorAll('[data-scl]').forEach(b=>b.onclick=()=>{ st.layer=b.dataset.scl; capRenderScenarios(); });
  box.querySelectorAll('[data-sck]').forEach(b=>b.onclick=()=>{ st.kind=b.dataset.sck; capRenderScenarios(); });
  box.querySelectorAll('[data-scz]').forEach(b=>b.onclick=()=>{ const d=+b.dataset.scz; st.zoom=d?Math.max(0.4,Math.min(2,Math.round((st.zoom+d*0.15)*100)/100)):1; capRenderScenarios(); });
  box.querySelectorAll('[data-sce]').forEach(b=>b.onclick=()=>capScExport(b.dataset.sce));
  box.querySelectorAll('.sc-item').forEach(it=>it.onclick=()=>{ _capScSel=it.dataset.sc; st.view='diagram'; capRenderScenarios(); });
  box.querySelectorAll('[data-det]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); capOpenDetailById(a.dataset.det); });
  box.querySelectorAll('.sc-svg .sc-ref').forEach(g=>g.addEventListener('click',()=>{ if(g.dataset.ref) capOpenDetailById(g.dataset.ref); }));
  box.querySelectorAll('.sc-svg .sc-iu').forEach(g=>g.addEventListener('click',()=>{ if(g.dataset.sc&&S.byId[g.dataset.sc]){ _capScSel=g.dataset.sc; capRenderScenarios(); } }));
  let deb; const qi=box.querySelector('#sc-q');
  if(qi) qi.oninput=()=>{ st.q=qi.value; clearTimeout(deb); deb=setTimeout(()=>{ capRenderScenarios(); const n=document.getElementById('sc-q'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } },200); };
  capScFit(box);
  capScPan(box.querySelector('.sc-scroll'));
  // Sélection visible dans la liste (sans faire défiler la vue elle-même)
  const lst=box.querySelector('.sc-list'), sel=box.querySelector('.sc-item.on');
  if(lst&&sel){ const top=sel.offsetTop;   /* .sc-list est positionnée : offsetTop relatif à la liste */ if(top<lst.scrollTop||top>lst.scrollTop+lst.clientHeight-30) lst.scrollTop=Math.max(0,top-lst.clientHeight/3); }
}
