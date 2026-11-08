/* ── 📖 Fiches des règles de validation UML / SysML v1 (98) ────────────────────────────────────────────────────────────────────────
   Explication de chaque règle vérifiée par le lecteur UML d'Arcature (88) : ce qu'elle dit, cause probable (surtout dans Cameo),
   est-ce grave, correction possible, et un niveau d'IMPACT RÉEL, distinct de la gravité de la norme (qui classe presque tout en erreur) :
   🔴 incoh (incohérence : le modèle se contredit), 🟡 verif (à vérifier : oubli ou doublon probable), 🟢 forme (écart de forme à la norme,
   sans conséquence pratique). Fiches écrites pour Arcalyse d'après la norme (UML 2.5.1, SysML 1.7) ; règles sans fiche écrite (dont les
   règles UAF) : fiche générique tirée du catalogue du lecteur (`regles()`), impact déduit de la catégorie (`capUmlRegleFiche`).
   Utilisées par Σ Répartition par règle (88), les sections 🩺 par impact (`capUmlChecks`), 🏠 Accueil (56, 88), le panneau de détail. */

/** Niveaux d'impact réel d'une règle : clé → [pastille, libellé, info-bulle, gravité 🩺 (`capDiagHtml`)]. */
const CAP_UML_IMPACTS={
  incoh:['🔴', _L('Incohérence'), _L('Le modèle se contredit : un lien, un flux ou une structure ne tient pas. À regarder en priorité.'), 'err'],
  verif:['🟡', _L('À vérifier'), _L('Souvent un oubli ou un doublon : le modèle reste lisible, mais une information manque ou est ambiguë.'), 'warn'],
  forme:['🟢', _L('Forme'), _L('Écart de forme à la norme, sans conséquence pratique (souvent la façon dont l\'outil enregistre le fichier). Ne compte pas dans le score de santé.'), 'info']
};

/** Fiches écrites : code de la règle → [impact, ce que dit la règle, cause probable, est-ce grave ?, correction]. */
const CAP_UML_REGLES_AIDE={
  // ── UML 2.5.1 ──
  'Classifier::no_cycles_in_generalization':['incoh', _L('Un type ne peut pas hériter de lui-même, directement ou par une chaîne de généralisations.'), _L('Généralisation tracée dans le mauvais sens, ou boucle créée en réorganisant une hiérarchie.'), _L('Oui : la hiérarchie n\'a plus de sens et les propriétés héritées sont indéterminées.'), _L('Supprimer ou inverser la généralisation qui ferme la boucle.')],
  'Classifier::specialize_type':['incoh', _L('Un type ne spécialise qu\'un type d\'un genre compatible (une classe hérite d\'une classe, pas d\'un cas d\'utilisation…).'), _L('Généralisation tracée entre deux éléments de natures différentes.'), _L('Oui : l\'héritage n\'a pas de signification.'), _L('Retirer la généralisation, ou la remplacer par une dépendance ou une réalisation.')],
  'Classifier::non_final_parents':['incoh', _L('Un type marqué final (isFinalSpecialization) ne peut pas être spécialisé.'), _L('Case « Is Final Specialization » cochée sur un parent qui a pourtant des enfants.'), _L('Moyennement : contradiction explicite de l\'auteur.'), _L('Décocher « final » sur le parent, ou retirer la spécialisation.')],
  'Namespace::members_distinguishable':['verif', _L('Deux éléments de même nature ne portent pas le même nom dans un même paquetage ou bloc.'), _L('Élément ou flux dessiné deux fois, copier-coller ; Cameo le laisse faire.'), _L('Faible : rien ne casse (les liens passent par l\'identifiant), mais les références par nom (scripts, rapports, SysML v2) deviennent ambiguës et c\'est souvent un vrai doublon.'), _L('Fusionner les doublons ou les renommer (par exemple avec la source et la cible pour un flux).')],
  'NamedElement::visibility_needs_ownership':['forme', _L('La visibilité (public, private…) n\'a de sens que pour un élément rangé dans un espace de noms.'), _L('Cameo enregistre visibility="public" sur des valeurs (valeurs par défaut, texte des contraintes, gardes) qui n\'en ont pas besoin.'), _L('Non : artefact d\'enregistrement, invisible pour l\'utilisateur.'), _L('Aucune dans le modèle ; désactiver la règle si ce bruit gêne.')],
  'MultiplicityElement::lower_ge_0':['incoh', _L('La borne basse d\'une multiplicité est positive ou nulle.'), _L('Saisie erronée (borne négative).'), _L('Oui : la multiplicité n\'a pas de sens.'), _L('Corriger la borne basse (0 ou plus).')],
  'MultiplicityElement::upper_ge_lower':['incoh', _L('La borne haute d\'une multiplicité n\'est pas plus petite que la borne basse.'), _L('Bornes inversées à la saisie (ex. 5..2).'), _L('Oui : aucune valeur ne respecte la multiplicité.'), _L('Remettre les bornes dans l\'ordre.')],
  'Property::multiplicity_of_composite':['incoh', _L('Dans une composition, le côté qui compose (le tout) a une borne haute de 1 au plus : une partie n\'appartient qu\'à un seul tout.'), _L('Multiplicité « * » laissée du côté du tout d\'une composition.'), _L('Moyennement : contredit la notion de composition.'), _L('Mettre 0..1 ou 1 côté composite, ou passer en agrégation partagée.')],
  'Association::binary_associations':['incoh', _L('Seule une association à deux extrémités peut être une composition ou une agrégation, et d\'un seul côté.'), _L('Losange posé des deux côtés, ou association à trois extrémités ou plus marquée composite.'), _L('Moyennement : la propriété du tout est ambiguë.'), _L('Garder le losange d\'un seul côté.')],
  'Association::ends_must_be_typed':['incoh', _L('Chaque extrémité d\'une association est typée.'), _L('Élément visé supprimé, ou extrémité restée vide après une réorganisation.'), _L('Oui : l\'association ne relie plus rien de défini.'), _L('Retyper l\'extrémité ou supprimer l\'association orpheline.')],
  'Actor::must_have_name':['verif', _L('Un acteur a un nom.'), _L('Acteur créé sans être renommé.'), _L('Faible : gêne la lecture des cas d\'utilisation.'), _L('Nommer l\'acteur.')],
  'UseCase::must_have_name':['verif', _L('Un cas d\'utilisation a un nom.'), _L('Cas créé sans être renommé.'), _L('Faible : gêne la lecture.'), _L('Nommer le cas d\'utilisation.')],
  'UseCase::cannot_include_self':['incoh', _L('Un cas d\'utilisation ne s\'inclut pas lui-même, directement ou par une chaîne d\'« include ».'), _L('Relation include tracée à l\'envers ou boucle d\'inclusions.'), _L('Oui : le déroulement du cas est infini.'), _L('Supprimer l\'include qui ferme la boucle.')],
  'Extend::extension_points':['incoh', _L('Les points d\'extension cités par une extension appartiennent au cas étendu.'), _L('Point d\'extension d\'un autre cas, ou cas étendu changé après coup.'), _L('Moyennement : l\'extension ne s\'accroche nulle part.'), _L('Choisir un point d\'extension du cas étendu.')],
  'Interface::visibility':['forme', _L('Les caractéristiques d\'une interface sont publiques.'), _L('Opération ou attribut d\'interface laissé en private ou protected.'), _L('Faible : une interface sert à exposer, la visibilité est ignorée en pratique.'), _L('Passer la visibilité à public.')],
  'Enumeration::immutable':['forme', _L('Les attributs d\'une énumération sont en lecture seule.'), _L('Attribut ajouté à une énumération sans cocher « read only ».'), _L('Non en pratique.'), _L('Cocher « read only », ou transformer l\'attribut en littéral.')],
  'Class::passive_class':['verif', _L('Seule une classe active (Is Active) possède une machine à états propre (comportement de classificateur) ou des réceptions de signaux.'), _L('Bloc avec une machine à états, mais « Is Active » resté décoché (valeur par défaut de Cameo).'), _L('Faible : incohérence de forme ; certains simulateurs en tiennent compte.'), _L('Cocher « Is Active » sur le bloc.')],
  'Operation::at_most_one_return':['incoh', _L('Une opération a au plus un paramètre de retour.'), _L('Deux paramètres marqués « return ».'), _L('Moyennement : la signature est ambiguë.'), _L('Garder un seul retour, passer les autres en « out ».')],
  'Constraint::not_apply_to_self':['incoh', _L('Une contrainte ne s\'applique pas à elle-même.'), _L('Contrainte choisie parmi ses propres éléments contraints.'), _L('Faible : erreur de saisie.'), _L('Retirer la contrainte de ses éléments contraints.')],
  'Region::initial_vertex':['incoh', _L('Une région de machine à états a au plus un état initial.'), _L('Deux pseudo-états initiaux dans la même région.'), _L('Oui : le point de départ est ambigu.'), _L('Garder un seul état initial par région.')],
  'Pseudostate::initial_vertex':['incoh', _L('Un état initial a au plus une transition sortante.'), _L('Plusieurs transitions tracées depuis l\'état initial.'), _L('Oui : le démarrage est indéterminé.'), _L('Garder une transition, ou passer par un choix.')],
  'Pseudostate::outgoing_from_initial':['verif', _L('La transition qui sort d\'un état initial n\'a ni garde ni déclencheur.'), _L('Condition ou événement posé sur la première transition.'), _L('Moyennement : la machine pourrait ne jamais démarrer.'), _L('Déplacer la condition sur une transition suivante (via un choix).')],
  'Pseudostate::fork_vertex':['incoh', _L('Une bifurcation (fork) a une transition entrante et au moins deux sortantes.'), _L('Fork incomplet ou utilisé à la place d\'un choix.'), _L('Moyennement.'), _L('Compléter le fork ou le remplacer par un choix.')],
  'Pseudostate::join_vertex':['incoh', _L('Une jonction (join) a au moins deux transitions entrantes et une sortante.'), _L('Join incomplet.'), _L('Moyennement.'), _L('Compléter ou retirer le join.')],
  'Pseudostate::choice_vertex':['incoh', _L('Un choix a au moins une transition entrante et une sortante.'), _L('Choix laissé en impasse.'), _L('Moyennement : la machine s\'y bloque.'), _L('Ajouter la transition manquante.')],
  'FinalState::no_outgoing_transitions':['incoh', _L('Aucune transition ne sort d\'un état final.'), _L('État final utilisé comme un état ordinaire.'), _L('Oui : un état final termine la région.'), _L('Remplacer par un état simple, ou retirer la transition.')],
  'InitialNode::no_incoming_edges':['incoh', _L('Aucun flux n\'entre dans un nœud initial d\'activité.'), _L('Boucle ramenée sur le nœud initial au lieu d\'un nœud de fusion.'), _L('Moyennement.'), _L('Ramener la boucle sur un nœud de fusion.')],
  'InitialNode::control_edges':['incoh', _L('Seuls des flux de contrôle sortent d\'un nœud initial.'), _L('Flux d\'objets tiré depuis le nœud initial.'), _L('Moyennement.'), _L('Changer le flux en flux de contrôle.')],
  'FinalNode::no_outgoing_edges':['incoh', _L('Aucun flux ne sort d\'un nœud final.'), _L('Nœud final utilisé comme point de passage.'), _L('Moyennement.'), _L('Retirer le flux sortant ou changer de nœud.')],
  'ForkNode::one_incoming_edge':['incoh', _L('Un nœud de bifurcation a un seul flux entrant.'), _L('Plusieurs flux convergent sur un fork.'), _L('Moyennement.'), _L('Placer un nœud de fusion ou de jonction avant le fork.')],
  'JoinNode::one_outgoing_edge':['incoh', _L('Un nœud de jonction a un seul flux sortant.'), _L('Plusieurs sorties sur un join.'), _L('Moyennement.'), _L('Placer un fork après le join.')],
  'MergeNode::one_outgoing_edge':['incoh', _L('Un nœud de fusion a un seul flux sortant.'), _L('Plusieurs sorties sur un merge.'), _L('Moyennement.'), _L('Placer une décision ou un fork après le merge.')],
  'DecisionNode::incoming_outgoing_edges':['incoh', _L('Un nœud de décision a un ou deux flux entrants et au moins un sortant.'), _L('Décision sans sortie ou avec trop d\'entrées.'), _L('Moyennement.'), _L('Compléter les sorties ; placer un merge avant si plusieurs entrées.')],
  'ControlFlow::object_nodes':['incoh', _L('Un flux de contrôle ne relie pas de nœud d\'objet (broche, nœud de données).'), _L('Flux de contrôle tracé vers une broche.'), _L('Moyennement : aucune donnée ne transite.'), _L('Remplacer par un flux d\'objets.')],
  'ObjectFlow::no_executable_nodes':['verif', _L('Un flux d\'objets ne relie pas directement une action : il passe par ses broches.'), _L('Flux d\'objets tracé sur le bord de l\'action plutôt que sur une broche.'), _L('Faible : l\'intention reste claire, mais la donnée n\'est pas typée.'), _L('Ajouter des broches d\'entrée / sortie et y rattacher le flux.')],
  'ActivityEdge::source_and_target':['incoh', _L('Les extrémités d\'un flux sont dans l\'activité qui le possède.'), _L('Flux déplacé dans une autre activité, ou nœud copié d\'une autre activité.'), _L('Oui : le flux relie deux activités différentes.'), _L('Recréer le flux dans la bonne activité.')],
  // ── Arcature ──
  'ARC_UML_01':['incoh', _L('Chaque identifiant cité dans le fichier existe dans le fichier.'), _L('Élément supprimé à moitié, fichier corrompu, ou fichier lié (bibliothèque, sous-modèle) absent.'), _L('Oui : un lien pointe vers rien.'), _L('Réparer ou supprimer la référence ; fournir le fichier lié (📁 dossier du projet).')],
  'ARC_UML_02':['forme', _L('Les classificateurs, paquetages et caractéristiques ont un nom (règle de bonne pratique d\'Arcature, absente de la norme).'), _L('Connecteurs et extrémités d\'associations laissés sans nom (l\'usage dans Cameo), parts ou ports nommés seulement par leur type.'), _L('Non pour les connecteurs ; pour les parts et ports, nommer aide la lecture.'), _L('Nommer les parts et ports ; règle désactivée par défaut.')],
  'ARC_UML_03':['incoh', _L('Aucune transition n\'entre dans un état initial.'), _L('Retour tracé vers l\'état initial au lieu d\'un état réel.'), _L('Oui : l\'état initial est un point de départ, on n\'y revient pas.'), _L('Ramener la transition vers le premier état réel.')],
  // ── SysML 1.7 ──
  'SysML::Block::1_associations_binary':['incoh', _L('Une association entre blocs a exactement deux extrémités.'), _L('Association n-aire créée entre blocs.'), _L('Moyennement.'), _L('Remplacer par plusieurs associations binaires ou un bloc d\'association.')],
  'SysML::Block::2_connectors_binary':['incoh', _L('Un connecteur d\'un bloc a exactement deux extrémités.'), _L('Connecteur à trois extrémités ou plus.'), _L('Moyennement.'), _L('Le scinder en connecteurs binaires.')],
  'SysML::Block::6_valueproperties_composite':['forme', _L('Une propriété typée par un ValueType (masse, tension…) est composite (« part » de valeur).'), _L('Propriété de valeur enregistrée en agrégation « none » (fréquent selon la façon dont elle est créée).'), _L('Non en pratique : la valeur reste lisible.'), _L('Passer l\'agrégation de la propriété à « composite ».')],
  'SysML::Block::7_composition_acyclic':['incoh', _L('Un bloc ne se contient pas lui-même par une chaîne de compositions.'), _L('Part typée par son propre bloc ou par un bloc qui le contient.'), _L('Oui : décomposition infinie.'), _L('Remplacer la composition qui ferme la boucle par une référence.')],
  'SysML::Block::8_specializations_are_blocks':['verif', _L('Ce qui spécialise un bloc est aussi un bloc.'), _L('Classe UML héritant d\'un bloc sans le stéréotype «block».'), _L('Faible.'), _L('Appliquer «block» à la classe.')],
  'SysML::BindingConnector::1_compatible_types':['incoh', _L('Les deux bouts d\'un connecteur d\'égalité (binding) ont des types compatibles.'), _L('Paramètre de contrainte lié à une valeur d\'un autre type ou d\'une autre unité.'), _L('Oui : l\'égalité n\'a pas de sens (kg = W…).'), _L('Aligner les types ou corriger la liaison.')],
  'SysML::DirectedRelationshipPropertyPath::1_sourcecontext_iif_property':['verif', _L('Une relation (allocate, satisfy, refine…) qui part d\'une propriété indique dans quel bloc elle est utilisée (sourceContext) ; sinon ce champ reste vide.'), _L('Relation créée dans une matrice ou l\'arborescence (Cameo ne remplit le contexte que depuis un diagramme de blocs interne), ou modèle antérieur à SysML 1.4.'), _L('Faible : imprécision quand le même bloc est utilisé à plusieurs endroits.'), _L('Renseigner le contexte, ou faire partir la relation du bloc.')],
  'SysML::DirectedRelationshipPropertyPath::2_targetcontext_iif_property':['verif', _L('Une relation qui vise une propriété indique dans quel bloc elle est utilisée (targetContext) ; sinon ce champ reste vide.'), _L('Allocation vers une part créée hors d\'un diagramme de blocs interne, ou modèle antérieur à SysML 1.4.'), _L('Faible : imprécision sur l\'usage visé.'), _L('Renseigner le contexte, ou viser le bloc.')],
  'SysML::DirectedRelationshipPropertyPath::3_sourcepropertypath_implies_property':['incoh', _L('Un chemin de propriétés côté source suppose que la source est une propriété.'), _L('Source changée après coup.'), _L('Moyennement.'), _L('Vider le chemin ou reprendre la relation.')],
  'SysML::DirectedRelationshipPropertyPath::4_targetpropertypath_implies_property':['incoh', _L('Un chemin de propriétés côté cible suppose que la cible est une propriété.'), _L('Cible changée après coup.'), _L('Moyennement.'), _L('Vider le chemin ou reprendre la relation.')],
  'SysML::ItemFlow::1_source_and_target_linked':['incoh', _L('Un flux d\'objet (ItemFlow) circule sur un chemin : un connecteur ou une association relie sa source et sa cible.'), _L('Flux tracé entre éléments qu\'aucun connecteur ne relie, ou connecteur porteur non désigné ; échanges fonctionnels modélisés en flux entre blocs.'), _L('Oui : le flux existe mais rien ne le porte ; interfaces et ports invérifiables.'), _L('Ajouter le connecteur et y rattacher le flux ; ou, entre fonctions, utiliser des flux d\'objets d\'activité.')],
  'SysML::ItemFlow::2_type_restricted':['verif', _L('L\'objet transporté par un flux est typé par un ValueType, un bloc ou un signal.'), _L('Objet typé par une classe UML ou un type primitif.'), _L('Faible.'), _L('Typer par un ValueType, un bloc ou un signal.')],
  'SysML::ItemFlow::3_itemproperty_common_owner':['incoh', _L('La propriété de l\'objet transporté appartient au bloc qui contient la source et la cible.'), _L('Propriété créée dans un autre bloc.'), _L('Moyennement.'), _L('Déplacer la propriété dans le bloc commun.')],
  'SysML::ItemFlow::4_association_xor_itemproperty':['incoh', _L('Un flux porté par une association n\'a pas de propriété d\'objet.'), _L('Les deux renseignés.'), _L('Faible.'), _L('Retirer l\'un des deux.')],
  'SysML::ItemFlow::5_same_type':['incoh', _L('La propriété de l\'objet transporté a le même type que l\'objet transporté.'), _L('Objet transporté changé sans mettre la propriété à jour.'), _L('Moyennement : deux informations se contredisent.'), _L('Aligner les types.')],
  'SysML::ItemFlow::6_same_name':['forme', _L('La propriété de l\'objet transporté porte le nom du flux.'), _L('Flux renommé sans renommer la propriété.'), _L('Non en pratique.'), _L('Aligner les noms.')],
  'SysML::FlowProperty::1_restricted_types':['verif', _L('Une FlowProperty est typée par un ValueType, un bloc ou un signal.'), _L('FlowProperty typée par un type primitif UML ou laissée sans type.'), _L('Faible : ce qui circule reste flou.'), _L('Typer par un ValueType, un bloc ou un signal.')],
  'SysML::ProxyPort::2_interfaceblock':['verif', _L('Un port proxy est typé par un InterfaceBlock.'), _L('Port proxy typé par un bloc ordinaire.'), _L('Faible : l\'intention reste claire.'), _L('Typer par un InterfaceBlock, ou passer en full port.')],
  'SysML::ProxyPort::3_subports_are_proxyports':['verif', _L('Les ports du type d\'un port proxy sont aussi des ports proxy.'), _L('Port imbriqué non stéréotypé.'), _L('Faible.'), _L('Appliquer «proxy» aux ports imbriqués.')],
  'SysML::ProxyPort::1_not_fullport':['incoh', _L('Un port n\'est pas à la fois proxy et full.'), _L('Deux stéréotypes appliqués au même port.'), _L('Moyennement : la nature du port est contradictoire.'), _L('Garder un seul des deux.')],
  'SysML::FullPort::1_not_proxy':['incoh', _L('Un port n\'est pas à la fois full et proxy.'), _L('Deux stéréotypes appliqués au même port.'), _L('Moyennement.'), _L('Garder un seul des deux.')],
  'SysML::FullPort::3_not_behavioral':['incoh', _L('Un full port n\'est pas « behavior ».'), _L('Case « Is Behavior » cochée sur un full port.'), _L('Faible.'), _L('Décocher « Is Behavior ».')],
  'SysML::InterfaceBlock::1_no_behavior':['incoh', _L('Un InterfaceBlock n\'a pas de comportement (machine à états, méthodes…).'), _L('Comportement rangé sous l\'InterfaceBlock.'), _L('Moyennement : une interface décrit, elle n\'agit pas.'), _L('Déplacer le comportement vers le bloc qui réalise l\'interface.')],
  'SysML::InterfaceBlock::2_no_part':['incoh', _L('Un InterfaceBlock n\'a pas de parts : seulement des ports, des valeurs et des FlowProperty.'), _L('Part ajoutée dans un InterfaceBlock.'), _L('Moyennement.'), _L('Remplacer la part par une référence ou une valeur.')],
  'SysML::InterfaceBlock::3_interfaceblock_typed_ports':['verif', _L('Les ports d\'un InterfaceBlock sont typés par des InterfaceBlock.'), _L('Port imbriqué typé par un bloc.'), _L('Faible.'), _L('Typer par un InterfaceBlock.')],
  'SysML::InterfaceBlock::4_isconjugated_not_used':['forme', _L('Un port typé par un InterfaceBlock n\'utilise pas « isConjugated » : le sens inverse s\'exprime par un ~InterfaceBlock.'), _L('Habitude de SysML 1.4 (case « conjugué » cochée) ou outil qui la remplit.'), _L('Non en pratique : le sens reste compréhensible.'), _L('Typer le port par le ~InterfaceBlock et décocher « conjugué ».')],
  'SysML::~InterfaceBlock::enforced_name':['forme', _L('Le nom d\'un ~InterfaceBlock est celui de l\'original précédé de « ~ ».'), _L('Original renommé après coup.'), _L('Non.'), _L('Renommer le ~InterfaceBlock.')],
  'SysML::ValueType::1_specializations_are_valuetypes':['verif', _L('Ce qui spécialise un ValueType est aussi un ValueType.'), _L('Type de données héritant d\'un ValueType sans le stéréotype.'), _L('Faible.'), _L('Appliquer «valueType».')],
  'SysML::ValueType::2_unit':['verif', _L('L\'unité d\'un ValueType est une instance d\'unité de la bibliothèque SysML.'), _L('Unité d\'une bibliothèque maison ou d\'une ancienne version de SysML (QUDV).'), _L('Faible : l\'unité reste lisible.'), _L('Choisir l\'unité dans la bibliothèque standard.')],
  'SysML::ValueType::3_quantitykind':['verif', _L('La grandeur (quantityKind) d\'un ValueType vient de la bibliothèque SysML.'), _L('Grandeur d\'une bibliothèque maison ou d\'une ancienne version.'), _L('Faible.'), _L('Choisir la grandeur dans la bibliothèque standard.')],
  'SysML::ConstraintBlock::3_composite':['forme', _L('Une propriété typée par un bloc de contrainte est composite.'), _L('Usage de contrainte créé en agrégation « none ».'), _L('Non en pratique.'), _L('Passer l\'agrégation à « composite ».')],
  'SysML::Requirement::1_no_operation':['incoh', _L('Une exigence n\'a pas d\'opération.'), _L('Opération ajoutée par erreur sous l\'exigence.'), _L('Faible.'), _L('Supprimer ou déplacer l\'opération.')],
  'SysML::Requirement::2_no_attribute':['verif', _L('Une exigence n\'a pas d\'attribut propre (hors propriétés du stéréotype : id, texte…).'), _L('Attribut ajouté pour porter une information (priorité, statut…).'), _L('Faible : l\'information est là, mais hors des champs prévus.'), _L('Porter l\'information par un stéréotype ou une propriété d\'exigence.')],
  'SysML::Requirement::3_no_association':['incoh', _L('Une exigence ne participe à aucune association.'), _L('Association tracée au lieu d\'une relation satisfy, trace…'), _L('Moyennement : le lien n\'a pas la bonne nature.'), _L('Remplacer par satisfy, verify, refine ou trace.')],
  'SysML::Requirement::4_no_generalization':['incoh', _L('Une exigence ne participe à aucune généralisation.'), _L('Héritage tracé entre exigences au lieu de deriveReqt ou containment.'), _L('Moyennement.'), _L('Remplacer par deriveReqt ou par une contenance.')],
  'SysML::Requirement::5_nestedclassifiers_are_requirements':['verif', _L('Ce qui est rangé dans une exigence est une exigence.'), _L('Autre élément rangé sous une exigence.'), _L('Faible.'), _L('Déplacer l\'élément dans un paquetage.')],
  'SysML::Requirement::6_not_a_type':['incoh', _L('Une exigence ne sert pas de type à un autre élément.'), _L('Propriété ou port typé par une exigence (glisser-déposer).'), _L('Moyennement.'), _L('Retyper l\'élément.')],
  'SysML::Satisfy::1_supplier_is_requirement':['incoh', _L('Ce qui est satisfait par une relation satisfy est une exigence.'), _L('Satisfy tracé vers un élément qui n\'est pas une exigence.'), _L('Oui : la couverture des exigences est faussée.'), _L('Viser l\'exigence, ou changer la relation (trace, refine).')],
  'SysML::Verify::1_supplier_is_requirement':['incoh', _L('Ce qui est vérifié par une relation verify est une exigence.'), _L('Verify tracé vers un élément qui n\'est pas une exigence.'), _L('Oui : la vérification des exigences est faussée.'), _L('Viser l\'exigence.')],
  'SysML::DeriveReqt::1_supplier_is_requirement':['incoh', _L('Une exigence dérivée l\'est d\'une exigence.'), _L('DeriveReqt tracé depuis ou vers autre chose.'), _L('Moyennement.'), _L('Viser une exigence, ou utiliser trace.')],
  'SysML::DeriveReqt::2_client_is_requirement':['incoh', _L('Ce qui est dérivé par deriveReqt est une exigence.'), _L('DeriveReqt tracé depuis un élément qui n\'est pas une exigence.'), _L('Moyennement.'), _L('Partir d\'une exigence, ou utiliser refine / trace.')],
  'SysML::Copy::1_source_and_taget_are_requirements':['incoh', _L('Une relation copy relie deux exigences.'), _L('Copy tracé vers autre chose.'), _L('Moyennement.'), _L('Viser des exigences.')],
  'SysML::Copy::2_same_text':['verif', _L('Une exigence copiée a le même texte que l\'original.'), _L('Texte modifié d\'un côté seulement.'), _L('Moyennement : deux versions de la même exigence.'), _L('Recopier le texte, ou remplacer copy par deriveReqt.')],
  'SysML::TestCase::1_return_verdictkind':['verif', _L('Un cas de test renvoie un verdict (VerdictKind : pass, fail…).'), _L('Cas de test sans paramètre de retour ou d\'un autre type.'), _L('Faible.'), _L('Ajouter un retour de type VerdictKind.')],
  'SysML::Allocate::2_binary':['incoh', _L('Une allocation a une seule origine et une seule cible.'), _L('Allocation tracée de plusieurs éléments à la fois.'), _L('Moyennement.'), _L('La scinder en allocations une à une.')],
  'SysML::Refine::2_binary':['incoh', _L('Un raffinement a une seule origine et une seule cible.'), _L('Refine multiple.'), _L('Faible.'), _L('Le scinder.')],
  'SysML::Trace::2_binary':['incoh', _L('Une trace a une seule origine et une seule cible.'), _L('Trace multiple.'), _L('Faible.'), _L('La scinder.')],
  'SysML::NestedConnectorEnd::1_propertypath_first_owned_by_connector_owner':['incoh', _L('Le chemin d\'un bout de connecteur imbriqué part d\'une part du bloc qui possède le connecteur.'), _L('Connecteur déplacé dans un autre bloc, ou part supprimée puis recréée.'), _L('Moyennement : le connecteur vise un élément hors de son contexte.'), _L('Redessiner le connecteur dans le diagramme de blocs interne.')],
  'SysML::NestedConnectorEnd::2_propertypath_last_type_owns_role':['incoh', _L('Le dernier élément du chemin d\'un bout de connecteur imbriqué contient bien le port ou la part visé.'), _L('Type d\'une part changé après le tracé du connecteur.'), _L('Moyennement.'), _L('Redessiner le connecteur.')]
};

/** Fiche d'une règle : écrite (`CAP_UML_REGLES_AIDE`) ou générique (intitulé du catalogue du lecteur, impact déduit : UAF et règles
 * SysML d'emploi rare → 🟡 à vérifier).
 * @param {string} code - Code de la règle (diagnostic `code`)
 * @param {string} [regle] - Intitulé fourni par le diagnostic (repli)
 * @returns {{code:string, impact:string, quoi:string, cause:string, grave:string, correction:string, generique:boolean, origine:string, norme:string}}
 */
function capUmlRegleFiche(code, regle){
  const f=CAP_UML_REGLES_AIDE[code], origine=capUmlRegleOrigine(code);
  let cat=null; try{ cat=(typeof ArcatureLecteurUml!=='undefined'&&ArcatureLecteurUml.regles?ArcatureLecteurUml.regles():[]).find(r=>r.id===code)||null; }catch(e){ cat=null; }
  const norme=(cat&&cat.nom)||regle||code;
  if(f) return {code, impact:f[0], quoi:f[1], cause:f[2], grave:f[3], correction:f[4], generique:false, origine, norme};
  const court=String(norme).replace(/^[^:]+::[^ ]+ \((SysML|UAF)\) : /,'');
  return {code, impact:'verif', quoi:court, cause:origine==='UAF'?_L('Élément stéréotypé UAF dont une propriété ou une relation ne respecte pas le profil (souvent un profil UAF appliqué partiellement).'):_L('Pas d\'explication détaillée pour cette règle.'),
    grave:_L('À évaluer selon l\'élément : la règle vient de la norme, sans analyse propre à Arcalyse.'), correction:_L('Ouvrir l\'élément et le comparer à la règle.'), generique:true, origine, norme};
}

/** Origine d'une règle d'après son code : UML, SysML, UAF ou Arcature. @param {string} c - Code @returns {string} */
function capUmlRegleOrigine(c){ c=String(c||''); return /^SysML::/.test(c)?'SysML':/^UAF::/.test(c)?'UAF':/^ARC_/.test(c)||!/::/.test(c)?'Arcature':'UML'; }

/** Impact réel d'une règle (`incoh`, `verif`, `forme`). @param {string} code - Code @returns {string} */
function capUmlRegleImpact(code){ const f=CAP_UML_REGLES_AIDE[code]; return f?f[0]:'verif'; }

/** Pastille d'impact (🔴 / 🟡 / 🟢 et libellé). @param {string} k - Impact @param {boolean} [court] - Pastille seule @returns {string} HTML */
function capUmlImpactBadge(k, court){
  const I=CAP_UML_IMPACTS[k]||CAP_UML_IMPACTS.verif;
  return `<span class="uml-imp uml-imp-${k}" title="${capEsc(I[2])}">${I[0]}${court?'':' '+capEsc(I[1])}</span>`;
}

/** Fiche HTML d'une règle (Σ Répartition par règle, panneau de détail) : ce que dit la règle, cause probable, est-ce grave, correction,
 * texte de la norme. @param {string} code - Code @param {string} [regle] - Intitulé de repli @returns {string} HTML */
function capUmlFicheHtml(code, regle){
  const f=capUmlRegleFiche(code, regle), esc=capEsc;
  const l=(t,v)=>`<div class="uml-fiche-l"><b>${t}</b> ${esc(v)}</div>`;
  return `<div class="uml-fiche">${capUmlImpactBadge(f.impact)} <span class="ana-dim">${esc(f.origine)} · <code>${esc(f.code)}</code>${f.generique?' · '+_L('fiche générique'):''}</span>`+
    l(_L('Ce que dit la règle :'), f.quoi)+l(_L('Cause probable :'), f.cause)+l(_L('Est-ce grave ?'), f.grave)+l(_L('Correction :'), f.correction)+
    (!f.generique&&f.norme&&f.norme!==f.quoi?`<div class="uml-fiche-l ana-dim" style="font-size:11px">${_L('Texte du catalogue :')} ${esc(f.norme)}</div>`:'')+`</div>`;
}

/** Diagnostics comptés par impact réel (règles désactivées exclues, `capSysmlDiagnostics`, 87).
 * @param {object[]} [liste] - Diagnostics (défaut : ceux de la lecture affichée)
 * @returns {{incoh:number, verif:number, forme:number, total:number}}
 */
function capUmlParImpact(liste){
  liste=liste||capSysmlDiagnostics().liste;
  const n={incoh:0, verif:0, forme:0, total:liste.length}; liste.forEach(d=>{ n[capUmlRegleImpact(d.code||d.regle||'')]++; }); return n;
}

/** Résumé court par impact, pour l'Accueil et les messages (« 3 incohérence(s) · 12 à vérifier · 40 écart(s) de forme »).
 * @param {{incoh:number, verif:number, forme:number}} n - Comptes (`capUmlParImpact`)
 * @returns {string} Texte
 */
function capUmlImpactTexte(n){
  return [n.incoh?_L(`${n.incoh} incohérence(s)`):'', n.verif?_L(`${n.verif} à vérifier`):'', n.forme?_L(`${n.forme} écart(s) de forme`):''].filter(Boolean).join(' · ')||_L('Sans écart');
}
