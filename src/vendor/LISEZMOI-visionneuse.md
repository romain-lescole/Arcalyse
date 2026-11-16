# Visionneuse de diagrammes Capella d'Arcature (fichiers tiers, ne pas modifier à la main)

- Fichiers : `arcature-visionneuse.js` (français) et `arcature-visionneuse-en.js` (anglais), ≈ 812 Ko chacun.
- Licence : Apache 2.0, sauf les modules `23-styles-capella.js`, `26-diagrammes.js` et `27-icones.js` (adaptés d'Eclipse Capella
  et d'Eclipse Sirius) : Eclipse Public License 2.0 (en-tête de chaque module dans le fichier, `NOTICE.md`, `LICENSES/EPL-2.0.txt`).
- Origine : dépôt `romain-lescole/Arcature`, branche `main`, commit `650c8cbc37764cc480e7166a990f2c9981ea0f5d`, repris le 2026-11-16.
- Assemblés dans Arcature par `node build.js --visionneuse` et `node build.js --visionneuse --lang en` ; recopiés ici par
  `node build.js --visionneuse <dossier d'Arcature>` (qui réécrit cette note).
- API : `src/visionneuse/socle-fin.js` (Arcature) ; intégration : `src/js/54-diagrammes.js` (Arcalyse).
