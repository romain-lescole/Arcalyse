# 🤖 Serveur MCP d'Arcalyse (essai)

Permet à une application d'IA compatible **MCP** (Claude Desktop, Claude Code, ou l'assistant de l'entreprise s'il gère
MCP) d'**interroger un modèle** Capella, SysML v2 ou UML / SysML v1 avec les analyses d'Arcalyse : recherche, fiche d'un
élément, diagrammes, traçabilité, contrôles, scripts. **Lecture seule**, tout se passe **sur le poste** : le serveur ouvre Arcalyse dans un
navigateur sans fenêtre et hors ligne, puis il répond aux questions de l'IA.

Ce n'est pas Arcalyse qui contacte l'IA, c'est l'application d'IA qui appelle Arcalyse. Aucun compte ni aucune clé
ne sont donc nécessaires côté Arcalyse : le compte, le modèle d'IA et les règles de confidentialité sont ceux de
l'application d'IA.

> **Essai.** Formats ouverts : **Capella** (`.capella`, `.melodymodeller`, `.xml`, avec le `.aird` voisin), **SysML v2**
> (`.sysml`, `.kpar`) et **UML / SysML v1** (`.uml` avec son `.notation`, `.xmi`, `.mdzip`, `.qea`) — détail plus bas. Les
> exigences ReqIF, lues par la page, ne sont pas encore acceptées par `open_model`.

## Installation

1. Node.js 18 ou plus.
2. Construire la page : `node build.js` à la racine du dépôt (ou régler `ARCALYSE_HTML` vers une page livrée).
3. Dans le dossier `mcp` : `npm install`. Le navigateur utilisé est **Edge ou Chrome déjà installés**
   (`ARCALYSE_NAVIGATEUR=msedge` ou `chrome`) ; à défaut, le Chromium de Playwright s'il est présent
   (`npx playwright install chromium`).

## Déclaration dans l'application d'IA

**Claude Desktop** : Réglages › Développeur › Modifier la configuration (`claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "arcalyse": {
      "command": "node",
      "args": ["C:/outils/arcalyse/mcp/serveur.js"],
      "env": { "ARCALYSE_NAVIGATEUR": "msedge", "ARCALYSE_RACINES": "C:/modeles" }
    }
  }
}
```

Redémarrer Claude Desktop : les outils d'Arcalyse apparaissent. Demander par exemple : « Ouvre
`C:/modeles/IFE.capella` et liste les fonctions SA non réalisées en LA », ou « Ouvre `C:/modeles/Drone.mdzip` et
dis-moi quelles exigences ne sont satisfaites par aucun bloc ».

**Claude Code** : `claude mcp add arcalyse -e ARCALYSE_NAVIGATEUR=msedge -- node /chemin/arcalyse/mcp/serveur.js`

## Réglages (variables d'environnement)

| Variable | Rôle |
|---|---|
| `ARCALYSE_HTML` | Page Arcalyse utilisée (défaut : `dist/arcalyse-fr.html`, sinon la version livrée `livraison/arcalyse-complet.html`, ouverte en français) |
| `ARCALYSE_NAVIGATEUR` | `msedge`, `chrome`, ou chemin d'un exécutable Chromium |
| `ARCALYSE_RACINES` | Dossiers où `open_model` a le droit de lire, séparés par `;` (conseillé en entreprise) |
| `ARCALYSE_MODELE` | Modèle ouvert dès le démarrage |

## Outils exposés

| Outil | Rôle |
|---|---|
| `open_model` | Ouvre un modèle (formats ci-dessous) et rend son résumé |
| `model_summary` | Format, éléments par couche (Capella) ou par famille (SysML, UML), types principaux, diagrammes, diagnostics du lecteur, vues de contrôles |
| `search_elements` | Recherche par nom (nom qualifié `A::B` pour SysML et UML), type (stéréotype ou métaclasse pour UML), couche ou famille (paginée) |
| `get_element` | Fiche : chemin, description, propriétés, références, enfants, relations, diagrammes ; SysML et UML : métaclasse, stéréotypes, nom qualifié, attributs écrits (texte d'une exigence…), liaisons du lecteur, diagnostics |
| `diagrams` | Liste des diagrammes (paginée, filtrée), ou un diagramme et les éléments qu'il montre ; rendu textuel d'une vue SysML ou UML (`text`) |
| `traceability` | Capella : chaîne de réalisation d'un élément, couverture par couche, éléments non couverts. SysML et UML : liens `satisfy`, `verify`, `deriveReqt`, `refine`, `trace`, `copy`, `allocate` d'un élément, couverture des exigences |
| `checks` | Contrôles 🩺 en défaut (profil appliqué), puis leurs lignes ; SysML et UML : validation du lecteur seulement |
| `run_script` | Script de l'API de scripts (lecture seule, worker isolé, délai maximal) ; SysML et UML : `await analysis.sysml()` rend la lecture complète |
| `script_api_reference` | Contrat de l'API (`docs/api/arcalyse.d.ts`) |

Les éléments sont désignés par des **identifiants courts** (`E12`), les diagrammes par `D3`, valables pendant la session :
moins de tokens qu'un UUID. Les listes sont paginées (`limit`, `offset`).

## Formats ouverts

| Format | Fichiers | Ouverture (même chemin que l'interface) |
|---|---|---|
| Capella | `.capella`, `.melodymodeller`, `.xml` ; `.aird` (ou `.aird.gz`) trouvé à côté — même nom, ou seul `.aird` du dossier —, ou paramètre `aird` | `capLoadFile` (20), puis 🔲 Diagrammes |
| SysML v2 | `.sysml`, `.kpar` | `capLoadFile` → lecteur SysML v2 d'Arcature (87) |
| UML / SysML v1 | `.uml` d'Eclipse UML2 / Papyrus, avec son `.notation` trouvé à côté (même nom, ou seul `.notation` du dossier) ou paramètre `notation` ; `.xmi` (OMG, Cameo, Papyrus, Enterprise Architect) ; projet Cameo / CATIA Magic `.mdzip` ; projet Enterprise Architect `.qea`, `.qeax` | `capLoadFile` → `capUmlOuvrir` (88) ; un `.uml` et son `.notation` : `capUmlOuvrirFichiers`, comme leur dépôt ensemble |

Un `.notation` ou un `.aird` seul est refusé avec une explication (ce sont les diagrammes d'un modèle). Une erreur de
lecture affichée par la page (écran d'accueil) est rendue aussitôt comme une erreur de `open_model`.

**Modèles SysML et UML** : pas de couches ARCADIA (les éléments n'ont pas de `layer` ; `family` : STR structure, BEH
comportement, REQ exigences et cas d'utilisation, ORG organisation) ; `traceability` suit les liens de traçabilité du
lecteur au lieu des réalisations entre couches (`category`, `layer`, `direction` sont refusés) ; `checks` ne rend que la
validation du lecteur d'Arcature (vue `ana:uml` : contraintes d'UML 2.5.1, de SysML 1.7 et d'UAF 1.2 ; `ana:sysml` pour
SysML v2), une vue de contrôles de Capella est refusée ; `diagrams` liste les diagrammes du fichier (Papyrus, Cameo,
Enterprise Architect : `origin`) ; pour SysML v2, les vues calculées (`origin: computed`) — un modèle UML / SysML v1 n'en montre pas.

Le catalogue d'outils est dans la page (`src/js/89-ia-outils.js` : `capIaOutils`, `capIaAppel`) pour être partagé
avec un futur panneau 🤖 intégré. Le serveur n'ajoute que l'ouverture des fichiers et la documentation.

## Sécurité

- Lecture seule : aucun outil ne modifie le modèle ni n'écrit de fichier.
- La page tourne dans un contexte **hors ligne** ; les scripts s'exécutent dans un worker sans accès réseau.
- `ARCALYSE_RACINES` limite les fichiers que l'IA peut faire ouvrir.
- Les descriptions du modèle sont des **données** : un texte du modèle qui ressemblerait à une consigne ne doit pas
  être suivi par l'IA (la lecture seule limite ce risque).

## Test

`node tests/mcp.js` (Playwright requis, comme `tests/oracles.js`) : protocole, ouverture d'IFE avec son `.aird`, chaque
outil, erreurs, arrêt d'un script sans fin, modèle SysML v2, modèles UML / SysML v1 de `tests/models/uml/` (`Bibliotheque.uml`
avec son `.notation` trouvé à côté, `Drone-2026x.mdzip` de Cameo, `Drone-ea.qea` d'Enterprise Architect).
