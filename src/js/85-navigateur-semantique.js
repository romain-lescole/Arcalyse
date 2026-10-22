// ── 🧭 Navigateur sémantique (façon Semantic Browser de Capella) ───────────────
// Onglet 🧭 Sémantique du panneau de détail (25, 77) : trois colonnes comme dans Capella —
// ← Éléments référençants · Élément courant · Éléments référencés →, chacune en catégories repliables.
// Les liens techniques (réalisations, allocations, implications, ports) sont résolus en catégories lisibles
// (« Fonctions allouées », « Composants réalisants », « Échanges entrants »…) ; un clic fait de l'élément
// l'élément courant (historique ◀ ▶ conservé, 76). Filtre commun aux trois colonnes, ⤢ pour élargir le panneau,
// ⧉ pour l'ouvrir dans une fenêtre séparée qui suit l'élément du panneau de détail (`_capSem.win`).
// Clics et saisie par délégation (capSemClic / capSemSaisie) : les mêmes lignes servent dans la page et dans la fenêtre.

/** Libellés des liens de traçabilité (sourceElement → targetElement) : [côté source (référencés), côté cible (référençants)]. */
const CAP_SEM_TRACE={
  FunctionRealization:[_L('Fonctions réalisées'),_L('Fonctions réalisantes')],
  ComponentFunctionalAllocation:[_L('Fonctions allouées'),_L('Composants allouant')],
  FunctionalExchangeRealization:[_L('Échanges réalisés'),_L('Échanges réalisants')],
  ComponentRealization:[_L('Composants réalisés'),_L('Composants réalisants')],
  PortRealization:[_L('Ports réalisés'),_L('Ports réalisants')],
  PortAllocation:[_L('Ports alloués'),_L('Ports allouant')],
  ComponentPortAllocation:[_L('Ports alloués'),_L('Ports allouant')],
  ComponentExchangeFunctionalExchangeAllocation:[_L('Échanges fonctionnels alloués'),_L('Échanges de composants allouant')],
  ComponentExchangeAllocation:[_L('Échanges de composants alloués'),_L('Liens physiques allouant')],
  StateTransitionRealization:[_L('Transitions réalisées'),_L('Transitions réalisantes')],
  AbstractStateRealization:[_L('États / modes réalisés'),_L('États / modes réalisants')],
  PhysicalArtifactRealization:[_L('Artefacts physiques réalisés'),_L('Configuration items réalisants')],
  AbstractCapabilityRealization:[_L('Capacités réalisées'),_L('Capacités réalisantes')],
  InformationRealization:[_L('Informations réalisées'),_L('Informations réalisantes')],
  FunctionalChainRealization:[_L('Chaînes réalisées'),_L('Chaînes réalisantes')],
  ScenarioRealization:[_L('Scénarios réalisés'),_L('Scénarios réalisants')],
  TransfoLink:[_L('Éléments transitionnés'),_L('Issu de la transition de')],
  GenericTrace:[_L('Traces génériques →'),_L('← Traces génériques')]
};
/** Libellés des implications (attribut `involved`) vues depuis l'élément impliquant (référencés). */
const CAP_SEM_INVOLVE={
  FunctionalChainInvolvementFunction:_L('Fonctions impliquées'),
  FunctionalChainInvolvementLink:_L('Échanges impliqués'),
  AbstractFunctionAbstractCapabilityInvolvement:_L('Fonctions impliquées'),
  CapabilityRealizationInvolvement:_L('Composants impliqués'),
  CapabilityInvolvement:_L('Acteurs / système impliqués'),
  FunctionalChainAbstractCapabilityInvolvement:_L('Chaînes fonctionnelles impliquées'),
  PhysicalPathInvolvement:_L('Liens physiques impliqués'),
  MissionInvolvement:_L('Capacités impliquées'),
  EntityOperationalCapabilityInvolvement:_L('Entités impliquées'),
  FunctionalChainReference:_L('Chaînes référencées')
};
/** Libellés lisibles des attributs de référence les plus courants (sinon le nom XML tel quel). */
const CAP_SEM_ATTR={
  abstractType:_L('Type'), source:_L('Source'), target:_L('Cible'), involved:_L('Élément impliqué'),
  sourceElement:_L('Élément source'), targetElement:_L('Élément cible'), representedInstance:_L('Instance représentée'),
  exchangedItems:_L('Éléments échangés'), relatedAbstractFunction:_L('Fonction associée'), relatedAbstractState:_L('État associé'),
  deployedElement:_L('Élément déployé'), location:_L('Déployé sur'), linkEnds:_L('Extrémités'), capability:_L('Capacité'),
  allocatedItem:_L('Élément alloué'), availableInStates:_L('Disponible dans les états'), status:_L('Statut')
};
/** Attributs jamais lus comme des références (texte libre). */
const CAP_SEM_SKIP=new Set(['name','description','summary','id','layer','fullType']);
/** Index inverse des références (capSemRevIndex), lié au tableau des éléments du modèle chargé. */
let _capSemIdx=null;

/** Index inverse des références : id cible → éléments dont un attribut le référence (calculé une fois par modèle).
 * @returns {Object<string,{from:Object,k:string}[]>} Références entrantes par id
 */
function capSemRevIndex(){
  if(_capSemIdx&&_capSemIdx._src===capAllElements) return _capSemIdx.map;
  const map={};
  capAllElements.forEach(c=>{ Object.entries(c.attrs||{}).forEach(([k,v])=>{
    if(CAP_SEM_SKIP.has(k)||!v||String(v).length>4000) return;
    capParseAttrRefs_(String(v)).forEach(r=>{ if(r!==c.id&&capGetElementById_(r)) (map[r]=map[r]||[]).push({from:c, k}); });
  }); });
  _capSemIdx={_src:capAllElements, map};
  return map;
}
/** État de l'onglet : filtre saisi (gardé d'un élément à l'autre), panneau élargi, élément courant, fenêtre séparée. */
const _capSem={q:'', large:false, w:0, cur:'', win:null};

/** Éléments référencés par la valeur d'un attribut (IDs résolus).
 * @param {Object} e - Élément Capella
 * @param {string} k - Nom de l'attribut
 * @returns {Object[]} Éléments trouvés
 */
function capSemRefs(e, k){ return e&&e.attrs&&e.attrs[k] ? capParseAttrRefs_(String(e.attrs[k])).map(capGetElementById_).filter(Boolean) : []; }
/** Vrai pour un lien technique (traçabilité, allocation, implication) résumé en catégorie lisible.
 * @param {Object} e - Élément Capella
 * @returns {boolean} Lien technique
 */
function capSemIsLink(e){ return !!(e&&e.attrs&&(e.attrs.targetElement||e.attrs.involved)); }
/** Vrai pour un port ou un pin (fonction, composant, physique).
 * @param {Object} e - Élément Capella
 * @returns {boolean} Port
 */
function capSemIsPort(e){ return !!e&&/Port$|Pin$/.test(e.typeName); }

/** Catégories des trois colonnes pour un élément : référençants, courant (attributs, contenus), référencés.
 * @param {Object} el - Élément courant
 * @returns {{refg:Object[], cur:Object[], refd:Object[]}} Catégories {l: libellé, k: nom technique, items: éléments | diagrammes, diag?: vrai}
 */
function capSemData(el){
  const rev=capSemRevIndex(), {parentOf, childrenOf}=capGetParentIndex(), byId=capGetElementById_;
  const refg=[], refd=[], cur=[];
  const add=(col, l, items, k)=>{ if(!items.length) return; const c=col.find(x=>x.l===l); if(c) items.forEach(i=>{ if(!c.items.includes(i)) c.items.push(i); }); else col.push({l, k, items:[...new Set(items)]}); };
  const ownerOf=e=>e&&byId(parentOf[e.id]);
  const hn=t=>(CAP_HUMAN_NAMES[t]||{}).h||t;
  const children=(childrenOf[el.id]||[]).map(byId).filter(Boolean);
  const inc=rev[el.id]||[];

  // ── Élément référencés → ──
  const par=ownerOf(el); if(par) add(refd, _L('Parent'), [par]);
  // Liens de traçabilité dont l'élément est la source (portés par lui ou désignant sourceElement)
  const traces=new Set([...children.filter(c=>c.attrs.targetElement&&(!c.attrs.sourceElement||capSemRefs(c,'sourceElement')[0]===el)),
    ...inc.filter(r=>r.k==='sourceElement'&&r.from.attrs.targetElement).map(r=>r.from)]);
  traces.forEach(t=>add(refd, (CAP_SEM_TRACE[t.typeName]||[hn(t.typeName)+' →'])[0], capSemRefs(t,'targetElement'), t.typeName));
  // Implications possédées (chaîne → fonctions / échanges, capacité → acteurs…)
  children.filter(c=>c.attrs.involved).forEach(c=>add(refd, CAP_SEM_INVOLVE[c.typeName]||_L('Éléments impliqués'), capSemRefs(c,'involved'), c.typeName));
  // Échanges branchés sur les ports de l'élément
  children.filter(capSemIsPort).forEach(p=>(rev[p.id]||[]).forEach(r=>{
    if(r.k==='source') add(refd, _L('Échanges sortants'), [r.from], r.from.typeName);
    else if(r.k==='target') add(refd, _L('Échanges entrants'), [r.from], r.from.typeName);
    else if(r.k==='linkEnds') add(refd, _L('Liens physiques'), [r.from], r.from.typeName);
  }));
  // Échange / lien : éléments propriétaires des ports source et cible
  [['source',_L('Élément source')],['target',_L('Élément cible')],['linkEnds',_L('Éléments reliés')]].forEach(([k,l])=>{
    const own=capSemRefs(el,k).filter(capSemIsPort).map(ownerOf).filter(Boolean); add(refd, l, own, 'owner');
  });
  // Attributs de référence bruts
  Object.keys(el.attrs).forEach(k=>{ if(CAP_SEM_SKIP.has(k)) return; add(refd, CAP_SEM_ATTR[k]||k, capSemRefs(el,k), k); });

  // ── ← Éléments référençants ──
  inc.forEach(r=>{
    const f=r.from;
    if(r.k==='targetElement'&&f.attrs.targetElement){
      const src=capSemRefs(f,'sourceElement'); add(refg, (CAP_SEM_TRACE[f.typeName]||[0,'← '+hn(f.typeName)])[1], src.length?src:[ownerOf(f)].filter(Boolean), f.typeName);
    } else if(r.k==='involved'){ const o=ownerOf(f); if(o) add(refg, `${_L('Impliqué dans')} — ${hn(o.typeName)}`, [o], f.typeName); }
    else if(r.k==='sourceElement'&&f.attrs.targetElement) return;
    else if(capSemIsLink(f)&&(r.k==='source'||r.k==='target')) return;   // ordre des étapes d'une chaîne
    else if(r.k==='abstractType'&&f.typeName==='Part') add(refg, _L('Parts représentant l\'élément'), [f], 'Part.abstractType');
    else add(refg, `${hn(f.typeName)} · ${CAP_SEM_ATTR[r.k]||r.k}`, [f], f.typeName+'.'+r.k);
  });
  // Relations Capella (22), hors décompositions (déjà dans Parent / contenus) : après les catégories propres,
  // dont elles reprennent souvent les éléments (la doublure est alors retirée)
  const ri=capTableRelIndex();
  CAP_LINK_SECTIONS.forEach(s=>{ if(s.grp==='deco'||!ri[s.key]) return;
    add(refd, s.humanLabel, (ri[s.key].out[el.id]||[]).map(t=>byId(t.id)).filter(Boolean), s.key);
    add(refg, s.humanLabel, (ri[s.key].in[el.id]||[]).map(t=>byId(t.id)).filter(Boolean), s.key); });
  // 🔲 Diagrammes du projet (.aird) : représentant l'élément, puis où il apparaît
  if(typeof _capDiag!=='undefined'&&_capDiag.vis&&_capDiag.airdCharge){
    try{ const {cibles, presences}=_capDiag.vis.diagrammesDe(el.id), vus=new Set(cibles.map(d=>d.uid));
      if(cibles.length) refg.push({l:_L('Diagrammes représentant l\'élément'), k:'diag', diag:true, items:cibles});
      const p=presences.filter(d=>!vus.has(d.uid)); if(p.length) refg.push({l:_L('Diagrammes contenant l\'élément'), k:'diag', diag:true, items:p});
    }catch(e){ /* visionneuse indisponible : pas de diagrammes */ }
  }

  // ── Élément courant : attributs littéraux et éléments contenus par type ──
  const lit=Object.entries(el.attrs).filter(([k,v])=>v&&k!=='description'&&k!=='name'&&!capSemRefs(el,k).length);
  if(lit.length) cur.push({l:_L('Attributs'), k:'attr', attrs:lit, items:lit});
  const byType={}; children.forEach(c=>{ (byType[c.typeName]=byType[c.typeName]||[]).push(c); });
  Object.entries(byType).sort((a,b)=>capSemIsLink(a[1][0])-capSemIsLink(b[1][0])||a[0].localeCompare(b[0]))
    .forEach(([t,l])=>cur.push({l:hn(t), k:t, items:l, link:capSemIsLink(l[0])}));

  // Une catégorie identique à une précédente de la même colonne (mêmes éléments) n'est pas répétée
  const dedup=col=>{ const vus=new Set(); return col.filter(c=>{ if(c.diag) return true; const s=c.items.map(i=>i.id).sort().join(' '); if(vus.has(s)) return false; vus.add(s); return true; }); };
  return {refg:dedup(refg), cur, refd:dedup(refd)};
}

/** Ligne d'un élément ou d'un diagramme dans une catégorie (clic : devient l'élément courant / ouvre le diagramme).
 * @param {Object} it - Élément Capella, ou diagramme {uid, nom, sigle, type}
 * @param {string} [diagDe] - Élément courant (pour une ligne de diagramme)
 * @returns {string} HTML
 */
function capSemItem(it, diagDe){
  if(diagDe) return `<div class="csb-it cap-det-link" role="button" tabindex="0" data-n="${capEsc(String(it.nom||it.type).toLowerCase())}" data-sem-diag="${capEsc(it.uid)}" data-sem-de="${capEsc(diagDe)}" title="${capEsc(it.type)}"><span class="cdg-sigle">${capEsc(it.sigle)}</span><span class="csb-nm">${capEsc(it.nom||it.type)}</span></div>`;
  const lv=CAP_LAYERS[it.layer]||{color:'#8b949e'}, nm=it.attrs.name||it.typeName;
  return `<div class="csb-it cap-det-link" role="button" tabindex="0" data-n="${capEsc(String(nm).toLowerCase())}" data-sem-id="${capEsc(it.id)}" title="${capEsc(it.typeName+(it.layer?' — '+it.layer:''))}">${capIco(it.id,13)}<span class="csb-nm">${capEsc(nm)}</span><span class="csb-ty" style="color:${capTextOn(lv.color)}">${capEsc(it.typeName)}</span></div>`;
}

/** Catégorie repliable (ouverte jusqu'à 30 lignes, fermée pour les liens techniques contenus).
 * @param {Object} c - Catégorie de capSemData
 * @param {string} id - Élément courant
 * @param {boolean} [pop] - Rendu pour la fenêtre séparée
 * @returns {string} HTML
 */
function capSemCat(c, id, pop){
  const n=c.items.length, ouvert=!c.link&&n<=30;
  const corps=c.attrs ? `<table class="csb-attrs">${c.attrs.map(([k,v])=>`<tr data-n="${capEsc(String(k+' '+v).toLowerCase())}" class="csb-it"><td>${capEsc(k)}</td><td>${capEsc(String(v).slice(0,200))}</td></tr>`).join('')}</table>`
    : capPaged(c.items,{render:it=>capSemItem(it, c.diag?id:''), size:pop?2000:undefined});   // fenêtre : pas de pagination (blocs de 78 propres à la page)
  const tip=c.k&&c.k!==c.l&&!c.diag&&c.k!=='attr' ? ` title="${capEsc(c.k)}"` : '';
  return `<details class="csb-cat"${ouvert?' open':''}><summary${tip}>${capEsc(c.l)} <span class="csb-n">${n}</span></summary>${corps}</details>`;
}

/** Section 🧭 Navigateur sémantique du panneau de détail (onglet `sem`), ou contenu de la fenêtre séparée.
 * @param {Object} el - Élément courant
 * @param {function(string, string):string} secTitle - Titre de section du panneau
 * @param {boolean} [pop] - Rendu pour la fenêtre séparée (bouton ⧈ au lieu de ⤢ / ⧉)
 * @returns {string} HTML
 */
function capSemDetail(el, secTitle, pop){
  const d=capSemData(el), lv=CAP_LAYERS[el.layer]||{color:'#8b949e'};
  _capSem.cur=el.id;
  const col=(cls, titre, tip, cats, tete)=>`<div class="csb-col ${cls}"><div class="csb-h" title="${capEsc(tip)}">${titre} <span class="csb-n">${cats.reduce((s,c)=>s+(c.attrs?0:c.items.length),0)}</span></div>${tete||''}${cats.map(c=>capSemCat(c, el.id, pop)).join('')||`<div class="csb-vide">${_L('Aucun élément')}</div>`}</div>`;
  const tete=`<div class="csb-cur"><span>${capIco(el.id,16)}</span><b>${capEsc(el.attrs.name||_L('—sans nom—'))}</b><span class="csb-ty" style="color:${capTextOn(lv.color)}">${capEsc(el.typeName)}${el.layer?' · '+capEsc(el.layer):''}</span></div>`;
  return secTitle(_L('🧭 Navigateur sémantique'))+
    `<div class="csb" data-tab="sem"><div class="csb-bar"><input type="search" class="csb-q" placeholder="${_L('Filtrer les éléments…')}" value="${capEsc(_capSem.q)}" title="${_L('Filtre commun aux trois colonnes (nom de l\'élément)')}">`+
    (pop ? `<button type="button" class="tbtn" data-sem-a="back" title="${_L('Fermer la fenêtre séparée (le navigateur reste dans l\'onglet 🧭 du panneau de détail)')}">⧈</button>`
      : `<button type="button" class="tbtn csb-large${_capSem.large?' active':''}" data-sem-a="large" title="${_L('Élargir le panneau pour voir les trois colonnes côte à côte')}">⤢</button>`+
        `<button type="button" class="tbtn${capSemPop()?' active':''}" data-sem-a="pop" title="${_L('Ouvrir le navigateur sémantique dans une fenêtre séparée (par exemple sur un autre écran) : il suit l\'élément du panneau de détail')}">⧉</button>`)+`</div>`+
    `<div class="csb-cols">${col('csb-refg', _L('← Éléments référençants'), _L('Éléments qui désignent l\'élément courant (Referencing Elements)'), d.refg)}`+
    `${col('csb-curc', _L('Élément courant'), _L('Attributs et éléments contenus (Current Element)'), d.cur, tete)}`+
    `${col('csb-refd', _L('Éléments référencés →'), _L('Éléments désignés par l\'élément courant (Referenced Elements)'), d.refd)}</div></div>`;
}

/** Après le rendu du panneau de détail : réapplique le filtre saisi pour l'élément précédent.
 * @param {HTMLElement} box - Conteneur du panneau
 */
function capSemApres(box){ if(_capSem.q) capSemFiltre(box&&box.querySelector('.csb-q')); capSemPopRender(); }

/** Filtre les lignes des trois colonnes (nom contenant le texte saisi) ; catégories vides masquées.
 * @param {HTMLInputElement} inp - Champ de filtre
 */
function capSemFiltre(inp){
  if(!inp) return;
  const q=_capSem.q=inp.value.trim().toLowerCase(), box=inp.closest('.csb');
  box.querySelectorAll('.csb-it').forEach(r=>{ r.style.display=!q||r.dataset.n.includes(q)?'':'none'; });
  box.querySelectorAll('.csb-cat').forEach(c=>{ const vis=!q||[...c.querySelectorAll('.csb-it')].some(r=>r.style.display!=='none');
    c.style.display=vis?'':'none'; if(q&&vis) c.open=true; });
}

/** Élargit (ou rétablit) la colonne de droite pour afficher les trois colonnes côte à côte.
 * @param {HTMLElement} b - Bouton ⤢
 */
function capSemLarge(b){
  _capSem.large=!_capSem.large;
  if(_capSem.large){ _capSem.w=_capNav.dockW||0; _capNav.dockW=Math.round(Math.min(innerWidth*0.7, 960)); }
  else if(_capSem.w) _capNav.dockW=_capSem.w; else delete _capNav.dockW;
  capDockWidthApply(); capNavSave(); window.dispatchEvent(new Event('resize'));
  b.classList.toggle('active',_capSem.large);
}

/** Clic dans un navigateur sémantique (page ou fenêtre séparée) : élément → élément courant, diagramme → ouvert, boutons.
 * @param {MouseEvent} e - Clic
 */
function capSemClic(e){
  const t=e.target.closest&&e.target.closest('.csb [data-sem-id],.csb [data-sem-diag],.csb [data-sem-a]'); if(!t) return;
  const d=t.dataset;
  if(d.semId) capOpenDetail(d.semId);
  else if(d.semDiag){ capDiagOpen(d.semDiag, d.semDe); if(t.ownerDocument!==document) window.focus(); }
  else if(d.semA==='large') capSemLarge(t);
  else if(d.semA==='pop') capSemPopOut();
  else if(d.semA==='back'){ const w=capSemPop(); if(w) w.close(); capSemPopFerme(); }
}
/** Saisie dans le champ de filtre d'un navigateur sémantique. @param {Event} e - Saisie */
function capSemSaisie(e){ if(e.target.classList&&e.target.classList.contains('csb-q')) capSemFiltre(e.target); }
document.addEventListener('click', capSemClic);
document.addEventListener('input', capSemSaisie);
window.addEventListener('pagehide', ()=>{ const w=capSemPop(); if(w) w.close(); });

/** @returns {Window|null} Fenêtre séparée du navigateur sémantique, si elle est ouverte */
function capSemPop(){ const w=_capSem.win; return w&&!w.closed?w:null; }

/** Ouvre (ou ramène au premier plan) la fenêtre séparée du navigateur sémantique, qui suit le panneau de détail. */
function capSemPopOut(){
  if(capSemPop()){ capSemPop().focus(); return; }
  const w=window.open('', 'arcalyse-semantique', 'width=1180,height=820');
  if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
  const D=w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="csb-pop-body"></body></html>'); D.close();
  document.querySelectorAll('style').forEach(st=>D.head.appendChild(D.importNode(st,true)));
  _capSem.win=w;
  D.addEventListener('click', e=>{
    capSemClic(e);
    const b=e.target.closest('.cap-pg-bar [data-pg-go]'); if(b){ e.preventDefault(); capPgShow(b.closest('.cap-pg'), b.dataset.pgGo); }
  });
  D.addEventListener('input', capSemSaisie);
  D.addEventListener('keydown', e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.getAttribute&&e.target.getAttribute('role')==='button'){ e.preventDefault(); e.target.click(); }
    else if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); }
  });
  w.addEventListener('pagehide', capSemPopFerme);
  capSemPopRender();
  capSemBoutons();
}

/** Fenêtre séparée fermée : oubli de la fenêtre, bouton ⧉ du panneau rétabli. */
function capSemPopFerme(){ _capSem.win=null; capSemBoutons(); }

/** État du bouton ⧉ des navigateurs affichés dans la page (enfoncé tant que la fenêtre est ouverte). */
function capSemBoutons(){ document.querySelectorAll('.csb [data-sem-a="pop"]').forEach(b=>b.classList.toggle('active', !!capSemPop())); }

/** Redessine la fenêtre séparée pour l'élément courant (thème de la page recopié). */
function capSemPopRender(){
  const w=capSemPop(); if(!w) return;
  const D=w.document, el=_capSem.cur&&capGetElementById_(_capSem.cur);
  capRevPopTheme(w);
  D.title=_L('🧭 Navigateur sémantique')+' — '+(el?(el.attrs.name||el.typeName)+' — ':'')+(capCurrentFileName||'Arcalyse');
  const pos=D.scrollingElement?D.scrollingElement.scrollTop:0;
  D.body.innerHTML=el ? capSemDetail(el, ()=>'', true)
    : `<div class="csb"><div class="csb-vide">${_L('Ouvrez le détail d\'un élément : le navigateur sémantique le suivra ici.')}</div></div>`;
  if(_capSem.q) capSemFiltre(D.querySelector('.csb-q'));
  if(D.scrollingElement) D.scrollingElement.scrollTop=pos&&el&&el.id===w._capSemCur?pos:0;
  w._capSemCur=el&&el.id;
}
