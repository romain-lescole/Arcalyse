/* ═══════════════════════════════════════════════════════════════════════
   🏠 ACCUEIL — page d'accueil du projet (vue affichée à l'ouverture d'un modèle ou d'un projet)
   ───────────────────────────────────────────────────────────────────────
   Trois onglets :
   • 🏠 Projet : informations (projet Capella, fichiers, version de Capella), fiche projet modifiable, contenu du modèle,
     diagrammes, revue, check-lists et plans de revue, mises à jour du modèle, accès rapide aux vues ;
   • ☑ Check-lists & plans de revue : listes à cocher par sections, points liés à des diagrammes ou des éléments
     (glisser-déposer depuis la palette 📎), modèles ARCADIA ; plans de revue (objet, jalon, participants, périmètre,
     critères d'entrée, points de contrôle, critères de sortie, actions) ; export HTML imprimable, .json réutilisable ;
   • 🧾 Tableaux blancs : pages libres (façon bloc-notes) où l'on écrit du texte et dépose des diagrammes ou des
     éléments, affichés en icônes cliquables (clic → diagramme ou panneau de détail).
   Stockage : bloc JSON « cap-home » de la page (repris par la 💾 Page HTML et par 📄 Ouvrir un projet de travail).
   ═══════════════════════════════════════════════════════════════════════ */

/** Données de l'accueil : fiche projet, check-lists et plans de revue (docs), tableaux blancs (boards). */
var _capHome = capHomeNorm((()=>{ try{ const el=document.getElementById('cap-home'); return el?JSON.parse(el.textContent):null; }catch(e){ return null; } })());
/** État de l'affichage (non enregistré) : onglet, document et page de tableau blanc ouverts, recherche de la palette, couleur des notes. */
const _capHomeUi = { tab:'projet', doc:'', board:'', q:'', col:'#e3b341', notes:new Set() };
/** Type de données glissées (référence vers un diagramme ou un élément). */
const CAP_HOME_DND='application/x-arcalyse-ref';
/** Couleurs proposées pour les notes du tableau blanc. */
const CAP_HOME_COULEURS=['#e3b341','#58a6ff','#3fb950','#f0883e','#a78bfa','#f85149'];

/**
 * Complète des données d'accueil (lues dans la page ou un fichier) avec les valeurs par défaut.
 * @param {object} [d] - Données lues
 * @returns {object} {v, fiche, docs, boards}
 */
function capHomeNorm(d){
  d=d||{};
  const docs=(Array.isArray(d.docs)?d.docs:[]).filter(x=>x&&x.id).map(x=>Object.assign({kind:'list', titre:'', head:{}, sections:[]}, x));
  docs.forEach(x=>{ x.head=x.head||{}; if(!Array.isArray(x.head.perim)) x.head.perim=[];
    x.sections=(x.sections||[]).map(s=>Object.assign({titre:'', items:[]}, s)); x.sections.forEach(s=>{ s.items=(s.items||[]).map(i=>Object.assign({txt:'', ok:false, refs:[]}, i)); }); });
  const boards=(Array.isArray(d.boards)?d.boards:[]).filter(b=>b&&b.id).map(b=>Object.assign({titre:'', items:[]}, b));
  return { v:1, fiche:Object.assign({objet:'', phase:'', version:'', resp:'', equipe:'', notes:''}, d.fiche||{}), docs, boards };
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
  _capHome=capHomeNorm(d); Object.assign(_capHomeUi,{doc:'', board:''}); capHomeSave();
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
 * Affiche la vue 🏠 Accueil.
 * @param {HTMLElement} box - Conteneur #cap-view-home
 */
function capRenderHome(box){
  if(!box) return;
  capHomeWire(box);
  const u=_capHomeUi, nd=_capHome.docs.length, nb=_capHome.boards.length;
  const tab=(k,l,t)=>`<button class="phl-toggle-btn${u.tab===k?' active':''}" data-tab="${k}" title="${t}">${l}</button>`;
  const pos=(box.querySelector('.hm-main')||{}).scrollTop||0;
  box.innerHTML=`<div class="hm-bar"><span class="tb-grp">${tab('projet',_L('🏠 Projet'),_L('Informations du projet, fiche, contenu du modèle, revue, accès rapide'))}`+
    tab('docs',_L(`☑ Check-lists & plans de revue`)+(nd?` <span class="hm-n">${nd}</span>`:''),_L('Listes à cocher et plans de revue, liés à des diagrammes et des éléments'))+
    tab('board',_L(`🧾 Tableaux blancs`)+(nb?` <span class="hm-n">${nb}</span>`:''),_L('Pages libres : texte, diagrammes et éléments en icônes cliquables'))+`</span>`+
    `<span class="hm-bar-t">${capEsc(capRevProjectName()||capCurrentFileName||'')}</span></div>`+
    `<div class="hm-body">${u.tab==='docs'?capHomeDocsHtml():u.tab==='board'?capHomeBoardHtml():capHomeProjetHtml()}`+
    (u.tab==='projet'?'':capHomePaletteHtml())+`</div>`;
  const m=box.querySelector('.hm-main'); if(m) m.scrollTop=pos;
  if(u.tab==='board') capHomeBoardAfter(box);
}

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

/** Onglet 🏠 Projet. @returns {string} HTML */
function capHomeProjetHtml(){
  const esc=capEsc, F=_capHome.fiche, lig=(k,v)=>v?`<tr><td class="ana-dim">${k}</td><td>${v}</td></tr>`:'';
  const reps=capHomeReps(), cv=capHomeCapellaVersion();
  const carte=(t,c,cls)=>`<section class="hm-card${cls?' '+cls:''}"><h3>${t}</h3>${c}</section>`;
  // Projet
  let h=carte(_L('🔷 Projet'),`<table class="hm-kv">`+lig(_L('Projet Capella'),`<b>${esc(capRevProjectName()||'—')}</b>`)+lig(_L('Modèle'),esc(capCurrentFileName||'—'))+
    lig(_L('Version de Capella'),esc(cv))+lig(_L('Diagrammes'),_capDiag&&_capDiag.texteAird?esc(_capDiag.nomAird)+(reps.length?' · '+_L(`${reps.length} diagramme(s)`):''):`<span class="ana-dim">${_L('aucun .aird chargé')}</span> <button class="cap-lf-btn" data-a="aird">${_L('📂 Ouvrir le .aird…')}</button>`)+
    lig(_L('Page de projet'),typeof _capProjetPage!=='undefined'&&_capProjetPage.nom?esc(_capProjetPage.nom):'')+
    lig(_L('Éléments'),String(capAllElements.length))+lig(_L('Arcalyse'),esc(CAP_APP_VERSION))+`</table>`);
  // Fiche projet (modifiable)
  const champ=(k,l,ph,ta)=>`<label class="hm-f"><span>${l}</span>${ta?`<textarea data-ff="${k}" rows="3" placeholder="${ph}">${esc(F[k])}</textarea>`:`<input data-ff="${k}" value="${esc(F[k])}" placeholder="${ph}">`}</label>`;
  h+=carte(_L('📝 Fiche projet'),champ('objet',_L('Objet'),_L('Système étudié, but du modèle'),true)+
    `<div class="hm-f2">${champ('phase',_L('Phase / jalon'),_L('ex. SRR, PDR, CDR'))}${champ('version',_L('Version du modèle'),_L('ex. V1.2'))}</div>`+
    `<div class="hm-f2">${champ('resp',_L('Responsable'),_L('Nom'))}${champ('equipe',_L('Équipe'),_L('Noms, rôles'))}</div>`+
    champ('notes',_L('Notes'),_L('Hypothèses, liens, informations utiles…'),true),'hm-card-w');
  // Contenu du modèle
  const C=capHomeCouches();
  h+=carte(_L('🧩 Contenu du modèle'),`<div class="hm-layers">${C.map(c=>{ const lv=CAP_LAYERS[c.k];
    return `<div class="hm-layer" style="--hm-c:${lv.color}"><div class="hm-layer-h"><b style="color:${lv.color}">${c.k}</b> <span class="ana-dim">${esc(lv.label)}</span><span style="flex:1"></span><b>${c.n}</b></div>`+
      c.types.map(([t,n])=>`<div class="hm-layer-t"><span>${capIcoType(t,12)} ${esc((CAP_HUMAN_NAMES[t]||{}).h||t)}</span><span>${n}</span></div>`).join('')+`</div>`; }).join('')}</div>`,'hm-card-w');
  // Diagrammes par couche
  if(reps.length){
    const par={}; reps.forEach(r=>{ par[r.couche||'—']=(par[r.couche||'—']||0)+1; });
    h+=carte(_L('🔲 Diagrammes'),`<div class="hm-chips">${Object.entries(par).sort((a,b)=>capDiagRang(a[0])-capDiagRang(b[0])).map(([k,n])=>{ const lv=capDiagCouche(k);
      return `<span class="hm-stat" style="color:${lv.color}"><b>${esc(k)}</b> ${n}</span>`; }).join('')}</div><button class="cap-lf-btn" data-nav="diag">${_L('🔲 Ouvrir les diagrammes')}</button>`);
  }
  // Revue
  const cs=_capRev.comments, ouv=cs.filter(c=>!capRevClosed(c)), chk=capRevToCheck().length, late=cs.filter(capRevLate).length;
  h+=carte(_L('💬 Revue'),(cs.length?`<div class="hm-chips"><span class="hm-stat"><b>${ouv.length}</b> ${_L('non clos')}</span>`+
    capRevCrits().filter(c=>c.k).map(c=>{ const n=ouv.filter(x=>x.crit===c.k).length; return n?`<span class="hm-stat" style="color:${capTextOn(c.c)}"><b>${n}</b> ${c.l}</span>`:''; }).join('')+
    (chk?`<span class="hm-stat" style="color:var(--c-warn,#e3b341)"><b>${chk}</b> ${_L('à vérifier')}</span>`:'')+(late?`<span class="hm-stat" style="color:var(--c-err,#f85149)"><b>${late}</b> ${_L('en retard')}</span>`:'')+
    `<span class="hm-stat ana-dim">${_L(`${cs.length} au total`)}</span></div>`:`<div class="ana-dim">${_L('Aucun commentaire de revue.')}</div>`)+
    `<div class="hm-row"><button class="cap-lf-btn" data-a="rev">${_L('💬 Ouvrir la revue')}</button>${cs.length?`<button class="cap-lf-btn" data-a="rev-cible" title="${_L('Page HTML à envoyer aux relecteurs : ils répondent aux commentaires choisis, puis leurs réponses sont réimportées ici')}">${_L('📤 Revue ciblée…')}</button>`:''}</div>`);
  // Check-lists et plans de revue
  h+=carte(_L('☑ Check-lists & plans de revue'),(_capHome.docs.length?`<div class="hm-dl">${_capHome.docs.map(d=>`<div class="hm-dl-i" data-doc="${d.id}"><span>${d.kind==='plan'?'📋':'☑'} ${esc(d.titre||_L('(sans titre)'))}${d.kind==='plan'&&d.head.date?` <span class="ana-dim">${esc(capRevDate(d.head.date))}</span>`:''}</span>${capHomeBar(capHomeProgress(d))}</div>`).join('')}</div>`
    :`<div class="ana-dim">${_L('Aucune check-list ni plan de revue.')}</div>`)+
    `<div class="hm-row"><button class="cap-lf-btn" data-a="go-docs">${_L('☑ Check-lists & plans de revue')}</button><button class="cap-lf-btn" data-a="go-board">${_L('🧾 Tableaux blancs')}</button></div>`);
  // Mises à jour du modèle
  const H=typeof _capWatch!=='undefined'?_capWatch.history:[];
  h+=carte(_L('🔄 Mises à jour'),(H.length?`<table class="hm-kv">${H.slice(0,5).map(x=>`<tr><td class="ana-dim">${capWatchDate(x.at)}</td><td>${capWatchChips(x.counts)||_L('aucune différence')}</td></tr>`).join('')}</table>`
    :`<div class="ana-dim">${_L('Aucune mise à jour du modèle depuis son ouverture.')}</div>`)+
    `<div class="hm-row"><button class="cap-lf-btn" data-a="update" title="${_L('Compare un autre fichier .capella au modèle affiché, montre le delta, puis met à jour après validation')}">${_L('🔄 Charger une mise à jour…')}</button></div>`);
  // Accès rapide
  const nav=k=>{ const it=CAP_NAV_ITEMS.find(i=>i.k===k); return it?`<button class="cap-lf-btn" data-nav="${k}" title="${it.t||''}">${it.l}</button>`:''; };
  h+=carte(_L('🚀 Accès rapide'),`<div class="hm-quick">${['diag','table','tree','functions','fex','csys','cblk','scen','ana:trace','ana:diff','dashboard'].map(nav).join('')}</div>`);
  return `<div class="hm-main hm-grid">${h}</div>`;
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
  } else d={id:capHomeUid(), kind:'list', titre:M.k==='vide'?_L('Nouvelle check-list'):M.l.replace(/^\S+\s/,''), created:new Date().toISOString(), head:{perim:[]}, sections:M.s.map(s=>sec(s[0],s[1]))};
  _capHome.docs.push(d); _capHomeUi.doc=d.id; capHomeSave();
}

/** Onglet ☑ Check-lists & plans de revue : liste des documents, document ouvert. @returns {string} HTML */
function capHomeDocsHtml(){
  const u=_capHomeUi, esc=capEsc;
  if(!_capHome.docs.some(d=>d.id===u.doc)) u.doc=_capHome.docs.length?_capHome.docs[0].id:'';
  const M=capHomeModeles();
  const liste=`<aside class="hm-docs"><div class="hm-docs-new">`+
    `<select data-new="list" title="${_L('Nouvelle check-list : vide ou à partir d\'un modèle')}"><option value="">${_L('✚ Check-list…')}</option>${M.map(m=>`<option value="${m.k}">${m.l}</option>`).join('')}</select>`+
    `<select data-new="plan" title="${_L('Nouveau plan de revue : objet, jalon, participants, périmètre, critères d\'entrée et de sortie, points de contrôle, actions')}"><option value="">${_L('✚ Plan de revue…')}</option>${M.map(m=>`<option value="${m.k}">${m.k==='vide'?_L('📋 Plan vide'):_L('📋 Plan — ')+m.l.replace(/^\S+\s/,'')}</option>`).join('')}</select>`+
    `<button class="cap-lf-btn" data-a="doc-import" title="${_L('Importer une check-list ou un plan enregistré en .json (autre projet)')}">${_L('📂 Importer…')}</button></div>`+
    (_capHome.docs.length?_capHome.docs.map(d=>`<div class="hm-docs-i${d.id===u.doc?' on':''}" data-doc="${d.id}"><span class="hm-docs-n">${d.kind==='plan'?'📋':'☑'} ${esc(d.titre||_L('(sans titre)'))}</span>${capHomeBar(capHomeProgress(d))}</div>`).join('')
      :`<div class="hm-empty">${_L('Créez une check-list ou un plan de revue (listes ci-dessus).<br><br>Glissez ensuite des diagrammes et des éléments depuis la palette 📎 à droite sur les points.')}</div>`)+`</aside>`;
  const d=_capHome.docs.find(x=>x.id===u.doc);
  return `<div class="hm-main hm-docs-w">${liste}<div class="hm-doc">${d?capHomeDocHtml(d):''}</div></div>`;
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
      `<button class="cap-lf-btn" data-a="doc-revue" title="${_L('Page HTML à envoyer aux relecteurs, avec les commentaires de revue du périmètre ; leurs réponses se réimportent dans 💬 Revue')}">${_L('📤 Revue ciblée du périmètre…')}</button></div></div>`;
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
/** @returns {object|undefined} document ouvert */
function capHomeCurDoc(){ return _capHome.docs.find(d=>d.id===_capHomeUi.doc); }
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
      let o; try{ o=JSON.parse(t); }catch(e){ alert(_L('Fichier illisible (JSON attendu).')); return; }
      const l=o&&o.type==='arcalyse-checklist'&&Array.isArray(o.docs)?o.docs:null;
      if(!l){ alert(_L('Ce fichier n\'est pas une check-list Arcalyse.')); return; }
      const docs=capHomeNorm({docs:l}).docs;
      docs.forEach(d=>{ d.id=capHomeUid(); d.sections.forEach(s=>{ s.id=capHomeUid(); s.items.forEach(i=>{ i.id=capHomeUid(); }); }); _capHome.docs.push(d); });
      if(docs.length) _capHomeUi.doc=docs[0].id;
      capHomeSave(); capHomeRender();
      capWatchFlash(_L(`✔ ${docs.length} check-list(s) importée(s)`));
    });
  };
  inp.click();
}

/* ── Onglet 🧾 Tableaux blancs ─────────────────────────────────────────── */

/** @returns {object|undefined} page de tableau blanc ouverte */
function capHomeCurBoard(){ return _capHome.boards.find(b=>b.id===_capHomeUi.board); }

/** Onglet 🧾 Tableaux blancs : pages, outils, plan de travail. @returns {string} HTML */
function capHomeBoardHtml(){
  const u=_capHomeUi, esc=capEsc;
  if(!_capHome.boards.length){ _capHome.boards.push({id:capHomeUid(), titre:_L('Page 1'), items:[]}); capHomeSave(); }
  if(!capHomeCurBoard()) u.board=_capHome.boards[0].id;
  const B=capHomeCurBoard();
  let W=2400, Hh=1600; B.items.forEach(it=>{ W=Math.max(W,(it.x||0)+(it.w||200)+400); Hh=Math.max(Hh,(it.y||0)+(it.h||120)+400); });
  const items=B.items.map(it=>{
    if(it.k==='ref'){ const r=it.ref, ok=capHomeRefOk(r), lv=CAP_LAYERS[r.couche]||{color:'#8b949e'};
      return `<div class="hm-it hm-ref${ok?'':' hm-miss'}" data-it="${it.id}" data-mv="1" style="left:${it.x}px;top:${it.y}px" title="${esc(capHomeRefType(r))} — ${ok?_L('clic : ouvrir'):(r.k==='diag'?_L('diagramme non chargé (.aird)'):_L('absent du modèle chargé'))}">`+
        `<span class="hm-ref-i">${capHomeRefIco(r,30)}</span><span class="hm-ref-n">${esc(capHomeRefNom(r))}</span><span class="hm-ref-t"><b style="color:${lv.color}">${esc(r.couche||'')}</b> ${esc(capHomeRefType(r))}</span>`+
        `<span class="hm-it-x" data-a="bi-del" title="${_L('Retirer du tableau')}">✕</span></div>`; }
    return `<div class="hm-it hm-txt" data-it="${it.id}" style="left:${it.x}px;top:${it.y}px;width:${it.w||220}px;height:${it.h||110}px;--hm-c:${it.col||'#e3b341'}">`+
      `<div class="hm-it-h" data-mv="1" title="${_L('Glisser pour déplacer')}"><span class="hm-it-x" data-a="bi-del" title="${_L('Supprimer la note')}">✕</span></div>`+
      `<div class="hm-txt-b" contenteditable="true" spellcheck="true" data-bt="1">${esc(it.txt||'')}</div></div>`;
  }).join('');
  return `<div class="hm-main hm-wb-w"><div class="hm-wb-bar"><span class="tb-grp">${_capHome.boards.map(b=>`<button class="phl-toggle-btn${b.id===u.board?' active':''}" data-board="${b.id}" title="${_L('Double-clic : renommer')}">${esc(b.titre||_L('(sans titre)'))}</button>`).join('')}`+
    `<button class="cap-lf-btn" data-a="b-add" title="${_L('Nouvelle page')}">✚</button></span>`+
    `<span class="tb-grp"><button class="cap-lf-btn" data-a="b-txt" title="${_L('Ajouter une note de texte (ou double-clic sur le tableau)')}">${_L('✚ Texte')}</button>`+
    CAP_HOME_COULEURS.map(c=>`<span class="hm-col${c===u.col?' on':''}" data-col="${c}" style="background:${c}" title="${_L('Couleur des nouvelles notes')}"></span>`).join('')+`</span>`+
    `<span class="tb-grp"><button class="cap-lf-btn" data-a="b-ren" title="${_L('Renommer la page')}">✎</button><button class="cap-lf-btn" data-a="b-del" title="${_L('Supprimer la page')}">🗑</button></span>`+
    `<span class="hm-drop-hint">${_L('Double-clic : note · glissez des diagrammes et des éléments depuis la palette 📎 · clic sur une icône : l\'ouvrir')}</span></div>`+
    `<div class="hm-wb" id="hm-wb"><div class="hm-wb-in" data-drop="board" style="width:${W}px;height:${Hh}px">${items}</div></div></div>`;
}
/** Après le rendu du tableau blanc : hauteur jusqu'en bas, suivi de la taille des notes (redimensionnement). @param {HTMLElement} box */
function capHomeBoardAfter(box){
  const wb=box.querySelector('#hm-wb'); if(!wb) return;
  const fit=()=>{ wb.style.height=Math.max(260, window.innerHeight-wb.getBoundingClientRect().top-8)+'px'; };
  fit(); requestAnimationFrame(fit);
  if(window.ResizeObserver){
    if(_capHomeUi.ro) _capHomeUi.ro.disconnect();
    _capHomeUi.ro=new ResizeObserver(es=>{ const B=capHomeCurBoard(); if(!B) return; let ch=false;
      es.forEach(e=>{ const n=e.target, it=B.items.find(x=>x.id===n.dataset.it); if(!it) return;
        const w=n.offsetWidth, h=n.offsetHeight; if(w&&h&&(w!==it.w||h!==it.h)){ it.w=w; it.h=h; ch=true; } });
      if(ch) capHomeSaveLater(); });
    box.querySelectorAll('.hm-txt').forEach(n=>_capHomeUi.ro.observe(n));
  }
}
/**
 * Ajoute un objet sur la page de tableau blanc ouverte.
 * @param {object} it - {k:'txt'|'ref', x, y, …}
 * @param {boolean} [edit] - true : placer le curseur dans la note créée
 */
function capHomeBoardAdd(it, edit){
  const B=capHomeCurBoard(); if(!B) return;
  it.id=capHomeUid(); B.items.push(it); capHomeSave(); capHomeRender();
  if(edit) setTimeout(()=>{ const n=document.querySelector(`#cap-view-home .hm-it[data-it="${it.id}"] .hm-txt-b`); if(n) n.focus(); },0);
}

/* ── Palette 📎 : diagrammes et éléments à glisser ─────────────────────── */

/** Palette à droite (onglets check-lists et tableaux blancs) : recherche, diagrammes, éléments. @returns {string} HTML */
function capHomePaletteHtml(){
  return `<aside class="hm-pal"><div class="hm-pal-h">${_L('📎 Glisser-déposer')}</div>`+
    `<input id="hm-pal-q" class="phl-filter-input" placeholder="${_L('🔍 Diagramme ou élément…')}" value="${capEsc(_capHomeUi.q)}">`+
    `<div class="hm-pal-l" id="hm-pal-l">${capHomePaletteList()}</div></aside>`;
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

/** Réaffiche la vue 🏠 Accueil si elle est affichée. */
function capHomeRender(){ if(capCurrentView==='home'&&currentMode==='capella') capRenderHome(document.getElementById('cap-view-home')); }

/**
 * Branche (une fois) les écouteurs de la vue : clics, saisies, glisser-déposer, déplacement des objets du tableau blanc.
 * @param {HTMLElement} box - Conteneur de la vue
 */
function capHomeWire(box){
  if(box._hm) return; box._hm=true;
  box.addEventListener('click',capHomeClick);
  box.addEventListener('input',capHomeInput);
  box.addEventListener('change',capHomeChange);
  box.addEventListener('dblclick',e=>{
    const bt=e.target.closest('[data-board]'); if(bt){ const B=_capHome.boards.find(b=>b.id===bt.dataset.board); const t=B&&prompt(_L('Nom de la page :'),B.titre); if(t!=null&&B){ B.titre=t.trim(); capHomeSave(); capHomeRender(); } return; }
    if(e.target.classList.contains('hm-wb-in')){ const r=e.target.getBoundingClientRect();
      capHomeBoardAdd({k:'txt', x:Math.max(0,Math.round(e.clientX-r.left-20)), y:Math.max(0,Math.round(e.clientY-r.top-14)), w:220, h:110, txt:'', col:_capHomeUi.col}, true); }
  });
  box.addEventListener('dragstart',e=>{
    const r=e.target.closest&&e.target.closest('[data-ref]'); if(!r) return;
    e.dataTransfer.setData(CAP_HOME_DND, r.dataset.ref);
    try{ e.dataTransfer.setData('text/plain', JSON.parse(r.dataset.ref).nom||''); }catch(_){}
    e.dataTransfer.effectAllowed='copy';
  });
  const cible=e=>e.target.closest&&e.target.closest('[data-drop]');
  box.addEventListener('dragover',e=>{
    const z=cible(e), ty=[...(e.dataTransfer.types||[])]; if(!z||!(ty.includes(CAP_HOME_DND)||ty.includes('text/plain'))) return;
    e.preventDefault(); e.dataTransfer.dropEffect='copy';
    box.querySelectorAll('.hm-over').forEach(x=>{ if(x!==z) x.classList.remove('hm-over'); }); z.classList.add('hm-over');
  });
  box.addEventListener('dragleave',e=>{ const z=cible(e); if(z&&!z.contains(e.relatedTarget)) z.classList.remove('hm-over'); });
  box.addEventListener('drop',e=>{
    const z=cible(e); if(!z) return;
    e.preventDefault(); z.classList.remove('hm-over');
    let ref=null; try{ ref=JSON.parse(e.dataTransfer.getData(CAP_HOME_DND)||'null'); }catch(_){}
    const txt=ref?'':(e.dataTransfer.getData('text/plain')||'').trim();
    if(!ref&&!txt) return;
    capHomeDrop(z, ref, txt, e);
  });
  box.addEventListener('pointerdown',capHomeBoardDown);
  box.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('.hm-item-t')){ e.preventDefault(); const it=e.target.closest('[data-i]'); capHomeItemAdd(it&&it.closest('[data-s]').dataset.s, it&&it.dataset.i); } });
}
/**
 * Dépôt d'une référence (ou d'un texte) sur une zone : périmètre, point, section, tableau blanc.
 * @param {HTMLElement} z - Zone (data-drop)
 * @param {?object} ref - Référence déposée
 * @param {string} txt - Texte déposé (sans référence)
 * @param {DragEvent} e - Événement
 */
function capHomeDrop(z, ref, txt, e){
  const k=z.dataset.drop, d=capHomeCurDoc(), has=(l,r)=>l.some(x=>x.k===r.k&&x.id===r.id);
  if(k==='board'){ const r=z.getBoundingClientRect(), x=Math.max(0,Math.round(e.clientX-r.left-20)), y=Math.max(0,Math.round(e.clientY-r.top-20));
    capHomeBoardAdd(ref?{k:'ref', x, y, ref}:{k:'txt', x, y, w:220, h:110, txt, col:_capHomeUi.col}); return; }
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
 * @param {string} sid - Section
 * @param {string} [after] - Point après lequel insérer
 */
function capHomeItemAdd(sid, after){
  const d=capHomeCurDoc(), s=d&&d.sections.find(x=>x.id===sid); if(!s) return;
  const it={id:capHomeUid(), txt:'', ok:false, refs:[]}, i=s.items.findIndex(x=>x.id===after);
  s.items.splice(i<0?s.items.length:i+1, 0, it); capHomeSave(); capHomeRender();
  const n=document.querySelector(`#cap-view-home [data-i="${it.id}"] .hm-item-t`); if(n) n.focus();
}
/** Déplace un objet d'une liste d'un cran. @param {Array} l @param {number} i @param {number} dir - -1 / +1 */
function capHomeMove(l, i, dir){ const j=i+dir; if(i<0||j<0||j>=l.length) return; [l[i],l[j]]=[l[j],l[i]]; }

/** Clics de la vue (délégation). @param {MouseEvent} e */
function capHomeClick(e){
  const t=e.target, u=_capHomeUi;
  const tab=t.closest('[data-tab]'); if(tab){ u.tab=tab.dataset.tab; capHomeRender(); return; }
  const nav=t.closest('[data-nav]'); if(nav){ capNavOpen(nav.dataset.nav); return; }
  const rm=t.closest('[data-rm]');
  if(rm){ e.stopPropagation(); const d=capHomeCurDoc(); if(!d) return; const [w,n]=rm.dataset.rm.split(':');
    if(w==='p') d.head.perim.splice(+n,1); else { const it=t.closest('[data-i]'), s=it&&d.sections.find(s=>s.id===it.closest('[data-s]').dataset.s), i=s&&s.items.find(x=>x.id===it.dataset.i); if(i) i.refs.splice(+n,1); }
    capHomeSave(); capHomeRender(); return; }
  const go=t.closest('[data-go]'); if(go){ try{ capHomeRefOpen(JSON.parse(go.dataset.go)); }catch(_){} return; }
  const pal=t.closest('.hm-pal-i'); if(pal){ try{ capHomeRefOpen(JSON.parse(pal.dataset.ref)); }catch(_){} return; }
  const dl=t.closest('[data-doc]'); if(dl){ u.doc=dl.dataset.doc; u.tab='docs'; capHomeRender(); return; }
  const bd=t.closest('[data-board]'); if(bd){ u.board=bd.dataset.board; capHomeRender(); return; }
  const col=t.closest('[data-col]'); if(col){ u.col=col.dataset.col; capHomeRender(); return; }
  const a=t.closest('[data-a]'); if(!a) return;
  const act=a.dataset.a, d=capHomeCurDoc(), B=capHomeCurBoard();
  const sEl=t.closest('[data-s]'), s=d&&sEl&&d.sections.find(x=>x.id===sEl.dataset.s);
  const iEl=t.closest('[data-i]'), ii=s&&iEl?s.items.findIndex(x=>x.id===iEl.dataset.i):-1;
  switch(act){
    case 'aird': capDiagPickAird(); return;
    case 'rev': capRevToggle(true,'list'); return;
    case 'rev-cible': capRevCibleeDialog(); return;
    case 'update': capCfgLoadUpdate(); return;
    case 'go-docs': u.tab='docs'; break;
    case 'go-board': u.tab='board'; break;
    case 'doc-import': capHomeDocImport(); return;
    case 'doc-html': if(d) capHomeDocExport(d); return;
    case 'doc-json': if(d) capDownloadBlob(new Blob([JSON.stringify({type:'arcalyse-checklist', version:1, date:new Date().toISOString(), docs:[d]},null,1)],{type:'application/json'}), (d.titre||'check-list').replace(/[^\p{L}\p{N}\-]+/gu,'_')+'.json'); return;
    case 'doc-dup': if(d){ const c=JSON.parse(JSON.stringify(d)); c.id=capHomeUid(); c.titre=d.titre+_L(' (copie)'); c.sections.forEach(x=>{ x.id=capHomeUid(); x.items.forEach(i=>{ i.id=capHomeUid(); i.ok=false; }); }); _capHome.docs.push(c); u.doc=c.id; } break;
    case 'doc-del': if(d&&confirm(_L(`Supprimer « ${d.titre||_L('(sans titre)')} » ?`))){ _capHome.docs=_capHome.docs.filter(x=>x!==d); u.doc=''; } else return; break;
    case 'doc-revue': if(d){ const ids=capHomePerimIds(d); capRevCibleeDialog({titre:d.titre, consignes:d.head.objet||'', echeance:d.head.date||'', filtre:c=>capHomeComPerim(c,ids)}); } return;
    case 'sec-add': if(d) d.sections.push({id:capHomeUid(), titre:_L('Nouvelle section'), items:[]}); break;
    case 'sec-up': case 'sec-down': if(s) capHomeMove(d.sections, d.sections.indexOf(s), act==='sec-up'?-1:1); break;
    case 'sec-del': if(s&&(!s.items.length||confirm(_L(`Supprimer la section « ${s.titre} » et ses ${s.items.length} point(s) ?`)))) d.sections=d.sections.filter(x=>x!==s); else return; break;
    case 'it-add': if(s) capHomeItemAdd(s.id); return;
    case 'it-up': case 'it-down': if(ii>=0) capHomeMove(s.items, ii, act==='it-up'?-1:1); break;
    case 'it-del': if(ii>=0) s.items.splice(ii,1); break;
    case 'it-note': if(ii>=0){ const id=s.items[ii].id; if(u.notes.has(id)&&!s.items[ii].note) u.notes.delete(id); else u.notes.add(id); } break;
    case 'b-add': { const b={id:capHomeUid(), titre:_L(`Page ${_capHome.boards.length+1}`), items:[]}; _capHome.boards.push(b); u.board=b.id; break; }
    case 'b-ren': { const n=B&&prompt(_L('Nom de la page :'),B.titre); if(n==null) return; B.titre=n.trim(); break; }
    case 'b-del': if(B&&(!B.items.length||confirm(_L(`Supprimer la page « ${B.titre} » et ses ${B.items.length} objet(s) ?`)))){ _capHome.boards=_capHome.boards.filter(x=>x!==B); u.board=''; } else return; break;
    case 'b-txt': { const wb=document.getElementById('hm-wb'); capHomeBoardAdd({k:'txt', x:(wb?wb.scrollLeft:0)+40, y:(wb?wb.scrollTop:0)+40, w:220, h:110, txt:'', col:u.col}, true); return; }
    case 'bi-del': { const n=t.closest('[data-it]'); if(B&&n) B.items=B.items.filter(x=>x.id!==n.dataset.it); break; }
    default: return;
  }
  capHomeSave(); capHomeRender();
}
/** Saisie : fiche projet, titres, champs du plan, points, notes du tableau blanc, recherche de la palette. @param {Event} e */
function capHomeInput(e){
  const t=e.target;
  if(t.id==='hm-pal-q'){ _capHomeUi.q=t.value; const l=document.getElementById('hm-pal-l'); if(l) l.innerHTML=capHomePaletteList(); return; }
  if(t.dataset.ff){ _capHome.fiche[t.dataset.ff]=t.value; capHomeSaveLater(); return; }
  if(t.dataset.bt){ const B=capHomeCurBoard(), it=B&&B.items.find(x=>x.id===t.closest('[data-it]').dataset.it); if(it){ it.txt=t.innerText; capHomeSaveLater(); } return; }
  const d=capHomeCurDoc(); if(!d) return;
  if(t.dataset.df){ d[t.dataset.df]=t.value; const n=document.querySelector(`#cap-view-home .hm-docs-i[data-doc="${d.id}"] .hm-docs-n`); if(n) n.textContent=(d.kind==='plan'?'📋 ':'☑ ')+(t.value||_L('(sans titre)')); capHomeSaveLater(); return; }
  if(t.dataset.hf&&t.tagName!=='SELECT'){ d.head[t.dataset.hf]=t.value; capHomeSaveLater(); return; }
  const s=d.sections.find(x=>x.id===(t.closest('[data-s]')||{dataset:{}}).dataset.s); if(!s) return;
  if(t.dataset.sf){ s[t.dataset.sf]=t.value; capHomeSaveLater(); return; }
  const i=s.items.find(x=>x.id===(t.closest('[data-i]')||{dataset:{}}).dataset.i);
  if(i&&t.dataset.if&&t.type!=='checkbox'){ i[t.dataset.if]=t.value; capHomeSaveLater(); }
}
/** Listes et cases : nouveau document, champs du plan, case d'un point. @param {Event} e */
function capHomeChange(e){
  const t=e.target, d=capHomeCurDoc();
  if(t.dataset.new){ if(t.value) capHomeNewDoc(t.dataset.new, t.value); capHomeRender(); return; }
  if(d&&t.dataset.hf&&t.tagName==='SELECT'){ d.head[t.dataset.hf]=t.value; capHomeSave(); return; }
  if(d&&t.dataset.if==='ok'){ const s=d.sections.find(x=>x.id===t.closest('[data-s]').dataset.s), i=s&&s.items.find(x=>x.id===t.closest('[data-i]').dataset.i);
    if(i){ i.ok=t.checked; if(t.checked) i.okDate=new Date().toISOString(); capHomeSave(); capHomeRender(); } }
}
/**
 * Tableau blanc : déplacement d'un objet (poignée d'une note, icône d'un diagramme ou d'un élément) ;
 * un clic sans déplacement sur une icône l'ouvre.
 * @param {PointerEvent} e
 */
function capHomeBoardDown(e){
  const h=e.target.closest('[data-mv]'); if(!h||e.button!==0||e.target.closest('[data-a]')) return;
  const n=h.closest('.hm-it'), B=capHomeCurBoard(), it=B&&B.items.find(x=>x.id===n.dataset.it); if(!it) return;
  e.preventDefault(); h.setPointerCapture(e.pointerId);
  const x0=e.clientX, y0=e.clientY, ix=it.x, iy=it.y; let bouge=false;
  n.parentElement.appendChild(n);   // au premier plan
  const mv=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!bouge&&Math.abs(dx)+Math.abs(dy)<4) return; bouge=true;
    n.classList.add('hm-moving'); n.style.left=Math.max(0,ix+dx)+'px'; n.style.top=Math.max(0,iy+dy)+'px'; };
  const up=ev=>{ h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); n.classList.remove('hm-moving');
    if(bouge){ it.x=Math.max(0,Math.round(ix+ev.clientX-x0)); it.y=Math.max(0,Math.round(iy+ev.clientY-y0)); B.items=B.items.filter(x=>x!==it).concat(it); capHomeSave(); }
    else if(it.k==='ref') capHomeRefOpen(it.ref); };
  h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up);
}
