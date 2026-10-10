#!/usr/bin/env node
/**
 * Assemble les sources de src/ en un fichier HTML unique, autonome et 100 % hors ligne.
 *
 *   node build.js                 → dist/arcalyse-fr.html (avec repères de modules)
 *   node build.js --no-markers    → même chose, sans les commentaires @@BEGIN/@@END
 *   node build.js --out chemin    → fichier de sortie personnalisé
 *   node build.js --livraison     → livraison/arcalyse-fr.html, sans repères : version livrée,
 *                                   versionnée dans Git (dist/ n'est pas touché) ; rappelle les commandes git.
 *   node build.js --lang en       → version anglaise dist/arcalyse-en.html (avec --livraison : livraison/arcalyse-en.html) :
 *                                   argument de chaque _L('…') traduit (src/i18n/en-dictionnaire.json, partie « code »),
 *                                   textes de interface.html (« interface », puis « code »), aide src/html/aide.en.html,
 *                                   descriptions des types (« types ») ; textes sans traduction listés dans
 *                                   dist/arcalyse-en-manquants.txt (ils restent en français). Voir docs/i18n/LISEZMOI.md.
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
const langArg = args.indexOf('--lang');
const LANG = langArg >= 0 ? String(args[langArg + 1] || '').toLowerCase() : 'fr';
if (!['fr', 'en'].includes(LANG)) { console.error(`✖ Langue inconnue : ${LANG} (fr ou en)`); process.exit(1); }
const OUT = livraison ? path.join(ROOT, 'livraison', `arcalyse-${LANG}.html`)
  : outArg >= 0 ? path.resolve(args[outArg + 1]) : path.join(ROOT, 'dist', `arcalyse-${LANG}.html`);
const EN = LANG === 'en';
const i18n = EN ? require('./tools/i18n.js') : null;
const DICT = EN ? JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'en-dictionnaire.json'), 'utf8')) : null;
const missing = [];   // {file, line, key} : textes sans traduction (version anglaise)

/** Version anglaise d'un fichier inclus (rel = chemin relatif à src/). */
function translate(rel, txt) {
  if (rel.startsWith('js/')) {
    const r = i18n.translateCode(txt, DICT.code, 'src/' + rel);
    missing.push(...r.missing);
    txt = r.code;
    if (rel === 'js/01-donnees-config.js') {
      txt = txt.replace(/^const CAP_LANG='fr';$/m, "const CAP_LANG='en';");
      // descriptions des types Capella (CAP_HUMAN_NAMES[type].d)
      const ast = i18n.parse(txt), rep = [];
      ast.body.forEach(st => (st.declarations || []).forEach(d => { if (d.id && d.id.name === 'CAP_HUMAN_NAMES' && d.init && d.init.type === 'ObjectExpression')
        d.init.properties.forEach(pr => { const k = pr.key.value || pr.key.name, dp = (pr.value.properties || []).find(x => (x.key.value || x.key.name) === 'd');
          if (dp && dp.value.value && DICT.types[k] != null) rep.push([dp.value.start, dp.value.end, i18n.jsString(DICT.types[k])]); }); }));
      rep.sort((a, b) => b[0] - a[0]).forEach(([a, b, v]) => { txt = txt.slice(0, a) + v + txt.slice(b); });
    }
    // dates et nombres au format anglais, documents produits déclarés en anglais
    return txt.replace(/(toLocale(?:Date|Time)?String\()'fr-FR'/g, "$1'en-GB'").replace(/<html lang="fr">/g, '<html lang="en">');
  }
  if (rel === 'html/interface.html') {
    const r = i18n.translatePattern(txt, Object.assign({}, DICT.code, DICT.interface));
    r.missing.forEach(key => missing.push({ key, file: 'src/' + rel, line: txt.split('\n').findIndex(l => l.includes(key.split('{')[0].trim())) + 1 }));
    return r.text;
  }
  return txt;
}

/** Commentaires de repère selon le langage du fichier inclus. */
function marks(p) {
  if (p.endsWith('.html')) return [`<!-- @@BEGIN ${p}@@ -->`, `<!-- @@END ${p}@@ -->`];
  return [`/* @@BEGIN ${p}@@ */`, `/* @@END ${p}@@ */`];
}

const errors = [], warnings = [];
let tplTxt = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
if (EN) tplTxt = tplTxt.replace('<html lang="fr">', '<html lang="en">').replace('@@INCLUDE html/aide.html@@', '@@INCLUDE html/aide.en.html@@')
  .replace(/<title>[^<]*<\/title>/, '<title>Arcalyse — your Capella model, inside and out</title>');
const tpl = tplTxt.split('\n');
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
  if (EN && !rel.startsWith('vendor/')) {
    try { txt = translate(rel, txt); }
    catch (e) { errors.push(`Traduction impossible — src/${rel} : ${e.message}`); }
  }
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
if (EN) {
  // textes sans traduction : un par clé, avec leurs emplacements
  const byKey = new Map();
  missing.forEach(m => { const a = byKey.get(m.key) || []; a.push(`${m.file}:${m.line}`); byKey.set(m.key, a); });
  const rep = path.join(path.dirname(OUT), `arcalyse-${LANG}-manquants.txt`);
  if (byKey.size) {
    fs.writeFileSync(rep, [...byKey].map(([k, w]) => `${JSON.stringify(k)}\t${[...new Set(w)].join(' ')}`).join('\n') + '\n');
    warnings.push(`${byKey.size} texte(s) sans traduction anglaise (restés en français) → ${path.relative(ROOT, rep)}`);
  } else if (fs.existsSync(rep)) fs.unlinkSync(rep);
}
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
warnings.forEach(w => console.warn('⚠ ' + w));
console.log(`✔ ${path.relative(ROOT, OUT) || OUT} — ${kb} Ko, ${included.length} fichiers, ${jsFiles.length} modules JS, syntaxe OK${markers ? '' : ' (sans repères)'}${EN ? ' — version anglaise' : ''}`);
if (livraison) console.log(`
Livraison prête. Pour la publier (remplacer X.Y par le numéro de version) :
  git add livraison
  git commit -m "Livraison vX.Y"
  git tag vX.Y
  git push
  git push --tags`);
