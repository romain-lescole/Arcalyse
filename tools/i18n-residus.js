#!/usr/bin/env node
/**
 * Contrôle de la version anglaise : après traduction (comme au build --lang en), liste les littéraux du code
 * qui ressemblent encore à du français (accents, mots courants), hors listes de données (verbes, types).
 *
 *   node tools/i18n-residus.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const { translateCode, parse, walk, visible } = require('./i18n.js');
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src', 'js');
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', 'en-dictionnaire.json'), 'utf8'));
const DATA = /^(CAP_HUMAN_NAMES|CAP_EN_VERBS|CAP_FR_VERBS|CAP_FR_ER_NOUNS|CAP_VAGUE_VERBS|THEMES|CAP_DASH_PAL|CAP_D3_LICENSE)$/;
const FR = /[àâçéèêëîïôûùüœ«»]|\b(le|la|les|des|une|du|et|dans|pour|avec|vers|sans|sur|aucun|aucune|est|sont|fonctions?|composants?|liens?|chaînes?|échanges?)\b/i;
let n = 0;
for (const f of fs.readdirSync(JS).filter(x => x.endsWith('.js')).sort()) {
  const code = translateCode(fs.readFileSync(path.join(JS, f), 'utf8'), dict.code, f).code;
  walk(parse(code), (node, ps) => {
    if (node.type === 'VariableDeclarator' && node.id && DATA.test(node.id.name || '')) return false;
    let txt = '';
    if (node.type === 'Literal' && typeof node.value === 'string') txt = node.value;
    else if (node.type === 'TemplateElement') txt = node.value.cooked || '';
    else return;
    const p = ps[ps.length - 1];
    if (p && (p.type === 'BinaryExpression' || p.type === 'SwitchCase' || p.type === 'Property' && p.key === node)) return;
    const v = visible(txt);
    if (!v || !FR.test(v)) return;
    n++; console.log(`${f}:${node.loc.start.line}\t${v.slice(0, 140)}`);
  });
}
console.error(`${n} texte(s) suspect(s)`);
