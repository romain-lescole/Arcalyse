# Idées à réaliser

Pistes validées avec l'utilisateur, à reprendre plus tard.

## ⚖ Licences : visionneuse réécrite en salle blanche (après Arcature, phases L.2 à L.5)

Audit des licences du 2026-10-28 : trois modules de la visionneuse d'Arcature embarquée (`23-styles-capella`,
`26-diagrammes`, `27-icones`) sont des adaptations d'œuvres d'Eclipse Capella / Sirius, donc sous **EPL-2.0** (mentionné
dans `NOTICE.md`, ℹ À propos et l'en-tête de la page). Arcature va les réécrire en salle blanche (`docs/LICENCES.md`
d'Arcature : une session écrit la spécification du comportement, une autre le code sans voir celui de Capella ; tests
comme oracle). Ensuite, côté Arcalyse :
- reprendre la visionneuse (`node build.js --visionneuse`) — elle a beaucoup évolué depuis la dernière reprise (≈ 340 Ko →
  ≈ 770 Ko) : à traiter comme une mise à jour à part, avec `node tests/smoke.js` et `node tests/oracles.js` ;
- retirer les mentions EPL devenues inutiles (`NOTICE.md`, À propos, en-tête de `src/index.html`, aide) ;
- les icônes (27) restent sous EPL tant qu'Arcature n'a pas dessiné un jeu d'icônes propre.
- En attendant, la visionneuse embarquée garde son ancien en-tête « Licence Apache 2.0 » : la prochaine reprise apportera
  les en-têtes EPL dans le fichier lui-même.

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
