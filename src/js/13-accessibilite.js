/* ═══════════════════════════════════════════════════════════════════════════
   ♿ Accessibilité : clavier et lecteurs d'écran, sans modifier les vues.
   Un observateur équipe les commandes rendues comme des <div> / <span> cliquables (barre, menus,
   onglets, liens de détail, lignes de tableau…) : rôle « button », tabulation, Entrée / Espace = clic,
   nom accessible tiré de l'info-bulle quand le texte n'est qu'un pictogramme, état enfoncé des
   boutons à bascule (.active), icônes SVG décoratives masquées aux lecteurs d'écran.
   ═══════════════════════════════════════════════════════════════════════════ */

const CAP_A11Y_CLICK='.tbtn,.ctx-i,.cap-nav-it,.cap-det-link,.cex-det,.phl-link-badge,.phl-comp-hdr,.cdg-det-el,.cdg-lien,.cap-fold-btn,.cap-chain-hdr,.cap-card,.cap-tree-tog,.cap-ttab,.cap-ttab-close,.cap-nav-pin,[onclick]';
const CAP_A11Y_NATIVE=/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL|OPTION)$/;

/** Vrai si un texte ne contient aucune lettre ni chiffre (pictogrammes, symboles, espaces seulement).
 * @param {string} s - Texte
 * @returns {boolean}
 */
function capA11yPicto(s){ return !/[\p{L}\p{N}]/u.test(s||''); }

/** Nom accessible court tiré d'une info-bulle : sa première partie (avant « — », « : », « ; », une parenthèse ou un retour à la ligne), 60 caractères au plus.
 * @param {string} title - Info-bulle
 * @returns {string} Nom
 */
function capA11yName(title){ const t=String(title||'').split(/\s[—:;]\s|\s\(|\n/)[0].trim(); return t.length>60?t.slice(0,57).trim()+'…':t; }

/** Vrai si un élément est déjà atteignable au clavier par nature (contrôle natif) ou par un rôle posé ailleurs.
 * @param {Element} el - Élément
 * @returns {boolean}
 */
function capA11yNative(el){ return CAP_A11Y_NATIVE.test(el.tagName)||el.isContentEditable||el.hasAttribute('role')||el.hasAttribute('tabindex'); }

/** Équipe un élément cliquable : rôle, tabulation, nom accessible, état enfoncé.
 * @param {Element} el - Élément
 */
function capA11yEquip(el){
  if(!capA11yNative(el)){ el.setAttribute('role','button'); el.setAttribute('tabindex','0'); }
  if(!el.hasAttribute('aria-label')&&el.title&&capA11yPicto(el.textContent)) el.setAttribute('aria-label', capA11yName(el.title));
  capA11yPressed(el);
}

/** Reflète la classe .active d'un bouton à bascule dans aria-pressed (seulement s'il en a eu une).
 * @param {Element} el - Élément
 */
function capA11yPressed(el){
  const on=el.classList.contains('active');
  if(on||el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', on?'true':'false');
}

/** Passe sur une zone du document : commandes cliquables, icônes décoratives.
 * @param {Element|Document} root - Racine à traiter
 */
function capA11yFix(root){
  if(!root||!root.querySelectorAll) return;
  const list=root.matches&&root.matches(CAP_A11Y_CLICK)?[root]:[];
  list.push(...root.querySelectorAll(CAP_A11Y_CLICK));
  list.forEach(capA11yEquip);
  // Commandes dont le gestionnaire est une propriété (el.onclick=…) : lignes et cellules des tableaux, cartes, nœuds d'arbre
  root.querySelectorAll('div,span,tr,td,li').forEach(el=>{ if(el.onclick||el.ondblclick) capA11yEquip(el); });
  root.querySelectorAll('svg:not([aria-hidden]):not([role])').forEach(s=>{ if(!s.querySelector('title')) s.setAttribute('aria-hidden','true'); });
  root.querySelectorAll('img:not([alt])').forEach(i=>i.setAttribute('alt',''));
  root.querySelectorAll('button.phl-toggle-btn,button.tbtn').forEach(b=>{ capA11yPressed(b); if(!b.hasAttribute('aria-label')&&b.title&&capA11yPicto(b.textContent)) b.setAttribute('aria-label', capA11yName(b.title)); });
}

// Câblage : passe initiale, observateur des rendus (nœuds ajoutés, classes modifiées), Entrée / Espace sur les rôles « button »
(function(){
  if(typeof document==='undefined'||!document.body) return;
  let pending=new Set(), raf=0;
  const flush=()=>{ raf=0; const l=[...pending]; pending=new Set(); l.forEach(n=>{ if(n.isConnected) capA11yFix(n); }); };
  const queue=n=>{ pending.add(n); if(!raf) raf=requestAnimationFrame(flush); };
  new MutationObserver(ms=>{
    ms.forEach(m=>{
      if(m.type==='attributes'){ if(m.target.nodeType===1) capA11yPressed(m.target); return; }
      m.addedNodes.forEach(n=>{ if(n.nodeType===1) queue(n); });
    });
  }).observe(document.body,{childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  capA11yFix(document.body);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ') return;
    const t=e.target; if(!t||t.nodeType!==1||t.getAttribute('role')!=='button'||CAP_A11Y_NATIVE.test(t.tagName)||t.isContentEditable) return;
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    e.preventDefault(); t.click();
  });
})();
