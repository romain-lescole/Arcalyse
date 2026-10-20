/* ═══════════════════════════════════════════════════════════════════════
   📑 DOSSIER DE RELECTURE — document chapitré à faire relire et commenter
   ───────────────────────────────────────────────────────────────────────
   Onglet de 🏠 Accueil. L'auteur compose un dossier : chapitres et sous-chapitres (titre libre, ou élément du
   modèle glissé : capacité, chaîne fonctionnelle…), et dans chaque chapitre des blocs : description de l'élément,
   diagrammes (avec leur description et, au choix, la liste des éléments représentés), éléments avec leur
   description, texte libre. Les éléments et diagrammes se glissent depuis la palette 📎 (ou les vues).
   Exports : page HTML autonome (hors ligne) où chaque relecteur commente chaque bloc, ou document Word (.docx)
   commenté avec les commentaires de Word (signets « arc_… » posés sur chaque bloc).
   Réimport (📥) de la page enregistrée, de son .json ou du .docx commenté : les retours sont rattachés aux blocs
   du dossier, puis peuvent être versés dans 💬 Revue (cibles : élément, description).
   Données : _capHome.dossiers (bloc « cap-home » de la page).
   ═══════════════════════════════════════════════════════════════════════ */

/** État de l'affichage des dossiers (non enregistré) : dossier ouvert, chapitres repliés, retours dépliés, tableaux d'éléments dépliés. */
const _capDosUi = { cur:'', plies:new Set(), ret:new Set(), tous:false, listes:new Set() };

/**
 * Complète la liste des dossiers lue dans la page (valeurs par défaut, blocs normalisés).
 * @param {object[]} [l] - Dossiers lus
 * @returns {object[]} dossiers
 */
function capDosNorm(l){
  const blocs=bl=>(Array.isArray(bl)?bl:[]).filter(b=>b&&b.id&&b.k).map(b=>{ const x=Object.assign({}, b); if(x.k==='chap') x.blocs=blocs(x.blocs); return x; });
  return (Array.isArray(l)?l:[]).filter(d=>d&&d.id).map(d=>Object.assign({titre:'', consignes:'', echeance:'', auteur:'', relus:{}}, d,
    {blocs:blocs(d.blocs), retours:Array.isArray(d.retours)?d.retours.filter(r=>r&&r.id):[]}));
}
/**
 * Dossier concerné par un élément de l'interface (vue ou fenêtre séparée), sinon dossier ouvert dans l'onglet 📑.
 * @param {Element} [el] - Élément cliqué ou saisi
 * @returns {object|undefined} dossier
 */
function capDosOf(el){ const n=el&&el.closest&&el.closest('[data-dosid]'); return n?_capHome.dossiers.find(d=>d.id===n.dataset.dosid):capDosCur(); }
/**
 * Ouvre l'onglet 📑 Dossiers de relecture de 🏠 Accueil (depuis 💬 Revue, par exemple).
 * @param {string} [id] - Dossier à ouvrir
 */
function capDosOuvrir(id){
  const d=id&&_capHome.dossiers.find(x=>x.id===id);
  if(d) _capDosUi.cur=id;
  _capHomeUi.tab=d?capDosOnglet(d):'dos';
  if(currentMode!=='capella'||capCurrentView!=='home'){ capNavClose(); capShowView('home'); } else capHomeRender();   // capShowView : garde l'onglet choisi
}
/** @returns {object|undefined} dossier ouvert dans l'onglet 📑 */
/** Onglet d'un dossier : 📘 Rapports automatiques (rapport produit par un plan type ou modèle de rapport) ou 📑 Faire relire.
 * @param {object} d - Dossier
 * @returns {'rap'|'dos'}
 */
function capDosOnglet(d){ return d&&(d.gab||d.modele)?'rap':'dos'; }
/** Dossiers de l'onglet affiché (📘 rapports et modèles, ou 📑 dossiers de relecture). @returns {object[]} */
function capDosListe(){ const t=_capHomeUi.tab==='rap'?'rap':'dos'; return _capHome.dossiers.filter(d=>capDosOnglet(d)===t); }
/** Ouvre 💬 Revue & documents › 📘 Rapports automatiques (onglet de l'accueil). */
function capRapOuvrir(){
  _capHomeUi.tab='rap';
  if(currentMode!=='capella'||capCurrentView!=='home'){ capNavClose(); capShowView('home'); } else capHomeRender();   // capShowView : garde l'onglet choisi
}
function capDosCur(){ const l=capDosListe(); if(!l.some(d=>d.id===_capDosUi.cur)) _capDosUi.cur=l.length?l[0].id:''; return l.find(d=>d.id===_capDosUi.cur); }
/**
 * Bloc d'un dossier et sa place : liste qui le contient, rang, chapitre parent.
 * @param {object[]} l - Blocs
 * @param {string} id - Bloc cherché
 * @param {object} [parent] - Chapitre parent de la liste
 * @returns {{b:object, l:object[], i:number, parent:?object}|null}
 */
function capDosTrouve(l, id, parent){
  for(let i=0;i<l.length;i++){
    if(l[i].id===id) return {b:l[i], l, i, parent:parent||null};
    if(l[i].k==='chap'){ const r=capDosTrouve(l[i].blocs, id, l[i]); if(r) return r; }
  }
  return null;
}
/**
 * Parcourt les blocs d'un dossier dans l'ordre du document.
 * @param {object[]} l - Blocs
 * @param {function(object, string, number):void} f - Appelée avec (bloc, numéro du chapitre, niveau)
 * @param {string} [pre] - Numéro du chapitre parent
 * @param {number} [niv] - Niveau (0 : racine)
 */
function capDosParcours(l, f, pre, niv){
  let n=0; niv=niv||0;
  l.forEach(b=>{ if(b.k==='chap'){ n++; const num=(pre?pre+'.':'')+n; f(b, num, niv); capDosParcours(b.blocs, f, num, niv+1); } else f(b, pre||'', niv); });
}
/**
 * Bloc visé par un retour (« id » ou « id.d » pour la description d'un chapitre).
 * @param {object} d - Dossier
 * @param {string} bid - Identifiant du bloc commenté ('' : commentaire général)
 * @returns {{b:?object, num:string, champ:string, libelle:string}}
 */
function capDosBlocDe(d, bid){
  const [id0, elemId]=String(bid||'').split('~'), id=id0.replace(/\.d$/,''), champ=elemId?'el':/\.d$/.test(bid||'')?'desc':'';
  let r={b:null, num:'', champ, libelle:_L('Commentaire général')};
  if(!id) return r;
  if(elemId){   // élément représenté d'un diagramme : « bloc~élément »
    const e=capLoaded&&capGetElementById_(elemId), x=capDosBlocDe(d, id);
    return Object.assign(x, {champ:'el', elemId, libelle:'◆ '+(e?e.attrs.name||elemId:elemId)+_L(` (dans ${x.libelle})`)});
  }
  capDosParcours(d.blocs,(b,num)=>{ if(b.id!==id) return;
    const lib=b.k==='chap'?(champ?_L(`Description de « ${capDosTitre(b)} »`):capDosTitre(b)):b.k==='txt'?_L('Texte'):b.k==='xlay'?capXlTitre(b.opts||{}):b.k==='liste'?(b.titre||_L('Tableau')):b.ref?capHomeRefNom(b.ref):'';
    r={b, num, champ, libelle:(b.k==='diag'?'🔲 ':b.k==='el'?'◆ ':b.k==='xlay'?'⇶ ':b.k==='mod'?'🔗 ':b.k==='liste'?'▤ ':'')+lib}; });
  if(!r.b) r.libelle=_L('Bloc retiré du dossier');
  return r;
}

/* ── Création ──────────────────────────────────────────────────────────── */

/**
 * Crée un dossier et l'ouvre.
 * @param {string} [titre] - Titre
 * @returns {object} dossier
 */
function capDosNouveau(titre){
  const d={id:capHomeUid(), titre:titre||_L('Dossier de relecture')+' — '+(capRevProjectName()||capCurrentFileName||''), consignes:'', echeance:'',
    auteur:_capRev.me||'', blocs:[], retours:[], relus:{}};
  _capHome.dossiers.push(d); _capDosUi.cur=d.id; if(_capHomeUi.tab!=='rap') _capHomeUi.tab='dos';   // 📘 : le rapport reste dans son onglet
  capHomeSave(); return d;
}
/**
 * Diagrammes dont un élément est l'élément représenté (cible du diagramme dans le .aird).
 * @param {string} id - Élément
 * @returns {object[]} représentations
 */
function capDosDiagsDe(id){
  const reps=capHomeReps(); if(!reps.length) return [];
  return reps.filter(r=>{ try{ const m=capDiagMeta(r.uid); return m.cible&&m.cible.id===id; }catch(e){ return false; } })
    .sort((a,b)=>String(a.nom).localeCompare(b.nom));
}
/** Nom d'un diagramme sans le préfixe de son type (« [LAB] … »). @param {string} n @returns {string} */
function capDosNomDiag(n){ return String(n||'').replace(/^\[[^\]]*\]\s*/,''); }
/**
 * Chapitre créé à partir d'une référence glissée : élément (titre, description, diagrammes dont il est l'élément représenté)
 * ou diagramme (titre et diagramme), ou texte (titre).
 * @param {?object} ref - Référence {k:'el'|'diag', id, nom…}
 * @param {string} [txt] - Texte déposé (sans référence)
 * @returns {object} chapitre
 */
function capDosChapDe(ref, txt){
  const c={id:capHomeUid(), k:'chap', titre:'', ref:null, desc:false, blocs:[]};
  if(!ref){ c.titre=txt||''; return c; }
  if(ref.k==='diag'){ c.titre=capDosNomDiag(ref.nom); c.blocs.push({id:capHomeUid(), k:'diag', ref, desc:true, elems:true}); return c; }
  c.titre=capHomeRefNom(ref); c.ref=ref; c.desc=true;
  capDosDiagsDe(ref.id).forEach(r=>c.blocs.push({id:capHomeUid(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:true}));
  return c;
}
/**
 * Bloc créé à partir d'une référence glissée dans un chapitre : diagramme, élément (avec sa description) ou texte libre.
 * @param {?object} ref - Référence
 * @param {string} [txt] - Texte déposé
 * @returns {object} bloc
 */
function capDosBlocDeRef(ref, txt){
  if(!ref) return {id:capHomeUid(), k:'txt', txt:txt||''};
  return ref.k==='diag'?{id:capHomeUid(), k:'diag', ref, desc:true, elems:true}:{id:capHomeUid(), k:'el', ref, desc:true};
}
/**
 * Crée un dossier à partir d'un plan de revue : un chapitre par élément ou diagramme du périmètre.
 * @param {object} p - Plan de revue (☑ Check-lists & plans de revue)
 */
function capDosDepuisPlan(p){
  const d=capDosNouveau(p.titre||'');
  d.consignes=p.head.objet||''; d.echeance=p.head.date||'';
  (p.head.perim||[]).forEach(r=>d.blocs.push(capDosChapDe(r)));
  capHomeSave(); capHomeRender();
}

/* ── Onglet 📑 Dossiers de relecture ───────────────────────────────────── */

/** Onglet 📑 : liste des dossiers, dossier ouvert. @returns {string} HTML */
function capDosOngletHtml(){
  const esc=capEsc, d=capDosCur(), rap=_capHomeUi.tab==='rap', L=capDosListe();
  const reimp=`<button class="cap-lf-btn" data-da="import" title="${_L('Réimporter les retours des relecteurs : page HTML enregistrée, .json ou document Word commenté (.docx)')}">${_L('📥 Réimporter des retours…')}</button>`;
  const haut=rap
    ?`<div class="dos-rap" title="${_L('Dossier rempli à partir du modèle selon un plan type, entièrement modifiable ensuite')}"><div class="dos-rap-t">${_L('📘 Plans types')}</div>`+
      capDosGabarits().map(g=>`<button class="cap-lf-btn dos-rap-b" data-dos-gab="${g.k}" title="${esc(g.t)}">${esc(g.l.replace(/^\S+\s/,''))}</button>`).join('')+
      `<div class="dos-rap-t" style="margin-top:4px">${_L('🧩 Mes modèles')}</div>`+
      L.filter(x=>x.modele).map(x=>`<button class="cap-lf-btn dos-rap-b" data-rap-go="${x.id}" title="${_L('Générer un rapport à partir de ce modèle')}">▶ ${esc(x.titre||_L('(sans titre)'))}</button>`).join('')+
      `<span class="hm-row" style="margin:0"><button class="cap-lf-btn" data-da="rap-new" title="${_L('Nouveau modèle de rapport (prérempli d\'un exemple de boucles, à adapter)')}">${_L('✚ Nouveau modèle')}</button>`+
      `<button class="cap-lf-btn" data-da="rap-import" title="${_L('Importer un modèle de rapport (.json)')}">${_L('📂 Importer')}</button></span></div>`+reimp
    :`<button class="cap-lf-btn" data-da="new" title="${_L('Nouveau dossier : chapitres, descriptions, diagrammes et texte libre à faire relire')}">${_L('📑 Nouveau dossier')}</button>`+reimp;
  const vide=rap
    ?`<div class="hm-empty">${_L('Un rapport automatique est produit à partir du modèle selon un plan type (spécification boîte noire, dossier de conception boîte blanche, SSS / SSDD) ou selon un de vos modèles ; il reste entièrement modifiable, puis s\'exporte en HTML à commenter ou en Word.<br><br>Choisissez un plan type ci-dessus.')}</div>`
    :`<div class="hm-empty">${_L('Un dossier de relecture rassemble ce qu\'il faut faire relire, chapitre par chapitre : description d\'une capacité ou d\'une chaîne, ses diagrammes, d\'autres diagrammes en sous-chapitres, du texte libre.<br><br>Il s\'exporte en page HTML que les relecteurs commentent dans leur navigateur, ou en document Word ; leurs retours se réimportent ici.')}</div>`;
  const liste=`<aside class="hm-docs"${capHomeLargeur('docs')}><div class="hm-docs-new">${haut}</div>`+
    (L.length?(rap?`<div class="dos-rap-t" style="padding:6px 8px 2px">${_L('Rapports produits et modèles')}</div>`:'')+L.map(x=>{ const n=x.retours.length;
      return `<div class="hm-docs-i${d&&x.id===d.id?' on':''}" data-dos-open="${x.id}"> <span class="hm-docs-n">${x.modele?'🧩':x.gab==='dcs'||x.gab==='ssdd'?'📗':x.gab?'📘':'📑'} ${esc(x.titre||_L('(sans titre)'))}</span>${n?`<span class="hm-n" title="${_L('Retours des relecteurs')}">💬 ${n}</span>`:''}`+
        `<span class="hm-pop-b" data-a="pop" data-kind="dos" data-id="${x.id}" title="${_L('Ouvrir dans une fenêtre séparée (par exemple sur un autre écran)')}">⧉</span></div>`; }).join('')
      :vide)+`</aside>`;
  const main=d?(capHomePopWin('dos',d.id)?capHomePopPlace('dos',d):`<div class="hm-doc dos-ed" data-dosid="${d.id}">${capDosHtml(d)}</div>`):'';
  return `<div class="hm-main hm-docs-w">${liste.replace(/<\/aside>$/, d&&!capHomePopWin('dos',d.id)?capDosNavHtml(d)+'</aside>':'</aside>')}${capHomeSplit('docs')}${main}</div>`;
}
/**
 * Volet de navigation du dossier ouvert : plan des chapitres numérotés (clic : aller au chapitre, en le dépliant),
 * tout replier / tout déplier.
 * @param {object} d - Dossier
 * @returns {string} HTML
 */
function capDosNavHtml(d){
  const l=[]; capDosParcours(d.blocs,(b,num,niv)=>{ if(b.k==='chap') l.push({b, num, niv}); });
  if(!l.length) return '';
  return `<div class="dos-nav"><div class="dos-nav-h"><b>${_L('🧭 Plan')}</b><span style="flex:1"></span>`+
    `<button class="cap-lf-btn" data-da="nav-pli" title="${_L('Replier tous les chapitres')}">⊟</button><button class="cap-lf-btn" data-da="nav-depli" title="${_L('Déplier tous les chapitres')}">⊞</button></div>`+
    l.map(x=>`<div class="dos-nav-i" data-dos-nav="${x.b.id}" style="padding-left:${4+Math.min(x.niv,4)*12}px" title="${capEsc(capDosTitre(x.b))}"><span class="dos-num">${x.num}</span> ${capEsc(capDosTitre(x.b)||_L('(sans titre)'))}${_capDosUi.plies.has(x.b.id)?' <span class="ana-dim">▸</span>':''}</div>`).join('')+`</div>`;
}
/**
 * Va à un chapitre du dossier (volet de navigation) : déplie le chapitre et ses parents, puis le fait défiler en haut.
 * @param {object} d - Dossier
 * @param {string} id - Chapitre
 */
function capDosAller(d, id){
  let f=capDosTrouve(d.blocs, id); if(!f) return;
  _capDosUi.plies.delete(id); while(f&&f.parent){ _capDosUi.plies.delete(f.parent.id); f=capDosTrouve(d.blocs, f.parent.id); }
  capHomeRender();
  const n=capHomeFind(`.dos-ed [data-b="${id}"]`); if(!n) return;
  n.scrollIntoView({block:'start'}); n.classList.add('dos-flash'); setTimeout(()=>n.classList.remove('dos-flash'),1200);
}
/**
 * Dossier ouvert : en-tête (titre, exports, réimport), consignes, retours, plan du dossier.
 * @param {object} d - Dossier
 * @returns {string} HTML
 */
function capDosHtml(d){
  const esc=capEsc, nr=d.retours.length, nv=d.retours.filter(r=>!r.rev).length, rel=new Set(d.retours.map(r=>r.auteur).filter(Boolean)).size;
  let nc=0, nd=0; capDosParcours(d.blocs,b=>{ if(b.k==='chap') nc++; if(b.k==='diag') nd++; });
  const com=d.commentaires!==false;
  let h=`<div class="hm-doc-h"><span class="hm-kind">${d.modele?_L('🧩 Modèle de rapport'):_L('📑 Dossier de relecture')}</span><input class="hm-doc-t" data-dsf="titre" value="${esc(d.titre)}" placeholder="${_L('Titre')}">`+
    (d.modele?`<span class="tb-grp"><button class="phl-export-btn" data-da="rap-gen" style="margin-left:0" title="${_L('Crée un rapport (dossier ordinaire, modifiable et exportable) à partir de ce modèle et du modèle Capella chargé')}">${_L('▶ Générer le rapport')}</button>`+
      `<button class="cap-lf-btn" data-da="visu" title="${_L('Voir le rendu du rapport tel que l\'exporte la page HTML, sans rien télécharger')}">${_L('👁 Aperçu')}</button>`+
      `<button class="cap-lf-btn" data-da="rap-json" title="${_L('Enregistrer ce modèle en .json pour le réutiliser dans un autre projet')}">${_L('💾 .json')}</button>`
    :`<span class="tb-grp">`+`<button class="cap-lf-btn" data-da="visu" title="${_L('Voir le rendu du rapport tel que l\'exporte la page HTML, sans rien télécharger')}">${_L('👁 Aperçu')}</button>`+`<button class="phl-export-btn" data-da="html" style="margin-left:0" title="${_L('Page HTML autonome (hors ligne) : les relecteurs commentent chaque chapitre, description, diagramme ou texte, puis vous renvoient la page enregistrée')}">${_L('📤 Page HTML à commenter')}</button>`+
    `<button class="cap-lf-btn" data-da="docx" title="${_L('Document Word (.docx) : les relecteurs le commentent avec les commentaires de Word (Révision › Nouveau commentaire) ; le .docx commenté se réimporte ici')}">${_L('📝 Word (.docx)')}</button>`+
    `<button class="cap-lf-btn" data-da="import" title="${_L('Réimporter les retours des relecteurs : page HTML enregistrée, .json ou document Word commenté (.docx)')}">${_L('📥 Réimporter…')}</button>`)+
    `<button class="cap-lf-btn" data-da="dup" title="${_L('Dupliquer (sans les retours)')}">${_L('⎘ Dupliquer')}</button><button class="cap-lf-btn" data-da="del" title="${_L('Supprimer')}">🗑</button>`+
    (capHomePopWin('dos',d.id)?'':`<button class="cap-lf-btn" data-a="pop" data-kind="dos" data-id="${d.id}" title="${_L('Ouvrir dans une fenêtre séparée (par exemple sur un autre écran)')}">⧉</button>`)+`</span>`+
    (d.modele?'':`<label class="dos-opt dos-com" title="${_L('Décoché : la page HTML exportée est un rapport à lire et imprimer, sans 💬 ni nom de relecteur (le Word reste commentable avec Word)')}"><input type="checkbox" data-dsf="commentaires"${com?' checked':''}> ${_L('💬 Commentaires dans la page HTML')}</label>`)+`</div>`;
  h+=`<div class="hm-plan"><label class="hm-f hm-f-w"><span>${_L('Consignes aux relecteurs')}</span><textarea data-dsf="consignes" rows="2" placeholder="${_L('Ce qu\'il faut regarder, comment répondre…')}">${esc(d.consignes)}</textarea></label>`+
    `<div class="hm-f4"><label class="hm-f"><span>${_L('Retour attendu le')}</span><input type="date" data-dsf="echeance" value="${esc(d.echeance)}"></label>`+
    `<label class="hm-f"><span>${_L('Auteur')}</span><input data-dsf="auteur" value="${esc(d.auteur)}" placeholder="${_L('Nom')}"></label></div>`+
    `<div class="hm-row"><span class="ana-dim">${_L(`${nc} chapitre(s) · ${nd} diagramme(s)`)}</span>`+
    (nr?`<span class="ana-dim">· ${_L(`💬 ${nr} retour(s) de ${rel} relecteur(s)`)}</span><button class="cap-lf-btn" data-da="ret-tous">${_capDosUi.tous?_L('Masquer les retours'):_L('Voir tous les retours')}</button>`+
      (nv?`<button class="cap-lf-btn" data-da="revue" title="${_L('Crée un commentaire de 💬 Revue pour chaque retour (cible : l\'élément ou sa description), pour en suivre le traitement')}">${_L(`💬 Verser dans la Revue (${nv})`)}</button>`:''):'')+`</div></div>`;
  if(_capDosUi.tous&&nr) h+=capDosRetoursTousHtml(d);
  const gen=d.retours.filter(r=>!r.bloc);
  if(gen.length) h+=`<div class="dos-gen"><b>${_L('Commentaires généraux')}</b>${gen.map(r=>capDosRetourHtml(r)).join('')}</div>`;
  h+=`<div class="dos-plan">${capDosListeHtml(d, d.blocs, '', 0)}</div>`;
  h+=`<div class="dos-add dos-add-root" data-drop="dos-new"><button class="cap-lf-btn" data-da="chap-add">${_L('✚ Chapitre')}</button><button class="cap-lf-btn" data-da="txt-add">${_L('✚ Texte')}</button>${d.modele?capDosModeleBoutons():''}`+
    `<span class="hm-drop-hint">${_L('ou glissez ici un élément (capacité, chaîne fonctionnelle…) ou un diagramme : nouveau chapitre')}</span></div>`;
  if(!d.blocs.length) h+=`<div class="hm-empty">${_L('Commencez par un chapitre : ✚ Chapitre (titre libre), ou glissez depuis la palette 📎 une capacité, une chaîne fonctionnelle ou tout autre élément : le chapitre reprend son nom, sa description et les diagrammes dont il est l\'élément représenté.<br>Dans un chapitre, glissez des diagrammes et des éléments (bloc), ou sur « sous-chapitre » pour les mettre dans un sous-chapitre.')}</div>`;
  return h;
}
/**
 * Blocs d'une liste (chapitres numérotés, imbriqués).
 * @param {object} d - Dossier
 * @param {object[]} l - Blocs
 * @param {string} pre - Numéro du chapitre parent
 * @param {number} niv - Niveau
 * @returns {string} HTML
 */
function capDosListeHtml(d, l, pre, niv){
  let n=0;
  return l.map(b=>{ if(b.k==='chap'){ n++; return capDosChapHtml(d, b, (pre?pre+'.':'')+n, niv); } return capDosBlocHtml(d, b); }).join('');
}
/** Boutons propres aux 🧩 modèles de rapport : boucle « pour chaque » et contenu automatique. @returns {string} HTML */
function capDosModeleBoutons(){
  return `<button class="cap-lf-btn dos-mb" data-da="boucle-add" title="${_L('Chapitre répété pour chaque élément trouvé (type, couche, filtre)')}">${_L('🔁 Boucle « pour chaque »')}</button>`+
    `<button class="cap-lf-btn dos-mb" data-da="auto-add" title="${_L('Contenu calculé à la génération : description, diagrammes, échanges, fonctions allouées, tableau d\'éléments…')}">${_L('⚙ Contenu automatique')}</button>`;
}
/**
 * Actions d'un bloc ou d'un chapitre : convertir (chapitre numéroté ↔ bloc), monter, descendre, sortir du chapitre,
 * entrer dans le chapitre précédent, supprimer.
 * @param {boolean} chap - Vrai pour un chapitre
 * @returns {string} HTML
 */
function capDosActs(chap){
  return `<span class="dos-acts">`+(chap?`<button data-da="conv" title="${_L('Convertir en bloc non numéroté (texte, ou élément s\'il y en a un associé) ; son contenu remonte d\'un niveau')}">${_L('¶ En bloc')}</button>`
      :`<button data-da="conv" title="${_L('Convertir en chapitre numéroté')}">${_L('§ En chapitre')}</button>`)+
    `<button data-da="up" title="${_L('Monter')}">↑</button><button data-da="down" title="${_L('Descendre')}">↓</button>`+
    `<button data-da="out" title="${_L('Sortir du chapitre (niveau supérieur)')}">⇤</button><button data-da="in" title="${_L('Mettre dans le chapitre précédent (niveau inférieur)')}">⇥</button>`+
    `<button data-da="del-b" title="${_L('Retirer du dossier')}">🗑</button></span>`;
}
/**
 * Convertit un bloc en chapitre numéroté, ou un chapitre en bloc (son contenu est placé à sa suite, au même niveau).
 * Texte → chapitre titré par sa première ligne (le reste en texte dedans) ; élément → chapitre associé à l'élément ;
 * diagramme → chapitre titré par le diagramme, qui y est placé. Chapitre → élément associé, sinon texte (son titre).
 * L'identifiant est gardé pour que les retours restent rattachés.
 * @param {{b:object, l:object[], i:number}} f - Bloc et sa place (capDosTrouve)
 * @returns {string} identifiant du bloc à mettre en évidence
 */
function capDosConvertir(f){
  const b=f.b;
  if(b.k==='chap'){
    const n=b.ref&&b.ref.k==='el'?{id:b.id, k:'el', ref:b.ref, desc:!!b.desc}:{id:b.id, k:'txt', txt:b.titre||''};
    f.l.splice(f.i, 1, n, ...b.blocs); _capDosUi.plies.delete(b.id); return n.id;
  }
  let c;
  if(b.k==='txt'){ const l=String(b.txt||'').split('\n'), reste=l.slice(1).join('\n').trim();
    c={id:b.id, k:'chap', titre:l[0].trim(), ref:null, desc:false, blocs:reste?[{id:capHomeUid(), k:'txt', txt:reste}]:[]}; }
  else if(b.k==='el') c={id:b.id, k:'chap', titre:capHomeRefNom(b.ref), ref:b.ref, desc:!!b.desc, blocs:[]};
  else c={id:capHomeUid(), k:'chap', titre:b.k==='xlay'?capXlTitre(b.opts||{}):b.k==='liste'?(b.titre||''):b.k==='auto'?capRapAutoLib(b):capDosNomDiag(b.ref.nom), ref:null, desc:false, blocs:[b]};
  f.l.splice(f.i, 1, c); return c.id;
}
/**
 * Pastille du nombre de retours d'un bloc (clic : afficher les retours).
 * @param {object} d - Dossier
 * @param {string} bid - Bloc (ou « id.d »)
 * @returns {string} HTML
 */
function capDosBadge(d, bid){
  const n=d.retours.filter(r=>capDosDuBloc(r, bid)).length;
  return n?`<span class="dos-badge${_capDosUi.ret.has(bid)?' on':''}" data-da="ret" data-bid="${capEsc(bid)}" title="${_L('Retours des relecteurs')}">💬 ${n}</span>`:'';
}
/** Retours d'un bloc, s'ils sont dépliés. @param {object} d @param {string} bid @returns {string} HTML */
function capDosRetoursHtml(d, bid){
  return _capDosUi.ret.has(bid)?`<div class="dos-rets">${d.retours.filter(r=>capDosDuBloc(r, bid)).map(r=>capDosRetourHtml(r, String(r.bloc).includes('~')?capEsc(capDosBlocDe(d, r.bloc).libelle):'')).join('')}</div>`:'';
}
/**
 * Vrai si un retour porte sur un bloc, ou sur un élément représenté de ce bloc (diagramme).
 * @param {object} r - Retour
 * @param {string} bid - Bloc (ou « id.d »)
 * @returns {boolean}
 */
function capDosDuBloc(r, bid){ return r.bloc===bid||String(r.bloc||'').startsWith(bid+'~'); }
/**
 * Aperçu de la description d'un élément (3 lignes).
 * @param {object} ref - Référence
 * @returns {string} HTML
 */
function capDosApercu(ref){
  const e=ref&&ref.k==='el'&&capLoaded&&capGetElementById_(ref.id);
  if(ref&&ref.k==='diag'){ let t=''; try{ t=capHomeReps().length?capDiagMeta(ref.id).desc:''; }catch(_){}
    return `<div class="dos-apercu">${t?capEsc(t):`<i>${_L('(diagramme sans description)')}</i>`}</div>`; }
  if(!e) return '';
  const t=capHtmlToText(e.attrs.description||'');
  return `<div class="dos-apercu">${t?capEsc(t):`<i>${_L('(pas de description)')}</i>`}</div>`;
}
/**
 * Chapitre : numéro, titre, élément associé, description, retours, contenu (blocs et sous-chapitres), zone de dépôt.
 * @param {object} d - Dossier
 * @param {object} c - Chapitre
 * @param {string} num - Numéro (1.2…)
 * @param {number} niv - Niveau
 * @returns {string} HTML
 */
function capDosChapHtml(d, c, num, niv){
  const esc=capEsc, pli=_capDosUi.plies.has(c.id);
  let h=`<div class="dos-chap dos-n${Math.min(niv,3)}" data-b="${c.id}"><div class="dos-chap-h" data-drop="dos-chap">`+
    `<span class="dos-pli" data-da="pli" title="${pli?_L('Déplier'):_L('Replier')}">${pli?'▸':'▾'}</span><span class="dos-num">${num}</span>`+
    (c.titreRef&&c.ref?`<input class="dos-chap-t dos-suivi" value="${esc(capDosTitre(c))}" readonly title="${_L('Titre suivi : nom de l\'élément associé (clic droit ou 🔗 pour le saisir librement)')}">`
      :`<input class="dos-chap-t" data-bf="titre" value="${esc(c.titre)}" placeholder="${_L('Titre du chapitre (ou glissez ici un élément)')}">`)+
    (c.ref?capHomeChip(c.ref,'')+`<span class="hm-chip-x" data-da="ref-x" title="${_L('Retirer l\'élément associé')}">✕</span>`+
      `<button class="cap-lf-btn dos-tsuivi${c.titreRef?' active':''}" data-da="tx-titre" title="${c.titreRef?_L('Titre suivi (nom de l\'élément) : cliquer pour le saisir librement'):_L('Titre = nom de l\'élément, suivi quand il change dans le modèle')}">🔗</button>`+
      `<label class="dos-opt" title="${_L('Reprendre la description de l\'élément sous le titre')}"><input type="checkbox" data-bf="desc"${c.desc?' checked':''}> ${_L('Description')}</label>`:'')+
    (c.boucle?`<label class="dos-opt" title="${_L('Reprendre la description de chaque élément sous son titre')}"><input type="checkbox" data-bf="desc"${c.desc!==false?' checked':''}> ${_L('Description')}</label>`:'')+
    capDosBadge(d, c.id)+(c.ref&&c.desc?capDosBadge(d, c.id+'.d'):'')+capDosActs(true)+`</div>`+(c.boucle?capRapBoucleHtml(c):'');
  h+=capDosRetoursHtml(d, c.id)+(c.ref&&c.desc?capDosRetoursHtml(d, c.id+'.d'):'');
  if(pli){ let n=0; capDosParcours(c.blocs,()=>n++); return h+`<div class="dos-plie">${_L(`${n} bloc(s) replié(s)`)}</div></div>`; }
  if(c.ref&&c.desc) h+=capDosApercu(c.ref);
  h+=`<div class="dos-chap-c">${capDosListeHtml(d, c.blocs, num, niv+1)}`+
    `<div class="dos-add"><span class="dos-drop" data-drop="dos-in"><button class="cap-lf-btn" data-da="txt-add">${_L('✚ Texte')}</button><span class="hm-drop-hint">${_L('glissez un diagramme ou un élément')}</span></span>`+
    `<span class="dos-drop" data-drop="dos-sub"><button class="cap-lf-btn" data-da="sub-add">${_L('✚ Sous-chapitre')}</button><span class="hm-drop-hint">${_L('ou glissez-le ici')}</span></span>`+
    (d.modele?capDosModeleBoutons():'')+`</div></div></div>`;
  return h;
}
/**
 * Bloc d'un chapitre : texte libre, élément (avec sa description) ou diagramme (description, éléments représentés).
 * @param {object} d - Dossier
 * @param {object} b - Bloc
 * @returns {string} HTML
 */
function capDosBlocHtml(d, b){
  const esc=capEsc;
  let h=`<div class="dos-blk dos-k-${b.k}" data-b="${b.id}"><div class="dos-blk-h"${b.k==='txt'||b.k==='mod'?' data-drop="dos-txt"':''}>`, M=null;
  if(b.k==='txt') h+=`<span class="dos-ico">¶</span><span class="dos-blk-l">${_L('Texte libre')}</span>`+
    `<button class="cap-lf-btn" data-da="tx-lier" title="${_L('Remplacer par le nom ou la description d\'un élément ou d\'un diagramme, suivi(e) quand le modèle change (ou glissez un élément ici ; clic droit : plus de choix)')}">${_L('🔗 Lier…')}</button>`+capDosSuggestionHtml(b);
  else if(b.k==='mod'){ M=capDosModHtml(b); h+=M.h; }
  else if(b.k==='el') h+=`<span class="dos-ico">◆</span>${capHomeChip(b.ref,'')}<label class="dos-opt"><input type="checkbox" data-bf="desc"${b.desc?' checked':''}> ${_L('Description')}</label>`;
  else if(b.k==='liste') h+=`<span class="dos-ico">▤</span><input class="dos-liste-t" data-bf="titre" value="${esc(b.titre||'')}" placeholder="${_L('Titre du tableau')}">`+
    `<span class="ana-dim">${_L(`${b.ids.length} élément(s)`)} · ${b.cols==='ech'?_L('échanges : source, cible, éléments échangés'):b.cols==='req'?_L('exigences : identifiant, texte, priorité, vérification, éléments liés'):_L('nom, type, description')}</span>`+
    `<button class="cap-lf-btn" data-da="liste-voir">${_capDosUi.listes.has(b.id)?_L('▴ Masquer'):_L('▾ Voir / modifier')}</button>`;
  else if(b.k==='auto') h+=capRapAutoHtml(b);
  else if(b.k==='xlay') h+=`<span class="dos-ico">⇶</span><span class="dos-blk-l">${esc(capXlTitre(b.opts||{}))}</span><button class="cap-lf-btn" data-da="xl-open" title="${_L('Ouvrir dans 🔬 Analyses › ⇶ Liens entre couches')}">${_L('⇶ Ouvrir')}</button>`;
  else { const ok=capHomeRefOk(b.ref);
    h+=`<span class="dos-ico">🔲</span>${capHomeChip(b.ref,'')}<label class="dos-opt" title="${_L('Description du diagramme (documentation dans Capella)')}"><input type="checkbox" data-bf="desc"${b.desc?' checked':''}> ${_L('Description')}</label>`+
      `<label class="dos-opt" title="${_L('Tableau des éléments représentés sous le diagramme')}"><input type="checkbox" data-bf="elems"${b.elems?' checked':''}> ${_L('Éléments représentés')}</label>`+
      (ok?'':`<span class="ana-dim" title="${_L('Ouvrez le .aird du projet pour joindre ce diagramme aux exports')}">⚠ ${_L('.aird non chargé')}</span>`); }
  h+=capDosBadge(d, b.id)+capDosActs(false)+`</div>`;
  if(b.k==='txt') h+=`<textarea class="dos-txt" data-bf="txt" rows="${Math.min(12,Math.max(2,String(b.txt||'').split('\n').length+1))}" placeholder="${_L('Texte libre : contexte, question posée aux relecteurs…')}">${esc(b.txt||'')}</textarea>`;
  else if(M) h+=M.c;
  else if(b.k==='liste'){ if(_capDosUi.listes.has(b.id)) h+=`<div class="dos-liste hm-drop" data-drop="dos-liste">${b.ids.map((id,i)=>{ const r=capHomeRefEl(id)||{k:'el', id, nom:id, type:'', couche:''};
      return capHomeChip(r,'')+`<span class="hm-chip-x" data-da="liste-x" data-i="${i}" title="${_L('Retirer du tableau')}">✕</span>`; }).join('')}<span class="hm-drop-hint">${_L('Glissez ici des éléments pour les ajouter')}</span></div>`; }
  else if(b.desc) h+=capDosApercu(b.ref);
  return h+capDosRetoursHtml(d, b.id)+`</div>`;
}
/**
 * Un retour de relecteur : type, criticité, auteur, date, extrait commenté, texte ; commentaire de 💬 Revue créé.
 * @param {object} r - Retour
 * @param {string} [lieu] - Bloc commenté (liste de tous les retours)
 * @returns {string} HTML
 */
function capDosRetourHtml(r, lieu){
  const esc=capEsc, ty=capDosTypes().find(x=>x.k===r.type), cr=capRevCrits().find(x=>x.k===(r.crit||''));
  const rc=r.rev&&capRevGet(r.rev);
  return `<div class="dos-ret" data-rid="${esc(r.id)}"><div class="dos-ret-h">${ty&&ty.k?`<span>${ty.l}</span>`:''}`+
    (r.crit&&cr?`<span class="crv-crit" style="background:${cr.c};color:${capInk(cr.c)}">${cr.l}</span>`:'')+
    `<b>${esc(r.auteur||_L('Anonyme'))}</b><span class="ana-dim">${esc(capRevDateTime(r.date))}${r.source==='docx'?' · Word':''}</span>`+
    (lieu?`<span class="dos-ret-lieu">${lieu}</span>`:'')+
    (rc?`<span class="dos-ret-rev" data-da="rev-go" data-cid="${esc(rc.id)}" title="${_L('Ouvrir le commentaire dans 💬 Revue')}">💬 #${rc.num}</span>`:'')+
    `<span class="hm-acts"><span data-da="ret-del" title="${_L('Supprimer ce retour')}">🗑</span></span></div>`+
    (r.extrait?`<div class="dos-ret-x">« ${esc(r.extrait)} »</div>`:'')+`<div class="dos-ret-t">${esc(r.texte||'')}</div></div>`;
}
/** Tous les retours du dossier, dans l'ordre du document. @param {object} d @returns {string} HTML */
function capDosRetoursTousHtml(d){
  const ordre=new Map(); let i=0; ordre.set('',i++);
  capDosParcours(d.blocs,b=>{ ordre.set(b.id,i++); ordre.set(b.id+'.d',i++); });
  const rang=r=>{ const k=String(r.bloc||'').split('~')[0]; return ordre.has(k)?ordre.get(k):1e9; };
  const l=d.retours.slice().sort((a,b)=>rang(a)-rang(b)||String(a.date).localeCompare(b.date));
  return `<div class="dos-tous">${l.map(r=>{ const x=capDosBlocDe(d, r.bloc); return capDosRetourHtml(r, capEsc((x.num?x.num+' ':'')+x.libelle)); }).join('')}</div>`;
}
/** @returns {object[]} types de retour {k, l} proposés aux relecteurs */
function capDosTypes(){ return [
  {k:'', l:_L('— Type —')}, {k:'remarque', l:_L('💡 Remarque')}, {k:'question', l:_L('❓ Question')}, {k:'erreur', l:_L('❌ Erreur')},
  {k:'proposition', l:_L('✏ Proposition')}, {k:'ok', l:_L('👍 D\'accord')}, {k:'modif', l:_L('✏ Modification (Word)')} ]; }

/* ── Événements (branchés par 56-accueil.js) ───────────────────────────── */

/**
 * Clics de l'onglet 📑 (délégation depuis capHomeClick).
 * @param {MouseEvent} e
 * @returns {boolean} vrai si traité
 */
function capDosClick(e){
  const t=e.target, u=_capDosUi, W=capHomeWin(t);
  const o=t.closest('[data-dos-open]'); if(o){ u.cur=o.dataset.dosOpen; capHomeRender(); return true; }
  const gb=t.closest('[data-dos-gab]'); if(gb){ capDosGenerer(gb.dataset.dosGab); return true; }   // 📘 rapport automatique (63)
  const rg=t.closest('[data-rap-go]'); if(rg){ const m=_capHome.dossiers.find(x=>x.id===rg.dataset.rapGo); if(m) capRapGenerer(m); return true; }   // 🧩 modèle personnalisé
  const nv=t.closest('[data-dos-nav]'); if(nv){ const d=capDosCur(); if(d) capDosAller(d, nv.dataset.dosNav); return true; }
  const a=t.closest('[data-da]'); if(!a) return false;
  const act=a.dataset.da, d=capDosOf(a), bEl=t.closest('[data-b]'), f=d&&bEl?capDosTrouve(d.blocs, bEl.dataset.b):null;
  if(act.startsWith('tx-')){ capDosTxAct(act, a, d, f, W); return true; }   // textes du modèle, commandes du clic droit (65)
  switch(act){
    case 'new': capDosNouveau(); break;
    case 'import': capDosImporter(W); return true;
    case 'html': if(d) capDosExport(d,'html',a); return true;
    case 'docx': if(d) capDosExport(d,'docx',a); return true;
    case 'dup': if(d){ const c=JSON.parse(JSON.stringify(d)); c.id=capHomeUid(); c.titre=d.titre+_L(' (copie)'); c.retours=[]; c.relus={};
      capDosParcours(c.blocs,b=>{ b.id=capHomeUid(); }); _capHome.dossiers.push(c); u.cur=c.id; } break;
    case 'del': if(d) capConfirm(_L(`Supprimer le dossier « ${d.titre||_L('(sans titre)')} » et ses ${d.retours.length} retour(s) ?`),{win:W, danger:true}).then(ok=>{ if(!ok) return; capHomePopClose('dos',d.id); _capHome.dossiers=_capHome.dossiers.filter(x=>x!==d); capHomeSave(); capHomeRender(); }); return true;
    case 'chap-add': if(d){ const c=capDosChapDe(null,''); d.blocs.push(c); capHomeSave(); capHomeRender(); capDosFocus(c.id); } return true;
    case 'txt-add': if(d){ const b=capDosBlocDeRef(null,''), l=f&&f.b.k==='chap'?f.b.blocs:d.blocs; l.push(b); capHomeSave(); capHomeRender(); capDosFocus(b.id); } return true;
    case 'sub-add': if(f&&f.b.k==='chap'){ const c=capDosChapDe(null,''); f.b.blocs.push(c); u.plies.delete(f.b.id); capHomeSave(); capHomeRender(); capDosFocus(c.id); } return true;
    case 'xl-open': if(f&&f.b.opts){ Object.assign(_capXl, f.b.opts); capAnaSub='xlay'; capShowView('analyses'); } return true;
    case 'liste-voir': if(f){ if(u.listes.has(f.b.id)) u.listes.delete(f.b.id); else u.listes.add(f.b.id); capHomeRender(); } return true;
    case 'liste-x': if(f&&f.b.ids) f.b.ids.splice(+a.dataset.i,1); break;
    case 'conv': if(f){ const id=capDosConvertir(f); capHomeSave(); capHomeRender(); const n=capHomeFind(`.dos-ed [data-b="${id}"]`); if(n){ n.classList.add('dos-flash'); setTimeout(()=>n.classList.remove('dos-flash'),1200); } } return true;
    case 'pli': if(f){ const y0=bEl.getBoundingClientRect().top; if(u.plies.has(f.b.id)) u.plies.delete(f.b.id); else u.plies.add(f.b.id); capHomeRender();
      const n=capHomeFind(`.dos-ed [data-b="${f.b.id}"]`), sc=n&&n.closest('.hm-doc'); if(sc) sc.scrollTop+=n.getBoundingClientRect().top-y0; } return true;   // le chapitre reste à sa place à l'écran
    case 'ref-x': if(f){ f.b.ref=null; f.b.desc=false; } break;
    case 'up': case 'down': if(f) capHomeMove(f.l, f.i, act==='up'?-1:1); break;
    case 'out': if(f&&f.parent){ const p=capDosTrouve(d.blocs, f.parent.id); f.l.splice(f.i,1); p.l.splice(p.i+1,0,f.b); } break;
    case 'in': { const prev=f&&f.l[f.i-1]; if(prev&&prev.k==='chap'){ f.l.splice(f.i,1); prev.blocs.push(f.b); u.plies.delete(prev.id); } else return true; break; }
    case 'del-b': if(f){ let n=0; if(f.b.k==='chap') capDosParcours(f.b.blocs,()=>n++);
      if(n){ capConfirm(_L(`Retirer le chapitre « ${f.b.titre} » et ses ${n} bloc(s) ?`),{win:W, danger:true, ok:_L('Retirer')}).then(ok=>{ if(!ok) return; f.l.splice(f.i,1); capHomeSave(); capHomeRender(); }); return true; }
      f.l.splice(f.i,1); } break;
    case 'ret': { const k=a.dataset.bid; if(u.ret.has(k)) u.ret.delete(k); else u.ret.add(k); capHomeRender(); return true; }
    case 'ret-tous': u.tous=!u.tous; capHomeRender(); return true;
    case 'boucle-add': if(d){ const c={id:capHomeUid(), k:'chap', titre:'{nom}', ref:null, desc:true, boucle:{type:'fn', couche:'SA', filtre:'', nom:'', max:30}, blocs:[]};
      (f&&f.b.k==='chap'?f.b.blocs:d.blocs).push(c); capHomeSave(); capHomeRender(); } return true;
    case 'auto-add': if(d){ (f&&f.b.k==='chap'?f.b.blocs:d.blocs).push({id:capHomeUid(), k:'auto', quoi:'desc'}); capHomeSave(); capHomeRender(); } return true;
    case 'rap-gen': if(d) capRapGenerer(d); return true;
    case 'visu': if(d) capDosVisu(d, a); return true;
    case 'rap-json': if(d) capRapJson(d); return true;
    case 'rap-new': capRapNouveau(); return true;
    case 'rap-import': capRapImporter(W); return true;
    case 'nav-pli': if(d){ capDosParcours(d.blocs,b=>{ if(b.k==='chap') u.plies.add(b.id); }); capHomeRender(); } return true;
    case 'nav-depli': u.plies.clear(); capHomeRender(); return true;
    case 'ret-del': { const n=t.closest('[data-rid]'); if(d&&n) capConfirm(_L('Supprimer ce retour ?'),{win:W, danger:true}).then(ok=>{ if(!ok) return; d.retours=d.retours.filter(r=>r.id!==n.dataset.rid); capHomeSave(); capHomeRender(); }); return true; }
    case 'rev-go': capRevShow(a.dataset.cid); return true;
    case 'revue': if(d) capDosVersRevue(d); return true;
    default: return false;
  }
  capHomeSave(); capHomeRender(); return true;
}
/** Place le curseur dans le titre (chapitre) ou le texte (bloc) qui vient d'être créé. @param {string} id - Bloc */
function capDosFocus(id){ const n=capHomeFind(`.dos-ed [data-b="${id}"] .dos-chap-t, .dos-ed [data-b="${id}"] .dos-txt`); if(n) n.focus(); }
/**
 * Saisies de l'onglet 📑 : champs du dossier, titres, textes ; cases (description, éléments représentés).
 * @param {Event} e
 * @returns {boolean} vrai si traité
 */
function capDosInput(e){
  const t=e.target;
  const ed=t.closest&&t.closest('.dos-ed'); if(!ed) return false;
  const d=_capHome.dossiers.find(x=>x.id===ed.dataset.dosid); if(!d) return true;
  if(t.dataset.dsf){ if(t.type==='checkbox'){ if(e.type==='change'){ d[t.dataset.dsf]=t.checked; capHomeSave(); } return true; }
    d[t.dataset.dsf]=t.value;
    if(t.dataset.dsf==='titre'){ const n=document.querySelector(`#cap-view-home [data-dos-open="${d.id}"] .hm-docs-n`); if(n) n.textContent='📑 '+(t.value||_L('(sans titre)')); }
    capHomeSaveLater(); return true; }
  const bEl=t.closest('[data-b]'), f=bEl&&capDosTrouve(d.blocs, bEl.dataset.b);
  // 🧩 modèle de rapport : réglages d'une boucle (data-bb) ou d'un contenu automatique (data-ba)
  if(f&&(t.dataset.bb||t.dataset.ba)){ const o=t.dataset.bb?f.b.boucle:f.b, k=t.dataset.bb||t.dataset.ba, liste=t.tagName==='SELECT'||t.type==='checkbox';
    if(liste&&e.type!=='change') return true;
    o[k]=t.type==='checkbox'?t.checked:t.value; if(liste){ capHomeSave(); capHomeRender(); } else capHomeSaveLater(); return true; }
  if(!f||!t.dataset.bf) return true;
  if(t.type==='checkbox'){ if(e.type!=='change') return true; f.b[t.dataset.bf]=t.checked; capHomeSave(); capHomeRender(); return true; }
  f.b[t.dataset.bf]=t.value; capHomeSaveLater(); return true;
}
/**
 * Dépôt d'une référence ou d'un texte dans le dossier ouvert.
 * @param {HTMLElement} z - Zone (data-drop : dos-new, dos-chap, dos-in, dos-sub)
 * @param {?object} ref - Référence déposée
 * @param {string} txt - Texte déposé (sans référence)
 */
function capDosDrop(z, ref, txt){
  const ed=z.closest('.dos-ed'), d=ed&&_capHome.dossiers.find(x=>x.id===ed.dataset.dosid); if(!d) return;
  const k=z.dataset.drop, bEl=z.closest('[data-b]'), f=bEl&&capDosTrouve(d.blocs, bEl.dataset.b);
  if(k==='dos-new') d.blocs.push(capDosChapDe(ref, txt));
  else if(!f) return;
  else if(k==='dos-sub') f.b.blocs.push(capDosChapDe(ref, txt));
  else if(k==='dos-txt'){ if(!ref) return; capDosLier(f, ref); }   // texte libre → texte du modèle (65)
  else if(k==='dos-liste'){ if(!ref||ref.k!=='el'||f.b.ids.includes(ref.id)) return; f.b.ids.push(ref.id); }
  else if(k==='dos-chap'&&(!ref||ref.k==='el')){
    if(ref){ f.b.ref=ref; f.b.desc=true; if(!f.b.titre) f.b.titre=capHomeRefNom(ref); }
    else f.b.titre=f.b.titre?f.b.titre+' '+txt:txt;
  }
  else f.b.blocs.push(capDosBlocDeRef(ref, txt));
  if(f) _capDosUi.plies.delete(f.b.id);
  capHomeSave(); capHomeRender();
}

/* ── Contenu exporté ───────────────────────────────────────────────────── */

/**
 * SVG des diagrammes d'une liste (la vue 🔲 Diagrammes Capella est ouverte le temps de l'export, puis la vue précédente rétablie).
 * @param {string[]} uids - Représentations
 * @param {function(string):void} [st] - Avancement
 * @returns {Promise<Object<string,string>>} uid → SVG
 */
async function capDosDiagSvgs(uids, st){
  const out={}, reps=capHomeReps().filter(r=>uids.includes(r.uid)); if(!reps.length) return out;
  const avant=capNavCurKey(true)||'home', mode=currentMode;
  capNavOpen('diag');
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  try{
    for(let i=0;i<reps.length;i++){ if(st) st(_L(`⏳ Diagramme ${i+1}/${reps.length} — ${reps[i].nom}`));
      try{ out[reps[i].uid]=await capDiagSvg(reps[i].uid); }catch(e){ console.warn('Diagramme non exporté :', reps[i].nom, e); } }
  } finally {
    if(mode!=='capella') document.getElementById('mode-rm')?.click(); else capNavOpen(avant);
  }
  return out;
}
/**
 * Contenu du dossier prêt à exporter : chapitres numérotés, descriptions (texte), éléments, diagrammes (SVG, dimensions,
 * description, éléments représentés), textes ; figures numérotées.
 * @param {object} d - Dossier
 * @param {function(string):void} [st] - Avancement
 * @returns {Promise<object[]>} nœuds {id, k, …, enfants}
 */
async function capDosContenu(d, st){
  const uids=[]; capDosParcours(d.blocs,b=>{ if(b.k==='diag'&&!uids.includes(b.ref.id)) uids.push(b.ref.id); });
  const svgs=uids.length?await capDosDiagSvgs(uids, st):{};
  const reps=capHomeReps(), info=ref=>{ const e=ref&&ref.k==='el'&&capLoaded&&capGetElementById_(ref.id);
    return {nom:ref?capHomeRefNom(ref):'', type:ref?capHomeRefType(ref):'', couche:e?e.layer||'':ref&&ref.couche||'', desc:e?capHtmlToText(e.attrs.description||''):'', absent:!!ref&&!e}; };
  let fig=0;
  const conv=(l, pre, niv)=>{ let n=0;
    return l.map(b=>{
      if(b.k==='chap'){ n++; const num=(pre?pre+'.':'')+n, r=b.ref?info(b.ref):null;
        return {id:b.id, k:'chap', num, niv, titre:capDosTitre(b)||(r&&r.nom)||'', ref:r?{nom:r.nom, type:r.type, couche:r.couche}:null, desc:b.desc&&r?r.desc:'', avecDesc:!!(b.desc&&r), enfants:conv(b.blocs, num, niv+1)}; }
      if(b.k==='txt') return {id:b.id, k:'txt', txt:b.txt||''};
      if(b.k==='mod') return {id:b.id, k:'txt', txt:capDosModTexte(b)};   // texte du modèle, relu à l'export
      if(b.k==='liste'){ const t=capDosListeLignes(b); b.elemsExp=t.rows.map(x=>x.id);   // lignes exportées (réimport Word)
        return {id:b.id, k:'liste', titre:b.titre||'', head:t.head, rows:t.rows}; }
      if(b.k==='xlay'){ const r=capXlSvg(b.opts||{});   // ⇶ Liens entre couches, redessinés sur le modèle chargé
        return {id:b.id, k:'diag', fig:++fig, nom:capXlTitre(b.opts||{}), type:_L('Liens entre couches'), couche:'', desc:'', cible:'', svg:r.svg, w:r.w, h:r.h, elems:[]}; }
      if(b.k==='el'){ const r=info(b.ref); return {id:b.id, k:'el', nom:r.nom, type:r.type, couche:r.couche, desc:b.desc?r.desc:'', avecDesc:!!b.desc, absent:r.absent}; }
      const rep=reps.find(x=>x.uid===b.ref.id), svg=svgs[b.ref.id]||'', m=rep?capDiagMeta(rep.uid):null;
      const o={id:b.id, k:'diag', fig:++fig, nom:capDosNomDiag(rep?rep.nom:b.ref.nom), type:capHomeRefType(b.ref), couche:rep?rep.couche||'':b.ref.couche||'',
        desc:b.desc&&m?m.desc:'', cible:m&&m.cible?m.cible.nom+' ('+m.cible.type+')':'', svg:'', w:0, h:0, elems:[]};
      if(svg){ const p=capDiagPlanche(rep, svg, {cadre:false, cartouche:false, desc:false}); Object.assign(o,{svg:p.svg, w:p.w, h:p.h});
        if(b.elems){ o.elems=capDosElemsReels(capDiagElements(svg)); b.elemsExp=o.elems.map(x=>x[3]); } }
      return o;
    }); };
  return conv(d.blocs, '', 0);
}
/**
 * Données exportées d'un dossier (page HTML, Word, aperçu) : contenu résolu sur le modèle chargé et informations d'envoi.
 * @param {object} d - Dossier
 * @param {function(string):void} [st] - Avancement
 * @returns {Promise<object>} envoi (type « arcalyse-dossier-relecture »)
 */
async function capDosEnvoi(d, st){
  const contenu=await capDosContenu(d, st);
  return {type:'arcalyse-dossier-relecture', version:1, id:d.id, envoi:capHomeUid(), titre:d.titre||_L('Dossier de relecture'), consignes:d.consignes||'',
    echeance:d.echeance||'', auteur:d.auteur||'', date:new Date().toISOString(), model:capCurrentFileName||'', project:capRevProjectId(), projectName:capRevProjectName(),
    source:JSON.parse(JSON.stringify({titre:d.titre, consignes:d.consignes, echeance:d.echeance, auteur:d.auteur, blocs:d.blocs})), contenu, relecteur:'', retours:[], relus:{},
    commentaires:d.commentaires!==false};
}
/**
 * 👁 Aperçu du rendu : la page HTML du dossier (ou, pour un 🧩 modèle, du rapport qu'il produirait, sans le créer)
 * affichée dans une fenêtre au-dessus de l'application, en lecture ou avec les commentaires ; imprimer, télécharger.
 * @param {object} d - Dossier ou modèle de rapport
 * @param {HTMLElement} [btn] - Bouton (désactivé pendant la préparation)
 */
async function capDosVisu(d, btn){
  const W=capHomeWin(btn), st=m=>capWatchFlash(m);
  let src=d;
  if(d.modele){ if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle.'),{win:W}); return; }
    src=Object.assign({}, d, {id:'apercu', modele:false, blocs:capRapEval(d.blocs, null, capDosOutils())}); }
  if(!src.blocs.length){ capAlert(_L('Le dossier est vide : ajoutez au moins un chapitre.'),{win:W}); return; }
  if(btn) btn.disabled=true;
  try{ const envoi=await capDosEnvoi(src, st), w=capDosVisuWins.get(d.id);
    if(w&&!w.closed){ envoi.commentaires=w._arcCom!=null?w._arcCom:envoi.commentaires; capDosVisuEcrire(w, envoi); w.focus(); st(_L('✔ Aperçu actualisé dans sa fenêtre')); }   // aperçu déjà détaché : actualisé
    else capDosVisuOuvrir(envoi, W, d.modele, d.id); }
  catch(e){ console.error(e); capAlert(_L('Aperçu impossible : ')+(e&&e.message||e),{win:W, level:'err'}); }
  finally{ if(btn) btn.disabled=false; }
}
/** Aperçus détachés dans une fenêtre séparée : identifiant du dossier → fenêtre. */
const capDosVisuWins=new Map();
/**
 * Écrit la page du rapport dans une fenêtre séparée (titre « 👁 … »).
 * @param {Window} w - Fenêtre
 * @param {object} envoi - Données (capDosEnvoi)
 */
function capDosVisuEcrire(w, envoi){
  const D=w.document; D.open(); D.write(capDosPage(envoi).replace('<title>',`<title>👁 `)); D.close(); w._arcCom=envoi.commentaires;
}
/**
 * ⧉ Détache l'aperçu dans sa propre fenêtre (par exemple sur un autre écran) ; 👁 Aperçu l'actualise ensuite.
 * @param {object} envoi - Données (capDosEnvoi)
 * @param {Window} W - Fenêtre d'origine
 * @param {string} [id] - Dossier (pour actualiser la même fenêtre)
 * @returns {boolean} vrai si la fenêtre a pu être ouverte
 */
function capDosVisuDetacher(envoi, W, id){
  const w=W.open('', 'arcalyse-apercu-'+(id||'x'), 'width=1150,height=900');
  if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.'),{win:W, level:'warn'}); return false; }
  capDosVisuEcrire(w, envoi); if(id) capDosVisuWins.set(id, w); w.focus(); return true;
}
/**
 * Fenêtre d'aperçu : page du rapport dans un cadre, bascule 📄 Lecture / 💬 Avec commentaires, 🖨 Imprimer, ⬇ Page HTML,
 * ⧉ fenêtre séparée, ✕ (ou Échap).
 * @param {object} envoi - Données (capDosEnvoi)
 * @param {Window} W - Fenêtre (page ou fenêtre séparée)
 * @param {boolean} [modele] - Aperçu d'un 🧩 modèle (rapport non créé)
 * @param {string} [id] - Dossier ou modèle prévisualisé
 */
function capDosVisuOuvrir(envoi, W, modele, id){
  const D=W.document; D.getElementById('dos-visu')?.remove();
  const ov=D.createElement('div'); ov.id='dos-visu'; D.body.appendChild(ov);
  const rendu=()=>{
    ov.innerHTML=`<div class="dos-visu-box"><div class="dos-visu-h"><b>${_L('👁 Aperçu')}</b><span class="dos-visu-t">${capEsc(envoi.titre)}</span>`+
      (modele?`<span class="ana-dim">${_L('rendu du rapport que produirait ce modèle (non créé)')}</span>`:'')+`<span style="flex:1"></span>`+
      `<span class="tb-grp"><button class="phl-toggle-btn${envoi.commentaires?'':' active'}" data-v="lect" title="${_L('Rapport à lire et imprimer')}">${_L('📄 Lecture')}</button>`+
      `<button class="phl-toggle-btn${envoi.commentaires?' active':''}" data-v="com" title="${_L('Page telle que la voient les relecteurs, avec les 💬')}">${_L('💬 Avec commentaires')}</button></span>`+
      `<button class="cap-lf-btn" data-v="print">${_L('🖨 Imprimer')}</button><button class="cap-lf-btn" data-v="dl" title="${_L('Télécharger cette page HTML')}">${_L('⬇ Page HTML')}</button>`+
      `<button class="cap-lf-btn" data-v="pop" title="${_L('Ouvrir l\'aperçu dans une fenêtre séparée (par exemple sur un autre écran) ; 👁 Aperçu l\'actualise ensuite')}">⧉</button>`+
      `<button class="cap-lf-btn" data-v="x" title="${_L('Fermer (Échap)')}">✕</button></div><iframe class="dos-visu-f" title="${_L('Aperçu')}"></iframe></div>`;
    ov.querySelector('iframe').srcdoc=capDosPage(envoi);
  };
  const fermer=()=>{ ov.remove(); D.removeEventListener('keydown',touche); };
  const touche=e=>{ if(e.key==='Escape') fermer(); };
  D.addEventListener('keydown',touche);
  ov.onclick=e=>{ const b=e.target.closest('[data-v]'); if(e.target===ov){ fermer(); return; } if(!b) return;
    const v=b.dataset.v;
    if(v==='x') fermer();
    else if(v==='pop'){ if(capDosVisuDetacher(envoi, W, id)) fermer(); }
    else if(v==='lect'||v==='com'){ envoi.commentaires=v==='com'; rendu(); }
    else if(v==='print'){ const f=ov.querySelector('iframe'); try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(err){ console.error(err); } }
    else if(v==='dl') capDownloadBlob(new Blob([capDosPage(envoi)],{type:'text/html'}), ((envoi.titre||'rapport').replace(/[^\p{L}\p{N}\-]+/gu,'_').slice(0,60)||'rapport')+'.html');
  };
  rendu();
}
/**
 * Exporte le dossier : page HTML à commenter ou document Word.
 * @param {object} d - Dossier
 * @param {string} fmt - 'html' | 'docx'
 * @param {HTMLElement} [btn] - Bouton (désactivé pendant l'export)
 */
async function capDosExport(d, fmt, btn){
  if(!d.blocs.length){ capAlert(_L('Le dossier est vide : ajoutez au moins un chapitre.'),{win:capHomeWin(btn)}); return; }
  const st=m=>capWatchFlash(m);
  if(btn) btn.disabled=true;
  try{
    const envoi=await capDosEnvoi(d, st); capHomeSave();   // elemsExp : éléments représentés exportés (réimport Word)
    const base=(d.titre||_L('dossier')).replace(/[^\p{L}\p{N}\-]+/gu,'_').slice(0,60)||'dossier';
    if(d.modele) throw new Error(_L('un modèle de rapport ne s\'exporte pas : ▶ Générer le rapport, puis exportez le rapport'));
    if(fmt==='docx'){ capDownloadBlob(await capDosDocx(envoi, st), base+'.docx'); st(_L('✔ Document Word créé : les relecteurs le commentent (Révision › Nouveau commentaire), puis 📥 Réimporter le .docx commenté')); }
    else { capDownloadBlob(new Blob([capDosPage(envoi)],{type:'text/html'}), base+'.html'); st(_L('✔ Page de relecture créée : envoyez-la aux relecteurs, puis 📥 Réimporter la page qu\'ils ont enregistrée')); }
  }catch(e){ console.error(e); capAlert(_L('Export impossible : ')+(e&&e.message||e),{win:capHomeWin(btn), level:'err'}); }
  finally{ if(btn) btn.disabled=false; }
}
/**
 * Éléments représentés d'un diagramme, tels qu'un relecteur les reconnaît : une implication sans nom
 * (fonction ou composant impliqué dans une chaîne, une capacité…) est remplacée par l'élément impliqué ;
 * les éléments techniques sans nom sont écartés, les doublons fusionnés.
 * @param {{id:string, nom:string, type:string, couche:string}[]} l - capDiagElements
 * @returns {Array<string[]>} lignes [nom, type, couche, id]
 */
function capDosElemsReels(l){
  const vus=new Set(), out=[];
  l.forEach(x=>{ let e=capGetElementById_(x.id);
    if(e&&!e.attrs.name&&e.attrs.involved){ const r=capParseAttrRefs_(String(e.attrs.involved)).map(capGetElementById_).find(Boolean); if(r) e=r; }
    if(!e||!e.attrs.name||vus.has(e.id)) return; vus.add(e.id);
    out.push([e.attrs.name, (CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName, e.layer||'', e.id]); });
  return out;
}
/**
 * Élément au bout d'un échange : un port est remplacé par son propriétaire (fonction, composant), une Part par son type.
 * @param {string} v - Valeur de l'attribut source ou target
 * @returns {object|null} élément du modèle
 */
function capDosBout(v){
  let e=capParseAttrRefs_(String(v||'')).map(capGetElementById_).find(Boolean); const P=capGetParentIndex().parentOf;
  for(let i=0;e&&i<4;i++){
    if(/Port$/.test(e.typeName)){ e=capGetElementById_(P[e.id])||e; continue; }
    if(e.typeName==='Part'&&e.attrs.abstractType){ e=capParseAttrRefs_(String(e.attrs.abstractType)).map(capGetElementById_).find(Boolean)||e; }
    break;
  }
  return e||null;
}
/**
 * Lignes d'un tableau d'éléments, lues sur le modèle chargé : nom, type, description ; ou pour des échanges :
 * échange, source, cible, éléments échangés.
 * @param {object} b - Bloc {k:'liste', ids, cols:'desc'|'ech'}
 * @returns {{head:string[], rows:{id:string, c:string[]}[]}}
 */
function capDosListeLignes(b){
  if(b.cols==='req') return capDosReqLignes(b.ids||[]);   // tableau d'exigences (66)
  const nom=e=>e?e.attrs.name||'':'—', noms=v=>capParseAttrRefs_(String(v||'')).map(capGetElementById_).filter(Boolean).map(x=>x.attrs.name||'').filter(Boolean).join(', ');
  const els=(b.ids||[]).map(id=>capLoaded&&capGetElementById_(id)).filter(Boolean);
  if(b.cols==='ech') return {head:[_L('Échange'), _L('Source'), _L('Cible'), _L('Éléments échangés')],
    rows:els.map(e=>({id:e.id, c:[nom(e), nom(capDosBout(e.attrs.source)), nom(capDosBout(e.attrs.target)), noms(e.attrs.exchangedItems||e.attrs.convoyedInformations||'')]}))};
  return {head:[_L('Élément'), 'Type', 'Description'], rows:els.map(e=>({id:e.id, c:[nom(e), (CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName, capHtmlToText(e.attrs.description||'')]}))};
}
/** Base64 d'un texte UTF-8 (SVG embarqué dans la page). @param {string} s @returns {string} */
function capDosB64(s){
  const b=new TextEncoder().encode(s); let r='';
  for(let i=0;i<b.length;i+=0x8000) r+=String.fromCharCode.apply(null, b.subarray(i,i+0x8000));
  return btoa(r);
}

/* ── Page HTML à commenter ─────────────────────────────────────────────── */

/**
 * Page HTML autonome (hors ligne) du dossier : sommaire, chapitres numérotés, figures, commentaires par bloc,
 * chapitres « relus », enregistrement de la page (avec les retours) ou export .json.
 * @param {object} data - Envoi (type « arcalyse-dossier-relecture »)
 * @returns {string} Document HTML
 */
function capDosPage(data){
  const T={relecteur:_L('Relecteur'), nom:_L('Votre nom'), save:_L('💾 Enregistrer la page'), json:_L('⬇ Retours .json'), print:_L('🖨 Imprimer'),
    unsaved:_L('● modifications non enregistrées'), saved:_L('✔ Page enregistrée : renvoyez-la à l\'auteur'), noName:_L('Indiquez d\'abord votre nom (en haut de la page).'),
    comment:_L('Commenter ce passage'), general:_L('Commentaires généraux'), generalAdd:_L('💬 Commentaire général'), sommaire:_L('Sommaire'), consignes:_L('Consignes'),
    figure:_L('Figure'), relu:_L('Relu'), coms:_L('commentaire(s)'), mine:_L('de vous'), relus:_L('chapitre(s) relu(s)'), ok:_L('Enregistrer'), cancel:_L('Annuler'),
    placeholder:_L('Votre commentaire…'), extrait:_L('Passage commenté'), del:_L('Supprimer'), edit:_L('Modifier'), confirmDel:_L('Supprimer ce commentaire ?'),
    projet:_L('Projet'), modele:_L('Modèle'), auteur:_L('Auteur'), date:_L('Envoyé le'), echeance:_L('Retour attendu le'), elems:_L('Éléments représentés'),
    cible:_L('Élément représenté'), elemsAide:_L('cliquez pour les afficher et les commenter un par un'), desc:_L('Description'), nodesc:_L('(pas de description)'), nodiag:_L('Diagramme non joint (.aird non chargé lors de l\'export)'),
    absent:_L('absent du modèle'), elem:_L('Élément'), type:'Type', couche:_L('Couche'), aide:_L('Sélectionnez au besoin un passage, puis cliquez sur 💬 à droite du bloc pour le commenter. Enregistrez la page (💾) et renvoyez-la à l\'auteur ; elle peut passer d\'un relecteur à l\'autre.'),
    fileSuffix:_L('-relu'), zoom:_L('Cliquer pour agrandir / réduire'), produit:_L('Produit par Arcalyse')};
  const types=capDosTypes().filter(x=>x.k!=='modif'), crits=capRevCrits().filter(c=>['','minor','major','blocking'].includes(c.k)).map(c=>c.k?c:Object.assign({},c,{l:_L('— Criticité —')}));
  const json=o=>JSON.stringify(o).replace(/</g,'\\u003c');
  const d=JSON.parse(JSON.stringify(data));
  (function b64(l){ l.forEach(n=>{ if(n.k==='diag'&&n.svg){ n.svg64=capDosB64(n.svg); delete n.svg; } if(n.enfants) b64(n.enfants); }); })(d.contenu);
  return `<!DOCTYPE html><html lang="${CAP_LANG==='en'?'en':'fr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${capEsc(d.titre)}</title><style>
*{box-sizing:border-box}body{margin:0;font:14px/1.5 'Segoe UI',Arial,sans-serif;color:#1f2328;background:#f6f8fa}
#bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 16px;background:#fff;border-bottom:1px solid #d0d7de;box-shadow:0 1px 3px rgba(0,0,0,.06)}
#bar input{padding:4px 8px;border:1px solid #d0d7de;border-radius:6px;font:inherit;width:200px}#bar .sp{flex:1}#cnt{color:#57606a;font-size:12.5px}
button{font:inherit;font-size:13px;padding:4px 10px;border:1px solid #d0d7de;border-radius:6px;background:#f6f8fa;cursor:pointer;color:#1f2328}button:hover{background:#eaeef2}
.pri{background:#1f6feb;border-color:#1f6feb;color:#fff}.pri:hover{background:#1a5fd0}.warn{color:#bc4c00}.msg{color:#1a7f37}
#page{max-width:1000px;margin:18px auto;padding:24px 32px 40px;background:#fff;border:1px solid #d0d7de;border-radius:8px}
h1.t{font-size:24px;margin:0 0 6px}.meta{color:#57606a;font-size:12.5px;margin-bottom:12px}.meta b{color:#1f2328}
.box{border:1px solid #d0d7de;border-left:4px solid #1f6feb;border-radius:6px;padding:8px 12px;margin:10px 0;background:#f6f8fa;white-space:pre-wrap}
.aide{font-size:12.5px;color:#57606a;border-left-color:#bf8700}
nav ol{margin:4px 0 0;padding-left:0;list-style:none}nav li{margin:1px 0}nav a{color:#0969da;text-decoration:none}nav a:hover{text-decoration:underline}nav .n1{padding-left:18px}nav .n2{padding-left:36px}nav .n3{padding-left:54px}
.blk{position:relative;padding-right:40px}.cb{position:absolute;right:0;top:2px;padding:1px 6px;font-size:13px;opacity:.55}.blk:hover>.cb,h1:hover>.cb,h2:hover>.cb,h3:hover>.cb,h4:hover>.cb{opacity:1}
section.chap{margin-top:18px}h2,h3,h4,h5{margin:16px 0 6px;scroll-margin-top:60px}h2{font-size:20px;border-bottom:2px solid #d0d7de;padding-bottom:4px}h3{font-size:17px}h4{font-size:15px}h5{font-size:14px}
.num{color:#0969da;margin-right:6px}.refl{font-size:12px;color:#57606a;margin:-2px 0 6px}
.relu{position:absolute;right:34px;top:4px;font-size:12px;font-weight:400;color:#57606a;cursor:pointer}.relu input{vertical-align:middle}
.desc,.txt{white-space:pre-wrap;margin:6px 0}.desc{border-left:3px solid #d0d7de;padding-left:10px;color:#24292f}.nodesc{color:#8c959f;font-style:italic}
.el{border:1px solid #d0d7de;border-radius:6px;padding:6px 10px;margin:8px 0}.el .h{font-weight:600}.el .h span{font-weight:400;color:#57606a;font-size:12px;margin-left:6px}.el .d{white-space:pre-wrap;margin-top:4px}
figure{margin:12px 0;border:1px solid #d0d7de;border-radius:6px;padding:8px}figure .img{overflow:auto;text-align:center;cursor:zoom-in}figure img{max-width:100%;height:auto}figure .img.z{cursor:zoom-out}figure .img.z img{max-width:none}
figcaption{text-align:center;font-size:13px;color:#24292f;margin-top:6px}figcaption b{color:#0969da}.fd{white-space:pre-wrap;font-size:13px;color:#24292f;margin-top:6px}.fc{font-size:12px;color:#57606a;text-align:center}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:6px}.ec{width:34px;text-align:center}.cbe{padding:0 5px;font-size:12px;opacity:.6}tr:hover .cbe{opacity:1}tr.cz td{border:0;padding:0}.lst .lt{font-weight:600;margin-top:10px}table.lstt td{vertical-align:top}table.lstt .ld{white-space:pre-wrap;font-size:12px;color:#24292f}tr.cz .coms:empty{display:none}details.els summary{font-weight:600}th,td{border:1px solid #d0d7de;padding:3px 6px;text-align:left}th{background:#f6f8fa}details{margin-top:6px}summary{cursor:pointer;color:#0969da;font-size:12.5px}
.coms{margin:4px 0 8px 14px}.com{border:1px solid #d4a72c;background:#fff8c5;border-radius:6px;padding:5px 9px;margin:5px 0;font-size:13px}.com.other{border-color:#d0d7de;background:#f6f8fa}
.com .h{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#57606a}.com .h b{color:#1f2328}.com .x{font-style:italic;color:#57606a;margin-top:2px}.com .t{white-space:pre-wrap;margin-top:2px}
.com .a{margin-left:auto}.com .a button{padding:0 6px;font-size:12px}.crit{padding:0 6px;border-radius:8px;font-size:11px}
.form{border:1px solid #1f6feb;border-radius:6px;padding:8px;margin:6px 0;background:#f0f6ff}.form select{font:inherit;font-size:13px;padding:3px;border:1px solid #d0d7de;border-radius:6px;margin-right:6px}
.form textarea{width:100%;min-height:70px;margin:6px 0;font:inherit;padding:6px;border:1px solid #d0d7de;border-radius:6px}.form .x{font-style:italic;color:#57606a;font-size:12.5px}
.foot{margin-top:28px;color:#8c959f;font-size:11.5px}
#side{display:none}@media (min-width:1400px){#side{display:block;position:fixed;top:64px;left:12px;width:calc((100vw - 1060px)/2);max-width:340px;bottom:12px;overflow:auto;font-size:12.5px;background:#fff;border:1px solid #d0d7de;border-radius:8px;padding:8px 10px}#side a.on{font-weight:700}}
body.nocom .cb,body.nocom .cbe,body.nocom .relu,body.nocom .coms,body.nocom tr.cz,body.nocom #bar label,body.nocom #b-json,body.nocom #b-save,body.nocom #cnt,body.nocom .aide,body.nocom #gen,body.nocom .ec,body.nocom .lstt th:last-child{display:none!important}
@media print{#bar,.cb,.relu,.form,#side{display:none!important}body{background:#fff}#page{border:0;margin:0;padding:0;max-width:none}figure,.el,.com{break-inside:avoid}h2,h3,h4{break-after:avoid}}
@media (max-width:700px){#page{padding:14px;margin:0;border-radius:0}}
</style>
<script type="application/json" id="arcalyse-dossier-relecture">${json(d)}<\/script></head><body>
<div id="bar"><b>📑</b><label>${T.relecteur} : <input id="me" placeholder="${capEsc(T.nom)}"></label><span id="cnt"></span><span class="sp"></span><span id="st"></span>
<button id="b-print">${T.print}</button><button id="b-json">${T.json}</button><button id="b-save" class="pri">${T.save}</button></div>
<nav id="side"></nav><div id="page"><div id="head"></div><div id="doc"></div><div class="foot">${T.produit}</div></div>
<script>(function(){
var T=${json(T)}, TY=${json(types)}, CR=${json(crits)};
var el=document.getElementById('arcalyse-dossier-relecture'), D=JSON.parse(el.textContent), dirty=false, form=null, selTxt='';
D.retours=D.retours||[]; D.relus=D.relus||{};
function $(i){return document.getElementById(i);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function dt(s){if(!s)return'';var x=new Date(s.length===10?s+'T12:00:00':s);return isNaN(x)?s:(s.length===10?x.toLocaleDateString():x.toLocaleString());}
function find(l,k){for(var i=0;i<l.length;i++)if(l[i].k===k)return l[i];return null;}
function uid(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function ink(h){var m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return'#000';var n=parseInt(m[1],16),r=n>>16,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#000':'#fff';}
function me(){return (D.relecteur||'').trim();}
function mark(){dirty=true;$('st').innerHTML='<span class="warn">'+esc(T.unsaved)+'</span>';counts();}
function chaps(l,o){l.forEach(function(n){if(n.k==='chap'){o.push(n);chaps(n.enfants,o);}});return o;}
function counts(){var c=chaps(D.contenu,[]),r=0;c.forEach(function(n){if((D.relus[n.id]||[]).indexOf(me())>=0)r++;});
  $('cnt').textContent=D.retours.length+' '+T.coms+' · '+D.retours.filter(function(x){return me()&&x.auteur===me();}).length+' '+T.mine+' · '+r+'/'+c.length+' '+T.relus;}
function btn(b){return '<button class="cb" data-new="'+b+'" title="'+esc(T.comment)+'">💬</button>';}
function zone(b){return '<div class="coms" data-c="'+b+'"></div>';}
function com(r){var ty=find(TY,r.type||''),cr=find(CR,r.crit||''),mine=me()&&r.auteur===me();
  return '<div class="com'+(mine?'':' other')+'"><div class="h">'+(ty&&ty.k?'<span>'+esc(ty.l)+'</span>':'')+(cr&&cr.k?'<span class="crit" style="background:'+cr.c+';color:'+ink(cr.c)+'">'+esc(cr.l)+'</span>':'')+
  '<b>'+esc(r.auteur)+'</b><span>'+esc(dt(r.date))+'</span>'+(mine?'<span class="a"><button data-ed="'+r.id+'" title="'+esc(T.edit)+'">✎</button><button data-del="'+r.id+'" title="'+esc(T.del)+'">🗑</button></span>':'')+'</div>'+
  (r.extrait?'<div class="x">« '+esc(r.extrait)+' »</div>':'')+'<div class="t">'+esc(r.texte)+'</div></div>';}
function opts(l,v){return l.map(function(o){return '<option value="'+o.k+'"'+(o.k===v?' selected':'')+'>'+esc(o.l)+'</option>';}).join('');}
function formHtml(){var r=form.r||{};return '<div class="form"><select id="f-ty">'+opts(TY,r.type||'')+'</select><select id="f-cr">'+opts(CR,r.crit||'')+'</select>'+
  (form.x?'<div class="x">'+esc(T.extrait)+' : « '+esc(form.x)+' »</div>':'')+'<textarea id="f-t" placeholder="'+esc(T.placeholder)+'">'+esc(r.texte||'')+'</textarea>'+
  '<button class="pri" id="f-ok">'+esc(T.ok)+'</button> <button id="f-no">'+esc(T.cancel)+'</button></div>';}
function upd(b){var z=document.querySelector('.coms[data-c="'+b+'"]');if(!z)return;
  z.innerHTML=D.retours.filter(function(r){return r.bloc===b;}).map(com).join('')+(form&&form.b===b?formHtml():'');
  if(form&&form.b===b){var t=$('f-t');if(t)t.focus();}}
function updAll(){var z=document.querySelectorAll('.coms[data-c]');for(var i=0;i<z.length;i++)upd(z[i].getAttribute('data-c'));counts();}
function para(s,cl){return s?'<div class="blk '+cl+'" data-b="">'+esc(s)+'</div>':'';}
function node(n){
  if(n.k==='chap'){var h=Math.min(n.niv+2,5),relu=(D.relus[n.id]||[]).indexOf(me())>=0&&me();
    var s='<section class="chap" id="s-'+n.id+'"><h'+h+' class="blk"><span class="num">'+esc(n.num)+'</span>'+esc(n.titre)+
      '<label class="relu"><input type="checkbox" data-relu="'+n.id+'"'+(relu?' checked':'')+'> '+esc(T.relu)+'</label>'+btn(n.id)+'</h'+h+'>'+zone(n.id);
    if(n.ref)s+='<div class="refl">'+esc(n.ref.type)+(n.ref.couche?' · '+esc(n.ref.couche):'')+'</div>';
    if(n.avecDesc)s+='<div class="blk desc">'+(n.desc?esc(n.desc):'<span class="nodesc">'+esc(T.nodesc)+'</span>')+btn(n.id+'.d')+'</div>'+zone(n.id+'.d');
    return s+n.enfants.map(node).join('')+'</section>';}
  if(n.k==='liste')return '<div class="blk lst"><div class="lt">▤ '+esc(n.titre)+' <span style="color:#57606a;font-weight:400">('+n.rows.length+')</span></div>'+btn(n.id)+'</div>'+zone(n.id)+
    '<table class="lstt"><tr>'+n.head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'<th></th></tr>'+n.rows.map(function(r){var b=n.id+'~'+r.id;
      return '<tr>'+r.c.map(function(x,i){return '<td'+(i===r.c.length-1?' class="ld"':'')+'>'+esc(x)+'</td>';}).join('')+'<td class="ec"><button class="cbe" data-new="'+esc(b)+'" title="'+esc(T.comment)+'">💬</button></td></tr><tr class="cz"><td colspan="'+(n.head.length+1)+'">'+zone(b)+'</td></tr>';}).join('')+'</table>';
  if(n.k==='txt')return '<div class="blk txt">'+esc(n.txt)+btn(n.id)+'</div>'+zone(n.id);
  if(n.k==='el')return '<div class="blk el"><div class="h">◆ '+esc(n.nom)+'<span>'+esc(n.type)+(n.couche?' · '+esc(n.couche):'')+(n.absent?' · '+esc(T.absent):'')+'</span></div>'+
    (n.avecDesc?'<div class="d">'+(n.desc?esc(n.desc):'<span class="nodesc">'+esc(T.nodesc)+'</span>')+'</div>':'')+btn(n.id)+'</div>'+zone(n.id);
  var f='<figure class="blk">'+(n.svg64?'<div class="img" title="'+esc(T.zoom)+'"><img alt="'+esc(n.nom)+'" src="data:image/svg+xml;base64,'+n.svg64+'"></div>':'<div class="fc">'+esc(T.nodiag)+'</div>')+
    '<figcaption><b>'+esc(T.figure)+' '+n.fig+'</b> — '+esc(n.nom)+' <span style="color:#57606a">('+esc(n.type)+')</span></figcaption>'+
    (n.cible?'<div class="fc">'+esc(T.cible)+' : '+esc(n.cible)+'</div>':'')+(n.desc?'<div class="fd">'+esc(n.desc)+'</div>':'');
  if(n.elems&&n.elems.length){var ouvert=D.retours.some(function(r){return String(r.bloc).indexOf(n.id+'~')===0;});
    f+='<details class="els"'+(ouvert?' open':'')+'><summary>'+esc(T.elems)+' ('+n.elems.length+') — '+esc(T.elemsAide)+'</summary><table><tr><th>'+esc(T.elem)+'</th><th>'+esc(T.type)+'</th><th>'+esc(T.couche)+'</th><th></th></tr>'+
    n.elems.map(function(e){var b=n.id+'~'+(e[3]||'');return '<tr><td>'+esc(e[0])+'</td><td>'+esc(e[1])+'</td><td>'+esc(e[2])+'</td><td class="ec">'+(e[3]?'<button class="cbe" data-new="'+esc(b)+'" title="'+esc(T.comment)+'">💬</button>':'')+'</td></tr>'+
      (e[3]?'<tr class="cz"><td colspan="4">'+zone(b)+'</td></tr>':'');}).join('')+'</table></details>';}
  return f+btn(n.id)+'</figure>'+zone(n.id);}
function toc(l){return l.filter(function(n){return n.k==='chap';}).map(function(n){return '<li class="n'+Math.min(n.niv,3)+'"><a href="#s-'+n.id+'">'+esc(n.num)+' '+esc(n.titre)+'</a></li>'+toc(n.enfants);}).join('');}
if(D.commentaires===false)document.body.classList.add('nocom');
function render(){
  var m=[];if(D.projectName)m.push(esc(T.projet)+' : <b>'+esc(D.projectName)+'</b>');if(D.model)m.push(esc(T.modele)+' : '+esc(D.model));if(D.auteur)m.push(esc(T.auteur)+' : <b>'+esc(D.auteur)+'</b>');
  m.push(esc(T.date)+' '+esc(dt(D.date)));if(D.echeance)m.push(esc(T.echeance)+' <b>'+esc(dt(D.echeance))+'</b>');
  var t=toc(D.contenu);
  $('head').innerHTML='<h1 class="t">'+esc(D.titre)+'</h1><div class="meta">'+m.join(' · ')+'</div>'+(D.consignes?'<div class="box"><b>'+esc(T.consignes)+'</b>\\n'+esc(D.consignes)+'</div>':'')+
    '<div class="box aide">'+esc(T.aide)+'</div>'+(t?'<nav><b>'+esc(T.sommaire)+'</b><ol>'+t+'</ol></nav>':'')+
    '<div id="gen"><div class="blk" style="margin-top:12px"><b>'+esc(T.general)+'</b> <button data-new="">'+esc(T.generalAdd)+'</button></div>'+zone('')+'</div>';
  $('doc').innerHTML=D.contenu.map(node).join('');
  $('side').innerHTML=t?'<b>'+esc(T.sommaire)+'</b><ol>'+t+'</ol>':'';
  $('me').value=D.relecteur||'';updAll();}
function needMe(){if(me())return true;alert(T.noName);$('me').focus();return false;}
document.addEventListener('mousedown',function(e){if(e.target.closest&&e.target.closest('[data-new]')){var s=window.getSelection();selTxt=s?String(s).replace(/\\s+/g,' ').trim().slice(0,600):'';}});
document.addEventListener('click',function(e){var t=e.target,b;
  if((b=t.closest('[data-new]'))){if(!needMe())return;var prev=form&&form.b;form={b:b.getAttribute('data-new'),x:selTxt};if(prev!=null&&prev!==form.b)upd(prev);upd(form.b);return;}
  if(t.id==='f-no'){var p=form.b;form=null;upd(p);return;}
  if(t.id==='f-ok'){var tx=$('f-t').value.trim();if(!tx){$('f-t').focus();return;}
    var r=form.r||{id:uid(),bloc:form.b,auteur:me(),date:new Date().toISOString(),extrait:form.x||''};
    r.type=$('f-ty').value;r.crit=$('f-cr').value;r.texte=tx;if(form.r)r.modifie=new Date().toISOString();else D.retours.push(r);
    var q=form.b;form=null;upd(q);mark();return;}
  if((b=t.closest('[data-ed]'))){var r2=null,id=b.getAttribute('data-ed');D.retours.forEach(function(x){if(x.id===id)r2=x;});if(!r2)return;
    var pv=form&&form.b;form={b:r2.bloc,x:r2.extrait,r:r2};if(pv!=null&&pv!==r2.bloc)upd(pv);upd(r2.bloc);return;}
  if((b=t.closest('[data-del]'))){if(!confirm(T.confirmDel))return;var id2=b.getAttribute('data-del'),bl='';
    D.retours=D.retours.filter(function(x){if(x.id===id2){bl=x.bloc;return false;}return true;});upd(bl);mark();return;}
  if((b=t.closest('figure .img'))){b.classList.toggle('z');return;}
});
document.addEventListener('change',function(e){var t=e.target,id=t.getAttribute('data-relu');if(!id)return;if(!needMe()){t.checked=false;return;}
  var l=D.relus[id]=(D.relus[id]||[]).filter(function(n){return n!==me();});if(t.checked)l.push(me());mark();});
$('me').addEventListener('input',function(){D.relecteur=this.value;mark();updAll();});
function dl(txt,type,name){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
function base(){var r=/[^\\p{L}\\p{N}\\-]+/gu;return (D.titre||'dossier').replace(r,'_').slice(0,60)+(me()?'-'+me().replace(r,'_'):T.fileSuffix);}
$('b-save').onclick=function(){if(!needMe())return;el.textContent=JSON.stringify(D).replace(/</g,'\\\\u003c');
  var c=document.documentElement.cloneNode(true);['head','doc','side'].forEach(function(i){var n=c.querySelector('#'+i);if(n)n.innerHTML='';});
  var st=c.querySelector('#st');if(st)st.innerHTML='';
  dl('<!DOCTYPE html>\\n'+c.outerHTML,'text/html',base()+'.html');dirty=false;$('st').innerHTML='<span class="msg">'+esc(T.saved)+'</span>';};
$('b-json').onclick=function(){if(!needMe())return;dl(JSON.stringify({type:'arcalyse-dossier-retours',version:1,id:D.id,envoi:D.envoi,titre:D.titre,relecteur:me(),retours:D.retours,relus:D.relus},null,1),'application/json',base()+'.json');};
$('b-print').onclick=function(){window.print();};
window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue='';}});
render();
})();
<\/script></body></html>`;
}

/* ── Document Word (.docx) ─────────────────────────────────────────────── */

/**
 * Document Word du dossier : page de titre (projet, auteur, consignes, mode d'emploi), sommaire, chapitres en styles
 * Titre 1 à 4, descriptions, éléments, diagrammes en images PNG avec légende, tableaux des éléments représentés.
 * Chaque bloc porte un signet « arc_<bloc> » : les commentaires de Word y sont rattachés au réimport.
 * @param {object} data - Envoi (type « arcalyse-dossier-relecture »)
 * @param {function(string):void} [st] - Avancement
 * @returns {Promise<Blob>} fichier .docx
 */
async function capDosDocx(data, st){
  const x=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const run=(t, rp)=>`<w:r>${rp?`<w:rPr>${rp}</w:rPr>`:''}${String(t).split('\n').map((l,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${x(l)}</w:t>`).join('')}</w:r>`;
  const para=(runs, style, extra)=>`<w:p>${style||extra?`<w:pPr>${style?`<w:pStyle w:val="${style}"/>`:''}${extra||''}</w:pPr>`:''}${runs}</w:p>`;
  let bmN=0;
  const bm=(id, contenu)=>{ const n=++bmN; return `<w:bookmarkStart w:id="${n}" w:name="arc_${id.replace(/\./g,'_')}"/>`+contenu+`<w:bookmarkEnd w:id="${n}"/>`; };
  const texte=(t, style)=>String(t||'').split(/\n\s*\n/).map(p=>para(run(p.trim()), style)).join('');
  const GRIS='<w:color w:val="57606A"/><w:sz w:val="18"/>';
  const images=[]; let corps='';
  // Page de titre
  const meta=[[_L('Projet'), data.projectName], [_L('Modèle'), data.model], [_L('Auteur'), data.auteur], [_L('Envoyé le'), capRevDate(data.date)], [_L('Retour attendu le'), capRevDate(data.echeance)]].filter(m=>m[1]);
  corps+=`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:bookmarkStart w:id="0" w:name="arc_dossier_${x(data.id)}"/>${run(data.titre)}<w:bookmarkEnd w:id="0"/></w:p>`;
  corps+=meta.map(m=>para(run(m[0]+' : ', '<w:b/>')+run(m[1]))).join('');
  if(data.consignes) corps+=para(run(_L('Consignes'), '<w:b/>'), 'ArcEncadre')+texte(data.consignes, 'ArcEncadre');
  if(data.commentaires!==false) corps+=para(run(_L('Relecture : insérez des commentaires Word (Révision › Nouveau commentaire) sur les passages concernés, ou modifiez le texte en mode Suivi des modifications, puis renvoyez le fichier .docx. Chaque commentaire est rattaché au chapitre, à la description ou au diagramme commenté.')), 'ArcAide');
  // Sommaire
  const som=[]; (function f(l){ l.forEach(n=>{ if(n.k==='chap'){ som.push(n); f(n.enfants); } }); })(data.contenu);
  // Sommaire : chaque ligne est un lien vers le signet de son chapitre
  if(som.length) corps+=para(run(_L('Sommaire')), 'TOCHeading')+som.map(n=>para(`<w:hyperlink w:anchor="arc_${n.id.replace(/\./g,'_')}" w:history="1">${run(n.num+'  '+n.titre, '<w:color w:val="0563C1"/><w:u w:val="single"/>')}</w:hyperlink>`, '', `<w:spacing w:after="0"/><w:ind w:left="${Math.min(n.niv,3)*360}"/>`)).join('');
  // Contenu
  const W=5760000, HMAX=7900000;   // 16 cm × 22 cm (EMU)
  const noeud=async n=>{
    if(n.k==='chap'){
      let s=para(bm(n.id, run(n.num+'  ', '')+run(n.titre)), 'Heading'+Math.min(n.niv+1,4));
      if(n.ref) s+=para(run(n.ref.type+(n.ref.couche?' · '+n.ref.couche:''), GRIS));
      if(n.avecDesc) s+=bm(n.id+'.d', n.desc?texte(n.desc, 'ArcDesc'):para(run(_L('(pas de description)'), '<w:i/>'+GRIS), 'ArcDesc'));
      for(const c of n.enfants) s+=await noeud(c);
      return s;
    }
    if(n.k==='txt') return bm(n.id, texte(n.txt));
    if(n.k==='liste'){
      const B='<w:top w:val="single" w:sz="4" w:color="D0D7DE"/><w:left w:val="single" w:sz="4" w:color="D0D7DE"/><w:bottom w:val="single" w:sz="4" w:color="D0D7DE"/><w:right w:val="single" w:sz="4" w:color="D0D7DE"/><w:insideH w:val="single" w:sz="4" w:color="D0D7DE"/><w:insideV w:val="single" w:sz="4" w:color="D0D7DE"/>';
      const cell=(t,h,b)=>`<w:tc><w:tcPr>${h?'<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>':''}</w:tcPr>${para(b?bm(b, run(t, (h?'<w:b/>':'')+'<w:sz w:val="18"/>')):run(t, (h?'<w:b/>':'')+'<w:sz w:val="18"/>'), '', '<w:spacing w:after="0"/>')}</w:tc>`;
      return bm(n.id, para(run('▤ '+n.titre, '<w:b/>'), '', '<w:keepNext/>'))+(n.rows.length?`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${B}</w:tblBorders></w:tblPr>`+
        `<w:tr>${n.head.map(h=>cell(h,1)).join('')}</w:tr>`+n.rows.map((r,i)=>`<w:tr>${r.c.map((x,j)=>cell(x,0,j?null:n.id+'_e'+i)).join('')}</w:tr>`).join('')+`</w:tbl>`+para(''):para(run(_L('(aucun élément)'), '<w:i/>'+GRIS)));
    }
    if(n.k==='el') return bm(n.id, para(run('◆ '+n.nom, '<w:b/>')+run('   '+n.type+(n.couche?' · '+n.couche:''), GRIS), '', '<w:keepNext/>')+
      (n.avecDesc?(n.desc?texte(n.desc, 'ArcDesc'):para(run(_L('(pas de description)'), '<w:i/>'+GRIS), 'ArcDesc')):''));
    let s='';
    if(n.svg){
      if(st) st(_L(`⏳ Image ${n.fig} — ${n.nom}`));
      const c=await capSvgToCanvas(n.svg, n.w, n.h, 1.5), png=new Uint8Array(await (await capCanvasBlob(c,'image/png')).arrayBuffer());
      images.push(png); const rid='rIdImg'+images.length, k=images.length;
      let cx=W, cy=Math.round(W*n.h/n.w); if(cy>HMAX){ cy=HMAX; cx=Math.round(HMAX*n.w/n.h); }
      s+=para(`<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${k}" name="${x(_L('Figure'))} ${n.fig}"/>`+
        `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>`+
        `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`+
        `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${k}" name="image${k}.png"/><pic:cNvPicPr/></pic:nvPicPr>`+
        `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`+
        `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`, '', '<w:keepNext/><w:jc w:val="center"/>');
    } else s+=para(run(_L('Diagramme non joint (.aird non chargé lors de l\'export)'), '<w:i/>'+GRIS));
    s+=para(run(_L('Figure')+' '+n.fig, '<w:b/>')+run(' — '+n.nom+' ('+n.type+')'), 'Caption');
    if(n.cible) s+=para(run(_L('Élément représenté')+' : '+n.cible, GRIS), '', '<w:jc w:val="center"/>');
    if(n.desc) s+=texte(n.desc, 'ArcDesc');
    if(n.elems&&n.elems.length){
      const cell=(t,h)=>`<w:tc><w:tcPr>${h?'<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>':''}</w:tcPr>${para(run(t, (h?'<w:b/>':'')+'<w:sz w:val="18"/>'), '', '<w:spacing w:after="0"/>')}</w:tc>`;
      const B='<w:top w:val="single" w:sz="4" w:color="D0D7DE"/><w:left w:val="single" w:sz="4" w:color="D0D7DE"/><w:bottom w:val="single" w:sz="4" w:color="D0D7DE"/><w:right w:val="single" w:sz="4" w:color="D0D7DE"/><w:insideH w:val="single" w:sz="4" w:color="D0D7DE"/><w:insideV w:val="single" w:sz="4" w:color="D0D7DE"/>';
      s+=para(run(_L('Éléments représentés')+` (${n.elems.length})`, '<w:b/><w:sz w:val="18"/>'))+`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${B}</w:tblBorders></w:tblPr>`+
        `<w:tblGrid><w:gridCol w:w="4600"/><w:gridCol w:w="3000"/><w:gridCol w:w="1400"/></w:tblGrid>`+
        `<w:tr>${cell(_L('Élément'),1)}${cell('Type',1)}${cell(_L('Couche'),1)}</w:tr>`+
        n.elems.map((e,i)=>`<w:tr><w:tc><w:tcPr/>${para(bm(n.id+'_e'+i, run(e[0], '<w:sz w:val="18"/>')), '', '<w:spacing w:after="0"/>')}</w:tc>${cell(e[1])}${cell(e[2])}</w:tr>`).join('')+`</w:tbl>`+para('');
    }
    return bm(n.id, s);
  };
  for(const n of data.contenu) corps+=await noeud(n);
  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${corps}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const sty=(id, nom, ppr, rpr, extra)=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nom}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>${extra||''}<w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`+
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="${CAP_LANG==='en'?'en-GB':'fr-FR'}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`+
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`+
    sty('Title','Title','<w:spacing w:after="200"/>','<w:b/><w:color w:val="1F2328"/><w:sz w:val="44"/>')+
    [1,2,3,4].map(i=>sty('Heading'+i,'heading '+i,`<w:keepNext/><w:spacing w:before="${[360,280,220,180][i-1]}" w:after="100"/><w:outlineLvl w:val="${i-1}"/>`,`<w:b/><w:color w:val="${i===1?'1F4E79':'24292F'}"/><w:sz w:val="${[34,28,25,23][i-1]}"/>`)).join('')+
    sty('TOCHeading','TOC Heading','<w:keepNext/><w:spacing w:before="280" w:after="80"/>','<w:b/><w:sz w:val="28"/>')+
    sty('Caption','caption','<w:jc w:val="center"/><w:spacing w:after="160"/>','<w:sz w:val="20"/>')+
    sty('ArcDesc','Arcalyse — Description','<w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="D0D7DE"/></w:pBdr><w:ind w:left="240"/>','<w:color w:val="24292F"/>')+
    sty('ArcEncadre','Arcalyse — Consignes','<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="1F6FEB"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F6F8FA"/><w:spacing w:after="60"/><w:ind w:left="240"/>','')+
    sty('ArcAide','Arcalyse — Aide','<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="BF8700"/></w:pBdr><w:spacing w:before="160" w:after="200"/><w:ind w:left="240"/>','<w:color w:val="57606A"/><w:sz w:val="19"/>')+
    `</w:styles>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
    `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`+
    images.map((_,i)=>`<Relationship Id="rIdImg${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i+1}.png"/>`).join('')+`</Relationships>`;
  const enc=new TextEncoder(), now=new Date().toISOString().replace(/\.\d+Z$/,'Z');
  const files=[
    {name:'[Content_Types].xml', data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`+
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>`+
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`+
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`+
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`)},
    {name:'_rels/.rels', data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>`+
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`)},
    {name:'docProps/core.xml', data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`+
      `<dc:title>${x(data.titre)}</dc:title><dc:creator>${x(data.auteur||'Arcalyse')}</dc:creator><dc:subject>arcalyse-dossier-relecture ${x(data.id)} ${x(data.envoi)}</dc:subject>`+
      `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`)},
    {name:'word/_rels/document.xml.rels', data:enc.encode(rels)},
    {name:'word/document.xml', data:enc.encode(doc)},
    {name:'word/styles.xml', data:enc.encode(styles)},
    ...images.map((b,i)=>({name:`word/media/image${i+1}.png`, data:b}))];
  return new Blob([capZipBuild(files)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

/* ── Réimport des retours ──────────────────────────────────────────────── */

/**
 * Lit les fichiers d'une archive ZIP (méthodes « stored » et « deflate », décompression native du navigateur).
 * @param {ArrayBuffer} buf - Archive
 * @param {function(string):boolean} veut - Fichiers à lire (nom complet)
 * @returns {Promise<Object<string,string>>} nom → texte (UTF-8)
 */
async function capDosUnzip(buf, veut){
  const v=new DataView(buf), u8=new Uint8Array(buf), dec=new TextDecoder(), out={};
  let e=-1; for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65600);i--){ if(v.getUint32(i,true)===0x06054b50){ e=i; break; } }
  if(e<0) throw new Error(_L('archive ZIP illisible'));
  let p=v.getUint32(e+16,true); const n=v.getUint16(e+10,true);
  for(let k=0;k<n;k++){
    if(v.getUint32(p,true)!==0x02014b50) break;
    const meth=v.getUint16(p+10,true), csz=v.getUint32(p+20,true), nl=v.getUint16(p+28,true), xl=v.getUint16(p+30,true), cl=v.getUint16(p+32,true), off=v.getUint32(p+42,true);
    const nom=dec.decode(u8.subarray(p+46,p+46+nl)); p+=46+nl+xl+cl;
    if(!veut(nom)) continue;
    const deb=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true), brut=u8.subarray(deb,deb+csz);
    if(meth===0) out[nom]=dec.decode(brut);
    else if(meth===8){
      if(typeof DecompressionStream!=='function') throw new Error(_L('navigateur trop ancien pour lire un .docx'));
      out[nom]=dec.decode(await new Response(new Blob([brut]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }
  }
  return out;
}
/** Décode les entités XML d'un texte. @param {string} s @returns {string} */
function capDosXmlTexte(s){ return String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(x?)([0-9a-f]+);/gi,(m,h,n)=>String.fromCodePoint(parseInt(n,h?16:10))).replace(/&amp;/g,'&'); }
/** Texte des runs d'un fragment WordprocessingML (paragraphes séparés par un saut de ligne). @param {string} xml @param {string} [tag] - 't' ou 'delText' @returns {string} */
function capDosWText(xml, tag){
  tag=tag||'t';
  return String(xml||'').split(/<\/w:p>/).map(p=>{ let t=''; const re=new RegExp(`<w:${tag}(?:\\s[^>]*)?>([^<]*)</w:${tag}>|<w:tab/>|<w:br/>`,'g'); let m;
    while((m=re.exec(p))) t+=m[1]!=null?capDosXmlTexte(m[1]):m[0]==='<w:tab/>'?'\t':'\n'; return t; }).filter(s=>s.trim()).join('\n').trim();
}
/**
 * Retours d'un document Word commenté : commentaires (rattachés au dernier signet « arc_… » qui les précède) et
 * modifications suivies (insertions, suppressions) regroupées par auteur et par bloc.
 * @param {ArrayBuffer} buf - Fichier .docx
 * @returns {Promise<{id:string, retours:object[]}>} dossier (signet « arc_dossier_… », ou '') et retours
 */
async function capDosLireDocx(buf){
  const f=await capDosUnzip(buf, n=>n==='word/document.xml'||n==='word/comments.xml');
  const doc=f['word/document.xml']; if(!doc) throw new Error(_L('ce fichier n\'est pas un document Word'));
  const att=(a,k)=>{ const m=new RegExp('\\bw:'+k+'="([^"]*)"').exec(a||''); return m?capDosXmlTexte(m[1]):''; };
  const blocDe=nom=>nom.replace(/_d$/,'.d').replace(/_e(\d+)$/,'~#$1');   // description de chapitre ; ligne n du tableau des éléments représentés
  const coms={}; let m;
  const reC=/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g;
  while((m=reC.exec(f['word/comments.xml']||''))) coms[att(m[1],'id')]={auteur:att(m[1],'author'), date:att(m[1],'date'), texte:capDosWText(m[2])};
  const ancre={}, debut={}, retours=[]; let dos='', cur='', mod=null;
  const re=/<w:bookmarkStart\b([^>]*)>|<w:commentRangeStart\b([^>]*)>|<w:commentRangeEnd\b([^>]*)>|<w:commentReference\b([^>]*)>|<w:(ins|del)\b([^>]*[^\/>])?>([\s\S]*?)<\/w:\5>/g;
  while((m=re.exec(doc))){
    if(m[1]!=null){ const nom=att(m[1],'name'); if(/^arc_dossier_/.test(nom)) dos=nom.slice(12); else if(/^arc_/.test(nom)) cur=blocDe(nom.slice(4)); continue; }
    if(m[2]!=null){ const id=att(m[2],'id'); if(!(id in ancre)){ ancre[id]=cur; debut[id]=m.index; } continue; }
    if(m[3]!=null){ const id=att(m[3],'id'); if(id in debut) coms[id]&&(coms[id].extrait=capDosWText(doc.slice(debut[id], m.index)).replace(/\s+/g,' ').slice(0,600)); continue; }
    if(m[4]!=null){ const id=att(m[4],'id'); if(!(id in ancre)) ancre[id]=cur; continue; }
    const t=capDosWText(m[7], m[5]==='del'?'delText':'t').replace(/\s+/g,' ').trim(); if(!t) continue;
    const auteur=att(m[6],'author'), date=att(m[6],'date'), ligne=(m[5]==='ins'?'＋ ':'－ ')+'« '+t+' »';
    if(mod&&mod.bloc===cur&&mod.auteur===auteur) mod.texte+='\n'+ligne;
    else { mod={id:'w'+capHomeUid(), bloc:cur, auteur, date, type:'modif', crit:'', texte:ligne, extrait:'', source:'docx'}; retours.push(mod); }
  }
  Object.keys(coms).forEach(id=>{ const c=coms[id]; if(!c.texte) return;
    retours.push({id:'w'+capHomeUid(), bloc:ancre[id]||'', auteur:c.auteur, date:c.date, type:'', crit:'', texte:c.texte, extrait:c.extrait||'', source:'docx'}); });
  return {id:dos, retours};
}
/**
 * Lit un fichier de retours : page HTML enregistrée par un relecteur, .json de ses retours, ou .docx commenté.
 * @param {File} f - Fichier choisi
 * @returns {Promise<object>} {id, source?, titre?, retours, relus}
 */
async function capDosLireFichier(f){
  if(/\.docx$/i.test(f.name)) return capDosLireDocx(await f.arrayBuffer());
  const t=await f.text();
  if(/^\s*</.test(t)){ const d=capDosLirePage(t); if(!d) throw new Error(_L('cette page n\'est pas un dossier de relecture Arcalyse')); return d; }
  let o; try{ o=JSON.parse(t); }catch(e){ throw new Error(_L('fichier illisible (JSON attendu)')); }
  if(!o||!['arcalyse-dossier-retours','arcalyse-dossier-relecture'].includes(o.type)) throw new Error(_L('ce fichier n\'est pas un retour de dossier de relecture'));
  return o;
}
/** @param {string} texte - Code HTML @returns {object|null} données de la page de relecture (sans l'exécuter) */
function capDosLirePage(texte){
  try{ const b=new DOMParser().parseFromString(texte,'text/html').getElementById('arcalyse-dossier-relecture'), d=b&&JSON.parse(b.textContent);
    return d&&d.type==='arcalyse-dossier-relecture'?d:null; }catch(e){ return null; }
}
/**
 * Choisit et importe un ou plusieurs fichiers de retours (page HTML, .json, .docx).
 * @param {Window} [W] - Fenêtre d'où part la demande (page ou fenêtre séparée)
 */
function capDosImporter(W){
  W=W||window;
  const inp=W.document.createElement('input'); inp.type='file'; inp.multiple=true; if(!capIsMobile()) inp.accept='.html,.htm,.json,.docx';
  inp.onchange=async()=>{ for(const f of inp.files){ try{ await capDosFusion(await capDosLireFichier(f), f.name, W); }catch(e){ console.error(e); capAlert(f.name+' : '+(e&&e.message||e),{win:W, level:'err'}); } } };
  inp.click();
}
/**
 * Rattache des retours lus à leur dossier (même identifiant ; sinon dossier recréé depuis la page, ou dossier ouvert
 * après confirmation) ; retours déjà présents ignorés (même auteur, date et texte).
 * Les nouveaux retours sont aussitôt versés dans 💬 Revue (étiquette « 📑 Dossier de relecture »).
 * @param {object} o - Données lues {id, source?, retours, relus}
 * @param {string} nom - Nom du fichier
 * @param {Window} [W] - Fenêtre des confirmations
 */
async function capDosFusion(o, nom, W){
  W=W||window;
  let d=_capHome.dossiers.find(x=>x.id===o.id);
  if(!d&&o.source){ d=capDosNorm([Object.assign({}, o.source, {id:o.id||capHomeUid(), retours:[], relus:{}})])[0]; _capHome.dossiers.push(d); }
  if(!d){ const c=capDosCur();
    if(!c||!await capConfirm(_L(`« ${nom} » : dossier d'origine introuvable dans ce projet. Rattacher ses retours au dossier ouvert « ${c?c.titre:''} » ?`),{win:W, ok:_L('Rattacher')})) return;
    d=c; }
  const cle=r=>[r.auteur||'', r.date||'', (r.texte||'').trim()].join('|'), vus=new Set(d.retours.map(cle));
  let n=0, deja=0;
  (o.retours||[]).forEach(r=>{ if(!r||!r.texte) return; if(vus.has(cle(r))){ deja++; return; }
    if(d.retours.some(x=>x.id===r.id)) r.id='w'+capHomeUid();
    const m=/^(.*)~#(\d+)$/.exec(r.bloc||'');   // ligne du tableau Word → élément représenté exporté
    if(m){ const f=capDosTrouve(d.blocs, m[1]), e=f&&f.b.elemsExp&&f.b.elemsExp[+m[2]]; r.bloc=e?m[1]+'~'+e:m[1]; }
    d.retours.push(Object.assign({bloc:'', type:'', crit:'', extrait:''}, r)); vus.add(cle(r)); n++; });
  Object.keys(o.relus||{}).forEach(k=>{ const l=d.relus[k]=d.relus[k]||[]; (o.relus[k]||[]).forEach(p=>{ if(!l.includes(p)) l.push(p); }); });
  const v=capDosVersRevue(d, true);
  capHomeSave();
  if(!capHomePopWin('dos',d.id)) capDosOuvrir(d.id); else capHomeRender();
  capWatchFlash(_L(`✔ ${nom} : ${n} retour(s) ajouté(s)`)+(deja?_L(`, ${deja} déjà présent(s)`):'')+(v?_L(` — ${v} commentaire(s) créé(s) dans 💬 Revue`):''));
}
/**
 * Verse les retours non encore traités dans 💬 Revue : un commentaire par retour, cible = élément du bloc
 * (sa description pour une description), élément représenté pour un diagramme.
 * @param {object} d - Dossier
 * @param {boolean} [discret] - Sans message (réimport)
 * @returns {number} nombre de commentaires créés
 */
function capDosVersRevue(d, discret){
  const l=d.retours.filter(r=>!r.rev); if(!l.length) return 0;
  const cat={remarque:'remark', question:'question', erreur:'error', proposition:'improvement', modif:'improvement', ok:'remark'};
  const cs=l.map(r=>{
    const x=capDosBlocDe(d, r.bloc), b=x.b; let cible=null;
    if(x.elemId) cible=capRevTarget(x.elemId,'');
    else if(b&&b.ref&&b.ref.k==='el') cible=capRevTarget(b.ref.id, (x.champ==='desc'||(b.k==='el'&&b.desc)||(b.k==='mod'&&b.quoi==='desc'))?'description':b.k==='mod'&&b.quoi==='nom'?'name':'');
    else if(b&&b.ref&&b.ref.k==='diag'){ try{ const m=capHomeReps().length&&capDiagMeta(b.ref.id); if(m&&m.cible) cible=capRevTarget(m.cible.id,''); }catch(_){} }
    const titre=`📑 ${d.titre} › ${x.num?x.num+' ':''}${x.libelle}`.slice(0,200), now=r.date||new Date().toISOString();
    const c={id:capRevUid(), num:0, title:titre, text:(r.extrait?`« ${r.extrait} »\n`:'')+(r.texte||''), crit:r.crit||'', cat:cat[r.type]||'', status:'open',
      author:r.auteur||'', created:now, updated:now, due:'', assignees:[], tags:[_L('📑 Dossier de relecture'), d.titre||''].filter(Boolean), targets:cible?[cible]:[], diag:null, replies:[], project:capRevProjectId(),
      dossier:{id:d.id, titre:d.titre||'', bloc:r.bloc||'', num:x.num||''}};
    r.rev=c.id; return c; });
  const res=capRevMerge({people:[...new Set(l.map(r=>r.auteur).filter(Boolean))], comments:cs});
  capRevSave(); capHomeSave(); capHomeRender();
  if(!discret) capWatchFlash(_L(`✔ ${res.added} commentaire(s) créé(s) dans 💬 Revue`));
  return res.added;
}
