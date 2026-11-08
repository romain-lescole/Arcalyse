#!/usr/bin/env node
/**
 * 🤖 Serveur MCP d'Arcalyse (essai) : expose les analyses d'Arcalyse à une application d'IA (Claude Desktop, Claude Code,
 * ou tout client MCP) — lecture seule, sur le poste, sans réseau. Modèles Capella (.capella + .aird), SysML v2 (.sysml, .kpar)
 * et UML / SysML v1 (.uml + .notation de Papyrus, .xmi, .mdzip de Cameo, .qea d'Enterprise Architect).
 *
 * Principe : une page Arcalyse sans fenêtre (Chromium piloté par Playwright, contexte hors ligne) charge le modèle ; les
 * outils sont ceux du catalogue de la page (src/js/89-ia-outils.js, capIaOutils / capIaAppel), plus ceux du serveur
 * (open_model, script_api_reference). Transport : stdio (JSON-RPC, un message par ligne). Rien n'est écrit sur stdout
 * en dehors des messages du protocole (journal sur stderr).
 *
 * Réglages (variables d'environnement) :
 *   ARCALYSE_HTML        page Arcalyse à utiliser (défaut : ../dist/arcalyse-fr.html, sinon ../livraison/arcalyse-complet.html, en français)
 *   ARCALYSE_NAVIGATEUR  chrome | msedge (navigateur installé), ou chemin d'un exécutable Chromium ; défaut : Chromium de Playwright
 *   ARCALYSE_RACINES     dossiers autorisés pour open_model, séparés par « ; » (défaut : tous)
 *   ARCALYSE_MODELE      modèle ouvert au démarrage (facultatif)
 *
 * Lancement : node mcp/serveur.js   (voir mcp/LISEZMOI.md pour la déclaration dans Claude Desktop / Claude Code)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const VERSION = '0.2.0';
const RACINE = path.resolve(__dirname, '..');
const PROTOCOLES = ['2025-06-18', '2025-03-26', '2024-11-05'];
const INSTRUCTIONS = [
  'Arcalyse lit des modèles Capella (.capella, avec .aird), SysML v2 (.sysml, .kpar) et UML / SysML v1 (.uml avec .notation, .xmi, .mdzip, .qea), en lecture seule.',
  'Commencer par open_model (chemin du fichier), puis model_summary (format du modèle). Les éléments sont désignés par des identifiants courts (E12), les diagrammes par D3, valables pendant la session.',
  'Préférer les outils ciblés (search_elements, get_element, diagrams, traceability, checks) ; run_script pour le reste (contrat : script_api_reference).',
  'Modèle SysML ou UML : pas de couches ARCADIA (familles STR, BEH, REQ, ORG) ; traceability suit satisfy, verify, deriveReqt, refine, trace… ; checks rend la validation du lecteur.',
  'Citer les éléments par leur nom et leur identifiant court, pour que l\'utilisateur puisse les retrouver.'
].join('\n');

/** Écrit dans le journal (stderr), jamais sur stdout réservé au protocole. @param {...*} m - Message */
function journal(...m) { process.stderr.write('[arcalyse-mcp] ' + m.join(' ') + '\n'); }

/* ── Navigateur et page ─────────────────────────────────────────────── */

/** État de la page : navigateur, contexte, page, modèle ouvert. */
const etat = { navigateur: null, contexte: null, page: null, modele: '', aird: '', notation: '', outilsPage: null };

/** Extensions des modèles ouverts, par format (mêmes que CAP_FORMATS de la page, module 20). */
const FORMATS = { capella: /\.(capella|melodymodeller|xml)$/i, sysml: /\.(sysml|kpar)$/i, uml: /\.(uml|xmi|mdzip|qea|qeax)$/i };
/** Formats acceptés, en clair (messages d'erreur). */
const FORMATS_TEXTE = 'Capella (.capella, .melodymodeller, .xml), SysML v2 (.sysml, .kpar), UML / SysML v1 (.uml avec son .notation, .xmi, .mdzip, .qea, .qeax)';

/**
 * Chemin de la page Arcalyse à charger.
 * @returns {string} Chemin absolu
 */
function cheminPage() {
  const choix = [process.env.ARCALYSE_HTML, path.join(RACINE, 'dist', 'arcalyse-fr.html'), path.join(RACINE, 'livraison', 'arcalyse-complet.html'), path.join(RACINE, 'livraison', 'arcalyse-fr.html')].filter(Boolean);
  const p = choix.find(x => fs.existsSync(x));
  if (!p) throw new Error('Page Arcalyse introuvable : lancer « node build.js » ou régler ARCALYSE_HTML.');
  return path.resolve(p);
}

/**
 * Démarre le navigateur (une fois) : Chromium de Playwright, navigateur installé (chrome / msedge) ou exécutable donné.
 * @returns {Promise<object>} Navigateur Playwright
 */
async function navigateur() {
  if (etat.navigateur) return etat.navigateur;
  let pw;
  try { pw = require('playwright'); } catch (e) {
    try { pw = require('playwright-core'); } catch (e2) { throw new Error('Playwright absent : dans le dossier mcp, lancer « npm install ».'); }
  }
  const choix = process.env.ARCALYSE_NAVIGATEUR || '';
  const essais = choix ? [/^(chrome|msedge)/.test(choix) ? { channel: choix } : { executablePath: choix }]
    : [{}, { channel: 'msedge' }, { channel: 'chrome' }];
  let derniere;
  for (const o of essais) {
    try { etat.navigateur = await pw.chromium.launch(o); journal('navigateur :', JSON.stringify(o)); return etat.navigateur; }
    catch (e) { derniere = e; }
  }
  throw new Error('Impossible de lancer un navigateur (Chromium, Edge ou Chrome) : ' + (derniere && derniere.message || '').split('\n')[0]);
}

/**
 * Vérifie qu'un fichier est dans un dossier autorisé (ARCALYSE_RACINES).
 * @param {string} f - Chemin absolu
 */
function verifierRacine(f) {
  const r = (process.env.ARCALYSE_RACINES || '').split(';').map(x => x.trim()).filter(Boolean).map(x => path.resolve(x));
  if (r.length && !r.some(x => f === x || f.startsWith(x + path.sep))) throw new Error(`Fichier hors des dossiers autorisés (ARCALYSE_RACINES) : ${f}`);
}

/**
 * Cherche le .aird à côté d'un .capella (même nom, ou seul .aird du dossier ; .aird.gz accepté).
 * @param {string} modele - Chemin du .capella
 * @returns {string} Chemin du .aird, ou ''
 */
function airdVoisin(modele) {
  const base = modele.replace(/\.(capella|melodymodeller)$/i, '');
  for (const x of [base + '.aird', base + '.aird.gz']) if (fs.existsSync(x)) return x;
  const dos = path.dirname(modele), airds = fs.readdirSync(dos).filter(n => /\.aird$/i.test(n));
  return airds.length === 1 ? path.join(dos, airds[0]) : '';
}

/**
 * Cherche le .notation de Papyrus à côté d'un .uml (même nom, ou seul .notation du dossier), comme le dossier du projet de la page (88).
 * @param {string} modele - Chemin du .uml
 * @returns {string} Chemin du .notation, ou ''
 */
function notationVoisin(modele) {
  const meme = modele.replace(/\.uml$/i, '') + '.notation';
  if (fs.existsSync(meme)) return meme;
  const dos = path.dirname(modele), n = fs.readdirSync(dos).filter(x => /\.notation$/i.test(x));
  return n.length === 1 ? path.join(dos, n[0]) : '';
}

/**
 * Fichier annexe d'un modèle (.aird, .notation) : chemin donné, sinon trouvé à côté ; vérifié (dossiers autorisés, existence).
 * @param {string} [donne] - Chemin donné par l'appel
 * @param {function():string} trouver - Recherche à côté du modèle
 * @returns {string} Chemin absolu, ou ''
 */
function annexe(donne, trouver) {
  const p = donne ? path.resolve(String(donne)) : trouver();
  if (p) { verifierRacine(p); if (!fs.existsSync(p)) throw new Error(`Fichier introuvable : ${p}`); }
  return p;
}

/**
 * Attend la fin du chargement d'un modèle : modèle affiché (capLoaded), ou erreur montrée sur l'écran d'accueil (#cw-status.err),
 * rendue comme une erreur de l'outil (sans attendre la fin du délai).
 * @param {object} p - Page Playwright
 */
async function attendreModele(p) {
  await p.waitForFunction(() => (typeof capLoaded !== 'undefined' && capLoaded) || !!document.querySelector('#cw-status.err'), null, { timeout: 300000 });
  const err = await p.evaluate(() => { const s = document.querySelector('#cw-status.err'); return capLoaded ? '' : (s && s.textContent) || 'échec du chargement'; });
  if (err) throw new Error(err);
}

/**
 * Ouvre un modèle dans une page neuve (hors ligne), par le même chemin que l'interface : sélecteur de fichier (capLoadFile, 20 :
 * Capella, SysML v2 → 87, UML / SysML v1 → capUmlOuvrir, 88), ou, pour un .uml et son .notation, sélection des deux fichiers
 * (capUmlOuvrirFichiers, comme leur dépôt ensemble). Le .aird d'un .capella est ensuite ouvert dans 🔲 Diagrammes.
 * @param {{path:string, aird?:string, notation?:string}} a - Chemins
 * @returns {Promise<object>} Résumé du modèle (outil model_summary)
 */
async function ouvrirModele(a) {
  const f = path.resolve(String(a.path || ''));
  if (!fs.existsSync(f)) throw new Error(`Fichier introuvable : ${f}`);
  if (/\.notation$/i.test(f)) throw new Error('Un .notation ne contient que les diagrammes de Papyrus : ouvrir le modèle .uml (son .notation est trouvé à côté, ou paramètre notation).');
  if (/\.aird(\.gz)?$/i.test(f)) throw new Error('Un .aird ne contient que les diagrammes Capella : ouvrir le .capella (son .aird est trouvé à côté, ou paramètre aird).');
  if (!Object.values(FORMATS).some(r => r.test(f))) throw new Error('Formats acceptés : ' + FORMATS_TEXTE);
  verifierRacine(f);
  const capella = FORMATS.capella.test(f), uml = /\.uml$/i.test(f);
  if (a.aird && !capella) throw new Error('Paramètre aird : seulement pour un modèle Capella.');
  if (a.notation && !uml) throw new Error('Paramètre notation : seulement pour un modèle .uml (Papyrus).');
  const aird = capella ? annexe(a.aird, () => /\.(capella|melodymodeller)$/i.test(f) ? airdVoisin(f) : '') : '';
  const notation = uml ? annexe(a.notation, () => notationVoisin(f)) : '';
  const nav = await navigateur();
  if (etat.contexte) await etat.contexte.close().catch(() => {});
  etat.contexte = await nav.newContext({ offline: true, viewport: { width: 1400, height: 900 } });
  const p = etat.page = await etat.contexte.newPage();
  etat.modele = ''; etat.aird = ''; etat.notation = '';
  p.on('pageerror', e => journal('erreur de la page :', e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto('file://' + cheminPage().replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:') + '?lang=fr');   // version multilingue : en français
  if (notation) {
    await p.evaluate(() => {   // sélecteur multiple, comme le dépôt du modèle et de son .notation ensemble (20 → 88)
      const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.id = 'mcp-fichiers'; i.hidden = true;
      i.onchange = () => capUmlOuvrirFichiers([...i.files], true); document.body.appendChild(i);
    });
    await p.setInputFiles('#mcp-fichiers', [f, notation]);
  } else await p.setInputFiles('#capella-file-input', f);
  await attendreModele(p);
  etat.modele = f; etat.notation = notation;
  if (aird) {
    let fichier = aird;
    if (/\.gz$/i.test(aird)) { fichier = path.join(os.tmpdir(), 'arcalyse-mcp-' + path.basename(aird, '.gz')); fs.writeFileSync(fichier, zlib.gunzipSync(fs.readFileSync(aird))); }
    try {
      await p.evaluate(() => capNavOpen('diag'));
      await p.setInputFiles('#cdg-fichier', fichier);
      await p.waitForFunction(() => typeof capDiagReps === 'function' && capDiagReps().length > 0, null, { timeout: 120000 });
      etat.aird = aird;
    } catch (e) { journal('diagrammes non chargés :', e.message.split('\n')[0]); }
  }
  journal('modèle ouvert :', f, etat.aird ? '+ ' + path.basename(etat.aird) : '', notation ? '+ ' + path.basename(notation) : '');
  const r = await appelPage('model_summary', {});
  return Object.assign({ opened: f }, capella ? { aird: etat.aird || null } : {}, uml ? { notation: notation || null } : {}, r);
}

/**
 * Appelle un outil du catalogue de la page.
 * @param {string} nom - Outil
 * @param {object} args - Arguments
 * @returns {Promise<*>} Résultat (une erreur est levée en cas d'échec)
 */
async function appelPage(nom, args) {
  if (!etat.page) throw new Error('Aucun modèle ouvert : appeler d\'abord open_model avec le chemin du fichier.');
  const r = await etat.page.evaluate(([n, a]) => capIaAppel(n, a), [nom, args || {}]);
  if (!r.ok) throw new Error(r.error);
  return r.result;
}

/**
 * Définitions des outils de la page, lues une fois dans une page vide (sans modèle).
 * @returns {Promise<object[]>} Outils MCP
 */
async function outilsPage() {
  if (etat.outilsPage) return etat.outilsPage;
  const nav = await navigateur();
  const ctx = await nav.newContext({ offline: true });
  try {
    const p = await ctx.newPage();
    await p.goto('file://' + cheminPage().replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:') + '?lang=fr');   // version multilingue : en français
    etat.outilsPage = await p.evaluate(() => capIaOutils());
  } finally { await ctx.close(); }
  return etat.outilsPage;
}

/* ── Outils du serveur ──────────────────────────────────────────────── */

/** Outils propres au serveur (fichiers du poste, documentation). */
const OUTILS_SERVEUR = [
  { name: 'open_model',
    description: 'Ouvre un modèle sur le poste : Capella (.capella, .melodymodeller, .xml ; avec son .aird trouvé à côté), SysML v2 (.sysml, .kpar) ou UML / SysML v1 (.uml d\'Eclipse UML2 / Papyrus avec son .notation trouvé à côté, .xmi de l\'OMG, de Cameo, de Papyrus ou d\'Enterprise Architect, projet Cameo .mdzip, projet Enterprise Architect .qea / .qeax). Remplace le modèle ouvert. Rend le résumé du modèle (format, éléments, diagrammes, diagnostics du lecteur).',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Chemin absolu du fichier modèle' },
      aird: { type: 'string', description: 'Chemin du .aird d\'un modèle Capella (facultatif : sinon cherché à côté du modèle)' },
      notation: { type: 'string', description: 'Chemin du .notation d\'un modèle .uml (facultatif : sinon même nom, ou seul .notation du dossier)' } }, required: ['path'] },
    faire: a => ouvrirModele(a) },
  { name: 'script_api_reference',
    description: 'Contrat de l\'API de scripts (TypeScript, arcalyse.d.ts) à lire avant d\'écrire un script pour run_script.',
    inputSchema: { type: 'object', properties: {} },
    faire: () => fs.readFileSync(path.join(RACINE, 'docs', 'api', 'arcalyse.d.ts'), 'utf8') }
];

/**
 * Exécute un outil (serveur ou page) et met le résultat au format MCP.
 * @param {string} nom - Outil
 * @param {object} args - Arguments
 * @returns {Promise<object>} Résultat MCP { content, isError? }
 */
async function appelOutil(nom, args) {
  const t0 = Date.now();
  try {
    const s = OUTILS_SERVEUR.find(o => o.name === nom);
    const r = s ? await s.faire(args || {}) : await appelPage(nom, args);
    const texte = typeof r === 'string' ? r : JSON.stringify(r);
    journal(`${nom} : ${texte.length} caractères, ${Date.now() - t0} ms`);
    return { content: [{ type: 'text', text: texte }] };
  } catch (e) {
    journal(`${nom} : erreur — ${e.message}`);
    return { content: [{ type: 'text', text: 'Erreur : ' + e.message }], isError: true };
  }
}

/* ── Protocole MCP (JSON-RPC 2.0 sur stdio) ─────────────────────────── */

/** Envoie un message JSON-RPC sur stdout. @param {object} m - Message */
function envoyer(m) { process.stdout.write(JSON.stringify(Object.assign({ jsonrpc: '2.0' }, m)) + '\n'); }

/**
 * Traite une requête et rend son résultat.
 * @param {string} methode - Méthode JSON-RPC
 * @param {object} params - Paramètres
 * @returns {Promise<object>} Résultat
 */
async function traiter(methode, params) {
  switch (methode) {
    case 'initialize': {
      const v = params && params.protocolVersion;
      return { protocolVersion: PROTOCOLES.includes(v) ? v : PROTOCOLES[0], capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'arcalyse', version: VERSION }, instructions: INSTRUCTIONS };
    }
    case 'ping': return {};
    case 'tools/list':
      return { tools: [...OUTILS_SERVEUR.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })), ...await outilsPage()] };
    case 'tools/call': return appelOutil(params && params.name, params && params.arguments);
    default: { const e = new Error('Méthode inconnue : ' + methode); e.code = -32601; throw e; }
  }
}

/** File des requêtes : traitées une à une (une seule page). */
let file = Promise.resolve();

/**
 * Reçoit une ligne de stdin (un message JSON-RPC).
 * @param {string} ligne - Ligne reçue
 */
function recevoir(ligne) {
  if (!ligne.trim()) return;
  let m;
  try { m = JSON.parse(ligne); } catch (e) { envoyer({ id: null, error: { code: -32700, message: 'JSON invalide' } }); return; }
  if (m.id === undefined || m.id === null) return;   // notification (initialized, cancelled…) : rien à rendre
  file = file.then(async () => {
    try { envoyer({ id: m.id, result: await traiter(m.method, m.params || {}) }); }
    catch (e) { envoyer({ id: m.id, error: { code: e.code || -32603, message: e.message } }); }
  });
}

/** Ferme le navigateur et quitte. */
async function quitter() {
  try { if (etat.navigateur) await etat.navigateur.close(); } catch (e) { /* déjà fermé */ }
  process.exit(0);
}

readline.createInterface({ input: process.stdin }).on('line', recevoir).on('close', () => { file.then(quitter); });
process.on('SIGINT', quitter); process.on('SIGTERM', quitter);
journal(`v${VERSION} prêt (page : ${(() => { try { return cheminPage(); } catch (e) { return 'introuvable'; } })()})`);
if (process.env.ARCALYSE_MODELE) file = file.then(() => ouvrirModele({ path: process.env.ARCALYSE_MODELE })).catch(e => journal('ARCALYSE_MODELE :', e.message));
