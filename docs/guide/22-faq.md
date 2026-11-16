<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [21. Pas à pas : scénarios d'utilisation](21-pas-a-pas.md) · [23. 📜 Scripts (macros)](23-scripts.md) ▶</sub>

# 22. Questions fréquentes et dépannage

| Question | Réponse |
|---|---|
| Mon `.aird` est refusé à l'ouverture. | Le `.aird` ne contient pas les éléments du modèle : ouvrez d'abord le `.capella`, puis le `.aird` (déposé sur la fenêtre, ou 📂 dans 🔲 Diagrammes) — ou ouvrez le dossier du projet. |
| Mon fichier est refusé : « cette version d'Arcalyse ne lit que … ». | Vous utilisez une version réduite à un format (`arcalyse-capella.html`, `-sysml2`, `-uml`, `-reqif`) : ouvrez le fichier avec la version de son format ou avec `arcalyse-complet.html`. |
| Rien ne s'affiche dans une analyse. | La rubrique est absente du modèle (pas d'exigences, pas de machine à états…) : elle est signalée comme vide. |
| Les résultats ne tiennent pas compte de la dernière mise à jour. | **↻ Recalculer**, au bout de la barre de l'analyse affichée. |
| Ctrl+S télécharge un nouveau fichier au lieu de réécrire le même. | L'enregistrement direct nécessite Edge ou Chrome ; ailleurs, la page est téléchargée. |
| Le suivi ne détecte pas mes enregistrements (Capella, SysML, UML, ReqIF). | Ouvrez le modèle par 📁 Fichier › 📂 Ouvrir un modèle…, la carte de son format ou le 📁 dossier du projet (accès direct, Edge / Chrome), cochez la détection automatique (⚙ › 🔄 Suivi du fichier), ou utilisez **🔍 Vérifier maintenant** / **📂 Suivre un autre fichier (nouvelle version)…** du menu 🔄. Une page enregistrée rouverte ne suit plus de fichier, et un dossier de `.sysml` ou de `.reqif` n'est pas suivi ([§ 16](16-suivi-fichier.md)). |
| La Vue Blocs est peu lisible en thème sombre. | Passez en **Office 2007** ou **Clair** (🎨 Thème). |
| La matrice d'une vue de flux (ƒ⇆, 🧱…) n'affiche pas toutes les fonctions. | Elle est limitée aux 100 plus connectées : filtrez par couche ou par fonction, ou passez par la ▦ Matrice ([§ 25](25-matrice.md)). |
| Je veux renommer ou supprimer un élément. | Arcalyse est en lecture seule : modifiez le modèle dans votre outil (Capella, Cameo…), puis 🔄 mettez à jour. |
| Un diagramme Capella montre un pictogramme d'image au lieu de l'image. | Les images du projet (formes « image » de Capella) sont lues dans le dossier du projet : ouvrez le **📁 dossier du projet** plutôt que le `.capella` seul. Une page enregistrée ne les garde pas. |
| Les exigences ReqIF n'ont pas leurs images. | Un `.reqif` seul ne contient pas les images de ses textes : ouvrez l'archive `.reqifz` exportée par l'outil, ou choisissez le `.reqif` avec ses images (ou leur dossier). |
| Le panneau de revue en fenêtre séparée ne s'ouvre pas. | Autorisez les fenêtres surgissantes pour le fichier. |
| Mon `.notation` est refusé. | Les diagrammes de Papyrus ne s'ouvrent qu'avec leur `.uml` : choisissez ou déposez les deux fichiers ensemble, ou ouvrez le 📁 dossier du projet. |
| Mon `.mdzip` ne s'ouvre pas. | L'archive est décompressée par le navigateur : Chrome / Edge 80+, Firefox 113+, Safari 16.4+. Sinon, exportez le modèle en XMI depuis Cameo. |
| Mon projet Enterprise Architect `.eap` / `.eapx` / `.feap` est refusé. | Ces anciens formats (base Access) ne sont pas lus : enregistrez le projet en `.qea` avec Enterprise Architect 16+, ou exportez-le en XMI. |
| Avec un modèle SysML, UML ou ReqIF, des vues sont grisées ou absentes des menus. | Ce sont les vues propres à Capella (fonctions, échanges, chaînes, scénarios, analyses ARCADIA) : elles n'ont pas de données pour ce modèle ([§ 24](24-sysml-uml.md)). Le nombre de vues ainsi retirées est rappelé en bas de chaque menu et sur 🏠 Accueil ; ⚙ Préférences › ☰ Affichage les garde dans les menus (grisées). |
| J'ai rouvert une page enregistrée avec un modèle SysML v2 : la vue 🧩 et les vues calculées manquent. | La page garde les éléments, pas la lecture du texte : rouvrez le `.sysml` (ou le dossier). |
| Je voudrais l'interface en anglais. | Bouton **🌐 EN** de la barre (ou lien de l'écran d'accueil), ou adresse `?lang=en` ; le travail en cours est gardé. |
| Signaler un problème. | **❓ Aide › ℹ À propos** : copiez les informations techniques ; joignez le message de la console (F12). |

---

<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [21. Pas à pas : scénarios d'utilisation](21-pas-a-pas.md) · [23. 📜 Scripts (macros)](23-scripts.md) ▶</sub>
