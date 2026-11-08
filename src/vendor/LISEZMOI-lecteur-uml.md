# Lecteur UML / SysML v1 d'Arcature (fichiers tiers, ne pas modifier à la main)

- Fichiers : `arcature-lecteur-uml.js` (français) et `arcature-lecteur-uml-en.js` (anglais), ≈ 1367 Ko chacun.
- Licence : Apache 2.0 (aucun fichier sous EPL-2.0 : refusé par le build d'Arcature) ; contient des noms et des textes de
  contraintes tirés des documents normatifs de l'OMG (UML.xmi, SysML.xmi, UAF.xmi), repris selon la licence des spécifications de l'OMG.
- Origine : dépôt `romain-lescole/Arcature`, branche `claude/peaceful-goldberg-qaxohw`, commit `58f51679700667638e061ca9a4bee22ce31afc3d`, repris le 2026-11-07.
- Assemblés dans Arcature par `node build.js --lecteur-uml` et `node build.js --lecteur-uml --lang en` ; recopiés ici par
  `node build.js --lecteur-uml <dossier d'Arcature>` (qui réécrit cette note).
- Mode d'emploi et contrat : `docs/UML.md` (Arcalyse), `docs/LECTEUR-UML.md` et `docs/api/lecteur-uml.d.ts` (Arcature).
