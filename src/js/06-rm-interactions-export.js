/* ═══════════════════════════════════════════════════════════════════════
   9. INTERACTIONS NŒUDS
   ═══════════════════════════════════════════════════════════════════════ */

/** Bascule l'état développé/réduit. Modifie treeData en place → pas de rebuild. */
/** Ouvre/ferme un nœud (affiche/masque ses enfants dans le graphe). @param node Nœud D3 */
function toggleNode(node) {
  if (node.children?.length>0) { node._saved=node.children; node.children=[]; }
  else if (node._saved?.length>0) { node.children=node._saved; node._saved=[]; }
  render();
}

/** Développe récursivement tous les nœuds à partir de `node`. */
function expandAllNodes(node) {
  if (!node) return;
  if (node._saved?.length) { node.children=node._saved; node._saved=[]; }
  (node.children||[]).forEach(expandAllNodes);
}

/** Réduit récursivement tous les nœuds au-delà de la profondeur 1. */
function collapseAllNodes(node, depth=0) {
  if (!node) return;
  if (depth>0 && node.children?.length) { node._saved=node.children.slice(); node.children=[]; return; }
  (node.children||[]).forEach(c=>collapseAllNodes(c,depth+1));
}

/** Définit l'élément central (ctx) de la Relation Map et redessine.
 * @param {string} id - ID de l'élément à centrer
 */
function setCtx(id) {
  if (S.chainView) { S.chainView=null; rmChainBanner(null); }
  S.ctx=id; S.selNode=null;
  S.propEl=id; buildPropertiesPanel();
  document.getElementById('ctx-sel').value=id;
  rebuildTree();
  setTimeout(()=>fitView(true),80);
}

/* ═══════════════════════════════════════════════════════════════════════
   10. FIT TO VIEW
   ═══════════════════════════════════════════════════════════════════════ */
/** Ajuste le zoom et le pan pour que tout le contenu du graphe soit visible.
 * @param {boolean} anim - Active la transition CSS
 */
function fitView(anim=true) {
  if (S.chainView && S._chainBounds) {
    const b=S._chainBounds, svgEl=document.getElementById('svg');
    const W=svgEl.clientWidth||900, H=svgEl.clientHeight||600, pad=50;
    const bW=b.x1-b.x0+pad*2, bH=b.y1-b.y0+pad*2, sc=Math.min(W/bW,H/bH,1.6);
    const tx=(W-bW*sc)/2-(b.x0-pad)*sc, ty=(H-bH*sc)/2-(b.y0-pad)*sc;
    (anim?svg.transition().duration(450):svg).call(zoomBeh.transform, d3.zoomIdentity.translate(tx,ty).scale(sc));
    return;
  }
  if (!d3Root) return;
  const nodes=d3Root.descendants(); if (!nodes.length) return;
  const svgEl=document.getElementById('svg');
  const W=svgEl.clientWidth, H=svgEl.clientHeight;
  const {gx,gy}=layoutFns();
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  const _hw=cw()/2, _hh=ch()/2, _tr=S.compact?CTR:TR;
  nodes.forEach(d=>{ x0=Math.min(x0,gx(d)-_hw); x1=Math.max(x1,gx(d)+_hw+_tr*2);
                     y0=Math.min(y0,gy(d)-_hh);  y1=Math.max(y1,gy(d)+_hh); });
  const pad=50, bW=x1-x0+pad*2, bH=y1-y0+pad*2;
  const sc=Math.min(W/bW,H/bH,1.8);
  const tx=(W-bW*sc)/2-(x0-pad)*sc, ty=(H-bH*sc)/2-(y0-pad)*sc;
  (anim?svg.transition().duration(450):svg)
    .call(zoomBeh.transform, d3.zoomIdentity.translate(tx,ty).scale(sc));
}

/** Retourne les fonctions de position selon la disposition courante. */
/** Retourne les accesseurs de position {gx, gy} selon la disposition courante (LR/TB/RL/radial/zigzag). */
function layoutFns() {
  if (S.layout==='LR')     return {gx:d=>d.y,   gy:d=>d.x};
  if (S.layout==='RL')     return {gx:d=>-d.y,  gy:d=>d.x};
  if (S.layout==='radial') return {gx:d=>d._px, gy:d=>d._py};
  if (S.layout==='zigzag') return {gx:d=>d._zx, gy:d=>d._zy};
  return {gx:d=>d.x, gy:d=>d.y};
}

/* ═══════════════════════════════════════════════════════════════════════
   11. INFOBULLE & MENU CONTEXTUEL
   ═══════════════════════════════════════════════════════════════════════ */
const tipEl=document.getElementById('tip');
/** Affiche l'infobulle de survol d'un nœud. @param ev MouseEvent @param el Élément MODEL */
function showTip(ev,el){
  document.getElementById('tt-n').textContent=el.name;
  document.getElementById('tt-s').textContent=[(TCFG[el.type]||{}).label||el.type, el.pkg].filter(Boolean).join('  ·  ');
  tipEl.style.display='block'; moveTip(ev);
}
/** Repositionne l'infobulle flottante à la position du curseur lors du survol.
 */
function moveTip(ev){ tipEl.style.left=(ev.clientX+14)+'px'; tipEl.style.top=(ev.clientY-8)+'px'; }
/** Masque l'infobulle flottante du graphe.
 */
function hideTip(){ tipEl.style.display='none'; }

const ctxMenuEl=document.getElementById('ctxmenu');
let ctxNode=null;
/** Affiche le menu contextuel (clic droit) sur un nœud du graphe. */
function showCtxMenu(ev,node){
  ctxNode=node;
  ctxMenuEl.style.left=ev.clientX+'px'; ctxMenuEl.style.top=ev.clientY+'px';
  ctxMenuEl.style.display='block';
}
/** Masque le menu contextuel du graphe.
 */
function hideCtxMenu(){ ctxMenuEl.style.display='none'; ctxNode=null; }
document.addEventListener('click', hideCtxMenu);

// ── Gestionnaires menu contextuel ──
document.getElementById('cx-ctx').onclick      = ()=>{ if(ctxNode) setCtx(ctxNode.eid); };
document.getElementById('cx-exp').onclick      = ()=>{ if(ctxNode&&!ctxNode.children?.length) toggleNode(ctxNode); };
document.getElementById('cx-col').onclick      = ()=>{ if(ctxNode?.children?.length) toggleNode(ctxNode); };
document.getElementById('cx-hide').onclick     = ()=>{ if(ctxNode){ S.hidden.add(ctxNode.eid); rebuildTree(); } };

// Modifier l'élément → panneau flottant d'édition inline
document.getElementById('cx-edit').onclick     = (ev)=>{
  if (!ctxNode) return;
  const idx = MODEL.elements.findIndex(e=>e.id===ctxNode.eid);
  if (idx<0) return;
  showFloatEdit(ev, MODEL.elements[idx], idx);
};

// Créer une relation vers un autre élément
document.getElementById('cx-new-rel').onclick  = (ev)=>{
  if (!ctxNode) return;
  showFloatRelation(ev, ctxNode.eid);
};

// Créer un élément enfant et l'attacher au nœud courant
document.getElementById('cx-new-child').onclick = (ev)=>{
  if (!ctxNode) return;
  showFloatNewChild(ev, ctxNode.eid);
};


/* ═══════════════════════════════════════════════════════════════════════
   12. PANNEAU FLOTTANT (édition inline)
   Utilisé pour : modifier un élément, créer une relation, créer un enfant.
   ═══════════════════════════════════════════════════════════════════════ */
const floatPanel=document.getElementById('float-panel');
let floatSaveAction=null;

document.getElementById('float-cancel').onclick=()=>{ floatPanel.style.display='none'; };
document.getElementById('float-save').onclick  =()=>{ if(floatSaveAction) floatSaveAction(); };

/** Positionne le panneau flottant près du curseur sans sortir de l'écran. */
/** Positionne le panneau flottant d'édition près du curseur. */
function positionFloat(ev) {
  floatPanel.style.display='block';
  const pw=floatPanel.offsetWidth||280, ph=floatPanel.offsetHeight||220;
  const vw=window.innerWidth, vh=window.innerHeight;
  let l=ev.clientX+18, t=ev.clientY-10;
  if (l+pw>vw-10) l=ev.clientX-pw-8;
  if (t+ph>vh-10) t=ev.clientY-ph-8;
  floatPanel.style.left=Math.max(8,l)+'px';
  floatPanel.style.top =Math.max(8,t)+'px';
}

/** Affiche le formulaire d'édition inline d'un élément existant. */
function showFloatEdit(ev, el, idx) {
  hideCtxMenu(); hideTip();
  document.getElementById('float-title').textContent='Modifier l\'élément';
  const allTypes=[...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])];
  const typeOpts=allTypes.map(t=>`<option value="${t}"${el.type===t?' selected':''}>${t}</option>`).join('');
  const pkgOpts =MODEL.elements.filter(e=>e.type==='Package').map(p=>`<option value="${p.name}"${el.pkg===p.name?' selected':''}>${p.name}</option>`).join('');
  document.getElementById('float-body').innerHTML=`
    <div class="frow"><label>Nom</label>
      <input id="fl-name" value="${el.name.replace(/"/g,'&quot;')}"></div>
    <div class="frow"><label>Type</label>
      <select id="fl-type">${typeOpts}</select></div>
    <div class="frow"><label>Paquetage</label>
      <select id="fl-pkg">${pkgOpts}</select></div>`;
  floatSaveAction=()=>{
    const name=document.getElementById('fl-name').value.trim();
    const type=document.getElementById('fl-type').value;
    const pkg =document.getElementById('fl-pkg').value;
    if (!name){ alert('Le nom ne peut pas être vide.'); return; }
    MODEL.elements[idx]={...MODEL.elements[idx], name, type, pkg};
    floatPanel.style.display='none';
    onModelChanged();
  };
  positionFloat(ev);
}

/** Affiche le formulaire de création d'une relation depuis un élément source. */
function showFloatRelation(ev, sourceId) {
  hideCtxMenu(); hideTip();
  document.getElementById('float-title').textContent='Créer une relation';
  const srcEl=MODEL.elements.find(e=>e.id===sourceId);
  const elOpts=MODEL.elements
    .filter(e=>e.id!==sourceId)
    .map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  const typeOpts=Object.keys(RCFG).map(t=>`<option value="${t}">${t}</option>`).join('');
  document.getElementById('float-body').innerHTML=`
    <div class="frow"><label>Source</label>
      <span style="font-size:12px;color:var(--c-text)">${srcEl?.name||sourceId}</span></div>
    <div class="frow"><label>Type</label>
      <select id="fl-rel-type">${typeOpts}</select></div>
    <div class="frow"><label>Cible</label>
      <select id="fl-rel-tgt">${elOpts}</select></div>
    <div class="frow"><label>Nom (opt.)</label>
      <input id="fl-rel-name" placeholder="ex: uses"></div>`;
  floatSaveAction=()=>{
    const type=document.getElementById('fl-rel-type').value;
    const tgt =document.getElementById('fl-rel-tgt').value;
    const name=document.getElementById('fl-rel-name').value.trim();
    if (!tgt){ alert('Veuillez sélectionner une cible.'); return; }
    MODEL.relations.push({id:'r_'+Date.now(), src:sourceId, tgt, type, name});
    floatPanel.style.display='none';
    onModelChanged();
  };
  positionFloat(ev);
}

/** Affiche le formulaire de création d'un élément enfant lié au nœud courant. */
/** Affiche le formulaire de création d'un élément enfant. */
function showFloatNewChild(ev, parentId) {
  hideCtxMenu(); hideTip();
  document.getElementById('float-title').textContent='Créer un élément enfant';
  const parentEl=MODEL.elements.find(e=>e.id===parentId);
  const typeOpts=[...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])]
    .map(t=>`<option value="${t}">${t}</option>`).join('');
  const pkgOpts =MODEL.elements.filter(e=>e.type==='Package').map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
  const relOpts =Object.keys(RCFG).map(t=>`<option value="${t}">${t}</option>`).join('');
  document.getElementById('float-body').innerHTML=`
    <div class="frow"><label>Parent</label>
      <span style="font-size:12px;color:var(--c-text)">${parentEl?.name||parentId}</span></div>
    <div class="frow"><label>Nom enfant</label>
      <input id="fl-ch-name" placeholder="Nom du nouvel élément"></div>
    <div class="frow"><label>Type</label>
      <select id="fl-ch-type">${typeOpts}</select></div>
    <div class="frow"><label>Paquetage</label>
      <select id="fl-ch-pkg">${pkgOpts}</select></div>
    <div class="frow"><label>Relation</label>
      <select id="fl-ch-rel">${relOpts}</select></div>`;
  floatSaveAction=()=>{
    const name=document.getElementById('fl-ch-name').value.trim();
    const type=document.getElementById('fl-ch-type').value;
    const pkg =document.getElementById('fl-ch-pkg').value;
    const rel =document.getElementById('fl-ch-rel').value;
    if (!name){ alert('Le nom ne peut pas être vide.'); return; }
    const newId='el_'+Date.now();
    MODEL.elements.push({id:newId, name, type, pkg});
    MODEL.relations.push({id:'r_'+Date.now(), src:parentId, tgt:newId, type:rel, name});
    floatPanel.style.display='none';
    onModelChanged();
  };
  positionFloat(ev);
}

/**
 * Affiche le formulaire de création d'un nouvel élément standalone.
 * L'élément créé est automatiquement sélectionné comme contexte de la carte.
 */
/** Affiche le formulaire de création d'un nouvel élément. */
function showFloatNewElement(ev) {
  hideCtxMenu(); hideTip();
  document.getElementById('float-title').textContent='Créer un nouvel élément';
  const typeOpts=[...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])]
    .map(t=>`<option value="${t}">${t}</option>`).join('');
  const pkgOpts=MODEL.elements.filter(e=>e.type==='Package').map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
  document.getElementById('float-body').innerHTML=`
    <div class="frow"><label>Nom</label>
      <input id="fl-ne-name" placeholder="Nom de l'élément"></div>
    <div class="frow"><label>Type</label>
      <select id="fl-ne-type">${typeOpts}</select></div>
    <div class="frow"><label>Paquetage</label>
      <select id="fl-ne-pkg">${pkgOpts}</select></div>
    <div style="font-size:10px;color:var(--c-dim);margin-top:2px">
      L'élément créé deviendra automatiquement le contexte de la carte.</div>`;
  floatSaveAction=()=>{
    const name=document.getElementById('fl-ne-name').value.trim();
    const type=document.getElementById('fl-ne-type').value;
    const pkg =document.getElementById('fl-ne-pkg').value;
    if (!name){ alert('Le nom ne peut pas être vide.'); return; }
    const newId='el_'+Date.now();
    MODEL.elements.push({id:newId, name, type, pkg});
    floatPanel.style.display='none';
    // Devient le contexte immédiatement après création
    S.ctx=newId;
    onModelChanged();
    document.getElementById('ctx-sel').value=newId;
    setTimeout(()=>fitView(true),80);
  };
  positionFloat(ev);
}

/* ═══════════════════════════════════════════════════════════════════════
   13. CALCUL DES BORNES DU CONTENU
   Utilisé par exportContent() pour exporter l'intégralité du graphe
   (et non uniquement la zone visible), garantissant une haute résolution.
   ═══════════════════════════════════════════════════════════════════════ */
/** Calcule les dimensions réelles du contenu SVG (bounding box de tous les nœuds). */
function getContentBounds() {
  if (!d3Root) return null;
  const nodes=d3Root.descendants(); if (!nodes.length) return null;
  const {gx,gy}=layoutFns();
  const pad=50;
  const _ehw=cw()/2, _ehh=ch()/2, _etr=S.compact?CTR:TR;
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  nodes.forEach(d=>{
    x0=Math.min(x0,gx(d)-_ehw-pad);   x1=Math.max(x1,gx(d)+_ehw+_etr*2+pad);
    y0=Math.min(y0,gy(d)-_ehh-pad);   y1=Math.max(y1,gy(d)+_ehh+pad);
  });
  return {x0,y0,w:x1-x0,h:y1-y0};
}

/* ═══════════════════════════════════════════════════════════════════════
   14. EXPORT (PNG haute résolution, JPEG, SVG)

   Technique : on recalcule un SVG dont le viewBox correspond exactement
   aux bornes du contenu, puis on le rasterise sur un canvas au DPI choisi.
   Cela élimine la pixelisation et exporte TOUT le graphe (pas seulement
   la zone visible à l'écran).
   ═══════════════════════════════════════════════════════════════════════ */
let exportPending = null; // {format, dpi} en attente de confirmation

/** Ouvre le modal d'export image. @param {string} format - 'png'|'jpeg'|'svg' */
function openExportModal(format) {
  exportPending = { format };
  document.getElementById('export-title').textContent =
    format==='png' ? '🖼 Exporter en PNG' : format==='jpeg' ? '📷 Exporter en JPEG' : '📐 Exporter en SVG';
  updateExportInfo();
  document.getElementById('export-ov').classList.add('open');
}
/** Met à jour le libellé d'information affiché dans le menu Export (dimensions/format prévus).
 */
function updateExportInfo() {
  const b = getContentBounds();
  if (!b) { document.getElementById('export-size-info').textContent='Aucun contenu'; return; }
  const dpi = parseInt(document.querySelector('.dpi-btn.active')?.dataset.dpi||2);
  const w=Math.round(b.w*dpi), h=Math.round(b.h*dpi);
  document.getElementById('export-size-info').textContent = `Dimensions : ${w}×${h} px`;
}
document.querySelectorAll('.dpi-btn').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.dpi-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    updateExportInfo();
  };
});
document.getElementById('export-cancel').onclick=()=>{
  document.getElementById('export-ov').classList.remove('open');
};
document.getElementById('export-confirm').onclick=()=>{
  const dpi=parseInt(document.querySelector('.dpi-btn.active')?.dataset.dpi||2);
  document.getElementById('export-ov').classList.remove('open');
  if (exportPending) exportContent(exportPending.format, dpi);
};

/**
 * Génère et télécharge le fichier d'export dans le format demandé.
 * @param {string} format  'png' | 'jpeg' | 'svg'
 * @param {number} dpi     Multiplicateur de résolution (1–4)
 */
/** Exporte le graphe en image. Gère PNG (canvas), JPEG (canvas) et SVG (inline).
 * @param {string} format @param {number} dpi - Facteur de résolution pour PNG/JPEG
 */
function exportContent(format, dpi=2) {
  const bounds = getContentBounds();
  if (!bounds) { alert('Rien à exporter.'); return; }

  const {x0, y0, w, h} = bounds;

  // Clone le SVG sans modifier l'original
  const svgEl = document.getElementById('svg');
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Supprime le transform de zoom sur #root et le remplace par une translation
  // qui amène le coin haut-gauche des bornes à (0,0)
  const rootG = clone.querySelector('#root');
  rootG.setAttribute('transform', `translate(${-x0},${-y0})`);

  // Définit le viewBox et les dimensions de sortie
  clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  clone.setAttribute('width',  w * dpi);
  clone.setAttribute('height', h * dpi);

  // Injecte le fond de couleur et les polices pour le rendu hors navigateur
  const style = document.createElementNS('http://www.w3.org/2000/svg','style');
  style.textContent='text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}';
  clone.insertBefore(style, clone.firstChild);

  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  bg.setAttribute('width','100%'); bg.setAttribute('height','100%');
  bg.setAttribute('fill', tv('--c-bg')||'#1e1e2e');
  clone.insertBefore(bg, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob   = new Blob([svgStr],{type:'image/svg+xml'});
  const url    = URL.createObjectURL(blob);

  // Export SVG direct
  if (format==='svg') {
    const a=document.createElement('a'); a.download='relation-map.svg'; a.href=url; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    return;
  }

  // Rasterisation PNG / JPEG via canvas
  const canvas  = document.createElement('canvas');
  canvas.width  = w * dpi;
  canvas.height = h * dpi;
  const ctx2d   = canvas.getContext('2d');

  const img = new Image();
  img.onload = ()=>{
    ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const a=document.createElement('a');
    if (format==='jpeg') {
      a.download='relation-map.jpg';
      a.href=canvas.toDataURL('image/jpeg', 0.93); // qualité 93 %
    } else {
      a.download='relation-map.png';
      a.href=canvas.toDataURL('image/png');
    }
    a.click();
  };
  img.onerror=()=>{ URL.revokeObjectURL(url); alert('Erreur lors de l\'export.'); };
  img.src=url;
}

/* ═══════════════════════════════════════════════════════════════════════
   15. LÉGENDE & BARRE D'INFO
   ═══════════════════════════════════════════════════════════════════════ */
/** Met à jour la légende des types et relations affichée dans le panneau gauche. */
function updateLegend() {
  const c=document.getElementById('leg-body'); c.innerHTML='';
  Object.entries(RCFG).filter(([t])=>S.relF[t]).forEach(([t,cfg])=>{
    const item=document.createElement('div'); item.className='leg-item';
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('width','28'); s.setAttribute('height','12');
    const ln=document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1','0');ln.setAttribute('y1','6');ln.setAttribute('x2','24');ln.setAttribute('y2','6');
    ln.setAttribute('stroke',cfg.color); ln.setAttribute('stroke-width','2');
    if (cfg.dash) ln.setAttribute('stroke-dasharray',cfg.dash);
    s.appendChild(ln);
    const sp=document.createElement('span');
    sp.textContent = cfg.label || t; // nom humain si défini (relations Capella), sinon clé technique
    if (cfg.label) sp.title = t; // tooltip = nom technique réel
    item.appendChild(s); item.appendChild(sp); c.appendChild(item);
  });
  document.getElementById('legend').style.display=S.showLegend?'':'none';
}

/** Met à jour le compteur d'éléments/relations affiché en bas du panneau. */
function updateInfo() {
  if (!d3Root) return;
  const nodes=d3Root.descendants();
  const uniq=new Set(nodes.map(n=>n.data.eid)).size;
  const ctxName=MODEL.elements.find(e=>e.id===S.ctx)?.name||S.ctx;
  document.getElementById('info-txt').textContent=
    `Contexte : ${ctxName}  |  Nœuds : ${nodes.length}  |  Éléments uniques : ${uniq}  |  Profondeur : ${S.depth}`;
}

/** Coche ou décoche tous les filtres de types d'éléments du panneau gauche.
 */
function typSelectAll(v) {
  [...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])].forEach(t=>S.typF[t]=v);
  buildPanel();
  if (currentMode==='table') buildTableView(); else rebuildTree();
}

/** Coche ou décoche tous les filtres de types de relations du panneau gauche.
 */
function relSelectAll(v) {
  Object.keys(S.relF).forEach(t=>S.relF[t]=v);
  buildPanel();
  if (currentMode!=='table') rebuildTree();
}