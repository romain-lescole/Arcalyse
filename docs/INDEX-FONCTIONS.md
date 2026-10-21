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

## 02-themes.js — 295 lignes

- `THEMES` (l. 6)
- `CAP_THEME_ANCIENS` (l. 39) — Thèmes retirés (refonte 3.0) : une page ou un fichier ⚙ qui les utilise passe au thème indiqué.
- `capInk` (l. 46) — Couleur de texte lisible sur un fond donné : noir ou blanc, selon le meilleur contraste (WCAG).
- `capTextOn` (l. 56) — Couleur d'un texte coloré lisible sur le fond du thème : assombrie en thème clair.
- `capIsLight` (l. 61) — Indique si le thème courant est clair (couleurs de texte foncées nécessaires).
- `CAP_MIN_CONTRAST` (l. 69) — Contraste minimal visé pour un texte coloré (WCAG AA, texte courant).
- `capParseColor` (l. 74) — Décompose une couleur CSS (#rgb, #rrggbb, rgb(), rgba()) en [r,g,b,a].
- `capLuminance` (l. 83) — Luminance relative WCAG d'une couleur [r,g,b].
- `capContrast` (l. 85) — Rapport de contraste WCAG entre deux couleurs [r,g,b].
- `capBlend` (l. 87) — Superpose une couleur semi-transparente [r,g,b,a] sur un fond opaque [r,g,b,1].
- `capHex` (l. 89) — Couleur [r,g,b] → #rrggbb.
- `capReadableOn` (l. 96) — Couleur de texte lisible sur un fond donné, en conservant la teinte : foncée sur fond clair, éclaircie
- `capEffectiveBg` (l. 110) — Fond effectif (opaque) derrière un élément : superpose les fonds semi-transparents de ses ancêtres.
- `capFixContrast` (l. 122) — Corrige le contraste des textes colorés en ligne (style="color:…") d'un sous-arbre, en thème clair.
- `capRestoreContrast` (l. 138) — Rend leurs couleurs d'origine aux textes corrigés par capFixContrast (retour à un thème sombre).
- `capContrastCss` (l. 145) — Génère, pour le thème clair courant, des règles qui foncent les couleurs de texte fixes des feuilles
- `applyTheme` (l. 184) — Applique un thème (Sombre, Clair, Office 2007, Contraste ou personnalisé) en posant toutes ses variables CSS sur :root,
- `applyMode` (l. 231) — Bascule entre les modes d'affichage : default (Relation Map), PBS, capella.
- `tv` (l. 293) — Lit la valeur d'une variable CSS (ex: --c-text). @param {string} varName

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

## 06-rm-interactions-export.js — 614 lignes

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
- `rmDetailClose` (l. 579) — Ferme le panneau de détail de la Relation Map.
- `rmDetailFollow` (l. 585) — Le panneau de détail suit la sélection (S.propEl) tant qu'il est ouvert, en Relation Map.
- `updateInfo` (l. 591) — Met à jour le compteur d'éléments/relations affiché en bas du panneau.
- `typSelectAll` (l. 602) — Coche ou décoche tous les filtres de types d'éléments du panneau gauche.
- `relSelectAll` (l. 610) — Coche ou décoche tous les filtres de types de relations du panneau gauche.

## 07-rm-panneau-criteres.js — 273 lignes

- `buildPanel` (l. 7) — Reconstruit entièrement le panneau gauche : critères de relation, types d'éléments.
- `rmFiltersSearch` (l. 226) — Filtre en direct les lignes d'une colonne du tiroir ⚙ Filtres par leur clé de recherche,
- `rmFiltersCount` (l. 235) — Met à jour les compteurs « cochés / total » du tiroir ⚙ Filtres et de son bouton (barre 2).
- `rmFiltersToggle` (l. 245) — Ouvre ou ferme le tiroir ⚙ Filtres.
- `capShowChainInMap` (l. 261) — Visualise une chaîne fonctionnelle dans la Relation Map en préservant ses ramifications

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

## 11-sauvegarde-toolbar-init.js — 207 lignes

- `applyDepth` (l. 43) — Applique la profondeur d'exploration du graphe (bornée entre 1 et 10),
- `rmLayoutLabel` (l. 55) — Affiche la disposition courante (S.layout) sur le bouton du menu Disposition de la barre 2.
- `openHelpModal` (l. 94) — Ouvre la fenêtre d'aide, éventuellement sur un onglet donné.
- `positionOverlay` (l. 189) — Positionne #capella-overlay sous #toolbar en lisant sa hauteur réelle.

## 12-dialogues.js — 102 lignes

- `capDlg` (l. 27) — Affiche une boîte de dialogue modale et renvoie la réponse.
- `capConfirm` (l. 70) — Demande une confirmation (remplace `confirm`).
- `capAlert` (l. 77) — Affiche un message à acquitter (remplace `alert`). Peut être appelée sans `await`.
- `capPrompt` (l. 85) — Demande une saisie (remplace `prompt`).
- `capToast` (l. 95) — Notification brève en bas de la fenêtre (disparaît seule) : confirmation d'une action, petit avertissement.

## 13-accessibilite.js — 82 lignes

- `CAP_A11Y_CLICK` (l. 9)
- `CAP_A11Y_NATIVE` (l. 10)
- `capA11yPicto` (l. 16) — Vrai si un texte ne contient aucune lettre ni chiffre (pictogrammes, symboles, espaces seulement).
- `capA11yName` (l. 22) — Nom accessible court tiré d'une info-bulle : sa première partie (avant « — », « : », « ; », une parenthèse ou un retour à la ligne), 60 cara
- `capA11yNative` (l. 28) — Vrai si un élément est déjà atteignable au clavier par nature (contrôle natif) ou par un rôle posé ailleurs.
- `capA11yEquip` (l. 33) — Équipe un élément cliquable : rôle, tabulation, nom accessible, état enfoncé.
- `capA11yPressed` (l. 42) — Reflète la classe .active d'un bouton à bascule dans aria-pressed (seulement s'il en a eu une).
- `capA11yFix` (l. 50) — Passe sur une zone du document : commandes cliquables, icônes décoratives.

## 14-profil-controles.js — 135 lignes

- `CAP_CHK_PARAMS` (l. 11) — Seuils réglables : clé, libellé, valeur par défaut, vue concernée (clé de CAP_NAV_ITEMS).
- `CAP_CHK_SEV` (l. 17) — Gravités : clé, pictogramme, libellé.
- `CAP_CHK_VIEWS` (l. 20) — Vues dont les contrôles sont connus d'avance (clé de CAP_NAV_ITEMS → sections). Les vues qui bâtissent leurs
- `capChkSave` (l. 29) — Enregistre le profil dans la page (bloc `cap-checks`, repris par la 💾 Page HTML).
- `capChkParam` (l. 36) — Valeur d'un seuil (profil, sinon défaut). @param {string} k - Clé de CAP_CHK_PARAMS @returns {number}
- `capChkSev` (l. 39) — Gravité d'un contrôle. @param {string} title - Titre @returns {'info'|'warn'|'err'}
- `capChkOff` (l. 42) — Vrai si le profil désactive un contrôle. @param {string} title - Titre @returns {boolean}
- `capChkFilter` (l. 48) — Sections de contrôles conservées par le profil (contrôles activés), gravité renseignée (`sev`).
- `capChkSeen` (l. 53) — Note les contrôles affichés par une vue (catalogue des vues sans fonction de contrôles).
- `capChkCatalog` (l. 61) — Catalogue des contrôles connus : par vue, titre, info-bulle et nombre de lignes actuel.
- `capChkSet` (l. 74) — Applique un profil (fichier ⚙, 📄 projet, import) puis rafraîchit l'affichage.
- `capChkRefresh` (l. 85) — Rafraîchit ce qui dépend du profil : valeurs du tableau de bord, vue affichée (et tous les calculs si un seuil a changé :
- `capChkDialog` (l. 94) — Fenêtre 🩺 Profil de contrôles : par vue, chaque contrôle (activé, gravité, nombre actuel), seuils, export / import .json.

## 20-capella-chargement.js — 925 lignes

- `CAP_LAYERS` (l. 4)
- `CAP_NS_LAYER` (l. 12)
- `CAP_ANCESTOR_KW` (l. 13)
- `CAP_ATTR_KEYS` (l. 14)
- `CAP_TECHNICAL_TYPES` (l. 15)
- `CAP_PKG_TYPES` (l. 16)
- `CAP_TYPE_ICON` (l. 17)
- `capBuildPageHtml` (l. 36) — Construit le HTML de la page actuelle (tout le HTML/CSS/JS de l'application), fichier
- `capPageFileName` (l. 126) — Nom de fichier proposé pour la page sauvegardée (celui de la page de projet ouverte, s'il y en a une).
- `capSaveFullPage` (l. 128) — Sauvegarde la page en la téléchargeant (dossier Téléchargements du navigateur).
- `capSaveWrite` (l. 141) — Écrit la page dans le fichier d'enregistrement direct, après avoir copié la version précédente
- `capSavePageDirect` (l. 152) — Enregistre la page directement dans un fichier choisi une fois (API File System Access d'Edge/Chrome),
- `capEsc` (l. 184) — Échappe les caractères HTML spéciaux pour un affichage sûr. @param {string} s
- `capLoadFile` (l. 201) — Charge un fichier Capella (depuis l'explorateur ou un glisser-déposer) : vérifie
- `capApplyXmlDoc` (l. 250) — Remplace le modèle affiché par un document XML Capella déjà analysé : vide les caches,
- `capReplaceConfirm` (l. 285) — Demande confirmation avant de remplacer le modèle affiché par un autre fichier : le travail non enregistré
- `capReplacePreOk` (l. 314) — @returns {boolean} vrai si le remplacement du modèle vient d'être confirmé avant le sélecteur (la confirmation est consommée)
- `capShowWelcome` (l. 320) — Affiche ou masque l'écran d'accueil. Quand un modèle est déjà chargé, l'écran
- `capWelcomeStatus` (l. 333) — Affiche un message d'état (chargement, erreur) dans la zone de dépôt.
- `capUpdateWelcome` (l. 339) — Synchronise l'écran d'accueil avec l'état de chargement (appelé au démarrage,
- `XSI_NS` (l. 400)
- `capXType` (l. 402) — Lit l'attribut xsi:type d'un élément XML Capella (plain ou namespacé).
- `capTName` (l. 404) — Extrait le nom court du type (après ':') depuis xsi:type. Ex: 'pa:PhysicalComponent' → 'PhysicalComponent'.
- `capXId` (l. 406) — Lit l'ID d'un élément XML Capella (attribut plain 'id' ou xmi:id namespacé).
- `capXName` (l. 408) — Lit l'attribut 'name' d'un élément XML Capella.
- `capResolveLayer` (l. 413) — Détermine la couche ARCADIA (OA/SA/LA/PA/EPBS/Shared) d'un élément
- `capGetAttrs` (l. 419) — Extrait les attributs pertinents d'un élément XML Capella (définis dans CAP_ATTR_KEYS).
- `capBuildTree` (l. 430) — Construit récursivement l'arbre d'éléments Capella depuis le XML.
- `capRunBulk` (l. 456) — Exécute fn en mode chargement groupé puis reconstruit une fois le panneau (qui reconstruit l'arborescence).
- `capBuildTypeRegistry` (l. 466) — Construit capTypeRegistry : {type → {count, layer, checked}} depuis capAllElements.
- `capApplyPanelOnLoad` (l. 486) — Appelée après le chargement Capella : configure le panneau gauche RM.
- `capInjectToArbo` (l. 561) — Injecte les éléments Capella dans MODEL.elements pour qu'ils apparaissent
- `capInjectCapellaRelsToCriteria` (l. 665) — Ajoute les types de relations Capella (PC NODE→PC NODE, etc.) dans RCFG
- `capInjectLinksToModel` (l. 706) — Calcule les liens Capella via capComputeLinks() et les injecte dans MODEL.relations
- `capFilterArboToLinked` (l. 750) — Filtre MODEL.elements pour ne conserver que les éléments _capella référencés
- `capInjectChainsToModal` (l. 788) — Calcule les chaînes (FunctionalChain, OperationalProcess, PhysicalPath)
- `capRenderCurrentView` (l. 844) — Dispatche le rendu vers la vue Capella active (cards/table/tree/links/chains/physlink).
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

## 22-capella-liens.js — 195 lignes

- `CAP_LINK_SECTIONS` (l. 2)
- `CAP_LINK_GROUPS` (l. 41) — Groupes de relations affichés dans la barre de la vue 🔗 Liens (ordre d'affichage).
- `capComputeLinks` (l. 54) — Extrait et résout toutes les relations Capella depuis le XML :

## 23-chaines.js — 580 lignes

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
- `capRenderChainCards` (l. 455) — Construit le HTML des cartes de chaînes, regroupées par catégorie ARCADIA
- `capChainCardBody` (l. 486) — Rend le contenu d'une carte ouverte : entrées/sorties, diagramme et table des échanges.
- `capChainInfo` (l. 527) — ℹ Infos d'une chaîne dans le panneau de détail (comme pour un diagramme) : type, couche, nombre de fonctions
- `capWireChainCards` (l. 559) — Attache l'ouverture/fermeture des cartes (rendu paresseux du diagramme) et la navigation.

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

## 25-panneau-detail.js — 289 lignes

- `capOpenDetail` (l. 5) — Ouvre le panneau de détail (colonne droite de l'overlay) pour un élément Capella.
- `CAP_DESC_TAGS` (l. 126) — Balises gardées dans une description Capella mise en forme (les autres sont remplacées par leur contenu).
- `CAP_DESC_CSS` (l. 129) — Propriétés de style gardées (les couleurs de texte sont adaptées au thème ; fonds, positions et images retirés).
- `capSafeHtml` (l. 137) — Description Capella (HTML) prête à afficher : balises et attributs filtrés (aucun script, aucun gestionnaire
- `capDescSection` (l. 180) — Section « Description » du panneau de détail : la description mise en forme (aperçu), avec une bascule
- `capDescToggle` (l. 189) — Bascule Aperçu / code HTML d'une section « Description ». @param {HTMLElement} b - Bouton cliqué
- `capOpenDetailNode` (l. 196) — Ouvre le panneau de détail à partir d'un nœud de l'arborescence Capella.
- `CAP_ELEM_VIEWS` (l. 204)
- `capUpdateToolbarForView` (l. 210) — Met à jour les boutons actifs et les groupes de contrôles visibles
- `capShowView` (l. 242) — Affiche une vue Capella (bascule en mode capella si besoin).

## 26-rapports-html.js — 101 lignes

- `capReportCss` (l. 18) — Récupère les règles CSS de l'application utiles aux rapports (classes des vues d'interfaces, chaînes, contrôles).
- `capReportClean` (l. 33) — Nettoie un fragment HTML de l'application pour un fichier autonome : retire les appels au panneau de détail
- `capHtmlReport` (l. 44) — Construit et télécharge un rapport HTML autonome à onglets.

## 27-interfaces-calculs.js — 347 lignes

- `capArchLayerOf` (l. 8) — Couche ARCADIA d'un élément XML, déduite de l'architecture qui le contient.
- `capBuildIdMap` (l. 17) — Index id → élément XML, sur l'attribut plain « id » ET xmi:id (namespacé).
- `capCsvDownload` (l. 31) — Télécharge un CSV (séparateur « ; », BOM UTF-8 pour Excel).
- `capMatrixBuild` (l. 45) — Construit une matrice composant × composant (N² des interfaces).
- `capFoldList` (l. 82) — Liste repliable d'éléments HTML séparés par des virgules : au-delà de `max`, le reste est masqué derrière « +N autres » (clic pour déplier /
- `capDiagHtml` (l. 94) — Rend un rapport de contrôles : sections repliables avec compteur et gravité, selon le 🩺 profil de contrôles (14) :
- `capDetLink` (l. 118) — Lien HTML cliquable ouvrant le panneau de détail d'un élément Capella.
- `CAP_PORT_ORIENTS` (l. 124) — Valeurs de l'attribut orientation d'un ComponentPort (OrientationPortKind).
- `CAP_ORIENT_STYLE` (l. 126) — Style d'affichage de chaque orientation de port (couleur, libellé, info-bulle).
- `CAP_CEX_DIRS` (l. 133) — Libellés des sens effectifs d'un Component Exchange.
- `capNormOrient` (l. 144) — Normalise l'orientation d'un port Capella : attribut absent (valeur par défaut EMF) → 'UNSET'.
- `capCexDirection` (l. 158) — Déduit le sens effectif d'un Component Exchange à partir des orientations de ses deux ports.
- `capComputeCompExchanges` (l. 177) — Calcule les Component Exchanges : pour chaque ComponentExchange, résout source/target
- `capAnaCopy` (l. 267) — Copie d'un tableau de résultats avec ses propriétés annexes (`allPorts`, `unallocCEs`…), pour qu'un appelant
- `capComputePhysLinks` (l. 275) — Calcule les Physical Links du modèle : pour chaque PhysicalLink, résout les deux

## 29-physical-link.js — 297 lignes

- `capRenderPhysLink` (l. 4) — Rend la vue Physical Link avec deux modes (≡ Ligne / ▣ Composant),

## 30-ports.js — 275 lignes

- `capOrientBadge` (l. 11) — Badge d'orientation / de direction d'un port (IN, OUT, INOUT, UNSET), version globale.
- `capComputePortLinks` (l. 22) — Collecte tous les ports du modèle et leurs liens d'allocation et d'échange :
- `capPortsTraceRows` (l. 82) — Construit les lignes de la table de traçabilité : une ligne par couple ComponentPort ↔ FunctionPort,
- `capPortsDiagSections` (l. 99) — Contrôles de cohérence entre les trois niveaux de ports et les allocations d'échanges.
- `capRenderPorts` (l. 146) — Rend la vue 🧩 Ports : table de traçabilité FP ↔ CP ↔ PP, cartes par composant et contrôles de cohérence.

## 31-analyses-traca-capacites.js — 339 lignes

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
- `CAP_CAP_TYPES` (l. 206)
- `capComputeCapabilities` (l. 211) — Calcule capacités et missions : fonctions, chaînes, composants/acteurs impliqués (tout type *Involvement,
- `capRenderCapabilities` (l. 251) — Rend la sous-vue Capacités & missions : cartes par couche, matrice d'implication, contrôles de couverture.

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

## 35-tableau-de-bord.js — 657 lignes

- `CAP_DASH_PAL` (l. 3) — Palette catégorielle à ordre fixe (contrôlée pour le daltonisme), déclinée pour thèmes clairs et sombres.
- `CAP_DASH_AK` (l. 6) — Couleurs des natures d'allocation (identiques au filtre « Allocation » de ƒ Fonctions).
- `CAP_DASH_VIZ` (l. 8) — Représentations proposées selon la forme de l'indicateur : [clé, libellé, largeur, hauteur par défaut].
- `CAP_DASH_KIND` (l. 18) — Libellés courts des formes d'indicateurs (badges du catalogue).
- `capDashColor` (l. 24) — Couleur de la i-ème série dans la palette du thème courant (au-delà de 8 : gris « Autres »).
- `capDashPct` (l. 30) — Taux arrondi d'éléments vérifiant un prédicat.
- `capDashCount` (l. 36) — Compte les éléments par clé (une ou plusieurs clés par élément) et trie par effectif décroissant.
- `capDashCatalog` (l. 46) — Catalogue de tous les indicateurs disponibles pour le modèle ouvert (fonctions, chaînes, interfaces,
- `capDashValue` (l. 202) — Valeur (mise en cache) d'un indicateur du catalogue ; null si le modèle ne contient pas la donnée.
- `capDashCut` (l. 215) — Échappe un texte et le tronque pour une étiquette de graphique.
- `capDashLevel` (l. 220) — Niveau d'un pourcentage : bon (≥ 90), à surveiller (≥ 50), faible.
- `capDashCats` (l. 226) — Prépare les catégories d'une répartition : tri, limite d'affichage et regroupement en « Autres ».
- `capDashDraw` (l. 240) — Dessine le contenu d'un élément du tableau de bord.
- `capDashSave` (l. 323) — Enregistre les tableaux de bord dans la page (bloc JSON repris par la 💾 Page HTML).
- `capDashUid` (l. 329) — Identifiant court et unique pour un tableau de bord ou un élément.
- `capDashExample` (l. 333) — Tableau de bord d'exemple adapté au modèle ouvert (synthèse de quelques indicateurs clés).
- `capRenderDashboard` (l. 351) — Vue « 📐 Tableau de bord » : tableaux de bord personnalisés (indicateurs, graphiques, tableaux, textes),
- `capDashPrint` (l. 488) — Imprime un tableau de bord au format A4 : les éléments sont redessinés à la taille de la page
- `capDashTitre` (l. 523) — Titre affiché d'un élément du tableau de bord.
- `capDashImgDraw` (l. 533) — Dessine un élément « image » : diagramme Capella (image enregistrée avec l'élément) ou 🔗 liens entre couches (redessinés sur le modèle char
- `capDashSide` (l. 559) — Panneau de gauche du tableau de bord (mode ✏ Modifier) : ajout ou configuration d'un élément, affiché en direct

## 36-component-exchange.js — 359 lignes

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
- `capRenderRequirements` (l. 203) — Rend la sous-vue 🧾 Exigences : liste filtrable, couverture par couche, contrôles.
- `CAP_PV_ARCH` (l. 243)
- `capPvValue` (l. 250) — Valeur lisible d'une PropertyValue Capella (valeur par défaut EMF si absente).
- `capPvUnit` (l. 258) — Unité d'une propriété PVMT (sous-propriété « __UNIT__ » de la propriété ou de sa définition).
- `capComputePvmt` (l. 267) — Calcule les propriétés PVMT : définitions (domaines, groupes, propriétés, applicabilité)
- `capPvMissing` (l. 306) — Éléments auxquels un groupe PVMT s'applique (classes et architectures déclarées) sans l'avoir reçu.
- `capPvChecks` (l. 320) — Sections de contrôle des propriétés PVMT (réutilisées par le tableau de bord).
- `capRenderPvmt` (l. 336) — Rend la sous-vue 🎛 Propriétés : grille par groupe (une colonne par propriété), synthèse, définitions, contrôles.
- `CAP_DM_TYPES` (l. 387)
- `capComputeDataModel` (l. 393) — Calcule le modèle de données : Exchange Items (éléments, échanges et interfaces qui les portent),
- `capDmChecks` (l. 444) — Sections de contrôle du modèle de données et des interfaces (réutilisées par le tableau de bord).
- `capRenderDataModel` (l. 473) — Rend la sous-vue 🗃 Données & interfaces : Exchange Items, interfaces, classes et types, contrôles.
- `capComputeConstraints` (l. 516) — Calcule les contraintes : expression (liens linkedText résolus), langage, éléments contraints, propriétaire.
- `capCtChecks` (l. 545) — Sections de contrôle des contraintes (réutilisées par le tableau de bord).
- `capRenderConstraints` (l. 562) — Rend la sous-vue 🔒 Contraintes : liste filtrable et contrôles.
- `capXtDetail` (l. 585) — Sections supplémentaires du panneau de détail : exigences liées, propriétés, contraintes.
- `capXtDashCatalog` (l. 614) — Ajoute au catalogue du tableau de bord les indicateurs Exigences, Propriétés, Données & interfaces, Contraintes.

## 40-suivi-fichier.js — 565 lignes

- `capWatchHash` (l. 30) — Empreinte rapide d'un texte (FNV-1a 32 bits + longueur), pour reconnaître une version déjà vue.
- `capWatchTime` (l. 37) — Heure lisible (hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes
- `capWatchDate` (l. 39) — Date et heure lisibles (jj/mm hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes
- `capWatchCounts` (l. 43) — Compte les différences par statut. @param {object[]} diff - Résultat de capDiffCompute
- `capWatchLite` (l. 53) — Copie allégée d'un delta (sans les nœuds XML), pour le garder en mémoire sans retenir les anciens documents.
- `capWatchChips` (l. 58) — Pastilles ➕ ➖ ✎ ↪ d'un comptage. @param {object} c - Comptage capWatchCounts @returns {string} HTML
- `capWatchSetSource` (l. 69) — Enregistre la source suivie après le chargement d'un modèle (remet le suivi à zéro).
- `capWatchCfgSet` (l. 84) — Change les réglages du suivi (⚙ Préférences ou menu 🔄) et les enregistre avec la barre (_capNav.watch, bloc cap-toolbar).
- `capWatchCfgLoad` (l. 91) — Reprend les réglages du suivi enregistrés avec la barre (appelé au chargement de la page et après ⚙ Charger une interface).
- `capWatchArm` (l. 98) — (Ré)arme la vérification périodique selon les réglages.
- `capIsMobile` (l. 106) — Vrai sur téléphone / tablette : leurs sélecteurs ne connaissent pas l'extension .capella et grisent ces fichiers
- `capPickCapellaFile` (l. 119) — Ouvre un fichier Capella à charger : sélecteur avec accès direct (Edge/Chrome, permet le 🔄 suivi),
- `capWatchPickerFailed` (l. 135) — Repli quand le sélecteur à accès direct a été refusé : tente le sélecteur classique (le navigateur peut
- `capWatchPick` (l. 146) — Demande un fichier .capella avec le sélecteur à accès direct quand le navigateur le permet.
- `capWatchReadDisk` (l. 164) — Lit l'état du fichier suivi sur le disque.
- `capWatchCheck` (l. 183) — Vérifie si le fichier suivi a changé et, le cas échéant, prépare la mise à jour (delta + notification).
- `capWatchRegister` (l. 224) — Analyse une nouvelle version lue sur le disque et l'ajoute aux enregistrements en attente :
- `CAP_WATCH_SAME_MIN` (l. 251)
- `capWatchCommon` (l. 258) — Part des éléments identifiés communs aux deux versions (rapportée à la plus grande).
- `capWatchSuspectHtml` (l. 268) — Avertissement (HTML) quand la nouvelle version partage trop peu d'éléments avec le modèle affiché.
- `capWatchPickNewVersion` (l. 275) — Choisit manuellement la nouvelle version du fichier (accès limité, page sauvegardée, fichier déplacé) :
- `capWatchApply` (l. 300) — Applique la version en attente : recharge le modèle (vue courante conservée), archive le delta dans l'historique
- `capWatchOpenCompare` (l. 327) — Ouvre ⚖ Comparaison de versions (🔬 Analyses) sur deux versions connues du suivi.
- `capWatchUpdateUi` (l. 345) — Met à jour le bouton 🔄 Suivi (badge, info-bulle) : il n'apparaît dans la barre que lorsqu'une nouvelle version
- `capWatchFlash` (l. 360) — Affiche brièvement un message dans la notification (sans action). @param {string} msg - Message
- `capWatchNote` (l. 365) — Affiche ou masque la notification de mise à jour (coin inférieur droit).
- `capWatchMenu` (l. 395) — Ouvre ou ferme le menu du bouton 🔄 Suivi. @param {boolean} [show] - Forcer l'état (sinon bascule)
- `capWatchMenuRender` (l. 404) — Construit le contenu du menu 🔄 Suivi (état de la source, réglages, historique).
- `capWatchModalClose` (l. 440) — Ferme la fenêtre du delta.
- `capWatchModalRefresh` (l. 444) — Réaffiche la fenêtre du delta si elle montre la version en attente (nouvel enregistrement détecté entre-temps).
- `capWatchShowDelta` (l. 452) — Affiche la fenêtre du delta : version en attente (cumul et enregistrements pas à pas) ou mise à jour de l'historique.
- `capWatchShowHistory` (l. 532) — Affiche l'historique des mises à jour appliquées pendant la session (chacune ouvre son delta).

## 41-barre-vues.js — 532 lignes

- `CAP_NAV_ITEMS` (l. 14) — Catalogue des vues : k = clé (vue capShowView, « ana:… » pour une sous-vue de 🔬 Analyses, « home:… » pour un onglet
- `CAP_NAV_GROUPS` (l. 62) — Menus déroulants de la barre, dans l'ordre d'affichage (id = identifiant du bouton).
- `CAP_NAV_DEFAULT` (l. 68) — Réglage par défaut : boutons directs 🏠 Accueil, 🔲 Diagrammes, ▤ Tableau ; niveau Essentiel (v3 : réglage de la refonte 3.0).
- `capNavMigrate` (l. 77) — Met à jour un réglage de barre enregistré avant la refonte 3.0 : niveau Expert → Complet, Simplifié ou Personnalisé
- `capNavVides` (l. 93) — Vues sans données dans le modèle ouvert (pas de scénario, d'exigence, de bibliothèque…) : clés de CAP_NAV_ITEMS.
- `capNavEff` (l. 120) — Réglage effectivement appliqué à la barre selon le niveau ⚙ (Essentiel ou Complet) et le réglage « vues vides masquées ».
- `capNavSetMode` (l. 129) — Change le niveau d'affichage des menus.
- `capNavTogglePin` (l. 137) — Épingle ou retire une vue de la barre (bouton direct) ; une vue épinglée reste aussi dans son menu.
- `capNavLbl` (l. 148) — Bouton de la barre : icône, puis libellé masqué en mode ⚙ « icônes seules » (nom complet en infobulle).
- `capNavFit` (l. 157) — Icônes seules dans la barre : toujours si l'utilisateur les a choisies (⚙), sinon automatiquement
- `capNavSave` (l. 167) — Enregistre le réglage de la barre dans la page (bloc JSON repris par la 💾 Page HTML).
- `capNavCurKey` (l. 178) — Clé de la vue affichée (« ana:… » pour une sous-vue de 🔬 Analyses, « home:… » pour un onglet de 🏠 Accueil,
- `capNavOpen` (l. 191) — Ouvre une vue du catalogue, ou exécute une commande (« @… »).
- `CAP_NAV_COUCHE_VUE` (l. 208) — Couche propre aux vues qui n'en montrent qu'une (🧱 SA / LA, PA, 🟨 OA) : sert à mémoriser la couche choisie.
- `capNavCoucheLue` (l. 214) — Couche affichée par une vue ('' = toutes), lue dans l'état de la vue.
- `capNavCoucheDispo` (l. 228) — Vrai si une vue a des éléments dans une couche (pour n'imposer une couche que si elle montre quelque chose).
- `capNavCouchePose` (l. 242) — Applique la couche mémorisée (_capNav.couche, '' = toutes) à la vue affichée, si elle a un filtre de couche
- `capNavCoucheSet` (l. 257) — Choisit la couche commune (sélecteur de la barre de famille) : mémorisée avec la barre, appliquée à la vue affichée.
- `capNavGroupOpen` (l. 264) — Ouvre une famille de vues : la vue de la couche mémorisée (🧱), sinon la dernière ouverte, sinon la première qui a des données.
- `capNavFluxTabs` (l. 275) — Barre de famille sous la barre principale (ex. 🧱 Composants & interfaces : SA · System Component, LA · Logical Component…) :
- `capNavRender` (l. 293) — Reconstruit les boutons de la barre des vues : boutons directs (épingles), menus, champ de recherche, niveau.
- `capNavSync` (l. 321) — Met à jour l'état actif des boutons de la barre (vue affichée, menu qui la contient).
- `capNavClose` (l. 339) — Ferme le menu déroulant de la barre des vues.
- `capNavRow` (l. 350) — Ligne d'une vue dans un menu : ouverture au clic, 📌 pour l'épingler en bouton direct.
- `capNavMenu` (l. 361) — Ouvre le menu déroulant d'un groupe, d'une commande de droite (Fichier, Aide, ⚙…) ou de la recherche (☰ : résultats
- `capNavSearchWire` (l. 399) — Branche le champ 🔍 de la barre : saisie = résultats dans le menu ☰, flèches pour choisir, Entrée pour ouvrir.
- `capNavMenuFill` (l. 418) — Remplit le menu ouvert : vues du groupe, ou (menu ☰) réglage complet ou résultats de la recherche.
- `capNavSections` (l. 490) — Lignes d'un menu rangées par section (intertitre à chaque changement de section).

## 42-tableaux-analyses.js — 157 lignes

- `capTfNorm` (l. 14) — Normalise un texte pour la comparaison (minuscules, sans accents).
- `capTfEnhanceAll` (l. 19) — Équipe les tableaux pas encore traités d'un conteneur.
- `capTfEnhance` (l. 26) — Ajoute la ligne de filtres et les poignées de redimensionnement à un tableau.
- `capTfScrollWrap` (l. 66) — Place le tableau dans un conteneur à défilement horizontal (seule la vue défile verticalement) et lui ajoute
- `capTfHBar` (l. 86) — Barre de défilement horizontal flottante d'un tableau : synchronisée avec son conteneur, affichée seulement
- `capTfFreeze` (l. 106) — Fige les largeurs actuelles des colonnes (avant le premier redimensionnement).
- `capTfWidths` (l. 116) — Applique les largeurs retenues (disposition fixe, le texte passe à la ligne).
- `capTfFilter` (l. 127) — Masque les lignes qui ne correspondent pas aux filtres et affiche le compteur.
- `capTfWatch` (l. 152) — Surveille la zone des sous-vues de 🔬 Analyses pour équiper les tableaux à chaque rendu.

## 43-visite-guidee.js — 514 lignes

- `CAP_TOUR_STEPS` (l. 12) — Étapes de la visite générale : s = sélecteur CSS de la zone (toutes les correspondances visibles sont encadrées
- `CAP_TOUR_EXPLORE` (l. 57) — Étapes communes aux sous-vues de 🧭 Explorateur (onglets, types, recherche, couches).
- `CAP_TOUR_FLUX` (l. 72) — Étape commune aux vues d'une famille (barre de famille sous la barre principale).
- `CAP_TOUR_ANA_TXT` (l. 75) — Rôle de chaque sous-vue de 🔬 Analyses (texte de l'étape « analyse affichée »).
- `capTourRmCtx` (l. 89) — Visite 🗺 Relation Map : si aucun élément n'est au centre du graphe, en choisit un qui donne un visuel lisible —
- `CAP_TOUR_VIEWS` (l. 103) — Visites contextuelles, par vue : clé = '@rm' ou vue Capella (capCurrentView) ; l = nom de la vue,
- `CAP_TOUR_START` (l. 260) — 🚀 Bien démarrer, 1er temps (sans modèle) : où ouvrir le fichier. Terminer la visite arme la reprise (2e temps).
- `CAP_TOUR_AFTER` (l. 277) — 🚀 Bien démarrer, 2e temps (modèle chargé) : où trouver l'aide et les tutoriels.
- `CAP_TOUR_REVUE` (l. 294) — Visite du panneau 💬 Revue (ce n'est pas une vue : lancée par 🎓 dans le panneau ou par ❓ Aide ▾ → 💬 Visite de la revue).
- `CAP_TOUR_SCRIPTS` (l. 307) — Visite de la console 📜 Scripts (ce n'est pas une vue : lancée par 🎓 dans la console ou par ❓ Aide ▾ → 📜 Visite des scripts).
- `capTourScripts` (l. 318) — Lance la visite de la console 📜 Scripts (modèle chargé).
- `capTourRev` (l. 324) — Visite de 💬 Revue : panneau ouvert dans la page (ramené s'il est dans sa fenêtre séparée) sur l'onglet présenté.
- `capTourRevue` (l. 326) — Lance la visite de 💬 Revue.
- `capTourHome` (l. 332) — Visite de 🏠 Accueil : affiche l'onglet présenté par l'étape.
- `capTourCtxKey` (l. 337) — Clé de la vue affichée pour les visites contextuelles.
- `capTourCtx` (l. 345) — Visite contextuelle de la vue affichée, si elle existe et qu'un modèle est chargé.
- `capTourEls` (l. 353) — Éléments affichés désignés par le sélecteur d'une étape.
- `capTourVisible` (l. 364) — Indique si une étape est utilisable (zone affichée, ou bulle centrée).
- `capTourStart` (l. 374) — Lance une visite guidée depuis sa première étape.
- `capTourStartView` (l. 395) — Lance la visite de la vue affichée (ou la visite générale s'il n'y en a pas).
- `capTourGo` (l. 403) — Passe à l'étape suivante ou précédente utilisable (les zones non affichées sont sautées).
- `capTourPos` (l. 423) — Numéros (rang, total) de l'étape courante parmi les étapes utilisables.
- `capTourRenderPop` (l. 430) — Remplit la bulle de l'étape courante (titre, texte, compteur, boutons).
- `capTourPlace` (l. 442) — Place le cadre clignotant sur la zone de l'étape courante et la bulle à côté (ou au centre).
- `capTourKey` (l. 474) — Raccourcis clavier pendant la visite : ← → Entrée pour naviguer, Échap pour quitter.
- `capTourEnd` (l. 483) — Quitte la visite guidée et retire la mise en évidence.
- `capTourHelpMenu` (l. 490) — Ouvre le menu ❓ Aide ▾ (s'il n'est pas déjà ouvert) pour l'étape qui le présente.
- `capTourStartHere` (l. 497) — Lance « 🚀 Bien démarrer » : sans modèle, montre où ouvrir le fichier et arme la reprise après chargement ;
- `capTourResumeAfterLoad` (l. 504) — Reprend « 🚀 Bien démarrer » (2e temps) après le chargement d'un modèle, si la reprise a été armée.

## 44-functional-exchange.js — 515 lignes

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

## 46-config-interface.js — 154 lignes

- `CAP_CFG_PARTS` (l. 9)
- `capCfgSer` (l. 21) — Sérialise en JSON en conservant les ensembles (Set). @param {*} o @returns {string}
- `capCfgRev` (l. 23) — Relit un JSON produit par capCfgSer (ensembles reconstitués). @param {string} t @returns {*}
- `capCfgGet` (l. 29) — État courant d'une partie de l'interface.
- `capCfgSet` (l. 45) — Applique une partie de configuration à l'interface (et la mémorise dans la page).
- `capCfgStoreViews` (l. 72) — Écrit dans la page (bloc JSON « cap-ui-views ») ce que les autres blocs ne conservent pas encore :
- `capCfgRestoreViews` (l. 79) — Réapplique à l'ouverture de la page les vues mémorisées par capCfgStoreViews.
- `capCfgDialog` (l. 95) — Fenêtre de choix des parties à enregistrer ou à charger.
- `capCfgLoadFile` (l. 134) — Ouvre un fichier .json d'interface et propose les parties à appliquer.
- `capCfgLoadUpdate` (l. 148) — Charge une mise à jour du modèle depuis un autre fichier : comparaison, delta, puis mise à jour après validation (🔄 Suivi).

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

## 54-diagrammes.js — 1149 lignes

- `CAP_DIAG_COUCHES` (l. 19) — Ordre des couches ARCADIA dans la liste et les exports.
- `capDiagDispo` (l. 22) — @returns {boolean} vrai si la visionneuse d'Arcature est embarquée dans la page
- `capIco` (l. 35) — Icône d'un élément du modèle, comme dans Capella (variante selon acteur, humain, nature, genre de fonction…),
- `capIcoType` (l. 53) — Icône d'un type d'élément (sans variante), sans modèle chargé.
- `capDiagLoadAird` (l. 69) — Charge un fichier .aird (diagrammes du projet). Sans modèle chargé (ou s'il accompagne un .capella en cours
- `capDiagSetAird` (l. 95) — Mémorise le texte d'un .aird (les diagrammes seront relus par la visionneuse à la prochaine synchronisation).
- `capDiagAvantNouveauModele` (l. 106) — Un autre modèle remplace le modèle affiché : les diagrammes de l'ancien modèle (.aird) ne lui correspondent pas,
- `capDiagApresMaj` (l. 120) — Après une 🔄 mise à jour du modèle (même projet, nouvelle version du .capella) : les diagrammes chargés viennent
- `capDiagRefsManquantes` (l. 147) — Nombre d'éléments du modèle montrés par le .aird chargé (références « fichier#id ») qui n'existent plus dans le modèle affiché.
- `capDiagMajDialogue` (l. 161) — Fenêtre affichée après une 🔄 mise à jour du modèle quand les diagrammes (.aird) peuvent ne plus correspondre :
- `capDiagPickAird` (l. 189) — 📂 Ouvrir le .aird : sélecteur à accès direct ouvert dans le dossier du .capella (Edge/Chrome,
- `capOpenProjectFolder` (l. 208) — 📁 Dossier du projet (écran d'accueil) : charge ensemble le modèle .capella et ses diagrammes .aird.
- `capProjectScanDir` (l. 223) — Lit un dossier du projet (sélecteur ou dossier déposé) sur 2 niveaux et charge le modèle et ses diagrammes.
- `capProjectFromFiles` (l. 241) — Charge un projet à partir des fichiers d'un dossier : le .capella (choisi dans l'écran d'accueil s'il y en a plusieurs)
- `capDiagMsg` (l. 269) — Affiche un message bref dans la barre de la vue. @param {string} t - Texte
- `capDiagEnsure` (l. 272) — Crée la vue (une fois) : barre (ouvrir, export, sélection), liste classée à gauche, hôte de la visionneuse.
- `capDiagSplit` (l. 303) — Séparateur entre l'explorateur et le diagramme : glisser pour régler la largeur de l'explorateur.
- `capDiagCarte` (l. 320) — ▣ Carte (mini-carte de la visionneuse) : sous l'explorateur (repliable) ou dans le diagramme, comme dans la visionneuse.
- `capDiagBarre` (l. 344) — Barre du haut : 📂 Ouvrir le .aird…, ⬇ Exporter…, ☐ Sélectionner…, fichier chargé.
- `capDiagFit` (l. 359) — Ajuste la hauteur de la vue à la fenêtre.
- `capDiagSync` (l. 367) — Transmet à la visionneuse le modèle courant (texte XML) et le .aird en attente, si besoin.
- `capDiagBarreVd` (l. 393) — Réorganise la barre de la visionneuse au-dessus du diagramme, pour qu'elle ne bouge plus d'un diagramme à l'autre :
- `capDiagRevSlot` (l. 421) — Remplit l'emplacement de la revue (📝 Note de revue, 💬 Calque) à côté de la recherche du diagramme.
- `capDiagChainesFiltre` (l. 430) — Liste « Chaînes et chemins » : ne garde que les chaînes fonctionnelles et chemins physiques dessinés dans
- `capRenderDiagrams` (l. 441) — Rendu de la vue 🔲 Diagrammes Capella.
- `capDiagReps` (l. 455) — @returns {object[]} représentations du .aird chargé ({uid, nom, type, sigle, genre, couche})
- `capDiagCouche` (l. 458) — Libellé et couleur d'une couche ARCADIA. @param {string} c - OA, SA, LA, PA, EPBS… @returns {{label:string,color:string,bg:string}}
- `capDiagRang` (l. 461) — Rang d'une couche pour le tri. @param {string} c - Couche @returns {number}
- `capDiagIcones` (l. 464) — Icône de chaque diagramme, reprise de la liste (masquée) de la visionneuse. @returns {Map<string,string>} uid → SVG
- `capDiagFiltrees` (l. 473) — Représentations filtrées par la recherche (nom, type, sigle, couche). @returns {object[]}
- `capDiagGroupes` (l. 484) — Regroupe les représentations selon le classement choisi.
- `capDiagOuvert` (l. 519) — Un groupe est-il ouvert ? Couches ouvertes, types repliés par défaut ; tout est ouvert pendant une recherche.
- `capDiagListe` (l. 526) — Rend la liste classée (panneau gauche).
- `capDiagMarquerActif` (l. 572) — Met en évidence le diagramme ouvert dans la liste.
- `capDiagRepsGroupe` (l. 581) — Représentations d'un groupe de la liste (selon la clé).
- `capDiagClic` (l. 588) — Clics de la vue : barre (ouvrir, export, sélection), carte, groupes repliables, diagrammes. @param {MouseEvent} e
- `capDiagChange` (l. 616) — Cases à cocher (diagramme, groupe, tout) et choix du classement. @param {Event} e
- `capDiagOpen` (l. 631) — Ouvre un diagramme dans la vue 🔲 Diagrammes Capella et y met un élément en évidence.
- `capDiagInfo` (l. 642) — Panneau de détail d'un diagramme (comme pour un élément du modèle) : type, couche, sigle, nature, identifiant,
- `capDiagDetail` (l. 680) — Section « Diagrammes » du panneau de détail : représentations de l'élément et diagrammes où il est dessiné.
- `capDiagSvg` (l. 698) — SVG autonome d'un diagramme, tel que l'exporte la visionneuse (menu ⬇ Exporter › SVG) :
- `capDiagPlanche` (l. 730) — Planche d'un diagramme : cadre, en-tête (couche, sigle, nom, type), diagramme centré, cartouche technique
- `capDiagTexte` (l. 809) — Texte brut d'une description Capella (attribut XML contenant du HTML).
- `capDiagMeta` (l. 821) — Description et élément représenté d'un diagramme, lus dans le .aird (DRepresentationDescriptor : documentation, target).
- `capDiagElements` (l. 841) — Annexe d'un diagramme : éléments du modèle représentés (attributs data-sem du SVG), triés par couche, type et nom.
- `capDiagAnnexeCsv` (l. 854) — Annexe au format CSV (séparateur ;, BOM) : en-tête du diagramme, description, puis éléments représentés.
- `CAP_DIAG_ANX` (l. 861) — Lignes d'annexe par page PDF.
- `capDiagAnnexePages` (l. 870) — Pages d'annexe du PDF (A4 paysage) : tableau des éléments représentés.
- `capDiagCibles` (l. 906) — Diagrammes visés par l'export, dans l'ordre de la liste (couche, type, nom).
- `capDiagExportDialog` (l. 913) — Fenêtre « Exporter des diagrammes » : portée, mise en page, aperçu de la planche, formats.
- `capDiagApercu` (l. 958) — Aperçu de la planche du premier diagramme visé (diagramme ouvert s'il en fait partie).
- `capDiagPdfSommaire` (l. 977) — Page de sommaire du PDF (paysage A4) : projet, date, nombre de planches, liste par couche et type avec numéros de page.
- `CAP_DIAG_PDF_ALERTE` (l. 1019) — Seuil (Mo) au-delà duquel l'export PDF demande confirmation.
- `capDiagPdfEstimation` (l. 1029) — Taille estimée du PDF, d'après la surface des planches rastérisées (même bornes que capSvgToCanvas)
- `capDiagExport` (l. 1043) — Export groupé des diagrammes en planches : capture de tous les diagrammes, puis pagination
- `capDiagExportHtml` (l. 1114) — Rapport HTML autonome : onglet Sommaire (tableau avec liens) et onglet Planches

## 55-revue.js — 1326 lignes

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
- `capRevMarkSaved` (l. 94) — La page vient d'être enregistrée : plus aucun commentaire en attente d'enregistrement.
- `capRevUnsavedCount` (l. 96) — @returns {number} nombre de commentaires modifiés depuis le dernier enregistrement ou export
- `capRevUid` (l. 98) — Identifiant unique d'un commentaire. @returns {string}
- `capRevHash` (l. 103) — Empreinte courte (FNV-1a 32 bits) d'un texte. @param {string} s @returns {string}
- `capRevValue` (l. 111) — Valeur commentée d'un élément : nom, description (texte), attribut, ou pour l'élément entier
- `capRevSnap` (l. 124) — Mémorise la valeur commentée : empreinte, extrait du texte (champ) ou attributs et nombre d'enfants (élément).
- `capRevTarget` (l. 136) — Cible d'un commentaire pour un élément du modèle chargé.
- `capRevTargetState` (l. 141) — État d'une cible sur le modèle chargé. @param {object} t - Cible @returns {string} 'same' | 'changed' | 'deleted' | 'na'
- `capRevState` (l. 147) — État d'un commentaire (pire état de ses cibles). @param {object} c @returns {string} 'same' | 'changed' | 'deleted' | 'na'
- `capRevToCheck` (l. 153) — @returns {object[]} commentaires non clos dont une cible a changé ou disparu, ou marqués « Corrigé, à vérifier »
- `capRevProjectId` (l. 158) — @returns {string} identifiant (UUID) de l'élément racine Project du modèle chargé ('' sans modèle)
- `capRevProjectName` (l. 160) — @returns {string} nom du Project du modèle chargé
- `capRevOtherProject` (l. 162) — @param {object} c - Commentaire @returns {boolean} vrai si le commentaire a été posé sur un autre projet que celui chargé
- `capRevMatch` (l. 176) — Compare une revue (ou des commentaires) au modèle chargé. Critères, dans l'ordre :
- `CAP_REV_MIN_ELTS` (l. 192) — En dessous de ce nombre d'éléments commentés, la part retrouvée dans le modèle ne suffit pas à conclure.
- `capRevOnModelLoad` (l. 196) — Après le chargement d'un modèle : rattache au projet les anciens commentaires qui n'en avaient pas,
- `capRevBadge` (l. 210) — Met à jour le badge des commentaires (bouton 💬 Revue et menu 💬 Revue & documents de la barre) :
- `capRevToggle` (l. 221) — Ouvre ou ferme le panneau 💬 Revue (dans la page, ou dans sa fenêtre séparée si elle est ouverte : elle passe alors au premier plan).
- `capDockDet` (l. 240) — @returns {HTMLElement|null} panneau de détail du mode affiché (vues Capella ou Relation Map)
- `capDockRevOn` (l. 242) — @returns {boolean} panneau de revue ouvert dans la page (pas dans sa fenêtre séparée)
- `capDockDetOn` (l. 244) — @returns {boolean} panneau de détail du mode affiché ouvert
- `capDockTabsHtml` (l. 250) — Onglets 🔎 Propriétés / 💬 Revue affichés en tête des deux panneaux quand ils sont ouverts ensemble.
- `capDockShow` (l. 260) — Affiche l'un des deux panneaux ancrés quand ils sont ouverts ensemble.
- `CAP_DOCK_W` (l. 262) — Largeur par défaut de la colonne de droite (panneaux de détail et de revue), en pixels.
- `capDockWidthApply` (l. 264) — Applique la largeur commune des panneaux de droite (réglage `_capNav.dockW`, enregistré avec la barre).
- `capDockEdgeAt` (l. 271) — @returns {HTMLElement|null} panneau de droite visible dont le bord gauche se trouve sous le pointeur (à 5 px près)
- `capDockResizeDown` (l. 282) — Bord gauche des panneaux de droite : glisser pour régler leur largeur commune (double-clic : largeur par défaut).
- `capDockSync` (l. 295) — Place le panneau de revue dans la colonne de droite du mode affiché et règle les onglets partagés avec le panneau de détail.
- `capRevPanel` (l. 308) — @returns {HTMLElement} panneau 💬 Revue (créé au premier appel ; il peut se trouver dans la fenêtre séparée)
- `capRevPop` (l. 319) — @returns {Window|null} fenêtre séparée de la revue, si elle est ouverte
- `capRevDoc` (l. 321) — @returns {Document} document où l'utilisateur travaille sur la revue : la fenêtre séparée si elle a le focus, sinon la page
- `capRevQ` (l. 323) — @param {string} id @returns {HTMLElement|null} élément du panneau (page ou fenêtre séparée)
- `capRevConfirm` (l. 325) — @param {string} msg @returns {boolean} confirmation demandée dans la fenêtre où l'on travaille
- `capRevAlert` (l. 327) — @param {string} msg - Message affiché dans la fenêtre où l'on travaille
- `capRevPopOut` (l. 334) — ⧉ Ouvre le panneau 💬 Revue dans une fenêtre séparée (à placer sur un autre écran). La fenêtre dépend de la page :
- `capRevPopTheme` (l. 353) — Recopie le thème de la page (attributs et variables de couleur de <html>) dans la fenêtre séparée. @param {Window} w
- `capRevPopBack` (l. 358) — Fenêtre séparée fermée : le panneau revient (fermé) dans la page.
- `capRevRender` (l. 367) — Affiche le contenu du panneau 💬 Revue (onglet courant).
- `capRevPeople` (l. 400) — Personnes connues : participants, auteurs et responsables des commentaires. @returns {string[]}
- `capRevFiltered` (l. 406) — @returns {object[]} commentaires de l'onglet 💬 Commentaires, filtrés et triés
- `capRevListHtml` (l. 428) — Onglet 💬 Commentaires : filtres et cartes. @returns {string} HTML
- `capRevCardHtml` (l. 448) — Carte d'un commentaire (repliée : en-tête, titre, méta ; dépliée : texte complet, réponses, actions).
- `capRevTargetsHtml` (l. 478) — Pastilles des cibles d'un commentaire (élément + champ, diagramme), cliquables. @param {object} c @returns {string} HTML
- `capRevPanelClick` (l. 488) — Clics du panneau (délégation). @param {MouseEvent} e
- `capRevPanelInput` (l. 523) — Saisie dans le panneau : recherche, réglages. @param {Event} e
- `capRevPanelChange` (l. 528) — Listes et cases du panneau : filtres, statut d'un commentaire, réglages. @param {Event} e
- `capRevGet` (l. 540) — @param {string} id @returns {object|undefined} commentaire
- `capRevGoto` (l. 547) — Montre la cible d'un commentaire : sa note dans le diagramme (s'il a été posé sur un diagramme et que le .aird
- `capRevValidate` (l. 558) — Valide un commentaire (correction vérifiée) : statut Validé, date et vérificateur. @param {object} c
- `capRevResnap` (l. 563) — Prend la version actuelle du modèle comme nouvelle référence des cibles d'un commentaire. @param {object} c
- `capRevNew` (l. 574) — Nouveau commentaire : ouvre l'éditeur avec ses cibles (et sa note de diagramme) déjà renseignées.
- `capRevEdit` (l. 582) — Éditeur d'un commentaire (fenêtre) : texte (seul champ obligatoire), titre, criticité, catégorie, statut,
- `capRevDetailHead` (l. 691) — Boutons 💬 du panneau de détail, sous le nom de l'élément : commenter l'élément, son nom, sa description.
- `capRevAttrBtn` (l. 705) — Petit bouton 💬 d'un attribut du panneau de détail (visible au survol) : commenter cet attribut.
- `capRevDetailSection` (l. 714) — Section « Commentaires » du panneau de détail : commentaires portant sur l'élément.
- `capRevDetailSectionIn` (l. 724) — Contenu de la section « Commentaires » du panneau de détail.
- `capRevShow` (l. 733) — Ouvre 💬 Revue sur un commentaire (déplié). @param {string} id
- `capRevShowFor` (l. 739) — Ouvre 💬 Revue sur les commentaires d'un élément. @param {string} id
- `CAP_REV_ID_ATTRS` (l. 744) — Attributs portant l'identifiant d'un élément du modèle dans les vues (blocs, tableaux, listes, diagrammes).
- `capRevChainAt` (l. 750) — Chaîne (⚡ Chaînes) dans laquelle se trouve un élément de l'interface : carte de chaîne ou graphe de la vue Relation Map des chaînes.
- `capRevChainFns` (l. 759) — Fonctions (ou composants) d'une chaîne, pour les proposer comme éléments commentés.
- `capRevElementAt` (l. 771) — Élément du modèle désigné par un nœud de l'interface (lui ou un de ses parents) : attribut d'identifiant
- `capRevContext` (l. 785) — Menu du clic droit dans les vues : sur un élément, commenter l'élément, son nom, sa description, voir ses commentaires.
- `capRevShowDiag` (l. 830) — Ouvre 💬 Revue sur les notes du diagramme ouvert.
- `capRevMarkSchedule` (l. 836) — Programme la mise à jour des marques 💬 (après un rendu de vue).
- `capRevMark` (l. 838) — Marque d'un 💬 les blocs, cartes et noms cliquables des éléments qui ont des commentaires non clos.
- `capRevDiagUid` (l. 854) — @returns {string} identifiant du diagramme ouvert dans la visionneuse ('' sinon)
- `capRevDiagBar` (l. 860) — Commandes de la revue dans la barre de 🔲 Diagrammes Capella : 📝 Note (à glisser sur le diagramme) et
- `capRevLayerEnsure` (l. 868) — Installe (une fois) le calque des commentaires au-dessus du diagramme et ses écouteurs.
- `capRevDiagNoteAt` (l. 915) — Pose une note de revue sur le diagramme ouvert, à un point de l'écran (centre de la vue par défaut),
- `capRevDiagBox` (l. 932) — Boîte d'un élément du diagramme en coordonnées du diagramme (union de ses formes dessinées).
- `capRevLayerDraw` (l. 947) — Dessine les notes du diagramme ouvert sur le calque : un plan qui suit le zoom et le déplacement
- `capRevNoteClick` (l. 991) — Boutons d'une note du calque : lier, modifier, réduire / agrandir. @param {MouseEvent} e
- `capRevToggleTarget` (l. 1005) — Lie un élément à un commentaire, ou le délie s'il l'était déjà.
- `capRevNoteLine` (l. 1019) — Trait tiré depuis la poignée ● d'une note : suit le pointeur (élément visé en surbrillance) ;
- `capRevNoteDown` (l. 1041) — Glisser une note (en-tête ou pastille), la redimensionner (coin) ou tirer un trait vers un élément (poignée ●). @param {PointerEvent} e
- `capRevDiffHtml` (l. 1070) — Différence entre la valeur commentée et le modèle chargé, pour une cible.
- `capRevCheckHtml` (l. 1084) — Onglet 🔁 Vérifier. @returns {string} HTML
- `capRevCheckAll` (l. 1101) — Valide tous les commentaires à vérifier (après confirmation).
- `capRevReportList` (l. 1110) — @returns {object[]} commentaires du rapport (ceux de la liste filtrée, ou tous)
- `capRevSynthese` (l. 1112) — Tableau croisé statut × criticité. @param {object[]} l - Commentaires @returns {string} HTML
- `capRevReportTab` (l. 1120) — Onglet 📄 Rapport : synthèse et exports. @returns {string} HTML
- `capRevGroupes` (l. 1138) — Groupes du rapport selon le regroupement choisi.
- `capRevReportHtml` (l. 1148) — Télécharge le rapport HTML autonome de la revue.
- `capRevCsv` (l. 1171) — Télécharge les commentaires du rapport en CSV (une ligne par commentaire).
- `capRevCfgHtml` (l. 1183) — Onglet ⚙ Réglages. @returns {string} HTML
- `capRevCfgAction` (l. 1205) — Actions de l'onglet ⚙ Réglages : participants, export, import, suppression.
- `capRevExport` (l. 1213) — Exporte la revue (participants et commentaires) dans un fichier .json réutilisable.
- `capRevImport` (l. 1220) — Importe un fichier .json de revue, ou une page de 📤 revue ciblée relue (.html), et la fusionne avec les commentaires de la page.
- `capRevImportConfirm` (l. 1254) — Fenêtre d'avertissement avant d'importer une revue qui ne semble pas porter sur le modèle chargé :
- `capRevMerge` (l. 1288) — Fusionne une revue importée : nouveaux commentaires ajoutés (renumérotés si leur numéro est pris),

## 56-accueil.js — 766 lignes

- `CAP_HOME_DND` (l. 23) — Type de données glissées (référence vers un diagramme ou un élément).
- `capHomeNorm` (l. 30) — Complète des données d'accueil (lues dans la page ou un fichier) avec les valeurs par défaut.
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
- `capRenderHome` (l. 135) — Affiche la vue 🏠 Accueil (et rafraîchit les check-lists et dossiers ouverts dans une fenêtre séparée).
- `CAP_HOME_SCROLLS` (l. 163) — Zones qui défilent dans l'accueil (vue ou fenêtre séparée) : page, liste de gauche, document ouvert.
- `capHomeScrollGet` (l. 169) — Positions de défilement des zones de l'accueil, avant un nouveau rendu.
- `capHomeScrollSet` (l. 175) — Rétablit les positions de défilement après un rendu (plier un chapitre, cocher une case… ne ramène plus en haut).
- `capHomeCapellaVersion` (l. 180) — @returns {string} version de Capella du modèle, lue dans les espaces de noms du fichier ('' si inconnue)
- `capHomeCouches` (l. 189) — Contenu du modèle par couche : nombre d'éléments et types principaux (hors types techniques et paquetages).
- `capHomeProgress` (l. 196) — @param {object} d - Check-list ou plan @returns {{ok:number, n:number}} points cochés / points
- `capHomeBar` (l. 198) — Barre d'avancement. @param {{ok:number,n:number}} p @returns {string} HTML
- `capHomeCartes` (l. 205) — Cartes de l'onglet 🏠 Projet, dans l'ordre par défaut : k = clé, l = titre, w = largeur par défaut (1 ou 2 colonnes),
- `capHomeCartesOrdre` (l. 240) — @returns {string[]} clés des cartes affichées, dans l'ordre choisi (cartes nouvelles ajoutées à la fin)
- `capHomeProjetHtml` (l. 246) — Onglet 🏠 Projet : cartes (ordre, largeur et cartes masquées réglables par ⚙ Disposer). @returns {string} HTML
- `capHomeTaches` (l. 263) — Tâches proposées par « Que voulez-vous faire ? » : [icône, titre, description, clé de vue (capNavOpen), chemin affiché].
- `capHomeTachesHtml` (l. 273) — Section « Que voulez-vous faire ? » de l'onglet 🏠 Projet (masquable, réaffichée par ⚙ Disposer). @returns {string} HTML
- `capHomeLibs` (l. 282) — Bibliothèques du projet et leur état : référencées par le modèle (72, capLibScan) ou chargées sans être référencées.
- `capHomeEnteteHtml` (l. 292) — En-tête de l'onglet 🏠 Projet : modèle, couches, état des diagrammes et des bibliothèques (détail dépliable), vues sans données.
- `capHomeModeles` (l. 325) — Modèles de check-lists (ARCADIA) : sections et points proposés.
- `capHomeNewDoc` (l. 347) — Crée une check-list ou un plan de revue et l'ouvre.
- `capHomeQuickDoc` (l. 370) — ✚ Check-list rapide : une section, un point par ligne (au moins un point vide), puis ouverture.
- `capHomeDocsHtml` (l. 380) — Onglet ☑ Check-lists & plans de revue : création (listes « Nouvelle check-list », « Nouveau plan de revue »), import,
- `capHomeDocHtml` (l. 402) — Document ouvert : en-tête (titre, avancement, actions), champs du plan de revue, sections et points.
- `capHomePerimIds` (l. 448) — Identifiants du périmètre d'un plan : éléments et diagrammes du périmètre et des points.
- `capHomeComPerim` (l. 454) — @param {object} c - Commentaire de revue @param {{el:Set,diag:Set}} ids - Périmètre @returns {boolean} vrai si le commentaire porte sur le p
- `capHomeDocExport` (l. 460) — Document HTML imprimable d'une check-list ou d'un plan de revue.
- `capHomeDocImport` (l. 488) — Importe une check-list ou un plan de revue enregistré en .json (💾 .json).
- `CAP_HOME_LARG` (l. 508) — Bornes de largeur des volets réglables (px).
- `capHomeLargeur` (l. 514) — Attribut style de la largeur choisie pour un volet (rien : largeur par défaut).
- `capHomeSplit` (l. 520) — Poignée de redimensionnement d'un volet, placée entre le volet et le document (double-clic : largeur par défaut).
- `capHomeSplitDown` (l. 525) — Glisser la poignée d'un volet : la largeur suit la souris, puis elle est enregistrée dans la page.
- `capHomePaletteHtml` (l. 540) — Palette à droite (check-lists, dossiers, fenêtres séparées) : recherche, diagrammes, éléments. @returns {string} HTML
- `capHomePaletteList` (l. 548) — Résultats de la palette : diagrammes (filtrés), éléments dont le nom contient la recherche. @returns {string} HTML
- `capHomeRender` (l. 567) — Réaffiche la vue 🏠 Accueil si elle est affichée, et les fenêtres séparées ouvertes.
- `capHomeDocOf` (l. 576) — Check-list ou plan concerné par un élément de l'interface (vue ou fenêtre séparée).
- `capHomeCurDoc` (l. 578) — @returns {object|undefined} document ouvert dans l'onglet ☑
- `capHomeWin` (l. 583) — Fenêtre d'un élément de l'interface (la page, ou une fenêtre séparée) : boîtes de dialogue au bon endroit.
- `capHomeFind` (l. 589) — Premier élément correspondant au sélecteur, dans la page ou les fenêtres séparées (curseur placé après un rendu).
- `capHomeWire` (l. 599) — Branche (une fois) les écouteurs d'un conteneur (vue ou fenêtre séparée) : clics, saisies, glisser-déposer,
- `CAP_HOME_CARTE` (l. 639) — Type de données glissées pour réordonner les cartes de 🏠 Projet.
- `capHomeCarteMove` (l. 645) — Place une carte de 🏠 Projet avant une autre.
- `capHomeDrop` (l. 656) — Dépôt d'une référence (ou d'un texte) sur une zone : périmètre, point, section, dossier.
- `capHomeItemAdd` (l. 673) — Ajoute un point à une section (après un point donné, sinon à la fin) et y place le curseur.
- `capHomeMove` (l. 680) — Déplace un objet d'une liste d'un cran. @param {Array} l @param {number} i @param {number} dir - -1 / +1
- `capHomeClick` (l. 683) — Clics de la vue et des fenêtres séparées (délégation). @param {MouseEvent} e
- `capHomeInput` (l. 743) — Saisie : fiche projet, titres, champs du plan, points, recherche de la palette. @param {Event} e
- `capHomeChange` (l. 757) — Listes et cases : création d'une check-list ou d'un plan, champs du plan, case d'un point. @param {Event} e

## 57-projet-page.js — 210 lignes

- `CAP_PROJET_VERSION_MIN` (l. 16) — Plus ancienne version d'Arcalyse dont les pages enregistrées sont reprises sans réserve.
- `CAP_PROJET_BLOCS` (l. 18) — Blocs JSON d'une page enregistrée repris à l'ouverture d'un projet de travail.
- `capProjetPagePick` (l. 25) — 📄 Ouvrir un projet de travail : choix de la page HTML (sélecteur à accès direct quand le navigateur le permet,
- `capProjetPageOuvrir` (l. 45) — Lit une page HTML de projet (choisie ou déposée), analyse son contenu et propose ce qu'il faut reprendre.
- `capProjetPageLire` (l. 67) — Analyse le texte d'une page HTML enregistrée, sans l'exécuter.
- `capProjetVersionCmp` (l. 82) — Compare deux numéros de version (« 2.1 », « 2.10.1 »).
- `capProjetBloc` (l. 94) — Relit un bloc JSON d'une page enregistrée (ensembles « __set » reconstitués, comme les fichiers ⚙ d'interface).
- `capProjetParties` (l. 104) — Parties d'une page de projet, avec ce qu'elles contiennent (pour la fenêtre de choix).
- `capProjetPageDialogue` (l. 132) — Fenêtre « Ouvrir un projet de travail » : version de la page, compatibilité, parties à reprendre (cochées),
- `capProjetPageAppliquer` (l. 173) — Applique une page de projet : travail et réglages cochés, puis modèle et diagrammes ; ouvre 🏠 Accueil.

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

## 60-accueil-fenetres.js — 107 lignes

- `capHomePopListe` (l. 20) — Liste des objets d'un type de fenêtre séparée.
- `capHomePopWin` (l. 27) — Fenêtre séparée ouverte pour une check-list (doc) ou un dossier (dos).
- `capHomePopDocs` (l. 29) — @returns {Document[]} documents des fenêtres séparées ouvertes
- `capHomePopClose` (l. 31) — Ferme la fenêtre séparée d'une check-list ou d'un dossier. @param {string} kind @param {string} id
- `capHomePopPlace` (l. 38) — Rappel affiché dans la vue quand une check-list ou un dossier est ouvert dans sa fenêtre.
- `capHomePopOpen` (l. 49) — ⧉ Ouvre une check-list, un plan de revue ou un dossier dans une fenêtre séparée (même script, mêmes données).
- `capHomePopsRender` (l. 65) — Réaffiche le contenu des fenêtres séparées ouvertes (ferme celles dont la check-list ou la page a été supprimée).
- `CAP_HOME_SOURCES` (l. 82) — Éléments des vues qui peuvent être glissés vers une check-list ou un dossier.
- `capHomeDragRef` (l. 88) — Référence portée par un élément glissable d'une vue (diagramme de la liste, élément de l'Explorateur, chaîne).

## 61-dossier-relecture.js — 1149 lignes

- `capDosNorm` (l. 23) — Complète la liste des dossiers lue dans la page (valeurs par défaut, blocs normalisés).
- `capDosOf` (l. 33) — Dossier concerné par un élément de l'interface (vue ou fenêtre séparée), sinon dossier ouvert dans l'onglet 📑.
- `capDosOuvrir` (l. 38) — Ouvre l'onglet 📑 Dossiers de relecture de 🏠 Accueil (depuis 💬 Revue, par exemple).
- `capDosOnglet` (l. 49) — Onglet d'un dossier : 📘 Rapports automatiques (rapport produit par un plan type ou modèle de rapport) ou 📑 Faire relire.
- `capDosListe` (l. 51) — Dossiers de l'onglet affiché (📘 rapports et modèles, ou 📑 dossiers de relecture). @returns {object[]}
- `capRapOuvrir` (l. 53) — Ouvre 💬 Revue & documents › 📘 Rapports automatiques (onglet de l'accueil).
- `capDosCur` (l. 57)
- `capDosTrouve` (l. 65) — Bloc d'un dossier et sa place : liste qui le contient, rang, chapitre parent.
- `capDosParcours` (l. 79) — Parcourt les blocs d'un dossier dans l'ordre du document.
- `capDosBlocDe` (l. 89) — Bloc visé par un retour (« id » ou « id.d » pour la description d'un chapitre).
- `capDosNouveau` (l. 111) — Crée un dossier et l'ouvre.
- `capDosDiagsDe` (l. 122) — Diagrammes dont un élément est l'élément représenté (cible du diagramme dans le .aird).
- `capDosNomDiag` (l. 128) — Nom d'un diagramme sans le préfixe de son type (« [LAB] … »). @param {string} n @returns {string}
- `capDosChapDe` (l. 136) — Chapitre créé à partir d'une référence glissée : élément (titre, description, diagrammes dont il est l'élément représenté)
- `capDosBlocDeRef` (l. 150) — Bloc créé à partir d'une référence glissée dans un chapitre : diagramme, élément (avec sa description) ou texte libre.
- `capDosDepuisPlan` (l. 158) — Crée un dossier à partir d'un plan de revue : un chapitre par élément ou diagramme du périmètre.
- `capDosOngletHtml` (l. 168) — Onglet 📑 : liste des dossiers, dossier ouvert. @returns {string} HTML
- `capDosNavHtml` (l. 196) — Volet de navigation du dossier ouvert : plan des chapitres numérotés (clic : aller au chapitre, en le dépliant),
- `capDosAller` (l. 208) — Va à un chapitre du dossier (volet de navigation) : déplie le chapitre et ses parents, puis le fait défiler en haut.
- `capDosHtml` (l. 220) — Dossier ouvert : en-tête (titre, exports, réimport), consignes, retours, plan du dossier.
- `capDosListeHtml` (l. 257) — Blocs d'une liste (chapitres numérotés, imbriqués).
- `capDosModeleBoutons` (l. 262) — Boutons propres aux 🧩 modèles de rapport : boucle « pour chaque » et contenu automatique. @returns {string} HTML
- `capDosActs` (l. 272) — Actions d'un bloc ou d'un chapitre : convertir (chapitre numéroté ↔ bloc), monter, descendre, sortir du chapitre,
- `capDosConvertir` (l. 287) — Convertit un bloc en chapitre numéroté, ou un chapitre en bloc (son contenu est placé à sa suite, au même niveau).
- `capDosBadge` (l. 306) — Pastille du nombre de retours d'un bloc (clic : afficher les retours).
- `capDosRetoursHtml` (l. 311) — Retours d'un bloc, s'ils sont dépliés. @param {object} d @param {string} bid @returns {string} HTML
- `capDosDuBloc` (l. 320) — Vrai si un retour porte sur un bloc, ou sur un élément représenté de ce bloc (diagramme).
- `capDosApercu` (l. 326) — Aperçu de la description d'un élément (3 lignes).
- `capDosChapHtml` (l. 342) — Chapitre : numéro, titre, élément associé, description, retours, contenu (blocs et sous-chapitres), zone de dépôt.
- `capDosBlocHtml` (l. 368) — Bloc d'un chapitre : texte libre, élément (avec sa description) ou diagramme (description, éléments représentés).
- `capDosRetourHtml` (l. 398) — Un retour de relecteur : type, criticité, auteur, date, extrait commenté, texte ; commentaire de 💬 Revue créé.
- `capDosRetoursTousHtml` (l. 410) — Tous les retours du dossier, dans l'ordre du document. @param {object} d @returns {string} HTML
- `capDosTypes` (l. 418) — @returns {object[]} types de retour {k, l} proposés aux relecteurs
- `capDosClick` (l. 429) — Clics de l'onglet 📑 (délégation depuis capHomeClick).
- `capDosFocus` (l. 482) — Place le curseur dans le titre (chapitre) ou le texte (bloc) qui vient d'être créé. @param {string} id - Bloc
- `capDosInput` (l. 488) — Saisies de l'onglet 📑 : champs du dossier, titres, textes ; cases (description, éléments représentés).
- `capDosDrop` (l. 511) — Dépôt d'une référence ou d'un texte dans le dossier ouvert.
- `capDosDiagSvgs` (l. 536) — SVG des diagrammes d'une liste (la vue 🔲 Diagrammes Capella est ouverte le temps de l'export, puis la vue précédente rétablie).
- `capDosContenu` (l. 556) — Contenu du dossier prêt à exporter : chapitres numérotés, descriptions (texte), éléments, diagrammes (SVG, dimensions,
- `capDosEnvoi` (l. 588) — Données exportées d'un dossier (page HTML, Word, aperçu) : contenu résolu sur le modèle chargé et informations d'envoi.
- `capDosVisu` (l. 601) — 👁 Aperçu du rendu : la page HTML du dossier (ou, pour un 🧩 modèle, du rapport qu'il produirait, sans le créer)
- `capDosVisuEcrire` (l. 621) — Écrit la page du rapport dans une fenêtre séparée (titre « 👁 … »).
- `capDosVisuDetacher` (l. 631) — ⧉ Détache l'aperçu dans sa propre fenêtre (par exemple sur un autre écran) ; 👁 Aperçu l'actualise ensuite.
- `capDosVisuOuvrir` (l. 644) — Fenêtre d'aperçu : page du rapport dans un cadre, bascule 📄 Lecture / 💬 Avec commentaires, 🖨 Imprimer, ⬇ Page HTML,
- `capDosExport` (l. 676) — Exporte le dossier : page HTML à commenter ou document Word.
- `capDosElemsReels` (l. 696) — Éléments représentés d'un diagramme, tels qu'un relecteur les reconnaît : une implication sans nom
- `capDosBout` (l. 709) — Élément au bout d'un échange : un port est remplacé par son propriétaire (fonction, composant), une Part par son type.
- `capDosListeLignes` (l. 724) — Lignes d'un tableau d'éléments, lues sur le modèle chargé : nom, type, description ; ou pour des échanges :
- `capDosB64` (l. 733) — Base64 d'un texte UTF-8 (SVG embarqué dans la page). @param {string} s @returns {string}
- `capDosPage` (l. 747) — Page HTML autonome (hors ligne) du dossier : sommaire, chapitres numérotés, figures, commentaires par bloc,
- `$` (l. 800)
- `esc` (l. 801)
- `dt` (l. 802)
- `find` (l. 803)
- `uid` (l. 804)
- `ink` (l. 805)
- `me` (l. 806)
- `mark` (l. 807)
- `chaps` (l. 808)
- `counts` (l. 809)
- `btn` (l. 811)
- `zone` (l. 812)
- `com` (l. 813)
- `opts` (l. 817)
- `formHtml` (l. 818)
- `upd` (l. 821)
- `updAll` (l. 824)
- `para` (l. 825)
- `node` (l. 826)
- `toc` (l. 847)
- `render` (l. 849)
- `needMe` (l. 859)
- `dl` (l. 877)
- `base` (l. 878)
- `capDosDocx` (l. 901) — Document Word du dossier : page de titre (projet, auteur, consignes, mode d'emploi), sommaire, chapitres en styles
- `capDosUnzip` (l. 1011) — Lit les fichiers d'une archive ZIP (méthodes « stored » et « deflate », décompression native du navigateur).
- `capDosXmlTexte` (l. 1031) — Décode les entités XML d'un texte. @param {string} s @returns {string}
- `capDosWText` (l. 1033) — Texte des runs d'un fragment WordprocessingML (paragraphes séparés par un saut de ligne). @param {string} xml @param {string} [tag] - 't' ou
- `capDosLireDocx` (l. 1044) — Retours d'un document Word commenté : commentaires (rattachés au dernier signet « arc_… » qui les précède) et
- `capDosLireFichier` (l. 1073) — Lit un fichier de retours : page HTML enregistrée par un relecteur, .json de ses retours, ou .docx commenté.
- `capDosLirePage` (l. 1082) — @param {string} texte - Code HTML @returns {object|null} données de la page de relecture (sans l'exécuter)
- `capDosImporter` (l. 1090) — Choisit et importe un ou plusieurs fichiers de retours (page HTML, .json, .docx).
- `capDosFusion` (l. 1104) — Rattache des retours lus à leur dossier (même identifiant ; sinon dossier recréé depuis la page, ou dossier ouvert
- `capDosVersRevue` (l. 1131) — Verse les retours non encore traités dans 💬 Revue : un commentaire par retour, cible = élément du bloc

## 62-liens-couches.js — 249 lignes

- `CAP_XL_MAX` (l. 18) — Nombre maximal d'éléments dessinés.
- `capXlCompute` (l. 25) — Graphe des liens entre couches.
- `capXlSvg` (l. 60) — Dessin SVG autonome (fond blanc) des liens entre couches : colonnes, groupes chaîne + fonctions, liens courbes.
- `capXlChercher` (l. 125) — Éléments du modèle qui peuvent servir de départ (catégorie de traçabilité, couche ARCADIA réelle), dont le nom contient un texte.
- `capXlOpts` (l. 135) — @returns {object} options de dessin de la vue (copie de l'état)
- `capXlTitre` (l. 137) — Titre d'un dessin. @param {object} o - Options @returns {string}
- `capXlOpen` (l. 146) — Ouvre la vue ⇶ Liens entre couches à partir d'un élément.
- `capXlSuggestions` (l. 152) — Éléments proposés au départ : ceux qui ont le plus de liens de réalisation (chaînes et capacités d'abord).
- `capRenderXlay` (l. 164) — Sous-vue 🔬 Analyses › ⇶ Liens entre couches : barre (mode, élément de départ, sens, catégorie, options, exports), dessin.
- `capXlWire` (l. 195) — Branche les commandes de la sous-vue (après chaque rendu) : recherche, options, exports, nœuds du dessin.
- `capXlExport` (l. 225) — Exporte le dessin affiché : SVG, PNG, CSV des liens, ou bloc dans le 📑 dossier de relecture ouvert.

## 63-rapports-auto.js — 449 lignes

- `capDosGabarits` (l. 17) — @returns {{k:string, l:string, t:string}[]} plans types proposés (k : clé, l : libellé, t : description)
- `capDosOutils` (l. 28) — Outils de construction d'un plan : blocs du dossier, éléments du modèle par couche, diagrammes par type.
- `capDosEchExt` (l. 57) — Échanges fonctionnels d'une fonction avec l'extérieur (fonctions allouées à des acteurs).
- `capDosStsBase` (l. 68) — Éléments communs aux plans boîte noire (couche SA) : système, acteurs, fonctions du système, échanges avec l'extérieur,
- `capDosPlanSts` (l. 88) — Plan type STS (boîte noire, couche SA), exemple 1.
- `capDosPlanSts2` (l. 123) — Plan type STS (boîte noire, couche SA), exemple 2 : introduction, présentation du système, exigences techniques.
- `capDosPlanDcs` (l. 162) — Plan type DCS (boîte blanche, couches LA et PA).
- `capDosGenerer` (l. 216) — Crée un dossier selon un plan type, rempli à partir du modèle chargé, et l'ouvre.
- `CAP_RAP_TYPES` (l. 240) — Types d'éléments parcourus par une boucle ou listés par un tableau automatique.
- `CAP_RAP_FILTRES` (l. 245) — Filtres d'une boucle ou d'un tableau automatique.
- `CAP_RAP_AUTO` (l. 249) — Contenus automatiques proposés.
- `capRapOpts` (l. 261) — Options d'une liste déroulante.
- `capRapCouches` (l. 263) — @returns {{k:string,l:string}[]} couches proposées ('' : toutes)
- `capRapBoucleHtml` (l. 270) — Réglages d'un chapitre « boucle » (sous son titre, dans l'éditeur du modèle).
- `capRapAutoHtml` (l. 284) — Réglages d'un bloc « contenu automatique ».
- `capRapAutoLib` (l. 294) — Libellé d'un bloc « contenu automatique ». @param {object} b @returns {string}
- `capRapFill` (l. 302) — Remplace {nom}, {type}, {couche} par les valeurs de l'élément de la boucle.
- `capRapFonctionsDe` (l. 310) — Fonctions allouées à un composant, à ses sous-composants et aux composants déployés sur lui.
- `capRapSelect` (l. 324) — Éléments parcourus par une boucle (ou listés par un tableau automatique).
- `capRapLie` (l. 349) — Vrai si un élément est lié à l'élément de la boucle englobante : fonction allouée au composant (ou impliquée dans la
- `capRapEval` (l. 370) — Évalue les blocs d'un modèle pour un élément de boucle : boucles déroulées, contenus automatiques calculés,
- `capRapGenerer` (l. 411) — ▶ Génère un rapport à partir d'un modèle personnalisé : nouveau dossier ordinaire, ouvert dans l'éditeur.
- `capRapNouveau` (l. 420) — ✚ Nouveau modèle de rapport, prérempli d'un exemple de boucles (à adapter). @returns {object} modèle
- `capRapJson` (l. 435) — Enregistre un modèle de rapport en .json (réutilisable dans un autre projet). @param {object} m
- `capRapImporter` (l. 440) — Importe un ou plusieurs modèles de rapport (.json). @param {Window} [W] - Fenêtre d'où part la demande

## 64-preferences.js — 296 lignes

- `CAP_PREF_MODES` (l. 9) — Libellés et descriptions des niveaux d'affichage des menus.
- `capAutoCfg` (l. 19) — Réglage de l'enregistrement automatique (créé à la première lecture, désactivé par défaut).
- `capAutoSupported` (l. 25) — Vrai si le navigateur permet d'écrire directement dans un fichier (Edge, Chrome). @returns {boolean}
- `capPrefNamesOpen` (l. 28) — Ouvre ƒ Fonctions › 🩺 Contrôles, réglage des règles de nommage déplié.
- `capPrefSetIcons` (l. 38) — Change le style de la barre : icônes et textes, ou icônes seules (nom complet en infobulle).
- `capPrefMenuHtml` (l. 46) — Contenu du menu ⚙ de la barre : niveau des menus, style de la barre, thème, enregistrement automatique, préférences.
- `capPrefDialog` (l. 66) — Ouvre la fenêtre ⚙ Préférences.
- `capPrefDialogFill` (l. 78) — Remplit la fenêtre ⚙ Préférences (onglet courant ov._tab) et branche ses commandes.
- `capAutoHash` (l. 189) — Empreinte rapide d'un texte (FNV-1a 32 bits) pour savoir si la page a changé.
- `capAutoPickMain` (l. 198) — Choisit le fichier de la page (« Enregistrer sous ») ; il sert ensuite à 💾 et à l'enregistrement automatique.
- `capAutoPickBackup` (l. 208) — Choisit le fichier de secours (version précédente de la page).
- `capAutoBackup` (l. 221) — Copie le contenu actuel du fichier de la page dans le fichier de secours (appelé avant chaque écriture, voir capSaveWrite).
- `capAutoWritten` (l. 234) — Note un enregistrement réussi (manuel ou automatique) : empreinte de la page écrite, heure.
- `capAutoTick` (l. 240) — Enregistrement automatique : écrit la page si elle a changé depuis le dernier enregistrement.
- `capAutoSchedule` (l. 260) — (Re)lance la minuterie de l'enregistrement automatique selon le réglage.
- `capAutoBanner` (l. 269) — Bandeau sous la barre quand l'enregistrement automatique est activé mais qu'un fichier manque

## 65-dossier-textes.js — 283 lignes

- `capDosQuois` (l. 10) — Ce que montre un bloc « texte du modèle ». @returns {{k:string,l:string}[]}
- `capDosRefTextes` (l. 17) — Nom et description actuels d'une référence (élément du modèle chargé, ou diagramme du .aird chargé).
- `capDosModTexte` (l. 31) — Texte d'un bloc « texte du modèle », relu sur le modèle chargé.
- `capDosModHtml` (l. 41) — En-tête et contenu d'un bloc « texte du modèle » dans l'éditeur (le reste du bloc est fait par capDosBlocHtml).
- `capDosLier` (l. 61) — Transforme un bloc en « texte du modèle » relié à une référence (texte libre gardé en réserve s'il y en a un).
- `capDosTxIndex` (l. 74) — Index des noms et descriptions du modèle (texte normalisé → identifiant), pour suggérer un lien ;
- `capDosTxNorm` (l. 90) — Normalise un texte pour la comparaison (espaces, casse). @param {string} s @returns {string}
- `capDosSuggestion` (l. 97) — Élément dont le nom ou la description est identique au texte libre d'un bloc.
- `capDosSuggestionHtml` (l. 109) — Pastille « 🔗 lier à … ? » d'un bloc texte dont le contenu est un nom ou une description du modèle.
- `capDosTitre` (l. 120) — Titre affiché d'un chapitre : nom de l'élément associé s'il est suivi (titreRef), sinon le titre saisi.
- `capDosCopie` (l. 127) — Copie profonde d'un bloc ou d'un chapitre avec de nouveaux identifiants.
- `capDosTxAct` (l. 141) — Commandes « tx-… » des blocs (boutons, pastille de suggestion, menu contextuel).
- `capDosChoisir` (l. 174) — Petite fenêtre de choix d'un élément ou d'un diagramme (recherche par nom, type, couche).
- `capDosContext` (l. 211) — Menu contextuel de l'éditeur des dossiers et rapports (blocs, chapitres, plan).
- `capDosCtxRun` (l. 275) — Exécute une commande du menu contextuel comme un clic sur un bouton du bloc (mêmes traitements que capDosClick).

## 66-rapports-sss-ssdd.js — 282 lignes

- `capDosPerimetre` (l. 14) — Fenêtre de choix du périmètre d'un rapport SSS / SSDD : le système, ou un composant (sous-système).
- `capDosSujet` (l. 54) — Contexte d'un périmètre : sujet, couche, éléments intérieurs, fonctions, échanges externes et internes,
- `capDosReqsDe` (l. 90) — Exigences dont le type, le nom, le texte ou un attribut correspond à une expression.
- `capDosReqQualif` (l. 98) — Priorité et méthode de vérification d'une exigence : attribut ou propriété PVMT dont le nom contient
- `capDosReqLignes` (l. 110) — Lignes d'un tableau d'exigences (bloc « liste » cols:'req') : identifiant, exigence, texte, priorité, vérification, éléments liés.
- `capDosOutilsSs` (l. 124) — Outils communs aux plans SSS / SSDD (au-dessus de capDosOutils) : invite à compléter, tableau d'exigences,
- `capDosSsDebut` (l. 144) — Chapitres 1 (domaine d'application) et 2 (documents de référence), communs au SSS et au SSDD.
- `capDosPlanSss` (l. 162) — Plan SSS (DI-IPSC-81431) : spécification du système ou du sous-système et de sa qualification.
- `capDosPlanSsdd` (l. 232) — Plan SSDD (DI-IPSC-81432) : conception du système ou du sous-système (architecture, exécution, interfaces).

## 67-palette.js — 132 lignes

- `CAP_PAL_MAX` (l. 8)
- `CAP_PAL_MAX_DIAG` (l. 9)
- `CAP_PAL_RECENT` (l. 10)
- `capPalNorm` (l. 17) — Normalise un texte pour la recherche : sans accents, en minuscules.
- `capPalIndex` (l. 23) — Index des éléments du modèle cherchables par la palette (valeurs, liens techniques, paquetages et éléments sans nom exclus),
- `capPalScore` (l. 51) — Pertinence d'une entrée pour une requête : 0 = pas de correspondance, puis par ordre croissant :
- `capPalSearch` (l. 67) — Cherche les éléments du modèle et les diagrammes correspondant à une requête.
- `capPalRow` (l. 84) — Ligne de résultat (élément ou diagramme) du menu ☰.
- `capPalHtml` (l. 98) — HTML des résultats « Éléments du modèle » et « Diagrammes » du menu ☰ pour une requête ('' si aucun).
- `capPalRecentHtml` (l. 114) — 🕘 Derniers éléments et diagrammes ouverts par la palette (menu ☰ sans requête ; '' si aucun).
- `capPalOpen` (l. 125) — Ouvre un résultat de la palette : le panneau de détail d'un élément (en vues Capella) ou un diagramme.

## 68-statut-revue.js — 168 lignes

- `CAP_ST_CLS` (l. 11) — Classes de statut et leur présentation (ordre d'affichage).
- `CAP_ST_EXCL` (l. 14) — Types qui ne sont ni des éléments de modèle revus ni cherchés : valeurs, liens de traçabilité et d'allocation, paquetages, fragments d'inter
- `capStEligible` (l. 20) — Vrai si un élément est un élément de modèle nommé, revu et cherché (hors valeurs, liens techniques, paquetages, fragments).
- `capStClassOf` (l. 27) — Classe d'un littéral de statut d'après son nom (anglais ou français).
- `capComputeStatus` (l. 40) — Relève les statuts et commentaires de revue Capella de tous les éléments (en cache dans `_capAnaCache`).
- `capStName` (l. 65) — Nom lisible d'une valeur brute de l'attribut `status` (« #id » → nom du littéral).
- `capStBadge` (l. 72) — Pastille d'un statut.
- `capStRevComments` (l. 79) — Commentaires 💬 Revue (Arcalyse) qui visent un élément. @param {string} id - Élément @returns {object[]}
- `capStChecks` (l. 84) — Contrôles du statut de revue.
- `capRenderStatus` (l. 100) — Rend la sous-vue 🔖 Statut de revue : liste filtrable, répartition statut × couche, contrôles.
- `capStOpen` (l. 138) — Ouvre la sous-vue 🔖 Statut de revue, filtrée sur un statut ou une classe.
- `capStDetail` (l. 145) — Section « Statut de revue Capella » du panneau de détail ('' si l'élément n'en a pas).
- `capStDashCatalog` (l. 156) — Indicateurs du tableau de bord : statut de revue Capella.

## 69-sante-modele.js — 243 lignes

- `CAP_SANTE_W` (l. 9)
- `CAP_SANTE_MAX_HIST` (l. 10)
- `CAP_SANTE_AUTO` (l. 11)
- `capSanteNiveau` (l. 14) — Niveau lisible d'un score. @param {number} s - Score 0–100 @returns {{l:string, c:string, h:string}} libellé, couleur CSS, couleur fixe
- `capSanteChecks` (l. 19) — Tous les contrôles de toutes les vues (profil appliqué), avec le nombre de lignes global et par couche quand la vue le permet.
- `capSanteCompute` (l. 47) — Score de santé global et par couche.
- `capSanteVuesMasquees` (l. 71) — Vues dont les contrôles sont masqués du score (réglage du projet, bloc `cap-home`). @returns {string[]}
- `capSanteToggleVue` (l. 77) — Masque ou compte de nouveau les contrôles d'une vue dans le score, puis recalcule et réaffiche.
- `capSanteExclues` (l. 86) — Couches ARCADIA décochées (exclues du score global ; réglage du projet, bloc `cap-home`). @returns {string[]}
- `capSanteToggleCouche` (l. 92) — Coche ou décoche une couche pour le score global, puis recalcule et réaffiche.
- `capSanteCle` (l. 101) — Clé de la version du modèle affichée : nom du fichier, nombre d'éléments et de relations (stable, indépendante du 🔄 suivi). @returns {strin
- `capSanteRecord` (l. 106) — Note le score de la version affichée dans l'historique (`_capHome.sante`) : même version → entrée remplacée.
- `capSanteSpark` (l. 119) — Petite courbe SVG de l'historique des scores. @param {object[]} H - Historique @param {number} [w=140] @param {number} [h=28] @returns {stri
- `capSanteDate` (l. 126) — Date courte d'une entrée d'historique. @param {string} iso @returns {string}
- `capSanteCarte` (l. 129) — Carte 💚 Santé du modèle de 🏠 Accueil. @returns {string} HTML
- `CAP_SANTE_VUES` (l. 145) — Vues qui ont des contrôles comptés par 💚 Santé (clés de capSanteVueCle) : la pastille 🩺 des barres de famille ne s'affiche que pour elles.
- `capSanteVueCle` (l. 154) — Clé de vue sous laquelle 💚 Santé range les contrôles d'une vue (🧱 LA avec 🧱 SA, 🟨 OA avec ƒ⇆).
- `capSanteOuvrir` (l. 159) — Ouvre ✅ Vérifier › 💚 Santé & contrôles filtrée sur les contrôles d'une vue (contrôles en défaut).
- `capSanteAller` (l. 169) — Ouvre la vue d'un contrôle sur son onglet 🩺 Contrôles et déplie la section du contrôle.
- `capRenderSante` (l. 191) — Sous-vue 💚 Santé du modèle de 🔬 Analyses : synthèse, contrôle × couche, historique.
- `capSanteDashCatalog` (l. 227) — Indicateurs du tableau de bord : santé du modèle.

## 70-chaines-controles.js — 83 lignes

- `capChRefs` (l. 13) — Références entre chaînes (`FunctionalChainReference`) et identifiants des enfants de chaque chaîne (nœuds de contrôle compris).
- `capChChecks` (l. 30) — Contrôles des chaînes.
- `capChDashCatalog` (l. 80) — Indicateurs du tableau de bord : contrôles des chaînes.

## 71-categories-echanges.js — 147 lignes

- `CAP_EC_KINDS` (l. 10) — Natures de catégories : type Capella → {k (clé), attribut des échanges, type d'échange, libellé}.
- `capComputeExchangeCategories` (l. 19) — Catégories d'échanges du modèle et index échange → catégories (en cache dans `_capAnaCache`).
- `capEcOf` (l. 36) — Catégories d'un échange. @param {string} id - Échange @returns {object[]}
- `capEcSelect` (l. 44) — Liste déroulante « Catégorie » pour une vue de flux ('' si le modèle n'a aucune catégorie de cette nature).
- `capEcMatch` (l. 50) — Vrai si un échange passe le filtre de catégorie. @param {string} exId - Échange @param {string} cat - Valeur du filtre @returns {boolean}
- `capEcBadges` (l. 53) — Pastilles des catégories d'un échange ('' si aucune). @param {string} exId @returns {string} HTML
- `capEcChecks` (l. 56) — Contrôles des catégories d'échanges. @returns {object[]} Sections
- `capRenderExchangeCategories` (l. 77) — Sous-vue 🏷 Catégories d'échanges : par catégorie, par échange, contrôles.
- `capEcGo` (l. 113) — Ouvre la vue de flux d'une nature d'échange, filtrée sur une catégorie.
- `capEcPending` (l. 121) — Filtre de catégorie en attente pour une vue de flux (consommé à la construction de son état). @param {string} v - Vue @returns {string} id o
- `capEcDetail` (l. 128) — Section « Catégories » du panneau de détail : catégories d'un échange, ou échanges d'une catégorie.
- `capEcDashCatalog` (l. 139) — Indicateurs du tableau de bord : catégories d'échanges.

## 72-bibliotheques.js — 169 lignes

- `capLibIsExt` (l. 16) — Vrai si une valeur de référence vise un autre fichier (préfixe avant « # »). @param {string} v @returns {boolean}
- `capLibParse` (l. 19) — Décompose une référence externe. @param {string} v @returns {{prefix:string, name:string, project:string, id:string}|null}
- `capLibScan` (l. 28) — Relève les références externes et les bibliothèques déclarées du modèle (en cache dans `_capAnaCache`).
- `capLibLoaded` (l. 45) — Bibliothèque chargée correspondant à un nom de fichier. @param {string} name @returns {object|null}
- `capLibResolve` (l. 51) — Résout une référence externe dans les bibliothèques chargées.
- `capLibAdd` (l. 61) — Charge un fichier .capella comme bibliothèque (remplace une bibliothèque du même nom).
- `capLibRemove` (l. 72) — Retire une bibliothèque chargée. @param {string} name - Nom du fichier
- `capLibPick` (l. 75) — Choisit des fichiers de bibliothèques (.capella) et les charge. @param {Function} [apres] - Appelée après chargement
- `capLibQueue` (l. 84) — Note les fichiers .capella voisins du modèle (📁 Dossier du projet) : ceux qui sont référencés seront chargés après le modèle.
- `capLibOnModelLoad` (l. 87) — Après le chargement d'un modèle : charge, parmi les fichiers du dossier du projet, les bibliothèques référencées.
- `capLibRefHtml` (l. 98) — Libellé HTML d'une référence externe : 📚 bibliothèque › nom et type de l'élément s'il est résolu, sinon identifiant.
- `capLibChecks` (l. 107) — Contrôles des bibliothèques. @returns {object[]} Sections
- `capRenderLibs` (l. 123) — Sous-vue 📚 Bibliothèques : bibliothèques, références, contrôles.
- `capLibDetail` (l. 153) — Section « Références externes » du panneau de détail ('' si l'élément n'en a pas).
- `capLibDashCatalog` (l. 162) — Indicateurs du tableau de bord : bibliothèques.

## 73-rec-rpl.js — 143 lignes

- `capComputeRec` (l. 16) — Catalogue REC / RPL du modèle (en cache dans `_capAnaCache`).
- `capRecEcarts` (l. 48) — Nombre d'écarts d'une réplique. @param {object} r - RPL @returns {number}
- `capRecLink` (l. 51) — Lien vers un élément du modèle visé par un lien de catalogue ('introuvable' sinon). @param {object} l - Lien @returns {string} HTML
- `capRecChecks` (l. 54) — Contrôles REC / RPL. @returns {object[]} Sections
- `capRecOpen` (l. 74) — Ouvre la comparaison d'une réplique avec son REC. @param {string} id - RPL
- `capRenderRec` (l. 79) — Sous-vue 📦 REC / RPL : REC, répliques, comparaison, contrôles.
- `capRecDetail` (l. 123) — Section « REC / RPL » du panneau de détail : catalogue d'un élément, ou contenu d'un élément de catalogue.
- `capRecDashCatalog` (l. 134) — Indicateurs du tableau de bord : REC / RPL.

## 74-deploiement-epbs.js — 154 lignes

- `CAP_CI_KINDS` (l. 12) — Libellés des natures de Configuration Item.
- `capComputeDeploy` (l. 20) — Déploiement et EPBS du modèle (en cache dans `_capAnaCache`).
- `capDepFnCount` (l. 64) — Nombre de fonctions allouées à chaque composant (une passe sur les fonctions, résultat gardé avec elles).
- `capDepChecks` (l. 71) — Contrôles du déploiement et de l'EPBS. @returns {object[]} Sections
- `capRenderDeploy` (l. 94) — Sous-vue 🖧 Déploiement & EPBS.
- `capDepDetail` (l. 131) — Section « Déploiement / EPBS » du panneau de détail.
- `capDepDashCatalog` (l. 144) — Indicateurs du tableau de bord : déploiement et EPBS.

## 75-excel.js — 75 lignes

- `capExportFormat` (l. 10) — Format courant des exports de tableaux. @returns {'csv'|'xlsx'}
- `capExportToggle` (l. 13) — Bascule CSV ↔ Excel pour les exports de tableaux (⚙ Préférences).
- `capXlsxCol` (l. 16) — Lettre(s) de colonne Excel (0 → A, 25 → Z, 26 → AA). @param {number} i - Indice @returns {string}
- `capXlsxSheetName` (l. 19) — Nom de feuille valide (31 caractères, sans []:*?/\\, unique). @param {string} n - Nom voulu @param {Set} used - Noms déjà pris @returns {str
- `capXlsxBuild` (l. 29) — Construit un classeur .xlsx.
- `capXlsxDownload` (l. 53) — Télécharge un classeur .xlsx. @param {string} name - Nom de fichier @param {Array} sheets - Feuilles (voir capXlsxBuild)
- `capXlsxClasseur` (l. 56) — Classeur Excel de toutes les analyses : une feuille par sujet (éléments, fonctions, échanges, composants, liens, chaînes, exigences, statuts

## 76-historique.js — 116 lignes

- `capHistKey` (l. 15) — Clé de la vue affichée, comme dans le menu ☰ : `@rm` pour la Relation Map, `ana:<sous-vue>` pour 🔬 Analyses.
- `capHistPush` (l. 24) — Consigne une étape (sauf pendant un retour) : les étapes « avant » après la position courante sont oubliées,
- `capHistGo` (l. 36) — Revient à une étape de l'historique (vue, puis diagramme ou élément du détail).
- `capHistNav` (l. 52) — ◀ ou ▶ : étape précédente ou suivante.
- `capHistLabel` (l. 61) — Libellé d'une étape pour la liste : vue (nom du menu), diagramme ou élément.
- `capHistSync` (l. 69) — Met à jour les boutons ◀ ▶ de la barre (grisés aux extrémités, infobulle = étape visée).
- `capHistMenu` (l. 80) — Liste des étapes (clic droit sur ◀ ou ▶) : les plus récentes en haut, l'étape courante marquée.
- `capHistClose` (l. 93) — Ferme la liste des étapes.
- `capHistReset` (l. 96) — Vide l'historique au chargement d'un autre modèle, qui s'ouvre sur 🏠 Accueil (première étape).

## 77-detail-onglets.js — 67 lignes

- `CAP_DET_TABS` (l. 9) — Onglets du panneau de détail, dans l'ordre d'affichage.
- `capDetTab` (l. 21) — Onglet choisi (≡ Tout par défaut ; gardé d'un élément à l'autre, enregistré avec la barre).
- `capDetTabs` (l. 27) — Regroupe les sections du panneau en onglets : l'en-tête (badge, nom, boutons 💬) reste en tête, puis la barre
- `capDetTabsRefresh` (l. 49) — Met à jour la barre d'onglets : nombre de sections de chaque volet, onglet masqué quand son volet est vide
- `capDetTabShow` (l. 63) — Affiche un onglet du panneau (≡ Tout : tous les volets à la suite).

## 78-pagination.js — 76 lignes

- `CAP_PG_SIZE` (l. 9) — Lignes par page.
- `capPaged` (l. 19) — HTML d'une liste ou d'un tableau paginé.
- `capPgRows` (l. 32) — Lignes de la page courante (ou toutes). @param {Object} st - État du bloc @returns {string} HTML
- `capPgBar` (l. 38) — Barre de pagination d'un bloc. @param {Object} st - État du bloc @returns {string} HTML
- `capPgShow` (l. 51) — Affiche une page d'un bloc (ou toutes les lignes) et met la barre à jour ; un filtre par colonne (42) actif est réappliqué.
- `capPgPrune` (l. 63) — Oublie les blocs qui ne sont plus affichés (mémoire).

## 79-scripts-metamodele.js — 8 lignes

- `CAP_MM` (l. 7) — Référentiel réduit du métamodèle Capella (version, préfixes, types, héritage).

## 80-scripts-api.js — 633 lignes

- `capScrNoyau` (l. 20) — Construit le noyau de l'API de scripts : objets publics et exécution. Autonome (aucune autre fonction d'Arcalyse),

## 81-scripts-console.js — 409 lignes

- `CAP_SCR_MAX_SORTIES` (l. 14) — Nombre maximal de sorties affichées (au-delà : sortie tronquée).
- `CAP_SCR_MAX_LIGNES` (l. 16) — Nombre maximal de lignes affichées par tableau (le CSV les contient toutes).
- `CAP_SCR_BASE` (l. 18) — Base du navigateur où la poignée du dossier de scripts partagé est mémorisée (seule donnée hors de la page : une poignée ne se sérialise pas
- `capScrApi` (l. 21) — Noyau de l'API (construit une fois dans la page : exemples, CSV, exécution sans worker). @returns {object}
- `capScrData` (l. 24) — Bloc JSON `cap-scripts-data` de la page : bibliothèque et brouillon. @returns {{bib:object[], brouillon:object|null, hauteur:string}}
- `capScrSave` (l. 29) — Enregistre la bibliothèque et le brouillon dans la page (repris par la 💾 page HTML et 📄 Ouvrir un projet).
- `capScrListe` (l. 37) — Remplit la liste de la bibliothèque.
- `capScrScript` (l. 48) — Script désigné par un choix de la liste. @param {string} choix - 'ex:clé', 'bib:indice' ou 'dos:indice' @returns {{nom:string, code:string}|
- `capScrModifie` (l. 55) — Vrai si le texte de l'éditeur a changé depuis son chargement ou son enregistrement. @returns {boolean}
- `capScrOuvrir` (l. 58) — Affiche un script de la liste dans l'éditeur (après confirmation si le texte en cours a changé). @param {string} choix
- `capScrEnregistrer` (l. 67) — Enregistre le script affiché : dans son fichier (dossier partagé), à sa place (projet), sinon comme nouveau script.
- `capScrSupprimer` (l. 83) — Supprime le script affiché de la bibliothèque du projet.
- `capScrNouveau` (l. 90) — Nouveau script vide.
- `capScrDecoder` (l. 96) — Décode un fichier texte : UTF-8, sinon Windows-1252 (CSV d'Excel). @param {ArrayBuffer} buf @returns {string}
- `capScrImporter` (l. 101) — Importe des fichiers .js dans la bibliothèque du projet ; le premier est affiché. @param {File[]} fichiers
- `capScrTelecharger` (l. 112) — Propose un texte en téléchargement. @param {string} contenu @param {string} nom @param {string} type
- `capScrExporter` (l. 117) — Exporte le script affiché en fichier .js.
- `capScrBase` (l. 121) — Ouvre la base du navigateur (null si indisponible). @returns {Promise<IDBDatabase|null>}
- `capScrDosMemoire` (l. 125) — Lit ou mémorise la poignée du dossier. @param {FileSystemDirectoryHandle} [poignee] @returns {Promise<FileSystemDirectoryHandle|null>}
- `capScrDosAutorise` (l. 131) — Vérifie, et demande si besoin, l'autorisation d'accès au dossier. @param {FileSystemDirectoryHandle} h @param {boolean} ecrire @param {boole
- `capScrDosCharger` (l. 137) — Lit les scripts (.js) du dossier et les place dans la bibliothèque. @param {FileSystemDirectoryHandle} h
- `capScrDosEcrire` (l. 147) — Écrit un script dans le dossier, puis relit le dossier et affiche ce script. @param {string} fichier @param {string} code @param {boolean} n
- `capScrDosBouton` (l. 158) — Bouton 📁 : visible si le navigateur sait ouvrir un dossier ; infobulle selon l'état.
- `capScrDosChoisir` (l. 166) — Bouton 📁 : rouvre le dossier mémorisé, ou en fait choisir un.
- `capScrDosInit` (l. 175) — Retrouve le dossier mémorisé : relu tout de suite si l'autorisation est encore valable.
- `capScrToggle` (l. 186) — Ouvre ou ferme le tiroir des scripts (bascule en mode Capella si besoin). @param {boolean} [ouvrir]
- `capScrEffacer` (l. 196) — Vide la sortie (et libère les fichiers proposés).
- `capScrMorceau` (l. 201) — HTML d'un morceau de sortie : texte, ou lien vers un élément. @param {string|object} m @returns {string}
- `capScrAjouter` (l. 208) — Ajoute un nœud à la sortie (fin gardée visible si l'utilisateur y était). @param {HTMLElement} n
- `capScrLigne` (l. 210) — Affiche une ligne (état, erreur…). @param {string} html @param {string} [classe] @returns {HTMLElement}
- `capScrAfficher` (l. 212) — Affiche un lot de sorties du script. @param {object[]} lot - Messages { k, … }
- `capScrTableau` (l. 226) — Affiche un tableau de sortie (lignes bornées) avec son export CSV. @param {{titre:string, colonnes:string[], cellules:Array}} m
- `capScrDemander` (l. 237) — Pose dans la sortie une question du script et attend la réponse. @param {object} d - Demande { k, question, defaut, items, multiple, accept 
- `capScrAbandonner` (l. 276) — Abandonne les questions encore ouvertes (fin ou arrêt du script).
- `capScrFin` (l. 280) — Fin d'exécution : bilan dans la console. @param {{ok:boolean, erreur?:string, ligne?:number|null, duree:number, sorties:number}} r
- `capScrAllerLigne` (l. 293) — Sélectionne une ligne de l'éditeur. @param {number} n
- `capScrSelection` (l. 300) — Élément « sélectionné » pour le script : celui du panneau de détail affiché. @returns {string[]}
- `capScrUrlWorker` (l. 310) — Code du worker d'un script : prélude (langue, _L, métamodèle), noyau recopié (capScrNoyau), puis le script enveloppé
- `capScrExecuter` (l. 318) — Exécute le script de l'éditeur sur un instantané du modèle affiché.
- `capScrArreter` (l. 352) — Arrête le script en cours.
- `capScrClavier` (l. 354) — Raccourcis de l'éditeur : Tab (indentation), Ctrl+Entrée (exécuter). @param {KeyboardEvent} e
- `capScrGlisser` (l. 359) — Redimensionne le tiroir en glissant sa poignée. @param {PointerEvent} e
- `capScrSetData` (l. 367) — Remplace le bloc `cap-scripts-data` (📄 Ouvrir un projet de travail, 57) et recharge la console. @param {object} d - Bloc { bib, brouillon, 
- `capScrRecharger` (l. 375) — Recharge la bibliothèque et le brouillon depuis la page (ouverture d'un projet).

## 82-scripts-analyses.js — 148 lignes

- `CAP_SCR_RELATIONS` (l. 9) — Relations de 🔗 Liens (CAP_LINK_SECTIONS) → relations publiques de l'API (noms d'Arcature) ; les décompositions ne sont pas reprises (childr
- `capScrSnapshot` (l. 20) — Instantané du modèle affiché pour un script : éléments (attributs compris), relations, diagrammes et leurs éléments.
- `capScrDiagrammes` (l. 35) — Diagrammes du .aird chargé (visionneuse d'Arcature) et, pour chaque élément, les diagrammes qui le montrent ou le ciblent.
- `capScrNettoyer` (l. 61) — Rend un résultat d'analyse transportable et exploitable par un script : copie profonde sans fonctions ni clés privées
- `capScrCellules` (l. 83) — Cellules d'une ligne de contrôle (HTML de capDiagHtml) : texte, ou { $el, name } pour une cellule qui désigne un élément.
- `capScrControles` (l. 95) — Contrôles 🩺 de toutes les vues (ou d'une vue), avec le profil appliqué : lignes parsées depuis le HTML des sections.
- `CAP_SCR_ANALYSES` (l. 107) — Analyses servies aux scripts : nom public → calcul (arguments du script, { $id } pour un élément).
- `capScrAnalyse` (l. 142) — Calcule une analyse demandée par un script (console : requête du worker, ou exécution dans la page).

## 83-fenetre-diagramme.js — 169 lignes

- `capDgwWin` (l. 16) — @returns {Window|null} fenêtre de comparaison, si elle est ouverte
- `capDgwFermer` (l. 19) — Ferme la fenêtre de comparaison (autre .aird ou autre modèle chargé, page quittée).
- `capDgwOuvrir` (l. 26) — Affiche un diagramme dans la fenêtre de comparaison, ouverte au besoin (une seule fenêtre, réutilisée).
- `capDgwPreparer` (l. 49) — Prépare le document de la fenêtre : styles et thème de la page, barre (liste des diagrammes, zoom), zone de dessin, écouteurs.
- `capDgwOptions` (l. 79) — @returns {string} options de la liste des diagrammes (tableaux exclus : pas d'export SVG), groupées par couche
- `capDgwAfficher` (l. 91) — Pose le SVG d'un diagramme dans la fenêtre, cadré sur tout le diagramme.
- `capDgwCadre` (l. 109) — Applique un cadrage (viewBox) au diagramme de la fenêtre.
- `capDgwEchelle` (l. 115) — @param {Window} w @returns {number} pixels d'écran par unité du diagramme (cadrage « meet »)
- `capDgwZoom` (l. 127) — Zoom autour d'un point de la fenêtre (centre de la zone par défaut).
- `capDgwPct` (l. 138) — Met à jour le pourcentage de zoom affiché (100 % = diagramme entier dans la fenêtre). @param {Window} w
- `capDgwContexte` (l. 144) — Clic droit sur un diagramme de l'explorateur de 🔲 Diagrammes Capella : ouvrir ici, dans la fenêtre de comparaison, ses informations.
