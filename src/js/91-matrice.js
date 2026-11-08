/* ══ ▦ MATRICE — éléments en lignes et en colonnes, reliés par les relations choisies ══════════════════════════
 * Vue neuve, à côté du ▤ Tableau, pour tous les formats : Capella (relations de CAP_LINK_SECTIONS, 🧾 exigences),
 * SysML v2 et UML / SysML v1 (liaisons des lecteurs d'Arcature, 87 / 88) ; contenance et références par attribut
 * (tous formats) ; ✨ relations par chemin (moteur de la colonne par chemin du ▤ Tableau, 21).
 * Inspirée de la Dependency Matrix de Catia Magic : zone des critères repliable (types, couches et portée des lignes et
 * des colonnes, critère, sens, éléments affichés), changer d'axes, diagonale fléchée de la source vers la cible, totaux,
 * groupes repliables par propriétaire, légende, masquer une ligne ; et du ▤ Tableau : onglets enregistrés avec la page,
 * tri, filtres, 🎯 portée, exports CSV / Excel, réglages dans ⚙ Interface et vues. Lecture seule.
 * Marques des cellules personnalisables par relation (couleur, forme, texte) : utile quand plusieurs relations sont cochées.
 * Grandes matrices (des milliers d'éléments) : liens de chaque relation calculés une fois par modèle (_capAnaCache),
 * cellules creuses, grille dessinée par fenêtre visible (seules les cellules à l'écran sont dans la page).
 */

/** Formes des marques : flèches (diagonale de la source vers la cible, sans pointe quand le lien va dans les deux sens) ;
 * formes pleines (pleine : la ligne pointe vers la colonne ; creuse : la colonne pointe vers la ligne ; cerclée : les deux). */
const CAP_MX_FORMES=[['fleche',_L('↗ Flèche')],['tirets',_L('⇢ Flèche en tirets')],['epaisse',_L('➚ Flèche épaisse')],['point',_L('● Point')],
  ['carre',_L('■ Carré')],['losange',_L('◆ Losange')],['coche',_L('✔ Coche')],['croix',_L('✕ Croix')],['texte',_L('Aa Texte')]];
/** Sens du critère : out = la ligne est la source du lien, in = la colonne est la source, both = les deux. */
const CAP_MX_SENS=[['out',_L('→ Ligne vers colonne'),_L('La ligne est la source du lien')],['in',_L('← Colonne vers ligne'),_L('La colonne est la source du lien')],['both',_L('⇄ Les deux'),_L('Les liens dans les deux sens')]];
/** Éléments affichés (« Show Elements » de Cameo). */
const CAP_MX_AFF=[['avec',_L('Avec relations')],['tous',_L('Tous les éléments')],['lignes0',_L('Lignes sans relation')],['colonnes0',_L('Colonnes sans relation')]];
/** Tris des lignes et des colonnes. */
const CAP_MX_TRI=[['nom',_L('Nom')],['nombre',_L('Nombre de liens')],['proprietaire',_L('Propriétaire')],['type',_L('Type')]];
/** Tailles de cellule proposées (px). */
const CAP_MX_TAILLES=[14,16,18,20,22,26,30];
/** Chemins intermédiaires gardés par couple (départ, arrivée) d'une relation par chemin. */
const CAP_MX_VOIES=8;
/** Couleurs proposées aux nouvelles relations par chemin. */
const CAP_MX_COULEURS=['#14b8a6','#06b6d4','#84cc16','#f59e0b','#e879f9','#38bdf8','#fb7185'];

/** Onglets de la ▦ Matrice, onglet actif, bibliothèque des ✨ relations par chemin, zone des critères ouverte, légende :
 * enregistrés avec la page (bloc cap-ui-views) et dans ⚙ Interface et vues (partie « matrix »). */
var _capMx={tabs:null, idx:0, chemins:[], critOuvert:true, legende:true};
/** État d'affichage non enregistré : ligne ou colonne sélectionnée {ax, id}, cellule active {r, c}, survol. */
var _capMxUi={sel:null, act:null, hov:{r:-1, c:-1}};
/** Matrice affichée : résultat de capMxCalc, complété par la mise en page de la grille. */
var _capMxX=null;

/* ── Format du modèle, groupes (couches ou familles), noms ─────────────────────────────────────────────────── */

/** Format du modèle ouvert. @returns {'capella'|'sysml2'|'uml'} */
function capMxFormat(){ return typeof _capSysml!=='undefined'&&_capSysml.lecture?(capSyUml()?'uml':_capSysml.format==='reqif'?'reqif':'sysml2'):'capella'; }

/** Groupes proposés en filtre des axes : couches ARCADIA (Capella) ou familles du lecteur (SysML / UML).
 * @returns {{k:string, l:string, t:string, c:string}[]} Clé, libellé court, libellé long, couleur */
function capMxGroupes(){
  if(capMxFormat()==='capella') return ['OA','SA','LA','PA','EPBS','Shared'].map(k=>({k, l:k==='Shared'?_L('Transverse'):k, t:(CAP_LAYERS[k]||{}).label||k, c:(CAP_LAYERS[k]||{}).color||'#8b949e'}));
  if(capMxFormat()==='reqif') return Object.entries((typeof ArcatureLecteurReqif!=='undefined'&&ArcatureLecteurReqif.familles)||{}).map(([k,t])=>({k, l:k, t, c:{SPEC:'#e3b341', REL:'#3fb950', TYPE:'#8b949e'}[k]||'#8b949e'}));   // 📑 parties du fichier ReqIF (101)
  return [['STR',_L('Structure')],['BEH',_L('Comportement')],['REQ',_L('Exigences & cas')],['ORG',_L('Organisation')]].map(([k,l])=>({k, l:k, t:l, c:CAP_SY_FAM_COULEUR[k]||'#8b949e'}));
}

/** Groupe d'un élément : couche (Capella) ou famille (SysML / UML). @param {object} el - Élément @returns {string} */
function capMxGroupeDe(el){ return capMxFormat()==='capella'?el.layer:(el.attrs.famille||''); }

/** Nom affiché d'un élément (type entre parenthèses s'il n'a pas de nom). @param {object} el - Élément @returns {string} */
function capMxNom(el){ return el?(el.attrs.name||_L(`(${capAnaHuman(el.typeName)} sans nom)`)):'—'; }

/** Types présents dans le modèle ouvert. @returns {string[]} */
function capMxTypesPresents(){ return [...new Set(capAllElements.map(e=>e.typeName))]; }

/* ── Catalogue des relations ────────────────────────────────────────────────────────────────────────────────── */

/** Catalogue des relations du modèle ouvert, en cache (_capAnaCache.mxRels) : relation = {k, l, g, c, liens, n} ;
 * lien = {s, t, v, vn?, voies?} (source, cible, élément de liaison, nom de la relation d'exigence, chemins intermédiaires).
 * Capella : CAP_LINK_SECTIONS et exigences ; SysML / UML : liaisons du lecteur ; tous formats : contenance et, dans
 * « Avancé », références par attribut ; ✨ relations par chemin de la page (liens calculés à la demande).
 * @returns {{list:object[], by:Object<string,object>}} Catalogue */
function capMxRelations(){
  let C=_capAnaCache.mxRels;
  if(!C){
    C=_capAnaCache.mxRels={list:[], by:{}};
    const add=(k,l,g,c,liens,x)=>{ if(!liens.length) return; const r=Object.assign({k,l,g,c,liens,n:liens.length},x||{}); C.list.push(r); C.by[k]=r; };
    const fmt=capMxFormat();
    if(fmt==='capella'){
      const L=capLinksData||(capLinksData=capComputeLinks()), gl={};
      CAP_LINK_GROUPS.forEach(g=>{ gl[g.key]=g.label; });
      CAP_LINK_SECTIONS.forEach(sec=>add(sec.key, sec.humanLabel||sec.relType, gl[sec.grp]||_L('Autres'), sec.tgtC||sec.srcC||'#8b949e',
        (L[sec.key]||[]).filter(r=>r.src&&r.tgt&&r.src.id&&r.tgt.id).map(r=>({s:r.src.id, t:r.tgt.id, v:r.via&&r.via.id||''}))));
      let RQ={list:[]}; try{ RQ=capComputeRequirements(); }catch(e){ console.warn('Exigences illisibles :', e); }
      const el=[], rq=[];
      RQ.list.forEach(r=>{
        (r.links||[]).forEach(x=>{ if(x.id) el.push({s:r.id, t:x.id, v:'', vn:x.rel||''}); });
        (r.rels||[]).forEach(x=>{ if(/→$/.test(x.rel||'')) rq.push({s:r.id, t:x.id, v:'', vn:String(x.rel).replace(/\s*→$/,'')}); });
      });
      add('req:el', _L('Exigence → élément lié'), _L('🧾 Exigences'), '#e3b341', el);
      add('req:req', _L('Exigence → exigence'), _L('🧾 Exigences'), '#d29922', rq);
    } else {
      const par={};
      capSysmlLiaisons().forEach(l=>{ if(l.source&&l.cible) (par[l.relation]=par[l.relation]||[]).push({s:l.source, t:l.cible, v:l.via||''}); });
      const G=fmt==='uml'?_L('Liaisons UML / SysML v1'):fmt==='reqif'?_L('Relations ReqIF'):_L('Liaisons SysML v2');
      Object.keys(par).forEach(rel=>add('sy:'+rel, capSyRelLibelle(rel), G, (CAP_SY_REL_STYLE[rel]||['#8b949e'])[0], par[rel]));
    }
    const {parentOf}=capGetParentIndex(), own=[];
    capAllElements.forEach(e=>{ const p=parentOf[e.id]; if(p&&capGetElementById_(p)) own.push({s:p, t:e.id, v:''}); });
    add('own', _L('Contenance (propriétaire → contenu)'), _L('Tous formats'), '#8b949e', own);
    const refs={}, SAUF=new Set(['name','description','summary','id','famille','declaration','documentation']);
    capAllElements.forEach(e=>Object.entries(e.attrs||{}).forEach(([a,v])=>{
      if(SAUF.has(a)||!v) return; const s=String(v); if(s.length>4000) return;
      capParseAttrRefs_(s).forEach(id=>{ if(id!==e.id&&capGetElementById_(id)) (refs[a]=refs[a]||[]).push({s:e.id, t:id, v:''}); }); }));
    Object.keys(refs).sort().forEach(a=>add('ref:'+a, _L(`Référence « ${a} »`), _L('Références par attribut'), '#6e7681', refs[a], {avance:true}));
  }
  capMxChSync(C);
  return C;
}

/** Remet les ✨ relations par chemin de la page dans le catalogue (leurs liens sont calculés à la première lecture).
 * @param {{list:object[], by:object}} C - Catalogue */
function capMxChSync(C){
  C.list=C.list.filter(r=>!r.ch); Object.keys(C.by).forEach(k=>{ if(k.startsWith('ch:')) delete C.by[k]; });
  (_capMx.chemins||[]).forEach(ch=>{
    const r={k:'ch:'+ch.id, l:'✨ '+ch.nom, g:_L('✨ Relations par chemin'), c:ch.c||'#14b8a6', ch};
    Object.defineProperty(r,'liens',{get:()=>capMxChLiens(ch)}); Object.defineProperty(r,'n',{get:()=>capMxChLiens(ch).length});
    C.list.push(r); C.by[r.k]=r;
  });
}

/** Liens d'une ✨ relation par chemin : un lien par couple (élément de départ, élément d'arrivée), avec jusqu'à CAP_MX_VOIES
 * suites d'éléments intermédiaires. Chaque pas passe par capResolveStep (21 : relations indexées, attributs, références
 * entrantes, owner, owned, via, liaisons des lecteurs). En cache par chemin (_capAnaCache.mxCh), calcul borné dans le temps.
 * @param {{id:string, steps:object[]}} ch - Relation par chemin (étapes {metaclass, property} de la colonne par chemin)
 * @returns {object[]} Liens {s, t, v, voies} */
function capMxChLiens(ch){
  const cache=_capAnaCache.mxCh||(_capAnaCache.mxCh={}), steps=ch.steps||[];
  const cle=JSON.stringify(steps.map(s=>[s.metaclass, s.property&&s.property.key]));
  const x=cache[ch.id]; if(x&&x.cle===cle) return x.liens;
  const liens=[]; let tronque=false;
  if(steps.length&&steps.every(s=>s.property&&!s.property.isTerminal)){
    const t0=performance.now();
    for(const e of capAllElements){
      if(e.typeName!==steps[0].metaclass) continue;
      if(performance.now()-t0>8000){ tronque=true; break; }
      const res=new Map(), chemin=[]; let visites=0;
      const dfs=(cur,k)=>{
        if(k===steps.length){ let a=res.get(cur.id); if(!a) res.set(cur.id, a=[]); if(a.length<CAP_MX_VOIES) a.push(chemin.slice(0,-1).map(n=>n.id)); return; }
        if(++visites>5000) return;
        for(const n of new Set(capResolveStep(cur, steps[k].property))){ if(n===e||chemin.includes(n)) continue; chemin.push(n); dfs(n,k+1); chemin.pop(); }
      };
      dfs(e,0);
      res.forEach((voies,t)=>liens.push({s:e.id, t, v:'', voies}));
    }
  }
  cache[ch.id]={cle, liens, tronque};
  return liens;
}

/** Type atteint au bout d'une relation par chemin. @param {{steps:object[]}} ch - Relation @returns {string} */
function capMxChFin(ch){ const l=(ch.steps||[])[ch.steps.length-1]; return l&&l.property?l.property.resultType||'':''; }

/* ── Préréglages ────────────────────────────────────────────────────────────────────────────────────────────── */

/** ✨ Relations par chemin fournies avec les préréglages : étapes [type, clé de propriété du moteur de chemin (21)].
 * @returns {object[]} {id, fmt, nom, steps} */
function capMxCheminsPresets(){
  return [
    {id:'pc_lc', fmt:'capella', nom:_L('Composant physique → composant logique (via fonctions)'),
      steps:[['PhysicalComponent','rel:pcBeh_fn:fwd:PhysicalFunction'],['PhysicalFunction','rel:fn_real:fwd:LogicalFunction'],['LogicalFunction','rel:lc_lf:rev:LogicalComponent']]},
    {id:'lc_sc', fmt:'capella', nom:_L('Composant logique → système / acteur (via fonctions)'),
      steps:[['LogicalComponent','rel:lc_lf:fwd:LogicalFunction'],['LogicalFunction','rel:fn_real:fwd:SystemFunction'],['SystemFunction','rel:sc_sf:rev:SystemComponent']]},
    {id:'cap_sc', fmt:'capella', nom:_L('Capacité → système / acteur (via fonctions)'),
      steps:[['Capability','rel:cap_fn:fwd:SystemFunction'],['SystemFunction','rel:sc_sf:rev:SystemComponent']]},
    {id:'def_port', fmt:'sysml2', nom:_L('Définition → définition de ses ports (composition puis typage)'),
      steps:[['PartDefinition','sy:composition:fwd:PortUsage'],['PortUsage','sy:typage:fwd:PortDefinition']]},
    {id:'bloc_parts', fmt:'uml', nom:_L('Bloc → type de ses parts (contenance puis typage)'),
      steps:[['Block','owned:PartProperty'],['PartProperty','sy:typage:fwd:Block']]}
  ];
}

/** Étapes résolues d'une relation par chemin fournie (propriétés du moteur de chemin), ou null si le modèle ne la permet pas.
 * @param {string} id - Identifiant (capMxCheminsPresets) @returns {?object[]} Étapes {metaclass, property} */
function capMxChPresetSteps(id){
  const sp=capMxCheminsPresets().find(c=>c.id===id&&c.fmt===capMxFormat()); if(!sp) return null;
  const tp=new Set(capMxTypesPresents()); if(!sp.steps.every(([mc])=>tp.has(mc))) return null;
  const steps=sp.steps.map(([mc,key])=>({metaclass:mc, property:capGetMetachainProperties(mc).find(p=>p.key===key)||null}));
  return steps.every(s=>s.property)?JSON.parse(JSON.stringify(steps)):null;
}

/** Définitions des préréglages : format, identifiant stable (oracles), nom, types des lignes et des colonnes (liste ou fonction
 * du catalogue), couches, relations, sens, affichage. Même forme qu'un onglet enregistré (et que les matrices Cameo à venir).
 * @returns {object[]} Préréglages */
function capMxPresetsDef(){
  const RE=re=>()=>capMxTypesPresents().filter(t=>re.test(t));
  const BOUT=(rels,bout)=>C=>{ const s=new Set(); rels.forEach(k=>((C.by[k]||{}).liens||[]).forEach(l=>{ const e=capGetElementById_(bout==='s'?l.s:l.t); if(e) s.add(e.typeName); })); return [...s]; };
  // Types à l'autre bout des liens (deux extrémités confondues), hors les types qui correspondent au motif (les exigences elles-mêmes)
  const AUTRE=(rels,re)=>C=>{ const s=new Set(); rels.forEach(k=>((C.by[k]||{}).liens||[]).forEach(l=>[l.s,l.t].forEach(id=>{ const e=capGetElementById_(id); if(e&&!re.test(e.typeName)) s.add(e.typeName); }))); return [...s]; };
  const P=(fmt,id,nom,lt,lc,ct,cc,rel,sens,vue)=>({fmt,id,nom,lt,lc,ct,cc,rel,sens,vue:vue||{}});
  const F=['SystemFunction','LogicalFunction','PhysicalFunction'], OWN={grouper:'proprietaire'};
  const RQ=typeof capReqifLec==='function'&&capReqifLec()?[...new Set(capReqifLec().toutesLiaisons().map(l=>'sy:'+l.relation))]:[];   // 📑 relations ReqIF : une clé par type de relation du fichier (101)
  return [
    P('capella','alloc-sa',_L('Allocation des fonctions — SA'),['SystemFunction'],[],['SystemComponent'],[],['sc_sf'],'both',OWN),
    P('capella','alloc-la',_L('Allocation des fonctions — LA'),['LogicalFunction'],[],['LogicalComponent'],[],['lc_lf'],'both',OWN),
    P('capella','alloc-pa',_L('Allocation des fonctions — PA'),['PhysicalFunction'],[],['PhysicalComponent'],[],['pcBeh_fn'],'both',OWN),
    P('capella','alloc-oa',_L('Allocation des activités — OA'),['OperationalActivity'],[],['Entity','OperationalActor'],[],['entity_oa'],'both',OWN),
    P('capella','deploy-pa',_L('Déploiement — nœuds × comportements (PA)'),['PhysicalComponent'],[],['PhysicalComponent'],[],['pcNode_pcBeh'],'out'),
    P('capella','fe-sa',_L('Échanges fonctionnels — SA'),['SystemFunction'],[],['SystemFunction'],[],['fe_fn'],'both'),
    P('capella','fe-la',_L('Échanges fonctionnels — LA'),['LogicalFunction'],[],['LogicalFunction'],[],['fe_fn'],'both'),
    P('capella','fe-pa',_L('Échanges fonctionnels — PA'),['PhysicalFunction'],[],['PhysicalFunction'],[],['fe_fn'],'both',{taille:18}),
    P('capella','ce-sa',_L('Échanges de composants — SA'),['SystemComponent'],[],['SystemComponent'],[],['ce_comp'],'both'),
    P('capella','ce-la',_L('Échanges de composants — LA'),['LogicalComponent'],[],['LogicalComponent'],[],['ce_comp'],'both'),
    P('capella','ce-pa',_L('Échanges de composants — PA'),['PhysicalComponent'],[],['PhysicalComponent'],[],['ce_comp'],'both'),
    P('capella','pl-pa',_L('Liens physiques — PA'),['PhysicalComponent'],[],['PhysicalComponent'],[],['pl_pc'],'both'),
    P('capella','cap-fn',_L('Capacités × fonctions'),['Capability','CapabilityRealization','OperationalCapability'],[],F.concat('OperationalActivity'),[],['cap_fn'],'out'),
    P('capella','cap-sc',_L('Capacités × systèmes / acteurs impliqués'),['Capability'],[],['SystemComponent'],[],['cap_comp'],'out'),
    P('capella','cap-fc',_L('Capacités × chaînes fonctionnelles'),['Capability','CapabilityRealization'],[],['FunctionalChain'],[],['cap_fc'],'out'),
    P('capella','mis-cap',_L('Missions × capacités'),['Mission'],[],['Capability'],[],['mission_cap'],'out'),
    P('capella','fc-fn',_L('Chaînes fonctionnelles × fonctions'),['FunctionalChain'],[],F,[],['fc_fn'],'out',OWN),
    P('capella','real-fn-sa',_L('Réalisations — fonctions SA → OA'),['SystemFunction'],[],['OperationalActivity'],[],['fn_real'],'out'),
    P('capella','real-fn-la',_L('Réalisations — fonctions LA → SA'),['LogicalFunction'],[],['SystemFunction'],[],['fn_real'],'out',OWN),
    P('capella','real-fn-pa',_L('Réalisations — fonctions PA → LA'),['PhysicalFunction'],[],['LogicalFunction'],[],['fn_real'],'out',OWN),
    P('capella','real-cp-la',_L('Réalisations — composants LA → SA'),['LogicalComponent'],[],['SystemComponent'],[],['comp_real'],'out'),
    P('capella','real-cp-pa',_L('Réalisations — composants PA → LA'),['PhysicalComponent'],[],['LogicalComponent'],[],['comp_real'],'out'),
    P('capella','req-el',_L('Exigences × éléments liés'),BOUT(['req:el'],'s'),[],BOUT(['req:el'],'t'),[],['req:el'],'out',OWN),
    P('capella','ch-pc-lc',_L('Composants PA × LA ✨ via fonctions'),['PhysicalComponent'],[],['LogicalComponent'],[],['ch:pc_lc'],'out',OWN),
    P('capella','ch-lc-sc',_L('Composants LA × systèmes / acteurs ✨ via fonctions'),['LogicalComponent'],[],['SystemComponent'],[],['ch:lc_sc'],'out'),
    P('capella','ch-cap-sc',_L('Capacités × systèmes / acteurs ✨ via fonctions'),['Capability'],[],['SystemComponent'],[],['ch:cap_sc'],'out'),
    P('sysml2','sy-typ',_L('Usages × définitions (typage)'),RE(/Usage$/),[],RE(/Definition$/),[],['sy:typage'],'out',OWN),
    P('sysml2','sy-req',_L('Exigences × éléments (satisfy, verify, sujet)'),RE(/^Requirement(Usage|Definition)$/),[],AUTRE(['sy:satisfy','sy:verify','sy:sujet'],/^Requirement/),[],['sy:satisfy','sy:verify','sy:sujet'],'both'),
    P('sysml2','sy-comp',_L('Définitions × contenu (composition)'),RE(/Definition$/),[],RE(/Usage$/),[],['sy:composition'],'out',OWN),
    P('sysml2','sy-beh',_L('Parts × comportements (perform, exhibit)'),['PartUsage','PartDefinition'],[],BOUT(['sy:perform','sy:exhibit'],'t'),[],['sy:perform','sy:exhibit'],'out'),
    P('sysml2','sy-alloc',_L('Allocations'),BOUT(['sy:allocation'],'s'),[],BOUT(['sy:allocation'],'t'),[],['sy:allocation'],'out'),
    P('sysml2','sy-cnx',_L('Connexions (connexion, flux, liaison)'),BOUT(['sy:connexion','sy:flux','sy:liaison'],'s'),[],BOUT(['sy:connexion','sy:flux','sy:liaison'],'t'),[],['sy:connexion','sy:flux','sy:liaison'],'both'),
    P('sysml2','ch-def-port',_L('Définitions × ports ✨ composition puis typage'),['PartDefinition'],[],['PortDefinition'],[],['ch:def_port'],'out'),
    P('uml','uml-req',_L('Exigences × éléments (satisfy, verify, refine, trace)'),RE(/Requirement$/),[],AUTRE(['sy:satisfy','sy:verify','sy:refine','sy:trace'],/Requirement$/),[],['sy:satisfy','sy:verify','sy:refine','sy:trace'],'both'),
    P('uml','uml-reqreq',_L('Exigences × exigences (deriveReqt)'),RE(/Requirement$/),[],RE(/Requirement$/),[],['sy:deriveReqt'],'both'),
    P('uml','uml-blk',_L('Blocs × blocs (composition, généralisation, association)'),['Block'],[],['Block'],[],['sy:composition','sy:generalisation','sy:association'],'both'),
    P('uml','uml-uc',_L('Cas d\'utilisation × acteurs (association, inclusion)'),['UseCase'],[],['Actor','UseCase'],[],['sy:association','sy:inclusion','sy:extension'],'both'),
    P('uml','uml-typ',_L('Propriétés × types (typage)'),RE(/Property$/),[],BOUT(['sy:typage'],'t'),[],['sy:typage'],'out',OWN),
    P('uml','uml-alloc',_L('Allocations'),BOUT(['sy:allocation'],'s'),[],BOUT(['sy:allocation'],'t'),[],['sy:allocation'],'out'),
    P('reqif','rq-rel',_L('Exigences × exigences (relations ReqIF)'),['SpecObject'],[],['SpecObject'],[],RQ.length?RQ:['sy:—'],'both',{grouper:'proprietaire'}),
    P('uml','ch-bloc-parts',_L('Blocs × types des parts ✨ contenance puis typage'),['Block'],[],['Block'],[],['ch:bloc_parts'],'out')
  ];
}

/** Préréglages évalués sur le modèle ouvert : types présents retenus, relations disponibles, applicabilité (ok).
 * @returns {object[]} Préréglages {…, lt, ct, ok} */
function capMxPresets(){
  if(!capLoaded) return [];
  const C=capMxRelations(), fmt=capMxFormat(), tp=new Set(capMxTypesPresents()), val=x=>typeof x==='function'?x(C):(x||[]);
  return capMxPresetsDef().map(p=>{
    const lt=val(p.lt).filter(t=>tp.has(t)), ct=val(p.ct).filter(t=>tp.has(t));
    const rels=p.rel.filter(k=>k.startsWith('ch:')?!!capMxChPresetSteps(k.slice(3)):!!C.by[k]);
    return Object.assign({}, p, {lt, ct, ok:p.fmt===fmt&&lt.length>0&&ct.length>0&&rels.length>0&&(rels.length===p.rel.length||!p.rel.some(k=>k.startsWith('ch:'))), rel:rels.length?rels:p.rel});
  });
}

/** Onglet créé depuis un préréglage (ses ✨ relations par chemin sont ajoutées à la bibliothèque de la page si besoin).
 * @param {object} p - Préréglage évalué (capMxPresets) @returns {object} Onglet */
function capMxTabDePreset(p){
  p.rel.filter(k=>k.startsWith('ch:')).forEach(k=>{
    const id=k.slice(3); if(_capMx.chemins.some(c=>c.id===id)) return;
    const sp=capMxCheminsPresets().find(c=>c.id===id), steps=capMxChPresetSteps(id);
    if(sp&&steps) _capMx.chemins.push({id, nom:sp.nom, c:CAP_MX_COULEURS[_capMx.chemins.length%CAP_MX_COULEURS.length], steps});
  });
  return capMxTabNew(p.nom, {lignes:{types:p.lt, couches:p.lc||[]}, colonnes:{types:p.ct, couches:p.cc||[]}, relations:p.rel, sens:p.sens, afficher:'avec'}, p.vue);
}

/* ── Onglets ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Affichage par défaut d'un onglet, complété par `v`. @param {object} [v] @returns {object} */
function capMxVueDefaut(v){
  return Object.assign({grouper:'aucun', triL:{k:'nom',d:1}, triC:{k:'nom',d:1}, cellule:'fleche', taille:22, rw:300, hh:170, fL:'', fC:'', mL:[], mC:[], ouverts:{}, styles:{}}, v||{});
}

/** Axe vide (lignes ou colonnes). @returns {{types:string[], couches:string[], portee:{ids:string[], direct:boolean}}} */
function capMxAxeVide(){ return {types:[], couches:[], portee:{ids:[], direct:false}}; }

/** Crée un onglet de matrice. @param {string} nom - Nom @param {object} [def] - Définition (lignes, colonnes, relations, sens,
 * afficher) @param {object} [vue] - Affichage @returns {object} Onglet */
function capMxTabNew(nom, def, vue){
  const d=JSON.parse(JSON.stringify(def||{})), ax=a=>{ const x=Object.assign(capMxAxeVide(), a||{}); x.portee=Object.assign({ids:[], direct:false}, x.portee||{}); return x; };
  return {id:'mx-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), nom:nom||_L('Matrice'),
    lignes:ax(d.lignes), colonnes:ax(d.colonnes), relations:Array.isArray(d.relations)?d.relations:[],
    sens:['out','in','both'].includes(d.sens)?d.sens:'both', afficher:CAP_MX_AFF.some(a=>a[0]===d.afficher)?d.afficher:'avec',
    vue:capMxVueDefaut(JSON.parse(JSON.stringify(vue||{})))};
}

/** Garantit au moins un onglet ; le premier part du premier préréglage applicable au modèle ouvert. */
function capMxTabsEnsure(){
  if(_capMx.tabs&&_capMx.tabs.length){ if(_capMx.idx>=_capMx.tabs.length||_capMx.idx<0) _capMx.idx=0; return; }
  const p=capLoaded?capMxPresets().find(x=>x.ok):null;
  _capMx.tabs=[p?capMxTabDePreset(p):capMxTabNew(_L('Matrice 1'))]; _capMx.idx=0;
}

/** Onglet affiché. @returns {object} */
function capMxTab(){ capMxTabsEnsure(); return _capMx.tabs[_capMx.idx]; }

/** Signale un changement des onglets (le catalogue du tableau de bord sera recalculé). */
function capMxTabsChanged(){ if(typeof _capAnaCache!=='undefined') delete _capAnaCache.dashCat; }

/* ── Calcul ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Éléments contenus dans les éléments d'une portée (à tous les niveaux ou directement), ou null si elle est vide.
 * @param {{ids:string[], direct:boolean}} sc - Portée @returns {?Set<string>} */
function capMxPortee(sc){
  if(!sc||!sc.ids||!sc.ids.length) return null;
  const memo=_capAnaCache.mxPortee||(_capAnaCache.mxPortee={}), key=sc.ids.join('|')+'#'+(sc.direct?1:0);
  if(memo[key]) return memo[key];
  const {childrenOf}=capGetParentIndex(), set=new Set();
  sc.ids.forEach(id=>{
    if(sc.direct){ (childrenOf[id]||[]).forEach(c=>set.add(c)); return; }
    const st=[...(childrenOf[id]||[])];
    while(st.length){ const c=st.pop(); if(set.has(c)) continue; set.add(c); (childrenOf[c]||[]).forEach(x=>st.push(x)); }
  });
  return memo[key]=set;
}

/** Éléments d'un axe : types choisis ∩ couches (ou familles) ∩ portée, sans les éléments masqués.
 * @param {object} A - Axe {types, couches, portee} @param {string[]} [masques] - Identifiants masqués @returns {object[]} */
function capMxAxe(A, masques){
  const ty=new Set(A.types||[]); if(!ty.size) return [];
  const co=new Set(A.couches||[]), sc=capMxPortee(A.portee), ms=new Set(masques||[]);
  return capAllElements.filter(e=>ty.has(e.typeName)&&(!co.size||co.has(capMxGroupeDe(e)))&&(!sc||sc.has(e.id))&&!ms.has(e.id));
}

/** Calcule une matrice : un passage sur les liens des relations cochées, cellules creuses (Map ligne → Map colonne → liens),
 * totaux par ligne et par colonne, éléments affichés, filtres, tri, groupes et totaux des groupes.
 * @param {object} [t] - Onglet (défaut : onglet affiché)
 * @returns {object} Matrice {t, v, R, K, Rv, Kv, cells, rowN, colN, nl, nCel, nR0, nC0, rows, cols, bands, agg…} */
function capMxCalc(t){
  t=t||capMxTab();
  const v=t.vue, C=capMxRelations(), {parentOf}=capGetParentIndex();
  const R=capMxAxe(t.lignes, v.mL), K=capMxAxe(t.colonnes, v.mC), Rs=new Set(R.map(e=>e.id)), Ks=new Set(K.map(e=>e.id));
  const cells=new Map(), rowN=new Map(), colN=new Map(), vus=new Set(); let nCel=0, max=1;
  const put=(r,c,d,k,l)=>{ let m=cells.get(r); if(!m) cells.set(r, m=new Map()); let x=m.get(c); if(!x){ m.set(c, x={o:[], i:[]}); nCel++; }
    x[d].push({r:k, l}); max=Math.max(max, x.o.length+x.i.length); rowN.set(r,(rowN.get(r)||0)+1); colN.set(c,(colN.get(c)||0)+1); vus.add(l); };
  t.relations.forEach(k=>{ const rel=C.by[k]; if(!rel) return;
    for(const l of rel.liens){
      if(t.sens!=='in'&&Rs.has(l.s)&&Ks.has(l.t)) put(l.s,l.t,'o',k,l);
      if(t.sens!=='out'&&Rs.has(l.t)&&Ks.has(l.s)&&!(l.s===l.t&&t.sens==='both')) put(l.t,l.s,'i',k,l);
    } });
  const nR0=R.filter(e=>!rowN.get(e.id)).length, nC0=K.filter(e=>!colN.get(e.id)).length;
  let Rv=R, Kv=K;
  if(t.afficher==='avec'){ Rv=R.filter(e=>rowN.get(e.id)); Kv=K.filter(e=>colN.get(e.id)); }
  else if(t.afficher==='lignes0') Rv=R.filter(e=>!rowN.get(e.id));
  else if(t.afficher==='colonnes0') Kv=K.filter(e=>!colN.get(e.id));
  const avF=[Rv.length, Kv.length], fl=(v.fL||'').trim().toLowerCase(), fc=(v.fC||'').trim().toLowerCase();
  const nomDe=new Map(), nm=e=>{ let x=nomDe.get(e); if(x===undefined){ x=capMxNom(e); nomDe.set(e,x); } return x; };
  const filtre=(L,q)=>q?L.filter(e=>(nm(e)+' '+capAnaHuman(e.typeName)).toLowerCase().includes(q)):L;
  Rv=filtre(Rv,fl); Kv=filtre(Kv,fc);
  const coll=new Intl.Collator('fr',{numeric:true, sensitivity:'base'}), fr=(a,b)=>coll.compare(String(a),String(b));   // un comparateur partagé (tri de milliers d'éléments)
  const ownDe=new Map(), own=e=>{ let x=ownDe.get(e); if(x===undefined){ const p=capGetElementById_(parentOf[e.id]); x=p?capMxNom(p):''; ownDe.set(e,x); } return x; };
  const tri=(L,s,N)=>{ const f={nom:(a,b)=>fr(nm(a),nm(b)), nombre:(a,b)=>(N.get(a.id)||0)-(N.get(b.id)||0)||fr(nm(a),nm(b)),
    proprietaire:(a,b)=>fr(own(a),own(b))||fr(nm(a),nm(b)), type:(a,b)=>fr(capAnaHuman(a.typeName),capAnaHuman(b.typeName))||fr(nm(a),nm(b))}[s&&s.k]||((a,b)=>fr(nm(a),nm(b)));
    const d=s&&s.d<0?-1:1; return L.slice().sort((a,b)=>f(a,b)*d); };
  Rv=tri(Rv,v.triL,rowN); Kv=tri(Kv,v.triC,colN);
  // Groupes : propriétaire, couche ou famille ; ligne de groupe repliable, colonne de groupe quand le groupe est replié
  const grp=capMxGroupes(), gk=e=>v.grouper==='proprietaire'?'p'+(parentOf[e.id]||''):v.grouper==='couche'?'g'+capMxGroupeDe(e):'';
  const glab=k=>{ if(k[0]==='p'){ const p=capGetElementById_(k.slice(1)); return p?capMxNom(p):_L('(racine)'); } const g=grp.find(x=>x.k===k.slice(1)); return g?g.t:(k.slice(1)||_L('(sans)')); };
  const gordre=(a,b)=>v.grouper==='couche'?grp.findIndex(x=>'g'+x.k===a)-grp.findIndex(x=>'g'+x.k===b):fr(glab(a),glab(b));
  const grouper=L=>{ if(v.grouper!=='proprietaire'&&v.grouper!=='couche') return null; const g=new Map(); L.forEach(e=>{ const k=gk(e); if(!g.has(k)) g.set(k,[]); g.get(k).push(e); }); return [...g.entries()].sort((a,b)=>gordre(a[0],b[0])); };
  const ouvert=(ax,k)=>v.ouverts[ax+k]!==false;
  const rows=[], cols=[], bands=[], gR=grouper(Rv), gC=grouper(Kv);
  if(gR) gR.forEach(([k,mb])=>{ const op=ouvert('r',k); rows.push({k:'g', gk:k, lab:glab(k), mb, open:op}); if(op) mb.forEach(e=>rows.push({k:'e', e, gk:k, ind:1})); });
  else Rv.forEach(e=>rows.push({k:'e', e}));
  if(gC) gC.forEach(([k,mb])=>{ const st=cols.length, op=ouvert('c',k); if(op) mb.forEach(e=>cols.push({k:'e', e, gk:k})); else cols.push({k:'g', gk:k, lab:glab(k), mb}); bands.push({gk:k, lab:glab(k), st, len:cols.length-st, open:op, n:mb.length}); });
  else Kv.forEach(e=>cols.push({k:'e', e}));
  // Totaux des groupes (lignes et colonnes de groupe)
  const aggR=new Map(), aggC=new Map(), aggB=new Map(), inc=(m,k,n)=>m.set(k,(m.get(k)||0)+n);
  if(gR||gC){ const RvS=new Set(Rv.map(e=>e.id)), KvS=new Set(Kv.map(e=>e.id)), gkId=id=>gk(capGetElementById_(id));
    cells.forEach((m,r)=>{ if(!RvS.has(r)) return; const kr=gR?gkId(r):''; m.forEach((x,c)=>{ if(!KvS.has(c)) return; const n=x.o.length+x.i.length, kc=gC?gkId(c):'';
      if(gR) inc(aggR,kr+'\u0001'+c,n); if(gC) inc(aggC,r+'\u0001'+kc,n); if(gR&&gC) inc(aggB,kr+'\u0001'+kc,n); }); }); }
  return {t, v, C, R, K, Rv, Kv, cells, rowN, colN, nl:vus.size, nCel, nR0, nC0, avF, rows, cols, bands, aggR, aggC, aggB, max, S:v.taille};
}

/** Contenu d'une cellule affichée : liens (élément × élément) ou total d'un groupe replié.
 * @param {object} X - Matrice @param {object} ri - Ligne affichée @param {object} ci - Colonne affichée
 * @returns {?{x:object}|{agg:number}} */
function capMxVal(X, ri, ci){
  if(ri.k==='e'&&ci.k==='e'){ const m=X.cells.get(ri.e.id), x=m&&m.get(ci.e.id); return x?{x}:null; }
  const n=ri.k==='g'&&ci.k==='g'?X.aggB.get(ri.gk+'\u0001'+ci.gk):ri.k==='g'?X.aggR.get(ri.gk+'\u0001'+ci.e.id):X.aggC.get(ri.e.id+'\u0001'+ci.gk);
  return n?{agg:n}:null;
}

/* ── Marques des cellules (personnalisables par relation) ──────────────────────────────────────────────────── */

/** Marque d'une relation dans l'onglet : couleur, forme, texte (défaut : couleur de la relation, flèche).
 * @param {string} k - Clé de relation @param {object} [t] - Onglet @returns {{c:string, f:string, t:string}} */
function capMxStyle(k, t){
  t=t||capMxTab(); const s=(t.vue.styles||{})[k]||{}, r=capMxRelations().by[k];
  return {c:s.c||(r&&r.c)||'#8b949e', f:s.f||'fleche', t:s.t||''};
}

/** Dessin d'une marque (SVG ou texte). @param {{c,f,t}} st - Marque @param {'o'|'i'|'b'} d - Sens (ligne → colonne, colonne → ligne,
 * les deux) @param {number} z - Taille (px) @returns {string} HTML */
function capMxSvg(st, d, z){
  const c=st.c, f=st.f;
  if(f==='texte') return `<span class="cmx-tx" style="color:${typeof capTextOn==='function'?capTextOn(c):c};font-size:${Math.max(8,Math.round(z*0.62))}px">${capEsc(String(st.t||'?').slice(0,3))}</span>`;
  const svg=(inner,w,fill)=>`<svg width="${z}" height="${z}" viewBox="0 0 20 20" fill="${fill||'none'}" style="stroke:${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  if(f==='fleche'||f==='tirets'||f==='epaisse'){
    const da=f==='tirets'?' stroke-dasharray="3.2 2.6"':'';
    const p=d==='o'?`<path d="M4 16 L16 4"${da}/><path d="M9.5 4 H16 V10.5"/>`:d==='i'?`<path d="M16 4 L4 16"${da}/><path d="M10.5 16 H4 V9.5"/>`:`<path d="M4 16 L16 4"${da}/>`;
    return svg(p, f==='epaisse'?3.4:2.1);
  }
  if(f==='coche') return svg('<path d="M4 10.5 L8.5 15 L16 5.5"/>',2.6);
  if(f==='croix') return svg('<path d="M5 5 L15 15 M15 5 L5 15"/>',2.6);
  const fs=`style="fill:${d==='i'?'none':c}"`, ring=d==='b'?'<circle cx="10" cy="10" r="8.7" fill="none" stroke-width="1.3"/>':'', r=d==='b'?0.75:1;
  const shape=f==='carre'?`<rect x="${10-5.5*r}" y="${10-5.5*r}" width="${11*r}" height="${11*r}" rx="1.5" ${fs}/>`
    :f==='losange'?`<path d="M10 ${10-7*r} L${10+7*r} 10 L10 ${10+7*r} L${10-7*r} 10 Z" ${fs}/>`:`<circle cx="10" cy="10" r="${5.6*r}" ${fs}/>`;
  return svg(shape+ring,1.8);
}

/** Contenu HTML d'une cellule : marque de la relation (ou petites marques de chaque relation), nombre, ou fond gradué en mode #.
 * @param {object} X - Matrice @param {object} x - Liens de la cellule {o, i} @returns {{cls:string, html:string, style:string}} */
function capMxGlyphe(X, x){
  const S=X.S, n=x.o.length+x.i.length, keys=X.t.relations.filter(k=>x.o.some(e=>e.r===k)||x.i.some(e=>e.r===k));
  if(X.v.cellule==='nombre'){ const col=keys.length===1?capMxStyle(keys[0],X.t).c:'var(--c-accent)', a=Math.round(16+52*Math.log(1+n)/Math.log(1+X.max));
    return {cls:'num', html:String(n), style:`background:color-mix(in srgb,${col} ${a}%,transparent)`}; }
  const dir=k=>{ const o=x.o.some(e=>e.r===k), i=x.i.some(e=>e.r===k); return o&&i?'b':o?'o':'i'; };
  if(keys.length===1) return {cls:'', style:'', html:capMxSvg(capMxStyle(keys[0],X.t), dir(keys[0]), Math.max(10,S-7))+(n>1?`<span class="cmx-cn">${n}</span>`:'')};
  const z=Math.max(6,Math.floor(S/2)-1);
  return {cls:'multi', style:'', html:keys.slice(0,4).map(k=>capMxSvg(capMxStyle(k,X.t), dir(k), z)).join('')+(keys.length>4?'<span class="cmx-cn">+</span>':'')};
}

/* ── Rendu de la vue ────────────────────────────────────────────────────────────────────────────────────────── */

/** Rend la vue ▦ Matrice dans #cap-view-matrix : squelette (une fois), onglets, critères, barre, grille. */
function capRenderMatrix(){
  const box=document.getElementById('cap-view-matrix'); if(!box) return;
  if(!box._mx){
    box.innerHTML=`<div class="cap-ttabbar cmx-tabs" id="cmx-tabs"></div><section class="cmx-crit" id="cmx-crit" aria-label="${_L('Critères de la matrice')}"></section>
      <div class="cmx-bar" id="cmx-bar" role="toolbar" aria-label="${_L('Affichage de la matrice')}"></div>
      <div class="cmx-grid" id="cmx-grid"><div class="cmx-corner" id="cmx-corner"></div>
        <div class="cmx-ch" id="cmx-ch"><div class="cmx-inn" id="cmx-ch-in"></div></div><div class="cmx-rh" id="cmx-rh"><div class="cmx-inn" id="cmx-rh-in"></div></div>
        <div class="cmx-body" id="cmx-body" tabindex="0" role="region" aria-roledescription="${_L('matrice')}" aria-label="${_L('Matrice : flèches pour se déplacer, Entrée pour voir les liens d\'une cellule')}">
          <div class="cmx-sizer" id="cmx-sizer"><div id="cmx-gbs"></div><div class="cmx-sl" id="cmx-slr"></div><div class="cmx-sl" id="cmx-slc"></div>
            <div class="cmx-hl" id="cmx-hlr"></div><div class="cmx-hl" id="cmx-hlc"></div><div id="cmx-cells"></div><div class="cmx-act" id="cmx-act"></div></div>
          <div class="cmx-empty" id="cmx-empty"></div></div></div>
      <div class="cmx-legend" id="cmx-legend"></div><div class="cmx-status" id="cmx-status" role="status"></div>`;
    capMxWire(box); box._mx=true;
  }
  capMxTabsEnsure();
  capMxTabsRender(); capMxCritRender(); capMxBarRender(); capMxGrille();
}

/** Barre d'onglets : clic = afficher, double-clic = renommer, ✕ = fermer, + = copie de l'onglet affiché ; à droite :
 * 📚 Préréglages, 📂 Ouvrir, 💾 Enregistrer une définition (.json). */
function capMxTabsRender(){
  const bar=document.getElementById('cmx-tabs'); if(!bar) return;
  const esc=capEsc, T=_capMx.tabs;
  bar.innerHTML=T.map((t,i)=>`<div class="cap-ttab${i===_capMx.idx?' active':''}" data-mxt="${i}" title="${_L('Clic : afficher · double-clic : renommer')}"><span class="cmx-tn">${esc(t.nom)}</span>${T.length>1?`<span class="cap-ttab-close" data-mxx="${i}" title="${_L('Fermer cet onglet')}">✕</span>`:''}</div>`).join('')
    +`<span class="cap-ttab-add" data-mx="add" title="${_L('Nouvel onglet (copie de la matrice affichée)')}">+</span>
    <span class="cmx-tabs-acts"><button class="cap-lf-btn" data-mx="presets" title="${_L('Matrices toutes prêtes pour le format du modèle ouvert')}">${_L('📚 Préréglages ▾')}</button><button class="cap-lf-btn" data-mx="ouvrir" title="${_L('Ouvrir une définition de matrice (.json) dans un nouvel onglet')}">${_L('📂 Ouvrir')}</button><button class="cap-lf-btn" data-mx="enregistrer" title="${_L('Enregistrer la définition de l\'onglet (.json)')}">${_L('💾 Enregistrer')}</button></span>`;
  bar.querySelectorAll('[data-mxt]').forEach(d=>{
    d.onclick=e=>{ if(e.target.closest('[data-mxx]')) return; const i=+d.dataset.mxt; if(i!==_capMx.idx){ _capMx.idx=i; _capMxUi.sel=null; _capMxUi.act=null; capRenderMatrix(); } };
    d.ondblclick=()=>{ const t=_capMx.tabs[+d.dataset.mxt], sp=d.querySelector('.cmx-tn'), inp=document.createElement('input'); inp.className='cap-ttab-rename'; inp.value=t.nom;
      sp.replaceWith(inp); inp.focus(); inp.select();
      const ok=()=>{ t.nom=inp.value.trim()||t.nom; capMxTabsChanged(); capRenderMatrix(); };
      inp.onblur=ok; inp.onkeydown=e=>{ if(e.key==='Enter') ok(); if(e.key==='Escape') capMxTabsRender(); }; };
  });
  bar.querySelectorAll('[data-mxx]').forEach(x=>x.onclick=async e=>{
    e.stopPropagation(); const i=+x.dataset.mxx, t=_capMx.tabs[i];
    if(!await capConfirm(_L(`Fermer l'onglet « ${t.nom} » ?`),{ok:_L('Fermer')})) return;
    _capMx.tabs.splice(i,1); if(_capMx.idx>i||_capMx.idx>=_capMx.tabs.length) _capMx.idx=Math.max(0,_capMx.idx-1);
    capMxTabsChanged(); capRenderMatrix();
  });
}

/** Libellé court d'une liste de types. @param {string[]} ts - Types @returns {string} */
function capMxTypesLib(ts){ if(!ts||!ts.length) return '—'; const h=ts.map(capAnaHuman); return h.length>2?h.slice(0,2).join(', ')+' +'+(h.length-2):h.join(', '); }

/** Zone des critères (repliable) : types, couches ou familles et portée des lignes et des colonnes, ⇄ changer d'axes,
 * critère (relations), sens, éléments affichés. */
function capMxCritRender(){
  const el=document.getElementById('cmx-crit'); if(!el) return;
  const t=capMxTab(), esc=capEsc, C=capMxRelations(), G=capMxGroupes(), cnt={};
  capAllElements.forEach(e=>{ cnt[e.typeName]=(cnt[e.typeName]||0)+1; });
  const gType=ty=>{ const g={}; capAllElements.forEach(e=>{ if(e.typeName===ty){ const k=capMxGroupeDe(e); g[k]=(g[k]||0)+1; } }); const k=Object.entries(g).sort((a,b)=>b[1]-a[1])[0]; return k?k[0]:''; };
  const axis=(ax,lab)=>{
    const A=t[ax], pr=A.portee.ids, n=capMxAxe(A,[]).length;
    const types=A.types.map(ty=>`<span class="cmx-chip" title="${esc(ty)}"><i style="background:${(G.find(g=>g.k===gType(ty))||{}).c||'#8b949e'}"></i><span>${esc(capAnaHuman(ty))}</span><span class="cmx-n">${cnt[ty]||0}</span><b data-mxrt="${ax}" data-ty="${esc(ty)}" title="${_L('Retirer ce type')}">✕</b></span>`).join('');
    const prl=pr.length?(pr.length===1?esc(capMxNom(capGetElementById_(pr[0]))):_L(`${pr.length} éléments`))+(A.portee.direct?_L(' (directement)'):''):_L('tout le modèle');
    return `<div class="cmx-axis"><div class="cmx-axis-t"><span class="cmx-k">${lab}</span><span class="ana-dim">${_L(`${n} élément(s)`)}</span></div>
      <div class="cmx-fld"><span class="cmx-lab">${_L('Types')}</span><div class="cmx-chips">${types}<button class="cmx-add" data-mxtypes="${ax}">${_L('＋ Types…')}</button></div></div>
      <div class="cmx-fld"><span class="cmx-lab">${capMxFormat()==='capella'?_L('Couches'):_L('Familles')}</span><div class="cmx-chips">${G.map(g=>`<button class="cmx-lay${A.couches.includes(g.k)?' on':''}" style="--lc:${g.c}" data-mxlay="${ax}" data-k="${esc(g.k)}" title="${esc(g.t)}">${esc(g.l)}</button>`).join('')}<span class="ana-dim cmx-toutes">${A.couches.length?'':_L('toutes')}</span>
        <button class="cap-lf-btn cmx-portee${pr.length?' active':''}" data-mxportee="${ax}" title="${_L('Limiter aux éléments contenus dans des paquetages, composants, fonctions… choisis')}">${_L('🎯 Portée : ')}${prl}</button></div></div></div>`;
  };
  const rels=t.relations.map(k=>{ const r=C.by[k]; return r?`<span class="cmx-chip" title="${esc(r.g)}"><i style="background:${capMxStyle(k,t).c}"></i><span>${esc(r.l)}</span><b data-mxrr="${esc(k)}" title="${_L('Retirer cette relation')}">✕</b></span>`
    :`<span class="cmx-chip off" title="${_L('Relation absente de ce modèle')}"><span>${esc(k)}</span><b data-mxrr="${esc(k)}">✕</b></span>`; }).join('');
  const sens=CAP_MX_SENS.find(s=>s[0]===t.sens)||CAP_MX_SENS[2], aff=CAP_MX_AFF.find(a=>a[0]===t.afficher)||CAP_MX_AFF[0];
  const sum=_L(`Lignes : ${esc(capMxTypesLib(t.lignes.types))} · Colonnes : ${esc(capMxTypesLib(t.colonnes.types))} · Critère : ${t.relations.length} relation(s) · Sens : ${esc(sens[1])} · Afficher : ${esc(aff[1])}`);
  el.classList.toggle('ferme',!_capMx.critOuvert);
  el.innerHTML=`<div class="cmx-crit-h"><button class="cmx-tog" data-mx="crit" aria-expanded="${_capMx.critOuvert}" title="${_L('Replier ou déplier la zone des critères')}">${_capMx.critOuvert?'▾':'▸'} ${_L('Critères')}</button><span class="cmx-crit-sum">${_capMx.critOuvert?'':sum}</span></div>
    <div class="cmx-crit-b">${axis('lignes',_L('Lignes'))}<div class="cmx-swap"><button data-mx="swap" title="${_L('Changer d\'axes : les lignes deviennent les colonnes (le sens s\'inverse)')}">⇄</button><span>${_L('Changer<br>d\'axes')}</span></div>${axis('colonnes',_L('Colonnes'))}
      <div class="cmx-crit-rel"><div class="cmx-fld cmx-wide"><span class="cmx-lab">${_L('Critère')}</span><div class="cmx-chips">${rels}<button class="cmx-add" data-mx="rels" title="${_L('Choisir les relations comptées dans les cellules')}">${_L('＋ Relations…')}</button></div></div>
        <div class="cmx-fld"><span class="cmx-lab">${_L('Sens')}</span><span class="cmx-seg">${CAP_MX_SENS.map(([k,l,tt])=>`<button class="cap-lf-btn${t.sens===k?' active':''}" data-mxsens="${k}" title="${tt}">${l}</button>`).join('')}</span></div>
        <div class="cmx-fld"><span class="cmx-lab">${_L('Afficher')}</span><select class="inp cmx-sel" data-mx="aff" aria-label="${_L('Éléments affichés')}">${CAP_MX_AFF.map(([k,l])=>`<option value="${k}"${t.afficher===k?' selected':''}>${l}</option>`).join('')}</select></div></div></div>`;
  el.querySelectorAll('[data-mxrt]').forEach(b=>b.onclick=()=>{ const A=t[b.dataset.mxrt]; A.types=A.types.filter(x=>x!==b.dataset.ty); capMxMaj(); });
  el.querySelectorAll('[data-mxlay]').forEach(b=>b.onclick=()=>{ const A=t[b.dataset.mxlay], k=b.dataset.k; A.couches=A.couches.includes(k)?A.couches.filter(x=>x!==k):[...A.couches,k]; capMxMaj(); });
  el.querySelectorAll('[data-mxtypes]').forEach(b=>b.onclick=()=>capMxPopTypes(b, b.dataset.mxtypes));
  el.querySelectorAll('[data-mxportee]').forEach(b=>b.onclick=()=>capMxPortee_(b.dataset.mxportee));
  el.querySelectorAll('[data-mxrr]').forEach(b=>b.onclick=()=>{ t.relations=t.relations.filter(x=>x!==b.dataset.mxrr); capMxMaj(); });
  el.querySelectorAll('[data-mxsens]').forEach(b=>b.onclick=()=>{ t.sens=b.dataset.mxsens; capMxMaj(); });
  el.querySelector('[data-mx="aff"]').onchange=e=>{ t.afficher=e.target.value; capMxMaj(); };
}

/** Ouvre la fenêtre 🎯 Portée (celle du ▤ Tableau, 51) pour un axe de l'onglet. @param {'lignes'|'colonnes'} ax - Axe */
function capMxPortee_(ax){
  const t=capMxTab();
  capTableScopeDialog({scope:t[ax].portee, titre:ax==='lignes'?_L(`🎯 Portée des lignes — « ${t.nom} »`):_L(`🎯 Portée des colonnes — « ${t.nom} »`),
    sous:ax==='lignes'?_L('Les lignes de la matrice sont les éléments des <b>types choisis</b> <b>contenus</b> dans les éléments choisis ici. Sans élément choisi : tout le modèle.')
      :_L('Les colonnes de la matrice sont les éléments des <b>types choisis</b> <b>contenus</b> dans les éléments choisis ici. Sans élément choisi : tout le modèle.'),
    change:()=>capMxMaj()});
}

/** Met à jour critères, barre et grille après un changement de l'onglet. */
function capMxMaj(){ capMxTabsChanged(); capMxCritRender(); capMxBarRender(); capMxGrille(); }

/** Barre d'affichage : grouper, tri, cellule, taille, filtres, 🎨 marques, 🏷 légende, exports. */
function capMxBarRender(){
  const b=document.getElementById('cmx-bar'); if(!b) return;
  const t=capMxTab(), v=t.vue, esc=capEsc, tl=s=>{ const x=CAP_MX_TRI.find(y=>y[0]===s.k)||CAP_MX_TRI[0]; return x[1].toLowerCase()+(s.d>0?' ▲':' ▼'); };
  b.innerHTML=`<span class="tb-grp"><span class="tb-grp-l">${_L('Grouper')}</span><span class="cmx-seg">${[['aucun',_L('Aucun')],['proprietaire',_L('Propriétaire')],['couche',capMxFormat()==='capella'?_L('Couche'):_L('Famille')]].map(([k,l])=>`<button class="cap-lf-btn${v.grouper===k?' active':''}" data-mxgrp="${k}">${l}</button>`).join('')}</span></span>
    <button class="cap-lf-btn" data-mx="tri" title="${_L('Tri des lignes et des colonnes')}">${_L(`⇅ Tri : ${tl(v.triL)} · ${tl(v.triC)} ▾`)}</button>
    <span class="tb-grp"><span class="tb-grp-l">${_L('Cellule')}</span><span class="cmx-seg"><button class="cap-lf-btn${v.cellule!=='nombre'?' active':''}" data-mxcel="fleche" title="${_L('Marque de chaque relation (flèche de la source vers la cible) ; nombre si plusieurs liens')}">${_L('↗ Marques')}</button><button class="cap-lf-btn${v.cellule==='nombre'?' active':''}" data-mxcel="nombre" title="${_L('Nombre de liens, fond d\'autant plus marqué qu\'il y en a')}">${_L('＃ Nombre')}</button></span></span>
    <span class="tb-grp"><button class="cap-lf-btn" data-mx="sz-" title="${_L('Cellules plus petites')}">−</button><span class="ana-dim cmx-mono">${v.taille}px</span><button class="cap-lf-btn" data-mx="sz+" title="${_L('Cellules plus grandes')}">+</button></span>
    <input class="inp cmx-f" data-mx="fL" placeholder="${_L('🔍 Filtrer les lignes…')}" value="${esc(v.fL)}" aria-label="${_L('Filtrer les lignes par nom ou type')}">
    <input class="inp cmx-f" data-mx="fC" placeholder="${_L('🔍 Filtrer les colonnes…')}" value="${esc(v.fC)}" aria-label="${_L('Filtrer les colonnes par nom ou type')}">
    <button class="cap-lf-btn" data-mx="styles" title="${_L('Couleur, forme et texte de la marque de chaque relation')}">${_L('🎨 Marques')}</button>
    <button class="cap-lf-btn${_capMx.legende?' active':''}" data-mx="leg" title="${_L('Afficher ou masquer la légende')}">${_L('🏷 Légende')}</button>
    <span style="flex:1"></span>
    <button class="cap-lf-btn" data-mx="csv" title="${_L('Exporter en CSV : la matrice ou la liste des liens')}">${_L('⬇ CSV ▾')}</button><button class="cap-lf-btn" data-mx="xlsx" title="${_L('Exporter en Excel : feuilles « Matrice » et « Liens »')}">${_L('⬇ Excel')}</button><button class="cap-lf-btn" data-mx="copier" title="${_L('Copier la matrice affichée (à coller dans Excel ou Word)')}">${_L('📋 Copier')}</button>`;
  b.querySelectorAll('[data-mxgrp]').forEach(x=>x.onclick=()=>{ v.grouper=x.dataset.mxgrp; capMxBarRender(); capMxGrille(); });
  b.querySelectorAll('[data-mxcel]').forEach(x=>x.onclick=()=>{ v.cellule=x.dataset.mxcel; capMxBarRender(); capMxGrille(); });
  b.querySelector('[data-mx="fL"]').oninput=e=>{ v.fL=e.target.value; capMxGrille(); };
  b.querySelector('[data-mx="fC"]').oninput=e=>{ v.fC=e.target.value; capMxGrille(); };
}

/** Calcule la matrice de l'onglet et redessine la grille (coin, en-têtes, corps visible), le statut et la légende. */
function capMxGrille(){
  const g=document.getElementById('cmx-grid'); if(!g) return;
  const X=_capMxX=capMxCalc(), S=X.S, v=X.v, esc=capEsc;
  X.bandH=X.bands.length?22:0;
  g.style.setProperty('--rw',v.rw+'px'); g.style.setProperty('--hh',v.hh+'px');
  document.getElementById('cmx-sizer').style.cssText=`width:${X.cols.length*S}px;height:${X.rows.length*S}px;background-size:${S}px ${S}px`;
  document.getElementById('cmx-corner').innerHTML=`<div class="cmx-big">${X.Rv.length} × ${X.Kv.length}<small>${esc(X.t.nom)}</small></div>
    <div class="cmx-lc" style="top:${Math.max(8,v.hh-72)}px">${_L('Colonnes →')}<br><span class="cmx-mono">${esc(capMxTypesLib(X.t.colonnes.types))}</span></div>
    <div class="cmx-lr">${_L('Lignes ↓')} <span class="cmx-mono">${esc(capMxTypesLib(X.t.lignes.types))}</span></div><div class="cmx-ls" title="${_L('Nombre de liens de la ligne (colonne Σ) ou de la colonne (ligne Σ)')}">Σ</div>
    <div class="cmx-grip-x" data-mxgrip="x" title="${_L('Glisser : largeur des noms de lignes')}"></div><div class="cmx-grip-y" data-mxgrip="y" title="${_L('Glisser : hauteur des en-têtes de colonnes')}"></div>`;
  const t=X.t, vide=!t.lignes.types.length?[_L('Aucun type de lignes'),_L('Choisissez les types des lignes dans les critères (＋ Types…), ou un 📚 préréglage.')]
    :!t.colonnes.types.length?[_L('Aucun type de colonnes'),_L('Choisissez les types des colonnes dans les critères (＋ Types…).')]
    :!t.relations.length?[_L('Aucun critère'),_L('Choisissez une ou plusieurs relations (＋ Relations…).')]
    :(!X.rows.length||!X.cols.length)?[_L('Rien à afficher'),t.afficher==='avec'?_L(`Aucune relation entre ces lignes et ces colonnes. « Afficher : tous les éléments » montre les ${X.R.length} ligne(s) et ${X.K.length} colonne(s).`):_L('Aucun élément ne correspond aux critères et aux filtres.')]:null;
  const em=document.getElementById('cmx-empty'); em.style.display=vide?'grid':'none'; em.innerHTML=vide?`<div><b>${esc(vide[0])}</b>${esc(vide[1])}</div>`:'';
  if(_capMxUi.act&&(_capMxUi.act.r>=X.rows.length||_capMxUi.act.c>=X.cols.length)) _capMxUi.act=null;
  capMxPaint(); capMxStatus(); capMxLegende();
}

let _capMxRaf=0;
/** Redessin de la fenêtre visible au prochain affichage (défilement, redimensionnement). */
function capMxPaintLater(){ if(!_capMxRaf) _capMxRaf=requestAnimationFrame(()=>{ _capMxRaf=0; capMxPaint(); }); }

/** Dessine la fenêtre visible de la grille : cellules non vides du corps, en-têtes de lignes et de colonnes (bande des
 * groupes, noms verticaux, ligne Σ), sélection, cellule active, survol. Seule la fenêtre visible (plus une marge) est dans la page. */
function capMxPaint(){
  const X=_capMxX, body=document.getElementById('cmx-body'); if(!X||!body||!body.offsetParent) return;
  const S=X.S, st=body.scrollTop, sl=body.scrollLeft, h=body.clientHeight, w=body.clientWidth, esc=capEsc;
  const r0=Math.max(0,Math.floor(st/S)-4), r1=Math.min(X.rows.length,Math.ceil((st+h)/S)+4);
  const c0=Math.max(0,Math.floor(sl/S)-4), c1=Math.min(X.cols.length,Math.ceil((sl+w)/S)+4);
  let hb='', gb='', nDom=0;
  for(let r=r0;r<r1;r++){ const ri=X.rows[r];
    if(ri.k==='g') gb+=`<div class="cmx-gb" style="top:${r*S}px;height:${S}px;width:${X.cols.length*S}px"></div>`;
    for(let c=c0;c<c1;c++){ const vv=capMxVal(X,ri,X.cols[c]); if(!vv) continue; nDom++;
      if(vv.agg) hb+=`<div class="cmx-c agg" style="left:${c*S}px;top:${r*S}px;width:${S}px;height:${S}px">${vv.agg}</div>`;
      else { const gl=capMxGlyphe(X,vv.x); hb+=`<div class="cmx-c ${gl.cls}" style="left:${c*S}px;top:${r*S}px;width:${S}px;height:${S}px;${gl.style}">${gl.html}</div>`; } } }
  for(let c=c0;c<c1;c++) if(X.cols[c].k==='g') gb+=`<div class="cmx-gb" style="left:${c*S}px;top:0;width:${S}px;height:${X.rows.length*S}px"></div>`;
  document.getElementById('cmx-cells').innerHTML=hb; document.getElementById('cmx-gbs').innerHTML=gb; X.nDom=nDom;
  const sel=_capMxUi.sel, ico=S>=16;
  let hr='';
  for(let r=r0;r<r1;r++){ const ri=X.rows[r];
    if(ri.k==='g'){ const n=ri.mb.reduce((s,e)=>s+(X.rowN.get(e.id)||0),0);
      hr+=`<div class="cmx-r g" data-r="${r}" style="top:${r*S}px;height:${S}px" title="${esc(ri.lab)} — ${ri.open?_L('clic : replier'):_L('clic : déplier')}"><span class="cmx-tg">${ri.open?'▾':'▸'}</span><span class="cmx-nm">${esc(ri.lab)}<small>${ri.mb.length}</small></span><span class="cmx-sig">${n||''}</span></div>`; }
    else { const e=ri.e, s=sel&&sel.ax==='r'&&sel.id===e.id, lv=(CAP_LAYERS[e.layer]||{}).color||'#8b949e';
      hr+=`<div class="cmx-r e${ri.ind?' ind':''}${s?' sel':''}" data-r="${r}" data-id="${esc(e.id)}" style="top:${r*S}px;height:${S}px" title="${esc(capMxNom(e))} · ${esc(capAnaHuman(e.typeName))}">${ico?capIco(e.id,Math.min(15,S-6)):`<i class="cmx-dot" style="background:${lv}"></i>`}<span class="cmx-nm">${esc(capMxNom(e))}</span><span class="cmx-sig">${X.rowN.get(e.id)||''}</span></div>`; } }
  const rin=document.getElementById('cmx-rh-in'); rin.style.height=X.rows.length*S+'px'; rin.style.transform=`translateY(${-st}px)`;
  rin.innerHTML=hr+'<div class="cmx-hl" id="cmx-rh-hl" style="left:0;right:0"></div>';
  const vhH=Math.max(30,X.v.hh-X.bandH-20); let hc='';
  X.bands.forEach(b=>{ if(b.st+b.len<c0||b.st>c1) return;
    hc+=`<div class="cmx-band" data-b="${esc(b.gk)}" style="left:${b.st*S}px;width:${b.len*S}px" title="${esc(b.lab)} (${b.n}) — ${b.open?_L('clic : replier'):_L('clic : déplier')}">${b.open?'▾':'▸'} ${esc(b.lab)} <span class="ana-dim">${b.n}</span></div>`; });
  for(let c=c0;c<c1;c++){ const ci=X.cols[c];
    if(ci.k==='g'){ const n=ci.mb.reduce((s,e)=>s+(X.colN.get(e.id)||0),0);
      hc+=`<div class="cmx-vh agg" data-c="${c}" style="left:${c*S}px;top:${X.bandH}px;width:${S}px;height:${vhH}px" title="${esc(ci.lab)} — ${_L('clic : déplier')}"><span class="cmx-vt" style="line-height:${S}px">▸ ${esc(ci.lab)}</span></div><div class="cmx-cs" style="left:${c*S}px;width:${S}px">${n||''}</div>`; }
    else { const e=ci.e, s=sel&&sel.ax==='c'&&sel.id===e.id, lv=(CAP_LAYERS[e.layer]||{}).color||'#8b949e';
      hc+=`<div class="cmx-vh${s?' sel':''}" data-c="${c}" data-id="${esc(e.id)}" style="left:${c*S}px;top:${X.bandH}px;width:${S}px;height:${vhH}px" title="${esc(capMxNom(e))} · ${esc(capAnaHuman(e.typeName))}"><span class="cmx-vt" style="line-height:${S}px;bottom:${ico?S:4}px">${esc(capMxNom(e))}</span>${ico?`<span class="cmx-vi">${capIco(e.id,Math.min(14,S-6))}</span>`:`<i class="cmx-dot cmx-vd" style="background:${lv}"></i>`}</div><div class="cmx-cs${s?' sel':''}" style="left:${c*S}px;width:${S}px">${X.colN.get(e.id)||''}</div>`; } }
  const cin=document.getElementById('cmx-ch-in'); cin.style.width=X.cols.length*S+'px'; cin.style.transform=`translateX(${-sl}px)`;
  cin.innerHTML=hc+'<div class="cmx-hl" id="cmx-ch-hl" style="top:0;bottom:0"></div>';
  const slr=document.getElementById('cmx-slr'), slc=document.getElementById('cmx-slc'); slr.style.display=slc.style.display='none';
  if(sel){ if(sel.ax==='r'){ const r=X.rows.findIndex(x=>x.k==='e'&&x.e.id===sel.id); if(r>=0) Object.assign(slr.style,{display:'block',top:r*S+'px',height:S+'px',left:0,width:X.cols.length*S+'px'}); }
    else { const c=X.cols.findIndex(x=>x.k==='e'&&x.e.id===sel.id); if(c>=0) Object.assign(slc.style,{display:'block',left:c*S+'px',width:S+'px',top:0,height:X.rows.length*S+'px'}); } }
  const a=document.getElementById('cmx-act'), A=_capMxUi.act;
  if(A) Object.assign(a.style,{display:'block',left:A.c*S+'px',top:A.r*S+'px',width:S+'px',height:S+'px'}); else a.style.display='none';
  capMxHover(_capMxUi.hov.r,_capMxUi.hov.c);
}

/** Survol : croix (ligne + colonne) dans le corps et les en-têtes. @param {number} r - Ligne @param {number} c - Colonne */
function capMxHover(r, c){
  _capMxUi.hov={r,c}; const X=_capMxX; if(!X) return;
  const S=X.S, ok=r>=0&&c>=0&&r<X.rows.length&&c<X.cols.length, el=id=>document.getElementById(id);
  const a=el('cmx-hlr'), b=el('cmx-hlc'), ra=el('cmx-rh-hl'), cb=el('cmx-ch-hl');
  if(!ok){ [a,b,ra,cb].forEach(x=>{ if(x) x.style.display='none'; }); return; }
  Object.assign(a.style,{display:'block',top:r*S+'px',height:S+'px',left:0,width:X.cols.length*S+'px'});
  Object.assign(b.style,{display:'block',left:c*S+'px',width:S+'px',top:0,height:X.rows.length*S+'px'});
  if(ra) Object.assign(ra.style,{display:'block',top:r*S+'px',height:S+'px'});
  if(cb) Object.assign(cb.style,{display:'block',left:c*S+'px',width:S+'px'});
}

/** Ligne de statut : dimensions, liens, éléments sans relation masqués (liens pour tout afficher), filtres, masqués à la main. */
function capMxStatus(){
  const el=document.getElementById('cmx-status'), X=_capMxX; if(!el||!X) return;
  const t=X.t, v=t.vue, P=[_L(`<b>${X.Rv.length}</b> ligne(s) × <b>${X.Kv.length}</b> colonne(s)`), _L(`<b>${X.nl}</b> lien(s) dans <b>${X.nCel}</b> cellule(s)`)];
  if(t.afficher==='avec'&&(X.nR0||X.nC0)) P.push(_L(`${X.nR0} ligne(s) et ${X.nC0} colonne(s) sans relation masquées`)+` · <a data-mxst="tous">${_L('tout afficher')}</a> · <a data-mxst="lignes0">${_L('voir les lignes sans relation')}</a>`);
  if(t.afficher!=='avec') P.push(`<a data-mxst="avec">${_L('n\'afficher que les éléments reliés')}</a>`);
  if(v.fL||v.fC) P.push(_L(`filtres : ${X.avF[0]-X.Rv.length} ligne(s) et ${X.avF[1]-X.Kv.length} colonne(s) écartées`));
  if(v.mL.length||v.mC.length) P.push(_L(`${v.mL.length+v.mC.length} masquée(s) à la main`)+` · <a data-mxst="demasquer">${_L('tout réafficher')}</a>`);
  const tr=t.relations.filter(k=>k.startsWith('ch:')&&((_capAnaCache.mxCh||{})[k.slice(3)]||{}).tronque);
  if(tr.length) P.push(`<span style="color:var(--c-warn,#e3b341)">${_L('⚠ relation par chemin trop longue à calculer : résultat partiel')}</span>`);
  el.innerHTML=P.join(' <span class="ana-dim">·</span> ');
  el.querySelectorAll('[data-mxst]').forEach(a=>a.onclick=()=>{ const k=a.dataset.mxst; if(k==='demasquer'){ v.mL=[]; v.mC=[]; } else t.afficher=k; capMxMaj(); });
}

/** Légende : sens des marques, Σ, groupes repliés, et la marque de chaque relation de l'onglet (clic : la personnaliser). */
function capMxLegende(){
  const el=document.getElementById('cmx-legend'), X=_capMxX; if(!el||!X) return;
  el.style.display=_capMx.legende?'flex':'none'; if(!_capMx.legende) return;
  const t=X.t, C=X.C, esc=capEsc, fl={c:'var(--c-text)', f:'fleche'}, pt={c:'var(--c-text)', f:'point'};
  el.innerHTML=`<span>${capMxSvg(fl,'o',14)} ${_L('la ligne pointe vers la colonne')}</span><span>${capMxSvg(fl,'i',14)} ${_L('la colonne pointe vers la ligne')}</span><span>${capMxSvg(fl,'b',14)} ${_L('dans les deux sens')}</span>`
    +`<span title="${_L('Formes pleines, creuses ou cerclées : même sens que les flèches')}">${capMxSvg(pt,'o',12)}${capMxSvg(pt,'i',12)}${capMxSvg(pt,'b',12)} ${_L('plein · creux · cerclé')}</span>`
    +`<span><b class="cmx-mono">²</b> ${_L('nombre de liens')}</span><span><b class="cmx-mono">Σ</b> ${_L('liens de la ligne / de la colonne')}</span><span>${_L('▸ groupe replié : total du groupe')}</span><span class="cmx-legsep"></span>`
    +t.relations.filter(k=>C.by[k]).map(k=>`<span class="cmx-legrel" data-mxsty="${esc(k)}" title="${_L('Clic : personnaliser la marque')}">${capMxSvg(capMxStyle(k,t),'o',14)} ${esc(C.by[k].l)}</span>`).join('');
  el.querySelectorAll('[data-mxsty]').forEach(x=>x.onclick=()=>capMxPopStyles(x));
}

/* ── Interactions ───────────────────────────────────────────────────────────────────────────────────────────── */

/** Câblage de la vue (une fois) : défilement, survol, clics, clavier, en-têtes, menus, poignées, commandes data-mx. */
function capMxWire(box){
  const body=box.querySelector('#cmx-body');
  body.addEventListener('scroll',capMxPaintLater);
  window.addEventListener('resize',()=>{ if(box.offsetParent) capMxPaintLater(); });
  let tipT=0, tipK='';
  const pos=e=>{ const b=body.getBoundingClientRect(), S=_capMxX.S; return {r:Math.floor((e.clientY-b.top+body.scrollTop)/S), c:Math.floor((e.clientX-b.left+body.scrollLeft)/S)}; };
  body.addEventListener('mousemove',e=>{ if(!_capMxX) return; const {r,c}=pos(e); capMxHover(r,c);
    const k=r+'|'+c; if(k===tipK){ capMxTipPlace(e); return; } tipK=k; clearTimeout(tipT); capMxTip(null);
    tipT=setTimeout(()=>capMxTip(r,c,e),260); });
  body.addEventListener('mouseleave',()=>{ capMxHover(-1,-1); clearTimeout(tipT); tipK=''; capMxTip(null); });
  body.addEventListener('click',e=>{ if(!_capMxX) return; const {r,c}=pos(e); if(r<0||c<0||r>=_capMxX.rows.length||c>=_capMxX.cols.length) return;
    _capMxUi.act={r,c}; capMxPaint(); capMxCellule(r,c); });
  body.addEventListener('keydown',e=>{
    const X=_capMxX; if(!X||!X.rows.length||!X.cols.length) return;
    const a=_capMxUi.act||{r:0,c:0}, mv={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],PageUp:[-10,0],PageDown:[10,0]}[e.key];
    if(mv){ e.preventDefault(); _capMxUi.act={r:Math.max(0,Math.min(X.rows.length-1,a.r+mv[0])), c:Math.max(0,Math.min(X.cols.length-1,a.c+mv[1]))}; capMxVisible(_capMxUi.act); capMxPaint(); return; }
    if(e.key==='Enter'||e.key===' '){ e.preventDefault(); _capMxUi.act=a; capMxPaint(); capMxCellule(a.r,a.c); }
  });
  box.querySelector('#cmx-rh').addEventListener('click',e=>{ const d=e.target.closest('.cmx-r'); if(!d) return; const ri=_capMxX.rows[+d.dataset.r]; if(!ri) return;
    if(ri.k==='g'){ capMxTab().vue.ouverts['r'+ri.gk]=!ri.open; capMxGrille(); return; }
    _capMxUi.sel={ax:'r', id:ri.e.id}; capMxPaint(); capOpenDetail(ri.e.id); });
  box.querySelector('#cmx-ch').addEventListener('click',e=>{ const b=e.target.closest('.cmx-band'); const v=capMxTab().vue;
    if(b){ v.ouverts['c'+b.dataset.b]=v.ouverts['c'+b.dataset.b]===false; capMxGrille(); return; }
    const d=e.target.closest('.cmx-vh'); if(!d) return; const ci=_capMxX.cols[+d.dataset.c]; if(!ci) return;
    if(ci.k==='g'){ v.ouverts['c'+ci.gk]=true; capMxGrille(); return; }
    _capMxUi.sel={ax:'c', id:ci.e.id}; capMxPaint(); capOpenDetail(ci.e.id); });
  ['#cmx-rh','#cmx-ch'].forEach(id=>box.querySelector(id).addEventListener('contextmenu',e=>{
    const d=e.target.closest(id==='#cmx-rh'?'.cmx-r.e':'.cmx-vh[data-id]'); if(!d) return; e.preventDefault();
    capMxEnteteMenu(e, d.dataset.id, id==='#cmx-rh'?'lignes':'colonnes'); }));
  box.querySelector('#cmx-corner').addEventListener('pointerdown',e=>{ const g=e.target.closest('[data-mxgrip]'); if(g) capMxGrip(e, g); });
  box.addEventListener('click',e=>{ const b=e.target.closest('[data-mx]'); if(!b||b.tagName==='INPUT'||b.tagName==='SELECT') return; capMxCmd(b.dataset.mx, b); });
  document.addEventListener('mousedown',e=>{ if(!e.target.closest('.cmx-pop,.cmx-menu,[data-mx],.cmx-add,[data-mxtypes]')) capMxFerme(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.querySelector('.cmx-pop,.cmx-menu')) capMxFerme(); });
}

/** Commandes des barres (attribut data-mx). @param {string} k - Commande @param {HTMLElement} b - Bouton */
function capMxCmd(k, b){
  const t=capMxTab(), v=t.vue;
  if(k==='add'){ _capMx.tabs.push(capMxTabNew(t.nom+_L(' (copie)'), t, t.vue)); _capMx.idx=_capMx.tabs.length-1; capMxTabsChanged(); capRenderMatrix(); }
  else if(k==='presets') capMxMenuPresets(b);
  else if(k==='ouvrir') capMxOuvrir();
  else if(k==='enregistrer') capMxEnregistrer();
  else if(k==='crit'){ _capMx.critOuvert=!_capMx.critOuvert; capMxCritRender(); capMxPaintLater(); }
  else if(k==='swap') capMxSwap();
  else if(k==='rels') capMxPopRels(b);
  else if(k==='tri') capMxPopTri(b);
  else if(k==='sz-'||k==='sz+'){ const i=CAP_MX_TAILLES.indexOf(v.taille); v.taille=CAP_MX_TAILLES[Math.max(0,Math.min(CAP_MX_TAILLES.length-1,(i<0?4:i)+(k==='sz+'?1:-1)))]; capMxBarRender(); capMxGrille(); }
  else if(k==='styles') capMxPopStyles(b);
  else if(k==='leg'){ _capMx.legende=!_capMx.legende; capMxBarRender(); capMxLegende(); capMxPaintLater(); }
  else if(k==='csv') capMxMenu(b,[{s:_L('Export CSV')},{l:_L('▦ Matrice (noms × noms, marques)'),f:()=>capMxExport('mat')},{l:_L('≡ Liste des liens (une ligne par lien)'),f:()=>capMxExport('liens')}]);
  else if(k==='xlsx') capMxXlsx();
  else if(k==='copier') capClipCopy(capMxLignes('mat').map(r=>r.map(String)), ()=>capToast(_L('✔ Matrice copiée')));
}

/** ⇄ Changer d'axes : lignes ↔ colonnes, sens inversé, tris, filtres, masqués et groupes ouverts échangés. */
function capMxSwap(){
  const t=capMxTab(), v=t.vue;
  [t.lignes,t.colonnes]=[t.colonnes,t.lignes]; t.sens={out:'in',in:'out',both:'both'}[t.sens];
  t.afficher={lignes0:'colonnes0',colonnes0:'lignes0'}[t.afficher]||t.afficher;
  [v.triL,v.triC]=[v.triC,v.triL]; [v.fL,v.fC]=[v.fC,v.fL]; [v.mL,v.mC]=[v.mC,v.mL];
  const o={}; Object.entries(v.ouverts).forEach(([k,x])=>{ o[(k[0]==='r'?'c':'r')+k.slice(1)]=x; }); v.ouverts=o;
  _capMxUi.sel=null; _capMxUi.act=null; capMxMaj(); capToast(_L('⇄ Axes changés'));
}

/** Fait défiler la grille pour montrer une cellule. @param {{r:number, c:number}} a - Cellule */
function capMxVisible(a){
  const b=document.getElementById('cmx-body'), S=_capMxX.S;
  if(a.r*S<b.scrollTop) b.scrollTop=a.r*S; if((a.r+1)*S>b.scrollTop+b.clientHeight) b.scrollTop=(a.r+1)*S-b.clientHeight;
  if(a.c*S<b.scrollLeft) b.scrollLeft=a.c*S; if((a.c+1)*S>b.scrollLeft+b.clientWidth) b.scrollLeft=(a.c+1)*S-b.clientWidth;
}

/** Poignées du coin : largeur des noms de lignes (x) ou hauteur des en-têtes de colonnes (y), par glisser.
 * @param {PointerEvent} e - Appui @param {HTMLElement} g - Poignée */
function capMxGrip(e, g){
  e.preventDefault(); g.setPointerCapture(e.pointerId);
  const v=capMxTab().vue, x0=e.clientX, y0=e.clientY, a={rw:v.rw, hh:v.hh}, grid=document.getElementById('cmx-grid');
  g.onpointermove=m=>{ if(g.dataset.mxgrip==='x') v.rw=Math.max(160,Math.min(640,a.rw+m.clientX-x0)); else v.hh=Math.max(90,Math.min(360,a.hh+m.clientY-y0));
    grid.style.setProperty('--rw',v.rw+'px'); grid.style.setProperty('--hh',v.hh+'px'); capMxPaintLater(); };
  g.onpointerup=()=>{ g.onpointermove=null; g.onpointerup=null; capMxGrille(); };
}

/** Info-bulle d'une cellule (liens qu'elle compte), ou masquage (r null). @param {?number} r @param {number} [c] @param {MouseEvent} [e] */
function capMxTip(r, c, e){
  let tip=document.getElementById('cmx-tip');
  if(r==null){ if(tip) tip.style.display='none'; return; }
  const X=_capMxX; if(!X||r<0||c<0||r>=X.rows.length||c>=X.cols.length) return;
  if(!tip){ tip=document.createElement('div'); tip.id='cmx-tip'; tip.className='cmx-tip'; document.body.appendChild(tip); }
  const ri=X.rows[r], ci=X.cols[c], vv=capMxVal(X,ri,ci), esc=capEsc, ln=x=>x.k==='g'?'▸ '+x.lab:capMxNom(x.e);
  let h=`<b>${esc(ln(ri))} × ${esc(ln(ci))}</b>`;
  if(!vv) h+=`<span class="ana-dim">${_L('Aucun lien')}</span>`;
  else if(vv.agg) h+=_L(`${vv.agg} lien(s) dans le groupe — dépliez-le pour le détail`);
  else { const all=[...vv.x.o.map(z=>['↗',z]),...vv.x.i.map(z=>['↙',z])];
    h+=all.slice(0,7).map(([a,z])=>`<div>${a} <span style="color:${capMxStyle(z.r,X.t).c}">●</span> ${esc((X.C.by[z.r]||{}).l||z.r)}${z.l.vn?` <span class="ana-dim">· ${esc(z.l.vn)}</span>`:''}${z.l.v?` <span class="ana-dim">· ${esc(capMxNom(capGetElementById_(z.l.v)))}</span>`:''}${z.l.voies?` <span class="ana-dim">· ${_L('par')} ${esc(z.l.voies[0].map(id=>capMxNom(capGetElementById_(id))).join(' › '))}${z.l.voies.length>1?' …':''}</span>`:''}</div>`).join('')
      +(all.length>7?`<div class="ana-dim">${_L(`… ${all.length-7} autre(s)`)}</div>`:'')+`<div class="ana-dim" style="margin-top:3px">${_L('Clic : liste des liens et détail')}</div>`; }
  tip.innerHTML=h; tip.style.display='block'; capMxTipPlace(e);
}

/** Place l'info-bulle près du pointeur, dans la fenêtre. @param {MouseEvent} e - Événement */
function capMxTipPlace(e){
  const t=document.getElementById('cmx-tip'); if(!t||t.style.display!=='block'||!e) return;
  const w=t.offsetWidth, h=t.offsetHeight; let x=e.clientX+14, y=e.clientY+14;
  if(x+w>innerWidth-8) x=e.clientX-w-10; if(y+h>innerHeight-8) y=e.clientY-h-10;
  t.style.left=Math.max(4,x)+'px'; t.style.top=Math.max(4,y)+'px';
}

/** Clic sur une cellule : fenêtre des liens qu'elle compte (relation, source → cible, élément de liaison ou chemin parcouru,
 * chacun cliquable) ; le panneau de détail s'ouvre sur l'élément de liaison si la cellule n'a qu'un lien porté par un élément
 * (échange, allocation…), sinon sur l'élément de la ligne. Groupe replié : proposer de le déplier.
 * @param {number} r - Ligne affichée @param {number} c - Colonne affichée */
function capMxCellule(r, c){
  const X=_capMxX, ri=X.rows[r], ci=X.cols[c], vv=capMxVal(X,ri,ci), esc=capEsc, S=X.S, body=document.getElementById('cmx-body'), b=body.getBoundingClientRect();
  const anc={left:b.left+c*S-body.scrollLeft, top:b.top+r*S-body.scrollTop, width:S, height:S};
  capMxTip(null);
  if(!vv){ if(ri.k==='e') capOpenDetail(ri.e.id); return; }
  if(vv.agg){ const g=ri.k==='g'?ri:ci;
    capMxPop(anc, _L(`Groupe « ${esc(g.lab)} »`), `<p>${_L(`${vv.agg} lien(s) dans ce groupe.`)}</p>`, `<button class="cap-lf-btn cmx-pri" data-ouvre="1">${_L('Déplier le groupe')}</button>`,
      p=>{ p.querySelector('[data-ouvre]').onclick=()=>{ capMxTab().vue.ouverts[(ri.k==='g'?'r':'c')+g.gk]=true; capMxFerme(); capMxGrille(); }; });
    return; }
  const all=[...vv.x.o,...vv.x.i], nm=id=>esc(capMxNom(capGetElementById_(id)));
  const L=z=>{ const l=z.l, rel=X.C.by[z.r]||{l:z.r};
    const ends=l.voies?l.voies.slice(0,4).map(vo=>`<div class="cmx-ends">${[l.s,...vo,l.t].map(id=>`<span class="cmx-lnk" data-id="${esc(id)}">${nm(id)}</span>`).join('<span class="ana-dim"> › </span>')}</div>`).join('')+(l.voies.length>4?`<div class="ana-dim">${_L(`… ${l.voies.length-4} autre(s) chemin(s)`)}</div>`:'')
      :`<div class="cmx-ends"><span class="cmx-lnk" data-id="${esc(l.s)}">${nm(l.s)}</span> → <span class="cmx-lnk" data-id="${esc(l.t)}">${nm(l.t)}</span>${l.v?` <span class="ana-dim">${_L('· via')}</span> <span class="cmx-lnk" data-id="${esc(l.v)}">${nm(l.v)}</span>`:''}${l.vn?` <span class="ana-dim">· ${esc(l.vn)}</span>`:''}</div>`;
    return `<div class="cmx-lk"><div class="cmx-rl"><i style="background:${capMxStyle(z.r,X.t).c}"></i>${esc(rel.l)}${l.voies?` <span class="ana-dim">${_L(`· ${l.voies.length>=CAP_MX_VOIES?CAP_MX_VOIES+'+':l.voies.length} chemin(s)`)}</span>`:''}</div>${ends}</div>`; };
  capMxPop(anc, `${esc(capMxNom(ri.e))} × ${esc(capMxNom(ci.e))} <span class="ana-dim" style="font-weight:400">${_L(`${all.length} lien(s)`)}</span>`,
    (vv.x.o.length?`<div class="cmx-ps">${_L(`↗ La ligne pointe vers la colonne (${vv.x.o.length})`)}</div>`+vv.x.o.map(L).join(''):'')
    +(vv.x.i.length?`<div class="cmx-ps">${_L(`↙ La colonne pointe vers la ligne (${vv.x.i.length})`)}</div>`+vv.x.i.map(L).join(''):''),
    `<button class="cap-lf-btn" data-q="r">${_L('🔍 Ligne')}</button><button class="cap-lf-btn" data-q="c">${_L('🔍 Colonne')}</button>`+(typeof capRevNew==='function'?`<button class="cap-lf-btn" data-q="rev" title="${_L('Commentaire de revue sur la ligne et la colonne')}">${_L('💬 Commenter')}</button>`:''),
    p=>{ p.querySelectorAll('.cmx-lnk[data-id]').forEach(a=>a.onclick=()=>capOpenDetailById(a.dataset.id));
      p.querySelector('[data-q="r"]').onclick=()=>capOpenDetail(ri.e.id); p.querySelector('[data-q="c"]').onclick=()=>capOpenDetail(ci.e.id);
      const rv=p.querySelector('[data-q="rev"]'); if(rv) rv.onclick=()=>{ capMxFerme(); capRevNew([{id:ri.e.id,field:''},{id:ci.e.id,field:''}]); }; });
  const seul=all.length===1&&all[0].l.v&&capGetElementById_(all[0].l.v);
  capOpenDetail(seul?all[0].l.v:ri.e.id);
}

/** Menu d'un nom de ligne ou de colonne (clic droit) : détail, commentaire, portée, masquer.
 * @param {MouseEvent} e - Événement @param {string} id - Élément @param {'lignes'|'colonnes'} ax - Axe */
function capMxEnteteMenu(e, id, ax){
  const el=capGetElementById_(id); if(!el) return;
  const t=capMxTab(), pid=capGetParentIndex().parentOf[id], par=capGetElementById_(pid), esc=capEsc;
  capMxMenu({left:e.clientX, top:e.clientY, width:0, height:0},[{s:esc(capMxNom(el))},
    {l:_L('🔍 Détail de l\'élément'), f:()=>capOpenDetail(id)},
    typeof capRevNew==='function'?{l:_L('💬 Commenter l\'élément'), f:()=>capRevNew([{id, field:''}])}:null,
    par?{l:ax==='lignes'?_L(`🎯 Portée des lignes : contenu de « ${esc(capMxNom(par))} »`):_L(`🎯 Portée des colonnes : contenu de « ${esc(capMxNom(par))} »`), f:()=>{ t[ax].portee={ids:[pid], direct:false}; capMxMaj(); }}:null,
    {l:ax==='lignes'?_L('🙈 Masquer cette ligne'):_L('🙈 Masquer cette colonne'), f:()=>{ (ax==='lignes'?t.vue.mL:t.vue.mC).push(id); _capMxUi.sel=null; capMxMaj(); }}
  ].filter(Boolean));
}

/* ── Fenêtres flottantes et menus ───────────────────────────────────────────────────────────────────────────── */

/** Ferme les fenêtres flottantes et menus de la matrice. */
function capMxFerme(){ document.querySelectorAll('.cmx-pop,.cmx-menu').forEach(x=>x.remove()); }

/** Place un élément flottant sous (ou au-dessus de) une ancre, dans la fenêtre. @param {HTMLElement} el @param {HTMLElement|object} a - Ancre ou rectangle */
function capMxPlacer(el, a){
  const r=a.getBoundingClientRect?a.getBoundingClientRect():a, w=el.offsetWidth, h=el.offsetHeight;
  let x=Math.min(r.left, innerWidth-w-12), y=r.top+r.height+4; if(y+h>innerHeight-10) y=Math.max(10, r.top-h-4);
  el.style.left=Math.max(10,x)+'px'; el.style.top=y+'px';
}

/** Fenêtre flottante (titre, contenu, pied). @param {HTMLElement|object} anchor - Ancre @param {string} titre - HTML
 * @param {string} html - Contenu @param {string} [pied] - Pied (HTML) @param {function(HTMLElement)} [wire] - Câblage @returns {HTMLElement} */
function capMxPop(anchor, titre, html, pied, wire){
  capMxFerme();
  const p=document.createElement('div'); p.className='cmx-pop'; p.setAttribute('role','dialog');
  p.innerHTML=`<div class="cmx-pop-h"><span>${titre}</span><button class="cmx-x" title="${_L('Fermer (Échap)')}">✕</button></div><div class="cmx-pop-b">${html}</div>${pied?`<div class="cmx-pop-f">${pied}</div>`:''}`;
  document.body.appendChild(p); capMxPlacer(p, anchor); p.querySelector('.cmx-x').onclick=capMxFerme; if(wire) wire(p); return p;
}

/** Menu flottant. @param {HTMLElement|object} anchor - Ancre @param {object[]} items - {l, f, off?, h?} ou {s} (intertitre) */
function capMxMenu(anchor, items){
  capMxFerme();
  const m=document.createElement('div'); m.className='cmx-menu'; m.setAttribute('role','menu');
  m.innerHTML=items.map((it,i)=>it.s?`<div class="cmx-ms">${it.s}</div>`:`<div class="ctx-i${it.off?' off':''}" role="menuitem" data-i="${i}">${it.l}${it.h?` <span class="ana-dim">${capEsc(it.h)}</span>`:''}</div>`).join('');
  document.body.appendChild(m); capMxPlacer(m, anchor);
  m.querySelectorAll('.ctx-i:not(.off)').forEach(d=>d.onclick=()=>{ const it=items[+d.dataset.i]; m.remove(); it.f(); });
}

/** Choix des types d'un axe : types présents, rangés par couche (ou famille), avec leur nombre ; recherche ; pour les colonnes,
 * « mêmes types que les lignes ». @param {HTMLElement} btn - Bouton @param {'lignes'|'colonnes'} ax - Axe */
function capMxPopTypes(btn, ax){
  const t=capMxTab(), A=t[ax], G=capMxGroupes(), esc=capEsc, cnt={}, gs={};
  capAllElements.forEach(e=>{ cnt[e.typeName]=(cnt[e.typeName]||0)+1; const g=capMxGroupeDe(e), x=gs[e.typeName]||(gs[e.typeName]={}); x[g]=(x[g]||0)+1; });
  const dg=ty=>{ const k=Object.entries(gs[ty]||{}).sort((a,b)=>b[1]-a[1])[0]; return k?k[0]:''; };
  const tech=typeof CAP_TECHNICAL_TYPES!=='undefined'?CAP_TECHNICAL_TYPES:new Set();
  let q='', techOn=false;
  const draw=p=>{
    const b=p.querySelector('.cmx-pop-b'), ok=ty=>(!q||(ty+' '+capAnaHuman(ty)).toLowerCase().includes(q))&&(techOn||!tech.has(ty)||A.types.includes(ty));
    const list=Object.keys(cnt).filter(ok).sort((a,b)=>capAnaHuman(a).localeCompare(capAnaHuman(b),'fr'));
    const grp=[...G.map(g=>g.k),''].map(k=>[k,list.filter(ty=>{ const d=dg(ty); return k?d===k:!G.some(g=>g.k===d); })]).filter(x=>x[1].length);
    b.innerHTML=`<input class="inp" data-q placeholder="${_L('🔍 Chercher un type…')}" value="${esc(q)}" aria-label="${_L('Chercher un type')}">`
      +`<label class="cmx-opt"><input type="checkbox" data-tech${techOn?' checked':''}><span class="cmx-l">${_L('Montrer les types techniques')}<small>${_L('Allocations, involvements, ports, Parts…')}</small></span></label>`
      +(ax==='colonnes'?`<label class="cmx-opt"><input type="checkbox" data-same${JSON.stringify(A.types)===JSON.stringify(t.lignes.types)?' checked':''}><span class="cmx-l">${_L('Mêmes types que les lignes')}<small>${_L('Matrice carrée (N × N) : échanges, décomposition…')}</small></span></label>`:'')
      +grp.map(([k,xs])=>{ const g=G.find(x=>x.k===k); return `<div class="cmx-ps" style="color:${g?g.c:'var(--c-dim)'}">${esc(g?g.t:_L('Autres'))}</div>`
        +xs.map(ty=>`<label class="cmx-opt"><input type="checkbox" data-t="${esc(ty)}"${A.types.includes(ty)?' checked':''}>${capIcoType(ty,14)}<span class="cmx-l">${esc(capAnaHuman(ty))}<small>${esc(ty)}</small></span><span class="cmx-n">${cnt[ty]}</span></label>`).join(''); }).join('')
      +(list.length?'':`<p class="ana-dim">${_L('Aucun type ne correspond.')}</p>`);
    const qi=b.querySelector('[data-q]'); qi.oninput=e=>{ q=e.target.value.toLowerCase(); draw(p); const n=p.querySelector('[data-q]'); n.focus(); n.setSelectionRange(n.value.length,n.value.length); };
    b.querySelector('[data-tech]').onchange=e=>{ techOn=e.target.checked; draw(p); };
    b.querySelectorAll('[data-t]').forEach(cb=>cb.onchange=()=>{ const ty=cb.dataset.t; A.types=cb.checked?[...A.types,ty]:A.types.filter(x=>x!==ty); capMxMaj(); });
    const sm=b.querySelector('[data-same]'); if(sm) sm.onchange=()=>{ if(sm.checked){ A.types=[...t.lignes.types]; A.couches=[...t.lignes.couches]; } capMxMaj(); draw(p); };
  };
  const p=capMxPop(btn, ax==='lignes'?_L('Types des lignes'):_L('Types des colonnes'), '', `<span>${_L('Nombre d\'éléments de chaque type dans le modèle.')}</span>`);
  draw(p); capMxPlacer(p, btn); p.querySelector('[data-q]').focus();
}

/** Choix du critère : relations qui relient les lignes et les colonnes choisies (en tête, avec leur nombre de liens ici),
 * ✨ relations par chemin (＋ nouvelle, ✎ modifier), autres relations du modèle par groupe, « Avancé » : références par attribut.
 * @param {HTMLElement} btn - Bouton */
function capMxPopRels(btn){
  const t=capMxTab(), C=capMxRelations(), esc=capEsc;
  const Rs=new Set(capMxAxe(t.lignes,t.vue.mL).map(e=>e.id)), Ks=new Set(capMxAxe(t.colonnes,t.vue.mC).map(e=>e.id)), ici={};
  C.list.forEach(r=>{ let n=0; for(const l of r.liens) if((Rs.has(l.s)&&Ks.has(l.t))||(Rs.has(l.t)&&Ks.has(l.s))) n++; ici[r.k]=n; });
  const opt=r=>`<label class="cmx-opt${ici[r.k]?'':' off'}"><input type="checkbox" data-r="${esc(r.k)}"${t.relations.includes(r.k)?' checked':''}><i style="background:${capMxStyle(r.k,t).c}"></i><span class="cmx-l">${esc(r.l)}<small>${r.ch?esc(r.ch.steps.map(s=>capAnaHuman(s.metaclass)).concat(capAnaHuman(capMxChFin(r.ch))).join(' › ')):esc(r.g)}</small></span><span class="cmx-n">${_L(`${ici[r.k]} ici · ${r.n}`)}</span>${r.ch?`<button class="cap-lf-btn cmx-ed" data-ched="${esc(r.ch.id)}" title="${_L('Modifier ce chemin')}">✎</button>`:''}</label>`;
  const base=C.list.filter(r=>!r.ch&&!r.avance), der=C.list.filter(r=>r.ch), av=C.list.filter(r=>r.avance);
  const oui=base.filter(r=>ici[r.k]).sort((a,b)=>ici[b.k]-ici[a.k]), non=base.filter(r=>!ici[r.k]);
  const groupes=[...new Set(non.map(r=>r.g))];
  capMxPop(btn, _L('Critère : relations comptées'),
    `<div class="cmx-ps" style="color:var(--c-accent)">${_L('Relient les lignes et les colonnes choisies')}</div>${oui.length?oui.map(opt).join(''):`<p class="ana-dim">${_L('Aucune relation entre ces types : changez les types ou cochez une relation ci-dessous.')}</p>`}
     <div class="cmx-sec"><div class="cmx-ps" style="color:#14b8a6">${_L('✨ Relations par chemin')}</div>${der.map(opt).join('')}<button class="cmx-add" data-chnew="1" title="${_L('Suivre plusieurs relations d\'affilée, comme la colonne par chemin du ▤ Tableau')}">${_L('＋ Nouvelle relation par chemin…')}</button></div>
     <div class="cmx-sec">${groupes.map(g=>`<div class="cmx-ps">${esc(g)}</div>`+non.filter(r=>r.g===g).map(opt).join('')).join('')||`<p class="ana-dim">${_L('Aucune autre relation.')}</p>`}</div>
     ${av.length?`<details class="cmx-sec"${av.some(r=>t.relations.includes(r.k))?' open':''}><summary class="ana-dim">${_L(`Avancé : références par attribut (${av.length})`)}</summary>${av.map(opt).join('')}</details>`:''}`,
    `<span>${_L('« ici » : liens entre les lignes et les colonnes de l\'onglet, dans un sens ou dans l\'autre ; puis le total dans le modèle.')}</span>`,
    p=>{ p.querySelectorAll('[data-r]').forEach(cb=>cb.onchange=()=>{ const k=cb.dataset.r; t.relations=cb.checked?[...t.relations,k]:t.relations.filter(x=>x!==k); capMxMaj(); });
      p.querySelectorAll('[data-ched]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); capMxCheminDialog(_capMx.chemins.find(c=>c.id===b.dataset.ched)); });
      p.querySelector('[data-chnew]').onclick=()=>capMxCheminDialog(null); });
}

/** Tri des lignes et des colonnes (nom, nombre de liens, propriétaire, type ; croissant ou décroissant). @param {HTMLElement} btn - Bouton */
function capMxPopTri(btn){
  const v=capMxTab().vue, sens=id=>v[id].d>0?_L('▲ croissant'):_L('▼ décroissant');
  const row=(id,lab)=>`<div class="cmx-fld cmx-tri"><span class="cmx-lab">${lab}</span><select class="inp cmx-sel" data-tri="${id}" aria-label="${lab}">${CAP_MX_TRI.map(([k,l])=>`<option value="${k}"${v[id].k===k?' selected':''}>${l}</option>`).join('')}</select><button class="cap-lf-btn" data-dir="${id}">${sens(id)}</button></div>`;
  capMxPop(btn, _L('⇅ Tri'), row('triL',_L('Lignes'))+row('triC',_L('Colonnes')), `<span>${_L('Avec des groupes, le tri s\'applique dans chaque groupe.')}</span>`,
    p=>['triL','triC'].forEach(id=>{
      p.querySelector(`[data-tri="${id}"]`).onchange=e=>{ v[id].k=e.target.value; if(v[id].k==='nombre') v[id].d=-1; p.querySelector(`[data-dir="${id}"]`).textContent=sens(id); capMxBarRender(); capMxGrille(); };
      const d=p.querySelector(`[data-dir="${id}"]`); d.onclick=()=>{ v[id].d*=-1; d.textContent=sens(id); capMxBarRender(); capMxGrille(); }; }));
}

/** 🎨 Marques des relations de l'onglet : couleur, forme (flèche, tirets, épaisse, point, carré, losange, coche, croix, texte)
 * et texte ; aperçu ; ↺ défaut ; copie vers tous les onglets. @param {HTMLElement} btn - Ancre */
function capMxPopStyles(btn){
  const t=capMxTab(), C=capMxRelations(), esc=capEsc, rels=t.relations.filter(k=>C.by[k]);
  const draw=p=>{
    const b=p.querySelector('.cmx-pop-b');
    b.innerHTML=rels.length?rels.map(k=>{ const s=capMxStyle(k,t);
      return `<div class="cmx-sty" data-k="${esc(k)}"><span class="cmx-sty-v">${capMxSvg(s,'o',18)}${capMxSvg(s,'i',18)}${capMxSvg(s,'b',18)}</span><span class="cmx-l">${esc(C.by[k].l)}</span>
        <input type="color" value="${/^#[0-9a-f]{6}$/i.test(s.c)?s.c:'#8b949e'}" data-c aria-label="${_L('Couleur')}" title="${_L('Couleur')}">
        <select class="inp cmx-sel" data-f aria-label="${_L('Forme')}">${CAP_MX_FORMES.map(([f,l])=>`<option value="${f}"${s.f===f?' selected':''}>${l}</option>`).join('')}</select>
        <input class="inp cmx-stx" data-t maxlength="3" value="${esc(s.t)}" placeholder="${_L('Aa')}" aria-label="${_L('Texte de la marque (3 caractères)')}" style="display:${s.f==='texte'?'':'none'}">
        <button class="cap-lf-btn" data-raz title="${_L('Marque par défaut')}">↺</button></div>`; }).join('')
      :`<p class="ana-dim">${_L('Aucune relation dans le critère.')}</p>`;
    b.querySelectorAll('.cmx-sty').forEach(row=>{ const k=row.dataset.k, st=()=>(t.vue.styles[k]=t.vue.styles[k]||{});
      const maj=()=>{ capMxGrille(); capMxCritRender(); draw(p); };
      row.querySelector('[data-c]').onchange=e=>{ st().c=e.target.value; maj(); };
      row.querySelector('[data-f]').onchange=e=>{ st().f=e.target.value; maj(); };
      row.querySelector('[data-t]').oninput=e=>{ st().t=e.target.value; capMxGrille(); };
      row.querySelector('[data-raz]').onclick=()=>{ delete t.vue.styles[k]; maj(); }; });
  };
  const p=capMxPop(btn, _L('🎨 Marques des relations'), '', `<button class="cap-lf-btn" data-tous title="${_L('Donner ces marques aux mêmes relations dans les autres onglets')}">${_L('Appliquer à tous les onglets')}</button><span>${_L('Flèches : de la source vers la cible. Formes : pleine, creuse ou cerclée selon le sens.')}</span>`);
  draw(p); capMxPlacer(p, btn);
  p.querySelector('[data-tous]').onclick=()=>{ _capMx.tabs.forEach(x=>{ if(x===t) return; x.vue.styles=Object.assign({}, x.vue.styles||{}, JSON.parse(JSON.stringify(t.vue.styles||{}))); }); capToast(_L('✔ Marques appliquées à tous les onglets')); };
}

/** Menu 📚 Préréglages : ceux du format du modèle ouvert (les autres formats grisés), puis les matrices Cameo à venir.
 * @param {HTMLElement} btn - Bouton */
function capMxMenuPresets(btn){
  const fmt=capMxFormat(), P=capMxPresets().filter(p=>p.fmt===fmt), items=[{s:{capella:'Capella', sysml2:'SysML v2', uml:'UML / SysML v1', reqif:'ReqIF'}[fmt]}];
  [...P.filter(p=>p.ok), ...P.filter(p=>!p.ok)].forEach(p=>items.push({l:'▦ '+capEsc(p.nom), off:!p.ok, h:p.ok?'':_L('rien dans ce modèle'), f:()=>{
    _capMx.tabs.push(capMxTabDePreset(p)); _capMx.idx=_capMx.tabs.length-1; _capMxUi.sel=null; _capMxUi.act=null; capMxTabsChanged(); capRenderMatrix(); capToast(_L('✔ Préréglage ouvert dans un nouvel onglet')); }}));
  items.push({s:_L('Matrices des projets Cameo (.mdzip)')},{l:_L('▦ Dependency Matrix, Allocation Matrix…'), off:true, h:_L('à venir')});
  capMxMenu(btn, items);
}

/* ── ✨ Relation par chemin : éditeur ──────────────────────────────────────────────────────────────────────── */

/** Éditeur d'une ✨ relation par chemin : nom, étapes (type imposé par l'étape précédente + propriété du moteur de chemin, sans
 * les valeurs terminales), reprise d'une colonne par chemin du ▤ Tableau, aperçu en direct (capPpRender, 21), couverture, contrôle
 * du départ et de l'arrivée par rapport aux types de l'onglet. Enregistrer : bibliothèque de la page, relation cochée dans l'onglet.
 * @param {?object} ch0 - Relation à modifier, ou null pour en créer une */
function capMxCheminDialog(ch0){
  capMxFerme();
  const t=capMxTab(), neuf=!ch0, esc=capEsc;
  const ch=ch0?JSON.parse(JSON.stringify(ch0)):{id:'u'+Date.now().toString(36), nom:'', c:CAP_MX_COULEURS[_capMx.chemins.length%CAP_MX_COULEURS.length], steps:[{metaclass:t.lignes.types[0]||null, property:null}]};
  let ov=document.getElementById('cap-mx-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-mx-ov'; document.body.appendChild(ov); ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const cols=(typeof capTableCustomCols!=='undefined'?capTableCustomCols:[]).filter(c=>(c.steps||[]).some(s=>s.property&&!s.property.isTerminal));
  ov.innerHTML=`<div class="cw-d-box" style="max-width:760px"><div class="cw-d-hdr"><b>${neuf?_L('✨ Nouvelle relation par chemin'):_L('✨ Relation par chemin')}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body"><div class="cw-d-sub">${_L('Suivre plusieurs relations d\'affilée, de l\'élément de départ jusqu\'à l\'élément d\'arrivée : chaque couple (départ, arrivée) compte un lien dans la cellule, avec les éléments intermédiaires. Même moteur que ✨ Colonne par chemin du ▤ Tableau.')}</div>
      <div class="cmx-fld cmx-chn"><span class="cmx-lab">${_L('Nom')}</span><input class="inp" data-nom value="${esc(ch.nom)}" aria-label="${_L('Nom de la relation par chemin')}"></div>
      ${cols.length?`<div class="cmx-fld cmx-chn"><span class="cmx-lab">${_L('Reprendre')}</span><select class="inp" data-col aria-label="${_L('Reprendre une colonne par chemin du ▤ Tableau')}"><option value="">${_L('— une colonne par chemin du ▤ Tableau —')}</option>${cols.map((c,i)=>`<option value="${i}">${esc(c.label||c.key)}</option>`).join('')}</select></div>`:''}
      <div class="cmx-ps">${_L('Étapes')}</div><div data-steps></div><button class="cmx-add" data-add>${_L('＋ Étape')}</button>
      <div class="cmx-chk" data-chk></div><div class="cmx-pp" id="mx-customcol-preview"></div></div>
    <div class="cw-d-ftr">${neuf?'':`<button class="cap-lf-btn" data-c="del" title="${_L('Retirer ce chemin de la page et des onglets')}">${_L('🗑 Supprimer')}</button>`}<span data-err style="color:var(--c-err,#f85149)"></span><span style="flex:1"></span>
      <button class="cap-lf-btn" data-c="x">${_L('Annuler')}</button><button class="phl-export-btn cmx-pri" data-c="ok">${neuf?_L('Créer et cocher'):_L('💾 Enregistrer')}</button></div></div>`;
  ov.style.display='flex';
  const types=capGetMetachainMetaclasses(), nomDef=()=>capAnaHuman(ch.steps[0].metaclass||'')+' → '+(capMxChFin(ch)?capAnaHuman(capMxChFin(ch)):'…')+_L(' (chemin)');
  const draw=()=>{
    for(let i=1;i<ch.steps.length;i++){ const pr=ch.steps[i-1]; ch.steps[i].metaclass=pr.property?pr.property.resultType:null; }
    const box=ov.querySelector('[data-steps]');
    box.innerHTML=ch.steps.map((s,i)=>{ const props=s.metaclass?capGetMetachainProperties(s.metaclass).filter(p=>!p.isTerminal):[];
      return `<div class="cmx-step"><span class="cap-step-num">${i+1}</span>${i===0?`<select class="inp" data-mc aria-label="${_L('Type de départ')}">${types.map(x=>`<option value="${esc(x)}"${x===s.metaclass?' selected':''}>${esc(capAnaHuman(x))}</option>`).join('')}</select>`:`<span class="cmx-imp" title="${_L('Type imposé par l\'étape précédente')}">${esc(capAnaHuman(s.metaclass||'—'))}</span>`}
        <select class="inp" data-p="${i}" aria-label="${_L(`Propriété de l'étape ${i+1}`)}"><option value="">${_L('— choisir une propriété —')}</option>${props.map(p=>`<option value="${esc(p.key)}"${s.property&&s.property.key===p.key?' selected':''}>${esc(p.label)} [${esc(capAnaHuman(p.resultType||''))}]</option>`).join('')}</select>
        <button class="cap-lf-btn" data-x="${i}" title="${_L('Supprimer cette étape et les suivantes')}"${ch.steps.length>1?'':' disabled'}>✕</button></div>`; }).join('');
    ov.querySelector('[data-nom]').placeholder=nomDef();
    const mc=box.querySelector('[data-mc]'); if(mc) mc.onchange=()=>{ ch.steps=[{metaclass:mc.value, property:null}]; draw(); };
    box.querySelectorAll('[data-p]').forEach(sel=>sel.onchange=()=>{ const i=+sel.dataset.p, s=ch.steps[i]; s.property=capGetMetachainProperties(s.metaclass).find(p=>p.key===sel.value)||null; ch.steps=ch.steps.slice(0,i+1); draw(); });
    box.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.x; ch.steps=ch.steps.slice(0,Math.max(1,i)); if(i===0) ch.steps[0].property=null; draw(); });
    const last=ch.steps[ch.steps.length-1], add=ov.querySelector('[data-add]'); add.disabled=!(last.property&&last.property.resultType);
    const complet=ch.steps.every(s=>s.property), st0=ch.steps[0].metaclass, fin=capMxChFin(ch);
    let msg='';
    if(!complet) msg=`<span class="ana-dim">${_L('Choisissez une propriété à chaque étape.')}</span>`;
    else { const n=capMxChLiens(Object.assign({}, ch, {id:'~apercu'})).length;
      msg=_L(`<b>${n}</b> lien(s) dans le modèle.`)+' ';
      if(t.lignes.types.includes(st0)&&t.colonnes.types.includes(fin)) msg+=`<span class="cmx-ok">${_L(`✔ Part des lignes (${esc(capAnaHuman(st0))}) et arrive sur les colonnes (${esc(capAnaHuman(fin))}) : compté « ligne → colonne ».`)}</span>`;
      else if(t.colonnes.types.includes(st0)&&t.lignes.types.includes(fin)) msg+=`<span class="cmx-ok">${_L('✔ Part des colonnes et arrive sur les lignes : compté « colonne → ligne ».')}</span>`;
      else msg+=`<span class="cmx-warn">${_L(`⚠ Ce chemin relie ${esc(capAnaHuman(st0))} à ${esc(capAnaHuman(fin))} ; l'onglet montre ${esc(capMxTypesLib(t.lignes.types))} en lignes et ${esc(capMxTypesLib(t.colonnes.types))} en colonnes.`)}</span> <button class="cap-lf-btn" data-axes>${_L('Prendre ces types pour l\'onglet')}</button>`; }
    const chk=ov.querySelector('[data-chk]'); chk.innerHTML=msg;
    const ax=chk.querySelector('[data-axes]'); if(ax) ax.onclick=()=>{ t.lignes.types=[st0]; t.lignes.couches=[]; t.colonnes.types=[fin]; t.colonnes.couches=[]; capMxMaj(); draw(); };
    if(typeof _capPpState!=='undefined'&&!_capPpState.mx) _capPpState.mx={type:null, id:null, q:'', auto:true};
    capPpRender('mx', ch.steps, {res:_L('▦ Éléments d\'arrivée (colonnes de la ligne)')});
  };
  draw();
  const col=ov.querySelector('[data-col]'); if(col) col.onchange=()=>{ const c=cols[+col.value]; if(!c) return;
    const st=JSON.parse(JSON.stringify(c.steps)); while(st.length&&(!st[st.length-1].property||st[st.length-1].property.isTerminal)) st.pop();
    if(st.length){ ch.steps=st; if(!ov.querySelector('[data-nom]').value) ov.querySelector('[data-nom]').value=c.label||''; draw(); } };
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  const del=ov.querySelector('[data-c="del"]');
  if(del) del.onclick=async()=>{ if(!await capConfirm(_L(`Supprimer la relation par chemin « ${ch.nom} » ? Elle est retirée de tous les onglets.`),{danger:true, ok:_L('Supprimer')})) return;
    const k='ch:'+ch.id; _capMx.chemins=_capMx.chemins.filter(c=>c.id!==ch.id); _capMx.tabs.forEach(x=>{ x.relations=x.relations.filter(r=>r!==k); });
    ov.style.display='none'; capMxMaj(); capToast(_L('✔ Relation par chemin supprimée')); };
  ov.querySelector('[data-c="ok"]').onclick=()=>{
    if(!ch.steps.every(s=>s.property)){ ov.querySelector('[data-err]').textContent=_L('Chaque étape doit avoir une propriété.'); return; }
    ch.nom=ov.querySelector('[data-nom]').value.trim()||nomDef();
    const i=_capMx.chemins.findIndex(x=>x.id===ch.id); if(i>=0) _capMx.chemins[i]=ch; else _capMx.chemins.push(ch);
    if(_capAnaCache.mxCh) delete _capAnaCache.mxCh[ch.id];
    if(!t.relations.includes('ch:'+ch.id)) t.relations.push('ch:'+ch.id);
    ov.style.display='none'; capMxMaj(); capToast(neuf?_L('✔ Relation par chemin créée et cochée'):_L('✔ Relation par chemin enregistrée'));
  };
}

/* ── Exports ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Lignes d'export de la matrice affichée (filtres, tri et éléments affichés de l'onglet ; groupes dépliés).
 * @param {'mat'|'liens'} forme - Matrice (noms × noms, marques) ou liste des liens (une ligne par lien)
 * @returns {Array<Array>} En-tête puis lignes */
function capMxLignes(forme){
  const X=_capMxX||capMxCalc(), nm=e=>capMxNom(e), nmId=id=>capMxNom(capGetElementById_(id));
  if(forme==='liens'){
    const h=[_L('Ligne'),_L('Type de la ligne'),_L('Colonne'),_L('Type de la colonne'),_L('Relation'),_L('Sens'),_L('Via')], L=[];
    const via=l=>l.voies?l.voies.map(v=>v.map(nmId).join(' › ')).join(' | '):l.v?nmId(l.v):(l.vn||'');
    X.Rv.forEach(r=>{ const m=X.cells.get(r.id); if(!m) return; X.Kv.forEach(c=>{ const x=m.get(c.id); if(!x) return;
      x.o.forEach(z=>L.push([nm(r),capAnaHuman(r.typeName),nm(c),capAnaHuman(c.typeName),(X.C.by[z.r]||{l:z.r}).l,_L('ligne → colonne'),via(z.l)]));
      x.i.forEach(z=>L.push([nm(r),capAnaHuman(r.typeName),nm(c),capAnaHuman(c.typeName),(X.C.by[z.r]||{l:z.r}).l,_L('colonne → ligne'),via(z.l)])); }); });
    return [h,...L];
  }
  const mk=x=>{ if(!x) return ''; const n=x.o.length+x.i.length; if(X.v.cellule==='nombre') return n; return (x.o.length&&x.i.length?'⤢':x.o.length?'↗':'↙')+(n>1?n:''); };
  return [['',...X.Kv.map(nm),'Σ'], ...X.Rv.map(r=>{ const m=X.cells.get(r.id); return [nm(r),...X.Kv.map(c=>mk(m&&m.get(c.id))),X.rowN.get(r.id)||'']; }),
    ['Σ',...X.Kv.map(c=>X.colN.get(c.id)||''),X.nl]];
}

/** Nom de fichier d'export de l'onglet. @param {string} [suffixe] @returns {string} */
function capMxFichier(suffixe){ return _L('matrice-')+(capMxTab().nom.replace(/[^\w\-àâäéèêëîïôöùûüç ]+/gi,'').trim().replace(/\s+/g,'-')||'matrice')+(suffixe||''); }

/** ⬇ CSV (ou Excel selon ⚙ Préférences › Exports) de la matrice ou de la liste des liens. @param {'mat'|'liens'} forme */
function capMxExport(forme){
  const L=capMxLignes(forme);
  capCsvDownload(capMxFichier(forme==='liens'?_L('-liens'):'')+'.csv', L[0].map(String), L.slice(1));
}

/** ⬇ Excel : feuilles « Matrice » (omise au-delà de 16 384 colonnes ou d'un million de cellules, avec un avertissement) et « Liens ». */
function capMxXlsx(){
  const X=_capMxX||capMxCalc(), A=capMxLignes('mat'), B=capMxLignes('liens'), trop=X.Kv.length+2>16384||(X.Rv.length+2)*(X.Kv.length+2)>1e6, F=[];
  if(!trop) F.push({name:_L('Matrice'), header:A[0].map(String), rows:A.slice(1)});
  F.push({name:_L('Liens'), header:B[0], rows:B.slice(1)});
  capXlsxDownload(capMxFichier()+'.xlsx', F);
  if(trop) capAlert(_L('Matrice trop grande pour une feuille Excel (plus de 16 384 colonnes ou d\'un million de cellules) : seule la feuille « Liens » est exportée.'));
}

/* ── Définition .json d'un onglet (💾 / 📂), réglages ⚙ ─────────────────────────────────────────────────────── */

/** Définition autonome d'un onglet (types, couches, portée, relations et ✨ chemins utilisés, sens, affichage) : forme commune
 * aux fichiers .json, aux préréglages et aux matrices Cameo à venir. @param {object} [t] - Onglet @returns {object} */
function capMxDef(t){
  t=t||capMxTab();
  const chemins=t.relations.filter(k=>k.startsWith('ch:')).map(k=>_capMx.chemins.find(c=>'ch:'+c.id===k)).filter(Boolean);
  return {type:'arcalyse-matrice', version:1, nom:t.nom, format:capMxFormat(), lignes:t.lignes, colonnes:t.colonnes, relations:t.relations, chemins,
    sens:t.sens, afficher:t.afficher, affichage:{grouper:t.vue.grouper, triL:t.vue.triL, triC:t.vue.triC, cellule:t.vue.cellule, taille:t.vue.taille, styles:t.vue.styles}};
}

/** 💾 Enregistre la définition de l'onglet affiché (.json). */
function capMxEnregistrer(){
  capDownloadBlob(new Blob([JSON.stringify(capMxDef(),null,1)],{type:'application/json'}), capMxFichier()+'.json');
}

/** 📂 Ouvre une définition .json dans un nouvel onglet (ses ✨ relations par chemin sont ajoutées à la page). */
function capMxOuvrir(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ capMxDefLire(JSON.parse(r.result)); capToast(_L('✔ Définition ouverte dans un nouvel onglet')); }
      catch(e){ capAlert(_L(`Définition illisible : ${e.message}`),{level:'err'}); } };
    r.readAsText(f); };
  inp.click();
}

/** Ajoute un onglet depuis une définition (capMxDef) ; contrôle le type du fichier. @param {object} d - Définition */
function capMxDefLire(d){
  if(!d||d.type!=='arcalyse-matrice') throw new Error(_L('ce n\'est pas une définition de matrice (type « arcalyse-matrice » attendu)'));
  (d.chemins||[]).forEach(c=>{ if(c&&c.id&&Array.isArray(c.steps)&&!_capMx.chemins.some(x=>x.id===c.id)) _capMx.chemins.push({id:String(c.id), nom:String(c.nom||c.id), c:c.c||CAP_MX_COULEURS[_capMx.chemins.length%CAP_MX_COULEURS.length], steps:c.steps}); });
  const a=d.affichage||{}, vue={};
  ['grouper','triL','triC','cellule','taille','styles'].forEach(k=>{ if(a[k]!=null) vue[k]=a[k]; });
  _capMx.tabs=_capMx.tabs||[]; _capMx.tabs.push(capMxTabNew(d.nom||_L('Matrice'), d, vue)); _capMx.idx=_capMx.tabs.length-1;
  capMxTabsChanged(); if(capLoaded&&capCurrentView==='matrix') capRenderMatrix();
}

/** État de la ▦ Matrice pour l'enregistrement (page, ⚙ Interface et vues). @returns {object} */
function capMxCfgGet(){ return {tabs:_capMx.tabs||[], idx:_capMx.idx, chemins:_capMx.chemins, critOuvert:_capMx.critOuvert, legende:_capMx.legende}; }

/** Applique un état enregistré de la ▦ Matrice (onglets normalisés). @param {object} v - État (capMxCfgGet) */
function capMxCfgSet(v){
  if(!v||typeof v!=='object') return;
  _capMx.chemins=Array.isArray(v.chemins)?v.chemins.filter(c=>c&&c.id&&Array.isArray(c.steps)):[];
  _capMx.tabs=Array.isArray(v.tabs)&&v.tabs.length?v.tabs.map(t=>Object.assign(capMxTabNew(t.nom, t, t.vue), {id:t.id||capMxTabNew().id})):null;
  _capMx.idx=Math.max(0,Math.min(+v.idx||0,(_capMx.tabs||[1]).length-1));
  if(v.critOuvert!=null) _capMx.critOuvert=!!v.critOuvert; if(v.legende!=null) _capMx.legende=!!v.legende;
  capMxTabsChanged();
}

/* ── Palette Ctrl+K, tableau de bord, API de scripts, oracles ──────────────────────────────────────────────── */

/** Lignes « ▦ Matrice » de la palette (onglets dont le nom correspond à la requête). @param {string} q - Requête normalisée
 * @returns {string} HTML ('' si aucun) */
function capMxPalHtml(q){
  if(!_capMx.tabs||!q) return '';
  const words=q.split(/\s+/).filter(Boolean), norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const hit=_capMx.tabs.filter(t=>words.every(w=>norm(_L('matrice')+' '+t.nom).includes(w)));
  return hit.length?_L('<div class="cap-nav-h">▦ Matrices</div>')+hit.map(t=>`<div class="ctx-i cap-nav-it cap-pal-it" data-pal="mx" data-id="${capEsc(t.id)}"><span>▦ ${capEsc(t.nom)} <span class="cap-nav-g">${capEsc(capMxTypesLib(t.lignes.types))} × ${capEsc(capMxTypesLib(t.colonnes.types))}</span></span></div>`).join(''):'';
}

/** Ouvre un onglet de matrice (palette, tableau de bord). @param {string} id - Identifiant de l'onglet */
function capMxOuvrirOnglet(id){
  const i=(_capMx.tabs||[]).findIndex(t=>t.id===id); if(i<0) return;
  _capMx.idx=i; _capMxUi.sel=null; _capMxUi.act=null; capShowView('matrix');
}

/** Indicateurs du 📐 tableau de bord : pour chaque onglet, lignes reliées (taux) et lignes sans relation (liste).
 * @param {function} add - Ajout au catalogue (35) */
function capMxDashCatalog(add){
  const G=_L('▦ Matrice');
  (_capMx.tabs||[]).forEach(tab=>{
    const calc=()=>{ const t=Object.assign({}, tab, {afficher:'tous', vue:Object.assign({}, tab.vue, {fL:'', fC:'', grouper:'aucun'})}); return capMxCalc(t); };
    add(G,'mx.'+tab.id+'.pct',_L(`Matrice « ${tab.nom} » — lignes reliées`),'pct',()=>{ const X=calc(), n=X.R.length; return n?{v:Math.round(100*(n-X.nR0)/n), num:n-X.nR0, den:n}:null; },_L('Lignes de l\'onglet qui ont au moins un lien avec une colonne'));
    add(G,'mx.'+tab.id+'.r0',_L(`Matrice « ${tab.nom} » — lignes sans relation`),'table',()=>{ const X=calc(), L=X.R.filter(e=>!X.rowN.get(e.id)); return {cols:[_L('Ligne'),_L('Type')], rows:L.map(e=>[capMxNom(e), capAnaHuman(e.typeName)])}; });
  });
}

/** 📜 API de scripts : `analysis.matrix()` (onglets et relations disponibles), `analysis.matrix('nom d'onglet')` ou
 * `analysis.matrix({rows:{types, layers, scope}, columns:{…}, relations, direction, show})` → lignes, colonnes, cellules et liens.
 * @param {string|object} [arg] - Onglet ou définition @returns {object} Résultat propre (identifiants d'éléments en $el) */
function capMxScr(arg){
  const C=capMxRelations();
  if(arg==null) return {tabs:(_capMx.tabs||[]).map(t=>t.nom), relations:C.list.map(r=>({key:r.k, label:r.l, group:r.g, count:r.n}))};
  let t;
  if(typeof arg==='string'){ t=(_capMx.tabs||[]).find(x=>x.nom===arg); if(!t) throw new Error(_L(`Onglet de matrice introuvable : ${arg}`)); }
  else { const ax=a=>({types:(a&&a.types)||[], couches:(a&&a.layers)||[], portee:{ids:(a&&a.scope)||[], direct:!!(a&&a.directScope)}});
    t=capMxTabNew('script', {lignes:ax(arg.rows), colonnes:ax(arg.columns), relations:arg.relations||[], sens:{rowToColumn:'out', columnToRow:'in', both:'both'}[arg.direction]||arg.direction||'both',
      afficher:{related:'avec', all:'tous', rowsWithout:'lignes0', columnsWithout:'colonnes0'}[arg.show]||'avec'}); }
  const X=capMxCalc(t), el=e=>({$el:e.id, id:e.id, name:e.attrs.name||'', type:e.typeName, links:(X.rowN.get(e.id)||X.colN.get(e.id)||0)});
  const cells=[];
  X.Rv.forEach(r=>{ const m=X.cells.get(r.id); if(!m) return; X.Kv.forEach(c=>{ const x=m.get(c.id); if(!x) return;
    const lk=(z,d)=>({relation:z.r, label:(C.by[z.r]||{l:z.r}).l, direction:d, via:z.l.v||null, paths:z.l.voies||null});
    cells.push({row:r.id, column:c.id, links:[...x.o.map(z=>lk(z,'rowToColumn')), ...x.i.map(z=>lk(z,'columnToRow'))]}); }); });
  return {name:t.nom, rows:X.Rv.map(el), columns:X.Kv.map(el), cells, links:X.nl, rowsWithoutLinks:X.nR0, columnsWithoutLinks:X.nC0};
}

/** Relevé des oracles (tests/oracles.js) : chaque préréglage applicable, calculé avec « tous les éléments ».
 * @returns {Object<string,object>} Par identifiant de préréglage : lignes, colonnes, cellules, liens, sans relation */
function capMxReleve(){
  const R={}, sauve=JSON.stringify(_capMx.chemins);
  capMxPresets().filter(p=>p.ok).forEach(p=>{ const t=capMxTabDePreset(p); t.afficher='tous'; const X=capMxCalc(t);
    R[p.id]={lignes:X.R.length, colonnes:X.K.length, cellules:X.nCel, liens:X.nl, lignesSansRelation:X.nR0, colonnesSansRelation:X.nC0}; });
  _capMx.chemins=JSON.parse(sauve);
  return R;
}
