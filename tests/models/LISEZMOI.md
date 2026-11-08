# Modèles de test — provenance et licences

Ces modèles publics servent uniquement aux tests d'Arcalyse (`node tests/smoke.js`) et aux captures du README.
Ils **ne font pas partie d'Arcalyse** : ils ne sont pas embarqués dans le fichier livré et restent sous leur propre licence,
distincte de la licence Apache 2.0 du logiciel.

| Fichier | Origine | Auteur | Licence |
|---|---|---|---|
| `In-Flight_Entertainment_System.capella` | [dbinfrago/Capella-IFE-sample](https://github.com/dbinfrago/Capella-IFE-sample) (fichier `In-Flight Entertainment System.capella`) | Copyright The Capella contributors | **Eclipse Public License 2.0** — texte complet : [`LICENSES/EPL-2.0.txt`](LICENSES/EPL-2.0.txt) |
| `In-Flight_Entertainment_System.aird.gz` | même dépôt (fichier `In-Flight Entertainment System.aird`), compressé en gzip | Copyright The Capella contributors | **Eclipse Public License 2.0** — texte complet : [`LICENSES/EPL-2.0.txt`](LICENSES/EPL-2.0.txt) |
| `AIDA.capella` | [AIDA/AIDAArchitecture](https://sahara.irt-saintexupery.com/AIDA/AIDAArchitecture) — IRT Saint Exupéry, projet MOISE (AIDA : *Aircraft Inspection by Drone Assistant*) | Copyright (c) 2016-2022 IRT AESE (IRT Saint Exupéry) | **Creative Commons BY-SA 4.0** — https://creativecommons.org/licenses/by-sa/4.0/ |

## Modifications

- Les fichiers ont été renommés (espaces remplacés par `_`, nom raccourci pour AIDA).
- `AIDA.capella` est au format **Capella 7.0** alors que la version d'origine (V4.5) a été produite avec Capella 5.1 :
  il a été migré par l'outil de migration de Capella, sans modification volontaire du contenu.
- `In-Flight_Entertainment_System.capella` est au format Capella 7.0.1, tel qu'enregistré par Capella ; contenu non modifié volontairement.
- Pour IFE, les diagrammes `.aird` sont repris, compressés en gzip (`.aird.gz`), pour tester la vue 🔲 Diagrammes ; pour AIDA, seul le fichier sémantique `.capella` est repris.

Conformément à la licence CC BY-SA 4.0, toute adaptation de `AIDA.capella` redistribuée doit l'être sous la même licence,
avec la mention de l'auteur ci-dessus. C'est le cas de l'oracle `tests/oracles/AIDA.json`, relevé tiré de ce modèle (noms
et comptes d'éléments) : Copyright (c) 2016-2022 IRT AESE (IRT Saint Exupéry), CC BY-SA 4.0. De même, l'oracle
`tests/oracles/In-Flight_Entertainment_System.json` reste sous EPL 2.0, comme le modèle IFE. Conformément à l'EPL 2.0, le modèle IFE est redistribué sous EPL 2.0, avec le texte de la licence.

## Modèle SysML v2

| Fichier | Origine | Auteur | Licence |
|---|---|---|---|
| `VehiculeDemo.sysml` | [romain-lescole/Arcature](https://github.com/romain-lescole/Arcature) (`tests/models/sysml/VehiculeDemo.sysml`, modèle de démonstration écrit pour Arcature) | Romain Lescole | **Apache 2.0** (licence d'Arcature, identique à celle d'Arcalyse) |

Il sert au test du lecteur SysML v2 embarqué (`node tests/sysml.js`), aux oracles (`tests/oracles/VehiculeDemo.json`) et au test navigateur.

## Modèles UML / SysML v1 (sous-dossier `uml/`)

| Fichier | Origine | Auteur | Licence |
|---|---|---|---|
| `uml/Bibliotheque.uml`, `uml/Bibliotheque.notation` | [romain-lescole/Arcature](https://github.com/romain-lescole/Arcature) (`tests/models/uml/`) : modèle UML écrit comme Eclipse UML2 / Papyrus et ses cinq diagrammes de Papyrus, écrits pour Arcature | Romain Lescole | **Apache 2.0** |
| `uml/Rover-cameo.xmi` | Arcature (`tests/models/sysml1/`) : modèle SysML v1 écrit dans le style de l'export XMI de Cameo (exigences, blocs, satisfy) | Romain Lescole | **Apache 2.0** |
| `uml/Cartes-cameo.xmi` | Arcature (`tests/models/sysml1/`) : modèle SysML v1 écrit pour les tests des Relation Map de Cameo (blocs et parts, activités et appels, cinq définitions «RelationMap» au format relevé sur un projet de CATIA Magic 2026x) ; aucun texte ni fichier de Cameo repris | Romain Lescole | **Apache 2.0** |
| `uml/Drone-2026x.mdzip` | Arcature (`tests/models/sysml1/`, `node tools/mdzip-exemple.js`) : projet CATIA Magic 2026x d'essai, deux diagrammes ; rien n'est repris des exemples de l'outil | Romain Lescole | **Apache 2.0** |
| `uml/Drone-ea.qea` | Arcature (`tests/models/ea/`, `node tools/ea-exemple.js`) : projet Enterprise Architect d'essai (schéma d'EA 16, aucune donnée de Sparx) | Romain Lescole | **Apache 2.0** |
| `uml/Satellite-sysml1.xmi` | Écrit pour Arcalyse dans le style de l'export XMI de Cameo : blocs à ports orientés par leurs FlowProperty, connecteurs (assemblage, délégation), ItemFlow, allocations, activités à pins et partitions, signaux sur des ports, machines à états, interactions, exigences (satisfy, verify, deriveReqt, refine) ; chaque contrôle de 🧱 Blocs & ports, ƒ Activités & flux, 🧾 Exigences SysML, 🚦 Machines à états, 🎬 Interactions, 🎯 Cas d'utilisation, ⇶ Traçabilité par niveaux, 🗃 Interfaces, ⚖ Budgets et 🔒 Paramétrique (90 à 95) y est déclenché au moins une fois | Romain Lescole | **Apache 2.0** |
| `uml/Boutique-uml.xmi` | Écrit pour Arcalyse (XMI de l'OMG, UML logiciel) : paquetages et dépendances (dont un cycle), classes, héritage (dont un cycle), interfaces réalisées, requises ou inutilisées, contraintes OCL, déploiement ; chaque contrôle de 📦 Paquetages & classes (95) y est déclenché au moins une fois | Romain Lescole | **Apache 2.0** |
| `uml/rhapsody/Thermostat/` | Arcature (`tests/models/rhapsody/`) : projet IBM Rhapsody au format texte (`.rpy`, unités `.sbs`, `filesTable.dat`) écrit à la main d'après le format relevé, sans rien reprendre des exemples d'IBM | Romain Lescole | **Apache 2.0** |

Ils servent au test du lecteur UML / SysML v1 embarqué (`node tests/uml.js`), aux oracles (`tests/oracles/Bibliotheque.json`,
`Rover-cameo.json`, `Drone-2026x.json`, `Drone-ea.json`, `Satellite-sysml1.json`, `Boutique-uml.json` : modèles ouverts seuls) et au test navigateur. Aucun modèle d'exemple
livré avec Cameo, Enterprise Architect ou Rhapsody (sous la licence de leur éditeur) n'est repris ; les exemples d'IBM servent
en local seulement (`tests/models/rhapsody-local/`, ignoré par git).

## Modèles synthétiques (sous-dossier `bibliotheque/`)

`Modele.capella` et `Bibliotheque.capella` sont écrits à la main pour tester 📚 Bibliothèques (72) : le modèle déclare deux bibliothèques (une référencée, une sans référence), réalise une activité de la bibliothèque, vise une cible absente de celle-ci et une bibliothèque non déclarée (enfant `href`). Ils sont placés dans un sous-dossier pour ne pas entrer dans `tests/oracles.js` (racine seulement) ; licence Apache 2.0 comme Arcalyse.

## Projet UML sur plusieurs fichiers (sous-dossier `uml-multi/`)

`Systeme.uml`, `lib/Types.uml`, `Sous-systeme.uml` et `Profil.profile.uml` sont écrits à la main, dans le style d'Eclipse UML2 / Papyrus, pour tester le relevé des références vers d'autres fichiers (88) : le modèle principal importe un paquetage et vise une généralisation et un type de `lib/Types.uml`, applique `Profil.profile.uml`, range un sous-modèle contrôlé dans `Sous-systeme.uml`, vise un fichier absent (`Station.uml`), un module de Cameo (`Journal.mdxml`, format non lu) et les types standard (`pathmap://`, non relevés). Hors oracles (sous-dossier) ; licence Apache 2.0 comme Arcalyse.

## Exigences ReqIF (sous-dossier `reqif/`)

| Fichier | Origine | Auteur | Licence |
|---|---|---|---|
| `reqif/ExigencesDemo.reqif` | [romain-lescole/Arcature](https://github.com/romain-lescole/Arcature) (`tests/models/reqif/`) : exigences de démonstration écrites pour Arcature (tous les types de données, titres de chapitre, double place, objet hors spécification, relations, groupe) | Romain Lescole | **Apache 2.0** |
| `reqif/ExigencesImages.reqifz` | Arcature (`tests/models/reqif/`, construite par `tests/reqifz-exemple.js`) : archive écrite pour Arcature — deux spécifications, chapitres, textes XHTML avec une image, un objet OLE et son image de repli (écriture de DOORS), une image absente, une pièce jointe PDF, un tableau ; relations « dérive de » et « raffine » | Romain Lescole | **Apache 2.0** |

Elles servent au test du lecteur ReqIF embarqué (oracles, test navigateur, changement de langue).
