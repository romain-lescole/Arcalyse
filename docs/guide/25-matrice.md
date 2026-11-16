<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [24. 🧩 SysML v2, 🧬 UML / SysML v1 et 📑 ReqIF](24-sysml-uml.md) · [Annexe A — Index des vues et de leurs clés](annexe-a-vues.md) ▶</sub>

# 25. ▦ Matrice

Éléments en **lignes** et en **colonnes**, reliés par les relations choisies : allocations, échanges, réalisations, capacités, exigences, liaisons SysML v2 et UML / SysML v1, relations ReqIF, contenance, ✨ relations par chemin. Bouton direct **▦ Matrice** de la barre (à côté de ▤ Tableau), pour tous les formats ; inspirée de la Dependency Matrix de Catia Magic, en lecture seule. **❓ Aide ▾ › 🎯 Visite de cette vue** la présente pas à pas.

## 25.1 Critères (zone repliable ▾ Critères)

| Réglage | Effet |
|---|---|
| **Lignes · Colonnes** | Types (＋ Types… : types présents, par couche ou par famille ; *Mêmes types que les lignes* pour une matrice N × N), couches ARCADIA ou familles (SysML / UML : STR, BEH, REQ, ORG ; ReqIF : SPEC, REL, TYPE — comme dans [§ 7.3](07-explorateur.md#73-modèles-sysml-uml-et-reqif--familles) ; aucune cochée : toutes), 🎯 Portée (contenu d'éléments choisis). |
| **⇄ Changer d'axes** | Les lignes deviennent les colonnes ; le sens s'inverse, tris, filtres et éléments masqués suivent. |
| **Critère** | Une ou plusieurs relations (＋ Relations…) : en tête celles qui relient les lignes et les colonnes choisies, avec leur nombre de liens ; puis ✨ relations par chemin, autres relations, et *Avancé* : références par attribut. |
| **Sens** | → ligne vers colonne, ← colonne vers ligne, ⇄ les deux. |
| **Afficher** | Avec relations (par défaut), tous les éléments, lignes sans relation (ex. fonctions non allouées), colonnes sans relation. |

## 25.2 Grille

- **Cellule** : *↗ Marques* (diagonale fléchée de la source vers la cible, nombre de liens en petit ; une marque par relation) ou *＃ Nombre* ; **🎨 Marques** : couleur, forme et texte de chaque relation.
- **Survol** : croix et info-bulle des liens. **Clic** sur une cellule : fenêtre des liens (relation, source → cible, élément porteur, chemins), chacun cliquable ; 💬 Commenter. **Clic droit** sur un nom : détail, commentaire, 🎯 portée, 🙈 masquer.
- **Clavier** : flèches, Page préc. / suiv., Entrée ou Espace (liens de la cellule), Échap.
- **Grouper** par propriétaire ou par couche / famille (groupes repliables), **⇅ Tri**, taille des cellules, 🔍 filtres ; **Σ** par ligne et par colonne ; ligne de **statut** (dimensions, liens, éléments masqués).
- Grandes matrices : seules les cellules visibles sont dessinées ; des milliers d'éléments restent fluides.

## 25.3 Onglets, préréglages, exports

- **Onglets** comme le ▤ Tableau (double-clic : renommer, + : copie), enregistrés avec la 💾 page et dans ⚙ Interface et vues ; cherchables par Ctrl+K.
- **📚 Préréglages ▾** du format du modèle (grisés quand il n'y a rien à montrer) — Capella : allocation des fonctions, déploiement, échanges, liens physiques, capacités, missions, chaînes, réalisations entre couches, exigences, ✨ composants PA × LA via fonctions… ; SysML v2 : typage, exigences, composition, comportements, allocations, connexions, ✨ définitions × ports ; UML / SysML v1 : exigences, blocs, cas d'utilisation, typage, allocations, ✨ blocs × types des parts ; ReqIF : exigences × exigences (relations ReqIF).
- **✨ Relation par chemin** : suit plusieurs relations d'affilée (ex. composant physique → fonction physique → fonction logique réalisée → composant logique) ; même éditeur que la ✨ colonne par chemin du ▤ Tableau ([§ 6.5](06-tableau.md#65--colonne-par-chemin-metachain)), avec aperçu en direct.
- **💾 Enregistrer · 📂 Ouvrir** la définition d'un onglet en `.json` ; **⬇ CSV · ⬇ Excel** (feuilles « Matrice » et « Liens ») ; **📋** copie pour Excel ou Word.
- **📐 Tableau de bord** : « lignes reliées » et « lignes sans relation » de chaque onglet ; **📜 Scripts** : `await analysis.matrix()`.

---

<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [24. 🧩 SysML v2, 🧬 UML / SysML v1 et 📑 ReqIF](24-sysml-uml.md) · [Annexe A — Index des vues et de leurs clés](annexe-a-vues.md) ▶</sub>
