#!/usr/bin/env node
/**
 * Assemble les sources de src/ en un fichier HTML unique, autonome et 100 % hors ligne.
 *
 *   node build.js                 → dist/arcalyse-fr.html (avec repères de modules)
 *   node build.js --no-markers    → même chose, sans les commentaires @@BEGIN/@@END
 *   node build.js --out chemin    → fichier de sortie personnalisé
 *   node build.js --livraison     → livraison/arcalyse-fr.html, sans repères : version livrée,
 *                                   versionnée dans Git (dist/ n'est pas touché) ; rappelle les commandes git.
 *
 * Contrôles effectués à chaque assemblage :
 *   - syntaxe JavaScript de chaque module (erreur localisée : fichier + ligne) ;
 *   - absence de « </script » non échappé dans les modules JS ;
 *   - absence de ressource externe (src/href http(s), @import) dans le fichier produit ;
 *   - présence de chaque fichier de src/js dans src/index.html (et inversement).
 * Code de sortie ≠ 0 en cas d'erreur : le fichier n'est alors PAS écrit.
 * Aucune dépendance : Node.js seul suffit.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = __dirname, SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2);
const livraison = args.includes('--livraison');                 // version livrée : sans repères, dans livraison/
const markers = !livraison && !args.includes('--no-markers');
const outArg = args.indexOf('--out');
const OUT = livraison ? path.join(ROOT, 'livraison', 'arcalyse-fr.html')
  : outArg >= 0 ? path.resolve(args[outArg + 1]) : path.join(ROOT, 'dist', 'arcalyse-fr.html');

/** Commentaires de repère selon le langage du fichier inclus. */
function marks(p) {
  if (p.endsWith('.html')) return [`<!-- @@BEGIN ${p}@@ -->`, `<!-- @@END ${p}@@ -->`];
  return [`/* @@BEGIN ${p}@@ */`, `/* @@END ${p}@@ */`];
}

const errors = [], warnings = [];
const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replace(/\r\n/g, '\n').split('\n');
const included = [];
const out = [];
for (const line of tpl) {
  const m = line.match(/^\s*@@INCLUDE (\S+)@@\s*$/);
  if (!m) { out.push(line); continue; }
  const rel = m[1], file = path.join(SRC, rel);
  if (!fs.existsSync(file)) { errors.push(`Fichier inclus introuvable : src/${rel}`); continue; }
  let txt = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (txt.endsWith('\n')) txt = txt.slice(0, -1);       // l'inclusion occupe exactement la ligne du marqueur
  included.push(rel);
  if (rel.startsWith('js/')) {
    try { new vm.Script(txt, { filename: 'src/' + rel }); }
    catch (e) {
      const where = (e.stack || '').split('\n')[0];
      errors.push(`Syntaxe JS — ${where} : ${e.message}`);
    }
    txt.split('\n').forEach((l, i) => { if (/<\/script/i.test(l)) errors.push(`« </script » non échappé dans src/${rel}:${i + 1} (écrire <\\/script>)`); });
  }
  if (markers && !rel.startsWith('vendor/')) { const [b, e] = marks(rel); out.push(b, txt, e); }
  else out.push(txt);
}
// Cohérence src/js ↔ index.html
const jsFiles = fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
jsFiles.filter(f => !included.includes(f)).forEach(f => errors.push(`src/${f} n'est pas inclus dans src/index.html`));
included.filter((f, i) => included.indexOf(f) !== i).forEach(f => errors.push(`src/${f} est inclus plusieurs fois`));

const html = out.join('\n');
// Hors ligne : aucune ressource externe chargée par la page
const ext = html.match(/<(?:script|link|img|iframe)[^>]*\s(?:src|href)\s*=\s*["']https?:[^"']*/gi) || [];
ext.forEach(x => errors.push('Ressource externe interdite : ' + x.slice(0, 120)));
if (/@import\s+url\(\s*["']?https?:/i.test(html)) errors.push('@import externe interdit dans le CSS');

if (errors.length) {
  console.error('\n✖ Assemblage refusé :\n  - ' + errors.join('\n  - ') + '\n');
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
warnings.forEach(w => console.warn('⚠ ' + w));
console.log(`✔ ${path.relative(ROOT, OUT) || OUT} — ${kb} Ko, ${included.length} fichiers, ${jsFiles.length} modules JS, syntaxe OK${markers ? '' : ' (sans repères)'}`);
if (livraison) console.log(`
Livraison prête. Pour la publier (remplacer X.Y par le numéro de version) :
  git add livraison
  git commit -m "Livraison vX.Y"
  git tag vX.Y
  git push
  git push --tags`);
