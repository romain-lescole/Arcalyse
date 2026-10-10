/* ═══════════════════════════════════════════════════════════════════════
   17c. TABLE VIEW — Système d'onglets (chaque onglet a son état complet)
   ═══════════════════════════════════════════════════════════════════════ */

/** Construit un objet d'état vierge pour un nouvel onglet de Table View. */
function tvNewTabState(name) {
  return {
    id: 'tvtab-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
    name: name || 'Vue 1',
    sort: {col:null, dir:1},
    filters: {},
    hiddenCols: new Set(),
    visibleRels: new Set(),
    capTypeFilter: new Set(), // Set des types Capella cochés ; vide par défaut = tout décoché
    capTypeSearch: '',
    colOrder: null,        // ordre des colonnes attributs (null = défaut)
    relColOrder: null,     // ordre des colonnes relation (null = défaut)
    relItemOrder: {},      // { "elId|relType": [relId,...] } ordre des items dans les cellules
    colWidths: {},         // { colName: largeurPx }
  };
}

/** Liste des onglets de Table View. Toujours au moins un. */
let tvTabs = [tvNewTabState('Vue 1')];
/** Index de l'onglet actif dans tvTabs. */
let tvActiveTabIdx = 0;
/** Retourne l'objet d'état de l'onglet actuellement actif. */
function tvActiveTab() { return tvTabs[tvActiveTabIdx] || (tvTabs[0]=tvNewTabState('Vue 1')); }

// Variables d'état "actives" — copies de travail de l'onglet courant.
// Au changement d'onglet, tvSyncFromActiveTab() les recharge depuis tvTabs[tvActiveTabIdx],
// et tvSyncToActiveTab() les sauvegarde dans l'onglet avant de basculer.
// Cette approche (copie explicite) est utilisée plutôt que des accessors car le script
// s'exécute en mode strict top-level : les `let` ne sont pas des propriétés de `window`,
// donc Object.defineProperty(window, ...) ne serait pas lu par le reste du code.
let tvSort = {col:null, dir:1};
let _tvCapRowsCache = null; // cache des lignes virtuelles (tous les éléments Capella) pour Table View
let tvFilters = {};
let tvHiddenCols = new Set();
let tvVisibleRels = new Set();
let tvCapTypeFilter = new Set(); // Set des types cochés ; vide = tout décoché par défaut
let tvCapTypGrpCollapsed = new Set(); // couches ARCADIA repliées dans le picker "🔷 Type d'élément" (Table View)
let tvCapTypeSearch = '';
let tvColOrder = null;
let _tvColPickerOpen = false;   // le menu ⊞ Colonnes (Table View) reste-t-il ouvert entre deux rendus ?
let _tvRawAttrSeen = new Set(); // attributs XML bruts déjà rencontrés une fois (pour ne les masquer auto qu'à leur 1ère apparition)
let tvRelColOrder = null;
let tvRelItemOrder = {};
let tvColWidths = {};

/** Recharge les variables d'état actives depuis l'onglet actif (tvTabs[tvActiveTabIdx]). */
function tvSyncFromActiveTab() {
  const t = tvActiveTab();
  tvSort = t.sort; tvFilters = t.filters; tvHiddenCols = t.hiddenCols; tvVisibleRels = t.visibleRels;
  tvCapTypeFilter = t.capTypeFilter; tvCapTypeSearch = t.capTypeSearch;
  tvColOrder = t.colOrder; tvRelColOrder = t.relColOrder; tvRelItemOrder = t.relItemOrder; tvColWidths = t.colWidths;
}
/** Sauvegarde les variables d'état actives dans l'onglet actif (tvTabs[tvActiveTabIdx]). */
function tvSyncToActiveTab() {
  const t = tvActiveTab();
  t.sort = tvSort; t.filters = tvFilters; t.hiddenCols = tvHiddenCols; t.visibleRels = tvVisibleRels;
  t.capTypeFilter = tvCapTypeFilter; t.capTypeSearch = tvCapTypeSearch;
  t.colOrder = tvColOrder; t.relColOrder = tvRelColOrder; t.relItemOrder = tvRelItemOrder; t.colWidths = tvColWidths;
}
tvSyncFromActiveTab(); // initialisation : aligne les variables sur l'onglet 1 créé ci-dessus

let _tvDragCol = null, _tvDragIsRel = false;

// Package et Parent sont fusionnés : "Parent" affiche le conteneur (package ou élément parent)
const TV_BUILTIN = ['Name','ID','Type','Human Type','Parent','Owned element'];

/** Cherche un élément par id dans MODEL.elements, ou dans le cache de lignes virtuelles
 * Capella (_tvCapRowsCache) quand Table View affiche tous les éléments du fichier XML. */
function tvFindElementById(id) {
  return MODEL.elements.find(e=>e.id===id) || (_tvCapRowsCache||[]).find(e=>e.id===id);
}
/** Cherche tous les enfants directs (parentEl===id) dans MODEL.elements et/ou le cache virtuel. */
function tvFindChildrenOf(id) {
  const fromModel = MODEL.elements.filter(e=>e.parentEl===id);
  const fromCache = (_tvCapRowsCache||[]).filter(e=>e.parentEl===id);
  // Dédoublonne par id (un même élément peut apparaître dans les deux listes)
  const seen=new Set(); const out=[];
  [...fromModel, ...fromCache].forEach(e=>{ if(!seen.has(e.id)){ seen.add(e.id); out.push(e); } });
  return out;
}

/** Retourne TOUJOURS un tableau de valeurs pour une colonne donnée — permet de choisir
 * l'affichage (en ligne ou empilé) au moment du rendu, comme dans cap-table. */
function tvGetValArray(el, col) {
  if (col==='Name')   return [el.name||''];
  if (col==='ID')     return [el.id||''];
  if (col==='Type')   return [el.type||''];
  if (col==='Human Type') return [(CAP_HUMAN_NAMES[el.type]||{}).h || ''];
  if (col==='Owned element') {
    const kids=tvFindChildrenOf(el.id);
    return kids.length ? kids.map(k=>k.name) : [''];
  }
  if (col==='Parent') {
    if (el.parentEl) { const p=tvFindElementById(el.parentEl); return [p ? p.name : el.parentEl]; }
    if (el.type==='Package') return ['racine'];
    return [el.pkg||''];
  }
  // Colonne personnalisée Metachain
  const custom = tvCustomCols.find(c=>c.key===col);
  if (custom) {
    const results = tvResolveMetachain(el, custom.steps);
    if (!results.length) return [''];
    return results.map(r=> (typeof r==='string') ? r : r.name);
  }
  // Attribut personnalisé créé par l'utilisateur (texte libre)
  if (el.attributes && col in el.attributes) return [el.attributes[col]||''];
  // Attribut XML brut Capella (kind, nature, direction, etc.) — retrouvé via capAllElements,
  // en faisant correspondre l'élément Table View à l'élément Capella source par son ID.
  if (capLoaded && el._capella) {
    const capEl = capAllElements.find(c=>c.id===el.id);
    if (capEl && capEl.attrs && col in capEl.attrs) return [capEl.attrs[col]||''];
  }
  return [(el.attributes||{})[col]||''];
}

/** Retourne la valeur d'affichage d'une cellule sous forme de chaîne unique :
 * agrège les valeurs multiples de tvGetValArray en les joignant par des virgules.
 * @param {object} el - Élément (ligne) du tableau
 * @param {string} col - Clé de la colonne
 * @returns {string} Valeurs non vides jointes par ', '
 */
function tvGetVal(el, col) {
  return tvGetValArray(el, col).filter(v=>v!=='').join(', ');
}

/** Écrit une valeur dans une cellule éditable de Table View. Les colonnes dérivées
 * (ID, Human Type, Owned element, colonnes Metachain) sont en lecture seule et ignorées.
 * @param {object} el - Élément à modifier
 * @param {string} col - Clé de la colonne
 * @param {string} val - Nouvelle valeur saisie
 */
function tvSetVal(el, col, val) {
  if (col==='Name') { el.name=val; return; }
  if (col==='Type') { el.type=val; return; }
  if (col==='ID')   return;
  if (col==='Human Type')     return; // lecture seule — dérivé du Type
  if (col==='Owned element')  return; // lecture seule — dérivé des relations Containment
  if (tvCustomCols.some(c=>c.key===col)) return; // lecture seule — dérivé du Metachain
  if (col==='Parent') {
    if (val==='racine') {
      // Détacher complètement (package racine ou élément sans parent)
      MODEL.relations=MODEL.relations.filter(r=>!(r.tgt===el.id&&r.type==='Containment'));
      delete el.parentEl; el.pkg='';
      return;
    }
    // val = 'el:<id>'
    MODEL.relations=MODEL.relations.filter(r=>!(r.tgt===el.id&&r.type==='Containment'));
    delete el.parentEl;
    const [kind,ref]=val.split(':');
    if (kind==='el') {
      const pe=MODEL.elements.find(e=>e.id===ref);
      if (pe) {
        el.parentEl=pe.id;
        /** Remonte la hiérarchie pour retrouver le nom du package conteneur d'un élément.
         */
        function findPkg(id){ const x=MODEL.elements.find(e=>e.id===id); if(!x) return ''; if(x.type==='Package') return x.name; return x.pkg||findPkg(x.parentEl); }
        el.pkg=findPkg(pe.id)||pe.pkg;
        if(pe.type!=='Package')
          MODEL.relations.push({id:'rel'+Date.now(),src:pe.id,tgt:el.id,type:'Containment',name:'contains'});
      }
    }
    return;
  }
  if (!el.attributes) el.attributes={};
  el.attributes[col]=val;
}

/** Rend une cellule du tableau éditable en place : passage en champ de saisie au
 * double-clic, validation à la sortie du champ ou sur Entrée, annulation sur Échap.
 * @param {HTMLElement} td - Cellule à rendre éditable
 * @param {object} el - Élément correspondant à la ligne
 * @param {string} col - Clé de la colonne
 */
function tvMakeCellEditable(td, el, col) {
  if (col==='ID') return;
  td.classList.add('editing');
  let input, getVal;
  if (col==='Type') {
    input=document.createElement('select');
    Object.keys(TCFG).forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; if(t===el.type) o.selected=true; input.appendChild(o); });
    getVal=()=>input.value;
  } else if (col==='Parent') {
    input=document.createElement('select');
    // Option racine (pour packages sans parent)
    const oRoot=document.createElement('option'); oRoot.value='racine'; oRoot.textContent='— racine';
    if (!el.parentEl && el.type==='Package') oRoot.selected=true;
    input.appendChild(oRoot);
    // Groupe packages (éléments de type Package)
    const pkgEls=MODEL.elements.filter(e=>e.type==='Package'&&e.id!==el.id);
    if (pkgEls.length) {
      const gp=document.createElement('optgroup'); gp.label='📂 Packages';
      pkgEls.forEach(pe=>{ const o=document.createElement('option'); o.value='el:'+pe.id; o.textContent='📂 '+pe.name; if(el.parentEl===pe.id) o.selected=true; gp.appendChild(o); });
      input.appendChild(gp);
    }
    // Groupe éléments non-Package
    const nonPkgEls=MODEL.elements.filter(e=>e.type!=='Package'&&e.id!==el.id);
    if (nonPkgEls.length) {
      const ge=document.createElement('optgroup'); ge.label='Éléments';
      nonPkgEls.forEach(e=>{ const o=document.createElement('option'); o.value='el:'+e.id; o.textContent=typeIcon(e.type)+' '+e.name; if(el.parentEl===e.id) o.selected=true; ge.appendChild(o); });
      input.appendChild(ge);
    }
    getVal=()=>input.value;
  } else {
    input=document.createElement('input'); input.type='text'; input.value=tvGetVal(el,col);
    getVal=()=>input.value;
  }
  td.innerHTML=''; td.appendChild(input); input.focus();
  if (input.tagName==='INPUT') input.select();
  const commit=()=>{ tvSetVal(el,col,getVal()); buildTableView(); buildArbo(); };
  input.onblur=commit;
  input.onkeydown=ev=>{ if(ev.key==='Enter') input.blur(); if(ev.key==='Escape') buildTableView(); };
}

/** Construit la vue Tableau : génère le header, les filtres et toutes les lignes d'éléments.
 * Gère le tri, les filtres textuels, le réordonnement des colonnes et l'édition inline.
 */
/** Construit la barre d'onglets de Table View : un onglet = une vue indépendante complète
 * (colonnes visibles, filtres, tri, largeurs). Permet d'ajouter, renommer, dupliquer
 * et fermer des onglets. Toujours au moins un onglet présent.
 */
function buildTvTabBar() {
  const bar = document.getElementById('tv-tabbar');
  if (!bar) return;
  bar.innerHTML = '';
  tvTabs.forEach((tab, idx) => {
    const el = document.createElement('div');
    el.className = 'tv-tab' + (idx===tvActiveTabIdx ? ' active' : '');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = tab.name;
    nameSpan.ondblclick = ev => {
      ev.stopPropagation();
      const inp = document.createElement('input');
      inp.className = 'tv-tab-rename'; inp.value = tab.name;
      nameSpan.replaceWith(inp); inp.focus(); inp.select();
      const commit = () => { tab.name = inp.value.trim() || tab.name; buildTvTabBar(); };
      inp.onblur = commit;
      inp.onkeydown = e => { if (e.key==='Enter') commit(); if (e.key==='Escape') buildTvTabBar(); };
    };
    el.appendChild(nameSpan);
    if (tvTabs.length > 1) {
      const closeBtn = document.createElement('span');
      closeBtn.className = 'tv-tab-close'; closeBtn.textContent = '✕';
      closeBtn.title = 'Fermer cet onglet';
      closeBtn.onclick = ev => {
        ev.stopPropagation();
        if (!confirm(`Fermer l'onglet "${tab.name}" ?`)) return;
        tvTabs.splice(idx, 1);
        if (tvActiveTabIdx >= tvTabs.length) tvActiveTabIdx = tvTabs.length - 1;
        tvSyncFromActiveTab(); buildTableView();
      };
      el.appendChild(closeBtn);
    }
    el.onclick = () => {
      if (idx === tvActiveTabIdx) return;
      tvSyncToActiveTab();      // sauvegarde l'onglet qu'on quitte
      tvActiveTabIdx = idx;
      tvSyncFromActiveTab();    // charge l'onglet qu'on rejoint
      buildTableView();
    };
    bar.appendChild(el);
  });
  // Bouton "+" pour ajouter un nouvel onglet (copie l'onglet actif comme point de départ)
  const addBtn = document.createElement('span');
  addBtn.className = 'tv-tab-add'; addBtn.textContent = '+';
  addBtn.title = 'Nouvel onglet (copie de la vue actuelle)';
  addBtn.onclick = () => {
    tvSyncToActiveTab();
    const current = tvActiveTab();
    const clone = tvNewTabState('Vue ' + (tvTabs.length + 1));
    // Duplique les réglages de la vue active comme point de départ pratique
    clone.hiddenCols = new Set(current.hiddenCols);
    clone.visibleRels = new Set(current.visibleRels);
    clone.colOrder = current.colOrder ? [...current.colOrder] : null;
    clone.relColOrder = current.relColOrder ? [...current.relColOrder] : null;
    clone.colWidths = {...current.colWidths};
    tvTabs.push(clone);
    tvActiveTabIdx = tvTabs.length - 1;
    tvSyncFromActiveTab(); buildTableView();
  };
  bar.appendChild(addBtn);
}

/* ═══════════════════════════════════════════════════════════════════════
   TABLE VIEW — Moteur Metachain Navigation (équivalent du moteur Capella,
   mais opérant sur MODEL.elements / MODEL.relations au lieu de
   capAllElements / capLinksData). Permet de créer des colonnes personnalisées
   par navigation Metaclass/Property multi-étapes, exactement comme dans la
   vue Tableau de Capella Data.
   ═══════════════════════════════════════════════════════════════════════ */
let tvCustomCols = [];        // [{key, label, steps:[{metaclass, property}]}]
let tvMultiValDisplay = 'inline'; // 'inline' | 'stacked'

/** Liste des Metaclass (types) disponibles : tous les types réellement présents dans MODEL. */
/** Jeu de travail COMPLET pour le moteur Metachain TV : éléments natifs + toutes les lignes
 * Capella virtuelles (_tvCapRowsCache, quand un fichier est chargé) — pas seulement le
 * sous-ensemble "lié" injecté dans l'arborescence (MODEL.elements). Sans ça, le panneau
 * Metachain ne verrait qu'une fraction des types et des données du fichier XML. */
function tvAllRows(){
  if (typeof capLoaded!=='undefined' && capLoaded && _tvCapRowsCache && _tvCapRowsCache.length){
    return MODEL.elements.filter(e=>!e._capella).concat(_tvCapRowsCache);
  }
  return MODEL.elements;
}
/** Attributs exploitables d'une ligne TV : attributs XML bruts Capella (via _capRaw ou
 * capAllElements) fusionnés avec les attributs personnalisés (qui priment en cas de clash). */
function tvRowAttrs(el){
  let raw=null;
  if (el._capRaw) raw=el._capRaw.attrs;
  else if (el._capella && typeof capLoaded!=='undefined' && capLoaded){
    const cap=capAllElements.find(c=>c.id===el.id); if(cap) raw=cap.attrs;
  }
  return Object.assign({}, raw||{}, el.attributes||{});
}
/** Liste tous les Metaclass disponibles pour le moteur Metachain de Table View,
 * calculés sur le jeu complet de lignes (natifs + toutes les lignes Capella).
 * @returns {string[]} Types d'éléments triés alphabétiquement
 */
function tvGetMetachainMetaclasses(){
  return [...new Set(tvAllRows().map(e=>e.type))].sort();
}
/** Détecte les attributs de MODEL.elements[].attributes qui référencent d'autres éléments
 * par leur ID (rare dans le modèle générique, mais supporté si présent). */
function tvGetAttrRefProperties(metaclass){
  const samples=tvAllRows().filter(e=>e.type===metaclass).slice(0,30);
  if (!samples.length) return [];
  const attrKeys=new Set();
  samples.forEach(e=>Object.keys(tvRowAttrs(e)).forEach(k=>{ if(k!=='name') attrKeys.add(k); }));
  const props=[];
  attrKeys.forEach(attrKey=>{
    const resultTypes=new Set(); let anyResolved=false;
    samples.forEach(e=>{
      const raw=tvRowAttrs(e)[attrKey]; if(!raw) return;
      String(raw).trim().split(/\s+/).forEach(refId=>{
        const t=tvFindElementById(refId.replace(/^#/,''));
        if (t) { anyResolved=true; resultTypes.add(t.type); }
      });
    });
    if (!anyResolved) return;
    resultTypes.forEach(rt=>props.push({key:'attr:'+attrKey+':'+rt, label:`${attrKey} → ${rt}`, kind:'attr', attrKey, resultType:rt}));
  });
  return props;
}
/** Version TV de la détection des références ENTRANTES : trouve les types dont un attribut
 * (personnalisé OU attribut XML brut Capella via capAllElements) référence des éléments du
 * metaclass donné. Ex: ComponentExchange.source → ComponentPort. Le type TV de l'élément
 * référençant est résolu via tvFindElementById (gère les suffixes (NODE)/(BEHAVIOR)). */
function tvGetIncomingRefProperties(metaclass){
  const props=[]; const seen=new Set();
  const all=tvAllRows();
  const targetIds=new Set(all.filter(e=>e.type===metaclass).map(e=>e.id));
  if (!targetIds.size) return props;
  all.forEach(e=>{
    if (e.type===metaclass) return;
    Object.entries(tvRowAttrs(e)).forEach(([k,v])=>{
      if (k==='name') return;
      const refIds=String(v||'').trim().split(/\s+/).map(s=>s.replace(/^#/,''));
      if (!refIds.some(r=>targetIds.has(r))) return;
      const key='incoming:'+e.type+':'+k;
      if (seen.has(key)) return; seen.add(key);
      props.push({key, label:`← ${e.type}.${k}`, kind:'incoming',
        fromType:e.type, fromAttrKey:k, resultType:e.type});
    });
  });
  return props;
}
/** Properties disponibles pour un Metaclass : valeurs terminales, Owner typé, Owned element
 * typé, et relations RCFG où ce type apparaît comme src ou tgt. */
function tvGetMetachainProperties(metaclass){
  const props=[];
  props.push({key:'value:name', label:'Name', kind:'value', valueKind:'name', isTerminal:true});
  props.push({key:'value:id', label:'ID', kind:'value', valueKind:'id', isTerminal:true});
  props.push({key:'value:type', label:'Type', kind:'value', valueKind:'type', isTerminal:true});
  const literalAttrKeys=new Set();
  const refKeys=new Set(tvGetAttrRefProperties(metaclass).map(p=>p.attrKey));
  tvAllRows().filter(e=>e.type===metaclass).forEach(e=>{
    Object.keys(tvRowAttrs(e)).forEach(k=>{ if(k!=='name' && !refKeys.has(k)) literalAttrKeys.add(k); });
  });
  [...literalAttrKeys].sort().forEach(k=>props.push({key:'value:attr:'+k, label:`Attribut « ${k} »`, kind:'value', valueKind:'attr', attrKey:k, isTerminal:true}));

  // Owner typé — remonte la chaîne parentEl/pkg jusqu'au premier ancêtre d'un type donné
  const ancestorTypesSeen=new Set();
  tvAllRows().filter(e=>e.type===metaclass).forEach(e=>{
    let cur=tvFindElementById(e.parentEl); let depth=0;
    while (cur && depth<30) { ancestorTypesSeen.add(cur.type); cur=tvFindElementById(cur.parentEl); depth++; }
  });
  [...ancestorTypesSeen].sort().forEach(ot=>props.push({key:'owner:'+ot, label:`Owner [${ot}]`, kind:'owner', ownerType:ot, resultType:ot}));

  // Owned element typé — enfants directs sous-typés
  const childTypesSeen=new Set();
  tvAllRows().filter(e=>e.type===metaclass).forEach(e=>{
    tvFindChildrenOf(e.id).forEach(c=>childTypesSeen.add(c.type));
  });
  [...childTypesSeen].sort().forEach(ct=>props.push({key:'owned:'+ct, label:`Owned element [${ct}]`, kind:'owned', resultType:ct, childFilterType:ct}));

  // Relations RCFG où ce metaclass apparaît comme endpoint
  Object.keys(RCFG).forEach(relType=>{
    const rows=MODEL.relations.filter(r=>r.type===relType); if(!rows.length) return;
    const fwdRows=rows.filter(r=>{ const e=tvFindElementById(r.src); return e&&e.type===metaclass; });
    if (fwdRows.length) {
      const tgtTypes=[...new Set(fwdRows.map(r=>{ const e=tvFindElementById(r.tgt); return e?e.type:null; }).filter(Boolean))];
      tgtTypes.forEach(tt=>props.push({key:'rel:'+relType+':fwd:'+tt, label:`${(RCFG[relType]||{}).label||relType} →`, kind:'rel', relType, direction:'fwd', resultType:tt}));
    }
    const revRows=rows.filter(r=>{ const e=tvFindElementById(r.tgt); return e&&e.type===metaclass; });
    if (revRows.length) {
      const srcTypes=[...new Set(revRows.map(r=>{ const e=tvFindElementById(r.src); return e?e.type:null; }).filter(Boolean))];
      srcTypes.forEach(st=>props.push({key:'rel:'+relType+':rev:'+st, label:`← ${(RCFG[relType]||{}).label||relType}`, kind:'rel', relType, direction:'rev', resultType:st}));
    }
  });

  tvGetAttrRefProperties(metaclass).forEach(p=>props.push(p));
  tvGetIncomingRefProperties(metaclass).forEach(p=>props.push(p));
  return props;
}
/** Exécute un pas de navigation à partir d'un élément MODEL.elements. */
function tvResolveStep(el, prop){
  if (prop.kind==='owned') {
    const kids=tvFindChildrenOf(el.id);
    return prop.childFilterType ? kids.filter(k=>k.type===prop.childFilterType) : kids;
  }
  if (prop.kind==='rel') {
    const out=[];
    MODEL.relations.filter(r=>r.type===prop.relType).forEach(r=>{
      if (prop.direction==='fwd' && r.src===el.id) { const t=tvFindElementById(r.tgt); if(t) out.push(t); }
      else if (prop.direction==='rev' && r.tgt===el.id) { const s=tvFindElementById(r.src); if(s) out.push(s); }
    });
    return out;
  }
  if (prop.kind==='attr') {
    const raw=tvRowAttrs(el)[prop.attrKey]; if(!raw) return [];
    const out=[];
    String(raw).trim().split(/\s+/).forEach(refId=>{
      const t=tvFindElementById(refId.replace(/^#/,''));
      if (t && t.type===prop.resultType) out.push(t);
    });
    return out;
  }
  if (prop.kind==='incoming') {
    // Référence entrante : éléments de fromType dont l'attribut fromAttrKey référence el.id
    // (attributs personnalisés + attributs XML bruts, sur le jeu complet de lignes).
    const out=[];
    tvAllRows().forEach(cand=>{
      if (cand.type!==prop.fromType) return;
      const raw=tvRowAttrs(cand)[prop.fromAttrKey];
      if (raw && String(raw).trim().split(/\s+/).map(s=>s.replace(/^#/,'')).includes(el.id)) out.push(cand);
    });
    return out;
  }
  if (prop.kind==='owner') {
    let cur=tvFindElementById(el.parentEl); let depth=0;
    while (cur && depth<30) { if (cur.type===prop.ownerType) return [cur]; cur=tvFindElementById(cur.parentEl); depth++; }
    return [];
  }
  return [];
}
/** Extrait une valeur terminale simple d'un élément MODEL.elements. */
function tvExtractValue(el, prop){
  if (prop.valueKind==='name') return el.name||'';
  if (prop.valueKind==='id')   return el.id||'';
  if (prop.valueKind==='type') return el.type||'';
  if (prop.valueKind==='attr') return tvRowAttrs(el)[prop.attrKey]||'';
  return '';
}
/** Exécute une chaîne de Properties (metachain) à partir d'un élément MODEL.elements. */
function tvResolveMetachain(el, steps){
  if (!steps.length) return [];
  if (steps[0].metaclass && el.type!==steps[0].metaclass) return [];
  let current=[el];
  const lastStep=steps[steps.length-1];
  const navSteps=steps.filter((s,i)=> !(i===steps.length-1 && s.property && s.property.isTerminal));
  navSteps.forEach(step=>{
    if (!step.property) { current=[]; return; }
    const next=[];
    current.forEach(c=>{ tvResolveStep(c, step.property).forEach(r=>{ if(!next.includes(r)) next.push(r); }); });
    current=next;
  });
  if (lastStep && lastStep.property && lastStep.property.isTerminal) {
    return current.map(c=>tvExtractValue(c, lastStep.property)).filter(v=>v!=='');
  }
  return current;
}

/* ═══════════════════════════════════════════════════════════════════════
   TABLE VIEW — Panneau latéral : constructeur de colonne personnalisée
   "Metachain Navigation" (même modèle Metaclass/Property que cap-table).
   ═══════════════════════════════════════════════════════════════════════ */
let _tvCustomColSteps = [];
let _tvCustomColEditKey = null;

/** Rend une étape (ligne) de l'éditeur de colonne Metachain : sélecteur de Metaclass,
 * sélecteur de Property et bouton de suppression de l'étape.
 * @param {number} idx - Index de l'étape dans _tvCustomColSteps
 */
function tvRenderCustomColStepRow(idx){
  const row=document.createElement('div'); row.className='cap-step-row'; row.style.alignItems='flex-start';
  const num=document.createElement('div'); num.className='cap-step-num'; num.style.marginTop='5px'; num.textContent=idx+1;
  const step=_tvCustomColSteps[idx];

  let metaclassEl;
  if (idx===0) {
    metaclassEl=document.createElement('select');
    tvGetMetachainMetaclasses().forEach(mc=>{
      const o=document.createElement('option'); o.value=mc; o.textContent=mc;
      if (step.metaclass===mc) o.selected=true;
      metaclassEl.appendChild(o);
    });
    metaclassEl.onchange=()=>{
      step.metaclass=metaclassEl.value; step.property=null;
      _tvCustomColSteps=_tvCustomColSteps.slice(0,idx+1);
      tvRenderCustomColPanel();
    };
  } else {
    metaclassEl=document.createElement('div');
    metaclassEl.style.cssText='flex:1;font-size:11px;padding:4px 6px;color:var(--c-dim);font-style:italic;';
    metaclassEl.textContent = step.metaclass || '—';
  }

  const propEl=document.createElement('select');
  if (!step.metaclass) {
    propEl.disabled=true; propEl.innerHTML='<option>—</option>';
  } else {
    const props=tvGetMetachainProperties(step.metaclass);
    if (!props.length) {
      propEl.disabled=true; propEl.innerHTML='<option>(aucune relation disponible)</option>';
    } else {
      propEl.innerHTML=props.map(p=>`<option value="${capEsc(p.key)}">${capEsc(p.label)}</option>`).join('');
      if (step.property) { const cur=props.find(p=>p.key===step.property.key); if (cur) propEl.value=cur.key; }
      propEl.onchange=()=>{
        const chosen=props.find(p=>p.key===propEl.value);
        step.property=chosen;
        _tvCustomColSteps=_tvCustomColSteps.slice(0,idx+1);
        tvRenderCustomColPanel();
      };
      if (!step.property) step.property=props[0];
    }
  }

  const del=document.createElement('span'); del.className='cap-step-del'; del.textContent='✕'; del.title='Supprimer cette étape et les suivantes';
  del.style.marginTop='5px';
  del.onclick=()=>{ _tvCustomColSteps=_tvCustomColSteps.slice(0,idx); if(!_tvCustomColSteps.length) _tvCustomColSteps.push({metaclass:null,property:null}); tvRenderCustomColPanel(); };

  row.appendChild(num); row.appendChild(metaclassEl); row.appendChild(propEl); row.appendChild(del);
  return row;
}
/** Rend l'intégralité du panneau latéral d'édition d'une colonne Metachain
 * (titre, étapes, bouton d'ajout, bouton de validation).
 */
function tvRenderCustomColPanel(){
  for (let i=1;i<_tvCustomColSteps.length;i++){
    const prev=_tvCustomColSteps[i-1];
    _tvCustomColSteps[i].metaclass = prev.property ? prev.property.resultType : null;
  }
  const stepsWrap=document.getElementById('tv-customcol-steps'); if(!stepsWrap) return;
  stepsWrap.innerHTML='';
  _tvCustomColSteps.forEach((_,idx)=>stepsWrap.appendChild(tvRenderCustomColStepRow(idx)));
  const addBtn=document.getElementById('tv-customcol-addstep');
  if (addBtn) {
    const last=_tvCustomColSteps[_tvCustomColSteps.length-1];
    const canAdd = last && last.property && last.property.resultType;
    addBtn.style.opacity = canAdd ? '1' : '.4';
    addBtn.style.pointerEvents = canAdd ? '' : 'none';
  }
  capPpRender('tv', _tvCustomColSteps);
}
/** Ouvre le panneau latéral de création/édition d'une colonne Metachain.
 * Sans argument : création d'une nouvelle colonne. Avec editKey : édition en place.
 * @param {string} [editKey] - Clé de la colonne perso à modifier
 */
function tvOpenCustomColPanel(editKey){
  _tvCustomColEditKey = editKey || null;
  _capPpState.tv = {type:null, id:null, q:'', auto:true}; // l'aperçu repart d'un exemple qui donne un résultat
  const existing = editKey ? tvCustomCols.find(c=>c.key===editKey) : null;
  const nameInp=document.getElementById('tv-customcol-name');
  if (existing) {
    _tvCustomColSteps = existing.steps.map(s=>({metaclass:s.metaclass, property:s.property}));
    if (nameInp) nameInp.value = existing.label;
  } else {
    _tvCustomColSteps=[{metaclass:tvGetMetachainMetaclasses()[0]||null, property:null}];
    if (nameInp) nameInp.value='';
  }
  const titleEl=document.getElementById('tv-customcol-title');
  if (titleEl) titleEl.textContent = existing ? `✨ Modifier « ${existing.label} »` : '✨ Colonne par chemin';
  const createBtn=document.getElementById('tv-customcol-create');
  if (createBtn) createBtn.textContent = existing ? 'Enregistrer les modifications' : 'Créer la colonne';
  tvRenderCustomColPanel();
  document.getElementById('tv-customcol-overlay').style.display='block';
  const panel=document.getElementById('tv-customcol-panel');
  panel.style.display='block';
  requestAnimationFrame(()=>panel.classList.add('open'));
}
/** Ferme le panneau latéral d'édition de colonne Metachain et réinitialise son état.
 */
function tvCloseCustomColPanel(){
  const panel=document.getElementById('tv-customcol-panel');
  panel.classList.remove('open');
  setTimeout(()=>{ panel.style.display='none'; document.getElementById('tv-customcol-overlay').style.display='none'; },250);
}
document.getElementById('tv-customcol-close')?.addEventListener('click',tvCloseCustomColPanel);
document.getElementById('tv-customcol-overlay')?.addEventListener('click',tvCloseCustomColPanel);
document.getElementById('tv-customcol-addstep')?.addEventListener('click',()=>{
  const last=_tvCustomColSteps[_tvCustomColSteps.length-1];
  if (!last || !last.property) return;
  _tvCustomColSteps.push({metaclass:last.property.resultType, property:null});
  tvRenderCustomColPanel();
});
document.getElementById('tv-customcol-create')?.addEventListener('click',()=>{
  if (!_tvCustomColSteps.length || !_tvCustomColSteps[0].metaclass) { alert('Choisissez au moins un type de départ et une relation ou une valeur.'); return; }
  if (_tvCustomColSteps.some(s=>!s.property)) { alert('Chaque étape doit avoir une relation ou une valeur sélectionnée.'); return; }
  const nameInp=document.getElementById('tv-customcol-name');
  const stepsLabel=_tvCustomColSteps.map(s=>s.property.label.replace(' →','').replace('← ','')).join(' → ');
  const label = nameInp.value.trim() || stepsLabel;
  const newSteps = _tvCustomColSteps.map(s=>({metaclass:s.metaclass, property:s.property}));
  if (_tvCustomColEditKey) {
    const existing = tvCustomCols.find(c=>c.key===_tvCustomColEditKey);
    if (existing) { existing.label = label; existing.steps = newSteps; }
  } else {
    const key='tvcustom_'+Date.now();
    tvCustomCols.push({key, label, steps:newSteps});
    if (!tvColOrder.includes(key)) tvColOrder.push(key);
  }
  tvCloseCustomColPanel();
  buildTableView();
});

/** Sauvegarde la configuration de la vue Table View active (colonnes, ordre, largeurs,
 * filtres, colonnes personnalisées Metachain) dans un fichier JSON téléchargeable. */
function tvSaveTableView(){
  tvSyncToActiveTab();
  const data = {
    type: 'table-view-config',
    version: 1,
    colOrder: tvColOrder,
    relColOrder: tvRelColOrder,
    hiddenCols: [...tvHiddenCols],
    visibleRels: [...tvVisibleRels],
    colWidths: tvColWidths,
    filters: tvFilters,
    customCols: tvCustomCols,
    multiValDisplay: tvMultiValDisplay,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'table-view.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
/** Charge une configuration de vue Table View sauvegardée et l'applique à l'onglet actif. */
function tvLoadTableView(jsonText){
  let data;
  try { data = JSON.parse(jsonText); }
  catch(e) { alert('Fichier invalide : JSON illisible.'); return; }
  if (data.type !== 'table-view-config') { alert('Ce fichier ne semble pas être une vue tableau valide.'); return; }
  tvCustomCols = data.customCols || [];
  tvColOrder = data.colOrder || null;
  tvRelColOrder = data.relColOrder || null;
  tvHiddenCols = new Set(data.hiddenCols || []);
  tvVisibleRels = new Set(data.visibleRels || []);
  tvColWidths = data.colWidths || {};
  tvFilters = data.filters || {};
  tvMultiValDisplay = data.multiValDisplay || 'inline';
  tvSyncToActiveTab();
  buildTableView();
}
document.getElementById('tv-table-view-input')?.addEventListener('change', ev=>{
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => tvLoadTableView(e.target.result);
  reader.readAsText(file, 'UTF-8');
  ev.target.value = '';
});

/** Construit intégralement la vue Table View : barre d'outils, menu de sélection des
 * colonnes, en-têtes triables et redimensionnables, lignes filtrées et paginées.
 * Point d'entrée appelé après tout changement de modèle, de filtre ou d'onglet.
 */
function buildTableView() {
  // Persiste l'état courant (tri, colonnes, filtres...) dans l'onglet actif avant tout traitement,
  // pour garantir qu'aucune modification ne soit perdue lors d'un changement d'onglet ultérieur.
  tvSyncToActiveTab();
  buildTvTabBar();
  if (!MODEL.customAttrs) MODEL.customAttrs=[];
  const capRawAttrCols = (capLoaded && typeof capGetAllRawAttrKeys === 'function') ? capGetAllRawAttrKeys() : [];
  const allCols = [...TV_BUILTIN, ...MODEL.customAttrs, ...tvCustomCols.map(c=>c.key), ...capRawAttrCols];

  // Sync tvColOrder : conserve l'ordre utilisateur, ajoute les nouvelles colonnes, retire les obsolètes
  if (!tvColOrder) tvColOrder=[...allCols];
  else {
    allCols.forEach(c=>{ if(!tvColOrder.includes(c)) tvColOrder.push(c); });
    tvColOrder=tvColOrder.filter(c=>allCols.includes(c));
  }
  // Les attributs XML bruts Capella sont masqués par défaut (pas dans tvHiddenCols ni cochés
  // explicitement) — sinon ils apparaîtraient tous d'un coup au premier chargement du fichier.
  capRawAttrCols.forEach(c=>{ if(!tvHiddenCols.has(c) && !_tvRawAttrSeen.has(c)) { tvHiddenCols.add(c); _tvRawAttrSeen.add(c); } });
  const visCols = tvColOrder.filter(c=>!tvHiddenCols.has(c));

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const tb = document.getElementById('tv-toolbar'); tb.innerHTML='';
  const mkBtn=(lbl,fn,cls='tv-btn')=>{ const b=document.createElement('div'); b.className=cls; b.textContent=lbl; b.onclick=fn; tb.appendChild(b); return b; };

  // Bouton 🔷 Type d'élément — filtre par type Capella TEL QUE DÉFINI DANS LE FICHIER XML
  // (typeName brut depuis capAllElements, sans la différenciation NODE/BEHAVIOR faite dans
  // l'arborescence). 'Package' est exclu : ce n'est pas un type métier du modèle Capella.
  const capTypesPresent=[...new Set(capAllElements.filter(e=>e.typeName&&e.typeName!=='Package').map(e=>e.typeName))].sort();

  // ── Colonnes relation visibles (ordre préservé) — calculé avant le menu fusionné ──
  const allRelTypes=Object.keys(RCFG);
  if (!tvRelColOrder) tvRelColOrder=[...allRelTypes];
  else {
    allRelTypes.forEach(t=>{ if(!tvRelColOrder.includes(t)) tvRelColOrder.push(t); });
    tvRelColOrder=tvRelColOrder.filter(t=>allRelTypes.includes(t));
  }
  const relCols=tvRelColOrder.filter(t=>tvVisibleRels.has(t));
  // ── Panneau Type d'élément Capella — section dédiée (sec-cap-typ / cap-typ-body),
  //    groupée par couche ARCADIA comme le menu id="cap-sidebar" de la vue Capella Data.
  if (capTypesPresent.length) {
    const capTypBody = document.getElementById('cap-typ-body');
    if (capTypBody) {
      capTypBody.innerHTML = '';
      const capSearchWrap=document.createElement('div'); capSearchWrap.style.cssText='padding:4px 6px 6px';
      const capSearchInp=document.createElement('input'); capSearchInp.className='inp';
      capSearchInp.placeholder='Rechercher un type (nom humain)…';
      capSearchInp.value=tvCapTypeSearch;
      capSearchInp.style.cssText='width:100%;font-size:11px;padding:4px 8px;box-sizing:border-box;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:6px;color:var(--c-text);outline:none;';
      capSearchInp.oninput=()=>{ tvCapTypeSearch=capSearchInp.value; renderCapTypeList(); };
      capSearchWrap.appendChild(capSearchInp);
      capTypBody.appendChild(capSearchWrap);

      const capMenuTop=document.createElement('div'); capMenuTop.style.cssText='display:flex;gap:6px;padding:0 6px 6px';
      ['Tout afficher','Tout masquer'].forEach((lbl,i)=>{
        const b=document.createElement('span'); b.className='typ-sel-btn'; b.textContent=lbl;
        b.onclick=ev=>{ ev.stopPropagation(); tvCapTypeFilter = i===0 ? new Set(capTypesPresent) : new Set(); buildTableView(); };
        capMenuTop.appendChild(b);
      });
      capTypBody.appendChild(capMenuTop);

      const capListWrap=document.createElement('div'); capTypBody.appendChild(capListWrap);

      // Type → couche ARCADIA, retrouvée depuis capAllElements (même source que capTypeRegistry)
      const typeToLayer = {};
      capAllElements.forEach(c=>{ if(c.typeName && c.layer) typeToLayer[c.typeName]=c.layer; });

      /** Rend la liste des types Capella cochables (groupés par couche ARCADIA) dans le
       * panneau gauche de Table View.
       */
      function renderCapTypeList(){
        capListWrap.innerHTML='';
        const q=tvCapTypeSearch.trim().toLowerCase();
        // Regroupe les types présents par couche ARCADIA (même structure que CAP_LAYERS/cap-sidebar)
        const byLayer={};
        capTypesPresent.forEach(t=>{
          const human=(CAP_HUMAN_NAMES[t]||{}).h||t;
          if (q && !human.toLowerCase().includes(q) && !t.toLowerCase().includes(q)) return;
          const l = typeToLayer[t] || 'Shared';
          (byLayer[l]=byLayer[l]||[]).push(t);
        });
        let any=false;
        Object.entries(CAP_LAYERS).forEach(([lk,lv])=>{
          const items=byLayer[lk]; if(!items?.length) return;
          any=true;
          items.sort((a,b)=>((CAP_HUMAN_NAMES[a]||{}).h||a).localeCompare((CAP_HUMAN_NAMES[b]||{}).h||b));
          const isCollapsed = tvCapTypGrpCollapsed.has(lk);
          const checkedCount = items.filter(t=>tvCapTypeFilter.has(t)).length;
          const grp=document.createElement('div');
          const hdr=document.createElement('div'); hdr.className='cap-layer-grp-hdr';
          hdr.innerHTML=`<span style="width:7px;height:7px;border-radius:50%;background:${lv.color};flex-shrink:0;display:inline-block"></span><span style="color:${lv.color}">${lk}</span><span style="color:var(--c-dim);font-weight:400;text-transform:none;font-size:10px;letter-spacing:0">— ${lv.label}</span><span style="margin-left:auto;font-size:10px;color:var(--c-dim);font-family:monospace;">${checkedCount}/${items.length}</span><span style="font-size:9px;color:var(--c-dim);transition:transform .15s;margin-left:4px;" class="cap-grp-arr">${isCollapsed?'▶':'▼'}</span>`;
          const body=document.createElement('div'); body.className='cap-layer-grp-body'+(isCollapsed?' collapsed':'');
          body.style.maxHeight=isCollapsed?'0':(items.length*26+4)+'px';
          items.forEach(t=>{
            const human=(CAP_HUMAN_NAMES[t]||{}).h||t;
            const isChecked = tvCapTypeFilter.has(t);
            const row=document.createElement('label'); row.className='cap-type-row';
            row.title=(CAP_HUMAN_NAMES[t]||{}).d||'';
            const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=isChecked; cb.dataset.type=t;
            cb.onchange=ev=>{
              ev.stopPropagation();
              if (cb.checked) tvCapTypeFilter.add(t); else tvCapTypeFilter.delete(t);
              buildTableView();
            };
            const lbl=document.createElement('span'); lbl.className='cap-type-label'; lbl.textContent=human; lbl.title=t;
            row.appendChild(cb); row.appendChild(lbl);
            body.appendChild(row);
          });
          hdr.addEventListener('click',()=>{
            const nowColl=!tvCapTypGrpCollapsed.has(lk);
            if (nowColl) tvCapTypGrpCollapsed.add(lk); else tvCapTypGrpCollapsed.delete(lk);
            const arr=hdr.querySelector('.cap-grp-arr'); arr.textContent=nowColl?'▶':'▼';
            body.classList.toggle('collapsed',nowColl);
            body.style.maxHeight=nowColl?'0':(items.length*26+4)+'px';
          });
          grp.appendChild(hdr); grp.appendChild(body); capListWrap.appendChild(grp);
        });
        if (!any) {
          const empty=document.createElement('div');
          empty.style.cssText='padding:8px 6px;font-size:11px;color:var(--c-dim);font-style:italic';
          empty.textContent='Aucun type ne correspond.';
          capListWrap.appendChild(empty);
        }
      }
      renderCapTypeList();
    }
  }

  // Bouton + Attribut avec sous-menu inline — masqué quand un fichier Capella est chargé
  // (les attributs des éléments Capella viennent du XML, pas d'attributs personnalisés ajoutés à la main)
  if (!capLoaded) {
  const attrPicker=document.createElement('div'); attrPicker.className='tv-col-picker';
  const attrBtn=document.createElement('div'); attrBtn.className='tv-btn'; attrBtn.textContent='+ Attribut';
  attrPicker.appendChild(attrBtn);
  const attrMenu=document.createElement('div'); attrMenu.className='tv-col-menu';
  attrMenu.style.cssText+='padding:8px 10px;min-width:190px';
  const attrInp=document.createElement('input'); attrInp.className='inp';
  attrInp.placeholder='Nom de l\'attribut…';
  attrInp.style.cssText='width:100%;font-size:12px;padding:3px 6px;box-sizing:border-box;margin-bottom:6px';
  const attrErr=document.createElement('div');
  attrErr.style.cssText='font-size:10px;color:#f38ba8;margin-bottom:4px;display:none';
  const attrAdd=document.createElement('div'); attrAdd.className='tv-btn';
  attrAdd.style.cssText='text-align:center;width:100%;box-sizing:border-box';
  attrAdd.textContent='Ajouter';
  const doAdd=()=>{
    const name=attrInp.value.trim();
    if (!name){ attrErr.textContent='Le nom ne peut pas être vide.'; attrErr.style.display=''; return; }
    if (MODEL.customAttrs.includes(name)||TV_BUILTIN.includes(name)){ attrErr.textContent='Cet attribut existe déjà.'; attrErr.style.display=''; return; }
    MODEL.customAttrs.push(name); attrMenu.classList.remove('open'); buildTableView();
  };
  attrAdd.onclick=ev=>{ev.stopPropagation(); doAdd();};
  attrInp.onkeydown=ev=>{
    if (ev.key==='Enter'){ ev.stopPropagation(); doAdd(); }
    if (ev.key==='Escape'){ attrMenu.classList.remove('open'); }
  };
  attrInp.oninput=()=>{ attrErr.style.display='none'; };
  attrMenu.appendChild(attrInp); attrMenu.appendChild(attrErr); attrMenu.appendChild(attrAdd);
  attrMenu.onclick=ev=>ev.stopPropagation();
  attrPicker.appendChild(attrMenu);
  attrBtn.onclick=ev=>{
    ev.stopPropagation();
    const wasOpen=attrMenu.classList.contains('open');
    attrMenu.classList.toggle('open');
    if (!wasOpen){ attrInp.value=''; attrErr.style.display='none'; attrInp.focus();
      setTimeout(()=>{ const close=()=>{ attrMenu.classList.remove('open'); document.removeEventListener('click',close); }; document.addEventListener('click',close); },0);
    }
  };
  tb.appendChild(attrPicker);
  } // fin du if (!capLoaded)

  if (!capLoaded) {
  mkBtn('+ Élément', ()=>{
    const id='el'+Date.now(), type=Object.keys(TCFG).find(t=>t!=='Package')||'Block';
    const firstPkg=MODEL.elements.find(e=>e.type==='Package');
    const el={id,name:'Nouvel élément',type,pkg:firstPkg?firstPkg.name:'',attributes:{}};
    if(firstPkg) el.parentEl=firstPkg.id;
    MODEL.elements.push(el);
    buildTableView(); buildArbo();
  });
  } // fin du if (!capLoaded)

  // ── Menu déroulant "⊞ Colonnes" dans la toolbar Table View — même principe que le menu
  //    ⊞ Colonnes de la vue Tableau Capella Data (bouton + dropdown persistant), remplace
  //    l'ancien panneau "Colonnes & relations" du panneau gauche.
  const tvPicker=document.createElement('div'); tvPicker.style.cssText='position:relative;';
  const tvPickerBtn=document.createElement('div'); tvPickerBtn.className='tv-btn';
  tvPickerBtn.textContent=`⊞ Colonnes (${visCols.length})  ▾`;
  tvPicker.appendChild(tvPickerBtn);
  const tvPickerMenu=document.createElement('div'); tvPickerMenu.className='cap-colpicker-menu';
  if (_tvColPickerOpen) tvPickerMenu.classList.add('open');
  tvPickerMenu.onclick=ev=>ev.stopPropagation();
  tvPickerBtn.onclick=ev=>{
    ev.stopPropagation();
    _tvColPickerOpen = !_tvColPickerOpen;
    tvPickerMenu.classList.toggle('open', _tvColPickerOpen);
    if (_tvColPickerOpen) {
      setTimeout(()=>{
        const close=(ev2)=>{
          if (tvPicker.contains(ev2.target)) return;
          _tvColPickerOpen=false; tvPickerMenu.classList.remove('open'); document.removeEventListener('click',close);
        };
        document.addEventListener('click',close);
      },0);
    }
  };
  tvPicker.appendChild(tvPickerMenu);
  tb.appendChild(tvPicker);
  const mergedWrap = document.createElement('div');

  // Barre de recherche unique
  const mergedSearchWrap=document.createElement('div'); mergedSearchWrap.style.cssText='padding:0 4px 6px';
  const mergedSearchInp=document.createElement('input'); mergedSearchInp.className='inp';
  mergedSearchInp.placeholder='Rechercher une colonne…';
  mergedSearchInp.style.cssText='width:100%;font-size:11px;padding:4px 8px;box-sizing:border-box;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:6px;color:var(--c-text);outline:none;';
  mergedSearchWrap.appendChild(mergedSearchInp);
  mergedWrap.appendChild(mergedSearchWrap);

  // Tout afficher / Tout masquer (agit sur colonnes ET relations)
  const mergedTop=document.createElement('div'); mergedTop.style.cssText='display:flex;gap:6px;padding:0 4px 6px';
  ['Tout afficher','Tout masquer'].forEach((lbl,i)=>{
    const b=document.createElement('span'); b.className='typ-sel-btn'; b.textContent=lbl;
    b.onclick=ev=>{
      ev.stopPropagation();
      if (i===0) { tvHiddenCols.clear(); Object.keys(RCFG).forEach(t=>tvVisibleRels.add(t)); }
      else { allCols.forEach(c=>tvHiddenCols.add(c)); tvVisibleRels.clear(); }
      buildTableView();
    };
    mergedTop.appendChild(b);
  });
  mergedWrap.appendChild(mergedTop);

  const mergedListWrap=document.createElement('div'); mergedWrap.appendChild(mergedListWrap);
  tvPickerMenu.appendChild(mergedWrap);

  // Correspondance entre les libellés d'endpoint utilisés dans les noms de relations
  // Capella (ex: 'PC NODE', 'PC BEHAVIOR') et les vrais noms de type présents dans MODEL.elements
  // (ex: 'PhysicalComponent (NODE)', 'PhysicalComponent (BEHAVIOR)').
  const REL_LABEL_TO_TYPE = {
    'PC NODE':'PhysicalComponent (NODE)',
    'PC BEHAVIOR':'PhysicalComponent (BEHAVIOR)',
    'PC Root':'PhysicalComponent',
    'PC':'PhysicalComponent',
  };
  /** Convertit un libellé de relation affiché en son type technique correspondant.
   * @param {string} label - Libellé lisible de la relation
   * @returns {string} Type technique, ou le libellé inchangé s'il est inconnu
   */
  function relLabelToType(label){ return REL_LABEL_TO_TYPE[label] || label; }

  // Regroupe les types de relation RCFG par "endpoint spécifique" détecté dans leur nom (A→B)
  // Une relation est "spécifique" à un type si ce type apparaît dans capTypesPresent ;
  // sinon elle reste dans le groupe générique "Relations".
  /** Regroupe les types de relations par famille Capella (préfixe du type) afin de
   * présenter les colonnes de relations par sections dans le menu de sélection.
   * @returns {object} Dictionnaire clé de groupe → liste de types de relations
   */
  function buildRelGroups() {
    const groups={}; // typeKey -> [relType,...]  ; '' = groupe générique
    Object.keys(RCFG).forEach(relType=>{
      const parts=relType.split('→').map(s=>relLabelToType(s.trim()));
      const specific=parts.find(p=>capTypesPresent.includes(p));
      const key=specific||'';
      (groups[key]=groups[key]||[]).push(relType);
    });
    return groups;
  }

  /** Rend le contenu du menu « ⊞ Colonnes » : sections Attributs communs, Attributs du
   * fichier XML, Relations génériques et Relations spécifiques, filtrées par la recherche.
   */
  function renderMergedList(){
    mergedListWrap.innerHTML='';
    const q=mergedSearchInp.value.trim().toLowerCase();

    /** Ajoute un titre de section dans le menu de sélection des colonnes.
     */
    function addSectionTitle(label, color, tooltip){
      const t=document.createElement('div');
      t.textContent=label;
      if (tooltip) t.title = tooltip;
      t.style.cssText=`font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
        color:${color||'var(--c-dim)'};padding:8px 10px 3px;border-top:1px solid var(--c-border);margin-top:2px`;
      mergedListWrap.appendChild(t);
    }
    /** Ajoute une case à cocher de colonne dans le menu de sélection, avec actions d'édition/suppression.
     */
    function addColItem(col){
      const customMc = tvCustomCols.find(c=>c.key===col);
      const displayLabel = customMc ? customMc.label : col;
      if (q && !displayLabel.toLowerCase().includes(q) && !col.toLowerCase().includes(q)) return false;
      const item=document.createElement('div'); item.className='tv-col-menu-item';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!tvHiddenCols.has(col);
      cb.onchange=ev=>{ev.stopPropagation(); tvHiddenCols.has(col)?tvHiddenCols.delete(col):tvHiddenCols.add(col); buildTableView();};
      const lbl=document.createElement('span'); lbl.textContent=displayLabel; lbl.style.flex='1';
      item.appendChild(cb); item.appendChild(lbl);
      if (customMc) {
        item.title = col; // tooltip = clé technique
        const edit=document.createElement('span'); edit.textContent='✏'; edit.title='Modifier le metachain de cette colonne';
        edit.style.cssText='cursor:pointer;color:var(--c-dim);font-size:10px;padding:0 3px;';
        edit.onclick=(ev)=>{ ev.stopPropagation(); tvOpenCustomColPanel(col); };
        const del=document.createElement('span'); del.textContent='✕'; del.title='Supprimer cette colonne personnalisée';
        del.style.cssText='cursor:pointer;color:var(--c-dim);font-size:10px;padding:0 3px;';
        del.onclick=(ev)=>{ ev.stopPropagation(); tvCustomCols=tvCustomCols.filter(c=>c.key!==col); tvColOrder=tvColOrder?tvColOrder.filter(c=>c!==col):null; buildTableView(); };
        item.appendChild(edit); item.appendChild(del);
      }
      item.onclick=ev=>{ if(ev.target===cb||ev.target.tagName==='SPAN'&&(ev.target.textContent==='✏'||ev.target.textContent==='✕')) return; cb.checked=!cb.checked; cb.onchange(ev); };
      mergedListWrap.appendChild(item);
      return true;
    }
    /** Ajoute une case à cocher de colonne de relation dans le menu de sélection.
     * @param {string} relType - Type de relation à proposer
     */
    function addRelItem(relType){
      const cfg=RCFG[relType];
      const displayLabel = cfg.label || relType;
      if (q && !relType.toLowerCase().includes(q) && !displayLabel.toLowerCase().includes(q)) return false;
      const item=document.createElement('div'); item.className='tv-col-menu-item';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=tvVisibleRels.has(relType);
      cb.onchange=ev=>{ev.stopPropagation(); tvVisibleRels.has(relType)?tvVisibleRels.delete(relType):tvVisibleRels.add(relType); buildTableView();};
      const dot=document.createElement('span'); dot.style.cssText=`width:8px;height:8px;border-radius:50%;background:${cfg.color};flex-shrink:0;display:inline-block`;
      const lbl=document.createElement('span'); lbl.textContent=displayLabel; lbl.style.cssText='overflow:hidden;text-overflow:ellipsis';
      if (cfg.label) item.title = relType; // tooltip = nom technique réel
      item.appendChild(cb); item.appendChild(dot); item.appendChild(lbl);
      item.onclick=ev=>{ if(ev.target!==cb){ cb.checked=!cb.checked; cb.onchange(ev); } };
      mergedListWrap.appendChild(item);
      return true;
    }

    // Section 1 — Attributs communs
    let any=false;
    const colsSection=document.createElement('div');
    addSectionTitle('Attributs communs');
    // Exclut les attributs XML bruts Capella (capRawAttrCols) : ils ont leur propre section
    // juste après, pour éviter qu'ils n'apparaissent en double dans le menu.
    allCols.filter(col=>!capRawAttrCols.includes(col)).forEach(col=>{ if(addColItem(col)) any=true; });

    // Section 1bis — Attributs du fichier XML (uniquement si un fichier Capella est chargé) :
    // mêmes données que la section homonyme du menu ⊞ Colonnes de la vue Tableau Capella Data,
    // mais sélectionnables ici comme colonnes de Table View (résolues via tvGetValArray, qui
    // retrouve l'élément Capella source par ID pour lire son attribut XML brut).
    if (capLoaded && typeof capGetAllRawAttrKeys === 'function') {
      const rawAttrKeys = capGetAllRawAttrKeys();
      if (rawAttrKeys.length) {
        addSectionTitle('Attributs du fichier XML', '#a78bfa');
        rawAttrKeys.forEach(k=>{ if(addColItem(k)) any=true; });
      }
    }

    // Section 2 — Relations génériques (sans type Capella spécifique détecté)
    const relGroups=buildRelGroups();
    const genericRels=relGroups['']||[];
    if (genericRels.length) {
      addSectionTitle('Relations génériques');
      genericRels.forEach(relType=>{ if(addRelItem(relType)) any=true; });
    }

    // Sections 3+ — une par type Capella spécifique présent dans le modèle
    Object.keys(relGroups).filter(k=>k!=='').sort().forEach(typeKey=>{
      const human=(CAP_HUMAN_NAMES[typeKey]||{}).h||typeKey;
      const desc=(CAP_HUMAN_NAMES[typeKey]||{}).d;
      addSectionTitle(`Spécifique : ${human}`, '#58a6ff', desc);
      relGroups[typeKey].forEach(relType=>{ if(addRelItem(relType)) any=true; });
    });

    if (!any) {
      const empty=document.createElement('div');
      empty.style.cssText='padding:8px 10px;font-size:11px;color:var(--c-dim);font-style:italic';
      empty.textContent='Aucune colonne ne correspond.';
      mergedListWrap.appendChild(empty);
    }
  }
  mergedSearchInp.oninput=()=>renderMergedList();
  renderMergedList();

  // Icône dédiée "Colonne personnalisée" — ouvre le panneau latéral Metachain Navigation
  const tvCustomBtn=document.createElement('div'); tvCustomBtn.className='tv-btn'; tvCustomBtn.title='Créer une colonne calculée en suivant un chemin de relations (metachain), avec aperçu en direct';
  tvCustomBtn.textContent='✨ Colonne par chemin';
  tvCustomBtn.onclick=()=>tvOpenCustomColPanel();
  tb.appendChild(tvCustomBtn);

  // Bascule d'affichage des cellules à valeurs multiples : en ligne ou empilé
  const tvDisplayToggle=document.createElement('div'); tvDisplayToggle.className='tv-btn';
  tvDisplayToggle.title='Bascule l\'affichage des cellules à plusieurs valeurs';
  tvDisplayToggle.textContent = tvMultiValDisplay==='inline' ? '≡ En ligne' : '☰ Empilé';
  tvDisplayToggle.onclick=()=>{ tvMultiValDisplay = tvMultiValDisplay==='inline' ? 'stacked' : 'inline'; buildTableView(); };
  tb.appendChild(tvDisplayToggle);

  // Sauvegarder / charger la vue tableau (colonnes, metachains, filtres, largeurs)
  const tvSaveBtn=document.createElement('div'); tvSaveBtn.className='tv-btn'; tvSaveBtn.title='Sauvegarder cette vue tableau dans un fichier';
  tvSaveBtn.textContent='💾 Sauver vue';
  tvSaveBtn.onclick=()=>tvSaveTableView();
  tb.appendChild(tvSaveBtn);

  const tvLoadBtn=document.createElement('div'); tvLoadBtn.className='tv-btn'; tvLoadBtn.title='Charger une vue tableau sauvegardée';
  tvLoadBtn.textContent='📂 Charger vue';
  tvLoadBtn.onclick=()=>document.getElementById('tv-table-view-input').click();
  tb.appendChild(tvLoadBtn);

  // Bouton réinitialiser l'ordre des colonnes et des items
  const hasCustomOrder = tvColOrder!==null || tvRelColOrder!==null || Object.keys(tvRelItemOrder).length>0 || Object.keys(tvColWidths).length>0;
  if (hasCustomOrder) {
    const resetOrdBtn=document.createElement('div'); resetOrdBtn.className='tv-btn';
    resetOrdBtn.title='Remettre les colonnes et les liens dans leur ordre initial';
    resetOrdBtn.textContent='↺ Ordre initial';
    resetOrdBtn.style.cssText='margin-left:auto;border-color:var(--c-accent);color:var(--c-accent)';
    resetOrdBtn.onclick=()=>{ tvColOrder=null; tvRelColOrder=null; tvRelItemOrder={}; tvColWidths={}; buildTableView(); };
    tb.appendChild(resetOrdBtn);
  }

  const countEl=document.createElement('span');
  countEl.style.cssText=`font-size:11px;color:var(--c-dim);${hasCustomOrder?'':'margin-left:auto'}`;
  tb.appendChild(countEl);

  // Helper : récupère les éléments liés par un type de relation, dans l'ordre utilisateur si défini
  /** Retourne les éléments reliés à un élément donné par un type de relation précis,
   * en parcourant MODEL.relations dans les deux sens (source et cible).
   * @param {object} el - Élément de départ
   * @param {string} relType - Type de relation à suivre
   * @returns {object[]} Éléments liés
   */
  function getRelLinks(el, relType) {
    const links=[];
    MODEL.relations.filter(r=>r.type===relType).forEach(r=>{
      if (r.src===el.id) {
        const tgt=tvFindElementById(r.tgt);
        if (tgt) links.push({el:tgt, dir:'→', relId:r.id});
      } else if (r.tgt===el.id) {
        const src=tvFindElementById(r.src);
        if (src) links.push({el:src, dir:'←', relId:r.id});
      }
    });
    const customOrder=tvRelItemOrder[el.id+'|'+relType];
    if (customOrder) links.sort((a,b)=>{
      const ia=customOrder.indexOf(a.relId), ib=customOrder.indexOf(b.relId);
      return (ia<0?9999:ia)-(ib<0?9999:ib);
    });
    return links;
  }

  // ── Filtrage lignes : type + texte ───────────────────────────────────────
  // Quand un fichier Capella est chargé, Table View affiche TOUS les éléments du fichier XML
  // (capAllElements), pas seulement le sous-ensemble filtré visible dans l'Arborescence à gauche.
  let rows;
  if (capLoaded && capAllElements.length) {
    if (!_tvCapRowsCache || _tvCapRowsCache._srcLen !== capAllElements.length) {
      // Construit un id XML → élément DOM pour retrouver rapidement le parent direct de chaque élément
      const xmlById = {};
      if (cap_xmlDoc) [...cap_xmlDoc.getElementsByTagName('*')].forEach(xmlEl=>{
        const xid = xmlEl.getAttribute('id')||capXId(xmlEl);
        if (xid) xmlById[xid] = xmlEl;
      });
      const rowsBuilt = capAllElements.map(c=>{
        let parentEl = null;
        const xmlEl = xmlById[c.id];
        if (xmlEl && xmlEl.parentElement) {
          const pid = xmlEl.parentElement.getAttribute('id')||capXId(xmlEl.parentElement);
          if (pid) parentEl = pid;
        }
        return { id:c.id, name:c.attrs.name||'', type:c.typeName, _capella:true, parentEl, _capRaw:c };
      });
      rowsBuilt._srcLen = capAllElements.length;
      _tvCapRowsCache = rowsBuilt;
    }
    rows = _tvCapRowsCache.filter(el=>S.typF[el.type]!==false);
  } else {
    rows = MODEL.elements.filter(el=>S.typF[el.type]!==false);
  }
  // tvCapTypeFilter est toujours un Set désormais (jamais null) : un Set vide filtre tout
  // (comportement "décoché par défaut" demandé), un Set rempli filtre sur les types cochés.
  {
    const capTypeNameById = {};
    capAllElements.forEach(c=>{ capTypeNameById[c.id]=c.typeName; });
    rows = rows.filter(el=>!el._capella || tvCapTypeFilter.has(capTypeNameById[el.id]||el.type));
  }
  visCols.forEach(col=>{
    const f=(tvFilters[col]||'').toLowerCase();
    if (f) rows=rows.filter(el=>tvGetVal(el,col).toLowerCase().includes(f));
  });
  if (tvSort.col && visCols.includes(tvSort.col)) {
    const c=tvSort.col, d=tvSort.dir;
    rows.sort((a,b)=>tvGetVal(a,c).localeCompare(tvGetVal(b,c))*d);
  }
  const totalRows = (capLoaded && _tvCapRowsCache) ? _tvCapRowsCache.length : MODEL.elements.length;
  countEl.textContent=`${rows.length} / ${totalRows} éléments`;

  // ── Table ─────────────────────────────────────────────────────────────────
  const tbl = document.getElementById('tv-table');
  const thead = tbl.querySelector('thead'); thead.innerHTML='';
  const tbody = tbl.querySelector('tbody'); tbody.innerHTML='';

  // ── Helper DnD colonnes ───────────────────────────────────────────────────
  let _dragStarted=false;
  /** Attache le glisser-déposer de réorganisation des colonnes à un en-tête de tableau.
   * @param {HTMLElement} th - En-tête concerné
   * @param {string} key - Clé de la colonne
   * @param {boolean} isRel - Vrai s'il s'agit d'une colonne de relation
   */
  function applyColDnD(th, key, isRel) {
    th.draggable=true;
    th.ondragstart=ev=>{
      _dragStarted=true;
      _tvDragCol=key; _tvDragIsRel=isRel;
      ev.dataTransfer.effectAllowed='move';
      ev.dataTransfer.setData('text/plain',key);
      requestAnimationFrame(()=>th.classList.add('tv-col-dragging'));
    };
    th.ondragend=()=>{
      th.classList.remove('tv-col-dragging');
      thead.querySelectorAll('.tv-col-drag-over').forEach(e=>e.classList.remove('tv-col-drag-over'));
      setTimeout(()=>{ _dragStarted=false; },0);
    };
    th.ondragover=ev=>{
      if (_tvDragIsRel!==isRel||_tvDragCol===key) return;
      ev.preventDefault(); ev.dataTransfer.dropEffect='move';
      thead.querySelectorAll('.tv-col-drag-over').forEach(e=>e.classList.remove('tv-col-drag-over'));
      th.classList.add('tv-col-drag-over');
    };
    th.ondragleave=ev=>{ if(!th.contains(ev.relatedTarget)) th.classList.remove('tv-col-drag-over'); };
    th.ondrop=ev=>{
      ev.preventDefault(); th.classList.remove('tv-col-drag-over');
      if (!_tvDragCol||_tvDragCol===key||_tvDragIsRel!==isRel) return;
      const order=isRel?tvRelColOrder:tvColOrder;
      const from=order.indexOf(_tvDragCol), to=order.indexOf(key);
      if (from<0||to<0) return;
      order.splice(from,1); order.splice(to,0,_tvDragCol);
      _tvDragCol=null; buildTableView();
    };
  }

  // ── Helper redimensionnement colonnes ──────────────────────────────────────
  // Ajoute une poignée de glissement sur le bord droit du <th> pour ajuster sa largeur.
  // Les largeurs sont conservées dans tvColWidths (clé = nom de colonne ou type de relation).
  /** Attache la poignée de redimensionnement à un en-tête de colonne de Table View
   * et mémorise la largeur choisie dans tvColWidths.
   * @param {HTMLElement} th - En-tête de colonne
   * @param {string} key - Clé de la colonne
   */
  function applyColResize(th, key) {
    if (tvColWidths[key]) th.style.width = tvColWidths[key]+'px';
    const handle=document.createElement('div');
    handle.className='tv-col-resizer';
    handle.draggable=false;
    handle.onmousedown=ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const startX=ev.clientX, startW=th.getBoundingClientRect().width;
      handle.classList.add('resizing'); tbl.classList.add('tv-resizing');
      const onMove=ev2=>{
        const w=Math.max(50, startW+(ev2.clientX-startX));
        th.style.width=w+'px';
        tvColWidths[key]=w;
      };
      const onUp=()=>{
        handle.classList.remove('resizing'); tbl.classList.remove('tv-resizing');
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    };
    th.appendChild(handle);
  }

  // Header row
  const hrow=document.createElement('tr');
  visCols.forEach(col=>{
    const th=document.createElement('th');
    const isCustomAttr=MODEL.customAttrs.includes(col);
    const customMc=tvCustomCols.find(c=>c.key===col);
    const colLabel=customMc?customMc.label:col;
    const sortIco = tvSort.col===col ? (tvSort.dir===1?'▲':'▼') : '⇅';
    let extraIcons='';
    if (isCustomAttr) extraIcons='<span class="th-del" title="Supprimer attribut">✕</span>';
    else if (customMc) extraIcons='<span class="th-edit" title="Modifier le metachain">✏</span><span class="th-del" title="Supprimer cette colonne">✕</span>';
    th.title=customMc?col:'';
    th.innerHTML=`<div class="th-inner"><span>${colLabel}</span><span class="th-sort">${sortIco}</span>${extraIcons}</div>`;
    th.onclick=ev=>{
      if (_dragStarted) return;
      if (ev.target.classList.contains('tv-col-resizer')) return;
      if (ev.target.classList.contains('th-edit')) { tvOpenCustomColPanel(col); return; }
      if (ev.target.classList.contains('th-del')) {
        if (!confirm(`Supprimer la colonne "${colLabel}" ?`)) return;
        if (isCustomAttr) {
          MODEL.customAttrs.splice(MODEL.customAttrs.indexOf(col),1);
          MODEL.elements.forEach(e=>{ if(e.attributes) delete e.attributes[col]; });
        } else if (customMc) {
          tvCustomCols=tvCustomCols.filter(c=>c.key!==col);
        }
        tvHiddenCols.delete(col); tvColOrder=tvColOrder.filter(c=>c!==col); buildTableView(); return;
      }
      tvSort = tvSort.col===col ? {col,dir:-tvSort.dir} : {col,dir:1};
      buildTableView();
    };
    applyColDnD(th, col, false);
    applyColResize(th, col);
    hrow.appendChild(th);
  });
  // En-têtes colonnes relation
  relCols.forEach(relType=>{
    const cfg=RCFG[relType];
    const th=document.createElement('th');
    th.innerHTML=`<div class="th-inner"><span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${cfg.color};flex-shrink:0;display:inline-block"></span>${relType}</span><span class="th-del" title="Masquer cette colonne">✕</span></div>`;
    th.onclick=ev=>{ if(_dragStarted) return; if(ev.target.classList.contains('tv-col-resizer')) return; if(ev.target.classList.contains('th-del')){ tvVisibleRels.delete(relType); buildTableView(); } };
    applyColDnD(th, relType, true);
    applyColResize(th, relType);
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);

  // Filter row (sticky — top est calculé dynamiquement)
  const frow=document.createElement('tr'); frow.className='tv-filter-row';
  visCols.forEach(col=>{
    const th=document.createElement('th');
    const inp=document.createElement('input');
    inp.placeholder='Filtrer…'; inp.value=tvFilters[col]||'';
    inp.onclick=ev=>ev.stopPropagation();
    inp.oninput=()=>{ tvFilters[col]=inp.value; buildTableView(); };
    th.appendChild(inp); frow.appendChild(th);
  });
  // Cellules filtre vides pour colonnes relation
  relCols.forEach(()=>{ const th=document.createElement('th'); frow.appendChild(th); });
  thead.appendChild(frow);

  // Data rows
  rows.forEach(el=>{
    const tr=document.createElement('tr');
    visCols.forEach(col=>{
      const td=document.createElement('td');
      const isCustomMc = tvCustomCols.some(c=>c.key===col);
      const ro=col==='ID'||col==='Human Type'||col==='Owned element'||isCustomMc;
      if (col==='Owned element' || isCustomMc) {
        const valArr = tvGetValArray(el,col).filter(v=>v!=='');
        if (tvMultiValDisplay==='stacked' && valArr.length>1) {
          td.className='tv-rel-td';
          const cell=document.createElement('div'); cell.className='tv-rel-cell';
          valArr.forEach(v=>{ const item=document.createElement('div'); item.className='tv-rel-item'; item.textContent=v; item.title=v; cell.appendChild(item); });
          td.appendChild(cell);
        } else if (!valArr.length) {
          td.innerHTML='<span class="tv-rel-empty">—</span>';
        } else {
          td.textContent=valArr.join(', ');
          td.title=valArr.join(', ');
        }
        tr.appendChild(td);
        return;
      }
      if (!ro) td.className='tv-edit';
      const cellVal = tvGetVal(el,col);
      td.title = (col==='Human Type' && el.type) ? ((CAP_HUMAN_NAMES[el.type.replace(/ \((NODE|BEHAVIOR)\)$/,'')]||{}).d || cellVal) : cellVal;
      td.textContent = cellVal;
      td.ondblclick=()=>tvMakeCellEditable(td,el,col);
      tr.appendChild(td);
    });
    // Cellules relation
    relCols.forEach(relType=>{
      const td=document.createElement('td'); td.className='tv-rel-td';
      const links=getRelLinks(el, relType);
      if (!links.length) {
        td.innerHTML='<span class="tv-rel-empty">—</span>';
      } else {
        const cell=document.createElement('div'); cell.className='tv-rel-cell';
        const orderKey=el.id+'|'+relType;
        links.forEach(({el:linked, dir, relId})=>{
          const item=document.createElement('div'); item.className='tv-rel-item';
          item.draggable=true;
          // DnD : réorganiser les items dans la cellule
          item.ondragstart=ev=>{
            ev.stopPropagation();
            ev.dataTransfer.effectAllowed='move';
            ev.dataTransfer.setData('text/plain', relId+'\n'+el.id+'\n'+relType);
            requestAnimationFrame(()=>item.classList.add('tv-ritem-dragging'));
          };
          item.ondragend=()=>{
            item.classList.remove('tv-ritem-dragging');
            cell.querySelectorAll('.tv-ritem-drag-over').forEach(e=>e.classList.remove('tv-ritem-drag-over'));
          };
          item.ondragover=ev=>{
            const raw=ev.dataTransfer.types.includes('text/plain');
            if (!raw) return;
            ev.preventDefault(); ev.stopPropagation();
            cell.querySelectorAll('.tv-ritem-drag-over').forEach(e=>e.classList.remove('tv-ritem-drag-over'));
            if (ev.currentTarget!==ev.target.closest('.tv-rel-item')) return;
            item.classList.add('tv-ritem-drag-over');
          };
          item.ondragleave=ev=>{
            if (!item.contains(ev.relatedTarget)) item.classList.remove('tv-ritem-drag-over');
          };
          item.ondrop=ev=>{
            ev.preventDefault(); ev.stopPropagation();
            item.classList.remove('tv-ritem-drag-over');
            const parts=ev.dataTransfer.getData('text/plain').split('\n');
            const srcRelId=parts[0], srcElId=parts[1], srcRelType=parts[2];
            if (srcRelId===relId||srcElId!==el.id||srcRelType!==relType) return;
            const curOrder=links.map(l=>l.relId);
            const from=curOrder.indexOf(srcRelId), to=curOrder.indexOf(relId);
            if (from<0||to<0) return;
            curOrder.splice(from,1); curOrder.splice(to,0,srcRelId);
            tvRelItemOrder[orderKey]=curOrder;
            buildTableView();
          };
          const dirSpan=document.createElement('span'); dirSpan.className='tv-rel-dir'; dirSpan.textContent=dir;
          const nameSpan=document.createElement('span'); nameSpan.className='tv-rel-name';
          nameSpan.textContent=linked.name; nameSpan.title=linked.name;
          item.appendChild(dirSpan); item.appendChild(nameSpan);
          cell.appendChild(item);
        });
        td.appendChild(cell);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // Ajuste dynamiquement le top de la ligne de filtre (sticky)
  requestAnimationFrame(()=>{
    const hdrH=hrow.getBoundingClientRect().height||30;
    frow.querySelectorAll('th').forEach(th=>th.style.top=hdrH+'px');
  });
}

/** Callback appelé après toute modification du modèle : rebuildTree, buildArbo, buildPanel. */
function onModelChanged() {
  buildPanel(); setupMarkers();
  if (currentMode === 'table') { buildTableView(); }
  else { rebuildTree(); updateModalCounts(); renderModalTab(editTab); setTimeout(()=>fitView(true),80); }
}