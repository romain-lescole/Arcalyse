// ════════════════════════════════════════════════════════════════════
//  📑 DOSSIERS / 📘 RAPPORTS : TEXTES DU MODÈLE ET CLIC DROIT
//  Bloc « texte du modèle » (k:'mod', ref élément ou diagramme, quoi nom|desc|nomdesc,
//  orig : texte libre d'origine gardé en réserve), transformation d'un texte libre,
//  suggestion de lien, titre de chapitre suivi (titreRef), fenêtre de choix d'un élément,
//  menu contextuel de l'éditeur (blocs, chapitres, plan).
// ════════════════════════════════════════════════════════════════════

/** Ce que montre un bloc « texte du modèle ». @returns {{k:string,l:string}[]} */
function capDosQuois(){ return [{k:'nom', l:_L('Nom')}, {k:'desc', l:_L('Description')}, {k:'nomdesc', l:_L('Nom et description')}]; }

/**
 * Nom et description actuels d'une référence (élément du modèle chargé, ou diagramme du .aird chargé).
 * @param {object} ref - Référence {k:'el'|'diag', id, nom}
 * @returns {{nom:string, desc:string, ok:boolean}}
 */
function capDosRefTextes(ref){
  if(!ref) return {nom:'', desc:'', ok:false};
  if(ref.k==='diag'){ const rep=capHomeReps().find(r=>r.uid===ref.id); let desc='';
    try{ desc=rep?capDiagMeta(ref.id).desc||'':''; }catch(_){}
    return {nom:capDosNomDiag(rep?rep.nom:ref.nom), desc, ok:!!rep}; }
  const e=capLoaded&&capGetElementById_(ref.id);
  return {nom:capHomeRefNom(ref), desc:e?capHtmlToText(e.attrs.description||''):'', ok:!!e};
}

/**
 * Texte d'un bloc « texte du modèle », relu sur le modèle chargé.
 * @param {object} b - Bloc (k:'mod')
 * @returns {string} Texte (nom, description, ou les deux sur deux paragraphes)
 */
function capDosModTexte(b){
  const r=capDosRefTextes(b.ref);
  return b.quoi==='nom'?r.nom:b.quoi==='desc'?r.desc:[r.nom, r.desc].filter(Boolean).join('\n');
}

/**
 * En-tête et contenu d'un bloc « texte du modèle » dans l'éditeur (le reste du bloc est fait par capDosBlocHtml).
 * @param {object} b - Bloc (k:'mod')
 * @returns {{h:string, c:string}} HTML de l'en-tête et du contenu
 */
function capDosModHtml(b){
  const r=capDosRefTextes(b.ref), esc=capEsc;
  const h=`<span class="dos-ico" title="${_L('Texte du modèle : relu sur le modèle chargé à chaque export')}">🔗</span><span class="dos-blk-l">${_L('Texte du modèle')}</span>`+
    capHomeChip(b.ref,'')+`<select data-ba="quoi" title="${_L('Texte repris de l\'élément ou du diagramme')}">${capRapOpts(capDosQuois(), b.quoi)}</select>`+
    `<button class="cap-lf-btn" data-da="tx-lier" data-quoi="${b.quoi}" title="${_L('Choisir un autre élément ou diagramme')}">🔗 ${_L('Changer…')}</button>`+
    `<button class="cap-lf-btn" data-da="tx-figer" title="${_L('Remplacer par un texte libre modifiable (texte actuel du modèle)')}">${_L('¶ Figer')}</button>`+
    (b.orig!=null?`<button class="cap-lf-btn" data-da="tx-orig" title="${_L('Revenir au texte libre d\'origine (gardé en réserve)')}">${_L('↺ Texte d\'origine')}</button>`:'');
  let c;
  if(!r.ok) c=`<div class="dos-apercu"><i>${b.ref&&b.ref.k==='diag'?_L('(diagramme non chargé : ouvrez le .aird du projet)'):_L('(élément absent du modèle chargé)')}</i></div>`;
  else { const desc=r.desc?esc(r.desc):`<i>${_L('(pas de description)')}</i>`;
    c=`<div class="dos-apercu dos-mod">`+(b.quoi==='nom'?`<b>${esc(r.nom)}</b>`:b.quoi==='desc'?desc:`<b>${esc(r.nom)}</b><br>${desc}`)+`</div>`; }
  return {h, c};
}

/**
 * Transforme un bloc en « texte du modèle » relié à une référence (texte libre gardé en réserve s'il y en a un).
 * @param {{b:object, l:object[], i:number}} f - Bloc et sa place (capDosTrouve)
 * @param {object} ref - Élément ou diagramme
 * @param {string} [quoi] - nom | desc | nomdesc (par défaut : nom pour une ligne courte, sinon description)
 */
function capDosLier(f, ref, quoi){
  const b=f.b, txt=b.k==='txt'?String(b.txt||''):'';
  if(!quoi) quoi=b.k==='mod'?b.quoi:(txt.trim()&&!txt.includes('\n')&&txt.length<80?'nom':'desc');
  const n={id:b.id, k:'mod', ref, quoi};
  if(b.k==='txt'&&txt.trim()) n.orig=txt; else if(b.orig!=null) n.orig=b.orig;
  f.l.splice(f.i, 1, n);
}

/**
 * Index des noms et descriptions du modèle (texte normalisé → identifiant), pour suggérer un lien ;
 * un nom porté par plusieurs éléments n'est pas proposé.
 * @returns {{nom:Map<string,string>, desc:Map<string,string>}}
 */
function capDosTxIndex(){
  const cle=capLoaded?capAllElements.length+'|'+capCurrentFileName:'';
  if(_capDosTx.cle===cle&&_capDosTx.idx) return _capDosTx.idx;
  const nom=new Map(), desc=new Map(), dbl=new Set();
  if(capLoaded) capAllElements.forEach(e=>{
    const n=capDosTxNorm(e.attrs.name);
    if(n.length>=3){ if(nom.has(n)) dbl.add(n); else nom.set(n, e.id); }
    if(e.attrs.description){ const d=capDosTxNorm(capHtmlToText(e.attrs.description)); if(d.length>=8&&!desc.has(d)) desc.set(d, e.id); }
  });
  dbl.forEach(n=>nom.delete(n));
  _capDosTx.cle=cle; _capDosTx.idx={nom, desc};
  return _capDosTx.idx;
}
/** État des textes du modèle (index de suggestion, menu ouvert). */
var _capDosTx={cle:'', idx:null};
/** Normalise un texte pour la comparaison (espaces, casse). @param {string} s @returns {string} */
function capDosTxNorm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

/**
 * Élément dont le nom ou la description est identique au texte libre d'un bloc.
 * @param {object} b - Bloc texte
 * @returns {?{ref:object, quoi:string}}
 */
function capDosSuggestion(b){
  const t=capDosTxNorm(b.txt); if(t.length<3||!capLoaded) return null;
  const I=capDosTxIndex(), id=I.nom.get(t), idd=!id&&I.desc.get(t);
  const ref=(id||idd)&&capHomeRefEl(id||idd);
  return ref?{ref, quoi:id?'nom':'desc'}:null;
}

/**
 * Pastille « 🔗 lier à … ? » d'un bloc texte dont le contenu est un nom ou une description du modèle.
 * @param {object} b - Bloc texte
 * @returns {string} HTML ('' sans suggestion)
 */
function capDosSuggestionHtml(b){
  const s=capDosSuggestion(b); if(!s) return '';
  return `<button class="cap-lf-btn dos-sugg" data-da="tx-sugg" data-quoi="${s.quoi}" data-ref="${capEsc(JSON.stringify(s.ref))}" title="${s.quoi==='nom'?_L('Ce texte est le nom d\'un élément : le relier pour qu\'il suive le modèle'):_L('Ce texte est la description d\'un élément : la relier pour qu\'elle suive le modèle')}">`+
    _L(`🔗 lier à « ${capEsc(s.ref.nom)} » ?`)+`</button>`;
}

/**
 * Titre affiché d'un chapitre : nom de l'élément associé s'il est suivi (titreRef), sinon le titre saisi.
 * @param {object} c - Chapitre
 * @returns {string}
 */
function capDosTitre(c){ return c.titreRef&&c.ref?capHomeRefNom(c.ref):c.titre||''; }

/**
 * Copie profonde d'un bloc ou d'un chapitre avec de nouveaux identifiants.
 * @param {object} b - Bloc
 * @returns {object} Copie
 */
function capDosCopie(b){
  const c=JSON.parse(JSON.stringify(b)); c.id=capHomeUid();
  if(c.blocs) capDosParcours(c.blocs, x=>{ x.id=capHomeUid(); });
  return c;
}

/**
 * Commandes « tx-… » des blocs (boutons, pastille de suggestion, menu contextuel).
 * @param {string} act - Commande
 * @param {HTMLElement} a - Bouton (data-quoi, data-ref…)
 * @param {object} d - Dossier
 * @param {?{b:object, l:object[], i:number}} f - Bloc et sa place
 * @param {Window} W - Fenêtre (vue ou fenêtre séparée)
 */
function capDosTxAct(act, a, d, f, W){
  if(!d||!f) return;
  const b=f.b, fin=()=>{ capHomeSave(); capHomeRender(); };
  switch(act){
    case 'tx-sugg': try{ capDosLier(f, JSON.parse(a.dataset.ref), a.dataset.quoi); }catch(_){ return; } fin(); return;
    case 'tx-lier': { const id=b.id, rect=a.getBoundingClientRect();
      capDosChoisir(W, rect.left, rect.bottom+4, null, ref=>{ const g=capDosTrouve(d.blocs, id); if(!g) return; capDosLier(g, ref, a.dataset.quoi||undefined); fin(); }); return; }
    case 'tx-quoi': if(b.k==='mod'){ b.quoi=a.dataset.quoi; fin(); }
      else if(b.ref){ capDosLier(f, b.ref, a.dataset.quoi); fin(); } return;   // élément ou diagramme → seulement son texte
    case 'tx-figer': if(b.k==='mod'){ f.l.splice(f.i, 1, {id:b.id, k:'txt', txt:capDosModTexte(b)}); fin(); } return;
    case 'tx-orig': if(b.k==='mod'&&b.orig!=null){ f.l.splice(f.i, 1, {id:b.id, k:'txt', txt:b.orig}); fin(); } return;
    case 'tx-titre': if(b.k==='chap'&&b.ref){ b.titreRef=!b.titreRef; if(!b.titreRef) b.titre=capHomeRefNom(b.ref); fin(); } return;
    case 'tx-assoc': { const id=b.id, rect=a.getBoundingClientRect();
      capDosChoisir(W, rect.left, rect.bottom+4, 'el', ref=>{ const g=capDosTrouve(d.blocs, id); if(!g) return;
        g.b.ref=ref; g.b.desc=true; if(!g.b.titre) g.b.titre=capHomeRefNom(ref); fin(); }); return; }
    case 'tx-open': if(b.ref) capHomeRefOpen(b.ref); return;
    case 'tx-dup': f.l.splice(f.i+1, 0, capDosCopie(b)); fin(); return;
    case 'tx-txt-apres': { const n=capDosBlocDeRef(null,''); f.l.splice(f.i+1, 0, n); fin(); capDosFocus(n.id); return; }
    case 'tx-chap-apres': { const n=capDosChapDe(null,''); f.l.splice(f.i+1, 0, n); fin(); capDosFocus(n.id); return; }
    case 'tx-txt-dans': if(b.k==='chap'){ const n=capDosBlocDeRef(null,''); b.blocs.unshift(n); _capDosUi.plies.delete(b.id); fin(); capDosFocus(n.id); } return;
    case 'tx-copier': { const t=b.k==='chap'?capDosTitre(b):b.k==='txt'?b.txt||'':b.k==='mod'?capDosModTexte(b):b.ref?capDosRefTextes(b.ref).nom:'';
      try{ W.navigator.clipboard.writeText(t); if(typeof capWatchFlash==='function') capWatchFlash(_L('📋 Texte copié')); }catch(_){} return; }
  }
}

/**
 * Petite fenêtre de choix d'un élément ou d'un diagramme (recherche par nom, type, couche).
 * @param {Window} W - Fenêtre où l'afficher
 * @param {number} x - Position (px)
 * @param {number} y - Position (px)
 * @param {?string} seul - 'el' : éléments seulement
 * @param {function(object):void} cb - Appelée avec la référence choisie
 */
function capDosChoisir(W, x, y, seul, cb){
  const D=W.document;
  let p=D.getElementById('dos-pick');
  if(!p){ p=D.createElement('div'); p.id='dos-pick'; D.body.appendChild(p);
    D.addEventListener('mousedown',e=>{ if(!e.target.closest('#dos-pick')) p.style.display='none'; }); }
  p.innerHTML=`<input type="text" placeholder="${_L('🔍 Nom de l\'élément ou du diagramme…')}" autocomplete="off"><div class="dos-pick-l"></div>`;
  const inp=p.querySelector('input'), l=p.querySelector('.dos-pick-l');
  const diags=seul==='el'?[]:capHomeReps().map(r=>capHomeRefDiag(r));
  const fill=()=>{
    const ws=capDosTxNorm(inp.value).split(' ').filter(Boolean), ok=s=>ws.every(w=>s.includes(w)), res=[];
    for(const r of diags){ if(res.length>=60) break; if(ok(capDosTxNorm(r.nom+' '+(r.sigle||'')+' '+r.couche))) res.push(r); }
    if(ws.length) for(const e of capAllElements){ if(res.length>=60) break;
      if(e.attrs.name&&ok(capDosTxNorm(e.attrs.name+' '+e.typeName+' '+(e.layer||'')))) res.push(capHomeRefEl(e.id)); }
    l.innerHTML=res.length?res.map((r,i)=>`<div class="ctx-i${i?'':' hl'}" data-i="${i}">${capHomeRefIco(r,13)} ${capEsc(r.k==='diag'?capDosNomDiag(r.nom):r.nom)} <span class="cap-nav-g">${capEsc(capHomeRefType(r))}${r.couche?' · '+capEsc(r.couche):''}</span></div>`).join('')
      :`<div class="cap-nav-hint">${ws.length?_L('Aucun résultat.'):_L('Tapez une partie du nom.')}</div>`;
    l._res=res;
  };
  const pick=r=>{ p.style.display='none'; if(r) cb(r); };
  inp.oninput=fill;
  inp.onkeydown=e=>{ const rows=[...l.querySelectorAll('[data-i]')], i=rows.findIndex(r=>r.classList.contains('hl'));
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!rows.length) return; const n=(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;
      rows.forEach((r,j)=>r.classList.toggle('hl',j===n)); rows[n].scrollIntoView({block:'nearest'}); }
    else if(e.key==='Enter'){ e.preventDefault(); pick(l._res&&l._res[i<0?0:i]); }
    else if(e.key==='Escape') p.style.display='none'; };
  l.onclick=e=>{ const r=e.target.closest('[data-i]'); if(r) pick(l._res[+r.dataset.i]); };
  fill();
  p.style.display='block';
  p.style.left=Math.max(8,Math.min(x, W.innerWidth-p.offsetWidth-8))+'px';
  p.style.top=Math.max(8,Math.min(y, W.innerHeight-p.offsetHeight-8))+'px';
  inp.focus();
}

/**
 * Menu contextuel de l'éditeur des dossiers et rapports (blocs, chapitres, plan).
 * Dans une zone de saisie, le menu du navigateur est gardé (copier, coller, orthographe) ; Ctrl+clic droit : menu Arcalyse.
 * @param {MouseEvent} e
 */
function capDosContext(e){
  const t=e.target; if(!t.closest) return;
  const ed=t.closest('.dos-ed'); if(!ed) return;
  if(t.closest('input,textarea,select')&&!e.ctrlKey) return;
  const d=_capHome.dossiers.find(x=>x.id===ed.dataset.dosid); if(!d) return;
  const W=capHomeWin(t), D=W.document;
  const nav=t.closest('[data-dos-nav]'), bEl=nav?ed.querySelector(`[data-b="${nav.dataset.dosNav}"]`):t.closest('[data-b]');
  const f=bEl&&capDosTrouve(d.blocs, bEl.dataset.b);
  if(!f&&!t.closest('.dos-nav')) return;
  e.preventDefault();
  const it=(run,l,o)=>`<div class="ctx-i" data-run="${run}"${o?` data-o="${capEsc(JSON.stringify(o))}"`:''}>${l}</div>`, sep='<div class="cw-m-sep"></div>';
  let h;
  if(!f) h=`<div class="crv-ctx-t">${_L('🧭 Plan')}</div>`+it('nav-pli',_L('⊟ Replier tous les chapitres'))+it('nav-depli',_L('⊞ Déplier tous les chapitres'));
  else {
    const b=f.b, Q=capDosQuois(), refNom=b.ref?capEsc(capDosRefTextes(b.ref).nom):'';
    const titre={chap:_L('§ Chapitre'), txt:_L('¶ Texte libre'), mod:_L('🔗 Texte du modèle'), el:_L('◆ Élément'), diag:_L('🔲 Diagramme'), liste:_L('▤ Tableau d\'éléments'), auto:_L('⚙ Contenu automatique'), xlay:_L('🪜 Liens entre couches')}[b.k]||'';
    h=`<div class="crv-ctx-t">${titre}${refNom?` · ${refNom}`:b.k==='chap'&&b.titre?` · ${capEsc(b.titre)}`:''}</div>`;
    if(nav) h+=it('nav-go',_L('➜ Aller au chapitre'));
    if(b.k==='txt'){ const s=capDosSuggestion(b);
      if(s) h+=it('tx-sugg',_L(`🔗 Lier à « ${capEsc(s.ref.nom)} » (même texte)`),{ref:JSON.stringify(s.ref), quoi:s.quoi});
      const TL={nom:_L('🔗 Transformer en nom d\'un élément ou d\'un diagramme…'), desc:_L('🔗 Transformer en description d\'un élément ou d\'un diagramme…'), nomdesc:_L('🔗 Transformer en nom et description d\'un élément ou d\'un diagramme…')};
      h+=Q.map(q=>it('tx-lier',TL[q.k],{quoi:q.k})).join('')+sep; }
    if(b.k==='mod'){ h+=Q.filter(q=>q.k!==b.quoi).map(q=>it('tx-quoi',_L(`Afficher : ${q.l.toLowerCase()}`),{quoi:q.k})).join('')+
        it('tx-lier',_L('🔗 Changer d\'élément ou de diagramme…'),{quoi:b.quoi})+it('tx-figer',_L('¶ Figer en texte libre (texte actuel du modèle)'))+
        (b.orig!=null?it('tx-orig',_L('↺ Revenir au texte libre d\'origine')):'')+sep; }
    const SL={nom:_L('🔗 Seulement le nom (texte du modèle)'), desc:_L('🔗 Seulement la description (texte du modèle)'), nomdesc:_L('🔗 Seulement le nom et la description (texte du modèle)')};
    if((b.k==='el'||b.k==='diag')&&b.ref) h+=Q.map(q=>it('tx-quoi',SL[q.k],{quoi:q.k})).join('')+sep;
    if(b.k==='chap'){
      if(b.ref) h+=it('tx-titre',b.titreRef?_L('✎ Titre saisi librement'):_L('🔗 Titre = nom de l\'élément (suivi)'));
      h+=it('tx-assoc',b.ref?_L('🔗 Associer un autre élément…'):_L('🔗 Associer un élément…'));
      if(b.ref) h+=it('ref-x',_L('✕ Retirer l\'élément associé'));
      h+=it('pli',_capDosUi.plies.has(b.id)?_L('▾ Déplier'):_L('▸ Replier'))+it('tx-txt-dans',_L('✚ Texte au début du chapitre'))+it('sub-add',_L('✚ Sous-chapitre à la fin'))+sep;
    }
    if(b.ref&&b.k!=='liste') h+=it('tx-open',b.ref.k==='diag'?_L('🔎 Ouvrir le diagramme'):_L('🔎 Ouvrir l\'élément'));
    h+=it('tx-txt-apres',_L('✚ Texte après'))+it('tx-chap-apres',_L('✚ Chapitre après'))+
      it('conv',b.k==='chap'?_L('¶ Convertir en bloc'):_L('§ Convertir en chapitre'))+it('tx-dup',_L('⧉ Dupliquer'))+it('tx-copier',_L('📋 Copier le texte'))+sep+
      it('up',_L('↑ Monter'))+it('down',_L('↓ Descendre'))+(f.parent?it('out',_L('⇤ Sortir du chapitre')):'')+
      (f.l[f.i-1]&&f.l[f.i-1].k==='chap'?it('in',_L('⇥ Mettre dans le chapitre précédent')):'')+sep+it('del-b',_L('🗑 Retirer du dossier'));
  }
  let m=D.getElementById('dos-ctx');
  if(!m){ m=D.createElement('div'); m.id='dos-ctx'; D.body.appendChild(m);
    D.addEventListener('mousedown',ev=>{ if(!ev.target.closest('#dos-ctx')) m.style.display='none'; });
    D.addEventListener('keydown',ev=>{ if(ev.key==='Escape') m.style.display='none'; }); }
  m.innerHTML=h;
  m.onclick=ev=>{
    const r=ev.target.closest('[data-run]'); if(!r) return;
    m.style.display='none';
    capDosCtxRun(r.dataset.run, r.dataset.o?JSON.parse(r.dataset.o):{}, ed, bEl, nav, e.clientX, e.clientY);
  };
  m.style.display='block';
  m.style.left=Math.max(4,Math.min(e.clientX, W.innerWidth-m.offsetWidth-4))+'px';
  m.style.top=Math.max(4,Math.min(e.clientY, W.innerHeight-m.offsetHeight-4))+'px';
}

/**
 * Exécute une commande du menu contextuel comme un clic sur un bouton du bloc (mêmes traitements que capDosClick).
 * @param {string} run - Commande (data-da)
 * @param {object} o - Données du bouton (quoi, ref)
 * @param {HTMLElement} ed - Éditeur du dossier
 * @param {?HTMLElement} bEl - Bloc ou chapitre visé
 * @param {?HTMLElement} nav - Ligne du plan visée
 * @param {number} x - Position du clic (fenêtres de choix)
 * @param {number} y - Position du clic
 */
function capDosCtxRun(run, o, ed, bEl, nav, x, y){
  if(run==='nav-go'){ nav.click(); return; }
  const host=bEl?bEl.querySelector('.dos-blk-h,.dos-chap-h')||bEl:ed.querySelector('.dos-nav-h')||ed;
  const btn=ed.ownerDocument.createElement('button'); btn.dataset.da=run; Object.assign(btn.dataset, o);
  btn.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:1px;height:1px;opacity:0;`;   // position reprise par les fenêtres de choix
  host.appendChild(btn);
  try{ capDosClick({target:btn}); } finally{ btn.remove(); }
}
