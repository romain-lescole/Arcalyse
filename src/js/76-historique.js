// ── ◀ ▶ Historique de navigation ─────────────────────────────────────────
// Chaque vue ouverte (capShowView, sous-vues de 🔬 Analyses), chaque élément ouvert dans le panneau
// de détail (capOpenDetail) et chaque diagramme ouvert (capDiagOpen) est consigné ; les boutons ◀ ▶ de la
// barre (Alt+← / Alt+→, boutons latéraux de la souris) y reviennent. Clic droit sur un bouton : liste des étapes.
// Les fonctions d'origine sont enveloppées au chargement de ce module (portée globale commune) :
// aucun autre module n'est à modifier pour consigner une navigation.

/** État de l'historique : étapes `{view, det, diag, t}` (clé de vue, élément du détail, diagramme), position
 * courante `pos`, `lock` pendant un retour (rien n'est consigné). */
var _capHist={items:[], pos:-1, lock:false, max:200};

/** Clé de la vue affichée, comme dans le menu ☰ : `@rm` pour la Relation Map, `ana:<sous-vue>` pour 🔬 Analyses.
 * @returns {string} Clé
 */
function capHistKey(){
  if(typeof currentMode!=='undefined'&&currentMode!=='capella') return '@rm';
  return capCurrentView==='analyses'?'ana:'+capAnaSub:capCurrentView;
}

/** Consigne une étape (sauf pendant un retour) : les étapes « avant » après la position courante sont oubliées,
 * une étape identique à la courante n'est pas doublée.
 * @param {{view:string, det?:string, diag?:string}} e - Étape
 */
function capHistPush(e){
  if(_capHist.lock) return;
  const H=_capHist, k=o=>`${o.view}|${o.det||''}|${o.diag||''}`;
  if(H.pos>=0&&k(H.items[H.pos])===k(e)) return;
  H.items=H.items.slice(0,H.pos+1); H.items.push({...e, t:Date.now()});
  if(H.items.length>H.max) H.items=H.items.slice(H.items.length-H.max);
  H.pos=H.items.length-1; capHistSync();
}

/** Revient à une étape de l'historique (vue, puis diagramme ou élément du détail).
 * @param {number} i - Index de l'étape
 */
function capHistGo(i){
  const H=_capHist, e=H.items[i]; if(!e) return;
  H.pos=i; H.lock=true;
  try{
    if(e.view==='@rm'){ if(currentMode==='capella') document.getElementById('mode-rm')?.click(); }
    else if(e.view!==capHistKey()||currentMode!=='capella'){
      if(e.view.startsWith('ana:')){ capAnaSub=e.view.slice(4); capShowView('analyses'); } else capShowView(e.view); }
    if(e.diag) capDiagOpen(e.diag, e.det);
    else if(e.det) capOpenDetail(e.det);
  } finally { H.lock=false; }
  capHistSync();
}

/** ◀ ou ▶ : étape précédente ou suivante.
 * @param {number} d - −1 (précédent) ou +1 (suivant)
 */
function capHistNav(d){
  const i=_capHist.pos+d; if(i<0||i>=_capHist.items.length) return;
  capHistGo(i);
}

/** Libellé d'une étape pour la liste : vue (nom du menu), diagramme ou élément.
 * @param {{view:string, det?:string, diag?:string}} e - Étape
 * @returns {string} HTML
 */
function capHistLabel(e){
  const esc=capEsc, it=CAP_NAV_ITEMS.find(i=>i.k===e.view), vue=it?it.l:(e.view==='@rm'?_L('🗺 Relation Map'):esc(e.view));
  if(e.diag){ const r=(typeof capDiagReps==='function'?capDiagReps():[]).find(x=>x.uid===e.diag); return `🔲 ${esc(r?r.nom:e.diag)}`; }
  if(e.det){ const el=capGetElementById_(e.det); return el?`${capIcoType(el.typeName, 12)} ${esc(el.attrs.name||el.id)} <span class="cap-nav-g">${esc(el.typeName)}</span>`:esc(e.det); }
  return vue;
}

/** Met à jour les boutons ◀ ▶ de la barre (grisés aux extrémités, infobulle = étape visée). */
function capHistSync(){
  const H=_capHist, b=document.getElementById('b-hist-back'), f=document.getElementById('b-hist-fwd'); if(!b||!f) return;
  const txt=e=>e?e.diag?'🔲':e.det?(capGetElementById_(e.det)?.attrs.name||e.det):(CAP_NAV_ITEMS.find(i=>i.k===e.view)?.l||e.view):'';
  const p=H.items[H.pos-1], n=H.items[H.pos+1];
  b.classList.toggle('off',!p); b.setAttribute('aria-disabled',!p); b.title=_L('Précédent (Alt+←)')+(p?' : '+txt(p).replace(/<[^>]+>/g,''):'');
  f.classList.toggle('off',!n); f.setAttribute('aria-disabled',!n); f.title=_L('Suivant (Alt+→)')+(n?' : '+txt(n).replace(/<[^>]+>/g,''):'');
}

/** Liste des étapes (clic droit sur ◀ ou ▶) : les plus récentes en haut, l'étape courante marquée.
 * @param {HTMLElement} anchor - Bouton sous lequel placer la liste
 */
function capHistMenu(anchor){
  const H=_capHist; if(!H.items.length) return;
  let dd=document.getElementById('cap-hist-dd');
  if(!dd){ dd=document.createElement('div'); dd.id='cap-hist-dd'; dd.className='cap-hist-dd'; document.body.appendChild(dd);
    dd.addEventListener('click',e=>{ const o=e.target.closest('[data-hi]'); if(o){ capHistClose(); capHistGo(+o.dataset.hi); } });
    document.addEventListener('mousedown',e=>{ if(!e.target.closest('#cap-hist-dd')) capHistClose(); }); }
  const rows=[]; for(let i=H.items.length-1;i>=0;i--) rows.push(`<div class="ctx-i cap-nav-it${i===H.pos?' cur':''}" data-hi="${i}"><span>${capHistLabel(H.items[i])}</span></div>`);
  dd.innerHTML=`<div class="cap-nav-hint">${_L('Historique de navigation')} · ${H.items.length}</div>`+rows.slice(0,40).join('');
  dd.style.display='block';
  const r=anchor.getBoundingClientRect(); dd.style.left=Math.max(4, Math.min(r.left, innerWidth-dd.offsetWidth-4))+'px'; dd.style.top=(r.bottom+4)+'px';
}

/** Ferme la liste des étapes. */
function capHistClose(){ const dd=document.getElementById('cap-hist-dd'); if(dd) dd.style.display='none'; }

/** Vide l'historique au chargement d'un autre modèle, qui s'ouvre sur 🏠 Accueil (première étape). */
function capHistReset(){ _capHist.items=[]; _capHist.pos=-1; capHistSync(); capHistPush({view:'home'}); }   // un modèle s'ouvre sur 🏠 Accueil

// ── Enveloppes des fonctions de navigation (déclarations hissées : réaffectées ici, après leur définition) ──
(()=>{
  const sv=capShowView, od=capOpenDetail, dg=capDiagOpen, am=applyMode;
  capShowView=function(view){ sv(view); capHistPush({view:capHistKey()}); };
  capOpenDetail=function(id){ od(id); if(capGetElementById_(id)) capHistPush({view:capHistKey(), det:id}); };
  capDiagOpen=function(uid, id){ const l=_capHist.lock; _capHist.lock=true; try{ dg(uid, id); } finally{ _capHist.lock=l; } capHistPush({view:'diag', diag:uid, det:id||''}); };
  applyMode=function(mode){ am(mode); if(mode!=='capella') capHistPush({view:'@rm'}); };
  // Boutons de la barre, raccourcis Alt+← / Alt+→, boutons latéraux de la souris
  const b=document.getElementById('b-hist-back'), f=document.getElementById('b-hist-fwd');
  b?.addEventListener('click',()=>capHistNav(-1)); f?.addEventListener('click',()=>capHistNav(1));
  [b,f].forEach(x=>x?.addEventListener('contextmenu',e=>{ e.preventDefault(); capHistMenu(x); }));
  document.addEventListener('keydown',e=>{
    if(!e.altKey||e.ctrlKey||e.metaKey||e.shiftKey) return;
    if(e.key==='ArrowLeft'){ e.preventDefault(); capHistNav(-1); } else if(e.key==='ArrowRight'){ e.preventDefault(); capHistNav(1); }
  });
  document.addEventListener('mouseup',e=>{ if(e.button===3){ e.preventDefault(); capHistNav(-1); } else if(e.button===4){ e.preventDefault(); capHistNav(1); } });
  capHistSync();
})();
