/* ══ 🔬 TABLEAUX DES ANALYSES : FILTRES ET LARGEUR DES COLONNES ═══════════════════════
 * Chaque tableau affiché dans une sous-vue de 🔬 Analyses (table.ana-t, table.cap-chain-xtable ; ni les matrices
 * ni les tableaux clé/valeur) reçoit une ligne de filtres sous l'en-tête (un champ par colonne) et des poignées
 * de redimensionnement sur le bord droit des en-têtes. Les tableaux étant redessinés par leurs sous-vues,
 * un observateur équipe les nouveaux tableaux ; filtres et largeurs sont retenus par sous-vue et par en-tête
 * (le temps de la session).
 */
var _capTfState={};   // clé (sous-vue + en-têtes) → {f:[filtres], w:[largeurs px]}

/** Normalise un texte pour la comparaison (minuscules, sans accents).
 * @param {string} s
 * @returns {string}
 */
function capTfNorm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }

/** Équipe les tableaux pas encore traités d'un conteneur.
 * @param {HTMLElement} root - Conteneur (zone des sous-vues de 🔬 Analyses)
 */
function capTfEnhanceAll(root){
  root.querySelectorAll('table.ana-t:not(.ana-kv), table.cap-chain-xtable').forEach(t=>{ if(!t._tf) capTfEnhance(t); });
}

/** Ajoute la ligne de filtres et les poignées de redimensionnement à un tableau.
 * @param {HTMLTableElement} t
 */
function capTfEnhance(t){
  t._tf=true;
  if(t.parentElement.closest('table')) return;             // tableau imbriqué (détail d'une ligne)
  capTfScrollWrap(t);
  const head=t.rows[0];
  if(!head||!head.cells.length||[...head.cells].some(c=>c.tagName!=='TH'||c.colSpan>1)) return;
  const n=head.cells.length;
  const key=capAnaSub+'|'+[...head.cells].map(c=>c.textContent.trim()).join('¦');
  const st=_capTfState[key]||(_capTfState[key]={f:[],w:[]});
  // Ligne de filtres
  const fr=document.createElement('tr'); fr.className='cap-tf-row';
  fr.innerHTML=[...Array(n)].map((_,i)=>`<th><input type="text" data-tf="${i}" placeholder="Filtrer…" title="Filtrer cette colonne (plusieurs mots : tous requis ; « ! » en tête : exclure)" value="${capEsc(st.f[i]||'')}"></th>`).join('');
  head.after(fr);
  fr.addEventListener('input',e=>{ const i=+e.target.dataset.tf; st.f[i]=e.target.value; capTfFilter(t,st); });
  // Poignées de redimensionnement
  [...head.cells].forEach((th,i)=>{
    th.style.position='relative';
    const h=document.createElement('span'); h.className='cap-tf-rz'; h.title='Glisser pour régler la largeur de la colonne (double-clic : largeur automatique)';
    h.addEventListener('click',e=>e.stopPropagation());
    h.addEventListener('dblclick',e=>{ e.stopPropagation(); st.w=[]; t.classList.remove('cap-tf-fixed'); t.style.width='';
      [...head.cells].forEach(c=>c.style.width=''); });
    h.addEventListener('mousedown',e=>{
      e.preventDefault(); e.stopPropagation();
      capTfFreeze(t,st);
      const x0=e.clientX, w0=st.w[i]; h.classList.add('drag');
      const mv=ev=>{ st.w[i]=Math.max(40,Math.round(w0+ev.clientX-x0)); capTfWidths(t,st); };
      const up=()=>{ h.classList.remove('drag'); document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
    th.appendChild(h);
  });
  if(st.w.length===n) capTfWidths(t,st);
  if(st.f.some(Boolean)) capTfFilter(t,st);
}

/** Place le tableau dans un conteneur à défilement horizontal (seule la vue défile verticalement) et lui ajoute
 * une barre de défilement horizontal flottante, collée en bas de l'écran tant que le tableau est visible.
 * Si le tableau est déjà dans une zone défilante de 🔬 Analyses sans hauteur limitée, c'est cette zone qui est équipée.
 * @param {HTMLTableElement} t
 */
function capTfScrollWrap(t){
  let w=null;
  for(let a=t.parentElement; a&&a.id!=='ana-box'&&a.id!=='cap-view-analyses'; a=a.parentElement){
    if(a.classList.contains('cap-tf-scroll')) return;
    const cs=getComputedStyle(a);
    if(cs.overflowX==='auto'||cs.overflowX==='scroll'){
      if(cs.maxHeight!=='none'||a.style.height) return;   // zone à hauteur limitée : elle a déjà ses barres
      w=a; break;                                          // zone existante, haute comme le tableau
    }
  }
  if(!w){ w=document.createElement('div'); t.before(w); w.appendChild(t); }
  w.classList.add('cap-tf-scroll');
  capTfHBar(w,t);
}

/** Barre de défilement horizontal flottante d'un tableau : synchronisée avec son conteneur, affichée seulement
 * quand le tableau est plus large que la vue.
 * @param {HTMLElement} w - Conteneur à défilement horizontal
 * @param {HTMLTableElement} t - Tableau
 */
function capTfHBar(w,t){
  const bar=document.createElement('div'); bar.className='cap-tf-hbar';
  bar.title='Défilement horizontal du tableau';
  const inner=document.createElement('div'); bar.appendChild(inner);
  w.after(bar);
  bar.addEventListener('scroll',()=>{ if(w.scrollLeft!==bar.scrollLeft) w.scrollLeft=bar.scrollLeft; });
  w.addEventListener('scroll',()=>{ if(bar.scrollLeft!==w.scrollLeft) bar.scrollLeft=w.scrollLeft; });
  const fit=()=>{
    const over=w.scrollWidth>w.clientWidth+1;
    bar.style.display=over?'':'none';
    if(over){ inner.style.width=w.scrollWidth+'px'; bar.style.width=w.clientWidth+'px'; bar.scrollLeft=w.scrollLeft; }
  };
  fit();
  if(window.ResizeObserver){ const ro=new ResizeObserver(fit); ro.observe(t); ro.observe(w); }
}

/** Fige les largeurs actuelles des colonnes (avant le premier redimensionnement).
 * @param {HTMLTableElement} t
 * @param {Object} st - État du tableau ({f, w})
 */
function capTfFreeze(t,st){
  const cells=[...t.rows[0].cells];
  if(st.w.length!==cells.length) st.w=cells.map(c=>Math.round(c.getBoundingClientRect().width));
  capTfWidths(t,st);
}

/** Applique les largeurs retenues (disposition fixe, le texte passe à la ligne).
 * @param {HTMLTableElement} t
 * @param {Object} st - État du tableau ({f, w})
 */
function capTfWidths(t,st){
  t.classList.add('cap-tf-fixed');
  [...t.rows[0].cells].forEach((c,i)=>c.style.width=st.w[i]+'px');
  t.style.width=st.w.reduce((a,b)=>a+b,0)+'px';
}

/** Masque les lignes qui ne correspondent pas aux filtres et affiche le compteur.
 * Une ligne de détail (une seule cellule fusionnée) suit la ligne qui la précède.
 * @param {HTMLTableElement} t
 * @param {Object} st - État du tableau ({f, w})
 */
function capTfFilter(t,st){
  const tests=st.f.map(v=>{ const ws=capTfNorm(v).trim().split(/\s+/).filter(Boolean);
    return ws.length?ws.map(w=>w[0]==='!'&&w.length>1?{w:w.slice(1),neg:true}:{w,neg:false}):null; });
  [...t.querySelectorAll('.cap-tf-row input')].forEach((inp,i)=>inp.classList.toggle('on',!!tests[i]));
  let tot=0, vis=0, prev=true;
  [...t.rows].slice(2).forEach(r=>{
    if(r.cells.length===1&&r.cells[0].colSpan>1){ r.style.display=prev?'':'none'; return; }
    const ok=tests.every((ts,i)=>!ts||(()=>{ const txt=capTfNorm(r.cells[i]?r.cells[i].textContent:''); return ts.every(x=>txt.includes(x.w)!==x.neg); })());
    r.style.display=ok?'':'none'; prev=ok; tot++; if(ok) vis++;
  });
  let cnt=t._tfCnt;
  if(!cnt){ cnt=t._tfCnt=document.createElement('div'); cnt.className='cap-tf-cnt'; (t.parentElement.style.overflow==='auto'||t.parentElement.classList.contains('cap-tf-scroll')?t.parentElement:t).before(cnt); }
  const on=tests.some(Boolean);
  cnt.style.display=on?'':'none';
  cnt.innerHTML=on?`🔍 ${vis} / ${tot} ligne${tot>1?'s':''} <span class="cap-tf-clr" title="Effacer les filtres de ce tableau">✕ effacer</span>`:'';
  const clr=cnt.querySelector('.cap-tf-clr');
  if(clr) clr.onclick=()=>{ st.f=[]; t.querySelectorAll('.cap-tf-row input').forEach(i=>i.value=''); capTfFilter(t,st); };
}

/** Surveille la zone des sous-vues de 🔬 Analyses pour équiper les tableaux à chaque rendu.
 * @param {HTMLElement} box - Conteneur #ana-box
 */
function capTfWatch(box){
  if(box._tfObs) return;
  box._tfObs=new MutationObserver(()=>{ clearTimeout(box._tfT); box._tfT=setTimeout(()=>capTfEnhanceAll(box),20); });
  box._tfObs.observe(box,{childList:true,subtree:true});
}
