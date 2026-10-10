#!/usr/bin/env node
/**
 * Liste les littéraux NON enveloppés par _L qui contiennent du texte français affiché (texte entre balises,
 * attributs title / placeholder / alt / aria-label) : libellés oubliés après l'enveloppe automatique
 * (tools/i18n-envelopper.js). Un texte est retenu s'il porte un signe de français (accent, guillemets « »,
 * mot outil courant…). Les contextes techniques (comparaison, clé, sélecteur, console…) sont listés à part,
 * préfixés « ! », pour vérification à la main : ne pas les envelopper sans vérifier (LISEZMOI, piège n° 1).
 *
 *   node tools/i18n-restants.js [src/js/xx.js…]
 *   --envelopper   enveloppe par _L les littéraux retenus hors contexte technique (relire ensuite le diff).
 */
'use strict';
const fs = require('fs'), path = require('path');
const { translatePattern, parse, walk, patternOf } = require('./i18n.js');
const JS = path.join(__dirname, '..', 'src', 'js');
const files = process.argv.slice(2).filter(a => a.endsWith('.js'));
const wrap = process.argv.includes('--envelopper');
const DATA_DECL = /^(CAP_HUMAN_NAMES|CAP_EN_VERBS|CAP_FR_VERBS|CAP_FR_ER_NOUNS|CAP_VAGUE_VERBS|THEMES|CAP_DASH_PAL|CAP_D3_LICENSE)$/;
// Signe de français dans un texte affiché
const FR = /[àâçéèêëîïôûùüœÀÂÇÉÈÊÎÔÛ«»]|\b(le|la|les|des|du|de|et|ou|sur|dans|pour|par|avec|sans|aucune?|sous|vers|est|sont|une?|aux?|ne|pas|fonctions?|composants?|liens?|lignes?|chaînes?|onglets?|colonnes?|pages?|cellules?|nœuds?|acteurs?|couches?|valeurs?|ports? \w+s|activités?|propriétés?|exigences?|contraintes?)\b/;
// Polices, CSS et scripts embarqués : jamais des libellés
const IGNORE = /sans-serif|^\s*\(function|^@page|^text\{/;
// Appels dont les arguments sont techniques
const TECH_METHODS = /^(querySelector(All)?|closest|matches|getAttribute|setAttribute|removeAttribute|hasAttribute|split|replace|replaceAll|includes|indexOf|startsWith|endsWith|test|add|remove|toggle|contains|has|get|set|delete|style|attr|on|log|warn|error|info|debug|localeCompare|getElementById|createElement|addEventListener)$/;
let n = 0;
for (const f of files.length ? files.map(x => path.resolve(x)) : fs.readdirSync(JS).filter(x => x.endsWith('.js')).map(x => path.join(JS, x))) {
  const code = fs.readFileSync(f, 'utf8'), ins = [], done = new Set();
  walk(parse(code), (node, ps) => {
    if (node.type === 'VariableDeclarator' && node.id && DATA_DECL.test(node.id.name || '')) return false;
    // argument déjà enveloppé : pas vérifié lui-même, mais les ${…} d'un gabarit enveloppé le sont
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === '_L' && node.arguments[0]) done.add(node.arguments[0]);
    if (done.has(node)) return node.type === 'TemplateLiteral' ? undefined : false;
    if (!(node.type === 'Literal' && typeof node.value === 'string' || node.type === 'TemplateLiteral')) return;
    const p = ps[ps.length - 1];
    const miss = translatePattern(patternOf(node), {}).missing.filter(k => FR.test(k.replace(/\{\d+\}/g, ' ')) && !IGNORE.test(k));
    if (!miss.length) return;
    const tech = p && (p.type === 'BinaryExpression' && /=|in/.test(p.operator) || p.type === 'SwitchCase' || p.type === 'Property' && p.key === node
      || p.type === 'MemberExpression' && p.property === node
      || p.type === 'CallExpression' && p.callee.type === 'MemberExpression' && p.arguments.includes(node) && TECH_METHODS.test(p.callee.property.name || '')
      || p.type === 'ArrayExpression' && ps[ps.length - 2] && ps[ps.length - 2].type === 'MemberExpression' && /^(includes|indexOf|some|find|filter)$/.test(ps[ps.length - 2].property.name || ''))
      || ps.some(q => q.type === 'CallExpression' && q.callee.type === 'MemberExpression' && q.callee.object.name === 'console');
    n++;
    if (wrap && !tech) ins.push(node);
    console.log(`${tech ? '! ' : wrap ? '+ ' : ''}${path.basename(f)}:${node.loc.start.line}\t${miss.map(k => k.slice(0, 90)).join(' | ')}`);
    if (wrap && !tech) done.add(node);
  });
  if (ins.length) {
    // insertions de la fin vers le début (ouvrantes et fermantes séparées : les littéraux imbriqués restent justes)
    const marks = [];
    ins.forEach(a => { marks.push([a.start, /[\w$]/.test(code[a.start - 1] || '') ? ' _L(' : '_L(', 0]); marks.push([a.end, ')', 1]); });
    marks.sort((a, b) => b[0] - a[0] || a[2] - b[2]);
    let out = code;
    for (const [pos, t] of marks) out = out.slice(0, pos) + t + out.slice(pos);
    parse(out); fs.writeFileSync(f, out);
  }
}
console.error(`${n} littéral(aux) à vérifier`);
