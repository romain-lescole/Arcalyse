/* ═══════════════════════════════════════════════════════════════════════
   17b. ARBORESCENCE  (hiérarchie basée sur parentEl ; packages = type Package)
   ═══════════════════════════════════════════════════════════════════════ */
/** Retourne l'icône associée à un type d'élément (définie dans TCFG). @param {string} t */
function typeIcon(t){ return (TCFG[t]||{}).icon||'◻'; }

// Migre MODEL.packages vers des éléments de type Package (run once at startup)
/** Migre l'ancien format packages[] vers le nouveau format elements[] avec type='Package'.
 * Assure la rétrocompatibilité avec les fichiers JSON sauvegardés avant la v3.
 */
function migratePkgsToElements() {
  if (!MODEL.packages || !MODEL.packages.length) return;
  if (MODEL.elements.some(e=>e.type==='Package')) return; // déjà migré
  if (!MODEL.pkgParent) MODEL.pkgParent={};
  const idMap={};
  let seq=0;
  // Créer les éléments Package
  const pkgEls=MODEL.packages.map(name=>{
    const id='pkg-'+(Date.now()+seq++)+'-'+Math.random().toString(36).slice(2,5);
    idMap[name]=id;
    return {id, name, type:'Package', pkg:name};
  });
  // Insérer en tête dans l'ordre original
  MODEL.elements.unshift(...pkgEls);
  // Parenté entre packages
  MODEL.packages.forEach(name=>{
    const el=MODEL.elements.find(e=>e.id===idMap[name]);
    const par=MODEL.pkgParent[name];
    if (par && idMap[par]) { el.parentEl=idMap[par]; el.pkg=par; }
  });
  // Parenté éléments non-Package vers leur Package
  MODEL.elements.forEach(e=>{
    if (e.type==='Package') return;
    if (e.parentEl) return;
    if (e.pkg && idMap[e.pkg]) e.parentEl=idMap[e.pkg];
  });
  MODEL.packages=[]; MODEL.pkgParent={};
}

/** Remplit le panneau Propriétés avec les attributs de l'élément sélectionné (S.propEl). */
function buildPropertiesPanel() {
  const body=document.getElementById('props-body');
  if (!body) return;
  body.innerHTML='';
  const el=S.propEl?MODEL.elements.find(e=>e.id===S.propEl):null;
  if (!el) {
    const ph=document.createElement('div'); ph.className='prop-empty';
    ph.textContent=_L('Sélectionnez un élément dans l\'arborescence ou la carte.');
    body.appendChild(ph); return;
  }

  /** Crée une ligne libellé/valeur dans le panneau Propriétés.
   */
  function propRow(label, content) {
    const r=document.createElement('div'); r.className='prop-row';
    const lbl=document.createElement('span'); lbl.className='prop-lbl'; lbl.textContent=label; lbl.title=label;
    r.appendChild(lbl); r.appendChild(content); body.appendChild(r); return r;
  }
  /** Rend un texte éditable en place (double-clic) avec validation à la sortie du champ.
   */
  function editableText(value, onCommit) {
    const span=document.createElement('span'); span.className='prop-val';
    span.textContent=value; span.title=_L('Double-clic pour modifier'); span.style.cursor='text';
    span.ondblclick=()=>{
      const inp=document.createElement('input'); inp.className='prop-val-edit'; inp.value=value;
      span.replaceWith(inp); inp.focus(); inp.select();
      const commit=()=>{ const v=inp.value.trim(); if(v) onCommit(v); else buildPropertiesPanel(); };
      inp.onblur=commit; inp.onkeydown=ev=>{ if(ev.key==='Enter') inp.blur(); if(ev.key==='Escape') buildPropertiesPanel(); };
    };
    return span;
  }

  // Nom (double-clic pour modifier)
  const nmIcon=document.createElement('span');
  nmIcon.style.cssText='font-size:13px;margin-right:3px;flex-shrink:0';
  nmIcon.textContent=typeIcon(el.type);
  nmIcon.style.color=(TCFG[el.type]||{}).color||'var(--c-dim)';
  const nmSpan=RM_RO ? Object.assign(document.createElement('span'),{className:'prop-val',textContent:el.name}) : editableText(el.name, v=>{ arboRenameEl(el,v); });
  const nmWrap=document.createElement('span'); nmWrap.style.cssText='display:flex;align-items:center;flex:1;min-width:0';
  nmWrap.appendChild(nmIcon); nmWrap.appendChild(nmSpan);
  propRow(_L('Nom'), nmWrap);

  // ID (lecture seule, copiable)
  const idSpan=document.createElement('span'); idSpan.className='prop-val';
  idSpan.style.cssText+='font-size:10px;color:var(--c-dim);cursor:pointer';
  idSpan.textContent=el.id; idSpan.title=_L('Cliquer pour copier');
  idSpan.onclick=()=>{ navigator.clipboard?.writeText(el.id); idSpan.style.color='var(--c-accent)'; setTimeout(()=>idSpan.style.color='',800); };
  propRow('ID', idSpan);

  // Type — éditable (menu déroulant) pour les éléments natifs, lecture seule pour les éléments Capella
  if (el._capella || RM_RO) {
    const typSpan=document.createElement('span'); typSpan.className='prop-val';
    typSpan.textContent = typeIcon(el.type)+' '+el.type;
    typSpan.style.cssText+='color:var(--c-dim)';
    propRow('Type', typSpan);
  } else {
    const typSel=document.createElement('select'); typSel.className='inp prop-val-edit';
    Object.keys(TCFG).forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=typeIcon(t)+' '+t; if(t===el.type) o.selected=true; typSel.appendChild(o); });
    typSel.onchange=()=>{ el.type=typSel.value; buildArbo(); render(); buildPropertiesPanel(); };
    propRow('Type', typSel);
  }

  // Parent — éditable (menu déroulant) pour les éléments natifs, lecture seule pour les éléments Capella
  if (el._capella || RM_RO) {
    const parEl = el.parentEl ? MODEL.elements.find(e=>e.id===el.parentEl) : null;
    const parSpan=document.createElement('span'); parSpan.className='prop-val';
    parSpan.textContent = parEl ? (typeIcon(parEl.type)+' '+parEl.name) : _L('— racine');
    parSpan.style.cssText+='color:var(--c-dim)';
    propRow('Parent', parSpan);
  } else {
    const parSel=document.createElement('select'); parSel.className='inp prop-val-edit';
    const oRoot=document.createElement('option'); oRoot.value='racine'; oRoot.textContent=_L('— racine');
    if (!el.parentEl) oRoot.selected=true; parSel.appendChild(oRoot);
    const pkgEls=MODEL.elements.filter(e=>e.type==='Package'&&e.id!==el.id);
    if (pkgEls.length) {
      const gp=document.createElement('optgroup'); gp.label=_L('📂 Packages');
      pkgEls.forEach(pe=>{ const o=document.createElement('option'); o.value='el:'+pe.id; o.textContent='📂 '+pe.name; if(el.parentEl===pe.id) o.selected=true; gp.appendChild(o); });
      parSel.appendChild(gp);
    }
    const nonPkg=MODEL.elements.filter(e=>e.type!=='Package'&&e.id!==el.id);
    if (nonPkg.length) {
      const ge=document.createElement('optgroup'); ge.label=_L('Éléments');
      nonPkg.forEach(e=>{ const o=document.createElement('option'); o.value='el:'+e.id; o.textContent=typeIcon(e.type)+' '+e.name; if(el.parentEl===e.id) o.selected=true; ge.appendChild(o); });
      parSel.appendChild(ge);
    }
    parSel.onchange=()=>{ rmSetElemVal(el,'Parent',parSel.value); buildArbo(); buildPropertiesPanel(); };
    propRow('Parent', parSel);
  }

  // Pour les éléments Capella : reprend les mêmes informations détaillées que le panneau
  // de détail de la vue Capella Data (id="cap-detail") — tous les attributs XML bruts
  // (layer, fullType, nature, kind, etc.), en lecture seule.
  if (el._capella) {
    const capEl = capAllElements.find(c=>c.id===el.id);
    if (capEl) {
      const sep=document.createElement('div');
      sep.style.cssText='height:1px;background:var(--c-border);margin:8px 0';
      body.appendChild(sep);
      const hdr=document.createElement('div');
      hdr.textContent=_L('Attributs Capella');
      hdr.style.cssText='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--c-dim);margin-bottom:4px';
      body.appendChild(hdr);
      Object.entries({layer:capEl.layer, fullType:capEl.fullType, ...capEl.attrs}).forEach(([k,v])=>{
        if (!v || k==='name') return; // 'name' déjà affiché en haut du panneau
        const valSpan=document.createElement('span'); valSpan.className='prop-val';
        valSpan.style.cssText+='font-size:11px;color:var(--c-dim);word-break:break-all';
        valSpan.textContent=String(v).slice(0,200);
        valSpan.title=String(v);
        propRow(k, valSpan);
      });
    }
  }

  // Attributs personnalisés
  if (MODEL.customAttrs && MODEL.customAttrs.length) {
    MODEL.customAttrs.forEach(attr=>{
      const cur=(el.attributes||{})[attr]||'';
      if (RM_RO) { const sp=document.createElement('span'); sp.className='prop-val'; sp.textContent=cur||'—'; propRow(attr, sp); return; }
      const inp=document.createElement('input'); inp.className='prop-val-edit'; inp.value=cur;
      inp.placeholder='—';
      const commit=()=>{ if(!el.attributes) el.attributes={}; el.attributes[attr]=inp.value; };
      inp.onblur=commit; inp.onkeydown=ev=>{ if(ev.key==='Enter') inp.blur(); };
      propRow(attr, inp);
    });
  }

}

/** Active le renommage en place d'un nœud de l'arborescence (Entrée valide, Échap annule).
 */
function _arboInlineRename(nameEl, onCommit) {
  const old=nameEl.textContent;
  const inp=document.createElement('input');
  inp.value=old;
  inp.style.cssText='font-size:12px;background:var(--c-bg3);border:1px solid var(--c-accent);border-radius:3px;color:var(--c-text);padding:0 4px;width:120px';
  nameEl.replaceWith(inp); inp.focus(); inp.select();
  const commit=()=>{ const v=inp.value.trim(); if(v&&v!==old) onCommit(v); else buildArbo(); };
  inp.onblur=commit;
  inp.onkeydown=ev=>{ if(ev.key==='Enter') inp.blur(); if(ev.key==='Escape') buildArbo(); };
}

/** Construit l'arborescence gauche à partir de MODEL.elements.
 * Applique le filtre texte (arbo-search) et la liste arboCollapsed.
 * Gère le drag-and-drop pour déplacer les éléments.
 */
function buildArbo() {
  if (_capBulk) { _capBulkDirty=true; return; } // chargement en cours : un seul rendu à la fin
  const body=document.getElementById('arbo-body');
  if (!body) return;
  body.innerHTML='';
  _arboVisibleOrder=[];
  // Purge de la sélection : retire les ids qui n'existent plus dans le modèle
  if(arboMultiSel.size){ const ids=new Set(MODEL.elements.map(e=>e.id)); [...arboMultiSel].forEach(id=>{ if(!ids.has(id)) arboMultiSel.delete(id); }); }
  arboUpdateMselBar();
  const searchQ=(document.getElementById('arbo-search')?.value||'').trim().toLowerCase();
  // Filter: show only nodes whose name matches (or ancestors of matching nodes)
  /** Indique si un élément correspond au filtre de recherche de l'arborescence,
   * ou s'il possède au moins un descendant correspondant (pour garder la branche visible).
   * @param {object} el - Élément à tester
   * @returns {boolean} Vrai si l'élément ou un de ses descendants correspond
   */
  // Index parent → enfants construit une seule fois (évite un parcours complet du modèle par nœud)
  const kidsMap=new Map();
  MODEL.elements.forEach(e=>{ if(!e.parentEl) return; let a=kidsMap.get(e.parentEl); if(!a) kidsMap.set(e.parentEl,a=[]); a.push(e); });
  const matchMemo=new Map();
  function nodeMatches(el){
    if(!searchQ) return true;
    if(matchMemo.has(el.id)) return matchMemo.get(el.id);
    matchMemo.set(el.id,false); // protège des cycles éventuels
    const r=(el.name||'').toLowerCase().includes(searchQ)||(kidsMap.get(el.id)||[]).some(c=>nodeMatches(c));
    matchMemo.set(el.id,r); return r;
  }
  const elKids=id=>(kidsMap.get(id)||[]).filter(e=>!searchQ||nodeMatches(e));

  /** Crée un bouton d'action compact (✎ ✕ +) sur une ligne de l'arborescence.
   */
  function mkAct(label,title,fn){
    const s=document.createElement('span');
    s.className='arbo-act'; s.textContent=label; s.title=title;
    s.onclick=ev=>{ev.stopPropagation();fn();};
    return s;
  }

  /** Attache le glisser-déposer à une ligne d'arborescence : déplacement simple ou de groupe si l'élément fait partie de la sélection multiple.
   */
  function applyDnD(row, el) {
    row.draggable=true;
    row.ondragstart=ev=>{
      ev.stopPropagation();
      // Si l'élément saisi fait partie d'une sélection multiple → déplacement de groupe
      if (arboMultiSel.has(el.id) && arboMultiSel.size>1){
        ev.dataTransfer.setData('text/plain', JSON.stringify({_arboMulti:[...arboMultiSel]}));
        body.querySelectorAll('.arbo-msel').forEach(r=>r.style.opacity='.45');
      } else {
        ev.dataTransfer.setData('text/plain', el.id);
        row.style.opacity='.45';
      }
    };
    row.ondragend=()=>{ body.querySelectorAll('.arbo-row').forEach(r=>r.style.opacity=''); body.querySelectorAll('.arbo-drop-over').forEach(r=>r.classList.remove('arbo-drop-over')); };
    row.ondragover=ev=>{ev.preventDefault(); ev.stopPropagation(); row.classList.add('arbo-drop-over');};
    row.ondragleave=ev=>{if(!row.contains(ev.relatedTarget)) row.classList.remove('arbo-drop-over');};
    row.ondrop=ev=>{
      ev.preventDefault(); ev.stopPropagation(); row.classList.remove('arbo-drop-over');
      const payload=ev.dataTransfer.getData('text/plain');
      if(!payload) return;
      if(payload.startsWith('{')){
        try { const data=JSON.parse(payload); if(data._arboMulti){ arboMoveEls(data._arboMulti, el.id); return; } } catch(_){}
      }
      if (payload!==el.id) arboMoveEl(payload, el.id);
    };
  }

  /** Rend récursivement un nœud de l'arborescence et ses enfants (icône, nom, actions, sélection).
   */
  function renderNode(el, depth, container) {
    const kids=elKids(el.id);
    const key='el:'+el.id;
    const coll=searchQ?false:arboCollapsed.has(key); // recherche : branches correspondantes dépliées
    const isPkg=el.type==='Package';
    const row=document.createElement('div');
    row.className='arbo-row'+(S.ctx===el.id?' arbo-sel':'')+(arboMultiSel.has(el.id)?' arbo-msel':'');
    row.style.paddingLeft=(depth*14+2)+'px';
    _arboVisibleOrder.push(el.id);
    if (!RM_RO) {   // lecture seule : ni glisser-déposer ni menu contextuel d'édition
      applyDnD(row, el);
      row.oncontextmenu=ev=>{ ev.preventDefault(); ev.stopPropagation(); arboShowCtxMenu(ev, el); };
    }

    const tog=document.createElement('span'); tog.className='arbo-tog';
    tog.textContent=kids.length?(coll?'▶':'▾'):'';
    if(kids.length) tog.onclick=ev=>{ev.stopPropagation(); arboCollapsed.has(key)?arboCollapsed.delete(key):arboCollapsed.add(key); buildArbo();};
    row.appendChild(tog);

    const icon=document.createElement('span'); icon.className='arbo-icon';
    icon.textContent=typeIcon(el.type);
    icon.style.color=(TCFG[el.type]||{}).color||'var(--c-dim)';
    row.appendChild(icon);

    const nm=document.createElement('span'); nm.className='arbo-name'+(isPkg?' pkg-name':'');
    if(searchQ && (el.name||'').toLowerCase().includes(searchQ)){
      nm.innerHTML=''; // highlight match
      const lower=(el.name||'').toLowerCase();
      let i=0, result='';
      while(i<(el.name||'').length){
        const idx=lower.indexOf(searchQ,i);
        if(idx<0){result+=capEsc((el.name||'').slice(i));break;}
        result+=capEsc((el.name||'').slice(i,idx))+'<mark style="background:#fbbf24;color:#000;border-radius:2px;">'+capEsc((el.name||'').slice(idx,idx+searchQ.length))+'</mark>';
        i=idx+searchQ.length;
      }
      nm.innerHTML=result;
    } else { nm.textContent=el.name; }
    if (!RM_RO) nm.ondblclick=ev=>{ev.stopPropagation(); _arboInlineRename(nm, v=>arboRenameEl(el,v));};
    row.appendChild(nm);

    const acts=document.createElement('span'); acts.className='arbo-acts';
    if (RM_RO) { /* lecture seule : pas d'action d'édition */ }
    else if (isPkg) {
      acts.appendChild(mkAct('✎',_L('Renommer'), ()=>_arboInlineRename(nm, v=>arboRenameEl(el,v))));
      acts.appendChild(mkAct('📂+',_L('Ajouter un sous-package'), ()=>arboAddPkg(el.id)));
      acts.appendChild(mkAct('+el',_L('Ajouter un élément'),      ()=>arboAddEl(el.id, null)));
      acts.appendChild(mkAct('✕',_L('Supprimer ce package'),      ()=>arboDeleteEl(el.id)));
    } else {
      acts.appendChild(mkAct('✎',_L('Renommer'), ()=>_arboInlineRename(nm, v=>arboRenameEl(el,v))));
      acts.appendChild(mkAct('+',_L('Ajouter un sous-élément'), ()=>arboAddEl(null, el.id)));
      acts.appendChild(mkAct('✕',_L('Supprimer'),              ()=>arboDeleteEl(el.id)));
    }
    row.appendChild(acts);

    row.onclick=ev=>{
      if(ev.target===acts||acts.contains(ev.target)) return;
      // ── Ctrl/Cmd+clic : bascule l'élément dans la sélection multiple ──
      if(ev.ctrlKey||ev.metaKey){
        ev.preventDefault();
        if(arboMultiSel.has(el.id)) arboMultiSel.delete(el.id);
        else { arboMultiSel.add(el.id); S.propEl=el.id; buildPropertiesPanel(); if(!isPkg&&!el._capChain) setCtx(el.id); }
        _arboLastClickId=el.id;
        buildArbo();
        return;
      }
      // ── Shift+clic : sélection par plage dans l'ordre visuel, depuis la dernière ancre ──
      if(ev.shiftKey && _arboLastClickId){
        ev.preventDefault();
        const i1=_arboVisibleOrder.indexOf(_arboLastClickId), i2=_arboVisibleOrder.indexOf(el.id);
        if(i1>=0&&i2>=0){
          arboMultiSel.clear();
          const [a,b]=i1<i2?[i1,i2]:[i2,i1];
          for(let i=a;i<=b;i++) arboMultiSel.add(_arboVisibleOrder[i]);
          S.propEl=el.id; buildPropertiesPanel();
          if(!isPkg&&!el._capChain) setCtx(el.id); // le graphe affiche le DERNIER élément cliqué de la plage
          buildArbo();
          return;
        }
      }
      // ── Clic normal : sélection simple (remplace la sélection multiple) ──
      arboMultiSel.clear(); arboMultiSel.add(el.id);
      _arboLastClickId=el.id;
      arboUpdateMselBar();
      S.propEl=el.id; buildPropertiesPanel();
      if(isPkg){ arboCollapsed.has(key)?arboCollapsed.delete(key):arboCollapsed.add(key); buildArbo(); }
      else if(el._capChain && window._capChainClickHandler){ window._capChainClickHandler(el.id); }
      else { setCtx(el.id); buildArbo(); }
    };
    container.appendChild(row);

    // Rendu paresseux : les branches repliées ne sont pas construites (gros modèles)
    if(kids.length&&!coll){
      const ch=document.createElement('div');
      ch.className='arbo-children';
      kids.forEach(c=>renderNode(c,depth+1,ch));
      container.appendChild(ch);
    }
  }

  MODEL.elements.filter(e=>!e.parentEl).forEach(e=>renderNode(e,0,body));

  if (!RM_RO) {
    const addRoot=document.createElement('div');
    addRoot.className='add-btn'; addRoot.textContent=_L('📂 Nouveau package racine');
    addRoot.onclick=()=>arboAddPkg(null);
    body.appendChild(addRoot);
  }
  buildPropertiesPanel();
}

/** Développe tous les nœuds de l'arborescence gauche. */
function arboExpandAll() { arboCollapsed.clear(); buildArbo(); }

/** Réduit tous les nœuds de l'arborescence gauche au premier niveau. */
function arboCollapseAll() {
  MODEL.elements.forEach(e=>{ if(MODEL.elements.some(c=>c.parentEl===e.id)) arboCollapsed.add('el:'+e.id); });
  buildArbo();
}

/** Renomme un élément dans MODEL et met à jour l'arbo et le graphe. */
function arboRenameEl(el, newName) {
  if (el.type==='Package') {
    MODEL.elements.forEach(e=>{ if(e.pkg===el.name) e.pkg=newName; });
    if(S.pkgF[el.name]!==undefined){ S.pkgF[newName]=S.pkgF[el.name]; delete S.pkgF[el.name]; }
  }
  el.name=newName;
  buildArbo(); // chains to buildPropertiesPanel()
  render();
}

/** Crée un nouveau package (type='Package') enfant d'un élément existant. */
function arboAddPkg(parentElId) {
  let name=_L('Nouveau package'), i=1;
  while(MODEL.elements.some(e=>e.type==='Package'&&e.name===name)) name=_L('Nouveau package ')+i++;
  const id='pkg-'+Date.now();
  const parentEl=parentElId?MODEL.elements.find(e=>e.id===parentElId):null;
  const el={id, name, type:'Package', pkg:parentEl?parentEl.name:name};
  if(parentElId) el.parentEl=parentElId;
  MODEL.elements.unshift(el);
  S.pkgF[name]=true;
  if(parentElId) arboCollapsed.delete('el:'+parentElId);
  buildArbo(); buildPanel();
}

/** Crée un nouvel élément enfant dans l'arborescence. */
function arboAddEl(pkgElId, parentElId) {
  const id='el'+Date.now();
  const type=Object.keys(TCFG).find(t=>t!=='Package')||'Block';
  const parentEl=parentElId?MODEL.elements.find(e=>e.id===parentElId):null;
  const pkgEl=pkgElId?MODEL.elements.find(e=>e.id===pkgElId):null;
  const pkg=(pkgEl?.name||parentEl?.pkg||'');
  const el={id, name:_L('Nouvel élément'), type, pkg};
  const actualParent=parentElId||pkgElId;
  if(actualParent) { el.parentEl=actualParent; arboCollapsed.delete('el:'+actualParent); }
  MODEL.elements.push(el);
  if(parentElId) MODEL.relations.push({id:'rel'+Date.now(),src:parentElId,tgt:id,type:'Containment',name:'contains'});
  onModelChanged();
}

/** Supprime un élément et toutes ses relations de MODEL, puis met à jour l'UI. */
function arboDeleteEl(elId) {
  const el=MODEL.elements.find(e=>e.id===elId); if(!el) return;
  const kids=MODEL.elements.filter(e=>e.parentEl===elId);
  if(kids.length){ if(!confirm(_L(`"${el.name}" contient ${kids.length} enfant(s). Supprimer ?`))) return; }
  /** Supprime récursivement un élément et toute sa descendance du modèle.
   */
  function delRec(id) {
    MODEL.elements.filter(e=>e.parentEl===id).forEach(c=>delRec(c.id));
    const removed=MODEL.elements.find(e=>e.id===id);
    MODEL.elements=MODEL.elements.filter(e=>e.id!==id);
    MODEL.relations=MODEL.relations.filter(r=>r.src!==id&&r.tgt!==id);
    if(removed&&removed.type==='Package'){ delete S.pkgF[removed.name]; }
  }
  delRec(elId); onModelChanged();
}

/** Déplace un élément (srcId) sous un nouveau parent (tgtId) par drag-and-drop. */
/** Vide la sélection multiple de l'arborescence et met à jour l'affichage. */
function arboClearMultiSel(){ arboMultiSel.clear(); _arboLastClickId=null; buildArbo(); }

/** Met à jour la barre de compteur de sélection multiple sous l'en-tête Arborescence. */
function arboUpdateMselBar(){
  const bar=document.getElementById('arbo-msel-bar'); if(!bar) return;
  const cnt=document.getElementById('arbo-msel-count');
  if(arboMultiSel.size>1){
    bar.style.display='flex';
    if(cnt) cnt.textContent=RM_RO ? _L(`${arboMultiSel.size} éléments sélectionnés`) : _L(`${arboMultiSel.size} éléments sélectionnés — glisser pour déplacer le groupe`);
  } else bar.style.display='none';
}

/** Déplace un GROUPE d'éléments vers un nouvel owner en conservant la hiérarchie interne :
 * seules les "racines" de la sélection (celles dont aucun ancêtre n'est lui-même sélectionné)
 * sont re-parentées — leurs descendants sélectionnés suivent naturellement leur sous-arbre. */
function arboMoveEls(srcIds, tgtId){
  const set=new Set(srcIds.filter(id=>id!==tgtId));
  if(!set.size) return;
  const byId=id=>MODEL.elements.find(e=>e.id===id);
  const tgt=byId(tgtId); if(!tgt) return;
  const isDescendantOfSel=el=>{ let cur=byId(el.parentEl); let d=0; while(cur&&d<50){ if(set.has(cur.id)) return true; cur=byId(cur.parentEl); d++; } return false; };
  const roots=[...set].map(byId).filter(Boolean).filter(el=>!isDescendantOfSel(el));
  // La cible ne doit être ni dans la sélection ni descendante d'une racine déplacée (cycle)
  for(const r of roots){ let cur=tgt; let d=0; while(cur&&d<50){ if(cur.id===r.id){ alert(_L('Déplacement impossible : la cible est à l\'intérieur de la sélection.')); return; } cur=byId(cur.parentEl); d++; } }
  /** Remonte la hiérarchie pour retrouver le nom du package conteneur d'un élément.
   */
  function findPkg(id){ const e=byId(id); if(!e) return ''; if(e.type==='Package') return e.name; return e.pkg||findPkg(e.parentEl); }
  const newPkg=findPkg(tgtId)||tgt.pkg;
  let t=Date.now();
  roots.forEach(src=>{
    MODEL.relations=MODEL.relations.filter(r=>!(r.tgt===src.id&&r.type==='Containment'));
    src.parentEl=tgtId;
    src.pkg=newPkg;
    if(tgt.type!=='Package')
      MODEL.relations.push({id:'rel'+(t++),src:tgtId,tgt:src.id,type:'Containment',name:'contains'});
  });
  arboCollapsed.delete('el:'+tgtId);
  buildArbo();
}

/** Découpe un texte de presse-papier en liste de noms : une ligne = un élément.
 * Gère les listes issues d'un fichier texte (\n) comme d'un tableau Excel (\r\n, cellules \t :
 * on prend la première cellule non vide de chaque ligne). Les lignes vides sont ignorées. */
function arboParseClipboardList(text){
  return String(text||'').split(/\r?\n/).map(line=>{
    if(line.includes('\t')){ const cells=line.split('\t').map(c=>c.trim()).filter(Boolean); return cells[0]||''; }
    return line.trim();
  }).filter(Boolean);
}

/** Crée une liste d'éléments enfants sous un owner (un nom par ligne du presse-papier). */
function arboPasteListInto(parentId, names){
  const parent=MODEL.elements.find(e=>e.id===parentId);
  if(!parent||!names.length) return;
  const type=Object.keys(TCFG).find(t=>t!=='Package')||'Block';
  const pkg=parent.type==='Package'?parent.name:(parent.pkg||'');
  let t=Date.now();
  names.forEach(nm=>{
    const id='el'+(t++);
    const el={id, name:nm, type, pkg, parentEl:parentId};
    MODEL.elements.push(el);
    if(parent.type!=='Package')
      MODEL.relations.push({id:'rel'+(t++), src:parentId, tgt:id, type:'Containment', name:'contains'});
  });
  arboCollapsed.delete('el:'+parentId);
  onModelChanged();
}

/** Menu contextuel de l'arborescence (clic droit sur une ligne) : Coller la liste du
 * presse-papier sous cet élément. La ligne cliquée devient la sélection unique. */
/** Change le type de tous les éléments d'un ensemble d'ids (hors packages). */
function arboConvertSelectedType(ids, newType){
  let changed=0;
  ids.forEach(id=>{
    const el=MODEL.elements.find(e=>e.id===id);
    if(el && el.type!=='Package'){ el.type=newType; changed++; }
  });
  if(changed){
    if(!TCFG[newType]){
      TCFG[newType]={color:(typeof nextColor==='function'?nextColor():'#8b949e'), abbr:newType.slice(0,3).toUpperCase()};
    }
    if(!(newType in S.typF)) S.typF[newType]=true;
    onModelChanged();
  }
}

/** Affiche le menu contextuel (clic droit) d'un élément de l'arborescence.
 * @param {MouseEvent} ev - Événement du clic droit (position du menu)
 * @param {object} el - Élément du modèle visé
 */
function arboShowCtxMenu(ev, el){
  // Préserve une sélection multiple existante si l'élément cliqué en fait partie ;
  // sinon la ligne cliquée devient la sélection unique.
  if(!arboMultiSel.has(el.id)){
    arboMultiSel.clear(); arboMultiSel.add(el.id); _arboLastClickId=el.id;
    buildArbo();
  }
  const selIds=[...arboMultiSel];
  const menu=document.getElementById('arbo-ctx-menu'); if(!menu) return;
  menu.innerHTML='';

  // ── Coller la liste (uniquement si sélection unique) ──
  if(selIds.length===1){
    const pasteItem=document.createElement('div'); pasteItem.className='acm-item';
    pasteItem.textContent=_L('📋 Coller la liste ici (1 ligne = 1 élément)');
    pasteItem.onclick=()=>{
      menu.style.display='none';
      if(!navigator.clipboard||!navigator.clipboard.readText){
        alert(_L("Lecture du presse-papier non disponible dans ce navigateur — utilisez Ctrl+V sur l'élément sélectionné."));
        return;
      }
      navigator.clipboard.readText().then(text=>{
        const names=arboParseClipboardList(text);
        if(!names.length){ alert(_L('Le presse-papier ne contient aucune ligne de texte exploitable.')); return; }
        arboPasteListInto(selIds[0], names);
      }).catch(()=>{
        alert(_L("Accès au presse-papier refusé — utilisez Ctrl+V sur l'élément sélectionné."));
      });
    };
    menu.appendChild(pasteItem);
  }

  // ── Convert to... (sous-menu avec la liste des types + recherche) ──
  const convertibleIds=selIds.filter(id=>{ const e=MODEL.elements.find(x=>x.id===id); return e && e.type!=='Package'; });
  if(convertibleIds.length){
    const convItem=document.createElement('div'); convItem.className='acm-item'; convItem.style.position='relative';
    convItem.innerHTML=_L(`<span style="display:flex;align-items:center;justify-content:space-between;gap:10px;"><span>🔄 Convert to…${convertibleIds.length>1?_L(` <span style="color:var(--c-dim);font-size:10px">(${convertibleIds.length} élts)</span>`):''}</span><span style="color:var(--c-dim);">▶</span></span>`);

    const sub=document.createElement('div');
    sub.style.cssText='position:absolute;top:-5px;left:100%;margin-left:2px;background:var(--c-bg3);border:1px solid var(--c-border);border-radius:7px;box-shadow:0 6px 18px rgba(0,0,0,.35);min-width:230px;max-height:340px;display:none;flex-direction:column;overflow:hidden;z-index:501;';
    const searchWrap=document.createElement('div'); searchWrap.style.cssText='padding:6px;border-bottom:1px solid var(--c-border);';
    const search=document.createElement('input'); search.className='inp';
    search.placeholder=_L('🔍 Filtrer les types…'); search.style.cssText='width:100%;font-size:11px;padding:4px 8px;box-sizing:border-box;';
    search.onclick=e=>e.stopPropagation();
    searchWrap.appendChild(search); sub.appendChild(searchWrap);
    const list=document.createElement('div'); list.style.cssText='overflow-y:auto;flex:1;padding:4px 0;'; sub.appendChild(list);

    const allTypes=[...new Set([...Object.keys(TCFG), ...MODEL.elements.map(e=>e.type)])]
      .filter(t=>t!=='Package').sort((a,b)=>a.localeCompare(b));
    const curTypes=new Set(convertibleIds.map(id=>{ const e=MODEL.elements.find(x=>x.id===id); return e?e.type:null; }));

    /** Rend la liste filtrée des types dans le sous-menu « Convert to… ».
     */
    function renderList(q){
      list.innerHTML='';
      const ql=(q||'').trim().toLowerCase();
      const filtered=allTypes.filter(t=>!ql||t.toLowerCase().includes(ql));
      if(!filtered.length){ const none=document.createElement('div'); none.className='acm-dim'; none.textContent=_L('Aucun type ne correspond.'); list.appendChild(none); return; }
      filtered.forEach(t=>{
        const it=document.createElement('div'); it.className='acm-item';
        it.style.cssText='display:flex;align-items:center;gap:7px;';
        const isCur=curTypes.has(t)&&curTypes.size===1;
        it.innerHTML=`<span style="color:${(TCFG[t]||{}).color||'var(--c-dim)'};font-size:12px;">${typeIcon(t)}</span><span style="flex:1">${capEsc(t)}</span>${isCur?'<span style="color:var(--c-accent);font-size:11px;">✓</span>':''}`;
        it.onclick=e=>{
          e.stopPropagation();
          menu.style.display='none';
          arboConvertSelectedType(convertibleIds, t);
        };
        list.appendChild(it);
      });
    }
    renderList('');
    search.oninput=()=>renderList(search.value);

    convItem.appendChild(sub);
    const openSub=()=>{ sub.style.display='flex'; setTimeout(()=>search.focus(),10);
      const r=sub.getBoundingClientRect();
      if(r.right>window.innerWidth-8){ sub.style.left='auto'; sub.style.right='100%'; sub.style.marginLeft='0'; sub.style.marginRight='2px'; }
    };
    const closeSub=()=>{ sub.style.display='none'; };
    convItem.onmouseenter=openSub;
    convItem.onmouseleave=e=>{ if(!sub.contains(e.relatedTarget)) closeSub(); };
    sub.onmouseleave=e=>{ if(e.relatedTarget!==convItem && !convItem.contains(e.relatedTarget)) closeSub(); };
    convItem.onclick=e=>{ e.stopPropagation(); (sub.style.display==='flex')?closeSub():openSub(); };
    menu.appendChild(convItem);
  }

  if(selIds.length===1){
    const hint=document.createElement('div'); hint.className='acm-dim';
    hint.textContent=_L("Astuce : Ctrl+V fonctionne aussi sur l'élément sélectionné.");
    menu.appendChild(hint);
  }

  menu.style.display='block';
  const mw=240, mh=menu.offsetHeight||90;
  menu.style.left=Math.min(ev.clientX, window.innerWidth-mw-8)+'px';
  menu.style.top =Math.min(ev.clientY, window.innerHeight-mh-8)+'px';
  setTimeout(()=>{
    const close=e2=>{ if(!menu.contains(e2.target)){ menu.style.display='none'; document.removeEventListener('click',close); } };
    document.addEventListener('click',close);
  },0);
}

// ── Ctrl+V global : colle la liste du presse-papier sous l'unique élément sélectionné ──
document.addEventListener('paste', ev=>{
  if (RM_RO) return;   // arborescence en lecture seule
  const t=ev.target;
  if (t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) return; // saisie en cours ailleurs
  if (arboMultiSel.size!==1) return; // exige UN et UN SEUL élément sélectionné
  const sec=document.getElementById('sec-arbo');
  if (!sec || sec.offsetParent===null) return; // arborescence non visible (ex : mode Capella Data)
  const text=ev.clipboardData ? ev.clipboardData.getData('text/plain') : '';
  const names=arboParseClipboardList(text);
  if (!names.length) return;
  ev.preventDefault();
  arboPasteListInto([...arboMultiSel][0], names);
});

/** Déplace un élément unique vers un nouvel owner par glisser-déposer : met à jour
 * parentEl, le package hérité et la relation Containment. Empêche les cycles.
 * @param {string} srcId - Élément déplacé
 * @param {string} tgtId - Nouvel élément parent
 */
function arboMoveEl(srcId, tgtId) {
  const src=MODEL.elements.find(e=>e.id===srcId);
  const tgt=MODEL.elements.find(e=>e.id===tgtId);
  if(!src||!tgt) return;
  // Empêche de déplacer un élément dans un de ses propres descendants
  let cur=tgt;
  while(cur){ if(cur.id===srcId) return; cur=MODEL.elements.find(e=>e.id===cur.parentEl); }
  MODEL.relations=MODEL.relations.filter(r=>!(r.tgt===srcId&&r.type==='Containment'));
  src.parentEl=tgtId;
  /** Remonte la hiérarchie pour retrouver le nom du package conteneur d'un élément.
   */
  function findPkg(id){ const e=MODEL.elements.find(x=>x.id===id); if(!e) return ''; if(e.type==='Package') return e.name; return e.pkg||findPkg(e.parentEl); }
  src.pkg=findPkg(tgtId)||tgt.pkg;
  if(tgt.type!=='Package')
    MODEL.relations.push({id:'rel'+Date.now(),src:tgtId,tgt:srcId,type:'Containment',name:'contains'});
  arboCollapsed.delete('el:'+tgtId);
  buildArbo();
}

/* ── Modification d'un élément du modèle de la Relation Map (reprise de l'ancienne 📊 Table View) ── */
/** Écrit une valeur dans un champ d'un élément du modèle de la Relation Map (nom, type, parent,
 * attribut). Les champs dérivés (ID, Human Type, Owned element) sont en lecture seule et ignorés.
 * @param {object} el - Élément à modifier
 * @param {string} col - Clé de la colonne
 * @param {string} val - Nouvelle valeur saisie
 */
function rmSetElemVal(el, col, val) {
  if (col==='Name') { el.name=val; return; }
  if (col==='Type') { el.type=val; return; }
  if (col==='ID')   return;
  if (col==='Human Type')     return; // lecture seule — dérivé du Type
  if (col==='Owned element')  return; // lecture seule — dérivé des relations Containment
  if (col==='Parent') {
    if (val==='racine') {
      // Détacher complètement (package racine ou élément sans parent)
      MODEL.relations=MODEL.relations.filter(r=>!(r.tgt===el.id&&r.type==='Containment'));
      delete el.parentEl; el.pkg='';
      return;
    }
    // val = 'el:<id>'
    MODEL.relations=MODEL.relations.filter(r=>!(r.tgt===el.id&&r.type==='Containment'));
    delete el.parentEl;
    const [kind,ref]=val.split(':');
    if (kind==='el') {
      const pe=MODEL.elements.find(e=>e.id===ref);
      if (pe) {
        el.parentEl=pe.id;
        /** Remonte la hiérarchie pour retrouver le nom du package conteneur d'un élément.
         */
        function findPkg(id){ const x=MODEL.elements.find(e=>e.id===id); if(!x) return ''; if(x.type==='Package') return x.name; return x.pkg||findPkg(x.parentEl); }
        el.pkg=findPkg(pe.id)||pe.pkg;
        if(pe.type!=='Package')
          MODEL.relations.push({id:'rel'+Date.now(),src:pe.id,tgt:el.id,type:'Containment',name:'contains'});
      }
    }
    return;
  }
  if (!el.attributes) el.attributes={};
  el.attributes[col]=val;
}

/** Callback appelé après toute modification du modèle : rebuildTree, buildArbo, buildPanel. */
function onModelChanged() {
  buildPanel(); setupMarkers();
  rebuildTree(); updateModalCounts(); renderModalTab(editTab); setTimeout(()=>fitView(true),80);
}
