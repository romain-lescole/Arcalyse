/* ═══════════════════════════════════════════════════════════════════
   MOTEUR CAPELLA — intégré à Arcalyse
═══════════════════════════════════════════════════════════════════ */
const CAP_LAYERS={
  OA:    {label:_L('Operational Analysis'), color:'#3b82f6',bg:'rgba(59,130,246,.15)'},
  SA:    {label:_L('System Analysis'),      color:'#22c55e',bg:'rgba(34,197,94,.15)'},
  LA:    {label:_L('Logical Architecture'), color:'#eab308',bg:'rgba(234,179,8,.15)'},
  PA:    {label:_L('Physical Architecture'),color:'#f97316',bg:'rgba(249,115,22,.15)'},
  EPBS:  {label:_L('EPBS Architecture'),   color:'#ef4444',bg:'rgba(239,68,68,.15)'},
  Shared:{label:_L('Transverse'),          color:'#a78bfa',bg:'rgba(167,139,250,.15)'},
};
const CAP_NS_LAYER={oa:'OA',ctx:'SA',la:'LA',pa:'PA',epbs:'EPBS',fa:'Shared',cs:'Shared',interaction:'Shared',information:'Shared','information.datatype':'Shared','information.datavalue':'Shared',capellacommon:'Shared',capellacore:'Shared',capellamodeller:'Shared',libraries:'Shared'};
const CAP_ANCESTOR_KW=[['operationalanalysis','OA'],['systemanalysis','SA'],['logicalarchitecture','LA'],['physicalarchitecture','PA'],['epbsarchitecture','EPBS']];
const CAP_ATTR_KEYS=['name','kind','nature','direction','visibility','aggregationKind','exchangeMechanism','abstract','actor','human','composite','description','summary','value','involved','exchangedItems','abstractType','source','target','sourceElement','targetElement','navigableMembers','exchanges','constrainedElements','pattern'];
const CAP_TECHNICAL_TYPES=new Set(['LiteralNumericValue','LiteralBooleanValue','OpaqueExpression','BooleanPropertyValue','PropertyValueGroup','PropertyValuePkg','KeyValue','ModelInformation','TransfoLink','GenericTrace','PortRealization','FunctionalExchangeRealization','FunctionRealization','FunctionalChainRealization','ComponentRealization','AbstractCapabilityRealization','AbstractCapabilityInclude','FunctionalChainAbstractCapabilityInvolvement','AbstractFunctionAbstractCapabilityInvolvement','FunctionalChainInvolvementFunction','FunctionalChainInvolvementLink','FunctionalChainReference','ControlNode','SequenceLink','ComponentFunctionalAllocation','ActivityAllocation','RoleAllocation','CapabilityExploitation','MissionInvolvement','CapabilityInvolvement','SystemAnalysisRealization','LogicalArchitectureRealization','OperationalAnalysisRealization','PhysicalArchitectureRealization','PhysicalArtifactRealization','Generalization','ExchangeCategory','NumericType','StringType','BooleanType','SystemEngineering','ConceptPkg','RolePkg','Part','PhysicalLink','PartDeploymentLink','CatalogElementLink','PhysicalPathInvolvement','CapabilityRealizationInvolvement','EntityOperationalCapabilityInvolvement','AbstractStateRealization','CombinedFragment','ComponentExchangeFunctionalExchangeAllocation','ComponentExchange','ComponentExchangeAllocation','ComponentPort','ComponentPortAllocation','ExecutionEnd','Execution','ExecutionEvent','FragmentEnd','FunctionalExchange','FunctionInputPort','FunctionOutputPort','InformationRealization','InitialPseudoState','InteractionState','InteractionOperand','InteractionUse','MessageEnd','StateFragment','StateTransition','StateTransitionRealization']);
const CAP_PKG_TYPES=new Set(['EntityPkg','OperationalActivityPkg','OperationalCapabilityPkg','RolePkg','CapabilityPkg','MissionPkg','SystemComponentPkg','SystemFunctionPkg','CapabilityRealizationPkg','LogicalComponentPkg','LogicalFunctionPkg','PhysicalComponentPkg','PhysicalFunctionPkg','ConfigurationItemPkg','CatalogElementPkg','CompliancyDefinitionPkg','DataPkg','InterfacePkg']);
const CAP_TYPE_ICON={OperationalAnalysis:'OA',SystemAnalysis:'SA',LogicalArchitecture:'LA',PhysicalArchitecture:'PA',OperationalActivity:'fn',Entity:'en',Role:'ro',OperationalCapability:'cp',OperationalProcess:'pr',OperationalExchange:'ex',SystemFunction:'fn',SystemComponent:'co',SystemActor:'ac',Capability:'cp',Mission:'ms',LogicalFunction:'fn',LogicalComponent:'co',LogicalActor:'ac',PhysicalFunction:'fn',PhysicalComponent:'co',PhysicalActor:'ac',PhysicalPath:'ph',ConfigurationItem:'ci',FunctionalChain:'fc',Interface:'if',ExchangeItem:'ei',Class:'cl',Part:'pt',Constraint:'cn'};



// State
let capAllElements=[], capTreeData=null, cap_xmlDoc=null;
let capTypeRegistry={}, capEnabledTypes=new Set();
let capCollapsedGroups=new Set();   // couches repliées dans la barre latérale des types (toutes dépliées au départ)
let capCurrentView='home', capCurrentLayer='all', capSearch='', capPage=0, capPageSize=100;
let capLinksData=null, capChainsData=null, capLinksFilter='all', capChainsFilter='all';
let capTreeFilter='';
let capLoaded=false;

/** Construit le HTML de la page actuelle (tout le HTML/CSS/JS de l'application), fichier
 * autonome, en y embarquant le fichier .capella déjà chargé en mémoire (sérialisé depuis
 * cap_xmlDoc). À l'ouverture, un petit script de bootstrap relit ce XML embarqué et rejoue
 * automatiquement le même pipeline de chargement que lors d'un import manuel — la page
 * rouverte se comporte donc exactement comme l'état actuel, fichier Capella déjà chargé.
 * @returns {string} Document HTML complet */
function capBuildPageHtml(){
  capCfgStoreViews();   // ▤ Tableau (onglets) et thème choisi mémorisés dans la page (46-config-interface.js)
  // Clone le document actuel tel quel
  const doc = document.documentElement.cloneNode(true);
  // Sans les fenêtres créées à l'exécution (placées après le script principal) : recréées à la réouverture, elles
  // feraient doublon (et resteraient dans l'ancienne langue dans la version multilingue). Scripts (données JSON) et styles gardés.
  const live = [...document.body.children], cloned = [...doc.querySelector('body').children];
  const main = live.findIndex(e => e.tagName === 'SCRIPT' && !e.id && !e.type && e.textContent.includes('function capBuildPageHtml'));
  if (main >= 0 && cloned.length === live.length)
    live.forEach((e, i) => { if (i > main && !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(e.tagName)) cloned[i].remove(); });

  // Retire tout bootstrap résiduel d'une sauvegarde précédente, pour éviter les doublons
  // si on sauvegarde plusieurs fois de suite un fichier déjà sauvegardé.
  // (tous : après un 🌐 changement de langue, le modèle transmis précède celui de la page enregistrée)
  doc.querySelectorAll('#cap-embedded-xml, #cap-embedded-bootstrap, #cap-embedded-aird').forEach(e => e.remove());

  if (capLoaded && cap_xmlDoc) {
    // Sérialise le document XML Capella tel qu'il a été chargé
    let xmlText = new XMLSerializer().serializeToString(cap_xmlDoc);
    if (typeof capReqifPageXml === 'function') xmlText = capReqifPageXml(xmlText);   // 📑 images des textes ReqIF recopiées dans la page (101)

    const xmlScript = document.createElement('script');
    xmlScript.id = 'cap-embedded-xml';
    xmlScript.type = 'application/xml';
    xmlScript.dataset.name = capCurrentFileName || '';   // nom du fichier .capella, repris à la réouverture
    xmlScript.textContent = xmlText;
    doc.querySelector('body').appendChild(xmlScript);

    // Diagrammes du projet (.aird chargé) : repris à la réouverture de la page (🔲 Diagrammes Capella, 🏠 Accueil)
    if (typeof _capDiag !== 'undefined' && _capDiag.texteAird) {
      const airdScript = document.createElement('script');
      airdScript.id = 'cap-embedded-aird';
      airdScript.type = 'application/xml';
      airdScript.dataset.name = _capDiag.nomAird || '';
      airdScript.textContent = _capDiag.texteAird;
      doc.querySelector('body').appendChild(airdScript);
    }

    const bootScript = document.createElement('script');
    bootScript.id = 'cap-embedded-bootstrap';
    bootScript.textContent = `
(function(){
  /** Script d'amorçage injecté dans la page HTML sauvegardée : rejoue le pipeline de
   * chargement Capella à partir du XML embarqué, pour que le modèle soit disponible
   * dès la réouverture du fichier sans avoir à recharger le .capella d'origine.
   */
  function boot(){
    var xmlEl = document.getElementById('cap-embedded-xml');
    if (!xmlEl) return;
    try {
      var doc = new DOMParser().parseFromString(xmlEl.textContent, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('XML embarqué invalide');
      cap_xmlDoc = doc;
      capAllElements = [];
      capTreeData = capBuildTree(doc.documentElement, new Set());
      if (!capAllElements.length) throw new Error('Aucun élément reconnu');
      var airdEl = document.getElementById('cap-embedded-aird');
      if (airdEl && typeof capDiagSetAird === 'function') capDiagSetAird(airdEl.textContent, airdEl.getAttribute('data-name') || '', null, 0);
      capBuildTypeRegistry();
      capRunBulk(()=>{ // un seul rendu du panneau et de l'arborescence à la fin
        capInjectToArbo();
        capInjectCapellaRelsToCriteria();
        capInjectLinksToModel();
        capFilterArboToLinked();
        capInjectChainsToModal();
        capApplyPanelOnLoad();
      });
      if (typeof rmViewsOnModelLoad === 'function') rmViewsOnModelLoad();
      capLoaded = true;
      capCurrentFileName = xmlEl.getAttribute('data-name') || '';
      applyMode('capella');
      if (typeof capUpdateWelcome === 'function') capUpdateWelcome();
      if (typeof capRevOnModelLoad === 'function') capRevOnModelLoad();
      if (typeof capAutoBanner === 'function') capAutoBanner();
    } catch (err) {
      console.error('Erreur au rechargement du fichier Capella embarqué :', err);
    }
  }
  // Le bootstrap s'exécute après l'initialisation complète du script principal
  // (placé en fin de <body>, donc le DOM et toutes les fonctions sont déjà prêts).
  boot();
})();`;
    doc.querySelector('body').appendChild(bootScript);
  }

  // Commentaires placés avant <html> (avis de copyright et licence Apache 2.0) : à conserver
  const pre=[...document.childNodes].filter(n=>n.nodeType===8).map(n=>'<!--'+n.data+'-->\n').join('');
  return '<!DOCTYPE html>\n' + pre + doc.outerHTML;
}
/* ── 🌐 Changement de langue (version multilingue) : tout le travail suit ───────────────────────────────
   La page est rechargée dans l'autre langue (build.js : capLangSwitch, cap-lang-boot, cap-lang-restore). L'état passe par
   window.name : blocs de données de la page (revue, rapports et dossiers, tableaux de bord, réglages…), modèle — Capella :
   XML, .aird et script d'amorçage de la 💾 page enregistrée ; SysML / UML : fichiers d'origine relus par leur lecteur —, vue. */

/** Fichiers d'origine du modèle SysML / UML affiché ({k, nom, fichiers:[{nom, chemin, lire}]}), posés quand sa lecture réussit. */
let _capSources=null, _capSourcesPend=null;
/**
 * Retient les fichiers d'une lecture SysML / UML en cours (appelée par 87 et 88) ; gardés si elle aboutit (capSysmlAppliquer).
 * @param {string} k - 'sy' (un fichier .sysml / .kpar), 'syd' (dossier de .sysml), 'umld' (fichiers UML / SysML v1), 'rq' (un .reqif / .reqifz), 'rqd' (fichiers ReqIF et pièces jointes)
 * @param {string} nom - Nom affiché
 * @param {{nom:string, chemin:string, lire:function():Promise<File>}[]} fichiers - Fichiers
 * @param {string} [choix] - Chemin du modèle principal choisi parmi plusieurs (dossier UML : rouvert sans redemander)
 */
function capSourcesNoter(k, nom, fichiers, choix){ _capSourcesPend={k, nom, fichiers, choix:choix||''}; }
/** Lit un fichier en base 64. @param {Blob} f @returns {Promise<string>} */
function capLangB64(f){ return new Promise((ok, ko)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).replace(/^data:[^,]*,/,'')); r.onerror=()=>ko(r.error); r.readAsDataURL(f); }); }
/**
 * État complet de la page à transmettre lors d'un changement de langue.
 * @returns {Promise<object>} {blocs:[{id, type, nom, texte}], boot, sources, vue}
 */
async function capLangEtat(){
  const st={blocs:[], boot:'', sources:null, vue:null};
  const d=new DOMParser().parseFromString(capBuildPageHtml(), 'text/html');   // blocs à jour (capCfgStoreViews), modèle embarqué
  if(_capSources&&typeof _capSysml!=='undefined'&&_capSysml.lecture){   // SysML / UML : fichiers d'origine, relus par leur lecteur dans l'autre langue
    try{ const f=[]; for(const x of _capSources.fichiers){ const file=await x.lire(); f.push({nom:x.nom, chemin:x.chemin, b64:await capLangB64(file)}); }
      st.sources={k:_capSources.k, nom:_capSources.nom, choix:_capSources.choix||'', fichiers:f}; }catch(e){ console.warn('Fichiers du modèle illisibles :', e); }
  }
  d.querySelectorAll('script[id]').forEach(s=>{
    const embarque=/^cap-embedded-(xml|aird)$/.test(s.id);
    if(s.type==='application/json'||(embarque&&!st.sources)) st.blocs.push({id:s.id, type:s.type, nom:s.getAttribute('data-name')||'', texte:s.textContent, corps:embarque});
    if(s.id==='cap-embedded-bootstrap'&&!st.sources) st.boot=s.textContent;
  });
  st.vue={vue:capCurrentView, mode:typeof currentMode!=='undefined'?currentMode:'', tab:typeof _capHomeUi!=='undefined'?_capHomeUi.tab:'', dos:typeof _capDosUi!=='undefined'?_capDosUi.cur:'',
    sub:typeof capAnaSub!=='undefined'?capAnaSub:''};
  return st;
}
/**
 * Rejoue l'état transmis par un changement de langue, une fois la page chargée : modèle (amorçage de la page enregistrée, ou lecture
 * des fichiers SysML / UML d'origine), puis vue affichée. Les blocs de données ont été replacés avant le script principal (cap-lang-boot).
 * @param {object} w - État (capLangEtat)
 */
function capLangRestaurer(w){
  const vue=()=>{ const v=w.vue; if(!v) return; let n=0;
    const t=setInterval(()=>{ if(++n>240){ clearInterval(t); return; } if(!capLoaded||(w.sources&&!_capSources)) return; clearInterval(t);   // SysML / UML : lecture d'origine refaite
      try{ if(typeof capAnaSub!=='undefined'&&v.sub) capAnaSub=v.sub;
        if(typeof _capHomeUi!=='undefined'&&v.tab) _capHomeUi.tab=v.tab; if(typeof _capDosUi!=='undefined'&&v.dos) _capDosUi.cur=v.dos;
        if(v.mode&&v.mode!=='capella') applyMode(v.mode); else if(v.vue) capShowView(v.vue); }catch(e){ console.warn('Vue non rétablie :', e); } }, 250); };
  if(w.sources){
    const f=w.sources.fichiers.map(x=>{ const b=atob(x.b64), o=new Uint8Array(b.length); for(let i=0;i<b.length;i++) o[i]=b.charCodeAt(i);
      const file=new File([o], x.nom); return {nom:x.nom, chemin:x.chemin, lire:()=>Promise.resolve(file)}; });
    try{
      if(w.sources.k==='sy') f[0].lire().then(file=>capSysmlOuvrir(file, null, true));
      else if(w.sources.k==='syd') capSysmlOuvrirDossier(f, w.sources.nom, true);
      else if(w.sources.k==='rq') f[0].lire().then(file=>capReqifOuvrir(file, null, true));   // 📑 ReqIF (101)
      else if(w.sources.k==='rqd') capReqifOuvrirDossier(f, w.sources.nom, true);
      else capUmlOuvrirDossier(f, w.sources.nom, true, w.sources.choix);   // modèle principal déjà choisi : pas de nouvelle question
    }catch(e){ console.error('Modèle non rechargé :', e); }
  } else if(w.boot&&!capLoaded){ const s=document.createElement('script'); s.textContent=w.boot; document.body.appendChild(s); }   // amorçage de la page enregistrée
  vue();
}
/** Nom de fichier proposé pour la page sauvegardée (celui de la page de projet ouverte, s'il y en a une). */
function capPageFileName(){ return capLoaded ? (typeof _capProjetPage!=='undefined'&&_capProjetPage.nom||_L('arcalyse-avec-modele.html')) : 'arcalyse.html'; }
/** Sauvegarde la page en la téléchargeant (dossier Téléchargements du navigateur). */
function capSaveFullPage(){
  const blob = new Blob([capBuildPageHtml()], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = capPageFileName();
  a.click();
  URL.revokeObjectURL(a.href);
  if(typeof capRevMarkSaved==='function') capRevMarkSaved();
}
/** Écrit la page dans le fichier d'enregistrement direct, après avoir copié la version précédente
 * dans le fichier de secours s'il est demandé (⚙ Préférences › Enregistrement, 64-preferences.js).
 * @param {string} html - Page complète
 */
async function capSaveWrite(html){
  if(typeof capAutoBackup==='function') await capAutoBackup();
  const w=await _capSaveHandle.createWritable(); await w.write(html); await w.close();
  if(typeof capAutoWritten==='function') capAutoWritten(html);
}
let _capSaveHandle=null;   // fichier choisi pour l'enregistrement direct (valable pour la session)
/** Enregistre la page directement dans un fichier choisi une fois (API File System Access d'Edge/Chrome),
 * puis l'écrase à chaque enregistrement suivant, sans passer par les téléchargements.
 * Repli sur le téléchargement si le navigateur ne le permet pas (Firefox…).
 * @param {boolean} [saveAs] - true : redemander l'emplacement (« Enregistrer sous »)
 */
async function capSavePageDirect(saveAs){
  if(!window.showSaveFilePicker){ capSaveFullPage(); return true; }
  const btn=document.getElementById('b-save-direct');
  try{
    if(saveAs||!_capSaveHandle) _capSaveHandle=await window.showSaveFilePicker({suggestedName:capPageFileName(),
      types:[{description:_L('Page HTML'),accept:{'text/html':['.html','.htm']}}]});
    await capSaveWrite(capBuildPageHtml());
    if(btn){ btn.title=_L(`Enregistrer dans « ${_capSaveHandle.name} » (Ctrl+S) — Maj+clic ou Ctrl+Maj+S : enregistrer sous`);
      const t=btn.textContent; btn.textContent=_L('✔ Enregistré'); setTimeout(()=>{ btn.textContent=t; },1500); }
    if(typeof capRevMarkSaved==='function') capRevMarkSaved();
    return true;
  }catch(e){
    if(e&&e.name==='AbortError') return false;   // fenêtre annulée par l'utilisateur
    console.error(e); _capSaveHandle=null;
    capAlert(_L('Enregistrement direct impossible (')+(e&&e.message||e)+_L(').\nLa page va être téléchargée à la place.'));
    capSaveFullPage();
    return true;
  }
}
// Avertissement avant de quitter la page (bouton ← Précédent, fermeture de l'onglet, autre adresse) quand un modèle
// est chargé : tout le travail en cours (modèle, filtres, tableaux de bord non enregistrés) serait perdu.
// Le navigateur affiche son propre message (le texte ne peut pas être personnalisé).
window.addEventListener('beforeunload', e=>{
  if(!capLoaded||window._capNoLeaveWarn) return;
  e.preventDefault(); e.returnValue='';
});
document.getElementById('b-save-direct')?.addEventListener('click', e=>capSavePageDirect(e.shiftKey));
document.addEventListener('keydown', e=>{
  if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); }
});

/** Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s */
function capEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── File loading ──
document.getElementById('capella-file-input').addEventListener('cancel',()=>{ _capReplaceOk=0; });
document.getElementById('capella-file-input').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  capLoadFile(f, null, capReplacePreOk());
  e.target.value=''; // permet de recharger le même fichier
});

/** Formats de modèles ouverts par Arcalyse : clé, libellé, pictogramme, couleur de la pastille de format (couleurs du logo), extensions du
 * fichier principal, fichiers annexes du dossier du projet, types du sélecteur à accès direct, disponibilité (lecteur embarqué dans la page),
 * et contenu de sa carte sur l'écran d'ouverture : `sous` (sous-titre), `ouvrir` (fichiers à ouvrir : `{h, n, conseil}`) ou `outils`
 * (tableau outil → fichiers), `obtenez` (ce que l'on obtient), `sansObjet`, `actions` (boutons : `dossier` ou `fichier`), `multiple`
 * (sélection de plusieurs fichiers). Les textes notent les extensions entre accents graves (`capFmtTxt`). Tout ce qui nomme un format
 * à l'écran (accueil, sélecteurs, messages, menu 📁) en découle : un nouveau format (ReqIF…) s'ajoute ici. */
const CAP_FORMATS=[
  {k:'capella', l:'Capella', ico:'🔷', c:'#5aa2e8', ext:['capella','melodymodeller','xml'], annexes:['aird'], mime:{'application/xml':['.capella','.melodymodeller','.xml']}, dispo:()=>!CAP_EDITION||CAP_EDITION==='capella',
    dossier:_L('le .capella, ses diagrammes (.aird) et ses bibliothèques'),
    sous:_L('méthode ARCADIA'),
    ouvrir:[{h:_L('Le dossier du projet'), n:_L('En une fois : `.capella` + diagrammes `.aird` + bibliothèques'), conseil:true},
      {h:_L('ou le fichier seul `.capella`'), n:_L('(aussi .melodymodeller, .xml) ; le .aird pourra être ajouté ensuite.')}],
    obtenez:[_L('Toutes les vues ARCADIA, OA → EPBS : fonctions, échanges, composants, chaînes, scénarios, traçabilité'), _L('Les diagrammes Capella, avec le `.aird`'), _L('Contrôles et score de santé par couche')],
    sansObjet:'', multiple:false,
    actions:[{l:_L('📁 Dossier du projet…'), a:'dossier', p:true}, {l:_L('Fichier .capella…'), a:'fichier'}]},
  {k:'sysml2', l:'SysML v2', ico:'🧩', c:'#4fc3a1', ext:['sysml','kpar'], annexes:[], mime:{'text/plain':['.sysml'], 'application/zip':['.kpar']}, dispo:()=>typeof capSysmlDispo==='function'&&capSysmlDispo(),
    dossier:_L('les fichiers .sysml d\'un projet, lus ensemble'),
    sous:_L('notation textuelle'),
    ouvrir:[{h:_L('Un fichier `.sysml` ou une archive `.kpar`'), n:''}, {h:_L('ou un dossier de `.sysml`'), n:_L('Tous les fichiers du projet sont lus ensemble.')}],
    obtenez:[_L('Éléments et liaisons : typage, spécialisation, composition, connexions, flux'), _L('Vues calculées depuis le texte : générale, interconnexion, états, flux d\'actions'), _L('Diagnostics du lecteur, ligne du fichier source')],
    sansObjet:_L('Sans objet : vues ARCADIA, propres à Capella'), multiple:true,
    actions:[{l:_L('📂 Fichier .sysml / .kpar…'), a:'fichier', p:true}, {l:_L('Dossier de .sysml…'), a:'dossier'}]},
  {k:'uml', l:'UML / SysML v1', ico:'🧬', c:'#f0a35e', ext:['uml','xmi','mdzip','qea','qeax','rpy','rpyx'], annexes:['notation','sbs','cls','cmp','ctd'], mime:{'application/xml':['.uml','.xmi','.notation','.rpyx'], 'application/zip':['.mdzip'], 'application/octet-stream':['.qea','.qeax'], 'text/plain':['.rpy','.sbs','.cls','.cmp','.ctd']},
    dispo:()=>typeof capUmlDispo==='function'&&capUmlDispo(), dossier:_L('le modèle (.uml, .xmi, .mdzip, .qea) et ses diagrammes de Papyrus (.notation), ou un projet Rhapsody (.rpy et dossier _rpy)'),
    sous:_L('et UAF'),
    outils:[[_L('Cameo / CATIA Magic'), _L('`.mdzip` avec diagrammes')], [_L('Enterprise Architect 16+'), _L('`.qea` `.qeax` avec diagrammes')],
      [_L('Papyrus'), _L('`.uml` + `.notation` ensemble')], [_L('IBM Rhapsody'), _L('dossier du projet (`.rpy` + `_rpy`), sans les diagrammes')], [_L('Export XMI (tout outil)'), _L('`.xmi` sans les diagrammes de Cameo')]],
    obtenez:[_L('Les diagrammes de l\'outil (bdd, ibd, activité, états, séquence…), les tableaux et matrices de Cameo'), _L('Validation UML 2.5.1, SysML 1.7 et UAF 1.2')],
    sansObjet:_L('Sans objet : vues ARCADIA, propres à Capella'), multiple:true,
    actions:[{l:_L('📂 Fichier modèle…'), a:'fichier', p:true}, {l:_L('Dossier (Papyrus, Rhapsody)…'), a:'dossier'}]},
  {k:'reqif', l:'ReqIF', ico:'📑', c:'#e3b341', ext:['reqif','reqifz'], annexes:[], mime:{'application/xml':['.reqif'], 'application/zip':['.reqifz']},
    dispo:()=>typeof capReqifDispo==='function'&&capReqifDispo(), dossier:_L('les fichiers .reqif et leurs images, lus ensemble'),
    sous:_L('exigences'),
    outils:[[_L('DOORS, Polarion, Jama, codeBeamer…'), _L('archive `.reqifz` (textes et images)')], [_L('Capella, Enterprise Architect, ReqIF Studio'), _L('fichier `.reqif`')]],
    ouvrir:[{h:_L('Une archive `.reqifz`'), n:_L('Les exigences et les images de leurs textes.'), conseil:true}, {h:_L('ou un fichier `.reqif`'), n:_L('Avec ses images : choisissez-les ensemble, ou ouvrez le dossier.')}],
    obtenez:[_L('Le document de chaque spécification : chapitres numérotés, textes et images, valeurs des attributs'), _L('Les exigences en tableau Excel, leurs relations en matrice'), _L('Contrôles : textes, identifiants, relations, images absentes')],
    sansObjet:_L('Sans objet : vues ARCADIA, SysML et UML'), multiple:true,
    actions:[{l:_L('📂 Fichier .reqif / .reqifz…'), a:'fichier', p:true}, {l:_L('Dossier (ReqIF et images)…'), a:'dossier'}]}
];
/** Pastille du projet de travail (page HTML enregistrée), aux côtés des formats. */
const CAP_FMT_PAGE={k:'page', l:_L('Projet de travail'), c:'#e8c84f'};
/** 💡 « Bon à savoir » de l'écran d'ouverture : f = format concerné (clé de CAP_FORMATS, ou `page`), t = texte (extensions entre
 * accents graves). Seules les astuces des formats embarqués sont montrées. */
const CAP_ASTUCES=[
  {f:'uml', t:_L('Un export `.xmi` de Cameo ne contient pas les diagrammes : ouvrez plutôt le `.mdzip` du projet.')},
  {f:'capella', t:_L('Le `.aird` seul ne suffit pas, il ne contient que les représentations : ouvrez le dossier du projet, ou le `.capella` puis le `.aird`.')},
  {f:'sysml2', t:_L('Un projet SysML v2 en plusieurs fichiers s\'ouvre par son dossier : tous les `.sysml` sont lus ensemble.')},
  {f:'uml', t:_L('Papyrus : le `.notation` seul est refusé. Choisissez-le avec son `.uml` (Ctrl + clic), déposez les deux, ou ouvrez le dossier.')},
  {f:'capella', t:_L('Le dossier du projet charge aussi les bibliothèques référencées par le modèle : leurs éléments se résolvent dans le panneau de détail.')},
  {f:'uml', t:_L('Les anciens projets d\'Enterprise Architect (`.eap`, `.eapx`, `.feap`) ne sont pas lus : enregistrez-les en `.qea` depuis EA 16+, ou exportez-les en XMI.')},
  {f:'uml', t:_L('Rhapsody : ouvrez le dossier du projet, qui contient le `.rpy` et son dossier `_rpy` (un paquetage par fichier `.sbs`). Les diagrammes ne sont pas encore lus ; un projet au format XML (`.rpyx`) s\'enregistre au format texte depuis Rhapsody.')},
  {f:'page', t:_L('Une page de projet `.html` est lue sans être exécutée ; vous choisissez ensuite les parties à reprendre.')},
  {f:'reqif', t:_L('Un `.reqif` seul ne contient pas les images de ses textes : ouvrez l\'archive `.reqifz` exportée par l\'outil, ou choisissez le `.reqif` avec ses images.')},
  {f:'uml', t:_L('Le `.mdzip` se décompresse dans le navigateur : Chrome / Edge 80+, Firefox 113+ ou Safari 16.4+. Les tableaux et matrices de Cameo sont recalculés d\'après leur définition.')}
];
/** Message pour un fichier d'un format que cette version (réduite à un format) ne lit pas.
 * @param {string} name - Nom du fichier @param {object} F - Format du fichier (CAP_FORMATS) @returns {string} */
function capFormatAbsentMsg(name, F){
  return _L(`« ${name} » est un fichier ${F.l} : cette version d'Arcalyse ne lit que ${capFormatsDispo().map(f=>f.l).join(', ')}. Ouvrez-le avec la version ${F.l} ou la version complète d'Arcalyse.`);
}
/** Nom de la version : format embarqué (version réduite) ou version complète. @returns {string} */
function capEditionNom(){ const F=CAP_FORMATS.find(f=>f.k===CAP_EDITION); return F?_L(`${F.l} seul`):_L('complète (tous les formats)'); }
/** Formats dont le lecteur est embarqué dans la page. @returns {object[]} */
function capFormatsDispo(){ return CAP_FORMATS.filter(f=>{ try{ return f.dispo(); }catch(e){ return false; } }); }
/** Extensions (sans point) des fichiers modèles acceptés. @returns {string[]} */
function capFormatsExt(){ return capFormatsDispo().flatMap(f=>f.ext); }
/** Valeur de l'attribut accept des sélecteurs de modèle. @returns {string} */
function capFormatsAccept(){ return capFormatsExt().map(e=>'.'+e).join(','); }
/** Types du sélecteur à accès direct (showOpenFilePicker) : en tête « Tous les modèles » (toutes les extensions réunies, choisi d'office :
 * plus besoin de changer de type pour ouvrir un autre format), puis un type par format. @returns {object[]} */
function capFormatsTypes(){
  const fs=capFormatsDispo(), un=fs.map(f=>({description:f.l, accept:f.mime}));
  if(fs.length<2) return un;
  const tout={}; fs.forEach(f=>Object.entries(f.mime||{}).forEach(([m,ex])=>{ tout[m]=[...new Set([...(tout[m]||[]), ...[].concat(ex)])]; }));
  return [{description:_L('Tous les modèles'), accept:tout}, ...un];
}
/** Formats et extensions en clair : « Capella (.capella, .melodymodeller, .xml) · SysML v2 (.sysml, .kpar) ». @returns {string} */
function capFormatsLibelle(){ return capFormatsDispo().map(f=>`${f.l} (${f.ext.map(e=>'.'+e).join(', ')})`).join(' · '); }
/** Texte d'une carte ou d'une astuce : échappé, extensions notées entre accents graves rendues en code. @param {string} s @returns {string} HTML */
function capFmtTxt(s){ return capEsc(s||'').replace(/`([^`]+)`/g, '<code class="cw-ext">$1</code>'); }
/** Pastille de format : point de couleur et nom. @param {{l:string, c:string}} f - Format (ou CAP_FMT_PAGE) @param {string} [cls] - Classe en plus @returns {string} HTML */
function capFmtPuce(f, cls){ return `<span class="cw-fmt${cls?' '+cls:''}" style="--cw-c:${f.c}"><i></i>${capEsc(f.l)}</span>`; }
/** Cartes de l'écran d'ouverture, une par format embarqué : quoi ouvrir, ce que l'on obtient, boutons. @returns {string} HTML */
function capFormatsCartesHtml(){
  const ok=t=>`<li>${capFmtTxt(t)}</li>`;
  return capFormatsDispo().map(f=>`<section class="cw-card" id="cw-card-${f.k}" style="--cw-c:${f.c}">`+
    `<div class="cw-card-h">${capFmtPuce(f, 'cw-fmt-l')}<span class="cw-card-s">${capEsc(f.sous||'')}</span></div>`+
    `<div class="cw-lbl">${f.outils?_L('À ouvrir, selon votre outil'):_L('À ouvrir')}</div>`+
    (f.outils?`<div class="cw-outils">${f.outils.map(([o,x])=>`<span>${capEsc(o)}</span><span>${capFmtTxt(x)}</span>`).join('')}</div>`
      :(f.ouvrir||[]).map(o=>`<div class="cw-o${o.conseil?' cw-o-c':''}"><div><b>${capFmtTxt(o.h)}</b>${o.conseil?` <span class="cw-tag">${_L('conseillé')}</span>`:''}</div>${o.n?`<div class="cw-o-n">${capFmtTxt(o.n)}</div>`:''}</div>`).join(''))+
    `<div class="cw-lbl">${_L('Vous obtenez')}</div><ul class="cw-ok">${(f.obtenez||[]).map(ok).join('')}${f.sansObjet?`<li class="cw-no">${capFmtTxt(f.sansObjet)}</li>`:''}</ul>`+
    `<div class="cw-card-b">${(f.actions||[]).map(a=>`<button type="button" class="cw-b${a.p?' cw-b-p':''}" data-cw="${a.a}" data-k="${f.k}">${capEsc(a.l)}</button>`).join('')}</div></section>`).join('');
}
/** État du « Bon à savoir » : astuce affichée, pause demandée, survol ou focus, minuteur. */
const _capAstuce={i:0, pause:false, survol:false, minuteur:0};
/** Astuces des formats embarqués. @returns {{f:string, t:string}[]} */
function capAstuces(){ const ks=capFormatsDispo().map(f=>f.k).concat('page'); return CAP_ASTUCES.filter(a=>ks.includes(a.f)); }
/** Affiche l'astuce courante (pastille, texte, points, rang) dans #cw-astuces. */
function capAstuceMontrer(){
  const box=document.getElementById('cw-astuces'), A=capAstuces(); if(!box||!A.length){ if(box) box.innerHTML=''; return; }
  const n=A.length, i=((_capAstuce.i%n)+n)%n, a=A[i], f=CAP_FORMATS.find(x=>x.k===a.f)||CAP_FMT_PAGE; _capAstuce.i=i;
  if(!box.firstChild) box.innerHTML=`<span class="cw-tips-t">💡 ${_L('Bon à savoir')}</span><span class="cw-tips-f"></span><div class="cw-tips-x" aria-live="polite"></div>`+
    `<div class="cw-tips-n"><button type="button" data-tip="-1" title="${_L('Astuce précédente')}">‹</button><span class="cw-tips-d"></span><button type="button" data-tip="+1" title="${_L('Astuce suivante')}">›</button>`+
    `<button type="button" data-tip="pause"></button><span class="cw-tips-r"></span></div>`;
  box.querySelector('.cw-tips-f').innerHTML=capFmtPuce(f, 'cw-fmt-s');
  box.querySelector('.cw-tips-x').innerHTML=capFmtTxt(a.t);
  box.querySelector('.cw-tips-d').innerHTML=A.map((_,k)=>`<button type="button" class="cw-tips-p${k===i?' on':''}" data-tip="${k}" title="${_L(`Astuce ${k+1} sur ${n}`)}"><i></i></button>`).join('');
  const p=box.querySelector('[data-tip="pause"]'); p.textContent=_capAstuce.pause?'▶':'⏸';
  p.title=_capAstuce.pause?_L('Reprendre le défilement des astuces'):_L('Mettre en pause le défilement des astuces');
  box.querySelector('.cw-tips-r').textContent=`${i+1} / ${n}`;
}
/** Branche le défilement des astuces (toutes les 7 s ; arrêté au survol, au focus, quand l'écran d'ouverture est masqué ou si le
 * système demande moins d'animations) et leurs commandes ‹ › ⏸ et points. Appelée une fois. */
function capAstucesBrancher(){
  const box=document.getElementById('cw-astuces'); if(!box||_capAstuce.minuteur) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) _capAstuce.pause=true; }catch(e){ /* navigateur ancien */ }
  box.addEventListener('click',ev=>{ ev.stopPropagation(); const b=ev.target.closest('[data-tip]'); if(!b) return; const v=b.dataset.tip;
    if(v==='pause') _capAstuce.pause=!_capAstuce.pause; else if(v==='-1'||v==='+1') _capAstuce.i+=+v; else _capAstuce.i=+v;
    capAstuceMontrer(); });
  const sur=v=>()=>{ _capAstuce.survol=v; };
  box.addEventListener('mouseenter',sur(true)); box.addEventListener('mouseleave',sur(false));
  box.addEventListener('focusin',sur(true)); box.addEventListener('focusout',sur(false));
  _capAstuce.minuteur=setInterval(()=>{
    const w=document.getElementById('cap-welcome');
    if(_capAstuce.pause||_capAstuce.survol||document.hidden||!w||w.classList.contains('cw-hidden')) return;
    _capAstuce.i++; capAstuceMontrer();
  }, 7000);
}
/** Pose les formats acceptés sur les sélecteurs, les cartes de format et les astuces de l'écran d'ouverture (au chargement de la page,
 * quand les lecteurs embarqués sont là). */
function capFormatsPoser(){
  const inp=document.getElementById('capella-file-input'); if(inp) inp.accept=capFormatsAccept();
  const c=document.getElementById('cw-cards'), ks=capFormatsDispo().map(f=>f.k).join(',');   // cartes refaites quand un lecteur embarqué arrive
  if(c&&c.dataset.k!==ks){ c.innerHTML=capFormatsCartesHtml(); c.dataset.k=ks; c.style.maxWidth=(capFormatsDispo().length*420)+'px'; }
  capAstuceMontrer(); capAstucesBrancher(); capAideFiltrer();
}
/** Version réduite à un format (CAP_EDITION) : masque dans l'aide les onglets et sections d'un format absent (attribut `data-hfmt`). */
function capAideFiltrer(){
  if(!CAP_EDITION) return;
  const ks=capFormatsDispo().map(f=>f.k);
  document.querySelectorAll('[data-hfmt]').forEach(n=>{ if(!ks.includes(n.dataset.hfmt)) n.style.display='none'; });
}
/**
 * Bouton « Fichier… » d'une carte de format : sélecteur filtré sur ce format (plusieurs fichiers pour SysML v2 et UML : .sysml d'un
 * projet, .uml et son .notation), puis ouverture par le lecteur du format.
 * @param {string} k - Clé du format (CAP_FORMATS)
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté
 */
async function capFormatsChoisir(k, confirme){
  if(capLoaded&&!confirme){ if(await capReplaceConfirm('')) capFormatsChoisir(k, true); return; }
  _capReplaceOk=capLoaded?Date.now():0;
  const F=CAP_FORMATS.find(f=>f.k===k); if(!F){ capPickCapellaFile(true); return; }
  if(window.showOpenFilePicker&&!_capPickerKo){
    const t0=Date.now();
    try{
      const hs=await window.showOpenFilePicker({types:[{description:F.l, accept:F.mime}], multiple:!!F.multiple});
      capFormatsOuvrir(await Promise.all(hs.map(h=>h.getFile())), hs); return;
    }catch(e){
      if(e&&e.name==='AbortError'&&Date.now()-t0>400){ _capReplaceOk=0; return; }   // fenêtre fermée par l'utilisateur
      console.warn('Sélecteur à accès direct indisponible :', e); _capPickerKo=true;
    }
  }
  const inp=document.getElementById('cw-fmt-input'); if(!inp) return;
  inp.accept=_capPickerKo?'':[...F.ext, ...(F.k==='uml'?F.annexes:[])].map(e=>'.'+e).join(','); inp.multiple=!!F.multiple;
  inp.click();
}
/**
 * Ouvre les fichiers choisis par une carte de format : un seul fichier par capLoadFile (avec son accès direct, pour le 🔄 suivi),
 * plusieurs .sysml ensemble, un modèle UML avec son .notation.
 * @param {File[]} fs - Fichiers choisis
 * @param {FileSystemFileHandle[]} [hs] - Accès directs correspondants
 */
function capFormatsOuvrir(fs, hs){
  if(!fs||!fs.length){ _capReplaceOk=0; return; }
  const ok=capReplacePreOk();
  if(fs.length===1){ capLoadFile(fs[0], hs&&hs[0]||null, ok); return; }
  if(fs.every(f=>/\.sysml$/i.test(f.name))&&typeof capSysmlOuvrirFichiers==='function'){ capSysmlOuvrirFichiers(fs, ok); return; }
  if(typeof capUmlOuvrirFichiers==='function'&&fs.some(f=>capUmlReconnait(f.name))){ capUmlOuvrirFichiers(fs, ok); return; }
  if(typeof capReqifOuvrirFichiers==='function'&&fs.some(f=>capReqifReconnait(f.name))){ capReqifOuvrirFichiers(fs, ok); return; }   // 📑 .reqif et ses images (101)
  capLoadFile(fs[0], hs&&hs[0]||null, ok);
}

/** Charge un fichier modèle (depuis l'explorateur ou un glisser-déposer) : aiguille vers le lecteur du format, vérifie
 * l'extension, lit le XML localement puis rejoue le pipeline complet (arbre, types,
 * relations, liens, chaînes, panneaux) et bascule sur la vue Capella Data.
 * @param {File} f - Fichier choisi ou déposé
 * @param {FileSystemFileHandle} [handle] - Accès au fichier sur disque (Edge/Chrome), pour le 🔄 suivi des mises à jour
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté (pas de nouvelle question)
 */
function capLoadFile(f, handle, confirme){
  const name=(f&&f.name)||'';
  const ext=(name.split('.').pop()||'').toLowerCase();
  if (typeof capSysmlReconnait==='function' && capSysmlReconnait(name)) { capSysmlOuvrir(f, handle, confirme); return; }   // 🧩 SysML v2 (.sysml, .kpar : 87)
  if (typeof capReqifReconnait==='function' && capReqifReconnait(name)) { capReqifOuvrir(f, handle, confirme); return; }   // 📑 ReqIF (.reqif, .reqifz : 101)
  if (typeof capUmlReconnait==='function' && (capUmlReconnait(name) || capUmlAnnexe(name))) { capUmlOuvrir(f, handle, confirme); return; }   // 🧬 UML / SysML v1 (.uml, .xmi, .mdzip, .qea : 88)
  if (ext==='aird' && capDiagDispo()) { capDiagLoadAird(f, handle); return; }   // 🔲 Diagrammes Capella du projet
  if (ext==='html' || ext==='htm') { capProjetPageOuvrir(f, handle, confirme); return; }   // 📄 projet de travail (page HTML enregistrée)
  const absent=CAP_FORMATS.find(F=>[...F.ext, ...F.annexes].includes(ext)&&!capFormatsDispo().includes(F));   // version réduite à un format (CAP_EDITION)
  if (absent) { capWelcomeStatus(capFormatAbsentMsg(name, absent),'err'); capShowWelcome(true); return; }
  if (ext==='aird' || ext==='afm') {
    capWelcomeStatus(_L(`« ${name} » est un fichier de représentation/métadonnées : déposez le fichier .capella du projet.`),'err');
    capShowWelcome(true); return;
  }
  if (!['capella','melodymodeller','xml'].includes(ext)) {
    capWelcomeStatus(_L(`« ${name} » n'est pas un modèle reconnu — formats acceptés : ${capFormatsLibelle()}.`),'err');
    capShowWelcome(true); return;
  }
  // Un modèle est déjà affiché : avertir que le travail non enregistré sera perdu
  if (capLoaded && !confirme) { capReplaceConfirm(name).then(ok=>{ if(ok) capLoadFile(f, handle, true); else capShowWelcome(false); }); return; }
  // Diagrammes (.aird) d'un autre modèle : retirés (ceux fournis avec ce modèle sont gardés)
  const airdRetire=typeof capDiagAvantNouveauModele==='function'?capDiagAvantNouveauModele():'';
  capWelcomeStatus(_L(`Chargement de « ${name} »…`),'busy');
  capShowWelcome(true);
  const reader=new FileReader();
  reader.onerror=()=>capWelcomeStatus(_L(`Impossible de lire « ${name} ».`),'err');
  reader.onload=ev=>{
    // Laisse le navigateur afficher l'état « Chargement… » avant le parsing (gros modèles)
    setTimeout(()=>{
      try{
        const doc=new DOMParser().parseFromString(ev.target.result,'application/xml');
        if(doc.querySelector('parsererror')) throw new Error(_L('XML invalide'));
        capCurrentView='home';   // 🏠 Accueil : vue affichée à l'ouverture d'un modèle
        if(typeof _capProjetPage!=='undefined') _capProjetPage.nom='';
        capApplyXmlDoc(doc, name);
        capWatchSetSource(f, handle||null, ev.target.result);
        capWelcomeStatus('','');
        capShowWelcome(false);
        if(airdRetire&&typeof capWatchFlash==='function') setTimeout(()=>capWatchFlash(_L(`🔲 Diagrammes de l'ancien modèle (« ${airdRetire} ») retirés : ouvrez le .aird de ce modèle dans 🔲 Diagrammes Capella`)),700);
      }catch(err){
        capWelcomeStatus(_L('Erreur de chargement : ')+err.message,'err');
        capShowWelcome(true);
      }
    },30);
  };
  reader.readAsText(f,'UTF-8');
}

/** Remplace le modèle affiché par un document XML Capella déjà analysé : vide les caches,
 * reconstruit l'arbre et le registre des types, rejoue les injections et réaffiche la vue Capella courante.
 * Lève une erreur si aucun élément Capella n'est reconnu (le modèle affiché est alors perdu : l'appelant affiche l'erreur).
 * @param {Document} doc - Document XML Capella
 * @param {string} name - Nom du fichier
 */
function capApplyXmlDoc(doc, name){
  if(typeof capSysmlAvantModele==='function') capSysmlAvantModele(doc);   // 🧩 lecture SysML oubliée pour un autre document (87)
  cap_xmlDoc=doc;
  capAllElements=[];
  _capParentIndexCache=null; _capElementByIdCache=null; _capRefIndexCache=null; _capMcPropsCache=null; _capTableRelIdx=null; capChainsData=null; capLinksData=null; _capPortsCache=null; capAnaReset();
  if(typeof capHistReset==='function'&&_capHist.model!==name){ capHistReset(); _capHist.model=name; const ov=document.getElementById('cdg-maj-ov'); if(ov) ov.remove(); }   // ◀ ▶ historique vidé pour un autre modèle (76) ; question « .aird à jour ? » (54) sans objet
  capTreeData=capBuildTree(doc.documentElement,new Set());
  if(!capAllElements.length) throw new Error(_L('Aucun élément Capella reconnu dans ce fichier'));
  capBuildTypeRegistry();
  capRunBulk(()=>{ // un seul rendu du panneau et de l'arborescence à la fin
    capInjectToArbo();
    capInjectCapellaRelsToCriteria();
    capInjectLinksToModel();
    capFilterArboToLinked();
    capInjectChainsToModal();
    capApplyPanelOnLoad();
  });
  rmViewsOnModelLoad();   // 🗂 vues de la Relation Map (10-rm-vues.js)
  capLoaded=true;
  capCurrentFileName=name;
  applyMode('capella');
  if(typeof capTourResumeAfterLoad==='function') capTourResumeAfterLoad();   // 🚀 Bien démarrer : 2e temps
  if(typeof capRevOnModelLoad==='function') capRevOnModelLoad();   // 💬 Revue : commentaires à vérifier sur ce modèle
  if(typeof capLibOnModelLoad==='function') capLibOnModelLoad();   // 📚 bibliothèques du dossier du projet référencées par ce modèle (72)
  if(typeof capAutoBanner==='function') capAutoBanner();   // ⚙ enregistrement automatique : fichier à choisir
}

/**
 * Demande confirmation avant de remplacer le modèle affiché par un autre fichier : le travail non enregistré
 * (vues, filtres, réglages, tableaux de bord, commentaires de revue modifiés) serait perdu à la fermeture de la page.
 * Appelée AVANT l'ouverture du sélecteur de fichier (name vide) ou après un dépôt de fichier (name connu).
 * 💾 Enregistrer la page garde la fenêtre ouverte (un nouveau clic ouvre ensuite le sélecteur, ce que le navigateur
 * exige) ; rappelle 🔄 Charger une mise à jour pour une nouvelle version du même modèle.
 * @param {string} [name] - Fichier à ouvrir ('' : pas encore choisi)
 * @returns {Promise<boolean>} true : continuer (ouvrir le sélecteur ou le fichier)
 */
function capReplaceConfirm(name){
  return new Promise(resolve=>{
    let ov=document.getElementById('cap-replace-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='cap-replace-ov'; document.body.appendChild(ov); }
    const rev=typeof capRevUnsavedCount==='function'?capRevUnsavedCount():0;
    ov.innerHTML=_L(`<div class="cw-d-box" style="max-width:600px">
      <div class="cw-d-hdr"><b>⚠ Ouvrir un autre modèle ?</b><button class="cap-lf-btn" data-c="no">✕</button></div>
      <div class="cw-d-body">
        <div class="cw-d-sub">Modèle affiché : <b>${capEsc(capCurrentFileName||'—')}</b></div>`)+
        (name?_L(`<div class="cw-d-sub">Fichier à ouvrir : <b>${capEsc(name)}</b></div>`):'')+
        _L(`<p style="font-size:12.5px;margin:8px 0">Le modèle affiché va être remplacé. <b>Tout le travail qui n'a pas été enregistré dans la page</b> (vues et onglets, tableaux de bord, réglages, version de ⚖ Comparaison…) risque d'être perdu.</p>`)+
        (rev?_L(`<p style="font-size:12.5px;margin:8px 0;color:var(--c-warn,#e3b341)">💬 ${rev} commentaire(s) de revue modifié(s) depuis le dernier enregistrement : ils restent dans la page ouverte (et seront vérifiés sur le nouveau modèle), mais seront perdus si elle est fermée sans être enregistrée. Vous pouvez aussi les exporter (💬 Revue › 💾 Revue ▾ › ⬇ Exporter).</p>`):'')+
        _L(`<p class="ana-dim" style="font-size:11.5px;margin:8px 0">Nouvelle version du même modèle ? Préférez 📁 Fichier › 🔄 Charger une mise à jour du modèle : le delta est affiché et la version précédente reste disponible pour ⚖ Comparaison.</p>
      </div>
      <div class="cw-d-ftr"><span style="flex:1"></span><button class="cap-lf-btn" data-c="no">Annuler</button>
        <button class="cap-lf-btn" data-c="save">💾 Enregistrer la page</button>`)+
        `<button class="phl-export-btn" data-c="go" style="margin-left:0">${name?_L('Ouvrir le fichier'):_L('📂 Choisir le fichier…')}</button></div></div>`;
    ov.style.display='flex';
    const fin=v=>{ ov.style.display='none'; resolve(v); };
    ov.onclick=e=>{ if(e.target===ov) fin(false); };
    ov.querySelectorAll('[data-c="no"]').forEach(b=>b.onclick=()=>fin(false));
    ov.querySelector('[data-c="go"]').onclick=()=>fin(true);
    ov.querySelector('[data-c="save"]').onclick=async e=>{ const b=e.currentTarget;
      if(await capSavePageDirect(false)!==false){ b.textContent=_L('✔ Page enregistrée'); b.disabled=true; ov.querySelector('[data-c="go"]').focus(); } };
  });
}
/** Horodatage d'une confirmation donnée avant l'ouverture du sélecteur de fichier (capReplaceConfirm). */
let _capReplaceOk=0;
/** @returns {boolean} vrai si le remplacement du modèle vient d'être confirmé avant le sélecteur (la confirmation est consommée) */
function capReplacePreOk(){ const ok=Date.now()-_capReplaceOk<600000; _capReplaceOk=0; return ok; }

/* ── Écran d'accueil & glisser-déposer ─────────────────────────────────── */
let capCurrentFileName='';
/** Affiche ou masque l'écran d'accueil. Quand un modèle est déjà chargé, l'écran
 * s'affiche en surimpression (pendant un glisser-déposer ou un rechargement). */
function capShowWelcome(show){
  document.documentElement.toggleAttribute('data-capvide', !capLoaded);   // barre réduite tant qu'aucun modèle n'est ouvert (CSS)
  const w=document.getElementById('cap-welcome'); if(!w) return;
  w.classList.toggle('cw-hidden', !show);
  w.classList.toggle('cw-overlay', !!capLoaded);
  const t=document.getElementById('cw-title'), s=document.getElementById('cw-sub');
  if (capLoaded) {
    if(t) t.textContent=_L('Ouvrir un autre modèle');
    if(s) s.innerHTML=_L(`Modèle actuel : <strong>${capEsc(capCurrentFileName||'—')}</strong><br>Déposez un autre fichier modèle (${capFormatsLibelle()}) pour le remplacer.`)+
      _L(`<div class="cw-warn">⚠ Le travail non enregistré sur le modèle actuel sera perdu : enregistrez d'abord la page (💾, Ctrl+S). Pour une nouvelle version du même modèle, préférez 📁 Fichier › 🔄 Charger une mise à jour du modèle.</div>`);
  }
}
/** Affiche un message d'état (chargement, erreur) dans la zone de dépôt. */
function capWelcomeStatus(msg, kind){
  const st=document.getElementById('cw-status'); if(!st) return;
  st.textContent=msg||''; st.className='cw-status'+(kind?' '+kind:'');
}
/** Synchronise l'écran d'accueil avec l'état de chargement (appelé au démarrage,
 * y compris après l'amorçage d'une page HTML sauvegardée avec modèle embarqué). */
function capUpdateWelcome(){ capFormatsPoser(); capShowWelcome(!capLoaded); }

(function(){
  const zone=document.getElementById('cap-drop-zone');
  const browse=()=>capPickCapellaFile();
  // Cartes de format : 📁 dossier du projet (54-diagrammes.js : le format est reconnu) ou fichier(s) filtrés sur le format
  document.getElementById('cw-cards').addEventListener('click',ev=>{
    ev.stopPropagation(); const b=ev.target.closest('[data-cw]'); if(!b) return;
    if(b.dataset.cw==='dossier') capOpenProjectFolder(); else capFormatsChoisir(b.dataset.k);
  });
  const fmtIn=document.getElementById('cw-fmt-input');
  fmtIn.addEventListener('click',ev=>ev.stopPropagation());
  fmtIn.addEventListener('cancel',()=>{ _capReplaceOk=0; });
  fmtIn.addEventListener('change',()=>{ const fs=[...fmtIn.files]; fmtIn.value=''; capFormatsOuvrir(fs, null); });
  // 📄 Projet de travail : page HTML enregistrée (même par une version antérieure), reprise dans cette version (57-projet-page.js)
  document.getElementById('cw-projet').addEventListener('click',ev=>{ ev.stopPropagation(); capProjetPagePick(); });
  const fin=document.getElementById('cw-folder-input');
  fin.addEventListener('click',ev=>ev.stopPropagation());
  fin.addEventListener('change',()=>{
    const l=[...fin.files].map(f=>{ const p=(f.webkitRelativePath||f.name).split('/'); return {nom:f.name, chemin:p.slice(1).join('/')||f.name, lire:()=>Promise.resolve(f), h:null}; })
      .filter(f=>f.chemin.split('/').length<=2||/(^|\/)[^/]+_rpy\/[^/]+$/i.test(f.chemin));   // dossier « _rpy » d'un projet Rhapsody : toujours lu
    fin.value='';
    if(l.length) capProjectFromFiles(l);
  });
  zone.addEventListener('click',ev=>{ if(!ev.target.closest('button,a,input,.cw-card,.cw-tips,.cw-projet')) browse(); });   // clic sur le fond du cadre : sélecteur de tous les formats
  // Clic hors de la zone quand un modèle est chargé : referme la surimpression
  document.getElementById('cap-welcome').addEventListener('click',ev=>{
    if(capLoaded && ev.target.id==='cap-welcome'){ capWelcomeStatus('',''); capShowWelcome(false); }
  });
  const hasFiles=ev=>ev.dataTransfer && [...(ev.dataTransfer.types||[])].includes('Files');
  let depth=0;
  // Glisser-déposer sur toute la fenêtre : un fichier (et non une ligne d'arborescence)
  window.addEventListener('dragenter',ev=>{
    if(!hasFiles(ev)) return;
    ev.preventDefault(); depth++;
    capShowWelcome(true); zone.classList.add('cw-drag');
  });
  window.addEventListener('dragover',ev=>{ if(hasFiles(ev)){ ev.preventDefault(); ev.dataTransfer.dropEffect='copy'; } });
  window.addEventListener('dragleave',ev=>{
    if(!hasFiles(ev)) return;
    depth=Math.max(0,depth-1);
    if(!depth){ zone.classList.remove('cw-drag'); if(capLoaded) capShowWelcome(false); }
  });
  window.addEventListener('drop',ev=>{
    if(!hasFiles(ev)) return;
    ev.preventDefault(); depth=0; zone.classList.remove('cw-drag');
    // Plusieurs fichiers (ex. .capella + .aird) : le modèle d'abord, puis les diagrammes
    const tous=[...(ev.dataTransfer.files||[])];
    const sy=tous.filter(x=>/\.sysml$/i.test(x.name));
    if(sy.length>1&&typeof capSysmlOuvrirFichiers==='function'){ capSysmlOuvrirFichiers(sy); return; }   // 🧩 plusieurs .sysml : lus ensemble (87)
    if(tous.length>1&&typeof capReqifReconnait==='function'&&tous.some(x=>capReqifReconnait(x.name))&&!tous.some(x=>/\.(capella|melodymodeller|sysml|uml|xmi|mdzip|qea)$/i.test(x.name))){ capReqifOuvrirFichiers(tous); return; }   // 📑 .reqif et ses images (101)
    if(tous.length>1&&typeof capUmlReconnait==='function'&&tous.some(x=>capUmlReconnait(x.name))&&!tous.some(x=>/\.(capella|melodymodeller)$/i.test(x.name))){ capUmlOuvrirFichiers(tous); return; }   // 🧬 modèle UML et son .notation (88)
    const aird=tous.find(x=>/\.aird$/i.test(x.name)), mod=tous.find(x=>/\.(capella|melodymodeller|xml)$/i.test(x.name));
    if(aird && mod && tous.length>1){ const go=()=>{ capLoadFile(mod, null, true); capDiagLoadAird(aird, null, true); };
      if(!capLoaded){ go(); return; }
      capReplaceConfirm(mod.name).then(ok=>{ if(!ok){ capShowWelcome(false); return; } go(); }); return; }
    const f=ev.dataTransfer.files&&ev.dataTransfer.files[0];
    // Edge/Chrome : récupère aussi l'accès au fichier (à demander pendant l'événement) pour le 🔄 suivi
    const it=ev.dataTransfer.items&&ev.dataTransfer.items[0];
    let hp=null;
    try{ if(it&&it.getAsFileSystemHandle) hp=Promise.race([it.getAsFileSystemHandle(), new Promise(r=>setTimeout(()=>r(null),1500))]).catch(()=>null); }catch(e){ hp=null; }
    if(!f){ if(capLoaded) capShowWelcome(false); return; }
    // Le chargement ne dépend jamais de l'accès direct : sans lui, le fichier est chargé quand même ;
    // un dossier déposé (Edge/Chrome) est lu comme 📁 Dossier du projet
    if(hp) hp.then(h=>{ if(h&&h.kind==='directory') capProjectScanDir(h); else capLoadFile(f, h&&h.kind==='file'?h:null); }); else capLoadFile(f);
  });
  capUpdateWelcome();
  window.addEventListener('load',capUpdateWelcome); // après un éventuel amorçage de page sauvegardée
})();

// ── XML parsing ──
const XSI_NS='http://www.w3.org/2001/XMLSchema-instance';
/** Lit l'attribut xsi:type d'un élément XML Capella (plain ou namespacé). */
function capXType(el){return el.getAttribute('xsi:type')||el.getAttributeNS(XSI_NS,'type')||'';}
/** Extrait le nom court du type (après ':') depuis xsi:type. Ex: 'pa:PhysicalComponent' → 'PhysicalComponent'. */
function capTName(el){const t=capXType(el);return t.includes(':')?t.split(':').pop():t;}
/** Lit l'ID d'un élément XML Capella (attribut plain 'id' ou xmi:id namespacé). */
function capXId(el){return el.getAttribute('id')||el.getAttributeNS('http://www.omg.org/XMI','id')||'';}
/** Lit l'attribut 'name' d'un élément XML Capella. */
function capXName(el){return el.getAttribute('name')||el.getAttribute('ReqIFLongName')||el.getAttribute('ReqIFName')||'';}

/** Détermine la couche ARCADIA (OA/SA/LA/PA/EPBS/Shared) d'un élément
 * à partir du préfixe de namespace ou des ancêtres XML.
 */
function capResolveLayer(shortPfx,node){
  let layer=CAP_NS_LAYER[shortPfx]||null;
  if(!layer){let p=node.parentElement;while(p){const t=(capXType(p)||p.tagName||'').toLowerCase();for(const[kw,lay]of CAP_ANCESTOR_KW){if(t.includes(kw)){layer=lay;break;}}if(layer)break;p=p.parentElement;}}
  return layer||'Shared';
}
/** Extrait les attributs pertinents d'un élément XML Capella (définis dans CAP_ATTR_KEYS). */
function capGetAttrs(node){
  const attrs={};
  for(const k of CAP_ATTR_KEYS){const v=node.getAttribute(k);if(v!==null&&v!=='')attrs[k]=v;}
  for(const a of node.attributes){const n=a.localName;if(!CAP_ATTR_KEYS.includes(n)&&n!=='id'&&!n.startsWith('xmlns')&&n!=='type'&&a.value)attrs[n]=a.value;}
  if(!attrs.name){const r=node.getAttribute('ReqIFLongName')||node.getAttribute('ReqIFName');if(r)attrs.name=r;} // Requirements Viewpoint : nom ReqIF
  return attrs;
}
/** Construit récursivement l'arbre d'éléments Capella depuis le XML.
 * Remplit capAllElements[] au passage. Ignore les doublons via seenIds.
 * @param node Élément DOM XML @param {Set} seenIds IDs déjà traités
 */
function capBuildTree(node,seenIds){
  const xsiType=capXType(node);
  if(!xsiType){
    const children=[];
    for(const c of node.children){const sub=capBuildTree(c,seenIds);if(sub)children.push(sub);}
    return{typeName:'Project',fullType:'',id:'cap-root',name:node.getAttribute('name')||node.tagName,layer:null,attrs:{},children};
  }
  const ci=xsiType.lastIndexOf(':'); if(ci<0) return null;
  const fullNs=xsiType.slice(0,ci), typeName=xsiType.slice(ci+1), shortPfx=fullNs.split('.').pop();
  const id=capXId(node)||'';
  if(id&&seenIds.has(id)) return null;
  if(id) seenIds.add(id);
  const layer=capResolveLayer(shortPfx,node);
  const attrs=capGetAttrs(node);
  capAllElements.push({typeName,fullType:xsiType,id,layer,attrs});
  const children=[];
  for(const c of node.children){const sub=capBuildTree(c,seenIds);if(sub)children.push(sub);}
  return{typeName,fullType:xsiType,id,name:attrs.name||'',layer,attrs,children};
}

/** Mode « chargement groupé » : pendant le pipeline de chargement, buildPanel/buildArbo ne font
 * que noter qu'un rendu est nécessaire ; un seul rendu est effectué à la fin (gros modèles). */
var _capBulk=false, _capBulkDirty=false;
/** Exécute fn en mode chargement groupé puis reconstruit une fois le panneau (qui reconstruit l'arborescence).
 * @param {Function} fn - Traitement à exécuter
 */
function capRunBulk(fn){
  _capBulk=true; _capBulkDirty=false;
  try{ fn(); } finally{ _capBulk=false; }
  if(_capBulkDirty){ _capBulkDirty=false; buildPanel(); }
}

// ── Type registry ──
/** Construit capTypeRegistry : {type → {count, layer, checked}} depuis capAllElements.
 * Initialise capEnabledTypes avec les types non-techniques.
 */
function capBuildTypeRegistry(){
  capTypeRegistry={};
  for(const el of capAllElements){
    if(!capTypeRegistry[el.typeName])capTypeRegistry[el.typeName]={count:0,layer:el.layer,checked:!CAP_TECHNICAL_TYPES.has(el.typeName)};
    capTypeRegistry[el.typeName].count++;
  }
  capEnabledTypes=new Set(Object.keys(capTypeRegistry).filter(t=>capTypeRegistry[t].checked));
  _capTableTypesOn=false;   // nouveau modèle : la sélection globale des types repart d'ici (▤ Tableau, 51-tableau.js)
}

// ── Inject Capella elements into arbo ──

// ── Called after Capella file loaded: update left panels ──
/** Appelée après le chargement Capella : configure le panneau gauche RM.
 * - Supprime les critères SysML (sauf Composition)
 * - Désélectionne les types SysML
 * - Cache "Démarrage rapide"
 * - Différencie PhysicalComponent par nature (NODE/BEHAVIOR/sans)
 * - Reconstruit panel, markers, arbo, graphe
 */
function capApplyPanelOnLoad(){
  // Arborescence Relation Map repliée par défaut : les éléments racines (SystemEngineering…) et leurs enfants
  // directs (couches OA, SA, LA, PA…) restent ouverts
  arboCollapsed.clear();
  { const parents=new Set(MODEL.elements.map(e=>e.parentEl).filter(Boolean));
    const byId=new Map(MODEL.elements.map(e=>[e.id,e]));
    const level1=e=>{ const p=byId.get(e.parentEl); return p && !p.parentEl; };
    MODEL.elements.forEach(e=>{ if(e._capella&&e.parentEl&&parents.has(e.id)&&!level1(e)) arboCollapsed.add('el:'+e.id); });
    // Icône dossier pour SystemEngineering, même si le type avait été enregistré auparavant avec une autre icône
    if(TCFG['SystemEngineering']) TCFG['SystemEngineering'].icon='📂'; }
  const SYSML_RELS_SET=new Set(['Composition','Aggregation','Association','DirectedAssociation','Containment','Generalization','Realization','Dependency','Usage','Abstraction','Refine','Trace','Satisfy','Verify','DeriveReqt','Copy','Allocation']);
  const SYSML_TYPES_SET=new Set(['Block','Component','Class','Interface','Requirement','Package']);

  // 1. Delete all SysML relation criteria except Composition
  const TO_DELETE=new Set(['Aggregation','Association','DirectedAssociation','Containment','Generalization','Realization','Dependency','Usage','Abstraction','Refine','Trace','Satisfy','Verify','DeriveReqt','Copy','Allocation']);
  Object.keys(RCFG).forEach(t=>{
    if(TO_DELETE.has(t)){
      delete RCFG[t];
      delete S.relF[t];
      MODEL.relations=MODEL.relations.filter(r=>r.type!==t);
    } else if(SYSML_RELS_SET.has(t)){
      // Keep Composition but deselect it
      S.relF[t]=false;
    }
  });

  // 2. Retire entièrement les types SysML du panneau Types d'éléments (typ-body) —
  //    pas seulement décochés : supprimés de TCFG pour qu'ils n'apparaissent plus du tout
  //    dans la liste tant qu'un fichier Capella est chargé.
  //    Exception : 'Package' est conservé car réutilisé comme conteneur racine de l'arbre Capella.
  Object.keys(TCFG).forEach(t=>{
    if(SYSML_TYPES_SET.has(t) && t!=='Package'){ delete TCFG[t]; delete S.typF[t]; }
  });

  // 3. Supprime complètement le package "Démarrage rapide" et tous ses descendants
  //    (au lieu de simplement le masquer/réduire dans l'arborescence).
  const demarrageIds = new Set(
    MODEL.elements.filter(e=>e.name==='Démarrage rapide'||e.pkg==='Démarrage rapide').map(e=>e.id)
  );
  if (demarrageIds.size) {
    // Récupère aussi tous les descendants (récursif) de ces éléments
    let frontier=[...demarrageIds];
    while (frontier.length) {
      const next=MODEL.elements.filter(e=>frontier.includes(e.parentEl)&&!demarrageIds.has(e.id)).map(e=>e.id);
      next.forEach(id=>demarrageIds.add(id));
      frontier=next;
    }
    MODEL.elements = MODEL.elements.filter(e=>!demarrageIds.has(e.id));
    MODEL.relations = MODEL.relations.filter(r=>!demarrageIds.has(r.src)&&!demarrageIds.has(r.tgt));
  }

  // 3 bis. Purge des restes du modèle précédent (rechargement) : types Capella absents du nouveau modèle,
  //    éléments masqués, focus et sélection qui ne désignent plus rien
  { const ids=new Set(MODEL.elements.map(e=>e.id)), used=new Set(capAllElements.map(e=>e.typeName));
    Object.keys(TCFG).forEach(t=>{ if(TCFG[t]._capella&&!used.has(t.replace(/ \(.*\)$/,''))){ delete TCFG[t]; delete S.typF[t]; } });   // « PhysicalComponent (NODE) » → PhysicalComponent
    [...S.hidden].forEach(id=>{ if(!ids.has(id)) S.hidden.delete(id); });
    if(S.ctx&&!ids.has(S.ctx)) S.ctx=null;
    if(S.propEl&&!ids.has(S.propEl)){ S.propEl=null; S.selNode=null; }
    arboMultiSel.clear(); }

  // 4. La différenciation PhysicalComponent (NODE/BEHAVIOR/sans nature → violet) et l'usage
  //    du nom humain comme libellé sont désormais faits directement dans capInjectToArbo()
  //    pendant le parcours de l'arbre XML (node.attrs.nature est disponible à cet instant,
  //    inutile de re-chercher dans le XML après coup comme le faisait l'ancienne étape 5).

  buildPanel();
  setupMarkers();   // recalcule les marqueurs SVG selon les nouvelles couleurs/types
  rebuildTree();    // applique S.relF et S.typF au graphe → masque les relations SysML
  buildArbo();
}

/** Injecte les éléments Capella dans MODEL.elements pour qu'ils apparaissent
 * dans l'arborescence gauche de Relation Map.
 * Filtre en deux passes : marque les nœuds liés/chaînes, puis injecte seulement ceux-là.
 */
function capInjectToArbo(){
  // Remove previous capella elements from MODEL
  MODEL.elements=MODEL.elements.filter(e=>!e._capella);
  MODEL.relations=MODEL.relations.filter(r=>!r._capella);
  if(!capTreeData) return;
  // Plus de paquetage « Projet » artificiel : les éléments de premier niveau du modèle
  // (SystemEngineering en général) sont directement à la racine de l'arborescence.

  // Build set of IDs that have at least one link
  const linkedIds=new Set();
  if(cap_xmlDoc){
    for(const el of [...cap_xmlDoc.getElementsByTagName('*')]){
      ['source','target','sourceElement','targetElement','involved'].forEach(attr=>{
        const v=el.getAttribute(attr);
        if(v){const r=v.replace(/^#/,'');linkedIds.add(r);linkedIds.add(capXId(el));}
      });
    }
  }
  if(typeof capSysmlLiensModel==='function') capSysmlLiensModel().forEach(r=>{ linkedIds.add(r.src); linkedIds.add(r.tgt); });   // 🧩 liaisons SysML v2 (87)
  const chainTypes=new Set(['FunctionalChain','OperationalProcess','PhysicalPath']);

  // Pass 1: collect all node IDs to show (linked + chains + their ancestor path to root)
  const showIds=new Set();
  /** Marque récursivement les nœuds à afficher dans l'arborescence : un nœud est retenu
   * s'il porte une relation, appartient à une chaîne, ou possède au moins un descendant retenu.
   * @param {object} node - Nœud de l'arbre Capella
   * @returns {boolean} Vrai si le nœud ou l'un de ses descendants doit être affiché
   */
  function markLinked(node){
    if(!node||node.typeName==='Project') return false;
    const isLinked=linkedIds.has(node.id);
    const isChain=chainTypes.has(node.typeName);
    let childLinked=false;
    if(node.children) for(const c of node.children) if(markLinked(c)) childLinked=true;
    // Show this node if it has a link, is a chain, or has at least one linked descendant
    const show=isLinked||isChain||childLinked;
    if(show) showIds.add(node.id);
    return show;
  }
  for(const c of (capTreeData.children||[])) markLinked(c);

  // Pass 2: inject only showIds nodes
  /** Ajoute récursivement un nœud Capella (et sa descendance retenue) dans MODEL.elements,
   * en sautant les nœuds non retenus tout en rattachant leurs enfants au bon parent.
   * @param {object} node - Nœud de l'arbre Capella
   * @param {string} parentId - Identifiant du parent dans MODEL
   */
  function addNode(node,parentId){
    if(!node||node.typeName==='Project') return;
    if(!showIds.has(node.id)){
      if(node.children)for(const c of node.children)addNode(c,parentId);
      return;
    }
    // Différenciation PhysicalComponent par nature — faite ICI pendant le parcours,
    // où node.attrs.nature est directement disponible (pas de re-recherche XML).
    let typeKey = node.typeName;
    if (node.typeName === 'PhysicalComponent') {
      const nature = node.attrs.nature || '';
      if (nature === 'NODE') typeKey = 'PhysicalComponent (NODE)';
      else if (nature === 'BEHAVIOR') typeKey = 'PhysicalComponent (BEHAVIOR)';
      // sinon (sans nature) : on garde 'PhysicalComponent' tel quel
    }
    const el={id:node.id||('cap-'+Math.random().toString(36).slice(2,8)),
      name:node.name||node.typeName,
      type:typeKey,_capella:true,parentEl:parentId};
    if(!TCFG[typeKey]){
      const lv=CAP_LAYERS[node.layer]||{color:'#8b949e'};
      const isArch=['SystemEngineering','OperationalAnalysis','SystemAnalysis','LogicalArchitecture','PhysicalArchitecture','EPBSArchitecture'].includes(node.typeName);
      // Couleurs spécifiques :
      // - Tous les types liés aux fonctions (OperationalActivity, SystemFunction, LogicalFunction,
      //   PhysicalFunction, FunctionalChain...) → palette verte (teintes différentes pour les distinguer)
      // - PhysicalComponent (NODE) → jaune clair rgb(255,252,183)
      // - PhysicalComponent (BEHAVIOR) → bleu rgb(150,177,218)
      // - PhysicalComponent sans nature → violet
      const FUNCTION_TYPES_COLORS = {
        OperationalActivity:'#22c55e',       // vert
        SystemFunction:'#4ade80',            // vert clair
        LogicalFunction:'#34d399',           // vert émeraude
        PhysicalFunction:'#10b981',          // vert teal
        FunctionalChain:'#16a34a',           // vert foncé
        FunctionalExchange:'#86efac',        // vert très clair
        OperationalProcess:'#15803d',        // vert sapin
      };
      let nodeColor = lv.color;
      if (FUNCTION_TYPES_COLORS[node.typeName]) nodeColor = FUNCTION_TYPES_COLORS[node.typeName];
      else if (typeKey==='PhysicalComponent (NODE)') nodeColor='#fffcb7';     // rgb(255,252,183)
      else if (typeKey==='PhysicalComponent (BEHAVIOR)') nodeColor='#96b1da'; // rgb(150,177,218)
      else if (typeKey==='PhysicalComponent') nodeColor='#c084fc';           // sans nature → violet
      // Label affiché dans le panneau Types d'éléments : nom humain (CAP_HUMAN_NAMES) si connu,
      // sinon le type technique brut. PhysicalComponent (NODE)/(BEHAVIOR) ne sont pas dans le CSV
      // (ce sont des variantes créées ici), donc on retombe sur typeKey pour elles.
      const humanLabel = (CAP_HUMAN_NAMES[node.typeName]||{}).h || typeKey;
      TCFG[typeKey]={color:nodeColor,abbr:(node.typeName.slice(0,3)).toUpperCase(),
        icon:CAP_PKG_TYPES.has(node.typeName)||isArch?'📂':CAP_TYPE_ICON[node.typeName]?'◈':'◻',
        _capella:true, label:humanLabel};
    }
    MODEL.elements.push(el);
    if(node.children)for(const c of node.children)addNode(c,el.id);
  }
  for(const c of (capTreeData.children||[])) addNode(c,undefined);
  buildPanel(); buildArbo();
}
/** Ajoute les types de relations Capella (PC NODE→PC NODE, etc.) dans RCFG
 * pour qu'ils apparaissent dans le panneau Critères de relation.
 */
function capInjectCapellaRelsToCriteria(){
  // CAP_LINK_SECTIONS declared later — access after init. Build RCFG entries from it.
  // Use relType as the relation type key (human-readable name).
  const capLinkColors=[
    '#f97316','#eab308','#a78bfa','#fb923c','#eab308',
    '#4ade80','#eab308','#facc15','#d4a017','#22c55e',
    '#4ade80','#16a34a','#3b82f6','#60a5fa','#22c55e','#eab308',
    '#fb923c','#60a5fa','#15803d','#16a34a'
  ];
  const capLinkDashes=['','','6,3','5,3','6,3','','','','6,3','','','6,3','','6,3','3,3','3,3','3,3','3,3','3,3','2,3'];
  const capLinkOpen=[false,false,false,true,false,false,false,false,false,false,false,false,false,false,false,false];
  const capLinkDiamond=[true,true,false,false,false,true,true,true,false,true,true,false,true,false,false,false];
  const capLinkHollow=[false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,true,true,true];

  CAP_LINK_SECTIONS.forEach((sec,i)=>{
    const key=sec.relType; // use the display name as RCFG key
    if(!RCFG[key]){
      RCFG[key]={
        color:capLinkColors[i]||sec.srcC||'#a78bfa',
        dash:capLinkDashes[i]||'',
        open:capLinkOpen[i]||false,
        diamond:capLinkDiamond[i]||false,
        hollowDiamond:capLinkHollow[i]||false,
        circle:false,
        noArrow:false,
        _capella:true,
        label:sec.humanLabel||sec.relType
      };
    }
    RCFG[key].label=sec.humanLabel||sec.relType; // libellé toujours à jour
    if(!(key in S.relF)) S.relF[key]=false;
  });
  if(typeof capSysmlCriteres==='function') capSysmlCriteres();   // 🧩 relations SysML v2 (87)
  buildPanel();
}

// ── Render Capella Data view ──

// ── Inject computed links as MODEL.relations ──
/** Calcule les liens Capella via capComputeLinks() et les injecte dans MODEL.relations
 * avec _capella:true. Utilise les IDs XML directement (pas de résolution par nom).
 */
function capInjectLinksToModel(){
  MODEL.relations=MODEL.relations.filter(r=>!r._capella);
  const links=capComputeLinks();
  // Build XML-id → MODEL-element-id map
  // capAllElements stores the XML id in .id field
  // MODEL.elements for _capella elements also use the XML id directly
  const xmlIdToModelId={};
  for(const el of MODEL.elements){
    if(el._capella&&el.id) xmlIdToModelId[el.id]=el.id; // same id used
  }
  // Also map from capAllElements xml ids
  for(const el of capAllElements){
    if(el.id) xmlIdToModelId[el.id]=el.id;
  }
  let seq=0;
  for(const sec of CAP_LINK_SECTIONS){
    const rows=links[sec.key]||[];
    for(const r of rows){
      // Use the XML id directly — MODEL._capella elements use the same XML id
      const srcId=r.src.id&&xmlIdToModelId[r.src.id] ? r.src.id : null;
      const tgtId=r.tgt.id&&xmlIdToModelId[r.tgt.id] ? r.tgt.id : null;
      if(srcId&&tgtId&&srcId!==tgtId){
        MODEL.relations.push({
          id:'cap-rel-'+(seq++),
          src:srcId,
          tgt:tgtId,
          type:sec.relType,
          name:'',
          _capella:true
        });
      }
    }
  }
  if(typeof capSysmlLiensModel==='function') capSysmlLiensModel().forEach(r=>{   // 🧩 liaisons SysML v2 (87)
    if(xmlIdToModelId[r.src]&&xmlIdToModelId[r.tgt]&&r.src!==r.tgt) MODEL.relations.push({id:'cap-rel-'+(seq++), src:r.src, tgt:r.tgt, type:r.type, name:'', _capella:true});
  });
  setupMarkers(); buildPanel(); rebuildTree();
}

// ── Inject chains into modal ──
let capChainsForModal=[];

// ── Filter arbo: keep only _capella elements referenced in MODEL.relations ──
/** Filtre MODEL.elements pour ne conserver que les éléments _capella référencés
 * comme src ou tgt dans MODEL.relations, ainsi que leurs ancêtres conteneurs
 * et les chaînes fonctionnelles.
 */
function capFilterArboToLinked(){
  // Build set of element IDs that appear as src or tgt in any relation
  const referencedIds=new Set();
  for(const r of MODEL.relations){
    referencedIds.add(r.src);
    referencedIds.add(r.tgt);
  }
  // Also keep chain elements (_capChain)
  // Also keep Package/_capella containers that have at least one referenced child
  // Two-pass: mark keepers
  /** Indique si un élément possède, dans sa descendance, au moins un élément référencé
   * par une relation ou appartenant à une chaîne — sert à élaguer l'arborescence.
   * @param {string} elId - Identifiant de l'élément
   * @returns {boolean} Vrai si un descendant est lié
   */
  const kidsMap=new Map(); MODEL.elements.forEach(e=>{ if(!e.parentEl) return; let a=kidsMap.get(e.parentEl); if(!a) kidsMap.set(e.parentEl,a=[]); a.push(e); });
  const memo=new Map();
  function hasLinkedDescendant(elId){
    if(memo.has(elId)) return memo.get(elId);
    memo.set(elId,false);
    const children=kidsMap.get(elId)||[];
    const r=children.some(c=>referencedIds.has(c.id)||c._capChain)||children.some(c=>hasLinkedDescendant(c.id));
    memo.set(elId,r); return r;
  }
  MODEL.elements=MODEL.elements.filter(e=>{
    if(!e._capella) return true;            // keep all non-capella elements
    if(e._capChain) return true;            // keep chains
    if(!e.id) return false;
    if(referencedIds.has(e.id)) return true; // directly linked
    // Keep if it's a container with linked children
    return hasLinkedDescendant(e.id);
  });
  buildArbo();
}

/** Calcule les chaînes (FunctionalChain, OperationalProcess, PhysicalPath)
 * et les ajoute à MODEL.elements à leur position hiérarchique réelle dans le modèle.
 */
function capInjectChainsToModal(){
  capChainsForModal=capComputeChains();
  // Add chain elements to MODEL so they appear in arbo at their real hierarchical position
  MODEL.elements=MODEL.elements.filter(e=>!e._capChain);
  const CAP_CHAIN_COLORS_MAP={FunctionalChain:'#22c55e',OperationalProcess:'#3b82f6',PhysicalPath:'#f97316'};

  // Build XML id → MODEL element id map for parent lookup
  const xmlIdToModelId={};
  MODEL.elements.forEach(e=>{ if(e._capella&&e.id) xmlIdToModelId[e.id]=e.id; });

  // Find real parent of a chain node in capTreeData via XML parent element
  /** Retrouve dans le XML l'élément parent d'une chaîne fonctionnelle, afin de la rattacher
   * au bon nœud de l'arborescence.
   * @param {string} chainId - Identifiant XML de la chaîne
   * @returns {Element|null} Élément parent, ou null s'il est introuvable
   */
  const _xmlById=new Map();
  if(cap_xmlDoc) for(const x of cap_xmlDoc.getElementsByTagName('*')){ const i=x.getAttribute('id')||capXId(x); if(i&&!_xmlById.has(i)) _xmlById.set(i,x); }
  function findChainParent(chainId){
    if(!cap_xmlDoc) return null;
    // Élément XML de la chaîne retrouvé par index, puis remontée jusqu'au premier ancêtre présent dans MODEL
    for(const xmlEl of [_xmlById.get(chainId)].filter(Boolean)){
      {
        const xmlParent=xmlEl.parentElement;
        if(xmlParent){
          const parentId=xmlParent.getAttribute('id')||capXId(xmlParent);
          // Find if this parent id exists in MODEL elements
          if(parentId&&xmlIdToModelId[parentId]) return parentId;
          // Walk up further
          let gp=xmlParent.parentElement;
          while(gp){
            const gpId=gp.getAttribute('id')||capXId(gp);
            if(gpId&&xmlIdToModelId[gpId]) return gpId;
            gp=gp.parentElement;
          }
        }
        return null;
      }
    }
    return null;
  }

  for(const chain of capChainsForModal){
    const chainId=chain.id||('capchain-'+Math.random().toString(36).slice(2,8));
    const parentId=findChainParent(chainId);
    const el={id:chainId,name:chain.name,type:chain.type,_capella:true,_capChain:true,
               parentEl:parentId||undefined};
    if(!TCFG[chain.type]) TCFG[chain.type]={color:CAP_CHAIN_COLORS_MAP[chain.type]||'#a78bfa',abbr:chain.type.slice(0,3).toUpperCase(),icon:'⚡'};
    MODEL.elements.push(el);
  }
  buildArbo();
}

/** Dispatche le rendu vers la vue Capella active (cards/table/tree/links/chains/physlink).
 * Met à jour les boutons de vue et les compteurs de stats.
 */
function capRenderCurrentView(){
  ['cap-view-cards','cap-view-table','cap-view-matrix','cap-view-tree','cap-view-chains','cap-view-physlink','cap-view-compex','cap-view-fex','cap-view-cblk','cap-view-csys','cap-view-oav','cap-view-scen','cap-view-diag','cap-view-ports','cap-view-functions','cap-view-analyses','cap-view-dashboard','cap-view-home'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const pg=document.getElementById('cap-pagination'); if(pg) pg.style.display='none';

  if(!capLoaded){
    document.getElementById('cap-view-cards').style.display='block';
    document.getElementById('cap-view-cards').innerHTML=_L('<div style="text-align:center;padding:60px;color:var(--c-dim)"><div style="font-size:48px;margin-bottom:12px">🔷</div><div>Chargez un modèle<br>via 📁 Fichier › 📂 Ouvrir un modèle</div></div>');
    capUpdateToolbarForView(capCurrentView);
    return;
  }

  capUpdateToolbarForView(capCurrentView);
  capUpdateStatChips();

  if(capCurrentView==='home'){
    const hv=document.getElementById('cap-view-home'); hv.style.display='flex';
    capRenderHome(hv);
  } else if(capCurrentView==='tree'){
    document.getElementById('cap-view-tree').style.display='block';
    capRenderTree();
  } else if(capCurrentView==='cards'){
    document.getElementById('cap-view-cards').style.display='block';
    capRenderCards();
  } else if(capCurrentView==='table'){
    document.getElementById('cap-view-table').style.display='flex';
    capRenderTable();
  } else if(capCurrentView==='matrix'){
    document.getElementById('cap-view-matrix').style.display='flex';
    capRenderMatrix();   // ▦ Matrice (91)
  } else if(capCurrentView==='chains'){
    document.getElementById('cap-view-chains').style.display='block';
    capRenderChains();
  } else if(capCurrentView==='physlink'){
    document.getElementById('cap-view-physlink').style.display='block';
    capRenderPhysLink();
  } else if(capCurrentView==='compex'){
    document.getElementById('cap-view-compex').style.display='block';
    capRenderCompExchange();
  } else if(capCurrentView==='cblk'){
    document.getElementById('cap-view-cblk').style.display='block';
    capRenderComponentBlocks('LA');
  } else if(capCurrentView==='scen'){
    document.getElementById('cap-view-scen').style.display='block';
    capRenderScenarios();
  } else if(capCurrentView==='diag'){
    document.getElementById('cap-view-diag').style.display='block';
    capRenderDiagrams();
  } else if(capCurrentView==='oav'){
    document.getElementById('cap-view-oav').style.display='block';
    capRenderFunctionalExchange('OA');
  } else if(capCurrentView==='csys'){
    document.getElementById('cap-view-csys').style.display='block';
    capRenderComponentBlocks('SA');
  } else if(capCurrentView==='fex'){
    document.getElementById('cap-view-fex').style.display='block';
    capRenderFunctionalExchange();
  } else if(capCurrentView==='functions'){
    document.getElementById('cap-view-functions').style.display='block';
    capRenderFunctionsView();
  } else if(capCurrentView==='analyses'){
    document.getElementById('cap-view-analyses').style.display='block';
    capRenderAnalyses();
  } else if(capCurrentView==='dashboard'){
    const dv=document.getElementById('cap-view-dashboard'); dv.style.display='block';
    capRenderDashboard(dv);
  } else if(capCurrentView==='ports'){
    document.getElementById('cap-view-ports').style.display='block';
    capRenderPorts();
  }
  capRenderSidebar();
}

/** Met à jour les puces de comptage OA/SA/LA/PA/EPBS/Shared/total dans la sous-barre. */
function capUpdateStatChips(){
  const chips=document.getElementById('cap-stat-chips'); if(!chips) return;
  const total=capAllElements.length;
  const byLayer={};
  for(const el of capAllElements){byLayer[el.layer]=(byLayer[el.layer]||0)+1;}
  chips.innerHTML='<span style="font-size:11px;color:var(--c-dim);font-weight:600;margin-right:2px">'+total+' total</span>'+
    Object.entries(CAP_LAYERS).map(([k,v])=>{const c=byLayer[k]||0;if(!c)return'';
      return`<span style="font-size:11px;color:${v.color};font-family:monospace;background:${v.color}22;padding:2px 6px;border-radius:4px;font-weight:600">${k} ${c}</span>`;
    }).join('');
}