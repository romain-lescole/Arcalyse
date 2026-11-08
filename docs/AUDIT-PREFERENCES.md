# Audit — ce qui peut entrer dans ⚙ Préférences

État au 7 novembre 2026. Audit seulement : aucun code modifié.
Maquette interactive de l'éditeur de couleurs étendu : artifact privé « Couleurs d'Arcalyse » (lien dans la discussion).

## 1. Ce qui existe

| Où | Réglable aujourd'hui | Persistance |
|---|---|---|
| ⚙ Préférences (64) | niveau des menus, vues sans données, style de la barre, thème, suivi du fichier, enregistrement auto, format des exports ; renvois vers 🩺 profil, ✍ nommage, ⚙ .json | `_capNav` (`cap-toolbar`) |
| 🎨 Thème personnalisé (38) | 16 variables `--c-*` (fonds, textes, accent, bordures, statuts, Relation Map) + 6 couleurs de couches ARCADIA ; « partir de », aperçu en direct, contraste texte / panneau, ⬇ ⬆ JSON | `cap-theme-custom`, partie ⚙ `theme` |
| 🩺 Profil (14) | contrôles actifs, gravités, poids, 4 seuils `CAP_CHK_PARAMS` | `cap-checks` |
| 🗺 Relation Map (07) | couleur d'un type ou d'une relation (clic sur la pastille) | **non conservée** : `rmViewCapture` ne garde que `relF` / `typF` (booléens) — perdue au rechargement |
| ▦ Matrice (91) | marques et couleurs par onglet (`capMxStyle`) | partie ⚙ `matrix` |

Limites constatées :
- les **couleurs des couches ne s'appliquent qu'avec le thème 🎨 Personnalisé** (`capThemeLayersApply`) : impossible de garder le thème Clair avec d'autres couleurs de couches ;
- un seul thème personnalisé, à la fois « interface » et « couleurs du modèle » ;
- les impacts 🔴 🟡 🟢 (98) sont des **émojis** : leur couleur n'est pas réglable ; les badges, eux, suivent `--c-err` / `--c-warn` / `--c-ok`, déjà dans l'éditeur ;
- `styles.css` : 295 couleurs littérales dont 95 seulement en repli de `var(--c-…, #…)` ; le reste = nuances fixes (pastilles, dégradés), à ne pas exposer une par une.

## 2. Inventaire des couleurs codées en dur

| # | Palette | Module · constante | Valeurs | Intérêt | Coût | Risque |
|---|---|---|---|---|---|---|
| C1 | Couches ARCADIA | 20 `CAP_LAYERS` | 6 | **fort** (déjà éditable, à désolidariser du thème) | faible | moyen : sert de texte sur le fond (correcteur auto 02) et de fond à 15 % |
| C2 | Chaînes | 23 `CAP_CHAIN_COLORS` | 3 | fort | faible | faible |
| C3 | Types d'éléments | 20 `TCFG` (couleur par couche + `FUNCTION_TYPES_COLORS`, nœud / comportement PA) | ≈ 15 règles | fort (Relation Map, cartes) | moyen (déjà modifiable en 07 : manque la persistance) | moyen : texte sur nœud via `capInk` |
| C4 | Relations Capella | 22 `CAP_LINK_SECTIONS` `srcC` / `tgtC` + `RCFG` | ≈ 20 × 2 | moyen | moyen | faible |
| C5 | Familles SysML | 87 `CAP_SY_FAM_COULEUR` | 4 | moyen | faible | faible |
| C6 | Liaisons SysML (couleur + pointillé) | 87 `CAP_SY_REL_STYLE` | 22 | anecdotique (couleur) / utile (pointillés lisibles en N&B) | moyen | faible |
| C7 | Relation Map de Cameo | 90 `CAP_SY_RM_COULEURS` | 8 cycliques | anecdotique | faible | faible |
| C8 | Natures UML (Vue Blocs) | 92 `CAP_UML_NAT_C` | 8 cycliques | moyen | faible | faible |
| C9 | Liens UML (état) | 92 `capUmlLienCouleur` | suit `--c-err` / `--c-dim` | déjà couvert | — | — |
| C10 | Traçabilité UML | 95 `CAP_UML_TRACE_RELS` | ≈ 8 | moyen | faible | faible |
| C11 | Graphiques du tableau de bord | 35 `CAP_DASH_PAL` (clair + sombre) | 8 × 2 | **fort** (charte d'entreprise) | faible | moyen : palette catégorielle validée, à garder distinguable |
| C12 | Natures d'allocation | 35 `CAP_DASH_AK` (= filtre de ƒ) | 4 | moyen | faible | faible |
| C13 | Statut de revue | 68 `CAP_ST_CLS.h` | 4 (dont 3 = statuts) | faible : lier aux statuts | faible | faible |
| C14 | Scénarios (style papier Capella) | 49 `CAP_SC_COL` | ≈ 25 | moyen | moyen | **fort** : dessin pensé fond blanc |
| C15 | Machines à états calculées | 99 `CAP_UML_STM_COL` | ≈ 10 | moyen | moyen | **fort** : idem |
| C16 | Marques de la ▦ Matrice | 91 `CAP_MX_COULEURS` | 7 | déjà par onglet | — | — |
| C17 | Icônes complémentaires | 84 `capIcoPlusTable` | 108 | **non** (dessin d'icônes façon Capella) | — | — |
| C18 | Badges de format | 20 `CAP_FMT_*` | 4 | anecdotique | faible | faible |
| C19 | Documents exportés (dossier, revue ciblée, chaînes HTML / PDF) | 24, 58, 61 | ≈ 140 | moyen (charte des livrables) | élevé (gabarits en chaîne) | moyen : imprimés sur blanc |

## 3. Autres réglages codés en dur

| # | Réglage | Où | Valeur | Intérêt | Coût | Risque |
|---|---|---|---|---|---|---|
| R1 | Lignes par page | 78 `CAP_PG_SIZE`, 44 `CAP_FEX_PAGE`, 47 `CAP_CB_PAGE`, 92 `CAP_UML_BLK_PAGE` | 200 / 100 | **fort** (un seul réglage « Lignes par page » 100 / 200 / 500) | faible | moyen : lenteur au-delà de 500 en Vue Blocs |
| R2 | Taille au plus des matrices | 44 `CAP_FEX_MX_MAX`, 47 `CAP_CB_MX_MAX`, 92 `CAP_UML_BLK_MX` | 100 | moyen | faible | moyen (≈ 1,6 s à 300) |
| R3 | Seuils UML hors 🩺 profil | 97 `CAP_UML_DIT_MAX`, `CAP_UML_CBO_MAX` | 5 / 10 | **fort** (à mettre dans `CAP_CHK_PARAMS`) | faible | nul |
| R4 | Densité par défaut de la Vue Blocs | 92 / 47 `st.dense` | détaillée | moyen | faible | nul |
| R5 | Vue de départ des familles | 92 `st.view` (`block` / `lanes`), 44 / 47 | fixe | faible (la dernière vue est déjà retenue `_capNavLastGrp`) | faible | nul |
| R6 | Valeurs d'une nouvelle vue 🗺 | 03 `S` (profondeur 3, LR, légende, numéros, noms des relations, coupe à 16, ⊙ unique) ; 10 l. 136 | fixes | moyen | faible | nul |
| R7 | Vue à l'ouverture d'un modèle | 56 (🏠 Accueil) | Accueil | moyen | faible | nul |
| R8 | Taille du texte / densité de l'interface | `styles.css` (615 `font-size`) | — | **fort** (écrans 4K, vidéoprojecteur) | moyen à élevé | moyen : `zoom` CSS et coordonnées D3 / visionneuse |
| R9 | Pas du zoom à la molette | 54 `CAP_DIAG_ZOOM_MOLETTE` | 1,15 | anecdotique | faible | nul |
| R10 | Limites d'affichage | 21 `CAP_CARDS_MAX` 500, `CAP_TREE_LIST_MAX` 300, 62 `CAP_XL_MAX` 400, 45 `CAP_DR_SCREEN_MAX` 1500 | — | faible | faible | moyen (performance) |
| R11 | Palette Ctrl+K | 67 `CAP_PAL_MAX` 8, `CAP_PAL_RECENT` 6 | — | anecdotique | faible | nul |
| R12 | Historique 💚 santé | 69 `CAP_SANTE_MAX_HIST` | 60 | anecdotique | faible | nul |

## 4. Organisation proposée de ⚙ Préférences

1. **☰ Affichage** — menus, barre, *taille du texte* (R8), *vue à l'ouverture* (R7).
2. **🎨 Thème et couleurs** — choix du thème (existant) + bouton « Ajuster les couleurs… » qui ouvre l'**éditeur étendu** (ci-dessous).
3. **📋 Vues et listes** (nouvelle) — lignes par page (R1), matrices (R2), densité Vue Blocs (R4), valeurs d'une nouvelle vue 🗺 (R6).
4. 🔄 Suivi du fichier · 5. 💾 Enregistrement · 7. ⬇ Exports — inchangées.
6. **🩺 Contrôles et nommage** — + seuils R3 (via `CAP_CHK_PARAMS`, donc dans le profil existant).
8. **⚙ Partager / rétablir** (renommée) — export / import `CAP_CFG_PARTS`, **« Rétablir les valeurs par défaut »** par rubrique et global (avec `capConfirm({danger:true})`).

Chaque rubrique : bouton ↺ « Valeurs par défaut » en pied ; champ 🔍 de recherche dans les préférences (filtre les lignes `.cap-pref-row`).

## 5. Éditeur de couleurs étendu (prolonge `capThemeEditor`)

Principe : **deux étages**, sans dupliquer l'éditeur.
- **Interface** = les 16 variables `--c-*` d'aujourd'hui → restent le thème 🎨 Personnalisé (inchangé, `cap-theme-custom`).
- **Couleurs du modèle** = palettes C1 à C15 → **réglages indépendants du thème**, valables avec Sombre, Clair, Office 2007, Contraste ou Personnalisé ; chaque palette peut avoir une valeur commune ou une valeur par ton (clair / sombre).

Mise en œuvre envisagée :
- un registre `CAP_COUL` (nouveau module, après 38) : `{k, l, groupe, cible:()=>objet, champs:[[clé, libellé, accès]]}` ; les constantes existantes **restent** (valeurs d'origine) et sont **modifiées en place** à l'application, comme le fait déjà `capThemeLayersApply` pour `CAP_LAYERS` — aucun module consommateur à réécrire ;
- une valeur peut être un **lien** vers une variable (`@--c-ok`) : statut de revue, liens UML en défaut… suivent le thème ;
- `capThemeEditor` reçoit des **onglets** (Interface · Couches & familles · Types & relations · Chaînes & diagrammes · Graphiques & statuts) ; la grille `row()` / `wire()` / `preview()` existante sert aux deux étages ; les couches quittent le thème personnalisé (reprise automatique des anciennes valeurs `layers`) ;
- **spécimen en direct** à droite : puces de couches, mini Relation Map, chaînes, barres du tableau de bord, mini séquence ; contraste affiché par couleur (texte sur panneau, et `capInk` pour le texte posé dessus) en **clair et en sombre** ;
- **préréglages** : « D'origine », « Okabe-Ito (daltonisme) », « Niveaux de gris (impression) » ;
- ↺ par ligne, par palette et global ; ⬇ ⬆ JSON (même format `capellaTheme` étendu d'une clé `pal`) ;
- persistance : bloc `cap-couleurs` dans la page + partie ⚙ `theme` élargie (« 🎨 Thème et couleurs »), lue sans erreur par les pages ≥ 2.1 (bloc absent = valeurs d'origine) ;
- types et relations de la 🗺 (C3, C4) : les changements faits dans le panneau des critères (07) deviennent persistants par ce même registre.

Hors périmètre conseillé : icônes (C17), nuances fixes de `styles.css`, gabarits des documents exportés (C19, lot à part si demandé).

## 6. Lots proposés

| Lot | Contenu | Taille |
|---|---|---|
| 1 | Registre `CAP_COUL` + persistance + éditeur à onglets + spécimen ; palettes C1, C2, C5, C8, C11, C12, C13 ; couches désolidarisées du thème | moyen |
| 2 | Types et relations de la 🗺 (C3, C4) persistants, C6, C7, C10 | moyen |
| 3 | Diagrammes calculés (C14, C15) : choix « papier Capella » / « suivre le thème » + couleurs | moyen, risque contraste |
| 4 | 📋 Vues et listes (R1, R2, R4, R6, R7) + seuils R3 dans le 🩺 profil | petit |
| 5 | Organisation de ⚙ (rubriques, 🔍, ↺ par rubrique, rétablir tout) | petit |
| 6 | Taille du texte de l'interface (R8) | moyen, à prototyper |
