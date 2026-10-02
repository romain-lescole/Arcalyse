# Index des fonctions (généré par `node tools/index.js` — ne pas modifier à la main)

## 01-donnees-config.js — 42 lignes

- `CAP_HUMAN_NAMES` (l. 9) — Table de correspondance type Capella → {nom humain (h), description (d)}.
- `MODEL` (l. 11)
- `RCFG` (l. 24)
- `TCFG` (l. 25)
- `MODES` (l. 37)

## 02-themes.js — 184 lignes

- `THEMES` (l. 6)
- `capInk` (l. 57) — Couleur de texte lisible sur un fond donné : noir ou blanc, selon le meilleur contraste (WCAG).
- `capTextOn` (l. 67) — Couleur d'un texte coloré lisible sur le fond du thème : assombrie en thème clair.
- `capIsLight` (l. 72) — Indique si le thème courant est clair (couleurs de texte foncées nécessaires).
- `applyTheme` (l. 81) — Applique le thème visuel global (dark/light/dracula/solarized/nord).
- `applyMode` (l. 110) — Bascule entre les modes d'affichage : default (Relation Map), PBS, table, capella.
- `tv` (l. 182) — Lit la valeur d'une variable CSS (ex: --c-text). @param {string} varName

## 03-rm-etat-svg.js — 121 lignes

- `COLOR_PALETTE` (l. 31)
- `nextColor` (l. 38) — Retourne la prochaine couleur non encore utilisée dans TCFG ni RCFG.
- `setupMarkers` (l. 66) — Crée/recrée les marqueurs SVG (flèches, diamants, cercles) pour chaque type de relation défini dans RCFG.

## 04-rm-arbre-rendu.js — 339 lignes

- `buildTreeData` (l. 10) — Construit la structure d'arbre D3 hiérarchique à partir de MODEL.elements
- `rebuildTree` (l. 53) — Reconstruit l'arbre D3 et redessine le graphe. Point d'entrée principal
- `textW` (l. 67) — Mesure la largeur en pixels d'une chaîne de caractères dans une fonte donnée.
- `wrapToNLines` (l. 80) — Découpe un texte en plusieurs lignes pour tenir dans une largeur max.
- `computeNodeDims` (l. 106) — Calcule les dimensions (largeur, hauteur, lignes) d'un nœud selon son label et le mode compact.
- `render` (l. 119) — Rendu principal D3 : calcule les positions (layout), dessine les arêtes et les nœuds.

## 05-rm-vue-chaine.js — 137 lignes

- `rmChainBanner` (l. 9) — Affiche ou masque le bandeau « chaîne affichée » au-dessus du graphe.
- `renderChainView` (l. 27) — Rendu de la vue chaîne : disposition en couches (capChainLayout) orientée selon la disposition choisie
- `rmHighlight` (l. 126) — Met en évidence un nœud et ses voisins directs (les autres sont estompés) ; null pour tout rétablir.

## 06-rm-interactions-export.js — 473 lignes

- `toggleNode` (l. 7) — Ouvre/ferme un nœud (affiche/masque ses enfants dans le graphe). @param node Nœud D3
- `expandAllNodes` (l. 14) — Développe récursivement tous les nœuds à partir de `node`.
- `collapseAllNodes` (l. 21) — Réduit récursivement tous les nœuds au-delà de la profondeur 1.
- `setCtx` (l. 30) — Définit l'élément central (ctx) de la Relation Map et redessine.
- `fitView` (l. 45) — Ajuste le zoom et le pan pour que tout le contenu du graphe soit visible.
- `layoutFns` (l. 72) — Retourne les accesseurs de position {gx, gy} selon la disposition courante (LR/TB/RL/radial/zigzag).
- `showTip` (l. 85) — Affiche l'infobulle de survol d'un nœud. @param ev MouseEvent @param el Élément MODEL
- `moveTip` (l. 92) — Repositionne l'infobulle flottante à la position du curseur lors du survol.
- `hideTip` (l. 95) — Masque l'infobulle flottante du graphe.
- `showCtxMenu` (l. 100) — Affiche le menu contextuel (clic droit) sur un nœud du graphe.
- `hideCtxMenu` (l. 107) — Masque le menu contextuel du graphe.
- `positionFloat` (l. 149) — Positionne le panneau flottant d'édition près du curseur.
- `showFloatEdit` (l. 161) — Affiche le formulaire d'édition inline d'un élément existant.
- `showFloatRelation` (l. 187) — Affiche le formulaire de création d'une relation depuis un élément source.
- `showFloatNewChild` (l. 218) — Affiche le formulaire de création d'un élément enfant.
- `showFloatNewElement` (l. 257) — Affiche le formulaire de création d'un nouvel élément.
- `getContentBounds` (l. 295) — Calcule les dimensions réelles du contenu SVG (bounding box de tous les nœuds).
- `openExportModal` (l. 320) — Ouvre le modal d'export image. @param {string} format - 'png'|'jpeg'|'svg'
- `updateExportInfo` (l. 329) — Met à jour le libellé d'information affiché dans le menu Export (dimensions/format prévus).
- `exportContent` (l. 360) — Exporte le graphe en image. Gère PNG (canvas), JPEG (canvas) et SVG (inline).
- `updateLegend` (l. 430) — Met à jour la légende des types et relations affichée dans le panneau gauche.
- `updateInfo` (l. 450) — Met à jour le compteur d'éléments/relations affiché en bas du panneau.
- `typSelectAll` (l. 461) — Coche ou décoche tous les filtres de types d'éléments du panneau gauche.
- `relSelectAll` (l. 469) — Coche ou décoche tous les filtres de types de relations du panneau gauche.

## 07-rm-panneau-criteres.js — 261 lignes

- `buildPanel` (l. 7) — Reconstruit entièrement le panneau gauche : critères de relation, types d'éléments.
- `capShowChainInMap` (l. 249) — Visualise une chaîne fonctionnelle dans la Relation Map en préservant ses ramifications

## 08-editeur-modele.js — 573 lignes

- `openModal` (l. 10) — Ouvre la fenêtre modale d'édition du modèle (éléments, relations, chaînes, types).
- `updateModalCounts` (l. 22) — Met à jour les compteurs affichés sur les onglets de la fenêtre modale d'édition.
- `renderModalTab` (l. 29) — Affiche le contenu de l'onglet demandé dans la fenêtre modale d'édition.
- `renderChainsTab` (l. 40) — Rend l'onglet « Chaînes » de la modale : liste des chaînes de relations définies.
- `renderElementsTab` (l. 72) — Rend l'onglet « Éléments » de la modale d'édition : tableau filtrable de tous les
- `showElementForm` (l. 152) — Affiche le formulaire de création/édition d'un élément dans la modale.
- `deleteElement` (l. 185) — Supprime un élément depuis la modale d'édition, avec ses relations associées.
- `renderRelationsTab` (l. 200) — Rend l'onglet « Relations » de la modale d'édition : tableau des relations du modèle
- `showRelForm` (l. 280) — Affiche le formulaire de création/édition d'une relation dans la modale.
- `renderPackagesTab` (l. 309) — Rend l'onglet « Packages » de la modale d'édition : liste des éléments de type Package
- `showEditRelCriteriaForm` (l. 340) — Affiche un mini-formulaire inline dans la section "Critères de relation"
- `showNewRelCriteriaForm` (l. 402) — Affiche le formulaire de définition d'un nouveau critère de relation.
- `showEditTypeForm` (l. 481) — Affiche un mini-formulaire inline dans la section "Types d'éléments"
- `showNewTypeForm` (l. 530) — Affiche le formulaire de création d'un nouveau type d'élément.

## 09-arborescence.js — 653 lignes

- `typeIcon` (l. 5) — Retourne l'icône associée à un type d'élément (définie dans TCFG). @param {string} t
- `migratePkgsToElements` (l. 11) — Migre l'ancien format packages[] vers le nouveau format elements[] avec type='Package'.
- `buildPropertiesPanel` (l. 41) — Remplit le panneau Propriétés avec les attributs de l'élément sélectionné (S.propEl).
- `_arboInlineRename` (l. 170) — Active le renommage en place d'un nœud de l'arborescence (Entrée valide, Échap annule).
- `buildArbo` (l. 185) — Construit l'arborescence gauche à partir de MODEL.elements.
- `arboExpandAll` (l. 360) — Développe tous les nœuds de l'arborescence gauche.
- `arboCollapseAll` (l. 363) — Réduit tous les nœuds de l'arborescence gauche au premier niveau.
- `arboRenameEl` (l. 369) — Renomme un élément dans MODEL et met à jour l'arbo et le graphe.
- `arboAddPkg` (l. 381) — Crée un nouveau package (type='Package') enfant d'un élément existant.
- `arboAddEl` (l. 395) — Crée un nouvel élément enfant dans l'arborescence.
- `arboDeleteEl` (l. 410) — Supprime un élément et toutes ses relations de MODEL, puis met à jour l'UI.
- `arboClearMultiSel` (l. 428) — Vide la sélection multiple de l'arborescence et met à jour l'affichage.
- `arboUpdateMselBar` (l. 431) — Met à jour la barre de compteur de sélection multiple sous l'en-tête Arborescence.
- `arboMoveEls` (l. 443) — Déplace un GROUPE d'éléments vers un nouvel owner en conservant la hiérarchie interne :
- `arboParseClipboardList` (l. 471) — Découpe un texte de presse-papier en liste de noms : une ligne = un élément.
- `arboPasteListInto` (l. 479) — Crée une liste d'éléments enfants sous un owner (un nom par ligne du presse-papier).
- `arboConvertSelectedType` (l. 499) — Change le type de tous les éléments d'un ensemble d'ids (hors packages).
- `arboShowCtxMenu` (l. 514)
- `arboMoveEl` (l. 636) — Déplace un élément unique vers un nouvel owner par glisser-déposer : met à jour

## 10-table-view.js — 1402 lignes

- `tvNewTabState` (l. 6) — Construit un objet d'état vierge pour un nouvel onglet de Table View.
- `tvActiveTab` (l. 28) — Retourne l'objet d'état de l'onglet actuellement actif.
- `tvSyncFromActiveTab` (l. 52) — Recharge les variables d'état actives depuis l'onglet actif (tvTabs[tvActiveTabIdx]).
- `tvSyncToActiveTab` (l. 59) — Sauvegarde les variables d'état actives dans l'onglet actif (tvTabs[tvActiveTabIdx]).
- `TV_BUILTIN` (l. 70)
- `tvFindElementById` (l. 74) — Cherche un élément par id dans MODEL.elements, ou dans le cache de lignes virtuelles
- `tvFindChildrenOf` (l. 78) — Cherche tous les enfants directs (parentEl===id) dans MODEL.elements et/ou le cache virtuel.
- `tvGetValArray` (l. 89) — Retourne TOUJOURS un tableau de valeurs pour une colonne donnée — permet de choisir
- `tvGetVal` (l. 127) — Retourne la valeur d'affichage d'une cellule sous forme de chaîne unique :
- `tvSetVal` (l. 137) — Écrit une valeur dans une cellule éditable de Table View. Les colonnes dérivées
- `tvMakeCellEditable` (l. 179) — Rend une cellule du tableau éditable en place : passage en champ de saisie au
- `buildTvTabBar` (l. 226) — Construit la barre d'onglets de Table View : un onglet = une vue indépendante complète
- `tvAllRows` (l. 303) — Jeu de travail COMPLET pour le moteur Metachain TV : éléments natifs + toutes les lignes
- `tvRowAttrs` (l. 311) — Attributs exploitables d'une ligne TV : attributs XML bruts Capella (via _capRaw ou
- `tvGetMetachainMetaclasses` (l. 323) — Liste tous les Metaclass disponibles pour le moteur Metachain de Table View,
- `tvGetAttrRefProperties` (l. 328) — Détecte les attributs de MODEL.elements[].attributes qui référencent d'autres éléments
- `tvGetIncomingRefProperties` (l. 352) — Version TV de la détection des références ENTRANTES : trouve les types dont un attribut
- `tvGetMetachainProperties` (l. 373) — Properties disponibles pour un Metaclass : valeurs terminales, Owner typé, Owned element
- `tvResolveStep` (l. 420) — Exécute un pas de navigation à partir d'un élément MODEL.elements.
- `tvExtractValue` (l. 461) — Extrait une valeur terminale simple d'un élément MODEL.elements.
- `tvResolveMetachain` (l. 469) — Exécute une chaîne de Properties (metachain) à partir d'un élément MODEL.elements.
- `tvRenderCustomColStepRow` (l. 498) — Rend une étape (ligne) de l'éditeur de colonne Metachain : sélecteur de Metaclass,
- `tvRenderCustomColPanel` (l. 552) — Rend l'intégralité du panneau latéral d'édition d'une colonne Metachain
- `tvOpenCustomColPanel` (l. 572) — Ouvre le panneau latéral de création/édition d'une colonne Metachain.
- `tvCloseCustomColPanel` (l. 595) — Ferme le panneau latéral d'édition de colonne Metachain et réinitialise son état.
- `tvSaveTableView` (l. 629) — Sauvegarde la configuration de la vue Table View active (colonnes, ordre, largeurs,
- `tvLoadTableView` (l. 651) — Charge une configuration de vue Table View sauvegardée et l'applique à l'onglet actif.
- `buildTableView` (l. 679) — Construit intégralement la vue Table View : barre d'outils, menu de sélection des
- `onModelChanged` (l. 1398) — Callback appelé après toute modification du modèle : rebuildTree, buildArbo, buildPanel.

## 11-sauvegarde-toolbar-init.js — 263 lignes

- `saveJSON` (l. 5) — Sérialise MODEL, RCFG, TCFG et S en JSON et télécharge le fichier.
- `loadJSON` (l. 19) — Charge un fichier JSON et restaure l'état complet de l'application.
- `applyDepth` (l. 106) — Applique la profondeur d'exploration du graphe (bornée entre 1 et 10),
- `openHelpModal` (l. 151) — Ouvre la fenêtre d'aide, éventuellement sur un onglet donné.
- `positionOverlay` (l. 247) — Positionne #capella-overlay sous #toolbar en lisant sa hauteur réelle.

## 20-capella-chargement.js — 728 lignes

- `CAP_LAYERS` (l. 4)
- `CAP_NS_LAYER` (l. 12)
- `CAP_ANCESTOR_KW` (l. 13)
- `CAP_ATTR_KEYS` (l. 14)
- `CAP_TECHNICAL_TYPES` (l. 15)
- `CAP_PKG_TYPES` (l. 16)
- `CAP_TYPE_ICON` (l. 17)
- `capSaveFullPage` (l. 35) — Sauvegarde la page actuelle (tout le HTML/CSS/JS de l'application) dans un fichier HTML
- `capEsc` (l. 107) — Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s
- `capLoadFile` (l. 122) — Charge un fichier Capella (depuis l'explorateur ou un glisser-déposer) : vérifie
- `capShowWelcome` (l. 176) — Affiche ou masque l'écran d'accueil. Quand un modèle est déjà chargé, l'écran
- `capWelcomeStatus` (l. 187) — Affiche un message d'état (chargement, erreur) dans la zone de dépôt.
- `capUpdateWelcome` (l. 193) — Synchronise l'écran d'accueil avec l'état de chargement (appelé au démarrage,
- `XSI_NS` (l. 229)
- `capXType` (l. 231) — Lit l'attribut xsi:type d'un élément XML Capella (plain ou namespacé).
- `capTName` (l. 233) — Extrait le nom court du type (après ':') depuis xsi:type. Ex: 'pa:PhysicalComponent' → 'PhysicalComponent'.
- `capXId` (l. 235) — Lit l'ID d'un élément XML Capella (attribut plain 'id' ou xmi:id namespacé).
- `capXName` (l. 237) — Lit l'attribut 'name' d'un élément XML Capella.
- `capResolveLayer` (l. 242) — Détermine la couche ARCADIA (OA/SA/LA/PA/EPBS/Shared) d'un élément
- `capGetAttrs` (l. 248) — Extrait les attributs pertinents d'un élément XML Capella (définis dans CAP_ATTR_KEYS).
- `capBuildTree` (l. 258) — Construit récursivement l'arbre d'éléments Capella depuis le XML.
- `capRunBulk` (l. 284) — Exécute fn en mode chargement groupé puis reconstruit une fois le panneau (qui reconstruit l'arborescence).
- `capBuildTypeRegistry` (l. 294) — Construit capTypeRegistry : {type → {count, layer, checked}} depuis capAllElements.
- `capApplyPanelOnLoad` (l. 313) — Appelée après le chargement Capella : configure le panneau gauche RM.
- `capInjectToArbo` (l. 376) — Injecte les éléments Capella dans MODEL.elements pour qu'ils apparaissent
- `capInjectCapellaRelsToCriteria` (l. 480) — Ajoute les types de relations Capella (PC NODE→PC NODE, etc.) dans RCFG
- `capInjectLinksToModel` (l. 521) — Calcule les liens Capella via capComputeLinks() et les injecte dans MODEL.relations
- `capFilterArboToLinked` (l. 565) — Filtre MODEL.elements pour ne conserver que les éléments _capella référencés
- `capInjectChainsToModal` (l. 604) — Calcule les chaînes (FunctionalChain, OperationalProcess, PhysicalPath)
- `capRenderCurrentView` (l. 665) — Dispatche le rendu vers la vue Capella active (cards/table/tree/links/chains/physlink).
- `capUpdateStatChips` (l. 719) — Met à jour les puces de comptage OA/SA/LA/PA/EPBS/Shared/total dans la sous-barre.

## 21-capella-vues-base.js — 1119 lignes

- `capRenderSidebar` (l. 5) — Rend la sidebar Capella : liste des types par couche avec cases à cocher.
- `capGetFiltered` (l. 57) — Retourne capAllElements filtré par types activés, couche et texte de recherche.
- `capRenderCards` (l. 69) — Rend la vue Cartes : cartes groupées par couche ARCADIA, filtrées.
- `CAP_TABLE_BUILTIN_COLS` (l. 104) — Colonnes toujours proposées en plus des attributs bruts du XML.
- `capGetAllRawAttrKeys` (l. 115) — Calcule dynamiquement la liste de TOUS les noms d'attributs présents dans capAllElements
- `capGetParentIndex` (l. 128) — Construit l'index de containment du modèle Capella depuis le XML brut :
- `capGetMetachainMetaclasses` (l. 151) — Retourne la liste des "Metaclass" (types Capella) disponibles au démarrage d'une étape :
- `capGetElementById_` (l. 172) — Retrouve un élément Capella par son identifiant XML. S'appuie sur un index id → élément
- `capParseAttrRefs_` (l. 181) — Découpe la valeur brute d'un attribut XML en liste d'IDs candidats (gère les attributs
- `capGetAttrRefProperties` (l. 189) — Détecte, pour un Metaclass donné, les attributs XML bruts dont la valeur référence
- `capGetViaIntermediateProperties` (l. 222) — Détecte le pattern "navigation via élément intermédiaire" : un type X (différent du
- `capGetOwnerProperties` (l. 260) — Détecte tous les types d'ANCÊTRES réellement rencontrés en remontant le containment XML
- `capGetIncomingRefProperties` (l. 290) — Détecte les RÉFÉRENCES ENTRANTES : pour un metaclass M, trouve tous les types X dont un
- `capGetMetachainProperties` (l. 325) — Retourne toutes les Properties navigables depuis un Metaclass : valeurs terminales,
- `capResolveStep` (l. 416) — Exécute UN pas de navigation (une Property) à partir d'un élément capAllElements donné.
- `capExtractValue` (l. 492) — Extrait une valeur terminale "simple" d'un élément capAllElements (Name, ID, Type,
- `capResolveMetachain` (l. 508) — Exécute une chaîne de Properties (metachain) à partir d'un élément. Le 1er pas n'est
- `capTableGetValArray` (l. 532) — Retourne TOUJOURS un tableau de valeurs pour une colonne donnée (même les colonnes à valeur
- `capTableGetVal` (l. 565) — Retourne la valeur d'une colonne sous forme de string unique (jointe par ', ' si plusieurs
- `capTableColLabel` (l. 570) — Libellé humain affiché en en-tête pour une colonne donnée.
- `capBuildTableToolbar` (l. 582) — Construit la barre d'outils au-dessus du tableau Capella : bouton de sélection des
- `capRefreshColPickerList` (l. 671) — Reconstruit uniquement la liste interne du menu ⊞ Colonnes (#cap-colpicker-list),
- `capApplyColResize` (l. 743) — Ajoute une poignée de redimensionnement sur le bord droit d'un <th> du tableau Capella.
- `capRenderCustomColStepRow` (l. 771) — Construit une ligne du metachain : <select> Metaclass + <select> Property + suppression.
- `capRenderCustomColPanel` (l. 837) — Reconstruit entièrement le panneau : recalcule le metaclass imposé de chaque ligne à partir
- `capOpenCustomColPanel` (l. 864) — Ouvre le panneau latéral de construction de colonne personnalisée (Metachain Navigation).
- `capCloseCustomColPanel` (l. 888) — Ferme le panneau latéral d'édition de colonne Metachain de la vue Tableau.
- `capSaveTableView` (l. 929) — Sérialise la configuration actuelle de la vue Tableau Capella (colonnes visibles, colonnes
- `capLoadTableView` (l. 948) — Charge une configuration de vue Tableau Capella précédemment sauvegardée et l'applique.
- `capRenderTable` (l. 971) — Rend intégralement la vue Tableau Capella : barre d'outils (colonnes, colonne perso,
- `capRenderTableBodyOnly` (l. 979) — Reconstruit uniquement le <thead>/<tbody> du tableau Capella (pas la toolbar ni le menu
- `capRenderTree` (l. 1069) — Rend la vue Arborescence Capella (hiérarchie XML complète).
- `capRenderTreeNode` (l. 1080) — Rend récursivement un nœud de l'arborescence Capella.

## 22-capella-liens.js — 167 lignes

- `CAP_LINK_SECTIONS` (l. 2)
- `capComputeLinks` (l. 30) — Extrait et résout toutes les relations Capella depuis le XML :
- `capRenderLinks` (l. 136) — Rend la vue Liens : tableau des relations Capella groupées par type.

## 23-chaines.js — 523 lignes

- `CAP_CHAIN_COLORS` (l. 2)
- `CAP_CHAIN_LABELS` (l. 3)
- `CAP_ACTOR_TYPES` (l. 4)
- `CAP_CHAIN_ARCH` (l. 5)
- `CAP_CHAIN_KIND` (l. 8) — Couleurs des boîtes, reprises des diagrammes Capella : bleu = élément porté par un acteur,
- `capIsActorEl` (l. 26) — Indique si un composant XML est un acteur (attribut actor="true" des versions récentes
- `capBuildFunctionAllocationIndex` (l. 38) — Construit l'index fonction → composant allocataire à partir des ComponentFunctionalAllocation
- `capComputeChains` (l. 56) — Extrait les chaînes (FunctionalChain, OperationalProcess, PhysicalPath) sous forme de GRAPHE
- `capChainLayout` (l. 176) — Calcule une disposition en couches (Sugiyama simplifié) d'un graphe de chaîne :
- `capWrapLines` (l. 252) — Découpe un nom en lignes pour l'affichage dans une boîte.
- `capChainDiagramSvg` (l. 266) — Produit le diagramme SVG d'une chaîne dans le style Capella (haut → bas) : boîtes bleues
- `capChainsFiltered` (l. 376) — Retourne les chaînes après application des filtres de type et de catégorie ARCADIA.
- `capChainIsEmpty` (l. 382) — Vrai si la chaîne est vide : aucune fonction (ou composant) ni échange impliqué.
- `capChainEmptyOk` (l. 384) — Vrai si la chaîne passe le filtre de contenu (toutes / non vides / vides).
- `CAP_CHAIN_LAYER_ORDER` (l. 385)
- `capChainLayerInfo` (l. 387) — Libellé et couleurs d'une catégorie ARCADIA de chaîne ('?' = non classée).
- `capChainLayerBadge` (l. 391) — Badge coloré de catégorie ARCADIA (OA, SA, LA, PA…).
- `capRenderChains` (l. 398) — Rend la vue Chaînes : filtres (type + catégorie ARCADIA), légende et bascule entre les
- `capRenderChainCards` (l. 439) — Construit le HTML des cartes de chaînes, regroupées par catégorie ARCADIA
- `capChainCardBody` (l. 470) — Rend le contenu d'une carte ouverte : entrées/sorties, diagramme et table des échanges.
- `capWireChainCards` (l. 504) — Attache l'ouverture/fermeture des cartes (rendu paresseux du diagramme) et la navigation.

## 24-chaines-export.js — 814 lignes

- `CAP_CHAIN_TAG` (l. 7)
- `capTextW` (l. 14) — Estime la largeur d'un texte SVG (police sans-serif) pour dimensionner les cartouches.
- `capSafeFileName` (l. 20) — Nom de fichier sûr (sans caractères interdits sous Windows).
- `capChainFramedSvg` (l. 29) — Construit le diagramme d'une chaîne encadré, prêt à l'export : cadre, cartouche d'onglet
- `capSvgToCanvas` (l. 111) — Rastérise un SVG autonome dans un canvas (fond blanc), avec une échelle bornée
- `capDownloadBlob` (l. 129) — Déclenche le téléchargement d'un Blob.
- `capCanvasBlob` (l. 140) — Convertit un canvas en Blob (PNG ou JPEG).
- `capChainExportOne` (l. 146) — Exporte une chaîne seule : 'png', 'svg' ou 'clip' (copie PNG dans le presse-papiers).
- `capChainExportStatus` (l. 164) — Affiche un message d'état dans la barre d'export des chaînes.
- `capChainExportTargets` (l. 172) — Chaînes visées par un export groupé : la sélection si elle existe, sinon toutes les chaînes filtrées
- `capPdfHexStr` (l. 183) — Encode une chaîne JavaScript en chaîne PDF UTF-16BE hexadécimale (<FEFF…>), pour les titres et signets.
- `capPdfBuild` (l. 195) — Écrit un PDF minimal (une image JPEG par page, signets de navigation), sans bibliothèque.
- `capCrc32` (l. 231) — Calcule le CRC-32 d'un tableau d'octets.
- `capZipBuild` (l. 241) — Écrit une archive ZIP non compressée (méthode « stored », noms UTF-8), sans bibliothèque.
- `capChainTables` (l. 272) — Tables d'une chaîne : fonctions (ou composants) impliquées et échanges impliqués,
- `capChainCsvText` (l. 294) — Texte CSV (séparateur « ; ») des deux tables d'une chaîne, pour Excel.
- `capChainAnnexPages` (l. 312) — Met en page (et dessine si demandé) les pages d'annexe d'une chaîne sur des canvas A4 paysage (~150 dpi) :
- `capChainPdfCover` (l. 385) — Dessine la page de garde / sommaire du PDF dans un canvas (texte natif, accents compris).
- `capChainExportBatch` (l. 415) — Export groupé des chaînes (sélection ou toutes les chaînes filtrées).
- `capChainExportHtml` (l. 460) — Rapport HTML autonome des chaînes (sans la vue Relation Map) : onglet Sommaire (tableau avec liens)
- `capChainExportBar` (l. 493) — Barre d'export de la sous-vue Diagrammes : sélection, options de mise en page, exports groupés.
- `capWireChainExport` (l. 522) — Branche les contrôles de la barre d'export et les cases à cocher des cartes.
- `capChainExportRefreshCount` (l. 540) — Met à jour le compteur de sélection et la case « Tout » sans re-rendre les cartes (garde les cartes ouvertes).
- `capRenderChainMap` (l. 551) — Rend la sous-vue « Relation Map » : liste des chaînes groupée par catégorie ARCADIA à gauche,

## 25-panneau-detail.js — 169 lignes

- `capOpenDetail` (l. 5) — Ouvre le panneau de détail (colonne droite de l'overlay) pour un élément Capella.
- `capOpenDetailNode` (l. 94) — Ouvre le panneau de détail à partir d'un nœud de l'arborescence Capella.
- `capUpdateToolbarForView` (l. 106) — Met à jour les boutons actifs et les groupes de contrôles visibles

## 26-rapports-html.js — 101 lignes

- `capReportCss` (l. 18) — Récupère les règles CSS de l'application utiles aux rapports (classes des vues d'interfaces, chaînes, contrôles).
- `capReportClean` (l. 33) — Nettoie un fragment HTML de l'application pour un fichier autonome : retire les appels au panneau de détail
- `capHtmlReport` (l. 44) — Construit et télécharge un rapport HTML autonome à onglets.

## 27-interfaces-calculs.js — 313 lignes

- `capArchLayerOf` (l. 8) — Couche ARCADIA d'un élément XML, déduite de l'architecture qui le contient.
- `capBuildIdMap` (l. 17) — Index id → élément XML, sur l'attribut plain « id » ET xmi:id (namespacé).
- `capCsvDownload` (l. 31) — Télécharge un CSV (séparateur « ; », BOM UTF-8 pour Excel).
- `capMatrixBuild` (l. 44) — Construit une matrice composant × composant (N² des interfaces).
- `capDiagHtml` (l. 80) — Rend un rapport de contrôles : sections repliables avec compteur et niveau (ok / avertissement).
- `capDetLink` (l. 97) — Lien HTML cliquable ouvrant le panneau de détail d'un élément Capella.
- `CAP_PORT_ORIENTS` (l. 103) — Valeurs de l'attribut orientation d'un ComponentPort (OrientationPortKind).
- `CAP_ORIENT_STYLE` (l. 105) — Style d'affichage de chaque orientation de port (couleur, libellé, info-bulle).
- `CAP_CEX_DIRS` (l. 112) — Libellés des sens effectifs d'un Component Exchange.
- `capNormOrient` (l. 123) — Normalise l'orientation d'un port Capella : attribut absent (valeur par défaut EMF) → 'UNSET'.
- `capCexDirection` (l. 137) — Déduit le sens effectif d'un Component Exchange à partir des orientations de ses deux ports.
- `capComputeCompExchanges` (l. 156) — Calcule les Component Exchanges : pour chaque ComponentExchange, résout source/target
- `capComputePhysLinks` (l. 243) — Calcule les Physical Links du modèle : pour chaque PhysicalLink, résout les deux

## 28-index-types.js — 113 lignes

- `capRenderIndex` (l. 14) — Construit la vue « Index des types » : barre de recherche, en-têtes triables et
- `capRenderIndexBody` (l. 45) — Rend les lignes de l'Index des types : un type Capella distinct par ligne

## 29-physical-link.js — 297 lignes

- `capRenderPhysLink` (l. 4) — Rend la vue Physical Link avec deux modes (≡ Ligne / ▣ Composant),

## 30-ports.js — 275 lignes

- `capOrientBadge` (l. 11) — Badge d'orientation / de direction d'un port (IN, OUT, INOUT, UNSET), version globale.
- `capComputePortLinks` (l. 22) — Collecte tous les ports du modèle et leurs liens d'allocation et d'échange :
- `capPortsTraceRows` (l. 82) — Construit les lignes de la table de traçabilité : une ligne par couple ComponentPort ↔ FunctionPort,
- `capPortsDiagSections` (l. 99) — Contrôles de cohérence entre les trois niveaux de ports et les allocations d'échanges.
- `capRenderPorts` (l. 146) — Rend la vue 🧩 Ports : table de traçabilité FP ↔ CP ↔ PP, cartes par composant et contrôles de cohérence.

## 31-analyses-traca-capacites.js — 340 lignes

- `CAP_ANA_LAYERS` (l. 8)
- `CAP_TRACE_CATS` (l. 10) — Catégories d'éléments pour la traçabilité, reconnues par le nom de type (toutes versions de Capella).
- `capTraceCatOf` (l. 27) — Catégorie de traçabilité d'un type Capella (ou null).
- `capAnaCtx` (l. 32) — Lit le contexte XML commun (tous les éléments, index des id, résolution de références) avec cache.
- `capAnaEl` (l. 42) — Description courte d'un élément XML pour l'affichage (id, nom, type, couche).
- `capAnaHuman` (l. 44) — Libellé lisible d'un type (Human Type si connu).
- `capComputeTrace` (l. 53) — Calcule les liens de réalisation (tous les types *Realization à source/cible, optionnellement les TransfoLink)
- `capTraceCoverage` (l. 86) — Tableau de couverture : pour chaque catégorie et chaque passage de couche (OA→SA, SA→LA, LA→PA, PA→EPBS),
- `capTracePaths` (l. 110) — Chemins de traçabilité descendants d'une catégorie : une ligne par chemin OA → … → EPBS
- `capRenderTrace` (l. 131) — Rend la sous-vue Traçabilité : couverture par catégorie × couche, chemins de traçabilité, liste des liens.
- `CAP_CAP_TYPES` (l. 207)
- `capComputeCapabilities` (l. 212) — Calcule capacités et missions : fonctions, chaînes, composants/acteurs impliqués (tout type *Involvement,
- `capRenderCapabilities` (l. 252) — Rend la sous-vue Capacités & missions : cartes par couche, matrice d'implication, contrôles de couverture.

## 32-analyses-etats-comparaison.js — 364 lignes

- `capComputeStates` (l. 6) — Calcule les machines à états : régions, états / modes / pseudo-états (imbrication comprise),
- `capStateChecks` (l. 53) — Contrôles d'une machine à états : régions sans état initial, états inatteignables, états sans issue,
- `capStateDiagramSvg` (l. 74) — Diagramme SVG d'une machine à états (disposition en couches, style proche de Capella) :
- `capRenderStates` (l. 138) — Rend la sous-vue Modes & états : diagrammes par machine, matrice de disponibilité des fonctions, contrôles.
- `capDiffIndex` (l. 227) — Indexe un document Capella pour la comparaison : pour chaque élément identifié, type, nom, parent,
- `capDiffCompute` (l. 253) — Compare deux index : éléments ajoutés, supprimés, modifiés (attributs, contenu, type) et déplacés (propriétaire).
- `capRenderDiff` (l. 282) — Rend la sous-vue Comparaison : chargement d'une autre version du modèle, synthèse par type, liste filtrable

## 33-qualite-noms.js — 62 lignes

- `CAP_EN_VERBS` (l. 3) — Verbes anglais courants (forme de base) — sert à reconnaître un nom de fonction commençant par un verbe.
- `CAP_FR_VERBS` (l. 5) — Verbes français en -ir, -re, -oir (les verbes en -er sont reconnus par leur terminaison).
- `CAP_FR_ER_NOUNS` (l. 7) — Noms français en -er qui ne sont pas des verbes (faux positifs de la règle de terminaison).
- `CAP_VAGUE_VERBS` (l. 9) — Verbes jugés trop vagues pour décrire une fonction.
- `capSaveNameRules` (l. 17) — Mémorise les règles de nommage dans un bloc JSON de la page (repris par 💾 Page HTML).
- `capNameQuality` (l. 29) — Analyse la qualité rédactionnelle d'un nom de fonction : verbe en tête (infinitif en français, forme de base en anglais),
- `capFnNQ` (l. 58) — Diagnostic de nom d'une fonction, mis en cache (recalculé si les règles personnalisées changent). Fonctions racines ignorées.

## 34-fonctions.js — 707 lignes

- `capIsCompEl` (l. 3) — Indique si un élément XML est un composant, une entité ou un acteur (porteur d'allocations).
- `capCompAncestors` (l. 11) — Chaîne des composants englobants d'un composant, de la racine (le système) au parent direct.
- `capHtmlToText` (l. 28) — Convertit une description Capella (HTML) en texte brut avec retours à la ligne, sans exécuter de contenu.
- `capComputeFunctions` (l. 40) — Calcule l'inventaire des fonctions de toutes les couches (activités OA, fonctions SA/LA/PA) :
- `capFnMetrics` (l. 95) — Métriques d'une couche de fonctions (les pourcentages de traçabilité ne sont calculés que si la couche voisine est tracée).
- `capFnChecks` (l. 117) — Sections de contrôle qualité des fonctions (chaque règle ne s'applique que si le modèle suit la pratique concernée).
- `capFnAllocKind` (l. 165) — Nature de l'allocation d'une fonction.
- `capFnSubsystems` (l. 176) — Sous-systèmes d'une fonction : chemin des composants englobants sous le système (« A › B »),
- `CAP_FN_AK` (l. 181) — Libellés, icônes et couleurs des natures d'allocation (filtre, liserés, colonne du tableau).
- `capRenderFunctions` (l. 187)
- `capFnDossierHtml` (l. 651) — Dossier fonctionnel HTML autonome : un onglet par couche (sections numérotées et indentées : description,
- `capFillHeight` (l. 676) — Ajuste la hauteur des éléments marqués data-fill pour qu'ils occupent la fenêtre jusqu'en bas.
- `capRenderAnalyses` (l. 686) — Point d'entrée de la vue 🔬 Analyses : barre des sous-vues et routage.

## 35-tableau-de-bord.js — 528 lignes

- `CAP_DASH_PAL` (l. 3) — Palette catégorielle à ordre fixe (contrôlée pour le daltonisme), déclinée pour thèmes clairs et sombres.
- `CAP_DASH_AK` (l. 6) — Couleurs des natures d'allocation (identiques au filtre « Allocation » de ƒ Fonctions).
- `CAP_DASH_VIZ` (l. 8) — Représentations proposées selon la forme de l'indicateur : [clé, libellé, largeur, hauteur par défaut].
- `CAP_DASH_KIND` (l. 16) — Libellés courts des formes d'indicateurs (badges du catalogue).
- `capDashColor` (l. 22) — Couleur de la i-ème série dans la palette du thème courant (au-delà de 8 : gris « Autres »).
- `capDashPct` (l. 28) — Taux arrondi d'éléments vérifiant un prédicat.
- `capDashCount` (l. 34) — Compte les éléments par clé (une ou plusieurs clés par élément) et trie par effectif décroissant.
- `capDashCatalog` (l. 44) — Catalogue de tous les indicateurs disponibles pour le modèle ouvert (fonctions, chaînes, interfaces,
- `capDashValue` (l. 185) — Valeur (mise en cache) d'un indicateur du catalogue ; null si le modèle ne contient pas la donnée.
- `capDashCut` (l. 198) — Échappe un texte et le tronque pour une étiquette de graphique.
- `capDashLevel` (l. 203) — Niveau d'un pourcentage : bon (≥ 90), à surveiller (≥ 50), faible.
- `capDashCats` (l. 209) — Prépare les catégories d'une répartition : tri, limite d'affichage et regroupement en « Autres ».
- `capDashDraw` (l. 223) — Dessine le contenu d'un élément du tableau de bord.
- `capDashSave` (l. 305) — Enregistre les tableaux de bord dans la page (bloc JSON repris par la 💾 Page HTML).
- `capDashUid` (l. 311) — Identifiant court et unique pour un tableau de bord ou un élément.
- `capDashExample` (l. 315) — Tableau de bord d'exemple adapté au modèle ouvert (synthèse de quelques indicateurs clés).
- `capRenderDashboard` (l. 331) — Vue « 📐 Tableau de bord » : tableaux de bord personnalisés (indicateurs, graphiques, tableaux, textes),
- `capDashPrint` (l. 441) — Imprime un tableau de bord au format A4 : les éléments sont redessinés à la taille de la page
- `capDashEditor` (l. 477) — Fenêtre d'ajout ou de configuration d'un élément : catalogue des indicateurs (recherche, groupes),

## 36-component-exchange.js — 338 lignes

- `capAnaReset` (l. 2) — Réinitialise caches et états de la vue Analyses (appelé au chargement d'un nouveau modèle).
- `capRenderCompExchange` (l. 11)

## 37-capella-cablage.js — 38 lignes

- `capOpenDetailById` (l. 7) — Ouvre le panneau de détail Capella pour un des deux IDs fournis (src ou tgt).
