#!/usr/bin/env node
/**
 * 🧬 Lecteur UML / SysML v1 embarqué (src/vendor/arcature-lecteur-uml.js, repris d'Arcature) : test Node 18+, sans navigateur.
 *   node tests/uml.js
 * Contrôles : chargement en module Node (require), en-tête Apache 2.0 et mention de l'OMG, aucun fichier sous EPL-2.0 ;
 * modèles de tests/models/uml/ (écrits pour Arcature, Apache 2.0) — Bibliotheque.uml avec son .notation (diagrammes de
 * Papyrus et vues calculées), Rover-cameo.xmi (SysML v1 de Cameo : exigence, texte, satisfy), Drone-2026x.mdzip (projet
 * Cameo : diagrammes dessinés), Drone-ea.qea (projet Enterprise Architect importé), rhapsody/Thermostat (projet IBM
 * Rhapsody : .rpy et dossier _rpy, écrit pour Arcature ; .rpy seul, .rpyx expliqué) : éléments (identifiants uniques,
 * propriétaire et enfants cohérents), liaisons entre éléments connus, diagnostics, vues (SVG autonome, data-sem, texte),
 * icônes ; tableaux et matrices de Cameo (API ; dimensions sur AIDA si le dépôt Arcature est voisin : ../arcature) ;
 * Relation Map de Cameo (Cartes-cameo.xmi : définition, arbre, relations équivalentes) ; fichier
 * étranger refusé ; version anglaise. L'intégration dans la page (conversion XML, vue 🧬, 🔲 Diagrammes,
 * détail, santé) se vérifie dans le navigateur (tests/smoke.js : partie UML).
 */
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..'), VENDOR = path.join(ROOT, 'src', 'vendor'), M = path.join(__dirname, 'models', 'uml');
const FJS = path.join(VENDOR, 'arcature-lecteur-uml.js'), FJS_EN = path.join(VENDOR, 'arcature-lecteur-uml-en.js');
if (!fs.existsSync(FJS) || !fs.existsSync(FJS_EN)) { console.error('Lecteur absent : node build.js --lecteur-uml <dossier d\'Arcature>'); process.exit(2); }

let echecs = 0;
/** Affiche le résultat d'un contrôle. @param {boolean} cond - Condition @param {string} msg - Message */
function ok(cond, msg) { console.log((cond ? '✔ ' : '✖ ') + msg); if (!cond) echecs++; }

/** Octets d'un modèle de tests/models/uml. @param {string} f - Nom du fichier @returns {Buffer} */
const octets = f => fs.readFileSync(path.join(M, f));

(async () => {
  const L = require(FJS), js = fs.readFileSync(FJS, 'utf8');
  ok(L && ['lire', 'lireDossier', 'reconnait', 'binaire', 'famille', 'libelleRelation', 'regles', 'icone', 'iconeVue'].every(f => typeof L[f] === 'function'), 'module Node : API ArcatureLecteurUml complète');
  ok(/Licence Apache 2\.0/.test(js.slice(0, 300)) && /Object Management Group/.test(js.slice(0, 1200)) && !/SPDX-License-Identifier:\s*EPL/.test(js), 'en-tête Apache 2.0, mention des documents de l\'OMG, aucun fichier sous EPL-2.0');
  ok(['a.uml', 'a.xmi', 'a.mdzip', 'a.qea', 'a.qeax'].every(n => L.reconnait(n)) && !L.reconnait('a.capella') && !L.reconnait('a.sysml') && L.annexes.includes('notation'), 'extensions : .uml, .xmi, .mdzip, .qea, .qeax ; annexe .notation');
  ok(typeof L.svgCss === 'string' && /svg\.clair/.test(L.svgCss) && /svg\.sombre/.test(L.svgCss) && L.genresVues.bdd && L.familles.REQ, 'feuille de styles (clair, sombre), genres de vues, familles');

  /** Contrôles communs à une lecture. @param {object} lec - Lecture @param {string} nom - Libellé */
  const commun = (lec, nom) => {
    const els = lec.elements(), ids = new Set(els.map(e => e.id));
    ok(els.length > 5 && ids.size === els.length && els[0].id === lec.racine, `${nom} : ${els.length} éléments, identifiants uniques`);
    ok(els.slice(1).every(e => e.proprietaire && lec.element(e.proprietaire).enfants.includes(e.id)), `${nom} : propriétaire et enfants cohérents`);
    const li = lec.toutesLiaisons();
    ok(li.length > 0 && li.every(l => ids.has(l.source) && ids.has(l.cible)), `${nom} : ${li.length} liaisons entre éléments connus`);
    ok(lec.diagnostics.every(d => d.code && d.message && /^(erreur|avertissement)$/.test(d.severite)), `${nom} : ${lec.erreurs} erreur(s), ${lec.avertissements} avertissement(s)`);
    const vues = lec.vues(), v = vues.length ? lec.vue(vues[0].cle) : null, doc = v ? v.svgDocument({ theme: 'sombre' }) : '';
    ok(v && v.formes.length && /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(doc) && /class="sombre"/.test(doc) && /data-sem=/.test(doc) && v.texte, `${nom} : ${vues.length} vue(s), première dessinée (SVG autonome, data-sem, texte)`);
    ok(els.filter(e => !e.racine && !e.technique).slice(0, 30).every(e => /^<svg class="ico"/.test(lec.icone(e.id))), `${nom} : icônes des éléments`);
    return { els, vues };
  };

  console.log('Bibliotheque.uml + Bibliotheque.notation');
  {
    const lec = await L.lireDossier([{ chemin: 'P/Bibliotheque.uml', octets: octets('Bibliotheque.uml') }, { chemin: 'P/Bibliotheque.notation', octets: octets('Bibliotheque.notation') }], 'P');
    const { vues } = commun(lec, 'Bibliotheque');
    ok(lec.format === 'uml' && /Eclipse UML2/.test(lec.outil), `format uml, ${lec.outil}`);
    ok(vues.filter(v => v.origine === 'papyrus').length === 5 && vues.some(v => v.origine === 'calculee'), '5 diagrammes de Papyrus et des vues calculées');
  }
  console.log('Rover-cameo.xmi');
  {
    const lec = await L.lire(octets('Rover-cameo.xmi'), 'Rover-cameo.xmi');
    commun(lec, 'Rover');
    const speed = lec.parNomQualifie('Rover::Requirements::Speed'), rover = lec.parNomQualifie('Rover::Structure::Rover');
    ok(lec.format === 'sysml1' && speed && speed.type === 'Requirement' && speed.metaclasse === 'Class' && speed.famille === 'REQ', 'exigence Speed : type SysML, métaclasse, famille');
    ok(lec.attributs(speed.id).some(a => /2 m\/s/.test(a.valeur)), 'texte de l\'exigence (propriété du stéréotype)');
    ok(rover && lec.liaisons(rover.id).some(l => l.relation === 'satisfy' && l.autre === speed.id), 'Rover satisfait Speed');
  }
  console.log('Drone-2026x.mdzip');
  {
    const lec = await L.lire(octets('Drone-2026x.mdzip'), 'Drone-2026x.mdzip');
    const { vues } = commun(lec, 'Drone-2026x');
    const cameo = vues.filter(v => v.origine === 'cameo');
    ok(cameo.length === 2 && cameo.every(v => { const x = lec.vue(v.cle); return x && x.formes.length && /class="s1-/.test(x.svg); }), '2 diagrammes de Cameo dessinés');
    ok(typeof lec.tableaux === 'function' && typeof lec.tableau === 'function' && Array.isArray(lec.tableaux()) && !lec.tableaux().length && lec.tableau('cameo:inconnu') === null &&
      vues.every(v => typeof v.tableau === 'boolean' && typeof v.type === 'string'), 'tableaux() et tableau(cle) exposés (aucun tableau dans ce projet) ; vues marquées tableau / type');
  }
  // Relation Map de Cameo : modèle d'essai écrit pour Arcature (repris, Apache 2.0)
  console.log('Cartes-cameo.xmi : Relation Map');
  {
    const lec = await L.lire(octets('Cartes-cameo.xmi'), 'Cartes-cameo.xmi'), rms = lec.tableaux().filter(t => t.genre === 'relations');
    const nomme = n => lec.tableau(rms.find(t => t.nom === n).cle);
    const carte = nomme('Carte du système'), act = nomme('Décomposition de Rouler'), her = nomme('Héritage');
    ok(rms.length === 5 && carte.definition && lec.element(carte.definition.racine).nom === 'Systeme' && carte.definition.profondeur === 2 && carte.noeuds.length === 30 && carte.liens.length === 29,
      'cinq Relation Map ; « Carte du système » : racine, profondeur, 30 nœuds (diagrammes du paquetage et nœud déplié au-delà de la profondeur compris)');
    const repli = carte.noeuds.find(n => n.etat === 'replie'), asso = carte.noeuds.find(n => /^Association\[/.test(carte.etiquettes[n.element].libelleCarte || ''));
    ok(repli && asso && carte.etiquettes[asso.element].libelleCarte === 'Association[Vehicule -> roue:Roue]' && carte.noeuds.filter(n => carte.etiquettes[n.element].vue).length === 5 &&
      lec.tableau(rms.find(t => t.nom === 'Carte du système').cle, { deplier: [repli.chemin] }).noeuds.length === 32, 'libellés de carte, diagrammes membres, nœud replié (⊕) déplié à la demande');
    ok(carte.definition.criteres.map(c => c.relation).join() === ',composition' && her.definition.criteres.every(c => c.relation === 'generalisation'), 'relations équivalentes des critères (préréglage de la 🗺 Relation Map)');
    ok(act.noeuds.map(n => act.etiquettes[n.element].nom).join() === 'Rouler,Avancer,Demarrer,Allumer' && /\[Appels\] Allumer/.test(lec.vue(rms.find(t => t.nom === 'Décomposition de Rouler').cle).texte), 'Activity Decomposition Map : appels, rangés par nom comme Cameo ; texte en arbre');
  }
  // Tableaux et matrices de Cameo : AIDA (CC BY-SA 4.0, tests d'Arcature) lu dans le dossier d'Arcature voisin s'il est là, jamais copié ici
  const AIDA = path.join(ROOT, '..', 'arcature', 'tests', 'models', 'sysml1', 'AIDA_Reference_Architecture_V2.3.2.mdzip');
  if (fs.existsSync(AIDA)) {
    console.log('AIDA (Arcature) : tableaux et matrices de Cameo');
    const lec = await L.lire(fs.readFileSync(AIDA), 'AIDA.mdzip'), tabs = lec.tableaux(), ids = new Set(lec.elements().map(e => e.id));
    const nomme = n => lec.tableau(tabs.find(t => t.nom === n).cle);
    const dims = [['Safety Requirement', 59, 6], ['Safety requirements coverage', 40, 4], ['Subsystems Communication', 20, 8], ['Instance Table', 20, 7], ['Basic Unit Categories', 93, 17]];
    const faux = dims.filter(([n, l, c]) => { const t = nomme(n); return t.lignes.length !== l || t.colonnes.length !== c; }).map(([n]) => n);
    ok(tabs.length === 20 && tabs.every(t => t.tableau && /^(tableau|matrice)$/.test(t.genre)) && lec.vues().filter(v => v.tableau).length === 20, '20 tableaux et matrices, aussi dans vues()');
    ok(!faux.length, 'Requirement Table 59 × 6, Generic Table 40 × 4, Whitebox ICD 20 × 8, Instance Table 20 × 7, Dependency Matrix 93 × 17' + (faux.length ? ' — ' + faux.join(', ') : ''));
    const bu = nomme('Basic Unit Categories'), sr = nomme('Safety Requirement');
    ok(bu.cellules.length === 16 && bu.reliees.lignes.length === 1 && bu.cellules.every(c => ids.has(c.ligne) && ids.has(c.colonne)) && /^\uFEFF;/.test(bu.csv()) &&
      sr.lignes.every(l => ids.has(l.element)) && sr.colonnes[1].propriete === 'name', 'matrice : 16 relations, éléments reliés ; tableau : lignes désignées par leur identifiant ; CSV');
  } else console.log('(AIDA absent : dossier ../arcature introuvable, contrôles des tableaux de Cameo sautés)');
  console.log('Drone-ea.qea');
  {
    const lec = await L.lire(octets('Drone-ea.qea'), 'Drone-ea.qea');
    const { vues } = commun(lec, 'Drone-ea');
    ok(lec.importe && /Enterprise Architect/.test(lec.outil) && vues.filter(v => v.origine === 'ea').length === 7, 'projet Enterprise Architect importé, 7 diagrammes');
  }
  console.log('rhapsody/Thermostat (projet IBM Rhapsody : .rpy et dossier _rpy)');
  {
    const R = path.join(M, 'rhapsody'), tous = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? tous(path.join(d, e.name)) : [path.join(d, e.name)]);
    const fic = tous(path.join(R, 'Thermostat')).map(f => ({ chemin: path.relative(R, f).split(path.sep).join('/'), octets: fs.readFileSync(f) }));
    const lec = await L.lireDossier(fic, 'Thermostat');
    commun(lec, 'Thermostat');
    const ex = lec.elements().find(e => e.nom === 'Consigne' && e.type === 'Requirement');
    ok(L.reconnait('P.rpy') && lec.format === 'sysml1' && lec.importe && /Rhapsody/.test(lec.importe.message) && !lec.diagnostics.length && ex
      && lec.attributs(ex.id).some(a => /text/.test(a.nom) && /0,5/.test(a.valeur)) && lec.toutesLiaisons().some(l => l.relation === 'satisfy'),
      'projet Rhapsody : 5 fichiers lus, exigence (texte), satisfy, aucun diagnostic');
    const seul = await L.lire(fic.find(f => /\.rpy$/.test(f.chemin)).octets, 'Thermostat.rpy');
    let rpyx = ''; try { await L.lire('<?xml version="1.0"?>', 'P.rpyx'); } catch (e) { rpyx = e.message; }
    ok(/_rpy/.test(seul.importe.message) && /format XML/.test(rpyx), '.rpy seul : unités absentes signalées ; .rpyx expliqué');
  }
  console.log('refus et version anglaise');
  {
    let refus = ''; try { await L.lire('<racine/>', 'autre.xmi'); } catch (e) { refus = e.message; }
    ok(refus.length > 10, 'XML étranger refusé avec un message');
    const EN = require(FJS_EN), en = await EN.lire(octets('Rover-cameo.xmi'), 'Rover-cameo.xmi');
    ok(en.elements().length > 5 && EN.familles.REQ === 'Requirements', 'version anglaise : lecture et libellés traduits');
  }
  if (echecs) { console.error(`\n✖ ${echecs} contrôle(s) en échec`); process.exit(1); }
  console.log('\n✔ Lecteur UML / SysML v1 : tous les contrôles passent.');
})().catch(e => { console.error(e.stack); process.exit(1); });
