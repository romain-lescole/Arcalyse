#!/usr/bin/env node
/**
 * Génère docs/INDEX-FONCTIONS.md : pour chaque module de src/js, la liste des fonctions et
 * constantes de premier niveau avec la première ligne de leur JSDoc.
 *   node tools/index.js
 * À relancer après l'ajout ou le déplacement de fonctions (Claude Code le fait de lui-même).
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src', 'js');
const out = ['# Index des fonctions (généré par `node tools/index.js` — ne pas modifier à la main)', ''];
for (const f of fs.readdirSync(JS).filter(x => x.endsWith('.js')).sort()) {
  const lines = fs.readFileSync(path.join(JS, f), 'utf8').split('\n');
  out.push(`## ${f} — ${lines.length} lignes`, '');
  lines.forEach((l, i) => {
    const m = l.match(/^(?:async\s+)?function\s+([\w$]+)\s*\(/) || l.match(/^(?:const|let|var)\s+([A-Z_][A-Z0-9_]{2,})\s*=/);
    if (!m) return;
    // première ligne utile du JSDoc qui précède
    let doc = '';
    for (let j = i - 1; j >= 0 && j >= i - 25; j--) {
      const t = lines[j].trim();
      if (t.startsWith('/**')) { doc = t.replace(/^\/\*\*\s?/, '').replace(/\*\/$/, '').trim() || (lines[j + 1] || '').trim().replace(/^\*\s?/, ''); break; }
      if (!t.startsWith('*') && !t.endsWith('*/')) break;
    }
    out.push(`- \`${m[1]}\` (l. ${i + 1})${doc ? ' — ' + doc.slice(0, 140) : ''}`);
  });
  out.push('');
}
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'INDEX-FONCTIONS.md'), out.join('\n'));
console.log('✔ docs/INDEX-FONCTIONS.md régénéré');
