/* ═══════════════════════════════════════════════════════════════════════════
   ⚡ Chaînes › 🩺 Contrôles : intégrité des chaînes fonctionnelles, processus opérationnels et
   chemins physiques — chaînes vides, discontinues, implications introuvables, extrémités hors
   chaîne, références de chaînes introuvables ou cycliques, réalisations entre couches, capacités,
   descriptions, doublons, étapes non allouées, composants isolés d'un chemin physique.
   Sections rendues par `capDiagHtml` (🩺 profil appliqué), onglet 🩺 de ⚡ Chaînes, indicateur
   `chk.ch` du tableau de bord, vue `chains` de la 💚 santé (par couche).
   ═══════════════════════════════════════════════════════════════════════════ */

/** Références entre chaînes (`FunctionalChainReference`) et identifiants des enfants de chaque chaîne (nœuds de contrôle compris).
 * @returns {{refs:Object, kids:Object}} refs : id de chaîne → [{id:cible, ok:boolean}] ; kids : id de chaîne → Set des ids des enfants
 */
function capChRefs(){
  if(_capAnaCache.chRefs) return _capAnaCache.chRefs;
  const {xmap}=capAnaCtx(), refs={}, kids={};
  const chainTypes=new Set(['FunctionalChain','OperationalProcess','PhysicalPath']);
  Object.values(xmap).forEach(el=>{
    if(!chainTypes.has(capTName(el))) return;
    const id=capXId(el), k=new Set(); kids[id]=k;
    for(const c of el.children){ const cid=capXId(c); if(cid) k.add(cid);
      if(capTName(c)==='FunctionalChainReference'){ const t=(c.getAttribute('involved')||'').trim().replace(/^.*#/,''); (refs[id]=refs[id]||[]).push({id:t, ok:!!xmap[t]&&chainTypes.has(capTName(xmap[t]))}); } }
  });
  return _capAnaCache.chRefs={refs, kids};
}

/** Contrôles des chaînes.
 * @param {string} [layer] - Couche ARCADIA ('all' ou absent : toutes)
 * @returns {object[]} Sections {icon, title, tip, cols, items}
 */
function capChChecks(layer){
  const all=capChainsData||(capChainsData=capComputeChains()), inL=c=>!layer||layer==='all'||c.layer===layer, cs=all.filter(inL);
  const {refs, kids}=capChRefs(), T=capComputeTrace(false,false), CAPS=capComputeCapabilities();
  const inCap=new Set(CAPS.flatMap(c=>c.chains.map(x=>x.id)));
  const lower=k=>CAP_ANA_LAYERS[CAP_ANA_LAYERS.indexOf(k)+1], upper=k=>CAP_ANA_LAYERS[CAP_ANA_LAYERS.indexOf(k)-1];
  const isChainEl=e=>e&&/FunctionalChain$|OperationalProcess$|PhysicalPath$/.test(e.type||'');
  const realizedBy=c=>(T.up[c.id]||[]).filter(l=>isChainEl(l.src)), realizes=c=>(T.down[c.id]||[]).filter(l=>isChainEl(l.tgt));
  const layerHas=(k,f)=>all.some(c=>c.layer===k&&f(c));
  const cols=[_L('Chaîne'),'Type',_L('Détail')];
  const esc=capEsc;
  const row=(c,extra)=>`<tr><td>${capChainLayerBadge(c.layer)} ${capDetLink(c.id,c.name,'font-weight:600')} <button class="cap-lf-btn" style="padding:0 5px" onclick="capChainsSelectedId='${esc(c.id)}';capChainsSubView='map';capNavOpen('chains')" title="${_L('Ouvrir dans la vue Relation Map des chaînes')}">🗺</button></td><td class="ana-dim">${esc(CAP_CHAIN_LABELS[c.type]||c.type)}</td><td>${extra||''}</td></tr>`;
  // Graphe : composantes connexes (arêtes dont les deux extrémités sont des nœuds)
  const components=c=>{ const ids=c.graph.nodes.map(n=>n.id), set=new Set(ids), adj={}; ids.forEach(i=>adj[i]=[]);
    c.graph.edges.forEach(e=>{ if(set.has(e.srcId)&&set.has(e.tgtId)){ adj[e.srcId].push(e.tgtId); adj[e.tgtId].push(e.srcId); } });
    const seen=new Set(); let n=0; ids.forEach(i=>{ if(seen.has(i)) return; n++; const st=[i]; seen.add(i); while(st.length){ const u=st.pop(); adj[u].forEach(v=>{ if(!seen.has(v)){ seen.add(v); st.push(v); } }); } }); return n; };
  // Extrémités admises : étapes et enfants de la chaîne, et ceux des chaînes qu'elle référence (FunctionalChainReference, récursif)
  const kidsDeep=id=>{ const out=new Set(), seen=new Set(); const walk=x=>{ if(seen.has(x)) return; seen.add(x); (kids[x]||[]).forEach(i=>out.add(i)); (refs[x]||[]).forEach(r=>{ if(r.ok) walk(r.id); }); }; walk(id); return out; };
  const badEnds=c=>{ const set=new Set(c.graph.nodes.map(n=>n.id)), k=kidsDeep(c.id); return c.graph.edges.filter(e=>(e.srcId&&!set.has(e.srcId)&&!k.has(e.srcId))||(e.tgtId&&!set.has(e.tgtId)&&!k.has(e.tgtId))); };
  const unresolvedNodes=c=>c.graph.nodes.filter(n=>n.elemType==='?'), unresolvedEdges=c=>c.type==='PhysicalPath'?[]:c.graph.edges.filter(e=>!e.refId&&!/-e$/.test(e.id));
  // Références cycliques entre chaînes (DFS sur refs)
  const cyc=new Set(); { const st={}; const dfs=(u,path)=>{ st[u]=1; (refs[u]||[]).forEach(r=>{ if(!r.ok) return; if(st[r.id]===1){ path.forEach(p=>cyc.add(p)); cyc.add(r.id); } else if(!st[r.id]) dfs(r.id,[...path,r.id]); }); st[u]=2; }; Object.keys(refs).forEach(u=>{ if(!st[u]) dfs(u,[u]); }); }
  const dup={}; cs.forEach(c=>{ const k=c.layer+'|'+c.type+'|'+c.name.trim().toLowerCase(); (dup[k]=dup[k]||[]).push(c); });
  // Continuité d'un chemin physique : chaque lien impliqué doit relier (par ses ports) les deux composants qu'il joint dans le chemin
  const plEnds={}; capComputePhysLinks().forEach(l=>{ plEnds[l.linkId]=[l.src.pcId,l.tgt.pcId]; });
  const {parentOf}=capGetParentIndex();
  const famille=id=>{ const out=new Set([id]); for(let p=parentOf[id]; p; p=parentOf[p]){ const e=capGetElementById_(p); if(e&&e.typeName==='PhysicalComponent') out.add(p); } return out; };   // le port du lien peut être sur un sous-composant
  const norm=id=>{ const e=capGetElementById_(id); if(e&&e.typeName==='Part'){ const t=(e.attrs.abstractType||'').trim().replace(/^.*#/,''); return t||id; } return id; };   // le chemin implique des Parts, les ports sont sur les composants
  const badPl=c=>{ if(c.type!=='PhysicalPath') return []; const comp={}; c.graph.nodes.forEach(n=>{ comp[n.id]=norm(n.refId); });
    return c.graph.edges.filter(e=>{ if(!e.refId||!plEnds[e.refId]||!comp[e.srcId]||!comp[e.tgtId]) return false; const [p1,p2]=plEnds[e.refId], f1=famille(p1), f2=famille(p2), a=comp[e.srcId], b=comp[e.tgtId];
      return !((f1.has(a)&&f2.has(b))||(f1.has(b)&&f2.has(a))); }); };
  return [
    {icon:'∅', title:_L('Chaînes vides'), tip:_L('Aucune fonction (ou composant) ni échange impliqué'), cols, items:cs.filter(capChainIsEmpty).map(c=>row(c))},
    {icon:'⛓', sev:'err', title:_L('Chaînes discontinues'), tip:_L('Les étapes forment plusieurs morceaux non reliés entre eux (au moins deux étapes)'), cols, items:cs.filter(c=>c.graph.nodes.length>=2&&components(c)>1).map(c=>row(c,_L(`${components(c)} morceaux, ${c.graph.nodes.length} étapes, ${c.graph.edges.length} échanges`)))},
    {icon:'?', sev:'err', title:_L('Implications vers un élément introuvable'), tip:_L('Fonction, composant ou échange impliqué absent du fichier (supprimé, ou dans une bibliothèque)'), cols, items:cs.filter(c=>unresolvedNodes(c).length||unresolvedEdges(c).length).map(c=>row(c,_L(`${unresolvedNodes(c).length} étape(s), ${unresolvedEdges(c).length} échange(s)`)))},
    {icon:'↯', sev:'err', title:_L('Échanges dont une extrémité n\'est pas dans la chaîne'), tip:_L('Implication d\'échange dont la source ou la cible ne désigne aucune étape ni nœud de contrôle de la chaîne (ni des chaînes qu\'elle référence)'), cols, items:cs.filter(c=>badEnds(c).length).map(c=>row(c,badEnds(c).map(e=>esc(e.name||'—')).join(', ')))},
    {icon:'↗', sev:'err', title:_L('Références vers une chaîne introuvable'), tip:_L('FunctionalChainReference dont la chaîne visée n\'existe pas'), cols, items:cs.filter(c=>(refs[c.id]||[]).some(r=>!r.ok)).map(c=>row(c,_L(`${(refs[c.id]||[]).filter(r=>!r.ok).length} référence(s)`)))},
    {icon:'🔁', sev:'err', title:_L('Références de chaînes cycliques'), tip:_L('Une chaîne se référence elle-même, directement ou par d\'autres chaînes'), cols, items:cs.filter(c=>cyc.has(c.id)).map(c=>row(c))},
    {icon:'⇣', title:_L('Chaînes non réalisées à la couche inférieure'), tip:_L('Seulement si la couche inférieure réalise déjà des chaînes'), cols, items:cs.filter(c=>c.type!=='PhysicalPath'&&lower(c.layer)&&layerHas(lower(c.layer),x=>realizes(x).length)&&!realizedBy(c).some(l=>l.src.layer===lower(c.layer))).map(c=>row(c,lower(c.layer)))},
    {icon:'⇡', sev:'info', title:_L('Chaînes ne réalisant rien à la couche supérieure'), tip:_L('Seulement si d\'autres chaînes de la même couche réalisent déjà une chaîne'), cols, items:cs.filter(c=>c.type!=='PhysicalPath'&&upper(c.layer)&&layerHas(c.layer,x=>realizes(x).length)&&!realizes(c).some(l=>l.tgt.layer===upper(c.layer))).map(c=>row(c,upper(c.layer)))},
    {icon:'🎯', sev:'info', title:_L('Chaînes hors capacité'), tip:_L('Chaîne qu\'aucune capacité ni mission n\'implique (seulement si d\'autres chaînes de la couche le sont)'), cols, items:cs.filter(c=>c.type!=='PhysicalPath'&&layerHas(c.layer,x=>inCap.has(x.id))&&!inCap.has(c.id)).map(c=>row(c))},
    {icon:'📝', sev:'info', title:_L('Chaînes sans description'), cols, items:cs.filter(c=>!c.desc).map(c=>row(c))},
    {icon:'≡', title:_L('Chaînes en double'), tip:_L('Même nom, même type et même couche'), cols, items:Object.values(dup).filter(a=>a.length>1).flat().map(c=>row(c,_L(`${dup[c.layer+'|'+c.type+'|'+c.name.trim().toLowerCase()].length} chaînes de ce nom`)))},
    {icon:'∅', title:_L('Étapes portées par des fonctions non allouées'), tip:_L('Fonctions de la chaîne sans composant allocataire (hors processus opérationnels)'), cols, items:cs.filter(c=>c.type==='FunctionalChain'&&c.graph.nodes.some(n=>n.kind==='none'&&n.elemType!=='?')).map(c=>row(c,c.graph.nodes.filter(n=>n.kind==='none'&&n.elemType!=='?').map(n=>esc(n.name)).join(', ')))},
    {icon:'⛓', sev:'err', title:_L('Liens d\'un chemin physique ne reliant pas ses composants voisins'), tip:_L('Le Physical Link impliqué entre deux composants du chemin n\'a pas ses extrémités sur ces composants : chemin discontinu'), cols, items:cs.filter(c=>badPl(c).length).map(c=>row(c,badPl(c).map(e=>esc(e.name||'—')).join(', ')))},
    {icon:'🔌', sev:'err', title:_L('Composants isolés dans un chemin physique'), tip:_L('Composant impliqué qu\'aucun lien physique du chemin ne relie (chemins d\'au moins deux composants)'), cols, items:cs.filter(c=>c.type==='PhysicalPath'&&c.graph.nodes.length>=2&&c.graph.nodes.some(n=>!c.graph.edges.some(e=>e.srcId===n.id||e.tgtId===n.id))).map(c=>row(c,c.graph.nodes.filter(n=>!c.graph.edges.some(e=>e.srcId===n.id||e.tgtId===n.id)).map(n=>esc(n.name)).join(', ')))}];
}

/** Indicateurs du tableau de bord : contrôles des chaînes.
 * @param {Function} add - Ajout d'un indicateur
 */
function capChDashCatalog(add){
  add(_L('Contrôles'),'chk.ch',_L('Contrôles des chaînes'),'series',()=>({cats:capChkFilter(capChChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length})).filter(x=>x.v).sort((a,b)=>b.v-a.v)}));
}
