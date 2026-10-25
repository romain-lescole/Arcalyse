/* ═══════════════════════════════════════════════════════════════════════════
   📚 Bibliothèques Capella (sous-vue `libs` de 🔬 Analyses)
   Un modèle peut référencer des éléments d'un autre fichier .capella (bibliothèque) : la référence
   s'écrit « platform:/resource/Projet/Fichier.capella#id » (attribut, ou enfant <… href="…"/>) et
   les bibliothèques utilisées sont déclarées par des LibraryReference (ModelInformation). Arcalyse
   ne lit qu'un fichier : ces références étaient « introuvables ». Ce module les relève par
   bibliothèque, charge les fichiers des bibliothèques (📂, ou depuis 📁 Dossier du projet) pour
   résoudre les cibles (nom, type) dans le panneau de détail et la vue, et contrôle la cohérence.
   ═══════════════════════════════════════════════════════════════════════════ */

var _capLibs=[];        // bibliothèques chargées : {name, key, doc, xmap, n}
var _capLibQueue=[];    // fichiers .capella du dossier du projet candidats (chargés s'ils sont référencés)
var _capLib={view:'libs', q:'', lib:''};   // état de la sous-vue

/** Vrai si une valeur de référence vise un autre fichier (préfixe avant « # »). @param {string} v @returns {boolean} */
function capLibIsExt(v){ return /^[^#\s]+\.(capella|melodymodeller)#/i.test(String(v||'').trim()); }

/** Décompose une référence externe. @param {string} v @returns {{prefix:string, name:string, project:string, id:string}|null} */
function capLibParse(v){
  const m=/^([^#\s]+)#(\S+)$/.exec(String(v||'').trim()); if(!m||!/\.(capella|melodymodeller)$/i.test(m[1])) return null;
  const name=m[1].split('/').pop(), pm=/platform:\/resource\/([^/]+)\//.exec(m[1]);
  return {prefix:m[1], name, project:pm?pm[1]:name.replace(/\.[^.]+$/,''), id:m[2]};
}

/** Relève les références externes et les bibliothèques déclarées du modèle (en cache dans `_capAnaCache`).
 * @returns {{refs:object[], libs:object[], declared:Set}} refs {srcId (porteur non technique), via (type du lien), attr, prefix, name, id} ; libs {key, name, project, n, declared, ids:Set}
 */
function capLibScan(){
  if(_capAnaCache.libs) return _capAnaCache.libs;
  const {xmap}=capAnaCtx(), refs=[], libs={}, declared=new Set();
  const TECH=/(Realization|Allocation|Involvement|Trace|Link|Exploitation)$/;   // élément de lien technique : la référence est rattachée à son porteur (la fonction, le composant…)
  const porteur=el=>{ let via=''; for(let e=el; e; e=e.parentElement){ const i=capXId(e); if(!i) continue; if(TECH.test(capTName(e))){ via=via||capTName(e); continue; } return {id:i, via}; } return {id:'', via}; };
  const add=(el, attr, v)=>{ const p=capLibParse(v); if(!p) return; const o=porteur(el); refs.push({srcId:o.id, via:o.via, attr:(o.via?o.via+'.':'')+attr, prefix:p.prefix, name:p.name, project:p.project, id:p.id});
    const L=libs[p.name]=libs[p.name]||{key:p.name, name:p.name, project:p.project, prefix:p.prefix, n:0, declared:false, ids:new Set()}; L.n++; L.ids.add(p.id); };
  const all=cap_xmlDoc?[...cap_xmlDoc.getElementsByTagName('*')]:[];
  all.forEach(el=>{
    if(capTName(el)==='LibraryReference'){ const p=capLibParse(el.getAttribute('library')||''); if(p){ declared.add(p.name); (libs[p.name]=libs[p.name]||{key:p.name, name:p.name, project:p.project, prefix:p.prefix, n:0, declared:true, ids:new Set()}).declared=true; } return; }
    for(const a of el.attributes){ if(a.name==='href'||a.name==='library') continue; if(a.value.includes('#')) a.value.trim().split(/\s+/).forEach(v=>add(el, a.name, v)); }
    const href=el.getAttribute('href'); if(href&&!capXId(el)) add(el.parentElement, el.tagName.replace(/^.*:/,''), href);
  });
  return _capAnaCache.libs={refs, libs:Object.values(libs).sort((a,b)=>b.n-a.n), declared};
}

/** Bibliothèque chargée correspondant à un nom de fichier. @param {string} name @returns {object|null} */
function capLibLoaded(name){ const n=String(name||'').toLowerCase(); return _capLibs.find(l=>l.name.toLowerCase()===n)||null; }

/** Résout une référence externe dans les bibliothèques chargées.
 * @param {string} v - Référence (« …/Lib.capella#id »)
 * @returns {{lib:object, el:Element}|{lib:object, el:null}|null} null si la bibliothèque n'est pas chargée
 */
function capLibResolve(v){
  const p=capLibParse(v); if(!p) return null;
  const lib=capLibLoaded(p.name)||_capLibs.find(l=>l.xmap[p.id]); if(!lib) return null;
  return {lib, el:lib.xmap[p.id]||null};
}

/** Charge un fichier .capella comme bibliothèque (remplace une bibliothèque du même nom).
 * @param {File} file - Fichier
 * @returns {Promise<object>} Bibliothèque {name, key, doc, xmap, n}
 */
async function capLibAdd(file){
  const text=await file.text(), doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error(_L('XML invalide'));
  const all=[...doc.getElementsByTagName('*')], xmap=capBuildIdMap(all);
  const lib={name:file.name, key:file.name, doc, xmap, n:all.filter(e=>capXType(e)).length};
  _capLibs=_capLibs.filter(l=>l.name.toLowerCase()!==lib.name.toLowerCase()); _capLibs.push(lib);
  Object.keys(_capAnaCache).forEach(k=>{ if(k.startsWith('dv:lib')||k.startsWith('dv:chk')||k==='sante'||k==='santeChecks') delete _capAnaCache[k]; });
  return lib;
}

/** Retire une bibliothèque chargée. @param {string} name - Nom du fichier */
function capLibRemove(name){ _capLibs=_capLibs.filter(l=>l.name!==name); Object.keys(_capAnaCache).forEach(k=>{ if(k.startsWith('dv:lib')||k.startsWith('dv:chk')||k==='sante'||k==='santeChecks') delete _capAnaCache[k]; }); }

/** Choisit des fichiers de bibliothèques (.capella) et les charge. @param {Function} [apres] - Appelée après chargement */
function capLibPick(apres){
  const inp=document.createElement('input'); inp.type='file'; inp.multiple=true; inp.accept='.capella,.melodymodeller'; inp.id='cap-lib-input'; inp.style.display='none'; document.body.appendChild(inp);
  inp.onchange=async()=>{ let ok=0; for(const f of inp.files){ try{ await capLibAdd(f); ok++; }catch(e){ capAlert(f.name+' : '+(e&&e.message||e),{level:'err'}); } } inp.remove(); if(ok) capToast(_L(`✔ ${ok} bibliothèque(s) chargée(s)`)); if(apres) apres(); };
  inp.click();
}

/** Note les fichiers .capella voisins du modèle (📁 Dossier du projet) : ceux qui sont référencés seront chargés après le modèle.
 * @param {{nom:string, lire:function():Promise<File>}[]} fichiers - Autres fichiers .capella du dossier
 */
function capLibQueue(fichiers){ _capLibQueue=fichiers||[]; }

/** Après le chargement d'un modèle : charge, parmi les fichiers du dossier du projet, les bibliothèques référencées. */
async function capLibOnModelLoad(){
  const q=_capLibQueue; _capLibQueue=[]; if(!q.length) return;
  const S=capLibScan(), wanted=new Set(S.libs.map(l=>l.name.toLowerCase()));
  let ok=0; for(const f of q){ if(!wanted.has(f.nom.toLowerCase())||capLibLoaded(f.nom)) continue; try{ await capLibAdd(await f.lire()); ok++; }catch(e){ console.warn('Bibliothèque',f.nom,e); } }
  if(ok) capToast(_L(`✔ ${ok} bibliothèque(s) du dossier chargée(s)`));
}

/** Libellé HTML d'une référence externe : 📚 bibliothèque › nom et type de l'élément s'il est résolu, sinon identifiant.
 * @param {string} v - Référence
 * @returns {string} HTML
 */
function capLibRefHtml(v){
  const p=capLibParse(v); if(!p) return capEsc(v);
  const r=capLibResolve(v), esc=capEsc;
  if(r&&r.el) return `<span class="lib-ref" title="${esc(p.prefix)}">📚 ${esc(p.name)} › <b>${esc(capXName(r.el)||'—')}</b> <span class="ana-dim">${esc(capAnaHuman(capTName(r.el)))}</span></span>`;
  if(r) return `<span class="lib-ref" title="${esc(v)}">📚 ${esc(p.name)} › <span class="ana-miss">${_L('introuvable')} ${esc(p.id.slice(0,8))}…</span></span>`;
  return `<span class="lib-ref" title="${esc(v)}">📚 ${esc(p.name)} <span class="ana-dim">(${_L('non chargée')}) ${esc(p.id.slice(0,8))}…</span></span>`;
}

/** Contrôles des bibliothèques. @returns {object[]} Sections */
function capLibChecks(){
  const S=capLibScan(), esc=capEsc;
  const libRow=l=>`<tr><td>📚 ${esc(l.name)}</td><td class="ana-dim">${esc(l.project)}</td><td>${l.n}</td></tr>`;
  const refRow=r=>{ const e=capGetElementById_(r.srcId); return `<tr><td>${e?capChainLayerBadge(e.layer)+' '+capDetLink(e.id,e.attrs.name||e.typeName,'font-weight:600'):esc(r.srcId)}</td><td class="ana-dim">${esc(r.attr)}</td><td>${capLibRefHtml(r.prefix+'#'+r.id)}</td></tr>`; };
  const colsL=[_L('Bibliothèque'),_L('Projet'),_L('Références')], colsR=[_L('Élément'),_L('Attribut'),_L('Cible')];
  const unresolved=S.refs.filter(r=>{ const x=capLibResolve(r.prefix+'#'+r.id); return x&&!x.el; }), notLoaded=S.refs.filter(r=>!capLibResolve(r.prefix+'#'+r.id));
  return [
    {icon:'📚', sev:'info', title:_L('Références vers une bibliothèque non chargée'), tip:_L('Chargez le fichier de la bibliothèque (📂, ou 📁 Dossier du projet) pour résoudre ces cibles'), cols:colsR, items:notLoaded.map(refRow)},
    {icon:'?', sev:'err', title:_L('Références introuvables dans une bibliothèque chargée'), tip:_L('Cible absente du fichier de la bibliothèque : élément supprimé ou version différente'), cols:colsR, items:unresolved.map(refRow)},
    {icon:'∅', sev:'info', title:_L('Bibliothèques déclarées sans référence'), tip:_L('LibraryReference vers une bibliothèque dont aucun élément n\'est utilisé'), cols:colsL, items:S.libs.filter(l=>l.declared&&!l.n).map(libRow)},
    {icon:'⚠', title:_L('Références vers une bibliothèque non déclarée'), tip:_L('Aucune LibraryReference pour ce fichier : dépendance non déclarée dans le projet Capella'), cols:colsL, items:S.libs.filter(l=>l.n&&!l.declared).map(libRow)}];
}

/** Sous-vue 📚 Bibliothèques : bibliothèques, références, contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderLibs(box){
  const st=_capLib, S=capLibScan(), esc=capEsc, q=st.q.trim().toLowerCase();
  if(!S.libs.length&&!_capLibs.length){ box.innerHTML=_L('<div class="phl-empty">Aucune référence vers un autre fichier .capella ni bibliothèque déclarée : ce modèle se suffit à lui-même.</div>'); return; }
  let body='', cnt='';
  if(st.view==='libs'){
    const extra=_capLibs.filter(l=>!S.libs.some(x=>x.name.toLowerCase()===l.name.toLowerCase()));
    body=_L(`<p class="ana-help">${S.refs.length} référence(s) externe(s) vers ${S.libs.length} bibliothèque(s) · ${_capLibs.length} chargée(s). Une bibliothèque chargée permet d'afficher le nom et le type des éléments visés (panneau de détail, liste des références) ; elle n'est pas enregistrée avec la page : rechargez-la, ou ouvrez le projet par 📁 Dossier du projet (dossier parent contenant les bibliothèques).</p>`)+
      capXtTable([_L('Bibliothèque'),_L('Projet'),_L('Déclarée'),_L('Références'),_L('Éléments visés'),_L('Chargée')], [...S.libs.map(l=>{ const L=capLibLoaded(l.name), res=L?[...l.ids].filter(i=>L.xmap[i]).length:null;
        return [`📚 <b>${esc(l.name)}</b><div class="ana-dim" style="font-size:10.5px">${esc(l.prefix)}</div>`, esc(l.project), l.declared?'✔':_L('<span class="ana-miss">non</span>'), String(l.n), String(l.ids.size),
          L?`✔ <span class="ana-dim">${_L(`${L.n} éléments`)}${res!=null&&res<l.ids.size?_L(`, <span class="ana-miss">${l.ids.size-res} cible(s) introuvable(s)</span>`):''}</span> <button class="cap-lf-btn" data-librm="${esc(L.name)}">✕</button>`:`<button class="cap-lf-btn" data-libpick>📂 ${_L('Charger…')}</button>`]; }),
        ...extra.map(L=>[`📚 ${esc(L.name)}`, '', '', '0', '', `✔ <span class="ana-dim">${_L(`${L.n} éléments, non référencée`)}</span> <button class="cap-lf-btn" data-librm="${esc(L.name)}">✕</button>`])]);
  } else if(st.view==='refs'){
    const shown=S.refs.filter(r=>(!st.lib||r.name===st.lib)&&(!q||(()=>{ const e=capGetElementById_(r.srcId); return capXtHas(q, e&&e.attrs.name, r.attr, r.name, r.id); })()));
    body=capXtTable([_L('Élément'),'Type',_L('Attribut'),_L('Bibliothèque'),_L('Cible')], shown.map(r=>{ const e=capGetElementById_(r.srcId);
      return [e?capChainLayerBadge(e.layer)+' '+capDetLink(e.id,e.attrs.name||e.typeName,'font-weight:600'):esc(r.srcId), `<span class="ana-dim">${e?esc(capAnaHuman(e.typeName)):''}</span>`, `<span class="ana-dim">${esc(r.attr)}</span>`, esc(r.name), capLibRefHtml(r.prefix+'#'+r.id)]; }));
    cnt=`${shown.length} / ${S.refs.length}`;
  } else body=capDiagHtml(capLibChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['libs',_L('📚 Bibliothèques')],['refs',_L('🔗 Références')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='refs'?`<span class="tsep"></span>${capXtSearch(st.q,_L('Élément, attribut, cible…'))}${S.libs.length>1?capXtSelect('lib',[['',_L('Toutes les bibliothèques')],...S.libs.map(l=>[l.name,l.name])],st.lib):''}`:'')+
    `<button class="cap-lf-btn" data-libpick title="${_L('Charger un ou plusieurs fichiers .capella de bibliothèques')}">📂 ${_L('Charger des bibliothèques…')}</button>`, cnt)+body;
  capXtBind(box, st, capRenderLibs, ()=>capCsvExport(_L('references-externes.csv'),[_L('Élément'),'Type',_L('Attribut'),_L('Bibliothèque'),_L('Cible'),_L('Nom de la cible')], S.refs.map(r=>{ const e=capGetElementById_(r.srcId), x=capLibResolve(r.prefix+'#'+r.id); return [e?capCx(e.attrs.name||e.typeName,e.id):r.srcId, e?capAnaHuman(e.typeName):'', r.attr, r.name, r.id, x&&x.el?capXName(x.el):'']; })));
  box.querySelectorAll('[data-libpick]').forEach(b=>b.onclick=()=>capLibPick(()=>capRenderLibs(box)));
  box.querySelectorAll('[data-librm]').forEach(b=>b.onclick=()=>{ capLibRemove(b.dataset.librm); capRenderLibs(box); });
}

/** Section « Références externes » du panneau de détail ('' si l'élément n'en a pas).
 * @param {string} id - Élément
 * @param {Function} secTitle - Titre de section
 * @returns {string} HTML
 */
function capLibDetail(id, secTitle){
  const refs=capLibScan().refs.filter(r=>r.srcId===id); if(!refs.length) return '';
  return secTitle(_L(`Références externes (${refs.length})`),'#d2a8ff')+`<div style="font-size:11.5px">${refs.map(r=>`<div><span class="ana-dim" style="font-family:monospace;font-size:10.5px">${capEsc(r.attr)}</span> ${capLibRefHtml(r.prefix+'#'+r.id)}</div>`).join('')}
    ${_capLibs.length?'':`<div class="ana-dim" style="margin-top:3px">${_L('Chargez la bibliothèque (🔬 Analyses › 📚 Bibliothèques) pour voir les éléments visés.')}</div>`}</div>`;
}

/** Indicateurs du tableau de bord : bibliothèques.
 * @param {Function} add - Ajout d'un indicateur
 */
function capLibDashCatalog(add){
  const G=_L('Bibliothèques');
  add(G,'lib.n',_L('Bibliothèques — bibliothèques référencées'),'n',()=>({n:capLibScan().libs.length}));
  add(G,'lib.refs',_L('Bibliothèques — références externes'),'n',()=>({n:capLibScan().refs.length}));
  add(G,'lib.by',_L('Bibliothèques — références par bibliothèque'),'series',()=>({cats:capLibScan().libs.map(l=>({l:l.name, v:l.n})).filter(c=>c.v)}));
  add(_L('Contrôles'),'chk.lib',_L('Contrôles des bibliothèques'),'series',()=>({cats:capChkFilter(capLibChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length})).filter(x=>x.v)}));
}
