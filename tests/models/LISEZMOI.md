# Modèles de test — provenance et licences

Ces deux modèles Capella publics servent uniquement aux tests d'Arcalyse (`node tests/smoke.js`) et aux captures du README.
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
- Pour IFE, les diagrammes `.aird` sont repris, compressés en gzip (`.aird.gz`), pour tester la vue 🗺 Diagrammes ; pour AIDA, seul le fichier sémantique `.capella` est repris.

Conformément à la licence CC BY-SA 4.0, toute adaptation de `AIDA.capella` redistribuée doit l'être sous la même licence,
avec la mention de l'auteur ci-dessus. Conformément à l'EPL 2.0, le modèle IFE est redistribué sous EPL 2.0, avec le texte de la licence.

## Modèle SysML v2

| Fichier | Origine | Auteur | Licence |
|---|---|---|---|
| `VehiculeDemo.sysml` | [romain-lescole/Arcature](https://github.com/romain-lescole/Arcature) (`tests/models/sysml/VehiculeDemo.sysml`, modèle de démonstration écrit pour Arcature) | Romain Lescole | **Apache 2.0** (licence d'Arcature, identique à celle d'Arcalyse) |

Il sert au test du lecteur SysML v2 embarqué (`node tests/sysml.js`), aux oracles (`tests/oracles/VehiculeDemo.json`) et au test navigateur.

## Modèles synthétiques (sous-dossier `bibliotheque/`)

`Modele.capella` et `Bibliotheque.capella` sont écrits à la main pour tester 📚 Bibliothèques (72) : le modèle déclare deux bibliothèques (une référencée, une sans référence), réalise une activité de la bibliothèque, vise une cible absente de celle-ci et une bibliothèque non déclarée (enfant `href`). Ils sont placés dans un sous-dossier pour ne pas entrer dans `tests/oracles.js` (racine seulement) ; licence Apache 2.0 comme Arcalyse.
