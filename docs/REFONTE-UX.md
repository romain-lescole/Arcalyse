# Refonte de l'interface (v3.0) — plan de travail

Décidée le 20/10/2026 d'après l'état des lieux de l'outil et la maquette validée
(https://claude.ai/artifact/Nh9HLVReG5SwSjSu6FcRqy, privée : 7 écrans sur le modèle AIDA).
Chaque lot est livrable seul : `node build.js` ✔, `node build.js --lang en`, oracles (`node tests/oracles.js`) et
`node tests/smoke.js` à chaque lot ; aide (`aide.html` / `aide.en.html`), guide, `tools/textes.js --en`, `tools/index.js`,
une ligne dans `NOTES-TECHNIQUES.md` par décision. Les pages de projet enregistrées (2.1 et suivantes) doivent toujours
s'ouvrir : les réglages et blocs des fonctions retirées sont convertis ou ignorés, jamais une cause d'erreur (57).

## Principes retenus

- **Navigation par intentions** : 3 boutons directs (🏠 Accueil, 🔲 Diagrammes, ▤ Tableau), 3 menus
  (**Architecture**, **Vérifier**, **Revue & documents**), un **champ de recherche visible** (Ctrl+K), puis 📁 Fichier, ⚙, ❓.
- **Essentiel / Complet** remplace Expert / Simplifié / Personnalisé ; **Essentiel par défaut**. Le mode Complet ajoute
  la partie « Avancé » de Vérifier et 📜 Scripts.
- **Vues vides masquées** : une vue sans données dans le modèle ouvert sort des menus (grisée en mode Complet).
- **Même gabarit pour chaque vue** : couche (sélecteur global OA / SA / LA / PA / EPBS, mémorisé d'une vue à l'autre),
  sous-vues, filtre, ⬇ Exporter, pastille des contrôles renvoyant vers 💚 Santé.
- **Panneau de détail = pivot** : « Voir dans… » (diagrammes, Relation Map, traçabilité, commenter).
- **Ouverture inchangée** : `.capella` seul (et `.melodymodeller`, `.xml`), 📁 dossier du projet, 📄 projet de travail `.html`.
  Chaînes et scénarios restent calculés et dessinés depuis le `.capella` (pas de dépendance au `.aird`).
- **Scripts gardés** (lecture seule, mode Complet) : vitrine de l'API commune avec Arcature.

## Nouvelle organisation des vues

| Entrée | Contenu actuel repris |
|---|---|
| **Architecture** › Fonctions & échanges | ƒ Fonctions (avec son 📄 Dossier fonctionnel), ƒ⇆ Functional Exchange, 🟨 Operational Analysis |
| Architecture › Composants & interfaces | 🧱 System Component, 🧱 Logical Component, 🔀 Behavior Exchange, 🔌 Physical Link, 🧩 Ports |
| Architecture › Chaînes & scénarios | ⚡ Chaînes, 🎬 Scénarios |
| Architecture › Modes & états · Capacités & missions · Données · Déploiement & EPBS | vues existantes |
| Architecture › Explorer | 🗺 Relation Map (n'est plus un mode à part ; aussi depuis un élément), 🌳 Arborescence |
| **Vérifier** › Santé & contrôles | 💚 Santé, 🩺 Profil, onglets Contrôles des vues (deviennent un filtre de Santé), ⚡ contrôles des chaînes |
| Vérifier › Traçabilité entre couches | 🧬 Traçabilité inter-couches + ⇶ Liens entre couches (tableau ou graphe) |
| Vérifier › Exigences · Propriétés & contraintes · Comparaison de versions · Statut de revue Capella | 📋, 🏷 PVMT + ⛓, ⚖ (avec le delta du 🔄 Suivi), 🔖 |
| Vérifier › Avancé | 🏷 Catégories d'échanges, 📦 REC / RPL, 📚 Bibliothèques (remontées dès que le projet en référence) |
| **Revue & documents** › Commentaires | 💬 Revue + 📤 envoi de commentaires à des relecteurs (ancienne revue ciblée, 58) |
| Revue & documents › Check-lists & plans de revue | onglet ☑ de 🏠 Accueil |
| Revue & documents › **Faire relire** | 📑 Dossiers de relecture (61, 65) |
| Revue & documents › **Rapports automatiques** | 📘 Rapports, SSS / SSDD, modèles personnalisés (63, 66) — entrée distincte de Faire relire |
| Revue & documents › Tableaux de bord · Scripts (Complet) | 📐, 📜 |

**Déplacé** : 🎨 Thème → ⚙ Préférences ; 🔄 Suivi → 📁 Fichier (badge seulement si une nouvelle version arrive) ;
☰ Toutes les vues → champ de recherche.
**Retiré** (après le lot 1, une fois l'usage observé) : ▦ Cartes, 📖 Index des types (→ aide et infobulle du type),
vue 🔗 Liens (→ colonnes de relations du ▤ Tableau et onglet 🔗 du détail), 🧾 Tableaux blancs (les ⧉ fenêtres séparées restent),
thèmes Marine et Nature, code mort masqué (éditeur de modèle 08, mode PBS, ↺ Reset, boutons 🔷 CAPELLA / 💾 Page HTML).

## ⚙ Préférences (roue crantée)

Affichage (Essentiel / Complet, icônes seules, vues vides masquées) · **Thème** (Clair, Sombre, Contraste, **Office 2007**,
ajustement fin des couleurs et des couches = thème personnalisé de 38) · **Suivi du fichier** (détection automatique,
période 10 s / 30 s / 1 min / 5 min, vérification au retour dans la fenêtre) · Enregistrement automatique (2 à 30 min,
fichier de secours) · **Interface et vues** (parties de `CAP_CFG_PARTS`, export / import `.json`) · Contrôles et nommage
(🩺 profil, règles de nommage) · Exports (Excel / CSV, choix des colonnes).

## Lots

1. ✔ *(fait)* **Barre et navigation** (41, 64, `interface.html`, 11, 67) : nouveau catalogue de vues et 3 menus pointant vers les vues
   **existantes** (aucune fusion encore), recherche visible, Essentiel / Complet (conversion de `cap-toolbar`), Thème et
   Suivi déplacés, 💬 Revue et 📜 Scripts dans le menu, barre réduite avant chargement (pas de 2ᵉ barre de la Relation Map).
2. ✔ *(fait)* **⚙ Préférences** (64, 38, 40, 46) : rubriques ci-dessus ; thèmes réduits à quatre (Marine / Nature d'une ancienne page → Sombre).
3. **Accueil** (56, 20, 72) : écran d'ouverture (trois ouvertures, choix du modèle si le dossier en contient plusieurs),
   en-tête de projet (modèle, `.aird`, bibliothèques et leur état), « Que voulez-vous faire ? », santé par couche,
   vues masquées pour ce modèle (fonction « a des données » par vue).
4. **💚 Santé & contrôles** (69, 14, onglets Contrôles) : filtre par vue, « Ouvrir dans la vue », pastille de contrôles dans chaque vue.
5. **Fusions** : Composants & interfaces (47, 36, 29, 30 — moteur `capRenderComponentBlocks` déjà commun), Fonctions & échanges
   (34, 44), Traçabilité (31 + 62), Chaînes & scénarios (23, 49), Propriétés & contraintes (39) ; sélecteur de couche global.
6. **Revue & documents** (55, 58, 56, 61, 63) : Commentaires avec l'envoi aux relecteurs, check-lists sorties de l'Accueil,
   Faire relire = dossiers de relecture, Rapports automatiques en entrée séparée.
7. **Retraits** (21, 28, 22, 60, 08, 02) avec compatibilité des anciennes pages.
8. *(à décider)* **Pictogrammes** : la maquette remplace les emojis par des icônes au trait ; coût élevé (tous les libellés,
   dictionnaire anglais, tests). Au minimum : un emoji unique par notion (doublons actuels 🏷, 🧱, 📋, ⛓, ⚡).

Livraison prévue en **v3.0** après le lot 7 ; captures du README et du guide à refaire (modèle IFE, thème Clair, 1440×860).
