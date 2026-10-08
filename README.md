# Arcalyse — guide de travail

*Votre modèle Capella, sous toutes ses coutures.* Explorateur et analyseur hors ligne de modèles Capella / ARCADIA (outil indépendant, non affilié à Capella).

Ce dossier contient les **sources découpées** de l'application. Le fichier HTML unique que vous utilisez sur le PC sécurisé est **fabriqué** à partir de ces sources par une commande (`node build.js`). On ne modifie donc plus le gros fichier HTML : on modifie (ou on fait modifier par Claude Code) les petits fichiers de `src/`, puis on reconstruit.

```
relation-map-capella/
├── CLAUDE.md                  ← consignes lues automatiquement par Claude Code à chaque session
├── README.md                  ← ce guide
├── build.js                   ← assemble src/ → dist/arcalyse-fr.html (+ contrôles)
├── package.json               ← raccourcis npm (npm run build, …)
├── src/
│   ├── index.html             ← squelette + ordre d'inclusion des morceaux
│   ├── css/styles.css, css/aide.css
│   ├── html/interface.html    ← barres d'outils, panneaux, vues
│   ├── html/aide.html         ← l'aide de l'application
│   ├── js/01-…js à 37-…js     ← le code, découpé par fonctionnalité (voir CLAUDE.md)
│   └── vendor/d3.min.js       ← bibliothèque D3 embarquée (ne pas toucher)
├── dist/                      ← fichier produit (non versionné) : C'EST LUI QU'ON COPIE SUR LE PC SÉCURISÉ
├── docs/NOTES-TECHNIQUES.md   ← mémoire technique (ex-fichier CONSIGNES)
├── docs/INDEX-FONCTIONS.md    ← liste des fonctions par fichier (générée)
├── docs/TEXTES.md, textes.csv ← TOUS les textes affichés, en un seul fichier (générés)
├── docs/i18n/                 ← dictionnaire anglais, aide anglaise, démarche de traduction
├── tools/split.js             ← réimporter un HTML modifié ailleurs ; tools/index.js ← régénérer l'index
├── tools/textes.js            ← générer l'inventaire des textes ; tools/lib/acorn.js ← analyseur JS utilisé par cet outil
└── tests/smoke.js + tests/models/   ← test automatique facultatif + modèle d'exemple IFE
```

Pourquoi c'est plus économe : Claude Code ne lit que le fichier concerné (par ex. `35-tableau-de-bord.js`, ~530 lignes) au lieu d'un fichier de 13 000 lignes, il modifie directement vos fichiers sur le disque (plus d'envoi/récupération), et chaque session repart de `CLAUDE.md` au lieu d'un long historique de conversation.

---

## 1. Installation (une seule fois, sur votre PC Windows personnel)

1. **Node.js** (nécessaire pour `build.js`) : télécharger la version **LTS** sur https://nodejs.org et l'installer (options par défaut). Vérifier dans un nouveau terminal : `node --version`.
2. **Git for Windows** (recommandé : historique des versions, retour arrière, et Claude Code l'utilise) : https://git-scm.com/downloads/win (options par défaut).
3. **Claude Code**, au choix :
   - **Dans l'application Claude pour ordinateur** que vous utilisez déjà : onglet **Code**, puis choisir le dossier du projet. C'est le plus simple, sans terminal.
   - **Ou dans un terminal** PowerShell : `irm https://claude.ai/install.ps1 | iex`, puis ouvrir un nouveau terminal et vérifier `claude --version`. Au premier lancement de `claude`, se connecter avec votre compte Claude (abonnement Pro/Max nécessaire).

## 2. Mise en place du projet (une seule fois)

1. Décompresser l'archive, par exemple dans `C:\Projets\relation-map-capella`.
2. Ouvrir un terminal dans ce dossier (dans l'Explorateur : clic droit sur le dossier → « Ouvrir dans le Terminal »).
3. Créer l'historique Git :
   ```
   git init
   git add .
   git commit -m "Version initiale découpée"
   ```
4. Construire une première fois et vérifier :
   ```
   node build.js
   ```
   Le message `✔ dist/arcalyse-fr.html — … syntaxe OK` doit s'afficher. Ouvrez ce fichier dans le navigateur : c'est exactement l'application actuelle.

## 3. Travailler avec Claude Code au quotidien

1. Ouvrir Claude Code sur le dossier (onglet Code de l'application, ou `claude` dans un terminal ouvert dans le dossier).
2. Décrire **une amélioration à la fois**, avec le niveau de vérification voulu. Exemples :
   - « Dans ⚡ Chaînes, ajoute un tri par nombre de fonctions. Build seulement. »
   - « Dans le tableau de bord, ajoute un indicateur “ports non alloués par couche”. Lance aussi le test smoke. »
   - « Le bouton X ne fonctionne pas dans la vue Physical Link : voici le message d'erreur de la console : … »
3. Claude Code cherche le bon module, le modifie, lance `node build.js` et vous résume le changement.
4. Ouvrez (ou rafraîchissez avec F5) `dist/arcalyse-fr.html` dans le navigateur pour vérifier.
5. Si c'est bon : demandez « fais un commit » (ou tapez `git add . && git commit -m "…"`). Si ce n'est pas bon : dites-le à Claude Code, ou annulez tout depuis le dernier commit avec `git restore .`.
6. Changez de sujet ? Tapez **`/clear`** dans Claude Code : la conversation repart de zéro (les consignes de `CLAUDE.md` sont relues), ce qui évite d'accumuler du contexte et donc de la consommation.

Bonnes habitudes pour consommer peu :
- une session (ou un `/clear`) par sujet ; regrouper les petites demandes liées dans un même message ;
- préciser « build seulement » quand un test navigateur n'est pas utile ; les captures d'écran coûtent cher ;
- nommer la vue ou l'onglet concerné (« ƒ Fonctions › Tableau ») : Claude Code trouve directement le bon fichier ;
- pour une erreur, coller le message de la console du navigateur (F12 → Console).

## 4. Copier sur le PC sécurisé

Seul le fichier **`dist/arcalyse-fr.html`** est nécessaire : il est autonome et ne fait aucun accès réseau.
- `node build.js` produit une version avec de petits commentaires de repère `@@BEGIN …@@` (invisibles à l'utilisation, ils permettent de réimporter le fichier, voir §5).
- `node build.js --no-markers` produit une version sans ces repères, si vous préférez livrer un fichier « propre ».

### Livrer une version

**Pourquoi deux dossiers ?** `dist/` est régénéré à chaque build et changerait à chaque modification : il n'est pas versionné, pour ne pas encombrer l'historique. `livraison/` ne change que lorsque vous décidez de livrer : chaque version livrée y est conservée dans Git et peut être retrouvée.

**Quand livrer** : quand une version est prête à être utilisée sur le PC sécurisé.

**Comment livrer**, depuis le dossier du projet (remplacer `X.Y` par le numéro de version) :
```
node build.js --livraison          (ou : npm run livraison)
git add livraison
git commit -m "Livraison vX.Y"
git tag vX.Y
git push
git push --tags
```
Le build produit `livraison/arcalyse-fr.html` sans repères, avec les mêmes contrôles que d'habitude. Il rappelle ces commandes à la fin.

**Récupérer le fichier depuis n'importe quel PC, sans rien installer** :
1. Ouvrir github.com et se connecter : la connexion est nécessaire car le dépôt est privé.
2. Ouvrir le dépôt `relation-map-capella`, puis le dossier `livraison`, puis le fichier `arcalyse-fr.html`.
3. Cliquer sur le bouton **« Download raw file »** (icône de téléchargement en haut à droite du fichier).

**Retrouver une ancienne livraison** :
- sur la page du fichier, le bouton **History** liste chaque livraison : ouvrez celle voulue, puis « Download raw file » ;
- ou par tag : menu des branches → onglet **Tags** → choisir `vX.Y`, puis aller dans `livraison/`.

## 5. Revenir travailler dans Claude.ai (conversation classique)

C'est possible à tout moment :
1. Envoyez dans la conversation le fichier `dist/arcalyse-fr.html` **construit avec repères** (commande `node build.js` normale), avec `CLAUDE.md`.
2. Récupérez le fichier modifié, placez-le par exemple dans `C:\Temp\modifie.html`, puis dans le dossier du projet :
   ```
   node tools/split.js C:\Temp\modifie.html --dry     (montre les fichiers qui vont changer)
   node tools/split.js C:\Temp\modifie.html           (réécrit src/)
   node build.js
   git diff                                           (voir les changements)
   git add . && git commit -m "Modifications faites dans Claude.ai"
   ```

## 6. Relire les textes, préparer l'anglais

Les libellés restent écrits en clair dans le code (c'est plus lisible pour vous comme pour Claude Code), mais un outil les rassemble **tous dans un seul fichier** :
```
node tools/textes.js          → docs/TEXTES.md (lisible) + docs/textes.csv (Excel : filtres, tri)
node tools/textes.js --en     → ajoute la colonne « anglais » et la liste des textes non traduits
```
Chaque texte est donné avec son emplacement (`js/23-chaines.js` ligne 412) : pour corriger une faute, modifiez la ligne indiquée (ou demandez à Claude Code « corrige la faute ligne 412 de 23-chaines.js »), puis régénérez. Ne modifiez pas `TEXTES.md` lui-même : il est recréé à chaque fois.

Pour une version anglaise : tout est préparé dans `docs/i18n/` (≈ 1 000 traductions déjà faites, aide anglaise à mettre à jour, démarche et pièges dans `LISEZMOI.md`). Demandez à Claude Code, une session par groupe de modules : « Mets en place la version anglaise selon docs/i18n/LISEZMOI.md, en commençant par build.js et le module 23-chaines.js ».

## 7. Test automatique (facultatif)

Il ouvre l'application hors ligne dans un navigateur invisible, charge le modèle IFE, passe dans toutes les vues et signale toute erreur.
```
npm install --save-dev playwright
npx playwright install chromium
node tests/smoke.js
```
Pour un autre modèle : `node tests/smoke.js C:\chemin\vers\modele.capella` (ou déposez des `.capella` dans `tests/models/`).

## 8. Dépannage

| Problème | Solution |
|---|---|
| `node` n'est pas reconnu | Réinstaller Node.js LTS, puis **ouvrir un nouveau terminal**. |
| `✖ Assemblage refusé : Syntaxe JS — src/js/xx.js:123` | Une modification a cassé le code à cet endroit : demander à Claude Code de corriger, ou `git restore src/js/xx.js`. |
| `Ressource externe interdite` | Une URL `http(s)` a été introduite (CDN, police…) : la supprimer, l'application doit rester hors ligne. |
| L'application affiche une erreur au chargement d'un modèle | F12 → Console, copier le message et le donner à Claude Code avec le nom de la vue concernée. |
| Revenir à une version précédente | `git log --oneline` puis `git checkout <numéro> -- src/` (ou demander à Claude Code). |
| Ajouter un nouveau fichier de code | Le créer dans `src/js/` **et** ajouter la ligne `@@INCLUDE js/nom.js@@` dans `src/index.html` (Claude Code le sait). |
