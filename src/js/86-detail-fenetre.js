// ── ⧉ Panneau de détail dans une fenêtre séparée ─────────────────────────────
// Bouton ⧉ du panneau de détail (page Capella et Relation Map) : tout le panneau (📋 Fiche, 🔗 Liens, 🧭 Sémantique,
// 🔲, 🔬, 💬) s'affiche dans une fenêtre séparée (par exemple sur un autre écran) qui défile verticalement.
// Le panneau de la page reste la source : son contenu est recopié dans la fenêtre à chaque changement (observateur
// `capDetPopWatch`), puis le panneau de la page est masqué pour laisser la place aux vues. Les gestionnaires `onclick`
// du contenu appellent les fonctions d'Arcalyse, rendues visibles dans la fenêtre (`capDetPopPont`) ; onglets, pagination
// et 🧭 navigateur sémantique y sont servis par délégation. ⧈ (ou la fermeture de la fenêtre) ramène le panneau.

/** État de la fenêtre séparée : fenêtre, panneau de la page recopié (`cap-detail` ou `rm-detail`), nom affiché. */
const _capDetPop={win:null, src:'', nom:''};
/** Panneaux de détail de la page et leur contenu. */
const CAP_DETPOP_SRC=[['cap-detail','cap-detail-content'],['rm-detail','rm-detail-content']];

/** @returns {Window|null} Fenêtre séparée du panneau de détail, si elle est ouverte */
function capDetPop(){ const w=_capDetPop.win; return w&&!w.closed?w:null; }

/** Ouvre (ou ramène au premier plan) la fenêtre séparée du panneau de détail. */
function capDetPopOut(){
  if(capDetPop()){ capDetPop().focus(); return; }
  const w=window.open('', 'arcalyse-detail', 'width=820,height=900');
  if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
  const D=w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="cdp-body"></body></html>'); D.close();
  document.querySelectorAll('style').forEach(st=>D.head.appendChild(D.importNode(st,true)));
  D.body.innerHTML=`<div class="cdp-hdr"><b>${_L('🔎 Propriétés')}</b><span class="cdp-nom"></span><span style="flex:1"></span>`+
    `<button type="button" class="cap-lf-btn" data-cdp="back" title="${_L('Ramener le panneau de détail dans la page')}">⧈</button></div>`+
    `<div id="cdp-box" class="cdp-box"></div>`;
  _capDetPop.win=w; _capDetPop.nom='';
  capDetPopPont(w);
  D.addEventListener('click', capDetPopClic);
  D.addEventListener('input', capSemSaisie);
  D.addEventListener('change', e=>{ const s=e.target.closest('.cap-pg-sel'); if(s) capPgShow(s.closest('.cap-pg'), +s.value); });
  D.addEventListener('keydown', e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.getAttribute&&e.target.getAttribute('role')==='button'){ e.preventDefault(); e.target.click(); }
    else if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); }
    else if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){ e.preventDefault(); capHistNav(e.key==='ArrowLeft'?-1:1); }
  });
  w.addEventListener('pagehide', capDetPopBack);
  // Contenu de départ : panneau visible de la page (sinon celui du mode courant)
  const vis=CAP_DETPOP_SRC.find(([d])=>{ const x=document.getElementById(d); return x&&x.style.display!=='none'&&x.offsetParent; });
  const src=vis||CAP_DETPOP_SRC[currentMode==='capella'?0:1];
  capDetPopCopie(src[0]);
  capDetPopBoutons();
}

/** Rend visibles dans la fenêtre séparée les fonctions d'Arcalyse appelées par les `onclick` du contenu recopié.
 * @param {Window} w - Fenêtre séparée
 */
function capDetPopPont(w){
  Object.keys(window).forEach(k=>{ try{ if(typeof window[k]==='function'&&!(k in w)) w[k]=window[k]; }catch(e){ /* propriété protégée */ } });
}

/** Recopie dans la fenêtre le contenu d'un panneau de détail de la page, puis masque ce panneau.
 * @param {string} detId - `cap-detail` ou `rm-detail`
 */
function capDetPopCopie(detId){
  const w=capDetPop(); if(!w) return;
  const pair=CAP_DETPOP_SRC.find(([d])=>d===detId), det=document.getElementById(detId), src=pair&&document.getElementById(pair[1]);
  const D=w.document, box=D.getElementById('cdp-box'); if(!box) return;
  _capDetPop.src=detId;
  capRevPopTheme(w);
  if(src&&src.innerHTML.trim()) box.innerHTML=src.innerHTML;
  else box.innerHTML=`<div class="csb-vide">${_L('Ouvrez le détail d\'un élément : il s\'affichera ici.')}</div>`;
  const h=box.querySelector('h3'), nom=h?(h.lastElementChild||h).textContent.trim():'';   // sans le texte de l'icône
  if(nom!==_capDetPop.nom) box.scrollTop=0;   // autre élément : retour en haut ; même élément (rafraîchi) : position gardée
  _capDetPop.nom=nom;
  D.querySelector('.cdp-nom').textContent=nom?' — '+nom:'';
  D.title=_L('🔎 Propriétés')+' — '+(nom?nom+' — ':'')+(capCurrentFileName||'Arcalyse');
  if(_capSem.q) capSemFiltre(box.querySelector('.csb-q'));
  if(det&&det.style.display!=='none'){ det.style.display='none'; capDockSync(); }
}

/** Clic dans la fenêtre séparée : ⧈, onglets du panneau, pagination, 🧭 navigateur sémantique.
 * @param {MouseEvent} e - Clic
 */
function capDetPopClic(e){
  const box=e.currentTarget.getElementById('cdp-box');
  if(e.target.closest('[data-cdp="back"]')){ const w=capDetPop(); if(w) w.close(); capDetPopBack(); return; }
  const t=e.target.closest('.cap-det-tabs [data-dtab]');
  if(t){ capDetTabShow(box, t.dataset.dtab); _capNav.det=t.dataset.dtab; capNavSave();
    const src=document.querySelector(`#${_capDetPop.src}-content`); if(src) capDetTabShow(src, t.dataset.dtab); return; }
  const b=e.target.closest('.cap-pg-bar [data-pg-go]'); if(b){ e.preventDefault(); capPgShow(b.closest('.cap-pg'), b.dataset.pgGo); return; }
  capSemClic(e);
}

/** Fenêtre fermée : le panneau de détail revient dans la page (s'il a un contenu). */
function capDetPopBack(){
  if(!_capDetPop.win) return;
  _capDetPop.win=null;
  const det=_capDetPop.src&&document.getElementById(_capDetPop.src), src=det&&document.getElementById(_capDetPop.src+'-content');
  if(det&&src&&src.innerHTML.trim()&&(_capDetPop.src==='cap-detail'?currentMode==='capella':currentMode!=='capella')) det.style.display='flex';
  capDockSync();
  capDetPopBoutons();
}

/** Boutons ⧉ des panneaux de détail de la page (créés au chargement du module ; enfoncés pendant que la fenêtre est ouverte). */
function capDetPopBoutons(){
  CAP_DETPOP_SRC.forEach(([d])=>{
    const det=document.getElementById(d); if(!det) return;
    let b=det.querySelector(':scope > .cap-det-popb');
    if(!b){ b=document.createElement('button'); b.type='button'; b.className='cap-det-popb'; b.textContent='⧉';
      b.title=_L('Ouvrir le panneau de détail dans une fenêtre séparée (par exemple sur un autre écran) : il suit l\'élément choisi');
      b.addEventListener('click', capDetPopOut); det.insertBefore(b, det.firstChild); }
    b.classList.toggle('active', !!capDetPop());
  });
}

/** Observe les contenus des panneaux de détail : tout changement est recopié dans la fenêtre séparée ouverte. */
function capDetPopWatch(){
  CAP_DETPOP_SRC.forEach(([d,c])=>{
    const box=document.getElementById(c); if(!box) return;
    let prevu=false;
    new MutationObserver(()=>{ if(!capDetPop()||prevu) return; prevu=true;
      requestAnimationFrame(()=>{ prevu=false; capDetPopCopie(d); }); }).observe(box, {childList:true, subtree:true});
  });
}
capDetPopBoutons();
capDetPopWatch();
window.addEventListener('pagehide', ()=>{ const w=capDetPop(); if(w) w.close(); });
