/* ═══════════════════════════════════════════════════════════════════
   SysML v2 — MODÈLE DANS LE SOCLE COMMUN D'ARCALYSE
   Le graphe produit par 56-sysml-langage.js est converti en document XML (types « sysml:PartUsage »…, identifiants
   stables, références « #id ») : Explorateur, ▤ Tableau, 🔗 Liens, 🗺 Relation Map, panneau de détail, ⚖ Comparaison,
   💬 Revue, 📐 Tableau de bord et 🔄 suivi du fichier fonctionnent alors sans modification. Le format courant
   (capFmt) remplace les couches ARCADIA par des familles SysML et les relations Capella par les relations SysML ;
   les vues propres à Capella sont masquées (catalogue CAP_NAV_ITEMS, propriété fmt).
═══════════════════════════════════════════════════════════════════ */

/** Format du modèle affiché : 'capella' ou 'sysml'. */
var _capFmt='capella';
/** Modèle SysML affiché : {M (capSyBuildModel), name, files [{path,text}], byId (id → élément), single (fichier seul)}. */
var _capSy=null;
/** @returns {string} Format du modèle affiché ('capella' | 'sysml') */
function capFmt(){ return _capFmt; }

/** Familles d'éléments SysML : elles jouent le rôle des couches ARCADIA (barre latérale, filtres, couleurs). */
const CAP_SY_LAYERS={
  STR:{label:_L('Structure'),            color:'#38bdf8', bg:'rgba(56,189,248,.15)'},
  BEH:{label:_L('Comportement'),         color:'#4ade80', bg:'rgba(74,222,128,.15)'},
  REQ:{label:_L('Exigences & cas'),      color:'#f472b6', bg:'rgba(244,114,182,.15)'},
  ORG:{label:_L('Organisation'),         color:'#a78bfa', bg:'rgba(167,139,250,.15)'},
};

/** Famille SysML d'une métaclasse (STR, BEH, REQ, ORG). @param {string} kind @returns {string} */
function capSyLayerOf(kind){
  kind=String(kind||'');
  if(/^(Requirement|Concern|Constraint|AssertConstraint|Satisfy|VerifyRequirement|Case|AnalysisCase|VerificationCase|UseCase|IncludeUseCase|Viewpoint)/.test(kind)) return 'REQ';
  if(/^(Action|State|Calculation|Transition|Succession|Flow|Perform|Exhibit|Accept|Send|Assignment|If|WhileLoop|ForLoop|Terminate|Fork|Join|Merge|Decision|StateAction|EventOccurrence|BindingConnector)/.test(kind)) return 'BEH';
  if(/^(Part|Item|Port|Attribute|Enumeration|Connection|Interface|Allocation|Occurrence|Reference)/.test(kind)) return 'STR';
  return 'ORG';
}

/** Noms lisibles et descriptions des métaclasses SysML (panneau de détail, ▤ Tableau, 📖 Index des types). */
const CAP_SY_HUMAN={
  Namespace:{h:_L('Fichier (espace de noms racine)'), d:_L('Racine d\'un fichier .sysml : ses membres sont dans l\'espace de noms global du projet.')},
  Package:{h:'Package', d:_L('Paquetage : organise le modèle en espaces de noms (package Nom { … }).')},
  LibraryPackage:{h:'Library Package', d:_L('Paquetage de bibliothèque (library package).')},
  Import:{h:'Import', d:_L('Import de membres d\'un autre espace de noms (private import A::*;).')},
  Alias:{h:'Alias', d:_L('Autre nom d\'un élément (alias Nom for A::B;).')},
  Comment:{h:'Comment', d:_L('Commentaire /* … */ : élément du modèle qui annote son propriétaire (ou les éléments cités après about).')},
  MetadataUsage:{h:'Metadata Usage', d:_L('Métadonnée appliquée à un élément (@Type { … } ou #Type) : équivalent d\'un stéréotype.')},
  MetadataDefinition:{h:'Metadata Definition', d:_L('Définition de métadonnée (metadata def) : équivalent d\'un stéréotype avec ses propriétés.')},
  Dependency:{h:'Dependency', d:_L('Dépendance entre éléments (dependency from A to B;).')},
  PartDefinition:{h:'Part Definition', d:_L('Définition de partie (part def) : type d\'un élément de structure, équivalent du Block SysML v1.')},
  PartUsage:{h:'Part Usage', d:_L('Partie (part) : utilisation d\'une définition dans un contexte, équivalent de la part property SysML v1.')},
  ItemDefinition:{h:'Item Definition', d:_L('Définition d\'objet échangé ou stocké (item def).')},
  ItemUsage:{h:'Item Usage', d:_L('Objet échangé ou stocké (item).')},
  AttributeDefinition:{h:'Attribute Definition', d:_L('Définition de valeur (attribute def) : équivalent du value type.')},
  AttributeUsage:{h:'Attribute Usage', d:_L('Attribut (attribute) : propriété valuée, avec une valeur éventuelle (= 1800 [kg]).')},
  EnumerationDefinition:{h:'Enumeration Definition', d:_L('Énumération (enum def) et ses valeurs.')},
  EnumerationUsage:{h:'Enumeration Usage', d:_L('Valeur d\'une énumération, ou attribut typé par une énumération.')},
  PortDefinition:{h:'Port Definition', d:_L('Définition de port (port def) : point d\'interaction et ce qui y circule.')},
  PortUsage:{h:'Port Usage', d:_L('Port (port) d\'une partie ; ~Type : port conjugué (directions inversées).')},
  ConnectionDefinition:{h:'Connection Definition', d:_L('Définition de connexion (connection def) et de ses extrémités (end).')},
  ConnectionUsage:{h:'Connection Usage', d:_L('Connexion entre parties ou ports (connection, connect a to b).')},
  InterfaceDefinition:{h:'Interface Definition', d:_L('Définition d\'interface (interface def) : connexion entre ports.')},
  InterfaceUsage:{h:'Interface Usage', d:_L('Interface entre deux ports (interface : T connect a to b).')},
  AllocationDefinition:{h:'Allocation Definition', d:_L('Définition d\'allocation (allocation def).')},
  AllocationUsage:{h:'Allocation Usage', d:_L('Allocation d\'un élément sur un autre (allocate a to b), par exemple une fonction sur un composant.')},
  FlowDefinition:{h:'Flow Definition', d:_L('Définition de flux (flow def).')},
  FlowUsage:{h:'Flow Usage', d:_L('Flux d\'un objet entre deux features (flow of Item from a to b) ; message : flux sans extrémités imposées.')},
  SuccessionFlowUsage:{h:'Succession Flow Usage', d:_L('Flux avec succession : la cible commence après la fin de la source.')},
  ActionDefinition:{h:'Action Definition', d:_L('Définition d\'action (action def) : comportement, équivalent de l\'activité SysML v1.')},
  ActionUsage:{h:'Action Usage', d:_L('Action (action), éventuellement décomposée en sous-actions reliées par des successions.')},
  PerformActionUsage:{h:'Perform Action Usage', d:_L('Action réalisée par une partie (perform) : allocation fonctionnelle.')},
  StateDefinition:{h:'State Definition', d:_L('Définition de machine à états (state def).')},
  StateUsage:{h:'State Usage', d:_L('État (state), avec ses actions entry / do / exit et ses sous-états.')},
  ExhibitStateUsage:{h:'Exhibit State Usage', d:_L('Machine à états présentée par une partie (exhibit state).')},
  StateActionUsage:{h:'State Action', d:_L('Action d\'entrée, de séjour ou de sortie d\'un état (entry / do / exit).')},
  TransitionUsage:{h:'Transition Usage', d:_L('Transition entre états : first source accept déclencheur if garde do effet then cible.')},
  SuccessionAsUsage:{h:'Succession', d:_L('Succession entre deux actions ou états (first a then b, then …).')},
  AcceptActionUsage:{h:'Accept Action', d:_L('Attente d\'un signal (accept S via port).')},
  SendActionUsage:{h:'Send Action', d:_L('Envoi d\'un signal (send S via port to cible).')},
  AssignmentActionUsage:{h:'Assignment Action', d:_L('Affectation (assign x := valeur).')},
  IfActionUsage:{h:'If Action', d:_L('Action conditionnelle (if … { } else { }).')},
  WhileLoopActionUsage:{h:'Loop Action', d:_L('Boucle (while / loop … until).')},
  ForLoopActionUsage:{h:'For Loop Action', d:_L('Boucle sur une séquence (for x in …).')},
  TerminateActionUsage:{h:'Terminate Action', d:_L('Fin d\'une occurrence (terminate).')},
  ForkNode:{h:'Fork', d:_L('Nœud de parallélisme (fork).')}, JoinNode:{h:'Join', d:_L('Nœud de synchronisation (join).')},
  MergeNode:{h:'Merge', d:_L('Nœud de fusion (merge).')}, DecisionNode:{h:'Decide', d:_L('Nœud de décision (decide), suivi de successions gardées (if … then …).')},
  CalculationDefinition:{h:'Calculation Definition', d:_L('Définition de calcul (calc def) : paramètres et expression du résultat.')},
  CalculationUsage:{h:'Calculation Usage', d:_L('Calcul (calc).')},
  ConstraintDefinition:{h:'Constraint Definition', d:_L('Définition de contrainte (constraint def) : expression booléenne.')},
  ConstraintUsage:{h:'Constraint Usage', d:_L('Contrainte (constraint, require / assume constraint dans une exigence).')},
  AssertConstraintUsage:{h:'Assert Constraint', d:_L('Contrainte affirmée (assert constraint) : doit être vraie.')},
  RequirementDefinition:{h:'Requirement Definition', d:_L('Définition d\'exigence (requirement def) : identifiant court, texte (doc), sujet, contraintes.')},
  RequirementUsage:{h:'Requirement Usage', d:_L('Exigence (requirement), éventuellement typée par une définition d\'exigence.')},
  SatisfyRequirementUsage:{h:'Satisfy', d:_L('Satisfaction d\'une exigence par un élément (satisfy R by S).')},
  VerifyRequirementUsage:{h:'Verify', d:_L('Exigence vérifiée par un cas de vérification (verify R).')},
  ConcernDefinition:{h:'Concern Definition', d:_L('Définition de préoccupation (concern def).')},
  ConcernUsage:{h:'Concern Usage', d:_L('Préoccupation (concern, frame concern).')},
  CaseDefinition:{h:'Case Definition', d:_L('Définition de cas (case def).')}, CaseUsage:{h:'Case Usage', d:_L('Cas (case).')},
  AnalysisCaseDefinition:{h:'Analysis Case Definition', d:_L('Définition de cas d\'analyse (analysis def).')},
  AnalysisCaseUsage:{h:'Analysis Case Usage', d:_L('Cas d\'analyse (analysis).')},
  VerificationCaseDefinition:{h:'Verification Case Definition', d:_L('Définition de cas de vérification (verification def).')},
  VerificationCaseUsage:{h:'Verification Case Usage', d:_L('Cas de vérification (verification).')},
  UseCaseDefinition:{h:'Use Case Definition', d:_L('Définition de cas d\'utilisation (use case def) : sujet, acteurs, objectif.')},
  UseCaseUsage:{h:'Use Case Usage', d:_L('Cas d\'utilisation (use case).')},
  IncludeUseCaseUsage:{h:'Include Use Case', d:_L('Cas d\'utilisation inclus (include).')},
  ViewDefinition:{h:'View Definition', d:_L('Définition de vue (view def).')}, ViewUsage:{h:'View Usage', d:_L('Vue (view) : éléments exposés (expose) et rendu.')},
  ViewpointDefinition:{h:'Viewpoint Definition', d:_L('Définition de point de vue (viewpoint def).')}, ViewpointUsage:{h:'Viewpoint Usage', d:_L('Point de vue (viewpoint).')},
  RenderingDefinition:{h:'Rendering Definition', d:_L('Définition de rendu (rendering def).')}, RenderingUsage:{h:'Rendering Usage', d:_L('Rendu d\'une vue (render).')},
  Expose:{h:'Expose', d:_L('Éléments exposés par une vue (expose A::*).')},
  OccurrenceDefinition:{h:'Occurrence Definition', d:_L('Définition d\'occurrence (occurrence def, individual def).')},
  OccurrenceUsage:{h:'Occurrence Usage', d:_L('Occurrence (occurrence, snapshot, timeslice).')},
  EventOccurrenceUsage:{h:'Event Occurrence', d:_L('Événement (event occurrence) : instant d\'une occurrence.')},
  ReferenceUsage:{h:'Reference Usage', d:_L('Feature de référence (ref, sujet, paramètre in / out, extrémité end, feature sans mot-clé).')},
  BindingConnectorAsUsage:{h:'Binding', d:_L('Liaison d\'égalité entre deux features (bind a = b).')},
  ElementFilterMembership:{h:'Filter', d:_L('Filtre d\'un paquetage (filter @Type;).')},
  TextualRepresentation:{h:'Textual Representation', d:_L('Représentation textuelle dans un autre langage (rep language "…" /* … */).')}
};
Object.assign(CAP_HUMAN_NAMES, CAP_SY_HUMAN);
['Import','SuccessionAsUsage','Expose','ElementFilterMembership','TextualRepresentation','BindingConnectorAsUsage','StateActionUsage','Comment'].forEach(t=>CAP_TECHNICAL_TYPES.add(t));

/** Relations SysML proposées dans 🔗 Liens, ▤ Tableau (colonnes de relations) et la 🗺 Relation Map (style rc des arêtes,
 * proche de la notation graphique SysML v2 §8.2.3 : triangle creux pour la spécialisation, losange pour la composition…). */
const CAP_SY_LINK_SECTIONS=[
  {key:'sy_typ',  relType:'SysML: usage→definition (:)', srcT:'Usage', tgtT:'Definition', srcC:'#38bdf8', tgtC:'#0ea5e9', humanLabel:_L('Typage (usage → définition)'), grp:'sy_def', rc:{open:true, dash:'2,3'}},
  {key:'sy_spec', relType:'SysML: definition→definition (:>)', srcT:'Definition', tgtT:'Definition', srcC:'#a78bfa', tgtC:'#a78bfa', humanLabel:_L('Spécialisation (définition → définition)'), grp:'sy_def', rc:{open:true}},
  {key:'sy_sub',  relType:'SysML: usage→usage (:>)', srcT:'Usage', tgtT:'Usage', srcC:'#818cf8', tgtC:'#818cf8', humanLabel:_L('Sous-ensemble (subsets)'), grp:'sy_def', rc:{open:true}},
  {key:'sy_redef',relType:'SysML: redefinition (:>>)', srcT:'Usage', tgtT:'Usage', srcC:'#c084fc', tgtC:'#c084fc', humanLabel:_L('Redéfinition (redefines)'), grp:'sy_def', rc:{open:true, dash:'5,2'}},
  {key:'sy_comp', relType:'SysML: composite member', srcT:_L('Propriétaire'), tgtT:_L('Partie, port, objet'), srcC:'#38bdf8', tgtC:'#38bdf8', humanLabel:_L('Composition (membre composite)'), grp:'sy_str', rc:{diamond:true, noArrow:true}},
  {key:'sy_ref',  relType:'SysML: reference member (ref)', srcT:_L('Propriétaire'), tgtT:'ref', srcC:'#7dd3fc', tgtC:'#7dd3fc', humanLabel:_L('Membre référence (ref)'), grp:'sy_str', rc:{hollowDiamond:true, noArrow:true}},
  {key:'sy_conn', relType:'SysML: connection / interface', srcT:_L('Extrémité'), tgtT:_L('Extrémité'), via:'Connection', srcC:'#0ea5e9', tgtC:'#0ea5e9', humanLabel:_L('Connexion / interface (connect)'), grp:'sy_str', rc:{noArrow:true}},
  {key:'sy_bind', relType:'SysML: binding (=)', srcT:'Feature', tgtT:'Feature', srcC:'#94a3b8', tgtC:'#94a3b8', humanLabel:_L('Liaison d\'égalité (bind)'), grp:'sy_str', rc:{noArrow:true, dash:'1,3'}},
  {key:'sy_alloc',relType:'SysML: allocate', srcT:_L('Alloué'), tgtT:_L('Cible'), srcC:'#eab308', tgtC:'#eab308', humanLabel:_L('Allocation (allocate)'), grp:'sy_str', rc:{chevron:true}},
  {key:'sy_flow', relType:'SysML: flow', srcT:_L('Source'), tgtT:_L('Cible'), via:'Flow', srcC:'#22c55e', tgtC:'#22c55e', humanLabel:_L('Flux (flow / message)'), grp:'sy_beh', rc:{}},
  {key:'sy_deco', relType:'SysML: subaction / substate', srcT:_L('Action / état'), tgtT:_L('Action / état'), srcC:'#4ade80', tgtC:'#4ade80', humanLabel:_L('Décomposition (sous-action, sous-état)'), grp:'sy_beh', rc:{diamond:true, noArrow:true}},
  {key:'sy_succ', relType:'SysML: succession (then)', srcT:'Action', tgtT:'Action', srcC:'#86efac', tgtC:'#86efac', humanLabel:_L('Succession (first … then …)'), grp:'sy_beh', rc:{chevron:true, dash:'5,3'}},
  {key:'sy_trans',relType:'SysML: transition', srcT:'State', tgtT:'State', srcC:'#16a34a', tgtC:'#16a34a', humanLabel:_L('Transition (état → état)'), grp:'sy_beh', rc:{chevron:true}},
  {key:'sy_perf', relType:'SysML: perform', srcT:'Part', tgtT:'Action', srcC:'#f59e0b', tgtC:'#4ade80', humanLabel:_L('Réalise (perform : partie → action)'), grp:'sy_beh', rc:{chevron:true}},
  {key:'sy_exh',  relType:'SysML: exhibit', srcT:'Part', tgtT:'State', srcC:'#f59e0b', tgtC:'#16a34a', humanLabel:_L('Présente (exhibit : partie → état)'), grp:'sy_beh', rc:{chevron:true}},
  {key:'sy_sat',  relType:'SysML: satisfy', srcT:_L('Élément'), tgtT:'Requirement', srcC:'#f472b6', tgtC:'#f472b6', humanLabel:_L('Satisfait (satisfy : élément → exigence)'), grp:'sy_req', rc:{chevron:true}},
  {key:'sy_ver',  relType:'SysML: verify', srcT:'Verification', tgtT:'Requirement', srcC:'#ec4899', tgtC:'#f472b6', humanLabel:_L('Vérifie (verify : cas de vérification → exigence)'), grp:'sy_req', rc:{chevron:true}},
  {key:'sy_subj', relType:'SysML: subject', srcT:_L('Exigence / cas'), tgtT:_L('Sujet'), srcC:'#f9a8d4', tgtC:'#38bdf8', humanLabel:_L('Sujet (subject : exigence ou cas → type du sujet)'), grp:'sy_req', rc:{chevron:true, dash:'3,3'}},
  {key:'sy_actor',relType:'SysML: actor', srcT:_L('Cas'), tgtT:_L('Acteur'), srcC:'#f9a8d4', tgtC:'#f59e0b', humanLabel:_L('Acteur (actor / stakeholder → type)'), grp:'sy_req', rc:{chevron:true, dash:'3,3'}},
  {key:'sy_incl', relType:'SysML: include', srcT:'Use Case', tgtT:'Use Case', srcC:'#f9a8d4', tgtC:'#f9a8d4', humanLabel:_L('Inclut (include use case)'), grp:'sy_req', rc:{chevron:true}},
  {key:'sy_dep',  relType:'SysML: dependency', srcT:_L('Client'), tgtT:_L('Fournisseur'), srcC:'#94a3b8', tgtC:'#94a3b8', humanLabel:_L('Dépendance (dependency)'), grp:'sy_org', rc:{chevron:true, dash:'5,3'}},
  {key:'sy_imp',  relType:'SysML: import', srcT:'Package', tgtT:'Package', srcC:'#a78bfa', tgtC:'#a78bfa', humanLabel:_L('Import (paquetage → paquetage)'), grp:'sy_org', rc:{chevron:true, dash:'5,3'}},
  {key:'sy_meta', relType:'SysML: metadata', srcT:_L('Élément'), tgtT:'Metadata', srcC:'#94a3b8', tgtC:'#c4b5fd', humanLabel:_L('Métadonnée appliquée (@ / #)'), grp:'sy_org', rc:{chevron:true, dash:'2,2'}},
];
/** Groupes de relations SysML (barre de 🔗 Liens, colonnes du ▤ Tableau). */
const CAP_SY_LINK_GROUPS=[
  {key:'sy_def', label:_L('Typage & spécialisation')},
  {key:'sy_str', label:_L('Structure')},
  {key:'sy_beh', label:_L('Comportement')},
  {key:'sy_req', label:_L('Exigences & cas')},
  {key:'sy_org', label:_L('Organisation')},
];

/** Sauvegarde des tables Capella (restaurées en revenant à un modèle Capella). */
const _capFmtBak={};
/**
 * Change le format du modèle affiché : couches (CAP_LAYERS), relations (CAP_LINK_SECTIONS, CAP_LINK_GROUPS),
 * critères de la Relation Map, boutons de filtre par couche, barre des vues et textes de l'écran d'accueil.
 * Les tables partagées sont modifiées sur place : tout le code qui les lit suit le format sans changement.
 * @param {'capella'|'sysml'} f - Format
 */
function capFmtSet(f){
  if(!_capFmtBak.layers){
    _capFmtBak.layers={}; Object.keys(CAP_LAYERS).forEach(k=>_capFmtBak.layers[k]=CAP_LAYERS[k]);
    _capFmtBak.links=CAP_LINK_SECTIONS.slice(); _capFmtBak.groups=CAP_LINK_GROUPS.slice();
  }
  if(f===_capFmt) return;
  // Critères de relation du format quitté : retirés de la Relation Map
  CAP_LINK_SECTIONS.forEach(s=>{ if(RCFG[s.relType]&&RCFG[s.relType]._capella){ delete RCFG[s.relType]; delete S.relF[s.relType]; } });
  const L=f==='sysml'?CAP_SY_LAYERS:_capFmtBak.layers;
  Object.keys(CAP_LAYERS).forEach(k=>delete CAP_LAYERS[k]); Object.assign(CAP_LAYERS, L);
  CAP_LINK_SECTIONS.splice(0, CAP_LINK_SECTIONS.length, ...(f==='sysml'?CAP_SY_LINK_SECTIONS:_capFmtBak.links));
  CAP_LINK_GROUPS.splice(0, CAP_LINK_GROUPS.length, ...(f==='sysml'?CAP_SY_LINK_GROUPS:_capFmtBak.groups));
  _capFmt=f;
  document.documentElement.setAttribute('data-fmt', f);
  if(typeof capThemeLayersApply==='function'&&typeof THEMES!=='undefined') try{ capThemeLayersApply(document.documentElement.getAttribute('data-theme')||''); }catch(e){}
  capFmtLayerButtons();
  if(f!=='sysml') _capSy=null;
  if(!CAP_NAV_ITEMS.some(i=>i.k===capNavCurKey(true)&&capNavFmtOk(i))) capCurrentView='cards';
  capNavRender();
}

/** Reconstruit les boutons de filtre par couche (▦ Cartes) selon les couches du format courant. */
function capFmtLayerButtons(){
  const g=document.getElementById('cap-tb-layer-grp'); if(!g) return;
  g.querySelectorAll('[data-layer]').forEach(b=>b.remove());
  const mk=(k,l,c)=>{ const b=document.createElement('button'); b.className='tbtn'+(k===capCurrentLayer?' active':''); b.dataset.layer=k; b.textContent=l; if(c) b.style.color=c;
    b.addEventListener('click',()=>{ g.querySelectorAll('.tbtn[data-layer]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); capCurrentLayer=k; capPage=0; capRenderCurrentView(); }); return b; };
  if(!CAP_LAYERS[capCurrentLayer]) capCurrentLayer='all';
  const first=g.querySelector(':scope > :not([data-layer])');   // séparateur puis ⬇ CSV : les boutons se placent avant
  [mk('all',_L('Tous'))].concat(Object.entries(CAP_LAYERS).map(([k,v])=>mk(k, k==='Shared'?_L('Tranv.'):k, v.color))).forEach(b=>g.insertBefore(b, first));
}

/** Vrai si une vue du catalogue est disponible pour le format affiché (fmt : 'sysml', 'both' ; absent : Capella seul).
 * @param {object} it - Entrée de CAP_NAV_ITEMS @returns {boolean} */
function capNavFmtOk(it){
  const f=it&&it.fmt||'capella';
  return f==='both'||f===(_capFmt||'capella');   // _capFmt pas encore initialisé au premier rendu de la barre (41)
}

/** Format d'un document XML chargé (attribut arcalyse-format de la racine, posé par capSyToDoc).
 * @param {Document} doc @returns {'capella'|'sysml'} */
function capFmtOfDoc(doc){ return doc&&doc.documentElement&&doc.documentElement.getAttribute('arcalyse-format')==='sysml'?'sysml':'capella'; }

/** Empreinte courte et stable d'un texte (FNV-1a sur 52 bits, en base 36) : identifiants des éléments SysML.
 * @param {string} s @returns {string} */
function capSyHash(s){
  let h1=0x811c9dc5, h2=0x01000193;
  for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c, 16777619)>>>0; h2=Math.imul(h2^(c+i), 2246822519)>>>0; }
  return (h1.toString(36)+(h2&0xfffff).toString(36));
}

/**
 * Attribue un identifiant stable à chaque élément : empreinte du chemin qualifié (propriétaires, métaclasse, nom ;
 * rang parmi les éléments anonymes de même métaclasse). Le texte SysML ne porte pas d'identifiant : celui-ci survit
 * au rechargement et à la plupart des modifications (déplacement dans un autre fichier compris), ce qui garde
 * les commentaires de 💬 Revue, les vues et la ⚖ Comparaison.
 * @param {object} M - Modèle SysML
 */
function capSyAssignIds(M){
  const used=new Set();
  const walk=(el, key)=>{
    const anon={};
    el.members.forEach(m=>{
      if(m.kind==='Documentation') return;
      let seg;
      if(m.declaredName||(m.name&&m.kind!=='Comment')) seg=m.kind+':'+m.name+(m.shortName?'<'+m.shortName+'>':'');
      else { const k=m.kind+(m.shortName||''); anon[k]=(anon[k]||0)+1; seg=m.kind+'#'+anon[k]; }
      const mk=key+'/'+seg;
      let id='sy'+capSyHash(mk); while(used.has(id)) id+='x'; used.add(id);
      m._id=id;
      walk(m, mk);
    });
  };
  M.files.forEach(f=>{
    // Racine de fichier : identifiant par chemin ; ses membres nommés sont globaux (identifiant indépendant du fichier)
    let id='sy'+capSyHash('file:'+f.path); while(used.has(id)) id+='x'; used.add(id); f.root._id=id;
    const anon={};
    f.root.members.forEach(m=>{
      if(m.kind==='Documentation') return;
      let seg;
      if(m.name&&m.kind!=='Comment') seg=m.kind+':'+m.name;
      else { anon[m.kind]=(anon[m.kind]||0)+1; seg=f.path+'|'+m.kind+'#'+anon[m.kind]; }
      let mid='sy'+capSyHash('/'+seg); while(used.has(mid)) mid+='x'; used.add(mid); m._id=mid;
      walk(m, '/'+seg);
    });
  });
}

/** Libellé d'un élément anonyme : extrémités d'une connexion, d'une succession ou d'une transition (« arret → marche »),
 * type d'un usage sans nom (« : Transmission »), expression d'une contrainte, début d'un commentaire.
 * @param {object} el @returns {string} Libellé ('' si rien d'utile) */
function capSySynthName(el){
  const end=e=>e?(e.el?capSyName(e.el):e.ref==='@entry'?'entry':e.ref||'?'):'?';
  const E=el.ends.filter(Boolean);
  if(/Transition|Succession/.test(el.kind)&&E.length) return end(el.ends[0])+' → '+end(el.ends[1]);
  if(E.length>1) return E.map(end).join(el.kind==='BindingConnectorAsUsage'?' = ':el.kind==='FlowUsage'||el.kind==='AllocationUsage'?' → ':' ↔ ');
  if(el.refs.typedBy) return ': '+el.refs.typedBy.join(', ');
  if(el.exprs.length) return '{ '+capSyCut(el.exprs.join('; '),60)+' }';
  if(el.kind==='Comment'&&el.body) return '/* '+capSyCut(el.body.replace(/\s+/g,' '),50)+' */';
  if(el.text) return capSyCut(el.text,60);
  return '';
}

/** Description HTML d'un élément SysML (documentation, ou corps d'un commentaire), paragraphes conservés.
 * @param {object} el @returns {string} */
function capSyDescHtml(el){
  const t=(el.kind==='Comment'||el.kind==='TextualRepresentation')?[el.body||'']:el.docs;
  const txt=t.filter(Boolean).join('\n\n');
  if(!txt) return '';
  return txt.split(/\n\s*\n/).map(p=>'<p>'+capEsc(p).replace(/\n/g,'<br>')+'</p>').join('');
}

/**
 * Convertit un modèle SysML en document XML pour le socle commun : un élément par membre (xsi:type « sysml:Métaclasse »),
 * attributs lisibles (déclaration, nom qualifié, multiplicité, valeur, direction, modificateurs, description) et
 * références vers les éléments du projet (« #id ») : typedBy, specializes, subsets, redefines, source / target…
 * Les références vers la bibliothèque standard sont gardées en texte (attribut library).
 * @param {object} M - Modèle (capSyBuildModel)
 * @param {string} name - Nom du projet ou du fichier
 * @returns {Document} Document XML ; le modèle est accessible par doc._sy
 */
function capSyToDoc(M, name){
  capSyAssignIds(M);
  const A=v=>capEsc(String(v)).replace(/\n/g,'&#10;').replace(/\r/g,'').replace(/\t/g,'&#9;');
  const ids=l=>(l||[]).map(r=>r&&r.el&&r.el._id?'#'+r.el._id:'').filter(Boolean).join(' ');
  const out=[];
  const emit=(el, depth)=>{
    if(el.kind==='Documentation') return;
    const syn=el.name?'':capSySynthName(el);   // élément anonyme : libellé lisible (cartes, tableaux, liens)
    const at=[['id',el._id],['name',el.name||syn]];
    if(syn) at.push(['anonymous','true']);
    if(el.shortName) at.push(['shortName',el.shortName]);
    if(el.keyword) at.push(['keyword',el.keyword]);
    if(!el.isFileRoot){ at.push(['declaration',capSyDeclText(el)]); if(el.name&&el.kind!=='Import') at.push(['qualifiedName',capSyQualified(el)]); }
    else at.push(['file',el.name]);
    if(el.vis&&el.vis!=='public') at.push(['visibility',el.vis]);
    if(el.mult) at.push(['multiplicity',el.mult]);
    if(el.value) at.push(['value',el.value]);
    if(el.dir) at.push(['direction',el.dir]);
    ['abstract','variation','variant','ref','end','derived','constant','individual','ordered','nonunique','negated','assert'].forEach(m=>{ if(el.mods[m]) at.push(['is'+m[0].toUpperCase()+m.slice(1),'true']); });
    if(el.conjugated) at.push(['isConjugated','true']);
    if(el.portion) at.push(['portionKind',el.portion]);
    if(el.role) at.push(['role',el.role]);
    if(el.stateRole) at.push(['stateRole',el.stateRole]);
    if(el.reqRole) at.push(['requirementRole',el.reqRole]);
    if(el.trigger) at.push(['triggerText',el.trigger]);
    if(el.guard) at.push(['guard',el.guard]);
    if(el.effect) at.push(['effect',el.effect]);
    if(el.via) at.push(['via',el.via]);
    if(el.payload) at.push(['payload',el.payload]);
    if(el.cond) at.push(['condition',el.cond]);
    if(el.language) at.push(['language',el.language]);
    if(el.exprs.length) at.push(['expression',el.exprs.join(' ; ')]);
    const d=capSyDescHtml(el); if(d) at.push(['description',d]);
    // Références vers les éléments du projet
    const R=el.res, lib=[];
    [['typedBy','typedBy'],['specializes','specializes'],['subsets','subsets'],['redefines','redefines'],['references','references'],['crosses','crosses'],
      ['about','annotatedElement'],['item','itemType'],['trigger','trigger'],['requirement','requirement'],['by','satisfyingFeature'],['target','target'],['source','source']].forEach(([k,a])=>{
      if(!R[k]) return;
      const v=ids(R[k]); if(v) at.push([a,v]);
      R[k].forEach((r,i)=>{ if(r&&r.lib&&!r.inherited) lib.push(r.lib.replace(/^\*::/,'')); });
    });
    if(el.kind==='Import'&&R.target&&R.target[0]&&R.target[0].el) at.push(['importedNamespace','#'+R.target[0].el._id]);
    const E=el.ends.filter(Boolean);
    if(E.length&&el.kind!=='Dependency'){
      const e0=E[0]&&E[0].res&&E[0].res.el, rest=el.ends.slice(1).map(e=>e&&e.res&&e.res.el).filter(Boolean);
      if(e0) at.push(['source','#'+e0._id]); if(rest.length) at.push(['target',rest.map(x=>'#'+x._id).join(' ')]);
      const pseudo=el.ends.map(e=>e&&e.res&&e.res.pseudo).filter(Boolean); if(pseudo.length) at.push(['pseudoEnds',pseudo.join(' ')]);
    }
    if(lib.length) at.push(['library',[...new Set(lib)].join(' ')]);
    if(el.meta.length) at.push(['metadata',[...new Set(el.meta)].join(' ')]);
    // Cible de la relation pour les éléments « référence » (perform a.b, exhibit s, include u) : vers l'élément visé
    const pad='  '.repeat(depth);
    const tag=el.isFileRoot?'ownedNamespace':'ownedMember';
    const seen=new Set();   // un attribut XML ne peut apparaître qu'une fois (le premier l'emporte)
    const attrs=at.filter(([k,v])=>v!==''&&v!=null&&!seen.has(k)&&seen.add(k)).map(([k,v])=>` ${k}="${A(v)}"`).join('');
    const kids=el.members.filter(m=>m.kind!=='Documentation');
    if(!kids.length){ out.push(`${pad}<${tag} xsi:type="sysml:${el.kind}"${attrs}/>`); return; }
    out.push(`${pad}<${tag} xsi:type="sysml:${el.kind}"${attrs}>`);
    kids.forEach(m=>emit(m, depth+1));
    out.push(`${pad}</${tag}>`);
  };
  M.files.forEach(f=>emit(f.root, 1));
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<sysml:Model xmlns:sysml="https://www.omg.org/spec/SysML/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${A(name)}" arcalyse-format="sysml">\n${out.join('\n')}\n</sysml:Model>`;
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error(_L('Conversion SysML → XML impossible'));
  const byId=new Map(); M.all.forEach(e=>{ if(e._id) byId.set(e._id, e); });
  doc._sy={M, name, files:M.files.map(f=>({path:f.path, text:f.text})), byId};
  return doc;
}

/** Texte .sysml (un fichier) → document XML du socle commun (🔄 suivi du fichier, ⚖ Comparaison de versions).
 * @param {string} text @param {string} name - Nom du fichier @returns {Document} */
function capSyTextToDoc(text, name){ return capSyToDoc(capSyBuildModel([{path:name||'model.sysml', text}]), name||'model.sysml'); }

/** Texte d'un fichier → document XML selon son extension (.sysml : conversion SysML ; sinon XML Capella).
 * @param {string} text @param {string} name @returns {Document} Document (avec parsererror si le XML est invalide) */
function capTextToDoc(text, name){
  if(/\.sysml$/i.test(name||'')||(!name&&_capFmt==='sysml')) {
    try{ return capSyTextToDoc(text, name||(_capSy&&_capSy.name)||'model.sysml'); }
    catch(e){ return new DOMParser().parseFromString('<x><parsererror/></x>','application/xml'); }
  }
  return new DOMParser().parseFromString(text,'application/xml');
}

/**
 * Charge un projet SysML v2 (un ou plusieurs fichiers .sysml) : analyse, résolution, contrôles, conversion,
 * puis pipeline commun (capApplyXmlDoc). Le 🔄 suivi du fichier n'est armé que pour un fichier seul.
 * @param {{path:string,text:string}[]} files - Fichiers
 * @param {string} name - Nom affiché (fichier, dossier ou archive)
 * @param {{file:File, handle:?FileSystemFileHandle}} [src] - Fichier seul, pour le suivi
 */
function capSyLoadFiles(files, name, src){
  files=(files||[]).filter(f=>/\.sysml$/i.test(f.path));
  if(!files.length) throw new Error(_L('Aucun fichier .sysml'));
  const M=capSyBuildModel(files);
  if(M.all.length<=M.files.length) throw new Error(_L('Aucun élément SysML reconnu'));
  const doc=capSyToDoc(M, name);
  capApplyXmlDoc(doc, name);
  if(src&&src.file&&files.length===1) capWatchSetSource(src.file, src.handle||null, files[0].text);
  else if(typeof _capWatch!=='undefined'){ Object.assign(_capWatch,{handle:null, file:null, pending:null, history:[]}); if(typeof capWatchUpdateUi==='function') capWatchUpdateUi(); }
  capWelcomeStatus('',''); capShowWelcome(false);
  const nE=M.diags.filter(d=>d.severity==='error').length, nW=M.diags.length-nE;
  if(typeof capWatchFlash==='function') capWatchFlash(_L(`◇ SysML v2 : ${M.all.length-M.files.length} élément(s), ${files.length} fichier(s)`)+(nE||nW?_L(` — ${nE} erreur(s), ${nW} avertissement(s) : voir ◇ SysML v2 › ✔ Contrôles`):''));
}

/** Lit des fichiers (File) .sysml et les charge comme un projet. @param {File[]} list - Fichiers @param {string} [name] - Nom du projet */
function capSyLoadFileList(list, name){
  const fl=[...list].filter(f=>/\.sysml$/i.test(f.name));
  capWelcomeStatus(_L(`Chargement de ${fl.length} fichier(s) SysML…`),'busy'); capShowWelcome(true);
  Promise.all(fl.map(f=>f.text().then(text=>({path:f.webkitRelativePath||f.name, text})))).then(files=>{
    try{ capSyLoadFiles(files, name||(fl.length===1?fl[0].name:_L('Projet SysML'))); }
    catch(e){ capWelcomeStatus(_L('Erreur de chargement : ')+e.message,'err'); capShowWelcome(true); }
  }).catch(e=>capWelcomeStatus(_L('Lecture impossible : ')+(e&&e.message||e),'err'));
}

/**
 * Lit une archive de projet .kpar (KerML §10.3 : ZIP, .project.json, .meta.json, fichiers modèle) et charge ses fichiers
 * .sysml. Décompression par DecompressionStream('deflate-raw') du navigateur (aucune bibliothèque).
 * @param {File} f - Archive
 */
async function capSyLoadKpar(f){
  capWelcomeStatus(_L(`Lecture de l'archive « ${f.name} »…`),'busy'); capShowWelcome(true);
  try{
    const ent=await capZipRead(await f.arrayBuffer());
    const files=[]; let proj=null;
    for(const e of ent){
      if(/(^|\/)\.project\.json$/.test(e.name)){ try{ proj=JSON.parse(await e.text()); }catch(_){} }
      if(/\.sysml$/i.test(e.name)) files.push({path:e.name, text:await e.text()});
    }
    if(!files.length) throw new Error(_L('aucun fichier .sysml dans l\'archive (les fichiers .kerml ne sont pas lus)'));
    capSyLoadFiles(files, (proj&&proj.name)||f.name);
  }catch(e){ capWelcomeStatus(_L('Erreur de lecture de l\'archive : ')+(e&&e.message||e),'err'); capShowWelcome(true); }
}

/**
 * Lit les entrées d'une archive ZIP (répertoire central ; méthodes « stockée » et « deflate »).
 * @param {ArrayBuffer} buf - Contenu de l'archive
 * @returns {Promise<{name:string, text:function():Promise<string>}[]>} Entrées (fichiers)
 */
async function capZipRead(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf);
  let eocd=-1; for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--){ if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if(eocd<0) throw new Error(_L('archive ZIP illisible'));
  const n=dv.getUint16(eocd+10,true); let p=dv.getUint32(eocd+16,true);
  const out=[], dec=new TextDecoder('utf-8');
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const meth=dv.getUint16(p+10,true), csz=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl));
    p+=46+nl+xl+cl;
    if(name.endsWith('/')) continue;
    const lnl=dv.getUint16(off+26,true), lxl=dv.getUint16(off+28,true), data=u8.subarray(off+30+lnl+lxl, off+30+lnl+lxl+csz);
    out.push({name, text:async()=>{
      if(meth===0) return dec.decode(data);
      if(meth!==8) throw new Error(_L(`méthode de compression ${meth} non prise en charge`));
      if(typeof DecompressionStream==='undefined') throw new Error(_L('décompression indisponible dans ce navigateur'));
      const s=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return dec.decode(await new Response(s).arrayBuffer());
    }});
  }
  return out;
}

/* ── Relations SysML (🔗 Liens, ▤ Tableau, 🗺 Relation Map) ────────────────────────────────────────────── */

/**
 * Calcule les relations SysML du modèle affiché, au format de capComputeLinks : {clé → [{src, tgt, via?}]}.
 * @returns {object} Relations par section de CAP_SY_LINK_SECTIONS
 */
function capSyComputeLinks(){
  const links={}; CAP_SY_LINK_SECTIONS.forEach(s=>links[s.key]=[]);
  if(!_capSy) return links;
  const M=_capSy.M;
  const E=el=>({name:el.name||el.keyword||el.kind, id:el._id, type:el.kind});
  const add=(k, a, b, via)=>{ if(a&&b&&a!==b&&a._id&&b._id&&!a.isFileRoot&&!b.isFileRoot) links[k].push(via?{src:E(a), tgt:E(b), via:E(via)}:{src:E(a), tgt:E(b)}); };
  const els=l=>(l||[]).map(r=>r&&r.el).filter(Boolean);
  const endEl=e=>e&&e.res&&e.res.el||null;
  const STRUCT=/^(Part|Item|Port|Occurrence|Connection|Interface|Allocation|Reference)/;
  M.all.forEach(el=>{
    const R=el.res;
    if(!el.isDef) els(R.typedBy).forEach(t=>add('sy_typ', el, t));
    if(el.isDef) els(R.specializes).forEach(t=>add('sy_spec', el, t));
    if(!el.isRefUsage) els(R.subsets).forEach(t=>add('sy_sub', el, t));
    els(R.redefines).forEach(t=>add('sy_redef', el, t));
    const o=el.owner;
    if(o&&!o.isFileRoot&&o.kind!=='Package'&&o.kind!=='LibraryPackage'){
      if(/^(PartUsage|ItemUsage|PortUsage|OccurrenceUsage)$/.test(el.kind)&&STRUCT.test(o.kind)) add(el.mods.ref?'sy_ref':'sy_comp', o, el);
      else if(el.kind==='ReferenceUsage'&&STRUCT.test(o.kind)&&el.mods.ref) add('sy_ref', o, el);
      if(/^(ActionUsage|StateUsage|PerformActionUsage|ExhibitStateUsage|AcceptActionUsage|SendActionUsage|CalculationUsage)$/.test(el.kind)&&/^(Action|State|Calculation|UseCase|Case|AnalysisCase|VerificationCase|Perform|Exhibit)/.test(o.kind)) add('sy_deco', o, el);
    }
    const a=endEl(el.ends[0]), rest=el.ends.slice(1).map(endEl).filter(Boolean);
    if(el.kind==='ConnectionUsage'||el.kind==='InterfaceUsage') rest.forEach(b=>add('sy_conn', a, b, el));
    else if(el.kind==='BindingConnectorAsUsage') rest.forEach(b=>add('sy_bind', a, b));
    else if(el.kind==='AllocationUsage') rest.forEach(b=>add('sy_alloc', a, b));
    else if(el.kind==='FlowUsage'||el.kind==='SuccessionFlowUsage') rest.forEach(b=>add('sy_flow', a, b, el));
    else if(el.kind==='SuccessionAsUsage') rest.forEach(b=>add('sy_succ', a, b));
    else if(el.kind==='TransitionUsage') rest.forEach(b=>add('sy_trans', a, b));
    const perfOwner=()=>{ let p=el.owner; while(p&&!/^(Part|Item|Occurrence)/.test(p.kind)&&!p.isFileRoot) p=p.owner; return p&&!p.isFileRoot?p:null; };
    if(el.kind==='PerformActionUsage'){ const t=els(R.subsets)[0]||els(R.typedBy)[0]||el; add('sy_perf', perfOwner(), t); }
    if(el.kind==='ExhibitStateUsage'){ const t=els(R.subsets)[0]||els(R.typedBy)[0]||el; add('sy_exh', perfOwner(), t); }
    if(el.kind==='SatisfyRequirementUsage'){ const req=els(R.requirement)[0]||els(R.typedBy)[0]; const by=els(R.by)[0]||(el.owner&&!el.owner.isFileRoot&&el.owner.kind!=='Package'?el.owner:null); add('sy_sat', by, req); }
    if(el.kind==='VerifyRequirementUsage'||(el.reqRole==='verify')){ const req=els(R.requirement)[0]||els(R.typedBy)[0]; let vc=el.owner; while(vc&&!/^VerificationCase/.test(vc.kind)&&!vc.isFileRoot) vc=vc.owner; add('sy_ver', vc&&!vc.isFileRoot?vc:el.owner, req); }
    if(el.role==='subject'&&el.owner){ els(R.typedBy).forEach(t=>add('sy_subj', el.owner, t)); }
    if((el.role==='actor'||el.role==='stakeholder')&&el.owner){ els(R.typedBy).forEach(t=>add('sy_actor', el.owner, t)); }
    if(el.kind==='IncludeUseCaseUsage'){ let uc=el.owner; add('sy_incl', uc, els(R.subsets)[0]||els(R.typedBy)[0]); }
    if(el.kind==='Dependency') els(R.source).forEach(s=>els(R.target).forEach(t=>add('sy_dep', s, t)));
    if(el.kind==='Import'&&R.target&&R.target[0]&&R.target[0].el&&el.owner&&!el.owner.isFileRoot) add('sy_imp', el.owner, R.target[0].el);
    if(el.kind==='MetadataUsage'){ const t=els(R.typedBy)[0]; const tg=els(R.about); (tg.length?tg:[el.owner]).forEach(x=>add('sy_meta', x, t)); }
  });
  return links;
}

/* ── Icônes SysML (rectangle à coins droits : définition ; arrondi : usage — notation §8.2.3) ───────────── */

/** Lettres affichées dans l'icône de chaque sorte d'élément. */
const CAP_SY_ICO_TXT={Part:'P',Item:'I',Attribute:'A',Port:'Pt',Connection:'C',Interface:'If',Allocation:'Al',Flow:'F',Action:'Ac',State:'S',Calculation:'Ca',
  Constraint:'Co',Requirement:'R',Concern:'Cn',Case:'Cs',AnalysisCase:'An',VerificationCase:'V',UseCase:'U',View:'Vw',Viewpoint:'Vp',Rendering:'Rd',Metadata:'@',
  Occurrence:'O',Enumeration:'E',EventOccurrence:'Ev',Reference:'r',Package:'',LibraryPackage:'',Namespace:'',Import:'⇢',Alias:'≡',Comment:'"',Dependency:'⤳',
  Transition:'→',Succession:'⇒',Satisfy:'✓',VerifyRequirement:'✔',Perform:'▶',Exhibit:'◉',IncludeUseCase:'+',Fork:'‖',Join:'‖',Merge:'◇',Decision:'◇',BindingConnector:'=',
  Accept:'⌛',Send:'✉',Assignment:':=',If:'?',WhileLoop:'↻',ForLoop:'↻',Terminate:'■',StateAction:'s',Expose:'👁',AssertConstraint:'!',SuccessionFlow:'F'};

/**
 * Icône SVG d'une métaclasse SysML : dossier pour un paquetage, rectangle à coins droits (définition) ou arrondis (usage)
 * coloré selon la famille, avec une ou deux lettres.
 * @param {string} kind - Métaclasse @param {number} [taille] - Côté en pixels @returns {string} <svg>
 */
function capSyIcoKind(kind, taille){
  const t=taille||14, L=CAP_LAYERS[capSyLayerOf(kind)]||CAP_SY_LAYERS[capSyLayerOf(kind)]||{color:'#8b949e'}, c=L.color;
  if(/^(Package|LibraryPackage|Namespace)$/.test(kind))
    return `<svg width="${t}" height="${t}" viewBox="0 0 16 16" style="flex-shrink:0;vertical-align:middle"><path d="M1.5 4.5h5l1 -1.5h7v10.5h-13z" fill="${c}33" stroke="${c}" stroke-width="1.2"/></svg>`;
  const def=/Definition$/.test(kind), base=kind.replace(/(Definition|Usage|Node|ActionUsage|AsUsage|RequirementUsage)$/,'').replace(/Action$/,'');
  const txt=CAP_SY_ICO_TXT[base]!=null?CAP_SY_ICO_TXT[base]:(CAP_SY_ICO_TXT[kind.replace(/Usage$/,'')]||kind[0]);
  const fs=txt.length>1?6.6:8.5;
  return `<svg width="${t}" height="${t}" viewBox="0 0 16 16" style="flex-shrink:0;vertical-align:middle"><rect x="1" y="2" width="14" height="12" rx="${def?0.6:4}" fill="${c}${def?'40':'22'}" stroke="${c}" stroke-width="1.2"/>`+
    `<text x="8" y="10.6" text-anchor="middle" font-size="${fs}" font-family="Segoe UI,Arial,sans-serif" font-weight="700" fill="${c}">${capEsc(txt)}</text></svg>`;
}
/** Icône SVG d'un élément SysML du modèle affiché (par identifiant). @param {string} id @param {number} [taille] @returns {string} */
function capSyIco(id, taille){
  const el=_capSy&&_capSy.byId.get(id); if(!el) return '';
  return capSyIcoKind(el.isFileRoot?'Namespace':el.kind, taille);
}

/** Script d'amorçage d'une page enregistrée avec un modèle SysML : recharge les fichiers embarqués (bloc cap-embedded-sysml). */
function capSyBoot(){
  const el=document.getElementById('cap-embedded-sysml'); if(!el) return;
  try{ const o=JSON.parse(el.textContent); capSyLoadFiles(o.files||[], o.name||'', null); if(typeof capUpdateWelcome==='function') capUpdateWelcome(); }
  catch(e){ console.error(_L('Erreur au rechargement du modèle SysML embarqué :'), e); }
}
