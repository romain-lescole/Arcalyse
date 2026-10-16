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

## 20-capella-chargement.js — 931 lignes

- `CAP_LAYERS` (l. 4)
- `CAP_NS_LAYER` (l. 12)
- `CAP_ANCESTOR_KW` (l. 13)
- `CAP_ATTR_KEYS` (l. 14)
- `CAP_TECHNICAL_TYPES` (l. 15)
- `CAP_PKG_TYPES` (l. 16)
- `CAP_TYPE_ICON` (l. 17)
- `capBuildPageHtml` (l. 36) — Construit le HTML de la page actuelle (tout le HTML/CSS/JS de l'application), fichier
- `capPageFileName` (l. 123) — Nom de fichier proposé pour la page sauvegardée.
- `capSaveFullPage` (l. 125) — Sauvegarde la page en la téléchargeant (dossier Téléchargements du navigateur).
- `capSavePageDirect` (l. 140) — Enregistre la page directement dans un fichier choisi une fois (API File System Access d'Edge/Chrome),
- `capEsc` (l. 173) — Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s
- `capLoadFile` (l. 191) — Charge un fichier Capella (depuis l'explorateur ou un glisser-déposer) : vérifie
- `capApplyXmlDoc` (l. 245) — Remplace le modèle affiché par un document XML Capella déjà analysé : vide les caches,
- `capReplaceConfirm` (l. 279) — Demande confirmation avant de remplacer le modèle affiché par un autre fichier : le travail non enregistré
- `capReplacePreOk` (l. 308) — @returns {boolean} vrai si le remplacement du modèle vient d'être confirmé avant le sélecteur (la confirmation est consommée)
- `capShowWelcome` (l. 314) — Affiche ou masque l'écran d'accueil. Quand un modèle est déjà chargé, l'écran
- `capWelcomeStatus` (l. 326) — Affiche un message d'état (chargement, erreur) dans la zone de dépôt.
- `capUpdateWelcome` (l. 332) — Synchronise l'écran d'accueil avec l'état de chargement (appelé au démarrage,
- `XSI_NS` (l. 392)
- `capXType` (l. 394) — Lit l'attribut xsi:type d'un élément XML Capella (plain ou namespacé).
- `capTName` (l. 396) — Extrait le nom court du type (après ':') depuis xsi:type. Ex: 'pa:PhysicalComponent' → 'PhysicalComponent'.
- `capXId` (l. 398) — Lit l'ID d'un élément XML Capella (attribut plain 'id' ou xmi:id namespacé).
- `capXName` (l. 400) — Lit l'attribut 'name' d'un élément XML Capella.
- `capResolveLayer` (l. 405) — Détermine la couche ARCADIA (OA/SA/LA/PA/EPBS/Shared) d'un élément
- `capGetAttrs` (l. 412) — Extrait les attributs pertinents d'un élément XML Capella (définis dans CAP_ATTR_KEYS).
- `capBuildTree` (l. 423) — Construit récursivement l'arbre d'éléments Capella depuis le XML.
- `capRunBulk` (l. 449) — Exécute fn en mode chargement groupé puis reconstruit une fois le panneau (qui reconstruit l'arborescence).
- `capBuildTypeRegistry` (l. 459) — Construit capTypeRegistry : {type → {count, layer, checked}} depuis capAllElements.
- `capApplyPanelOnLoad` (l. 479) — Appelée après le chargement Capella : configure le panneau gauche RM.
- `capInjectToArbo` (l. 554) — Injecte les éléments Capella dans MODEL.elements pour qu'ils apparaissent
- `capInjectCapellaRelsToCriteria` (l. 658) — Ajoute les types de relations Capella (PC NODE→PC NODE, etc.) dans RCFG
- `capInjectLinksToModel` (l. 700) — Calcule les liens Capella via capComputeLinks() et les injecte dans MODEL.relations
- `capFilterArboToLinked` (l. 744) — Filtre MODEL.elements pour ne conserver que les éléments _capella référencés
- `capInjectChainsToModal` (l. 783) — Calcule les chaînes (FunctionalChain, OperationalProcess, PhysicalPath)
- `capRenderCurrentView` (l. 844) — Dispatche le rendu vers la vue Capella active (cards/table/tree/links/chains/physlink).
- `capUpdateStatChips` (l. 922) — Met à jour les puces de comptage OA/SA/LA/PA/EPBS/Shared/total dans la sous-barre.

## 21-capella-vues-base.js — 1525 lignes

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

## 22-capella-liens.js — 282 lignes

- `CAP_LINK_SECTIONS` (l. 2)
- `CAP_LINK_GROUPS` (l. 41) — Groupes de relations affichés dans la barre de la vue 🔗 Liens (ordre d'affichage).
- `capComputeLinks` (l. 54) — Extrait et résout toutes les relations Capella depuis le XML :
- `capRenderLinks` (l. 202) — Rend la vue Liens : barre (recherche, filtres groupés par famille de relations, export)

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

## 25-panneau-detail.js — 276 lignes

- `capOpenDetail` (l. 5) — Ouvre le panneau de détail (colonne droite de l'overlay) pour un élément Capella.
- `CAP_DESC_TAGS` (l. 114) — Balises gardées dans une description Capella mise en forme (les autres sont remplacées par leur contenu).
- `CAP_DESC_CSS` (l. 117) — Propriétés de style gardées (les couleurs de texte sont adaptées au thème ; fonds, positions et images retirés).
- `capSafeHtml` (l. 125) — Description Capella (HTML) prête à afficher : balises et attributs filtrés (aucun script, aucun gestionnaire
- `capDescSection` (l. 168) — Section « Description » du panneau de détail : la description mise en forme (aperçu), avec une bascule
- `capDescToggle` (l. 177) — Bascule Aperçu / code HTML d'une section « Description ». @param {HTMLElement} b - Bouton cliqué
- `capOpenDetailNode` (l. 184) — Ouvre le panneau de détail à partir d'un nœud de l'arborescence Capella.
- `CAP_ELEM_VIEWS` (l. 192)
- `capUpdateToolbarForView` (l. 198) — Met à jour les boutons actifs et les groupes de contrôles visibles
- `capShowView` (l. 230) — Affiche une vue Capella (bascule en mode capella si besoin).

## 26-rapports-html.js — 101 lignes

- `capReportCss` (l. 18) — Récupère les règles CSS de l'application utiles aux rapports (classes des vues d'interfaces, chaînes, contrôles).
- `capReportClean` (l. 33) — Nettoie un fragment HTML de l'application pour un fichier autonome : retire les appels au panneau de détail
- `capHtmlReport` (l. 44) — Construit et télécharge un rapport HTML autonome à onglets.

## 27-interfaces-calculs.js — 326 lignes

- `capArchLayerOf` (l. 8) — Couche ARCADIA d'un élément XML, déduite de l'architecture qui le contient.
- `capBuildIdMap` (l. 18) — Index id → élément XML, sur l'attribut plain « id » ET xmi:id (namespacé).
- `capCsvDownload` (l. 32) — Télécharge un CSV (séparateur « ; », BOM UTF-8 pour Excel).
- `capMatrixBuild` (l. 45) — Construit une matrice composant × composant (N² des interfaces).
- `capFoldList` (l. 82) — Liste repliable d'éléments HTML séparés par des virgules : au-delà de `max`, le reste est masqué derrière « +N autres » (clic pour déplier /
- `capDiagHtml` (l. 93) — Rend un rapport de contrôles : sections repliables avec compteur et niveau (ok / avertissement).
- `capDetLink` (l. 110) — Lien HTML cliquable ouvrant le panneau de détail d'un élément Capella.
- `CAP_PORT_ORIENTS` (l. 116) — Valeurs de l'attribut orientation d'un ComponentPort (OrientationPortKind).
- `CAP_ORIENT_STYLE` (l. 118) — Style d'affichage de chaque orientation de port (couleur, libellé, info-bulle).
- `CAP_CEX_DIRS` (l. 125) — Libellés des sens effectifs d'un Component Exchange.
- `capNormOrient` (l. 136) — Normalise l'orientation d'un port Capella : attribut absent (valeur par défaut EMF) → 'UNSET'.
- `capCexDirection` (l. 150) — Déduit le sens effectif d'un Component Exchange à partir des orientations de ses deux ports.
- `capComputeCompExchanges` (l. 169) — Calcule les Component Exchanges : pour chaque ComponentExchange, résout source/target
- `capComputePhysLinks` (l. 256) — Calcule les Physical Links du modèle : pour chaque PhysicalLink, résout les deux

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

## 34-fonctions.js — 751 lignes

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

## 35-tableau-de-bord.js — 568 lignes

- `CAP_DASH_PAL` (l. 3) — Palette catégorielle à ordre fixe (contrôlée pour le daltonisme), déclinée pour thèmes clairs et sombres.
- `CAP_DASH_AK` (l. 6) — Couleurs des natures d'allocation (identiques au filtre « Allocation » de ƒ Fonctions).
- `CAP_DASH_VIZ` (l. 8) — Représentations proposées selon la forme de l'indicateur : [clé, libellé, largeur, hauteur par défaut].
- `CAP_DASH_KIND` (l. 16) — Libellés courts des formes d'indicateurs (badges du catalogue).
- `capDashColor` (l. 22) — Couleur de la i-ème série dans la palette du thème courant (au-delà de 8 : gris « Autres »).
- `capDashPct` (l. 28) — Taux arrondi d'éléments vérifiant un prédicat.
- `capDashCount` (l. 34) — Compte les éléments par clé (une ou plusieurs clés par élément) et trie par effectif décroissant.
- `capDashCatalog` (l. 44) — Catalogue de tous les indicateurs disponibles pour le modèle ouvert (fonctions, chaînes, interfaces,
- `capDashValue` (l. 198) — Valeur (mise en cache) d'un indicateur du catalogue ; null si le modèle ne contient pas la donnée.
- `capDashCut` (l. 211) — Échappe un texte et le tronque pour une étiquette de graphique.
- `capDashLevel` (l. 216) — Niveau d'un pourcentage : bon (≥ 90), à surveiller (≥ 50), faible.
- `capDashCats` (l. 222) — Prépare les catégories d'une répartition : tri, limite d'affichage et regroupement en « Autres ».
- `capDashDraw` (l. 236) — Dessine le contenu d'un élément du tableau de bord.
- `capDashSave` (l. 318) — Enregistre les tableaux de bord dans la page (bloc JSON repris par la 💾 Page HTML).
- `capDashUid` (l. 324) — Identifiant court et unique pour un tableau de bord ou un élément.
- `capDashExample` (l. 328) — Tableau de bord d'exemple adapté au modèle ouvert (synthèse de quelques indicateurs clés).
- `capRenderDashboard` (l. 346) — Vue « 📐 Tableau de bord » : tableaux de bord personnalisés (indicateurs, graphiques, tableaux, textes),
- `capDashPrint` (l. 472) — Imprime un tableau de bord au format A4 : les éléments sont redessinés à la taille de la page
- `capDashEditor` (l. 509) — Fenêtre d'ajout ou de configuration d'un élément : catalogue des indicateurs (recherche, groupes),

## 36-component-exchange.js — 356 lignes

- `capAnaReset` (l. 2) — Réinitialise caches et états de la vue Analyses (appelé au chargement d'un nouveau modèle).
- `capBehaviorExchanges` (l. 11) — Component Exchanges du périmètre de la vue 🔀 Behavior Exchange : couche PA, entre Physical Components
- `capRenderCompExchange` (l. 26) — Rend la vue Component Exchange — même structure que Physical Link (≡ Ligne / ▣ Composant,

## 37-capella-cablage.js — 38 lignes

- `capOpenDetailById` (l. 7) — Ouvre le panneau de détail Capella pour un des deux IDs fournis (src ou tgt).

## 38-theme-perso.js — 129 lignes

- `CAP_THEME_FIELDS` (l. 7) — Variables de couleur personnalisables : [variable CSS, libellé, groupe].
- `CAP_THEME_LAYERS` (l. 16) — Couches ARCADIA dont la couleur est personnalisable : [clé CAP_LAYERS, libellé].
- `capThemeSave` (l. 24) — Enregistre le thème personnalisé dans la page (bloc JSON repris par la 💾 Page HTML).
- `capThemeRegister` (l. 30) — Déclare (ou retire) le thème personnalisé dans THEMES et dans le sélecteur de thème.
- `capThemeLayerDefaults` (l. 40) — Couleurs d'origine des couches ARCADIA (mémorisées au premier appel).
- `capThemeLayersApply` (l. 50) — Applique les couleurs de couches du thème personnalisé (ou celles d'origine pour un autre thème)
- `capThemeEditor` (l. 61) — Ouvre l'éditeur du thème personnalisé : toutes les couleurs regroupées (fonds, textes, statuts,

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

## 40-suivi-fichier.js — 552 lignes

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
- `capWatchOpenCompare` (l. 310) — Ouvre ⚖ Comparaison de versions (🔬 Analyses) sur deux versions connues du suivi.
- `capWatchUpdateUi` (l. 327) — Met à jour le bouton 🔄 Suivi (visibilité, badge, info-bulle).
- `capWatchFlash` (l. 344) — Affiche brièvement un message dans la notification (sans action). @param {string} msg - Message
- `capWatchNote` (l. 353) — Affiche ou masque la notification de mise à jour (coin inférieur droit).
- `capWatchMenu` (l. 383) — Ouvre ou ferme le menu du bouton 🔄 Suivi. @param {boolean} [show] - Forcer l'état (sinon bascule)
- `capWatchMenuRender` (l. 391) — Construit le contenu du menu 🔄 Suivi (état de la source, réglages, historique).
- `capWatchModalClose` (l. 427) — Ferme la fenêtre du delta.
- `capWatchModalRefresh` (l. 431) — Réaffiche la fenêtre du delta si elle montre la version en attente (nouvel enregistrement détecté entre-temps).
- `capWatchShowDelta` (l. 439) — Affiche la fenêtre du delta : version en attente (cumul et enregistrements pas à pas) ou mise à jour de l'historique.
- `capWatchShowHistory` (l. 519) — Affiche l'historique des mises à jour appliquées pendant la session (chacune ouvre son delta).

## 41-barre-vues.js — 316 lignes

- `CAP_NAV_ITEMS` (l. 9) — Catalogue des vues : k = clé (vue capShowView, ou « ana:… » pour une sous-vue de 🔬 Analyses), l = libellé,
- `CAP_NAV_GROUPS` (l. 46) — Menus déroulants de la barre, dans l'ordre d'affichage (id = identifiant du bouton).
- `CAP_NAV_DEFAULT` (l. 55) — Réglage par défaut : tous les menus affichés, 🔲 Diagrammes Capella (en tête, à côté de 🗺 Relation Map), ▤ Tableau, ⚡ Chaînes,
- `capNavMigrate` (l. 65) — Met à jour un réglage de barre enregistré avant l'arrivée du bouton ▤ Tableau (ancienne 📊 Table View
- `capNavSave` (l. 72) — Enregistre le réglage de la barre dans la page (bloc JSON repris par la 💾 Page HTML).
- `capNavCurKey` (l. 82) — Clé de la vue Capella affichée (« ana:… » pour une sous-vue de 🔬 Analyses).
- `capNavItems` (l. 89) — Vues du catalogue disponibles pour le format du modèle affiché (Capella ou ◇ SysML v2, voir capNavFmtOk).
- `capNavOpen` (l. 94) — Ouvre une vue du catalogue (ou la Relation Map pour la clé @rm).
- `capNavGroupOpen` (l. 105) — Ouvre la vue d'un menu (clic sur son nom) : la dernière vue non épinglée utilisée, sinon la première non épinglée.
- `capNavFluxTabs` (l. 115) — Onglets du menu 📡 Flux & interfaces (comme ceux de 🔬 Analyses) : vues du menu non épinglées,
- `capNavRender` (l. 125) — Reconstruit les boutons de la barre des vues selon le réglage (menus, épingles).
- `capNavSync` (l. 152) — Met à jour l'état actif des boutons de la barre (vue affichée, dernière sous-vue de chaque menu).
- `capNavClose` (l. 167) — Ferme le menu déroulant de la barre des vues.
- `capNavRow` (l. 176) — Ligne d'une vue dans un menu : ouverture au clic, 📌 pour l'épingler en bouton direct.
- `capNavMenu` (l. 186) — Ouvre le menu déroulant d'un groupe, ou le menu ☰ (toutes les vues, recherche, réglage).
- `capNavMenuFill` (l. 233) — Remplit le menu ouvert : vues du groupe, ou (menu ☰) réglage complet ou résultats de la recherche.

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

## 43-visite-guidee.js — 464 lignes

- `CAP_TOUR_STEPS` (l. 12) — Étapes de la visite générale : s = sélecteur CSS de la zone (toutes les correspondances visibles sont encadrées
- `CAP_TOUR_EXPLORE` (l. 59) — Étapes communes aux sous-vues de 🧭 Explorateur (onglets, types, recherche, couches).
- `CAP_TOUR_FLUX` (l. 74) — Étapes communes aux vues de 📡 Flux & interfaces (onglets de navigation).
- `CAP_TOUR_ANA_TXT` (l. 77) — Rôle de chaque sous-vue de 🔬 Analyses (texte de l'étape « analyse affichée »).
- `capTourRmCtx` (l. 90) — Visite 🗺 Relation Map : si aucun élément n'est au centre du graphe, en choisit un qui donne un visuel lisible —
- `CAP_TOUR_VIEWS` (l. 104) — Visites contextuelles, par vue : clé = '@rm' ou vue Capella (capCurrentView) ; l = nom de la vue,
- `CAP_TOUR_START` (l. 255) — 🚀 Bien démarrer, 1er temps (sans modèle) : où ouvrir le fichier. Terminer la visite arme la reprise (2e temps).
- `CAP_TOUR_AFTER` (l. 270) — 🚀 Bien démarrer, 2e temps (modèle chargé) : où trouver l'aide et les tutoriels.
- `capTourCtxKey` (l. 287) — Clé de la vue affichée pour les visites contextuelles.
- `capTourCtx` (l. 295) — Visite contextuelle de la vue affichée, si elle existe et qu'un modèle est chargé.
- `capTourEls` (l. 303) — Éléments affichés désignés par le sélecteur d'une étape.
- `capTourVisible` (l. 314) — Indique si une étape est utilisable (zone affichée, ou bulle centrée).
- `capTourStart` (l. 324) — Lance une visite guidée depuis sa première étape.
- `capTourStartView` (l. 345) — Lance la visite de la vue affichée (ou la visite générale s'il n'y en a pas).
- `capTourGo` (l. 353) — Passe à l'étape suivante ou précédente utilisable (les zones non affichées sont sautées).
- `capTourPos` (l. 373) — Numéros (rang, total) de l'étape courante parmi les étapes utilisables.
- `capTourRenderPop` (l. 380) — Remplit la bulle de l'étape courante (titre, texte, compteur, boutons).
- `capTourPlace` (l. 392) — Place le cadre clignotant sur la zone de l'étape courante et la bulle à côté (ou au centre).
- `capTourKey` (l. 424) — Raccourcis clavier pendant la visite : ← → Entrée pour naviguer, Échap pour quitter.
- `capTourEnd` (l. 433) — Quitte la visite guidée et retire la mise en évidence.
- `capTourHelpMenu` (l. 440) — Ouvre le menu ? Aide ▾ (s'il n'est pas déjà ouvert) pour l'étape qui le présente.
- `capTourStartHere` (l. 447) — Lance « 🚀 Bien démarrer » : sans modèle, montre où ouvrir le fichier et arme la reprise après chargement ;
- `capTourResumeAfterLoad` (l. 454) — Reprend « 🚀 Bien démarrer » (2e temps) après le chargement d'un modèle, si la reprise a été armée.

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

## 54-diagrammes.js — 1058 lignes

- `CAP_DIAG_COUCHES` (l. 18) — Ordre des couches ARCADIA dans la liste et les exports.
- `capDiagDispo` (l. 21) — @returns {boolean} vrai si la visionneuse d'Arcature est embarquée dans la page
- `capIco` (l. 34) — Icône d'un élément du modèle, comme dans Capella (variante selon acteur, humain, nature, genre de fonction…),
- `capIcoType` (l. 53) — Icône d'un type d'élément (sans variante), sans modèle chargé.
- `capDiagLoadAird` (l. 67) — Charge un fichier .aird (diagrammes du projet). Sans modèle chargé, il est gardé en attente du .capella.
- `capDiagPickAird` (l. 87) — 📂 Ouvrir le .aird : sélecteur à accès direct ouvert dans le dossier du .capella (Edge/Chrome,
- `capOpenProjectFolder` (l. 106) — 📁 Dossier du projet (écran d'accueil) : charge ensemble le modèle .capella et ses diagrammes .aird.
- `capProjectScanDir` (l. 121) — Lit un dossier du projet (sélecteur ou dossier déposé) sur 2 niveaux et charge le modèle et ses diagrammes.
- `capProjectFromFiles` (l. 142) — Charge un projet à partir des fichiers d'un dossier : le .capella (choisi dans l'écran d'accueil s'il y en a plusieurs)
- `capDiagMsg` (l. 180) — Affiche un message bref dans la barre de la vue. @param {string} t - Texte
- `capDiagEnsure` (l. 183) — Crée la vue (une fois) : barre (ouvrir, export, sélection), liste classée à gauche, hôte de la visionneuse.
- `capDiagSplit` (l. 214) — Séparateur entre l'explorateur et le diagramme : glisser pour régler la largeur de l'explorateur.
- `capDiagCarte` (l. 231) — ▣ Carte (mini-carte de la visionneuse) : sous l'explorateur (repliable) ou dans le diagramme, comme dans la visionneuse.
- `capDiagBarre` (l. 255) — Barre du haut : 📂 Ouvrir le .aird…, ⬇ Exporter…, ☐ Sélectionner…, fichier chargé.
- `capDiagFit` (l. 269) — Ajuste la hauteur de la vue à la fenêtre.
- `capDiagSync` (l. 277) — Transmet à la visionneuse le modèle courant (texte XML) et le .aird en attente, si besoin.
- `capDiagBarreVd` (l. 303) — Réorganise la barre de la visionneuse au-dessus du diagramme, pour qu'elle ne bouge plus d'un diagramme à l'autre :
- `capDiagRevSlot` (l. 331) — Remplit l'emplacement de la revue (📝 Note de revue, 💬 Calque) à côté de la recherche du diagramme.
- `capDiagChainesFiltre` (l. 340) — Liste « Chaînes et chemins » : ne garde que les chaînes fonctionnelles et chemins physiques dessinés dans
- `capRenderDiagrams` (l. 351) — Rendu de la vue 🔲 Diagrammes Capella.
- `capDiagReps` (l. 365) — @returns {object[]} représentations du .aird chargé ({uid, nom, type, sigle, genre, couche})
- `capDiagCouche` (l. 368) — Libellé et couleur d'une couche ARCADIA. @param {string} c - OA, SA, LA, PA, EPBS… @returns {{label:string,color:string,bg:string}}
- `capDiagRang` (l. 371) — Rang d'une couche pour le tri. @param {string} c - Couche @returns {number}
- `capDiagIcones` (l. 374) — Icône de chaque diagramme, reprise de la liste (masquée) de la visionneuse. @returns {Map<string,string>} uid → SVG
- `capDiagFiltrees` (l. 383) — Représentations filtrées par la recherche (nom, type, sigle, couche). @returns {object[]}
- `capDiagGroupes` (l. 394) — Regroupe les représentations selon le classement choisi.
- `capDiagOuvert` (l. 429) — Un groupe est-il ouvert ? Couches ouvertes, types repliés par défaut ; tout est ouvert pendant une recherche.
- `capDiagListe` (l. 436) — Rend la liste classée (panneau gauche).
- `capDiagMarquerActif` (l. 482) — Met en évidence le diagramme ouvert dans la liste.
- `capDiagRepsGroupe` (l. 491) — Représentations d'un groupe de la liste (selon la clé).
- `capDiagClic` (l. 498) — Clics de la vue : barre (ouvrir, export, sélection), carte, groupes repliables, diagrammes. @param {MouseEvent} e
- `capDiagChange` (l. 525) — Cases à cocher (diagramme, groupe, tout) et choix du classement. @param {Event} e
- `capDiagOpen` (l. 540) — Ouvre un diagramme dans la vue 🔲 Diagrammes Capella et y met un élément en évidence.
- `capDiagInfo` (l. 551) — Panneau de détail d'un diagramme (comme pour un élément du modèle) : type, couche, sigle, nature, identifiant,
- `capDiagDetail` (l. 589) — Section « Diagrammes » du panneau de détail : représentations de l'élément et diagrammes où il est dessiné.
- `capDiagSvg` (l. 607) — SVG autonome d'un diagramme, tel que l'exporte la visionneuse (menu ⬇ Exporter › SVG) :
- `capDiagPlanche` (l. 639) — Planche d'un diagramme : cadre, en-tête (couche, sigle, nom, type), diagramme centré, cartouche technique
- `capDiagTexte` (l. 718) — Texte brut d'une description Capella (attribut XML contenant du HTML).
- `capDiagMeta` (l. 730) — Description et élément représenté d'un diagramme, lus dans le .aird (DRepresentationDescriptor : documentation, target).
- `capDiagElements` (l. 750) — Annexe d'un diagramme : éléments du modèle représentés (attributs data-sem du SVG), triés par couche, type et nom.
- `capDiagAnnexeCsv` (l. 763) — Annexe au format CSV (séparateur ;, BOM) : en-tête du diagramme, description, puis éléments représentés.
- `CAP_DIAG_ANX` (l. 770) — Lignes d'annexe par page PDF.
- `capDiagAnnexePages` (l. 779) — Pages d'annexe du PDF (A4 paysage) : tableau des éléments représentés.
- `capDiagCibles` (l. 815) — Diagrammes visés par l'export, dans l'ordre de la liste (couche, type, nom).
- `capDiagExportDialog` (l. 822) — Fenêtre « Exporter des diagrammes » : portée, mise en page, aperçu de la planche, formats.
- `capDiagApercu` (l. 867) — Aperçu de la planche du premier diagramme visé (diagramme ouvert s'il en fait partie).
- `capDiagPdfSommaire` (l. 886) — Page de sommaire du PDF (paysage A4) : projet, date, nombre de planches, liste par couche et type avec numéros de page.
- `CAP_DIAG_PDF_ALERTE` (l. 928) — Seuil (Mo) au-delà duquel l'export PDF demande confirmation.
- `capDiagPdfEstimation` (l. 938) — Taille estimée du PDF, d'après la surface des planches rastérisées (même bornes que capSvgToCanvas)
- `capDiagExport` (l. 952) — Export groupé des diagrammes en planches : capture de tous les diagrammes, puis pagination
- `capDiagExportHtml` (l. 1023) — Rapport HTML autonome : onglet Sommaire (tableau avec liens) et onglet Planches

## 55-revue.js — 1190 lignes

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
- `capRevPeople` (l. 316) — Personnes connues : participants, auteurs et responsables des commentaires. @returns {string[]}
- `capRevFiltered` (l. 322) — @returns {object[]} commentaires de l'onglet 💬 Commentaires, filtrés et triés
- `capRevListHtml` (l. 344) — Onglet 💬 Commentaires : filtres et cartes. @returns {string} HTML
- `capRevCardHtml` (l. 364) — Carte d'un commentaire (repliée : en-tête, titre, méta ; dépliée : texte complet, réponses, actions).
- `capRevTargetsHtml` (l. 393) — Pastilles des cibles d'un commentaire (élément + champ, diagramme), cliquables. @param {object} c @returns {string} HTML
- `capRevPanelClick` (l. 403) — Clics du panneau (délégation). @param {MouseEvent} e
- `capRevPanelInput` (l. 433) — Saisie dans le panneau : recherche, réglages. @param {Event} e
- `capRevPanelChange` (l. 438) — Listes et cases du panneau : filtres, statut d'un commentaire, réglages. @param {Event} e
- `capRevGet` (l. 450) — @param {string} id @returns {object|undefined} commentaire
- `capRevGoto` (l. 457) — Montre la cible d'un commentaire : sa note dans le diagramme (s'il a été posé sur un diagramme et que le .aird
- `capRevValidate` (l. 468) — Valide un commentaire (correction vérifiée) : statut Validé, date et vérificateur. @param {object} c
- `capRevResnap` (l. 473) — Prend la version actuelle du modèle comme nouvelle référence des cibles d'un commentaire. @param {object} c
- `capRevNew` (l. 484) — Nouveau commentaire : ouvre l'éditeur avec ses cibles (et sa note de diagramme) déjà renseignées.
- `capRevEdit` (l. 492) — Éditeur d'un commentaire (fenêtre) : texte (seul champ obligatoire), titre, criticité, catégorie, statut,
- `capRevDetailHead` (l. 598) — Boutons 💬 du panneau de détail, sous le nom de l'élément : commenter l'élément, son nom, sa description.
- `capRevAttrBtn` (l. 612) — Petit bouton 💬 d'un attribut du panneau de détail (visible au survol) : commenter cet attribut.
- `capRevDetailSection` (l. 621) — Section « Commentaires » du panneau de détail : commentaires portant sur l'élément.
- `capRevDetailSectionIn` (l. 631) — Contenu de la section « Commentaires » du panneau de détail.
- `capRevShow` (l. 640) — Ouvre 💬 Revue sur un commentaire (déplié). @param {string} id
- `capRevShowFor` (l. 646) — Ouvre 💬 Revue sur les commentaires d'un élément. @param {string} id
- `CAP_REV_ID_ATTRS` (l. 651) — Attributs portant l'identifiant d'un élément du modèle dans les vues (blocs, tableaux, listes, diagrammes).
- `capRevElementAt` (l. 658) — Élément du modèle désigné par un nœud de l'interface (lui ou un de ses parents) : attribut d'identifiant
- `capRevContext` (l. 672) — Menu du clic droit dans les vues : sur un élément, commenter l'élément, son nom, sa description, voir ses commentaires.
- `capRevShowDiag` (l. 709) — Ouvre 💬 Revue sur les notes du diagramme ouvert.
- `capRevMarkSchedule` (l. 715) — Programme la mise à jour des marques 💬 (après un rendu de vue).
- `capRevMark` (l. 717) — Marque d'un 💬 les blocs, cartes et noms cliquables des éléments qui ont des commentaires non clos.
- `capRevDiagUid` (l. 733) — @returns {string} identifiant du diagramme ouvert dans la visionneuse ('' sinon)
- `capRevDiagBar` (l. 739) — Commandes de la revue dans la barre de 🔲 Diagrammes Capella : 📝 Note (à glisser sur le diagramme) et
- `capRevLayerEnsure` (l. 747) — Installe (une fois) le calque des commentaires au-dessus du diagramme et ses écouteurs.
- `capRevDiagNoteAt` (l. 794) — Pose une note de revue sur le diagramme ouvert, à un point de l'écran (centre de la vue par défaut),
- `capRevDiagBox` (l. 811) — Boîte d'un élément du diagramme en coordonnées du diagramme (union de ses formes dessinées).
- `capRevLayerDraw` (l. 826) — Dessine les notes du diagramme ouvert sur le calque : un plan qui suit le zoom et le déplacement
- `capRevNoteClick` (l. 870) — Boutons d'une note du calque : lier, modifier, réduire / agrandir. @param {MouseEvent} e
- `capRevToggleTarget` (l. 884) — Lie un élément à un commentaire, ou le délie s'il l'était déjà.
- `capRevNoteLine` (l. 898) — Trait tiré depuis la poignée ● d'une note : suit le pointeur (élément visé en surbrillance) ;
- `capRevNoteDown` (l. 920) — Glisser une note (en-tête ou pastille), la redimensionner (coin) ou tirer un trait vers un élément (poignée ●). @param {PointerEvent} e
- `capRevDiffHtml` (l. 949) — Différence entre la valeur commentée et le modèle chargé, pour une cible.
- `capRevCheckHtml` (l. 963) — Onglet 🔁 Vérifier. @returns {string} HTML
- `capRevCheckAll` (l. 980) — Valide tous les commentaires à vérifier (après confirmation).
- `capRevReportList` (l. 989) — @returns {object[]} commentaires du rapport (ceux de la liste filtrée, ou tous)
- `capRevSynthese` (l. 991) — Tableau croisé statut × criticité. @param {object[]} l - Commentaires @returns {string} HTML
- `capRevReportTab` (l. 999) — Onglet 📄 Rapport : synthèse et exports. @returns {string} HTML
- `capRevGroupes` (l. 1015) — Groupes du rapport selon le regroupement choisi.
- `capRevReportHtml` (l. 1025) — Télécharge le rapport HTML autonome de la revue.
- `capRevCsv` (l. 1048) — Télécharge les commentaires du rapport en CSV (une ligne par commentaire).
- `capRevCfgHtml` (l. 1060) — Onglet ⚙ Réglages. @returns {string} HTML
- `capRevCfgAction` (l. 1082) — Actions de l'onglet ⚙ Réglages : participants, export, import, suppression.
- `capRevExport` (l. 1090) — Exporte la revue (participants et commentaires) dans un fichier .json réutilisable.
- `capRevImport` (l. 1097) — Importe un fichier .json de revue et le fusionne avec les commentaires de la page.
- `capRevImportConfirm` (l. 1125) — Fenêtre d'avertissement avant d'importer une revue qui ne semble pas porter sur le modèle chargé :
- `capRevMerge` (l. 1159) — Fusionne une revue importée : nouveaux commentaires ajoutés (renumérotés si leur numéro est pris),

## 56-sysml-langage.js — 1119 lignes

- `CAP_SY_KEYWORDS` (l. 9) — Mots réservés de SysML 2.0 (§8.2.2.1.2) : jamais utilisables comme nom simple.
- `CAP_SY_SYMBOLS` (l. 16) — Symboles (KerML §8.2.2.7), du plus long au plus court : règle du plus long symbole possible.
- `CAP_SY_KIND_KW` (l. 20) — Mot-clé d'élément → racine de la métaclasse (« Part » → PartDefinition / PartUsage).
- `CAP_SY_PREFIX_KW` (l. 25) — Préfixes d'une déclaration (modificateurs) : ils précèdent le mot-clé de l'élément.
- `CAP_SY_CLAUSE_KW` (l. 27) — Mots-clés introduisant une clause dans l'en-tête d'une déclaration (arrêtent une expression de valeur).
- `CAP_SY_OCC_KINDS` (l. 29) — Éléments « comportementaux » d'un corps (cible ou source implicite d'une succession « then »).
- `capSyLex` (l. 41) — Découpe un texte .sysml en lexèmes. Les notes (// et //* … *\/) sont ignorées ; les commentaires /* … *&#47; deviennent
- `capSyCmtBody` (l. 106) — Corps d'un commentaire /* … *&#47; débarrassé des astérisques de début de ligne et des marges.
- `capSyTokText` (l. 114) — Texte lisible d'une suite de lexèmes (expression, valeur, garde) : espaces placés comme dans la notation textuelle.
- `capSyRefOf` (l. 131) — Référence écrite par une suite de lexèmes de nom qualifié (noms non restreints gardés sans apostrophes, comme capSyQName).
- `capSyQuote` (l. 136) — Écrit un nom tel qu'il doit apparaître dans un texte SysML : entre apostrophes s'il n'est pas un nom simple ASCII ou s'il est réservé.
- `capSyNew` (l. 147) — Crée un élément du graphe SysML.
- `capSyParse` (l. 161) — Analyse un texte .sysml : renvoie la racine (espace de noms du fichier) et les diagnostics. Tolérante : en cas de
- `capSyPeek` (l. 171) — Lexème courant (sans avancer). @param {object} P @param {number} [k] - Décalage
- `capSyNext` (l. 173) — Lexème courant (puis avance). @param {object} P
- `capSyIs` (l. 175) — Vrai si le lexème courant est le mot-clé ou le symbole v. @param {object} P @param {string} v @param {number} [k]
- `capSyEat` (l. 177) — Consomme le mot-clé ou le symbole v s'il est présent. @param {object} P @param {string} v @returns {boolean}
- `capSyErr` (l. 179) — Note une erreur de syntaxe au lexème courant. @param {object} P @param {string} msg @param {object} [tok]
- `capSyBody` (l. 186) — Analyse un corps « { … } » (ou le fichier entier) : une suite de membres jusqu'à « } ».
- `capSySkip` (l. 206) — Saute jusqu'au prochain « ; » (consommé) ou « } » (laissé), en sautant les corps « { … } » équilibrés.
- `capSyQName` (l. 224) — Lit un nom qualifié ou une chaîne de features (« A::B », « a.b.c », « $::X », « ~T ») à partir du lexème courant.
- `capSyMember` (l. 242) — Analyse un membre d'un corps : déclaration (définition ou usage), relation (import, alias, satisfy, connect, flow,
- `capSyNameDecl` (l. 290) — Lit la déclaration de nom d'un élément : « <shortName> nom » (chacun facultatif).
- `capSyImport` (l. 298) — Import « [visibilité] import [all] A::B | A::* | A::** | A::*::** [filtre] ; ».
- `capSyAlias` (l. 314) — Alias « alias Nom for A::B ; ». @param {object} P @param {object} owner @param {string} vis @param {object} t
- `capSyDependency` (l. 322) — Dépendance « dependency [nom] [from] A, B to C, D ; ». @param {object} P @param {object} owner @param {string} vis @param {object} t
- `capSyMetadataUsage` (l. 336) — Usage de métadonnée « @Type [about …] { … } » ou « metadata [nom :] Type … ».
- `capSyBalanced` (l. 348) — Lit une suite équilibrée « ( … ) » ou « [ … ] » (délimiteurs compris).
- `capSyKeyword` (l. 366) — Traite le mot-clé (ou l'absence de mot-clé) d'une déclaration et crée l'élément correspondant.
- `capSySimpleRef` (l. 541) — Vrai si le lexème courant commence une simple référence suivie de « ; » (« then done; », « perform a.b; »).
- `capSyRefStart` (l. 550) — Vrai si le lexème courant commence une chaîne qualifiée (« a.b », « A::B ») : une référence et non un nom déclaré.
- `capSyAhead` (l. 552) — Vrai si le mot-clé w apparaît dans l'en-tête courant, avant « ; » ou « { ». @param {object} P @param {string} w @returns {boolean}
- `capSyHasThen` (l. 559) — Vrai si l'en-tête courant contient « then » avant « ; » ou « { » (transition abrégée). @param {object} P @returns {boolean}
- `capSyCondSuccession` (l. 567) — Vrai si « if g then x ; » est une succession conditionnelle (après un nœud de décision) et non une action if.
- `capSyInState` (l. 574) — Vrai si l'élément est un état (définition ou usage) : contexte des transitions abrégées. @param {object} el @returns {boolean}
- `capSyUsageStart` (l. 577) — Vrai si le lexème courant commence un usage sans mot-clé (« x : T ; », « :>> m = 1 ; », « red ; »).
- `capSySuccession` (l. 597) — Crée une succession entre deux membres d'un corps (« then », « first … then », « if g then x »).
- `capSyTransitionTail` (l. 606) — Fin d'une transition : « [accept déclencheur [via p]] [if garde] [do effet] then cible ».
- `capSyBindTail` (l. 622) — Fin d'un « bind a = b ». @param {object} P @param {object} el
- `capSyActionTail` (l. 630) — Fin d'une action élémentaire (accept, send, assign, if, while, for…) : texte gardé, références utiles relevées, corps éventuel.
- `capSyHeader` (l. 664) — En-tête générique d'une déclaration : « [<court>] [nom] [: T] [:> A] [:>> B] [::> C] [[m]] [= valeur] [clauses] » puis « ; » ou corps.
- `capSyHeaderTail` (l. 679) — Suite d'un en-tête (relations, multiplicité, valeur, clauses) puis « ; » ou « { corps } ».
- `capSyUntilClause` (l. 733) — Lit une expression jusqu'à « ; », « { », « } » ou un mot-clé de clause (au niveau 0 des parenthèses).
- `capSyConnectEnds` (l. 749) — Extrémités d'une connexion : « a to b » ou « ( e1 ::> a, e2 ::> b, … ) ».
- `capSyBuildModel` (l. 774) — Construit un modèle SysML à partir de plusieurs fichiers : analyse, effective des noms (redéfinitions), index des membres,
- `capSyLibHas` (l. 808) — Vrai si un paquetage de la bibliothèque standard porte ce nom (index embarqué, 57-sysml-bibliotheque.js).
- `capSyLibMembers` (l. 811) — Membres connus d'un paquetage de la bibliothèque standard (Set de noms), ou null.
- `capSyGenerals` (l. 822) — Généraux d'un élément (types, spécialisations, sous-ensembles, redéfinitions, références) déjà résolus dans le projet.
- `capSyLocal` (l. 837) — Recherche « locale » d'un nom dans un espace de noms : membres possédés, alias, membres hérités, imports.
- `capSyHasLibGeneral` (l. 875) — Vrai si l'élément (ou l'un de ses généraux du projet) a un général dans la bibliothèque standard (ShapeItems::Box…) :
- `capSyDeep` (l. 888) — Recherche récursive d'un nom dans toute la descendance d'un espace de noms (import « ::** »).
- `capSyFeature` (l. 897) — Membre visible d'un élément, en suivant ses types (pour « a.b » : b est cherché parmi les membres de a et de ses types).
- `capSyResolve` (l. 914) — Résout une référence écrite (« Moteur », « ISQ::mass », « moteurs.arbre », « $::A::B ») depuis un espace de noms.
- `capSyResolveSelf` (l. 963) — Résout une référence portée par un élément depuis son propriétaire, en ignorant d'abord l'élément lui-même (une
- `capSyResolveAll` (l. 969) — Résout toutes les références de tous les éléments, relie les successions implicites et note les références introuvables.
- `capSyEl` (l. 991) — Élément du projet visé par une référence résolue, ou null. @param {object} r @returns {object|null}
- `capSyRefLabel` (l. 995) — Libellé lisible d'une référence résolue ou non (nom qualifié de l'élément, nom de bibliothèque, texte écrit).
- `capSyQualified` (l. 1004) — Nom qualifié d'un élément (« Paquetage::Partie::membre »), sans l'espace de noms du fichier.
- `CAP_SY_TYPING` (l. 1011) — Métaclasses de définition acceptées comme type de chaque sorte d'usage (validate…UsageDefinition, clause 8.3).
- `capSyChecks` (l. 1042) — Contrôles structurels (clause 8.3 et §6.5 du dossier) : doublons de noms, multiplicités, typage incompatible,
- `capSySubKind` (l. 1065) — Vrai si une métaclasse de définition peut en spécialiser une autre (ex. InterfaceDefinition :> ConnectionDefinition).
- `capSySpecializesEl` (l. 1076) — Vrai si la définition a spécialise b (directement ou non). @param {object} M @param {object} a @param {object} b @returns {boolean}
- `capSyKindKeyword` (l. 1083) — Mot-clé SysML d'une métaclasse (« PartDefinition » → « part def »). @param {string} kind @returns {string}
- `capSyDeclText` (l. 1093) — Déclaration d'un élément sur une ligne, en notation textuelle (lignes des compartiments, colonne « Déclaration »).

## 57-sysml-bibliotheque.js — 108 lignes

- `CAP_SY_LIB` (l. 8) — Paquetages de la bibliothèque standard → noms de leurs membres (séparés par des espaces ; « @P » : membres publics de P
- `CAP_SY_LIB_FEATURES` (l. 107) — Membres des définitions des bases implicites (Parts::Part, Actions::Action, Occurrences::Occurrence…) : hérités par tout usage.

## 58-sysml-modele.js — 529 lignes

- `capFmt` (l. 15) — @returns {string} Format du modèle affiché ('capella' | 'sysml')
- `CAP_SY_LAYERS` (l. 18) — Familles d'éléments SysML : elles jouent le rôle des couches ARCADIA (barre latérale, filtres, couleurs).
- `capSyLayerOf` (l. 26) — Famille SysML d'une métaclasse (STR, BEH, REQ, ORG). @param {string} kind @returns {string}
- `CAP_SY_HUMAN` (l. 35) — Noms lisibles et descriptions des métaclasses SysML (panneau de détail, ▤ Tableau, 📖 Index des types).
- `CAP_SY_LINK_SECTIONS` (l. 118) — Relations SysML proposées dans 🔗 Liens, ▤ Tableau (colonnes de relations) et la 🗺 Relation Map (style rc des arêtes,
- `CAP_SY_LINK_GROUPS` (l. 144) — Groupes de relations SysML (barre de 🔗 Liens, colonnes du ▤ Tableau).
- `capFmtSet` (l. 160) — Change le format du modèle affiché : couches (CAP_LAYERS), relations (CAP_LINK_SECTIONS, CAP_LINK_GROUPS),
- `capFmtLayerButtons` (l. 182) — Reconstruit les boutons de filtre par couche (▦ Cartes) selon les couches du format courant.
- `capNavFmtOk` (l. 194) — Vrai si une vue du catalogue est disponible pour le format affiché (fmt : 'sysml', 'both' ; absent : Capella seul).
- `capFmtOfDoc` (l. 201) — Format d'un document XML chargé (attribut arcalyse-format de la racine, posé par capSyToDoc).
- `capSyHash` (l. 205) — Empreinte courte et stable d'un texte (FNV-1a sur 52 bits, en base 36) : identifiants des éléments SysML.
- `capSyAssignIds` (l. 218) — Attribue un identifiant stable à chaque élément : empreinte du chemin qualifié (propriétaires, métaclasse, nom ;
- `capSySynthName` (l. 251) — Libellé d'un élément anonyme : extrémités d'une connexion, d'une succession ou d'une transition (« arret → marche »),
- `capSyDescHtml` (l. 265) — Description HTML d'un élément SysML (documentation, ou corps d'un commentaire), paragraphes conservés.
- `capSyToDoc` (l. 281) — Convertit un modèle SysML en document XML pour le socle commun : un élément par membre (xsi:type « sysml:Métaclasse »),
- `capSyTextToDoc` (l. 353) — Texte .sysml (un fichier) → document XML du socle commun (🔄 suivi du fichier, ⚖ Comparaison de versions).
- `capTextToDoc` (l. 357) — Texte d'un fichier → document XML selon son extension (.sysml : conversion SysML ; sinon XML Capella).
- `capSyLoadFiles` (l. 372) — Charge un projet SysML v2 (un ou plusieurs fichiers .sysml) : analyse, résolution, contrôles, conversion,
- `capSyLoadFileList` (l. 387) — Lit des fichiers (File) .sysml et les charge comme un projet. @param {File[]} list - Fichiers @param {string} [name] - Nom du projet
- `capSyLoadKpar` (l. 401) — Lit une archive de projet .kpar (KerML §10.3 : ZIP, .project.json, .meta.json, fichiers modèle) et charge ses fichiers
- `capZipRead` (l. 420) — Lit les entrées d'une archive ZIP (répertoire central ; méthodes « stockée » et « deflate »).
- `capSyComputeLinks` (l. 450) — Calcule les relations SysML du modèle affiché, au format de capComputeLinks : {clé → [{src, tgt, via?}]}.
- `CAP_SY_ICO_TXT` (l. 496) — Lettres affichées dans l'icône de chaque sorte d'élément.
- `capSyIcoKind` (l. 507) — Icône SVG d'une métaclasse SysML : dossier pour un paquetage, rectangle à coins droits (définition) ou arrondis (usage)
- `capSyIco` (l. 518) — Icône SVG d'un élément SysML du modèle affiché (par identifiant). @param {string} id @param {number} [taille] @returns {string}
- `capSyBoot` (l. 524) — Script d'amorçage d'une page enregistrée avec un modèle SysML : recharge les fichiers embarqués (bloc cap-embedded-sysml).

## 59-sysml-vues.js — 800 lignes

- `capSyRenderView` (l. 14) — Rend la vue ◇ SysML v2 : onglets des sous-vues puis la sous-vue choisie.
- `capSyOpenOn` (l. 29) — Ouvre une sous-vue SysML centrée sur un élément (depuis le panneau de détail).
- `capSyEls` (l. 40) — Éléments du modèle SysML affiché vérifiant un prédicat. @param {function(object):boolean} f @returns {object[]}
- `capSyName` (l. 42) — Nom affiché d'un élément (nom, sinon mot-clé). @param {object} el @returns {string}
- `capSyLink` (l. 44) — Lien cliquable vers le détail d'un élément SysML. @param {object} el @param {string} [txt] @returns {string} HTML
- `capSyTextW` (l. 47) — Largeur d'un texte à la police des diagrammes (mesure par canvas, mémoïsée). @param {string} s @param {number} [fs] - Taille @param {boolean
- `capSyCut` (l. 53) — Tronque un texte pour une ligne de diagramme. @param {string} s @param {number} [n] @returns {string}
- `capSySelect` (l. 58) — Sélecteur d'élément (liste groupée par métaclasse) : renvoie le HTML d'un <select>.
- `capSyMembersOf` (l. 68) — Membres « de structure » visibles d'un élément : possédés, puis hérités de ses types et généraux (préfixe ^),
- `capSyCompartments` (l. 82) — Compartiments d'une boîte (notation §8.2.3.6) : attributs, ports, parties, objets, actions, états, contraintes, doc.
- `capSySizeBox` (l. 100) — Calcule la taille d'une boîte de diagramme (en-tête « «mot-clé» nom : Type » et compartiments).
- `capSyBoxSvg` (l. 112) — SVG d'une boîte de diagramme : rectangle à coins droits (définition) ou arrondis (usage), pointillé pour un usage
- `capSyMarkers` (l. 132) — Définitions des marqueurs d'arêtes SysML v2 (§8.2.3, symboles bnf/images) : triangle creux (spécialisation),
- `capSyLayout` (l. 154) — Mise en couches d'un graphe (inspirée de Sugiyama) : cycles rompus, rang = plus long chemin depuis les sources,
- `capSyClip` (l. 191) — Point de sortie du segment centre(a) → p sur le bord du rectangle a. @param {object} a - {x,y,w,h} @param {number} px @param {number} py @re
- `capSyEdgePath` (l. 201) — Tracé d'une arête entre deux boîtes : orthogonal (bas de la boîte haute → haut de la boîte basse) ou droit, rogné aux bords.
- `capSyDiagram` (l. 217) — Hôte d'un diagramme : SVG avec zoom (molette), déplacement (glisser), ⊡ ajuster, ⬇ SVG / PNG ; clic sur une boîte → détail.
- `capSySvgExport` (l. 243) — Exporte un diagramme en SVG ou PNG (variables de couleur du thème résolues, fond du thème).
- `capSyBar` (l. 255) — Barre d'outils d'une sous-vue : HTML d'une ligne de commandes. @param {string} h - Contenu @returns {string}
- `capSyGvNodeKind` (l. 260) — Vrai si l'élément est une définition ou un usage montré comme boîte dans la General View. @param {object} e @returns {boolean}
- `capSyRenderGV` (l. 266) — ◇ General View : définitions et usages de la portée choisie, avec compartiments et relations (spécialisation, typage,
- `capSyIvTree` (l. 339) — Arbre de l'Interconnection View : parties et ports imbriqués d'un élément (possédés, sinon ceux de son type).
- `capSyPortDir` (l. 351) — Direction d'un port d'après les features de sa définition (toutes in : in, toutes out : out, sinon inout ; inversée si conjugué).
- `capSyIvSize` (l. 361) — Taille (récursive) d'un nœud de l'Interconnection View : nom, ports sur les bords, enfants en grille.
- `capSyIvPlace` (l. 383) — Place les nœuds (coordonnées absolues) et les ports sur les bords. @param {object} n @param {number} x @param {number} y
- `capSyRenderIV` (l. 392) — ⧉ Interconnection View : parties imbriquées, ports sur les bords, connexions / interfaces / flux / liaisons entre eux.
- `capSyBehMembers` (l. 456) — Membres comportementaux d'un élément (possédés, sinon ceux de son type). @param {object} el @param {RegExp} re @returns {object[]}
- `capSyBehGraph` (l. 467) — Graphe d'un comportement : nœuds (actions ou états, nœuds de contrôle, début / fin), arêtes (successions, transitions, flux).
- `capSyBehDraw` (l. 493) — Dessine un comportement (actions ou états) en couches : boîtes arrondies, losanges, barres, début / fin ; successions en
- `capSyRenderAFV` (l. 538) — ⇢ Action Flow View d'une action (définition ou usage). @param {HTMLElement} body
- `capSyRenderSTV` (l. 540) — ◎ State Transition View d'une machine à états (définition ou usage). @param {HTMLElement} body
- `capSyRenderBeh` (l. 543) — Rendu commun des vues de comportement : choix de l'élément racine, puis dessin.
- `capSyRequirements` (l. 563) — Exigences du modèle avec leur traçabilité : texte, sujet, contraintes, satisfaites par, vérifiées par.
- `capSyRenderReq` (l. 579) — 📑 Exigences : tableau filtrable, couverture (satisfaites, vérifiées), export CSV. @param {HTMLElement} body
- `capSyRenderGrid` (l. 608) — ▦ Grid View : matrice sources × cibles d'une relation SysML (satisfy, perform, allocate, typage…), export CSV.
- `CAP_SY_CODES` (l. 634) — Libellés des codes de diagnostic SysML.
- `capSyDiags` (l. 642) — Diagnostics à afficher : ceux de l'analyse (syntaxe, résolution, contrôles) et, en option, les remarques de qualité
- `capSyRenderChk` (l. 656) — ✔ Contrôles : diagnostics filtrables (gravité, code, texte) ; clic sur la position → 🧾 Texte source. @param {HTMLElement} body
- `capSyColorLine` (l. 689) — Colore une ligne de texte SysML (mots-clés, noms entre apostrophes, chaînes, nombres, commentaires et notes) et rend
- `capSyRenderSrc` (l. 710) — 🧾 Texte source : fichiers .sysml numérotés et colorés, diagnostics en marge, noms déclarés cliquables ;
- `capSyDetail` (l. 752) — Section ◇ SysML v2 du panneau de détail : déclaration en notation textuelle, position dans le texte source (lien vers
- `capSyDashCatalog` (l. 786) — Ajoute les indicateurs SysML au catalogue du tableau de bord (35-tableau-de-bord.js).
