# Textes et traduction anglaise

## Ce qui existe

| Fichier | Rôle |
|---|---|
| `docs/TEXTES.md`, `docs/textes.csv` | **Inventaire de tous les textes affichés** (généré par `node tools/textes.js`, colonne anglaise avec `--en`). Sert à relire l'orthographe et la cohérence des termes, et à suivre l'avancement de la traduction. Ne pas modifier : corriger dans le source à la ligne indiquée, puis régénérer. |
| `docs/i18n/en-dictionnaire.json` | Dictionnaire **français → anglais** repris de l'ancienne version bilingue (sept. 2026) : `code` (≈ 860 littéraux du JS, clé = texte français exact, fragments HTML compris), `interface` (≈ 120 textes et infobulles de `interface.html`), `types` (66 descriptions de types Capella, clé = nom du type). |
| `docs/i18n/aide.en.html` | Traduction anglaise de l'aide, **à mettre à jour** : elle date d'avant le filtre Allocation, l'allocataire, le tableau de bord, l'impression A4, le filtre façon Excel, le thème par défaut Office 2007 ; elle mentionne encore un sélecteur 🌐 FR/EN qui n'existe plus. |

Le projet actuel est **uniquement en français** : rien de ce dossier n'est encore branché dans `build.js`.

## Démarche retenue pour produire une version anglaise (à faire dans Claude Code)

1. **Le texte français reste la clé** : dans le code, envelopper chaque libellé affiché par `_L('texte français')`. Le code reste lisible, et `_L` renvoie le texte tel quel en français.
2. **Traduction au moment du build** : `node build.js --lang en` remplacera chaque `_L('…')` par sa traduction (dictionnaire `code`), traduira les textes de `interface.html` (dictionnaire `interface`), utilisera `src/html/aide.en.html` et surchargera les descriptions de types (`types`). Résultat : `dist/relation-map-capella-en.html`, sans bascule de langue dans la page (pas de coût au démarrage, pas de mélange de langues).
3. **Contrôles du build anglais** : textes `_L` sans traduction, mots français restants dans la sortie anglaise, `</script` dans une traduction.
4. Avancer **module par module** (un module par session Claude Code), en relançant `node tools/textes.js --en` pour voir ce qui reste.

## Pièges connus (vécus lors de la première version bilingue)

- **Valeurs internes** : certains mots servent aussi de clés ou sont comparés dans le code (`'Nom'`, `'Cible'`, `'Paquetage'`, `'haut'`, `'bas'`, `'de'`…). Ne jamais envelopper un littéral utilisé dans une comparaison (`===`), un `switch`, une clé d'objet, un sélecteur ou un `split`. Les envelopper seulement là où ils sont affichés.
- **Phrases assemblées par morceaux** : `n + " chaîne" + (n>1?'s':'') + " exportée" + (n>1?'s':'')` ne se traduit pas morceau par morceau (accord des adjectifs, ordre des mots). Réécrire en phrase complète avec paramètre, par exemple une fonction `_Lp('{n} chaîne(s) exportée(s)', n)`.
- **Singulier obtenu par troncature** : `libellé.slice(0,-1)` (« Ajoutés » → « Ajouté ») ne marche pas en anglais : prévoir les deux formes.
- **Gabarits HTML** : beaucoup de textes sont au milieu de balises ; ne traduire que le texte, jamais les attributs `class`/`data-*`.
- **Noms de fichiers et en-têtes CSV** : à traduire aussi (`fonctions.csv` → `functions.csv`), mais pas les identifiants techniques.
- **Contenus des utilisateurs** : titres de tableaux de bord, règles de nommage, pages sauvegardées gardent la langue dans laquelle ils ont été saisis.
- **Qualité des noms** : la vérification reste bilingue (verbes français et anglais) quelle que soit la langue de l'interface.
