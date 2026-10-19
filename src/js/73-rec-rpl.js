/* ═══════════════════════════════════════════════════════════════════════════
   📦 REC / RPL (sous-vue `rec` de 🔬 Analyses) : éléments réutilisables de Capella.
   Catalogue `RecCatalog` → `CatalogElement` (kind REC = gabarit, RPL = réplique ; `origin` → REC,
   `suffix`, `currentCompliancy` → CompliancyDefinition BLACK_BOX / CONSTRAINT_REUSE / INHERITANCY_REUSE)
   → `CatalogElementLink` (`target` = élément du modèle ; dans une RPL, `origin` = lien du REC répliqué,
   `suffixed`). Comparaison REC ↔ RPL : éléments manquants, ajoutés, de type différent, renommés hors
   suffixe ; contrôles ; section du panneau de détail ; indicateurs.
   ═══════════════════════════════════════════════════════════════════════════ */

var _capRec={view:'rpl', q:'', rpl:'', rec:''};   // état de la sous-vue

/** Catalogue REC / RPL du modèle (en cache dans `_capAnaCache`).
 * @returns {{recs:object[], rpls:object[], byEl:Object, comp:Object}} recs {id, name, links, rpls:[rpl], comp} ; rpls {id, name, origin, rec, suffix,
 *   comp, links, diff:{missing, added, typed, renamed, broken}} ; byEl : id d'élément → [{ce, link}] ; comp : id → nom de CompliancyDefinition
 */
function capComputeRec(){
  if(_capAnaCache.rec) return _capAnaCache.rec;
  const {xmap, res}=capAnaCtx(), rid=r=>(r||'').trim().replace(/^.*#/,'');
  const comp={}; Object.values(xmap).forEach(el=>{ if(capTName(el)==='CompliancyDefinition') comp[capXId(el)]=capXName(el); });
  const ces={}, byEl={};
  Object.values(xmap).forEach(el=>{
    if(capTName(el)!=='CatalogElement') return;
    const id=capXId(el), kind=(el.getAttribute('kind')||'REC').toUpperCase();
    const links=[...el.children].filter(c=>capTName(c)==='CatalogElementLink').map(c=>{ const t=rid(c.getAttribute('target')), tel=xmap[t];
      return {id:capXId(c), target:t, el:tel||null, type:tel?capTName(tel):'', name:tel?(capXName(tel)||''):'', origin:rid(c.getAttribute('origin')), suffixed:c.getAttribute('suffixed')==='true'}; });
    ces[id]={id, name:capXName(el)||_L('(sans nom)'), kind, origin:rid(el.getAttribute('origin')), suffix:el.getAttribute('suffix')||'', comp:comp[rid(el.getAttribute('currentCompliancy'))]||comp[rid(el.getAttribute('defaultReplicaCompliancy'))]||'', links, rpls:[]};
  });
  const recs=[], rpls=[];
  Object.values(ces).forEach(ce=>{
    ce.links.forEach(l=>{ if(l.target) (byEl[l.target]=byEl[l.target]||[]).push({ce, link:l}); });
    if(ce.kind==='RPL'){ ce.rec=ces[ce.origin]||null; if(ce.rec) ce.rec.rpls.push(ce); rpls.push(ce); } else recs.push(ce);
  });
  // Écarts de chaque réplique par rapport à son REC
  rpls.forEach(r=>{
    const d=r.diff={missing:[], added:[], typed:[], renamed:[], broken:r.links.filter(l=>!l.el)};
    if(!r.rec) return;
    const byOrigin={}; r.links.forEach(l=>{ if(l.origin) byOrigin[l.origin]=l; });
    r.rec.links.forEach(rl=>{ const l=byOrigin[rl.id]; if(!l){ d.missing.push(rl); return; }
      if(l.el&&rl.el&&l.type!==rl.type) d.typed.push({rec:rl, rpl:l});
      if(l.el&&rl.el&&l.suffixed&&rl.name&&l.name!==rl.name+r.suffix&&l.name!==rl.name) d.renamed.push({rec:rl, rpl:l}); });
    const recIds=new Set(r.rec.links.map(l=>l.id)); r.links.forEach(l=>{ if(!l.origin||!recIds.has(l.origin)) d.added.push(l); });
  });
  const nom=x=>x.name.toLowerCase(); recs.sort((a,b)=>nom(a)<nom(b)?-1:1); rpls.sort((a,b)=>nom(a)<nom(b)?-1:1);
  return _capAnaCache.rec={recs, rpls, byEl, comp};
}

/** Nombre d'écarts d'une réplique. @param {object} r - RPL @returns {number} */
function capRecEcarts(r){ const d=r.diff||{}; return (d.missing||[]).length+(d.added||[]).length+(d.typed||[]).length+(d.renamed||[]).length+(d.broken||[]).length; }

/** Lien vers un élément du modèle visé par un lien de catalogue ('introuvable' sinon). @param {object} l - Lien @returns {string} HTML */
function capRecLink(l){ return l.el?`${capIcoType(l.type,12)}${capDetLink(l.target,l.name||l.type)} <span class="ana-dim">${capEsc(capAnaHuman(l.type))}</span>`:`<span class="ana-miss">${_L('introuvable')} ${capEsc(l.target.slice(0,8))}…</span>`; }

/** Contrôles REC / RPL. @returns {object[]} Sections */
function capRecChecks(){
  const R=capComputeRec(), esc=capEsc;
  const rplRow=(r,extra)=>`<tr><td>${capDetLink(r.id,r.name,'font-weight:600')} <button class="cap-lf-btn" style="padding:0 5px" onclick="capRecOpen('${esc(r.id)}')" title="${_L('Comparer à son REC')}">⇄</button></td><td class="ana-dim">${r.rec?esc(r.rec.name):_L('<span class="ana-miss">REC introuvable</span>')}</td><td>${extra||''}</td></tr>`;
  const recRow=(r,extra)=>`<tr><td>${capDetLink(r.id,r.name,'font-weight:600')}</td><td class="ana-dim">${_L('REC')}</td><td>${extra||''}</td></tr>`;
  const cols=[_L('Réplique'),_L('REC'),_L('Détail')], colsR=[_L('Élément de catalogue'),'Type',_L('Détail')];
  const dup={}; R.recs.forEach(r=>{ const k=r.name.trim().toLowerCase(); (dup[k]=dup[k]||[]).push(r); });
  const multi=Object.entries(R.byEl).filter(([,l])=>l.filter(x=>x.ce.kind==='RPL').length>1);
  return [
    {icon:'∅', title:_L('Répliques incomplètes'), tip:_L('Éléments du REC sans équivalent dans la réplique (supprimés après instanciation, ou REC enrichi depuis)'), cols, items:R.rpls.filter(r=>r.diff.missing.length).map(r=>rplRow(r,_L(`${r.diff.missing.length} manquant(s)`)+' : '+r.diff.missing.slice(0,5).map(l=>esc(l.name||l.type)).join(', ')+(r.diff.missing.length>5?'…':'')))},
    {icon:'＋', title:_L('Répliques enrichies'), tip:_L('Éléments de la réplique sans origine dans le REC (ajoutés localement)'), cols, items:R.rpls.filter(r=>r.diff.added.length).map(r=>rplRow(r,_L(`${r.diff.added.length} ajouté(s)`)+' : '+r.diff.added.slice(0,5).map(l=>esc(l.name||l.type)).join(', ')+(r.diff.added.length>5?'…':'')))},
    {icon:'≠', title:_L('Types différents entre REC et réplique'), tip:_L('Un élément répliqué n\'a plus le type de son origine'), cols, items:R.rpls.filter(r=>r.diff.typed.length).map(r=>rplRow(r,r.diff.typed.map(x=>`${esc(x.rec.name)} : ${esc(x.rec.type)} → ${esc(x.rpl.type)}`).join(', ')))},
    {icon:'✎', title:_L('Noms de réplique hors règle REC + suffixe'), tip:_L('Élément suffixé dont le nom n\'est ni « nom du REC + suffixe » ni le nom du REC'), cols, items:R.rpls.filter(r=>r.diff.renamed.length).map(r=>rplRow(r,r.diff.renamed.map(x=>`${esc(x.rec.name)} → ${esc(x.rpl.name)}`).join(', ')))},
    {icon:'?', title:_L('Liens de catalogue vers un élément introuvable'), tip:_L('Élément du modèle supprimé sans mise à jour du catalogue'), cols:colsR, items:[...R.recs,...R.rpls].filter(r=>r.links.some(l=>!l.el)).map(r=>recRow(Object.assign({},r,{name:r.name}),_L(`${r.links.filter(l=>!l.el).length} lien(s)`)).replace(_L('<td class="ana-dim">REC</td>'),`<td class="ana-dim">${r.kind}</td>`))},
    {icon:'↗', title:_L('Répliques dont le REC est introuvable'), tip:_L('L\'origine de la réplique n\'existe plus dans le catalogue'), cols, items:R.rpls.filter(r=>!r.rec).map(r=>rplRow(r))},
    {icon:'📦', title:_L('REC sans réplique'), tip:_L('Gabarit jamais instancié (ou instancié dans un autre projet)'), cols:colsR, items:R.recs.filter(r=>!r.rpls.length).map(r=>recRow(r,_L(`${r.links.length} élément(s)`)))},
    {icon:'≡', title:_L('REC en double'), tip:_L('Plusieurs REC du même nom'), cols:colsR, items:Object.values(dup).filter(a=>a.length>1).flat().map(r=>recRow(r))},
    {icon:'⧉', title:_L('Éléments appartenant à plusieurs répliques'), tip:_L('Un même élément du modèle lié par plusieurs RPL'), cols:[_L('Élément'),_L('Répliques'),''], items:multi.map(([id,l])=>`<tr><td>${capDetLink(id,(l[0].link.name||l[0].link.type))}</td><td>${l.filter(x=>x.ce.kind==='RPL').map(x=>esc(x.ce.name)).join(', ')}</td><td></td></tr>`)}];
}

/** Ouvre la comparaison d'une réplique avec son REC. @param {string} id - RPL */
function capRecOpen(id){ Object.assign(_capRec,{view:'cmp', rpl:id}); capAnaSub='rec'; if(capCurrentView==='analyses') capRenderAnalyses(); else capShowView('analyses'); }

/** Sous-vue 📦 REC / RPL : REC, répliques, comparaison, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderRec(box){
  const st=_capRec, R=capComputeRec(), esc=capEsc, q=st.q.trim().toLowerCase();
  if(!R.recs.length&&!R.rpls.length){ box.innerHTML=_L('<div class="phl-empty">Aucun REC ni RPL dans ce modèle (catalogue d\'éléments réutilisables vide).<br>Dans Capella : clic droit sur des éléments › REC / RPL › Create REC, puis Instantiate RPL from REC.</div>'); return; }
  let body='', cnt='';
  if(st.view==='rec'){
    const shown=R.recs.filter(r=>capXtHas(q,r.name,...r.links.map(l=>l.name)));
    body=_L(`<p class="ana-help">${R.recs.length} REC (gabarits) · ${R.rpls.length} RPL (répliques) · ${Object.keys(R.byEl).length} élément(s) du modèle sous catalogue.</p>`)+
      capXtTable([_L('REC'),_L('Conformité par défaut'),_L('Éléments'),_L('Répliques'),_L('Contenu')], shown.map(r=>[capDetLink(r.id,r.name,'font-weight:600'), `<span class="ana-dim">${esc(r.comp||'—')}</span>`, String(r.links.length),
        r.rpls.length?r.rpls.map(x=>`<div>${capDetLink(x.id,x.name)} <button class="cap-lf-btn" style="padding:0 5px" onclick="capRecOpen('${esc(x.id)}')" title="${_L('Comparer à son REC')}">⇄</button>${capRecEcarts(x)?` <span class="ana-miss">${_L(`${capRecEcarts(x)} écart(s)`)}</span>`:' ✔'}</div>`).join(''):'<span class="ana-dim">—</span>',
        capXtLinks(r.links.filter(l=>l.el).map(l=>({id:l.target, name:l.name||l.type, layer:''})))]));
    cnt=`${shown.length} / ${R.recs.length}`;
  } else if(st.view==='rpl'){
    const shown=R.rpls.filter(r=>(!st.rec||r.origin===st.rec)&&capXtHas(q,r.name,r.rec&&r.rec.name,...r.links.map(l=>l.name)));
    const ok=R.rpls.filter(r=>r.rec&&!capRecEcarts(r)).length;
    body=_L(`<p class="ana-help">${R.rpls.length} réplique(s), <b>${ok}</b> conforme(s) à leur REC (${R.rpls.length?Math.round(100*ok/R.rpls.length):0} %). ⇄ compare une réplique à son REC élément par élément.</p>`)+
      capXtTable([_L('Réplique'),_L('REC'),_L('Suffixe'),_L('Conformité'),_L('Éléments'),_L('Manquants'),_L('Ajoutés'),_L('Types ≠'),_L('Renommés'),_L('Introuvables')], shown.map(r=>{ const d=r.diff, c=n=>n?`<b class="ana-miss">${n}</b>`:'<span class="ana-dim">0</span>';
        return [`${capDetLink(r.id,r.name,'font-weight:600')} <button class="cap-lf-btn" style="padding:0 5px" onclick="capRecOpen('${esc(r.id)}')" title="${_L('Comparer à son REC')}">⇄</button>`, r.rec?capDetLink(r.rec.id,r.rec.name):_L('<span class="ana-miss">introuvable</span>'), `<span class="ana-dim">${esc(r.suffix)||'—'}</span>`, `<span class="ana-dim">${esc(r.comp||'—')}</span>`, String(r.links.length), c(d.missing.length), c(d.added.length), c(d.typed.length), c(d.renamed.length), c(d.broken.length)]; }));
    cnt=`${shown.length} / ${R.rpls.length}`;
  } else if(st.view==='cmp'){
    const r=R.rpls.find(x=>x.id===st.rpl)||R.rpls[0];
    if(!r) body=_L('<div class="phl-empty">Aucune réplique.</div>');
    else {
      const byOrigin={}; r.links.forEach(l=>{ if(l.origin) byOrigin[l.origin]=l; });
      const rows=[];
      if(r.rec) r.rec.links.forEach(rl=>{ const l=byOrigin[rl.id]; let s='✔', cls='ok';
        if(!l){ s=_L('manquant'); cls='miss'; } else if(l.el&&rl.el&&l.type!==rl.type){ s=_L('type différent'); cls='miss'; } else if(l.el&&rl.el&&l.suffixed&&l.name!==rl.name+r.suffix&&l.name!==rl.name){ s=_L('renommé'); cls='warn'; } else if(!l.el){ s=_L('introuvable'); cls='miss'; }
        rows.push([capRecLink(rl), l?capRecLink(l):'<span class="ana-dim">—</span>', `<span class="rec-st rec-${cls}">${s}</span>`]); });
      r.diff.added.forEach(l=>rows.push(['<span class="ana-dim">—</span>', capRecLink(l), `<span class="rec-st rec-warn">${_L('ajouté dans la réplique')}</span>`]));
      body=_L(`<p class="ana-help"><b>${esc(r.name)}</b> (réplique${r.suffix?`, suffixe « ${esc(r.suffix)} »`:''}${r.comp?`, ${esc(r.comp)}`:''}) comparée à son REC <b>${r.rec?esc(r.rec.name):_L('introuvable')}</b> : ${capRecEcarts(r)?_L(`${capRecEcarts(r)} écart(s)`):_L('aucun écart')}.</p>`)+
        capXtTable([_L('Élément du REC'),_L('Élément de la réplique'),_L('État')], rows);
    }
  } else body=capDiagHtml(capRecChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['rpl',_L('🧬 Répliques')],['rec',_L('📦 REC')],['cmp',_L('⇄ Comparaison')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='cmp'?`<span class="tsep"></span>${capXtSelect('rpl',R.rpls.map(r=>[r.id,r.name+(r.rec?' ⇄ '+r.rec.name:'')]),st.rpl||(R.rpls[0]||{}).id)}`:
     st.view==='diag'?'':`<span class="tsep"></span>${capXtSearch(st.q,_L('REC, réplique, élément…'))}${st.view==='rpl'&&R.recs.length>1?capXtSelect('rec',[['',_L('Tous les REC')],...R.recs.map(r=>[r.id,r.name])],st.rec):''}`), cnt)+body;
  capXtBind(box, st, capRenderRec, ()=>capCsvExport(_L('rec-rpl.csv'),[_L('Réplique'),_L('REC'),_L('Suffixe'),_L('Conformité'),_L('Éléments'),_L('Manquants'),_L('Ajoutés'),_L('Types différents'),_L('Renommés'),_L('Introuvables')],
    R.rpls.map(r=>[capCx(r.name,r.id), r.rec?capCx(r.rec.name,r.rec.id):'', r.suffix, r.comp, String(r.links.length), String(r.diff.missing.length), String(r.diff.added.length), String(r.diff.typed.length), String(r.diff.renamed.length), String(r.diff.broken.length)])));
}

/** Section « REC / RPL » du panneau de détail : catalogue d'un élément, ou contenu d'un élément de catalogue.
 * @param {string} id - Élément
 * @param {Function} secTitle - Titre de section
 * @returns {string} HTML
 */
function capRecDetail(id, secTitle){
  const R=capComputeRec(), esc=capEsc, ce=[...R.recs,...R.rpls].find(x=>x.id===id);
  if(ce){ const d=ce.diff; return secTitle(ce.kind==='RPL'?_L('Réplique (RPL)'):_L('Élément réutilisable (REC)'),'#f0883e')+`<div style="font-size:11.5px">${ce.kind==='RPL'?`${_L('REC')} : ${ce.rec?capDetLink(ce.rec.id,ce.rec.name):_L('<span class="ana-miss">introuvable</span>')}${ce.suffix?` · ${_L('suffixe')} « ${esc(ce.suffix)} »`:''}${ce.comp?` · ${esc(ce.comp)}`:''} · <a href="#" class="cap-det-link" onclick="capRecOpen('${esc(ce.id)}');return false">⇄ ${_L('comparer')}</a>${d&&capRecEcarts(ce)?` · <span class="ana-miss">${_L(`${capRecEcarts(ce)} écart(s)`)}</span>`:''}`:`${_L(`${ce.rpls.length} réplique(s)`)}${ce.rpls.length?' : '+ce.rpls.map(x=>capDetLink(x.id,x.name)).join(', '):''}`}
    <div style="margin-top:3px">${capXtLinks(ce.links.filter(l=>l.el).map(l=>({id:l.target, name:l.name||l.type, layer:''})))}</div></div>`; }
  const l=R.byEl[id]; if(!l||!l.length) return '';
  return secTitle(_L('REC / RPL'),'#f0883e')+`<div style="font-size:11.5px">${l.map(x=>`<div>${x.ce.kind==='RPL'?'🧬':'📦'} ${esc(x.ce.kind)} ${capDetLink(x.ce.id,x.ce.name)}${x.ce.kind==='RPL'&&x.ce.rec?` <span class="ana-dim">(${_L('REC')} ${esc(x.ce.rec.name)})</span>`:''}</div>`).join('')}</div>`;
}

/** Indicateurs du tableau de bord : REC / RPL.
 * @param {Function} add - Ajout d'un indicateur
 */
function capRecDashCatalog(add){
  const G=_L('REC / RPL'), R=()=>capComputeRec();
  add(G,'rec.n',_L('REC / RPL — REC (gabarits)'),'n',()=>({n:R().recs.length}));
  add(G,'rec.rpl',_L('REC / RPL — répliques'),'n',()=>({n:R().rpls.length}));
  add(G,'rec.ok',_L('REC / RPL — taux de répliques conformes à leur REC'),'pct',()=>R().rpls.length?capDashPct(R().rpls,r=>r.rec&&!capRecEcarts(r)):null);
  add(G,'rec.els',_L('REC / RPL — éléments du modèle sous catalogue'),'n',()=>({n:Object.keys(R().byEl).length}));
  add(G,'rec.by',_L('REC / RPL — répliques par REC'),'series',()=>({cats:R().recs.map(r=>({l:r.name, v:r.rpls.length})).filter(c=>c.v)}));
  add(_L('Contrôles'),'chk.rec',_L('Contrôles REC / RPL'),'series',()=>({cats:capChkFilter(capRecChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length})).filter(x=>x.v)}));
}
