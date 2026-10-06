/* ══ 🧱 LOGICAL COMPONENT / 🧱 SYSTEM COMPONENT (VUE BLOCS) ═════════════════════════
 * Même logique que ƒ⇆ Functional Exchange, pour les composants d'une couche : 🧱 Logical Component (LA) et
 * 🧱 System Component (SA), même code et mêmes couleurs.
 * ◧ Vue Blocs (chaque composant dessiné comme dans Capella : boîte bleue pour le système, bleu clair pour un acteur ;
 * Component Ports sur les bords selon leur orientation UNSET / IN / OUT / INOUT ; à côté de chaque port, le
 * Component Exchange et le composant distant, cliquable pour aller à son bloc), ▣ Vue Composant (échanges par
 * composant), ≡ Vue Ligne, ▦ Matrice composant × composant, 🩺 Contrôles. Pagination par 100 ; matrice ≤ 100 composants.
 * (Les Physical Components sont traités par 🔀 Behavior Exchange et 🔌 Physical Link.)
 */
var CAP_CB_PAGE=100, CAP_CB_MX_MAX=100;
var _capCbView={LA:'block', SA:'block'};
/** Vues 🧱 par couche : conteneur, clé de vue (barre), libellé. */
var CAP_CB_LAYERS={LA:{view:'cblk', box:'cap-view-cblk', l:'🧱 Logical Component', what:'Logical Components', scope:'Couche LA', lw:'Component Exchanges'},
                   SA:{view:'csys', box:'cap-view-csys', l:'🧱 System Component', what:'System Components', scope:'Couche SA', lw:'Component Exchanges'},
                   // Vues Blocs intégrées : 🔀 Behavior Exchange (PA, Behavior) et 🔌 Physical Link (PA, nœuds)
                   PB:{l:'🔀 Behavior Exchange', what:'Physical Components Behavior', scope:'Couche PA · Behavior', lw:'Component Exchanges', only:true},
                   PN:{l:'🔌 Physical Link', what:'Physical Components Node', scope:'Couche PA · Nodes', lw:'Physical Links', only:true}};
var _capCbGo=null;   // {L, id} : composant à afficher à la prochaine ouverture d'une Vue Blocs (depuis une autre vue)

/** Ouvre le bloc d'un composant dans la Vue Blocs de sa couche (🧱 System / Logical Component, 🔀 Behavior Exchange,
 * 🔌 Physical Link) ; à défaut (couche OA, composant inconnu), ouvre son panneau de détail.
 * @param {string} id - Identifiant du composant ou de l'acteur
 */
function capCbOpenComp(id){
  const c=capComputeComponentBlocks().byId[id];
  const L=!c?'':c.layer==='SA'?'SA':c.layer==='LA'?'LA':c.layer==='PA'?(c.nature==='NODE'?'PN':'PB'):'';
  if(!L){ capOpenDetailById(id); return; }
  _capCbGo={L, id};
  if(L==='PB'){ _capCompExView='block'; const v=document.getElementById('cap-view-compex'); if(v&&v._cex) v._cex.view='block'; capNavOpen('compex'); }
  else if(L==='PN'){ _capPhysLinkView='block'; const v=document.getElementById('cap-view-physlink'); if(v&&v._phl) v._phl.view='block'; capNavOpen('physlink'); }
  else { const v=document.getElementById(CAP_CB_LAYERS[L].box); if(v&&v._cb) v._cb.view='block'; else _capCbView[L]='block'; capNavOpen(CAP_CB_LAYERS[L].view); }
}

/** Types de composants dessinés (versions récentes et anciennes de Capella). */
var CAP_CB_TYPES=/^(Entity|SystemComponent|LogicalComponent|PhysicalComponent|SystemActor|LogicalActor|PhysicalActor|OperationalActor)$/;

/** Composants du modèle avec leurs ports, échanges, sous-composants et fonctions allouées.
 * @returns {{comps:object[], byId:object, portLinks:object, links:object[]}} Résultat (mis en cache)
 */
function capComputeComponentBlocks(){
  if(_capAnaCache.cblk) return _capAnaCache.cblk;
  const {all}=capAnaCtx(), links=capComputeCompExchanges();
  const byId={}, comps=[];
  all.forEach(el=>{
    const t=capTName(el); if(!CAP_CB_TYPES.test(t)) return;
    const id=capXId(el); if(!id||byId[id]) return;
    const actor=capIsActorEl(el), nature=el.getAttribute('nature')||'';
    const c={id, name:capXName(el)||'—', type:t, layer:capArchLayerOf(el), actor, nature, kind:actor?'act':(t==='PhysicalComponent'&&nature==='NODE'?'node':'sys'),
      parent:'', children:[], ports:[], fns:[], el};
    byId[id]=c; comps.push(c);
  });
  comps.forEach(c=>{ for(let p=c.el.parentElement; p; p=p.parentElement){ const q=byId[capXId(p)]; if(q){ c.parent=q.id; q.children.push(c.id); break; } } });
  (links.allPorts||[]).forEach(p=>{ const c=byId[p.pcId]; if(c) c.ports.push({id:p.portId, name:p.portName, orient:p.orient}); });
  const portLinks={};
  links.forEach(l=>{ [l.src.portId,l.tgt.portId].forEach(pid=>{ (portLinks[pid]=portLinks[pid]||[]).push(l); }); });
  capComputeFunctions().list.forEach(f=>f.alloc.forEach(a=>{ const c=byId[a.id]; if(c) c.fns.push({id:f.id, name:f.name}); }));
  comps.forEach(c=>delete c.el);
  return _capAnaCache.cblk={comps, byId, portLinks, links};
}

/** Sections de contrôle des composants et de leurs ports (rapport 🩺 et tableau de bord).
 * @param {string} [layer] - Couche filtrée ('all' ou absent : toutes)
 * @returns {object[]} Sections {icon,title,tip,cols,items}
 */
function capCbChecks(layer){
  const C=capComputeComponentBlocks(), inL=o=>!layer||layer==='all'||o.layer===layer;
  const cs=C.comps.filter(inL), ls=C.links.filter(inL);
  const fl=(id,n)=>`<span class="cex-det" style="cursor:pointer" onclick="capOpenDetailById('${capEsc(id)}')">${capEsc(n)}</span>`;
  const orphan=[]; cs.forEach(c=>c.ports.forEach(p=>{ if(!(C.portLinks[p.id]||[]).length) orphan.push({c,p}); }));
  const unset=[]; cs.forEach(c=>c.ports.forEach(p=>{ if(p.orient==='UNSET'&&(C.portLinks[p.id]||[]).length) unset.push({c,p}); }));
  const leaf=c=>!c.children.length;
  return [
    {icon:'⭘', title:'Ports de composant orphelins (sans Component Exchange)', tip:'Component Port défini mais relié à aucun échange', cols:['Composant','Port','Orientation','Couche'],
      items:orphan.map(o=>`<tr><td>${fl(o.c.id,o.c.name)}</td><td>${fl(o.p.id,o.p.name)}</td><td>${o.p.orient}</td><td>${o.c.layer}</td></tr>`)},
    {icon:'?', title:'Ports connectés sans orientation (UNSET)', tip:'Le sens du flux n\'est pas défini sur le port', cols:['Composant','Port','Couche'],
      items:unset.map(o=>`<tr><td>${fl(o.c.id,o.c.name)}</td><td>${fl(o.p.id,o.p.name)}</td><td>${o.c.layer}</td></tr>`)},
    {icon:'⚠', title:'Échanges aux orientations incohérentes', tip:'OUT → OUT ou IN → IN hors délégation', cols:['Component Exchange','Source','Cible','Couche'],
      items:ls.filter(l=>l.warn).map(l=>`<tr><td>${fl(l.linkId,l.linkName)}</td><td>${fl(l.src.pcId,l.src.pcName)} ⬦ ${capEsc(l.src.portName)}</td><td>${fl(l.tgt.pcId,l.tgt.pcName)} ⬦ ${capEsc(l.tgt.portName)}</td><td>${l.layer}</td></tr>`)},
    {icon:'∅', title:'Composants feuilles sans port', tip:'Composant sans sous-composant et sans Component Port (hors acteurs)', cols:['Composant','Couche'],
      items:cs.filter(c=>leaf(c)&&!c.actor&&!c.ports.length).map(c=>`<tr><td>${fl(c.id,c.name)}</td><td>${c.layer}</td></tr>`)},
    {icon:'ƒ', title:'Composants feuilles sans fonction allouée', tip:'Composant sans sous-composant à qui aucune fonction n\'est allouée', cols:['Composant','Nature','Couche'],
      items:cs.filter(c=>leaf(c)&&!c.fns.length).map(c=>`<tr><td>${fl(c.id,c.name)}</td><td>${c.actor?'Acteur':'Système'}</td><td>${c.layer}</td></tr>`)}
  ];
}

/** Indicateurs 🧱 Composants pour le catalogue du tableau de bord.
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 * @param {Function} LC - Couleur d'une couche
 */
function capCbDashCatalog(add, LC){
  const C=()=>capComputeComponentBlocks();
  Object.entries(CAP_CB_LAYERS).forEach(([L,V])=>{
    const cs=()=>C().comps.filter(c=>c.layer===L), g=V.l.replace('🧱 ','');
    add(g,'cb.n.'+L,`${V.what} — nombre`,'n',()=>({n:cs().length, sub:`dont ${cs().filter(c=>c.actor).length} acteur(s)`}));
    add(g,'cb.ports.'+L,`${V.what} — ports connectés`,'pct',()=>capDashPct(cs().flatMap(c=>c.ports),p=>(C().portLinks[p.id]||[]).length),'Component Ports reliés à au moins un Component Exchange');
    add(g,'cb.chk.'+L,`${V.what} — contrôles`,'series',()=>({cats:capCbChecks(L).map(s=>({l:s.title,v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
  });
}

/** Rend la vue 🧱 d'une couche (barre, filtres, contenu paginé, exports).
 * @param {'LA'|'SA'} [L] - Couche : LA (🧱 Logical Component, défaut) ou SA (🧱 System Component)
 */
function capRenderComponentBlocks(L, host, holder){
  L=CAP_CB_LAYERS[L]?L:'LA';
  const V0=CAP_CB_LAYERS[L];
  const container=host||document.getElementById(V0.box); if(!container) return;
  holder=holder||container;   // porteur de l'état (la vue hôte peut recréer le conteneur)
  const C0=capComputeComponentBlocks();
  // Périmètre : composants et échanges (byId reste global pour les composants distants)
  let C, allLinks;
  const byPort=ls=>{ const m={}; ls.forEach(l=>[l.src.portId,l.tgt.portId].forEach(pid=>(m[pid]=m[pid]||[]).push(l))); return m; };
  if(L==='PB'){
    allLinks=capBehaviorExchanges();
    C={...C0, comps:C0.comps.filter(c=>c.layer==='PA'&&c.type==='PhysicalComponent'&&c.nature!=='NODE'), portLinks:byPort(allLinks)};
  } else if(L==='PN'){
    const PL=capComputePhysLinks(), pp={};
    (PL.allPorts||[]).forEach(p=>(pp[p.pcId]=pp[p.pcId]||[]).push({id:p.portId, name:p.portName, orient:'PP'}));
    allLinks=PL.map(l=>({linkId:l.linkId, linkName:l.linkName, layer:l.layer, dir:'bi', kind:'', fes:[], warn:'', ces:l.ces,
      src:{...l.src, portOrient:'PP'}, tgt:{...l.tgt, portOrient:'PP'}}));
    const byId={...C0.byId};
    const comps=C0.comps.filter(c=>c.layer==='PA'&&c.type==='PhysicalComponent'&&(c.nature==='NODE'||pp[c.id]))
      .map(c=>byId[c.id]={...c, ports:pp[c.id]||[], kind:c.actor?'act':'node'});
    C={...C0, byId, comps, portLinks:byPort(allLinks)};
  } else {
    C={...C0, comps:C0.comps.filter(c=>c.layer===L)};
    allLinks=C0.links.filter(l=>l.layer===L);
  }
  const inScope=new Set(C.comps.map(c=>c.id));
  if(!holder._cb) holder._cb={view:V0.only?'block':_capCbView[L], layer:L, name:'', ex:'', withPorts:C.comps.some(c=>c.ports.length),   // « avec ports » seulement si la couche a des ports
    page:0, nk:new Set(['sys','act','node']), under:'', back:null, fnOpen:new Set()};
  const st=holder._cb; st.layer=L; if(!st.fnOpen) st.fnOpen=new Set(); if(V0.only) st.view='block';
  const NK={sys:{i:'🧩',l:'Système',c:'#58a6ff',tip:'Composants du système'},act:{i:'👤',l:'Acteurs',c:'#7fd8ff',tip:'Acteurs externes'},node:{i:'🖥',l:'Nœuds',c:'#e3b341',tip:'Nœud'}};
  const LINK_COLORS=['#0ea5e9','#f97316','#22c55e','#a855f7','#ef4444','#eab308','#06b6d4','#ec4899','#84cc16','#6366f1','#14b8a6'];
  const lnum={}; allLinks.forEach((l,i)=>lnum[l.linkId]=i+1);
  const lc=l=>LINK_COLORS[(lnum[l.linkId]||0)%LINK_COLORS.length];
  const det=(id,label,extra)=>`<span class="cex-det" style="cursor:pointer;${extra||''}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(id)}')">${capEsc(label)}</span>`;
  const kindOf=id=>{ const c=C.byId[id]; return c?c.kind:'sys'; };
  const kindsIn=[...new Set(C.comps.map(c=>c.kind))];
  const nkOn=()=>kindsIn.some(k=>!st.nk.has(k));
  /** Vrai si le composant est le composant choisi ou l'un de ses sous-composants. */
  const underOk=id=>{ if(!st.under) return true; for(let c=C.byId[id]; c; c=C.byId[c.parent]) if(c.id===st.under) return true; return false; };
  const compOk=c=>inScope.has(c.id)&&(!nkOn()||st.nk.has(c.kind))&&underOk(c.id);

  /** Composants retenus par les filtres (Vue Blocs). */
  function getComps(){
    const nf=st.name.trim().toLowerCase(), xf=st.ex.trim().toLowerCase();
    return C.comps.filter(c=>{
      if(!compOk(c)) return false;
      if(st.withPorts&&!c.ports.length) return false;
      if(nf&&!c.name.toLowerCase().includes(nf)) return false;
      if(xf&&!c.ports.some(p=>(C.portLinks[p.id]||[]).some(l=>l.linkName.toLowerCase().includes(xf)))) return false;
      return true;
    });
  }
  /** Échanges retenus par les filtres (une extrémité au moins doit correspondre). */
  function getLinks(){
    const nf=st.name.trim().toLowerCase(), xf=st.ex.trim().toLowerCase();
    return allLinks.filter(l=>{
      const a=C.byId[l.src.pcId], b=C.byId[l.tgt.pcId];
      if(!((a&&compOk(a))||(b&&compOk(b)))) return false;
      if(nf&&!l.src.pcName.toLowerCase().includes(nf)&&!l.tgt.pcName.toLowerCase().includes(nf)) return false;
      if(xf&&!l.linkName.toLowerCase().includes(xf)) return false;
      return true;
    });
  }
  /** Port façon Capella : UNSET plein, IN / OUT avec chevron orienté selon le côté, INOUT vide.
   * @param {string} o - Orientation @param {'L'|'R'} side - Côté du bloc @param {boolean} orphan - Non connecté */
  const port=(o,side,orphan)=>{
    if(o==='PP') return `<span class="cb-port cb-port-PP${orphan?' cb-port-orphan':''}" title="Physical Port${orphan?' — non connecté':''}"></span>`;
    const ch=o==='IN'?(side==='L'?'&gt;':'&lt;'):o==='OUT'?(side==='L'?'&lt;':'&gt;'):'';
    return `<span class="cb-port cb-port-${o}${orphan?' cb-port-orphan':''}" title="${CAP_ORIENT_STYLE[o]?CAP_ORIENT_STYLE[o].t:o}${orphan?' — non connecté':''}">${ch}</span>`;
  };
  /** Sens d'un échange vu depuis un port : de / vers / ⇄ / — . */
  const roleOf=(l,pid)=>{ const src=l.src.portId===pid; return l.dir==='bi'?'⇄':l.dir==='unset'?'—':((l.dir==='fwd')===src?'vers':'de'); };

  /** Vue Blocs : chaque composant avec ses ports répartis à gauche (IN) et à droite (OUT), INOUT / UNSET du côté le moins chargé. */
  function buildBlocks(cs){
    return `<div class="fex-blocks">${cs.map(c=>{
      const L=[], R=[];
      c.ports.filter(p=>p.orient==='IN').forEach(p=>L.push(p)); c.ports.filter(p=>p.orient==='OUT').forEach(p=>R.push(p));
      c.ports.filter(p=>p.orient!=='IN'&&p.orient!=='OUT').forEach(p=>(L.length<=R.length?L:R).push(p));
      const gL=capBlkRows(L.map(p=>(C.portLinks[p.id]||[]).length)), gR=capBlkRows(R.map(p=>(C.portLinks[p.id]||[]).length));
      const side=(list,g)=>list.map((p,i)=>{
        const ls=C.portLinks[p.id]||[];
        const items=ls.map(l=>{ const o=l.src.portId===p.id?l.tgt:l.src;
          return `${det(l.linkId,l.linkName,`color:${lc(l)};font-weight:600`)} <span class="fex-dim">${roleOf(l,p.id)}</span> <span class="fex-go" data-go="${capEsc(o.pcId)}" title="Aller au bloc de ce composant" style="color:${capTextOn(NK[kindOf(o.pcId)].c)}">${capEsc(o.pcName)}</span>`; });
        const tip=[`${p.name} (${p.orient})`,...ls.map(l=>{ const o=l.src.portId===p.id?l.tgt:l.src; return `${l.linkName} ${roleOf(l,p.id)} ${o.pcName}`; })].join('\n');
        return capBlkSide(items,'<span class="fex-dim"><i>non connecté</i></span>',g.hs[i],tip);
      }).join('');
      const pins=(list,s)=>list.map((p,i)=>`<span class="fex-bpin" style="top:${(s==='L'?gL:gR).tops[i]}px">${port(p.orient,s,!(C.portLinks[p.id]||[]).length)}<span class="fex-pname">${capEsc(p.name)}</span></span>`).join('');
      const fnTip=c.fns.map(f=>f.name).join('\n');
      return `<div class="fex-blk" data-fn="${capEsc(c.id)}" style="--fex-h:${Math.max(74,44+Math.max(gL.total,gR.total))}px">
        <div class="fex-side fex-side-in">${side(L,gL)}</div>
        <div class="fex-box cb-box cb-k-${c.kind}" title="${capEsc(capAnaHuman(c.type))} — ${c.layer}${c.actor?' — acteur':''}${c.nature?' — '+c.nature:''}">
          <div class="fex-box-t"><span class="cb-ic">${c.actor?'👤':c.kind==='node'?'🖥':'▣'}</span> ${det(c.id,c.name)}</div>
          <div class="fex-pins-in">${pins(L,'L')}</div><div class="fex-pins-out">${pins(R,'R')}</div>
          ${c.fns.length?`<div class="cb-fns" data-fnl="${capEsc(c.id)}" title="Afficher / masquer les fonctions allouées (clic sur une fonction : son bloc dans ƒ⇆ Functional Exchange)">ƒ ${c.fns.length} fonction${c.fns.length>1?'s':''} ${st.fnOpen.has(c.id)?'▴':'▾'}</div>`:''}
          ${c.children.length?`<div class="cb-kids" title="${c.children.length} sous-composant(s) : ${capEsc(c.children.map(k=>C.byId[k].name).join(', '))}">⧉ ${c.children.length}</div>`:''}
          ${!c.ports.length?'<div class="fex-box-empty">aucun port</div>':''}
        </div>
        <div class="fex-side fex-side-out">${side(R,gR)}</div>
        ${st.fnOpen.has(c.id)?fnListHtml(c):''}
      </div>`;
    }).join('')}</div>`;
  }
  /** Liste dépliée des fonctions allouées à un composant (filtre au-delà de 12, défilement au-delà de ~10 lignes).
   * @param {object} c - Composant @returns {string} HTML */
  function fnListHtml(c){
    const F=capComputeFunctions(), cmp=new Intl.Collator(undefined,{numeric:true}).compare;
    const fs=c.fns.map(x=>F.byId[x.id]||x).sort((a,b)=>cmp(String(a.num||''),String(b.num||''))||String(a.name).localeCompare(b.name));
    return `<div class="cb-fnlist" data-fnlist="${capEsc(c.id)}">
      <div class="cb-fnhead">ƒ ${fs.length} fonction${fs.length>1?'s':''} allouée${fs.length>1?'s':''} à « ${capEsc(c.name)} » <span class="fex-dim">— clic : son bloc dans ƒ⇆ Functional Exchange</span></div>
      ${fs.length>12?'<input class="phl-filter-input cb-fnq" placeholder="🔍 Filtrer les fonctions…" style="width:100%;margin:4px 0">':''}
      <div class="cb-fnitems">${fs.map(f=>`<div class="cb-fn" data-fexfn="${capEsc(f.id)}" title="Ouvrir ce bloc dans ƒ⇆ Functional Exchange">ƒ ${f.num&&f.num!=='?'?'['+capEsc(f.num)+'] ':''}${capEsc(f.name)}${f.layer?` <span class="fex-dim">${f.layer}</span>`:''}</div>`).join('')}</div>
    </div>`;
  }
  /** Branche une liste de fonctions dépliée (filtre, clic vers ƒ⇆ Functional Exchange). @param {HTMLElement} el */
  function wireFnList(el){
    el.querySelectorAll('[data-fexfn]').forEach(x=>x.onclick=ev=>{ ev.stopPropagation(); capFexOpenFn(x.dataset.fexfn); });
    const q=el.querySelector('.cb-fnq'); if(q) q.oninput=()=>{ const t=capTfNorm(q.value.trim()); el.querySelectorAll('.cb-fn').forEach(x=>x.style.display=!t||capTfNorm(x.textContent).includes(t)?'':'none'); };
  }

  /** Vue Ligne : composant source ⬦ port → échange → port ⬦ composant cible. */
  function buildLines(ls){
    return ls.map(l=>{
      const sc=NK[kindOf(l.src.pcId)].c, tc=NK[kindOf(l.tgt.pcId)].c, c=lc(l);
      const arrL=(l.dir==='rev'||l.dir==='bi')?'◀':'', arrR=(l.dir==='fwd'||l.dir==='bi')?'▶':'';
      return `<div class="phl-line" data-lid="${capEsc(l.linkId)}">
        <div class="phl-cell phl-cell-pc" style="--phl-c:${sc}">${det(l.src.pcId,l.src.pcName,`color:${capTextOn(sc)}`)}<span class="phl-port-name">${port(l.src.portOrient,'R',false)} ${capEsc(l.src.portName)}</span></div>
        <div class="phl-cell phl-cell-link" style="padding:6px 14px;gap:2px;"><span style="font-size:11.5px;color:var(--c-dim);font-family:monospace;">#${lnum[l.linkId]} · ${l.layer}${l.kind&&l.kind!=='UNSET'?' · '+l.kind:''}${l.warn?' · ⚠':''}</span>
          <span style="display:flex;align-items:center;width:100%;justify-content:center;"><span style="color:${c}">${arrL}</span><span style="flex:1;max-width:40px;height:2px;background:${c}"></span>
          <span class="phl-link-badge" style="background:${c};color:#fff;border-color:${c};cursor:pointer;" onclick="capOpenDetailById('${capEsc(l.linkId)}')">${capEsc(l.linkName)}</span>
          <span style="flex:1;max-width:40px;height:2px;background:${c}"></span><span style="color:${c}">${arrR}</span></span>
          ${l.fes.length?`<div style="font-size:11.5px;color:var(--c-dim)">ƒ ${capFoldList(l.fes.map(f=>det(f.id,f.name)))}</div>`:''}</div>
        <div class="phl-cell phl-cell-pc phl-cell-r" style="--phl-c:${tc}">${det(l.tgt.pcId,l.tgt.pcName,`color:${capTextOn(tc)}`)}<span class="phl-port-name">${port(l.tgt.portOrient,'L',false)} ${capEsc(l.tgt.portName)}</span></div>
      </div>`;
    }).join('');
  }

  /** Vue Composant : une carte par composant, avec ses échanges (émis, reçus, bidirectionnels, non orientés).
   * @param {object[]} cs - Composants @param {boolean} [open] - Cartes dépliées (rapports) */
  function buildCards(cs, open){
    const R={out:{a:'→',c:'#4dd880',l:'ÉMET →',t:'Émission'},in:{a:'←',c:'#f0883e',l:'← REÇOIT',t:'Réception'},bi:{a:'⇄',c:'#a371f7',l:'⇄ ÉCHANGE',t:'Bidirectionnel'},unset:{a:'—',c:'#8b949e',l:'? N.O.',t:'Non orienté'}};
    return cs.map(c=>{
      const rows=[]; c.ports.forEach(p=>(C.portLinks[p.id]||[]).forEach(l=>rows.push({l,p})));
      const role=(l,pid)=>{ const r=roleOf(l,pid); return r==='vers'?'out':r==='de'?'in':r==='⇄'?'bi':'unset'; };
      const cnt={out:0,in:0,bi:0,unset:0}; rows.forEach(x=>cnt[role(x.l,x.p.id)]++);
      const col=NK[c.kind].c, o=open||st.openCard===c.id?' open':'';
      const body=rows.length?rows.map(({l,p})=>{ const rr=R[role(l,p.id)], ot=l.src.portId===p.id?l.tgt:l.src, op=l.src.portId===p.id?l.tgt.portOrient:l.src.portOrient;
        return `<div class="phl-link-row">
          <span style="font-size:10px;color:var(--c-dim);font-family:monospace;min-width:28px;">#${lnum[l.linkId]}</span>
          <span title="${rr.t}" style="font-size:9px;font-weight:700;color:${rr.c};min-width:58px;">${rr.l}</span>
          <span class="phl-lr-port-src">${port(p.orient,'R',false)} ${capEsc(p.name)}</span>
          <span class="phl-lr-arrow" style="color:${rr.c};font-weight:700;">${rr.a}</span>
          <span class="phl-lr-link" style="background:${lc(l)};color:#fff;border-color:${lc(l)};cursor:pointer;" title="${capEsc([l.kind!=='UNSET'?l.kind:'',l.fes.length?'FE : '+l.fes.map(f=>f.name).join(', '):''].filter(Boolean).join('\n'))}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(l.linkId)}')">${capEsc(l.linkName)}</span>
          <span class="phl-lr-arrow" style="color:${rr.c};font-weight:700;">${rr.a}</span>
          <span class="phl-lr-port-tgt">${port(op,'L',false)} ${capEsc(ot.portName)}</span>
          <span class="fex-go phl-lr-comp-tgt" data-go="${capEsc(ot.pcId)}" title="Aller à ce composant" style="color:${capTextOn(NK[kindOf(ot.pcId)].c)}">${capEsc(ot.pcName)}</span>
          ${l.warn?`<span title="⚠ ${capEsc(l.warn)}" style="color:var(--c-warn,#e3b341)">⚠</span>`:''}
        </div>`; }).join(''):'<div class="phl-link-row fex-dim"><i>Aucun Component Exchange</i></div>';
      const cntTxt=[cnt.out&&`${cnt.out} →`,cnt.in&&`${cnt.in} ←`,cnt.bi&&`${cnt.bi} ⇄`,cnt.unset&&`${cnt.unset} ?`].filter(Boolean).join(' · ');
      return `<div class="phl-comp-card" data-cid="${capEsc(c.id)}">
        <div class="phl-comp-hdr${o}" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');this.querySelector('.phl-comp-toggle').classList.toggle('open')">
          <span class="phl-comp-badge" style="background:${col};color:${capInk(col)}">${c.actor?'👤 Acteur':'🧩 '+capEsc(capAnaHuman(c.type))}</span>
          <span class="phl-comp-title" style="color:${capTextOn(col)}">${capEsc(c.name)}</span>
          <span class="phl-comp-cnt" title="émis · reçus · bidirectionnels · non orientés">${rows.length} exchange${rows.length>1?'s':''}${cntTxt?` (${cntTxt})`:''} · ${c.ports.length} port${c.ports.length>1?'s':''}${c.fns.length?` · ƒ ${c.fns.length}`:''}</span>
          <span class="phl-comp-toggle${o}">▶</span>
        </div>
        <div class="phl-comp-body${o}">${body}</div>
      </div>`;
    }).join('');
  }

  /** Pagination : page courante et barre ◀ ▶. */
  function paged(items, unit){
    const pages=Math.max(1,Math.ceil(items.length/CAP_CB_PAGE)); if(st.page>=pages) st.page=pages-1;
    const from=st.page*CAP_CB_PAGE, slice=items.slice(from,from+CAP_CB_PAGE);
    const bar=pages>1?`<div class="fex-pager"><button class="cap-lf-btn" data-pg="-1"${st.page?'':' disabled'}>◀</button><span>${unit} ${from+1}–${from+slice.length} sur ${items.length} · page ${st.page+1} / ${pages}</span><button class="cap-lf-btn" data-pg="1"${st.page<pages-1?'':' disabled'}>▶</button></div>`:'';
    return {slice, bar};
  }

  /** Contenu selon la vue (forceView : rendu complet sans pagination, pour les rapports). */
  function buildContent(forceView){
    const view=forceView||st.view, all=!!forceView;
    if(view==='diag') return capDiagHtml(capCbChecks(L));
    if(view==='card'){
      const cs=getComps(); if(!cs.length) return '<div class="phl-empty">Aucun composant ne correspond au filtre.</div>';
      if(all) return buildCards(cs,true);
      const p=paged(cs,'Composants'), bc=st.back&&C.byId[st.back];
      const back=bc?`<div class="fex-backbar"><button class="cap-lf-btn" id="cb-back">↩ Revenir à « ${capEsc(bc.name)} »</button></div>`:'';
      return back+p.bar+buildCards(p.slice)+p.bar;
    }
    if(view==='block'){
      const cs=getComps(); if(!cs.length) return '<div class="phl-empty">Aucun composant ne correspond au filtre.</div>';
      if(all) return buildBlocks(cs);
      const p=paged(cs,'Composants'), bc=st.back&&C.byId[st.back];
      const back=bc?`<div class="fex-backbar"><button class="cap-lf-btn" id="cb-back">↩ Revenir à « ${capEsc(bc.name)} »</button></div>`:'';
      return capBlkThemeHint()+back+p.bar+buildBlocks(p.slice)+p.bar;
    }
    const ls=getLinks(); if(!ls.length) return '<div class="phl-empty">Aucun Component Exchange ne correspond au filtre.</div>';
    if(view==='matrix'){
      const deg={}; ls.forEach(l=>{ deg[l.src.pcId]=(deg[l.src.pcId]||0)+1; deg[l.tgt.pcId]=(deg[l.tgt.pcId]||0)+1; });
      const ids=Object.keys(deg); let keep=null, note='';
      if(ids.length>CAP_CB_MX_MAX){ keep=new Set(ids.sort((a,b)=>deg[b]-deg[a]).slice(0,CAP_CB_MX_MAX)); note=`<div class="cap-mx-hint">⚠ ${ids.length} composants : pour rester fluide, la matrice en affiche ${CAP_CB_MX_MAX} (les plus connectés). Filtrez pour voir les autres.</div>`; }
      const mx=capMatrixBuild(ls.filter(l=>!keep||(keep.has(l.src.pcId)&&keep.has(l.tgt.pcId))),{directed:true, unit:'exchanges', colorOf:e=>capTextOn(NK[kindOf(e.pcId)].c)});
      container._cbCells=mx.cells; return note+mx.html;
    }
    if(all) return buildLines(ls);
    const p=paged(ls,'Échanges'); return p.bar+buildLines(p.slice)+p.bar;
  }

  /** Affiche le bloc d'un composant (page, filtres relâchés si besoin) ; ↩ ramène au bloc de départ.
   * @param {string} id - Composant cible @param {string} [from] - Composant de départ */
  function gotoComp(id, from){
    if(st.view!=='block'&&st.view!=='card') st.view='block';
    const c0=C.byId[id]; if(!c0||!inScope.has(id)){ capOpenDetailById(id); return; }   // composant hors périmètre : panneau de détail
    let cs=getComps(), i=cs.findIndex(c=>c.id===id);
    if(i<0){ st.name=''; st.ex=''; st.nk=new Set(['sys','act','node']); st.under=''; st.withPorts=false;
      cs=getComps(); i=cs.findIndex(c=>c.id===id); if(i<0) return; }
    st.page=Math.floor(i/CAP_CB_PAGE); st.back=from||null; st.openCard=id; render();
    const el=container.querySelector(st.view==='card'?`.phl-comp-card[data-cid="${CSS.escape(id)}"]`:`.fex-blk[data-fn="${CSS.escape(id)}"]`); if(!el) return;
    el.scrollIntoView({block:'center'}); el.classList.add('fex-flash'); setTimeout(()=>el.classList.remove('fex-flash'),1800);
  }

  /** Branche la pagination, la navigation entre blocs et la matrice. */
  function wireMain(){
    const main=container.querySelector('#cb-main'); if(!main) return;
    main.querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click',()=>{ st.page+=+b.dataset.pg; updateContent(); container.scrollTop=0; }));
    main.querySelectorAll('[data-go]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); gotoComp(a.dataset.go, a.closest('.fex-blk')?.dataset.fn||a.closest('.phl-comp-card')?.dataset.cid); });
    main.querySelector('#cb-back')?.addEventListener('click',()=>{ const b=st.back; st.back=null; if(b) gotoComp(b); });
    main.querySelectorAll('[data-fnl]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); const id=b.dataset.fnl, blk=b.closest('.fex-blk'), cur=blk.querySelector('.cb-fnlist');
      if(cur){ cur.remove(); st.fnOpen.delete(id); b.textContent=b.textContent.replace('▴','▾'); return; }
      st.fnOpen.add(id); blk.insertAdjacentHTML('beforeend',fnListHtml(C.byId[id])); wireFnList(blk.querySelector('.cb-fnlist')); b.textContent=b.textContent.replace('▾','▴'); });
    main.querySelectorAll('.cb-fnlist').forEach(wireFnList);
    if(st.view!=='matrix') return;
    main.querySelectorAll('.cap-mx-cell').forEach(td=>td.addEventListener('click',()=>{
      main.querySelectorAll('.cap-mx-cell.sel').forEach(x=>x.classList.remove('sel')); td.classList.add('sel');
      main.querySelector('.cap-mx-detail').innerHTML=`<div style="font-size:11px;color:var(--c-dim);margin-bottom:6px">${td.title}</div>`+buildLines((container._cbCells||{})[td.dataset.cell]||[]);
    }));
  }
  /** Texte du compteur. */
  const counterText=()=>(st.view==='block'||st.view==='card')?`${getComps().length}/${C.comps.length} composants`:`${getLinks().length}/${allLinks.length} exchanges`;
  /** Rafraîchit le contenu et le compteur. */
  function updateContent(){
    _capCbView[L]=st.view;
    const ctr=container.querySelector('#cb-counter'); if(ctr) ctr.textContent=counterText();
    const main=container.querySelector('#cb-main'); if(main) main.innerHTML=buildContent();
    wireMain();
  }

  /** Liste « Tous les composants » : arbre des composants de la couche (filtre sur un composant et ses sous-composants). */
  function underSelect(){
    const cs=C.comps.filter(c=>c.children.length);
    if(!cs.length) return '';
    const roots=cs.filter(c=>!c.parent||!cs.some(x=>x.id===c.parent));
    const opt=(c,d)=>`<option value="${capEsc(c.id)}"${st.under===c.id?' selected':''}>${'\u00a0\u00a0'.repeat(d)}${d?'└':'▣'} ${capEsc(c.name)} (${c.children.length})</option>`+
      c.children.map(k=>C.byId[k]).filter(k=>k&&k.children.length).sort((a,b)=>a.name.localeCompare(b.name)).map(k=>opt(k,d+1)).join('');
    return `<select id="cb-under" class="phl-filter-input" style="max-width:230px${st.under?';border-color:var(--c-accent)':''}" title="Un composant et ses sous-composants"><option value="">Tous les composants</option>${roots.map(r=>opt(r,0)).join('')}</select>${st.under?'<button class="cap-lf-btn" id="cb-under-x" title="Retirer ce filtre">✕</button>':''}`;
  }

  /** Rapport HTML autonome (vue courante ou toutes les vues). */
  function exportHtml(all){
    const VIEWS=[['block','◧ Vue Blocs'],['card','▣ Vue Composant'],['line','≡ Vue Ligne'],['matrix','▦ Matrice'],['diag','🩺 Contrôles']].filter(v=>!V0.only||v[0]==='block');
    const keys=all?VIEWS.map(v=>v[0]):[st.view];
    const tabs=VIEWS.filter(v=>keys.includes(v[0])||(v[0]==='line'&&keys.includes('matrix'))).map(([k,label])=>({key:k,label,html:buildContent(k)}));
    const cells={}; Object.entries(container._cbCells||{}).forEach(([k,ls])=>cells[k]=ls.map(l=>l.linkId));
    const fn=V0.what.toLowerCase().replace(/\s+/g,'-');
    capHtmlReport({title:V0.l+(V0.only?' — Vue Blocs':''), subtitle:`${getComps().length} composants · ${getLinks().length} ${V0.lw} · ${V0.scope}`, tabs, active:st.view, cells,
      filename:all?`${fn}-rapport.html`:`${fn}-${st.view}.html`});
  }
  /** Export CSV : une ligne par port (Vue Blocs) ou par échange. */
  function exportCsv(){
    if(st.view==='block'){
      const rows=[]; getComps().forEach(c=>c.ports.forEach(p=>{ const ls=C.portLinks[p.id]||[];
        if(!ls.length) rows.push([c.layer,c.name,c.actor?'Acteur':c.kind==='node'?'Nœud':'Système',p.name,p.orient,'','','']);
        ls.forEach(l=>{ const o=l.src.portId===p.id?l.tgt:l.src; rows.push([c.layer,c.name,c.actor?'Acteur':c.kind==='node'?'Nœud':'Système',p.name,p.orient,l.linkName,roleOf(l,p.id),o.pcName]); }); }));
      capCsvDownload(V0.what.toLowerCase().replace(/\s+/g,'-')+'-ports.csv',['Couche','Composant','Nature','Port','Orientation',V0.lw.replace(/s$/,''),'Sens','Composant distant'],rows); return;
    }
    capCsvDownload(V0.what.toLowerCase().replace(/\s+/g,'-')+'-echanges.csv',['N°','Couche','Composant source','Port source','Orientation source','Component Exchange','Kind','Port cible','Orientation cible','Composant cible','Functional Exchanges'],
      getLinks().map(l=>[lnum[l.linkId],l.layer,l.src.pcName,l.src.portName,l.src.portOrient,l.linkName,l.kind,l.tgt.portName,l.tgt.portOrient,l.tgt.pcName,l.fes.map(f=>f.name).join(', ')]));
  }

  /** Construit toute la vue. */
  function render(){
    _capCbView[L]=st.view;
    if(st.under&&!inScope.has(st.under)) st.under='';
    if(!C.comps.length){ container.innerHTML=`<div class="phl-empty">Aucun ${V0.what.replace(/s\b/,'')} dans ce modèle (${V0.scope}).</div>`; return; }
    const V=[['block','◧ Vue Blocs','Composants dessinés comme dans Capella : ports UNSET (plein), IN, OUT (chevrons) et INOUT (vide) ; bleu = système, bleu clair = acteur'],
      ['card','▣ Vue Composant','Une carte par composant avec ses échanges émis, reçus, bidirectionnels ou non orientés'],
      ['line','≡ Vue Ligne','Un Component Exchange par ligne'],['matrix','▦ Matrice','Composant × composant (100 composants au plus)'],['diag','🩺 Contrôles','Ports orphelins ou sans orientation, échanges incohérents, composants sans port ou sans fonction']];
    const pv=st.view==='block'||st.view==='card';
    const base=C.comps.filter(c=>underOk(c.id)&&!(pv&&st.withPorts&&!c.ports.length));
    const kinds=['sys','node','act'].filter(k=>C.comps.some(c=>c.kind===k));
    const Vs=V0.only?V.filter(v=>v[0]==='block'):V;
    container.innerHTML=`${V0.only?'':`
      <div class="phl-toggle-bar">
        ${Vs.map(([k,l,t])=>`<button class="phl-toggle-btn${st.view===k?' active':''}" data-pv="${k}" title="${t}">${l}</button>`).join('')}
        <span id="cb-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace;">${counterText()}</span>
        <span class="cap-mx-hint" style="margin-left:12px">${V0.scope} · ${C.comps.length} ${V0.what} · ${allLinks.length} ${V0.lw}</span>
      </div>`}
      <div class="phl-filter-bar" style="margin-bottom:8px;flex-wrap:wrap;">
        ${V0.only?`<span id="cb-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace;margin-right:8px" title="${V0.scope} · ${C.comps.length} ${V0.what} · ${allLinks.length} ${V0.lw}">${counterText()}</span>`:''}
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;">🧱 Composant :</span>
        <input id="cb-name" type="text" class="phl-filter-input" placeholder="Filtrer par composant…" value="${capEsc(st.name)}" style="width:180px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;margin-left:8px;">🔍 ${L==='PN'?'Lien':'Échange'} :</span>
        <input id="cb-ex" type="text" class="phl-filter-input" placeholder="${V0.lw.replace(/s$/,'')}…" value="${capEsc(st.ex)}" style="width:170px;">
        ${pv?`<label style="font-size:11px;color:var(--c-dim);display:flex;align-items:center;gap:4px;margin-left:8px;" title="Masquer les composants sans port (conteneurs le plus souvent)"><input type="checkbox" id="cb-withports"${st.withPorts?' checked':''}> avec ports</label>`:''}
        <span class="tb-grp ana-ak" style="margin-left:8px" title="Clic : afficher / masquer · double-clic : uniquement celle-ci"><span class="tb-grp-l">Nature</span>${kinds.map(k=>`<label class="ana-ak-chip${st.nk.has(k)?' on':''}" style="--c:${NK[k].c}" title="${NK[k].tip} — double-clic : uniquement ceux-ci"><input type="checkbox" data-nk="${k}"${st.nk.has(k)?' checked':''}>${NK[k].i} ${NK[k].l} <b>${base.filter(c=>c.kind===k).length}</b></label>`).join('')}${underSelect()}</span>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="phl-export-btn" id="cb-csv">⬇ CSV</button>
          <button class="phl-export-btn" id="cb-html" title="Rapport HTML de la vue affichée (toutes les pages)">⬇ HTML</button>
          <button class="phl-export-btn" id="cb-html-all" title="Rapport HTML à onglets : toutes les vues">⬇ HTML (toutes les vues)</button>
        </div>
      </div>
      <div id="cb-main">${buildContent()}</div>`;
    container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.addEventListener('click',()=>{ st.view=b.dataset.pv; st.page=0; render(); }));
    container.querySelector('#cb-withports')?.addEventListener('change',e=>{ st.withPorts=e.target.checked; st.page=0; render(); });
    container.querySelectorAll('[data-nk]').forEach(cb=>{
      cb.onchange=()=>{ if(cb.checked) st.nk.add(cb.dataset.nk); else st.nk.delete(cb.dataset.nk); st.page=0; render(); };
      cb.parentElement.ondblclick=ev=>{ ev.preventDefault(); const k=cb.dataset.nk; st.nk=(st.nk.size===1&&st.nk.has(k))?new Set(['sys','act','node']):new Set([k]); st.page=0; render(); };
    });
    container.querySelector('#cb-under')?.addEventListener('change',e=>{ st.under=e.target.value; st.page=0; render(); });
    container.querySelector('#cb-under-x')?.addEventListener('click',()=>{ st.under=''; st.page=0; render(); });
    let deb;
    [['#cb-name','name'],['#cb-ex','ex']].forEach(([sel,k])=>container.querySelector(sel)?.addEventListener('input',e=>{ st[k]=e.target.value; st.page=0; clearTimeout(deb); deb=setTimeout(updateContent,150); }));
    container.querySelector('#cb-csv')?.addEventListener('click',exportCsv);
    container.querySelector('#cb-html')?.addEventListener('click',()=>exportHtml(false));
    container.querySelector('#cb-html-all')?.addEventListener('click',()=>exportHtml(true));
    wireMain();
  }
  render();
  if(_capCbGo&&_capCbGo.L===L){ const g=_capCbGo.id; _capCbGo=null; gotoComp(g); }
}
