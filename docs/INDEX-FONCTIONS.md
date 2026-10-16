# Index des fonctions (généré par `node tools/index.js` — ne pas modifier à la main)

## 01-donnees-config.js — 55 lignes

- `_L` (l. 6) — Libellé affiché : renvoie le texte français tel quel. Au build anglais (node build.js --lang en), l'argument
- `CAP_LANG` (l. 8) — Langue de l'interface ('fr', ou 'en' dans la version anglaise produite par le build).
- `RM_RO` (l. 14) — Relation Map en lecture seule (Arcalyse est un outil de lecture et d'analyse) : arborescence (renommage, ajout,
- `CAP_HUMAN_NAMES` (l. 22) — Table de correspondance type Capella → {nom humain (h), description (d)}.
- `MODEL` (l. 24)
- `RCFG` (l. 37)
- `TCFG` (l. 38)
- `MODES` (l. 50)

## 02-themes.js — 304 lignes

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
- `tv` (l. 302) — Lit la valeur d'une variable CSS (ex: --c-text). @param {string} varName

## 03-rm-etat-svg.js — 121 lignes

- `COLOR_PALETTE` (l. 31)
- `nextColor` (l. 38) — Retourne la prochaine couleur non encore utilisée dans TCFG ni RCFG.
- `setupMarkers` (l. 66) — Crée/recrée les marqueurs SVG (flèches, diamants, cercles) pour chaque type de relation défini dans RCFG.

## 04-rm-arbre-rendu.js — 355 lignes

- `buildTreeData` (l. 14) — Construit la structure d'arbre D3 hiérarchique à partir de MODEL.elements
- `rebuildTree` (l. 59) — Reconstruit l'arbre D3 et redessine le graphe. Point d'entrée principal
- `textW` (l. 73) — Mesure la largeur en pixels d'une chaîne de caractères dans une fonte donnée.
- `wrapToNLines` (l. 86) — Découpe un texte en plusieurs lignes pour tenir dans une largeur max.
- `computeNodeDims` (l. 112) — Calcule les dimensions (largeur, hauteur, lignes) d'un nœud selon son label et le mode compact.
- `render` (l. 125) — Rendu principal D3 : calcule les positions (layout), dessine les arêtes et les nœuds.

## 05-rm-vue-chaine.js — 137 lignes

- `rmChainBanner` (l. 9) — Affiche ou masque le bandeau « chaîne affichée » au-dessus du graphe.
- `renderChainView` (l. 27) — Rendu de la vue chaîne : disposition en couches (capChainLayout) orientée selon la disposition choisie
- `rmHighlight` (l. 126) — Met en évidence un nœud et ses voisins directs (les autres sont estompés) ; null pour tout rétablir.

## 06-rm-interactions-export.js — 612 lignes

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
- `positionFloat` (l. 153) — Positionne le panneau flottant d'édition près du curseur.
- `showFloatEdit` (l. 165) — Affiche le formulaire d'édition inline d'un élément existant.
- `showFloatRelation` (l. 191) — Affiche le formulaire de création d'une relation depuis un élément source.
- `showFloatNewChild` (l. 222) — Affiche le formulaire de création d'un élément enfant.
- `showFloatNewElement` (l. 261) — Affiche le formulaire de création d'un nouvel élément.
- `getContentBounds` (l. 299) — Calcule les dimensions réelles du contenu SVG (bounding box de tous les nœuds).
- `openExportModal` (l. 324) — Ouvre le modal d'export image. @param {string} format - 'png'|'jpeg'|'svg'
- `updateExportInfo` (l. 333) — Met à jour le libellé d'information affiché dans le menu Export (dimensions/format prévus).
- `exportContent` (l. 364) — Exporte le graphe en image. Gère PNG (canvas), JPEG (canvas) et SVG (inline).
- `rmCsvCell` (l. 435) — Cellule « élément » d'un nœud affiché : nom, « ×n » si relations fusionnées, « ↺ » si occurrence déjà déployée.
- `rmRelLabel` (l. 442) — Libellé lisible d'un type de relation de la Relation Map. @param {string} t @returns {string}
- `rmCsvReady` (l. 445) — Vérifie qu'un graphe est affiché (hors vue chaîne) avant un export CSV.
- `rmCsvTreeDialog` (l. 453) — Fenêtre d'options du CSV « Arbre par niveaux » (choix retenus avec ceux des exports : _capCsvCfg),
- `rmCsvTree` (l. 479) — CSV « Arbre par niveaux » du graphe affiché : contexte, puis une colonne par (niveau, relation)
- `rmCsvRelations` (l. 514) — CSV « Relations affichées » : une ligne par arête du graphe affiché (ou par échange en vue chaîne).
- `updateLegend` (l. 535) — Met à jour la légende du graphe : seulement les relations réellement affichées, avec leur
- `rmDetailOpen` (l. 569) — Ouvre le panneau de détail de la Relation Map sur un élément : détail Capella complet
- `rmDetailClose` (l. 578) — Ferme le panneau de détail de la Relation Map.
- `rmDetailFollow` (l. 583) — Le panneau de détail suit la sélection (S.propEl) tant qu'il est ouvert, en Relation Map.
- `updateInfo` (l. 589) — Met à jour le compteur d'éléments/relations affiché en bas du panneau.
- `typSelectAll` (l. 600) — Coche ou décoche tous les filtres de types d'éléments du panneau gauche.
- `relSelectAll` (l. 608) — Coche ou décoche tous les filtres de types de relations du panneau gauche.

## 07-rm-panneau-criteres.js — 298 lignes

- `buildPanel` (l. 7) — Reconstruit entièrement le panneau gauche : critères de relation, types d'éléments.
- `rmFiltersSearch` (l. 251) — Filtre en direct les lignes d'une colonne du tiroir ⚙ Filtres par leur clé de recherche,
- `rmFiltersCount` (l. 260) — Met à jour les compteurs « cochés / total » du tiroir ⚙ Filtres et de son bouton (barre 2).
- `rmFiltersToggle` (l. 270) — Ouvre ou ferme le tiroir ⚙ Filtres.
- `capShowChainInMap` (l. 286) — Visualise une chaîne fonctionnelle dans la Relation Map en préservant ses ramifications

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

## 09-arborescence.js — 746 lignes

- `typeIcon` (l. 5) — Retourne l'icône associée à un type d'élément (définie dans TCFG). @param {string} t
- `arboIcone` (l. 13) — Remplit l'icône d'un élément de la Relation Map : icône façon Capella (visionneuse d'Arcature, capIco) pour un
- `migratePkgsToElements` (l. 24) — Migre l'ancien format packages[] vers le nouveau format elements[] avec type='Package'.
- `buildPropertiesPanel` (l. 55) — Rafraîchit les propriétés de l'élément sélectionné (S.propEl) : le panneau 🔎 Détail de la
- `rmPropsRender` (l. 59) — Remplit #props-body (dans le panneau 🔎 Détail) avec les propriétés de l'élément sélectionné
- `_arboInlineRename` (l. 188) — Active le renommage en place d'un nœud de l'arborescence (Entrée valide, Échap annule).
- `buildArbo` (l. 203) — Construit l'arborescence gauche à partir de MODEL.elements.
- `arboExpandAll` (l. 382) — Développe tous les nœuds de l'arborescence gauche.
- `arboCollapseAll` (l. 385) — Réduit tous les nœuds de l'arborescence gauche au premier niveau.
- `arboRenameEl` (l. 391) — Renomme un élément dans MODEL et met à jour l'arbo et le graphe.
- `arboAddPkg` (l. 402) — Crée un nouveau package (type='Package') enfant d'un élément existant.
- `arboAddEl` (l. 416) — Crée un nouvel élément enfant dans l'arborescence.
- `arboDeleteEl` (l. 431) — Supprime un élément et toutes ses relations de MODEL, puis met à jour l'UI.
- `arboClearMultiSel` (l. 449) — Vide la sélection multiple de l'arborescence et met à jour l'affichage.
- `arboUpdateMselBar` (l. 452) — Met à jour la barre de compteur de sélection multiple sous l'en-tête Arborescence.
- `arboMoveEls` (l. 464) — Déplace un GROUPE d'éléments vers un nouvel owner en conservant la hiérarchie interne :
- `arboParseClipboardList` (l. 492) — Découpe un texte de presse-papier en liste de noms : une ligne = un élément.
- `arboPasteListInto` (l. 500) — Crée une liste d'éléments enfants sous un owner (un nom par ligne du presse-papier).
- `arboConvertSelectedType` (l. 520) — Change le type de tous les éléments d'un ensemble d'ids (hors packages).
- `arboShowRoCtxMenu` (l. 540) — Menu contextuel (clic droit) d'un élément de l'arborescence en lecture seule :
- `arboShowCtxMenu` (l. 557) — Affiche le menu contextuel (clic droit) d'un élément de l'arborescence.
- `arboMoveEl` (l. 680) — Déplace un élément unique vers un nouvel owner par glisser-déposer : met à jour
- `rmSetElemVal` (l. 706) — Écrit une valeur dans un champ d'un élément du modèle de la Relation Map (nom, type, parent,
- `onModelChanged` (l. 742) — Callback appelé après toute modification du modèle : rebuildTree, buildArbo, buildPanel.

## 10-rm-vues.js — 262 lignes

- `RM_VIEW_FLAGS` (l. 12) — Options d'affichage retenues dans une vue (clé de S → bouton de la barre 2).
- `RM_VIEW_PRESETS` (l. 15) — Préréglages proposés par le menu ＋ : relations cochées (clés relType de CAP_LINK_SECTIONS).
- `rmViewCapture` (l. 31) — Capture l'état affiché de la Relation Map (contenu d'une vue).
- `rmViewAutoName` (l. 46) — Nom automatique d'une vue : élément de contexte (et sa couche) ou chaîne affichée.
- `rmViewSync` (l. 56) — Enregistre l'état affiché dans l'onglet actif (appelé à la fin de render() et après un zoom).
- `rmViewSyncToolbar` (l. 64) — Met les boutons de la barre 2 (options, profondeur, disposition) en accord avec S.
- `rmViewRestoreFilters` (l. 73) — Recopie dans S les filtres (types, relations) et les éléments masqués de l'onglet actif —
- `rmViewApply` (l. 84) — Applique une vue à la Relation Map : réglages, filtres, graphe, nœuds repliés, chaîne et zoom.
- `rmViewNewTab` (l. 116) — Crée un onglet.
- `rmViewSelect` (l. 121) — Affiche un onglet (après avoir enregistré l'onglet quitté). @param {number} i - Indice
- `rmViewAdd` (l. 131) — Ajoute un onglet et l'affiche.
- `rmViewClose` (l. 152) — Ferme un onglet (au moins un onglet reste). @param {number} i - Indice
- `rmViewsRender` (l. 163) — Dessine la barre d'onglets des vues (#rm-tabs).
- `rmViewSave` (l. 196) — Télécharge la vue affichée dans un fichier .json (💾 Sauver vue).
- `rmViewLoadFile` (l. 209) — Charge une vue enregistrée (📂 Charger vue) : elle s'ouvre dans un nouvel onglet.
- `rmViewsOnModelLoad` (l. 225) — Après le chargement d'un modèle : crée la première vue, ou réapplique la vue active (vues gardées).
- `rmViewsCfgGet` (l. 237) — État des vues pour la 💾 Page HTML et le fichier ⚙ Interface et vues.
- `rmViewsCfgSet` (l. 241) — Remplace les vues par celles d'une configuration (page enregistrée ou fichier ⚙).

## 11-sauvegarde-toolbar-init.js — 274 lignes

- `saveJSON` (l. 5) — Sérialise MODEL, RCFG, TCFG et S en JSON et télécharge le fichier.
- `loadJSON` (l. 19) — Charge un fichier JSON et restaure l'état complet de l'application.
- `applyDepth` (l. 108) — Applique la profondeur d'exploration du graphe (bornée entre 1 et 10),
- `rmLayoutLabel` (l. 120) — Affiche la disposition courante (S.layout) sur le bouton du menu Disposition de la barre 2.
- `openHelpModal` (l. 160) — Ouvre la fenêtre d'aide, éventuellement sur un onglet donné.
- `positionOverlay` (l. 256) — Positionne #capella-overlay sous #toolbar en lisant sa hauteur réelle.

## 20-capella-chargement.js — 925 lignes

- `CAP_LAYERS` (l. 4)
- `CAP_NS_LAYER` (l. 12)
- `CAP_ANCESTOR_KW` (l. 13)
- `CAP_ATTR_KEYS` (l. 14)
- `CAP_TECHNICAL_TYPES` (l. 15)
- `CAP_PKG_TYPES` (l. 16)
- `CAP_TYPE_ICON` (l. 17)
- `capBuildPageHtml` (l. 36) — Construit le HTML de la page actuelle (tout le HTML/CSS/JS de l'application), fichier
- `capPageFileName` (l. 125) — Nom de fichier proposé pour la page sauvegardée (celui de la page de projet ouverte, s'il y en a une).
- `capSaveFullPage` (l. 127) — Sauvegarde la page en la téléchargeant (dossier Téléchargements du navigateur).
- `capSavePageDirect` (l. 142) — Enregistre la page directement dans un fichier choisi une fois (API File System Access d'Edge/Chrome),
- `capEsc` (l. 175) — Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s
- `capLoadFile` (l. 193) — Charge un fichier Capella (depuis l'explorateur ou un glisser-déposer) : vérifie
- `capApplyXmlDoc` (l. 242) — Remplace le modèle affiché par un document XML Capella déjà analysé : vide les caches,
- `capReplaceConfirm` (l. 274) — Demande confirmation avant de remplacer le modèle affiché par un autre fichier : le travail non enregistré
- `capReplacePreOk` (l. 303) — @returns {boolean} vrai si le remplacement du modèle vient d'être confirmé avant le sélecteur (la confirmation est consommée)
- `capShowWelcome` (l. 309) — Affiche ou masque l'écran d'accueil. Quand un modèle est déjà chargé, l'écran
- `capWelcomeStatus` (l. 321) — Affiche un message d'état (chargement, erreur) dans la zone de dépôt.
- `capUpdateWelcome` (l. 327) — Synchronise l'écran d'accueil avec l'état de chargement (appelé au démarrage,
- `XSI_NS` (l. 388)
- `capXType` (l. 390) — Lit l'attribut xsi:type d'un élément XML Capella (plain ou namespacé).
- `capTName` (l. 392) — Extrait le nom court du type (après ':') depuis xsi:type. Ex: 'pa:PhysicalComponent' → 'PhysicalComponent'.
- `capXId` (l. 394) — Lit l'ID d'un élément XML Capella (attribut plain 'id' ou xmi:id namespacé).
- `capXName` (l. 396) — Lit l'attribut 'name' d'un élément XML Capella.
- `capResolveLayer` (l. 401) — Détermine la couche ARCADIA (OA/SA/LA/PA/EPBS/Shared) d'un élément
- `capGetAttrs` (l. 407) — Extrait les attributs pertinents d'un élément XML Capella (définis dans CAP_ATTR_KEYS).
- `capBuildTree` (l. 418) — Construit récursivement l'arbre d'éléments Capella depuis le XML.
- `capRunBulk` (l. 444) — Exécute fn en mode chargement groupé puis reconstruit une fois le panneau (qui reconstruit l'arborescence).
- `capBuildTypeRegistry` (l. 454) — Construit capTypeRegistry : {type → {count, layer, checked}} depuis capAllElements.
- `capApplyPanelOnLoad` (l. 474) — Appelée après le chargement Capella : configure le panneau gauche RM.
- `capInjectToArbo` (l. 549) — Injecte les éléments Capella dans MODEL.elements pour qu'ils apparaissent
- `capInjectCapellaRelsToCriteria` (l. 653) — Ajoute les types de relations Capella (PC NODE→PC NODE, etc.) dans RCFG
- `capInjectLinksToModel` (l. 694) — Calcule les liens Capella via capComputeLinks() et les injecte dans MODEL.relations
- `capFilterArboToLinked` (l. 738) — Filtre MODEL.elements pour ne conserver que les éléments _capella référencés
- `capInjectChainsToModal` (l. 777) — Calcule les chaînes (FunctionalChain, OperationalProcess, PhysicalPath)
- `capRenderCurrentView` (l. 838) — Dispatche le rendu vers la vue Capella active (cards/table/tree/links/chains/physlink).
- `capUpdateStatChips` (l. 916) — Met à jour les puces de comptage OA/SA/LA/PA/EPBS/Shared/total dans la sous-barre.

## 21-capella-vues-base.js — 1526 lignes

- `capRenderSidebar` (l. 6) — Rend la sidebar Capella : liste des types par couche avec cases à cocher.
- `capGetFiltered` (l. 61) — Retourne capAllElements filtré par types activés, couche et texte de recherche.
- `CAP_CARDS_MAX` (l. 73) — Nombre de cartes par page (une page plus longue rend l'affichage lent).
- `capCardsPager` (l. 83) — Barre de pages de ▦ Cartes : ◀ précédente, numéro de page, éléments affichés, suivante ▶.
- `capRenderCards` (l. 92) — Rend la vue Cartes : cartes groupées par couche ARCADIA, filtrées, par pages de CAP_CARDS_MAX.
- `CAP_TABLE_BUILTIN_COLS` (l. 140) — Colonnes affichées par défaut (Name en premier ; Couche, Type et Human Type restent proposées dans ⊞ Colonnes).
- `capGetAllRawAttrKeys` (l. 157) — Calcule dynamiquement la liste de TOUS les noms d'attributs présents dans capAllElements
- `capGetParentIndex` (l. 170) — Construit l'index de containment du modèle Capella depuis le XML brut :
- `capGetMetachainMetaclasses` (l. 193) — Retourne la liste des "Metaclass" (types Capella) disponibles au démarrage d'une étape :
- `capGetElementById_` (l. 214) — Retrouve un élément Capella par son identifiant XML. S'appuie sur un index id → élément
- `capRefIndex_` (l. 230) — Index des références portées par un attribut : pour les éléments d'un type donné, associe
- `capParseAttrRefs_` (l. 248) — Découpe la valeur brute d'un attribut XML en liste d'IDs candidats (gère les attributs
- `capGetAttrRefProperties` (l. 256) — Détecte, pour un Metaclass donné, les attributs XML bruts dont la valeur référence
- `capGetViaIntermediateProperties` (l. 289) — Détecte le pattern "navigation via élément intermédiaire" : un type X (différent du
- `capGetOwnerProperties` (l. 327) — Détecte tous les types d'ANCÊTRES réellement rencontrés en remontant le containment XML
- `capGetIncomingRefProperties` (l. 357) — Détecte les RÉFÉRENCES ENTRANTES : pour un metaclass M, trouve tous les types X dont un
- `capGetMetachainProperties` (l. 392) — Retourne toutes les Properties navigables depuis un Metaclass : valeurs terminales,
- `capComputeMetachainProperties_` (l. 406) — Calcule (sans cache) les Properties navigables depuis un Metaclass — voir capGetMetachainProperties.
- `capResolveStep` (l. 497) — Exécute UN pas de navigation (une Property) à partir d'un élément capAllElements donné.
- `capExtractValue` (l. 565) — Extrait une valeur terminale "simple" d'un élément capAllElements (Name, ID, Type,
- `capResolveMetachain` (l. 581) — Exécute une chaîne de Properties (metachain) à partir d'un élément. Le 1er pas n'est
- `capTableGetValArray` (l. 605) — Retourne TOUJOURS un tableau de valeurs pour une colonne donnée (même les colonnes à valeur
- `capTableGetVal` (l. 641) — Retourne la valeur d'une colonne sous forme de string unique (jointe par ', ' si plusieurs
- `capTableColLabel` (l. 646) — Libellé humain affiché en en-tête pour une colonne donnée.
- `capBuildTableToolbar` (l. 659) — Construit la barre d'outils au-dessus du tableau Capella : bouton de sélection des
- `capRefreshColPickerList` (l. 764) — Reconstruit uniquement la liste interne du menu ⊞ Colonnes (#cap-colpicker-list),
- `capApplyColResize` (l. 842) — Ajoute une poignée de redimensionnement sur le bord droit d'un <th> du tableau Capella.
- `capRenderCustomColStepRow` (l. 872) — Construit une ligne du metachain : <select> Metaclass + <select> Property + suppression.
- `capRenderCustomColPanel` (l. 938) — Reconstruit entièrement le panneau : recalcule le metaclass imposé de chaque ligne à partir
- `CAP_PP_MAX_CHIPS` (l. 965)
- `CAP_PP_MAX_OPTS` (l. 966)
- `capPpCapAdapter` (l. 971) — Adaptateur de l'aperçu pour le ▤ Tableau Capella (capAllElements, moteur cap…).
- `capPpTrace` (l. 990) — Déroule le chemin pas à pas depuis un élément, en gardant chaque niveau intermédiaire
- `capPpHasResult` (l. 1009) — Indique si un élément donne un résultat non vide pour le chemin (cellule remplie).
- `capPpRender` (l. 1019) — Rend la zone « 👁 Aperçu en direct » d'un panneau de colonne par chemin : choix de
- `capPpRenderBody` (l. 1087) — Rend le corps de l'aperçu : remplissage estimé sur le type de départ, puis le chemin
- `capOpenCustomColPanel` (l. 1158) — Ouvre le panneau latéral de construction de colonne personnalisée (Metachain Navigation).
- `capCloseCustomColPanel` (l. 1183) — Ferme le panneau latéral d'édition de colonne Metachain de la vue Tableau.
- `capSaveTableView` (l. 1224) — Sérialise la configuration actuelle de la vue Tableau Capella (colonnes visibles, colonnes
- `capLoadTableView` (l. 1246) — Charge une configuration de vue Tableau Capella précédemment sauvegardée et l'applique.
- `capRenderTable` (l. 1265) — Rend intégralement la vue Tableau Capella : barre d'outils (colonnes, colonne perso,
- `capRenderTableBodyOnly` (l. 1274) — Reconstruit uniquement le <thead>/<tbody> du tableau Capella (pas la toolbar ni le menu
- `CAP_TREE_LIST_MAX` (l. 1398)
- `capRenderTree` (l. 1402) — Rend la vue Arborescence : barre propre (recherche, 🌳 Arbre / ☰ Liste, déplier, réduire, JSON) créée
- `capTreeExpandLevel` (l. 1425) — Déplie l'arbre de 🌳 Arborescence jusqu'à un niveau donné et replie le reste.
- `capRenderTreeBody` (l. 1437) — Rend le contenu de 🌳 Arborescence selon l'affichage : arbre (avec une recherche : résultats et leurs
- `capRenderTreeNode` (l. 1482) — Rend récursivement un nœud de l'arborescence Capella.

## 22-capella-liens.js — 281 lignes

- `CAP_LINK_SECTIONS` (l. 2)
- `CAP_LINK_GROUPS` (l. 41) — Groupes de relations affichés dans la barre de la vue 🔗 Liens (ordre d'affichage).
- `capComputeLinks` (l. 54) — Extrait et résout toutes les relations Capella depuis le XML :
- `capRenderLinks` (l. 201) — Rend la vue Liens : barre (recherche, filtres groupés par famille de relations, export)

## 23-chaines.js — 578 lignes

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
- `capChainInfo` (l. 525) — ℹ Infos d'une chaîne dans le panneau de détail (comme pour un diagramme) : type, couche, nombre de fonctions
- `capWireChainCards` (l. 557) — Attache l'ouverture/fermeture des cartes (rendu paresseux du diagramme) et la navigation.

## 24-chaines-export.js — 818 lignes

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

## 25-panneau-detail.js — 274 lignes

- `capOpenDetail` (l. 5) — Ouvre le panneau de détail (colonne droite de l'overlay) pour un élément Capella.
- `CAP_DESC_TAGS` (l. 112) — Balises gardées dans une description Capella mise en forme (les autres sont remplacées par leur contenu).
- `CAP_DESC_CSS` (l. 115) — Propriétés de style gardées (les couleurs de texte sont adaptées au thème ; fonds, positions et images retirés).
- `capSafeHtml` (l. 123) — Description Capella (HTML) prête à afficher : balises et attributs filtrés (aucun script, aucun gestionnaire
- `capDescSection` (l. 166) — Section « Description » du panneau de détail : la description mise en forme (aperçu), avec une bascule
- `capDescToggle` (l. 175) — Bascule Aperçu / code HTML d'une section « Description ». @param {HTMLElement} b - Bouton cliqué
- `capOpenDetailNode` (l. 182) — Ouvre le panneau de détail à partir d'un nœud de l'arborescence Capella.
- `CAP_ELEM_VIEWS` (l. 190)
- `capUpdateToolbarForView` (l. 196) — Met à jour les boutons actifs et les groupes de contrôles visibles
- `capShowView` (l. 228) — Affiche une vue Capella (bascule en mode capella si besoin).

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

## 29-physical-link.js — 294 lignes

- `capRenderPhysLink` (l. 4) — Rend la vue Physical Link avec deux modes (≡ Ligne / ▣ Composant),

## 30-ports.js — 276 lignes

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

## 32-analyses-etats-comparaison.js — 326 lignes

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

## 34-fonctions.js — 748 lignes

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
- `capFnDossierHtml` (l. 658) — Dossier fonctionnel HTML autonome : un onglet par couche (sections numérotées et indentées : description,
- `capFillHeight` (l. 683) — Ajuste la hauteur des éléments marqués data-fill pour qu'ils occupent la fenêtre jusqu'en bas.
- `CAP_ANA_SUBS` (l. 693) — Sous-vues de 🔬 Analyses (onglets) ; « fns » ouvre la vue ƒ Fonctions, qui garde son propre conteneur.
- `capAnaTabsHtml` (l. 698) — Onglets des sous-vues de 🔬 Analyses (communs à la vue 🔬 Analyses et à la vue ƒ Fonctions).
- `capAnaTabOpen` (l. 705) — Ouvre une sous-vue de 🔬 Analyses depuis ses onglets (ƒ Fonctions : vue à part).
- `capRenderFunctionsView` (l. 714) — Vue « ƒ Fonctions » (onglet de 🔬 Analyses) : hiérarchie, tableau,
- `capRenderAnalyses` (l. 725) — Point d'entrée de la vue 🔬 Analyses : barre des sous-vues et routage.

## 35-tableau-de-bord.js — 650 lignes

- `CAP_DASH_PAL` (l. 3) — Palette catégorielle à ordre fixe (contrôlée pour le daltonisme), déclinée pour thèmes clairs et sombres.
- `CAP_DASH_AK` (l. 6) — Couleurs des natures d'allocation (identiques au filtre « Allocation » de ƒ Fonctions).
- `CAP_DASH_VIZ` (l. 8) — Représentations proposées selon la forme de l'indicateur : [clé, libellé, largeur, hauteur par défaut].
- `CAP_DASH_KIND` (l. 18) — Libellés courts des formes d'indicateurs (badges du catalogue).
- `capDashColor` (l. 24) — Couleur de la i-ème série dans la palette du thème courant (au-delà de 8 : gris « Autres »).
- `capDashPct` (l. 30) — Taux arrondi d'éléments vérifiant un prédicat.
- `capDashCount` (l. 36) — Compte les éléments par clé (une ou plusieurs clés par élément) et trie par effectif décroissant.
- `capDashCatalog` (l. 46) — Catalogue de tous les indicateurs disponibles pour le modèle ouvert (fonctions, chaînes, interfaces,
- `capDashValue` (l. 195) — Valeur (mise en cache) d'un indicateur du catalogue ; null si le modèle ne contient pas la donnée.
- `capDashCut` (l. 208) — Échappe un texte et le tronque pour une étiquette de graphique.
- `capDashLevel` (l. 213) — Niveau d'un pourcentage : bon (≥ 90), à surveiller (≥ 50), faible.
- `capDashCats` (l. 219) — Prépare les catégories d'une répartition : tri, limite d'affichage et regroupement en « Autres ».
- `capDashDraw` (l. 233) — Dessine le contenu d'un élément du tableau de bord.
- `capDashSave` (l. 316) — Enregistre les tableaux de bord dans la page (bloc JSON repris par la 💾 Page HTML).
- `capDashUid` (l. 322) — Identifiant court et unique pour un tableau de bord ou un élément.
- `capDashExample` (l. 326) — Tableau de bord d'exemple adapté au modèle ouvert (synthèse de quelques indicateurs clés).
- `capRenderDashboard` (l. 344) — Vue « 📐 Tableau de bord » : tableaux de bord personnalisés (indicateurs, graphiques, tableaux, textes),
- `capDashPrint` (l. 481) — Imprime un tableau de bord au format A4 : les éléments sont redessinés à la taille de la page
- `capDashTitre` (l. 516) — Titre affiché d'un élément du tableau de bord.
- `capDashImgDraw` (l. 526) — Dessine un élément « image » : diagramme Capella (image enregistrée avec l'élément) ou 🔗 liens entre couches (redessinés sur le modèle char
- `capDashSide` (l. 552) — Panneau de gauche du tableau de bord (mode ✏ Modifier) : ajout ou configuration d'un élément, affiché en direct

## 36-component-exchange.js — 356 lignes

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

## 39-exigences-donnees.js — 642 lignes

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
- `CAP_DM_TYPES` (l. 387)
- `capComputeDataModel` (l. 393) — Calcule le modèle de données : Exchange Items (éléments, échanges et interfaces qui les portent),
- `capDmChecks` (l. 444) — Sections de contrôle du modèle de données et des interfaces (réutilisées par le tableau de bord).
- `capRenderDataModel` (l. 473) — Rend la sous-vue 🗃 Données & interfaces : Exchange Items, interfaces, classes et types, contrôles.
- `capComputeConstraints` (l. 516) — Calcule les contraintes : expression (liens linkedText résolus), langage, éléments contraints, propriétaire.
- `capCtChecks` (l. 545) — Sections de contrôle des contraintes (réutilisées par le tableau de bord).
- `capRenderConstraints` (l. 562) — Rend la sous-vue ⛓ Contraintes : liste filtrable et contrôles.
- `capXtDetail` (l. 585) — Sections supplémentaires du panneau de détail : exigences liées, propriétés, contraintes.
- `capXtDashCatalog` (l. 614) — Ajoute au catalogue du tableau de bord les indicateurs Exigences, Propriétés, Données & interfaces, Contraintes.

## 40-suivi-fichier.js — 553 lignes

- `capWatchHash` (l. 30) — Empreinte rapide d'un texte (FNV-1a 32 bits + longueur), pour reconnaître une version déjà vue.
- `capWatchTime` (l. 37) — Heure lisible (hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes
- `capWatchDate` (l. 39) — Date et heure lisibles (jj/mm hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes
- `capWatchCounts` (l. 43) — Compte les différences par statut. @param {object[]} diff - Résultat de capDiffCompute
- `capWatchLite` (l. 53) — Copie allégée d'un delta (sans les nœuds XML), pour le garder en mémoire sans retenir les anciens documents.
- `capWatchChips` (l. 58) — Pastilles ➕ ➖ ✎ ↪ d'un comptage. @param {object} c - Comptage capWatchCounts @returns {string} HTML
- `capWatchSetSource` (l. 69) — Enregistre la source suivie après le chargement d'un modèle (remet le suivi à zéro).
- `capWatchArm` (l. 82) — (Ré)arme la vérification périodique selon les réglages.
- `capIsMobile` (l. 90) — Vrai sur téléphone / tablette : leurs sélecteurs ne connaissent pas l'extension .capella et grisent ces fichiers
- `capPickCapellaFile` (l. 103) — Ouvre un fichier Capella à charger : sélecteur avec accès direct (Edge/Chrome, permet le 🔄 suivi),
- `capWatchPickerFailed` (l. 119) — Repli quand le sélecteur à accès direct a été refusé : tente le sélecteur classique (le navigateur peut
- `capWatchPick` (l. 130) — Demande un fichier .capella avec le sélecteur à accès direct quand le navigateur le permet.
- `capWatchReadDisk` (l. 148) — Lit l'état du fichier suivi sur le disque.
- `capWatchCheck` (l. 167) — Vérifie si le fichier suivi a changé et, le cas échéant, prépare la mise à jour (delta + notification).
- `capWatchRegister` (l. 208) — Analyse une nouvelle version lue sur le disque et l'ajoute aux enregistrements en attente :
- `CAP_WATCH_SAME_MIN` (l. 235)
- `capWatchCommon` (l. 242) — Part des éléments identifiés communs aux deux versions (rapportée à la plus grande).
- `capWatchSuspectHtml` (l. 252) — Avertissement (HTML) quand la nouvelle version partage trop peu d'éléments avec le modèle affiché.
- `capWatchPickNewVersion` (l. 259) — Choisit manuellement la nouvelle version du fichier (accès limité, page sauvegardée, fichier déplacé) :
- `capWatchApply` (l. 284) — Applique la version en attente : recharge le modèle (vue courante conservée), archive le delta dans l'historique
- `capWatchOpenCompare` (l. 311) — Ouvre ⚖ Comparaison de versions (🔬 Analyses) sur deux versions connues du suivi.
- `capWatchUpdateUi` (l. 328) — Met à jour le bouton 🔄 Suivi (visibilité, badge, info-bulle).
- `capWatchFlash` (l. 345) — Affiche brièvement un message dans la notification (sans action). @param {string} msg - Message
- `capWatchNote` (l. 354) — Affiche ou masque la notification de mise à jour (coin inférieur droit).
- `capWatchMenu` (l. 384) — Ouvre ou ferme le menu du bouton 🔄 Suivi. @param {boolean} [show] - Forcer l'état (sinon bascule)
- `capWatchMenuRender` (l. 392) — Construit le contenu du menu 🔄 Suivi (état de la source, réglages, historique).
- `capWatchModalClose` (l. 428) — Ferme la fenêtre du delta.
- `capWatchModalRefresh` (l. 432) — Réaffiche la fenêtre du delta si elle montre la version en attente (nouvel enregistrement détecté entre-temps).
- `capWatchShowDelta` (l. 440) — Affiche la fenêtre du delta : version en attente (cumul et enregistrements pas à pas) ou mise à jour de l'historique.
- `capWatchShowHistory` (l. 520) — Affiche l'historique des mises à jour appliquées pendant la session (chacune ouvre son delta).

## 41-barre-vues.js — 316 lignes

- `CAP_NAV_ITEMS` (l. 9) — Catalogue des vues : k = clé (vue capShowView, ou « ana:… » pour une sous-vue de 🔬 Analyses), l = libellé,
- `CAP_NAV_GROUPS` (l. 40) — Menus déroulants de la barre, dans l'ordre d'affichage (id = identifiant du bouton).
- `CAP_NAV_DEFAULT` (l. 49) — Réglage par défaut : tous les menus affichés, 🏠 Accueil (tout à gauche), 🔲 Diagrammes Capella (en tête, à côté de 🗺 Relation Map), ▤ Tabl
- `capNavMigrate` (l. 59) — Met à jour un réglage de barre enregistré avant l'arrivée du bouton ▤ Tableau (ancienne 📊 Table View
- `capNavSave` (l. 70) — Enregistre le réglage de la barre dans la page (bloc JSON repris par la 💾 Page HTML).
- `capNavCurKey` (l. 80) — Clé de la vue Capella affichée (« ana:… » pour une sous-vue de 🔬 Analyses).
- `capNavOpen` (l. 89) — Ouvre une vue du catalogue (ou la Relation Map pour la clé @rm).
- `capNavGroupOpen` (l. 100) — Ouvre la vue d'un menu (clic sur son nom) : la dernière vue non épinglée utilisée, sinon la première non épinglée.
- `capNavFluxTabs` (l. 110) — Onglets du menu 📡 Flux & interfaces (comme ceux de 🔬 Analyses) : vues du menu non épinglées,
- `capNavRender` (l. 120) — Reconstruit les boutons de la barre des vues selon le réglage (menus, épingles).
- `capNavSync` (l. 149) — Met à jour l'état actif des boutons de la barre (vue affichée, dernière sous-vue de chaque menu).
- `capNavClose` (l. 164) — Ferme le menu déroulant de la barre des vues.
- `capNavRow` (l. 173) — Ligne d'une vue dans un menu : ouverture au clic, 📌 pour l'épingler en bouton direct.
- `capNavMenu` (l. 183) — Ouvre le menu déroulant d'un groupe, ou le menu ☰ (toutes les vues, recherche, réglage).
- `capNavMenuFill` (l. 230) — Remplit le menu ouvert : vues du groupe, ou (menu ☰) réglage complet ou résultats de la recherche.

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

## 43-visite-guidee.js — 518 lignes

- `CAP_TOUR_STEPS` (l. 12) — Étapes de la visite générale : s = sélecteur CSS de la zone (toutes les correspondances visibles sont encadrées
- `CAP_TOUR_EXPLORE` (l. 66) — Étapes communes aux sous-vues de 🧭 Explorateur (onglets, types, recherche, couches).
- `CAP_TOUR_FLUX` (l. 81) — Étapes communes aux vues de 📡 Flux & interfaces (onglets de navigation).
- `CAP_TOUR_ANA_TXT` (l. 84) — Rôle de chaque sous-vue de 🔬 Analyses (texte de l'étape « analyse affichée »).
- `capTourRmCtx` (l. 97) — Visite 🗺 Relation Map : si aucun élément n'est au centre du graphe, en choisit un qui donne un visuel lisible —
- `CAP_TOUR_VIEWS` (l. 111) — Visites contextuelles, par vue : clé = '@rm' ou vue Capella (capCurrentView) ; l = nom de la vue,
- `CAP_TOUR_START` (l. 278) — 🚀 Bien démarrer, 1er temps (sans modèle) : où ouvrir le fichier. Terminer la visite arme la reprise (2e temps).
- `CAP_TOUR_AFTER` (l. 295) — 🚀 Bien démarrer, 2e temps (modèle chargé) : où trouver l'aide et les tutoriels.
- `CAP_TOUR_REVUE` (l. 312) — Visite du panneau 💬 Revue (ce n'est pas une vue : lancée par 🎓 dans le panneau ou par ? Aide ▾ → 💬 Visite de la revue).
- `capTourRev` (l. 328) — Visite de 💬 Revue : panneau ouvert dans la page (ramené s'il est dans sa fenêtre séparée) sur l'onglet présenté.
- `capTourRevue` (l. 330) — Lance la visite de 💬 Revue.
- `capTourHome` (l. 336) — Visite de 🏠 Accueil : affiche l'onglet présenté par l'étape.
- `capTourCtxKey` (l. 341) — Clé de la vue affichée pour les visites contextuelles.
- `capTourCtx` (l. 349) — Visite contextuelle de la vue affichée, si elle existe et qu'un modèle est chargé.
- `capTourEls` (l. 357) — Éléments affichés désignés par le sélecteur d'une étape.
- `capTourVisible` (l. 368) — Indique si une étape est utilisable (zone affichée, ou bulle centrée).
- `capTourStart` (l. 378) — Lance une visite guidée depuis sa première étape.
- `capTourStartView` (l. 399) — Lance la visite de la vue affichée (ou la visite générale s'il n'y en a pas).
- `capTourGo` (l. 407) — Passe à l'étape suivante ou précédente utilisable (les zones non affichées sont sautées).
- `capTourPos` (l. 427) — Numéros (rang, total) de l'étape courante parmi les étapes utilisables.
- `capTourRenderPop` (l. 434) — Remplit la bulle de l'étape courante (titre, texte, compteur, boutons).
- `capTourPlace` (l. 446) — Place le cadre clignotant sur la zone de l'étape courante et la bulle à côté (ou au centre).
- `capTourKey` (l. 478) — Raccourcis clavier pendant la visite : ← → Entrée pour naviguer, Échap pour quitter.
- `capTourEnd` (l. 487) — Quitte la visite guidée et retire la mise en évidence.
- `capTourHelpMenu` (l. 494) — Ouvre le menu ? Aide ▾ (s'il n'est pas déjà ouvert) pour l'étape qui le présente.
- `capTourStartHere` (l. 501) — Lance « 🚀 Bien démarrer » : sans modèle, montre où ouvrir le fichier et arme la reprise après chargement ;
- `capTourResumeAfterLoad` (l. 508) — Reprend « 🚀 Bien démarrer » (2e temps) après le chargement d'un modèle, si la reprise a été armée.

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

## 46-config-interface.js — 149 lignes

- `CAP_CFG_PARTS` (l. 9)
- `capCfgSer` (l. 20) — Sérialise en JSON en conservant les ensembles (Set). @param {*} o @returns {string}
- `capCfgRev` (l. 22) — Relit un JSON produit par capCfgSer (ensembles reconstitués). @param {string} t @returns {*}
- `capCfgGet` (l. 28) — État courant d'une partie de l'interface.
- `capCfgSet` (l. 43) — Applique une partie de configuration à l'interface (et la mémorise dans la page).
- `capCfgStoreViews` (l. 67) — Écrit dans la page (bloc JSON « cap-ui-views ») ce que les autres blocs ne conservent pas encore :
- `capCfgRestoreViews` (l. 74) — Réapplique à l'ouverture de la page les vues mémorisées par capCfgStoreViews.
- `capCfgDialog` (l. 90) — Fenêtre de choix des parties à enregistrer ou à charger.
- `capCfgLoadFile` (l. 129) — Ouvre un fichier .json d'interface et propose les parties à appliquer.
- `capCfgLoadUpdate` (l. 143) — Charge une mise à jour du modèle depuis un autre fichier : comparaison, delta, puis mise à jour après validation (🔄 Suivi).

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

## 50-a-propos.js — 87 lignes

- `CAP_APP_VERSION` (l. 5)
- `CAP_APP_AUTHOR` (l. 6)
- `CAP_APP_NAME` (l. 7)
- `CAP_APP_SLOGAN` (l. 8)
- `CAP_APP_REPO` (l. 9)
- `CAP_D3_LICENSE` (l. 11) — Texte de la licence ISC de D3.js (reproduction obligatoire).
- `capAboutTech` (l. 19) — Informations techniques (version, navigateur, accès direct aux fichiers, modèle chargé), pour un signalement.
- `capLogoSvg` (l. 39) — Logo d'Arcalyse (proposition B : la lettre « A » dessinée en graphe, nœuds aux couleurs des couches ARCADIA).
- `capAboutOpen` (l. 48) — Ouvre la fenêtre « À propos ».

## 51-tableau.js — 809 lignes

- `capTableTabNew` (l. 18) — Crée un onglet de vue du tableau.
- `capTableTabsEnsure` (l. 34) — Garantit l'existence d'au moins un onglet ; le premier reprend l'état courant du tableau.
- `capTableSyncToTab` (l. 41) — Copie l'état de travail du tableau (colonnes, filtres, largeurs, tri) dans l'onglet actif.
- `capTableSyncFromTab` (l. 48) — Charge l'état de l'onglet actif dans les variables de travail du tableau.
- `capTableTypesApply` (l. 67) — Applique un ensemble de types cochés à la barre latérale (registre) et aux filtres.
- `capTableTypesLoad` (l. 73) — Charge les types de l'onglet actif (un onglet sans réglage reprend les types des autres vues).
- `capTableSidebar` (l. 80) — Redessine la barre latérale des types en gardant la recherche saisie.
- `capTableTypesView` (l. 88) — Entrée dans le ▤ Tableau ou sortie : échange les types cochés de l'onglet et ceux des autres vues.
- `capTableTabSwitch` (l. 105) — Active un onglet du tableau (l'état de l'onglet quitté est conservé).
- `capRenderTableTabs` (l. 114) — Rend la barre d'onglets du tableau : clic = ouvrir, double-clic = renommer, ✕ = fermer,
- `capTableRelIndex` (l. 163) — Index des relations Capella par élément : pour chaque relation, éléments cibles (out) et sources (in).
- `capTableRelParse` (l. 184) — Décode une clé de colonne de relation « rel:<relation>:out|in ».
- `capTableRelEnds` (l. 194) — Libellés lisibles des deux extrémités d'une relation (types source et cible).
- `capTableRelValues` (l. 206) — Valeurs d'une colonne de relation pour un élément : noms des éléments liés (sans doublon).
- `capTableRelLabel` (l. 218) — Libellé d'en-tête d'une colonne de relation.
- `capTableRelPicker` (l. 232) — Ajoute au menu ⊞ Colonnes les sections « Relations — … » (groupes de 🔗 Liens) : une entrée par
- `capTableRows` (l. 273) — Lignes du tableau : éléments filtrés (types cochés et portée de l'onglet, filtres par colonne), triés
- `capTableSortCycle` (l. 296) — Passe au tri suivant sur une colonne : croissant ▲, décroissant ▼, puis sans tri.
- `capTableColDnD` (l. 310) — Rend un en-tête déplaçable : glisser-déposer sur un autre en-tête pour changer l'ordre des colonnes.
- `capTableCsv` (l. 338) — Exporte en CSV les colonnes affichées, pour toutes les lignes filtrées (dans l'ordre du tri ; en 🌳 arbre :
- `capTableCfgGet` (l. 358) — État du tableau pour l'enregistrement : onglets, colonnes par chemin, affichage des cellules multiples.
- `capTableCfgSet` (l. 367) — Applique un état enregistré du tableau (format à onglets, ou ancien format à une seule vue).
- `capTableTvCustom` (l. 385) — Colonnes par chemin de l'ancienne Table View reprises telles quelles : celles qui ne suivent aucune
- `capTableTvTab` (l. 395) — Convertit un onglet (ou une vue .json) de l'ancienne Table View en onglet du tableau.
- `capTableImportTv` (l. 415) — Reprend les réglages de l'ancienne 📊 Table View (page enregistrée ou fichier ⚙) : ses onglets
- `capTableApplyViewFile` (l. 436) — Applique un fichier 📂 Charger vue à l'onglet actif : vue du tableau (« capella-table-view »)
- `capTableScopeSet` (l. 471) — Ensemble des identifiants des éléments en portée (contenu des éléments choisis).
- `capTableScopeLabel` (l. 488) — Libellé court de la portée pour le bouton de la barre du tableau.
- `capTableScopeButton` (l. 498) — Bouton « 🎯 Portée » de la barre du tableau (info-bulle : éléments choisis et mode).
- `capTableScopeDialog` (l. 514) — Ouvre la fenêtre 🎯 Portée de l'onglet : éléments choisis (✕ pour retirer), mode (à tous les niveaux /
- `capTableTreeBuild` (l. 612) — Construit la structure de l'arbre du tableau à partir des lignes (dans leur ordre).
- `capTableTreeItems` (l. 640) — Éléments à afficher en arbre, à plat, dans l'ordre (seulement les nœuds dépliés, sauf si all).
- `capTableTreeControls` (l. 660) — Ajoute à la barre du tableau les commandes d'affichage : ☰ Lignes / 🌳 Arbre, et en arbre un menu ▾
- `capTableTreeToggle` (l. 705) — Déplie ou replie un nœud de l'arbre du tableau.
- `capTSelUpd` (l. 719) — Met à jour le compteur de sélection et le bouton 📋 Copier de la barre du tableau.
- `capTSelPaint` (l. 726) — Repeint les cellules sélectionnées du tableau.
- `capTSelClear` (l. 734) — Efface la sélection de cellules.
- `capTSelCopy` (l. 738) — Copie les cellules sélectionnées (une ligne par ligne du tableau, cases vides conservées ; cellule à plusieurs
- `capTSelControls` (l. 753) — Bouton 📋 Copier et compteur de sélection pour la barre du tableau.
- `capTSelWire` (l. 764) — Branche la sélection de cellules sur le corps du tableau qui vient d'être rendu.
- `capTableColRename` (l. 797) — Renomme une colonne par chemin depuis son en-tête (champ de saisie à la place du libellé).

## 52-selection-cellules.js — 137 lignes

- `CAP_CS_EXCL` (l. 12)
- `capClipCopy` (l. 20) — Copie une grille de cellules dans le presse-papiers : texte tabulé sans guillemets (éditeurs de texte, champs)
- `capCsTable` (l. 40) — Tableau éligible à la sélection pour un élément cliqué (ou null).
- `capCsPos` (l. 48) — Position « ligne:colonne » d'une cellule dans son tableau. @param {HTMLTableCellElement} td @returns {number[]}
- `capCsPaint` (l. 51) — Repeint la sélection et place la pastille près de la dernière cellule.
- `capCsClear` (l. 72) — Efface la sélection de cellules des vues.
- `capCsText` (l. 76) — Texte d'une cellule pour la copie (retours à la ligne des éléments empilés conservés).
- `capCsCopy` (l. 81) — Copie la sélection, ou tout le tableau (en-têtes et lignes visibles).
- `capCsRect` (l. 96) — Rectangle de cellules entre deux positions. @param {number[]} a @param {number[]} b @returns {Set<string>}
- `capCsClickable` (l. 100) — La cellule (ou sa ligne) a-t-elle déjà une action au clic ? (lien, bouton, curseur main)

## 53-export-enrichi.js — 153 lignes

- `capCx` (l. 16) — Cellule « élément » d'un export enrichi.
- `capCxList` (l. 22) — Cellule « élément » à partir d'une liste d'objets {id, name} (noms séparés par des virgules).
- `CAP_CSVX_INFOS` (l. 25) — Informations ajoutables de base (clé, libellé).
- `capCsvxOwner` (l. 29) — Owner (plus proche ancêtre qui est un élément du modèle) d'un élément.
- `capCsvxPlain` (l. 37) — Texte brut d'une description Capella (HTML retiré, sans exécuter quoi que ce soit).
- `capCsvxInfo` (l. 47) — Valeur d'une information pour un élément.
- `capCsvxInfoLabel` (l. 68) — Libellé d'une clé d'information (pour l'en-tête « Colonne — information »).
- `capCsvxText` (l. 77) — Texte d'une cellule (élément ou texte).
- `capCsvxBuild` (l. 85) — Construit l'en-tête et les lignes finales d'un export selon les choix enregistrés.
- `capCsvExport` (l. 102) — Export CSV enrichi : ouvre la fenêtre « Colonnes de l'export » puis télécharge le fichier.

## 54-diagrammes.js — 1143 lignes

- `CAP_DIAG_COUCHES` (l. 19) — Ordre des couches ARCADIA dans la liste et les exports.
- `capDiagDispo` (l. 22) — @returns {boolean} vrai si la visionneuse d'Arcature est embarquée dans la page
- `capIco` (l. 35) — Icône d'un élément du modèle, comme dans Capella (variante selon acteur, humain, nature, genre de fonction…),
- `capIcoType` (l. 53) — Icône d'un type d'élément (sans variante), sans modèle chargé.
- `capDiagLoadAird` (l. 69) — Charge un fichier .aird (diagrammes du projet). Sans modèle chargé (ou s'il accompagne un .capella en cours
- `capDiagSetAird` (l. 94) — Mémorise le texte d'un .aird (les diagrammes seront relus par la visionneuse à la prochaine synchronisation).
- `capDiagAvantNouveauModele` (l. 105) — Un autre modèle remplace le modèle affiché : les diagrammes de l'ancien modèle (.aird) ne lui correspondent pas,
- `capDiagApresMaj` (l. 119) — Après une 🔄 mise à jour du modèle (même projet, nouvelle version du .capella) : les diagrammes chargés viennent
- `capDiagRefsManquantes` (l. 146) — Nombre d'éléments du modèle montrés par le .aird chargé (références « fichier#id ») qui n'existent plus dans le modèle affiché.
- `capDiagMajDialogue` (l. 160) — Fenêtre affichée après une 🔄 mise à jour du modèle quand les diagrammes (.aird) peuvent ne plus correspondre :
- `capDiagPickAird` (l. 188) — 📂 Ouvrir le .aird : sélecteur à accès direct ouvert dans le dossier du .capella (Edge/Chrome,
- `capOpenProjectFolder` (l. 207) — 📁 Dossier du projet (écran d'accueil) : charge ensemble le modèle .capella et ses diagrammes .aird.
- `capProjectScanDir` (l. 222) — Lit un dossier du projet (sélecteur ou dossier déposé) sur 2 niveaux et charge le modèle et ses diagrammes.
- `capProjectFromFiles` (l. 240) — Charge un projet à partir des fichiers d'un dossier : le .capella (choisi dans l'écran d'accueil s'il y en a plusieurs)
- `capDiagMsg` (l. 265) — Affiche un message bref dans la barre de la vue. @param {string} t - Texte
- `capDiagEnsure` (l. 268) — Crée la vue (une fois) : barre (ouvrir, export, sélection), liste classée à gauche, hôte de la visionneuse.
- `capDiagSplit` (l. 299) — Séparateur entre l'explorateur et le diagramme : glisser pour régler la largeur de l'explorateur.
- `capDiagCarte` (l. 316) — ▣ Carte (mini-carte de la visionneuse) : sous l'explorateur (repliable) ou dans le diagramme, comme dans la visionneuse.
- `capDiagBarre` (l. 340) — Barre du haut : 📂 Ouvrir le .aird…, ⬇ Exporter…, ☐ Sélectionner…, fichier chargé.
- `capDiagFit` (l. 354) — Ajuste la hauteur de la vue à la fenêtre.
- `capDiagSync` (l. 362) — Transmet à la visionneuse le modèle courant (texte XML) et le .aird en attente, si besoin.
- `capDiagBarreVd` (l. 388) — Réorganise la barre de la visionneuse au-dessus du diagramme, pour qu'elle ne bouge plus d'un diagramme à l'autre :
- `capDiagRevSlot` (l. 416) — Remplit l'emplacement de la revue (📝 Note de revue, 💬 Calque) à côté de la recherche du diagramme.
- `capDiagChainesFiltre` (l. 425) — Liste « Chaînes et chemins » : ne garde que les chaînes fonctionnelles et chemins physiques dessinés dans
- `capRenderDiagrams` (l. 436) — Rendu de la vue 🔲 Diagrammes Capella.
- `capDiagReps` (l. 450) — @returns {object[]} représentations du .aird chargé ({uid, nom, type, sigle, genre, couche})
- `capDiagCouche` (l. 453) — Libellé et couleur d'une couche ARCADIA. @param {string} c - OA, SA, LA, PA, EPBS… @returns {{label:string,color:string,bg:string}}
- `capDiagRang` (l. 456) — Rang d'une couche pour le tri. @param {string} c - Couche @returns {number}
- `capDiagIcones` (l. 459) — Icône de chaque diagramme, reprise de la liste (masquée) de la visionneuse. @returns {Map<string,string>} uid → SVG
- `capDiagFiltrees` (l. 468) — Représentations filtrées par la recherche (nom, type, sigle, couche). @returns {object[]}
- `capDiagGroupes` (l. 479) — Regroupe les représentations selon le classement choisi.
- `capDiagOuvert` (l. 514) — Un groupe est-il ouvert ? Couches ouvertes, types repliés par défaut ; tout est ouvert pendant une recherche.
- `capDiagListe` (l. 521) — Rend la liste classée (panneau gauche).
- `capDiagMarquerActif` (l. 567) — Met en évidence le diagramme ouvert dans la liste.
- `capDiagRepsGroupe` (l. 576) — Représentations d'un groupe de la liste (selon la clé).
- `capDiagClic` (l. 583) — Clics de la vue : barre (ouvrir, export, sélection), carte, groupes repliables, diagrammes. @param {MouseEvent} e
- `capDiagChange` (l. 610) — Cases à cocher (diagramme, groupe, tout) et choix du classement. @param {Event} e
- `capDiagOpen` (l. 625) — Ouvre un diagramme dans la vue 🔲 Diagrammes Capella et y met un élément en évidence.
- `capDiagInfo` (l. 636) — Panneau de détail d'un diagramme (comme pour un élément du modèle) : type, couche, sigle, nature, identifiant,
- `capDiagDetail` (l. 674) — Section « Diagrammes » du panneau de détail : représentations de l'élément et diagrammes où il est dessiné.
- `capDiagSvg` (l. 692) — SVG autonome d'un diagramme, tel que l'exporte la visionneuse (menu ⬇ Exporter › SVG) :
- `capDiagPlanche` (l. 724) — Planche d'un diagramme : cadre, en-tête (couche, sigle, nom, type), diagramme centré, cartouche technique
- `capDiagTexte` (l. 803) — Texte brut d'une description Capella (attribut XML contenant du HTML).
- `capDiagMeta` (l. 815) — Description et élément représenté d'un diagramme, lus dans le .aird (DRepresentationDescriptor : documentation, target).
- `capDiagElements` (l. 835) — Annexe d'un diagramme : éléments du modèle représentés (attributs data-sem du SVG), triés par couche, type et nom.
- `capDiagAnnexeCsv` (l. 848) — Annexe au format CSV (séparateur ;, BOM) : en-tête du diagramme, description, puis éléments représentés.
- `CAP_DIAG_ANX` (l. 855) — Lignes d'annexe par page PDF.
- `capDiagAnnexePages` (l. 864) — Pages d'annexe du PDF (A4 paysage) : tableau des éléments représentés.
- `capDiagCibles` (l. 900) — Diagrammes visés par l'export, dans l'ordre de la liste (couche, type, nom).
- `capDiagExportDialog` (l. 907) — Fenêtre « Exporter des diagrammes » : portée, mise en page, aperçu de la planche, formats.
- `capDiagApercu` (l. 952) — Aperçu de la planche du premier diagramme visé (diagramme ouvert s'il en fait partie).
- `capDiagPdfSommaire` (l. 971) — Page de sommaire du PDF (paysage A4) : projet, date, nombre de planches, liste par couche et type avec numéros de page.
- `CAP_DIAG_PDF_ALERTE` (l. 1013) — Seuil (Mo) au-delà duquel l'export PDF demande confirmation.
- `capDiagPdfEstimation` (l. 1023) — Taille estimée du PDF, d'après la surface des planches rastérisées (même bornes que capSvgToCanvas)
- `capDiagExport` (l. 1037) — Export groupé des diagrammes en planches : capture de tous les diagrammes, puis pagination
- `capDiagExportHtml` (l. 1108) — Rapport HTML autonome : onglet Sommaire (tableau avec liens) et onglet Planches

## 55-revue.js — 1237 lignes

- `capRevNorm` (l. 27) — Complète des données de revue (lues dans la page ou un fichier) avec les valeurs par défaut.
- `capRevStatuts` (l. 36) — @returns {object[]} statuts d'un commentaire {k, l, c, i} (k : valeur enregistrée)
- `capRevCrits` (l. 43) — @returns {object[]} niveaux de criticité {k, l, c} ('' : non renseignée)
- `capRevCats` (l. 50) — @returns {object[]} catégories {k, l} ('' : non renseignée)
- `capRevSt` (l. 54) — @param {object} c - Commentaire @returns {object} statut
- `capRevCr` (l. 56) — @param {object} c - Commentaire @returns {object} criticité
- `capRevClosed` (l. 58) — @param {object} c - Commentaire @returns {boolean} vrai si le commentaire est clos (validé ou rejeté)
- `capRevLate` (l. 60) — @param {object} c - Commentaire @returns {boolean} vrai si l'échéance est dépassée et le commentaire non clos
- `capRevFieldLabel` (l. 62) — Libellé d'un champ commenté. @param {string} f - '' (élément), 'name', 'description' ou attribut @returns {string}
- `capRevDate` (l. 64) — Date ISO → date courte affichée. @param {string} d @returns {string}
- `capRevDateTime` (l. 66) — Date ISO → date et heure affichées. @param {string} d @returns {string}
- `capRevSave` (l. 74) — Enregistre la revue dans la page (bloc JSON repris par la 💾 Page HTML) et rafraîchit l'affichage.
- `capRevRefresh` (l. 82) — Rafraîchit tout ce qui montre la revue : badge, panneau, calque du diagramme, marques des vues.
- `capRevMarkSaved` (l. 93) — La page vient d'être enregistrée : plus aucun commentaire en attente d'enregistrement.
- `capRevUnsavedCount` (l. 95) — @returns {number} nombre de commentaires modifiés depuis le dernier enregistrement ou export
- `capRevUid` (l. 97) — Identifiant unique d'un commentaire. @returns {string}
- `capRevHash` (l. 102) — Empreinte courte (FNV-1a 32 bits) d'un texte. @param {string} s @returns {string}
- `capRevValue` (l. 110) — Valeur commentée d'un élément : nom, description (texte), attribut, ou pour l'élément entier
- `capRevSnap` (l. 123) — Mémorise la valeur commentée : empreinte, extrait du texte (champ) ou attributs et nombre d'enfants (élément).
- `capRevTarget` (l. 135) — Cible d'un commentaire pour un élément du modèle chargé.
- `capRevTargetState` (l. 140) — État d'une cible sur le modèle chargé. @param {object} t - Cible @returns {string} 'same' | 'changed' | 'deleted' | 'na'
- `capRevState` (l. 146) — État d'un commentaire (pire état de ses cibles). @param {object} c @returns {string} 'same' | 'changed' | 'deleted' | 'na'
- `capRevToCheck` (l. 152) — @returns {object[]} commentaires non clos dont une cible a changé ou disparu, ou marqués « Corrigé, à vérifier »
- `capRevProjectId` (l. 157) — @returns {string} identifiant (UUID) de l'élément racine Project du modèle chargé ('' sans modèle)
- `capRevProjectName` (l. 159) — @returns {string} nom du Project du modèle chargé
- `capRevOtherProject` (l. 161) — @param {object} c - Commentaire @returns {boolean} vrai si le commentaire a été posé sur un autre projet que celui chargé
- `capRevMatch` (l. 175) — Compare une revue (ou des commentaires) au modèle chargé. Critères, dans l'ordre :
- `CAP_REV_MIN_ELTS` (l. 191) — En dessous de ce nombre d'éléments commentés, la part retrouvée dans le modèle ne suffit pas à conclure.
- `capRevOnModelLoad` (l. 195) — Après le chargement d'un modèle : rattache au projet les anciens commentaires qui n'en avaient pas,
- `capRevBadge` (l. 208) — Met à jour le badge du bouton 💬 Revue (commentaires ouverts ; ⚠ s'il y en a à vérifier).
- `capRevToggle` (l. 219) — Ouvre ou ferme le panneau 💬 Revue (dans la page, ou dans sa fenêtre séparée si elle est ouverte : elle passe alors au premier plan).
- `capRevPanel` (l. 232) — @returns {HTMLElement} panneau 💬 Revue (créé au premier appel ; il peut se trouver dans la fenêtre séparée)
- `capRevPop` (l. 243) — @returns {Window|null} fenêtre séparée de la revue, si elle est ouverte
- `capRevDoc` (l. 245) — @returns {Document} document où l'utilisateur travaille sur la revue : la fenêtre séparée si elle a le focus, sinon la page
- `capRevQ` (l. 247) — @param {string} id @returns {HTMLElement|null} élément du panneau (page ou fenêtre séparée)
- `capRevConfirm` (l. 249) — @param {string} msg @returns {boolean} confirmation demandée dans la fenêtre où l'on travaille
- `capRevAlert` (l. 251) — @param {string} msg - Message affiché dans la fenêtre où l'on travaille
- `capRevPopOut` (l. 258) — ⧉ Ouvre le panneau 💬 Revue dans une fenêtre séparée (à placer sur un autre écran). La fenêtre dépend de la page :
- `capRevPopTheme` (l. 276) — Recopie le thème de la page (attributs et variables de couleur de <html>) dans la fenêtre séparée. @param {Window} w
- `capRevPopBack` (l. 281) — Fenêtre séparée fermée : le panneau revient (fermé) dans la page.
- `capRevRender` (l. 289) — Affiche le contenu du panneau 💬 Revue (onglet courant).
- `capRevPeople` (l. 320) — Personnes connues : participants, auteurs et responsables des commentaires. @returns {string[]}
- `capRevFiltered` (l. 326) — @returns {object[]} commentaires de l'onglet 💬 Commentaires, filtrés et triés
- `capRevListHtml` (l. 348) — Onglet 💬 Commentaires : filtres et cartes. @returns {string} HTML
- `capRevCardHtml` (l. 368) — Carte d'un commentaire (repliée : en-tête, titre, méta ; dépliée : texte complet, réponses, actions).
- `capRevTargetsHtml` (l. 398) — Pastilles des cibles d'un commentaire (élément + champ, diagramme), cliquables. @param {object} c @returns {string} HTML
- `capRevPanelClick` (l. 408) — Clics du panneau (délégation). @param {MouseEvent} e
- `capRevPanelInput` (l. 442) — Saisie dans le panneau : recherche, réglages. @param {Event} e
- `capRevPanelChange` (l. 447) — Listes et cases du panneau : filtres, statut d'un commentaire, réglages. @param {Event} e
- `capRevGet` (l. 459) — @param {string} id @returns {object|undefined} commentaire
- `capRevGoto` (l. 466) — Montre la cible d'un commentaire : sa note dans le diagramme (s'il a été posé sur un diagramme et que le .aird
- `capRevValidate` (l. 477) — Valide un commentaire (correction vérifiée) : statut Validé, date et vérificateur. @param {object} c
- `capRevResnap` (l. 482) — Prend la version actuelle du modèle comme nouvelle référence des cibles d'un commentaire. @param {object} c
- `capRevNew` (l. 493) — Nouveau commentaire : ouvre l'éditeur avec ses cibles (et sa note de diagramme) déjà renseignées.
- `capRevEdit` (l. 501) — Éditeur d'un commentaire (fenêtre) : texte (seul champ obligatoire), titre, criticité, catégorie, statut,
- `capRevDetailHead` (l. 610) — Boutons 💬 du panneau de détail, sous le nom de l'élément : commenter l'élément, son nom, sa description.
- `capRevAttrBtn` (l. 624) — Petit bouton 💬 d'un attribut du panneau de détail (visible au survol) : commenter cet attribut.
- `capRevDetailSection` (l. 633) — Section « Commentaires » du panneau de détail : commentaires portant sur l'élément.
- `capRevDetailSectionIn` (l. 643) — Contenu de la section « Commentaires » du panneau de détail.
- `capRevShow` (l. 652) — Ouvre 💬 Revue sur un commentaire (déplié). @param {string} id
- `capRevShowFor` (l. 658) — Ouvre 💬 Revue sur les commentaires d'un élément. @param {string} id
- `CAP_REV_ID_ATTRS` (l. 663) — Attributs portant l'identifiant d'un élément du modèle dans les vues (blocs, tableaux, listes, diagrammes).
- `capRevChainAt` (l. 669) — Chaîne (⚡ Chaînes) dans laquelle se trouve un élément de l'interface : carte de chaîne ou graphe de la vue Relation Map des chaînes.
- `capRevChainFns` (l. 678) — Fonctions (ou composants) d'une chaîne, pour les proposer comme éléments commentés.
- `capRevElementAt` (l. 690) — Élément du modèle désigné par un nœud de l'interface (lui ou un de ses parents) : attribut d'identifiant
- `capRevContext` (l. 704) — Menu du clic droit dans les vues : sur un élément, commenter l'élément, son nom, sa description, voir ses commentaires.
- `capRevShowDiag` (l. 748) — Ouvre 💬 Revue sur les notes du diagramme ouvert.
- `capRevMarkSchedule` (l. 754) — Programme la mise à jour des marques 💬 (après un rendu de vue).
- `capRevMark` (l. 756) — Marque d'un 💬 les blocs, cartes et noms cliquables des éléments qui ont des commentaires non clos.
- `capRevDiagUid` (l. 772) — @returns {string} identifiant du diagramme ouvert dans la visionneuse ('' sinon)
- `capRevDiagBar` (l. 778) — Commandes de la revue dans la barre de 🔲 Diagrammes Capella : 📝 Note (à glisser sur le diagramme) et
- `capRevLayerEnsure` (l. 786) — Installe (une fois) le calque des commentaires au-dessus du diagramme et ses écouteurs.
- `capRevDiagNoteAt` (l. 833) — Pose une note de revue sur le diagramme ouvert, à un point de l'écran (centre de la vue par défaut),
- `capRevDiagBox` (l. 850) — Boîte d'un élément du diagramme en coordonnées du diagramme (union de ses formes dessinées).
- `capRevLayerDraw` (l. 865) — Dessine les notes du diagramme ouvert sur le calque : un plan qui suit le zoom et le déplacement
- `capRevNoteClick` (l. 909) — Boutons d'une note du calque : lier, modifier, réduire / agrandir. @param {MouseEvent} e
- `capRevToggleTarget` (l. 923) — Lie un élément à un commentaire, ou le délie s'il l'était déjà.
- `capRevNoteLine` (l. 937) — Trait tiré depuis la poignée ● d'une note : suit le pointeur (élément visé en surbrillance) ;
- `capRevNoteDown` (l. 959) — Glisser une note (en-tête ou pastille), la redimensionner (coin) ou tirer un trait vers un élément (poignée ●). @param {PointerEvent} e
- `capRevDiffHtml` (l. 988) — Différence entre la valeur commentée et le modèle chargé, pour une cible.
- `capRevCheckHtml` (l. 1002) — Onglet 🔁 Vérifier. @returns {string} HTML
- `capRevCheckAll` (l. 1019) — Valide tous les commentaires à vérifier (après confirmation).
- `capRevReportList` (l. 1028) — @returns {object[]} commentaires du rapport (ceux de la liste filtrée, ou tous)
- `capRevSynthese` (l. 1030) — Tableau croisé statut × criticité. @param {object[]} l - Commentaires @returns {string} HTML
- `capRevReportTab` (l. 1038) — Onglet 📄 Rapport : synthèse et exports. @returns {string} HTML
- `capRevGroupes` (l. 1056) — Groupes du rapport selon le regroupement choisi.
- `capRevReportHtml` (l. 1066) — Télécharge le rapport HTML autonome de la revue.
- `capRevCsv` (l. 1089) — Télécharge les commentaires du rapport en CSV (une ligne par commentaire).
- `capRevCfgHtml` (l. 1101) — Onglet ⚙ Réglages. @returns {string} HTML
- `capRevCfgAction` (l. 1123) — Actions de l'onglet ⚙ Réglages : participants, export, import, suppression.
- `capRevExport` (l. 1131) — Exporte la revue (participants et commentaires) dans un fichier .json réutilisable.
- `capRevImport` (l. 1138) — Importe un fichier .json de revue, ou une page de 📤 revue ciblée relue (.html), et la fusionne avec les commentaires de la page.
- `capRevImportConfirm` (l. 1172) — Fenêtre d'avertissement avant d'importer une revue qui ne semble pas porter sur le modèle chargé :
- `capRevMerge` (l. 1206) — Fusionne une revue importée : nouveaux commentaires ajoutés (renumérotés si leur numéro est pris),

## 56-accueil.js — 671 lignes

- `CAP_HOME_DND` (l. 23) — Type de données glissées (référence vers un diagramme ou un élément).
- `CAP_HOME_COULEURS` (l. 25) — Couleurs proposées pour les notes du tableau blanc.
- `capHomeNorm` (l. 32) — Complète des données d'accueil (lues dans la page ou un fichier) avec les valeurs par défaut.
- `capHomeUid` (l. 43) — Identifiant unique (point, section, document, note). @returns {string}
- `capHomeSave` (l. 46) — Enregistre l'accueil dans la page (bloc JSON repris par la 💾 Page HTML).
- `capHomeSaveLater` (l. 53) — Enregistrement différé (saisie au clavier).
- `capHomeSetData` (l. 58) — Remplace les données de l'accueil (📄 Ouvrir un projet de travail) et réaffiche la vue si elle est ouverte.
- `capHomeRefEl` (l. 71) — Référence vers un élément du modèle.
- `capHomeReps` (l. 76) — Représentations du .aird chargé (la visionneuse est préparée si besoin). @returns {object[]}
- `capHomeRefDiag` (l. 86) — Référence vers un diagramme.
- `capHomeRefOk` (l. 88) — @param {object} ref @returns {boolean} vrai si la cible existe (élément du modèle, diagramme du .aird chargé)
- `capHomeRefIco` (l. 95) — Icône d'une référence : dessin Capella de l'élément ou du diagramme.
- `capHomeRefNom` (l. 101) — Nom affiché d'une référence (nom actuel dans le modèle si l'élément existe). @param {object} ref @returns {string}
- `capHomeRefType` (l. 103) — Type lisible d'une référence. @param {object} ref @returns {string}
- `capHomeChip` (l. 110) — Pastille d'une référence (dans un point de check-list ou le périmètre d'un plan), cliquable, avec ✕ pour la retirer.
- `capHomeRefOpen` (l. 120) — Ouvre la cible d'une référence : diagramme (🔲 Diagrammes Capella) ou panneau de détail de l'élément.
- `capRenderHome` (l. 135) — Affiche la vue 🏠 Accueil (et rafraîchit les check-lists et tableaux blancs ouverts dans une fenêtre séparée).
- `CAP_HOME_SCROLLS` (l. 158) — Zones qui défilent dans l'accueil (vue ou fenêtre séparée) : page, liste de gauche, document ouvert.
- `capHomeScrollGet` (l. 164) — Positions de défilement des zones de l'accueil, avant un nouveau rendu.
- `capHomeScrollSet` (l. 170) — Rétablit les positions de défilement après un rendu (plier un chapitre, cocher une case… ne ramène plus en haut).
- `capHomeCapellaVersion` (l. 175) — @returns {string} version de Capella du modèle, lue dans les espaces de noms du fichier ('' si inconnue)
- `capHomeCouches` (l. 184) — Contenu du modèle par couche : nombre d'éléments et types principaux (hors types techniques et paquetages).
- `capHomeProgress` (l. 191) — @param {object} d - Check-list ou plan @returns {{ok:number, n:number}} points cochés / points
- `capHomeBar` (l. 193) — Barre d'avancement. @param {{ok:number,n:number}} p @returns {string} HTML
- `capHomeCartes` (l. 200) — Cartes de l'onglet 🏠 Projet, dans l'ordre par défaut : k = clé, l = titre, w = largeur par défaut (1 ou 2 colonnes),
- `capHomeCartesOrdre` (l. 237) — @returns {string[]} clés des cartes affichées, dans l'ordre choisi (cartes nouvelles ajoutées à la fin)
- `capHomeProjetHtml` (l. 243) — Onglet 🏠 Projet : cartes (ordre, largeur et cartes masquées réglables par ⚙ Disposer). @returns {string} HTML
- `capHomeModeles` (l. 266) — Modèles de check-lists (ARCADIA) : sections et points proposés.
- `capHomeNewDoc` (l. 288) — Crée une check-list ou un plan de revue et l'ouvre.
- `capHomeQuickDoc` (l. 311) — ⚡ Check-list rapide : une section, un point par ligne (au moins un point vide), puis ouverture.
- `capHomeDocsHtml` (l. 321) — Onglet ☑ Check-lists & plans de revue : création (listes « Nouvelle check-list », « Nouveau plan de revue »), import,
- `capHomeDocHtml` (l. 343) — Document ouvert : en-tête (titre, avancement, actions), champs du plan de revue, sections et points.
- `capHomePerimIds` (l. 389) — Identifiants du périmètre d'un plan : éléments et diagrammes du périmètre et des points.
- `capHomeComPerim` (l. 395) — @param {object} c - Commentaire de revue @param {{el:Set,diag:Set}} ids - Périmètre @returns {boolean} vrai si le commentaire porte sur le p
- `capHomeDocExport` (l. 401) — Document HTML imprimable d'une check-list ou d'un plan de revue.
- `capHomeDocImport` (l. 429) — Importe une check-list ou un plan de revue enregistré en .json (💾 .json).
- `capHomePaletteHtml` (l. 449) — Palette à droite (check-lists, tableaux blancs, fenêtres séparées) : recherche, diagrammes, éléments. @returns {string} HTML
- `capHomePaletteList` (l. 457) — Résultats de la palette : diagrammes (filtrés), éléments dont le nom contient la recherche. @returns {string} HTML
- `capHomeRender` (l. 476) — Réaffiche la vue 🏠 Accueil si elle est affichée, et les fenêtres séparées ouvertes.
- `capHomeDocOf` (l. 485) — Check-list ou plan concerné par un élément de l'interface (vue ou fenêtre séparée).
- `capHomeCurDoc` (l. 487) — @returns {object|undefined} document ouvert dans l'onglet ☑
- `capHomeWin` (l. 492) — Fenêtre d'un élément de l'interface (la page, ou une fenêtre séparée) : boîtes de dialogue au bon endroit.
- `capHomeFind` (l. 498) — Premier élément correspondant au sélecteur, dans la page ou les fenêtres séparées (curseur placé après un rendu).
- `capHomeWire` (l. 508) — Branche (une fois) les écouteurs d'un conteneur (vue ou fenêtre séparée) : clics, saisies, glisser-déposer,
- `CAP_HOME_CARTE` (l. 547) — Type de données glissées pour réordonner les cartes de 🏠 Projet.
- `capHomeCarteMove` (l. 553) — Place une carte de 🏠 Projet avant une autre.
- `capHomeDrop` (l. 565) — Dépôt d'une référence (ou d'un texte) sur une zone : périmètre, point, section, tableau blanc.
- `capHomeItemAdd` (l. 584) — Ajoute un point à une section (après un point donné, sinon à la fin) et y place le curseur.
- `capHomeMove` (l. 591) — Déplace un objet d'une liste d'un cran. @param {Array} l @param {number} i @param {number} dir - -1 / +1
- `capHomeClick` (l. 594) — Clics de la vue et des fenêtres séparées (délégation). @param {MouseEvent} e
- `capHomeInput` (l. 647) — Saisie : fiche projet, titres, champs du plan, points, notes du tableau blanc, recherche de la palette. @param {Event} e
- `capHomeChange` (l. 662) — Listes et cases : création d'une check-list ou d'un plan, champs du plan, case d'un point. @param {Event} e

## 57-projet-page.js — 205 lignes

- `CAP_PROJET_VERSION_MIN` (l. 16) — Plus ancienne version d'Arcalyse dont les pages enregistrées sont reprises sans réserve.
- `CAP_PROJET_BLOCS` (l. 18) — Blocs JSON d'une page enregistrée repris à l'ouverture d'un projet de travail.
- `capProjetPagePick` (l. 25) — 📄 Ouvrir un projet de travail : choix de la page HTML (sélecteur à accès direct quand le navigateur le permet,
- `capProjetPageOuvrir` (l. 45) — Lit une page HTML de projet (choisie ou déposée), analyse son contenu et propose ce qu'il faut reprendre.
- `capProjetPageLire` (l. 67) — Analyse le texte d'une page HTML enregistrée, sans l'exécuter.
- `capProjetVersionCmp` (l. 82) — Compare deux numéros de version (« 2.1 », « 2.10.1 »).
- `capProjetBloc` (l. 94) — Relit un bloc JSON d'une page enregistrée (ensembles « __set » reconstitués, comme les fichiers ⚙ d'interface).
- `capProjetParties` (l. 104) — Parties d'une page de projet, avec ce qu'elles contiennent (pour la fenêtre de choix).
- `capProjetPageDialogue` (l. 129) — Fenêtre « Ouvrir un projet de travail » : version de la page, compatibilité, parties à reprendre (cochées),
- `capProjetPageAppliquer` (l. 170) — Applique une page de projet : travail et réglages cochés, puis modèle et diagrammes ; ouvre 🏠 Accueil.

## 58-revue-ciblee.js — 291 lignes

- `capRevAvisListe` (l. 15) — Avis qu'un relecteur peut donner en répondant à un commentaire : k = valeur enregistrée, l = libellé.
- `capRevAvis` (l. 19) — @param {object} r - Réponse @returns {string} libellé de son avis ('' sans avis)
- `capRevCibleeDialog` (l. 25) — Fenêtre « 📤 Revue ciblée » : titre, consignes, date de retour, commentaires à soumettre (cases), options.
- `capRevCibleeDiagrammes` (l. 94) — Diagrammes commentés (notes posées sur un diagramme) : SVG exporté par la visionneuse, avec les notes des
- `capRevCibleeExport` (l. 119) — Crée et télécharge la page HTML de revue ciblée.
- `capRevCibleePage` (l. 139) — Code HTML complet de la page de revue ciblée (autonome, hors ligne) : données, styles, script de saisie des réponses.
- `$` (l. 188)
- `esc` (l. 189)
- `dt` (l. 190)
- `find` (l. 191)
- `uid` (l. 192)
- `ink` (l. 193)
- `me` (l. 194)
- `mark` (l. 195)
- `mine` (l. 196)
- `render` (l. 197)
- `counts` (l. 211)
- `card` (l. 212)
- `rep` (l. 223)
- `renderNew` (l. 225)
- `needMe` (l. 231)
- `dl` (l. 247)
- `base` (l. 248)
- `save` (l. 249)
- `exportJson` (l. 250)
- `capRevCibleeVersRevue` (l. 267) — Convertit une revue ciblée relue (page .html ou ses données) en revue importable (type « arcalyse-revue ») :
- `capRevCibleeLire` (l. 284) — Lit les données d'une page de revue ciblée (.html relue par un relecteur).

## 59-comparaison-aird.js — 231 lignes

- `capDgAnalyser` (l. 23) — Analyse un .aird : un enregistrement par diagramme (descripteur), avec les éléments du modèle qu'il montre.
- `capDgReferenceAuto` (l. 58) — Le .aird chargé va être remplacé par une autre version (relu après une mise à jour, ou choisi) : l'ancien devient
- `capDgReset` (l. 63) — Un autre modèle est ouvert : la référence ne lui correspond plus.
- `capDgChangesModele` (l. 66) — @returns {Set<string>|null} éléments ajoutés, supprimés ou modifiés selon ⚖ Modèle (null sans version comparée)
- `capDgEl` (l. 79) — Nom et type d'un élément : modèle chargé, sinon version comparée (⚖ Modèle).
- `capDgComparer` (l. 90) — Compare le .aird chargé à la référence et au modèle.
- `capDgOnglets` (l. 121) — Onglets de ⚖ Comparaison de versions : 🔷 Modèle (rapport) / 🔲 Diagrammes. @returns {string} HTML
- `capDgEtats` (l. 127) — @returns {{k:string, l:string, t:string, c:string}[]} états d'un diagramme (filtres, pastilles)
- `capDgRender` (l. 140) — Onglet 🔲 Diagrammes de ⚖ Comparaison de versions.
- `capDgWire` (l. 180) — Branche (une fois) les commandes de l'onglet : référence, filtres, détails, ouverture, CSV.
- `capDgCsv` (l. 207) — Télécharge la comparaison des diagrammes (une ligne par diagramme).
- `capDgDashCatalog` (l. 220) — Indicateurs du tableau de bord sur les diagrammes (.aird chargé) : nombre, par couche, liens avec le modèle,

## 60-accueil-tableau-blanc.js — 326 lignes

- `capHomeOutils` (l. 14) — Outils du tableau blanc : k = outil, i = icône, t = info-bulle.
- `capHomeCurBoard` (l. 24) — @returns {object} page de tableau blanc ouverte dans l'onglet 🧾 (une page est créée s'il n'y en a aucune)
- `capHomeBoardOf` (l. 32) — Page de tableau blanc concernée par un élément de l'interface (vue ou fenêtre séparée).
- `capHomeShapeSvg` (l. 39) — Dessin SVG d'une forme, en pixels (taille de l'objet).
- `capHomeItemHtml` (l. 59) — HTML d'un objet du tableau blanc.
- `capHomeBoardHtml` (l. 78) — Onglet 🧾 Tableaux blancs (ou fenêtre séparée) : pages, outils, couleurs, plan de travail.
- `capHomeBoardAfter` (l. 98) — Après le rendu d'un tableau blanc : hauteur jusqu'en bas de sa fenêtre, suivi de la taille des notes.
- `capHomeBoardAdd` (l. 121) — Ajoute un objet sur une page de tableau blanc.
- `capHomeBoardNote` (l. 132) — Nouvelle note (ou texte libre) à une position du tableau.
- `capHomeBoardDbl` (l. 136) — Double-clic sur le tableau (outil Sélection) : nouvelle note ; sur un onglet de page : la renommer. @param {MouseEvent} e
- `capHomeBoardClick` (l. 147) — Clics propres au tableau blanc (pages, outils, couleurs, remplissage, fenêtre séparée, objets).
- `capHomeBoardKey` (l. 170) — Suppr / Retour arrière hors saisie : retire l'objet sélectionné du tableau blanc. @param {KeyboardEvent} e @returns {boolean} vrai si traité
- `capHomeBoardDown` (l. 183) — Tableau blanc, bouton de souris enfoncé : dessin avec l'outil choisi (dans le vide), redimensionnement d'une forme
- `capHomePopListe` (l. 237) — Liste des objets d'un type de fenêtre séparée.
- `capHomePopWin` (l. 244) — Fenêtre séparée ouverte pour une check-list (doc) ou un tableau blanc (board).
- `capHomePopDocs` (l. 246) — @returns {Document[]} documents des fenêtres séparées ouvertes
- `capHomePopClose` (l. 248) — Ferme la fenêtre séparée d'une check-list ou d'un tableau blanc. @param {string} kind @param {string} id
- `capHomePopPlace` (l. 255) — Rappel affiché dans la vue quand une check-list ou un tableau blanc est ouvert dans sa fenêtre.
- `capHomePopOpen` (l. 266) — ⧉ Ouvre une check-list, un plan de revue ou un tableau blanc dans une fenêtre séparée (même script, mêmes données).
- `capHomePopsRender` (l. 282) — Réaffiche le contenu des fenêtres séparées ouvertes (ferme celles dont la check-list ou la page a été supprimée).
- `CAP_HOME_SOURCES` (l. 300) — Éléments des vues qui peuvent être glissés vers une check-list ou un tableau blanc.
- `capHomeDragRef` (l. 306) — Référence portée par un élément glissable d'une vue (diagramme de la liste, élément de l'Explorateur, chaîne).

## 61-dossier-relecture.js — 1002 lignes

- `capDosNorm` (l. 23) — Complète la liste des dossiers lue dans la page (valeurs par défaut, blocs normalisés).
- `capDosOf` (l. 33) — Dossier concerné par un élément de l'interface (vue ou fenêtre séparée), sinon dossier ouvert dans l'onglet 📑.
- `capDosOuvrir` (l. 38) — Ouvre l'onglet 📑 Dossiers de relecture de 🏠 Accueil (depuis 💬 Revue, par exemple).
- `capDosCur` (l. 44) — @returns {object|undefined} dossier ouvert dans l'onglet 📑
- `capDosTrouve` (l. 52) — Bloc d'un dossier et sa place : liste qui le contient, rang, chapitre parent.
- `capDosParcours` (l. 66) — Parcourt les blocs d'un dossier dans l'ordre du document.
- `capDosBlocDe` (l. 76) — Bloc visé par un retour (« id » ou « id.d » pour la description d'un chapitre).
- `capDosNouveau` (l. 98) — Crée un dossier et l'ouvre.
- `capDosDiagsDe` (l. 109) — Diagrammes dont un élément est l'élément représenté (cible du diagramme dans le .aird).
- `capDosNomDiag` (l. 115) — Nom d'un diagramme sans le préfixe de son type (« [LAB] … »). @param {string} n @returns {string}
- `capDosChapDe` (l. 123) — Chapitre créé à partir d'une référence glissée : élément (titre, description, diagrammes dont il est l'élément représenté)
- `capDosBlocDeRef` (l. 137) — Bloc créé à partir d'une référence glissée dans un chapitre : diagramme, élément (avec sa description) ou texte libre.
- `capDosDepuisPlan` (l. 145) — Crée un dossier à partir d'un plan de revue : un chapitre par élément ou diagramme du périmètre.
- `capDosOngletHtml` (l. 155) — Onglet 📑 : liste des dossiers, dossier ouvert. @returns {string} HTML
- `capDosNavHtml` (l. 175) — Volet de navigation du dossier ouvert : plan des chapitres numérotés (clic : aller au chapitre, en le dépliant),
- `capDosAller` (l. 187) — Va à un chapitre du dossier (volet de navigation) : déplie le chapitre et ses parents, puis le fait défiler en haut.
- `capDosHtml` (l. 199) — Dossier ouvert : en-tête (titre, exports, réimport), consignes, retours, plan du dossier.
- `capDosListeHtml` (l. 231) — Blocs d'une liste (chapitres numérotés, imbriqués).
- `capDosActs` (l. 241) — Actions d'un bloc ou d'un chapitre : convertir (chapitre numéroté ↔ bloc), monter, descendre, sortir du chapitre,
- `capDosConvertir` (l. 256) — Convertit un bloc en chapitre numéroté, ou un chapitre en bloc (son contenu est placé à sa suite, au même niveau).
- `capDosBadge` (l. 275) — Pastille du nombre de retours d'un bloc (clic : afficher les retours).
- `capDosRetoursHtml` (l. 280) — Retours d'un bloc, s'ils sont dépliés. @param {object} d @param {string} bid @returns {string} HTML
- `capDosDuBloc` (l. 289) — Vrai si un retour porte sur un bloc, ou sur un élément représenté de ce bloc (diagramme).
- `capDosApercu` (l. 295) — Aperçu de la description d'un élément (3 lignes).
- `capDosChapHtml` (l. 311) — Chapitre : numéro, titre, élément associé, description, retours, contenu (blocs et sous-chapitres), zone de dépôt.
- `capDosBlocHtml` (l. 333) — Bloc d'un chapitre : texte libre, élément (avec sa description) ou diagramme (description, éléments représentés).
- `capDosRetourHtml` (l. 359) — Un retour de relecteur : type, criticité, auteur, date, extrait commenté, texte ; commentaire de 💬 Revue créé.
- `capDosRetoursTousHtml` (l. 371) — Tous les retours du dossier, dans l'ordre du document. @param {object} d @returns {string} HTML
- `capDosTypes` (l. 379) — @returns {object[]} types de retour {k, l} proposés aux relecteurs
- `capDosClick` (l. 390) — Clics de l'onglet 📑 (délégation depuis capHomeClick).
- `capDosFocus` (l. 432) — Place le curseur dans le titre (chapitre) ou le texte (bloc) qui vient d'être créé. @param {string} id - Bloc
- `capDosInput` (l. 438) — Saisies de l'onglet 📑 : champs du dossier, titres, textes ; cases (description, éléments représentés).
- `capDosDrop` (l. 456) — Dépôt d'une référence ou d'un texte dans le dossier ouvert.
- `capDosDiagSvgs` (l. 480) — SVG des diagrammes d'une liste (la vue 🔲 Diagrammes Capella est ouverte le temps de l'export, puis la vue précédente rétablie).
- `capDosContenu` (l. 500) — Contenu du dossier prêt à exporter : chapitres numérotés, descriptions (texte), éléments, diagrammes (SVG, dimensions,
- `capDosExport` (l. 531) — Exporte le dossier : page HTML à commenter ou document Word.
- `capDosElemsReels` (l. 553) — Éléments représentés d'un diagramme, tels qu'un relecteur les reconnaît : une implication sans nom
- `capDosBout` (l. 566) — Élément au bout d'un échange : un port est remplacé par son propriétaire (fonction, composant), une Part par son type.
- `capDosListeLignes` (l. 581) — Lignes d'un tableau d'éléments, lues sur le modèle chargé : nom, type, description ; ou pour des échanges :
- `capDosB64` (l. 589) — Base64 d'un texte UTF-8 (SVG embarqué dans la page). @param {string} s @returns {string}
- `capDosPage` (l. 603) — Page HTML autonome (hors ligne) du dossier : sommaire, chapitres numérotés, figures, commentaires par bloc,
- `$` (l. 655)
- `esc` (l. 656)
- `dt` (l. 657)
- `find` (l. 658)
- `uid` (l. 659)
- `ink` (l. 660)
- `me` (l. 661)
- `mark` (l. 662)
- `chaps` (l. 663)
- `counts` (l. 664)
- `btn` (l. 666)
- `zone` (l. 667)
- `com` (l. 668)
- `opts` (l. 672)
- `formHtml` (l. 673)
- `upd` (l. 676)
- `updAll` (l. 679)
- `para` (l. 680)
- `node` (l. 681)
- `toc` (l. 702)
- `render` (l. 703)
- `needMe` (l. 713)
- `dl` (l. 731)
- `base` (l. 732)
- `capDosDocx` (l. 755) — Document Word du dossier : page de titre (projet, auteur, consignes, mode d'emploi), sommaire, chapitres en styles
- `capDosUnzip` (l. 864) — Lit les fichiers d'une archive ZIP (méthodes « stored » et « deflate », décompression native du navigateur).
- `capDosXmlTexte` (l. 884) — Décode les entités XML d'un texte. @param {string} s @returns {string}
- `capDosWText` (l. 886) — Texte des runs d'un fragment WordprocessingML (paragraphes séparés par un saut de ligne). @param {string} xml @param {string} [tag] - 't' ou
- `capDosLireDocx` (l. 897) — Retours d'un document Word commenté : commentaires (rattachés au dernier signet « arc_… » qui les précède) et
- `capDosLireFichier` (l. 926) — Lit un fichier de retours : page HTML enregistrée par un relecteur, .json de ses retours, ou .docx commenté.
- `capDosLirePage` (l. 935) — @param {string} texte - Code HTML @returns {object|null} données de la page de relecture (sans l'exécuter)
- `capDosImporter` (l. 943) — Choisit et importe un ou plusieurs fichiers de retours (page HTML, .json, .docx).
- `capDosFusion` (l. 957) — Rattache des retours lus à leur dossier (même identifiant ; sinon dossier recréé depuis la page, ou dossier ouvert
- `capDosVersRevue` (l. 984) — Verse les retours non encore traités dans 💬 Revue : un commentaire par retour, cible = élément du bloc

## 62-liens-couches.js — 249 lignes

- `CAP_XL_MAX` (l. 18) — Nombre maximal d'éléments dessinés.
- `capXlCompute` (l. 25) — Graphe des liens entre couches.
- `capXlSvg` (l. 60) — Dessin SVG autonome (fond blanc) des liens entre couches : colonnes, groupes chaîne + fonctions, liens courbes.
- `capXlChercher` (l. 125) — Éléments du modèle qui peuvent servir de départ (catégorie de traçabilité, couche ARCADIA réelle), dont le nom contient un texte.
- `capXlOpts` (l. 135) — @returns {object} options de dessin de la vue (copie de l'état)
- `capXlTitre` (l. 137) — Titre d'un dessin. @param {object} o - Options @returns {string}
- `capXlOpen` (l. 146) — Ouvre la vue 🔗 Liens entre couches à partir d'un élément.
- `capXlSuggestions` (l. 152) — Éléments proposés au départ : ceux qui ont le plus de liens de réalisation (chaînes et capacités d'abord).
- `capRenderXlay` (l. 164) — Sous-vue 🔬 Analyses › 🔗 Liens entre couches : barre (mode, élément de départ, sens, catégorie, options, exports), dessin.
- `capXlWire` (l. 195) — Branche les commandes de la sous-vue (après chaque rendu) : recherche, options, exports, nœuds du dessin.
- `capXlExport` (l. 225) — Exporte le dessin affiché : SVG, PNG, CSV des liens, ou bloc dans le 📑 dossier de relecture ouvert.

## 63-rapports-auto.js — 224 lignes

- `capDosGabarits` (l. 17) — @returns {{k:string, l:string, t:string}[]} plans types proposés (k : clé, l : libellé, t : description)
- `capDosOutils` (l. 26) — Outils de construction d'un plan : blocs du dossier, éléments du modèle par couche, diagrammes par type.
- `capDosEchExt` (l. 55) — Échanges fonctionnels d'une fonction avec l'extérieur (fonctions allouées à des acteurs).
- `capDosStsBase` (l. 66) — Éléments communs aux plans boîte noire (couche SA) : système, acteurs, fonctions du système, échanges avec l'extérieur,
- `capDosPlanSts` (l. 86) — Plan type STS (boîte noire, couche SA), exemple 1.
- `capDosPlanSts2` (l. 121) — Plan type STS (boîte noire, couche SA), exemple 2 : introduction, présentation du système, exigences techniques.
- `capDosPlanDcs` (l. 160) — Plan type DCS (boîte blanche, couches LA et PA).
- `capDosGenerer` (l. 213) — Crée un dossier selon un plan type, rempli à partir du modèle chargé, et l'ouvre.
