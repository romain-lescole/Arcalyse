/** Rend la vue Physical Link avec deux modes (≡ Ligne / ▣ Composant),
 * filtres textuels, exports CSV et HTML.
 */
function capRenderPhysLink(){
  const container=document.getElementById('cap-view-physlink'); if(!container) return;
  const allLinks=capComputePhysLinks();

  // ── Assign link numbers (stable per linkId) ──
  const linkNumMap={};
  let linkNum=1;
  allLinks.forEach(l=>{ if(!linkNumMap[l.linkId]) linkNumMap[l.linkId]=linkNum++; });

  // ── Color palette per link name (stable, visible dark & light) ──
  const LINK_COLORS=[
    {bg:'#0ea5e9',fg:'#fff'},{bg:'#f97316',fg:'#fff'},{bg:'#22c55e',fg:'#fff'},
    {bg:'#a855f7',fg:'#fff'},{bg:'#ef4444',fg:'#fff'},{bg:'#eab308',fg:'#000'},
    {bg:'#06b6d4',fg:'#fff'},{bg:'#ec4899',fg:'#fff'},{bg:'#84cc16',fg:'#000'},
    {bg:'#f59e0b',fg:'#000'},{bg:'#6366f1',fg:'#fff'},{bg:'#14b8a6',fg:'#fff'},
  ];
  const linkColorMap={};
  let colorIdx=0;
  allLinks.forEach(l=>{ if(!linkColorMap[l.linkName]){linkColorMap[l.linkName]=LINK_COLORS[colorIdx%LINK_COLORS.length];colorIdx++;} });

  // ── Persist state on container ──
  if(!container._phl) container._phl={nameFilter:'',nodeFilter:'',view:_capPhysLinkView};
  const st=container._phl;
  if(!st.ceFilter) st.ceFilter='all'; // all | with | without (Component Exchanges alloués)

  // ── Filter logic ──
  // Couleur du texte des PhysicalComponent selon la nature ET le thème actif.
  // En thème clair, les couleurs de remplissage du graphe (#fffcb7, #96b1da, #c084fc)
  // sont trop claires pour être lisibles en tant que couleur de texte → on utilise
  // des variantes sombres. En thème sombre, on conserve les couleurs claires d'origine.
  const isLight = capIsLight();
  const pcColor = n => {
    if (n==='ACTOR') return capTextOn('#7fd8ff');   // bleu clair des acteurs, comme 🧱 System Component
    if (!isLight) {
      return n==='NODE'?'#fffcb7':n==='BEHAVIOR'?'#96b1da':'#c084fc';
    } else {
      // Variantes sombres pour fond blanc : meilleur contraste WCAG AA
      return n==='NODE'?'#7a6500':n==='BEHAVIOR'?'#1a4f8a':'#7c28d8';
    }
  };
  const projectName=(cap_xmlDoc&&cap_xmlDoc.documentElement)?(cap_xmlDoc.documentElement.getAttribute('name')||_L('Capella Project')):_L('Capella Project');

  // Couleur de fond pour les badges (NODE/BEHAVIOR) dans l'en-tête des cartes composant.
  // Texte du badge : capInk (noir sur fond clair, blanc sur fond foncé) ; en thème clair, variantes sombres.
  const pcBadgeBg = n => {
    if (n==='ACTOR') return '#7fd8ff';
    if (!isLight) {
      return n==='NODE'?'#fffcb7':n==='BEHAVIOR'?'#96b1da':'#c084fc';
    } else {
      return n==='NODE'?'#7a6500':n==='BEHAVIOR'?'#1a4f8a':'#7c28d8';
    }
  };
  /** Retourne les liens/exchanges filtrés selon les critères de recherche saisis.
   */
  function getFiltered(){
    const nf=st.nameFilter.trim().toLowerCase();
    const ndf=st.nodeFilter.trim().toLowerCase();
    return allLinks.filter(l=>{
      if(st.ceFilter==='with'&&!l.ces.length) return false;
      if(st.ceFilter==='without'&&l.ces.length) return false;
      if(nf && !l.linkName.toLowerCase().includes(nf) && !l.ces.some(c=>c.name.toLowerCase().includes(nf))) return false;
      if(ndf && !l.src.pcName.toLowerCase().includes(ndf) && !l.tgt.pcName.toLowerCase().includes(ndf)) return false;
      return true;
    });
  }


  // ── Build content HTML (links only, no filter bar) ──
  /** Construit le HTML des liens physiques selon le mode actif : vue Ligne (une ligne par
   * lien) ou vue Composant (cartes repliables regroupées par PhysicalComponent).
   * @param {object[]} filtered - Liens retenus par les filtres
   * @returns {string} Fragment HTML à injecter
   */
  /** Badge du nombre de ComponentPorts alloués à un port physique (info-bulle : détail). */
  function cpBadge(e){
    if(!e.cps.length) return _L(`<span title="Aucun ComponentPort alloué à ce port physique" style="font-size:10px;padding:1px 4px;border-radius:3px;border:1px dashed var(--c-border);color:var(--c-dim);margin-left:4px;opacity:.7">0 CP</span>`);
    return `<span title="${capEsc(_L('ComponentPorts alloués :\n')+e.cps.map(c=>`${c.compName} ⬦ ${c.name} (${c.orient})`).join('\n'))}" style="font-size:10px;font-weight:700;padding:1px 4px;border-radius:3px;border:1px solid var(--c-accent);color:var(--c-accent);margin-left:4px;cursor:help">${e.cps.length} CP</span>`;
  }
  /** Ligne des Component Exchanges alloués au lien (ou alerte s'il n'y en a aucun). */
  function ceLine(l){
    return l.ces.length
      ? _L(`<div style="font-size:11.5px;color:var(--c-dim);text-align:center;max-width:100%" title="Component Exchanges alloués">⇢ ${capFoldList(l.ces.map(c=>capDetLink(c.id,c.name)))}</div>`)
      : _L(`<div style="font-size:11.5px;color:var(--c-warn,#e3b341)" title="Aucun Component Exchange alloué à ce lien">∅ CE</div>`);
  }
  /** Rapport de contrôles : liens sans CE, ports physiques orphelins ou sans ComponentPort, CE PA non alloués. */
  function buildDiag(filtered){
    const ndf=st.nodeFilter.trim().toLowerCase();
    const ports=(allLinks.allPorts||[]).filter(p=>!ndf||p.pcName.toLowerCase().includes(ndf));
    const pRow=p=>`<tr><td>${capDetLink(p.pcId,p.pcName,'font-weight:600;color:'+pcColor(p.pcNature))}</td><td>${capDetLink(p.portId,p.portName)}</td><td>${p.cps.map(c=>capEsc(c.compName+' ⬦ '+c.name)).join(', ')||'—'}</td></tr>`;
    return capDiagHtml([
      {icon:'∅', title:_L('Physical Links sans Component Exchange alloué'), tip:_L('Le lien ne transporte aucun échange'), cols:['N°',_L('Physical Link'),_L('Extrémité 1'),_L('Extrémité 2')],
        items:filtered.filter(l=>!l.ces.length).map(l=>`<tr><td>#${linkNumMap[l.linkId]||''}</td><td>${capDetLink(l.linkId,l.linkName,'font-weight:600')}</td><td>${capEsc(l.src.pcName+' ⬦ '+l.src.portName)}</td><td>${capEsc(l.tgt.pcName+' ⬦ '+l.tgt.portName)}</td></tr>`)},
      {icon:'⭘', title:_L('Ports physiques orphelins (sans Physical Link)'), tip:_L('PhysicalPort relié à aucun lien'), cols:[_L('Composant'),_L('Port physique'),_L('ComponentPorts alloués')], items:ports.filter(p=>!p.connected).map(pRow)},
      {icon:'◌', title:_L('Ports physiques sans ComponentPort alloué'), tip:_L('Aucune ComponentPortAllocation'), cols:[_L('Composant'),_L('Port physique'),_L('ComponentPorts alloués')], items:ports.filter(p=>p.connected&&!p.cps.length).map(pRow)},
      {icon:'🔀', title:_L('Component Exchanges (PA) non alloués à un Physical Link'), tip:_L('Hors délégations'), cols:[_L('Component Exchange')], items:(allLinks.unallocCEs||[]).map(c=>`<tr><td>${capDetLink(c.id,c.name,'font-weight:600')}</td></tr>`)},
    ]);
  }

  function buildContent(filtered, forceView){
    const view=forceView||st.view;
    if(view==='diag') return buildDiag(filtered);
    if(!filtered.length) return _L('<div class="phl-empty">Aucun lien physique ne correspond au filtre.</div>');
    if(view==='matrix'){
      const mx=capMatrixBuild(filtered,{directed:false, unit:_L('liens'), colorOf:e=>pcColor(e.pcNature)});
      container._phlCells=mx.cells; return mx.html;
    }
    if(view==='line'){
      return filtered.map(l=>{
        const sc=pcColor(l.src.pcNature), tc=pcColor(l.tgt.pcNature);
        const lc=linkColorMap[l.linkName]||{bg:'#8b949e',fg:'#fff'};
        const num=linkNumMap[l.linkId]||'';
        return`<div class="phl-line">
          <div class="phl-cell phl-cell-pc" style="--phl-c:${sc}">
            ${capDetLink(l.src.pcId,l.src.pcName,'color:'+capTextOn(sc)).replace('class="cex-det"','class="cex-det phl-pc-name"')}
            <span class="phl-port-name">⬦ ${capDetLink(l.src.portId,l.src.portName)}${cpBadge(l.src)}</span>
          </div>
          <div class="phl-cell phl-cell-link" style="padding:6px 14px;gap:2px;">
            <span style="font-size:11.5px;color:var(--c-dim);font-family:monospace;">#${num}</span>
            <span class="phl-link-badge" style="background:${lc.bg};color:${lc.fg};border-color:${lc.bg};cursor:pointer" onclick="capOpenDetailById('${capEsc(l.linkId)}')">${capEsc(l.linkName)}</span>
            <span style="font-size:13px;color:var(--c-dim);font-weight:600;">↔</span>
            ${ceLine(l)}
          </div>
          <div class="phl-cell phl-cell-pc phl-cell-r" style="--phl-c:${tc}">
            ${capDetLink(l.tgt.pcId,l.tgt.pcName,'color:'+capTextOn(tc)).replace('class="cex-det"','class="cex-det phl-pc-name"')}
            <span class="phl-port-name">⬦ ${capDetLink(l.tgt.portId,l.tgt.portName)}${cpBadge(l.tgt)}</span>
          </div>
        </div>`;
      }).join('');
    } else {
      const byPC={};
      filtered.forEach(l=>{
        if(!byPC[l.src.pcId]) byPC[l.src.pcId]={pcName:l.src.pcName,pcId:l.src.pcId,nature:l.src.pcNature,links:[]};
        byPC[l.src.pcId].links.push({l,me:l.src,portSrc:l.src.portName,pcSrc:l.src.pcName,linkName:l.linkName,linkId:l.linkId,portTgt:l.tgt.portName,pcTgt:l.tgt.pcName,pcTgtId:l.tgt.pcId,pcTgtNature:l.tgt.pcNature});
        if(!byPC[l.tgt.pcId]) byPC[l.tgt.pcId]={pcName:l.tgt.pcName,pcId:l.tgt.pcId,nature:l.tgt.pcNature,links:[]};
        byPC[l.tgt.pcId].links.push({l,me:l.tgt,portSrc:l.tgt.portName,pcSrc:l.tgt.pcName,linkName:l.linkName,linkId:l.linkId,portTgt:l.src.portName,pcTgt:l.src.pcName,pcTgtId:l.src.pcId,pcTgtNature:l.src.pcNature});
      });
      return Object.values(byPC).map(pc=>{
        const c=pcColor(pc.nature);
        const rows=pc.links.map(lk=>{
          const lc=linkColorMap[lk.linkName]||{bg:'#8b949e',fg:'#fff'};
          const tc=pcColor(lk.pcTgtNature);
          const num=linkNumMap[lk.linkId]||'';
          return _L(`<div class="phl-link-row">
            <span style="font-size:10px;color:var(--c-dim);font-family:monospace;min-width:28px;">#${num}</span>
            <span style="font-size:11px;font-weight:600;color:${pcColor(pc.nature)};min-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${capEsc(lk.pcSrc||pc.pcName)}">${capEsc(lk.pcSrc||pc.pcName)}</span>
            <span class="phl-lr-port-src">⬦ ${capEsc(lk.portSrc)}${cpBadge(lk.me)}</span>
            <span class="phl-lr-arrow">↔</span>
            <span class="phl-lr-link" style="background:${lc.bg};color:${lc.fg};border-color:${lc.bg};cursor:pointer" title="${capEsc(lk.l.ces.length?_L('Component Exchanges alloués :\n')+lk.l.ces.map(c=>c.name).join('\n'):_L('Aucun Component Exchange alloué'))}" onclick="event.stopPropagation();capOpenDetailById('${capEsc(lk.linkId)}')">${capEsc(lk.linkName)}</span>
            <span class="phl-lr-arrow">↔</span>
            <span class="phl-lr-port-tgt">⬦ ${capEsc(lk.portTgt)}</span>
            ${capDetLink(lk.pcTgtId,lk.pcTgt,'color:'+tc).replace('class="cex-det"','class="cex-det phl-lr-comp-tgt"')}
            <span style="font-size:11.5px;color:${lk.l.ces.length?'var(--c-dim)':'#e3b341'};margin-left:6px" title="Component Exchanges alloués">${lk.l.ces.length?'⇢ '+lk.l.ces.length+' CE':'∅ CE'}</span>
          </div>`);
        }).join('');
        return _L(`<div class="phl-comp-card">
          <div class="phl-comp-hdr" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');this.querySelector('.phl-comp-toggle').classList.toggle('open')">
            <span class="phl-comp-badge" style="background:${pcBadgeBg(pc.nature)};color:${capInk(pcBadgeBg(pc.nature))}">${capEsc(pc.nature==='ACTOR'?_L('ACTEUR'):(pc.nature||'—'))}</span>
            <span class="phl-comp-title" style="color:${pcColor(pc.nature)}">${capEsc(pc.pcName)}</span>
            <span class="phl-comp-cnt">${pc.links.length} lien${pc.links.length>1?'s':''}</span>
            <span class="phl-comp-toggle">▶</span>
          </div>
          <div class="phl-comp-body">${rows}</div>
        </div>`);
      }).join('');
    }
  }

  /** Exporte un rapport HTML autonome : vue courante seule, ou toutes les vues en onglets (filtres appliqués).
   * @param {boolean} all - true : toutes les vues
   */
  function exportHtml(all){
    const f=getFiltered();
    const VIEWS=[['line',_L('≡ Vue Ligne')],['card',_L('▣ Vue Composant')],['matrix',_L('▦ Matrice')],['diag',_L('🩺 Contrôles')]];
    const keys=all?VIEWS.map(v=>v[0]):[st.view];
    const lineHtml=f.length?f.map(l=>`<div data-lid="${capEsc(l.linkId)}">${buildContent([l],'line')}</div>`).join(''):buildContent(f,'line');
    const tabs=VIEWS.filter(v=>keys.includes(v[0])||(v[0]==='line'&&keys.includes('matrix'))).map(([k,label])=>({key:k,label,
      html:k==='line'?lineHtml:k==='card'?buildContent(f,'card').replace(/class="phl-comp-(hdr|body|toggle)"/g,'class="phl-comp-$1 open"'):buildContent(f,k)}));
    const cells={}; Object.entries(container._phlCells||{}).forEach(([k,ls])=>cells[k]=ls.map(l=>l.linkId));
    const fi=[st.nodeFilter&&_L(`composant « ${st.nodeFilter} »`),st.nameFilter&&_L(`lien « ${st.nameFilter} »`),st.ceFilter!=='all'&&(st.ceFilter==='with'?_L('avec CE'):_L('sans CE'))].filter(Boolean).join(', ');
    capHtmlReport({title:_L('🔌 Physical Links'), subtitle:_L(`${f.length}/${allLinks.length} liens${fi?_L(' · filtres : ')+fi:''}`), tabs, active:st.view, cells,
      filename:all?_L('physical-links-rapport.html'):`physical-links-${st.view}.html`});
  }

  /** Clic sur une cellule de la matrice → liste des liens physiques correspondants. */
  function wireMain(){
    const main=container.querySelector('#phl-main'); if(!main||st.view!=='matrix') return;
    main.querySelectorAll('.cap-mx-cell').forEach(td=>td.addEventListener('click',()=>{
      main.querySelectorAll('.cap-mx-cell.sel').forEach(x=>x.classList.remove('sel')); td.classList.add('sel');
      main.querySelector('.cap-mx-detail').innerHTML=`<div style="font-size:11px;color:var(--c-dim);margin-bottom:6px">${td.title}</div>`+buildContent((container._phlCells||{})[td.dataset.cell]||[],'line');
    }));
  }

  // ── Update only the counter + main content (preserves inputs/focus) ──
  /** Rafraîchit uniquement le contenu et le compteur de la vue Physical Link,
   * sans reconstruire la barre d'outils ni les champs de filtre.
   */
  function updateContent(){
    _capPhysLinkView=st.view;
    const filtered=getFiltered();
    const ctr=container.querySelector('#phl-counter');
    if(ctr) ctr.textContent=_L(`${filtered.length}/${allLinks.length} lien${allLinks.length>1?'s':''}`);
    const main=container.querySelector('#phl-main');
    if(main) main.innerHTML=buildContent(filtered);
    wireMain();
    // update toggle btn active state
    container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.classList.toggle('active',b.dataset.pv===st.view));
  }

  /** Construit et affiche l'intégralité de la vue Physical Link : barre de bascule
   * Ligne/Composant, champs de filtre, boutons d'export et contenu, puis rattache
   * tous les écouteurs. Rappelée lors d'un changement de mode d'affichage.
   */
  function render(){
    _capPhysLinkView=st.view;
    const PHL_VIEWS=[['block',_L('◧ Vue Blocs'),_L('Nœuds dessinés comme dans Capella : jaune = nœud du système, bleu clair = nœud acteur ; ports physiques jaunes')],['line',_L('≡ Vue Ligne'),''],['card',_L('▣ Vue Composant'),''],['matrix',_L('▦ Matrice'),_L('Matrice N² composant × composant')],['diag',_L('🩺 Contrôles'),_L('Liens sans CE, ports orphelins, CE non alloués…')]];
    if(st.view==='block'){   // ◧ Vue Blocs : rendu commun aux vues 🧱 (47-composants.js)
      container.innerHTML=_L(`<div class="cap-mx-hint" style="margin:0 0 6px">Périmètre : Physical Links de la couche <b>PA</b> entre <b>Physical Components Node</b> (nœuds du système en jaune, nœuds acteurs en bleu clair).</div><div class="phl-toggle-bar">${PHL_VIEWS.map(([k,l,t])=>`<button class="phl-toggle-btn${st.view===k?' active':''}" data-pv="${k}" title="${t}">${l}</button>`).join('')}</div><div id="phl-blk"></div>`);
      container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.addEventListener('click',()=>{ st.view=b.dataset.pv; render(); }));
      capRenderComponentBlocks('PN', container.querySelector('#phl-blk'), container);
      return;
    }
    const filtered=getFiltered();
    container.innerHTML=_L(`
      <div class="phl-toggle-bar">
        <button class="phl-toggle-btn" data-pv="block" title="${PHL_VIEWS[0][2]}">◧ Vue Blocs</button>
        <button class="phl-toggle-btn${st.view==='line'?' active':''}" data-pv="line">≡ Vue Ligne</button>
        <button class="phl-toggle-btn${st.view==='card'?' active':''}" data-pv="card">▣ Vue Composant</button>
        <button class="phl-toggle-btn${st.view==='matrix'?' active':''}" data-pv="matrix" title="Matrice N² composant × composant">▦ Matrice</button>
        <button class="phl-toggle-btn${st.view==='diag'?' active':''}" data-pv="diag" title="Liens sans CE, ports orphelins, CE non alloués…">🩺 Contrôles</button>
        <span id="phl-counter" style="font-size:11px;color:var(--c-dim);font-family:monospace;">${filtered.length}/${allLinks.length} lien${allLinks.length>1?'s':''}</span>
        <span style="display:flex;gap:4px;margin-left:12px">
          ${[['all',_L('Tous'),allLinks.length],['with',_L('⇢ Avec CE'),allLinks.filter(l=>l.ces.length).length],['without',_L('∅ Sans CE'),allLinks.filter(l=>!l.ces.length).length]]
            .map(([k,lab,n])=>`<button class="cap-lf-btn phl-ce-btn${st.ceFilter===k?' active':''}" data-ce="${k}">${lab} (${n})</button>`).join('')}
        </span>
      </div>
      <div class="phl-filter-bar" style="margin-bottom:8px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;">🖥 Composant :</span>
        <input id="phl-node-input" type="text" class="phl-filter-input" placeholder="Filtrer par composant…" value="${st.nodeFilter}" style="width:200px;">
        <span style="font-size:11px;color:var(--c-dim);white-space:nowrap;margin-left:8px;">🔍 Lien :</span>
        <input id="phl-name-input" type="text" class="phl-filter-input" placeholder="Lien ou Component Exchange…" value="${st.nameFilter}" style="width:200px;">
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="phl-export-btn" id="phl-exp-csv">⬇ CSV</button>
          <button class="phl-export-btn" id="phl-exp-html" title="Rapport HTML de la vue affichée">⬇ HTML</button>
          <button class="phl-export-btn" id="phl-exp-html-all" title="Rapport HTML à onglets : Vue Ligne, Vue Composant, Matrice, Contrôles">⬇ HTML (toutes les vues)</button>
        </div>
      </div>
      <div id="phl-main">${buildContent(filtered)}</div>`);

    // ── View toggle ──
    container.querySelectorAll('.phl-toggle-btn').forEach(b=>b.addEventListener('click',()=>{
      st.view=b.dataset.pv; render();
    }));
    container.querySelectorAll('.phl-ce-btn').forEach(b=>b.addEventListener('click',()=>{ st.ceFilter=b.dataset.ce; render(); }));
    wireMain();

    // ── Text filters — update content only, NO full re-render → focus preserved ──
    let debTimer;
    container.querySelector('#phl-name-input')?.addEventListener('input',e=>{
      st.nameFilter=e.target.value;
      clearTimeout(debTimer); debTimer=setTimeout(updateContent, 150);
    });
    container.querySelector('#phl-node-input')?.addEventListener('input',e=>{
      st.nodeFilter=e.target.value;
      clearTimeout(debTimer); debTimer=setTimeout(updateContent, 150);
    });

    // ── CSV export (enrichi, 53 : colonnes à retirer, ID / owner / attributs à ajouter) ──
    container.querySelector('#phl-exp-csv')?.addEventListener('click',()=>{
      const f=getFiltered();
      if(st.view!=='card'){
        // Vue en lignes : une ligne par lien
        const cpCell=e=>capCx(e.cps.map(c=>`${c.compName} ⬦ ${c.name} (${c.orient})`).join(', '), e.cps.map(c=>c.id));
        capCsvExport('physical-links.csv',[_L('N° Lien'),_L('Composant 1'),_L('Port Composant 1'),_L('ComponentPorts alloués 1'),_L('Lien Physique'),_L('Component Exchanges alloués'),_L('Port Composant 2'),_L('ComponentPorts alloués 2'),_L('Composant 2'),_L('Couche')],
          f.map(l=>[linkNumMap[l.linkId]||'',capCx(l.src.pcName,l.src.pcId),capCx(l.src.portName,l.src.portId),cpCell(l.src),capCx(l.linkName,l.linkId),capCxList(l.ces),capCx(l.tgt.portName,l.tgt.portId),cpCell(l.tgt),capCx(l.tgt.pcName,l.tgt.pcId),l.layer]));
      } else {
        // Vue en cartes : deux lignes par lien (les deux sens), même numéro
        const rows=[], seen=new Set();
        f.forEach(l=>{ if(seen.has(l.linkId)) return; seen.add(l.linkId); const n=linkNumMap[l.linkId]||'';
          rows.push([n,capCx(l.src.pcName,l.src.pcId),capCx(l.src.portName,l.src.portId),capCx(l.linkName,l.linkId),capCx(l.tgt.portName,l.tgt.portId),capCx(l.tgt.pcName,l.tgt.pcId)]);
          rows.push([n,capCx(l.tgt.pcName,l.tgt.pcId),capCx(l.tgt.portName,l.tgt.portId),capCx(l.linkName,l.linkId),capCx(l.src.portName,l.src.portId),capCx(l.src.pcName,l.src.pcId)]); });
        capCsvExport(_L('physical-links-sens.csv'),[_L('N° Lien'),_L('Source'),_L('Port Source'),_L('Lien Physique'),_L('Port Cible'),_L('Destination')],rows);
      }
    });

    // ── HTML export ──
    container.querySelector('#phl-exp-html')?.addEventListener('click',()=>exportHtml(false));
    container.querySelector('#phl-exp-html-all')?.addEventListener('click',()=>exportHtml(true));
  }

  render();
}