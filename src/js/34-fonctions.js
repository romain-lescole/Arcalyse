/* ── 5. FONCTIONS PAR COUCHE ────────────────────────────────────── */
/** Indique si un élément XML est un composant, une entité ou un acteur (porteur d'allocations). */
function capIsCompEl(el){ return !!el&&el.nodeType===1&&/(Component|Entity|Actor)$/.test(capTName(el)||''); }
let _capPartOwner=null;
/** Chaîne des composants englobants d'un composant, de la racine (le système) au parent direct.
 * Utilise l'imbrication XML (Capella ≥ 5) puis, à défaut, les Parts (abstractType) des anciennes versions.
 * @param {Element} c - Composant
 * @param {Element[]} all - Tous les éléments du modèle (pour l'index des Parts)
 * @returns {{id:string,name:string}[]} Ancêtres, du plus haut au plus proche
 */
function capCompAncestors(c, all){
  if(!_capPartOwner||_capPartOwner._doc!==cap_xmlDoc){
    const m=new Map(); (all||[]).forEach(el=>{ if(capTName(el)==='Part'){ const t=(el.getAttribute('abstractType')||'').replace(/^.*#/,''); const o=el.parentElement; if(t&&capIsCompEl(o)&&!m.has(t)) m.set(t,o); } });
    _capPartOwner=m; m._doc=cap_xmlDoc;
  }
  const out=[], seen=new Set([c]);
  for(let x=c; x; ){
    let p=x.parentElement; while(p&&!capIsCompEl(p)&&!/Pkg$/.test(capTName(p)||'')) p=p.parentElement;
    if(!capIsCompEl(p)) p=_capPartOwner.get(capXId(x))||null;
    if(!p||seen.has(p)) break; seen.add(p); out.unshift({id:capXId(p), name:capXName(p)||'—'}); x=p;
  }
  return out;
}
/** Convertit une description Capella (HTML) en texte brut avec retours à la ligne, sans exécuter de contenu.
 * @param {string} html - Description HTML
 * @returns {string} Texte lisible
 */
function capHtmlToText(html){
  if(!html) return '';
  const pre=String(html).replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|li|div|h\d|tr)>/gi,'\n').replace(/<li[^>]*>/gi,'• ');
  const doc=new DOMParser().parseFromString(pre,'text/html'); // DOMParser n'exécute aucun script
  return (doc.body?doc.body.textContent:pre).replace(/ /g,' ').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

/** Calcule l'inventaire des fonctions de toutes les couches (activités OA, fonctions SA/LA/PA) :
 * hiérarchie et numérotation, description, allocation, ports et échanges, réalisations entre couches,
 * chaînes, capacités et états où la fonction est disponible.
 * @returns {{byId:object, list:object[], roots:object}} Fonctions indexées, liste ordonnée, racines par couche
 */
function capComputeFunctions(){
  if(_capAnaCache.fns) return _capAnaCache.fns;
  const {all,res,resList}=capAnaCtx();
  const byId={}, list=[];
  all.forEach(el=>{
    const t=capTName(el), id=capXId(el);
    if(!id||(capTraceCatOf(t)||{}).k!=='fn') return;
    const L=capArchLayerOf(el); if(!CAP_ANA_LAYERS.includes(L)) return;
    const f={id, name:capXName(el)||'—', type:t, layer:L, el, desc:capHtmlToText(el.getAttribute('description')), summary:(el.getAttribute('summary')||'').trim(),
      kind:el.getAttribute('kind')||'FUNCTION', status:'', parentId:'', children:[], ins:[], outs:[], fesIn:[], fesOut:[], alloc:[], realizes:[], realizedBy:[],
      chains:[], caps:[], states:resList(el.getAttribute('availableInStates')).map(s=>capXName(s)||capTName(s))};
    const stEl=res(el.getAttribute('status')); if(stEl) f.status=capXName(stEl);
    byId[id]=f; list.push(f);
  });
  const fnOf=el=>{ for(let p=el; p; p=p.parentElement){ const f=byId[capXId(p)]; if(f) return f; } return null; };
  const usedPorts=new Set();
  list.forEach(f=>{
    for(let p=f.el.parentElement; p; p=p.parentElement){ const q=byId[capXId(p)]; if(q){ f.parentId=q.id; q.children.push(f.id); break; } }
    for(const ch of f.el.children){ const t=capTName(ch); if(t==='FunctionInputPort') f.ins.push({id:capXId(ch),name:capXName(ch)||'—'}); else if(t==='FunctionOutputPort') f.outs.push({id:capXId(ch),name:capXName(ch)||'—'}); }
  });
  all.forEach(el=>{
    const t=capTName(el);
    if(t==='FunctionalExchange'){
      const s=res(el.getAttribute('source')), g=res(el.getAttribute('target')); if(!s||!g) return;
      usedPorts.add(capXId(s)); usedPorts.add(capXId(g));
      const fs=fnOf(s), fg=fnOf(g); const x={id:capXId(el), name:capXName(el)||'—'};
      if(fs) fs.fesOut.push({...x, other:fg?fg.id:''}); if(fg) fg.fesIn.push({...x, other:fs?fs.id:''});
    } else if(t==='ComponentFunctionalAllocation'){
      const c=res(el.getAttribute('sourceElement'))||el.parentElement, f=byId[(el.getAttribute('targetElement')||'').replace(/^.*#/,'')];
      if(c&&f) f.alloc.push({id:capXId(c), name:capXName(c)||'—', actor:capIsActorEl(c), anc:capCompAncestors(c, all)});
    } else if(/Realization$/.test(t)){
      const s=byId[(el.getAttribute('sourceElement')||'').replace(/^.*#/,'')], g=byId[(el.getAttribute('targetElement')||'').replace(/^.*#/,'')];
      if(s&&g&&s!==g){ s.realizes.push(g.id); g.realizedBy.push(s.id); }
    } else if(t==='FunctionalChainInvolvementFunction'){
      const f=byId[(el.getAttribute('involved')||'').replace(/^.*#/,'')], ch=el.parentElement;
      if(f&&ch&&!f.chains.some(c=>c.id===capXId(ch))) f.chains.push({id:capXId(ch), name:capXName(ch)||'—'});
    }
  });
  capComputeCapabilities().forEach(c=>c.fns.forEach(x=>{ const f=byId[x.id]; if(f&&!f.caps.some(y=>y.id===c.id)) f.caps.push({id:c.id,name:c.name}); }));
  // Numérotation hiérarchique par couche (ordre du document), profondeur et ports inutilisés
  const roots={}; CAP_ANA_LAYERS.forEach(k=>roots[k]=[]);
  list.forEach(f=>{ f.unused=[...f.ins,...f.outs].filter(p=>!usedPorts.has(p.id)); if(!f.parentId) roots[f.layer].push(f.id); });
  const number=(ids,prefix,depth)=>ids.forEach((id,i)=>{ const f=byId[id]; f.num=prefix+(i+1); f.depth=depth; number(f.children,f.num+'.',depth+1); });
  CAP_ANA_LAYERS.forEach(k=>number(roots[k],'',0));
  list.forEach(f=>{ if(f.num==null){ f.num='?'; f.depth=0; } }); // robustesse : identifiants dupliqués ou hiérarchie incohérente
  list.forEach(f=>{ f.leaf=!f.children.length; delete f.el; });
  const ord=list.slice().sort((a,b)=>CAP_ANA_LAYERS.indexOf(a.layer)-CAP_ANA_LAYERS.indexOf(b.layer)||a.num.localeCompare(b.num,undefined,{numeric:true}));
  return _capAnaCache.fns={byId, list:ord, roots};
}

/** Métriques d'une couche de fonctions (les pourcentages de traçabilité ne sont calculés que si la couche voisine est tracée).
 * @param {object} F - Résultat de capComputeFunctions
 * @param {string} L - Couche
 * @returns {object|null} Métriques, ou null si la couche est vide
 */
function capFnMetrics(F, L){
  const fs=F.list.filter(f=>f.layer===L); if(!fs.length) return null;
  const leaves=fs.filter(f=>f.leaf), parents=fs.filter(f=>!f.leaf);
  const i=CAP_ANA_LAYERS.indexOf(L), up=CAP_ANA_LAYERS[i-1], lo=CAP_ANA_LAYERS[i+1];
  const byL=k=>F.list.filter(f=>f.layer===k);
  const loTraced=lo&&byL(lo).some(f=>f.realizes.length), upTraced=up&&fs.some(f=>f.realizes.length);
  const depths={}; fs.forEach(f=>depths[f.depth]=(depths[f.depth]||0)+1);
  const nFe=f=>f.fesIn.length+f.fesOut.length;
  return {n:fs.length, leaves:leaves.length, maxDepth:Math.max(...fs.map(f=>f.depth)),
    avgChildren:parents.length?parents.reduce((s,f)=>s+f.children.length,0)/parents.length:0,
    withDesc:fs.filter(f=>f.desc).length, named:fs.filter(f=>f.parentId).length, verbNames:fs.filter(f=>f.parentId&&capFnNQ(f).verb).length, leavesAlloc:leaves.filter(f=>f.alloc.length).length, multiAlloc:fs.filter(f=>f.alloc.length>1).length,
    leavesFe:leaves.filter(f=>nFe(f)).length, fe:new Set(fs.flatMap(f=>f.fesOut.map(x=>x.id))).size,
    realizedDown:loTraced?leaves.filter(f=>f.realizedBy.length).length:null, realizingUp:upTraced?leaves.filter(f=>f.realizes.length).length:null,
    inChain:leaves.filter(f=>f.chains.length).length, inCap:leaves.filter(f=>f.caps.length).length, depths,
    top:fs.filter(f=>nFe(f)).sort((a,b)=>nFe(b)-nFe(a)).slice(0,5), lo, up};
}

/** Sections de contrôle qualité des fonctions (chaque règle ne s'applique que si le modèle suit la pratique concernée).
 * @param {object} F - Résultat de capComputeFunctions
 * @param {string} layer - Couche filtrée ou 'all'
 * @returns {object[]} Sections pour capDiagHtml
 */
function capFnChecks(F, layer){
  const fs=F.list.filter(f=>layer==='all'||f.layer===layer), L=capDetLink;
  const row=(f,extra)=>`<tr><td>${capChainLayerBadge(f.layer)} <span class="ana-dim">${f.num}</span> ${L(f.id,f.name)}</td><td class="ana-dim">${capEsc(extra||capAnaHuman(f.type))}</td></tr>`;
  const cols=['Fonction','Détail'];
  const layerUses=(k,pred)=>F.list.some(f=>f.layer===k&&pred(f));
  const lowerOf=k=>CAP_ANA_LAYERS[CAP_ANA_LAYERS.indexOf(k)+1];
  const dup={}; fs.forEach(f=>{ const k=f.layer+'|'+f.name.trim().toLowerCase(); (dup[k]=dup[k]||[]).push(f); });
  const todo=/\b(TODO|TBD|TBC|NOT DONE|A FAIRE|À FAIRE|FIXME)\b|\?\?/i;
  // Qualité rédactionnelle des noms
  const nq=f=>capFnNQ(f), has=(f,codes)=>nq(f).issues.filter(i=>codes.includes(i.code));
  const langCount={}; fs.filter(f=>f.parentId).forEach(f=>{ const k=f.layer; langCount[k]=langCount[k]||{FR:0,EN:0}; langCount[k][nq(f).lang]++; });
  const minority=f=>{ const c=langCount[f.layer]; if(!c||!f.parentId) return false; const l=nq(f).lang, o=l==='FR'?'EN':'FR'; return c[l]<c[o]&&c[l]/(c[l]+c[o])<0.3; };
  const nqSecs=[
    {icon:'✍', title:'Noms ne commençant pas par un verbe', tip:'Infinitif en français (« Afficher… »), forme de base en anglais (« Display… »)', cols, items:fs.filter(f=>has(f,['noverb','ing','noun']).length).map(f=>row(f,has(f,['noverb','ing','noun'])[0].label))},
    {icon:'≈', title:'Verbes peu précis en tête du nom', tip:'Gérer, traiter, effectuer, manage, handle, process…', cols, items:fs.filter(f=>has(f,['vague']).length).map(f=>row(f,has(f,['vague'])[0].label))},
    {icon:'Aa', title:'Présentation des noms', tip:'Minuscule en tête, espaces superflus, ponctuation finale', cols, items:fs.filter(f=>has(f,['case','space','punct']).length).map(f=>row(f,has(f,['case','space','punct']).map(i=>i.label).join(' · ')))},
    {icon:'↔', title:'Noms trop longs ou d\'un seul mot', cols, items:fs.filter(f=>has(f,['long','short']).length).map(f=>row(f,has(f,['long','short']).map(i=>i.label).join(' · ')))},
    {icon:'🌐', title:'Langue minoritaire dans la couche', tip:'Nom dans une autre langue que la majorité des fonctions de sa couche', cols, items:fs.filter(minority).map(f=>row(f,`Langue détectée : ${nq(f).lang}`))},
  ];
  return [
    ...nqSecs,
    {icon:'📝', title:'Fonctions sans description', cols, items:fs.filter(f=>!f.desc&&f.parentId).map(f=>row(f))},
    {icon:'✎', title:'Descriptions trop courtes ou identiques au nom', tip:'Moins de 20 caractères, ou répète le nom', cols,
      items:fs.filter(f=>f.desc&&(f.desc.length<20||f.desc.trim().toLowerCase()===f.name.trim().toLowerCase())).map(f=>row(f,`« ${f.desc.slice(0,60)} »`))},
    {icon:'⚑', title:'Marqueurs de travail en cours (TODO, TBD, NOT DONE…)', cols, items:fs.filter(f=>todo.test(f.name)||todo.test(f.desc)).map(f=>row(f,f.status||''))},
    {icon:'≡', title:'Noms en double dans une même couche', cols, items:Object.values(dup).filter(a=>a.length>1).flat().map(f=>row(f,`${dup[f.layer+'|'+f.name.trim().toLowerCase()].length} occurrences`))},
    {icon:'🧩', title:'Fonctions feuilles non allouées', tip:'Couches où des allocations existent', cols,
      items:fs.filter(f=>f.leaf&&!f.alloc.length&&layerUses(f.layer,g=>g.alloc.length)).map(f=>row(f))},
    {icon:'⧉', title:'Fonctions allouées à plusieurs composants', cols, items:fs.filter(f=>f.alloc.length>1).map(f=>row(f,f.alloc.map(a=>a.name).join(', ')))},
    {icon:'⬆', title:'Fonctions mères allouées', tip:'L\'allocation porte en principe sur les feuilles', cols, items:fs.filter(f=>!f.leaf&&f.alloc.length).map(f=>row(f,f.alloc.map(a=>a.name).join(', ')))},
    {icon:'⇄', title:'Fonctions feuilles sans aucun échange', cols, items:fs.filter(f=>f.leaf&&f.parentId&&!f.fesIn.length&&!f.fesOut.length&&layerUses(f.layer,g=>g.fesOut.length)).map(f=>row(f))},
    {icon:'⇶', title:'Échanges portés par des fonctions mères', tip:'Les échanges relient en principe des feuilles', cols, items:fs.filter(f=>!f.leaf&&(f.fesIn.length||f.fesOut.length)).map(f=>row(f,`${f.fesIn.length} entrant(s), ${f.fesOut.length} sortant(s)`))},
    {icon:'◌', title:'Ports de fonction sans échange', cols, items:fs.filter(f=>f.unused.length).map(f=>row(f,f.unused.map(p=>p.name).join(', ')))},
    {icon:'⬇', title:'Fonctions feuilles non réalisées à la couche inférieure', tip:'Seulement si la couche inférieure réalise déjà des fonctions', cols,
      items:fs.filter(f=>f.leaf&&f.parentId&&lowerOf(f.layer)&&layerUses(lowerOf(f.layer),g=>g.realizes.length)&&!f.realizedBy.length).map(f=>row(f))},
    {icon:'⬆', title:'Fonctions feuilles ne réalisant rien à la couche supérieure', tip:'Seulement si la couche réalise déjà des fonctions', cols,
      items:fs.filter(f=>f.leaf&&f.layer!=='OA'&&layerUses(f.layer,g=>g.realizes.length)&&!f.realizes.length).map(f=>row(f))},
  ];
}

/** Rend la sous-vue Fonctions : hiérarchie avec fiche détaillée, tableau, traçabilité, métriques, contrôles, dossier HTML.
 * @param {HTMLElement} box - Conteneur
 */
/** Nature de l'allocation d'une fonction.
 * @param {object} f - Fonction issue de capComputeFunctions
 * @returns {string} 'sys' (composant du système, ou entité non acteur en OA), 'act' (acteur),
 *   'mix' (système et acteur), 'none' (feuille non allouée) ou 'parent' (fonction mère sans allocation propre)
 */
function capFnAllocKind(f){
  if(!f.alloc.length) return f.leaf?'none':'parent';
  const a=f.alloc.some(x=>x.actor), s=f.alloc.some(x=>!x.actor);
  return a&&s?'mix':a?'act':'sys';
}
/** Sous-systèmes d'une fonction : chemin des composants englobants sous le système (« A › B »),
 * ou le composant lui-même s'il est directement sous le système. Vide en boîte noire (allocation
 * au système lui-même) et pour les acteurs.
 * @param {object} f - Fonction issue de capComputeFunctions
 * @returns {string[]} Chemins des sous-systèmes, sans doublon
 */
function capFnSubsystems(f){
  const s=new Set(); f.alloc.forEach(a=>{ if(a.actor||!a.anc||!a.anc.length) return; s.add(a.anc.length>1?a.anc.slice(1).map(x=>x.name).join(' › '):a.name); });
  return [...s];
}
/** Libellés, icônes et couleurs des natures d'allocation (filtre, liserés, colonne du tableau). */
const CAP_FN_AK={
  sys:{i:'🧩',l:'Système',t:'Système',c:'#3fb950',tip:'Allouées à un composant du système (en OA : à une entité non acteur)'},
  act:{i:'👤',l:'Acteurs',t:'Acteur',c:'#58a6ff',tip:'Allouées à un acteur externe'},
  none:{i:'∅',l:'Non allouées',t:'Non allouée',c:'#8b949e',tip:'Fonctions feuilles allouées à aucun composant ni acteur'},
  mix:{t:'Système + acteur',c:'#58a6ff'}, parent:{t:'— (fonction mère)',c:'var(--c-border)'}};

function capRenderFunctions(box){
  const F=capComputeFunctions(), L=capDetLink;
  const layers=CAP_ANA_LAYERS.filter(k=>F.list.some(f=>f.layer===k));
  const st=box._fn=box._fn||{view:'tree', layer:layers.includes('SA')?'SA':(layers[0]||'all'), q:'', desc:true, sel:null, open:new Set(), flt:'all', init:false};
  if(!F.list.length){ box.innerHTML='<div class="phl-empty">Aucune fonction dans ce modèle.</div>'; return; }
  if(!st.init){ F.list.filter(f=>f.depth<1).forEach(f=>st.open.add(f.id)); st.init=true; }
  if(!st.ak) st.ak=new Set(['sys','act','none']);
  const akOn=st.ak.size<3;
  /** Vrai si la fonction passe le filtre « Allocation » (une fonction mixte passe avec Système ou Acteurs). */
  const akMatch0=f=>{ if(!akOn) return true; const k=capFnAllocKind(f); return k==='mix'?(st.ak.has('sys')||st.ak.has('act')):st.ak.has(k); };
  const fnLink=(id,label)=>{ const f=F.byId[id]; return f?`<a class="ana-fn-go" data-fn="${capEsc(id)}">${capEsc(label||f.name)}</a>`:''; };
  const kindB=f=>f.kind&&f.kind!=='FUNCTION'?`<span class="ana-fn-kind">${capEsc(f.kind)}</span>`:'';
  const q=st.q.trim().toLowerCase();
  const inLayer=F.list.filter(f=>st.layer==='all'||f.layer===st.layer);
  const match=f=>!q||f.name.toLowerCase().includes(q)||f.desc.toLowerCase().includes(q);
  const esc=capEsc;
  /** Allocataires présents dans la couche : acteurs et arbre des composants (avec sous-composants), nombre de fonctions couvertes. */
  const who=(()=>{ const act=new Map(), comp=new Map(), kids=new Map(), roots=new Set();
    inLayer.forEach(f=>f.alloc.forEach(a=>{
      if(a.actor){ const o=act.get(a.id)||{id:a.id,name:a.name,layer:f.layer,fns:new Set()}; o.fns.add(f.id); act.set(a.id,o); return; }
      const chain=[...a.anc.filter(x=>!act.has(x.id)),{id:a.id,name:a.name}];
      chain.forEach((x,i)=>{ const o=comp.get(x.id)||{id:x.id,name:x.name,layer:f.layer,fns:new Set()}; o.fns.add(f.id); comp.set(x.id,o);
        if(i===0) roots.add(x.id); else { const s=kids.get(chain[i-1].id)||new Set(); s.add(x.id); kids.set(chain[i-1].id,s); } });
    }));
    return {act,comp,kids,roots}; })();
  if(st.who&&!who.act.has(st.who)&&!who.comp.has(st.who)) st.who='';
  /** Vrai si la fonction est allouée à l'allocataire choisi (ou à l'un de ses sous-composants). */
  const whoMatch=f=>!st.who||f.alloc.some(a=>a.id===st.who||a.anc.some(x=>x.id===st.who));
  const akMatch=f=>akMatch0(f)&&whoMatch(f);
  /** Liste déroulante « Allocataire » : acteurs, puis système et sous-systèmes indentés. */
  const whoSelect=()=>{
    if(!who.act.size&&!who.comp.size) return '';
    const pre=o=>st.layer==='all'?`[${o.layer}] `:'';
    const opt=(o,d,ic)=>`<option value="${esc(o.id)}"${st.who===o.id?' selected':''}>${'\u00a0\u00a0'.repeat(d)}${ic} ${esc(pre(o)+o.name)} (${o.fns.size})</option>`;
    const tree=(id,d)=>{ const o=who.comp.get(id); return opt(o,d,d?'└':'🧩')+[...(who.kids.get(id)||[])].sort((a,b)=>who.comp.get(a).name.localeCompare(who.comp.get(b).name)).map(k=>tree(k,d+1)).join(''); };
    const acts=[...who.act.values()].sort((a,b)=>a.name.localeCompare(b.name));
    return `<select id="ana-fn-who" class="phl-filter-input" style="max-width:230px${st.who?';border-color:var(--c-accent)':''}" title="Fonctions allouées à un acteur, ou au système / à un sous-système (sous-composants compris)">
      <option value="">Tous les allocataires</option>
      ${acts.length?`<optgroup label="👤 Acteurs">${acts.map(o=>opt(o,0,'👤')).join('')}</optgroup>`:''}
      ${who.comp.size?`<optgroup label="🧩 Système / sous-systèmes">${[...who.roots].map(r=>tree(r,0)).join('')}</optgroup>`:''}
    </select>${st.who?'<button class="cap-lf-btn" id="ana-fn-who-x" title="Retirer le filtre d\'allocataire">✕</button>':''}`;
  };

  /** Fiche détaillée d'une fonction (description mise en avant, contexte, échanges, traçabilité récursive). */
  function fiche(f){
    if(!f) return '<div class="ana-dim" style="padding:20px">Sélectionnez une fonction dans l\'arbre pour afficher sa fiche.</div>';
    const path=[]; for(let p=F.byId[f.parentId]; p; p=F.byId[p.parentId]) path.unshift(p);
    const chainUp=id=>{ const g=F.byId[id]; return `<li>${capChainLayerBadge(g.layer)} ${fnLink(g.id)}${g.realizes.length?`<ul>${g.realizes.map(chainUp).join('')}</ul>`:''}</li>`; };
    const chainDown=id=>{ const g=F.byId[id]; return `<li>${capChainLayerBadge(g.layer)} ${fnLink(g.id)}${g.alloc.length?` <span class="ana-dim">→ ${esc(g.alloc.map(a=>a.name).join(', '))}</span>`:''}${g.realizedBy.length?`<ul>${g.realizedBy.map(chainDown).join('')}</ul>`:''}</li>`; };
    const fe=(arr,dir)=>arr.length?arr.map(x=>`<div>${dir} ${L(x.id,x.name)} <span class="ana-dim">${dir==='←'?'de':'vers'} ${x.other?fnLink(x.other):'?'}</span></div>`).join(''):'<span class="ana-dim">—</span>';
    return `<div class="ana-fn-crumb">${capChainLayerBadge(f.layer)} ${path.map(p=>fnLink(p.id)).join(' › ')}${path.length?' ›':''}</div>
      <h3 class="ana-fn-title"><span class="ana-dim">${f.num}</span> ${esc(f.name)} ${kindB(f)} <span class="ana-dim" style="font-size:11px">${esc(capAnaHuman(f.type))}</span> ${L(f.id,'🔎')}</h3>
      ${f.status?`<div class="ana-dim">Statut : <b>${esc(f.status)}</b></div>`:''}
      <div class="ana-fn-desc${f.desc?'':' empty'}">${f.desc?esc(f.desc):'Aucune description.'}</div>
      ${f.summary?`<div class="ana-dim" style="margin:-4px 0 8px"><b>Résumé :</b> ${esc(f.summary)}</div>`:''}
      <table class="ana-t ana-kv">
        <tr><td>Sous-fonctions (${f.children.length})</td><td>${f.children.map(id=>fnLink(id)).join(' · ')||'<span class="ana-dim">— feuille</span>'}</td></tr>
        <tr><td>Allouée à</td><td>${(()=>{ const k=capFnAllocKind(f); return k==='parent'?'':`<span class="ana-ak-tag" style="--c:${CAP_FN_AK[k].c}">${CAP_FN_AK[k].t}</span> `; })()}${f.alloc.map(a=>`${a.actor?'👤 ':''}${L(a.id,a.name)}`).join(', ')||`<span class="${f.leaf?'ana-miss':'ana-dim'}">∅</span>`}</td></tr>
        <tr><td>Ports</td><td>${f.ins.length} entrée(s) · ${f.outs.length} sortie(s)${f.unused.length?` · <span class="ana-miss">sans échange : ${esc(f.unused.map(p=>p.name).join(', '))}</span>`:''}</td></tr>
        <tr><td>Échanges entrants (${f.fesIn.length})</td><td>${fe(f.fesIn,'←')}</td></tr>
        <tr><td>Échanges sortants (${f.fesOut.length})</td><td>${fe(f.fesOut,'→')}</td></tr>
        <tr><td>Chaînes</td><td>${f.chains.map(c=>L(c.id,c.name)).join(', ')||'<span class="ana-dim">—</span>'}</td></tr>
        <tr><td>Capacités</td><td>${f.caps.map(c=>L(c.id,c.name)).join(', ')||'<span class="ana-dim">—</span>'}</td></tr>
        ${f.states.length?`<tr><td>Disponible dans</td><td>${esc(f.states.join(', '))}</td></tr>`:''}
      </table>
      <div class="ana-cols">
        <div><h4>⬆ Réalise (couches supérieures)</h4>${f.realizes.length?`<ul class="ana-fn-tree">${f.realizes.map(chainUp).join('')}</ul>`:'<span class="ana-dim">—</span>'}</div>
        <div><h4>⬇ Réalisée par (couches inférieures)</h4>${f.realizedBy.length?`<ul class="ana-fn-tree">${f.realizedBy.map(chainDown).join('')}</ul>`:'<span class="ana-dim">—</span>'}</div>
      </div>`;
  }

  /** Arbre hiérarchique (recherche : correspondances + ancêtres, dépliés automatiquement). */
  function tree(){
    let keep=null;
    let hit=null;
    if(q||akOn||st.who){ keep=new Set(); hit=new Set(); inLayer.filter(f=>match(f)&&akMatch(f)).forEach(f=>{ hit.add(f.id); for(let p=f; p; p=F.byId[p.parentId]) keep.add(p.id); }); }
    if(keep&&!keep.size) return '<div class="phl-empty">Aucune fonction ne correspond aux filtres.</div>';
    const node=id=>{
      const f=F.byId[id]; if(keep&&!keep.has(id)) return '';
      const open=keep?true:st.open.has(id);
      const nFe=f.fesIn.length+f.fesOut.length;
      const badges=[
        f.alloc.length?`<span class="ana-fn-b" title="Allouée à : ${esc(f.alloc.map(a=>(a.actor?'acteur ':'')+[...a.anc.map(x=>x.name),a.name].join(' › ')).join('\n'))}">${f.alloc.some(a=>!a.actor)?'🧩':'👤'} ${esc(f.alloc.map(a=>a.name).join(', '))}</span>`:(f.leaf?'<span class="ana-fn-b warn" title="Fonction feuille allouée à aucun composant">🧩 non allouée</span>':''),
        nFe?`<span class="ana-fn-b" title="Functional Exchanges entrants / sortants">échanges ← ${f.fesIn.length} · → ${f.fesOut.length}</span>`:'',
        f.realizes.length?`<span class="ana-fn-b" title="Fonctions de la couche supérieure réalisées : ${esc(f.realizes.map(id=>F.byId[id].name).join(', '))}">⬆ réalise ${f.realizes.length}</span>`:'',
        f.realizedBy.length?`<span class="ana-fn-b" title="Fonctions de la couche inférieure qui la réalisent : ${esc(f.realizedBy.map(id=>F.byId[id].name).join(', '))}">⬇ réalisée par ${f.realizedBy.length}</span>`:'',
        !f.desc&&f.parentId?'<span class="ana-fn-b warn" title="Aucune description">sans description</span>':'',
        (()=>{ const q=capFnNQ(f); return q.issues.length?`<span class="ana-fn-b warn" title="${esc(q.issues.map(i=>i.label).join('\n'))}">nom à revoir</span>`:''; })()].join('');
      return `<li><div class="ana-fn-node ak-${capFnAllocKind(f)}${hit&&!hit.has(id)?' ana-fn-off':''}${st.sel===id?' sel':''}" data-sel="${esc(id)}">
          <span class="ana-fn-tog" data-tog="${esc(id)}">${f.leaf?'·':open?'▾':'▸'}</span><span class="ana-dim">${f.num}</span>
          <span class="ana-fn-name">${esc(f.name)}</span>${kindB(f)}${badges}</div>
        ${st.desc&&f.desc?`<div class="ana-fn-dsc">${esc(f.desc.length>400?f.desc.slice(0,400)+'…':f.desc)}</div>`:''}
        ${!f.leaf&&open?`<ul>${f.children.map(node).join('')}</ul>`:''}</li>`;
    };
    const ls=st.layer==='all'?layers:[st.layer];
    return ls.map(k=>`${st.layer==='all'?`<div class="cap-chain-lhdr" style="border-color:${capChainLayerInfo(k).color}">${capChainLayerBadge(k)}<span>${esc(capChainLayerInfo(k).label)}</span></div>`:''}<ul class="ana-fn-ul">${F.roots[k].map(node).join('')}</ul>`).join('');
  }

  /** Définition des colonnes du tableau des fonctions : libellé explicite, largeur par défaut, valeur (tri/filtre) et rendu. */
  const COLS=[
    {k:'num',   l:'N°', w:78, v:f=>f.layer+' '+f.num, h:f=>`${capChainLayerBadge(f.layer)} <span class="ana-dim">${f.num}</span>`},
    {k:'name',  l:'Fonction', w:240, v:f=>f.name, h:f=>`<span style="padding-left:${st.flat?0:f.depth*12}px">${fnLink(f.id)}</span>${f.leaf?'':` <span class="ana-dim" title="${f.children.length} sous-fonction(s)">▸${f.children.length}</span>`}`},
    {k:'type',  l:'Type', w:130, v:f=>capAnaHuman(f.type)+(f.kind!=='FUNCTION'?' · '+f.kind:''), h:f=>`<span class="ana-dim">${esc(capAnaHuman(f.type))}${f.kind!=='FUNCTION'?' · '+esc(f.kind):''}</span>`},
    {k:'nq',    l:'Qualité du nom', w:210, v:f=>{ const q=capFnNQ(f); return q.root?'':q.issues.length?q.issues.map(i=>i.label).join(' · '):'OK'; },
      h:f=>{ const q=capFnNQ(f); if(q.root) return '<span class="ana-dim">racine</span>'; return q.issues.length?`<span class="ana-miss" title="${esc(q.issues.map(i=>i.label).join('\n'))}">⚠ ${esc(q.issues[0].label)}${q.issues.length>1?` (+${q.issues.length-1})`:''}</span>`:'<span style="color:var(--c-ok,#3fb950)">✔ conforme</span>'; }},
    {k:'desc',  l:'Description', w:440, v:f=>f.desc, h:f=>f.desc?`<div class="ana-fn-dtxt${st.full?' full':''}" title="${st.full?'':esc(f.desc)}">${esc(f.desc)}</div>`:'<span class="ana-miss">∅ aucune description</span>'},
    {multi:1, k:'alloc', l:'Allouée à (composant)', w:170, v:f=>f.alloc.map(a=>a.name).join(', '), h:f=>f.alloc.length?esc(f.alloc.map(a=>a.name).join(', ')):(f.leaf?'<span class="ana-miss">∅ non allouée</span>':'')},
    {multi:1, k:'subsys', l:'Sous-système', w:150, v:f=>capFnSubsystems(f).join(', '), h:f=>`<span title="${esc(f.alloc.filter(a=>!a.actor).map(a=>[...a.anc.map(x=>x.name),a.name].join(' › ')).join('\n'))}">${esc(capFnSubsystems(f).join(', '))}</span>`},
    {k:'akind', l:'Nature de l\'allocation', w:120, v:f=>CAP_FN_AK[capFnAllocKind(f)].t, h:f=>{ const k=capFnAllocKind(f); return k==='parent'?'<span class="ana-dim">— mère</span>':`<span class="ana-ak-tag" style="--c:${CAP_FN_AK[k].c}">${CAP_FN_AK[k].t}</span>`; }},
    {k:'fe',    l:'Échanges (entrants / sortants)', w:130, v:f=>f.fesIn.length+f.fesOut.length, csv:f=>`${f.fesIn.length} entrant(s) / ${f.fesOut.length} sortant(s)`,
      h:f=>(f.fesIn.length||f.fesOut.length)?`<span title="${esc(['Entrants : '+(f.fesIn.map(x=>x.name).join(', ')||'—'),'Sortants : '+(f.fesOut.map(x=>x.name).join(', ')||'—')].join('\n'))}">← ${f.fesIn.length} entr. · → ${f.fesOut.length} sort.</span>`:'<span class="ana-dim">—</span>'},
    {multi:1, k:'up',    l:'Réalise (couche supérieure)', w:190, v:f=>f.realizes.map(id=>F.byId[id].name).join(', '), h:f=>f.realizes.map(id=>fnLink(id)).join(', ')||'<span class="ana-dim">—</span>'},
    {multi:1, k:'down',  l:'Réalisée par (couche inférieure)', w:190, v:f=>f.realizedBy.map(id=>F.byId[id].name).join(', '), h:f=>f.realizedBy.map(id=>fnLink(id)).join(', ')||'<span class="ana-dim">—</span>'},
    {multi:1, k:'chains',l:'Chaînes fonctionnelles', w:160, v:f=>f.chains.map(c=>c.name).join(', '), h:f=>`<span class="ana-dim">${esc(f.chains.map(c=>c.name).join(', '))}</span>`},
    {multi:1, k:'caps',  l:'Capacités', w:160, v:f=>f.caps.map(c=>c.name).join(', '), h:f=>`<span class="ana-dim">${esc(f.caps.map(c=>c.name).join(', '))}</span>`},
    {k:'depth', l:'Niveau', w:70, v:f=>f.depth, h:f=>String(f.depth)},
    {k:'status',l:'Statut', w:110, v:f=>f.status, h:f=>esc(f.status)},
    {multi:1, k:'states',l:'Disponible dans (états)', w:160, v:f=>f.states.join(', '), h:f=>`<span class="ana-dim">${esc(f.states.join(', '))}</span>`},
  ];
  if(!st.colW) st.colW={}; if(!st.colF) st.colF={}; if(!st.sort) st.sort={k:'num',d:1}; if(!st.hide) st.hide=new Set(['depth','status','states']);
  const hasSub=inLayer.some(f=>capFnSubsystems(f).length); // colonne « Sous-système » seulement en boîte blanche
  const visCols=()=>COLS.filter(c=>!st.hide.has(c.k)&&(c.k!=='subsys'||hasSub));
  const QF={all:()=>true, leaf:f=>f.leaf, badname:f=>capFnNQ(f).issues.length>0, nodesc:f=>!f.desc, noalloc:f=>f.leaf&&!f.alloc.length, notrace:f=>f.leaf&&!f.realizes.length&&!f.realizedBy.length};
  /** Valeurs d'une cellule pour le filtre par valeurs : liste éclatée pour les colonnes multi-valeurs, '' = vide. */
  const cellVals=(c,f)=>{ const v=c.v(f); if(c.multi){ const a=String(v).split(', ').filter(Boolean); return a.length?a:['']; } return [String(v)]; };
  if(!st.colV) st.colV={};
  /** Lignes du tableau après filtres (couche, recherche, filtre rapide, filtres de colonnes) et tri. */
  function tableRows(){
    const cf=Object.entries(st.colF).filter(([,v])=>v&&v.trim()).map(([k,v])=>[COLS.find(c=>c.k===k),v.trim().toLowerCase()]).filter(([c])=>c);
    const vf=Object.entries(st.colV||{}).filter(([,s])=>s).map(([k,s])=>[COLS.find(c=>c.k===k),s]).filter(([c])=>c);
    const rows=inLayer.filter(match).filter(akMatch).filter(QF[st.flt]||QF.all).filter(f=>cf.every(([c,v])=>String(c.v(f)).toLowerCase().includes(v)))
      .filter(f=>vf.every(([c,s])=>cellVals(c,f).some(x=>s.has(x))));
    const c=COLS.find(x=>x.k===st.sort.k)||COLS[0], d=st.sort.d;
    const cmp=c.k==='num'?(a,b)=>CAP_ANA_LAYERS.indexOf(a.layer)-CAP_ANA_LAYERS.indexOf(b.layer)||a.num.localeCompare(b.num,undefined,{numeric:true})
      :(a,b)=>{ const x=c.v(a), y=c.v(b); return typeof x==='number'?x-y:String(x).localeCompare(String(y),'fr',{numeric:true}); };
    return rows.sort((a,b)=>d*cmp(a,b));
  }
  /** Corps du tableau (re-rendu seul lors de la saisie dans un filtre de colonne, pour garder le focus). */
  const tbodyHtml=rows=>rows.slice(0,1500).map(f=>`<tr class="ak-${capFnAllocKind(f)}">${visCols().map(c=>`<td>${c.h(f)}</td>`).join('')}</tr>`).join('');
  /** Tableau des fonctions : colonnes redimensionnables, triables, filtrables et masquables. */
  function table(){
    const rows=tableRows(); box._fnRows=rows;
    const vc=visCols(), W=c=>st.colW[c.k]||c.w, total=vc.reduce((s,c)=>s+W(c),0);
    const base=inLayer.filter(match).filter(akMatch);
    st.selC=new Set();
    const nVF=Object.values(st.colV).filter(Boolean).length+Object.values(st.colF).filter(v=>v&&v.trim()).length;
    return `<div class="phl-filter-bar" style="margin-bottom:6px;flex-wrap:wrap;gap:6px"><span class="tb-grp" title="Filtres rapides">${[['all','Toutes'],['leaf','Feuilles'],['badname','Nom à revoir'],['nodesc','Sans description'],['noalloc','Feuilles non allouées'],['notrace','Feuilles non tracées']]
        .map(([k,l])=>`<button class="cap-lf-btn${st.flt===k?' active':''}" data-flt="${k}">${l} (${base.filter(QF[k]).length})</button>`).join('')}</span>
      <span class="tb-grp" title="Affichage"><span style="position:relative"><button class="cap-lf-btn" id="ana-fn-cols">⊞ Colonnes ▾</button>
        <div class="ana-colmenu" id="ana-fn-colmenu" style="display:${st.colMenu?'block':'none'}">${COLS.map(c=>`<label><input type="checkbox" data-colv="${c.k}"${st.hide.has(c.k)?'':' checked'}${c.k==='name'?' disabled':''}> ${esc(c.l)}</label>`).join('')}</div></span>
      <label class="cap-chx-opt" title="Afficher les descriptions en entier (sinon 3 lignes, texte complet au survol)"><input type="checkbox" id="ana-fn-full"${st.full?' checked':''}> Descriptions complètes</label>
      <label class="cap-chx-opt" title="Liste à plat : sans indentation hiérarchique (triez ensuite par la colonne de votre choix)"><input type="checkbox" id="ana-fn-flat"${st.flat?' checked':''}> À plat</label>
      <button class="cap-lf-btn" id="ana-fn-reset" title="Largeurs par défaut, tous les filtres de colonnes effacés, tri par numéro">↺ Réinitialiser${nVF?` (${nVF} filtre${nVF>1?'s':''})`:''}</button></span>
      <span class="tb-grp" title="Sélection de cellules : clic-glisser, Ctrl+clic, Maj+clic ; Ctrl+C pour copier"><button class="cap-lf-btn" id="ana-fn-copy" disabled title="Copier les cellules sélectionnées (collage dans Excel / Word) — aussi Ctrl+C">📋 Copier</button><span class="ana-dim" id="ana-fn-selc" style="font-size:11px">aucune sélection</span></span>
      <span class="tb-grp" title="Export"><button class="phl-export-btn" id="ana-fn-thtml" title="Tableau en HTML autonome : colonnes visibles, largeurs, filtres et tri actuels, descriptions complètes">🌐 HTML (tableau)</button></span>
      <span class="ana-fn-cnt" id="ana-fn-count" style="margin-left:auto" title="Fonctions affichées après filtres / fonctions de la couche">${rows.length===inLayer.length?`${rows.length} fonction(s)`:`<b>${rows.length}</b> / ${inLayer.length} fonction(s)`}</span></div>
      <div class="prt-wrap ana-fnt-wrap" data-fill="6"><table class="prt-t ana-fnt" style="width:${total}px;min-width:100%"><colgroup>${vc.map(c=>`<col data-k="${c.k}" style="width:${W(c)}px">`).join('')}</colgroup>
      <thead><tr>${vc.map(c=>`<th data-sort="${c.k}" title="Trier par « ${esc(c.l)} »">${esc(c.l)}${st.sort.k===c.k?(st.sort.d>0?' ▲':' ▼'):''}<span class="ana-vf${st.colV[c.k]?' on':''}" data-vf="${c.k}" title="Filtrer par valeurs (comme dans Excel)">▼</span><span class="ana-rsz" data-rsz="${c.k}" title="Glisser pour redimensionner"></span></th>`).join('')}</tr>
      <tr class="ana-frow">${vc.map(c=>`<th><input data-cf="${c.k}" placeholder="filtrer…" value="${esc(st.colF[c.k]||'')}"></th>`).join('')}</tr></thead>
      <tbody>${tbodyHtml(rows)}</tbody></table></div>${rows.length>1500?`<div class="cap-mx-hint">1500 lignes affichées sur ${rows.length}.</div>`:''}`;
  }
  /** Met à jour le compteur de cellules sélectionnées et l'état du bouton 📋 Copier. */
  function updSel(){ const n=st.selC?st.selC.size:0, b=box.querySelector('#ana-fn-copy'), s=box.querySelector('#ana-fn-selc');
    if(b) b.disabled=!n; if(s) s.textContent=n?`${n} cellule${n>1?'s':''} sélectionnée${n>1?'s':''}`:'aucune sélection'; }
  /** Copie les cellules sélectionnées dans le presse-papiers (texte tabulé : une ligne par ligne du tableau). */
  function copySel(){
    if(!st.selC||!st.selC.size) return;
    const vc=visCols(), rows=box._fnRows||[], cells=[...st.selC].map(k=>k.split(':').map(Number));
    const rs=[...new Set(cells.map(x=>x[0]))].sort((a,b)=>a-b), cs=[...new Set(cells.map(x=>x[1]))].sort((a,b)=>a-b);
    const txt=rs.map(r=>cs.map(c=>{ if(!st.selC.has(r+':'+c)) return ''; const col=vc[c], f=rows[r]; return f&&col?String((col.csv||col.v)(f)).replace(/[\t\n\r]+/g,' '):''; }).join('\t')).join('\n');
    const done=()=>{ const s=box.querySelector('#ana-fn-selc'); if(s){ s.textContent=`✔ ${st.selC.size} cellule(s) copiée(s)`; setTimeout(updSel,1500); } };
    const fb=()=>{ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); done(); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done,fb); else fb();
  }
  /** Filtre par valeurs d'une colonne, à la manière d'Excel : tri, recherche, cases à cocher avec effectifs.
   * @param {string} k - Clé de la colonne
   * @param {HTMLElement} el - Bouton ▼ de l'en-tête
   */
  function openVF(k, el){
    document.querySelector('.ana-vfdd')?.remove();
    const c=COLS.find(x=>x.k===k); if(!c) return;
    const saved=st.colV[k]; st.colV[k]=null; const rows=tableRows(); st.colV[k]=saved;
    const cnt=new Map(); rows.forEach(f=>cellVals(c,f).forEach(v=>cnt.set(v,(cnt.get(v)||0)+1)));
    const num=rows.length&&typeof c.v(rows[0])==='number';
    const vals=[...cnt.keys()].sort((a,b)=>a===''?1:b===''?-1:num?(+a)-(+b):a.localeCompare(b,'fr',{numeric:true}));
    const sel=new Set(saved?vals.filter(v=>saved.has(v)):vals); let q='';
    const dd=document.createElement('div'); dd.className='ana-vfdd';
    dd.innerHTML=`<button class="ana-vf-it" data-s="1">↑ Trier de A à Z</button><button class="ana-vf-it" data-s="-1">↓ Trier de Z à A</button>
      <button class="ana-vf-it" data-clr${saved?'':' disabled'}>✕ Effacer le filtre de « ${esc(c.l)} »</button><hr>
      <input class="phl-filter-input ana-vf-q" placeholder="🔍 Rechercher…"><div class="ana-vf-list"></div>
      <div class="ana-vf-ft"><span class="ana-dim ana-vf-n"></span><button class="cap-lf-btn" data-ok style="border-color:var(--c-accent);color:var(--c-accent)">OK</button><button class="cap-lf-btn" data-cancel>Annuler</button></div>`;
    document.body.appendChild(dd);
    const r=el.getBoundingClientRect(); dd.style.left=Math.max(4,Math.min(window.innerWidth-dd.offsetWidth-8,r.left-8))+'px'; dd.style.top=Math.min(window.innerHeight-dd.offsetHeight-8,r.bottom+4)+'px';
    const list=dd.querySelector('.ana-vf-list');
    const vis=()=>vals.filter(v=>!q||(v===''?'(vides)':v).toLowerCase().includes(q)).slice(0,2000);
    const draw=()=>{ const vs=vis(), all=vs.length&&vs.every(v=>sel.has(v));
      list.innerHTML=`<label class="ana-vf-row"><input type="checkbox" data-all${all?' checked':''}> <b>(Tout sélectionner${q?' — résultats':''})</b></label>`+
        vs.map((v,i)=>`<label class="ana-vf-row" title="${esc(v)}"><input type="checkbox" data-i="${i}"${sel.has(v)?' checked':''}> <span>${v===''?'<i class="ana-dim">(Vides)</i>':esc(v)}</span><em>${cnt.get(v)}</em></label>`).join('');
      dd.querySelector('.ana-vf-n').textContent=`${sel.size} / ${vals.length}`;
      list.querySelector('[data-all]').onchange=e=>{ vs.forEach(v=>e.target.checked?sel.add(v):sel.delete(v)); draw(); };
      list.querySelectorAll('[data-i]').forEach(cb=>cb.onchange=()=>{ const v=vs[+cb.dataset.i]; cb.checked?sel.add(v):sel.delete(v); dd.querySelector('.ana-vf-n').textContent=`${sel.size} / ${vals.length}`; }); };
    const close=()=>{ dd.remove(); document.removeEventListener('mousedown',out,true); document.removeEventListener('keydown',esc_); };
    const out=e=>{ if(!dd.contains(e.target)) close(); }, esc_=e=>{ if(e.key==='Escape') close(); };
    setTimeout(()=>{ document.addEventListener('mousedown',out,true); document.addEventListener('keydown',esc_); },0);
    dd.querySelector('.ana-vf-q').oninput=e=>{ q=e.target.value.trim().toLowerCase(); if(q){ sel.clear(); vis().forEach(v=>sel.add(v)); } draw(); };
    dd.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ st.sort={k,d:+b.dataset.s}; close(); rerender(); });
    dd.querySelector('[data-clr]').onclick=()=>{ st.colV[k]=null; close(); rerender(); };
    dd.querySelector('[data-cancel]').onclick=close;
    dd.querySelector('[data-ok]').onclick=()=>{ st.colV[k]=sel.size===vals.length?null:new Set(sel); close(); rerender(); };
    draw(); dd.querySelector('.ana-vf-q').focus();
  }
  /** Branche redimensionnement, tri, filtres de colonnes et menu des colonnes. */
  function wireTable(){
    const tbl=box.querySelector('.ana-fnt'); if(!tbl) return;
    tbl.querySelectorAll('[data-sort]').forEach(th=>th.onclick=ev=>{ if(ev.target.classList.contains('ana-rsz')||ev.target.classList.contains('ana-vf')) return; const k=th.dataset.sort; st.sort=st.sort.k===k?{k,d:-st.sort.d}:{k,d:1}; rerender(); });
    tbl.querySelectorAll('.ana-rsz').forEach(h=>h.onmousedown=ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const k=h.dataset.rsz, col=tbl.querySelector(`col[data-k="${k}"]`), x0=ev.clientX, w0=col.getBoundingClientRect().width||parseFloat(col.style.width), t0=tbl.getBoundingClientRect().width||parseFloat(tbl.style.width);
      const mv=e=>{ const w=Math.max(50,w0+e.clientX-x0); col.style.width=w+'px'; tbl.style.width=(t0+w-w0)+'px'; st.colW[k]=w; };
      const up=()=>{ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
    let deb;
    tbl.querySelectorAll('[data-cf]').forEach(inp=>inp.oninput=()=>{ st.colF[inp.dataset.cf]=inp.value; clearTimeout(deb); deb=setTimeout(()=>{
      const rows=tableRows(); box._fnRows=rows; tbl.querySelector('tbody').innerHTML=tbodyHtml(rows);
      const cnt=box.querySelector('#ana-fn-count'); if(cnt) cnt.innerHTML=rows.length===inLayer.length?`${rows.length} fonction(s)`:`<b>${rows.length}</b> / ${inLayer.length} fonction(s)`;
      st.selC=new Set(); updSel(); wireGo(tbl); },200); });
    box.querySelector('#ana-fn-cols').onclick=ev=>{ ev.stopPropagation(); st.colMenu=!st.colMenu; box.querySelector('#ana-fn-colmenu').style.display=st.colMenu?'block':'none'; };
    box.querySelectorAll('[data-colv]').forEach(cb=>cb.onchange=()=>{ if(cb.checked) st.hide.delete(cb.dataset.colv); else st.hide.add(cb.dataset.colv); rerender(); });
    box.querySelector('#ana-fn-full').onchange=e=>{ st.full=e.target.checked; rerender(); };
    box.querySelector('#ana-fn-reset').onclick=()=>{ st.colW={}; st.colF={}; st.colV={}; st.sort={k:'num',d:1}; rerender(); };
    box.querySelector('#ana-fn-flat').onchange=e=>{ st.flat=e.target.checked; rerender(); };
    tbl.querySelectorAll('[data-vf]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); openVF(b.dataset.vf,b); });
    // Sélection de cellules (clic-glisser, Ctrl+clic, Maj+clic) et copie
    const tb=tbl.querySelector('tbody'); let anchor=null, dragging=false, base0=new Set();
    const pos=td=>[[...tb.children].indexOf(td.parentElement), td.cellIndex];
    const rect=(a,b)=>{ const s=new Set(); for(let r=Math.min(a[0],b[0]);r<=Math.max(a[0],b[0]);r++) for(let c=Math.min(a[1],b[1]);c<=Math.max(a[1],b[1]);c++) s.add(r+':'+c); return s; };
    const paint=()=>{ tb.querySelectorAll('td.sel').forEach(td=>td.classList.remove('sel')); st.selC.forEach(k=>{ const [r,c]=k.split(':').map(Number); tb.children[r]?.children[c]?.classList.add('sel'); }); updSel(); };
    tb.addEventListener('mousedown',e=>{ const td=e.target.closest('td'); if(!td||e.button!==0) return;
      const mod=e.ctrlKey||e.metaKey; if(e.target.closest('a')&&!mod&&!e.shiftKey) return;
      e.preventDefault(); const p=pos(td);
      if(e.shiftKey&&anchor){ st.selC=new Set([...(mod?st.selC:[]),...rect(anchor,p)]); }
      else if(mod){ const k=p.join(':'); if(st.selC.has(k)) st.selC.delete(k); else st.selC.add(k); anchor=p; base0=new Set(st.selC); dragging=true; }
      else { anchor=p; base0=new Set(); st.selC=new Set([p.join(':')]); dragging=true; }
      paint(); });
    tb.addEventListener('mouseover',e=>{ if(!dragging) return; const td=e.target.closest('td'); if(td) { st.selC=new Set([...base0,...rect(anchor,pos(td))]); paint(); } });
    if(box._fnMU) document.removeEventListener('mouseup',box._fnMU);
    box._fnMU=()=>{ dragging=false; }; document.addEventListener('mouseup',box._fnMU);
    box.querySelector('#ana-fn-copy').onclick=()=>copySel();
    if(box._fnKey) document.removeEventListener('keydown',box._fnKey);
    box._fnKey=e=>{ if(!box.isConnected||!box.offsetParent||!st.selC||!st.selC.size||st.view!=='table') return;
      if(/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')) return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){ e.preventDefault(); copySel(); }
      else if(e.key==='Escape'){ st.selC=new Set(); paint(); } };
    document.addEventListener('keydown',box._fnKey);
    box.querySelector('#ana-fn-thtml').onclick=()=>{
      const rows=tableRows(), vc=visCols(), W=c=>st.colW[c.k]||c.w, full0=st.full; st.full=true;
      const fi=[st.layer!=='all'&&'couche '+st.layer, akOn&&'allocation : '+[...st.ak].map(k=>CAP_FN_AK[k].l).join(' + '), st.who&&'allocataire « '+((who.act.get(st.who)||who.comp.get(st.who)||{}).name||'')+' » (sous-composants compris)', st.flt!=='all'&&box.querySelector(`[data-flt="${st.flt}"]`)?.textContent.replace(/\s*\(\d+\)$/,''), st.q&&`recherche « ${st.q} »`,
        ...Object.entries(st.colF).filter(([,v])=>v&&v.trim()).map(([k,v])=>`${(COLS.find(c=>c.k===k)||{}).l} « ${v} »`),
        ...Object.entries(st.colV).filter(([,s])=>s).map(([k,s])=>`${(COLS.find(c=>c.k===k)||{}).l} ∈ {${[...s].slice(0,5).map(x=>x||'(vides)').join(', ')}${s.size>5?'…':''}}`)].filter(Boolean).join(', ');
      const html=`<div class="prt-wrap" style="max-height:none"><table class="prt-t ana-fnt" style="width:${vc.reduce((s,c)=>s+W(c),0)}px"><colgroup>${vc.map(c=>`<col style="width:${W(c)}px">`).join('')}</colgroup>
        <thead><tr>${vc.map(c=>`<th>${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${rows.map(f=>`<tr>${vc.map(c=>`<td>${c.h(f)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        .replace(/<a class="ana-fn-go"[^>]*>([^<]*)<\/a>/g,'$1');
      st.full=full0;
      capHtmlReport({title:'ƒ Fonctions — tableau', subtitle:`${rows.length} fonction(s)${fi?' · filtres : '+fi:''}`, tabs:[{key:'t',label:'Tableau',html}], filename:'fonctions-tableau.html'});
    };
  }

  /** Traçabilité fonctionnelle OA → SA → LA → PA : un chemin par ligne, descriptions optionnelles. */
  function trace(){
    const cand=F.list.filter(f=>f.leaf||f.realizes.length||f.realizedBy.length);
    const roots=cand.filter(f=>!f.realizes.length);
    const rows=[]; const walk=(f,row,seen)=>{ if(rows.length>3000) return; const r={...row, [f.layer]:[...(row[f.layer]||[]),f]};
      const kids=f.realizedBy.map(id=>F.byId[id]).filter(k=>k&&!seen.has(k.id));
      if(!kids.length){ rows.push(r); return; } kids.forEach(k=>walk(k,r,new Set([...seen,k.id]))); };
    roots.forEach(f=>walk(f,{},new Set([f.id])));
    // Chemins qui traversent la couche choisie (et correspondent à la recherche)
    const shown=rows.filter(r=>(st.layer==='all'||(r[st.layer]||[]).length)&&(!q||CAP_ANA_LAYERS.some(k=>(r[k]||[]).some(match))));
    const cols=CAP_ANA_LAYERS.filter(k=>rows.some(r=>r[k])); box._fnTrace={rows:shown, cols};
    const cell=f=>`<div>${fnLink(f.id)} <span class="ana-dim">${f.num}</span>${st.desc&&f.desc?`<div class="ana-fn-dsc">${esc(f.desc.slice(0,220))}${f.desc.length>220?'…':''}</div>`:''}</div>`;
    return `<p class="ana-help">Chaque ligne suit une fonction de sa couche la plus haute jusqu'aux fonctions qui la réalisent. ∅ = rupture de traçabilité.</p>
      <table class="ana-t"><tr>${cols.map(k=>`<th>${capChainLayerBadge(k)} ${esc(capChainLayerInfo(k).label)}</th>`).join('')}</tr>
      ${shown.slice(0,800).map(r=>`<tr>${cols.map(k=>`<td>${(r[k]||[]).map(cell).join('')||'<span class="ana-miss">∅</span>'}</td>`).join('')}</tr>`).join('')}</table>
      ${shown.length>800?`<div class="cap-mx-hint">800 lignes affichées sur ${shown.length} — export CSV pour tout voir.</div>`:''}`;
  }

  /** Indicateurs par couche sous forme de données : {label, get(m) → {v} (valeur) | {a,b} (ratio) | {na:true}}. */
  const MET_ROWS=[
    ['Fonctions',m=>({v:m.n})],['Fonctions feuilles (sans sous-fonction)',m=>({v:m.leaves})],['Profondeur maximale de la hiérarchie',m=>({v:m.maxDepth})],
    ['Sous-fonctions par fonction mère (moyenne)',m=>({v:m.avgChildren.toFixed(1)})],['Functional Exchanges',m=>({v:m.fe})],
    ['Fonctions avec description',m=>({a:m.withDesc,b:m.n})],['Noms commençant par un verbe',m=>({a:m.verbNames,b:m.named})],['Feuilles allouées à un composant',m=>({a:m.leavesAlloc,b:m.leaves})],['Feuilles reliées par au moins un échange',m=>({a:m.leavesFe,b:m.leaves})],
    ['Feuilles réalisées à la couche inférieure',m=>m.realizedDown==null?{na:true}:{a:m.realizedDown,b:m.leaves}],['Feuilles réalisant une fonction de la couche supérieure',m=>m.realizingUp==null?{na:true}:{a:m.realizingUp,b:m.leaves}],
    ['Feuilles impliquées dans une chaîne',m=>({a:m.inChain,b:m.leaves})],['Feuilles impliquées dans une capacité',m=>({a:m.inCap,b:m.leaves})],['Fonctions allouées à plusieurs composants',m=>({v:m.multiAlloc})]];
  /** Couleur d'un pourcentage (vert ≥ 90 %, orange ≥ 50 %, rouge sinon). */
  const pctColor=p=>p>=90?'#3fb950':p>=50?'#e3b341':'#f85149';
  /** Texte d'une valeur d'indicateur (pour info-bulle, CSV, image). */
  const metTxt=x=>x.na?'n/a':x.a!=null?`${x.b?Math.round(100*x.a/x.b):0} % (${x.a}/${x.b})`:String(x.v);
  /** Rendu HTML d'une valeur d'indicateur. */
  const metHtml=x=>{ if(x.na) return '<span class="ana-dim" title="La couche voisine ne contient aucun lien de réalisation">n/a</span>';
    if(x.a==null) return `<b>${x.v}</b>`; const p=x.b?Math.round(100*x.a/x.b):0;
    return `<div class="ana-cell-m"><div class="ana-bar"><i style="width:${p}%;background:${pctColor(p)}"></i></div><b>${p}%</b><span class="ana-dim">${x.a}/${x.b}</span></div>`; };

  /** Tableau comparatif des métriques par couche. Les couches repliées passent à GAUCHE de la colonne des libellés
   * (bandes étroites), les couches dépliées restent collées aux libellés. En export, seules les couches dépliées sont incluses.
   * @param {boolean} forExport - true : rendu pour un fichier (sans boutons ni couches repliées)
   * @param {boolean} onlyMain - true : uniquement le tableau des indicateurs
   */
  function metrics(forExport, onlyMain){
    if(!st.mcol) st.mcol=new Set();
    const M={}; layers.forEach(k=>M[k]=capFnMetrics(F,k));
    const colL=layers.filter(k=>!forExport&&st.mcol.has(k)), openL=layers.filter(k=>!st.mcol.has(k)||(forExport&&!onlyMain));
    const expL=forExport&&onlyMain?layers.filter(k=>!st.mcol.has(k)):openL;
    const strip=(k,tip)=>`<td class="ana-colx" title="${esc(tip)}"></td>`;
    const headOpen=(k,withLabel)=>`<th>${forExport?'':`<span class="ana-mcol" data-mcol="${k}" title="Réduire la couche ${k} (elle passe à gauche)">◂</span> `}${capChainLayerBadge(k)}${withLabel?' '+esc(capChainLayerInfo(k).label):''}</th>`;
    const headCol=k=>`<th class="ana-colx"><span class="ana-mcol" data-mcol="${k}" title="Déplier la couche ${k}">▸</span><div class="ana-colx-l">${k}</div></th>`;
    const maxD=Math.max(...layers.map(k=>M[k].maxDepth)), maxC=Math.max(...layers.flatMap(k=>Object.values(M[k].depths)));
    const main=`<table class="ana-t ana-met"><tr>${colL.map(headCol).join('')}<th>Indicateur</th>${expL.map(k=>headOpen(k,true)).join('')}</tr>
      ${MET_ROWS.map(([l,g])=>`<tr>${colL.map(k=>strip(k,k+' : '+metTxt(g(M[k])))).join('')}<td>${l}</td>${expL.map(k=>`<td>${metHtml(g(M[k]))}</td>`).join('')}</tr>`).join('')}</table>`;
    if(onlyMain) return main;
    const anyCol=colL.length>0;
    return `${forExport?'':`<div class="phl-filter-bar" style="margin-bottom:6px;flex-wrap:wrap"><span class="ana-dim">◂ dans l'en-tête : réduire une couche (elle passe à gauche, ▸ pour la déplier). Les exports ne gardent que les couches dépliées.</span>
        ${anyCol?'<button class="cap-lf-btn" id="ana-fn-mall">⇔ Tout déplier</button>':''}
        <span style="margin-left:auto;display:flex;gap:4px">
          <button class="phl-export-btn" id="ana-met-html" title="Tableau des indicateurs seul, en HTML autonome (couches dépliées)">🌐 HTML (indicateurs)</button>
          <button class="phl-export-btn" id="ana-met-png" title="Image PNG haute définition du tableau des indicateurs, pour une présentation">🖼 PNG</button>
          <button class="phl-export-btn" id="ana-met-clip" title="Copier l'image du tableau (coller dans PowerPoint, Word…)">📋 Copier l'image</button>
        </span></div>`}
      ${main}
      <p class="ana-help">n/a : la couche voisine ne contient aucun lien de réalisation, l'indicateur n'aurait pas de sens.</p>
      <h4 style="margin:14px 0 6px">Répartition des fonctions par niveau de profondeur</h4>
      <table class="ana-t ana-met"><tr>${colL.map(headCol).join('')}<th>Niveau</th>${openL.map(k=>headOpen(k,false)).join('')}</tr>
      ${[...Array(maxD+1).keys()].map(d=>`<tr>${colL.map(k=>strip(k,`${k} · niveau ${d} : ${M[k].depths[d]||0}`)).join('')}<td>${d}${d===0?' (racine)':''}</td>${openL.map(k=>{ const v=M[k].depths[d]||0;
        return `<td><div class="ana-cell-m" title="${k} · niveau ${d} : ${v} fonction(s)"><div class="ana-hbar" style="width:${Math.round(90*v/maxC)}px"></div><span>${v||''}</span></div></td>`; }).join('')}</tr>`).join('')}</table>
      <h4 style="margin:14px 0 6px">Fonctions les plus connectées (échanges entrants + sortants)</h4>
      <table class="ana-t ana-met"><tr>${colL.map(headCol).join('')}${openL.map(k=>headOpen(k,false)).join('')}</tr><tr>
      ${colL.map(k=>strip(k,k+' : '+M[k].top.map(f=>f.name).join(', '))).join('')}${openL.map(k=>`<td>${M[k].top.map(f=>`<div>${fnLink(f.id)} <span class="ana-dim">← ${f.fesIn.length} · → ${f.fesOut.length}</span></div>`).join('')||'<span class="ana-dim">—</span>'}</td>`).join('')}</tr></table>`;
  }

  /** Dessine le tableau des indicateurs (couches dépliées) sur un canvas haute définition, fond blanc, pour une présentation.
   * @returns {HTMLCanvasElement} Canvas
   */
  function metricsCanvas(){
    const L=layers.filter(k=>!(st.mcol&&st.mcol.has(k))); const M={}; L.forEach(k=>M[k]=capFnMetrics(F,k));
    const S=2, W0=380, CW=190, RH=34, TOP=92, FT='Segoe UI, Arial, sans-serif';
    const W=W0+CW*L.length+40, H=TOP+RH*(MET_ROWS.length+1)+46;
    const c=document.createElement('canvas'); c.width=W*S; c.height=H*S; const x=c.getContext('2d'); x.scale(S,S);
    x.fillStyle='#fff'; x.fillRect(0,0,W,H);
    const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||'Projet Capella';
    x.fillStyle='#111'; x.font=`700 20px ${FT}`; x.fillText('Métriques des fonctions par couche', 20, 34);
    x.fillStyle='#666'; x.font=`13px ${FT}`; x.fillText(`${project}${capCurrentFileName?' · '+capCurrentFileName:''} · ${new Date().toLocaleDateString('fr-FR')}`, 20, 56);
    // En-tête
    let y=TOP; x.fillStyle='#eef1f4'; x.fillRect(20,y-RH+8,W-40,RH);
    x.fillStyle='#444'; x.font=`700 12px ${FT}`; x.fillText('INDICATEUR', 30, y-6);
    L.forEach((k,i)=>{ const cx=20+W0+i*CW, lv=capChainLayerInfo(k); x.fillStyle=lv.color; x.fillRect(cx,y-RH+14,34,20); x.fillStyle='#fff'; x.font=`700 12px ${FT}`; x.fillText(k,cx+(34-x.measureText(k).width)/2,y-8);
      x.fillStyle='#333'; x.font=`12px ${FT}`; let t=lv.label; while(x.measureText(t).width>CW-50&&t.length>3) t=t.slice(0,-2)+'…'; x.fillText(t,cx+42,y-8); });
    MET_ROWS.forEach(([lab,g],r)=>{
      y+=RH; if(r%2){ x.fillStyle='#f7f8fa'; x.fillRect(20,y-RH+8,W-40,RH); }
      x.fillStyle='#222'; x.font=`13px ${FT}`; x.fillText(lab, 30, y-6);
      L.forEach((k,i)=>{ const cx=20+W0+i*CW, v=g(M[k]);
        if(v.na){ x.fillStyle='#999'; x.font=`italic 12px ${FT}`; x.fillText('n/a',cx,y-6); return; }
        if(v.a==null){ x.fillStyle='#111'; x.font=`700 14px ${FT}`; x.fillText(String(v.v),cx,y-6); return; }
        const p=v.b?Math.round(100*v.a/v.b):0, col=pctColor(p);
        x.fillStyle='#e6e9ed'; x.fillRect(cx,y-15,60,7); x.fillStyle=col; x.fillRect(cx,y-15,60*p/100,7);
        x.fillStyle=col; x.font=`700 13px ${FT}`; x.fillText(p+'%',cx+68,y-6);
        x.fillStyle='#888'; x.font=`11px ${FT}`; x.fillText(`${v.a}/${v.b}`,cx+110,y-6); });
      x.strokeStyle='#e1e4e8'; x.lineWidth=1; x.beginPath(); x.moveTo(20,y+8); x.lineTo(W-20,y+8); x.stroke();
    });
    x.fillStyle='#999'; x.font=`11px ${FT}`; x.fillText('n/a : couche voisine sans lien de réalisation · vert ≥ 90 %, orange ≥ 50 %, rouge < 50 %', 20, H-16);
    return c;
  }

  let body;
  if(st.view==='tree') body=`<div class="ana-fn-split" style="grid-template-columns:${st.splitW||'minmax(320px,1fr)'} 7px minmax(300px,1.1fr)"><div class="ana-fn-left" data-fill="6">${tree()}</div><div class="ana-fn-rsz" title="Glisser pour ajuster la largeur des deux panneaux (double-clic : largeurs par défaut)"></div><div class="ana-fn-right" data-fill="6">${fiche(F.byId[st.sel])}</div></div>`;
  else if(st.view==='table') body=table();
  else if(st.view==='trace') body=trace();
  else if(st.view==='metrics') body=metrics();
  else body=`<details class="cap-chain-xdet" style="margin-bottom:10px"><summary>⚙ Règles de nommage personnalisées</summary>
      <p class="ana-help">Complète les listes intégrées (≈ 1 000 verbes anglais, verbes français en -er/-ir/-re/-oir). Un mot par ligne ou séparés par des virgules. Conservées dans la 💾 Page HTML.</p>
      <div class="ana-cols"><div><h4>Verbes métier acceptés en tête</h4><textarea id="ana-nr-verbs" class="ana-nr">${esc((capNameRules.verbs||[]).join('\n'))}</textarea></div>
      <div><h4>Mots refusés en tête (faux verbes)</h4><textarea id="ana-nr-refuse" class="ana-nr">${esc((capNameRules.refuse||[]).join('\n'))}</textarea></div></div>
      <button class="cap-lf-btn" id="ana-nr-apply">✔ Appliquer</button></details>`+capDiagHtml(capFnChecks(F, st.layer));
  const shownN=(q||akOn||st.who)?inLayer.filter(f=>match(f)&&akMatch(f)).length:inLayer.length;
  box.innerHTML=`<div class="phl-filter-bar" style="flex-wrap:wrap;margin-bottom:8px;gap:6px">
      <span class="tb-grp" title="Vue">${[['tree','🌳 Hiérarchie'],['table','📋 Tableau'],['trace','⛓ Traçabilité'],['metrics','📊 Métriques'],['checks','🩺 Contrôles']].map(([k,l])=>`<button class="cap-lf-btn${st.view===k?' active':''}" data-fv="${k}">${l}</button>`).join('')}</span>
      ${st.view!=='metrics'?`<span class="tb-grp" title="Couche">${layers.map(k=>`<button class="cap-lf-btn${st.layer===k?' active':''}" data-fl="${k}">${k} (${F.list.filter(f=>f.layer===k).length})</button>`).join('')}<button class="cap-lf-btn${st.layer==='all'?' active':''}" data-fl="all">Toutes</button></span>`:''}
      ${['tree','table','trace'].includes(st.view)?`<span class="tb-grp" title="Recherche et affichage"><input id="ana-fn-q" class="phl-filter-input" placeholder="🔍 Nom ou description…" value="${esc(st.q)}" style="width:190px">
        ${['tree','trace'].includes(st.view)?`<label class="cap-chx-opt"><input type="checkbox" id="ana-fn-desc"${st.desc?' checked':''}> Descriptions</label>`:''}
        ${st.view==='tree'?'<button class="cap-lf-btn" id="ana-fn-exp" title="Tout déplier">⊞</button><button class="cap-lf-btn" id="ana-fn-col" title="Tout replier">⊟</button>':''}</span>`:''}
      ${['tree','table'].includes(st.view)?(()=>{ const base=inLayer.filter(match).filter(whoMatch), n=k=>base.filter(f=>{ const x=capFnAllocKind(f); return x===k||(x==='mix'&&k!=='none'); }).length;
        return `<span class="tb-grp ana-ak" title="Clic : afficher / masquer · double-clic : uniquement celle-ci (ou tout réafficher)"><span class="tb-grp-l">Allocation</span>${['sys','act','none'].map(k=>`<label class="ana-ak-chip${st.ak.has(k)?' on':''}" style="--c:${CAP_FN_AK[k].c}" title="${CAP_FN_AK[k].tip} — double-clic : uniquement celles-ci"><input type="checkbox" data-ak="${k}"${st.ak.has(k)?' checked':''}>${CAP_FN_AK[k].i} ${CAP_FN_AK[k].l} <b>${n(k)}</b></label>`).join('')}${whoSelect()}</span>`; })():''}
      ${st.view==='tree'?`<span class="ana-fn-cnt" title="Fonctions affichées après filtres / fonctions de la couche">${shownN===inLayer.length?`${inLayer.length} fonction(s)`:`<b>${shownN}</b> / ${inLayer.length} fonction(s)`}</span>`:''}
      <span class="tb-grp" style="margin-left:auto" title="Exports"><button class="phl-export-btn" id="ana-fn-csv">⬇ CSV</button>
      <button class="phl-export-btn" id="ana-fn-html" title="Dossier fonctionnel HTML : une section numérotée par fonction (description, allocation, échanges, traçabilité), un onglet par couche, plus métriques et contrôles">📄 Dossier fonctionnel</button></span>
    </div>${body}`;
  capFillHeight(box);
  // Curseur entre l'arbre et la fiche
  box.querySelector('.ana-fn-rsz')?.addEventListener('mousedown',ev=>{
    ev.preventDefault(); const split=box.querySelector('.ana-fn-split'), left=box.querySelector('.ana-fn-left');
    const x0=ev.clientX, w0=left.getBoundingClientRect().width, max=split.getBoundingClientRect().width-300;
    document.body.style.cursor='col-resize';
    const mv=e=>{ const w=Math.max(220,Math.min(max,w0+e.clientX-x0)); st.splitW=w+'px'; split.style.gridTemplateColumns=`${w}px 7px minmax(300px,1.1fr)`; };
    const up=()=>{ document.body.style.cursor=''; document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
  box.querySelector('.ana-fn-rsz')?.addEventListener('dblclick',()=>{ st.splitW=null; rerender(); });
  // Interactions
  const rerender=()=>capRenderFunctions(box);
  box.querySelectorAll('[data-fv]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.fv; rerender(); });
  box.querySelectorAll('[data-fl]').forEach(b=>b.onclick=()=>{ st.layer=b.dataset.fl; rerender(); });
  box.querySelectorAll('[data-flt]').forEach(b=>b.onclick=()=>{ st.flt=b.dataset.flt; rerender(); });
  box.querySelector('#ana-fn-who')?.addEventListener('change',e=>{ st.who=e.target.value;
    if(st.who) st.ak.add(who.act.has(st.who)?'act':'sys'); // la nature correspondante reste visible
    rerender(); });
  box.querySelector('#ana-fn-who-x')?.addEventListener('click',()=>{ st.who=''; rerender(); });
  box.querySelectorAll('[data-ak]').forEach(cb=>{
    cb.onchange=()=>{ if(cb.checked) st.ak.add(cb.dataset.ak); else st.ak.delete(cb.dataset.ak); rerender(); };
    cb.parentElement.ondblclick=ev=>{ ev.preventDefault(); const k=cb.dataset.ak; st.ak=(st.ak.size===1&&st.ak.has(k))?new Set(['sys','act','none']):new Set([k]); rerender(); };
  });
  box.querySelector('#ana-fn-desc')?.addEventListener('change',e=>{ st.desc=e.target.checked; rerender(); });
  box.querySelector('#ana-fn-exp')?.addEventListener('click',()=>{ inLayer.forEach(f=>st.open.add(f.id)); rerender(); });
  box.querySelector('#ana-fn-col')?.addEventListener('click',()=>{ st.open.clear(); rerender(); });
  let deb; box.querySelector('#ana-fn-q')?.addEventListener('input',e=>{ st.q=e.target.value; clearTimeout(deb); deb=setTimeout(()=>{ const p=e.target.selectionStart; rerender(); const i=box.querySelector('#ana-fn-q'); i.focus(); i.setSelectionRange(p,p); },250); });
  box.querySelectorAll('[data-tog]').forEach(t=>t.onclick=ev=>{ ev.stopPropagation(); const id=t.dataset.tog; if(st.open.has(id)) st.open.delete(id); else st.open.add(id); rerender(); });
  box.querySelectorAll('[data-sel]').forEach(n=>n.onclick=()=>{ st.sel=n.dataset.sel; rerender(); });
  /** Navigation interne vers une fonction (bascule de couche, dépliage des ancêtres, affichage de la fiche). */
  function wireGo(root){ root.querySelectorAll('.ana-fn-go').forEach(a=>a.onclick=ev=>{ ev.preventDefault(); ev.stopPropagation(); if((ev.ctrlKey||ev.metaKey||ev.shiftKey)&&a.closest('.ana-fnt')) return; const f=F.byId[a.dataset.fn]; if(!f) return;
    st.sel=f.id; st.view='tree'; if(st.layer!=='all') st.layer=f.layer; st.q='';
    for(let p=F.byId[f.parentId]; p; p=F.byId[p.parentId]) st.open.add(p.id);
    rerender(); box.querySelector('.ana-fn-node.sel')?.scrollIntoView({block:'center'}); }); }
  wireGo(box); wireTable();
  box.querySelector('#ana-fn-mall')?.addEventListener('click',()=>{ st.mcol.clear(); rerender(); });
  box.querySelector('#ana-nr-apply')?.addEventListener('click',()=>{
    const list=id=>box.querySelector(id).value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
    capSaveNameRules({verbs:list('#ana-nr-verbs'), refuse:list('#ana-nr-refuse')}); rerender(); });
  box.querySelector('#ana-met-html')?.addEventListener('click',()=>{
    const kept=layers.filter(k=>!st.mcol.has(k));
    capHtmlReport({title:'📊 Métriques des fonctions', subtitle:`couches : ${kept.join(', ')}`, tabs:[{key:'m',label:'Indicateurs',
      html:metrics(true,true)+'<p class="ana-help" style="margin-top:8px">n/a : la couche voisine ne contient aucun lien de réalisation · vert ≥ 90 %, orange ≥ 50 %, rouge &lt; 50 %.</p>'}], filename:'fonctions-metriques.html'}); });
  box.querySelector('#ana-met-png')?.addEventListener('click',()=>metricsCanvas().toBlob(b=>capDownloadBlob(b,'fonctions-metriques.png'),'image/png'));
  box.querySelector('#ana-met-clip')?.addEventListener('click',()=>metricsCanvas().toBlob(async b=>{
    const btn=box.querySelector('#ana-met-clip');
    try{ await navigator.clipboard.write([new ClipboardItem({'image/png':b})]); btn.textContent='✔ Image copiée'; }
    catch(e){ btn.textContent='⚠ Copie refusée — utilisez PNG'; }
    setTimeout(()=>{ btn.textContent='📋 Copier l\'image'; },2500); },'image/png'));
  box.querySelectorAll('[data-mcol]').forEach(b=>b.onclick=()=>{ const k=b.dataset.mcol; if(st.mcol.has(k)) st.mcol.delete(k); else st.mcol.add(k); rerender(); });
  box.querySelector('#ana-fn-csv').onclick=()=>{
    if(st.view==='trace'&&box._fnTrace){ const {rows,cols}=box._fnTrace;
      capCsvDownload('fonctions-tracabilite.csv',cols,rows.map(r=>cols.map(k=>(r[k]||[]).map(f=>f.num+' '+f.name).join(' | ')))); return; }
    if(st.view==='checks'){ const rows=[]; capFnChecks(F,st.layer).forEach(sec=>sec.items.forEach(h=>{ const tr=document.createElement('tr'); tr.innerHTML=h.replace(/^<tr>|<\/tr>$/g,''); rows.push([sec.title,...[...tr.children].map(td=>td.textContent.trim())]); }));
      capCsvDownload('fonctions-controles.csv',['Contrôle','Fonction','Détail'],rows); return; }
    if(st.view==='table'){ const vc=visCols(); capCsvDownload('fonctions-tableau.csv',vc.map(c=>c.l),(box._fnRows||[]).map(f=>vc.map(c=>(c.csv||c.v)(f)))); return; }
    const n=ids=>ids.map(id=>F.byId[id]?F.byId[id].name:'').join(', ');
    capCsvDownload('fonctions.csv',['Couche','N°','Fonction','Type','Kind','Profondeur','Feuille','Parent','Sous-fonctions','Allouée à','Nature de l\'allocation','Échanges entrants','Échanges sortants','Réalise','Réalisée par','Chaînes','Capacités','États','Statut','Description'],
      inLayer.filter(f=>st.view!=='tree'||akMatch(f)).map(f=>[f.layer,f.num,f.name,capAnaHuman(f.type),f.kind,f.depth,f.leaf?'oui':'non',F.byId[f.parentId]?F.byId[f.parentId].name:'',f.children.length,f.alloc.map(a=>a.name).join(', '),CAP_FN_AK[capFnAllocKind(f)].t,
        f.fesIn.map(x=>x.name).join(', '),f.fesOut.map(x=>x.name).join(', '),n(f.realizes),n(f.realizedBy),f.chains.map(c=>c.name).join(', '),f.caps.map(c=>c.name).join(', '),f.states.join(', '),f.status,f.desc]));
  };
  box.querySelector('#ana-fn-html').onclick=()=>capFnDossierHtml(F, metrics(true,false));
}

/** Dossier fonctionnel HTML autonome : un onglet par couche (sections numérotées et indentées : description,
 * allocation, échanges, réalisations, chaînes, capacités), puis métriques et contrôles.
 * @param {object} F - Résultat de capComputeFunctions
 * @param {string} metricsHtml - HTML des métriques (déjà calculé par la vue)
 */
function capFnDossierHtml(F, metricsHtml){
  const esc=capEsc, name=id=>F.byId[id]?`${F.byId[id].layer} ${F.byId[id].num} ${F.byId[id].name}`:'';
  const layers=CAP_ANA_LAYERS.filter(k=>F.list.some(f=>f.layer===k));
  const sec=f=>`<div class="ana-fd" style="margin-left:${f.depth*18}px">
    <div class="ana-fd-h"><span class="ana-dim">${f.num}</span> <b>${esc(f.name)}</b> <span class="ana-dim">${esc(capAnaHuman(f.type))}${f.kind!=='FUNCTION'?' · '+esc(f.kind):''}${f.leaf?'':' · '+f.children.length+' sous-fonction(s)'}</span></div>
    ${f.desc?`<div class="ana-fn-desc">${esc(f.desc)}</div>`:'<div class="ana-fn-desc empty">Aucune description.</div>'}
    <div class="ana-fd-m">${[
      f.alloc.length&&`<b>Allouée à</b> ${esc(f.alloc.map(a=>a.name).join(', '))}`,
      f.fesIn.length&&`<b>Entrées</b> ${esc(f.fesIn.map(x=>x.name+(x.other&&F.byId[x.other]?' ← '+F.byId[x.other].name:'')).join(' ; '))}`,
      f.fesOut.length&&`<b>Sorties</b> ${esc(f.fesOut.map(x=>x.name+(x.other&&F.byId[x.other]?' → '+F.byId[x.other].name:'')).join(' ; '))}`,
      f.realizes.length&&`<b>Réalise</b> ${esc(f.realizes.map(name).join(' ; '))}`,
      f.realizedBy.length&&`<b>Réalisée par</b> ${esc(f.realizedBy.map(name).join(' ; '))}`,
      f.chains.length&&`<b>Chaînes</b> ${esc(f.chains.map(c=>c.name).join(', '))}`,
      f.caps.length&&`<b>Capacités</b> ${esc(f.caps.map(c=>c.name).join(', '))}`,
      f.states.length&&`<b>Disponible dans</b> ${esc(f.states.join(', '))}`].filter(Boolean).join('<br>')}</div></div>`;
  const tabs=layers.map(k=>({key:k, label:`${k} — ${capChainLayerInfo(k).label}`, html:F.list.filter(f=>f.layer===k).map(sec).join('')}));
  tabs.push({key:'met',label:'📊 Métriques',html:metricsHtml.replace(/<a class="ana-fn-go"[^>]*>([^<]*)<\/a>/g,'$1')});
  tabs.push({key:'chk',label:'🩺 Contrôles',html:capDiagHtml(capFnChecks(F,'all'))});
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||'Capella';
  capHtmlReport({title:'ƒ Dossier fonctionnel', subtitle:`${F.list.length} fonctions`, tabs, active:layers.includes('SA')?'SA':layers[0], filename:`${capSafeFileName(project)} - dossier fonctionnel.html`});
}

/** Ajuste la hauteur des éléments marqués data-fill pour qu'ils occupent la fenêtre jusqu'en bas.
 * @param {HTMLElement} [root] - Conteneur à traiter (document par défaut)
 */
function capFillHeight(root){
  const els=[...(root||document).querySelectorAll('[data-fill]')].filter(el=>{ const r=el.getBoundingClientRect(); return r.width||r.height; });
  els.forEach(el=>{ const r=el.getBoundingClientRect(); el.style.maxHeight='none'; el.style.height=Math.max(220, window.innerHeight-r.top-(+el.dataset.fill||6))+'px'; });
  // Supprime le double défilement : si le conteneur défilant déborde encore, on retire l'excédent
  els.forEach(el=>{ let p=el.parentElement; while(p&&!/(auto|scroll)/.test(getComputedStyle(p).overflowY)) p=p.parentElement;
    if(p){ const over=p.scrollHeight-p.clientHeight; if(over>0) el.style.height=Math.max(220,parseFloat(el.style.height)-over)+'px'; } });
}
window.addEventListener('resize',()=>capFillHeight());

/** Point d'entrée de la vue 🔬 Analyses : barre des sous-vues et routage. */
/** Vue « ƒ Fonctions » (menu principal, au même niveau que 🔬 Analyses) : hiérarchie, tableau,
 * traçabilité, métriques, contrôles et dossier (↻ Recalculer de 🔬 Analyses vide aussi son cache).
 */
function capRenderFunctionsView(){
  const c=document.getElementById('cap-view-functions'); if(!c) return;
  if(!c._built){
    c.innerHTML='<div data-hold="fns"></div>';
    c._built=true;
  }
  capRenderFunctions(c.firstElementChild);
}

function capRenderAnalyses(){
  const c=document.getElementById('cap-view-analyses'); if(!c) return;
  const SUBS=[['trace','🧬 Traçabilité inter-couches'],['caps','🎯 Capacités & missions'],['states','🔁 Modes & états'],['diff','⚖ Comparaison de versions'],['reqs','📑 Exigences'],['pvmt','🏷 Propriétés'],['data','🗃 Données & interfaces'],['cts','⛓ Contraintes']];
  if(!c._built){
    c.innerHTML=`<div class="phl-toggle-bar">${SUBS.map(([k,l])=>`<button class="phl-toggle-btn" data-an="${k}">${l}</button>`).join('')}
      <button class="phl-export-btn" id="ana-recalc" style="margin-left:auto" title="Vider les résultats et recalculer l'analyse affichée">↻ Recalculer</button></div><div id="ana-box"></div>`;
    c.querySelectorAll('[data-an]').forEach(b=>b.onclick=()=>{ capAnaSub=b.dataset.an; capRenderAnalyses(); });
    c.querySelector('#ana-recalc').onclick=()=>{
      // Vide les résultats en mémoire et relance la sous-vue affichée
      _capAnaCache={}; _capPortsCache=null;
      c.querySelectorAll('[data-hold]').forEach(h=>{ h.innerHTML=''; ['_fn','_tr','_cp','_sm','_rq','_pv','_dm','_ct'].forEach(k=>delete h[k]); });
      capRenderAnalyses();
    };
    c._built=true;
  }
  c.querySelectorAll('[data-an]').forEach(b=>b.classList.toggle('active',b.dataset.an===capAnaSub));
  const box=c.querySelector('#ana-box');
  const R={trace:capRenderTrace, caps:capRenderCapabilities, states:capRenderStates, diff:capRenderDiff, reqs:capRenderRequirements, pvmt:capRenderPvmt, data:capRenderDataModel, cts:capRenderConstraints}[capAnaSub];
  const holder=box.querySelector(`[data-hold="${capAnaSub}"]`)||(()=>{ const d=document.createElement('div'); d.dataset.hold=capAnaSub; box.appendChild(d); return d; })();
  box.querySelectorAll('[data-hold]').forEach(h=>h.style.display=h===holder?'':'none');
  R(holder);
}