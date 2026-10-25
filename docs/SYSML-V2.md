# 🧩 SysML v2 dans Arcalyse

Arcalyse lit un modèle **SysML v2** en notation textuelle (fichier `.sysml`, archive `.kpar`, dossier de `.sysml`) grâce au **lecteur SysML v2 autonome d'Arcature**, le projet frère (licence Apache 2.0, comme Arcalyse). Le lecteur est embarqué dans la page comme la visionneuse de diagrammes Capella : hors ligne, en lecture seule (il n'écrit jamais rien).

## D'où vient le lecteur, comment le régénérer

| Fichier | Rôle |
|---|---|
| `src/vendor/arcature-lecteur-sysml.js` | Lecteur, libellés français (≈ 330 Ko, vues calculées comprises) |
| `src/vendor/arcature-lecteur-sysml-en.js` | Même lecteur, libellés anglais (version `--lang en` ; les deux dans la version `multi`, choisis au chargement) |
| `src/vendor/LISEZMOI-lecteur-sysml.md` | **Note d'origine** : dépôt, branche, commit, date, commande (réécrite à chaque reprise) |

Ces fichiers sont **tiers** : ne jamais les modifier à la main (ni les lire en entier : ≈ 254 Ko chacun). Pour les mettre à jour :

```
git clone https://github.com/romain-lescole/Arcature ../Arcature      # ou une autre branche / un autre dossier
node build.js --lecteur-sysml ../Arcature                               # assemble le lecteur dans Arcature s'il manque (node build.js --lecteur-sysml [--lang en]), copie fr + en, réécrit la note
node build.js && node build.js --lang en && node tests/sysml.js && node tests/oracles.js
```

Le dossier d'Arcature se donne en argument ou par la variable `ARCATURE` (défaut : `../Arcature`). Côté Arcature : `docs/LECTEUR-SYSML.md` (mode d'emploi, API), `docs/api/lecteur-sysml.d.ts` (contrat typé), `tests/lecteur-sysml.js`.

## Comment le lecteur est branché (`src/js/87-sysml.js`)

Arcalyse est bâti sur un **document XML Capella** (`cap_xmlDoc`, éléments à `xsi:type`, références « #id » dans les attributs) ; tout le reste (arbre, cartes, tableau, détail, recherche, Relation Map, revue, page enregistrée) en découle. Plutôt que de dupliquer ces vues, la lecture SysML est **convertie en XML de même forme** (`capSysmlVersXml`) puis passée au pipeline habituel (`capApplyXmlDoc`, 20) :

- un `<ownedElements xsi:type="sysml:<métaclasse>" id="…">` par élément, imbriqué comme dans le modèle (`proprietaire` / `enfants`) ;
- attributs littéraux : `name` (nom, sinon libellé calculé), `motCle`, `nomQualifie`, `nomCourt`, `declaration`, `famille` (STR / BEH / REQ / ORG), `nature` (definition / usage), `visibilite`, `modificateurs`, `direction`, `multiplicite`, `valeur`, `conjugue`, `role`, `declencheur`, `garde`, `effet`, `expression`, `description` (documentation, texte échappé), `technique`, `anonyme`, `fichier`, `ligne`, `bibliotheque`, `metadonnees` ;
- références en « #id » : `typedBy`, `specializes`, `subsets`, `redefines`, `references`, `annotatedElement`, `itemType`, `trigger`, `requirement`, `satisfyingFeature`, `source`, `target`, `importedNamespace`, et `extremites` (connexions, flux, successions, transitions, allocations) — résolues par le panneau de détail (références sortantes / entrantes), le ▤ Tableau (colonnes de références) et la Relation Map comme celles d'un `.capella`.

La lecture elle-même est gardée dans `_capSysml.lecture` pour ce que le XML ne porte pas : liaisons métier (`toutesLiaisons`, `liaisons(id)`), diagnostics, extraits et textes des fichiers. Elle est oubliée dès qu'un autre document est appliqué (`capSysmlAvantModele`).

| Point d'entrée | Où |
|---|---|
| Ouverture d'un `.sysml` / `.kpar` (sélecteur, dépôt, 🔄 picker) | `capLoadFile` (20) → `capSysmlOuvrir` ; `.kpar` lu en octets |
| Plusieurs `.sysml` déposés ensemble | dépôt (20) → `capSysmlOuvrirFichiers` → `lireDossier` |
| 📁 Dossier du projet sans `.capella` | `capProjectScanDir` / `capProjectFromFiles` (54) → `capSysmlOuvrirDossier` (tous les `.sysml`, ou la première `.kpar`) |
| Vue 🏗 Architecture › 🧩 SysML v2 (`ana:sysml`) | `capRenderSysml` : 🧩 Éléments (famille, métaclasse, recherche), 🔗 Liaisons (par relation), 🩺 Diagnostics, 📄 Fichiers ; ⬇ CSV |
| Diagnostics là où Arcalyse signale les problèmes | `capSyChecks` : deux sections 🩺 (erreurs ✖, avertissements ⚠ ; fichier : ligne, règle, message, élément) reprises par 💚 Santé & contrôles (69), le 🩺 profil (14), la pastille 🩺 des barres, le tableau de bord (`sy.diag`) ; pastille de 🏠 Accueil (`capSysmlPastille`) ; notification à l'ouverture |
| Panneau de détail | `capSyDetail` (25, onglet 🔬) : déclaration, nom qualifié, famille, position, liaisons cliquables, diagnostics de l'élément, extrait du texte |
| 🗺 Relation Map | `capSysmlCriteres` (critères « SysML — … », clé `sysml:<relation>`) et `capSysmlLiensModel` (relations injectées dans `MODEL.relations`), depuis 20 |
| 🔲 Diagrammes (vues calculées) | `capSyVuesRender` à la place de la visionneuse Capella quand le modèle est SysML (`capRenderDiagrams`, 54) : liste des vues par genre (`vues()`, icône du genre `capSyVueIco` — aussi dans le titre, le panneau de détail, la 🔍 palette et les commentaires de 💬 Revue —, groupes repliables `_capSyVues.plis`, largeur du volet `_capSyVues.largeur` réglée au séparateur), vue ouverte en **visuel** (fragment SVG du lecteur dans un `<svg>` de la page, feuille `svgCss` posée une fois, classe `clair` / `sombre` selon le thème d'Arcalyse, suivie par `applyTheme` ; clic sur une forme ou un lien → panneau de détail par `data-sem` ; main `capSyVuesMain` (glisser = défilement, Ctrl + molette = zoom autour du pointeur `capSyZoom`, dessin redimensionné sur place), ▣ carte `capSyCarte` sous l'explorateur (`capSyCarteZoneHtml`, repliable, ou flottante dans la vue : `_capSyVues.carte` / `carteReduite` / `carteVue`, comme `capDiagCarte` de 54) ; défilement de la liste gardé d'un rendu à l'autre (`_capSyVues.listeDefil`) ; feuille `svgCss` du lecteur **restreinte** aux dessins de la vue par `capSyCssPortee` (elle contient `svg{width:100%;height:100%}`) ; notes de 💬 Revue : contexte `capSyRevCtx` fourni à `capRevDiagCtx` (55), identifiant `sy:<clé>`, boutons `#sy-crv-note` / `#sy-crv-layer`, calque dans `.sy-vue-cadre`) ou en **texte** (`vue.texte` coloré par `capSyTexteHtml` : classes `.sy-tk-*` ; taille du texte par Ctrl + molette ou − ⊡ + `capSyTexteZoom`, `_capSyVues.texteZoom`), exports SVG autonome (`svgDocument`) et texte ; vues d'un élément dans l'onglet 🔲 du panneau de détail (`capSyVuesDetail`, `vuesPour(id)`) ; résultats « diagrammes » de la 🔍 palette (`capSyVuesReps`, uid `sy:<clé>`, ouverts par `capDiagOpen`) ; pastille « Vues : n » de l'accueil ; indicateur `sy.vues` |
| 📐 Tableau de bord | `capSyDashCatalog` : éléments, par famille, par métaclasse, liaisons par relation, vues par genre, diagnostics |
| 📜 API de scripts | `analysis.sysml()` → `lecture.json()` + `vues` (null pour un modèle Capella) |
| Vues sans données | `CAP_SY_VUES_CAPELLA` ajoutées à `capNavVides` (41) : fonctions, échanges, composants, chaînes, scénarios, analyses ARCADIA… retirées des menus en Essentiel, grisées en Complet |
| Types | métaclasses ajoutées à `CAP_HUMAN_NAMES` (nom lisible + mot-clé) ; types toujours techniques (imports, successions…) ajoutés à `CAP_TECHNICAL_TYPES` (décochés par défaut) |
| Icônes | `capIcoSysml(type)` (fin de 87, appelée par `capIcoPlus` 84 quand la visionneuse ne dessine rien) : glyphe par nature `capIcoSysmlTable` (part, port, attribut, item, interface, connexion, allocation, énumération, action, état, calcul, flux, transition, exigence, contrainte, cas d'utilisation, cas, paquet, import, commentaire, métadonnée, vue, nœuds…), nature / famille / forme d'une métaclasse `capIcoSysmlNature` (suffixes Definition / Usage, alias Perform / Exhibit / Satisfy…), couleurs par famille `CAP_SY_ICO_COULEUR` : définition pleine aux angles vifs, usage clair arrondi, usage de référence en tirets |

## Ce qui est couvert

- Lecture d'un `.sysml`, d'une `.kpar` (octets), d'un dossier de `.sysml` (noms résolus d'un fichier à l'autre, nœud de projet).
- Éléments, hiérarchie, attributs, références résolues, liaisons métier (typage, spécialisation, sous-ensemble, redéfinition, composition, référence, connexion, flux, liaison, allocation, succession, transition, perform, exhibit, satisfy, verify, sujet, acteur, inclusion, dépendance, import, métadonnée), diagnostics (fichier, ligne, code, règle, message, élément), textes.
- **Vues calculées** du lecteur (SysML v2 n'a pas de fichier de diagrammes) : vue générale (GV), d'interconnexion (IV), des états (STV), du flux d'actions (AFV), disposées automatiquement, en visuel (SVG, thème clair ou sombre, clic → élément) ou en texte, exportables.
- Tout ce qui est générique dans Arcalyse : 🌳 Arborescence, ▦ Cartes, ▤ Tableau, panneau de détail, 🔍 Ctrl+K, 🗺 Relation Map, 💬 Revue, 📑 dossiers, 💾 page enregistrée (éléments), ⚖ comparaison de deux documents XML.
- Versions française, anglaise et multilingue (lecteur dans la langue de la page).

## Ce qui n'est pas couvert

- **Écriture** : rien n'est modifié (Arcalyse est en lecture seule depuis la 3.0).
- **Mise en page manuelle** des vues : elles sont disposées automatiquement à chaque calcul, rien n'est déplaçable ni enregistré (pas de fichier de diagrammes en SysML v2) ; pas de filtres (ports, étiquettes…) ni d'animation de simulation (c'est l'interface d'Arcature). Les notes de 💬 Revue posées sur une vue sont retrouvées par la clé de la vue (`sy:<genre>:<id de l'élément>`, stable d'une lecture à l'autre tant que le texte ne change pas de structure).
- Pas de couche ARCADIA (tout est « Transverse ») : les moteurs Capella (fonctions, échanges, chaînes, traçabilité, exigences…) rendent des résultats vides.
- Pas de 🔄 suivi du fichier `.sysml` (le suivi relit du XML) ni de ⚖ comparaison dédiée.
- Une 💾 page enregistrée avec un modèle SysML rouvre le XML converti sans la lecture : la vue 🧩, les vues calculées et la section du détail sont alors vides (relire le `.sysml`).
- La bibliothèque standard de SysML v2 n'est connue que par ses noms (`ISQ::mass`…), pas détaillée.

## Tests

- `node tests/sysml.js` : le lecteur embarqué en Node (VehiculeDemo : 46 éléments, 29 liaisons, aucun diagnostic ; cinq vues calculées : formes, liens, SVG, document autonome, texte, vues d'un élément ; texte fautif ; dossier ; version anglaise).
- `node tests/oracles.js` : `tests/models/VehiculeDemo.sysml` chargé dans Chromium comme les `.capella` — relevé `sysml` (métaclasses, familles, liaisons, diagnostics, XML, Relation Map, vues vides) et tous les moteurs Capella exécutés sans erreur sur le document converti (`tests/oracles/VehiculeDemo.json`).
- `node tests/smoke.js` : dernière étape « 🧩 SysML v2 » (remplacement du modèle, vue, détail, santé, accueil, vues calculées : liste et groupes repliables, SVG, clic, texte coloré, carte, note de revue posée sur la vue).
