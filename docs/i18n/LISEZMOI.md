# Textes et traduction anglaise

Les sources sont **en français**. La version anglaise est **produite au build** : pas de bascule de langue dans la page (pas de coût au démarrage, pas de mélange de langues).

```
node build.js --lang en               # → dist/arcalyse-en.html (+ dist/arcalyse-en-manquants.txt s'il reste des textes à traduire)
node build.js --lang en --livraison   # → livraison/arcalyse-en.html (sur demande explicite uniquement)
node tests/smoke.js --en              # test navigateur de la version anglaise
```

## Ce qui existe

| Fichier | Rôle |
|---|---|
| `src/i18n/en-dictionnaire.json` | Dictionnaire **français → anglais** utilisé par le build : `code` (textes du JS, clé = texte français exact, `${…}` notés `{0}`, `{1}`…), `interface` (textes et infobulles de `interface.html`, complétés par `code`), `types` (descriptions des types Capella, clé = nom du type). Trié par clé. |
| `src/html/aide.en.html` | Aide en anglais, utilisée à la place de `src/html/aide.html` par le build anglais. **À mettre à jour en même temps que l'aide française.** |
| `tools/i18n.js` | Bibliothèque commune : `translateCode` (remplacement des `_L` d'un module), `translatePattern` (recherche d'une traduction), `visible`. |
| `tools/i18n-envelopper.js` | Enveloppe automatiquement par `_L` les libellés d'un ou plusieurs modules (première passe ; liste les textes écartés car techniques). |
| `tools/i18n-restants.js` | Liste les littéraux non enveloppés qui contiennent encore du français affiché ; `--envelopper` les enveloppe (hors contextes techniques, préfixés « ! »). |
| `tools/i18n-coherence.js` | Signale un littéral comparé (`===`, `case`, `includes`…) non enveloppé alors que le même texte est enveloppé et traduit ailleurs. |
| `tools/i18n-residus.js` | Après traduction, liste les littéraux qui ressemblent encore à du français. |
| `docs/TEXTES.md`, `docs/textes.csv` | Inventaire de tous les textes affichés (`node tools/textes.js`, colonne anglaise avec `--en`). Ne pas modifier : corriger dans le source puis régénérer. |

## Fonctionnement

1. **Le texte français reste la clé** : dans le code, chaque libellé affiché est enveloppé par `_L('texte français')` ou `` _L(`… ${x} …`) ``. `_L` (module 01) renvoie le texte tel quel : la version française n'est pas modifiée.
2. **Au build anglais**, l'argument de chaque `_L` est remplacé par sa traduction, cherchée dans cet ordre :
   - le littéral entier (`` _L(`${n} fonction(s)`) `` → clé `"{0} fonction(s)"`) ;
   - sinon chaque morceau : texte entre deux balises HTML, valeur des attributs `title` / `placeholder` / `alt` / `aria-label` (les `{n}` sont renumérotés à partir de `{0}` dans chaque morceau) ;
   - sinon chaque bout de texte entre deux `${…}`.
   Une traduction peut déplacer ou omettre un `{n}` (accords, pluriels). Les `_L` imbriqués dans un gabarit sont traduits aussi. Les guillemets « » restés hors traduction deviennent “ ”.
3. `interface.html` est traduit en entier (dictionnaire `interface`, puis `code`) ; l'aide vient de `aide.en.html` ; les descriptions de types de `types` ; `CAP_LANG` vaut `'en'` ; les dates `toLocale…String('fr-FR')` passent en `'en-GB'`.
4. **Contrôles** : le build liste les textes sans traduction (restés en français) dans `dist/arcalyse-en-manquants.txt` (clé + emplacements) ; il vérifie la syntaxe et l'absence de `</script` après traduction.

## Ajouter ou modifier un texte

1. Écrire le libellé en français dans `_L('…')` (jamais autour d'une valeur comparée ou d'une clé, voir les pièges).
2. `node build.js --lang en` : le texte apparaît dans `dist/arcalyse-en-manquants.txt` ; ajouter la clé (copiée telle quelle) et sa traduction dans la partie `code` de `src/i18n/en-dictionnaire.json`. Un texte déjà en anglais se traduit par lui-même.
3. Texte de `interface.html` : partie `interface` (ou `code`). Aide : reporter la modification dans `aide.en.html`.
4. Vérifier : `node tools/i18n-restants.js` (rien d'oublié), `node tools/i18n-coherence.js` (valeurs internes), `node build.js --lang en` (aucun manquant).

## Pièges connus

- **Valeurs internes** : certains mots servent aussi de clés ou sont comparés dans le code (`'Entrée'`, `'vers'`, `'Mise en page'`, `relType` des relations…). Ne jamais envelopper un littéral utilisé dans une comparaison (`===`), un `switch`, une clé d'objet, un sélecteur ou un `split` — ou alors envelopper **les deux côtés** (`d===_L('Entrée')`), qui sont traduits de la même façon. `node tools/i18n-coherence.js` le contrôle.
- **Textes techniques** : polices (`'600 12px Segoe UI…'`), CSS, sélecteurs, identifiants d'indicateurs (`'mdl.n'`), contenu PDF, scripts embarqués : jamais dans `_L`.
- **Phrases assemblées par morceaux** : `n + " chaîne" + (n>1?'s':'')` se traduit mal morceau par morceau. Préférer un gabarit complet : `` _L(`${n} chaîne${n>1?'s':''} exportée${n>1?'s':''}`) `` → clé `"{0} chaîne{1} exportée{2}"`, traduction `"{0} chain{1} exported"`.
- **Singulier obtenu par troncature** (`libellé.slice(0,-1)`) : prévoir les deux formes.
- **Gabarits HTML** : seuls les textes et les attributs de texte sont traduits, jamais `class` / `data-*` / `style`. Un attribut coupé entre deux gabarits (`` ` title="…"` `` sans balise complète) se traduit par une clé contenant tout le fragment.
- **Noms de fichiers** : traduits aussi (`'fonctions.csv'` → `'functions.csv'`), en les enveloppant par `_L`.
- **Contenus des utilisateurs** : titres de tableaux de bord, règles de nommage, pages sauvegardées gardent la langue dans laquelle ils ont été saisis. Les choix d'export CSV, retenus par nom de colonne, sont propres à chaque langue.
- **Qualité des noms** : la vérification reste bilingue (verbes français et anglais) quelle que soit la langue de l'interface.
