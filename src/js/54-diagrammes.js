/* ═══════════════════════════════════════════════════════════════════════
   🗺 DIAGRAMMES — diagrammes Capella du projet (.aird), dessinés par la visionneuse d'Arcature
   ───────────────────────────────────────────────────────────────────────
   La visionneuse (src/vendor/arcature-visionneuse*.js, produite par Arcature : node build.js --visionneuse)
   n'expose que window.ArcatureVisionneuse ; elle lit le modèle (texte du .capella) et le .aird, en lecture seule.
   Ici : chargement du .aird, vue 🔲 Diagrammes Capella, section « Diagrammes » du panneau de détail.
   Clic sur un élément d'un diagramme → panneau de détail de l'élément.
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la vue : visionneuse créée, .aird en attente ou chargé, modèle transmis. */
const _capDiag = { vis: null, texteAird: '', nomAird: '', airdCharge: false, modele: null, nbReps: 0 };

/** @returns {boolean} vrai si la visionneuse d'Arcature est embarquée dans la page */
function capDiagDispo() { return typeof window.ArcatureVisionneuse === 'object'; }

/**
 * Charge un fichier .aird (diagrammes du projet). Sans modèle chargé, il est gardé en attente du .capella.
 * @param {File} f - fichier .aird
 */
function capDiagLoadAird(f) {
  const r = new FileReader();
  r.onerror = () => capWelcomeStatus(_L(`Impossible de lire « ${f.name} ».`), 'err');
  r.onload = ev => {
    _capDiag.texteAird = ev.target.result; _capDiag.nomAird = f.name; _capDiag.airdCharge = false;
    if (!capLoaded) {
      capWelcomeStatus(_L(`Diagrammes « ${f.name} » gardés : déposez maintenant le fichier .capella du projet.`), '');
      capShowWelcome(true);
      return;
    }
    capWelcomeStatus('', ''); capShowWelcome(false);
    capNavOpen('diag');
  };
  r.readAsText(f, 'UTF-8');
}

/** Crée la visionneuse dans la vue (une fois) : barre « Ouvrir le .aird… », hôte de la visionneuse. */
function capDiagEnsure() {
  const box = document.getElementById('cap-view-diag');
  if (_capDiag.vis || !box || !capDiagDispo()) return;
  box.innerHTML = `<div class="cdg-barre"><button class="tbtn" id="cdg-ouvrir">${_L('📂 Ouvrir le .aird…')}</button>` +
    `<input type="file" id="cdg-fichier" accept=".aird" style="display:none"><span id="cdg-info" class="cdg-info"></span></div><div id="cdg-hote" class="cdg-hote"></div>`;
  document.getElementById('cdg-ouvrir').onclick = () => document.getElementById('cdg-fichier').click();
  document.getElementById('cdg-fichier').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) capDiagLoadAird(f); };
  _capDiag.vis = window.ArcatureVisionneuse.creer(document.getElementById('cdg-hote'), {
    choix: id => { if (typeof capOpenDetailById === 'function') capOpenDetailById(id); else capOpenDetail(id); }
  });
  window.addEventListener('resize', () => { if (capCurrentView === 'diag') capDiagFit(); });
}

/** Ajuste la hauteur de la visionneuse à la fenêtre. */
function capDiagFit() {
  const h = document.getElementById('cdg-hote');
  if (!h) return;
  h.style.height = Math.max(320, window.innerHeight - h.getBoundingClientRect().top - 8) + 'px';
}

/** Transmet à la visionneuse le modèle courant (texte XML) et le .aird en attente, si besoin. */
function capDiagSync() {
  const v = _capDiag.vis;
  if (!v) return;
  if (_capDiag.modele !== cap_xmlDoc && cap_xmlDoc) {
    v.chargerModele(new XMLSerializer().serializeToString(cap_xmlDoc), capCurrentFileName);
    _capDiag.modele = cap_xmlDoc;
  }
  if (_capDiag.texteAird && !_capDiag.airdCharge) {
    _capDiag.nbReps = v.chargerAird(_capDiag.texteAird, _capDiag.nomAird);
    _capDiag.airdCharge = true;
  }
  const info = document.getElementById('cdg-info');
  // Une fois le .aird chargé, la liste de la visionneuse affiche son nom et le nombre de représentations
  if (info) info.textContent = _capDiag.airdCharge ? '' : _L('Ouvrez le fichier .aird du projet (à côté du .capella), ou déposez-le sur la fenêtre.');
}

/** Rendu de la vue 🔲 Diagrammes Capella. */
function capRenderDiagrams() {
  const box = document.getElementById('cap-view-diag');
  if (!capDiagDispo()) {
    box.innerHTML = `<div class="cdg-vide">${_L('Visionneuse de diagrammes absente de cette page.')}</div>`;
    return;
  }
  capDiagEnsure();
  capDiagSync();
  capDiagFit();
}

/**
 * Ouvre un diagramme dans la vue 🔲 Diagrammes Capella et y met un élément en évidence.
 * @param {string} uid - identifiant de la représentation (.aird)
 * @param {string} [id] - élément du modèle à centrer
 */
function capDiagOpen(uid, id) {
  capNavOpen('diag');
  if (_capDiag.vis) _capDiag.vis.ouvrir(uid, id);
}

/**
 * Section « Diagrammes » du panneau de détail : représentations de l'élément et diagrammes où il est dessiné.
 * @param {string} id - identifiant de l'élément
 * @param {function(string, string):string} secTitle - titre de section du panneau
 * @returns {string} HTML ('' sans .aird chargé ou sans diagramme)
 */
function capDiagDetail(id, secTitle) {
  if (!_capDiag.vis || !_capDiag.airdCharge) return '';
  const { cibles, presences } = _capDiag.vis.diagrammesDe(id);
  const vus = new Set(), liste = [...cibles, ...presences].filter(r => !vus.has(r.uid) && vus.add(r.uid));
  if (!liste.length) return '';
  const lien = r => `<div class="cap-det-link cdg-lien" onclick="capDiagOpen('${capEsc(r.uid)}','${capEsc(id)}')" title="${capEsc(r.type)}">` +
    `<span class="cdg-sigle">${capEsc(r.sigle)}</span>${capEsc(r.nom || r.type)}</div>`;
  return secTitle(_L(`Diagrammes (${liste.length})`), '#58a6ff') + liste.sort((a, b) => a.nom.localeCompare(b.nom)).slice(0, 60).map(lien).join('');
}
