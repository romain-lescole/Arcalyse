# API de scripts (macros) d'Arcalyse

Des scripts JavaScript qui parcourent et analysent le modèle, comme les macros de Catia Magic / MagicDraw ou
Python4Capella — **en lecture seule** : Arcalyse ne modifie jamais un modèle. L'API reprend celle d'**Arcature**
(mêmes noms, même contrat pour la lecture) : un script de lecture écrit pour l'un tourne dans l'autre. Arcalyse y
ajoute `analysis`, qui rend les résultats de toutes ses analyses (fonctions, chaînes, traçabilité, contrôles, santé…).

- Contrat (noms, types, documentation pour l'autocomplétion) : [`arcalyse.d.ts`](arcalyse.d.ts), en anglais comme l'API.
- Mise en œuvre : `src/js/80-scripts-api.js` (noyau sans DOM, recopié dans le worker), `82-scripts-analyses.js`
  (instantané du modèle et analyses, côté page), `81-scripts-console.js` (console). Tests : `tests/scripts.js`.
- Ce qui n'est pas repris d'Arcature : tout ce qui modifie le modèle (`create`, `set`, `delete`, `moveTo`,
  `allocateTo`, `connect`, `transaction`), les diagrammes en écriture (`setBounds`, `show`, `createDiagram`…) et
  `out.image` ; la ligne de commande Node (Arcalyse lit le `.capella` avec le navigateur).

## Lancer un script

**Dans Arcalyse** : bouton **📜 Scripts** de la barre, **Alt+4**, ou ☰ / Ctrl+K « Scripts » (tiroir en bas des vues).
Choisir un exemple ou écrire un script, puis **Ctrl+Entrée** (ou ▶ Exécuter). Les éléments affichés dans la sortie
sont des liens : un clic les ouvre dans le panneau de détail. Les tableaux s'exportent en CSV ; les fichiers produits
par `out.file` sont proposés au téléchargement. **■ Arrêter** interrompt une boucle sans fin.
Le script porte sur le modèle **tel qu'il est affiché** ; `model.selection` contient l'élément ouvert dans le panneau
de détail ; `model.diagrams` les diagrammes du `.aird` s'il est chargé (🔲 Diagrammes).

**Bibliothèque** : 💾 enregistre le script dans le projet (bloc de la 💾 page HTML, repris par 📄 Ouvrir un projet
de travail), 📂 importe des fichiers `.js`, ⬇ exporte le script affiché.
**Dossier partagé** (📁, Chrome / Edge) : un dossier de scripts — à côté du modèle, sur un partage réseau — dont les
`.js` apparaissent dans la bibliothèque ; 💾 réécrit le fichier, et un nouveau script y est enregistré. Le dossier est
retrouvé à la prochaine ouverture (le navigateur peut redemander l'autorisation : un clic sur 📁).

## L'essentiel de l'API

| Objet | Rôle |
|---|---|
| `model` | `root` (ingénierie système), `selection`, `getElementById(id)`, `elements(filtre)`, `find(filtre)`, `count(filtre)`, `findByPath('A/B/C')`, `layer('LA')`, `types()`, `fileName`, `tool` (`'Arcalyse'`) ; `diagrams`, `hasDiagrams` |
| élément | `id`, `type`, `fullType`, `layer`, `name`, `summary`, `description`, `review`, `label`, `owner`, `path`, `isSkeleton`, `isTechnical` ; `children(f)`, `descendants(f)`, `findByPath(p)`, `attribute(n)`, `attributes()`, `isA(type)`, `references(attr)`, `referencedBy(attr)`, `links(relation, 'in'/'out')` ; `diagrams` (diagrammes qui le montrent) |
| diagramme | `id`, `name`, `type`, `code` (LAB, SDFB…), `layer`, `kind`, `target` |
| `metamodel` | `isA(type, parent)`, `supertypes(type)`, `has(type)`, `types()`, `version` |
| `analysis` (avec `await`) | `functions()`, `chains()`, `traceability({ leafOnly })`, `capabilities()`, `states()`, `health()`, `requirements()`, `properties()`, `data()`, `constraints()`, `status()`, `categories()`, `rec()`, `libraries()`, `scenarios()`, `ports()`, `functionalExchanges()`, `componentExchanges()`, `physicalLinks()`, `deployment()`, `checks(vue)`, `nameQuality(nom)`, `diagramsOf(élément)` |
| `out` | `print`, `warn`, `error`, `table(lignes, colonnes, {title})`, `csv(lignes, colonnes, {separator})`, `file(nom, texte)`, `progress(fait, total)`, `clear()` ; `console.log` = `out.print` |
| `ui` (avec `await`) | `ask(question, défaut)`, `confirm(question)`, `choose(question, liste, {multiple})`, `readFile()`, `readCsv()` ; `parseCsv(texte)` |

Filtre : un nom de type (`'Component'` : sous-types compris, héritage du métamodèle de Capella), une fonction, ou un
objet `{ type, exactType, layer, name (texte ou RegExp), technical, where }`.
Relations de `links()` : celles de la vue 🔗 Liens — `allocation`, `functionalExchange`, `componentExchange`,
`physicalLink`, `exchangedItem`, `realization`, `involvement`, `exploitation`, `deployment`, `exchangeAllocation`,
`componentExchangeAllocation`, `portAllocation`, `source`, `target` (extrémités d'un échange) — avec l'élément porteur (`via`).

**Analyses** : chaque fonction rend les données calculées par la vue correspondante, rendues « propres » (JSON) ; tout
objet qui désigne un élément du modèle porte en plus `element` (l'élément de l'API, ou `null`). Les noms des champs
sont ceux des moteurs d'Arcalyse (voir les commentaires de `arcalyse.d.ts`) ; `checks(vue)` rend des sections
normalisées `{ view, title, tip, severity, columns, rows }` avec le 🩺 profil de contrôles appliqué.

```js
// Composants logiques sans fonction allouée
const rows = model.elements({ type: 'LogicalComponent', where: c => !c.isSkeleton })
  .filter(c => !c.links('allocation', 'out').length)
  .map(c => ({ component: c, owner: c.owner }));
out.table(rows);
out.file('composants-vides.csv', out.csv(rows));
```

```js
// Score de santé et contrôles bloquants
const h = await analysis.health();
out.print('Score', h.score, '/ 100');
for (const c of await analysis.checks()) if (c.severity === 'err' && c.rows.length) out.warn(c.view, c.title, c.rows.length);
```

```js
// Chaînes fonctionnelles dont une étape n'est allouée à aucun composant
for (const ch of await analysis.chains()) {
  const libres = ch.steps.filter(s => s.element && !s.element.links('allocation', 'in').length).map(s => s.element);
  if (libres.length) out.print(ch.element, '→', libres);
}
```

```js
// Export : une ligne par exigence et ses éléments liés
const csv = await ui.confirm('Exporter en CSV ?');
const rows = (await analysis.requirements()).list.map(q => ({ id: q.ident, requirement: q.element || q.name, linked: (q.links || []).map(l => l.element || l.name) }));
out.table(rows);
if (csv) out.file('exigences.csv', out.csv(rows));
```

Un type mal orthographié, une relation ou un critère inconnus lèvent une erreur explicite, avec le numéro de ligne du script.

## Isolement

Dans la page, le script s'exécute dans un **worker** construit à partir du noyau de l'API et du script : il n'a accès
ni à la page, ni au fichier, ni au stockage du navigateur ; `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`
sont retirés. Il travaille sur un **instantané** du modèle (éléments, relations, diagrammes) et demande ses analyses à
la page, qui les calcule avec ses moteurs et ses caches. Un script partagé par un collègue ne peut donc ni envoyer le
modèle ailleurs ni toucher à la page. Si le navigateur refuse le worker, le script s'exécute dans la page, ce que la
console signale.

## Portabilité avec Arcature

Un script écrit pour Arcalyse qui n'utilise que `model`, `metamodel`, `out` et `ui` tourne tel quel dans Arcature
(qui, lui, peut aussi modifier le modèle). `model.tool` (`'Arcalyse'` / `'Arcature'`) et `typeof analysis` permettent
à un script d'adapter son comportement. Différences de lecture : `model.root` est l'ingénierie système dans Arcalyse
(le projet dans Arcature) et `path` commence par son nom ; `isTechnical` suit la liste des types techniques d'Arcalyse ;
`isSkeleton` est une approximation (ingénierie, architectures, paquetages et fonctions racines).
