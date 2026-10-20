/* ══ ☰ BARRE DES VUES CAPELLA ══════════════════════════════════════════════════════
 * Navigation par intentions (refonte 3.0, docs/REFONTE-UX.md) : boutons directs 🏠 Accueil, 🔲 Diagrammes, ▤ Tableau,
 * puis trois menus déroulants — 🏗 Architecture, ✅ Vérifier, 💬 Revue & documents — rangés en sections ; n'importe quelle
 * vue peut être épinglée (📌) en bouton direct. Le champ 🔍 de la barre (ou Ctrl+K) cherche une vue — et, avec le
 * module 67, un élément du modèle ou un diagramme ; sans texte, il liste toutes les vues. Niveau d'affichage
 * Essentiel / Complet (le mode Complet ajoute les vues marquées x). Réglage enregistré dans la page (bloc JSON cap-toolbar).
 */
/** Catalogue des vues : k = clé (vue capShowView, « ana:… » pour une sous-vue de 🔬 Analyses, « home:… » pour un onglet
 * de 🏠 Accueil, « @… » pour une commande, « grp:… » pour une famille de vues fusionnées), l = libellé, g = menu ('' = bouton
 * direct), s = section du menu, x = mode Complet seulement, t = info-bulle.
 * Familles (refonte 3.0, lot 5) : f = vues de la famille (une seule entrée dans le menu, barre de famille sous la barre),
 * cc = sélecteur de couche commun, pc = vue ouverte selon la couche mémorisée ; une vue membre porte m (sa famille) et
 * c (libellé de sa puce dans la barre de famille) et n'apparaît plus seule dans les menus (recherche, épingles et ☰ la gardent). */
var CAP_NAV_ITEMS=[
  {k:'home',      l:_L('🏠 Accueil'),           g:'',     t:_L('Accueil du projet : informations, check-lists, plans de revue, tableaux blancs (texte, diagrammes et éléments cliquables)')},
  {k:'diag',      l:_L('🔲 Diagrammes Capella'), p:_L('🔲 Diagrammes'), g:'', t:_L('Diagrammes Capella du projet (.aird), dessinés comme dans Capella : liste, recherche, mini-carte, filtres, chaînes, exports ; clic sur un élément → son détail')},
  {k:'table',     l:_L('▤ Tableau'),            g:'',     t:_L('Tableau de tous les éléments du modèle : onglets de vues, colonnes d\'attributs, de relations et par chemin, tri, filtres, export CSV')},
  // 🏗 Architecture
  {k:'grp:fonc',  l:_L('ƒ Fonctions & échanges'),   g:'arch', f:['functions','fex','oav'], cc:1, t:_L('Fonctions (hiérarchie, tableau, traçabilité, métriques, contrôles), échanges fonctionnels en blocs, lignes et matrice, activités opérationnelles (OA)')},
  {k:'grp:comp',  l:_L('🧱 Composants & interfaces'), g:'arch', f:['csys','cblk','compex','physlink','ports'], pc:{SA:'csys', LA:'cblk', PA:'compex'}, t:_L('Composants en blocs à ports par couche (SA, LA, PA comportement, PA nœuds et Physical Links), échanges entre composants, traçabilité des ports')},
  {k:'grp:chsc',  l:_L('⚡ Chaînes & scénarios'),     g:'arch', f:['chains','scen'], cc:1, t:_L('Chaînes fonctionnelles, processus opérationnels et chemins physiques ; scénarios (diagrammes de séquence)')},
  {k:'functions', l:_L('ƒ Fonctions'),          m:'grp:fonc', c:_L('ƒ Fonctions'), g:'arch', t:_L('Fonctions : hiérarchie, tableau, traçabilité, métriques, contrôles, dossier')},
  {k:'fex',       l:_L('ƒ⇆ Functional Exchange'), m:'grp:fonc', c:_L('ƒ⇆ Échanges fonctionnels'), g:'arch', t:_L('Échanges entre fonctions : lignes, par fonction, blocs à pins façon Capella, matrice, contrôles')},
  {k:'oav',       l:_L('🟨 Operational Analysis'), m:'grp:fonc', c:_L('🟨 Activités OA'), g:'arch', t:_L('Activités opérationnelles (OA) en blocs façon Capella, avec leurs interactions et l\'entité ou l\'acteur qui les porte ; vue par activité, lignes, matrice, contrôles')},
  {k:'csys',      l:_L('🧱 System Component'), i:'🧱<sub class="tb-ico-l">SA</sub>', m:'grp:comp', c:_L('SA · System Component'), g:'arch', t:_L('System Components (SA) en blocs façon Capella : Component Ports UNSET / IN / OUT / INOUT, échanges, composants distants ; vue par composant, lignes, matrice, contrôles')},
  {k:'cblk',      l:_L('🧱 Logical Component'), i:'🧱<sub class="tb-ico-l">LA</sub>', m:'grp:comp', c:_L('LA · Logical Component'), g:'arch', t:_L('Logical Components (LA) en blocs façon Capella : Component Ports UNSET / IN / OUT / INOUT, échanges, composants distants ; vue par composant, lignes, matrice, contrôles')},
  {k:'compex',    l:_L('🔀 Behavior Exchange'), m:'grp:comp', c:_L('PA · Behavior Exchange'), g:'arch', t:_L('Component Exchanges de la couche PA entre Physical Components Behavior, et avec les acteurs reliés (anciennement 🔀 Component Exchange)')},
  {k:'physlink',  l:_L('🔌 Physical Link'),     m:'grp:comp', c:_L('PA · Physical Link'), g:'arch'},
  {k:'ports',     l:_L('🧩 Ports'),             m:'grp:comp', c:_L('🧩 Ports'), g:'arch', t:_L('Traçabilité Function Port ↔ Component Port ↔ Physical Port')},
  {k:'chains',    l:_L('⚡ Chaînes'),           m:'grp:chsc', c:_L('⚡ Chaînes'), g:'arch'},
  {k:'scen',      l:_L('🎬 Scénarios'),        m:'grp:chsc', c:_L('🎬 Scénarios'), g:'arch', t:_L('Diagrammes de séquence des scénarios Capella (ES, FS, OES, OAS, IS) : lignes de vie, messages, exécutions, états, modes et fonctions, fragments combinés, références')},
  {k:'ana:states',l:_L('🚦 Modes & états'),            g:'arch'},
  {k:'ana:caps',  l:_L('🎯 Capacités & missions'),     g:'arch'},
  {k:'ana:data',  l:_L('🗃 Données & interfaces'),     g:'arch'},
  {k:'ana:deploy',l:_L('🖧 Déploiement & EPBS'),       g:'arch', t:_L('Comportements déployés sur les nœuds physiques (PartDeploymentLink), Configuration Items de l\'EPBS et ce qu\'ils réalisent, contrôles')},
  {k:'@rm',       l:_L('🗺 Relation Map'),      g:'arch', s:_L('Explorer'), t:_L('Graphe interactif des éléments et de leurs relations : voisinage, dépliage, disposition, export en image')},
  {k:'tree',      l:_L('🌳 Arborescence'),      g:'arch', s:_L('Explorer')},
  {k:'cards',     l:_L('▦ Cartes'),             g:'arch', s:_L('Explorer'), x:1},
  {k:'index',     l:_L('📖 Index des types'),   g:'arch', s:_L('Explorer'), x:1},
  {k:'links',     l:_L('🔗 Liens'),             g:'arch', s:_L('Explorer'), x:1, t:_L('Relations entre les éléments du modèle')},
  // ✅ Vérifier
  {k:'ana:sante', l:_L('💚 Santé & contrôles'),          g:'verif', t:_L('Score global et par couche bâti sur tous les contrôles (🩺 profil), détail contrôle × couche, historique des versions')},
  {k:'grp:trac',  l:_L('🧬 Traçabilité entre couches'), g:'verif', f:['ana:trace','ana:xlay'], t:_L('Réalisations entre couches OA → SA → LA → PA → EPBS : tableau de couverture et chemins, ou graphe des réalisations')},
  {k:'ana:trace', l:_L('🧬 Traçabilité inter-couches'), m:'grp:trac', c:_L('🧬 Tableau de traçabilité'), g:'verif'},
  {k:'ana:xlay',  l:_L('⇶ Liens entre couches'),       p:_L('⇶ Couches'), m:'grp:trac', c:_L('⇶ Graphe des réalisations'), g:'verif', t:_L('Vue graphique des réalisations entre couches (OA → SA → LA → PA → EPBS) : fonctions, chaînes et leurs fonctions, capacités, composants…')},
  {k:'ana:reqs',  l:_L('📋 Exigences'),               g:'verif'},
  {k:'ana:pvmt',  l:_L('🏷 Propriétés'),              m:'grp:prop', c:_L('🏷 Propriétés (PVMT)'), g:'verif'},
  {k:'ana:cts',   l:_L('⛓ Contraintes'),              m:'grp:prop', c:_L('⛓ Contraintes'), g:'verif'},
  {k:'grp:prop',  l:_L('🏷 Propriétés & contraintes'), g:'verif', f:['ana:pvmt','ana:cts'], t:_L('Propriétés PVMT (groupes, valeurs, définitions) et contraintes (expressions, éléments contraints)')},
  {k:'ana:diff',  l:_L('⚖ Comparaison de versions'),  g:'verif'},
  {k:'ana:status',l:_L('🔖 Statut de revue'),          g:'verif', t:_L('Statut (DRAFT, TO BE REVIEWED, REVIEWED…) et commentaire de revue Capella de chaque élément : liste, répartition, contrôles')},
  {k:'ana:cats',  l:_L('🏷 Catégories d\'échanges'),   g:'verif', s:_L('Avancé'), x:1, t:_L('ExchangeCategory, ComponentExchangeCategory, PhysicalLinkCategory : échanges par catégorie, taux de catégorisation, contrôles')},
  {k:'ana:rec',   l:_L('📦 REC / RPL'),                g:'verif', s:_L('Avancé'), x:1, t:_L('Éléments réutilisables : REC (gabarits) et RPL (répliques), comparaison élément par élément, écarts, contrôles')},
  {k:'ana:libs',  l:_L('📚 Bibliothèques'),            g:'verif', s:_L('Avancé'), x:1, t:_L('Références vers d\'autres fichiers .capella (bibliothèques) : par bibliothèque, par référence, chargement des bibliothèques pour résoudre les cibles, contrôles')},
  // 💬 Revue & documents
  {k:'@revue',    l:_L('💬 Commentaires'),             g:'revue', t:_L('Panneau 💬 Revue : commentaires sur le modèle et les diagrammes, vérification après mise à jour, rapport, envoi de commentaires à relire')},
  {k:'home:docs', l:_L('☑ Check-lists & plans de revue'), g:'revue', t:_L('Check-lists et plans de revue (🏠 Accueil) : modèles ARCADIA ou vierges, points liés aux diagrammes et aux éléments, export')},
  {k:'home:dos',  l:_L('📑 Faire relire'),             g:'revue', t:_L('Dossiers de relecture : chapitres, descriptions, diagrammes ; page HTML ou Word à commenter, réimport des commentaires dans 💬 Revue')},
  {k:'home:rap',  l:_L('📘 Rapports automatiques'), p:_L('📘 Rapports'), g:'revue', t:_L('Rapports produits à partir du modèle selon un plan type (spécification boîte noire, dossier de conception boîte blanche, SSS / SSDD), modifiables, exportables en HTML à commenter ou en Word')},
  {k:'dashboard', l:_L('📐 Tableau de bord'),   g:'revue', t:_L('Tableaux de bord personnalisés : indicateurs, graphiques, tableaux')},
  {k:'@scripts',  l:_L('📜 Scripts'),           g:'revue', x:1, t:_L('Console de scripts : parcourir et analyser le modèle avec l\'API, comme les macros de Catia Magic (Alt+4)')}
];
/** Menus déroulants de la barre, dans l'ordre d'affichage (id = identifiant du bouton). */
var CAP_NAV_GROUPS=[
  {g:'arch',  id:'cap-v-arch',  l:_L('🏗 Architecture'),        t:_L('Comment le système est construit : fonctions et échanges, composants et interfaces, chaînes et scénarios, modes et états, capacités, données, déploiement ; Relation Map et arborescence')},
  {g:'verif', id:'cap-v-verif', l:_L('✅ Vérifier'),            t:_L('Le modèle est-il juste et complet ? Santé du modèle et contrôles, traçabilité, exigences, propriétés, contraintes, comparaison de versions, statut de revue')},
  {g:'revue', id:'cap-v-revue', l:_L('💬 Revue & documents'),   t:_L('Relire et produire : commentaires, check-lists et plans de revue, dossiers à faire relire, rapports automatiques, tableaux de bord')}
];
/** Réglage par défaut : boutons directs 🏠 Accueil, 🔲 Diagrammes, ▤ Tableau ; niveau Essentiel (v3 : réglage de la refonte 3.0). */
var CAP_NAV_DEFAULT={pins:['home','diag','table'], mode:'essentiel', v3:1};
var _capNav=(()=>{ try{ const el=document.getElementById('cap-toolbar'); const o=el&&JSON.parse(el.textContent);
  if(o&&Array.isArray(o.pins)) return capNavMigrate(o); }catch(e){} return JSON.parse(JSON.stringify(CAP_NAV_DEFAULT)); })();

/** Met à jour un réglage de barre enregistré avant la refonte 3.0 : niveau Expert → Complet, Simplifié ou Personnalisé
 * → Essentiel ; épingles ramenées aux boutons directs, plus celles que l'utilisateur avait ajoutées lui-même.
 * @param {object} o - Réglage {pins, mode, …}
 * @returns {object} Réglage mis à jour
 */
function capNavMigrate(o){
  if(o.v3) return o;
  const old=['home','table','diag','chains','ana:xlay','dashboard','home:rap'];   // anciennes épingles par défaut
  const mine=((o.mode==='perso'&&o.perso&&o.perso.pins)||o.pins||[]).filter(k=>!old.includes(k)&&CAP_NAV_ITEMS.some(i=>i.k===k&&i.k[0]!=='@'));
  o.mode=(o.mode==='simple'||o.mode==='perso')?'essentiel':'complet';
  o.pins=['home','diag','table',...mine];
  ['groups','perso','tbl','diag','home','ch','xl','rp'].forEach(k=>delete o[k]);
  o.v3=1;
  return o;
}

/** Vues sans données dans le modèle ouvert (pas de scénario, d'exigence, de bibliothèque…) : clés de CAP_NAV_ITEMS.
 * Tests légers sur les types présents, en cache dans _capAnaCache (vidé au chargement d'un modèle) ; les bibliothèques
 * sont testées à chaque appel (elles peuvent être chargées après le modèle).
 * @returns {Set<string>}
 */
function capNavVides(){
  if(!capLoaded||typeof _capAnaCache==='undefined') return new Set();
  if(!_capAnaCache.navVides){
    const T=new Set(capAllElements.map(e=>e.typeName)), has=re=>[...T].some(t=>re.test(t));
    const test={
      'scen':()=>T.has('Scenario'),
      'ana:states':()=>T.has('StateMachine'),
      'ana:deploy':()=>T.has('PartDeploymentLink')||T.has('ConfigurationItem'),
      'ana:reqs':()=>has(/Requirement$/),
      'ana:pvmt':()=>T.has('PropertyValueGroup')||has(/^(String|Integer|Float|Boolean|Enumeration)PropertyValue$/),
      'ana:cts':()=>T.has('Constraint'),
      'ana:status':()=>capAllElements.some(e=>e.attrs&&(e.attrs.status||e.attrs.review)),
      'ana:cats':()=>has(/^(Exchange|ComponentExchange|PhysicalLink)Category$/),
      'ana:rec':()=>T.has('CatalogElement')
    };
    const S=new Set(); Object.entries(test).forEach(([k,f])=>{ try{ if(!f()) S.add(k); }catch(e){ /* test indisponible : vue gardée */ } });
    _capAnaCache.navVides=S;
  }
  const S=new Set(_capAnaCache.navVides);
  try{ if(!_capLibs.length&&!capLibScan().libs.length) S.add('ana:libs'); }catch(e){ /* 72 indisponible */ }
  return S;
}

/** Réglage effectivement appliqué à la barre selon le niveau ⚙ (Essentiel ou Complet) et le réglage « vues vides masquées ».
 * @returns {{mode:string, pins:string[], hide:Set<string>, vides:Set<string>}} hide : vues absentes des menus
 * (mode Complet seulement ; vides en Essentiel) ; vides : vues sans données dans le modèle ouvert (grisées en Complet)
 */
function capNavEff(){
  const m=_capNav.mode==='complet'?'complet':'essentiel', vides=_capNav.vides===false?new Set():capNavVides();
  CAP_NAV_ITEMS.filter(i=>i.f&&i.f.every(k=>vides.has(k))).forEach(i=>vides.add(i.k));   // famille dont aucune vue n'a de données
  return {mode:m, pins:_capNav.pins, vides, hide:new Set(m==='complet'?[]:[...CAP_NAV_ITEMS.filter(i=>i.x).map(i=>i.k), ...vides])};
}

/** Change le niveau d'affichage des menus.
 * @param {'essentiel'|'complet'} m - Niveau
 */
function capNavSetMode(m){
  _capNav.mode=m==='complet'?'complet':'essentiel'; capNavSave(); capNavRender();
  if(typeof capToast==='function') capToast(m==='complet'?_L('⚙ Menus : Complet (toutes les vues)'):_L('⚙ Menus : Essentiel (vues avancées masquées, accessibles par la recherche)'));
}

/** Épingle ou retire une vue de la barre (bouton direct) ; une vue épinglée reste aussi dans son menu.
 * @param {string} k - Clé de la vue
 */
function capNavTogglePin(k){
  const L=_capNav.pins, i=L.indexOf(k); if(i>=0) L.splice(i,1); else L.push(k);
  capNavSave(); capNavRender();
}

/**
 * Bouton de la barre : icône, puis libellé masqué en mode ⚙ « icônes seules » (nom complet en infobulle).
 * @param {string} l - Libellé (icône, espace, texte)
 * @param {string} [ico] - Icône propre au mode icônes seules (sinon : début du libellé)
 * @returns {string} HTML
 */
function capNavLbl(l, ico){
  const i=l.indexOf(' '), a=i<0?l:l.slice(0,i), b=i<0?'':l.slice(i);
  return (_capNav.icons&&ico?ico:a)+(b?`<span class="tb-lbl">${b}</span>`:'');
}

/**
 * Icônes seules dans la barre : toujours si l'utilisateur les a choisies (⚙), sinon automatiquement
 * tant que la barre ne tient pas sur une ligne (attribut data-tbauto sur <html>).
 */
function capNavFit(){
  const H=document.documentElement, tb=document.getElementById('toolbar');
  if(_capNav.icons||!tb){ H.toggleAttribute('data-tbicons', !!_capNav.icons); H.removeAttribute('data-tbauto'); return; }
  H.removeAttribute('data-tbicons');   // mesure avec les libellés
  const b=[...tb.querySelectorAll('.tbtn')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect().top);
  const deborde=b.length>1&&Math.max(...b)>Math.min(...b)+4;
  H.toggleAttribute('data-tbicons', deborde); H.toggleAttribute('data-tbauto', deborde);
}

/** Enregistre le réglage de la barre dans la page (bloc JSON repris par la 💾 Page HTML). */
function capNavSave(){
  let el=document.getElementById('cap-toolbar');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-toolbar'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(_capNav).replace(/</g,'\\u003c');
}

/** Clé de la vue affichée (« ana:… » pour une sous-vue de 🔬 Analyses, « home:… » pour un onglet de 🏠 Accueil,
 * « @rm » pour la Relation Map).
 * @param {boolean} [force] - Ignorer le mode courant (appel pendant une bascule vers le mode capella)
 * @returns {string} Clé, ou '' hors des vues connues
 */
function capNavCurKey(force){
  if(!force&&currentMode!=='capella') return currentMode==='default'?'@rm':'';
  if(capCurrentView==='home'&&typeof _capHomeUi!=='undefined'){
    if(_capHomeUi.tab==='dos') return 'home:dos';   // 📑 Faire relire (dossiers de relecture)
    if(_capHomeUi.tab==='docs') return 'home:docs';   // ☑ Check-lists & plans de revue
  }
  return capCurrentView==='analyses'?'ana:'+capAnaSub:capCurrentView;
}

/** Ouvre une vue du catalogue, ou exécute une commande (« @… »).
 * @param {string} k - Clé de la vue
 */
function capNavOpen(k){
  capNavClose();
  if(k==='@rm'){ document.getElementById('mode-rm')?.click(); return; }
  if(k==='@scripts'){ capScrToggle(true); return; }   // 📜 console de scripts (81)
  if(k==='@revue'){ capRevToggle(true); return; }   // 💬 panneau des commentaires (55)
  if(k.startsWith('grp:')){ const G=CAP_NAV_ITEMS.find(i=>i.k===k); if(G) capNavGroupOpen(G); return; }   // famille de vues (lot 5)
  if(k==='home:rap'||k==='home:dos'){ capDosOuvrir(); return; }   // 📑 dossiers de relecture et 📘 rapports : onglet 📑 de l'accueil
  if(k==='home:docs'){ _capHomeUi.tab='docs'; if(currentMode!=='capella'||capCurrentView!=='home') capShowView('home'); else capHomeRender(); return; }
  if(k.startsWith('ana:')){ capAnaSub=k.slice(4); capShowView('analyses'); }
  else capShowView(k);
}

/** Dernière vue ouverte de chaque famille (session) : rouverte par l'entrée de menu de la famille. */
var _capNavLastGrp={};
/** Couche propre aux vues qui n'en montrent qu'une (🧱 SA / LA, PA, 🟨 OA) : sert à mémoriser la couche choisie. */
var CAP_NAV_COUCHE_VUE={csys:'SA', cblk:'LA', compex:'PA', physlink:'PA', oav:'OA'};

/** Couche affichée par une vue ('' = toutes), lue dans l'état de la vue.
 * @param {string} k - Clé de la vue
 * @returns {string}
 */
function capNavCoucheLue(k){
  const v=x=>x&&x!=='all'?x:'';
  if(k==='functions'){ const h=document.querySelector('#cap-view-functions [data-hold="fns"]'); return v(h&&h._fn&&h._fn.layer); }
  if(k==='fex'){ const c=document.getElementById('cap-view-fex'); return v(c&&c._fex&&c._fex.layer); }
  if(k==='chains') return v(capChainsLayerFilter);
  if(k==='scen') return v(_capScState.layer);
  return CAP_NAV_COUCHE_VUE[k]||'';
}

/** Vrai si une vue a des éléments dans une couche (pour n'imposer une couche que si elle montre quelque chose).
 * @param {string} k - Clé de la vue
 * @param {string} c - Couche
 * @returns {boolean}
 */
function capNavCoucheDispo(k, c){
  try{
    if(k==='functions') return capComputeFunctions().list.some(f=>f.layer===c);
    if(k==='fex') return capComputeFunctionalExchanges().list.some(x=>x.layer===c);
    if(k==='chains') return (capChainsData||(capChainsData=capComputeChains())).some(x=>x.layer===c);
    if(k==='scen') return capComputeScenarios().list.some(x=>x.layer===c);
  }catch(e){ /* calcul indisponible */ }
  return false;
}

/** Applique la couche mémorisée (_capNav.couche, '' = toutes) à la vue affichée, si elle a un filtre de couche
 * et des éléments dans cette couche, puis la redessine.
 * @param {string} k - Clé de la vue
 */
function capNavCouchePose(k){
  const c=_capNav.couche; if(c===undefined||capNavCoucheLue(k)===c||(c&&!capNavCoucheDispo(k,c))) return;
  const l=c||'all';
  if(k==='functions'){ const h=document.querySelector('#cap-view-functions [data-hold="fns"]'); if(h&&h._fn){ h._fn.layer=l; capRenderFunctions(h); } }
  else if(k==='fex'){ const v=document.getElementById('cap-view-fex'); if(v&&v._fex){ v._fex.layer=l; capRenderFunctionalExchange(); } }
  else if(k==='chains'){ capChainsLayerFilter=l; capRenderChains(); }
  else if(k==='scen'){ _capScState.layer=l; capRenderScenarios(); }
  else return;
  capNavFluxTabs(k);
}

/** Choisit la couche commune (sélecteur de la barre de famille) : mémorisée avec la barre, appliquée à la vue affichée.
 * @param {string} c - Couche ('' = toutes)
 * @param {string} k - Clé de la vue affichée
 */
function capNavCoucheSet(c, k){
  _capNav.couche=c; capNavSave(); capNavCouchePose(k);
}

/** Ouvre une famille de vues : la vue de la couche mémorisée (🧱), sinon la dernière ouverte, sinon la première qui a des données.
 * @param {Object} G - Entrée de famille de CAP_NAV_ITEMS
 */
function capNavGroupOpen(G){
  const E=capNavEff(), c=_capNav.couche;
  const k=(G.pc&&c&&G.pc[c])||_capNavLastGrp[G.k]||G.f.find(x=>!E.vides.has(x))||G.f[0];
  capNavOpen(k);
  if(G.cc) capNavCouchePose(k);
}

/** Barre de famille sous la barre principale (ex. 🧱 Composants & interfaces : SA · System Component, LA · Logical Component…) :
 * puces des vues de la famille, sélecteur de couche commun (familles cc), pastille des contrôles → 💚 Santé.
 * @param {string} cur - Clé de la vue affichée
 */
function capNavFluxTabs(cur){
  const bar=document.getElementById('cap-flux-tabs'); if(!bar) return;
  const E=capNavEff(), it=CAP_NAV_ITEMS.find(i=>i.k===cur), G=it&&it.m&&CAP_NAV_ITEMS.find(i=>i.k===it.m);
  bar.style.display=G?'flex':'none';
  if(!G) return;
  _capNavLastGrp[G.k]=cur;
  const puces=G.f.map(k=>{ const i=CAP_NAV_ITEMS.find(x=>x.k===k), v=E.vides.has(k);
    return `<button class="phl-toggle-btn${k===cur?' active':''}${v?' cap-nav-vide':''}" data-open="${k}" title="${i.l}${i.t?' — '+i.t:''}${v?_L(' (absent de ce modèle)'):''}">${i.c||i.l}</button>`; }).join('');
  const cl=capNavCoucheLue(cur), fixe=CAP_NAV_COUCHE_VUE[cur];
  const couche=G.cc?`<span class="tb-grp" title="${_L('Couche commune aux vues de la famille (mémorisée d\'une vue à l\'autre)')}"><span class="tb-grp-l">${_L('Couche')}</span>`+
    [['',_L('Toutes')],...CAP_ANA_LAYERS.map(l=>[l,l])].map(([l,t])=>`<button class="cap-lf-btn${cl===l?' active':''}" data-couche="${l}"${fixe&&l!==fixe?' disabled':''}>${t}</button>`).join('')+`</span>`:'';
  // Pastille des contrôles de la vue → 💚 Santé filtrée (nombre affiché si les contrôles sont déjà calculés : pas de calcul ici)
  const C=typeof _capAnaCache!=='undefined'&&_capAnaCache.santeChecks, vk=capSanteVueCle(cur), n=C?C.filter(c=>c.view===vk&&c.n>0&&c.sev!=='info').length:-1;
  const chk=!CAP_SANTE_VUES.includes(vk)?'':`<button class="cap-lf-btn cap-nav-chk${n>0?' def':''}" onclick="capSanteOuvrir('${cur}')" title="${_L('Contrôles de cette vue dans ✅ Vérifier › 💚 Santé & contrôles')}">🩺 ${n>0?_L(`${n} contrôle(s) en défaut`):n===0?_L('Contrôles sans défaut'):_L('Contrôles')} → 💚</button>`;
  bar.innerHTML=`<span class="cap-fam-t">${G.l}</span><span class="tb-grp">${puces}</span>${couche}<span style="flex:1"></span>${chk}`;
}

/** Reconstruit les boutons de la barre des vues : boutons directs (épingles), menus, champ de recherche, niveau. */
function capNavRender(){
  const box=document.getElementById('cap-tb-views'); if(!box) return;
  const E=capNavEff(), P=E.pins;
  const tip=(l,t)=>l+(t?' — '+t:'');   // nom de la vue en infobulle (utile en icônes seules)
  const pin=k=>{ const it=CAP_NAV_ITEMS.find(i=>i.k===k); if(!it) return '';
    return `<div class="tbtn" id="cap-v-${k.replace(':','-')}" data-open="${k}" title="${tip(it.l,it.t)}">${capNavLbl(it.p||it.l, it.i)}</div>`; };   // p : libellé court du bouton épinglé
  const home=document.getElementById('cap-tb-home'); if(home) home.innerHTML=P.includes('home')?pin('home'):'';   // 🏠 Accueil : tout à gauche
  let h=['diag','table'].filter(k=>P.includes(k)).map(pin).join('');
  h+=P.filter(k=>!['home','diag','table'].includes(k)).map(pin).join('');   // épingles ajoutées par l'utilisateur
  h+='<span class="tsep"></span>';
  CAP_NAV_GROUPS.forEach(G=>{
    h+=`<div class="tbtn cap-nav-grp" id="${G.id}" data-g="${G.g}" data-dd="${G.g}" title="${tip(G.l,G.t)}">${capNavLbl(G.l)}${G.g==='revue'?'<span id="cap-nav-rev-badge" class="cw-badge" style="display:none"></span>':''}<span class="cap-nav-arr">▾</span></div>`;
  });
  h+=_L(`<label class="cap-nav-search" id="cap-nav-cfg" title="Chercher une vue, un élément du modèle ou un diagramme (Ctrl+K) ; sans texte : toutes les vues">🔍<input id="cap-nav-q" type="text" placeholder="Vue, élément, diagramme…" autocomplete="off" aria-label="Chercher une vue, un élément du modèle ou un diagramme"><kbd>Ctrl K</kbd></label>`);
  const q0=document.getElementById('cap-nav-q'), qv=q0?q0.value:'', qf=q0&&document.activeElement===q0;   // recherche en cours conservée
  box.innerHTML=h;
  capNavSearchWire();
  if(qv||qf){ const q=document.getElementById('cap-nav-q'); q.value=qv; if(qf) q.focus(); }
  const lv=document.getElementById('cap-nav-lvl');
  if(lv) lv.innerHTML=_L(`<button type="button" data-lvl="essentiel" class="${E.mode==='essentiel'?'active':''}" title="Les vues les plus utilisées ; les vues avancées restent accessibles par la recherche">Essentiel</button><button type="button" data-lvl="complet" class="${E.mode==='complet'?'active':''}" title="Toutes les vues, dont REC / RPL, catégories d'échanges, bibliothèques et scripts">Complet</button>`);
  capNavFit();   // ⚙ icônes seules (choisies, ou automatiques si la barre déborde) : libellés .tb-lbl masqués (CSS)
  if(typeof _capRev!=='undefined'&&_capRev) capRevBadge();   // badge des commentaires sur 💬 Revue & documents (55, chargé après ce module)
  capNavSync();
}

/** Met à jour l'état actif des boutons de la barre (vue affichée, menu qui la contient).
 * @param {boolean} [force] - Ignorer le mode courant (voir capNavCurKey)
 */
function capNavSync(force){
  if(typeof _capNav==='undefined') return;   // appelé avant le chargement de ce module
  const cur=capNavCurKey(force), it=CAP_NAV_ITEMS.find(i=>i.k===cur), E=capNavEff();
  document.querySelectorAll('#cap-tb-views [data-open],#cap-tb-home [data-open]').forEach(b=>b.classList.toggle('active',b.dataset.open===cur||(!!it&&b.dataset.open===it.m)));
  document.querySelectorAll('#cap-tb-views .cap-nav-grp').forEach(b=>{
    const on=!!it&&it.g===b.dataset.g&&!E.pins.includes(cur)&&!(it.m&&E.pins.includes(it.m));
    b.classList.toggle('active',on);
    const G=CAP_NAV_GROUPS.find(x=>x.g===b.dataset.g);
    b.title=(it&&it.g===b.dataset.g?_L('Vue affichée : ')+it.l+'\n':'')+(_capNav.icons?G.l+' — ':'')+G.t;
  });
  capNavFluxTabs(cur);
  // Onglets de 🔬 Analyses et de ƒ Fonctions : sous-vues du mode Complet masquées en Essentiel (sauf celle affichée)
  document.querySelectorAll('#cap-view-analyses [data-an],#cap-view-functions [data-an]').forEach(b=>{
    const k=b.dataset.an==='fns'?'functions':'ana:'+b.dataset.an;
    b.classList.toggle('cap-pref-hide',E.hide.has(k)&&k!==cur); });
}

/** Ferme le menu déroulant de la barre des vues. */
function capNavClose(){
  const dd=document.getElementById('cap-nav-dd'); if(dd) dd.style.display='none';
  const q=document.getElementById('cap-nav-q'); if(q&&document.activeElement!==q) q.value='';   // 🔍 recherche terminée
  document.querySelectorAll('[aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));   // ♿ menus refermés
}

/** Ligne d'une vue dans un menu : ouverture au clic, 📌 pour l'épingler en bouton direct.
 * @param {Object} it - Élément de CAP_NAV_ITEMS
 * @param {string} [extra] - Texte complémentaire (groupe, en recherche)
 * @returns {string} HTML
 */
function capNavRow(it, extra){
  const E=capNavEff(), on=E.pins.includes(it.k), cur=capNavCurKey()===it.k, vide=E.vides.has(it.k), hid=vide||E.hide.has(it.k);
  return `<div class="ctx-i cap-nav-it${cur?' cur':''}${hid?' cap-nav-hid':''}" data-open="${it.k}" title="${it.t||''}"><span>${it.l}${extra?` <span class="cap-nav-g">${extra}</span>`:''}${vide?_L(' <span class="cap-nav-g">(absent de ce modèle)</span>'):hid?_L(' <span class="cap-nav-g">(mode Complet)</span>'):''}</span>`+
    (it.k[0]==='@'?'':`<span class="cap-nav-pin${on?' on':''}" data-pin="${it.k}" title="${on?_L('Retirer de la barre'):_L('Épingler dans la barre (bouton direct)')}">📌</span>`)+`</div>`;
}

/** Ouvre le menu déroulant d'un groupe, d'une commande de droite (Fichier, Aide, ⚙…) ou de la recherche (☰ : résultats
 * du champ 🔍 de la barre, ou toutes les vues sans texte).
 * @param {string} g - Groupe ('arch'|'verif'|'revue'), menu ('file'|'help'|'prefs'|'theme') ou '☰'
 * @param {HTMLElement} anchor - Bouton sous lequel placer le menu
 */
function capNavMenu(g, anchor){
  let dd=document.getElementById('cap-nav-dd');
  if(!dd){
    dd=document.createElement('div'); dd.id='cap-nav-dd'; document.body.appendChild(dd);
    dd.addEventListener('click',e=>{
      const p=e.target.closest('[data-pin]');
      if(p){ e.stopPropagation(); capNavTogglePin(p.dataset.pin); capNavMenuFill(); return; }
      const pi=e.target.closest('[data-picons]');
      if(pi){ capNavClose(); capPrefSetIcons(pi.dataset.picons==='1'); return; }
      const lv=e.target.closest('[data-lvl]');
      if(lv){ capNavSetMode(lv.dataset.lvl); capNavMenuFill(); return; }
      const pal=e.target.closest('[data-pal]'); if(pal){ capPalOpen(pal.dataset.pal, pal.dataset.id); return; }   // élément ou diagramme (67)
      const o=e.target.closest('[data-open]'); if(o){ capNavOpen(o.dataset.open); return; }
      const th=e.target.closest('[data-thm]');
      if(th){ capNavClose(); const sel=document.getElementById('theme-sel'); sel.value=th.dataset.thm; sel.dispatchEvent(new Event('change')); return; }
      const a=e.target.closest('[data-act]');
      if(a){ capNavClose(); ({open:()=>capPickCapellaFile(), folder:()=>capOpenProjectFolder(), projet:()=>capProjetPagePick(), save:()=>capSavePageDirect(false), saveas:()=>capSavePageDirect(true),
        page:()=>capSaveFullPage(), themeedit:()=>capThemeEditor(), update:()=>capCfgLoadUpdate(), cfgsave:()=>capCfgDialog('save'), cfgload:()=>capCfgLoadFile(),
        watch:()=>setTimeout(()=>capWatchMenu(true),0),   // 🔄 Suivi du fichier (40) : après la fermeture de ce menu par le même clic
        help:()=>openHelpModal(), prefs:()=>capPrefDialog(), autosave:()=>capPrefDialog('save'), checks:()=>capChkDialog(), xport:()=>capExportToggle(), xlsx:()=>capXlsxClasseur(),
        theme:()=>capNavMenu('theme', document.getElementById('b-prefs')), tour:()=>capTourStart(), tourview:()=>capTourStartView(), tourrev:()=>capTourRevue(), tourscr:()=>capTourScripts(), about:()=>capAboutOpen()})[a.dataset.act](); return; }
      if(e.target.closest('[data-reset]')){ const keep=['auto','icons','watch','xport','vides'].filter(k=>_capNav[k]!==undefined).map(k=>[k,_capNav[k]]);
        _capNav=JSON.parse(JSON.stringify(CAP_NAV_DEFAULT)); keep.forEach(([k,v])=>_capNav[k]=v);   // ⚙ enregistrement, style, suivi, exports conservés
        capNavSave(); capNavRender(); capNavMenuFill(); }
    });
  }
  if(dd.style.display!=='none'&&dd.dataset.g===g&&g!=='☰'){ capNavClose(); return; }
  dd.dataset.g=g;
  if(anchor&&anchor.setAttribute){ anchor.setAttribute('aria-haspopup','true'); anchor.setAttribute('aria-expanded','true'); }   // ♿
  dd.innerHTML='<div id="cap-nav-res"></div>';
  capNavMenuFill();
  dd.style.display='block';
  const r=anchor.getBoundingClientRect(), w=dd.offsetWidth;
  dd.style.top=(r.bottom+4)+'px';
  dd.style.left=Math.max(8,Math.min(r.left, window.innerWidth-w-8))+'px';
}

/** Branche le champ 🔍 de la barre : saisie = résultats dans le menu ☰, flèches pour choisir, Entrée pour ouvrir. */
function capNavSearchWire(){
  const q=document.getElementById('cap-nav-q'); if(!q||q._wired) return;
  q._wired=true;
  const open=()=>{ const dd=document.getElementById('cap-nav-dd');
    if(!dd||dd.style.display==='none'||dd.dataset.g!=='☰') capNavMenu('☰', document.getElementById('cap-nav-cfg')); else capNavMenuFill(); };
  q.addEventListener('focus',open);
  q.addEventListener('input',open);
  q.addEventListener('keydown',e=>{
    const dd=document.getElementById('cap-nav-dd'); if(!dd||dd.style.display==='none'){ if(e.key==='ArrowDown') open(); return; }
    const rows=[...dd.querySelectorAll('#cap-nav-res [data-open],#cap-nav-res [data-pal]')], i=rows.findIndex(r=>r.classList.contains('hl'));
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!rows.length) return;
      const n=(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;
      rows.forEach((r,j)=>r.classList.toggle('hl',j===n)); rows[n].scrollIntoView({block:'nearest'}); }
    else if(e.key==='Enter'){ const r=rows[i<0?0:i]; if(r){ q.value=''; q.blur(); if(r.dataset.pal) capPalOpen(r.dataset.pal, r.dataset.id); else capNavOpen(r.dataset.open); } }
    else if(e.key==='Escape'){ q.value=''; capNavClose(); q.blur(); }
  });
}

/** Remplit le menu ouvert : vues du groupe, ou (menu ☰) réglage complet ou résultats de la recherche. */
function capNavMenuFill(){
  const dd=document.getElementById('cap-nav-dd'), res=dd&&dd.querySelector('#cap-nav-res'); if(!res) return;
  const g=dd.dataset.g;
  if(g==='file'){
    const sc=s=>` <span class="cap-nav-g">${s}</span>`;
    res.innerHTML=_L(`<div class="ctx-i" data-act="open" title="Remplace le modèle affiché par un autre fichier .capella">🔷 Ouvrir un modèle Capella…</div>
      <div class="ctx-i" data-act="folder" title="Ouvre le dossier du projet : le .capella et ses diagrammes (.aird) sont chargés ensemble">📁 Ouvrir le dossier du projet…</div>
      <div class="ctx-i" data-act="projet" title="Reprend un projet de travail enregistré en page HTML (💾), même par une version précédente d'Arcalyse (à partir de la 2.1) : modèle, diagrammes, revue, accueil, vues et réglages">📄 Ouvrir un projet de travail (page HTML)…</div>
      <div class="cap-nav-hint">Nouvelle version d'Arcalyse ? Ouvrez-y la page de votre projet enregistrée avec l'ancienne : tout le travail est repris.</div>
      <div class="ctx-i" data-act="update" title="Compare un autre fichier .capella au modèle affiché, montre le delta, puis met à jour l'affichage après validation">🔄 Charger une mise à jour du modèle…</div>
      <div class="cap-nav-hint">Mise à jour : delta affiché avant validation ; alerte si les deux fichiers semblent être des projets différents. Diagrammes chargés : le .aird est relu s'il a été ouvert avec un accès direct (dossier du projet), sinon le .aird à jour est demandé.</div>`)+
      (capLoaded?_L(`<div class="ctx-i" data-act="watch" title="Détecter les nouvelles versions du fichier .capella, voir le delta, historique des mises à jour">🔄 Suivi du fichier…${_capWatch.pending?` <span class="cw-badge">${_capWatch.pending.versions.length}</span>`:''}</div>`):'')+
      _L(`<div class="cw-m-sep"></div>
      <div class="ctx-i" data-act="save" title="Page HTML autonome : modèle + interface et vues">💾 Enregistrer${sc(_L('Ctrl+S'))}</div>
      <div class="ctx-i" data-act="saveas">💾 Enregistrer sous…${sc(_L('Ctrl+Maj+S'))}</div>
      <div class="ctx-i" data-act="page" title="Télécharger la page actuelle (avec le fichier Capella déjà chargé) en HTML autonome">🌐 Télécharger la page HTML</div>
      <div class="ctx-i" data-act="xlsx" title="Un classeur .xlsx, une feuille par analyse : éléments, fonctions, échanges, composants, liens, chaînes, exigences, statuts de revue, contrôles, santé">📗 Classeur Excel des analyses</div>
      <div class="cap-nav-hint">La page HTML enregistrée contient : <b>le modèle chargé</b> et ses diagrammes (.aird), 🏠 l'accueil (fiche projet, check-lists, plans de revue, tableaux blancs), la barre des vues (menus, épingles), les tableaux de bord, les onglets et colonnes du ▤ Tableau, le thème, les règles de nommage et les commentaires de 💬 Revue.<br>Non conservés : la version chargée pour ⚖ Comparaison, les filtres des autres vues.</div>
      <div class="cw-m-sep"></div>
      <div class="ctx-i" data-act="cfgsave" title="Fichier .json sans le modèle : barre, tableaux de bord, ▤ Tableau, thème, règles de nommage (au choix)">⚙ Enregistrer l'interface et les vues…</div>
      <div class="ctx-i" data-act="cfgload" title="Applique un fichier .json d'interface (au choix des parties)">⚙ Charger une interface et des vues…</div>
      <div class="cap-nav-hint">Pour réutiliser vos réglages avec un autre modèle ou une nouvelle version de la page.</div>`);
    return;
  }
  if(g==='help'){
    const v=capTourCtx();
    res.innerHTML=_L(`<div class="ctx-i" data-act="help">📖 Aide complète</div>
      <div class="ctx-i" data-act="tour" title="Découvrir l'interface pas à pas">🎓 Visite guidée</div>`)+
      (v?_L(`<div class="ctx-i" data-act="tourview" title="Présente les menus et les commandes de la vue affichée">🎯 Visite de cette vue <span class="cap-nav-g">${v.l}</span></div>`)
        :_L(`<div class="cap-nav-hint">🎯 Chargez un modèle pour la visite de chaque vue.</div>`))+
      _L(`<div class="ctx-i" data-act="tourrev" title="Présente le panneau 💬 Revue : commentaires, vérification, rapport, revue ciblée, fenêtre séparée">💬 Visite de la revue</div>`)+
      (capLoaded?_L(`<div class="ctx-i" data-act="tourscr" title="Présente la console 📜 Scripts : bibliothèque, éditeur, exécution, sortie">📜 Visite des scripts</div>`):'')+
      _L(`<div class="cw-m-sep"></div><div class="ctx-i" data-act="about" title="Version, auteur, licence, composants tiers, informations techniques">ℹ À propos</div>`);
    return;
  }
  if(g==='prefs'){ res.innerHTML=capPrefMenuHtml(); return; }
  if(g==='theme'){
    const sel=document.getElementById('theme-sel');
    res.innerHTML=[...sel.options].map(o=>`<div class="ctx-i cap-nav-it${o.value===sel.value?' cur':''}" data-thm="${o.value}"><span>${o.textContent}</span></div>`).join('')+
      _L(`<div class="cw-m-sep"></div><div class="ctx-i" data-act="themeedit" title="Créer ou modifier un thème personnalisé (toutes les couleurs)">🎨 Personnaliser…</div>`);
    return;
  }
  if(g!=='☰'){ const E=capNavEff(), all=CAP_NAV_ITEMS.filter(i=>i.g===g&&!i.m), its=all.filter(i=>!E.hide.has(i.k));   // vues d'une famille : dans sa barre
    const n=all.filter(i=>i.x&&E.hide.has(i.k)).length, nv=all.filter(i=>!i.x&&E.vides.has(i.k)&&E.hide.has(i.k)).length;
    res.innerHTML=capNavSections(its)+(n?_L(`<div class="ctx-i cap-nav-more" data-lvl="complet" title="Afficher toutes les vues dans les menus">➕ ${n} vue(s) avancée(s) en mode Complet</div>`):'')+
    (nv?_L(`<div class="cap-nav-hint">${nv} vue(s) sans données dans ce modèle, retirée(s) du menu (⚙ Préférences › Affichage).</div>`):'')+
    _L(`<div class="cap-nav-hint">📌 épingle une vue en bouton direct dans la barre.</div>`); return; }
  const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const q=norm((document.getElementById('cap-nav-q')||{}).value||'').trim();
  const gl=x=>(CAP_NAV_GROUPS.find(G=>G.g===x)||{}).l||'';
  if(q){
    const hit=CAP_NAV_ITEMS.filter(i=>q.split(/\s+/).every(w=>norm(i.l+' '+gl(i.g)+' '+(i.s||'')+' '+(i.t||'')).includes(w)));
    const inName=i=>q.split(/\s+/).every(w=>norm(i.l).includes(w)); hit.sort((a,b)=>inName(b)-inName(a));   // le nom de la vue prime sur l'info-bulle
    const pal=capPalHtml(q);   // éléments du modèle et diagrammes (67)
    res.innerHTML=(hit.length?(pal?_L('<div class="cap-nav-h">Vues</div>'):'')+hit.map(i=>capNavRow(i,gl(i.g))).join(''):'')+pal
      ||_L('<div class="cap-nav-hint">Aucune vue, aucun élément ni diagramme ne correspond.</div>');
    res.querySelector('[data-open],[data-pal]')?.classList.add('hl');
    return;
  }
  let h=capPalRecentHtml();   // 🕘 derniers éléments / diagrammes ouverts par la palette (67)
  h+=_L('<div class="cap-nav-h">Boutons directs</div>')+CAP_NAV_ITEMS.filter(i=>!i.g).map(i=>capNavRow(i)).join('');
  CAP_NAV_GROUPS.forEach(G=>{ h+=`<div class="cap-nav-h">${G.l}</div>`+capNavSections(CAP_NAV_ITEMS.filter(i=>i.g===G.g), true); });
  h+=_L(`<div class="cw-m-sep"></div><div class="ctx-i" data-reset="1">↺ Rétablir la barre par défaut</div>
    <div class="cap-nav-hint">📌 = bouton direct dans la barre. Les vues du mode Complet restent accessibles ici et par la recherche. Réglage enregistré avec la 💾 Page HTML.</div>`);
  res.innerHTML=h;
}

/** Lignes d'un menu rangées par section (intertitre à chaque changement de section).
 * @param {Object[]} its - Éléments de CAP_NAV_ITEMS, dans l'ordre du catalogue
 * @param {boolean} [sub] - Intertitres secondaires (dans la liste complète du menu ☰)
 * @returns {string} HTML
 */
function capNavSections(its, sub){
  let h='', s=null;
  its.forEach(i=>{ if((i.s||'')!==s){ s=i.s||''; if(s) h+=`<div class="cap-nav-s${sub?' sub':''}">${s}</div>`; } h+=capNavRow(i); });
  return h;
}

// Câblage : clics de la barre (délégation), fermeture du menu, raccourci Ctrl+K
(function(){
  const box=document.getElementById('cap-tb-views'); if(!box) return;
  document.getElementById('cap-tb-home')?.addEventListener('click',e=>{ const o=e.target.closest('[data-open]'); if(o) capNavOpen(o.dataset.open); });
  box.addEventListener('click',e=>{
    const dd=e.target.closest('[data-dd]'); if(dd){ e.stopPropagation(); capNavMenu(dd.dataset.dd, dd.closest('.cap-nav-grp')); return; }
    const o=e.target.closest('[data-open]'); if(o){ capNavOpen(o.dataset.open); return; }
  });
  // Niveau Essentiel / Complet
  document.getElementById('cap-nav-lvl')?.addEventListener('click',e=>{ const b=e.target.closest('[data-lvl]'); if(b) capNavSetMode(b.dataset.lvl); });
  // Menus 📁 Fichier, ❓ Aide et ⚙ (partie droite de la barre), onglets de section
  ['b-file-menu','b-theme-menu','b-help','b-prefs'].forEach(id=>document.getElementById(id)?.addEventListener('click',e=>{
    e.stopPropagation(); capNavMenu(e.currentTarget.dataset.dd, e.currentTarget); }));
  document.getElementById('cap-flux-tabs')?.addEventListener('click',e=>{
    const c=e.target.closest('[data-couche]'); if(c){ capNavCoucheSet(c.dataset.couche, capNavCurKey()); return; }
    const o=e.target.closest('[data-open]'); if(!o) return;
    const k=o.dataset.open, it=CAP_NAV_ITEMS.find(i=>i.k===k), G=it&&CAP_NAV_ITEMS.find(i=>i.k===it.m);
    if(CAP_NAV_COUCHE_VUE[k]&&G&&G.pc){ _capNav.couche=CAP_NAV_COUCHE_VUE[k]; capNavSave(); }   // 🧱 : la puce choisit aussi la couche commune
    capNavOpen(k); if(G&&G.cc) capNavCouchePose(k); });
  document.addEventListener('mousedown',e=>{ if(!e.target.closest('#cap-nav-dd,[data-dd],#cap-nav-cfg')) capNavClose(); });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='k'||e.key==='K')){ e.preventDefault();
      const dd=document.getElementById('cap-nav-dd'), q=document.getElementById('cap-nav-q');
      if(dd&&dd.style.display!=='none'&&dd.dataset.g==='☰'){ capNavClose(); q?.blur(); } else if(q) q.focus(); }
    else if(e.key==='Escape') capNavClose();
  });
  window.addEventListener('resize',capNavClose);
  // La barre change de largeur (fenêtre, boutons affichés au chargement d'un modèle…) : icônes seules si elle déborde
  { let f=0; const tb=document.getElementById('toolbar');
    if(tb&&window.ResizeObserver) new ResizeObserver(()=>{ cancelAnimationFrame(f); f=requestAnimationFrame(capNavFit); }).observe(tb);
    window.addEventListener('resize',()=>{ cancelAnimationFrame(f); f=requestAnimationFrame(capNavFit); }); }
  capNavRender();
})();
