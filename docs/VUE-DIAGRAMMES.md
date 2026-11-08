# 🔲 Vue Diagrammes — harmonisation des deux affichages

État des lieux du 2026-11-05, demandé dans `docs/IDEES.md` › « Harmoniser les deux
affichages de la vue Diagrammes ». Rien n'est codé à ce stade : ce document sert à décider.

Deux affichages cohabitent dans `#cap-view-diag` :

- **Capella** : la visionneuse d'Arcature (`window.ArcatureVisionneuse`, `src/vendor/arcature-visionneuse*.js`, jamais
  modifiée à la main) est créée dans `#cdg-hote` ; Arcalyse pose autour d'elle une barre (`#cdg-barre`), un explorateur
  classé (`capDiagListe`), la ▣ carte déplacée (`capDiagCarte`), l'export en planches, ℹ Infos, ⧉ comparaison (83). La
  barre de la visionneuse est réorganisée sur deux lignes en déplaçant ses boutons (`capDiagBarreVd`, 54).
- **SysML v2 et UML / SysML v1** : `capSyVuesRender` (87) dessine lui-même dans `#cap-sy-vues` : liste par genre, barre
  d'une ligne, SVG du lecteur (`vue(cle).svg` dans un `<svg>` de la page), main, zoom, carte, notes, exports SVG / texte.
  `capRenderDiagrams` (54) aiguille : lecture SysML / UML présente → 87, sinon la visionneuse (les éléments de l'autre
  affichage restent dans le conteneur, masqués).

Relevé fait sur les API réelles (introspection, sans lire les sources vendor) : visionneuse 2026-11-05 ; lecteur SysML v2
(`vues`, `vue`, `vuesPour`, `genresVues`, `svgCss`, `iconeVue`) ; lecteur UML (`vues`, `vue`, `vuesPour`, `genresVues`,
`origines`, `svgCss`, `iconeVue` — `tableaux` absent).

## 1. Tableau commande par commande

Légende : ✔ existe · ◐ partiel · ✖ absent. « Où » : élément du DOM ou fonction. Dernière colonne : comment aligner.

| Commande | Capella (visionneuse + 54 / 83) | SysML v2 · UML / SysML v1 (87 / 88) | Alignement proposé |
|---|---|---|---|
| **Barre du haut d'Arcalyse** | ✔ `#cdg-barre` : 📂 Ouvrir le .aird…, ℹ Infos, ⧉ Comparer, ⬇ Exporter… (n), ☐ Sélectionner…, nom du fichier · n diagrammes, statut | ✖ aucune (la première ligne est la barre de la vue ouverte) | Une seule `capDiagBarre()` pour tous les formats : 📂 remplacé par rien (SysML : les vues viennent du modèle) ou par 📁 Dossier du projet ; ℹ, ⧉, ⬇ Exporter…, ☐ identiques ; libellé « n vue(s) · m diagramme(s) » |
| **Barre du dessin, ligne 1** (identité, recherche, thème, export, ✕) | ✔ `capDiagBarreVd` : ↩ retour, icône, sigle, nom (tronqué), [élément représenté masqué], 🔍 champ `#vd-chercher` ▲ ▼ compteur, ◐ thème, ⬇▾, ✕ | ◐ `.sy-vue-barre` (une seule ligne) : icône, sigle, nom, 🖼 Visuel / ≡ Texte, − ⊡ +, ▣ Carte, 📝 Note 💬 Calque, « n formes · m liens », ⬇ SVG, ⬇ Texte, 🔎 Élément | Même gabarit à emplacements fixes pour les deux : identité · ressort · recherche · thème · ⬇▾ · ✕. Capella : boutons de la visionneuse déplacés dans les emplacements (déjà le cas) ; SysML : boutons d'Arcalyse créés dans les mêmes emplacements |
| **Barre du dessin, ligne 2** (outils) | ✔ 📝 Note 💬 Calque (`#cdg-crv`) · chaînes `#vd-chaine` · ⧩ filtres · − % + ⤢ 1:1 ⌖ · ▣ · [édition `#vd-outils` masquée] · info tableau | ✖ pas de seconde ligne ; − ⊡ + et ▣ dans la ligne 1 | Ligne 2 commune : revue · chaînes (masqué sans contenu, comme aujourd'hui) · ⧩ filtres · zoom complet · ▣ carte · ressort · mode 🖼/≡ et taille du texte (à droite, nouveaux pour Capella si la visionneuse le permet) |
| **Explorateur (liste)** | ✔ `capDiagListe` : classement couche › type / couche / type / nom, groupes repliables ⊞ ⊟, filtre (nom, type, sigle, couche), cases à cocher (export), ℹ par ligne, actif suivi, clic droit (83), largeur réglable (double-clic : 330 px) | ◐ liste par genre (`genresVues` du lecteur), filtre (nom, genre, sigle), groupes repliables, origine (Cameo / EA / Papyrus / calculée) ; ✖ classement, cases, ℹ, clic droit, double-clic | Un seul explorateur sur une liste de « représentations » abstraite `{uid, nom, type, sigle, genre, couche, origine, icône}` : classements Capella (couche…) ; SysML / UML : genre › origine, genre, origine, élément porteur (paquetage), nom. Cases, ℹ, clic droit, largeur : communs |
| **▣ Carte** | ✔ `capDiagCarte` : mini-carte de la visionneuse (`#dgo-carte`) déplacée sous l'explorateur ou remise dans le dessin ; repliable | ✔ `capSyCarte` / `capSyCarteZoneHtml` : même en-tête (▾ ⇲ ⇱), mini-SVG propre avec cadre | Déjà homogènes à l'écran ; garder deux moteurs derrière une même zone `#cdg-carte-zone` et un même état (`carte`, `carteReduite`) |
| **Zoom et main** | ✔ visionneuse : − % + · ⤢ voir tout · 1:1 · ⌖ sur l'élément choisi (F) · Ctrl+molette · molette = défiler, Maj = horizontal · glisser sur le fond = **sélection par cadre** (édition) | ◐ − ⊡ (ajuster à la largeur) + · Ctrl+molette · glisser = **main** ; ✖ %, 1:1, ⌖, ⤢ voir tout | Pour SysML : ajouter % affiché, 1:1, ⤢ (tout le dessin), ⌖ (élément sélectionné `st.sel`) ; mêmes infobulles. Garder la main (la visionneuse n'en a pas : à demander, voir § 2) |
| **Recherche dans le dessin** | ✔ Ctrl+F, Entrée / Maj+Entrée, ▲ ▼, compteur, Échap efface, mise en évidence | ✖ (seul le filtre de la liste) | Recherche d'Arcalyse sur `vue.formes[].libelle` + `liens[].libelle` (et textes du SVG) : classe de mise en évidence, défilement vers la forme, Entrée / Maj+Entrée, compteur ; Ctrl+F capté quand la vue 🔲 est active sans visionneuse |
| **Thèmes** | ✔ `#vd-theme` : ◐ Capella / Clair / Sombre (`ArcatureVisionneuse.theme(t)`, pas de lecture) | ◐ suit le thème d'Arcalyse (`capSyTheme` → classes `clair` / `sombre`) ; `svgDocument({theme})` à l'export ; ✖ choix | Même sélecteur : « Auto (thème d'Arcalyse) », Clair, Sombre ; « Capella » proposé seulement avec la visionneuse |
| **Filtres d'affichage ⧩** | ✔ menu de la visionneuse : étiquettes des liens, un filtre par type de lien dessiné (compte), [ports, catégories selon le diagramme], Tout afficher ; `#vd-filtre-actif` | ✖ | Menu d'Arcalyse appliqué par CSS au SVG : étiquettes (`syv-etiquette`, textes des liens), liens par genre (SysML v2 : classes `syv-l-<genre>` ✔ ; UML : seule `s1-lien` → classer soi-même d'après `vue.liens[].genre` ↔ `data-v`), compartiments, ports. Même bouton, même libellé « Tout afficher » |
| **Chaînes et chemins** | ✔ `#vd-chaine` (seuls ceux dessinés, `capDiagChainesFiltre`) | ✖ sans objet (pas de chaîne) ; UML : partitions / flux non isolables | Emplacement présent, masqué sans contenu (comportement actuel) |
| **Export SVG / PNG / impression** | ✔ ⬇▾ : SVG, PNG ×1, PNG ×2, Imprimer / PDF… ; tableau → CSV | ◐ ⬇ SVG (`svgDocument`), ⬇ Texte ; ✖ PNG, impression | Même menu ⬇▾ pour SysML : SVG, PNG ×1 / ×2 (`capSvgToCanvas`), Imprimer / PDF (page d'impression avec le SVG), + Texte (SysML / UML). Capella : Texte à demander (§ 2) |
| **Planches (PDF, ZIP, HTML)** | ✔ `capDiagExport`, `capDiagPlanche`, sommaire, cartouche, annexe (`capDiagElements` sur `data-sem`), `capDiagMeta` (description, cible, date lues dans le .aird) | ✖ | `capDiagSvg(uid)` : `sy:` → `vue.svgDocument({theme:'clair'})` (porte `data-sem` ✔) ; `capDiagCibles` / `capDiagReps` étendus aux `sy:` ; `capDiagMeta` : description = `documentation` de `vue.element`, cible = `vue.element` ; couleur de planche = famille (`CAP_SY_FAM_COULEUR`) au lieu de la couche ; sommaire par genre |
| **⧉ Comparaison (83)** | ✔ `capDgwOuvrir(uid)` (SVG de `capDiagSvg`), liste par couche, zoom, main, clic → détail, clic droit explorateur et dessin | ✖ (`capDgwOuvrir` refuse sans `_capDiag.vis`) | Fonctionne dès que `capDiagSvg` et `capDiagReps` servent les `sy:` ; liste groupée par genre ; clic droit commun de l'explorateur |
| **ℹ Infos (`capDiagInfo`)** | ✔ panneau de détail : badge, type, sigle, couche, nature, nb éléments, modifié le, fichier, uid, description, élément représenté, éléments affichés par type (cliquables) | ✖ (seulement 🔎 Élément) | Même fiche : genre, origine (Cameo…), sigle, élément porteur, n formes · m liens, éléments affichés (`data-sem` du SVG), description de l'élément porteur, fichier ; bouton 🔲 Afficher |
| **Notes 💬 (calque)** | ✔ `capRevDiagBar` dans `#cdg-crv`, contexte `capRevDiagCtx` (`#vd-svg`, `#vd-zone`) | ✔ `capSyRevCtx` ; boutons `#sy-crv-note` / `#sy-crv-layer` recréés à part | Un seul `capRevDiagBar()` dans l'emplacement revue des deux barres (ids `cdg-crv-*`) ; contexte inchangé |
| **Section « Diagrammes » du détail** | ✔ `capDiagDetail` : `diagrammesDe(id)` = diagrammes **dont il est la cible** + **où il est dessiné**, lien → `capDiagOpen(uid, id)` centré ; titre « Diagrammes (n) » | ◐ `capSyVuesDetail` : `vuesPour(id)` = vues **calculées sur** l'élément ; ✖ diagrammes du fichier (Cameo, EA, Papyrus) où il est dessiné (`vuesPour` les ignore : relevé sur Drone-2026x) ; titre différent | Même section « Diagrammes (n) », même ligne (icône, sigle, nom, type) ; présences calculées par Arcalyse (index `vue(cle).formes[].element` sur toutes les vues, une fois par lecture) en attendant le lecteur |
| **Tableaux** | ✔ genre `tableau` dessiné par la visionneuse (`<table>` dans `#vd-zone`, « 43 lignes · 23 colonnes », export CSV) ; exclus des planches et de ⧉ | ✖ (tableaux / matrices des `.mdzip` : autre chantier) | Genres `tableau`, `matrice`, `relations` (icônes `iconeVue` déjà fournies par le lecteur UML) rendus par Arcalyse dans le même hôte ; mêmes exclusions |
| **Mode ≡ Texte, taille du texte** | ✖ (aucune API) | ✔ `vue.texte`, `capSyTexteHtml`, Ctrl+molette, − ⊡ + | Garder pour SysML / UML ; Capella : à demander à Arcature (§ 2). En attendant : « Texte » Capella = liste des éléments représentés (ℹ Infos) |
| **Raccourcis** | ✔ visionneuse : Ctrl+F, Entrée / Maj+Entrée, Échap, G (grille), F (zoom élément), Ctrl+W / Alt+W (fermer), Ctrl+molette, Maj+molette | ◐ Ctrl+molette seulement | Gestionnaire d'Arcalyse (vue 🔲 active, sans visionneuse) : Ctrl+F, Entrée / Maj+Entrée, Échap, F, + − 0 ; la grille et Ctrl+W restent propres à la visionneuse |
| **Aide** | ligne « 🔲 Diagrammes Capella » (`aide.html` l. 201), revue l. 493 | lignes séparées : SysML l. 419, UML l. 428 | Une ligne « 🔲 Diagrammes » commune (commandes, barre, raccourcis) + remarques par format ; idem `aide.en.html` |
| **Clic → panneau de détail** | ✔ option `choix` de la visionneuse | ✔ clic sur `[data-sem]` | Déjà commun |
| **Explorateur : classement 🌳 Arborescence** (demandé le 2026-11-05 soir) | ✖ classements couche / type / nom seulement | ✖ par genre seulement | Classement supplémentaire, compact (une ligne par nœud, type en petites capitales, conteneurs sans diagramme omis) : chaque diagramme sous l'élément qu'il représente — Capella : cible du descripteur (`capDiagMeta(uid).cible`, `diagrammesDe(id).cibles`), groupe « Sans élément représenté » à la racine ; SysML / UML : `vue.element` (vues calculées sous le même élément) ; chemin par `capCompAncestors` / propriétaires du `cap_xmlDoc` |
| **🌳 Arborescence du modèle (21) : diagrammes à leur place** (idem) | ✖ | ✖ | Feuilles « diagramme » sous l'élément cible dans `capRenderTreeNode` (icône de la visionneuse ou `iconeVue`, sigle, nom ; type pseudo « Diagramme » filtrable par une case ; compteur) ; clic → `capDiagOpen(uid, id)` ; même règle à décider pour le panneau gauche de la 🗺 Relation Map (09) |
| **Suivi de l'actif, historique, 🔍 palette, 💬 Revue, 📐 tableau de bord** | ✔ `capDiagOpen`, `capDiagReps` (`uid`) | ◐ `sy:<clé>` géré par `capDiagOpen` et la palette, pas par 📐 (image enregistrée) ni par 🏠 📎 | `capDiagReps()` renvoyant aussi les `sy:` règle 56, 60, 67, 76, 82, 85 d'un coup ; 📐 : image = `svgDocument` |

## 2. Piste « une seule enveloppe Arcalyse » — évaluation

**Principe** : la vue 🔲 est une enveloppe d'Arcalyse (barre du haut, explorateur, carte, barres du dessin, recherche,
filtres, exports, planches, comparaison, ℹ, notes) qui ne confie que le **dessin** à un *moteur* :
`moteur = { liste(), ouvrir(uid, id), svg(uid), elements(uid), meta(uid), theme(t), zoom…, chercher… }`, avec deux
implémentations : **visionneuse** (Capella) et **lecteur** (SysML v2, UML / SysML v1 ; `vue(cle)` : `svg`, `viewBox`,
`formes`, `liens`, `texte`, `svgDocument`).

**Verdict : faisable et souhaitable, mais asymétrique.** Côté lecteurs, l'enveloppe a déjà tout en main (le SVG est un
objet de la page : Arcalyse zoome, cherche, filtre, exporte). Côté visionneuse, l'enveloppe ne peut que **piloter des
boutons** qu'elle déplace, car l'API publique n'expose pas les commandes : c'est le point fragile actuel (chaque reprise de
la visionneuse peut déplacer un identifiant ; la reprise du 2026-11-05 a ajouté des outils d'édition `#vd-outils`,
aujourd'hui masqués par Arcalyse).

Ce que les API **permettent déjà** :

- visionneuse : `creer(hôte, {choix})`, `chargerModele`, `chargerAird`, `representations()` (uid, nom, type, sigle, genre,
  couche), `diagrammesDe(id)` (cibles, présences), `ouvrir(uid, id)`, `choisir(id)`, `theme(t)`, `icone`, `iconeType`,
  `fermer` ; édition de la mise en page (`modes`, `disposer`, `origine`, `disposition`, `oublier`), hors sujet ici ;
- lecteurs : `vues()` (cle, genre, sigle, libelleGenre, nom, element, origine, sysml), `vue(cle)` (svg, viewBox, formes
  avec `element`, `figure`, `libelle`, `x y w h`, `compartiments`, `ports` ; liens avec `genre`, `source`, `cible`,
  `points`, `libelle` ; `texte` ; `svgDocument({theme})` avec `data-sem`), `vuesPour(id)`, `genresVues`, `svgCss`,
  `iconeVue(genre|{genre, sysml})` — y compris `tableau`, `matrice`, `relations`.

Ce que les API **ne permettent pas** (à demander côté Arcature) :

| Manque | Conséquence aujourd'hui | Demande |
|---|---|---|
| Visionneuse : pas d'export programmé (`svg(uid)`, `png(uid)`) | `capDiagSvg` ouvre le diagramme, clique le menu ⬇ et détourne `URL.createObjectURL` + `a.click` (54 l. 722) | `exporter(uid, 'svg'\|'png', {echelle})` → chaîne / Blob, sans ouvrir ni télécharger |
| Pas de commandes en API : recherche, filtres, zoom, ajuster, cadrer, taille du texte, barre | `capDiagBarreVd` déplace les boutons par identifiant ; l'enveloppe ne peut ni lire ni régler l'état | `creer(hôte, {barre:false})` + `chercher(texte, sens)`, `filtres()` / `filtres(obj)`, `zoom(f \| 'ajuster' \| 'reel')`, `cadrer(id)`, `carte(on)` ; ou garantie de stabilité des `#vd-*` |
| Pas de mode texte ni de taille du texte | SysML a ≡ Texte, Capella non | `texte(uid)` (même forme que `vue.texte` du lecteur) ; option `police` / `taille` ou prise en compte d'une variable CSS |
| `representations()` sans description, élément cible, date | Arcalyse relit le `.aird` à l'expression régulière (`capDiagMeta`) | `representation(uid)` → `{documentation, cible, modif}` |
| Éléments d'un diagramme seulement par le SVG affiché | ℹ Infos et planches doivent ouvrir chaque diagramme | `elements(uid)` sans ouverture |
| Une seule instance (identifiants fixes) | ⧉ comparaison affiche un SVG statique (83) | `creer` avec préfixe d'identifiants, ou plusieurs instances |
| `theme(t)` sans lecture ; pas de « main » (glisser = sélection par cadre) | état non relisible ; gestes différents de SysML | `theme()` ; option `main:true` ou bouton ✋ |
| Lecteur UML : `vuesPour(id)` ignore les diagrammes du fichier où l'élément est dessiné | section « Diagrammes » du détail incomplète pour Cameo / EA / Papyrus | inclure les présences (ou `diagrammesDe(id)` comme la visionneuse) |
| Lecteur UML : `liens[].source` / `cible` = `"undefined"` sur Drone-2026x (Cameo) | recherche et filtres par lien peu fiables | corriger (identifiants des formes) |
| Lecteur UML : liens sans classe par genre (`s1-lien` seul) | filtre « liens par genre » impossible en CSS pur | classe `s1-l-<genre>` comme `syv-l-<genre>` en SysML v2 |
| `svgCss` écrite pour un document autonome (`svg{width:100%…}`) | `capSyCssPortee` réécrit la feuille (87) | `svgCss({portee})` ou styles portés par une classe racine |
| Lecteurs : pas de `tableaux()` (chantier `.mdzip`) | genres `tableau` / `matrice` / `relations` vides | voir `docs/IDEES.md` |

Rien de tout cela ne bloque l'étape 3 : l'enveloppe peut être écrite **maintenant** avec, côté visionneuse, un moteur
« par boutons » (ce que fait déjà `capDiagBarreVd`), remplacé par les API quand Arcature les fournira.

## 3. Ordre de réalisation proposé (étapes 3 et 4 de la demande)

Maquette annotable (canevas, planches A à E, questions Q1 à Q9) : https://claude.ai/artifact/LZnT9zvwTRrC3qSWPZhJip (privée).

1. **Représentations communes** : `capDiagReps()` renvoie Capella **ou** les vues des lecteurs (`uid` `sy:<clé>`,
   `couche` = '' , `genre`, `origine`, `famille`) ; `capDiagSvg`, `capDiagMeta`, `capDiagElements`, `capDiagCouche`
   (couleur par couche ou par famille) servent les deux → planches, ⧉ comparaison, ℹ Infos, 🏠 📎, 📐 suivent.
2. **Explorateur commun** : `capDiagListe` sur ces représentations (classements par format, cases, ℹ, clic droit,
   largeur) ; `capSyVuesRender` n'affiche plus de liste.
3. **Barres communes** : gabarit à emplacements (`capDiagBarreVd` généralisé) ; moteur « lecteur » : recherche, filtres
   ⧩, zoom complet, thème, ⬇▾ (SVG, PNG, impression, Texte), mode ≡ et taille du texte ; emplacement revue unique.
4. **Raccourcis et aide** : gestionnaire clavier de la vue (hors visionneuse), aide FR / EN réécrite en une entrée commune.
5. **Diagrammes à leur place** : classement 🌳 Arborescence de l'explorateur 🔲 (compact) et feuilles « diagramme » dans la vue
   🌳 Arborescence du modèle (planche E de la maquette) ; index cible → diagrammes calculé une fois par .aird / lecture.
6. Tableaux / matrices / relations : place réservée (genres, icônes, exclusions), rendu quand le lecteur les fournira.

Vérifications prévues à chaque étape : `node build.js` (+ `--lang en`, `--lang multi`), `node tests/oracles.js`,
`node tests/smoke.js` (+ `--en`), `node tests/uml.js`, `node tests/sysml.js`, `node tools/index.js`.

## 4. Réalisation (2026-11-06)

Décisions prises (questions de la maquette) : Q1 rien à la place de 📂 pour SysML / UML ; Q2 sélecteur Auto · Clair · Sombre pour les
lecteurs, celui de la visionneuse inchangé pour Capella ; Q3 ≡ Texte Capella = liste des éléments représentés par type ; Q4 ordre de la
ligne 2 tel que proposé ; Q5 / Q8 « Genre › origine » par défaut pour les lecteurs, « Couche › type » pour Capella, 🌳 Arborescence pour
tous ; Q7 vue 🌳 Arborescence du modèle seulement (Relation Map plus tard) ; Q9 compteurs affichés.

Fait :
- 54 : `capDiagSy`, `capDiagCharge`, `capDiagReps` commun, `capDiagCouche` (familles), `capDiagParents` / `capDiagCibleId` / `capDiagParCible`,
  `capDiagDe` / `capDiagSyIdx`, explorateur (`capDiagGroupes` : genre-origine, genre, origine, arbo ; `capDiagArbo`, `capDiagDefautOuvert`),
  `capDiagBarre` et `capRenderDiagrams` pour les deux formats, `capDiagOuvrirUid`, ℹ Infos et section « Diagrammes » communes, `capDiagSvg` /
  `capDiagMeta` pour les `sy:`, ≡ Texte Capella (`capDiagModeHtml`, `capDiagTexteMaj`, `capDiagTexteHtml`) ;
- 87 : partie droite `capSyVuesRender` (lignes 1 et 2), `capSyVueRep` / `capSyVuesReps`, `capSyCarteRender`, `capSyChercher`,
  `capSyFiltresAppliquer` / `capSyFiltresBadge`, `capSyExporter`, `capSyZoom` (tout, réel), `capSyCentrer`, `capSyPct`, raccourcis ;
  `capSyVuesDetail` et `capSyCarteZoneHtml` retirées (remplacées par 54) ;
- 21 : feuilles « diagramme » dans `capRenderTreeNode`, case 🔲 Diagrammes (`capTreeDiag`) ;
- 25, 43, 67, 82, 83, 85 : passage par `capDiagReps` / `capDiagDe` / `capDiagOuvrirUid` ; CSS ; aide FR / EN ; traductions ; smoke adapté.

Reste : voir `docs/IDEES.md` (tableaux des `.mdzip`, Relation Map, demandes à Arcature du § 2).

