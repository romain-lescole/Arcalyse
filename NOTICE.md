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

Visionneuse de diagrammes d'Arcature (`src/vendor/arcature-visionneuse*.js`, embarquée dans le fichier livré) —
projet frère, même auteur et titulaire des droits, également sous Apache License 2.0.

Lecteur SysML v2 d'Arcature (`src/vendor/arcature-lecteur-sysml*.js`, embarqué dans le fichier livré) — même auteur et
titulaire des droits, également sous Apache License 2.0 (origine dans `src/vendor/LISEZMOI-lecteur-sysml.md`).

## Informations d'interopérabilité reprises

Pour lire les fichiers des autres outils, Arcalyse reprend des **noms** (et non des textes ni du code) :
- noms des types du métamodèle Capella et leur héritage (`src/js/79-scripts-metamodele.js`), relevés dans les sources de
  Capella v7.0.1 — Copyright Thales et les contributeurs de Capella, Eclipse Public License 2.0 ;
- noms des paquetages et de leurs membres de la bibliothèque standard SysML v2 (index du lecteur SysML d'Arcature), relevés
  dans `sysml.library` du dépôt SysML-v2-Release — Eclipse Public License 2.0.

Les descriptions des types Capella affichées par Arcalyse (`CAP_HUMAN_NAMES`, et leur traduction anglaise) sont rédigées
pour Arcalyse.

## Modèles de test (`tests/models/`)

Ils ne font pas partie du logiciel et restent sous leur propre licence (détails dans `tests/models/LISEZMOI.md`) :
- `In-Flight_Entertainment_System.capella` — Copyright The Capella contributors — Eclipse Public License 2.0 ;
- `AIDA.capella` — Copyright (c) 2016-2022 IRT AESE (IRT Saint Exupéry) — Creative Commons BY-SA 4.0.

## Icônes

Les icônes des éléments (Capella et SysML v2) et des diagrammes sont des dessins SVG originaux, écrits pour Arcalyse et Arcature (visionneuse d'Arcature, modules `84-icones-complements.js` et `87-sysml.js`) : aucune image ni aucun fichier d'icône de Capella, de SysON ou d'un autre outil n'est repris. Elles suivent seulement les conventions visuelles usuelles des notations (formes, couleurs par couche ou par famille), pour que l'utilisateur s'y retrouve.

## Marques

Capella et ARCADIA sont des marques de leurs détenteurs respectifs (Eclipse Foundation, Thales) ; SysON est un projet de l'Eclipse Foundation (Obeo).
Arcalyse est un outil indépendant, compatible avec les modèles Capella : ni officiel, ni affilié.
