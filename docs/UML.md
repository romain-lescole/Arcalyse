# 🧬 UML / SysML v1 dans Arcalyse

Arcalyse lit un modèle **UML 2.5.1**, **SysML v1** (1.7 et versions antérieures lues par Arcature) ou **UAF 1.2** grâce
au **lecteur UML / SysML v1 autonome d'Arcature**, le projet frère (licence Apache 2.0, comme Arcalyse). Le lecteur est
embarqué dans la page (`window.ArcatureLecteurUml`), lit le fichier **localement, en lecture seule** (rien n'est envoyé,
rien n'est écrit) et alimente les mêmes vues que pour un modèle Capella ou SysML v2.

## Fichiers lus

| Fichier | Outil, écriture | Ce qu'Arcalyse en montre |
|---|---|---|
| `.uml` | Eclipse UML2 / Papyrus (UML ; SysML v1 si le profil SysML est appliqué) | éléments, liaisons, diagnostics ; **diagrammes de Papyrus** si le `.notation` est ouvert avec lui (sélection multiple, dépôt des deux fichiers ou 📁 dossier du projet) |
| `.xmi` | XMI de l'OMG, export de Cameo, de Papyrus, d'Enterprise Architect (XMI 2.1, windows-1252 compris) | éléments, liaisons, diagnostics ; diagrammes d'Enterprise Architect de son extension |
| `.mdzip` | projet Cameo / MagicDraw / CATIA Magic (archive : modèle XMI, contenus des diagrammes, partie partagée) | **diagrammes de Cameo dessinés** (bdd, ibd, act, stm, sd, uc, req, par, pkg) ; **tableaux, matrices et Relation Map** (cartes de décomposition comprises) recalculés d'après leur définition |
| `.qea`, `.qeax` | projet Enterprise Architect 16+ (base SQLite), importé en SysML v1 | diagrammes d'EA dessinés comme ceux de Cameo |
| `.rpy` + dossier `_rpy` | projet IBM Rhapsody au format texte (unités `.sbs`, `.cls`… ; `docs/RHAPSODY.md` d'Arcature), importé en SysML v1 ; `.rpyx` (XML) reconnu et expliqué | éléments, liaisons, diagnostics ; diagrammes **pas encore lus** (comptés à l'ouverture) ; s'ouvre par le 📁 dossier du projet (un `.rpy` seul : paquetages signalés absents) |
| `.notation` | diagrammes de Papyrus | seulement avec son `.uml` (seul, il est refusé avec une explication) |

Le lecteur calcule aussi des **vues** depuis le modèle (classes, cas d'utilisation, états, activité, séquence) : Arcalyse ne
les montre pas — 🔲 Diagrammes ne liste que les diagrammes et tableaux **enregistrés dans le fichier** (choix du propriétaire,
2026-11-05 : `capSyVueMontree`, 87 ; un modèle SysML v2, sans diagrammes enregistrés, garde ses vues calculées). Les anciens projets d'Enterprise Architect (`.eap`, `.eapx`, `.feap` : base Access / Jet) ne sont pas lus : les
ouvrir dans Enterprise Architect 16+ et les enregistrer en `.qea`, ou exporter en XMI. Une archive `.mdzip` se décompresse
par `DecompressionStream` (Chrome / Edge 80+, Firefox 113+, Safari 16.4+).

## Contraintes

| Contrainte | Détail | Où elle est dite |
|---|---|---|
| Taille | le lecteur ajoute ≈ 1,3 Mo par langue au fichier livré (deux fois dans les versions bilingues `arcalyse-uml.html` et `arcalyse-complet.html`) : code source lisible, commentaires compris ; détail dans `docs/NOTES-TECHNIQUES.md` (« Composition et taille du fichier ») | aide (🧬 › Contraintes), ici |
| Navigateur | une archive `.mdzip` se décompresse par `DecompressionStream` : Chrome / Edge 80+, Firefox 113+, Safari 16.4+ ; sinon, message à l'ouverture qui propose l'export XMI de Cameo | aide, message de `capUmlOuvrirDossier` (88) |
| Durée | AIDA (`.mdzip`, ≈ 26 000 éléments) : lecture ≈ 1 s, éléments ≈ 1 s, validation ≈ 1 s ; chaque diagramme est dessiné à son ouverture (quelques dizaines de ms en général, jusqu'à ≈ 5 s pour les plus chargés) | aide |
| `.notation` | les diagrammes de Papyrus ne s'ouvrent qu'avec leur `.uml` (sélection multiple, dépôt des deux fichiers ou 📁 dossier) | aide, message à l'ouverture d'un `.notation` seul |
| Non couvert | portées « Smart Package », requêtes et critères faits d'un script de Cameo (signalés), anciens projets d'EA (`.eap`, `.eapx`, `.feap`), écriture | aide (🧬 › Non couvert) |
| Projet sur plusieurs fichiers | le lecteur ne lit que le modèle principal (et son `.notation`) : les références « fichier#id » vers un autre `.uml` / `.xmi` (types, généralisations, imports, profil appliqué, sous-modèle contrôlé de Papyrus) n'ont pas de cible, sans diagnostic du lecteur ; Arcalyse les relève et les signale (voir ci-dessous) ; les fusionner est à faire dans le lecteur d'Arcature | aide (🧬 › 📎 Projet sur plusieurs fichiers), message à l'ouverture, en-tête 🧬, contrôle 🩺 |

## D'où vient le lecteur, comment le régénérer

| Fichier | Rôle |
|---|---|
| `src/vendor/arcature-lecteur-uml.js` | Lecteur, libellés français (≈ 1,3 Mo : couche UML commune d'Arcature, profils SysML et UAF, projets Cameo et EA, dessin des diagrammes) |
| `src/vendor/arcature-lecteur-uml-en.js` | Même lecteur, libellés anglais (version `--lang en` ; les deux dans la version `multi`) |
| `src/vendor/LISEZMOI-lecteur-uml.md` | **Note d'origine** : dépôt, branche, commit, date, commande (réécrite à chaque reprise) |

Fichiers **tiers** : ne jamais les modifier à la main, ni les lire en entier. Pour les mettre à jour :

```
node build.js --lecteur-uml ../Arcature      # assemble le lecteur dans Arcature s'il manque (node build.js --lecteur-uml [--lang en]), copie fr + en, réécrit la note
node build.js && node build.js --lang en && node tests/uml.js && node tests/oracles.js
```

Côté Arcature : `docs/LECTEUR-UML.md` (mode d'emploi, API, licences), `docs/api/lecteur-uml.d.ts` (contrat typé),
`tests/lecteur-uml.js` ; le build d'Arcature refuse d'y mettre un module sous EPL-2.0.

## Comment le lecteur est branché

Même chemin que SysML v2 (`docs/SYSML-V2.md`) : le lecteur UML a **le même contrat** que le lecteur SysML v2 là où les deux
se recouvrent (éléments, liaisons, diagnostics, vues), et le module **87** sert les deux, en passant par le lecteur de la
lecture affichée (`capSyL()`, `_capSysml.L`, `_capSysml.format` : `sysml2`, `uml` ou `sysml1`). Le module **88** n'ajoute
que ce qui est propre à UML.

| Point d'entrée | Où |
|---|---|
| Ouverture d'un `.uml` / `.xmi` / `.mdzip` / `.qea` (sélecteur, dépôt) | `capLoadFile` (20) → `capUmlOuvrir` (88), lu en octets (l'encodage d'un XMI se lit dans ses octets) |
| Projet Rhapsody (`.rpy` et dossier `_rpy`) | dossier (54) ou fichiers déposés (20) → `capUmlOuvrirDossier` / `capUmlCharger` (88 : `capUmlRhapsody`, unités jointes au `.rpy`) → `lireDossier` du lecteur ; compte rendu du lecteur en notification (`capUmlAppliquer`), en-tête 🧬 (`capUmlEntete`) ; une unité `.sbs` seule est refusée avec une explication (`capUmlOuvrirFichiers`) |
| Modèle et `.notation` déposés ou choisis ensemble | dépôt (20) → `capUmlOuvrirFichiers` (88) |
| 📁 Dossier du projet sans `.capella` ni `.sysml` | `capProjectScanDir` (54 : `.uml`, `.xmi`, `.mdzip`, `.qea`, `.rpy`, `.notation` et unités de Rhapsody `CAP_UML_RHP_UNITES` ramassés ; dossier `_rpy` toujours parcouru) → `capProjectFromFiles` (54) → `capUmlOuvrirDossier` (88) : modèle principal = celui qu'aucun autre modèle du dossier ne référence (plusieurs : choix `capUmlChoix` dans l'écran d'accueil ; à défaut, `.uml` avant `.xmi`, `.mdzip`, `.qea`), puis `capUmlCharger` : son `.notation`, les modèles qu'il référence de proche en proche et leur `.notation`, transmis au lecteur (modèle principal en tête : le lecteur lit le premier) |
| 📎 Références vers d'autres fichiers | `capUmlExtAnalyse` (88) : attributs « chemin#id » des `.uml` / `.xmi` (élément à `href` ou attribut ; porteur = ancêtre à `xmi:id` ; `contenu` = sous-modèle `packagedElement href`), hors `pathmap://`, `http://`, `platform:/plugin/` ; fichier visé `capUmlExtTrouve` (chemin relatif, fin de chemin, nom unique) ; `capUmlExtReleve` après la lecture : état `lu` / `nonlu` (fourni, non lu) / `absent` / `format` ; gardé dans `_capUmlExt` pour la lecture affichée (`capUmlExt`) → ligne 📎 de l'en-tête (`capUmlExtEntete`), pastille de l'accueil, contrôle 🩺 « Références vers d'autres fichiers non lus » (`capUmlChecks`), section du détail, indicateur `uml.ext`, message à l'ouverture (`capUmlAppliquer`) |
| Conversion en document XML « façon Capella » | `capSysmlVersXml` (87) : `xsi:type="uml:<type>"` (stéréotype SysML — Block, Requirement, PartProperty… — sinon métaclasse), attributs `metaclasse`, `stereotypes`, `agregation`, propriétés des stéréotypes (`Requirement.text`, `Requirement.id`…), références « #id » (`type`, `general`, `client`, `supplier`, `memberEnd`…) |
| Vue 🏗 Architecture › 🧬 UML / SysML v1 (`ana:uml`) | `capRenderUml` (88) → `capRenderSysml` (87) : en-tête (outil, version, fichiers), 🧩 Éléments (famille, type, métaclasse, nom qualifié, déclaration, ligne), 🔗 Liaisons, 🩺 Diagnostics ; ⬇ CSV |
| Diagnostics | `capSyChecks('uml')` (87) → `capUmlChecks` (88) : validation d'Arcature (contraintes de la spécification UML 2.5.1 et des profils SysML 1.7 et UAF 1.2 sous leur nom, règles d'Arcature), reprise par 💚 Santé (69) et le 🩺 profil (14) |
| Panneau de détail | `capSyDetail` (87) → `capUmlDetail` (88) : type, métaclasse, stéréotypes, déclaration, attributs écrits (texte d'une exigence…), liaisons, diagnostics, extrait XMI |
| 🔲 Diagrammes | Vue 🔲 commune (54, 87) : diagrammes et tableaux du fichier (Cameo, Enterprise Architect, Papyrus), sans les vues calculées du lecteur (`capSyVueMontree`), comme représentations (`capSyVueRep` : `kind`, `origine`, `libelleOrigine`, `sysml`, `couche` = famille), explorateur « Genre › origine » par défaut (genre, origine, nom, 🌳 arborescence sous l'élément porteur), icône du genre par `iconeVue(vue)`, mêmes barres, recherche, filtres (liens retrouvés par `data-v`), exports, planches, ⧉, ℹ Infos ; section « Diagrammes » du détail : présences indexées par Arcalyse (`capDiagSyIdx`, formes et `data-sem` des SVG) + `vuesPour` (filtré par `capSyVueMontree`) |
| 🔲 Tableaux, matrices, Relation Map de Cameo | l'explorateur commun (54) les liste avec les diagrammes (`vues()` du lecteur : `tableau: true`, genres `tableau`, `matrice`, `relations` ; représentation `genre:'tableau'` de `capSyVueRep`, sans planche ni carte) ; la partie droite vient du module **90** (`capSyTabCorps`, contenu `tableau(cle)` gardé par `capSyTabContenu`) : tableau trié / filtré, matrice à en-têtes verticaux (`capSyTabHtmlMatrice`), Relation Map en arbre SVG comme Cameo (`capSyTabSvgRelations` : définition, nœuds et liens du lecteur ; icône et « nom : Type » `capSyTabCarte`, largeurs mesurées `capSyTabMesureur`, liens colorés par critère `CAP_SY_RM_COULEURS` et légende, ⊕ / ⊖ `capSyTabPli` → `tableau(cle, { deplier, replier })`, diagramme membre ouvert d'un clic) ouverte au besoin en onglet de 🗺 Relation Map (`capSyTabVersRelationMap` : racine, profondeur, relations équivalentes aux critères) ; clic → détail, ⬇ CSV `capSyTabCsv`, ℹ Infos `capSyTabInfo`, ▤ Tableau `capSyTabVersTableau` (onglet à lignes données, colonnes en lecture seule `cameo:…`) |
| Icônes | `capIco` / `capIcoType` (54) → `capUmlIcone` / `capUmlIconeType` (88) : jeu d'icônes d'Arcature (dessins propres d'après la notation des normes) |
| Accueil, tableau de bord | `capUmlCasesAccueil` (cases « Fichiers du projet »), `capUmlDashCatalog` (88 : indicateurs `uml.*`, dont `uml.blk.*`, `uml.act.*`, `uml.req.*` de 92 et 93) |
| Famille 🏗 Architecture › 🧬 UML / SysML v1 (`grp:uml`, 41) | trois vues : 🧬 Modèle (`ana:uml`), 🧱 Blocs & ports (`ana:umlblk`), ƒ Activités & flux (`ana:umlact`) ; famille masquée pour un modèle Capella ou SysML v2 (vues sans données) |
| 🧱 Blocs & ports, ƒ Activités & flux (92) | moteurs sur la lecture (pas sur le XML converti) : `capUmlStructure` (blocs, ports orientés par les FlowProperty de leur type — conjugaison, FlowPort —, connecteurs d'assemblage / délégation et leur contexte, ItemFlow, «allocate», interfaces fournies / requises) et `capUmlActivites` (actions, pins, flux d'objets et de contrôle ramenés d'action à action à travers fork / join / merge / decision, paramètres d'activité, porteurs : partition, «allocate» de l'action, du comportement appelé ou de l'activité, bloc dont l'activité est le comportement ; signaux envoyés / attendus sur un port) ; une Vue Blocs commune `capUmlBlkRender` (◧ Blocs, ≡ Ligne, ▦ Matrice, 🩺 Contrôles, ⬇ CSV / HTML) avec les classes CSS de 44 et 47 ; contrôles `capUmlBlkChecks`, `capUmlActChecks` (dont signaux sans ItemFlow : cohérence comportement ↔ structure) |
| ✅ Vérifier › 🧾 Exigences SysML (93, `ana:umlreq`) | `capUmlExigences` : «Requirement» et stéréotypes dérivés, `id` / `text` du stéréotype, contenance, satisfy / verify / deriveReqt / refine / trace / copy (relation reconnue par son nom, sinon par le type de l'élément porteur : «refine» du profil standard) ; couverture directe ou par sous-exigences et exigences dérivées ; vues Liste, Arbre, Couverture, Matrice, Contrôles (`capUmlReqChecks`). La vue 🧾 Exigences de Capella (39) reste à part |
| 🚦 Machines à états, 🎬 Interactions (94, `ana:umlstm`, `ana:umlseq`) | `capUmlEtats` : machines (bloc porteur), états et pseudo-états (nature lue dans `kind`), comportements, transitions (Trigger → SignalEvent / CallEvent / TimeEvent / ChangeEvent ; à défaut le nom de la transition, comme dans Papyrus ou EA ; garde = `valeur` de la Constraint ; effet), accessibilité depuis l'état initial (entrée dans les états englobants et leurs initiaux), signaux émis (SendSignalAction, messages, ItemFlow) ; `capUmlInteractions` : lignes de vie (part représentée, bloc), messages ordonnés par les fragments (`sendEvent` / `receiveEvent` → `covered`), `messageSort`, fragments combinés ; contrôles `capUmlStmChecks`, `capUmlSeqChecks` (message entre parts sans chemin de connecteurs : union des blocs reliés par les connecteurs de 92, délégations comprises) ; le dessin reste aux 🔲 Diagrammes (`capUmlDiagBouton`) |
| 🎯 Cas d'utilisation, ⇶ Traçabilité par niveaux (95, `ana:umlucs`, `ana:umltrace`) | `capUmlCas` : cas, acteurs (liaison `association`, et acteurs hérités par include / extend), sujet (`subject`, `useCase`, classe propriétaire), include / extend, comportements (possédés, refine / trace / réalisation, y compris par le type de l'abstraction), exigences ; `capUmlTracabilite` : niveaux `CAP_UML_NIVEAUX` déterminés par `capUmlNiveau` (exigence, cas / acteur, type ou stéréotype, paquetages, métaclasse), liens `CAP_UML_TRACE_RELS` (part, port, pin et action ramenés à leur porteur), haut / bas / même niveau ; graphe `capUmlTrSvg` (60 éléments par colonne, ordre par barycentre) ; contrôles `capUmlUcChecks`, `capUmlTrChecks` |
| 🗃 Interfaces, ⚖ Budgets (96, `ana:umlicd`, `ana:umlbudget`) | `capUmlInterfaces` : interfaces = InterfaceBlock / Interface et tout type de port, FlowProperty (généralisations comprises), opérations, ports ; ICD sur les connecteurs entre ports de 92 (compatibilité par identité ou généralisation, objets transportés hors des types des FlowProperty) ; `capUmlBudgets` : valeurs numériques par défaut des propriétés des blocs, grandeur = nom sans unité ni suffixe de limite (`capUmlGrandeur`, `CAP_UML_LIMITE`), unité du ValueType (propriété `unit`, crochets, nom court), grandeur gardée si ≥ 2 blocs ou une limite ; cumul `capUmlBudgetArbre` (parts × multiplicité, « * » = borne basse, branches sans valeur élaguées), racines `capUmlBudgetRacines` ; contrôles `capUmlIcdChecks`, `capUmlBudgetChecks` |
| 🔒 Paramétrique & contraintes, 📦 Paquetages & classes (97, `ana:umlpar`, `ana:umlsoft`) | `capUmlParametrique` : ConstraintBlock (`capUmlEstBlocContrainte`, exclus des blocs de 92), équations (Constraint possédées), paramètres, usages (propriété typée par un bloc de contrainte), BindingConnector (paramètre d'un usage ↔ valeur `part.valeur` ou autre paramètre ; écart de type), noms inconnus des équations (`CAP_UML_EQ_MOTS`), contraintes UML hors gardes / invariants ; `capUmlLogiciel` : classifieurs sans stéréotype, dépendances tirées des liaisons du lecteur, paquetages (Ca, Ce, I, A, D), cycles par Tarjan (paquetages, héritage), DIT / NOC / couplage, interfaces réalisées / requises, déploiement (Deployment `deployedArtifact`, Manifestation `utilizedElement`) ; contrôles `capUmlParChecks`, `capUmlSoftChecks` |
| Panneau de détail | boutons ◧ Blocs & ports, ◧ Activités & flux, 🧾 Exigences SysML, 🚦, 🎬, 🎯, 🔲 en tête de la section 🧬 (`capUmlVuesBoutons`, 88) |

## Droits

- **Lecteur** : Apache 2.0, même auteur qu'Arcalyse ; **aucun fichier sous EPL-2.0** (le jeu d'icônes de remplacement
  « Eclipse UML2 » d'Arcature, redessiné par Papyrus Web sous EPL-2.0, n'est pas repris ; le build d'Arcature le refuse).
- **Documents de l'OMG** : le lecteur contient les noms des métaclasses d'UML 2.5.1 et des stéréotypes de SysML 1.7 et
  d'UAF 1.2, et le texte des contraintes de ces profils, tirés des fichiers normatifs `UML.xmi`, `SysML.xmi`, `UAF.xmi`. La
  licence des spécifications de l'OMG permet de « créer et distribuer des logiciels fondés sur la spécification »
  (UML 2.5.1, formal/17-12-05 ; SysML 1.7, formal/24-01-07 : « Use of specification — Licenses ») ; la source est citée en
  tête du lecteur et dans `NOTICE.md`. Arcalyse **ne se déclare pas conforme** à ces spécifications (section « Compliance »
  de l'OMG : réservé aux mises en œuvre complètes).
- **Marques** : UML®, SysML®, UAF®, XMI®, OMG® (Object Management Group) ; Cameo, MagicDraw, CATIA Magic (Dassault
  Systèmes) ; Enterprise Architect (Sparx Systems) ; IBM, Rhapsody (IBM Corporation) ; Eclipse, Papyrus (Eclipse Foundation) — usage descriptif seulement,
  pour désigner les formats lus ; Arcalyse n'est ni officiel ni affilié.
- **Formats de Cameo, d'Enterprise Architect et de Rhapsody** : lus pour l'interopérabilité (zip et XMI ; base SQLite ; texte de Rhapsody) d'après des
  fichiers, sans reprendre ni décompiler de code, de bibliothèque ou de fichier de ces outils.
- **Modèles de test** (`tests/models/uml/`) : écrits pour Arcature, et `Satellite-sysml1.xmi` pour Arcalyse (Apache 2.0) ;
  `rhapsody/Thermostat` (projet Rhapsody écrit pour Arcature d'après le format relevé) ; aucun modèle d'exemple de Cameo,
  d'Enterprise Architect ou d'IBM (« Licensed Materials - Property of IBM ») n'est repris (`tests/models/LISEZMOI.md` ;
  exemples d'IBM en local seulement, dans `tests/models/rhapsody-local/`, ignoré par git). Le projet Cameo
  d'AIDA (IRT Saint Exupéry, CC BY-SA 4.0) sert d'essai sur un grand modèle mais n'est pas versionné : son `.mdzip` contient
  aussi des instantanés des profils partagés de Cameo et dépend des profils SAMARETO (EPL-2.0).

## Tests

| Commande | Ce qui est vérifié |
|---|---|
| `node tests/uml.js` | Le lecteur embarqué en Node (18+), sans navigateur, sur les modèles de `tests/models/uml/` (`Bibliotheque.uml` + `.notation`, `Rover-cameo.xmi`, `Drone-2026x.mdzip`, `Drone-ea.qea`) : éléments, liaisons, diagnostics, vues, icônes, version anglaise |
| `node tests/oracles.js` | Chaque modèle de `tests/models/uml/` chargé dans Chromium (sans son `.notation`) : relevé `uml` (types, familles, liaisons, diagnostics par code) et tous les moteurs exécutés sans erreur — oracles `Bibliotheque`, `Rover-cameo`, `Drone-2026x`, `Drone-ea` |
| `node tests/smoke.js` | Étape « 🧬 UML / SysML v1 » : projet Cameo (`.mdzip`) ouvert à la place du modèle affiché, vue 🧬, détail (stéréotype), santé, diagrammes de Cameo dessinés, icônes, accueil ; puis un `.uml` et son `.notation` déposés ensemble (diagrammes de Papyrus) |
