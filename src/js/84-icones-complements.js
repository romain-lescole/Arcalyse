/* ═══════════════════════════════════════════════════════════════════════
   🖼 ICÔNES DE COMPLÉMENT
   ───────────────────────────────────────────────────────────────────────
   La visionneuse d'Arcature (capIco / capIcoType, 54) ne dessine pas d'icône pour certains types : éléments
   internes des scénarios (MessageEnd, ExecutionEnd…), liens de traçabilité, expressions, machines à états,
   exigences (Requirements), catalogues REC / RPL… Ce module les dessine dans le même style (SVG 16 × 16, couleurs
   de Capella) ; tout autre type sans icône reçoit une icône générique à ses initiales, pour qu'aucun élément
   n'en soit dépourvu.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Corps SVG (viewBox 0 0 16 16) des icônes de complément, par type court. Construit au premier appel.
 * @returns {Object<string,string>} Type → dessin
 */
function capIcoPlusTable(){
  if(capIcoPlusTable._t) return capIcoPlusTable._t;
  const tx=(t, x, y, taille, coul)=>`<text x="${x}" y="${y}" font-size="${taille}" font-weight="700" text-anchor="middle" fill="${coul||'#111'}" stroke="none">${t}</text>`;
  const fl=(a, b, coul, plein)=>`<path d="M${a} 8H${b-2.4}" stroke="${coul}" stroke-width="1.6"${plein?'':' stroke-dasharray="2 1.4"'}/><path d="M${b-3} 6L${b} 8L${b-3} 10Z" fill="${coul}" stroke="${coul}" stroke-width=".5"/>`;
  // Gabarits partagés
  const dossier=(f, s)=>`<path d="M1 3.5H6L7.3 5H15V13.5H1Z" fill="${f}" stroke="${s}" stroke-width="1.1"/><path d="M1 6.5H15" stroke="${s}" stroke-width=".9"/>`;
  const typeDef=t=>`<rect x="1" y="2.5" width="14" height="11" rx="2" fill="#e8eef7" stroke="#2b5a8a" stroke-width="1.1"/>`+tx(t, 8, 10.8, t.length>1?6.4:8, '#1d3f63');
  const valeur=t=>`<path d="M1.5 4.5H10.5L14.5 8L10.5 11.5H1.5Z" fill="#fdf1d6" stroke="#8a6d1a" stroke-width="1.1"/>`+tx(t, 6.6, 10.4, 6.2, '#5c4710');
  const lien=(c1, c2, coul, plein)=>`<rect x="1" y="5" width="4" height="6" fill="${c1}" stroke="#333" stroke-width="1"/><rect x="11" y="5" width="4" height="6" fill="${c2}" stroke="#333" stroke-width="1"/>`+fl(5, 11, coul, plein);
  const ligneVie=`<path d="M8 1V15" stroke="#555" stroke-width="1" stroke-dasharray="1.6 1.2"/>`;
  const capa=(x, y)=>`<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="#efe3b5" stroke="#94761e" stroke-width="1"/>`;
  const enveloppe=`<rect x="1" y="4" width="9.5" height="8" fill="#fff" stroke="#333" stroke-width="1"/><path d="M1 4L5.75 8.5L10.5 4" fill="none" stroke="#333" stroke-width=".9"/>`;
  const rec=(t, f, s)=>`<rect x="1" y="2.5" width="14" height="11" rx="1.5" fill="${f}" stroke="${s}" stroke-width="1.1"/>`+tx(t, 8, 10.6, t.length>2?5.6:6.6, s);
  capIcoPlusTable._t={
    // Scénarios : fins de messages, d'exécutions et de fragments, états, événements
    MessageEnd: ligneVie+`<path d="M1.5 8H6.6" stroke="#111" stroke-width="1.3"/><circle cx="8" cy="8" r="2.3" fill="#2b5a8a" stroke="#111" stroke-width=".8"/>`,
    ExecutionEnd: ligneVie+`<rect x="5.6" y="2.5" width="4.8" height="8.5" fill="#cfe6ff" stroke="#2b5a8a" stroke-width="1"/><path d="M4 11H12" stroke="#111" stroke-width="1.6"/>`,
    ExecutionEvent: ligneVie+`<rect x="5.6" y="3" width="4.8" height="10" fill="#cfe6ff" stroke="#2b5a8a" stroke-width="1"/><path d="M6.8 6.5H9.2M6.8 9.5H9.2" stroke="#2b5a8a" stroke-width=".9"/>`,
    FragmentEnd: `<path d="M2 2.5H14V13.5H2Z" fill="#f2f2f2" stroke="#555" stroke-width="1"/><path d="M2 2.5H8.5V5L7.5 6H2" fill="#fff" stroke="#555" stroke-width="1"/><path d="M2 13.5H14" stroke="#111" stroke-width="2"/>`,
    InteractionState: ligneVie+`<rect x="2" y="5.2" width="12" height="5.6" rx="2.8" fill="#d9d9d9" stroke="#666" stroke-width="1"/>`,
    EventSentOperation: enveloppe+`<path d="M10.5 8H13.4" stroke="#2e8b2e" stroke-width="1.6"/><path d="M12.6 5.8L15.2 8L12.6 10.2Z" fill="#2e8b2e"/>`,
    EventReceiptOperation: `<rect x="5.5" y="4" width="9.5" height="8" fill="#fff" stroke="#333" stroke-width="1"/><path d="M5.5 4L10.25 8.5L15 4" fill="none" stroke="#333" stroke-width=".9"/><path d="M1 8H3.4" stroke="#2b5a8a" stroke-width="1.6"/><path d="M2.8 5.8L5.4 8L2.8 10.2Z" fill="#2b5a8a"/>`,
    // Machines à états
    StateMachine: `<rect x="1" y="2" width="8" height="5" rx="1.8" fill="#d9d9d9" stroke="#666" stroke-width="1"/><rect x="7" y="9" width="8" height="5" rx="1.8" fill="#d9d9d9" stroke="#666" stroke-width="1"/><path d="M4 7.2V11.5H6" fill="none" stroke="#333" stroke-width="1.1"/><path d="M5.4 9.8L7.2 11.5L5.4 13.2Z" fill="#333"/>`,
    StateTransition: `<path d="M2.5 12.5C3 5 10 3 12.6 6.8" fill="none" stroke="#333" stroke-width="1.5"/><path d="M10.4 7.6L13.6 8.4L13.2 5Z" fill="#333"/><circle cx="2.5" cy="12.5" r="1.5" fill="#666"/>`,
    // Expressions et contraintes
    OpaqueExpression: tx('{ }', 8, 10.8, 8, '#222'),
    BinaryExpression: tx('{&amp;}', 8, 10.6, 7, '#222'),
    // Liens de traçabilité et relations entre éléments
    TransfoLink: lien('#dce7f4', '#a5dd8e', '#555', false),
    GenericTrace: lien('#eee', '#eee', '#7b4fb0', false),
    CatalogElementLink: `<rect x="1.5" y="5.5" width="7" height="5" rx="2.5" fill="none" stroke="#5a3a8a" stroke-width="1.6"/><rect x="7.5" y="5.5" width="7" height="5" rx="2.5" fill="none" stroke="#5a3a8a" stroke-width="1.6"/>`,
    AbstractCapabilityInclude: capa(4, 8)+capa(12, 8)+`<path d="M7.4 8H8.8" stroke="#94761e" stroke-width="1.2" stroke-dasharray="1.2 .8"/>`,
    CapabilityExploitation: `<ellipse cx="4.2" cy="8" rx="3.4" ry="2.4" fill="#e7d4f3" stroke="#6b3e8e" stroke-width="1"/>`+capa(12, 8)+`<path d="M7.6 8H8.7" stroke="#6b3e8e" stroke-width="1.2"/>`,
    PartDeploymentLink: `<rect x="7" y="3" width="8" height="10" fill="#ffff4a" stroke="#111" stroke-width="1.1"/><rect x="1" y="5.5" width="4" height="5" fill="#fff" stroke="#111" stroke-width="1"/><path d="M5 8H9" stroke="#111" stroke-width="1.2" stroke-dasharray="1.4 1"/><path d="M8.4 6.3L10.4 8L8.4 9.7Z" fill="#111"/>`,
    CapellaIncomingRelation: lien('#fff', '#e6eef8', '#2b5a8a', true),
    InternalRelation: lien('#e6eef8', '#e6eef8', '#2b5a8a', true),
    // Exigences (Requirements Viewpoint)
    CapellaModule: `<path d="M3 1.5H13.5V14.5H3Z" fill="#cfe0f5" stroke="#2b5a8a" stroke-width="1.1"/><path d="M4.8 1.5V14.5" stroke="#2b5a8a" stroke-width=".9"/>`+tx('M', 9.4, 10.8, 7, '#1d3f63'),
    Requirement: `<path d="M3 1.5H10.5L13.5 4.5V14.5H3Z" fill="#fff" stroke="#2b5a8a" stroke-width="1.1"/><path d="M10.5 1.5V4.5H13.5" fill="none" stroke="#2b5a8a" stroke-width=".9"/>`+tx('R', 8.2, 12, 7.5, '#2b5a8a'),
    RequirementType: typeDef('RT'), RelationType: typeDef('RL'),
    DataTypeDefinition: typeDef('DT'), EnumerationDataTypeDefinition: typeDef('E'),
    AttributeDefinition: typeDef('A'), AttributeDefinitionEnumeration: typeDef('AE'),
    EnumValue: `<rect x="2" y="3" width="12" height="10" fill="#fff" stroke="#7a1414" stroke-width="1.1"/>`+tx('e', 8, 11, 8, '#7a1414'),
    StringValueAttribute: valeur('S'), IntegerValueAttribute: valeur('1'), EnumerationValueAttribute: valeur('E'),
    // Dossiers
    Folder: dossier('#f6dc86', '#8a6d1a'), CapellaTypesFolder: dossier('#e4ecf6', '#333'),
    // REC / RPL
    RecCatalog: rec('REC', '#e6dcf5', '#5a3a8a'),
    CatalogElement: rec('RE', '#f1ebfa', '#5a3a8a'),
    CompliancyDefinition: `<circle cx="8" cy="8" r="6.5" fill="#f1ebfa" stroke="#5a3a8a" stroke-width="1.1"/><path d="M4.8 8.2L7.2 10.6L11.4 5.6" fill="none" stroke="#5a3a8a" stroke-width="1.7"/>`,
    // Divers
    ModelInformation: `<circle cx="8" cy="8" r="6.5" fill="#e6eef8" stroke="#2b5a8a" stroke-width="1.1"/>`+tx('i', 8, 11.4, 9, '#2b5a8a'),
    KeyValue: `<circle cx="4.5" cy="8" r="3" fill="#fdf1d6" stroke="#8a6d1a" stroke-width="1.2"/><path d="M7.5 8H15M12.5 8V10.5M14.5 8V10" stroke="#8a6d1a" stroke-width="1.4"/>`,
    PartMass: `<path d="M4 6H12L14.5 14H1.5Z" fill="#ddd" stroke="#555" stroke-width="1"/><circle cx="8" cy="4" r="1.8" fill="none" stroke="#555" stroke-width="1.1"/>`+tx('kg', 8, 12.4, 5.2, '#222'),
  };
  return capIcoPlusTable._t;
}

/**
 * Icône de complément d'un type (dessinée ici, ou métaclasse SysML v2 dessinée par 87) ou, à défaut, icône générique à ses initiales.
 * @param {string} type - Type court (« MessageEnd »)
 * @param {number} [taille] - Côté en pixels (14 par défaut)
 * @returns {string} SVG (vide sans type)
 */
function capIcoPlus(type, taille){
  if(!type) return '';
  const sy=typeof capIcoSysml==='function', t=(sy&&capSysmlActif()&&capIcoSysml(type))||capIcoPlusTable()[type]||(sy?capIcoSysml(type):'');   // 87 : métaclasses SysML v2 (d'abord, pour un modèle SysML)
  const n=taille||14;
  const corps=t||(()=>{ const ini=(type.match(/[A-Z]/g)||[type[0].toUpperCase()]).slice(0,2).join('');
    return `<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#eceef1" stroke="#8b949e" stroke-width="1"/><text x="8" y="10.6" font-size="${ini.length>1?6.4:8}" font-weight="700" text-anchor="middle" fill="#444" stroke="none">${ini}</text>`; })();
  return `<svg class="ico" viewBox="0 0 16 16" width="${n}" height="${n}" aria-hidden="true" stroke-linejoin="round" font-family="Arial,Helvetica,sans-serif">${corps}</svg>`;
}

/* ── 🎨 Récapitulatif des icônes par langage (onglet « 🎨 Icônes » de l'aide) ── */

/** Types montrés dans le récapitulatif, par langage puis par groupe : [titre du groupe, types]. Les icônes viennent des composants
 * d'Arcature (visionneuse pour Capella, lecteurs SysML v2 et UML / SysML v1) ; un type sans icône est omis. */
const CAP_AIDE_ICONES={
  capella:[
    [_L('Analyse opérationnelle (OA)'), ['OperationalActivity','OperationalProcess','Entity','OperationalActor','Role','OperationalCapability','CommunicationMean']],
    [_L('Analyse système (SA)'), ['SystemFunction','SystemComponent','SystemActor','Capability','Mission','FunctionalChain']],
    [_L('Architecture logique (LA)'), ['LogicalFunction','LogicalComponent','LogicalActor','CapabilityRealization']],
    [_L('Architecture physique (PA)'), ['PhysicalFunction','PhysicalComponent','PhysicalActor','PhysicalLink','PhysicalPath','PhysicalPort']],
    [_L('Structure du produit (EPBS)'), ['ConfigurationItem']],
    [_L('Échanges et ports'), ['FunctionalExchange','ComponentExchange','ExchangeItem','FunctionInputPort','FunctionOutputPort','ComponentPort','Interface']],
    [_L('Données'), ['Class','DataPkg','Enumeration','BooleanType','NumericType','StringType','Collection','Union']],
    [_L('Comportement, exigences, autres'), ['StateMachine','State','Mode','Scenario','Requirement','Constraint','Part','PropertyValuePkg']]],
  sysml2:[
    ['STR', ['PartDefinition','PartUsage','AttributeDefinition','AttributeUsage','ItemDefinition','ItemUsage','PortDefinition','PortUsage','ConnectionDefinition','ConnectionUsage','InterfaceDefinition','InterfaceUsage','EnumerationDefinition','OccurrenceDefinition']],
    ['BEH', ['ActionDefinition','ActionUsage','StateDefinition','StateUsage','TransitionUsage','CalculationDefinition','ConstraintDefinition','FlowConnectionUsage','AllocationDefinition','AllocationUsage']],
    ['REQ', ['RequirementDefinition','RequirementUsage','ConcernDefinition','UseCaseDefinition','AnalysisCaseDefinition','VerificationCaseDefinition','ViewDefinition','ViewpointDefinition']],
    ['ORG', ['Package','LibraryPackage','Comment','Documentation','Import']]],
  uml:[
    ['STR', ['Block','InterfaceBlock','ValueType','ConstraintBlock','Port','ProxyPort','FullPort','FlowProperty','Signal','Interface','Class','Component','DataType','Enumeration']],
    ['BEH', ['Activity','CallBehaviorAction','OpaqueAction','SendSignalAction','AcceptEventAction','StateMachine','State','Transition','Interaction','Lifeline','Message','Operation']],
    ['REQ', ['Requirement','TestCase','UseCase','Actor','Satisfy','Verify','DeriveReqt','Refine','Trace','Copy']],
    ['ORG', ['Package','Model','Profile','Allocate','Connector','ItemFlow','Association','Generalization','Dependency']]]
};

/**
 * Contenu de l'onglet « 🎨 Icônes » de l'aide : pour chaque langage embarqué (Capella, SysML v2, UML / SysML v1), les icônes des types
 * d'éléments par couche ou par famille (nom lisible, type), puis celles des genres de diagrammes et de vues ; filtre par nom. Construit à la
 * première ouverture de l'onglet (les composants d'Arcature dessinent les icônes sans modèle chargé). Un langage absent de la version
 * (édition réduite à un format) n'apparaît pas.
 * @returns {string} HTML
 */
function capAideIconesHtml(){
  const esc=capEsc, V=window.ArcatureVisionneuse, Y=window.ArcatureLecteurSysml, U=window.ArcatureLecteurUml;
  const sur=(f)=>{ try{ return f()||''; }catch(e){ return ''; } };
  const tuile=(ico, nom, type)=>ico?`<div class="aic-t" data-q="${esc((nom+' '+type).toLowerCase())}" title="${esc(nom+(type&&type!==nom?' — '+type:''))}"><span class="aic-i">${ico}</span><span class="aic-txt"><span class="aic-n">${esc(nom)}</span>${type&&type!==nom?`<code class="aic-c">${esc(type)}</code>`:''}</span></div>`:'';
  const groupe=(titre, tuiles)=>tuiles.trim()?`<div class="aic-g"><div class="aic-gt">${esc(titre)}</div><div class="aic-grille">${tuiles}</div></div>`:'';
  const section=(f, titre, corps)=>corps?`<section class="aic-s"><h3>${capFmtPuce(f)}${titre?` <span class="ana-dim">${esc(titre)}</span>`:''}</h3>${corps}</section>`:'';
  const fmt=k=>(typeof CAP_FORMATS!=='undefined'&&CAP_FORMATS.find(f=>f.k===k))||{l:k, c:'#888'};
  let h='';
  if(V&&typeof V.iconeType==='function'){
    h+=section(fmt('capella'), _L('méthode ARCADIA, par couche'), CAP_AIDE_ICONES.capella.map(([g,ts])=>groupe(g, ts.map(t=>tuile(sur(()=>V.iconeType(t,20))||sur(()=>capIcoPlus(t,20)), ((typeof CAP_HUMAN_NAMES!=='undefined'&&CAP_HUMAN_NAMES[t])||{}).h||t, t)).join(''))).join(''));
  }
  if(Y&&typeof Y.icone==='function'){
    const fam=Y.familles||{};
    h+=section(fmt('sysml2'), _L('par famille'), CAP_AIDE_ICONES.sysml2.map(([g,ts])=>groupe(fam[g]||g, ts.map(t=>tuile(sur(()=>Y.icone(t,20)), sur(()=>Y.motCle(t))||t, t)).join(''))).join('')+
      groupe(_L('Vues calculées'), Object.entries(Y.genresVues||{}).map(([k,g])=>tuile(sur(()=>Y.iconeVue(k,20)), g.libelle||k, g.sigle||'')).join('')));
  }
  if(U&&typeof U.icone==='function'){
    const fam=U.familles||{};
    h+=section(fmt('uml'), _L('par famille'), CAP_AIDE_ICONES.uml.map(([g,ts])=>groupe(fam[g]||g, ts.map(t=>tuile(sur(()=>U.icone(t,20)), t, '')).join(''))).join('')+
      groupe(_L('Diagrammes, tableaux et matrices'), Object.entries(U.genresVues||{}).map(([k,g])=>tuile(sur(()=>U.iconeVue(k,20)), g.libelle||k, g.sigle||'')).join('')));
  }
  return `<input class="phl-filter-input aic-q" type="search" placeholder="${_L('Filtrer les icônes (nom, type, sigle)…')}" autocomplete="off">`+(h||`<p class="ana-dim">${_L('Aucun composant de dessin dans cette version.')}</p>`);
}

/** Remplit l'onglet « 🎨 Icônes » de l'aide à sa première ouverture et branche son filtre. */
function capAideIcones(){
  const box=document.getElementById('ht-ico-corps'); if(!box||box.dataset.fait) return;
  box.innerHTML=capAideIconesHtml(); box.dataset.fait='1';
  const q=box.querySelector('.aic-q');
  if(q) q.oninput=()=>{ const t=q.value.trim().toLowerCase();
    box.querySelectorAll('.aic-t').forEach(x=>{ x.style.display=!t||x.dataset.q.includes(t)?'':'none'; });
    box.querySelectorAll('.aic-g').forEach(g=>{ g.style.display=[...g.querySelectorAll('.aic-t')].some(x=>x.style.display!=='none')?'':'none'; }); };
}
document.addEventListener('click', e=>{ if(e.target.closest&&e.target.closest('.htab[data-ht="ico"]')) capAideIcones(); });
