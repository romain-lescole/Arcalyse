/* ═══════════════════════════════════════════════════════════════════════
   🔗 LIENS ENTRE COUCHES — vue graphique des réalisations OA → SA → LA → PA → EPBS
   ───────────────────────────────────────────────────────────────────────
   Sous-vue de 🔬 Analyses. Une colonne par couche ; les liens de réalisation (FunctionRealization,
   FunctionalChainRealization, ComponentRealization, CapabilityRealization…, calculés par capComputeTrace)
   sont tracés d'une colonne à l'autre, flèche vers l'élément réalisé.
   Deux modes : à partir d'un élément (ce qu'il réalise en remontant, ce qui le réalise en descendant, ou tous
   les liens de proche en proche) ou toute une catégorie (fonctions, chaînes, capacités, composants…).
   Option « fonctions des chaînes » : sous chaque chaîne, ses fonctions, avec leurs propres liens de réalisation
   (on voit quelles fonctions LA réalisent quelles fonctions SA d'une chaîne réalisée).
   Clic : détail ; double-clic : repartir de l'élément ; clic droit : commentaire de revue.
   Exports SVG, PNG, CSV ; ajout au 📑 dossier de relecture ouvert (bloc « xlay », dessiné à l'export).
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la vue : mode ('el' | 'cat'), élément de départ, sens ('dir' | 'all'), catégorie, fonctions des chaînes, recherche, zoom. */
const _capXl = { mode:'el', seed:'', dir:'dir', cat:'chain', fnCh:true, q:'', zoom:1 };
/** Nombre maximal d'éléments dessinés. */
const CAP_XL_MAX=400;

/**
 * Graphe des liens entre couches.
 * @param {object} o - {mode, seed, dir, cat, fnCh}
 * @returns {{nodes:Map<string,object>, edges:object[], trop:boolean}} nœuds {id, name, type, layer, cat, parent?, seed?}, liens {s (réalise), t (réalisé), type}
 */
function capXlCompute(o){
  const d=capComputeTrace(false,false), {xmap}=capAnaCtx(), nodes=new Map(), cle=new Set(), edges=[];
  const info=id=>{ const x=xmap[id]; if(!x) return null; const e=capAnaEl(x), c=capTraceCatOf(e.type); return Object.assign(e,{cat:c?c.k:''}); };
  const ok=e=>e&&CAP_ANA_LAYERS.includes(e.layer);
  const add=e=>{ if(!ok(e)) return false; if(!nodes.has(e.id)){ if(nodes.size>=CAP_XL_MAX) return false; nodes.set(e.id, Object.assign({}, e)); } return true; };
  const lien=l=>{ const k=l.src.id+'>'+l.tgt.id; if(cle.has(k)||!nodes.has(l.src.id)||!nodes.has(l.tgt.id)) return; cle.add(k); edges.push({s:l.src.id, t:l.tgt.id, type:l.type}); };
  if(o.mode==='cat'){
    d.links.forEach(l=>{ const a=info(l.src.id), b=info(l.tgt.id); if(a&&b&&a.cat===o.cat&&b.cat===o.cat&&add(a)&&add(b)) lien(l); });
  } else {
    const s=info(o.seed); if(!add(s)) return {nodes, edges, trop:false};
    nodes.get(s.id).seed=true;
    const file=[[s.id,'both']], vu=new Set();
    while(file.length){
      const [id,sens]=file.shift(); if(vu.has(id+sens)) continue; vu.add(id+sens);
      if(sens!=='down') (d.down[id]||[]).forEach(l=>{ if(add(info(l.tgt.id))){ lien(l); file.push([l.tgt.id, o.dir==='all'?'both':'up']); } });   // ce qu'il réalise
      if(sens!=='up') (d.up[id]||[]).forEach(l=>{ if(add(info(l.src.id))){ lien(l); file.push([l.src.id, o.dir==='all'?'both':'down']); } });   // ce qui le réalise
    }
  }
  // Fonctions des chaînes (et leurs liens entre elles)
  if(o.fnCh&&typeof capComputeChains==='function'){
    if(!capChainsData) capChainsData=capComputeChains();
    [...nodes.values()].filter(n=>n.cat==='chain').forEach(ch=>{
      const c=capChainsData.find(x=>x.id===ch.id); if(!c) return;
      (c.graph&&c.graph.nodes||[]).forEach(n=>{ if(!n.refId||nodes.has(n.refId)) return; const e=info(n.refId); if(add(e)) nodes.get(e.id).parent=ch.id; });
    });
    d.links.forEach(lien);
  }
  return {nodes, edges, trop:nodes.size>=CAP_XL_MAX};
}

/**
 * Dessin SVG autonome (fond blanc) des liens entre couches : colonnes, groupes chaîne + fonctions, liens courbes.
 * @param {object} o - Options (capXlCompute)
 * @returns {{svg:string, w:number, h:number, n:number, trop:boolean}}
 */
function capXlSvg(o){
  const g=capXlCompute(o), esc=capEsc;
  if(!g.nodes.size) return {svg:'', w:0, h:0, n:0, trop:false};
  const couches=CAP_ANA_LAYERS.filter(L=>[...g.nodes.values()].some(n=>n.layer===L));
  // Groupes : un élément, ou une chaîne suivie de ses fonctions
  const groupes=couches.map(L=>{
    const l=[...g.nodes.values()].filter(n=>n.layer===L&&!(n.parent&&g.nodes.has(n.parent)&&g.nodes.get(n.parent).layer===L));
    return l.map(h=>({h, m:[...g.nodes.values()].filter(n=>n.parent===h.id&&n.layer===L)})).sort((a,b)=>a.h.name.localeCompare(b.h.name,'fr'));
  });
  // Ordre des groupes : barycentre des voisins dans les autres couches (quelques passes)
  const rang=new Map(), voisins=new Map();
  g.edges.forEach(e=>{ [[e.s,e.t],[e.t,e.s]].forEach(([a,b])=>{ (voisins.get(a)||voisins.set(a,[]).get(a)).push(b); }); });
  const num=()=>groupes.forEach(l=>{ let i=0; l.forEach(G=>[G.h,...G.m].forEach(n=>rang.set(n.id,i++))); });
  num();
  for(let p=0;p<6;p++){
    (p%2?groupes.slice().reverse():groupes).forEach(l=>{
      const bary=n=>{ const v=(voisins.get(n.id)||[]).filter(id=>rang.has(id)&&g.nodes.get(id).layer!==n.layer).map(id=>rang.get(id)); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; };
      l.forEach(G=>{ if(G.m.length>1){ G.m.forEach(n=>{ const b=bary(n); n.b=b!=null?b:(n.b!=null?n.b:rang.get(n.id)); }); G.m.sort((a,b)=>a.b-b.b); }   // fonctions d'une chaîne
        const v=[G.h,...G.m].flatMap(n=>voisins.get(n.id)||[]).filter(id=>rang.has(id)&&g.nodes.get(id).layer!==G.h.layer).map(id=>rang.get(id));
        G.b=v.length?v.reduce((a,b)=>a+b,0)/v.length:(G.b!=null?G.b:rang.get(G.h.id)); });
      l.sort((a,b)=>a.b-b.b);
    });
    num();
  }
  // Positions
  const PAD=20, CW=230, GAP=150, HH=46, HM=26, TOP=46, pos=new Map();
  let H=0;
  groupes.forEach((l,i)=>{ const x=PAD+i*(CW+GAP); let y=TOP;
    l.forEach(G=>{ pos.set(G.h.id,{x, y, w:CW, h:HH}); let yy=y+HH+4;
      G.m.forEach(n=>{ pos.set(n.id,{x:x+16, y:yy, w:CW-16, h:HM}); yy+=HM+3; });
      G.y0=y; G.y1=(G.m.length?yy-3:y+HH); y=G.y1+(G.m.length?18:12); });
    H=Math.max(H,y); });
  const W=PAD*2+couches.length*CW+(couches.length-1)*GAP; H+=PAD;
  const F='Segoe UI,Arial,sans-serif';
  let s=`<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  couches.forEach((L,i)=>{ const c=(CAP_LAYERS[L]||{}).color||'#888', x=PAD+i*(CW+GAP);
    s+=`<rect x="${x}" y="8" width="${CW}" height="26" rx="5" fill="${c}"/><text x="${x+CW/2}" y="25.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="${capInk(c)}">${esc(L)} — ${esc((CAP_LAYERS[L]||{}).label||'')}</text>`; });
  // Cadres des chaînes avec leurs fonctions
  groupes.forEach(l=>l.forEach(G=>{ if(!G.m.length) return; const p=pos.get(G.h.id), c=(CAP_LAYERS[G.h.layer]||{}).color||'#888';
    s+=`<rect x="${p.x-6}" y="${G.y0-6}" width="${CW+12}" height="${G.y1-G.y0+12}" rx="8" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-opacity=".5" stroke-dasharray="4 3"/>`; }));
  // Liens : de l'élément qui réalise vers l'élément réalisé
  let e='';
  g.edges.forEach(x=>{ const a=pos.get(x.s), b=pos.get(x.t); if(!a||!b||a.x===b.x&&a.w===b.w) return;
    const gauche=b.x<a.x, x1=gauche?a.x:a.x+a.w, x2=gauche?b.x+b.w:b.x, y1=a.y+a.h/2, y2=b.y+b.h/2, dx=Math.max(40,Math.abs(x2-x1)/2)*(gauche?-1:1);
    e+=`<path class="xl-e" data-s="${esc(x.s)}" data-t="${esc(x.t)}" d="M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}" fill="none" stroke="#6e7781" stroke-width="1.3" marker-end="url(#xl-fl)"><title>${esc(g.nodes.get(x.s).name)} — ${esc(capAnaHuman(x.type))} → ${esc(g.nodes.get(x.t).name)}</title></path>`; });
  // Nœuds
  let n='';
  g.nodes.forEach(x=>{ const p=pos.get(x.id); if(!p) return; const c=(CAP_LAYERS[x.layer]||{}).color||'#888', tete=p.h===HH;
    const nom=capWrapLines(x.name, tete?30:31, 1)[0]||'';
    n+=`<g class="xl-n" data-ref="${esc(x.id)}" style="cursor:pointer"><title>${esc(x.name)} — ${esc(capAnaHuman(x.type))} (${esc(x.layer)})</title>`+
      `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="5" fill="${tete?'#ffffff':'#f6f8fa'}" stroke="${x.seed?'#0969da':c}" stroke-width="${x.seed?3:tete?1.6:1}"/>`+
      (tete?`<rect x="${p.x}" y="${p.y}" width="5" height="${p.h}" rx="2" fill="${c}"/><text x="${p.x+12}" y="${p.y+15}" font-size="9.5" fill="#57606a">${esc(capAnaHuman(x.type))}</text>`+
        `<text x="${p.x+12}" y="${p.y+33}" font-size="12.5" font-weight="600" fill="#1f2328">${esc(nom)}</text>`
        :`<text x="${p.x+8}" y="${p.y+17}" font-size="11.5" fill="#1f2328">ƒ ${esc(nom)}</text>`)+`</g>`; });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">`+
    `<defs><marker id="xl-fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9 z" fill="#6e7781"/></marker></defs>${s}${e}${n}</svg>`;
  return {svg, w:W, h:H, n:g.nodes.size, trop:g.trop};
}

/**
 * Éléments du modèle qui peuvent servir de départ (catégorie de traçabilité, couche ARCADIA réelle), dont le nom contient un texte.
 * @param {string} t - Texte cherché (minuscules)
 * @param {number} max - Nombre maximal
 * @returns {{id:string, name:string, type:string, layer:string}[]}
 */
function capXlChercher(t, max){
  const {xmap}=capAnaCtx(), out=[];
  for(const e of capAllElements){
    if(!e.attrs.name||!String(e.attrs.name).toLowerCase().includes(t)||!capTraceCatOf(e.typeName)) continue;
    const x=xmap[e.id], L=x?capArchLayerOf(x):''; if(!CAP_ANA_LAYERS.includes(L)) continue;
    out.push({id:e.id, name:e.attrs.name, type:e.typeName, layer:L}); if(out.length>=max*3) break;
  }
  return out;
}
/** @returns {object} options de dessin de la vue (copie de l'état) */
function capXlOpts(){ const u=_capXl; return {mode:u.mode, seed:u.seed, dir:u.dir, cat:u.cat, fnCh:u.fnCh}; }
/** Titre d'un dessin. @param {object} o - Options @returns {string} */
function capXlTitre(o){
  if(o.mode==='cat') return _L('Liens entre couches — ')+((CAP_TRACE_CATS.find(c=>c.k===o.cat)||{}).label||o.cat);
  const e=o.seed&&capLoaded&&capGetElementById_(o.seed); return _L('Liens entre couches — ')+(e?e.attrs.name||o.seed:'');
}

/**
 * Ouvre la vue ⇶ Liens entre couches à partir d'un élément.
 * @param {string} id - Élément de départ
 */
function capXlOpen(id){ Object.assign(_capXl,{mode:'el', seed:id, q:''}); capAnaSub='xlay'; if(capCurrentView==='analyses') capRenderAnalyses(); else capShowView('analyses'); }

/**
 * Éléments proposés au départ : ceux qui ont le plus de liens de réalisation (chaînes et capacités d'abord).
 * @returns {object[]} éléments {id, name, type, layer, n}
 */
function capXlSuggestions(){
  const d=capComputeTrace(false,false), {xmap}=capAnaCtx(), cpt=new Map();
  d.links.forEach(l=>[l.src.id,l.tgt.id].forEach(id=>cpt.set(id,(cpt.get(id)||0)+1)));
  const poids={chain:3, cap:2, fn:1};
  return [...cpt.entries()].map(([id,n])=>{ const x=xmap[id], e=x&&capAnaEl(x), c=e&&capTraceCatOf(e.type); return e&&c&&CAP_ANA_LAYERS.includes(e.layer)?Object.assign(e,{n, p:(poids[c.k]||0)}):null; })
    .filter(Boolean).sort((a,b)=>b.p-a.p||b.n-a.n).slice(0,14);
}

/**
 * Sous-vue 🔬 Analyses › ⇶ Liens entre couches : barre (mode, élément de départ, sens, catégorie, options, exports), dessin.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderXlay(box){
  const u=_capXl, esc=capEsc;
  const chip=e=>`<span class="xl-sug" data-xl-seed="${esc(e.id)}" title="${esc(capAnaHuman(e.type))}"><b style="color:${(CAP_LAYERS[e.layer]||{}).color}">${esc(e.layer)}</b> ${esc(e.name)}</span>`;
  const seedEl=u.seed&&capLoaded&&capGetElementById_(u.seed);
  let bar=`<div class="cap-lf-bar xl-bar"><span class="tb-grp"><button class="phl-toggle-btn${u.mode==='el'?' active':''}" data-xl-mode="el" title="${_L('Liens d\'un élément : ce qu\'il réalise (couches supérieures) et ce qui le réalise (couches inférieures)')}">${_L('◎ À partir d\'un élément')}</button>`+
    `<button class="phl-toggle-btn${u.mode==='cat'?' active':''}" data-xl-mode="cat" title="${_L('Tous les liens entre éléments d\'une catégorie')}">${_L('▦ Toute une catégorie')}</button></span>`;
  if(u.mode==='el') bar+=`<span class="tb-grp xl-find"><input class="phl-filter-input" id="xl-q" placeholder="${_L('🔍 Élément de départ (fonction, chaîne, capacité…)')}" value="${esc(u.q)}" autocomplete="off"><div class="xl-res" id="xl-res"></div></span>`+
    `<span class="tb-grp"><select id="xl-dir" title="${_L('Sens du parcours')}"><option value="dir"${u.dir==='dir'?' selected':''}>${_L('Réalisations vers le haut et vers le bas')}</option><option value="all"${u.dir==='all'?' selected':''}>${_L('Tous les liens de proche en proche')}</option></select></span>`;
  else bar+=`<span class="tb-grp"><select id="xl-cat">${CAP_TRACE_CATS.map(c=>`<option value="${c.k}"${u.cat===c.k?' selected':''}>${esc(c.label)}</option>`).join('')}</select></span>`;
  bar+=`<span class="tb-grp"><label class="xl-opt" title="${_L('Sous chaque chaîne, ses fonctions et leurs liens de réalisation')}"><input type="checkbox" id="xl-fn"${u.fnCh?' checked':''}> ${_L('Fonctions des chaînes')}</label>`+
    `<button class="cap-lf-btn" data-xl-z="-1" title="${_L('Réduire')}">−</button><button class="cap-lf-btn" data-xl-z="1" title="${_L('Agrandir')}">+</button></span>`+
    `<span class="tb-grp"><button class="phl-export-btn" data-xl-x="svg" style="margin-left:0">${_L('⬇ SVG')}</button><button class="phl-export-btn" data-xl-x="png" style="margin-left:0">${_L('🖼 PNG')}</button>`+
    `<button class="phl-export-btn" data-xl-x="csv" style="margin-left:0">${_L('⬇ CSV')}</button><button class="phl-export-btn" data-xl-x="dos" style="margin-left:0" title="${_L('Ajoute ce dessin au 📑 dossier de relecture ouvert (redessiné à chaque export du dossier)')}">${_L('📑 Au dossier')}</button>`+
    `<button class="phl-export-btn" data-xl-x="dash" style="margin-left:0" title="${_L('Ajoute ce dessin au 📐 tableau de bord affiché (redessiné sur le modèle chargé)')}">${_L('📐 Au tableau de bord')}</button></span></div>`;
  const o=capXlOpts();
  let corps;
  if(u.mode==='el'&&!seedEl) corps=`<div class="xl-vide">${_L('Choisissez un élément de départ (recherche ci-dessus), par exemple :')}<div class="xl-sugs">${capXlSuggestions().map(chip).join('')}</div></div>`;
  else { const r=capXlSvg(o);
    corps=r.n?`<div class="xl-info">${u.mode==='el'?`${_L('Départ :')} ${capDetLink(u.seed, seedEl.attrs.name||u.seed)} · `:''}${_L(`${r.n} élément(s)`)}${r.trop?` · <span style="color:var(--c-warn,#e3b341)">${_L(`limité à ${CAP_XL_MAX} éléments`)}</span>`:''}`+
      ` · <span class="ana-dim">${_L('Flèche : réalise (vers la couche supérieure). Clic : détail · double-clic : repartir de l\'élément · clic droit : commenter.')}</span></div>`+
      `<div class="xl-scroll" data-fill="6"><div class="xl-svg" style="width:${r.w*u.zoom}px">${r.svg.replace('<svg ',`<svg style="width:${r.w*u.zoom}px;height:${r.h*u.zoom}px" `)}</div></div>`
      :`<div class="xl-vide">${u.mode==='el'?_L('Aucun lien de réalisation pour cet élément.'):_L('Aucun lien de réalisation dans cette catégorie.')}${u.mode==='el'?`<div class="xl-sugs">${capXlSuggestions().map(chip).join('')}</div>`:''}</div>`; }
  box.innerHTML=bar+corps;
  capFillHeight(box);
  capXlWire(box);
}

/**
 * Branche les commandes de la sous-vue (après chaque rendu) : recherche, options, exports, nœuds du dessin.
 * @param {HTMLElement} box - Conteneur
 */
function capXlWire(box){
  const u=_capXl, re=()=>capRenderXlay(box), q=box.querySelector('#xl-q'), res=box.querySelector('#xl-res');
  box.querySelectorAll('[data-xl-mode]').forEach(b=>b.onclick=()=>{ u.mode=b.dataset.xlMode; re(); });
  box.querySelectorAll('[data-xl-seed]').forEach(b=>b.onclick=()=>{ Object.assign(u,{seed:b.dataset.xlSeed, q:''}); re(); });
  box.querySelector('#xl-dir')?.addEventListener('change',e=>{ u.dir=e.target.value; re(); });
  box.querySelector('#xl-cat')?.addEventListener('change',e=>{ u.cat=e.target.value; re(); });
  box.querySelector('#xl-fn')?.addEventListener('change',e=>{ u.fnCh=e.target.checked; re(); });
  box.querySelectorAll('[data-xl-z]').forEach(b=>b.onclick=()=>{ u.zoom=Math.max(.3,Math.min(2.5,u.zoom*(+b.dataset.xlZ>0?1.25:0.8))); re(); });
  if(q) q.oninput=()=>{ u.q=q.value; const t=q.value.trim().toLowerCase();
    if(t.length<2){ res.innerHTML=''; return; }
    const d=capComputeTrace(false,false), lies=new Set(); d.links.forEach(l=>{ lies.add(l.src.id); lies.add(l.tgt.id); });
    const l=capXlChercher(t, 40).sort((a,b)=>(lies.has(b.id)-lies.has(a.id))||String(a.name).localeCompare(b.name)).slice(0,40);
    res.innerHTML=l.map(e=>`<div class="ctx-i" data-xl-seed="${capEsc(e.id)}">${capIco(e.id,14)}<b style="color:${(CAP_LAYERS[e.layer]||{}).color};font-size:10px">${capEsc(e.layer)}</b> ${capEsc(e.name)} <span class="ana-dim">${capEsc(capAnaHuman(e.type))}${lies.has(e.id)?'':_L(' · sans lien')}</span></div>`).join('')||`<div class="ana-dim" style="padding:4px 8px">${_L('Aucun élément.')}</div>`;
    res.querySelectorAll('[data-xl-seed]').forEach(b=>b.onclick=()=>{ Object.assign(u,{seed:b.dataset.xlSeed, q:''}); re(); });
  };
  box.querySelectorAll('[data-xl-x]').forEach(b=>b.onclick=()=>capXlExport(b.dataset.xlX).catch(e=>capAlert(e.message,{level:'err'})));
  const svg=box.querySelector('.xl-svg svg'); if(!svg) return;
  svg.querySelectorAll('.xl-n').forEach(n=>{
    n.addEventListener('click',()=>capOpenDetailById(n.dataset.ref));
    n.addEventListener('dblclick',()=>{ Object.assign(u,{mode:'el', seed:n.dataset.ref}); re(); });
    n.addEventListener('mouseenter',()=>{ const id=n.dataset.ref; svg.classList.add('xl-hl');
      svg.querySelectorAll('.xl-e').forEach(e=>{ if(e.dataset.s===id||e.dataset.t===id){ e.classList.add('on'); [e.dataset.s,e.dataset.t].forEach(k=>svg.querySelector(`.xl-n[data-ref="${CSS.escape(k)}"]`)?.classList.add('on')); } }); });
    n.addEventListener('mouseleave',()=>{ svg.classList.remove('xl-hl'); svg.querySelectorAll('.on').forEach(x=>x.classList.remove('on')); });
  });
}

/**
 * Exporte le dessin affiché : SVG, PNG, CSV des liens, ou bloc dans le 📑 dossier de relecture ouvert.
 * @param {string} f - 'svg' | 'png' | 'csv' | 'dos' | 'dash' (tableau de bord affiché)
 */
async function capXlExport(f){
  const o=capXlOpts(), titre=capXlTitre(o), nom=capSafeFileName(titre);
  if(f==='dos'){
    if(o.mode==='el'&&!o.seed) return;
    let d=capDosCur(); if(!d) d=capDosNouveau();
    const ref=o.mode==='el'?capHomeRefEl(o.seed):null;
    d.blocs.push({id:capHomeUid(), k:'chap', titre, ref:null, desc:false, blocs:[{id:capHomeUid(), k:'xlay', ref, opts:o}]});
    capHomeSave(); capWatchFlash(_L(`✔ Ajouté au dossier « ${d.titre} » (🏠 Accueil › 📑 Dossiers de relecture)`)); return;
  }
  if(f==='dash'){
    if(o.mode==='el'&&!o.seed) return;
    if(!capDashStore||!capDashStore.list||!capDashStore.list.length){ const d=capDashExample(); capDashStore={cur:d.id,list:[d]}; }
    const d=capDashStore.list.find(x=>x.id===capDashStore.cur)||capDashStore.list[0];
    d.widgets.push({id:capDashUid(), m:'xlay', v:'img', w:Math.min(d.cols||4,4), h:3, opts:o}); capDashSave();
    capWatchFlash(_L(`✔ Ajouté au tableau de bord « ${d.name} » (📐 Tableau de bord)`)); return;
  }
  if(f==='csv'){ const g=capXlCompute(o);
    capCsvDownload(nom+'.csv', [_L('Élément qui réalise'), _L('Couche'), 'Type', _L('Lien'), _L('Élément réalisé'), _L('Couche'), 'Type'],
      g.edges.map(e=>{ const a=g.nodes.get(e.s), b=g.nodes.get(e.t); return [a.name, a.layer, capAnaHuman(a.type), capAnaHuman(e.type), b.name, b.layer, capAnaHuman(b.type)]; })); return; }
  const r=capXlSvg(o); if(!r.n) return;
  if(f==='svg'){ capDownloadBlob(new Blob([r.svg],{type:'image/svg+xml'}), nom+'.svg'); return; }
  const c=await capSvgToCanvas(r.svg, r.w, r.h, 2);
  capDownloadBlob(await capCanvasBlob(c,'image/png'), nom+'.png');
}
