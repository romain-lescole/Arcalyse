/* ═══════════════════════════════════════════════════════════════════════
   18. SAUVEGARDE / CHARGEMENT JSON
   ═══════════════════════════════════════════════════════════════════════ */
/** Sérialise MODEL, RCFG, TCFG et S en JSON et télécharge le fichier. */
function saveJSON() {
  const data={
    version:3,
    model:{packages:MODEL.packages, pkgParent:MODEL.pkgParent||{}, customAttrs:MODEL.customAttrs||[], elements:MODEL.elements, relations:MODEL.relations},
    view:{ctx:S.ctx, depth:S.depth, layout:S.layout, cutLen:S.cutLen, theme:currentTheme,
          relColors:Object.fromEntries(Object.entries(RCFG).map(([k,v])=>[k,v.color]))},
  };
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download='relation-map.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/** Charge un fichier JSON et restaure l'état complet de l'application. */
function loadJSON(file) {
  const reader=new FileReader();
  reader.onload=ev=>{
    try {
      const data=JSON.parse(ev.target.result);
      if (data.model){
        if (data.model.packages)    MODEL.packages    =data.model.packages;
        if (data.model.pkgParent)   MODEL.pkgParent   =data.model.pkgParent;
        if (data.model.customAttrs) MODEL.customAttrs =data.model.customAttrs;
        if (data.model.elements)    MODEL.elements    =data.model.elements;
        if (data.model.relations)   MODEL.relations   =data.model.relations;
      }
      if (data.view){
        if (data.view.ctx)    S.ctx   =data.view.ctx;
        if (data.view.depth)  S.depth =data.view.depth;
        if (data.view.layout) S.layout=data.view.layout;
        if (data.view.cutLen) S.cutLen=data.view.cutLen;
        if (data.view.theme)  { document.getElementById('theme-sel').value=data.view.theme; applyTheme(data.view.theme); }
        if (data.view.relColors) Object.entries(data.view.relColors).forEach(([k,v])=>{ if(RCFG[k]) RCFG[k].color=v; });
      }
      migratePkgsToElements(); // migrate old format if needed
      S.relF=Object.fromEntries(Object.keys(RCFG).map(t=>[t,true]));
      S.typF=Object.fromEntries([...new Set(MODEL.elements.map(e=>e.type))].map(t=>[t,true]));
      S.pkgF=Object.fromEntries(MODEL.elements.filter(e=>e.type==='Package').map(e=>[e.name,true]));
      S.hidden.clear();
      document.getElementById('dep-inp').value=S.depth;
      document.querySelectorAll('.lbtn').forEach(b=>b.classList.toggle('active',b.dataset.l===S.layout));
      onModelChanged();
    } catch(err){ alert('Erreur : '+err.message); }
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════════════════════════════════════
   19. GESTIONNAIRES TOOLBAR
   ═══════════════════════════════════════════════════════════════════════ */
document.getElementById('b-zi').onclick  = ()=>svg.transition().duration(250).call(zoomBeh.scaleBy,1.4);
document.getElementById('b-zo').onclick  = ()=>svg.transition().duration(250).call(zoomBeh.scaleBy,1/1.4);
document.getElementById('b-fit').onclick = ()=>fitView(true);
document.getElementById('b-ea').onclick  = ()=>{ if(treeData){ expandAllNodes(treeData);  render(); } };
document.getElementById('b-ca').onclick  = ()=>{ if(treeData){ collapseAllNodes(treeData); render(); } };

const bNum=document.getElementById('b-num');
const bLeg=document.getElementById('b-leg');
const bCut=document.getElementById('b-cut');
const bSgl=document.getElementById('b-single');
const bCpct=document.getElementById('b-compact');
bNum.onclick =()=>{ S.showNums     =!S.showNums;     bNum.classList.toggle('active',S.showNums);     render(); };
bLeg.onclick =()=>{ S.showLegend  =!S.showLegend;  bLeg.classList.toggle('active',S.showLegend);  updateLegend(); };
const bRln=document.getElementById('b-rln');
bRln.onclick =()=>{ S.showRelNames=!S.showRelNames; bRln.classList.toggle('active',S.showRelNames); render(); };
bCut.onclick =()=>{ S.cutNames    =!S.cutNames;     bCut.classList.toggle('active',S.cutNames);     render(); };
bSgl.onclick =()=>{ S.singleNode=!S.singleNode; bSgl.classList.toggle('active',S.singleNode); rebuildTree(); };
bCpct.onclick=()=>{ S.compact   =!S.compact;    bCpct.classList.toggle('active',S.compact);   render(); setTimeout(()=>fitView(true),60); };

document.getElementById('b-ref').onclick  = ()=>{ S.hidden.clear(); S.selNode=null; rebuildTree(); setTimeout(()=>fitView(true),80); };
document.getElementById('b-edit').onclick  = ()=>{ document.getElementById('b-edit-dd').style.display='none'; openModal(); };
document.getElementById('b-save').onclick  = ()=>{ document.getElementById('b-edit-dd').style.display='none'; saveJSON(); };
document.getElementById('b-load').onclick  = ()=>{ document.getElementById('b-edit-dd').style.display='none'; document.getElementById('file-input').click(); };
document.getElementById('b-expng').onclick  = ()=>{ document.getElementById('b-exp-dd').style.display='none'; openExportModal('png'); };
document.getElementById('b-expjpg').onclick = ()=>{ document.getElementById('b-exp-dd').style.display='none'; openExportModal('jpeg'); };
document.getElementById('b-exsvg').onclick  = ()=>{ document.getElementById('b-exp-dd').style.display='none'; openExportModal('svg'); };
// Dropdown toggle for Edit menu
document.getElementById('b-edit-menu')?.addEventListener('click',e=>{
  e.stopPropagation();
  const dd=document.getElementById('b-edit-dd');
  dd.style.display=dd.style.display==='block'?'none':'block';
  document.getElementById('b-exp-dd').style.display='none';
});
// Dropdown toggle for Export menu
document.getElementById('b-exp-menu')?.addEventListener('click',e=>{
  e.stopPropagation();
  const dd=document.getElementById('b-exp-dd');
  dd.style.display=dd.style.display==='block'?'none':'block';
  document.getElementById('b-edit-dd').style.display='none';
});
// Close dropdowns on outside click
document.addEventListener('click',()=>{
  document.getElementById('b-edit-dd').style.display='none';
  document.getElementById('b-exp-dd').style.display='none';
});
document.getElementById('file-input').onchange=ev=>{ if(ev.target.files[0]) loadJSON(ev.target.files[0]); ev.target.value=''; };

/** Applique la profondeur d'exploration du graphe (bornée entre 1 et 10),
 * met à jour le champ de saisie puis reconstruit et recadre la vue.
 * @param {number} val - Profondeur souhaitée
 */
function applyDepth(val){ S.depth=Math.max(1,Math.min(10,val||3)); document.getElementById('dep-inp').value=S.depth; rebuildTree(); setTimeout(()=>fitView(true),80); }
document.getElementById('b-dm').onclick    = ()=>applyDepth(S.depth-1);
document.getElementById('b-dp').onclick    = ()=>applyDepth(S.depth+1);
document.getElementById('dep-inp').onchange= ev=>applyDepth(parseInt(ev.target.value));

document.querySelectorAll('.lbtn').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.lbtn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); S.layout=b.dataset.l; render(); setTimeout(()=>fitView(true),80);
});

// Sélecteur de mode
// Mode buttons wiring
document.getElementById('mode-rm')?.addEventListener('click',()=>applyMode('default'));
document.getElementById('mode-pbs')?.addEventListener('click',()=>applyMode('PBS'));

// Sélecteur de thème
document.getElementById('theme-sel').onchange=ev=>applyTheme(ev.target.value);

svg.on('click',()=>{ S.selNode=null; render(); });

// ── Aide JSON ──
// Bouton ? Aide ▾ : menu (aide complète, visite guidée) câblé dans 41-barre-vues.js
// Accès à l'aide depuis l'écran d'accueil (sans déclencher l'ouverture du sélecteur de fichier)
document.getElementById('cw-help')?.addEventListener('click', ev=>{ ev.stopPropagation(); openHelpModal('start'); });
document.getElementById('cw-help-link')?.addEventListener('click', ev=>{ ev.preventDefault(); ev.stopPropagation(); openHelpModal('start'); });
document.getElementById('b-new-ctx-el').onclick = ev=>showFloatNewElement(ev);
document.getElementById('help-close').onclick = ()=>{ document.getElementById('help-ov').style.display='none'; };
document.getElementById('help-ov').addEventListener('click', ev=>{
  if (ev.target===document.getElementById('help-ov')) document.getElementById('help-ov').style.display='none';
});
// Help tab navigation
document.getElementById('help-tabs')?.addEventListener('click', ev=>{
  const btn=ev.target.closest('.htab'); if(!btn) return;
  document.querySelectorAll('.htab').forEach(b=>{ b.classList.remove('active'); b.style.background='var(--c-bg3)'; b.style.color='var(--c-dim)'; });
  document.querySelectorAll('.ht-panel').forEach(p=>p.style.display='none');
  btn.classList.add('active'); btn.style.background='var(--c-bg2)'; btn.style.color='var(--c-text)';
  const panel=document.getElementById('ht-'+btn.dataset.ht);
  if(panel) panel.style.display='block';
});

/** Ouvre la fenêtre d'aide, éventuellement sur un onglet donné.
 * @param {string} [tab] - Identifiant d'onglet (start, ui, rm, tv, cap, chains, itf, usecase)
 */
function openHelpModal(tab) {
  if (typeof tab === 'string') document.querySelector(`#help-tabs .htab[data-ht="${tab}"]`)?.click();
  document.getElementById('help-ov').style.display='flex';
}

/* ═══════════════════════════════════════════════════════════════════════
   20. PANEL GAUCHE — Collapse & Resize
   ═══════════════════════════════════════════════════════════════════════ */
(function() {
  const panel    = document.getElementById('panel');
  const openTab  = document.getElementById('panel-open-tab');
  const closeBtn = document.getElementById('panel-close-btn');
  const resizeBar= document.getElementById('panel-resize-bar');
  let panelW = 255; // largeur courante en px

  /** Réduit le panneau latéral gauche à une largeur nulle et affiche l'onglet de réouverture.
   */
  function collapse() {
    panel.classList.add('collapsed');
    openTab.style.display='flex';
    resizeBar.style.display='none';
  }
  /** Rouvre le panneau latéral gauche à sa largeur précédente et masque l'onglet de réouverture.
   */
  function expand() {
    panel.classList.remove('collapsed');
    openTab.style.display='none';
    resizeBar.style.display='';
  }

  closeBtn.onclick = collapse;
  openTab.onclick  = expand;

  // ── Redimensionnement par drag ──────────────────────────────────────
  let dragging=false, startX=0, startW=0;

  resizeBar.addEventListener('mousedown', ev=>{
    if (panel.classList.contains('collapsed')) return;
    dragging=true; startX=ev.clientX; startW=panelW;
    resizeBar.classList.add('active');
    document.body.style.cursor='col-resize';
    document.body.style.userSelect='none';
    ev.preventDefault();
  });

  document.addEventListener('mousemove', ev=>{
    if (!dragging) return;
    const delta=ev.clientX-startX;
    panelW=Math.max(160, Math.min(520, startW+delta));
    document.documentElement.style.setProperty('--panel-w', panelW+'px');
    // Synchronise la largeur du contenu interne (évite le défilement horizontal)
    const inner=document.getElementById('panel-inner');
    if (inner) inner.style.minWidth=panelW+'px';
  });

  document.addEventListener('mouseup', ()=>{
    if (!dragging) return;
    dragging=false;
    resizeBar.classList.remove('active');
    document.body.style.cursor='';
    document.body.style.userSelect='';
  });
})();

/* ═══════════════════════════════════════════════════════════════════════
   21. RACCOURCIS CLAVIER
   ═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', ev=>{
  if (ev.ctrlKey&&(ev.key==='+'||ev.key==='=')){ ev.preventDefault(); svg.transition().duration(200).call(zoomBeh.scaleBy,1.4); }
  if (ev.ctrlKey&&ev.key==='-'){  ev.preventDefault(); svg.transition().duration(200).call(zoomBeh.scaleBy,1/1.4); }
  if (ev.ctrlKey&&ev.key==='w'){  ev.preventDefault(); fitView(true); }
  if (ev.key==='Escape'){
    S.selNode=null; render();
    floatPanel.style.display='none';
    document.getElementById('modal-ov').classList.remove('open');
    document.getElementById('export-ov').classList.remove('open');
    document.getElementById('help-ov').style.display='none';
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   21. INITIALISATION
   ═══════════════════════════════════════════════════════════════════════ */
applyTheme('dark');   // applique le thème par défaut (Sombre)
document.getElementById('theme-sel').value='dark';
migratePkgsToElements(); // convertit packages en éléments type Package
setupMarkers();        // crée les marqueurs SVG
buildPanel();          // construit le panneau de critères
rebuildTree();         // construit l'arbre initial
setTimeout(()=>fitView(false), 150); // ajuste la vue après le premier rendu

// ── Dynamic overlay positioning (accounts for multi-line toolbar) ──
/** Positionne dynamiquement #capella-overlay sous #toolbar (gère le toolbar multi-lignes). */
/** Positionne #capella-overlay sous #toolbar en lisant sa hauteur réelle.
 * Gère le cas où la toolbar passe sur plusieurs lignes (petite fenêtre).
 */
function positionOverlay(){
  const tb=document.getElementById('toolbar');
  const ov=document.getElementById('capella-overlay');
  if(!tb||!ov) return;
  const h=tb.getBoundingClientRect().height;
  ov.style.top=h+'px';
}
positionOverlay();
window.addEventListener('resize', positionOverlay);
// La barre peut changer de hauteur sans redimensionnement (épingles, menus, modèle chargé) : on suit sa taille
if(window.ResizeObserver&&document.getElementById('toolbar')) new ResizeObserver(()=>positionOverlay()).observe(document.getElementById('toolbar'));
// Re-position when capella mode activates
// ── Help button blink for first 5s ──
(function(){
  const btn=document.getElementById('b-help');
  if(!btn) return;
  btn.classList.add('help-blink');
  setTimeout(()=>btn.classList.remove('help-blink'), 5000);
})();