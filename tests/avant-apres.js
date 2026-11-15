#!/usr/bin/env node
/**
 * ⇄ Avant / après (104) : écarts d'un diagramme entre deux versions, pour les trois familles de dessins.
 *
 * Les « versions d'avant » sont fabriquées à la volée à partir des modèles de test (rien n'est écrit sur le disque) :
 * - Capella : IFE, .aird d'avant où, dans [SAB] High Level System Overview, un conteneur est décalé, un autre renommé et un
 *   troisième absent ; le .aird d'origine est ensuite ouvert : la version d'avant est gardée d'elle-même ;
 * - SysML v2 : VehiculeDemo d'avant avec une part de plus (Frein) et une définition de moins (MoteurHybride) ;
 * - UML (Papyrus) : Bibliotheque.notation d'avant avec une classe décalée de 200 px.
 * Contrôles : version d'avant retenue, écarts attendus listés (objets entraînés comptés sous leur conteneur), fondu
 * (opacités, glissement) et volet (découpe), 🔎 diagrammes modifiés, ◀ ▶, aucune erreur JavaScript.
 *
 * Lancement : node tests/avant-apres.js   (après node build.js ; Playwright, CHROMIUM_PATH=… pour un Chromium déjà installé)
 */
'use strict';
const path = require('path'), fs = require('fs'), zlib = require('zlib');
let chromium; try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright absent : npm install --save-dev playwright && npx playwright install chromium'); process.exit(2); }

const ROOT = path.join(__dirname, '..'), M = path.join(__dirname, 'models');
const page = path.join(ROOT, 'dist', 'arcalyse-fr.html');
if (!fs.existsSync(page)) { console.error('Lancez d\'abord : node build.js'); process.exit(2); }
let echecs = 0;
const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) echecs++; };

/**
 * .aird d'IFE « d'avant » : dans [SAB] High Level System Overview, 2e conteneur de premier niveau décalé de -120 px,
 * élément Sirius du 3e renommé, 4e retiré avec ses enfants.
 * @param {string} aird - Texte du .aird d'origine
 * @returns {string} Texte modifié
 */
function airdAvant(aird) {
  const i0 = aird.indexOf('name="[SAB] High Level System Overview"');
  const rep = aird.slice(aird.lastIndexOf('<ownedRepresentationDescriptors', i0), aird.indexOf('>', i0));
  const uid = (rep.match(/repPath="#([^"]+)"/) || [])[1];
  const debut = aird.indexOf('<data xmi:type="notation:Diagram"', aird.indexOf(`uid="${uid}"`)), finD = aird.indexOf('</data>', debut);
  const re = /<children xmi:type="notation:Node" xmi:id="([^"]+)" type="(\d+)" element="([^"]+)"/g, noeuds = [];
  let m; const seg = aird.slice(debut, finD);
  while ((m = re.exec(seg))) noeuds.push({ type: m[2], el: m[3], pos: debut + m.index });
  const fin = p => { let d = 0; const t = /<(\/?)children\b[^>]*?(\/?)>/g; t.lastIndex = p; let x;
    while ((x = t.exec(aird))) { if (x[1]) { d--; if (d === 0) return x.index + x[0].length; } else if (!x[2]) d++; else if (d === 0) return x.index + x[0].length; } return -1; };
  const c = noeuds.filter(n => n.type === '2002');
  const s = aird.slice(c[1].pos, fin(c[1].pos)), k = s.lastIndexOf('<layoutConstraint'), b = s.slice(k, s.indexOf('/>', k) + 2);
  const edits = [{ p: c[1].pos + k, l: b.length, t: b.replace(/ x="(-?\d+)"/, (q, x) => ` x="${+x - 120}"`) }, { p: c[3].pos, l: fin(c[3].pos) - c[3].pos, t: '' }].sort((x, y) => y.p - x.p);
  let out = aird; for (const e of edits) out = out.slice(0, e.p) + e.t + out.slice(e.p + e.l);
  const u = out.indexOf(`uid="${c[2].el}"`), b0 = out.lastIndexOf('<', u), b1 = out.indexOf('>', u);
  return out.slice(0, b0) + out.slice(b0, b1).replace(/ name="([^"]*)"/, ' name="$1 (ancien nom)"') + out.slice(b1);
}

/** Attend la fin de la recherche des diagrammes modifiés et rend le relevé de l'affichage (dans la page). */
const RELEVE = `(async()=>{
  capAvChercherModifies(); await new Promise(r=>{ const i=setInterval(()=>{ if(!_capAv.cherche){ clearInterval(i); r(); } },100); });
  const E=_capAv.ecarts.filter(e=>!e.suit), g=k=>E.filter(e=>[...e.genres][0]===k).map(e=>e.nom);
  return {ref:!!capAvRef(), uid:_capAv.uid, modifies:_capAv.modifies.liste.map(d=>d.nom), ajout:g('ajout'), retrait:g('retrait'), depl:g('depl'), taille:g('taille'), nom:g('nom'), n:E.length,
    entraines:_capAv.ecarts.filter(e=>e.suit).length, liste:document.querySelectorAll('#cav-liste .cav-it[data-cav-i]').length, marques:document.querySelectorAll('#cav-m .cav-m').length};
})()`;

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }), erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message)); p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await p.goto('file://' + page.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'));
  const ouvrir = async (fichiers) => {   // fichiers : [{nom, texte}] ; plusieurs : projet UML (.uml + .notation)
    await p.evaluate(F => { _capReplaceOk = Date.now(); const fs = F.map(x => new File([x.texte], x.nom)); if (fs.length > 1) capUmlOuvrirFichiers(fs, true); else capLoadFile(fs[0], null, true); }, fichiers);
    await p.waitForFunction(() => typeof capLoaded !== 'undefined' && capLoaded, null, { timeout: 180000 }); await p.waitForTimeout(1500);
  };

  // ── Capella : IFE, .aird d'avant puis .aird d'origine ──
  const aird = zlib.gunzipSync(fs.readFileSync(path.join(M, 'In-Flight_Entertainment_System.aird.gz'))).toString('utf8');
  await ouvrir([{ nom: 'In-Flight_Entertainment_System.capella', texte: fs.readFileSync(path.join(M, 'In-Flight_Entertainment_System.capella'), 'utf8') }]);
  await p.evaluate(A => { capNavOpen('diag'); capDiagSetAird(A, 'IFE.aird', null, 0); capDiagSync(); }, airdAvant(aird));
  ok(await p.evaluate(() => !capAvRef()), 'Capella : pas de version d\'avant au premier .aird');
  await p.evaluate(A => { capDiagSetAird(A, 'IFE.aird', null, 0); capDiagSync(); }, aird);
  let r;
  r = await p.evaluate(`(async()=>{ const sab=capDiagReps().find(x=>x.nom==='[SAB] High Level System Overview'); capDiagOuvrirUid(sab.uid);
    await new Promise(z=>setTimeout(z,300)); capAvOuvrir(); await new Promise(z=>setTimeout(z,300)); return await ${RELEVE}; })()`);
  ok(r.ref && !!r.uid, 'Capella : version d\'avant gardée d\'elle-même au remplacement du .aird');
  ok(r.depl.length === 1 && r.nom.length === 1 && r.ajout.includes('Cabin Crew') && r.n <= 5, `Capella : écarts ${JSON.stringify({ depl: r.depl, nom: r.nom, ajout: r.ajout })}`);
  ok(r.entraines >= 20 && r.liste === r.n && r.marques === r.n, `Capella : ${r.entraines} objet(s) entraînés comptés sous leur conteneur ; liste et marques`);
  ok(r.modifies.length === 1 && r.modifies[0] === '[SAB] High Level System Overview', `Capella : 🔎 diagrammes modifiés (${r.modifies.join(', ')})`);
  const f = await p.evaluate(() => { _capAv.mode = 'fondu'; _capAv.t = 40; capAvAppliquer();
    const O = _capAv.objets, trans = [...O.A.values()].filter(o => o.el.getAttribute('transform')).length, vis = [...O.B.values()].filter(o => o.el.style.visibility === 'visible').length;
    _capAv.t = 100; capAvAppliquer(); const fin = [...O.A.values()].filter(o => o.el.getAttribute('transform')).length;
    _capAv.mode = 'volet'; _capAv.volet = 30; capAvAppliquer(); const clip = document.getElementById('cav-a').style.clipPath, poignee = document.getElementById('cav-poignee').style.left;
    _capAv.mode = 'fondu'; capAvAppliquer(); capAvAller(0); const i0 = _capAv.idx; capAvAller(-1);
    return { trans, vis, fin, clip, poignee, i0, dernier: _capAv.idx, n: _capAv.ecarts.filter(e => !e.suit).length }; });
  ok(f.trans > 10 && f.vis > 0 && f.fin === 0, `fondu : ${f.trans} objet(s) en glissement à 40 %, ${f.vis} repris du dessin d'avant ; rien à 100 %`);
  ok(/inset\(0px 0px 0px 30%\)/.test(f.clip) && f.poignee === '30%', 'volet : dessin d\'après découpé à la barre');
  ok(f.i0 === 0 && f.dernier === f.n - 1, '◀ ▶ : d\'un écart à l\'autre, en boucle');
  await p.evaluate(() => capAvFermer());

  // ── SysML v2 : VehiculeDemo d'avant (Frein en plus, MoteurHybride en moins), puis l'actuel ──
  const sy = fs.readFileSync(path.join(M, 'VehiculeDemo.sysml'), 'utf8');
  const syAvant = sy.replace('part def Pignon;', 'part def Pignon;\n    part def Frein;').replace('part boite : Boite;', 'part boite : Boite;\n        part frein : Frein;').replace('part def MoteurHybride :> Moteur;', '');
  await ouvrir([{ nom: 'VehiculeDemo.sysml', texte: syAvant }]); await ouvrir([{ nom: 'VehiculeDemo.sysml', texte: sy }]);
  r = await p.evaluate(`(async()=>{ capNavOpen('diag'); await new Promise(z=>setTimeout(z,400)); const v=capDiagReps().find(x=>/générale/i.test(x.nom))||capDiagReps()[0];
    capDiagOuvrirUid(v.uid); await new Promise(z=>setTimeout(z,300)); capAvOuvrir(); await new Promise(z=>setTimeout(z,300)); return await ${RELEVE}; })()`);
  ok(r.ref && r.ajout.includes('MoteurHybride') && r.retrait.includes('Frein'), `SysML v2 : version d'avant gardée ; ajout ${r.ajout}, retrait ${r.retrait}`);
  ok(r.modifies.length >= 1, `SysML v2 : 🔎 ${r.modifies.length} vue(s) modifiée(s)`);
  await p.evaluate(() => capAvFermer());

  // ── UML (Papyrus) : Bibliotheque d'avant avec une classe décalée de 200 px ──
  const uml = fs.readFileSync(path.join(M, 'uml', 'Bibliotheque.uml'), 'utf8'), nota = fs.readFileSync(path.join(M, 'uml', 'Bibliotheque.notation'), 'utf8');
  const notaAvant = nota.replace(/<layoutConstraint xmi:type="notation:Bounds"[^>]* x="(-?\d+)"[^>]*\/>/, (t, x) => t.replace(` x="${x}"`, ` x="${+x + 200}"`));
  await ouvrir([{ nom: 'Bibliotheque.uml', texte: uml }, { nom: 'Bibliotheque.notation', texte: notaAvant }]);
  await ouvrir([{ nom: 'Bibliotheque.uml', texte: uml }, { nom: 'Bibliotheque.notation', texte: nota }]);
  r = await p.evaluate(`(async()=>{ capNavOpen('diag'); await new Promise(z=>setTimeout(z,400)); const v=capDiagReps().find(x=>x.genre!=='tableau');
    capDiagOuvrirUid(v.uid); await new Promise(z=>setTimeout(z,300)); capAvOuvrir(); await new Promise(z=>setTimeout(z,300));
    capAvChercherModifies(); await new Promise(r=>{ const i=setInterval(()=>{ if(!_capAv.cherche){ clearInterval(i); r(); } },100); });
    capDiagOuvrirUid(_capAv.modifies.liste[0].uid); await new Promise(z=>setTimeout(z,400)); return await ${RELEVE}; })()`);
  ok(r.ref && r.depl.length === 1 && r.n === 1 && r.modifies.length === 1, `UML : un diagramme modifié, une classe déplacée (${r.depl})`);
  await p.evaluate(() => capAvFermer());

  ok(!erreurs.length, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await b.close();
  console.log(echecs ? `\n✖ ${echecs} échec(s)` : '\n✔ Avant / après OK');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
