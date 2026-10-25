'use strict';
/**
 * Configuration ESLint (lint statique des modules de src/js/).
 *
 * Les modules sont concaténés en un seul script à portée globale : toute déclaration de premier niveau
 * (`function`, `const`, `let`, `var`) d'un module est visible par tous les autres. Ces noms sont donc
 * relevés ici et déclarés comme globales, ce qui permet à `no-undef` de ne signaler que les vrais oublis.
 * Les règles retenues visent les pièges déjà rencontrés (NOTES-TECHNIQUES § 8) :
 *   - no-undef : variable jamais déclarée (faute de frappe, globale implicite) ;
 *   - no-redeclare : même nom déclaré deux fois (dans un module : eslint ; entre modules : build.js) ;
 *   - no-unused-vars : variables locales inutilisées (avertissement, les déclarations globales sont exclues).
 * Lancement : npx eslint   (après npm install --save-dev eslint) ; `node build.js` reste la vérification de référence.
 */
const fs = require('fs'), path = require('path');
const JS_DIR = path.join(__dirname, 'src', 'js');
const globals = {};
fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).forEach(f => {
  const src = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
  for (const m of src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) globals[m[1]] = 'readonly';
  // Déclarations multiples sur une ligne (`let a=1, b=null, c;`) : chaque nom suivi de =, , ou ; sur la même ligne
  for (const m of src.matchAll(/^(?:const|let|var)\s+([^\n]*)/gm))
    for (const n of m[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?==|,|;|$)/g)) globals[n[1]] = 'writable';
  for (const m of src.matchAll(/^(?:const|let|var)\s+\{([^}]*)\}/gm)) m[1].split(',').forEach(n => { const k = n.split(':').pop().trim(); if (k) globals[k] = 'writable'; });
});
// Globales du navigateur et des bibliothèques embarquées
const BROWSER = ['window', 'document', 'navigator', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'requestIdleCallback', 'DOMParser', 'XMLSerializer', 'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams', 'TextEncoder',
  'TextDecoder', 'Image', 'Node', 'indexedDB', 'Worker', 'self', 'Element', 'HTMLElement', 'SVGElement', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'MutationObserver',
  'ResizeObserver', 'IntersectionObserver', 'getComputedStyle', 'performance', 'crypto', 'ClipboardItem', 'location', 'history', 'alert', 'confirm',
  'prompt', 'DecompressionStream', 'CompressionStream', 'Response', 'Request', 'AbortController', 'structuredClone', 'queueMicrotask', 'self', 'name',
  'atob', 'btoa', 'XMLDocument', 'Document', 'DocumentFragment', 'Range', 'Selection', 'NodeFilter', 'HTMLInputElement', 'FontFace', 'open', 'close',
  'screen', 'devicePixelRatio', 'innerWidth', 'innerHeight', 'print', 'focus', 'scrollTo', 'matchMedia', 'localStorage', 'sessionStorage', 'FileSystemFileHandle',
  'showOpenFilePicker', 'showSaveFilePicker', 'showDirectoryPicker', 'DataTransfer', 'DragEvent', 'WheelEvent', 'PointerEvent', 'TouchEvent', 'FocusEvent',
  'InputEvent', 'ClipboardEvent', 'HTMLCanvasElement', 'CanvasRenderingContext2D', 'OffscreenCanvas', 'ImageData', 'Path2D', 'DOMRect', 'DOMMatrix',
  'SVGSVGElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLAnchorElement', 'HTMLTableElement', 'HTMLDivElement', 'ErrorEvent', 'PromiseRejectionEvent',
  'addEventListener', 'removeEventListener', 'dispatchEvent', 'parent', 'opener', 'frames', 'top', 'frameElement', 'HTMLIFrameElement', 'Intl', 'Audio',
  'DOMPoint', 'CSS', 'getSelection', 'd3', 'ArcatureVisionneuse', 'ArcatureLecteurSysml', 'I18N_EN', 'CAP_LANG_BUILD'];
BROWSER.forEach(n => { if (!(n in globals)) globals[n] = 'readonly'; });

module.exports = [
  { ignores: ['src/vendor/**', 'dist/**', 'livraison/**', 'node_modules/**', 'docs/**'] },
  {
    files: ['src/js/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals },
    rules: {
      'no-undef': 'error',
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['build.js', 'tools/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly', console: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', URL: 'readonly' } },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'warn' },
  },
];
