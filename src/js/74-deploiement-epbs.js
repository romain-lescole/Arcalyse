/* ═══════════════════════════════════════════════════════════════════════════
   🖧 Déploiement & EPBS (sous-vue `deploy` de 🔬 Analyses)
   Déploiement PA : composants de comportement (PhysicalComponent nature BEHAVIOR) déployés sur des
   nœuds (nature NODE) par `PartDeploymentLink` (sous la Part du nœud : `location` = Part du nœud,
   `deployedElement` = Part du comportement). EPBS : `ConfigurationItem` (kind COTSCI, CSCI, HWCI,
   InterfaceCI, NDICI, SystemCI…) réalisant des composants et liens physiques par
   `PhysicalArtifactRealization`. Contrôles, section du panneau de détail, indicateurs.
   ═══════════════════════════════════════════════════════════════════════════ */

var _capDep={view:'dep', q:'', kind:''};   // état de la sous-vue
/** Libellés des natures de Configuration Item. */
const CAP_CI_KINDS={COTSCI:'COTS', CSCI:_L('Logiciel (CSCI)'), HWCI:_L('Matériel (HWCI)'), InterfaceCI:_L('Interface'), NDICI:'NDI', PrimeItemCI:_L('Article principal'), SystemCI:_L('Système')};

/** Déploiement et EPBS du modèle (en cache dans `_capAnaCache`).
 * @returns {{nodes:object[], behaviors:object[], onNode:Object, hosts:Object, cis:object[], ciByEl:Object, ceBad:object[]}}
 *   nodes / behaviors : {id, name, nature, parts} ; onNode : id de comportement → [nœuds] ; hosts : id de nœud → [comportements] ;
 *   cis : Configuration Items {id, name, kind, parent, children, realizes:[{id, name, type}], depth} ; ciByEl : id réalisé → [CI] ;
 *   ceBad : Component Exchanges entre comportements déployés sur des nœuds sans lien physique entre eux
 */
function capComputeDeploy(){
  if(_capAnaCache.deploy) return _capAnaCache.deploy;
  const {xmap, res}=capAnaCtx(), rid=r=>(r||'').trim().replace(/^.*#/,''), E=el=>({id:capXId(el), name:capXName(el)||_L('(sans nom)'), type:capTName(el)});
  const pcs=Object.values(xmap).filter(el=>capTName(el)==='PhysicalComponent'), partOf={};   // Part → composant typé
  Object.values(xmap).forEach(el=>{ if(capTName(el)==='Part'){ const t=res(el.getAttribute('abstractType')); if(t) partOf[capXId(el)]=t; } });
  const nodes=[], behaviors=[], onNode={}, hosts={};
  pcs.forEach(el=>{ const o=Object.assign(E(el),{nature:el.getAttribute('nature')||'', actor:capIsActorEl(el)}); (o.nature==='NODE'?nodes:o.nature==='BEHAVIOR'?behaviors:[]).push(o); });
  Object.values(xmap).forEach(pdl=>{
    if(capTName(pdl)!=='PartDeploymentLink') return;
    const locPart=res(pdl.getAttribute('location'))||pdl.parentElement, depPart=res(pdl.getAttribute('deployedElement'));
    const node=locPart&&(partOf[capXId(locPart)]||(capTName(locPart)==='PhysicalComponent'?locPart:null)), beh=depPart&&(partOf[capXId(depPart)]||(capTName(depPart)==='PhysicalComponent'?depPart:null));
    if(!node||!beh) return;
    const n=capXId(node), b=capXId(beh);
    (onNode[b]=onNode[b]||[]).push(E(node)); (hosts[n]=hosts[n]||[]).push(E(beh));
  });
  // EPBS
  const cis=[], ciById={}, ciByEl={};
  Object.values(xmap).forEach(el=>{ if(capTName(el)!=='ConfigurationItem') return;
    const c=Object.assign(E(el),{kind:el.getAttribute('kind')||'', parent:'', children:[], realizes:[], broken:0, depth:0});
    for(const r of el.children) if(capTName(r)==='PhysicalArtifactRealization'){ const t=res(r.getAttribute('targetElement')); if(t){ c.realizes.push(E(t)); (ciByEl[capXId(t)]=ciByEl[capXId(t)]||[]).push(c); } else c.broken++; }
    cis.push(c); ciById[c.id]=c; });
  cis.forEach(c=>{ const el=xmap[c.id]; for(let p=el.parentElement; p; p=p.parentElement){ if(capTName(p)==='ConfigurationItem'){ c.parent=capXId(p); ciById[c.parent].children.push(c); break; } } });
  const depth=c=>{ let d=0; for(let x=c; x.parent; x=ciById[x.parent]) d++; return d; }; cis.forEach(c=>{ c.depth=depth(c); });
  // CE entre comportements déployés sur des nœuds non reliés par un lien physique : les nœuds (et leurs nœuds englobants) doivent être
  // reliés par une suite de Physical Links (les liens peuvent porter sur un nœud parent ou passer par des nœuds intermédiaires) ; un CE déjà alloué à un Physical Link est admis
  const PL=capComputePhysLinks(), adj={}; PL.forEach(l=>{ (adj[l.src.pcId]=adj[l.src.pcId]||new Set()).add(l.tgt.pcId); (adj[l.tgt.pcId]=adj[l.tgt.pcId]||new Set()).add(l.src.pcId); });
  const {parentOf}=capGetParentIndex();
  const famille=id=>{ const out=[id]; for(let p=parentOf[id]; p; p=parentOf[p]){ const e=capGetElementById_(p); if(e&&e.typeName==='PhysicalComponent') out.push(p); } return out; };
  const relies=(a,b)=>{ const cible=new Set(famille(b)), seen=new Set(), pile=famille(a); pile.forEach(x=>seen.add(x));
    while(pile.length){ const x=pile.pop(); if(cible.has(x)) return true; (adj[x]||[]).forEach(y=>{ if(!seen.has(y)){ seen.add(y); famille(y).forEach(z=>{ if(!seen.has(z)){ seen.add(z); pile.push(z); } }); pile.push(y); } }); } return false; };
  const ceBad=[];
  capComputeCompExchanges().forEach(l=>{
    if(l.layer!=='PA'||l.kind==='DELEGATION'||(l.pls&&l.pls.length)) return;
    const a=onNode[l.src.pcId], b=onNode[l.tgt.pcId]; if(!a||!b||!a.length||!b.length) return;
    const ok=a.some(x=>b.some(y=>relies(x.id,y.id)));
    if(!ok) ceBad.push({ce:l, nodesA:a, nodesB:b});
  });
  return _capAnaCache.deploy={nodes, behaviors, onNode, hosts, cis, ciByEl, ceBad};
}

/** Nombre de fonctions allouées à chaque composant (une passe sur les fonctions, résultat gardé avec elles).
 * @param {Object} F - Résultat de capComputeFunctions
 * @returns {Object<string, number>} id du composant → nombre
 */
function capDepFnCount(F){
  if(F._nByComp) return F._nByComp;
  const n={}; F.list.forEach(f=>(f.alloc||[]).forEach(a=>{ n[a.id]=(n[a.id]||0)+1; }));
  return F._nByComp=n;
}

/** Contrôles du déploiement et de l'EPBS. @returns {object[]} Sections */
function capDepChecks(){
  const D=capComputeDeploy(), esc=capEsc, F=capComputeFunctions();
  const pcRow=(c,extra)=>`<tr><td>${capIcoType('PhysicalComponent',12)}${capDetLink(c.id,c.name,'font-weight:600')}</td><td class="ana-dim">${esc(c.nature||'')}</td><td>${extra||''}</td></tr>`;
  const ciRow=(c,extra)=>`<tr><td>${capIcoType('ConfigurationItem',12)}${capDetLink(c.id,c.name,'font-weight:600')}</td><td class="ana-dim">${esc(CAP_CI_KINDS[c.kind]||c.kind)}</td><td>${extra||''}</td></tr>`;
  const cols=[_L('Composant'),_L('Nature'),_L('Détail')], colsCI=[_L('Configuration Item'),_L('Nature'),_L('Détail')];
  const deployUsed=Object.keys(D.onNode).length>0, epbsUsed=D.cis.some(c=>c.realizes.length);
  const nF=capDepFnCount(F), hasFn=c=>!!nF[c.id];
  return [
    {icon:'🖧', title:_L('Comportements non déployés'), tip:_L('PhysicalComponent de nature BEHAVIOR sans PartDeploymentLink vers un nœud (seulement si le modèle pratique le déploiement)'), cols, items:deployUsed?D.behaviors.filter(b=>!b.actor&&!D.onNode[b.id]).map(b=>pcRow(b,hasFn(b)?_L('porte des fonctions'):'')):[]},
    {icon:'▭', title:_L('Nœuds sans comportement déployé'), tip:_L('PhysicalComponent de nature NODE qui n\'héberge aucun comportement (seulement si le modèle pratique le déploiement)'), cols, items:deployUsed?D.nodes.filter(n=>!n.actor&&!D.hosts[n.id]).map(n=>pcRow(n)):[]},
    {icon:'⇄', title:_L('Échanges entre comportements sans lien physique entre leurs nœuds'), tip:_L('Component Exchange (PA) dont les deux comportements sont déployés sur des nœuds distincts qu\'aucun Physical Link ne relie'), cols:[_L('Component Exchange'),_L('Nœuds'),_L('Détail')],
      items:D.ceBad.map(x=>`<tr><td>${capDetLink(x.ce.linkId,x.ce.linkName,'font-weight:600')}</td><td>${esc(x.nodesA.map(n=>n.name).join(' / '))} ⇄ ${esc(x.nodesB.map(n=>n.name).join(' / '))}</td><td class="ana-dim">${esc(x.ce.src.pcName)} → ${esc(x.ce.tgt.pcName)}</td></tr>`)},
    {icon:'⧉', title:_L('Comportements déployés sur plusieurs nœuds'), tip:_L('Déploiement multiple : à vérifier (redondance voulue, ou erreur)'), cols, items:D.behaviors.filter(b=>(D.onNode[b.id]||[]).length>1).map(b=>pcRow(b,D.onNode[b.id].map(n=>esc(n.name)).join(', ')))},
    {icon:'🧰', title:_L('Nœuds physiques non réalisés par un Configuration Item'), tip:_L('Seulement si des Configuration Items réalisent déjà des éléments'), cols, items:epbsUsed?D.nodes.filter(n=>!n.actor&&!D.ciByEl[n.id]).map(n=>pcRow(n)):[]},
    {icon:'∅', title:_L('Configuration Items vides'), tip:_L('Ni réalisation (PhysicalArtifactRealization) ni sous-article'), cols:colsCI, items:D.cis.filter(c=>!c.realizes.length&&!c.children.length&&!c.broken).map(c=>ciRow(c))},
    {icon:'?', title:_L('Réalisations EPBS vers un élément introuvable'), cols:colsCI, items:D.cis.filter(c=>c.broken).map(c=>ciRow(c,_L(`${c.broken} réalisation(s)`)))},
    {icon:'⧉', title:_L('Éléments réalisés par plusieurs Configuration Items'), cols:[_L('Élément'),_L('Configuration Items'),''], items:Object.entries(D.ciByEl).filter(([,l])=>l.length>1).map(([id,l])=>`<tr><td>${capDetLink(id,(capGetElementById_(id)||{attrs:{}}).attrs.name||id)}</td><td>${l.map(c=>esc(c.name)).join(', ')}</td><td></td></tr>`)},
    {icon:'🏷', title:_L('Configuration Items sans nature'), tip:_L('Attribut kind absent'), cols:colsCI, items:D.cis.filter(c=>!c.kind).map(c=>ciRow(c))}];
}

/** Sous-vue 🖧 Déploiement & EPBS.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderDeploy(box){
  const st=_capDep, D=capComputeDeploy(), esc=capEsc, q=st.q.trim().toLowerCase(), F=capComputeFunctions();
  if(!D.nodes.length&&!D.behaviors.length&&!D.cis.length){ box.innerHTML=_L('<div class="phl-empty">Aucun composant physique (nœud ou comportement) ni Configuration Item dans ce modèle : l\'architecture physique et l\'EPBS ne sont pas encore modélisées.</div>'); return; }
  const nF=capDepFnCount(F), fnsOf=c=>nF[c.id]||0;   // nombre de fonctions par composant, calculé une fois
  const PL=capComputePhysLinks();
  let body='', cnt='';
  if(st.view==='dep'){
    const shown=D.nodes.filter(n=>capXtHas(q,n.name,...(D.hosts[n.id]||[]).map(b=>b.name)));
    const orph=D.behaviors.filter(b=>!b.actor&&!D.onNode[b.id]);
    body=_L(`<p class="ana-help">${D.nodes.length} nœud(s) · ${D.behaviors.length} comportement(s), dont <b>${D.behaviors.filter(b=>D.onNode[b.id]).length}</b> déployé(s) · ${D.ceBad.length} échange(s) entre nœuds non reliés. Cliquez un nom pour ouvrir le détail.</p>`)+
      capXtTable([_L('Nœud'),_L('Comportements déployés'),_L('Fonctions (via les comportements)'),_L('Liens physiques')], shown.map(n=>{ const hs=D.hosts[n.id]||[], pls=PL.filter(l=>l.src.pcId===n.id||l.tgt.pcId===n.id);
        return [`${capIcoType('PhysicalComponent',12)}${capDetLink(n.id,n.name,'font-weight:600')}${n.actor?_L(' <span class="ana-dim">(acteur)</span>'):''}`, hs.length?hs.map(b=>`<div>${capIcoType('PhysicalComponent',12)}${capDetLink(b.id,b.name)} <span class="ana-dim">${_L(`ƒ ${fnsOf(b)}`)}</span></div>`).join(''):_L('<span class="ana-miss">∅ aucun</span>'), String(hs.reduce((s,b)=>s+fnsOf(b),0)), pls.length?pls.map(l=>`<div>${capDetLink(l.linkId,l.linkName)} <span class="ana-dim">→ ${esc(l.src.pcId===n.id?l.tgt.pcName:l.src.pcName)}</span></div>`).join(''):'<span class="ana-dim">—</span>']; }))+
      (orph.length?_L(`<h4 style="margin:12px 0 4px">Comportements non déployés (${orph.length})</h4>`)+`<div style="font-size:12px">${orph.map(b=>`${capIcoType('PhysicalComponent',12)}${capDetLink(b.id,b.name)}`).join(' · ')}</div>`:'');
    cnt=`${shown.length} / ${D.nodes.length}`;
  } else if(st.view==='epbs'){
    const kinds=[...new Set(D.cis.map(c=>c.kind))].sort();
    const order=[]; const walk=(l)=>l.sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{ order.push(c); walk(c.children); }); walk(D.cis.filter(c=>!c.parent));
    const shown=order.filter(c=>(!st.kind||c.kind===st.kind)&&capXtHas(q,c.name,c.kind,...c.realizes.map(r=>r.name)));
    body=_L(`<p class="ana-help">${D.cis.length} Configuration Item(s) · ${Object.keys(D.ciByEl).length} élément(s) physique(s) réalisé(s). Arbre des articles (indentation = imbrication).</p>`)+
      capXtTable([_L('Configuration Item'),_L('Nature'),_L('Réalise'),_L('Sous-articles')], shown.map(c=>[`<span style="padding-left:${c.depth*16}px">${capIcoType('ConfigurationItem',12)}${capDetLink(c.id,c.name,'font-weight:600')}</span>`, `<span class="ana-dim">${esc(CAP_CI_KINDS[c.kind]||c.kind||'—')}</span>`,
        c.realizes.length?c.realizes.map(r=>`<div>${capIcoType(r.type,12)}${capDetLink(r.id,r.name)} <span class="ana-dim">${esc(capAnaHuman(r.type))}</span></div>`).join('')+(c.broken?` <span class="ana-miss">+ ${c.broken} ${_L('introuvable(s)')}</span>`:''):'<span class="ana-dim">—</span>', String(c.children.length)]))+
      capXtTable([_L('Nature'),_L('Configuration Items'),_L('Éléments réalisés')], kinds.map(k=>[esc(CAP_CI_KINDS[k]||k||'—'), String(D.cis.filter(c=>c.kind===k).length), String(D.cis.filter(c=>c.kind===k).reduce((s,c)=>s+c.realizes.length,0))]));
    cnt=`${shown.length} / ${D.cis.length}`;
  } else body=capDiagHtml(capDepChecks());
  const kinds=[...new Set(D.cis.map(c=>c.kind))].sort();
  box.innerHTML=capXtBar(capXtViewBtns([['dep',_L('🖧 Déploiement')],['epbs',_L('🧰 EPBS')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${capXtSearch(st.q,st.view==='dep'?_L('Nœud, comportement…'):_L('Article, élément…'))}${st.view==='epbs'&&kinds.length>1?capXtSelect('kind',[['',_L('Toutes natures')],...kinds.map(k=>[k,CAP_CI_KINDS[k]||k||'—'])],st.kind):''}`:''), cnt)+body;
  capXtBind(box, st, capRenderDeploy, ()=>st.view==='epbs'
    ?capCsvExport(_L('epbs.csv'),[_L('Configuration Item'),_L('Nature'),_L('Parent'),_L('Réalise')], D.cis.map(c=>[capCx(c.name,c.id), CAP_CI_KINDS[c.kind]||c.kind, c.parent?(D.cis.find(x=>x.id===c.parent)||{}).name||'':'', capCxList(c.realizes)]))
    :capCsvExport(_L('deploiement.csv'),[_L('Nœud'),_L('Comportement'),_L('Fonctions')], D.nodes.flatMap(n=>(D.hosts[n.id]||[{id:'',name:''}]).map(b=>[capCx(n.name,n.id), b.id?capCx(b.name,b.id):'', b.id?String(fnsOf(b)):'']))));
}

/** Section « Déploiement / EPBS » du panneau de détail.
 * @param {string} id - Élément
 * @param {Function} secTitle - Titre de section
 * @returns {string} HTML
 */
function capDepDetail(id, secTitle){
  const D=capComputeDeploy(), esc=capEsc; let h='';
  const on=D.onNode[id], hs=D.hosts[id], ci=D.cis.find(c=>c.id===id), by=D.ciByEl[id];
  if(on) h+=secTitle(_L('Déployé sur'),'#f0883e')+`<div style="font-size:11.5px">${on.map(n=>`${capIcoType('PhysicalComponent',12)}${capDetLink(n.id,n.name)}`).join(' · ')}</div>`;
  if(hs) h+=secTitle(_L(`Héberge (${hs.length})`),'#f0883e')+`<div style="font-size:11.5px">${hs.map(b=>`<div>${capIcoType('PhysicalComponent',12)}${capDetLink(b.id,b.name)}</div>`).join('')}</div>`;
  if(ci) h+=secTitle(_L('Configuration Item'),'#8b949e')+`<div style="font-size:11.5px">${esc(CAP_CI_KINDS[ci.kind]||ci.kind||'—')}${ci.realizes.length?` · ${_L('réalise')} ${ci.realizes.map(r=>capDetLink(r.id,r.name)).join(', ')}`:''}${ci.children.length?` · ${_L(`${ci.children.length} sous-article(s)`)}`:''}</div>`;
  if(by) h+=secTitle(_L('Réalisé par (EPBS)'),'#8b949e')+`<div style="font-size:11.5px">${by.map(c=>`${capIcoType('ConfigurationItem',12)}${capDetLink(c.id,c.name)} <span class="ana-dim">${esc(CAP_CI_KINDS[c.kind]||c.kind)}</span>`).join(' · ')}</div>`;
  return h;
}

/** Indicateurs du tableau de bord : déploiement et EPBS.
 * @param {Function} add - Ajout d'un indicateur
 */
function capDepDashCatalog(add){
  const G=_L('Déploiement & EPBS'), D=()=>capComputeDeploy();
  add(G,'dep.nodes',_L('Déploiement — nœuds physiques'),'n',()=>({n:D().nodes.length}));
  add(G,'dep.beh',_L('Déploiement — taux de comportements déployés'),'pct',()=>{ const b=D().behaviors.filter(x=>!x.actor); return b.length?capDashPct(b,x=>D().onNode[x.id]):null; });
  add(G,'dep.per',_L('Déploiement — comportements par nœud'),'series',()=>({cats:D().nodes.map(n=>({l:n.name, v:(D().hosts[n.id]||[]).length})).filter(c=>c.v)}));
  add(G,'dep.ci',_L('EPBS — Configuration Items'),'n',()=>({n:D().cis.length}));
  add(G,'dep.cikind',_L('EPBS — Configuration Items par nature'),'series',()=>({cats:Object.entries(D().cis.reduce((m,c)=>(m[c.kind]=(m[c.kind]||0)+1,m),{})).map(([k,v])=>({l:CAP_CI_KINDS[k]||k||'—', v}))}));
  add(G,'dep.cipct',_L('EPBS — taux de nœuds réalisés par un Configuration Item'),'pct',()=>{ const n=D().nodes.filter(x=>!x.actor); return n.length&&D().cis.length?capDashPct(n,x=>D().ciByEl[x.id]):null; });
  add(_L('Contrôles'),'chk.dep',_L('Contrôles du déploiement et de l\'EPBS'),'series',()=>({cats:capChkFilter(capDepChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length})).filter(x=>x.v)}));
}
