/* ══ ⇆ FUNCTIONAL EXCHANGE ═════════════════════════════════════════════════════════
 * Même structure que 🔀 Component Exchange, pour les échanges entre fonctions :
 * ≡ Vue Ligne (un échange par ligne), ▣ Vue Fonction (regroupé par fonction),
 * ◧ Vue Blocs (chaque fonction dessinée comme dans Capella : boîte verte, pins d'entrée à gauche,
 * de sortie à droite, avec l'échange et la fonction distante), ▦ Matrice fonction × fonction, 🩺 Contrôles.
 * Pagination par 100 (lignes, fonctions, blocs) ; matrice limitée à 100 fonctions (les plus connectées), pour rester fluide sur les gros modèles.
 */
var CAP_FEX_PAGE=100;    // éléments par page (Ligne, Fonction, Blocs) : ≈ 0,1 s de rendu ; tout afficher (3 000 fonctions) ≈ 2 s à chaque filtre
var CAP_FEX_MX_MAX=100;  // fonctions au plus dans la matrice : 100 ≈ 0,2 s, 200 ≈ 0,5 s, 300 ≈ 1,6 s
var _capFexView='block';
var _capOavView='block';   // vue choisie dans 🟨 Operational Analysis (même moteur, couche OA seule)
var _capFexGo=null;   // fonction à afficher à la prochaine ouverture de la vue (depuis une autre vue)

/** Conseil d'affichage des Vues Blocs : rendu plus proche de Capella avec un thème clair (affiché seulement en thème sombre).
 * @returns {string} HTML du conseil, ou chaîne vide si un thème clair est déjà actif
 */
function capBlkThemeHint(){
  if(capIsLight()) return '';
  return _L(`<div class="ana-dim" style="font-size:11px;margin:2px 0 6px;">💡 Les blocs sont plus lisibles, et plus proches du rendu Capella, avec le thème <b>Office 2007</b> ou <b>Clair</b> (menu 🎨 Thème ▾).</div>`);
}

/** Géométrie d'un côté de bloc (Vues Blocs) : une ligne par pin ou port, plus haute quand il a plusieurs
 * connexions (listées les unes sous les autres) ; le pin est centré sur sa ligne.
 * @param {number[]} counts - Nombre de connexions de chaque pin, dans l'ordre
 * @returns {{hs:number[], tops:number[], total:number}} Hauteurs, centres des pins (px depuis le haut du bloc), hauteur totale
 */
function capBlkRows(counts){
  const hs=counts.map(k=>Math.max(30,k*18+12)), tops=[]; let y=19;
  hs.forEach(h=>{ tops.push(y+h/2); y+=h; });
  return {hs, tops, total:y-19};
}
/** Texte d'une ligne de pin : connexions en liste (une par ligne) quand il y en a plusieurs.
 * @param {string[]} items - HTML de chaque connexion @param {string} empty - HTML si aucune @param {number} h - Hauteur de la ligne
 * @param {string} tip - Info-bulle @returns {string} HTML */
function capBlkSide(items, empty, h, tip){
  const multi=items.length>1;
  return `<div class="fex-pl${multi?' fex-pl-multi':''}" style="height:${h}px"><div class="fex-pl-txt" title="${capEsc(tip)}">${!items.length?empty:multi?items.map(x=>`<div class="fex-pl-row">${x}</div>`).join(''):items[0]}</div></div>`;
}

/** Ouvre ƒ⇆ Functional Exchange sur le bloc d'une fonction (Vue Blocs, page et filtres ajustés).
 * @param {string} id - Fonction
 */
function capFexOpenFn(id){ _capFexGo=id; capNavOpen('fex'); }

/** Calcule les Functional Exchanges du modèle avec leurs fonctions et ports d'extrémité, les Exchange Items,
 * les Component Exchanges qui les allouent et les chaînes qui les impliquent ; indexe aussi les ports de chaque fonction.
 * @returns {{list:object[], fns:object[], fnById:object, portFes:object, ceUsed:boolean}} Résultat (mis en cache)
 */
function capComputeFunctionalExchanges(){
  if(_capAnaCache.fex) return _capAnaCache.fex;
  const F=capComputeFunctions(), {all,res,resList}=capAnaCtx();
  const portOwner={};   // id de port → {f, dir, name}
  F.list.forEach(f=>{ f.ins.forEach(p=>portOwner[p.id]={f,dir:'IN',name:p.name}); f.outs.forEach(p=>portOwner[p.id]={f,dir:'OUT',name:p.name}); });
  const ceOf={}, chainsOf={}; let ceUsed=false;
  all.forEach(el=>{
    const t=capTName(el);
    if(t==='ComponentExchangeFunctionalExchangeAllocation'){
      ceUsed=true;
      const fe=(el.getAttribute('targetElement')||'').replace(/^.*#/,'');
      const ce=res(el.getAttribute('sourceElement'))||el.parentElement;
      if(fe&&ce) (ceOf[fe]=ceOf[fe]||[]).push({id:capXId(ce), name:capXName(ce)||'—'});
    } else if(t==='FunctionalChainInvolvementLink'){
      const fe=(el.getAttribute('involved')||'').replace(/^.*#/,''), ch=el.parentElement;
      if(fe&&ch&&!(chainsOf[fe]||[]).some(c=>c.id===capXId(ch))) (chainsOf[fe]=chainsOf[fe]||[]).push({id:capXId(ch), name:capXName(ch)||'—'});
    }
  });
  /** Extrémité d'un échange : fonction (directement ou propriétaire du port) et port éventuel. */
  const end=ref=>{
    const el=res(ref); if(!el) return null;
    const id=capXId(el), po=portOwner[id];
    if(po) return {fnId:po.f.id, fnName:po.f.name, fnNum:po.f.num, fnType:po.f.type, layer:po.f.layer, portId:id, portName:po.name, portDir:po.dir};
    const f=F.byId[id];
    return f?{fnId:f.id, fnName:f.name, fnNum:f.num, fnType:f.type, layer:f.layer, portId:'', portName:'', portDir:''}:null;
  };
  const list=[], portFes={};
  all.forEach(el=>{
    if(capTName(el)!=='FunctionalExchange') return;
    const src=end(el.getAttribute('source')), tgt=end(el.getAttribute('target')); if(!src||!tgt) return;
    const id=capXId(el);
    const x={id, name:capXName(el)||'—', layer:src.layer, src, tgt,
      items:resList(el.getAttribute('exchangedItems')).map(i=>({id:capXId(i), name:capXName(i)||'—'})),
      ces:ceOf[id]||[], chains:chainsOf[id]||[]};
    list.push(x);
    if(src.portId) (portFes[src.portId]=portFes[src.portId]||[]).push(x);
    if(tgt.portId) (portFes[tgt.portId]=portFes[tgt.portId]||[]).push(x);
  });
  list.forEach((x,i)=>x.num=i+1);
  return _capAnaCache.fex={list, fns:F.list, fnById:F.byId, portFes, ceUsed};
}

/** Sections de contrôle des Functional Exchanges et des ports de fonctions (rapport 🩺 et tableau de bord).
 * @param {string} [layer] - Couche filtrée ('all' ou absent : toutes)
 * @returns {object[]} Sections {icon,title,tip,cols,items, rows (données brutes)}
 */
function capFexChecks(layer){
  const X=capComputeFunctionalExchanges(), inL=o=>!layer||layer==='all'||o.layer===layer;
  const fes=X.list.filter(inL), fns=X.fns.filter(inL);
  const fl=(id,n)=>`<span class="cex-det" style="cursor:pointer" onclick="capOpenDetailById('${capEsc(id)}')">${capEsc(n)}</span>`;
  const exRow=x=>`<tr><td>#${x.num}</td><td>${fl(x.id,x.name)}</td><td>${fl(x.src.fnId,x.src.fnName)}</td><td>${fl(x.tgt.fnId,x.tgt.fnName)}</td><td>${x.layer}</td></tr>`;
  const exCols=['N°',_L('Functional Exchange'),_L('Fonction source'),_L('Fonction cible'),_L('Couche')];
  const orphan=[]; fns.forEach(f=>[...f.ins.map(p=>({...p,dir:'IN'})),...f.outs.map(p=>({...p,dir:'OUT'}))].forEach(p=>{ if(!(X.portFes[p.id]||[]).length) orphan.push({f,p}); }));
  const leafNoFe=fns.filter(f=>f.leaf&&f.parentId&&!f.fesIn.length&&!f.fesOut.length);
  const parentPorts=fns.filter(f=>!f.leaf&&(f.ins.length||f.outs.length));
  const noPort=fes.filter(x=>x.layer!=='OA'&&(!x.src.portId||!x.tgt.portId));   // en OA, les échanges relient directement les activités
  const sec=[
    {icon:'⭘', title:_L('Ports de fonction orphelins (sans échange)'), tip:_L('Function Port défini mais relié à aucun Functional Exchange'), cols:[_L('Fonction'),_L('Port'),_L('Sens'),_L('Couche')],
      items:orphan.map(o=>`<tr><td>${fl(o.f.id,o.f.name)}</td><td>${fl(o.p.id,o.p.name)}</td><td>${o.p.dir==='IN'?_L('▶ entrée'):_L('sortie ▶')}</td><td>${o.f.layer}</td></tr>`)},
    {icon:'∅', title:_L('Échanges sans Exchange Item'), tip:_L('Aucun Exchange Item porté (exchangedItems)'), cols:exCols, items:fes.filter(x=>!x.items.length).map(exRow)},
    {icon:'ƒ', title:_L('Fonctions feuilles sans aucun échange'), tip:_L('Fonction sans sous-fonction, ni entrée ni sortie'), cols:['N°',_L('Fonction'),_L('Couche')],
      items:leafNoFe.map(f=>`<tr><td>${capEsc(f.num)}</td><td>${fl(f.id,f.name)}</td><td>${f.layer}</td></tr>`)},
    {icon:'▣', title:_L('Fonctions mères portant des ports'), tip:_L('Bonne pratique Capella : les ports et échanges sont portés par les fonctions feuilles'), cols:['N°',_L('Fonction'),_L('Ports'),_L('Couche')],
      items:parentPorts.map(f=>`<tr><td>${capEsc(f.num)}</td><td>${fl(f.id,f.name)}</td><td>${f.ins.length} ▶ / ${f.outs.length} ▶</td><td>${f.layer}</td></tr>`)}
  ];
  if(noPort.length) sec.push({icon:'⚠', title:_L('Échanges reliés directement à une fonction (sans port)'), tip:_L('Source ou cible sans Function Port (hors OA, où c\'est la règle)'), cols:exCols, items:noPort.map(exRow)});
  if(X.ceUsed) sec.push({icon:'🔀', title:_L('Échanges LA / PA non alloués à un Component Exchange'), tip:_L('Aucune ComponentExchangeFunctionalExchangeAllocation (le modèle en utilise ailleurs)'), cols:exCols,
    items:fes.filter(x=>(x.layer==='LA'||x.layer==='PA')&&!x.ces.length&&x.src.fnId!==x.tgt.fnId).map(exRow)});
  return sec;
}

/** Indicateurs ƒ⇆ Functional Exchange pour le catalogue du tableau de bord.
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 * @param {Function} LC - Couleur d'une couche
 */
function capFexDashCatalog(add, LC){
  const X=()=>capComputeFunctionalExchanges();
  add(_L('Functional Exchange'),'fex.n',_L('Functional Exchanges — nombre'),'n',()=>({n:X().list.length, sub:_L(`${X().fns.filter(f=>f.ins.length||f.outs.length).length} fonction(s) avec ports`)}));
  add(_L('Functional Exchange'),'fex.layer',_L('Functional Exchanges — par couche'),'series',()=>({order:'natural',cats:CAP_ANA_LAYERS.map(k=>({l:k,v:X().list.filter(x=>x.layer===k).length,c:LC(k)})).filter(c=>c.v)}));
  add(_L('Functional Exchange'),'fex.items',_L('Functional Exchanges — avec Exchange Item'),'pct',()=>capDashPct(X().list,x=>x.items.length));
  add(_L('Functional Exchange'),'fex.chk',_L('Functional Exchanges — contrôles'),'series',()=>({cats:capFexChecks().map(s=>({l:s.title,v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}

/** Rend la vue ƒ⇆ Functional Exchange (barre, filtres, contenu paginé, exports). */
function capRenderFunctionalExchange(mode){
  const OAV=mode==='OA';   // 🟨 Operational Analysis : activités et interactions OA, aux couleurs Capella
  const container=document.getElementById(OAV?'cap-view-oav':'cap-view-fex'); if(!container) return;
  container.classList.toggle('fex-oa', OAV);
  const X0=capComputeFunctionalExchanges();
  const X=OAV?{...X0, list:X0.list.filter(x=>x.layer==='OA'), fns:X0.fns.filter(f=>f.layer==='OA')}:X0, allLinks=X.list;
  if(!container._fex) container._fex={view:OAV?_capOavView:_capFexView, layer:OAV?'OA':'all', fnFilter:'', nameFilter:'', withPorts:false, page:0, ak:new Set(['sys','act','none']), back:null};
  const st=container._fex;
  if(OAV) st.layer='OA';
  const keepView=()=>{ if(OAV) _capOavView=st.view; else _capFexView=st.view; };
  /** Vocabulaire : activités / entités en OA, fonctions / système sinon. */
  const W=OAV?{fns:_L('activités'), Fns:_L('Activités'), fn:_L('activité'), Fn:_L('Activité')}:{fns:_L('fonctions'), Fns:_L('Fonctions'), fn:_L('fonction'), Fn:_L('Fonction')};
  const AKL=k=>OAV&&k==='sys'?{i:'🏢',l:_L('Entités'),tip:_L('Activités allouées à une entité opérationnelle (non acteur)')}:CAP_FN_AK[k];
  const isLight=capIsLight();
  const LAYER_C={OA:'#f0883e',SA:'#4dd880',LA:'#58a6ff',PA:'#e3b341'};
  const fnColor=L=>isLight?({OA:'#a04d00',SA:'#1a7a3a',LA:'#1a4f8a',PA:'#7a6500'}[L]||'#555'):(LAYER_C[L]||'#8b949e');
  const LINK_COLORS=['#0ea5e9','#f97316','#22c55e','#a855f7','#ef4444','#eab308','#06b6d4','#ec4899','#84cc16','#6366f1','#14b8a6'];
  const lc=x=>LINK_COLORS[x.num%LINK_COLORS.length];
  const layersPresent=CAP_ANA_LAYERS.filter(k=>allLinks.some(x=>x.layer===k)||X.fns.some(f=>f.layer===k&&(f.ins.length||f.outs.length)));

  /** Lien cliquable ouvrant le panneau de détail. */
  const det=(id,label,extra,cls)=>`<span class="cex-det${cls?' '+cls:''}" style="cursor:pointer;${extra||''}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(id)}')">${capEsc(label)}</span>`;
  /** Libellé d'une fonction : son nom seul (le numéro hiérarchique calculé n'est plus affiché). */
  const fnLabel=(num,name)=>name;

  /** Nature d'allocation d'une fonction pour la couleur et le filtre : 'sys' (système), 'act' (acteur), 'none' (non allouée ou fonction mère). */
  const akOf=id=>{ const f=X.fnById[id]; if(!f) return 'none'; const k=capFnAllocKind(f); return k==='mix'?'act':k==='parent'?'none':k; };
  const AKC={sys:'#3fb950', act:'#58a6ff', none:'#8b949e'};
  const akOn=()=>st.ak.size<3;
  /** Allocataires des fonctions de la couche affichée (comme ƒ Fonctions) : acteurs, et arbre des composants
   * avec leurs sous-composants ; pour chacun, les fonctions couvertes. */
  const whoCompute=()=>{ const act=new Map(), comp=new Map(), kids=new Map(), roots=new Set();
    X.fns.filter(f=>st.layer==='all'||f.layer===st.layer).forEach(f=>f.alloc.forEach(a=>{
      if(a.actor){ const o=act.get(a.id)||{id:a.id,name:a.name,layer:f.layer,fns:new Set()}; o.fns.add(f.id); act.set(a.id,o); return; }
      const chain=[...(a.anc||[]).filter(x=>!act.has(x.id)),{id:a.id,name:a.name}];
      chain.forEach((x,i)=>{ const o=comp.get(x.id)||{id:x.id,name:x.name,layer:f.layer,fns:new Set()}; o.fns.add(f.id); comp.set(x.id,o);
        if(i===0) roots.add(x.id); else { const s2=kids.get(chain[i-1].id)||new Set(); s2.add(x.id); kids.set(chain[i-1].id,s2); } });
    }));
    return {act,comp,kids,roots}; };
  let who=whoCompute();   // recalculé à chaque rendu complet (dépend de la couche choisie)
  /** Vrai si la fonction est allouée à l'allocataire choisi (ou à l'un de ses sous-composants). */
  const whoFn=id=>{ if(!st.who) return true; const f=X.fnById[id]; return !!f&&f.alloc.some(a=>a.id===st.who||(!a.actor&&(a.anc||[]).some(x=>x.id===st.who))); };   // un acteur rangé sous un composant ne compte pas pour ce composant
  /** Liste « Tous les allocataires » : acteurs, puis système et sous-systèmes en arbre (libellés selon la couche). */
  const whoSelect=()=>{
    if(!who.act.size&&!who.comp.size) return '';
    const oa=st.layer==='OA', pre=o=>st.layer==='all'?`[${o.layer}] `:'';
    const opt=(o,d,ic)=>`<option value="${capEsc(o.id)}"${st.who===o.id?' selected':''}>${'\u00a0\u00a0'.repeat(d)}${ic} ${capEsc(pre(o)+o.name)} (${o.fns.size})</option>`;
    const tree=(id,d)=>{ const o=who.comp.get(id); return opt(o,d,d?'└':(oa?'🏢':'🧩'))+[...(who.kids.get(id)||[])].sort((a,b)=>who.comp.get(a).name.localeCompare(who.comp.get(b).name)).map(k=>tree(k,d+1)).join(''); };
    const acts=[...who.act.values()].sort((a,b)=>a.name.localeCompare(b.name));
    return _L(`<select id="fex-who" class="phl-filter-input" style="max-width:230px${st.who?';border-color:var(--c-accent)':''}" title="Fonctions allouées à ${oa?_L('une entité ou un acteur opérationnel'):_L('un acteur, ou au système / à un sous-système')} (sous-composants compris)">
      <option value="">${oa?_L('Toutes les entités et acteurs'):_L('Tous les allocataires')}</option>
      ${acts.length?`<optgroup label="👤 ${oa?_L('Acteurs opérationnels'):_L('Acteurs')}">${acts.map(o=>opt(o,0,'👤')).join('')}</optgroup>`:''}
      ${who.comp.size?`<optgroup label="${oa?_L('🏢 Entités'):_L('🧩 Système / sous-systèmes')}">${[...who.roots].map(r=>tree(r,0)).join('')}</optgroup>`:''}
    </select>${st.who?_L('<button class="cap-lf-btn" id="fex-who-x" title="Retirer le filtre d\'allocataire">✕</button>'):''}`);
  };
  /** Échanges retenus par les filtres. */
  function getFiltered(){
    const nf=st.nameFilter.trim().toLowerCase(), ff=st.fnFilter.trim().toLowerCase();
    return allLinks.filter(x=>{
      if(st.layer!=='all'&&x.layer!==st.layer) return false;
      if(nf&&!x.name.toLowerCase().includes(nf)&&!x.items.some(i=>i.name.toLowerCase().includes(nf))) return false;
      if(ff&&!x.src.fnName.toLowerCase().includes(ff)&&!x.tgt.fnName.toLowerCase().includes(ff)) return false;
      if(akOn()&&!st.ak.has(akOf(x.src.fnId))&&!st.ak.has(akOf(x.tgt.fnId))) return false;   // une extrémité au moins
      if(st.who&&!whoFn(x.src.fnId)&&!whoFn(x.tgt.fnId)) return false;
      return true;
    });
  }
  /** Fonctions retenues par les filtres (Vue Blocs) : avec ports ou échanges si demandé. */
  function getFns(){
    const nf=st.nameFilter.trim().toLowerCase(), ff=st.fnFilter.trim().toLowerCase();
    return X.fns.filter(f=>{
      if(st.layer!=='all'&&f.layer!==st.layer) return false;
      if(st.withPorts&&!f.ins.length&&!f.outs.length&&!f.fesIn.length&&!f.fesOut.length) return false;
      if(ff&&!f.name.toLowerCase().includes(ff)) return false;
      if(akOn()&&!st.ak.has(akOf(f.id))) return false;
      if(!whoFn(f.id)) return false;
      if(nf&&![...f.ins,...f.outs].some(p=>(X.portFes[p.id]||[]).some(x=>x.name.toLowerCase().includes(nf)))&&![...f.fesIn,...f.fesOut].some(x=>x.name.toLowerCase().includes(nf))) return false;
      return true;
    });
  }
  /** Pin d'un port façon Capella (entrée verte, sortie orange). */
  const pin=(dir,orphan)=>`<span class="fex-pin fex-pin-${dir==='IN'?'in':'out'}${orphan?' fex-pin-orphan':''}" title="${dir==='IN'?_L('Function Input Port'):_L('Function Output Port')}${orphan?_L(' — non connecté'):''}">▶</span>`;
  /** Ligne d'informations secondaires d'un échange (Exchange Items, Component Exchanges, chaînes). */
  function infoLine(x){
    const parts=[];
    if(x.items.length) parts.push(`<span title="Exchange Items">▤ ${capFoldList(x.items.map(i=>det(i.id,i.name)))}</span>`);
    else parts.push(_L(`<span title="Aucun Exchange Item" style="color:var(--c-warn,#e3b341)">∅ Item</span>`));
    if(x.ces.length) parts.push(_L(`<span title="Component Exchanges qui allouent cet échange">🔀 ${capFoldList(x.ces.map(c=>det(c.id,c.name)))}</span>`));
    if(x.chains.length) parts.push(_L(`<span title="Chaînes fonctionnelles">⚡ ${capFoldList(x.chains.map(c=>det(c.id,c.name)))}</span>`));
    return `<div style="font-size:11.5px;color:var(--c-dim);display:flex;flex-wrap:wrap;gap:2px 10px;justify-content:center;max-width:100%;">${parts.join('')}</div>`;
  }

  /** Vue Ligne : fonction source ▶ échange ▶ fonction cible. */
  function buildLines(list){
    return list.map(x=>{
      const sc=fnColor(x.src.layer), tc=fnColor(x.tgt.layer), c=lc(x);
      return `<div class="phl-line" data-lid="${capEsc(x.id)}">
        <div class="phl-cell phl-cell-pc" style="--phl-c:${sc}">
          ${det(x.src.fnId,fnLabel(x.src.fnNum,x.src.fnName),`color:${capTextOn(sc)}`,'phl-pc-name')}
          <span class="phl-port-name">${x.src.portId?pin('OUT')+' '+capEsc(x.src.portName):_L('<i>sans port</i>')}</span>
        </div>
        <div class="phl-cell phl-cell-link" style="padding:6px 14px;gap:2px;">
          <span style="font-size:11.5px;color:var(--c-dim);font-family:monospace;">#${x.num} · ${x.layer}</span>
          <span style="display:flex;align-items:center;width:100%;justify-content:center;">
            <span style="flex:1;max-width:40px;height:2px;background:${c}"></span>
            <span class="phl-link-badge" style="background:${c};color:#fff;border-color:${c};cursor:pointer;" onclick="capOpenDetailById('${capEsc(x.id)}')">${capEsc(x.name)}</span>
            <span style="flex:1;max-width:40px;height:2px;background:${c}"></span>
            <span style="font-size:14px;line-height:1;color:${c};margin-left:-2px;">▶</span>
          </span>
          ${infoLine(x)}
        </div>
        <div class="phl-cell phl-cell-pc phl-cell-r" style="--phl-c:${tc}">
          ${det(x.tgt.fnId,fnLabel(x.tgt.fnNum,x.tgt.fnName),`color:${capTextOn(tc)}`,'phl-pc-name')}
          <span class="phl-port-name">${x.tgt.portId?pin('IN')+' '+capEsc(x.tgt.portName):_L('<i>sans port</i>')}</span>
        </div>
      </div>`;
    }).join('');
  }

  /** Échanges regroupés par fonction (Vue Fonction). */
  function groupByFn(list){
    const by={};
    list.forEach(x=>{
      [[x.src,x.tgt,'out'],[x.tgt,x.src,'in']].forEach(([me,other,role])=>{
        const g=by[me.fnId]=by[me.fnId]||{id:me.fnId,name:me.fnName,num:me.fnNum,type:me.fnType,layer:me.layer,rows:[]};
        g.rows.push({x,role,me,other});
      });
    });
    const cmp=new Intl.Collator(undefined,{numeric:true}).compare;   // bien plus rapide que localeCompare répété
    return Object.values(by).sort((a,b)=>CAP_ANA_LAYERS.indexOf(a.layer)-CAP_ANA_LAYERS.indexOf(b.layer)||cmp(String(a.num),String(b.num)));
  }
  /** Vue Fonction : une carte dépliable par fonction. */
  function buildCards(groups, open){
    const R={out:{a:'→',c:'#f0883e',l:_L('ÉMET →'),t:_L('Sortie — la fonction émet l\'échange')},in:{a:'←',c:'#4dd880',l:_L('← REÇOIT'),t:_L('Entrée — la fonction reçoit l\'échange')}};
    return groups.map(g=>{
      const c=fnColor(g.layer), nOut=g.rows.filter(r=>r.role==='out').length, nIn=g.rows.length-nOut;
      const rows=g.rows.map(({x,role,me,other})=>{ const r=R[role], oc=fnColor(other.layer);
        return `<div class="phl-link-row">
          <span style="font-size:10px;color:var(--c-dim);font-family:monospace;min-width:28px;">#${x.num}</span>
          <span title="${r.t}" style="font-size:9px;font-weight:700;color:${r.c};min-width:58px;">${r.l}</span>
          <span class="phl-lr-port-src">${me.portId?pin(role==='out'?'OUT':'IN')+' '+capEsc(me.portName):_L('<i>sans port</i>')}</span>
          <span class="phl-lr-arrow" style="color:${r.c};font-weight:700;">${r.a}</span>
          <span class="phl-lr-link" style="background:${lc(x)};color:#fff;border-color:${lc(x)};cursor:pointer;" title="${capEsc(x.items.map(i=>i.name).join(', ')||_L('Aucun Exchange Item'))}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(x.id)}')">${capEsc(x.name)}</span>
          <span class="phl-lr-arrow" style="color:${r.c};font-weight:700;">${r.a}</span>
          <span class="phl-lr-port-tgt">${other.portId?pin(role==='out'?'IN':'OUT')+' '+capEsc(other.portName):_L('<i>sans port</i>')}</span>
          ${det(other.fnId,fnLabel(other.fnNum,other.fnName),`color:${oc}`,'phl-lr-comp-tgt')}
        </div>`; }).join('');
      const o=open?' open':'';
      return _L(`<div class="phl-comp-card">
        <div class="phl-comp-hdr${o}" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');this.querySelector('.phl-comp-toggle').classList.toggle('open')">
          <span class="phl-comp-badge" style="background:${c};color:${capInk(c)}">${capEsc(capAnaHuman(g.type))}</span>
          <span class="phl-comp-title" style="color:${capTextOn(c)}">${capEsc(fnLabel(g.num,g.name))}</span>
          <span class="phl-comp-cnt">${g.rows.length} échange${g.rows.length>1?'s':''} (${nIn} ← · ${nOut} →)</span>
          <span class="phl-comp-toggle${o}">▶</span>
        </div>
        <div class="phl-comp-body${o}">${rows}</div>
      </div>`);
    }).join('');
  }

  /** Vue Blocs : chaque fonction dessinée comme dans Capella, pins d'entrée à gauche et de sortie à droite ;
   * à côté de chaque pin, l'échange et la fonction distante. */
  function buildBlocks(fns){
    // Échanges reliés directement à une fonction (sans port), indexés une fois par fonction
    const dIn={}, dOut={};
    allLinks.forEach(x=>{ if(!x.tgt.portId) (dIn[x.tgt.fnId]=dIn[x.tgt.fnId]||[]).push(x); if(!x.src.portId) (dOut[x.src.fnId]=dOut[x.src.fnId]||[]).push(x); });
    return `<div class="fex-blocks">${fns.map(f=>{
      // Entrées / sorties : ports réels, puis un pin virtuel par échange relié directement à la fonction (activités OA…)
      const ends=dir=>[...(dir==='IN'?f.ins:f.outs).map(p=>({id:p.id, name:p.name, xs:X.portFes[p.id]||[], real:true})),
        ...((dir==='IN'?dIn:dOut)[f.id]||[]).map(x=>({id:'', name:'', xs:[x], real:false}))];
      const ins=ends('IN'), outs=ends('OUT');
      const gIn=capBlkRows(ins.map(e=>e.xs.length)), gOut=capBlkRows(outs.map(e=>e.xs.length));
      const side=(list,dir)=>list.map((e,i)=>{
        const items=e.xs.map(x=>{ const o=dir==='IN'?x.src:x.tgt;
          return _L(`${det(x.id,x.name,`color:${lc(x)};font-weight:600`)} <span class="fex-dim">${dir==='IN'?_L('de'):_L('vers')}</span> <span class="fex-go" data-go="${capEsc(o.fnId)}" title="Aller au bloc de cette fonction" style="color:${capTextOn(AKC[akOf(o.fnId)])}">${capEsc(fnLabel(o.fnNum,o.fnName))}</span>`); });
        const tip=[e.real?e.name:_L('(échange relié directement à la fonction, sans port)'),...e.xs.map(x=>{ const o=dir==='IN'?x.src:x.tgt; return `${x.name} ${dir==='IN'?_L('de'):_L('vers')} ${o.fnName}`; })].join('\n');
        return capBlkSide(items,_L('<span class="fex-dim"><i>non connecté</i></span>'),(dir==='IN'?gIn:gOut).hs[i],tip);
      }).join('');
      const pins=(list,dir)=>list.map((e,i)=>`<span class="fex-bpin" style="top:${(dir==='IN'?gIn:gOut).tops[i]}px">${e.real?pin(dir,!e.xs.length):_L(`<span class="fex-pin fex-pin-${dir==='IN'?'in':'out'} fex-pin-virt" title="Échange relié directement à la fonction (sans port)">▶</span>`)}<span class="fex-pname">${capEsc(e.name)}</span></span>`).join('');
      const ak=akOf(f.id), akT={sys:_L('allouée au système'),act:_L('allouée à un acteur'),none:f.leaf?_L('non allouée'):_L('fonction mère (non allouée)')}[ak];
      return `<div class="fex-blk" data-fn="${capEsc(f.id)}" style="--fex-h:${Math.max(74,44+Math.max(gIn.total,gOut.total))}px">
        <div class="fex-side fex-side-in">${side(ins,'IN')}</div>
        <div class="fex-box fex-k-${ak}" data-layer="${f.layer}" title="${capEsc(capAnaHuman(f.type))} — ${f.layer} — ${akT}${f.alloc.length?' : '+capEsc(f.alloc.map(a=>a.name).join(', ')):''}">
          <div class="fex-box-t">${OAV?'<span class="fex-oa-ic">OA</span>':''}${det(f.id,fnLabel(f.num,f.name))}</div>
          ${attachHtml(f)}
          <div class="fex-pins-in">${pins(ins,'IN')}</div><div class="fex-pins-out">${pins(outs,'OUT')}</div>
          ${!ins.length&&!outs.length?_L('<div class="fex-box-empty">aucun port ni échange</div>'):''}
        </div>
        <div class="fex-side fex-side-out">${side(outs,'OUT')}</div>
      </div>`;
    }).join('')}</div>`;
  }

  /** Rattachement affiché en petit sous le titre d'un bloc : composants ou acteurs auxquels la fonction est allouée
   * (clic : leur bloc dans la vue de leur couche), sinon la fonction mère (clic : son bloc).
   * @param {object} f - Fonction @returns {string} HTML */
  function attachHtml(f){
    if(f.alloc.length) return `<div class="fex-att">${f.alloc.map(a=>_L(`<span class="fex-att-go" data-comp="${capEsc(a.id)}" title="Allouée à « ${capEsc(a.name)} » — clic : son bloc">${a.actor?'👤':'▣'} ${capEsc(a.name)}</span>`)).join(' · ')}</div>`;
    const pf=f.parentId&&X.fnById[f.parentId];
    return pf?_L(`<div class="fex-att"><span class="fex-dim">dans</span> <span class="fex-att-go" data-go="${capEsc(pf.id)}" title="Fonction mère — clic : son bloc">ƒ ${capEsc(fnLabel(pf.num,pf.name))}</span></div>`):'';
  }

  /** Matrice fonction × fonction (CAP_FEX_MX_MAX fonctions au plus, les plus connectées). */
  function buildMatrix(list){
    const deg={}; list.forEach(x=>{ deg[x.src.fnId]=(deg[x.src.fnId]||0)+1; deg[x.tgt.fnId]=(deg[x.tgt.fnId]||0)+1; });
    const ids=Object.keys(deg); let keep=null, note='';
    if(ids.length>CAP_FEX_MX_MAX){
      keep=new Set(ids.sort((a,b)=>deg[b]-deg[a]).slice(0,CAP_FEX_MX_MAX));
      note=_L(`<div class="cap-mx-hint">⚠ ${ids.length} fonctions : pour rester fluide, la matrice en affiche ${CAP_FEX_MX_MAX} (les plus connectées). Filtrez par couche ou par fonction pour voir les autres.</div>`);
    }
    const L=list.filter(x=>!keep||(keep.has(x.src.fnId)&&keep.has(x.tgt.fnId))).map(x=>({x, dir:'fwd',
      src:{pcId:x.src.fnId, pcName:fnLabel(x.src.fnNum,x.src.fnName), layer:x.src.layer}, tgt:{pcId:x.tgt.fnId, pcName:fnLabel(x.tgt.fnNum,x.tgt.fnName), layer:x.tgt.layer}}));
    const mx=capMatrixBuild(L,{directed:true, unit:_L('échanges'), noun:_L('fonctions'), corner:_L('Source ↓ / Cible →'), colorOf:e=>capTextOn(fnColor(e.layer))});
    container._fexCells=mx.cells;
    return note+mx.html;
  }

  /** Pagination : liste de la page courante et barre ◀ ▶. */
  function paged(items, unit){
    const pages=Math.max(1,Math.ceil(items.length/CAP_FEX_PAGE));
    if(st.page>=pages) st.page=pages-1;
    const from=st.page*CAP_FEX_PAGE, slice=items.slice(from,from+CAP_FEX_PAGE);
    const bar=pages>1?_L(`<div class="fex-pager"><button class="cap-lf-btn" data-pg="-1"${st.page?'':' disabled'}>◀</button>
      <span>${unit} ${from+1}–${from+slice.length} sur ${items.length} · page ${st.page+1} / ${pages}</span>
      <button class="cap-lf-btn" data-pg="1"${st.page<pages-1?'':' disabled'}>▶</button></div>`):'';
    return {slice, bar};
  }

  /** Contenu de la vue selon le mode (forceView : rendu complet sans pagination pour les rapports). */
  function buildContent(list, forceView){
    const view=forceView||st.view, all=!!forceView;
    if(view==='diag') return capDiagHtml(capFexChecks(st.layer));
    if(view==='block'){
      const fns=getFns();
      if(!fns.length) return _L('<div class="phl-empty">Aucune fonction ne correspond au filtre.</div>');
      if(all) return buildBlocks(fns);
      const p=paged(fns,W.Fns), bf=st.back&&X.fnById[st.back];
      const back=bf?_L(`<div class="fex-backbar"><button class="cap-lf-btn" id="fex-back" title="Revenir au bloc d'où vous venez">↩ Revenir à « ${capEsc(fnLabel(bf.num,bf.name))} »</button></div>`):'';
      return capBlkThemeHint()+back+p.bar+buildBlocks(p.slice)+p.bar;
    }
    if(!list.length) return _L('<div class="phl-empty">Aucun functional exchange ne correspond au filtre.</div>');
    if(view==='matrix') return buildMatrix(list);
    if(view==='card'){
      const groups=groupByFn(list);
      if(all) return buildCards(groups,true);
      const p=paged(groups,W.Fns); return p.bar+buildCards(p.slice)+p.bar;
    }
    if(all) return buildLines(list);
    const p=paged(list,_L('Échanges')); return p.bar+buildLines(p.slice)+p.bar;
  }

  /** Affiche le bloc d'une fonction (Vue Blocs) : change de page si besoin, relâche les filtres qui la masquent,
   * fait défiler jusqu'au bloc et le met en évidence ; « ↩ Revenir » ramène au bloc de départ.
   * @param {string} id - Fonction cible
   * @param {string} [from] - Fonction de départ (pour le retour)
   */
  function gotoFn(id, from){
    let fns=getFns(), i=fns.findIndex(f=>f.id===id);
    if(i<0){   // masquée par les filtres : on les relâche
      const f=X.fnById[id]; if(!f) return;
      st.fnFilter=''; st.nameFilter=''; st.ak=new Set(['sys','act','none']); st.who=''; st.withPorts=false;
      if(st.layer!=='all'&&st.layer!==f.layer) st.layer=f.layer;
      fns=getFns(); i=fns.findIndex(f=>f.id===id); if(i<0) return;
      st.page=Math.floor(i/CAP_FEX_PAGE); st.back=from||null; render();
    } else { st.page=Math.floor(i/CAP_FEX_PAGE); st.back=from||null; updateContent(); }
    const el=container.querySelector(`.fex-blk[data-fn="${CSS.escape(id)}"]`); if(!el) return;
    el.scrollIntoView({block:'center'}); el.classList.add('fex-flash'); setTimeout(()=>el.classList.remove('fex-flash'),1800);
  }

  /** Branche la pagination et les cellules de la matrice du contenu courant. */
  function wireMain(){
    const main=container.querySelector('#fex-main'); if(!main) return;
    main.querySelectorAll('[data-go]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); gotoFn(a.dataset.go, a.closest('.fex-blk')?.dataset.fn); });
    main.querySelectorAll('[data-comp]').forEach(a=>a.onclick=ev=>{ ev.stopPropagation(); capCbOpenComp(a.dataset.comp); });
    main.querySelector('#fex-back')?.addEventListener('click',()=>{ const b=st.back; st.back=null; if(b) gotoFn(b); });
    main.querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click',()=>{ st.page+=+b.dataset.pg; updateContent(); container.scrollTop=0; }));
    if(st.view!=='matrix') return;
    main.querySelectorAll('.cap-mx-cell').forEach(td=>td.addEventListener('click',()=>{
      main.querySelectorAll('.cap-mx-cell.sel').forEach(x=>x.classList.remove('sel')); td.classList.add('sel');
      const ls=((container._fexCells||{})[td.dataset.cell]||[]).map(l=>l.x);
      main.querySelector('.cap-mx-detail').innerHTML=`<div style="font-size:11px;color:var(--c-dim);margin-bottom:6px">${td.title}</div>`+buildLines(ls);
    }));
  }

  /** Texte du compteur (échanges ou fonctions selon la vue). */
  function counterText(f){
    return st.view==='block'?`${getFns().length}/${X.fns.length} ${W.fns}`:_L(`${f.length}/${allLinks.length} échange${allLinks.length>1?'s':''}`);
  }
  /** Rafraîchit le contenu et le compteur sans reconstruire la barre. */
  function updateContent(){
    keepView();
    const f=getFiltered();
    const ctr=container.querySelector('#fex-counter'); if(ctr) ctr.textContent=counterText(f);
    const main=container.querySelector('#fex-main'); if(main) main.innerHTML=buildContent(f);
    wireMain();
  }

  /** Rapport HTML autonome : vue courante, ou toutes les vues en onglets (filtres appliqués, sans pagination). */
  function exportHtml(all){
    const f=getFiltered();
    const VIEWS=[['block',_L('◧ Vue Blocs')],['line',_L('≡ Vue Ligne')],['card',_L(`▣ Vue ${W.Fn}`)],['matrix',_L('▦ Matrice')],['diag',_L('🩺 Contrôles')]];
    const keys=all?VIEWS.map(v=>v[0]):[st.view];
    const tabs=VIEWS.filter(v=>keys.includes(v[0])||(v[0]==='line'&&keys.includes('matrix'))).map(([k,label])=>({key:k,label,html:buildContent(f,k)}));
    const cells={}; Object.entries(container._fexCells||{}).forEach(([k,ls])=>cells[k]=ls.map(l=>l.x.id));
    const fi=[st.layer!=='all'&&_L(`couche ${st.layer}`), akOn()&&_L('allocation : ')+[...st.ak].map(k=>CAP_FN_AK[k].l).join(' + '), st.who&&_L(`allocataire « ${((who.act.get(st.who)||who.comp.get(st.who)||{}).name||'')} »`),st.fnFilter&&_L(`fonction « ${st.fnFilter} »`),st.nameFilter&&_L(`échange « ${st.nameFilter} »`)].filter(Boolean).join(', ');
    capHtmlReport({title:OAV?_L('🟨 Operational Analysis — activités et interactions'):_L('ƒ⇆ Functional Exchanges'), subtitle:_L(`${f.length}/${allLinks.length} échanges${fi?_L(' · filtres : ')+fi:''}`), tabs, active:st.view, cells,
      filename:(OAV?'operational-analysis':'functional-exchanges')+(all?_L('-rapport.html'):`-${st.view}.html`)});
  }

  /** Export CSV enrichi (53) : un échange par ligne (ou une ligne par port en Vue Blocs). */
  function exportCsv(){
    if(st.view==='block'&&!OAV){   // en OA, pas de ports : export des interactions
      const rows=[]; getFns().forEach(f=>[...f.ins.map(p=>({p,d:_L('Entrée')})),...f.outs.map(p=>({p,d:_L('Sortie')}))].forEach(({p,d})=>{
        const xs=X.portFes[p.id]||[];
        if(!xs.length) rows.push([f.layer,f.num,capCx(f.name,f.id),d,capCx(p.name,p.id),'','','']);
        xs.forEach(x=>{ const o=d===_L('Entrée')?x.src:x.tgt; rows.push([f.layer,f.num,capCx(f.name,f.id),d,capCx(p.name,p.id),capCx(x.name,x.id),capCx(o.fnName,o.fnId),capCx(o.portName,o.portId)]); });
      }));
      capCsvExport('functional-exchanges-ports.csv',[_L('Couche'),'N°',_L('Fonction'),_L('Sens'),_L('Port'),_L('Functional Exchange'),_L('Fonction distante'),_L('Port distant')],rows);
      return;
    }
    capCsvExport(OAV?'operational-interactions.csv':'functional-exchanges.csv',['N°',_L('Couche'),_L('Fonction source'),_L('Port source'),_L('Functional Exchange'),_L('Port cible'),_L('Fonction cible'),_L('Exchange Items'),_L('Component Exchanges'),_L('Chaînes')],
      getFiltered().map(x=>[x.num,x.layer,capCx(x.src.fnName,x.src.fnId),capCx(x.src.portName,x.src.portId),capCx(x.name,x.id),capCx(x.tgt.portName,x.tgt.portId),capCx(x.tgt.fnName,x.tgt.fnId),capCxList(x.items),capCxList(x.ces),capCxList(x.chains)]));
  }

  /** Construit toute la vue (barre, filtres, contenu, écouteurs). */
  function render(){
    keepView();
    who=whoCompute();
    if(st.who&&!who.act.has(st.who)&&!who.comp.has(st.who)) st.who='';   // allocataire absent de la couche choisie
    const f=getFiltered();
    const V=[['block',_L('◧ Vue Blocs'),OAV?_L('Activités opérationnelles dessinées comme dans Capella (jaune), interactions entrantes à gauche, sortantes à droite ; entité ou acteur porteur en haut du bloc (clic : son détail)'):_L('Fonctions dessinées comme dans Capella : pins d\'entrée (verts) à gauche, de sortie (orange) à droite ; vert = système, bleu = acteur, gris = non allouée')],
      ['line',_L('≡ Vue Ligne'),_L(`Un échange par ligne : ${W.fn} source ▶ échange ▶ ${W.fn} cible`)],['card',_L(`▣ Vue ${W.Fn}`),_L(`Échanges regroupés par ${W.fn}`)],
      ['matrix',_L('▦ Matrice'),_L('Matrice fonction × fonction (ligne = source, colonne = cible), 100 fonctions au plus')],['diag',_L('🩺 Contrôles'),_L('Ports orphelins, échanges sans Exchange Item, fonctions sans échange…')]];
    container.innerHTML=_L(`
      <div class="phl-toggle-bar">
        ${V.map(([k,l,t])=>`<button class="phl-toggle-btn${st.view===k?' active':''}" data-pv="${k}" title="${t}">${l}</button>`).join('')}
        <span id="fex-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace;">${counterText(f)}</span>
        <span style="display:flex;gap:4px;margin-left:12px;flex-wrap:wrap;">
          ${OAV?'':[['all',_L('Toutes'),allLinks.length],...layersPresent.map(k=>[k,k,allLinks.filter(x=>x.layer===k).length])]
            .map(([k,lab,n])=>_L(`<button class="cap-lf-btn fex-layer-btn${st.layer===k?' active':''}" data-ly="${k}" title="Échanges de la couche">${lab} (${n})</button>`)).join('')}
        </span>
      </div>
      <div class="phl-filter-bar" style="margin-bottom:8px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;">${OAV?_L('🟨 Activité :'):_L('ƒ Fonction :')}</span>
        <input id="fex-fn-input" type="text" class="phl-filter-input" placeholder="Filtrer par ${W.fn}…" value="${capEsc(st.fnFilter)}" style="width:200px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;margin-left:8px;">🔍 Échange :</span>
        <input id="fex-name-input" type="text" class="phl-filter-input" placeholder="Échange ou Exchange Item…" value="${capEsc(st.nameFilter)}" style="width:200px;">
        ${st.view==='block'?_L(`<label style="font-size:11px;color:var(--c-dim);display:flex;align-items:center;gap:4px;margin-left:8px;" title="Masquer les fonctions sans port ni échange (fonctions mères le plus souvent)"><input type="checkbox" id="fex-withports"${st.withPorts?' checked':''}> avec ports ou échanges</label>`):''}
        ${(()=>{ const base=X.fns.filter(fn=>(st.layer==='all'||fn.layer===st.layer)&&!(st.view==='block'&&st.withPorts&&!fn.ins.length&&!fn.outs.length&&!fn.fesIn.length&&!fn.fesOut.length)&&whoFn(fn.id)), n=k=>base.filter(fn=>akOf(fn.id)===k).length;
          return _L(`<span class="tb-grp ana-ak" style="margin-left:8px" title="Clic : afficher / masquer · double-clic : uniquement celle-ci (ou tout réafficher)${st.view==='block'?'':_L(' — un échange est gardé si l\'une de ses deux fonctions correspond')}"><span class="tb-grp-l">Allocation</span>${['sys','act','none'].map(k=>_L(`<label class="ana-ak-chip${st.ak.has(k)?' on':''}" style="--c:${CAP_FN_AK[k].c}" title="${AKL(k).tip} — double-clic : uniquement celles-ci"><input type="checkbox" data-fak="${k}"${st.ak.has(k)?' checked':''}>${AKL(k).i} ${AKL(k).l} <b>${n(k)}</b></label>`)).join('')}${whoSelect()}</span>`); })()}
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="phl-export-btn" id="fex-exp-csv">⬇ CSV</button>
          <button class="phl-export-btn" id="fex-exp-html" title="Rapport HTML de la vue affichée (toutes les pages)">⬇ HTML</button>
          <button class="phl-export-btn" id="fex-exp-html-all" title="Rapport HTML à onglets : toutes les vues">⬇ HTML (toutes les vues)</button>
        </div>
      </div>
      <div id="fex-main">${buildContent(f)}</div>`);
    container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.addEventListener('click',()=>{ st.view=b.dataset.pv; st.page=0; render(); }));
    container.querySelectorAll('.fex-layer-btn').forEach(b=>b.addEventListener('click',()=>{ st.layer=b.dataset.ly; st.page=0; render(); }));
    container.querySelector('#fex-withports')?.addEventListener('change',e=>{ st.withPorts=e.target.checked; st.page=0; render(); });
    container.querySelector('#fex-who')?.addEventListener('change',e=>{ st.who=e.target.value;
      if(st.who) st.ak.add(who.act.has(st.who)?'act':'sys');   // la nature correspondante reste visible
      st.page=0; render(); });
    container.querySelector('#fex-who-x')?.addEventListener('click',()=>{ st.who=''; st.page=0; render(); });
    container.querySelectorAll('[data-fak]').forEach(cb=>{
      cb.onchange=()=>{ if(cb.checked) st.ak.add(cb.dataset.fak); else st.ak.delete(cb.dataset.fak); st.page=0; render(); };
      cb.parentElement.ondblclick=ev=>{ ev.preventDefault(); const k=cb.dataset.fak; st.ak=(st.ak.size===1&&st.ak.has(k))?new Set(['sys','act','none']):new Set([k]); st.page=0; render(); };
    });
    let deb;
    [['#fex-fn-input','fnFilter'],['#fex-name-input','nameFilter']].forEach(([sel,k])=>container.querySelector(sel)?.addEventListener('input',e=>{
      st[k]=e.target.value; st.page=0; clearTimeout(deb); deb=setTimeout(updateContent,150); }));
    container.querySelector('#fex-exp-csv')?.addEventListener('click',exportCsv);
    container.querySelector('#fex-exp-html')?.addEventListener('click',()=>exportHtml(false));
    container.querySelector('#fex-exp-html-all')?.addEventListener('click',()=>exportHtml(true));
    wireMain();
  }
  render();
  if(!OAV&&_capFexGo){ const g=_capFexGo; _capFexGo=null; if(st.view!=='block'){ st.view='block'; render(); } gotoFn(g); }
}
