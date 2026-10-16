/* ═══════════════════════════════════════════════════════════════════
   SysML v2 — VUES (menu ◇ SysML v2) : General View, Interconnection View, Action Flow View, State Transition View
   (vues standard de StandardViewDefinitions, notation graphique §8.2.3), 📑 Exigences, ▦ Grid View, ✔ Contrôles,
   🧾 Texte source ; section SysML du panneau de détail ; indicateurs du 📐 Tableau de bord.
═══════════════════════════════════════════════════════════════════ */

/** Sous-vue affichée du menu ◇ SysML v2 (gv, iv, afv, stv, req, grid, chk, src). */
var capSySub='gv';
/** Réglages des sous-vues (portée, élément racine, filtres), conservés d'un rendu à l'autre. */
var _capSyV={gv:{scope:'', deep:false, inh:false, comp:true}, iv:{root:'', depth:2}, afv:{root:''}, stv:{root:''}, req:{q:'', f:'all'},
  grid:{rel:'', tr:false}, chk:{sev:'all', code:'', q:'', info:true}, src:{file:'', line:0}};

/** Rend la vue ◇ SysML v2 : onglets des sous-vues puis la sous-vue choisie. */
function capSyRenderView(){
  const box=document.getElementById('cap-view-sysml'); if(!box) return;
  if(!_capSy){ box.innerHTML=_L('<div class="ana-dim" style="padding:40px;text-align:center">Chargez un modèle SysML v2 (.sysml, .kpar ou dossier du projet).</div>'); return; }
  const items=CAP_NAV_ITEMS.filter(i=>i.g==='sysml');
  if(!items.some(i=>i.k==='sy:'+capSySub)) capSySub='gv';
  box.innerHTML=`<div class="phl-toggle-bar sy-tabs"><span class="tb-grp">${items.map(i=>`<button class="phl-toggle-btn${i.k==='sy:'+capSySub?' active':''}" data-sy="${i.k}" title="${capEsc(i.t||'')}">${i.l}</button>`).join('')}</span></div><div class="sy-body" id="sy-body"></div>`;
  box.querySelectorAll('[data-sy]').forEach(b=>b.onclick=()=>capNavOpen(b.dataset.sy));
  const body=box.querySelector('#sy-body');
  const R={gv:capSyRenderGV, iv:capSyRenderIV, afv:capSyRenderAFV, stv:capSyRenderSTV, req:capSyRenderReq, grid:capSyRenderGrid, chk:capSyRenderChk, src:capSyRenderSrc}[capSySub];
  try{ R(body); }catch(e){ console.error(e); body.innerHTML=`<div class="ana-dim" style="padding:20px;color:var(--c-err,#f85149)">${capEsc(_L('Erreur de rendu : ')+e.message)}</div>`; }
  capNavSync();
}

/** Ouvre une sous-vue SysML centrée sur un élément (depuis le panneau de détail).
 * @param {string} sub - Sous-vue (gv, iv, afv, stv, src) @param {string} id - Identifiant de l'élément */
function capSyOpenOn(sub, id){
  const el=_capSy&&_capSy.byId.get(id); if(!el) return;
  if(sub==='gv') _capSyV.gv.scope=id;
  else if(sub==='src'){ _capSyV.src.file=el.file; _capSyV.src.line=el.line; }
  else _capSyV[sub].root=id;
  capNavOpen('sy:'+sub);
}

/* ── Outils communs ─────────────────────────────────────────────────────────────────────────────── */

/** Éléments du modèle SysML affiché vérifiant un prédicat. @param {function(object):boolean} f @returns {object[]} */
function capSyEls(f){ return _capSy?_capSy.M.all.filter(e=>!e.isFileRoot&&f(e)):[]; }
/** Nom affiché d'un élément (nom, sinon mot-clé). @param {object} el @returns {string} */
function capSyName(el){ return el?(el.name||(el.shortName?'<'+el.shortName+'>':'')||el.keyword||el.kind):''; }
/** Lien cliquable vers le détail d'un élément SysML. @param {object} el @param {string} [txt] @returns {string} HTML */
function capSyLink(el, txt){ return el&&el._id?capDetLink(el._id, txt||capSyName(el), 'color:var(--c-accent)'):capEsc(txt||''); }

/** Largeur d'un texte à la police des diagrammes (mesure par canvas, mémoïsée). @param {string} s @param {number} [fs] - Taille @param {boolean} [b] - Gras @returns {number} */
function capSyTextW(s, fs, b){
  const c=capSyTextW._c||(capSyTextW._c=document.createElement('canvas').getContext('2d'));
  c.font=(b?'700 ':'')+(fs||11)+'px Segoe UI, Arial, sans-serif';
  return c.measureText(String(s||'')).width;
}
/** Tronque un texte pour une ligne de diagramme. @param {string} s @param {number} [n] @returns {string} */
function capSyCut(s, n){ s=String(s||''); n=n||52; return s.length>n?s.slice(0,n-1)+'…':s; }

/** Sélecteur d'élément (liste groupée par métaclasse) : renvoie le HTML d'un <select>.
 * @param {string} id - Identifiant du <select> @param {object[]} list - Candidats @param {string} cur - Identifiant courant
 * @param {string} [first] - Libellé d'une première option vide @returns {string} HTML */
function capSySelect(id, list, cur, first){
  const by={}; list.forEach(e=>{ (by[e.kind]=by[e.kind]||[]).push(e); });
  const opt=e=>`<option value="${e._id}"${e._id===cur?' selected':''}>${capEsc(capSyCut(capSyQualified(e)||capSyName(e),90))}</option>`;
  return `<select id="${id}" class="phl-filter-input sy-sel">${first!=null?`<option value="">${capEsc(first)}</option>`:''}${Object.keys(by).sort().map(k=>`<optgroup label="${capEsc(k)}">${by[k].sort((a,b)=>capSyQualified(a).localeCompare(capSyQualified(b))).map(opt).join('')}</optgroup>`).join('')}</select>`;
}

/** Membres « de structure » visibles d'un élément : possédés, puis hérités de ses types et généraux (préfixe ^),
 * les membres redéfinis localement n'étant pas répétés.
 * @param {object} el - Élément @param {boolean} [inh] - Inclure les membres hérités
 * @returns {{m:object, inh:boolean}[]} Membres */
function capSyMembersOf(el, inh){
  const own=el.members.filter(m=>m.kind!=='Documentation'&&m.kind!=='Import'&&m.kind!=='Comment');
  const out=own.map(m=>({m, inh:false}));
  if(!inh) return out;
  const names=new Set(own.map(m=>m.name).filter(Boolean)), seen=new Set([el]);
  const walk=x=>{ capSyGenerals(_capSy.M, x).forEach(g=>{ if(seen.has(g)) return; seen.add(g);
    g.members.forEach(m=>{ if(m.kind==='Documentation'||m.kind==='Import'||m.kind==='Comment'||!m.name||names.has(m.name)) return; names.add(m.name); out.push({m, inh:true}); });
    walk(g); }); };
  walk(el);
  return out;
}

/** Compartiments d'une boîte (notation §8.2.3.6) : attributs, ports, parties, objets, actions, états, contraintes, doc.
 * @param {object} el - Élément @param {boolean} inh - Membres hérités (^) @returns {{t:string, lines:string[]}[]} */
function capSyCompartments(el, inh){
  const C=[['attributes',/^(AttributeUsage|EnumerationUsage)$/],['ports',/^PortUsage$/],['parts',/^PartUsage$/],['items',/^(ItemUsage|OccurrenceUsage|EventOccurrenceUsage)$/],
    ['references',/^ReferenceUsage$/],['actions',/^(ActionUsage|PerformActionUsage|AcceptActionUsage|SendActionUsage|CalculationUsage)$/],['states',/^(StateUsage|ExhibitStateUsage)$/],
    ['constraints',/^(ConstraintUsage|AssertConstraintUsage)$/],['requirements',/^(RequirementUsage|SatisfyRequirementUsage|ConcernUsage)$/],['interfaces',/^(InterfaceUsage|ConnectionUsage)$/]];
  const mem=capSyMembersOf(el, inh), out=[];
  C.forEach(([t,re])=>{
    const l=mem.filter(x=>re.test(x.m.kind)&&!(x.m.kind==='ReferenceUsage'&&x.m.role==='subject')).map(x=>(x.inh?'^':'')+capSyCut(capSyDeclText(x.m,true)||capSyName(x.m)));
    if(l.length) out.push({t, lines:l.length>8?l.slice(0,7).concat(_L(`… (${l.length-7} autres)`)):l});
  });
  const subj=el.members.find(m=>m.role==='subject'); if(subj) out.unshift({t:'subject', lines:[capSyCut(capSyDeclText(subj,true))]});
  if(el.exprs.length) out.push({t:'constraints', lines:el.exprs.slice(0,4).map(x=>capSyCut('{ '+x+' }'))});
  const doc=el.docs.filter(Boolean).join(' ').replace(/\s+/g,' ');
  if(doc) out.push({t:'doc', lines:[capSyCut(doc,60)].concat(doc.length>60?[capSyCut(doc.slice(59),60)]:[])});
  return out;
}

/** Calcule la taille d'une boîte de diagramme (en-tête « «mot-clé» nom : Type » et compartiments).
 * @param {object} n - Nœud {el, kw, title, comps} (complété : w, h) */
function capSySizeBox(n){
  let w=Math.max(capSyTextW('«'+n.kw+'»',10), capSyTextW(n.title,12,true));
  (n.comps||[]).forEach(c=>{ w=Math.max(w, capSyTextW(c.t,9.5)); c.lines.forEach(l=>w=Math.max(w, capSyTextW(l,10.5))); });
  n.w=Math.max(n.minW||110, Math.ceil(w)+22);
  n.h=36+(n.comps||[]).reduce((s,c)=>s+16+c.lines.length*14+4,0)+(n.comps&&n.comps.length?2:0);
  if(n.minH) n.h=Math.max(n.h, n.minH);
}

/** SVG d'une boîte de diagramme : rectangle à coins droits (définition) ou arrondis (usage), pointillé pour un usage
 * référence (ref), en-tête « «mot-clé» » et nom, compartiments titrés en italique.
 * @param {object} n - Nœud positionné {x,y,w,h,el,kw,title,comps,def,ref,color}
 * @returns {string} SVG */
function capSyBoxSvg(n){
  const c=n.color||'var(--c-accent)', E=capEsc;
  let s=`<g class="sy-node" data-id="${n.el&&n.el._id||''}" transform="translate(${n.x},${n.y})">`+
    `<rect width="${n.w}" height="${n.h}" rx="${n.def?0:9}" fill="var(--c-node-bg)" stroke="${c}" stroke-width="1.4"${n.ref?' stroke-dasharray="5,3"':''}/>`+
    `<text x="${n.w/2}" y="14" text-anchor="middle" font-size="10" fill="var(--c-text)" opacity=".8">«${E(n.kw)}»</text>`+
    `<text x="${n.w/2}" y="29" text-anchor="middle" font-size="12" font-weight="700" fill="var(--c-text)">${E(n.title)}</text>`;
  let y=36;
  (n.comps||[]).forEach(cp=>{
    s+=`<line x1="0" y1="${y}" x2="${n.w}" y2="${y}" stroke="${c}" stroke-opacity=".6"/>`+
      `<text x="${n.w/2}" y="${y+12}" text-anchor="middle" font-size="9.5" font-style="italic" fill="var(--c-text)" opacity=".7">${E(cp.t)}</text>`;
    y+=16;
    cp.lines.forEach(l=>{ y+=14; s+=`<text x="8" y="${y-3}" font-size="10.5" fill="var(--c-text)">${E(l)}</text>`; });
    y+=4;
  });
  return s+'</g>';
}

/** Définitions des marqueurs d'arêtes SysML v2 (§8.2.3, symboles bnf/images) : triangle creux (spécialisation),
 * triangle creux à deux points (typage), losange plein / creux (membre composite / référence), flèches ouverte et pleine.
 * @returns {string} <defs> */
function capSyMarkers(){
  const st='stroke="var(--c-text)" stroke-width="1.2"';
  return `<defs>
    <marker id="sy-m-tri" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="14" markerHeight="14" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L13,7 L1,13 Z" fill="var(--c-bg)" ${st}/></marker>
    <marker id="sy-m-typ" viewBox="0 0 20 14" refX="19" refY="7" markerWidth="20" markerHeight="14" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M7,1 L19,7 L7,13 Z" fill="var(--c-bg)" ${st}/><circle cx="2.5" cy="4.5" r="1.4" fill="var(--c-text)"/><circle cx="2.5" cy="9.5" r="1.4" fill="var(--c-text)"/></marker>
    <marker id="sy-m-red" viewBox="0 0 20 14" refX="19" refY="7" markerWidth="20" markerHeight="14" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M7,1 L19,7 L7,13 Z" fill="var(--c-bg)" ${st}/><path d="M3,1 L3,13" ${st}/></marker>
    <marker id="sy-m-dia" viewBox="0 0 20 12" refX="19" refY="6" markerWidth="20" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,6 L10,1 L19,6 L10,11 Z" fill="var(--c-text)" ${st}/></marker>
    <marker id="sy-m-hdia" viewBox="0 0 20 12" refX="19" refY="6" markerWidth="20" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,6 L10,1 L19,6 L10,11 Z" fill="var(--c-bg)" ${st}/></marker>
    <marker id="sy-m-open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L11,6 L1,11" fill="none" ${st}/></marker>
    <marker id="sy-m-fill" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L11,6 L1,11 Z" fill="var(--c-text)"/></marker>
  </defs>`;
}

/**
 * Mise en couches d'un graphe (inspirée de Sugiyama) : cycles rompus, rang = plus long chemin depuis les sources,
 * ordre dans chaque couche par barycentre (aller-retour), couches trop larges coupées en plusieurs rangées,
 * nœuds isolés regroupés en bas. Remplit x, y des nœuds.
 * @param {object[]} nodes - Nœuds {id, w, h}
 * @param {{from:string,to:string}[]} edges - Arêtes « from au-dessus de to »
 * @param {{gapX?:number, gapY?:number, maxW?:number, lr?:boolean}} [o] - Espacements, largeur maximale d'une rangée
 * @returns {{w:number, h:number, back:Set}} Taille du dessin ; arêtes inversées (cycles)
 */
function capSyLayout(nodes, edges, o){
  o=Object.assign({gapX:44, gapY:64, maxW:2200}, o||{});
  const N=new Map(nodes.map(n=>[n.id,n])), out=new Map(), inn=new Map();
  nodes.forEach(n=>{ out.set(n.id,[]); inn.set(n.id,[]); });
  const E=edges.filter(e=>N.has(e.from)&&N.has(e.to)&&e.from!==e.to);
  // Cycles : arêtes de retour d'un parcours en profondeur
  const state=new Map(), back=new Set();
  E.forEach((e,i)=>out.get(e.from).push({to:e.to,i}));
  const dfs=v=>{ state.set(v,1); for(const x of out.get(v)){ if(state.get(x.to)===1) back.add(x.i); else if(!state.get(x.to)) dfs(x.to); } state.set(v,2); };
  nodes.forEach(n=>{ if(!state.get(n.id)) dfs(n.id); });
  nodes.forEach(n=>{ out.set(n.id,[]); });
  E.forEach((e,i)=>{ const [a,b]=back.has(i)?[e.to,e.from]:[e.from,e.to]; out.get(a).push(b); inn.get(b).push(a); });
  // Rangs : plus long chemin
  const rank=new Map(), indeg=new Map(nodes.map(n=>[n.id,inn.get(n.id).length])), q=nodes.filter(n=>!indeg.get(n.id)).map(n=>n.id);
  q.forEach(v=>rank.set(v,0));
  while(q.length){ const v=q.shift(); out.get(v).forEach(w=>{ rank.set(w, Math.max(rank.get(w)||0, rank.get(v)+1)); indeg.set(w, indeg.get(w)-1); if(!indeg.get(w)) q.push(w); }); }
  const isolated=nodes.filter(n=>!out.get(n.id).length&&!inn.get(n.id).length);
  const layered=nodes.filter(n=>!isolated.includes(n));
  const R=[]; layered.forEach(n=>{ const r=rank.get(n.id)||0; (R[r]=R[r]||[]).push(n); });
  // Ordre par barycentre
  const pos=new Map(); R.forEach(l=>l&&l.forEach((n,i)=>pos.set(n.id,i)));
  for(let it=0; it<4; it++){
    const down=it%2===0, seq=down?R.map((_,i)=>i):R.map((_,i)=>R.length-1-i);
    seq.forEach(r=>{ const l=R[r]; if(!l) return;
      const bc=n=>{ const nb=down?inn.get(n.id):out.get(n.id); if(!nb.length) return pos.get(n.id); return nb.reduce((s,x)=>s+(pos.get(x)||0),0)/nb.length; };
      l.sort((a,b)=>bc(a)-bc(b)); l.forEach((n,i)=>pos.set(n.id,i)); });
  }
  // Rangées
  const rows=[]; R.forEach(l=>{ if(!l) return; let cur=[], w=0; l.forEach(n=>{ if(cur.length&&w+n.w>o.maxW){ rows.push(cur); cur=[]; w=0; } cur.push(n); w+=n.w+o.gapX; }); if(cur.length) rows.push(cur); });
  if(isolated.length){ let cur=[], w=0; isolated.forEach(n=>{ if(cur.length&&w+n.w>o.maxW){ rows.push(cur); cur=[]; w=0; } cur.push(n); w+=n.w+o.gapX; }); if(cur.length) rows.push(cur); }
  const rowW=rows.map(r=>r.reduce((s,n)=>s+n.w,0)+o.gapX*(r.length-1)), W=Math.max(200,...rowW);
  let y=20;
  rows.forEach((r,i)=>{ let x=20+(W-rowW[i])/2; const h=Math.max(...r.map(n=>n.h)); r.forEach(n=>{ n.x=x; n.y=y+(o.alignTop?0:(h-n.h)/2); x+=n.w+o.gapX; }); y+=h+o.gapY; });
  return {w:W+40, h:y-o.gapY+20, back};
}

/** Point de sortie du segment centre(a) → p sur le bord du rectangle a. @param {object} a - {x,y,w,h} @param {number} px @param {number} py @returns {number[]} [x,y] */
function capSyClip(a, px, py){
  const cx=a.x+a.w/2, cy=a.y+a.h/2, dx=px-cx, dy=py-cy;
  if(!dx&&!dy) return [cx,cy];
  const t=Math.min(Math.abs(dx)>1e-6?(a.w/2)/Math.abs(dx):Infinity, Math.abs(dy)>1e-6?(a.h/2)/Math.abs(dy):Infinity);
  return [cx+dx*t, cy+dy*t];
}

/** Tracé d'une arête entre deux boîtes : orthogonal (bas de la boîte haute → haut de la boîte basse) ou droit, rogné aux bords.
 * @param {object} a - Boîte source @param {object} b - Boîte cible @param {boolean} [straight] - Segment droit
 * @returns {{d:string, mx:number, my:number}} Chemin SVG et milieu (étiquette) */
function capSyEdgePath(a, b, straight){
  if(!straight&&Math.abs((a.y+a.h)-(b.y))>8&&(b.y>a.y+a.h||a.y>b.y+b.h)){
    const down=b.y>a.y; const x1=a.x+a.w/2, y1=down?a.y+a.h:a.y, x2=b.x+b.w/2, y2=down?b.y:b.y+b.h, my=(y1+y2)/2;
    return {d:`M${x1},${y1} V${my} H${x2} V${y2}`, mx:(x1+x2)/2, my};
  }
  const [x1,y1]=capSyClip(a, b.x+b.w/2, b.y+b.h/2), [x2,y2]=capSyClip(b, a.x+a.w/2, a.y+a.h/2);
  return {d:`M${x1},${y1} L${x2},${y2}`, mx:(x1+x2)/2, my:(y1+y2)/2};
}

/**
 * Hôte d'un diagramme : SVG avec zoom (molette), déplacement (glisser), ⊡ ajuster, ⬇ SVG / PNG ; clic sur une boîte → détail.
 * @param {HTMLElement} host - Conteneur
 * @param {string} inner - Contenu SVG
 * @param {number} w - Largeur du dessin @param {number} h - Hauteur du dessin
 * @param {string} name - Nom des fichiers exportés
 */
function capSyDiagram(host, inner, w, h, name){
  host.innerHTML=_L(`<div class="sy-dg-bar"><button class="phl-toggle-btn" data-z="fit" title="Ajuster le diagramme à la fenêtre">⊡ Ajuster</button><button class="phl-toggle-btn" data-z="in">＋</button><button class="phl-toggle-btn" data-z="out">－</button>
    <span class="ana-fn-cnt" style="margin-left:6px">Molette : zoom · glisser : déplacer · clic : détail</span><span style="flex:1"></span>
    <button class="phl-export-btn" data-x="svg">⬇ SVG</button><button class="phl-export-btn" data-x="png" style="margin-left:4px">⬇ PNG</button></div>`)+
    `<div class="sy-dg" data-fill="8"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" font-family="Segoe UI, Arial, sans-serif">${capSyMarkers()}<g class="sy-dg-root">${inner}</g></svg></div>`;
  const dg=host.querySelector('.sy-dg'), svg=dg.querySelector('svg');
  capFillHeight(host);
  let vb={x:0,y:0,w:Math.max(w,100),h:Math.max(h,100)};
  const apply=()=>svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  // Ajuster : tout le dessin visible, jamais au-delà de 100 %
  const fit=()=>{ const r=dg.getBoundingClientRect(), k=Math.max(w/(r.width||1), h/(r.height||1), 1); vb={w:(r.width||w)*k, h:(r.height||h)*k, x:0, y:0}; vb.x=(w-vb.w)/2; vb.y=Math.min(0,(h-vb.h)/2); apply(); };
  fit();
  const zoom=(f, cx, cy)=>{ const nx=cx-(cx-vb.x)*f, ny=cy-(cy-vb.y)*f; vb={x:nx, y:ny, w:vb.w*f, h:vb.h*f}; apply(); };
  dg.addEventListener('wheel',e=>{ e.preventDefault(); const r=dg.getBoundingClientRect(); zoom(e.deltaY>0?1.15:1/1.15, vb.x+(e.clientX-r.left)/r.width*vb.w, vb.y+(e.clientY-r.top)/r.height*vb.h); },{passive:false});
  let drag=null, moved=false;
  dg.addEventListener('pointerdown',e=>{ drag={x:e.clientX, y:e.clientY, vx:vb.x, vy:vb.y}; moved=false; });
  dg.addEventListener('pointermove',e=>{ if(!drag||!e.buttons){ drag=null; return; } const r=dg.getBoundingClientRect(), dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!moved&&Math.abs(dx)+Math.abs(dy)>3){ moved=true; dg.setPointerCapture(e.pointerId); } if(!moved) return; vb.x=drag.vx-dx*vb.w/r.width; vb.y=drag.vy-dy*vb.h/r.height; apply(); });
  dg.addEventListener('pointerup',()=>{ drag=null; });
  dg.addEventListener('click',e=>{ if(moved) return; const g=e.target.closest('[data-id]'); if(g&&g.dataset.id) capOpenDetail(g.dataset.id); });
  host.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{ const z=b.dataset.z; if(z==='fit') fit(); else zoom(z==='in'?1/1.25:1.25, vb.x+vb.w/2, vb.y+vb.h/2); });
  host.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>capSySvgExport(svg, w, h, name, b.dataset.x));
}

/** Exporte un diagramme en SVG ou PNG (variables de couleur du thème résolues, fond du thème).
 * @param {SVGElement} svg @param {number} w @param {number} h @param {string} name @param {'svg'|'png'} fmt */
function capSySvgExport(svg, w, h, name, fmt){
  const cs=getComputedStyle(document.documentElement);
  let txt=svg.outerHTML.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g,(m,v)=>cs.getPropertyValue(v).trim()||'#888')
    .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Segoe UI, Arial, sans-serif"><rect width="100%" height="100%" fill="${cs.getPropertyValue('--c-bg').trim()||'#fff'}"/>`);
  const file=String(name||'diagramme').replace(/[\\/:*?"<>|]+/g,'_');
  if(fmt==='svg'){ capDownloadBlob(new Blob([txt],{type:'image/svg+xml'}), file+'.svg'); return; }
  const img=new Image(), k=Math.min(2, 8000/Math.max(w,h));
  img.onload=()=>{ const c=document.createElement('canvas'); c.width=w*k; c.height=h*k; const x=c.getContext('2d'); x.scale(k,k); x.drawImage(img,0,0); c.toBlob(b=>{ if(b) capDownloadBlob(b, file+'.png'); }); };
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(txt);
}

/** Barre d'outils d'une sous-vue : HTML d'une ligne de commandes. @param {string} h - Contenu @returns {string} */
function capSyBar(h){ return `<div class="sy-bar">${h}</div>`; }

/* ── ◇ General View ─────────────────────────────────────────────────────────────────────────────── */

/** Vrai si l'élément est une définition ou un usage montré comme boîte dans la General View. @param {object} e @returns {boolean} */
function capSyGvNodeKind(e){
  return (e.isDef||/Usage$/.test(e.kind))&&!/^(SuccessionAsUsage|TransitionUsage|BindingConnectorAsUsage|StateActionUsage|SatisfyRequirementUsage|VerifyRequirementUsage|Expose|MetadataUsage)$/.test(e.kind)&&!(e.kind==='ReferenceUsage'&&!e.isDef);
}

/** ◇ General View : définitions et usages de la portée choisie, avec compartiments et relations (spécialisation, typage,
 * composition, satisfy, perform, allocate, import…). @param {HTMLElement} body */
function capSyRenderGV(body){
  const V=_capSyV.gv, M=_capSy.M;
  const scopes=capSyEls(e=>e.kind==='Package'||e.kind==='LibraryPackage'||e.isDef||(/Usage$/.test(e.kind)&&e.members.length&&capSyGvNodeKind(e)));
  if(V.scope&&!_capSy.byId.get(V.scope)) V.scope='';
  // Portée par défaut : le paquetage qui montre le plus de définitions et d'usages (sans dépasser 60)
  if(!V.scope){ const n=p=>p.members.filter(capSyGvNodeKind).length;
    const p=scopes.filter(e=>e.kind==='Package'&&n(e)).sort((a,b)=>(n(b)<=60?n(b):-n(b))-(n(a)<=60?n(a):-n(a)))[0]; V.scope=p?p._id:''; }
  const S=_capSy.byId.get(V.scope)||null;
  body.innerHTML=capSyBar(_L(`<label>Portée</label> ${capSySelect('sy-gv-scope', scopes, V.scope, _L('— Tout le modèle —'))}
    <label class="cap-chx-opt" title="Inclure les éléments des sous-paquetages"><input type="checkbox" id="sy-gv-deep"${V.deep?' checked':''}> Sous-paquetages</label>
    <label class="cap-chx-opt" title="Afficher les compartiments (attributs, ports, parties…)"><input type="checkbox" id="sy-gv-comp"${V.comp?' checked':''}> Compartiments</label>
    <label class="cap-chx-opt" title="Membres hérités, préfixés par ^"><input type="checkbox" id="sy-gv-inh"${V.inh?' checked':''}> ^ Hérités</label>
    <span class="ana-fn-cnt" id="sy-gv-cnt"></span>`))+'<div id="sy-gv-host"></div>';
  body.querySelector('#sy-gv-scope').onchange=e=>{ V.scope=e.target.value; capSyRenderGV(body); };
  ['deep','comp','inh'].forEach(k=>body.querySelector('#sy-gv-'+k).onchange=e=>{ V[k]=e.target.checked; capSyRenderGV(body); });
  // Nœuds : éléments de la portée (paquetage) ou élément et ses voisins (définition, usage)
  let set=new Set();
  const addNs=ns=>ns.members.forEach(m=>{ if(capSyGvNodeKind(m)) set.add(m); else if(V.deep&&(m.kind==='Package'||m.kind==='LibraryPackage')) addNs(m); });
  if(!S) M.files.forEach(f=>addNs(f.root));
  else if(S.kind==='Package'||S.kind==='LibraryPackage') addNs(S);
  else {
    set.add(S);
    capSyGenerals(M,S).forEach(g=>set.add(g));
    M.all.forEach(e=>{ if(capSyGvNodeKind(e)&&capSyGenerals(M,e).includes(S)) set.add(e); });
    S.members.forEach(m=>{ (m.res.typedBy||[]).forEach(r=>{ if(r&&r.el&&capSyGvNodeKind(r.el)) set.add(r.el); }); });
  }
  let list=[...set];
  const MAX=160, cnt=body.querySelector('#sy-gv-cnt');
  if(list.length>MAX){ cnt.textContent=_L(`${list.length} éléments : les ${MAX} premiers sont affichés (choisissez une portée plus étroite)`); list=list.slice(0,MAX); }
  else cnt.textContent=_L(`${list.length} élément(s)`);
  const inSet=new Set(list);
  const nodes=list.map(el=>{ const n={id:el._id, el, def:el.isDef, ref:!!el.mods.ref, kw:el.keyword||capSyKindKeyword(el.kind), color:(CAP_LAYERS[capSyLayerOf(el.kind)]||{}).color,
    title:capSyCut((el.shortName?'<'+el.shortName+'> ':'')+capSyName(el)+(!el.isDef&&el.refs.typedBy?' : '+(el.conjugated?'~':'')+el.refs.typedBy.join(', '):'')+(el.mult||''),60),
    comps:V.comp?capSyCompartments(el, V.inh):[]}; capSySizeBox(n); return n; });
  const byEl=new Map(nodes.map(n=>[n.el,n]));
  // Arêtes hiérarchiques (général au-dessus) et autres relations
  const H=[], O=[];
  const rel=(a,b,mk,lbl,kind)=>{ if(a&&b&&a!==b&&inSet.has(a)&&inSet.has(b)) (kind==='h'?H:O).push({a:byEl.get(a), b:byEl.get(b), mk, lbl}); };
  list.forEach(el=>{
    const R=el.res, E=l=>(l||[]).map(r=>r&&r.el).filter(Boolean);
    if(el.isDef) E(R.specializes).forEach(g=>rel(el,g,'sy-m-tri','', 'h'));
    else { E(R.typedBy).forEach(g=>rel(el,g,'sy-m-typ','', 'h')); E(R.subsets).forEach(g=>rel(el,g,'sy-m-tri','', 'h')); E(R.redefines).forEach(g=>rel(el,g,'sy-m-red','', 'h')); }
    // Composition : propriétaire → type de ses parties (ou partie montrée comme boîte)
    el.members.forEach(m=>{ if(!/^(PartUsage|ItemUsage|PortUsage|OccurrenceUsage)$/.test(m.kind)) return;
      const t=inSet.has(m)?m:E(m.res.typedBy).find(x=>inSet.has(x)); if(t) rel(t, el, m.mods.ref?'sy-m-hdia':'sy-m-dia', capSyName(m)+(m.mult||''), 'h'); });
  });
  M.all.forEach(el=>{
    const R=el.res, E=l=>(l||[]).map(r=>r&&r.el).filter(Boolean);
    const ownerIn=x=>{ for(let p=x; p; p=p.owner) if(inSet.has(p)) return p; return null; };
    if(el.kind==='SatisfyRequirementUsage'){ const r=E(R.requirement)[0]; const by=E(R.by)[0]||el.owner; rel(ownerIn(by), ownerIn(r), 'sy-m-open', '«satisfy»'); }
    if(el.kind==='PerformActionUsage'){ const t=E(R.subsets)[0]||E(R.typedBy)[0]; rel(ownerIn(el.owner), ownerIn(t)||null, 'sy-m-open', '«perform»'); }
    if(el.kind==='ExhibitStateUsage'){ const t=E(R.subsets)[0]||E(R.typedBy)[0]; rel(ownerIn(el.owner), ownerIn(t)||null, 'sy-m-open', '«exhibit»'); }
    if(el.kind==='AllocationUsage'){ const a=el.ends[0]&&el.ends[0].res&&el.ends[0].res.el, b=el.ends[1]&&el.ends[1].res&&el.ends[1].res.el; rel(ownerIn(a), ownerIn(b), 'sy-m-open', '«allocate»'); }
    if(el.kind==='Dependency') E(R.source).forEach(a=>E(R.target).forEach(b=>rel(ownerIn(a), ownerIn(b), 'sy-m-open', '«dependency»')));
    if(el.role==='subject'&&el.owner) E(R.typedBy).forEach(t=>rel(ownerIn(el.owner), t, 'sy-m-open', '«subject»'));
  });
  const L=capSyLayout(nodes, H.map(e=>({from:e.b.id, to:e.a.id})));
  let svg='';
  const nLbl=new Map();   // étiquettes empilées au-dessus de la boîte enfant (plusieurs rôles du même type)
  H.forEach(e=>{ const p=capSyEdgePath(e.a, e.b); svg+=`<path d="${p.d}" fill="none" stroke="var(--c-text)" stroke-width="1.1" marker-end="url(#${e.mk})"/>`;
    if(e.lbl){ const k=nLbl.get(e.a)||0; nLbl.set(e.a,k+1); svg+=`<text x="${e.a.x+e.a.w/2+4}" y="${e.a.y-6-k*12}" font-size="10" fill="var(--c-text)" opacity=".85">${capEsc(capSyCut(e.lbl,30))}</text>`; } });
  O.forEach(e=>{ const p=capSyEdgePath(e.a, e.b, true); svg+=`<path d="${p.d}" fill="none" stroke="var(--c-accent)" stroke-width="1.1" marker-end="url(#${e.mk})"/>`+
    `<text x="${p.mx}" y="${p.my-4}" text-anchor="middle" font-size="10" fill="var(--c-accent)">${capEsc(e.lbl)}</text>`; });
  nodes.forEach(n=>svg+=capSyBoxSvg(n));
  if(!nodes.length) svg=`<text x="20" y="40" fill="var(--c-text)">${capEsc(_L('Aucune définition ni aucun usage dans cette portée.'))}</text>`;
  capSyDiagram(body.querySelector('#sy-gv-host'), svg, L.w, L.h, 'general-view-'+(S?capSyName(S):'modele'));
}

/* ── ⧉ Interconnection View ─────────────────────────────────────────────────────────────────────── */

/** Arbre de l'Interconnection View : parties et ports imbriqués d'un élément (possédés, sinon ceux de son type).
 * @param {object} el - Élément @param {number} depth - Profondeur restante @param {Set} seen - Éléments déjà ouverts (récursion)
 * @returns {object} Nœud {el, name, kids:[], ports:[], inh} */
function capSyIvTree(el, depth, seen){
  const n={el, name:capSyName(el), kids:[], ports:[]};
  if(seen.has(el)) return n; seen=new Set(seen); seen.add(el);
  const mem=capSyMembersOf(el, true);
  mem.forEach(({m,inh})=>{
    if(m.kind==='PortUsage') n.ports.push({el:m, name:capSyName(m), inh, dir:m.dir||capSyPortDir(m), conj:m.conjugated});
    else if(/^(PartUsage|ItemUsage)$/.test(m.kind)&&depth>0) n.kids.push(Object.assign(capSyIvTree(m, depth-1, seen),{inh}));
  });
  return n;
}
/** Direction d'un port d'après les features de sa définition (toutes in : in, toutes out : out, sinon inout ; inversée si conjugué).
 * @param {object} p - PortUsage @returns {string} 'in' | 'out' | 'inout' | '' */
function capSyPortDir(p){
  const T=((p.res&&p.res.typedBy)||[]).map(r=>r&&r.el).find(Boolean); if(!T) return '';
  const d=new Set(T.members.map(m=>m.dir).filter(Boolean)); if(!d.size) return '';
  let v=d.size===1?[...d][0]:'inout';
  if(p.conjugated&&v!=='inout') v=v==='in'?'out':'in';
  return v;
}

/** Taille (récursive) d'un nœud de l'Interconnection View : nom, ports sur les bords, enfants en grille.
 * @param {object} n - Nœud @param {number} lvl - Niveau d'imbrication */
function capSyIvSize(n, lvl){
  n.kids.forEach(k=>capSyIvSize(k, lvl+1));
  const t=n.el.isDef?capSyName(n.el):capSyName(n.el)+(n.el.refs.typedBy?' : '+n.el.refs.typedBy.join(', '):'')+(n.el.mult||'');
  n.title=capSyCut(t,60); n.kw=n.el.keyword||capSyKindKeyword(n.el.kind);
  // Ports : entrées à gauche, sorties à droite, autres répartis
  let l=0, r=0; n.ports.forEach(p=>{ p.side=p.fixed||(p.dir==='in'?'L':p.dir==='out'?'R':(l<=r?'L':'R')); if(p.side==='L') l++; else r++; });
  const pw=Math.max(0,...n.ports.map(p=>capSyTextW(p.name,10)+14));
  let w=Math.max(capSyTextW(n.title,12,true)+30, capSyTextW('«'+n.kw+'»',10)+20, 130, 2*pw+40), h=44+Math.max(l,r)*20;
  if(n.kids.length){
    const cols=Math.ceil(Math.sqrt(n.kids.length)), rows=[];
    n.kids.forEach((k,i)=>{ (rows[Math.floor(i/cols)]=rows[Math.floor(i/cols)]||[]).push(k); });
    const gx=70, gy=40, colW=[]; n.kids.forEach((k,i)=>{ colW[i%cols]=Math.max(colW[i%cols]||0, k.w); });
    let y=44+(l||r?0:0);
    rows.forEach(row=>{ let x=Math.max(30,pw+24); const rh=Math.max(...row.map(k=>k.h)); row.forEach((k,j)=>{ k.rx=x+(colW[j]-k.w)/2; k.ry=y; x+=colW[j]+gx; }); y+=rh+gy; });
    const inW=Math.max(30,pw+24)+colW.reduce((s,c)=>s+c,0)+gx*(cols-1)+Math.max(30,pw+24);
    w=Math.max(w, inW); h=Math.max(h, y-gy+30);
    // Centre la grille si le titre est plus large
    const off=(w-inW)/2; if(off>0) n.kids.forEach(k=>k.rx+=off);
  }
  n.w=w; n.h=h;
}
/** Place les nœuds (coordonnées absolues) et les ports sur les bords. @param {object} n @param {number} x @param {number} y */
function capSyIvPlace(n, x, y){
  n.x=x; n.y=y;
  const L=n.ports.filter(p=>p.side==='L'), R=n.ports.filter(p=>p.side==='R');
  [[L,n.x],[R,n.x+n.w]].forEach(([ps,px])=>ps.forEach((p,i)=>{ p.x=px; p.y=n.y+44+i*20+6; }));
  n.kids.forEach(k=>capSyIvPlace(k, x+k.rx, y+k.ry));
}

/** ⧉ Interconnection View : parties imbriquées, ports sur les bords, connexions / interfaces / flux / liaisons entre eux.
 * @param {HTMLElement} body */
function capSyRenderIV(body){
  const V=_capSyV.iv, M=_capSy.M;
  const cands=capSyEls(e=>/^(PartDefinition|PartUsage|ItemDefinition|ItemUsage|ConnectionDefinition|InterfaceDefinition)$/.test(e.kind));
  const score=e=>capSyMembersOf(e,true).filter(x=>/^(PartUsage|ItemUsage|PortUsage)$/.test(x.m.kind)).length;
  if(!V.root||!_capSy.byId.get(V.root)){ const best=cands.filter(e=>!e.owner||e.owner.isFileRoot||e.owner.kind==='Package').sort((a,b)=>score(b)-score(a))[0]||cands[0]; V.root=best?best._id:''; }
  body.innerHTML=capSyBar(_L(`<label>Élément</label> ${capSySelect('sy-iv-root', cands, V.root)}
    <label>Profondeur</label> <select id="sy-iv-depth" class="phl-filter-input">${[1,2,3,4].map(d=>`<option${d===V.depth?' selected':''}>${d}</option>`).join('')}</select>
    <span class="ana-fn-cnt" id="sy-iv-cnt"></span>`))+'<div id="sy-iv-host"></div>';
  body.querySelector('#sy-iv-root').onchange=e=>{ V.root=e.target.value; capSyRenderIV(body); };
  body.querySelector('#sy-iv-depth').onchange=e=>{ V.depth=+e.target.value; capSyRenderIV(body); };
  const R=_capSy.byId.get(V.root);
  if(!R){ body.querySelector('#sy-iv-host').innerHTML=_L('<div class="ana-dim" style="padding:20px">Aucune partie dans ce modèle.</div>'); return; }
  const T=capSyIvTree(R, V.depth, new Set());
  // Connecteurs : ceux de chaque nœud dessiné et de ses types, extrémités retrouvées par leur chemin (« moteurs.arbre »)
  const all=[]; const walk=n=>{ all.push(n); n.kids.forEach(walk); }; walk(T);
  const lines=[];
  /** Extrémité d'un connecteur retrouvée par son chemin depuis le nœud qui le porte : {node} (partie) ou {port, owner}. */
  const find=(n, ref)=>{ let cur=n; for(const seg of String(ref||'').split('.')){ const kid=cur.kids.find(x=>x.name===seg); if(kid){ cur=kid; continue; }
    const port=cur.ports.find(x=>x.name===seg); return port?{port, owner:cur}:null; } return cur===n?null:{node:cur}; };
  const CONN=/^(ConnectionUsage|InterfaceUsage|FlowUsage|SuccessionFlowUsage|BindingConnectorAsUsage|AllocationUsage)$/;
  const done=new Set();
  all.forEach(n=>{
    const ctx=[n.el, ...capSyGenerals(M, n.el)];
    ctx.forEach(c=>c.members.forEach(m=>{
      if(!CONN.test(m.kind)||m.ends.length<2) return;
      const key=n.el._id+'|'+m._id; if(done.has(key)) return; done.add(key);
      const ends=m.ends.map(e=>e&&find(n, e.ref)).filter(Boolean);
      for(let i=1;i<ends.length;i++) lines.push({m, a:ends[0], b:ends[i]});
    }));
  });
  // Taille et placement, puis côté des ports connectés tourné vers l'autre extrémité (la flèche garde la direction), second placement
  capSyIvSize(T,0); capSyIvPlace(T, 20, 20);
  const cx=e=>e.port?e.port.x:e.node.x+e.node.w/2;
  lines.forEach(l=>[[l.a,l.b],[l.b,l.a]].forEach(([x,y])=>{ if(x.port) x.port.fixed=cx(y)<x.owner.x+x.owner.w/2?'L':'R'; }));
  capSyIvSize(T,0); capSyIvPlace(T, 20, 20);
  const pt=e=>e.port?{x:e.port.x+(e.port.side==='L'?-0:0), y:e.port.y+5, side:e.port.side}:{x:e.node.x+e.node.w/2, y:e.node.y, side:'T', box:e.node};
  let svg='';
  const box=n=>{ const c=(CAP_LAYERS[capSyLayerOf(n.el.kind)]||{}).color||'var(--c-accent)';
    let s=`<g class="sy-node" data-id="${n.el._id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.el.isDef?0:10}" fill="var(--c-node-bg)" fill-opacity="${n===T?.35:.9}" stroke="${c}" stroke-width="1.4"${n.el.mods.ref||n.inh?' stroke-dasharray="5,3"':''}/>`+
      `<text x="${n.x+n.w/2}" y="${n.y+15}" text-anchor="middle" font-size="10" fill="var(--c-text)" opacity=".8">«${capEsc(n.kw)}»</text>`+
      `<text x="${n.x+n.w/2}" y="${n.y+31}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--c-text)">${capEsc((n.inh?'^':'')+n.title)}</text></g>`;
    n.ports.forEach(p=>{ const x=p.x-5, arrow=p.dir==='in'?(p.side==='L'?'→':'←'):p.dir==='out'?(p.side==='L'?'←':'→'):p.dir==='inout'?'↔':'';
      s+=`<g class="sy-node" data-id="${p.el._id}"><rect x="${x}" y="${p.y}" width="10" height="10" rx="2" fill="var(--c-bg)" stroke="${c}" stroke-width="1.3"${p.inh?' stroke-dasharray="2,2"':''}/>`+
        (arrow?`<text x="${p.x}" y="${p.y+8.5}" text-anchor="middle" font-size="8" fill="var(--c-text)">${arrow}</text>`:'')+
        `<text x="${p.side==='L'?p.x+9:p.x-9}" y="${p.y+9}" text-anchor="${p.side==='L'?'start':'end'}" font-size="10" fill="var(--c-text)">${capEsc((p.conj?'~':'')+capSyCut(p.name,24))}</text></g>`; });
    n.kids.forEach(k=>s+=box(k));
    return s; };
  svg+=box(T);
  lines.forEach(l=>{
    const a=pt(l.a), b=pt(l.b), flow=/Flow/.test(l.m.kind), bind=l.m.kind==='BindingConnectorAsUsage';
    let d;
    if(a.side!=='T'&&b.side!=='T'){ const ox=a.side==='L'?-18:18, bx=b.side==='L'?-18:18, mx=(a.x+ox+b.x+bx)/2; d=`M${a.x+(a.side==='L'?-5:5)},${a.y} H${a.x+ox} H${mx} V${b.y} H${b.x+bx} H${b.x+(b.side==='L'?-5:5)}`; }
    else d=`M${a.x},${a.y} L${b.x},${b.y}`;
    const lbl=(l.m.declaredName?capSyName(l.m):'')+(l.m.refs.typedBy?' : '+l.m.refs.typedBy.join(', '):'')+(flow&&l.m.refs.item?' «flow» '+l.m.refs.item[0]:bind?' =':l.m.kind==='InterfaceUsage'?' «interface»':l.m.kind==='AllocationUsage'?' «allocate»':'');
    svg+=`<g class="sy-node" data-id="${l.m._id}"><path d="${d}" fill="none" stroke="${flow?'#22c55e':'var(--c-accent)'}" stroke-width="1.6"${bind?' stroke-dasharray="2,3"':''}${flow?' marker-end="url(#sy-m-fill)"':''}/>`+
      (lbl.trim()?`<text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-5}" text-anchor="middle" font-size="10" fill="var(--c-text)">${capEsc(capSyCut(lbl.trim(),40))}</text>`:'')+'</g>';
  });
  body.querySelector('#sy-iv-cnt').textContent=_L(`${all.length-1} partie(s), ${all.reduce((s,n)=>s+n.ports.length,0)} port(s), ${lines.length} connexion(s)`);
  capSyDiagram(body.querySelector('#sy-iv-host'), svg, T.w+40, T.h+40, 'interconnection-view-'+capSyName(R));
}

/* ── ⇢ Action Flow View et ◎ State Transition View ──────────────────────────────────────────────── */

/** Membres comportementaux d'un élément (possédés, sinon ceux de son type). @param {object} el @param {RegExp} re @returns {object[]} */
function capSyBehMembers(el, re){
  let own=el.members.filter(m=>re.test(m.kind));
  if(!own.length) for(const g of capSyGenerals(_capSy.M, el)){ own=g.members.filter(m=>re.test(m.kind)); if(own.length) break; }
  return own;
}

/**
 * Graphe d'un comportement : nœuds (actions ou états, nœuds de contrôle, début / fin), arêtes (successions, transitions, flux).
 * @param {object} R - Action ou état racine @param {boolean} states - true : machine à états
 * @returns {{nodes:object[], edges:object[]}} Graphe
 */
function capSyBehGraph(R, states){
  const NODE=states?/^(StateUsage|ExhibitStateUsage)$/:/^(ActionUsage|PerformActionUsage|AcceptActionUsage|SendActionUsage|AssignmentActionUsage|IfActionUsage|WhileLoopActionUsage|ForLoopActionUsage|TerminateActionUsage|ForkNode|JoinNode|MergeNode|DecisionNode|CalculationUsage|StateUsage|EventOccurrenceUsage|IncludeUseCaseUsage|UseCaseUsage)$/;
  const mem=capSyBehMembers(R, NODE), owner=mem.length?mem[0].owner:R;
  const nodes=mem.filter(m=>!m.stateRole).map(m=>({id:m._id, el:m})), byEl=new Map(nodes.map(n=>[n.el,n]));
  const pseudo={};
  const P=k=>{ if(!pseudo[k]){ pseudo[k]={id:'@'+k, pseudo:k}; nodes.push(pseudo[k]); } return pseudo[k]; };
  const endNode=e=>{ if(!e) return null; const r=e.res; if(r&&r.pseudo) return P(r.pseudo==='entry'?'start':r.pseudo);
    let x=r&&r.el; for(;x;x=x.owner) if(byEl.has(x)) return byEl.get(x);
    const seg=String(e.ref||'').split('.')[0]; const n=nodes.find(n=>n.el&&n.el.name===seg); return n||null; };
  const edges=[];
  owner.members.concat(owner===R?[]:R.members).forEach(m=>{
    if(/^(SuccessionAsUsage|TransitionUsage|FlowUsage|SuccessionFlowUsage)$/.test(m.kind)){
      const a=endNode(m.ends[0]), b=endNode(m.ends[1]); if(!a||!b) return;
      let lbl='';
      if(m.kind==='TransitionUsage') lbl=[m.trigger, m.guard&&m.guard!=='else'?'['+m.guard+']':'', m.effect?'/ '+m.effect:''].filter(Boolean).join(' ');
      else if(m.guard) lbl='['+m.guard+']';
      else if(/Flow/.test(m.kind)) lbl=(m.refs.item?m.refs.item[0]:'')||'';
      edges.push({from:a.id, to:b.id, m, kind:m.kind, lbl});
    }
  });
  return {nodes, edges};
}

/** Dessine un comportement (actions ou états) en couches : boîtes arrondies, losanges, barres, début / fin ; successions en
 * pointillé à flèche ouverte, transitions en trait plein, flux à flèche pleine.
 * @param {HTMLElement} host @param {object} R @param {boolean} states */
function capSyBehDraw(host, R, states){
  const G=capSyBehGraph(R, states);
  G.nodes.forEach(n=>{
    if(n.pseudo){ n.w=n.h=22; return; }
    const k=n.el.kind;
    if(k==='DecisionNode'||k==='MergeNode'){ n.w=n.h=30; return; }
    if(k==='ForkNode'||k==='JoinNode'){ n.w=110; n.h=8; return; }
    n.def=false; n.kw=n.el.keyword||capSyKindKeyword(k); n.color=(CAP_LAYERS[capSyLayerOf(k)]||{}).color;
    n.title=capSyCut(capSyName(n.el)+(n.el.refs.typedBy?' : '+n.el.refs.typedBy.join(', '):'')+(n.el.refs.subsets&&n.el.isRefUsage?' :> '+n.el.refs.subsets[0]:''),52);
    n.comps=[];
    if(states){ const sa=n.el.members.filter(m=>m.stateRole); if(sa.length) n.comps.push({t:'actions', lines:sa.map(m=>m.stateRole+' '+capSyCut(capSyName(m)+(m.refs.typedBy?' : '+m.refs.typedBy[0]:''),40))}); }
    else { const pr=n.el.members.filter(m=>m.dir); if(pr.length) n.comps.push({t:'parameters', lines:pr.map(m=>capSyCut(capSyDeclText(m,true)||m.dir+' '+capSyName(m),44))}); }
    if(n.el.text&&!n.el.name) n.title=capSyCut(n.el.text,52);
    capSySizeBox(n);
  });
  const L=capSyLayout(G.nodes, G.edges.map(e=>({from:e.from, to:e.to})), {gapY:56});
  const N=new Map(G.nodes.map(n=>[n.id,n]));
  let svg='';
  const pairs=new Map(); G.edges.forEach(e=>{ const k=[e.from,e.to].sort().join('|'); pairs.set(k,(pairs.get(k)||0)+1); });
  const seenP=new Map();
  G.edges.forEach(e=>{
    const a=N.get(e.from), b=N.get(e.to); if(!a||!b) return;
    // Plusieurs arêtes entre les mêmes nœuds (aller et retour) : décalées horizontalement
    const k=[e.from,e.to].sort().join('|'), n=pairs.get(k), i=seenP.get(k)||0; seenP.set(k,i+1);
    const off=n>1?(i-(n-1)/2)*26:0;
    const A=Object.assign({}, a, {x:a.x+off}), B=Object.assign({}, b, {x:b.x+off});
    const p=capSyEdgePath(A, B, a===b||Math.abs(a.y-b.y)<4||(b.y<a.y&&n<2));
    const succ=e.kind==='SuccessionAsUsage', flow=/Flow/.test(e.kind);
    svg+=`<g class="sy-node" data-id="${e.m._id}"><path d="${p.d}" fill="none" stroke="${flow?'#22c55e':'var(--c-text)'}" stroke-width="1.2"${succ?' stroke-dasharray="5,3"':''} marker-end="url(#${flow?'sy-m-fill':'sy-m-open'})"/>`+
      (e.lbl?`<text x="${p.mx+5}" y="${p.my-4}" font-size="10" fill="var(--c-text)">${capEsc(capSyCut(e.lbl,46))}</text>`:'')+'</g>';
  });
  G.nodes.forEach(n=>{
    if(n.pseudo==='start') svg+=`<circle cx="${n.x+11}" cy="${n.y+11}" r="9" fill="var(--c-text)"/>`;
    else if(n.pseudo==='done') svg+=`<circle cx="${n.x+11}" cy="${n.y+11}" r="10" fill="none" stroke="var(--c-text)" stroke-width="1.4"/><circle cx="${n.x+11}" cy="${n.y+11}" r="6" fill="var(--c-text)"/>`;
    else if(n.pseudo) svg+=`<circle cx="${n.x+11}" cy="${n.y+11}" r="9" fill="none" stroke="var(--c-text)"/>`;
    else if(/^(DecisionNode|MergeNode)$/.test(n.el.kind)) svg+=`<g class="sy-node" data-id="${n.id}"><path d="M${n.x+15},${n.y} L${n.x+30},${n.y+15} L${n.x+15},${n.y+30} L${n.x},${n.y+15} Z" fill="var(--c-node-bg)" stroke="var(--c-text)" stroke-width="1.3"/>`+(n.el.declaredName?`<text x="${n.x+34}" y="${n.y+12}" font-size="10" fill="var(--c-text)">${capEsc(n.el.name)}</text>`:'')+'</g>';
    else if(/^(ForkNode|JoinNode)$/.test(n.el.kind)) svg+=`<g class="sy-node" data-id="${n.id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="var(--c-text)"/></g>`;
    else svg+=capSyBoxSvg(n);
  });
  if(!G.nodes.length) svg=`<text x="20" y="40" fill="var(--c-text)">${capEsc(states?_L('Aucun état dans cet élément.'):_L('Aucune sous-action dans cet élément.'))}</text>`;
  capSyDiagram(host, svg, L.w, L.h, (states?'state-transition-view-':'action-flow-view-')+capSyName(R));
  return G;
}

/** ⇢ Action Flow View d'une action (définition ou usage). @param {HTMLElement} body */
function capSyRenderAFV(body){ capSyRenderBeh(body, false); }
/** ◎ State Transition View d'une machine à états (définition ou usage). @param {HTMLElement} body */
function capSyRenderSTV(body){ capSyRenderBeh(body, true); }
/** Rendu commun des vues de comportement : choix de l'élément racine, puis dessin.
 * @param {HTMLElement} body @param {boolean} states */
function capSyRenderBeh(body, states){
  const V=_capSyV[states?'stv':'afv'];
  const re=states?/^(StateDefinition|StateUsage|ExhibitStateUsage)$/:/^(ActionDefinition|ActionUsage|PerformActionUsage|CalculationDefinition|UseCaseDefinition|UseCaseUsage|VerificationCaseDefinition|AnalysisCaseDefinition|CaseDefinition|StateUsage|StateDefinition)$/;
  const sub=states?/^(StateUsage|ExhibitStateUsage)$/:/^(ActionUsage|PerformActionUsage|AcceptActionUsage|SendActionUsage|ForkNode|JoinNode|MergeNode|DecisionNode|SuccessionAsUsage)$/;
  const cands=capSyEls(e=>re.test(e.kind)&&capSyBehMembers(e, sub).length>0);
  // Élément par défaut : celui qui a le plus de successions ou de transitions
  if(!V.root||!_capSy.byId.get(V.root)){ const sc=e=>capSyBehGraph(e, states).edges.length*3+capSyBehMembers(e, sub).length;
    const best=cands.slice().sort((a,b)=>sc(b)-sc(a))[0]; V.root=best?best._id:''; }
  body.innerHTML=capSyBar(_L(`<label>${states?_L('Machine à états'):_L('Action')}</label> ${capSySelect('sy-bh-root', cands, V.root)} <span class="ana-fn-cnt" id="sy-bh-cnt"></span>`))+'<div id="sy-bh-host"></div>';
  body.querySelector('#sy-bh-root').onchange=e=>{ V.root=e.target.value; capSyRenderBeh(body, states); };
  const R=_capSy.byId.get(V.root);
  if(!R){ body.querySelector('#sy-bh-host').innerHTML=`<div class="ana-dim" style="padding:20px">${states?_L('Aucune machine à états avec des états dans ce modèle.'):_L('Aucune action décomposée dans ce modèle.')}</div>`; return; }
  const G=capSyBehDraw(body.querySelector('#sy-bh-host'), R, states);
  body.querySelector('#sy-bh-cnt').textContent=states?_L(`${G.nodes.filter(n=>!n.pseudo).length} état(s), ${G.edges.length} transition(s)`):_L(`${G.nodes.filter(n=>!n.pseudo).length} nœud(s), ${G.edges.length} succession(s) / flux`);
}

/* ── 📑 Exigences ───────────────────────────────────────────────────────────────────────────────── */

/** Exigences du modèle avec leur traçabilité : texte, sujet, contraintes, satisfaites par, vérifiées par.
 * @returns {object[]} Lignes {el, id, text, subject, cons, typedBy, sat:[], ver:[], usages:[]} */
function capSyRequirements(){
  const M=_capSy.M, L=capLinksData||(capLinksData=capComputeLinks());
  const by=k=>{ const m=new Map(); (L[k]||[]).forEach(r=>{ (m.get(r.tgt.id)||m.set(r.tgt.id,[]).get(r.tgt.id)).push(r.src); }); return m; };
  const SAT=by('sy_sat'), VER=by('sy_ver');
  const reqs=capSyEls(e=>/^(RequirementDefinition|RequirementUsage|ConcernDefinition|ConcernUsage|ViewpointDefinition)$/.test(e.kind)&&!e.role);
  const typed=new Map(); reqs.forEach(r=>(r.res.typedBy||[]).forEach(t=>{ if(t&&t.el) (typed.get(t.el)||typed.set(t.el,[]).get(t.el)).push(r); }));
  return reqs.map(el=>{
    const subj=el.members.find(m=>m.role==='subject');
    const cons=el.members.filter(m=>m.reqRole==='require'||m.reqRole==='assume'||m.kind==='ConstraintUsage').map(m=>(m.reqRole?m.reqRole+' ':'')+(m.exprs.join(' ; ')||capSyName(m))).concat(el.exprs);
    const usages=typed.get(el)||[];
    const sat=(SAT.get(el._id)||[]).concat(...usages.map(u=>SAT.get(u._id)||[])), ver=(VER.get(el._id)||[]).concat(...usages.map(u=>VER.get(u._id)||[]));
    return {el, id:el.shortName||'', text:el.docs.join(' ').replace(/\s+/g,' ').trim(), subject:subj?capSyDeclText(subj,true):'', cons, typedBy:(el.res.typedBy||[]).map(r=>r&&r.el).filter(Boolean), sat, ver, usages};
  });
}

/** 📑 Exigences : tableau filtrable, couverture (satisfaites, vérifiées), export CSV. @param {HTMLElement} body */
function capSyRenderReq(body){
  const V=_capSyV.req, rows=capSyRequirements();
  const pct=(n,d)=>d?Math.round(100*n/d)+' %':'—';
  const nS=rows.filter(r=>r.sat.length).length, nV=rows.filter(r=>r.ver.length).length;
  body.innerHTML=capSyBar(_L(`<input type="search" class="phl-filter-input" id="sy-rq-q" placeholder="🔍 Identifiant, nom, texte…" value="${capEsc(V.q)}">
    <select id="sy-rq-f" class="phl-filter-input"><option value="all">Toutes</option><option value="nosat">Non satisfaites</option><option value="nover">Non vérifiées</option><option value="def">Définitions</option><option value="use">Usages</option></select>
    <span class="sy-chip">${rows.length} exigence(s)</span><span class="sy-chip" title="Satisfaites (satisfy), directement ou par un usage">✓ satisfaites ${pct(nS,rows.length)}</span><span class="sy-chip" title="Vérifiées (verify), directement ou par un usage">✔ vérifiées ${pct(nV,rows.length)}</span>
    <span class="ana-fn-cnt" id="sy-rq-cnt"></span><span style="flex:1"></span><button class="phl-export-btn" id="sy-rq-csv">⬇ CSV</button>`))+
    '<div class="sy-tbl-wrap" data-fill="8"><table class="cap-link-table sy-tbl"><thead><tr>'+[_L('Id'),_L('Exigence'),_L('Sorte'),_L('Texte'),_L('Sujet'),_L('Contraintes'),_L('Typée par'),_L('Satisfaite par'),_L('Vérifiée par')].map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody></tbody></table></div>';
  const f=body.querySelector('#sy-rq-f'); f.value=V.f;
  const list=()=>{ const q=V.q.trim().toLowerCase(); return rows.filter(r=>(!q||[r.id,r.el.name,r.text,r.subject].join(' ').toLowerCase().includes(q))&&
    (V.f==='all'||(V.f==='nosat'&&!r.sat.length)||(V.f==='nover'&&!r.ver.length)||(V.f==='def'&&r.el.isDef)||(V.f==='use'&&!r.el.isDef))); };
  const fill=()=>{ const l=list(); body.querySelector('#sy-rq-cnt').textContent=l.length<rows.length?_L(`${l.length} affichée(s)`):'';
    const lk=a=>a.map(x=>capDetLink(x.id||x._id, x.name||capSyName(x), 'color:var(--c-accent)')).join(', ');
    body.querySelector('tbody').innerHTML=l.map(r=>`<tr><td>${capEsc(r.id)}</td><td>${capSyLink(r.el)}</td><td>${capEsc(r.el.keyword)}</td><td class="sy-wrap">${capEsc(capSyCut(r.text,240))}</td><td>${capEsc(r.subject)}</td>`+
      `<td class="sy-wrap"><code>${capEsc(r.cons.map(c=>capSyCut(c,80)).join(' · '))}</code></td><td>${r.typedBy.map(t=>capSyLink(t)).join(', ')}</td>`+
      `<td>${r.sat.length?lk(r.sat):`<span style="color:var(--c-warn,#e3b341)">${_L('⚠ aucune')}</span>`}</td><td>${r.ver.length?lk(r.ver):'<span class="ana-dim">—</span>'}</td></tr>`).join('')||`<tr><td colspan="9" class="ana-dim">${_L('Aucune exigence.')}</td></tr>`;
    capFillHeight(body); };
  body.querySelector('#sy-rq-q').oninput=e=>{ V.q=e.target.value; fill(); };
  f.onchange=e=>{ V.f=e.target.value; fill(); };
  body.querySelector('#sy-rq-csv').onclick=()=>capCsvExport(_L('exigences-sysml.csv'), [_L('Id'),_L('Exigence'),_L('Sorte'),_L('Texte'),_L('Sujet'),_L('Contraintes'),_L('Typée par'),_L('Satisfaite par'),_L('Vérifiée par')],
    list().map(r=>[r.id, capCx(r.el.name, r.el._id), r.el.keyword, r.text, r.subject, r.cons.join(' ; '), capCxList(r.typedBy.map(t=>({id:t._id, name:t.name}))), capCxList(r.sat), capCxList(r.ver)]));
  fill();
}

/* ── ▦ Grid View (matrice d'une relation) ────────────────────────────────────────────────────────── */

/** ▦ Grid View : matrice sources × cibles d'une relation SysML (satisfy, perform, allocate, typage…), export CSV.
 * @param {HTMLElement} body */
function capSyRenderGrid(body){
  const V=_capSyV.grid, L=capLinksData||(capLinksData=capComputeLinks());
  const secs=CAP_SY_LINK_SECTIONS.filter(s=>(L[s.key]||[]).length);
  if(!secs.length){ body.innerHTML=_L('<div class="ana-dim" style="padding:20px">Aucune relation dans ce modèle.</div>'); return; }
  if(!secs.some(s=>s.key===V.rel)) V.rel=(secs.find(s=>s.key==='sy_sat')||secs.find(s=>s.key==='sy_perf')||secs.find(s=>s.key==='sy_alloc')||secs[0]).key;
  const sec=secs.find(s=>s.key===V.rel), links=L[sec.key];
  const uniq=a=>{ const m=new Map(); a.forEach(x=>m.set(x.id,x)); return [...m.values()].sort((x,y)=>String(x.name).localeCompare(String(y.name))); };
  let rows=uniq(links.map(l=>l.src)), cols=uniq(links.map(l=>l.tgt));
  if(V.tr) [rows, cols]=[cols, rows];
  const MAX=100, cut=rows.length>MAX||cols.length>MAX;
  rows=rows.slice(0,MAX); cols=cols.slice(0,MAX);
  const has=new Set(links.map(l=>V.tr?l.tgt.id+'|'+l.src.id:l.src.id+'|'+l.tgt.id));
  body.innerHTML=capSyBar(_L(`<label>Relation</label> <select id="sy-gr-rel" class="phl-filter-input">${secs.map(s=>`<option value="${s.key}"${s.key===V.rel?' selected':''}>${capEsc(s.humanLabel)} (${L[s.key].length})</option>`).join('')}</select>
    <button class="phl-toggle-btn${V.tr?' active':''}" id="sy-gr-tr" title="Échanger lignes et colonnes">⇄ Transposer</button>
    <span class="ana-fn-cnt">${rows.length} × ${cols.length}${cut?_L(' — limité à 100 × 100'):''}</span><span style="flex:1"></span><button class="phl-export-btn" id="sy-gr-csv">⬇ CSV</button>`))+
    `<div class="sy-tbl-wrap" data-fill="8"><table class="sy-grid"><thead><tr><th></th>${cols.map(c=>`<th class="sy-grid-c"><div>${capDetLink(c.id, capSyCut(c.name,28), 'color:var(--c-accent)')}</div></th>`).join('')}</tr></thead><tbody>`+
    rows.map(r=>`<tr><th>${capDetLink(r.id, capSyCut(r.name,40), 'color:var(--c-accent)')}</th>${cols.map(c=>`<td title="${capEsc(r.name+' → '+c.name)}">${has.has(r.id+'|'+c.id)?'●':''}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>';
  body.querySelector('#sy-gr-rel').onchange=e=>{ V.rel=e.target.value; capSyRenderGrid(body); };
  body.querySelector('#sy-gr-tr').onclick=()=>{ V.tr=!V.tr; capSyRenderGrid(body); };
  body.querySelector('#sy-gr-csv').onclick=()=>capCsvDownload(_L('grid-view.csv'), ['', ...cols.map(c=>c.name)], rows.map(r=>[r.name, ...cols.map(c=>has.has(r.id+'|'+c.id)?'X':'')]));
  capFillHeight(body);
}

/* ── ✔ Contrôles ─────────────────────────────────────────────────────────────────────────────────── */

/** Libellés des codes de diagnostic SysML. */
const CAP_SY_CODES={'E-SYNTAXE':_L('Syntaxe'),'E-LEX-NOM-ASCII':_L('Nom non ASCII hors apostrophes'),'E-LEX-CARACTERE':_L('Caractère inattendu'),'E-LEX-CHAINE':_L('Chaîne non terminée'),
  'E-LEX-COMMENTAIRE':_L('Commentaire non terminé'),'E-LEX-NOTE':_L('Note non terminée'),'W-IMPORT-VISIBILITE':_L('Import sans visibilité'),'R-INTROUVABLE':_L('Nom introuvable'),
  'V-DOUBLON':_L('Nom en double'),'V-MULTIPLICITE':_L('Multiplicité incohérente'),'V-TYPAGE':_L('Typage incompatible'),'V-SPECIALISATION':_L('Spécialisation entre sortes différentes'),
  'V-PORT-PAQUETAGE':_L('Port hors d\'une partie'),'I-NON-SATISFAITE':_L('Exigence non satisfaite'),'I-NON-VERIFIEE':_L('Exigence non vérifiée'),'I-DEF-INUTILISEE':_L('Définition jamais utilisée'),'I-SANS-DOC':_L('Définition sans documentation')};

/** Diagnostics à afficher : ceux de l'analyse (syntaxe, résolution, contrôles) et, en option, les remarques de qualité
 * (exigences non satisfaites ou non vérifiées, définitions inutilisées ou sans documentation).
 * @param {boolean} info - Inclure les remarques de qualité @returns {object[]} Diagnostics */
function capSyDiags(info){
  const D=_capSy.M.diags.slice();
  if(!info) return D;
  const at=(el,code,msg)=>D.push({severity:'info', code, message:msg, line:el.line, column:el.col, file:el.file, el});
  capSyRequirements().forEach(r=>{ if(r.el.isDef&&!r.usages.length&&!r.sat.length) return;
    if(!r.sat.length) at(r.el,'I-NON-SATISFAITE',_L(`Exigence « ${capSyName(r.el)} » : aucun satisfy`));
    if(!r.ver.length) at(r.el,'I-NON-VERIFIEE',_L(`Exigence « ${capSyName(r.el)} » : aucun verify`)); });
  const used=new Set(); _capSy.M.all.forEach(e=>['typedBy','specializes','subsets','redefines','references','requirement','item','trigger'].forEach(k=>(e.res[k]||[]).forEach(r=>{ if(r&&r.el) used.add(r.el); })));
  capSyEls(e=>e.isDef).forEach(d=>{ if(!used.has(d)) at(d,'I-DEF-INUTILISEE',_L(`${d.keyword} « ${capSyName(d)} » n'est ni utilisée comme type ni spécialisée`));
    if(!d.docs.some(Boolean)&&!d.members.some(m=>m.kind==='Comment')) at(d,'I-SANS-DOC',_L(`${d.keyword} « ${capSyName(d)} » sans documentation (doc /* … */)`)); });
  return D;
}

/** ✔ Contrôles : diagnostics filtrables (gravité, code, texte) ; clic sur la position → 🧾 Texte source. @param {HTMLElement} body */
function capSyRenderChk(body){
  const V=_capSyV.chk, D=capSyDiags(V.info);
  const SEV={error:['✖',_L('Erreur'),'var(--c-err,#f85149)'], warning:['⚠',_L('Avertissement'),'var(--c-warn,#e3b341)'], info:['ℹ',_L('Remarque'),'var(--c-accent)']};
  const cnt=s=>D.filter(d=>d.severity===s).length, codes=[...new Set(D.map(d=>d.code))].sort();
  body.innerHTML=capSyBar(_L(`<select id="sy-ck-sev" class="phl-filter-input"><option value="all">Toutes les gravités</option><option value="error">✖ Erreurs (${cnt('error')})</option><option value="warning">⚠ Avertissements (${cnt('warning')})</option><option value="info">ℹ Remarques (${cnt('info')})</option></select>
    <select id="sy-ck-code" class="phl-filter-input"><option value="">Tous les contrôles</option>${codes.map(c=>`<option value="${c}">${capEsc((CAP_SY_CODES[c]||c)+' ('+D.filter(d=>d.code===c).length+')')}</option>`).join('')}</select>
    <input type="search" class="phl-filter-input" id="sy-ck-q" placeholder="🔍 Message, fichier…" value="${capEsc(V.q)}">
    <label class="cap-chx-opt" title="Exigences non satisfaites ou non vérifiées, définitions inutilisées ou sans documentation"><input type="checkbox" id="sy-ck-info"${V.info?' checked':''}> Remarques de qualité</label>
    <span class="ana-fn-cnt" id="sy-ck-cnt"></span><span style="flex:1"></span><button class="phl-export-btn" id="sy-ck-csv">⬇ CSV</button>`))+
    '<div class="sy-tbl-wrap" data-fill="8"><table class="cap-link-table sy-tbl"><thead><tr>'+[_L('Gravité'),_L('Contrôle'),_L('Message'),_L('Élément'),_L('Position')].map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody></tbody></table></div>';
  body.querySelector('#sy-ck-sev').value=V.sev; body.querySelector('#sy-ck-code').value=V.code;
  const list=()=>{ const q=V.q.trim().toLowerCase(); return D.filter(d=>(V.sev==='all'||d.severity===V.sev)&&(!V.code||d.code===V.code)&&(!q||(d.message+' '+d.file).toLowerCase().includes(q))); };
  const fill=()=>{ const l=list(); body.querySelector('#sy-ck-cnt').textContent=_L(`${l.length} / ${D.length}`);
    body.querySelector('tbody').innerHTML=l.slice(0,3000).map((d,i)=>{ const s=SEV[d.severity]||SEV.info;
      return `<tr><td style="color:${s[2]};white-space:nowrap">${s[0]} ${s[1]}</td><td>${capEsc(CAP_SY_CODES[d.code]||d.code)}</td><td class="sy-wrap">${capEsc(d.message)}</td><td>${d.el?capSyLink(d.el):''}</td>`+
        `<td><a href="#" class="sy-pos" data-f="${capEsc(d.file)}" data-l="${d.line}">${capEsc(d.file)}:${d.line}</a></td></tr>`; }).join('')||`<tr><td colspan="5" class="ana-dim">${_L('✔ Aucun diagnostic.')}</td></tr>`;
    body.querySelectorAll('.sy-pos').forEach(a=>a.onclick=e=>{ e.preventDefault(); _capSyV.src.file=a.dataset.f; _capSyV.src.line=+a.dataset.l; capNavOpen('sy:src'); });
    capFillHeight(body); };
  body.querySelector('#sy-ck-sev').onchange=e=>{ V.sev=e.target.value; fill(); };
  body.querySelector('#sy-ck-code').onchange=e=>{ V.code=e.target.value; fill(); };
  body.querySelector('#sy-ck-q').oninput=e=>{ V.q=e.target.value; fill(); };
  body.querySelector('#sy-ck-info').onchange=e=>{ V.info=e.target.checked; capSyRenderChk(body); };
  body.querySelector('#sy-ck-csv').onclick=()=>capCsvExport(_L('controles-sysml.csv'), [_L('Gravité'),_L('Code'),_L('Contrôle'),_L('Message'),_L('Élément'),_L('Fichier'),_L('Ligne')],
    list().map(d=>[(SEV[d.severity]||SEV.info)[1], d.code, CAP_SY_CODES[d.code]||d.code, d.message, d.el?capCx(capSyName(d.el), d.el._id):'', d.file, d.line]));
  fill();
}

/* ── 🧾 Texte source ─────────────────────────────────────────────────────────────────────────────── */

/** Colore une ligne de texte SysML (mots-clés, noms entre apostrophes, chaînes, nombres, commentaires et notes) et rend
 * cliquables les noms déclarés (lien vers le détail de l'élément).
 * @param {string} line - Ligne @param {object} st - État multiligne {cmt:'/*'|'//*'|''} @param {Map<number,object>} decl - Colonne du nom → élément
 * @returns {string} HTML */
function capSyColorLine(line, st, decl){
  let out='', i=0; const n=line.length, E=capEsc;
  const span=(c,t)=>`<span class="sy-c-${c}">${E(t)}</span>`;
  while(i<n){
    if(st.cmt){ const e=line.indexOf('*/',i); const t=e<0?line.slice(i):line.slice(i,e+2); out+=span(st.cmt==='//*'?'note':'cmt',t); i+=t.length; if(e>=0) st.cmt=''; continue; }
    const c=line[i];
    if(c==='/'&&line[i+1]==='/'&&line[i+2]==='*'){ st.cmt='//*'; continue; }
    if(c==='/'&&line[i+1]==='/'){ out+=span('note',line.slice(i)); break; }
    if(c==='/'&&line[i+1]==='*'){ st.cmt='/*'; continue; }
    if(c==='"'||c==="'"){ let j=i+1; while(j<n&&line[j]!==c){ if(line[j]==='\\') j++; j++; } const t=line.slice(i,j+1), el=decl.get(i+1);
      out+=el?`<a class="sy-c-name" data-id="${el._id}">${E(t)}</a>`:span(c==='"'?'str':'q',t); i=j+1; continue; }
    if(/[A-Za-z_]/.test(c)){ let j=i+1; while(j<n&&/[A-Za-z0-9_]/.test(line[j])) j++; const w=line.slice(i,j), el=decl.get(i+1);
      out+=el?`<a class="sy-c-name" data-id="${el._id}">${E(w)}</a>`:CAP_SY_KEYWORDS.has(w)?span('kw',w):E(w); i=j; continue; }
    if(/[0-9]/.test(c)){ let j=i+1; while(j<n&&/[0-9.eE]/.test(line[j])) j++; out+=span('num',line.slice(i,j)); i=j; continue; }
    out+=E(c); i++;
  }
  return out;
}

/** 🧾 Texte source : fichiers .sysml numérotés et colorés, diagnostics en marge, noms déclarés cliquables ;
 * ⬇ téléchargement du fichier ou du projet. @param {HTMLElement} body */
function capSyRenderSrc(body){
  const V=_capSyV.src, F=_capSy.M.files;
  if(!F.some(f=>f.path===V.file)) V.file=F[0].path;
  const f=F.find(x=>x.path===V.file);
  body.innerHTML=capSyBar(_L(`<label>Fichier</label> <select id="sy-src-f" class="phl-filter-input">${F.map(x=>`<option value="${capEsc(x.path)}"${x.path===V.file?' selected':''}>${capEsc(x.path)}</option>`).join('')}</select>
    <input type="search" class="phl-filter-input" id="sy-src-q" placeholder="🔍 Rechercher dans le texte (Entrée : suivant)">
    <span class="ana-fn-cnt" id="sy-src-cnt"></span><span style="flex:1"></span><button class="phl-export-btn" id="sy-src-dl" title="Télécharger ce fichier .sysml">⬇ .sysml</button>`))+
    '<div class="sy-src" data-fill="8"></div>';
  // Noms déclarés (ligne → colonne du nom → élément) et diagnostics par ligne
  const decl=new Map(); _capSy.M.all.forEach(e=>{ if(e.file!==f.path||!e.declaredName||!e.name||e.isFileRoot) return;
    const ln=f.text.split('\n')[e.line-1]||''; const q=/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.name)?e.name:"'"+e.name;
    let k=ln.indexOf(q, Math.max(0,e.col-1)); if(k<0) return; const re=/^[A-Za-z_]/.test(q)?new RegExp('\\b'+q.replace(/[$]/g,'\\$')+'\\b','g'):null;
    if(re){ re.lastIndex=Math.max(0,e.col-1); const m=re.exec(ln); if(!m) return; k=m.index; }
    (decl.get(e.line)||decl.set(e.line,new Map()).get(e.line)).set(k+1, e); });   // colonne (1 = début de ligne) du nom ou de son apostrophe
  const diag=new Map(); capSyDiags(false).filter(d=>d.file===f.path).forEach(d=>(diag.get(d.line)||diag.set(d.line,[]).get(d.line)).push(d));
  const st={cmt:''};
  const lines=f.text.split('\n').map((ln,i)=>{ const d=diag.get(i+1), sev=d?(d.some(x=>x.severity==='error')?'err':'warn'):'';
    return `<div class="sy-ln${sev?' sy-ln-'+sev:''}" data-ln="${i+1}"${d?` title="${capEsc(d.map(x=>x.message).join('\n'))}"`:''}><span class="sy-lno">${i+1}</span><span class="sy-lmk">${sev?(sev==='err'?'✖':'⚠'):''}</span><span class="sy-ltx">${capSyColorLine(ln.replace(/\r$/,''), st, decl.get(i+1)||new Map())||' '}</span></div>`; }).join('');
  const box=body.querySelector('.sy-src'); box.innerHTML=lines;
  body.querySelector('#sy-src-cnt').textContent=_L(`${f.text.split('\n').length} ligne(s) · ${[...diag.values()].reduce((s,l)=>s+l.length,0)} diagnostic(s)`);
  box.onclick=e=>{ const a=e.target.closest('.sy-c-name'); if(a) capOpenDetail(a.dataset.id); };
  body.querySelector('#sy-src-f').onchange=e=>{ V.file=e.target.value; V.line=0; capSyRenderSrc(body); };
  body.querySelector('#sy-src-dl').onclick=()=>capDownloadBlob(new Blob([f.text],{type:'text/plain'}), f.path.split('/').pop());
  let hits=[], hi=-1;
  const q=body.querySelector('#sy-src-q');
  q.oninput=()=>{ box.querySelectorAll('.sy-ln.sy-hit').forEach(x=>x.classList.remove('sy-hit')); hi=-1; const v=q.value.trim().toLowerCase(); if(!v){ hits=[]; return; }
    hits=[...box.querySelectorAll('.sy-ln')].filter(x=>x.textContent.toLowerCase().includes(v)); hits.forEach(x=>x.classList.add('sy-hit')); };
  q.onkeydown=e=>{ if(e.key==='Enter'&&hits.length){ hi=(hi+1)%hits.length; hits[hi].scrollIntoView({block:'center'}); } };
  capFillHeight(body);
  if(V.line){ const l=box.querySelector(`[data-ln="${V.line}"]`); if(l){ l.classList.add('sy-ln-cur'); setTimeout(()=>l.scrollIntoView({block:'center'}),0); } }
}

/* ── Panneau de détail : section SysML ──────────────────────────────────────────────────────────── */

/**
 * Section ◇ SysML v2 du panneau de détail : déclaration en notation textuelle, position dans le texte source (lien vers
 * 🧾 Texte source) et extrait, références à la bibliothèque standard, membres hérités (^), diagnostics de l'élément,
 * ouverture des vues centrées sur l'élément.
 * @param {string} id - Identifiant de l'élément
 * @param {function(string,string=):string} secTitle - Titre de section du panneau
 * @returns {string} HTML
 */
function capSyDetail(id, secTitle){
  const el=_capSy&&_capSy.byId.get(id); if(!el) return '';
  let h=secTitle(_L('◇ SysML v2'),'var(--c-accent)');
  if(!el.isFileRoot) h+=`<pre class="sy-decl">${capEsc(capSyDeclText(el))}${el.members.length?' { … }':';'}</pre>`;
  const f=_capSy.M.files.find(x=>x.path===el.file);
  if(f&&el.line){
    const L=f.text.split('\n'), a=el.line-1, b=Math.min(L.length, Math.max(el.endLine||el.line, el.line), a+14);
    // Extrait désindenté (tabulations → 4 espaces, marge commune retirée)
    const ex=L.slice(a,b).map(x=>x.replace(/\r$/,'').replace(/\t/g,'    ')), m=Math.min(...ex.filter(x=>x.trim()).map(x=>x.length-x.trimStart().length));
    h+=`<div style="font-size:11px;margin:4px 0"><a href="#" style="color:var(--c-accent)" onclick="event.preventDefault();capSyOpenOn('src','${capEsc(id)}')">🧾 ${capEsc(el.file)}, ${_L('ligne')} ${el.line}</a></div>`+
      `<pre class="sy-excerpt">${capEsc(ex.map(x=>x.slice(isFinite(m)?m:0)).join('\n'))}${b<(el.endLine||0)?'\n…':''}</pre>`;
  }
  const lib=[]; Object.keys(el.res).forEach(k=>(el.res[k]||[]).forEach(r=>{ if(r&&r.lib&&!r.inherited) lib.push(r.lib.replace(/^\*::/,'')); }));
  if(lib.length) h+=`<div style="font-size:11px;margin:6px 0"><span class="ana-dim">${_L('Bibliothèque standard :')}</span> <code>${capEsc([...new Set(lib)].join(', '))}</code></div>`;
  if(el.isDef||/Usage$/.test(el.kind)){
    const inh=capSyMembersOf(el, true).filter(x=>x.inh);
    if(inh.length) h+=`<div style="font-size:11px;margin:6px 0"><span class="ana-dim">${_L('Membres hérités')} (${inh.length}) :</span><div style="margin-top:3px">${inh.slice(0,40).map(x=>`<div>^ ${capSyLink(x.m, capSyCut(capSyDeclText(x.m,true)||capSyName(x.m),70))}</div>`).join('')}${inh.length>40?'<div>…</div>':''}</div></div>`;
  }
  const D=_capSy.M.diags.filter(d=>d.el===el);
  if(D.length) h+=D.map(d=>`<div style="font-size:11px;color:${d.severity==='error'?'var(--c-err,#f85149)':'var(--c-warn,#e3b341)'}">${d.severity==='error'?'✖':'⚠'} ${capEsc(d.message)}</div>`).join('');
  const btn=(sub,l)=>`<button class="phl-toggle-btn" onclick="capSyOpenOn('${sub}','${capEsc(id)}')">${l}</button>`;
  const b=[];
  if(el.kind==='Package'||el.isDef||(/Usage$/.test(el.kind)&&el.members.length)) b.push(btn('gv',_L('◇ General View')));
  if(/^(Part|Item|Connection|Interface)/.test(el.kind)) b.push(btn('iv',_L('⧉ Interconnection')));
  if(/^(Action|PerformAction|Calculation|UseCase|Case|VerificationCase|AnalysisCase)/.test(el.kind)) b.push(btn('afv',_L('⇢ Action Flow')));
  if(/^(State|ExhibitState)/.test(el.kind)) b.push(btn('stv',_L('◎ State Transition')));
  if(b.length) h+=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${b.join('')}</div>`;
  return h;
}

/* ── 📐 Tableau de bord : indicateurs SysML ─────────────────────────────────────────────────────── */

/** Ajoute les indicateurs SysML au catalogue du tableau de bord (35-tableau-de-bord.js).
 * @param {function} add - add(groupe, id, libellé, sorte, calcul, aide) @param {function(string):string} LC - Couleur d'une couche */
function capSyDashCatalog(add, LC){
  if(!_capSy) return;
  const G=_L('SysML v2'), ALL=()=>capSyEls(()=>true), RQ=()=>capSyRequirements();
  add(G,'sy.fam',_L('SysML — éléments par famille'),'series',()=>({order:'natural', cats:Object.keys(CAP_SY_LAYERS).map(k=>({l:CAP_SY_LAYERS[k].label, v:ALL().filter(e=>capSyLayerOf(e.kind)===k).length, c:LC(k)})).filter(x=>x.v)}));
  add(G,'sy.du',_L('SysML — définitions et usages'),'series',()=>({cats:[{l:_L('Définitions'),v:ALL().filter(e=>e.isDef).length},{l:_L('Usages'),v:ALL().filter(e=>/Usage$/.test(e.kind)).length}].filter(x=>x.v)}));
  add(G,'sy.kw',_L('SysML — mots-clés les plus utilisés'),'series',()=>({cats:capDashCount(ALL().filter(e=>e.keyword),e=>e.keyword).slice(0,15)}));
  add(G,'sy.req.n',_L('SysML — exigences'),'n',()=>({n:RQ().length, sub:_L(`${RQ().filter(r=>r.el.isDef).length} définition(s)`)}));
  add(G,'sy.req.sat',_L('SysML — exigences satisfaites (satisfy)'),'pct',()=>capDashPct(RQ(),r=>r.sat.length));
  add(G,'sy.req.ver',_L('SysML — exigences vérifiées (verify)'),'pct',()=>capDashPct(RQ(),r=>r.ver.length));
  add(G,'sy.doc',_L('SysML — définitions documentées (doc)'),'pct',()=>capDashPct(ALL().filter(e=>e.isDef),e=>e.docs.some(Boolean)));
  add(G,'sy.chk',_L('SysML — contrôles par code'),'series',()=>({cats:capDashCount(capSyDiags(true),d=>CAP_SY_CODES[d.code]||d.code)}));
  add(G,'sy.err',_L('SysML — erreurs (syntaxe, résolution, contrôles)'),'n',()=>({n:_capSy.M.diags.filter(d=>d.severity==='error').length, sub:_L(`${_capSy.M.diags.filter(d=>d.severity==='warning').length} avertissement(s)`)}));
  add(G,'sy.files',_L('SysML — éléments par fichier'),'series',()=>({cats:capDashCount(ALL(),e=>e.file)}));
}
