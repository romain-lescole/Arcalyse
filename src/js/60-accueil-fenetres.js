/* ═══════════════════════════════════════════════════════════════════════
   🏠 ACCUEIL (suite) — ⧉ fenêtres séparées, glisser-déposer depuis les autres vues
   (les 🧾 tableaux blancs ont été retirés en 3.0 ; les pages d'une ancienne page de projet restent dans `_capHome.boards`, non affichées)
   ───────────────────────────────────────────────────────────────────────
   • ⧉ Fenêtre séparée : une check-list, un plan de revue ou un dossier de relecture s'ouvre dans sa propre fenêtre
     (même script, mêmes données, styles et thème recopiés, comme 💬 Revue) ; la vue montre alors un rappel.
   • Glisser-déposer depuis les vues : lignes de la liste de 🔲 Diagrammes Capella, cartes et arborescence de
     🧭 Explorateur, chaînes de ⚡ Chaînes — vers une check-list ou un dossier ouvert en fenêtre séparée.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── ⧉ Fenêtres séparées ───────────────────────────────────────────────── */

/** Fenêtres séparées ouvertes : « doc:id » ou « dos:id » → fenêtre. */
const _capHomePops=new Map();
/**
 * Liste des objets d'un type de fenêtre séparée.
 * @param {string} kind - 'doc' (check-list, plan) | 'dos' (dossier de relecture)
 * @returns {object[]}
 */
function capHomePopListe(kind){ return kind==='doc'?_capHome.docs:kind==='dos'?_capHome.dossiers:[]; }
/**
 * Fenêtre séparée ouverte pour une check-list (doc) ou un dossier (dos).
 * @param {string} kind - 'doc' | 'dos'
 * @param {string} id - Identifiant
 * @returns {Window|null}
 */
function capHomePopWin(kind, id){ const w=_capHomePops.get(kind+':'+id); return w&&!w.closed?w:null; }
/** @returns {Document[]} documents des fenêtres séparées ouvertes */
function capHomePopDocs(){ return [..._capHomePops.values()].filter(w=>w&&!w.closed).map(w=>w.document); }
/** Ferme la fenêtre séparée d'une check-list ou d'un dossier. @param {string} kind @param {string} id */
function capHomePopClose(kind, id){ const w=capHomePopWin(kind,id); if(w) w.close(); _capHomePops.delete(kind+':'+id); }
/**
 * Rappel affiché dans la vue quand une check-list ou un dossier est ouvert dans sa fenêtre.
 * @param {string} kind - 'doc' | 'dos'
 * @param {object} o - Document ou page
 * @returns {string} HTML
 */
function capHomePopPlace(kind, o){
  return `<div class="hm-doc hm-pop-place"><div class="hm-empty">${_L(`⧉ « ${capEsc(o.titre||'')} » est ouvert dans une fenêtre séparée.`)}<br><br>`+
    `<button class="cap-lf-btn" data-a="pop" data-kind="${kind}" data-id="${o.id}">${_L('⧉ Afficher la fenêtre')}</button> `+
    `<button class="cap-lf-btn" data-a="pop-back" data-kind="${kind}" data-id="${o.id}">${_L('⧈ Ramener ici')}</button></div></div>`;
}
/**
 * ⧉ Ouvre une check-list, un plan de revue ou un dossier dans une fenêtre séparée (même script, mêmes données).
 * Les diagrammes et éléments peuvent y être glissés depuis les vues de la page (🔲, 🧭, ⚡).
 * @param {string} kind - 'doc' | 'dos'
 * @param {string} id - Identifiant
 */
function capHomePopOpen(kind, id){
  const w0=capHomePopWin(kind,id); if(w0){ w0.focus(); return; }
  const o=capHomePopListe(kind).find(x=>x.id===id); if(!o) return;
  const w=window.open('', 'arcalyse-'+kind+'-'+id, kind==='dos'?'width=1150,height=900':'width=860,height=900');
  if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
  const D=w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="hm-pop-body"><div class="hm-pop"></div></body></html>'); D.close();
  document.querySelectorAll('style').forEach(st=>D.head.appendChild(D.importNode(st,true)));
  capRevPopTheme(w);
  _capHomePops.set(kind+':'+id, w);
  capHomeWire(D.querySelector('.hm-pop'));
  w.addEventListener('pagehide',()=>{ _capHomePops.delete(kind+':'+id); setTimeout(capHomeRender,0); });
  w.addEventListener('keydown',e=>{ if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); } });
  capHomeRender();
}
/** Réaffiche le contenu des fenêtres séparées ouvertes (ferme celles dont la check-list ou la page a été supprimée). */
function capHomePopsRender(){
  _capHomePops.forEach((w,key)=>{
    if(!w||w.closed){ _capHomePops.delete(key); return; }
    const [kind,id]=key.split(':'), o=capHomePopListe(kind).find(x=>x.id===id), host=w.document.querySelector('.hm-pop');
    if(!o||!host){ w.close(); _capHomePops.delete(key); return; }
    w.document.title=(kind==='doc'?(o.kind==='plan'?'📋 ':'☑ '):'📑 ')+(o.titre||'')+' — Arcalyse';
    const pos=capHomeScrollGet(host);
    const corps=kind==='doc'?`<div class="hm-main"><div class="hm-doc" data-docid="${id}">${capHomeDocHtml(o)}</div></div>`
      :`<div class="hm-main"><div class="hm-doc dos-ed" data-dosid="${id}">${capDosHtml(o)}</div></div>`;
    host.innerHTML=`<div class="hm-body">${corps}${capHomePaletteHtml()}</div>`;
    capHomeScrollSet(host, pos);
  });
}

/* ── Glisser-déposer depuis les vues de la page ─────────────────────────── */

/** Éléments des vues qui peuvent être glissés vers une check-list ou un dossier. */
const CAP_HOME_SOURCES='#cdg-gauche .cdg-it[data-uid], #cap-view-cards .cap-card, #cap-view-tree .cap-tree-row[data-id], #cap-view-chains .ccm-item[data-id], #cap-view-chains .cap-chain-hdr';
/**
 * Référence portée par un élément glissable d'une vue (diagramme de la liste, élément de l'Explorateur, chaîne).
 * @param {Element} n - Élément (CAP_HOME_SOURCES)
 * @returns {object|null} référence
 */
function capHomeDragRef(n){
  if(n.matches('.cdg-it')){ const r=capDiagReps().find(x=>x.uid===n.dataset.uid); return r?capHomeRefDiag(r):null; }
  if(n.matches('.cap-chain-hdr')){ const c=n.closest('[data-chain]'); return c?capHomeRefEl(c.dataset.chain):null; }
  if(n.dataset.id) return capHomeRefEl(n.dataset.id);
  const e=typeof capRevElementAt==='function'&&capRevElementAt(n); return e?capHomeRefEl(e.id):null;
}

// Câblage : sources de glisser-déposer, fermeture des fenêtres avec la page, thème recopié
(function(){
  document.addEventListener('mousedown',e=>{ const n=e.target.closest&&e.target.closest(CAP_HOME_SOURCES); if(n&&!n.draggable) n.draggable=true; },true);
  document.addEventListener('dragstart',e=>{
    if(!e.dataTransfer||[...e.dataTransfer.types].includes(CAP_HOME_DND)) return;
    const n=e.target.closest&&e.target.closest(CAP_HOME_SOURCES); if(!n) return;
    const ref=capHomeDragRef(n); if(!ref) return;
    e.dataTransfer.setData(CAP_HOME_DND, JSON.stringify(ref)); e.dataTransfer.setData('text/plain', ref.nom||''); e.dataTransfer.effectAllowed='copy';
  });
  window.addEventListener('pagehide',()=>_capHomePops.forEach(w=>{ try{ w.close(); }catch(_){} }));
  new MutationObserver(()=>_capHomePops.forEach(w=>{ if(w&&!w.closed) capRevPopTheme(w); })).observe(document.documentElement,{attributes:true, attributeFilter:['data-theme','data-tone','style']});
})();
