# Index des fonctions (généré par `node tools/index.js` — ne pas modifier à la main)

## 01-donnees-config.js — 42 lignes

- `CAP_HUMAN_NAMES` (l. 9) — Table de correspondance type Capella → {nom humain (h), description (d)}.
- `MODEL` (l. 11)
- `RCFG` (l. 24)
- `TCFG` (l. 25)
- `MODES` (l. 37)

## 02-themes.js — 307 lignes

- `THEMES` (l. 6)
- `capInk` (l. 57) — Couleur de texte lisible sur un fond donné : noir ou blanc, selon le meilleur contraste (WCAG).
- `capTextOn` (l. 67) — Couleur d'un texte coloré lisible sur le fond du thème : assombrie en thème clair.
- `capIsLight` (l. 72) — Indique si le thème courant est clair (couleurs de texte foncées nécessaires).
- `CAP_MIN_CONTRAST` (l. 80) — Contraste minimal visé pour un texte coloré (WCAG AA, texte courant).
- `capParseColor` (l. 85) — Décompose une couleur CSS (#rgb, #rrggbb, rgb(), rgba()) en [r,g,b,a].
- `capLuminance` (l. 94) — Luminance relative WCAG d'une couleur [r,g,b].
- `capContrast` (l. 96) — Rapport de contraste WCAG entre deux couleurs [r,g,b].
- `capBlend` (l. 98) — Superpose une couleur semi-transparente [r,g,b,a] sur un fond opaque [r,g,b,1].
- `capHex` (l. 100) — Couleur [r,g,b] → #rrggbb.
- `capReadableOn` (l. 107) — Couleur de texte lisible sur un fond donné, en conservant la teinte : foncée sur fond clair, éclaircie
- `capEffectiveBg` (l. 121) — Fond effectif (opaque) derrière un élément : superpose les fonds semi-transparents de ses ancêtres.
- `capFixContrast` (l. 133) — Corrige le contraste des textes colorés en ligne (style="color:…") d'un sous-arbre, en thème clair.
- `capRestoreContrast` (l. 149) — Rend leurs couleurs d'origine aux textes corrigés par capFixContrast (retour à un thème sombre).
- `capContrastCss` (l. 156) — Génère, pour le thème clair courant, des règles qui foncent les couleurs de texte fixes des feuilles
- `applyTheme` (l. 198) — Applique le thème visuel global (dark/light/dracula/solarized/nord).
- `applyMode` (l. 243) — Bascule entre les modes d'affichage : default (Relation Map), PBS, capella.
- `tv` (l. 305) — Lit la valeur d'une variable CSS (ex: --c-text). @param {string} varName

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

## 07-rm-panneau-criteres.js — 251 lignes

- `buildPanel` (l. 7) — Reconstruit entièrement le panneau gauche : critères de relation, types d'éléments.
- `capShowChainInMap` (l. 239) — Visualise une chaîne fonctionnelle dans la Relation Map en préservant ses ramifications

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

## 09-arborescence.js — 704 lignes

- `typeIcon` (l. 5) — Retourne l'icône associée à un type d'élément (définie dans TCFG). @param {string} t
- `migratePkgsToElements` (l. 11) — Migre l'ancien format packages[] vers le nouveau format elements[] avec type='Package'.
- `buildPropertiesPanel` (l. 41) — Remplit le panneau Propriétés avec les attributs de l'élément sélectionné (S.propEl).
- `_arboInlineRename` (l. 170) — Active le renommage en place d'un nœud de l'arborescence (Entrée valide, Échap annule).
- `buildArbo` (l. 185) — Construit l'arborescence gauche à partir de MODEL.elements.
- `arboExpandAll` (l. 359) — Développe tous les nœuds de l'arborescence gauche.
- `arboCollapseAll` (l. 362) — Réduit tous les nœuds de l'arborescence gauche au premier niveau.
- `arboRenameEl` (l. 368) — Renomme un élément dans MODEL et met à jour l'arbo et le graphe.
- `arboAddPkg` (l. 379) — Crée un nouveau package (type='Package') enfant d'un élément existant.
- `arboAddEl` (l. 393) — Crée un nouvel élément enfant dans l'arborescence.
- `arboDeleteEl` (l. 408) — Supprime un élément et toutes ses relations de MODEL, puis met à jour l'UI.
- `arboClearMultiSel` (l. 426) — Vide la sélection multiple de l'arborescence et met à jour l'affichage.
- `arboUpdateMselBar` (l. 429) — Met à jour la barre de compteur de sélection multiple sous l'en-tête Arborescence.
- `arboMoveEls` (l. 441) — Déplace un GROUPE d'éléments vers un nouvel owner en conservant la hiérarchie interne :
- `arboParseClipboardList` (l. 469) — Découpe un texte de presse-papier en liste de noms : une ligne = un élément.
- `arboPasteListInto` (l. 477) — Crée une liste d'éléments enfants sous un owner (un nom par ligne du presse-papier).
- `arboConvertSelectedType` (l. 497) — Change le type de tous les éléments d'un ensemble d'ids (hors packages).
- `arboShowCtxMenu` (l. 516) — Affiche le menu contextuel (clic droit) d'un élément de l'arborescence.
- `arboMoveEl` (l. 638) — Déplace un élément unique vers un nouvel owner par glisser-déposer : met à jour
- `rmSetElemVal` (l. 664) — Écrit une valeur dans un champ d'un élément du modèle de la Relation Map (nom, type, parent,
- `onModelChanged` (l. 700) — Callback appelé après toute modification du modèle : rebuildTree, buildArbo, buildPanel.

## 11-sauvegarde-toolbar-init.js — 263 lignes

- `saveJSON` (l. 5) — Sérialise MODEL, RCFG, TCFG et S en JSON et télécharge le fichier.
- `loadJSON` (l. 19) — Charge un fichier JSON et restaure l'état complet de l'application.
- `applyDepth` (l. 106) — Applique la profondeur d'exploration du graphe (bornée entre 1 et 10),
- `openHelpModal` (l. 149) — Ouvre la fenêtre d'aide, éventuellement sur un onglet donné.
- `positionOverlay` (l. 245) — Positionne #capella-overlay sous #toolbar en lisant sa hauteur réelle.

## 20-capella-chargement.js — 818 lignes

- `CAP_LAYERS` (l. 4)
- `CAP_NS_LAYER` (l. 12)
- `CAP_ANCESTOR_KW` (l. 13)
- `CAP_ATTR_KEYS` (l. 14)
- `CAP_TECHNICAL_TYPES` (l. 15)
- `CAP_PKG_TYPES` (l. 16)
- `CAP_TYPE_ICON` (l. 17)
- `capBuildPageHtml` (l. 36) — Construit le HTML de la page actuelle (tout le HTML/CSS/JS de l'application), fichier
- `capPageFileName` (l. 104) — Nom de fichier proposé pour la page sauvegardée.
- `capSaveFullPage` (l. 106) — Sauvegarde la page en la téléchargeant (dossier Téléchargements du navigateur).
- `capSavePageDirect` (l. 120) — Enregistre la page directement dans un fichier choisi une fois (API File System Access d'Edge/Chrome),
- `capEsc` (l. 150) — Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s
- `capLoadFile` (l. 166) — Charge un fichier Capella (depuis l'explorateur ou un glisser-déposer) : vérifie
- `capApplyXmlDoc` (l. 206) — Remplace le modèle affiché par un document XML Capella déjà analysé : vide les caches,
- `capShowWelcome` (l. 231) — Affiche ou masque l'écran d'accueil. Quand un modèle est déjà chargé, l'écran
- `capWelcomeStatus` (l. 242) — Affiche un message d'état (chargement, erreur) dans la zone de dépôt.
- `capUpdateWelcome` (l. 248) — Synchronise l'écran d'accueil avec l'état de chargement (appelé au démarrage,
- `XSI_NS` (l. 290)
- `capXType` (l. 292) — Lit l'attribut xsi:type d'un élément XML Capella (plain ou namespacé).
- `capTName` (l. 294) — Extrait le nom court du type (après ':') depuis xsi:type. Ex: 'pa:PhysicalComponent' → 'PhysicalComponent'.
- `capXId` (l. 296) — Lit l'ID d'un élément XML Capella (attribut plain 'id' ou xmi:id namespacé).
- `capXName` (l. 298) — Lit l'attribut 'name' d'un élément XML Capella.
- `capResolveLayer` (l. 303) — Détermine la couche ARCADIA (OA/SA/LA/PA/EPBS/Shared) d'un élément
- `capGetAttrs` (l. 309) — Extrait les attributs pertinents d'un élément XML Capella (définis dans CAP_ATTR_KEYS).
- `capBuildTree` (l. 320) — Construit récursivement l'arbre d'éléments Capella depuis le XML.
- `capRunBulk` (l. 346) — Exécute fn en mode chargement groupé puis reconstruit une fois le panneau (qui reconstruit l'arborescence).
- `capBuildTypeRegistry` (l. 356) — Construit capTypeRegistry : {type → {count, layer, checked}} depuis capAllElements.
- `capApplyPanelOnLoad` (l. 376) — Appelée après le chargement Capella : configure le panneau gauche RM.
- `capInjectToArbo` (l. 448) — Injecte les éléments Capella dans MODEL.elements pour qu'ils apparaissent
- `capInjectCapellaRelsToCriteria` (l. 552) — Ajoute les types de relations Capella (PC NODE→PC NODE, etc.) dans RCFG
- `capInjectLinksToModel` (l. 593) — Calcule les liens Capella via capComputeLinks() et les injecte dans MODEL.relations
- `capFilterArboToLinked` (l. 637) — Filtre MODEL.elements pour ne conserver que les éléments _capella référencés
- `capInjectChainsToModal` (l. 676) — Calcule les chaînes (FunctionalChain, OperationalProcess, PhysicalPath)
- `capRenderCurrentView` (l. 737) — Dispatche le rendu vers la vue Capella active (cards/table/tree/links/chains/physlink).
- `capUpdateStatChips` (l. 809) — Met à jour les puces de comptage OA/SA/LA/PA/EPBS/Shared/total dans la sous-barre.

## 21-capella-vues-base.js — 1346 lignes

- `capRenderSidebar` (l. 5) — Rend la sidebar Capella : liste des types par couche avec cases à cocher.
- `capGetFiltered` (l. 57) — Retourne capAllElements filtré par types activés, couche et texte de recherche.
- `capRenderCards` (l. 69) — Rend la vue Cartes : cartes groupées par couche ARCADIA, filtrées.
- `CAP_TABLE_BUILTIN_COLS` (l. 104) — Colonnes affichées par défaut (Name en premier ; Couche, Type et Human Type restent proposées dans ⊞ Colonnes).
- `capGetAllRawAttrKeys` (l. 120) — Calcule dynamiquement la liste de TOUS les noms d'attributs présents dans capAllElements
- `capGetParentIndex` (l. 133) — Construit l'index de containment du modèle Capella depuis le XML brut :
- `capGetMetachainMetaclasses` (l. 156) — Retourne la liste des "Metaclass" (types Capella) disponibles au démarrage d'une étape :
- `capGetElementById_` (l. 177) — Retrouve un élément Capella par son identifiant XML. S'appuie sur un index id → élément
- `capParseAttrRefs_` (l. 186) — Découpe la valeur brute d'un attribut XML en liste d'IDs candidats (gère les attributs
- `capGetAttrRefProperties` (l. 194) — Détecte, pour un Metaclass donné, les attributs XML bruts dont la valeur référence
- `capGetViaIntermediateProperties` (l. 227) — Détecte le pattern "navigation via élément intermédiaire" : un type X (différent du
- `capGetOwnerProperties` (l. 265) — Détecte tous les types d'ANCÊTRES réellement rencontrés en remontant le containment XML
- `capGetIncomingRefProperties` (l. 295) — Détecte les RÉFÉRENCES ENTRANTES : pour un metaclass M, trouve tous les types X dont un
- `capGetMetachainProperties` (l. 330) — Retourne toutes les Properties navigables depuis un Metaclass : valeurs terminales,
- `capResolveStep` (l. 421) — Exécute UN pas de navigation (une Property) à partir d'un élément capAllElements donné.
- `capExtractValue` (l. 497) — Extrait une valeur terminale "simple" d'un élément capAllElements (Name, ID, Type,
- `capResolveMetachain` (l. 513) — Exécute une chaîne de Properties (metachain) à partir d'un élément. Le 1er pas n'est
- `capTableGetValArray` (l. 537) — Retourne TOUJOURS un tableau de valeurs pour une colonne donnée (même les colonnes à valeur
- `capTableGetVal` (l. 571) — Retourne la valeur d'une colonne sous forme de string unique (jointe par ', ' si plusieurs
- `capTableColLabel` (l. 576) — Libellé humain affiché en en-tête pour une colonne donnée.
- `capBuildTableToolbar` (l. 589) — Construit la barre d'outils au-dessus du tableau Capella : bouton de sélection des
- `capRefreshColPickerList` (l. 689) — Reconstruit uniquement la liste interne du menu ⊞ Colonnes (#cap-colpicker-list),
- `capApplyColResize` (l. 767) — Ajoute une poignée de redimensionnement sur le bord droit d'un <th> du tableau Capella.
- `capRenderCustomColStepRow` (l. 797) — Construit une ligne du metachain : <select> Metaclass + <select> Property + suppression.
- `capRenderCustomColPanel` (l. 863) — Reconstruit entièrement le panneau : recalcule le metaclass imposé de chaque ligne à partir
- `CAP_PP_MAX_CHIPS` (l. 890)
- `CAP_PP_MAX_OPTS` (l. 891)
- `capPpCapAdapter` (l. 896) — Adaptateur de l'aperçu pour le ▤ Tableau Capella (capAllElements, moteur cap…).
- `capPpTrace` (l. 915) — Déroule le chemin pas à pas depuis un élément, en gardant chaque niveau intermédiaire
- `capPpHasResult` (l. 934) — Indique si un élément donne un résultat non vide pour le chemin (cellule remplie).
- `capPpRender` (l. 944) — Rend la zone « 👁 Aperçu en direct » d'un panneau de colonne par chemin : choix de
- `capPpRenderBody` (l. 1012) — Rend le corps de l'aperçu : remplissage estimé sur le type de départ, puis le chemin
- `capOpenCustomColPanel` (l. 1083) — Ouvre le panneau latéral de construction de colonne personnalisée (Metachain Navigation).
- `capCloseCustomColPanel` (l. 1108) — Ferme le panneau latéral d'édition de colonne Metachain de la vue Tableau.
- `capSaveTableView` (l. 1149) — Sérialise la configuration actuelle de la vue Tableau Capella (colonnes visibles, colonnes
- `capLoadTableView` (l. 1171) — Charge une configuration de vue Tableau Capella précédemment sauvegardée et l'applique.
- `capRenderTable` (l. 1190) — Rend intégralement la vue Tableau Capella : barre d'outils (colonnes, colonne perso,
- `capRenderTableBodyOnly` (l. 1199) — Reconstruit uniquement le <thead>/<tbody> du tableau Capella (pas la toolbar ni le menu
- `capRenderTree` (l. 1296) — Rend la vue Arborescence Capella (hiérarchie XML complète).
- `capRenderTreeNode` (l. 1307) — Rend récursivement un nœud de l'arborescence Capella.

## 22-capella-liens.js — 280 lignes

- `CAP_LINK_SECTIONS` (l. 2)
- `CAP_LINK_GROUPS` (l. 41) — Groupes de relations affichés dans la barre de la vue 🔗 Liens (ordre d'affichage).
- `capComputeLinks` (l. 54) — Extrait et résout toutes les relations Capella depuis le XML :
- `capRenderLinks` (l. 201) — Rend la vue Liens : barre (recherche, filtres groupés par famille de relations, export)

## 23-chaines.js — 537 lignes

- `CAP_CHAIN_COLORS` (l. 2)
- `CAP_CHAIN_LABELS` (l. 3)
- `CAP_ACTOR_TYPES` (l. 4)
- `CAP_CHAIN_ARCH` (l. 5)
- `CAP_CHAIN_KIND` (l. 9) — Couleurs des boîtes, reprises des diagrammes Capella : bleu = élément porté par un acteur,
- `capIsActorEl` (l. 29) — Indique si un composant XML est un acteur (attribut actor="true" des versions récentes
- `capBuildFunctionAllocationIndex` (l. 41) — Construit l'index fonction → composant allocataire à partir des ComponentFunctionalAllocation
- `capComputeChains` (l. 59) — Extrait les chaînes (FunctionalChain, OperationalProcess, PhysicalPath) sous forme de GRAPHE
- `capChainLayout` (l. 179) — Calcule une disposition en couches (Sugiyama simplifié) d'un graphe de chaîne :
- `capWrapLines` (l. 255) — Découpe un nom en lignes pour l'affichage dans une boîte.
- `capChainDiagramSvg` (l. 269) — Produit le diagramme SVG d'une chaîne dans le style Capella (haut → bas) : boîtes bleues
- `capChainsFiltered` (l. 381) — Retourne les chaînes après application des filtres de type et de catégorie ARCADIA,
- `capChainFnCount` (l. 390) — Nombre de fonctions (ou de composants pour un Physical Path) impliquées dans la chaîne.
- `capChainIsEmpty` (l. 392) — Vrai si la chaîne est vide : aucune fonction (ou composant) ni échange impliqué.
- `capChainEmptyOk` (l. 394) — Vrai si la chaîne passe le filtre de contenu (toutes / non vides / vides).
- `CAP_CHAIN_LAYER_ORDER` (l. 395)
- `capChainLayerInfo` (l. 397) — Libellé et couleurs d'une catégorie ARCADIA de chaîne ('?' = non classée).
- `capChainLayerBadge` (l. 401) — Badge coloré de catégorie ARCADIA (OA, SA, LA, PA…).
- `capRenderChains` (l. 408) — Rend la vue Chaînes : filtres (type + catégorie ARCADIA), légende et bascule entre les
- `capRenderChainCards` (l. 453) — Construit le HTML des cartes de chaînes, regroupées par catégorie ARCADIA
- `capChainCardBody` (l. 484) — Rend le contenu d'une carte ouverte : entrées/sorties, diagramme et table des échanges.
- `capWireChainCards` (l. 518) — Attache l'ouverture/fermeture des cartes (rendu paresseux du diagramme) et la navigation.

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

## 25-panneau-detail.js — 188 lignes

- `capOpenDetail` (l. 5) — Ouvre le panneau de détail (colonne droite de l'overlay) pour un élément Capella.
- `capOpenDetailNode` (l. 97) — Ouvre le panneau de détail à partir d'un nœud de l'arborescence Capella.
- `CAP_ELEM_VIEWS` (l. 105)
- `capUpdateToolbarForView` (l. 111) — Met à jour les boutons actifs et les groupes de contrôles visibles
- `capShowView` (l. 142) — Affiche une vue Capella (bascule en mode capella si besoin).

## 26-rapports-html.js — 101 lignes

- `capReportCss` (l. 18) — Récupère les règles CSS de l'application utiles aux rapports (classes des vues d'interfaces, chaînes, contrôles).
- `capReportClean` (l. 33) — Nettoie un fragment HTML de l'application pour un fichier autonome : retire les appels au panneau de détail
- `capHtmlReport` (l. 44) — Construit et télécharge un rapport HTML autonome à onglets.

## 27-interfaces-calculs.js — 325 lignes

- `capArchLayerOf` (l. 8) — Couche ARCADIA d'un élément XML, déduite de l'architecture qui le contient.
- `capBuildIdMap` (l. 17) — Index id → élément XML, sur l'attribut plain « id » ET xmi:id (namespacé).
- `capCsvDownload` (l. 31) — Télécharge un CSV (séparateur « ; », BOM UTF-8 pour Excel).
- `capMatrixBuild` (l. 44) — Construit une matrice composant × composant (N² des interfaces).
- `capFoldList` (l. 81) — Liste repliable d'éléments HTML séparés par des virgules : au-delà de `max`, le reste est masqué derrière « +N autres » (clic pour déplier /
- `capDiagHtml` (l. 92) — Rend un rapport de contrôles : sections repliables avec compteur et niveau (ok / avertissement).
- `capDetLink` (l. 109) — Lien HTML cliquable ouvrant le panneau de détail d'un élément Capella.
- `CAP_PORT_ORIENTS` (l. 115) — Valeurs de l'attribut orientation d'un ComponentPort (OrientationPortKind).
- `CAP_ORIENT_STYLE` (l. 117) — Style d'affichage de chaque orientation de port (couleur, libellé, info-bulle).
- `CAP_CEX_DIRS` (l. 124) — Libellés des sens effectifs d'un Component Exchange.
- `capNormOrient` (l. 135) — Normalise l'orientation d'un port Capella : attribut absent (valeur par défaut EMF) → 'UNSET'.
- `capCexDirection` (l. 149) — Déduit le sens effectif d'un Component Exchange à partir des orientations de ses deux ports.
- `capComputeCompExchanges` (l. 168) — Calcule les Component Exchanges : pour chaque ComponentExchange, résout source/target
- `capComputePhysLinks` (l. 255) — Calcule les Physical Links du modèle : pour chaque PhysicalLink, résout les deux

## 28-index-types.js — 113 lignes

- `capRenderIndex` (l. 14) — Construit la vue « Index des types » : barre de recherche, en-têtes triables et
- `capRenderIndexBody` (l. 45) — Rend les lignes de l'Index des types : un type Capella distinct par ligne

## 29-physical-link.js — 305 lignes

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

## 32-analyses-etats-comparaison.js — 324 lignes

- `capComputeStates` (l. 6) — Calcule les machines à états : régions, états / modes / pseudo-états (imbrication comprise),
- `capStateChecks` (l. 53) — Contrôles d'une machine à états : régions sans état initial, états inatteignables, états sans issue,
- `capStateDiagramSvg` (l. 74) — Diagramme SVG d'une machine à états (disposition en couches, style proche de Capella) :
- `capRenderStates` (l. 138) — Rend la sous-vue Modes & états : diagrammes par machine, matrice de disponibilité des fonctions, contrôles.
- `capDiffIndex` (l. 227) — Indexe un document Capella pour la comparaison : pour chaque élément identifié, type, nom, parent,
- `capDiffCompute` (l. 253) — Compare deux index : éléments ajoutés, supprimés, modifiés (attributs, contenu, type) et déplacés (propriétaire).
- `capRenderDiff` (l. 287) — Rend la sous-vue Comparaison : chargement d'une autre version du modèle (ancienne / nouvelle, ⇄ pour inverser),

## 33-qualite-noms.js — 62 lignes

- `CAP_EN_VERBS` (l. 3) — Verbes anglais courants (forme de base) — sert à reconnaître un nom de fonction commençant par un verbe.
- `CAP_FR_VERBS` (l. 5) — Verbes français en -ir, -re, -oir (les verbes en -er sont reconnus par leur terminaison).
- `CAP_FR_ER_NOUNS` (l. 7) — Noms français en -er qui ne sont pas des verbes (faux positifs de la règle de terminaison).
- `CAP_VAGUE_VERBS` (l. 9) — Verbes jugés trop vagues pour décrire une fonction.
- `capSaveNameRules` (l. 17) — Mémorise les règles de nommage dans un bloc JSON de la page (repris par 💾 Page HTML).
- `capNameQuality` (l. 29) — Analyse la qualité rédactionnelle d'un nom de fonction : verbe en tête (infinitif en français, forme de base en anglais),
- `capFnNQ` (l. 58) — Diagnostic de nom d'une fonction, mis en cache (recalculé si les règles personnalisées changent). Fonctions racines ignorées.

## 34-fonctions.js — 745 lignes

- `capIsCompEl` (l. 3) — Indique si un élément XML est un composant, une entité ou un acteur (porteur d'allocations).
- `capCompAncestors` (l. 11) — Chaîne des composants englobants d'un composant, de la racine (le système) au parent direct.
- `capHtmlToText` (l. 28) — Convertit une description Capella (HTML) en texte brut avec retours à la ligne, sans exécuter de contenu.
- `capComputeFunctions` (l. 40) — Calcule l'inventaire des fonctions de toutes les couches (activités OA, fonctions SA/LA/PA) :
- `capFnMetrics` (l. 95) — Métriques d'une couche de fonctions (les pourcentages de traçabilité ne sont calculés que si la couche voisine est tracée).
- `capFnChecks` (l. 117) — Sections de contrôle qualité des fonctions (chaque règle ne s'applique que si le modèle suit la pratique concernée).
- `capFnAllocKind` (l. 165) — Nature de l'allocation d'une fonction.
- `capFnSubsystems` (l. 176) — Sous-systèmes d'une fonction : chemin des composants englobants sous le système (« A › B »),
- `CAP_FN_AK` (l. 181) — Libellés, icônes et couleurs des natures d'allocation (filtre, liserés, colonne du tableau).
- `capRenderFunctions` (l. 191) — Rend la vue ƒ Fonctions dans son conteneur : hiérarchie, tableau façon Excel, traçabilité, métriques,
- `capFnDossierHtml` (l. 655) — Dossier fonctionnel HTML autonome : un onglet par couche (sections numérotées et indentées : description,
- `capFillHeight` (l. 680) — Ajuste la hauteur des éléments marqués data-fill pour qu'ils occupent la fenêtre jusqu'en bas.
- `CAP_ANA_SUBS` (l. 690) — Sous-vues de 🔬 Analyses (onglets) ; « fns » ouvre la vue ƒ Fonctions, qui garde son propre conteneur.
- `capAnaTabsHtml` (l. 695) — Onglets des sous-vues de 🔬 Analyses (communs à la vue 🔬 Analyses et à la vue ƒ Fonctions).
- `capAnaTabOpen` (l. 702) — Ouvre une sous-vue de 🔬 Analyses depuis ses onglets (ƒ Fonctions : vue à part).
- `capRenderFunctionsView` (l. 711) — Vue « ƒ Fonctions » (onglet de 🔬 Analyses) : hiérarchie, tableau,
- `capRenderAnalyses` (l. 722) — Point d'entrée de la vue 🔬 Analyses : barre des sous-vues et routage.

## 35-tableau-de-bord.js — 560 lignes

- `CAP_DASH_PAL` (l. 3) — Palette catégorielle à ordre fixe (contrôlée pour le daltonisme), déclinée pour thèmes clairs et sombres.
- `CAP_DASH_AK` (l. 6) — Couleurs des natures d'allocation (identiques au filtre « Allocation » de ƒ Fonctions).
- `CAP_DASH_VIZ` (l. 8) — Représentations proposées selon la forme de l'indicateur : [clé, libellé, largeur, hauteur par défaut].
- `CAP_DASH_KIND` (l. 16) — Libellés courts des formes d'indicateurs (badges du catalogue).
- `capDashColor` (l. 22) — Couleur de la i-ème série dans la palette du thème courant (au-delà de 8 : gris « Autres »).
- `capDashPct` (l. 28) — Taux arrondi d'éléments vérifiant un prédicat.
- `capDashCount` (l. 34) — Compte les éléments par clé (une ou plusieurs clés par élément) et trie par effectif décroissant.
- `capDashCatalog` (l. 44) — Catalogue de tous les indicateurs disponibles pour le modèle ouvert (fonctions, chaînes, interfaces,
- `capDashValue` (l. 190) — Valeur (mise en cache) d'un indicateur du catalogue ; null si le modèle ne contient pas la donnée.
- `capDashCut` (l. 203) — Échappe un texte et le tronque pour une étiquette de graphique.
- `capDashLevel` (l. 208) — Niveau d'un pourcentage : bon (≥ 90), à surveiller (≥ 50), faible.
- `capDashCats` (l. 214) — Prépare les catégories d'une répartition : tri, limite d'affichage et regroupement en « Autres ».
- `capDashDraw` (l. 228) — Dessine le contenu d'un élément du tableau de bord.
- `capDashSave` (l. 310) — Enregistre les tableaux de bord dans la page (bloc JSON repris par la 💾 Page HTML).
- `capDashUid` (l. 316) — Identifiant court et unique pour un tableau de bord ou un élément.
- `capDashExample` (l. 320) — Tableau de bord d'exemple adapté au modèle ouvert (synthèse de quelques indicateurs clés).
- `capRenderDashboard` (l. 338) — Vue « 📐 Tableau de bord » : tableaux de bord personnalisés (indicateurs, graphiques, tableaux, textes),
- `capDashPrint` (l. 464) — Imprime un tableau de bord au format A4 : les éléments sont redessinés à la taille de la page
- `capDashEditor` (l. 501) — Fenêtre d'ajout ou de configuration d'un élément : catalogue des indicateurs (recherche, groupes),

## 36-component-exchange.js — 366 lignes

- `capAnaReset` (l. 2) — Réinitialise caches et états de la vue Analyses (appelé au chargement d'un nouveau modèle).
- `capBehaviorExchanges` (l. 11) — Component Exchanges du périmètre de la vue 🔀 Behavior Exchange : couche PA, entre Physical Components
- `capRenderCompExchange` (l. 26) — Rend la vue Component Exchange — même structure que Physical Link (≡ Ligne / ▣ Composant,

## 37-capella-cablage.js — 38 lignes

- `capOpenDetailById` (l. 7) — Ouvre le panneau de détail Capella pour un des deux IDs fournis (src ou tgt).

## 38-theme-perso.js — 127 lignes

- `CAP_THEME_FIELDS` (l. 7) — Variables de couleur personnalisables : [variable CSS, libellé, groupe].
- `CAP_THEME_LAYERS` (l. 16) — Couches ARCADIA dont la couleur est personnalisable : [clé CAP_LAYERS, libellé].
- `capThemeSave` (l. 24) — Enregistre le thème personnalisé dans la page (bloc JSON repris par la 💾 Page HTML).
- `capThemeRegister` (l. 30) — Déclare (ou retire) le thème personnalisé dans THEMES et dans le sélecteur de thème.
- `capThemeLayerDefaults` (l. 40) — Couleurs d'origine des couches ARCADIA (mémorisées au premier appel).
- `capThemeLayersApply` (l. 48) — Applique les couleurs de couches du thème personnalisé (ou celles d'origine pour un autre thème)
- `capThemeEditor` (l. 59) — Ouvre l'éditeur du thème personnalisé : toutes les couleurs regroupées (fonds, textes, statuts,

## 39-exigences-donnees.js — 641 lignes

- `capXtPlain` (l. 14) — Convertit un texte riche (HTML des exigences, linkedText) en texte brut.
- `capXtShort` (l. 25) — Texte tronqué avec info-bulle portant le texte complet.
- `capXtLinks` (l. 34) — Liste repliable de liens vers des éléments (avec badge de couche si demandé).
- `capXtTable` (l. 44) — Tableau HTML simple (classe .ana-t).
- `capXtViewBtns` (l. 54) — Boutons de choix de vue.
- `capXtLayerBtns` (l. 62) — Boutons de filtre par couche ARCADIA (seulement les couches présentes).
- `capXtSelect` (l. 74) — Liste déroulante liée à une clé de l'état de la vue.
- `capXtBind` (l. 83) — Branche les commandes d'une sous-vue (vue, couche, listes, cases, recherche, CSV).
- `capXtBar` (l. 98) — Barre de commandes standard d'une sous-vue.
- `capXtSearch` (l. 107) — Champ de recherche standard.
- `capXtHas` (l. 109) — Vrai si la recherche (minuscules) figure dans l'un des textes.
- `capXtId` (l. 111) — Identifiant d'un élément XML, ou '' s'il est absent.
- `capXtDePart` (l. 113) — Élément courant résolu : un Part renvoie au composant qu'il type.
- `capReqIfName` (l. 118) — Nom ReqIF lisible d'un élément du Requirements Viewpoint (type, attribut, valeur…).
- `capComputeRequirements` (l. 124) — Calcule les exigences des deux familles (Requirements Viewpoint et exigences Capella de base),
- `capReqChecks` (l. 177) — Sections de contrôle des exigences (réutilisées par le tableau de bord).
- `capRenderRequirements` (l. 203) — Rend la sous-vue 📑 Exigences : liste filtrable, couverture par couche, contrôles.
- `CAP_PV_ARCH` (l. 243)
- `capPvValue` (l. 250) — Valeur lisible d'une PropertyValue Capella (valeur par défaut EMF si absente).
- `capPvUnit` (l. 258) — Unité d'une propriété PVMT (sous-propriété « __UNIT__ » de la propriété ou de sa définition).
- `capComputePvmt` (l. 267) — Calcule les propriétés PVMT : définitions (domaines, groupes, propriétés, applicabilité)
- `capPvMissing` (l. 306) — Éléments auxquels un groupe PVMT s'applique (classes et architectures déclarées) sans l'avoir reçu.
- `capPvChecks` (l. 320) — Sections de contrôle des propriétés PVMT (réutilisées par le tableau de bord).
- `capRenderPvmt` (l. 336) — Rend la sous-vue 🏷 Propriétés : grille par groupe (une colonne par propriété), synthèse, définitions, contrôles.
- `CAP_DM_TYPES` (l. 386)
- `capComputeDataModel` (l. 392) — Calcule le modèle de données : Exchange Items (éléments, échanges et interfaces qui les portent),
- `capDmChecks` (l. 443) — Sections de contrôle du modèle de données et des interfaces (réutilisées par le tableau de bord).
- `capRenderDataModel` (l. 472) — Rend la sous-vue 🗃 Données & interfaces : Exchange Items, interfaces, classes et types, contrôles.
- `capComputeConstraints` (l. 515) — Calcule les contraintes : expression (liens linkedText résolus), langage, éléments contraints, propriétaire.
- `capCtChecks` (l. 544) — Sections de contrôle des contraintes (réutilisées par le tableau de bord).
- `capRenderConstraints` (l. 561) — Rend la sous-vue ⛓ Contraintes : liste filtrable et contrôles.
- `capXtDetail` (l. 584) — Sections supplémentaires du panneau de détail : exigences liées, propriétés, contraintes.
- `capXtDashCatalog` (l. 613) — Ajoute au catalogue du tableau de bord les indicateurs Exigences, Propriétés, Données & interfaces, Contraintes.

## 40-suivi-fichier.js — 546 lignes

- `capWatchHash` (l. 30) — Empreinte rapide d'un texte (FNV-1a 32 bits + longueur), pour reconnaître une version déjà vue.
- `capWatchTime` (l. 37) — Heure lisible (hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes
- `capWatchDate` (l. 39) — Date et heure lisibles (jj/mm hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes
- `capWatchCounts` (l. 43) — Compte les différences par statut. @param {object[]} diff - Résultat de capDiffCompute
- `capWatchLite` (l. 53) — Copie allégée d'un delta (sans les nœuds XML), pour le garder en mémoire sans retenir les anciens documents.
- `capWatchChips` (l. 58) — Pastilles ➕ ➖ ✎ ↪ d'un comptage. @param {object} c - Comptage capWatchCounts @returns {string} HTML
- `capWatchSetSource` (l. 69) — Enregistre la source suivie après le chargement d'un modèle (remet le suivi à zéro).
- `capWatchArm` (l. 82) — (Ré)arme la vérification périodique selon les réglages.
- `capIsMobile` (l. 90) — Vrai sur téléphone / tablette : leurs sélecteurs ne connaissent pas l'extension .capella et grisent ces fichiers
- `capPickCapellaFile` (l. 99) — Ouvre un fichier Capella à charger : sélecteur avec accès direct (Edge/Chrome, permet le 🔄 suivi),
- `capWatchPickerFailed` (l. 113) — Repli quand le sélecteur à accès direct a été refusé : tente le sélecteur classique (le navigateur peut
- `capWatchPick` (l. 124) — Demande un fichier .capella avec le sélecteur à accès direct quand le navigateur le permet.
- `capWatchReadDisk` (l. 142) — Lit l'état du fichier suivi sur le disque.
- `capWatchCheck` (l. 161) — Vérifie si le fichier suivi a changé et, le cas échéant, prépare la mise à jour (delta + notification).
- `capWatchRegister` (l. 202) — Analyse une nouvelle version lue sur le disque et l'ajoute aux enregistrements en attente :
- `CAP_WATCH_SAME_MIN` (l. 229)
- `capWatchCommon` (l. 236) — Part des éléments identifiés communs aux deux versions (rapportée à la plus grande).
- `capWatchSuspectHtml` (l. 246) — Avertissement (HTML) quand la nouvelle version partage trop peu d'éléments avec le modèle affiché.
- `capWatchPickNewVersion` (l. 253) — Choisit manuellement la nouvelle version du fichier (accès limité, page sauvegardée, fichier déplacé) :
- `capWatchApply` (l. 278) — Applique la version en attente : recharge le modèle (vue courante conservée), archive le delta dans l'historique
- `capWatchOpenCompare` (l. 304) — Ouvre ⚖ Comparaison de versions (🔬 Analyses) sur deux versions connues du suivi.
- `capWatchUpdateUi` (l. 321) — Met à jour le bouton 🔄 Suivi (visibilité, badge, info-bulle).
- `capWatchFlash` (l. 338) — Affiche brièvement un message dans la notification (sans action). @param {string} msg - Message
- `capWatchNote` (l. 347) — Affiche ou masque la notification de mise à jour (coin inférieur droit).
- `capWatchMenu` (l. 377) — Ouvre ou ferme le menu du bouton 🔄 Suivi. @param {boolean} [show] - Forcer l'état (sinon bascule)
- `capWatchMenuRender` (l. 385) — Construit le contenu du menu 🔄 Suivi (état de la source, réglages, historique).
- `capWatchModalClose` (l. 421) — Ferme la fenêtre du delta.
- `capWatchModalRefresh` (l. 425) — Réaffiche la fenêtre du delta si elle montre la version en attente (nouvel enregistrement détecté entre-temps).
- `capWatchShowDelta` (l. 433) — Affiche la fenêtre du delta : version en attente (cumul et enregistrements pas à pas) ou mise à jour de l'historique.
- `capWatchShowHistory` (l. 513) — Affiche l'historique des mises à jour appliquées pendant la session (chacune ouvre son delta).

## 41-barre-vues.js — 293 lignes

- `CAP_NAV_ITEMS` (l. 9) — Catalogue des vues : k = clé (vue capShowView, ou « ana:… » pour une sous-vue de 🔬 Analyses), l = libellé,
- `CAP_NAV_GROUPS` (l. 36) — Menus déroulants de la barre, dans l'ordre d'affichage (id = identifiant du bouton).
- `CAP_NAV_DEFAULT` (l. 44) — Réglage par défaut : tous les menus affichés, ▤ Tableau, ⚡ Chaînes, 🎬 Scénarios et 📐 Tableau de bord en boutons directs
- `capNavMigrate` (l. 54) — Met à jour un réglage de barre enregistré avant l'arrivée du bouton ▤ Tableau (ancienne 📊 Table View
- `capNavSave` (l. 60) — Enregistre le réglage de la barre dans la page (bloc JSON repris par la 💾 Page HTML).
- `capNavCurKey` (l. 70) — Clé de la vue Capella affichée (« ana:… » pour une sous-vue de 🔬 Analyses).
- `capNavOpen` (l. 78) — Ouvre une vue du catalogue (ou la Relation Map pour la clé @rm).
- `capNavGroupOpen` (l. 88) — Ouvre la vue d'un menu (clic sur son nom) : la dernière vue non épinglée utilisée, sinon la première non épinglée.
- `capNavFluxTabs` (l. 98) — Onglets du menu 📡 Flux & interfaces (comme ceux de 🔬 Analyses) : vues du menu non épinglées,
- `capNavRender` (l. 108) — Reconstruit les boutons de la barre des vues selon le réglage (menus, épingles).
- `capNavSync` (l. 131) — Met à jour l'état actif des boutons de la barre (vue affichée, dernière sous-vue de chaque menu).
- `capNavClose` (l. 146) — Ferme le menu déroulant de la barre des vues.
- `capNavRow` (l. 155) — Ligne d'une vue dans un menu : ouverture au clic, 📌 pour l'épingler en bouton direct.
- `capNavMenu` (l. 165) — Ouvre le menu déroulant d'un groupe, ou le menu ☰ (toutes les vues, recherche, réglage).
- `capNavMenuFill` (l. 212) — Remplit le menu ouvert : vues du groupe, ou (menu ☰) réglage complet ou résultats de la recherche.

## 42-tableaux-analyses.js — 154 lignes

- `capTfNorm` (l. 14) — Normalise un texte pour la comparaison (minuscules, sans accents).
- `capTfEnhanceAll` (l. 19) — Équipe les tableaux pas encore traités d'un conteneur.
- `capTfEnhance` (l. 26) — Ajoute la ligne de filtres et les poignées de redimensionnement à un tableau.
- `capTfScrollWrap` (l. 66) — Place le tableau dans un conteneur à défilement horizontal (seule la vue défile verticalement) et lui ajoute
- `capTfHBar` (l. 86) — Barre de défilement horizontal flottante d'un tableau : synchronisée avec son conteneur, affichée seulement
- `capTfFreeze` (l. 106) — Fige les largeurs actuelles des colonnes (avant le premier redimensionnement).
- `capTfWidths` (l. 116) — Applique les largeurs retenues (disposition fixe, le texte passe à la ligne).
- `capTfFilter` (l. 127) — Masque les lignes qui ne correspondent pas aux filtres et affiche le compteur.
- `capTfWatch` (l. 149) — Surveille la zone des sous-vues de 🔬 Analyses pour équiper les tableaux à chaque rendu.

## 43-visite-guidee.js — 450 lignes

- `CAP_TOUR_STEPS` (l. 12) — Étapes de la visite générale : s = sélecteur CSS de la zone (toutes les correspondances visibles sont encadrées
- `CAP_TOUR_EXPLORE` (l. 57) — Étapes communes aux sous-vues de 🧭 Explorateur (onglets, types, recherche, couches).
- `CAP_TOUR_FLUX` (l. 72) — Étapes communes aux vues de 📡 Flux & interfaces (onglets de navigation).
- `CAP_TOUR_ANA_TXT` (l. 75) — Rôle de chaque sous-vue de 🔬 Analyses (texte de l'étape « analyse affichée »).
- `capTourRmCtx` (l. 88) — Visite 🗺 Relation Map : si aucun élément n'est au centre du graphe, en choisit un qui donne un visuel lisible —
- `CAP_TOUR_VIEWS` (l. 102) — Visites contextuelles, par vue : clé = '@rm' ou vue Capella (capCurrentView) ; l = nom de la vue,
- `CAP_TOUR_START` (l. 243) — 🚀 Bien démarrer, 1er temps (sans modèle) : où ouvrir le fichier. Terminer la visite arme la reprise (2e temps).
- `CAP_TOUR_AFTER` (l. 256) — 🚀 Bien démarrer, 2e temps (modèle chargé) : où trouver l'aide et les tutoriels.
- `capTourCtxKey` (l. 273) — Clé de la vue affichée pour les visites contextuelles.
- `capTourCtx` (l. 281) — Visite contextuelle de la vue affichée, si elle existe et qu'un modèle est chargé.
- `capTourEls` (l. 289) — Éléments affichés désignés par le sélecteur d'une étape.
- `capTourVisible` (l. 300) — Indique si une étape est utilisable (zone affichée, ou bulle centrée).
- `capTourStart` (l. 310) — Lance une visite guidée depuis sa première étape.
- `capTourStartView` (l. 331) — Lance la visite de la vue affichée (ou la visite générale s'il n'y en a pas).
- `capTourGo` (l. 339) — Passe à l'étape suivante ou précédente utilisable (les zones non affichées sont sautées).
- `capTourPos` (l. 359) — Numéros (rang, total) de l'étape courante parmi les étapes utilisables.
- `capTourRenderPop` (l. 366) — Remplit la bulle de l'étape courante (titre, texte, compteur, boutons).
- `capTourPlace` (l. 378) — Place le cadre clignotant sur la zone de l'étape courante et la bulle à côté (ou au centre).
- `capTourKey` (l. 410) — Raccourcis clavier pendant la visite : ← → Entrée pour naviguer, Échap pour quitter.
- `capTourEnd` (l. 419) — Quitte la visite guidée et retire la mise en évidence.
- `capTourHelpMenu` (l. 426) — Ouvre le menu ? Aide ▾ (s'il n'est pas déjà ouvert) pour l'étape qui le présente.
- `capTourStartHere` (l. 433) — Lance « 🚀 Bien démarrer » : sans modèle, montre où ouvrir le fichier et arme la reprise après chargement ;
- `capTourResumeAfterLoad` (l. 440) — Reprend « 🚀 Bien démarrer » (2e temps) après le chargement d'un modèle, si la reprise a été armée.

## 44-functional-exchange.js — 512 lignes

- `CAP_FEX_PAGE` (l. 8)
- `CAP_FEX_MX_MAX` (l. 9)
- `capBlkThemeHint` (l. 17) — Conseil d'affichage des Vues Blocs : rendu plus proche de Capella avec un thème clair (affiché seulement en thème sombre).
- `capBlkRows` (l. 27) — Géométrie d'un côté de bloc (Vues Blocs) : une ligne par pin ou port, plus haute quand il a plusieurs
- `capBlkSide` (l. 35) — Texte d'une ligne de pin : connexions en liste (une par ligne) quand il y en a plusieurs.
- `capFexOpenFn` (l. 43) — Ouvre ƒ⇆ Functional Exchange sur le bloc d'une fonction (Vue Blocs, page et filtres ajustés).
- `capComputeFunctionalExchanges` (l. 49) — Calcule les Functional Exchanges du modèle avec leurs fonctions et ports d'extrémité, les Exchange Items,
- `capFexChecks` (l. 95) — Sections de contrôle des Functional Exchanges et des ports de fonctions (rapport 🩺 et tableau de bord).
- `capFexDashCatalog` (l. 124) — Indicateurs ƒ⇆ Functional Exchange pour le catalogue du tableau de bord.
- `capRenderFunctionalExchange` (l. 133) — Rend la vue ƒ⇆ Functional Exchange (barre, filtres, contenu paginé, exports).

## 45-comparaison-rapport.js — 431 lignes

- `CAP_DR_CATS` (l. 10)
- `CAP_DR_FAMS` (l. 21) — Familles de types (filtre et synthèse), testées dans l'ordre.
- `CAP_DR_TECH` (l. 34) — Types « techniques » rattachés à leur élément propriétaire quand le regroupement est actif.
- `CAP_DR_TECH_VAL` (l. 36) — Types techniques porteurs de valeur : rattachés comme ⚙ propriété (et non 🔗 lien).
- `CAP_DR_SCREEN_MAX` (l. 37)
- `capDrFam` (l. 40) — Famille d'un type d'élément. @param {string} t - Type @returns {string} Clé de famille ('other' sinon)
- `capDrFamLabel` (l. 42) — Libellé d'une famille. @param {string} k @returns {string}
- `capDrCatOf` (l. 44) — Catégorie d'un changement d'attribut d'un élément modifié. @param {object} c - Changement {k,ref} @returns {string}
- `capDrBuild` (l. 61) — Construit les éléments du rapport à partir des différences brutes.
- `capDrContained` (l. 112) — Éléments contenus (récursivement) d'un élément créé ou supprimé. @param {object} it @returns {object[]}
- `capDrEntries` (l. 119) — Entrées du rapport (un élément × une catégorie) retenues par les filtres.
- `capDrShort` (l. 135) — Valeur courte pour une phrase (tronquée). @param {string} v @param {number} [n] @returns {string}
- `capDrSentence` (l. 141) — Phrase d'une entrée (niveau Simple), en texte brut.
- `capDrDetail` (l. 160) — Lignes avant / après d'une entrée (niveaux Détaillé et Complet). @param {object} en @returns {object[]} [{k,a,b}]
- `capDrGroups` (l. 171) — Groupes d'entrées selon le regroupement choisi. @param {object[]} ens @param {string} by @returns {object[]} [{label,ens}]
- `capDrModel` (l. 188) — Modèle du rapport (indépendant du format) : en-tête, synthèse, groupes.
- `capDrRichHtml` (l. 206) — Rapport au format HTML mis en forme (styles en ligne : collage dans Word, Outlook, Teams ; export, impression).
- `capDrText` (l. 235) — Rapport en texte brut (lignes indentées). @param {object} R - Modèle @returns {string}
- `capDrTable` (l. 258) — Rapport en tableau (une ligne par changement de propriété) : colonnes pour Excel / CSV.
- `capDrMarkdown` (l. 272) — Rapport en Markdown (listes ; tableaux avant / après aux niveaux Détaillé et Complet). @param {object} R @returns {string}
- `capDrClipboard` (l. 297) — Copie dans le presse-papiers (HTML mis en forme + texte brut ; repli par sélection si l'API est refusée).
- `capDrRender` (l. 327) — Rend le rapport de comparaison dans un conteneur (barre de réglages, filtres, rapport, copie et exports).

## 46-config-interface.js — 140 lignes

- `CAP_CFG_PARTS` (l. 9)
- `capCfgSer` (l. 18) — Sérialise en JSON en conservant les ensembles (Set). @param {*} o @returns {string}
- `capCfgRev` (l. 20) — Relit un JSON produit par capCfgSer (ensembles reconstitués). @param {string} t @returns {*}
- `capCfgGet` (l. 26) — État courant d'une partie de l'interface.
- `capCfgSet` (l. 39) — Applique une partie de configuration à l'interface (et la mémorise dans la page).
- `capCfgStoreViews` (l. 61) — Écrit dans la page (bloc JSON « cap-ui-views ») ce que les autres blocs ne conservent pas encore :
- `capCfgRestoreViews` (l. 68) — Réapplique à l'ouverture de la page les vues mémorisées par capCfgStoreViews.
- `capCfgDialog` (l. 82) — Fenêtre de choix des parties à enregistrer ou à charger.
- `capCfgLoadFile` (l. 120) — Ouvre un fichier .json d'interface et propose les parties à appliquer.
- `capCfgLoadUpdate` (l. 134) — Charge une mise à jour du modèle depuis un autre fichier : comparaison, delta, puis mise à jour après validation (🔄 Suivi).

## 47-composants.js — 439 lignes

- `CAP_CB_PAGE` (l. 10)
- `CAP_CB_LAYERS` (l. 13) — Vues 🧱 par couche : conteneur, clé de vue (barre), libellé.
- `capCbOpenComp` (l. 24) — Ouvre le bloc d'un composant dans la Vue Blocs de sa couche (🧱 System / Logical Component, 🔀 Behavior Exchange,
- `CAP_CB_TYPES` (l. 35) — Types de composants dessinés (versions récentes et anciennes de Capella).
- `capComputeComponentBlocks` (l. 40) — Composants du modèle avec leurs ports, échanges, sous-composants et fonctions allouées.
- `capCbChecks` (l. 65) — Sections de contrôle des composants et de leurs ports (rapport 🩺 et tableau de bord).
- `capCbDashCatalog` (l. 90) — Indicateurs 🧱 Composants pour le catalogue du tableau de bord.
- `capRenderComponentBlocks` (l. 103) — Rend la vue 🧱 d'une couche (barre, filtres, contenu paginé, exports).

## 48-barres-groupes.js — 160 lignes

- `CAP_TBG_ROOTS` (l. 7)
- `capTbKind` (l. 13) — Nature d'un élément de barre pour le regroupement.
- `capTbGroup` (l. 31) — Entoure, dans une barre, chaque suite de commandes de même nature par un cadre .tb-grp.
- `capTbGroupAll` (l. 47) — Regroupe toutes les barres d'un conteneur. @param {HTMLElement} root
- `CAP_TBS_ROOTS` (l. 66)
- `CAP_TBS_BARS` (l. 67)
- `capTbsScroller` (l. 71) — Conteneur qui fait défiler un élément (premier ancêtre dont le débordement vertical n'est pas visible).
- `capTbsBg` (l. 78) — Couleur de fond effective d'un élément (premier ancêtre au fond non transparent).
- `capTbSticky` (l. 86) — Rend collantes les barres du haut d'une vue et décale les en-têtes de tableau collants qui défilent avec elle.
- `capThRows` (l. 124) — Lignes d'en-tête d'un tableau : celles du <thead>, sinon les premières lignes composées uniquement de <th>.
- `capThFollow` (l. 134) — Fait suivre le défilement de la vue aux en-têtes des tableaux visibles (sous les barres collantes).

## 49-scenarios.js — 383 lignes

- `CAP_SC_KINDS` (l. 11) — Types de scénarios Capella (attribut kind) : sigle et libellé.
- `CAP_SC_COL` (l. 14) — Couleurs façon Capella (diagramme sur fond blanc dans tous les thèmes).
- `capScKindShort` (l. 22) — Sigle d'un scénario selon son type et sa couche (OES / OAS en OA, ES / FS / IS ailleurs).
- `capScConstraintText` (l. 30) — Texte d'une contrainte Capella (corps de la spécification, sinon nom). Le « texte lié » Capella
- `capComputeScenarios` (l. 41) — Liste des scénarios du modèle (résumé, sans mise en page), mise en cache.
- `capScRole` (l. 67) — Ligne de vie : élément représenté (composant, acteur, entité, fonction) et sa nature (couleur).
- `capScTextW` (l. 81) — Mesure approximative d'un texte (px) à la taille donnée. @param {string} s @param {number} [fs] @returns {number}
- `capScLayout` (l. 85) — Calcule la mise en page d'un scénario : colonnes, ordonnées des fragments, messages, exécutions, états, fragments combinés.
- `capScOperandGuard` (l. 170) — Garde (condition) d'un opérande de fragment combiné. @param {Element} f - InteractionOperand @returns {string}
- `capScWrap` (l. 177) — Découpe un texte en lignes d'environ n caractères (2 lignes au plus, « … » au-delà).
- `capScenarioSvg` (l. 186) — Dessine un scénario en SVG façon Capella (fond blanc).
- `capScChecks` (l. 267) — Sections de contrôle des scénarios (🩺 et tableau de bord). @returns {object[]}
- `capScDashCatalog` (l. 286) — Indicateurs 🎬 Scénarios pour le catalogue du tableau de bord.
- `capScOpen` (l. 295) — Ouvre un scénario dans la vue 🎬 Scénarios. @param {string} id
- `capScExport` (l. 298) — Exporte le scénario affiché : 'svg', 'png' ou 'clip' (PNG dans le presse-papiers). @param {string} fmt
- `capScFit` (l. 311) — Ajuste la hauteur de la liste et du diagramme au bas réel de la vue (la barre d'état ne doit pas masquer
- `capScPan` (l. 319) — Déplacement du diagramme par cliquer-glisser (en plus des barres de défilement, de la molette et de Maj + molette).
- `capRenderScenarios` (l. 332) — Rend la vue 🎬 Scénarios : liste filtrable à gauche, diagramme de séquence (ou contrôles) à droite.

## 50-a-propos.js — 73 lignes

- `CAP_APP_VERSION` (l. 5)
- `CAP_APP_AUTHOR` (l. 6)
- `CAP_APP_NAME` (l. 7)
- `CAP_APP_SLOGAN` (l. 8)
- `CAP_APP_REPO` (l. 9)
- `CAP_D3_LICENSE` (l. 11) — Texte de la licence ISC de D3.js (reproduction obligatoire).
- `capAboutTech` (l. 19) — Informations techniques (version, navigateur, accès direct aux fichiers, modèle chargé), pour un signalement.
- `capAboutOpen` (l. 34) — Ouvre la fenêtre « À propos ».

## 51-tableau.js — 565 lignes

- `capTableTabNew` (l. 18) — Crée un onglet de vue du tableau.
- `capTableTabsEnsure` (l. 33) — Garantit l'existence d'au moins un onglet ; le premier reprend l'état courant du tableau.
- `capTableSyncToTab` (l. 40) — Copie l'état de travail du tableau (colonnes, filtres, largeurs, tri) dans l'onglet actif.
- `capTableSyncFromTab` (l. 47) — Charge l'état de l'onglet actif dans les variables de travail du tableau.
- `capTableTypesApply` (l. 64) — Applique un ensemble de types cochés à la barre latérale (registre) et aux filtres.
- `capTableTypesLoad` (l. 70) — Charge les types de l'onglet actif (un onglet sans réglage reprend les types des autres vues).
- `capTableSidebar` (l. 77) — Redessine la barre latérale des types en gardant la recherche saisie.
- `capTableTypesView` (l. 85) — Entrée dans le ▤ Tableau ou sortie : échange les types cochés de l'onglet et ceux des autres vues.
- `capTableTabSwitch` (l. 102) — Active un onglet du tableau (l'état de l'onglet quitté est conservé).
- `capRenderTableTabs` (l. 111) — Rend la barre d'onglets du tableau : clic = ouvrir, double-clic = renommer, ✕ = fermer,
- `capTableRelIndex` (l. 160) — Index des relations Capella par élément : pour chaque relation, éléments cibles (out) et sources (in).
- `capTableRelParse` (l. 181) — Décode une clé de colonne de relation « rel:<relation>:out|in ».
- `capTableRelEnds` (l. 191) — Libellés lisibles des deux extrémités d'une relation (types source et cible).
- `capTableRelValues` (l. 203) — Valeurs d'une colonne de relation pour un élément : noms des éléments liés (sans doublon).
- `capTableRelLabel` (l. 215) — Libellé d'en-tête d'une colonne de relation.
- `capTableRelPicker` (l. 229) — Ajoute au menu ⊞ Colonnes les sections « Relations — … » (groupes de 🔗 Liens) : une entrée par
- `capTableRows` (l. 270) — Lignes du tableau : éléments filtrés (types cochés et portée de l'onglet, filtres par colonne), triés
- `capTableSortCycle` (l. 293) — Passe au tri suivant sur une colonne : croissant ▲, décroissant ▼, puis sans tri.
- `capTableColDnD` (l. 307) — Rend un en-tête déplaçable : glisser-déposer sur un autre en-tête pour changer l'ordre des colonnes.
- `capTableCsv` (l. 334) — Exporte en CSV les colonnes affichées, pour toutes les lignes filtrées (dans l'ordre du tri).
- `capTableCfgGet` (l. 347) — État du tableau pour l'enregistrement : onglets, colonnes par chemin, affichage des cellules multiples.
- `capTableCfgSet` (l. 356) — Applique un état enregistré du tableau (format à onglets, ou ancien format à une seule vue).
- `capTableTvCustom` (l. 374) — Colonnes par chemin de l'ancienne Table View reprises telles quelles : celles qui ne suivent aucune
- `capTableTvTab` (l. 384) — Convertit un onglet (ou une vue .json) de l'ancienne Table View en onglet du tableau.
- `capTableImportTv` (l. 404) — Reprend les réglages de l'ancienne 📊 Table View (page enregistrée ou fichier ⚙) : ses onglets
- `capTableApplyViewFile` (l. 425) — Applique un fichier 📂 Charger vue à l'onglet actif : vue du tableau (« capella-table-view »)
- `capTableScopeSet` (l. 459) — Ensemble des identifiants des éléments en portée (contenu des éléments choisis).
- `capTableScopeLabel` (l. 476) — Libellé court de la portée pour le bouton de la barre du tableau.
- `capTableScopeButton` (l. 486) — Bouton « 🎯 Portée » de la barre du tableau (info-bulle : éléments choisis et mode).
- `capTableScopeDialog` (l. 501) — Ouvre la fenêtre 🎯 Portée de l'onglet : éléments choisis (✕ pour retirer), mode (à tous les niveaux /
