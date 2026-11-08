# Visionneuse de diagrammes Capella d'Arcature (fichiers tiers, ne pas modifier à la main)

- Fichiers : `arcature-visionneuse.js` (français) et `arcature-visionneuse-en.js` (anglais), ≈ 787 Ko chacun.
- Licence : Apache 2.0, sauf les modules `23-styles-capella.js`, `26-diagrammes.js` et `27-icones.js` (adaptés d'Eclipse Capella
  et d'Eclipse Sirius) : Eclipse Public License 2.0 (en-tête de chaque module dans le fichier, `NOTICE.md`, `LICENSES/EPL-2.0.txt`).
- Origine : dépôt `romain-lescole/Arcature`, branche `main`, commit `049411011cba869733c9f5c3fc08696544e7ec83`, repris le 2026-11-05.
- Assemblés dans Arcature par `node build.js --visionneuse` et `node build.js --visionneuse --lang en` ; recopiés ici par
  `node build.js --visionneuse <dossier d'Arcature>` (qui réécrit cette note).
- API : `src/visionneuse/socle-fin.js` (Arcature) ; intégration : `src/js/54-diagrammes.js` (Arcalyse).
