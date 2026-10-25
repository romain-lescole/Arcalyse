#!/usr/bin/env node
/**
 * 🧩 Lecteur SysML v2 embarqué (src/vendor/arcature-lecteur-sysml.js, repris d'Arcature) : test Node, sans navigateur.
 *   node tests/sysml.js
 * Contrôles : chargement en module Node (require) ; VehiculeDemo.sysml (nombre d'éléments, identifiants uniques et stables,
 * propriétaire et enfants cohérents, liaisons par relation, références résolues, extrait, aucun diagnostic) ; texte fautif lu
 * sans exception (diagnostics avec fichier, ligne, code, élément) ; projet en dossier (noms résolus d'un fichier à l'autre) ;
 * vues calculées (cinq vues attendues : SVG, document SVG autonome avec data-sem, texte et formes non vides ; vues d'un élément) ;
 * version anglaise (mêmes éléments et identifiants, libellés traduits). L'intégration dans la page (conversion XML, vue,
 * détail, santé) est couverte par tests/oracles.js (oracle VehiculeDemo.json) et tests/smoke.js.
 */
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..'), VENDOR = path.join(ROOT, 'src', 'vendor');
const FJS = path.join(VENDOR, 'arcature-lecteur-sysml.js'), FJS_EN = path.join(VENDOR, 'arcature-lecteur-sysml-en.js');
const MODELE = path.join(__dirname, 'models', 'VehiculeDemo.sysml');
if (!fs.existsSync(FJS) || !fs.existsSync(FJS_EN)) { console.error('Lecteur absent : node build.js --lecteur-sysml <dossier d\'Arcature>'); process.exit(2); }

let echecs = 0;
/** Affiche le résultat d'un contrôle. @param {boolean} cond - Condition @param {string} msg - Message */
function ok(cond, msg) { console.log((cond ? '✔ ' : '✖ ') + msg); if (!cond) echecs++; }

const L = require(FJS);
ok(L && ['lire', 'lireTexte', 'lireKpar', 'lireDossier', 'analyser', 'reconnait', 'binaire', 'motCle', 'famille', 'libelleRelation', 'regles'].every(f => typeof L[f] === 'function'), 'module Node : API ArcatureLecteurSysml complète');
ok(L.reconnait('a.sysml') && L.reconnait('a.kpar') && !L.reconnait('a.capella') && L.binaire('a.kpar') && !L.binaire('a.sysml'), 'reconnait / binaire : .sysml en texte, .kpar en octets, .capella refusé');
ok(Array.isArray(L.relations) && L.relations.includes('typage') && L.relations.includes('connexion') && L.familles && L.familles.STR, 'relations et familles exposées');

// ── VehiculeDemo ──
console.log('VehiculeDemo.sysml');
const texte = fs.readFileSync(MODELE, 'utf8');
const lec = L.lire(texte, 'VehiculeDemo.sysml');
const els = lec.elements();
ok(lec.erreurs === 0 && lec.avertissements === 0 && lec.diagnostics.length === 0, 'lu sans diagnostic');
ok(els.length === 46, `46 éléments (obtenu ${els.length})`);
ok(new Set(els.map(e => e.id)).size === els.length && els.every(e => /^sy[0-9a-z]+$/.test(e.id)), 'identifiants uniques « sy… »');
ok(JSON.stringify(L.lire(texte, 'VehiculeDemo.sysml').elements().map(e => e.id)) === JSON.stringify(els.map(e => e.id)), 'identifiants stables à la relecture');
ok(els.slice(1).every(e => e.proprietaire && lec.element(e.proprietaire) && lec.element(e.proprietaire).enfants.includes(e.id)), 'propriétaire et enfants cohérents');
const parType = {}; els.forEach(e => { parType[e.type] = (parType[e.type] || 0) + 1; });
ok(parType.PartDefinition === 5 && parType.PartUsage === 4 && parType.PortUsage === 2 && parType.RequirementDefinition === 1 && parType.TransitionUsage === 3,
  `métaclasses : 5 part def, 4 part, 2 port, 1 requirement def, 3 transitions (${JSON.stringify(parType)})`);
const V = lec.parNomQualifie('VehiculeDemo::Vehicule'), boite = lec.parNomQualifie('VehiculeDemo::Vehicule::boite'), Boite = lec.parNomQualifie('VehiculeDemo::Boite');
ok(V && V.type === 'PartDefinition' && V.motCle === 'part def' && V.famille === 'STR' && V.definition && V.ligne === 8 && V.fichier === 'VehiculeDemo.sysml', 'part def Vehicule : type, mot-clé, famille, position');
ok(boite && boite.usage && boite.declaration === 'part boite : Boite' && boite.references.typedBy && boite.references.typedBy[0] === Boite.id, 'part boite : déclaration, référence typedBy résolue');
ok(/^part def Vehicule \{/.test(lec.extrait(V.id)) && lec.texte() === texte, 'extrait de la déclaration, texte d\'origine intact');
const LI = lec.toutesLiaisons(), parRel = {}; LI.forEach(l => { parRel[l.relation] = (parRel[l.relation] || 0) + 1; });
ok(LI.length === 29 && parRel.typage === 13 && parRel.composition === 5 && parRel.connexion === 1 && parRel.specialisation === 1 && parRel.satisfy === 1 && parRel.transition === 2,
  `29 liaisons : 13 typages, 5 compositions, 1 connexion, 1 spécialisation, 1 satisfy, 2 transitions (${JSON.stringify(parRel)})`);
ok(LI.every(l => lec.element(l.source) && lec.element(l.cible)), 'chaque liaison relie deux éléments connus');
const liaV = lec.liaisons(V.id);
ok(liaV.some(l => l.relation === 'composition' && l.sens === 'sortant' && l.autre === boite.id) && liaV.some(l => l.relation === 'typage' && l.sens === 'entrant'), 'liaisons de Vehicule : contient boite, typé par un usage');
ok(els.filter(e => e.technique).every(e => ['Import', 'SuccessionAsUsage'].includes(e.type)) && els.filter(e => e.technique).length === 5, 'éléments techniques : 2 imports, 3 successions');
const J = lec.json();
ok(J && J.elements.length === els.length && J.liaisons.length === LI.length && Array.isArray(J.diagnostics) && JSON.stringify(J).length > 1000, 'json() sérialisable (éléments, liaisons, diagnostics)');

// ── Vues calculées ──
console.log('vues calculées');
{
  const vues = lec.vues();
  ok(vues.length === 5 && vues.every(v => v.cle && v.genre && v.sigle && v.nom && v.element), `5 vues calculées (obtenu ${vues.length} : ${vues.map(v => v.sigle).join(', ')})`);
  const genres = {}; vues.forEach(v => { genres[v.genre] = (genres[v.genre] || 0) + 1; });
  ok(genres.generale === 1 && genres.interconnexion === 2 && genres.etats === 1 && genres.actions === 1, 'genres : 1 générale, 2 interconnexion, 1 états, 1 actions');
  ok(L.genresVues && L.genresVues.generale && L.genresVues.generale.sigle === 'GV' && typeof L.svgCss === 'string' && L.svgCss.includes('svg.clair') && L.svgCss.includes('svg.sombre'), 'genresVues et feuille de styles svgCss (clair, sombre)');
  vues.forEach(v => { const vue = lec.vue(v.cle);
    ok(vue && vue.formes.length > 0 && Array.isArray(vue.liens) && Array.isArray(vue.viewBox) && vue.viewBox.length === 4 && vue.svg.length > 200 && vue.texte.length > 20 && vue.svg.includes('data-sem='),
      `${v.sigle} ${v.nom} : ${vue ? vue.formes.length : 0} forme(s), ${vue ? vue.liens.length : 0} lien(s), SVG et texte non vides`);
    const doc = vue.svgDocument({ theme: 'sombre' });
    ok(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(doc) && doc.includes('class="sombre"') && doc.includes('<style>') && /data-sem="sy/.test(doc) && !/https?:\/\/(?!www\.w3\.org)/.test(doc), `${v.sigle} : document SVG autonome (thème sombre, styles embarqués, data-sem, aucune ressource externe)`);
    ok(vue.formes.some(f => f.element && lec.element(f.element)) && vue.formes.every(f => !f.element || lec.element(f.element)) && vue.liens.every(l => !l.element || lec.element(l.element)), `${v.sigle} : formes et liens rattachés aux éléments du modèle (nœuds start / done / entrée sans élément)`); });
  const pv = lec.vuesPour(V.id);
  ok(pv.length === 2 && pv.some(v => v.genre === 'generale') && pv.some(v => v.genre === 'interconnexion'), 'vuesPour(Vehicule) : vue générale et interconnexion');
  ok(lec.vue('inconnue') === null, 'vue(clé inconnue) : null');
}

// ── Texte fautif ──
console.log('texte fautif');
{
  const faute = 'package Faute {\n  part a : Inconnu;\n  part b : Boite;\n  part def Boite { port p : ~X; }\n  import Truc::*;\n}}\n';   // « }} » : erreur de syntaxe
  let lf = null, exception = null; try { lf = L.lire(faute, 'faute.sysml'); } catch (e) { exception = e; }
  ok(!exception && lf, 'texte fautif lu sans exception');
  ok(lf.diagnostics.length >= 3 && lf.diagnostics.every(d => ['erreur', 'avertissement'].includes(d.severite) && d.code && d.fichier === 'faute.sysml' && d.ligne >= 1),
    `${lf.diagnostics.length} diagnostics avec sévérité, code, fichier et ligne`);
  ok(lf.diagnostics.some(d => d.code === 'R-INTROUVABLE' && /Inconnu/.test(d.message) && d.element && lf.element(d.element)), 'nom introuvable signalé sur son élément');
  ok(lf.diagnostics.some(d => d.severite === 'erreur'), 'au moins une erreur (syntaxe)');
  const an = L.analyser(faute, 'faute.sysml');
  ok(an && Array.isArray(an.diagnostics) && typeof an.erreurs === 'number' && an.elements > 0, 'analyser() : diagnostics sans résolution');
}

// ── Projet en dossier : deux textes, noms résolus de l'un à l'autre ──
console.log('dossier');
{
  const ld = L.lireDossier([{ chemin: 'a/Defs.sysml', texte: 'package Defs { part def Roue; }' }, { chemin: 'a/Usage.sysml', texte: 'package Usage { private import Defs::*; part roue : Roue; }' }], 'Projet');
  const roue = ld.parNom('roue')[0], Roue = ld.parNomQualifie('Defs::Roue');
  ok(ld.fichiers.length === 2 && ld.element(ld.racine) && ld.element(ld.racine).projet, 'deux fichiers sous un nœud de projet');
  ok(roue && Roue && roue.references.typedBy && roue.references.typedBy[0] === Roue.id && roue.fichier === 'a/Usage.sysml' && Roue.fichier === 'a/Defs.sysml', 'typage résolu d\'un fichier à l\'autre');
  ok(ld.diagnostics.length === 0, 'dossier lu sans diagnostic');
}

// ── Version anglaise ──
console.log('version anglaise');
{
  const LE = require(FJS_EN), le = LE.lire(texte, 'VehiculeDemo.sysml');
  ok(JSON.stringify(le.elements().map(e => e.id + ':' + e.type)) === JSON.stringify(els.map(e => e.id + ':' + e.type)), 'mêmes éléments et identifiants');
  ok(LE.familles.STR !== L.familles.STR || LE.libelleRelation('typage', 'sortant') !== L.libelleRelation('typage', 'sortant'), 'libellés traduits');
}

if (echecs) { console.error(`\n✖ ${echecs} contrôle(s) en échec`); process.exit(1); }
console.log('\n✔ Lecteur SysML v2 : tous les contrôles passent.');
