<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [25. ▦ Matrice](25-matrice.md) · [Annexe B — Formats d'export](annexe-b-exports.md) ▶</sub>

# Annexe A — Index des vues et de leurs clés

La **clé** est le nom interne de la vue (réglage de la barre, épingles, 🔍 Ctrl+K) : `ana:…` pour une sous-vue d'analyse, `home:…` pour un onglet de 🏠 Accueil ou de 💬 Revue & documents, `grp:…` pour une **famille** (une entrée de menu, puis une barre de famille sous la barre principale), `@…` pour une commande. *Complet* : vue proposée dans les menus en mode Complet seulement (toujours trouvable par 🔍). Les vues sans données dans le modèle ouvert sont retirées des menus en Essentiel et grisées en Complet ([§ 3.2](03-interface.md#32-menus-des-vues-épingles-et-ctrlk)).

## Boutons directs (par défaut)

| Vue | Clé | Sous-vues |
|---|---|---|
| 🏠 Accueil | `home` | 🏠 Projet (en-tête, « Que voulez-vous faire ? », cartes : 📝 fiche projet, 🧩 contenu du modèle, 💚 santé… ; ⚙ Disposer les cartes) |
| 🔲 Diagrammes | `diag` | explorateur (classements, 🌳 arborescence), diagramme ou vue, ▣ carte, ℹ Infos, ⧉ Comparer, ⇄ Avant / après, ⬇ Exporter… ; diagrammes et tableaux du fichier (UML / SysML v1), vues calculées (SysML v2), tableaux, matrices et Relation Map de Cameo |
| ▤ Tableau | `table` | onglets, ☰ Lignes / 🌳 Arbre, ⊞ Colonnes (attributs, relations, ✨ par chemin), 🖼 Texte riche |
| ▦ Matrice | `matrix` | onglets, 📚 préréglages, critères, 🎨 marques, ✨ relations par chemin, exports CSV · Excel · .json |

## 🏗 Architecture

| Vue | Clé | Menu | Sous-vues |
|---|---|---|---|
| **ƒ Fonctions & échanges** | `grp:fonc` | famille (sélecteur Couche) | ƒ Fonctions · ƒ⇆ Échanges fonctionnels · 🟨 Activités OA |
| ƒ Fonctions | `functions` | ƒ Fonctions & échanges | 🌳 Hiérarchie · ▤ Tableau · ⛓ Traçabilité · 📊 Métriques · 🩺 Contrôles ; 📄 Dossier fonctionnel (HTML) |
| ƒ⇆ Functional Exchange · 🟨 Operational Analysis | `fex` · `oav` | ƒ Fonctions & échanges | ◧ Vue Blocs · ◎ Voisinage · ≡ Vue Ligne · ▣ Vue Fonction / Activité · ▦ Matrice · 🩺 Contrôles |
| **🧱 Composants & interfaces** | `grp:comp` | famille (une puce par couche : SA, LA, PA comportement, PA nœuds) | SA · System Component · LA · Logical Component · PA · Behavior Exchange · PA · Physical Link · 🧩 Ports |
| 🧱 System Component · 🧱 Logical Component · 🔀 Behavior Exchange · 🔌 Physical Link | `csys` · `cblk` · `compex` · `physlink` | 🧱 Composants & interfaces | ◧ Vue Blocs · ◎ Voisinage · ▣ Vue Composant · ≡ Vue Ligne · ▦ Matrice · 🩺 Contrôles ; filtre 🔲 Diagramme |
| 🧩 Ports | `ports` | 🧱 Composants & interfaces | ≡ Traçabilité · ▣ Par composant · 🩺 Contrôles |
| **⚡ Chaînes & scénarios** | `grp:chsc` | famille (sélecteur Couche) | ⚡ Chaînes · 🎬 Scénarios |
| ⚡ Chaînes | `chains` | ⚡ Chaînes & scénarios | ▦ Diagrammes · 🗺 Vue Relation Map · 🩺 Contrôles ; ℹ Infos d'une chaîne |
| 🎬 Scénarios | `scen` | ⚡ Chaînes & scénarios | 🎬 Diagramme · 🩺 Contrôles |
| 🚦 Modes & états | `ana:states` | 🏗 | ◈ Machines à états · ▦ Fonctions × états · 🩺 Contrôles |
| 🎯 Capacités & missions | `ana:caps` | 🏗 | ▣ Cartes · ▦ Matrice · 🩺 Contrôles |
| 🗃 Données & interfaces | `ana:data` | 🏗 | 📦 Exchange Items · 🔌 Interfaces · 🧱 Classes & types · 🩺 Contrôles |
| 🖧 Déploiement & EPBS | `ana:deploy` | 🏗 | 🖧 Déploiement · 🧰 EPBS · 🩺 Contrôles |
| 📑 ReqIF | `ana:reqif` | 🏗 (modèle ReqIF) | 📄 Document · ▤ Exigences · 🔗 Relations · 🧩 Types · 🖼 Pièces jointes · 🩺 Contrôles — [§ 24.5](24-sysml-uml.md#245--reqif) |
| 🧩 SysML v2 | `ana:sysml` | 🏗 (modèle SysML v2) | 🧩 Éléments · 🔗 Liaisons · 🩺 Diagnostics · 📄 Fichiers — [§ 24.3](24-sysml-uml.md#243--sysml-v2) |
| **🧬 UML / SysML v1** | `grp:uml` | famille (modèle UML / SysML v1) | 🧬 Modèle · 🧱 Blocs & ports · 🗃 Interfaces · ƒ Activités & flux · 🚦 Machines à états · 🎬 Interactions · 🎯 Cas d'utilisation · 📦 Paquetages & classes |
| 🧬 Modèle | `ana:uml` | 🧬 UML / SysML v1 | 🧩 Éléments · 🔗 Liaisons · 🩺 Diagnostics (Σ Répartition par règle) |
| 🧱 Blocs & ports · 🗃 Interfaces (ICD) · ƒ Activités & flux | `ana:umlblk` · `ana:umlicd` · `ana:umlact` | 🧬 UML / SysML v1 | voir [§ 24.4](24-sysml-uml.md#244--uml--sysml-v1) |
| 🚦 Machines à états · 🎬 Interactions | `ana:umlstm` · `ana:umlseq` | 🧬 UML / SysML v1 | 📋 liste · 🔎 détail · 🖼 Diagramme calculé · ▦ Matrice · 🩺 Contrôles |
| 🎯 Cas d'utilisation · 📦 Paquetages & classes | `ana:umlucs` · `ana:umlsoft` | 🧬 UML / SysML v1 | voir [§ 24.4](24-sysml-uml.md#244--uml--sysml-v1) |
| 🗺 Relation Map | `@rm` | 🏗 › Explorer | onglets de vues, ＋ préréglages, vue chaîne |
| 🌳 Arborescence | `tree` | 🏗 › Explorer | — |
| 🃏 Cartes | `cards` | 🏗 › Explorer (*Complet*) | groupes par couche ARCADIA, ou par famille hors Capella |

## ✅ Vérifier

| Vue | Clé | Menu | Sous-vues |
|---|---|---|---|
| 💚 Santé & contrôles | `ana:sante` | ✅ | 📋 Contrôles × couches · ▦ Par vue · 📈 Historique |
| **🧬 Traçabilité entre couches** | `grp:trac` | famille | 🧬 Tableau de traçabilité · ⇶ Graphe des réalisations |
| 🧬 Traçabilité inter-couches | `ana:trace` | 🧬 Traçabilité entre couches | ▦ Couverture · ⛓ Chemins de traçabilité · 🔗 Liens |
| ⇶ Liens entre couches | `ana:xlay` | 🧬 Traçabilité entre couches (épinglé : ⇶ Couches) | modes élément / catégorie, exports SVG · PNG · CSV |
| 🧾 Exigences | `ana:reqs` | ✅ | 📋 Liste · ▦ Couverture · 🩺 Contrôles |
| **🎛 Propriétés & contraintes** | `grp:prop` | famille | 🎛 Propriétés (PVMT) · 🔒 Contraintes |
| 🎛 Propriétés | `ana:pvmt` | 🎛 Propriétés & contraintes | ▦ Grille par groupe · Σ Synthèse · 📖 Définitions · 🩺 Contrôles |
| 🔒 Contraintes | `ana:cts` | 🎛 Propriétés & contraintes | 📋 Liste · 🩺 Contrôles |
| ⚖ Comparaison de versions | `ana:diff` | ✅ | 🔷 Modèle · 🔲 Diagrammes (tous formats) |
| 🎚 Variantes (150 %) | `ana:variants` | ✅ (modèle à variantes) | 📊 Avancement · ✅ Reste à faire · ▦ Éléments × variantes · 🏷 Critères & variantes · 🩺 Contrôles |
| 🔖 Statut de revue | `ana:status` | ✅ | 📋 Liste · ▦ Répartition · 🩺 Contrôles |
| ⇶ Traçabilité par niveaux | `ana:umltrace` | ✅ (modèle UML / SysML v1) | 📊 Couverture · 📋 Chemins · ⇶ Graphe · 🩺 Contrôles |
| ⚖ Budgets | `ana:umlbudget` | ✅ (modèle UML / SysML v1) | 🌳 Cumul · 📋 Grandeurs · 🩺 Contrôles |
| 🔒 Paramétrique & contraintes | `ana:umlpar` | ✅ (modèle UML / SysML v1) | 📋 Blocs de contrainte · 🔗 Liaisons · 🔒 Contraintes · 🩺 Contrôles |
| 🧾 Exigences SysML | `ana:umlreq` | ✅ (modèle UML / SysML v1) | 📋 Liste · 🌳 Arbre · 📊 Couverture · ▦ Matrice · 🩺 Contrôles |
| 🏷 Catégories d'échanges | `ana:cats` | ✅ › Avancé (*Complet*) | 🏷 Catégories · ⇆ Échanges · 🩺 Contrôles |
| 📦 REC / RPL | `ana:rec` | ✅ › Avancé (*Complet*) | 🧬 Répliques · 📦 REC · ⇄ Comparaison · 🩺 Contrôles |
| 📚 Bibliothèques | `ana:libs` | ✅ › Avancé (*Complet*) | 📚 Bibliothèques · 🔗 Références · 🩺 Contrôles |

## 💬 Revue & documents

| Vue | Clé | Menu | Sous-vues |
|---|---|---|---|
| 💬 Commentaires | `@revue` | 💬 | panneau 💬 Revue : 💬 Commentaires · 🔁 Vérifier · 📄 Rapport · ⚙ Réglages |
| ☑ Check-lists & plans de revue | `home:docs` | 💬 | check-lists, plans de revue, palette 📎, ⧉ fenêtres séparées |
| 📑 Faire relire | `home:dos` | 💬 | dossiers de relecture : chapitres, 👁 aperçu, page HTML à commenter, Word, 📥 réimport |
| 📘 Rapports automatiques | `home:rap` | 💬 (épinglé : 📘 Rapports) | plans types (spécification, dossier de conception, SSS / SSDD), 🧩 Plans SysML à adapter, 🧩 mes modèles |
| 📐 Tableau de bord | `dashboard` | 💬 | pages, édition, catalogue des indicateurs |
| 📜 Scripts | `@scripts` | 💬 (*Complet*) | console (Alt+4), exemples, bibliothèque |

> Vues retirées ou renommées depuis la 3.0 : les menus 🧭 Explorateur, 📡 Flux & interfaces et 🔬 Analyses sont remplacés par 🏗 Architecture, ✅ Vérifier et 💬 Revue & documents ; 🔀 Component Exchange s'appelle 🔀 Behavior Exchange ; les vues 🔗 Liens et 📊 Table View n'existent plus (relations dans les colonnes du ▤ Tableau et la ▦ Matrice).

---

<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [25. ▦ Matrice](25-matrice.md) · [Annexe B — Formats d'export](annexe-b-exports.md) ▶</sub>
