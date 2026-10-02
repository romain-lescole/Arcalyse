#!/usr/bin/env node
/**
 * Opération inverse de build.js : redécoupe un fichier HTML assemblé AVEC repères
 * (@@BEGIN/@@END) vers src/. Utile si le fichier unique a été modifié ailleurs
 * (par exemple dans une conversation Claude.ai) et qu'on veut réintégrer ces changements.
 *
 *   node tools/split.js dist/relation-map-capella-fr.html          → réécrit src/
 *   node tools/split.js fichier.html --dry                         → affiche ce qui changerait
 *
 * Seuls les blocs entourés de repères sont réécrits ; le reste devient src/index.html.
 * Le bloc D3 (vendor) n'a pas de repères : il est reconnu par <script id="d3-embedded">.
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src');
const [inFile, ...opt] = process.argv.slice(2);
if (!inFile) { console.error('Usage : node tools/split.js <fichier.html> [--dry]'); process.exit(1); }
const dry = opt.includes('--dry');
const lines = fs.readFileSync(inFile, 'utf8').replace(/\r\n/g, '\n').split('\n');

const tpl = [], files = {};
for (let i = 0; i < lines.length; i++) {
  const b = lines[i].match(/@@BEGIN (\S+)@@/);
  if (b) {
    const rel = b[1], end = lines.findIndex((l, j) => j > i && l.includes(`@@END ${rel}@@`));
    if (end < 0) { console.error('Repère de fin manquant pour ' + rel); process.exit(1); }
    files[rel] = lines.slice(i + 1, end).join('\n'); tpl.push(`@@INCLUDE ${rel}@@`); i = end; continue;
  }
  if (/^<script id="d3-embedded">$/.test(lines[i])) {        // bibliothèque D3 embarquée
    const end = lines.findIndex((l, j) => j > i && l === '</script>');
    tpl.push(lines[i]); files['vendor/d3.min.js'] = lines.slice(i + 1, end).join('\n'); tpl.push('@@INCLUDE vendor/d3.min.js@@'); i = end - 1; continue;
  }
  tpl.push(lines[i]);
}
if (!Object.keys(files).some(f => f.startsWith('js/'))) { console.error('Aucun repère @@BEGIN trouvé : le fichier a-t-il été assemblé avec --no-markers ?'); process.exit(1); }
files['index.html'] = tpl.join('\n');
let n = 0;
for (const [rel, txt] of Object.entries(files)) {
  const p = path.join(SRC, rel), old = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (old === txt) continue;
  n++; console.log((old === null ? '+ ' : '~ ') + 'src/' + rel);
  if (!dry) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); }
}
console.log(n ? `${n} fichier(s) ${dry ? 'à modifier' : 'modifié(s)'}.` : 'Aucune différence.');
