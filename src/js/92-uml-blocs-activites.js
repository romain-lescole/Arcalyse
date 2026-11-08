/* ═══════════════════════════════════════════════════════════════════════════
   🧱 UML / SysML v1 — Blocs & ports, ƒ Activités & flux : les Vues Blocs de Capella (🧱 47, ƒ⇆ 44) pour un modèle lu par
   le lecteur UML d'Arcature (88). Deux moteurs lisent directement la lecture affichée (`_capSysml.lecture`) :
   - `capUmlStructure` : blocs (classes, composants, acteurs qui portent des ports, des parts ou des connecteurs), ports
     orientés IN / OUT / INOUT / UNSET d'après les FlowProperty de leur type (port conjugué : sens inversé ; FlowPort :
     direction), connecteurs (assemblage ou délégation ; contexte = bloc propriétaire, comme un ibd), ItemFlow et ce qu'ils
     transportent (conveyed), allocations «allocate» d'une part ou d'un bloc vers un bloc ;
   - `capUmlActivites` : actions des activités avec leurs pins d'entrée / de sortie, flux d'objets et de contrôle ramenés
     d'action à action à travers les nœuds de contrôle (fork, join, merge, decision), paramètres d'activité (bord de
     l'activité), porteurs (partition, «allocate», bloc dont l'activité est le comportement), actions d'appel (hiérarchie),
     signaux envoyés ou attendus sur un port (contrôle croisé avec les ItemFlow de la structure).
   Une seule Vue Blocs (`capUmlBlkRender`) dessine les deux avec les classes CSS des vues Capella : ◧ Blocs, ≡ Ligne,
   ▦ Matrice, 🩺 Contrôles ; filtres (nom, lien, nature, genre de lien, contexte ou activité), ⬇ CSV / HTML ; pages de 100.
   Sous-vues `umlblk` et `umlact` de 🔬 Analyses (famille 🧬 UML / SysML v1 de 🏗 Architecture, 41).
   ═══════════════════════════════════════════════════════════════════════════ */

var CAP_UML_BLK_PAGE=100, CAP_UML_BLK_MX=100;
/** Élément à montrer à la prochaine ouverture d'une Vue Blocs UML : {v:'umlblk'|'umlact', id}. */
var _capUmlGo=null;
/** Couleurs des pastilles de nature (types de blocs, genres d'actions). */
var CAP_UML_NAT_C=['#58a6ff','#3fb950','#e3b341','#a371f7','#f0883e','#39c5cf','#f778ba','#8b949e'];
/** Nœuds de contrôle traversés pour relier deux actions. */
var CAP_UML_CTRL=/^(ForkNode|JoinNode|MergeNode|DecisionNode)$/;
/** Nœuds d'activité dessinés comme des actions (blocs à pins). */
var CAP_UML_ACTION=/Action$|^(ExpansionRegion|StructuredActivityNode|LoopNode|ConditionalNode|SequenceNode|CentralBufferNode|DataStoreNode)$/;

/** Lecture UML / SysML v1 affichée, ou null (modèle Capella ou SysML v2). @returns {?object} */
function capUmlLec(){ return typeof capSyUml==='function'&&capSyUml()?_capSysml.lecture:null; }

/** Identifiants d'une référence d'un élément du lecteur (type, client, source…). @param {object} e - Élément @param {string} k - Clé @returns {string[]} */
function capUmlRef(e, k){ return (e&&e.references&&e.references[k])||[]; }

/** Nom affichable d'un élément du lecteur (nom, sinon libellé, sinon type). @param {?object} e - Élément @returns {string} */
function capUmlNom(e){ return e?(e.nom||e.libelle||e.type||'—'):'—'; }

/** Vrai pour un élément dessinable comme un bloc (classe, composant, acteur, nœud ; hors exigences et blocs de contrainte, 97).
 * @param {?object} e - Élément du lecteur @returns {boolean} */
function capUmlEstBloc(e){ return !!e&&/^(Class|Component|Actor|Node|Device|ExecutionEnvironment|Collaboration)$/.test(e.metaclasse)&&!/Requirement/i.test(e.type||'')&&!capUmlEstBlocContrainte(e); }

/** Vrai pour un acteur ou une entité externe (métaclasse Actor, stéréotype « Actor » ou « External… »). @param {object} e - Élément @returns {boolean} */
function capUmlEstActeur(e){ return e.metaclasse==='Actor'||(e.stereotypes||[]).some(s=>/^(actor|external)/i.test(s))||/^External/i.test(e.type||''); }

/** Ordre alphabétique (numérique), éléments anonymes (« ‹Type› », « : Type ») en dernier. @param {string} a - Nom @param {string} b - Nom @returns {number} */
function capUmlTriNom(a, b){ const x=/^[‹:]/.test(a), y=/^[‹:]/.test(b); return x!==y?(x?1:-1):a.localeCompare(b,'fr',{numeric:true}); }

/** Natures (pastilles de filtre) d'une liste de nœuds : un type par pastille, les 7 plus fréquents, les autres regroupés.
 * @param {object[]} nodes - Nœuds {nat} (nat écrasée par « autres » au-delà de 7 types)
 * @param {Function} lib - Libellé d'un type @returns {object[]} Natures {k, l, c, n} */
function capUmlNatures(nodes, lib){
  const m={}; nodes.forEach(n=>{ m[n.nat]=(m[n.nat]||0)+1; });
  const ks=Object.keys(m).sort((a,b)=>m[b]-m[a]||a.localeCompare(b)), top=ks.slice(0,7), autres=ks.slice(7);
  if(autres.length) nodes.forEach(n=>{ if(autres.includes(n.nat)) n.nat='~'; });
  const out=top.map((k,i)=>({k, l:lib(k), c:CAP_UML_NAT_C[i%CAP_UML_NAT_C.length], n:m[k]}));
  if(autres.length) out.push({k:'~', l:_L('Autres'), c:'#8b949e', n:autres.reduce((s,k)=>s+m[k],0), tip:autres.join(', ')});
  return out;
}

/* ── 1. 🧱 Blocs & ports ─────────────────────────────────────────── */

/** Blocs, ports, connecteurs, ItemFlow et allocations de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{nodes:object[], byId:object, links:object[], portLinks:object, nodeLinks:object, flows:object[], groups:object[], natures:object[], kinds:object[], allocs:object[], ports:object}} Structure
 */
function capUmlStructure(){
  if(_capAnaCache.umlStr) return _capAnaCache.umlStr;
  const R={nodes:[], byId:{}, links:[], portLinks:{}, nodeLinks:{}, flows:[], groups:[], natures:[], kinds:[], allocs:[], ports:{}};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlStr=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  /** Nœud d'un bloc (créé au premier appel). */
  const node=e=>{
    if(!capUmlEstBloc(e)) return null;
    let n=R.byId[e.id]; if(n) return n;
    const act=capUmlEstActeur(e);
    n={id:e.id, name:capUmlNom(e), type:e.type, nat:e.type, kind:act?'act':'sys', ico:act?'👤':'▣', ports:[], parts:[], parent:'', children:[], alloc:[], recu:[], fournit:[], requiert:[], grps:new Set(), ctx:false};
    R.byId[e.id]=n; R.nodes.push(n); return n;
  };
  // Directions des FlowProperty d'un type de port (généralisations comprises)
  const dirs=(t, vus)=>{ const s=new Set(); if(!t||vus.has(t.id)) return s; vus.add(t.id);
    (t.enfants||[]).forEach(i=>{ const c=E(i); if(c&&(c.type==='FlowProperty'||(c.stereotypes||[]).includes('FlowProperty'))) s.add(String(c.direction||'inout').toLowerCase()); });
    capUmlRef(t,'general').forEach(g=>dirs(E(g), vus).forEach(d=>s.add(d)));
    return s; };
  /** Port : orientation déduite de son type, conjugaison, type. */
  const port=p=>{
    let q=R.ports[p.id]; if(q) return q;
    const t=E(capUmlRef(p,'type')[0]), d=dirs(t, new Set());
    let o='UNSET';
    if(d.size) o=d.size===1&&d.has('in')?'IN':d.size===1&&d.has('out')?'OUT':'INOUT';
    else if(p.direction) o=/^in$/i.test(p.direction)?'IN':/^out$/i.test(p.direction)?'OUT':'INOUT';
    const conj=(p.modificateurs||[]).includes('conjugated');
    if(conj&&(o==='IN'||o==='OUT')) o=o==='IN'?'OUT':'IN';
    q={id:p.id, name:p.nom||p.libelle||'—', orient:o, conj, typeId:t?t.id:'', typeName:t?capUmlNom(t):'', owner:p.proprietaire, stereo:p.type};
    R.ports[p.id]=q; return q;
  };
  els.forEach(e=>{ if(e.metaclasse!=='Port') return; const n=node(E(e.proprietaire)); if(n) n.ports.push(port(e)); });
  els.forEach(e=>{ if(e.type==='Block'||(e.stereotypes||[]).includes('Block')) node(e); });   // blocs SysML, même sans port (composants UML : seulement avec ports, parts ou connecteurs)
  // Connecteurs (binaires) : extrémités ramenées au bloc qui porte le port, ou au type de la part
  const linkById={};
  els.forEach(c=>{
    if(c.metaclasse!=='Connector') return;
    const ends=(c.enfants||[]).map(E).filter(x=>x&&x.metaclasse==='ConnectorEnd'); if(ends.length!==2) return;
    const ctxEl=E(c.proprietaire), ctx=node(ctxEl);
    const end=x=>{
      const r=E(capUmlRef(x,'role')[0]), pw=E(capUmlRef(x,'partWithPort')[0]); if(!r) return null;
      if(r.metaclasse==='Port'){ const n=node(E(r.proprietaire)); if(!n) return null; const q=port(r);
        return {id:n.id, name:n.name, portId:q.id, portName:q.name, orient:q.orient, part:pw?capUmlNom(pw):'', partId:pw?pw.id:'', bord:!pw&&!!ctx&&n.id===ctx.id}; }
      const n=node(E(capUmlRef(r,'type')[0])); if(!n) return null;
      return {id:n.id, name:n.name, portId:'', portName:'', orient:'', part:capUmlNom(r), partId:r.id, bord:false};
    };
    const a=end(ends[0]), b=end(ends[1]); if(!a||!b) return;
    if(ctx) ctx.ctx=true;
    const deleg=a.bord||b.bord;
    const l={id:c.id, name:c.nom||'', kind:c.type||'Connector', grp:ctx?ctx.id:'', ctxName:ctx?ctx.name:'', deleg, src:a, tgt:b, items:[], flows:[], fwd:false, rev:false, dir:'unset', warn:''};
    R.links.push(l); linkById[l.id]=l;
    [a,b].forEach(x=>{ if(x.portId) (R.portLinks[x.portId]=R.portLinks[x.portId]||[]).push(l); else (R.nodeLinks[x.id]=R.nodeLinks[x.id]||[]).push(l); });
  });
  // ItemFlow : objets transportés et sens, sur le connecteur qui les réalise (sinon sur le connecteur qui relie les mêmes ports)
  const parPorts={}; R.links.forEach(l=>{ if(l.src.portId&&l.tgt.portId){ parPorts[l.src.portId+'|'+l.tgt.portId]=parPorts[l.tgt.portId+'|'+l.src.portId]=l; } });
  els.forEach(f=>{
    if(!(f.type==='ItemFlow'||(f.stereotypes||[]).includes('ItemFlow'))) return;
    const s=capUmlRef(f,'informationSource')[0]||'', t=capUmlRef(f,'informationTarget')[0]||'';
    const items=capUmlRef(f,'conveyed').map(E).filter(Boolean).map(x=>({id:x.id, name:capUmlNom(x)}));
    let ls=capUmlRef(f,'realizingConnector').map(id=>linkById[id]).filter(Boolean), deduit=false;
    if(!ls.length&&parPorts[s+'|'+t]){ ls=[parPorts[s+'|'+t]]; deduit=true; }
    const fl={id:f.id, name:f.nom||f.libelle||'—', items, src:s, tgt:t, links:ls.map(l=>l.id), deduit};
    R.flows.push(fl);
    ls.forEach(l=>{
      l.flows.push(fl); items.forEach(i=>{ if(!l.items.some(x=>x.id===i.id)) l.items.push(i); });
      const cote=ref=>!ref?'':[l.src.portId,l.src.partId,l.src.id].includes(ref)?'s':[l.tgt.portId,l.tgt.partId,l.tgt.id].includes(ref)?'t':'';
      const cs=cote(s), ct=cote(t);
      if(cs==='s'||ct==='t') l.fwd=true; else if(cs==='t'||ct==='s') l.rev=true;
    });
  });
  // Sens et cohérence de chaque connecteur ; connecteur anonyme nommé d'après ce qu'il transporte, sinon son stéréotype
  R.links.forEach(l=>{
    if(!l.name) l.name=l.items.length?l.items.map(i=>i.name).join(', '):l.kind!=='Connector'?`«${l.kind}»`:_L('connecteur');
    const a=l.src.orient, b=l.tgt.orient;
    let d='unset';
    if(l.fwd||l.rev) d=l.fwd&&l.rev?'bi':l.fwd?'fwd':'rev';
    else if(a&&b&&a!=='UNSET'&&b!=='UNSET'){
      if(a==='INOUT'||b==='INOUT') d='bi';
      else if(l.deleg){ const bord=l.src.bord?a:b; d=a!==b?'unset':(bord==='IN')===!!l.src.bord?'fwd':'rev'; }   // délégation : même sens des deux côtés
      else d=a==='OUT'&&b==='IN'?'fwd':a==='IN'&&b==='OUT'?'rev':'unset';
    }
    l.dir=d;
    if(a&&b&&!['UNSET','INOUT'].includes(a)&&!['UNSET','INOUT'].includes(b)){
      if(!l.deleg&&a===b) l.warn=_L(`Ports de même sens (${a} ↔ ${b}) sur un connecteur d'assemblage`);
      if(l.deleg&&a!==b) l.warn=_L(`Délégation entre ports de sens contraires (${a} ↔ ${b})`);
    }
    const contre=(l.fwd&&(a==='IN'&&!l.src.bord||b==='OUT'&&!l.tgt.bord))||(l.rev&&(b==='IN'&&!l.tgt.bord||a==='OUT'&&!l.src.bord));
    if(contre&&!l.warn) l.contre=true;
    if(l.grp){ [l.src.id,l.tgt.id].forEach(id=>R.byId[id].grps.add(l.grp)); R.byId[l.grp].grps.add(l.grp); }
  });
  // Parts (composition) : sous-blocs de chaque bloc, de proche en proche
  for(let i=0; i<R.nodes.length; i++){
    const n=R.nodes[i], e=E(n.id);
    (e&&e.enfants||[]).map(E).forEach(p=>{
      if(!p||p.metaclasse!=='Property'||!(p.type==='PartProperty'||p.agregation==='composite')) return;
      const k=node(E(capUmlRef(p,'type')[0])); if(!k||k.id===n.id) return;
      n.parts.push({id:p.id, name:capUmlNom(p), type:k.id});
      if(!n.children.includes(k.id)) n.children.push(k.id);
      if(!k.parent) k.parent=n.id;
      if(n.ctx) k.grps.add(n.id);
    });
  }
  // Allocations «allocate» d'une part, d'un bloc ou d'un port vers un bloc ; interfaces UML fournies (réalisées) et requises (utilisées)
  lec.toutesLiaisons().forEach(x=>{
    if(x.relation==='realisation-interface'||x.relation==='utilisation'){ const n=R.byId[x.source], i=E(x.cible);
      if(n&&i&&i.metaclasse==='Interface'){ const L=x.relation==='utilisation'?n.requiert:n.fournit; if(!L.some(y=>y.id===i.id)) L.push({id:i.id, name:capUmlNom(i)}); } return; }
    if(!/^allocat/i.test(x.relation)) return;
    const c=E(x.source), s=node(E(x.cible)); if(!c||!s) return;
    const cn=capUmlEstBloc(c)?node(c):c.metaclasse==='Property'?node(E(capUmlRef(c,'type')[0])):c.metaclasse==='Port'?node(E(c.proprietaire)):null;
    R.allocs.push({src:c.id, tgt:s.id, via:x.via});
    if(!s.recu.some(y=>y.id===c.id)) s.recu.push({id:c.id, name:capUmlNom(c)+(cn&&cn.id!==c.id&&c.metaclasse==='Property'?` : ${cn.name}`:''), node:cn?cn.id:''});
    if(cn&&!cn.alloc.some(y=>y.id===s.id)) cn.alloc.push({id:s.id, name:s.name});
  });
  R.groups=R.nodes.filter(n=>n.ctx).map(n=>({id:n.id, name:n.name, n:R.links.filter(l=>l.grp===n.id).length})).sort((a,b)=>a.name.localeCompare(b.name));
  R.natures=capUmlNatures(R.nodes, t=>t);
  const km={}; R.links.forEach(l=>{ km[l.kind]=(km[l.kind]||0)+1; });
  R.kinds=Object.keys(km).sort((a,b)=>km[b]-km[a]).map((k,i)=>({k, l:k, n:km[k], c:CAP_UML_NAT_C[(i+3)%CAP_UML_NAT_C.length]}));
  R.nodes.sort((a,b)=>capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlStr=R;
}

/** Contrôles 🩺 des blocs, ports, connecteurs et ItemFlow (vue 🧱 Blocs & ports ; 💚 Santé, 🩺 profil, tableau de bord).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlBlkChecks(){
  const S=capUmlStructure(); if(!S.nodes.length) return [];
  const fl=(id,n)=>capDetLink(id,n), lk=l=>`<td>${fl(l.id,l.name)}</td><td>${fl(l.src.id,l.src.name)}${l.src.portName?' ⬦ '+capEsc(l.src.portName):''}</td><td>${fl(l.tgt.id,l.tgt.name)}${l.tgt.portName?' ⬦ '+capEsc(l.tgt.portName):''}</td><td>${l.ctxName?fl(l.grp,l.ctxName):'—'}</td>`;
  const lcols=[_L('Connecteur'),_L('Extrémité 1'),_L('Extrémité 2'),_L('Contexte')];
  const orphan=[], untyped=[];
  S.nodes.forEach(n=>n.ports.forEach(p=>{ if(!(S.portLinks[p.id]||[]).length) orphan.push({n,p}); if(!p.typeId) untyped.push({n,p}); }));
  const leaf=n=>!n.children.length, recv=new Set(S.nodes.filter(n=>n.recu.length).map(n=>n.type)), alloue=new Set(S.nodes.filter(n=>n.alloc.length).map(n=>n.type));
  const prow=o=>`<tr><td>${fl(o.n.id,o.n.name)}</td><td>${fl(o.p.id,o.p.name)}</td><td>${o.p.orient}${o.p.conj?' ~':''}</td><td>${capEsc(o.p.typeName||'—')}</td></tr>`;
  const pcols=[_L('Bloc'),_L('Port'),_L('Orientation'),_L('Type du port')];
  const sec=[
    {icon:'⭘', title:_L('Ports sans connecteur'), tip:_L('Port défini sur un bloc mais relié par aucun connecteur, dans aucun contexte'), cols:pcols, items:orphan.map(prow)},
    {icon:'?', sev:'info', title:_L('Ports sans type'), tip:_L('Port non typé : ni InterfaceBlock, ni bloc, ni FlowProperty ; son sens ne peut pas être déduit'), cols:pcols, items:untyped.map(prow)},
    {icon:'⚠', sev:'err', title:_L('Connecteurs aux sens incompatibles'), tip:_L('Assemblage entre deux ports de même sens (OUT ↔ OUT, IN ↔ IN) ou délégation entre ports de sens contraires, d\'après les FlowProperty de leurs types'), cols:[...lcols,_L('Motif')],
      items:S.links.filter(l=>l.warn).map(l=>`<tr>${lk(l)}<td>${capEsc(l.warn)}</td></tr>`)},
    {icon:'⇄', title:_L('Flux (ItemFlow) contraires au sens des ports'), tip:_L('Un ItemFlow part d\'un port d\'entrée ou arrive sur un port de sortie'), cols:lcols, items:S.links.filter(l=>l.contre).map(l=>`<tr>${lk(l)}</tr>`)}
  ];
  if(S.flows.length){
    sec.push({icon:'∅', sev:'info', title:_L('Connecteurs sans flux (ItemFlow)'), tip:_L('Le modèle utilise des ItemFlow, mais aucun ne passe par ce connecteur'), cols:lcols, items:S.links.filter(l=>!l.flows.length).map(l=>`<tr>${lk(l)}</tr>`)});
    sec.push({icon:'⛓', sev:'info', title:_L('Flux (ItemFlow) portés par aucun connecteur'), tip:_L('Ni connecteur qui le réalise (realizingConnector), ni connecteur entre ses deux ports'), cols:[_L('ItemFlow'),_L('Transporte'),_L('Source'),_L('Cible')],
      items:S.flows.filter(f=>!f.links.length).map(f=>`<tr><td>${fl(f.id,f.name)}</td><td>${f.items.map(i=>fl(i.id,i.name)).join(', ')||'—'}</td><td>${f.src?capSyLien(f.src):'—'}</td><td>${f.tgt?capSyLien(f.tgt):'—'}</td></tr>`)});
  }
  sec.push({icon:'∅', sev:'info', title:_L('Blocs feuilles sans port'), tip:_L('Bloc sans part et sans port (hors acteurs)'), cols:[_L('Bloc'),'Type'],
    items:S.nodes.filter(n=>leaf(n)&&n.kind!=='act'&&!n.ports.length&&!(S.nodeLinks[n.id]||[]).length).map(n=>`<tr><td>${fl(n.id,n.name)}</td><td class="ana-dim">${capEsc(n.type)}</td></tr>`)});
  if(recv.size) sec.push({icon:'⇠', sev:'info', title:_L('Blocs feuilles sans allocation reçue'), tip:_L('Blocs d\'un type qui reçoit ailleurs des allocations «allocate», mais rien ne leur est alloué'), cols:[_L('Bloc'),'Type'],
    items:S.nodes.filter(n=>leaf(n)&&recv.has(n.type)&&!n.recu.length).map(n=>`<tr><td>${fl(n.id,n.name)}</td><td class="ana-dim">${capEsc(n.type)}</td></tr>`)});
  if(alloue.size) sec.push({icon:'⇢', sev:'info', title:_L('Blocs feuilles non alloués'), tip:_L('Blocs d\'un type alloué ailleurs par «allocate» (souvent des fonctions), mais alloués à aucun bloc'), cols:[_L('Bloc'),'Type'],
    items:S.nodes.filter(n=>leaf(n)&&alloue.has(n.type)&&!n.alloc.length).map(n=>`<tr><td>${fl(n.id,n.name)}</td><td class="ana-dim">${capEsc(n.type)}</td></tr>`)});
  return sec;
}

/* ── 2. ƒ Activités & flux ───────────────────────────────────────── */

/** Actions, pins, flux d'objets et de contrôle des activités de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{nodes:object[], byId:object, links:object[], portLinks:object, nodeLinks:object, groups:object[], natures:object[], kinds:object[], signaux:object[], acts:object[]}} Activités
 */
function capUmlActivites(){
  if(_capAnaCache.umlAct) return _capAnaCache.umlAct;
  const R={nodes:[], byId:{}, links:[], portLinks:{}, nodeLinks:{}, groups:[], natures:[], kinds:[], signaux:[], acts:[]};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlAct=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  /** Activité qui contient un nœud (régions d'expansion traversées). */
  const actOf=e=>{ for(let x=E(e.proprietaire); x; x=E(x.proprietaire)) if(x.metaclasse==='Activity') return x; return null; };
  /** Bloc dont une activité est le comportement (propriétaire de l'activité, ou de sa machine à états). */
  const blocOf=a=>{ for(let x=E(a.proprietaire); x; x=E(x.proprietaire)) if(capUmlEstBloc(x)) return x; return null; };
  // Porteurs déclarés : «allocate» (action ou activité → bloc) et partitions (represents)
  const porte={};
  const addP=(id, b, rel)=>{ if(!id||!b) return; const L=porte[id]=porte[id]||[]; if(!L.some(x=>x.id===b.id)) L.push({id:b.id, name:capUmlNom(b), rel}); };
  lec.toutesLiaisons().forEach(x=>{ if(/^allocat/i.test(x.relation)){ const s=E(x.cible); if(s&&capUmlEstBloc(s)) addP(x.source, s, 'allocate'); else if(s&&s.metaclasse==='Property') addP(x.source, E(capUmlRef(s,'type')[0])||s, 'allocate'); } });
  els.forEach(p=>{ if(p.metaclasse!=='ActivityPartition') return;
    let r=E(capUmlRef(p,'represents')[0]); if(r&&r.metaclasse==='Property') r=E(capUmlRef(r,'type')[0])||r; if(!r) return;
    capUmlRef(p,'node').forEach(id=>addP(id, r, 'partition'));
    (p.enfants||[]).forEach(id=>addP(id, r, 'partition')); });
  els.forEach(n=>capUmlRef(n,'inPartition').forEach(pid=>{ const p=E(pid); let r=p&&E(capUmlRef(p,'represents')[0]); if(r&&r.metaclasse==='Property') r=E(capUmlRef(r,'type')[0])||r; if(r) addP(n.id, r, 'partition'); }));
  /** Nom d'une action : son nom, sinon ce qu'elle appelle, envoie, attend, lit ou écrit. */
  const nomAction=a=>{
    if(a.nom) return a.nom;
    const r=k=>E(capUmlRef(a,k)[0]);
    if(a.metaclasse==='CallBehaviorAction'&&r('behavior')) return capUmlNom(r('behavior'));
    if(a.metaclasse==='CallOperationAction'&&r('operation')) return capUmlNom(r('operation'))+'()';
    if(a.metaclasse==='SendSignalAction'&&r('signal')) return _L(`Envoyer ${capUmlNom(r('signal'))}`);
    if(a.metaclasse==='AcceptEventAction'){ const s=sigAttendus(a)[0]; if(s) return _L(`Attendre ${capUmlNom(E(s.signal))}`); }
    if(/^ReadStructuralFeature/.test(a.metaclasse)&&r('structuralFeature')) return _L(`Lire ${capUmlNom(r('structuralFeature'))}`);
    if(/StructuralFeatureValue/.test(a.metaclasse)&&r('structuralFeature')) return _L(`Écrire ${capUmlNom(r('structuralFeature'))}`);
    return a.libelle&&!/^‹/.test(a.libelle)?a.libelle:a.metaclasse.replace(/([a-z])([A-Z])/g,'$1 $2');
  };
  /** Signaux attendus par une action d'acceptation : {signal, port} de chaque Trigger à SignalEvent. */
  function sigAttendus(a){ return (a.enfants||[]).map(E).filter(t=>t&&t.metaclasse==='Trigger').map(t=>{ const ev=E(capUmlRef(t,'event')[0]); return {signal:ev&&capUmlRef(ev,'signal')[0], port:capUmlRef(t,'port')[0]||''}; }).filter(x=>x.signal); }
  const ICO={CallBehaviorAction:'⧉', CallOperationAction:'⧉', SendSignalAction:'📤', AcceptEventAction:'📥', OpaqueAction:'ƒ', ExpansionRegion:'⟲'};
  // Nœuds : actions (et nœuds structurés), bords d'activité pour les paramètres
  const actById={};
  const groupe=a=>{ if(!a) return null; let g=actById[a.id]; if(g) return g; const b=blocOf(a);
    g=actById[a.id]={id:a.id, name:capUmlNom(a), bloc:b?{id:b.id, name:capUmlNom(b)}:null, n:0}; R.acts.push(g); return g; };
  const pinsOf={};
  els.forEach(a=>{
    if(!CAP_UML_ACTION.test(a.metaclasse)) return;
    const A=actOf(a), g=groupe(A); if(g) g.n++;
    // Porteurs : ceux de l'action, sinon ceux du comportement qu'elle appelle, sinon ceux de son activité (activité allouée)
    const own=porte[a.id]||[], viaB=a.metaclasse==='CallBehaviorAction'?porte[capUmlRef(a,'behavior')[0]]||[]:[], viaA=A?porte[A.id]||[]:[];
    const att=own.length||viaB.length?[...own, ...viaB.filter(x=>!own.some(y=>y.id===x.id))]:viaA;
    const ctxB=g&&g.bloc;
    const n={id:a.id, name:nomAction(a), type:a.metaclasse, nat:a.metaclasse, ico:ICO[a.metaclasse]||'▭', kind:att.length?'sys':ctxB?'act':'none', ports:[], att, ctxB,
      act:g?{id:g.id, name:g.name}:null, grps:new Set(g?[g.id]:[]), calls:null, children:[], parent:''};
    if(a.metaclasse==='CallBehaviorAction'){ const b=E(capUmlRef(a,'behavior')[0]); n.calls=b?{id:b.id, name:capUmlNom(b)}:{id:'', name:''}; }
    (a.enfants||[]).map(E).forEach(p=>{ if(!p||!/Pin$/.test(p.metaclasse)) return;
      const q={id:p.id, name:p.nom||p.libelle||'—', orient:/^Output/.test(p.metaclasse)?'OUT':'IN', typeName:capUmlNom(E(capUmlRef(p,'type')[0]))};
      if(!capUmlRef(p,'type').length) q.typeName=''; n.ports.push(q); pinsOf[p.id]={node:n, pin:q}; });
    R.byId[n.id]=n; R.nodes.push(n);
    if(a.metaclasse==='SendSignalAction'&&capUmlRef(a,'signal').length) R.signaux.push({sens:'out', action:n.id, signal:capUmlRef(a,'signal')[0], port:capUmlRef(a,'onPort')[0]||''});
    if(a.metaclasse==='AcceptEventAction') sigAttendus(a).forEach(s=>R.signaux.push({sens:'in', action:n.id, signal:s.signal, port:s.port}));
  });
  els.forEach(x=>{ if(x.metaclasse!=='ExpansionNode') return; const reg=capUmlRef(x,'regionAsInput')[0]||capUmlRef(x,'regionAsOutput')[0], n=R.byId[reg]; if(!n) return;
    const q={id:x.id, name:x.nom||x.libelle||'—', orient:capUmlRef(x,'regionAsInput').length?'IN':'OUT', typeName:''}; n.ports.push(q); pinsOf[x.id]={node:n, pin:q}; });
  // Bords d'activité : paramètres (ActivityParameterNode), créés à la demande
  const bord=apn=>{ const A=actOf(apn)||E(apn.proprietaire); if(!A) return null; const g=groupe(A);
    let n=R.byId[A.id];
    if(!n){ n={id:A.id, name:capUmlNom(A), type:'Activity', nat:'Activity', ico:'⟦⟧', kind:'bord', ports:[], att:g.bloc?[{id:g.bloc.id, name:g.bloc.name, rel:'bloc'}]:[], ctxB:null, act:{id:g.id, name:g.name}, grps:new Set([g.id]), calls:null, children:[], parent:''};
      R.byId[n.id]=n; R.nodes.push(n); }
    let q=n.ports.find(p=>p.id===apn.id);
    if(!q){ q={id:apn.id, name:apn.nom||capUmlNom(E(capUmlRef(apn,'parameter')[0])), orient:'', typeName:''}; n.ports.push(q); pinsOf[apn.id]={node:n, pin:q}; }
    return pinsOf[apn.id]; };
  /** Extrémité d'un flux : pin (et son action), action, paramètre d'activité ; null pour un nœud de contrôle ou initial / final. */
  const ep=e=>{ if(!e) return null;
    if(pinsOf[e.id]) return pinsOf[e.id];
    if(R.byId[e.id]&&R.byId[e.id].kind!=='bord') return {node:R.byId[e.id], pin:null};
    if(e.metaclasse==='ActivityParameterNode') return bord(e);
    return null; };
  // Flux : ramenés d'extrémité à extrémité à travers les nœuds de contrôle
  const out={}, flows=els.filter(e=>e.metaclasse==='ObjectFlow'||e.metaclasse==='ControlFlow');
  flows.forEach(f=>{ const s=capUmlRef(f,'source')[0]; if(s) (out[s]=out[s]||[]).push(f); });
  const vus=new Set();
  flows.forEach(f=>{
    const s=ep(E(capUmlRef(f,'source')[0])); if(!s) return;
    const pile=[[capUmlRef(f,'target')[0], []]], passes=new Set();
    while(pile.length){
      const [id, via]=pile.pop(); if(!id||passes.has(id)) continue; passes.add(id);
      const e=E(id); if(!e) continue;
      if(CAP_UML_CTRL.test(e.metaclasse)){ (out[id]||[]).forEach(g=>pile.push([capUmlRef(g,'target')[0], [...via, e.metaclasse.replace('Node','')]])); continue; }
      const t=ep(e); if(!t) continue;
      const kind=f.metaclasse==='ObjectFlow'?'obj':'ctrl', key=(s.pin?s.pin.id:s.node.id)+'>'+(t.pin?t.pin.id:t.node.id)+'>'+kind;
      if(vus.has(key)) continue; vus.add(key);
      const pinT=(s.pin&&s.pin.typeName)||(t.pin&&t.pin.typeName)||'';
      const end=(x,dir)=>({id:x.node.id, name:x.node.name, portId:x.pin?x.pin.id:'', portName:x.pin?x.pin.name:'', orient:x.pin?(x.pin.orient||dir):''});
      const g=actOf(e)||actOf(f)||E(f.proprietaire);
      const l={id:f.id, name:f.nom||(kind==='obj'?pinT||_L('flux d\'objets'):_L('flux de contrôle')), kind, grp:g&&actById[g.id]?g.id:'', ctxName:g?capUmlNom(g):'', src:end(s,'OUT'), tgt:end(t,'IN'),
        items:kind==='obj'&&pinT?[{id:'', name:pinT}]:[], via:[...new Set(via)], dir:'fwd', warn:''};
      if(s.node.kind==='bord'&&s.pin&&!s.pin.orient) s.pin.dirs=(s.pin.dirs||'')+'o';
      if(t.node.kind==='bord'&&t.pin&&!t.pin.orient) t.pin.dirs=(t.pin.dirs||'')+'i';
      R.links.push(l);
      [l.src,l.tgt].forEach(x=>{ if(x.portId) (R.portLinks[x.portId]=R.portLinks[x.portId]||[]).push(l); else (R.nodeLinks[x.id]=R.nodeLinks[x.id]||[]).push(l); });
    }
  });
  // Paramètres d'activité : orientés selon leur usage (source d'un flux → OUT, cible → IN)
  R.nodes.filter(n=>n.kind==='bord').forEach(n=>n.ports.forEach(p=>{ const d=p.dirs||''; p.orient=d.includes('o')&&d.includes('i')?'INOUT':d.includes('i')?'IN':'OUT'; }));
  R.links.forEach(l=>{ ['src','tgt'].forEach(k=>{ const x=l[k], n=R.byId[x.id]; if(n&&n.kind==='bord'&&x.portId){ const p=n.ports.find(q=>q.id===x.portId); if(p) x.orient=p.orient; } }); });
  // Hiérarchie : une action d'appel « contient » les actions de l'activité appelée
  R.nodes.forEach(n=>{ if(n.calls&&n.calls.id&&actById[n.calls.id]) n.children=R.nodes.filter(m=>m.act&&m.act.id===n.calls.id&&m.kind!=='bord').map(m=>m.id); });
  R.groups=R.acts.filter(g=>g.n||R.byId[g.id]).map(g=>({id:g.id, name:g.name+(g.bloc?` — ${g.bloc.name}`:''), n:R.links.filter(l=>l.grp===g.id).length})).sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true}));
  R.natures=capUmlNatures(R.nodes, t=>t==='Activity'?_L('Bord d\'activité'):t.replace(/([a-z])([A-Z])/g,'$1 $2'));
  const km={obj:0, ctrl:0}; R.links.forEach(l=>{ km[l.kind]++; });
  R.kinds=[{k:'obj', l:_L('Flux d\'objets'), n:km.obj, c:'#3fb950'},{k:'ctrl', l:_L('Flux de contrôle'), n:km.ctrl, c:'#8b949e'}].filter(k=>k.n);
  R.nodes.sort((a,b)=>(a.act?a.act.name:'').localeCompare(b.act?b.act.name:'','fr',{numeric:true})||(a.kind==='bord'?-1:b.kind==='bord'?1:0)||capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlAct=R;
}

/** Contrôles 🩺 des activités : pins non reliés, actions isolées, appels sans comportement, actions sans porteur, flux entre blocs
 * non reliés, signaux envoyés ou attendus sur un port qu'aucun ItemFlow du même signal ne quitte ou n'atteint.
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlActChecks(){
  const A=capUmlActivites(); if(!A.nodes.length) return [];
  const S=capUmlStructure(), fl=(id,n)=>capDetLink(id,n);
  const acts=A.nodes.filter(n=>n.kind!=='bord');
  const nrow=n=>`<tr><td>${fl(n.id,n.name)}</td><td class="ana-dim">${capEsc(n.type)}</td><td>${n.act?fl(n.act.id,n.act.name):'—'}</td></tr>`;
  const ncols=[_L('Action'),'Type',_L('Activité')];
  const orphan=[]; acts.forEach(n=>n.ports.forEach(p=>{ if(!(A.portLinks[p.id]||[]).length) orphan.push({n,p}); }));
  const sansFlux=acts.filter(n=>!(A.nodeLinks[n.id]||[]).length&&!n.ports.some(p=>(A.portLinks[p.id]||[]).length));
  const porteur=n=>n.att.length?n.att.map(x=>x.id):n.ctxB?[n.ctxB.id]:[];
  const relies=new Set(); S.links.forEach(l=>{ relies.add(l.src.id+'|'+l.tgt.id); relies.add(l.tgt.id+'|'+l.src.id); });
  const anc=id=>{ const L=[]; for(let x=S.byId[id]; x&&L.length<50; x=S.byId[x.parent]) L.push(x.id); return L; };
  const proches=(a,b)=>a===b||anc(a).includes(b)||anc(b).includes(a)||anc(a).some(x=>anc(b).some(y=>relies.has(x+'|'+y)));
  const croises=A.links.filter(l=>l.kind==='obj').filter(l=>{ const a=porteur(A.byId[l.src.id]||{att:[]}), b=porteur(A.byId[l.tgt.id]||{att:[]});
    return a.length&&b.length&&!a.some(x=>b.some(y=>proches(x,y))); });
  const sec=[
    {icon:'⭘', title:_L('Pins sans flux'), tip:_L('Pin d\'entrée ou de sortie relié par aucun flux d\'objets'), cols:[_L('Action'),_L('Pin'),_L('Sens'),_L('Activité')],
      items:orphan.map(o=>`<tr><td>${fl(o.n.id,o.n.name)}</td><td>${fl(o.p.id,o.p.name)}</td><td>${o.p.orient==='IN'?_L('▶ entrée'):_L('sortie ▶')}</td><td>${o.n.act?fl(o.n.act.id,o.n.act.name):'—'}</td></tr>`)},
    {icon:'∅', sev:'info', title:_L('Actions sans aucun flux'), tip:_L('Ni flux d\'objets ni flux de contrôle entrant ou sortant'), cols:ncols, items:sansFlux.map(nrow)},
    {icon:'⧉', sev:'err', title:_L('Actions d\'appel sans comportement appelé'), tip:_L('CallBehaviorAction dont le comportement (behavior) est absent'), cols:ncols, items:acts.filter(n=>n.calls&&!n.calls.id).map(nrow)}
  ];
  if(acts.some(n=>n.att.length||n.ctxB)) sec.push({icon:'▣', sev:'info', title:_L('Actions portées par aucun bloc'), tip:_L('Ni partition, ni «allocate», ni bloc dont l\'activité est le comportement'), cols:ncols, items:acts.filter(n=>!n.att.length&&!n.ctxB).map(nrow)});
  sec.push({icon:'⇄', title:_L('Flux d\'objets entre blocs non reliés par un connecteur'), tip:_L('Les actions source et cible sont portées par des blocs différents qu\'aucun connecteur ne relie (ni eux, ni leurs blocs parents)'), cols:[_L('Flux'),_L('Action source'),_L('Action cible'),_L('Activité')],
    items:croises.map(l=>`<tr><td>${fl(l.id,l.name)}</td><td>${fl(l.src.id,l.src.name)}</td><td>${fl(l.tgt.id,l.tgt.name)}</td><td>${l.grp?fl(l.grp,l.ctxName):'—'}</td></tr>`)});
  if(S.flows.length&&A.signaux.length){
    const porte=(sens, sig, port)=>S.flows.some(f=>(sens==='out'?f.src:f.tgt)===port&&f.items.some(i=>i.id===sig));
    const srow=s=>`<tr><td>${fl(s.action,(A.byId[s.action]||{}).name||'—')}</td><td>${capSyLien(s.signal)}</td><td>${s.port?capSyLien(s.port):'—'}</td></tr>`;
    const scols=[_L('Action'),_L('Signal'),_L('Port')];
    sec.push({icon:'📤', title:_L('Signaux envoyés sur un port sans ItemFlow sortant de ce signal'), tip:_L('SendSignalAction (onPort) : aucun ItemFlow ne part de ce port en transportant ce signal'), cols:scols, items:A.signaux.filter(s=>s.sens==='out'&&s.port&&!porte('out',s.signal,s.port)).map(srow)});
    sec.push({icon:'📥', title:_L('Signaux attendus sur un port sans ItemFlow entrant de ce signal'), tip:_L('AcceptEventAction (Trigger sur un port) : aucun ItemFlow n\'arrive sur ce port en transportant ce signal'), cols:scols, items:A.signaux.filter(s=>s.sens==='in'&&s.port&&!porte('in',s.signal,s.port)).map(srow)});
  }
  return sec;
}

/* ── 2 bis. Notation SysML des ports et des pins, ordre du flux, ⇶ couloirs ── */

/** Angle (degrés) de la direction « vers l'intérieur du bloc » d'un port posé sur un côté du bloc : L, R, T, B. */
var CAP_UML_ROT={L:0, R:180, T:90, B:-90};
/** Taille des éléments de la vue ⇶ Couloirs : en-tête de couloir, largeur d'une colonne, largeur d'une action. */
var CAP_UML_CUL={hw:150, col:210, aw:150};
/** Au-delà de ce nombre d'actions, ⇶ Couloirs signale que le dessin est grand et renvoie à la Vue Blocs paginée. */
var CAP_UML_CUL_MAX=60;

/** Genre SysML d'un port d'après son stéréotype, qui choisit sa forme : full port (carré plein), proxy port et flow port (carré vide
 * coloré), port standard (carré au trait fin).
 * @param {string} st - Stéréotype ou type du port (`FullPort`, `ProxyPort`, `FlowPort`, `Port`…) @returns {'std'|'proxy'|'full'} Genre */
function capUmlPortGenre(st){ return /FullPort/i.test(st||'')?'full':/Proxy|FlowPort/i.test(st||'')?'proxy':'std'; }

/** Port SysML en SVG, centré sur (x, y) : forme selon le genre, flèche selon le sens (IN vers l'intérieur du bloc, OUT vers l'extérieur,
 * INOUT double, sans sens aucune), couleur de `CAP_ORIENT_STYLE` (27) ; tilde si conjugué, pointillé si non connecté.
 * @param {number} x - Abscisse @param {number} y - Ordonnée @param {string} side - Côté du bloc (L, R, T, B)
 * @param {string} o - Orientation IN / OUT / INOUT / UNSET @param {object} [opt] - {genre, conj, orphan, taille} @returns {string} SVG */
function capUmlPortSvg(x, y, side, o, opt){
  opt=opt||{}; const g=opt.genre||'proxy', t=opt.taille||12, h=t/2, a=h*.55, k=(CAP_ORIENT_STYLE[o]||CAP_ORIENT_STYLE.UNSET).c;
  const col=g==='std'?'var(--c-text)':k, ar=g==='full'?'var(--c-bg)':col, into=CAP_UML_ROT[side]||0;
  let f='';
  if(o==='IN'||o==='OUT') f=`<path d="M${-a},${-a} L${a},0 L${-a},${a}Z" fill="${ar}" transform="rotate(${o==='OUT'?into+180:into})"/>`;
  else if(o==='INOUT') f=`<path d="M${-h*.8},0 L${-h*.1},${-a} L${-h*.1},${a}Z M${h*.8},0 L${h*.1},${-a} L${h*.1},${a}Z" fill="${ar}" transform="rotate(${into})"/>`;
  const tl=opt.conj?`<text x="0" y="${-h-2}" font-size="11" font-weight="700" text-anchor="middle" style="fill:${k}">~</text>`:'';
  return `<g transform="translate(${x},${y})"><rect x="${-h}" y="${-h}" width="${t}" height="${t}" fill="${g==='full'?k:'var(--c-bg)'}" stroke="${col}" stroke-width="${g==='std'?1.2:1.6}"${opt.orphan?' stroke-dasharray="2 1.5"':''}/>${f}${tl}</g>`;
}

/** Port SysML en icône HTML (SVG de 16 px) pour les fiches et la Vue Ligne.
 * @param {string} o - Orientation @param {string} side - Côté du bloc (L, R) @param {object} [opt] - {genre, orphan, tip} @returns {string} HTML */
function capUmlPortIco(o, side, opt){
  opt=opt||{};
  return `<svg class="cub-ico" width="16" height="16" viewBox="-8 -8 16 16"><title>${capEsc(opt.tip||'')}</title>${capUmlPortSvg(0,0,side,o,{genre:opt.genre, orphan:opt.orphan})}</svg>`;
}

/** Pin d'action en SVG : carré plein de la couleur du sens (mêmes couleurs que les ports des blocs), vide et pointillé s'il n'est relié à rien.
 * @param {number} x - Abscisse du centre @param {number} y - Ordonnée du centre @param {string} o - Orientation @param {boolean} [orphan] - Non relié
 * @param {number} [t] - Côté (10 px) @returns {string} SVG */
function capUmlPinSvg(x, y, o, orphan, t){
  t=t||10; const h=t/2, k=(CAP_ORIENT_STYLE[o]||CAP_ORIENT_STYLE.UNSET).c;
  return `<rect x="${x-h}" y="${y-h}" width="${t}" height="${t}" fill="${orphan?'var(--c-bg)':k}" stroke="${k}" stroke-width="1.4"${orphan?' stroke-dasharray="2 1.5"':''}/>`;
}

/** Pin d'action en icône HTML (SVG de 14 px) ; virt : flux relié à l'action sans pin (pointillé gris).
 * @param {string} o - Orientation @param {object} [opt] - {orphan, virt, tip} @returns {string} HTML */
function capUmlPinIco(o, opt){
  opt=opt||{};
  return `<svg class="cub-ico" width="14" height="14" viewBox="-7 -7 14 14"><title>${capEsc(opt.tip||'')}</title>${opt.virt?'<rect x="-4.5" y="-4.5" width="9" height="9" fill="none" stroke="var(--c-dim)" stroke-width="1.2" stroke-dasharray="2 1.5"/>':capUmlPinSvg(0,0,o,opt.orphan,10)}</svg>`;
}

/** Icône d'un élément pour les fiches : celle du jeu d'Arcature (`capIco`, selon le type et le stéréotype), sinon le symbole du moteur.
 * @param {object} n - Nœud {id, ico} @param {number} [taille] - Taille (14 px) @returns {string} HTML */
function capUmlIcoHtml(n, taille){ const s=typeof capIco==='function'?capIco(n.id, taille||14):''; return s&&/^\s*<svg/.test(s)?s:capEsc(n.ico||''); }

/** Icône d'un élément posée dans un dessin SVG (coin haut gauche en x, y), ou rien si le jeu d'Arcature n'en a pas.
 * @param {string} id - Élément @param {number} x - Abscisse @param {number} y - Ordonnée @param {number} [taille] - Taille (14 px) @returns {string} SVG */
function capUmlIcoSvg(id, x, y, taille){ const s=id&&typeof capIco==='function'?capIco(id, taille||14):''; return s&&/^\s*<svg/.test(s)?`<g transform="translate(${x},${y})" pointer-events="none">${s}</g>`:''; }

/** Couleur d'un connecteur ou d'un flux selon son état : erreur (sens incompatibles), accent (ItemFlow ou flux d'objets), atténuée (sans
 * ItemFlow, flux de contrôle). @param {object} l - Connecteur ou flux @returns {string} Couleur CSS */
function capUmlLienCouleur(l){ return l.warn?'var(--c-err,#f85149)':l.kind==='ctrl'?'var(--c-dim)':(l.kind==='obj'||(l.items||[]).length)?'var(--c-accent,#58a6ff)':'var(--c-dim)'; }

/** Rang de chaque nœud dans l'ordre du flux : plus long chemin depuis les nœuds sans prédécesseur, arcs de retour (boucles) ignorés.
 * @param {string[]} ids - Nœuds @param {Array<string[]>} arcs - Arcs [source, cible] @returns {object} Rang par identifiant */
function capUmlRangs(ids, arcs){
  const succ={}, deg0={}, ens=new Set(ids); ids.forEach(i=>{ succ[i]=[]; deg0[i]=0; });
  arcs.forEach(([a,b])=>{ if(ens.has(a)&&ens.has(b)&&a!==b&&!succ[a].includes(b)){ succ[a].push(b); deg0[b]++; } });
  const etat={}, garde={}; ids.forEach(i=>{ garde[i]=[]; });
  [...ids.filter(i=>!deg0[i]), ...ids.filter(i=>deg0[i])].forEach(r=>{
    if(etat[r]) return; const pile=[[r,0]]; etat[r]=1;
    while(pile.length){ const top=pile[pile.length-1], n=top[0];
      if(top[1]<succ[n].length){ const m=succ[n][top[1]++]; if(!etat[m]){ etat[m]=1; garde[n].push(m); pile.push([m,0]); } else if(etat[m]===2) garde[n].push(m); }
      else { etat[n]=2; pile.pop(); } }
  });
  const deg={}, rang={}; ids.forEach(i=>{ deg[i]=0; rang[i]=0; }); ids.forEach(i=>garde[i].forEach(m=>deg[m]++));
  const file=ids.filter(i=>!deg[i]);
  for(let k=0; k<file.length; k++){ const n=file[k]; garde[n].forEach(m=>{ rang[m]=Math.max(rang[m], rang[n]+1); if(!--deg[m]) file.push(m); }); }
  return rang;
}

/** Graphe d'une activité pour la vue ⇶ Couloirs (mis en cache) : actions de `capUmlActivites`, nœuds de contrôle (début, fin, fin de flux,
 * fork, join, decision, merge), paramètres, flux d'extrémité à extrémité (pin ramené à son action), couloir de chaque nœud (porteur de
 * l'action ; nœud de contrôle et paramètre : couloir d'une action voisine) et rang dans l'ordre du flux.
 * @param {string} actId - Activité @returns {{nodes:object[], byId:object, edges:object[], lanes:object[]}} Graphe */
function capUmlActGraphe(actId){
  const C=_capAnaCache.umlActG=_capAnaCache.umlActG||{}; if(C[actId]) return C[actId];
  const G={nodes:[], byId:{}, edges:[], lanes:[]}; C[actId]=G;
  const lec=capUmlLec(); if(!lec) return G;
  const A=capUmlActivites(), E=id=>id?lec.element(id):null;
  const actOf=e=>{ for(let x=E(e.proprietaire); x; x=E(x.proprietaire)) if(x.metaclasse==='Activity') return x; return null; };
  const CTRL={InitialNode:'initial', ActivityFinalNode:'final', FlowFinalNode:'flowfinal', ForkNode:'fork', JoinNode:'join', MergeNode:'merge', DecisionNode:'decision'};
  const add=(id,o)=>{ if(G.byId[id]) return G.byId[id]; o.id=id; G.byId[id]=o; G.nodes.push(o); return o; };
  const pinOf={}, pinType={};
  A.nodes.forEach(n=>{ if(n.kind==='bord'||!n.act||n.act.id!==actId) return; add(n.id,{k:'action', n, name:n.name});
    n.ports.forEach(p=>{ pinOf[p.id]=n.id; pinType[p.id]=p.typeName||''; }); });
  const bord=A.byId[actId];
  lec.elements().forEach(e=>{
    if(CTRL[e.metaclasse]){ const a=actOf(e); if(a&&a.id===actId) add(e.id,{k:CTRL[e.metaclasse], name:e.nom||e.metaclasse.replace('Node','')}); }
    else if(e.metaclasse==='ActivityParameterNode'&&(actOf(e)||E(e.proprietaire)||{}).id===actId){
      const p=bord&&bord.ports.find(q=>q.id===e.id); add(e.id,{k:'param', name:p?p.name:capUmlNom(e), orient:p?p.orient:'INOUT', typeName:capUmlNom(E(capUmlRef(e,'type')[0]))}); }
  });
  const res=id=>G.byId[id]?{id, pin:''}:pinOf[id]?{id:pinOf[id], pin:id}:null;
  lec.elements().forEach(f=>{
    if(f.metaclasse!=='ObjectFlow'&&f.metaclasse!=='ControlFlow') return;
    const s=res(capUmlRef(f,'source')[0]), t=res(capUmlRef(f,'target')[0]); if(!s||!t) return;
    const kind=f.metaclasse==='ObjectFlow'?'obj':'ctrl';
    G.edges.push({id:f.id, kind, s, t, name:f.nom||(kind==='obj'?pinType[s.pin]||pinType[t.pin]||'':'')});
  });
  // Couloirs : porteur de chaque action (partition, «allocate», sinon bloc dont l'activité est le comportement), puis voisins
  G.nodes.forEach(x=>{ if(x.k!=='action') return; const a=x.n.att[0]||(x.n.ctxB?{id:x.n.ctxB.id, name:x.n.ctxB.name, rel:'bloc'}:null);
    x.lane=a?a.id:''; if(a&&!G.lanes.some(l=>l.id===a.id)) G.lanes.push({id:a.id, name:a.name, rel:a.rel}); });
  for(let tour=0; tour<4; tour++) G.edges.forEach(e=>{ const a=G.byId[e.s.id], b=G.byId[e.t.id];
    if(a.lane===undefined&&b.lane!==undefined) a.lane=b.lane; else if(b.lane===undefined&&a.lane!==undefined) b.lane=a.lane; });
  G.nodes.forEach(x=>{ if(x.lane===undefined) x.lane=G.lanes.length?G.lanes[0].id:''; });
  if(G.nodes.some(x=>x.lane==='')) G.lanes.push({id:'', name:_L('Non alloué'), rel:''});
  const rang=capUmlRangs(G.nodes.map(x=>x.id), G.edges.map(e=>[e.s.id,e.t.id]));
  G.nodes.forEach(x=>{ x.rang=rang[x.id]||0; });
  const premier={}; G.nodes.forEach(x=>{ premier[x.lane]=Math.min(premier[x.lane]??1e9, x.rang); });
  G.lanes.sort((a,b)=>(a.id==='')-(b.id==='')||premier[a.id]-premier[b.id]||a.name.localeCompare(b.name,'fr',{numeric:true}));
  return G;
}

/** Dessin SVG d'une activité en couloirs horizontaux (un par porteur, « Non alloué » en dernier), actions de gauche à droite dans l'ordre
 * du flux : pins aux couleurs des ports, flux d'objets en trait plein (accent) avec l'objet transporté, flux de contrôle en pointillé,
 * nœuds de contrôle (disque, cocarde, barre, losange), envoi et attente de signal aux formes UML, appel sans comportement en pointillé.
 * @param {object} G - Graphe (`capUmlActGraphe`) @param {object} opt - {titre, keep(nœud) → bool, zoom} @returns {string} SVG */
function capUmlCouloirsSvg(G, opt){
  const esc=capEsc, K=CAP_UML_CUL, aw=K.aw, keep=opt.keep||(()=>true), z=opt.zoom||1;
  const coupe=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
  const dims=x=>{ if(x.k==='action'){ const ni=x.n.ports.filter(p=>p.orient!=='OUT').length, no=x.n.ports.filter(p=>p.orient==='OUT').length; return {w:aw, h:Math.max(40,14+Math.max(ni,no)*16)}; }
    if(x.k==='param') return {w:aw, h:26};
    if(x.k==='fork'||x.k==='join') return {w:7, h:44};
    if(x.k==='decision'||x.k==='merge') return {w:24, h:24};
    return {w:18, h:18}; };
  // Placement : couloirs, rangs, piles
  const pos={}; let y=30;
  const lanes=G.lanes.map(L=>{
    const ns=G.nodes.filter(x=>x.lane===L.id), parRang={};
    ns.forEach(x=>{ (parRang[x.rang]=parRang[x.rang]||[]).push(x); });
    const rowH=Math.max(64, ...ns.map(x=>dims(x).h+28)), pile=Math.max(1, ...Object.values(parRang).map(a=>a.length));
    const h=pile*rowH+16, lane={L, y, h};
    Object.values(parRang).forEach(a=>a.forEach((x,i)=>{ const d=dims(x);
      pos[x.id]={cx:K.hw+30+x.rang*K.col+aw/2, cy:y+8+i*rowH+rowH/2, w:d.w, h:d.h}; }));
    y+=h; return lane; });
  const maxR=Math.max(0, ...G.nodes.map(x=>x.rang)), W=K.hw+60+maxR*K.col+aw+20, H=y+12;
  // Ancrages des flux : pin de l'action, sinon bord du nœud
  const pinY={};
  G.nodes.forEach(x=>{ if(x.k!=='action') return; const p=pos[x.id];
    [['IN',x.n.ports.filter(q=>q.orient!=='OUT')],['OUT',x.n.ports.filter(q=>q.orient==='OUT')]].forEach(([o,ps])=>ps.forEach((q,i)=>{
      pinY[q.id]={x:o==='OUT'?p.cx+p.w/2:p.cx-p.w/2, y:p.cy+(i-(ps.length-1)/2)*16, o, name:q.name, type:q.typeName}; })); });
  const relie=new Set(); G.edges.forEach(e=>{ if(e.s.pin) relie.add(e.s.pin); if(e.t.pin) relie.add(e.t.pin); });
  const ancre=(end,sortie)=>{ if(end.pin&&pinY[end.pin]) return pinY[end.pin]; const p=pos[end.id]; return {x:sortie?p.cx+p.w/2:p.cx-p.w/2, y:p.cy}; };
  let s=`<svg class="cul-svg" xmlns="http://www.w3.org/2000/svg" width="${Math.round(W*z)}" height="${Math.round(H*z)}" viewBox="0 0 ${W} ${H}">`;
  s+=`<rect x="1" y="1" width="${W-2}" height="${H-2}" class="cul-frame"/><path d="M1,22 H${Math.min(W-2,esc(opt.titre||'').length*6.6+40)} l8,-8 V1" class="cul-tab"/><text x="8" y="16" class="cul-t" font-weight="600">act ${esc(opt.titre||'')}</text>`;
  lanes.forEach((ln,i)=>{ const rel=ln.L.rel==='partition'?_L('partition'):ln.L.rel==='allocate'?'«allocate»':ln.L.rel==='bloc'?_L('comportement'):'';
    s+=`<rect x="1" y="${ln.y}" width="${W-2}" height="${ln.h}" class="cul-lane${i%2?' cul-lane2':''}"/><rect x="1" y="${ln.y}" width="${K.hw}" height="${ln.h}" class="cul-lhead"/>`;
    s+=`<g${ln.L.id?` data-blk="${esc(ln.L.id)}" class="cul-clic"`:''}><title>${esc(ln.L.name)}${rel?' — '+esc(rel):''}${ln.L.id?' — '+_L('clic : son bloc dans 🧱 Blocs & ports'):''}</title>${capUmlIcoSvg(ln.L.id,8,ln.y+ln.h/2-11)}<text x="${ln.L.id?27:10}" y="${ln.y+ln.h/2}" class="cul-t" font-weight="600">${esc(coupe(ln.L.name,18))}</text>${rel?`<text x="10" y="${ln.y+ln.h/2+15}" class="cul-d">${esc(rel)}</text>`:''}</g>`; });
  // Flux (sous les nœuds)
  G.edges.forEach((e,i)=>{ const a=ancre(e.s,true), b=ancre(e.t,false), col=e.kind==='obj'?'var(--c-accent,#58a6ff)':'var(--c-dim)';
    const op=keep(G.byId[e.s.id])||keep(G.byId[e.t.id])?'':' opacity="0.3"';
    let d;
    if(b.x>a.x+16){ const mx=Math.max(a.x+10, b.x-18-(i%3)*6); d=`M${a.x},${a.y} H${mx} V${b.y} H${b.x}`; }
    else { const yb=Math.max(pos[e.s.id].cy+pos[e.s.id].h/2, pos[e.t.id].cy+pos[e.t.id].h/2)+12+(i%3)*4; d=`M${a.x},${a.y} h12 V${yb} H${b.x-14} V${b.y} H${b.x}`; }
    s+=`<g${op}><title>${esc(e.name||(e.kind==='obj'?_L('flux d\'objets'):_L('flux de contrôle')))} — ${esc(G.byId[e.s.id].name)} → ${esc(G.byId[e.t.id].name)}</title><path d="${d}" fill="none" stroke="${col}" stroke-width="${e.kind==='obj'?1.7:1.3}"${e.kind==='ctrl'?' stroke-dasharray="4 3"':''}/>`;
    s+=e.kind==='obj'?`<path d="M${b.x-9},${b.y-4} L${b.x-1},${b.y} L${b.x-9},${b.y+4}Z" fill="${col}"/>`:`<path d="M${b.x-7},${b.y-4} L${b.x-1},${b.y} L${b.x-7},${b.y+4}" fill="none" stroke="${col}" stroke-width="1.4"/>`;
    if(e.kind==='obj'&&e.name) s+=`<text x="${a.x+8}" y="${a.y-5}" class="cul-d" style="fill:${col}">${esc(coupe(e.name,18))}</text>`;
    s+='</g>'; });
  // Nœuds
  G.nodes.forEach(x=>{ const p=pos[x.id], op=keep(x)?'':' opacity="0.3"', l=p.cx-p.w/2, t=p.cy-p.h/2;
    if(x.k==='action'){ const n=x.n, sans=n.calls&&!n.calls.id, ty=n.type;
      const forme=ty==='SendSignalAction'?`<path d="M${l},${t} H${l+p.w-14} L${l+p.w},${p.cy} L${l+p.w-14},${t+p.h} H${l}Z" class="cul-act"/>`
        :ty==='AcceptEventAction'?`<path d="M${l},${t} H${l+p.w} V${t+p.h} H${l} L${l+14},${p.cy}Z" class="cul-act"/>`
        :`<rect x="${l}" y="${t}" width="${p.w}" height="${p.h}" rx="9" class="cul-act${sans?' cul-warn':''}"/>`;
      const appel=n.calls&&n.calls.id?`<text x="${l+p.w-16}" y="${t+13}" class="cul-d cul-clic" data-grp="${esc(n.calls.id)}"><title>${_L(`Activité appelée « ${esc(n.calls.name)} » — clic : ses couloirs`)}</title>⧉</text>`:'';
      s+=`<g${op}><g class="cul-clic" data-det="${esc(n.id)}"><title>${esc(n.name)} — ${esc(ty.replace(/([a-z])([A-Z])/g,'$1 $2'))}${sans?' — '+_L('appel sans comportement'):''}</title>${forme}${capUmlIcoSvg(n.id,l+(ty==='AcceptEventAction'?16:7),p.cy-7)}<text x="${p.cx+(ty==='AcceptEventAction'?12:8)}" y="${p.cy+4}" text-anchor="middle" class="cul-t" font-weight="600">${esc(coupe(n.name,19))}</text></g>${appel}`;
      n.ports.forEach(q=>{ const P=pinY[q.id]; if(!P) return; const g=P.o==='OUT';
        s+=`<g><title>${g?_L('Pin de sortie'):_L('Pin d\'entrée')} ${esc(q.name)}${q.typeName?' : '+esc(q.typeName):''}${relie.has(q.id)?'':_L(' — non connecté')}</title>${capUmlPinSvg(P.x,P.y,P.o,!relie.has(q.id))}<text x="${g?P.x+7:P.x-7}" y="${P.y+13}" text-anchor="${g?'start':'end'}" class="cul-d cul-mono">${esc(coupe(q.name,14))}</text></g>`; });
      if(sans) s+=`<text x="${l+p.w/2}" y="${t+p.h+12}" text-anchor="middle" class="cul-d" style="fill:var(--c-warn,#e3b341)">⚠ ${_L('appel sans comportement')}</text>`;
      s+='</g>'; return; }
    const tip=`<title>${esc(x.name)}</title>`;
    if(x.k==='param'){ const c=(CAP_ORIENT_STYLE[x.orient]||CAP_ORIENT_STYLE.UNSET).c;
      s+=`<g${op} class="cul-clic" data-det="${esc(x.id)}"><title>${_L('Paramètre d\'activité')} ${esc(x.name)}${x.typeName&&x.typeName!=='—'?' : '+esc(x.typeName):''}</title><rect x="${l}" y="${t}" width="${p.w}" height="${p.h}" fill="var(--c-bg)" stroke="${c}" stroke-width="1.6"/><text x="${p.cx}" y="${p.cy+4}" text-anchor="middle" class="cul-t cul-mono">${esc(coupe(x.name+(x.typeName&&x.typeName!=='—'?' : '+x.typeName:''),24))}</text></g>`; return; }
    if(x.k==='initial') s+=`<g${op}>${tip}<circle cx="${p.cx}" cy="${p.cy}" r="8" class="cul-ink"/></g>`;
    else if(x.k==='final') s+=`<g${op}>${tip}<circle cx="${p.cx}" cy="${p.cy}" r="9" fill="none" class="cul-ring"/><circle cx="${p.cx}" cy="${p.cy}" r="5" class="cul-ink"/></g>`;
    else if(x.k==='flowfinal') s+=`<g${op}>${tip}<circle cx="${p.cx}" cy="${p.cy}" r="9" fill="var(--c-bg)" class="cul-ring"/><path d="M${p.cx-6},${p.cy-6} L${p.cx+6},${p.cy+6} M${p.cx+6},${p.cy-6} L${p.cx-6},${p.cy+6}" class="cul-ring"/></g>`;
    else if(x.k==='fork'||x.k==='join') s+=`<g${op}>${tip}<rect x="${l}" y="${t}" width="${p.w}" height="${p.h}" class="cul-ink"/></g>`;
    else s+=`<g${op}>${tip}<path d="M${p.cx},${t} L${p.cx+12},${p.cy} L${p.cx},${t+p.h} L${p.cx-12},${p.cy}Z" fill="var(--c-bg)" class="cul-ring"/></g>`;
  });
  return s+'</svg>';
}

/* ── 3. Vue Blocs commune ────────────────────────────────────────── */

/** Vocabulaire et réglages de la Vue Blocs selon le moteur. @param {'blk'|'act'} mode - Moteur @returns {object} */
function capUmlBlkVoc(mode){
  return mode==='act'?{mode, Node:_L('Action'), Nodes:_L('Actions'), nodes:_L('actions'), Link:_L('Flux'), Links:_L('Flux'), links:_L('flux'), Port:_L('Pin'),
      grp:_L('Activité'), grpAll:_L('Toutes les activités'), grpTip:_L('Actions et flux d\'une activité (son bord porte ses paramètres)'), nat:_L('Genre'), lk:_L('Flux'),
      none:_L('Aucune action dans les activités de ce modèle.'), noneF:_L('Aucune action ne correspond au filtre.'), noneL:_L('Aucun flux ne correspond au filtre.'),
      title:_L('ƒ Activités & flux'), file:_L('activites'), withPorts:_L('avec pins ou flux'),
      lanesTip:_L('Une activité en couloirs, un par porteur (partition, «allocate», bloc dont elle est le comportement) : actions dans l\'ordre du flux, flux d\'objets en trait plein, flux de contrôle en pointillé, nœuds de contrôle, envoi et attente de signal'),
      blockTip:_L('Actions dans l\'ordre du flux, dessinées comme les fonctions de Capella : pins d\'entrée (orange) à gauche, de sortie (verts) à droite, comme les ports des blocs ; vert = portée par un bloc (partition, «allocate»), bleu = comportement d\'un bloc, gris = libre, jaune = bord de l\'activité (paramètres)'),
      lineTip:_L('Un flux par ligne, d\'action à action (nœuds de contrôle traversés)'), mxTip:_L('Action × action (100 actions au plus)'), diagTip:_L('Pins sans flux, actions isolées, flux entre blocs non reliés, signaux sans ItemFlow')}
    :{mode, Node:_L('Bloc'), Nodes:_L('Blocs'), nodes:_L('blocs'), Link:_L('Connecteur'), Links:_L('Connecteurs'), links:_L('connecteurs'), Port:_L('Port'),
      grp:_L('Contexte'), grpAll:_L('Tous les contextes'), grpTip:_L('Parts et connecteurs d\'un bloc composite, comme son diagramme de blocs internes (ibd)'), nat:'Type', lk:_L('Connecteurs'),
      none:_L('Aucun bloc à ports, à parts ou à connecteurs dans ce modèle.'), noneF:_L('Aucun bloc ne correspond au filtre.'), noneL:_L('Aucun connecteur ne correspond au filtre.'),
      title:_L('🧱 Blocs & ports'), file:_L('blocs'), withPorts:_L('avec ports ou connecteurs'),
      focusTip:_L('Un bloc au centre, à gauche les blocs qui lui envoient, à droite ceux qui reçoivent ; clic sur un voisin pour le mettre au centre'),
      blockTip:_L('Blocs dessinés comme les composants de Capella, ports en notation SysML : carré vide = proxy port, plein = full port, trait fin = port standard ; flèche et couleur = sens d\'après les FlowProperty du type (IN orange, OUT vert, INOUT violet, sans sens gris), ~ = conjugué ; à côté de chaque port, le connecteur, le bloc et le port distants et les objets transportés'),
      lineTip:_L('Un connecteur par ligne : bloc ⬦ port → connecteur → port ⬦ bloc, avec ce que transportent ses ItemFlow'), mxTip:_L('Bloc × bloc (100 blocs au plus)'), diagTip:_L('Ports sans connecteur, sens incompatibles, ItemFlow contraires ou isolés, blocs sans port ou sans allocation')};
}

/** Ouvre un élément dans la Vue Blocs UML qui le montre (🧱 Blocs & ports pour un bloc, ƒ Activités & flux pour une action ou une
 * activité), sinon son panneau de détail. @param {string} id - Identifiant @returns {boolean} Vrai si une Vue Blocs l'a pris */
function capUmlBlkOuvrir(id){
  const A=capUmlActivites(), S=capUmlStructure();
  const v=A.byId[id]||A.groups.some(g=>g.id===id)?'umlact':S.byId[id]?'umlblk':'';
  if(!v){ capOpenDetailById(id); return false; }
  _capUmlGo={v, id}; capNavOpen('ana:'+v); return true;
}

/** Boutons « ◧ Vue Blocs » du panneau de détail d'un élément UML montré par 🧱 Blocs & ports ou ƒ Activités & flux (rangée posée par `capUmlVuesBoutons`, 88).
 * @param {string} id - Identifiant @returns {string} HTML (vide si aucune vue ne le montre) */
function capUmlBlkDetail(id){
  if(!capUmlLec()) return '';
  const S=capUmlStructure(), A=capUmlActivites(), b=[];
  if(S.byId[id]) b.push(`<button class="cap-lf-btn" onclick="capUmlBlkOuvrir('${capEsc(id)}')" title="${_L('Ouvrir ce bloc dans 🏗 Architecture › 🧬 UML / SysML v1 › 🧱 Blocs & ports')}">◧ ${_L('Blocs & ports')}</button>`);
  if(A.byId[id]||A.groups.some(g=>g.id===id)) b.push(`<button class="cap-lf-btn" onclick="capUmlBlkOuvrir('${capEsc(id)}')" title="${_L('Ouvrir dans 🏗 Architecture › 🧬 UML / SysML v1 › ƒ Activités & flux')}">◧ ${_L('Activités & flux')}</button>`);
  return b.join('');
}

/** Vue Blocs commune aux blocs (🧱 Blocs & ports) et aux activités (ƒ Activités & flux) d'un modèle UML / SysML v1 :
 * ◧ Blocs, ≡ Ligne, ▦ Matrice, 🩺 Contrôles ; filtres, pagination, exports.
 * @param {HTMLElement} box - Conteneur (porte l'état `_ub`)
 * @param {object} S - Données du moteur (`capUmlStructure` ou `capUmlActivites`)
 * @param {object} W - Vocabulaire (`capUmlBlkVoc`)
 * @param {Function} checks - Sections de contrôle 🩺
 * @param {string} cle - Sous-vue (`umlblk` / `umlact`), pour l'ouverture d'un élément venu d'ailleurs
 */
/** Menu déroulant de filtre à cases (remplace une rangée de puces) : bouton « Libellé : 6 / 7 ▾ » (« tous » quand rien n'est filtré),
 * panneau avec recherche (au-delà de 6 valeurs), Tout / Aucun, une case par valeur (pastille de couleur, nombre, « seul » au survol).
 * Rien sans au moins deux valeurs. @param {string} attr - Clé (`data-<attr>` des cases) @param {string} lab - Libellé
 * @param {{k:string,l:string,c?:string,tip?:string}[]} list - Valeurs @param {Set<string>} sel - Valeurs cochées
 * @param {function(object):number} cnt - Nombre par valeur @param {boolean} ouvert - Panneau affiché @returns {string} HTML */
function capFiltreMenuHtml(attr, lab, list, sel, cnt, ouvert){
  if(list.length<2) return '';
  const esc=capEsc, n=list.filter(k=>sel.has(k.k)).length, tous=n===list.length;
  return `<span class="cfm" data-cfm="${attr}"><button class="cap-lf-btn cfm-b${tous?'':' active'}" data-cfmb="${attr}" title="${_L('Choisir les valeurs affichées')}">${esc(lab)} : <b>${tous?_L('tous'):`${n} / ${list.length}`}</b> ▾</button>`+
    `<div class="cfm-p"${ouvert?'':' hidden'}>`+(list.length>6?`<input class="phl-filter-input cfm-q" placeholder="${_L('Rechercher…')}">`:'')+
    `<div class="cfm-a"><button class="cap-lf-btn" data-cfmall="1">${_L('Tout')}</button><button class="cap-lf-btn" data-cfmall="0">${_L('Aucun')}</button></div>`+
    `<div class="cfm-l">${list.map(k=>`<label class="cfm-i" title="${esc(k.tip||k.l)}"><input type="checkbox" data-${attr}="${esc(k.k)}"${sel.has(k.k)?' checked':''}><span class="cfm-dot" style="background:${k.c||'var(--c-dim)'}"></span>`+
      `<span class="cfm-t">${esc(k.l)}</span><b class="cfm-n">${cnt(k)}</b><span class="cfm-seul" data-cfmseul="${esc(k.k)}" title="${_L('Afficher seulement celle-ci')}">${_L('seul')}</span></label>`).join('')}</div></div></span>`;
}

/** Branche un menu de filtre (`capFiltreMenuHtml`) : ouverture / fermeture (clic au dehors), cases, Tout / Aucun, « seul », recherche.
 * Le panneau reste ouvert après le nouveau rendu (`st.dd`). @param {HTMLElement} box - Conteneur @param {string} attr - Clé
 * @param {Set<string>} set - Valeurs cochées (modifiées en place) @param {string[]} toutes - Toutes les valeurs @param {object} st - État de la vue
 * @param {Function} apres - Nouveau rendu après un changement */
function capFiltreMenuBind(box, attr, set, toutes, st, apres){
  const m=box.querySelector(`.cfm[data-cfm="${attr}"]`); if(!m) return;
  const p=m.querySelector('.cfm-p');
  m.querySelector('[data-cfmb]').onclick=ev=>{ ev.stopPropagation(); const o=p.hidden; box.querySelectorAll('.cfm-p').forEach(x=>x.hidden=true); p.hidden=!o; st.dd=o?attr:''; if(o) m.querySelector('.cfm-q')?.focus(); };
  m.querySelectorAll(`[data-${attr}]`).forEach(cb=>cb.onchange=()=>{ const k=cb.dataset[attr]; if(cb.checked) set.add(k); else set.delete(k); apres(); });
  m.querySelectorAll('[data-cfmall]').forEach(b=>b.onclick=()=>{ set.clear(); if(b.dataset.cfmall==='1') toutes.forEach(k=>set.add(k)); apres(); });
  m.querySelectorAll('[data-cfmseul]').forEach(b=>b.onclick=ev=>{ ev.preventDefault(); ev.stopPropagation(); set.clear(); set.add(b.dataset.cfmseul); apres(); });
  const q=m.querySelector('.cfm-q'); if(q) q.oninput=()=>{ const t=capTfNorm(q.value.trim()); m.querySelectorAll('.cfm-i').forEach(x=>x.style.display=!t||capTfNorm(x.textContent).includes(t)?'':'none'); };
  if(!box._cfmDoc){ box._cfmDoc=true; document.addEventListener('mousedown',e=>{ if(!box.isConnected||e.target.closest('.cfm')) return; box.querySelectorAll('.cfm-p').forEach(x=>x.hidden=true); if(box._ub) box._ub.dd=''; }); }
}

function capUmlBlkRender(box, S, W, checks, cle){
  const st=box._ub=box._ub||{view:W.mode==='act'?'lanes':'block', name:'', ex:'', nk:null, lk:null, grp:'', withPorts:W.mode!=='act'&&S.links.length>0, page:0, back:null, open:new Set(), focus:'', hist:[], zoom:1, dense:false, cOpen:new Set(), dd:''};   // dense : ◧ Vue Blocs en cartes compactes (▤ détaillée par défaut) ; cOpen : liens dépliés ; dd : menu de filtre ouvert
  if(!S.nodes.length){ box.innerHTML=`<div class="phl-empty">${W.none}</div>`; return; }
  if(!st.nk) st.nk=new Set(S.natures.map(n=>n.k));
  if(!st.lk) st.lk=new Set(S.kinds.map(k=>k.k));
  if(st.grp&&!S.groups.some(g=>g.id===st.grp)) st.grp='';
  const esc=capEsc, ACT=W.mode==='act';
  const num={}; S.links.forEach((l,i)=>{ num[l.id+'>'+l.src.portId+'>'+l.tgt.portId+'>'+l.src.id+'>'+l.tgt.id]=i+1; });
  const lnum=l=>num[l.id+'>'+l.src.portId+'>'+l.tgt.portId+'>'+l.src.id+'>'+l.tgt.id]||0;
  const lc=capUmlLienCouleur;
  const NATC={}; S.natures.forEach(n=>{ NATC[n.k]=n.c; });
  const kc=n=>n.kind==='act'?'#7fd8ff':n.kind==='bord'?'#e3b341':ACT?(n.kind==='sys'?'#3fb950':n.kind==='none'?'#8b949e':'#58a6ff'):'#58a6ff';
  const det=(id,label,extra)=>id?`<span class="cex-det" style="cursor:pointer;${extra||''}" onclick="event.stopPropagation();capOpenDetailById('${esc(id)}')">${esc(label)}</span>`:`<span style="${extra||''}">${esc(label)}</span>`;
  const linkOk=l=>(!S.kinds.length||st.lk.has(l.kind))&&(!st.grp||l.grp===st.grp);
  const nodeOk=n=>st.nk.has(n.nat)&&(!st.grp||n.grps.has(st.grp));
  const txt=l=>(l.name+' '+l.items.map(i=>i.name).join(' ')).toLowerCase();
  /** Liens d'un nœud retenus par les filtres (par ses ports, puis directs). */
  const liensDe=n=>[...n.ports.flatMap(p=>(S.portLinks[p.id]||[]).filter(linkOk)), ...(S.nodeLinks[n.id]||[]).filter(linkOk)];
  /** Nœuds retenus par les filtres. */
  function getNodes(){
    const nf=st.name.trim().toLowerCase(), xf=st.ex.trim().toLowerCase();
    const ns=S.nodes.filter(n=>nodeOk(n)&&(!st.withPorts||n.ports.length||liensDe(n).length)&&(!nf||n.name.toLowerCase().includes(nf))&&(!xf||liensDe(n).some(l=>txt(l).includes(xf))));
    if(!ACT) return ns;
    // Actions : dans l'ordre du flux au sein de chaque activité (bord de l'activité en tête)
    const rg=S._rang=S._rang||capUmlRangs(S.nodes.map(n=>n.id), S.links.map(l=>[l.src.id,l.tgt.id]));
    return ns.slice().sort((a,b)=>(a.act?a.act.name:'').localeCompare(b.act?b.act.name:'','fr',{numeric:true})||(a.kind==='bord'?-1:b.kind==='bord'?1:0)||rg[a.id]-rg[b.id]);
  }
  /** Liens retenus par les filtres (une extrémité au moins doit correspondre). */
  function getLinks(){
    const nf=st.name.trim().toLowerCase(), xf=st.ex.trim().toLowerCase();
    return S.links.filter(l=>{ if(!linkOk(l)) return false; const a=S.byId[l.src.id], b=S.byId[l.tgt.id];
      if(!((a&&nodeOk(a))||(b&&nodeOk(b)))) return false;
      if(nf&&!l.src.name.toLowerCase().includes(nf)&&!l.tgt.name.toLowerCase().includes(nf)) return false;
      return !xf||txt(l).includes(xf); });
  }
  /** Repère d'un port (bloc : forme SysML selon le genre, flèche selon le sens, `capUmlPortIco`) ou d'un pin (action : carré de la couleur
   * du sens, `capUmlPinIco`) ; virt : lien relié sans port ; p : port (genre, conjugaison, type). */
  const mark=(o,side,orphan,virt,p)=>{
    if(ACT) return capUmlPinIco(o,{orphan, virt, tip:virt?_L('Flux relié directement à l\'action (sans pin)'):(o==='IN'?_L('Pin d\'entrée'):o==='INOUT'?_L('Paramètre d\'entrée et de sortie'):_L('Pin de sortie'))+(orphan?_L(' — non connecté'):'')});
    if(virt) return capUmlPortIco('UNSET',side,{genre:'std', orphan:true, tip:_L('Connecteur relié à la part elle-même (sans port)')});
    const q=p&&S.ports?S.ports[p.id]||p:p, g=capUmlPortGenre(q&&q.stereo);
    const nomG=g==='full'?'Full port':g==='proxy'?(/FlowPort/i.test(q.stereo||'')?'Flow port':'Proxy port'):_L('Port standard');
    return capUmlPortIco(o||'UNSET',side,{genre:g, orphan, tip:`${nomG} — ${CAP_ORIENT_STYLE[o]?CAP_ORIENT_STYLE[o].t:o}${q&&q.conj?' — '+_L('conjugué (~)'):''}${orphan?_L(' — non connecté'):''}`});
  };
  /** Extrémités d'un lien vues depuis un nœud et un port : la sienne et l'autre. */
  const cotes=(l,n,p)=>{ const mien=p?l.src.portId===p.id:(l.src.id===n.id&&!l.src.portId); return mien?[l.src,l.tgt]:[l.tgt,l.src]; };
  /** Sens d'un lien vu depuis un nœud et un port : vers / de / ⇄ / —. */
  const sens=(l,n,p)=>{ const mien=cotes(l,n,p)[0]===l.src; return l.dir==='bi'?'⇄':l.dir==='unset'?'—':((l.dir==='fwd')===mien?_L('vers'):_L('de')); };
  /** Côté d'un lien relié sans port : sortie si le nœud émet, entrée sinon. */
  const coteVirt=(l,n)=>{ const src=l.src.id===n.id&&!l.src.portId; return l.dir==='unset'||l.dir==='bi'?'':((l.dir==='fwd')===src?'OUT':'IN'); };

  /** Extrémités d'un nœud : ports (ou pins) avec leurs liens retenus, puis liens reliés sans port (côté déduit du sens) ; rangées en
   * gauche (IN), droite (OUT), les autres du côté le moins chargé. @param {object} n - Nœud @returns {{ends:object[], L:object[], R:object[]}} */
  function cotesNoeud(n){
    const ends=[...n.ports.map(p=>({p, ls:(S.portLinks[p.id]||[]).filter(linkOk), o:p.orient})),
      ...(S.nodeLinks[n.id]||[]).filter(linkOk).map(l=>({p:null, ls:[l], o:coteVirt(l,n)}))];
    const L=ends.filter(e=>e.o==='IN'), R=ends.filter(e=>e.o==='OUT');
    ends.filter(e=>e.o!=='IN'&&e.o!=='OUT').forEach(e=>(L.length<=R.length?L:R).push(e));
    return {ends, L, R};
  }
  /** Un lien vu depuis un nœud et un port : nom (détail), sens, élément distant (aller à son bloc), port distant, objets transportés.
   * @param {object} l - Lien @param {object} n - Nœud @param {?object} p - Port @returns {string} HTML */
  function lienHtml(l, n, p){
    const o=cotes(l,n,p)[1], oc=S.byId[o.id];
    const pas=l.via&&l.via.length?`<span class="fex-dim">⑂ ${esc(l.via.join(', ').toLowerCase())}</span> `:'';
    const pas2=!ACT&&l.items.length?` <span class="cub-chip" title="${_L('Objets transportés par les ItemFlow (conveyed)')}">${esc(l.items.map(i=>i.name).join(', '))}</span>`:'';
    const err=l.warn?` <span class="cub-chip cub-chip-err" title="${esc(l.warn)}">⚠</span>`:'';
    return `${pas}${det(l.id,l.name,`color:${lc(l)};font-weight:600${l.kind==='ctrl'?';font-style:italic':''}`)} <span class="fex-dim">${sens(l,n,p)}</span> <span class="fex-go" data-go="${esc(o.id)}" title="${_L('Aller au bloc de cet élément')}" style="color:${capTextOn(oc?kc(oc):'#8b949e')}">${esc(o.name)}</span>${o.portName?`<span class="fex-dim"> · ${esc(o.portName)}</span>`:''}${pas2}${err}`;
  }
  /** Ligne du haut (actions : porteurs, sinon bloc de l'activité) et ligne du bas (blocs : interfaces, allocations ; actions : appel).
   * @param {object} n - Nœud @returns {{att:string, bas:string[]}} HTML */
  function infosNoeud(n){
    const att=ACT?(n.att.length?n.att.map(a=>`<span class="fex-att-go" data-blk="${esc(a.id)}" title="${a.rel==='partition'?_L('Partition'):a.rel==='bloc'?_L('Bloc dont l\'activité est le comportement'):'«allocate»'} — ${_L('clic : son bloc dans 🧱 Blocs & ports')}">▣ ${esc(a.name)}</span>`).join(' · ')
      :n.ctxB?`<span class="fex-dim">${_L('comportement de')}</span> <span class="fex-att-go" data-blk="${esc(n.ctxB.id)}" title="${_L('Bloc dont l\'activité est le comportement — clic : son bloc dans 🧱 Blocs & ports')}">▣ ${esc(n.ctxB.name)}</span>`:''):'';
    const bas=[];
    if(!ACT&&(n.fournit.length||n.requiert.length)) bas.push(`<span title="${_L('Interfaces fournies (○, réalisées) et requises (◐, utilisées)')}">${[...n.fournit.map(i=>'○ '+det(i.id,i.name)), ...n.requiert.map(i=>'◐ '+det(i.id,i.name))].slice(0,3).join(' ')}${n.fournit.length+n.requiert.length>3?` +${n.fournit.length+n.requiert.length-3}`:''}</span>`);
    if(!ACT&&n.alloc.length) bas.push(`<span title="${esc(n.alloc.map(a=>a.name).join('\n'))}">⇢ ${n.alloc.slice(0,2).map(a=>`<span class="fex-go" data-go="${esc(a.id)}">${esc(a.name)}</span>`).join(', ')}${n.alloc.length>2?` +${n.alloc.length-2}`:''}</span>`);
    if(!ACT&&n.recu.length) bas.push(`<span data-recu="${esc(n.id)}" style="cursor:pointer" title="${_L('Éléments alloués à ce bloc («allocate») — clic : afficher / masquer')}">⇠ ${n.recu.length} ${_L('alloué(s)')} ${st.open.has(n.id)?'▴':'▾'}</span>`);
    if(ACT&&n.calls) bas.push(n.calls.id?`<span class="fex-att-go" data-grp="${esc(n.calls.id)}" title="${_L(`Activité appelée « ${esc(n.calls.name)} » — clic : ses actions`)}">⧉ ${n.calls.name===n.name?_L('actions de l\'activité appelée'):esc(n.calls.name)}</span>`:`<span style="color:var(--c-warn,#e3b341)">⧉ ${_L('appel sans comportement')}</span>`);
    return {att, bas};
  }
  /** Infobulle d'une extrémité : port (orientation, type) et ses liens. @param {object} e - Extrémité @param {object} n - Nœud @returns {string} */
  const tipExt=(e,n)=>[e.p?`${e.p.name}${e.p.orient?` (${e.p.orient}${e.p.conj?' ~':''})`:''}${e.p.typeName?' : '+e.p.typeName:''}`:_L('(relié sans port)'),
    ...e.ls.map(l=>{ const o=cotes(l,n,e.p)[1]; return `${l.name} ${sens(l,n,e.p)} ${o.name}${o.portName?' ⬦ '+o.portName:''}${l.items.length?' — '+l.items.map(x=>x.name).join(', '):''}${l.ctxName?' — '+_L('contexte')+' '+l.ctxName:''}`; })].join('\n');

  /** ◧ Vue Blocs, densité compacte : une carte par nœud dans une grille (plusieurs par ligne) — en-tête (icône, «type», nom), ports ou
   * pins rangés en deux colonnes (entrées à gauche, sorties à droite) avec leur nombre de liens, informations du bas, et liens dépliables
   * (`st.cOpen`) au même format que la vue détaillée ; 10 ports par côté au plus, la suite dans les liens dépliés.
   * @param {object[]} ns - Nœuds @returns {string} HTML */
  function buildCompact(ns){
    const MAX=10;
    return `<div class="ubc-grid">${ns.map(n=>{
      const {ends, L, R}=cotesNoeud(n), {att, bas}=infosNoeud(n), nl=ends.reduce((t,e)=>t+e.ls.length,0);
      const voisins=new Set(ends.flatMap(e=>e.ls.map(l=>cotes(l,n,e.p)[1].id))).size;
      const port=(e,s)=>`<div class="ubc-p ubc-p-${s}" title="${esc(tipExt(e,n))}">${mark(e.p?e.p.orient||(s==='L'?'IN':'OUT'):(s==='L'?'IN':'OUT'),s,e.p&&!e.ls.length&&!(S.portLinks[e.p.id]||[]).length,!e.p,e.p)}`+
        `<span class="ubc-pn">${e.p?(e.p.conj?'~':'')+esc(e.p.name):`<i class="fex-dim">${_L('sans port')}</i>`}</span>${e.ls.length?`<span class="ubc-n">${e.ls.length}</span>`:`<span class="ubc-n ubc-n0">0</span>`}</div>`;
      const col=(list,s)=>list.slice(0,MAX).map(e=>port(e,s)).join('')+(list.length>MAX?`<div class="ubc-plus fex-dim">+${list.length-MAX}</div>`:'');
      const cls=ACT&&n.kind!=='bord'?`fex-k-${n.kind==='sys'?'sys':n.kind==='act'?'act':'none'}`:`cb-box cb-k-${n.kind==='bord'?'node':n.kind==='act'?'act':'sys'}`;
      const ouvert=st.cOpen.has(n.id);
      return `<div class="ubc" data-fn="${esc(n.id)}" style="--ubc-c:${kc(n)}">
        <div class="ubc-h fex-box ${cls}" title="${esc(n.type)}${n.act&&n.kind!=='bord'?' — '+esc(n.act.name):''}">
          ${att?`<div class="ubc-att">${att}</div>`:''}
          ${ACT?'':`<div class="cub-st">«${esc(n.type)}»</div>`}<div class="ubc-t"><span class="cb-ic">${capUmlIcoHtml(n)}</span> ${det(n.id,n.name)}</div>
          ${n.children.length?`<span class="ubc-kids" title="${ACT?_L('Actions de l\'activité appelée'):_L('Parts (composition)')}">⧉ ${n.children.length}</span>`:''}
        </div>
        ${ends.length?`<div class="ubc-ports"><div class="ubc-col">${col(L,'L')}</div><div class="ubc-col ubc-col-r">${col(R,'R')}</div></div>`:`<div class="ubc-vide fex-dim">${ACT?_L('aucun pin ni flux'):_L('aucun port')}</div>`}
        ${bas.length?`<div class="ubc-bas">${bas.join(' · ')}</div>`:''}
        ${nl?`<details class="ubc-d" data-ubcd="${esc(n.id)}"${ouvert?' open':''}><summary>${_L(`🔗 ${nl} lien(s) · ${voisins} voisin(s)`)}</summary>`+
          `<div class="ubc-l">${ends.filter(e=>e.ls.length).map(e=>`<div class="ubc-le"><span class="ubc-le-p">${e.p?esc(e.p.name):_L('(sans port)')}</span>${e.ls.map(l=>`<div>${lienHtml(l,n,e.p)}</div>`).join('')}</div>`).join('')}</div></details>`:''}
        ${st.open.has(n.id)?recuHtml(n):''}
      </div>`;
    }).join('')}</div>`;
  }

  /** ◧ Vue Blocs (densité détaillée, et rapports) : chaque nœud avec ses ports (ou pins) à gauche (IN) et à droite (OUT), les autres du côté le moins chargé. */
  function buildBlocks(ns){
    return `<div class="fex-blocks">${ns.map(n=>{
      const {ends, L, R}=cotesNoeud(n);
      const gL=capBlkRows(L.map(e=>e.ls.length)), gR=capBlkRows(R.map(e=>e.ls.length));
      const side=(list,g)=>list.map((e,i)=>{
        const items=e.ls.map(l=>lienHtml(l,n,e.p));
        return capBlkSide(items,_L('<span class="fex-dim"><i>non connecté</i></span>'),g.hs[i],tipExt(e,n));
      }).join('');
      const pins=(list,s)=>list.map((e,i)=>`<span class="fex-bpin" style="top:${(s==='L'?gL:gR).tops[i]}px">${mark(e.p?e.p.orient||(s==='L'?'IN':'OUT'):(s==='L'?'IN':'OUT'),s,e.p&&!e.ls.length&&!(S.portLinks[e.p.id]||[]).length,!e.p,e.p)}<span class="fex-pname">${e.p?(e.p.conj?'~':'')+esc(e.p.name)+(e.p.typeName?`<span class="cub-ptype"> : ${esc(e.p.typeName)}</span>`:''):''}</span></span>`).join('');
      const {att, bas}=infosNoeud(n);
      const tl=Math.ceil(String(n.name||'').length/22), minH=26+tl*17+(ACT?0:13)+(bas.length?20:0)+(att?12:0)+(!ends.length?18:0);
      const cls=ACT&&n.kind!=='bord'?`fex-k-${n.kind==='sys'?'sys':n.kind==='act'?'act':'none'}`:`cb-box cb-k-${n.kind==='bord'?'node':n.kind==='act'?'act':'sys'}`;
      return `<div class="fex-blk" data-fn="${esc(n.id)}" style="--fex-h:${Math.max(74,minH,44+Math.max(gL.total,gR.total))}px">
        <div class="fex-side fex-side-in">${side(L,gL)}</div>
        <div class="fex-box ${cls}" title="${esc(n.type)}${n.act&&n.kind!=='bord'?' — '+esc(n.act.name):''}">
          ${att?`<div class="fex-att">${att}</div>`:''}
          <div class="fex-box-t" style="align-items:flex-start;padding-top:${att?22:ACT?12:6}px">${ACT?'':`<span style="text-align:center"><span class="cub-st">«${esc(n.type)}»</span><br>`}<span class="cb-ic">${capUmlIcoHtml(n)}</span> ${det(n.id,n.name)}${ACT?'':'</span>'}</div>
          <div class="fex-pins-in">${pins(L,'L')}</div><div class="fex-pins-out">${pins(R,'R')}</div>
          ${bas.length?`<div class="cb-fns">${bas.join(' · ')}</div>`:''}
          ${n.children.length?`<div class="cb-kids" title="${ACT?_L('Actions de l\'activité appelée'):_L('Parts (composition)')} : ${esc((n.parts&&n.parts.length?n.parts.map(x=>x.name+' : '+((S.byId[x.type]||{}).name||'')):n.children.map(k=>(S.byId[k]||{}).name||'')).join(', '))}">⧉ ${n.children.length}</div>`:''}
          ${!ends.length?`<div class="fex-box-empty">${ACT?_L('aucun pin ni flux'):_L('aucun port')}</div>`:''}
        </div>
        <div class="fex-side fex-side-out">${side(R,gR)}</div>
        ${st.open.has(n.id)?recuHtml(n):''}
      </div>`;
    }).join('')}</div>`;
  }
  /** Liste dépliée des éléments alloués à un bloc. @param {object} n - Bloc @returns {string} HTML */
  function recuHtml(n){
    return `<div class="cb-fnlist"><div class="cb-fnhead">⇠ ${_L(`${n.recu.length} élément(s) alloué(s) à « ${esc(n.name)} »`)}</div>
      <div class="cb-fnitems">${n.recu.map(r=>`<div class="cb-fn" ${r.node?`data-go="${esc(r.node)}"`:`onclick="capOpenDetailById('${esc(r.id)}')"`}>${esc(r.name)}</div>`).join('')}</div></div>`;
  }
  /** Ligne d'informations d'un lien : genre, contexte, objets transportés, nœuds de contrôle traversés. */
  function info(l){
    const p=[`<span>${esc(l.kind==='obj'?_L('flux d\'objets'):l.kind==='ctrl'?_L('flux de contrôle'):l.kind)}${l.deleg?' · '+_L('délégation'):''}</span>`];
    if(l.ctxName) p.push(`<span title="${ACT?_L('Activité'):_L('Contexte (bloc propriétaire du connecteur)')}">▣ ${l.grp?`<span class="fex-att-go" data-grp="${esc(l.grp)}">${esc(l.ctxName)}</span>`:esc(l.ctxName)}</span>`);
    if(l.items.length&&!ACT) p.push(`<span title="${_L('Objets transportés par les ItemFlow (conveyed)')}">▤ ${capFoldList(l.items.map(i=>det(i.id,i.name)))}</span>`);
    else if(!ACT&&S.flows.length) p.push(`<span class="ana-dim" title="${_L('Aucun ItemFlow sur ce connecteur')}">∅ ItemFlow</span>`);
    if(l.via&&l.via.length) p.push(`<span title="${_L('Nœuds de contrôle traversés')}">⑂ ${esc(l.via.join(', '))}</span>`);
    if(l.warn) p.push(`<span style="color:var(--c-warn,#e3b341)">⚠ ${esc(l.warn)}</span>`);
    return `<div style="font-size:11.5px;color:var(--c-dim);display:flex;flex-wrap:wrap;gap:2px 10px;justify-content:center;max-width:100%">${p.join('')}</div>`;
  }
  /** ≡ Vue Ligne : source ⬦ port → lien → port ⬦ cible. */
  function buildLines(ls){
    return ls.map(l=>{ const a=S.byId[l.src.id], b=S.byId[l.tgt.id], sc=a?kc(a):'#8b949e', tc=b?kc(b):'#8b949e', c=lc(l);
      const arrL=(l.dir==='rev'||l.dir==='bi')?'◀':'', arrR=(l.dir==='fwd'||l.dir==='bi')?'▶':'';
      return `<div class="phl-line" data-lid="${esc(l.id)}">
        <div class="phl-cell phl-cell-pc" style="--phl-c:${sc}">${det(l.src.id,l.src.name,`color:${capTextOn(sc)}`)}<span class="phl-port-name">${l.src.portId?mark(l.src.orient||'OUT','R',false,false,S.ports&&S.ports[l.src.portId])+' '+esc(l.src.portName):`<i>${ACT?_L('sans pin'):_L('sans port')}</i>`}${l.src.part?` <span class="ana-dim">(${esc(l.src.part)})</span>`:''}</span></div>
        <div class="phl-cell phl-cell-link" style="padding:6px 14px;gap:2px"><span style="font-size:11.5px;color:var(--c-dim);font-family:monospace">#${lnum(l)}</span>
          <span style="display:flex;align-items:center;width:100%;justify-content:center"><span style="color:${c}">${arrL}</span><span style="flex:1;max-width:40px;border-top:2px ${l.kind==='ctrl'?'dashed':'solid'} ${c}"></span>
          <span class="phl-link-badge" style="background:var(--c-bg);color:${c};border-color:${c};cursor:pointer${l.kind==='ctrl'?';border-style:dashed':''}" onclick="capOpenDetailById('${esc(l.id)}')">${esc(l.name)}</span>
          <span style="flex:1;max-width:40px;border-top:2px ${l.kind==='ctrl'?'dashed':'solid'} ${c}"></span><span style="color:${c}">${arrR}</span></span>${info(l)}</div>
        <div class="phl-cell phl-cell-pc phl-cell-r" style="--phl-c:${tc}">${det(l.tgt.id,l.tgt.name,`color:${capTextOn(tc)}`)}<span class="phl-port-name">${l.tgt.portId?mark(l.tgt.orient||'IN','L',false,false,S.ports&&S.ports[l.tgt.portId])+' '+esc(l.tgt.portName):`<i>${ACT?_L('sans pin'):_L('sans port')}</i>`}${l.tgt.part?` <span class="ana-dim">(${esc(l.tgt.part)})</span>`:''}</span></div>
      </div>`; }).join('');
  }
  /** Activité affichée par ⇶ Couloirs : celle du filtre, sinon celle qui a le plus d'actions. @returns {?object} Activité {id, name} */
  function actCourante(){
    if(st.grp) return S.groups.find(g=>g.id===st.grp)||null;
    let best=null, nb=-1; S.groups.forEach(g=>{ const k=S.nodes.filter(n=>n.act&&n.act.id===g.id&&n.kind!=='bord').length; if(k>nb){ nb=k; best=g; } });
    return best;
  }
  /** Zoom des dessins (⇶ Couloirs, ◎ Voisinage). @returns {string} HTML */
  const zoomBar=extra=>`<div class="cub-zoom">${extra||''}<span style="margin-left:auto"></span><button class="cap-lf-btn" data-zoom="-1" title="${_L('Réduire')}">−</button><span class="ana-dim" style="min-width:42px;text-align:center">${Math.round(st.zoom*100)} %</span><button class="cap-lf-btn" data-zoom="1" title="${_L('Agrandir')}">+</button><button class="cap-lf-btn" data-zoom="0" title="${_L('Taille réelle')}">1:1</button></div>`;
  /** ⇶ Couloirs : une activité en couloirs par porteur (`capUmlCouloirsSvg`) ; les filtres atténuent les actions écartées. @returns {string} HTML */
  function buildLanes(){
    const g=actCourante(); if(!g) return `<div class="phl-empty">${W.none}</div>`;
    const G=capUmlActGraphe(g.id); if(!G.nodes.length) return `<div class="phl-empty">${_L('Aucune action dans cette activité.')}</div>`;
    const nf=st.name.trim().toLowerCase(), xf=st.ex.trim().toLowerCase();
    const keep=x=>x.k!=='action'||(nodeOk(x.n)&&(!nf||x.n.name.toLowerCase().includes(nf))&&(!xf||liensDe(x.n).some(l=>txt(l).includes(xf))));
    const nA=G.nodes.filter(x=>x.k==='action').length;
    const note=st.grp?'':`<span class="ana-dim">${_L(`Activité la plus fournie ; choisissez-en une autre dans la liste « ${esc(W.grpAll)} ».`)}</span>`;
    const gros=nA>CAP_UML_CUL_MAX?`<div class="cap-mx-hint">${_L(`⚠ ${nA} actions : le dessin est grand ; ◧ Vue Blocs les liste par pages.`)}</div>`:'';
    return gros+zoomBar(note)+`<div class="cub-scroll">${capUmlCouloirsSvg(G,{titre:g.name.replace(/ — .*$/,''), keep, zoom:st.zoom})}</div>`;
  }
  /** ◎ Voisinage : le bloc choisi au centre, à gauche les blocs qui lui envoient, à droite ceux qui reçoivent (un connecteur par ligne,
   * ports SysML aux deux bouts, objets transportés au-dessus du trait) ; clic sur un voisin pour le mettre au centre. @returns {string} HTML */
  function buildFocus(){
    const tous=getNodes(), avec=tous.filter(n=>liensDe(n).length), cands=avec.length?avec:tous;
    let n=S.byId[st.focus];
    if(!n){ n=cands.slice().sort((a,b)=>liensDe(b).length-liensDe(a).length||b.children.length-a.children.length)[0]; if(!n) return `<div class="phl-empty">${W.noneF}</div>`; st.focus=n.id; }
    const ends=[...n.ports.map(p=>({p, ls:(S.portLinks[p.id]||[]).filter(linkOk), o:p.orient})), ...(S.nodeLinks[n.id]||[]).filter(linkOk).map(l=>({p:null, ls:[l], o:coteVirt(l,n)}))].filter(e=>e.ls.length);
    // Côté de chaque connecteur : entrant à gauche, sortant à droite, sans sens du côté le moins chargé
    const L=[], R=[];
    /** Sens d'un connecteur vu du bloc central : 'out' (il émet), 'in' (il reçoit), '' (les deux ou inconnu). */
    const sensC=(l,p)=>{ if(l.dir==='bi'||l.dir==='unset') return ''; return (l.dir==='fwd')===(cotes(l,n,p)[0]===l.src)?'out':'in'; };
    ends.forEach(e=>e.ls.forEach(l=>{ const s=sensC(l,e.p), row={e, l, o:cotes(l,n,e.p)[1]};
      if(s==='in'||(!s&&e.o==='IN')) L.push(row); else if(s==='out'||e.o==='OUT') R.push(row); else (L.length<=R.length?L:R).push(row); }));
    const MAX=40, cut=(a)=>a.slice(0,MAX), rh=46, top=46, cw=220, pw=200, gx=140, xL=20, xC=xL+pw+gx, xR=xC+cw+gx, Wd=xR+pw+20;
    const nRows=Math.max(1,Math.min(MAX,L.length),Math.min(MAX,R.length)), hC=Math.max(110,nRows*rh+30), Hd=top+hC+70;
    const coupe=(s,k)=>s.length>k?s.slice(0,k-1)+'…':s;
    let svg='';
    /** Ports du bloc central sur un côté : un par port, à la hauteur moyenne de ses lignes. */
    const centre=(rows,side)=>{ const par={}; rows.forEach((r,i)=>{ const k=r.e.p?r.e.p.id:'~'+r.l.id; (par[k]=par[k]||{e:r.e, ys:[]}).ys.push(top+15+i*rh+rh/2); });
      const out={}; Object.entries(par).forEach(([k,v])=>{ out[k]=v.ys.reduce((a,b)=>a+b,0)/v.ys.length; }); return {par, y:out}; };
    const cL=centre(cut(L),'L'), cR=centre(cut(R),'R');
    [[cut(L),'L',cL],[cut(R),'R',cR]].forEach(([rows,side,c])=>rows.forEach((r,i)=>{
      const y=top+15+i*rh+rh/2, gauche=side==='L', bx=gauche?xL:xR, px=gauche?xL+pw:xR, k=r.e.p?r.e.p.id:'~'+r.l.id, yc=c.y[k], cx=gauche?xC:xC+cw;
      const col=lc(r.l), mx=gauche?xL+pw+30+(i%4)*14:xC+cw+gx-30-(i%4)*14, bord=r.o.id===r.l.grp&&!r.o.part&&!ACT, oc=S.byId[r.o.id];
      const sc=sensC(r.l,r.e.p), fl=!sc?'':sc==='out'?'peer':'centre';
      const tete=(x,yy,vers)=>`<path d="M${x-(vers>0?8:-8)},${yy-4} L${x},${yy} L${x-(vers>0?8:-8)},${yy+4}Z" fill="${col}"/>`;
      svg+=`<g><title>${esc(r.l.name)} — ${esc(r.o.name)}${r.o.portName?' · '+esc(r.o.portName):''}${r.l.items.length?' — '+esc(r.l.items.map(x=>x.name).join(', ')):''}${r.l.ctxName?' — '+_L('contexte')+' '+esc(r.l.ctxName):''}${r.l.warn?' — ⚠ '+esc(r.l.warn):''}</title>
        <path d="M${px},${y} H${mx} V${yc} H${cx}" fill="none" stroke="${col}" stroke-width="${r.l.items.length||ACT?1.8:1.3}"${r.l.warn?' stroke-dasharray="5 3"':r.l.kind==='ctrl'?' stroke-dasharray="4 3"':''}/>
        ${fl==='centre'?tete(gauche?cx-7:cx+7,yc,gauche?1:-1):fl==='peer'?tete(gauche?px+7:px-7,y,gauche?-1:1):''}
        <text x="${gauche?px+10:px-10}" y="${y-6}" text-anchor="${gauche?'start':'end'}" class="cul-d cul-clic" data-det="${esc(r.l.id)}" style="fill:${col}">${esc(coupe(r.l.name+(r.l.items.length?' · '+r.l.items.map(x=>x.name).join(', '):''),24))}</text></g>`;
      svg+=`<g class="cul-clic" ${oc?`data-uf="${esc(r.o.id)}"`:`data-det="${esc(r.o.id)}"`}><title>${esc(r.o.name)}${bord?' — '+_L('bord du contexte (délégation)'):''} — ${_L('clic : le mettre au centre')}</title><rect x="${bx}" y="${y-17}" width="${pw}" height="34" rx="3" class="${oc&&oc.kind==='act'?'cub-peer cub-peer-act':ACT?'cul-act':'cub-peer'}"${bord?' stroke-dasharray="5 3"':''}/>
        ${capUmlIcoSvg(r.o.id,bx+(gauche?6:12),y-7)}<text x="${bx+pw/2+8}" y="${y-(r.o.part||bord?2:-4)}" text-anchor="middle" class="cul-t" font-weight="600">${esc(coupe(r.o.name,24))}</text>${r.o.part||bord?`<text x="${bx+pw/2}" y="${y+11}" text-anchor="middle" class="cul-d">${esc(bord?_L('bord du contexte'):coupe(r.o.part,30))}</text>`:''}</g>`;
      const op=r.o.portId&&S.ports?S.ports[r.o.portId]:null;
      if(r.o.portId) svg+=ACT?capUmlPinSvg(px,y,r.o.orient||'UNSET',false):capUmlPortSvg(px,y,gauche?'R':'L',r.o.orient||'UNSET',{genre:capUmlPortGenre(op&&op.stereo), conj:op&&op.conj});
    }));
    // Bloc central et ses ports
    const ne=S.byId[n.id], kids=(ne.parts||[]);
    svg+=`<g class="cul-clic" data-det="${esc(n.id)}"><title>${esc(n.name)} — ${esc(n.type)}</title><rect x="${xC}" y="${top}" width="${cw}" height="${hC}" rx="${ACT?9:3}" class="${ACT?'cul-act':n.kind==='act'?'cub-peer cub-peer-act':'cub-centre'}"/>
      <text x="${xC+cw/2}" y="${top+16}" text-anchor="middle" class="cul-d">«${esc(n.type)}»</text>${capUmlIcoSvg(n.id,xC+8,top+8,16)}<text x="${xC+cw/2}" y="${top+33}" text-anchor="middle" class="cul-t" font-weight="700" font-size="14">${esc(coupe(n.name,26))}</text></g>`;
    [[cL,'L'],[cR,'R']].forEach(([c,side])=>Object.entries(c.par).forEach(([k,v])=>{ const y=c.y[k], x=side==='L'?xC:xC+cw, p=v.e.p;
      svg+=p?(ACT?capUmlPinSvg(x,y,p.orient||'UNSET',false):capUmlPortSvg(x,y,side,p.orient||'UNSET',{genre:capUmlPortGenre(p.stereo), conj:p.conj})):'';
      if(p) svg+=`<text x="${side==='L'?x+10:x-10}" y="${y+4}" text-anchor="${side==='L'?'start':'end'}" class="cul-d cul-mono"><title>${esc(p.name)}${p.typeName?' : '+esc(p.typeName):''}</title>${esc(coupe((p.conj?'~':'')+p.name,16))}</text>`; }));
    svg+=`<text x="${xL+pw/2}" y="${top-14}" text-anchor="middle" class="cul-d">← ${ACT?_L('lui fournissent'):_L('lui envoient')} (${L.length})</text><text x="${xR+pw/2}" y="${top-14}" text-anchor="middle" class="cul-d">${_L('reçoivent de lui')} (${R.length}) →</text>`;
    const pied=[];
    if(L.length>MAX||R.length>MAX) pied.push(_L(`… ${Math.max(0,L.length-MAX)+Math.max(0,R.length-MAX)} autre(s) connecteur(s) : voir ≡ Vue Ligne`));
    if(kids.length) pied.push(_L('parts')+' : '+kids.slice(0,6).map(x=>x.name).join(', ')+(kids.length>6?' …':''));
    if(ne.alloc&&ne.alloc.length) pied.push('⇢ '+ne.alloc.map(a=>a.name).join(', '));
    if(ne.recu&&ne.recu.length) pied.push('⇠ '+ne.recu.slice(0,4).map(a=>a.name).join(', ')+(ne.recu.length>4?' …':''));
    pied.forEach((t,i)=>{ svg+=`<text x="${xC+cw/2}" y="${top+hC+20+i*15}" text-anchor="middle" class="cul-d">${esc(coupe(t,90))}</text>`; });
    if(!L.length&&!R.length) svg+=`<text x="${xC+cw/2}" y="${top+hC/2+14}" text-anchor="middle" class="cul-d">${_L('aucun connecteur')}</text>`;
    const H=Hd+pied.length*15;
    const sel=`<select id="ub-focus" class="phl-filter-input" style="max-width:260px" title="${_L('Bloc au centre')}">${(cands.some(x=>x.id===n.id)?cands:[n,...cands]).map(x=>`<option value="${esc(x.id)}"${x.id===n.id?' selected':''}>${esc(x.name)} (${liensDe(x).length})</option>`).join('')}</select>`;
    const fil=st.hist.filter(id=>S.byId[id]&&id!==n.id).slice(-5).map(id=>`<span class="fex-go" data-uf="${esc(id)}">${esc(S.byId[id].name)}</span>`).join(' › ');
    return zoomBar(`<span class="ana-dim">${_L('Au centre')} :</span> ${sel}${fil?` <span class="ana-dim" style="margin-left:8px">${_L('Visités')} : ${fil}</span>`:''}`)+
      `<div class="cub-scroll"><svg class="cul-svg" xmlns="http://www.w3.org/2000/svg" width="${Math.round(Wd*st.zoom)}" height="${Math.round(H*st.zoom)}" viewBox="0 0 ${Wd} ${H}">${svg}</svg></div>`;
  }
  /** Page courante et barre ◀ ▶. */
  function paged(items, unit){
    const pages=Math.max(1,Math.ceil(items.length/CAP_UML_BLK_PAGE)); if(st.page>=pages) st.page=pages-1;
    const from=st.page*CAP_UML_BLK_PAGE, slice=items.slice(from,from+CAP_UML_BLK_PAGE);
    const bar=pages>1?_L(`<div class="fex-pager"><button class="cap-lf-btn" data-pg="-1"${st.page?'':' disabled'}>◀</button><span>${unit} ${from+1}–${from+slice.length} sur ${items.length} · page ${st.page+1} / ${pages}</span><button class="cap-lf-btn" data-pg="1"${st.page<pages-1?'':' disabled'}>▶</button></div>`):'';
    return {slice, bar};
  }
  /** Contenu de la vue (force : rendu complet sans pagination, pour les rapports). */
  function buildContent(force){
    const view=force||st.view;
    if(view==='diag') return capDiagHtml(checks());
    if(view==='lanes') return buildLanes();
    if(view==='focus') return buildFocus();
    if(view==='block'){
      const ns=getNodes(); if(!ns.length) return `<div class="phl-empty">${W.noneF}</div>`;
      if(force) return buildBlocks(ns);
      const p=paged(ns,W.Nodes), b=st.back&&S.byId[st.back];
      const back=b?`<div class="fex-backbar"><button class="cap-lf-btn" id="ub-back">${_L(`↩ Revenir à « ${esc(b.name)} »`)}</button></div>`:'';
      return back+p.bar+(st.dense?buildCompact(p.slice):buildBlocks(p.slice))+p.bar;   // rapports (force) : toujours en densité détaillée
    }
    const ls=getLinks(); if(!ls.length) return `<div class="phl-empty">${W.noneL}</div>`;
    if(view==='matrix'){
      const deg={}; ls.forEach(l=>{ deg[l.src.id]=(deg[l.src.id]||0)+1; deg[l.tgt.id]=(deg[l.tgt.id]||0)+1; });
      const ids=Object.keys(deg); let keep=null, note='';
      if(ids.length>CAP_UML_BLK_MX){ keep=new Set(ids.sort((a,b)=>deg[b]-deg[a]).slice(0,CAP_UML_BLK_MX)); note=`<div class="cap-mx-hint">${_L(`⚠ ${ids.length} ${W.nodes} : pour rester fluide, la matrice en affiche ${CAP_UML_BLK_MX} (les plus reliés). Filtrez pour voir les autres.`)}</div>`; }
      const L=ls.filter(l=>!keep||(keep.has(l.src.id)&&keep.has(l.tgt.id))).map(l=>({l, dir:l.dir==='unset'?'bi':l.dir, src:{pcId:l.src.id, pcName:l.src.name}, tgt:{pcId:l.tgt.id, pcName:l.tgt.name}}));
      const mx=capMatrixBuild(L,{directed:true, unit:W.links, noun:W.nodes, corner:_L('Source ↓ / Cible →'), colorOf:e=>capTextOn(S.byId[e.pcId]?kc(S.byId[e.pcId]):'#8b949e')});
      box._ubCells=mx.cells; return note+mx.html;
    }
    if(force) return buildLines(ls);
    const p=paged(ls,W.Links); return p.bar+buildLines(p.slice)+p.bar;
  }
  /** Montre le bloc d'un nœud (page, filtres relâchés) ; ↩ ramène au nœud de départ. @param {string} id - Nœud @param {string} [from] - Départ */
  function gotoNode(id, from){
    if(!S.byId[id]){ capUmlBlkOuvrir(id); return; }
    st.view='block';
    let ns=getNodes(), i=ns.findIndex(n=>n.id===id);
    if(i<0){ st.name=''; st.ex=''; st.nk=new Set(S.natures.map(n=>n.k)); st.withPorts=false; if(st.grp&&!S.byId[id].grps.has(st.grp)) st.grp='';
      ns=getNodes(); i=ns.findIndex(n=>n.id===id); if(i<0) return; }
    st.page=Math.floor(i/CAP_UML_BLK_PAGE); st.back=from||null; render();
    const el=box.querySelector(`.fex-blk[data-fn="${CSS.escape(id)}"],.ubc[data-fn="${CSS.escape(id)}"]`); if(!el) return;
    el.scrollIntoView({block:'center'}); el.classList.add('fex-flash'); setTimeout(()=>el.classList.remove('fex-flash'),1800);
  }
  /** Branche la pagination, la navigation et la matrice du contenu. */
  function wireMain(){
    const main=box.querySelector('#ub-main'); if(!main) return;
    main.querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{ st.page+=+b.dataset.pg; updateContent(); box.scrollIntoView({block:'start'}); });
    main.querySelectorAll('[data-go]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); gotoNode(a.dataset.go, a.closest('.fex-blk,.ubc')?.dataset.fn); });
    main.querySelectorAll('[data-grp]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); st.grp=a.dataset.grp; st.page=0; st.view=ACT?'lanes':'block'; render(); });
    main.querySelectorAll('[data-det]').forEach(a=>a.addEventListener('click',ev=>{ ev.stopPropagation(); capOpenDetailById(a.dataset.det); }));
    main.querySelectorAll('[data-uf]').forEach(a=>a.addEventListener('click',ev=>{ ev.stopPropagation(); if(st.focus&&st.focus!==a.dataset.uf){ st.hist=st.hist.filter(x=>x!==st.focus); st.hist.push(st.focus); } st.focus=a.dataset.uf; updateContent(); }));
    main.querySelector('#ub-focus')?.addEventListener('change',e=>{ if(st.focus){ st.hist=st.hist.filter(x=>x!==st.focus); st.hist.push(st.focus); } st.focus=e.target.value; updateContent(); });
    main.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{ const d=+b.dataset.zoom; st.zoom=d?Math.min(2,Math.max(.4,Math.round((st.zoom+d*.2)*10)/10)):1; updateContent(); });
    main.querySelectorAll('[data-blk]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); const id=a.dataset.blk; if(capUmlStructure().byId[id]){ _capUmlGo={v:'umlblk', id}; capNavOpen('ana:umlblk'); } else capOpenDetailById(id); });
    main.querySelectorAll('[data-recu]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); const id=a.dataset.recu; if(st.open.has(id)) st.open.delete(id); else st.open.add(id); updateContent(); });
    main.querySelector('#ub-back')?.addEventListener('click',()=>{ const b=st.back; st.back=null; if(b) gotoNode(b); });
    main.querySelectorAll('details[data-ubcd]').forEach(d=>d.addEventListener('toggle',()=>{ if(d.open) st.cOpen.add(d.dataset.ubcd); else st.cOpen.delete(d.dataset.ubcd); }));   // liens dépliés d'une carte compacte
    if(st.view!=='matrix') return;
    main.querySelectorAll('.cap-mx-cell').forEach(td=>td.addEventListener('click',()=>{
      main.querySelectorAll('.cap-mx-cell.sel').forEach(x=>x.classList.remove('sel')); td.classList.add('sel');
      main.querySelector('.cap-mx-detail').innerHTML=`<div style="font-size:11px;color:var(--c-dim);margin-bottom:6px">${td.title}</div>`+buildLines(((box._ubCells||{})[td.dataset.cell]||[]).map(x=>x.l));
      main.querySelector('.cap-mx-detail').querySelectorAll('.fex-att-go[data-grp]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); st.grp=a.dataset.grp; st.page=0; st.view=ACT?'lanes':'block'; render(); });
    }));
  }
  /** Texte du compteur. */
  const counter=()=>st.view==='block'||st.view==='focus'?`${getNodes().length}/${S.nodes.length} ${W.nodes}`:st.view==='lanes'?((actCourante()||{}).name||''):`${getLinks().length}/${S.links.length} ${W.links}`;
  /** Rafraîchit le contenu et le compteur. */
  function updateContent(){
    const c=box.querySelector('#ub-counter'); if(c) c.textContent=counter();
    const m=box.querySelector('#ub-main'); if(m) m.innerHTML=buildContent();
    wireMain();
  }
  /** Rapport HTML autonome (vue affichée ou toutes les vues). @param {boolean} all - Toutes les vues */
  async function exportHtml(all){
    const V=[...(ACT?[['lanes',_L('⇶ Couloirs')]]:[]),['block',_L('◧ Vue Blocs')],...(ACT?[]:[['focus',_L('◎ Voisinage')]]),['line',_L('≡ Vue Ligne')],['matrix',_L('▦ Matrice')],['diag',_L('🩺 Contrôles')]];
    const keys=all?await capHtmlVuesChoix(V.filter(v=>v[0]!=='focus')):[st.view]; if(!keys) return;   // vues choisies (26), 🩺 Contrôles décoché par défaut ; ◎ Voisinage : vue d'un bloc, exportée seule
    const tabs=V.filter(v=>keys.includes(v[0])||(v[0]==='line'&&keys.includes('matrix'))).map(([k,label])=>({key:k, label, html:buildContent(k)}));
    const cells={}; Object.entries(box._ubCells||{}).forEach(([k,ls])=>{ cells[k]=ls.map(x=>x.l.id); });
    capHtmlReport({title:W.title, subtitle:`${getNodes().length} ${W.nodes} · ${getLinks().length} ${W.links}${st.grp?' · '+W.grp+' '+((S.groups.find(g=>g.id===st.grp)||{}).name||''):''}`, tabs, active:st.view, cells,
      filename:all?_L(`uml-${W.file}-rapport.html`):`uml-${W.file}-${st.view}.html`});
  }
  /** Export CSV enrichi (53) : une ligne par port (Vue Blocs) ou par lien. */
  function exportCsv(){
    if(st.view==='block'){
      const rows=[]; getNodes().forEach(n=>{ const ends=[...n.ports.map(p=>({p, ls:(S.portLinks[p.id]||[]).filter(linkOk)})), ...(S.nodeLinks[n.id]||[]).filter(linkOk).map(l=>({p:null, ls:[l]}))];
        ends.forEach(e=>{ const base=[capCx(n.name,n.id), n.type, e.p?capCx(e.p.name,e.p.id):'', e.p?e.p.orient||'':'', e.p?e.p.typeName||'':''];
          if(!e.ls.length) rows.push([...base,'','','','','']);
          e.ls.forEach(l=>{ const o=cotes(l,n,e.p)[1]; rows.push([...base, capCx(l.name,l.id), sens(l,n,e.p), capCx(o.name,o.id), capCx(o.portName,o.portId), l.items.map(i=>i.name).join(', ')]); }); }); });
      capCsvExport(`uml-${W.file}-ports.csv`,[W.Node,'Type',W.Port,_L('Orientation'),_L('Type du port'),W.Link,_L('Sens'),_L('Élément distant'),_L('Port distant'),_L('Objets transportés')],rows); return;
    }
    capCsvExport(_L(`uml-${W.file}-liens.csv`),['N°',W.grp,_L('Source'),_L('Port source'),_L('Orientation source'),W.Link,_L('Genre'),_L('Port cible'),_L('Orientation cible'),_L('Cible'),_L('Objets transportés'),_L('Sens')],
      getLinks().map(l=>[lnum(l), capCx(l.ctxName,l.grp), capCx(l.src.name,l.src.id), capCx(l.src.portName,l.src.portId), l.src.orient, capCx(l.name,l.id), l.kind+(l.deleg?' · '+_L('délégation'):''), capCx(l.tgt.portName,l.tgt.portId), l.tgt.orient, capCx(l.tgt.name,l.tgt.id), capCx(l.items.map(i=>i.name).join(', '), l.items.map(i=>i.id).filter(Boolean)), l.dir]));
  }
  /** Construit toute la vue (barre, filtres, contenu, écouteurs). */
  function render(){
    const V=[...(ACT?[['lanes',_L('⇶ Couloirs'),W.lanesTip]]:[]),['block',_L('◧ Vue Blocs'),W.blockTip],...(ACT?[]:[['focus',_L('◎ Voisinage'),W.focusTip]]),['line',_L('≡ Vue Ligne'),W.lineTip],['matrix',_L('▦ Matrice'),W.mxTip],['diag',_L('🩺 Contrôles'),W.diagTip]];
    const base=S.nodes.filter(n=>!st.grp||n.grps.has(st.grp));
    const grpSel=S.groups.length?`<select id="ub-grp" class="phl-filter-input" style="max-width:260px${st.grp?';border-color:var(--c-accent)':''}" title="${W.grpTip}"><option value="">${W.grpAll}</option>${S.groups.map(g=>`<option value="${esc(g.id)}"${st.grp===g.id?' selected':''}>${esc(g.name)} (${g.n})</option>`).join('')}</select>${st.grp?`<button class="cap-lf-btn" id="ub-grp-x" title="${_L('Retirer ce filtre')}">✕</button>`:''}`:'';
    box.innerHTML=`<div class="phl-toggle-bar">${V.map(([k,l,t])=>`<button class="phl-toggle-btn${st.view===k?' active':''}" data-pv="${k}" title="${esc(t)}">${l}</button>`).join('')}
        <span id="ub-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace">${counter()}</span>
        <span class="cap-mx-hint" style="margin-left:12px">${capEsc(capSyNomFormat())} · ${S.nodes.length} ${W.nodes} · ${S.links.length} ${W.links}</span></div>
      <div class="phl-filter-bar" style="margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap">${ACT?'ƒ':'🧱'} ${W.Node} :</span>
        <input id="ub-name" type="text" class="phl-filter-input" placeholder="${_L('Filtrer par nom…')}" value="${esc(st.name)}" style="width:170px">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;margin-left:8px">🔍 ${W.Link} :</span>
        <input id="ub-ex" type="text" class="phl-filter-input" placeholder="${ACT?_L('Flux ou type d\'objet…'):_L('Connecteur ou objet transporté…')}" value="${esc(st.ex)}" style="width:180px">
        ${grpSel}
        ${st.view==='block'?`<label style="font-size:11px;color:var(--c-dim);display:flex;align-items:center;gap:4px;margin-left:8px"><input type="checkbox" id="ub-wp"${st.withPorts?' checked':''}> ${W.withPorts}</label>`:''}
        ${st.view==='block'?`<span class="tb-grp" style="margin-left:8px" title="${_L('Densité de la Vue Blocs')}"><button class="cap-lf-btn${st.dense?'':' active'}" data-dense="0" title="${_L('Un bloc par ligne, liens écrits de part et d\'autre (comme Capella)')}">${_L('▤ Détaillée')}</button><button class="cap-lf-btn${st.dense?' active':''}" data-dense="1" title="${_L('Cartes sur plusieurs colonnes : ports et nombre de liens, liens dépliables')}">${_L('▦ Compacte')}</button></span>`:''}
        ${capFiltreMenuHtml('nk', W.nat, S.natures, st.nk, k=>base.filter(n=>n.nat===k.k).length, st.dd==='nk')}
        ${capFiltreMenuHtml('lk', W.lk, S.kinds, st.lk, k=>k.n, st.dd==='lk')}
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="phl-export-btn" id="ub-csv">⬇ CSV</button>
          <button class="phl-export-btn" id="ub-html" title="${_L('Rapport HTML de la vue affichée (toutes les pages)')}">⬇ HTML</button>
          <button class="phl-export-btn" id="ub-html-all" title="${_L('Rapport HTML à onglets : vues choisies dans une fenêtre (Vue Blocs comprise ; Contrôles décochés par défaut)')}">${_L('⬇ HTML (toutes les vues)')}</button>
        </div></div>
      <div id="ub-main">${buildContent()}</div>`;
    box.querySelectorAll('.phl-toggle-btn').forEach(b=>b.onclick=()=>{ st.view=b.dataset.pv; st.page=0; render(); });
    box.querySelector('#ub-wp')?.addEventListener('change',e=>{ st.withPorts=e.target.checked; st.page=0; render(); });
    box.querySelector('#ub-grp')?.addEventListener('change',e=>{ st.grp=e.target.value; st.page=0; render(); });
    box.querySelector('#ub-grp-x')?.addEventListener('click',()=>{ st.grp=''; st.page=0; render(); });
    box.querySelectorAll('[data-dense]').forEach(b=>b.onclick=()=>{ st.dense=b.dataset.dense==='1'; render(); });
    [['nk',st.nk,S.natures],['lk',st.lk,S.kinds]].forEach(([a,set,all])=>capFiltreMenuBind(box, a, set, all.map(x=>x.k), st, ()=>{ st.page=0; render(); }));   // menus de filtre (2A)
    let deb;
    [['#ub-name','name'],['#ub-ex','ex']].forEach(([sel,k])=>box.querySelector(sel)?.addEventListener('input',e=>{ st[k]=e.target.value; st.page=0; clearTimeout(deb); deb=setTimeout(updateContent,150); }));
    box.querySelector('#ub-csv')?.addEventListener('click',exportCsv);
    box.querySelector('#ub-html')?.addEventListener('click',()=>exportHtml(false));
    box.querySelector('#ub-html-all')?.addEventListener('click',()=>exportHtml(true));
    wireMain();
  }
  render();
  if(_capUmlGo&&_capUmlGo.v===cle){ const g=_capUmlGo.id; _capUmlGo=null;
    if(S.byId[g]) gotoNode(g); else if(S.groups.some(x=>x.id===g)){ st.grp=g; st.page=0; st.view=ACT?'lanes':'block'; render(); } }
}

/** Vue 🧱 Blocs & ports (sous-vue `umlblk` de 🔬 Analyses ; famille 🧬 UML / SysML v1). @param {HTMLElement} box - Conteneur */
function capRenderUmlBlocs(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : 🧱 Composants & interfaces).')}</div>`; return; }
  capUmlBlkRender(box, capUmlStructure(), capUmlBlkVoc('blk'), capUmlBlkChecks, 'umlblk');
}

/** Vue ƒ Activités & flux (sous-vue `umlact` de 🔬 Analyses ; famille 🧬 UML / SysML v1). @param {HTMLElement} box - Conteneur */
function capRenderUmlActivites(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : ƒ Fonctions & échanges).')}</div>`; return; }
  capUmlBlkRender(box, capUmlActivites(), capUmlBlkVoc('act'), capUmlActChecks, 'umlact');
}

/** Indicateurs 🧱 Blocs & ports et ƒ Activités & flux du 📐 tableau de bord (vides hors UML / SysML v1) ; appelée par `capUmlDashCatalog` (88).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlBlkDashCatalog(add){
  const G=_L('UML / SysML v1'), S=()=>capUmlStructure(), A=()=>capUmlActivites();
  add(G,'uml.blk.n',_L('UML / SysML v1 — blocs à ports'),'n',()=>({n:S().nodes.length, sub:_L(`${Object.keys(S().ports).length} port(s) · ${S().links.length} connecteur(s)`)}));
  add(G,'uml.blk.ports',_L('UML / SysML v1 — ports reliés à un connecteur'),'pct',()=>capDashPct(S().nodes.flatMap(n=>n.ports),p=>(S().portLinks[p.id]||[]).length),_L('Ports des blocs reliés par au moins un connecteur'));
  add(G,'uml.blk.flux',_L('UML / SysML v1 — connecteurs portant un ItemFlow'),'pct',()=>S().flows.length?capDashPct(S().links,l=>l.flows.length):null);
  add(G,'uml.blk.chk',_L('UML / SysML v1 — contrôles des blocs'),'series',()=>({cats:capUmlBlkChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
  add(G,'uml.act.n',_L('UML / SysML v1 — actions des activités'),'n',()=>({n:A().nodes.filter(n=>n.kind!=='bord').length, sub:_L(`${A().groups.length} activité(s) · ${A().links.length} flux`)}));
  add(G,'uml.act.porte',_L('UML / SysML v1 — actions portées par un bloc'),'pct',()=>capDashPct(A().nodes.filter(n=>n.kind!=='bord'),n=>n.att.length||n.ctxB),_L('Partition, «allocate» ou bloc dont l\'activité est le comportement'));
  add(G,'uml.act.chk',_L('UML / SysML v1 — contrôles des activités'),'series',()=>({cats:capUmlActChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}
