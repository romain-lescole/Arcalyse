// ── ⏭ Pagination commune des listes et tableaux ───────────────────────────
// capPaged(items, options) rend une liste ou un tableau par pages de CAP_PG_SIZE lignes (barre ‹ 1 – 200 / 816 ›,
// choix de la page, « Tout afficher ») : seules les lignes de la page sont fabriquées et insérées dans le DOM.
// Utilisée par capXtTable (39, tous les tableaux des 🔬 Analyses), le panneau de détail (25), 🧩 Ports (30),
// 🧬 Traçabilité (31) et 🔗 Liens (22). Avec un filtre par colonne (42) actif, le tableau passe en « Tout afficher »
// pour que le filtre porte sur toutes les lignes.

/** Lignes par page. */
var CAP_PG_SIZE=200;
/** Blocs paginés vivants : id → {items, render, size, page, all, open, close}. */
var _capPg={seq:0, blocks:{}};

/** HTML d'une liste ou d'un tableau paginé.
 * @param {Array} items - Lignes (chaînes HTML, ou données rendues par `render`)
 * @param {Object} [opt] - `render(item, index)` → HTML ; `size` ; `open` / `close` : HTML autour du corps, le corps étant
 *   l'élément de classe `cap-pg-body` (par défaut un `<div>` ; pour un tableau : `<table><thead>…</thead><tbody class="cap-pg-body">` … `</tbody></table>`)
 * @returns {string} HTML
 */
function capPaged(items, opt){
  opt=opt||{};
  const render=opt.render||(x=>x), size=opt.size||CAP_PG_SIZE;
  const open=opt.open||'<div class="cap-pg-body">', close=opt.close||'</div>';
  if(items.length<=size) return open+items.map(render).join('')+close;
  capPgPrune();
  const id='pg'+(++_capPg.seq);
  const st=_capPg.blocks[id]={items, render, size, page:0, all:false};
  const top=/<table/i.test(open)?capPgBar(st):'';   // tableau : barre aussi en tête
  return `<div class="cap-pg" data-pg="${id}">${top}${open}${capPgRows(st)}${close}${capPgBar(st)}</div>`;
}

/** Lignes de la page courante (ou toutes). @param {Object} st - État du bloc @returns {string} HTML */
function capPgRows(st){
  const a=st.all?0:st.page*st.size, b=st.all?st.items.length:Math.min(st.items.length, a+st.size);
  let h=''; for(let i=a;i<b;i++) h+=st.render(st.items[i], i); return h;
}

/** Barre de pagination d'un bloc. @param {Object} st - État du bloc @returns {string} HTML */
function capPgBar(st){
  const n=st.items.length, pages=Math.ceil(n/st.size);
  if(st.all) return `<div class="cap-pg-bar">${_L(`${n} lignes`)} · <button type="button" class="cap-pg-b" data-pg-go="0" title="${_L('Revenir à l\'affichage par pages')}">${_L(`Par pages de ${st.size}`)}</button></div>`;
  const a=st.page*st.size+1, b=Math.min(n, a+st.size-1);
  const sel=pages<=200?`<select class="cap-pg-sel" title="${_L('Aller à la page')}">${[...Array(pages)].map((_,i)=>`<option value="${i}"${i===st.page?' selected':''}>${i*st.size+1} – ${Math.min(n,(i+1)*st.size)}</option>`).join('')}</select>`:`<span class="cap-pg-pos">${a} – ${b}</span>`;
  return `<div class="cap-pg-bar"><button type="button" class="cap-pg-b" data-pg-go="prev" title="${_L('Page précédente')}"${st.page?'':' disabled'}>‹</button>${sel} / ${n}<button type="button" class="cap-pg-b" data-pg-go="next" title="${_L('Page suivante')}"${st.page<pages-1?'':' disabled'}>›</button>`+
    ` · <button type="button" class="cap-pg-b" data-pg-go="all" title="${_L('Afficher toutes les lignes (plus lent au-delà de quelques milliers)')}">${_L('Tout afficher')}</button></div>`;
}

/** Affiche une page d'un bloc (ou toutes les lignes) et met la barre à jour ; un filtre par colonne (42) actif est réappliqué.
 * @param {HTMLElement} block - Élément `.cap-pg`
 * @param {number|'prev'|'next'|'all'} go - Page (index), déplacement ou toutes
 */
function capPgShow(block, go){
  const st=_capPg.blocks[block.dataset.pg]; if(!st) return;
  const pages=Math.ceil(st.items.length/st.size);
  if(go==='all') st.all=true;
  else { st.all=false; st.page=go==='prev'?st.page-1:go==='next'?st.page+1:+go; st.page=Math.max(0, Math.min(pages-1, st.page||0)); }
  const body=block.querySelector('.cap-pg-body'); if(body) body.innerHTML=capPgRows(st);
  block.querySelectorAll(':scope > .cap-pg-bar').forEach(bar=>{ bar.outerHTML=capPgBar(st); });
  const t=body&&body.closest('table');
  if(t&&t._tfSt&&t._tfSt.f.some(Boolean)&&typeof capTfFilter==='function') capTfFilter(t, t._tfSt);
}

/** Oublie les blocs qui ne sont plus affichés (mémoire). */
function capPgPrune(){
  Object.keys(_capPg.blocks).forEach(id=>{ if(!document.querySelector(`[data-pg="${id}"]`)) delete _capPg.blocks[id]; });
}

// Barre : boutons et choix de page (délégation sur le document : vues, panneau de détail, Relation Map)
document.addEventListener('click',e=>{
  const b=e.target.closest('.cap-pg-bar [data-pg-go]'); if(!b) return;
  e.preventDefault(); e.stopPropagation(); capPgShow(b.closest('.cap-pg'), b.dataset.pgGo);
});
document.addEventListener('change',e=>{
  const s=e.target.closest('.cap-pg-sel'); if(!s) return;
  capPgShow(s.closest('.cap-pg'), +s.value);
});
