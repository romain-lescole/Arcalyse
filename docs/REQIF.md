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
`docs/api/lecteur-reqif.d.ts` d'Arcature). Il est embarqué dans la version ReqIF seule `arcalyse-reqif.html` et dans la version complète `arcalyse-complet.html` (≈ 180 Ko par langue) ; les versions Capella, SysML v2 et UML ne l'ont pas.

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

## Plusieurs fichiers, encodage, titres, valeurs par défaut (lecteur repris le 16/11/2026)

Banc d'essai : les 89 fichiers du dépôt `strictdoc-project/reqif` (Apache 2.0 : DOORS, Polarion, ReqIF Studio, Enterprise Architect,
Eclipse RMF, cas du ReqIF Implementor Forum, fichier de 19 Mo à 10 000 objets) ouverts dans Arcalyse — toutes les vues, panneau de
détail, ▤ Tableau, 💚 Santé — et relus à part par `DOMParser` : valeurs d'attributs, plans et relations identiques. Les fichiers
n'ont pas été recopiés dans le dépôt. Corrections qui en sortent, faites dans le lecteur d'Arcature puis reprises ici :

- **Archive ou dossier à plusieurs `.reqif`** : le contenu des fichiers après le premier était écarté (dossiers `§…` de même
  identifiant dans chaque fichier). Chaque fichier garde maintenant ses dossiers (`§specifications·2`…), les types et types de
  données de même identifiant sont repris une fois, une relation peut relier des objets de deux fichiers (cas TC1700).
- **Encodage** annoncé par la déclaration XML (`ISO-8859-1`, `windows-1252`…), UTF-16 sans marque d'ordre.
- **Titre de chapitre** : objet nommé par `ReqIF.ChapterName` **et sans texte** ; Polarion nomme aussi ses exigences par
  `ReqIF.ChapterName` : elles passaient toutes pour des titres et échappaient aux contrôles.
- **Valeur par défaut** d'une définition (`DEFAULT-VALUE`) : `attributs(id)[].defaut`, `types()[].attributs[].defaut` ; montrée
  dans le panneau de détail (« Valeurs par défaut ») et dans 🧩 Types. Les colonnes et les exports gardent les valeurs écrites.
- **Fichier hors schéma** (objets ailleurs que dans `SPEC-OBJECTS`, pas de `REQ-IF-CONTENT`) : avertissement `RQ-STRUCT` au lieu
  d'un modèle vide sans explication.
- Côté Arcalyse (101) : une spécification sans `LONG-NAME` ni `ReqIF.Name` est nommée par son identifiant (`capReqifSpecNom`) ;
  ses objets n'étaient plus distingués des objets hors spécification dans les contrôles.

## Tests

- `node tests/oracles.js` : `tests/models/reqif/ExigencesDemo.reqif`, `ExigencesImages.reqifz` (objets, spécifications, relations,
  contrôles, images citées et résolues) et `ExigencesModules.reqifz` (deux modules : ISO-8859-1, exigences nommées par
  ReqIF.ChapterName, valeurs par défaut, spécification sans nom, relation d'un fichier à l'autre ; écrite par
  `node tests/models/reqif/ExigencesModules.gen.js`).
- `node tests/langue.js` : `ExigencesImages.reqifz` gardé au changement de langue.

Depuis la 5.2 : 🔄 suivi du fichier (`.reqif` / `.reqifz` relu par le lecteur ; un dossier de `.reqif` n'est pas suivi) et
⚖ comparaison de deux versions ReqIF (`node tests/suivi.js`).

## Pas encore

Rapprochement avec un modèle Capella / SysML / UML ouvert en même temps (exigences absentes, modifiées, non couvertes :
`docs/IDEES.md`), écriture.
