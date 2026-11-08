# 📑 Exigences ReqIF dans Arcalyse

Arcalyse lit des exigences **ReqIF** (Requirements Interchange Format de l'OMG, 1.0 à 1.2), en lecture seule et hors ligne :

| Fichier | Outil | Images des textes |
|---|---|---|
| `.reqifz` | archive exportée par DOORS, Polarion, Jama, codeBeamer… : un ou plusieurs `.reqif` et leurs pièces jointes | oui |
| `.reqif` | Capella (Requirements Viewpoint), Enterprise Architect, ReqIF Studio… | non : choisir le `.reqif` avec ses images, ou ouvrir le dossier |
| dossier | un ou plusieurs `.reqif` et leurs images (📁 Dossier du projet, ou fichiers déposés ensemble) | oui |

La lecture est faite par le **lecteur ReqIF d'Arcature** (`src/vendor/arcature-lecteur-reqif*.js`, `window.ArcatureLecteurReqif`,
Apache 2.0, même auteur), repris par `node build.js --lecteur-reqif <dossier d'Arcature>` (origine dans
`src/vendor/LISEZMOI-lecteur-reqif.md` ; mode d'emploi et contrat du lecteur : `docs/LECTEUR-REQIF.md` et
`docs/api/lecteur-reqif.d.ts` d'Arcature). Il est embarqué dans les quatre livrables (≈ 180 Ko par langue).

## Intégration (module `src/js/101-reqif.js`)

- **Ouverture** : `capLoadFile` (20) aiguille `.reqif` / `.reqifz` vers `capReqifOuvrir` ; plusieurs fichiers déposés ou choisis,
  ou un dossier (`capProjectFromFiles`, 54) vers `capReqifOuvrirDossier` (les `.reqif` et les pièces jointes `CAP_RQ_PIECES`).
- **Même chemin que les lecteurs SysML / UML** : `capSysmlAppliquer(lecture, nom, ArcatureLecteurReqif, 'reqif')` (87),
  `_capSysml.format === 'reqif'` (`capSyReqif()` ; `capSyUml()` est faux pour ReqIF). Document XML « façon Capella » écrit par
  `capReqifVersXml` : balise `reqif:<type>` par élément (SpecObject, Specification, SpecHierarchy, SpecRelation…), `name`,
  `description` (HTML du texte XHTML, images marquées `data-reqif`), `nomCourt` (ReqIF.ForeignID), `stereotypes` (type ReqIF),
  `numero` (chapitre), `specification`, une colonne par attribut ReqIF (nom XML tiré du nom de la définition, `capReqifCle`).
- **Images** : jamais recopiées dans les descriptions ; `capSafeHtml` (25) remplace `img[data-reqif]` par une adresse `blob:`
  (`capReqifImgSrc`, une par image, libérées au changement de modèle) ou `data:` dans un document exporté ; la 💾 page enregistrée
  reçoit des `data:` (`capReqifPageXml`, appelée par `capBuildPageHtml`).
- **Vue 📑 ReqIF** (`ana:reqif`, menu 🏗 Architecture) : 📄 Document, ▤ Exigences (et ▤ Ouvrir dans ▤ Tableau :
  `capReqifVersTableau`, lignes dans l'ordre du document), 🔗 Relations, 🧩 Types, 🖼 Pièces jointes, 🩺 Contrôles
  (`capReqifChecks`, repris par 💚 Santé et le 🩺 profil).
- **Ailleurs** : section du panneau de détail (`capReqifDetail` via `capSyDetail`), icônes (`capReqifIcone` / `capReqifIconeType`
  appelées par `capIco` / `capIcoType`), accueil (`capReqifCasesAccueil`, `capReqifTaches`), ▦ Matrice (format `reqif`, groupes
  SPEC / REL / TYPE, préréglage « Exigences × exigences »), 📘 Rapports (familles `exigences`, `titres`, `specs` de 100), tableau
  de bord (`capReqifDashCatalog`), 🌐 changement de langue (sources `rq` / `rqd`), ▤ Tableau en 🖼 Texte riche (21).

## Tests

- `node tests/oracles.js` : `tests/models/reqif/ExigencesDemo.reqif` et `ExigencesImages.reqifz` (objets, spécifications, relations,
  contrôles, images citées et résolues).
- `node tests/langue.js` : `ExigencesImages.reqifz` gardé au changement de langue.

## Pas encore

Rapprochement avec un modèle Capella / SysML / UML ouvert en même temps (exigences absentes, modifiées, non couvertes :
`docs/IDEES.md`), 🔄 suivi du fichier, ⚖ comparaison de deux versions ReqIF, écriture.
