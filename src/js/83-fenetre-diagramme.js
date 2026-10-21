/* ═══════════════════════════════════════════════════════════════════════
   ⧉ FENÊTRE DE COMPARAISON DES DIAGRAMMES
   ───────────────────────────────────────────────────────────────────────
   Une seule fenêtre séparée (réutilisée) pour afficher un second diagramme à côté de celui de 🔲 Diagrammes
   Capella, par exemple sur un autre écran, et les comparer. Elle s'ouvre par ⧉ Comparer (barre de la vue),
   par le clic droit sur un diagramme de l'explorateur ou dans le diagramme ouvert, et propose sa propre liste.
   Le dessin est l'export SVG de la visionneuse (capDiagSvg, 54) : zoom à la molette, déplacement au glisser,
   clic sur un élément → panneau de détail dans la page. Une seule fenêtre : la visionneuse n'a qu'une instance
   (identifiants fixes), et deux diagrammes côte à côte suffisent à comparer.
   ═══════════════════════════════════════════════════════════════════════ */

/** État de la fenêtre de comparaison : fenêtre, diagramme affiché, cadrage courant et cadrage d'origine (viewBox). */
const _capDgw = { win:null, uid:'', vb:null, vb0:null };

/** @returns {Window|null} fenêtre de comparaison, si elle est ouverte */
function capDgwWin(){ const w=_capDgw.win; return w&&!w.closed?w:null; }

/** Ferme la fenêtre de comparaison (autre .aird ou autre modèle chargé, page quittée). */
function capDgwFermer(){ const w=capDgwWin(); if(w) w.close(); _capDgw.win=null; _capDgw.uid=''; }

/**
 * Affiche un diagramme dans la fenêtre de comparaison, ouverte au besoin (une seule fenêtre, réutilisée).
 * Le diagramme ouvert dans la page est rétabli après l'export.
 * @param {string} uid - Représentation (diagramme) à afficher
 */
async function capDgwOuvrir(uid){
  if(!uid){ capToast(_L('Ouvrez ou choisissez d\'abord un diagramme.')); return; }
  if(!_capDiag.vis){ capToast(_L('Ouvrez d\'abord 🔲 Diagrammes Capella.')); return; }
  let w=capDgwWin();
  if(!w){
    w=window.open('', 'arcalyse-diagramme', 'width=1100,height=800');
    if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
    _capDgw.win=w; capDgwPreparer(w);
  }
  w.focus();
  const z=w.document.getElementById('dgw-zone'); if(z) z.innerHTML=`<div class="dgw-msg">${_L('Préparation du diagramme…')}</div>`;
  const avant=_capDiag.actif; let svg='';
  try{ svg=await capDiagSvg(uid); }
  catch(e){ if(z) z.innerHTML=`<div class="dgw-msg">${_L('Diagramme impossible à afficher')} : ${capEsc(e.message||String(e))}</div>`; return; }
  finally{ if(avant&&avant!==uid&&_capDiag.vis){ _capDiag.vis.ouvrir(avant); _capDiag.actif=avant; capDiagMarquerActif(); } }
  _capDgw.uid=uid;
  capDgwAfficher(w, svg);
}

/**
 * Prépare le document de la fenêtre : styles et thème de la page, barre (liste des diagrammes, zoom), zone de dessin, écouteurs.
 * @param {Window} w - Fenêtre de comparaison
 */
function capDgwPreparer(w){
  const D=w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="dgw-body"></body></html>'); D.close();
  D.title=_L('⧉ Comparaison de diagrammes');
  document.querySelectorAll('style').forEach(st=>D.head.appendChild(D.importNode(st,true)));
  capRevPopTheme(w);
  D.body.innerHTML=`<div class="dgw-barre"><select id="dgw-choix" class="phl-filter-input" title="${_L('Diagramme affiché dans cette fenêtre')}">${capDgwOptions()}</select>`+
    `<span class="tb-grp"><button class="cap-lf-btn" data-z="moins" title="${_L('Zoom arrière')}">−</button><span id="dgw-pct" class="dgw-pct"></span>`+
    `<button class="cap-lf-btn" data-z="plus" title="${_L('Zoom avant')}">+</button><button class="cap-lf-btn" data-z="ajuster" title="${_L('Ajuster le diagramme à la fenêtre')}">${_L('⤢ Ajuster')}</button></span>`+
    `<span class="dgw-aide">${_L('Molette : zoom · glisser : déplacer · clic sur un élément : son détail dans la page')}</span></div>`+
    `<div id="dgw-zone" class="dgw-zone"></div>`;
  D.getElementById('dgw-choix').addEventListener('change',e=>capDgwOuvrir(e.target.value));
  D.body.addEventListener('click',e=>{ const b=e.target.closest('[data-z]'); if(!b) return; const k=b.dataset.z;
    if(k==='ajuster') capDgwCadre(w, Object.assign({}, _capDgw.vb0)); else capDgwZoom(w, k==='plus'?1/1.25:1.25); });
  const zone=D.getElementById('dgw-zone');
  zone.addEventListener('wheel',e=>{ e.preventDefault(); capDgwZoom(w, e.deltaY<0?1/1.15:1.15, e.clientX, e.clientY); }, {passive:false});
  // Glisser : déplacer ; clic sans déplacement sur un élément : son détail dans la page
  zone.addEventListener('pointerdown',e=>{
    if(e.button!==0||!_capDgw.vb) return;
    const x0=e.clientX, y0=e.clientY, v0=Object.assign({}, _capDgw.vb), k=1/capDgwEchelle(w), cible=e.target; let bouge=false;
    const mv=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!bouge&&Math.abs(dx)+Math.abs(dy)<4) return; bouge=true; zone.classList.add('dgw-glisse');
      capDgwCadre(w, Object.assign({}, v0, {x:v0.x-dx*k, y:v0.y-dy*k})); };
    const fin=ev=>{ zone.removeEventListener('pointermove',mv); zone.removeEventListener('pointerup',fin); zone.classList.remove('dgw-glisse');
      if(bouge) return; const s=cible.closest&&cible.closest('[data-sem]'); if(s) capOpenDetailById(s.getAttribute('data-sem')); };   // cible de l'appui (pointeur capturé)
    zone.setPointerCapture(e.pointerId); zone.addEventListener('pointermove',mv); zone.addEventListener('pointerup',fin);
  });
  w.addEventListener('resize',()=>capDgwPct(w));
}

/** @returns {string} options de la liste des diagrammes (tableaux exclus : pas d'export SVG), groupées par couche */
function capDgwOptions(){
  const reps=capDiagReps().filter(r=>r.genre!=='tableau'), esc=capEsc, par={};
  reps.forEach(r=>{ (par[r.couche||'—']=par[r.couche||'—']||[]).push(r); });
  return Object.keys(par).sort((a,b)=>capDiagRang(a)-capDiagRang(b)).map(c=>`<optgroup label="${esc(c)} — ${esc(capDiagCouche(c).label||'')}">`+
    par[c].sort((a,b)=>a.nom.localeCompare(b.nom)).map(r=>`<option value="${esc(r.uid)}"${r.uid===_capDgw.uid?' selected':''}>${esc(r.nom)}</option>`).join('')+`</optgroup>`).join('');
}

/**
 * Pose le SVG d'un diagramme dans la fenêtre, cadré sur tout le diagramme.
 * @param {Window} w - Fenêtre de comparaison
 * @param {string} svg - SVG exporté par la visionneuse
 */
function capDgwAfficher(w, svg){
  const D=w.document, zone=D.getElementById('dgw-zone'), r=capDiagReps().find(x=>x.uid===_capDgw.uid)||{};
  zone.innerHTML=svg;
  const s=zone.querySelector('svg'); if(!s){ zone.innerHTML=`<div class="dgw-msg">${_L('Diagramme vide.')}</div>`; return; }
  let vb=(s.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number);
  if(vb.length!==4||vb.some(isNaN)){ const bb=s.getBBox(); vb=[bb.x, bb.y, bb.width||1, bb.height||1]; }
  _capDgw.vb0={x:vb[0], y:vb[1], w:vb[2], h:vb[3]};
  s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('preserveAspectRatio','xMidYMid meet'); s.classList.add('dgw-svg');
  capDgwCadre(w, Object.assign({}, _capDgw.vb0));
  D.title='⧉ '+(r.nom||_L('Diagramme'))+' — Arcalyse';
  const ch=D.getElementById('dgw-choix'); if(ch){ ch.innerHTML=capDgwOptions(); ch.value=_capDgw.uid; }
}

/**
 * Applique un cadrage (viewBox) au diagramme de la fenêtre.
 * @param {Window} w - Fenêtre de comparaison
 * @param {{x:number,y:number,w:number,h:number}} vb - Cadrage
 */
function capDgwCadre(w, vb){
  const s=w.document.querySelector('#dgw-zone svg'); if(!s||!vb) return;
  _capDgw.vb=vb; s.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); capDgwPct(w);
}

/** @param {Window} w @returns {number} pixels d'écran par unité du diagramme (cadrage « meet ») */
function capDgwEchelle(w){
  const z=w.document.getElementById('dgw-zone'), vb=_capDgw.vb; if(!z||!vb) return 1;
  return Math.min(z.clientWidth/vb.w, z.clientHeight/vb.h)||1;
}

/**
 * Zoom autour d'un point de la fenêtre (centre de la zone par défaut).
 * @param {Window} w - Fenêtre de comparaison
 * @param {number} f - Facteur appliqué au cadrage (< 1 : zoom avant)
 * @param {number} [cx] - Abscisse du point fixe (coordonnées de la fenêtre)
 * @param {number} [cy] - Ordonnée du point fixe
 */
function capDgwZoom(w, f, cx, cy){
  const z=w.document.getElementById('dgw-zone'), vb=_capDgw.vb, v0=_capDgw.vb0; if(!z||!vb) return;
  const nw=Math.min(v0.w*8, Math.max(v0.w/40, vb.w*f)); f=nw/vb.w;
  const r=z.getBoundingClientRect(), k=capDgwEchelle(w);
  if(cx==null){ cx=r.left+r.width/2; cy=r.top+r.height/2; }
  // Point du diagramme sous le curseur (cadrage centré : marges égales de part et d'autre)
  const ox=r.left+(r.width-vb.w*k)/2, oy=r.top+(r.height-vb.h*k)/2, px=vb.x+(cx-ox)/k, py=vb.y+(cy-oy)/k;
  capDgwCadre(w, {x:px-(px-vb.x)*f, y:py-(py-vb.y)*f, w:vb.w*f, h:vb.h*f});
}

/** Met à jour le pourcentage de zoom affiché (100 % = diagramme entier dans la fenêtre). @param {Window} w */
function capDgwPct(w){ const p=w.document.getElementById('dgw-pct'); if(p&&_capDgw.vb) p.textContent=Math.round(_capDgw.vb0.w/_capDgw.vb.w*100)+' %'; }

/**
 * Clic droit sur un diagramme de l'explorateur de 🔲 Diagrammes Capella : ouvrir ici, dans la fenêtre de comparaison, ses informations.
 * @param {MouseEvent} e - Événement contextmenu
 */
function capDgwContexte(e){
  const it=e.target.closest&&e.target.closest('#cdg-gauche .cdg-it[data-uid]'); if(!it) return;
  e.preventDefault();
  const uid=it.dataset.uid, r=capDiagReps().find(x=>x.uid===uid)||{}, esc=capEsc;
  let m=document.getElementById('cdg-ctx');
  if(!m){ m=document.createElement('div'); m.id='cdg-ctx'; document.body.appendChild(m);
    document.addEventListener('mousedown',ev=>{ if(!ev.target.closest('#cdg-ctx')) m.style.display='none'; });
    m.addEventListener('click',ev=>{ const a=ev.target.closest('[data-dgw]'); m.style.display='none'; if(!a) return;
      const u=m.dataset.uid; if(a.dataset.dgw==='pop') capDgwOuvrir(u); else if(a.dataset.dgw==='info') capDiagInfo(u); else capDiagOpen(u); }); }
  m.dataset.uid=uid;
  m.innerHTML=`<div class="crv-ctx-t">🔲 ${esc(r.nom||'')}</div>`+
    `<div class="ctx-i" data-dgw="ici">${_L('🔲 Ouvrir ici')}</div>`+
    `<div class="ctx-i" data-dgw="pop">${_L('⧉ Afficher dans la fenêtre de comparaison')}</div>`+
    `<div class="ctx-i" data-dgw="info">${_L('ℹ Informations du diagramme')}</div>`;
  if(r.genre==='tableau') m.querySelector('[data-dgw="pop"]').remove();   // tableau : pas d'export SVG
  m.style.display='block';
  m.style.left=Math.min(e.clientX, innerWidth-m.offsetWidth-8)+'px'; m.style.top=Math.min(e.clientY, innerHeight-m.offsetHeight-8)+'px';
}

// Câblage : clic droit dans l'explorateur, fenêtre fermée avec la page, thème recopié
(function(){
  document.addEventListener('contextmenu',capDgwContexte);
  window.addEventListener('pagehide',capDgwFermer);
  new MutationObserver(()=>{ const w=capDgwWin(); if(w) capRevPopTheme(w); }).observe(document.documentElement,{attributes:true, attributeFilter:['data-theme','data-tone','style']});
})();
