<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [Annexe B — Formats d'export](annexe-b-exports.md)</sub>

# Annexe C — Régénérer les captures du guide

Le guide est découpé en un fichier par chapitre (`docs/guide/NN-*.md`, sommaire `docs/GUIDE-UTILISATION.md`) ; ses captures sont rangées dans `docs/guide/img/` et produites automatiquement :

```
node build.js                     # assemble dist/arcalyse-fr.html
node tools/guide-captures.js      # toutes les captures → docs/guide/img/
node tools/guide-captures.js rm tableau   # seulement certaines parties
node tools/guide-captures.js --forcer     # réécrire aussi les captures inchangées
```

**Seules les captures qui ont changé sont réécrites.** Chaque capture est d'abord prise dans un dossier provisoire, allégée (PNG de 256 couleurs, avec ImageMagick), puis comparée à celle de `docs/guide/img/` : si moins de 40 pixels diffèrent nettement (écart de couleur au-delà de 15 %, pour ignorer le tramage de la palette), l'ancienne est gardée telle quelle. Le script indique à la fin le nombre de captures nouvelles, changées et inchangées. Ainsi, régénérer le guide n'alourdit l'historique git que des images vraiment modifiées. Les animations de l'interface sont figées pendant les captures, pour qu'un même écran donne toujours la même image. Sans ImageMagick, les images ne sont pas allégées et sont comparées octet par octet.

Le script (Playwright, Chromium hors ligne, fenêtre 1600 × 900, thème Clair ; `CHROMIUM_PATH=…` pour un Chromium déjà installé) charge `tests/models/In-Flight_Entertainment_System.capella` et son `.aird`, parcourt les vues, menus et fenêtres, pose les repères numérotés, puis allège les images (PNG 256 couleurs, si ImageMagick est installé). Les dernières parties remplacent le modèle d'exemple par un autre modèle de `tests/models/` : `aida` (`AIDA.capella`), `variantes` (`Vehicule-150.capella`, 🎚 Variantes), `reqif` (`reqif/ExigencesImages.reqifz`, 📑 ReqIF et ▤ Tableau en texte riche), `familles` (`VehiculeDemo.sysml`, 🃏 Cartes par famille) et `sysml` (`uml/Satellite-sysml1.xmi`, rapports sur mesure SysML). Parties : `accueil`, `rm`, `tableau`, `explorateur`, `chaines`, `flux`, `diagrammes`, `analyses`, `fonctions`, `tableaubord`, `comparaison`, `revue`, `home`, `divers`, `nouveautes`, `scripts`, `interface`, `preferences`, `dossiers`, `avantapres`, `voisinage`, `aida`, `variantes`, `reqif`, `familles`, `sysml`.

Dans un chapitre, une image s'insère par `![Légende](img/nom.png)`.

---

<sub>[📘 Sommaire du guide](../GUIDE-UTILISATION.md) · ◀ [Annexe B — Formats d'export](annexe-b-exports.md)</sub>
