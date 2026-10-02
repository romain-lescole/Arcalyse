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

let currentTheme = 'dark';
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
function capIsLight(){ return currentTheme==='light'||currentTheme==='office2007'||(currentTheme==='custom'&&!!(THEMES.custom&&THEMES.custom.light)); }

/* ── Contraste des textes colorés en thème clair ──
   Les vues écrivent leurs couleurs en dur (couleurs de couche, de type…), pensées pour un fond sombre.
   En thème clair, un correcteur global fonce ces couleurs jusqu'au contraste minimal, en gardant
   leur teinte : (1) règles CSS générées pour les couleurs fixes des feuilles de style ;
   (2) observation du DOM pour les couleurs en ligne (style="color:…") posées par le JS. */
/** Contraste minimal visé pour un texte coloré (WCAG AA, texte courant). */
const CAP_MIN_CONTRAST=4.5;
/** Décompose une couleur CSS (#rgb, #rrggbb, rgb(), rgba()) en [r,g,b,a].
 * @param {string} s - Couleur CSS
 * @returns {number[]|null} [r,g,b,a] ou null si non reconnue (var(), nom de couleur…)
 */
function capParseColor(s){
  s=String(s||'').trim();
  let m=s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if(m){ let h=m[1]; if(h.length===3) h=h.split('').map(x=>x+x).join(''); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)).concat(1); }
  m=s.match(/^rgba?\(([^)]+)\)$/i);
  if(m){ const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); if(p.length<3||p.slice(0,3).some(isNaN)) return null; return [p[0],p[1],p[2],p.length>3&&!isNaN(p[3])?p[3]:1]; }
  return null;
}
/** Luminance relative WCAG d'une couleur [r,g,b]. */
function capLuminance(c){ const L=c.slice(0,3).map(v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*L[0]+0.7152*L[1]+0.0722*L[2]; }
/** Rapport de contraste WCAG entre deux couleurs [r,g,b]. */
function capContrast(a,b){ const x=capLuminance(a), y=capLuminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
/** Superpose une couleur semi-transparente [r,g,b,a] sur un fond opaque [r,g,b,1]. */
function capBlend(top,bot){ const a=top[3]; return [0,1,2].map(i=>top[i]*a+bot[i]*(1-a)).concat(1); }
/** Couleur [r,g,b] → #rrggbb. */
function capHex(c){ return '#'+c.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''); }
/** Couleur de texte lisible sur un fond donné, en conservant la teinte : foncée sur fond clair, éclaircie
 * sur fond foncé ; un texte neutre (blanc, noir, gris) bascule sur l'encre la plus lisible.
 * @param {number[]} fg - Couleur du texte [r,g,b,a]
 * @param {number[]} bg - Fond opaque [r,g,b,1]
 * @returns {string|null} Couleur corrigée (#rrggbb), ou null si le contraste est déjà suffisant
 */
function capReadableOn(fg,bg){
  if(fg[3]<1) fg=capBlend(fg,bg);
  if(capContrast(fg,bg)>=CAP_MIN_CONTRAST) return null;
  const darken=capLuminance(bg)>0.18, rgb=fg.slice(0,3);
  if(Math.max(...rgb)-Math.min(...rgb)<24) return darken?'#15202b':'#ffffff';
  const to=darken?0:255; let c=rgb;
  for(let k=1;k<=20;k++){ c=rgb.map(v=>v+(to-v)*k/20); if(capContrast(c,bg)>=CAP_MIN_CONTRAST) break; }
  return capHex(c);
}
/** Fond effectif (opaque) derrière un élément : superpose les fonds semi-transparents de ses ancêtres.
 * @param {Element} el - Élément
 * @param {Map} cache - Cache élément → fond, partagé pendant une passe
 * @returns {number[]} [r,g,b,1]
 */
function capEffectiveBg(el,cache){
  if(!el||el.nodeType!==1) return capParseColor(getComputedStyle(document.body).backgroundColor)||[255,255,255,1];
  if(cache.has(el)) return cache.get(el);
  const c=capParseColor(getComputedStyle(el).backgroundColor);
  const r=c&&c[3]>=1?c:c&&c[3]>0?capBlend(c,capEffectiveBg(el.parentElement,cache)):capEffectiveBg(el.parentElement,cache);
  cache.set(el,r); return r;
}
/** Corrige le contraste des textes colorés en ligne (style="color:…") d'un sous-arbre, en thème clair.
 * La couleur d'origine est gardée dans data-c0 (restaurée par capRestoreContrast).
 * @param {Element} root - Racine à traiter
 * @param {boolean} [self] - true : ne traiter que la racine (changement d'attribut style)
 */
function capFixContrast(root,self){
  if(!capIsLight()||!root||root.nodeType!==1) return;
  const cache=new Map(), els=root.matches('[style*="color"]')?[root]:[];
  if(!self) root.querySelectorAll('[style*="color"]').forEach(e=>els.push(e));
  const acc=capParseColor(getComputedStyle(document.documentElement).getPropertyValue('--c-accent'));
  els.forEach(el=>{
    const own=el.style&&el.style.color; if(!own||el.dataset.cfix===own) return;
    const fg=capParseColor(own); if(!fg) return;
    const bg=capEffectiveBg(el,cache); let fix=capReadableOn(fg,bg);
    // Dans une ligne de tableau : lisible aussi au survol et en sélection (teinte d'accent ≈ 12 %)
    if(acc&&el.closest('tr')){ const f2=capReadableOn(fix?capParseColor(fix):fg, capBlend([acc[0],acc[1],acc[2],.12],bg)); if(f2) fix=f2; }
    if(!fix) return;
    el.dataset.c0=own; el.style.color=fix; el.dataset.cfix=el.style.color;
  });
}
/** Rend leurs couleurs d'origine aux textes corrigés par capFixContrast (retour à un thème sombre). */
function capRestoreContrast(){
  document.querySelectorAll('[data-cfix]').forEach(el=>{ if(el.style.color===el.dataset.cfix) el.style.color=el.dataset.c0; delete el.dataset.cfix; delete el.dataset.c0; });
}
/** Génère, pour le thème clair courant, des règles qui foncent les couleurs de texte fixes des feuilles
 * de style au contraste insuffisant. Placées avant la feuille principale : les réglages manuels propres
 * à un thème (html[data-theme=…]) restent prioritaires à spécificité égale.
 */
function capContrastCss(){
  let st=document.getElementById('cap-contrast-css');
  if(!capIsLight()){ if(st) st.textContent=''; return; }
  if(!st){ st=document.createElement('style'); st.id='cap-contrast-css'; document.head.insertBefore(st,document.head.firstChild); }
  const rs=getComputedStyle(document.documentElement);
  const bgs=['--c-bg','--c-bg2'].map(v=>capParseColor(rs.getPropertyValue(v))).filter(Boolean).map(c=>c[3]<1?capBlend(c,[255,255,255,1]):c);
  if(!bgs.length) return;
  // + fond de survol / sélection des tableaux (accent ≈ 12 % sur --c-bg2)
  const acc=capParseColor(rs.getPropertyValue('--c-accent')); if(acc) bgs.push(capBlend([acc[0],acc[1],acc[2],.12],bgs[bgs.length-1]));
  const out=[];
  /** Parcourt les règles (y compris dans les @media). */
  const walk=rules=>{ for(const r of rules){
    if(!r.selectorText){ if(r.cssRules) walk(r.cssRules); continue; }
    if(/data-theme|data-tone|::/.test(r.selectorText)) continue;
    const fg=capParseColor(r.style.color); if(!fg) continue;
    const own=capParseColor(r.style.backgroundColor);
    let fix=null;
    bgs.forEach(b=>{ const f=capReadableOn(fix?capParseColor(fix):fg, own&&own[3]>0?capBlend(own,b):b); if(f) fix=f; });
    if(fix) out.push(`html[data-theme="${currentTheme}"] :is(${r.selectorText}){color:${fix}}`);
  } };
  for(const sh of document.styleSheets){ if(sh.ownerNode===st) continue; try{ walk(sh.cssRules); }catch(e){} }
  st.textContent=out.join('\n');
}
// Observation du DOM : corrige les textes colorés dès leur insertion (une passe par image affichée)
const _capCfix={nodes:new Set(), attrs:new Set(), raf:0};
new MutationObserver(muts=>{
  if(!capIsLight()) return;
  muts.forEach(m=>{ if(m.type==='childList') m.addedNodes.forEach(n=>{ if(n.nodeType===1) _capCfix.nodes.add(n); }); else _capCfix.attrs.add(m.target); });
  if(_capCfix.raf||(!_capCfix.nodes.size&&!_capCfix.attrs.size)) return;
  _capCfix.raf=requestAnimationFrame(()=>{ _capCfix.raf=0;
    const n=[..._capCfix.nodes], a=[..._capCfix.attrs]; _capCfix.nodes.clear(); _capCfix.attrs.clear();
    n.forEach(x=>{ if(x.isConnected) capFixContrast(x); }); a.forEach(x=>{ if(x.isConnected) capFixContrast(x,true); });
  });
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});

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
  document.documentElement.dataset.tone = capIsLight() ? 'light' : 'dark'; // règles communes aux thèmes clairs
  // Retire les variables posées par un thème précédent et absentes de celui-ci (ex. statuts du thème personnalisé)
  new Set([...Object.values(THEMES).flatMap(x=>Object.keys(x.css)),'--c-ok','--c-warn','--c-err']).forEach(k=>{ if(!(k in t.css)) document.documentElement.style.removeProperty(k); });
  Object.entries(t.css).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v)
  );
  capThemeLayersApply(name); // couleurs des couches ARCADIA (thème personnalisé)
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
  // Contraste des textes colorés : remise à l'origine, puis correction si le thème est clair
  capRestoreContrast(); capContrastCss(); capFixContrast(document.body);
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
  ['mode-rm','mode-pbs','mode-table'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove('active');
  });
  // En mode capella, le bouton actif est celui de la vue (capUpdateToolbarForView)
  const modeMap={'default':'mode-rm','PBS':'mode-pbs','table':'mode-table'};
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
  // Toujours visibles, même avant le chargement d'un modèle
  if(capTbViews){
    if(!isCapella) capTbViews.querySelectorAll('.tbtn.active').forEach(b=>b.classList.remove('active'));
  }

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