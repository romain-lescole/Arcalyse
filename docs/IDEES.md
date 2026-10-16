# Idées à réaliser

Pistes validées avec l'utilisateur, à reprendre plus tard.

## 📄 Rapports automatiques à partir d'un modèle de document (après la v2.0)

Produire un document chapitré automatiquement à partir d'un **modèle de document** réutilisable d'une version du modèle à l'autre.

- **Modèle de document** (JSON, enregistré dans la page et le fichier ⚙ comme les tableaux de bord) : liste de chapitres, chacun composé de blocs :
  - titre, texte libre ;
  - **diagramme** désigné par son nom ou par une **règle** (« tous les ES de SA », couche + type + motif de nom) → un sous-chapitre par diagramme, avec la **description Capella juste avant** le diagramme, légende de figure ;
  - **tableau** issu des calculs existants (interfaces SA, échanges fonctionnels, allocations fonctions → composants, exigences liées, données…) ;
  - liste d'éléments avec leurs descriptions.
- **Moteur** : numérotation (1, 1.1…), sommaire, légendes, assemblage.
- **Sorties** : HTML imprimable (PDF par le navigateur) en premier ; **Word .docx** ensuite (ZIP de XML via `capZipBuild`, styles de titres numérotés, images PNG).
- **Éditeur** visuel du modèle de document, sur le principe de 📐 Tableau de bord (catalogue de blocs, aperçu).
- Briques déjà disponibles : capture SVG des diagrammes, description et élément représenté (`capDiagSvg`, `capDiagMeta`, `capDiagElements`, 54), `capHtmlReport` (26), `capPdfBuild` / `capZipBuild` (24), calculs des vues 📡 et 🔬.
- À décider avant de commencer : désignation robuste des diagrammes (règles plutôt que noms exacts), format cible prioritaire (Word ou HTML/PDF), liste des tableaux de la V1.
- Estimation : V1 (modèle JSON + règles + description + quelques tableaux + HTML) ≈ une grosse séance ; éditeur ≈ une séance ; export Word ≈ une à deux séances.

## ◇ SysML v2 — suites possibles (après la première version)

- **Import JSON** (format d'échange KerML / SysML, `@id` / `@type`) : mêmes vues, identifiants d'origine.
- **Sérialiseur** `.sysml` canonique et aller-retour (`parse(emit(parse(f)))`), base d'une édition dans Arcalyse (formulaires) — à arbitrer avec Arcature v2, qui porte l'éditeur.
- **Mise en page conservée** des diagrammes SysML (positions déplacées à la souris, enregistrées dans la page, `.arcature/layout/*.json` d'un `.kpar`).
- **Sequence View** (messages entre lignes de vie : `message`, `event occurrence`), réutilisant le rendu de 🎬 Scénarios.
- Résolution plus fine : membres des types de la bibliothèque (index étendu), spécialisations implicites détaillées (§7.6.8, clause 8.3), contraintes `validate…` restantes.
