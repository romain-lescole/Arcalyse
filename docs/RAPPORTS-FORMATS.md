# 📘 Rapports automatiques sur UML / SysML v1 et SysML v2 — proposition

> **Décision (8 novembre 2026)** : en SysML, les méthodes sont libres ; plutôt que des plans câblés (piste 1), les plans **SSS et SSDD sont livrés comme 🧩 modèles à adapter**, sur un moteur de modèles amélioré (piste 2, réalisée dans `src/js/100-rapports-sysml.js`) : boucles et tableaux « ✨ au choix » (famille, type ou stéréotype ; portée : tout le modèle, dans un paquetage ou un bloc, contenus, intérieur, reliés par une relation, atteints par un ✨ chemin), contenus propriétés / liens / ports-pins-paramètres / connexions / information par chemin, colonnes au choix (attribut, relation, chemin), 🎯 sujet du modèle. Mode d'emploi : aide › 📘 Rapports › « 🧩 Modèles sur mesure » ; détails : `docs/NOTES-TECHNIQUES.md`. Les plans Capella (STS, DCS, SSS, SSDD câblés) sont inchangés. Le reste de ce document est la proposition d'origine, gardée pour mémoire (correspondance des notions, § 3).
>
> *Proposition d'origine :* aucun code écrit à ce stade.
> Les chiffres « aujourd'hui » ont été mesurés le 8 novembre 2026 sur `dist/arcalyse-fr.html` (build de la branche, plans générés par `capDosGenerer`, système choisi pour SSS / SSDD).
> Les contenus « proposés » sont tirés des résultats **actuels** des moteurs 87 et 92 à 97 sur les mêmes modèles.

## 1. Constat chiffré

| Modèle | Plan | Chapitres | Textes « [À rédiger / compléter] » | Tableaux (vides) | Éléments listés | Diagrammes |
|---|---|---|---|---|---|---|
| IFE (Capella, sans .aird) | SSS | 49 | 44 | 14 (0) | 90 | — |
| IFE | DCS | 180 | 90 | 50 (24) | 380 | — |
| **Satellite-sysml1.xmi** | STS | 40 | 26 | 7 (**7**) | **0** | 0 |
| | DCS | 30 | 12 | 10 (**10**) | **0** | 0 |
| | SSS | 32 | 28 | 3 (0) | 24 (exigences seules) | 0 |
| | SSDD | 14 | 11 | 1 (0) | 8 | 0 |
| | 🧩 Nouveau modèle | 4 | 3 | 0 | 0 | 0 |
| **VehiculeDemo.sysml** | STS / DCS | 40 / 30 | 26 / 12 | 7 / 10 (tous vides) | **0** | **0 sur 5 vues** |
| | SSS / SSDD | 32 / 14 | 28 / 11 | 0 | 0 | 0 |
| **Drone-2026x.mdzip** (Cameo) | SSS | 32 | 28 | 3 | 3 | **0 sur 2** (bdd, uc) |

Trois causes :

1. **Les outils des plans ne lisent que Capella** : couches OA / SA / LA / PA, `System/Logical/PhysicalComponent`, `capComputeFunctions`, `ComponentExchange`, `PartDeploymentLink`, `capComputeCapabilities`, `capComputeStates`, `capChainsData`. Sur un modèle des lecteurs, tous les éléments sont dans la couche `Shared`.
2. **Les diagrammes ne sont jamais repris** : `capHomeReps()` (56) renvoie `[]` sans `.aird`, alors que `capDiagReps()` donne bien les vues des lecteurs (uid `sy:<clé>`), que `capDiagMeta(uid).cible` les relie à leur élément et que `capDiagSvg('sy:…')` sait les exporter. *Le même défaut touche sans doute le glisser-déposer d'un diagramme UML dans un 📑 dossier (`capHomeRefOk`), à vérifier.*
3. **Les sigles des plans sont ceux de Capella** (`SAB`, `LDFB`, `ES`, `MSM`…), alors que les lecteurs ont leurs propres genres : `bdd`, `ibd`, `par`, `req`, `UC`, `AD`, `SM`, `SD`, `DD`… (UML / SysML v1), `GV`, `IV`, `AFV`, `STV` (SysML v2).

## 2. Principe proposé

**On garde les cinq plans tels quels** (titres, ordre, numérotation du DID pour SSS / SSDD). Seule change la **source** des contenus, choisie selon le format du modèle chargé :

```
capDosOutils()  ──►  o.fmt = 'capella' | 'uml' | 'sysml2'
                      o.sys(), o.comps(), o.couche(), o.D(…), o.F …   (mêmes noms, réponses selon le format)
capDosSujet(o, comp) ──► capella : inchangé (66)
                     ──► uml     : capDosSujetUml   (moteurs 92 à 97)
                     ──► sysml2  : capDosSujetSy    (lecture du lecteur SysML v2, 87)
                     → même objet {S, L, ins, fs, feExt, ceExt, ceInt, partenaires, reqs, sous…} + champs propres au format
```

- Les plans Capella **ne changent pas d'une ligne** quand `o.fmt==='capella'` : les nouveaux chemins sont dans un module à part (proposé : `src/js/100-rapports-formats.js`), appelés seulement si `capSyUml()` / `_capSysml.format==='sysml2'`. Oracles IFE et AIDA identiques par construction.
- **Couches → niveaux.** Pour UML / SysML v1, la couche est remplacée par le **niveau** déjà calculé par ⇶ Traçabilité (`capUmlNiveau`, 95) : 🎯 opérationnel / cas d'utilisation ≈ OA-SA, ƒ fonctionnel, 🧱 logique ≈ LA, 🔩 physique ≈ PA (repérés par stéréotype ou nom de paquetage : *Logical*, *Physical*, *Technical*…, ce que produit une organisation MagicGrid). Si le modèle ne distingue pas de niveaux, il n'y a qu'une architecture. SysML v2 : pas de niveau (familles STR / BEH / REQ seulement), une seule architecture.
- **Diagrammes : table d'équivalence des sigles**, appliquée par `o.D(couche, sigles, n)` (et plus tard par les 🧩 modèles) :

| Sigles Capella demandés par les plans | UML / SysML v1 | SysML v2 |
|---|---|---|
| `SAB`, `LAB`, `PAB`, `CSA` (architecture) | `ibd` du bloc (sinon `CSD`, `CmpD`) | `IV` du bloc |
| `MCB`, `CC`, `OEBD`, `OCB` (contexte, capacités) | `UC`, puis `bdd` du contexte | `GV` |
| `SFBD`, `SDFB`, `LDFB`, `PDFB` (fonctions) | `AD` | `AFV` |
| `ES`, `FS`, `IS` (scénarios) | `SD`, `CoD`, `IOD` | — (pas de vue de séquence) |
| `MSM` (modes et états) | `SM` | `STV` |
| `CDI`, `CEI` (interfaces, données) | `bdd` des interfaces / blocs d'interface | `GV` |
| *(nouveau)* exigences, paramétrique, déploiement | `req`, `par`, `DD` ; tableaux et matrices de Cameo | — |

  Un diagramme est d'abord cherché **par sa cible** (`capDosDiagsDe`) — c'est ce qui marche le mieux sur les lecteurs —, puis par genre dans le périmètre.
- **Prérequis** : `capHomeReps()` renvoie `capDiagReps()` quand `capDiagSy()` (les diagrammes du fichier, et seulement eux pour UML : `capSyVueMontree` écarte déjà les vues calculées).

## 3. Correspondance des notions

| ARCADIA (Capella) | UML / SysML v1 (moteurs 92 à 97) | SysML v2 (lecture 87) |
|---|---|---|
| Système (composant racine SA) | **Bloc sujet** des cas d'utilisation, sinon bloc de contexte d'ibd, sinon bloc racine de la composition | `part` de premier niveau (instance système) ou `part def` racine |
| Composants (sous-systèmes) | Blocs, parts (composition), `n.children` | `part` / `part def` (relation `composition`, `typage`) |
| Acteurs | Acteurs des cas, blocs `«external»`, parts sœurs dans le contexte | `part` hors du système reliées par une connexion ; acteurs de `use case` s'il y en a |
| Missions | *sans équivalent* (cas d'utilisation de plus haut niveau si inclusion) | *sans équivalent* |
| Capacités | **Cas d'utilisation** (acteurs, sujet, include / extend, comportements, exigences — 95) | `use case` s'il y en a, sinon actions réalisées (`perform`) |
| Fonctions allouées | **Activités / actions** portées par le bloc : «allocate», partitions, comportement possédé (92) | `action` réalisées par la part (`perform`) |
| Échanges fonctionnels | Flux d'objets entre actions (pins, paramètres d'activité) | Successions et flux entre actions |
| Chaînes fonctionnelles | Activités qui en appellent d'autres (CallBehaviorAction) | `action def` composées |
| Scénarios | **Interactions** (lignes de vie, messages, fragments — 94) | *sans équivalent dans le lecteur aujourd'hui* |
| Modes et états | **Machines à états** du bloc et de ses parts (94) | `state` exposés (`exhibit`) |
| Component Exchange | **Connecteurs** (assemblage, délégation sur les ports frontière) avec leurs **ItemFlow** | `connection` / `interface` (relation `connexion`) |
| Exchange Item | Objets convoyés par les ItemFlow, FlowProperty des types de ports | `item def`, attributs des `port def` |
| Ports | Ports orientés par leurs FlowProperty (IN / OUT / INOUT, conjugués) | `port` (`~` conjugué), attributs `in` / `out` |
| Interfaces (CDI) | **Interfaces / ICD** (96) : flux, opérations, ports, lignes d'ICD | `interface def` et ses `end` |
| Réalisations entre couches | «allocate» logique → physique, `realization` | `allocation` (s'il y en a) |
| Déploiement (`PartDeploymentLink`) | «allocate» vers le niveau physique ; nœuds / artefacts UML (97) | `allocation` |
| Liens physiques, chemins physiques | Connecteurs entre blocs du niveau physique ; **chemins : sans équivalent** | **sans équivalent** |
| Exigences et leurs liens | **Exigences** SysML : `satisfy`, `verify`, `deriveReqt`, `refine`, `trace`, couverture directe / indirecte (93) | `requirement`, `satisfy`, `verify`, `subject` |
| Méthode de vérification (attribut / PVMT) | Cas de test qui **vérifient** l'exigence (`verify`), puis attribut `verifyMethod` s'il existe | `verify` |
| Contraintes Capella | **Paramétrique** : blocs de contrainte, équations, liaisons (97) ; contraintes UML ; **budgets** (masse, puissance… et limites — 96) | `constraint`, `require constraint`, valeurs `attribute :>> masse = 1800 [kg]` |
| ⇶ Liens entre couches (bloc `xlay`) | ⇶ **Traçabilité par niveaux** (95 : `capUmlTrSvg`) | Tableau des liens `satisfy` / `verify` |

## 4. Les plans, chapitre par chapitre

Légende : ✅ rempli par le modèle · ◐ rempli en partie · ⊘ **sans objet pour ce format** (voir § 5) · ✎ reste à rédiger (comme aujourd'hui).

### 4.1 📘 STS (boîte noire) et STS plan 2

| Chapitre | UML / SysML v1 | SysML v2 |
|---|---|---|
| Contexte de développement | ◐ diagrammes `UC` et `bdd` du contexte ; ✎ enjeux | ◐ `GV` ; ✎ |
| Description générale du système | ✅ bloc sujet + description + `ibd` | ✅ part système + `IV` |
| Parties prenantes (plan 2) | ✅ acteurs des cas d'utilisation, blocs `«external»` | ◐ parts externes |
| Analyse fonctionnelle : missions / capacités / chaînes | ⊘ missions ; ✅ cas d'utilisation ; ✅ activités appelantes ; `AD` | ⊘ missions ; ◐ actions réalisées ; `AFV` |
| Exigences fonctionnelles par fonction | ✅ un chapitre par activité portée par le système ou ses parts : entrées / sorties (paramètres et flux d'objets venant de l'extérieur), `AD`, **exigences satisfaites** | ✅ un chapitre par action réalisée (`perform`) |
| Interfaces externes : échanges, acteurs, entrées, sorties | ✅ connecteurs du contexte touchant le système, ports frontière classés IN / OUT avec les objets de leurs ItemFlow, types d'interface | ✅ ports de la part système et leurs attributs `in` / `out` |
| Scénarios, profil de mission | ✅ `SD` ; machines à états (`SM`) | ⊘ séquences ; ✅ `STV` |
| Masse et caractéristiques physiques | ✅ **⚖ budgets** du système (valeurs, limites) | ✅ attributs valués (`masse = 1800 [kg]`) |
| Conception imposée, réglementation… | ◐ contraintes et exigences repérées par mots-clés ; ✎ | idem |
| Intégration, vérification, validation | ✅ exigences et **cas de test qui les vérifient** | ◐ `verify` s'il y en a |

### 4.2 📗 DCS (boîte blanche)

| Chapitre | UML / SysML v1 | SysML v2 |
|---|---|---|
| Architecture fonctionnelle / logique | ✅ blocs du niveau logique (sinon parts du système), `ibd`, `bdd` | ✅ parts du système, `IV` |
| Flux externes / internes | ✅ flux d'objets entre actions, classés selon que l'action d'en face est portée dedans ou dehors | ◐ successions et flux entre actions |
| Données de paramétrage | ✅ objets convoyés, FlowProperty, interfaces (ICD) | ✅ `item def`, attributs des ports |
| Chaînes fonctionnelles | ✅ activités appelantes, une par chapitre, avec ⇶ traçabilité | ◐ `action def` composées, `AFV` |
| Diagrammes de séquences | ✅ `SD` | ⊘ |
| Architecture physique | ✅ si le modèle a un **niveau physique** (paquetage *Physical*…) ; sinon ⊘ « le modèle ne distingue pas d'architecture physique » | ⊘ (sauf `allocation` vers d'autres parts) |
| Interfaces physiques externes / internes | ✅ connecteurs entre blocs physiques | ⊘ |
| Allocation logique → physique | ✅ «allocate» (tableau) + ⇶ niveaux | ◐ `allocation` |
| Flux physiques, chemins physiques | ◐ connecteurs physiques ; ⊘ chemins | ⊘ |
| Constituants et exigences dérivées | ✅ un chapitre par constituant (bloc physique, sinon part) : activités allouées, ports et connecteurs, **exigences qu'il satisfait** | ✅ par part : ports, actions, exigences satisfaites |

### 4.3 📘 SSS et 📗 SSDD (MIL-STD-498)

La **fenêtre de périmètre** (`capDosPerimetre`) propose le bloc système et, en sous-systèmes, **les blocs** (avec leur niveau 🧱 / 🔩 à la place de SA / LA / PA). Le sujet UML est construit ainsi :

- `ins` (intérieur) : le bloc, les types de ses parts de proche en proche, et les blocs qui lui sont alloués (l'équivalent du déploiement) ;
- `fs` : activités et actions portées par l'intérieur ;
- `ceExt` / `ceInt` : connecteurs avec un bout dedans et un dehors / les deux dedans (les délégations vers un port frontière comptent comme externes) ;
- `partenaires` : blocs d'en face + acteurs des cas d'utilisation dont le sujet est dans l'intérieur ;
- `reqs` : exigences dont un `satisfy` / `verify` / `refine` / `trace` touche l'intérieur ou ses activités (à défaut, toutes, comme aujourd'hui pour le système).

| SSS | UML / SysML v1 | SysML v2 |
|---|---|---|
| 1 Domaine d'application | ✅ bloc, cas d'utilisation, `UC` / `bdd` | ✅ part, `GV` |
| 3.1 États et modes | ✅ machines à états de l'intérieur, `SM` | ✅ états exposés, `STV` |
| 3.2 Capacités | ✅ un chapitre par cas d'utilisation (acteurs, comportements, exigences liées) ; à défaut par activité | ◐ par action réalisée |
| 3.3 Interfaces externes | ✅ un chapitre par partenaire : connecteurs, **ItemFlow et objets transportés, lignes d'ICD** (sens, type, FlowProperty), exigences de l'interface | ◐ connexions vers l'extérieur, `port def` |
| 3.4 Interfaces internes | ✅ connecteurs internes (avec les incohérences de sens repérées par 🧱) | ✅ `interface` / `connection` internes |
| 3.5 Données internes | ✅ objets convoyés, types d'interface | ✅ `item def`, attributs des ports |
| 3.6 à 3.9, 3.11, 3.13 à 3.17 (adaptation, sûreté, sécurité, environnement, qualité, personnel…) | inchangé : exigences repérées par mots-clés, puis ✎ | idem |
| 3.10 Ressources informatiques | ◐ blocs du niveau physique, nœuds / artefacts UML de déploiement (97) | ⊘ |
| 3.12 Contraintes de conception | ✅ **blocs de contrainte et équations liées au sujet**, contraintes UML, budgets | ✅ `constraint` (`v.masse <= limite`) |
| 3.18 Priorité et criticité | ✅ tableau des exigences | ✅ |
| 4 Qualification | ✅ colonne « Vérification » = **cas de test du `verify`**, puis attribut | ◐ `verify` |
| 5 Traçabilité | ✅ ⇶ traçabilité par niveaux centrée sur le sujet + tableau exigence → éléments | ✅ tableau `satisfy` / `verify` |

| SSDD | UML / SysML v1 | SysML v2 |
|---|---|---|
| 3 Décisions de conception | ✅ bloc, entrées / sorties (connecteurs externes, ports frontière) | ✅ |
| 4.1 Composants | ✅ un chapitre par part : sous-parts, activités allouées, «allocate» reçus / émis (≈ réalise / réalisé par), ports, `ibd` | ✅ par part : sous-parts, ports, actions |
| 4.2 Concept d'exécution | ✅ activités appelantes, `AD`, `SD`, machines à états | ◐ `AFV`, `STV` ; ⊘ séquences |
| 4.3 Conception des interfaces | ✅ un chapitre par connecteur : « de A.port vers B.port », objets, ItemFlow, type d'interface et ses FlowProperty | ✅ par `interface` : `end`, attributs |
| 5 Traçabilité | ✅ comme SSS | ✅ |

## 5. Ce que voit l'utilisateur

**Aucun plan n'est grisé** : sur les quatre modèles de test, chaque plan reçoit du contenu. Le format est annoncé, et chaque plan porte une pastille :

```
📘 Plans types                          Modèle : SysML v1 — plans adaptés (blocs, cas d'utilisation, exigences)
 [ Spécification technique (boîte noire) ]          ●
 [ Spécification technique (plan 2) ]               ●
 [ Dossier de conception (boîte blanche) ]          ◐  ← infobulle : « Sans niveau physique distinct dans le modèle :
 [ SSS — Spécification du système … ]               ●     Architecture physique, Liens et chemins physiques sans objet »
 [ SSDD — Description de la conception … ]          ●
🧩 Mes modèles …
```

Le plan n'est grisé (désactivé, infobulle) que si le modèle n'a **aucun** bloc ni part — cas d'un modèle vide ou purement logiciel ; pour ce dernier, les 📦 paquetages et classes de 97 pourraient plus tard nourrir un plan propre.

Dans le **rapport produit**, un chapitre sans équivalent est **gardé**, avec un texte distinct des invites :

```
4.2.3  Chemins physiques
       [Sans objet pour un modèle SysML v1 — notion propre à Capella (Physical Path).
        Supprimez ce chapitre ou rédigez-le.]
```

C'est la convention du MIL-STD-498 (« This paragraph has been tailored out ») et cela garde la numérotation du DID. Le message de fin (`capWatchFlash`) dit combien de chapitres sont sans objet, et rappelle d'ouvrir le `.notation` (Papyrus) quand aucun diagramme n'est disponible, comme il le fait aujourd'hui pour le `.aird`.

La fenêtre de périmètre (SSS / SSDD) devient, sur UML / SysML :

```
📘 SSS — Spécification du système / sous-système                         ✕
 🌐 Système
   [ ▶ Système : Satellite ]   sujet de 3 cas d'utilisation, contient 6 connecteurs
 🧩 Sous-système : un bloc
   🔍 Nom du bloc…
   ▣ Camera          🧱 Logique · Block
   ▣ OBC             🧱 Logique · Block
   ▣ PowerUnit       🧱 Logique · Block
   ▣ Avionics rack   🔩 Physique · Block
   ▣ Sensor board    🔩 Physique · Block
   ▣ Mission         contexte englobant · Block
```

## 6. Illustrations

### 6.1 `Satellite-sysml1.xmi` (SysML v1, sans diagramme dans le fichier) — SSS du système « Satellite »

Ce que le modèle contient (moteurs actuels) : 8 blocs, 12 ports, 6 connecteurs, 5 ItemFlow, 4 allocations, 3 activités / 9 actions, 8 exigences, 2 machines à états, 2 interactions, 4 cas d'utilisation et 2 acteurs, 5 interfaces et 6 lignes d'ICD, 2 grandeurs de budget, 2 blocs de contrainte, 5 niveaux de traçabilité reliés par 16 liens.

| Chapitre | Aujourd'hui | Proposé |
|---|---|---|
| 1.2 Présentation | invite | bloc **Satellite**, sa description, cas *Acquire images*, *Maintain*, *Plan acquisition* |
| 3.1 États et modes | invite | machines **Camera modes**, **OBC modes** (portées par des parts du Satellite) |
| 3.2 Capacités | invite « aucune capacité » | un chapitre par cas d'utilisation : acteurs (*Mission operator*, *Maintainer*), comportements, exigences liées |
| 3.3 Interfaces externes | invite | port frontière **down** (OUT, *ImageIF*) alimenté par la délégation *downlink* depuis OBC.dl ; partenaires *Ground station* (part sœur dans le contexte *Mission*) et les deux acteurs |
| 3.4 Interfaces internes | invite | **video** (Camera.img → OBC.imgIn : *Image*, *ImageReady*), **power cam**, **power obc**, **command**, et **wrong** (Camera.img → PowerUnit.out2), signalé par 🧱 comme incohérent |
| 3.5 Données | invite | objets *Image*, *ImageReady*, *Power*, *Command* ; interfaces *ImageIF*, *PowerIF*, *CommandIF*, *MechanicalIF*, *TelemetryIF* |
| 3.10 Matériel | invite | niveau 🔩 physique : *Avionics rack* (reçoit OBC), *Sensor board* (reçoit Camera) |
| 3.12 Contraintes | invite | blocs de contrainte **MassSum**, **PowerMargin** ; budgets *mass* (avec limite) et *power* |
| 3.18 Priorité | 8 exigences sans élément lié | 8 exigences avec ce qui les satisfait : SAT-1 *Imaging* ← Satellite, SAT-1.1 *Resolution* ← Camera, SAT-1.2 *Downlink* ← OBC, SAT-2 *Power budget* ← PowerUnit ; *Thermal* non couverte ; SAT-4 dérivée de *Resolution* |
| 4 Qualification | colonne « Vérification » vide | SAT-1.1 vérifiée par **Image quality test** ; les autres « — » (à compléter) |
| 5 Traçabilité | vue ⇶ Capella vide | ⇶ niveaux : exigences 8 → cas 4 → fonctionnel 4 → logique 4 → physique 2 |

Le **DCS** y trouve les deux niveaux : architecture logique (Camera, OBC, PowerUnit), architecture physique (Avionics rack, Sensor board), allocation logique → physique (OBC → Avionics rack, Camera → Sensor board), chaîne *Imaging mission* (qui appelle *Acquire image* et *Process image*), interactions *Acquisition sequence* et *Downlink sequence*. Seuls *Chemins physiques* et *Missions* sont ⊘.

### 6.2 `VehiculeDemo.sysml` (SysML v2, 5 vues calculées) — SSS / SSDD de la part « vehicule »

| Chapitre | Proposé |
|---|---|
| 1.2 Présentation | part **vehicule : Vehicule**, vue `GV` *Vue générale — VehiculeDemo* |
| 3.1 États et modes | état exposé **etats : EtatsMoteur** (*arret*, *marche* ; transitions sur *OrdreDemarrage* / *OrdreArret*), vue `STV` |
| 3.2 Capacités | pas de cas d'utilisation → action réalisée **demarrage : Demarrage** (*allumer*, *stabiliser*), vue `AFV` |
| 3.3 Interfaces externes | aucun partenaire dans le modèle → invite seule |
| 3.4 Interfaces internes | **Transmission** : moteurs.arbre → boite.entree (*ArbrePort*, `out couple : torque`, port conjugué côté boîte), vues `IV` de *Vehicule* et *Boite* |
| 3.5 Données | *OrdreDemarrage*, *OrdreArret*, attribut *couple* |
| 3.12 Contraintes | **MasseMax** : `v.masse <= limite` ; masse = 1800 kg, limite = 2000 kg |
| 3.18 / 4 / 5 | **R-001 MasseMax** (usage *masseVehicule*) satisfaite par *vehicule* ; aucune vérification |
| SSDD 4.1 Composants | **boite : Boite** (port *entree*, 4 *pignons*), **moteurs : Moteur[2]** (port *arbre*) |
| SSDD 4.3 Interfaces | chapitre *Transmission* (ends *source* / *cible*) |

⊘ sur SysML v2 : séquences, architecture physique distincte, chemins physiques, missions.

### 6.3 Projet Cameo réel

Sur `Drone-2026x.mdzip` (Cameo 2026x, petit) : le SSS reprendrait le `bdd` *Structure du drone* (1.2) et le `UC` *Missions* (3.2), l'exigence *E1 Autonomie* et le bloc *Drone* et ses parts — aujourd'hui, 0 diagramme et 3 éléments listés.

Sur un projet Cameo organisé selon **MagicGrid** (le cas courant), la correspondance est presque directe :

| MagicGrid | Plan Arcalyse | Ce qui est repris |
|---|---|---|
| *Problem domain › Black box* (cas, contexte, mesures d'efficacité) | **STS** / SSS système | `UC`, `bdd` / `ibd` du contexte, acteurs, ports du système, `SM` et `AD` des cas |
| *Problem domain › White box* (sous-systèmes fonctionnels) | **SSS** d'un sous-système | activités allouées, ItemFlow internes, exigences dérivées |
| *Solution domain* (logique, physique : paquetages *Logical* / *Physical*) | **DCS** / **SSDD** | `ibd` par sous-système, «allocate», interfaces et ICD, `par` et budgets (masse, puissance) |
| Exigences (`req`, *Requirement Table*, matrices *Satisfy* / *Verify*) | tous les plans | tableaux d'exigences avec satisfait par / vérifié par ; les **tableaux et matrices du `.mdzip`** (90) s'insèrent comme des diagrammes |

Deux réserves sur un vrai projet : les noms de paquetages non standard (le niveau logique / physique n'est alors pas reconnu : une seule architecture, signalé ◐), et la taille (plafonds actuels gardés : 40 chapitres par boucle de capacités / fonctions, 150 lignes par tableau d'échanges).

## 7. Piste 2 — 🧩 modèles personnalisés selon le format

Principe : **mêmes clés, sens selon le format**, pour qu'un modèle `.json` écrit pour Capella reste utilisable sur UML / SysML, et ajout de clés propres aux lecteurs.

| Clé (`CAP_RAP_TYPES`) | Capella | UML / SysML v1 | SysML v2 |
|---|---|---|---|
| `fn` Fonctions | fonctions | activités et actions | actions |
| `comp` Composants | composants | blocs (parts) | parts |
| `node` Nœuds physiques | nœuds PA | blocs du niveau physique | ⊘ |
| `actor` Acteurs | acteurs | acteurs, blocs `«external»` | parts externes |
| `chain` Chaînes | chaînes | activités appelantes | `action def` composées |
| `cap` Capacités | capacités | cas d'utilisation | `use case` |
| `fe` / `ce` / `pl` / `ei` | échanges / liens / items | flux d'objets / connecteurs / connecteurs physiques / objets convoyés | successions / connexions / ⊘ / `item` |
| *nouveau* `req` Exigences, `uc` Cas, `stm` Machines à états, `sd` Interactions, `itf` Interfaces, `port` Ports, `cb` Blocs de contrainte | (exigences Capella pour `req` ; ⊘ ou équivalent pour les autres) | ✅ | ✅ sauf `sd` |

- **Couche → niveau** dans la liste « couche » quand le modèle vient d'un lecteur (🎯 / ƒ / 🧱 / 🔩) ; filtres ajoutés : *satisfont une exigence*, *parts de l'élément de la boucle* ; `ctx` (lié à l'élément englobant) suit les parts, les allocations, les connecteurs et les liens d'exigences.
- **Contenus automatiques** ajoutés : exigences **satisfaites par** / **vérifiées par** {nom}, éléments qui **satisfont** l'exigence de la boucle, **ports et flux** (ports, ItemFlow, objets), **ligne d'ICD**, **machine à états** de {nom}, **budgets** de {nom}, **contraintes paramétriques**. Les existants prennent le sens du format (`alloc` → activités allouées, `pl` → connecteurs, `xlay` → ⇶ niveaux).
- **Diagrammes** : le champ *types* accepte les sigles Capella **et** les genres (`ibd`, `SD`, `IV`…) ; la table du § 2 traduit les uns dans les autres.
- **Format déclaré** : le `.json` reçoit un champ facultatif `formats:['capella','uml','sysml2']` (absent : tous). À la génération, un bloc sans équivalent produit le texte ⊘ du § 5 ; un modèle déclaré pour un autre format s'ouvre quand même, avec un avertissement.
- **✚ Nouveau modèle** : exemple prérempli selon le format chargé (UML : « Pour chaque bloc du système : description, ports et flux, activités allouées, exigences satisfaites, `ibd` dont il est la cible »).

## 8. Réalisation, tests, documentation

1. Prérequis : `capHomeReps()` → vues des lecteurs (et vérifier le glisser-déposer de 🔲 vers un 📑 dossier).
2. Module `src/js/100-rapports-formats.js` (format, niveaux, table des sigles, `capDosSujetUml`, `capDosSujetSy`, outils `o.*` des lecteurs, texte ⊘) ; appels ajoutés dans 63 / 66 derrière `o.fmt!=='capella'`. Rien n'est exécuté au chargement : les versions `--format capella` (sans lecteurs) restent cohérentes.
3. Piste 2 dans le même module (types, filtres, contenus par format) + `CAP_RAP_*` complétés.
4. Tests : nouveau `tests/rapports.js` (Playwright, comme oracles) qui génère les cinq plans et le modèle par défaut sur Satellite, Ascenseur, Boutique, Rover, Drone-2026x, Drone-ea et VehiculeDemo et compare une empreinte (titres, nombres de blocs par sorte, éléments listés) à `tests/oracles/rapports/<modèle>.json` ; `node tests/oracles.js` inchangé sur IFE et AIDA.
5. Aide FR / EN (onglet 📘 Rapports), `en-dictionnaire.json`, `docs/NOTES-TECHNIQUES.md`, `node tools/index.js`, `node tools/textes.js --en` ; visite guidée inchangée (aucune sous-vue nouvelle).

## 9. Points à trancher

1. **Chapitres sans équivalent** : les garder avec la mention ⊘ (proposé, convention MIL-STD-498) ou les retirer du rapport ?
2. **SysML v2 dans la même livraison que UML / SysML v1 ?** Il n'a pas de moteurs d'analyse (92 à 97 ne lisent que UML) : l'adaptateur lit directement la lecture du lecteur. Proposé : oui, mais plus simple (pas de niveaux, pas de séquences).
3. **Choix du système** : heuristique (sujet des cas → contexte d'ibd → racine) **et** fenêtre de périmètre ouverte pour **tous** les plans sur UML / SysML (pas seulement SSS / SSDD), le système proposé en premier. D'accord ?
4. **Bloc ⇶** : pour UML, un nouveau bloc de dossier « ⇶ Traçabilité par niveaux » (dessin SVG de 95, exporté en HTML / Word) — ou, plus simple, un tableau des liens ?
