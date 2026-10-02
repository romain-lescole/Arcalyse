/* ═══════════════════════════════════════════════════════════════════════
   17. ÉDITEUR DE MODÈLE (modale)
   ═══════════════════════════════════════════════════════════════════════ */
let editTab='el';
let modalElFilters  = {};   // {nom, type, pkg}
let modalRelFilters = {};   // {src, type, tgt, nom}

/** Ouvre la fenêtre modale d'édition du modèle (éléments, relations, chaînes, types).
 */
function openModal() {
  document.getElementById('modal-ov').classList.add('open');
  renderModalTab(editTab);
}
document.getElementById('modal-close').onclick=()=>document.getElementById('modal-ov').classList.remove('open');
document.getElementById('modal-ov').onclick=ev=>{ if(ev.target===document.getElementById('modal-ov')) document.getElementById('modal-ov').classList.remove('open'); };
document.querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick=()=>{ document.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); editTab=btn.dataset.t; renderModalTab(editTab); };
});

/** Met à jour les compteurs affichés sur les onglets de la fenêtre modale d'édition.
 */
function updateModalCounts() {
  document.getElementById('el-count').textContent =MODEL.elements.length;
  document.getElementById('rel-count').textContent=MODEL.relations.length;
  document.getElementById('pkg-count').textContent=MODEL.elements.filter(e=>e.type==='Package').length;
}
/** Affiche le contenu de l'onglet demandé dans la fenêtre modale d'édition.
 */
function renderModalTab(tab) {
  updateModalCounts();
  const body=document.getElementById('modal-body'); body.innerHTML='';
  if (tab==='el')     renderElementsTab(body);
  if (tab==='rel')    renderRelationsTab(body);
  if (tab==='pkg')    renderPackagesTab(body);
  if (tab==='chains') renderChainsTab(body);
}

/** Rend l'onglet « Chaînes » de la modale : liste des chaînes de relations définies.
 */
function renderChainsTab(body){
  if(!capChainsForModal||!capChainsForModal.length){body.innerHTML='<div style="color:var(--c-dim);padding:20px;font-style:italic">Aucune chaîne — chargez un fichier .capella</div>';return;}
  const CAP_CHAIN_COLORS_LOCAL={FunctionalChain:'#22c55e',OperationalProcess:'#3b82f6',PhysicalPath:'#f97316'};
  const CAP_CHAIN_LABELS_LOCAL={FunctionalChain:'Chaîne fonctionnelle',OperationalProcess:'Processus opérationnel',PhysicalPath:'Chemin physique'};
  for(const chain of capChainsForModal){
    const color=CAP_CHAIN_COLORS_LOCAL[chain.type]||'#a78bfa';
    const card=document.createElement('div');
    card.style.cssText='background:var(--c-bg3);border:1px solid var(--c-border);border-radius:7px;margin-bottom:10px;overflow:hidden;';
    const hdr=document.createElement('div');
    hdr.style.cssText='padding:8px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;';
    hdr.innerHTML=`<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;color:${color};background:${color}22;">${CAP_CHAIN_LABELS_LOCAL[chain.type]||chain.type}</span><span style="font-size:12px;font-weight:600;">${capEsc(chain.name)}</span><span style="margin-left:auto;font-size:10px;color:var(--c-dim);font-family:monospace;">${chain.steps.filter(s=>s.type!=='link').length} étapes</span><span style="font-size:9px;color:var(--c-dim);">▶</span>`;
    const bdy=document.createElement('div'); bdy.style.cssText='display:none;padding:10px 12px;border-top:1px solid var(--c-border);';
    let stepNum=0;
    chain.steps.forEach(step=>{
      if(step.type==='link'){const conn=document.createElement('div');conn.style.cssText='padding:2px 0 2px 20px;font-size:10px;color:var(--c-dim);font-family:monospace;';conn.textContent='⟶ '+step.name;bdy.appendChild(conn);}
      else{
        stepNum++;
        const row=document.createElement('div');row.style.cssText='display:flex;align-items:flex-start;gap:8px;padding:4px 0;';
        row.innerHTML=`<span style="width:18px;height:18px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${stepNum}</span><div><span style="font-size:10px;font-family:monospace;padding:1px 5px;border-radius:3px;color:${color};background:${color}22;">${capEsc(step.elemType||'')}</span><div style="font-size:12px;">${capEsc(step.name)}</div></div>`;
        bdy.appendChild(row);
      }
    });
    hdr.onclick=()=>{const isOpen=bdy.style.display==='block';bdy.style.display=isOpen?'none':'block';hdr.querySelector('span:last-child').style.transform=isOpen?'':'rotate(90deg)';};
    card.appendChild(hdr);card.appendChild(bdy);body.appendChild(card);
  }
}

// ── Éléments ──
/** Rend l'onglet « Éléments » de la modale d'édition : tableau filtrable de tous les
 * éléments du modèle, avec accès aux formulaires de création et de modification.
 * @param {HTMLElement} body - Conteneur de l'onglet
 */
function renderElementsTab(body) {
  const tbl=document.createElement('table'); tbl.className='edit-table';
  const thead=document.createElement('thead');

  // En-têtes
  const hrow=document.createElement('tr');
  ['Nom','Type','Paquetage','Actions'].forEach(h=>{
    const th=document.createElement('th'); th.textContent=h; hrow.appendChild(th);
  });
  thead.appendChild(hrow);

  // Ligne de filtre
  const frow=document.createElement('tr'); frow.className='modal-filter-row';
  [['nom'],['type'],['pkg'],null].forEach(pair=>{
    const th=document.createElement('th');
    if (pair) {
      const [key]=pair;
      const inp=document.createElement('input'); inp.className='modal-filter-inp';
      inp.placeholder='Filtrer…'; inp.value=modalElFilters[key]||'';
      inp.onclick=ev=>ev.stopPropagation();
      inp.oninput=()=>{ modalElFilters[key]=inp.value; applyElFilter(); };
      th.appendChild(inp);
    }
    frow.appendChild(th);
  });
  thead.appendChild(frow);
  tbl.appendChild(thead);

  // Corps
  const tbody=document.createElement('tbody');
  MODEL.elements.forEach((el,i)=>{
    const cfg=TCFG[el.type]||{color:'#7f849c'};
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${el.name}</td>
      <td><span class="type-badge" style="background:${cfg.color}">${el.type}</span></td>
      <td>${el.pkg||''}</td>
      <td><div class="eact">
        <button class="ebtn edit-el" data-i="${i}">✏</button>
        <button class="ebtn del del-el" data-i="${i}">✕</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); body.appendChild(tbl);

  // Filtre sur les lignes visibles (sans reconstruire le tableau)
  /** Applique le filtre texte saisi sur les lignes du tableau des éléments,
   * en masquant celles dont ni le nom ni le type ne correspondent.
   */
  function applyElFilter() {
    tbody.querySelectorAll('tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if (!cells.length) return;
      const nom=(cells[0]?.textContent||'').toLowerCase();
      const type=(cells[1]?.textContent||'').toLowerCase();
      const pkg=(cells[2]?.textContent||'').toLowerCase();
      tr.style.display=
        (!modalElFilters.nom  || nom.includes(modalElFilters.nom.toLowerCase())) &&
        (!modalElFilters.type || type.includes(modalElFilters.type.toLowerCase())) &&
        (!modalElFilters.pkg  || pkg.includes(modalElFilters.pkg.toLowerCase()))
        ? '' : 'none';
    });
  }
  applyElFilter();

  // Ajuster top de la ligne filtre après rendu (sticky sous l'en-tête)
  requestAnimationFrame(()=>{
    const hh=hrow.getBoundingClientRect().height||24;
    frow.querySelectorAll('th').forEach(th=>th.style.top=hh+'px');
  });

  const addBtn=document.createElement('div'); addBtn.className='add-btn';
  addBtn.textContent='+ Ajouter un élément';
  addBtn.onclick=()=>showElementForm(body,null,-1);
  body.appendChild(addBtn);
  const fz=document.createElement('div'); fz.id='edit-form'; body.appendChild(fz);
  body.querySelectorAll('.edit-el').forEach(b=>b.onclick=()=>showElementForm(body,MODEL.elements[+b.dataset.i],+b.dataset.i));
  body.querySelectorAll('.del-el').forEach(b=>b.onclick=()=>deleteElement(+b.dataset.i));
}
/** Affiche le formulaire de création/édition d'un élément dans la modale.
 */
function showElementForm(body,el,idx){
  const form=body.querySelector('#edit-form'); form.style.display='block';
  const isNew=el===null;
  const allTypes=[...new Set([...Object.keys(TCFG),...MODEL.elements.map(e=>e.type)])];
  const typeOpts=allTypes.map(t=>`<option value="${t}"${el?.type===t?' selected':''}>${t}</option>`).join('');
  const pkgOpts=MODEL.elements.filter(e=>e.type==='Package').map(p=>`<option value="${p.name}"${el?.pkg===p.name?' selected':''}>${p.name}</option>`).join('');
  form.innerHTML=`<h4>${isNew?'Nouvel élément':'Modifier'}</h4>
    <div class="frow"><label>Nom</label><input id="f-el-name" value="${el?.name.replace(/"/g,'&quot;')||''}"></div>
    <div class="frow"><label>Type</label>
      <select id="f-el-type">${typeOpts}<option value="__new__">+ Nouveau type…</option></select></div>
    <div class="frow" id="f-custom-row" style="display:none"><label>Nouveau type</label><input id="f-el-custom"></div>
    <div class="frow"><label>Paquetage</label><select id="f-el-pkg">${pkgOpts}</select></div>
    <div class="fbtns"><button class="fbtn-cancel" id="f-el-cancel">Annuler</button>
                       <button class="fbtn-save"   id="f-el-save">${isNew?'Créer':'Sauvegarder'}</button></div>`;
  form.querySelector('#f-el-type').onchange=function(){ form.querySelector('#f-custom-row').style.display=this.value==='__new__'?'':'none'; };
  form.querySelector('#f-el-cancel').onclick=()=>{ form.style.display='none'; };
  form.querySelector('#f-el-save').onclick=()=>{
    let type=form.querySelector('#f-el-type').value;
    if (type==='__new__') {
      type=form.querySelector('#f-el-custom').value.trim();
      if (!type){ alert('Saisir un type.'); return; }
      if (!TCFG[type]) TCFG[type]={color:`hsl(${Math.random()*360|0},55%,60%)`,abbr:type.slice(0,3).toUpperCase()};
    }
    const name=form.querySelector('#f-el-name').value.trim();
    const pkg =form.querySelector('#f-el-pkg').value;
    if (!name){ alert('Nom vide.'); return; }
    if (isNew) MODEL.elements.push({id:'el_'+Date.now(),name,type,pkg});
    else MODEL.elements[idx]={...MODEL.elements[idx],name,type,pkg};
    onModelChanged();
  };
}
/** Supprime un élément depuis la modale d'édition, avec ses relations associées.
 */
function deleteElement(idx){
  const el=MODEL.elements[idx];
  const deps=MODEL.relations.filter(r=>r.src===el.id||r.tgt===el.id);
  if (!confirm(`Supprimer "${el.name}" ?${deps.length?` (${deps.length} relation(s) liée(s))`:''}`)) return;
  MODEL.relations=MODEL.relations.filter(r=>r.src!==el.id&&r.tgt!==el.id);
  MODEL.elements.splice(idx,1);
  if (S.ctx===el.id&&MODEL.elements.length>0) S.ctx=MODEL.elements[0].id;
  onModelChanged();
}

// ── Relations ──
/** Rend l'onglet « Relations » de la modale d'édition : tableau des relations du modèle
 * avec résolution des noms source/cible et accès aux formulaires d'édition.
 * @param {HTMLElement} body - Conteneur de l'onglet
 */
function renderRelationsTab(body) {
  const eMap=new Map(MODEL.elements.map(e=>[e.id,e]));
  const tbl=document.createElement('table'); tbl.className='edit-table';
  const thead=document.createElement('thead');

  // En-têtes
  const hrow=document.createElement('tr');
  ['Source','Type','Cible','Nom',''].forEach(h=>{
    const th=document.createElement('th'); th.textContent=h; hrow.appendChild(th);
  });
  thead.appendChild(hrow);

  // Ligne de filtre
  const frow=document.createElement('tr'); frow.className='modal-filter-row';
  [['src'],['type'],['tgt'],['nom'],null].forEach(pair=>{
    const th=document.createElement('th');
    if (pair) {
      const [key]=pair;
      const inp=document.createElement('input'); inp.className='modal-filter-inp';
      inp.placeholder='Filtrer…'; inp.value=modalRelFilters[key]||'';
      inp.onclick=ev=>ev.stopPropagation();
      inp.oninput=()=>{ modalRelFilters[key]=inp.value; applyRelFilter(); };
      th.appendChild(inp);
    }
    frow.appendChild(th);
  });
  thead.appendChild(frow);
  tbl.appendChild(thead);

  // Corps
  const tbody=document.createElement('tbody');
  MODEL.relations.forEach((r,i)=>{
    const cfg=RCFG[r.type]||{color:'#7f849c'};
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${eMap.get(r.src)?.name||r.src}</td>
      <td><span class="type-badge" style="background:${cfg.color}" title="${cfg.label?capEsc(r.type):''}">${capEsc(cfg.label||r.type)}</span></td>
      <td>${eMap.get(r.tgt)?.name||r.tgt}</td>
      <td style="color:var(--c-dim);font-size:11px">${r.name||''}</td>
      <td><div class="eact">
        <button class="ebtn edit-rel" data-i="${i}">✏</button>
        <button class="ebtn del del-rel" data-i="${i}">✕</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); body.appendChild(tbl);

  /** Applique le filtre texte sur la liste des relations affichée dans la modale.
   */
  function applyRelFilter() {
    tbody.querySelectorAll('tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if (!cells.length) return;
      const src =(cells[0]?.textContent||'').toLowerCase();
      const type=(cells[1]?.textContent||'').toLowerCase();
      const tgt =(cells[2]?.textContent||'').toLowerCase();
      const nom =(cells[3]?.textContent||'').toLowerCase();
      tr.style.display=
        (!modalRelFilters.src  || src.includes(modalRelFilters.src.toLowerCase())) &&
        (!modalRelFilters.type || type.includes(modalRelFilters.type.toLowerCase())) &&
        (!modalRelFilters.tgt  || tgt.includes(modalRelFilters.tgt.toLowerCase())) &&
        (!modalRelFilters.nom  || nom.includes(modalRelFilters.nom.toLowerCase()))
        ? '' : 'none';
    });
  }
  applyRelFilter();

  requestAnimationFrame(()=>{
    const hh=hrow.getBoundingClientRect().height||24;
    frow.querySelectorAll('th').forEach(th=>th.style.top=hh+'px');
  });

  const addBtn=document.createElement('div'); addBtn.className='add-btn';
  addBtn.textContent='+ Ajouter une relation'; addBtn.onclick=()=>showRelForm(body,null,-1);
  body.appendChild(addBtn);
  const fz=document.createElement('div'); fz.id='edit-form'; body.appendChild(fz);
  body.querySelectorAll('.edit-rel').forEach(b=>b.onclick=()=>showRelForm(body,MODEL.relations[+b.dataset.i],+b.dataset.i));
  body.querySelectorAll('.del-rel').forEach(b=>b.onclick=()=>{ if(confirm('Supprimer ?')){ MODEL.relations.splice(+b.dataset.i,1); onModelChanged(); } });
}
/** Affiche le formulaire de création/édition d'une relation dans la modale.
 */
function showRelForm(body,rel,idx){
  const form=body.querySelector('#edit-form'); form.style.display='block';
  const isNew=rel===null;
  const elO=MODEL.elements.map(e=>`<option value="${e.id}"${rel?.src===e.id?' selected':''}>${e.name}</option>`).join('');
  const elO2=MODEL.elements.map(e=>`<option value="${e.id}"${rel?.tgt===e.id?' selected':''}>${e.name}</option>`).join('');
  const rtO=Object.keys(RCFG).map(t=>`<option value="${t}"${rel?.type===t?' selected':''}>${t}</option>`).join('');
  form.innerHTML=`<h4>${isNew?'Nouvelle relation':'Modifier'}</h4>
    <div class="frow"><label>Source</label><select id="f-r-src">${elO}</select></div>
    <div class="frow"><label>Type</label><select id="f-r-type">${rtO}</select></div>
    <div class="frow"><label>Cible</label><select id="f-r-tgt">${elO2}</select></div>
    <div class="frow"><label>Nom</label><input id="f-r-name" value="${rel?.name||''}" placeholder="ex: contains"></div>
    <div class="fbtns"><button class="fbtn-cancel" id="f-r-cancel">Annuler</button>
                       <button class="fbtn-save" id="f-r-save">${isNew?'Créer':'Sauvegarder'}</button></div>`;
  form.querySelector('#f-r-cancel').onclick=()=>{ form.style.display='none'; };
  form.querySelector('#f-r-save').onclick=()=>{
    const src=form.querySelector('#f-r-src').value, tgt=form.querySelector('#f-r-tgt').value;
    const type=form.querySelector('#f-r-type').value, name=form.querySelector('#f-r-name').value.trim();
    if (src===tgt){ alert('Source = Cible impossible.'); return; }
    if (isNew) MODEL.relations.push({id:'r_'+Date.now(),src,tgt,type,name});
    else MODEL.relations[idx]={...MODEL.relations[idx],src,tgt,type,name};
    onModelChanged();
  };
}

// ── Paquetages ──
/** Rend l'onglet « Packages » de la modale d'édition : liste des éléments de type Package
 * avec renommage et suppression.
 * @param {HTMLElement} body - Conteneur de l'onglet
 */
function renderPackagesTab(body) {
  const pkgEls=MODEL.elements.filter(e=>e.type==='Package');
  pkgEls.forEach((pe,i)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--c-border)';
    row.innerHTML=`<span style="flex:1;font-size:13px">📂 ${pe.name}</span>
      <button class="ebtn del del-pkg" data-id="${pe.id}">✕</button>`;
    body.appendChild(row);
  });
  const addRow=document.createElement('div'); addRow.style.cssText='display:flex;gap:8px;margin-top:12px';
  addRow.innerHTML=`<input class="inp" id="new-pkg-inp" placeholder="Nouveau paquetage" style="flex:1">
    <button class="fbtn-save" id="new-pkg-btn">Ajouter</button>`;
  body.appendChild(addRow);
  body.querySelector('#new-pkg-btn').onclick=()=>{
    const v=body.querySelector('#new-pkg-inp').value.trim();
    if (!v||MODEL.elements.some(e=>e.type==='Package'&&e.name===v)) return;
    const id='pkg-'+Date.now();
    MODEL.elements.unshift({id, name:v, type:'Package', pkg:v});
    S.pkgF[v]=true; onModelChanged();
  };
  body.querySelectorAll('.del-pkg').forEach(b=>b.onclick=()=>{
    const pe=MODEL.elements.find(e=>e.id===b.dataset.id);
    if (!pe||!confirm(`Supprimer le paquetage "${pe.name}" ?`)) return;
    arboDeleteEl(pe.id);
  });
}

/**
 * Affiche un mini-formulaire inline dans la section "Critères de relation"
 * pour créer un nouveau type de relation avec nom, couleur, tirets et flèche.
 */
function showEditRelCriteriaForm(container, afterRow, typeName, cfg) {
  container.querySelectorAll('.inline-form').forEach(f=>f.remove());
  const endVal   = cfg.noArrow?'none':cfg.chevron?'chevron':cfg.open?'open':'filled';
  const startVal = cfg.diamond?'diamond':cfg.hollowDiamond?'hollowDiamond':cfg.circle?'circle':'none';
  const sel = (opts, cur) => opts.map(([v,l])=>`<option value="${v}"${cur===v?' selected':''}>${l}</option>`).join('');
  const f=document.createElement('div'); f.className='inline-form';
  f.style.cssText='background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px;padding:8px;margin-top:4px';
  f.innerHTML=`
    <div style="font-size:10px;font-weight:700;color:var(--c-dim);margin-bottom:6px;text-transform:uppercase">Modifier : ${typeName}</div>
    <div class="frow">
      <label>Couleur</label>
      <div style="display:flex;gap:6px;align-items:center;flex:1">
        <input id="erc-color" type="color" value="${cfg.color}" style="width:32px;height:22px;border:none;background:none;cursor:pointer;padding:0">
        <div id="erc-palette" style="display:flex;gap:3px;flex-wrap:wrap"></div>
      </div>
    </div>
    <div class="frow"><label>Tirets</label>
      <select id="erc-dash">${sel([
        ['','— Plein'],['6,3','– – Tirets'],['9,4','— — Longs'],
        ['3,3','··· Points'],['4,2','- - Fins'],['8,3','—— Espacés']
      ], cfg.dash)}</select>
    </div>
    <div class="frow"><label>Terminaison</label>
      <select id="erc-end">${sel([
        ['filled','▶  Flèche pleine'],['chevron','>  Flèche simple'],
        ['open','⊳  Triangle creux'],['none','—  Aucune']
      ], endVal)}</select>
    </div>
    <div class="frow"><label>Départ</label>
      <select id="erc-start">${sel([
        ['none','—  Aucun'],['diamond','◆  Losange plein'],
        ['hollowDiamond','◇  Losange creux'],['circle','⊕  Cercle ⊕']
      ], startVal)}</select>
    </div>
    <div class="fbtns"><button class="fbtn-cancel" id="erc-cancel">Annuler</button>
                       <button class="fbtn-save"   id="erc-save">Appliquer</button></div>`;
  afterRow.insertAdjacentElement('afterend', f);
  const pal=f.querySelector('#erc-palette');
  COLOR_PALETTE.slice(0,12).forEach(c=>{
    const b=document.createElement('div');
    b.style.cssText=`width:12px;height:12px;border-radius:2px;background:${c};cursor:pointer;border:1px solid rgba(255,255,255,.2)`;
    b.onclick=()=>{ f.querySelector('#erc-color').value=c; };
    pal.appendChild(b);
  });
  f.querySelector('#erc-cancel').onclick=()=>f.remove();
  f.querySelector('#erc-save').onclick=()=>{
    const endV  =f.querySelector('#erc-end').value;
    const startV=f.querySelector('#erc-start').value;
    cfg.color        =f.querySelector('#erc-color').value;
    cfg.dash         =f.querySelector('#erc-dash').value;
    cfg.open         =endV==='open';
    cfg.chevron      =endV==='chevron';
    cfg.noArrow      =endV==='none';
    cfg.diamond      =startV==='diamond';
    cfg.hollowDiamond=startV==='hollowDiamond';
    cfg.circle       =startV==='circle';
    f.remove(); setupMarkers(); buildPanel(); render();
  };
}

/** Affiche le formulaire de définition d'un nouveau critère de relation.
 */
function showNewRelCriteriaForm(container) {
  // Évite les doublons si déjà ouvert
  if (container.querySelector('.inline-form')) return;
  const color=nextColor();
  const f=document.createElement('div'); f.className='inline-form';
  f.style.cssText='background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px;padding:8px;margin-top:6px';
  f.innerHTML=`
    <div style="font-size:10px;font-weight:700;color:var(--c-dim);margin-bottom:6px;text-transform:uppercase">Nouveau critère</div>
    <div class="frow"><label>Nom</label><input id="nrc-name" placeholder="ex: Implémente"></div>
    <div class="frow">
      <label>Couleur</label>
      <div style="display:flex;gap:6px;align-items:center;flex:1">
        <input id="nrc-color" type="color" value="${color}" style="width:32px;height:22px;border:none;background:none;cursor:pointer;padding:0">
        <div id="nrc-palette" style="display:flex;gap:3px;flex-wrap:wrap"></div>
      </div>
    </div>
    <div class="frow"><label>Tirets</label>
      <select id="nrc-dash">
        <option value="">— Plein</option>
        <option value="6,3">– – Tirets</option>
        <option value="9,4">— — Longs</option>
        <option value="3,3">··· Points</option>
        <option value="4,2">- - Fins</option>
        <option value="8,3">—— Espacés</option>
      </select>
    </div>
    <div class="frow"><label>Terminaison</label>
      <select id="nrc-end">
        <option value="filled">▶  Flèche pleine</option>
        <option value="chevron">>  Flèche simple</option>
        <option value="open">⊳  Triangle creux</option>
        <option value="none">—  Aucune</option>
      </select>
    </div>
    <div class="frow"><label>Départ</label>
      <select id="nrc-start">
        <option value="none">—  Aucun</option>
        <option value="diamond">◆  Losange plein</option>
        <option value="hollowDiamond">◇  Losange creux</option>
        <option value="circle">⊕  Cercle ⊕</option>
      </select>
    </div>
    <div class="fbtns"><button class="fbtn-cancel" id="nrc-cancel">Annuler</button>
                       <button class="fbtn-save" id="nrc-save">Créer</button></div>`;
  container.appendChild(f);
  // Palette de couleurs rapides
  const pal=f.querySelector('#nrc-palette');
  COLOR_PALETTE.slice(0,12).forEach(c=>{
    const b=document.createElement('div');
    b.style.cssText=`width:12px;height:12px;border-radius:2px;background:${c};cursor:pointer;border:1px solid rgba(255,255,255,.2)`;
    b.onclick=()=>{ f.querySelector('#nrc-color').value=c; };
    pal.appendChild(b);
  });
  f.querySelector('#nrc-cancel').onclick=()=>f.remove();
  f.querySelector('#nrc-save').onclick=()=>{
    const name=f.querySelector('#nrc-name').value.trim();
    if (!name){ alert('Nom requis.'); return; }
    if (RCFG[name]){ alert('Ce critère existe déjà.'); return; }
    const endVal  = f.querySelector('#nrc-end').value;
    const startVal= f.querySelector('#nrc-start').value;
    RCFG[name]={
      color:         f.querySelector('#nrc-color').value,
      dash:          f.querySelector('#nrc-dash').value,
      open:          endVal === 'open',
      chevron:       endVal === 'chevron',
      noArrow:       endVal === 'none',
      diamond:       startVal === 'diamond',
      hollowDiamond: startVal === 'hollowDiamond',
      circle:        startVal === 'circle',
    };
    S.relF[name]=true;
    f.remove(); onModelChanged();
  };
}

/**
 * Affiche un mini-formulaire inline dans la section "Types d'éléments"
 * pour créer un nouveau type avec nom, abréviation et couleur.
 */
function showEditTypeForm(container, afterRow, typeName, cfg) {
  container.querySelectorAll('.inline-form').forEach(f=>f.remove());
  const ICONS=['🧱','⚙','◆','◻','📋','📂','🔷','🔶','🔌','◈','▣','⬡'];
  const f=document.createElement('div'); f.className='inline-form';
  f.style.cssText='background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px;padding:8px;margin-top:4px';
  f.innerHTML=`
    <div style="font-size:10px;font-weight:700;color:var(--c-dim);margin-bottom:6px;text-transform:uppercase">Modifier : ${typeName}</div>
    <div class="frow">
      <label>Couleur</label>
      <div style="display:flex;gap:6px;align-items:center;flex:1">
        <input id="etp-color" type="color" value="${cfg.color||'#89b4fa'}" style="width:32px;height:22px;border:none;background:none;cursor:pointer;padding:0">
        <div id="etp-palette" style="display:flex;gap:3px;flex-wrap:wrap"></div>
      </div>
    </div>
    <div class="frow"><label>Abrév.</label><input id="etp-abbr" maxlength="4" value="${cfg.abbr||''}" style="width:52px;flex:none"></div>
    <div class="frow"><label>Icône</label>
      <div id="etp-icons" style="display:flex;gap:4px;flex-wrap:wrap;flex:1"></div>
    </div>
    <div class="fbtns"><button class="fbtn-cancel" id="etp-cancel">Annuler</button>
                       <button class="fbtn-save" id="etp-save">Appliquer</button></div>`;
  afterRow.insertAdjacentElement('afterend', f);
  const pal=f.querySelector('#etp-palette');
  COLOR_PALETTE.slice(0,12).forEach(c=>{
    const b=document.createElement('div');
    b.style.cssText=`width:12px;height:12px;border-radius:2px;background:${c};cursor:pointer;border:1px solid rgba(255,255,255,.2)`;
    b.onclick=()=>{ f.querySelector('#etp-color').value=c; };
    pal.appendChild(b);
  });
  let selIcon=cfg.icon||'◻';
  const iconBox=f.querySelector('#etp-icons');
  ICONS.forEach(ic=>{
    const b=document.createElement('span');
    b.textContent=ic;
    b.style.cssText='font-size:16px;cursor:pointer;padding:2px 4px;border-radius:3px;border:1px solid transparent';
    if(ic===selIcon) b.style.borderColor='var(--c-accent)';
    b.onclick=()=>{ selIcon=ic; iconBox.querySelectorAll('span').forEach(s=>s.style.borderColor='transparent'); b.style.borderColor='var(--c-accent)'; };
    iconBox.appendChild(b);
  });
  f.querySelector('#etp-cancel').onclick=()=>f.remove();
  f.querySelector('#etp-save').onclick=()=>{
    cfg.color=f.querySelector('#etp-color').value;
    cfg.abbr=(f.querySelector('#etp-abbr').value.trim()||typeName.slice(0,3)).toUpperCase();
    cfg.icon=selIcon;
    f.remove(); buildPanel(); setupMarkers(); render();
  };
}

/** Affiche le formulaire de création d'un nouveau type d'élément.
 */
function showNewTypeForm(container) {
  if (container.querySelector('.inline-form')) return;
  const color=nextColor();
  const f=document.createElement('div'); f.className='inline-form';
  f.style.cssText='background:var(--c-bg3);border:1px solid var(--c-border);border-radius:5px;padding:8px;margin-top:6px';
  f.innerHTML=`
    <div style="font-size:10px;font-weight:700;color:var(--c-dim);margin-bottom:6px;text-transform:uppercase">Nouveau type</div>
    <div class="frow"><label>Nom</label><input id="ntp-name" placeholder="ex: Acteur"></div>
    <div class="frow"><label>Abrév.</label><input id="ntp-abbr" placeholder="3 car." maxlength="4" style="width:48px;flex:none"></div>
    <div class="frow">
      <label>Couleur</label>
      <div style="display:flex;gap:6px;align-items:center;flex:1">
        <input id="ntp-color" type="color" value="${color}" style="width:32px;height:22px;border:none;background:none;cursor:pointer;padding:0">
        <div id="ntp-palette" style="display:flex;gap:3px;flex-wrap:wrap"></div>
      </div>
    </div>
    <div class="fbtns"><button class="fbtn-cancel" id="ntp-cancel">Annuler</button>
                       <button class="fbtn-save" id="ntp-save">Créer</button></div>`;
  container.appendChild(f);
  // Abbréviation auto à partir du nom
  f.querySelector('#ntp-name').oninput=function(){
    const ab=f.querySelector('#ntp-abbr');
    if (!ab.dataset.manual) ab.value=this.value.slice(0,3).toUpperCase();
  };
  f.querySelector('#ntp-abbr').oninput=function(){ this.dataset.manual='1'; };
  // Palette
  const pal=f.querySelector('#ntp-palette');
  COLOR_PALETTE.slice(0,12).forEach(c=>{
    const b=document.createElement('div');
    b.style.cssText=`width:12px;height:12px;border-radius:2px;background:${c};cursor:pointer;border:1px solid rgba(255,255,255,.2)`;
    b.onclick=()=>{ f.querySelector('#ntp-color').value=c; };
    pal.appendChild(b);
  });
  f.querySelector('#ntp-cancel').onclick=()=>f.remove();
  f.querySelector('#ntp-save').onclick=()=>{
    const name=f.querySelector('#ntp-name').value.trim();
    const abbr=(f.querySelector('#ntp-abbr').value.trim()||name.slice(0,3)).toUpperCase();
    if (!name){ alert('Nom requis.'); return; }
    if (TCFG[name]){ alert('Ce type existe déjà.'); return; }
    TCFG[name]={color:f.querySelector('#ntp-color').value, abbr};
    S.typF[name]=true;
    f.remove(); onModelChanged();
  };
}