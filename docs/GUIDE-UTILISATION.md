# Guide d'utilisation d'Arcalyse

> **Arcalyse** — votre modèle (Capella, SysML v2, UML ou SysML v1, exigences ReqIF), sous toutes ses coutures.
> Ce guide passe en revue **tous les menus, sous-menus, vues et fenêtres** de l'application, explique ce que fait chaque commande et **comment s'en servir** (clics, glisser-déposer, raccourcis), avec des captures d'écran.

Chaque chapitre est un fichier à part (dossier [`guide/`](guide/)) ; un lien **◀ ▶** en haut et en bas de chaque page mène au chapitre précédent ou suivant.

Les captures ont été faites dans le thème **Clair**, avec le modèle d'exemple public *In-Flight Entertainment System* (IFE) livré avec Capella et ses diagrammes (`.aird`) ; d'autres modèles d'essai servent là où IFE n'a pas de données : *AIDA* (🧾 Exigences, 🎛 Propriétés), `Vehicule-150.capella` (🎚 Variantes), `ExigencesImages.reqifz` (📑 ReqIF), `VehiculeDemo.sysml` (familles de l'Explorateur) et `Satellite-sysml1.xmi` (rapports SysML). Elles sont régénérées par `node tools/guide-captures.js` (voir [Annexe C](guide/annexe-c-captures.md)). Sur les captures annotées, les **pastilles rouges numérotées** renvoient aux tableaux qui les suivent.

---

## Sommaire

1. [Présentation et prérequis](guide/01-presentation.md)
2. [Démarrer : écran d'accueil et ouverture d'un modèle](guide/02-demarrer.md)
   <br><sub>[Les quatre façons d'ouvrir un modèle](guide/02-demarrer.md#les-quatre-façons-douvrir-un-modèle)</sub>
3. [L'interface : barre principale et menus](guide/03-interface.md)
   <br><sub>[La barre principale](guide/03-interface.md#31-la-barre-principale) · [Menus des vues, épingles et Ctrl+K](guide/03-interface.md#32-menus-des-vues-épingles-et-ctrlk) · [📁 Fichier](guide/03-interface.md#33--fichier) · [⚙ Préférences](guide/03-interface.md#34--préférences) · [⬇ Exports Excel](guide/03-interface.md#35--exports-excel) · [🩺 Profil de contrôles](guide/03-interface.md#36--profil-de-contrôles) · [◀ ▶ Historique de navigation](guide/03-interface.md#37---historique-de-navigation)</sub>
4. [🏠 Accueil du projet](guide/04-accueil.md)
   <br><sub>[🏠 Projet](guide/04-accueil.md#41--projet) · [☑ Check-lists & plans de revue](guide/04-accueil.md#42--check-lists--plans-de-revue) · [⧉ Fenêtres séparées et glisser-déposer depuis les vues](guide/04-accueil.md#43--fenêtres-séparées-et-glisser-déposer-depuis-les-vues) · [📑 Dossiers de relecture et 📘 Rapports](guide/04-accueil.md#44--dossiers-de-relecture-et--rapports)</sub>
5. [🗺 Relation Map](guide/05-relation-map.md)
   <br><sub>[La 2ᵉ barre (commandes du graphe)](guide/05-relation-map.md#51-la-2ᵉ-barre-commandes-du-graphe) · [Onglets de vues : créer une nouvelle page Relation Map](guide/05-relation-map.md#52-onglets-de-vues--créer-une-nouvelle-page-relation-map) · [Filtres : types d'éléments et critères de relation](guide/05-relation-map.md#53-filtres--types-déléments-et-critères-de-relation) · [Panneau gauche : arborescence](guide/05-relation-map.md#54-panneau-gauche--arborescence) · [Interactions dans le graphe](guide/05-relation-map.md#55-interactions-dans-le-graphe) · [Panneau 🔎 Détail de la Relation Map](guide/05-relation-map.md#56-panneau--détail-de-la-relation-map) · [Légende et barre d'état](guide/05-relation-map.md#57-légende-et-barre-détat) · [Vue chaîne](guide/05-relation-map.md#58-vue-chaîne) · [Exports de la Relation Map](guide/05-relation-map.md#59-exports-de-la-relation-map)</sub>
6. [▤ Tableau](guide/06-tableau.md)
   <br><sub>[Barre du tableau](guide/06-tableau.md#61-barre-du-tableau) · [Types d'éléments (barre latérale)](guide/06-tableau.md#62-types-déléments-barre-latérale) · [Onglets de vues](guide/06-tableau.md#63-onglets-de-vues) · [Colonnes : colonnes calculées, attributs, relations](guide/06-tableau.md#64-colonnes--colonnes-calculées-attributs-relations) · [✨ Colonne par chemin (metachain)](guide/06-tableau.md#65--colonne-par-chemin-metachain) · [🎯 Portée](guide/06-tableau.md#66--portée) · [☰ Lignes et 🌳 Arbre](guide/06-tableau.md#67--lignes-et--arbre) · [Filtres de colonnes](guide/06-tableau.md#68-filtres-de-colonnes) · [Sélectionner et copier des cellules](guide/06-tableau.md#69-sélectionner-et-copier-des-cellules)</sub>
7. [🧭 Explorateur : Arborescence et Cartes](guide/07-explorateur.md)
   <br><sub>[🌳 Arborescence](guide/07-explorateur.md#71--arborescence) · [🃏 Cartes](guide/07-explorateur.md#72--cartes) · [Modèles SysML, UML et ReqIF : familles](guide/07-explorateur.md#73-modèles-sysml-uml-et-reqif--familles)</sub>
8. [⚡ Chaînes](guide/08-chaines.md)
   <br><sub>[Filtres et sous-vues](guide/08-chaines.md#81-filtres-et-sous-vues) · [Contenu d'une carte](guide/08-chaines.md#82-contenu-dune-carte) · [Export groupé](guide/08-chaines.md#83-export-groupé) · [🩺 Contrôles](guide/08-chaines.md#84--contrôles)</sub>
9. [📡 Flux & interfaces](guide/09-flux-interfaces.md)
   <br><sub>[ƒ⇆ Functional Exchange](guide/09-flux-interfaces.md#91-ƒ-functional-exchange) · [🟨 Operational Analysis](guide/09-flux-interfaces.md#92--operational-analysis) · [🧱 System Component (SA) et 🧱 Logical Component (LA)](guide/09-flux-interfaces.md#93--system-component-sa-et--logical-component-la) · [🔀 Behavior Exchange (PA)](guide/09-flux-interfaces.md#94--behavior-exchange-pa) · [🔌 Physical Link](guide/09-flux-interfaces.md#95--physical-link) · [🧩 Ports](guide/09-flux-interfaces.md#96--ports) · [🎬 Scénarios](guide/09-flux-interfaces.md#97--scénarios) · [⬇ CSV enrichi (colonnes de l'export)](guide/09-flux-interfaces.md#98--csv-enrichi-colonnes-de-lexport)</sub>
10. [🔲 Diagrammes](guide/10-diagrammes.md)
   <br><sub>[Charger les diagrammes](guide/10-diagrammes.md#101-charger-les-diagrammes) · [L'explorateur de diagrammes (à gauche)](guide/10-diagrammes.md#102-lexplorateur-de-diagrammes-à-gauche) · [Un diagramme ouvert](guide/10-diagrammes.md#103-un-diagramme-ouvert) · [⬇ Exporter… (planches)](guide/10-diagrammes.md#104--exporter-planches) · [Modèles SysML v2 et UML / SysML v1](guide/10-diagrammes.md#105-modèles-sysml-v2-et-uml--sysml-v1) · [⇄ Avant / après](guide/10-diagrammes.md#106--avant--après)</sub>
11. [ƒ Fonctions](guide/11-fonctions.md)
   <br><sub>[🌳 Hiérarchie](guide/11-fonctions.md#111--hiérarchie) · [▤ Tableau](guide/11-fonctions.md#112--tableau) · [⛓ Traçabilité](guide/11-fonctions.md#113--traçabilité) · [📊 Métriques](guide/11-fonctions.md#114--métriques) · [🩺 Contrôles et ✍ qualité des noms](guide/11-fonctions.md#115--contrôles-et--qualité-des-noms) · [📄 Dossier fonctionnel](guide/11-fonctions.md#116--dossier-fonctionnel)</sub>
12. [🔬 Analyses](guide/12-analyses.md)
   <br><sub>[🧬 Traçabilité inter-couches](guide/12-analyses.md#121--traçabilité-inter-couches) · [🎯 Capacités & missions](guide/12-analyses.md#122--capacités--missions) · [🚦 Modes & états](guide/12-analyses.md#123--modes--états) · [⚖ Comparaison de versions](guide/12-analyses.md#124--comparaison-de-versions) · [🧾 Exigences](guide/12-analyses.md#125--exigences) · [🎛 Propriétés (PVMT)](guide/12-analyses.md#126--propriétés-pvmt) · [🗃 Données & interfaces](guide/12-analyses.md#127--données--interfaces) · [🔒 Contraintes](guide/12-analyses.md#128--contraintes) · [⇶ Liens entre couches](guide/12-analyses.md#129--liens-entre-couches) · [💚 Santé & contrôles](guide/12-analyses.md#1210--santé--contrôles) · [🖧 Déploiement & EPBS](guide/12-analyses.md#1211--déploiement--epbs) · [📦 REC / RPL](guide/12-analyses.md#1212--rec--rpl) · [📚 Bibliothèques](guide/12-analyses.md#1213--bibliothèques) · [🏷 Catégories d'échanges](guide/12-analyses.md#1214--catégories-déchanges) · [🔖 Statut de revue](guide/12-analyses.md#1215--statut-de-revue) · [🎚 Variantes (modèle 150 %)](guide/12-analyses.md#1216--variantes-modèle-150-)</sub>
13. [📐 Tableau de bord](guide/13-tableau-de-bord.md)
   <br><sub>[Modifier un tableau de bord](guide/13-tableau-de-bord.md#131-modifier-un-tableau-de-bord) · [Catalogue des indicateurs](guide/13-tableau-de-bord.md#132-catalogue-des-indicateurs)</sub>
14. [🔎 Panneau de détail](guide/14-panneau-detail.md)
15. [💬 Revue](guide/15-revue.md)
   <br><sub>[Commenter un élément](guide/15-revue.md#151-commenter-un-élément) · [L'éditeur de commentaire](guide/15-revue.md#152-léditeur-de-commentaire) · [Notes de revue sur les diagrammes](guide/15-revue.md#153-notes-de-revue-sur-les-diagrammes) · [Le panneau 💬 Revue](guide/15-revue.md#154-le-panneau--revue) · [💾 Revue ▾ : enregistrer, exporter, fusionner](guide/15-revue.md#155--revue---enregistrer-exporter-fusionner) · [📤 Faire relire des commentaires (relecture par d'autres personnes)](guide/15-revue.md#156--faire-relire-des-commentaires-relecture-par-dautres-personnes)</sub>
16. [🔄 Suivi du fichier et mises à jour du modèle](guide/16-suivi-fichier.md)
17. [💾 Enregistrer, partager, réutiliser](guide/17-enregistrer.md)
18. [🎨 Thèmes et personnalisation](guide/18-themes.md)
19. [❓ Aide, visites guidées, À propos](guide/19-aide.md)
20. [Raccourcis clavier et gestes de souris](guide/20-raccourcis.md)
21. [Pas à pas : scénarios d'utilisation](guide/21-pas-a-pas.md)
   <br><sub>[Revue d'un modèle Capella (de bout en bout)](guide/21-pas-a-pas.md#211-revue-dun-modèle-capella-de-bout-en-bout) · [Préparer les notes de version entre deux livraisons](guide/21-pas-a-pas.md#212-préparer-les-notes-de-version-entre-deux-livraisons) · [Suivre un modèle en cours de modification dans Capella](guide/21-pas-a-pas.md#213-suivre-un-modèle-en-cours-de-modification-dans-capella) · [Produire un tableau Excel « composants → fonctions réalisées »](guide/21-pas-a-pas.md#214-produire-un-tableau-excel--composants--fonctions-réalisées-) · [Explorer le voisinage d'un composant (Relation Map)](guide/21-pas-a-pas.md#215-explorer-le-voisinage-dun-composant-relation-map) · [Livrer un dossier de diagrammes](guide/21-pas-a-pas.md#216-livrer-un-dossier-de-diagrammes) · [Compter, lister et exporter avec un script](guide/21-pas-a-pas.md#217-compter-lister-et-exporter-avec-un-script) · [Tutoriel : un SSDD sur mesure pour un modèle SysML](guide/21-pas-a-pas.md#218-tutoriel--un-ssdd-sur-mesure-pour-un-modèle-sysml) · [Revoir ce qui a changé dans un diagramme](guide/21-pas-a-pas.md#219-revoir-ce-qui-a-changé-dans-un-diagramme)</sub>
22. [Questions fréquentes et dépannage](guide/22-faq.md)
23. [📜 Scripts (macros)](guide/23-scripts.md)
   <br><sub>[Lancer un script](guide/23-scripts.md#231-lancer-un-script) · [L'API en bref](guide/23-scripts.md#232-lapi-en-bref) · [Bibliothèque et partage](guide/23-scripts.md#233-bibliothèque-et-partage) · [Isolement](guide/23-scripts.md#234-isolement) · [🤖 Serveur MCP (essai)](guide/23-scripts.md#235--serveur-mcp-essai)</sub>
24. [🧩 SysML v2, 🧬 UML / SysML v1 et 📑 ReqIF](guide/24-sysml-uml.md)
   <br><sub>[Ouvrir](guide/24-sysml-uml.md#241-ouvrir) · [Ce qui fonctionne comme pour Capella](guide/24-sysml-uml.md#242-ce-qui-fonctionne-comme-pour-capella) · [🧩 SysML v2](guide/24-sysml-uml.md#243--sysml-v2) · [🧬 UML / SysML v1](guide/24-sysml-uml.md#244--uml--sysml-v1) · [📑 ReqIF](guide/24-sysml-uml.md#245--reqif) · [Limites](guide/24-sysml-uml.md#246-limites)</sub>
25. [▦ Matrice](guide/25-matrice.md)
   <br><sub>[Critères (zone repliable ▾ Critères)](guide/25-matrice.md#251-critères-zone-repliable--critères) · [Grille](guide/25-matrice.md#252-grille) · [Onglets, préréglages, exports](guide/25-matrice.md#253-onglets-préréglages-exports)</sub>

**Annexes**

- [Index des vues et de leurs clés](guide/annexe-a-vues.md)
   <br><sub>[Boutons directs (par défaut)](guide/annexe-a-vues.md#boutons-directs-par-défaut) · [🏗 Architecture](guide/annexe-a-vues.md#-architecture) · [✅ Vérifier](guide/annexe-a-vues.md#-vérifier) · [💬 Revue & documents](guide/annexe-a-vues.md#-revue--documents)</sub>
- [Formats d'export](guide/annexe-b-exports.md)
- [Régénérer les captures du guide](guide/annexe-c-captures.md)
