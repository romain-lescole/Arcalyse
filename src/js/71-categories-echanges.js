/* ═══════════════════════════════════════════════════════════════════════════
   🏷 Catégories d'échanges (sous-vue `cats` de 🔬 Analyses) : ExchangeCategory (Functional
   Exchanges, attribut `exchanges`), ComponentExchangeCategory (Component Exchanges, `exchanges`)
   et PhysicalLinkCategory (Physical Links, `links`). Vue par catégorie et par échange, contrôles,
   filtre « Catégorie » dans ƒ⇆, 🔀 et 🔌 (`capEcSelect` / `capEcMatch`), section du panneau de
   détail, indicateurs du tableau de bord.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Natures de catégories : type Capella → {k (clé), attribut des échanges, type d'échange, libellé}. */
const CAP_EC_KINDS={ExchangeCategory:{k:'FE', attr:'exchanges', ex:'FunctionalExchange', l:_L('Functional Exchange')},
  ComponentExchangeCategory:{k:'CE', attr:'exchanges', ex:'ComponentExchange', l:_L('Component Exchange')},
  PhysicalLinkCategory:{k:'PL', attr:'links', ex:'PhysicalLink', l:_L('Physical Link')}};
var _capEc={view:'cats', q:'', kind:'', layer:'all', cov:''};   // état de la sous-vue

/** Catégories d'échanges du modèle et index échange → catégories (en cache dans `_capAnaCache`).
 * @returns {{cats:object[], byEx:Object, exs:Object}} cats {id, name, kind, layer, ids:[échanges], broken:n} ;
 *   byEx : id d'échange → [catégories] ; exs : kind → tous les échanges de cette nature {id, name, layer}
 */
function capComputeExchangeCategories(){
  if(_capAnaCache.ec) return _capAnaCache.ec;
  const {xmap}=capAnaCtx(), cats=[], byEx={}, exs={FE:[], CE:[], PL:[]};
  const layerOf=el=>{ const l=capArchLayerOf(el); return CAP_ANA_LAYERS.includes(l)?l:'?'; };
  Object.values(xmap).forEach(el=>{
    const t=capTName(el), K=CAP_EC_KINDS[t];
    if(K){
      const refs=(el.getAttribute(K.attr)||'').trim().split(/\s+/).filter(Boolean).map(r=>r.replace(/^.*#/,''));
      const ids=refs.filter(r=>xmap[r]), c={id:capXId(el), name:capXName(el)||_L('(sans nom)'), kind:K.k, layer:layerOf(el), ids, broken:refs.length-ids.length};
      cats.push(c); ids.forEach(i=>(byEx[i]=byEx[i]||[]).push(c));
    } else { const kk=Object.values(CAP_EC_KINDS).find(x=>x.ex===t); if(kk) exs[kk.k].push({id:capXId(el), name:capXName(el)||_L('(sans nom)'), layer:layerOf(el)}); }
  });
  cats.sort((a,b)=>a.kind.localeCompare(b.kind)||CAP_ANA_LAYERS.indexOf(a.layer)-CAP_ANA_LAYERS.indexOf(b.layer)||a.name.localeCompare(b.name));
  return _capAnaCache.ec={cats, byEx, exs};
}

/** Catégories d'un échange. @param {string} id - Échange @returns {object[]} */
function capEcOf(id){ return capComputeExchangeCategories().byEx[id]||[]; }

/** Liste déroulante « Catégorie » pour une vue de flux ('' si le modèle n'a aucune catégorie de cette nature).
 * @param {string} kind - 'FE', 'CE' ou 'PL'
 * @param {string} cur - Valeur courante ('' toutes, '(none)' sans catégorie, sinon id)
 * @param {string} id - Identifiant HTML du select
 * @returns {string} HTML
 */
function capEcSelect(kind, cur, id){
  const cats=capComputeExchangeCategories().cats.filter(c=>c.kind===kind); if(!cats.length) return '';
  return `<select id="${id}" class="phl-filter-input" style="max-width:220px${cur?';border-color:var(--c-accent)':''}" title="${_L('Catégorie d\'échange (ExchangeCategory)')}"><option value="">${_L('🏷 Toutes catégories')}</option><option value="(none)"${cur==='(none)'?' selected':''}>${_L('— sans catégorie')}</option>${cats.map(c=>`<option value="${capEsc(c.id)}"${cur===c.id?' selected':''}>${capEsc(c.name)}${c.layer!=='?'?' ('+c.layer+')':''}</option>`).join('')}</select>`;
}

/** Vrai si un échange passe le filtre de catégorie. @param {string} exId - Échange @param {string} cat - Valeur du filtre @returns {boolean} */
function capEcMatch(exId, cat){ if(!cat) return true; const l=capEcOf(exId); return cat==='(none)'?!l.length:l.some(c=>c.id===cat); }

/** Pastilles des catégories d'un échange ('' si aucune). @param {string} exId @returns {string} HTML */
function capEcBadges(exId){ return capEcOf(exId).map(c=>`<span class="ec-badge" title="${_L('Catégorie')}">🏷 ${capEsc(c.name)}</span>`).join(' '); }

/** Contrôles des catégories d'échanges. @returns {object[]} Sections */
function capEcChecks(){
  const E=capComputeExchangeCategories(), esc=capEsc;
  const catRow=c=>`<tr><td>${capChainLayerBadge(c.layer)} ${capDetLink(c.id,c.name,'font-weight:600')}</td><td class="ana-dim">${esc(CAP_EC_KINDS[Object.keys(CAP_EC_KINDS).find(t=>CAP_EC_KINDS[t].k===c.kind)].l)}</td><td>${c.ids.length}</td></tr>`;
  const exRow=e=>`<tr><td>${capChainLayerBadge(e.layer)} ${capDetLink(e.id,e.name,'font-weight:600')}</td><td class="ana-dim">${esc(CAP_EC_KINDS[Object.keys(CAP_EC_KINDS).find(t=>CAP_EC_KINDS[t].k===e.kind)].l)}</td><td>${capEcBadges(e.id)}</td></tr>`;
  const colsC=[_L('Catégorie'),'Type',_L('Échanges')], colsE=[_L('Échange'),'Type',_L('Catégories')];
  // Échanges sans catégorie : seulement pour les natures et couches où des catégories sont utilisées
  const used=new Set(E.cats.filter(c=>c.ids.length).map(c=>c.kind+'|'+c.layer));
  const noCat=[]; Object.entries(E.exs).forEach(([k,l])=>l.forEach(e=>{ if(used.has(k+'|'+e.layer)&&!capEcOf(e.id).length) noCat.push({...e, kind:k}); }));
  const multi=[]; Object.entries(E.exs).forEach(([k,l])=>l.forEach(e=>{ if(capEcOf(e.id).length>1) multi.push({...e, kind:k}); }));
  const dup={}; E.cats.forEach(c=>{ const k=c.kind+'|'+c.layer+'|'+c.name.trim().toLowerCase(); (dup[k]=dup[k]||[]).push(c); });
  return [
    {icon:'🏷', sev:'info', title:_L('Échanges sans catégorie'), tip:_L('Dans les natures et couches où des catégories sont déjà utilisées'), cols:colsE, items:noCat.map(exRow)},
    {icon:'∅', title:_L('Catégories vides'), tip:_L('Catégorie sans aucun échange'), cols:colsC, items:E.cats.filter(c=>!c.ids.length&&!c.broken).map(catRow)},
    {icon:'?', sev:'err', title:_L('Catégories référençant un échange introuvable'), tip:_L('Échange supprimé ou hors du fichier chargé'), cols:colsC, items:E.cats.filter(c=>c.broken).map(c=>catRow(c).replace('</td></tr>',_L(` <span class="ana-miss">+ ${c.broken} introuvable(s)</span></td></tr>`)))},
    {icon:'≡', title:_L('Catégories en double'), tip:_L('Même nom, même nature et même couche'), cols:colsC, items:Object.values(dup).filter(a=>a.length>1).flat().map(catRow)},
    {icon:'⧉', sev:'info', title:_L('Échanges dans plusieurs catégories'), tip:_L('Autorisé par Capella, à vérifier si les catégories doivent être exclusives'), cols:colsE, items:multi.map(exRow)}];
}

/** Sous-vue 🏷 Catégories d'échanges : par catégorie, par échange, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderExchangeCategories(box){
  const st=_capEc, E=capComputeExchangeCategories(), esc=capEsc;
  if(!E.cats.length){ box.innerHTML=_L('<div class="phl-empty">Aucune catégorie d\'échange dans ce modèle (ExchangeCategory, ComponentExchangeCategory, PhysicalLinkCategory).<br>Dans Capella : paquetage de fonctions › Catégorie d\'échanges, puis affecter les échanges.</div>'); return; }
  const q=st.q.trim().toLowerCase(), kindL=k=>CAP_EC_KINDS[Object.keys(CAP_EC_KINDS).find(t=>CAP_EC_KINDS[t].k===k)].l;
  const kinds=[...new Set(E.cats.map(c=>c.kind))];
  const exAll=[]; Object.entries(E.exs).forEach(([k,l])=>l.forEach(e=>exAll.push({...e, kind:k, cats:capEcOf(e.id)})));
  const inL=o=>st.layer==='all'||o.layer===st.layer, inK=o=>!st.kind||o.kind===st.kind;
  let body='', cnt='';
  if(st.view==='cats'){
    const shown=E.cats.filter(c=>inL(c)&&inK(c)&&capXtHas(q,c.name,kindL(c.kind)));
    body=_L(`<p class="ana-help">${E.cats.length} catégorie(s) · ${Object.keys(E.byEx).length} échange(s) catégorisé(s). Cliquez un nom pour ouvrir le détail ; ▸ ouvre la vue de flux filtrée sur la catégorie.</p>`)+
      capXtTable([_L('Couche'),_L('Catégorie'),'Type',_L('Échanges'),_L('Liste')], shown.map(c=>[capChainLayerBadge(c.layer), `${capDetLink(c.id,c.name,'font-weight:600')} <button class="cap-lf-btn" style="padding:0 5px" data-ecgo="${esc(c.kind)}|${esc(c.id)}" title="${_L('Ouvrir la vue de flux filtrée sur cette catégorie')}">▸</button>`, `<span class="ana-dim">${esc(kindL(c.kind))}</span>`,
        `<b>${c.ids.length}</b>${c.broken?` <span class="ana-miss">+ ${c.broken} ${_L('introuvable(s)')}</span>`:''}`, capXtLinks(c.ids.map(i=>{ const e=exAll.find(x=>x.id===i); return {id:i, name:e?e.name:i, layer:e?e.layer:''}; }))]));
    cnt=`${shown.length} / ${E.cats.length}`;
  } else if(st.view==='ex'){
    const shown=exAll.filter(e=>inL(e)&&inK(e)&&(!st.cov||(st.cov==='yes'?e.cats.length:!e.cats.length))&&capXtHas(q,e.name,...e.cats.map(c=>c.name)));
    const L=CAP_ANA_LAYERS.filter(l=>exAll.some(e=>e.layer===l));
    body=_L(`<p class="ana-help">Taux d'échanges catégorisés par nature et par couche, puis chaque échange avec ses catégories.</p>`)+
      capXtTable(['Type',...L,'Σ'], kinds.map(k=>[esc(kindL(k)), ...L.map(l=>{ const a=exAll.filter(e=>e.kind===k&&e.layer===l), n=a.filter(e=>e.cats.length).length; return a.length?`${n} / ${a.length} <span class="ana-dim">(${Math.round(100*n/a.length)} %)</span>`:'<span class="ana-dim">—</span>'; }), (()=>{ const a=exAll.filter(e=>e.kind===k), n=a.filter(e=>e.cats.length).length; return `<b>${n} / ${a.length}</b>`; })()]))+
      capXtTable([_L('Couche'),_L('Échange'),'Type',_L('Catégories')], shown.map(e=>[capChainLayerBadge(e.layer), capDetLink(e.id,e.name,'font-weight:600'), `<span class="ana-dim">${esc(kindL(e.kind))}</span>`, e.cats.length?capEcBadges(e.id):_L('<span class="ana-miss">∅ aucune</span>')]));
    cnt=`${shown.length} / ${exAll.length}`;
  } else body=capDiagHtml(capEcChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['cats',_L('🏷 Catégories')],['ex',_L('⇆ Échanges')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`${capXtLayerBtns(st.view==='cats'?E.cats:exAll,st.layer)}<span class="tsep"></span>${capXtSearch(st.q,st.view==='cats'?_L('Catégorie…'):_L('Échange, catégorie…'))}
      ${kinds.length>1?capXtSelect('kind',[['',_L('Toutes natures')],...kinds.map(k=>[k,kindL(k)])],st.kind):''}
      ${st.view==='ex'?capXtSelect('cov',[['',_L('Catégorisés ou non')],['yes',_L('Catégorisés')],['no',_L('Sans catégorie')]],st.cov):''}`:''), cnt)+body;
  capXtBind(box, st, capRenderExchangeCategories, ()=>st.view==='ex'
    ?capCsvExport(_L('echanges-categories.csv'),[_L('Couche'),_L('Échange'),'Type',_L('Catégories')], exAll.filter(e=>inL(e)&&inK(e)).map(e=>[e.layer,capCx(e.name,e.id),kindL(e.kind),e.cats.map(c=>c.name).join(' ; ')]))
    :capCsvExport(_L('categories-echanges.csv'),[_L('Couche'),_L('Catégorie'),'Type',_L('Échanges'),_L('Liste')], E.cats.map(c=>[c.layer,capCx(c.name,c.id),kindL(c.kind),String(c.ids.length),capCxList(c.ids.map(i=>{ const e=exAll.find(x=>x.id===i); return {id:i, name:e?e.name:i}; }))])));
  box.querySelectorAll('[data-ecgo]').forEach(b=>b.onclick=()=>{ const [k,id]=b.dataset.ecgo.split('|'); capEcGo(k, id); });
}

/** Ouvre la vue de flux d'une nature d'échange, filtrée sur une catégorie.
 * @param {string} kind - 'FE', 'CE' ou 'PL'
 * @param {string} id - Catégorie
 */
function capEcGo(kind, id){
  const v={FE:'fex', CE:'compex', PL:'physlink'}[kind]; if(!v) return;
  const c=document.getElementById('cap-view-'+v); if(c){ const st=c._fex||c._cex||c._phl; if(st){ st.cat=id; st.page=0; } }
  _capEcPending={v, id}; capNavOpen(v);
}
var _capEcPending=null;   // filtre à poser quand la vue de flux se construit pour la première fois

/** Filtre de catégorie en attente pour une vue de flux (consommé à la construction de son état). @param {string} v - Vue @returns {string} id ou '' */
function capEcPending(v){ const p=_capEcPending; if(p&&p.v===v){ _capEcPending=null; return p.id; } return ''; }

/** Section « Catégories » du panneau de détail : catégories d'un échange, ou échanges d'une catégorie.
 * @param {string} id - Élément
 * @param {Function} secTitle - Titre de section
 * @returns {string} HTML
 */
function capEcDetail(id, secTitle){
  const E=capComputeExchangeCategories(), c=E.cats.find(x=>x.id===id);
  if(c){ const all=[].concat(...Object.values(E.exs)); return secTitle(_L(`Échanges de la catégorie (${c.ids.length})`),'#bc8cff')+`<div style="font-size:11.5px">${capXtLinks(c.ids.map(i=>{ const e=all.find(x=>x.id===i); return {id:i, name:e?e.name:i, layer:e?e.layer:''}; }),true)||'—'}</div>`; }
  const l=E.byEx[id]; if(!l||!l.length) return '';
  return secTitle(_L(`Catégories (${l.length})`),'#bc8cff')+`<div style="font-size:11.5px">${l.map(x=>`<div>${capDetLink(x.id,'🏷 '+x.name)} <span class="ana-dim">${x.layer!=='?'?x.layer:''}</span></div>`).join('')}</div>`;
}

/** Indicateurs du tableau de bord : catégories d'échanges.
 * @param {Function} add - Ajout d'un indicateur
 * @param {Function} LC - Couleur d'une couche
 */
function capEcDashCatalog(add, LC){
  const G=_L('Catégories d\'échanges'), E=()=>capComputeExchangeCategories();
  add(G,'ec.n',_L('Catégories d\'échanges — nombre'),'n',()=>({n:E().cats.length}));
  add(G,'ec.pct',_L('Catégories d\'échanges — taux de Functional Exchanges catégorisés'),'pct',()=>{ const l=E().exs.FE; return l.length&&E().cats.some(c=>c.kind==='FE')?capDashPct(l,e=>capEcOf(e.id).length):null; });
  add(G,'ec.layer',_L('Catégories d\'échanges — Functional Exchanges catégorisés par couche'),'series',()=>{ const l=E().exs.FE; return {cats:CAP_ANA_LAYERS.filter(k=>l.some(e=>e.layer===k)).map(k=>({l:k, v:l.filter(e=>e.layer===k&&capEcOf(e.id).length).length, c:LC(k)})), order:'natural'}; });
  add(G,'ec.top',_L('Catégories d\'échanges — échanges par catégorie'),'series',()=>({cats:E().cats.map(c=>({l:c.name+(c.layer!=='?'?' ('+c.layer+')':''), v:c.ids.length})).filter(c=>c.v)}));
  add(_L('Contrôles'),'chk.ec',_L('Contrôles des catégories d\'échanges'),'series',()=>({cats:capChkFilter(capEcChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length})).filter(x=>x.v)}));
}
