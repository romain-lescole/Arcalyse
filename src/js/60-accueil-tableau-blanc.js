/* ═══════════════════════════════════════════════════════════════════════
   🏠 ACCUEIL (suite) — 🧾 tableaux blancs, ⧉ fenêtres séparées, glisser-déposer depuis les autres vues
   ───────────────────────────────────────────────────────────────────────
   • Tableau blanc : pages ; outils ↖ sélection, 🗒 note, T texte libre, ▭ rectangle, ◯ ellipse, ╱ trait, → flèche
     (dessinés en glissant sur le tableau) ; couleur et remplissage (appliqués aussi à l'objet sélectionné) ;
     diagrammes et éléments déposés en icônes cliquables ; déplacement, redimensionnement, Suppr.
   • ⧉ Fenêtre séparée : une check-list, un plan de revue ou un tableau blanc s'ouvre dans sa propre fenêtre
     (même script, mêmes données, styles et thème recopiés, comme 💬 Revue) ; la vue montre alors un rappel.
   • Glisser-déposer depuis les vues : lignes de la liste de 🔲 Diagrammes Capella, cartes et arborescence de
     🧭 Explorateur, chaînes de ⚡ Chaînes — vers un tableau blanc ou une check-list ouvert en fenêtre séparée.
   ═══════════════════════════════════════════════════════════════════════ */

/** Outils du tableau blanc : k = outil, i = icône, t = info-bulle. */
function capHomeOutils(){ return [
  {k:'sel', i:'↖', t:_L('Sélection : cliquer un objet pour le choisir, le glisser pour le déplacer (Suppr : le retirer)')},
  {k:'note', i:'🗒', t:_L('Note : cliquer sur le tableau pour poser une note de texte (ou double-clic avec la sélection)')},
  {k:'text', i:'T', t:_L('Texte libre, sans fond : cliquer sur le tableau')},
  {k:'rect', i:'▭', t:_L('Rectangle : glisser sur le tableau')},
  {k:'ellipse', i:'◯', t:_L('Ellipse ou cercle : glisser sur le tableau')},
  {k:'line', i:'╱', t:_L('Trait : glisser d\'un bout à l\'autre')},
  {k:'arrow', i:'→', t:_L('Flèche : glisser du départ vers la pointe')} ]; }

/** @returns {object} page de tableau blanc ouverte dans l'onglet 🧾 (une page est créée s'il n'y en a aucune) */
function capHomeCurBoard(){
  if(!_capHome.boards.length){ _capHome.boards.push({id:capHomeUid(), titre:_L('Page 1'), items:[]}); capHomeSave(); }
  return _capHome.boards.find(b=>b.id===_capHomeUi.board)||(_capHomeUi.board=_capHome.boards[0].id, _capHome.boards[0]);
}
/**
 * Page de tableau blanc concernée par un élément de l'interface (vue ou fenêtre séparée).
 * @param {Element} [el] @returns {object|undefined}
 */
function capHomeBoardOf(el){ const n=el&&el.closest&&el.closest('[data-boardid]'); return n?_capHome.boards.find(b=>b.id===n.dataset.boardid):capHomeCurBoard(); }

/**
 * Dessin SVG d'une forme, en pixels (taille de l'objet).
 * @param {object} it - Forme {f:'rect'|'ellipse'|'line'|'arrow', w, h, col, fill, inv}
 * @returns {string} SVG
 */
function capHomeShapeSvg(it){
  const w=Math.max(it.w||0,4), h=Math.max(it.h||0,4), c=it.col||'#58a6ff', sw=2.5, f=it.fill?`fill="${c}" fill-opacity=".28"`:'fill="none"';
  const hit=`stroke="transparent" stroke-width="12" fill="none" class="hm-hit"`;
  let s='';
  if(it.f==='rect') s=`<rect x="${sw/2}" y="${sw/2}" width="${w-sw}" height="${h-sw}" rx="4" ${f} stroke="${c}" stroke-width="${sw}" class="hm-hit${it.fill?' hm-hit-f':''}"/><rect x="${sw/2}" y="${sw/2}" width="${w-sw}" height="${h-sw}" rx="4" ${hit}/>`;
  else if(it.f==='ellipse') s=`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-sw/2}" ry="${h/2-sw/2}" ${f} stroke="${c}" stroke-width="${sw}" class="hm-hit${it.fill?' hm-hit-f':''}"/><ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-sw/2}" ry="${h/2-sw/2}" ${hit}/>`;
  else {
    const p=6, x1=p, x2=w-p, y1=it.inv?h-p:p, y2=it.inv?p:h-p;
    s=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${hit}/>`;
    if(it.f==='arrow'){ const a=Math.atan2(y2-y1,x2-x1), L=13, o=.42;
      s+=`<polygon points="${x2},${y2} ${x2-L*Math.cos(a-o)},${y2-L*Math.sin(a-o)} ${x2-L*Math.cos(a+o)},${y2-L*Math.sin(a+o)}" fill="${c}" class="hm-hit hm-hit-f"/>`; }
  }
  return `<svg width="${w}" height="${h}" class="hm-shape-svg">${s}</svg>`;
}

/**
 * HTML d'un objet du tableau blanc.
 * @param {object} it - Objet (note, texte libre, forme, référence)
 * @returns {string} HTML
 */
function capHomeItemHtml(it){
  const esc=capEsc, on=_capHomeUi.sel===it.id?' hm-sel':'', x=`<span class="hm-it-x" data-a="bi-del" title="${_L('Retirer du tableau')}">✕</span>`;
  if(it.k==='ref'){ const r=it.ref, ok=capHomeRefOk(r), lv=CAP_LAYERS[r.couche]||{color:'#8b949e'};
    return `<div class="hm-it hm-ref${ok?'':' hm-miss'}${on}" data-it="${it.id}" data-mv="1" style="left:${it.x}px;top:${it.y}px" title="${esc(capHomeRefType(r))} — ${ok?_L('clic : ouvrir'):(r.k==='diag'?_L('diagramme non chargé (.aird)'):_L('absent du modèle chargé'))}">`+
      `<span class="hm-ref-i">${capHomeRefIco(r,30)}</span><span class="hm-ref-n">${esc(capHomeRefNom(r))}</span><span class="hm-ref-t"><b style="color:${lv.color}">${esc(r.couche||'')}</b> ${esc(capHomeRefType(r))}</span>${x}</div>`; }
  if(it.k==='shape') return `<div class="hm-it hm-shape${on}" data-it="${it.id}" data-mv="1" style="left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px">${capHomeShapeSvg(it)}`+
    `<span class="hm-shape-a">${it.f==='line'||it.f==='arrow'?`<span class="hm-it-x" data-a="bi-flip" title="${_L('Inverser le sens du trait')}">⇅</span>`:''}${x}</span><span class="hm-rz" data-rz="1" title="${_L('Redimensionner')}"></span></div>`;
  const libre=it.libre;
  return `<div class="hm-it hm-txt${libre?' hm-txt-libre':''}${on}" data-it="${it.id}" style="left:${it.x}px;top:${it.y}px;width:${it.w||220}px;height:${it.h||110}px;--hm-c:${it.col||'#e3b341'}">`+
    `<div class="hm-it-h" data-mv="1" title="${_L('Glisser pour déplacer')}">${x}</div>`+
    `<div class="hm-txt-b" contenteditable="true" spellcheck="true" data-bt="1">${esc(it.txt||'')}</div></div>`;
}

/**
 * Onglet 🧾 Tableaux blancs (ou fenêtre séparée) : pages, outils, couleurs, plan de travail.
 * @param {object} B - Page de tableau blanc
 * @param {boolean} [pop] - true : dans sa fenêtre séparée (sans onglets de pages)
 * @returns {string} HTML
 */
function capHomeBoardHtml(B, pop){
  const u=_capHomeUi, esc=capEsc, ailleurs=!pop&&capHomePopWin('board',B.id);
  let W=2400, Hh=1600; B.items.forEach(it=>{ W=Math.max(W,(it.x||0)+(it.w||200)+400); Hh=Math.max(Hh,(it.y||0)+(it.h||120)+400); });
  const pages=pop?`<b class="hm-wb-titre">🧾 ${esc(B.titre||'')}</b>`:
    `<span class="tb-grp">${_capHome.boards.map(b=>`<button class="phl-toggle-btn${b.id===B.id?' active':''}" data-board="${b.id}" title="${_L('Double-clic : renommer')}">${esc(b.titre||_L('(sans titre)'))}</button>`).join('')}`+
    `<button class="cap-lf-btn" data-a="b-add" title="${_L('Nouvelle page')}">✚</button></span>`;
  const outils=`<span class="tb-grp">${capHomeOutils().map(o=>`<button class="cap-lf-btn hm-tool${u.tool===o.k?' active':''}" data-tool="${o.k}" title="${o.t}">${o.i}</button>`).join('')}</span>`+
    `<span class="tb-grp">${CAP_HOME_COULEURS.map(c=>`<span class="hm-col${c===u.col?' on':''}" data-col="${c}" style="background:${c}" title="${_L('Couleur (nouveaux objets et objet sélectionné)')}"></span>`).join('')}`+
    `<button class="cap-lf-btn${u.fill?' active':''}" data-a="b-fill" title="${_L('Remplissage des rectangles et ellipses (nouveaux et sélectionné)')}">${u.fill?_L('◼ Rempli'):_L('◻ Contour')}</button></span>`;
  const bar=`<div class="hm-wb-bar">${pages}${outils}<span class="tb-grp"><button class="cap-lf-btn" data-a="b-ren" title="${_L('Renommer la page')}">✎</button><button class="cap-lf-btn" data-a="b-del" title="${_L('Supprimer la page')}">🗑</button>`+
    (pop?'':`<button class="cap-lf-btn" data-a="pop" data-kind="board" data-id="${B.id}" title="${_L('Ouvrir dans une fenêtre séparée : glissez-y aussi des diagrammes depuis 🔲 Diagrammes Capella et des éléments depuis 🧭 Explorateur')}">⧉</button>`)+`</span></div>`;
  if(ailleurs) return `<div class="hm-main hm-wb-w" data-boardid="${B.id}">${bar}${capHomePopPlace('board',B)}</div>`;
  return `<div class="hm-main hm-wb-w" data-boardid="${B.id}">${bar}`+
    `<div class="hm-drop-hint hm-wb-tip">${_L('Double-clic : note · outils ▭ ◯ ╱ → : glisser sur le tableau · déposez des diagrammes et des éléments (palette 📎) · clic sur une icône : l\'ouvrir · Suppr : retirer l\'objet sélectionné')}</div>`+
    `<div class="hm-wb" tabindex="0"><div class="hm-wb-in${u.tool!=='sel'?' hm-drawing':''}" data-drop="board" style="width:${W}px;height:${Hh}px">${B.items.map(capHomeItemHtml).join('')}</div></div></div>`;
}
/**
 * Après le rendu d'un tableau blanc : hauteur jusqu'en bas de sa fenêtre, suivi de la taille des notes.
 * @param {HTMLElement} root - Conteneur (vue ou fenêtre séparée)
 */
function capHomeBoardAfter(root){
  const wb=root.querySelector('.hm-wb'); if(!wb) return;
  const W=capHomeWin(wb), B=capHomeBoardOf(wb);
  const fit=()=>{ wb.style.height=Math.max(260, W.innerHeight-wb.getBoundingClientRect().top-8)+'px'; };
  fit(); W.requestAnimationFrame(fit);
  if(_capHomeUi.scroll&&_capHomeUi.scroll[B.id]){ wb.scrollLeft=_capHomeUi.scroll[B.id][0]; wb.scrollTop=_capHomeUi.scroll[B.id][1]; }
  wb.addEventListener('scroll',()=>{ (_capHomeUi.scroll=_capHomeUi.scroll||{})[B.id]=[wb.scrollLeft, wb.scrollTop]; });
  if(!root._hmFit){ root._hmFit=true; W.addEventListener('resize',()=>{ const x=root.querySelector('.hm-wb'); if(x) x.style.height=Math.max(260, W.innerHeight-x.getBoundingClientRect().top-8)+'px'; }); }
  if(W.ResizeObserver){
    if(root._hmRo) root._hmRo.disconnect();
    root._hmRo=new W.ResizeObserver(es=>{ let ch=false;
      es.forEach(e=>{ const n=e.target, it=B.items.find(x=>x.id===n.dataset.it); if(!it) return;
        const w=n.offsetWidth, h=n.offsetHeight; if(w&&h&&(w!==it.w||h!==it.h)){ it.w=w; it.h=h; ch=true; } });
      if(ch) capHomeSaveLater(); });
    root.querySelectorAll('.hm-txt').forEach(n=>root._hmRo.observe(n));
  }
}
/**
 * Ajoute un objet sur une page de tableau blanc.
 * @param {object} B - Page
 * @param {object} it - {k:'txt'|'ref'|'shape', x, y, …}
 * @param {boolean} [edit] - true : placer le curseur dans la note créée
 */
function capHomeBoardAdd(B, it, edit){
  if(!B) return;
  it.id=capHomeUid(); B.items.push(it); _capHomeUi.sel=it.id; capHomeSave(); capHomeRender();
  if(edit){ const f=()=>{ const n=capHomeFind(`.hm-it[data-it="${it.id}"] .hm-txt-b`); if(n&&n.ownerDocument.activeElement!==n) n.focus(); }; f(); setTimeout(f,0); }
}
/**
 * Nouvelle note (ou texte libre) à une position du tableau.
 * @param {object} B - Page
 * @param {number} x @param {number} y - Position
 * @param {boolean} [libre] - true : texte libre, sans fond
 */
function capHomeBoardNote(B, x, y, libre){
  capHomeBoardAdd(B, {k:'txt', x:Math.max(0,x), y:Math.max(0,y), w:libre?200:220, h:libre?44:110, txt:'', col:_capHomeUi.col, libre:!!libre}, true);
}
/** Double-clic sur le tableau (outil Sélection) : nouvelle note ; sur un onglet de page : la renommer. @param {MouseEvent} e */
function capHomeBoardDbl(e){
  const W=capHomeWin(e.target);
  const bt=e.target.closest('[data-board]'); if(bt){ const B=_capHome.boards.find(b=>b.id===bt.dataset.board); const t=B&&W.prompt(_L('Nom de la page :'),B.titre); if(t!=null&&B){ B.titre=t.trim(); capHomeSave(); capHomeRender(); } return; }
  if(e.target.classList.contains('hm-wb-in')&&_capHomeUi.tool==='sel'){ const r=e.target.getBoundingClientRect();
    capHomeBoardNote(capHomeBoardOf(e.target), Math.round(e.clientX-r.left-20), Math.round(e.clientY-r.top-14)); }
}
/**
 * Clics propres au tableau blanc (pages, outils, couleurs, remplissage, fenêtre séparée, objets).
 * @param {MouseEvent} e
 * @returns {boolean} vrai si le clic a été traité
 */
function capHomeBoardClick(e){
  const t=e.target, u=_capHomeUi, W=capHomeWin(t);
  const bd=t.closest('[data-board]'); if(bd){ u.board=bd.dataset.board; capHomeRender(); return true; }
  const tl=t.closest('[data-tool]'); if(tl){ u.tool=tl.dataset.tool; capHomeRender(); return true; }
  const B=capHomeBoardOf(t), S=B&&B.items.find(x=>x.id===u.sel);
  const col=t.closest('[data-col]'); if(col){ u.col=col.dataset.col; if(S&&S.k!=='ref'){ S.col=u.col; capHomeSave(); } capHomeRender(); return true; }
  const a=t.closest('[data-a]'), act=a&&a.dataset.a, n=t.closest('[data-it]');
  switch(act){
    case 'pop-back': capHomePopClose(a.dataset.kind, a.dataset.id); return true;
    case 'b-new': { const b={id:capHomeUid(), titre:_L(`Page ${_capHome.boards.length+1}`), items:[]}; _capHome.boards.push(b); Object.assign(u,{board:b.id, tab:'board'}); break; }
    case 'b-add': { const b={id:capHomeUid(), titre:_L(`Page ${_capHome.boards.length+1}`), items:[]}; _capHome.boards.push(b); u.board=b.id; break; }
    case 'b-ren': { const v=B&&W.prompt(_L('Nom de la page :'),B.titre); if(v==null) return true; B.titre=v.trim(); break; }
    case 'b-del': if(B&&(!B.items.length||W.confirm(_L(`Supprimer la page « ${B.titre} » et ses ${B.items.length} objet(s) ?`)))){ capHomePopClose('board',B.id); _capHome.boards=_capHome.boards.filter(x=>x!==B); u.board=''; } else return true; break;
    case 'b-fill': u.fill=!u.fill; if(S&&S.k==='shape') S.fill=u.fill; break;
    case 'bi-del': if(B&&n){ B.items=B.items.filter(x=>x.id!==n.dataset.it); if(u.sel===n.dataset.it) u.sel=''; } break;
    case 'bi-flip': { const it=B&&n&&B.items.find(x=>x.id===n.dataset.it); if(it) it.inv=!it.inv; break; }
    default:
      if(t.classList&&t.classList.contains('hm-wb-in')&&u.sel){ u.sel=''; capHomeRender(); return true; }   // clic dans le vide : désélection
      return false;
  }
  capHomeSave(); capHomeRender(); return true;
}
/** Suppr / Retour arrière hors saisie : retire l'objet sélectionné du tableau blanc. @param {KeyboardEvent} e @returns {boolean} vrai si traité */
function capHomeBoardKey(e){
  if(!(e.key==='Delete'||e.key==='Backspace')||!_capHomeUi.sel) return false;
  const t=e.target; if(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return false;
  const B=_capHome.boards.find(b=>b.items.some(x=>x.id===_capHomeUi.sel)); if(!B) return false;
  const avant=B.items.length; B.items=B.items.filter(x=>x.id!==_capHomeUi.sel); if(B.items.length===avant) return false;
  e.preventDefault(); _capHomeUi.sel=''; capHomeSave(); capHomeRender(); return true;
}

/**
 * Tableau blanc, bouton de souris enfoncé : dessin avec l'outil choisi (dans le vide), redimensionnement d'une forme
 * (coin), déplacement d'un objet ; un clic sans déplacement sélectionne l'objet (une icône est aussi ouverte).
 * @param {PointerEvent} e
 */
function capHomeBoardDown(e){
  if(e.button!==0) return;
  const u=_capHomeUi, t=e.target, D=t.ownerDocument;
  // Dessin : outil autre que la sélection, dans le vide du tableau
  if(u.tool!=='sel'&&t.classList&&t.classList.contains('hm-wb-in')){
    e.preventDefault();
    const B=capHomeBoardOf(t), r=t.getBoundingClientRect(), x0=e.clientX-r.left, y0=e.clientY-r.top, outil=u.tool;
    if(outil==='note'||outil==='text'){ u.tool='sel'; capHomeBoardNote(B, Math.round(x0-10), Math.round(y0-10), outil==='text'); return; }
    const g=D.createElement('div'); g.className='hm-draw'; t.appendChild(g); t.setPointerCapture(e.pointerId);
    let x1=x0, y1=y0;
    const place=()=>{ Object.assign(g.style,{left:Math.min(x0,x1)+'px', top:Math.min(y0,y1)+'px', width:Math.abs(x1-x0)+'px', height:Math.abs(y1-y0)+'px'}); };
    const mv=ev=>{ x1=ev.clientX-r.left; y1=ev.clientY-r.top; if(ev.shiftKey&&(outil==='rect'||outil==='ellipse')){ const s=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); x1=x0+Math.sign(x1-x0||1)*s; y1=y0+Math.sign(y1-y0||1)*s; } place(); };
    const up=()=>{ t.removeEventListener('pointermove',mv); t.removeEventListener('pointerup',up); g.remove(); u.tool='sel';
      let w=Math.abs(x1-x0), h=Math.abs(y1-y0); const ligne=outil==='line'||outil==='arrow';
      if(w<6&&h<6){ w=ligne?140:140; h=ligne?0:90; x1=x0+w; y1=y0+h; }
      const it={k:'shape', f:outil, x:Math.round(Math.min(x0,x1)), y:Math.round(Math.min(y0,y1)), w:Math.round(Math.max(w,ligne?12:16)), h:Math.round(Math.max(h,ligne?12:16)), col:u.col, fill:u.fill, inv:(x1-x0)*(y1-y0)<0};
      if(ligne&&w<12){ it.x-=6; } if(ligne&&h<12){ it.y-=6; }
      capHomeBoardAdd(B, it); };
    t.addEventListener('pointermove',mv); t.addEventListener('pointerup',up);
    return;
  }
  // Redimensionnement d'une forme par son coin
  const rz=t.closest('[data-rz]');
  if(rz){ e.preventDefault(); e.stopPropagation();
    const n=rz.closest('.hm-it'), B=capHomeBoardOf(n), it=B.items.find(x=>x.id===n.dataset.it); if(!it) return;
    rz.setPointerCapture(e.pointerId); const x0=e.clientX, y0=e.clientY, w0=it.w, h0=it.h;
    const mv=ev=>{ it.w=Math.max(12,Math.round(w0+ev.clientX-x0)); it.h=Math.max(12,Math.round(h0+ev.clientY-y0));
      n.style.width=it.w+'px'; n.style.height=it.h+'px'; const s=n.querySelector('svg'); if(s) s.outerHTML=capHomeShapeSvg(it); };
    const up=()=>{ rz.removeEventListener('pointermove',mv); rz.removeEventListener('pointerup',up); capHomeSave(); capHomeRender(); };
    rz.addEventListener('pointermove',mv); rz.addEventListener('pointerup',up);
    return;
  }
  // Déplacement (poignée d'une note, forme, icône)
  const h=t.closest('[data-mv]'); if(!h||t.closest('[data-a]')) return;
  const n=h.closest('.hm-it'), B=capHomeBoardOf(n), it=B&&B.items.find(x=>x.id===n.dataset.it); if(!it) return;
  e.preventDefault(); h.setPointerCapture(e.pointerId);
  const x0=e.clientX, y0=e.clientY, ix=it.x, iy=it.y; let bouge=false;
  const mv=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!bouge&&Math.abs(dx)+Math.abs(dy)<4) return; bouge=true;
    n.classList.add('hm-moving'); n.style.left=Math.max(0,ix+dx)+'px'; n.style.top=Math.max(0,iy+dy)+'px'; };
  const up=ev=>{ h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); n.classList.remove('hm-moving');
    if(bouge){ it.x=Math.max(0,Math.round(ix+ev.clientX-x0)); it.y=Math.max(0,Math.round(iy+ev.clientY-y0)); B.items=B.items.filter(x=>x!==it).concat(it); u.sel=it.id; capHomeSave(); capHomeRender(); }
    else { u.sel=it.id; if(it.k==='ref') capHomeRefOpen(it.ref); capHomeRender(); } };
  h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up);
}

/* ── ⧉ Fenêtres séparées ───────────────────────────────────────────────── */

/** Fenêtres séparées ouvertes : « doc:id », « board:id » ou « dos:id » → fenêtre. */
const _capHomePops=new Map();
/**
 * Liste des objets d'un type de fenêtre séparée.
 * @param {string} kind - 'doc' (check-list, plan) | 'board' (tableau blanc) | 'dos' (dossier de relecture)
 * @returns {object[]}
 */
function capHomePopListe(kind){ return kind==='doc'?_capHome.docs:kind==='dos'?_capHome.dossiers:_capHome.boards; }
/**
 * Fenêtre séparée ouverte pour une check-list (doc) ou un tableau blanc (board).
 * @param {string} kind - 'doc' | 'board'
 * @param {string} id - Identifiant
 * @returns {Window|null}
 */
function capHomePopWin(kind, id){ const w=_capHomePops.get(kind+':'+id); return w&&!w.closed?w:null; }
/** @returns {Document[]} documents des fenêtres séparées ouvertes */
function capHomePopDocs(){ return [..._capHomePops.values()].filter(w=>w&&!w.closed).map(w=>w.document); }
/** Ferme la fenêtre séparée d'une check-list ou d'un tableau blanc. @param {string} kind @param {string} id */
function capHomePopClose(kind, id){ const w=capHomePopWin(kind,id); if(w) w.close(); _capHomePops.delete(kind+':'+id); }
/**
 * Rappel affiché dans la vue quand une check-list ou un tableau blanc est ouvert dans sa fenêtre.
 * @param {string} kind - 'doc' | 'board'
 * @param {object} o - Document ou page
 * @returns {string} HTML
 */
function capHomePopPlace(kind, o){
  return `<div class="hm-doc hm-pop-place"><div class="hm-empty">${_L(`⧉ « ${capEsc(o.titre||'')} » est ouvert dans une fenêtre séparée.`)}<br><br>`+
    `<button class="cap-lf-btn" data-a="pop" data-kind="${kind}" data-id="${o.id}">${_L('⧉ Afficher la fenêtre')}</button> `+
    `<button class="cap-lf-btn" data-a="pop-back" data-kind="${kind}" data-id="${o.id}">${_L('⧈ Ramener ici')}</button></div></div>`;
}
/**
 * ⧉ Ouvre une check-list, un plan de revue ou un tableau blanc dans une fenêtre séparée (même script, mêmes données).
 * Les diagrammes et éléments peuvent y être glissés depuis les vues de la page (🔲, 🧭, ⚡).
 * @param {string} kind - 'doc' | 'board'
 * @param {string} id - Identifiant
 */
function capHomePopOpen(kind, id){
  const w0=capHomePopWin(kind,id); if(w0){ w0.focus(); return; }
  const o=capHomePopListe(kind).find(x=>x.id===id); if(!o) return;
  const w=window.open('', 'arcalyse-'+kind+'-'+id, kind==='board'?'width=1250,height=860':kind==='dos'?'width=1150,height=900':'width=860,height=900');
  if(!w){ alert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
  const D=w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="hm-pop-body"><div class="hm-pop"></div></body></html>'); D.close();
  document.querySelectorAll('style').forEach(st=>D.head.appendChild(D.importNode(st,true)));
  capRevPopTheme(w);
  _capHomePops.set(kind+':'+id, w);
  capHomeWire(D.querySelector('.hm-pop'));
  w.addEventListener('pagehide',()=>{ _capHomePops.delete(kind+':'+id); setTimeout(capHomeRender,0); });
  w.addEventListener('keydown',e=>{ if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); } else capHomeBoardKey(e); });
  capHomeRender();
}
/** Réaffiche le contenu des fenêtres séparées ouvertes (ferme celles dont la check-list ou la page a été supprimée). */
function capHomePopsRender(){
  _capHomePops.forEach((w,key)=>{
    if(!w||w.closed){ _capHomePops.delete(key); return; }
    const [kind,id]=key.split(':'), o=capHomePopListe(kind).find(x=>x.id===id), host=w.document.querySelector('.hm-pop');
    if(!o||!host){ w.close(); _capHomePops.delete(key); return; }
    w.document.title=(kind==='doc'?(o.kind==='plan'?'📋 ':'☑ '):kind==='dos'?'📑 ':'🧾 ')+(o.titre||'')+' — Arcalyse';
    const pos=capHomeScrollGet(host);
    const corps=kind==='doc'?`<div class="hm-main"><div class="hm-doc" data-docid="${id}">${capHomeDocHtml(o)}</div></div>`
      :kind==='dos'?`<div class="hm-main"><div class="hm-doc dos-ed" data-dosid="${id}">${capDosHtml(o)}</div></div>`:capHomeBoardHtml(o,true);
    host.innerHTML=`<div class="hm-body">${corps}${capHomePaletteHtml()}</div>`;
    capHomeScrollSet(host, pos);
    if(kind==='board') capHomeBoardAfter(host);
  });
}

/* ── Glisser-déposer depuis les vues de la page ─────────────────────────── */

/** Éléments des vues qui peuvent être glissés vers une check-list ou un tableau blanc. */
const CAP_HOME_SOURCES='#cdg-gauche .cdg-it[data-uid], #cap-view-cards .cap-card, #cap-view-tree .cap-tree-row[data-id], #cap-view-chains .ccm-item[data-id], #cap-view-chains .cap-chain-hdr';
/**
 * Référence portée par un élément glissable d'une vue (diagramme de la liste, élément de l'Explorateur, chaîne).
 * @param {Element} n - Élément (CAP_HOME_SOURCES)
 * @returns {object|null} référence
 */
function capHomeDragRef(n){
  if(n.matches('.cdg-it')){ const r=capDiagReps().find(x=>x.uid===n.dataset.uid); return r?capHomeRefDiag(r):null; }
  if(n.matches('.cap-chain-hdr')){ const c=n.closest('[data-chain]'); return c?capHomeRefEl(c.dataset.chain):null; }
  if(n.dataset.id) return capHomeRefEl(n.dataset.id);
  const e=typeof capRevElementAt==='function'&&capRevElementAt(n); return e?capHomeRefEl(e.id):null;
}

// Câblage : sources de glisser-déposer, fermeture des fenêtres avec la page, thème recopié, Suppr dans la vue
(function(){
  document.addEventListener('mousedown',e=>{ const n=e.target.closest&&e.target.closest(CAP_HOME_SOURCES); if(n&&!n.draggable) n.draggable=true; },true);
  document.addEventListener('dragstart',e=>{
    if(!e.dataTransfer||[...e.dataTransfer.types].includes(CAP_HOME_DND)) return;
    const n=e.target.closest&&e.target.closest(CAP_HOME_SOURCES); if(!n) return;
    const ref=capHomeDragRef(n); if(!ref) return;
    e.dataTransfer.setData(CAP_HOME_DND, JSON.stringify(ref)); e.dataTransfer.setData('text/plain', ref.nom||''); e.dataTransfer.effectAllowed='copy';
  });
  document.addEventListener('keydown',e=>{ if(capCurrentView==='home'&&currentMode==='capella'&&_capHomeUi.tab==='board') capHomeBoardKey(e); });
  window.addEventListener('pagehide',()=>_capHomePops.forEach(w=>{ try{ w.close(); }catch(_){} }));
  new MutationObserver(()=>_capHomePops.forEach(w=>{ if(w&&!w.closed) capRevPopTheme(w); })).observe(document.documentElement,{attributes:true, attributeFilter:['data-theme','data-tone','style']});
})();
