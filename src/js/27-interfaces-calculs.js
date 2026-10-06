/* ═══════════════════════════════════════════════════════════════════
   OUTILS PARTAGÉS — vues d'interfaces (Physical Link, Component Exchange, Ports)
═══════════════════════════════════════════════════════════════════ */
/** Couche ARCADIA d'un élément XML, déduite de l'architecture qui le contient.
 * @param {Element} el - Élément XML
 * @returns {string} OA | SA | LA | PA | EPBS | '?'
 */
function capArchLayerOf(el){
  for(let pe=el; pe; pe=pe.parentElement){ const lk=CAP_CHAIN_ARCH[capTName(pe)]; if(lk) return lk; }
  return '?';
}

/** Index id → élément XML, sur l'attribut plain « id » ET xmi:id (namespacé).
 * @param {Element[]} allNodes - Tous les éléments du XML
 * @returns {object} Dictionnaire id → Element
 */
function capBuildIdMap(allNodes){
  const xmap={};
  allNodes.forEach(el=>{
    const a=el.getAttribute('id'), b=el.getAttributeNS('http://www.omg.org/XMI','id');
    if(a) xmap[a]=el; if(b) xmap[b]=el;
  });
  return xmap;
}

/** Télécharge un CSV (séparateur « ; », BOM UTF-8 pour Excel).
 * @param {string} name - Nom du fichier
 * @param {string[]} header - En-têtes de colonnes
 * @param {Array<Array>} rows - Lignes de valeurs
 */
function capCsvDownload(name, header, rows){
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv=[header,...rows].map(r=>r.map(esc).join(';')).join('\n');
  capDownloadBlob(new Blob(['\uFEFF'+csv],{type:'text/csv'}), name);
}

/** Construit une matrice composant × composant (N² des interfaces).
 * En mode orienté, la ligne est l'émetteur et la colonne le récepteur (sens effectif l.dir ;
 * un échange bidirectionnel compte dans les deux cellules). Sinon la matrice est symétrique.
 * @param {object[]} links - Liens {src:{pcId,pcName,…}, tgt:{…}, dir?}
 * @param {object} opts - {directed:boolean, colorOf:(end)=>string, unit:string}
 * @returns {{html:string, cells:object}} HTML de la matrice et dictionnaire 'i|j' → liens
 */
function capMatrixBuild(links, opts){
  const comps={}; links.forEach(l=>{ [l.src,l.tgt].forEach(e=>{ if(!comps[e.pcId]) comps[e.pcId]=e; }); });
  const list=Object.values(comps).sort((a,b)=>a.pcName.localeCompare(b.pcName,'fr'));
  const idx={}; list.forEach((c,i)=>idx[c.pcId]=i);
  const cells={}; const add=(i,j,l)=>{ (cells[i+'|'+j]=cells[i+'|'+j]||[]).push(l); };
  links.forEach(l=>{
    const a=idx[l.src.pcId], b=idx[l.tgt.pcId];
    if(!opts.directed){ add(a,b,l); if(a!==b) add(b,a,l); return; }
    if(l.dir==='rev') add(b,a,l);
    else if(l.dir==='bi'){ add(a,b,l); if(a!==b) add(b,a,l); }
    else add(a,b,l);
  });
  const max=Math.max(1,...Object.values(cells).map(v=>v.length));
  const th=c=>`<span style="color:${opts.colorOf(c)}">${capEsc(c.pcName)}</span>`;
  let h=`<div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">${opts.corner||(opts.directed?'Émetteur ↓ / Récepteur →':'Composant')}</th>`;
  list.forEach(c=>{ h+=`<th class="cap-mx-col" title="${capEsc(c.pcName)}"><div>${th(c)}</div></th>`; });
  h+='<th class="cap-mx-col"><div><b>Σ</b></div></th></tr></thead><tbody>';
  list.forEach((r,i)=>{
    let tot=0;
    h+=`<tr><th class="cap-mx-row" title="${capEsc(r.pcName)}">${th(r)}</th>`;
    list.forEach((c,j)=>{
      const v=(cells[i+'|'+j]||[]).length; tot+=v;
      const a=v?0.15+0.6*v/max:0;
      h+=v?`<td class="cap-mx-cell" data-cell="${i}|${j}" style="background:rgba(88,166,255,${a.toFixed(2)})" title="${capEsc(r.pcName)} ${opts.directed?'→':'↔'} ${capEsc(c.pcName)} : ${v} ${opts.unit}">${v}</td>`
           :`<td class="${i===j?'cap-mx-diag':''}"></td>`;
    });
    h+=`<td class="cap-mx-tot">${tot||''}</td></tr>`;
  });
  h+=`</tbody></table></div><div class="cap-mx-hint">${list.length} ${opts.noun||'composants'} · cliquez une cellule pour lister les ${opts.unit}</div><div class="cap-mx-detail"></div>`;
  return {html:h, cells};
}

/** Liste repliable d'éléments HTML séparés par des virgules : au-delà de `max`, le reste est masqué derrière « +N autres » (clic pour déplier / replier).
 * @param {string[]} items - Fragments HTML (liens cliquables)
 * @param {number} [max=4] - Nombre d'éléments affichés replié
 * @returns {string} HTML de la liste
 */
function capFoldList(items, max){
  max=max||4;
  if(items.length<=max+1) return items.join(', ');
  const rest=items.length-max;
  return `${items.slice(0,max).join(', ')}<span class="cap-fold-more" style="display:none">, ${items.slice(max).join(', ')}</span> <span class="cap-fold-btn" data-n="${rest}" title="Afficher / masquer les ${rest} autres" onclick="event.stopPropagation();const m=this.previousElementSibling,o=m.style.display==='none';m.style.display=o?'':'none';this.textContent=o?'▴ réduire':'+'+this.dataset.n+' autres';">+${rest} autres</span>`;
}

/** Rend un rapport de contrôles : sections repliables avec compteur et niveau (ok / avertissement).
 * @param {object[]} sections - [{icon, title, tip, items:string[] (HTML), cols?:string[]}]
 * @returns {string} HTML du rapport
 */
function capDiagHtml(sections){
  const total=sections.reduce((s,x)=>s+x.items.length,0);
  return `<div class="cap-diag-sum">${total?`⚠ ${total} point${total>1?'s':''} à vérifier`:'✔ Aucune anomalie détectée'}</div>`+
    sections.map(s=>`<details class="cap-diag"${s.items.length&&s.items.length<=30?' open':''}>
      <summary><span class="cap-diag-ico">${s.icon}</span><b>${capEsc(s.title)}</b>
        <span class="cap-diag-cnt ${s.items.length?'warn':'ok'}">${s.items.length}</span>
        <span class="cap-diag-tip">${capEsc(s.tip||'')}</span></summary>
      ${s.items.length?`<table class="cap-diag-t">${s.cols?`<tr>${s.cols.map(c=>`<th>${capEsc(c)}</th>`).join('')}</tr>`:''}${s.items.join('')}</table>`:'<div class="cap-diag-ok">✔ RAS</div>'}
    </details>`).join('');
}

/** Lien HTML cliquable ouvrant le panneau de détail d'un élément Capella.
 * @param {string} id - Identifiant de l'élément
 * @param {string} label - Texte affiché
 * @param {string} [style] - Style CSS additionnel
 * @returns {string} HTML
 */
function capDetLink(id, label, style){
  return id?`<span class="cex-det" style="cursor:pointer;${style||''}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(id)}')">${capEsc(label)}</span>`
           :`<span style="${style||''}">${capEsc(label)}</span>`;
}

/** Valeurs de l'attribut orientation d'un ComponentPort (OrientationPortKind). */
const CAP_PORT_ORIENTS=['UNSET','IN','OUT','INOUT'];
/** Style d'affichage de chaque orientation de port (couleur, libellé, info-bulle). */
const CAP_ORIENT_STYLE={
  IN:   {c:'#f0883e', t:'Port d\'entrée (IN)'},
  OUT:  {c:'#3fb950', t:'Port de sortie (OUT)'},
  INOUT:{c:'#a371f7', t:'Port bidirectionnel (INOUT)'},
  UNSET:{c:'#8b949e', t:'Orientation non définie (UNSET)'},
};
/** Libellés des sens effectifs d'un Component Exchange. */
const CAP_CEX_DIRS={
  fwd:  {label:'→ Orienté',        tip:'Sens source → cible'},
  rev:  {label:'← Inversé',        tip:'Sens cible → source (déduit des orientations de ports)'},
  bi:   {label:'⇄ Bidirectionnel', tip:'Échange dans les deux sens (port INOUT)'},
  unset:{label:'? Non orienté',    tip:'Aucun port orienté : sens inconnu'},
};

/** Normalise l'orientation d'un port Capella : attribut absent (valeur par défaut EMF) → 'UNSET'.
 * @param {string|null} o - Valeur brute de l'attribut orientation
 * @returns {string} UNSET | IN | OUT | INOUT
 */
function capNormOrient(o){
  const v=(o||'').toUpperCase();
  return CAP_PORT_ORIENTS.includes(v)?v:'UNSET';
}

/** Déduit le sens effectif d'un Component Exchange à partir des orientations de ses deux ports.
 * Règles : INOUT des deux côtés → bidirectionnel ; un port IN/OUT impose le sens ; OUT→OUT ou IN→IN
 * est incohérent pour un ASSEMBLY mais normal pour une DELEGATION (ports parent/enfant de même sens).
 * @param {string} o1 - Orientation du port source
 * @param {string} o2 - Orientation du port cible
 * @param {string} kind - Kind de l'exchange (UNSET, ASSEMBLY, DELEGATION, FLOW)
 * @param {string} nest - 'srcParent' | 'tgtParent' | '' (imbrication des composants, pour la délégation)
 * @returns {{dir:string, warn:string}} dir = fwd | rev | bi | unset ; warn = message d'alerte éventuel
 */
function capCexDirection(o1,o2,kind,nest){
  if(o1==='INOUT'&&o2==='INOUT') return {dir:'bi',warn:''};
  if(kind==='DELEGATION'&&o1===o2&&(o1==='IN'||o1==='OUT')){
    // IN : le flux entre par le parent vers l'enfant ; OUT : de l'enfant vers le parent
    if(nest==='srcParent') return {dir:o1==='IN'?'fwd':'rev',warn:''};
    if(nest==='tgtParent') return {dir:o1==='IN'?'rev':'fwd',warn:''};
    return {dir:'fwd',warn:''};
  }
  if(o1==='OUT'&&o2==='OUT') return {dir:'fwd',warn:'Deux ports OUT reliés'};
  if(o1==='IN'&&o2==='IN')   return {dir:'fwd',warn:'Deux ports IN reliés'};
  if(o1==='OUT'||o2==='IN')  return {dir:'fwd',warn:''};
  if(o1==='IN'||o2==='OUT')  return {dir:'rev',warn:''};
  if(o1==='INOUT'||o2==='INOUT') return {dir:'bi',warn:''};
  return {dir:'unset',warn:''};
}

/** Calcule les Component Exchanges : pour chaque ComponentExchange, résout source/target
 * (IDs de ComponentPort) et remonte au composant parent de chaque port (SystemComponent,
 * LogicalComponent, PhysicalComponent, acteurs, Entity...). Miroir de capComputePhysLinks. */
function capComputeCompExchanges(){
  if(!cap_xmlDoc) return [];
  const allNodes=[...cap_xmlDoc.getElementsByTagName('*')];
  const xmap={};
  allNodes.forEach(el=>{
    const plainId=el.getAttribute('id');
    const xmiId=el.getAttributeNS('http://www.omg.org/XMI','id');
    if(plainId) xmap[plainId]=el;
    if(xmiId) xmap[xmiId]=el;
  });
  const N=n=>n||'—';

  // port (ComponentPort) → composant parent direct (quel que soit son type)
  const portToComp={};
  for(const el of allNodes){
    for(const child of el.children){
      if(capTName(child)==='ComponentPort'){
        const portId=child.getAttribute('id')||capXId(child);
        if(portId) portToComp[portId]={comp:el, port:child};
      }
    }
  }

  // Index des allocations : CE → Functional Exchanges alloués, CE → Physical Links porteurs
  const rid=r=>(r||'').trim().replace(/^.*#/,'');
  const ceFE={}, cePL={};
  for(const el of allNodes){
    const t=capTName(el);
    if(t==='ComponentExchangeFunctionalExchangeAllocation'){
      const ce=rid(el.getAttribute('sourceElement'))||capXId(el.parentElement||el);
      const fe=xmap[rid(el.getAttribute('targetElement'))];
      if(ce&&fe) (ceFE[ce]=ceFE[ce]||[]).push(fe);
    } else if(t==='ComponentExchangeAllocation'){
      const ce=rid(el.getAttribute('targetElement'));
      const pl=xmap[rid(el.getAttribute('sourceElement'))]||el.parentElement;
      if(ce&&pl&&capTName(pl)==='PhysicalLink') (cePL[ce]=cePL[ce]||[]).push(pl);
    }
  }
  /** Liste {id,name} des éléments référencés par un attribut multi-valué (ids séparés par des espaces). */
  const refList=(el,attr)=>(el.getAttribute(attr)||'').split(/\s+/).map(rid).filter(Boolean)
    .map(i=>xmap[i]).filter(Boolean).map(x=>({id:capXId(x),name:capXName(x)||'—'}));

  const exchanges=[];
  for(const el of allNodes){
    if(capTName(el)!=='ComponentExchange') continue;
    const srcId=(el.getAttribute('source')||'').replace(/^#/,'');
    const tgtId=(el.getAttribute('target')||'').replace(/^#/,'');
    if(!srcId||!tgtId) continue;
    const p1=portToComp[srcId];
    const p2=portToComp[tgtId];
    if(!p1||!p2) continue;
    const ceId=el.getAttribute('id')||capXId(el);
    const kind=el.getAttribute('kind')||'UNSET';
    const o1=capNormOrient(p1.port.getAttribute('orientation'));
    const o2=capNormOrient(p2.port.getAttribute('orientation'));
    // Délégation : on détermine qui est le composant englobant (parent XML)
    const nest=p1.comp.contains(p2.comp)&&p1.comp!==p2.comp?'srcParent':(p2.comp.contains(p1.comp)&&p1.comp!==p2.comp?'tgtParent':'');
    const dirInfo=capCexDirection(o1,o2,kind,nest);
    const fes=(ceFE[ceId]||[]).map(fe=>({id:capXId(fe),name:capXName(fe)||'—',items:refList(fe,'exchangedItems')}));
    // Exchange Items : ceux des FE alloués + ceux portés directement par le CE (convoyedInformations)
    const itemMap={};
    fes.forEach(f=>f.items.forEach(i=>itemMap[i.id]=i));
    refList(el,'convoyedInformations').forEach(i=>itemMap[i.id]=i);
    exchanges.push({
      linkName: N(capXName(el)),
      linkId:   ceId,
      kind,
      dir: dirInfo.dir, warn: dirInfo.warn,
      fes, items:Object.values(itemMap),
      pls:(cePL[ceId]||[]).map(pl=>({id:capXId(pl),name:capXName(pl)||'—'})),
      layer:capArchLayerOf(el),
      src: { pcName:N(capXName(p1.comp)), pcId:p1.comp.getAttribute('id')||capXId(p1.comp), pcType:capTName(p1.comp), pcNature:p1.comp.getAttribute('nature')||'', portName:N(capXName(p1.port)), portId:srcId, portOrient:o1 },
      tgt: { pcName:N(capXName(p2.comp)), pcId:p2.comp.getAttribute('id')||capXId(p2.comp), pcType:capTName(p2.comp), pcNature:p2.comp.getAttribute('nature')||'', portName:N(capXName(p2.port)), portId:tgtId, portOrient:o2 },
    });
  }
  // Tous les ComponentPorts (pour le contrôle des ports orphelins)
  const used=new Set(); exchanges.forEach(x=>{ used.add(x.src.portId); used.add(x.tgt.portId); });
  exchanges.allPorts=Object.entries(portToComp).map(([pid,{comp,port}])=>({
    portId:pid, portName:N(capXName(port)), orient:capNormOrient(port.getAttribute('orientation')),
    pcId:capXId(comp), pcName:N(capXName(comp)), pcType:capTName(comp), pcNature:comp.getAttribute('nature')||'', layer:capArchLayerOf(comp), connected:used.has(pid)}));
  return exchanges;
}

/** Calcule les Physical Links du modèle : pour chaque PhysicalLink, résout les deux
 * extrémités (PhysicalPort via linkEnds) et remonte au PhysicalComponent parent de chaque port.
 * @returns {object[]} Liens avec composants source/cible, ports et nature
 */
function capComputePhysLinks(){
  if(!cap_xmlDoc) return [];
  const allNodes=[...cap_xmlDoc.getElementsByTagName('*')];
  const xmap=capBuildIdMap(allNodes);
  const rid=r=>(r||'').trim().replace(/^.*#/,'');
  const N=n=>n||'—';

  // PhysicalPort → composant parent (PhysicalComponent, ou PhysicalActor des anciennes versions)
  const portToPC={};
  for(const el of allNodes){
    for(const child of el.children){
      if(capTName(child)==='PhysicalPort'){
        const portId=child.getAttribute('id')||capXId(child);
        if(portId) portToPC[portId]={pc:el, port:child};
      }
    }
  }
  // Allocations : Component Exchanges → Physical Links ; ComponentPorts → PhysicalPorts
  const plCE={}, ppCP={}, allocatedCE=new Set();
  for(const el of allNodes){
    const t=capTName(el);
    if(t==='ComponentExchangeAllocation'){
      const pl=xmap[rid(el.getAttribute('sourceElement'))]||el.parentElement;
      const ce=xmap[rid(el.getAttribute('targetElement'))];
      if(pl&&ce&&capTName(pl)==='PhysicalLink'){
        (plCE[capXId(pl)]=plCE[capXId(pl)]||[]).push({id:capXId(ce), name:N(capXName(ce))});
        allocatedCE.add(capXId(ce));
      }
    } else if(t==='ComponentPortAllocation'){
      const a=xmap[rid(el.getAttribute('sourceElement'))]||el.parentElement;
      const b=xmap[rid(el.getAttribute('targetElement'))];
      if(!a||!b) continue;
      const pp=capTName(a)==='PhysicalPort'?a:(capTName(b)==='PhysicalPort'?b:null);
      const cp=pp===a?b:a;
      if(pp&&capTName(cp)==='ComponentPort'){
        const owner=cp.parentElement;
        (ppCP[capXId(pp)]=ppCP[capXId(pp)]||[]).push({id:capXId(cp), name:N(capXName(cp)),
          orient:capNormOrient(cp.getAttribute('orientation')), compName:owner?N(capXName(owner)):'—', compId:owner?capXId(owner):''});
      }
    }
  }
  /** Décrit une extrémité de lien (composant + port physique). */
  const end=(p,portId)=>{
    const actor=capIsActorEl(p.pc);
    return {pcName:N(capXName(p.pc)), pcId:p.pc.getAttribute('id')||capXId(p.pc), pcType:capTName(p.pc), pcActor:actor,
      pcNature:actor?'ACTOR':(p.pc.getAttribute('nature')||''), portName:N(capXName(p.port)), portId, cps:ppCP[portId]||[]};
  };

  const links=[];
  for(const el of allNodes){
    if(capTName(el)!=='PhysicalLink') continue;
    const linkEnds=(el.getAttribute('linkEnds')||'').trim().split(/\s+/).filter(Boolean);
    if(linkEnds.length<2) continue;
    const id1=rid(linkEnds[0]), id2=rid(linkEnds[1]);
    const p1=portToPC[id1], p2=portToPC[id2];
    if(!p1||!p2) continue;
    const lid=el.getAttribute('id')||capXId(el);
    links.push({linkName:N(capXName(el)), linkId:lid, layer:capArchLayerOf(el), ces:plCE[lid]||[], src:end(p1,id1), tgt:end(p2,id2)});
  }
  // Données de contrôle : ports physiques non reliés, CE de couche PA non alloués
  const used=new Set(); links.forEach(l=>{ used.add(l.src.portId); used.add(l.tgt.portId); });
  links.allPorts=Object.entries(portToPC).map(([pid,p])=>({...end(p,pid), connected:used.has(pid)}));
  links.unallocCEs=allNodes.filter(el=>capTName(el)==='ComponentExchange' && capArchLayerOf(el)==='PA'
      && (el.getAttribute('kind')||'')!=='DELEGATION' && !allocatedCE.has(capXId(el)))
    .map(el=>({id:capXId(el), name:N(capXName(el))}));
  return links;
}

/** Rend la vue Physical Link avec deux modes (≡ Ligne / ▣ Composant),
 * filtres textuels, exports CSV et HTML.
 */