/* ═══════════════════════════════════════════════════════════════════════
   🔲 DIAGRAMMES CAPELLA — diagrammes du projet (.aird), dessinés par la visionneuse d'Arcature
   ───────────────────────────────────────────────────────────────────────
   La visionneuse (src/vendor/arcature-visionneuse*.js, produite par Arcature : node build.js --visionneuse)
   n'expose que window.ArcatureVisionneuse ; elle lit le modèle (texte du .capella) et le .aird, en lecture seule.
   Ici : chargement du .aird (sélecteur ouvert dans le dossier du .capella ; 📁 dossier du projet depuis l'écran d'accueil),
   enveloppe commune à tous les formats (barre, explorateur classé — couche › type, genre › origine, 🌳 arborescence… —, ▣ carte, ℹ Infos,
   ⧉ comparaison, planches) : le dessin seul est confié à la visionneuse (Capella) ou aux lecteurs SysML v2 / UML (87, 88, dans #cdg-sy),
   export groupé en planches (en-tête, cartouche) : PDF, ZIP PNG / SVG, rapport HTML ;
   section « Diagrammes » du panneau de détail. Clic sur un élément d'un diagramme → panneau de détail de l'élément.
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la vue : visionneuse, .aird en attente ou chargé, modèle transmis, liste classée, sélection, largeur, carte, options d'export. */
const _capDiag = { vis: null, texteAird: '', nomAird: '', airdCharge: false, modele: null, nbReps: 0,
  attente: false, poignee: null, dateAird: 0,   // .aird fourni pour le modèle à venir ; accès direct au fichier (relecture après 🔄 mise à jour) ; date du fichier lu
  classement: 'couche', classementSy: 'genre-origine', bascule: new Set(), sel: new Set(), choix: false, filtre: '', actif: '', icones: null, meta: null,
  largeur: 330, carte: 'panneau', carteReduite: false, carteH: 170,   // hauteur de la ▣ carte sous l'explorateur (séparateur ↕ `capDiagSplitV`)
  pret: false, texte: false, texteZoom: 1, parCible: null, parents: null, syIdx: null,   // vue créée ; ≡ Texte (Capella) ; index cible → diagrammes, parents de l'arbre, présences (lecteurs)
  exportOpts: { fmt: 'pdf', portee: 'sel', cadre: true, cartouche: true, desc: true, annexe: true, sommaire: true, scale: 2 } };
/** Ordre des couches ARCADIA (puis des familles SysML / UML) dans la liste et les exports. */
const CAP_DIAG_COUCHES = ['OA', 'SA', 'LA', 'PA', 'EPBS', 'STR', 'BEH', 'REQ', 'ORG'];

/** @returns {boolean} vrai si la visionneuse d'Arcature est embarquée dans la page */
function capDiagDispo() { return typeof window.ArcatureVisionneuse === 'object'; }

/* Les vues des lecteurs SysML v2 et UML / SysML v1 (87, 88) passent par la même enveloppe que les diagrammes Capella : `capDiagReps()` les renvoie
   comme des représentations (uid « sy:<clé> », `couche` = famille STR / BEH / REQ / ORG, `kind` = genre du lecteur, `origine`) ; seul le dessin
   leur est propre (`capSyVuesRender`, dans #cdg-sy à la place de la visionneuse). */

/** @returns {boolean} vrai si la vue 🔲 montre les vues d'un lecteur d'Arcature (SysML v2, UML / SysML v1) et non la visionneuse Capella */
function capDiagSy() { return typeof _capSysml !== 'undefined' && !!_capSysml.lecture && typeof capSyVuesReps === 'function'; }

/** @returns {boolean} vrai si des diagrammes ou des vues sont chargés (.aird pour Capella, lecture pour SysML / UML) */
function capDiagCharge() { return capDiagSy() ? capDiagReps().length > 0 : _capDiag.airdCharge; }

/** @returns {string} nom du fichier d'où viennent les diagrammes (.aird, ou modèle SysML / UML) */
function capDiagNomSource() { return capDiagSy() ? _capSysml.nom || '' : _capDiag.nomAird; }

/** @returns {string} titre des exports groupés selon le format */
function capDiagTitreExport() { return capDiagSy() ? _L('Diagrammes et vues') : _L('Diagrammes Capella'); }

/**
 * Classement de l'explorateur pour le format affiché (Capella : `classement`, lecteurs : `classementSy`).
 * @param {string} [v] - Nouveau classement
 * @returns {string} classement courant
 */
function capDiagClassement(v) {
  const k = capDiagSy() ? 'classementSy' : 'classement';
  if (v !== undefined) _capDiag[k] = v;
  return _capDiag[k];
}

/** Oublie ce qui dépend des diagrammes chargés (autre modèle, autre .aird) : index, icônes, sélection, diagramme actif, mode texte. */
function capDiagOublier() {
  Object.assign(_capDiag, { parCible: null, parents: null, syIdx: null, icones: null, actif: '', texte: false, filtre: '' });
  _capDiag.sel.clear();
}

/* ── Icônes des éléments (dessins façon Capella d'Arcature) ────────────── */

/** Icônes déjà calculées (clé « id|taille »), pour le modèle `doc`. */
const _capIco = { doc: null, cache: new Map() };
/**
 * Icône d'un élément du modèle, comme dans Capella (variante selon acteur, humain, nature, genre de fonction…),
 * fournie par la visionneuse d'Arcature (API icone). Le modèle lui est transmis au premier appel.
 * @param {string} id - Élément du modèle
 * @param {number} [taille] - Côté en pixels (14 par défaut)
 * @returns {string} élément <svg>, ou '' (visionneuse absente, élément inconnu ou sans dessin)
 */
function capIco(id, taille) {
  if (typeof capUmlIcone === 'function') { const u = capUmlIcone(id, taille); if (u != null) return u; }   // 🧬 modèle UML / SysML v1 : jeu d'icônes d'Arcature (88)
  if (typeof capReqifIcone === 'function') { const r = capReqifIcone(id, taille); if (r != null) return r; }   // 📑 ReqIF (101)
  const A = window.ArcatureVisionneuse;
  const sy0 = typeof capSysmlActif === 'function' && capSysmlActif();
  if (!id || !cap_xmlDoc || (!sy0 && (!A || typeof A.icone !== 'function'))) return '';   // SysML v2 : icônes du lecteur, sans la visionneuse ; cap_xmlDoc : aussi pendant le chargement (arborescence de la Relation Map)
  if (_capIco.doc !== cap_xmlDoc) {
    _capIco.cache.clear(); _capIco.doc = cap_xmlDoc;
    if (A) try { capDiagEnsure(); if (_capDiag.vis && _capDiag.modele !== cap_xmlDoc) capDiagSync(); } catch (e) { console.error(e); }
  }
  const k = id + '|' + (taille || 14);
  let s = _capIco.cache.get(k);
  if (s == null) {
    const sy = typeof capSysmlActif === 'function' && capSysmlActif();   // 87 : modèle SysML v2, icônes du lecteur (pas celles de Capella aux mêmes noms : Class, DataType…)
    if (sy) s = capIcoSysmlId(id, taille);
    else { try { s = A.icone(id, taille || 14) || ''; } catch (e) { s = ''; } }
    if (!s) {   // type sans icône dans la visionneuse : icône de complément (84)
      const el = capAllElements.length ? capGetElementById_(id) : null;
      if (!el) return '';   // modèle en cours de chargement : pas de mise en cache
      s = capIcoPlus(el.typeName, taille);
    }
    _capIco.cache.set(k, s);
  }
  return s;
}
/**
 * Icône d'un type d'élément (sans variante), sans modèle chargé.
 * @param {string} type - Type court (« SystemFunction »)
 * @param {number} [taille] - Côté en pixels (14 par défaut)
 * @returns {string} élément <svg>, ou ''
 */
function capIcoType(type, taille) {
  if (typeof capUmlIconeType === 'function') { const u = capUmlIconeType(type, taille); if (u != null) return u; }   // 🧬 types UML / SysML v1 (88)
  if (typeof capReqifIconeType === 'function') { const r = capReqifIconeType(type, taille); if (r != null) return r; }   // 📑 ReqIF (101)
  const A = window.ArcatureVisionneuse;
  if (!type) return '';
  const sy = typeof capSysmlActif === 'function' && capSysmlActif();
  if (!sy && (!A || typeof A.iconeType !== 'function')) return '';   // version sans visionneuse : icônes de complément pour SysML v2 seulement   // 87 : modèle SysML v2, la métaclasse avant le type Capella du même nom
  const k = (sy ? '@sy:' : '@') + type + '|' + (taille || 14);
  let s = _capIco.cache.get(k);
  if (s == null) {
    if (!sy) { try { s = A.iconeType(type, taille || 14) || ''; } catch (e) { s = ''; } }
    if (!s) s = capIcoPlus(type, taille);   // 84 : complément (SysML v2 compris)
    _capIco.cache.set(k, s);
  }
  return s;
}

/**
 * Charge un fichier .aird (diagrammes du projet). Sans modèle chargé (ou s'il accompagne un .capella en cours
 * de chargement), il est gardé en attente du .capella.
 * @param {File} f - fichier .aird
 * @param {?FileSystemFileHandle} [h] - Accès direct au fichier (Edge/Chrome) : relu après une 🔄 mise à jour du modèle
 * @param {boolean} [attente] - true : le .aird va avec le modèle en cours de chargement (pas d'ouverture de la vue)
 */
function capDiagLoadAird(f, h, attente) {
  capDgwFermer();   // ⧉ la fenêtre de comparaison montrait l'ancien .aird (83)
  const r = new FileReader();
  r.onerror = () => capWelcomeStatus(_L(`Impossible de lire « ${f.name} ».`), 'err');
  r.onload = ev => {
    capDiagSetAird(ev.target.result, f.name, h || null, f.lastModified);
    if (attente) return;
    if (!capLoaded) {
      _capDiag.attente = true;
      capWelcomeStatus(_L(`Diagrammes « ${f.name} » gardés : déposez maintenant le fichier .capella du projet.`), '');
      capShowWelcome(true);
      return;
    }
    capWelcomeStatus('', ''); capShowWelcome(false);
    capNavOpen('diag');
  };
  r.readAsText(f, 'UTF-8');
}

/**
 * Mémorise le texte d'un .aird (les diagrammes seront relus par la visionneuse à la prochaine synchronisation).
 * @param {string} texte - Contenu du .aird ('' : aucun)
 * @param {string} nom - Nom du fichier
 * @param {?FileSystemFileHandle} poignee - Accès direct au fichier, ou null
 * @param {number} [date] - Date de modification du fichier lu
 */
function capDiagSetAird(texte, nom, poignee, date) {
  if (!texte && _capDiag.airdCharge && _capDiag.vis) { try { _capDiag.vis.fermer(); } catch (e) {} }   // diagrammes retirés : la visionneuse se vide
  if (texte && _capDiag.texteAird && texte !== _capDiag.texteAird && typeof capDgReferenceAuto === 'function') capDgReferenceAuto(_capDiag.texteAird, _capDiag.nomAird);   // ⚖ l'ancien .aird devient la référence
  Object.assign(_capDiag, { texteAird: texte || '', nomAird: texte ? nom || '' : '', poignee: texte ? poignee : null, dateAird: date || 0, airdCharge: false, meta: null });
}

/**
 * Un autre modèle remplace le modèle affiché : les diagrammes de l'ancien modèle (.aird) ne lui correspondent pas,
 * ils sont retirés — sauf s'ils ont été fournis avec le nouveau modèle (dossier du projet, dépôt .capella + .aird, page de projet).
 * @returns {string} nom du .aird retiré ('' si aucun)
 */
function capDiagAvantNouveauModele() {
  const nom = _capDiag.texteAird && !_capDiag.attente ? _capDiag.nomAird : '';
  if (nom) capDiagSetAird('', '', null, 0);
  _capDiag.attente = false;
  capDiagOublier();
  if (typeof capDgReset === 'function') capDgReset();   // ⚖ référence de comparaison des diagrammes : propre à l'ancien modèle
  return nom;
}

/**
 * Après une 🔄 mise à jour du modèle (même projet, nouvelle version du .capella) : les diagrammes chargés viennent
 * de l'ancien .aird. Avec un accès direct au .aird (dossier du projet, 📂 Ouvrir le .aird sous Edge/Chrome), il est
 * relu sur le disque : nouvelle version reprise automatiquement. Sinon, ou si le .aird n'a pas changé alors que des
 * éléments qu'il montre ont disparu du modèle, une fenêtre propose de choisir le .aird à jour, de garder l'ancien ou de le retirer.
 */
async function capDiagApresMaj() {
  if (!_capDiag.texteAird) return;   // .capella seul : rien à faire
  let relu = false, inchange = false;
  if (_capDiag.poignee) {
    try {
      const f = await _capDiag.poignee.getFile();
      if (f.lastModified !== _capDiag.dateAird || f.size !== _capDiag.texteAird.length) {
        const t = await f.text();
        if (t !== _capDiag.texteAird) { capDiagSetAird(t, f.name, _capDiag.poignee, f.lastModified); relu = true; }
        else inchange = true;
      } else inchange = true;
    } catch (e) { console.warn('Relecture du .aird impossible :', e); }
  }
  const manquants = capDiagRefsManquantes();
  if (relu) {
    if (capCurrentView === 'diag') capRenderDiagrams();
    if (typeof capWatchFlash === 'function') setTimeout(() => capWatchFlash(_L(`🔲 Diagrammes relus : « ${_capDiag.nomAird} » a aussi été mis à jour sur le disque — changements : ⚖ Comparaison de versions › 🔲 Diagrammes`)), 900);
    return;
  }
  if (inchange && !manquants) return;   // .aird inchangé et toujours cohérent avec le modèle : rien à signaler
  capDiagMajDialogue(inchange, manquants);
}

/**
 * Nombre d'éléments du modèle montrés par le .aird chargé (références « fichier#id ») qui n'existent plus dans le modèle affiché.
 * @returns {number} références orphelines (0 sans .aird)
 */
function capDiagRefsManquantes() {
  if (!_capDiag.texteAird || !capLoaded) return 0;
  const ids = new Set(), re = /href="[^"#]*\.(?:capella|melodymodeller)#([^"]+)"/g;
  let x; while ((x = re.exec(_capDiag.texteAird))) ids.add(x[1]);
  let n = 0; ids.forEach(id => { if (!capGetElementById_(id)) n++; });
  return n;
}

/**
 * Fenêtre affichée après une 🔄 mise à jour du modèle quand les diagrammes (.aird) peuvent ne plus correspondre :
 * 📂 choisir le .aird à jour, garder les diagrammes actuels, ou les retirer.
 * @param {boolean} inchange - true : le .aird a été relu et n'a pas changé sur le disque
 * @param {number} manquants - Éléments montrés par les diagrammes et absents du nouveau modèle
 */
function capDiagMajDialogue(inchange, manquants) {
  let ov = document.getElementById('cdg-maj-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'cdg-maj-ov'; ov.className = 'cdg-maj-ov'; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="cw-d-box" style="max-width:560px">
    <div class="cw-d-hdr"><b>${_L('🔲 Diagrammes : le .aird est-il à jour ?')}</b><button class="cap-lf-btn" data-c="garder">✕</button></div>
    <div class="cw-d-body">
      <p style="font-size:12.5px;margin:6px 0">${_L(`Le modèle vient d'être mis à jour, mais les diagrammes affichés viennent de « <b>${capEsc(_capDiag.nomAird)}</b> », lu avant la mise à jour.`)}</p>` +
      (inchange ? `<p style="font-size:12.5px;margin:6px 0">${_L('Ce fichier n\'a pas changé sur le disque : le projet n\'a peut-être pas encore été enregistré dans Capella.')}</p>` : '') +
      (manquants ? `<p style="font-size:12.5px;margin:6px 0;color:var(--c-warn,#e3b341)">${_L(`⚠ ${manquants} élément(s) montré(s) par ces diagrammes n'existent plus dans le modèle mis à jour.`)}</p>` : '') +
      `<p class="ana-dim" style="font-size:11.5px;margin:6px 0">${_L('Capella enregistre le .capella et le .aird ensemble : pour des diagrammes fidèles, ouvrez le .aird de la même version.')} ${_L('Le .aird actuel servira alors de référence pour ⚖ Comparaison de versions › 🔲 Diagrammes.')}</p>
    </div>
    <div class="cw-d-ftr"><button class="cap-lf-btn" data-c="retirer" title="${_L('Retirer les diagrammes de la page (🔲 Diagrammes Capella vide)')}">${_L('🗑 Retirer les diagrammes')}</button><span style="flex:1"></span>
      <button class="cap-lf-btn" data-c="garder">${_L('Garder ces diagrammes')}</button>
      <button class="phl-export-btn" data-c="ouvrir" style="margin-left:0">${_L('📂 Choisir le .aird à jour…')}</button></div></div>`;
  ov.style.display = 'flex';
  ov.onclick = e => {
    const b = e.target.closest('[data-c]'); if (!b && e.target !== ov) return;
    ov.style.display = 'none';
    const c = b ? b.dataset.c : 'garder';
    if (c === 'ouvrir') capDiagPickAird();
    else if (c === 'retirer') { capDiagSetAird('', '', null, 0); capDiagSync(); if (capCurrentView === 'diag') capRenderDiagrams(); }
  };
}

/**
 * 📂 Ouvrir le .aird : sélecteur à accès direct ouvert dans le dossier du .capella (Edge/Chrome,
 * modèle ouvert par 📂 avec accès direct), sinon sélecteur classique.
 */
async function capDiagPickAird() {
  const inp = document.getElementById('cdg-fichier');
  if (!window.showOpenFilePicker || (typeof _capPickerKo !== 'undefined' && _capPickerKo)) { inp.click(); return; }
  const o = { id: 'arcalyse-aird', types: [{ description: _L('Diagrammes Capella (.aird)'), accept: { 'application/xml': ['.aird'] } }] };
  if (typeof _capWatch !== 'undefined' && _capWatch.handle) o.startIn = _capWatch.handle;
  try {
    const [h] = await window.showOpenFilePicker(o);
    capDiagLoadAird(await h.getFile(), h);
  } catch (e) {
    if (!e || e.name !== 'AbortError') inp.click();
  }
}

/**
 * 📁 Dossier du projet (écran d'accueil) : charge ensemble le modèle .capella et ses diagrammes .aird.
 * Le dossier est lu sur 2 niveaux ; s'il contient plusieurs modèles, le choix est proposé dans l'écran d'accueil.
 * Edge/Chrome : sélecteur de dossier (l'accès direct au .capella permet le 🔄 suivi) ; sinon sélecteur classique de dossier.
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté
 */
async function capOpenProjectFolder(confirme) {
  // Un modèle est déjà affiché : avertissement (travail non enregistré) avant l'ouverture du sélecteur de dossier
  if (capLoaded && !confirme) { if (await capReplaceConfirm('')) capOpenProjectFolder(true); return; }
  _capReplaceOk = capLoaded ? Date.now() : 0;
  if (!window.showDirectoryPicker || (typeof _capPickerKo !== 'undefined' && _capPickerKo)) { document.getElementById('cw-folder-input').click(); return; }
  let d;
  try { d = await window.showDirectoryPicker({ id: 'arcalyse-projet', mode: 'read' }); }
  catch (e) { if (!e || e.name !== 'AbortError') document.getElementById('cw-folder-input').click(); else _capReplaceOk = 0; return; }
  capProjectScanDir(d);
}

/**
 * Lit un dossier du projet (sélecteur ou dossier déposé) sur 2 niveaux (plus le dossier « _rpy » d'un projet Rhapsody) et charge le modèle et ses diagrammes.
 * @param {FileSystemDirectoryHandle} d - Dossier
 */
async function capProjectScanDir(d) {
  const fichiers = [];
  /** Parcourt un dossier jusqu'à la profondeur donnée. */
  const scan = async (dir, chemin, prof) => {
    for await (const [nom, h] of dir.entries()) {
      if (h.kind === 'file' && (/\.(capella|melodymodeller|aird|sysml|kpar)$/i.test(nom) || (typeof capUmlReconnait === 'function' && (capUmlReconnait(nom) || capUmlAnnexe(nom))))) fichiers.push({ nom, chemin: chemin + nom, h });   // 🧬 UML : modèles et .notation (88)
      else if (h.kind === 'directory' && (prof > 0 || /_rpy$/i.test(nom)) && !nom.startsWith('.')) await scan(h, chemin + nom + '/', Math.max(prof - 1, 0));   // dossier « _rpy » d'un projet Rhapsody : toujours lu
    }
  };
  try { await scan(d, '', 1); } catch (e) { capWelcomeStatus(_L('Lecture du dossier impossible : ') + (e && e.message || e), 'err'); capShowWelcome(true); return; }
  capProjectFromFiles(fichiers.map(f => ({ nom: f.nom, chemin: f.chemin, lire: () => f.h.getFile(), h: f.h })));
}

/**
 * Charge un projet à partir des fichiers d'un dossier : le .capella (choisi dans l'écran d'accueil s'il y en a plusieurs)
 * puis le .aird du même nom (ou du même dossier, ou le seul présent).
 * @param {{nom:string, chemin:string, lire:function():Promise<File>, h:?FileSystemFileHandle}[]} fichiers - Fichiers trouvés
 */
function capProjectFromFiles(fichiers) {
  const capOk = capFormatsDispo().some(F => F.k === 'capella');   // version réduite à un autre format (CAP_EDITION) : .capella ignorés
  const mods = fichiers.filter(f => capOk && /\.(capella|melodymodeller)$/i.test(f.nom)).sort((a, b) => a.chemin.split('/').length - b.chemin.split('/').length || a.chemin.localeCompare(b.chemin));
  const airds = fichiers.filter(f => /\.aird$/i.test(f.nom));
  capShowWelcome(true);
  const sysml = fichiers.filter(f => /\.(sysml|kpar)$/i.test(f.nom));
  if (!mods.length && sysml.length && typeof capSysmlOuvrirDossier === 'function' && capSysmlDispo()) { capSysmlOuvrirDossier(sysml); return; }   // 🧩 projet SysML v2 en dossier (87)
  const uml = typeof capUmlReconnait === 'function' ? fichiers.filter(f => capUmlReconnait(f.nom) || capUmlAnnexe(f.nom)) : [];
  if (!mods.length && uml.some(f => capUmlReconnait(f.nom))) { capUmlOuvrirDossier(uml); return; }   // 🧬 projet UML / SysML v1 en dossier (88)
  if (!mods.length && typeof capReqifReconnait === 'function' && fichiers.some(f => capReqifReconnait(f.nom))) { capReqifOuvrirDossier(fichiers); return; }   // 📑 ReqIF et images en dossier (101)
  if (!mods.length) {
    const ext = n => (n.split('.').pop() || '').toLowerCase(), absent = CAP_EDITION && fichiers.map(f => [f, CAP_FORMATS.find(F => !capFormatsDispo().includes(F) && F.ext.includes(ext(f.nom)) && ext(f.nom) !== 'xml')]).find(x => x[1]);
    capWelcomeStatus(absent ? capFormatAbsentMsg(absent[0].nom, absent[1]) : _L('Aucun fichier .capella, .sysml, .uml, .xmi, .mdzip, .qea ni .reqif dans ce dossier (ni dans ses sous-dossiers).'), 'err'); return;
  }
  /** Charge un modèle et son .aird. */
  const charger = async m => {
    if (capLoaded && !capReplacePreOk() && !(await capReplaceConfirm(m.nom))) { capShowWelcome(false); return; }
    const base = m.nom.replace(/\.[^.]+$/, '').toLowerCase(), dossier = m.chemin.slice(0, m.chemin.length - m.nom.length);
    const a = airds.find(x => x.nom.toLowerCase() === base + '.aird') || airds.find(x => x.chemin.startsWith(dossier) && !x.chemin.slice(dossier.length).includes('/')) || (airds.length === 1 ? airds[0] : null);
    try {
      const f = await m.lire(), fa = a ? await a.lire() : null;
      capDiagSetAird(fa ? await fa.text() : '', fa ? fa.name : '', a && a.h || null, fa ? fa.lastModified : 0);
      _capDiag.attente = true;   // diagrammes du modèle qui va être chargé (ne pas les retirer comme ceux d'un ancien modèle)
      capLibQueue(mods.filter(x => x !== m));   // 📚 autres .capella du dossier : bibliothèques chargées après le modèle si elles sont référencées (72)
      capLoadFile(f, m.h || null, true);
    } catch (e) { capWelcomeStatus(_L('Lecture impossible : ') + (e && e.message || e), 'err'); }
  };
  if (mods.length === 1) { charger(mods[0]); return; }
  capWelcomeStatus(_L(`${mods.length} modèles dans ce dossier : lequel ouvrir ?`), '');
  capChoixModele(mods, { ico: '🔷', aide: _L('Les autres .capella seront chargés comme bibliothèques si le modèle choisi y fait référence.') }, charger);   // fenêtre centrée (12)
}

/** Affiche un message bref dans la barre de la vue. @param {string} t - Texte */
function capDiagMsg(t) { const s = document.getElementById('cdg-statut'); if (s) s.textContent = t; }

/**
 * Crée la vue (une fois) : barre, explorateur classé à gauche (liste, ▣ carte de la visionneuse, ▣ carte des lecteurs), hôte de la
 * visionneuse (#cdg-hote) et hôte des vues des lecteurs (#cdg-sy, 87) ; la visionneuse n'est créée que pour un modèle Capella.
 */
function capDiagEnsure() {
  const box = document.getElementById('cap-view-diag');
  if (!box) return;
  if (!_capDiag.pret) {
    _capDiag.pret = true;
    box.innerHTML = `<div class="cdg-barre" id="cdg-barre"></div>` +
      `<div class="cdg-corps"><aside class="cdg-gauche" id="cdg-gauche" style="width:${_capDiag.largeur}px"><div id="cdg-liste" class="cdg-liste"></div>` +
      `<div class="cdg-split-v" id="cdg-split-v" title="${_L('Glisser pour régler la hauteur de la carte (double-clic : hauteur par défaut)')}"></div>` +
      `<div id="cdg-carte-zone" class="cdg-carte-zone"></div><div id="cdg-carte-sy" class="cdg-carte-zone sy-vues"></div></aside>` +
      `<div class="cdg-split" id="cdg-split" title="${_L('Glisser pour régler la largeur de l\'explorateur')}"></div><div id="cdg-hote" class="cdg-hote"></div><div id="cdg-sy" class="cdg-hote cdg-sy sy-vues"></div></div>` +
      `<input type="file" id="cdg-fichier" accept=".aird" style="display:none">`;
    document.getElementById('cdg-fichier').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) capDiagLoadAird(f); };
    box.addEventListener('click', capDiagClic);
    box.addEventListener('change', capDiagChange);
    box.addEventListener('input', e => { if (e.target.id === 'cdg-filtre') { _capDiag.filtre = e.target.value; capDiagListe(); } });
    window.addEventListener('resize', () => { if (capCurrentView === 'diag') capDiagFit(); });
    capDiagSplit(document.getElementById('cdg-split'));
    capDiagSplitV(document.getElementById('cdg-split-v'));
    document.getElementById('cdg-gauche').style.setProperty('--cdg-carte-h', _capDiag.carteH + 'px');
    if (window.ResizeObserver) new ResizeObserver(() => { if (capCurrentView === 'diag') capDiagFit(); }).observe(document.getElementById('cdg-barre'));
  }
  if (_capDiag.vis || capDiagSy() || !capDiagDispo()) return;
  _capDiag.vis = window.ArcatureVisionneuse.creer(document.getElementById('cdg-hote'), {
    choix: id => { if (typeof capOpenDetailById === 'function') capOpenDetailById(id); else capOpenDetail(id); }
  });
  // Diagramme ouvert depuis la visionneuse elle-même (onglets, retour, liens) : suivi de l'élément actif
  const liste = document.getElementById('diag-liste');
  if (liste) new MutationObserver(() => {
    const li = liste.querySelector('li.actif[data-diag]'), uid = li ? li.dataset.diag : '';
    if (uid !== _capDiag.actif) { _capDiag.actif = uid; capDiagMarquerActif(); }
    if (uid && !_capDiag.export) capDiagCarte();
  }).observe(liste, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
}

/**
 * Séparateur entre l'explorateur et le diagramme : glisser pour régler la largeur de l'explorateur.
 * @param {HTMLElement} sp - Séparateur
 */
function capDiagSplit(sp) {
  sp.addEventListener('pointerdown', e => {
    e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('on');
    const g = document.getElementById('cdg-gauche'), x0 = e.clientX, w0 = g.offsetWidth;
    const max = Math.max(260, document.getElementById('cap-view-diag').clientWidth * 0.6);
    const bouge = ev => { _capDiag.largeur = Math.round(Math.min(max, Math.max(200, w0 + ev.clientX - x0))); g.style.width = _capDiag.largeur + 'px'; };
    const fin = () => { sp.classList.remove('on'); sp.removeEventListener('pointermove', bouge); sp.removeEventListener('pointerup', fin);
      window.dispatchEvent(new Event('resize')); if (capDiagSy()) capSyCarteRender(); };   // la visionneuse se réajuste ; carte des lecteurs redessinée
    sp.addEventListener('pointermove', bouge); sp.addEventListener('pointerup', fin);
  });
  sp.addEventListener('dblclick', () => { _capDiag.largeur = 330; document.getElementById('cdg-gauche').style.width = '330px'; window.dispatchEvent(new Event('resize')); if (capDiagSy()) capSyCarteRender(); });
}

/**
 * Séparateur horizontal entre la liste des diagrammes et la ▣ carte sous l'explorateur : glisser vers le haut agrandit la carte
 * (`_capDiag.carteH`, variable CSS `--cdg-carte-h` de `#cdg-gauche`, lue par la carte de la visionneuse et par `capSyCarte` de 87) ;
 * double-clic : hauteur par défaut. Masqué (CSS) quand aucune carte n'est affichée sous l'explorateur.
 * @param {HTMLElement} sp - Séparateur
 */
function capDiagSplitV(sp) {
  const g = () => document.getElementById('cdg-gauche');
  const poser = h => { _capDiag.carteH = h; g().style.setProperty('--cdg-carte-h', h + 'px'); };
  const apres = () => { capDiagCartePoignees(); if (capDiagSy() && typeof capSyCarteRender === 'function') capSyCarteRender(); };
  sp.addEventListener('pointerdown', e => {
    e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('on');
    const y0 = e.clientY, h0 = _capDiag.carteH, max = Math.max(120, g().clientHeight - 140);
    let raf = 0;
    const bouge = ev => { poser(Math.round(Math.min(max, Math.max(80, h0 - (ev.clientY - y0))))); if (!raf) raf = requestAnimationFrame(() => { raf = 0; apres(); }); };
    const fin = () => { sp.classList.remove('on'); sp.removeEventListener('pointermove', bouge); sp.removeEventListener('pointerup', fin); apres(); };
    sp.addEventListener('pointermove', bouge); sp.addEventListener('pointerup', fin);
  });
  sp.addEventListener('dblclick', () => { poser(170); apres(); });
}

/**
 * ▣ Carte (mini-carte de la visionneuse) : sous l'explorateur (repliable) ou dans le diagramme, comme dans la visionneuse.
 * La carte de la visionneuse est déplacée telle quelle (ses écouteurs suivent) ; son bouton ▣ Carte est masqué sous l'explorateur.
 */
function capDiagCarte() {
  const zone = document.getElementById('cdg-carte-zone'), c = document.getElementById('dgo-carte');   // carte posée par la visionneuse sur le dessin
  if (!zone || !c) return;
  const bt = document.getElementById('vd-carte-bt'), vz = document.getElementById('vd-zone'), pan = _capDiag.carte === 'panneau';
  if (!zone.firstChild) zone.innerHTML = `<div class="cdg-carte-tete"></div><div id="cdg-carte-corps" class="cdg-carte-corps"></div>`;
  const tete = zone.firstChild, corps = document.getElementById('cdg-carte-corps');
  tete.innerHTML = pan
    ? `<span class="cdg-carte-tog" data-carte-tog="1"><span class="cdg-tog">${_capDiag.carteReduite ? '▸' : '▾'}</span><b>${_L('▣ Carte')}</b></span><span style="flex:1"></span>` +
      `<button class="cap-lf-btn" data-carte="diagramme" title="${_L('Afficher la carte dans le diagramme')}">⇲</button>`
    : `<b>${_L('▣ Carte')}</b><span class="cdg-cnt">${_L('dans le diagramme')}</span><span style="flex:1"></span>` +
      `<button class="cap-lf-btn" data-carte="panneau" title="${_L('Afficher la carte sous l\'explorateur')}">⇱</button>`;
  if (pan) {
    if (c.parentElement !== corps) corps.appendChild(c);
    if (bt && !bt.classList.contains('actif')) bt.click();   // la visionneuse ne dessine la carte qu'affichée (▣ actif)
    if (bt) bt.style.display = 'none';
    corps.hidden = _capDiag.carteReduite;
  } else {
    if (c._vb0) { c.setAttribute('viewBox', c._vb0); c._vbNous = ''; c.removeAttribute('preserveAspectRatio'); c.querySelectorAll(':scope > rect.cdg-carte-fond').forEach(r => r.remove()); }   // carte rendue telle quelle à la visionneuse
    if (vz && c.parentElement !== vz) vz.appendChild(c);
    if (bt) bt.style.display = '';
    corps.hidden = true;
  }
  capDiagCartePoignees();
}

/** Facteur de zoom de la visionneuse par 100 unités de molette avec Ctrl (relevé : 1,15 ; continu en fonction de deltaY). */
const CAP_DIAG_ZOOM_MOLETTE = 1.15;

/**
 * Carrés aux angles du cadre bleu de la carte de la visionneuse (`.dgo-carte-vue` de `#dgo-carte`) : les glisser règle la taille de
 * l'affichage, l'angle opposé restant fixe. La visionneuse n'a pas d'API de zoom : le zoom demandé lui est transmis par un événement
 * molette synthétique avec Ctrl (facteur `CAP_DIAG_ZOOM_MOLETTE` par 100 de `deltaY`, centré sur le point fixe), et elle met à jour
 * elle-même le pourcentage et le cadre de la carte ; les poignées suivent le cadre par un observateur. Posées à côté de la carte dans
 * son conteneur du moment (sous l'explorateur ou dans le dessin).
 */
function capDiagCartePoignees() {
  const c = document.getElementById('dgo-carte'), parent = c && c.parentElement; if (!c || !parent) return;
  let L = document.getElementById('cdg-carte-poignees');
  if (L && L.parentElement !== parent) { L.remove(); L = null; }
  if (!L) {
    L = document.createElement('div'); L.id = 'cdg-carte-poignees'; L.className = 'cdg-carte-poignees';
    L.innerHTML = ['nw', 'ne', 'sw', 'se'].map(k => `<span class="sy-carte-h sy-carte-h-${k}" data-h="${k}" title="${_L('Glisser : taille de l\'affichage (zoom)')}"></span>`).join('');
    parent.appendChild(L);
    L.addEventListener('pointerdown', e => {
      const po = e.target.closest('.sy-carte-h'); if (!po) return;
      e.preventDefault(); e.stopPropagation();
      const k = po.dataset.h, zone = document.getElementById('vd-zone'), svg = document.getElementById('vd-svg'); if (!zone || !svg) return;
      L.setPointerCapture(e.pointerId);
      const mv = ev => {
        const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number); if (vb.length !== 4) return;
        const m = c.getScreenCTM(); if (!m) return;
        const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());   // pointeur en unités du diagramme (repère de la carte)
        const F = [k[1] === 'w' ? vb[0] + vb[2] : vb[0], k[0] === 'n' ? vb[1] + vb[3] : vb[1]];   // angle fixe (opposé)
        const W = Math.max(Math.abs(pt.x - F[0]), Math.abs(pt.y - F[1]) * vb[2] / vb[3], vb[2] / 40);
        const f = vb[2] / W; if (!isFinite(f) || Math.abs(Math.log(f)) < 0.005) return;
        const r = zone.getBoundingClientRect();   // le point fixe est un angle de la zone : la visionneuse zoome autour du pointeur
        zone.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 * Math.log(f) / Math.log(CAP_DIAG_ZOOM_MOLETTE), ctrlKey: true, bubbles: true, cancelable: true,
          clientX: k[1] === 'w' ? r.right - 1 : r.left + 1, clientY: k[0] === 'n' ? r.bottom - 1 : r.top + 1 }));
      };
      const fin = () => { L.removeEventListener('pointermove', mv); L.removeEventListener('pointerup', fin); L.removeEventListener('pointercancel', fin); };
      L.addEventListener('pointermove', mv); L.addEventListener('pointerup', fin); L.addEventListener('pointercancel', fin);
    });
  }
  if (parent.id === 'cdg-carte-corps') capDiagCarteCadre(c);   // sous l'explorateur : la carte montre aussi le cadre qui déborde le dessin
  const poser = () => {
    const vue = c.querySelector('.dgo-carte-vue'), m = c.getScreenCTM(), pr = parent.getBoundingClientRect();
    if (!vue || !m || c.parentElement !== parent || !c.getClientRects().length) { L.hidden = true; return; }
    const x = +vue.getAttribute('x'), y = +vue.getAttribute('y'), w = +vue.getAttribute('width'), h = +vue.getAttribute('height');
    const P = (px, py) => { const q = new DOMPoint(px, py).matrixTransform(m); return [q.x - pr.left + parent.scrollLeft, q.y - pr.top + parent.scrollTop]; };
    const a = P(x, y), b = P(x + w, y + h);
    L.hidden = false; L.style.left = Math.min(a[0], b[0]) + 'px'; L.style.top = Math.min(a[1], b[1]) + 'px';
    L.style.width = Math.abs(b[0] - a[0]) + 'px'; L.style.height = Math.abs(b[1] - a[1]) + 'px';
  };
  poser();
  if (!c._cdgObs) { c._cdgObs = new MutationObserver(() => requestAnimationFrame(() => { const l = document.getElementById('cdg-carte-poignees'); if (l) capDiagCartePoignees(); }));
    c._cdgObs.observe(c, { attributes: true, subtree: true, childList: true }); window.addEventListener('resize', () => capDiagCartePoignees()); }
}

/**
 * ▣ Carte Capella sous l'explorateur, comme le Zoom de Cameo : la visionneuse cadre sa carte sur le dessin, si bien qu'en dézoomant le cadre
 * bleu (partie affichée) la déborde et disparaît avec ses poignées. On élargit ici la zone montrée (`viewBox`) à l'union du dessin et du
 * cadre, calée en haut à gauche, seulement quand le cadre déborde, et l'on pose sous le dessin un fond (`.cdg-carte-fond`) : le reste apparaît
 * en gris (CSS) ; les clics sur la carte sont alors convertis (`capDiagCarteTraduire`). Le `viewBox` d'origine de la visionneuse est gardé
 * dans `c._vb0` (renouvelé quand elle le change : autre diagramme).
 * @param {SVGSVGElement} c - Carte `#dgo-carte` de la visionneuse
 */
function capDiagCarteCadre(c) {
  const cur = c.getAttribute('viewBox') || '', vue = c.querySelector('.dgo-carte-vue'); if (!cur || !vue) return;
  if (c._glisse) { if (c._vbNous && cur !== c._vbNous) c.setAttribute('viewBox', c._vbNous); return; }   // glisser en cours : cadrage figé (sinon le mouvement s'amplifie), reposé si la visionneuse le remplace
  if (cur !== c._vbNous) c._vb0 = cur;   // viewBox posé par la visionneuse
  const v0 = c._vb0.split(/[\s,]+/).map(Number); if (v0.length !== 4 || v0.some(x => !isFinite(x))) return;
  const x = +vue.getAttribute('x'), y = +vue.getAttribute('y'), w = +vue.getAttribute('width'), h = +vue.getAttribute('height');
  if (![x, y, w, h].every(isFinite)) return;
  const tol = Math.max(v0[2], v0[3]) * 0.002;
  const deborde = x < v0[0] - tol || y < v0[1] - tol || x + w > v0[0] + v0[2] + tol || y + h > v0[1] + v0[3] + tol;
  let fond = c.querySelector(':scope > rect.cdg-carte-fond');
  if (!deborde) {   // cadre dans le dessin : carte telle que la visionneuse la pose
    if (c._vbNous) { c._vbNous = ''; c.setAttribute('viewBox', c._vb0); c.removeAttribute('preserveAspectRatio'); }
    if (fond) fond.remove();
    return;
  }
  const m = Math.max(v0[2], v0[3]) * 0.01;   // petite marge pour voir les poignées
  const x0 = Math.min(v0[0], x) - m, y0 = Math.min(v0[1], y) - m, x1 = Math.max(v0[0] + v0[2], x + w) + m, y1 = Math.max(v0[1] + v0[3], y + h) + m;
  const nv = [x0, y0, x1 - x0, y1 - y0].map(n => +n.toFixed(2)).join(' ');
  if (!fond) { fond = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); fond.setAttribute('class', 'cdg-carte-fond'); fond.setAttribute('pointer-events', 'none'); c.insertBefore(fond, c.firstChild); }
  const f = v0.map(String);
  if (fond.getAttribute('x') !== f[0] || fond.getAttribute('width') !== f[2]) { fond.setAttribute('x', f[0]); fond.setAttribute('y', f[1]); fond.setAttribute('width', f[2]); fond.setAttribute('height', f[3]); }
  if (c.getAttribute('preserveAspectRatio') !== 'xMinYMin meet') c.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  if (cur !== nv) { c._vbNous = nv; c.setAttribute('viewBox', nv); }
  capDiagCarteTraduire(c);
}

/** Types d'événements de la carte Capella convertis par `capDiagCarteTraduire`. */
const CAP_DIAG_CARTE_EVTS = ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick'];

/**
 * Carte Capella recadrée par `capDiagCarteCadre` : la visionneuse calcule la position d'un clic ou d'un glisser sur sa carte d'après son
 * propre cadrage (`viewBox` d'origine, centré). Tant que la carte est recadrée, chaque événement souris / pointeur sur la carte (et, pendant
 * un glisser commencé sur elle, sur la fenêtre) est arrêté puis renvoyé avec les coordonnées qu'il aurait eues sur la carte d'origine : le
 * point visé du dessin reste le même ; pendant le glisser (`c._glisse`), le recadrage est figé. Écouteurs posés une fois (`c._cdgTr`).
 * @param {SVGSVGElement} c - Carte `#dgo-carte`
 */
function capDiagCarteTraduire(c) {
  if (c._cdgTr) return; c._cdgTr = true;
  const conv = e => {   // coordonnées écran attendues par la visionneuse pour le même point du dessin
    const n = String(c._vbNous || '').split(/[\s,]+/).map(Number), v = String(c._vb0 || '').split(/[\s,]+/).map(Number), r = c.getBoundingClientRect();
    if (n.length !== 4 || v.length !== 4 || !r.width) return null;
    const k1 = Math.min(r.width / n[2], r.height / n[3]), D = [n[0] + (e.clientX - r.left) / k1, n[1] + (e.clientY - r.top) / k1];   // carte recadrée (xMinYMin meet), calcul indépendant du viewBox du moment
    const k = Math.min(r.width / v[2], r.height / v[3]);
    return [r.left + (r.width - v[2] * k) / 2 + (D[0] - v[0]) * k, r.top + (r.height - v[3] * k) / 2 + (D[1] - v[1]) * k];
  };
  const renvoyer = e => {
    if (e._cdgTr || !c._vbNous) return;
    if (e.target && e.target.closest && e.target.closest('.cdg-carte-poignees')) return;
    const P = conv(e); if (!P) return;
    e.stopImmediatePropagation();
    const init = { bubbles: e.bubbles, cancelable: e.cancelable, composed: true, view: window, clientX: P[0], clientY: P[1], screenX: e.screenX + P[0] - e.clientX, screenY: e.screenY + P[1] - e.clientY,
      button: e.button, buttons: e.buttons, detail: e.detail, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey };
    if (e instanceof PointerEvent) Object.assign(init, { pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, width: e.width, height: e.height, pressure: e.pressure });
    const n = new e.constructor(e.type, init); n._cdgTr = true;
    if (/down$/.test(e.type)) c._glisse = true;
    (e.target || c).dispatchEvent(n);
    if (n.defaultPrevented) e.preventDefault();
    if (/up$/.test(e.type)) setTimeout(() => { c._glisse = false; capDiagCarteCadre(c); capDiagCartePoignees(); }, 0);
  };
  CAP_DIAG_CARTE_EVTS.forEach(t => c.addEventListener(t, renvoyer, true));
  c._renvoyer = renvoyer;   // glisser : déplacements et relâcher convertis aussi au niveau de la fenêtre (écouteurs posés au chargement, ci-dessous)
}

// Posés au chargement du module, donc avant ceux que la visionneuse ajoute sur la fenêtre : pendant un glisser commencé sur la carte Capella
// recadrée, déplacements et relâcher sont convertis avant qu'elle ne les lise (`capDiagCarteTraduire`).
CAP_DIAG_CARTE_EVTS.filter(t => /move|up/.test(t)).forEach(t => window.addEventListener(t, e => { const c = document.getElementById('dgo-carte'); if (c && c._glisse && c._renvoyer) c._renvoyer(e); }, true));

// Les cartes (visionneuse et lecteurs) servent à se déplacer : pas de sélection de texte ni d'élément en glissant dessus
document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('#dgo-carte,.sy-carte,.cdg-carte-poignees')) e.preventDefault(); }, true);

/** ▣ Carte selon le format : celle de la visionneuse (Capella) ou celle des lecteurs (`capSyCarteRender`, 87). */
function capDiagCarteMaj() { if (capDiagSy()) { if (typeof capSyVuesRender === 'function') capSyVuesRender(); } else capDiagCarte(); }   // lecteurs : partie droite rendue de nouveau (carte dans le dessin ou sous l'explorateur)

/** Barre du haut, commune aux formats : 📂 Ouvrir le .aird… (Capella), ℹ Infos, ⧉ Comparer, ⬇ Exporter…, ☐ Sélectionner…, fichier chargé, statut. */
function capDiagBarre() {
  const b = document.getElementById('cdg-barre'); if (!b) return;
  const n = _capDiag.sel.size, sy = capDiagSy(), charge = capDiagCharge(), reps = charge ? capDiagReps() : [];
  const exp = charge ? `<span class="tb-grp"><button class="tbtn" id="cdg-export" title="${_L('Exporter plusieurs diagrammes en planches (en-tête, description, cartouche, annexe) : PDF, ZIP PNG / SVG, rapport HTML')}">${_L('⬇ Exporter…')}${n ? ` <span class="cdg-nb">${n}</span>` : ''}</button>` +
    `<button class="tbtn${_capDiag.choix ? ' active' : ''}" id="cdg-choix" title="${_L('Choisir les diagrammes à exporter : cases à cocher dans l\'explorateur')}">${_capDiag.choix ? _L('☑ Terminer la sélection') : _L('☐ Sélectionner…')}</button></span>` : '';
  const infos = charge ? `<button class="tbtn" id="cdg-infos" title="${_L('Informations du diagramme ouvert dans le panneau de détail : type, couche, description, élément représenté, éléments affichés')}">${_L('ℹ Infos')}</button>` +
    `<button class="tbtn" id="cdg-comparer" title="${_L('Afficher le diagramme ouvert dans la fenêtre de comparaison (fenêtre séparée, par exemple sur un autre écran) ; clic droit sur un diagramme de la liste pour en choisir un autre')}">${_L('⧉ Comparer')}</button>` : '';
  const ouvrir = sy ? '' : `<button class="tbtn" id="cdg-ouvrir" title="${_L('Choisir le fichier .aird (le sélecteur s\'ouvre dans le dossier du .capella quand le navigateur le permet)')}">${_L('📂 Ouvrir le .aird…')}</button>`;
  let info;
  if (sy) { const nd = reps.filter(r => r.origine !== 'calculee').length;
    info = charge ? capEsc(capDiagNomSource()) + ' — ' + (nd ? _L(`${nd} diagramme(s) · ${reps.length - nd} vue(s) calculée(s)`) : _L(`${reps.length} vue(s) calculée(s)`)) : _L('Aucun diagramme ni aucune vue calculable dans ce modèle.'); }
  else info = _capDiag.airdCharge ? capEsc(_capDiag.nomAird) + ' — ' + _L(`${_capDiag.nbReps} diagramme(s)`) : _L('Ouvrez le fichier .aird du projet (à côté du .capella), ou déposez-le sur la fenêtre.');
  b.innerHTML = (ouvrir || infos ? `<span class="tb-grp">${ouvrir}${infos}</span>` : '') + exp +
    `<span id="cdg-info" class="cdg-info">${info}</span><span id="cdg-statut" class="cdg-info"></span>`;
}

/** Ajuste la hauteur de la vue à la fenêtre. */
function capDiagFit() {
  const c = document.querySelector('#cap-view-diag .cdg-corps');
  if (!c) return;
  const bas = Math.min(window.innerHeight, document.getElementById('cap-view-diag').getBoundingClientRect().bottom);   // bas de la surimpression
  c.style.height = Math.max(320, bas - c.getBoundingClientRect().top) + 'px';
}

/** Transmet à la visionneuse le modèle courant (texte XML) et le .aird en attente, si besoin. */
function capDiagSync() {
  const v = _capDiag.vis;
  if (!v) return;
  if (_capDiag.modele !== cap_xmlDoc && cap_xmlDoc) {
    v.chargerModele(new XMLSerializer().serializeToString(cap_xmlDoc), capCurrentFileName);
    _capDiag.modele = cap_xmlDoc;
    if (_capDiag.texteAird) _capDiag.airdCharge = false;   // diagrammes relus avec le nouveau modèle
    else if (_capDiag.airdCharge) { _capDiag.airdCharge = false; try { v.fermer(); } catch (e) {} }   // nouveau modèle sans .aird
  }
  if (_capDiag.texteAird && !_capDiag.airdCharge) {
    _capDiag.nbReps = v.chargerAird(_capDiag.texteAird, _capDiag.nomAird);
    _capDiag.airdCharge = true; _capDiag.icones = null; _capDiag.meta = null; _capDiag.parCible = null; _capDiag.sel.clear(); _capDiag.actif = '';
  }
  capDiagBarre();
  capDiagListe();
  capDiagCarte();
  capDiagBarreVd();
}

/**
 * Réorganise la barre de la visionneuse au-dessus du diagramme, pour qu'elle ne bouge plus d'un diagramme à l'autre :
 * ligne 1 = identité du diagramme (retour, icône, sigle, nom tronqué) puis recherche (champ, ▲ ▼), thème, export, ✕ ;
 * ligne 2 = outils à largeur fixe (📝 note de revue et calque, chaînes, filtres, zoom, carte, mise en page).
 * Masqués : le bouton ⌒ Ponts et l'élément représenté (#vd-cible, visible dans ℹ Infos). Les commandes sont déplacées telles quelles (leurs écouteurs suivent).
 * Appelée à chaque synchronisation ; sans effet après la première fois.
 */
function capDiagBarreVd() {
  const l1 = document.querySelector('#vue-diagramme > .vd-barre:not(#vd-outils)');
  if (!l1 || document.getElementById('cdg-vd-l2')) { capDiagRevSlot(); return; }
  const l2 = document.createElement('div'); l2.id = 'cdg-vd-l2'; l2.className = 'vd-barre cdg-vd-l2';
  l1.classList.add('cdg-vd-l1'); l1.after(l2);
  const prendre = sel => { const e = typeof sel === 'string' ? l1.querySelector(sel) : sel; if (e) l2.appendChild(e); return e; };
  const sep = () => { const x = document.createElement('span'); x.className = 'cdg-vd-sep'; l2.appendChild(x); };
  const ch = l1.querySelector('.vd-chercher'), tr = document.getElementById('vd-trouves');
  if (ch && tr) ch.appendChild(tr);   // nombre de résultats après ▲ ▼ : pas de vide entre le champ et ses flèches
  const rev = document.createElement('span'); rev.id = 'cdg-crv'; rev.className = 'cdg-crv'; l2.appendChild(rev);
  sep(); prendre('#vd-chaine'); prendre(document.getElementById('vd-filtres-bt') && document.getElementById('vd-filtres-bt').parentElement);
  sep(); ['#vd-moins', '#vd-zoom', '#vd-plus', '#vd-ajuster', '#vd-reel', '#vd-zoom-choix', '#vd-carte-bt'].forEach(prendre);
  const ressort = document.createElement('span'); ressort.className = 'ressort'; ressort.style.flex = '1'; l2.appendChild(ressort);
  const mode = document.createElement('span'); mode.id = 'cdg-mode'; mode.className = 'cdg-mode'; mode.innerHTML = capDiagModeHtml(); l2.appendChild(mode);   // 🖼 Visuel / ≡ Texte, taille du texte
  prendre('#vd-edition'); prendre('#vd-tableau-info');
  // Thème et export : à droite de la ligne 1, avant ✕ (le nom du diagramme est tronqué pour leur laisser la place)
  // Recherche (champ, ▲ ▼, résultats) à droite de la ligne 1, avant le thème : position fixe quel que soit le nom du diagramme
  const fermer = document.getElementById('vd-fermer'), exp = document.getElementById('vd-export-bt');
  [ch, document.getElementById('vd-theme'), exp && exp.parentElement].forEach(e => { if (e && fermer && fermer.parentElement === l1) l1.insertBefore(e, fermer); });
  const cible = document.getElementById('vd-cible'); if (cible) cible.style.display = 'none';   // élément représenté : déjà dans ℹ Infos
  const ponts = document.getElementById('vd-ponts'); if (ponts) ponts.style.display = 'none';
  // Chaînes et chemins : seulement ceux dessinés dans le diagramme ouvert (liste remplie par la visionneuse à chaque ouverture)
  let raf = 0;
  new MutationObserver(ms => { if (ms.every(m => m.target.closest && m.target.closest('.crv-layer,#cdg-texte'))) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { capDiagChainesFiltre(); if (_capDiag.texte) capDiagTexteMaj(); }); })
    .observe(document.getElementById('vue-diagramme'), { subtree: true, childList: true });
  capDiagRevSlot(); capDiagChainesFiltre();
}

/** Boutons 🖼 Visuel / ≡ Texte et taille du texte (A− A+, en mode texte) de la ligne 2 de la visionneuse. @returns {string} HTML */
function capDiagModeHtml() {
  const tx = _capDiag.texte;
  return `<button class="bt bt-petit${tx ? '' : ' actif'}" id="cdg-mode-vis" title="${_L('Dessin du diagramme')}">${_L('🖼 Visuel')}</button>` +
    `<button class="bt bt-petit${tx ? ' actif' : ''}" id="cdg-mode-txt" title="${_L('Rendu textuel : éléments représentés, par type (clic : panneau de détail)')}">${_L('≡ Texte')}</button>` +
    `<button class="bt bt-petit" id="cdg-tx-moins" title="${_L('Texte plus petit')}"${tx ? '' : ' hidden'}>A−</button><button class="bt bt-petit" id="cdg-tx-plus" title="${_L('Texte plus grand')}"${tx ? '' : ' hidden'}>A+</button>`;
}

/**
 * ≡ Texte d'un diagramme Capella : la visionneuse n'a pas de rendu textuel, un volet posé sur le dessin (#cdg-texte dans #vd-zone)
 * liste les éléments représentés par type, avec leur description ; boutons et taille du texte mis à jour. Rafraîchi à chaque
 * changement de diagramme tant que le mode est actif.
 */
function capDiagTexteMaj() {
  const zone = document.getElementById('vd-zone'); if (!zone) return;
  let t = document.getElementById('cdg-texte');
  if (!t) { t = document.createElement('div'); t.id = 'cdg-texte'; t.className = 'cdg-texte'; zone.appendChild(t);
    t.addEventListener('click', e => { const a = e.target.closest('[data-id]'); if (a) capOpenDetail(a.dataset.id); }); }
  t.hidden = !_capDiag.texte;
  const m = document.getElementById('cdg-mode');
  if (m) { m.querySelector('#cdg-mode-vis').classList.toggle('actif', !_capDiag.texte); m.querySelector('#cdg-mode-txt').classList.toggle('actif', _capDiag.texte);
    m.querySelectorAll('#cdg-tx-moins,#cdg-tx-plus').forEach(b => { b.hidden = !_capDiag.texte; }); }
  if (!_capDiag.texte) return;
  t.style.fontSize = (12 * _capDiag.texteZoom).toFixed(1) + 'px';
  t.innerHTML = capDiagTexteHtml();
}

/** Contenu du volet ≡ Texte : nom et description du diagramme, puis les éléments représentés groupés par type (cliquables). @returns {string} HTML */
function capDiagTexteHtml() {
  const r = capDiagReps().find(x => x.uid === _capDiag.actif), esc = capEsc;
  const ids = [...new Set([...document.querySelectorAll('#vd-svg [data-sem]')].map(e => e.getAttribute('data-sem')))];
  const els = ids.map(id => capGetElementById_(id)).filter(Boolean);
  const parType = new Map(); els.forEach(e => { if (!parType.has(e.typeName)) parType.set(e.typeName, []); parType.get(e.typeName).push(e); });
  let h = `<div class="cdg-tx-titre">${r ? esc(r.nom) : ''}<span class="cdg-cnt"> · ${_L(`${els.length} élément(s)`)}</span></div>`;
  if (r) { const m = capDiagMeta(r.uid); if (m.desc) h += `<div class="cdg-tx-desc">${esc(m.desc)}</div>`; }
  [...parType.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).forEach(([t, l]) => {
    h += `<div class="cdg-tx-sec">${esc((CAP_HUMAN_NAMES[t] || {}).h || t)} <span class="cdg-cnt">${l.length}</span></div>` +
      l.sort((a, b) => String(a.attrs.name || '').localeCompare(String(b.attrs.name || ''))).map(e => `<div class="cdg-tx-el" data-id="${esc(e.id)}">${capIco(e.id, 13)}<span>${esc(e.attrs.name || e.id)}</span>` +
        (e.attrs.description ? `<span class="cdg-tx-d">${esc(capDiagTexte(e.attrs.description).slice(0, 160))}</span>` : '') + `</div>`).join('');
  });
  return els.length ? h : h + `<div class="cdg-aide">${_L('Aucun élément.')}</div>`;
}

/** Remplit l'emplacement de la revue (📝 Note de revue, 💬 Calque) à côté de la recherche du diagramme. */
function capDiagRevSlot() {
  const r = document.getElementById('cdg-crv');
  if (r && typeof capRevDiagBar === 'function') r.innerHTML = capRevDiagBar();
}

/**
 * Liste « Chaînes et chemins » : ne garde que les chaînes fonctionnelles et chemins physiques dessinés dans
 * le diagramme ouvert (forme rattachée à la chaîne dans le SVG) ; liste masquée s'il n'y en a aucun.
 */
function capDiagChainesFiltre() {
  const sel = document.getElementById('vd-chaine'), svg = document.getElementById('vd-svg');
  if (!sel || !svg) return;
  let n = 0;
  [...sel.options].forEach(o => { if (!o.value) return; const vu = !!svg.querySelector(`[data-sem="${CSS.escape(o.value)}"]`); o.hidden = !vu; o.disabled = !vu; if (vu) n++; });
  if (sel.selectedOptions[0] && sel.selectedOptions[0].hidden) sel.value = '';
  sel.style.visibility = n ? '' : 'hidden';
  sel.title = n ? _L('Mettre en évidence une chaîne fonctionnelle ou un chemin physique dessiné dans ce diagramme') : '';
}

/** Rendu de la vue 🔲 Diagrammes : enveloppe commune (barre, explorateur, carte) ; dessin par la visionneuse (Capella) ou par les lecteurs (#cdg-sy, 87). */
function capRenderDiagrams() {
  const box = document.getElementById('cap-view-diag'), sy = capDiagSy();
  if (!sy && !capDiagDispo()) {
    box.innerHTML = `<div class="cdg-vide">${_L('Visionneuse de diagrammes absente de cette page.')}</div>`;
    _capDiag.pret = false; _capDiag.vis = null;
    return;
  }
  capDiagEnsure();
  box.dataset.fmt = sy ? 'sy' : 'capella';
  const zc = document.getElementById('cdg-carte-zone'), zs = document.getElementById('cdg-carte-sy');
  if (zc) zc.hidden = sy; if (zs) zs.hidden = !sy;
  if (sy) { capDiagBarre(); capDiagListe(); capSyVuesRender(document.getElementById('cdg-sy')); }
  else capDiagSync();
  capDiagFit();
}

/* ── Liste classée ─────────────────────────────────────────────────────── */

/**
 * Représentations affichables : diagrammes du .aird chargé ({uid, nom, type, sigle, genre, couche}) ou, pour un modèle SysML / UML, les
 * vues des lecteurs présentées de la même façon (`capSyVuesReps`, 87 : uid « sy:<clé> », `kind`, `origine`, `element`, `couche` = famille).
 * @returns {object[]} représentations
 */
function capDiagReps() {
  if (capDiagSy()) return capSyVuesReps();
  return _capDiag.vis && _capDiag.airdCharge ? _capDiag.vis.representations() : [];
}

/**
 * Libellé et couleur d'une couche ARCADIA (OA, SA, LA, PA, EPBS) ou d'une famille SysML / UML (STR, BEH, REQ, ORG).
 * @param {string} c - Couche ou famille
 * @returns {{label:string,color:string,bg:string}} libellé et couleurs
 */
function capDiagCouche(c) {
  if (CAP_LAYERS[c]) return CAP_LAYERS[c];
  if (c && typeof CAP_SY_FAM_COULEUR !== 'undefined' && CAP_SY_FAM_COULEUR[c]) {
    const L = typeof capSyL === 'function' ? capSyL() : null, col = CAP_SY_FAM_COULEUR[c];
    return { label: (L && L.familles && L.familles[c]) || c, color: col, bg: col + '26' };
  }
  return { label: c || _L('Autres'), color: '#8b949e', bg: 'rgba(139,148,158,.15)' };
}

/** Parents et nœuds de l'arbre du modèle (`capTreeData`), pour remonter le chemin d'un élément. @returns {{map:Map<string,object>, noeuds:Map<string,object>}} id → nœud parent, id → nœud */
function capDiagParents() {
  if (_capDiag.parents && _capDiag.parents.src === capTreeData) return _capDiag.parents;
  const map = new Map(), noeuds = new Map();
  const walk = (n, p) => { if (n.id && !noeuds.has(n.id)) { noeuds.set(n.id, n); if (p) map.set(n.id, p); } (n.children || []).forEach(c => walk(c, n)); };   // premier nœud d'un identifiant (la racine « cap-root » n'est pas la seule à le porter)
  if (capTreeData) walk(capTreeData, null);
  return (_capDiag.parents = { src: capTreeData, map, noeuds });
}

/** Élément représenté par un diagramme : cible du descripteur Capella (.aird), élément porteur d'une vue SysML / UML. @param {object} rep - Représentation @returns {string} identifiant ou '' */
function capDiagCibleId(rep) {
  if (capDiagSy()) return rep.element || '';
  const m = capDiagMeta(rep.uid); return m.cible ? m.cible.id : '';
}

/** Diagrammes par élément représenté (classement 🌳 Arborescence, vue 🌳 Arborescence du modèle : 21). @returns {Map<string,object[]>} id → représentations */
function capDiagParCible() {
  const reps = capDiagReps(), cle = reps.length + '|' + (reps[0] ? reps[0].uid : '');
  if (_capDiag.parCible && _capDiag.parCible.cle === cle) return _capDiag.parCible.map;
  const map = new Map();
  reps.forEach(r => { const id = capDiagCibleId(r); if (!id) return; if (!map.has(id)) map.set(id, []); map.get(id).push(r); });
  map.forEach(l => l.sort((a, b) => a.nom.localeCompare(b.nom)));
  _capDiag.parCible = { cle, map };
  return map;
}

/**
 * Diagrammes d'un élément : ceux dont il est la cible (`cibles`) et ceux où il est dessiné (`presences`) — visionneuse pour Capella,
 * index des `data-sem` des SVG des lecteurs sinon (calculé une fois par lecture).
 * @param {string} id - Élément
 * @returns {{cibles:object[], presences:object[]}} représentations
 */
function capDiagDe(id) {
  if (capDiagSy()) { const idx = capDiagSyIdx(); return { cibles: (idx.cibles.get(id) || []).slice(), presences: (idx.presences.get(id) || []).slice() }; }
  if (!_capDiag.vis || !_capDiag.airdCharge) return { cibles: [], presences: [] };
  try { return _capDiag.vis.diagrammesDe(id); } catch (e) { return { cibles: [], presences: [] }; }
}

/** Index des vues des lecteurs : élément porteur → vues, élément dessiné → vues (formes et `data-sem` du SVG). @returns {{lec:object, cibles:Map, presences:Map}} */
function capDiagSyIdx() {
  const lec = _capSysml.lecture;
  if (_capDiag.syIdx && _capDiag.syIdx.lec === lec) return _capDiag.syIdx;
  const cibles = capDiagParCible(), presences = new Map();
  capDiagReps().forEach(r => {
    const v = capSyVue(r.cle); if (!v) return;
    const ids = new Set((v.svg.match(/data-sem="[^"]+"/g) || []).map(a => a.slice(10, -1)));
    (v.formes || []).forEach(f => { if (f.element) ids.add(f.element); });
    ids.forEach(i => { if (i === r.element) return; if (!presences.has(i)) presences.set(i, []); presences.get(i).push(r); });
  });
  return (_capDiag.syIdx = { lec, cibles, presences });
}

/** Rang d'une couche pour le tri. @param {string} c - Couche @returns {number} */
function capDiagRang(c) { const i = CAP_DIAG_COUCHES.indexOf(c); return i < 0 ? 99 : i; }

/** Icône de chaque diagramme : reprise de la liste (masquée) de la visionneuse, ou dessinée par le lecteur (`capSyVueIco`). @returns {Map<string,string>} uid → SVG */
function capDiagIcones() {
  if (_capDiag.icones) return _capDiag.icones;
  const m = new Map();
  if (capDiagSy()) capDiagReps().forEach(r => m.set(r.uid, capSyVueIco({ genre: r.kind, sysml: r.sysml }, 14)));
  else document.querySelectorAll('#diag-liste li[data-diag]').forEach(li => { const i = li.querySelector('.diag-ico'); if (i) m.set(li.dataset.diag, i.innerHTML); });
  if (m.size) _capDiag.icones = m;
  return m;
}

/** Représentations filtrées par la recherche (nom, type, sigle, couche ; origine pour les lecteurs). @returns {object[]} */
function capDiagFiltrees() {
  const q = _capDiag.filtre.trim().toLowerCase();
  const reps = capDiagReps();
  return q ? reps.filter(r => `${r.nom} ${r.type} ${r.sigle} ${r.couche} ${r.libelleOrigine || ''}`.toLowerCase().includes(q)) : reps;
}

/**
 * Regroupe les représentations selon le classement choisi : Capella — couche › type, couche, type, nom ; lecteurs — genre › origine,
 * genre, origine, nom ; pour les deux, 🌳 Arborescence (`capDiagArbo`).
 * @param {object[]} reps - Représentations
 * @returns {object[]} groupes [{cle, titre, couche, sigle, reps, enfants}] (enfants : sous-groupes, ou null)
 */
function capDiagGroupes(reps) {
  const parNom = (a, b) => a.nom.localeCompare(b.nom);
  /** Groupe par type de diagramme (sigle + type). */
  const parType = (liste, prefixe) => {
    const m = new Map();
    liste.forEach(r => { const k = r.sigle + '|' + r.type; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
    return [...m.entries()].map(([k, l]) => ({ cle: prefixe + k, titre: l[0].type, sigle: l[0].sigle, couche: l[0].couche, reps: l.sort(parNom), enfants: null }))
      .sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.sigle.localeCompare(b.sigle));
  };
  /** Groupe par couche ARCADIA. */
  const parCouche = () => {
    const m = new Map();
    reps.forEach(r => { const c = r.couche || '?'; if (!m.has(c)) m.set(c, []); m.get(c).push(r); });
    return [...m.entries()].sort((a, b) => capDiagRang(a[0]) - capDiagRang(b[0]) || a[0].localeCompare(b[0]))
      .map(([c, l]) => ({ cle: 'c:' + c, titre: capDiagCouche(c).label, couche: c, reps: l.sort(parNom), enfants: null }));
  };
  /** Groupe par genre de diagramme des lecteurs (bdd, ibd, vue générale…), dans l'ordre des genres du lecteur (`genresVues`). */
  const parGenre = () => {
    const m = new Map(), G = Object.keys((typeof capSyL === 'function' && capSyL() || {}).genresVues || {}), ordre = k => { const i = G.indexOf(k); return i < 0 ? 99 : i; };
    reps.forEach(r => { const k = r.kind || r.sigle; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
    return [...m.values()].sort((a, b) => ordre(a[0].kind) - ordre(b[0].kind) || a[0].type.localeCompare(b[0].type))
      .map(l => ({ cle: 'g:' + (l[0].kind || l[0].sigle), titre: l[0].type, sigle: l[0].sigle, couche: l[0].couche, kind: l[0].kind, sysml: l.every(r => r.sysml), reps: l.sort(parNom), enfants: null }));
  };
  /** Sous-groupes par origine (Cameo, Enterprise Architect, Papyrus, vue calculée en dernier). */
  const parOrigine = (liste, prefixe) => {
    const o = new Map(); liste.forEach(r => { const k = r.origine || ''; if (!o.has(k)) o.set(k, []); o.get(k).push(r); });
    return [...o.entries()].sort((a, b) => (a[0] === 'calculee') - (b[0] === 'calculee') || a[0].localeCompare(b[0]))
      .map(([k, lo]) => ({ cle: prefixe + k, titre: lo[0].libelleOrigine || k, sigle: '', couche: lo[0].couche, origine: true, reps: lo.sort(parNom), enfants: null }));
  };
  switch (capDiagClassement()) {
    case 'couche': return parCouche();
    case 'type': {
      const m = new Map();
      reps.forEach(r => { if (!m.has(r.sigle)) m.set(r.sigle, []); m.get(r.sigle).push(r); });
      return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([s, l]) => ({ cle: 's:' + s, titre: [...new Set(l.map(r => r.type))].join(' / '), sigle: s,
        reps: l.sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || parNom(a, b)), enfants: null }));
    }
    case 'nom': return [{ cle: 'tout', titre: '', reps: reps.slice().sort(parNom), enfants: null, plat: true }];
    case 'genre': return parGenre();
    case 'genre-origine': return parGenre().map(g => { const e = parOrigine(g.reps, g.cle + '/'); return e.length > 1 ? Object.assign(g, { enfants: e }) : g; });
    case 'origine': return parOrigine(reps, 'o:').map(g => Object.assign(g, { reps: g.reps.sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.type.localeCompare(b.type) || parNom(a, b)) }));
    case 'arbo': return capDiagArbo(reps);
    default: return capDiagSy() ? parGenre() : parCouche().map(g => Object.assign(g, { enfants: parType(g.reps, g.cle + '/') }));
  }
}

/**
 * Classement 🌳 Arborescence : chaque diagramme sous l'élément qu'il représente (cible du descripteur Capella, élément porteur d'une
 * vue SysML / UML), dans l'arbre du modèle réduit aux chemins qui mènent à un diagramme ; diagrammes sans cible connue à la racine.
 * @param {object[]} reps - Représentations
 * @returns {object[]} nœuds [{cle:'a:<id>', id, titre, typeName, couche, reps (tout le sous-arbre), diags (directs), enfants, arbo:true}]
 */
function capDiagArbo(reps) {
  const P = capDiagParents(), racines = [], noeuds = new Map(), sans = [], parNom = (a, b) => a.nom.localeCompare(b.nom);
  const noeud = id => {
    if (noeuds.has(id)) return noeuds.get(id);
    const t = P.noeuds.get(id); if (!t) return null;
    const n = { cle: 'a:' + id, id, titre: t.name || (CAP_HUMAN_NAMES[t.typeName] || {}).h || t.typeName || '', typeName: t.typeName || '', couche: t.layer || '', reps: [], diags: [], enfants: [], arbo: true };
    noeuds.set(id, n);
    const p = P.map.get(id), pn = p && p.id ? noeud(p.id) : null;
    if (pn) pn.enfants.push(n); else racines.push(n);
    return n;
  };
  reps.forEach(r => { const id = capDiagCibleId(r), n = id ? noeud(id) : null; if (n) n.diags.push(r); else sans.push(r); });
  const finir = n => { n.enfants.sort((a, b) => a.titre.localeCompare(b.titre)); n.diags.sort(parNom); n.reps = [...n.diags]; n.enfants.forEach(e => { finir(e); n.reps.push(...e.reps); }); };
  racines.forEach(finir);
  if (sans.length) racines.push({ cle: 'a:sans', id: '', titre: _L('Sans élément représenté'), typeName: '', couche: '', reps: sans.sort(parNom), diags: sans, enfants: [], arbo: true });
  return racines;
}

/**
 * Ouverture par défaut d'un groupe : couches et nœuds de l'arborescence ouverts, types repliés.
 * @param {object} g - Groupe
 * @param {number} niveau - 1 (premier niveau) ou plus
 * @returns {boolean} vrai si ouvert par défaut
 */
function capDiagDefautOuvert(g, niveau) { return g.arbo ? true : niveau === 1; }

/**
 * Un groupe est-il ouvert ? Selon le défaut (`capDiagDefautOuvert`) et les bascules de l'utilisateur ; tout est ouvert pendant une recherche.
 * @param {object} g - Groupe
 * @param {number} niveau - 1 (couche ou type seul) ou 2 (type dans une couche)
 * @returns {boolean} vrai si déplié
 */
function capDiagOuvert(g, niveau) {
  if (_capDiag.filtre.trim()) return true;
  const defaut = capDiagDefautOuvert(g, niveau);
  return _capDiag.bascule.has(capDiagClassement() + '|' + g.cle) ? !defaut : defaut;
}

/** Rend la liste classée (panneau gauche), commune aux formats : filtre, classement, ⊞ ⊟, groupes repliables ou 🌳 arborescence compacte, cases à cocher, ℹ. */
function capDiagListe() {
  const box = document.getElementById('cdg-liste'); if (!box) return;
  const sy = capDiagSy(), cl = capDiagClassement();
  if (!capDiagCharge()) {
    box.innerHTML = sy ? `<div class="cdg-aide">${_L('Aucun diagramme ni aucune vue calculable dans ce modèle.')}</div>` :
      `<div class="cdg-aide">${_L('Aucun .aird chargé.')}<br><br>${_L('📂 Ouvrir le .aird… s\'ouvre dans le dossier du .capella (Edge / Chrome).')}<br>` +
      _L('Ou, depuis l\'écran d\'accueil, 📁 Dossier du projet… : le .capella et ses diagrammes sont chargés ensemble.') + `</div>`;
    return;
  }
  const reps = capDiagFiltrees(), ico = capDiagIcones(), S = _capDiag.sel;
  const groupes = capDiagGroupes(reps);
  const fo = document.activeElement && document.activeElement.id === 'cdg-filtre';
  /** Case d'un groupe (cochée, partielle ou vide). */
  const caseG = g => { if (!_capDiag.choix) return ''; const n = g.reps.filter(r => S.has(r.uid)).length;
    return `<input type="checkbox" class="cdg-gsel" data-g="${capEsc(g.cle)}"${n && n === g.reps.length ? ' checked' : ''}${n && n < g.reps.length ? ' data-partiel="1"' : ''} title="${_L('Cocher / décocher le groupe')}">`; };
  /** Ligne d'un diagramme (dans l'arborescence : retrait selon le niveau). */
  const ligne = (r, niv) => { const lv = capDiagCouche(r.couche);
    const nom = cl === 'couche-type' || cl === 'type' ? r.nom.replace(/^\[[^\]]*\]\s*/, '') : r.nom;
    const pastille = !sy && cl === 'type' ? r.couche || '—' : r.sigle;
    return `<div class="cdg-it${r.uid === _capDiag.actif ? ' actif' : ''}${String(r.uid).startsWith('sy:') ? ' sy-vue-it' : ''}" data-uid="${capEsc(r.uid)}" title="${capEsc(r.type)} · ${capEsc(r.libelleOrigine || lv.label)}"${niv ? ` style="padding-left:${niv * 12 + 18}px"` : ''}>` +
      (_capDiag.choix ? `<input type="checkbox" class="cdg-sel" data-uid="${capEsc(r.uid)}"${S.has(r.uid) ? ' checked' : ''}>` : '') +
      `<span class="cdg-ico">${ico.get(r.uid) || ''}</span><span class="cdg-sigle" style="color:${lv.color};background:${lv.bg}">${capEsc(pastille)}</span>` +
      `<span class="cdg-nom">${capEsc(nom)}</span>` + (sy && cl !== 'origine' && cl !== 'genre-origine' && r.origine ? `<span class="cdg-cnt">${capEsc(r.libelleOrigine || '')}</span>` : '') +
      `<span class="cdg-info-b" data-info="${capEsc(r.uid)}" title="${_L('Informations du diagramme (panneau de détail)')}">ℹ</span></div>`; };
  /** En-tête d'un groupe : badge de couche, icône de genre, origine ou sigle + titre. */
  const tete = (g, niveau) => {
    if (g.kind !== undefined) return `<span class="cdg-ico">${capSyVueIco({ genre: g.kind, sysml: g.sysml }, 13)}</span><span class="cdg-gt">${capEsc(g.titre)}</span><span class="cdg-sigle">${capEsc(g.sigle)}</span>`;
    if (g.origine) return `<span class="cdg-gt">${capEsc(g.titre)}</span>`;
    const lv = capDiagCouche(g.couche);
    return niveau === 1 && cl !== 'type' && g.couche
      ? `<span class="cdg-badge" style="background:${lv.color};color:${capInk(lv.color)}">${capEsc(g.couche)}</span><span class="cdg-gt">${capEsc(g.titre)}</span>`
      : `<span class="cdg-sigle cdg-sigle-g">${capEsc(g.sigle || '')}</span><span class="cdg-gt">${capEsc(g.titre)}</span>`;
  };
  /** Bloc d'un groupe (en-tête repliable + contenu). */
  const bloc = (g, niveau) => {
    if (g.plat) return g.reps.map(r => ligne(r)).join('');
    if (g.arbo) return blocArbo(g, niveau);
    const ouvert = capDiagOuvert(g, niveau);
    return `<div class="cdg-g n${niveau}"><div class="cdg-gh" data-tog="${capEsc(g.cle)}" data-niv="${niveau}">` +
      `<span class="cdg-tog">${ouvert ? '▾' : '▸'}</span>${caseG(g)}${tete(g, niveau)}<span class="cdg-cnt">${g.reps.length}</span></div>` +
      (ouvert ? `<div class="cdg-gc">${g.enfants ? g.enfants.map(e => bloc(e, 2)).join('') : g.reps.map(r => ligne(r)).join('')}</div>` : '') + `</div>`;
  };
  /** Nœud de l'arborescence compacte : une ligne (icône, nom, type, compteur), puis ses enfants et ses diagrammes. */
  const blocArbo = (g, niveau) => {
    const ouvert = capDiagOuvert(g, niveau), hn = g.typeName ? (CAP_HUMAN_NAMES[g.typeName] || {}).h || g.typeName : '';
    return `<div class="cdg-g cdg-ga"><div class="cdg-gh cdg-an" data-tog="${capEsc(g.cle)}" data-niv="${niveau}" style="padding-left:${niveau * 12 - 6}px" title="${capEsc(hn)}">` +
      `<span class="cdg-tog">${ouvert ? '▾' : '▸'}</span>${caseG(g)}<span class="cdg-ico">${g.id ? capIco(g.id, 13) : ''}</span><span class="cdg-gt">${capEsc(g.titre)}</span>` +
      (hn ? `<span class="cdg-at">${capEsc(hn)}</span>` : '') + `<span class="cdg-cnt">${g.reps.length}</span></div>` +
      (ouvert ? `<div class="cdg-gc">${g.enfants.map(e => blocArbo(e, niveau + 1)).join('')}${g.diags.map(r => ligne(r, niveau)).join('')}</div>` : '') + `</div>`;
  };
  const nSelVis = reps.filter(r => S.has(r.uid)).length;
  const opts = sy
    ? [['genre-origine', _L('Genre › origine')], ['genre', _L('Genre de diagramme')], ['origine', _L('Origine')], ['nom', _L('Nom (A → Z)')], ['arbo', _L('🌳 Arborescence')]]
    : [['couche-type', _L('Couche › type')], ['couche', _L('Couche')], ['type', _L('Type de diagramme')], ['nom', _L('Nom (A → Z)')], ['arbo', _L('🌳 Arborescence')]];
  const opt = ([v, l]) => `<option value="${v}"${cl === v ? ' selected' : ''}>${l}</option>`;
  const ancien = box.querySelector('.cdg-arbre'), defil = ancien ? ancien.scrollTop : 0;   // défilement gardé (déplier un nœud ne renvoie plus en haut)
  box.innerHTML = `<div class="cdg-outils">` +
    `<input id="cdg-filtre" type="search" placeholder="${sy ? _L('Filtrer (nom, genre, sigle, origine)…') : _L('Filtrer (nom, type, sigle, couche)…')}" value="${capEsc(_capDiag.filtre)}" autocomplete="off">` +
    `<div class="cdg-ligne"><select id="cdg-classement" title="${_L('Classement de la liste')}">${opts.map(opt).join('')}</select>` +
    `<button class="cap-lf-btn" data-tout="1" title="${_L('Tout déplier')}">⊞</button><button class="cap-lf-btn" data-tout="0" title="${_L('Tout replier')}">⊟</button></div>` +
    (!_capDiag.choix ? `<div class="cdg-ligne cdg-tous">${S.size ? _L(`${S.size} sélectionné(s) pour l'export`) : _L(`${reps.length} diagramme(s)`)}</div>` :
    `<label class="cdg-ligne cdg-tous"><input type="checkbox" id="cdg-tous"${nSelVis && nSelVis === reps.length ? ' checked' : ''}${nSelVis && nSelVis < reps.length ? ' data-partiel="1"' : ''}> ` +
    `<span>${S.size ? _L(`${S.size} sélectionné(s) pour l'export`) : _L(`${reps.length} diagramme(s) — cochez pour exporter`)}</span></label>`) + `</div>` +
    `<div class="cdg-arbre">${reps.length ? groupes.map(g => bloc(g, 1)).join('') : `<div class="cdg-aide">${_L('Aucun diagramme ne correspond.')}</div>`}</div>`;
  box.querySelectorAll('input[data-partiel]').forEach(c => { c.indeterminate = true; });
  if (defil) { const a = box.querySelector('.cdg-arbre'); if (a) a.scrollTop = defil; }
  if (fo) { const f = document.getElementById('cdg-filtre'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
}

/** Met en évidence le diagramme ouvert dans la liste. */
function capDiagMarquerActif() {
  document.querySelectorAll('#cdg-gauche .cdg-it').forEach(e => e.classList.toggle('actif', e.dataset.uid === _capDiag.actif));
}

/**
 * Représentations d'un groupe de la liste (selon la clé).
 * @param {string} cle - Clé du groupe
 * @returns {object[]} représentations filtrées du groupe
 */
function capDiagRepsGroupe(cle) {
  const tous = []; const parcourir = gs => gs.forEach(g => { if (g.cle === cle) tous.push(...g.reps); if (g.enfants) parcourir(g.enfants); });
  parcourir(capDiagGroupes(capDiagFiltrees()));
  return tous;
}

/** Clics de la vue : barre (ouvrir, export, sélection), carte, groupes repliables, diagrammes. @param {MouseEvent} e */
function capDiagClic(e) {
  const t = e.target;
  if (t.closest('#cdg-ouvrir')) { capDiagPickAird(); return; }
  if (t.closest('#cdg-export')) { capDiagExportDialog(); return; }
  if (t.closest('#cdg-comparer')) { capDgwOuvrir(_capDiag.actif); return; }   // ⧉ fenêtre de comparaison (83)
  if (t.closest('#cdg-choix')) { _capDiag.choix = !_capDiag.choix; capDiagBarre(); capDiagListe(); return; }
  if (t.closest('#cdg-mode-vis,#cdg-mode-txt')) { _capDiag.texte = !!t.closest('#cdg-mode-txt'); capDiagTexteMaj(); return; }   // 🖼 / ≡ (Capella)
  if (t.closest('#cdg-tx-moins,#cdg-tx-plus')) { _capDiag.texteZoom = Math.min(3, Math.max(0.5, _capDiag.texteZoom * (t.closest('#cdg-tx-plus') ? 1.15 : 1 / 1.15))); capDiagTexteMaj(); return; }
  const ca = t.closest('[data-carte]');
  if (ca) { _capDiag.carte = ca.dataset.carte; capDiagCarteMaj(); return; }
  if (t.closest('[data-carte-tog]')) { _capDiag.carteReduite = !_capDiag.carteReduite; capDiagCarteMaj(); return; }
  if (t.matches('input[type=checkbox]')) return;   // traité par capDiagChange
  const tout = t.closest('[data-tout]');
  if (tout) {
    const ouvrir = tout.dataset.tout === '1'; const B = _capDiag.bascule, cl = capDiagClassement();
    [...B].filter(k => k.startsWith(cl + '|')).forEach(k => B.delete(k));
    const parcourir = (gs, niv) => gs.forEach(g => { if (g.plat) return; if (ouvrir !== capDiagDefautOuvert(g, niv)) B.add(cl + '|' + g.cle); if (g.enfants) parcourir(g.enfants, niv + 1); });
    parcourir(capDiagGroupes(capDiagReps()), 1);
    capDiagListe(); return;
  }
  const gh = t.closest('[data-tog]');
  if (gh) { const k = capDiagClassement() + '|' + gh.dataset.tog; if (_capDiag.bascule.has(k)) _capDiag.bascule.delete(k); else _capDiag.bascule.add(k); capDiagListe(); return; }
  const inf = t.closest('[data-info]');
  if (inf) { capDiagInfo(inf.dataset.info); return; }
  if (t.closest('#cdg-infos')) { if (_capDiag.actif) capDiagInfo(_capDiag.actif); return; }
  const it = t.closest('.cdg-it');
  if (it) capDiagOuvrirUid(it.dataset.uid);
}

/**
 * Ouvre un diagramme ou une vue dans la vue 🔲 déjà affichée : visionneuse (Capella) ou partie droite des lecteurs (87).
 * @param {string} uid - Représentation
 * @param {string} [id] - Élément à mettre en évidence
 */
function capDiagOuvrirUid(uid, id) {
  _capDiag.actif = uid; capDiagMarquerActif();
  if (String(uid).startsWith('sy:')) { if (typeof capSyVueOuvrir === 'function') capSyVueOuvrir(uid.slice(3), id); return; }
  if (_capDiag.vis) { _capDiag.vis.ouvrir(uid, id); capDiagCarte(); }
}

/** Cases à cocher (diagramme, groupe, tout) et choix du classement. @param {Event} e */
function capDiagChange(e) {
  const t = e.target, S = _capDiag.sel;
  if (t.id === 'cdg-classement') { capDiagClassement(t.value); capDiagListe(); return; }
  if (t.classList.contains('cdg-sel')) { if (t.checked) S.add(t.dataset.uid); else S.delete(t.dataset.uid); }
  else if (t.classList.contains('cdg-gsel')) capDiagRepsGroupe(t.dataset.g).forEach(r => { if (t.checked) S.add(r.uid); else S.delete(r.uid); });
  else if (t.id === 'cdg-tous') capDiagFiltrees().forEach(r => { if (t.checked) S.add(r.uid); else S.delete(r.uid); });
  else return;
  capDiagListe(); capDiagBarre();
}

/**
 * Ouvre un diagramme dans la vue 🔲 Diagrammes Capella et y met un élément en évidence.
 * @param {string} uid - identifiant de la représentation (.aird)
 * @param {string} [id] - élément du modèle à centrer
 */
function capDiagOpen(uid, id) {
  capNavOpen('diag');
  capDiagOuvrirUid(uid, id);
}

/**
 * Panneau de détail d'un diagramme (comme pour un élément du modèle), même fiche pour tous les formats : type, couche ou famille,
 * origine, nature, identifiant, dernière modification, fichier, description, élément représenté (ou porteur), éléments affichés
 * groupés par type (cliquables). Le diagramme est ouvert s'il ne l'est pas, pour lire ses éléments.
 * @param {string} uid - Représentation
 */
async function capDiagInfo(uid) {
  const r = capDiagReps().find(x => x.uid === uid); if (!r) return;
  const sy = capDiagSy(), esc = capEsc;
  if (_capDiag.actif !== uid) { capDiagOpen(uid); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); }
  const lv = capDiagCouche(r.couche), m = capDiagMeta(uid), v = sy ? capSyVue(r.cle) : null;
  const ids = sy ? (v ? [...new Set([...(v.svg.match(/data-sem="[^"]+"/g) || []).map(a => a.slice(10, -1)), ...(v.formes || []).map(f => f.element).filter(Boolean)])] : [])
    : (r.genre === 'tableau' ? [] : [...new Set([...document.querySelectorAll('#vd-svg [data-sem]')].map(e => e.getAttribute('data-sem')))]);
  const els = ids.map(id => capGetElementById_(id)).filter(Boolean);
  const lien = e => { const c = capDiagCouche(e.layer);
    return `<span class="cap-det-link cdg-det-el" onclick="capOpenDetail('${esc(e.id)}')">${capIco(e.id, 13)}<span style="color:${c.color};font-size:9px;font-weight:700">${esc(e.typeName)}</span><span>${esc(e.attrs.name || e.id.slice(0, 12))}</span></span>`; };
  const titre = (t, c) => `<div class="cdg-det-t" style="color:${c || 'var(--c-dim)'}">${t}</div>`;
  const ligne = (k, v) => v ? `<tr><td class="cdg-det-k">${esc(k)}</td><td class="cdg-det-v">${esc(v)}</td></tr>` : '';
  const genres = { diagramme: _L('Diagramme'), sequence: _L('Diagramme de séquence'), tableau: _L('Tableau') };
  const kicker = !sy ? _L('🔲 Diagramme Capella') : r.origine && r.origine !== 'calculee' ? _L(`🔲 Diagramme ${r.libelleOrigine}`) : _L(`🔲 Vue calculée ${capSyNomFormat()}`);
  let h = `<span class="cap-type-badge" style="color:${lv.color};background:${lv.bg};display:inline-block;margin-bottom:6px">${esc(r.sigle)} · ${esc(r.type)}</span>` +
    `<div style="font-size:11px;color:var(--c-accent);font-weight:600;margin-bottom:2px;">${kicker}</div>` +
    `<h3 style="font-size:14px;font-weight:600;margin-bottom:10px;word-break:break-word">${esc(r.nom)}</h3>` +
    `<button class="cap-lf-btn" onclick="capDiagOpen('${esc(uid)}')">${_L('🔲 Afficher le diagramme')}</button>`;
  h += titre(_L('Attributs')) + `<table class="cdg-det-tab">` + ligne(_L('Type'), r.type) + ligne(_L('Sigle'), r.sigle) +
    (sy ? ligne(_L('Origine'), r.libelleOrigine) + ligne(_L('Famille'), r.couche ? `${r.couche} — ${lv.label}` : '') : ligne(_L('Couche'), `${r.couche || '—'} — ${lv.label}`)) +
    ligne(_L('Nature'), genres[r.genre] || r.genre) +
    (v ? ligne(_L('Contenu'), _L(`${v.formes.length} forme(s) · ${v.liens.length} lien(s)`)) : '') +
    ligne(_L('Éléments'), r.genre === 'tableau' ? '' : String(els.length)) +
    ligne(_L('Modifié le'), m.modif ? m.modif.toLocaleString('fr-FR') : '') + ligne(_L('Fichier'), capDiagNomSource()) + ligne(sy ? _L('Clé') : 'uid', sy ? r.cle : uid) + `</table>`;
  if (m.desc) h += titre('Description') + `<div class="cdg-det-desc">${esc(m.desc)}</div>`;
  if (m.cible) { const e = capGetElementById_(m.cible.id); if (e) h += titre(sy ? _L('Élément porteur') : _L('Élément représenté'), '#a78bfa') + `<div>${lien(e)}</div>`; }
  if (els.length) {
    const parType = {}; els.forEach(e => { (parType[e.typeName] = parType[e.typeName] || []).push(e); });
    h += titre(_L(`Éléments affichés (${els.length})`), '#58a6ff') + Object.entries(parType).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([t, l]) => `<div style="margin-bottom:6px"><span class="cdg-det-k">${esc((CAP_HUMAN_NAMES[t] || {}).h || t)} (${l.length})</span><div style="margin-top:2px">` +
        l.sort((a, b) => String(a.attrs.name || '').localeCompare(String(b.attrs.name || ''))).slice(0, 200).map(lien).join('') + `</div></div>`).join('');
  }
  const box = document.getElementById('cap-detail-content'), det = document.getElementById('cap-detail');
  if (box) box.innerHTML = h;
  if (det) det.style.display = 'flex';
}

/**
 * Section « Diagrammes » du panneau de détail, même format pour tous les formats : diagrammes dont l'élément est la cible, diagrammes où
 * il est dessiné (`capDiagDe`), puis, pour les lecteurs, les vues calculées proposées sur lui (`vuesPour`) ; clic → diagramme centré sur l'élément.
 * @param {string} id - identifiant de l'élément
 * @param {function(string, string):string} secTitle - titre de section du panneau
 * @returns {string} HTML ('' sans diagramme)
 */
function capDiagDetail(id, secTitle) {
  const { cibles, presences } = capDiagDe(id);
  const vus = new Set(), liste = [...cibles, ...presences.sort((a, b) => a.nom.localeCompare(b.nom))].filter(r => !vus.has(r.uid) && vus.add(r.uid));
  if (capDiagSy() && typeof capSyVuesPour === 'function') capSyVuesPour(id).forEach(v => { const r = capSyVueRep(v); if (!vus.has(r.uid)) { vus.add(r.uid); liste.push(r); } });
  if (!liste.length) return '';
  const ico = capDiagIcones();
  const lien = r => `<div class="cap-det-link cdg-lien" onclick="capDiagOpen('${capEsc(r.uid)}','${capEsc(id)}')" title="${capEsc(r.type)}${r.libelleOrigine ? ' · ' + capEsc(r.libelleOrigine) : ''}">` +
    `<span class="cdg-ico">${ico.get(r.uid) || (r.kind ? capSyVueIco({ genre: r.kind, sysml: r.sysml }, 14) : '')}</span><span class="cdg-sigle">${capEsc(r.sigle)}</span>${capEsc(r.nom || r.type)}</div>`;
  return secTitle(_L(`Diagrammes (${liste.length})`), '#58a6ff') + liste.slice(0, 60).map(lien).join('');
}

/* ── Export groupé en planches ─────────────────────────────────────────── */

/**
 * SVG autonome d'un diagramme, tel que l'exporte la visionneuse (menu ⬇ Exporter › SVG) :
 * le diagramme est ouvert puis son export est intercepté (aucun téléchargement).
 * @param {string} uid - Représentation
 * @returns {Promise<string>} code SVG
 */
async function capDiagSvg(uid) {
  if (String(uid).startsWith('sy:')) {   // vue d'un lecteur : document SVG autonome, fond clair (planches, ⧉ comparaison, 📑 dossiers)
    const v = typeof capSyVue === 'function' ? capSyVue(uid.slice(3)) : null;
    if (!v) throw new Error(_L('vue introuvable'));
    return v.svgDocument({ theme: 'clair' }).replace(/^\s*<\?xml[^>]*>\s*/, '');
  }
  _capDiag.export = true;
  _capDiag.vis.ouvrir(uid);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bt = document.getElementById('vd-export-bt'), menu = document.getElementById('vd-export');
  let blob = null;
  const oCreer = URL.createObjectURL, oClic = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = b => { blob = b; return 'about:blank'; };
  HTMLAnchorElement.prototype.click = function () {};
  try {
    if (bt && menu && menu.hidden) bt.click();
    const it = document.querySelector('#cdg-hote [data-export="svg"]');
    if (!it) throw new Error(_L('export SVG de la visionneuse introuvable'));
    it.click();
  } finally {
    URL.createObjectURL = oCreer; HTMLAnchorElement.prototype.click = oClic;
    setTimeout(() => { _capDiag.export = false; }, 0);
    if (menu && !menu.hidden && bt) bt.click();
  }
  if (!blob) throw new Error(_L('diagramme vide ou non exportable'));
  return (await blob.text()).replace(/^\s*<\?xml[^>]*>\s*/, '');
}

/**
 * Planche d'un diagramme : cadre, en-tête (couche, sigle, nom, type), diagramme centré, cartouche technique
 * en bas à droite (projet, diagramme, type, couche, contenu, sources, date, planche) et signature Arcalyse.
 * Les décors suivent la taille du diagramme pour rester lisibles une fois la planche réduite à la page.
 * @param {object} rep - Représentation {uid, nom, type, sigle, couche}
 * @param {string} svg - SVG du diagramme (capDiagSvg)
 * @param {object} [o] - {cadre, cartouche, planche:'n / N'}
 * @returns {{svg:string, w:number, h:number}} planche
 */
function capDiagPlanche(rep, svg, o) {
  o = Object.assign({}, _capDiag.exportOpts, o || {});
  const tag = (svg.match(/^<svg[^>]*>/) || [''])[0];
  const att = k => { const m = tag.match(new RegExp('\\s' + k + '="([\\d.]+)')); return m ? +m[1] : 0; };
  let iw = att('width'), ih = att('height');
  if (!iw || !ih) { const vb = tag.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/); iw = vb ? +vb[1] : 800; ih = vb ? +vb[2] : 600; }
  if (!o.cadre && !o.cartouche) return { svg, w: iw, h: ih };
  const u = Math.max(1, Math.max(iw, ih * 1.414) / 1400);   // échelle des décors
  const F = 'Segoe UI,Arial,sans-serif', lv = capDiagCouche(rep.couche), esc = capEsc;
  const projet = (cap_xmlDoc && cap_xmlDoc.documentElement && cap_xmlDoc.documentElement.getAttribute('name')) || _L('Projet Capella');
  const nbElem = new Set((svg.match(/data-sem="[^"]+"/g) || [])).size;
  const M = 14 * u, P = 16 * u;
  const nom = rep.nom.replace(/^\[[^\]]*\]\s*/, '');
  const hH = o.cadre ? 44 * u : 0;
  // Cartouche : 2 paires de colonnes (clé | valeur)
  const lignes = [
    [_L('Projet'), projet, _L('Couche'), `${rep.couche || '—'} — ${lv.label}`],
    [_L('Diagramme'), nom, _L('Contenu'), _L(`${nbElem} élément(s)`)],
    ['Type', `${rep.sigle} — ${rep.type}`, _L('Date'), new Date().toLocaleDateString('fr-FR')],
    [_L('Sources'), [...new Set([capCurrentFileName, capDiagNomSource()])].filter(Boolean).join(' · '), _L('Planche'), o.planche || '—'],
  ];
  const kw = 62, vw1 = 250, vw2 = 200, rh = 17, th = 19;
  const cw = (kw * 2 + vw1 + vw2) * u, ch = o.cartouche ? (th + lignes.length * rh) * u : 0;
  const W = Math.max(iw + 2 * (M + P), o.cartouche ? cw + 280 * u : 0, o.cadre ? capTextW(rep.nom, 17) * u + 260 * u : 0);
  // Description Capella du diagramme et élément représenté, sous l'en-tête (6 lignes au plus)
  const meta = o.desc ? capDiagMeta(rep.uid) : null;
  const dl = meta && meta.desc ? capWrapLines(meta.desc, Math.max(60, Math.floor((W / u - 2 * (M + P) / u) / 6.1)), 6) : [];
  const ctx = meta && meta.cible ? meta.cible : null;
  const dH = dl.length || ctx ? ((dl.length + (ctx ? 1 : 0)) * 15 + 10) * u : 0;
  const H = M + hH + dH + P + ih + P + (ch ? ch + 8 * u : 22 * u) + M;
  let s = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  const x0 = M, y0 = M, fw = W - 2 * M, fh = H - 2 * M;
  const sw = capTextW(rep.sigle, 11) * 1.25 + 14;   // largeur de la pastille du sigle (gras)
  if (o.cadre) {
    s += `<rect x="${x0}" y="${y0}" width="${fw}" height="${fh}" fill="none" stroke="#2b2f36" stroke-width="${1.3 * u}"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${fw}" height="${hH}" fill="#f5f7fa"/>`;
    s += `<rect x="${x0}" y="${y0 + hH - 3 * u}" width="${fw}" height="${3 * u}" fill="${lv.color}"/>`;
    s += `<g transform="translate(${x0},${y0}) scale(${u})" font-family="${F}">` +
      `<rect x="10" y="10" width="44" height="22" rx="4" fill="${lv.color}"/><text x="32" y="25.5" font-size="12" font-weight="700" text-anchor="middle" fill="${capInk(lv.color)}">${esc(rep.couche || '—')}</text>` +
      `<rect x="60" y="10" width="${sw}" height="22" rx="4" fill="#fff" stroke="${lv.color}" stroke-width="1.4"/><text x="${60 + sw / 2}" y="25" font-size="11" font-weight="700" text-anchor="middle" fill="#24292f">${esc(rep.sigle)}</text>` +
      `<text x="${72 + sw}" y="27" font-size="17" font-weight="700" fill="#111">${esc(nom)}</text>` +
      `<text x="${fw / u - 12}" y="20" font-size="10.5" text-anchor="end" fill="#57606a">${esc(rep.type)}</text>` +
      `<text x="${fw / u - 12}" y="34" font-size="10.5" text-anchor="end" fill="#57606a">${esc(lv.label)}</text></g>`;
  }
  if (dH) {
    let t = '', y = 18;
    if (ctx) { t += `<text x="0" y="${y}" font-size="10.5" fill="#57606a">${esc(_L('Élément représenté'))} : <tspan font-weight="700" fill="#24292f">${esc(ctx.nom)}</tspan> (${esc(ctx.type)})</text>`; y += 15; }
    dl.forEach(l => { t += `<text x="0" y="${y}" font-size="11" font-style="italic" fill="#333">${esc(l)}</text>`; y += 15; });
    s += `<g transform="translate(${M + P},${M + hH}) scale(${u})" font-family="${F}">${t}</g>`;
  }
  s += svg.replace(/^<svg /, `<svg x="${(W - iw) / 2}" y="${M + hH + dH + P}" `);
  const yb = H - M - (ch ? ch : 22 * u);
  s += `<g transform="translate(${x0 + 10 * u},${H - M - 9 * u}) scale(${u})" font-family="${F}"><text font-size="9.5" fill="#8c959f">` +
    esc(_L(`Arcalyse · planche générée le ${new Date().toLocaleDateString('fr-FR')}`)) + `</text></g>`;
  if (o.cartouche) {
    const cx = W - M - cw, cy = yb;
    let c = `<rect width="${cw / u}" height="${ch / u}" fill="#fbfcfd" stroke="#2b2f36" stroke-width="1"/>` +
      `<rect width="${cw / u}" height="${th}" fill="${lv.color}"/><text x="8" y="13.5" font-size="10.5" font-weight="700" fill="${capInk(lv.color)}">${esc(_L('CARTOUCHE'))} · ${esc(projet)}</text>` +
      `<text x="${cw / u - 8}" y="13.5" font-size="10" text-anchor="end" fill="${capInk(lv.color)}">ARCALYSE</text>`;
    const cols = [0, kw, kw + vw1, kw * 2 + vw1], larg = [kw, vw1, kw, vw2];
    lignes.forEach((l, i) => {
      const y = th + i * rh;
      if (i) c += `<line x1="0" y1="${y}" x2="${cw / u}" y2="${y}" stroke="#d0d7de" stroke-width=".7"/>`;
      l.forEach((v, j) => {
        let t = String(v); const max = Math.floor((larg[j] - 10) / ((j % 2 ? 10 : 9) * 0.56)); if (t.length > max) t = t.slice(0, max - 1) + '…';
        c += `<text x="${cols[j] + 5}" y="${y + 12}" font-size="${j % 2 ? 10 : 9}"${j % 2 ? '' : ' font-weight="700"'} fill="${j % 2 ? '#111' : '#57606a'}"${i === 1 && j === 1 ? ' font-weight="700"' : ''}>${esc(t)}</text>`;
      });
    });
    [kw, kw + vw1, kw * 2 + vw1].forEach((x, j) => { c += `<line x1="${x}" y1="${th}" x2="${x}" y2="${ch / u}" stroke="${j === 1 ? '#2b2f36' : '#d0d7de'}" stroke-width="${j === 1 ? 1 : .7}"/>`; });
    s += `<g transform="translate(${cx},${cy}) scale(${u})" font-family="${F}">${c}</g>`;
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`, w: W, h: H };
}

/**
 * Texte brut d'une description Capella (attribut XML contenant du HTML).
 * @param {string} s - Valeur brute de l'attribut (entités XML)
 * @returns {string} texte sur une ligne
 */
function capDiagTexte(s) {
  if (!s) return '';
  const t = document.createElement('textarea'); t.innerHTML = s;
  const d = new DOMParser().parseFromString(t.value.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, ' '), 'text/html');
  return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Documentation HTML d'un diagramme telle qu'écrite dans Capella (entités de l'attribut XML décodées, non filtrée).
 * @param {string} s - Valeur brute de l'attribut documentation
 * @returns {string} HTML (à passer par capSafeHtml avant affichage)
 */
function capDiagDocHtml(s) {
  if (!s) return '';
  const t = document.createElement('textarea'); t.innerHTML = s;
  return t.value;
}

/**
 * Description et élément représenté d'un diagramme, lus dans le .aird (DRepresentationDescriptor : documentation, target).
 * @param {string} uid - Représentation
 * @returns {{desc:string, html:string, modif:?Date, cible:?{id:string,nom:string,type:string}}} métadonnées (html : documentation HTML d'origine, à filtrer avant affichage ; modif : changeId du descripteur, s'il est une date)
 */
function capDiagMeta(uid) {
  if (String(uid).startsWith('sy:')) {   // vue d'un lecteur : description = documentation de l'élément porteur
    const r = capDiagReps().find(x => x.uid === uid), e = r && r.element ? capGetElementById_(r.element) : null, doc = e && e.attrs.description ? e.attrs.description : '';
    return { desc: capDiagTexte(doc), html: capDiagDocHtml(doc), modif: null, cible: e ? { id: e.id, nom: e.attrs.name || e.id, type: (CAP_HUMAN_NAMES[e.typeName] || {}).h || e.typeName } : null };
  }
  if (!_capDiag.meta) {
    const m = new Map(), re = /<ownedRepresentationDescriptors\b((?:[^>"]|"[^"]*")*?)(\/>|>([\s\S]*?)<\/ownedRepresentationDescriptors>)/g;
    const att = (a, k) => { const r = a.match(new RegExp('\\s' + k + '="([^"]*)"')); return r ? r[1] : ''; };
    let x;
    while ((x = re.exec(_capDiag.texteAird))) {
      const u = att(x[1], 'uid'); if (!u) continue;
      m.set(u, { doc: att(x[1], 'documentation'), modif: +att(x[1], 'changeId') || 0, cible: ((x[3] || '').match(/<target\b[^>]*href="[^"#]*#([^"]+)"/) || [])[1] || '' });
    }
    _capDiag.meta = m;
  }
  const r = _capDiag.meta.get(uid) || { doc: '', cible: '' }, e = r.cible && capGetElementById_(r.cible);
  return { desc: capDiagTexte(r.doc), html: capDiagDocHtml(r.doc), modif: r.modif > 1e12 && r.modif < 4e12 ? new Date(r.modif) : null, cible: e ? { id: e.id, nom: e.attrs.name || e.id, type: (CAP_HUMAN_NAMES[e.typeName] || {}).h || e.typeName } : null };
}

/**
 * Annexe d'un diagramme : éléments du modèle représentés (attributs data-sem du SVG), triés par couche, type et nom.
 * @param {string} svg - SVG du diagramme
 * @returns {{id:string, nom:string, type:string, couche:string}[]} lignes
 */
function capDiagElements(svg) {
  const ids = new Set((svg.match(/data-sem="[^"]+"/g) || []).map(a => a.slice(10, -1)));
  return [...ids].map(id => { const e = capGetElementById_(id);
    return e ? { id, nom: e.attrs.name || '', type: (CAP_HUMAN_NAMES[e.typeName] || {}).h || e.typeName, couche: e.layer || '' } : null; })
    .filter(Boolean).sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.type.localeCompare(b.type) || a.nom.localeCompare(b.nom));
}

/**
 * Annexe au format CSV (séparateur ;, BOM) : en-tête du diagramme, description, puis éléments représentés.
 * @param {object} rep - Représentation
 * @param {object[]} lignes - capDiagElements
 * @returns {string} texte CSV
 */
function capDiagAnnexeCsv(rep, lignes) {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', l = a => a.map(q).join(';'), m = capDiagMeta(rep.uid);
  return '\uFEFF' + [l([rep.nom, rep.type, rep.couche]), l([_L('Élément représenté'), m.cible ? m.cible.nom : '']), l(['Description', m.desc]), '',
    l(['N°', _L('Élément'), 'Type', _L('Couche'), 'ID']), ...lignes.map((r, i) => l([i + 1, r.nom, r.type, r.couche, r.id]))].join('\n');
}

/** Lignes d'annexe par page PDF. */
const CAP_DIAG_ANX = 34;

/**
 * Pages d'annexe du PDF (A4 paysage) : tableau des éléments représentés.
 * @param {object} rep - Représentation
 * @param {object[]} lignes - capDiagElements
 * @param {string[]} etiquettes - Numéro de chaque page (« n / N »)
 * @returns {HTMLCanvasElement[]} pages
 */
function capDiagAnnexePages(rep, lignes, etiquettes) {
  const W = 1754, H = 1240, out = [], lv = capDiagCouche(rep.couche), n = Math.max(1, Math.ceil(lignes.length / CAP_DIAG_ANX));
  const cols = [[80, 'N°', 70], [150, _L('Élément'), 700], [870, 'Type', 430], [1320, _L('Couche'), 120], [1450, 'ID', 230]];
  for (let k = 0; k < n; k++) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2b2f36'; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60);
    x.fillStyle = '#f5f7fa'; x.fillRect(32, 32, W - 64, 88); x.fillStyle = lv.color; x.fillRect(32, 117, W - 64, 5);
    x.fillStyle = lv.color; x.fillRect(60, 56, 70, 36); x.fillStyle = capInk(lv.color); x.font = '700 20px Segoe UI, Arial, sans-serif'; x.fillText(rep.couche || '—', 72, 82);
    x.fillStyle = '#111'; x.font = '700 28px Segoe UI, Arial, sans-serif';
    x.fillText(`[${rep.sigle}] ${rep.nom.replace(/^\[[^\]]*\]\s*/, '')} — ${_L('annexe')}${n > 1 ? ` ${k + 1}/${n}` : ''}`, 150, 84);
    x.textAlign = 'right'; x.font = '20px Segoe UI, Arial, sans-serif'; x.fillStyle = '#57606a';
    x.fillText(_L(`${lignes.length} élément(s) représenté(s)`) + (etiquettes[k] ? ` · ${_L('Planche')} ${etiquettes[k]}` : ''), W - 70, 84); x.textAlign = 'left';
    x.font = '700 18px Segoe UI, Arial, sans-serif'; x.fillStyle = '#57606a';
    cols.forEach(([cx, t]) => x.fillText(t, cx, 165));
    x.fillStyle = '#2b2f36'; x.fillRect(70, 175, W - 140, 2);
    x.font = '18px Segoe UI, Arial, sans-serif';
    lignes.slice(k * CAP_DIAG_ANX, (k + 1) * CAP_DIAG_ANX).forEach((r, i) => {
      const y = 205 + i * 29, num = k * CAP_DIAG_ANX + i + 1;
      if (i % 2) { x.fillStyle = '#f6f8fa'; x.fillRect(70, y - 21, W - 140, 29); }
      [num, r.nom, r.type, r.couche, r.id].forEach((v, j) => {
        let t = String(v); x.fillStyle = j === 4 ? '#8c959f' : '#111';
        while (x.measureText(t).width > cols[j][2] - 12 && t.length > 3) t = t.slice(0, -2) + '…';
        x.fillText(t, cols[j][0], y);
      });
    });
    out.push(c);
  }
  return out;
}

/**
 * Diagrammes visés par l'export, dans l'ordre de la liste (couche, type, nom).
 * @param {string} portee - 'sel' (cochés), 'vis' (affichés par le filtre) ou 'tous'
 * @returns {object[]} représentations
 */
function capDiagCibles(portee) {
  const reps = portee === 'tous' ? capDiagReps() : capDiagFiltrees();
  const l = (portee === 'sel' ? reps.filter(r => _capDiag.sel.has(r.uid)) : reps).filter(r => r.genre !== 'tableau');   // tableaux : pas de planche
  return l.slice().sort((a, b) => capDiagRang(a.couche) - capDiagRang(b.couche) || a.sigle.localeCompare(b.sigle) || a.nom.localeCompare(b.nom));
}

/** Fenêtre « Exporter des diagrammes » : portée, mise en page, aperçu de la planche, formats. */
function capDiagExportDialog() {
  let ov = document.getElementById('cdg-export-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'cdg-export-ov'; document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.style.display = 'none'; }); }
  const o = _capDiag.exportOpts;
  if (o.portee === 'sel' && !_capDiag.sel.size) o.portee = 'vis';
  const nb = { sel: capDiagCibles('sel').length, vis: capDiagCibles('vis').length, tous: capDiagReps().length };
  const rad = (v, l) => `<label class="cdg-x-opt"><input type="radio" name="cdg-portee" value="${v}"${o.portee === v ? ' checked' : ''}${nb[v] ? '' : ' disabled'}> ${l} <b>${nb[v]}</b></label>`;
  const chk = (k, l, t) => `<label class="cdg-x-opt" title="${t}"><input type="checkbox" data-xo="${k}"${o[k] ? ' checked' : ''}> ${l}</label>`;
  ov.innerHTML = `<div class="cw-d-box" style="max-width:980px">
    <div class="cw-d-hdr"><b>${_L('⬇ Exporter des diagrammes')}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body cdg-x-corps"><div class="cdg-x-gauche">
      <div class="cdg-x-tit">${_L('Diagrammes')}</div>
      ${rad('sel', _L('Cochés dans la liste'))}${rad('vis', _L('Affichés (filtre en cours)'))}${rad('tous', _L('Tous'))}
      <div class="cdg-x-tit">${_L('Mise en page')}</div>
      ${chk('cadre', _L('Cadre et en-tête'), _L('Cadre, bandeau de couche, sigle, nom et type du diagramme'))}
      ${chk('cartouche', _L('Cartouche'), _L('Cartouche technique en bas à droite : projet, diagramme, type, couche, contenu, sources, date, planche'))}
      ${chk('desc', _L('Description'), _L('Description Capella du diagramme et élément représenté, sous l\'en-tête'))}
      ${chk('annexe', _L('Annexes'), _L('Éléments représentés dans chaque diagramme : PDF, page(s) d\'annexe après la planche · ZIP, un CSV par diagramme · HTML, tableau repliable'))}
      ${chk('sommaire', _L('Sommaire'), _L('PDF : page de sommaire par couche et type · HTML : onglet Sommaire'))}
      <label class="cdg-x-opt" title="${_L('Résolution des images PNG / PDF')}">${_L('Résolution')} <select id="cdg-x-scale">${[1, 2, 3].map(v => `<option value="${v}"${o.scale === v ? ' selected' : ''}>×${v}</option>`).join('')}</select></label>
      <div class="cdg-x-tit">${_L('Format')}</div>
      <div class="cdg-x-fmts">
        <button class="cap-lf-btn${o.fmt === 'pdf' ? ' active' : ''}" data-fmt="pdf" title="${_L('Un PDF : sommaire, une planche par diagramme (A4 orientée automatiquement), signets')}">📄 PDF</button>
        <button class="cap-lf-btn${o.fmt === 'zip-png' ? ' active' : ''}" data-fmt="zip-png" title="${_L('Archive ZIP des planches en PNG, un dossier par couche')}">🗜 ZIP PNG</button>
        <button class="cap-lf-btn${o.fmt === 'zip-svg' ? ' active' : ''}" data-fmt="zip-svg" title="${_L('Archive ZIP des planches en SVG (vectoriel), un dossier par couche')}">🗜 ZIP SVG</button>
        <button class="cap-lf-btn${o.fmt === 'html' ? ' active' : ''}" data-fmt="html" title="${_L('Rapport HTML autonome : sommaire et planches classées par couche et type, repliables')}">🌐 HTML</button>
      </div>
      <div id="cdg-x-statut" class="cdg-info"></div>
    </div><div class="cdg-x-droite"><div class="cdg-x-tit">${_L('Aperçu de la planche')}</div><div id="cdg-x-apercu" class="cdg-x-apercu"></div></div></div>
    <div class="cw-d-ftr"><span style="flex:1"></span><button class="cap-lf-btn" data-c="x">${_L('Fermer')}</button>` +
    `<button class="phl-export-btn" id="cdg-x-go" title="${_L('Lancer l\'export dans le format choisi')}">${_L('⬇ Exporter')}</button></div></div>`;
  ov.style.display = 'flex';
  ov.querySelectorAll('[data-c="x"]').forEach(b => b.onclick = () => { ov.style.display = 'none'; });
  ov.querySelectorAll('[name="cdg-portee"]').forEach(r => r.onchange = () => { o.portee = r.value; capDiagApercu(); });
  ov.querySelectorAll('[data-xo]').forEach(c => c.onchange = () => { o[c.dataset.xo] = c.checked; capDiagApercu(); });
  ov.querySelector('#cdg-x-scale').onchange = e => { o.scale = +e.target.value; };
  ov.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => {
    o.fmt = b.dataset.fmt; ov.querySelectorAll('[data-fmt]').forEach(x => x.classList.toggle('active', x === b));
  });
  ov.querySelector('#cdg-x-go').onclick = () => capDiagExport(o.fmt);
  capDiagApercu();
}

/** Aperçu de la planche du premier diagramme visé (diagramme ouvert s'il en fait partie). */
async function capDiagApercu() {
  const box = document.getElementById('cdg-x-apercu'); if (!box) return;
  const l = capDiagCibles(_capDiag.exportOpts.portee);
  const rep = l.find(r => r.uid === _capDiag.actif) || l[0];
  if (!rep) { box.innerHTML = `<div class="cdg-aide">${_L('Aucun diagramme.')}</div>`; return; }
  const retour = _capDiag.actif;
  try {
    const p = capDiagPlanche(rep, await capDiagSvg(rep.uid), { planche: `1 / ${l.length}` });
    box.innerHTML = `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg)}">`;
  } catch (e) { box.innerHTML = `<div class="cdg-aide">⚠ ${capEsc(e.message)}</div>`; }
  if (retour && retour !== rep.uid && _capDiag.vis && !capDiagSy()) _capDiag.vis.ouvrir(retour);
}

/**
 * Page de sommaire du PDF (paysage A4) : projet, date, nombre de planches, liste par couche et type avec numéros de page.
 * @param {object[]} l - Représentations exportées
 * @param {number[]} pages - Numéro de page de chacune
 * @returns {HTMLCanvasElement[]} une ou plusieurs pages
 */
function capDiagPdfSommaire(l, pages) {
  const W = 1754, H = 1240, parCol = 30, cols = 2, parPage = parCol * cols, out = [];
  const projet = (cap_xmlDoc && cap_xmlDoc.documentElement && cap_xmlDoc.documentElement.getAttribute('name')) || _L('Projet Capella');
  // Lignes : en-têtes de couche puis diagrammes
  const items = []; let cour = null;
  l.forEach((r, i) => { if (r.couche !== cour) { cour = r.couche; items.push({ couche: r.couche }); } items.push({ r, p: pages[i] }); });
  const nPages = Math.max(1, Math.ceil(items.length / parPage));
  for (let k = 0; k < nPages; k++) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2b2f36'; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60);
    x.fillStyle = '#f5f7fa'; x.fillRect(32, 32, W - 64, 150); x.fillStyle = '#5aa2e8'; x.fillRect(32, 178, W - 64, 5);
    x.fillStyle = '#111'; x.font = '700 46px Segoe UI, Arial, sans-serif'; x.fillText(capDiagTitreExport(), 80, 105);
    x.font = '26px Segoe UI, Arial, sans-serif'; x.fillStyle = '#444';
    x.fillText(`${projet}${capCurrentFileName ? ' — ' + capCurrentFileName : ''}${capDiagNomSource() && capDiagNomSource() !== capCurrentFileName ? ' · ' + capDiagNomSource() : ''}`, 80, 148);
    x.textAlign = 'right';
    x.fillText(`${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · ${_L(`${l.length} planche(s)`)}${nPages > 1 ? ` · ${k + 1}/${nPages}` : ''}`, W - 80, 148);
    x.textAlign = 'left';
    const colW = (W - 160) / cols;
    items.slice(k * parPage, (k + 1) * parPage).forEach((it, i) => {
      const cx = 80 + Math.floor(i / parCol) * colW, cy = 245 + (i % parCol) * 31;
      if (it.couche !== undefined) {
        const lv = capDiagCouche(it.couche);
        x.fillStyle = lv.color; x.fillRect(cx, cy - 20, 54, 26);
        x.fillStyle = capInk(lv.color); x.font = '700 17px Segoe UI, Arial, sans-serif'; x.fillText(it.couche || '—', cx + 8, cy);
        x.fillStyle = '#111'; x.font = '700 21px Segoe UI, Arial, sans-serif'; x.fillText(lv.label, cx + 66, cy);
        return;
      }
      const lv = capDiagCouche(it.r.couche);
      x.fillStyle = lv.color; x.fillRect(cx, cy - 17, 5, 22);
      x.font = '700 15px Segoe UI, Arial, sans-serif'; x.fillStyle = '#57606a'; x.fillText(it.r.sigle, cx + 16, cy);
      x.font = '19px Segoe UI, Arial, sans-serif'; x.fillStyle = '#111';
      let t = it.r.nom.replace(/^\[[^\]]*\]\s*/, ''); while (x.measureText(t).width > colW - 190 && t.length > 4) t = t.slice(0, -2) + '…';
      x.fillText(t, cx + 92, cy);
      x.fillStyle = '#57606a'; x.textAlign = 'right'; x.fillText(String(it.p), cx + colW - 30, cy); x.textAlign = 'left';
    });
    out.push(c);
  }
  return out;
}

/** Seuil (Mo) au-delà duquel l'export PDF demande confirmation. */
const CAP_DIAG_PDF_ALERTE = 40;

/**
 * Taille estimée du PDF, d'après la surface des planches rastérisées (même bornes que capSvgToCanvas)
 * et le nombre de pages d'annexe et de sommaire (coefficients mesurés sur des modèles réels, JPEG 0,92 / 0,8).
 * @param {object[]} items - Diagrammes ({p:{w,h}, nAnx})
 * @param {number} scale - Résolution choisie
 * @param {number} nSom - Pages de sommaire
 * @returns {number} taille estimée en Mo
 */
function capDiagPdfEstimation(items, scale, nSom) {
  let o = nSom * 170e3;
  items.forEach(it => {
    const w = it.p.w, h = it.p.h, k = Math.max(0.5, Math.min(scale || 2, 8000 / Math.max(w, h), Math.sqrt(40e6 / (w * h))));
    o += w * h * k * k * 0.075 + it.nAnx * 170e3;
  });
  return o / 1048576;
}

/**
 * Export groupé des diagrammes en planches : capture de tous les diagrammes, puis pagination
 * (sommaire, planche, pages d'annexe) et écriture du format choisi.
 * @param {string} fmt - 'pdf' | 'zip-png' | 'zip-svg' | 'html'
 */
async function capDiagExport(fmt) {
  const o = _capDiag.exportOpts, l = capDiagCibles(o.portee);
  const st = t => { const s = document.getElementById('cdg-x-statut'); if (s) s.textContent = t; capDiagMsg(t); };
  if (!l.length) { st(_L('Aucun diagramme à exporter.')); return; }
  const projet = (cap_xmlDoc && cap_xmlDoc.documentElement && cap_xmlDoc.documentElement.getAttribute('name')) || 'Capella';
  const date = new Date().toISOString().slice(0, 10), retour = _capDiag.actif;
  const enc = new TextEncoder(), fichiers = [], pdf = [];
  const jpg = async (c, q) => new Uint8Array(await (await capCanvasBlob(c, 'image/jpeg', q || 0.92)).arrayBuffer());
  document.querySelectorAll('#cdg-export-ov [data-fmt],#cdg-x-go').forEach(b => { b.disabled = true; });
  try {
    // 1. Capture des diagrammes et de leurs éléments
    const items = [], echecs = [];
    for (let i = 0; i < l.length; i++) {
      st(`⏳ ${i + 1}/${l.length} — ${l[i].nom}`);
      await new Promise(res => setTimeout(res, 0));
      let svg;
      try { svg = await capDiagSvg(l[i].uid); } catch (e) { console.warn(l[i].nom, e); echecs.push(l[i].nom); continue; }
      items.push({ r: l[i], svg, el: o.annexe ? capDiagElements(svg) : [] });
    }
    if (!items.length) throw new Error(_L('aucun diagramme exportable'));
    l.splice(0, l.length, ...items.map(it => it.r));
    // 2. Pagination du PDF : sommaire(s), puis pour chaque diagramme sa planche et ses pages d'annexe
    const nSom = fmt === 'pdf' && o.sommaire ? Math.max(1, Math.ceil((l.length + new Set(l.map(r => r.couche)).size) / 60)) : 0;
    let total = nSom;
    items.forEach(it => { it.page = total + 1; it.nAnx = fmt === 'pdf' && o.annexe && it.el.length ? Math.ceil(it.el.length / CAP_DIAG_ANX) : 0; total += 1 + it.nAnx; });
    items.forEach((it, i) => { it.p = capDiagPlanche(it.r, it.svg, { planche: fmt === 'pdf' ? `${it.page} / ${total}` : `${i + 1} / ${l.length}` }); });
    // PDF lourd : estimation (dimensions réelles des planches) et confirmation au-delà du seuil
    if (fmt === 'pdf') {
      const mo = capDiagPdfEstimation(items, o.scale, nSom);
      if (mo > CAP_DIAG_PDF_ALERTE && !await capConfirm(_L(`Le PDF fera environ ${Math.round(mo)} Mo (${total} pages).\n\nPour l'alléger : résolution ×1, sans annexes, ou moins de diagrammes (☐ Sélectionner…).\n\nContinuer quand même ?`), { title: _L('PDF volumineux'), ok: _L('Continuer') })) {
        st(_L(`Export annulé : PDF estimé à ${Math.round(mo)} Mo.`)); return;
      }
    }
    if (nSom) for (const c of capDiagPdfSommaire(l, items.map(it => it.page))) pdf.push({ jpeg: await jpg(c, 0.8), iw: c.width, ih: c.height, pw: 842, ph: 595, title: _L('Sommaire') });
    // 3. Planches
    for (let i = 0; i < items.length; i++) {
      const it = items[i], r = it.r;
      st(`⏳ ${_L('Planche')} ${i + 1}/${items.length} — ${r.nom}`);
      await new Promise(res => setTimeout(res, 0));
      const base = `${capSafeFileName(r.couche ? capDiagCouche(r.couche).label : _L('Autres'))}/${String(i + 1).padStart(3, '0')} - ${capSafeFileName(r.nom)}`;
      if (fmt !== 'pdf' && fmt !== 'html' && o.annexe) fichiers.push({ name: base + _L(' - annexe') + '.csv', data: enc.encode(capDiagAnnexeCsv(r, it.el)) });
      if (fmt === 'zip-svg') { fichiers.push({ name: base + '.svg', data: enc.encode(it.p.svg) }); continue; }
      if (fmt === 'html') continue;
      const c = await capSvgToCanvas(it.p.svg, it.p.w, it.p.h, o.scale);
      if (fmt === 'zip-png') { fichiers.push({ name: base + '.png', data: new Uint8Array(await (await capCanvasBlob(c, 'image/png')).arrayBuffer()) }); continue; }
      const pays = it.p.w >= it.p.h, titre = `[${r.sigle}] ${r.nom.replace(/^\[[^\]]*\]\s*/, '')}`;
      pdf.push({ jpeg: await jpg(c), iw: c.width, ih: c.height, pw: pays ? 842 : 595, ph: pays ? 595 : 842, title: titre });
      if (it.nAnx) {
        const cvs = capDiagAnnexePages(r, it.el, [...Array(it.nAnx)].map((_, k) => `${it.page + 1 + k} / ${total}`));
        for (let k = 0; k < cvs.length; k++) pdf.push({ jpeg: await jpg(cvs[k], 0.8), iw: cvs[k].width, ih: cvs[k].height, pw: 842, ph: 595, title: `${titre} — ${_L('annexe')}${cvs.length > 1 ? ' ' + (k + 1) : ''}` });
      }
    }
    const racine = `${capSafeFileName(projet)} - ${_L('diagrammes')}`;
    if (fmt === 'pdf') capDownloadBlob(capPdfBuild(pdf, _L(`Diagrammes — ${projet}`)), `${racine} - ${date}.pdf`);
    else if (fmt === 'html') capDiagExportHtml(items, racine);
    else capDownloadBlob(capZipBuild(fichiers), `${racine} ${fmt === 'zip-svg' ? 'SVG' : 'PNG'} - ${date}.zip`);
    st(_L(`✔ ${l.length} diagramme(s) exporté(s)`) + (fmt === 'pdf' ? _L(` (${pdf.length} pages)`) : '') +
      (echecs.length ? _L(` — ${echecs.length} ignoré(s) : `) + echecs.join(', ') : ''));
  } catch (e) { console.error(e); st(_L('⚠ Échec de l\'export : ') + e.message); }
  finally {
    document.querySelectorAll('#cdg-export-ov [data-fmt],#cdg-x-go').forEach(b => { b.disabled = false; });
    if (retour && _capDiag.vis && !capDiagSy()) { _capDiag.vis.ouvrir(retour); _capDiag.actif = retour; capDiagMarquerActif(); }
  }
}

/**
 * Rapport HTML autonome : onglet Sommaire (tableau avec liens) et onglet Planches
 * (groupes repliables par couche puis type, une carte repliable par diagramme : planche vectorielle, annexe).
 * @param {{r:object, p:{svg:string,w:number,h:number}, el:object[]}[]} items - Diagrammes exportés, dans l'ordre
 * @param {string} racine - Début du nom de fichier
 */
function capDiagExportHtml(items, racine) {
  const o = _capDiag.exportOpts;
  const img = p => `<img loading="lazy" alt="" style="max-width:100%;height:auto;background:#fff;border:1px solid var(--c-border);border-radius:4px" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg).replace(/'/g, '%27')}">`;
  const badge = c => { const lv = capDiagCouche(c); return `<span style="display:inline-block;min-width:34px;text-align:center;padding:1px 6px;border-radius:4px;font-weight:700;font-size:11px;background:${lv.color};color:${capInk(lv.color)}">${capEsc(c || '—')}</span>`; };
  const sigle = r => { const lv = capDiagCouche(r.couche); return `<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;color:${lv.color};background:${lv.bg}">${capEsc(r.sigle)}</span>`; };
  const nbEl = it => new Set((it.p.svg.match(/data-sem="[^"]+"/g) || [])).size;
  const sommaire = `<table class="cap-diag-t" style="border-collapse:collapse;width:100%"><tr><th>N°</th><th>${_L('Couche')}</th><th>${_L('Sigle')}</th><th>Type</th><th>${_L('Diagramme')}</th><th>${_L('Éléments')}</th></tr>` +
    items.map((it, i) => `<tr><td class="num">${i + 1}</td><td>${badge(it.r.couche)}</td><td>${sigle(it.r)}</td><td>${capEsc(it.r.type)}</td>` +
      `<td><a href="#dg-${i}" onclick="var t=document.querySelector('.rtab[data-t=pl]');if(t)t.click();var d=document.getElementById('dg-${i}');if(d){d.open=true;var g=d.parentElement.closest('details');while(g){g.open=true;g=g.parentElement.closest('details');}}" style="color:var(--c-accent)">${capEsc(it.r.nom)}</a></td>` +
      `<td class="num">${nbEl(it)}</td></tr>`).join('') + `</table>`;
  const css = `<style>.dg-c>summary{font-size:15px;font-weight:700;padding:8px 4px}
.dg-t{margin:4px 0 4px 14px}.dg-t>summary{font-weight:600;padding:5px 4px;color:var(--c-text)}
.dg-p{margin:6px 0 10px 14px;border:1px solid var(--c-border);border-radius:6px;background:var(--c-bg2)}.dg-p>summary{padding:6px 10px}
.dg-p>div{padding:8px 10px;text-align:center}.dg-n{color:var(--c-dim);font-weight:400;font-size:12px}
.dg-a{text-align:left;margin-top:8px}.dg-a>summary{padding:4px 0;color:var(--c-dim)}.dg-a table{border-collapse:collapse;width:100%;font-size:12px}
.dg-a td,.dg-a th{border-bottom:1px solid var(--c-border);padding:3px 6px;text-align:left}</style>`;
  const annexe = it => !o.annexe || !it.el.length ? '' :
    `<details class="dg-a"><summary>${_L('Annexe')} — ${_L(`${it.el.length} élément(s) représenté(s)`)}</summary><table class="ana-t"><tr><th>N°</th><th>${_L('Élément')}</th><th>Type</th><th>${_L('Couche')}</th><th>ID</th></tr>` +
    it.el.map((e, k) => `<tr><td class="num">${k + 1}</td><td>${capEsc(e.nom)}</td><td>${capEsc(e.type)}</td><td>${capEsc(e.couche)}</td><td class="ana-dim">${capEsc(e.id)}</td></tr>`).join('') + `</table></details>`;
  let corps = '';
  const parC = new Map(); items.forEach((it, k) => { const c = it.r.couche || ''; if (!parC.has(c)) parC.set(c, []); parC.get(c).push(Object.assign(it, { k })); });
  parC.forEach((lc, c) => {
    const parT = new Map(); lc.forEach(x => { const t = x.r.sigle + '|' + x.r.type; if (!parT.has(t)) parT.set(t, []); parT.get(t).push(x); });
    corps += `<details class="dg-c" open><summary>${badge(c)} ${capEsc(capDiagCouche(c).label)} <span class="dg-n">${lc.length}</span></summary>`;
    parT.forEach(lt => {
      corps += `<details class="dg-t" open><summary>${sigle(lt[0].r)} ${capEsc(lt[0].r.type)} <span class="dg-n">${lt.length}</span></summary>`;
      lt.forEach(it => { corps += `<details class="dg-p cap-chain-card" id="dg-${it.k}"${lt.length <= 3 ? ' open' : ''}><summary>${sigle(it.r)} <b>${capEsc(it.r.nom.replace(/^\[[^\]]*\]\s*/, ''))}</b> <span class="dg-n">${it.k + 1}</span></summary><div>${img(it.p)}${annexe(it)}</div></details>`; });
      corps += `</details>`;
    });
    corps += `</details>`;
  });
  capHtmlReport({ title: '🔲 ' + capDiagTitreExport(), subtitle: _L(`${items.length} diagramme(s)`) + (capDiagNomSource() ? ' · ' + capDiagNomSource() : ''), active: o.sommaire ? 'sum' : 'pl',
    tabs: [o.sommaire ? { key: 'sum', label: _L('📋 Sommaire'), html: sommaire } : null, { key: 'pl', label: _L('🔲 Planches'), html: css + corps }].filter(Boolean),
    filename: `${racine}.html` });
}
