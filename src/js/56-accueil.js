/* ═══════════════════════════════════════════════════════════════════════
   🏠 ACCUEIL — page d'accueil du projet (vue affichée à l'ouverture d'un modèle ou d'un projet)
   ───────────────────────────────────────────────────────────────────────
   Trois onglets :
   • 🏠 Projet : accès rapide aux vues, puis six cartes sur deux lignes, réorganisables (⚙ Disposer : ordre par
     glisser-déposer, largeur, cartes masquées) — projet (fichiers, version de Capella, diagrammes, mises à jour),
     fiche projet modifiable, raccourcis des check-lists et des tableaux blancs, contenu du modèle, revue ;
   • ☑ Check-lists & plans de revue : listes « Nouvelle check-list » et « Nouveau plan de revue » (vide ou modèle
     ARCADIA), import .json ; listes à cocher par sections, points liés à des diagrammes ou des éléments (glisser-déposer depuis la palette 📎) ; plans
     de revue (objet, jalon, participants, périmètre, critères d'entrée, points de contrôle, critères de sortie,
     actions) ; export HTML imprimable, .json réutilisable ;
   • 🧾 Tableaux blancs (60-accueil-tableau-blanc.js) : notes, texte, formes, diagrammes et éléments en icônes cliquables.
   Check-lists, plans et tableaux blancs s'ouvrent aussi dans une fenêtre séparée (⧉, 60).
   Stockage : bloc JSON « cap-home » de la page (repris par la 💾 Page HTML et par 📄 Ouvrir un projet de travail).
   ═══════════════════════════════════════════════════════════════════════ */

/** Données de l'accueil : fiche projet, check-lists et plans de revue (docs), tableaux blancs (boards). */
var _capHome = capHomeNorm((()=>{ try{ const el=document.getElementById('cap-home'); return el?JSON.parse(el.textContent):null; }catch(e){ return null; } })());
/** État de l'affichage (non enregistré) : onglet, document et page de tableau blanc ouverts, recherche de la palette,
 * outil, couleur, remplissage et objet sélectionné du tableau blanc, constats dépliés, disposition des cartes en cours. */
const _capHomeUi = { tab:'projet', doc:'', board:'', q:'', tool:'sel', col:'#e3b341', fill:false, sel:'', notes:new Set(), dispo:false };
/** Type de données glissées (référence vers un diagramme ou un élément). */
const CAP_HOME_DND='application/x-arcalyse-ref';
/** Couleurs proposées pour les notes du tableau blanc. */
const CAP_HOME_COULEURS=['#e3b341','#58a6ff','#3fb950','#f0883e','#a78bfa','#f85149'];

/**
 * Complète des données d'accueil (lues dans la page ou un fichier) avec les valeurs par défaut.
 * @param {object} [d] - Données lues
 * @returns {object} {v, fiche, docs, boards, cartes}
 */
function capHomeNorm(d){
  d=d||{};
  const docs=(Array.isArray(d.docs)?d.docs:[]).filter(x=>x&&x.id).map(x=>Object.assign({kind:'list', titre:'', head:{}, sections:[]}, x));
  docs.forEach(x=>{ x.head=x.head||{}; if(!Array.isArray(x.head.perim)) x.head.perim=[];
    x.sections=(x.sections||[]).map(s=>Object.assign({titre:'', items:[]}, s)); x.sections.forEach(s=>{ s.items=(s.items||[]).map(i=>Object.assign({txt:'', ok:false, refs:[]}, i)); }); });
  const boards=(Array.isArray(d.boards)?d.boards:[]).filter(b=>b&&b.id).map(b=>Object.assign({titre:'', items:[]}, b));
  const c=d.cartes||{};
  return { v:1, fiche:Object.assign({objet:'', phase:'', version:'', resp:'', equipe:'', notes:''}, d.fiche||{}), docs, boards, dossiers:capDosNorm(d.dossiers),
    cartes:{ordre:Array.isArray(c.ordre)?c.ordre:[], masques:Array.isArray(c.masques)?c.masques:[], larges:c.larges&&typeof c.larges==='object'?c.larges:{}},
    largeurs:d.largeurs&&typeof d.largeurs==='object'?d.largeurs:{}, sante:Array.isArray(d.sante)?d.sante:[], santeExclues:Array.isArray(d.santeExclues)?d.santeExclues:[], santeVuesMasquees:Array.isArray(d.santeVuesMasquees)?d.santeVuesMasquees:[] };   // sante : historique 💚, santeExclues : couches décochées (69)
}
/** Identifiant unique (point, section, document, note). @returns {string} */
function capHomeUid(){ return 'h'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/** Enregistre l'accueil dans la page (bloc JSON repris par la 💾 Page HTML). */
function capHomeSave(){
  let el=document.getElementById('cap-home');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-home'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(_capHome).replace(/</g,'\\u003c');
}
let _capHomeSaveT=0;
/** Enregistrement différé (saisie au clavier). */
function capHomeSaveLater(){ clearTimeout(_capHomeSaveT); _capHomeSaveT=setTimeout(capHomeSave,400); }
/**
 * Remplace les données de l'accueil (📄 Ouvrir un projet de travail) et réaffiche la vue si elle est ouverte.
 * @param {object} d - Données lues dans une page enregistrée
 */
function capHomeSetData(d){
  _capHomePops.forEach(w=>{ try{ w.close(); }catch(_){} }); _capHomePops.clear();
  _capHome=capHomeNorm(d); Object.assign(_capHomeUi,{doc:'', board:'', sel:''}); capHomeSave();
  if(capLoaded&&capCurrentView==='home') capRenderHome(document.getElementById('cap-view-home'));
}

/* ── Références : diagrammes et éléments glissés ───────────────────────── */

/**
 * Référence vers un élément du modèle.
 * @param {string} id - Élément
 * @returns {object|null} {k:'el', id, nom, type, couche}
 */
function capHomeRefEl(id){
  const e=capLoaded&&capGetElementById_(id); if(!e) return null;
  return {k:'el', id, nom:e.attrs.name||id, type:e.typeName, couche:e.layer||''};
}
/** Représentations du .aird chargé (la visionneuse est préparée si besoin). @returns {object[]} */
function capHomeReps(){
  if(!capLoaded||typeof _capDiag==='undefined'||!_capDiag.texteAird||!capDiagDispo()) return [];
  try{ capDiagEnsure(); if(!_capDiag.airdCharge||_capDiag.modele!==cap_xmlDoc) capDiagSync(); }catch(e){ console.error(e); return []; }
  return capDiagReps();
}
/**
 * Référence vers un diagramme.
 * @param {object} r - Représentation {uid, nom, type, sigle, couche}
 * @returns {object} {k:'diag', id, nom, type, couche, sigle}
 */
function capHomeRefDiag(r){ return {k:'diag', id:r.uid, nom:r.nom, type:r.type||'', couche:r.couche||'', sigle:r.sigle||''}; }
/** @param {object} ref @returns {boolean} vrai si la cible existe (élément du modèle, diagramme du .aird chargé) */
function capHomeRefOk(ref){ return ref.k==='diag'?capHomeReps().some(r=>r.uid===ref.id):!!(capLoaded&&capGetElementById_(ref.id)); }
/**
 * Icône d'une référence : dessin Capella de l'élément ou du diagramme.
 * @param {object} ref - Référence
 * @param {number} [t] - Taille en pixels
 * @returns {string} HTML
 */
function capHomeRefIco(ref, t){
  t=t||14;
  if(ref.k==='diag'){ const i=typeof capDiagIcones==='function'&&capHomeReps().length?capDiagIcones().get(ref.id):''; return i?`<span class="hm-dico" style="width:${t}px;height:${t}px">${i}</span>`:`<span style="font-size:${t-2}px">🔲</span>`; }
  return capIco(ref.id,t)||capIcoType(ref.type,t)||`<span style="font-size:${t-2}px">◆</span>`;
}
/** Nom affiché d'une référence (nom actuel dans le modèle si l'élément existe). @param {object} ref @returns {string} */
function capHomeRefNom(ref){ const e=ref.k==='el'&&capLoaded&&capGetElementById_(ref.id); return e?(e.attrs.name||ref.nom):ref.nom; }
/** Type lisible d'une référence. @param {object} ref @returns {string} */
function capHomeRefType(ref){ return ref.k==='diag'?(ref.sigle?ref.sigle+' · ':'')+(ref.type||_L('Diagramme')):((CAP_HUMAN_NAMES[ref.type]||{}).h||ref.type); }
/**
 * Pastille d'une référence (dans un point de check-list ou le périmètre d'un plan), cliquable, avec ✕ pour la retirer.
 * @param {object} ref - Référence
 * @param {string} rm - Valeur de data-rm (emplacement de la référence, pour la retirer)
 * @returns {string} HTML
 */
function capHomeChip(ref, rm){
  const ok=capHomeRefOk(ref), lv=CAP_LAYERS[ref.couche]||{color:'#8b949e'};
  return `<span class="hm-chip${ok?'':' hm-miss'}" data-go="${capEsc(JSON.stringify(ref))}" title="${capEsc(capHomeRefType(ref))}${ok?'':' — '+(ref.k==='diag'?_L('diagramme non chargé (.aird)'):_L('absent du modèle chargé'))}">`+
    `${capHomeRefIco(ref,13)}<span style="color:${lv.color};font-size:9px;font-weight:700">${capEsc(ref.couche||'')}</span> ${capEsc(capHomeRefNom(ref))}`+
    (rm?`<span class="hm-chip-x" data-rm="${rm}" title="${_L('Retirer')}">✕</span>`:'')+`</span>`;
}
/**
 * Ouvre la cible d'une référence : diagramme (🔲 Diagrammes Capella) ou panneau de détail de l'élément.
 * @param {object} ref - Référence
 */
function capHomeRefOpen(ref){
  if(ref.k==='diag'){
    if(capHomeReps().some(r=>r.uid===ref.id)){ capDiagOpen(ref.id); return; }
    capWatchFlash(_L(`🔲 « ${ref.nom} » : ouvrez le .aird du projet (🔲 Diagrammes Capella › 📂 Ouvrir le .aird) pour voir ce diagramme`)); return;
  }
  if(capLoaded&&capGetElementById_(ref.id)){ capOpenDetailById(ref.id); return; }
  capWatchFlash(_L(`« ${ref.nom} » n'existe plus dans le modèle chargé`));
}

/* ── Vue ───────────────────────────────────────────────────────────────── */

/**
 * Affiche la vue 🏠 Accueil (et rafraîchit les check-lists et tableaux blancs ouverts dans une fenêtre séparée).
 * @param {HTMLElement} box - Conteneur #cap-view-home
 */
function capRenderHome(box){
  if(!box) return;
  capHomeWire(box);
  const u=_capHomeUi, nd=_capHome.docs.length, nb=_capHome.boards.length;
  const tab=(k,l,t)=>`<button class="phl-toggle-btn${u.tab===k?' active':''}" data-tab="${k}" title="${t}">${l}</button>`;
  const pos=capHomeScrollGet(box), cle=u.tab+':'+(u.tab==='dos'?_capDosUi.cur:u.tab==='docs'?u.doc:u.board);
  let corps;
  if(u.tab==='docs') corps=capHomeDocsHtml()+capHomePaletteHtml();
  else if(u.tab==='board') corps=capHomeBoardHtml(capHomeCurBoard())+capHomePaletteHtml();
  else if(u.tab==='dos') corps=capDosOngletHtml()+capHomePaletteHtml();
  else corps=capHomeProjetHtml();
  box.innerHTML=`<div class="hm-bar"><span class="tb-grp">${tab('projet',_L('🏠 Projet'),_L('Informations du projet, fiche, contenu du modèle, revue, accès rapide'))}`+
    tab('docs',_L(`☑ Check-lists & plans de revue`)+(nd?` <span class="hm-n">${nd}</span>`:''),_L('Listes à cocher et plans de revue, liés à des diagrammes et des éléments'))+
    tab('board',_L(`🧾 Tableaux blancs`)+(nb?` <span class="hm-n">${nb}</span>`:''),_L('Pages libres : texte, formes, diagrammes et éléments en icônes cliquables'))+
    tab('dos',_L(`📑 Dossiers de relecture`)+(_capHome.dossiers.length?` <span class="hm-n">${_capHome.dossiers.length}</span>`:''),_L('Documents chapitrés à faire relire : descriptions, diagrammes, texte libre ; export HTML à commenter ou Word, réimport des retours'))+`</span>`+
    `<span class="hm-bar-t">${capEsc(capRevProjectName()||capCurrentFileName||'')}</span></div>`+
    `<div class="hm-body">${corps}</div>`;
  if(box._hmCle===cle) capHomeScrollSet(box, pos); box._hmCle=cle;   // même onglet, même document : on reste où l'on était
  if(typeof capNavSync==='function') capNavSync();
  if(u.tab==='board') capHomeBoardAfter(box);
}

/** Zones qui défilent dans l'accueil (vue ou fenêtre séparée) : page, liste de gauche, document ouvert. */
const CAP_HOME_SCROLLS=['.hm-main','.hm-docs','.hm-doc'];
/**
 * Positions de défilement des zones de l'accueil, avant un nouveau rendu.
 * @param {HTMLElement} box - Conteneur
 * @returns {number[]} positions (dans l'ordre de CAP_HOME_SCROLLS)
 */
function capHomeScrollGet(box){ return CAP_HOME_SCROLLS.map(s=>{ const n=box.querySelector(s); return n?n.scrollTop:0; }); }
/**
 * Rétablit les positions de défilement après un rendu (plier un chapitre, cocher une case… ne ramène plus en haut).
 * @param {HTMLElement} box - Conteneur
 * @param {number[]} pos - capHomeScrollGet
 */
function capHomeScrollSet(box, pos){ CAP_HOME_SCROLLS.forEach((s,i)=>{ const n=box.querySelector(s); if(n&&pos[i]) n.scrollTop=pos[i]; }); }

/* ── Onglet 🏠 Projet ──────────────────────────────────────────────────── */

/** @returns {string} version de Capella du modèle, lue dans les espaces de noms du fichier ('' si inconnue) */
function capHomeCapellaVersion(){
  const r=cap_xmlDoc&&cap_xmlDoc.documentElement; if(!r) return '';
  for(const a of r.attributes){ const m=/capella\/core\/[a-z]+\/(\d+\.\d+(?:\.\d+)?)/i.exec(a.value); if(m) return m[1]; }
  return '';
}
/**
 * Contenu du modèle par couche : nombre d'éléments et types principaux (hors types techniques et paquetages).
 * @returns {{k:string, n:number, types:Array<[string,number]>}[]} couches présentes
 */
function capHomeCouches(){
  const m={};
  capAllElements.forEach(e=>{ const k=e.layer||'Shared'; const c=m[k]||(m[k]={n:0, t:{}}); c.n++;
    if(!CAP_TECHNICAL_TYPES.has(e.typeName)&&!CAP_PKG_TYPES.has(e.typeName)) c.t[e.typeName]=(c.t[e.typeName]||0)+1; });
  return Object.keys(CAP_LAYERS).filter(k=>m[k]).map(k=>({k, n:m[k].n, types:Object.entries(m[k].t).sort((a,b)=>b[1]-a[1]).slice(0,5)}));
}
/** @param {object} d - Check-list ou plan @returns {{ok:number, n:number}} points cochés / points */
function capHomeProgress(d){ let ok=0, n=0; d.sections.forEach(s=>s.items.forEach(i=>{ n++; if(i.ok) ok++; })); return {ok, n}; }
/** Barre d'avancement. @param {{ok:number,n:number}} p @returns {string} HTML */
function capHomeBar(p){ const pc=p.n?Math.round(p.ok*100/p.n):0; return `<span class="hm-prog" title="${_L(`${p.ok} / ${p.n} point(s) cochés`)}"><span style="width:${pc}%"></span></span><span class="hm-prog-t">${p.ok}/${p.n}</span>`; }

/**
 * Cartes de l'onglet 🏠 Projet, dans l'ordre par défaut : k = clé, l = titre, w = largeur par défaut (1 ou 2 colonnes),
 * f = contenu HTML.
 * @returns {{k:string, l:string, w:number, f:function():string}[]}
 */
function capHomeCartes(){
  const esc=capEsc, F=_capHome.fiche, lig=(k,v)=>v?`<tr><td class="ana-dim">${k}</td><td>${v}</td></tr>`:'';
  const pop=(kind,id)=>`<span class="hm-pop-b" data-a="pop" data-kind="${kind}" data-id="${id}" title="${_L('Ouvrir dans une fenêtre séparée (par exemple sur un autre écran)')}">⧉</span>`;
  return [
  {k:'projet', l:_L('🔷 Projet'), w:1, f:()=>{ const reps=capHomeReps(), H=typeof _capWatch!=='undefined'?_capWatch.history:[];
    const par={}; reps.forEach(r=>{ par[r.couche||'—']=(par[r.couche||'—']||0)+1; });
    const diag=_capDiag&&_capDiag.texteAird?`<a href="#" class="hm-lien" data-nav="diag" title="${_L('🔲 Ouvrir les diagrammes')}">${esc(_capDiag.nomAird)}</a>`+(reps.length?' · '+_L(`${reps.length} diagramme(s)`)+
        `<div class="hm-chips">${Object.entries(par).sort((a,b)=>capDiagRang(a[0])-capDiagRang(b[0])).map(([k,n])=>`<span class="hm-stat" style="color:${capDiagCouche(k).color}"><b>${esc(k)}</b> ${n}</span>`).join('')}</div>`:'')
      :`<span class="ana-dim">${_L('aucun .aird chargé')}</span> <button class="cap-lf-btn" data-a="aird">${_L('📂 Ouvrir le .aird…')}</button>`;
    const maj=(H.length?`${capWatchDate(H[0].at)} ${capWatchChips(H[0].counts)||_L('aucune différence')}${H.length>1?` <span class="ana-dim">${_L(`(${H.length} dans la session)`)}</span>`:''}`:`<span class="ana-dim">${_L('aucune depuis l\'ouverture')}</span>`)+
      ` <button class="cap-lf-btn" data-a="update" title="${_L('Compare un autre fichier .capella au modèle affiché, montre le delta, puis met à jour après validation')}">🔄</button>`;
    return `<table class="hm-kv">`+lig(_L('Projet Capella'),`<b>${esc(capRevProjectName()||'—')}</b>`)+lig(_L('Modèle'),esc(capCurrentFileName||'—'))+
    lig(_L('Version de Capella'),esc(capHomeCapellaVersion()))+lig(_L('Diagrammes'),diag)+lig(_L('Éléments'),String(capAllElements.length))+
    lig(_L('Mise à jour'),maj)+lig(_L('Page de projet'),typeof _capProjetPage!=='undefined'&&_capProjetPage.nom?esc(_capProjetPage.nom):'')+lig(_L('Arcalyse'),esc(CAP_APP_VERSION))+`</table>`; }},
  {k:'fiche', l:_L('📝 Fiche projet'), w:2, f:()=>{
    const champ=(k,l,ph,ta)=>`<label class="hm-f"><span>${l}</span>${ta?`<textarea data-ff="${k}" rows="3" placeholder="${ph}">${esc(F[k])}</textarea>`:`<input data-ff="${k}" value="${esc(F[k])}" placeholder="${ph}">`}</label>`;
    return champ('objet',_L('Objet'),_L('Système étudié, but du modèle'),true)+
      `<div class="hm-f2">${champ('phase',_L('Phase / jalon'),_L('ex. SRR, PDR, CDR'))}${champ('version',_L('Version du modèle'),_L('ex. V1.2'))}</div>`+
      `<div class="hm-f2">${champ('resp',_L('Responsable'),_L('Nom'))}${champ('equipe',_L('Équipe'),_L('Noms, rôles'))}</div>`+
      champ('notes',_L('Notes'),_L('Hypothèses, liens, informations utiles…'),true); }},
  {k:'docs', l:_L('☑ Check-lists & plans de revue'), w:1, f:()=>(_capHome.docs.length?`<div class="hm-dl">${_capHome.docs.map(d=>`<div class="hm-dl-i" data-doc="${d.id}"><span>${d.kind==='plan'?'📋':'☑'} ${esc(d.titre||_L('(sans titre)'))}${d.kind==='plan'&&d.head.date?` <span class="ana-dim">${esc(capRevDate(d.head.date))}</span>`:''}</span>${capHomeBar(capHomeProgress(d))}${pop('doc',d.id)}</div>`).join('')}</div>`
      :`<div class="ana-dim">${_L('Aucune check-list ni plan de revue.')}</div>`)+
    `<div class="hm-row"><button class="cap-lf-btn" data-a="quick" title="${_L('Crée une check-list vide et place le curseur sur le premier point')}">${_L('⚡ Check-list rapide')}</button><button class="cap-lf-btn" data-a="go-docs" title="${_L('Nouvelle check-list à partir d\'un modèle, nouveau plan de revue')}">${_L('☑ Modèles et plans de revue')}</button></div>`},
  {k:'boards', l:_L('🧾 Tableaux blancs'), w:1, f:()=>(_capHome.boards.length?`<div class="hm-dl">${_capHome.boards.map(b=>`<div class="hm-dl-i" data-board-open="${b.id}"><span>🧾 ${esc(b.titre||_L('(sans titre)'))} <span class="ana-dim">${_L(`${b.items.length} objet(s)`)}</span></span>${pop('board',b.id)}</div>`).join('')}</div>`
      :`<div class="ana-dim">${_L('Aucun tableau blanc.')}</div>`)+
    `<div class="hm-row"><button class="cap-lf-btn" data-a="b-new">${_L('✚ Nouveau tableau blanc')}</button></div>`},
  {k:'contenu', l:_L('🧩 Contenu du modèle'), w:2, f:()=>`<div class="hm-layers">${capHomeCouches().map(c=>{ const lv=CAP_LAYERS[c.k];
    return `<div class="hm-layer" style="--hm-c:${lv.color}"><div class="hm-layer-h"><b style="color:${lv.color}">${c.k}</b> <span class="ana-dim">${esc(lv.label)}</span><span style="flex:1"></span><b>${c.n}</b></div>`+
      c.types.map(([t,n])=>`<div class="hm-layer-t"><span>${capIcoType(t,12)} ${esc((CAP_HUMAN_NAMES[t]||{}).h||t)}</span><span>${n}</span></div>`).join('')+`</div>`; }).join('')}</div>`},
  {k:'sante', l:_L('💚 Santé du modèle'), w:1, f:()=>capSanteCarte()},   // 69-sante-modele.js
  {k:'revue', l:_L('💬 Revue'), w:1, f:()=>{ const cs=_capRev.comments, ouv=cs.filter(c=>!capRevClosed(c)), chk=capRevToCheck().length, late=cs.filter(capRevLate).length;
    return (cs.length?`<div class="hm-chips"><span class="hm-stat"><b>${ouv.length}</b> ${_L('non clos')}</span>`+
      capRevCrits().filter(c=>c.k).map(c=>{ const n=ouv.filter(x=>x.crit===c.k).length; return n?`<span class="hm-stat" style="color:${capTextOn(c.c)}"><b>${n}</b> ${c.l}</span>`:''; }).join('')+
      (chk?`<span class="hm-stat" style="color:var(--c-warn,#e3b341)"><b>${chk}</b> ${_L('à vérifier')}</span>`:'')+(late?`<span class="hm-stat" style="color:var(--c-err,#f85149)"><b>${late}</b> ${_L('en retard')}</span>`:'')+
      `<span class="hm-stat ana-dim">${_L(`${cs.length} au total`)}</span></div>`:`<div class="ana-dim">${_L('Aucun commentaire de revue.')}</div>`)+
      `<div class="hm-row"><button class="cap-lf-btn" data-a="rev">${_L('💬 Ouvrir la revue')}</button>${cs.length?`<button class="cap-lf-btn" data-a="rev-cible" title="${_L('Page HTML à envoyer aux relecteurs : ils répondent aux commentaires choisis, puis leurs réponses sont réimportées ici')}">${_L('📤 Faire relire des commentaires…')}</button>`:''}<button class="cap-lf-btn" data-a="go-dos" title="${_L('Document chapitré à faire relire : descriptions, diagrammes, texte libre ; export HTML à commenter ou Word')}">${_L('📑 Dossiers de relecture')}</button></div>`; }} ];
}
/** @returns {string[]} clés des cartes affichées, dans l'ordre choisi (cartes nouvelles ajoutées à la fin) */
function capHomeCartesOrdre(){
  const C=_capHome.cartes, ks=capHomeCartes().map(c=>c.k);
  return [...C.ordre.filter(k=>ks.includes(k)), ...ks.filter(k=>!C.ordre.includes(k))].filter(k=>!C.masques.includes(k));
}

/** Onglet 🏠 Projet : cartes (ordre, largeur et cartes masquées réglables par ⚙ Disposer). @returns {string} HTML */
function capHomeProjetHtml(){
  const u=_capHomeUi, C=_capHome.cartes, all=capHomeCartes(), esc=capEsc;
  const nav=k=>{ const it=CAP_NAV_ITEMS.find(i=>i.k===k); return it?`<button class="cap-lf-btn" data-nav="${k}" title="${it.t||''}">${it.l}</button>`:''; };
  let bar=`<div class="hm-dispo"><span class="hm-quick" title="${_L('Accès rapide aux vues')}">${['diag','table','tree','chains','functions','fex','csys','cblk','scen','ana:trace','ana:diff','dashboard'].map(nav).join('')}</span>`+
    `<span style="flex:1"></span><button class="cap-lf-btn${u.dispo?' active':''}" data-a="dispo" title="${_L('Réorganiser la page : glisser les cartes, largeur, cartes masquées')}">${u.dispo?_L('✔ Terminer la disposition'):_L('⚙ Disposer les cartes')}</button>`;
  if(u.dispo) bar+=`</div><div class="hm-dispo"><span class="hm-drop-hint">${_L('Glissez une carte par ⠿ sur une autre pour la placer avant elle ; ⇔ largeur ; ✕ masquer.')}</span>`+
    (C.masques.length?`<span class="ana-dim">${_L('Masquées :')}</span>`+C.masques.map(k=>{ const c=all.find(x=>x.k===k); return c?`<button class="cap-lf-btn" data-a="carte-show" data-k="${k}">＋ ${c.l}</button>`:''; }).join(''):'')+
    `<button class="cap-lf-btn" data-a="cartes-reset">${_L('↺ Disposition par défaut')}</button>`;
  bar+=`</div>`;
  const h=capHomeCartesOrdre().map(k=>{ const c=all.find(x=>x.k===k), w=C.larges[k]||c.w;
    let corps=''; try{ corps=c.f(); }catch(e){ console.error(e); corps=`<div class="ana-dim">${esc(e.message)}</div>`; }
    return `<section class="hm-card${u.dispo?' hm-card-dispo':''}" data-carte="${k}" style="grid-column:span ${w}"${u.dispo?' draggable="true"':''}>`+
      `<h3>${u.dispo?`<span class="hm-grip" title="${_L('Glisser pour déplacer')}">⠿</span>`:''}${c.l}`+
      (u.dispo?`<span style="flex:1"></span><span class="hm-cb" data-a="carte-wide" data-k="${k}" title="${_L('Largeur : 1 ou 2 colonnes')}">⇔</span><span class="hm-cb" data-a="carte-hide" data-k="${k}" title="${_L('Masquer la carte')}">✕</span>`:'')+`</h3>${corps}</section>`; }).join('');
  return `<div class="hm-main">${bar}<div class="hm-grid">${h}</div></div>`;
}

/* ── Onglet ☑ Check-lists & plans de revue ─────────────────────────────── */

/**
 * Modèles de check-lists (ARCADIA) : sections et points proposés.
 * @returns {{k:string, l:string, s:Array<[string,string[]]>}[]}
 */
function capHomeModeles(){ return [
  {k:'vide', l:_L('☐ Check-list vide'), s:[[_L('Points'),[]]]},
  {k:'qualite', l:_L('✔ Qualité du modèle'), s:[
    [_L('Nommage et descriptions'),[_L('Les fonctions sont nommées par un verbe à l\'infinitif + complément'),_L('Pas de doublon de nom dans une même couche'),_L('Les éléments principaux ont une description')]],
    [_L('Fonctions et échanges'),[_L('Chaque fonction feuille est allouée à un composant ou un acteur'),_L('Aucune fonction isolée (sans échange)'),_L('Les échanges fonctionnels relient des ports de fonctions')]],
    [_L('Composants et interfaces'),[_L('Les échanges de composants portent des échanges fonctionnels'),_L('Les ports de composants sont orientés (IN / OUT / INOUT)'),_L('Les interfaces et les Exchange Items sont définis')]],
    [_L('Traçabilité'),[_L('Les fonctions réalisent celles de la couche supérieure'),_L('Chaque capacité est couverte par des chaînes fonctionnelles ou des scénarios'),_L('Les exigences sont tracées vers le modèle')]] ]},
  {k:'oa', l:_L('🟦 Revue OA (analyse opérationnelle)'), s:[
    [_L('Points de contrôle OA'),[_L('Entités et acteurs opérationnels identifiés'),_L('Capacités opérationnelles décrites'),_L('Activités opérationnelles allouées aux entités'),_L('Interactions entre activités définies'),_L('Processus et scénarios opérationnels couvrant les capacités')]] ]},
  {k:'sa', l:_L('🟩 Revue SA (analyse système)'), s:[
    [_L('Points de contrôle SA'),[_L('Missions et capacités du système définies'),_L('Acteurs externes identifiés'),_L('Fonctions système allouées au système ou aux acteurs'),_L('Échanges fonctionnels avec les acteurs'),_L('Chaînes fonctionnelles ou scénarios par capacité'),_L('Modes et états du système'),_L('Exigences système tracées'),_L('Traçabilité OA → SA')]] ]},
  {k:'la', l:_L('🟨 Revue LA (architecture logique)'), s:[
    [_L('Points de contrôle LA'),[_L('Décomposition en composants logiques justifiée'),_L('Fonctions logiques allouées aux composants'),_L('Ports et échanges de composants'),_L('Interfaces entre composants définies'),_L('Scénarios d\'échanges'),_L('Traçabilité SA → LA')]] ]},
  {k:'pa', l:_L('🟧 Revue PA (architecture physique)'), s:[
    [_L('Points de contrôle PA'),[_L('Composants physiques de comportement et nœuds'),_L('Déploiement des composants de comportement sur les nœuds'),_L('Liens physiques et chemins physiques'),_L('Échanges de composants alloués aux liens physiques'),_L('Propriétés (PVMT) : masse, puissance, coûts…'),_L('Traçabilité LA → PA')]] ]} ]; }

/**
 * Crée une check-list ou un plan de revue et l'ouvre.
 * @param {'list'|'plan'} kind - Check-list ou plan de revue
 * @param {string} mk - Modèle (capHomeModeles) : points proposés (points de contrôle pour un plan)
 * @returns {object} document créé
 */
function capHomeNewDoc(kind, mk){
  const M=capHomeModeles().find(x=>x.k===mk)||capHomeModeles()[0];
  const sec=(t,items)=>({id:capHomeUid(), titre:t, items:items.map(x=>({id:capHomeUid(), txt:x, ok:false, refs:[]}))});
  let d;
  if(kind==='plan'){
    const pts=M.k==='vide'?[]:[].concat(...M.s.map(s=>s[1]));
    d={id:capHomeUid(), kind:'plan', titre:_L('Plan de revue')+(M.k!=='vide'?' — '+M.l.replace(/^\S+\s/,''):''), created:new Date().toISOString(),
      head:{objet:'', jalon:'', date:'', lieu:'', anim:_capRev.me||'', participants:'', docs:'', statut:'prep', decision:'', perim:[]},
      sections:[sec(_L('1. Critères d\'entrée'),[_L('Version du modèle figée et diffusée aux relecteurs'),_L('Contrôles automatiques passés (ƒ Fonctions › Contrôles, qualité des noms)'),_L('Commentaires de la revue précédente traités')]),
        sec(_L('2. Points de contrôle'),pts),
        sec(_L('3. Critères de sortie'),[_L('Aucun commentaire bloquant ouvert'),_L('Commentaires majeurs traités ou planifiés'),_L('Décision de revue prononcée et diffusée')]),
        sec(_L('4. Actions et décisions'),[])]};
  } else d={id:capHomeUid(), kind:'list', titre:M.k==='vide'?_L('Nouvelle check-list'):M.l.replace(/^\S+\s/,''), created:new Date().toISOString(), head:{perim:[]}, sections:M.s.map(s=>sec(s[0],s[1].length?s[1]:['']))};
  _capHome.docs.push(d); _capHomeUi.doc=d.id; capHomeSave();
  return d;
}

/**
 * ⚡ Check-list rapide : une section, un point par ligne (au moins un point vide), puis ouverture.
 * @param {string} [titre] - Titre ('' : « Check-list du <date> »)
 * @param {string} [lignes] - Points, un par ligne
 * @returns {object} check-list créée
 */
function capHomeQuickDoc(titre, lignes){
  const pts=String(lignes||'').split(/\r?\n/).map(s=>s.replace(/^\s*(?:[-*•☐☑✔]|\d+[.)])\s*/,'').trim()).filter(Boolean);
  const d={id:capHomeUid(), kind:'list', titre:(titre||'').trim()||_L(`Check-list du ${new Date().toLocaleDateString('fr-FR')}`), created:new Date().toISOString(), head:{perim:[]},
    sections:[{id:capHomeUid(), titre:_L('Points'), items:(pts.length?pts:['']).map(x=>({id:capHomeUid(), txt:x, ok:false, refs:[]}))}]};
  _capHome.docs.push(d); Object.assign(_capHomeUi,{doc:d.id, tab:'docs'}); capHomeSave();
  return d;
}

/** Onglet ☑ Check-lists & plans de revue : création (listes « Nouvelle check-list », « Nouveau plan de revue »), import,
 * liste des documents, document ouvert. @returns {string} HTML */
function capHomeDocsHtml(){
  const u=_capHomeUi, esc=capEsc, M=capHomeModeles(), nom=m=>m.l.replace(/^\S+\s/,'');
  if(!_capHome.docs.some(d=>d.id===u.doc)) u.doc=_capHome.docs.length?_capHome.docs[0].id:'';
  const liste=`<aside class="hm-docs"${capHomeLargeur('docs')}><div class="hm-docs-new">`+
    `<label class="hm-new-l">${_L('☑ Nouvelle check-list')}<select data-new="list" title="${_L('Crée une check-list : vide (à remplir) ou à partir d\'un modèle ARCADIA')}">`+
      `<option value="" selected disabled>${_L('Choisir un modèle…')}</option>${M.map(m=>`<option value="${m.k}">${m.k==='vide'?_L('Vide (à remplir)'):esc(nom(m))}</option>`).join('')}</select></label>`+
    `<label class="hm-new-l">${_L('📋 Nouveau plan de revue')}<select data-new="plan" title="${_L('Crée un plan de revue : objet, jalon, participants, périmètre, critères d\'entrée et de sortie, points de contrôle, actions')}">`+
      `<option value="" selected disabled>${_L('Choisir les points de contrôle…')}</option>${M.map(m=>`<option value="${m.k}">${m.k==='vide'?_L('Plan vide (points à écrire)'):esc(nom(m))}</option>`).join('')}</select></label>`+
    `<button class="cap-lf-btn" data-a="doc-import" title="${_L('Importer une check-list ou un plan enregistré en .json (autre projet)')}">${_L('📂 Importer…')}</button></div>`+
    (_capHome.docs.length?_capHome.docs.map(d=>`<div class="hm-docs-i${d.id===u.doc?' on':''}" data-doc="${d.id}"><span class="hm-docs-n">${d.kind==='plan'?'📋':'☑'} ${esc(d.titre||_L('(sans titre)'))}</span>${capHomeBar(capHomeProgress(d))}`+
      `<span class="hm-pop-b" data-a="pop" data-kind="doc" data-id="${d.id}" title="${_L('Ouvrir dans une fenêtre séparée (par exemple sur un autre écran)')}">⧉</span></div>`).join('')
      :`<div class="hm-empty">${_L('Créez une check-list ou un plan de revue avec les listes ci-dessus.<br><br>Glissez ensuite des diagrammes et des éléments depuis la palette 📎 à droite sur les points.')}</div>`)+`</aside>`;
  const d=_capHome.docs.find(x=>x.id===u.doc);
  const main=d?(capHomePopWin('doc',d.id)?capHomePopPlace('doc',d):`<div class="hm-doc" data-docid="${d.id}">${capHomeDocHtml(d)}</div>`):'';
  return `<div class="hm-main hm-docs-w">${liste}${capHomeSplit('docs')}${main}</div>`;
}

/**
 * Document ouvert : en-tête (titre, avancement, actions), champs du plan de revue, sections et points.
 * @param {object} d - Check-list ou plan
 * @returns {string} HTML
 */
function capHomeDocHtml(d){
  const esc=capEsc, plan=d.kind==='plan', H=d.head, u=_capHomeUi;
  let h=`<div class="hm-doc-h"><span class="hm-kind">${plan?_L('📋 Plan de revue'):_L('☑ Check-list')}</span><input class="hm-doc-t" data-df="titre" value="${esc(d.titre)}" placeholder="${_L('Titre')}">${capHomeBar(capHomeProgress(d))}`+
    `<span class="tb-grp"><button class="cap-lf-btn" data-a="doc-html" title="${_L('Document HTML imprimable (points, cases, liens, commentaires de revue du périmètre)')}">${_L('⬇ HTML')}</button>`+
    `<button class="cap-lf-btn" data-a="doc-json" title="${_L('Enregistrer en .json pour le réutiliser dans un autre projet (📂 Importer…)')}">${_L('💾 .json')}</button>`+
    `<button class="cap-lf-btn" data-a="doc-dup" title="${_L('Dupliquer (cases décochées)')}">⧉</button><button class="cap-lf-btn" data-a="doc-del" title="${_L('Supprimer')}">🗑</button></span></div>`;
  if(plan){
    const f=(k,l,ph,type)=>`<label class="hm-f"><span>${l}</span><input data-hf="${k}"${type?` type="${type}"`:''} value="${esc(H[k]||'')}" placeholder="${ph||''}"></label>`;
    const sel=(k,l,opts)=>`<label class="hm-f"><span>${l}</span><select data-hf="${k}">${opts.map(([v,t])=>`<option value="${v}"${(H[k]||'')===v?' selected':''}>${t}</option>`).join('')}</select></label>`;
    const ids=capHomePerimIds(d), nc=_capRev.comments.filter(c=>!capRevClosed(c)&&capHomeComPerim(c,ids)).length;
    h+=`<div class="hm-plan">`+
      `<label class="hm-f hm-f-w"><span>${_L('Objet de la revue')}</span><textarea data-hf="objet" rows="2" placeholder="${_L('Ce qui est revu et pourquoi')}">${esc(H.objet||'')}</textarea></label>`+
      `<div class="hm-f4">${f('jalon',_L('Jalon / type'),_L('ex. PDR, revue interne'))}${f('date',_L('Date'),'','date')}${f('lieu',_L('Lieu / visio'),'')}${f('anim',_L('Animateur'),_L('Nom'))}</div>`+
      `<div class="hm-f4">${sel('statut',_L('Statut'),[['prep',_L('En préparation')],['cours',_L('En cours')],['fini',_L('Terminée')]])}`+
      sel('decision',_L('Décision'),[['',_L('—')],['ok',_L('Acceptée')],['res',_L('Acceptée avec réserves')],['ko',_L('Refusée')],['rep',_L('Reportée')]])+`</div>`+
      `<label class="hm-f hm-f-w"><span>${_L('Participants et rôles')}</span><textarea data-hf="participants" rows="2" placeholder="${_L('Un participant par ligne : nom — rôle (auteur, relecteur, expert, décideur…)')}">${esc(H.participants||'')}</textarea></label>`+
      `<label class="hm-f hm-f-w"><span>${_L('Documents de référence')}</span><input data-hf="docs" value="${esc(H.docs||'')}" placeholder="${_L('Spécifications, exigences, versions…')}"></label>`+
      `<div class="hm-f hm-f-w"><span>${_L('Périmètre : diagrammes et éléments revus')}</span><div class="hm-drop hm-perim" data-drop="perim">${H.perim.map((r,i)=>capHomeChip(r,'p:'+i)).join('')}`+
      `<span class="hm-drop-hint">${_L('Glissez ici des diagrammes et des éléments (palette 📎)')}</span></div></div>`+
      `<div class="hm-row"><span class="ana-dim">${_L(`💬 ${nc} commentaire(s) non clos sur le périmètre`)}</span>`+
      `<button class="cap-lf-btn" data-a="doc-revue" title="${_L('Page HTML à envoyer aux relecteurs, avec les commentaires de revue du périmètre ; leurs réponses se réimportent dans 💬 Revue')}">${_L('📤 Faire relire les commentaires du périmètre…')}</button>`+
      `<button class="cap-lf-btn" data-a="doc-dos" title="${_L('Nouveau dossier de relecture : un chapitre par élément ou diagramme du périmètre (description, diagrammes)')}">${_L('📑 Dossier de relecture du périmètre')}</button></div></div>`;
  }
  d.sections.forEach((s,si)=>{
    const p={ok:s.items.filter(i=>i.ok).length, n:s.items.length};
    h+=`<div class="hm-sec" data-s="${s.id}"><div class="hm-sec-h"><input class="hm-sec-t" data-sf="titre" value="${esc(s.titre)}" placeholder="${_L('Section')}"><span class="hm-prog-t">${p.ok}/${p.n}</span>`+
      `<span class="hm-acts"><span data-a="sec-up" title="${_L('Monter')}">↑</span><span data-a="sec-down" title="${_L('Descendre')}">↓</span><span data-a="sec-del" title="${_L('Supprimer la section')}">🗑</span></span></div>`;
    s.items.forEach(i=>{
      const nt=!!i.note||u.notes.has(i.id);
      h+=`<div class="hm-item${i.ok?' ok':''}" data-i="${i.id}" data-drop="item"><input type="checkbox" data-if="ok"${i.ok?' checked':''}>`+
        `<div class="hm-item-c"><div class="hm-item-l"><input class="hm-item-t" data-if="txt" value="${esc(i.txt)}" placeholder="${_L('Point à vérifier')}">`+
        `<input class="hm-item-q" data-if="qui" value="${esc(i.qui||'')}" placeholder="${_L('Qui')}" title="${_L('Responsable')}">`+
        (plan?`<input class="hm-item-d" type="date" data-if="due" value="${esc(i.due||'')}" title="${_L('Échéance')}">`:'')+
        `<span class="hm-acts"><span data-a="it-note" title="${_L('Constat, remarque')}"${i.note?' class="on"':''}>💬</span><span data-a="it-up" title="${_L('Monter')}">↑</span><span data-a="it-down" title="${_L('Descendre')}">↓</span><span data-a="it-del" title="${_L('Supprimer le point')}">🗑</span></span></div>`+
        (i.refs.length?`<div class="hm-chips">${i.refs.map((r,ri)=>capHomeChip(r,'i:'+ri)).join('')}</div>`:'')+
        (nt?`<textarea class="hm-item-n" data-if="note" rows="2" placeholder="${_L('Constat, remarque…')}">${esc(i.note||'')}</textarea>`:'')+`</div></div>`;
    });
    h+=`<div class="hm-sec-add" data-drop="sec"><button class="cap-lf-btn" data-a="it-add">${_L('✚ Point')}</button><span class="hm-drop-hint">${_L('ou glissez ici un diagramme ou un élément : nouveau point lié')}</span></div></div>`;
  });
  return h+`<div class="hm-row"><button class="cap-lf-btn" data-a="sec-add">${_L('✚ Section')}</button></div>`;
}
/**
 * Identifiants du périmètre d'un plan : éléments et diagrammes du périmètre et des points.
 * @param {object} d - Plan
 * @returns {{el:Set<string>, diag:Set<string>}}
 */
function capHomePerimIds(d){
  const r={el:new Set(), diag:new Set()}, add=x=>(x.k==='diag'?r.diag:r.el).add(x.id);
  d.head.perim.forEach(add); d.sections.forEach(s=>s.items.forEach(i=>i.refs.forEach(add)));
  return r;
}
/** @param {object} c - Commentaire de revue @param {{el:Set,diag:Set}} ids - Périmètre @returns {boolean} vrai si le commentaire porte sur le périmètre */
function capHomeComPerim(c, ids){ return (c.targets||[]).some(t=>ids.el.has(t.id))||!!(c.diag&&ids.diag.has(c.diag.uid)); }

/**
 * Document HTML imprimable d'une check-list ou d'un plan de revue.
 * @param {object} d - Document
 */
function capHomeDocExport(d){
  const esc=capEsc, H=d.head, plan=d.kind==='plan', p=capHomeProgress(d);
  const refs=l=>l.map(r=>`<span class="ref">${r.k==='diag'?'🔲':'◆'} ${esc(capHomeRefNom(r))} <i>${esc(capHomeRefType(r))}</i></span>`).join(' ');
  const opt=(k,v)=>({statut:{prep:_L('En préparation'),cours:_L('En cours'),fini:_L('Terminée')}, decision:{ok:_L('Acceptée'),res:_L('Acceptée avec réserves'),ko:_L('Refusée'),rep:_L('Reportée')}}[k]||{})[v]||'';
  let b=`<h1>${plan?'📋':'☑'} ${esc(d.titre||'')}</h1><div class="dim">${_L(`Projet : <b>${esc(capRevProjectName()||'—')}</b> · modèle ${esc(capCurrentFileName||'—')} · ${p.ok}/${p.n} point(s) cochés · édité le ${new Date().toLocaleString('fr-FR')}`)}</div>`;
  if(plan){
    const l=(k,v)=>v?`<tr><th>${k}</th><td>${v}</td></tr>`:'';
    b+=`<table class="kv">${l(_L('Objet'),esc(H.objet||'').replace(/\n/g,'<br>'))}${l(_L('Jalon / type'),esc(H.jalon||''))}${l(_L('Date'),esc(capRevDate(H.date)))}${l(_L('Lieu / visio'),esc(H.lieu||''))}`+
      `${l(_L('Animateur'),esc(H.anim||''))}${l(_L('Statut'),opt('statut',H.statut))}${l(_L('Décision'),opt('decision',H.decision))}${l(_L('Participants et rôles'),esc(H.participants||'').replace(/\n/g,'<br>'))}`+
      `${l(_L('Documents de référence'),esc(H.docs||''))}${l(_L('Périmètre'),refs(H.perim))}</table>`;
    const ids=capHomePerimIds(d), cs=_capRev.comments.filter(c=>capHomeComPerim(c,ids));
    if(cs.length) b+=`<h2>${_L('💬 Commentaires de revue sur le périmètre')}</h2><table><tr><th>${_L('N°')}</th><th>${_L('Statut')}</th><th>${_L('Criticité')}</th><th>${_L('Commentaire')}</th><th>${_L('Responsables')}</th></tr>`+
      cs.sort((a,b2)=>a.num-b2.num).map(c=>`<tr><td>#${c.num}</td><td>${capRevSt(c).i} ${capRevSt(c).l}</td><td>${c.crit?capRevCr(c).l:''}</td><td>${c.title?`<b>${esc(c.title)}</b><br>`:''}${esc(c.text||'')}</td><td>${esc((c.assignees||[]).join(', '))}</td></tr>`).join('')+`</table>`;
  }
  d.sections.forEach(s=>{
    b+=`<h2>${esc(s.titre||'')} <span class="dim">(${s.items.filter(i=>i.ok).length}/${s.items.length})</span></h2>`+(s.items.length?`<table><tr><th style="width:24px"></th><th>${_L('Point')}</th><th>${_L('Liens')}</th><th>${_L('Qui')}</th>${plan?`<th>${_L('Échéance')}</th>`:''}</tr>`+
      s.items.map(i=>`<tr><td class="ck">${i.ok?'☑':'☐'}</td><td>${esc(i.txt||'')}${i.note?`<div class="note">${esc(i.note)}</div>`:''}</td><td>${refs(i.refs)}</td><td>${esc(i.qui||'')}</td>${plan?`<td>${esc(capRevDate(i.due))}</td>`:''}</tr>`).join('')+`</table>`:`<p class="dim">—</p>`);
  });
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${esc(d.titre||'')}</title><style>
body{font:13px/1.45 'Segoe UI',Arial,sans-serif;color:#1f2328;margin:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:20px 0 6px;border-bottom:2px solid #d0d7de;padding-bottom:3px}
table{border-collapse:collapse;width:100%;margin-bottom:8px}th,td{border:1px solid #d0d7de;padding:5px 7px;vertical-align:top;text-align:left}th{background:#f2f4f7;font-size:12px}
.kv th{width:190px}.dim{color:#656d76;font-size:11.5px}.ck{font-size:16px;text-align:center}.ref{display:inline-block;margin:1px 4px 1px 0;padding:0 6px;border:1px solid #d0d7de;border-radius:9px;font-size:11.5px}.ref i{color:#656d76}
.note{margin-top:3px;padding-left:8px;border-left:3px solid #d0d7de;color:#444c56;font-size:12px;white-space:pre-wrap}@media print{body{margin:10mm}tr{break-inside:avoid}h2{break-after:avoid}}
</style></head><body>${b}<p class="dim">${_L('Produit par Arcalyse')}</p></body></html>`;
  capDownloadBlob(new Blob([html],{type:'text/html'}), (d.titre||'check-list').replace(/[^\p{L}\p{N}\-]+/gu,'_')+'.html');
}

/** Importe une check-list ou un plan de revue enregistré en .json (💾 .json). */
function capHomeDocImport(){
  const inp=document.createElement('input'); inp.type='file'; if(!capIsMobile()) inp.accept='.json';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return;
    f.text().then(t=>{
      let o; try{ o=JSON.parse(t); }catch(e){ capAlert(_L('Fichier illisible (JSON attendu).'),{level:'err'}); return; }
      const l=o&&o.type==='arcalyse-checklist'&&Array.isArray(o.docs)?o.docs:null;
      if(!l){ capAlert(_L('Ce fichier n\'est pas une check-list Arcalyse.'),{level:'err'}); return; }
      const docs=capHomeNorm({docs:l}).docs;
      docs.forEach(d=>{ d.id=capHomeUid(); d.sections.forEach(s=>{ s.id=capHomeUid(); s.items.forEach(i=>{ i.id=capHomeUid(); }); }); _capHome.docs.push(d); });
      if(docs.length) _capHomeUi.doc=docs[0].id;
      capHomeSave(); capHomeRender();
      capWatchFlash(_L(`✔ ${docs.length} check-list(s) importée(s)`));
    });
  };
  inp.click();
}

/* ── Largeur réglable des volets (liste de gauche, palette 📎) ───────────── */

/** Bornes de largeur des volets réglables (px). */
const CAP_HOME_LARG={min:170, max:720};
/**
 * Attribut style de la largeur choisie pour un volet (rien : largeur par défaut).
 * @param {string} k - 'docs' (liste de gauche) | 'pal' (palette 📎)
 * @returns {string} attribut HTML
 */
function capHomeLargeur(k){ const w=_capHome.largeurs&&_capHome.largeurs[k]; return w?` style="width:${w}px"`:''; }
/**
 * Poignée de redimensionnement d'un volet, placée entre le volet et le document (double-clic : largeur par défaut).
 * @param {string} k - 'docs' | 'pal'
 * @returns {string} HTML
 */
function capHomeSplit(k){ return `<div class="hm-split hm-split-${k}" data-split="${k}" title="${_L('Glisser pour régler la largeur (double-clic : largeur par défaut)')}"></div>`; }
/**
 * Glisser la poignée d'un volet : la largeur suit la souris, puis elle est enregistrée dans la page.
 * @param {PointerEvent} e
 */
function capHomeSplitDown(e){
  const h=e.target.closest&&e.target.closest('[data-split]'); if(!h||e.button!==0) return;
  e.preventDefault(); e.stopPropagation();
  const k=h.dataset.split, aside=k==='pal'?h.nextElementSibling:h.previousElementSibling, x0=e.clientX, w0=aside.getBoundingClientRect().width, W=capHomeWin(h), D=W.document;
  const borne=w=>Math.round(Math.max(CAP_HOME_LARG.min, Math.min(CAP_HOME_LARG.max, w)));
  let w=w0; h.classList.add('on'); D.body.style.cursor='col-resize';
  const mv=ev=>{ w=borne(k==='pal'?w0-(ev.clientX-x0):w0+(ev.clientX-x0)); aside.style.width=w+'px'; };
  const up=()=>{ D.removeEventListener('pointermove',mv); D.removeEventListener('pointerup',up); D.body.style.cursor=''; h.classList.remove('on');
    if(Math.abs(w-w0)>1){ _capHome.largeurs[k]=w; capHomeSave(); capHomeRender(); } };
  D.addEventListener('pointermove',mv); D.addEventListener('pointerup',up);
}

/* ── Palette 📎 : diagrammes et éléments à glisser ─────────────────────── */

/** Palette à droite (check-lists, tableaux blancs, fenêtres séparées) : recherche, diagrammes, éléments. @returns {string} HTML */
function capHomePaletteHtml(){
  if(_capHomeUi.palPli) return `<aside class="hm-pal hm-pal-pli"><button class="cap-lf-btn" data-a="pal-pli" title="${_L('Afficher la palette 📎 Glisser-déposer')}">◂ 📎</button></aside>`;
  return capHomeSplit('pal')+`<aside class="hm-pal"${capHomeLargeur('pal')}><div class="hm-pal-h"><span>${_L('📎 Glisser-déposer')}</span><button class="cap-lf-btn" data-a="pal-pli" title="${_L('Replier la palette (plus de place pour le document)')}">▸</button></div>`+
    `<input class="phl-filter-input hm-pal-q" placeholder="${_L('🔍 Diagramme ou élément…')}" value="${capEsc(_capHomeUi.q)}">`+
    `<div class="hm-pal-l">${capHomePaletteList()}</div>`+
    `<div class="hm-pal-e hm-pal-tip">${_L('Astuce : ouvrez une check-list ou un tableau blanc dans une fenêtre séparée (⧉) pour y glisser aussi des diagrammes depuis 🔲 Diagrammes Capella et des éléments depuis 🧭 Explorateur ou ⚡ Chaînes.')}</div></aside>`;
}
/** Résultats de la palette : diagrammes (filtrés), éléments dont le nom contient la recherche. @returns {string} HTML */
function capHomePaletteList(){
  const esc=capEsc, norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const q=norm(_capHomeUi.q).trim(), mots=q.split(/\s+/).filter(Boolean), ok=s=>mots.every(w=>norm(s).includes(w));
  const row=ref=>{ const lv=CAP_LAYERS[ref.couche]||{color:'#8b949e'};
    return `<div class="hm-pal-i" draggable="true" data-ref="${esc(JSON.stringify(ref))}" title="${esc(capHomeRefType(ref))} — ${_L('glisser, ou clic pour ouvrir')}">${capHomeRefIco(ref,14)}<span style="color:${lv.color};font-size:9px;font-weight:700">${esc(ref.couche||'')}</span><span class="hm-pal-n">${esc(ref.nom)}</span></div>`; };
  let h=`<div class="hm-pal-s">${_L('🔲 Diagrammes')}</div>`;
  const reps=capHomeReps();
  if(!reps.length) h+=`<div class="hm-pal-e">${_L('Aucun .aird chargé.')} <button class="cap-lf-btn" data-a="aird">${_L('📂 Ouvrir le .aird…')}</button></div>`;
  else { const l=reps.filter(r=>!mots.length||ok(r.nom+' '+(r.sigle||'')+' '+(r.type||''))).sort((a,b)=>capDiagRang(a.couche)-capDiagRang(b.couche)||String(a.nom).localeCompare(b.nom));
    h+=l.slice(0,150).map(r=>row(capHomeRefDiag(r))).join('')+(l.length>150?`<div class="hm-pal-e">${_L(`… ${l.length-150} autre(s) : précisez la recherche`)}</div>`:'')+(l.length?'':`<div class="hm-pal-e">${_L('Aucun diagramme ne correspond.')}</div>`); }
  h+=`<div class="hm-pal-s">${_L('🧩 Éléments')}</div>`;
  if(q.length<2) return h+`<div class="hm-pal-e">${_L('Tapez au moins 2 lettres du nom d\'un élément.')}</div>`;
  const els=capAllElements.filter(e=>e.attrs.name&&!CAP_TECHNICAL_TYPES.has(e.typeName)&&ok(e.attrs.name+' '+e.typeName));
  return h+els.slice(0,80).map(e=>row(capHomeRefEl(e.id))).join('')+(els.length>80?`<div class="hm-pal-e">${_L(`… ${els.length-80} autre(s) : précisez la recherche`)}</div>`:'')+(els.length?'':`<div class="hm-pal-e">${_L('Aucun élément ne correspond.')}</div>`);
}

/* ── Événements ────────────────────────────────────────────────────────── */

/** Réaffiche la vue 🏠 Accueil si elle est affichée, et les fenêtres séparées ouvertes. */
function capHomeRender(){
  if(capCurrentView==='home'&&currentMode==='capella') capRenderHome(document.getElementById('cap-view-home'));
  capHomePopsRender();
}
/**
 * Check-list ou plan concerné par un élément de l'interface (vue ou fenêtre séparée).
 * @param {Element} [el] - Élément cliqué ou saisi
 * @returns {object|undefined} document
 */
function capHomeDocOf(el){ const n=el&&el.closest&&el.closest('[data-docid]'); return _capHome.docs.find(d=>d.id===(n?n.dataset.docid:_capHomeUi.doc)); }
/** @returns {object|undefined} document ouvert dans l'onglet ☑ */
function capHomeCurDoc(){ return _capHome.docs.find(d=>d.id===_capHomeUi.doc); }
/**
 * Fenêtre d'un élément de l'interface (la page, ou une fenêtre séparée) : boîtes de dialogue au bon endroit.
 * @param {Element} [el] @returns {Window}
 */
function capHomeWin(el){ return el&&el.ownerDocument&&el.ownerDocument.defaultView||window; }
/**
 * Premier élément correspondant au sélecteur, dans la page ou les fenêtres séparées (curseur placé après un rendu).
 * @param {string} sel - Sélecteur CSS
 * @returns {Element|null}
 */
function capHomeFind(sel){
  for(const D of [document, ...capHomePopDocs()]){ const n=D.querySelector(sel); if(n) return n; }
  return null;
}

/**
 * Branche (une fois) les écouteurs d'un conteneur (vue ou fenêtre séparée) : clics, saisies, glisser-déposer,
 * dessin et déplacement des objets du tableau blanc, disposition des cartes.
 * @param {HTMLElement} box - Conteneur
 */
function capHomeWire(box){
  if(box._hm) return; box._hm=true;
  box.addEventListener('click',capHomeClick);
  box.addEventListener('input',capHomeInput);
  box.addEventListener('change',capHomeChange);
  box.addEventListener('dblclick',capHomeBoardDbl);
  box.addEventListener('contextmenu',e=>{ if(typeof capDosContext==='function') capDosContext(e); });   // 📑 clic droit de l'éditeur des dossiers (65)
  box.addEventListener('dragstart',e=>{
    const k=e.target.closest&&e.target.closest('.hm-card-dispo');
    if(k){ e.dataTransfer.setData(CAP_HOME_CARTE, k.dataset.carte); e.dataTransfer.effectAllowed='move'; return; }
    const r=e.target.closest&&e.target.closest('[data-ref]'); if(!r) return;
    e.dataTransfer.setData(CAP_HOME_DND, r.dataset.ref);
    try{ e.dataTransfer.setData('text/plain', JSON.parse(r.dataset.ref).nom||''); }catch(_){}
    e.dataTransfer.effectAllowed='copy';
  });
  const cible=e=>e.target.closest&&e.target.closest('[data-drop]');
  box.addEventListener('dragover',e=>{
    const ty=[...(e.dataTransfer.types||[])];
    if(ty.includes(CAP_HOME_CARTE)){ const c=e.target.closest&&e.target.closest('[data-carte]'); if(c){ e.preventDefault(); e.dataTransfer.dropEffect='move'; } return; }
    const z=cible(e); if(!z||!(ty.includes(CAP_HOME_DND)||ty.includes('text/plain'))) return;
    e.preventDefault(); e.dataTransfer.dropEffect='copy';
    box.querySelectorAll('.hm-over').forEach(x=>{ if(x!==z) x.classList.remove('hm-over'); }); z.classList.add('hm-over');
  });
  box.addEventListener('dragleave',e=>{ const z=cible(e); if(z&&!z.contains(e.relatedTarget)) z.classList.remove('hm-over'); });
  box.addEventListener('drop',e=>{
    const ck=e.dataTransfer.getData(CAP_HOME_CARTE);
    if(ck){ const c=e.target.closest('[data-carte]'); e.preventDefault(); if(c&&c.dataset.carte!==ck) capHomeCarteMove(ck, c.dataset.carte); return; }
    const z=cible(e); if(!z) return;
    e.preventDefault(); e.stopPropagation(); z.classList.remove('hm-over');
    let ref=null; try{ ref=JSON.parse(e.dataTransfer.getData(CAP_HOME_DND)||'null'); }catch(_){}
    const txt=ref?'':(e.dataTransfer.getData('text/plain')||'').trim();
    if(!ref&&!txt) return;
    capHomeDrop(z, ref, txt, e);
  });
  box.addEventListener('pointerdown',capHomeBoardDown);
  box.addEventListener('pointerdown',capHomeSplitDown);
  box.addEventListener('dblclick',e=>{ const h=e.target.closest&&e.target.closest('[data-split]'); if(h){ delete _capHome.largeurs[h.dataset.split]; capHomeSave(); capHomeRender(); } });
  box.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target.matches('.hm-item-t')){ e.preventDefault(); const it=e.target.closest('[data-i]'); capHomeItemAdd(capHomeDocOf(it), it&&it.closest('[data-s]').dataset.s, it&&it.dataset.i); }
  });
}
/** Type de données glissées pour réordonner les cartes de 🏠 Projet. */
const CAP_HOME_CARTE='application/x-arcalyse-carte';
/**
 * Place une carte de 🏠 Projet avant une autre.
 * @param {string} k - Carte déplacée
 * @param {string} avant - Carte devant laquelle la placer
 */
function capHomeCarteMove(k, avant){
  const o=capHomeCartesOrdre().filter(x=>x!==k), i=o.indexOf(avant);
  o.splice(i<0?o.length:i, 0, k); _capHome.cartes.ordre=[...o, ..._capHome.cartes.masques];
  capHomeSave(); capHomeRender();
}
/**
 * Dépôt d'une référence (ou d'un texte) sur une zone : périmètre, point, section, tableau blanc.
 * @param {HTMLElement} z - Zone (data-drop)
 * @param {?object} ref - Référence déposée
 * @param {string} txt - Texte déposé (sans référence)
 * @param {DragEvent} e - Événement
 */
function capHomeDrop(z, ref, txt, e){
  const k=z.dataset.drop, d=capHomeDocOf(z), has=(l,r)=>l.some(x=>x.k===r.k&&x.id===r.id);
  if(k.startsWith('dos-')){ capDosDrop(z, ref, txt); return; }   // 📑 dossier de relecture (61)
  if(k==='board'){ const B=capHomeBoardOf(z), r=z.getBoundingClientRect(), x=Math.max(0,Math.round(e.clientX-r.left-20)), y=Math.max(0,Math.round(e.clientY-r.top-20));
    capHomeBoardAdd(B, ref?{k:'ref', x, y, ref}:{k:'txt', x, y, w:220, h:110, txt, col:_capHomeUi.col}); return; }
  if(!d) return;
  if(k==='perim'){ if(ref&&!has(d.head.perim,ref)) d.head.perim.push(ref); }
  else if(k==='item'){ const s=d.sections.find(s=>s.id===z.closest('[data-s]').dataset.s), i=s&&s.items.find(i=>i.id===z.dataset.i); if(!i) return;
    if(ref){ if(!has(i.refs,ref)) i.refs.push(ref); } else i.txt=(i.txt?i.txt+' ':'')+txt; }
  else if(k==='sec'){ const s=d.sections.find(s=>s.id===z.closest('[data-s]').dataset.s); if(!s) return;
    s.items.push({id:capHomeUid(), txt:ref?ref.nom:txt, ok:false, refs:ref?[ref]:[]}); }
  capHomeSave(); capHomeRender();
}
/**
 * Ajoute un point à une section (après un point donné, sinon à la fin) et y place le curseur.
 * @param {object} d - Check-list ou plan
 * @param {string} sid - Section
 * @param {string} [after] - Point après lequel insérer
 */
function capHomeItemAdd(d, sid, after){
  const s=d&&d.sections.find(x=>x.id===sid); if(!s) return;
  const it={id:capHomeUid(), txt:'', ok:false, refs:[]}, i=s.items.findIndex(x=>x.id===after);
  s.items.splice(i<0?s.items.length:i+1, 0, it); capHomeSave(); capHomeRender();
  const n=capHomeFind(`[data-i="${it.id}"] .hm-item-t`); if(n) n.focus();
}
/** Déplace un objet d'une liste d'un cran. @param {Array} l @param {number} i @param {number} dir - -1 / +1 */
function capHomeMove(l, i, dir){ const j=i+dir; if(i<0||j<0||j>=l.length) return; [l[i],l[j]]=[l[j],l[i]]; }

/** Clics de la vue et des fenêtres séparées (délégation). @param {MouseEvent} e */
function capHomeClick(e){
  const t=e.target, u=_capHomeUi, W=capHomeWin(t);
  const tab=t.closest('[data-tab]'); if(tab){ u.tab=tab.dataset.tab; capHomeRender(); return; }
  const nav=t.closest('[data-nav]'); if(nav){ capNavOpen(nav.dataset.nav); return; }
  const rm=t.closest('[data-rm]');
  if(rm){ e.stopPropagation(); const d=capHomeDocOf(rm); if(!d) return; const [w,n]=rm.dataset.rm.split(':');
    if(w==='p') d.head.perim.splice(+n,1); else { const it=t.closest('[data-i]'), s=it&&d.sections.find(s=>s.id===it.closest('[data-s]').dataset.s), i=s&&s.items.find(x=>x.id===it.dataset.i); if(i) i.refs.splice(+n,1); }
    capHomeSave(); capHomeRender(); return; }
  const a0=t.closest('[data-a]');
  if(a0&&a0.dataset.a==='pop'){ e.stopPropagation(); capHomePopOpen(a0.dataset.kind, a0.dataset.id); return; }
  const go=t.closest('[data-go]'); if(go){ try{ capHomeRefOpen(JSON.parse(go.dataset.go)); }catch(_){} return; }
  const pal=t.closest('.hm-pal-i'); if(pal){ try{ capHomeRefOpen(JSON.parse(pal.dataset.ref)); }catch(_){} return; }
  const dl=t.closest('[data-doc]'); if(dl){ Object.assign(u,{doc:dl.dataset.doc, tab:'docs'}); capHomeRender(); return; }
  const bo=t.closest('[data-board-open]'); if(bo){ Object.assign(u,{board:bo.dataset.boardOpen, tab:'board'}); capHomeRender(); return; }
  if(capHomeBoardClick(e)) return;   // tableau blanc : pages, outils, couleurs, sélection (60)
  if(capDosClick(e)) return;         // 📑 dossiers de relecture (61)
  const a=a0; if(!a) return;
  const act=a.dataset.a, d=capHomeDocOf(a);
  const sEl=t.closest('[data-s]'), s=d&&sEl&&d.sections.find(x=>x.id===sEl.dataset.s);
  const iEl=t.closest('[data-i]'), ii=s&&iEl?s.items.findIndex(x=>x.id===iEl.dataset.i):-1;
  switch(act){
    case 'aird': capDiagPickAird(); return;
    case 'rev': capRevToggle(true,'list'); return;
    case 'rev-cible': capRevCibleeDialog(); return;
    case 'update': capCfgLoadUpdate(); return;
    case 'dispo': u.dispo=!u.dispo; break;
    case 'carte-hide': if(!_capHome.cartes.masques.includes(a.dataset.k)) _capHome.cartes.masques.push(a.dataset.k); break;
    case 'carte-show': _capHome.cartes.masques=_capHome.cartes.masques.filter(k=>k!==a.dataset.k); break;
    case 'carte-wide': { const c=capHomeCartes().find(x=>x.k===a.dataset.k), w=_capHome.cartes.larges[a.dataset.k]||c.w; _capHome.cartes.larges[a.dataset.k]=w===2?1:2; break; }
    case 'cartes-reset': _capHome.cartes={ordre:[], masques:[], larges:{}}; break;
    case 'sante-calc': _capHomeUi.santeOk=true; capHomeRender(); return;
    case 'sante-profil': capChkDialog(); return;
    case 'sante-hide': if(!_capHome.cartes.masques.includes('sante')) _capHome.cartes.masques.push('sante'); capToast(_L('Carte masquée — ⚙ Disposer › Masquées pour la réafficher')); break;
    case 'quick': { const nd=capHomeQuickDoc(); capHomeRender(); const n=capHomeFind(`[data-docid="${nd.id}"] .hm-item-t`); if(n) n.focus(); return; }
    case 'go-docs': u.tab='docs'; break;
    case 'go-dos': u.tab='dos'; break;
    case 'pal-pli': u.palPli=!u.palPli; capHomeRender(); return;
    case 'doc-dos': if(d) capDosDepuisPlan(d); return;
    case 'doc-import': capHomeDocImport(); return;
    case 'doc-html': if(d) capHomeDocExport(d); return;
    case 'doc-json': if(d) capDownloadBlob(new Blob([JSON.stringify({type:'arcalyse-checklist', version:1, date:new Date().toISOString(), docs:[d]},null,1)],{type:'application/json'}), (d.titre||'check-list').replace(/[^\p{L}\p{N}\-]+/gu,'_')+'.json'); return;
    case 'doc-dup': if(d){ const c=JSON.parse(JSON.stringify(d)); c.id=capHomeUid(); c.titre=d.titre+_L(' (copie)'); c.sections.forEach(x=>{ x.id=capHomeUid(); x.items.forEach(i=>{ i.id=capHomeUid(); i.ok=false; }); }); _capHome.docs.push(c); u.doc=c.id; } break;
    case 'doc-del': if(d) capConfirm(_L(`Supprimer « ${d.titre||_L('(sans titre)')} » ?`),{win:W, danger:true}).then(ok=>{ if(!ok) return; capHomePopClose('doc',d.id); _capHome.docs=_capHome.docs.filter(x=>x!==d); if(u.doc===d.id) u.doc=''; capHomeSave(); capHomeRender(); }); return;
    case 'doc-revue': if(d){ const ids=capHomePerimIds(d); capRevCibleeDialog({titre:d.titre, consignes:d.head.objet||'', echeance:d.head.date||'', filtre:c=>capHomeComPerim(c,ids)}); } return;
    case 'sec-add': if(d) d.sections.push({id:capHomeUid(), titre:_L('Nouvelle section'), items:[]}); break;
    case 'sec-up': case 'sec-down': if(s) capHomeMove(d.sections, d.sections.indexOf(s), act==='sec-up'?-1:1); break;
    case 'sec-del': if(!s) return; if(s.items.length){ capConfirm(_L(`Supprimer la section « ${s.titre} » et ses ${s.items.length} point(s) ?`),{win:W, danger:true}).then(ok=>{ if(!ok) return; d.sections=d.sections.filter(x=>x!==s); capHomeSave(); capHomeRender(); }); return; }
      d.sections=d.sections.filter(x=>x!==s); break;
    case 'it-add': if(s) capHomeItemAdd(d, s.id); return;
    case 'it-up': case 'it-down': if(ii>=0) capHomeMove(s.items, ii, act==='it-up'?-1:1); break;
    case 'it-del': if(ii>=0) s.items.splice(ii,1); break;
    case 'it-note': if(ii>=0){ const id=s.items[ii].id; if(u.notes.has(id)&&!s.items[ii].note) u.notes.delete(id); else u.notes.add(id); } break;
    default: return;
  }
  capHomeSave(); capHomeRender();
}
/** Saisie : fiche projet, titres, champs du plan, points, notes du tableau blanc, recherche de la palette. @param {Event} e */
function capHomeInput(e){
  const t=e.target;
  if(t.classList.contains('hm-pal-q')){ _capHomeUi.q=t.value; const l=t.closest('.hm-pal').querySelector('.hm-pal-l'); if(l) l.innerHTML=capHomePaletteList(); return; }
  if(capDosInput(e)) return;   // 📑 dossier de relecture (61)
  if(t.dataset.ff){ _capHome.fiche[t.dataset.ff]=t.value; capHomeSaveLater(); return; }
  if(t.dataset.bt){ const B=capHomeBoardOf(t), it=B&&B.items.find(x=>x.id===t.closest('[data-it]').dataset.it); if(it){ it.txt=t.innerText; capHomeSaveLater(); } return; }
  const d=capHomeDocOf(t); if(!d) return;
  if(t.dataset.df){ d[t.dataset.df]=t.value; const n=document.querySelector(`#cap-view-home .hm-docs-i[data-doc="${d.id}"] .hm-docs-n`); if(n) n.textContent=(d.kind==='plan'?'📋 ':'☑ ')+(t.value||_L('(sans titre)')); capHomeSaveLater(); return; }
  if(t.dataset.hf&&t.tagName!=='SELECT'){ d.head[t.dataset.hf]=t.value; capHomeSaveLater(); return; }
  const s=d.sections.find(x=>x.id===(t.closest('[data-s]')||{dataset:{}}).dataset.s); if(!s) return;
  if(t.dataset.sf){ s[t.dataset.sf]=t.value; capHomeSaveLater(); return; }
  const i=s.items.find(x=>x.id===(t.closest('[data-i]')||{dataset:{}}).dataset.i);
  if(i&&t.dataset.if&&t.type!=='checkbox'){ i[t.dataset.if]=t.value; capHomeSaveLater(); }
}
/** Listes et cases : création d'une check-list ou d'un plan, champs du plan, case d'un point. @param {Event} e */
function capHomeChange(e){
  const t=e.target, d=capHomeDocOf(t);
  if(capDosInput(e)) return;   // 📑 dossier de relecture (61)
  if(t.dataset.new){ const v=t.value; if(!v) return; const nd=capHomeNewDoc(t.dataset.new, v); capHomeRender();
    if(nd.kind==='list'&&v==='vide'){ const n=capHomeFind(`[data-docid="${nd.id}"] .hm-item-t`); if(n) n.focus(); } return; }
  if(d&&t.dataset.hf&&t.tagName==='SELECT'){ d.head[t.dataset.hf]=t.value; capHomeSave(); return; }
  if(d&&t.dataset.if==='ok'){ const s=d.sections.find(x=>x.id===t.closest('[data-s]').dataset.s), i=s&&s.items.find(x=>x.id===t.closest('[data-i]').dataset.i);
    if(i){ i.ok=t.checked; if(t.checked) i.okDate=new Date().toISOString(); capHomeSave(); capHomeRender(); } }
}
