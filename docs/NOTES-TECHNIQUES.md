# Notes techniques — Relation Map Capella

Mémoire technique du projet (fonctionnement, choix, pièges). Les règles de travail et la carte des modules sont dans `CLAUDE.md` ; la liste des fonctions par module dans `docs/INDEX-FONCTIONS.md`.
Historique : ce document reprend le fichier « CONSIGNES » utilisé avant le découpage en modules (quand tout était dans un seul fichier HTML). Les références à « grep dans le fichier » valent désormais pour `src/`.

## 1. Le projet

- Application autonome qui charge un `.capella` (XML) localement ; **version Capella uniquement** (pas de SysML, pas d'exemple intégré).
- Utilisée sur **PC sécurisé** : aucune communication réseau. **D3.js v7.9.0 embarqué** (`src/vendor/d3.min.js`, issu de `npm pack d3@7.9.0` → `package/dist/d3.min.js`).
- Livrable : `dist/relation-map-capella-fr.html` (~1,15 Mo, dont D3 ~280 Ko), produit par `node build.js`.
- Une ancienne version bilingue FR/EN (mécanisme `_L()` + `I18N_EN`, rechargement via `window.name`) existe hors de ce dépôt ; elle n'est plus maintenue. Le projet actuel est **français uniquement**.

## 2. Tests

- `node build.js` contrôle la syntaxe de chaque module.
- `node tests/smoke.js` : chargement du modèle de test hors ligne, parcours de toutes les vues et sous-vues, rendu de tous les indicateurs du tableau de bord.
- Modèle volumineux pour les performances : dupliquer le modèle IFE ×12 en réécrivant les identifiants (≈ 65 000 éléments) — chargement attendu ≈ 2,5 s, ouverture du tableau de bord ≈ 3 s.

## 3. Fonctionnement général

1. **Écran d'accueil** (`#cap-welcome`) : glisser-déposer d'un `.capella` n'importe où dans la fenêtre, ou bouton « Parcourir… ». Refus explicite des `.aird`/`.afm`. Redépôt possible à tout moment pour changer de modèle.
2. **Chargement** : `capLoadFile(file)` → parse XML → `capBuildTree` → `capBuildTypeRegistry` → `capInjectToArbo` → `capInjectCapellaRelsToCriteria` → `capInjectLinksToModel` → `capFilterArboToLinked` → `capInjectChainsToModal` → `capApplyPanelOnLoad` → `applyMode('capella')`. Les caches (`_capParentIndexCache`, `_capElementByIdCache`, `_tvCapRowsCache`, `capChainsData`, `capLinksData`) sont remis à zéro à chaque chargement.
3. **Page sauvegardée** : bouton 💾 Page HTML (`capSaveFullPage`) → clone la page avec le XML embarqué et un script d'amorçage qui recharge le modèle à l'ouverture.

## 4. Modes et vues

**Toolbar sur 2 niveaux** : niveau 1 (`#toolbar`) = modes 🗺 Relation Map · 📊 Table View · 🔷 Capella Data (PBS masqué) + onglets Capella Data toujours visibles dès qu'un modèle est chargé (clic = bascule en Capella Data) ; niveau 2 (`#toolbar2`) = commandes Relation Map (zoom, fit, ouvrir/fermer, Nums, Légende, Relations, Noms, Unique, Compact), visible seulement en mode graphe.

**Vues Capella Data** (`capCurrentView`, routage dans `capRenderCurrentView`) :

| Onglet | Rendu | Contenu |
|---|---|---|
| 🌳 Arborescence | `capRenderTreeNode` | Arbre du modèle |
| ▦ Cartes | — | Éléments groupés par couche ARCADIA |
| 📋 Tableau | `capRenderTable` / `capRenderTableBodyOnly` | Colonnes paramétrables, filtres, colonnes Metachain, sauvegarde de vue JSON |
| 🔗 Liens | `capComputeLinks` | Relations Capella |
| ⚡ Chaînes | `capRenderChains` | Voir §6 |
| 🔌 Physical Link | `capComputePhysLinks` / `capRenderPhysLink` | Vues Ligne / Composant / ▦ Matrice / 🩺 Contrôles ; CE alloués (`ComponentExchangeAllocation`), CP alloués aux ports physiques (`ComponentPortAllocation`), acteurs ; filtre avec/sans CE ; exports CSV/HTML |
| 🔀 Component Exchange | `capComputeCompExchanges` / `capRenderCompExchange` | Orientation des ports UNSET/IN/OUT/INOUT (`capNormOrient`), sens effectif fwd/rev/bi/unset (`capCexDirection`, délégations gérées), kind, FE alloués, Exchange Items, PL porteurs ; vues Ligne / Composant / ▦ Matrice / 🩺 Contrôles (ports orphelins, CE sans FE, incohérences, CE PA non alloués) |
| 🧩 Ports | `capComputePortLinks` / `capRenderPorts` | Traçabilité Function Port ↔ Component Port ↔ Physical Port (`PortAllocation`, `ComponentPortAllocation`) ; vues Traçabilité / Par composant / 🩺 Contrôles (ports non alloués, sens incohérents, alignement FE↔CE et CE↔PL avec fermeture des délégations) ; cache `_capPortsCache` |
| 🔬 Analyses | `capRenderAnalyses` (sous-vues `capAnaSub`) | ƒ Fonctions (`capComputeFunctions`, qualité des noms `capNameQuality`/`capFnNQ` avec `CAP_EN_VERBS`, `CAP_FR_VERBS`, règles perso `capNameRules` dans `<script id="cap-name-rules">`, `capFnMetrics`, `capFnChecks`, `capRenderFunctions`, dossier `capFnDossierHtml`, descriptions via `capHtmlToText`) · 🧬 Traçabilité (`capComputeTrace`, `capTraceCoverage`, `capTracePaths` ; catégories `CAP_TRACE_CATS`) · 🎯 Capacités & missions (`capComputeCapabilities`) · 🔁 Modes & états (`capComputeStates`, `capStateChecks`, `capStateDiagramSvg`) · ⚖ Comparaison de versions (`capDiffIndex`, `capDiffCompute`, `capDiffDoc`). Caches `_capAnaCache`, remis à zéro par `capAnaReset()` au chargement. Calculs génériques : aucune hypothèse sur un modèle particulier |
| 📖 Index des types | `capRenderIndex` / `capRenderIndexBody` | Types présents : Human Type, description, nombre |

**Panneau de détail** (`capOpenDetail(id)`) : Human Type + description, attributs, références sortantes, **références entrantes (navigation inverse)**, Owner, Owned elements — tout est cliquable.

## 5. Moteurs Metachain (colonnes personnalisées)

Chaînes de navigation Metaclass → Property, façon MagicDraw.

- **Tableau Capella** : `capGetMetachainProperties`, `capResolveStep`, `capResolveMetachain`, `capExtractValue`. Types de propriétés : terminales (Name, ID, Type, Human Type, attributs), `owner`, `owned`, `via` (intermédiaire), relations Capella, `attr` (référence sortante), `incoming` (référence entrante).
- **Table View** : équivalents préfixés `tv…`, calculés sur le jeu complet `tvAllRows()` (tous les éléments du fichier, pas seulement ceux injectés dans l'arborescence) ; attributs via `tvRowAttrs(el)`.

## 6. Vue ⚡ Chaînes (dernier chantier)

- `capComputeChains()` produit pour chaque chaîne un **graphe** `{nodes, edges}` : plusieurs entrées, sorties et ramifications. Types : `FunctionalChain`, `OperationalProcess` (même structure XML), `PhysicalPath` (via `nextInvolvements` ; les liens physiques deviennent les étiquettes).
- Chaque nœud porte `kind` : `actor` (bleu), `system` (vert), `none` (gris), déduit des `ComponentFunctionalAllocation` et de l'attribut `actor="true"` (`capBuildFunctionAllocationIndex`, `capIsActorEl`).
- Catégorie `chain.layer` (OA/SA/LA/PA/EPBS) par remontée jusqu'à l'architecture parente (`CAP_CHAIN_ARCH`).
- `capChainLayout(graph)` : disposition en couches (cycles → arêtes « retour », nœuds fictifs sur arêtes longues, barycentres).
- Sous-vue **▦ Diagrammes** : cartes groupées par catégorie ; diagramme style Capella haut → bas (`capChainDiagramSvg`), entrées/sorties, table des échanges.
- Sous-vue **🗺 Vue Relation Map** (`capRenderChainMap`) : liste groupée par catégorie + graphe D3 (zoom) ; réglages `capChainMapOpts` : disposition LR / TB / RL / radiale / zigzag, ⬡ Compact, ✂ Noms ; bouton d'injection dans la Relation Map principale (`capShowChainInMap`).
- Filtres : type (`capChainsFilter`) et catégorie (`capChainsLayerFilter`).
- Carte ouverte : tables Fonctions impliquées / Functional Exchanges impliqués (`capChainTables` : ordre du flux, rôle entrée/sortie, allocataire, Exchange Items, CE porteur) ; arêtes enrichies `items` / `alloc`.
- Export (`capChainExportOpts`) : cadre + onglet `[FC] Nom` + cartouche + légende + description (`capChainFramedSvg`) ; PNG / SVG / copier / CSV par carte ; export groupé (sélection par cases à cocher, `capChainsSelection`) en PDF (sommaire, planche par chaîne, annexes paginées `capChainAnnexPages`, signets — `capPdfBuild`) ou ZIP PNG/SVG (+ CSV si annexes — `capZipBuild`). Aucune bibliothèque.

## 6 bis. Vue chaîne de la Relation Map

- `capShowChainInMap(chain)` → `S.chainView` ; `render()` délègue à `renderChainView` (couches `capChainLayout`, LR/TB/RL), bandeau `rmChainBanner`, surbrillance `rmHighlight`, cadrage `S._chainBounds` dans `fitView`. `setCtx` quitte la vue chaîne. Plus d'éléments temporaires `_capViz`.
- Panneau Types d'éléments : seulement les types présents dans `MODEL.elements` (hors `_capViz`) + types créés à la main, triés par couche, avec compteur.

## 7. Arborescence (panneau gauche)

- Repliée par défaut au chargement (seul le paquetage projet est ouvert) — `capApplyPanelOnLoad`.

- Sélection multiple : Ctrl/Cmd+clic, Maj+clic (`arboMultiSel`) ; glisser-déposer de groupe en conservant la hiérarchie (`arboMoveEls`).
- Clic droit : 📋 coller une liste (1 ligne = 1 élément enfant, texte ou Excel — `arboParseClipboardList`, `arboPasteListInto`) ; 🔄 Convert to… (changement de type en masse, `arboConvertSelectedType`). Ctrl+V fonctionne aussi sur un élément sélectionné.

## 8. Repères techniques

- Thèmes : `THEMES`, `applyTheme(name)`, `currentTheme` (`'light'` est le seul thème clair). Les vues Physical Link / Component Exchange se re-rendent au changement de thème.
- Couleurs ARCADIA : `CAP_LAYERS` ; noms lisibles et descriptions des types : `CAP_HUMAN_NAMES`.
- Échappement HTML : `capEsc` ; lecture XML : `capTName`, `capXId`, `capXName`.
- Rapports HTML autonomes : `capHtmlReport` (onglets, recherche, matrice cliquable via `data-lid`, CSS repris par `capReportCss`, nettoyage `capReportClean`) — utilisés par Component Exchange et Physical Link (`exportHtml(all)`, vue courante ou toutes les vues) et par les Chaînes (`capChainExportHtml`, sans la vue Relation Map). Attention : écrire `<\/script>` dans les gabarits.
- Outils partagés : `capArchLayerOf`, `capBuildIdMap`, `capCsvDownload`, `capMatrixBuild` (N²), `capDiagHtml` (rapports de contrôles), `capDetLink`, `capOrientBadge`.
- Performance (gros modèles) : pipeline de chargement dans `capRunBulk` (buildPanel/buildArbo différés, un seul rendu) ; `buildArbo` indexe parent → enfants et ne construit pas les branches repliées ; `capFilterArboToLinked` et `capInjectChainsToModal` indexés. Mesure : modèle ×12 (65 000 éléments) chargé en ~2,5 s au lieu de ~230 s. Proscrire `MODEL.elements.filter(...)` dans une boucle sur les éléments.
- Analyses calculées à l'ouverture (rapides), résultats en cache `_capAnaCache`, bouton ↻ Recalculer.
- Exigences / PVMT / données / contraintes (`39-exigences-donnees.js`) : les éléments du Requirements Viewpoint n'ont pas d'attribut `name` → `capXName` et `capGetAttrs` se rabattent sur `ReqIFLongName` / `ReqIFName`. PVMT : un groupe appliqué (PVG posé sur l'élément) pointe sa définition par `appliedPropertyValueGroups` ; à défaut, rattachement par le nom « Domaine.Groupe ». Valeur absente = valeur par défaut EMF (0, false, vide), signalée ○. Applicabilité lue dans `[CLASS]…[/CLASS]` / `[ARCHITECTURE]…` de la description de la définition, par type exact (la classe `core/requirement/Requirement` couvre les exigences Capella de base) ; groupes à `[CONDITION]` exclus du contrôle.
- Hauteur « jusqu'en bas » : attribut `data-fill` + `capFillHeight()` (appelé après rendu et au redimensionnement).
- Thèmes : `capIsLight()` pour les thèmes clairs (light, office2007) ; `html[data-theme=…]` pour les styles propres à un thème.
- Hiérarchie ƒ Fonctions : séparateur glissable `.ana-fn-rsz` entre arbre et fiche (largeur gardée dans `st.splitW`, double-clic = défaut).
- ƒ Fonctions : filtre « Allocation » (puces 🧩 Système / 👤 Acteurs / ∅ Non allouées, `st.ak`, double-clic = solo) sur Hiérarchie et Tableau ; nature calculée par `capFnAllocKind(f)` ('sys'|'act'|'mix'|'none'|'parent'), libellés/couleurs `CAP_FN_AK` ; liserés `.ak-*`, colonne `akind`. Liste « Allocataire » (`st.who`, sous-composants inclus) construite depuis `alloc[].anc` (ancêtres calculés par `capCompAncestors` : imbrication XML puis Parts) ; colonne `subsys` (`capFnSubsystems`) masquée automatiquement en boîte noire. Version de travail courante : `relation-map-capella-fr.html` (français seul, sans i18n).
- Chaînes : filtre de contenu `capChainsEmptyFilter` ('all'|'full'|'empty'), `capChainIsEmpty(c)` (graphe sans nœud ni arête), appliqué dans `capChainsFiltered` et dans les compteurs.
- 📐 Tableau de bord (Analyses › `dash`, `capRenderDashboard`) : catalogue `capDashCatalog()` (entrées {g,id,l,kind:'n'|'pct'|'series'|'multi'|'table'|'text',f}), valeurs `capDashValue` en cache dans `_capAnaCache` ; rendu SVG `capDashDraw(w,m,W,H)` aux dimensions réelles ; palette `CAP_DASH_PAL` (ordre fixe, clair/sombre) ; représentations `CAP_DASH_VIZ` ; éditeur `capDashEditor` ; stockage `capDashStore` dans `<script id="cap-dashboards" type="application/json">` (repris par la 💾 Page HTML). **Tout nouvel indicateur d'analyse doit être ajouté au catalogue**, avec un libellé qui nomme le sujet (« Fonctions SA — … », « Traçabilité — … »). Le rendu doit tenir dans le cadre (`.dash-wb` en `overflow:hidden`) : lignes/barres en surplus regroupées en « Autres », tableaux tronqués avec « … et N autre(s) ligne(s) » ; test automatique de débordement sur toutes les combinaisons indicateur × représentation × taille.
- Vue 🔗 Liens : boutons et en-têtes avec `humanLabel` (+ nombre), relations absentes masquées ; types techniques (`relType`) en infobulle et en pastilles.
- `CAP_LINK_SECTIONS` : 34 relations ; champs `grp` (groupe de la barre, `CAP_LINK_GROUPS`), `srcT`/`tgtT` (pastilles quand `relType` porte un préfixe « Xxx: »), `via` (élément porteur : FE/CE/PL, `r.via` dans les lignes). `E()` renseigne `type` (utilisé par les Metachain `capGetMetachainProperties`). Les nouvelles relations sont aussi injectées dans la Relation Map (masquées par défaut). Recherche/ID de la vue : `capLinksQuery`, `capLinksShowIds` (le corps est re-rendu seul pour garder le focus).
- Cartouches `.phl-line` (🔌 Physical Link, 🔀 Component Exchange) : `align-items:stretch`, couleur du composant en bordure via `--phl-c`, cellule droite `.phl-cell-r` ; noms en `capTextOn`.
- Thème par défaut : **Sombre** (`applyTheme('dark')`). Couleurs de statut en variables `--c-warn/--c-ok/--c-err` (assombries en thème clair) ; `capInk(bg)` choisit le texte noir/blanc le plus contrasté (bandeaux de type de la Relation Map) ; `capTextOn(c)` assombrit un texte coloré en thème clair (libellés d'arêtes).
- Barre `#cap-sub-toolbar` + `#cap-result-count` masquées dans les vues qui ont leurs propres filtres (analyses, dashboard, links, chains, physlink, compex, ports) — `capUpdateToolbarForView`.
- Groupes de commandes : classe `.tb-grp` (cadre arrondi) + `.tb-grp-l` (libellé) ; compteur filtré `.ana-fn-cnt` (« **n** / total »). Appliqués à ƒ Fonctions, ⚡ Chaînes, 📐 Tableau de bord.
- Tableau ƒ Fonctions : filtre par valeurs façon Excel (`openVF`, `st.colV`, colonnes `multi` éclatées), option À plat (`st.flat`), sélection de cellules (`st.selC` « ligne:col », clic-glisser / Ctrl / Maj) et copie tabulée (`copySel`, Ctrl+C).
- 📐 Tableau de bord : onglet Capella à part (`cap-v-dashboard` / `cap-view-dashboard`), impression A4 `capDashPrint(dash, byId, orient)` via iframe `srcdoc`.
- Vérification des noms : ≈ 1 000 verbes anglais (`CAP_EN_VERBS`), verbes français irréguliers complétés.
- Menu ✏ Éditer masqué (`#b-edit-wrap` en `display:none`). Ctrl+S = 💾 Enregistrer direct de la page (`capSavePageDirect`, API File System Access, poignée gardée pour la session ; repli téléchargement). Thème Office 2007 : version d'origine (ruban dégradé, survol doré).
- Contraste en thème clair (02-themes.js) : correcteur global plutôt que vue par vue. `capContrastCss()` génère des surcharges pour les `color:#…` fixes des feuilles de style (`<style id="cap-contrast-css">` placé avant la feuille principale : les règles manuelles `html[data-theme=…]` restent prioritaires) ; un `MutationObserver` passe `capFixContrast` sur les `style="color:…"` posés par le JS (fond effectif calculé avec les transparences, original dans `data-c0`, restauré par `capRestoreContrast` au retour en sombre). Les textes SVG (`fill`) ne sont pas traités. Dans une ligne de tableau, la couleur est aussi rendue lisible sur le fond de survol / sélection (accent ≈ 12 %) ; en thème clair, survol et sélection des tableaux sont éclaircis.
- Thèmes clairs : attribut `data-tone="light"` posé par `applyTheme` (règles communes, y compris thème personnalisé clair). `applyTheme` retire les variables posées par le thème précédent. 🎨 Thème personnalisé (module 38) : `THEMES.custom` déclaré par `capThemeRegister` ; `capThemeLayersApply` ne fait rien avant le chargement du module 38 (`var _capThemeReady`, l'appel d'initialisation du module 11 précède `CAP_LAYERS`).
- 🔄 Suivi du fichier (`40-suivi-fichier.js`) : relecture via `FileSystemFileHandle` (Edge/Chrome : `showOpenFilePicker`, `getAsFileSystemHandle` au dépôt) ; sans accès direct, un `File` de `<input>` modifié sur disque lève `NotReadableError` à la lecture (Chrome) → seul signal possible, il faut resélectionner. Chargement factorisé dans `capApplyXmlDoc` (aussi utilisé pour appliquer une mise à jour). Les deltas gardés en mémoire sont allégés (`capWatchLite`, sans nœuds XML) pour ne pas retenir les versions intermédiaires ; seuls la version d'ouverture et la précédente sont conservées.
- Sélecteur `showOpenFilePicker` : peut être bloqué (stratégie du poste, page intégrée) ; il consomme alors l'autorisation du clic et un `input.click()` de repli est ignoré → `_capPickerKo` bascule sur le sélecteur classique (appelé sans attente) et un message invite à recliquer. Le glisser-déposer ne dépend jamais de `getAsFileSystemHandle` (repli après 1,5 s).
- ƒ Fonctions : vue principale `cap-view-functions` (`capRenderFunctionsView`), retirée des sous-vues de 🔬 Analyses.
- Pièges déjà rencontrés : variables `let`/`const` utilisées avant leur déclaration (zone morte) ; parsers d'accolades trompés par les regex et les template literals ; éléments placés dans `#graph` invisibles en Table View (utiliser `#main`).

## 9. À faire / en suspens

- [x] Aide (?) réécrite pour la version Capella (onglets : Démarrage, Interface, Relation Map, Table View, Capella Data, Chaînes, Interfaces & ports, Analyses, Cas d'usage) ; `openHelpModal(tab)` ouvre un onglet précis ; bouton ❓ Aide + lien sur l'écran d'accueil (`#cw-help`, `#cw-help-link`).
- [x] D3 v7.9.0 ré-embarqué ; aide mise à jour (🚀 Démarrage › Sécurité et fonctionnement hors ligne). Vérifié dans Chromium en mode hors ligne : aucune requête réseau, page sauvegardée comprise.
- [x] Version anglaise + sélecteur 🌐 FR/EN (§ 11).
- [ ] Mettre à jour le catalogue des fonctions (Excel/Word) si besoin : il date d'avant les derniers chantiers.

## 10. Relations Relation Map (`CAP_LINK_SECTIONS`)

- 20 relations ; `relType` = clé technique inchangée, `humanLabel` = libellé français affiché (forme « Sous-… » pour les décompositions, « → (réalise) » pour les allocations).
- Corrigé : Entity→OperationalActivity via `ComponentFunctionalAllocation` ; implications via Part résolues. Ajouté : CapabilityRealization→PhysicalComponent, OperationalCapability→Entity, Mission→SystemComponent, Mission→Capability.
- Panneau Critères : relations Capella sans occurrence non listées, compteur par relation.


## 11. Langue FR / EN

- Langue source : **français**. `capLang` ('fr'|'en') est lu dans `window.name` (état `{capRM:1, capLang,…}`), sinon `html[data-lang]`, sinon 'fr'. Bloc « 0. LANGUE » en tête du script applicatif.
- Libellés du script : `_L('texte français')` → `I18N_EN` (≈ 860 entrées). **Toute nouvelle chaîne affichée** doit passer par `_L(...)` et être ajoutée à `I18N_EN`. Nom `_L` (et non `L`, déjà utilisé localement pour `capDetLink`). Ne jamais envelopper une valeur servant de clé ou de comparaison.
- Pluriels : ne pas ajouter de « s » aux adjectifs en anglais (`capLang!=='en'?'s':''`).
- HTML statique : `capI18nStatic(root)` traduit textes, `title`, `placeholder` via `CAP_STATIC_EN`, dans les deux sens (page sauvegardée dans l'autre langue). Nouveau texte statique → ajouter à `CAP_STATIC_EN`.
- Aide : `<template id="help-fr">` et `<template id="help-en">` copiés dans `#help-body` au démarrage (`capI18nInit`). Modifier **les deux** gabarits.
- Descriptions de types en anglais : `CAP_HUMAN_DESC_EN` (surcharge `CAP_HUMAN_NAMES[t].d`).
- Changement de langue : `capSetLang(l)` sérialise le modèle, le mode, la vue et le thème dans `window.name` puis recharge ; `capI18nRestore()` recharge le modèle (`window.capSkipEmbedded` empêche le bootstrap de page sauvegardée de charger son propre XML). Testé avec le modèle ×12 (18 Mo) : ~7 s.
