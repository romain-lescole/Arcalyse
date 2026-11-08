/* ═══════════════════════════════════════════════════════════════════════════
   🖼 Diagrammes calculés des 🚦 Machines à états et des 🎬 Interactions d'un modèle UML / SysML v1 (onglet « 🖼 Diagramme
   calculé » des sous-vues `umlstm` / `umlseq`, 94). Comme pour les 🎬 Scénarios Capella (49), le dessin est recalculé à partir
   du seul modèle : il ne dépend pas des diagrammes du fichier (le bouton 🔲 y renvoie quand il en existe un).
   - Interactions : `capUmlSeqLayout` produit la mise en page attendue par `capScenarioSvg` (49) — lignes de vie, messages dans
     l'ordre des fragments (MessageOccurrenceSpecification), barres d'exécution, fragments combinés (alt / opt / loop / par…)
     en cadres imbriqués avec leurs opérandes gardés, références (InteractionUse), invariants d'état, messages perdus / trouvés ;
   - Machines à états : `capUmlStmLayout` place les états en couches, région par région (états composites imbriqués, régions
     orthogonales empilées, points d'entrée et de sortie sur le bord), `capUmlStmSvg` dessine états, pseudo-états (initial,
     final, choix, jonction, historique, fourche / jointure, terminaison) et transitions « déclencheur [garde] / effet » ;
   - commun : barre de zoom et d'export (`capUmlDgBarre`, `capUmlDgBind`, `capUmlDgExport` : SVG, PNG, presse-papiers).
   ═══════════════════════════════════════════════════════════════════════════ */

/** Couleurs du diagramme calculé des machines à états (fond blanc dans tous les thèmes, comme les 🎬 Scénarios). */
var CAP_UML_STM_COL={etat:{f:'#fff6cf', s:'#9c7f00'}, comp:{f:'#fffcef', s:'#9c7f00', h:'#fbeeb0'}, texte:'#111', trait:'#2b2b2b', garde:'#6b4f00', effet:'#1f5f8a', ko:'#d29922', cadre:'#666'};

/* ── 1. 🎬 Interactions → diagramme de séquence ─────────────────── */

/** Mise en page d'une interaction UML pour `capScenarioSvg` (49) : colonnes des lignes de vie, ordonnées des événements dans
 * l'ordre des fragments (parcours des opérandes compris), messages, exécutions, fragments combinés, références, invariants.
 * @param {object} I - Interaction (`capUmlInteractions`) @returns {object} Modèle de dessin (même forme que `capScLayout`) */
function capUmlSeqLayout(I){
  const lec=capUmlLec(), E=id=>id?lec.element(id):null, el=E(I.id);
  const roles=I.lifelines.map(l=>{ const t=l.type&&E(l.type.id);
    return {id:l.id, name:l.name||'?', refId:l.id, refType:l.type?l.type.name:(l.rep?l.rep.meta:'Lifeline'), nat:t&&t.metaclasse==='Actor'||(!l.rep&&!l.type)?'actor':'sys'}; });
  const rIdx={}; roles.forEach((r,i)=>{ rIdx[r.id]=i; });
  const kind={synchCall:'SYNCHRONOUS_CALL', asynchCall:'ASYNCHRONOUS_CALL', asynchSignal:'ASYNCHRONOUS_CALL', reply:'REPLY', createMessage:'CREATE', deleteMessage:'DELETE'};
  const msgs=I.messages.map(m=>{ const x=E(m.id), nom=m.name||(m.sig?m.sig.name:'')||'—';
    return {id:m.id, name:nom, label:`${m.num}: ${nom}`, kind:kind[m.sort]||'ASYNCHRONOUS_CALL', send:capUmlRef(x,'sendEvent')[0]||'', recv:capUmlRef(x,'receiveEvent')[0]||'',
      from:m.src?rIdx[m.src.id]:undefined, to:m.tgt?rIdx[m.tgt.id]:undefined, opId:'', opType:m.sig?`${m.sig.meta} ${m.sig.name}`:capUmlSorteMessage(m.sort)}; });
  const sendOf={}, recvOf={}; msgs.forEach(m=>{ if(m.send) sendOf[m.send]=m; if(m.recv) recvOf[m.recv]=m; });
  const frags=[], fIdx={}, Y={}, execs=[], states=[], cfs=[], ius=[], gardes={};
  const addF=(id,cov)=>{ fIdx[id]=frags.length; frags.push({id, cov}); };
  const lls=f=>capUmlRef(f,'covered').filter(id=>rIdx[id]!==undefined);
  /** Lignes de vie couvertes par un fragment : « covered », sinon celles de ses descendants, sinon toutes. */
  const couvre=f=>{ let L=lls(f); if(L.length) return L; const S=new Set(), pile=[...(f.enfants||[])];
    while(pile.length){ const c=E(pile.pop()); if(!c) continue; lls(c).forEach(i=>S.add(i)); pile.push(...(c.enfants||[])); }
    return S.size?roles.map(r=>r.id).filter(i=>S.has(i)):roles.map(r=>r.id); };
  // Barres d'exécution (n'importe où dans l'arbre des fragments) : bornées par leurs occurrences de début et de fin
  const fin={}, pile=[...(el&&el.enfants||[])];
  while(pile.length){ const f=E(pile.pop()); if(!f) continue;
    if(/ExecutionSpecification$/.test(f.metaclasse)){ const x={id:f.id, st:capUmlRef(f,'start')[0]||'', fi:capUmlRef(f,'finish')[0]||''}; if(x.st&&x.fi){ execs.push(x); fin[x.fi]=x; } }
    else if(/^(CombinedFragment|InteractionOperand)$/.test(f.metaclasse)) pile.push(...(f.enfants||[])); }
  let y=96;
  const parcours=ids=>ids.map(E).filter(Boolean).forEach(f=>{
    const mc=f.metaclasse;
    if(/OccurrenceSpecification$/.test(mc)){
      addF(f.id, lls(f));
      const ms=sendOf[f.id], mr=recvOf[f.id];
      if(ms){ y+=34; Y[f.id]=y; }
      else if(mr){ const ys=Y[mr.send];
        if(ys===undefined){ y+=34; Y[f.id]=y; }
        else if(mr.from===mr.to){ Y[f.id]=Math.max(ys+20,y); y=Y[f.id]; }
        else Y[f.id]=Math.max(ys,y); }   // message oblique si d'autres événements séparent l'émission de la réception
      else { y+=14; Y[f.id]=y; }
      const x=fin[f.id]; if(x&&Y[x.st]!==undefined&&Y[f.id]<Y[x.st]+30){ Y[f.id]=Y[x.st]+30; y=Math.max(y,Y[f.id]); }   // barre d'exécution : 30 px au moins
    } else if(mc==='CombinedFragment'){
      const cov=couvre(f), st=f.id+'#debut', fi=f.id+'#fin', ops=(f.enfants||[]).map(E).filter(o=>o&&o.metaclasse==='InteractionOperand');
      addF(st,cov); y+=18; Y[st]=y; y+=20;
      ops.forEach((o,i)=>{ const g=(o.enfants||[]).map(E).find(c=>c&&/Constraint$/.test(c.metaclasse)); gardes[o.id]=g?capUmlTexteContrainte(lec,g):'';
        addF(o.id,cov); if(i>0){ y+=14; Y[o.id]=y; y+=18; } else { Y[o.id]=y; y+=gardes[o.id]?14:0; }
        parcours(o.enfants||[]); });
      y+=12; Y[fi]=y; y+=4;
      cfs.push({id:f.id, st, fi, op:capUmlAttr(lec, f.id, 'interactionOperator')||'seq', operands:ops.map(o=>o.id)});
    } else if(mc==='InteractionUse'){
      const st=f.id+'#debut', fi=f.id+'#fin', ref=E(capUmlRef(f,'refersTo')[0]);
      addF(st,couvre(f)); y+=16; Y[st]=y; y+=46; Y[fi]=y; y+=4;
      ius.push({id:f.id, st, fi, scId:ref?ref.id:'', name:ref?capUmlNom(ref):_L('(interaction introuvable)')});
    } else if(mc==='StateInvariant'){
      const st=f.id+'#debut', fi=f.id+'#fin', c=(f.enfants||[]).map(E).find(x=>x&&/Constraint$/.test(x.metaclasse));
      addF(st,lls(f)); y+=14; Y[st]=y; y+=32; Y[fi]=y;
      states.push({id:f.id, st, fi, refId:f.id, name:`{ ${capUmlTexteContrainte(lec,c)||capUmlNom(f)} }`, k:'state'});
    }
  });
  parcours(el&&el.enfants||[]);
  const cov=f=>f.cov;
  const {X, hw, width}=capScColonnes(roles, msgs, states.map(s=>{ const f=frags[fIdx[s.st]]; return {r:f?rIdx[f.cov[0]]:undefined, name:s.name}; }));
  return {roles, X, hw, Y, frags, fIdx, cov, rIdx, msgs, execs, states, cfs, ius, bottom:y+40, width, top:96, head:24,
    garde:id=>gardes[id]||'', refLib:_L('Référence à l\'interaction'), bords:true, gardeApres:true};
}

/** Diagramme de séquence calculé d'une interaction (dessin des 🎬 Scénarios, 49), mis en cache.
 * @param {object} I - Interaction (`capUmlInteractions`) @returns {{svg:string, w:number, h:number}} SVG et dimensions */
function capUmlSeqSvg(I){
  const C=_capAnaCache.umlDg=_capAnaCache.umlDg||{};
  if(C[I.id]) return C[I.id];
  const D=I.lifelines.length?capScenarioSvg(I, capUmlSeqLayout(I)):null;
  return C[I.id]=D?{svg:D.svg, w:D.w, h:D.h}:null;
}

/* ── 2. 🚦 Machines à états → graphe en couches ─────────────────── */

/** Dimensions [largeur, hauteur] d'un pseudo-état dessiné. @param {string} g - Nature (`capUmlEtats`) @returns {number[]} */
function capUmlStmTaillePseudo(g){
  return {initial:[16,16], final:[22,22], choice:[26,26], junction:[12,12], fork:[8,46], join:[8,46], shallowHistory:[24,24], deepHistory:[24,24],
    entryPoint:[16,16], exitPoint:[16,16], terminate:[18,18]}[g]||[16,16];
}

/** Étiquette d'une transition en trois parties : déclencheur(s), garde, effet. @param {object} t - Transition (`capUmlEtats`)
 * @returns {{d:string, g:string, e:string, txt:string}} Parties et texte complet « déclencheur [garde] / effet » */
function capUmlStmEtiquette(t){
  const d=t.decl.length?t.decl.map(x=>x.lib).join(', '):(t.name||''), g=String(t.garde||'').replace(/^\s*\[(.*)\]\s*$/,'$1'), e=t.effet?t.effet.name:'';
  return {d, g, e, txt:[d, g?`[${g}]`:'', e?`/ ${e}`:''].filter(Boolean).join(' ')};
}

/** Lignes des comportements d'un état (« entry / x », « do / y », « exit / z »). @param {object} s - État @returns {string[]} */
function capUmlStmLignes(s){ return s.comps.map(c=>`${c.role||''} / ${c.name}`.trim()); }

/** Mise en page d'une machine à états : couches de gauche à droite dans chaque région (plus long chemin depuis les états
 * initiaux, cycles ouverts par un parcours en profondeur, ordre par barycentre), régions empilées dans leur état composite,
 * points d'entrée / de sortie sur le bord gauche / droit de leur état (ou du cadre de la machine).
 * @param {object} M - Machine (`capUmlEtats`) @returns {{boites:object, w:number, h:number, regions:object[], cadre:object}} Boîtes absolues {x,y,w,h,s} */
function capUmlStmLayout(M){
  const R=capUmlEtats(), S=R.etats, lec=capUmlLec(), E=id=>id?lec.element(id):null, tw=capScTextW;
  const PAD=18, VG=26, ENT=30;
  const regionsDe=id=>{ const e=E(id); return e?(e.enfants||[]).map(E).filter(x=>x&&x.metaclasse==='Region').map(x=>({id:x.id, name:x.nom&&!/^Region$/i.test(x.nom)?x.nom:''})):[]; };
  const dans={}, bord={};
  M.etats.forEach(s=>{ if(s.region) (dans[s.region]=dans[s.region]||[]).push(s); else (bord[s.parent||M.id]=bord[s.parent||M.id]||[]).push(s); });
  const taille={}, plan={};   // taille relative de chaque état ; plan des régions d'un état composite (ou de la machine)
  /** En-tête d'un conteneur (nom, comportements) : hauteur et largeur utiles. */
  const entete=(nom, lignes, cadre)=>({h:cadre?ENT:24+(lignes.length?lignes.length*14+6:0), w:Math.max(tw(nom,12.5)+(cadre?60:30), ...lignes.map(l=>tw(l,11)+24))});
  /** Taille d'un état (récursive pour un état composite). */
  const mesure=s=>{
    if(taille[s.id]) return taille[s.id];
    if(s.pseudo||s.genre==='final'||s.genre==='reference'){ const [w,h]=capUmlStmTaillePseudo(s.genre); return taille[s.id]={w,h}; }
    const L=capUmlStmLignes(s);
    if(s.genre!=='composite') return taille[s.id]={w:Math.max(84, tw(s.name,12.5)+28, ...L.map(l=>tw(l,11)+22)), h:34+(L.length?L.length*14+6:0)};
    const hd=entete(s.name, L, false), P=contenu(s.id, hd);
    return taille[s.id]={w:P.w, h:P.h};
  };
  /** Régions d'un conteneur, empilées sous son en-tête, à la même largeur. */
  const contenu=(id, hd)=>{
    const regs=regionsDe(id).map(r=>({...r, lay:region(r.id, !!r.name)}));
    const W=Math.max(hd.w, 120, ...regs.map(r=>r.lay.w)); let yy=hd.h;
    regs.forEach(r=>{ r.x=0; r.y=yy; r.w=W; r.h=r.lay.h; yy+=r.h; });
    return plan[id]={regs, hd, w:W, h:Math.max(yy, hd.h+40)};
  };
  /** Mise en couches d'une région : positions relatives des états qu'elle contient. */
  const region=(rid, titre)=>{
    const N=dans[rid]||[]; if(!N.length) return {pos:{}, w:120, h:46};
    const ids=N.map(s=>s.id), set=new Set(ids);
    const haut=id=>{ for(let x=S[id], k=0; x&&k<80; x=S[x.parent], k++) if(set.has(x.id)) return x.id; return null; };
    const succ={}, pred={}, entrants=new Set(), lab={};
    ids.forEach(i=>{ succ[i]=[]; pred[i]=[]; mesure(S[i]); });
    M.transitions.forEach(t=>{ const a=haut(t.src), b=haut(t.tgt);
      if(a&&b&&a!==b){ succ[a].push(b); pred[b].push(a); lab[a+'>'+b]=Math.max(lab[a+'>'+b]||0, tw(capUmlStmEtiquette(t).txt.slice(0,46),11)); }
      else if(!a&&b) entrants.add(b); });
    // Parcours en profondeur : états initiaux, puis états atteints de l'extérieur, puis les autres ; arcs retour écartés
    const ordre=[...ids.filter(i=>S[i].genre==='initial'), ...ids.filter(i=>entrants.has(i)), ...ids];
    const etat={}, fini=[], retour=new Set(), vu=[];
    const dfs=i=>{ etat[i]=1; vu.push(i); succ[i].forEach(j=>{ if(etat[j]===1) retour.add(i+'>'+j); else if(!etat[j]) dfs(j); }); etat[i]=2; fini.push(i); };
    ordre.forEach(i=>{ if(!etat[i]) dfs(i); });
    const couche={}; fini.slice().reverse().forEach(i=>{ couche[i]=Math.max(0, ...pred[i].filter(p=>!retour.has(p+'>'+i)).map(p=>(couche[p]??0)+1)); });
    const nmax=Math.max(0, ...Object.values(couche));
    ids.forEach(i=>{ if((S[i].genre==='final'||S[i].genre==='terminate')&&pred[i].length) couche[i]=Math.max(couche[i], nmax); });
    const cols=[]; vu.forEach(i=>{ (cols[couche[i]]=cols[couche[i]]||[]).push(i); });
    for(let k=0; k<cols.length; k++) cols[k]=cols[k]||[];
    // Ordre dans chaque couche : barycentre des voisins (quatre passes, alternées)
    const rang={}; const pose=()=>cols.forEach(c=>c.forEach((i,k)=>{ rang[i]=k; }));
    pose();
    for(let p=0; p<4; p++){
      const seq=p%2?cols.slice().reverse():cols;
      seq.forEach(c=>{ const b={}; c.forEach(i=>{ const v=[...succ[i],...pred[i]].filter(j=>couche[j]!==couche[i]).map(j=>rang[j]); b[i]=v.length?v.reduce((s,x)=>s+x,0)/v.length:rang[i]; });
        c.sort((x,z)=>b[x]-b[z]||rang[x]-rang[z]); c.forEach((i,k)=>{ rang[i]=k; }); });
    }
    // Coordonnées : colonnes séparées selon la longueur des étiquettes, états centrés dans leur colonne
    const cw=cols.map(c=>Math.max(0, ...c.map(i=>taille[i].w)));
    const gap=cols.map((c,k)=>{ let m=0; c.forEach(i=>succ[i].forEach(j=>{ if(couche[j]===k+1||couche[j]>k&&!retour.has(i+'>'+j)) m=Math.max(m, lab[i+'>'+j]||0); })); return Math.max(56, Math.min(260, m+36)); });
    const ch=cols.map(c=>c.reduce((s,i)=>s+taille[i].h,0)+Math.max(0,c.length-1)*VG), H=Math.max(...ch);
    const top=PAD+(titre?16:0)+(retour.size?10:0), pos={}; let x=PAD;
    cols.forEach((c,k)=>{ let yy=top+(H-ch[k])/2; c.forEach(i=>{ const t=taille[i]; pos[i]={x:x+(cw[k]-t.w)/2, y:yy}; yy+=t.h+VG; }); x+=cw[k]+(k<cols.length-1?gap[k]:0); });
    return {pos, w:x+PAD, h:top+H+PAD+(retour.size?14:0)};
  };
  const lignesM=[], hdM=entete(`stm ${M.name}`, lignesM, true), P=contenu(M.id, hdM);
  // Positions absolues (le cadre de la machine en 0, 0 après une marge)
  const boites={}, regions=[], MARGE=24;
  const place=(id, x0, y0, w, h)=>{
    const pl=plan[id]; if(!pl) return;
    pl.regs.forEach((r,k)=>{ regions.push({id:r.id, name:r.name, x:x0+r.x, y:y0+r.y, w:r.w, h:r.h, sep:k>0, haut:pl.regs.length>1});
      Object.entries(r.lay.pos).forEach(([i,p])=>{ const t=taille[i], s=S[i]; boites[i]={x:x0+r.x+p.x, y:y0+r.y+p.y, w:t.w, h:t.h, s}; if(s.genre==='composite') place(i, boites[i].x, boites[i].y, t.w, t.h); }); });
    // Points de connexion sur le bord : entrées à gauche, sorties à droite
    const b=bord[id]||[], gauche=b.filter(s=>s.genre!=='exitPoint'), droite=b.filter(s=>s.genre==='exitPoint');
    [[gauche,x0],[droite,x0+w]].forEach(([L,xb])=>L.forEach((s,k)=>{ const t=mesure(s), yb=y0+pl.hd.h+(k+1)*(h-pl.hd.h)/(L.length+1); boites[s.id]={x:xb-t.w/2, y:yb-t.h/2, w:t.w, h:t.h, s}; }));
  };
  const cadre={x:MARGE, y:MARGE, w:P.w, h:P.h};
  place(M.id, cadre.x, cadre.y, cadre.w, cadre.h);
  return {boites, regions, cadre, w:cadre.w+2*MARGE+60, h:cadre.h+2*MARGE};
}

/** Point du bord d'une boîte sur la demi-droite qui va de son centre vers un point (cercle pour les pseudo-états ronds).
 * @param {object} b - Boîte {x,y,w,h,s} @param {{x:number,y:number}} p - Point visé @returns {{x:number,y:number}} */
function capUmlStmBord(b, p){
  const cx=b.x+b.w/2, cy=b.y+b.h/2, dx=p.x-cx, dy=p.y-cy, n=Math.hypot(dx,dy)||1;
  if(b.s.pseudo&&!/^(fork|join)$/.test(b.s.genre)||b.s.genre==='final'){ const r=Math.min(b.w,b.h)/2+(b.s.genre==='choice'?2:0); return {x:cx+dx/n*r, y:cy+dy/n*r}; }
  const k=Math.min(dx?(b.w/2)/Math.abs(dx):1e9, dy?(b.h/2)/Math.abs(dy):1e9);
  return {x:cx+dx*k, y:cy+dy*k};
}

/** Diagramme calculé d'une machine à états (SVG autonome, fond blanc), mis en cache : cadre « stm », états composites et
 * régions, états, pseudo-états, transitions « déclencheur [garde] / effet » ; clic sur un élément → panneau de détail.
 * @param {object} M - Machine (`capUmlEtats`) @returns {?{svg:string, w:number, h:number}} SVG et dimensions */
function capUmlStmSvg(M){
  const C=_capAnaCache.umlDg=_capAnaCache.umlDg||{};
  if(C[M.id]) return C[M.id];
  if(!M.etats.length) return C[M.id]=null;
  const L=capUmlStmLayout(M), B=L.boites, K=CAP_UML_STM_COL, e=capEsc, tw=capScTextW, R=capUmlEtats();
  const ref=(id, inner, tip)=>`<g class="sc-ref" data-ref="${e(id)}" style="cursor:pointer"><title>${e(tip)}</title>${inner}</g>`;
  const court=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
  const ko=s=>!s.pseudo&&s.genre!=='final'&&!s.atteint&&!M.sansInitial;
  const tip=s=>`${s.name} — ${capUmlGenreEtat(s.genre)}${ko(s)?_L(' — inatteignable depuis l\'état initial'):''}${_L(' (clic : détail)')}`;
  let fond='', noeuds='', traits='', etiq='', bmax=0;
  const F={...L.cadre}, tab=`stm ${M.name}`, tl=tw(tab,12.5)+22;
  const cadre=()=>ref(M.id, `<rect x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" fill="#fff" stroke="${K.cadre}" stroke-width="1.3"/>
    <path d="M${F.x},${F.y} H${F.x+tl} V${F.y+14} L${F.x+tl-8},${F.y+22} H${F.x} Z" fill="#f2f2f2" stroke="${K.cadre}"/>
    <text x="${F.x+7}" y="${F.y+15}" font-size="12.5" fill="${K.texte}"><tspan font-weight="700">stm</tspan> ${e(M.name)}</text>`,
    `${M.name}${M.ctx?_L(` — comportement de ${M.ctx.name}`):''}${_L(' (clic : détail)')}`);
  // États composites (du plus englobant au plus imbriqué), puis régions (séparateurs, noms)
  const prof=s=>{ let n=0; for(let p=R.etats[s.parent]; p&&n<80; p=R.etats[p.parent]) n++; return n; };
  Object.values(B).filter(b=>b.s.genre==='composite').sort((a,b)=>prof(a.s)-prof(b.s)).forEach(b=>{ const s=b.s, Lg=capUmlStmLignes(s), hh=24+(Lg.length?Lg.length*14+6:0);
    fond+=ref(s.id, `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="${K.comp.f}" stroke="${ko(s)?K.ko:K.comp.s}" stroke-width="1.4"${ko(s)?' stroke-dasharray="6,4"':''}/>
      <path d="M${b.x},${b.y+hh} V${b.y+12} Q${b.x},${b.y} ${b.x+12},${b.y} H${b.x+b.w-12} Q${b.x+b.w},${b.y} ${b.x+b.w},${b.y+12} V${b.y+hh} Z" fill="${K.comp.h}" stroke="none"/>
      <line x1="${b.x}" y1="${b.y+hh}" x2="${b.x+b.w}" y2="${b.y+hh}" stroke="${K.comp.s}"/>
      <text x="${b.x+b.w/2}" y="${b.y+17}" font-size="12.5" font-weight="700" text-anchor="middle" fill="${K.texte}">${e(court(s.name,60))}</text>
      ${Lg.map((l,k)=>`<text x="${b.x+10}" y="${b.y+36+k*14}" font-size="11" fill="${K.effet}">${e(court(l,60))}</text>`).join('')}`, tip(s));
  });
  L.regions.forEach(r=>{
    if(r.sep) fond+=`<line x1="${r.x}" y1="${r.y}" x2="${r.x+r.w}" y2="${r.y}" stroke="${K.comp.s}" stroke-dasharray="7,5"/>`;
    if(r.name) fond+=`<text x="${r.x+8}" y="${r.y+14}" font-size="10.5" font-style="italic" fill="#555">${e(court(r.name,40))}</text>`;
  });
  // États simples et pseudo-états
  Object.values(B).filter(b=>b.s.genre!=='composite').forEach(b=>{ const s=b.s, cx=b.x+b.w/2, cy=b.y+b.h/2, g=s.genre;
    let inner='';
    if(g==='simple'){ const Lg=capUmlStmLignes(s);
      inner=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${K.etat.f}" stroke="${ko(s)?K.ko:K.etat.s}" stroke-width="1.4"${ko(s)?' stroke-dasharray="6,4"':''}/>
        <text x="${cx}" y="${b.y+21}" font-size="12.5" text-anchor="middle" fill="${K.texte}">${e(court(s.name,60))}</text>
        ${Lg.length?`<line x1="${b.x}" y1="${b.y+30}" x2="${b.x+b.w}" y2="${b.y+30}" stroke="${K.etat.s}" stroke-opacity=".6"/>`:''}
        ${Lg.map((l,k)=>`<text x="${b.x+9}" y="${b.y+45+k*14}" font-size="11" fill="${K.effet}">${e(court(l,60))}</text>`).join('')}`;
    }
    else if(g==='initial') inner=`<circle cx="${cx}" cy="${cy}" r="8" fill="#111"/>`;
    else if(g==='final') inner=`<circle cx="${cx}" cy="${cy}" r="11" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="6.5" fill="#111"/>`;
    else if(g==='choice') inner=`<path d="M${cx},${b.y} L${b.x+b.w},${cy} L${cx},${b.y+b.h} L${b.x},${cy} Z" fill="#fff" stroke="#111" stroke-width="1.4"/>`;
    else if(g==='junction') inner=`<circle cx="${cx}" cy="${cy}" r="6" fill="#111"/>`;
    else if(g==='fork'||g==='join') inner=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="#111"/>`;
    else if(/History$/.test(g)) inner=`<circle cx="${cx}" cy="${cy}" r="12" fill="#fff" stroke="#111" stroke-width="1.4"/><text x="${cx}" y="${cy+4.5}" font-size="12" font-weight="700" text-anchor="middle" fill="#111">${g==='deepHistory'?'H*':'H'}</text>`;
    else if(g==='exitPoint') inner=`<circle cx="${cx}" cy="${cy}" r="8" fill="#fff" stroke="#111" stroke-width="1.4"/><path d="M${cx-5},${cy-5} L${cx+5},${cy+5} M${cx-5},${cy+5} L${cx+5},${cy-5}" stroke="#111" stroke-width="1.4"/>`;
    else if(g==='terminate') inner=`<path d="M${b.x},${b.y} L${b.x+b.w},${b.y+b.h} M${b.x},${b.y+b.h} L${b.x+b.w},${b.y}" stroke="#111" stroke-width="2.2"/><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="transparent"/>`;
    else inner=`<circle cx="${cx}" cy="${cy}" r="8" fill="#fff" stroke="#111" stroke-width="1.4"/>`;   // point d'entrée, référence de point de connexion
    if(s.pseudo&&s.nomme&&g!=='initial'&&!(/History$/.test(g)&&/^H\*?$/.test(s.name))) inner+=`<text x="${cx}" y="${g==='entryPoint'||g==='exitPoint'?b.y-5:b.y+b.h+13}" font-size="10.5" text-anchor="middle" fill="#444" class="sc-lab">${e(court(s.name,30))}</text>`;
    noeuds+=ref(s.id, inner, tip(s));
  });
  // Transitions : courbes écartées quand plusieurs relient les mêmes états ou quand elles reviennent vers la gauche
  const paire={}; R.transitions.filter(t=>t.machine===M.id&&B[t.src]&&B[t.tgt]&&t.src!==t.tgt).forEach(t=>{ const k=[t.src,t.tgt].sort().join('|'); (paire[k]=paire[k]||[]).push(t); });
  const ctr=b=>({x:b.x+b.w/2, y:b.y+b.h/2}), contient=(P,Q)=>Q.x>=P.x-0.5&&Q.y>=P.y-0.5&&Q.x+Q.w<=P.x+P.w+0.5&&Q.y+Q.h<=P.y+P.h+0.5;
  const texte=(et, x, y, ancre)=>{ const p=[];
    if(et.d) p.push(`<tspan fill="${K.texte}">${e(court(et.d,30))}</tspan>`);
    if(et.g) p.push(`<tspan fill="${K.garde}">[${e(court(et.g,30))}]</tspan>`);
    if(et.e) p.push(`<tspan fill="${K.effet}">/ ${e(court(et.e,26))}</tspan>`);
    return p.length?`<text x="${x}" y="${y}" font-size="11" text-anchor="${ancre}" class="sc-lab">${p.join(' ')}</text>`:''; };
  // Contournement par le bas d'une transition dont le tracé direct traverse un autre état (arcs retour longs surtout)
  const toutes=Object.values(B), bas=[];
  const gene=(A,Z,p1,p2)=>toutes.some(o=>o!==A&&o!==Z&&!contient(o,A)&&!contient(o,Z)&&[...Array(19)].some((_,i)=>{ const k=(i+1)/20, x=p1.x+(p2.x-p1.x)*k, y=p1.y+(p2.y-p1.y)*k;
    return x>o.x+2&&x<o.x+o.w-2&&y>o.y+2&&y<o.y+o.h-2; }));
  const contour=(A,Z)=>{ const xa=A.x+A.w/2, xz=Z.x+Z.w/2, x1=Math.min(xa,xz), x2=Math.max(xa,xz);
    let y=Math.max(A.y+A.h, Z.y+Z.h, ...toutes.filter(o=>o!==A&&o!==Z&&!contient(o,A)&&!contient(o,Z)&&o.x<x2&&o.x+o.w>x1).map(o=>o.y+o.h))+18;
    while(bas.some(r=>Math.abs(r.y-y)<12&&r.x1<x2&&r.x2>x1)) y+=14;
    bas.push({y, x1, x2}); return {xa, xz, y}; };
  M.transitions.forEach(t=>{
    const A=B[t.src], Z=B[t.tgt]; if(!A||!Z) return;
    const et=capUmlStmEtiquette(t), tp=`${A.s.name} → ${Z.s.name}${et.txt?' : '+et.txt:''}${_L(' (clic : détail)')}`;
    if(t.src===t.tgt){   // boucle sur l'état
      const x=A.x+A.w, y=A.y;
      traits+=ref(t.id, `<path d="M${x-22},${y} C${x-14},${y-36} ${x+30},${y-14} ${x},${y+12}" fill="none" stroke="${K.trait}" stroke-width="1.3" marker-end="url(#ustm-fl)"/>`, tp);
      etiq+=ref(t.id, texte(et, x+6, y-22, 'start'), tp); return;
    }
    let p1, p2, q=null, lp;
    if(contient(Z,A)){ const c=ctr(A); p1={x:A.x+A.w, y:c.y}; p2={x:Z.x+Z.w, y:c.y}; }          // vers l'état qui l'englobe
    else if(contient(A,Z)){ const c=ctr(Z); p1={x:A.x, y:c.y}; p2={x:Z.x, y:c.y}; }             // vers un état qu'il englobe
    else {
      const c1=ctr(A), c2=ctr(Z), G=paire[[t.src,t.tgt].sort().join('|')]||[t], dx=c2.x-c1.x, dy=c2.y-c1.y, n=Math.hypot(dx,dy)||1;
      const memeSens=G.filter(o=>o.src===t.src), mixte=memeSens.length!==G.length, k=memeSens.indexOf(t);
      let off=mixte?22+26*k:(k-(memeSens.length-1)/2)*28;
      if(G.length===1&&dx<-4) off=40;   // retour vers la gauche : courbe au-dessus
      if(off){ q={x:(c1.x+c2.x)/2-dy/n*off*2, y:(c1.y+c2.y)/2+dx/n*off*2}; p1=capUmlStmBord(A,q); p2=capUmlStmBord(Z,q); }
      else { p1=capUmlStmBord(A,c2); p2=capUmlStmBord(Z,c1); }
    }
    let d=q?`M${p1.x},${p1.y} Q${q.x},${q.y} ${p2.x},${p2.y}`:`M${p1.x},${p1.y} L${p2.x},${p2.y}`;
    lp=q?{x:p1.x/4+q.x/2+p2.x/4, y:p1.y/4+q.y/2+p2.y/4}:{x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
    let horiz=Math.abs(p2.x-p1.x)>=Math.abs(p2.y-p1.y);
    if(!contient(Z,A)&&!contient(A,Z)&&(q?gene(A,Z,p1,lp)||gene(A,Z,lp,p2):gene(A,Z,p1,p2))){   // tracé orthogonal sous les états qui gênent
      const c=contour(A,Z);
      /** Branche verticale d'une extrémité : par le bas de l'état, ou par son côté droit si un autre état est dessous. */
      const branche=(X, x)=>{ const bloque=toutes.some(o=>o!==X&&o!==A&&o!==Z&&!contient(o,X)&&o.x<x+3&&o.x+o.w>x-3&&o.y>=X.y+X.h-1&&o.y<c.y);
        return bloque?[{x:X.x+X.w, y:X.y+X.h/2}, {x:X.x+X.w+12, y:X.y+X.h/2}, {x:X.x+X.w+12, y:c.y}]:[{x, y:X.y+X.h}, {x, y:c.y}]; };
      const pts=[...branche(A, c.xa), ...branche(Z, c.xz).reverse()];
      d='M'+pts.map(o=>`${o.x},${o.y}`).join(' L');
      lp={x:(pts[Math.floor(pts.length/2)-1].x+pts[Math.floor(pts.length/2)].x)/2, y:c.y}; horiz=true; bmax=Math.max(bmax, c.y);
    }
    traits+=ref(t.id, `<path d="${d}" fill="none" stroke="${K.trait}" stroke-width="1.3" marker-end="url(#ustm-fl)"/><path d="${d}" fill="none" stroke="transparent" stroke-width="9"/>`, tp);
    etiq+=ref(t.id, horiz||q?texte(et, lp.x, lp.y-5, 'middle'):texte(et, lp.x+7, lp.y+4, 'start'), tp);
  });
  // Cadre de la machine (agrandi si un contournement passe sous les régions), dessiné sous le reste
  F.h=Math.max(F.h, bmax+16-F.y); fond=cadre()+fond;
  const W=Math.ceil(L.w), H=Math.ceil(Math.max(L.h, F.y+F.h+24));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif" style="display:block;background:#fff">
    <defs><marker id="ustm-fl" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1,1 L9.5,5 L1,9" fill="none" stroke="${K.trait}" stroke-width="1.5"/></marker>
      <style>.sc-lab{paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}</style></defs>
    <rect width="${W}" height="${H}" fill="#fff"/>${fond}${traits}${noeuds}${etiq}</svg>`;
  return C[M.id]={svg, w:W, h:H};
}

/* ── 3. Commun : zoom, export, écouteurs ─────────────────────────── */

/** Commandes de zoom et d'export de l'onglet « 🖼 Diagramme calculé ». @param {object} st - État de la vue (zoom) @returns {string} HTML */
function capUmlDgBarre(st){
  return `<span class="tb-grp" style="margin-left:auto"><button class="cap-lf-btn" data-udz="-1" title="${_L('Réduire')}">−</button><button class="cap-lf-btn" data-udz="0" title="${_L('Taille réelle')}">${Math.round((st.zoom||1)*100)} %</button>`+
    `<button class="cap-lf-btn" data-udz="1" title="${_L('Agrandir')}">+</button><button class="cap-lf-btn" data-udz="fit" title="${_L('Ajuster à la largeur de la vue')}">⤢</button></span>`+
    `<span class="tb-grp"><button class="phl-export-btn" data-ude="png">⬇ PNG</button><button class="phl-export-btn" data-ude="svg">⬇ SVG</button><button class="phl-export-btn" data-ude="clip" title="${_L('Copier l\'image dans le presse-papiers')}">📋 ${_L('Copier')}</button></span>`;
}

/** Corps de l'onglet « 🖼 Diagramme calculé » : rappel de l'élément, bouton 🔲 vers le diagramme de l'outil, dessin zoomé.
 * @param {?object} D - Dessin {svg, w, h} @param {object} st - État (zoom) @param {string} tete - En-tête HTML (élément) @returns {string} HTML */
function capUmlDgCorps(D, st, tete){
  if(!D) return `<p class="ana-help">${tete}</p><div class="phl-empty">${_L('Rien à dessiner : aucun état ni ligne de vie.')}</div>`;
  const z=st.zoom||1;
  return `<p class="ana-help">${tete} — ${_L('dessin recalculé à partir du modèle (mise en page automatique, indépendante des diagrammes du fichier) ; clic sur un élément : panneau de détail, glisser : déplacer.')}</p>`+
    `<div class="sc-scroll ud-scroll" data-fill="8" style="border:1px solid var(--c-border);border-radius:6px"><div class="sc-svg" style="width:${D.w*z}px">${D.svg.replace('<svg ',`<svg style="width:${D.w*z}px;height:${D.h*z}px" `)}</div></div>`;
}

/** Branche zoom, export, clics (panneau de détail ; référence d'interaction → `onRef`) et déplacement de l'onglet 🖼.
 * @param {HTMLElement} box - Conteneur de la vue @param {object} st - État (zoom) @param {?object} D - Dessin {svg, w, h}
 * @param {string} base - Nom des fichiers exportés @param {Function} rerender - Nouveau rendu de la vue @param {Function} [onRef] - Clic sur une référence (identifiant de l'interaction) */
function capUmlDgBind(box, st, D, base, rerender, onRef){
  box.querySelectorAll('[data-udz]').forEach(b=>b.onclick=()=>{ const v=b.dataset.udz, sc=box.querySelector('.ud-scroll');
    st.zoom=v==='fit'?(D&&sc?Math.max(0.2, Math.min(2, Math.floor((sc.clientWidth-24)/D.w*100)/100)):1):+v?Math.max(0.2, Math.min(3, Math.round((st.zoom||1)*(+v>0?1.2:1/1.2)*100)/100)):1;
    rerender(box); });
  box.querySelectorAll('[data-ude]').forEach(b=>b.onclick=()=>capUmlDgExport(b.dataset.ude, D, base));
  box.querySelectorAll('.sc-svg .sc-ref').forEach(g=>g.addEventListener('click',()=>{ if(g.dataset.ref) capOpenDetailById(g.dataset.ref); }));
  box.querySelectorAll('.sc-svg .sc-iu').forEach(g=>g.addEventListener('click',()=>{ if(g.dataset.sc&&onRef) onRef(g.dataset.sc); }));
  const sc=box.querySelector('.ud-scroll'); if(sc){ capFillHeight(box); capScPan(sc); }
}

/** Exporte un diagramme calculé : 'svg', 'png' ou 'clip' (PNG dans le presse-papiers).
 * @param {string} fmt - Format @param {?object} D - Dessin {svg, w, h} @param {string} base - Nom du fichier (sans extension) */
function capUmlDgExport(fmt, D, base){
  if(!D) return;
  const nom=String(base||'diagramme').replace(/[^\w\-]+/g,'_').slice(0,80);
  if(fmt==='svg'){ capDownloadBlob(new Blob([D.svg],{type:'image/svg+xml'}), nom+'.svg'); return; }
  capSvgToCanvas(D.svg, D.w, D.h, 2).then(c=>capCanvasBlob(c,'image/png')).then(b=>{
    if(fmt==='png') capDownloadBlob(b, nom+'.png');
    else if(navigator.clipboard&&window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(()=>capToast(_L('✔ Diagramme copié')),()=>capAlert(_L('Copie impossible dans ce navigateur.')));
    else capAlert(_L('Copie d\'image non disponible dans ce navigateur.'));
  }).catch(err=>capAlert(_L('Export impossible : ')+err.message,{level:'err'}));
}

/* ── 4. Aperçu dépliable dans les listes 📋 Machines / 📋 Interactions ── */

/** Hauteur maximale d'un aperçu (px) : au-delà, l'aperçu défile et « 🖼 Ouvrir » donne le dessin complet avec zoom. */
const CAP_UML_APERCU_H=420;

/** Bouton ▸ / ▾ d'aperçu placé devant le nom d'une ligne de liste. @param {string} id - Machine ou interaction @param {boolean} ouvert - Aperçu affiché @returns {string} HTML */
function capUmlApercuTog(id, ouvert){
  return `<span class="ud-ap-tog" data-apercu="${capEsc(id)}">${ouvert?'▾':'▸'}</span>`;
}

/**
 * Aperçus dépliables d'une liste (📋 Machines de 🚦, 📋 Interactions de 🎬) : ▸ devant une ligne insère sous elle le diagramme calculé,
 * ajusté pour tenir en largeur et en hauteur (`CAP_UML_APERCU_H`) sans jamais être agrandi, réduit au plus à 40 % pour rester lisible
 * (défilement au-delà) ; le dessin n'est calculé qu'à l'ouverture. Aperçus ouverts gardés dans `st.apercus` (rétablis après un nouveau
 * rendu) ; un clic sur la ligne (hors liens et boutons) ouvre ou ferme l'aperçu ; clic sur un élément du dessin : panneau de détail ;
 * « 🖼 Ouvrir » : onglet 🖼 Diagramme calculé.
 * @param {HTMLElement} box - Conteneur de la vue
 * @param {object} st - État de la vue (`apercus` : Set des identifiants ouverts)
 * @param {function(string):?{svg:string,w:number,h:number}} dessin - Dessin calculé d'un élément (`capUmlStmSvg` / `capUmlSeqSvg`)
 * @param {function(string):void} ouvrir - Ouvre l'onglet 🖼 de l'élément
 */
function capUmlApercuBind(box, st, dessin, ouvrir){
  st.apercus=st.apercus||new Set();
  const esc=capEsc;
  const poser=tog=>{
    const id=tog.dataset.apercu, tr=tog.closest('tr'); if(!tr) return;
    const n=tr.children.length, D=dessin(id), dispo=Math.max(240, (tr.closest('table')||box).parentElement.clientWidth-40);   // place mesurée avant l'insertion (le dessin élargirait le tableau)
    const ap=document.createElement('tr'); ap.className='ud-ap-tr'; ap.dataset.apercuDe=id;
    if(!D){ ap.innerHTML=`<td colspan="${n}"><div class="ana-dim" style="padding:6px">${_L('Rien à dessiner : aucun état ni ligne de vie.')}</div></td>`; tr.after(ap); return; }
    ap.innerHTML=`<td colspan="${n}"><div class="ud-apercu-tete"><span class="ana-dim">${_L(`Diagramme calculé · ${Math.round(D.w)} × ${Math.round(D.h)} px`)}</span><span class="ud-ap-z ana-dim"></span><span style="flex:1"></span>`+
      `<button class="cap-lf-btn" data-apouvrir="${esc(id)}" title="${_L('Ouvrir dans l\'onglet 🖼 Diagramme calculé : zoom, déplacement, exports')}">${_L('🖼 Ouvrir')}</button></div>`+
      `<div class="ud-apercu" style="max-height:${CAP_UML_APERCU_H}px;max-width:${dispo}px"><div class="sc-svg">${D.svg.replace('<svg ','<svg style="width:0;height:0" ')}</div></div></td>`;
    tr.after(ap); ap.addEventListener('mousedown', e=>e.stopPropagation());   // pas de sélection de cellules (52) dans l'aperçu
    const zone=ap.querySelector('.ud-apercu'), svg=zone.querySelector('svg');
    const z=Math.max(0.4, Math.min(1, (dispo-16)/D.w, (CAP_UML_APERCU_H-14)/D.h));   // tient dans la largeur et la hauteur de l'aperçu, jamais agrandi, lisible au moins à 40 %
    svg.style.width=Math.round(D.w*z)+'px'; svg.style.height=Math.round(D.h*z)+'px';
    ap.querySelector('.ud-ap-z').textContent=` · ${Math.round(z*100)} %`+(D.h*z>CAP_UML_APERCU_H-14||D.w*z>dispo-16?_L(' · grand diagramme : faites défiler, ou 🖼 Ouvrir'):'');
    ap.querySelectorAll('.sc-ref').forEach(g=>g.addEventListener('click',()=>{ if(g.dataset.ref) capOpenDetailById(g.dataset.ref); }));
    ap.querySelector('[data-apouvrir]').onclick=()=>ouvrir(id);
  };
  box.querySelectorAll('[data-apercu]').forEach(tog=>{
    if(st.apercus.has(tog.dataset.apercu)) poser(tog);
    const basculer=()=>{
      const id=tog.dataset.apercu, tr=tog.closest('tr'), ex=tr&&tr.nextElementSibling&&tr.nextElementSibling.dataset.apercuDe===id?tr.nextElementSibling:null;
      if(ex){ ex.remove(); st.apercus.delete(id); tog.textContent='▸'; }
      else { st.apercus.add(id); tog.textContent='▾'; poser(tog); }
    };
    const tr=tog.closest('tr'); if(!tr) return;
    tr.classList.add('ud-ap-ligne'); tr.title=_L('Clic : afficher / masquer le diagramme calculé');
    tr.addEventListener('click', ev=>{ if(ev.target.closest('button,a,input,select,.cex-det,.fex-go,.cap-fold-btn,.cap-fold-more')) return; basculer(); });   // clic sur la ligne (hors liens et boutons)
  });
}
