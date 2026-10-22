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
 *   node build.js --lang de       → version allemande dist/arcalyse-de.html (avec --livraison : livraison/arcalyse-de.html) :
 *                                   même principe, dictionnaire src/i18n/de-dictionnaire.json, aide src/html/aide.de.html,
 *                                   textes manquants dans dist/arcalyse-de-manquants.txt ; visionneuse de diagrammes en anglais
 *                                   (Arcature n'a pas de version allemande).
 *   node build.js --lang multi    → version multilingue dist/arcalyse-multi.html : les deux langues dans un seul fichier,
 *                                   chaque _L devient (CAP_LANG==='en'?anglais:français), interface et aide dans deux
 *                                   <template> ; langue choisie au chargement (?lang=fr|en, langue de la page enregistrée,
 *                                   sinon langue du navigateur), bascule 🌐 dans la barre et sur l'écran d'accueil.
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
if (!['fr', 'en', 'de', 'multi'].includes(LANG)) { console.error(`✖ Langue inconnue : ${LANG} (fr, en, de ou multi)`); process.exit(1); }
const OUT = livraison ? path.join(ROOT, 'livraison', `arcalyse-${LANG}.html`)
  : outArg >= 0 ? path.resolve(args[outArg + 1]) : path.join(ROOT, 'dist', `arcalyse-${LANG}.html`);
const EN = LANG === 'en' || LANG === 'de', MULTI = LANG === 'multi', TR = EN || MULTI;   // EN : version dans une seule autre langue (anglais ou allemand) ; TR : une traduction est nécessaire
const DL = MULTI ? 'en' : LANG;                                       // langue du dictionnaire et de l'aide
const LOCALE = { en: 'en-GB', de: 'de-DE' }[DL], QUOTES = DL === 'de' ? ['„', '“'] : ['“', '”'];
const LANG_NOM = { en: 'anglaise', de: 'allemande' }[DL];
const i18n = TR ? require('./tools/i18n.js') : null;
const DICT = TR ? JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', `${DL}-dictionnaire.json`), 'utf8')) : null;
const missing = [];   // {file, line, key} : textes sans traduction (version anglaise ou allemande)

/** Version traduite (anglaise ou allemande) d'un fichier inclus (rel = chemin relatif à src/). */
function translate(rel, txt) {
  if (rel.startsWith('js/')) {
    const r = i18n.translateCode(txt, DICT.code, 'src/' + rel, MULTI, QUOTES);
    missing.push(...r.missing);
    txt = r.code;
    if (rel === 'js/01-donnees-config.js') {
      txt = txt.replace(/^const CAP_LANG='fr';$/m, MULTI ? "const CAP_LANG=document.documentElement.getAttribute('data-lang')==='en'?'en':'fr';" : `const CAP_LANG='${DL}';`);
      // descriptions des types Capella (CAP_HUMAN_NAMES[type].d)
      const ast = i18n.parse(txt), rep = [];
      ast.body.forEach(st => (st.declarations || []).forEach(d => { if (d.id && d.id.name === 'CAP_HUMAN_NAMES' && d.init && d.init.type === 'ObjectExpression')
        d.init.properties.forEach(pr => { const k = pr.key.value || pr.key.name, dp = (pr.value.properties || []).find(x => (x.key.value || x.key.name) === 'd');
          if (dp && dp.value.value && DICT.types[k] != null) rep.push([dp.value.start, dp.value.end,
            MULTI ? `(CAP_LANG==='en'?${i18n.jsString(DICT.types[k])}:${i18n.jsString(dp.value.value)})` : i18n.jsString(DICT.types[k])]); }); }));
      rep.sort((a, b) => b[0] - a[0]).forEach(([a, b, v]) => { txt = txt.slice(0, a) + v + txt.slice(b); });
    }
    // dates et nombres au format de la langue, documents produits déclarés dans cette langue
    if (MULTI) return txt.replace(/(toLocale(?:Date|Time)?String\()'fr-FR'/g, "$1(CAP_LANG==='en'?'en-GB':'fr-FR')").replace(/<html lang="fr">/g, '<html lang="${CAP_LANG}">');
    return txt.replace(/(toLocale(?:Date|Time)?String\()'fr-FR'/g, `$1'${LOCALE}'`).replace(/<html lang="fr">/g, `<html lang="${DL}">`);
  }
  if (rel === 'html/interface.html') {
    const r = i18n.translatePattern(txt, Object.assign({}, DICT.code, DICT.interface));
    r.missing.forEach(key => missing.push({ key, file: 'src/' + rel, line: txt.split('\n').findIndex(l => l.includes(key.split('{')[0].trim())) + 1 }));
    if (MULTI) return multiUi(txt, r.text);
    return r.text;
  }
  return txt;
}

/** Ajoute à une interface (et son aide) le bouton de changement de langue (version multilingue). */
function withLangSwitch(ui, to) {
  const lab = to === 'en' ? ['🌐 EN', 'Switch to English (the loaded model is kept)', '🌐 English version']
    : ['🌐 FR', 'Passer en français (le modèle chargé est conservé)', '🌐 Version française'];
  const btn = `<div class="tbtn" id="b-lang" title="${lab[1]}" onclick="capLangSwitch('${to}')">${lab[0]}</div>`;
  const link = `<a href="#" class="cw-help-link" id="cw-lang-link" onclick="capLangSwitch('${to}');return false">${lab[2]}</a>`;
  const n = ui.length;
  ui = ui.replace(/(<div class="tbtn" id="b-help"[^>]*>(?:[^<]|<span[^>]*>[^<]*<\/span>)*<\/div>)/, '$1\n  ' + btn).replace(/(<a [^>]*id="cw-about-link"[^>]*>[^<]*<\/a>)/, '$1\n      ' + link);
  if (ui.length < n + btn.length + link.length) errors.push('Version multilingue : emplacement du bouton de langue introuvable dans interface.html');
  return ui;
}
/** Bloc multilingue : interface + aide dans deux <template>, et script qui insère la langue choisie. */
function multiUi(fr, en) {
  const aideFr = fs.readFileSync(path.join(SRC, 'html', 'aide.html'), 'utf8').replace(/\r\n/g, '\n');
  const aideEn = fs.readFileSync(path.join(SRC, 'html', 'aide.en.html'), 'utf8').replace(/\r\n/g, '\n');
  return `<template id="cap-tpl-fr">\n${withLangSwitch(fr, 'en')}\n${aideFr}</template>
<template id="cap-tpl-en">\n${withLangSwitch(en, 'fr')}\n${aideEn}</template>
<script id="cap-lang-boot">
/* Version multilingue : choisit la langue (?lang=fr|en, changement de langue en cours, langue de la page enregistrée,
   sinon langue du navigateur) et insère l'interface et l'aide correspondantes avant le script principal. */
(function(){
  var me=document.currentScript, q=(location.search.match(/[?&]lang=(fr|en)(?![a-z])/)||[])[1], sw=null;
  try{ var w=JSON.parse(window.name||'null'); if(w&&w.capLangSwitch) sw=w; }catch(e){}
  var cur=document.documentElement.getAttribute('data-lang');
  // page enregistrée : son interface est déjà là, juste avant ce script (insérée par lui à la première ouverture)
  var have=document.querySelectorAll('body > [data-cap-ui]');
  var lang=q||(sw&&sw.lang)||(have.length&&cur)||(/^fr/i.test(navigator.language||'')?'fr':'en');
  if(have.length&&cur!==lang){ [].slice.call(have).forEach(function(el){ el.remove(); }); have=[]; }   // autre langue : interface remplacée
  if(!have.length){
    var frag=document.getElementById('cap-tpl-'+lang).content.cloneNode(true);
    [].slice.call(frag.children).forEach(function(el){ el.setAttribute('data-cap-ui',lang); });
    me.parentNode.insertBefore(frag, me);
  }
  document.documentElement.lang=lang; document.documentElement.setAttribute('data-lang',lang);
  document.title=lang==='en'?${JSON.stringify(EN_TITLE)}:${JSON.stringify(FR_TITLE)};
  /** Change de langue : recharge la page dans l'autre langue en gardant le modèle chargé (transmis par window.name). */
  window.capLangSwitch=function(l){
    var st={capLangSwitch:1,lang:l};
    try{ if(typeof capLoaded!=='undefined'&&capLoaded&&cap_xmlDoc){ st.xml=new XMLSerializer().serializeToString(cap_xmlDoc); st.name=capCurrentFileName||''; } }catch(e){}
    window.name=JSON.stringify(st); window._capNoLeaveWarn=true;
    var u=location.href.replace(/([?&])lang=(fr|en)&?/,'$1').replace(/[?&]$/,'').replace(/#.*$/,'');
    location.href=u+(u.indexOf('?')<0?'?':'&')+'lang='+l;
  };
})();
<\/script>`;
}
const FR_TITLE = 'Arcalyse — votre modèle Capella, sous toutes ses coutures', EN_TITLE = 'Arcalyse — your Capella model, inside and out',
  DE_TITLE = 'Arcalyse — Ihr Capella-Modell aus allen Blickwinkeln';
/** Script de fin de page (version multilingue) : recharge le modèle transmis lors d'un changement de langue. */
const MULTI_RESTORE = `<script id="cap-lang-restore">
(function(){
  var w=null; try{ w=JSON.parse(window.name||'null'); }catch(e){}
  if(!w||!w.capLangSwitch) return;
  window.name='';
  if(!w.xml) return;
  var emb=document.getElementById('cap-embedded-xml'); if(emb) emb.remove();   // le modèle transmis remplace celui de la page enregistrée
  capLoadFile(new File([w.xml], w.name||'model.capella', {type:'application/xml'}));
})();
<\/script>`;

/** Commentaires de repère selon le langage du fichier inclus. */
function marks(p) {
  if (p.endsWith('.html')) return [`<!-- @@BEGIN ${p}@@ -->`, `<!-- @@END ${p}@@ -->`];
  return [`/* @@BEGIN ${p}@@ */`, `/* @@END ${p}@@ */`];
}

const errors = [], warnings = [];
let tplTxt = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
if (EN) tplTxt = tplTxt.replace('<html lang="fr">', `<html lang="${DL}">`).replace('@@INCLUDE html/aide.html@@', `@@INCLUDE html/aide.${DL}.html@@`)
  .replace(/<title>[^<]*<\/title>/, `<title>${DL === 'de' ? DE_TITLE : EN_TITLE}</title>`);
// Visionneuse de diagrammes d'Arcature : version de la langue construite (les deux en multilingue, choisie au chargement ;
// anglaise pour la version allemande, Arcature n'ayant pas de visionneuse en allemand)
if (EN) tplTxt = tplTxt.replace('@@INCLUDE vendor/arcature-visionneuse.js@@', '@@INCLUDE vendor/arcature-visionneuse-en.js@@');
if (MULTI) tplTxt = tplTxt.replace(/^@@INCLUDE vendor\/arcature-visionneuse\.js@@$/m,
  "if(document.documentElement.getAttribute('data-lang')==='en'){\n@@INCLUDE vendor/arcature-visionneuse-en.js@@\n}else{\n@@INCLUDE vendor/arcature-visionneuse.js@@\n}");
if (MULTI) tplTxt = tplTxt.replace(/^@@INCLUDE html\/aide\.html@@$/m, '').replace(/<\/body>\s*<\/html>\s*$/, MULTI_RESTORE + '\n</body>\n</html>\n');
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
  if (TR && !rel.startsWith('vendor/')) {
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
if (TR) {
  // textes sans traduction : un par clé, avec leurs emplacements
  const byKey = new Map();
  missing.forEach(m => { const a = byKey.get(m.key) || []; a.push(`${m.file}:${m.line}`); byKey.set(m.key, a); });
  const rep = path.join(path.dirname(OUT), `arcalyse-${LANG}-manquants.txt`);
  if (byKey.size) {
    fs.writeFileSync(rep, [...byKey].map(([k, w]) => `${JSON.stringify(k)}\t${[...new Set(w)].join(' ')}`).join('\n') + '\n');
    warnings.push(`${byKey.size} texte(s) sans traduction ${LANG_NOM} (restés en français) → ${path.relative(ROOT, rep)}`);
  } else if (fs.existsSync(rep)) fs.unlinkSync(rep);
}
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
warnings.forEach(w => console.warn('⚠ ' + w));
console.log(`✔ ${path.relative(ROOT, OUT) || OUT} — ${kb} Ko, ${included.length} fichiers, ${jsFiles.length} modules JS, syntaxe OK${markers ? '' : ' (sans repères)'}${EN ? ' — version ' + LANG_NOM : MULTI ? ' — version multilingue (FR + EN)' : ''}`);
if (livraison) console.log(`
Livraison prête. Pour la publier (remplacer X.Y par le numéro de version) :
  git add livraison
  git commit -m "Livraison vX.Y"
  git tag vX.Y
  git push
  git push --tags`);
