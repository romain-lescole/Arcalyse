/* ═══════════════════════════════════════════════════════════════════════
   4. ÉTAT DE L'APPLICATION
   ═══════════════════════════════════════════════════════════════════════ */
const S = {
  ctx:        null,
  depth:      3,
  layout:     'LR',
  showLegend: true,
  showNums:   false,
  showRelNames: true,
  cutNames:   false,   // noms complets par défaut (retour à la ligne sur 3 lignes) ; ✂ Noms pour couper
  cutLen:     16,
  singleNode: false,
  compact:    false,
  relF: Object.fromEntries(Object.keys(RCFG).map(t => [t, true])),
  typF: Object.fromEntries(Object.keys(TCFG).map(t => [t, true])),
  pkgF: {},
  hidden:  new Set(),
  selNode: null,
  propEl:  null,
};

const NW=155, NH=50, NHH=18, TR=9;
// Dimensions en mode compact (pilule colorée, nom seul)
const CW=120, CH=26, CTR=7;
// Retourne la largeur/hauteur du nœud selon le mode courant
const cw=()=>S.compact?CW:NW;
const ch=()=>S.compact?CH:NH;

// Palette de couleurs pré-définies, attribuées automatiquement aux nouveaux types/critères
const COLOR_PALETTE=[
  '#89b4fa','#a6e3a1','#89dceb','#fab387','#f38ba8','#cba6f7',
  '#f9e2af','#94e2d5','#eba0ac','#74c7ec','#b4befe','#ff9a3c',
  '#6bcb77','#4d96ff','#c77dff','#ff6b6b','#ffd93d','#aef359',
  '#ff8fab','#caffbf','#9bf6ff','#ffc6ff','#fdffb6','#bde0fe',
];
/** Retourne la prochaine couleur non encore utilisée dans TCFG ni RCFG. */
function nextColor() {
  const used=new Set([
    ...Object.values(TCFG).map(c=>c.color),
    ...Object.values(RCFG).map(c=>c.color),
  ]);
  return COLOR_PALETTE.find(c=>!used.has(c))
    || COLOR_PALETTE[(Object.keys(TCFG).length+Object.keys(RCFG).length)%COLOR_PALETTE.length];
}
let treeData=null, d3Root=null, uidSeq=0;

/* ═══════════════════════════════════════════════════════════════════════
   5. SVG & ZOOM
   ═══════════════════════════════════════════════════════════════════════ */
const svg   = d3.select('#svg');
const gRoot = d3.select('#root');
const gL    = d3.select('#g-links');
const gN    = d3.select('#g-nodes');

const zoomBeh = d3.zoom().scaleExtent([0.04, 5])
  .on('zoom', e => gRoot.attr('transform', e.transform));
svg.call(zoomBeh).on('dblclick.zoom', null);

/* ═══════════════════════════════════════════════════════════════════════
   6. MARQUEURS SVG (flèches, diamants)
   ═══════════════════════════════════════════════════════════════════════ */
/** Crée/recrée les marqueurs SVG (flèches, diamants, cercles) pour chaque type de relation défini dans RCFG.
 * Doit être appelé après tout changement de couleur ou de type de relation.
 */
function setupMarkers() {
  const defs = d3.select('#defs');
  defs.selectAll('*').remove();
  const bg = tv('--c-bg') || '#1e1e2e';
  Object.entries(RCFG).forEach(([type, cfg]) => {
    // Flèche à la cible (triangle plein, triangle creux ⊳, chevron >, ou aucune)
    if (!cfg.noArrow) {
      const m = defs.append('marker')
        .attr('id', 'arr-'+type).attr('viewBox','0 -6 12 12')
        .attr('refX',10).attr('refY',0)
        .attr('markerWidth',7).attr('markerHeight',7).attr('orient','auto');
      if (cfg.chevron) {
        // Flèche simple > (chevron ouvert, plus fin que le triangle)
        m.append('path').attr('d','M0,-4L9,0L0,4')
          .attr('fill','none').attr('stroke',cfg.color).attr('stroke-width',1.8);
      } else if (cfg.open) {
        // Triangle creux ⊳ (Generalization, Realization…)
        m.append('path').attr('d','M0,-6L12,0L0,6')
          .attr('fill','none').attr('stroke',cfg.color).attr('stroke-width',1.8);
      } else {
        // Triangle plein ▶
        m.append('path').attr('d','M0,-6L12,0L0,6Z').attr('fill',cfg.color);
      }
    }
    // Losange plein à la source (Composition)
    if (cfg.diamond) {
      defs.append('marker')
        .attr('id','dia-'+type).attr('viewBox','-1 -5 22 10')
        .attr('refX',20).attr('refY',0).attr('markerWidth',12).attr('markerHeight',12)
        .attr('orient','auto-start-reverse')
        .append('path').attr('d','M0,0L10,-5L20,0L10,5Z').attr('fill',cfg.color);
    }
    // Losange vide à la source (Aggregation)
    if (cfg.hollowDiamond) {
      defs.append('marker')
        .attr('id','hdia-'+type).attr('viewBox','-1 -5 22 10')
        .attr('refX',20).attr('refY',0).attr('markerWidth',12).attr('markerHeight',12)
        .attr('orient','auto-start-reverse')
        .append('path').attr('d','M0,0L10,-5L20,0L10,5Z')
          .attr('fill',bg).attr('stroke',cfg.color).attr('stroke-width',1.5);
    }
    // Cercle ⊕ à la source (Containment)
    if (cfg.circle) {
      const cm = defs.append('marker')
        .attr('id','circ-'+type).attr('viewBox','-1 -7 15 14')
        .attr('refX',12).attr('refY',0).attr('markerWidth',11).attr('markerHeight',11)
        .attr('orient','auto-start-reverse');
      cm.append('circle').attr('cx',6).attr('cy',0).attr('r',6)
        .attr('fill','none').attr('stroke',cfg.color).attr('stroke-width',1.5);
      cm.append('line').attr('x1',0).attr('y1',0).attr('x2',12).attr('y2',0)
        .attr('stroke',cfg.color).attr('stroke-width',1.2);
      cm.append('line').attr('x1',6).attr('y1',-6).attr('x2',6).attr('y2',6)
        .attr('stroke',cfg.color).attr('stroke-width',1.2);
    }
  });
}