<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · [2. Démarrer : écran d'accueil et ouverture d'un modèle](02-demarrer.md) ▶</sub>

# 1. Présentation et prérequis

Arcalyse est une application **autonome** : un **seul fichier HTML** — un par format, chacun bilingue : `arcalyse-capella.html`, `arcalyse-sysml2.html`, `arcalyse-uml.html`, `arcalyse-reqif.html` (exigences ReqIF), ou `arcalyse-complet.html` pour tous les formats — qui s'ouvre dans un navigateur et **fonctionne hors ligne**. Elle lit un modèle Capella / ARCADIA (`.capella`) **localement** — rien n'est envoyé sur un réseau — pour l'explorer, l'analyser, le contrôler, le commenter et l'exporter, sans ouvrir Capella. Elle lit aussi les modèles **SysML v2** et **UML / SysML v1** ([§ 24](24-sysml-uml.md)) et les exigences **ReqIF** (vue 🏗 Architecture › 📑 ReqIF) : ce guide décrit Capella, la plupart des vues valent pour tous les formats.

| Point | Détail |
|---|---|
| Navigateur conseillé | **Microsoft Edge** ou **Google Chrome** récents : ils permettent l'enregistrement direct (Ctrl+S réécrit le même fichier), l'ouverture d'un dossier de projet et la relecture automatique du fichier du modèle modifié (`.capella`, `.sysml`, `.mdzip`, `.reqifz`…, [§ 16](16-suivi-fichier.md)). Les autres navigateurs fonctionnent, avec téléchargement à la place de l'enregistrement direct. |
| Fichiers lus | **Capella** : `.capella` (modèle sémantique), `.melodymodeller`, `.xml` ; `.aird` (diagrammes) en complément, dans 🔲 Diagrammes. Un `.aird` ou `.afm` seul ne suffit pas : il ne contient pas les éléments du modèle. **SysML v2** : `.sysml`, `.kpar`, dossier de `.sysml`. **UML / SysML v1** : `.uml` (avec son `.notation` de Papyrus), `.xmi` (OMG, Cameo, Papyrus, Enterprise Architect), `.mdzip` (Cameo / CATIA Magic), `.qea` (Enterprise Architect), projet IBM Rhapsody (`.rpy` et dossier `_rpy`, sans les diagrammes). **ReqIF** : archive `.reqifz` (textes et images), `.reqif` (avec ses images, ou le dossier). En complément d'un modèle Capella ouvert : fichiers **pure::variants** (`.xfm`, `.vdm`, `.ccfm`) pour 🎚 Variantes. |
| Fichiers produits | Page HTML autonome (avec le modèle), CSV ou Excel (.xlsx), PDF, ZIP (PNG / SVG), HTML de rapports, JSON (vues, réglages, revue). Tout est produit dans le navigateur. |
| Lecture seule | Arcalyse **ne modifie jamais** le modèle (Capella, SysML, UML, ReqIF) : c'est un outil de lecture, d'analyse et de revue. |
| Langues | Chaque livrable est bilingue : bouton 🌐 EN / FR, ou adresse `?lang=fr` / `?lang=en` (langue du navigateur par défaut). Changer de langue recharge la page **en gardant tout le travail** : modèle (et ses diagrammes), revue, check-lists, dossiers et rapports, tableaux de bord, réglages, vue affichée. |
| Formats | Cinq livrables : une version par format, plus légère (`arcalyse-capella.html`, `arcalyse-sysml2.html`, `arcalyse-uml.html`, `arcalyse-reqif.html`), ou la version complète (`arcalyse-complet.html`). Une version réduite à un format refuse les fichiers des autres formats et dit quelle version les ouvre ; ℹ À propos indique les formats lus. |
| Assistant IA (essai) | Un **serveur MCP** permet à une application d'IA compatible (Claude Desktop, Claude Code…) d'interroger un modèle avec les analyses d'Arcalyse, en lecture seule et sur le poste : voir [mcp/LISEZMOI.md](../../mcp/LISEZMOI.md). |

**Couleurs des couches ARCADIA**, utilisées partout : **OA** Analyse opérationnelle · **SA** Analyse système · **LA** Architecture logique · **PA** Architecture physique · **EPBS** Éléments de configuration · *Transverse* (types partagés).

---

<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · [2. Démarrer : écran d'accueil et ouverture d'un modèle](02-demarrer.md) ▶</sub>
