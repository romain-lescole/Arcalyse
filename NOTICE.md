# Arcalyse — avis de droit d'auteur

Copyright (C) 2026 Romain Lescole — https://github.com/romain-lescole/arcalyse

Ce programme est un logiciel libre, distribué selon les termes de l'**Apache License, Version 2.0**
(texte complet dans le fichier `LICENSE`, ou https://www.apache.org/licenses/LICENSE-2.0).

Sauf obligation légale ou accord écrit, le logiciel est distribué « EN L'ÉTAT », **SANS GARANTIE NI CONDITION
D'AUCUNE SORTE**, expresse ou implicite. Voir la licence pour les droits et limitations applicables.

Historique des licences : jusqu'à la version 1.5 incluse, PolyForm Strict License 1.0.0 ; de la version 1.6 à la
version 2.2 incluse, GNU General Public License version 3 ; à partir de la version 2.2.1, Apache License 2.0.

## Composants tiers

D3.js v7.9.0 (`src/vendor/d3.min.js`, embarqué dans le fichier livré) — licence ISC, Copyright 2010-2023 Mike Bostock.
La licence ISC est compatible avec l'Apache License 2.0 ; son texte est reproduit dans la fenêtre ℹ À propos.

Visionneuse de diagrammes d'Arcature (`src/vendor/arcature-visionneuse*.js`, embarquée dans le fichier livré ; origine dans
`src/vendor/LISEZMOI-visionneuse.md`) —
projet frère, même auteur et titulaire des droits, également sous Apache License 2.0, **sauf trois de ses modules**, sous
Eclipse Public License 2.0 : `23-styles-capella.js` (données et expressions des descriptions de diagrammes de Capella),
`26-diagrammes.js` (comportements des outils de diagramme de Capella transcrits) et `27-icones.js` (voir « Icônes »
ci-dessous) — adaptations d'œuvres d'Eclipse Capella (© THALES GLOBAL SERVICES et les contributeurs de Capella) et
d'Eclipse Sirius. Chacun de ces modules porte son en-tête `SPDX-License-Identifier: EPL-2.0` dans le fichier embarqué.
Texte : `LICENSES/EPL-2.0.txt`. Arcature prévoit de les réécrire en salle blanche pour les ramener
sous Apache 2.0 (`docs/LICENCES.md` d'Arcature).

Lecteur SysML v2, lecteur UML / SysML v1 et lecteur ReqIF d'Arcature (`src/vendor/arcature-lecteur-sysml*.js`, `src/vendor/arcature-lecteur-uml*.js`,
`src/vendor/arcature-lecteur-reqif*.js`, embarqués dans le fichier livré ; origine notée dans `src/vendor/LISEZMOI-lecteur-*.md`) — projet frère, même auteur et titulaire des
droits, sous Apache License 2.0. Le lecteur UML / SysML v1 ne contient aucun fichier sous Eclipse Public License (le build d'Arcature
le refuse).

## Informations d'interopérabilité reprises

Pour lire les fichiers des autres outils, Arcalyse reprend des **noms** (et non des textes ni du code) :
- noms des types du métamodèle Capella et leur héritage (`src/js/79-scripts-metamodele.js`), relevés dans les sources de
  Capella v7.0.1 — Copyright Thales et les contributeurs de Capella, Eclipse Public License 2.0 ;
- noms des paquetages et de leurs membres de la bibliothèque standard SysML v2 (index du lecteur SysML d'Arcature), relevés
  dans `sysml.library` du dépôt SysML-v2-Release — Eclipse Public License 2.0.

Les descriptions des types Capella affichées par Arcalyse (`CAP_HUMAN_NAMES`, et leur traduction anglaise) sont rédigées
pour Arcalyse.

Documents normatifs de l'Object Management Group (noms, et aussi des textes) : le lecteur UML / SysML v1 contient les noms des métaclasses d'UML 2.5.1
(`UML.xmi`), des stéréotypes de SysML 1.7 et d'UAF 1.2 (`SysML.xmi`, `UAF.xmi`) et le texte des contraintes de ces profils.
Copyright © Object Management Group, Inc. et les sociétés qui ont soumis ces spécifications. Repris selon la licence des
spécifications de l'OMG, qui permet de créer et de distribuer des logiciels fondés sur la spécification (UML 2.5.1,
formal/17-12-05, et SysML 1.7, formal/24-01-07, section « Use of specification — Licenses »). Arcalyse ne revendique aucune
conformité à ces spécifications.

## Modèles de test (`tests/models/`)

Ils ne font pas partie du logiciel et restent sous leur propre licence (détails dans `tests/models/LISEZMOI.md`) :
- `In-Flight_Entertainment_System.capella` — Copyright The Capella contributors — Eclipse Public License 2.0 ;
- `AIDA.capella` — Copyright (c) 2016-2022 IRT AESE (IRT Saint Exupéry) — Creative Commons BY-SA 4.0 ;
- `VehiculeDemo.sysml`, les modèles UML / SysML v1 de `tests/models/uml/` et les exigences ReqIF de `tests/models/reqif/` — écrits pour Arcature (même auteur) — Apache 2.0.

## Icônes

Les icônes des éléments Capella et des diagrammes sont dessinées par la visionneuse d'Arcature (module
`src/js/27-icones.js` d'Arcature, embarqué dans `src/vendor/arcature-visionneuse*.js`). Ce sont des **adaptations en SVG
des icônes d'Eclipse Capella** (formes, sigles et couleurs repris ; © 2006-2020 THALES GLOBAL SERVICES et les contributeurs
de Capella) et des icônes génériques d'Eclipse Sirius : elles sont distribuées sous **Eclipse Public License 2.0**
(texte : `LICENSES/EPL-2.0.txt`), et non sous Apache 2.0. L'EPL s'applique à ce module seulement.

Les icônes de complément d'Arcalyse (`84-icones-complements.js`) et les icônes SysML v2 (dessinées une seule fois dans
Arcature — module `sysml/35-icones.js`, raisons des dessins dans son `docs/sysml/ICONES.md` — et reprises par le lecteur
SysML v2 embarqué) sont des dessins écrits pour Arcalyse et Arcature, sous Apache 2.0 : aucune image ni aucun fichier
d'icône de Capella, de SysON ou d'un autre outil n'y est repris.

Icônes UML et SysML v1 : jeu d'icônes d'Arcature (dessins propres d'après la notation graphique des normes UML 2.5.1 et SysML 1.7,
embarqués dans le lecteur UML / SysML v1) ; le jeu de remplacement « Eclipse UML2 » d'Arcature (icônes d'Eclipse UML2 redessinées par
Papyrus Web, EPL-2.0) n'est pas repris.

Icônes des genres de diagrammes et de vues (UML, SysML v1, SysML v2 : une couleur par genre, étiquette du cadre marquée « S » pour
SysML) : dessins propres d'Arcature, fournis par les lecteurs embarqués, sous Apache 2.0.

## Marques

Capella et ARCADIA sont des marques de leurs détenteurs respectifs (Eclipse Foundation, Thales) ; SysON est un projet de l'Eclipse Foundation (Obeo).
UML®, SysML®, UAF®, XMI® et OMG® sont des marques déposées de l'Object Management Group, Inc. ; Cameo, MagicDraw et CATIA Magic, de
Dassault Systèmes ; Enterprise Architect, de Sparx Systems ; Eclipse et Papyrus, de l'Eclipse Foundation. Elles ne servent qu'à désigner
les formats de fichiers lus : les formats de Cameo (`.mdzip`) et d'Enterprise Architect (`.qea`) sont lus pour l'interopérabilité, sans
reprendre ni décompiler aucun code, bibliothèque ou fichier de ces outils.
Arcalyse est un outil indépendant, compatible avec les modèles Capella, SysML v2, UML et SysML v1 : ni officiel, ni affilié.
