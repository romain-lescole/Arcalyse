/* ═══════════════════════════════════════════════════════════════════════
   💬 REVUE — commentaires de revue sur le modèle et sur les diagrammes
   ───────────────────────────────────────────────────────────────────────
   Bouton 💬 Revue de la barre : panneau à droite (💬 Commentaires, 🔁 Vérifier, 📄 Rapport, ⚙ Réglages).
   Un commentaire porte sur un ou plusieurs éléments du modèle (l'élément entier, son nom, sa description
   ou un autre attribut) et, s'il a été posé sur un diagramme, sur une note du calque de commentaires
   (position et taille en coordonnées du diagramme, indépendantes du .aird).
   Seul le texte est obligatoire ; titre, criticité, catégorie, échéance, responsables, étiquettes sont facultatifs
   (champs proposés au choix dans ⚙ Réglages).
   À la création, la valeur commentée est mémorisée (empreinte + extrait) : après un nouveau chargement
   ou une 🔄 mise à jour du modèle, 🔁 Vérifier liste les commentaires dont la cible a changé ou disparu.
   Stockage : bloc JSON « cap-review » de la page (💾), export / import .json (fusion de plusieurs relecteurs).
   ═══════════════════════════════════════════════════════════════════════ */

/** Données de la revue : auteur par défaut, participants, champs proposés, options du calque, commentaires. */
var _capRev = capRevNorm((()=>{ try{ const el=document.getElementById('cap-review'); return el?JSON.parse(el.textContent):null; }catch(e){ return null; } })());
/** État de l'interface de la revue (non enregistré). */
const _capRevUi = { open:false, dock:'rev', tab:'list', q:'', st:'notclosed', crit:'', who:'', scope:'all', sort:'num', exp:new Set(), link:'', elId:'', groupe:'status', portee:'list', reponses:true };
/** Commentaires modifiés depuis le dernier enregistrement de la page ou le dernier export. */
const _capRevUnsaved = new Set();

/**
 * Complète des données de revue (lues dans la page ou un fichier) avec les valeurs par défaut.
 * @param {object} [d] - Données lues
 * @returns {object} Données complètes
 */
function capRevNorm(d){
  d=d||{};
  return { v:1, me:d.me||'', people:Array.isArray(d.people)?d.people:[],
    fields:Object.assign({title:true, crit:true, cat:true, due:true, assignees:true, tags:true}, d.fields||{}),
    layer:d.layer!==false, layerDone:!!d.layerDone, mark:d.mark!==false,
    comments:Array.isArray(d.comments)?d.comments:[], seq:d.seq||0 };
}

/** @returns {object[]} statuts d'un commentaire {k, l, c, i} (k : valeur enregistrée) */
function capRevStatuts(){ return [
  {k:'open', l:_L('Ouvert'), c:'#58a6ff', i:'○'},
  {k:'progress', l:_L('En cours'), c:'#e3b341', i:'◐'},
  {k:'fixed', l:_L('Corrigé, à vérifier'), c:'#a78bfa', i:'◑'},
  {k:'done', l:_L('Validé'), c:'#3fb950', i:'✔'},
  {k:'rejected', l:_L('Rejeté'), c:'#8b949e', i:'✕'} ]; }
/** @returns {object[]} niveaux de criticité {k, l, c} ('' : non renseignée) */
function capRevCrits(){ return [
  {k:'', l:_L('Non renseignée'), c:'#8b949e'},
  {k:'info', l:_L('Information'), c:'#58a6ff'},
  {k:'minor', l:_L('Mineure'), c:'#e3b341'},
  {k:'major', l:_L('Majeure'), c:'#f0883e'},
  {k:'blocking', l:_L('Bloquante'), c:'#f85149'} ]; }
/** @returns {object[]} catégories {k, l} ('' : non renseignée) */
function capRevCats(){ return [
  {k:'', l:_L('—')}, {k:'question', l:_L('❓ Question')}, {k:'remark', l:_L('💡 Remarque')},
  {k:'error', l:_L('❌ Erreur')}, {k:'improvement', l:_L('✨ Amélioration')} ]; }
/** @param {object} c - Commentaire @returns {object} statut */
function capRevSt(c){ return capRevStatuts().find(s=>s.k===c.status)||capRevStatuts()[0]; }
/** @param {object} c - Commentaire @returns {object} criticité */
function capRevCr(c){ return capRevCrits().find(s=>s.k===(c.crit||''))||capRevCrits()[0]; }
/** @param {object} c - Commentaire @returns {boolean} vrai si le commentaire est clos (validé ou rejeté) */
function capRevClosed(c){ return c.status==='done'||c.status==='rejected'; }
/** @param {object} c - Commentaire @returns {boolean} vrai si l'échéance est dépassée et le commentaire non clos */
function capRevLate(c){ return !!c.due && !capRevClosed(c) && c.due<new Date().toISOString().slice(0,10); }
/** Libellé d'un champ commenté. @param {string} f - '' (élément), 'name', 'description' ou attribut @returns {string} */
function capRevFieldLabel(f){ return !f?_L('Élément'):f==='name'?_L('Nom'):f==='description'?_L('Description'):f; }
/** Date ISO → date courte affichée. @param {string} d @returns {string} */
function capRevDate(d){ if(!d) return ''; const x=new Date(d.length===10?d+'T12:00:00':d); return isNaN(x)?d:x.toLocaleDateString('fr-FR'); }
/** Date ISO → date et heure affichées. @param {string} d @returns {string} */
function capRevDateTime(d){ if(!d) return ''; const x=new Date(d); return isNaN(x)?d:x.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}); }

/* ── Enregistrement ────────────────────────────────────────────────────── */

/**
 * Enregistre la revue dans la page (bloc JSON repris par la 💾 Page HTML) et rafraîchit l'affichage.
 * @param {string} [id] - Commentaire modifié (compté comme non enregistré)
 */
function capRevSave(id){
  let el=document.getElementById('cap-review');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-review'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(_capRev).replace(/</g,'\\u003c');
  if(id) _capRevUnsaved.add(id);
  capRevRefresh();
}
/** Rafraîchit tout ce qui montre la revue : badge, panneau, calque du diagramme, marques des vues. */
function capRevRefresh(){
  capRevBadge(); capRevRender(); capRevLayerDraw(); capRevMarkSchedule();
  if(typeof capDiagRevSlot==='function') capDiagRevSlot();   // 📝 Note de revue / 💬 Calque (n) au-dessus du diagramme
  // Panneau de détail ouvert : section « Commentaires » et compteur sous le nom
  document.querySelectorAll('#crv-det-sec').forEach(sec=>{
    const id=sec.dataset.el, el=capLoaded&&capGetElementById_(id); if(!el||!_capRevUi.secTitle) return;
    sec.innerHTML=capRevDetailSectionIn(id,_capRevUi.secTitle);
    if(typeof capDetTabsRefresh==='function') capDetTabsRefresh(sec.closest('#cap-detail-content,#rm-detail-content'));   // onglet 💬 Revue montré / masqué (77)
    const bar=sec.parentElement&&sec.parentElement.querySelector('.crv-det-bar'); if(bar) bar.outerHTML=capRevDetailHead(el);
  });
}
/** La page vient d'être enregistrée : plus aucun commentaire en attente d'enregistrement. */
function capRevMarkSaved(){ _capRevUnsaved.clear(); }
/** @returns {number} nombre de commentaires modifiés depuis le dernier enregistrement ou export */
function capRevUnsavedCount(){ return [..._capRevUnsaved].filter(id=>_capRev.comments.some(c=>c.id===id)).length; }
/** Identifiant unique d'un commentaire. @returns {string} */
function capRevUid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ── Empreintes : détection des modifications du modèle ────────────────── */

/** Empreinte courte (FNV-1a 32 bits) d'un texte. @param {string} s @returns {string} */
function capRevHash(s){ let h=0x811c9dc5; s=String(s); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(16); }
/**
 * Valeur commentée d'un élément : nom, description (texte), attribut, ou pour l'élément entier
 * son type, ses attributs et ses enfants directs.
 * @param {object} el - Élément du modèle
 * @param {string} f - Champ ('' : élément)
 * @returns {string} Valeur comparable
 */
function capRevValue(el, f){
  if(f==='name') return el.attrs.name||'';
  if(f==='description') return capHtmlToText(el.attrs.description||'');
  if(f) return String(el.attrs[f]||'');
  const kids=(capGetParentIndex().childrenOf[el.id]||[]).slice().sort();
  return JSON.stringify([el.typeName, Object.keys(el.attrs).sort().map(k=>[k,el.attrs[k]]), kids]);
}
/**
 * Mémorise la valeur commentée : empreinte, extrait du texte (champ) ou attributs et nombre d'enfants (élément).
 * @param {object} el - Élément
 * @param {string} f - Champ
 * @returns {object} {h, v} ou {h, a, n}
 */
function capRevSnap(el, f){
  const s={h:capRevHash(capRevValue(el,f))};
  if(f) s.v=capRevValue(el,f).slice(0,3000);
  else { s.a={}; Object.keys(el.attrs).filter(k=>k!=='id').slice(0,60).forEach(k=>{ s.a[k]=String(el.attrs[k]).slice(0,400); }); s.n=(capGetParentIndex().childrenOf[el.id]||[]).length; }
  return s;
}
/**
 * Cible d'un commentaire pour un élément du modèle chargé.
 * @param {string} id - Élément
 * @param {string} [f] - Champ ('' : élément entier)
 * @returns {object|null} {id, name, type, layer, field, snap}
 */
function capRevTarget(id, f){
  const el=capLoaded&&capGetElementById_(id); if(!el) return null;
  return {id, name:el.attrs.name||'', type:el.typeName, layer:el.layer, field:f||'', snap:capRevSnap(el, f||'')};
}
/** État d'une cible sur le modèle chargé. @param {object} t - Cible @returns {string} 'same' | 'changed' | 'deleted' | 'na' */
function capRevTargetState(t){
  if(!capLoaded) return 'na';
  const el=capGetElementById_(t.id); if(!el) return 'deleted';
  return !t.snap||capRevHash(capRevValue(el,t.field))===t.snap.h?'same':'changed';
}
/** État d'un commentaire (pire état de ses cibles). @param {object} c @returns {string} 'same' | 'changed' | 'deleted' | 'na' */
function capRevState(c){
  let r='same';
  for(const t of c.targets||[]){ const s=capRevTargetState(t); if(s==='deleted') return s; if(s==='changed') r=s; else if(s==='na'&&r==='same') r=s; }
  return r;
}
/** @returns {object[]} commentaires non clos dont une cible a changé ou disparu, ou marqués « Corrigé, à vérifier » */
function capRevToCheck(){ return _capRev.comments.filter(c=>!capRevClosed(c)&&!capRevOtherProject(c)&&(c.status==='fixed'||['changed','deleted'].includes(capRevState(c)))); }

/* ── Projet Capella : à quel modèle appartient une revue ? ──────────────── */

/** @returns {string} identifiant (UUID) de l'élément racine Project du modèle chargé ('' sans modèle) */
function capRevProjectId(){ const r=capLoaded&&typeof cap_xmlDoc!=='undefined'&&cap_xmlDoc&&cap_xmlDoc.documentElement; return r?capXId(r):''; }
/** @returns {string} nom du Project du modèle chargé */
function capRevProjectName(){ const r=capLoaded&&cap_xmlDoc&&cap_xmlDoc.documentElement; return r?r.getAttribute('name')||'':''; }
/** @param {object} c - Commentaire @returns {boolean} vrai si le commentaire a été posé sur un autre projet que celui chargé */
function capRevOtherProject(c){ const p=capRevProjectId(); return !!(c.project&&p&&c.project!==p); }
/**
 * Compare une revue (ou des commentaires) au modèle chargé. Critères, dans l'ordre :
 * 1. identifiant du Project racine (UUID créé avec le projet Capella, conservé d'une version à l'autre) ;
 * 2. part des éléments commentés présents dans le modèle (identifiants uniques, stables entre versions) —
 *    sur peu d'éléments (moins de CAP_REV_MIN_ELTS) la part seule ne permet pas de conclure ;
 * 3. nom du fichier, à titre indicatif.
 * @param {object[]} comments - Commentaires
 * @param {string} [project] - Identifiant de projet déclaré par la revue (export), sinon celui des commentaires
 * @returns {{verdict:string, pid:string, proj:string, ids:number, found:number, pct:number}}
 *   verdict : 'same' (même projet), 'copy' (autre identifiant de projet mais mêmes éléments : copie du projet ?),
 *   'probable' (peu d'éléments, tous retrouvés), 'doubt' (peu d'éléments, pas tous retrouvés, ou aucun élément),
 *   'different' (autre projet), 'nomodel' (aucun modèle chargé)
 */
function capRevMatch(comments, project){
  const pid=capRevProjectId();
  const ps=[...new Set(comments.map(c=>c.project).filter(Boolean))];
  const proj=project||(ps.length===1?ps[0]:'');
  const ids=[...new Set(comments.flatMap(c=>(c.targets||[]).map(t=>t.id)))];
  const found=pid?ids.filter(id=>capGetElementById_(id)).length:0, pct=ids.length?found/ids.length:0;
  const r={pid, proj, ids:ids.length, found, pct, verdict:''};
  if(!pid) r.verdict='nomodel';
  else if(proj&&proj===pid) r.verdict='same';
  else if(proj&&found>=Math.min(CAP_REV_MIN_ELTS,ids.length)&&pct>=0.5) r.verdict='copy';
  else if(proj) r.verdict='different';
  else if(ids.length>=CAP_REV_MIN_ELTS) r.verdict=pct>=0.5?'same':'different';
  else r.verdict=ids.length&&found===ids.length?'probable':'doubt';
  return r;
}
/** En dessous de ce nombre d'éléments commentés, la part retrouvée dans le modèle ne suffit pas à conclure. */
const CAP_REV_MIN_ELTS=5;

/** Après le chargement d'un modèle : rattache au projet les anciens commentaires qui n'en avaient pas,
 * rafraîchit la revue, signale les commentaires à vérifier et ceux qui viennent d'un autre projet. */
function capRevOnModelLoad(){
  const pid=capRevProjectId();
  if(pid) _capRev.comments.forEach(c=>{ if(!c.project&&(c.targets||[]).length){ const f=c.targets.filter(t=>capGetElementById_(t.id)).length; if(f&&f>=c.targets.length/2) c.project=pid; } });
  capRevRefresh();
  const n=capRevToCheck().filter(c=>capRevState(c)!=='same').length, autres=_capRev.comments.filter(capRevOtherProject).length;
  const msg=[n?_L(`💬 Revue : ${n} commentaire(s) portent sur des éléments modifiés ou supprimés — 💬 Revue › 🔁 Vérifier`):'',
    autres?_L(`💬 ${autres} commentaire(s) de la page viennent d'un autre projet Capella (non vérifiés sur ce modèle)`):''].filter(Boolean).join(' · ');
  if(msg&&typeof capWatchFlash==='function') setTimeout(()=>capWatchFlash(msg),600);
}

/* ── Bouton de la barre et panneau ─────────────────────────────────────── */

/** Met à jour le badge des commentaires (bouton 💬 Revue et menu 💬 Revue & documents de la barre) :
 * commentaires ouverts ; ⚠ s'il y en a à vérifier. */
function capRevBadge(){
  const n=_capRev.comments.filter(c=>!capRevClosed(c)).length, k=capLoaded?capRevToCheck().length:0;
  ['b-review-badge','cap-nav-rev-badge'].forEach(id=>{ const b=document.getElementById(id); if(!b) return;
    b.textContent=k?'⚠ '+k:n?String(n):''; b.style.display=n||k?'':'none'; b.classList.toggle('crv-warn',!!k);
    b.title=_L(`${n} commentaire(s) non clos`)+(k?_L(` — ${k} à vérifier`):''); });
}
/**
 * Ouvre ou ferme le panneau 💬 Revue (dans la page, ou dans sa fenêtre séparée si elle est ouverte : elle passe alors au premier plan).
 * @param {boolean} [open] - Forcer l'état (sinon bascule)
 * @param {string} [tab] - Onglet à afficher : list, check, report, cfg
 */
function capRevToggle(open, tab){
  if(tab) _capRevUi.tab=tab;
  const w=capRevPop();
  if(w){ _capRevUi.open=true; capRevRender(); if(open!==false) w.focus(); else w.close(); return; }
  _capRevUi.open=open==null?!_capRevUi.open:!!open;
  if(_capRevUi.open) _capRevUi.dock='rev';   // ouvert : passe devant le panneau de détail (onglets)
  const p=capRevPanel();
  p.style.display=_capRevUi.open?'flex':'none';
  document.getElementById('b-review')?.classList.toggle('active',_capRevUi.open);
  capDockSync();
  capRevRender();
}

/* ── Panneau ancré à droite, partagé avec le panneau de détail ──────────────
   Le panneau 💬 Revue n'est plus posé par-dessus la vue : il occupe une colonne à droite (vues Capella :
   #capella-overlay ; Relation Map : #main), comme le panneau de détail. Quand les deux sont ouverts, un seul
   est visible à la fois et des onglets 🔎 Propriétés / 💬 Revue permettent de passer de l'un à l'autre. */

/** @returns {HTMLElement|null} panneau de détail du mode affiché (vues Capella ou Relation Map) */
function capDockDet(){ return document.getElementById(currentMode==='capella'?'cap-detail':'rm-detail'); }
/** @returns {boolean} panneau de revue ouvert dans la page (pas dans sa fenêtre séparée) */
function capDockRevOn(){ return !!(_capRevUi.open&&!capRevPop()); }
/** @returns {boolean} panneau de détail du mode affiché ouvert */
function capDockDetOn(){ const d=capDockDet(); return !!(d&&d.style.display!=='none'); }
/**
 * Onglets 🔎 Propriétés / 💬 Revue affichés en tête des deux panneaux quand ils sont ouverts ensemble.
 * @param {string} actif - 'det' ou 'rev'
 * @returns {string} HTML
 */
function capDockTabsHtml(actif){
  const n=_capRev.comments.filter(c=>!capRevClosed(c)).length;
  const b=(k,l,t)=>`<button class="cap-dock-tab${actif===k?' on':''}" data-dock="${k}" title="${t}">${l}</button>`;
  return b('det',_L('🔎 Propriétés'),_L('Panneau de détail de l\'élément sélectionné'))+
    b('rev',_L('💬 Revue')+(n?` <span class="crv-n">${n}</span>`:''),_L('Panneau des commentaires de revue'));
}
/**
 * Affiche l'un des deux panneaux ancrés quand ils sont ouverts ensemble.
 * @param {string} k - 'det' (🔎 Propriétés) ou 'rev' (💬 Revue)
 */
function capDockShow(k){ _capRevUi.dock=k; capDockSync(); if(k==='rev') capRevRender(); }
/** Place le panneau de revue dans la colonne de droite du mode affiché et règle les onglets partagés avec le panneau de détail. */
function capDockSync(){
  try{ if(!_capRevUi.panel) return; }catch(e){ return; }   // appelé par applyMode avant le chargement de ce module
  const p=_capRevUi.panel, rev=capDockRevOn();
  if(p&&rev){ const hote=document.getElementById(currentMode==='capella'?'capella-overlay':'main'); if(hote&&p.parentElement!==hote) hote.appendChild(p); }
  ['cap-detail','rm-detail'].forEach(i=>{ const d=document.getElementById(i); if(d) d.classList.remove('cap-dock-hid'); });
  const det=capDockDet(), both=rev&&capDockDetOn();
  if(p) p.classList.toggle('cap-dock-hid', both&&_capRevUi.dock==='det');
  if(det) det.classList.toggle('cap-dock-hid', both&&_capRevUi.dock==='rev');
  document.querySelectorAll('#cap-detail>.cap-dock-tabs,#rm-detail>.cap-dock-tabs').forEach(x=>x.remove());
  if(det&&both){ const t=document.createElement('div'); t.className='cap-dock-tabs'; t.innerHTML=capDockTabsHtml('det'); det.insertBefore(t, det.firstChild); }
  if(p&&rev&&!!p.querySelector('.crv-hdr>.cap-dock-tabs')!==both) capRevRender();
}
/** @returns {HTMLElement} panneau 💬 Revue (créé au premier appel ; il peut se trouver dans la fenêtre séparée) */
function capRevPanel(){
  let p=_capRevUi.panel;
  if(!p){
    p=_capRevUi.panel=document.createElement('div'); p.id='crv-panel'; document.body.appendChild(p);
    p.addEventListener('click', capRevPanelClick);
    p.addEventListener('input', capRevPanelInput);
    p.addEventListener('change', capRevPanelChange);
  }
  return p;
}
/** @returns {Window|null} fenêtre séparée de la revue, si elle est ouverte */
function capRevPop(){ const w=_capRevUi.win; return w&&!w.closed?w:null; }
/** @returns {Document} document où l'utilisateur travaille sur la revue : la fenêtre séparée si elle a le focus, sinon la page */
function capRevDoc(){ const w=capRevPop(); return w&&w.document.hasFocus()?w.document:document; }
/** @param {string} id @returns {HTMLElement|null} élément du panneau (page ou fenêtre séparée) */
function capRevQ(id){ const p=_capRevUi.panel; return p?p.ownerDocument.getElementById(id):null; }
/** @param {string} msg @returns {boolean} confirmation demandée dans la fenêtre où l'on travaille */
function capRevConfirm(msg, o){ return capConfirm(msg, Object.assign({win:capRevDoc().defaultView}, o||{})); }   // asynchrone (12-dialogues.js)
/** @param {string} msg - Message affiché dans la fenêtre où l'on travaille */
function capRevAlert(msg, o){ return capAlert(msg, Object.assign({win:capRevDoc().defaultView}, o||{})); }

/**
 * ⧉ Ouvre le panneau 💬 Revue dans une fenêtre séparée (à placer sur un autre écran). La fenêtre dépend de la page :
 * même script, mêmes données ; le panneau y est déplacé avec ses écouteurs, les styles et le thème sont recopiés.
 * La fermer ramène le panneau dans la page.
 */
function capRevPopOut(){
  if(capRevPop()){ capRevPop().focus(); return; }
  const w=window.open('', 'arcalyse-revue', 'width=560,height=860');
  if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
  const D=w.document;
  D.open(); D.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body class="crv-pop-body"></body></html>'); D.close();
  D.title=_L('💬 Revue')+' — '+(capCurrentFileName||'Arcalyse');
  document.querySelectorAll('style').forEach(st=>D.head.appendChild(D.importNode(st,true)));
  capRevPopTheme(w);
  const p=capRevPanel(); D.body.appendChild(D.adoptNode(p));
  p.classList.add('crv-pop'); p.style.display='flex';
  _capRevUi.win=w; _capRevUi.open=true;
  capDockSync();   // le panneau de détail reprend toute la colonne de droite
  w.addEventListener('pagehide',capRevPopBack);
  w.addEventListener('keydown',e=>{ if(e.ctrlKey&&!e.altKey&&(e.key==='s'||e.key==='S')){ e.preventDefault(); capSavePageDirect(e.shiftKey); } });
  document.getElementById('b-review')?.classList.add('active');
  capRevRender();
}
/** Recopie le thème de la page (attributs et variables de couleur de <html>) dans la fenêtre séparée. @param {Window} w */
function capRevPopTheme(w){
  const a=document.documentElement, b=w.document.documentElement;
  ['data-theme','data-tone','style','lang'].forEach(k=>{ const v=a.getAttribute(k); if(v==null) b.removeAttribute(k); else b.setAttribute(k,v); });
}
/** Fenêtre séparée fermée : le panneau revient (fermé) dans la page. */
function capRevPopBack(){
  const p=_capRevUi.panel;
  if(p&&p.ownerDocument!==document) document.body.appendChild(document.adoptNode(p));
  if(p){ p.classList.remove('crv-pop'); p.style.display='none'; }
  capDockSync();
  _capRevUi.win=null; _capRevUi.open=false; _capRevUi.dd=false;
  document.getElementById('b-review')?.classList.remove('active');
}
/** Affiche le contenu du panneau 💬 Revue (onglet courant). */
function capRevRender(){
  const p=_capRevUi.panel; if(!p||!_capRevUi.open) return;
  const D=p.ownerDocument, pop=!!capRevPop();
  const u=_capRevUi, nOpen=_capRev.comments.filter(c=>!capRevClosed(c)).length, nChk=capLoaded?capRevToCheck().length:0, nNon=capRevUnsavedCount();
  const tab=(k,l,t)=>`<button class="crv-tab${u.tab===k?' on':''}" data-tab="${k}" title="${t}">${l}</button>`;
  const keep=D.activeElement&&p.contains(D.activeElement)?D.activeElement.id:'';
  const pos=(D.getElementById('crv-body')||{}).scrollTop||0;
  const both=!pop&&capDockDetOn();
  p.innerHTML=`<div class="crv-hdr">${both?`<span class="cap-dock-tabs">${capDockTabsHtml('rev')}</span>`:`<b>${_L('💬 Revue')}</b>`}<span class="ana-dim">${capEsc(capCurrentFileName||'')}</span><span style="flex:1"></span>`+
    `<button class="cap-lf-btn" data-a="pop" title="${pop?_L('Ramener le panneau dans la page'):_L('Ouvrir le panneau dans une fenêtre séparée (par exemple sur un autre écran)')}">${pop?'⧈':'⧉'}</button>`+
    (pop?'':`<button class="cap-lf-btn" data-a="close" title="${_L('Fermer')}">✕</button>`)+`</div><div class="crv-acts">`+
    `<button class="cap-lf-btn" data-a="new" title="${_L('Nouveau commentaire (sur l\'élément affiché dans le panneau de détail, s\'il y en a un)')}">${_L('✚ Nouveau')}</button>`+
    `<button class="cap-lf-btn" data-a="cible" title="${_L('Page HTML autonome à envoyer aux relecteurs : ils répondent aux commentaires choisis et en ajoutent ; leurs réponses se réimportent ici')}">${_L('📤 Faire relire')}</button>`+
    `<span class="crv-dd-a"><button class="cap-lf-btn${u.dd?' active':''}" data-a="dd" title="${_L('Exporter ou importer les commentaires (.json)')}">${_L('💾 Revue ▾')}${nNon?` <span class="crv-n crv-warn" title="${_L('Commentaires modifiés depuis le dernier enregistrement ou export')}">${nNon}</span>`:''}</button>`+
    (u.dd?`<div class="crv-dd">`+
      _L(`<div class="crv-dd-h">Les commentaires sont enregistrés <b>dans la page</b> : 💾 Enregistrer (Ctrl+S) les conserve avec le modèle.</div>`)+
      `<div class="ctx-i" data-a="export">${_L('⬇ Exporter les commentaires (.json)')}</div><div class="ctx-i" data-a="import">${_L('📂 Importer / fusionner une revue (.json ou page de revue ciblée .html)…')}</div>`+
      `<div class="ctx-i" data-a="cible" title="${_L('Page HTML autonome à envoyer aux relecteurs : ils répondent aux commentaires choisis et en ajoutent ; leurs réponses se réimportent ici')}">${_L('📤 Faire relire des commentaires (page HTML)…')}</div>`+
      `<div class="ctx-i" data-a="dossiers" title="${_L('Document chapitré à faire relire : descriptions, diagrammes, texte libre ; export HTML à commenter ou Word')}">${_L('📑 Dossiers de relecture…')}</div>`+
      _L(`<div class="crv-dd-h">L'export garde la revue hors de la page, pour la transmettre ou réunir celles de plusieurs relecteurs (l'import ajoute les nouveaux commentaires et garde la version la plus récente des autres).</div>`)+
      (nNon?`<div class="crv-dd-h" style="color:var(--c-warn,#e3b341)">${_L(`${nNon} commentaire(s) modifié(s) depuis le dernier enregistrement ou export.`)}</div>`:'')+`</div>`:'')+`</span>`+
    `<button class="cap-lf-btn" data-a="dossiers" title="${_L('📑 Dossiers de relecture (🏠 Accueil) : document chapitré à faire relire, export HTML ou Word, réimport des retours')}">📑</button>`+
    `<button class="cap-lf-btn" data-a="tour" title="${_L('Visite guidée du panneau 💬 Revue')}">🎓</button></div>`+
    `<div class="crv-tabs">${tab('list',_L(`💬 Commentaires <span class="crv-n">${nOpen}</span>`),_L('Liste des commentaires, filtres et recherche'))}`+
    tab('check',_L(`🔁 Vérifier`)+(nChk?` <span class="crv-n crv-warn">${nChk}</span>`:''),_L('Commentaires dont l\'élément a changé ou disparu depuis le commentaire, ou marqués « Corrigé, à vérifier »'))+
    tab('report',_L('📄 Rapport'),_L('Synthèse, rapport HTML, CSV'))+tab('cfg',_L('⚙ Réglages'),_L('Votre nom, participants, champs proposés, affichage'))+`</div>`+
    `<div class="crv-body" id="crv-body">${u.tab==='check'?capRevCheckHtml():u.tab==='report'?capRevReportTab():u.tab==='cfg'?capRevCfgHtml():capRevListHtml()}</div>`;
  const b=D.getElementById('crv-body'); if(b) b.scrollTop=pos;
  if(keep){ const k=D.getElementById(keep); if(k){ k.focus(); if(k.setSelectionRange&&k.type==='text'){ const n=k.value.length; k.setSelectionRange(n,n); } } }
  if(pop) D.title=_L('💬 Revue')+' — '+(capCurrentFileName||'Arcalyse');
}

/** Personnes connues : participants, auteurs et responsables des commentaires. @returns {string[]} */
function capRevPeople(){
  const s=new Set(_capRev.people); if(_capRev.me) s.add(_capRev.me);
  _capRev.comments.forEach(c=>{ if(c.author) s.add(c.author); (c.assignees||[]).forEach(a=>s.add(a)); });
  return [...s].filter(Boolean).sort((a,b)=>a.localeCompare(b));
}
/** @returns {object[]} commentaires de l'onglet 💬 Commentaires, filtrés et triés */
function capRevFiltered(){
  const u=_capRevUi, norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const q=norm(u.q).trim(), uid=capRevDiagUid();
  const rang=c=>capRevCrits().findIndex(x=>x.k===(c.crit||''));
  return _capRev.comments.filter(c=>{
    if(u.st==='notclosed'&&capRevClosed(c)) return false;
    if(u.st&&!['notclosed','all'].includes(u.st)&&c.status!==u.st) return false;
    if(u.crit&&(c.crit||'')!==u.crit) return false;
    if(u.who&&!(c.assignees||[]).includes(u.who)&&c.author!==u.who) return false;
    if(u.scope==='diag'&&!(c.diag&&c.diag.uid===uid)) return false;
    if(u.scope==='el'&&!(c.targets||[]).some(t=>t.id===u.elId)) return false;
    if(u.scope==='late'&&!capRevLate(c)) return false;
    if(u.scope==='proj'&&capRevOtherProject(c)) return false;
    if(u.scope==='mine'&&!(c.assignees||[]).includes(_capRev.me)) return false;
    if(q){ const txt=norm(['#'+c.num,c.title,c.text,c.author,(c.assignees||[]).join(' '),(c.tags||[]).join(' '),(c.targets||[]).map(t=>t.name+' '+t.type).join(' '),c.diag?c.diag.nom:'',(c.replies||[]).map(r=>r.text).join(' ')].join(' '));
      if(!q.split(/\s+/).every(w=>txt.includes(w))) return false; }
    return true;
  }).sort((a,b)=>u.sort==='crit'?rang(b)-rang(a)||b.num-a.num:u.sort==='due'?(a.due||'9999').localeCompare(b.due||'9999')||b.num-a.num
    :u.sort==='status'?capRevStatuts().findIndex(s=>s.k===a.status)-capRevStatuts().findIndex(s=>s.k===b.status)||b.num-a.num:b.num-a.num);
}

/** Onglet 💬 Commentaires : filtres et cartes. @returns {string} HTML */
function capRevListHtml(){
  const u=_capRevUi, esc=capEsc;
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${l}</option>`;
  const people=capRevPeople(), list=capRevFiltered();
  let h=`<div class="crv-filters"><input id="crv-q" class="phl-filter-input" placeholder="${_L('🔍 Texte, élément, personne, #n…')}" value="${esc(u.q)}">`+
    `<select id="crv-st" title="${_L('Statut')}">${opt('notclosed',_L('Non clos'),u.st)}${opt('all',_L('Tous les statuts'),u.st)}${capRevStatuts().map(s=>opt(s.k,s.i+' '+s.l,u.st)).join('')}</select>`+
    `<select id="crv-crit" title="${_L('Criticité')}">${opt('',_L('Toute criticité'),u.crit)}${capRevCrits().filter(c=>c.k).map(c=>opt(c.k,c.l,u.crit)).join('')}</select>`+
    `<select id="crv-who" title="${_L('Auteur ou responsable')}">${opt('',_L('Toute personne'),u.who)}${people.map(p=>opt(p,esc(p),u.who)).join('')}</select>`+
    `<select id="crv-scope" title="${_L('Portée')}">${opt('all',_L('Partout'),u.scope)}${capLoaded?opt('proj',_L('Projet chargé'),u.scope):''}${opt('diag',_L('Diagramme ouvert'),u.scope)}${opt('el',_L('Élément du panneau de détail'),u.scope)}${opt('late',_L('En retard'),u.scope)}${_capRev.me?opt('mine',_L('Qui me sont attribués'),u.scope):''}</select>`+
    `<select id="crv-sort" title="${_L('Tri')}">${opt('num',_L('Plus récents'),u.sort)}${opt('crit',_L('Criticité'),u.sort)}${opt('due',_L('Échéance'),u.sort)}${opt('status',_L('Statut'),u.sort)}</select>`+
    `<span class="ana-dim">${_L(`${list.length} / ${_capRev.comments.length}`)}</span></div>`;
  if(!_capRev.comments.length) return h+_L(`<div class="crv-empty"><b>Aucun commentaire pour l'instant.</b><br><br>Pour commenter :<br>• <b>✚ Nouveau</b> ci-dessus ;<br>• dans le <b>panneau de détail</b> d'un élément : 💬 Commenter, ou 💬 à côté du nom, de la description, d'un attribut ;<br>• <b>clic droit</b> sur un élément dans les vues (blocs, tableaux, listes, diagrammes) ;<br>• dans <b>🔲 Diagrammes Capella</b> : glissez <b>📝 Note</b> sur le diagramme (sur un élément pour le lier).</div>`);
  if(!list.length) return h+_L('<div class="crv-empty">Aucun commentaire ne correspond aux filtres.</div>');
  return h+list.map(capRevCardHtml).join('');
}
/**
 * Carte d'un commentaire (repliée : en-tête, titre, méta ; dépliée : texte complet, réponses, actions).
 * @param {object} c - Commentaire
 * @returns {string} HTML
 */
function capRevCardHtml(c){
  const esc=capEsc, st=capRevSt(c), cr=capRevCr(c), open=_capRevUi.exp.has(c.id), state=capRevState(c);
  const stateTag=state==='changed'?_L('<span class="crv-chg" title="La valeur commentée a changé depuis le commentaire">⚠ modifié</span>')
    :state==='deleted'?_L('<span class="crv-chg crv-del" title="Un élément commenté n\'existe plus dans le modèle chargé">⚠ supprimé</span>'):'';
  const cat=(capRevCats().find(x=>x.k===c.cat)||{}).l;
  const autre=capRevOtherProject(c)?_L(`<span class="crv-chg crv-other" title="Commentaire posé sur un autre projet Capella${c.model?' (« '+esc(c.model)+' »)':''} : il n'est pas comparé au modèle chargé">⧉ autre projet</span>`):'';
  const titre=c.title||String(c.text||'').split('\n')[0].slice(0,120)||_L('(sans texte)');
  const meta=[c.author?'👤 '+esc(c.author):'', '🕓 '+capRevDate(c.created),
    c.due?`<span class="${capRevLate(c)?'crv-late':''}" title="${_L('Échéance')}">⏰ ${capRevDate(c.due)}</span>`:'',
    (c.assignees||[]).length?`<span title="${_L('Responsables')}">👥 ${esc(c.assignees.join(', '))}</span>`:'',
    c.dossier?`<span class="crv-dos" data-a="dos-go" data-dos="${esc(c.dossier.id)}" title="${_L('Retour d\'un dossier de relecture : ouvrir le dossier')}">📑 ${esc(c.dossier.titre||'')}${c.dossier.num?' › '+esc(c.dossier.num):''}</span>`:'',
    (c.tags||[]).length?'🏷 '+esc(c.tags.join(', ')):'', (c.replies||[]).length?_L(`↩ ${c.replies.length}`):''].filter(Boolean).join(' · ');
  let h=`<div class="crv-card${open?' open':''}${capRevClosed(c)?' closed':''}" data-c="${esc(c.id)}" style="--crv-c:${cr.c}">`+
    `<div class="crv-card-h" data-a="exp"><span class="crv-num">#${c.num}</span>`+
    (c.crit?`<span class="crv-crit" style="background:${cr.c};color:${capInk(cr.c)}">${cr.l}</span>`:'')+
    `<span class="crv-st" style="color:${capTextOn(st.c)}">${st.i} ${st.l}</span>${cat&&c.cat?`<span class="ana-dim">${cat}</span>`:''}${autre||stateTag}<span style="flex:1"></span>`+
    `<button class="crv-ib" data-a="go" title="${_L('Aller à la cible (diagramme ou élément)')}">➜</button><button class="crv-ib" data-a="edit" title="${_L('Modifier')}">✎</button></div>`+
    `<div class="crv-title" data-a="exp">${esc(titre)}</div><div class="crv-meta">${meta}</div>`+capRevTargetsHtml(c);
  if(open){
    if(c.title||String(c.text||'').includes('\n')||String(c.text||'').length>120) h+=`<div class="crv-text">${esc(c.text||'')}</div>`;
    if(c.verif) h+=`<div class="crv-meta">${_L(`✔ Vérifié le ${capRevDateTime(c.verif.date)}${c.verif.by?_L(' par ')+esc(c.verif.by):''}`)}</div>`;
    (c.replies||[]).forEach(r=>{ h+=`<div class="crv-reply"><div class="crv-meta">↩ ${esc(r.author||'?')} · ${capRevDateTime(r.date)}${r.avis?` · <b>${capRevAvis(r)}</b>`:''}</div>${esc(r.text)}</div>`; });
    h+=`<div class="crv-reply-f"><textarea id="crv-rep-${esc(c.id)}" rows="2" placeholder="${_L('Répondre…')}"></textarea><button class="cap-lf-btn" data-a="reply">${_L('↩ Répondre')}</button></div>`+
      `<div class="crv-acts"><select data-a="status" title="${_L('Changer le statut')}">${capRevStatuts().map(s=>`<option value="${s.k}"${s.k===c.status?' selected':''}>${s.i} ${s.l}</option>`).join('')}</select>`+
      (!capRevClosed(c)?`<button class="cap-lf-btn" data-a="validate" title="${_L('La correction a été vérifiée : le commentaire est clos')}">${_L('✔ Valider')}</button>`:'')+
      `<span style="flex:1"></span><button class="cap-lf-btn" data-a="del" title="${_L('Supprimer le commentaire')}">🗑</button></div>`;
  }
  return h+`</div>`;
}
/** Pastilles des cibles d'un commentaire (élément + champ, diagramme), cliquables. @param {object} c @returns {string} HTML */
function capRevTargetsHtml(c){
  const esc=capEsc;
  const t=(c.targets||[]).map(x=>{ const s=capRevTargetState(x), lv=CAP_LAYERS[x.layer]||{color:'#8b949e'};
    return `<span class="crv-tg${s==='deleted'?' crv-tg-del':s==='changed'?' crv-tg-chg':''}" data-open="${esc(x.id)}" title="${esc(x.type)}${x.field?' — '+esc(capRevFieldLabel(x.field)):''}">`+
      `${capIco(x.id,13)||capIcoType(x.type,13)}<span style="color:${lv.color};font-size:9px;font-weight:700">${esc(x.layer||'')}</span> ${esc(x.name||x.id.slice(0,12))}${x.field?` <i>· ${esc(capRevFieldLabel(x.field))}</i>`:''}</span>`; }).join('');
  const d=c.diag?`<span class="crv-tg crv-tg-diag" data-diag="${esc(c.diag.uid)}" title="${_L('Note sur le diagramme')}">🔲 ${esc(c.diag.nom||c.diag.uid)}</span>`:'';
  return t||d?`<div class="crv-tgs">${d}${t}</div>`:'';
}

/** Clics du panneau (délégation). @param {MouseEvent} e */
async function capRevPanelClick(e){
  const t=e.target, u=_capRevUi;
  const dk=t.closest('[data-dock]'); if(dk){ capDockShow(dk.dataset.dock); return; }
  const tab=t.closest('[data-tab]'); if(tab){ u.tab=tab.dataset.tab; capRevRender(); return; }
  const op=t.closest('[data-open]'); if(op){ capOpenDetailById(op.dataset.open); return; }
  const dg=t.closest('[data-diag]'); if(dg){ const c=capRevGet(t.closest('[data-c]')?.dataset.c); if(c) capRevGoto(c); return; }
  const a=t.closest('[data-a]'); if(!a||a.tagName==='SELECT') return;
  const card=t.closest('[data-c]'), c=card?capRevGet(card.dataset.c):null, act=a.dataset.a;
  if(act==='close'){ capRevToggle(false); return; }
  if(act==='dd'){ _capRevUi.dd=!_capRevUi.dd; capRevRender(); return; }
  if(act==='pop'){ if(capRevPop()) capRevPop().close(); else capRevPopOut(); return; }
  if(act==='tour'){ capTourRevue(); return; }
  if(act==='export'||act==='import'||act==='cible') _capRevUi.dd=false;
  if(act==='cible'){ capRevRender(); capRevCibleeDialog(); return; }
  if(act==='dossiers'){ u.dd=false; capRevRender(); capDosOuvrir(); return; }
  if(act==='dos-go'){ capDosOuvrir(a.dataset.dos); return; }
  if(act==='new'){ capRevNew(u.elId&&capGetElementById_(u.elId)?[{id:u.elId}]:[]); return; }
  if(act==='person-add'||act==='person-del'||act==='export'||act==='import'||act==='clear'||act==='me-save'){ capRevCfgAction(act, a); return; }
  if(act==='report-html'){ capRevReportHtml(); return; }
  if(act==='report-csv'){ capRevCsv(); return; }
  if(act==='check-all'){ capRevCheckAll(); return; }
  if(!c) return;
  if(act==='exp'){ if(u.exp.has(c.id)) u.exp.delete(c.id); else u.exp.add(c.id); capRevRender(); }
  else if(act==='edit') capRevEdit(c.id);
  else if(act==='go') capRevGoto(c);
  else if(act==='validate') capRevValidate(c);
  else if(act==='reopen'){ capRevResnap(c); capRevSave(c.id); }
  else if(act==='del'){ if(await capRevConfirm(_L(`Supprimer le commentaire #${c.num} ?`),{danger:true})){ _capRev.comments=_capRev.comments.filter(x=>x!==c); capRevSave(); } }
  else if(act==='reply'){
    const ta=capRevQ('crv-rep-'+c.id), txt=ta&&ta.value.trim(); if(!txt) return;
    (c.replies=c.replies||[]).push({author:_capRev.me||'', date:new Date().toISOString(), text:txt});
    c.updated=new Date().toISOString(); capRevSave(c.id);
  }
}
/** Saisie dans le panneau : recherche, réglages. @param {Event} e */
function capRevPanelInput(e){
  const t=e.target;
  if(t.id==='crv-q'){ _capRevUi.q=t.value; capRevRender(); }
}
/** Listes et cases du panneau : filtres, statut d'un commentaire, réglages. @param {Event} e */
function capRevPanelChange(e){
  const t=e.target, u=_capRevUi;
  const f={'crv-st':'st','crv-crit':'crit','crv-who':'who','crv-scope':'scope','crv-sort':'sort','crv-groupe':'groupe','crv-portee':'portee'}[t.id];
  if(f){ u[f]=t.value; capRevRender(); return; }
  if(t.id==='crv-reponses'){ u.reponses=t.checked; return; }
  if(t.dataset.a==='status'){ const c=capRevGet(t.closest('[data-c]').dataset.c); if(!c) return;
    c.status=t.value; c.updated=new Date().toISOString(); if(t.value==='done'&&!c.verif) c.verif={date:c.updated, by:_capRev.me||''}; capRevSave(c.id); return; }
  if(t.id==='crv-me'){ _capRev.me=t.value.trim(); capRevSave(); return; }
  if(t.dataset.fld){ _capRev.fields[t.dataset.fld]=t.checked; capRevSave(); return; }
  if(t.dataset.opt){ _capRev[t.dataset.opt]=t.checked; capRevSave(); return; }
}
/** @param {string} id @returns {object|undefined} commentaire */
function capRevGet(id){ return _capRev.comments.find(c=>c.id===id); }

/**
 * Montre la cible d'un commentaire : sa note dans le diagramme (s'il a été posé sur un diagramme et que le .aird
 * est chargé), sinon le panneau de détail de son premier élément.
 * @param {object} c - Commentaire
 */
function capRevGoto(c){
  if(c.diag&&typeof capDiagReps==='function'&&capDiagReps().some(r=>r.uid===c.diag.uid)){
    capDiagOpen(c.diag.uid);
    setTimeout(()=>{ capRevLayerDraw(); const n=document.querySelector(`#crv-layer .crv-note[data-c="${CSS.escape(c.id)}"]`); if(n){ n.classList.add('crv-flash'); setTimeout(()=>n.classList.remove('crv-flash'),1600); } },200);
    return;
  }
  const t=(c.targets||[]).find(x=>capLoaded&&capGetElementById_(x.id));
  if(t){ capOpenDetailById(t.id); return; }
  if(c.diag) capRevAlert(_L('Ce commentaire est posé sur un diagramme : ouvrez le .aird du projet dans 🔲 Diagrammes Capella pour voir la note.'));
}
/** Valide un commentaire (correction vérifiée) : statut Validé, date et vérificateur. @param {object} c */
function capRevValidate(c){
  c.status='done'; c.updated=new Date().toISOString(); c.verif={date:c.updated, by:_capRev.me||''};
  capRevResnap(c); capRevSave(c.id);
}
/** Prend la version actuelle du modèle comme nouvelle référence des cibles d'un commentaire. @param {object} c */
function capRevResnap(c){
  (c.targets||[]).forEach(t=>{ const n=capRevTarget(t.id,t.field); if(n){ t.snap=n.snap; t.name=n.name; } });
}

/* ── Éditeur d'un commentaire ──────────────────────────────────────────── */

/**
 * Nouveau commentaire : ouvre l'éditeur avec ses cibles (et sa note de diagramme) déjà renseignées.
 * @param {object[]} [cibles] - [{id, field}]
 * @param {object} [diag] - Note de diagramme {uid, nom, x, y, w, h}
 */
function capRevNew(cibles, diag){ capRevEdit(null, {targets:cibles||[], diag:diag||null}); }

/**
 * Éditeur d'un commentaire (fenêtre) : texte (seul champ obligatoire), titre, criticité, catégorie, statut,
 * auteur, échéance, responsables, étiquettes et cibles (éléments du modèle, champ commenté).
 * @param {string|null} id - Commentaire à modifier (null : nouveau)
 * @param {object} [preset] - Nouveau commentaire : {targets:[{id, field}], diag}
 */
function capRevEdit(id, preset){
  const c0=id?capRevGet(id):null; if(id&&!c0) return;
  const F=_capRev.fields, esc=capEsc, D=capRevDoc();
  // Brouillon : copie modifiable (les empreintes des cibles existantes sont gardées)
  const d=c0?JSON.parse(JSON.stringify(c0)):{title:'', text:'', crit:'', cat:'', status:'open', author:_capRev.me||'', due:'', assignees:[], tags:[],
    targets:(preset.targets||[]).map(t=>capRevTarget(t.id,t.field)).filter(Boolean), diag:preset.diag||null};
  ['assignees','tags','targets'].forEach(k=>{ if(!Array.isArray(d[k])) d[k]=[]; });   // commentaire importé incomplet
  let ov=D.getElementById('crv-ov');
  if(!ov){ ov=D.createElement('div'); ov.id='crv-ov'; D.body.appendChild(ov); }
  const people=()=>[...new Set([...capRevPeople(), ...d.assignees])].sort((a,b)=>a.localeCompare(b));
  const champs=t=>{ const el=capLoaded&&capGetElementById_(t.id); const ks=['', 'name', 'description', ...(el?Object.keys(el.attrs).filter(k=>!['id','name','description'].includes(k)&&!capParseAttrRefs_(String(el.attrs[k])).some(r=>capGetElementById_(r))):[])];
    if(!ks.includes(t.field)) ks.push(t.field);
    return ks.map(k=>`<option value="${esc(k)}"${k===t.field?' selected':''}>${esc(capRevFieldLabel(k))}</option>`).join(''); };
  const ciblesHtml=()=>(d.targets.map((t,i)=>{ const lv=CAP_LAYERS[t.layer]||{color:'#8b949e'};
      return `<div class="crv-ed-tg">${capIco(t.id,14)||capIcoType(t.type,14)}<span style="color:${lv.color};font-size:9px;font-weight:700">${esc(t.layer||'')}</span> <b>${esc(t.name||t.id)}</b> <span class="ana-dim">${esc(t.type)}</span>`+
        `<span style="flex:1"></span><select data-tf="${i}" title="${_L('Partie commentée')}">${champs(t)}</select><button class="crv-ib" data-tdel="${i}" title="${_L('Retirer')}">✕</button></div>`; }).join('')||
    _L('<div class="ana-dim">Aucun élément : commentaire général (ou ajoutez un élément ci-dessous).</div>'))+
    // Chaîne commentée : ses fonctions proposées en un clic
    d.targets.filter(t=>capRevChainFns(t.id).length).map(t=>{ const l=capRevChainFns(t.id).filter(f=>!d.targets.some(x=>x.id===f.id));
      return l.length?`<div class="crv-ed-sug"><span class="ana-dim">${_L(`⚡ Lier à des fonctions de « ${esc(t.name)} » :`)}</span> ${l.slice(0,40).map(f=>`<span class="crv-chip" data-add="${esc(f.id)}" title="${_L('Ajouter aux éléments commentés')}">＋ ${esc(f.nom)}</span>`).join('')}</div>`:''; }).join('');
  const persHtml=()=>people().map(p=>`<span class="crv-chip${d.assignees.includes(p)?' on':''}" data-pers="${esc(p)}">${esc(p)}</span>`).join('');
  const seg=(name,list,cur)=>list.map(x=>`<label class="crv-seg${x.k===cur?' on':''}"${x.c?` style="--crv-c:${x.c}"`:''}><input type="radio" name="${name}" value="${esc(x.k)}"${x.k===cur?' checked':''}>${x.l}</label>`).join('');
  ov.innerHTML=`<div class="cw-d-box" style="max-width:640px">
    <div class="cw-d-hdr"><b>${c0?_L(`💬 Commentaire #${c0.num}`):_L('💬 Nouveau commentaire')}</b><button class="cap-lf-btn" data-x="1">✕</button></div>
    <div class="cw-d-body crv-ed">
      ${F.title?`<label class="crv-ed-l">${_L('Titre')} <span class="ana-dim">${_L('(facultatif)')}</span></label><input id="crv-ed-title" class="crv-in" value="${esc(d.title)}">`:''}
      <label class="crv-ed-l">${_L('Commentaire')}</label><textarea id="crv-ed-text" class="crv-in" rows="5" placeholder="${_L('Remarque, question, correction attendue…')}">${esc(d.text)}</textarea>
      ${F.crit?`<label class="crv-ed-l">${_L('Criticité')}</label><div class="crv-segs">${seg('crv-crit',capRevCrits(),d.crit||'')}</div>`:''}
      ${F.cat?`<label class="crv-ed-l">${_L('Catégorie')}</label><div class="crv-segs">${seg('crv-cat',capRevCats(),d.cat||'')}</div>`:''}
      <div class="crv-ed-row">
        <div><label class="crv-ed-l">${_L('Statut')}</label><select id="crv-ed-status" class="crv-in">${capRevStatuts().map(s=>`<option value="${s.k}"${s.k===d.status?' selected':''}>${s.i} ${s.l}</option>`).join('')}</select></div>
        <div><label class="crv-ed-l">${_L('Auteur')}</label><input id="crv-ed-author" class="crv-in" list="crv-dl-people" value="${esc(d.author)}" placeholder="${_L('Votre nom')}"></div>
        ${F.due?`<div><label class="crv-ed-l">${_L('Échéance')}</label><input id="crv-ed-due" class="crv-in" type="date" value="${esc(d.due||'')}"></div>`:''}
      </div>
      ${F.assignees?`<label class="crv-ed-l">${_L('Responsables')} <span class="ana-dim">${_L('(clic pour attribuer ; nouvelle personne : saisir puis Entrée)')}</span></label>
        <div class="crv-chips" id="crv-ed-pers">${persHtml()}</div><input id="crv-ed-pers-new" class="crv-in" style="max-width:260px" placeholder="${_L('+ Ajouter une personne')}">`:''}
      ${F.tags?`<label class="crv-ed-l">${_L('Étiquettes')} <span class="ana-dim">${_L('(séparées par des virgules)')}</span></label><input id="crv-ed-tags" class="crv-in" value="${esc((d.tags||[]).join(', '))}">`:''}
      <label class="crv-ed-l">${_L('Éléments commentés')}</label><div id="crv-ed-tgs">${ciblesHtml()}</div>
      ${capLoaded?`<input id="crv-ed-find" class="crv-in" style="max-width:340px" placeholder="${_L('+ Ajouter un élément (nom ou type)…')}"><div id="crv-ed-res" class="crv-ed-res"></div>`:''}
      ${d.diag?`<div class="crv-meta" style="margin-top:8px">${_L(`🔲 Note sur le diagramme « ${esc(d.diag.nom||d.diag.uid)} »`)}${c0?` <label style="margin-left:8px"><input type="checkbox" id="crv-ed-nodiag"> ${_L('retirer la note du diagramme')}</label>`:''}</div>`:''}
      ${c0?`<div class="crv-meta" style="margin-top:8px">${_L(`Créé le ${capRevDateTime(c0.created)}${c0.model?_L(` sur « ${esc(c0.model)} »`):''}${c0.updated&&c0.updated!==c0.created?_L(` · modifié le ${capRevDateTime(c0.updated)}`):''}`)}</div>`:''}
    </div>
    <div class="cw-d-ftr">${c0?`<button class="cap-lf-btn" data-del="1">${_L('🗑 Supprimer')}</button>`:''}<span style="flex:1"></span>
      <button class="cap-lf-btn" data-x="1">${_L('Annuler')}</button><button class="phl-export-btn" data-ok="1" style="margin-left:0">${_L('✔ Enregistrer')}</button></div></div>
    <datalist id="crv-dl-people">${capRevPeople().map(p=>`<option value="${esc(p)}">`).join('')}</datalist>`;
  ov.style.display='flex';
  const fermer=()=>{ ov.style.display='none'; ov.innerHTML=''; };
  ov.onclick=async e=>{
    const t=e.target;
    if(t===ov||t.closest('[data-x]')){ fermer(); return; }
    const p=t.closest('[data-pers]'); if(p){ const k=p.dataset.pers; d.assignees=d.assignees.includes(k)?d.assignees.filter(x=>x!==k):[...d.assignees,k]; p.classList.toggle('on'); return; }
    const td=t.closest('[data-tdel]'); if(td){ d.targets.splice(+td.dataset.tdel,1); D.getElementById('crv-ed-tgs').innerHTML=ciblesHtml(); return; }
    const ad=t.closest('[data-add]'); if(ad){ if(!d.targets.some(x=>x.id===ad.dataset.add)){ const n=capRevTarget(ad.dataset.add,''); if(n) d.targets.push(n); }
      D.getElementById('crv-ed-tgs').innerHTML=ciblesHtml(); D.getElementById('crv-ed-res').innerHTML=''; D.getElementById('crv-ed-find').value=''; return; }
    if(t.closest('[data-del]')){ if(await capConfirm(_L(`Supprimer le commentaire #${c0.num} ?`),{win:D.defaultView, danger:true})){ _capRev.comments=_capRev.comments.filter(x=>x!==c0); fermer(); capRevSave(); } return; }
    if(t.closest('[data-ok]')) enregistrer();
  };
  ov.onchange=e=>{
    const t=e.target;
    if(t.dataset.tf!=null){ const tg=d.targets[+t.dataset.tf], n=capRevTarget(tg.id,t.value); if(n) d.targets[+t.dataset.tf]=n; else tg.field=t.value; }
    if(t.type==='radio') t.closest('.crv-segs').querySelectorAll('.crv-seg').forEach(l=>l.classList.toggle('on',l.contains(t)));
  };
  ov.oninput=e=>{
    if(e.target.id!=='crv-ed-find') return;
    const q=e.target.value.trim().toLowerCase(), res=D.getElementById('crv-ed-res');
    if(q.length<2){ res.innerHTML=''; return; }
    const hits=capAllElements.filter(x=>(x.attrs.name||'').toLowerCase().includes(q)||x.typeName.toLowerCase().includes(q)).slice(0,12);
    res.innerHTML=hits.map(x=>`<div class="ctx-i" data-add="${esc(x.id)}">${capIco(x.id,14)}<span style="color:${(CAP_LAYERS[x.layer]||{}).color||'#8b949e'};font-size:9px;font-weight:700">${esc(x.layer)}</span> ${esc(x.attrs.name||'—')} <span class="ana-dim">${esc(x.typeName)}</span></div>`).join('')||_L('<div class="ana-dim">Aucun élément.</div>');
  };
  ov.onkeydown=e=>{
    if(e.key==='Escape'){ fermer(); return; }
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); enregistrer(); return; }
    if(e.key==='Enter'&&e.target.id==='crv-ed-pers-new'){ e.preventDefault(); const v=e.target.value.trim(); if(!v) return;
      if(!_capRev.people.includes(v)) _capRev.people.push(v);
      if(!d.assignees.includes(v)) d.assignees.push(v);
      e.target.value=''; D.getElementById('crv-ed-pers').innerHTML=persHtml(); }
  };
  /** Enregistre le brouillon dans la revue. */
  function enregistrer(){
    const v=k=>{ const x=D.getElementById(k); return x?x.value.trim():null; };
    const text=v('crv-ed-text');
    if(!text&&!(v('crv-ed-title'))){ const ta=D.getElementById('crv-ed-text'); ta.classList.add('crv-req'); ta.focus(); return; }
    d.text=text; if(F.title) d.title=v('crv-ed-title');
    const r=n=>{ const x=ov.querySelector(`input[name="${n}"]:checked`); return x?x.value:''; };
    if(F.crit) d.crit=r('crv-crit'); if(F.cat) d.cat=r('crv-cat');
    d.status=v('crv-ed-status')||'open'; d.author=v('crv-ed-author')||'';
    if(F.due) d.due=v('crv-ed-due')||'';
    if(F.tags) d.tags=(v('crv-ed-tags')||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(D.getElementById('crv-ed-nodiag')?.checked) d.diag=null;
    if(d.author&&!_capRev.me) _capRev.me=d.author;   // le premier auteur saisi devient l'auteur par défaut
    if(d.author&&!_capRev.people.includes(d.author)) _capRev.people.push(d.author);
    const now=new Date().toISOString();
    if(d.status==='done'&&(!c0||c0.status!=='done')) d.verif={date:now, by:_capRev.me||d.author||''};
    if(c0){ Object.assign(c0, d, {updated:now}); fermer(); capRevSave(c0.id); return; }
    const c=Object.assign(d, {id:capRevUid(), num:++_capRev.seq, created:now, updated:now, model:capCurrentFileName||'', project:capRevProjectId(), view:capCurrentView||'', replies:[]});
    _capRev.comments.push(c); _capRevUi.exp.add(c.id);
    fermer(); capRevSave(c.id);
    if(typeof capWatchFlash==='function') capWatchFlash(_L(`✔ Commentaire #${c.num} enregistré — 💬 Revue pour la liste`));
  }
  setTimeout(()=>D.getElementById('crv-ed-text')?.focus(),30);
}

/* ── Panneau de détail : boutons et section « Commentaires » ────────────── */

/**
 * Boutons 💬 du panneau de détail, sous le nom de l'élément : commenter l'élément, son nom, sa description.
 * @param {object} el - Élément affiché
 * @returns {string} HTML
 */
function capRevDetailHead(el){
  _capRevUi.elId=el.id;
  const id=capEsc(el.id), n=_capRev.comments.filter(c=>!capRevClosed(c)&&(c.targets||[]).some(t=>t.id===el.id)).length;
  return `<div class="crv-det-bar"><button class="cap-lf-btn" onclick="capRevNew([{id:'${id}',field:''}])" title="${_L('Commenter cet élément (revue)')}">${_L('💬 Commenter')}</button>`+
    `<button class="cap-lf-btn" onclick="capRevNew([{id:'${id}',field:'name'}])" title="${_L('Commenter le nom de cet élément')}">${_L('💬 le nom')}</button>`+
    (el.attrs.description?`<button class="cap-lf-btn" onclick="capRevNew([{id:'${id}',field:'description'}])" title="${_L('Commenter la description de cet élément')}">${_L('💬 la description')}</button>`:'')+
    (n?`<span class="crv-det-n" onclick="capRevShowFor('${id}')" title="${_L('Commentaires non clos sur cet élément')}">${_L(`💬 ${n} ouvert(s)`)}</span>`:'')+`</div>`;
}
/**
 * Petit bouton 💬 d'un attribut du panneau de détail (visible au survol) : commenter cet attribut.
 * @param {string} id - Élément
 * @param {string} k - Attribut
 * @returns {string} HTML
 */
function capRevAttrBtn(id, k){
  return `<span class="crv-attr-b" onclick="event.stopPropagation();capRevNew([{id:'${capEsc(id)}',field:'${capEsc(k)}'}])" title="${_L('Commenter cet attribut (revue)')}">💬</span>`;
}
/**
 * Section « Commentaires » du panneau de détail : commentaires portant sur l'élément.
 * @param {string} id - Élément
 * @param {function(string,string):string} secTitle - Titre de section du panneau
 * @returns {string} HTML ('' sans commentaire)
 */
function capRevDetailSection(id, secTitle){
  _capRevUi.secTitle=secTitle;
  return `<div id="crv-det-sec" data-el="${capEsc(id)}" data-tab="revue">${capRevDetailSectionIn(id, secTitle)}</div>`;   // data-tab : onglet 💬 Revue du panneau (77)
}
/**
 * Contenu de la section « Commentaires » du panneau de détail.
 * @param {string} id - Élément
 * @param {function(string,string):string} secTitle - Titre de section du panneau
 * @returns {string} HTML ('' sans commentaire)
 */
function capRevDetailSectionIn(id, secTitle){
  const l=_capRev.comments.filter(c=>(c.targets||[]).some(t=>t.id===id)).sort((a,b)=>capRevClosed(a)-capRevClosed(b)||b.num-a.num);
  if(!l.length) return '';
  return secTitle(_L(`💬 Commentaires de revue (${l.length})`),'#e3b341')+l.slice(0,30).map(c=>{
    const st=capRevSt(c), cr=capRevCr(c), f=(c.targets||[]).filter(t=>t.id===id).map(t=>capRevFieldLabel(t.field)).join(', ');
    return `<div class="crv-det-c${capRevClosed(c)?' closed':''}" style="--crv-c:${cr.c}" onclick="capRevShow('${capEsc(c.id)}')" title="${_L('Afficher dans 💬 Revue')}">`+
      `<span class="crv-num">#${c.num}</span> <span style="color:${capTextOn(st.c)}">${st.i}</span> ${capEsc(c.title||String(c.text||'').slice(0,90))} <span class="ana-dim">· ${capEsc(f)}</span></div>`; }).join('');
}
/** Ouvre 💬 Revue sur un commentaire (déplié). @param {string} id */
function capRevShow(id){
  const c=capRevGet(id); if(!c) return;
  Object.assign(_capRevUi,{tab:'list', q:'#'+c.num, st:'all', crit:'', who:'', scope:'all'}); _capRevUi.exp.add(id);
  capRevToggle(true);
}
/** Ouvre 💬 Revue sur les commentaires d'un élément. @param {string} id */
function capRevShowFor(id){ Object.assign(_capRevUi,{tab:'list', q:'', st:'notclosed', scope:'el', elId:id}); capRevToggle(true); }

/* ── Clic droit dans les vues : commenter l'élément pointé ─────────────── */

/** Attributs portant l'identifiant d'un élément du modèle dans les vues (blocs, tableaux, listes, diagrammes). */
const CAP_REV_ID_ATTRS=['data-sem','data-fn','data-cid','data-id','data-ref','data-lid','data-comp','data-fexfn','data-go','data-open','data-sel','data-hlink','data-chain'];
/**
 * Chaîne (⚡ Chaînes) dans laquelle se trouve un élément de l'interface : carte de chaîne ou graphe de la vue Relation Map des chaînes.
 * @param {Element} n - Élément cliqué
 * @returns {string} identifiant de la chaîne ('' hors chaîne)
 */
function capRevChainAt(n){
  const c=n&&n.closest&&n.closest('.cap-chain-card[data-chain]'); if(c) return c.dataset.chain;
  return n&&n.closest&&n.closest('#cap-chainmap-wrap')&&typeof capChainsSelectedId!=='undefined'&&capChainsSelectedId?capChainsSelectedId:'';
}
/**
 * Fonctions (ou composants) d'une chaîne, pour les proposer comme éléments commentés.
 * @param {string} id - Chaîne
 * @returns {{id:string, nom:string}[]} éléments du modèle de la chaîne
 */
function capRevChainFns(id){
  if(!capLoaded||typeof capComputeChains!=='function') return [];
  if(!capChainsData) capChainsData=capComputeChains();
  const c=capChainsData.find(x=>x.id===id), vus=new Set();
  return c?(c.graph&&c.graph.nodes||[]).filter(n=>n.refId&&!vus.has(n.refId)&&vus.add(n.refId)).map(n=>({id:n.refId, nom:n.name})):[];
}
/**
 * Élément du modèle désigné par un nœud de l'interface (lui ou un de ses parents) : attribut d'identifiant
 * ou appel capOpenDetail('…') au clic.
 * @param {Element} n - Nœud pointé
 * @returns {object|null} Élément du modèle
 */
function capRevElementAt(n){
  for(let x=n; x&&x.nodeType===1&&x!==document.body; x=x.parentElement){
    for(const a of CAP_REV_ID_ATTRS){ const v=x.getAttribute(a); if(v){ const el=capGetElementById_(v); if(el) return el; } }
    const oc=x.getAttribute('onclick'); const m=oc&&/capOpenDetail(?:ById)?\('([^']+)'/.exec(oc);
    if(m){ const el=capGetElementById_(m[1]); if(el) return el; }
  }
  return null;
}
/**
 * Menu du clic droit dans les vues : sur un élément, commenter l'élément, son nom, sa description, voir ses commentaires.
 * Dans un diagramme (sur un élément ou dans un espace vide), les commentaires sont toujours rattachés au diagramme :
 * une note de revue est posée à l'endroit du clic (liée à l'élément s'il y en a un).
 * @param {MouseEvent} e
 */
function capRevContext(e){
  if(e.defaultPrevented||!capLoaded||e.ctrlKey||e.shiftKey) return;
  if(!e.target.closest('#cap-content,#cap-detail-content,#rm-detail-content')) return;
  if(e.target.closest('input,textarea,select,.crv-note,.crv-linkbar')) return;
  const svg=document.getElementById('vd-svg'), zone=document.getElementById('vd-zone');
  const uid=capRevDiagUid(), inDiag=!!(uid&&zone&&zone.contains(e.target)&&svg&&svg.getBoundingClientRect().width);
  const el=capRevElementAt(e.target); if(!el&&!inDiag) return;
  e.preventDefault();
  const esc=capEsc, id=el?esc(el.id):'', x=e.clientX, y=e.clientY;
  let m=document.getElementById('crv-ctx');
  if(!m){ m=document.createElement('div'); m.id='crv-ctx'; document.body.appendChild(m);
    document.addEventListener('mousedown',ev=>{ if(!ev.target.closest('#crv-ctx')) m.style.display='none'; });
    m.addEventListener('click',()=>{ m.style.display='none'; }); }
  // Dans un diagramme : note posée à côté de l'élément (ou au point cliqué dans un espace vide)
  const note=(f,l)=>`<div class="ctx-i" onclick="capRevDiagNoteAt(${el?x+24:x},${el?y-140:y},'${id}','${f}')">${l}</div>`;
  let h;
  if(inDiag){
    const rep=capDiagReps().find(r=>r.uid===uid)||{}, nd=_capRev.comments.filter(c=>c.diag&&c.diag.uid===uid).length;
    h=el?`<div class="crv-ctx-t">${capIco(el.id,14)}${esc(el.attrs.name||el.typeName)} <span class="ana-dim">${esc(el.typeName)}</span></div>`+
        note('',_L('📝 Note de revue ici, liée à l\'élément'))+note('name',_L('📝 Note sur son nom'))+
        (el.attrs.description?note('description',_L('📝 Note sur sa description')):'')
      :`<div class="crv-ctx-t">🔲 ${esc(rep.nom||'')}</div>`+note('',_L('📝 Note de revue ici'));
    if(nd) h+=`<div class="ctx-i" onclick="capRevShowDiag()">${_L(`📄 Notes de ce diagramme (${nd})`)}</div>`;
    h+=`<div class="ctx-i" onclick="capDgwOuvrir('${esc(uid)}')">${_L('⧉ Afficher dans la fenêtre de comparaison')}</div>`;   // 83
  } else {
    // Dans une chaîne (carte ou graphe) : le commentaire d'une fonction est aussi rattaché à la chaîne
    const chId=capRevChainAt(e.target), ch=chId&&chId!==el.id&&capGetElementById_(chId), plus=ch?`,{id:'${esc(chId)}',field:''}`:'';
    h=`<div class="crv-ctx-t">${capIco(el.id,14)}${esc(el.attrs.name||el.typeName)} <span class="ana-dim">${esc(el.typeName)}</span></div>`+
      (ch?`<div class="crv-ctx-t ana-dim" style="font-weight:400">${_L(`⚡ lié à la chaîne « ${esc(ch.attrs.name||'')} »`)}</div>`:'')+
      `<div class="ctx-i" onclick="capRevNew([{id:'${id}',field:''}${plus}])">${_L('💬 Commenter l\'élément')}</div>`+
      `<div class="ctx-i" onclick="capRevNew([{id:'${id}',field:'name'}${plus}])">${_L('💬 Commenter son nom')}</div>`+
      (el.attrs.description?`<div class="ctx-i" onclick="capRevNew([{id:'${id}',field:'description'}${plus}])">${_L('💬 Commenter sa description')}</div>`:'')+
      (ch?`<div class="ctx-i" onclick="capRevNew([{id:'${esc(chId)}',field:''}])">${_L('💬 Commenter la chaîne seule')}</div>`:'');
  }
  if(el){
    const n=_capRev.comments.filter(c=>(c.targets||[]).some(t=>t.id===el.id)).length;
    h+=(n?`<div class="ctx-i" onclick="capRevShowFor('${id}')">${_L(`📄 Voir ses commentaires (${n})`)}</div>`:'')+
      `<div class="ctx-i" onclick="capOpenDetailById('${id}')">${_L('🔍 Détail de l\'élément')}</div>`+
      (typeof capTraceCatOf==='function'&&capTraceCatOf(el.typeName)?`<div class="ctx-i" onclick="capXlOpen('${id}')">${_L('⇶ Liens entre couches')}</div>`:'');
  }
  m.innerHTML=h; m.style.display='block';
  const r=m.getBoundingClientRect();
  m.style.left=Math.min(x, innerWidth-r.width-8)+'px'; m.style.top=Math.min(y, innerHeight-r.height-8)+'px';
}
/** Ouvre 💬 Revue sur les notes du diagramme ouvert. */
function capRevShowDiag(){ Object.assign(_capRevUi,{tab:'list', q:'', st:'all', crit:'', who:'', scope:'diag'}); capRevToggle(true); }

/* ── Marques des éléments commentés dans les vues ──────────────────────── */

let _capRevMarkT=0;
/** Programme la mise à jour des marques 💬 (après un rendu de vue). */
function capRevMarkSchedule(){ clearTimeout(_capRevMarkT); _capRevMarkT=setTimeout(capRevMark,150); }
/** Marque d'un 💬 les blocs, cartes et noms cliquables des éléments qui ont des commentaires non clos. */
function capRevMark(){
  const root=document.getElementById('cap-content'); if(!root) return;
  root.querySelectorAll('.crv-mk').forEach(x=>{ x.classList.remove('crv-mk'); x.removeAttribute('data-crv'); });
  if(!_capRev.mark||!capLoaded) return;
  const ids=new Map();
  _capRev.comments.forEach(c=>{ if(!capRevClosed(c)) (c.targets||[]).forEach(t=>ids.set(t.id,(ids.get(t.id)||0)+1)); });
  if(!ids.size) return;
  root.querySelectorAll('.fex-blk[data-fn],.cap-card[onclick],.cex-det[onclick],.cap-det-link[onclick],.cap-chain-card[data-chain]').forEach(x=>{
    const id=x.dataset.fn||x.dataset.chain||(/capOpenDetail(?:ById)?\('([^']+)'/.exec(x.getAttribute('onclick')||'')||[])[1];
    const n=id&&ids.get(id); if(n){ x.classList.add('crv-mk'); x.setAttribute('data-crv',n); }
  });
}

/* ── Calque des commentaires sur les diagrammes ─────────────────────────── */

/** @returns {string} identifiant du diagramme ouvert dans la visionneuse ('' sinon) */
function capRevDiagUid(){ const li=document.querySelector('#diag-liste li.actif[data-diag]'); return li?li.dataset.diag:''; }
/**
 * Commandes de la revue dans la barre de 🔲 Diagrammes Capella : 📝 Note (à glisser sur le diagramme) et
 * affichage du calque. Appelé par capDiagBarre (54-diagrammes.js).
 * @returns {string} HTML
 */
function capRevDiagBar(){
  setTimeout(capRevLayerEnsure,0);
  if(!_capDiag.airdCharge) return '';
  const uid=capRevDiagUid(), n=uid?_capRev.comments.filter(c=>c.diag&&c.diag.uid===uid).length:0;
  return `<span class="crv-drag" id="cdg-crv-note" draggable="true" title="${_L('Note de revue : glissez-la sur le diagramme (déposée sur un élément, elle lui est liée) ou cliquez pour la poser au centre. Les notes forment un calque indépendant du .aird.')}"><span class="crv-drag-h">⠿</span>${_L('📝 Note de revue')}</span>`+
    `<button class="bt bt-petit${_capRev.layer?' actif':''}" id="cdg-crv-layer" title="${_L('Afficher ou masquer le calque des notes de revue (indépendant du .aird)')}">${_L('💬 Calque')} <span class="cdg-nb">${n}</span></button>`;
}
/** Installe (une fois) le calque des commentaires au-dessus du diagramme et ses écouteurs. */
function capRevLayerEnsure(){
  const zone=document.getElementById('vd-zone'), box=document.getElementById('cap-view-diag');
  if(!zone||!box) return;
  if(!box._crv){
    box._crv=true;
    box.addEventListener('click',e=>{
      if(e.target.closest('#cdg-crv-layer')){ _capRev.layer=!_capRev.layer; capRevSave(); return; }
      if(e.target.closest('#cdg-crv-note')) capRevDiagNoteAt(null,null,'');
    });
    box.addEventListener('dragstart',e=>{ if(e.target.id==='cdg-crv-note'){ e.dataTransfer.setData('application/x-arcalyse-note','1'); e.dataTransfer.effectAllowed='copy'; } });
  }
  if(zone._crv) return;
  zone._crv=true;
  if(getComputedStyle(zone).position==='static') zone.style.position='relative';
  const L=document.createElement('div'); L.id='crv-layer'; zone.appendChild(L);
  const estNote=e=>[...(e.dataTransfer&&e.dataTransfer.types||[])].includes('application/x-arcalyse-note');
  zone.addEventListener('dragover',e=>{ if(estNote(e)){ e.preventDefault(); e.dataTransfer.dropEffect='copy'; } });
  zone.addEventListener('drop',e=>{
    if(!estNote(e)) return; e.preventDefault(); e.stopPropagation();
    const sem=document.elementsFromPoint(e.clientX,e.clientY).map(x=>x.closest&&x.closest('#vd-svg [data-sem]')).find(Boolean);
    capRevDiagNoteAt(e.clientX,e.clientY, sem?sem.getAttribute('data-sem'):'');
  });
  // Mode 🔗 Lier : un clic sur un élément du diagramme le lie à la note (ou le délie) au lieu de l'ouvrir
  const lier=e=>{
    if(!_capRevUi.link) return;
    const s=e.target.closest&&e.target.closest('#vd-svg [data-sem]'); if(!s) return;
    e.stopPropagation(); e.preventDefault();
    if(e.type!=='click') return;
    capRevToggleTarget(_capRevUi.link, s.getAttribute('data-sem'));
  };
  ['click','dblclick','pointerdown','mousedown'].forEach(t=>zone.addEventListener(t,lier,true));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&_capRevUi.link){ _capRevUi.link=''; capRevLayerDraw(); } });
  // Zoom, déplacement, autre diagramme : la visionneuse modifie le viewBox ou redessine le SVG
  let raf=0;
  new MutationObserver(ms=>{ if(ms.every(m=>L.contains(m.target))) return; cancelAnimationFrame(raf); raf=requestAnimationFrame(capRevLayerDraw); })
    .observe(zone,{subtree:true, childList:true, attributes:true, attributeFilter:['viewBox']});
  window.addEventListener('resize',()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(capRevLayerDraw); });
  capRevLayerDraw();
}
/**
 * Pose une note de revue sur le diagramme ouvert, à un point de l'écran (centre de la vue par défaut),
 * liée à un élément s'il est donné, puis ouvre l'éditeur.
 * @param {number|null} x - Abscisse écran
 * @param {number|null} y - Ordonnée écran
 * @param {string} [id] - Élément lié
 * @param {string} [field] - Partie commentée de l'élément ('' : élément entier, 'name', 'description')
 */
function capRevDiagNoteAt(x, y, id, field){
  const svg=document.getElementById('vd-svg'), uid=capRevDiagUid(), m=svg&&svg.getScreenCTM();
  if(!uid||!m||!svg.getBoundingClientRect().width){ capAlert(_L('Ouvrez d\'abord un diagramme (les tableaux du .aird ne portent pas de notes).')); return; }
  const r=svg.getBoundingClientRect();
  if(x==null){ x=r.left+r.width/2-100; y=r.top+r.height/2-55; }
  const p=new DOMPoint(x,y).matrixTransform(m.inverse()), k=m.a||1;
  const rep=capDiagReps().find(z=>z.uid===uid)||{};
  if(!_capRev.layer){ _capRev.layer=true; capRevSave(); }
  capRevNew(id?[{id, field:field||''}]:[], {uid, nom:rep.nom||'', x:Math.round(p.x), y:Math.round(p.y), w:Math.round(200/k), h:Math.round(110/k)});
}
/**
 * Boîte d'un élément du diagramme en coordonnées du diagramme (union de ses formes dessinées).
 * @param {SVGSVGElement} svg - SVG de la visionneuse
 * @param {DOMMatrix} inv - Inverse de la matrice écran du SVG
 * @param {string} id - Élément
 * @returns {{x:number,y:number,w:number,h:number}|null}
 */
function capRevDiagBox(svg, inv, id){
  let b=null;
  svg.querySelectorAll(`[data-sem="${CSS.escape(id)}"]`).forEach((n,i)=>{
    if(i>20) return;
    const r=n.getBoundingClientRect(); if(!r.width&&!r.height) return;
    const a=new DOMPoint(r.left,r.top).matrixTransform(inv), z=new DOMPoint(r.right,r.bottom).matrixTransform(inv);
    const q={x1:Math.min(a.x,z.x), y1:Math.min(a.y,z.y), x2:Math.max(a.x,z.x), y2:Math.max(a.y,z.y)};
    if(!b||(q.x2-q.x1)*(q.y2-q.y1)>(b.x2-b.x1)*(b.y2-b.y1)) b=q;   // la plus grande forme (le cadre plutôt que le libellé)
  });
  return b&&{x:b.x1, y:b.y1, w:b.x2-b.x1, h:b.y2-b.y1};
}
/**
 * Dessine les notes du diagramme ouvert sur le calque : un plan qui suit le zoom et le déplacement
 * de la visionneuse (matrice écran du SVG), les notes à leur position, les liens vers leurs éléments.
 */
function capRevLayerDraw(){
  const L=document.getElementById('crv-layer'), svg=document.getElementById('vd-svg'), zone=document.getElementById('vd-zone');
  if(!L||!svg||!zone) return;
  const uid=capRevDiagUid(), u=_capRevUi;
  const nb=document.querySelector('#cdg-crv-layer .cdg-nb'); if(nb) nb.textContent=uid?_capRev.comments.filter(c=>c.diag&&c.diag.uid===uid).length:0;
  const list=uid&&_capRev.layer?_capRev.comments.filter(c=>c.diag&&c.diag.uid===uid&&(_capRev.layerDone||!capRevClosed(c)||c.id===u.link)):[];
  const m=svg.getScreenCTM(), sr=svg.getBoundingClientRect();
  if(!list.length||!m||!sr.width){ if(L.innerHTML) L.innerHTML=''; return; }
  const zr=zone.getBoundingClientRect(), inv=m.inverse(), esc=capEsc;
  const tx=m.e-zr.left-zone.clientLeft, ty=m.f-zr.top-zone.clientTop;
  let liens='', notes='';
  list.forEach(c=>{
    const d=c.diag, cr=capRevCr(c), st=capRevSt(c), col=c.crit?cr.c:'#e3b341', mini=!!d.min;
    const w=mini?28/m.a:d.w, h=mini?28/m.a:d.h, cx=d.x+w/2, cy=d.y+h/2;
    (c.targets||[]).forEach(t=>{
      const b=capRevDiagBox(svg,inv,t.id); if(!b) return;
      liens+=`<rect x="${b.x-3}" y="${b.y-3}" width="${b.w+6}" height="${b.h+6}" rx="3" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="6 3" vector-effect="non-scaling-stroke"/>`+
        `<line x1="${cx}" y1="${cy}" x2="${b.x+b.w/2}" y2="${b.y+b.h/2}" stroke="rgba(0,0,0,.35)" stroke-width="4" vector-effect="non-scaling-stroke"/>`+
        `<line x1="${cx}" y1="${cy}" x2="${b.x+b.w/2}" y2="${b.y+b.h/2}" stroke="${col}" stroke-width="2.2" stroke-dasharray="7 3" vector-effect="non-scaling-stroke"/>`+
        `<circle class="crv-unlink" data-unlink="${esc(c.id)}" data-t="${esc(t.id)}" cx="${(cx+b.x+b.w/2)/2}" cy="${(cy+b.y+b.h/2)/2}" r="${6/m.a}" fill="${col}" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke">`+
        `<title>${esc(_L(`Délier « ${t.name||t.id} » de la note`))}</title></circle>`;
    });
    const titre=c.title||'', texte=c.text||'';
    notes+=mini?`<div class="crv-note crv-mini${u.link===c.id?' crv-linking':''}" data-c="${esc(c.id)}" style="left:${d.x}px;top:${d.y}px;width:${w}px;height:${h}px;--crv-c:${col};font-size:${12/m.a}px" title="${esc('#'+c.num+' '+(titre||texte).slice(0,200))}"><span data-n="max">${c.num}</span></div>`
      :`<div class="crv-note${capRevClosed(c)?' closed':''}${u.link===c.id?' crv-linking':''}" data-c="${esc(c.id)}" style="left:${d.x}px;top:${d.y}px;width:${w}px;height:${h}px;--crv-c:${col}">`+
      `<div class="crv-note-h" data-n="move"><b>#${c.num}</b>${c.crit?` <span class="crv-note-cr">${cr.l}</span>`:''} <span title="${st.l}">${st.i}</span>`+
      `<span style="flex:1"></span><span class="crv-nb" data-n="link" title="${_L('Lier / délier des éléments du diagramme (clic sur les éléments, Échap pour terminer)')}">🔗</span>`+
      `<span class="crv-nb" data-n="edit" title="${_L('Modifier')}">✎</span><span class="crv-nb" data-n="min" title="${_L('Réduire en pastille')}">▁</span></div>`+
      `<div class="crv-note-b" data-n="edit2">${titre?`<b>${esc(titre)}</b><br>`:''}${esc(texte)}${(c.assignees||[]).length?`<div class="crv-note-m">👥 ${esc(c.assignees.join(', '))}</div>`:''}</div>`+
      `<div class="crv-note-ln" data-n="line" title="${_L('Tirer un trait jusqu\'à un élément du diagramme pour le lier à la note (vers un élément déjà lié : le délier)')}"></div>`+
      `<div class="crv-note-rz" data-n="size" title="${_L('Redimensionner')}"></div></div>`;
  });
  const lk=u.link&&capRevGet(u.link);
  L.innerHTML=`<div class="crv-plan" style="transform:matrix(${m.a},${m.b},${m.c},${m.d},${tx},${ty})"><svg class="crv-links" width="1" height="1">${liens}</svg>${notes}</div>`+
    (lk?`<div class="crv-linkbar">${_L(`🔗 Cliquez les éléments du diagramme à lier à la note #${lk.num} (nouveau clic : délier)`)} <button class="cap-lf-btn" data-n="linkend">${_L('✔ Terminer')}</button></div>`:'');
  if(!L._ev){ L._ev=true;
    L.addEventListener('pointerdown',capRevNoteDown);
    ['click','dblclick','mousedown','wheel'].forEach(t=>L.addEventListener(t,e=>{ if(e.target.closest('.crv-note,.crv-linkbar')&&t!=='wheel') e.stopPropagation(); }));
    L.addEventListener('click',capRevNoteClick);
    L.addEventListener('click',e=>{ const u=e.target.closest('[data-unlink]'); if(!u) return; e.stopPropagation(); capRevToggleTarget(u.dataset.unlink, u.dataset.t); });
    L.addEventListener('dblclick',e=>{ const n=e.target.closest('.crv-note'); if(n&&e.target.closest('[data-n="edit2"]')) capRevEdit(n.dataset.c); });
  }
}
/** Boutons d'une note du calque : lier, modifier, réduire / agrandir. @param {MouseEvent} e */
function capRevNoteClick(e){
  const b=e.target.closest('[data-n]'); if(!b) return;
  if(b.dataset.n==='linkend'){ _capRevUi.link=''; capRevLayerDraw(); return; }
  const n=e.target.closest('.crv-note'), c=n&&capRevGet(n.dataset.c); if(!c) return;
  const a=b.dataset.n;
  if(a==='link'){ _capRevUi.link=_capRevUi.link===c.id?'':c.id; capRevLayerDraw(); }
  else if(a==='edit') capRevEdit(c.id);
  else if(a==='min'){ c.diag.min=true; capRevSave(c.id); }
}
/**
 * Lie un élément à un commentaire, ou le délie s'il l'était déjà.
 * @param {string} cid - Commentaire
 * @param {string} id - Élément du modèle
 */
function capRevToggleTarget(cid, id){
  const c=capRevGet(cid); if(!c||!id) return;
  if((c.targets||[]).some(t=>t.id===id)) c.targets=c.targets.filter(t=>t.id!==id);
  else { const t=capRevTarget(id,''); if(!t) return; (c.targets=c.targets||[]).push(t); }
  c.updated=new Date().toISOString(); capRevSave(c.id);
}
/**
 * Trait tiré depuis la poignée ● d'une note : suit le pointeur (élément visé en surbrillance) ;
 * relâché sur un élément du diagramme, il le lie à la note (ou le délie s'il l'était).
 * @param {PointerEvent} e - Appui sur la poignée
 * @param {HTMLElement} n - Note
 * @param {object} c - Commentaire
 * @param {DOMMatrix} m - Matrice écran du SVG de la visionneuse
 */
function capRevNoteLine(e, n, c, m){
  const d=c.diag, inv=m.inverse(), x1=d.x+d.w, y1=d.y+d.h/2, NS='http://www.w3.org/2000/svg';
  const links=document.querySelector('#crv-layer .crv-links'); if(!links) return;
  const ln=document.createElementNS(NS,'line'), cadre=document.createElementNS(NS,'rect');
  [['x1',x1],['y1',y1],['x2',x1],['y2',y1],['stroke','var(--c-accent)'],['stroke-width','2.5'],['vector-effect','non-scaling-stroke']].forEach(([k,v])=>ln.setAttribute(k,v));
  [['fill','none'],['stroke','var(--c-accent)'],['stroke-width','3'],['rx','3'],['vector-effect','non-scaling-stroke'],['visibility','hidden']].forEach(([k,v])=>cadre.setAttribute(k,v));
  links.append(cadre, ln);
  const cible=ev=>{ const s=document.elementsFromPoint(ev.clientX,ev.clientY).map(x=>x.closest&&x.closest('#vd-svg [data-sem]')).find(Boolean);
    return s&&capGetElementById_(s.getAttribute('data-sem'))?s.getAttribute('data-sem'):''; };
  const bouge=ev=>{
    const p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(inv); ln.setAttribute('x2',p.x); ln.setAttribute('y2',p.y);
    const id=cible(ev), b=id&&capRevDiagBox(document.getElementById('vd-svg'),inv,id);
    if(b){ cadre.setAttribute('x',b.x-4); cadre.setAttribute('y',b.y-4); cadre.setAttribute('width',b.w+8); cadre.setAttribute('height',b.h+8); }
    cadre.setAttribute('visibility',b?'visible':'hidden');
  };
  const fin=ev=>{ n.removeEventListener('pointermove',bouge); n.removeEventListener('pointerup',fin); n.removeEventListener('pointercancel',fin);
    ln.remove(); cadre.remove();
    if(ev.type==='pointerup'){ const id=cible(ev); if(id) capRevToggleTarget(c.id,id); } };
  n.setPointerCapture(e.pointerId);
  n.addEventListener('pointermove',bouge); n.addEventListener('pointerup',fin); n.addEventListener('pointercancel',fin);
}
/** Glisser une note (en-tête ou pastille), la redimensionner (coin) ou tirer un trait vers un élément (poignée ●). @param {PointerEvent} e */
function capRevNoteDown(e){
  const h=e.target.closest('[data-n="move"],[data-n="size"],[data-n="max"],[data-n="line"]'), n=e.target.closest('.crv-note');
  if(!n||!h||e.button!==0) return;
  if(e.target.closest('.crv-nb')) return;
  e.stopPropagation(); e.preventDefault();
  const c=capRevGet(n.dataset.c), svg=document.getElementById('vd-svg'), m=svg&&svg.getScreenCTM(); if(!c||!m) return;
  if(h.dataset.n==='line'){ capRevNoteLine(e, n, c, m); return; }
  const d=c.diag, x0=e.clientX, y0=e.clientY, o={x:d.x, y:d.y, w:d.w, h:d.h}, size=h.dataset.n==='size';
  n._moved=false; n.setPointerCapture(e.pointerId);
  const bouge=ev=>{
    const dx=(ev.clientX-x0)/m.a, dy=(ev.clientY-y0)/m.d;
    if(Math.abs(ev.clientX-x0)+Math.abs(ev.clientY-y0)>3) n._moved=true;
    if(size){ d.w=Math.max(60/m.a,o.w+dx); d.h=Math.max(36/m.a,o.h+dy); n.style.width=d.w+'px'; n.style.height=d.h+'px'; }
    else { d.x=o.x+dx; d.y=o.y+dy; n.style.left=d.x+'px'; n.style.top=d.y+'px'; }
  };
  const fin=()=>{ n.removeEventListener('pointermove',bouge); n.removeEventListener('pointerup',fin); n.removeEventListener('pointercancel',fin);
    if(n._moved){ ['x','y','w','h'].forEach(k=>d[k]=Math.round(d[k])); c.updated=new Date().toISOString(); capRevSave(c.id); }
    else if(h.dataset.n==='max'){ d.min=false; capRevSave(c.id); }   // clic sur la pastille : la note est rouverte
    n._moved=false; };
  n.addEventListener('pointermove',bouge); n.addEventListener('pointerup',fin); n.addEventListener('pointercancel',fin);
}

/* ── 🔁 Vérifier : revue des commentaires après une mise à jour du modèle ── */

/**
 * Différence entre la valeur commentée et le modèle chargé, pour une cible.
 * @param {object} t - Cible
 * @returns {string} HTML
 */
function capRevDiffHtml(t){
  const esc=capEsc, s=capRevTargetState(t), lab=`<b>${esc(t.name||t.id)}</b> <span class="ana-dim">${esc(t.type)} · ${esc(capRevFieldLabel(t.field))}</span>`;
  if(s==='deleted') return `<div class="crv-diff">${lab} — <span class="crv-chg crv-del">${_L('élément supprimé du modèle')}</span></div>`;
  if(s!=='changed') return `<div class="crv-diff">${lab} — <span class="ana-dim">${_L('inchangé')}</span></div>`;
  const el=capGetElementById_(t.id);
  if(t.field) return `<div class="crv-diff">${lab}<div class="crv-diff-g"><div><span class="ana-dim">${_L('Au moment du commentaire')}</span><div class="crv-old">${esc(t.snap.v||'')||'∅'}</div></div>`+
    `<div><span class="ana-dim">${_L('Maintenant')}</span><div class="crv-new">${esc(capRevValue(el,t.field).slice(0,3000))||'∅'}</div></div></div></div>`;
  const a=t.snap.a||{}, keys=[...new Set([...Object.keys(a), ...Object.keys(el.attrs).filter(k=>k!=='id')])];
  const ch=keys.filter(k=>String(el.attrs[k]||'').slice(0,400)!==(a[k]||'')).slice(0,12);
  const nk=(capGetParentIndex().childrenOf[el.id]||[]).length;
  return `<div class="crv-diff">${lab}<div class="crv-meta">${ch.length?_L(`Attributs modifiés : ${ch.map(k=>'<code>'+esc(k)+'</code>').join(', ')}`):''}`+
    `${t.snap.n!=null&&t.snap.n!==nk?_L(` · éléments contenus : ${t.snap.n} → ${nk}`):''}${!ch.length&&(t.snap.n==null||t.snap.n===nk)?_L('Références ou contenu modifiés'):''}</div></div>`;
}
/** Onglet 🔁 Vérifier. @returns {string} HTML */
function capRevCheckHtml(){
  if(!capLoaded) return _L('<div class="crv-empty">Chargez un modèle : les commentaires sont comparés au modèle chargé.</div>');
  const l=capRevToCheck();
  let h=_L(`<div class="crv-help">Commentaires non clos dont la valeur commentée a <b>changé</b> ou dont l'élément a <b>disparu</b> depuis le commentaire (nouveau fichier, 🔄 mise à jour), et commentaires marqués <b>« Corrigé, à vérifier »</b>. Pour chacun : <b>✔ Valider</b> si la correction est faite (le commentaire est clos), ou <b>↻ Garder ouvert</b> (la version actuelle devient la référence).</div>`);
  if(!l.length) return h+_L('<div class="crv-empty">✔ Rien à vérifier : aucun commentaire ouvert ne porte sur un élément modifié.</div>');
  h+=`<div class="crv-filters"><span class="ana-dim">${_L(`${l.length} commentaire(s) à vérifier`)}</span><span style="flex:1"></span><button class="cap-lf-btn" data-a="check-all" title="${_L('Valider tous les commentaires de cette liste')}">${_L('✔ Tout valider')}</button></div>`;
  return h+l.map(c=>{
    const st=capRevSt(c), cr=capRevCr(c);
    return `<div class="crv-card open" data-c="${capEsc(c.id)}" style="--crv-c:${cr.c}"><div class="crv-card-h"><span class="crv-num">#${c.num}</span>`+
      (c.crit?`<span class="crv-crit" style="background:${cr.c};color:${capInk(cr.c)}">${cr.l}</span>`:'')+`<span class="crv-st" style="color:${capTextOn(st.c)}">${st.i} ${st.l}</span><span style="flex:1"></span>`+
      `<button class="crv-ib" data-a="go" title="${_L('Aller à la cible')}">➜</button><button class="crv-ib" data-a="edit" title="${_L('Modifier')}">✎</button></div>`+
      `<div class="crv-title">${capEsc(c.title||c.text||'')}</div>${(c.targets||[]).map(capRevDiffHtml).join('')}`+
      `<div class="crv-acts"><button class="phl-export-btn" data-a="validate" style="margin-left:0" title="${_L('La correction a été faite : statut Validé')}">${_L('✔ Valider')}</button>`+
      `<button class="cap-lf-btn" data-a="reopen" title="${_L('La modification ne règle pas le commentaire : il reste ouvert, la version actuelle devient la référence')}">${_L('↻ Garder ouvert')}</button></div></div>`;
  }).join('');
}
/** Valide tous les commentaires à vérifier (après confirmation). */
async function capRevCheckAll(){
  const l=capRevToCheck(); if(!l.length||!await capRevConfirm(_L(`Valider les ${l.length} commentaire(s) de la liste ?`),{ok:_L('Valider')})) return;
  l.forEach(c=>{ c.status='done'; c.updated=new Date().toISOString(); c.verif={date:c.updated, by:_capRev.me||''}; capRevResnap(c); _capRevUnsaved.add(c.id); });
  capRevSave();
}

/* ── 📄 Rapport ─────────────────────────────────────────────────────────── */

/** @returns {object[]} commentaires du rapport (ceux de la liste filtrée, ou tous) */
function capRevReportList(){ return _capRevUi.portee==='all'?_capRev.comments.slice().sort((a,b)=>a.num-b.num):capRevFiltered(); }
/** Tableau croisé statut × criticité. @param {object[]} l - Commentaires @returns {string} HTML */
function capRevSynthese(l){
  const S=capRevStatuts(), C=capRevCrits();
  const n=(s,c)=>l.filter(x=>(s==null||x.status===s)&&(c==null||(x.crit||'')===c)).length;
  return `<table class="crv-syn"><tr><th></th>${C.map(c=>`<th style="color:${capTextOn(c.c)}">${c.k?c.l:'—'}</th>`).join('')}<th>${_L('Total')}</th></tr>`+
    S.map(s=>`<tr><td>${s.i} ${s.l}</td>${C.map(c=>`<td>${n(s.k,c.k)||''}</td>`).join('')}<td><b>${n(s.k,null)}</b></td></tr>`).join('')+
    `<tr><td><b>${_L('Total')}</b></td>${C.map(c=>`<td><b>${n(null,c.k)||''}</b></td>`).join('')}<td><b>${l.length}</b></td></tr></table>`;
}
/** Onglet 📄 Rapport : synthèse et exports. @returns {string} HTML */
function capRevReportTab(){
  const u=_capRevUi, l=capRevReportList(), opt=(v,t,cur)=>`<option value="${v}"${v===cur?' selected':''}>${t}</option>`;
  const late=l.filter(capRevLate).length, chk=capLoaded?l.filter(c=>!capRevClosed(c)&&capRevState(c)!=='same'&&capRevState(c)!=='na').length:0;
  return `<div class="crv-filters"><label>${_L('Commentaires')} <select id="crv-portee">${opt('list',_L('de la liste (filtres de 💬 Commentaires)'),u.portee)}${opt('all',_L('tous'),u.portee)}</select></label>`+
    `<label>${_L('Regrouper par')} <select id="crv-groupe">${opt('status',_L('statut'),u.groupe)}${opt('crit',_L('criticité'),u.groupe)}${opt('who',_L('responsable'),u.groupe)}${opt('el',_L('élément'),u.groupe)}${opt('none',_L('aucun'),u.groupe)}</select></label>`+
    `<label><input type="checkbox" id="crv-reponses"${u.reponses?' checked':''}> ${_L('réponses')}</label></div>`+
    capRevSynthese(l)+
    `<div class="crv-meta" style="margin:6px 0 10px">${_L(`${l.length} commentaire(s) · ${late} en retard · ${chk} sur des éléments modifiés`)}</div>`+
    `<div class="crv-filters"><button class="phl-export-btn" data-a="report-html" style="margin-left:0" title="${_L('Rapport HTML autonome (imprimable) : synthèse, commentaires groupés, cibles, état par rapport au modèle chargé')}">${_L('📄 Rapport HTML')}</button>`+
    `<button class="phl-export-btn" data-a="report-csv" style="margin-left:0" title="${_L('Une ligne par commentaire (tableur)')}">${_L('⬇ CSV')}</button>`+
    `<button class="phl-export-btn" data-a="cible" style="margin-left:0" title="${_L('Page HTML autonome à envoyer aux relecteurs : ils répondent aux commentaires choisis et en ajoutent ; leurs réponses se réimportent (💾 Revue ▾ › 📂 Importer / fusionner)')}">${_L('📤 Faire relire des commentaires…')}</button>`+
    `<button class="phl-export-btn" data-a="dossiers" style="margin-left:0" title="${_L('Document chapitré à faire relire : descriptions, diagrammes, texte libre ; export HTML à commenter ou Word')}">${_L('📑 Dossiers de relecture…')}</button></div>`;
}
/**
 * Groupes du rapport selon le regroupement choisi.
 * @param {object[]} l - Commentaires
 * @returns {Array<[string, object[]]>} [libellé, commentaires]
 */
function capRevGroupes(l){
  const g=_capRevUi.groupe, m=new Map(), add=(k,c)=>{ if(!m.has(k)) m.set(k,[]); m.get(k).push(c); };
  if(g==='none') return [['',l]];
  if(g==='status') capRevStatuts().forEach(s=>{ const x=l.filter(c=>c.status===s.k); if(x.length) m.set(s.i+' '+s.l,x); });
  else if(g==='crit') capRevCrits().slice().reverse().forEach(s=>{ const x=l.filter(c=>(c.crit||'')===s.k); if(x.length) m.set(s.l,x); });
  else if(g==='who') l.forEach(c=>((c.assignees||[]).length?c.assignees:[_L('(non attribué)')]).forEach(a=>add(a,c)));
  else l.forEach(c=>((c.targets||[]).length?c.targets.map(t=>(t.name||t.id)+' ['+t.type+']'):[c.diag?'🔲 '+(c.diag.nom||''):_L('(commentaire général)')]).forEach(k=>add(k,c)));
  return [...m.entries()];
}
/** Télécharge le rapport HTML autonome de la revue. */
function capRevReportHtml(){
  const l=capRevReportList(), esc=capEsc;
  if(!l.length){ capRevAlert(_L('Aucun commentaire à mettre dans le rapport.')); return; }
  const etat=c=>{ const s=capRevState(c); return s==='changed'?_L('⚠ modifié'):s==='deleted'?_L('⚠ supprimé'):s==='same'?_L('inchangé'):''; };
  const ligne=c=>{ const st=capRevSt(c), cr=capRevCr(c);
    return `<tr class="${capRevClosed(c)?'clos':''}"><td><b>#${c.num}</b></td><td>${c.crit?`<span class="crit" style="background:${cr.c};color:${capInk(cr.c)}">${cr.l}</span>`:''}</td><td>${st.i} ${st.l}</td>`+
      `<td>${c.title?`<b>${esc(c.title)}</b><br>`:''}<span class="txt">${esc(c.text||'')}</span>`+
      (_capRevUi.reponses&&(c.replies||[]).length?c.replies.map(r=>`<div class="rep">↩ <b>${esc(r.author||'?')}</b> (${capRevDateTime(r.date)})${r.avis?' '+capRevAvis(r):''} : ${esc(r.text)}</div>`).join(''):'')+
      (c.verif?`<div class="rep">${_L(`✔ Vérifié le ${capRevDateTime(c.verif.date)}${c.verif.by?_L(' par ')+esc(c.verif.by):''}`)}</div>`:'')+`</td>`+
      `<td>${(c.targets||[]).map(t=>`${esc(t.name||t.id)} <span class="dim">${esc(t.type)}${t.field?' · '+esc(capRevFieldLabel(t.field)):''}</span>`).join('<br>')}${c.diag?`<br>🔲 ${esc(c.diag.nom||'')}`:''}</td>`+
      `<td>${esc(c.author||'')}<br><span class="dim">${capRevDate(c.created)}</span></td><td class="${capRevLate(c)?'late':''}">${capRevDate(c.due)}</td><td>${esc((c.assignees||[]).join(', '))}</td><td>${etat(c)}</td></tr>`; };
  const tete=`<tr><th>${_L('N°')}</th><th>${_L('Criticité')}</th><th>${_L('Statut')}</th><th>${_L('Commentaire')}</th><th>${_L('Cibles')}</th><th>${_L('Auteur')}</th><th>${_L('Échéance')}</th><th>${_L('Responsables')}</th><th>${_L('Modèle')}</th></tr>`;
  const corps=capRevGroupes(l).map(([g,x])=>(g?`<h2>${esc(g)} <span class="dim">(${x.length})</span></h2>`:'')+`<table>${tete}${x.map(ligne).join('')}</table>`).join('');
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${_L('Rapport de revue')} — ${esc(capCurrentFileName||'')}</title><style>
body{font:13px/1.45 'Segoe UI',Arial,sans-serif;color:#1f2328;margin:24px;}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px;border-bottom:2px solid #d0d7de;padding-bottom:3px}
table{border-collapse:collapse;width:100%;margin-bottom:8px}th,td{border:1px solid #d0d7de;padding:5px 7px;vertical-align:top;text-align:left}th{background:#f2f4f7;font-size:12px}
.dim{color:#656d76;font-size:11.5px}.crit{padding:1px 7px;border-radius:9px;font-size:11px;font-weight:700;white-space:nowrap}.txt{white-space:pre-wrap}.rep{margin-top:4px;padding-left:8px;border-left:3px solid #d0d7de;font-size:12px;color:#444c56}
tr.clos td{color:#656d76}.late{color:#cf222e;font-weight:700}.syn td,.syn th{text-align:center;min-width:60px}.syn td:first-child{text-align:left}@media print{body{margin:10mm}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><h1>${_L('💬 Rapport de revue')}</h1><div class="dim">${_L(`Modèle : <b>${esc(capCurrentFileName||'—')}</b> · ${l.length} commentaire(s) · édité le ${new Date().toLocaleString('fr-FR')}${_capRev.me?_L(' par ')+esc(_capRev.me):''}`)}</div>`+
    `<h2>${_L('Synthèse')}</h2>${capRevSynthese(l).replace('class="crv-syn"','class="syn"')}${corps}<p class="dim">${_L('Produit par Arcalyse — colonne « Modèle » : état de la valeur commentée dans le modèle chargé lors de l\'édition du rapport.')}</p></body></html>`;
  capDownloadBlob(new Blob([html],{type:'text/html'}), _L('rapport-de-revue.html'));
}
/** Télécharge les commentaires du rapport en CSV (une ligne par commentaire). */
function capRevCsv(){
  const l=capRevReportList();
  capCsvDownload(_L('revue.csv'), [_L('N°'),_L('Titre'),_L('Commentaire'),_L('Criticité'),_L('Catégorie'),_L('Statut'),_L('Auteur'),_L('Créé le'),_L('Échéance'),_L('Responsables'),_L('Étiquettes'),_L('Éléments'),_L('Champs'),_L('IDs'),_L('Diagramme'),_L('État dans le modèle'),_L('Réponses'),_L('Vérifié le'),_L('Vérifié par')],
    l.map(c=>[c.num, c.title||'', c.text||'', c.crit?capRevCr(c).l:'', c.cat?(capRevCats().find(x=>x.k===c.cat)||{}).l:'', capRevSt(c).l, c.author||'', capRevDate(c.created), capRevDate(c.due),
      (c.assignees||[]).join(', '), (c.tags||[]).join(', '), (c.targets||[]).map(t=>t.name).join(' | '), (c.targets||[]).map(t=>capRevFieldLabel(t.field)).join(' | '), (c.targets||[]).map(t=>t.id).join(' | '),
      c.diag?c.diag.nom||'':'', {changed:_L('modifié'), deleted:_L('supprimé'), same:_L('inchangé')}[capRevState(c)]||'',
      (c.replies||[]).map(r=>(r.author||'?')+' : '+r.text).join(' | '), c.verif?capRevDate(c.verif.date):'', c.verif?c.verif.by||'':'']));
}

/* ── ⚙ Réglages, export / import ───────────────────────────────────────── */

/** Onglet ⚙ Réglages. @returns {string} HTML */
function capRevCfgHtml(){
  const esc=capEsc, F=_capRev.fields;
  const fl=[['title',_L('Titre')],['crit',_L('Criticité')],['cat',_L('Catégorie')],['due',_L('Échéance')],['assignees',_L('Responsables')],['tags',_L('Étiquettes')]];
  const ck=(k,l,t)=>`<label class="crv-opt" title="${t||''}"><input type="checkbox" data-opt="${k}"${_capRev[k]?' checked':''}> ${l}</label>`;
  return `<div class="crv-sec">${_L('Votre nom')}</div><input id="crv-me" class="crv-in" style="max-width:280px" value="${esc(_capRev.me)}" placeholder="${_L('Auteur des nouveaux commentaires')}">`+
    `<div class="crv-sec">${_L('Participants')} <span class="ana-dim">${_L('(proposés comme auteurs et responsables)')}</span></div>`+
    `<div class="crv-chips">${_capRev.people.map(p=>`<span class="crv-chip on">${esc(p)} <span data-a="person-del" data-p="${esc(p)}" title="${_L('Retirer')}">✕</span></span>`).join('')||_L('<span class="ana-dim">Aucun participant.</span>')}</div>`+
    `<div class="crv-filters"><input id="crv-person" class="crv-in" style="max-width:220px" placeholder="${_L('Nom, initiales ou équipe')}"><button class="cap-lf-btn" data-a="person-add">${_L('✚ Ajouter')}</button></div>`+
    `<div class="crv-sec">${_L('Champs proposés dans l\'éditeur')} <span class="ana-dim">${_L('(le texte est toujours demandé ; tous les champs restent facultatifs)')}</span></div>`+
    `<div class="crv-opts">${fl.map(([k,l])=>`<label class="crv-opt"><input type="checkbox" data-fld="${k}"${F[k]?' checked':''}> ${l}</label>`).join('')}</div>`+
    `<div class="crv-sec">${_L('Affichage')}</div><div class="crv-opts">`+
    ck('layer',_L('Calque des commentaires sur les diagrammes'))+ck('layerDone',_L('Montrer aussi les notes closes sur les diagrammes'))+
    ck('mark',_L('Marquer d\'un 💬 les éléments commentés dans les vues'),_L('Blocs, cartes et noms cliquables des éléments qui ont des commentaires non clos'))+`</div>`+
    `<div class="crv-sec">${_L('Données')}</div>`+
    `<div class="crv-help">${_L('Export et import des commentaires : bouton 💾 Revue ▾ en haut du panneau.')}</div>`+
    `<div class="crv-filters"><button class="cap-lf-btn" data-a="clear" title="${_L('Supprimer tous les commentaires de la page')}">${_L('🗑 Tout supprimer')}</button></div>`;
}
/**
 * Actions de l'onglet ⚙ Réglages : participants, export, import, suppression.
 * @param {string} act - Action
 * @param {HTMLElement} b - Bouton cliqué
 */
async function capRevCfgAction(act, b){
  if(act==='person-add'){ const i=capRevQ('crv-person'), v=i&&i.value.trim(); if(v&&!_capRev.people.includes(v)){ _capRev.people.push(v); capRevSave(); } return; }
  if(act==='person-del'){ _capRev.people=_capRev.people.filter(p=>p!==b.dataset.p); capRevSave(); return; }
  if(act==='export'){ capRevExport(); return; }
  if(act==='import'){ capRevImport(); return; }
  if(act==='clear'){ if(_capRev.comments.length&&await capRevConfirm(_L(`Supprimer les ${_capRev.comments.length} commentaire(s) de la page ? (Exportez-les d'abord pour les garder.)`),{danger:true})){ _capRev.comments=[]; _capRev.seq=0; capRevSave(); } }
}
/** Exporte la revue (participants et commentaires) dans un fichier .json réutilisable. */
function capRevExport(){
  const out={type:'arcalyse-revue', version:1, date:new Date().toISOString(), model:capCurrentFileName||'', project:capRevProjectId(), projectName:capRevProjectName(), people:_capRev.people, seq:_capRev.seq, comments:_capRev.comments};
  const base=(capCurrentFileName||'modele').replace(/\.[^.]+$/,'');
  capDownloadBlob(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}), base+_L('-revue.json'));
  _capRevUnsaved.clear(); capRevRender();
}
/** Importe un fichier .json de revue, ou une page de 📤 revue ciblée relue (.html), et la fusionne avec les commentaires de la page. */
function capRevImport(){
  const D=capRevDoc(), inp=D.createElement('input'); inp.type='file'; if(!capIsMobile()) inp.accept='.json,.html,.htm';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return;
    f.text().then(t=>{
      let d;
      if(/^\s*</.test(t)){   // page de revue ciblée relue
        const dp=capDosLirePage(t); if(dp){ capDosFusion(dp, f.name); return; }   // page de 📑 dossier de relecture (61)
        const rc=capRevCibleeLire(t);
        if(!rc){ capAlert(_L('Cette page n\'est pas une revue ciblée Arcalyse.'),{win:D.defaultView, level:'err'}); return; }
        d=capRevCibleeVersRevue(rc);
      } else { try{ d=JSON.parse(t); }catch(e){ capAlert(_L('Fichier illisible (JSON attendu).'),{win:D.defaultView, level:'err'}); return; } }
      if(!d||d.type!=='arcalyse-revue'||!Array.isArray(d.comments)){ capAlert(_L('Ce fichier n\'est pas une revue Arcalyse.'),{win:D.defaultView, level:'err'}); return; }
      const m=capRevMatch(d.comments, d.project||'');
      const fusion=()=>{
        // Même projet (ou copie reconnue par ses éléments) : les commentaires sont rattachés au projet chargé
        if(['same','probable','copy'].includes(m.verdict)) d.comments.forEach(c=>{ if(c&&(!c.project||m.verdict==='copy')) c.project=m.pid; });
        const r=capRevMerge(d);
        capRevSave(); capRevToggle(true,'list');
        if(typeof capWatchFlash==='function') capWatchFlash(_L(`✔ Revue importée : ${r.added} ajouté(s), ${r.updated} mis à jour, ${r.same} déjà présent(s)`)+
          (m.verdict==='nomodel'?_L(' — modèle non vérifié (aucun modèle chargé)'):''));
      };
      if(['same','probable','nomodel'].includes(m.verdict)) fusion(); else capRevImportConfirm(d, f.name, m, fusion);
    });
  };
  inp.click();
}
/**
 * Fenêtre d'avertissement avant d'importer une revue qui ne semble pas porter sur le modèle chargé :
 * fichiers et projets comparés, éléments commentés retrouvés, conclusion ; Importer quand même / Annuler.
 * @param {object} d - Revue importée
 * @param {string} fichier - Nom du fichier .json
 * @param {object} m - Résultat de capRevMatch
 * @param {function} fusion - Import confirmé
 */
function capRevImportConfirm(d, fichier, m, fusion){
  const D=capRevDoc(), esc=capEsc, court=s=>s?esc(String(s).slice(0,8))+'…':'—';
  const pct=m.ids?Math.round(m.pct*100):0;
  const avis={
    copy:_L('Les identifiants de projet diffèrent, mais les éléments commentés sont bien dans le modèle chargé : sans doute une copie du même projet.'),
    different:_L('Cette revue porte sur un <b>autre projet Capella</b> : ses commentaires ne correspondront pas aux éléments du modèle chargé (ils seront marqués « autre projet » et non vérifiés).'),
    doubt:m.ids?_L(`Trop peu d'éléments commentés (${m.ids}) pour conclure, et tous ne sont pas dans le modèle chargé : vérifiez qu'il s'agit du bon modèle (ou d'une version où ces éléments ont été supprimés).`)
      :_L('Cette revue ne contient que des commentaires généraux et n\'indique pas son projet : impossible de vérifier le modèle.')}[m.verdict]||'';
  const ligne=(k,a,b)=>`<tr><td class="ana-dim">${k}</td><td>${a}</td><td>${b}</td></tr>`;
  let ov=D.getElementById('crv-ov');
  if(!ov){ ov=D.createElement('div'); ov.id='crv-ov'; D.body.appendChild(ov); }
  ov.innerHTML=`<div class="cw-d-box" style="max-width:620px">
    <div class="cw-d-hdr"><b>${_L('⚠ Cette revue porte-t-elle sur ce modèle ?')}</b><button class="cap-lf-btn" data-x="1">✕</button></div>
    <div class="cw-d-body">
      <table class="crv-syn" style="margin-bottom:10px"><tr><th></th><th>${_L('Revue importée')}</th><th>${_L('Modèle chargé')}</th></tr>`+
      ligne(_L('Fichier'), esc(fichier)+(d.model?`<br><span class="ana-dim">${_L(`revue faite sur « ${esc(d.model)} »`)}</span>`:''), esc(capCurrentFileName||'—'))+
      ligne(_L('Projet Capella'), esc(d.projectName||'—')+`<br><span class="ana-dim">${court(m.proj)}</span>`, esc(capRevProjectName()||'—')+`<br><span class="ana-dim">${court(m.pid)}</span>`)+
      ligne(_L('Éléments commentés'), _L(`${m.ids} élément(s)`), _L(`${m.found} retrouvé(s) (${pct} %)`))+
      `</table><p style="font-size:12.5px;margin:6px 0">${avis}</p>
      <p class="ana-dim" style="font-size:11.5px">${_L(`${d.comments.length} commentaire(s) dans le fichier.`)}</p></div>
    <div class="cw-d-ftr"><span style="flex:1"></span><button class="cap-lf-btn" data-x="1">${_L('Annuler')}</button>
      <button class="phl-export-btn" data-ok="1" style="margin-left:0">${_L('Importer quand même')}</button></div></div>`;
  ov.style.display='flex';
  const fermer=()=>{ ov.style.display='none'; ov.innerHTML=''; };
  ov.onclick=e=>{ if(e.target===ov||e.target.closest('[data-x]')) fermer(); else if(e.target.closest('[data-ok]')){ fermer(); fusion(); } };
  ov.onchange=ov.oninput=null;
  ov.onkeydown=e=>{ if(e.key==='Escape') fermer(); };
}
/**
 * Fusionne une revue importée : nouveaux commentaires ajoutés (renumérotés si leur numéro est pris),
 * commentaires connus remplacés s'ils sont plus récents (réponses réunies), participants réunis.
 * @param {object} d - Revue importée {people, comments}
 * @returns {{added:number, updated:number, same:number}}
 */
function capRevMerge(d){
  const r={added:0, updated:0, same:0};
  (d.people||[]).forEach(p=>{ if(p&&!_capRev.people.includes(p)) _capRev.people.push(p); });
  d.comments.forEach(c=>{
    if(!c||!c.id) return;
    if(!c.project&&d.project) c.project=d.project;   // revue exportée avec son projet
    const cur=capRevGet(c.id);
    if(!cur){
      if(!c.num||_capRev.comments.some(x=>x.num===c.num)) c.num=_capRev.seq+1;
      _capRev.seq=Math.max(_capRev.seq,c.num); _capRev.comments.push(c); _capRevUnsaved.add(c.id); r.added++; return;
    }
    const rep=[...(cur.replies||[])]; (c.replies||[]).forEach(x=>{ if(!rep.some(y=>y.date===x.date&&y.text===x.text&&(y.author||'')===(x.author||''))) rep.push(x); });
    rep.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    if(String(c.updated||'')>String(cur.updated||'')){ const num=cur.num; Object.assign(cur,c,{num, replies:rep}); r.updated++; _capRevUnsaved.add(cur.id); }
    else if(rep.length>(cur.replies||[]).length){ cur.replies=rep; r.updated++; _capRevUnsaved.add(cur.id); }
    else r.same++;
  });
  return r;
}

// Câblage : bouton 💬 Revue, clic droit dans les vues, marques après chaque rendu
(function(){
  document.getElementById('b-review')?.addEventListener('click',()=>capRevToggle());
  document.addEventListener('contextmenu',capRevContext);
  const root=document.getElementById('cap-content');
  if(root) new MutationObserver(()=>{ if(_capRev.mark&&_capRev.comments.length) capRevMarkSchedule(); }).observe(root,{childList:true, subtree:true});
  // Onglets 🔎 Propriétés / 💬 Revue posés en tête du panneau de détail
  document.addEventListener('click',e=>{ const dk=e.target.closest&&e.target.closest('.cap-dock-tabs [data-dock]'); if(dk&&!e.target.closest('#crv-panel')) capDockShow(dk.dataset.dock); });
  window.addEventListener('pagehide',()=>{ const w=capRevPop(); if(w) w.close(); });   // la fenêtre séparée ne vit qu'avec la page
  new MutationObserver(()=>{ const w=capRevPop(); if(w) capRevPopTheme(w); }).observe(document.documentElement,{attributes:true, attributeFilter:['data-theme','data-tone','style']});
  capRevBadge();
})();
