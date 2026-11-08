# Idées à réaliser

Pistes validées avec l'utilisateur, à reprendre plus tard.

## ▦ Vue Matrice, avec les mêmes fonctions que ▤ Tableau (demandée le 2026-11-05)

Ajouter une vue **▦ Matrice** à côté de ▤ Tableau, pour tous les formats (Capella, SysML v2, UML / SysML v1) :
- éléments en lignes et en colonnes choisis par **type** et par **portée** (couches, paquetages, éléments choisis) ;
- **critère** de liaison : une ou plusieurs relations (`CAP_LINK_SECTIONS` pour Capella, liaisons du lecteur pour SysML v2
  et UML), **sens** (ligne → colonne, colonne → ligne, les deux) ;
- mêmes fonctions que ▤ Tableau : **onglets de vues** enregistrés avec la page, tri, filtres, lignes et colonnes sans
  relation masquées, en-têtes verticaux, clic sur une cellule → liens qu'elle compte (et panneau de détail), export CSV /
  Excel, réglages dans ⚙ Interface et vues ;
- vue neuve plutôt qu'une extension de `capMatrixBuild` (27), qui ne traite que des composants (100 au plus).

Les matrices des projets Cameo en deviennent des préréglages (chantier « Tableaux, matrices et Relation Map des
`.mdzip` » ci-dessous) : le lecteur donne déjà, pour chaque matrice, son critère (`critere.regles` : relation stéréotypée —
Satisfy, Allocate… —, relation UML par métaclasse, propriété ; sens opposé), son sens, ses lignes et colonnes (toutes, ou
reliées) et sa présentation ; reste à rapporter les règles aux relations du lecteur (`satisfy`, `allocation`…) et à poser un
bouton « ▦ Matrice » dans la barre d'une matrice de 🔲 Diagrammes (90, à côté de ▤ Tableau).

- Fait le 2026-11-06 (`91-matrice.js`) : vue ▦ Matrice (bouton direct ; 🃏 Cartes prend une autre
  icône) pour Capella, SysML v2 et UML / SysML v1 ; types, couches ou familles et 🎯 portée par axe ; critère (relations Capella,
  exigences, liaisons des lecteurs, contenance, références par attribut, ✨ relations par chemin éditées comme la colonne par chemin,
  avec aperçu en direct) ; sens ; « Afficher » (avec / sans relation) ; ⇄ changer d'axes ; groupes repliables (propriétaire, couche) ;
  tri, filtres, taille ; marques personnalisables par relation (couleur, forme, texte) ; clic sur une cellule → liens et détail ;
  clavier ; onglets enregistrés (page, ⚙) ; 📚 préréglages par format ; définition `.json` ; exports CSV / Excel (matrice et liste
  des liens) ; Ctrl+K ; indicateurs du tableau de bord ; `analysis.matrix()` ; oracles et smoke.
- Fait aussi : visite guidée de la vue (🎯 Visite de cette vue). Reste : préréglages venant des matrices Cameo (`.mdzip`, chantier ci-dessous : même forme que la définition `.json`) ;
  références par attribut dans le moteur de chemin pour SysML / UML (déjà là par les attributs du
  XML converti) ; sélection de cellules et copie partielle ; impression ; ouvrir la vue depuis le panneau de détail (« matrice de
  cet élément »).

## 🧬 UML / SysML v1 : suite des vues d'architecture et des analyses (proposé le 2026-11-05)

Fait le 2026-11-05 : 🧱 Blocs & ports, ƒ Activités & flux (92) et 🧾 Exigences SysML (93), avec contrôles, indicateurs et
modèle de test `tests/models/uml/Satellite-sysml1.xmi`. Restent, dans l'ordre proposé (mêmes principes : moteur sur la lecture
`_capSysml.lecture`, vue au plus près de son équivalent Capella, contrôles au format `capDiagHtml`, indicateurs `uml.*`) :
1. ~~🚦 Machines à états~~ et 2. ~~🎬 Interactions~~ : faits le 2026-11-06 (94). Reste : rôle entry / do / exit des
   comportements d'état (non exposé par le lecteur), opérandes des fragments combinés.
3. ~~🎯 Cas d'utilisation~~ et 4. ~~⇶ Traçabilité par niveaux~~ : faits le 2026-11-06 (95). Reste : réglage ⚙ pour imposer
   le niveau d'un paquetage ou d'un stéréotype quand la détection automatique se trompe (partie de `CAP_CFG_PARTS`).
5. ~~🗃 Interfaces (ICD)~~ et 6. ~~⚖ Budgets~~ : faits le 2026-11-06 (96). Reste : limite tirée d'une contrainte paramétrique
   ou d'une exigence chiffrée, budget sur les instances (InstanceSpecification) pour comparer des configurations.
   Ancien texte : **🗃 Interfaces (ICD)** : InterfaceBlock → FlowProperty (sens, type, unité) → ports qui l'utilisent → connecteurs ;
   contrôles : InterfaceBlock inutilisée, connecteur entre interfaces de types incompatibles, ValueType sans unité.
6. **⚖ Budgets** : arbre produit (Block → parts, multiplicités) et somme d'une ValueProperty (masse, puissance, coût) comparée
   à une exigence ou une contrainte ; valeurs par défaut seulement, sans simulation.
7. ~~🔒 Paramétrique~~ et 8. ~~UML logiciel~~ : faits le 2026-11-06 (97). Reste : résolution des équations simples (sommes, produits) pour
   comparer un résultat aux valeurs liées ; seuils DIT / couplage réglables dans le 🩺 profil ; graphe des paquetages.
   Ancien texte : **🔒 Paramétrique** (équivalent de 🎛 / 🔒) : ConstraintBlock, équations, liaisons (BindingConnector) vers les
   ValueProperty ; contrôles : paramètre non lié, unités incohérentes.
8. **UML logiciel** : graphe des dépendances entre paquetages (cycles, métriques de Martin), métriques des classes (profondeur
   d'héritage, sous-classes, couplage), interfaces requises non fournies, déploiement (Node, Artifact, Deployment → 🖧 74).
9. **UAF** (déjà lu par le lecteur) : Operational Performer / Activity / Exchange dans une vue façon 🟨 Operational Analysis,
   Capability dans 🎯.
10. **SysML v2** : les mêmes moteurs pour le lecteur SysML v2 (part / port def et usages, connection / flow, action et
    succession, allocation, satisfy / verify) afin d'ouvrir 🧱 et ƒ aux modèles `.sysml`.

## 🔲 Tableaux, matrices et Relation Map des `.mdzip` dans la vue Diagrammes (demandé le 2026-11-05)

**Fait** : lecteur d'Arcature (`tableaux()`, `tableau(cle)`), vue 🔲
(module 90 : liste par genre ou à leur place dans le projet, tableau trié / filtré, matrice à en-têtes verticaux et
propriétaires groupés, « éléments reliés seulement », clic → détail, ⬇ CSV, ℹ Infos), tableau ouvert en onglet de
▤ Tableau ; **Relation Map** (format relevé le 2026-11-06 sur un projet de CATIA Magic 2026x) : arbre calculé et dessiné dans
🔲, préréglage de 🗺 Relation Map. **Reste** :
- 🗺 Relation Map d'un modèle UML / SysML v1 : une relation de **contenance** (membres, attributs), pour que les critères
  `Namespace::member` ou `Class::ownedAttribute` d'une Relation Map de Cameo y aient un équivalent ;
- matrice en préréglage de **▦ Matrice** quand cette vue existera (chantier ci-dessus) ;
- portées « Smart Package » et requêtes de Cameo (scripts de ses bibliothèques) : non évaluées, signalées.

Demande d'origine :

Aujourd'hui, ni les **tableaux**, ni les **matrices**, ni les **Relation Map** d'un projet Cameo / CATIA Magic ne sont
montrés dans Arcalyse : le lecteur UML ne reprend que les diagrammes dessinés (`docs/UML.md`). Cameo n'enregistre pas
leur contenu : il le recalcule d'après leur définition, comme Arcature (`sysml1/48-tableaux.js` ; sur AIDA : Requirement
Table 59 × 6, Generic Table 40 × 4, Whitebox ICD 20 × 8, Instance Table 20 × 7, Dependency Matrix 93 × 17 ; matrices à
portée « Smart Package » encore vides, signalées). À faire :
1. **Lecteur UML d'Arcature** : exposer les tableaux et matrices (`tableaux()`, `tableau(cle)` : lignes, colonnes,
   cellules, éléments reliés, CSV ; ≈ 32 Ko de plus) et, une fois son format relevé sur un vrai fichier, la définition
   d'une Relation Map (racine, critères, profondeur ; aucune dans les modèles de test).
2. **Vue 🔲 Diagrammes** : ils apparaissent dans la liste avec les diagrammes, à leur place dans le projet (genre
   « Tableau », « Matrice », « Relation Map »), et s'ouvrent dans la vue comme les tableaux de Capella dans la
   visionneuse : tableau HTML (tri, filtre), matrice à en-têtes verticaux (groupes par propriétaire, « éléments reliés
   seulement »), Relation Map dessinée ; clic → panneau de détail ; export CSV ; ℹ Infos.
3. **Ouvrir ailleurs** depuis la vue Diagrammes : un tableau en onglet de **▤ Tableau** (colonnes ramenées à celles
   d'Arcalyse, les autres en lecture seule), une matrice en préréglage de **▦ Matrice** (types, portées, critère, sens),
   une Relation Map en préréglage de **🗺 Relation Map** (racine, critères, profondeur).

## 🔲 Harmoniser les deux affichages de la vue Diagrammes (demandé le 2026-11-05)

L'onglet 🔲 Diagrammes a aujourd'hui deux affichages : la **visionneuse d'Arcature** pour Capella (`54-diagrammes.js`) et
un affichage propre à Arcalyse pour les vues des lecteurs SysML v2 et UML / SysML v1 (`capSyVuesRender`, 87). Ils doivent
offrir les mêmes commandes, à la même place, quel que soit le format :
- **déjà communs** : clic → panneau de détail, 📝 notes de revue et 💬 calque, ▣ carte, zoom, export SVG ;
- **seulement pour Capella**, à ajouter aux autres formats : explorateur classé et filtrable (couche, type, nom), recherche
  dans le diagramme (Ctrl+F, Entrée / Maj+Entrée), thèmes, filtres d'affichage, chaînes et chemins, exports PNG et
  impression, **export en planches** (PDF, ZIP, HTML : `capDiagSvg` peut prendre le `svgDocument()` des lecteurs),
  ⧉ fenêtre de comparaison, ℹ Infos, section « Diagrammes » du panneau de détail au même format ;
- **seulement pour SysML / UML**, à garder ou à proposer aussi pour Capella : mode Texte, taille du texte, liste par genre ;
- même barre (deux lignes, même ordre des commandes), mêmes raccourcis, même aide.

Piste : faire de la vue 🔲 une seule enveloppe d'Arcalyse (liste, barre, carte, notes, exports, planches, comparaison)
qui confie le seul dessin à la visionneuse (Capella) ou au lecteur (SysML v2, UML / SysML v1), plutôt que deux vues
juxtaposées. Les tableaux et matrices des `.mdzip` (chantier ci-dessus) s'y rangent comme les tableaux de Capella.
- État des lieux du 2026-11-05 : `docs/VUE-DIAGRAMMES.md` — tableau commande par
  commande, évaluation de la piste, manques des API à demander à Arcature, ordre de réalisation. Reste : les étapes 3 et 4.
- Ajout du 2026-11-05 : les diagrammes **à leur place** dans l'arbre — classement « 🌳 Arborescence » (compact) de l'explorateur de la vue
  🔲, et feuilles « diagramme » sous l'élément représenté dans la vue 🌳 Arborescence du modèle (Capella : cible du .aird ; SysML / UML :
  élément porteur de la vue). Maquette annotable : planche E.
- **Fait le 2026-11-06** (étapes 3 et 4) : enveloppe unique (54) — représentations communes, explorateur classé
  (classements par format + 🌳 Arborescence compacte), barre du haut, ℹ Infos, ⧉ comparaison, planches et section « Diagrammes » du détail pour
  SysML v2 / UML ; partie droite des lecteurs (87) au gabarit de la visionneuse : recherche Ctrl+F, thème Auto / Clair / Sombre, ⬇▾ SVG / PNG /
  impression / texte, ⧩ filtres, zoom complet, raccourcis ; ≡ Texte et taille du texte pour Capella (liste des éléments représentés) ; diagrammes en
  feuilles de la vue 🌳 Arborescence (21). **Reste** : tableaux / matrices / relations des `.mdzip` (chantier ci-dessus), panneau gauche de la 🗺 Relation
  Map (Q7), et côté Arcature les API listées dans `docs/VUE-DIAGRAMMES.md` § 2 (export programmé, commandes de la visionneuse, texte, présences UML).

## 📎 Lecteur UML d'Arcature : lire un projet sur plusieurs fichiers (demandé le 2026-11-06)

**Constat** (lecteur repris le 2026-11-05, essayé sur `tests/models/uml-multi/`) :
- `lireDossier(fichiers, nom)` ne lit que le **premier** modèle de la liste (pas celui que désigne `nom`) et le
  `.notation` de même nom ; les autres `.uml` / `.xmi` sont ignorés (`lec.fichiers` ne cite que le premier).
- Une référence vers un autre fichier (`<type href="lib/Types.uml#_Moteur"/>`) est **perdue sans message** :
  `references(id)` rend `{attribut:'type', cible:null}` sans le `href`, aucune liaison (typage, généralisation, import),
  déclaration « moteur : _Moteur » (identifiant brut), aucun diagnostic.
- Un sous-modèle contrôlé de Papyrus (`<packagedElement href="Sous.uml#…"/>`) disparaît de l'arborescence.
- Bibliothèques et profils standard (`pathmap://UML_LIBRARIES/…`, `UML_PROFILES/…`) : bien reconnus par leur nom.

En attendant, Arcalyse relève lui-même ces références et les signale (88 : `capUmlExtAnalyse`, `capUmlExtReleve`), et transmet déjà au lecteur le modèle principal **en tête**, suivi des modèles qu'il
référence et de leur `.notation`.

**Demande pour Arcature** (lecteur UML / SysML v1, même idée que `lireDossier` du lecteur SysML v2, qui résout déjà les
noms d'un fichier à l'autre) :
1. **Lire tous les modèles transmis** et les fusionner en une seule lecture ; modèle principal = celui que désigne `nom`,
   sinon le premier. Chaque élément garde son `fichier` ; `lec.fichiers` les cite tous, avec leur rôle (principal,
   référencé, sous-modèle, `.notation`).
2. **Résoudre les `href`** « chemin#id » : chemin relatif au fichier qui référence, puis `platform:/resource/<projet>/…`
   (fin de chemin), puis nom de fichier s'il est unique ; fragment = `xmi:id` (et, si possible, chemin EMF
   `//@packagedElement.0`). Les liaisons (typage, généralisation, import, application de profil…) et les déclarations
   (« moteur : Moteur ») deviennent celles d'un modèle en un seul fichier.
3. **Sous-modèles contrôlés** (`packagedElement` / `nestedPackage` à `href`) : racine du fichier visé rangée à la place du
   mandataire, sous le paquetage qui le contient ; ses diagrammes (son propre `.notation`) dans `vues()`.
4. **Fichiers référencés sans conteneur** dans le modèle principal (bibliothèque `lib/Types.uml`, profil utilisateur
   `Profil.profile.uml`) : rangés à part sous la racine de la lecture, marqués (ex. `bibliotheque: '<fichier>'`), pour
   qu'Arcalyse puisse les montrer sans les compter comme le modèle ; stéréotypes d'un profil utilisateur reconnus
   (nom, propriétés) comme ceux de SysML.
5. **Ce qui reste introuvable** : garder le `href` dans `references()` (`{attribut, cible:null, href}`), écrire le nom
   visé dans la déclaration, et un **diagnostic** avertissement par fichier manquant (ex. code `fichier-absent`,
   « Référence vers un fichier non fourni : Station.uml (1) », élément porteur pour chaque référence) ; liste
   `lec.manquants` `[{fichier, n}]`. Format non lu (module `.mdxml` de Cameo…) : diagnostic distinct.
6. **Cameo `.mdzip`** (second temps, à relever sur de vrais fichiers : aucun modèle de test) : projets utilisés et
   modules partagés (`com.nomagic.ci.metamodel.project`, références `PROJECT-<uuid>?resource=…`) lus s'ils sont fournis
   (`.mdzip` du même dossier), sinon diagnostic du point 5. Enterprise Architect : rien à faire (`.qea` et export XMI
   tiennent en un fichier).
7. **Tests** : reprendre `tests/models/uml-multi/` d'Arcalyse (Apache 2.0, même auteur) — `Drone` typé par `Moteur`,
   spécialise `Aeronef`, importe `Types` ; `Camera` du sous-modèle sous `Systeme` ; profil `Critique` appliqué ;
   `Station.uml` absent et `Journal.mdxml` (format non lu) en diagnostics ; types `pathmap://` inchangés.

**Côté Arcalyse, après reprise** (`node build.js --lecteur-uml <dossier d'Arcature>`) :
- le relevé 📎 lit `lec.fichiers` : les états passent d'eux-mêmes à « lu » ; retirer « (un seul modèle lu) » du libellé
  de l'état `nonlu` ; éviter le double compte entre le contrôle 📎 et le nouveau diagnostic du lecteur (garder l'un des
  deux, de préférence le diagnostic du lecteur) ;
- montrer le fichier d'origine d'un élément (panneau de détail, colonne du ▤ Tableau, filtre de 🧬) et les éléments des
  bibliothèques à part (comme les 📚 bibliothèques Capella, 72) ;
- ajouter `uml-multi` aux oracles (`tests/oracles.js` ne lit que `tests/models/uml/`) et à `tests/uml.js` ;
- mettre à jour l'aide (🧬 › 📎 Projet sur plusieurs fichiers) et `docs/UML.md` (ligne « Projet sur plusieurs fichiers »
  des contraintes).

## ⚖ Licences : visionneuse réécrite en salle blanche (après Arcature, phases L.2 à L.5)

Audit des licences du 2026-10-28 : trois modules de la visionneuse d'Arcature embarquée (`23-styles-capella`,
`26-diagrammes`, `27-icones`) sont des adaptations d'œuvres d'Eclipse Capella / Sirius, donc sous **EPL-2.0** (mentionné
dans `NOTICE.md`, ℹ À propos et l'en-tête de la page). Arcature va les réécrire en salle blanche (`docs/LICENCES.md`
d'Arcature : une session écrit la spécification du comportement, une autre le code sans voir celui de Capella ; tests
comme oracle). Ensuite, côté Arcalyse :
- reprendre la visionneuse (`node build.js --visionneuse <dossier d'Arcature>`), avec `node tests/smoke.js` et
  `node tests/oracles.js` ;
- retirer les mentions EPL devenues inutiles (`NOTICE.md`, À propos, en-tête de `src/index.html`, aide) ;
- les icônes (27) restent sous EPL tant qu'Arcature n'a pas dessiné un jeu d'icônes propre.
- Fait le 2026-11-05 : visionneuse reprise du main d'Arcature (≈ 340 Ko → ≈ 790 Ko) ; le fichier embarqué porte désormais les
  en-têtes EPL de ses trois modules et un en-tête général qui les nomme (`src/vendor/LISEZMOI-visionneuse.md`).

## 📄 Rapports automatiques à partir d'un modèle de document (après la v2.0)

Produire un document chapitré automatiquement à partir d'un **modèle de document** réutilisable d'une version du modèle à l'autre.

- **Modèle de document** (JSON, enregistré dans la page et le fichier ⚙ comme les tableaux de bord) : liste de chapitres, chacun composé de blocs :
  - titre, texte libre ;
  - **diagramme** désigné par son nom ou par une **règle** (« tous les ES de SA », couche + type + motif de nom) → un sous-chapitre par diagramme, avec la **description Capella juste avant** le diagramme, légende de figure ;
  - **tableau** issu des calculs existants (interfaces SA, échanges fonctionnels, allocations fonctions → composants, exigences liées, données…) ;
  - liste d'éléments avec leurs descriptions.
- **Moteur** : numérotation (1, 1.1…), sommaire, légendes, assemblage.
- **Sorties** : HTML imprimable (PDF par le navigateur) en premier ; **Word .docx** ensuite (ZIP de XML via `capZipBuild`, styles de titres numérotés, images PNG).
- **Éditeur** visuel du modèle de document, sur le principe de 📐 Tableau de bord (catalogue de blocs, aperçu).
- Briques déjà disponibles : capture SVG des diagrammes, description et élément représenté (`capDiagSvg`, `capDiagMeta`, `capDiagElements`, 54), `capHtmlReport` (26), `capPdfBuild` / `capZipBuild` (24), calculs des vues 📡 et 🔬.
- À décider avant de commencer : désignation robuste des diagrammes (règles plutôt que noms exacts), format cible prioritaire (Word ou HTML/PDF), liste des tableaux de la V1.
- Fait en partie (oct. 2026) : 📑 Dossiers de relecture (61) — chapitres, descriptions, diagrammes, texte libre, sortie HTML et Word (.docx) avec réimport des commentaires. Reste : désignation des diagrammes par règles, tableaux issus des calculs, réutilisation d'un modèle de document d'une version à l'autre.
- Estimation : V1 (modèle JSON + règles + description + quelques tableaux + HTML) ≈ une grosse séance ; éditeur ≈ une séance ; export Word ≈ une à deux séances.

## 🧱 UML / SysML v1 : diagramme de contexte (ibd) dans Blocs & ports (maquette du 2026-11-07, variante B)

Choisi en idée lors de la refonte de 🧱 Blocs & ports (variantes A « fiches corrigées » et C « ◎ Voisinage » réalisées). Un bloc composite
dessiné comme son ibd : cadre, parts imbriquées (profondeur 1, 2 ou tout), ports SysML sur les bords (`capUmlPortSvg`, 92), connecteurs
orthogonaux, ItemFlow en étiquettes (flèche = sens), connecteurs sans flux en gris, erreurs en rouge pointillé ; arbre de composition à
gauche (double-clic sur une part pour y descendre, blocs hors composition à part), menu Afficher (ItemFlow, ports non connectés, types,
allocations reçues). Un contexte à la fois, donc tenable sur AIDA (≈ 26 500 éléments) ; au-delà d'environ 25 parts, repli sur la Vue Blocs.
Travail : placement des parts en colonnes selon le sens des flux (comme `capUmlRangs`), routage orthogonal simple, zoom, ⬇ SVG / PNG.

## 🖼 UML / SysML v1 : éléments représentés par une image dans 🔲 Diagrammes (question du 2026-11-07, à vérifier)

Une forme montrée en image dans l'outil d'origine (image de forme ou icône de stéréotype à la place du cadre dans Cameo, image
de remplacement d'Enterprise Architect, image d'une forme Papyrus) : on ne sait pas encore ce que le lecteur d'Arcature en fait.
Sur les 7 modèles de `tests/models/uml/` (56 diagrammes), aucun `<image>` dans le SVG, mais aucun de ces modèles n'en contient.
Probable : cadre ordinaire avec le nom, image perdue. À faire :
1. Vérifier sur un vrai cas (AIDA, à côté d'Arcature) : petit script qui liste les diagrammes contenant une image dans le fichier
   et dit si le SVG du lecteur (`vue(cle)`) la garde.
2. Si l'image est perdue : côté Arcature, produire `<image href="data:…">` depuis l'image enregistrée (`.mdzip`, `.qea` ; Papyrus :
   fichier à part, lu seulement s'il est déposé avec le modèle), puis reprise par `node build.js --lecteur-uml`.
3. Côté Arcalyse : vérifier que les exports (PNG, PDF, planches) gardent ces images ; jamais d'image cherchée sur le réseau
   (image introuvable → cadre ordinaire).

## 🟦 Lecture des modèles IBM Rhapsody (discutée le 2026-11-07)

Ouvrir un projet Rhapsody comme un modèle UML / SysML v1, **par le lecteur UML d'Arcature** (option retenue ; ni lecteur à part
dans Arcalyse, ni passage obligé par l'export XMI de Rhapsody), puis reprise par `node build.js --lecteur-uml`.

Format observé sur quatre projets d'exemple d'IBM (Rhapsody 8.6.0 et 8.7.1, format texte) :
- `Projet.rpy` (racine) + dossier `Projet_rpy/` : une unité par paquetage (`.sbs`), composants (`.cmp`) ; `filesTable.dat` donne
  fichier → paquetage (`A::B`) ; `.rpw`, `.ehl`, `.vba`, `.save`, `.log` : atelier, à ignorer ; `.rpyz` = projet zippé ;
- texte « I-Logix-RPY-Archive version x.y » puis blocs `{ Type - clé = valeurs ; … }` (chaînes, nombres négatifs, `GUID …`,
  blocs imbriqués) : une grammaire générique suffit (essai jetable : 39 fichiers sur 42 lus ; restent les chaînes avec guillemets) ;
- références `IHandle` (`_m2Class`, `_filename`, `_name`, `_id`) entre unités ; stéréotypes du profil SysML et types prédéfinis
  dans l'installation de Rhapsody (`$OMROOT\Profiles\SysML\…\SysML.sbs`, `PredefinedTypes.sbs`), absents du projet → reconnus
  par leur nom (`block`, `flowPort`, `trace`, `ValueType`, `ConstraintParameter`…) ;
- contenu : `IClass`, `IPart`, `ISysMLPort` (direction), `IConnector`, `IInformationFlow`, `IRequirement`, `IDependency`,
  `IUseCase` / `IActor`, `IStateChart` / `IState` / `ITransition`, activités, séquences, contraintes ;
- diagrammes dans les unités : objets `CGI…` reliés à l'élément par `m_pModelObject`, position `m_transform` (matrice
  `sx 0 0 sy tx ty`) et forme `m_polygon` (points).

Étapes :
1. **Arcature** : découpage du format texte, `filesTable.dat`, résolution des `IHandle`, correspondance des types `I…` vers les
   métaclasses UML / SysML, ouverture d'un dossier ou d'un `.rpy` avec ses unités (`.rpyz` ensuite).
2. **Arcalyse** : extensions dans `CAP_FORMATS` / `capLoadFile` (20), ouverture d'un dossier dans 88 (`capUmlOuvrirDossier`),
   cas dans `tests/uml.js` et oracle, aide et `docs/UML.md`.
3. Diagrammes (visionneuse / lecteur d'Arcature) depuis `m_transform` et `m_polygon`.
4. Plus tard : `.rpyx` / `.sbsx` (XML, Rhapsody 8.3+), quand un fichier sera disponible.

- Fait le 2026-11-07 : étape 1 dans Arcature (`sysml1/21-rhapsody.js`) et reprise dans Arcalyse (lecteur UML, ouverture du 📁 dossier d'un projet Rhapsody, aide) ; projet
  d'essai `tests/models/uml/rhapsody/Thermostat`. Restent : diagrammes (étape 3), `.rpyx`, `.rpyz`, séquences (`IMSC`).

**Fichiers de test (règle 11)** : les exemples d'IBM (SpaPoolTemp_Control_Architecture, VehicleSensor ; page « Sample models »
de la documentation de Rhapsody 10.0.3) portent « Licensed Materials - Property of IBM … All Rights Reserved » : utilisés
**en local seulement**, dans `tests/models/rhapsody-local/` (ignoré par git ; tests sautés s'il est absent), jamais versionnés,
ni eux ni des oracles qui recopient leur contenu. Tests versionnés : un petit `.rpy` **écrit à la main pour Arcalyse**
(Apache 2.0) d'après le format observé, sans rien recopier des exemples d'IBM (bloc, ports, exigence, machine à états, diagramme).
