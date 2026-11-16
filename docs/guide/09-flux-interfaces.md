<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [8. ⚡ Chaînes](08-chaines.md) · [10. 🔲 Diagrammes](10-diagrammes.md) ▶</sub>

# 9. 📡 Flux & interfaces

Vues d'interfaces d'un modèle Capella, du fonctionnel au physique, accessibles par le menu **🏗 Architecture ▾** (familles *ƒ Fonctions & échanges* : ƒ⇆ Échanges fonctionnels, 🟨 Activités OA ; *🧱 Composants & interfaces* : SA · System Component, LA · Logical Component, PA · Behavior Exchange, PA · Physical Link, 🧩 Ports ; *⚡ Chaînes & scénarios* : 🎬 Scénarios) et par la barre de famille, qui mène d'une vue de la famille à l'autre ([§ 3.2](03-interface.md#32-menus-des-vues-épingles-et-ctrlk)).

**Organisation commune** à ƒ⇆, 🟨, 🧱, 🔀 et 🔌 : chaque vue s'ouvre en **◧ Vue Blocs** (rendu façon Capella, navigation d'un bloc à l'autre) et propose aussi **◎ Voisinage** (un élément au centre et ses voisins, ci-dessous), **≡ Vue Ligne**, **▣ Vue Composant / Fonction / Activité**, **▦ Matrice** N² et **🩺 Contrôles**. Dans 🔀 Behavior Exchange et 🔌 Physical Link, ◧ Vue Blocs et ◎ Voisinage sont deux boutons de la barre de la Vue Blocs. Les commandes de chaque barre sont **entourées par catégorie** (vues, filtres et champs, exports) et restent visibles en haut lors du défilement. Chaque vue a sa visite : **❓ Aide ▾ › 🎯 Visite de cette vue**.

> 💡 En thème sombre, la Vue Blocs est plus lisible — et plus proche de Capella — avec le thème **Office 2007** ou **Clair**.

| Commande commune | Effet |
|---|---|
| Champs **Fonction / Composant** et **🔍 Échange** | Filtre texte (un échange est gardé si l'une de ses deux extrémités correspond). |
| Cases **Système · Acteurs · Non allouées** (ou Nature) | **Clic** : afficher / masquer ; **double-clic** : uniquement celle-ci (double-clic à nouveau : tout réafficher). |
| Liste **🏷 Toutes catégories** (ƒ⇆, 🔀, 🔌) | Échanges d'une catégorie (ExchangeCategory, ComponentExchangeCategory, PhysicalLinkCategory) ou **— sans catégorie** ; proposée seulement si le modèle a des catégories ([§ 12.14](12-analyses.md#1214--catégories-déchanges)). |
| **🔲 Diagramme** (🧱, 🔀, 🔌) | Ne garde que ce qui est affiché dans un diagramme du `.aird` de la couche : voir ci-dessous. |
| Liste **Tous les allocataires / Tous les composants** | Un acteur précis, ou le système et ses sous-systèmes en arbre (sous-composants compris). |
| **☐ Masquer les composants sans port N** / **☐ Masquer les fonctions sans port ni échange N** | Retire de la vue les blocs sans port (des conteneurs le plus souvent) ou les fonctions mères ; le nombre dit combien seraient retirés, la case est encadrée quand le filtre est actif. |
| **◎** à côté du nom d'un bloc | Ouvre ◎ Voisinage avec ce bloc au centre. |
| **◀ ▶** | Pages de 100 blocs (exports : tout le résultat filtré). |
| **⬇ CSV · ⬇ HTML · ⬇ HTML (toutes les vues)** | CSV enrichi ([§ 9.8](#98--csv-enrichi-colonnes-de-lexport)) ; rapport HTML de la vue affichée ; rapport à onglets dont on **choisit les vues** dans une fenêtre (◧ Vue Blocs, ◎ Voisinage de l'élément au centre, ≡ Ligne, ▣ Composant / Fonction, ▦ Matrice ; 🩺 Contrôles décoché par défaut), avec recherche (blocs compris), matrice cliquable et, dans la Vue Blocs, liens « aller au bloc » et listes de fonctions dépliables. 🔀 Behavior Exchange et 🔌 Physical Link incluent leur Vue Blocs. |

**◎ Voisinage** : un élément **au centre** avec ses ports (ou pins), les éléments qui lui envoient un échange **à gauche** et ceux qui reçoivent de lui **à droite**, chacun en bloc avec son port ; un trait coloré par échange, son nom au-dessus. Sous le bloc central : ses fonctions allouées (🧱, 🔀, 🔌) et son conteneur (« dans « … » »).

![◎ Voisinage d'un Logical Component](img/53-cblk-voisinage.png)

| Commande | Effet |
|---|---|
| **Au centre** | Liste des éléments de la vue (filtres appliqués), les plus reliés d'abord, avec leur nombre de liens ; sans choix, le plus relié est au centre. |
| **Clic sur un voisin** | Il passe au centre ; le fil **Visités** (5 derniers) permet de revenir en arrière. |
| **Clic sur un échange, un port ou le bloc central** | Panneau de détail. |
| **− 100 % + · 1:1** | Zoom du dessin. |
| **⬇ SVG · ⬇ PNG** | Image du dessin (PNG en double résolution). **⬇ CSV** de la barre de la vue : un échange par ligne, vu depuis l'élément central (côté entrant / sortant, port, élément relié). |

**🔲 Diagramme** (filtre de 🧱 System / Logical Component, 🔀 Behavior Exchange et 🔌 Physical Link, quand le `.aird` du projet est chargé) : choisissez un diagramme de la couche (**[sigle] nom** ; *Tous les diagrammes* = pas de filtre), puis la portée : **entre composants affichés** (tous les liens du modèle dont les deux extrémités sont dessinées, même s'ils ne le sont pas eux-mêmes) ou **liens dessinés** (seulement ceux qui figurent dans le diagramme) ; **✕** retire le filtre. Dans 🧱, seuls les composants dessinés restent affichés. Les exports CSV et HTML suivent le filtre. Depuis un diagramme ouvert dans 🔲 Diagrammes, le bouton **⇄ Liens** ouvre directement la ≡ Vue Ligne filtrée sur ce diagramme : 🧱 pour un diagramme SA ou LA ; pour un diagramme PA, un petit menu **🔌 Physical Links** (entre les nœuds) ou **🔀 Component Exchanges (Behavior)** ([§ 10](10-diagrammes.md)).

## 9.1 ƒ⇆ Functional Exchange

Échanges entre fonctions (toutes couches), avec filtre par couche **Toutes · OA · SA · LA · PA** (réglé aussi par le sélecteur **Couche** de la barre de famille ƒ Fonctions & échanges), filtre **Allocation** (🧩 Système, 👤 Acteurs, ∅ Non allouées) et liste **Tous les allocataires** de la couche.

![Functional Exchange — Vue Blocs](img/50-fex-vue.png)

**◧ Vue Blocs** (défaut) : chaque fonction dessinée comme dans Capella — boîte **verte** si allouée au système, **bleue** si allouée à un acteur, **grise** si non allouée (ou fonction mère) ; **pins d'entrée** (verts) à gauche, **de sortie** (orange) à droite, avec le nom du port ; à côté de chaque pin, l'**échange** et la **fonction distante**. En petit en haut du bloc : son rattachement (composant ou acteur d'allocation, sinon fonction mère).

- **clic sur la fonction distante** : affiche son bloc (changement de page et filtres relâchés si besoin) ; **↩ Revenir** ramène au bloc de départ ;
- **clic sur le titre** d'un bloc : panneau de détail ;
- pin **pâle** : port non connecté ; pin **en pointillés** : échange relié directement à la fonction, sans port (cas normal en OA).

**◎ Voisinage** : une fonction au centre avec ses pins (entrée verte, sortie orange), à gauche les fonctions qui lui envoient un échange, à droite celles qui reçoivent d'elle ; Exchange Items en infobulle des échanges ; sa fonction mère sous le bloc. ⬇ CSV : les échanges de la fonction centrale.

![Functional Exchange — ◎ Voisinage](img/50-fex-voisinage.png)

| ≡ Vue Ligne | ▣ Vue Fonction |
|---|---|
| ![Vue Ligne](img/50-fex-vue-ligne.png) | ![Vue Fonction](img/50-fex-vue-fonction.png) |
| Fonction source, pin de sortie et port → **échange** → pin d'entrée et port, fonction cible ; Exchange Items (▤), Component Exchanges qui l'allouent (🔀), chaînes (⚡). | Une carte par fonction : échanges reçus (←) et émis (→). |

| ▦ Matrice | 🩺 Contrôles |
|---|---|
| ![Matrice](img/50-fex-matrice.png) | ![Contrôles](img/50-fex-controles.png) |
| Fonction × fonction (ligne = source, colonne = cible), limitée aux **100 fonctions les plus connectées** ; **clic sur une cellule** = liste des échanges. | Ports orphelins, échanges sans Exchange Item, fonctions feuilles sans échange, fonctions mères portant des ports, échanges sans port (hors OA), échanges LA / PA non alloués à un Component Exchange. |

## 9.2 🟨 Operational Analysis

![Operational Analysis](img/51-oav-vue.png)

Activités opérationnelles (OA) et leurs interactions, dans l'esprit des diagrammes **OAIB** : blocs jaunes à coins arrondis avec le pictogramme OA, interactions entrantes à gauche et sortantes à droite (clic sur une activité distante : aller à son bloc), entité ou acteur porteur en petit en haut du bloc. Filtres : activité, interaction ou Exchange Item, allocation (🏢 Entités, 👤 Acteurs, non allouées, ou une entité / un acteur précis). Dans le menu, c'est **🟨 Activités OA** de la famille ƒ Fonctions & échanges.

**◎ Voisinage** comme dans ƒ⇆, avec une activité au centre :

![Operational Analysis — ◎ Voisinage](img/51-oav-voisinage.png)

| ≡ Vue Ligne | ▣ Vue Activité | ▦ Matrice | 🩺 Contrôles |
|---|---|---|---|
| ![](img/51-oav-vue-ligne.png) | ![](img/51-oav-vue-activite.png) | ![](img/51-oav-matrice.png) | ![](img/51-oav-controles.png) |

## 9.3 🧱 System Component (SA) et 🧱 Logical Component (LA)

Deux vues identiques : **System Component** pour la couche SA, **Logical Component** pour la couche LA ; composants avec leurs **Component Ports** et **Component Exchanges**.

![Logical Component — Vue Blocs](img/53-cblk-vue.png)

**◧ Vue Blocs** : chaque composant dessiné comme dans Capella (bleu = système, bleu clair = acteur), avec le nombre de fonctions allouées (ƒ) et de sous-composants (⧉). Ports selon leur **orientation** : UNSET, **IN** (chevron vers l'intérieur, à gauche), **OUT** (vers l'extérieur, à droite), **INOUT** (côté le moins chargé). À côté de chaque port : l'échange, son sens (de / vers / ⇄) et le composant distant (cliquable, **↩ Revenir**). Port pâle : non connecté.

**ƒ n fonctions ▾** sous le nom d'un bloc déplie la liste des **fonctions allouées** (numérotées, filtre au-delà de 12) ; clic sur une fonction : son bloc dans ƒ⇆ Functional Exchange.

**◎ Voisinage** : un composant au centre avec ses ports ; un échange sans sens se place du côté indiqué par l'orientation du port (image en tête de chapitre).

Filtres : **🧱 Composant**, **🔍 Échange**, **☐ Masquer les composants sans port n**, **🔲 Diagramme**, **Nature** (🧩 Système, 👤 Acteurs ; double-clic : uniquement ceux-ci) et **Tous les composants** (un composant et ses sous-composants, **✕** pour retirer).

| ▣ Vue Composant | ≡ Vue Ligne |
|---|---|
| ![](img/53-cblk-vue-composant.png) | ![](img/53-cblk-vue-ligne.png) |
| Une carte par composant : échanges émis (→), reçus (←), bidirectionnels (⇄) ou non orientés. | Un Component Exchange par ligne. |

| ▦ Matrice | 🩺 Contrôles |
|---|---|
| ![](img/53-cblk-matrice.png) | ![](img/53-cblk-controles.png) |
| Composant × composant (100 composants au plus). | Ports orphelins, ports connectés sans orientation, orientations incohérentes, composants feuilles sans port ou sans fonction allouée. |

La vue **🧱 System Component** a la même organisation (ici sur un modèle dont la couche SA n'a pas de Component Exchange : la vue Composant liste le système et les acteurs, les contrôles relèvent un composant feuille sans port) :

![System Component](img/52-csys-vue.png)

| ▣ Vue Composant | 🩺 Contrôles |
|---|---|
| ![](img/52-csys-vue-composant.png) | ![](img/52-csys-controles.png) |

**Sens d'un échange** déduit des deux ports : **→ Orienté / ← Inversé** (un port IN ou OUT impose le sens) · **⇄ Bidirectionnel** (ports INOUT) · **? Non orienté** (deux ports UNSET, trait pointillé) · **⚠ Incohérent** (OUT→OUT ou IN→IN, sauf pour une **DELEGATION**, dont le sens est déduit de l'imbrication).

## 9.4 🔀 Behavior Exchange (PA)

![Behavior Exchange](img/54-compex-vue.png)

Component Exchanges de la couche **PA** entre **Physical Components Behavior**, et entre un Behavior et un acteur relié (affiché avec ses seuls ports concernés). Le nombre retenu sur le total du modèle est rappelé en haut. Chaque échange affiche son **kind** (ASSEMBLY, DELEGATION, FLOW), ses FE alloués (ƒ), ses Exchange Items (▤) et ses Physical Links porteurs (🔌).

**◧ Vue Blocs** : les Physical Components Behavior dessinés comme dans 🧱 Logical Component (mêmes ports, mêmes filtres, fonctions allouées dépliables) ; sa barre propose aussi **◎ Voisinage**. Les autres présentations ont leurs propres filtres : **sens** (Tous · → Orienté · ← Inversé · ⇄ Bidirectionnel · ? Non orienté · ⚠ Incohérents, avec leur nombre ; seuls les sens présents sont proposés), **kind** (Tous kinds, ASSEMBLY, DELEGATION, FLOW), composant, échange, **🏷 catégorie**, **🔲 Diagramme**.

![◎ Voisinage d'un Physical Component Behavior](img/54-compex-voisinage.png)

| ≡ Vue Ligne | ▣ Vue Composant | ▦ Matrice | 🩺 Contrôles |
|---|---|---|---|
| ![](img/54-compex-vue-ligne.png) | ![](img/54-compex-vue-composant.png) | ![](img/54-compex-matrice.png) | ![](img/54-compex-controles.png) |

Contrôles : CE sans FE, ports orphelins, orientations incohérentes, CE non orientés, CE de couche PA non alloués à un lien physique.

## 9.5 🔌 Physical Link

![Physical Link](img/55-physlink-vue.png)

Liens entre **Physical Components Node** (et acteurs) via leurs **PhysicalPort**. **◧ Vue Blocs** : nœud jaune (système) ou bleu clair (acteur), ports physiques en carré jaune ; à côté de chaque port, le Physical Link (⇄) et le nœud distant (cliquable) ; **◎ Voisinage** : un nœud au centre, les nœuds reliés par leurs Physical Links autour. Pour chaque lien : les Component Exchanges alloués (⇢) et, sur chaque port, un badge **n CP** (Component Ports alloués). Les listes longues sont repliées après 4 éléments : **+N autres** pour les déplier. Filtres Nature (🖥 Nœuds, 👤 Acteurs) et sous-composants (Vue Blocs), **Tous · ⇢ Avec CE · ∅ Sans CE**, **🏷 catégorie**, **🔲 Diagramme** (liens physiques entre les nœuds affichés dans un diagramme PA, ou seulement ceux qui y sont dessinés ; ⬇ CSV exporte alors cette liste : composants, ports, Component Ports alloués, lien, Component Exchanges alloués).

![◎ Voisinage d'un nœud : ses Physical Links et ses ports](img/55-physlink-voisinage.png)

| ≡ Vue Ligne | ▣ Vue Composant | ▦ Matrice | 🩺 Contrôles |
|---|---|---|---|
| ![](img/55-physlink-vue-ligne.png) | ![](img/55-physlink-vue-composant.png) | ![](img/55-physlink-matrice.png) | ![](img/55-physlink-controles.png) |

Contrôles : liens sans CE, ports physiques non reliés ou sans Component Port, CE de couche PA non alloués.

## 9.6 🧩 Ports

Traçabilité **Function Port ↔ Component Port ↔ Physical Port**, reconstruite à partir des PortAllocation et ComponentPortAllocation.

![Ports — Traçabilité](img/56-ports-vue.png)

| Sous-vue | Contenu |
|---|---|
| **≡ Traçabilité** | Une ligne par Function Port / Component Port, avec FE, CE, ports physiques et liens. Filtres couche (**Toutes · SA · LA · PA**), texte, **Seulement les chaînes incomplètes**. ⬇ CSV. |
| **▣ Par composant** | Ports physiques → Component Ports portés ; Component Ports ← Function Ports alloués. |
| **🩺 Contrôles** | Ports non alloués à chaque niveau ; sens incohérent entre port de fonction et port de composant ; alignement FE ↔ CE et CE ↔ PL ; délégations suivies de proche en proche. |

| ▣ Par composant | 🩺 Contrôles |
|---|---|
| ![](img/56-ports-par-composant.png) | ![](img/56-ports-controles.png) |

## 9.7 🎬 Scénarios

![Scénarios](img/57-scen-vue.png)

Diagrammes de séquence des scénarios Capella — **ES** (Exchange Scenario), **FS** (Functional Scenario), **OES / OAS** (OA), **IS** (Interface Scenario) — redessinés à partir du seul `.capella`.

- **à gauche**, la liste rangée par couche puis par capacité ; filtres **Couche** (Toutes, OA, SA, LA), **Type** (Tous, OES, FS, ES…) et recherche ;
- **à droite**, le diagramme : lignes de vie (bleu clair = acteur, bleu = composant, vert = fonction, gris = entité), messages (avec, pour les ES, le contexte d'échange entre accolades), barres d'activation, fonctions, états (ellipses gris clair) et modes (gris foncé), **fragments combinés** (ALT, OPT, LOOP, PAR…) avec leurs gardes, références **« ref »** vers un autre scénario (clic : l'ouvrir) ;
- **clic** sur un élément : son détail ; les noms des lignes de vie restent visibles en haut au défilement ;
- défilement par les barres, la molette (**Maj + molette** : horizontal) ou en **cliquant-glissant sur le fond** ;
- **− 100 % +** : zoom ; **⬇ PNG · ⬇ SVG · 📋 Copier** l'image ;
- **🩺 Contrôles** : scénarios vides, messages sans échange, lignes de vie sans élément représenté, scénarios hors capacité, références introuvables.

![Scénarios — contrôles](img/57-scen-controles.png)

> L'ordre des événements est celui du modèle ; les espacements sont calculés (la mise en page dessinée dans Capella est dans le `.aird`) : le contenu est fidèle, pas la position au pixel près.

## 9.8 ⬇ CSV enrichi (colonnes de l'export)

Dans les vues d'interfaces (🏗 Architecture) et 🔬 Analyses, **⬇ CSV** ouvre d'abord la fenêtre **« Colonnes de l'export »** :

- **retirer** des colonnes ;
- pour chaque colonne qui désigne des éléments (fonction, port, échange, composant…), **ajouter des informations** insérées juste à côté : ID, type, type lisible, couche, owner, chemin des owners, description, summary, n'importe quel attribut (**＋ Attribut…**), et les ✨ colonnes par chemin du ▤ Tableau dont le type correspond ;
- **↺ Colonnes de base** revient à l'export d'origine.

Les choix sont **retenus pour chaque export** et enregistrés avec la 💾 page HTML et le fichier ⚙.

---

<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [8. ⚡ Chaînes](08-chaines.md) · [10. 🔲 Diagrammes](10-diagrammes.md) ▶</sub>
