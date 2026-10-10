#!/usr/bin/env node
/**
 * Inventaire de TOUS les textes affichés par l'application, dans un seul fichier, pour relecture
 * (orthographe, cohérence des termes, ton) et pour suivre la traduction anglaise.
 *
 *   node tools/textes.js           → docs/TEXTES.md  (lisible, groupé par fichier, avec numéros de ligne)
 *                                     docs/textes.csv (même contenu, à ouvrir dans Excel : filtres, tri)
 *   node tools/textes.js --en      → ajoute la colonne « anglais » d'après src/i18n/en-dictionnaire.json (même recherche que le build anglais)
 *                                     et liste à part les textes sans traduction
 *
 * Sources analysées : src/js/*.js (chaînes et gabarits du code), src/html/interface.html (textes,
 * infobulles title, placeholders). L'aide (src/html/aide.html) est déjà un fichier unique : elle n'est
 * pas recopiée. Les listes de verbes (33-qualite-noms.js) sont des données et sont ignorées.
 *
 * L'outil ne modifie aucun fichier source : on corrige un texte à l'endroit indiqué (fichier:ligne).
 */
'use strict';
const fs = require('fs'), path = require('path');
const acorn = require('./lib/acorn.js');
const { patternOf } = require('./i18n.js');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src');
const withEn = process.argv.includes('--en');

// Déclarations qui contiennent des données (pas des libellés d'interface)
const DATA_DECL = new Set(['CAP_HUMAN_NAMES', 'CAP_EN_VERBS', 'CAP_FR_VERBS', 'CAP_FR_ER_NOUNS', 'CAP_VAGUE_VERBS', 'THEMES', 'CAP_DASH_PAL']);
// Appels dont l'argument texte est un sélecteur, un identifiant ou un nom technique
const TECH_CALLS = new Set(['getElementById', 'querySelector', 'querySelectorAll', 'closest', 'matches', 'getAttribute', 'setAttribute', 'hasAttribute',
  'removeAttribute', 'createElement', 'createElementNS', 'addEventListener', 'removeEventListener', 'getPropertyValue', 'setProperty', 'RegExp', 'split',
  'startsWith', 'endsWith', 'indexOf', 'includes', 'replace', 'test', 'toggle', 'contains', 'add', 'remove', 'has', 'get', 'set', 'delete', 'select',
  'selectAll', 'attr', 'style', 'classed', 'on', 'dispatchEvent', 'require', 'getComputedStyle', 'toLocaleString', 'localeCompare', 'padStart', 'join']);

/** Ramène un fragment (éventuellement HTML) au texte visible ; '' si ce n'est pas un texte d'interface. */
function visible(s) {
  let t = String(s).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^<>]*>/g, ' ');
  // morceaux restants : on écarte ceux qui sont des bouts de balises, d'attributs ou de CSS
  t = t.split(/[<>]/).filter(seg => !/=\s*["']|[{};]|^\s*[\w-]+:\S|^\s*[\w-]+:\s*$|rgba?\(|url\(|^\s*\/?\s*$/.test(seg)).join(' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ').replace(/^["'\s]+|["'\s]+$/g, '').trim();
  if (!/[A-Za-zÀ-ÿ]{3}/.test(t)) return '';
  if (/^[#.\[]?[\w-]+$/.test(t) && !/[À-ÿ]/.test(t) && !/^[A-Z][a-zà-ÿ]+$/.test(t) && !/^[A-ZÀ-Ý]{3,}$/.test(t)) return '';  // identifiant, classe
  if (/^[A-Z0-9_]+$/.test(t) || /^\w+\/[\w+.-]+$/.test(t)) return '';                    // constante technique, type MIME
  if (/^(M|L|C|Q|A|V|H)[\d\s.,-]+/.test(t)) return '';                                              // chemin SVG
  if (/^[\w.-]+\.(js|css|png|svg|json|csv|html|capella|aird|zip|pdf)$/i.test(t)) return '';         // nom de fichier technique
  if (/^(https?:|data:)/.test(t)) return '';
  return t;
}
/** Nom de l'appel parent (callee) d'un nœud. */
function calleeName(c) { const x = c.callee; if (!x) return ''; if (x.type === 'Identifier') return x.name; if (x.type === 'MemberExpression' && x.property) return x.property.name || x.property.value || ''; return ''; }
/** Vrai si le littéral est dans un contexte technique (clé, comparaison, sélecteur…). */
function technical(node, p) {
  if (!p) return false;
  if (p.type === 'Property' && p.key === node) return true;
  if (p.type === 'MemberExpression' && p.property === node) return true;
  if (p.type === 'BinaryExpression' && ['===', '!==', '==', '!=', 'in'].includes(p.operator)) return true;
  if (p.type === 'SwitchCase' || p.type === 'ImportDeclaration') return true;
  if (p.type === 'ExpressionStatement') return true;                                     // 'use strict'
  if ((p.type === 'CallExpression' || p.type === 'NewExpression') && TECH_CALLS.has(calleeName(p)) && p.arguments[0] === node) return true;
  return false;
}

const rows = [];   // {file, line, text, raw}
for (const f of fs.readdirSync(path.join(SRC, 'js')).filter(x => x.endsWith('.js')).sort()) {
  const code = fs.readFileSync(path.join(SRC, 'js', f), 'utf8');
  let ast; try { ast = acorn.parse(code, { ecmaVersion: 'latest', locations: true, allowReturnOutsideFunction: true }); }
  catch (e) { console.error(`✖ ${f} : ${e.message} (lancer node build.js)`); process.exit(1); }
  const seen = new Set();
  const push = (node, raw, free) => { const t = visible(raw); if (!t) return; const k = node.loc.start.line + '|' + t; if (seen.has(k)) return; seen.add(k);
    rows.push({ file: 'js/' + f, line: node.loc.start.line, text: t, raw, free }); };
  // Descriptions des types Capella (CAP_HUMAN_NAMES) : une ligne par type, clé « type:Nom »
  ast.body.forEach(st => (st.declarations || []).forEach(d => { if (d.id && d.id.name === 'CAP_HUMAN_NAMES' && d.init && d.init.type === 'ObjectExpression')
    d.init.properties.forEach(pr => { const k = pr.key.value || pr.key.name, dp = (pr.value.properties || []).find(x => (x.key.value || x.key.name) === 'd');
      if (dp && dp.value.value) rows.push({ file: 'js/' + f, line: dp.loc.start.line, text: `[${k}] ${dp.value.value}`, raw: 'type:' + k, type: k }); }); }));
  (function walk(n, parents) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.id && DATA_DECL.has(n.id.name)) return;
    const p = parents[parents.length - 1];
    // free : littéral qui n'est pas l'argument d'un _L (le build anglais ne le traduit pas)
    const free = !(p && p.type === 'CallExpression' && p.callee.type === 'Identifier' && p.callee.name === '_L');
    if (n.type === 'Literal' && typeof n.value === 'string' && !technical(n, p)) push(n, n.value, free);
    if (n.type === 'TemplateLiteral' && !technical(n, p)) { const pat = patternOf(n); n.quasis.forEach(q => { const k = rows.length; push(q, q.value.cooked || '', free); if (rows.length > k) rows[k].pat = pat; }); }
    for (const k in n) { if (k === 'loc') continue; const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, [...parents, n]));
      else if (v && typeof v.type === 'string') walk(v, [...parents, n]); }
  })(ast, []);
}
// Textes statiques de l'interface
const ui = fs.readFileSync(path.join(SRC, 'html', 'interface.html'), 'utf8').split('\n');
ui.forEach((l, i) => {
  const noTags = l.replace(/<script[\s\S]*?<\/script>/g, '');
  (noTags.match(/>([^<>]+)</g) || []).forEach(m => { const t = visible(m.slice(1, -1)); if (t) rows.push({ file: 'html/interface.html', line: i + 1, text: t, raw: m.slice(1, -1).trim() }); });
  (noTags.match(/(?:title|placeholder)="([^"]+)"/g) || []).forEach(m => { const raw = m.replace(/^\w+="|"$/g, ''); const t = visible(raw); if (t) rows.push({ file: 'html/interface.html', line: i + 1, text: t + '  (infobulle)', raw }); });
});

rows.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
// Traduction anglaise (facultatif)
let en = null;
if (withEn) { const p = path.join(SRC, 'i18n', 'en-dictionnaire.json');
  en = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  const { translatePattern } = require('./i18n.js');
  const code = en.code || {}, flat = Object.assign({}, code, en.interface || {});
  const FR = /[àâçéèêëîïôûùüœ]|\b(le|la|les|des|une?|du|de|et|dans|pour|avec|vers|entre)\b/i;
  // même recherche que le build anglais (tools/i18n.js) : littéral entier, puis morceaux
  rows.forEach(r => { if (r.type) { r.en = (en.types || {})[r.type] || (FR.test(r.text.replace(/^\[[^\]]*\]\s*/, '')) ? '' : '(déjà en anglais)'); return; }
    if (r.free) { r.en = FR.test(r.text) ? '' : '(inchangé, hors _L)'; return; }
    const t = translatePattern(r.pat != null ? r.pat : r.raw, r.file.startsWith('html/') ? flat : code);
    r.en = t.missing.length ? '' : (visible(t.text.replace(/\{\d+\}/g, '…')) || t.text); }); }

// Sorties
const esc = s => String(s).replace(/\|/g, '\\|');
const md = ['# Textes affichés par l\'application', '',
  `Généré par \`node tools/textes.js${withEn ? ' --en' : ''}\` — ${rows.length} textes. Ne pas modifier ce fichier : corriger le texte dans le fichier source à la ligne indiquée, puis régénérer.`,
  'L\'aide utilisateur est dans `src/html/aide.html` (non recopiée ici).', ''];
let cur = '';
for (const r of rows) {
  if (r.file !== cur) { cur = r.file; md.push('', `## ${cur}`, '', withEn ? '| Ligne | Texte | Anglais |' : '| Ligne | Texte |', withEn ? '|---:|---|---|' : '|---:|---|'); }
  md.push(withEn ? `| ${r.line} | ${esc(r.text)} | ${esc(r.en ? r.en.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '❌')} |` : `| ${r.line} | ${esc(r.text)} |`);
}
if (withEn) { const miss = rows.filter(r => !r.en); md.push('', `## Textes sans traduction anglaise (${miss.length})`, '');
  miss.forEach(r => md.push(`- \`${r.file}:${r.line}\` — ${esc(r.text)}`)); }
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'TEXTES.md'), md.join('\n'));
const csvq = s => '"' + String(s).replace(/"/g, '""') + '"';
const csv = [['Fichier', 'Ligne', 'Texte', ...(withEn ? ['Anglais'] : [])].map(csvq).join(';'),
  ...rows.map(r => [r.file, r.line, r.text, ...(withEn ? [r.en] : [])].map(csvq).join(';'))];
fs.writeFileSync(path.join(ROOT, 'docs', 'textes.csv'), '﻿' + csv.join('\r\n'));   // BOM : accents corrects dans Excel
const files = new Set(rows.map(r => r.file)).size;
console.log(`✔ docs/TEXTES.md et docs/textes.csv — ${rows.length} textes dans ${files} fichiers` + (withEn ? `, ${rows.filter(r => r.en).length} traduits` : ''));
