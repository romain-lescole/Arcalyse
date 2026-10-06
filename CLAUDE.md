# CLAUDE.md — Relation Map Capella

Application **autonome et 100 % hors ligne** qui charge un fichier `.capella` (XML Capella / ARCADIA) dans le navigateur pour l'explorer, l'analyser, le contrôler et l'exporter. Le livrable est **un seul fichier HTML** (`dist/relation-map-capella-fr.html`) utilisé sur un **PC sécurisé sans réseau**. Les sources sont découpées dans `src/` et réassemblées par `build.js`.

## Règles impératives

1. **Ne jamais modifier `dist/`** : on modifie `src/`, puis on lance `node build.js`. Le build doit afficher `✔` ; s'il refuse (syntaxe, `</script>` non échappé, ressource externe), corriger avant de rendre la main.
2. **Hors ligne absolu** : aucune ressource externe (CDN, police, image distante, `fetch` réseau). D3 v7.9.0 est embarqué dans `src/vendor/d3.min.js` — **ne jamais le lire ni le modifier** (≈ 280 Ko).
3. **Français partout** : interface, messages, commentaires, et **JSDoc en français pour toute nouvelle fonction** (couverture actuelle 100 %).
4. **Réponses courtes**, en français : ce qui a changé, en quelques lignes.
5. **Lecture ciblée** : chercher avec `grep`/recherche dans `src/js/` ou consulter `docs/INDEX-FONCTIONS.md`, puis lire seulement les lignes utiles. Ne pas lire un module entier sans nécessité.
6. **Vérification par défaut = `node build.js`** (syntaxe de chaque module). Test navigateur (`node tests/smoke.js`) seulement si l'utilisateur le demande ou après un gros changement transversal. **Pas de capture d'écran** sauf demande.
7. Ne rien supprimer ou renommer de visible sans le signaler. Ne pas committer sans demande ; proposer un message de commit en fin de tâche.
8. **Textes** : l'interface est en français ; tout libellé affiché reste écrit en clair dans le code (pas de clés). Après des changements de libellés, régénérer l'inventaire `node tools/textes.js` (ou `--en`). Pour l'anglais, suivre `docs/i18n/LISEZMOI.md` (démarche `_L()` + traduction au build, pièges connus) — ne pas improviser une autre méthode.
9. **Ne jamais modifier `livraison/`** sauf si l'utilisateur demande explicitement une livraison (`node build.js --livraison`).
10. Après ajout/déplacement de fonctions : `node tools/index.js` (régénère l'index). Après un changement visible : mettre à jour l'aide `src/html/aide.html`. Décision technique notable : une ligne dans `docs/NOTES-TECHNIQUES.md`.

## Architecture du code

- Les modules `src/js/*.js` sont **concaténés dans l'ordre de `src/index.html`** en **un seul `<script>` classique** (portée globale partagée, `'use strict'` en tête du module 01). Pas d'`import`/`export`, pas de bundler.
- Les `function` sont hissées sur tout le script : l'ordre n'importe que pour le code exécuté au chargement (`const`/`let` de premier niveau, appels d'initialisation). Une constante utilisée **au chargement** par un module doit être définie dans un module **antérieur**.
- Chaque module commence et finit sur une frontière d'instruction de premier niveau (le build vérifie la syntaxe module par module).
- Nouveau module : créer `src/js/NN-nom.js` **et** ajouter `@@INCLUDE js/NN-nom.js@@` à la bonne place dans `src/index.html`.
- Dans les gabarits HTML générés par le JS (rapports, impression), écrire `<\/script>`.

| Fichier | Contenu principal |
|---|---|
| `src/index.html` | Squelette : `<head>`, inclusions, ordre des modules |
| `src/css/styles.css` | Styles et variables de thème (`--c-*`, statuts `--c-warn/ok/err`), surcharges `html[data-theme=…]` |
| `src/css/aide.css` | Styles de la fenêtre d'aide |
| `src/html/interface.html` | Barres d'outils, panneaux, écran d'accueil, vues Capella Data (conteneurs `#cap-view-*`), modales |
| `src/html/aide.html` | Aide utilisateur (onglets `ht-*`) |
| `js/01-donnees-config.js` | `CAP_HUMAN_NAMES` (noms lisibles + descriptions des types), `MODEL`, `RCFG`, `TCFG`, `MODES` |
| `js/02-themes.js` | `THEMES`, `applyTheme`, `capIsLight`, `capInk`, `capTextOn`, `applyMode` |
| `js/03…07-rm-*.js` | **Relation Map** (graphe D3) : état `S`, SVG/zoom, marqueurs, arbre, rendu `render`, vue chaîne, interactions, export image, légende, panneau gauche (critères) |
| `js/08-editeur-modele.js` | Modale d'édition (éléments, relations, paquetages) |
| `js/09-arborescence.js` | Arborescence du panneau gauche (`buildArbo`, sélection multiple, collage) |
| `js/10-table-view.js` | **Table View** : onglets, moteur Metachain `tv…`, constructeur de colonnes |
| `js/11-sauvegarde-toolbar-init.js` | Sauvegarde/chargement JSON, gestionnaires de la barre, raccourcis, initialisation (`applyTheme('dark')`) |
| `js/20-capella-chargement.js` | Moteur Capella : `capLoadFile`, parsing XML, `capBuildTree`, registre des types, injection dans la Relation Map, `capSaveFullPage`, écran d'accueil |
| `js/21-capella-vues-base.js` | Barre latérale, ▦ Cartes, 📋 Tableau Capella (colonnes, Metachain `cap…`), 🌳 Arborescence |
| `js/22-capella-liens.js` | `CAP_LINK_SECTIONS` (20 relations, `humanLabel`), `capComputeLinks`, vue 🔗 Liens |
| `js/23-chaines.js` | ⚡ Chaînes : `capComputeChains` (graphe), filtres type/couche/contenu, cartes, vue Relation Map |
| `js/24-chaines-export.js` | Exports des chaînes : PNG/SVG/presse-papiers, PDF écrit à la main, ZIP, HTML |
| `js/25-panneau-detail.js` | Panneau de détail (`capOpenDetail`), routage des vues (`capUpdateToolbarForView`) |
| `js/26-rapports-html.js` | Rapports HTML autonomes `capHtmlReport` |
| `js/27-interfaces-calculs.js` | Outils partagés (`capArchLayerOf`, `capCsvDownload`, `capMatrixBuild`, `capDiagHtml`…), `capComputeCompExchanges`, `capComputePhysLinks` |
| `js/28-index-types.js` | 📖 Index des types |
| `js/29-physical-link.js` | 🔌 Physical Link (vues, matrice, contrôles, exports) |
| `js/30-ports.js` | 🧩 Ports (`capComputePortLinks`, traçabilité FP ↔ CP ↔ PP, contrôles) |
| `js/31-analyses-traca-capacites.js` | 🔬 Analyses : `_capAnaCache`, `CAP_ANA_LAYERS`, 🧬 traçabilité inter-couches, 🎯 capacités & missions |
| `js/32-analyses-etats-comparaison.js` | 🔁 Modes & états, ⚖ comparaison de versions |
| `js/33-qualite-noms.js` | Qualité des noms : `CAP_EN_VERBS` (≈ 1 000), `CAP_FR_VERBS`, `capNameQuality`, `capFnNQ`, règles perso |
| `js/34-fonctions.js` | ƒ Fonctions (`capComputeFunctions`, allocation `capFnAllocKind`/`capCompAncestors`, `capRenderFunctions` : hiérarchie, tableau façon Excel, traçabilité, métriques, contrôles, dossier ; vue principale `capRenderFunctionsView`), `capFillHeight`, `capRenderAnalyses` |
| `js/35-tableau-de-bord.js` | 📐 Tableau de bord : catalogue `capDashCatalog`, rendu SVG `capDashDraw`, éditeur, stockage, impression A4 |
| `js/36-component-exchange.js` | `capAnaReset`, 🔀 Behavior Exchange (vue `compex` : CE de la PA entre Physical Components Behavior, `capBehaviorExchanges`) |
| `js/37-capella-cablage.js` | Câblage final (détail par id, redimensionnement de la barre latérale) |
| `js/39-exigences-donnees.js` | 🔬 Analyses : 📑 Exigences (`capComputeRequirements`), 🏷 Propriétés PVMT (`capComputePvmt`), 🗃 Données & interfaces (`capComputeDataModel`), ⛓ Contraintes ; sections du panneau de détail (`capXtDetail`), indicateurs du tableau de bord (`capXtDashCatalog`) |
| `js/38-theme-perso.js` | 🎨 Thème personnalisé : éditeur `capThemeEditor`, stockage `cap-theme-custom`, couleurs des couches `capThemeLayersApply` |
| `js/40-suivi-fichier.js` | 🔄 Suivi du fichier `.capella` : `_capWatch`, détection (`capWatchCheck`, accès direct `showOpenFilePicker`), delta cumulé / pas à pas, `capWatchApply`, historique |
| `js/41-barre-vues.js` | ☰ Barre des vues : catalogue `CAP_NAV_ITEMS`, menus groupés, épingles, menu ☰ / Ctrl+K (`capNavRender`, `capNavOpen`), réglage `cap-toolbar` |
| `js/42-tableaux-analyses.js` | 🔬 Tableaux des analyses : ligne de filtres par colonne et largeur des colonnes ajoutées automatiquement (`capTfEnhanceAll`, observateur `capTfWatch`), état `_capTfState` |
| `js/47-composants.js` | 🧱 System Component (SA) / 🧱 Logical Component (LA) : `capComputeComponentBlocks`, `CAP_CB_LAYERS`, `capCbChecks`, indicateurs `capCbDashCatalog`, vue `capRenderComponentBlocks(L)` (Blocs à ports UNSET/IN/OUT/INOUT, Composant, Ligne, Matrice ≤ 100, Contrôles ; pagination par 100) |
| `js/46-config-interface.js` | ⚙ Interface et vues : `CAP_CFG_PARTS`, `capCfgGet`/`capCfgSet`, fichier .json (`capCfgDialog`, `capCfgLoadFile`), bloc page `cap-ui-views` (`capCfgStoreViews`/`capCfgRestoreViews` : 📋 Tableau, 📊 Table View, thème), `capCfgLoadUpdate` |
| `js/45-comparaison-rapport.js` | ⚖ Rapport de comparaison : 8 catégories `CAP_DR_CATS`, familles `CAP_DR_FAMS`, rattachement technique `capDrBuild`, niveaux et formats (`capDrRichHtml`, `capDrText`, `capDrTable`, `capDrMarkdown`), copie `capDrClipboard`, vue `capDrRender` |
| `js/44-functional-exchange.js` | ⇆ Functional Exchange : `capComputeFunctionalExchanges`, `capFexChecks`, indicateurs `capFexDashCatalog`, vue `capRenderFunctionalExchange` (Ligne, Fonction, Blocs à pins façon Capella, Matrice ≤ 100, Contrôles ; pagination par 100) |

Textes : inventaire **`docs/TEXTES.md`** ; traduction : **`docs/i18n/`**. Détails fonctionnels et pièges connus : **`docs/NOTES-TECHNIQUES.md`** (à lire quand on touche une zone). Liste des fonctions par module : **`docs/INDEX-FONCTIONS.md`**.

## Conventions utiles

- Thèmes clairs : `html[data-tone="light"]` (Office 2007, Clair, personnalisé clair) pour les règles communes ; un correcteur automatique fonce les textes colorés trop pâles (voir NOTES-TECHNIQUES).
- Couleurs : toujours via les variables CSS (`var(--c-text)`, `var(--c-dim)`, `var(--c-warn,#e3b341)`…). Texte sur fond coloré : `capInk(fond)`. Texte coloré sur le fond du thème : `capTextOn(couleur)`. Thème par défaut : Sombre — vérifier le contraste en clair **et** en sombre.
- Hauteur « jusqu'en bas » d'un bloc : attribut `data-fill="6"` + appel `capFillHeight(conteneur)` après rendu.
- Groupes de commandes dans une barre : `<span class="tb-grp">…</span>` (libellé facultatif `.tb-grp-l`) ; compteur filtré : `.ana-fn-cnt`.
- Les analyses sont mises en cache dans `_capAnaCache` (vidé par ↻ Recalculer et au chargement d'un modèle).
- Tout nouvel indicateur calculé doit être ajouté au catalogue du tableau de bord (`capDashCatalog`, libellé nommant le sujet : « Fonctions SA — … »), et son rendu doit tenir dans le cadre.
- Données persistées dans la 💾 Page HTML : blocs `<script type="application/json">` créés à l'exécution (`cap-name-rules`, `cap-dashboards`, `cap-theme-custom`, `cap-toolbar`, `cap-ui-views`) — pas de `localStorage`. Nouveau réglage d'interface : l'ajouter à `CAP_CFG_PARTS` (46) pour qu'il s'enregistre et se recharge.

## Commandes

```
node build.js                 # assemble dist/relation-map-capella-fr.html (avec repères @@BEGIN/@@END) + contrôles
node build.js --no-markers    # version sans repères (livraison « propre », identique octet pour octet à l'original découpé)
node build.js --livraison     # version livrée, sans repères → livraison/relation-map-capella-fr.html (versionnée ; sur demande explicite uniquement)
node tools/index.js           # régénère docs/INDEX-FONCTIONS.md
node tools/textes.js [--en]   # inventaire de tous les textes affichés → docs/TEXTES.md + docs/textes.csv (colonne anglaise avec --en)
node tools/split.js f.html    # réimporte dans src/ un fichier assemblé AVEC repères (modifié ailleurs) ; --dry pour simuler
node tests/smoke.js [m.capella]   # test navigateur hors ligne (nécessite : npm i -D playwright && npx playwright install chromium)
```
Modèle de test : `tests/models/In-Flight_Entertainment_System.capella` (exemple public Capella ; d'autres modèles doivent fonctionner — aucun calcul ne doit supposer un modèle particulier).
