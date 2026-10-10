#!/usr/bin/env node
/**
 * Enveloppe par _L('…') les libellés affichés d'un ou plusieurs modules JS (préparation de la traduction
 * anglaise, docs/i18n/LISEZMOI.md). À relancer après l'ajout de textes non enveloppés.
 *
 *   node tools/i18n-envelopper.js                   → tous les modules de src/js (sauf d3)
 *   node tools/i18n-envelopper.js src/js/34-*.js    → modules choisis
 *   --dry                                           → n'écrit rien, affiche le décompte
 *   --rapport fichier.txt                           → liste des textes écartés (à vérifier à la main)
 *
 * Un littéral n'est PAS enveloppé s'il sert de valeur interne (piège n° 1 de LISEZMOI) : clé d'objet,
 * comparaison, case, argument d'un appel technique (sélecteur, includes, indexOf…), tableau ou Set servant
 * de liste de recherche, valeur d'une propriété technique (id, key, kind, type…), ou si le même texte est
 * utilisé de cette manière ailleurs dans le code. Ces textes écartés sont listés dans le rapport.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { visible, parse, walk } = require('./i18n.js');
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src', 'js');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const ri = args.indexOf('--rapport'), rapport = ri >= 0 ? args[ri + 1] : null;
const files = args.filter(a => a.endsWith('.js')).map(a => path.resolve(a));
const all = fs.readdirSync(JS).filter(f => f.endsWith('.js')).map(f => path.join(JS, f));
const targets = files.length ? files : all;

// Déclarations qui contiennent des données (pas des libellés d'interface)
const DATA_DECL = new Set(['CAP_HUMAN_NAMES', 'CAP_EN_VERBS', 'CAP_FR_VERBS', 'CAP_FR_ER_NOUNS', 'CAP_VAGUE_VERBS', 'THEMES', 'CAP_DASH_PAL', 'CAP_D3_LICENSE']);
// Appels dont l'argument texte est un sélecteur, un identifiant ou un nom technique
const TECH_CALLS = new Set(['getElementById', 'querySelector', 'querySelectorAll', 'closest', 'matches', 'getAttribute', 'setAttribute', 'hasAttribute',
  'removeAttribute', 'createElement', 'createElementNS', 'addEventListener', 'removeEventListener', 'getPropertyValue', 'setProperty', 'RegExp', 'split',
  'startsWith', 'endsWith', 'indexOf', 'lastIndexOf', 'includes', 'replace', 'replaceAll', 'test', 'toggle', 'contains', 'add', 'remove', 'has', 'get', 'set', 'delete', 'select',
  'selectAll', 'attr', 'style', 'classed', 'on', 'dispatchEvent', 'require', 'getComputedStyle', 'toLocaleString', 'toLocaleDateString', 'toLocaleTimeString',
  'localeCompare', 'padStart', 'padEnd', 'join', 'getElementsByTagName', 'getElementsByTagNameNS', 'getAttributeNS', 'setAttributeNS', 'capCfgGet', 'capCfgSet',
  'capAnaHuman', 'find', 'filter', 'some', 'every', 'capStoreGet', 'capStoreSet', 'execCommand', 'postMessage', 'Blob', 'Date', 'Number', 'parseFloat', 'parseInt']);
// Fonctions globales (appel direct) dont l'argument texte est technique ; les autres noms de TECH_CALLS
// ne comptent qu'en appel de méthode (s.add(…), m.get(…)) : un add(…) local peut recevoir des libellés.
const GLOBAL_TECH_CALLS = new Set(['RegExp', 'require', 'getComputedStyle', 'Blob', 'Date', 'Number', 'parseFloat', 'parseInt', 'capCfgGet', 'capCfgSet', 'capAnaHuman', 'capStoreGet', 'capStoreSet']);
// Méthodes de recherche : ['a','b'].includes(x) → les éléments du tableau sont des valeurs internes
const SEARCH_METHODS = new Set(['includes', 'indexOf', 'lastIndexOf', 'some', 'every', 'find', 'findIndex', 'filter']);
// Propriétés dont la valeur est un identifiant interne, jamais affiché tel quel
const TECH_PROPS = new Set(['id', 'key', 'k', 'kind', 'type', 'code', 'value', 'val', 'cls', 'class', 'className', 'cat', 'layer', 'field', 'prop', 'rel',
  'mode', 'view', 'ref', 'tag', 'attr', 'sort', 'dir', 'op', 'lk', 'lay', 'ly', 'role', 'side', 'part', 'src', 'href', 'mime', 'ext', 'fmt', 'font', 'color', 'col', 'bg', 'fill', 'stroke', 'icon', 'ic', 'var', 'css', 'tagName', 'nodeName']);

/** Nom de l'appel (callee) d'un nœud CallExpression / NewExpression. */
function calleeName(c) { const x = c.callee; if (!x) return ''; if (x.type === 'Identifier') return x.name; if (x.type === 'MemberExpression' && x.property) return x.property.name || x.property.value || ''; return ''; }
/** Vrai si le nœud est l'objet d'un appel console.* */
function inConsole(parents) { return parents.some(p => p.type === 'CallExpression' && p.callee.type === 'MemberExpression' && p.callee.object.type === 'Identifier' && p.callee.object.name === 'console'); }
/** Raison pour laquelle le littéral est technique dans son contexte immédiat ('' sinon). */
function techReason(node, parents) {
  const p = parents[parents.length - 1], gp = parents[parents.length - 2];
  if (!p) return '';
  if (p.type === 'Property' && p.key === node) return 'clé';
  if (p.type === 'Property' && p.value === node) { const k = p.key.name || p.key.value; if (TECH_PROPS.has(k)) return 'propriété ' + k; }
  if (p.type === 'MemberExpression' && p.property === node) return 'propriété';
  if (p.type === 'BinaryExpression' && ['===', '!==', '==', '!=', 'in'].includes(p.operator)) return 'comparaison';
  if (p.type === 'SwitchCase') return 'case';
  if (p.type === 'ExpressionStatement') return 'directive';
  if (p.type === 'TaggedTemplateExpression') return 'gabarit étiqueté';
  if ((p.type === 'CallExpression' || p.type === 'NewExpression') && p.arguments.includes(node)
    && (p.callee.type === 'MemberExpression' ? TECH_CALLS.has(calleeName(p)) : GLOBAL_TECH_CALLS.has(calleeName(p)))) return 'appel ' + calleeName(p);
  if (p.type === 'ArrayExpression' && gp && (gp.type === 'MemberExpression' && gp.object === p && SEARCH_METHODS.has(gp.property.name) || gp.type === 'NewExpression')) return 'liste de recherche';
  if (p.type === 'AssignmentExpression' && p.right === node && p.left.type === 'MemberExpression') {
    const k = p.left.property.name || p.left.property.value; if (['className', 'id', 'cssText', 'href', 'download', 'src', 'type', 'name', 'value'].includes(k)) return 'affectation ' + k; }
  if (inConsole(parents)) return 'console';
  if (parents.some(q => q.type === 'CallExpression' && q.callee.type === 'Identifier' && q.callee.name === '_L')) return 'déjà enveloppé';
  return '';
}

// 1. Valeurs utilisées comme valeurs internes quelque part dans le code
const techValues = new Map();   // valeur → raison
const asts = new Map();
for (const f of all) {
  const code = fs.readFileSync(f, 'utf8');
  const ast = parse(code); asts.set(f, { code, ast });
  walk(ast, (n, ps) => {
    if (n.type === 'VariableDeclarator' && n.id && DATA_DECL.has(n.id.name)) return false;
    if (n.type === 'Property' && !n.computed && n.key.type === 'Identifier') techValues.set(n.key.name, techValues.get(n.key.name) || 'clé ailleurs');
    if (n.type === 'Literal' && typeof n.value === 'string') {
      const r = techReason(n, ps);
      if (r && r !== 'déjà enveloppé' && r !== 'console' && r !== 'directive' && !/^affectation/.test(r)) techValues.set(n.value, techValues.get(n.value) || r + ' (' + path.basename(f) + ':' + n.loc.start.line + ')');
    }
  });
}

// 2. Enveloppe des littéraux affichés
const report = [];
let total = 0;
for (const f of targets) {
  const { code, ast } = asts.get(f);
  const ins = [];   // [début, fin]
  walk(ast, (n, ps) => {
    if (n.type === 'VariableDeclarator' && n.id && DATA_DECL.has(n.id.name)) return false;
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === '_L') return false;
    let txt = '';
    if (n.type === 'Literal' && typeof n.value === 'string') txt = visible(n.value);
    else if (n.type === 'TemplateLiteral') txt = n.quasis.map(q => visible(q.value.cooked || '')).filter(Boolean).join(' … ');
    else return;
    if (!txt) return;
    const where = path.basename(f) + ':' + n.loc.start.line;
    const r = techReason(n, ps);
    if (r) { if (r !== 'déjà enveloppé' && r !== 'console') report.push(`${where}\t${r}\t${txt}`); return n.type === 'TemplateLiteral' ? undefined : false; }
    if (n.type === 'Literal' && techValues.has(n.value)) { report.push(`${where}\tvaleur interne : ${techValues.get(n.value)}\t${txt}`); return false; }
    ins.push([n.start, n.end]);
    return n.type === 'TemplateLiteral' ? undefined : false;
  });
  if (!ins.length) continue;
  total += ins.length;
  // insertion de la fin vers le début (les gabarits imbriqués restent valides)
  const marks = [];
  ins.forEach(([s, e]) => { marks.push([s, /[\w$]/.test(code[s - 1] || '') ? ' _L(' : '_L(', 0]); marks.push([e, ')', 1]); });
  marks.sort((a, b) => b[0] - a[0] || a[2] - b[2]);
  let out = code;
  for (const [pos, txt] of marks) out = out.slice(0, pos) + txt + out.slice(pos);
  try { parse(out); } catch (e) { console.error(`✖ ${path.basename(f)} : ${e.message}`); process.exit(1); }
  if (!dry) fs.writeFileSync(f, out);
  console.log(`${dry ? '(simulation) ' : ''}${path.basename(f)} : ${ins.length} libellé(s) enveloppé(s)`);
}
if (rapport) fs.writeFileSync(rapport, report.join('\n'));
console.log(`✔ ${total} libellé(s) enveloppé(s) par _L, ${report.length} texte(s) écarté(s)${rapport ? ' → ' + rapport : ''}`);
