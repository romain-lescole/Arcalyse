/**
 * Outils communs de la traduction anglaise (build.js --lang en, tools/textes.js, tools/i18n-envelopper.js).
 * Module de bibliothèque : ne se lance pas seul.
 *
 * Principe (docs/i18n/LISEZMOI.md) : dans le code, chaque libellé affiché est écrit en français et
 * enveloppé par _L('…') ; au build anglais, l'argument de chaque _L est remplacé par sa traduction.
 *
 * Recherche d'une traduction pour un littéral (texte français = clé du dictionnaire « code ») :
 *   1. le littéral entier (les ${…} d'un gabarit sont notés {0}, {1}… dans la clé et dans la traduction) ;
 *   2. sinon, morceau par morceau : chaque texte entre deux balises HTML (clé = texte sans les espaces
 *      de bord, ${…} renumérotés {0}, {1}… dans le morceau), et la valeur des attributs title / placeholder /
 *      alt / aria-label des balises ;
 *   3. sinon, chaque bout de texte entre deux ${…}.
 * Ce qui n'est pas trouvé reste en français et est signalé.
 */
'use strict';
const acorn = require('./lib/acorn.js');

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

/** Vrai si un morceau (déjà déclaré texte par _L) contient du texte à traduire : au moins une minuscule ou une
 * majuscule accentuée, hors ${…}, entités HTML et sigles (PA, OUT, CSV…). */
function textual(s) {
  const t = String(s).replace(/\{\d+\}/g, ' ').replace(/&#?\w+;/g, ' ');
  return /[a-zà-ÿ]/.test(t) && /[A-Za-zÀ-ÿ]{2}/.test(t) || /[À-ÝŒ]/.test(t);
}

/** Renumérote les {n} d'un morceau à partir de {0} ; renvoie [clé, table locale → globale]. */
function localize(s) {
  const map = [];
  const key = s.replace(/\{(\d+)\}/g, (m, n) => { map.push(+n); return '{' + (map.length - 1) + '}'; });
  return [key, map];
}
/** Remet les numéros globaux dans une traduction écrite avec des {n} locaux. */
function globalize(tr, map) { return tr.replace(/\{(\d+)\}/g, (m, n) => map[+n] != null ? '{' + map[+n] + '}' : m); }

/** Cherche la traduction d'un morceau (espaces de bord conservés) ; undefined si absente. */
function lookup(piece, dict) {
  const m = piece.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
  if (!core) return piece;
  const [key, map] = localize(core);
  const tr = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : undefined;
  return tr == null ? undefined : m[1] + globalize(tr, map) + m[3];
}

const ATTR_RE = /\b(title|placeholder|alt|aria-label)=(["'])((?:(?!\2)[^<>])*)\2/g;

/**
 * Traduit un motif (texte français, ${…} notés {0}, {1}…). Renvoie { text, missing } :
 * missing = morceaux sans traduction (clés à ajouter au dictionnaire).
 */
function translatePattern(pattern, dict) {
  const missing = [];
  const whole = lookup(pattern, dict);
  if (whole !== undefined) return { text: whole, missing };
  const parts = pattern.split(/(<[^<>]*>)/);
  let inStyle = false;
  const out = parts.map((p, i) => {
    if (i % 2) {                                                          // balise : valeurs des attributs de texte
      if (/^<style\b/i.test(p)) inStyle = true; else if (/^<\/style/i.test(p)) inStyle = false;
      return p.replace(ATTR_RE, (all, a, q, v) => {
        if (!textual(v)) return all;
        const t = lookup(v, dict);
        if (t === undefined) { missing.push(localize(v.trim())[0]); return all; }
        return `${a}=${q}${t}${q}`;
      });
    }
    if (inStyle || !textual(p)) return p;
    const t = lookup(p, dict);
    if (t !== undefined) return t;
    // bouts entre deux ${…}
    let miss = false;
    const r = p.split(/(\{\d+\})/).map((q, j) => {
      if (j % 2 || !textual(q)) return q;
      const u = lookup(q, dict);
      if (u === undefined) { miss = true; return q; }
      return u;
    }).join('');
    if (miss) missing.push(localize(p.trim())[0]);
    return r;
  });
  return { text: out.join(''), missing };
}

/** Écrit une chaîne en littéral JS entre guillemets doubles (sans « </script »). */
function jsString(s) { return JSON.stringify(s).replace(/<\//g, '<\\/').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16)); }

/** Analyse un module JS (acorn, avec positions). */
function parse(code) { return acorn.parse(code, { ecmaVersion: 'latest', locations: true, allowReturnOutsideFunction: true }); }

/** Parcourt un arbre acorn en profondeur ; fn(nœud, parents). */
function walk(node, fn, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  if (fn(node, parents) === false) return;
  const ps = [...parents, node];
  for (const k in node) { if (k === 'loc') continue; const v = node[k];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, fn, ps));
    else if (v && typeof v.type === 'string') walk(v, fn, ps); }
}

/** Arguments littéraux de tous les appels _L('…') / _L(`…`) d'un arbre. */
function lCalls(ast) {
  const calls = [];
  walk(ast, n => { if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === '_L' && n.arguments[0]
    && (n.arguments[0].type === 'Literal' && typeof n.arguments[0].value === 'string' || n.arguments[0].type === 'TemplateLiteral')) calls.push(n.arguments[0]); });
  return calls;
}

/** Motif d'un argument de _L : texte français, ${…} notés {0}, {1}… */
function patternOf(a) {
  // un « {2} » écrit dans le texte (expression régulière…) est protégé pour ne pas être pris pour un ${…}
  const raw = q => q.value.raw.replace(/\{(?=\d+\})/g, '\u0001');
  return a.type === 'Literal' ? a.value.replace(/\{(?=\d+\})/g, '\u0001') : a.quasis.map((q, i) => raw(q) + (i < a.expressions.length ? `{${i}}` : '')).join('');
}

/**
 * Remplace, dans le code d'un module, l'argument de chaque _L('…') / _L(`…`) par sa traduction.
 * Renvoie { code, missing:[{key, line, file}], count }. Les _L imbriqués dans un gabarit sont traduits aussi.
 */
function translateCode(code, dict, file) {
  const calls = lCalls(parse(code)).sort((a, b) => a.start - b.start);
  const missing = [];
  let count = 0;
  /** Source de [start, end[ avec les _L intérieurs traduits. */
  function rewrite(start, end) {
    let s = '', pos = start;
    for (const a of calls) {
      if (a.start < pos || a.end > end) continue;
      s += code.slice(pos, a.start) + literal(a);
      pos = a.end;
    }
    return s + code.slice(pos, end);
  }
  /** Littéral traduit (source JS). */
  function literal(a) {
    count++;
    const r = translatePattern(patternOf(a), dict);
    r.text = r.text.replace(/«(\s|&nbsp;)?/g, '“').replace(/(\s|&nbsp;)?»/g, '”');   // guillemets restés hors traduction
    r.missing.forEach(k => missing.push({ key: k, line: a.loc.start.line, file }));
    if (a.type === 'Literal') { const t = r.text.replace(/\u0001/g, '{'); return t === a.value ? code.slice(a.start, a.end) : jsString(t); }
    const exprs = a.expressions.map(e => rewrite(e.start, e.end));
    return '`' + r.text.replace(/\{(\d+)\}/g, (m, n) => exprs[+n] != null ? '${' + exprs[+n] + '}' : m).replace(/\u0001/g, '{') + '`';
  }
  return { code: rewrite(0, code.length), missing, count };
}

module.exports = { visible, textual, translatePattern, translateCode, jsString, localize, parse, walk, lCalls, patternOf };
