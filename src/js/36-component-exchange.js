/** Réinitialise caches et états de la vue Analyses (appelé au chargement d'un nouveau modèle). */
function capAnaReset(){
  _capAnaCache={};
  const c=document.getElementById('cap-view-analyses'); if(c){ c.innerHTML=''; c._built=false; }
}

/** Rend la vue Component Exchange — même structure que Physical Link (≡ Ligne / ▣ Composant,
 * filtres, exports CSV/HTML) mais pour les ComponentExchange (source/target → ComponentPort
 * → composant parent). Coloration adaptative par TYPE de composant (thème clair/sombre). */
let _capCompExView = 'line';
function capRenderCompExchange(){
  const container=document.getElementById('cap-view-compex'); if(!container) return;
  const allLinks=capComputeCompExchanges();

  const linkNumMap={};
  let linkNum=1;
  allLinks.forEach(l=>{ if(!linkNumMap[l.linkId]) linkNumMap[l.linkId]=linkNum++; });

  const LINK_COLORS=[
    {bg:'#0ea5e9',fg:'#fff'},{bg:'#f97316',fg:'#fff'},{bg:'#22c55e',fg:'#fff'},
    {bg:'#a855f7',fg:'#fff'},{bg:'#ef4444',fg:'#fff'},{bg:'#eab308',fg:'#000'},
    {bg:'#06b6d4',fg:'#fff'},{bg:'#ec4899',fg:'#fff'},{bg:'#84cc16',fg:'#000'},
    {bg:'#f59e0b',fg:'#000'},{bg:'#6366f1',fg:'#fff'},{bg:'#14b8a6',fg:'#fff'},
  ];
  const linkColorMap={};
  let colorIdx=0;
  allLinks.forEach(l=>{ if(!linkColorMap[l.linkName]){linkColorMap[l.linkName]=LINK_COLORS[colorIdx%LINK_COLORS.length];colorIdx++;} });

  if(!container._cex) container._cex={nameFilter:'',nodeFilter:'',view:_capCompExView};
  const st=container._cex;
  if(!st.dirFilter) st.dirFilter='all';   // all | fwd | rev | bi | unset | warn
  if(!st.kindFilter) st.kindFilter='all'; // all | UNSET | ASSEMBLY | DELEGATION | FLOW
  const kindsPresent=[...new Set(allLinks.map(l=>l.kind))].sort();

  // Coloration par TYPE de composant, adaptative clair/sombre (même approche que Physical Link)
  const isLight = capIsLight();
  const compColor = (type, nature) => {
    if (type==='PhysicalComponent') return isLight ? (nature==='NODE'?'#7a6500':nature==='BEHAVIOR'?'#1a4f8a':'#7c28d8')
                                                   : (nature==='NODE'?'#fffcb7':nature==='BEHAVIOR'?'#96b1da':'#c084fc');
    const dark  = {SystemComponent:'#58a6ff', LogicalComponent:'#4dd880', Entity:'#f0883e',
                   SystemActor:'#e3b341', LogicalActor:'#e3b341', PhysicalActor:'#e3b341'};
    const light = {SystemComponent:'#1a4f8a', LogicalComponent:'#1a7a3a', Entity:'#a04d00',
                   SystemActor:'#7a6500', LogicalActor:'#7a6500', PhysicalActor:'#7a6500'};
    return (isLight?light:dark)[type] || (isLight?'#7c28d8':'#c084fc');
  };
  const projectName=(cap_xmlDoc&&cap_xmlDoc.documentElement)?(cap_xmlDoc.documentElement.getAttribute('name')||'Capella Project'):'Capella Project';

  /** Retourne les liens/exchanges filtrés selon les critères de recherche saisis.
   */
  function getFiltered(){
    const nf=st.nameFilter.trim().toLowerCase();
    const ndf=st.nodeFilter.trim().toLowerCase();
    return allLinks.filter(l=>{
      if(st.dirFilter==='warn' ? !l.warn : (st.dirFilter!=='all' && l.dir!==st.dirFilter)) return false;
      if(st.kindFilter!=='all' && l.kind!==st.kindFilter) return false;
      if(nf && !l.linkName.toLowerCase().includes(nf)
            && !l.fes.some(f=>f.name.toLowerCase().includes(nf))
            && !l.items.some(i=>i.name.toLowerCase().includes(nf))) return false;
      if(ndf && !l.src.pcName.toLowerCase().includes(ndf) && !l.tgt.pcName.toLowerCase().includes(ndf)) return false;
      return true;
    });
  }

  /** Échappe une valeur pour l'export CSV (guillemets doublés, encadrement).
   */
  function csvEsc(s){ return '"'+String(s||'').replace(/"/g,'""')+'"'; }

  /** Construit le HTML du contenu de la vue selon le mode actif (Ligne ou Composant).
   */
  /** Badge coloré d'orientation de port (UNSET, IN, OUT, INOUT).
   * @param {string} o - Orientation normalisée
   * @returns {string} HTML du badge
   */
  function orientBadge(o){
    const os=CAP_ORIENT_STYLE[o]||CAP_ORIENT_STYLE.UNSET;
    return `<span title="${os.t}" style="font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;border:1px solid ${os.c};color:${os.c};vertical-align:middle;margin-left:4px;${o==='UNSET'?'opacity:.6;':''}">${o==='INOUT'?'⇄ INOUT':o}</span>`;
  }
  /** Badge du kind de l'exchange (ASSEMBLY, DELEGATION, FLOW ; rien si UNSET). */
  function kindBadge(k){
    return k&&k!=='UNSET'?`<span title="Kind du Component Exchange" style="font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;background:var(--c-bg3);border:1px solid var(--c-border);color:var(--c-dim);">${capEsc(k)}</span>`:'';
  }
  /** Icône d'alerte (incohérence d'orientation). */
  function warnIcon(l){ return l.warn?`<span title="⚠ ${capEsc(l.warn)}" style="color:var(--c-warn,#e3b341);font-size:12px;cursor:help;">⚠</span>`:''; }
  /** Lien cliquable ouvrant le panneau de détail d'un élément. */
  function detLink(id,label,extra){ return `<span class="cex-det" style="cursor:pointer;${extra||''}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(id)}')">${capEsc(label)}</span>`; }
  /** Ligne d'informations secondaires : FE alloués, Exchange Items, Physical Links porteurs. */
  function infoLine(l){
    const parts=[];
    if(l.fes.length) parts.push(`<span title="Functional Exchanges alloués">ƒ ${l.fes.map(f=>detLink(f.id,f.name)).join(', ')}</span>`);
    if(l.items.length) parts.push(`<span title="Exchange Items transportés">▤ ${l.items.map(i=>detLink(i.id,i.name)).join(', ')}</span>`);
    if(l.pls.length) parts.push(`<span title="Physical Links porteurs">🔌 ${l.pls.map(pl=>detLink(pl.id,pl.name)).join(', ')}</span>`);
    if(!l.fes.length) parts.push(`<span title="Aucun Functional Exchange alloué à cet exchange" style="color:var(--c-warn,#e3b341)">∅ FE</span>`);
    return parts.length?`<div style="font-size:9.5px;color:var(--c-dim);display:flex;flex-wrap:wrap;gap:2px 10px;justify-content:center;max-width:100%;">${parts.join('')}</div>`:'';
  }

  /** Construit le HTML du contenu de la vue selon le mode actif (Ligne ou Composant).
   */
  function buildContent(filtered, forceView){
    const view=forceView||st.view;
    if(view==='diag') return buildDiag(filtered);
    if(!filtered.length) return '<div class="phl-empty">Aucun component exchange ne correspond au filtre.</div>';
    if(view==='matrix'){
      const mx=capMatrixBuild(filtered,{directed:true, unit:'exchanges', colorOf:e=>compColor(e.pcType,e.pcNature)});
      container._cexCells=mx.cells; return mx.html;
    }
    if(view==='line'){
      return filtered.map(l=>{
        const sc=compColor(l.src.pcType,l.src.pcNature), tc=compColor(l.tgt.pcType,l.tgt.pcNature);
        const lc=linkColorMap[l.linkName]||{bg:'#8b949e',fg:'#fff'};
        const num=linkNumMap[l.linkId]||'';
        const dash=l.dir==='unset'?`background:repeating-linear-gradient(90deg,${lc.bg} 0 4px,transparent 4px 7px);`:`background:${lc.bg};`;
        const arrL=(l.dir==='rev'||l.dir==='bi')?`<span style="font-size:14px;line-height:1;color:${lc.bg};margin-right:-2px;">◀</span>`:'';
        const arrR=(l.dir==='fwd'||l.dir==='bi')?`<span style="font-size:14px;line-height:1;color:${lc.bg};margin-left:-2px;">▶</span>`:'';
        const tip=l.dir==='rev'?`${l.tgt.pcName} → ${l.src.pcName}`:l.dir==='bi'?`${l.src.pcName} ⇄ ${l.tgt.pcName}`:l.dir==='unset'?'Sens non défini':`${l.src.pcName} → ${l.tgt.pcName}`;
        return`<div class="phl-line">
          <div class="phl-cell phl-cell-pc">
            ${detLink(l.src.pcId,l.src.pcName,`color:${sc}`).replace('class="cex-det"','class="cex-det phl-pc-name"')}
            <span class="phl-port-name">⬦ ${capEsc(l.src.portName)}${orientBadge(l.src.portOrient)}</span>
          </div>
          <div class="phl-cell phl-cell-link" style="padding:6px 14px;gap:2px;">
            <span style="display:flex;gap:5px;align-items:center;"><span style="font-size:10px;color:var(--c-dim);font-family:monospace;">#${num}</span>${kindBadge(l.kind)}<span style="font-size:9px;color:var(--c-dim);" title="${CAP_CEX_DIRS[l.dir].tip}">${CAP_CEX_DIRS[l.dir].label}</span>${warnIcon(l)}</span>
            <span style="display:flex;align-items:center;gap:0;width:100%;justify-content:center;" title="Sens du signal : ${capEsc(tip)}">
              ${arrL}
              <span style="flex:1;max-width:40px;height:2px;${dash}"></span>
              <span class="phl-link-badge" style="background:${lc.bg};color:${lc.fg};border-color:${lc.bg};cursor:pointer;" onclick="capOpenDetailById('${capEsc(l.linkId)}')">${capEsc(l.linkName)}</span>
              <span style="flex:1;max-width:40px;height:2px;${dash}"></span>
              ${arrR}
            </span>
            ${infoLine(l)}
          </div>
          <div class="phl-cell phl-cell-pc" style="align-items:flex-end">
            ${detLink(l.tgt.pcId,l.tgt.pcName,`color:${tc}`).replace('class="cex-det"','class="cex-det phl-pc-name"')}
            <span class="phl-port-name">⬦ ${capEsc(l.tgt.portName)}${orientBadge(l.tgt.portOrient)}</span>
          </div>
        </div>`;
      }).join('');
    } else {
      const byPC={};
      filtered.forEach(l=>{
        // role : 'out' = émission, 'in' = réception, 'bi' = bidirectionnel, 'unset' = non orienté
        // (du point de vue du composant de la carte, en tenant compte du sens effectif l.dir)
        const roleOf=isSrc=>l.dir==='bi'?'bi':l.dir==='unset'?'unset':((l.dir==='fwd')===isSrc?'out':'in');
        const add=(me,other,isSrc)=>{
          if(!byPC[me.pcId]) byPC[me.pcId]={pcName:me.pcName,pcId:me.pcId,pcType:me.pcType,nature:me.pcNature,links:[]};
          byPC[me.pcId].links.push({role:roleOf(isSrc),l,portSrc:me.portName,orSrc:me.portOrient,pcSrc:me.pcName,
            portTgt:other.portName,orTgt:other.portOrient,pcTgt:other.pcName,pcTgtId:other.pcId,pcTgtType:other.pcType,pcTgtNature:other.pcNature});
        };
        add(l.src,l.tgt,true); add(l.tgt,l.src,false);
      });
      const ROLE={
        out:  {arrow:'→', color:'#4dd880', label:'ÉMET →',   tip:'Émission — ce composant envoie le signal'},
        in:   {arrow:'←', color:'#f0883e', label:'← REÇOIT', tip:'Réception — ce composant reçoit le signal'},
        bi:   {arrow:'⇄', color:'#a371f7', label:'⇄ ÉCHANGE',tip:'Bidirectionnel — port INOUT'},
        unset:{arrow:'—', color:'#8b949e', label:'? N.O.',   tip:'Non orienté — aucun port IN/OUT/INOUT'},
      };
      return Object.values(byPC).map(pc=>{
        const c=compColor(pc.pcType,pc.nature);
        const cnt={out:0,in:0,bi:0,unset:0}; pc.links.forEach(lk=>cnt[lk.role]++);
        const rows=pc.links.map(lk=>{
          const l=lk.l, R=ROLE[lk.role];
          const lc=linkColorMap[l.linkName]||{bg:'#8b949e',fg:'#fff'};
          const tc=compColor(lk.pcTgtType,lk.pcTgtNature);
          const num=linkNumMap[l.linkId]||'';
          return`<div class="phl-link-row">
            <span style="font-size:10px;color:var(--c-dim);font-family:monospace;min-width:28px;">#${num}</span>
            <span title="${R.tip}" style="font-size:9px;font-weight:700;color:${R.color};min-width:58px;">${R.label}</span>
            <span style="font-size:11px;font-weight:600;color:${c};min-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${capEsc(lk.pcSrc||pc.pcName)}">${capEsc(lk.pcSrc||pc.pcName)}</span>
            <span class="phl-lr-port-src">⬦ ${capEsc(lk.portSrc)}${orientBadge(lk.orSrc)}</span>
            <span class="phl-lr-arrow" style="color:${R.color};font-weight:700;">${R.arrow}</span>
            <span class="phl-lr-link" style="background:${lc.bg};color:${lc.fg};border-color:${lc.bg};cursor:pointer;" title="${capEsc([l.kind!=='UNSET'?l.kind:'',l.fes.length?'FE : '+l.fes.map(f=>f.name).join(', '):'',l.items.length?'Items : '+l.items.map(i=>i.name).join(', '):'',l.pls.length?'PL : '+l.pls.map(p=>p.name).join(', '):''].filter(Boolean).join('\n'))}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(l.linkId)}')">${capEsc(l.linkName)}</span>
            <span class="phl-lr-arrow" style="color:${R.color};font-weight:700;">${R.arrow}</span>
            <span class="phl-lr-port-tgt">⬦ ${capEsc(lk.portTgt)}${orientBadge(lk.orTgt)}</span>
            ${detLink(lk.pcTgtId,lk.pcTgt,`color:${tc}`).replace('class="cex-det"','class="cex-det phl-lr-comp-tgt"')}
            ${warnIcon(l)}
          </div>`;
        }).join('');
        const humanType=(CAP_HUMAN_NAMES[pc.pcType]||{}).h||pc.pcType;
        const cntTxt=[cnt.out&&`${cnt.out} →`,cnt.in&&`${cnt.in} ←`,cnt.bi&&`${cnt.bi} ⇄`,cnt.unset&&`${cnt.unset} ?`].filter(Boolean).join(' · ');
        return`<div class="phl-comp-card">
          <div class="phl-comp-hdr" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');this.querySelector('.phl-comp-toggle').classList.toggle('open')">
            <span class="phl-comp-badge" style="background:${c};color:#fff">${capEsc(humanType)}</span>
            <span class="phl-comp-title" style="color:${c}">${capEsc(pc.pcName)}</span>
            <span class="phl-comp-cnt" title="émis · reçus · bidirectionnels · non orientés">${pc.links.length} exchange${pc.links.length>1?'s':''} (${cntTxt})</span>
            <span class="phl-comp-toggle">▶</span>
          </div>
          <div class="phl-comp-body">${rows}</div>
        </div>`;
      }).join('');
    }
  }

  /** Rapport de contrôles des Component Exchanges (sur le jeu filtré) et des ComponentPorts.
   * @param {object[]} filtered - Exchanges retenus par les filtres
   * @returns {string} HTML du rapport
   */
  function buildDiag(filtered){
    const exRow=l=>`<tr><td>#${linkNumMap[l.linkId]||''}</td><td>${detLink(l.linkId,l.linkName,'font-weight:600')}</td><td>${detLink(l.src.pcId,l.src.pcName)} <span style="color:var(--c-dim)">⬦ ${capEsc(l.src.portName)}</span>${orientBadge(l.src.portOrient)}</td><td>${detLink(l.tgt.pcId,l.tgt.pcName)} <span style="color:var(--c-dim)">⬦ ${capEsc(l.tgt.portName)}</span>${orientBadge(l.tgt.portOrient)}</td><td>${l.layer}</td></tr>`;
    const exCols=['N°','Component Exchange','Source','Cible','Couche'];
    const ports=(allLinks.allPorts||[]).filter(p=>!p.connected)
      .filter(p=>!st.nodeFilter.trim()||p.pcName.toLowerCase().includes(st.nodeFilter.trim().toLowerCase()));
    return capDiagHtml([
      {icon:'∅', title:'Exchanges sans Functional Exchange alloué', tip:'Aucune ComponentExchangeFunctionalExchangeAllocation', cols:exCols, items:filtered.filter(l=>!l.fes.length).map(exRow)},
      {icon:'⭘', title:'Ports orphelins (ComponentPort sans exchange)', tip:'Port défini sur un composant mais relié à aucun Component Exchange', cols:['Composant','Port','Orientation','Couche'],
        items:ports.map(p=>`<tr><td>${detLink(p.pcId,p.pcName,'font-weight:600')}</td><td>${detLink(p.portId,p.portName)}</td><td>${orientBadge(p.orient)}</td><td>${p.layer}</td></tr>`)},
      {icon:'⚠', title:'Orientations de ports incohérentes', tip:'OUT→OUT ou IN→IN hors délégation', cols:exCols, items:filtered.filter(l=>l.warn).map(exRow)},
      {icon:'?', title:'Exchanges non orientés', tip:'Les deux ports sont UNSET : le sens du flux est inconnu', cols:exCols, items:filtered.filter(l=>l.dir==='unset').map(exRow)},
      {icon:'🔌', title:'Exchanges de couche PA non alloués à un Physical Link', tip:'Aucune ComponentExchangeAllocation depuis un PhysicalLink', cols:exCols, items:filtered.filter(l=>l.layer==='PA'&&!l.pls.length&&l.kind!=='DELEGATION').map(exRow)},
    ]);
  }

  /** Exporte un rapport HTML autonome : vue courante seule, ou toutes les vues en onglets (filtres appliqués).
   * @param {boolean} all - true : toutes les vues
   */
  function exportHtml(all){
    const f=getFiltered();
    const VIEWS=[['line','≡ Vue Ligne'],['card','▣ Vue Composant'],['matrix','▦ Matrice'],['diag','🩺 Contrôles']];
    const keys=all?VIEWS.map(v=>v[0]):[st.view];
    // Vue Ligne : une ligne par exchange marquée data-lid (utilisée par la matrice du rapport)
    const lineHtml=f.length?f.map(l=>`<div data-lid="${capEsc(l.linkId)}">${buildContent([l],'line')}</div>`).join(''):buildContent(f,'line');
    const tabs=VIEWS.filter(v=>keys.includes(v[0])||(v[0]==='line'&&keys.includes('matrix'))).map(([k,label])=>({key:k,label,
      html:k==='line'?lineHtml:k==='card'?buildContent(f,'card').replace(/class="phl-comp-(hdr|body|toggle)"/g,'class="phl-comp-$1 open"'):buildContent(f,k)}));
    const cells={}; Object.entries(container._cexCells||{}).forEach(([k,ls])=>cells[k]=ls.map(l=>l.linkId));
    const fi=[st.nodeFilter&&`composant « ${st.nodeFilter} »`,st.nameFilter&&`exchange « ${st.nameFilter} »`,st.dirFilter!=='all'&&`sens ${st.dirFilter}`,st.kindFilter!=='all'&&`kind ${st.kindFilter}`].filter(Boolean).join(', ');
    capHtmlReport({title:'🔀 Component Exchanges', subtitle:`${f.length}/${allLinks.length} exchanges${fi?' · filtres : '+fi:''}`, tabs, active:st.view, cells,
      filename:all?'component-exchanges-rapport.html':`component-exchanges-${st.view}.html`});
  }

  /** Branche les interactions du contenu courant (clic sur une cellule de la matrice → liste des exchanges). */
  function wireMain(){
    const main=container.querySelector('#cex-main'); if(!main||st.view!=='matrix') return;
    main.querySelectorAll('.cap-mx-cell').forEach(td=>td.addEventListener('click',()=>{
      main.querySelectorAll('.cap-mx-cell.sel').forEach(x=>x.classList.remove('sel')); td.classList.add('sel');
      const list=(container._cexCells||{})[td.dataset.cell]||[];
      main.querySelector('.cap-mx-detail').innerHTML=`<div style="font-size:11px;color:var(--c-dim);margin-bottom:6px">${td.title}</div>`+buildContent(list,'line');
    }));
  }

  /** Rafraîchit uniquement le contenu et le compteur de la vue, sans reconstruire la barre d'outils.
   */
  function updateContent(){
    _capCompExView=st.view;
    const filtered=getFiltered();
    const ctr=container.querySelector('#cex-counter');
    if(ctr) ctr.textContent=`${filtered.length}/${allLinks.length} exchange${allLinks.length>1?'s':''}`;
    const main=container.querySelector('#cex-main');
    if(main) main.innerHTML=buildContent(filtered);
    wireMain();
    container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.classList.toggle('active',b.dataset.pv===st.view));
  }

  /** Construit et affiche l'intégralité de la vue (barre d'outils, filtres, contenu, écouteurs).
   */
  function render(){
    _capCompExView=st.view;
    const filtered=getFiltered();
    container.innerHTML=`
      <div class="phl-toggle-bar">
        <button class="phl-toggle-btn${st.view==='line'?' active':''}" data-pv="line">≡ Vue Ligne</button>
        <button class="phl-toggle-btn${st.view==='card'?' active':''}" data-pv="card">▣ Vue Composant</button>
        <button class="phl-toggle-btn${st.view==='matrix'?' active':''}" data-pv="matrix" title="Matrice N² composant × composant (ligne = émetteur, colonne = récepteur)">▦ Matrice</button>
        <button class="phl-toggle-btn${st.view==='diag'?' active':''}" data-pv="diag" title="Ports orphelins, exchanges sans FE, orientations incohérentes…">🩺 Contrôles</button>
        <span id="cex-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace;">${filtered.length}/${allLinks.length} exchange${allLinks.length>1?'s':''}</span>
        <span style="display:flex;gap:4px;margin-left:12px;flex-wrap:wrap;">
          ${[['all','Tous',allLinks.length,'Tous les sens'],
             ...Object.entries(CAP_CEX_DIRS).map(([k,d])=>[k,d.label,allLinks.filter(l=>l.dir===k).length,d.tip]),
             ['warn','⚠ Incohérents',allLinks.filter(l=>l.warn).length,'Orientations de ports incohérentes (OUT→OUT, IN→IN hors délégation)']]
            .filter(([k,,n])=>k==='all'||n>0)
            .map(([k,lab,n,tip])=>`<button class="cap-lf-btn cex-dir-btn${st.dirFilter===k?' active':''}" data-dir="${k}" title="${tip}">${lab} (${n})</button>`).join('')}
        </span>
        ${kindsPresent.length>1||kindsPresent[0]!=='UNSET'?`<select id="cex-kind-sel" class="phl-filter-input" style="margin-left:auto;width:auto;" title="Filtrer par kind">
          <option value="all">Tous kinds</option>${kindsPresent.map(k=>`<option value="${k}"${st.kindFilter===k?' selected':''}>${k}</option>`).join('')}
        </select>`:''}
      </div>
      <div class="phl-filter-bar" style="margin-bottom:8px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;">🖥 Composant :</span>
        <input id="cex-node-input" type="text" class="phl-filter-input" placeholder="Filtrer par composant…" value="${st.nodeFilter}" style="width:200px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;margin-left:8px;">🔍 Exchange :</span>
        <input id="cex-name-input" type="text" class="phl-filter-input" placeholder="Exchange, FE ou Exchange Item…" value="${st.nameFilter}" style="width:200px;">
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="phl-export-btn" id="cex-exp-csv">⬇ CSV</button>
          <button class="phl-export-btn" id="cex-exp-html" title="Rapport HTML de la vue affichée">⬇ HTML</button>
          <button class="phl-export-btn" id="cex-exp-html-all" title="Rapport HTML à onglets : Vue Ligne, Vue Composant, Matrice, Contrôles">⬇ HTML (toutes les vues)</button>
        </div>
      </div>
      <div id="cex-main">${buildContent(filtered)}</div>`;

    container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.addEventListener('click',()=>{
      st.view=b.dataset.pv; render();
    }));
    wireMain();
    container.querySelectorAll('.cex-dir-btn').forEach(b=>b.addEventListener('click',()=>{
      st.dirFilter=b.dataset.dir; render();
    }));
    container.querySelector('#cex-kind-sel')?.addEventListener('change',e=>{ st.kindFilter=e.target.value; render(); });

    let debTimer;
    container.querySelector('#cex-name-input')?.addEventListener('input',e=>{
      st.nameFilter=e.target.value;
      clearTimeout(debTimer); debTimer=setTimeout(updateContent, 150);
    });
    container.querySelector('#cex-node-input')?.addEventListener('input',e=>{
      st.nodeFilter=e.target.value;
      clearTimeout(debTimer); debTimer=setTimeout(updateContent, 150);
    });

    container.querySelector('#cex-exp-csv')?.addEventListener('click',()=>{
      const f=getFiltered();
      let csv;
      if(st.view!=='card'){
        csv='N° Exchange;Composant Source;Port Source;Orientation Source;Component Exchange;Kind;Sens;Port Cible;Orientation Cible;Composant Cible;Functional Exchanges;Exchange Items;Physical Links;Alerte\n';
        csv+=f.map(l=>[linkNumMap[l.linkId]||'',l.src.pcName,l.src.portName,l.src.portOrient,l.linkName,l.kind,CAP_CEX_DIRS[l.dir].label,l.tgt.portName,l.tgt.portOrient,l.tgt.pcName,
          l.fes.map(x=>x.name).join(', '),l.items.map(x=>x.name).join(', '),l.pls.map(x=>x.name).join(', '),l.warn].map(csvEsc).join(';')).join('\n');
      } else {
        csv='N° Exchange;Sens;Composant;Port;Orientation;Component Exchange;Kind;Port distant;Orientation distante;Composant distant\n';
        const seen=new Set();
        f.forEach(l=>{
          if(!seen.has(l.linkId)){
            seen.add(l.linkId);
            const n=csvEsc(linkNumMap[l.linkId]||'');
            const role=isSrc=>l.dir==='bi'?'⇄ Bidirectionnel':l.dir==='unset'?'? Non orienté':((l.dir==='fwd')===isSrc?'Émission →':'← Réception');
            csv+=`${n};${csvEsc(role(true))};${csvEsc(l.src.pcName)};${csvEsc(l.src.portName)};${csvEsc(l.src.portOrient)};${csvEsc(l.linkName)};${csvEsc(l.kind)};${csvEsc(l.tgt.portName)};${csvEsc(l.tgt.portOrient)};${csvEsc(l.tgt.pcName)}\n`;
            csv+=`${n};${csvEsc(role(false))};${csvEsc(l.tgt.pcName)};${csvEsc(l.tgt.portName)};${csvEsc(l.tgt.portOrient)};${csvEsc(l.linkName)};${csvEsc(l.kind)};${csvEsc(l.src.portName)};${csvEsc(l.src.portOrient)};${csvEsc(l.src.pcName)}\n`;
          }
        });
      }
      const blob=new Blob(['\uFEFF'+csv],{type:'text/csv'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='component-exchanges.csv';a.click();URL.revokeObjectURL(a.href);
    });

    container.querySelector('#cex-exp-html')?.addEventListener('click',()=>exportHtml(false));
    container.querySelector('#cex-exp-html-all')?.addEventListener('click',()=>exportHtml(true));
  }

  render();
}


// Open cap-detail for a link row: tries src first, then tgt