/* ═══════════════════════════════════════════════════════════════════════
   🔬 ANALYSES — 📑 EXIGENCES · 🏷 PROPRIÉTÉS (PVMT) · 🗃 DONNÉES & INTERFACES · ⛓ CONTRAINTES
   Sous-vues de 🔬 Analyses ; calculs mis en cache dans _capAnaCache (reqs, pvmt, dm, cts).
   Exigences : Requirements Viewpoint (Requirements:Requirement, relations Capella entrantes /
   sortantes / internes) et exigences Capella de base (SystemUserRequirement…, RequirementsTrace).
═══════════════════════════════════════════════════════════════════════ */

/* ── Outils communs aux quatre sous-vues ────────────────────────── */

/** Convertit un texte riche (HTML des exigences, linkedText) en texte brut.
 * @param {string} s - Texte éventuellement balisé
 * @returns {string} Texte brut, espaces normalisés
 */
function capXtPlain(s){
  if(!s) return '';
  if(!/[<&]/.test(s)) return s.replace(/\s+/g,' ').trim();
  const d=new DOMParser().parseFromString(String(s).replace(/<br\s*\/?>/gi,' ').replace(/<\/p>/gi,' '),'text/html');
  return (d.body.textContent||'').replace(/\s+/g,' ').trim();
}
/** Texte tronqué avec info-bulle portant le texte complet.
 * @param {string} s - Texte brut
 * @param {number} [n=220] - Longueur maximale affichée
 * @returns {string} HTML
 */
function capXtShort(s, n){
  n=n||220; if(!s) return '<span class="ana-dim">—</span>';
  return s.length>n?`<span title="${capEsc(s)}">${capEsc(s.slice(0,n))}…</span>`:capEsc(s);
}
/** Liste repliable de liens vers des éléments (avec badge de couche si demandé).
 * @param {object[]} arr - Éléments {id,name,layer}
 * @param {boolean} [withLayer] - Préfixer chaque lien du badge de couche
 * @returns {string} HTML
 */
function capXtLinks(arr, withLayer){
  if(!arr||!arr.length) return '<span class="ana-dim">—</span>';
  return capFoldList(arr.map(e=>(withLayer?capChainLayerBadge(e.layer)+' ':'')+capDetLink(e.id,e.name)+(e.rel?` <span class="ana-dim">(${capEsc(e.rel)})</span>`:'')));
}
/** Tableau HTML simple (classe .ana-t).
 * @param {string[]} cols - En-têtes
 * @param {string[][]} rows - Cellules HTML
 * @param {string} [empty] - Message si aucune ligne
 * @returns {string} HTML
 */
function capXtTable(cols, rows, empty){
  if(!rows.length) return `<div class="phl-empty">${empty||_L('Aucun élément ne correspond au filtre.')}</div>`;
  return `<div style="overflow:auto"><table class="ana-t"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
/** Boutons de choix de vue.
 * @param {string[][]} views - [clé, libellé]
 * @param {string} cur - Vue active
 * @returns {string} HTML
 */
function capXtViewBtns(views, cur){
  return views.map(([k,l])=>`<button class="cap-lf-btn${cur===k?' active':''}" data-xv="${k}">${l}</button>`).join('');
}
/** Boutons de filtre par couche ARCADIA (seulement les couches présentes).
 * @param {object[]} items - Éléments portant une propriété layer
 * @param {string} cur - Couche active ('all' = toutes)
 * @returns {string} HTML
 */
function capXtLayerBtns(items, cur){
  const ks=[...CAP_ANA_LAYERS,'?'].filter(k=>items.some(x=>x.layer===k));
  if(ks.length<2) return '';
  return _L(`<span class="tsep"></span><button class="cap-lf-btn${cur==='all'?' active':''}" data-xl="all">Toutes (${items.length})</button>`)+
    ks.map(k=>`<button class="cap-lf-btn${cur===k?' active':''}" data-xl="${k}">${k==='?'?_L('Hors couche'):k} (${items.filter(x=>x.layer===k).length})</button>`).join('');
}
/** Liste déroulante liée à une clé de l'état de la vue.
 * @param {string} key - Clé de l'état
 * @param {string[][]} opts - [valeur, libellé]
 * @param {string} cur - Valeur active
 * @returns {string} HTML
 */
function capXtSelect(key, opts, cur){
  return `<select class="phl-filter-input" data-xs="${key}" style="width:auto;max-width:260px">${opts.map(([v,l])=>`<option value="${capEsc(v)}"${v===cur?' selected':''}>${capEsc(l)}</option>`).join('')}</select>`;
}
/** Branche les commandes d'une sous-vue (vue, couche, listes, cases, recherche, CSV).
 * @param {HTMLElement} box - Conteneur
 * @param {object} st - État de la vue
 * @param {Function} rerender - Fonction de rendu (box)
 * @param {Function} [onCsv] - Export CSV
 */
function capXtBind(box, st, rerender, onCsv){
  box.querySelectorAll('[data-xv]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.xv; rerender(box); });
  box.querySelectorAll('[data-xl]').forEach(b=>b.onclick=()=>{ st.layer=b.dataset.xl; rerender(box); });
  box.querySelectorAll('select[data-xs]').forEach(s=>s.onchange=()=>{ st[s.dataset.xs]=s.value; rerender(box); });
  box.querySelectorAll('input[data-xc]').forEach(c=>c.onchange=()=>{ st[c.dataset.xc]=c.checked; rerender(box); });
  let deb; box.querySelector('input[data-xq]')?.addEventListener('input',e=>{ st.q=e.target.value; clearTimeout(deb);
    deb=setTimeout(()=>{ const p=e.target.selectionStart; rerender(box); const i=box.querySelector('input[data-xq]'); if(i){ i.focus(); i.setSelectionRange(p,p); } },250); });
  const csv=box.querySelector('[data-xcsv]'); if(csv&&onCsv) csv.onclick=onCsv;
}
/** Barre de commandes standard d'une sous-vue.
 * @param {string} inner - Commandes HTML
 * @param {string} [cnt] - Compteur filtré
 * @param {boolean} [csv=true] - Afficher ⬇ CSV
 * @returns {string} HTML
 */
function capXtBar(inner, cnt, csv){
  return `<div class="phl-filter-bar" style="flex-wrap:wrap;margin-bottom:8px">${inner}${cnt?`<span class="ana-fn-cnt">${cnt}</span>`:''}
    ${csv===false?'':_L('<button class="phl-export-btn" data-xcsv style="margin-left:auto">⬇ CSV</button>')}</div>`;
}
/** Champ de recherche standard.
 * @param {string} q - Valeur
 * @param {string} ph - Texte indicatif
 * @returns {string} HTML
 */
function capXtSearch(q, ph){ return `<input data-xq class="phl-filter-input" placeholder="🔍 ${capEsc(ph)}" value="${capEsc(q)}" style="width:200px">`; }
/** Vrai si la recherche (minuscules) figure dans l'un des textes. */
function capXtHas(q, ...strs){ return !q||strs.some(s=>String(s||'').toLowerCase().includes(q)); }
/** Identifiant d'un élément XML, ou '' s'il est absent. */
function capXtId(el){ return el?capXId(el):''; }
/** Élément courant résolu : un Part renvoie au composant qu'il type. */
function capXtDePart(el, res){ return el&&capTName(el)==='Part'?(res(el.getAttribute('abstractType'))||el):el; }

/* ── 1. 📑 EXIGENCES ────────────────────────────────────────────── */

/** Nom ReqIF lisible d'un élément du Requirements Viewpoint (type, attribut, valeur…). */
function capReqIfName(el){ return el?(el.getAttribute('ReqIFLongName')||el.getAttribute('ReqIFName')||el.getAttribute('name')||''):''; }

/** Calcule les exigences des deux familles (Requirements Viewpoint et exigences Capella de base),
 * leurs attributs, leurs liens vers le modèle et leurs relations entre exigences.
 * @returns {{list:object[], byEl:object, attrDefs:string[]}} Exigences, index élément → exigences, noms d'attributs
 */
function capComputeRequirements(){
  if(_capAnaCache.reqs) return _capAnaCache.reqs;
  const {all,res,resList}=capAnaCtx();
  const byId={}, list=[];
  all.forEach(el=>{
    const t=capTName(el), legacy=/basic\.requirement/.test(capXType(el));
    if(!(legacy?/Requirement$/.test(t):t==='Requirement')) return;
    const path=[];
    for(let p=el.parentElement; p; p=p.parentElement){
      const pt=capTName(p); if(!/^(Folder|CapellaModule|RequirementsPkg)$/.test(pt)) break;
      path.unshift(capReqIfName(p));
    }
    const r={id:capXId(el), legacy, src:legacy?_L('Capella'):_L('Requirements Viewpoint'), layer:capArchLayerOf(el), path:path.filter(Boolean).join(' › '), links:[], rels:[], attrs:{}, broken:0};
    if(legacy){
      r.ident=el.getAttribute('requirementId')||''; r.name=capXName(el)||'—'; r.kind=capAnaHuman(t);
      r.text=capXtPlain(el.getAttribute('additionalInformation')||el.getAttribute('description')||'');
    } else {
      r.ident=el.getAttribute('ReqIFIdentifier')||''; r.name=capReqIfName(el)||r.ident||'—';
      r.kind=capReqIfName(res(el.getAttribute('requirementType')))||'Requirement';
      r.text=capXtPlain(el.getAttribute('ReqIFText')||'');
      for(const ch of el.children){
        if(!/ValueAttribute$/.test(capTName(ch))) continue;
        const def=res(ch.getAttribute('definition')); if(!def) continue;
        const v=capTName(ch)==='EnumerationValueAttribute'?resList(ch.getAttribute('values')).map(capReqIfName).join(', '):(ch.getAttribute('value')||'');
        if(v!=='') r.attrs[capReqIfName(def)]=v;
      }
    }
    byId[r.id]=r; list.push(r);
  });
  const byEl={}, seen=new Set();
  const pair=(s,g,rel,lk)=>{
    if(!s||!g){ const r=byId[capXtId(s||g)]; if(r) r.broken++; return; }
    s=capXtDePart(s,res); g=capXtDePart(g,res);
    const S=byId[capXId(s)], G=byId[capXId(g)], key=capXId(s)+'|'+capXId(g)+'|'+rel;
    if(seen.has(key)) return; seen.add(key);
    if(S&&G){ S.rels.push({id:G.id,name:G.name,layer:G.layer,rel:(rel||'relation')+' →'}); G.rels.push({id:S.id,name:S.name,layer:S.layer,rel:'← '+(rel||'relation')}); return; }
    const R=S||G, other=S?g:s; if(!R) return;
    const e={...capAnaEl(other), rel:rel||lk};
    R.links.push(e); (byEl[e.id]=byEl[e.id]||[]).push({id:R.id,name:R.ident?`${R.ident} ${R.name}`:R.name,layer:R.layer,rel:e.rel});
  };
  all.forEach(el=>{
    const t=capTName(el);
    if(t==='CapellaIncomingRelation'||t==='CapellaOutgoingRelation'||t==='InternalRelation')
      pair(res(el.getAttribute('source')),res(el.getAttribute('target')),capReqIfName(res(el.getAttribute('relationType'))),'');
    else if(t==='RequirementsTrace') pair(res(el.getAttribute('sourceElement')),res(el.getAttribute('targetElement')),'','trace');
  });
  const attrDefs=[...new Set(list.flatMap(r=>Object.keys(r.attrs)))].sort((a,b)=>a.localeCompare(b,'fr'));
  return _capAnaCache.reqs={list, byEl, attrDefs};
}

/** Sections de contrôle des exigences (réutilisées par le tableau de bord).
 * @returns {object[]} Sections au format capDiagHtml
 */
function capReqChecks(){
  const {list,byEl}=capComputeRequirements(); if(!list.length) return [];
  const row=r=>`<tr><td>${capEsc(r.ident||'')}</td><td>${capDetLink(r.id,r.name,'font-weight:600')}</td><td class="ana-dim">${capEsc(r.kind)}</td></tr>`;
  const cols=['ID',_L('Exigence'),'Type'];
  const ids={}; list.forEach(r=>{ if(r.ident) (ids[r.src+'|'+r.ident]=ids[r.src+'|'+r.ident]||[]).push(r); });
  // Éléments sans exigence : seulement dans les couches où des éléments de même catégorie sont déjà liés
  const els=capComputeTrace(false,true).els;
  const linked=new Set(Object.keys(byEl));
  const usedCat=new Set(els.filter(e=>linked.has(e.id)).map(e=>e.cat+'|'+e.layer));
  const orph=cat=>els.filter(e=>e.cat===cat&&usedCat.has(cat+'|'+e.layer)&&!linked.has(e.id))
    .sort((a,b)=>a.layer.localeCompare(b.layer)||a.name.localeCompare(b.name,'fr'))
    .map(e=>`<tr><td>${capChainLayerBadge(e.layer)} ${capDetLink(e.id,e.name)}</td><td class="ana-dim">${capEsc(capAnaHuman(e.type))}</td></tr>`);
  return [
    {icon:'∅', title:_L('Exigences liées à aucun élément du modèle'), tip:_L('Ni relation Capella ni trace vers une fonction, un composant…'), cols, items:list.filter(r=>!r.links.length).map(row)},
    {icon:'✎', title:_L('Exigences sans texte'), cols, items:list.filter(r=>!r.text).map(row)},
    {icon:'#', title:_L('Exigences sans identifiant'), cols, items:list.filter(r=>!r.ident).map(row)},
    {icon:'⧉', title:_L('Identifiants en double'), tip:_L('Au sein d\'une même famille (Requirements Viewpoint ou exigences Capella)'), cols, items:Object.values(ids).filter(a=>a.length>1).flat().map(row)},
    {icon:'⚠', title:_L('Relations vers un élément introuvable'), tip:_L('Cible supprimée ou hors du fichier chargé'), cols, items:list.filter(r=>r.broken).map(row)},
    {icon:'ƒ', title:_L('Fonctions feuilles sans exigence'), tip:_L('Couches où d\'autres fonctions sont déjà liées à des exigences'), cols:[_L('Fonction'),'Type'], items:orph('fn')},
    {icon:'▣', title:_L('Composants / acteurs sans exigence'), tip:_L('Couches où d\'autres composants sont déjà liés à des exigences'), cols:[_L('Composant'),'Type'], items:orph('comp')},
  ];
}

/** Rend la sous-vue 📑 Exigences : liste filtrable, couverture par couche, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderRequirements(box){
  const st=box._rq=box._rq||{view:'list', q:'', kind:'', attr:'', cov:'', src:''};
  const {list,attrDefs}=capComputeRequirements();
  if(!list.length){ box.innerHTML=_L('<div class="phl-empty">Aucune exigence dans ce modèle (ni Requirements Viewpoint, ni exigences Capella).</div>'); return; }
  const q=st.q.trim().toLowerCase();
  const kinds=[...new Set(list.map(r=>r.kind))].sort();
  const attrOpts=attrDefs.flatMap(d=>[...new Set(list.map(r=>r.attrs[d]).filter(Boolean))].sort().map(v=>[d+'='+v,d+' = '+v]));
  const srcs=[...new Set(list.map(r=>r.src))];
  const shown=list.filter(r=>(!st.src||r.src===st.src)&&(!st.kind||r.kind===st.kind)&&(!st.attr||(()=>{ const i=st.attr.indexOf('='); return r.attrs[st.attr.slice(0,i)]===st.attr.slice(i+1); })())
    &&(!st.cov||(st.cov==='yes'?r.links.length:!r.links.length))&&capXtHas(q,r.ident,r.name,r.text,r.path));
  const traced=list.filter(r=>r.links.length).length;
  let body='', cnt=`${shown.length} / ${list.length}`;
  if(st.view==='list'){
    body=_L(`<p class="ana-help">${list.length} exigence(s) · <b>${traced}</b> liée(s) au modèle (${Math.round(100*traced/list.length)} %). Cliquez un nom pour ouvrir le détail.</p>`)+
      capXtTable(['ID',_L('Exigence'),'Type',_L('Texte'),_L('Attributs'),_L('Éléments liés'),_L('Exigences liées')], shown.map(r=>[
        `<span style="font-family:monospace;white-space:nowrap">${capEsc(r.ident)}</span>`,
        `${capDetLink(r.id,r.name,'font-weight:600')}${r.path?`<div class="ana-dim">${capEsc(r.path)}</div>`:''}`,
        `<span class="ana-dim">${capEsc(r.kind)}${srcs.length>1?'<br>'+capEsc(r.src):''}</span>`, capXtShort(r.text),
        Object.entries(r.attrs).map(([k,v])=>`<div><span class="ana-dim">${capEsc(k)} :</span> ${capEsc(v)}</div>`).join('')||'<span class="ana-dim">—</span>',
        r.links.length?capXtLinks(r.links,true):_L('<span class="ana-miss">∅ aucun</span>'), capXtLinks(r.rels)]));
  } else if(st.view==='cov'){
    const L=[...CAP_ANA_LAYERS,'?'].filter(k=>list.some(r=>r.links.some(e=>e.layer===k)));
    body=_L(`<p class="ana-help">Nombre d'éléments liés à chaque exigence, par couche ARCADIA.</p>`)+
      capXtTable(['ID',_L('Exigence'),...L.map(k=>k==='?'?_L('Hors couche'):k),'Σ'], shown.map(r=>[capEsc(r.ident), capDetLink(r.id,r.name),
        ...L.map(k=>{ const n=r.links.filter(e=>e.layer===k).length; return n?`<b>${n}</b>`:''; }), r.links.length?String(r.links.length):'<span class="ana-miss">0</span>']))+
      capXtTable([_L('Couche'),_L('Exigences liées'),_L('Éléments liés')], L.map(k=>[capChainLayerBadge(k), String(list.filter(r=>r.links.some(e=>e.layer===k)).length),
        String(new Set(list.flatMap(r=>r.links.filter(e=>e.layer===k).map(e=>e.id))).size)]));
  } else { body=capDiagHtml(capReqChecks()); cnt=''; }
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Liste')],['cov',_L('▦ Couverture')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${capXtSearch(st.q,_L('ID, nom, texte…'))}
      ${srcs.length>1?capXtSelect('src',[['',_L('Toutes les familles')],...srcs.map(k=>[k,k])],st.src):''}
      ${capXtSelect('kind',[['',_L('Tous les types')],...kinds.map(k=>[k,k])],st.kind)}
      ${attrOpts.length?capXtSelect('attr',[['',_L('Tous les attributs')],...attrOpts],st.attr):''}
      ${capXtSelect('cov',[['',_L('Liées ou non')],['yes',_L('Liées au modèle')],['no',_L('Non liées')]],st.cov)}`:''), cnt)+body;
  capXtBind(box, st, capRenderRequirements, ()=>capCsvExport(_L('exigences.csv'),['ID',_L('Exigence'),_L('Famille'),'Type',_L('Dossier'),_L('Texte'),...attrDefs,_L('Éléments liés'),_L('Couches'),_L('Exigences liées')],
    shown.map(r=>[r.ident,capCx(r.name,r.id),r.src,r.kind,r.path,r.text,...attrDefs.map(d=>r.attrs[d]||''),capCxList(r.links),[...new Set(r.links.map(e=>e.layer))].join(', '),capCxList(r.rels)])));
}

/* ── 2. 🏷 PROPRIÉTÉS (PVMT) ────────────────────────────────────── */

const CAP_PV_ARCH={OPERATIONAL:'OA',SYSTEM:'SA',LOGICAL:'LA',PHYSICAL:'PA',EPBS:'EPBS'};

/** Valeur lisible d'une PropertyValue Capella (valeur par défaut EMF si absente).
 * @param {Element} pv - Élément *PropertyValue
 * @param {Function} res - Résolution de référence
 * @returns {{kind:string, value:string, num:number|null, dflt:boolean}} Valeur
 */
function capPvValue(pv, res){
  const t=capTName(pv), v=pv.getAttribute('value');
  if(t==='EnumerationPropertyValue'){ const l=res(v); return {kind:'enum', value:l?capXName(l):'', num:null, dflt:!l}; }
  if(t==='BooleanPropertyValue') return {kind:'bool', value:v==null?'false':v, num:null, dflt:v==null};
  if(t==='FloatPropertyValue'||t==='IntegerPropertyValue'){ const n=parseFloat(v??'0'); return {kind:'num', value:v??'0', num:isNaN(n)?null:n, dflt:v==null}; }
  return {kind:'str', value:v??'', num:null, dflt:v==null||v===''};
}
/** Unité d'une propriété PVMT (sous-propriété « __UNIT__ » de la propriété ou de sa définition). */
function capPvUnit(pv, res){
  for(const p of [pv, res(pv.getAttribute('appliedPropertyValues'))]) if(p) for(const c of p.children) if(capXName(c)==='__UNIT__') return c.getAttribute('value')||'';
  return '';
}

/** Calcule les propriétés PVMT : définitions (domaines, groupes, propriétés, applicabilité)
 * et valeurs appliquées sur les éléments du modèle (groupes appliqués et propriétés simples).
 * @returns {{defs:object[], vals:object[], byEl:object}} Définitions, valeurs, index élément → valeurs
 */
function capComputePvmt(){
  if(_capAnaCache.pvmt) return _capAnaCache.pvmt;
  const {all,res}=capAnaCtx();
  const isPkg=el=>el&&capTName(el)==='PropertyValuePkg', isPvg=el=>el&&capTName(el)==='PropertyValueGroup', isPv=el=>el&&/PropertyValue$/.test(capTName(el));
  const inPkg=el=>{ for(let p=el.parentElement; p; p=p.parentElement) if(isPkg(p)) return true; return false; };
  const defs=[], defById={}, vals=[], byEl={};
  all.forEach(g=>{
    if(!isPvg(g)||!isPkg(g.parentElement)) return;
    const d=capXName(g), desc=g.getAttribute('description')||'';
    const tag=k=>{ const m=desc.match(new RegExp(`\\[${k}\\]([\\s\\S]*?)\\[\\/${k}\\]`)); return m?m[1].trim():''; };
    const def={id:capXId(g), name:d, domain:capXName(g.parentElement), classes:tag('CLASS').split(',').map(s=>s.trim().split('/').pop()).filter(Boolean), uris:tag('CLASS').split(',').map(s=>s.trim()).filter(Boolean),
      archs:tag('ARCHITECTURE').split(/[;,]/).map(s=>CAP_PV_ARCH[s.trim()]).filter(Boolean), cond:!!tag('CONDITION'),
      props:[...g.children].filter(c=>isPv(c)&&capXName(c)!=='__UNIT__').map(c=>({id:capXId(c), name:capXName(c), ...capPvValue(c,res), unit:capPvUnit(c,res)})), applied:new Set()};
    defs.push(def); defById[def.id]=def;
  });
  const push=(owner,pv,domain,group,defId,unlinked)=>{
    if(capXName(pv)==='__UNIT__') return;
    const o=capAnaEl(owner), v={el:o, domain, group, defId, unlinked:!!unlinked, prop:capXName(pv)||'—', ...capPvValue(pv,res), unit:capPvUnit(pv,res)};
    vals.push(v); (byEl[o.id]=byEl[o.id]||[]).push(v);
  };
  all.forEach(el=>{
    const owner=el.parentElement; if(!owner||isPkg(owner)||isPvg(owner)||isPv(owner)||inPkg(el)) return;
    if(isPvg(el)){
      const nm=capXName(el);
      let def=defById[capXtId(res(el.getAttribute('appliedPropertyValueGroups')))], unlinked=false;
      // Groupe sans référence vers sa définition : rattachement par le nom « Domaine.Groupe »
      if(!def){ def=defs.find(d=>d.domain+'.'+d.name===nm)||null; unlinked=!!def; }
      const domain=def?def.domain:(nm.includes('.')?nm.split('.')[0]:'—'), group=def?def.name:(nm.includes('.')?nm.split('.').slice(1).join('.'):nm);
      if(def) def.applied.add(capXId(owner));
      [...el.children].filter(isPv).forEach(pv=>push(owner,pv,domain,group,def&&def.id,unlinked));
    } else if(isPv(el)) push(owner,el,_L('(propriété simple)'),'',null);
  });
  return _capAnaCache.pvmt={defs, vals, byEl};
}

/** Éléments auxquels un groupe PVMT s'applique (classes et architectures déclarées) sans l'avoir reçu.
 * @param {object} def - Définition de groupe
 * @returns {object[]} Éléments {id,name,type,layer}
 */
function capPvMissing(def){
  if(!def.classes.length||def.cond) return [];
  const {all}=capAnaCtx();
  // Correspondance exacte du type ; la classe Requirement de Capella couvre les exigences Capella de base, State couvre FinalState
  const match=(uri,t,el)=>{ const c=uri.split('/').pop();
    if(/\/core\/requirement\//.test(uri)) return /Requirement$/.test(t)&&/basic\.requirement/.test(capXType(el));
    return t===c||(c==='State'&&t==='FinalState'); };
  return all.filter(el=>{ const t=capTName(el); if(/Pkg$/.test(t)||!def.uris.some(u=>match(u,t,el))) return false;
    const l=capArchLayerOf(el); return (l==='?'||!def.archs.length||def.archs.includes(l))&&!def.applied.has(capXId(el)); }).map(capAnaEl);
}

/** Sections de contrôle des propriétés PVMT (réutilisées par le tableau de bord).
 * @returns {object[]} Sections au format capDiagHtml
 */
function capPvChecks(){
  const {defs,vals}=capComputePvmt(); if(!defs.length&&!vals.length) return [];
  const miss=defs.flatMap(d=>capPvMissing(d).map(e=>`<tr><td>${capChainLayerBadge(e.layer)} ${capDetLink(e.id,e.name)}</td><td class="ana-dim">${capEsc(capAnaHuman(e.type))}</td><td>${capEsc(d.domain+' › '+d.name)}</td></tr>`));
  const vrow=v=>`<tr><td>${capChainLayerBadge(v.el.layer)} ${capDetLink(v.el.id,v.el.name)}</td><td>${capEsc(v.group||v.domain)}</td><td>${capEsc(v.prop)}</td></tr>`;
  return [
    {icon:'∅', title:_L('Éléments concernés par un groupe PVMT mais non renseignés'), tip:_L('Selon les classes et architectures déclarées dans la définition du groupe (groupes à condition exclus)'), cols:[_L('Élément'),'Type',_L('Groupe attendu')], items:miss},
    {icon:'○', title:_L('Valeurs numériques restées à la valeur par défaut (0)'), tip:_L('Propriété appliquée mais jamais saisie'), cols:[_L('Élément'),_L('Groupe'),_L('Propriété')], items:vals.filter(v=>v.kind==='num'&&v.dflt).map(vrow)},
    {icon:'○', title:_L('Énumérations ou textes non renseignés'), cols:[_L('Élément'),_L('Groupe'),_L('Propriété')], items:vals.filter(v=>(v.kind==='enum'||v.kind==='str')&&v.dflt).map(vrow)},
    {icon:'?', title:_L('Groupes appliqués dont la définition est introuvable'), cols:[_L('Élément'),_L('Groupe'),_L('Propriété')], items:vals.filter(v=>!v.defId&&v.group).map(vrow)},
    {icon:'⛓', title:_L('Groupes appliqués sans lien vers leur définition'), tip:_L('Rattachés ici par leur nom « Domaine.Groupe » ; à réappliquer avec l\'outil PVMT'), cols:[_L('Élément'),_L('Groupe'),_L('Propriété')], items:vals.filter(v=>v.unlinked).map(vrow)},
  ];
}

/** Rend la sous-vue 🏷 Propriétés : grille par groupe (une colonne par propriété), synthèse, définitions, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderPvmt(box){
  const st=box._pv=box._pv||{view:'grid', q:'', grp:'', layer:'all'};
  const {defs,vals}=capComputePvmt();
  if(!defs.length&&!vals.length){ box.innerHTML=_L('<div class="phl-empty">Aucune propriété (PVMT ou propriété simple) dans ce modèle.</div>'); return; }
  const q=st.q.trim().toLowerCase();
  const gkey=v=>v.domain+' › '+(v.group||'—');
  const groups=[...new Set(vals.map(gkey))].sort((a,b)=>a.localeCompare(b,'fr'));
  if(!st.grp||!groups.includes(st.grp)) st.grp=groups[0]||'';
  const fmt=v=>`${capEsc(v.value)}${v.unit?` <span class="ana-dim">${capEsc(v.unit)}</span>`:''}${v.dflt?_L(' <span class="ana-miss" title="Valeur par défaut, jamais saisie">○</span>'):''}`;
  let body='', cnt='', rows=[], header=[];
  if(st.view==='grid'){
    const gv=vals.filter(v=>gkey(v)===st.grp);
    const props=[...new Set(gv.map(v=>v.prop))];
    const els={}; gv.forEach(v=>{ (els[v.el.id]=els[v.el.id]||{el:v.el, p:{}}).p[v.prop]=v; });
    const all=Object.values(els), shown=all.filter(x=>(st.layer==='all'||x.el.layer===st.layer)&&capXtHas(q,x.el.name,...Object.values(x.p).map(v=>v.value)));
    cnt=`${shown.length} / ${all.length}`;
    header=[_L('Couche'),_L('Élément'),'Type',...props]; rows=shown.map(x=>[x.el.layer,x.el.name,capAnaHuman(x.el.type),...props.map(p=>x.p[p]?x.p[p].value:'')]);
    st._csvRows=shown.map((x,i)=>{ const r=rows[i].slice(); r[1]=capCx(x.el.name,x.el.id); return r; });   // export enrichi (53)
    // Totaux des propriétés numériques
    const tot=props.map(p=>{ const ns=shown.map(x=>x.p[p]).filter(v=>v&&v.kind==='num'&&v.num!=null); return ns.length?`<b>Σ ${+ns.reduce((s,v)=>s+v.num,0).toFixed(3)}</b>`:''; });
    body=capXtTable([_L('Couche'),_L('Élément'),'Type',...props.map(capEsc)], shown.map(x=>[capChainLayerBadge(x.el.layer), capDetLink(x.el.id,x.el.name,'font-weight:600'),
      `<span class="ana-dim">${capEsc(capAnaHuman(x.el.type))}</span>`, ...props.map(p=>x.p[p]?fmt(x.p[p]):'<span class="ana-dim">—</span>')]).concat(tot.some(Boolean)?[['',_L('<b>Total</b>'),'',...tot]]:[]));
    st._all=all;
  } else if(st.view==='sum'){
    const keys={}; vals.forEach(v=>{ const k=gkey(v)+' › '+v.prop; (keys[k]=keys[k]||{g:gkey(v),p:v.prop,unit:v.unit,vs:[]}).vs.push(v); });
    const list=Object.values(keys).filter(k=>capXtHas(q,k.g,k.p));
    header=[_L('Groupe'),_L('Propriété'),_L('Valeurs'),_L('Non saisies'),_L('Synthèse')];
    const syn=k=>{ const ns=k.vs.filter(v=>v.kind==='num'&&v.num!=null).map(v=>v.num);
      if(ns.length) return _L(`Σ ${+ns.reduce((a,b)=>a+b,0).toFixed(3)} · min ${Math.min(...ns)} · max ${Math.max(...ns)} · moy. ${+(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(3)}${k.unit?' '+k.unit:''}`);
      return capDashCount(k.vs,v=>v.value||_L('(vide)')).map(c=>`${c.l} (${c.v})`).join(' · '); };
    rows=list.map(k=>[k.g,k.p,k.vs.length,k.vs.filter(v=>v.dflt).length,syn(k)]);
    cnt=_L(`${list.length} propriété(s)`);
    body=capXtTable(header.map(capEsc), rows.map(r=>[capEsc(r[0]),`<b>${capEsc(r[1])}</b>`,String(r[2]),r[3]?`<span class="ana-miss">${r[3]}</span>`:'0',capEsc(r[4])]));
  } else if(st.view==='defs'){
    header=[_L('Domaine'),_L('Groupe'),_L('S\'applique à'),_L('Architectures'),_L('Propriétés'),_L('Éléments renseignés'),_L('Éléments manquants')];
    const list=defs.filter(d=>capXtHas(q,d.domain,d.name,...d.props.map(p=>p.name)));
    rows=list.map(d=>[d.domain,d.name,d.classes.join(', '),d.archs.join(', '),d.props.map(p=>p.name+(p.unit?` (${p.unit})`:'')).join(', '),d.applied.size,capPvMissing(d).length]);
    cnt=`${list.length} / ${defs.length}`;
    body=capXtTable(header.map(capEsc), list.map((d,i)=>[capEsc(d.domain),`<b>${capEsc(d.name)}</b>`,capEsc(d.classes.join(', ')||'—')+(d.cond?_L(' <span class="ana-dim">(avec condition)</span>'):''),
      capEsc(d.archs.join(', ')||'—'), capEsc(rows[i][4]), String(d.applied.size), rows[i][6]?`<span class="ana-miss">${rows[i][6]}</span>`:'0']), _L('Aucune définition PVMT dans ce modèle.'));
  } else body=capDiagHtml(capPvChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['grid',_L('▦ Grille par groupe')],['sum',_L('Σ Synthèse')],['defs',_L('📖 Définitions')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='grid'?`<span class="tsep"></span>${capXtSelect('grp',groups.map(g=>[g,g]),st.grp)}${capXtLayerBtns(st._all||[],st.layer)}`:'')+
    (st.view!=='diag'?` ${capXtSearch(st.q,st.view==='grid'?_L('Élément, valeur…'):_L('Groupe, propriété…'))}`:''), cnt, st.view!=='diag')+
    (st.view==='grid'?_L('<p class="ana-help">Une ligne par élément, une colonne par propriété du groupe. ○ = valeur par défaut jamais saisie.</p>'):'')+body;
  if(st.view==='grid'&&st._all&&st.layer!=='all'&&!st._all.some(x=>x.el.layer===st.layer)){ st.layer='all'; return capRenderPvmt(box); }
  capXtBind(box, st, capRenderPvmt, ()=>capCsvExport(_L(`proprietes-${st.view}.csv`), header, st.view==='grid'&&st._csvRows?st._csvRows:rows));
}

/* ── 3. 🗃 DONNÉES & INTERFACES ──────────────────────────────────── */

const CAP_DM_TYPES=/^(Class|Union|Collection|Enumeration|BooleanType|NumericType|StringType|PhysicalQuantity)$/;

/** Calcule le modèle de données : Exchange Items (éléments, échanges et interfaces qui les portent),
 * interfaces (Exchange Items alloués, ports qui les fournissent / requièrent), classes et types (contenu, usages).
 * @returns {{eis:object[], itfs:object[], types:object[], fes:object[], ces:object[]}} Modèle de données
 */
function capComputeDataModel(){
  if(_capAnaCache.dm) return _capAnaCache.dm;
  const {all,res,resList}=capAnaCtx();
  const card=el=>{ const v=k=>{ for(const c of el.children) if(capTName(c)==='LiteralNumericValue'&&c.tagName.endsWith(k)) return c.getAttribute('value')??'0'; return null; };
    const a=v('ownedMinCard'), b=v('ownedMaxCard'); return a==null&&b==null?'':`[${a??''}..${b??''}]`; };
  const predefined=el=>{ for(let p=el; p; p=p.parentElement) if(capTName(p)==='DataPkg'&&/^predefined types$/i.test(capXName(p))) return true; return false; };
  const eis=[], eiById={}, itfs=[], itfById={}, types=[], tyById={}, fes=[], ces=[];
  all.forEach(el=>{
    const t=capTName(el);
    if(t==='ExchangeItem'){
      const e={...capAnaEl(el), mech:el.getAttribute('exchangeMechanism')||'UNSET', elems:[...el.children].filter(c=>capTName(c)==='ExchangeItemElement')
        .map(c=>{ const ty=res(c.getAttribute('abstractType')); return {id:capXId(c), name:capXName(c)||'—', type:ty?capXName(ty):'', typeId:ty?capXId(ty):'', card:card(c)}; }), fes:[], ces:[], itfs:[]};
      eis.push(e); eiById[e.id]=e;
    } else if(t==='Interface'){
      const i={...capAnaEl(el), items:[...el.children].filter(c=>capTName(c)==='ExchangeItemAllocation').map(c=>res(c.getAttribute('allocatedItem'))).filter(Boolean).map(capAnaEl),
        provided:[], required:[], users:[]};
      itfs.push(i); itfById[i.id]=i;
    } else if(CAP_DM_TYPES.test(t)){
      const y={...capAnaEl(el), kind:capAnaHuman(t), predefined:predefined(el), usedBy:[], sup:[],
        feats:[...el.children].filter(c=>capTName(c)==='Property').map(c=>{ const ty=res(c.getAttribute('abstractType')); return `${capXName(c)||'—'} : ${ty?capXName(ty):'?'}${card(c)}`; }),
        lits:[...el.children].filter(c=>capTName(c)==='EnumerationLiteral').map(capXName), unit:(u=>u?capXName(u):'')(res(el.getAttribute('unit')))};
      for(const c of el.children) if(capTName(c)==='Generalization'){ const s=res(c.getAttribute('super')); if(s) y.sup.push(capAnaEl(s)); }
      types.push(y); tyById[y.id]=y;
    }
  });
  const add=(arr,x)=>{ if(x&&!arr.some(y=>y.id===x.id)) arr.push(x); };
  eis.forEach(e=>e.itfs=itfs.filter(i=>i.items.some(x=>x.id===e.id)).map(i=>({id:i.id,name:i.name,layer:i.layer})));
  all.forEach(el=>{
    const t=capTName(el);
    if(t==='FunctionalExchange'||t==='ComponentExchange'||t==='CommunicationMean'){
      const x={...capAnaEl(el), el, items:resList((el.getAttribute('exchangedItems')||'')+' '+(el.getAttribute('convoyedInformations')||'')).map(capAnaEl)};
      (t==='FunctionalExchange'?fes:ces).push(x);
      x.items.forEach(it=>{ const E=eiById[it.id]; if(E) add(t==='FunctionalExchange'?E.fes:E.ces,{id:x.id,name:x.name,layer:x.layer}); });
    }
    ['providedInterfaces','requiredInterfaces'].forEach((k,j)=>resList(el.getAttribute(k)).forEach(i=>{ const I=itfById[capXId(i)]; if(!I) return;
      const comp=el.parentElement, lbl=`${capXName(comp)||'?'} ⬦ ${capXName(el)||'port'}`; add(j?I.required:I.provided,{id:capXId(el),name:lbl,layer:capArchLayerOf(el)}); }));
    ['usedInterface','implementedInterface'].forEach(k=>{ const i=res(el.getAttribute(k)); const I=i&&itfById[capXId(i)]; if(I) add(I.users,{...capAnaEl(el.parentElement),rel:k==='usedInterface'?_L('utilise'):_L('implémente')}); });
    if(/^(Property|ExchangeItemElement|Parameter)$/.test(t)){ const y=tyById[capXtId(res(el.getAttribute('abstractType')))];
      if(y&&el.parentElement&&capXId(el.parentElement)!==y.id) add(y.usedBy,{...capAnaEl(el.parentElement),name:capXName(el.parentElement)||capAnaHuman(capTName(el.parentElement))}); }
  });
  types.forEach(y=>y.sup.forEach(s=>{ const S=tyById[s.id]; if(S) add(S.usedBy,{id:y.id,name:y.name,layer:y.layer,rel:_L('spécialisé par')}); }));
  // CE porteurs des FE (pour le contrôle de cohérence avec les interfaces des ports)
  ces.forEach(c=>{ c.fes=[...c.el.children].filter(a=>capTName(a)==='ComponentExchangeFunctionalExchangeAllocation').map(a=>res(a.getAttribute('targetElement'))).filter(Boolean).map(capXId);
    c.ports=[res(c.el.getAttribute('source')),res(c.el.getAttribute('target'))].filter(p=>p&&capTName(p)==='ComponentPort'); delete c.el; });
  fes.forEach(f=>delete f.el);
  return _capAnaCache.dm={eis, itfs, types, fes, ces, itfById};
}

/** Sections de contrôle du modèle de données et des interfaces (réutilisées par le tableau de bord).
 * @returns {object[]} Sections au format capDiagHtml
 */
function capDmChecks(){
  const D=capComputeDataModel(); if(!D.eis.length&&!D.itfs.length&&!D.types.length) return [];
  const {resList}=capAnaCtx();
  const row=e=>`<tr><td>${capChainLayerBadge(e.layer)} ${capDetLink(e.id,e.name)}</td><td class="ana-dim">${capEsc(capAnaHuman(e.type))}</td></tr>`;
  const usesEie=D.eis.some(e=>e.elems.length), layersFeEi=new Set(D.fes.filter(f=>f.items.length).map(f=>f.layer));
  // Cohérence FE ↔ CE ↔ interfaces : Exchange Items d'un FE absents des interfaces des ports du CE porteur
  const feById={}; D.fes.forEach(f=>feById[f.id]=f);
  const incoh=[];
  D.ces.forEach(c=>{
    const its=new Set(c.ports.flatMap(p=>[...resList(p.getAttribute('providedInterfaces')),...resList(p.getAttribute('requiredInterfaces'))])
      .flatMap(i=>(D.itfById[capXId(i)]||{items:[]}).items.map(x=>x.id)));
    if(!its.size) return;
    c.fes.forEach(fid=>{ const f=feById[fid]; if(!f) return; f.items.filter(it=>!its.has(it.id)).forEach(it=>incoh.push(
      `<tr><td>${capChainLayerBadge(c.layer)} ${capDetLink(c.id,c.name)}</td><td>${capDetLink(f.id,f.name)}</td><td>${capDetLink(it.id,it.name)}</td></tr>`)); });
  });
  return [
    {icon:'∅', title:_L('Exchange Items portés par aucun échange ni interface'), cols:[_L('Exchange Item'),'Type'], items:D.eis.filter(e=>!e.fes.length&&!e.ces.length&&!e.itfs.length).map(row)},
    {icon:'▤', title:_L('Exchange Items sans élément (contenu non décrit)'), tip:_L('Seulement si le modèle décrit le contenu d\'autres Exchange Items'), cols:[_L('Exchange Item'),'Type'], items:usesEie?D.eis.filter(e=>!e.elems.length).map(row):[]},
    {icon:'⇢', title:_L('Functional Exchanges sans Exchange Item'), tip:_L('Couches où d\'autres FE portent déjà des Exchange Items'), cols:[_L('Functional Exchange'),'Type'], items:D.fes.filter(f=>layersFeEi.has(f.layer)&&!f.items.length).map(row)},
    {icon:'🔌', title:_L('Interfaces sans Exchange Item alloué'), cols:['Interface','Type'], items:D.itfs.filter(i=>!i.items.length).map(row)},
    {icon:'⭘', title:_L('Interfaces ni fournies, ni requises, ni utilisées'), cols:['Interface','Type'], items:D.itfs.filter(i=>!i.provided.length&&!i.required.length&&!i.users.length).map(row)},
    {icon:'≠', title:_L('Exchange Items d\'un FE absents des interfaces des ports du CE porteur'), tip:_L('Seulement pour les CE dont les ports déclarent des interfaces'), cols:[_L('Component Exchange'),_L('Functional Exchange'),_L('Exchange Item manquant')], items:incoh},
    {icon:'🧱', title:_L('Classes et types de données jamais utilisés'), tip:_L('Hors types prédéfinis'), cols:['Type',_L('Nature')], items:D.types.filter(y=>!y.predefined&&!y.usedBy.length&&!D.eis.some(e=>e.elems.some(x=>x.typeId===y.id))).map(row)},
  ];
}

/** Rend la sous-vue 🗃 Données & interfaces : Exchange Items, interfaces, classes et types, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderDataModel(box){
  const st=box._dm=box._dm||{view:'ei', q:'', layer:'all', pre:false};
  const D=capComputeDataModel();
  if(!D.eis.length&&!D.itfs.length&&!D.types.length){ box.innerHTML=_L('<div class="phl-empty">Aucun Exchange Item, interface ni type de données dans ce modèle.</div>'); return; }
  const q=st.q.trim().toLowerCase(), byL=x=>st.layer==='all'||x.layer===st.layer;
  let body='', cnt='', header=[], rows=[], src=[];
  if(st.view==='ei'){
    src=D.eis; const shown=src.filter(e=>byL(e)&&capXtHas(q,e.name,...e.elems.map(x=>x.name+' '+x.type)));
    cnt=`${shown.length} / ${src.length}`;
    header=[_L('Couche'),_L('Exchange Item'),_L('Mécanisme'),_L('Éléments'),_L('Functional Exchanges'),_L('Component Exchanges'),_L('Interfaces')];
    rows=shown.map(e=>[e.layer,capCx(e.name,e.id),e.mech,e.elems.map(x=>`${x.name} : ${x.type}${x.card}`).join(', '),capCxList(e.fes),capCxList(e.ces),capCxList(e.itfs)]);
    body=capXtTable(header, shown.map(e=>[capChainLayerBadge(e.layer), capDetLink(e.id,e.name,'font-weight:600'), `<span class="ana-dim">${capEsc(e.mech)}</span>`,
      e.elems.length?capFoldList(e.elems.map(x=>`${capDetLink(x.id,x.name)} <span class="ana-dim">: ${x.typeId?capDetLink(x.typeId,x.type):'?'}${capEsc(x.card)}</span>`)):'<span class="ana-dim">—</span>',
      capXtLinks(e.fes), capXtLinks(e.ces), capXtLinks(e.itfs)]));
  } else if(st.view==='itf'){
    src=D.itfs; const shown=src.filter(i=>byL(i)&&capXtHas(q,i.name,...i.items.map(x=>x.name)));
    cnt=`${shown.length} / ${src.length}`;
    header=[_L('Couche'),'Interface',_L('Exchange Items'),_L('Fournie par'),_L('Requise par'),_L('Utilisée / implémentée par')];
    rows=shown.map(i=>[i.layer,capCx(i.name,i.id),capCxList(i.items),capCxList(i.provided),capCxList(i.required),capCxList(i.users)]);
    body=capXtTable(header, shown.map(i=>[capChainLayerBadge(i.layer), capDetLink(i.id,i.name,'font-weight:600'), i.items.length?capXtLinks(i.items):_L('<span class="ana-miss">∅ aucun</span>'),
      capXtLinks(i.provided), capXtLinks(i.required), capXtLinks(i.users)]), _L('Aucune interface dans ce modèle.'));
  } else if(st.view==='types'){
    src=D.types.filter(y=>st.pre||!y.predefined); const shown=src.filter(y=>byL(y)&&capXtHas(q,y.name,y.kind,...y.feats,...y.lits));
    cnt=`${shown.length} / ${src.length}`;
    header=[_L('Couche'),'Type',_L('Nature'),_L('Contenu'),_L('Hérite de'),_L('Utilisé par')];
    const content=y=>y.feats.length?y.feats.join(', '):y.lits.length?y.lits.join(', '):y.unit?_L('unité : ')+y.unit:'';
    rows=shown.map(y=>[y.layer,capCx(y.name,y.id),y.kind,content(y),capCxList(y.sup),capCxList(y.usedBy)]);
    body=capXtTable(header, shown.map(y=>[capChainLayerBadge(y.layer), capDetLink(y.id,y.name,'font-weight:600'), `<span class="ana-dim">${capEsc(y.kind)}</span>`,
      y.feats.length?capFoldList(y.feats.map(capEsc),6):y.lits.length?capFoldList(y.lits.map(capEsc),6):capEsc(y.unit?_L('unité : ')+y.unit:'')||'<span class="ana-dim">—</span>',
      capXtLinks(y.sup), capXtLinks(y.usedBy)]), _L('Aucun type de données dans ce modèle.'));
  } else body=capDiagHtml(capDmChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['ei',_L('📦 Exchange Items')],['itf',_L('🔌 Interfaces')],['types',_L('🧱 Classes & types')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?capXtLayerBtns(src,st.layer)+` ${capXtSearch(st.q,_L('Nom, contenu…'))}`+
      (st.view==='types'?_L(` <label class="ana-dim" style="display:inline-flex;gap:4px;align-items:center"><input type="checkbox" data-xc="pre"${st.pre?' checked':''}> types prédéfinis</label>`):''):''), cnt, st.view!=='diag')+body;
  if(st.layer!=='all'&&!src.some(x=>x.layer===st.layer)&&st.view!=='diag'){ st.layer='all'; return capRenderDataModel(box); }
  capXtBind(box, st, capRenderDataModel, ()=>capCsvExport(_L(`donnees-${st.view}.csv`), header, rows));
}

/* ── 4. ⛓ CONTRAINTES ───────────────────────────────────────────── */

/** Calcule les contraintes : expression (liens linkedText résolus), langage, éléments contraints, propriétaire.
 * @returns {{list:object[], byEl:object}} Contraintes et index élément → contraintes
 */
function capComputeConstraints(){
  if(_capAnaCache.cts) return _capAnaCache.cts;
  const {all,res,resList}=capAnaCtx();
  const list=[], byEl={}, role={};
  const ROLES={guard:_L('garde'), preCondition:_L('pré-condition'), postCondition:_L('post-condition')};
  all.forEach(el=>Object.keys(ROLES).forEach(k=>{ const v=el.getAttribute(k); if(v) role[v.replace(/^.*#/,'')]=ROLES[k]; }));
  all.forEach(el=>{
    if(capTName(el)!=='Constraint') return;
    const spec=[...el.children].find(c=>/ownedSpecification$/.test(c.tagName));
    let text='', lang='', broken=0;
    if(spec){
      const kids=[...spec.children];
      lang=kids.filter(c=>c.tagName==='languages').map(c=>c.textContent.trim()).filter(Boolean).join(', ');
      text=kids.filter(c=>c.tagName==='bodies').map(c=>c.textContent).join(' ')
        .replace(/<a\s+href="([^"]*)"\s*\/?>(?:[^<]*<\/a>)?/g,(m,id)=>{ const x=res(id); if(!x){ broken++; return '«?»'; } return '«'+(capXName(x)||capReqIfName(x)||capTName(x))+'»'; });
      text=capXtPlain(text)||(capTName(spec)!=='OpaqueExpression'?capXName(spec)||spec.getAttribute('value')||'':'');
    }
    const owner=el.parentElement, c={...capAnaEl(el), name:capXName(el)||'', role:role[capXId(el)]||'', text, lang:lang.replace(/^capella:linkedText$/,_L('texte lié')), broken,
      owner:owner?{...capAnaEl(owner), name:capXName(owner)||capReqIfName(owner)||capAnaHuman(capTName(owner))}:null,
      on:resList(el.getAttribute('constrainedElements')).map(x=>({...capAnaEl(capXtDePart(x,res)), name:capXName(x)||capReqIfName(x)||'—'}))};
    list.push(c);
    [...c.on, ...(c.on.length?[]:c.owner?[c.owner]:[])].forEach(e=>(byEl[e.id]=byEl[e.id]||[]).push(c));
  });
  return _capAnaCache.cts={list, byEl};
}

/** Sections de contrôle des contraintes (réutilisées par le tableau de bord).
 * @returns {object[]} Sections au format capDiagHtml
 */
function capCtChecks(){
  const {list}=capComputeConstraints(); if(!list.length) return [];
  const row=c=>`<tr><td>${capChainLayerBadge(c.layer)} ${capDetLink(c.id,c.name||_L('(sans nom)'))}</td><td>${c.owner?capDetLink(c.owner.id,c.owner.name):'—'}</td></tr>`;
  const cols=[_L('Contrainte'),_L('Possédée par')];
  const dup={}; list.filter(c=>c.text).forEach(c=>{ const k=c.text+'|'+(c.on.map(e=>e.id).join(',')||(c.owner||{}).id); (dup[k]=dup[k]||[]).push(c); });
  return [
    {icon:'∅', title:_L('Contraintes vides (ni nom ni expression)'), cols, items:list.filter(c=>!c.name&&!c.text).map(row)},
    {icon:'✎', title:_L('Contraintes sans expression'), tip:_L('Seul le nom porte l\'information'), cols, items:list.filter(c=>c.name&&!c.text).map(row)},
    {icon:'⚠', title:_L('Expressions citant un élément introuvable'), tip:_L('Lien de texte vers un élément supprimé'), cols, items:list.filter(c=>c.broken).map(row)},
    {icon:'↳', title:_L('Contraintes sans élément contraint explicite'), tip:_L('Rattachées seulement à leur propriétaire (constrainedElements vide) ; gardes et pré/post-conditions exclues'), cols, items:list.filter(c=>!c.on.length&&!c.role).map(row)},
    {icon:'⧉', title:_L('Contraintes en double sur un même élément'), cols, items:Object.values(dup).filter(a=>a.length>1).flat().map(row)},
  ];
}

/** Rend la sous-vue ⛓ Contraintes : liste filtrable et contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderConstraints(box){
  const st=box._ct=box._ct||{view:'list', q:'', layer:'all'};
  const {list}=capComputeConstraints();
  if(!list.length){ box.innerHTML=_L('<div class="phl-empty">Aucune contrainte dans ce modèle.</div>'); return; }
  const q=st.q.trim().toLowerCase();
  const shown=list.filter(c=>(st.layer==='all'||c.layer===st.layer)&&capXtHas(q,c.name,c.text,(c.owner||{}).name,...c.on.map(e=>e.name)));
  const header=[_L('Couche'),_L('Contrainte'),_L('Rôle'),_L('Expression'),_L('Langage'),_L('Porte sur'),_L('Possédée par')];
  const rows=shown.map(c=>[c.layer,capCx(c.name,c.id),c.role,c.text,c.lang,capCxList(c.on),c.owner?capCx(c.owner.name,c.owner.id):'']);   // export enrichi (53)
  const body=st.view==='list'?capXtTable(header, shown.map(c=>[capChainLayerBadge(c.layer), capDetLink(c.id,c.name||_L('(sans nom)'),'font-weight:600'), `<span class="ana-dim">${capEsc(c.role)}</span>`,
      capXtShort(c.text,300), `<span class="ana-dim">${capEsc(c.lang)}</span>`, capXtLinks(c.on,true), c.owner?capDetLink(c.owner.id,c.owner.name):'—']))
    :capDiagHtml(capCtChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Liste')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='list'?capXtLayerBtns(list,st.layer)+` ${capXtSearch(st.q,_L('Nom, expression, élément…'))}`:''), st.view==='list'?`${shown.length} / ${list.length}`:'', st.view==='list')+body;
  capXtBind(box, st, capRenderConstraints, ()=>capCsvExport(_L('contraintes.csv'), header, rows));
}

/* ── Panneau de détail et tableau de bord ───────────────────────── */

/** Sections supplémentaires du panneau de détail : exigences liées, propriétés, contraintes.
 * @param {string} id - Identifiant de l'élément
 * @param {Function} secTitle - Titre de section du panneau (texte, couleur)
 * @returns {string} HTML (vide si rien à montrer)
 */
function capXtDetail(id, secTitle){
  if(!cap_xmlDoc) return '';
  try{
    let h='';
    const R=capComputeRequirements(), req=R.list.find(r=>r.id===id);
    if(req){
      h+=secTitle(_L('Exigence'),'#e3b341')+_L(`<table class="ana-t ana-kv">${req.ident?`<tr><td>ID</td><td>${capEsc(req.ident)}</td></tr>`:''}
        <tr><td>Type</td><td>${capEsc(req.kind)}</td></tr>${req.text?_L(`<tr><td>Texte</td><td>${capEsc(req.text)}</td></tr>`):''}
        ${Object.entries(req.attrs).map(([k,v])=>`<tr><td>${capEsc(k)}</td><td>${capEsc(v)}</td></tr>`).join('')}
        <tr><td>Éléments liés</td><td>${capXtLinks(req.links,true)}</td></tr>${req.rels.length?_L(`<tr><td>Exigences liées</td><td>${capXtLinks(req.rels)}</td></tr>`):''}</table>`);
    }
    const rq=R.byEl[id]; if(rq&&rq.length) h+=secTitle(_L(`Exigences liées (${rq.length})`),'#e3b341')+`<div style="font-size:11.5px">${capXtLinks(rq)}</div>`;
    const pv=capComputePvmt().byEl[id];
    if(pv&&pv.length) h+=secTitle(_L(`Propriétés (${pv.length})`),'#3fb950')+`<table class="ana-t ana-kv">${pv.map(v=>`<tr><td title="${capEsc(v.domain+(v.group?' › '+v.group:''))}">${capEsc(v.prop)}</td><td>${capEsc(v.value)}${v.unit?' '+capEsc(v.unit):''}${v.dflt?_L(' <span class="ana-miss" title="Valeur par défaut, jamais saisie">○</span>'):''}</td></tr>`).join('')}</table>`;
    const ct=capComputeConstraints().byEl[id];
    if(ct&&ct.length) h+=secTitle(_L(`Contraintes (${ct.length})`),'#bc8cff')+`<table class="ana-t ana-kv">${ct.map(c=>`<tr><td>${capDetLink(c.id,c.name||_L('(sans nom)'))}</td><td>${capEsc(c.text||'—')}</td></tr>`).join('')}</table>`;
    // 🎬 Scénarios : diagramme du scénario, ou scénarios d'une capacité
    const SC=capComputeScenarios(), sc=SC.byId[id], scs=SC.list.filter(s=>s.capId===id);
    const scBtn=s=>_L(`<div style="margin:2px 0"><button class="cap-lf-btn" onclick="capScOpen('${capEsc(s.id)}')" title="Ouvrir le diagramme de séquence dans 🎬 Scénarios">🎬 ${capEsc(s.ks)}</button> ${capEsc(s.name)} <span class="ana-dim">${s.nMsg} message(s)</span></div>`);
    if(sc) h+=secTitle(_L('Diagramme de séquence'),'#58a6ff')+scBtn(sc);
    else if(scs.length) h+=secTitle(_L(`Scénarios (${scs.length})`),'#58a6ff')+scs.map(scBtn).join('');
    return h;
  }catch(e){ console.warn('Détail étendu indisponible',e); return ''; }
}

/** Ajoute au catalogue du tableau de bord les indicateurs Exigences, Propriétés, Données & interfaces, Contraintes.
 * @param {Function} add - Ajout d'un indicateur (groupe, id, libellé, nature, calcul, description)
 * @param {Function} LC - Couleur d'une couche
 */
function capXtDashCatalog(add, LC){
  const natural=cats=>({cats,order:'natural'}), secs=s=>({cats:s.map(x=>({l:x.title,v:(x.items||[]).length})).filter(x=>x.v).sort((a,b)=>b.v-a.v)});
  const RQ=()=>capComputeRequirements().list, LAY=[...CAP_ANA_LAYERS,'?'];
  add(_L('Exigences'),'rq.n',_L('Exigences — nombre'),'n',()=>({n:RQ().length, sub:_L(`dont ${RQ().filter(r=>r.links.length).length} liée(s) au modèle`)}));
  add(_L('Exigences'),'rq.cov',_L('Exigences — liées au modèle'),'pct',()=>capDashPct(RQ(),r=>r.links.length));
  add(_L('Exigences'),'rq.kind',_L('Exigences — par type'),'series',()=>({cats:capDashCount(RQ(),r=>r.kind)}));
  add(_L('Exigences'),'rq.layer',_L('Exigences — couches des éléments liés'),'series',()=>natural(LAY.map(k=>({l:k==='?'?_L('Hors couche'):k,v:RQ().filter(r=>r.links.some(e=>e.layer===k)).length,c:LC(k)})).filter(x=>x.v)),_L('Nombre d\'exigences liées à au moins un élément de la couche'));
  add(_L('Exigences'),'rq.chk',_L('Exigences — contrôles'),'series',()=>secs(capReqChecks()));
  capComputeRequirements().attrDefs.forEach(d=>add(_L('Exigences'),'rq.at.'+d,_L(`Exigences — par « ${d} »`),'series',()=>({cats:capDashCount(RQ(),r=>r.attrs[d]||_L('(non renseigné)'))})));
  const PV=()=>capComputePvmt().vals;
  add(_L('Propriétés'),'pv.n',_L('Propriétés — valeurs appliquées'),'n',()=>({n:PV().length, sub:_L(`${new Set(PV().map(v=>v.el.id)).size} élément(s)`)}));
  add(_L('Propriétés'),'pv.set',_L('Propriétés — valeurs saisies'),'pct',()=>capDashPct(PV(),v=>!v.dflt),_L('Valeurs différentes de la valeur par défaut'));
  add(_L('Propriétés'),'pv.grp',_L('Propriétés — éléments par groupe'),'series',()=>{ const m={}; PV().forEach(v=>{ const k=v.group||v.domain; (m[k]=m[k]||new Set()).add(v.el.id); }); return {cats:Object.entries(m).map(([l,s])=>({l,v:s.size})).sort((a,b)=>b.v-a.v)}; });
  add(_L('Propriétés'),'pv.chk',_L('Propriétés — contrôles'),'series',()=>secs(capPvChecks()));
  const numProps={}; capComputePvmt().vals.filter(v=>v.kind==='num').forEach(v=>numProps[v.group+' › '+v.prop]=v.unit);
  Object.entries(numProps).forEach(([k,u])=>add(_L('Propriétés'),'pv.sum.'+k,_L(`Propriétés — Σ « ${k} »${u?' ('+u+')':''}`),'n',()=>{ const ns=PV().filter(v=>v.kind==='num'&&v.num!=null&&v.group+' › '+v.prop===k);
    return {n:+ns.reduce((s,v)=>s+v.num,0).toFixed(3), sub:_L(`${ns.length} élément(s)${u?' · '+u:''}`)}; }));
  const DM=()=>capComputeDataModel();
  add(_L('Données & interfaces'),'dm.n',_L('Données — Exchange Items'),'n',()=>({n:DM().eis.length, sub:_L(`${DM().itfs.length} interface(s) · ${DM().types.filter(y=>!y.predefined).length} type(s)`)}));
  add(_L('Données & interfaces'),'dm.used',_L('Données — Exchange Items portés par un échange'),'pct',()=>capDashPct(DM().eis,e=>e.fes.length||e.ces.length));
  add(_L('Données & interfaces'),'dm.fe',_L('Données — Functional Exchanges avec Exchange Item, par couche'),'series',()=>({pct:true,order:'natural',
    cats:CAP_ANA_LAYERS.map(k=>{ const r=capDashPct(DM().fes.filter(f=>f.layer===k),f=>f.items.length); return r?{l:k,v:r.v,c:LC(k),tip:`${r.num} / ${r.den}`}:null; }).filter(Boolean)}));
  add(_L('Données & interfaces'),'dm.chk',_L('Données & interfaces — contrôles'),'series',()=>secs(capDmChecks()));
  const CT=()=>capComputeConstraints().list;
  add(_L('Contraintes'),'ct.n',_L('Contraintes — nombre'),'n',()=>({n:CT().length}));
  add(_L('Contraintes'),'ct.layer',_L('Contraintes — par couche'),'series',()=>natural(LAY.map(k=>({l:k==='?'?_L('Hors couche'):k,v:CT().filter(c=>c.layer===k).length,c:LC(k)})).filter(x=>x.v)));
  add(_L('Contraintes'),'ct.chk',_L('Contraintes — contrôles'),'series',()=>secs(capCtChecks()));
}
