/* ══ 📋 SÉLECTION DE CELLULES DANS LES TABLEAUX DES VUES ══════════════════════════
 * Tous les tableaux des vues Capella (#cap-content) — sauf ▤ Tableau et ƒ Fonctions › 📋 Tableau, qui ont la leur,
 * les matrices et les tableaux clé / valeur — reçoivent la sélection de cellules :
 *  - clic-glisser : rectangle ; Ctrl+clic : ajouter / retirer ; Maj+clic : étendre ;
 *  - clic simple : sélectionne la cellule, SAUF si la cellule ou sa ligne a déjà une action au clic (curseur main,
 *    lien, bouton) : le clic simple garde alors son action et la sélection passe par le glisser ou Ctrl / Maj ;
 *  - pastille flottante : nombre de cellules, 📋 Copier (aussi Ctrl+C), Copier le tableau (lignes visibles + en-têtes), ✕ ;
 *  - Échap, clic hors du tableau ou nouveau rendu : sélection effacée.
 * La copie (capClipCopy) écrit du texte tabulé et un tableau HTML : une cellule à plusieurs lignes reste une seule
 * cellule dans Excel / Word, avec un retour à la ligne par élément.
 */
var CAP_CS_EXCL='#cap-table, .ana-fnt, .cap-mx, .ana-kv, .fex-box-t, .dash-tbl, .rmcb-t';   // tableaux non concernés
var _capCs={t:null, cells:new Set(), anchor:null, base:null, down:null, drag:false};          // sélection en cours

/** Copie une grille de cellules dans le presse-papiers : texte tabulé (cellules multi-lignes entre guillemets)
 * et tableau HTML (retours à la ligne gardés dans la cellule, y compris dans Excel).
 * @param {string[][]} grid - Lignes de cellules (une cellule peut contenir des retours à la ligne)
 * @param {Function} [done] - Appelée après la copie
 */
function capClipCopy(grid, done){
  const tsv=grid.map(r=>r.map(v=>{ v=String(v??''); return /[\t\n"]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }).join('\t')).join('\r\n');
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html='<table border="1" style="border-collapse:collapse">'+grid.map(r=>'<tr>'+r.map(v=>'<td style="vertical-align:top">'
    +esc(v).replace(/\r?\n/g,'<br style="mso-data-placement:same-cell">')+'</td>').join('')+'</tr>').join('')+'</table>';
  let ok=false;
  const h=e=>{ e.clipboardData.setData('text/plain',tsv); e.clipboardData.setData('text/html',html); e.preventDefault(); ok=true; };
  document.addEventListener('copy',h);
  try{ document.execCommand('copy'); }catch(e){}
  document.removeEventListener('copy',h);
  if(ok){ if(done) done(); return; }
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(tsv).then(()=>done&&done(),()=>{});
}

/** Tableau éligible à la sélection pour un élément cliqué (ou null).
 * @param {EventTarget} el - Cible de l'événement
 * @returns {HTMLTableElement|null}
 */
function capCsTable(el){
  const td=el&&el.closest&&el.closest('td'); if(!td) return null;
  const t=td.closest('table'); if(!t||!t.closest('#cap-content')||t.matches(CAP_CS_EXCL)) return null;
  if(td.closest('.cap-tf-row')) return null;
  return t;
}

/** Position « ligne:colonne » d'une cellule dans son tableau. @param {HTMLTableCellElement} td @returns {number[]} */
function capCsPos(td){ return [td.parentElement.rowIndex, td.cellIndex]; }

/** Repeint la sélection et place la pastille près de la dernière cellule. */
function capCsPaint(){
  document.querySelectorAll('td.cap-cs-sel').forEach(td=>td.classList.remove('cap-cs-sel'));
  const t=_capCs.t; let last=null;
  if(t&&t.isConnected) _capCs.cells.forEach(k=>{ const [r,c]=k.split(':').map(Number); const td=t.rows[r]?.cells[c]; if(td&&td.tagName==='TD'){ td.classList.add('cap-cs-sel'); last=td; } });
  let pill=document.getElementById('cap-cs-pill');
  if(!last){ if(pill) pill.style.display='none'; return; }
  if(!pill){ pill=document.createElement('div'); pill.id='cap-cs-pill'; document.body.appendChild(pill);
    pill.addEventListener('mousedown',e=>e.stopPropagation()); }
  const n=_capCs.cells.size;
  pill.innerHTML=`<span class="cap-cs-n">${n} cellule${n>1?'s':''}</span><button class="cap-lf-btn" data-cs="copy" title="Copier les cellules sélectionnées (Ctrl+C) — une cellule à plusieurs éléments garde un élément par ligne">📋 Copier</button><button class="cap-lf-btn" data-cs="all" title="Copier tout le tableau : en-têtes et lignes visibles (après filtres)">Copier le tableau</button><button class="cap-lf-btn" data-cs="x" title="Effacer la sélection (Échap)">✕</button>`;
  pill.querySelector('[data-cs="copy"]').onclick=()=>capCsCopy(false);
  pill.querySelector('[data-cs="all"]').onclick=()=>capCsCopy(true);
  pill.querySelector('[data-cs="x"]').onclick=()=>capCsClear();
  const r=last.getBoundingClientRect();
  pill.style.display='flex';
  const pw=pill.offsetWidth, ph=pill.offsetHeight;
  pill.style.left=Math.max(8,Math.min(window.innerWidth-pw-8, r.right-pw))+'px';
  pill.style.top=(r.bottom+6+ph>window.innerHeight ? r.top-ph-6 : r.bottom+6)+'px';
}

/** Efface la sélection de cellules des vues. */
function capCsClear(){ _capCs.t=null; _capCs.cells=new Set(); capCsPaint(); }

/** Texte d'une cellule pour la copie (retours à la ligne des éléments empilés conservés).
 * @param {HTMLTableCellElement} c @returns {string} */
function capCsText(c){ return (c.innerText||'').replace(/ /g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n'); }

/** Copie la sélection, ou tout le tableau (en-têtes et lignes visibles).
 * @param {boolean} all - Tout le tableau
 */
function capCsCopy(all){
  const t=_capCs.t; if(!t||!t.isConnected) return;
  const vis=tr=>tr.offsetParent!==null&&tr.style.display!=='none'&&!tr.classList.contains('cap-tf-row');
  let grid;
  if(all) grid=[...t.rows].filter(vis).map(tr=>[...tr.cells].map(capCsText));
  else {
    const cells=[..._capCs.cells].map(k=>k.split(':').map(Number));
    const rs=[...new Set(cells.map(x=>x[0]))].sort((a,b)=>a-b).filter(r=>t.rows[r]&&vis(t.rows[r]));
    const cs=[...new Set(cells.map(x=>x[1]))].sort((a,b)=>a-b);
    grid=rs.map(r=>cs.map(c=>_capCs.cells.has(r+':'+c)&&t.rows[r].cells[c]?capCsText(t.rows[r].cells[c]):''));
  }
  capClipCopy(grid,()=>{ const n=document.querySelector('#cap-cs-pill .cap-cs-n'); if(n) n.textContent=all?'✔ tableau copié':`✔ ${_capCs.cells.size} cellule(s) copiée(s)`; });
}

/** Rectangle de cellules entre deux positions. @param {number[]} a @param {number[]} b @returns {Set<string>} */
function capCsRect(a,b){ const s=new Set(); for(let r=Math.min(a[0],b[0]);r<=Math.max(a[0],b[0]);r++) for(let c=Math.min(a[1],b[1]);c<=Math.max(a[1],b[1]);c++) s.add(r+':'+c); return s; }

/** La cellule (ou sa ligne) a-t-elle déjà une action au clic ? (lien, bouton, curseur main)
 * @param {HTMLElement} target - Élément cliqué @param {HTMLTableCellElement} td @returns {boolean} */
function capCsClickable(target, td){
  if(target.closest('a,button,input,select,textarea,label,summary,[data-open],[data-id],[onclick]')) return true;
  return getComputedStyle(td).cursor==='pointer'||getComputedStyle(td.parentElement).cursor==='pointer';
}

// Câblage global (une fois) : souris, clavier
document.addEventListener('mouseover',e=>{ const t=capCsTable(e.target); if(t&&!t.classList.contains('cap-cs')) t.classList.add('cap-cs');
  if(!_capCs.down||!t||t!==_capCs.down.t) return;
  const td=e.target.closest('td'), p=capCsPos(td);
  if(!_capCs.drag&&p.join(':')===_capCs.down.p.join(':')) return;
  _capCs.drag=true; _capCs.t=t; _capCs.cells=new Set([..._capCs.base,...capCsRect(_capCs.anchor,p)]); capCsPaint();
});
document.addEventListener('mousedown',e=>{
  if(e.button!==0) return;
  const t=capCsTable(e.target);
  if(!t){ if(_capCs.cells.size && !(e.target.closest&&e.target.closest('#cap-cs-pill'))) capCsClear(); return; }
  const td=e.target.closest('td'), p=capCsPos(td), mod=e.ctrlKey||e.metaKey;
  if(_capCs.t!==t){ _capCs.cells=new Set(); _capCs.anchor=null; }
  const click=capCsClickable(e.target, td);
  if(e.shiftKey&&_capCs.anchor&&_capCs.t===t){ e.preventDefault(); _capCs.cells=new Set([...(mod?_capCs.cells:[]),...capCsRect(_capCs.anchor,p)]); capCsPaint(); return; }
  if(mod){ e.preventDefault(); _capCs.t=t; const k=p.join(':'); if(_capCs.cells.has(k)) _capCs.cells.delete(k); else _capCs.cells.add(k); _capCs.anchor=p; capCsPaint(); return; }
  // Clic simple : départ d'un glisser ; la cellule n'est sélectionnée tout de suite que si elle n'a pas d'action au clic
  _capCs.down={t,p}; _capCs.drag=false; _capCs.anchor=p; _capCs.base=new Set();
  if(!click){ e.preventDefault(); _capCs.t=t; _capCs.cells=new Set([p.join(':')]); capCsPaint(); }
  else if(_capCs.cells.size) capCsClear();
});
document.addEventListener('mouseup',()=>{ _capCs.down=null; if(_capCs.drag) setTimeout(()=>{ _capCs.drag=false; },0); });
document.addEventListener('click',e=>{ if(_capCs.drag){ e.stopPropagation(); e.preventDefault(); _capCs.drag=false; } },true);   // un glisser ne déclenche pas l'action de la ligne
document.addEventListener('keydown',e=>{
  if(!_capCs.cells.size) return;
  if(!_capCs.t||!_capCs.t.isConnected){ capCsClear(); return; }
  if(/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')) return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){ e.preventDefault(); capCsCopy(false); }
  else if(e.key==='Escape') capCsClear();
});
// Défilement ou nouveau rendu : la pastille suit ou disparaît
document.addEventListener('scroll',()=>{ if(_capCs.cells.size) capCsPaint(); },true);
