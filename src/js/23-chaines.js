// ── Chains ──
const CAP_CHAIN_COLORS={FunctionalChain:'#22c55e',OperationalProcess:'#3b82f6',PhysicalPath:'#f97316'};
const CAP_CHAIN_LABELS={FunctionalChain:_L('Chaîne fonctionnelle'),OperationalProcess:_L('Processus opérationnel'),PhysicalPath:_L('Chemin physique')};
const CAP_ACTOR_TYPES=new Set(['SystemActor','LogicalActor','PhysicalActor','OperationalActor']);
const CAP_CHAIN_ARCH={OperationalAnalysis:'OA',SystemAnalysis:'SA',LogicalArchitecture:'LA',PhysicalArchitecture:'PA',EPBSArchitecture:'EPBS'};
/** Couleurs des boîtes, reprises des diagrammes Capella : bleu = élément porté par un acteur,
 * vert = élément porté par le système étudié, gris = élément non alloué ; jaune = activité opérationnelle
 * (processus opérationnels OA, quelle que soit l'entité qui la porte, comme dans Capella). */
const CAP_CHAIN_KIND={
  actor:  {fill:'#c5e6fb', stroke:'#4a4aa8', label:_L('Acteur'),     rm:'#58a6ff'},
  system: {fill:'#c6ffa4', stroke:'#1f6b1f', label:_L('Système'),    rm:'#4dd880'},
  none:   {fill:'#eeeeee', stroke:'#8a8a8a', label:_L('Non alloué'), rm:'#8b949e'},
  oa:     {fill:'#f8dc7c', stroke:'#6b4f2a', label:_L('Activité opérationnelle'), rm:'#e3b341'},
};
let capChainsSubView='diagram';   // 'diagram' (cartes + diagrammes) | 'map' (vue Relation Map)
let capChainsSelectedId=null;     // chaîne affichée dans la vue Relation Map
let capChainsSearch='';           // filtre texte de la liste des chaînes (vue Relation Map)
let capChainsEmptyFilter='all';   // contenu : 'all' | 'full' (non vides) | 'empty' (vides : aucune fonction ni échange)
let capChainsLayerFilter='all';   // filtre de catégorie ARCADIA : 'all' | OA | SA | LA | PA | EPBS | ?
let capChainsSort='model';        // tri : 'model' (ordre du modèle) | 'fn-desc' | 'fn-asc' (nombre de fonctions)
let capChainMapOpts={layout:'LR', compact:false, cut:false}; // réglages de la vue Relation Map des chaînes
let _capChainSvgSeq=0;            // identifiants uniques de marqueurs SVG

/** Indique si un composant XML est un acteur (attribut actor="true" des versions récentes
 * de Capella, ou types *Actor des versions plus anciennes).
 * @param {Element} el - Composant XML
 * @returns {boolean} Vrai si l'élément est un acteur
 */
function capIsActorEl(el){
  if(!el) return false;
  if(el.getAttribute('actor')==='true') return true;
  return CAP_ACTOR_TYPES.has(capTName(el));
}

/** Construit l'index fonction → composant allocataire à partir des ComponentFunctionalAllocation
 * (sourceElement = composant, targetElement = fonction).
 * @param {Element[]} allNodes - Tous les éléments du XML
 * @param {object} xmap - Index id → élément XML
 * @returns {object} Dictionnaire idFonction → {compId, compName, isActor}
 */
function capBuildFunctionAllocationIndex(allNodes, xmap){
  const rid=r=>(r||'').trim().replace(/^.*#/,'');
  const idx={};
  for(const el of allNodes){
    if(capTName(el)!=='ComponentFunctionalAllocation') continue;
    const fid=rid(el.getAttribute('targetElement'));
    const comp=xmap[rid(el.getAttribute('sourceElement'))]||el.parentElement;
    if(fid && comp && !idx[fid]) idx[fid]={compId:capXId(comp), compName:capXName(comp)||'—', isActor:capIsActorEl(comp)};
  }
  return idx;
}

/** Extrait les chaînes (FunctionalChain, OperationalProcess, PhysicalPath) sous forme de GRAPHE
 * orienté complet : plusieurs entrées, plusieurs sorties et ramifications sont conservées.
 * Chaque nœud porte la nature de son allocataire (acteur / système / non alloué).
 * chain.steps (séquence aplatie) est conservé pour la compatibilité avec la modale d'édition.
 * @returns {object[]} Chaînes {type, name, id, graph:{nodes, edges}, steps}
 */
function capComputeChains(){
  if(!cap_xmlDoc) return [];
  const allNodes=[...cap_xmlDoc.getElementsByTagName('*')];
  const xmap={}; allNodes.forEach(el=>{const i=capXId(el);if(i)xmap[i]=el;});
  const rid=r=>(r||'').trim().replace(/^.*#/,'');
  const res=r=>{const k=rid(r); return k?xmap[k]:null;};
  const N=n=>n||'—';
  const alloc=capBuildFunctionAllocationIndex(allNodes, xmap);
  const kindOfFunc=fid=>{const a=alloc[fid]; return a?(a.isActor?'actor':'system'):'none';};
  // Allocations d'échanges : FE → Component Exchange porteur ; Physical Link → Component Exchanges alloués
  const feCE={}, plCE={};
  for(const el of allNodes){
    const t=capTName(el);
    if(t!=='ComponentExchangeFunctionalExchangeAllocation'&&t!=='ComponentExchangeAllocation') continue;
    const src=res(el.getAttribute('sourceElement'))||el.parentElement, tgt=res(el.getAttribute('targetElement'));
    if(!src||!tgt) continue;
    if(t==='ComponentExchangeFunctionalExchangeAllocation') (feCE[capXId(tgt)]=feCE[capXId(tgt)]||[]).push(N(capXName(src)));
    else (plCE[capXId(src)]=plCE[capXId(src)]||[]).push(N(capXName(tgt)));
  }
  /** Noms des Exchange Items d'un Functional Exchange (attribut exchangedItems). */
  const itemsOf=fe=>fe?(fe.getAttribute('exchangedItems')||'').trim().split(/\s+/).filter(Boolean).map(r=>res(r)).filter(Boolean).map(x=>N(capXName(x))):[];
  const chains=[];

  for(const el of allNodes){
    const t=capTName(el);
    if(!['FunctionalChain','OperationalProcess','PhysicalPath'].includes(t)) continue;
    const chain={type:t, name:N(capXName(el)), id:capXId(el), steps:[], graph:null, layer:'?',
      desc:(el.getAttribute('description')||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()};
    // Catégorie ARCADIA : architecture parente (le type FunctionalChain étant transverse,
    // seule la position dans l'arbre du modèle indique s'il s'agit d'une chaîne OA/SA/LA/PA)
    for(let pe=el.parentElement; pe; pe=pe.parentElement){
      const lk=CAP_CHAIN_ARCH[capTName(pe)]; if(lk){ chain.layer=lk; break; }
    }
    const nodes=[], edges=[];

    if(t==='FunctionalChain' || t==='OperationalProcess'){
      // OperationalProcess est une spécialisation de FunctionalChain : même structure XML.
      for(const child of el.children){
        const ct=capTName(child);
        if(ct==='FunctionalChainInvolvementFunction'){
          const invEl=res(child.getAttribute('involved'));
          const fid=invEl?capXId(invEl):rid(child.getAttribute('involved'));
          const a=alloc[fid];
          nodes.push({id:capXId(child), refId:fid, name:invEl?N(capXName(invEl)):'?',
            elemType:invEl?capTName(invEl):'?', owner:a?a.compName:'', kind:t==='OperationalProcess'?'oa':kindOfFunc(fid)});
        } else if(ct==='FunctionalChainInvolvementLink'){
          const invEl=res(child.getAttribute('involved'));
          edges.push({id:capXId(child), refId:invEl?capXId(invEl):'', name:invEl?N(capXName(invEl)):'',
            srcId:rid(child.getAttribute('source')), tgtId:rid(child.getAttribute('target')),
            items:itemsOf(invEl), alloc:invEl?(feCE[capXId(invEl)]||[]):[]});
        }
      }
      // Repli pour d'anciens modèles : attribut involved listant directement les fonctions
      if(!nodes.length){
        let prev=null;
        (el.getAttribute('involved')||'').trim().split(/\s+/).filter(Boolean).forEach((ref,i)=>{
          const invEl=res(ref); const id=chain.id+'-n'+i; const fid=invEl?capXId(invEl):'';
          const a=alloc[fid];
          nodes.push({id, refId:fid, name:invEl?N(capXName(invEl)):'?', elemType:invEl?capTName(invEl):'?',
            owner:a?a.compName:'', kind:t==='OperationalProcess'?'oa':kindOfFunc(fid)});
          if(prev) edges.push({id:id+'-e', refId:'', name:'', srcId:prev, tgtId:id});
          prev=id;
        });
      }
    } else {
      // PhysicalPath : les implications pointent vers des composants OU des liens physiques,
      // chaînées par nextInvolvements (qui peut ramifier). Composants = nœuds, liens = arêtes.
      const invs={};
      for(const child of el.children){
        if(capTName(child)!=='PhysicalPathInvolvement') continue;
        const invEl=res(child.getAttribute('involved'));
        invs[capXId(child)]={id:capXId(child), el:invEl,
          next:(child.getAttribute('nextInvolvements')||'').trim().split(/\s+/).filter(Boolean).map(rid)};
      }
      const isLinkInv=inv=>inv && inv.el && /Link$/.test(capTName(inv.el));
      Object.values(invs).forEach(inv=>{
        if(isLinkInv(inv)) return;
        const e=inv.el;
        nodes.push({id:inv.id, refId:e?capXId(e):'', name:e?N(capXName(e)):'?', elemType:e?capTName(e):'?',
          owner:'', kind:e?(capIsActorEl(e)?'actor':'system'):'none'});
      });
      let seq=0;
      Object.values(invs).forEach(inv=>{
        if(isLinkInv(inv)) return;
        inv.next.forEach(nid=>{
          const nx=invs[nid]; if(!nx) return;
          if(isLinkInv(nx)){
            // composant → lien → composant(s) suivant(s) : une arête étiquetée par le lien
            nx.next.forEach(tid=>{ if(invs[tid] && !isLinkInv(invs[tid]))
              edges.push({id:chain.id+'-p'+(seq++), refId:capXId(nx.el), name:N(capXName(nx.el)), srcId:inv.id, tgtId:tid, items:[], alloc:plCE[capXId(nx.el)]||[]}); });
          } else {
            edges.push({id:chain.id+'-p'+(seq++), refId:'', name:'', srcId:inv.id, tgtId:nid});
          }
        });
      });
    }

    chain.graph={nodes, edges};
    // Séquence aplatie (compatibilité modale / anciennes vues) : ordre des couches du graphe
    const lay=capChainLayout(chain.graph);
    const byId={}; nodes.forEach(n=>byId[n.id]=n);
    const stepType=t==='PhysicalPath'?'path':'func';
    lay.layers.forEach(layer=>layer.forEach(id=>{
      const n=byId[id]; if(!n) return;
      chain.steps.push({type:stepType, name:n.name, elemType:n.elemType});
      edges.filter(e=>e.srcId===id && byId[e.tgtId]).forEach(e=>
        chain.steps.push({type:'link', name:(e.name?e.name+' → ':'→ ')+byId[e.tgtId].name}));
    }));
    chains.push(chain);
  }
  return chains;
}

/** Calcule une disposition en couches (Sugiyama simplifié) d'un graphe de chaîne :
 * gère plusieurs entrées et sorties, casse les cycles (arêtes « retour »), rapproche les
 * entrées de leurs cibles, insère des nœuds fictifs sur les arêtes longues pour qu'aucun
 * trait ne traverse une boîte, puis réduit les croisements par barycentres.
 * @param {{nodes:object[], edges:object[]}} graph - Graphe de la chaîne
 * @returns {{layers:string[][], layerOf:object, routes:object[], entries:string[], exits:string[]}}
 */
function capChainLayout(graph){
  const ids=graph.nodes.map(n=>n.id);
  const idSet=new Set(ids);
  const edges=graph.edges.filter(e=>idSet.has(e.srcId)&&idSet.has(e.tgtId)&&e.srcId!==e.tgtId);
  const out={}, inn={};
  ids.forEach(i=>{out[i]=[]; inn[i]=[];});
  edges.forEach((e,k)=>{out[e.srcId].push(k); inn[e.tgtId].push(k);});
  const entries=ids.filter(i=>!inn[i].length);
  const exits=ids.filter(i=>!out[i].length);

  // 1. Détection des cycles (DFS) : les arêtes vers un nœud en cours de visite sont « retour »
  const back=new Set(), state={};
  const dfs=u=>{ state[u]=1; out[u].forEach(k=>{const v=edges[k].tgtId; if(state[v]===1) back.add(k); else if(!state[v]) dfs(v);}); state[u]=2; };
  entries.forEach(u=>{ if(!state[u]) dfs(u); });
  ids.forEach(u=>{ if(!state[u]) dfs(u); });
  const fwd=edges.map((e,k)=>back.has(k)?null:{s:e.srcId, t:e.tgtId, k}).filter(Boolean);

  // 2. Couches par plus long chemin (tri topologique de Kahn)
  const indeg={}, succ={}, pred={}, layer={};
  ids.forEach(i=>{indeg[i]=0; succ[i]=[]; pred[i]=[]; layer[i]=0;});
  fwd.forEach(e=>{indeg[e.t]++; succ[e.s].push(e.t); pred[e.t].push(e.s);});
  const topo=[], q=ids.filter(i=>!indeg[i]);
  while(q.length){ const u=q.shift(); topo.push(u); succ[u].forEach(v=>{ layer[v]=Math.max(layer[v],layer[u]+1); if(--indeg[v]===0) q.push(v); }); }
  // 3. Les nœuds sans prédécesseur descendent juste au-dessus de leur première cible
  //    (ex. une fonction d'acteur qui alimente une fonction située en milieu de chaîne)
  for(let pass=0; pass<2; pass++){
    [...topo].reverse().forEach(u=>{
      if(pred[u].length || !succ[u].length) return;
      const m=Math.min(...succ[u].map(v=>layer[v]))-1;
      if(m>layer[u]) layer[u]=m;
    });
  }

  // 4. Nœuds fictifs pour les arêtes qui sautent des couches
  const layerOf={...layer};
  const nb={};            // voisins par couche adjacente pour l'ordonnancement
  const addNb=(a,b)=>{ (nb[a]=nb[a]||{up:[],down:[]}).down.push(b); (nb[b]=nb[b]||{up:[],down:[]}).up.push(a); };
  const routes=[];
  edges.forEach((e,k)=>{
    if(back.has(k)){ routes.push({edge:e, back:true, pts:[e.srcId,e.tgtId]}); return; }
    const pts=[e.srcId];
    for(let L=layer[e.srcId]+1; L<layer[e.tgtId]; L++){ const d='~'+k+'~'+L; layerOf[d]=L; pts.push(d); }
    pts.push(e.tgtId);
    for(let i=0;i<pts.length-1;i++) addNb(pts[i],pts[i+1]);
    routes.push({edge:e, back:false, pts});
  });

  // 5. Ordre dans les couches : ordre topologique initial puis balayages de barycentres
  const maxL=Math.max(0,...Object.values(layerOf));
  const layers=Array.from({length:maxL+1},()=>[]);
  const order=[...topo, ...ids.filter(i=>!topo.includes(i)), ...Object.keys(layerOf).filter(k=>k[0]==='~')];
  order.forEach(id=>{ if(!layers[layerOf[id]].includes(id)) layers[layerOf[id]].push(id); });
  const pos={}; const reindex=()=>layers.forEach(l=>l.forEach((id,i)=>pos[id]=i));
  reindex();
  for(let it=0; it<8; it++){
    const down=it%2===0;
    const seqL=down?[...Array(maxL+1).keys()].slice(1):[...Array(maxL).keys()].reverse();
    seqL.forEach(L=>{
      const bary={};
      layers[L].forEach(id=>{
        const ns=((nb[id]||{})[down?'up':'down'])||[];
        bary[id]=ns.length?ns.reduce((s,n)=>s+pos[n],0)/ns.length:pos[id];
      });
      layers[L].sort((a,b)=>bary[a]-bary[b]);
      layers[L].forEach((id,i)=>pos[id]=i);
    });
  }
  return {layers, layerOf, routes, entries, exits};
}

/** Découpe un nom en lignes pour l'affichage dans une boîte.
 * @param {string} s - Texte
 * @param {number} max - Caractères maximum par ligne
 * @param {number} maxLines - Nombre maximum de lignes
 * @returns {string[]} Lignes
 */
function capWrapLines(s, max, maxLines){
  const words=String(s||'').split(/\s+/); const lines=[]; let cur='';
  words.forEach(w=>{ if((cur+' '+w).trim().length>max && cur){ lines.push(cur); cur=w; } else cur=(cur+' '+w).trim(); });
  if(cur) lines.push(cur);
  if(lines.length>maxLines){ const l=lines.slice(0,maxLines); l[maxLines-1]=l[maxLines-1].slice(0,max-1)+'…'; return l; }
  return lines;
}

/** Produit le diagramme SVG d'une chaîne dans le style Capella (haut → bas) : boîtes bleues
 * pour les éléments portés par un acteur, vertes pour le système, flèches orthogonales dans
 * le sens réel des échanges, étiquetées par le nom de l'échange. Gère entrées/sorties multiples.
 * @param {object} chain - Chaîne issue de capComputeChains
 * @returns {string} Balisage SVG
 */
function capChainDiagramSvg(chain){
  const g=chain.graph; if(!g||!g.nodes.length) return _L('<div style="padding:16px;color:#666">Chaîne vide.</div>');
  const lay=capChainLayout(g);
  const byId={}; g.nodes.forEach(n=>byId[n.id]=n);
  const W=200, H=66, DW=14, GX=46, PAD=24;
  const isD=id=>id[0]==='~';
  // Hauteur des inter-couches selon le nombre de segments qui les traversent
  const segCount=lay.layers.map(()=>0);
  lay.routes.forEach(r=>{ if(!r.back) for(let i=0;i<r.pts.length-1;i++) segCount[lay.layerOf[r.pts[i]]]++; });
  const gapY=lay.layers.map((_,L)=>80+Math.max(0,segCount[L]-1)*14);
  const layerTop=[]; let y=PAD;
  lay.layers.forEach((_,L)=>{ layerTop[L]=y; y+=H+gapY[L]; });
  // Abscisses : couches centrées sur la plus large
  const wOf=id=>isD(id)?DW:W;
  const widths=lay.layers.map(l=>l.reduce((s,id)=>s+wOf(id),0)+Math.max(0,l.length-1)*GX);
  const maxW=Math.max(...widths);
  const cx={};
  lay.layers.forEach((l,L)=>{ let x=PAD+(maxW-widths[L])/2; l.forEach(id=>{ cx[id]=x+wOf(id)/2; x+=wOf(id)+GX; }); });
  const backCount=lay.routes.filter(r=>r.back).length;
  const svgW=PAD*2+maxW+(backCount?40+backCount*14:0);
  const svgH=layerTop[lay.layers.length-1]+H+PAD+10;

  // Ports répartis sur les bords haut/bas des boîtes réelles
  const outSegs={}, inSegs={};
  lay.routes.forEach((r,ri)=>{ if(r.back) return;
    (outSegs[r.pts[0]]=outSegs[r.pts[0]]||[]).push(ri);
    (inSegs[r.pts[r.pts.length-1]]=inSegs[r.pts[r.pts.length-1]]||[]).push(ri); });
  const portX=(nodeId, list, ri, otherX)=>{
    const sorted=[...list].sort((a,b)=>otherX(a)-otherX(b));
    const i=sorted.indexOf(ri), n=sorted.length;
    return cx[nodeId]-W/2+W*(i+1)/(n+1);
  };
  // Canaux horizontaux : un rang par segment dans chaque inter-couche
  const chanRank={}; const chanCounter=lay.layers.map(()=>0);
  const segKey=(ri,i)=>ri+':'+i;
  lay.routes.forEach((r,ri)=>{ if(r.back) return; for(let i=0;i<r.pts.length-1;i++){ const L=lay.layerOf[r.pts[i]]; chanRank[segKey(ri,i)]=chanCounter[L]++; } });

  const uid='cc'+(++_capChainSvgSeq);
  const OA=chain.type==='OperationalProcess', EC=OA?'#5c4033':'#1a6e2e';   // flèches brunes en OA, comme Capella
  let edgesSvg='', labelsSvg='';
  lay.routes.forEach((r,ri)=>{
    const e=r.edge;
    if(r.back){
      // Arête retour (cycle) : contournement par la droite
      const s=e.srcId, t=e.tgtId, k=lay.routes.filter((x,xi)=>x.back&&xi<ri).length;
      const lane=PAD+maxW+24+k*14;
      const sy=layerTop[lay.layerOf[s]]+H/2, ty=layerTop[lay.layerOf[t]]+H/2+8;
      const sx=cx[s]+W/2, tx=cx[t]+W/2;
      edgesSvg+=`<path d="M${sx},${sy} H${lane} V${ty} H${tx+2}" fill="none" stroke="${EC}" stroke-width="1.6" stroke-dasharray="5,3" marker-end="url(#${uid}-a)"/>`;
      if(e.name) labelsSvg+=`<text x="${lane+4}" y="${(sy+ty)/2}" class="ccl">${capEsc(e.name)} ↺</text>`;
      return;
    }
    const src=r.pts[0], tgt=r.pts[r.pts.length-1];
    let d='', lastSeg=null, firstSeg=null;
    for(let i=0;i<r.pts.length-1;i++){
      const a=r.pts[i], b=r.pts[i+1], La=lay.layerOf[a];
      const sx=isD(a)?cx[a]:portX(a,outSegs[a],ri,x=>cx[lay.routes[x].pts[1]]);
      const sy=isD(a)?layerTop[La]+H:layerTop[La]+H;
      const ex=isD(b)?cx[b]:portX(b,inSegs[b],ri,x=>cx[lay.routes[x].pts[lay.routes[x].pts.length-2]]);
      const ey=layerTop[lay.layerOf[b]];
      const cy=sy+28+chanRank[segKey(ri,i)]*14;
      if(i===0){ d+=`M${sx},${sy} `; firstSeg={sx,sy,cy,ex}; }
      d+=`V${cy} H${ex} V${ey} `;
      if(isD(b)) d+=`V${ey+H} `;
      lastSeg={ex,cy,ey};
    }
    edgesSvg+=`<path d="${d}" fill="none" stroke="${EC}" stroke-width="1.6" marker-end="url(#${uid}-a)"><title>${capEsc(byId[src].name)} → ${capEsc(e.name||'')} → ${capEsc(byId[tgt].name)}</title></path>`;
    // Étiquette placée du côté le moins encombré : cible à entrée unique, sinon source à
    // sortie unique, sinon au milieu du segment horizontal (convergences ET divergences).
    if(e.name && lastSeg){
      if(inSegs[tgt].length===1)
        labelsSvg+=`<text x="${lastSeg.ex+6}" y="${(lastSeg.cy+lastSeg.ey)/2+4}" class="ccl">${capEsc(e.name)}</text>`;
      else if(outSegs[src].length===1)
        labelsSvg+=`<text x="${firstSeg.sx+6}" y="${firstSeg.sy+18}" class="ccl">${capEsc(e.name)}</text>`;
      else
        labelsSvg+=`<text x="${(firstSeg.sx+firstSeg.ex)/2}" y="${firstSeg.cy-4}" text-anchor="middle" class="ccl">${capEsc(e.name)}</text>`;
    }
  });

  // Élargit le SVG si une étiquette dépasse à droite (≈ 6,4 px par caractère à 11,5 px)
  let labelRight=0;
  labelsSvg.replace(/<text x="([\d.]+)"[^>]*?(text-anchor="middle")?[^>]*>([^<]*)<\/text>/g,(m,x,mid,txt)=>{
    const w=txt.length*6.4; labelRight=Math.max(labelRight, +x+(mid?w/2:w)); return m; });
  const svgWFinal=Math.max(svgW, Math.ceil(labelRight)+PAD);
  let nodesSvg='';
  const entrySet=new Set(lay.entries), exitSet=new Set(lay.exits);
  g.nodes.forEach(n=>{
    const k=CAP_CHAIN_KIND[n.kind]||CAP_CHAIN_KIND.none;
    const x=cx[n.id]-W/2, yy=layerTop[lay.layerOf[n.id]];
    const lines=capWrapLines(n.name,26,3);
    const ty0=yy+H/2-(lines.length-1)*8+4;
    const icon=chain.type==='PhysicalPath'?'C':'F';
    const tip=`${n.name} — ${n.elemType}${n.owner?_L(' · alloué à ')+n.owner:''}${entrySet.has(n.id)?_L(' · ENTRÉE'):''}${exitSet.has(n.id)?_L(' · SORTIE'):''}`;
    nodesSvg+=`<g class="ccn" data-ref="${capEsc(n.refId)}" style="cursor:${n.refId?'pointer':'default'}">
      <title>${capEsc(tip)}</title>
      <rect x="${x}" y="${yy}" width="${W}" height="${H}" fill="${k.fill}" stroke="${k.stroke}" stroke-width="${entrySet.has(n.id)||exitSet.has(n.id)?2.4:1.4}"/>
      ${OA?`<ellipse cx="${x+16}" cy="${yy+H/2}" rx="10" ry="7" fill="#f5a623" stroke="#7a4a00"/><text x="${x+16}" y="${yy+H/2+3}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#3a2200">OA</text>`
        :`<circle cx="${x+15}" cy="${yy+H/2}" r="7" fill="#e8f5d8" stroke="#5a7d3a"/><text x="${x+15}" y="${yy+H/2+3.5}" text-anchor="middle" font-size="9" font-weight="700" fill="#2f5d1a">${icon}</text>`}
      ${lines.map((l,i)=>`<text x="${x+W/2+8}" y="${ty0+i*16}" text-anchor="middle" font-size="12.5" fill="#111">${capEsc(l)}</text>`).join('')}
      ${entrySet.has(n.id)?_L(`<text x="${x+W-4}" y="${yy+11}" text-anchor="end" font-size="8.5" font-weight="700" fill="${k.stroke}">ENTRÉE</text>`):''}
      ${exitSet.has(n.id)?`<text x="${x+W-4}" y="${yy+H-4}" text-anchor="end" font-size="8.5" font-weight="700" fill="${k.stroke}">SORTIE</text>`:''}
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWFinal}" height="${svgH}" viewBox="0 0 ${svgWFinal} ${svgH}" style="display:block;margin:0 auto;font-family:Segoe UI,Arial,sans-serif">
    <defs><marker id="${uid}-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9" fill="none" stroke="${EC}" stroke-width="1.6"/></marker>
    <style>.ccl{font-size:11.5px;fill:${EC};paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}</style></defs>
    ${edgesSvg}${nodesSvg}${labelsSvg}</svg>`;
}

/** Retourne les chaînes après application des filtres de type et de catégorie ARCADIA,
 * triées selon capChainsSort (ordre du modèle conservé à égalité). */
function capChainsFiltered(){
  if(!capChainsData) capChainsData=capComputeChains();
  const list=capChainsData.filter(c=>(capChainsFilter==='all'||c.type===capChainsFilter)
    && (capChainsLayerFilter==='all'||c.layer===capChainsLayerFilter) && capChainEmptyOk(c));
  if(capChainsSort==='fn-desc') list.sort((a,b)=>capChainFnCount(b)-capChainFnCount(a));
  else if(capChainsSort==='fn-asc') list.sort((a,b)=>capChainFnCount(a)-capChainFnCount(b));
  return list;
}
/** Nombre de fonctions (ou de composants pour un Physical Path) impliquées dans la chaîne. */
function capChainFnCount(c){ return (c.graph&&c.graph.nodes||[]).length; }
/** Vrai si la chaîne est vide : aucune fonction (ou composant) ni échange impliqué. */
function capChainIsEmpty(c){ const g=c.graph||{}; return !(g.nodes&&g.nodes.length)&&!(g.edges&&g.edges.length); }
/** Vrai si la chaîne passe le filtre de contenu (toutes / non vides / vides). */
function capChainEmptyOk(c){ return capChainsEmptyFilter==='all'||(capChainsEmptyFilter==='empty')===capChainIsEmpty(c); }
const CAP_CHAIN_LAYER_ORDER=['OA','SA','LA','PA','EPBS','?'];
/** Libellé et couleurs d'une catégorie ARCADIA de chaîne ('?' = non classée). */
function capChainLayerInfo(k){
  return CAP_LAYERS[k]||{label:_L('Non classée'), color:'#8b949e', bg:'rgba(139,148,158,.15)'};
}
/** Badge coloré de catégorie ARCADIA (OA, SA, LA, PA…). */
function capChainLayerBadge(k){
  const lv=capChainLayerInfo(k);
  return `<span class="cap-type-badge" title="${capEsc(lv.label)}" style="color:${lv.color};background:${lv.bg};font-weight:700">${capEsc(k==='?'?'—':k)}</span>`;
}

/** Rend la vue Chaînes : filtres (type + catégorie ARCADIA), légende et bascule entre les
 * deux sous-vues (cartes avec diagrammes ramifiés, ou vue Relation Map interactive). */
function capRenderChains(){
  if(!capChainsData) capChainsData=capComputeChains();
  const container=document.getElementById('cap-view-chains'); if(!container) return;
  const typeKeys=['FunctionalChain','OperationalProcess','PhysicalPath'];
  const cntT=k=>capChainsData.filter(c=>(k==='all'||c.type===k)&&(capChainsLayerFilter==='all'||c.layer===capChainsLayerFilter)&&capChainEmptyOk(c)).length;
  const cntL=k=>capChainsData.filter(c=>(k==='all'||c.layer===k)&&(capChainsFilter==='all'||c.type===capChainsFilter)&&capChainEmptyOk(c)).length;
  const cntE=k=>capChainsData.filter(c=>(capChainsFilter==='all'||c.type===capChainsFilter)&&(capChainsLayerFilter==='all'||c.layer===capChainsLayerFilter)&&(k==='all'||(k==='empty')===capChainIsEmpty(c))).length;
  const layersPresent=CAP_CHAIN_LAYER_ORDER.filter(k=>capChainsData.some(c=>c.layer===k));
  const nShown=capChainsFiltered().length;
  const bar=_L(`<div class="cap-lf-bar" style="flex-wrap:wrap;gap:6px">
      <span class="tb-grp" title="Type"><button class="cap-lf-btn${capChainsFilter==='all'?' active':''}" data-cf="all">Tous types (${cntT('all')})</button>
      ${typeKeys.map(k=>`<button class="cap-lf-btn${capChainsFilter===k?' active':''}" data-cf="${k}">${CAP_CHAIN_LABELS[k]} (${cntT(k)})</button>`).join('')}</span>
      <span class="ana-fn-cnt" title="Chaînes affichées après filtres / total">${nShown===capChainsData.length?_L(`${nShown} chaîne(s)`):_L(`<b>${nShown}</b> / ${capChainsData.length} chaîne(s)`)}</span>
      <span class="tb-grp" style="margin-left:auto" title="Présentation">
        <button class="cap-lf-btn${capChainsSubView==='diagram'?' active':''}" data-sv="diagram" title="Cartes dépliables avec le diagramme de chaque chaîne">▦ Diagrammes</button>
        <button class="cap-lf-btn${capChainsSubView==='map'?' active':''}" data-sv="map" title="Graphe interactif dans le style de la Relation Map">🗺 Vue Relation Map</button>
      </span>
    </div>
    <div class="cap-lf-bar" style="flex-wrap:wrap;margin-top:-4px;gap:6px">
      <span class="tb-grp" title="Catégorie ARCADIA"><button class="cap-lf-btn${capChainsLayerFilter==='all'?' active':''}" data-lf="all">Toutes catégories (${cntL('all')})</button>
      ${layersPresent.map(k=>{const lv=capChainLayerInfo(k);
        return `<button class="cap-lf-btn${capChainsLayerFilter===k?' active':''}" data-lf="${k}" title="${capEsc(lv.label)}" style="${capChainsLayerFilter===k?`border-color:${lv.color};color:${lv.color}`:''}">${k==='?'?_L('Non classées'):k} (${cntL(k)})</button>`;}).join('')}</span>
      <span class="tb-grp" style="margin-left:auto" title="Chaîne vide : aucune fonction (ou composant) ni échange impliqué"><span class="tb-grp-l">Contenu</span>
        ${[['all',_L('Toutes')],['full',_L('Non vides')],['empty',_L('Vides')]].map(([k,l])=>`<button class="cap-lf-btn${capChainsEmptyFilter===k?' active':''}" data-ef="${k}"${k==='empty'&&cntE('empty')?' style="color:var(--c-warn,#e3b341)"':''}>${l} (${cntE(k)})</button>`).join('')}</span>
      <span class="tb-grp" title="Tri des chaînes par nombre de fonctions (composants pour les Physical Paths)"><span class="tb-grp-l">Tri</span>
        ${[['model',_L('Ordre du modèle')],['fn-desc',_L('Fonctions ↓')],['fn-asc',_L('Fonctions ↑')]].map(([k,l])=>`<button class="cap-lf-btn${capChainsSort===k?' active':''}" data-chsort="${k}">${l}</button>`).join('')}</span>
    </div>
    <div class="cap-chain-legend">
      <span><i style="background:${CAP_CHAIN_KIND.actor.fill};border-color:${CAP_CHAIN_KIND.actor.stroke}"></i>Porté par un acteur</span>
      <span><i style="background:${CAP_CHAIN_KIND.system.fill};border-color:${CAP_CHAIN_KIND.system.stroke}"></i>Porté par le système</span>
      <span><i style="background:${CAP_CHAIN_KIND.none.fill};border-color:${CAP_CHAIN_KIND.none.stroke}"></i>Non alloué</span>
      <span><i style="background:${CAP_CHAIN_KIND.oa.fill};border-color:${CAP_CHAIN_KIND.oa.stroke}"></i>Activité opérationnelle (processus OA)</span>
      <span>Bordure épaisse = entrée / sortie de la chaîne · flèches dans le sens réel des échanges</span>
    </div>`);
  if(capChainsSubView==='map'){ container.innerHTML=bar+'<div id="cap-chainmap-wrap"></div>'; capRenderChainMap(); }
  else { container.innerHTML=bar+capChainExportBar()+capRenderChainCards(); capWireChainCards(container); capWireChainExport(container); }
  container.querySelectorAll('[data-cf]').forEach(btn=>btn.addEventListener('click',()=>{capChainsFilter=btn.dataset.cf||'all';capRenderChains();}));
  container.querySelectorAll('[data-lf]').forEach(btn=>btn.addEventListener('click',()=>{capChainsLayerFilter=btn.dataset.lf||'all';capRenderChains();}));
  container.querySelectorAll('[data-ef]').forEach(btn=>btn.addEventListener('click',()=>{capChainsEmptyFilter=btn.dataset.ef||'all';capRenderChains();}));
  container.querySelectorAll('[data-chsort]').forEach(btn=>btn.addEventListener('click',()=>{capChainsSort=btn.dataset.chsort||'model';capRenderChains();}));
  container.querySelectorAll('[data-sv]').forEach(btn=>btn.addEventListener('click',()=>{capChainsSubView=btn.dataset.sv;capRenderChains();}));
}

/** Construit le HTML des cartes de chaînes, regroupées par catégorie ARCADIA
 * (le diagramme est généré à l'ouverture de la carte). */
function capRenderChainCards(){
  const filtered=capChainsFiltered();
  if(!filtered.length) return _L('<div style="color:var(--c-dim);padding:40px;text-align:center">Aucune chaîne.</div>');
  return CAP_CHAIN_LAYER_ORDER.map(lk=>{
    const grp=filtered.filter(c=>c.layer===lk); if(!grp.length) return '';
    const lv=capChainLayerInfo(lk);
    return _L(`<div class="cap-chain-lhdr" style="border-color:${lv.color}">${capChainLayerBadge(lk)}<span>${capEsc(lv.label)}</span><span class="cap-chain-lcnt">${grp.length} chaîne${grp.length>1?'s':''}</span></div>`)+
    grp.map(chain=>{
      const color=CAP_CHAIN_COLORS[chain.type]||'#a78bfa', label=CAP_CHAIN_LABELS[chain.type]||chain.type;
      const g=chain.graph||{nodes:[],edges:[]};
      const lay=capChainLayout(g);
      const multi=lay.entries.length>1||lay.exits.length>1;
      return _L(`<div class="cap-chain-card" data-chain="${capEsc(chain.id)}">
        <div class="cap-chain-hdr">
          <input type="checkbox" class="cap-chx-sel" data-id="${capEsc(chain.id)}" title="Sélectionner pour l'export groupé"${capChainsSelection.has(chain.id)?' checked':''}>
          ${capChainLayerBadge(chain.layer)}
          <span class="cap-type-badge" style="color:${color};background:${color}22">${capEsc(label)}</span>
          <span class="cap-chain-title">${capEsc(chain.name)}</span>
          <span class="cap-chain-meta">${g.nodes.length} ${chain.type==='PhysicalPath'?_L('composants'):_L('fonctions')} · ${g.edges.length} échanges · ${lay.entries.length} entrée${lay.entries.length>1?'s':''} · ${lay.exits.length} sortie${lay.exits.length>1?'s':''}${multi?_L(' <b style="color:var(--c-accent)">⑂ ramifiée</b>'):''}</span>
          <span class="cap-chain-tog">▶</span>
        </div>
        <div class="cap-chain-body"></div>
      </div>`);
    }).join('');
  }).join('');
}

/** Rend le contenu d'une carte ouverte : entrées/sorties, diagramme et table des échanges.
 * @param {object} chain - Chaîne à détailler
 * @returns {string} HTML du corps de la carte
 */
function capChainCardBody(chain){
  const g=chain.graph||{nodes:[],edges:[]};
  const lay=capChainLayout(g);
  const byId={}; g.nodes.forEach(n=>byId[n.id]=n);
  const t=capChainTables(chain);
  const pill=n=>{const k=CAP_CHAIN_KIND[n.kind]||CAP_CHAIN_KIND.none;
    return `<span class="cap-chain-pill" style="background:${k.fill};border-color:${k.stroke}${n.refId?';cursor:pointer':''}"${n.refId?` data-ref="${capEsc(n.refId)}"`:''}>${capEsc(n.name)}</span>`;};
  const ref=(id,label)=>id?`<span class="cex-det" style="cursor:pointer" data-ref="${capEsc(id)}">${capEsc(label)}</span>`:capEsc(label);
  const fRows=t.funcs.map(f=>`<tr><td class="num">${f.num}</td><td>${pill({kind:f.kind,name:f.name,refId:f.refId})}</td><td>${capEsc(f.type)}</td><td>${capEsc(f.owner||'—')}</td>
      <td>${f.role==='—'?'—':`<b style="color:var(--c-accent)">${f.role}</b>`}</td><td class="num">${f.nIn}</td><td class="num">${f.nOut}</td></tr>`).join('');
  const eRows=t.fes.map(e=>`<tr><td class="num">${e.num}</td><td>${ref(e.refId,e.name)}</td><td><span class="num">${e.srcNum}.</span> ${capEsc(e.src)}</td>
      <td style="color:#1a6e2e">⟶</td><td><span class="num">${e.tgtNum}.</span> ${capEsc(e.tgt)}</td>
      ${t.isPath?`<td>${capEsc(e.alloc||'—')}</td>`:`<td>${capEsc(e.items||'—')}</td><td>${capEsc(e.alloc||'—')}</td>`}</tr>`).join('');
  return _L(`<div class="cap-chain-io">
      <div><b>Entrées</b> ${lay.entries.map(id=>pill(byId[id])).join(' ')||'—'}</div>
      <div><b>Sorties</b> ${lay.exits.map(id=>pill(byId[id])).join(' ')||'—'}</div>
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="cap-lf-btn" data-chx-one="png" title="Image PNG encadrée (options de la barre d'export)">🖼 PNG</button>
        <button class="cap-lf-btn" data-chx-one="svg" title="Image SVG vectorielle encadrée">📐 SVG</button>
        <button class="cap-lf-btn" data-chx-one="clip" title="Copier l'image dans le presse-papiers (coller dans Word, PowerPoint…)">📋 Copier</button>
        <button class="cap-lf-btn" data-chx-one="csv" title="Tables des fonctions et des échanges (CSV)">⬇ CSV</button>
        <button class="cap-lf-btn" data-open-map="${capEsc(chain.id)}">🗺 Ouvrir en vue Relation Map</button>
      </div>
    </div>
    <div class="cap-chain-diagram">${capChainDiagramSvg(chain)}</div>
    <div class="cap-chain-tables">
      <details class="cap-chain-xdet" open><summary>${t.isPath?_L('Composants impliqués'):_L('Fonctions impliquées')} (${t.funcs.length})</summary>
        <table class="cap-chain-xtable cap-chain-ft"><tr><th>N°</th><th>${t.isPath?_L('Composant'):_L('Fonction')}</th><th>Type</th><th>Alloué à</th><th>Rôle</th><th title="Échanges entrants">Entr.</th><th title="Échanges sortants">Sort.</th></tr>${fRows}</table></details>
      <details class="cap-chain-xdet" open><summary>${t.isPath?_L('Physical Links impliqués'):_L('Functional Exchanges impliqués')} (${t.fes.length})</summary>
        ${eRows?_L(`<table class="cap-chain-xtable cap-chain-ft"><tr><th>N°</th><th>${t.isPath?_L('Physical Link'):_L('Functional Exchange')}</th><th>Source</th><th></th><th>Cible</th>${t.isPath?_L('<th>Component Exchanges alloués</th>'):_L('<th>Exchange Items</th><th>CE porteur</th>')}</tr>${eRows}</table>`):'<div style="color:var(--c-dim);padding:6px">—</div>'}</details>
    </div>`);
}

/** Attache l'ouverture/fermeture des cartes (rendu paresseux du diagramme) et la navigation. */
function capWireChainCards(container){
  container.querySelectorAll('.cap-chain-card').forEach(card=>{
    const hdr=card.querySelector('.cap-chain-hdr'), body=card.querySelector('.cap-chain-body');
    hdr.addEventListener('click',()=>{
      const open=!body.classList.contains('open');
      if(open && !body.dataset.rendered){
        const chain=capChainsData.find(c=>c.id===card.dataset.chain);
        body.innerHTML=capChainCardBody(chain); body.dataset.rendered='1';
        body.querySelectorAll('.ccn').forEach(n=>n.addEventListener('click',()=>{ if(n.dataset.ref) capOpenDetail(n.dataset.ref); }));
        body.querySelectorAll('.cap-chain-tables [data-ref], .cap-chain-io [data-ref]').forEach(n=>n.addEventListener('click',ev=>{ ev.stopPropagation(); capOpenDetailById(n.dataset.ref); }));
        body.querySelectorAll('[data-chx-one]').forEach(b=>b.addEventListener('click',ev=>{
          ev.stopPropagation(); capChainExportOne(chain, b.dataset.chxOne).catch(e=>capChainExportStatus('⚠ '+e.message)); }));
        body.querySelector('[data-open-map]')?.addEventListener('click',ev=>{
          ev.stopPropagation(); capChainsSelectedId=ev.currentTarget.dataset.openMap; capChainsSubView='map'; capRenderChains(); });
      }
      body.classList.toggle('open',open);
      hdr.querySelector('.cap-chain-tog').classList.toggle('open',open);
    });
  });
}