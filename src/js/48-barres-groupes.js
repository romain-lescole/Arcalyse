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
