/* ═══════════════════════════════════════════════════════════════════════
   3. THÈMES
   Chaque thème définit les variables CSS + les couleurs SVG non-exprimables
   en CSS (car SVG utilise des attributs de présentation, pas des propriétés).
   ═══════════════════════════════════════════════════════════════════════ */
const THEMES = {
  dark: {
    css: {'--c-bg':'#1e1e2e','--c-bg2':'#181825','--c-bg3':'#313244',
          '--c-bg4':'#252536','--c-border':'#45475a','--c-text':'#cdd6f4',
          '--c-dim':'#7f849c','--c-accent':'#89b4fa','--c-ctx':'#f9e2af',
          '--c-node-bg':'#2a2a3d','--c-node-txt':'#cdd6f4',
          '--c-node-hdr':'rgba(0,0,0,.65)','--c-shadow':'rgba(0,0,0,.5)'},
  },
  light: {
    css: {'--c-bg':'#f0f2f8','--c-bg2':'#ffffff','--c-bg3':'#e4e7ef',
          '--c-bg4':'#f0f2f8','--c-border':'#c0c4d4','--c-text':'#1a1a2e',
          '--c-dim':'#5a5e70','--c-accent':'#3b5bdb','--c-ctx':'#c87200',
          '--c-node-bg':'#ffffff','--c-node-txt':'#1a1a2e',
          '--c-node-hdr':'rgba(255,255,255,.85)','--c-shadow':'rgba(0,0,0,.2)'},
  },
  blue: {
    css: {'--c-bg':'#0d1117','--c-bg2':'#161b22','--c-bg3':'#21262d',
          '--c-bg4':'#1c2128','--c-border':'#30363d','--c-text':'#c9d1d9',
          '--c-dim':'#8b949e','--c-accent':'#58a6ff','--c-ctx':'#f0c040',
          '--c-node-bg':'#1c2128','--c-node-txt':'#c9d1d9',
          '--c-node-hdr':'rgba(0,0,0,.55)','--c-shadow':'rgba(0,0,0,.6)'},
  },
  green: {
    css: {'--c-bg':'#0f1a12','--c-bg2':'#0a1a0d','--c-bg3':'#1a3322',
          '--c-bg4':'#122018','--c-border':'#2a5038','--c-text':'#b8e5c4',
          '--c-dim':'#6a9e7a','--c-accent':'#4dd880','--c-ctx':'#f0c040',
          '--c-node-bg':'#1a2f1f','--c-node-txt':'#c8e8d0',
          '--c-node-hdr':'rgba(0,0,0,.5)','--c-shadow':'rgba(0,0,0,.5)'},
  },
  office2007: {
    // Inspiré de Microsoft Office 2007 (bleu « Luna », ruban dégradé, surbrillance dorée)
    css: {'--c-bg':'#e4ecf7','--c-bg2':'#f5f9fe','--c-bg3':'#cfdff3',
          '--c-bg4':'#dde8f6','--c-border':'#8db2e3','--c-text':'#15283f',
          '--c-dim':'#4c6485','--c-accent':'#1f5fae','--c-ctx':'#e08a00',
          '--c-node-bg':'#ffffff','--c-node-txt':'#15283f',
          '--c-node-hdr':'rgba(255,255,255,.92)','--c-shadow':'rgba(21,40,63,.25)'},
  },
  contrast: {
    css: {'--c-bg':'#000000','--c-bg2':'#111111','--c-bg3':'#222222',
          '--c-bg4':'#1a1a1a','--c-border':'#666666','--c-text':'#ffffff',
          '--c-dim':'#bbbbbb','--c-accent':'#ffff00','--c-ctx':'#ff6600',
          '--c-node-bg':'#1a1a1a','--c-node-txt':'#ffffff',
          '--c-node-hdr':'rgba(255,255,255,.2)','--c-shadow':'rgba(0,0,0,.8)'},
  },
};

let currentTheme = 'office2007';
/** Couleur de texte lisible sur un fond donné : noir ou blanc, selon le meilleur contraste (WCAG).
 * @param {string} bg - Couleur de fond (#rgb ou #rrggbb)
 * @returns {string} '#15202b' ou '#ffffff'
 */
function capInk(bg){
  let h=String(bg||'').replace('#',''); if(h.length===3) h=h.split('').map(x=>x+x).join(''); if(!/^[0-9a-f]{6}$/i.test(h)) return '#ffffff';
  const L=[0,2,4].map(i=>{ const c=parseInt(h.substr(i,2),16)/255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); });
  const lum=0.2126*L[0]+0.7152*L[1]+0.0722*L[2];
  return (lum+0.05)/0.0611 >= 1.05/(lum+0.05) ? '#15202b' : '#ffffff';
}
/** Couleur d'un texte coloré lisible sur le fond du thème : assombrie en thème clair.
 * @param {string} c - Couleur d'origine (#rrggbb)
 * @returns {string} Couleur adaptée
 */
function capTextOn(c){
  if(!capIsLight()) return c; let h=String(c||'').replace('#',''); if(h.length===3) h=h.split('').map(x=>x+x).join(''); if(!/^[0-9a-f]{6}$/i.test(h)) return c;
  return '#'+[0,2,4].map(i=>Math.round(parseInt(h.substr(i,2),16)*0.55).toString(16).padStart(2,'0')).join('');
}
/** Indique si le thème courant est clair (couleurs de texte foncées nécessaires). */
function capIsLight(){ return currentTheme==='light'||currentTheme==='office2007'; }

/**
 * Applique un thème en posant toutes ses variables CSS sur :root,
 * puis relance le rendu pour actualiser les couleurs SVG.
 */
/** Applique le thème visuel global (dark/light/dracula/solarized/nord).
 * @param {string} name - Clé du thème dans THEMES
 */
function applyTheme(name) {
  const t = THEMES[name];
  if (!t) return;
  currentTheme = name;
  document.documentElement.dataset.theme = name; // permet des styles propres à un thème (ex. Office 2007)
  Object.entries(t.css).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v)
  );
  setupMarkers(); // recrée les marqueurs (le losange vide utilise --c-bg)
  render(); // relance pour les couleurs SVG (nodeBg, nodeText…)
  // Re-render Physical Link si la vue est active (isLight doit être réévalué)
  const plView = document.getElementById('cap-view-physlink');
  if (plView && plView.style.display !== 'none' && plView._phl) {
    capRenderPhysLink();
  }
  // Tableau de bord : couleurs de la palette propres au thème
  const dashHold=document.getElementById('cap-view-dashboard');
  if (dashHold && dashHold.offsetParent && dashHold._dash) capRenderDashboard(dashHold);
  // Idem pour Component Exchange
  const cexView = document.getElementById('cap-view-compex');
  if (cexView && cexView.style.display !== 'none' && cexView._cex) {
    capRenderCompExchange();
  }
}

/** Bascule entre les modes d'affichage : default (Relation Map), PBS, table, capella.
 * Met à jour les boutons de mode, masque/affiche les panneaux et contrôles appropriés.
 * @param {string} mode - 'default'|'PBS'|'table'|'capella'
 */
function applyMode(mode) {
  if (mode !== 'default' && mode !== 'PBS' && mode !== 'table' && mode !== 'capella') return;
  currentMode = mode;
  const isTable   = mode === 'table';
  const isCapella = mode === 'capella';
  const isGraph   = !isTable && !isCapella;

  // Update mode buttons
  ['mode-rm','mode-pbs','mode-table','mode-capella'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove('active');
  });
  const modeMap={'default':'mode-rm','PBS':'mode-pbs','table':'mode-table','capella':'mode-capella'};
  const activeBtn=document.getElementById(modeMap[mode]); if(activeBtn) activeBtn.classList.add('active');

  // Show/hide toolbar buttons (+ to Compact)
  // Deuxième niveau de toolbar (commandes Relation Map) : visible uniquement en mode graphe
  const tb2=document.getElementById('toolbar2');
  if(tb2) tb2.style.display=isGraph?'flex':'none';
  // Hide export image menu in Table View and Capella Data
  const expWrap=document.getElementById('b-exp-wrap');
  if(expWrap) expWrap.style.display=(isTable||isCapella)?'none':'';
  // Capella inline view buttons
  const capTbViews=document.getElementById('cap-tb-views');
  // Toujours visibles dès qu'un modèle est chargé (indicateur : bouton Capella Data affiché ;
  // on évite de lire capLoaded, déclaré plus bas → zone morte au premier appel)
  const capModeBtn=document.getElementById('mode-capella');
  if(capTbViews) capTbViews.style.display=(capModeBtn&&capModeBtn.style.display!=='none')?'flex':'none';

  document.getElementById('graph').style.display         = isGraph ? '' : 'none';
  document.getElementById('table-view').style.display    = isTable ? 'flex' : 'none';
  const capOv = document.getElementById('capella-overlay');
  if(capOv) { if(isCapella) capOv.classList.add('cap-visible'); else capOv.classList.remove('cap-visible'); }
  document.getElementById('sec-disposition').style.display = (isTable||isCapella) ? 'none' : '';
  document.querySelector('#sec-props .sec-hdr')?.classList.toggle('coll', isTable||isCapella);
  document.querySelector('#sec-typ .sec-hdr')?.classList.toggle('coll', !(isTable||isCapella));
  // Masque complètement le menu Arborescence en Table View (plus de section dédiée, pas seulement réduite)
  const arboSec = document.getElementById('sec-arbo');
  if (arboSec) arboSec.style.display = isTable ? 'none' : '';
  // Section dédiée au picker de types Capella (groupé par couche ARCADIA), visible seulement en Table View
  const capTypSec = document.getElementById('sec-cap-typ');
  if (capTypSec) capTypSec.style.display = isTable ? '' : 'none';
  // La section Types d'éléments est masquée en Table View : le picker "Colonnes" vit
  // désormais dans la toolbar du tableau (menu déroulant ⊞ Colonnes, comme dans la vue Tableau).
  const typSec = document.getElementById('sec-typ');
  if (typSec) typSec.style.display = isTable ? 'none' : '';
  // Hide whole left panel in capella mode
  document.getElementById('panel').style.display = isCapella ? 'none' : '';
  document.getElementById('panel-resize-bar').style.display = isCapella ? 'none' : '';

  if (isTable) { buildTableView(); return; }
  if (isCapella) { positionOverlay(); capRenderCurrentView(); return; }

  const rmMode = mode==='PBS' ? 'PBS' : 'default';
  const cfg = MODES[rmMode];
  Object.keys(RCFG).forEach(t => { if (!(t in S.relF)) S.relF[t]=true; });
  [...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])].forEach(t => { if (!(t in S.typF)) S.typF[t]=true; });
  if (cfg) {
    Object.keys(S.relF).forEach(t => S.relF[t] = cfg.rel.includes(t));
    Object.keys(S.typF).forEach(t => S.typF[t] = cfg.typ.includes(t));
  } else {
    Object.keys(S.relF).forEach(t => S.relF[t] = true);
    Object.keys(S.typF).forEach(t => S.typF[t] = true);
  }
  buildPanel(); setupMarkers(); rebuildTree();
  const relHdr = document.getElementById('rel-body').previousElementSibling;
  const typHdr = document.getElementById('typ-body').previousElementSibling;
  if (cfg) { relHdr.classList.remove('coll'); typHdr.classList.remove('coll'); }
  else      { relHdr.classList.add('coll');    typHdr.classList.add('coll'); }
}

/** Retourne la valeur d'une variable CSS de thème. */
/** Lit la valeur d'une variable CSS (ex: --c-text). @param {string} varName */
function tv(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}