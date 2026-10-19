/* ═══════════════════════════════════════════════════════════════════════════
   🔖 Statut de revue Capella (sous-vue `status` de 🔬 Analyses)
   Tout élément Capella porte deux champs natifs de revue : `status` (référence à un littéral de
   l'énumération « ProgressStatus » du projet : DRAFT, TO BE REVIEWED, REVIEWED, REWORK NECESSARY…)
   et `review` (texte libre). Ce module les relève, les classe (brouillon, en attente, validé,
   à retravailler), les filtre, les contrôle, les met au tableau de bord et dans le panneau de
   détail, et fait le pont avec 💬 Revue.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Classes de statut et leur présentation (ordre d'affichage). */
const CAP_ST_CLS={draft:{l:_L('Brouillon'), c:'var(--c-dim)', h:'#8b949e'}, wait:{l:_L('En attente'), c:'var(--c-warn,#e3b341)', h:'#e3b341'}, ok:{l:_L('Validé'), c:'var(--c-ok,#3fb950)', h:'#3fb950'},
  ko:{l:_L('À retravailler'), c:'var(--c-err,#f85149)', h:'#f85149'}, other:{l:_L('Autre'), c:'var(--c-accent,#58a6ff)', h:'#58a6ff'}};   // c : CSS (vues), h : couleur fixe (tableau de bord, SVG)
/** Types qui ne sont ni des éléments de modèle revus ni cherchés : valeurs, liens de traçabilité et d'allocation, paquetages, fragments d'interaction. */
const CAP_ST_EXCL=/^(Literal|Opaque|KeyValue$|ModelInformation$|TransfoLink$|GenericTrace$|CatalogElementLink$|PartDeploymentLink$|Generalization$|CapabilityExploitation$|FunctionalChainReference$|EnumerationProperty|SystemEngineering$|ExecutionEnd$|ExecutionEvent$|Execution$|MessageEnd$|FragmentEnd$|InteractionOperand$|InteractionState$|StateFragment$|CombinedFragment$|InteractionUse$)|(PropertyValue|PropertyValueGroup|PropertyValuePkg|Realization|Involvement|Allocation|Include|Extend|Pkg|PseudoState|Pseudostate)$/;

/** Vrai si un élément est un élément de modèle nommé, revu et cherché (hors valeurs, liens techniques, paquetages, fragments).
 * @param {Object} e - Élément de capAllElements
 * @returns {boolean}
 */
function capStEligible(e){ return !!(e&&e.attrs&&e.attrs.name&&!CAP_ST_EXCL.test(e.typeName)); }
var _capSt={view:'list', q:'', layer:'all', status:'', type:'', rev:''};   // état de la vue

/** Classe d'un littéral de statut d'après son nom (anglais ou français).
 * @param {string} name - Nom du littéral (ex. « TO BE REVIEWED »)
 * @returns {'draft'|'wait'|'ok'|'ko'|'other'} Classe
 */
function capStClassOf(name){
  const n=String(name||'').toUpperCase();
  if(/REWORK|\bKO\b|REJECT|NOT OK|REFUS|RETRAVAIL/.test(n)) return 'ko';
  if(/TO BE|UNDER|PENDING|DISCUSS|IN REVIEW|A REVOIR|À REVOIR|EN COURS|ATTENTE/.test(n)) return 'wait';
  if(/DRAFT|TODO|BROUILLON|A FAIRE|À FAIRE/.test(n)) return 'draft';
  if(/REVIEWED|\bOK\b|VALID|APPROV|DONE|ACCEPT|TERMIN/.test(n)) return 'ok';
  return 'other';
}

/** Relève les statuts et commentaires de revue Capella de tous les éléments (en cache dans `_capAnaCache`).
 * @returns {{lits:object[], byLit:object, list:object[], byEl:object, nAll:number}} littéraux {id, name, cls}, éléments
 *   {id, name, typeName, type, layer, status, cls, review, litId}, index par id, nombre d'éléments nommés (hors types techniques)
 */
function capComputeStatus(){
  if(_capAnaCache.status) return _capAnaCache.status;
  const lits=[], byLit={};
  if(cap_xmlDoc) [...cap_xmlDoc.getElementsByTagName('ownedEnumerationPropertyTypes')].filter(t=>capXName(t)==='ProgressStatus')
    .forEach(t=>[...t.children].forEach(l=>{ if(capTName(l)!=='EnumerationPropertyLiteral') return; const o={id:capXId(l), name:capXName(l), cls:capStClassOf(capXName(l))}; lits.push(o); byLit[o.id]=o; }));
  const list=[], byEl={}, {xmap}=capAnaCtx(); let nAll=0;
  const layerOf=e=>{ if(CAP_ANA_LAYERS.includes(e.layer)) return e.layer; const x=xmap[e.id], l=x?capArchLayerOf(x):'?'; return l==='?'?(e.layer||''):l; };   // « Shared » (échanges, chaînes…) → couche réelle
  capAllElements.forEach(e=>{
    if(!capStEligible(e)) return;
    nAll++;
    const ref=(e.attrs.status||'').trim(), rv=(e.attrs.review||'').replace(/\r\n?/g,'\n').trim();
    if(!ref&&!rv) return;
    const litId=ref.replace(/^.*#/,''), lit=byLit[litId];
    if(ref&&!lit){ const o={id:litId, name:_L('(statut introuvable)'), cls:'other', missing:true}; byLit[litId]=o; }
    const L=byLit[litId]||null;
    const o={id:e.id, name:e.attrs.name, typeName:e.typeName, type:capAnaHuman(e.typeName), layer:layerOf(e), status:L?L.name:'', cls:L?L.cls:'', review:rv, litId:ref?litId:''};
    list.push(o); byEl[e.id]=o;
  });
  return _capAnaCache.status={lits, byLit, list, byEl, nAll};
}

/** Nom lisible d'une valeur brute de l'attribut `status` (« #id » → nom du littéral).
 * @param {string} ref - Valeur de l'attribut
 * @returns {string} Nom du littéral, ou la valeur telle quelle
 */
function capStName(ref){ const l=capComputeStatus().byLit[String(ref||'').trim().replace(/^.*#/,'')]; return l?l.name:(ref||''); }

/** Pastille d'un statut.
 * @param {string} status - Nom du littéral ('' = aucun)
 * @param {string} cls - Classe (draft, wait, ok, ko, other)
 * @returns {string} HTML
 */
function capStBadge(status, cls){
  if(!status) return _L('<span class="ana-dim">— sans statut</span>');
  const c=(CAP_ST_CLS[cls]||CAP_ST_CLS.other).c;
  return `<span class="st-badge" style="color:${c};border-color:${c}" title="${capEsc((CAP_ST_CLS[cls]||CAP_ST_CLS.other).l)}">${capEsc(status)}</span>`;
}

/** Commentaires 💬 Revue (Arcalyse) qui visent un élément. @param {string} id - Élément @returns {object[]} */
function capStRevComments(id){ return typeof _capRev!=='undefined'&&_capRev&&_capRev.comments?_capRev.comments.filter(c=>(c.targets||[]).some(t=>t.id===id)):[]; }

/** Contrôles du statut de revue.
 * @returns {object[]} Sections {icon, title, tip, cols, items}
 */
function capStChecks(){
  const S=capComputeStatus(), cols=[_L('Élément'),'Type',_L('Statut'),_L('Commentaire Capella')];
  const row=e=>`<tr><td>${capChainLayerBadge(e.layer)} ${capDetLink(e.id,e.name,'font-weight:600')}</td><td class="ana-dim">${capEsc(e.type)}</td><td>${capStBadge(e.status,e.cls)}</td><td>${capXtShort(e.review,120)}</td></tr>`;
  const okLayers=new Set(CAP_ANA_LAYERS.filter(k=>{ const l=S.list.filter(e=>e.layer===k&&e.status); return l.length>=capChkParam('st.minStatuts')&&l.filter(e=>e.cls==='ok').length>l.length/2; }));   // seuil du 🩺 profil (14)
  return [
    {icon:'⚠', title:_L('Éléments à retravailler'), tip:_L('Statut de rework ou de refus (REWORK NECESSARY, UNDER REWORK, REVIEWED KO…)'), cols, items:S.list.filter(e=>e.cls==='ko').map(row)},
    {icon:'⏳', title:_L('Éléments en attente de revue'), tip:_L('TO BE REVIEWED, TO BE DISCUSSED, UNDER REVIEW…'), cols, items:S.list.filter(e=>e.cls==='wait').map(row)},
    {icon:'✎', title:_L('Brouillons dans une couche majoritairement validée'), tip:_L(`DRAFT / TODO dans une couche où plus de la moitié des statuts sont validés (au moins ${capChkParam('st.minStatuts')} statuts)`), cols, items:S.list.filter(e=>e.cls==='draft'&&okLayers.has(e.layer)).map(row)},
    {icon:'💬', title:_L('Commentaire de revue Capella sans statut'), tip:_L('Le champ « review » est rempli mais aucun statut n\'est posé'), cols, items:S.list.filter(e=>e.review&&!e.status).map(row)},
    {icon:'🔗', title:_L('À retravailler sans commentaire dans 💬 Revue'), tip:_L('Élément à retravailler qu\'aucun commentaire de revue Arcalyse ne vise : le reprendre dans la revue (bouton 💬 de la liste)'), cols, items:S.list.filter(e=>e.cls==='ko'&&!capStRevComments(e.id).length).map(row)},
    {icon:'?', title:_L('Statut référencé introuvable'), tip:_L('Le littéral visé n\'existe pas dans l\'énumération ProgressStatus du projet'), cols, items:S.list.filter(e=>e.litId&&S.byLit[e.litId]&&S.byLit[e.litId].missing).map(row)}];
}

/** Rend la sous-vue 🔖 Statut de revue : liste filtrable, répartition statut × couche, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderStatus(box){
  const st=_capSt, S=capComputeStatus();
  if(!S.list.length){ box.innerHTML=_L('<div class="phl-empty">Aucun statut ni commentaire de revue Capella dans ce modèle.<br>Dans Capella : onglet Propriétés d\'un élément › Capella › <i>Status</i> (DRAFT, TO BE REVIEWED, REVIEWED…) et <i>Review</i>.</div>'); return; }
  const q=st.q.trim().toLowerCase();
  const types=[...new Set(S.list.map(e=>e.type))].sort();
  const statuses=S.lits.map(l=>l.name).concat(S.list.some(e=>!e.status)?['(none)']:[]);
  const shown=S.list.filter(e=>(st.layer==='all'||(st.layer==='?'?!CAP_ANA_LAYERS.includes(e.layer):e.layer===st.layer))&&(!st.status||(st.status==='(none)'?!e.status:st.status.startsWith('cls:')?e.cls===st.status.slice(4):e.status===st.status))
    &&(!st.type||e.type===st.type)&&(!st.rev||(st.rev==='yes'?!!e.review:!e.review))&&capXtHas(q,e.name,e.type,e.status,e.review));
  const withSt=S.list.filter(e=>e.status).length, pct=S.nAll?Math.round(100*withSt/S.nAll):0;
  let body='', cnt=`${shown.length} / ${S.list.length}`;
  if(st.view==='list'){
    body=_L(`<p class="ana-help"><b>${withSt}</b> élément(s) avec un statut sur ${S.nAll} nommés (${pct} %) · <b>${S.list.filter(e=>e.review).length}</b> avec un commentaire de revue Capella. Cliquez un nom pour ouvrir le détail ; 💬 crée un commentaire de revue Arcalyse sur l'élément.</p>`)+
      capXtTable([_L('Couche'),_L('Élément'),'Type',_L('Statut'),_L('Commentaire Capella'),'💬'], shown.map(e=>{ const n=capStRevComments(e.id).length; return [
        capChainLayerBadge(e.layer), capDetLink(e.id,e.name,'font-weight:600'), `<span class="ana-dim">${capEsc(e.type)}</span>`, capStBadge(e.status,e.cls),
        e.review?`<span title="${capEsc(e.review)}">${capXtShort(e.review,160)}</span>`:'<span class="ana-dim">—</span>',
        `<button class="cap-lf-btn" data-strev="${capEsc(e.id)}" title="${n?_L(`${n} commentaire(s) de revue Arcalyse : en ajouter un`):_L('Commenter cet élément dans 💬 Revue')}">💬${n?' '+n:''}</button>`]; }));
  } else if(st.view==='rep'){
    const L=[...CAP_ANA_LAYERS,'?'].filter(k=>S.list.some(e=>k==='?'?!CAP_ANA_LAYERS.includes(e.layer):e.layer===k));
    const cell=(k,f)=>{ const n=S.list.filter(e=>(k==='?'?!CAP_ANA_LAYERS.includes(e.layer):e.layer===k)&&f(e)).length; return n?`<b>${n}</b>`:''; };
    body=_L(`<p class="ana-help">Nombre d'éléments par statut et par couche ARCADIA, puis par type d'élément.</p>`)+
      capXtTable([_L('Statut'),_L('Classe'),...L.map(k=>k==='?'?_L('Hors couche'):k),'Σ'], [...S.lits.map(l=>[capStBadge(l.name,l.cls), capEsc(CAP_ST_CLS[l.cls].l), ...L.map(k=>cell(k,e=>e.litId===l.id)), String(S.list.filter(e=>e.litId===l.id).length)]),
        [_L('<span class="ana-dim">— sans statut (commentaire seul)</span>'), '', ...L.map(k=>cell(k,e=>!e.status)), String(S.list.filter(e=>!e.status).length)]])+
      capXtTable(['Type',...Object.keys(CAP_ST_CLS).map(k=>CAP_ST_CLS[k].l),'Σ'], types.map(t=>[capEsc(t), ...Object.keys(CAP_ST_CLS).map(k=>{ const n=S.list.filter(e=>e.type===t&&e.cls===k).length; return n?`<b>${n}</b>`:''; }), String(S.list.filter(e=>e.type===t).length)]));
    cnt='';
  } else { body=capDiagHtml(capStChecks()); cnt=''; }
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Liste')],['rep',_L('▦ Répartition')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='list'?`${capXtLayerBtns(S.list,st.layer)}<span class="tsep"></span>${capXtSearch(st.q,_L('Nom, type, statut, commentaire…'))}
      ${capXtSelect('status',[['',_L('Tous les statuts')],...Object.keys(CAP_ST_CLS).filter(k=>S.list.some(e=>e.cls===k)).map(k=>['cls:'+k,'▸ '+CAP_ST_CLS[k].l]),...statuses.map(s=>[s,s==='(none)'?_L('— sans statut'):s])],st.status)}
      ${capXtSelect('type',[['',_L('Tous les types')],...types.map(t=>[t,t])],st.type)}
      ${capXtSelect('rev',[['',_L('Avec ou sans commentaire Capella')],['yes',_L('Avec commentaire Capella')],['no',_L('Sans commentaire Capella')]],st.rev)}`:''), cnt)+body;
  capXtBind(box, st, capRenderStatus, ()=>capCsvExport(_L('statut-revue.csv'),[_L('Couche'),_L('Élément'),'Type',_L('Statut'),_L('Classe'),_L('Commentaire Capella'),_L('Commentaires Arcalyse')],
    shown.map(e=>[e.layer,capCx(e.name,e.id),e.type,e.status,e.cls?CAP_ST_CLS[e.cls].l:'',e.review,String(capStRevComments(e.id).length)])));
  box.querySelectorAll('[data-strev]').forEach(b=>b.onclick=()=>capRevNew([{id:b.dataset.strev}]));
}

/** Ouvre la sous-vue 🔖 Statut de revue, filtrée sur un statut ou une classe.
 * @param {string} [status] - Nom d'un littéral, 'cls:ko'… ou '' (tout)
 */
function capStOpen(status){ Object.assign(_capSt,{view:'list', status:status||'', q:''}); capAnaSub='status'; if(capCurrentView==='analyses') capRenderAnalyses(); else capShowView('analyses'); }

/** Section « Statut de revue Capella » du panneau de détail ('' si l'élément n'en a pas).
 * @param {string} id - Élément
 * @param {Function} secTitle - Titre de section (libellé, couleur)
 * @returns {string} HTML
 */
function capStDetail(id, secTitle){
  const e=capComputeStatus().byEl[id]; if(!e) return '';
  const c=e.cls?(CAP_ST_CLS[e.cls]||CAP_ST_CLS.other).c:'var(--c-dim)';
  return secTitle(_L('Statut de revue Capella'), c)+`<div style="font-size:11.5px;line-height:1.5">${capStBadge(e.status,e.cls)}${e.status?` <a href="#" onclick="capStOpen('${capEsc(e.status).replace(/'/g,'\\\'')}');return false" class="cap-det-link" title="${_L('Tous les éléments à ce statut (🔬 Analyses › 🔖 Statut de revue)')}">🔖 ${_L('voir tous')}</a>`:''}
    ${e.review?`<div class="ana-dim" style="margin-top:4px;white-space:pre-line">${capEsc(e.review)}</div>`:''}</div>`;
}

/** Indicateurs du tableau de bord : statut de revue Capella.
 * @param {Function} add - Ajout d'un indicateur (groupe, id, libellé, nature, calcul, description)
 * @param {Function} LC - Couleur d'une couche
 */
function capStDashCatalog(add, LC){
  const S=()=>capComputeStatus(), G=_L('Statut de revue');
  add(G,'st.n',_L('Statut de revue — éléments avec un statut'),'n',()=>({n:S().list.filter(e=>e.status).length}));
  add(G,'st.pct',_L('Statut de revue — taux d\'éléments avec un statut'),'pct',()=>{ const s=S(); return s.nAll?{v:Math.round(100*s.list.filter(e=>e.status).length/s.nAll), num:s.list.filter(e=>e.status).length, den:s.nAll}:null; },_L('Éléments nommés du modèle, hors types techniques'));
  add(G,'st.ko',_L('Statut de revue — éléments à retravailler'),'n',()=>({n:S().list.filter(e=>e.cls==='ko').length}));
  add(G,'st.rev',_L('Statut de revue — éléments avec un commentaire Capella'),'n',()=>({n:S().list.filter(e=>e.review).length}));
  add(G,'st.by',_L('Statut de revue — éléments par statut'),'series',()=>({cats:S().lits.map(l=>({l:l.name, v:S().list.filter(e=>e.litId===l.id).length, c:(CAP_ST_CLS[l.cls]||CAP_ST_CLS.other).h})).filter(c=>c.v), order:'natural'}));
  add(G,'st.cls',_L('Statut de revue — éléments par classe de statut'),'series',()=>({cats:Object.keys(CAP_ST_CLS).map(k=>({l:CAP_ST_CLS[k].l, v:S().list.filter(e=>e.cls===k).length, c:CAP_ST_CLS[k].h})).filter(c=>c.v), order:'natural'}));
  add(G,'st.layer',_L('Statut de revue — classes de statut par couche'),'multi',()=>{ const s=S(), L=CAP_ANA_LAYERS.filter(k=>s.list.some(e=>e.layer===k&&e.status));
    return {cats:L, series:Object.keys(CAP_ST_CLS).map(k=>({l:CAP_ST_CLS[k].l, c:CAP_ST_CLS[k].h, vals:L.map(x=>s.list.filter(e=>e.layer===x&&e.cls===k).length)})).filter(x=>x.vals.some(Boolean))}; });
  add(_L('Contrôles'),'chk.st',_L('Statut de revue — contrôles'),'series',()=>({cats:capChkFilter(capStChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length}))}));
}
