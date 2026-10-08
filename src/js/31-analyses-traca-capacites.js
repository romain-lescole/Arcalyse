/* ═══════════════════════════════════════════════════════════════════
   VUE 🔬 ANALYSES — Traçabilité inter-couches · Capacités & missions ·
   Modes & états · Comparaison de versions. Calculs génériques : aucune
   hypothèse sur le contenu d'un modèle particulier.
═══════════════════════════════════════════════════════════════════ */
let capAnaSub='trace';           // sous-vue active : trace | caps | states | diff | reqs | pvmt | data | cts (onglet ƒ Fonctions : vue à part « functions »)
var _capAnaCache={};             // caches de calcul (var : remis à zéro au chargement d'un modèle)
const CAP_ANA_LAYERS=['OA','SA','LA','PA','EPBS'];
/** Catégories d'éléments pour la traçabilité, reconnues par le nom de type (toutes versions de Capella). */
const CAP_TRACE_CATS=[
  {k:'fn',   label:'Fonctions / activités', test:t=>/(Function|Activity)$/.test(t)},
  {k:'comp', label:'Composants / acteurs',  test:t=>/(Component|Entity|Actor|ConfigurationItem)$/.test(t)},
  {k:'fe',   label:'Functional Exchanges',  test:t=>t==='FunctionalExchange'||t==='Interaction'},
  {k:'ce',   label:'Component Exchanges',   test:t=>t==='ComponentExchange'||t==='CommunicationMean'},
  {k:'pl',   label:'Physical Links',        test:t=>t==='PhysicalLink'},
  {k:'port', label:'Ports',                 test:t=>/Port$/.test(t)},
  {k:'cap',  label:'Capacités / missions',  test:t=>/(Capability|CapabilityRealization|Mission)$/.test(t)},
  {k:'chain',label:'Chaînes / processus',   test:t=>t==='FunctionalChain'||t==='OperationalProcess'||t==='PhysicalPath'},
  {k:'scen', label:'Scénarios',             test:t=>t==='Scenario'},
  {k:'state',label:'États, modes, transitions', test:t=>/(State|Mode)$/.test(t)||t==='StateTransition'},
  {k:'data', label:'Données / Exchange Items', test:t=>/^(Class|ExchangeItem|Enumeration|DataType|NumericType|StringType|BooleanType|PhysicalQuantity|Collection|Union)$/.test(t)},
];
/** Catégorie de traçabilité d'un type Capella (ou null).
 * @param {string} t - Nom de type
 * @returns {object|null} Catégorie de CAP_TRACE_CATS
 */
function capTraceCatOf(t){ if(!t||/Pkg$|Involvement|Allocation|Exploitation|Include$|Extend$|Generalization$/.test(t)||(/Realization$/.test(t)&&t!=='CapabilityRealization')) return null; return CAP_TRACE_CATS.find(c=>c.test(t))||null; }

/** Lit le contexte XML commun (tous les éléments, index des id, résolution de références) avec cache.
 * @returns {{all:Element[], xmap:object, rid:Function, res:Function, resList:Function}} Contexte
 */
function capAnaCtx(){
  if(_capAnaCache.ctx) return _capAnaCache.ctx;
  const all=cap_xmlDoc?[...cap_xmlDoc.getElementsByTagName('*')]:[];
  const xmap=capBuildIdMap(all);
  const rid=r=>(r||'').trim().replace(/^.*#/,'');
  const res=r=>{ const k=rid(r); return k?xmap[k]||null:null; };
  const resList=v=>(v||'').trim().split(/\s+/).filter(Boolean).map(res).filter(Boolean);
  return _capAnaCache.ctx={all, xmap, rid, res, resList};
}
/** Description courte d'un élément XML pour l'affichage (id, nom, type, couche). */
function capAnaEl(el){ return el?{id:capXId(el), name:capXName(el)||'—', type:capTName(el), layer:capArchLayerOf(el)}:null; }
/** Libellé lisible d'un type (Human Type si connu). */
function capAnaHuman(t){ return (CAP_HUMAN_NAMES[t]||{}).h||t; }

/* ── 1. TRAÇABILITÉ INTER-COUCHES ───────────────────────────────── */
/** Calcule les liens de réalisation (tous les types *Realization à source/cible, optionnellement les TransfoLink)
 * et l'ensemble des éléments traçables par catégorie et par couche.
 * @param {boolean} withTransfo - Inclure les TransfoLink (liens de transition automatique)
 * @param {boolean} leafOnly - Ne garder que les fonctions feuilles
 * @returns {{links:object[], els:object[], up:object, down:object}} Données de traçabilité
 */
function capComputeTrace(withTransfo, leafOnly){
  const key='trace'+(+withTransfo)+(+leafOnly);
  if(_capAnaCache[key]) return _capAnaCache[key];
  const {all,res}=capAnaCtx();
  const links=[];
  all.forEach(el=>{
    const t=capTName(el);
    if(!(/Realization$/.test(t)||(withTransfo&&t==='TransfoLink'))) return;
    const s=res(el.getAttribute('sourceElement')), g=res(el.getAttribute('targetElement'));
    if(!s||!g) return;
    const S=capAnaEl(s), G=capAnaEl(g);
    if(/(Analysis|Architecture)$/.test(S.type)) return; // liens entre architectures : sans intérêt ici
    links.push({id:capXId(el), type:t, src:S, tgt:G});
  });
  // Éléments traçables (fonctions feuilles si demandé)
  const isLeafFn=el=>![...el.children].some(c=>/(Function|Activity)$/.test(capTName(c)));
  const els=[];
  all.forEach(el=>{
    const t=capTName(el), c=capTraceCatOf(t); if(!c||!capXId(el)) return;
    if(c.k==='fn'&&leafOnly&&!isLeafFn(el)) return;
    const L=capArchLayerOf(el); if(!CAP_ANA_LAYERS.includes(L)) return;
    els.push({...capAnaEl(el), cat:c.k});
  });
  const up={}, down={}; // id → liens où l'élément est réalisé (up) / réalise (down)
  links.forEach(l=>{ (up[l.tgt.id]=up[l.tgt.id]||[]).push(l); (down[l.src.id]=down[l.src.id]||[]).push(l); });
  return _capAnaCache[key]={links, els, up, down};
}

/** Tableau de couverture : pour chaque catégorie et chaque passage de couche (OA→SA, SA→LA, LA→PA, PA→EPBS),
 * éléments du haut réalisés par le bas, et éléments du bas qui réalisent le haut.
 * @param {object} d - Résultat de capComputeTrace
 * @returns {object[]} Cellules {cat, hi, lo, upAll, upOk, loAll, loOk}
 */
function capTraceCoverage(d){
  const cells=[];
  CAP_TRACE_CATS.forEach(c=>{
    for(let i=0;i<CAP_ANA_LAYERS.length-1;i++){
      const hi=CAP_ANA_LAYERS[i], lo=CAP_ANA_LAYERS[i+1];
      // PA→EPBS : les éléments de configuration réalisent des composants ET des liens physiques
      const upAll=d.els.filter(e=>e.cat===c.k&&e.layer===hi);
      const loAll=d.els.filter(e=>e.layer===lo&&(e.cat===c.k||(hi==='PA'&&e.type==='ConfigurationItem'&&c.k==='pl')));
      const upOk=upAll.filter(e=>(d.up[e.id]||[]).some(l=>l.src.layer===lo));
      const loOk=loAll.filter(e=>(d.down[e.id]||[]).some(l=>l.tgt.layer===hi&&capTraceCatOf(l.tgt.type)?.k===c.k));
      const used=(upAll.length&&loAll.length)&&(upOk.length||loOk.length);
      cells.push({cat:c.k, hi, lo, upAll, upOk, loAll, loOk, used});
    }
  });
  return cells;
}

/** Chemins de traçabilité descendants d'une catégorie : une ligne par chemin OA → … → EPBS
 * (départ : éléments qui ne réalisent rien au-dessus).
 * @param {object} d - Résultat de capComputeTrace
 * @param {string} cat - Clé de catégorie
 * @param {number} max - Nombre maximum de lignes
 * @returns {object[]} Lignes {OA:[el], SA:[el], …}
 */
function capTracePaths(d, cat, max){
  const byId={}; d.els.forEach(e=>byId[e.id]=e);
  const inCat=d.els.filter(e=>e.cat===cat);
  const roots=inCat.filter(e=>!(d.down[e.id]||[]).some(l=>byId[l.tgt.id]&&CAP_ANA_LAYERS.indexOf(l.tgt.layer)<CAP_ANA_LAYERS.indexOf(e.layer)));
  const rows=[];
  /** Parcours en profondeur vers les couches inférieures. */
  const walk=(e,row,seen)=>{
    if(rows.length>=max) return;
    const r={...row}; (r[e.layer]=r[e.layer]||[]).push(e);
    const kids=(d.up[e.id]||[]).map(l=>byId[l.src.id]||l.src).filter(k=>!seen.has(k.id)&&CAP_ANA_LAYERS.indexOf(k.layer)>CAP_ANA_LAYERS.indexOf(e.layer));
    if(!kids.length){ rows.push(r); return; }
    kids.forEach(k=>walk(k,r,new Set([...seen,k.id])));
  };
  roots.sort((a,b)=>CAP_ANA_LAYERS.indexOf(a.layer)-CAP_ANA_LAYERS.indexOf(b.layer)||a.name.localeCompare(b.name,'fr'))
       .forEach(e=>walk(e,{},new Set([e.id])));
  return rows;
}

/** Rend la sous-vue Traçabilité : couverture par catégorie × couche, chemins de traçabilité, liste des liens.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderTrace(box){
  const st=box._tr=box._tr||{view:'cov', transfo:false, leaf:true, cat:'fn', q:'', sel:null};
  const d=capComputeTrace(st.transfo, st.leaf);
  const L=capDetLink;
  const catLabel=k=>(CAP_TRACE_CATS.find(c=>c.k===k)||{}).label||k;
  const pct=(a,b)=>b?Math.round(100*a/b):0;
  const bar=(a,b)=>{ const p=pct(a,b), col=p>=90?'#3fb950':p>=50?'#e3b341':'#f85149';
    return `<div class="ana-bar"><i style="width:${p}%;background:${col}"></i></div><span class="ana-pct" style="color:${col}">${p}%</span> <span class="ana-dim">${a}/${b}</span>`; };
  let body='';
  if(st.view==='cov'){
    const cells=capTraceCoverage(d);
    const pairs=CAP_ANA_LAYERS.slice(0,-1).map((h,i)=>[h,CAP_ANA_LAYERS[i+1]]);
    const cats=CAP_TRACE_CATS.filter(c=>cells.some(x=>x.cat===c.k&&x.used));
    body=`<p class="ana-help">Pour chaque passage de couche : <b>▼ réalisés</b> = éléments de la couche haute réalisés par au moins un élément de la couche basse ; <b>▲ réalisants</b> = éléments de la couche basse qui réalisent un élément de la couche haute. Cliquez une cellule pour lister les éléments non tracés.</p>
    ${cats.length?`<table class="ana-t ana-cov"><tr><th>Catégorie</th>${pairs.map(([h,l])=>`<th>${capChainLayerBadge(h)} → ${capChainLayerBadge(l)}</th>`).join('')}</tr>
    ${cats.map(c=>`<tr><td><b>${capEsc(c.label)}</b></td>${pairs.map(([h,l])=>{ const x=cells.find(y=>y.cat===c.k&&y.hi===h);
      return x&&x.used?`<td class="ana-cell${st.sel===c.k+'|'+h?' sel':''}" data-cell="${c.k}|${h}"><div>▼ ${bar(x.upOk.length,x.upAll.length)}</div><div>▲ ${bar(x.loOk.length,x.loAll.length)}</div></td>`:'<td class="ana-na">—</td>'; }).join('')}</tr>`).join('')}
    </table>`:'<div class="phl-empty">Aucun lien de réalisation entre couches dans ce modèle.</div>'}
    <div id="ana-tr-detail"></div>`;
  } else if(st.view==='paths'){
    const rows=capTracePaths(d, st.cat, 3000);
    const q=st.q.trim().toLowerCase();
    const f=q?rows.filter(r=>CAP_ANA_LAYERS.some(k=>(r[k]||[]).some(e=>e.name.toLowerCase().includes(q)))):rows;
    const cols=CAP_ANA_LAYERS.filter(k=>rows.some(r=>r[k]));
    box._trRows=f; box._trCols=cols;
    body=`<table class="ana-t"><tr>${cols.map(k=>`<th>${capChainLayerBadge(k)} ${capEsc(capChainLayerInfo(k).label)}</th>`).join('')}</tr>
      ${f.slice(0,800).map(r=>`<tr>${cols.map(k=>`<td>${(r[k]||[]).map(e=>L(e.id,e.name)+` <span class="ana-dim">${capEsc(capAnaHuman(e.type))}</span>`).join('<br>')||'<span class="ana-miss">∅</span>'}</td>`).join('')}</tr>`).join('')}
    </table>${f.length>800?`<div class="cap-mx-hint">800 lignes affichées sur ${f.length} — export CSV pour tout voir.</div>`:''}${rows.length>=3000?'<div class="cap-mx-hint">Calcul limité à 3000 chemins.</div>':''}`;
  } else {
    const q=st.q.trim().toLowerCase();
    const f=d.links.filter(l=>!q||(l.src.name+' '+l.tgt.name+' '+l.type).toLowerCase().includes(q));
    box._trLinks=f;
    body=`<table class="ana-t"><tr><th>Type de lien</th><th>Réalisant (bas)</th><th>Type</th><th></th><th>Réalisé (haut)</th><th>Type</th></tr>
      ${f.slice(0,1000).map(l=>`<tr><td class="ana-dim">${capEsc(l.type)}</td><td>${capChainLayerBadge(l.src.layer)} ${L(l.src.id,l.src.name)}</td><td class="ana-dim">${capEsc(capAnaHuman(l.src.type))}</td><td>→</td><td>${capChainLayerBadge(l.tgt.layer)} ${L(l.tgt.id,l.tgt.name)}</td><td class="ana-dim">${capEsc(capAnaHuman(l.tgt.type))}</td></tr>`).join('')}
    </table>${f.length>1000?`<div class="cap-mx-hint">1000 liens affichés sur ${f.length} — export CSV pour tout voir.</div>`:''}`;
  }
  box.innerHTML=`<div class="phl-filter-bar" style="flex-wrap:wrap;margin-bottom:8px">
      <button class="cap-lf-btn${st.view==='cov'?' active':''}" data-trv="cov">▦ Couverture</button>
      <button class="cap-lf-btn${st.view==='paths'?' active':''}" data-trv="paths">⛓ Chemins de traçabilité</button>
      <button class="cap-lf-btn${st.view==='links'?' active':''}" data-trv="links">🔗 Liens (${d.links.length})</button>
      ${st.view==='paths'?`<select id="ana-tr-cat" class="phl-filter-input" style="width:auto">${CAP_TRACE_CATS.filter(c=>d.els.some(e=>e.cat===c.k)).map(c=>`<option value="${c.k}"${st.cat===c.k?' selected':''}>${capEsc(c.label)}</option>`).join('')}</select>`:''}
      ${st.view!=='cov'?`<input id="ana-tr-q" class="phl-filter-input" placeholder="🔍 Filtrer…" value="${capEsc(st.q)}" style="width:200px">`:''}
      <label class="cap-chx-opt" title="Les fonctions mères (conteneurs) sont ignorées"><input type="checkbox" id="ana-tr-leaf"${st.leaf?' checked':''}> Fonctions feuilles</label>
      <label class="cap-chx-opt" title="Liens générés par les transitions automatiques de Capella"><input type="checkbox" id="ana-tr-transfo"${st.transfo?' checked':''}> Inclure les TransfoLink</label>
      <button class="phl-export-btn" id="ana-tr-csv" style="margin-left:auto">⬇ CSV</button>
    </div>${body}`;
  box.querySelectorAll('[data-trv]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.trv; capRenderTrace(box); });
  box.querySelector('#ana-tr-cat')?.addEventListener('change',e=>{ st.cat=e.target.value; capRenderTrace(box); });
  let deb; box.querySelector('#ana-tr-q')?.addEventListener('input',e=>{ st.q=e.target.value; clearTimeout(deb); deb=setTimeout(()=>{ const p=e.target.selectionStart; capRenderTrace(box); const i=box.querySelector('#ana-tr-q'); i.focus(); i.setSelectionRange(p,p); },250); });
  box.querySelector('#ana-tr-leaf').onchange=e=>{ st.leaf=e.target.checked; capRenderTrace(box); };
  box.querySelector('#ana-tr-transfo').onchange=e=>{ st.transfo=e.target.checked; capRenderTrace(box); };
  /** Détail d'une cellule de couverture : éléments hauts non réalisés et éléments bas non réalisants. */
  const showCell=key=>{
    const [cat,hi]=key.split('|'); const x=capTraceCoverage(d).find(y=>y.cat===cat&&y.hi===hi); if(!x) return;
    const miss=x.upAll.filter(e=>!x.upOk.includes(e)), orph=x.loAll.filter(e=>!x.loOk.includes(e));
    const li=a=>a.length?a.sort((p,q)=>p.name.localeCompare(q.name,'fr')).map(e=>`<div>${L(e.id,e.name)} <span class="ana-dim">${capEsc(capAnaHuman(e.type))}</span></div>`).join(''):'<div class="cap-diag-ok">✔ RAS</div>';
    box.querySelector('#ana-tr-detail').innerHTML=`<div class="ana-cols">
      <div><h4>▼ ${capEsc(catLabel(cat))} ${hi} non réalisés en ${x.lo} (${miss.length})</h4>${li(miss)}</div>
      <div><h4>▲ ${capEsc(catLabel(cat))} ${x.lo} ne réalisant rien en ${hi} (${orph.length})</h4>${li(orph)}</div></div>`;
  };
  box.querySelectorAll('.ana-cell').forEach(td=>td.onclick=()=>{ st.sel=td.dataset.cell; box.querySelectorAll('.ana-cell.sel').forEach(x=>x.classList.remove('sel')); td.classList.add('sel'); showCell(st.sel); });
  if(st.view==='cov'&&st.sel) showCell(st.sel);
  box.querySelector('#ana-tr-csv').onclick=()=>{
    if(st.view==='cov'){
      const rows=[]; capTraceCoverage(d).filter(x=>x.used).forEach(x=>{
        x.upAll.forEach(e=>rows.push([catLabel(x.cat),`${x.hi}→${x.lo}`,'haut',e.name,capAnaHuman(e.type),x.upOk.includes(e)?'réalisé':'NON réalisé']));
        x.loAll.forEach(e=>rows.push([catLabel(x.cat),`${x.hi}→${x.lo}`,'bas',e.name,capAnaHuman(e.type),x.loOk.includes(e)?'réalisant':'ne réalise rien']));
      });
      capCsvDownload('tracabilite-couverture.csv',['Catégorie','Passage','Niveau','Élément','Type','Statut'],rows);
    } else if(st.view==='paths'){
      capCsvDownload(`tracabilite-chemins-${st.cat}.csv`,box._trCols,box._trRows.map(r=>box._trCols.map(k=>(r[k]||[]).map(e=>e.name).join(' | '))));
    } else capCsvDownload('tracabilite-liens.csv',['Type de lien','Couche réalisant','Réalisant','Type','Couche réalisé','Réalisé','Type'],
      box._trLinks.map(l=>[l.type,l.src.layer,l.src.name,capAnaHuman(l.src.type),l.tgt.layer,l.tgt.name,capAnaHuman(l.tgt.type)]));
  };
}
/* ── 2. CAPACITÉS & MISSIONS ────────────────────────────────────── */
const CAP_CAP_TYPES=['OperationalCapability','Capability','CapabilityRealization','Mission'];
/** Calcule capacités et missions : fonctions, chaînes, composants/acteurs impliqués (tout type *Involvement,
 * y compris via Part), scénarios, inclusions/extensions, réalisations et exploitations par les missions.
 * @returns {object[]} Capacités {id,name,type,layer,fns,chains,actors,others,scen,includes,realizedBy,realizes,missions,exploits}
 */
function capComputeCapabilities(){
  if(_capAnaCache.caps) return _capAnaCache.caps;
  const {all,res}=capAnaCtx();
  const byId={}, list=[];
  all.forEach(el=>{
    const t=capTName(el); if(!CAP_CAP_TYPES.includes(t)) return;
    const c={...capAnaEl(el), el, fns:[], chains:[], actors:[], others:[], scen:[], includes:[], realizedBy:[], realizes:[], missions:[], exploits:[]};
    byId[c.id]=c; list.push(c);
  });
  const push=(arr,x)=>{ if(x&&!arr.some(y=>y.id===x.id)) arr.push(x); };
  list.forEach(c=>{
    for(const ch of c.el.children){
      const t=capTName(ch);
      if(/Involvement$/.test(t)&&ch.getAttribute('involved')){
        let inv=res(ch.getAttribute('involved')); if(!inv) continue;
        if(capTName(inv)==='Part') inv=res(inv.getAttribute('abstractType'))||inv; // anciennes versions : implication via Part
        const e=capAnaEl(inv), k=(capTraceCatOf(e.type)||{}).k;
        push(k==='fn'?c.fns:k==='chain'?c.chains:k==='comp'?c.actors:c.others, e);
      } else if(t==='Scenario') push(c.scen, capAnaEl(ch));
      else if(/(Include|Extend|Generalization)$/.test(t)){
        const x=res(ch.getAttribute('included')||ch.getAttribute('extended')||ch.getAttribute('super'));
        if(x) push(c.includes,{...capAnaEl(x), rel:t.replace(/^AbstractCapability/,'')});
      } else if(t==='CapabilityExploitation'){
        const x=res(ch.getAttribute('capability')); if(x){ push(c.exploits,capAnaEl(x)); if(byId[capXId(x)]) push(byId[capXId(x)].missions,{id:c.id,name:c.name,type:c.type,layer:c.layer}); }
      }
    }
  });
  all.forEach(el=>{
    if(capTName(el)!=='AbstractCapabilityRealization') return;
    const s=res(el.getAttribute('sourceElement')), g=res(el.getAttribute('targetElement')); if(!s||!g) return;
    const S=byId[capXId(s)], G=byId[capXId(g)];
    if(S&&G){ push(S.realizes,{id:G.id,name:G.name,type:G.type,layer:G.layer}); push(G.realizedBy,{id:S.id,name:S.name,type:S.type,layer:S.layer}); }
  });
  list.forEach(c=>delete c.el);
  return _capAnaCache.caps=list;
}

/** Rend la sous-vue Capacités & missions : cartes par couche, matrice d'implication, contrôles de couverture.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderCapabilities(box){
  const st=box._cp=box._cp||{view:'cards', layer:'all', mx:'actors', q:''};
  const caps=capComputeCapabilities(), L=capDetLink;
  const layers=CAP_ANA_LAYERS.filter(k=>caps.some(c=>c.layer===k));
  const q=st.q.trim().toLowerCase();
  const shown=caps.filter(c=>(st.layer==='all'||c.layer===st.layer)&&(!q||c.name.toLowerCase().includes(q)));
  const list=(arr,empty)=>arr.length?arr.map(e=>`${L(e.id,e.name)}${e.rel?` <span class="ana-dim">(${capEsc(e.rel)})</span>`:''}`).join(', '):`<span class="ana-miss">${empty||'—'}</span>`;
  const icon=t=>t==='Mission'?'🎯':t==='OperationalCapability'?'🧭':t==='CapabilityRealization'?'🛠':'⭐';
  let body='';
  if(!caps.length) body='<div class="phl-empty">Aucune capacité ni mission dans ce modèle.</div>';
  else if(st.view==='cards'){
    body=CAP_ANA_LAYERS.map(lk=>{
      const g=shown.filter(c=>c.layer===lk).sort((a,b)=>(a.type==='Mission'?0:1)-(b.type==='Mission'?0:1)||a.name.localeCompare(b.name,'fr')); if(!g.length) return '';
      return `<div class="cap-chain-lhdr" style="border-color:${capChainLayerInfo(lk).color}">${capChainLayerBadge(lk)}<span>${capEsc(capChainLayerInfo(lk).label)}</span><span class="cap-chain-lcnt">${g.length}</span></div>`+
      g.map(c=>`<div class="phl-comp-card"><div class="phl-comp-hdr" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');this.querySelector('.phl-comp-toggle').classList.toggle('open')">
          <span>${icon(c.type)}</span><span class="phl-comp-title">${L(c.id,c.name)}</span>
          <span class="phl-comp-cnt">${capEsc(capAnaHuman(c.type))} · ${c.type==='Mission'?`${c.exploits.length} capacité(s) · `:`${c.fns.length} fonction(s) · ${c.chains.length} chaîne(s) · ${c.scen.length} scénario(s) · `}${c.actors.length} acteur(s)/composant(s)</span>
          <span class="phl-comp-toggle">▶</span></div>
        <div class="phl-comp-body"><table class="ana-t ana-kv">
          ${c.type==='Mission'?`<tr><td>Capacités exploitées</td><td>${list(c.exploits,'∅ aucune')}</td></tr>`:`
          <tr><td>Fonctions impliquées</td><td>${list(c.fns,'∅ aucune')}</td></tr>
          <tr><td>Chaînes impliquées</td><td>${list(c.chains)}</td></tr>
          <tr><td>Scénarios</td><td>${list(c.scen)}</td></tr>
          <tr><td>Inclut / étend / spécialise</td><td>${list(c.includes)}</td></tr>
          <tr><td>Exploitée par les missions</td><td>${list(c.missions)}</td></tr>
          <tr><td>Réalise (couche haute)</td><td>${list(c.realizes)}</td></tr>
          <tr><td>Réalisée par (couche basse)</td><td>${list(c.realizedBy)}</td></tr>`}
          <tr><td>Acteurs / composants impliqués</td><td>${list(c.actors,'∅ aucun')}</td></tr>
          ${c.others.length?`<tr><td>Autres implications</td><td>${list(c.others)}</td></tr>`:''}
        </table></div></div>`).join('');
    }).join('')||'<div class="phl-empty">Aucune capacité ne correspond au filtre.</div>';
  } else if(st.view==='matrix'){
    const rows=shown.filter(c=>c.type!=='Mission'||st.mx==='actors'||st.mx==='exploits');
    const key=st.mx;
    const colsMap={}; rows.forEach(c=>(c[key]||[]).forEach(e=>colsMap[e.id]=e));
    const cols=Object.values(colsMap).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    box._cpMx={rows,cols,key};
    body=rows.length&&cols.length?`<div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">Capacité ↓ / ${key==='actors'?'Acteur-composant':key==='fns'?'Fonction':key==='chains'?'Chaîne':'Capacité'} →</th>
      ${cols.map(c=>`<th class="cap-mx-col" title="${capEsc(c.name)}"><div>${capEsc(c.name)}</div></th>`).join('')}<th class="cap-mx-col"><div><b>Σ</b></div></th></tr></thead><tbody>
      ${rows.map(r=>{ const ids=new Set((r[key]||[]).map(e=>e.id));
        return `<tr><th class="cap-mx-row" title="${capEsc(r.name)}">${capChainLayerBadge(r.layer)} ${capEsc(r.name)}</th>${cols.map(c=>ids.has(c.id)?'<td class="ana-dot">●</td>':'<td></td>').join('')}<td class="cap-mx-tot">${ids.size||''}</td></tr>`; }).join('')}
      <tr><th class="cap-mx-row">Σ</th>${cols.map(c=>`<td class="cap-mx-tot">${rows.filter(r=>(r[key]||[]).some(e=>e.id===c.id)).length}</td>`).join('')}<td></td></tr>
      </tbody></table></div>`:'<div class="phl-empty">Rien à croiser pour ce filtre.</div>';
  } else {
    // Contrôles : uniquement ce que le modèle utilise (une couche sans implications de fonctions n'est pas signalée)
    const nonMis=caps.filter(c=>c.type!=='Mission');
    const row=c=>`<tr><td>${capChainLayerBadge(c.layer)} ${L(c.id,c.name)}</td><td class="ana-dim">${capEsc(capAnaHuman(c.type))}</td></tr>`;
    const layersWithFnInv=new Set(nonMis.filter(c=>c.fns.length).map(c=>c.layer));
    const lowerOf=lk=>CAP_ANA_LAYERS[CAP_ANA_LAYERS.indexOf(lk)+1];
    const layersWithCaps=new Set(nonMis.map(c=>c.layer));
    const d=capComputeTrace(false,true);
    const involved=new Set(nonMis.flatMap(c=>c.fns.map(f=>f.id)));
    const orphanFns=d.els.filter(e=>e.cat==='fn'&&layersWithFnInv.has(e.layer)&&!involved.has(e.id));
    body=capDiagHtml([
      {icon:'ƒ', title:'Capacités sans fonction ni chaîne impliquée', tip:'Rien ne décrit le comportement attendu', cols:['Capacité','Type'], items:nonMis.filter(c=>!c.fns.length&&!c.chains.length).map(row)},
      {icon:'👤', title:'Capacités / missions sans acteur ni composant impliqué', cols:['Élément','Type'], items:caps.filter(c=>!c.actors.length).map(row)},
      {icon:'🎬', title:'Capacités sans scénario', tip:'Aucun scénario pour illustrer la capacité', cols:['Capacité','Type'], items:nonMis.filter(c=>!c.scen.length).map(row)},
      {icon:'⬇', title:'Capacités non réalisées à la couche inférieure', tip:'Seulement si la couche inférieure contient des capacités', cols:['Capacité','Type'],
        items:nonMis.filter(c=>layersWithCaps.has(lowerOf(c.layer))&&!c.realizedBy.length).map(row)},
      {icon:'🎯', title:'Capacités système non exploitées par une mission', tip:'Seulement si le modèle contient des missions', cols:['Capacité','Type'],
        items:caps.some(c=>c.type==='Mission')?nonMis.filter(c=>c.type==='Capability'&&!c.missions.length).map(row):[]},
      {icon:'🎯', title:'Missions sans capacité exploitée', cols:['Mission','Type'], items:caps.filter(c=>c.type==='Mission'&&!c.exploits.length).map(row)},
      {icon:'∅', title:'Fonctions feuilles impliquées dans aucune capacité', tip:'Couches où des capacités impliquent déjà des fonctions', cols:['Fonction','Type'],
        items:orphanFns.sort((a,b)=>a.layer.localeCompare(b.layer)||a.name.localeCompare(b.name,'fr')).map(row)},
    ]);
  }
  box.innerHTML=`<div class="phl-filter-bar" style="flex-wrap:wrap;margin-bottom:8px">
      <button class="cap-lf-btn${st.view==='cards'?' active':''}" data-cpv="cards">▣ Cartes</button>
      <button class="cap-lf-btn${st.view==='matrix'?' active':''}" data-cpv="matrix">▦ Matrice</button>
      <button class="cap-lf-btn${st.view==='diag'?' active':''}" data-cpv="diag">🩺 Contrôles</button>
      ${st.view!=='diag'?`<span class="tsep"></span><button class="cap-lf-btn${st.layer==='all'?' active':''}" data-cpl="all">Toutes (${caps.length})</button>
      ${layers.map(k=>`<button class="cap-lf-btn${st.layer===k?' active':''}" data-cpl="${k}">${k} (${caps.filter(c=>c.layer===k).length})</button>`).join('')}`:''}
      ${st.view==='matrix'?`<select id="ana-cp-mx" class="phl-filter-input" style="width:auto">
        ${[['actors','× Acteurs / composants'],['fns','× Fonctions'],['chains','× Chaînes'],['exploits','Missions × capacités']].map(([k,l])=>`<option value="${k}"${st.mx===k?' selected':''}>${l}</option>`).join('')}</select>`:''}
      ${st.view==='cards'?`<input id="ana-cp-q" class="phl-filter-input" placeholder="🔍 Capacité…" value="${capEsc(st.q)}" style="width:180px">`:''}
      <button class="phl-export-btn" id="ana-cp-csv" style="margin-left:auto">⬇ CSV</button>
    </div>${body}`;
  box.querySelectorAll('[data-cpv]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.cpv; capRenderCapabilities(box); });
  box.querySelectorAll('[data-cpl]').forEach(b=>b.onclick=()=>{ st.layer=b.dataset.cpl; capRenderCapabilities(box); });
  box.querySelector('#ana-cp-mx')?.addEventListener('change',e=>{ st.mx=e.target.value; capRenderCapabilities(box); });
  let deb; box.querySelector('#ana-cp-q')?.addEventListener('input',e=>{ st.q=e.target.value; clearTimeout(deb); deb=setTimeout(()=>{ const p=e.target.selectionStart; capRenderCapabilities(box); const i=box.querySelector('#ana-cp-q'); i.focus(); i.setSelectionRange(p,p); },250); });
  box.querySelector('#ana-cp-csv').onclick=()=>{
    const n=a=>a.map(e=>e.name).join(', ');
    if(st.view==='matrix'&&box._cpMx){ const {rows,cols,key}=box._cpMx;
      capCsvDownload(`capacites-matrice-${key}.csv`,['Couche','Capacité',...cols.map(c=>c.name)],rows.map(r=>{ const ids=new Set((r[key]||[]).map(e=>e.id)); return [r.layer,r.name,...cols.map(c=>ids.has(c.id)?'X':'')]; }));
    } else capCsvDownload('capacites.csv',['Couche','Type','Nom','Fonctions','Chaînes','Acteurs / composants','Scénarios','Inclusions','Missions','Réalise','Réalisée par','Capacités exploitées'],
      caps.map(c=>[c.layer,capAnaHuman(c.type),c.name,n(c.fns),n(c.chains),n(c.actors),n(c.scen),n(c.includes),n(c.missions),n(c.realizes),n(c.realizedBy),n(c.exploits)]));
  };
}