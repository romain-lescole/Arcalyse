/* ═══════════════════════════════════════════════════════════════════════
   7. CONSTRUCTION DE L'ARBRE
   rebuildTree() = à appeler quand modèle/filtres changent.
   render()      = à appeler pour les mises à jour visuelles (collapse, thème…).
   ═══════════════════════════════════════════════════════════════════════ */
/** Construit la structure d'arbre D3 hiérarchique à partir de MODEL.elements
 * en appliquant les filtres actifs (typF, relF, ctx, depth, hidden).
 * @returns {object} Hiérarchie D3 prête au rendu
 */
function buildTreeData() {
  uidSeq = 0;
  const eMap      = new Map(MODEL.elements.map(e => [e.id, e]));
  const globalSeen = new Set();

  /** Construit récursivement un nœud de l'arbre de données du graphe (profondeur, ancêtres, relation parente) pour buildTreeData.
   */
  function makeNode(eid, depth, ancestors, parentRel) {
    const el = eMap.get(eid);
    if (!el || S.hidden.has(eid) || !S.typF[el.type]) return null;
    if (S.singleNode && globalSeen.has(eid)) return null;
    if (S.singleNode) globalSeen.add(eid);

    const node = { uid:uidSeq++, eid, el, pRel:parentRel, children:[], _saved:null, hasMore:false };

    // Association est bidirectionnelle ; toutes les autres relations sont dirigées (src→tgt uniquement)
    const rels = MODEL.relations.filter(r => {
      if (!S.relF[r.type]) return false;
      return r.type === 'Association' ? (r.src===eid||r.tgt===eid) : r.src===eid;
    });
    const nextOf = r => r.type==='Association' ? (r.src===eid ? r.tgt : r.src) : r.tgt;
    const forward = rels.filter(r => !ancestors.has(nextOf(r)));

    if (depth > 0) {
      const next = new Set([...ancestors, eid]);
      forward.forEach(r => {
        const c = makeNode(nextOf(r), depth-1, next, r);
        if (c) node.children.push(c);
      });
    } else {
      node.hasMore = forward.some(r => {
        const nb = eMap.get(nextOf(r));
        return nb && S.typF[nb.type] && !S.hidden.has(nb.id);
      });
    }
    return node;
  }
  return makeNode(S.ctx, S.depth, new Set([S.ctx]), null);
}

/** Reconstruit l'arbre D3 et redessine le graphe. Point d'entrée principal
 * pour tout changement de filtre ou de données du modèle.
 */
function rebuildTree() {
  treeData = buildTreeData();
  render();
}

/* ═══════════════════════════════════════════════════════════════════════
   7b. MESURE DE TEXTE & CALCUL DES DIMENSIONS DES NŒUDS
   Canvas singleton pour mesurer la largeur des chaînes sans DOM visible.
   ═══════════════════════════════════════════════════════════════════════ */
const _mc = document.createElement('canvas').getContext('2d');
/** Mesure la largeur en pixels d'une chaîne de caractères dans une fonte donnée.
 * Utilise un canvas singleton hors-DOM pour éviter les reflows.
 * @param {string} str @param {number} fs - Taille de fonte en px
 */
function textW(str, fs=12) {
  _mc.font = `600 ${fs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  return _mc.measureText(str).width;
}

/**
 * Découpage glouton du texte en lignes qui tiennent dans maxW.
 * Maximum maxLines lignes ; le dernier mot non placé est simplement abandonné.
 */
/** Découpe un texte en plusieurs lignes pour tenir dans une largeur max.
 * @param {string} text @param {number} maxW @param {number} fs @param {number} maxLines
 * @returns {string[]} Tableau de lignes
 */
function wrapToNLines(text, maxW, fs, maxLines=3) {
  if (textW(text, fs) <= maxW) return [text];
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const test = cur ? cur+' '+words[i] : words[i];
    if (textW(test, fs) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      if (lines.length === maxLines - 1) { cur = words.slice(i).join(' '); break; }
      cur = words[i];
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/**
 * Retourne les lignes de texte à afficher dans un nœud de taille fixe.
 * Le rectangle ne change pas de taille — le texte s'adapte.
 */
/** Calcule les dimensions (largeur, hauteur, lignes) d'un nœud selon son label et le mode compact.
 * @param {string} label @returns {{w,h,lines}}
 */
function computeNodeDims(label) {
  const baseW=cw(), baseH=ch(), fs=S.compact?11:12, pad=S.compact?12:20;
  if (S.cutNames) return {lines:[label]};
  return {lines: wrapToNLines(label, baseW-pad, fs, 3)};
}

/* ═══════════════════════════════════════════════════════════════════════
   8. RENDU GRAPHIQUE
   Lit treeData sans le reconstruire → l'état expand/collapse est préservé.
   ═══════════════════════════════════════════════════════════════════════ */
/** Rendu principal D3 : calcule les positions (layout), dessine les arêtes et les nœuds.
 * Appelé après rebuildTree() ou après un changement de disposition/thème.
 */
function render() {
  if (!S.chainView && !treeData) { gN.selectAll('*').remove(); gL.selectAll('*').remove(); return; }

  // Récupère les couleurs SVG du thème courant (CSS vars → valeurs string)
  const C = {
    nodeBg:  tv('--c-node-bg')  || '#2a2a3d',
    nodeTxt: tv('--c-node-txt') || '#cdd6f4',
    nodeHdr: tv('--c-node-hdr') || 'rgba(0,0,0,.65)',
    border:  tv('--c-border')   || '#45475a',
    accent:  tv('--c-accent')   || '#89b4fa',
    ctx:     tv('--c-ctx')      || '#f9e2af',
    dim:     tv('--c-dim')      || '#7f849c',
    togBg:   tv('--c-bg4')      || '#252536',
  };
  if (S.chainView) { renderChainView(C); return; }
  // Retire les éléments de la vue chaîne (sans données D3) avant la jointure de la vue normale
  gL.selectAll('.cv-e').remove(); gN.selectAll('.cv-n').remove(); d3.select('#defs').select('#cv-arr').remove();

  const hier = d3.hierarchy(treeData, d => d.children);
  const svgEl = document.getElementById('svg');
  const W = svgEl.clientWidth||900, H = svgEl.clientHeight||600;

  // ── Calcul de la disposition ──────────────────────────────────────────
  let nx, ny;
  if (S.layout === 'radial') {
    const leafCount = Math.max(hier.leaves().length, 1);
    const maxDepth  = Math.max(1, hier.height);
    const rByDepth  = maxDepth * Math.max(cw()+60, 200);
    const rByLeaves = (leafCount*(cw()+40))/(2*Math.PI);
    const R         = Math.max(rByDepth, rByLeaves, 200);
    d3.tree().size([2*Math.PI, R])
      .separation((a,b) => a.parent===b.parent ? 1.5 : 3)(hier);
    hier.each(d => { d._px=d.y*Math.cos(d.x-Math.PI/2); d._py=d.y*Math.sin(d.x-Math.PI/2); });
    nx=d=>d._px; ny=d=>d._py;
  } else if (S.layout==='LR') {
    d3.tree().nodeSize([ch()+18, cw()+60])(hier);
    nx=d=>d.y; ny=d=>d.x;
  } else if (S.layout==='RL') {
    d3.tree().nodeSize([ch()+18, cw()+60])(hier);
    nx=d=>-d.y; ny=d=>d.x;
  } else if (S.layout==='zigzag') {
    // Zigzag grid layout: ratio 7:3 (7 columns max, wrap below)
    const nodes = hier.descendants();
    const COLS = 7;
    const nodeW = cw()+80, nodeH = ch()+60;
    nodes.forEach((d,i) => {
      const row = Math.floor(i/COLS);
      const col = i % COLS;
      // Even rows: left→right; odd rows: right→left (zigzag)
      const effectiveCol = (row%2===0) ? col : (Math.min(COLS-1, nodes.length-1-row*COLS) - col + Math.min(COLS-1, nodes.length-1-row*COLS));
      d._zx = effectiveCol * nodeW;
      d._zy = row * nodeH;
    });
    nx=d=>d._zx; ny=d=>d._zy;
  } else {
    d3.tree().nodeSize([cw()+18, ch()+60])(hier);
    nx=d=>d.x; ny=d=>d.y;
  }
  d3Root = hier;

  // ── Liens ──────────────────────────────────────────────────────────────
  gL.selectAll('.lkg').data(hier.links(), d=>d.target.data.uid)
    .join(e=>e.append('g').attr('class','lkg'))
    .each(function(d) {
      const g = d3.select(this); g.selectAll('*').remove();
      const rel = d.target.data.pRel; if (!rel) return;
      const cfg = RCFG[rel.type]||{color:'#7f849c',dash:''};
      const sx=nx(d.source),sy=ny(d.source),tx=nx(d.target),ty=ny(d.target);

      let pathD;
      const hx=cw()/2, hy=ch()/2; // demi-largeur / demi-hauteur du nœud
      if (S.layout==='radial') {
        const dx=tx-sx,dy2=ty-sy,len=Math.hypot(dx,dy2)||1;
        const ex=dx/len,ey=dy2/len;
        // Intersection rayon → bord du rectangle (plus précis que max(hw,hh))
        const rectOff=(exx,eyy)=>{
          const tx_=Math.abs(exx)>1e-9?hx/Math.abs(exx):Infinity;
          const ty_=Math.abs(eyy)>1e-9?hy/Math.abs(eyy):Infinity;
          return Math.min(tx_,ty_)+4; // +4 px marge pour la pointe de flèche
        };
        pathD=`M${sx+ex*rectOff(ex,ey)},${sy+ey*rectOff(ex,ey)}`+
              `L${tx-ex*rectOff(-ex,-ey)},${ty-ey*rectOff(-ex,-ey)}`;
      } else if (S.layout==='LR'||S.layout==='RL') {
        const dir=S.layout==='LR'?1:-1, mx=(sx+tx)/2;
        pathD=`M${sx+dir*hx},${sy}C${mx},${sy} ${mx},${ty} ${tx-dir*hx},${ty}`;
      } else if (S.layout==='zigzag') {
        // Straight line for zigzag sequence
        const dx=tx-sx, dy2=ty-sy, len=Math.hypot(dx,dy2)||1;
        const ex=dx/len, ey=dy2/len;
        const off=Math.min(hx,hy)+4;
        pathD=`M${sx+ex*off},${sy+ey*off}L${tx-ex*off},${ty-ey*off}`;
      } else {
        const my=(sy+ty)/2;
        pathD=`M${sx},${sy+hy}C${sx},${my} ${tx},${my} ${tx},${ty-hy}`;
      }

      const p=g.append('path').attr('d',pathD).attr('fill','none')
        .attr('stroke',cfg.color).attr('stroke-width',1.6).attr('stroke-linecap','round');
      if (!cfg.noArrow)        p.attr('marker-end',  `url(#arr-${rel.type})`);
      if (cfg.dash)            p.attr('stroke-dasharray', cfg.dash);
      if (cfg.diamond)         p.attr('marker-start', `url(#dia-${rel.type})`);
      if (cfg.hollowDiamond)   p.attr('marker-start', `url(#hdia-${rel.type})`);
      if (cfg.circle)          p.attr('marker-start', `url(#circ-${rel.type})`);

      if (S.showRelNames)
        g.append('text').attr('x',(sx+tx)/2).attr('y',(sy+ty)/2-5)
          .attr('text-anchor','middle').attr('fill',capTextOn(cfg.color)).attr('class','rm-elabel')
          .attr('pointer-events','none')
          // Priorité : nom de la relation elle-même (ex: nom du FunctionalExchange pour une
          // chaîne fonctionnelle) > nom humain du type (relations Capella) > clé technique brute
          .text(`«${rel.name || cfg.label || rel.type}»`);
    });

  // ── Nœuds ──────────────────────────────────────────────────────────────
  const allNodes = hier.descendants();
  const W_N=cw(), H_N=ch(), R_T=S.compact?CTR:TR;

  gN.selectAll('.ng').data(allNodes, d=>d.data.uid)
    .join(e=>e.append('g').attr('class','ng'))
    .attr('transform', d=>`translate(${nx(d)-W_N/2},${ny(d)-H_N/2})`)
    .each(function(d) {
      const g=d3.select(this); g.selectAll('*').remove();
      const el=d.data.el;
      const tcfg=TCFG[el.type]||{color:'#7f849c',abbr:el.type.slice(0,3).toUpperCase()};
      const isSel=S.selNode===d.data.uid, isCtx=el.id===S.ctx;

      // ── Label & lignes de texte ───────────────────────────────────────
      let label=el.name;
      if (S.showNums) {
        const parts=[];
        let cur=d;
        while(cur.parent){ parts.unshift((cur.parent.children||[]).indexOf(cur)+1); cur=cur.parent; }
        label=['1',...parts].join('.')+'. '+label;
      }
      if (S.cutNames && label.length>S.cutLen) label=label.slice(0,S.cutLen)+'…';
      const {lines} = computeNodeDims(label);

      // Taille de police adaptée au nombre de lignes (compact ou normal)
      const lineFsN = lines.length===1?12:lines.length===2?11:10; // mode normal
      const lineFsC = lines.length===1?11:lines.length===2?10:9;  // mode compact

      if (S.compact) {
        // ── Mode compact : pilule colorée, taille fixe ─────────────────
        g.append('rect').attr('width',W_N).attr('height',H_N).attr('rx',CH/2)
          .attr('fill',tcfg.color)
          .attr('stroke',isSel?C.accent:isCtx?C.ctx:'none')
          .attr('stroke-width',isSel||isCtx?2.5:0);

        if (isCtx)
          g.append('rect').attr('width',W_N-4).attr('height',H_N-4).attr('rx',(CH-4)/2)
            .attr('x',2).attr('y',2).attr('fill','none')
            .attr('stroke',C.ctx).attr('stroke-width',1).attr('stroke-dasharray','3,2');

        // Lignes de texte réparties verticalement dans la pilule
        lines.forEach((ln,i)=>
          g.append('text').attr('x',W_N/2).attr('y',H_N*(i+1)/(lines.length+1)+1)
            .attr('text-anchor','middle').attr('dominant-baseline','central')
            .attr('fill','rgba(0,0,0,0.78)').attr('font-size',lineFsC).attr('font-weight',600)
            .attr('pointer-events','none').text(ln));

        if (d.data.hasMore && !d.data.children?.length && !d.data._saved?.length)
          g.append('text').attr('x',W_N-4).attr('y',H_N-3)
            .attr('text-anchor','end').attr('fill','rgba(0,0,0,0.45)')
            .attr('font-size',8).attr('pointer-events','none').text('•••');

      } else {
        // ── Mode normal : bandeau de type + corps texte, taille fixe ───
        g.append('rect').attr('class','rm-card').attr('width',NW).attr('height',NH).attr('rx',6)
          .attr('fill',C.nodeBg)
          .attr('stroke',isSel?C.accent:isCtx?C.ctx:C.border)
          .attr('stroke-width',isSel||isCtx?2.2:1);
        // Bandeau de type (coins supérieurs arrondis) portant le nom lisible du type
        g.append('path').attr('d',`M0,${NHH} V6 Q0,0 6,0 H${NW-6} Q${NW},0 ${NW},6 V${NHH} Z`)
          .attr('fill',tcfg.color).attr('opacity',.9);
        const hdrTxt=(tcfg.label&&tcfg.label.length<=24?tcfg.label:tcfg.abbr)+(isCtx?' ⊙':'');
        g.append('text').attr('x',7).attr('y',NHH-5)
          .attr('fill',capInk(tcfg.color)).attr('font-size',10).attr('font-weight',700)
          .attr('pointer-events','none').text(hdrTxt);

        // Lignes de texte réparties dans le corps (sous le bandeau)
        const bodyH=NH-NHH;
        lines.forEach((ln,i)=>
          g.append('text').attr('x',NW/2).attr('y',NHH+bodyH*(i+1)/(lines.length+1)+3)
            .attr('text-anchor','middle').attr('dominant-baseline','central')
            .attr('fill',C.nodeTxt).attr('font-size',lineFsN)
            .attr('pointer-events','none').text(ln));

        if (d.data.hasMore && !d.data.children?.length && !d.data._saved?.length)
          g.append('text').attr('x',NW-5).attr('y',NH-4)
            .attr('text-anchor','end').attr('fill',C.dim)
            .attr('font-size',9).attr('pointer-events','none').text('•••');
      }

      // Zone de capture des événements (taille fixe W_N × H_N)
      g.append('rect').attr('width',W_N).attr('height',H_N).attr('rx',5)
        .attr('fill','transparent')
        .on('mouseenter', ev=>{ showTip(ev,el); rmHighlight(d.data.uid,false); })
        .on('mousemove',  ev=>moveTip(ev))
        .on('mouseleave', ()=>{ hideTip(); rmHighlight(null,false); })
        .on('click',       ev=>{ ev.stopPropagation(); S.selNode=d.data.uid; S.propEl=el.id; buildPropertiesPanel(); render(); })
        .on('dblclick',    ev=>{ ev.stopPropagation(); setCtx(el.id); })
        .on('contextmenu', ev=>{ ev.preventDefault();  showCtxMenu(ev,d.data); });

      // Bouton +/− dans le coin haut-droit (après event rect → Z-top)
      const hasCh=d.data.children?.length>0, hasSaved=d.data._saved?.length>0;
      if (hasCh||hasSaved) {
        const tg=g.append('g').attr('transform',`translate(${W_N-R_T-3},${R_T+3})`)
          .style('cursor','pointer')
          .on('click', ev=>{ ev.stopPropagation(); toggleNode(d.data); });
        tg.append('circle').attr('r',R_T)
          .attr('fill','rgba(0,0,0,0.35)')
          .attr('stroke',hasCh?C.accent:C.dim).attr('stroke-width',1.5);
        tg.append('text').attr('text-anchor','middle').attr('dominant-baseline','central')
          .attr('fill','#ffffff').attr('font-size',S.compact?10:13).attr('font-weight','bold')
          .attr('y',1).attr('pointer-events','none').text(hasCh?'−':'+');
      }
    });

  updateInfo();
  updateLegend();
}