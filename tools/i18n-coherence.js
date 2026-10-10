#!/usr/bin/env node
/**
 * Contrôle de cohérence de la traduction (piège n° 1 de docs/i18n/LISEZMOI.md) : signale les littéraux NON
 * enveloppés utilisés comme valeur interne (comparaison, case, clé d'objet, includes / indexOf / has…) dont le
 * texte est aussi enveloppé par _L ailleurs ET traduit autrement : en anglais, la valeur traduite ne serait plus
 * égale au littéral comparé. Corriger en enveloppant aussi le littéral comparé (_L('x') === _L('x')), ou en
 * comparant une valeur technique plutôt qu'un libellé.
 *
 *   node tools/i18n-coherence.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const { parse, walk, lCalls, translatePattern } = require('./i18n.js');
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src', 'js');
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', 'en-dictionnaire.json'), 'utf8')).code;
const files = fs.readdirSync(JS).filter(f => f.endsWith('.js')).sort();
const asts = files.map(f => { const code = fs.readFileSync(path.join(JS, f), 'utf8'); return { f, ast: parse(code) }; });
// Textes enveloppés (littéraux simples) dont la traduction diffère
const wrapped = new Map();
asts.forEach(({ f, ast }) => lCalls(ast).forEach(a => { if (a.type !== 'Literal') return;
  const t = translatePattern(a.value, dict).text; if (t !== a.value) wrapped.set(a.value, `${f}:${a.loc.start.line}`); }));
const SEARCH = /^(includes|indexOf|lastIndexOf|has|get|startsWith|endsWith|find|findIndex|some|filter)$/;
let n = 0;
asts.forEach(({ f, ast }) => walk(ast, (node, ps) => {
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === '_L') return false;
  if (node.type !== 'Literal' || typeof node.value !== 'string' || !wrapped.has(node.value)) return;
  const p = ps[ps.length - 1], gp = ps[ps.length - 2];
  let why = '';
  if (p.type === 'BinaryExpression' && /^[!=]==?$/.test(p.operator)) why = 'comparaison';
  else if (p.type === 'SwitchCase' && p.test === node) why = 'case';
  else if (p.type === 'Property' && p.key === node) why = 'clé';
  else if (p.type === 'CallExpression' && p.callee.type === 'MemberExpression' && SEARCH.test(p.callee.property.name || '')) why = 'appel ' + p.callee.property.name;
  else if (p.type === 'ArrayExpression' && gp && gp.type === 'MemberExpression' && SEARCH.test(gp.property.name || '')) why = 'liste ' + gp.property.name;
  if (!why) return;
  n++; console.log(`${f}:${node.loc.start.line}\t${why}\t« ${node.value} » (enveloppé en ${wrapped.get(node.value)})`);
}));
console.error(n ? `⚠ ${n} incohérence(s) possible(s)` : '✔ Aucune incohérence détectée');
