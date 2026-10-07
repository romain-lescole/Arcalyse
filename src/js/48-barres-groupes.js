/* ══ ▭ GROUPES DES BARRES DE COMMANDES ══════════════════════════════════════════════
 * Dans 📡 Flux & interfaces et 🔬 Analyses, les commandes des barres sont entourées par catégorie, comme dans
 * ƒ Fonctions (cadre .tb-grp) : boutons de vue, boutons de filtre, champs et cases à cocher, exports.
 * Les barres étant redessinées par leurs vues, un observateur regroupe chaque nouvelle barre (les commandes
 * sont déplacées, pas recréées : identifiants et écouteurs sont conservés).
 */
var CAP_TBG_ROOTS=['cap-view-fex','cap-view-csys','cap-view-cblk','cap-view-compex','cap-view-physlink','cap-view-ports','cap-view-analyses'];

/** Nature d'un élément de barre pour le regroupement.
 * @param {Element} el
 * @returns {string} 'grp' (déjà groupé), 'view', 'chip', 'export', 'field', 'chipbox', 'exportbox' ou 'other'
 */
function capTbKind(el){
  if(el.classList.contains('tb-grp')) return 'grp';
  if(el.matches('button.phl-toggle-btn')) return 'view';
  if(el.matches('button.phl-export-btn')) return 'export';
  if(el.matches('button.cap-lf-btn')) return 'chip';
  if(el.matches('input,select,label')) return 'field';
  if(el.tagName==='SPAN'||el.tagName==='DIV'){
    const ch=[...el.children];
    if(ch.length&&ch.every(c=>c.matches('button.cap-lf-btn,button.phl-toggle-btn'))) return 'chipbox';
    if(ch.length&&ch.every(c=>c.matches('button.phl-export-btn,button.cap-lf-btn'))&&ch.some(c=>c.matches('.phl-export-btn'))) return 'exportbox';
    if(!ch.length&&/:\s*$/.test(el.textContent.trim())) return 'field';   // libellé « Fonction : » suivi de son champ
  }
  return 'other';
}

/** Entoure, dans une barre, chaque suite de commandes de même nature par un cadre .tb-grp.
 * @param {HTMLElement} bar - Barre (.phl-toggle-bar, .phl-filter-bar…)
 */
function capTbGroup(bar){
  if(bar._tbg||bar.closest('.tb-grp')) return;
  bar._tbg=true;
  let run=null, kind=null;
  const flush=()=>{ if(run&&run.length){ const g=document.createElement('span'); g.className='tb-grp'; run[0].before(g); run.forEach(x=>g.appendChild(x)); } run=null; kind=null; };
  [...bar.children].forEach(el=>{
    if(el.style.display==='none'){ return; }
    const k=capTbKind(el);
    if(k==='chipbox'||k==='exportbox'){ flush(); el.classList.add('tb-grp'); return; }
    if(k==='view'||k==='chip'||k==='export'||k==='field'){ if(k!==kind) flush(); (run=run||[]).push(el); kind=k; return; }
    flush();
  });
  flush();
}

/** Regroupe toutes les barres d'un conteneur. @param {HTMLElement} root */
function capTbGroupAll(root){
  root.querySelectorAll('.phl-toggle-bar, .phl-filter-bar').forEach(capTbGroup);
}

// Observateurs : regroupement après chaque rendu des vues concernées
(function(){
  CAP_TBG_ROOTS.forEach(id=>{
    const root=document.getElementById(id); if(!root) return;
    let pending=false;
    new MutationObserver(()=>{ if(pending) return; pending=true; requestAnimationFrame(()=>{ pending=false; capTbGroupAll(root); }); })
      .observe(root,{childList:true, subtree:true});
  });
})();

/* ── En-têtes collants : les barres du haut d'une vue restent visibles quand on fait défiler ──
 * Vues : ⚡ Chaînes, 📡 Flux & interfaces, ƒ Fonctions (⛓ Traçabilité, 📊 Métriques, 🩺 Contrôles…), 🔬 Analyses.
 * Les barres (.phl-toggle-bar, .phl-filter-bar, .cap-lf-bar) qui se suivent en haut de la vue deviennent
 * « sticky », empilées ; les en-têtes de tableau déjà collants sont décalés d'autant pour rester visibles dessous.
 */
var CAP_TBS_ROOTS=['cap-view-chains','cap-view-fex','cap-view-csys','cap-view-cblk','cap-view-compex','cap-view-physlink','cap-view-ports','cap-view-functions','cap-view-analyses'];
var CAP_TBS_BARS='.phl-toggle-bar, .phl-filter-bar, .cap-lf-bar';

/** Conteneur qui fait défiler un élément (premier ancêtre dont le débordement vertical n'est pas visible).
 * @param {Element} el @returns {Element|null} */
function capTbsScroller(el){
  for(let p=el.parentElement; p; p=p.parentElement){ if(getComputedStyle(p).overflowY!=='visible') return p; }
  return null;
}

/** Couleur de fond effective d'un élément (premier ancêtre au fond non transparent).
 * @param {Element} el @returns {string} */
function capTbsBg(el){
  for(let p=el; p; p=p.parentElement){ const c=getComputedStyle(p).backgroundColor; if(c&&c!=='transparent'&&!/rgba\(.*,\s*0\)$/.test(c)) return c; }
  return 'var(--c-bg)';
}

/** Rend collantes les barres du haut d'une vue et décale les en-têtes de tableau collants qui défilent avec elle.
 * @param {HTMLElement} root - Vue qui défile (#cap-view-…)
 */
function capTbSticky(root){
  if(!root||!root.offsetParent) return;   // vue masquée : mesure impossible
  root.querySelectorAll('.tbs-on').forEach(b=>{ b.classList.remove('tbs-on'); b.style.top=''; b.style.background=''; });
  const R=root.getBoundingClientRect(), y0=R.top-root.scrollTop, pad=parseFloat(getComputedStyle(root).paddingTop)||0;
  const bars=[...root.querySelectorAll(CAP_TBS_BARS)].filter(b=>b.offsetParent&&!b.parentElement.closest(CAP_TBS_BARS)&&capTbsScroller(b)===root)
    .map(b=>{ const r=b.getBoundingClientRect(); return {b, y:r.top-y0, h:r.height}; }).sort((a,b)=>a.y-b.y);
  // En-tête = barres consécutives en haut de la vue (petits textes intercalés tolérés)
  const head=[]; let last=pad;
  for(const x of bars){ if(x.y-last>(head.length?45:60)) break; head.push(x); last=x.y+x.h; }
  const bg=capTbsBg(root);
  let top=-pad;   // la première barre recouvre aussi la marge haute de la vue
  head.forEach(x=>{ x.b.classList.add('tbs-on'); x.b.style.top=top+'px'; x.b.style.background=bg; top+=x.h; });
  // En-têtes de tableau collants de la même zone de défilement : sous les barres
  root.querySelectorAll('thead th').forEach(th=>{
    if(th.dataset.tbsTop===undefined){ if(getComputedStyle(th).position!=='sticky') return; th.dataset.tbsTop=parseFloat(getComputedStyle(th).top)||0; }
    th.style.top=(capTbsScroller(th)===root?(+th.dataset.tbsTop)+(head.length?top:0):+th.dataset.tbsTop)+'px';
  });
}

// Observateurs : recalcul après chaque rendu, à l'affichage de la vue et au redimensionnement
(function(){
  const roots=CAP_TBS_ROOTS.map(id=>document.getElementById(id)).filter(Boolean);
  roots.forEach(root=>{
    let pending=false;
    const run=()=>{ if(pending) return; pending=true; requestAnimationFrame(()=>{ pending=false; capTbSticky(root); }); };
    new MutationObserver(run).observe(root,{childList:true, subtree:true});
    new MutationObserver(run).observe(root,{attributes:true, attributeFilter:['style']});   // vue affichée / masquée
  });
  window.addEventListener('resize',()=>roots.forEach(r=>capTbSticky(r)));
})();
