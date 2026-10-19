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
  const oldXml = doc.querySelector('#cap-embedded-xml'); if (oldXml) oldXml.remove();
  const oldBoot = doc.querySelector('#cap-embedded-bootstrap'); if (oldBoot) oldBoot.remove();
  const oldAird = doc.querySelector('#cap-embedded-aird'); if (oldAird) oldAird.remove();

  if (capLoaded && cap_xmlDoc) {
    // Sérialise le document XML Capella tel qu'il a été chargé
    const xmlText = new XMLSerializer().serializeToString(cap_xmlDoc);

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
document.getElementById('b-save-page')?.addEventListener('click', capSaveFullPage);
document.getElementById('b-save-direct')?.addEventListener('click', e=>capSavePageDirect(e.shiftKey));
document.addEventListener('keydown', e=>{
  if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); }
});

/** Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s */
function capEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── File loading ──
document.getElementById('b-capella-load').addEventListener('click',()=>capPickCapellaFile());
document.getElementById('capella-file-input').addEventListener('cancel',()=>{ _capReplaceOk=0; });
document.getElementById('capella-file-input').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  capLoadFile(f, null, capReplacePreOk());
  e.target.value=''; // permet de recharger le même fichier
});

/** Charge un fichier Capella (depuis l'explorateur ou un glisser-déposer) : vérifie
 * l'extension, lit le XML localement puis rejoue le pipeline complet (arbre, types,
 * relations, liens, chaînes, panneaux) et bascule sur la vue Capella Data.
 * @param {File} f - Fichier choisi ou déposé
 * @param {FileSystemFileHandle} [handle] - Accès au fichier sur disque (Edge/Chrome), pour le 🔄 suivi des mises à jour
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté (pas de nouvelle question)
 */
function capLoadFile(f, handle, confirme){
  const name=(f&&f.name)||'';
  const ext=(name.split('.').pop()||'').toLowerCase();
  if (ext==='aird' && capDiagDispo()) { capDiagLoadAird(f, handle); return; }   // 🔲 Diagrammes Capella du projet
  if (ext==='html' || ext==='htm') { capProjetPageOuvrir(f, handle, confirme); return; }   // 📄 projet de travail (page HTML enregistrée)
  if (ext==='aird' || ext==='afm') {
    capWelcomeStatus(_L(`« ${name} » est un fichier de représentation/métadonnées : déposez le fichier .capella du projet.`),'err');
    capShowWelcome(true); return;
  }
  if (!['capella','melodymodeller','xml'].includes(ext)) {
    capWelcomeStatus(_L(`« ${name} » n'est pas un fichier Capella (.capella attendu).`),'err');
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
  cap_xmlDoc=doc;
  capAllElements=[];
  _capParentIndexCache=null; _capElementByIdCache=null; _capRefIndexCache=null; _capMcPropsCache=null; _capTableRelIdx=null; capChainsData=null; capLinksData=null; _capPortsCache=null; capAnaReset();
  if(typeof capHistReset==='function'&&_capHist.model!==name){ capHistReset(); _capHist.model=name; }   // ◀ ▶ historique vidé pour un autre modèle (76)
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
        `<button class="phl-export-btn" data-c="go" style="margin-left:0">${name?_L('Ouvrir le fichier'):_L('📂 Choisir le fichier .capella…')}</button></div></div>`;
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
  const w=document.getElementById('cap-welcome'); if(!w) return;
  w.classList.toggle('cw-hidden', !show);
  w.classList.toggle('cw-overlay', !!capLoaded);
  const t=document.getElementById('cw-title'), s=document.getElementById('cw-sub');
  if (capLoaded) {
    if(t) t.textContent=_L('Ouvrir un autre modèle Capella');
    if(s) s.innerHTML=_L(`Modèle actuel : <strong>${capEsc(capCurrentFileName||'—')}</strong><br>Déposez un nouveau fichier <strong>.capella</strong> pour le remplacer.`)+
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
function capUpdateWelcome(){ capShowWelcome(!capLoaded); }

(function(){
  const zone=document.getElementById('cap-drop-zone');
  const browse=()=>capPickCapellaFile();
  document.getElementById('cw-browse').addEventListener('click',ev=>{ ev.stopPropagation(); browse(); });
  // 📁 Dossier du projet : .capella et .aird chargés ensemble (54-diagrammes.js)
  document.getElementById('cw-folder').addEventListener('click',ev=>{ ev.stopPropagation(); capOpenProjectFolder(); });
  // 📄 Projet de travail : page HTML enregistrée (même par une version antérieure), reprise dans cette version (57-projet-page.js)
  document.getElementById('cw-projet').addEventListener('click',ev=>{ ev.stopPropagation(); capProjetPagePick(); });
  const fin=document.getElementById('cw-folder-input');
  fin.addEventListener('click',ev=>ev.stopPropagation());
  fin.addEventListener('change',()=>{
    const l=[...fin.files].map(f=>{ const p=(f.webkitRelativePath||f.name).split('/'); return {nom:f.name, chemin:p.slice(1).join('/')||f.name, lire:()=>Promise.resolve(f), h:null}; })
      .filter(f=>f.chemin.split('/').length<=2);
    fin.value='';
    if(l.length) capProjectFromFiles(l);
  });
  zone.addEventListener('click',browse);
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
 * Rend visible l'onglet Chaînes dans l'éditeur.
 */
function capInjectChainsToModal(){
  capChainsForModal=capComputeChains();
  // Show chains tab in modal
  const tab=document.getElementById('mtab-chains');
  if(tab) tab.style.display='';
  const cnt=document.getElementById('chains-count');
  if(cnt) cnt.textContent=capChainsForModal.length;
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
  ['cap-view-cards','cap-view-table','cap-view-tree','cap-view-links','cap-view-chains','cap-view-physlink','cap-view-compex','cap-view-fex','cap-view-cblk','cap-view-csys','cap-view-oav','cap-view-scen','cap-view-diag','cap-view-ports','cap-view-functions','cap-view-analyses','cap-view-dashboard','cap-view-index','cap-view-home'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const pg=document.getElementById('cap-pagination'); if(pg) pg.style.display='none';

  if(!capLoaded){
    document.getElementById('cap-view-cards').style.display='block';
    document.getElementById('cap-view-cards').innerHTML=_L('<div style="text-align:center;padding:60px;color:var(--c-dim)"><div style="font-size:48px;margin-bottom:12px">🔷</div><div>Chargez un fichier .capella<br>via 📁 Fichier › 🔷 Ouvrir un modèle Capella</div></div>');
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
  } else if(capCurrentView==='links'){
    document.getElementById('cap-view-links').style.display='block';
    capRenderLinks();
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
  } else if(capCurrentView==='index'){
    document.getElementById('cap-view-index').style.display='flex';
    capRenderIndex();
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