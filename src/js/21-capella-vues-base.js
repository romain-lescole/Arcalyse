// ── Sidebar ──
/** Rend la sidebar Capella : liste des types par couche avec cases à cocher.
 * @param {string} filterStr - Filtre texte sur les noms de types
 */
function capRenderSidebar(filterStr=''){
  const q=filterStr.toLowerCase();
  const list=document.getElementById('cap-type-list'); if(!list) return;
  list.innerHTML='';
  const byLayer={};
  for(const[type,info]of Object.entries(capTypeRegistry)){
    if(q&&!type.toLowerCase().includes(q)) continue;
    const l=info.layer||'Shared'; if(!byLayer[l])byLayer[l]=[]; byLayer[l].push({type,info});
  }
  for(const[lk,lv]of Object.entries(CAP_LAYERS)){
    const items=byLayer[lk]; if(!items?.length) continue;
    items.sort((a,b)=>a.type.localeCompare(b.type));
    const isCollapsed=capCollapsedGroups.has(lk);
    const checkedCount=items.filter(({info})=>info.checked).length;
    const grp=document.createElement('div');
    const hdr=document.createElement('div'); hdr.className='cap-layer-grp-hdr';
    hdr.innerHTML=`<span style="width:7px;height:7px;border-radius:50%;background:${lv.color};flex-shrink:0;display:inline-block"></span><span style="color:${lv.color}">${lk}</span><span style="color:var(--c-dim);font-weight:400;text-transform:none;font-size:10px;letter-spacing:0">— ${lv.label}</span><span style="margin-left:auto;font-size:10px;color:var(--c-dim);font-family:monospace;">${checkedCount}/${items.length}</span><span style="font-size:9px;color:var(--c-dim);transition:transform .15s;margin-left:4px;" class="cap-grp-arr">${isCollapsed?'▶':'▼'}</span>`;
    const body=document.createElement('div'); body.className='cap-layer-grp-body'+(isCollapsed?' collapsed':'');
    body.style.maxHeight=isCollapsed?'0':(items.length*26+4)+'px';
    for(const{type,info}of items){
      const row=document.createElement('label'); row.className='cap-type-row';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=info.checked; cb.dataset.type=type;
      const lbl=document.createElement('span'); lbl.className='cap-type-label'; lbl.textContent=type; lbl.title=type;
      const cnt=document.createElement('span'); cnt.className='cap-type-count'; cnt.textContent=info.count;
      row.appendChild(cb); row.appendChild(lbl); row.appendChild(cnt); body.appendChild(row);
    }
    hdr.addEventListener('click',()=>{
      const nowColl=!capCollapsedGroups.has(lk);
      if(nowColl)capCollapsedGroups.add(lk);else capCollapsedGroups.delete(lk);
      const arr=hdr.querySelector('.cap-grp-arr'); arr.textContent=nowColl?'▶':'▼';
      body.classList.toggle('collapsed',nowColl);
      body.style.maxHeight=nowColl?'0':(items.length*26+4)+'px';
    });
    grp.appendChild(hdr); grp.appendChild(body); list.appendChild(grp);
  }
  // Bind checkboxes
  list.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const t=cb.dataset.type; if(!capTypeRegistry[t]) return;
      capTypeRegistry[t].checked=cb.checked;
      if(cb.checked)capEnabledTypes.add(t);else capEnabledTypes.delete(t);
      // Update counter
      const grpEl=cb.closest('.cap-layer-grp-body');
      const hdrEl=grpEl?.previousElementSibling;
      if(hdrEl){const total=grpEl.querySelectorAll('input').length,checked=grpEl.querySelectorAll('input:checked').length;const cnt=hdrEl.querySelector('span:nth-child(4)');if(cnt)cnt.textContent=`${checked}/${total}`;}
      capRenderCurrentView();
    });
  });
}

// ── Get filtered elements ──
/** Retourne capAllElements filtré par types activés, couche et texte de recherche. */
function capGetFiltered(){
  const q=capSearch.toLowerCase(); const lf=capCurrentLayer;
  return capAllElements.filter(el=>{
    if(!capEnabledTypes.has(el.typeName)) return false;
    if(lf!=='all'&&el.layer!==lf) return false;
    if(q){const hay=[el.typeName,el.id,el.layer,...Object.values(el.attrs)].join(' ').toLowerCase();if(!hay.includes(q))return false;}
    return true;
  });
}

// ── Cards ──
/** Rend la vue Cartes : cartes groupées par couche ARCADIA, filtrées. */
function capRenderCards(){
  const filtered=capGetFiltered();
  const rc=document.getElementById('cap-result-count'); if(rc)rc.textContent=`${filtered.length} élément(s) affiché(s)`;
  const container=document.getElementById('cap-view-cards'); if(!container) return;
  const grouped={};
  for(const el of filtered)(grouped[el.layer]=grouped[el.layer]||[]).push(el);
  let html='';
  for(const[lk,lv]of Object.entries(CAP_LAYERS)){
    const items=grouped[lk]; if(!items?.length) continue;
    const cards=items.map(el=>{
      const name=el.attrs.name||'';
      const nm=name?`<span class="cap-card-name">${capEsc(name)}</span>`:`<span class="cap-card-name unnamed">—sans nom—</span>`;
      const pills=[]; if(el.id)pills.push(`<span class="cap-meta-pill">id:${capEsc(el.id.slice(0,16))}</span>`);
      ['kind','nature','direction','visibility'].forEach(k=>{if(el.attrs[k])pills.push(`<span class="cap-meta-pill">${k}:${capEsc(el.attrs[k])}</span>`);});
      return`<div class="cap-card" onclick="capOpenDetail('${capEsc(el.id)}')">
        <div class="cap-card-top"><span class="cap-type-badge" style="color:${lv.color};background:${lv.bg}">${capEsc(el.typeName)}</span>${nm}</div>
        ${pills.length?`<div class="cap-meta">${pills.join('')}</div>`:''}
      </div>`;
    }).join('');
    html+=`<div class="cap-layer-section"><div class="cap-layer-hdr"><span class="cap-layer-badge" style="color:${lv.color}">${lk}</span><span style="font-size:12px;font-weight:600;">${lv.label}</span><span style="margin-left:auto;font-size:11px;color:var(--c-dim);font-family:monospace;">${items.length}</span></div><div class="cap-cards-grid">${cards}</div></div>`;
  }
  container.innerHTML=html||'<div style="text-align:center;padding:40px;color:var(--c-dim)">Aucun résultat</div>';
}

// ── Table ──
/* ═══════════════════════════════════════════════════════════════════════
   CAP TABLE — Gestion dynamique des colonnes (Vue Tableau de Capella Data)
   Remplace l'ancienne liste fixe CAP_TABLE_COLS par un système complet :
   - Toutes les colonnes "attribut brut" réellement présentes dans le XML chargé
   - Colonnes calculées : Human Type, Parent, Owned element
   - Colonnes par chemin (metachain : suite d'étapes type d'élément → relation ou valeur) :
     ex. "Owned element [PhysicalPort]" = liste des enfants directs filtrés par type
   ═══════════════════════════════════════════════════════════════════════ */

/** Colonnes affichées par défaut (Name en premier ; Couche, Type et Human Type restent proposées dans ⊞ Colonnes). */
const CAP_TABLE_BUILTIN_COLS = ['name','id','parent','ownedElement'];
let capTableVisibleCols = null;   // liste ordonnée des colonnes affichées (null = défaut au 1er rendu)
let _capColPickerOpen = false;    // le menu ⊞ Colonnes reste-t-il ouvert entre deux rendus ?
let _capColPickerSearch = '';     // texte de recherche dans le menu ⊞ Colonnes
let capTableColWidths = {};       // { colKey: largeurPx }
let capTableColFilters = {};      // { colKey: texte de filtre }
let capTableMultiValDisplay = 'inline'; // 'inline' (en ligne, virgules) | 'stacked' (empilé verticalement)
let capTableCustomCols = [];      // [{key, label, steps:[{kind, relKey?, direction?, filterType?}]}]
let capTableSort = {col:null, dir:1}; // tri de l'onglet actif (dir : 1 croissant, -1 décroissant)
let capTableScope = {ids:[], direct:false}; // 🎯 portée de l'onglet actif : contenu des éléments choisis (vide = tout le modèle)
let capTableTabs = null;          // onglets de vues [{id, name, visibleCols, colFilters, colWidths, sort}] (51-tableau.js)
let capTableTabIdx = 0;           // index de l'onglet actif
let _capColResizing = false;      // redimensionnement de colonne en cours (évite un tri ou un déplacement au relâchement)

/** Calcule dynamiquement la liste de TOUS les noms d'attributs présents dans capAllElements
 * (union de toutes les clés de el.attrs sur tous les éléments du fichier XML chargé). */
function capGetAllRawAttrKeys(){
  const keys=new Set();
  capAllElements.forEach(el=>{ Object.keys(el.attrs||{}).forEach(k=>keys.add(k)); });
  keys.delete('name'); // déjà une colonne dédiée
  return [...keys].sort();
}

let _capParentIndexCache = null;
/** Construit l'index de containment du modèle Capella depuis le XML brut :
 * parentOf (id enfant → id parent) et childrenOf (id parent → [ids enfants directs]).
 * Mémoïsé sur cap_xmlDoc — recalculé uniquement si le document change.
 * @returns {{parentOf:object, childrenOf:object}} Index de parenté
 */
function capGetParentIndex(){
  if (_capParentIndexCache && _capParentIndexCache._doc===cap_xmlDoc) return _capParentIndexCache;
  const parentOf={}, childrenOf={};
  if (cap_xmlDoc) {
    [...cap_xmlDoc.getElementsByTagName('*')].forEach(xmlEl=>{
      const id = xmlEl.getAttribute('id')||capXId(xmlEl);
      if (!id) return;
      const p = xmlEl.parentElement;
      if (p) {
        const pid = p.getAttribute('id')||capXId(p);
        if (pid) { parentOf[id]=pid; (childrenOf[pid]=childrenOf[pid]||[]).push(id); }
      }
    });
  }
  _capParentIndexCache = {_doc:cap_xmlDoc, parentOf, childrenOf};
  return _capParentIndexCache;
}

/** Liste des "pas de navigation" (metachain steps) disponibles pour construire une colonne
 * personnalisée combinée : containment (Owned element) + toutes les relations Capella
 * détectées dans le fichier (CAP_LINK_SECTIONS), dans les deux sens (src→tgt et tgt→src). */
/** Retourne la liste des "Metaclass" (types Capella) disponibles au démarrage d'une étape :
 * tous les types réellement présents dans le fichier chargé. */
function capGetMetachainMetaclasses(){
  return [...new Set(capAllElements.map(e=>e.typeName))].sort((a,b)=>{
    const ha=(CAP_HUMAN_NAMES[a]||{}).h||a, hb=(CAP_HUMAN_NAMES[b]||{}).h||b;
    return ha.localeCompare(hb);
  });
}

/** Retourne la liste des "Property" disponibles pour un Metaclass donné, calculée à partir
 * des données réellement observées dans le fichier chargé (les propriétés proposées dépendent
 * du metaclass sélectionné à l'étape précédente) :
 * - "Owned element [SousType]" pour chaque type d'enfant direct effectivement observé
 * - une entrée par relation Capella où ce metaclass apparaît comme source ou cible
 * @returns {Array} [{key, label, kind:'owned'|'rel', resultType, relKey?, direction?}]
 */
let _capElementByIdCache = null;
/** Retrouve un élément Capella par son identifiant XML. S'appuie sur un index id → élément
 * mémoïsé, pour résoudre rapidement les attributs qui référencent d'autres éléments par
 * leur ID (source, target, involved, abstractType...).
 * @param {string} id - Identifiant XML de l'élément recherché
 * @returns {object|undefined} Élément de capAllElements, ou undefined si absent
 */
function capGetElementById_(id){
  if (!_capElementByIdCache || _capElementByIdCache._src!==capAllElements) {
    const map={}; capAllElements.forEach(e=>map[e.id]=e);
    _capElementByIdCache={_src:capAllElements, map};
  }
  return _capElementByIdCache.map[id];
}
/** Découpe la valeur brute d'un attribut XML en liste d'IDs candidats (gère les attributs
 * multi-valeurs séparés par espace, ex: 'involved', 'navigableMembers', 'exchangedItems'). */
function capParseAttrRefs_(rawVal){
  if (!rawVal) return [];
  return rawVal.trim().split(/\s+/).filter(Boolean).map(v=>v.replace(/^#/,''));
}
/** Détecte, pour un Metaclass donné, les attributs XML bruts dont la valeur référence
 * effectivement d'autres éléments du fichier (un ou plusieurs IDs résolubles), en testant
 * les éléments réellement présents de ce type. Exclut les attributs déjà couverts par les
 * relations Capella connues (CAP_LINK_SECTIONS) pour ne pas proposer de doublons fonctionnels. */
function capGetAttrRefProperties(metaclass){
  const samples = capAllElements.filter(e=>e.typeName===metaclass).slice(0,30); // échantillon suffisant
  if (!samples.length) return [];
  const attrKeys = new Set();
  samples.forEach(e=>Object.keys(e.attrs||{}).forEach(k=>attrKeys.add(k)));
  attrKeys.delete('name'); // jamais une référence
  const props=[];
  attrKeys.forEach(attrKey=>{
    const resultTypes=new Set();
    let anyResolved=false;
    samples.forEach(e=>{
      const raw=e.attrs[attrKey]; if(!raw) return;
      capParseAttrRefs_(raw).forEach(refId=>{
        const target=capGetElementById_(refId);
        if (target) { anyResolved=true; resultTypes.add(target.typeName); }
      });
    });
    if (!anyResolved) return; // cet attribut n'est pas une référence d'élément (valeur littérale)
    resultTypes.forEach(rt=>{
      const human=(CAP_HUMAN_NAMES[rt]||{}).h||rt;
      props.push({key:'attr:'+attrKey+':'+rt, label:`${attrKey} → ${human}`, kind:'attr', attrKey, resultType:rt});
    });
  });
  return props;
}

/** Détecte le pattern "navigation via élément intermédiaire" : un type X (différent du
 * metaclass courant) possède un attribut multi-valeurs qui référence au moins deux éléments
 * du MÊME type que le metaclass de départ. Exemple emblématique : PhysicalLink.linkEnds
 * référence deux PhysicalPort — depuis un PhysicalPort, on veut atteindre "l'autre port du
 * même lien physique" sans passer par le PhysicalLink comme étape visible.
 * @returns {Array} [{key, label:'via [X]', kind:'via', viaType, viaAttrKey, resultType}]
 */
function capGetViaIntermediateProperties(metaclass){
  const props=[];
  const typesPresent=[...new Set(capAllElements.map(e=>e.typeName))];
  typesPresent.forEach(viaType=>{
    if (viaType===metaclass) return; // un élément ne sert pas d'intermédiaire à lui-même
    const samples=capAllElements.filter(e=>e.typeName===viaType).slice(0,30);
    if (!samples.length) return;
    const attrKeys=new Set();
    samples.forEach(e=>Object.keys(e.attrs||{}).forEach(k=>attrKeys.add(k)));
    attrKeys.delete('name');
    attrKeys.forEach(attrKey=>{
      let qualifies=false;
      samples.forEach(e=>{
        const raw=e.attrs[attrKey]; if(!raw) return;
        const refs=capParseAttrRefs_(raw);
        if (refs.length<2) return; // il faut au moins 2 références pour qu'il y ait "un autre bout"
        const resolvedOfMetaclass=refs.map(r=>capGetElementById_(r)).filter(t=>t&&t.typeName===metaclass);
        if (resolvedOfMetaclass.length>=2) qualifies=true;
      });
      if (qualifies) {
        const human=(CAP_HUMAN_NAMES[viaType]||{}).h||viaType;
        const selfHuman=(CAP_HUMAN_NAMES[metaclass]||{}).h||metaclass;
        props.push({key:'via:'+viaType+':'+attrKey, label:`via ${human} → ${selfHuman}`, kind:'via',
          viaType, viaAttrKey:attrKey, resultType:metaclass});
      }
    });
  });
  return props;
}

/** Détecte tous les types d'ANCÊTRES réellement rencontrés en remontant le containment XML
 * depuis les éléments du metaclass donné (pas seulement le parent direct, mais toute la
 * lignée jusqu'à la racine). Propose une Property "Owner [TypeAncêtre]" par type observé,
 * qui remonte jusqu'au PREMIER ancêtre de ce type rencontré. Reflète les liens forts
 * parent/enfant inhérents à l'imbrication XML Capella (containment), avec la possibilité de
 * cibler un niveau d'ancêtre précis plutôt que seulement le parent immédiat.
 * @returns {Array} [{key, label:'Owner [Type]', kind:'owner', ownerType, resultType}]
 */
function capGetOwnerProperties(metaclass){
  const props=[];
  const {parentOf} = capGetParentIndex();
  const ancestorTypesSeen = new Set();
  capAllElements.filter(e=>e.typeName===metaclass).forEach(e=>{
    let curId = parentOf[e.id];
    let depth = 0;
    while (curId && depth < 30) { // garde-fou anti-boucle
      const cur = capAllElements.find(c=>c.id===curId);
      if (!cur) break;
      ancestorTypesSeen.add(cur.typeName);
      curId = parentOf[cur.id];
      depth++;
    }
  });
  [...ancestorTypesSeen].sort().forEach(ownerType=>{
    const human=(CAP_HUMAN_NAMES[ownerType]||{}).h||ownerType;
    props.push({key:'owner:'+ownerType, label:`Owner [${human}]`, kind:'owner', ownerType, resultType:ownerType});
  });
  return props;
}

/** Détecte les RÉFÉRENCES ENTRANTES : pour un metaclass M, trouve tous les types X dont un
 * attribut référence des éléments de type M. Propose une Property "← X.attrKey" qui, depuis
 * un élément M, retourne tous les X qui le référencent par cet attribut. Indispensable pour
 * les relations stockées sur l'AUTRE élément : ex. ComponentExchange.source/target pointe vers
 * ComponentPort (le port n'a aucun attribut sortant vers l'exchange), ou
 * ComponentPortAllocation.sourceElement/targetElement pointe vers des ports.
 * @returns {Array} [{key, label, kind:'incoming', fromType, fromAttrKey, resultType}]
 */
function capGetIncomingRefProperties(metaclass){
  const props=[];
  const targetIds=new Set(capAllElements.filter(e=>e.typeName===metaclass).map(e=>e.id));
  if (!targetIds.size) return props;
  const typesPresent=[...new Set(capAllElements.map(e=>e.typeName))];
  typesPresent.forEach(fromType=>{
    if (fromType===metaclass) return; // les auto-références sont déjà couvertes par attr sortant
    const samples=capAllElements.filter(e=>e.typeName===fromType).slice(0,30);
    if (!samples.length) return;
    const attrKeys=new Set();
    samples.forEach(e=>Object.keys(e.attrs||{}).forEach(k=>attrKeys.add(k)));
    attrKeys.delete('name');
    attrKeys.forEach(attrKey=>{
      let qualifies=false;
      samples.forEach(e=>{
        if (qualifies) return;
        const raw=e.attrs[attrKey]; if(!raw) return;
        capParseAttrRefs_(raw).forEach(refId=>{ if(targetIds.has(refId)) qualifies=true; });
      });
      if (qualifies) {
        const human=(CAP_HUMAN_NAMES[fromType]||{}).h||fromType;
        props.push({key:'incoming:'+fromType+':'+attrKey, label:`← ${human}.${attrKey}`, kind:'incoming',
          fromType, fromAttrKey:attrKey, resultType:fromType});
      }
    });
  });
  return props;
}

/** Retourne toutes les Properties navigables depuis un Metaclass : valeurs terminales,
 * Owner typé, Owned element typé, relations Capella, attributs XML référençants,
 * navigation « via » un intermédiaire, et références entrantes (navigation inverse).
 * @param {string} metaclass - Type d'élément de départ
 * @returns {object[]} Propriétés proposées dans le sélecteur Metachain
 */
function capGetMetachainProperties(metaclass){
  const props=[];
  const {childrenOf} = capGetParentIndex();

  // 0) Propriétés terminales — n'avancent pas dans le metachain, elles extraient une valeur
  //    simple de l'élément atteint à cette étape (la dernière étape lit souvent "Name"
  //    plutôt que de naviguer plus loin).
  props.push({key:'value:name', label:'Name', kind:'value', valueKind:'name', isTerminal:true});
  props.push({key:'value:id', label:'ID', kind:'value', valueKind:'id', isTerminal:true});
  props.push({key:'value:type', label:'Type', kind:'value', valueKind:'type', isTerminal:true});
  props.push({key:'value:humanType', label:'Human Type', kind:'value', valueKind:'humanType', isTerminal:true});
  // Attributs littéraux réellement présents sur ce metaclass (hors références d'ID, déjà
  // proposées séparément en section 3 ci-dessous, et hors 'name' déjà couvert ci-dessus).
  const literalAttrKeys = new Set();
  const refAttrKeys = new Set(capGetAttrRefProperties(metaclass).map(p=>p.attrKey));
  capAllElements.filter(e=>e.typeName===metaclass).forEach(e=>{
    Object.keys(e.attrs||{}).forEach(k=>{ if(k!=='name' && !refAttrKeys.has(k)) literalAttrKeys.add(k); });
  });
  [...literalAttrKeys].sort().forEach(k=>{
    props.push({key:'value:attr:'+k, label:`Attribut « ${k} »`, kind:'value', valueKind:'attr', attrKey:k, isTerminal:true});
  });

  // 0bis) Owner — remplace l'ancien "Parent" générique par une famille de Properties typées,
  //       sur le même principe que la navigation "via" : on observe, pour les éléments réels
  //       de ce metaclass, tous les types d'ANCÊTRES rencontrés en remontant le containment XML
  //       (pas seulement le parent direct), et on propose une Property par type d'ancêtre —
  //       reflète les liens forts parent/enfant inhérents à la structure imbriquée du XML
  //       Capella (ex: un PhysicalPort a pour Owner direct un PhysicalComponent, mais peut aussi
  //       avoir comme Owner [PhysicalArchitecture] plus haut dans la hiérarchie).
  capGetOwnerProperties(metaclass).forEach(p=>props.push(p));

  // 1) Owned element, sous-typé par les types d'enfants réellement observés sous ce metaclass
  const childTypesSeen = new Set();
  capAllElements.filter(e=>e.typeName===metaclass).forEach(e=>{
    (childrenOf[e.id]||[]).forEach(cid=>{
      const c=capAllElements.find(x=>x.id===cid);
      if (c) childTypesSeen.add(c.typeName);
    });
  });
  [...childTypesSeen].sort().forEach(ct=>{
    const human=(CAP_HUMAN_NAMES[ct]||{}).h||ct;
    props.push({key:'owned:'+ct, label:`Owned element [${human}]`, kind:'owned', resultType:ct, childFilterType:ct});
  });

  // 1bis) Navigation "via élément intermédiaire" — détecte les types X (différents du metaclass
  //       courant) possédant un attribut multi-valeurs qui référence au moins deux éléments du
  //       MÊME type que le metaclass de départ (ex: PhysicalLink.linkEnds référence 2 PhysicalPort).
  //       Property "via [X]" : part d'un élément du metaclass, trouve les X qui le référencent,
  //       et retourne les AUTRES éléments référencés par ce même X (le port à l'autre bout du lien).
  capGetViaIntermediateProperties(metaclass).forEach(p=>props.push(p));

  // 2) Relations Capella où ce metaclass apparaît comme endpoint (src ou tgt), dans le bon sens
  if (!capLinksData) capLinksData=capComputeLinks();
  CAP_LINK_SECTIONS.forEach(sec=>{
    const rows=capLinksData[sec.key]||[]; if(!rows.length) return;
    const parts=(sec.relType||'').split('→').map(s=>s.trim());
    // Détermine si CE metaclass correspond à l'extrémité source ou cible de cette relation,
    // en regardant le type réel des éléments présents dans les lignes calculées (pas juste le libellé).
    const matchesAsSrc = rows.some(r=>r.src.type===metaclass);
    const matchesAsTgt = rows.some(r=>r.tgt.type===metaclass);
    if (matchesAsSrc) {
      const tgtTypes=[...new Set(rows.filter(r=>r.src.type===metaclass).map(r=>r.tgt.type))];
      tgtTypes.forEach(tt=>{
        props.push({key:'rel:'+sec.key+':fwd:'+tt, label:`${sec.humanLabel||sec.relType} →`, kind:'rel',
          relKey:sec.key, direction:'fwd', resultType:tt});
      });
    }
    if (matchesAsTgt) {
      const srcTypes=[...new Set(rows.filter(r=>r.tgt.type===metaclass).map(r=>r.src.type))];
      srcTypes.forEach(st=>{
        props.push({key:'rel:'+sec.key+':rev:'+st, label:`← ${sec.humanLabel||sec.relType}`, kind:'rel',
          relKey:sec.key, direction:'rev', resultType:st});
      });
    }
  });

  // 3) Attributs bruts du XML référençant d'autres éléments par leur ID (source, target,
  //    involved, abstractType, navigableMembers, exchangedItems, constrainedElements...).
  //    Détection dynamique : couvre aussi des cas non modélisés dans CAP_LINK_SECTIONS.
  capGetAttrRefProperties(metaclass).forEach(p=>props.push(p));

  // 4) Références ENTRANTES : éléments d'autres types dont un attribut pointe vers ce metaclass
  //    (ex: ComponentExchange.source → ComponentPort, ComponentPortAllocation.targetElement → port).
  //    Navigation inverse indispensable quand la relation est portée par l'autre élément.
  capGetIncomingRefProperties(metaclass).forEach(p=>props.push(p));

  return props;
}

/** Exécute UN pas de navigation (une Property) à partir d'un élément capAllElements donné.
 * @returns {Array} liste des éléments capAllElements atteints par ce pas. */
function capResolveStep(el, prop){
  if (prop.kind==='owned') {
    const {childrenOf} = capGetParentIndex();
    const kids = (childrenOf[el.id]||[]).map(capGetElementById_).filter(Boolean);
    return prop.childFilterType ? kids.filter(k=>k.typeName===prop.childFilterType) : kids;
  }
  if (prop.kind==='rel') {
    if (!capLinksData) capLinksData=capComputeLinks();
    const rows = capLinksData[prop.relKey]||[];
    const out=[];
    rows.forEach(r=>{
      if (prop.direction==='fwd' && r.src.id===el.id) {
        const t=capGetElementById_(r.tgt.id); if(t) out.push(t);
      } else if (prop.direction==='rev' && r.tgt.id===el.id) {
        const s=capGetElementById_(r.src.id); if(s) out.push(s);
      }
    });
    return out;
  }
  if (prop.kind==='attr') {
    const raw = el.attrs[prop.attrKey]; if (!raw) return [];
    const out=[];
    capParseAttrRefs_(raw).forEach(refId=>{
      const target=capGetElementById_(refId);
      if (target && target.typeName===prop.resultType) out.push(target);
    });
    return out;
  }
  if (prop.kind==='incoming') {
    // Référence entrante : trouve tous les éléments de fromType dont l'attribut fromAttrKey
    // référence l'élément courant (navigation inverse — la relation est portée par l'autre bout).
    const out=[];
    capAllElements.forEach(cand=>{
      if (cand.typeName!==prop.fromType) return;
      const raw=cand.attrs[prop.fromAttrKey]; if(!raw) return;
      if (capParseAttrRefs_(raw).includes(el.id)) out.push(cand);
    });
    return out;
  }
  if (prop.kind==='owner') {
    // Remonte la chaîne d'ancêtres (containment) jusqu'au premier de type ownerType
    const {parentOf} = capGetParentIndex();
    let curId = parentOf[el.id];
    let depth = 0;
    while (curId && depth < 30) {
      const cur = capAllElements.find(c=>c.id===curId);
      if (!cur) break;
      if (cur.typeName===prop.ownerType) return [cur];
      curId = parentOf[cur.id];
      depth++;
    }
    return [];
  }
  if (prop.kind==='via') {
    // Trouve tous les éléments "intermédiaires" (viaType) qui référencent CET élément (el)
    // via leur attribut multi-valeurs, puis retourne les AUTRES éléments référencés par ce
    // même intermédiaire et qui sont du resultType attendu (typiquement === metaclass de départ).
    const intermediates = capAllElements.filter(e=>e.typeName===prop.viaType);
    const out=[];
    intermediates.forEach(via=>{
      const raw = via.attrs[prop.viaAttrKey]; if (!raw) return;
      const refIds = capParseAttrRefs_(raw);
      if (!refIds.includes(el.id)) return; // cet intermédiaire ne concerne pas notre élément
      refIds.forEach(refId=>{
        if (refId===el.id) return; // exclut l'élément de départ lui-même
        const target=capGetElementById_(refId);
        if (target && target.typeName===prop.resultType) out.push(target);
      });
    });
    return out;
  }
  return [];
}

/** Extrait une valeur terminale "simple" d'un élément capAllElements (Name, ID, Type,
 * Human Type, ou un attribut littéral précis) — ne navigue pas vers un autre élément. */
function capExtractValue(el, prop){
  if (prop.valueKind==='name')      return el.attrs.name||'';
  if (prop.valueKind==='id')        return el.id||'';
  if (prop.valueKind==='type')      return el.typeName||'';
  if (prop.valueKind==='humanType') return (CAP_HUMAN_NAMES[el.typeName]||{}).h||'';
  if (prop.valueKind==='attr')      return el.attrs[prop.attrKey]||'';
  return '';
}

/** Exécute une chaîne de Properties (metachain) à partir d'un élément. Le 1er pas n'est
 * exécuté que si le type de l'élément correspond au Metaclass de l'étape 1 (chaque étape
 * contraint le metaclass d'entrée).
 * Si la DERNIÈRE étape est une property terminale (Name, ID, Type, attribut...), le résultat
 * est une liste de VALEURS (strings) plutôt que d'éléments : la dernière étape du chemin
 * sélectionne typiquement une valeur simple à afficher.
 * @returns {Array} éléments capAllElements OU valeurs string selon la dernière étape. */
function capResolveMetachain(el, steps){
  if (!steps.length) return [];
  if (steps[0].metaclass && el.typeName!==steps[0].metaclass) return [];
  let current=[el];
  const navSteps = steps.filter((s,i)=> !(i===steps.length-1 && s.property && s.property.isTerminal));
  const lastStep = steps[steps.length-1];
  navSteps.forEach(step=>{
    if (!step.property) { current=[]; return; }
    const next=[];
    current.forEach(c=>{ capResolveStep(c, step.property).forEach(r=>{ if(!next.includes(r)) next.push(r); }); });
    current=next;
  });
  // Si la dernière étape est terminale, on extrait la valeur sur chaque élément atteint
  // par les étapes de navigation précédentes (current n'a alors pas encore consommé cette étape).
  if (lastStep && lastStep.property && lastStep.property.isTerminal) {
    return current.map(c=>capExtractValue(c, lastStep.property)).filter(v=>v!=='');
  }
  return current;
}

/** Retourne la valeur affichable d'une colonne pour un élément capAllElements donné. */
/** Retourne TOUJOURS un tableau de valeurs pour une colonne donnée (même les colonnes à valeur
 * unique renvoient un tableau d'un seul élément). Permet au rendu de cellule de choisir
 * l'affichage (en ligne, séparé par virgules, ou empilé verticalement) sans recalculer. */
function capTableGetValArray(el, colKey){
  if (colKey.startsWith('rel:')) { const v=capTableRelValues(el, colKey); return v.length ? v : ['']; }
  if (colKey==='layer')    return [el.layer||''];
  if (colKey==='typeName') return [el.typeName||''];
  if (colKey==='humanType')return [(CAP_HUMAN_NAMES[el.typeName]||{}).h||''];
  if (colKey==='name')     return [el.attrs.name||''];
  if (colKey==='id')       return [el.id||''];
  if (colKey==='parent') {
    const {parentOf} = capGetParentIndex();
    const pid = parentOf[el.id];
    if (!pid) return [''];
    const p = capGetElementById_(pid);
    return [p ? (p.attrs.name||p.typeName) : pid];
  }
  if (colKey==='ownedElement') {
    const {childrenOf} = capGetParentIndex();
    const kids = (childrenOf[el.id]||[]).map(capGetElementById_).filter(Boolean);
    return kids.length ? kids.map(k=>k.attrs.name||k.typeName) : [''];
  }
  // Colonne personnalisée : chaîne de navigation multi-étapes (metachain)
  const custom = capTableCustomCols.find(c=>c.key===colKey);
  if (custom) {
    const results = capResolveMetachain(el, custom.steps);
    if (!results.length) return [''];
    // Le résultat est soit une liste d'éléments (navigation), soit déjà des valeurs textuelles
    // (dernière étape terminale : Name, ID, Type, attribut...) — on gère les deux cas.
    return results.map(r=> (typeof r==='string') ? r : (r.attrs.name||r.typeName));
  }
  // Sinon : attribut brut du XML (toujours une valeur unique)
  return [el.attrs[colKey]||''];
}

/** Retourne la valeur d'une colonne sous forme de string unique (jointe par ', ' si plusieurs
 * valeurs) — utilisé pour les filtres par colonne et les tooltips, où une string suffit. */
function capTableGetVal(el, colKey){
  return capTableGetValArray(el, colKey).filter(v=>v!=='').join(', ');
}

/** Libellé humain affiché en en-tête pour une colonne donnée. */
function capTableColLabel(colKey){
  const builtinLabels={layer:'Couche',typeName:'Type',humanType:'Human Type',name:'Name',id:'ID',parent:'Owner',ownedElement:'Owned element'};
  if (builtinLabels[colKey]) return builtinLabels[colKey];
  if (colKey.startsWith('rel:')) return capTableRelLabel(colKey);
  const custom = capTableCustomCols.find(c=>c.key===colKey);
  if (custom) return custom.label;
  return colKey; // attribut brut : son nom XML tel quel
}

/** Rend la vue Tableau paginé avec toutes les colonnes d'attributs. */
/** Construit la barre d'outils au-dessus du tableau Capella : bouton de sélection des
 * colonnes (toutes existent : attributs bruts XML + colonnes calculées + colonnes
 * personnalisées combinées), avec un mini-constructeur pour créer ces dernières. */
function capBuildTableToolbar(){
  const tb=document.getElementById('cap-table-toolbar'); if(!tb) return;
  tb.innerHTML='';

  const picker=document.createElement('div'); picker.style.cssText='position:relative;';
  const btn=document.createElement('div'); btn.className='tbtn';
  const visCols = capTableVisibleCols || CAP_TABLE_BUILTIN_COLS;
  btn.textContent=`⊞ Colonnes (${visCols.length})  ▾`;
  picker.appendChild(btn);

  const menu=document.createElement('div'); menu.className='cap-colpicker-menu';
  if (_capColPickerOpen) menu.classList.add('open');

  // Barre de recherche en haut du menu — filtre toutes les sections (calculées, personnalisées,
  // attributs bruts) par nom de colonne, sans jamais fermer le menu.
  const searchWrap=document.createElement('div'); searchWrap.style.cssText='padding:6px 10px;';
  const searchInp=document.createElement('input'); searchInp.className='inp';
  searchInp.placeholder='🔍 Rechercher une colonne…'; searchInp.value=_capColPickerSearch;
  searchInp.style.cssText='width:100%;box-sizing:border-box;font-size:11px;padding:4px 7px;';
  searchInp.onclick=ev=>ev.stopPropagation();
  searchInp.oninput=()=>{ _capColPickerSearch=searchInp.value; capRefreshColPickerList(); };
  searchWrap.appendChild(searchInp);
  menu.appendChild(searchWrap);

  const listWrap=document.createElement('div'); listWrap.id='cap-colpicker-list';
  menu.appendChild(listWrap);

  menu.onclick=ev=>ev.stopPropagation();
  picker.appendChild(menu);
  btn.onclick=ev=>{
    ev.stopPropagation();
    _capColPickerOpen = !_capColPickerOpen;
    menu.classList.toggle('open', _capColPickerOpen);
    if (_capColPickerOpen) {
      searchInp.focus();
      setTimeout(()=>{
        const close=(ev2)=>{
          if (picker.contains(ev2.target)) return; // ne ferme pas si le clic est dans le menu
          _capColPickerOpen=false; menu.classList.remove('open'); document.removeEventListener('click',close);
        };
        document.addEventListener('click',close);
      },0);
    }
  };
  tb.appendChild(picker);
  capRefreshColPickerList();

  // Icône dédiée "Colonne personnalisée" — ouvre le panneau latéral de construction
  // multi-étapes (metachain navigation), plutôt qu'un mini-formulaire dans ce menu.
  const customBtn=document.createElement('div'); customBtn.className='tbtn'; customBtn.title='Créer une colonne calculée en suivant un chemin de relations (metachain), avec aperçu en direct';
  customBtn.textContent='✨ Colonne par chemin';
  customBtn.onclick=()=>capOpenCustomColPanel();
  tb.appendChild(customBtn);

  // 🎯 Portée de l'onglet (51-tableau.js)
  tb.appendChild(capTableScopeButton());

  // Bascule d'affichage pour les cellules à valeurs multiples : en ligne (virgules) ou
  // empilées verticalement (une valeur par ligne, comme pour Owned element).
  const displayToggle=document.createElement('div'); displayToggle.className='tbtn';
  displayToggle.title='Bascule l\'affichage des cellules à plusieurs valeurs';
  displayToggle.textContent = capTableMultiValDisplay==='inline' ? '≡ En ligne' : '☰ Empilé';
  displayToggle.onclick=()=>{
    capTableMultiValDisplay = capTableMultiValDisplay==='inline' ? 'stacked' : 'inline';
    capRenderTable();
  };
  tb.appendChild(displayToggle);

  // Export CSV des colonnes affichées (toutes les lignes filtrées, dans l'ordre du tri)
  const csvBtn=document.createElement('div'); csvBtn.className='tbtn';
  csvBtn.title='Exporter en CSV les colonnes affichées, pour toutes les lignes filtrées (ordre du tri)';
  csvBtn.textContent='⬇ CSV';
  csvBtn.onclick=()=>capTableCsv();
  tb.appendChild(csvBtn);

  // Bouton sauvegarder/charger la vue tableau (colonnes + metachains + filtres + largeurs)
  const saveBtn=document.createElement('div'); saveBtn.className='tbtn'; saveBtn.title='Sauvegarder la vue de cet onglet (colonnes, colonnes par chemin, filtres, largeurs, tri) dans un fichier';
  saveBtn.textContent='💾 Sauver vue';
  saveBtn.onclick=()=>capSaveTableView();
  tb.appendChild(saveBtn);

  const loadBtn=document.createElement('div'); loadBtn.className='tbtn'; loadBtn.title='Charger une vue tableau sauvegardée';
  loadBtn.textContent='📂 Charger vue';
  loadBtn.onclick=()=>document.getElementById('cap-table-view-input').click();
  tb.appendChild(loadBtn);

  // Bouton de réinitialisation (colonnes, largeurs, filtres)
  const resetBtn=document.createElement('div'); resetBtn.className='tbtn';
  resetBtn.textContent='↺ Réinitialiser';
  resetBtn.title='Revenir aux colonnes, à l\'ordre, aux largeurs et au tri de départ, sans filtre (onglet affiché)';
  resetBtn.onclick=()=>{
    capTableVisibleCols=null; capTableColWidths={}; capTableColFilters={}; capTableSort={col:null, dir:1};
    capRenderTable();
  };
  tb.appendChild(resetBtn);
}

/** Reconstruit uniquement la liste interne du menu ⊞ Colonnes (#cap-colpicker-list),
 * sans toucher au reste de la toolbar ni fermer le menu — utilisé à chaque changement
 * de case à cocher ou de texte de recherche, pour que le menu reste ouvert. */
function capRefreshColPickerList(){
  const listWrap=document.getElementById('cap-colpicker-list'); if(!listWrap) return;
  listWrap.innerHTML='';
  const q=_capColPickerSearch.trim().toLowerCase();

  /** Crée une section dans le menu de sélection des colonnes.
   */
  function addSection(label){
    const s=document.createElement('div'); s.className='cap-colpicker-section'; s.textContent=label;
    listWrap.appendChild(s);
    return s;
  }
  /** Ajoute une entrée cochable dans un menu de sélection.
   */
  function addItem(colKey, label, removable, editable){
    if (q && !label.toLowerCase().includes(q) && !colKey.toLowerCase().includes(q)) return false;
    const item=document.createElement('div'); item.className='cap-colpicker-item';
    const cb=document.createElement('input'); cb.type='checkbox';
    cb.checked = (capTableVisibleCols||CAP_TABLE_BUILTIN_COLS).includes(colKey);
    cb.onclick=ev=>ev.stopPropagation();
    cb.onchange=()=>toggleCol(colKey, cb.checked);
    const lbl=document.createElement('span'); lbl.textContent=label; lbl.style.flex='1';
    item.appendChild(cb); item.appendChild(lbl);
    if (editable) {
      const edit=document.createElement('span'); edit.textContent='✏'; edit.title='Modifier le metachain de cette colonne';
      edit.style.cssText='cursor:pointer;color:var(--c-dim);font-size:10px;padding:0 3px;';
      edit.onclick=(ev)=>{ ev.stopPropagation(); capOpenCustomColPanel(colKey); };
      item.appendChild(edit);
    }
    if (removable) {
      const del=document.createElement('span'); del.textContent='✕'; del.title='Supprimer cette colonne personnalisée';
      del.style.cssText='cursor:pointer;color:var(--c-dim);font-size:10px;padding:0 3px;';
      del.onclick=(ev)=>{
        ev.stopPropagation();
        capTableCustomCols=capTableCustomCols.filter(c=>c.key!==colKey);
        if (capTableVisibleCols) capTableVisibleCols=capTableVisibleCols.filter(c=>c!==colKey);
        capRenderTableBodyOnly();
      };
      item.appendChild(del);
    }
    listWrap.appendChild(item);
    return true;
  }

  /** Affiche ou masque une colonne, sans fermer le menu. */
  function toggleCol(colKey, on){
    if (!capTableVisibleCols) capTableVisibleCols=[...CAP_TABLE_BUILTIN_COLS];
    if (on) { if(!capTableVisibleCols.includes(colKey)) capTableVisibleCols.push(colKey); }
    else capTableVisibleCols=capTableVisibleCols.filter(c=>c!==colKey);
    // Ne reconstruit QUE le tableau (pas la toolbar / le menu) pour garder le menu ouvert
    capRenderTableBodyOnly();
    const btnEl=document.querySelector('#cap-table-toolbar .tbtn');
    if (btnEl) btnEl.textContent=`⊞ Colonnes (${(capTableVisibleCols||CAP_TABLE_BUILTIN_COLS).length})  ▾`;
  }

  let any=false;
  const sec1=addSection('Colonnes calculées');
  if(addItem('name','Name'))any=true; if(addItem('id','ID'))any=true; if(addItem('parent','Owner'))any=true; if(addItem('ownedElement','Owned element'))any=true;
  if(addItem('layer','Couche'))any=true; if(addItem('typeName','Type'))any=true; if(addItem('humanType','Human Type'))any=true;
  if (!sec1.nextSibling || sec1.nextSibling.className!=='cap-colpicker-item') sec1.remove();

  if (capTableCustomCols.length) {
    const sec2=addSection('Colonnes par chemin');
    let sec2any=false;
    capTableCustomCols.forEach(c=>{ if(addItem(c.key, c.label, true, true)) sec2any=true; });
    if (!sec2any) sec2.remove();
  }

  const sec3=addSection('Attributs du fichier XML');
  let sec3any=false;
  capGetAllRawAttrKeys().forEach(k=>{ if(addItem(k, k)) sec3any=true; });
  if (!sec3any) sec3.remove();

  // Relations de 🔗 Liens, par groupe, avec les deux sens (51-tableau.js)
  capTableRelPicker(listWrap, q, toggleCol);
}

/** Ajoute une poignée de redimensionnement sur le bord droit d'un <th> du tableau Capella. */
function capApplyColResize(th, colKey, table){
  th.style.width = (capTableColWidths[colKey]||160)+'px';
  const handle=document.createElement('div'); handle.className='cap-col-resizer';
  handle.onmousedown=ev=>{
    ev.preventDefault(); ev.stopPropagation();
    const startX=ev.clientX, startW=th.getBoundingClientRect().width;
    _capColResizing=true;
    handle.classList.add('resizing'); table.classList.add('cap-resizing');
    const onMove=ev2=>{ const w=Math.max(50,startW+(ev2.clientX-startX)); th.style.width=w+'px'; capTableColWidths[colKey]=w; };
    const onUp=()=>{ handle.classList.remove('resizing'); table.classList.remove('cap-resizing');
      setTimeout(()=>{ _capColResizing=false; },0);
      document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
    document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
  };
  th.appendChild(handle);
}

/* ═══════════════════════════════════════════════════════════════════════
   CAP TABLE — Panneau latéral : constructeur de colonne personnalisée
   « colonne par chemin » (metachain) : chaque étape (ligne)
   associe un Metaclass (type d'élément) à une Property (attribut/relation
   à suivre). Le Metaclass de la 1ʳᵉ ligne est le point de départ ; à partir
   de la 2ᵉ ligne, il est imposé par le type résultant de la Property
   précédente.
   ═══════════════════════════════════════════════════════════════════════ */
let _capCustomColSteps = []; // [{metaclass, property}] — état du panneau ouvert ; property peut être null tant que non choisie

/** Construit une ligne du metachain : <select> Metaclass + <select> Property + suppression.
 * Pour la ligne 0, le Metaclass est libre (tous les types présents). Pour les lignes suivantes,
 * le Metaclass est imposé (resultType de la Property précédente) et affiché en lecture seule. */
function capRenderCustomColStepRow(idx){
  const row=document.createElement('div'); row.className='cap-step-row'; row.style.alignItems='flex-start';
  const num=document.createElement('div'); num.className='cap-step-num'; num.style.marginTop='5px'; num.textContent=idx+1;

  const step=_capCustomColSteps[idx];

  // ── Colonne 1 : Metaclass or Stereotype ──
  let metaclassEl;
  if (idx===0) {
    metaclassEl=document.createElement('select');
    capGetMetachainMetaclasses().forEach(mc=>{
      const o=document.createElement('option'); o.value=mc;
      o.textContent=(CAP_HUMAN_NAMES[mc]||{}).h||mc;
      if (step.metaclass===mc) o.selected=true;
      metaclassEl.appendChild(o);
    });
    metaclassEl.onchange=()=>{
      step.metaclass=metaclassEl.value; step.property=null;
      // Les étapes suivantes deviennent invalides (le metaclass imposé change) : on les retire
      _capCustomColSteps=_capCustomColSteps.slice(0,idx+1);
      capRenderCustomColPanel();
    };
  } else {
    // Metaclass imposé par l'étape précédente — affiché en lecture seule
    metaclassEl=document.createElement('div');
    metaclassEl.style.cssText='flex:1;font-size:11px;padding:4px 6px;color:var(--c-dim);font-style:italic;';
    metaclassEl.textContent = step.metaclass ? ((CAP_HUMAN_NAMES[step.metaclass]||{}).h||step.metaclass) : '—';
  }

  // ── Colonne 2 : Property ──
  const propEl=document.createElement('select');
  if (!step.metaclass) {
    propEl.disabled=true;
    propEl.innerHTML='<option>—</option>';
  } else {
    const props=capGetMetachainProperties(step.metaclass);
    if (!props.length) {
      propEl.disabled=true;
      propEl.innerHTML='<option>(aucune relation disponible)</option>';
    } else {
      propEl.innerHTML=props.map(p=>`<option value="${capEsc(p.key)}">${capEsc(p.label)}</option>`).join('');
      if (step.property) {
        const cur=props.find(p=>p.key===step.property.key);
        if (cur) propEl.value=cur.key;
      }
      propEl.onchange=()=>{
        const chosen=props.find(p=>p.key===propEl.value);
        step.property=chosen;
        // La ligne suivante (si elle existe) doit repartir du nouveau resultType
        _capCustomColSteps=_capCustomColSteps.slice(0,idx+1);
        capRenderCustomColPanel();
      };
      if (!step.property) { step.property=props[0]; } // sélection par défaut
    }
  }

  const del=document.createElement('span'); del.className='cap-step-del'; del.textContent='✕'; del.title='Supprimer cette étape et les suivantes';
  del.style.marginTop='5px';
  del.onclick=()=>{ _capCustomColSteps=_capCustomColSteps.slice(0,idx); if(!_capCustomColSteps.length) _capCustomColSteps.push({metaclass:null,property:null}); capRenderCustomColPanel(); };

  row.appendChild(num); row.appendChild(metaclassEl); row.appendChild(propEl); row.appendChild(del);
  return row;
}

/** Reconstruit entièrement le panneau : recalcule le metaclass imposé de chaque ligne à partir
 * du resultType de la Property choisie à la ligne précédente, puis (re)dessine chaque ligne. */
function capRenderCustomColPanel(){
  // Propage le metaclass imposé ligne par ligne (résultat de la property précédente)
  for (let i=1;i<_capCustomColSteps.length;i++){
    const prev=_capCustomColSteps[i-1];
    _capCustomColSteps[i].metaclass = prev.property ? prev.property.resultType : null;
  }
  const stepsWrap=document.getElementById('cap-customcol-steps'); if(!stepsWrap) return;
  stepsWrap.innerHTML='';
  _capCustomColSteps.forEach((_,idx)=>stepsWrap.appendChild(capRenderCustomColStepRow(idx)));
  // Le bouton "+ Insert" n'a de sens que si la dernière ligne a une Property choisie
  // (sinon on ne sait pas encore quel Metaclass imposer à la ligne suivante)
  const addBtn=document.getElementById('cap-customcol-addstep');
  if (addBtn) {
    const last=_capCustomColSteps[_capCustomColSteps.length-1];
    const canAdd = last && last.property && last.property.resultType;
    addBtn.style.opacity = canAdd ? '1' : '.4';
    addBtn.style.pointerEvents = canAdd ? '' : 'none';
  }
  capPpRender('cap', _capCustomColSteps);
}

/* ═══════════════════════════════════════════════════════════════════════
   COLONNE PAR CHEMIN — Aperçu en direct (▤ Tableau)
   On choisit un élément d'exemple du type de départ ; l'aperçu montre, étape par
   étape, les éléments atteints puis la valeur qui apparaîtra dans la cellule.
   Un « adaptateur » donne accès aux éléments et au moteur de chemin.
   ═══════════════════════════════════════════════════════════════════════ */
const CAP_PP_MAX_CHIPS = 12;   // éléments affichés par étape avant « +N »
const CAP_PP_MAX_OPTS  = 400;  // options proposées dans la liste des exemples
const _capPpState = {cap:{type:null,id:null,q:'',auto:true}}; // exemple choisi (auto = pas encore choisi par l'utilisateur)

/** Adaptateur de l'aperçu pour le ▤ Tableau Capella (capAllElements, moteur cap…).
 * @returns {object} Fonctions d'accès aux éléments et au moteur de chemin */
function capPpCapAdapter(){
  return {
    of:    t=>capAllElements.filter(e=>e.typeName===t),
    byId:  id=>capAllElements.find(e=>e.id===id),
    name:  e=>e.attrs.name||'(sans nom)',
    type:  e=>e.typeName,
    typeLabel: t=>(CAP_HUMAN_NAMES[t]||{}).h||t,
    step:  capResolveStep,
    value: capExtractValue,
    resolve: capResolveMetachain,
  };
}

/** Déroule le chemin pas à pas depuis un élément, en gardant chaque niveau intermédiaire
 * (même logique que capResolveMetachain).
 * @param {object} el - Élément de départ
 * @param {Array} steps - Étapes {metaclass, property}
 * @param {object} ad - Adaptateur de la vue
 * @returns {Array<{elems:Array|null, values:string[]|null}>} Un niveau par étape */
function capPpTrace(el, steps, ad){
  let current=[el];
  return steps.map((s,i)=>{
    if (!s.property) { current=[]; return {elems:[], values:null}; }
    if (i===steps.length-1 && s.property.isTerminal) {
      return {elems:null, values:current.map(c=>ad.value(c, s.property)).filter(v=>v!=='')};
    }
    const next=[];
    current.forEach(c=>ad.step(c, s.property).forEach(r=>{ if(!next.includes(r)) next.push(r); }));
    current=next;
    return {elems:next, values:null};
  });
}

/** Indique si un élément donne un résultat non vide pour le chemin (cellule remplie).
 * @param {object} el - Élément de départ
 * @param {Array} steps - Étapes du chemin
 * @param {object} ad - Adaptateur de la vue
 * @returns {boolean} Vrai si la cellule serait remplie */
function capPpHasResult(el, steps, ad){
  try { return ad.resolve(el, steps).length>0; } catch(e){ return false; }
}

/** Rend la zone « 👁 Aperçu en direct » d'un panneau de colonne par chemin : choix de
 * l'élément d'exemple (recherche, liste, exemple suivant donnant un résultat), taux de
 * remplissage estimé, puis le chemin parcouru étape par étape et le contenu de la cellule.
 * @param {string} which - 'cap' (▤ Tableau)
 * @param {Array} steps - Étapes en cours d'édition
 */
function capPpRender(which, steps){
  const host=document.getElementById(which+'-customcol-preview'); if (!host) return;
  const ad = capPpCapAdapter();
  const st=_capPpState[which];
  const t0 = steps[0] && steps[0].metaclass;
  host.innerHTML='';
  const head=document.createElement('div'); head.className='cap-pp-h'; head.textContent='👁 Aperçu en direct';
  host.appendChild(head);
  if (!t0) { const p=document.createElement('div'); p.className='cap-pp-dim'; p.textContent='Choisissez un type de départ.'; host.appendChild(p); return; }

  const cands=ad.of(t0).slice().sort((a,b)=>ad.name(a).localeCompare(ad.name(b)));
  if (!cands.length) { const p=document.createElement('div'); p.className='cap-pp-dim'; p.textContent='Aucun élément de ce type dans le modèle.'; host.appendChild(p); return; }
  const complete = steps.every(s=>s.property);
  // Nouveau type de départ, ou exemple automatique devenu vide après un changement du chemin :
  // on prend un exemple qui donne un résultat, si possible (un choix de l'utilisateur est conservé)
  if (st.type!==t0 || !cands.some(c=>c.id===st.id)) { st.type=t0; st.q=''; st.auto=true; st.id=null; }
  if (st.auto && complete && (!st.id || !capPpHasResult(ad.byId(st.id), steps, ad))) {
    const ok=cands.slice(0,500).find(c=>capPpHasResult(c, steps, ad));
    st.id=(ok||cands.find(c=>c.id===st.id)||cands[0]).id;
  }
  if (!st.id) st.id=cands[0].id;

  // ── Choix de l'exemple : recherche + liste + « exemple suivant » ──
  const lab=document.createElement('div'); lab.className='cap-pp-dim'; lab.textContent=`Élément d'exemple (${ad.typeLabel(t0)}) :`;
  host.appendChild(lab);
  const bar=document.createElement('div'); bar.className='cap-pp-bar';
  const q=document.createElement('input'); q.className='inp'; q.placeholder='🔍 Filtrer…'; q.value=st.q;
  const sel=document.createElement('select');
  const next=document.createElement('div'); next.className='tbtn'; next.textContent='Suivant ▸';
  next.title='Passer au prochain élément dont la cellule serait remplie';
  bar.appendChild(q); bar.appendChild(sel); bar.appendChild(next);
  host.appendChild(bar);
  const body=document.createElement('div'); host.appendChild(body);

  const fillSel=()=>{
    const ql=st.q.trim().toLowerCase();
    const list=ql ? cands.filter(c=>ad.name(c).toLowerCase().includes(ql)) : cands;
    const shown=list.slice(0,CAP_PP_MAX_OPTS);
    if (st.id && !shown.some(c=>c.id===st.id)) { const cur=cands.find(c=>c.id===st.id); if (cur && !ql) shown.unshift(cur); }
    sel.innerHTML=shown.map(c=>`<option value="${capEsc(c.id)}">${capEsc(ad.name(c))}</option>`).join('')
      + (list.length>shown.length ? `<option disabled>… ${list.length-shown.length} autre(s) : affinez le filtre</option>` : '');
    if (!shown.length) sel.innerHTML='<option disabled>(aucun élément)</option>';
    else if (shown.some(c=>c.id===st.id)) sel.value=st.id;
    else { st.id=shown[0].id; sel.value=st.id; }
  };
  const draw=()=>capPpRenderBody(body, cands.find(c=>c.id===st.id), steps, ad, cands, complete);
  q.oninput=()=>{ st.q=q.value; fillSel(); draw(); };
  sel.onchange=()=>{ st.id=sel.value; st.auto=false; draw(); };
  next.onclick=()=>{
    if (!complete) return;
    const i=cands.findIndex(c=>c.id===st.id);
    for (let k=1;k<=cands.length;k++){
      const c=cands[(i+k)%cands.length];
      if (capPpHasResult(c, steps, ad)) { st.id=c.id; st.auto=false; st.q=''; q.value=''; fillSel(); draw(); return; }
    }
  };
  fillSel(); draw();
}

/** Rend le corps de l'aperçu : remplissage estimé sur le type de départ, puis le chemin
 * parcouru depuis l'élément d'exemple (éléments atteints à chaque étape) et la cellule finale.
 * @param {HTMLElement} body - Conteneur à remplir
 * @param {object} el - Élément d'exemple
 * @param {Array} steps - Étapes du chemin
 * @param {object} ad - Adaptateur de la vue
 * @param {Array} cands - Éléments du type de départ
 * @param {boolean} complete - Toutes les étapes ont-elles une relation ou une valeur ?
 */
function capPpRenderBody(body, el, steps, ad, cands, complete){
  body.innerHTML='';
  if (!el) return;
  // Remplissage estimé : nombre d'éléments du type de départ dont la cellule serait remplie
  // (calcul borné dans le temps pour rester fluide sur un gros modèle)
  if (complete) {
    const t1=performance.now(); let n=0, ok=0;
    for (const c of cands){ if (capPpHasResult(c, steps, ad)) ok++; n++; if (performance.now()-t1>120) break; }
    const cov=document.createElement('div'); cov.className='cap-pp-cov';
    cov.textContent = n<cands.length
      ? `Cellule remplie pour ${ok} élément(s) sur les ${n} premiers testés (${cands.length} au total).`
      : `Cellule remplie pour ${ok} élément(s) sur ${cands.length}.`;
    if (!ok) cov.style.color='var(--c-warn,#e3b341)';
    body.appendChild(cov);
  }
  const chips=(elems)=>{
    const w=document.createElement('div'); w.className='cap-pp-chips';
    elems.slice(0,CAP_PP_MAX_CHIPS).forEach(e=>{
      const c=document.createElement('span'); c.className='cap-pp-chip';
      c.textContent=ad.name(e); c.title=ad.typeLabel(ad.type(e))+' · '+(e.id||'');
      w.appendChild(c);
    });
    if (elems.length>CAP_PP_MAX_CHIPS) { const m=document.createElement('span'); m.className='cap-pp-dim'; m.textContent=`+${elems.length-CAP_PP_MAX_CHIPS}`; w.appendChild(m); }
    return w;
  };
  const block=(num, title)=>{
    const b=document.createElement('div'); b.className='cap-pp-step';
    const h=document.createElement('div'); h.className='cap-pp-st';
    h.innerHTML=(num?`<span class="cap-step-num">${num}</span>`:'')+`<span>${title}</span>`;
    b.appendChild(h); body.appendChild(b); return b;
  };
  block(0, `Départ : <b>${capEsc(ad.typeLabel(ad.type(el)))}</b>`).appendChild(chips([el]));
  const levels=capPpTrace(el, steps, ad);
  let stopped=false;
  levels.forEach((lv,i)=>{
    const s=steps[i];
    const pl = s.property ? s.property.label : '(à choisir)';
    const b=block(i+1, `↓ ${capEsc(pl)}`);
    if (stopped || !s.property) { b.classList.add('off'); return; }
    if (lv.values) {
      const v=document.createElement('div'); v.className='cap-pp-dim';
      v.textContent = lv.values.length ? `${lv.values.length} valeur(s) lue(s)` : 'Aucune valeur.';
      b.appendChild(v);
    } else if (!lv.elems.length) {
      const v=document.createElement('div'); v.className='cap-pp-dim'; v.style.color='var(--c-warn,#e3b341)';
      v.textContent='∅ Aucun élément atteint : le chemin s\'arrête ici pour cet exemple.';
      b.appendChild(v); stopped=true;
    } else {
      const types=[...new Set(lv.elems.map(ad.type))].map(ad.typeLabel).join(', ');
      const v=document.createElement('div'); v.className='cap-pp-dim'; v.textContent=`${lv.elems.length} × ${types}`;
      b.appendChild(v); b.appendChild(chips(lv.elems));
    }
  });
  // Cellule finale, telle qu'elle apparaîtra dans le tableau
  const res=document.createElement('div'); res.className='cap-pp-res';
  const last=levels[levels.length-1];
  const vals = !complete ? null : (last && last.values) ? last.values : (last ? last.elems.map(ad.name) : []);
  res.innerHTML='<div class="cap-pp-st"><span>▣ Cellule dans le tableau</span></div>';
  const cell=document.createElement('div'); cell.className='cap-pp-cell';
  cell.textContent = vals===null ? 'Chemin incomplet.' : (vals.length ? vals.join(', ') : '(vide)');
  if (!vals || !vals.length) cell.classList.add('empty');
  res.appendChild(cell); body.appendChild(res);
}

let _capCustomColEditKey = null; // clé de la colonne perso en cours d'édition, ou null = création

/** Ouvre le panneau latéral de construction de colonne personnalisée (Metachain Navigation).
 * Sans argument : création d'une nouvelle colonne. Avec editKey : édition en place de la
 * colonne existante, en conservant sa position et sa visibilité.
 * @param {string} [editKey] - Clé de la colonne perso à modifier
 */
function capOpenCustomColPanel(editKey){
  _capCustomColEditKey = editKey || null;
  _capPpState.cap = {type:null, id:null, q:'', auto:true}; // l'aperçu repart d'un exemple qui donne un résultat
  const existing = editKey ? capTableCustomCols.find(c=>c.key===editKey) : null;
  const nameInp=document.getElementById('cap-customcol-name');
  if (existing) {
    // Mode édition : pré-remplit les étapes et le nom depuis la colonne existante
    _capCustomColSteps = existing.steps.map(s=>({metaclass:s.metaclass, property:s.property}));
    if (nameInp) nameInp.value = existing.label;
  } else {
    _capCustomColSteps=[{metaclass:capGetMetachainMetaclasses()[0]||null, property:null}];
    if (nameInp) nameInp.value='';
  }
  const titleEl=document.getElementById('cap-customcol-title');
  if (titleEl) titleEl.textContent = existing ? `✨ Modifier « ${existing.label} »` : '✨ Colonne par chemin';
  const createBtn=document.getElementById('cap-customcol-create');
  if (createBtn) createBtn.textContent = existing ? 'Enregistrer les modifications' : 'Créer la colonne';
  capRenderCustomColPanel();
  document.getElementById('cap-customcol-overlay').style.display='block';
  const panel=document.getElementById('cap-customcol-panel');
  panel.style.display='block';
  requestAnimationFrame(()=>panel.classList.add('open'));
}
/** Ferme le panneau latéral d'édition de colonne Metachain de la vue Tableau.
 */
function capCloseCustomColPanel(){
  const panel=document.getElementById('cap-customcol-panel');
  panel.classList.remove('open');
  setTimeout(()=>{ panel.style.display='none'; document.getElementById('cap-customcol-overlay').style.display='none'; },250);
}
document.getElementById('cap-customcol-close')?.addEventListener('click',capCloseCustomColPanel);
document.getElementById('cap-customcol-overlay')?.addEventListener('click',capCloseCustomColPanel);
document.getElementById('cap-customcol-addstep')?.addEventListener('click',()=>{
  const last=_capCustomColSteps[_capCustomColSteps.length-1];
  if (!last || !last.property) return; // bouton désactivé visuellement dans ce cas
  _capCustomColSteps.push({metaclass:last.property.resultType, property:null});
  capRenderCustomColPanel();
});
document.getElementById('cap-customcol-create')?.addEventListener('click',()=>{
  if (!_capCustomColSteps.length || !_capCustomColSteps[0].metaclass) { alert('Choisissez au moins un type de départ et une relation ou une valeur.'); return; }
  if (_capCustomColSteps.some(s=>!s.property)) { alert('Chaque étape doit avoir une relation ou une valeur sélectionnée.'); return; }
  const nameInp=document.getElementById('cap-customcol-name');
  const stepsLabel=_capCustomColSteps.map(s=>s.property.label.replace(' →','').replace('← ','')).join(' → ');
  const label = nameInp.value.trim() || stepsLabel;
  const newSteps = _capCustomColSteps.map(s=>({metaclass:s.metaclass, property:s.property}));
  if (_capCustomColEditKey) {
    // Mode édition : met à jour la colonne existante en place (conserve sa position/visibilité)
    const existing = capTableCustomCols.find(c=>c.key===_capCustomColEditKey);
    if (existing) { existing.label = label; existing.steps = newSteps; }
  } else {
    const key='custom_'+Date.now();
    capTableCustomCols.push({key, label, steps:newSteps});
    if (!capTableVisibleCols) capTableVisibleCols=[...CAP_TABLE_BUILTIN_COLS];
    capTableVisibleCols.push(key);
  }
  capCloseCustomColPanel();
  capRenderTable();
});

/** Rend la vue Tableau paginé Capella, avec colonnes redimensionnables, sélectionnables
 * (attributs bruts XML + colonnes calculées + colonnes personnalisées combinées) et
 * filtrables individuellement (une ligne de filtres texte sous les en-têtes). */
/** Sérialise la configuration actuelle de la vue Tableau Capella (colonnes visibles, colonnes
 * personnalisées avec leurs metachains, filtres par colonne, largeurs) et déclenche un
 * téléchargement JSON. Les colonnes personnalisées sont sauvegardées intégralement (steps
 * de navigation Metaclass/Property), permettant de les recréer fidèlement au chargement. */
function capSaveTableView(){
  const data = {
    type: 'capella-table-view',
    version: 2,
    scope: capTableScope,
    name: (capTableTabs&&capTableTabs[capTableTabIdx]||{}).name,
    sort: capTableSort,
    visibleCols: capTableVisibleCols || CAP_TABLE_BUILTIN_COLS,
    customCols: capTableCustomCols,
    colFilters: capTableColFilters,
    colWidths: capTableColWidths,
    multiValDisplay: capTableMultiValDisplay,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'capella-table-view.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Charge une configuration de vue Tableau Capella précédemment sauvegardée et l'applique. */
function capLoadTableView(jsonText){
  let data;
  try { data = JSON.parse(jsonText); }
  catch(e) { alert('Fichier invalide : JSON illisible.'); return; }
  // Vue du tableau, ou vue de l'ancienne 📊 Table View (convertie) : appliquée à l'onglet affiché
  if (!capTableApplyViewFile(data)) { alert('Ce fichier ne semble pas être une vue de tableau valide.'); return; }
  capRenderTable();
}
document.getElementById('cap-table-view-input')?.addEventListener('change', ev=>{
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => capLoadTableView(e.target.result);
  reader.readAsText(file, 'UTF-8');
  ev.target.value = ''; // permet de recharger le même fichier plusieurs fois
});

/** Rend intégralement la vue Tableau Capella : barre d'outils (colonnes, colonne perso,
 * affichage, sauvegarde de vue), en-têtes collants, ligne de filtres et corps paginé.
 */
function capRenderTable(){
  capRenderTableTabs();
  capBuildTableToolbar();
  capRenderTableBodyOnly();
}

/** Reconstruit uniquement le <thead>/<tbody> du tableau Capella (pas la toolbar ni le menu
 * ⊞ Colonnes) — permet de rafraîchir l'affichage après un changement de colonnes visibles
 * sans fermer le menu déroulant qui reste ouvert au-dessus. */
function capRenderTableBodyOnly(){
  if (!capTableVisibleCols) capTableVisibleCols=[...CAP_TABLE_BUILTIN_COLS];
  capTableTabsEnsure(); capTableSyncToTab();   // l'onglet actif garde l'état affiché
  const cols = capTableVisibleCols;

  // Lignes filtrées (types, couche, recherche, filtres par colonne) puis triées (51-tableau.js)
  const filtered=capTableRows();

  const rc=document.getElementById('cap-result-count'); if(rc)rc.textContent=`${filtered.length} élément(s)`+(capTableScope.ids.length?` · 🎯 portée : ${capTableScopeLabel()}`:'');
  const total=filtered.length,start=capPage*capPageSize,end=Math.min(start+capPageSize,total),slice=filtered.slice(start,end);
  const table=document.getElementById('cap-table');
  const thead=document.getElementById('cap-table-head'); const tbody=document.getElementById('cap-table-body');
  if(!thead||!tbody) return;

  // En-têtes : clic = tri (▲ ▼ puis sans tri), glisser-déposer = ordre des colonnes, bord droit = largeur
  thead.innerHTML='';
  const hrow=document.createElement('tr');
  cols.forEach(colKey=>{
    const th=document.createElement('th');
    const label=capTableColLabel(colKey);
    const ico=capTableSort.col===colKey ? (capTableSort.dir===1?'▲':'▼') : '⇅';
    th.innerHTML=`<div class="th-inner"><span class="th-l">${capEsc(label)}</span><span class="th-sort${capTableSort.col===colKey?' on':''}">${ico}</span></div>`;
    th.title=`${label}${label!==colKey?' ('+colKey+')':''}\nClic : trier · glisser : déplacer la colonne · bord droit : largeur`;
    th.onclick=ev=>{ if(_capColResizing||ev.target.closest('.cap-col-resizer')) return; capTableSortCycle(colKey); };
    capTableColDnD(th, colKey, thead);
    hrow.appendChild(th);
    capApplyColResize(th, colKey, table);
  });
  thead.appendChild(hrow);

  // Ligne de filtres par colonne — son décalage sticky (top) est calculé dynamiquement à
  // partir de la hauteur RÉELLE de la ligne d'en-têtes (mesurée après insertion dans le DOM),
  // car la valeur fixe précédente (30px) ne correspondait pas toujours à la hauteur réelle
  // (padding + texte), ce qui désynchronisait les deux lignes sticky lors du défilement.
  const frow=document.createElement('tr'); frow.className='cap-filter-row';
  cols.forEach(colKey=>{
    const th=document.createElement('th');
    const inp=document.createElement('input');
    inp.type='text'; inp.placeholder='Filtrer…';
    inp.value=capTableColFilters[colKey]||'';
    inp.onclick=ev=>ev.stopPropagation();
    inp.oninput=()=>{ capTableColFilters[colKey]=inp.value; capPage=0; capRenderTableBodyOnly(); };
    th.appendChild(inp);
    frow.appendChild(th);
  });
  thead.appendChild(frow);
  // Mesure la hauteur réelle de hrow une fois rendue, puis l'applique comme offset sticky de frow
  requestAnimationFrame(()=>{
    const realHeight = hrow.getBoundingClientRect().height;
    if (realHeight > 0) {
      [...frow.children].forEach(th=>{ th.style.top = realHeight+'px'; });
    }
  });

  // Lignes de données
  tbody.innerHTML='';
  if (!slice.length) {
    // Onglet vide : un nouvel onglet n'a aucun type coché
    const tr=document.createElement('tr'), td=document.createElement('td');
    td.colSpan=cols.length; td.className='cap-table-empty';
    td.textContent = capEnabledTypes.size ? 'Aucun élément ne correspond aux filtres.' : 'Aucun type coché pour cet onglet : cochez des types d\'éléments dans le menu de gauche.';
    tr.appendChild(td); tbody.appendChild(tr);
  }
  slice.forEach(el=>{
    const lv=CAP_LAYERS[el.layer]||{color:'#8b949e'};
    const tr=document.createElement('tr');
    tr.style.cursor='pointer';
    tr.onclick=()=>capOpenDetail(el.id);
    cols.forEach(colKey=>{
      const td=document.createElement('td');
      const valArr=capTableGetValArray(el,colKey).filter(v=>v!=='');
      const val=valArr.join(', ');
      if (colKey==='layer') { td.innerHTML=`<span style="color:${lv.color};font-family:monospace;font-size:11px;font-weight:700;">${capEsc(val)}</span>`; }
      else if (colKey==='typeName') { td.innerHTML=`<span class="cap-type-badge" style="color:${lv.color};background:${lv.bg}">${capEsc(val)}</span>`; }
      else if (colKey==='id') { td.innerHTML=`<span style="font-family:monospace;font-size:10px;color:var(--c-dim);">${capEsc(val)}</span>`; }
      else if (capTableMultiValDisplay==='stacked' && valArr.length>1) {
        // Affichage empilé : une valeur par ligne, comme pour les colonnes de relation
        td.classList.add('cap-stacked-td');
        const cell=document.createElement('div'); cell.className='cap-rel-cell';
        valArr.forEach(v=>{ const item=document.createElement('div'); item.className='cap-rel-item'; item.textContent=v; cell.appendChild(item); });
        td.appendChild(cell);
      }
      else { td.textContent=val; }
      td.title=val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const pg=document.getElementById('cap-pagination'); if(pg) pg.style.display='flex';
  const pi=document.getElementById('cap-page-info'); if(pi)pi.textContent=`${start+1}–${end} sur ${total}`;
  const pb=document.getElementById('cap-btn-prev'); if(pb)pb.disabled=capPage===0;
  const nb=document.getElementById('cap-btn-next'); if(nb)nb.disabled=end>=total;
}

// ── Tree ──
/** Rend la vue Arborescence Capella (hiérarchie XML complète). */
function capRenderTree(){
  const container=document.getElementById('cap-view-tree'); if(!container) return;
  container.innerHTML='';
  if(!capTreeData) return;
  const filter=capTreeFilter.toLowerCase();
  capRenderTreeNode(capTreeData,container,0,filter);
}
/** Rend récursivement un nœud de l'arborescence Capella.
 * @param node Nœud capTreeData @param container Élément DOM parent
 * @param {number} depth Profondeur courante @param {string} filter Filtre texte
 */
function capRenderTreeNode(node,container,depth,filter){
  if(node.typeName!=='Project'&&!capEnabledTypes.has(node.typeName)){
    if(node.children)for(const c of node.children)capRenderTreeNode(c,container,depth,filter);
    return;
  }
  const lv=node.layer?CAP_LAYERS[node.layer]:null;
  const color=lv?lv.color:'#8b949e'; const bg=lv?lv.bg:'rgba(139,148,158,.1)';
  const name=node.name||'';
  const iconTxt=CAP_TYPE_ICON[node.typeName]||(node.typeName?node.typeName.slice(0,2).toLowerCase():'??');
  /** Indique si un nœud correspond au filtre de recherche (nom ou type), ou si l'un de
   * ses descendants correspond — utilisé pour conserver les branches pertinentes.
   * @param {object} n - Nœud à tester
   * @returns {boolean} Vrai si le nœud ou un descendant correspond
   */
  function anyMatch(n){if(!filter)return true;if((n.name||'').toLowerCase().includes(filter)||n.typeName.toLowerCase().includes(filter))return true;if(n.children)for(const c of n.children)if(anyMatch(c))return true;return false;}
  const matchSelf=!filter||(name.toLowerCase().includes(filter)||node.typeName.toLowerCase().includes(filter));
  if(!anyMatch(node)) return;
  const enabledCh=(node.children||[]).filter(c=>anyMatch(c));
  const hasCh=enabledCh.length>0;
  const nodeEl=document.createElement('div'); nodeEl.className='';
  const row=document.createElement('div'); row.className='cap-tree-row'+(matchSelf&&filter?' cap-hl':'');
  row.style.paddingLeft=(depth*16+4)+'px';
  const tog=document.createElement('span'); tog.className='cap-tree-tog'+(hasCh?'':' leaf'); tog.textContent=hasCh?'▶':'';
  const icon=document.createElement('span'); icon.className='cap-tree-icon'; icon.style.cssText=`background:${bg};color:${color};`; icon.textContent=iconTxt;
  const label=document.createElement('span'); label.className='cap-tree-label'+(name?'':' unnamed'); label.textContent=name||'—'; label.title=name;
  row.appendChild(tog); row.appendChild(icon); row.appendChild(label);
  if(hasCh){const cnt=document.createElement('span');cnt.className='cap-tree-cnt';cnt.textContent=enabledCh.length;row.appendChild(cnt);}
  if(node.typeName&&node.typeName!=='Project'){const chip=document.createElement('span');chip.className='cap-tree-chip';chip.style.cssText=`color:${color};background:${bg};`;chip.textContent=node.typeName;row.appendChild(chip);}
  nodeEl.appendChild(row);
  let childEl=null;
  if(hasCh){
    childEl=document.createElement('div'); childEl.className='cap-tree-children'+(filter?' open':'');
    for(const c of node.children)capRenderTreeNode(c,childEl,depth+1,filter);
    nodeEl.appendChild(childEl);
    tog.addEventListener('click',e=>{e.stopPropagation();const o=childEl.classList.toggle('open');tog.classList.toggle('open',o);});
    row.addEventListener('click',()=>{const o=childEl.classList.toggle('open');tog.classList.toggle('open',o);capOpenDetailNode(node);});
    if(!filter&&depth<2){childEl.classList.add('open');tog.classList.add('open');}
  } else row.addEventListener('click',()=>capOpenDetailNode(node));
  container.appendChild(nodeEl);
}