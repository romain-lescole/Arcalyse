// ── 🗂 Panneau de détail à onglets ─────────────────────────────────────────
// Les sections du panneau de détail (capOpenDetail, 25) portent un onglet (`data-tab` posé par secTitle) :
// 📋 Fiche (description, attributs), 🔗 Liens (références, owner, owned), 🔲 Diagrammes, 🔬 Analyses (exigences,
// propriétés, contraintes, scénarios, statut, catégories, bibliothèques, REC / RPL, déploiement), 💬 Revue, ≡ Tout.
// capDetTabs regroupe les sections par onglet après le rendu ; ≡ Tout par défaut, l'onglet choisi est gardé d'un élément à l'autre
// (`_capNav.det`, enregistré avec la barre) ; un onglet sans section pour l'élément n'est pas proposé.

/** Onglets du panneau de détail, dans l'ordre d'affichage. */
var CAP_DET_TABS=[
  {k:'fiche', l:_L('📋 Fiche'),      t:_L('Description et attributs de l\'élément')},
  {k:'liens', l:_L('🔗 Liens'),      t:_L('Références sortantes et entrantes, owner, éléments contenus')},
  {k:'diag',  l:_L('🔲 Diagrammes'), t:_L('Diagrammes du projet où l\'élément est représenté')},
  {k:'ana',   l:_L('🔬 Analyses'),   t:_L('Exigences, propriétés, contraintes, scénarios, statut de revue, catégories, bibliothèques, REC / RPL, déploiement')},
  {k:'revue', l:_L('💬 Revue'),      t:_L('Commentaires de revue portant sur l\'élément')},
  {k:'all',   l:_L('≡ Tout'),        t:_L('Toutes les sections à la suite')}
];

/** Onglet choisi (≡ Tout par défaut ; gardé d'un élément à l'autre, enregistré avec la barre).
 * @returns {string} Clé d'onglet
 */
function capDetTab(){ return typeof _capNav!=='undefined'&&_capNav&&_capNav.det||'all'; }

/** Regroupe les sections du panneau en onglets : l'en-tête (badge, nom, boutons 💬) reste en tête, puis la barre
 * d'onglets, puis un volet par onglet. Sans section marquée (ℹ d'un diagramme, d'une chaîne), rien n'est changé.
 * @param {HTMLElement} box - Conteneur du contenu (`#cap-detail-content` ou `#rm-detail-content`)
 */
function capDetTabs(box){
  if(!box||box.querySelector('.cap-det-tabs')) return;
  const tabOf=n=>n.nodeType===1&&(n.dataset.tab||(n.firstElementChild&&n.firstElementChild.dataset&&n.firstElementChild.dataset.tab))||'';
  const nodes=[...box.childNodes]; if(!nodes.some(tabOf)) return;
  const groups={}; let cur=null;
  nodes.forEach(n=>{ const t=tabOf(n); if(t){ cur=t; (groups[t]=groups[t]||[]).push([]); groups[t][groups[t].length-1].push(n); } else if(cur&&(n.nodeType===1||String(n.textContent).trim())){ const g=groups[cur]; g[g.length-1].push(n); } });
  const avail=CAP_DET_TABS.filter(t=>t.k==='all'||groups[t.k]);
  const bar=document.createElement('div'); bar.className='cap-det-tabs'; bar.setAttribute('role','tablist');
  bar.innerHTML=avail.map(t=>`<button type="button" class="cap-det-tab" role="tab" data-dtab="${t.k}" title="${capEsc(t.t)}">${t.l}${t.k==='all'?'':'<span class="cap-det-n"></span>'}</button>`).join('');
  const first=nodes.find(tabOf); box.insertBefore(bar, first);
  CAP_DET_TABS.forEach(t=>{ if(!groups[t.k]) return; const pane=document.createElement('div'); pane.className='cap-det-pane'; pane.dataset.pane=t.k;
    groups[t.k].forEach(g=>g.forEach(n=>pane.appendChild(n))); box.appendChild(pane); });
  bar.addEventListener('click',e=>{ const b=e.target.closest('[data-dtab]'); if(!b) return; capDetTabShow(box, b.dataset.dtab); _capNav.det=b.dataset.dtab; capNavSave(); });
  capDetTabsRefresh(box);
  const want=capDetTab(), pane=box.querySelector(`.cap-det-pane[data-pane="${want}"]`);
  capDetTabShow(box, want==='all'||(pane&&pane.querySelector('.cap-det-sec'))?want:'fiche');
}

/** Met à jour la barre d'onglets : nombre de sections de chaque volet, onglet masqué quand son volet est vide
 * (💬 Revue avant le premier commentaire), repli sur 📋 Fiche si l'onglet affiché se vide.
 * @param {HTMLElement} box - Conteneur du contenu
 */
function capDetTabsRefresh(box){
  const bar=box&&box.querySelector('.cap-det-tabs'); if(!bar) return;
  let hide=false;
  bar.querySelectorAll('.cap-det-tab').forEach(b=>{ const k=b.dataset.dtab; if(k==='all') return;
    const pane=box.querySelector(`.cap-det-pane[data-pane="${k}"]`), n=pane?pane.querySelectorAll('.cap-det-sec').length:0;
    b.style.display=n?'':'none'; const c=b.querySelector('.cap-det-n'); if(c) c.textContent=n;
    if(!n&&b.classList.contains('active')) hide=true; });
  if(hide) capDetTabShow(box,'fiche');
}

/** Affiche un onglet du panneau (≡ Tout : tous les volets à la suite).
 * @param {HTMLElement} box - Conteneur du contenu
 * @param {string} k - Clé d'onglet
 */
function capDetTabShow(box, k){
  box.querySelectorAll('.cap-det-tab').forEach(b=>{ const on=b.dataset.dtab===k; b.classList.toggle('active',on); b.setAttribute('aria-selected',on); });
  box.querySelectorAll('.cap-det-pane').forEach(p=>p.classList.toggle('on', k==='all'||p.dataset.pane===k));
}
