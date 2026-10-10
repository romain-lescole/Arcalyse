/* ══ 🎓 VISITE GUIDÉE ═══════════════════════════════════════════════════════════════
 * Didacticiel pas à pas, lancé depuis le menu ? Aide ▾ (ou l'écran d'accueil) : visite générale de l'outil, ou
 * 🎯 visite de la vue affichée (Relation Map, chaque vue Capella). Chaque étape met en
 * évidence une zone de l'interface (cadre clignotant, reste de l'écran assombri) et l'explique dans une bulle
 * avec ◀ Précédent / Suivant ▶ et ✕ pour quitter (clavier : ← → Entrée, Échap).
 * Les étapes dont la zone n'est pas affichée (modèle non chargé, vue masquée, bouton non épinglé) sont sautées.
 */
/** Étapes de la visite générale : s = sélecteur CSS de la zone (toutes les correspondances visibles sont encadrées
 * ensemble ; one:true = la première seulement ; absent = bulle centrée), t = titre, x = texte HTML (ou fonction
 * qui le renvoie), m = 'loaded' (seulement avec un modèle chargé) ou 'empty' (seulement sans modèle),
 * pre = action préalable (ex. ouvrir une vue). */
var CAP_TOUR_STEPS=[
  {t:'🎓 Bienvenue dans Arcalyse',
   x:'Cette visite présente les principales zones de l\'outil en quelques étapes.<br>Utilisez <b>Suivant ▶</b> et <b>◀ Précédent</b> (ou les flèches du clavier) ; <b>✕</b> ou <b>Échap</b> pour quitter à tout moment.'},
  {s:'#cap-drop-zone', m:'empty', t:'🔷 Ouvrir un modèle',
   x:'Glissez-déposez un fichier <b>.capella</b> ici, ou cliquez pour le chercher. Le fichier est lu sur ce poste : rien n\'est envoyé.'},
  {s:'#cap-tb-views', t:'🧭 Barre des vues',
   x:'Toutes les vues d\'analyse du modèle sont regroupées ici, dans des menus déroulants (▾) et des boutons directs.'},
  {s:'#cap-v-elements', t:'🧭 Explorateur',
   x:'Parcourir le modèle : arborescence, cartes et index des types.'},
  {s:'#cap-v-table', t:'▤ Tableau',
   x:'Tous les éléments du modèle en tableau : onglets de vues, colonnes d\'attributs, de relations et par chemin, tri, filtres, export CSV.'},
  {s:'#cap-v-flux', t:'📡 Flux & interfaces',
   x:'Chaînes fonctionnelles, échanges et composants, Physical Link, scénarios, traçabilité des ports et liens entre éléments.'},
  {s:'#cap-v-chains', t:'⚡ Chaînes',
   x:'Les chaînes fonctionnelles du modèle, filtrables par type, couche et contenu, avec export image, PDF ou HTML.'},
  {s:'#cap-v-functions', t:'ƒ Fonctions',
   x:'Hiérarchie des fonctions, tableau, allocation aux composants, métriques, contrôles de qualité des noms et dossier imprimable.'},
  {s:'#cap-v-analyses', t:'🔬 Analyses',
   x:'ƒ Fonctions, traçabilité inter-couches, capacités & missions, modes & états, comparaison de versions, exigences, propriétés, données et contraintes.'},
  {s:'#cap-v-dashboard', t:'📐 Tableau de bord',
   x:'Composez vos propres tableaux de bord : indicateurs, graphiques et tableaux, imprimables en A4.'},
  {s:'#cap-nav-cfg', t:'☰ Toutes les vues',
   x:'Cherchez une vue par son nom (raccourci <b>Ctrl+K</b>) et réglez la barre : 📌 épingle une vue en bouton direct.'},
  {s:'#mode-rm', t:'🗺 Relation Map',
   x:'Graphe interactif des éléments et de leurs relations : zoom, dépliage, disposition, export en image.'},
  {s:'#cap-sidebar', m:'loaded', pre:()=>{ if(currentMode!=='capella') capNavOpen('cards'); }, t:'🏷 Types affichés',
   x:'Cochez les types d\'éléments à afficher dans les vues. Le champ du haut filtre la liste.'},
  {s:'#cap-sub-toolbar', m:'loaded', t:'🔍 Recherche et filtres',
   x:'Recherche plein texte, filtre par couche ARCADIA (OA, SA, LA, PA…) et export CSV / JSON de la vue affichée.'},
  {s:'#cap-content', m:'loaded', t:'▦ Zone de travail',
   x:'La vue choisie s\'affiche ici. Cliquez sur un élément pour ouvrir son panneau de détail (propriétés, relations, liens).'},
  {s:'#b-file-menu', t:'📁 Fichier',
   x:'<b>🔷 Ouvrir</b> un autre modèle (remplace l\'actuel) · <b>🔄 Charger une mise à jour</b> du modèle (delta puis validation, alerte si ce n\'est pas le même projet) · <b>💾 Enregistrer</b> la page HTML autonome (modèle + interface et vues) · <b>⚙ Enregistrer / Charger l\'interface et les vues</b> (fichier .json sans le modèle, pour réutiliser vos réglages).'},
  {s:'#b-save-direct', t:'💾 Enregistrer',
   x:'Enregistre directement la page avec le modèle chargé (<b>Ctrl+S</b>) ; Maj+clic pour « Enregistrer sous ».'},
  {s:'#b-cap-watch', m:'loaded', t:'🔄 Suivi du fichier',
   x:'Détecte les nouvelles versions du fichier .capella et montre ce qui a changé (delta, historique).'},
  {s:'#b-theme-menu', t:'🎨 Thème',
   x:'Choisissez un thème clair ou sombre, ou créez votre propre thème personnalisé.'},
  {s:'#b-help', t:'? Aide',
   x:'L\'aide complète et cette visite guidée restent accessibles à tout moment depuis ce menu.'},
  {t:'✅ C\'est parti !',
   x:'La visite est terminée. Vous pouvez la relancer depuis <b>? Aide ▾ → 🎓 Visite guidée</b>.<br>Dans chaque vue, <b>? Aide ▾ → 🎯 Visite de cette vue</b> présente ses menus et ce qu\'ils font.'}
];
/** Étapes communes aux sous-vues de 🧭 Explorateur (onglets, types, recherche, couches). */
var CAP_TOUR_EXPLORE=[
  {s:'#cap-elem-tabs', t:'🧭 Sous-vues de l\'Explorateur',
   x:'Trois façons de parcourir le modèle : <b>🌳 Arborescence</b> (hiérarchie), <b>▦ Cartes</b> (une carte par élément) et <b>📖 Index des types</b>. Le <b>▤ Tableau</b> a son propre bouton dans la barre.'},
  {s:'#cap-sidebar', t:'🏷 Types d\'éléments',
   x:'Types présents dans le modèle, rangés par couche ARCADIA (OA, SA, LA, PA, EPBS, transverse). Cochez ceux à afficher ; <b>Tout cocher</b>, <b>Aucun</b> et <b>Défaut</b> règlent la liste d\'un coup. La bordure droite se tire pour élargir le panneau.'},
  {s:'#cap-stat-chips', t:'📊 Répartition',
   x:'Nombre total d\'éléments du modèle et répartition par couche.'},
  {s:'#cap-search', t:'🔍 Recherche',
   x:'Filtre les éléments affichés par nom, type ou identifiant.'},
  {s:'#cap-tb-layer-grp', t:'🧱 Couches',
   x:'Limite l\'affichage à une couche ARCADIA (<b>Tous</b> pour les réafficher). <b>⬇ CSV</b> exporte les éléments affichés.'},
  {s:'#cap-result-count', t:'🔢 Résultat',
   x:'Nombre d\'éléments qui passent les filtres (types, recherche, couche).'}
];
/** Étapes communes aux vues de 📡 Flux & interfaces (onglets de navigation). */
var CAP_TOUR_FLUX={s:'#cap-flux-tabs', t:'📡 Flux & interfaces',
  x:'Ces onglets passent d\'une vue d\'interfaces à l\'autre, du fonctionnel au physique : <b>ƒ⇆ Functional Exchange</b> (fonctions), <b>🧱 System Component</b> (SA), <b>🧱 Logical Component</b> (LA), <b>🔀 Behavior Exchange</b> (PA, composants Behavior), <b>🔌 Physical Link</b> (PA, nœuds), <b>🧩 Ports</b> et <b>🔗 Liens</b> (toutes les relations du modèle). Chaque vue s\'ouvre en <b>◧ Vue Blocs</b>, le rendu façon Capella.'};
/** Rôle de chaque sous-vue de 🔬 Analyses (texte de l'étape « analyse affichée »). */
var CAP_TOUR_ANA_TXT={
  trace:'<b>🧬 Traçabilité inter-couches</b> : couverture des réalisations OA → SA → LA → PA (fonctions, composants, échanges), chemins de traçabilité et liens, avec les éléments non réalisés.',
  caps:'<b>🎯 Capacités & missions</b> : qui participe à quelle capacité ou mission (acteurs, fonctions, chaînes) et les capacités sans contenu.',
  states:'<b>🔁 Modes & états</b> : machines d\'états, transitions et éléments disponibles dans chaque mode ou état.',
  diff:'<b>⚖ Comparaison de versions</b> : chargez une autre version du fichier .capella. Le rapport classe les changements en 8 catégories (créations, suppressions, renommages, descriptions, propriétés, liens, déplacements, types), sur 4 niveaux (Synthèse → Complet), et se copie dans Word, Outlook, Teams ou Excel.',
  reqs:'<b>📑 Exigences</b> : exigences du modèle, éléments qui les satisfont et exigences non couvertes.',
  pvmt:'<b>🏷 Propriétés</b> : propriétés et valeurs (PVMT) appliquées aux éléments.',
  data:'<b>🗃 Données & interfaces</b> : classes, types de données, Exchange Items et interfaces, avec leurs utilisations.',
  cts:'<b>⛓ Contraintes</b> : contraintes du modèle et éléments contraints.'
};
/** Visite 🗺 Relation Map : si aucun élément n'est au centre du graphe, en choisit un qui donne un visuel lisible —
 * la racine de l'arborescence si son graphe compte entre 6 et 60 nœuds, sinon le premier élément très relié
 * qui tient dans cette fourchette (à défaut, le plus proche) ; le graphe est ensuite ajusté à la fenêtre. */
function capTourRmCtx(){
  if(S.ctx&&MODEL.elements.some(e=>e.id===S.ctx)) return;
  const deg={}; MODEL.relations.forEach(r=>{ deg[r.src]=(deg[r.src]||0)+1; deg[r.tgt]=(deg[r.tgt]||0)+1; });
  const cands=[...MODEL.elements.filter(e=>!e.parentEl), ...MODEL.elements.filter(e=>deg[e.id]).sort((a,b)=>deg[b.id]-deg[a.id]).slice(0,40)];
  const size=id=>{ S.ctx=id; try{ const t=buildTreeData(); return t?d3.hierarchy(t).descendants().length:0; }catch(e){ return 0; } };
  let best=null, gap=Infinity;
  for(const e of cands){ const n=size(e.id), g=n<6?6-n:n>60?n-60:0;
    if(g<gap){ gap=g; best=e; } if(!g) break; }
  S.ctx=null;
  if(best){ setCtx(best.id); setTimeout(()=>document.getElementById('b-fit')?.click(),50); }
}

/** Visites contextuelles, par vue : clé = '@rm' ou vue Capella (capCurrentView) ; l = nom de la vue,
 * steps = étapes (même format que CAP_TOUR_STEPS). */
var CAP_TOUR_VIEWS={
  '@rm':{l:'🗺 Relation Map', steps:[
    {pre:()=>capTourRmCtx(), t:'🗺 Relation Map', x:'Graphe centré sur un <b>élément de contexte</b> : ses voisins sont affichés jusqu\'à la profondeur choisie, selon les relations Capella cochées.'},
    {s:'#b-zi,#b-zo,#b-fit', t:'🔍 Zoom',
     x:'<b>＋</b> / <b>－</b> zooment (Ctrl++ / Ctrl+-), <b>⊡ Fit</b> ajuste le graphe à la fenêtre (Ctrl+W). La molette zoome aussi et le fond se déplace à la souris.'},
    {s:'#b-ea,#b-ca', t:'↕ Ouvrir / fermer tout',
     x:'Déplie ou replie tous les nœuds du graphe d\'un coup.'},
    {s:'#b-num,#b-leg,#b-rln,#b-cut,#b-compact', t:'👁 Affichage',
     x:'<b># Nums</b> numérote les relations, <b>◉ Légende</b> affiche la légende, <b>⌁ Relations</b> écrit le nom des relations sur les arêtes, <b>✂ Noms</b> coupe les noms longs, <b>⬡ Compact</b> réduit les nœuds.'},
    {s:'#b-exp-wrap', t:'🖼 Export',
     x:'Enregistre le graphe en image <b>PNG</b>, <b>JPEG</b> ou <b>SVG</b>.'},
    {s:'#sec-arbo', t:'🌳 Arborescence',
     x:'Éléments du modèle qui ont au moins une relation, à leur place hiérarchique (chaînes comprises). <b>Clic</b> = recentrer le graphe sur l\'élément ; le champ filtre la liste ; ⊞ / ⊟ déplient ou replient tout.'},
    {s:'#sec-disposition', t:'📐 Disposition & profondeur',
     x:'Profondeur de voisinage (1 à 10) et disposition du graphe : → LR, ↓ TB, ← RL, ◉ radiale, ⚡ zigzag.'},
    {s:'#sec-rel', t:'🔗 Critères de relation',
     x:'Cochez les types de relations Capella à suivre (allocation, échanges, liens physiques, chaînes…) ; les groupes se cochent en bloc.'},
    {s:'#sec-typ', t:'🏷 Types d\'éléments',
     x:'Types affichés dans le graphe, avec la couleur de leur couche ARCADIA.'},
    {s:'#sec-props', t:'📝 Propriétés',
     x:'Attributs de l\'élément sélectionné dans le graphe.'},
    {s:'#graph', t:'🕸 Graphe',
     x:'<b>Clic</b> sur un nœud : sélection et propriétés · <b>double-clic</b> : il devient le contexte · <b>clic droit</b> : menu (éditer, masquer, relation…) · <b>survol</b> : ses voisins restent en évidence.'},
    {s:'#legend', t:'◉ Légende', x:'Couleurs des types et des relations affichés.'},
    {s:'#panel-close-btn', t:'◀ Panneau', x:'Réduit le panneau de gauche pour agrandir le graphe ; ▶ le rouvre.'}
  ]},
  cards:{l:'▦ Cartes', steps:[...CAP_TOUR_EXPLORE,
    {s:'#cap-view-cards', t:'▦ Cartes',
     x:'Une carte par élément, regroupées par couche : type, nom et identifiant. <b>Clic</b> sur une carte : panneau de détail (propriétés, relations, liens).'}]},
  tree:{l:'🌳 Arborescence', steps:[CAP_TOUR_EXPLORE[0], CAP_TOUR_EXPLORE[1],
    {s:'#cap-tree-bar', t:'🌳 Commandes', x:'<b>🔍 Recherche</b> par nom ou type. <b>🌳 Arbre</b> : les résultats restent dans leurs conteneurs, grisés quand ils ne correspondent pas ; <b>☰ Liste</b> : liste à plat triée par nom avec le chemin des conteneurs (300 lignes au plus). <b>⊞ Déplier</b> / <b>⊟ Réduire</b> toute l\'arborescence, <b>⬇ JSON</b> l\'exporte.'},
    {s:'#cap-view-tree', t:'🌳 Arborescence', x:'Hiérarchie du modèle comme dans Capella. ▶ déplie un nœud ; clic sur un élément pour ouvrir son détail.'}]},
  table:{l:'▤ Tableau', steps:[
    {s:'#cap-sidebar', t:'🏷 Types de l\'onglet', x:'Types d\'éléments listés dans le tableau, propres à l\'onglet affiché (indépendants des autres vues et des autres onglets). Un nouvel onglet n\'a aucun type coché.'},
    CAP_TOUR_EXPLORE[CAP_TOUR_EXPLORE.length-1],
    {s:'#cap-table-tabs', t:'🗂 Onglets', x:'Chaque onglet garde sa propre vue : types cochés, 🎯 portée, colonnes et leur ordre, filtres, largeurs, tri. <b>+</b> ajoute un onglet (copie des colonnes affichées, sans type coché) ; double-clic pour le renommer ; ✕ le ferme.'},
    {s:'#cap-table-toolbar', t:'🧰 Commandes du tableau',
     x:'<b>⊞ Colonnes</b> choisit les colonnes : calculées, par chemin, attributs du fichier et <b>relations</b> (→ cibles / ← sources). <b>🎯 Portée</b> limite les lignes au contenu d\'éléments choisis (paquetages, couches, composants…). <b>✨ Colonne par chemin</b> en calcule une en suivant des relations (metachain), avec aperçu en direct. <b>≡ En ligne</b> règle les cellules multiples, <b>⬇ CSV</b> exporte les colonnes affichées, <b>💾 Sauver vue</b> / <b>📂 Charger vue</b> gardent la configuration de l\'onglet, <b>↺ Réinitialiser</b> revient au départ.'},
    {s:'#cap-table-head', t:'↕ En-têtes', x:'<b>Clic</b> sur un titre : tri ▲, puis ▼, puis sans tri. <b>Glisser</b> un titre sur un autre : change l\'ordre des colonnes. Le champ <i>Filtrer…</i> filtre la colonne ; le bord droit d\'un titre se tire pour la largeur.'},
    {s:'#cap-pagination', t:'📄 Pages', x:'Navigation de page en page et nombre de lignes par page.'}]},
  index:{l:'📖 Index des types', steps:[CAP_TOUR_EXPLORE[0],
    {s:'#cap-view-index input.inp', t:'🔍 Recherche', x:'Cherche un type par son nom technique, son nom lisible ou sa description.'},
    {s:'#cap-index-thead', t:'↕ Tri', x:'Clic sur un titre de colonne pour trier (nom, nombre d\'éléments…).'},
    {s:'#cap-index-tbody', t:'📖 Types', x:'Chaque type présent dans le modèle : nom lisible, nombre d\'éléments et description ARCADIA.'}]},
  links:{l:'🔗 Liens', steps:[CAP_TOUR_FLUX,
    {t:'🔗 Liens', x:'Toutes les relations entre éléments du modèle, classées par nature : décomposition, allocation, échanges, réalisation inter-couches, capacités, chaînes.'},
    {s:'#cap-view-links .cap-lf-q', t:'🔍 Recherche', x:'Filtre les liens par élément, échange ou identifiant.'},
    {s:'#cap-view-links .cap-lf-glab,#cap-view-links .cap-lf-btn', t:'🔗 Relations', x:'Clic sur une relation pour n\'afficher qu\'elle ; le libellé de gauche sélectionne tout le groupe. Le nombre de liens est indiqué sur chaque bouton.'},
    {s:'#cap-view-links .cap-lf-csv', t:'⬇ Export', x:'Exporte les liens affichés en CSV (la case voisine ajoute les identifiants).'},
    {s:'#cap-view-links .cap-link-table', one:true, t:'📋 Tableau des liens', x:'Source → cible pour chaque lien. Clic sur un élément pour ouvrir son détail.'}]},
  chains:{l:'⚡ Chaînes', steps:[
    {t:'⚡ Chaînes', x:'Chaînes fonctionnelles, processus opérationnels et chemins physiques du modèle, avec leur diagramme.'},
    {s:'#cap-view-chains [data-cf]', t:'🏷 Type', x:'Filtre par type de chaîne.'},
    {s:'#cap-view-chains [data-sv]', t:'🖼 Présentation', x:'<b>▦ Diagrammes</b> : une carte dépliable par chaîne · <b>🗺 Vue Relation Map</b> : graphe interactif.'},
    {s:'#cap-view-chains [data-lf]', t:'🧱 Catégorie', x:'Filtre par couche ARCADIA.'},
    {s:'#cap-view-chains [data-ef],#cap-view-chains [data-chsort]', t:'🧹 Contenu et tri', x:'<b>Vides</b> : chaînes sans fonction ni échange (à compléter). Tri par nombre de fonctions.'},
    {s:'#cap-view-chains .cap-chain-legend', t:'🎨 Légende', x:'Couleur des fonctions selon qu\'elles sont portées par un acteur, par le système ou non allouées.'},
    {s:'#cap-view-chains .cap-chx-bar', t:'📦 Export groupé', x:'Cochez des chaînes (aucune = toutes celles affichées) puis exportez-les en <b>PDF</b>, <b>ZIP</b> d\'images PNG ou SVG, ou <b>HTML</b>. Les cases règlent le contenu (cadre, cartouche, légende, description, annexes), la liste ×1 / ×2 la résolution.'},
    {s:'#cap-view-chains .cap-chain-card', one:true, t:'▦ Carte de chaîne', x:'Clic pour déplier le diagramme : fonctions, échanges, entrées / sorties. Le bouton 🗺 l\'ouvre dans la Relation Map.'},
    {s:'#cap-chainmap-wrap', t:'🗺 Vue Relation Map', x:'Graphe interactif de la chaîne choisie : dispositions, zoom et export.'}]},
  compex:{l:'🔀 Behavior Exchange', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-compex .cap-mx-hint', t:'🎯 Périmètre', x:'Component Exchanges de la couche PA entre Physical Components Behavior, ou entre un Behavior et un acteur (nœud) qui lui est relié. Les échanges SA et LA sont dans 🧱 System / Logical Component, les liens entre nœuds dans 🔌 Physical Link.'},
    {s:'#cap-view-compex .phl-toggle-btn', t:'🖼 Présentation', x:'<b>◧ Vue Blocs</b> (par défaut) : composants Behavior dessinés comme dans Capella (bleu = système, bleu clair = acteur ; ports UNSET / IN / OUT / INOUT) · <b>≡ Vue Ligne</b> : un échange par ligne · <b>▣ Vue Composant</b> : regroupé par composant · <b>▦ Matrice</b> : composant × composant · <b>🩺 Contrôles</b> : anomalies détectées.'},
    {s:'#cap-view-compex .ana-ak', t:'🧩 Nature (Vue Blocs)', x:'Système ou acteurs (double-clic : uniquement ceux-ci), ou un composant et ses sous-composants ; « avec ports » masque les conteneurs.'},
    {s:'#cap-view-compex #cb-main', t:'◧ Blocs', x:'Chaque composant Behavior avec ses Component Ports (UNSET plein, IN / OUT avec chevron, INOUT vide), l\'échange et le composant distant (clic : aller à son bloc) ; « ƒ n fonctions ▾ » déplie les fonctions allouées (clic : son bloc dans ƒ⇆ Functional Exchange).'},
    {s:'#cex-counter', t:'🔢 Compteur', x:'Échanges affichés après filtres / total.'},
    {s:'#cap-view-compex .cex-dir-btn,#cex-kind-sel', t:'⇄ Sens et nature', x:'Filtre par sens de l\'échange (orienté, inversé, bidirectionnel) et par nature (FLOW…).'},
    {s:'#cex-node-input,#cex-name-input', t:'🔍 Filtres', x:'Par composant, ou par nom d\'échange, d\'échange fonctionnel ou d\'Exchange Item.'},
    {s:'#cex-exp-csv,#cex-exp-html,#cex-exp-html-all', t:'⬇ Exports', x:'CSV de la vue, rapport HTML de la vue, ou rapport HTML autonome avec toutes les vues.'},
    {s:'#cex-main', t:'📋 Résultat', x:'Clic sur un composant ou un échange pour ouvrir son détail.'}]},
  csys:{l:'🧱 System Component', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-csys .phl-toggle-btn', t:'🖼 Présentation', x:'<b>◧ Vue Blocs</b> : System Components dessinés comme dans Capella (bleu = système, bleu clair = acteur ; ports UNSET plein, IN / OUT avec chevron, INOUT vide ; clic sur un composant distant = aller à son bloc) · <b>▣ Vue Composant</b> : échanges par composant · <b>≡ Vue Ligne</b> · <b>▦ Matrice</b> · <b>🩺 Contrôles</b>.'},
    {s:'#cap-view-csys #cb-counter', t:'🔢 Compteur', x:'Composants (ou échanges) affichés après filtres / total (SA uniquement). Les listes sont paginées par 100.'},
    {s:'#cap-view-csys .ana-ak', t:'🧩 Nature', x:'Système ou acteurs (double-clic : uniquement ceux-ci), ou un composant et tous ses sous-composants.'},
    {s:'#cap-view-csys #cb-csv,#cap-view-csys #cb-html,#cap-view-csys #cb-html-all', t:'⬇ Exports', x:'CSV (ports ou échanges), rapport HTML de la vue ou de toutes les vues.'},
    {s:'#cap-view-csys #cb-main', t:'📋 Résultat', x:'Clic sur un nom pour ouvrir son détail ; clic sur un composant distant pour aller à son bloc ou à sa carte ; « ƒ n fonctions ▾ » déplie les fonctions allouées (clic : son bloc dans ƒ⇆ Functional Exchange).'}]},
  cblk:{l:'🧱 Logical Component', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-cblk .phl-toggle-btn', t:'🖼 Présentation', x:'<b>◧ Vue Blocs</b> : Logical Components dessinés comme dans Capella (bleu = système, bleu clair = acteur ; ports UNSET plein, IN / OUT avec chevron, INOUT vide ; clic sur un composant distant = aller à son bloc) · <b>▣ Vue Composant</b> : échanges par composant · <b>≡ Vue Ligne</b> · <b>▦ Matrice</b> · <b>🩺 Contrôles</b>.'},
    {s:'#cap-view-cblk #cb-counter', t:'🔢 Compteur', x:'Composants (ou échanges) affichés après filtres / total (LA uniquement). Les listes sont paginées par 100.'},
    {s:'#cap-view-cblk .ana-ak', t:'🧩 Nature', x:'Système ou acteurs (double-clic : uniquement ceux-ci), ou un composant et tous ses sous-composants.'},
    {s:'#cap-view-cblk #cb-csv,#cap-view-cblk #cb-html,#cap-view-cblk #cb-html-all', t:'⬇ Exports', x:'CSV (ports ou échanges), rapport HTML de la vue ou de toutes les vues.'},
    {s:'#cap-view-cblk #cb-main', t:'📋 Résultat', x:'Clic sur un nom pour ouvrir son détail ; clic sur un composant distant pour aller à son bloc ou à sa carte ; « ƒ n fonctions ▾ » déplie les fonctions allouées (clic : son bloc dans ƒ⇆ Functional Exchange).'}]},
  fex:{l:'ƒ⇆ Functional Exchange', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-fex .phl-toggle-btn', t:'🖼 Présentation', x:'<b>◧ Vue Blocs</b> : fonctions dessinées comme dans Capella (vert = système, bleu = acteur, gris = non allouée ; pins d\'entrée verts à gauche, de sortie orange à droite ; clic sur une fonction distante = aller à son bloc) · <b>≡ Vue Ligne</b> : un échange par ligne · <b>▣ Vue Fonction</b> : regroupé par fonction · <b>▦ Matrice</b> fonction × fonction · <b>🩺 Contrôles</b>.'},
    {s:'#cap-view-fex .ana-ak', t:'🧩 Allocation', x:'Fonctions du système, des acteurs ou non allouées (double-clic : uniquement celles-ci), ou d\'un allocataire précis : acteur, système ou sous-système (sous-composants compris) ; en OA, entités et acteurs opérationnels.'},
    {s:'#fex-counter', t:'🔢 Compteur', x:'Échanges (ou fonctions en Vue Blocs) affichés après filtres / total. Les listes sont paginées par 100.'},
    {s:'#cap-view-fex .fex-layer-btn', t:'🧱 Couche', x:'Filtre par couche ARCADIA (OA, SA, LA, PA).'},
    {s:'#fex-fn-input,#fex-name-input', t:'🔍 Filtres', x:'Par fonction, ou par nom d\'échange ou d\'Exchange Item.'},
    {s:'#fex-exp-csv,#fex-exp-html,#fex-exp-html-all', t:'⬇ Exports', x:'CSV de la vue, rapport HTML de la vue (toutes les pages), ou rapport HTML autonome avec toutes les vues.'},
    {s:'#fex-main', t:'📋 Résultat', x:'Clic sur une fonction ou un échange pour ouvrir son détail.'}]},
  oav:{l:'🟨 Operational Analysis', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-oav .phl-toggle-btn', t:'🖼 Présentation', x:'<b>◧ Vue Blocs</b> : activités opérationnelles dessinées comme dans Capella (blocs jaunes, interactions entrantes à gauche, sortantes à droite ; en haut, l\'entité ou l\'acteur qui porte l\'activité ; clic sur une activité distante = aller à son bloc) · <b>≡ Vue Ligne</b> · <b>▣ Vue Activité</b> · <b>▦ Matrice</b> activité × activité · <b>🩺 Contrôles</b>.'},
    {s:'#cap-view-oav .ana-ak', t:'🏢 Allocation', x:'Activités portées par une entité, par un acteur opérationnel ou non allouées (double-clic : uniquement celles-ci), ou par une entité ou un acteur précis.'},
    {s:'#cap-view-oav #fex-fn-input,#cap-view-oav #fex-name-input', t:'🔍 Filtres', x:'Par activité, ou par nom d\'interaction ou d\'Exchange Item.'},
    {s:'#cap-view-oav #fex-exp-csv,#cap-view-oav #fex-exp-html,#cap-view-oav #fex-exp-html-all', t:'⬇ Exports', x:'CSV des interactions, rapport HTML de la vue ou de toutes les vues.'},
    {s:'#cap-view-oav #fex-main', t:'📋 Résultat', x:'Clic sur une activité ou une interaction pour ouvrir son détail.'}]},
  scen:{l:'🎬 Scénarios', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-scen [data-scv]', t:'🎬 Diagramme ou contrôles', x:'<b>🎬 Diagramme</b> : diagramme de séquence du scénario choisi · <b>🩺 Contrôles</b> : scénarios vides, messages sans échange, lignes de vie sans élément, scénarios hors capacité, références introuvables.'},
    {s:'#cap-view-scen [data-scl]', t:'🧱 Couche et type', x:'Filtre par couche ARCADIA et par type : ES (Exchange Scenario), FS (Functional Scenario), OES / OAS en OA, IS (Interface Scenario).'},
    {s:'#sc-q', t:'🔍 Recherche', x:'Par nom de scénario, de capacité ou de ligne de vie.'},
    {s:'#cap-view-scen .sc-list', t:'📋 Scénarios', x:'Rangés par couche puis par capacité (clic sur 🎯 : détail de la capacité). Clic sur un scénario pour afficher son diagramme.'},
    {s:'#cap-view-scen .sc-scroll', t:'🖼 Diagramme', x:'Redessiné à partir du modèle, façon Capella : lignes de vie (bleu clair = acteur, bleu = composant, vert = fonction), messages, barres d\'activation, fonctions (vert), états (gris clair) et modes (gris foncé), fragments combinés (ALT, OPT, LOOP, PAR…) avec leurs gardes, références « ref » (clic : ouvrir le scénario). Clic sur un élément : son détail. Les noms des lignes de vie restent visibles en haut au défilement.'},
    {s:'#cap-view-scen [data-sce]', t:'⬇ Exports', x:'Image PNG, SVG, ou copie de l\'image dans le presse-papiers. − / + : zoom.'}]},
  physlink:{l:'🔌 Physical Link', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-physlink .phl-toggle-btn', t:'🖼 Présentation', x:'<b>◧ Vue Blocs</b> (par défaut) : nœuds dessinés comme dans Capella (jaune = nœud du système, bleu clair = nœud acteur ; ports physiques jaunes ; clic sur un nœud distant = aller à son bloc) · <b>≡ Vue Ligne</b>, <b>▣ Vue Composant</b>, <b>▦ Matrice</b> composant × composant et <b>🩺 Contrôles</b> des liens physiques.'},
    {s:'#cap-view-physlink .ana-ak', t:'🖥 Nature (Vue Blocs)', x:'Nœuds du système ou nœuds acteurs (double-clic : uniquement ceux-ci), ou un nœud et ses sous-composants.'},
    {s:'#cap-view-physlink #cb-main', t:'◧ Blocs', x:'Chaque nœud (jaune = système, bleu clair = acteur) avec ses ports physiques jaunes, le Physical Link et le nœud distant (clic : aller à son bloc).'},
    {s:'#phl-counter', t:'🔢 Compteur', x:'Liens affichés après filtres / total.'},
    {s:'#cap-view-physlink .phl-ce-btn', t:'⇢ Component Exchange', x:'Liens qui portent (ou non) des échanges de composants alloués.'},
    {s:'#phl-node-input,#phl-name-input', t:'🔍 Filtres', x:'Par composant, ou par nom de lien ou d\'échange.'},
    {s:'#phl-exp-csv,#phl-exp-html,#phl-exp-html-all', t:'⬇ Exports', x:'CSV de la vue, rapport HTML de la vue, ou rapport HTML autonome avec toutes les vues.'},
    {s:'#phl-main', t:'📋 Résultat', x:'Clic sur un composant ou un lien pour ouvrir son détail.'}]},
  ports:{l:'🧩 Ports', steps:[CAP_TOUR_FLUX,
    {s:'#cap-view-ports .phl-toggle-btn', t:'🖼 Présentation', x:'<b>≡ Traçabilité</b> Function Port ↔ Component Port ↔ Physical Port, <b>▣ Par composant</b>, et <b>🩺 Contrôles</b> (ports non alloués, chaînes incomplètes).'},
    {s:'#prt-counter', t:'🔢 Compteur', x:'Lignes affichées après filtres / total.'},
    {s:'#prt-q', t:'🔍 Recherche', x:'Filtre par fonction, composant, port ou échange. La case voisine ne garde que les chaînes incomplètes.'},
    {s:'#prt-csv', t:'⬇ CSV', x:'Exporte le tableau affiché.'},
    {s:'#prt-main', t:'📋 Résultat', x:'Les lignes incomplètes sont signalées en couleur. Clic sur un élément pour ouvrir son détail.'}]},
  functions:{l:'ƒ Fonctions', steps:[
    {t:'ƒ Fonctions', x:'Toutes les fonctions du modèle, couche par couche : hiérarchie, allocation, traçabilité, métriques et contrôles.'},
    {s:'#cap-view-functions [data-fv]', t:'🖼 Présentation', x:'<b>🌳 Hiérarchie</b> · <b>📋 Tableau</b> façon Excel · <b>⛓ Traçabilité</b> entre couches · <b>📊 Métriques</b> · <b>🩺 Contrôles</b> (qualité des noms, fonctions non allouées…).'},
    {s:'#cap-view-functions [data-fl]', t:'🧱 Couche', x:'Choisit la couche ARCADIA étudiée (OA, SA, LA, PA).'},
    {s:'#ana-fn-q,#ana-fn-desc,#ana-fn-exp,#ana-fn-col', t:'🔍 Recherche et affichage', x:'Filtre par nom ou description ; affiche les descriptions ; ⊞ / ⊟ déplient ou replient la hiérarchie.'},
    {s:'#cap-view-functions .ana-ak,#ana-fn-who', t:'🎯 Allocation', x:'Fonctions allouées au système, à un acteur ou non allouées (clic : afficher / masquer, double-clic : uniquement celle-ci) ; la liste choisit un acteur ou un sous-système.'},
    {s:'#ana-fn-csv,#ana-fn-html', t:'⬇ Exports', x:'<b>⬇ CSV</b> et <b>📄 Dossier fonctionnel</b> : document HTML avec une section par fonction (description, allocation, échanges, traçabilité).'},
    {s:'#cap-view-functions .phl-filter-bar + *', one:true, t:'📋 Résultat', x:'Clic sur une fonction pour ouvrir son détail.'}]},
  analyses:{l:'🔬 Analyses', steps:[
    {s:'#cap-view-analyses [data-an]', t:'🔬 Analyses', x:'ƒ Fonctions et huit analyses du modèle : traçabilité inter-couches, capacités & missions, modes & états, comparaison de versions, exigences, propriétés, données & interfaces, contraintes.'},
    {s:'#cap-view-analyses [data-an].active', t:'🔎 Analyse affichée', x:()=>CAP_TOUR_ANA_TXT[capAnaSub]||'Analyse en cours.'},
    {s:'#ana-recalc', t:'↻ Recalculer', x:'Les résultats sont gardés en mémoire ; ce bouton les recalcule (utile après une mise à jour du modèle).'},
    {s:'#ana-box .phl-filter-bar', one:true, t:'🧰 Options', x:'Présentations, filtres et export CSV propres à l\'analyse affichée.'},
    {s:'#ana-box', t:'📋 Résultat', x:'Les tableaux se filtrent (champ <i>Filtrer…</i> sous les titres) et se redimensionnent ; clic sur un élément pour ouvrir son détail.'}]},
  dashboard:{l:'📐 Tableau de bord', steps:[
    {t:'📐 Tableau de bord', x:'Pages d\'indicateurs, graphiques et tableaux sur le modèle, à composer soi-même et à imprimer.'},
    {s:'#cap-view-dashboard .dash-tabs', t:'🗂 Pages', x:'Une page par tableau de bord ; <b>＋</b> en crée une, ✎ ou double-clic la renomme.'},
    {s:'#dash-edit', t:'✏ Modifier', x:'Passe en édition : ajouter des éléments depuis le catalogue d\'indicateurs, les configurer, déplacer et redimensionner. <b>✔ Terminer</b> pour sortir.'},
    {s:'#dash-orient,#dash-print,#dash-html', t:'🖨 Impression', x:'Format A4 portrait ou paysage, impression, ou export en page HTML autonome.'},
    {s:'#dash-json,#dash-imp', t:'⬇⬆ JSON', x:'Exporte ou importe la définition des tableaux de bord pour les réutiliser sur un autre modèle.'},
    {s:'#cap-view-dashboard .dash-scroll', t:'📐 Page', x:'Les éléments du tableau de bord, calculés sur le modèle chargé.'}]}
};
/** 🚀 Bien démarrer, 1er temps (sans modèle) : où ouvrir le fichier. Terminer la visite arme la reprise (2e temps). */
var CAP_TOUR_START=[
  {t:'🚀 Bien démarrer',
   x:'Deux temps pour bien démarrer :<br><b>1.</b> ouvrir votre modèle Capella ;<br><b>2.</b> une fois le modèle ouvert, savoir où trouver l\'aide et les tutoriels.'},
  {s:'#cap-drop-zone', m:'empty', t:'1 · Ouvrir un modèle Capella',
   x:'Glissez-déposez votre fichier <b>.capella</b> dans ce cadre (formats acceptés : .capella, .melodymodeller, .xml).<br>Le fichier est lu sur ce poste : rien n\'est envoyé.'},
  {s:'#cw-browse', m:'empty', t:'… ou le chercher',
   x:'Vous pouvez aussi cliquer sur <b>📂 Parcourir…</b> pour le choisir dans l\'explorateur de fichiers.'},
  {s:'#b-help, #cap-nav-dd', m:'empty', pre:()=>capTourHelpMenu(), t:'? Aide, en haut à droite',
   x:'Le menu <b>? Aide ▾</b> reste accessible à tout moment, avec ou sans modèle : <b>📖 Aide complète</b> et <b>🎓 Visite guidée</b>.<br>Une fois le modèle ouvert, il propose aussi <b>🎯 Visite de cette vue</b> pour chaque vue.'},
  {m:'empty', pre:()=>capNavClose(), t:'À vous !',
   x:'Cliquez sur <b>Terminer ✓</b>, puis ouvrez votre fichier.<br>Dès que le modèle sera chargé, la visite reprendra pour vous montrer où trouver l\'aide et les tutoriels.'}
];
/** 🚀 Bien démarrer, 2e temps (modèle chargé) : où trouver l'aide et les tutoriels. */
var CAP_TOUR_AFTER=[
  {pre:()=>capNavClose(), t:'✅ Modèle ouvert',
   x:'Votre modèle est chargé. Voici où trouver l\'aide et les tutoriels, à tout moment.'},
  {s:'#b-help', pre:()=>capNavClose(), t:'? Aide',
   x:'L\'aide et toutes les visites guidées sont regroupées dans ce menu.'},
  {s:'#cap-nav-dd', pre:()=>capTourHelpMenu(), t:'📚 Aide et tutoriels',
   x:'<b>📖 Aide complète</b> : documentation de toutes les vues.<br><b>🎓 Visite guidée</b> : tour complet de l\'interface.<br><b>🎯 Visite de cette vue</b> : menus et commandes de la vue affichée — disponible dans chaque vue.'},
  {s:'#cap-tb-views', pre:()=>capNavClose(), t:'🧭 Et maintenant',
   x:'Choisissez une vue dans cette barre, puis <b>? Aide ▾ → 🎯 Visite de cette vue</b> pour la découvrir pas à pas.'}
];
var _capTourResume=false;   // vrai : reprendre « Bien démarrer » (2e temps) au prochain chargement de modèle

var _capTour=null;   // visite en cours : {i, steps} ou null

/** Clé de la vue affichée pour les visites contextuelles.
 * @returns {string} '@rm' ou vue Capella (capCurrentView)
 */
function capTourCtxKey(){
  if(currentMode!=='capella') return '@rm';
  return capCurrentView;
}

/** Visite contextuelle de la vue affichée, si elle existe et qu'un modèle est chargé.
 * @returns {Object|null} Entrée de CAP_TOUR_VIEWS ({l, steps}) ou null
 */
function capTourCtx(){
  return capLoaded&&CAP_TOUR_VIEWS[capTourCtxKey()]||null;
}

/** Éléments affichés désignés par le sélecteur d'une étape.
 * @param {Object} st - Étape
 * @returns {HTMLElement[]} Éléments visibles (le premier seulement si st.one)
 */
function capTourEls(st){
  if(!st.s) return [];
  const vis=e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'; };
  const L=[...document.querySelectorAll(st.s)].filter(vis);
  return st.one?L.slice(0,1):L;
}

/** Indique si une étape est utilisable (zone affichée, ou bulle centrée).
 * @param {Object} st - Étape
 * @returns {boolean} true si l'étape peut être montrée
 */
function capTourVisible(st){
  if(st.m==='loaded'&&!capLoaded) return false;
  if(st.m==='empty'&&capLoaded) return false;
  if(!st.s||st.pre) return true;   // bulle centrée, ou zone qui apparaît après l'action préalable
  return capTourEls(st).length>0;
}

/** Lance une visite guidée depuis sa première étape.
 * @param {Object[]} [steps] - Étapes (par défaut la visite générale CAP_TOUR_STEPS)
 */
function capTourStart(steps){
  if(typeof capNavClose==='function') capNavClose();
  document.getElementById('help-ov')&&(document.getElementById('help-ov').style.display='none');
  if(!document.getElementById('cap-tour-spot')){
    const blk=document.createElement('div'); blk.id='cap-tour-block';
    const spot=document.createElement('div'); spot.id='cap-tour-spot';
    const pop=document.createElement('div'); pop.id='cap-tour-pop';
    document.body.append(blk,spot,pop);
    pop.addEventListener('click',e=>{
      const b=e.target.closest('[data-tour]'); if(!b) return;
      ({prev:()=>capTourGo(-1), next:()=>capTourGo(1), end:()=>capTourEnd()})[b.dataset.tour]();
    });
    document.addEventListener('keydown',capTourKey,true);
    window.addEventListener('resize',()=>{ if(_capTour) capTourPlace(); });
  }
  _capTour={i:-1, steps:Array.isArray(steps)?steps:CAP_TOUR_STEPS};
  ['cap-tour-block','cap-tour-spot','cap-tour-pop'].forEach(id=>document.getElementById(id).style.display='block');
  capTourGo(1);
}

/** Lance la visite de la vue affichée (ou la visite générale s'il n'y en a pas). */
function capTourStartView(){
  const v=capTourCtx();
  capTourStart(v?v.steps:CAP_TOUR_STEPS);
}

/** Passe à l'étape suivante ou précédente utilisable (les zones non affichées sont sautées).
 * @param {number} d - +1 (suivante) ou -1 (précédente)
 */
function capTourGo(d){
  if(!_capTour) return;
  const S=_capTour.steps;
  let i=_capTour.i+d;
  while(i>=0&&i<S.length&&!capTourVisible(S[i])) i+=d;
  if(i>=S.length){ const done=_capTour.onDone; capTourEnd(); if(done) done(); return; }
  if(i<0) return;
  _capTour.i=i;
  const st=S[i];
  if(st.pre){ try{ st.pre(); }catch(e){} }
  const el=capTourEls(st)[0];
  if(el&&el.scrollIntoView) el.scrollIntoView({block:'nearest',inline:'nearest'});
  capTourRenderPop();
  // Laisse le temps à l'action préalable (changement de vue) de s'afficher avant de placer le cadre
  requestAnimationFrame(()=>capTourPlace());
}

/** Numéros (rang, total) de l'étape courante parmi les étapes utilisables.
 * @returns {{n:number,tot:number,first:boolean,last:boolean}} Position de l'étape courante
 */
function capTourPos(){
  const ok=_capTour.steps.map((s,j)=>j===_capTour.i||capTourVisible(s));
  const n=ok.slice(0,_capTour.i+1).filter(Boolean).length, tot=ok.filter(Boolean).length;
  return {n, tot, first:n===1, last:n===tot};
}

/** Remplit la bulle de l'étape courante (titre, texte, compteur, boutons). */
function capTourRenderPop(){
  const st=_capTour.steps[_capTour.i], p=capTourPos(), pop=document.getElementById('cap-tour-pop');
  const x=typeof st.x==='function'?st.x():st.x;
  pop.innerHTML=`<div class="ct-hd"><span class="ct-t">${st.t}</span><span class="ct-x" data-tour="end" title="Quitter la visite (Échap)">✕</span></div>
    <div class="ct-b">${x}</div>
    <div class="ct-ft"><span class="ct-n">Étape ${p.n} / ${p.tot}</span>
      <button class="tbtn" data-tour="prev"${p.first?' disabled':''}>◀ Précédent</button>
      <button class="tbtn ct-next" data-tour="next">${p.last?'Terminer ✓':'Suivant ▶'}</button></div>`;
  pop.querySelector('.ct-next').focus({preventScroll:true});
}

/** Place le cadre clignotant sur la zone de l'étape courante et la bulle à côté (ou au centre). */
function capTourPlace(){
  if(!_capTour) return;
  const st=_capTour.steps[_capTour.i], spot=document.getElementById('cap-tour-spot'), pop=document.getElementById('cap-tour-pop');
  const W=window.innerWidth, H=window.innerHeight, M=6, G=12;
  // Rectangle englobant toutes les zones de l'étape, limité à l'écran
  let x=Infinity, y=Infinity, x2=-Infinity, y2=-Infinity;
  capTourEls(st).forEach(e=>{ const r=e.getBoundingClientRect();
    x=Math.min(x,r.left); y=Math.min(y,r.top); x2=Math.max(x2,r.right); y2=Math.max(y2,r.bottom); });
  x=Math.max(2,x-M); y=Math.max(2,y-M); x2=Math.min(W-2,x2+M); y2=Math.min(H-2,y2+M);
  if(!(x2-x>4&&y2-y>4)){
    // Bulle centrée : cadre réduit à un point, tout l'écran est assombri
    Object.assign(spot.style,{left:W/2+'px',top:H/2+'px',width:'0px',height:'0px'}); spot.classList.add('ct-none');
    pop.style.left=Math.max(8,(W-pop.offsetWidth)/2)+'px'; pop.style.top=Math.max(8,(H-pop.offsetHeight)/2)+'px';
    return;
  }
  spot.classList.remove('ct-none');
  Object.assign(spot.style,{left:x+'px',top:y+'px',width:(x2-x)+'px',height:(y2-y)+'px'});
  // Bulle : en dessous, sinon au-dessus, sinon à droite, sinon à gauche, sinon à l'intérieur de la zone
  const pw=pop.offsetWidth, ph=pop.offsetHeight;
  let left, top;
  if(y2+G+ph<=H-8){ top=y2+G; left=x; }
  else if(y-G-ph>=8){ top=y-G-ph; left=x; }
  else if(x2+G+pw<=W-8){ left=x2+G; top=y; }
  else if(x-G-pw>=8){ left=x-G-pw; top=y; }
  else { left=x+(x2-x-pw)/2; top=y+(y2-y-ph)/2; }
  pop.style.left=Math.max(8,Math.min(left,W-pw-8))+'px';
  pop.style.top=Math.max(8,Math.min(top,H-ph-8))+'px';
}

/** Raccourcis clavier pendant la visite : ← → Entrée pour naviguer, Échap pour quitter.
 * @param {KeyboardEvent} e - Événement clavier (écouté en phase de capture)
 */
function capTourKey(e){
  if(!_capTour) return;
  const a={ArrowRight:()=>capTourGo(1), ArrowLeft:()=>capTourGo(-1), Escape:()=>capTourEnd(),
    Enter:()=>document.querySelector('#cap-tour-pop .ct-next')?.click()}[e.key];
  if(!a) return;
  e.preventDefault(); e.stopPropagation(); a();
}

/** Quitte la visite guidée et retire la mise en évidence. */
function capTourEnd(){
  if(_capTour&&(_capTour.steps===CAP_TOUR_AFTER||_capTour.steps===CAP_TOUR_START)) capNavClose();
  _capTour=null;
  ['cap-tour-block','cap-tour-spot','cap-tour-pop'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
}

/** Ouvre le menu ? Aide ▾ (s'il n'est pas déjà ouvert) pour l'étape qui le présente. */
function capTourHelpMenu(){
  const dd=document.getElementById('cap-nav-dd'), b=document.getElementById('b-help');
  if(b&&!(dd&&dd.style.display!=='none'&&dd.dataset.g==='help')) capNavMenu('help', b);
}

/** Lance « 🚀 Bien démarrer » : sans modèle, montre où ouvrir le fichier et arme la reprise après chargement ;
 * avec un modèle déjà chargé, passe directement au 2e temps (aide et tutoriels). */
function capTourStartHere(){
  if(capLoaded){ capShowWelcome(false); capTourStart(CAP_TOUR_AFTER); return; }
  capTourStart(CAP_TOUR_START);
  _capTour.onDone=()=>{ _capTourResume=true; };   // ✕ ou Échap : pas de reprise
}

/** Reprend « 🚀 Bien démarrer » (2e temps) après le chargement d'un modèle, si la reprise a été armée. */
function capTourResumeAfterLoad(){
  if(!_capTourResume) return;
  _capTourResume=false;
  setTimeout(()=>{ if(capLoaded&&!_capTour) capTourStart(CAP_TOUR_AFTER); }, 600);
}

// Bouton « 🚀 Bien démarrer » de l'écran d'accueil
document.getElementById('cw-start')?.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); capTourStartHere(); });
// Lien « 🎓 Visite guidée » de l'écran d'accueil (sans déclencher l'ouverture du sélecteur de fichier)
document.getElementById('cw-tour-link')?.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); capTourStart(); });
