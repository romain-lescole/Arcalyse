/* ═══════════════════════════════════════════════════════════════════════════
   🎯 Cas d'utilisation et ⇶ Traçabilité par niveaux d'un modèle UML / SysML v1 (sous-vues `umlucs` de la famille 🧬 UML /
   SysML v1 et `umltrace` de ✅ Vérifier) : les équivalents de 🎯 Capacités & missions et de 🧬 Traçabilité / ⇶ Liens entre
   couches de Capella pour une lecture du lecteur UML d'Arcature (88).
   - `capUmlCas` : cas d'utilisation, acteurs associés (associations, et par les cas qui les incluent ou qu'ils étendent),
     sujet (`subject`, `useCase` ou classe propriétaire), include / extend, comportements qui les réalisent (comportement
     possédé, «refine», «trace», réalisation), exigences liées ; contrôles : cas sans acteur, cas sans comportement, acteurs
     sans cas, inclusions cycliques, cas sans sujet.
   - `capUmlTracabilite` : SysML v1 n'a pas de couches ; chaque élément tracé reçoit un **niveau** — 🧾 Exigences, 🎯 Cas
     d'utilisation & opérationnel, ƒ Fonctionnel, 🧱 Logique, 🔩 Physique — d'après son genre (exigence, cas, acteur), son
     type ou stéréotype (Function, Physical_Component…), puis le nom de ses paquetages (« Fonctions », « Physical »…), sinon sa
     métaclasse (comportement → fonctionnel, bloc → logique). Liens : satisfy, verify, deriveReqt, refine, trace, copy,
     «allocate», réalisation (part → son bloc, port → son bloc, action → son activité). Couverture par niveau, chemins,
     graphe en colonnes, contrôles (sans lien vers le niveau supérieur / inférieur, allocations à contresens).
   ═══════════════════════════════════════════════════════════════════════════ */

/** Élément à montrer à la prochaine ouverture de 🎯 Cas d'utilisation. */
var _capUmlUcGo=null;
/** Niveaux de la traçabilité, du plus haut au plus bas : clé, libellé, couleur, motif des types et des paquetages. */
var CAP_UML_NIVEAUX=[
  {k:'req', l:_L('🧾 Exigences'), c:'#e3b341'},
  {k:'uc',  l:_L('🎯 Cas d\'utilisation & opérationnel'), c:'#d2a8ff', re:/op[eé]ration|mission|capabilit|capacit|use ?case|cas d.utilisation|usage|besoin|need|concept/i},
  {k:'fn',  l:_L('ƒ Fonctionnel'), c:'#3fb950', re:/fonction|function|behavio|comportement|activit/i},
  {k:'log', l:_L('🧱 Logique'), c:'#58a6ff', re:/logi(que|cal)/i},
  {k:'phy', l:_L('🔩 Physique'), c:'#f0883e', re:/physi(que|cal)|technical|technique|hardware|mat[ée]riel|implement|d[ée]ploi|deploy/i},
  {k:'autre', l:_L('Autres'), c:'#8b949e'}];
/** Relations de traçabilité suivies : motif du nom de relation (ou du type de l'élément porteur), clé, couleur. */
var CAP_UML_TRACE_RELS=[[/^satisf/i,'satisfy','#f85149'],[/^verif/i,'verify','#ff7b72'],[/^deriv/i,'deriveReqt','#a78bfa'],[/^refin/i,'refine','#d2a8ff'],
  [/^trace/i,'trace','#8b949e'],[/^copy/i,'copy','#6e7681'],[/^allocat/i,'allocate','#f0883e'],[/^r[ée]ali[sz]ation$|^realisation$/i,'realisation','#58a6ff']];

/* ── 1. 🎯 Cas d'utilisation ───────────────────────────────────── */

/** Cas d'utilisation et acteurs de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{list:object[], byId:object, acteurs:object[], acteurById:object}} Cas et acteurs
 */
function capUmlCas(){
  if(_capAnaCache.umlUc) return _capAnaCache.umlUc;
  const R={list:[], byId:{}, acteurs:[], acteurById:{}};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlUc=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null, el=e=>({id:e.id, name:capUmlNom(e), type:e.type});
  const push=(L,e)=>{ if(e&&!L.some(x=>x.id===e.id)) L.push(el(e)); };
  els.forEach(e=>{
    if(e.metaclasse==='Actor'){ const a={id:e.id, name:capUmlNom(e), ucs:[]}; R.acteurs.push(a); R.acteurById[a.id]=a; return; }
    if(e.metaclasse!=='UseCase') return;
    const path=[]; for(let x=E(e.proprietaire); x&&!x.racine; x=E(x.proprietaire)) if(x.metaclasse!=='Model') path.unshift(capUmlNom(x));
    const u={id:e.id, name:capUmlNom(e), path:path.join(' › '), acteurs:[], sujets:[], inclut:[], inclusPar:[], etend:[], etenduPar:[], comps:[], exigences:[]};
    capUmlRef(e,'subject').forEach(i=>push(u.sujets, E(i)));
    const ow=E(e.proprietaire); if(ow&&capUmlEstBloc(ow)) push(u.sujets, ow);
    (e.enfants||[]).map(E).forEach(c=>{ if(c&&CAP_UML_COMPORTEMENT.test(c.metaclasse)) push(u.comps, c); });
    R.byId[u.id]=u; R.list.push(u);
  });
  els.forEach(e=>capUmlRef(e,'useCase').forEach(i=>{ const u=R.byId[i]; if(u) push(u.sujets, e); }));
  lec.toutesLiaisons().forEach(x=>{
    const s=E(x.source), c=E(x.cible); if(!s||!c) return;
    const U=R.byId[s.id], V=R.byId[c.id], typ=x.via?(E(x.via)||{}).type||'':'';
    if(x.relation==='association'){ const u=U||V, o=U?c:s; if(u&&o.metaclasse==='Actor'){ push(u.acteurs, o); const a=R.acteurById[o.id]; if(a) push(a.ucs, E(u.id)); } return; }
    if(x.relation==='inclusion'&&U&&V){ push(U.inclut, c); push(V.inclusPar, s); return; }
    if(x.relation==='extension'&&U&&V){ push(U.etend, c); push(V.etenduPar, s); return; }
    if(/refin|trace|realis|realiz|abstraction/i.test(x.relation+' '+typ)){
      const u=U||V, o=U?c:s; if(!u) return;
      if(capUmlEstExigence(o)) push(u.exigences, o); else if(CAP_UML_COMPORTEMENT.test(o.metaclasse)||capUmlEstBloc(o)) push(u.comps, o);
    } else if(/^satisf|^verif/i.test(x.relation)&&V&&capUmlEstExigence(s)) push(V.exigences, s);
  });
  // Acteurs hérités : un cas inclus ou qui étend un cas joué par un acteur est atteint par cet acteur
  R.list.forEach(u=>{ const vus=new Set(), pile=[...u.inclusPar.map(x=>x.id), ...u.etend.map(x=>x.id)]; u.acteursIndirects=[];
    while(pile.length){ const id=pile.pop(); if(vus.has(id)||id===u.id) continue; vus.add(id); const v=R.byId[id]; if(!v) continue;
      v.acteurs.forEach(a=>{ if(!u.acteurs.some(b=>b.id===a.id)&&!u.acteursIndirects.some(b=>b.id===a.id)) u.acteursIndirects.push(a); });
      pile.push(...v.inclusPar.map(x=>x.id), ...v.etend.map(x=>x.id)); } });
  R.list.sort((a,b)=>a.path.localeCompare(b.path,'fr',{numeric:true})||capUmlTriNom(a.name,b.name));
  R.acteurs.sort((a,b)=>capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlUc=R;
}

/** Contrôles 🩺 des cas d'utilisation (vue 🎯 Cas d'utilisation ; 💚 Santé, 🩺 profil, tableau de bord).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlUcChecks(){
  const R=capUmlCas(); if(!R.list.length) return [];
  const fl=(id,n)=>capDetLink(id,n), row=u=>`<tr><td>${fl(u.id,u.name)}</td><td class="ana-dim">${capEsc(u.path)}</td></tr>`, cols=[_L('Cas d\'utilisation'),_L('Dossier')];
  const cyc=R.list.filter(u=>{ const vus=new Set(), pile=u.inclut.map(x=>x.id); while(pile.length){ const id=pile.pop(); if(id===u.id) return true; if(vus.has(id)) continue; vus.add(id); (R.byId[id]?R.byId[id].inclut:[]).forEach(x=>pile.push(x.id)); } return false; });
  const sec=[
    {icon:'👤', title:_L('Cas d\'utilisation sans acteur'), tip:_L('Ni acteur associé, ni acteur d\'un cas qui l\'inclut ou qu\'il étend'), cols, items:R.list.filter(u=>!u.acteurs.length&&!u.acteursIndirects.length).map(row)},
    {icon:'ƒ', title:_L('Cas d\'utilisation sans comportement'), tip:_L('Aucune activité, interaction ou machine à états qui le réalise (possédée, «refine», «trace», réalisation), et aucun cas inclus qui en a'), cols,
      items:R.list.filter(u=>!u.comps.length&&!u.inclut.some(x=>(R.byId[x.id]||{comps:[]}).comps.length)).map(row)},
    {icon:'∅', sev:'info', title:_L('Acteurs sans cas d\'utilisation'), cols:[_L('Acteur')], items:R.acteurs.filter(a=>!a.ucs.length).map(a=>`<tr><td>${fl(a.id,a.name)}</td></tr>`)},
    {icon:'↻', sev:'err', title:_L('Inclusions cycliques'), tip:_L('Cas qui s\'inclut lui-même, de proche en proche'), cols, items:cyc.map(row)}
  ];
  if(R.list.some(u=>u.sujets.length)) sec.push({icon:'▣', sev:'info', title:_L('Cas d\'utilisation sans sujet'), tip:_L('Le modèle désigne ailleurs le système étudié (subject), pas pour ce cas'), cols, items:R.list.filter(u=>!u.sujets.length).map(row)});
  return sec;
}

/** Ouvre 🎯 Cas d'utilisation sur un cas ou un acteur. @param {string} id - Identifiant */
function capUmlUcOuvrir(id){ _capUmlUcGo=id; capNavOpen('ana:umlucs'); }

/** Vue 🎯 Cas d'utilisation (sous-vue `umlucs`) : liste des cas, matrice acteur × cas, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_uuc`)
 */
function capRenderUmlCas(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : 🏗 Architecture › 🎯 Capacités & missions).')}</div>`; return; }
  const R=capUmlCas();
  if(!R.list.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucun cas d\'utilisation dans ce modèle.')}</div>`; return; }
  const st=box._uuc=box._uuc||{view:'list', q:''};
  if(_capUmlUcGo){ const g=R.byId[_capUmlUcGo]||R.acteurById[_capUmlUcGo]; _capUmlUcGo=null; if(g){ st.view='list'; st.q=g.name; } }
  const esc=capEsc, q=st.q.trim().toLowerCase(), fl=(id,n,s)=>capDetLink(id,n,s), lk=a=>a.length?capFoldList(a.map(x=>fl(x.id,x.name))):'<span class="ana-dim">—</span>';
  const L=R.list.filter(u=>capXtHas(q,u.name,u.path,...u.acteurs.map(a=>a.name)));
  let body='', cnt=`${L.length} / ${R.list.length}`;
  if(st.view==='list'){
    body=`<p class="ana-help">${_L(`${R.list.length} cas d'utilisation, ${R.acteurs.length} acteur(s). Les acteurs en gris atteignent le cas par un cas qui l'inclut ou qu'il étend.`)}</p>`+
      capXtTable([_L('Cas d\'utilisation'),_L('Acteurs'),_L('Sujet'),_L('Inclut'),_L('Étend'),_L('Comportements'),_L('Exigences')], L.map(u=>[
        `${fl(u.id,u.name,'font-weight:600')}${u.path?`<div class="ana-dim">${esc(u.path)}</div>`:''}`,
        [...u.acteurs.map(a=>fl(a.id,a.name)), ...u.acteursIndirects.map(a=>`<span style="opacity:.6">${fl(a.id,a.name)}</span>`)].join(', ')||'<span class="ana-miss">∅</span>',
        lk(u.sujets), lk(u.inclut), lk(u.etend), lk(u.comps), lk(u.exigences)]));
  } else if(st.view==='mx'){
    const A=R.acteurs.filter(a=>a.ucs.length||L.some(u=>u.acteursIndirects.some(b=>b.id===a.id)));
    body=`<p class="ana-help">${_L('Ligne : cas d\'utilisation, colonne : acteur ; ● associé, ○ atteint par un cas qui l\'inclut ou qu\'il étend')}</p>`+
      (A.length?`<div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">${_L('Cas ↓ / Acteur →')}</th>${A.map(a=>`<th class="cap-mx-col" title="${esc(a.name)}"><div>${fl(a.id,a.name)}</div></th>`).join('')}</tr></thead><tbody>`+
      L.map(u=>`<tr><th class="cap-mx-row" title="${esc(u.name)}">${fl(u.id,u.name)}</th>${A.map(a=>u.acteurs.some(b=>b.id===a.id)?'<td class="cap-mx-cell" style="background:rgba(210,168,255,.45)">●</td>':u.acteursIndirects.some(b=>b.id===a.id)?'<td class="cap-mx-cell" style="background:rgba(210,168,255,.18)">○</td>':'<td></td>').join('')}</tr>`).join('')+
      `</tbody></table></div>`:`<div class="phl-empty">${_L('Aucun acteur associé à un cas d\'utilisation.')}</div>`);
  } else { body=capDiagHtml(capUmlUcChecks()); cnt=''; }
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Cas d\'utilisation')],['mx',_L('▦ Matrice acteurs')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${capXtSearch(st.q,_L('Cas, acteur, dossier…'))}`:''), cnt, st.view==='list')+body;
  capXtBind(box, st, capRenderUmlCas, ()=>capCsvExport(_L('cas-utilisation.csv'),[_L('Cas d\'utilisation'),_L('Dossier'),_L('Acteurs'),_L('Sujet'),_L('Inclut'),_L('Étend'),_L('Comportements'),_L('Exigences')],
    L.map(u=>[capCx(u.name,u.id), u.path, capCxList([...u.acteurs, ...u.acteursIndirects]), capCxList(u.sujets), capCxList(u.inclut), capCxList(u.etend), capCxList(u.comps), capCxList(u.exigences)])));
}

/* ── 2. ⇶ Traçabilité par niveaux ──────────────────────────────── */

/** Niveau de traçabilité d'un élément : exigence, cas / acteur, puis type ou stéréotype, puis paquetages (du plus proche au plus
 * lointain), puis métaclasse. @param {object} lec - Lecture @param {object} e - Élément @returns {string} Clé de CAP_UML_NIVEAUX */
function capUmlNiveau(lec, e){
  if(capUmlEstExigence(e)) return 'req';
  if(e.metaclasse==='UseCase'||e.metaclasse==='Actor') return 'uc';
  const types=[e.type, ...(e.stereotypes||[])].join(' ');
  for(const k of ['phy','log','fn','uc']){ const n=CAP_UML_NIVEAUX.find(x=>x.k===k); if(n.re.test(types)) return k; }
  for(let x=lec.element(e.proprietaire), d=0; x&&!x.racine&&d<30; x=lec.element(x.proprietaire), d++){
    if(!/Package|Model/.test(x.metaclasse)) continue;
    for(const k of ['phy','log','fn','uc']){ const n=CAP_UML_NIVEAUX.find(y=>y.k===k); if(n.re.test(capUmlNom(x))) return k; }
  }
  if(CAP_UML_COMPORTEMENT.test(e.metaclasse)||/Action$/.test(e.metaclasse)) return 'fn';
  if(capUmlEstBloc(e)) return 'log';
  return 'autre';
}

/** Éléments tracés, niveaux et liens de traçabilité de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{noeuds:object, aretes:object[], niveaux:object[]}} Traçabilité
 */
function capUmlTracabilite(){
  if(_capAnaCache.umlTr) return _capAnaCache.umlTr;
  const R={noeuds:{}, aretes:[], niveaux:[]};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlTr=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null, idx={};
  CAP_UML_NIVEAUX.forEach((n,i)=>{ idx[n.k]=i; });
  /** Élément porteur d'une extrémité : part → son bloc, port → son bloc, pin → son action, action → son activité. */
  const porteur=e=>{ for(let i=0; e&&i<6; i++){
      if(e.metaclasse==='Property'){ const t=E(capUmlRef(e,'type')[0]); if(t&&capUmlEstBloc(t)){ e=t; continue; } return e; }
      if(e.metaclasse==='Port'||/Pin$/.test(e.metaclasse)){ e=E(e.proprietaire); continue; }
      if(/Action$/.test(e.metaclasse)){ let a=E(e.proprietaire); while(a&&a.metaclasse!=='Activity') a=E(a.proprietaire); e=a||e; break; }
      break; } return e; };
  const noeud=e=>{ let n=R.noeuds[e.id]; if(n) return n; n={id:e.id, name:capUmlNom(e), type:e.type, niv:capUmlNiveau(lec,e), haut:[], bas:[], meme:[]}; R.noeuds[e.id]=n; return n; };
  els.forEach(e=>{ if(capUmlEstExigence(e)||e.metaclasse==='UseCase') noeud(e); });
  const vus=new Set();
  lec.toutesLiaisons().forEach(x=>{
    const typ=x.via?(E(x.via)||{}).type||'':'';
    const r=CAP_UML_TRACE_RELS.find(([re])=>re.test(x.relation))||CAP_UML_TRACE_RELS.find(([re])=>re.test(typ)); if(!r) return;
    const a=porteur(E(x.source)), b=porteur(E(x.cible)); if(!a||!b||a.id===b.id) return;
    const key=a.id+'|'+b.id+'|'+r[1]; if(vus.has(key)) return; vus.add(key);
    const A=noeud(a), B=noeud(b), ar={src:A.id, tgt:B.id, rel:r[1], c:r[2], via:x.via||''};
    R.aretes.push(ar);
    const ia=idx[A.niv], ib=idx[B.niv];
    if(ia===ib){ A.meme.push(ar); B.meme.push(ar); } else if(ia<ib){ A.bas.push(ar); B.haut.push(ar); } else { A.haut.push(ar); B.bas.push(ar); }
  });
  R.niveaux=CAP_UML_NIVEAUX.map(n=>({...n, n:Object.values(R.noeuds).filter(x=>x.niv===n.k).length})).filter(n=>n.n);
  return _capAnaCache.umlTr=R;
}

/** Contrôles 🩺 de la traçabilité par niveaux (vue ⇶ Traçabilité par niveaux ; 💚 Santé, 🩺 profil, tableau de bord).
 * Un niveau n'est contrôlé que si une partie de ses éléments est déjà reliée dans ce sens (comme les couches de Capella).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlTrChecks(){
  const T=capUmlTracabilite(), N=Object.values(T.noeuds); if(!T.aretes.length) return [];
  const lib=k=>(CAP_UML_NIVEAUX.find(n=>n.k===k)||{}).l||k, idx=k=>CAP_UML_NIVEAUX.findIndex(n=>n.k===k);
  const row=n=>`<tr><td>${capDetLink(n.id,n.name)}</td><td class="ana-dim">${capEsc(n.type)}</td><td>${capEsc(lib(n.niv))}</td></tr>`, cols=[_L('Élément'),'Type',_L('Niveau')];
  const sens=(k,cle)=>N.some(n=>n.niv===k&&n[cle].length);
  const nivs=T.niveaux.map(n=>n.k).filter(k=>k!=='autre'), haut=nivs.slice(1), bas=nivs.slice(0,-1);
  const N2=N.filter(n=>n.niv!=='autre');
  return [
    {icon:'⇡', title:_L('Éléments sans lien vers un niveau supérieur'), tip:_L('Ni satisfy, refine, trace, allocate… vers un élément d\'un niveau plus haut (niveaux dont d\'autres éléments sont déjà reliés vers le haut)'), cols,
      items:N2.filter(n=>haut.includes(n.niv)&&sens(n.niv,'haut')&&!n.haut.length).map(row)},
    {icon:'⇣', sev:'info', title:_L('Éléments sans lien vers un niveau inférieur'), tip:_L('Rien d\'un niveau plus bas ne s\'y rattache (niveaux dont d\'autres éléments sont déjà reliés vers le bas)'), cols,
      items:N2.filter(n=>bas.includes(n.niv)&&sens(n.niv,'bas')&&!n.bas.length).map(row)},
    {icon:'⇅', title:_L('Allocations à contresens'), tip:_L('«allocate» d\'un élément d\'un niveau plus bas vers un niveau plus haut (ex. bloc physique alloué à une fonction)'), cols:[_L('Source'),_L('Cible'),_L('Niveaux')],
      items:T.aretes.filter(a=>a.rel==='allocate'&&idx(T.noeuds[a.src].niv)>idx(T.noeuds[a.tgt].niv)&&T.noeuds[a.tgt].niv!=='autre'&&T.noeuds[a.src].niv!=='autre').map(a=>`<tr><td>${capDetLink(a.src,T.noeuds[a.src].name)}</td><td>${capDetLink(a.tgt,T.noeuds[a.tgt].name)}</td><td>${capEsc(lib(T.noeuds[a.src].niv))} → ${capEsc(lib(T.noeuds[a.tgt].niv))}</td></tr>`)}
  ];
}

/** Graphe SVG de la traçabilité : une colonne par niveau, liens colorés par relation ; clic sur un élément → panneau de détail.
 * @param {object} T - Traçabilité (`capUmlTracabilite`) @param {string} q - Recherche (élément et son voisinage) @returns {string} HTML */
function capUmlTrSvg(T, q){
  const MAX=60, W=210, GX=110, H=20, GY=6, esc=capEsc;
  let ids=new Set(Object.values(T.noeuds).filter(n=>n.haut.length||n.bas.length||n.meme.length).map(n=>n.id));
  if(q){ const vois={}; T.aretes.forEach(a=>{ (vois[a.src]=vois[a.src]||[]).push(a.tgt); (vois[a.tgt]=vois[a.tgt]||[]).push(a.src); });
    const deb=[...ids].filter(id=>T.noeuds[id].name.toLowerCase().includes(q)), garde=new Set(deb);
    let front=deb; for(let i=0; i<3; i++){ front=front.flatMap(id=>vois[id]||[]).filter(id=>!garde.has(id)); front.forEach(id=>garde.add(id)); }
    ids=garde; }
  const cols=T.niveaux.map(n=>({n, items:[...ids].map(id=>T.noeuds[id]).filter(x=>x.niv===n.k)})).filter(c=>c.items.length);
  if(!cols.length) return `<div class="phl-empty">${_L('Aucun élément relié ne correspond à la recherche.')}</div>`;
  const deg=id=>{ const n=T.noeuds[id]; return n.haut.length+n.bas.length+n.meme.length; }, pos={};
  cols.forEach((c,i)=>{
    if(!i) c.items.sort((a,b)=>deg(b.id)-deg(a.id)||capUmlTriNom(a.name,b.name));
    else { const bary=x=>{ const v=[...x.haut,...x.bas,...x.meme].map(a=>pos[a.src===x.id?a.tgt:a.src]).filter(p=>p!=null); return v.length?v.reduce((s,y)=>s+y,0)/v.length:1e6; };
      c.items.sort((a,b)=>bary(a)-bary(b)||deg(b.id)-deg(a.id)); }
    c.reste=Math.max(0,c.items.length-MAX); c.items=c.items.slice(0,MAX);
    c.items.forEach((x,j)=>{ pos[x.id]=j; x._x=i*(W+GX); x._y=30+j*(H+GY); });
  });
  const vis=new Set(cols.flatMap(c=>c.items.map(x=>x.id)));
  const h=30+Math.max(...cols.map(c=>c.items.length))*(H+GY)+30, w=cols.length*(W+GX)-GX+4;
  const aretes=T.aretes.filter(a=>vis.has(a.src)&&vis.has(a.tgt)).map(a=>{ let s=T.noeuds[a.src], t=T.noeuds[a.tgt]; if(s._x>t._x){ const z=s; s=t; t=z; }
    const x1=s._x+W, y1=s._y+H/2, x2=t._x, y2=t._y+H/2, mx=(x1+x2)/2;
    return s._x===t._x?`<path d="M${s._x+W} ${y1} C${s._x+W+40} ${y1} ${s._x+W+40} ${y2} ${s._x+W} ${y2}" fill="none" stroke="${a.c}" stroke-width="1.3" opacity=".75"><title>${esc(a.rel)}</title></path>`
      :`<path d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" fill="none" stroke="${a.c}" stroke-width="1.3" opacity=".75"><title>${esc(T.noeuds[a.src].name)} — ${esc(a.rel)} → ${esc(T.noeuds[a.tgt].name)}</title></path>`; }).join('');
  const boites=cols.map(c=>`<text x="${c.items[0]._x}" y="16" font-size="12" font-weight="700" fill="${c.n.c}">${esc(c.n.l)} (${c.items.length+c.reste})</text>`+
    c.items.map(x=>`<g style="cursor:pointer" onclick="capOpenDetailById('${esc(x.id)}')"><rect x="${x._x}" y="${x._y}" width="${W}" height="${H}" rx="4" fill="var(--c-bg2)" stroke="${c.n.c}"/><text x="${x._x+6}" y="${x._y+14}" font-size="11" fill="var(--c-text)">${esc(x.name.length>32?x.name.slice(0,31)+'…':x.name)}<title>${esc(x.name)} — ${esc(x.type)}</title></text></g>`).join('')+
    (c.reste?`<text x="${c.items[0]._x}" y="${c.items[c.items.length-1]._y+H+16}" font-size="11" fill="var(--c-dim)">${_L(`+ ${c.reste} autre(s) : précisez la recherche`)}</text>`:'')).join('');
  const leg=CAP_UML_TRACE_RELS.filter(([,k])=>T.aretes.some(a=>a.rel===k)).map(([,k,c])=>`<span style="white-space:nowrap"><span style="display:inline-block;width:16px;height:3px;background:${c};vertical-align:middle"></span> ${esc(k)}</span>`).join(' &nbsp; ');
  return `<div class="ana-help">${leg}</div><div style="overflow:auto;max-height:75vh;border:1px solid var(--c-border);border-radius:6px"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="display:block">${aretes}${boites}</svg></div>`;
}

/** Vue ⇶ Traçabilité par niveaux (sous-vue `umltrace`) : couverture par niveau, chemins, graphe, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_utr`)
 */
function capRenderUmlTracabilite(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : ✅ Vérifier › 🧬 Traçabilité entre couches).')}</div>`; return; }
  const T=capUmlTracabilite();
  if(!T.aretes.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucun lien de traçabilité (satisfy, verify, refine, trace, allocate…) dans ce modèle.')}</div>`; return; }
  const st=box._utr=box._utr||{view:'cov', q:'', niv:''};
  const esc=capEsc, q=st.q.trim().toLowerCase(), N=Object.values(T.noeuds), lib=k=>(CAP_UML_NIVEAUX.find(n=>n.k===k)||{}).l||k;
  const pct=(a,b)=>b?Math.round(100*a/b):0, bar=v=>`<span style="display:inline-block;width:70px;height:8px;background:var(--c-bg3);border-radius:4px;vertical-align:middle"><span style="display:block;height:8px;width:${v}%;background:var(--c-ok,#3fb950);border-radius:4px"></span></span> ${v} %`;
  const lk=(n,cle)=>n[cle].length?capFoldList(n[cle].map(a=>{ const o=T.noeuds[a.src===n.id?a.tgt:a.src]; return `${capDetLink(o.id,o.name)} <span class="ana-dim">(${esc(a.rel)})</span>`; })):'<span class="ana-dim">—</span>';
  let body='', cnt='';
  if(st.view==='cov'){
    const first=T.niveaux[0]&&T.niveaux[0].k, last=T.niveaux.filter(n=>n.k!=='autre').slice(-1)[0];
    body=`<p class="ana-help">${_L('Chaque élément tracé reçoit un niveau d\'après son genre, son type ou stéréotype, puis ses paquetages (« Fonctions », « Logical », « Physical »…). Part : reliée vers le niveau supérieur / vers le niveau inférieur.')}</p>`+
      capXtTable([_L('Niveau'),_L('Éléments'),_L('Reliés vers le haut'),_L('Reliés vers le bas'),_L('Relations')], T.niveaux.map(n=>{ const xs=N.filter(x=>x.niv===n.k), r={};
        xs.forEach(x=>[...x.haut,...x.bas].forEach(a=>{ r[a.rel]=(r[a.rel]||0)+1; }));
        return [`<span style="color:${n.c};font-weight:700">${esc(n.l)}</span>`, String(xs.length), n.k===first||n.k==='autre'?'—':bar(pct(xs.filter(x=>x.haut.length).length,xs.length)),
          last&&n.k===last.k||n.k==='autre'?'—':bar(pct(xs.filter(x=>x.bas.length).length,xs.length)), Object.entries(r).map(([k,v])=>`${esc(k)} ${v}`).join(', ')||'—']; }))+
      `<p class="ana-help" style="margin-top:10px">${_L(`${T.aretes.length} lien(s) de traçabilité entre ${N.length} élément(s).`)}</p>`;
  } else if(st.view==='list'){
    const L=N.filter(n=>(!st.niv||n.niv===st.niv)&&capXtHas(q,n.name,n.type)).sort((a,b)=>CAP_UML_NIVEAUX.findIndex(x=>x.k===a.niv)-CAP_UML_NIVEAUX.findIndex(x=>x.k===b.niv)||capUmlTriNom(a.name,b.name));
    cnt=`${L.length} / ${N.length}`;
    body=capXtTable([_L('Élément'),'Type',_L('Niveau'),_L('Vers le haut'),_L('Vers le bas'),_L('Même niveau')], L.map(n=>[capDetLink(n.id,n.name,'font-weight:600'), `<span class="ana-dim">${esc(n.type)}</span>`,
      `<span style="color:${(CAP_UML_NIVEAUX.find(x=>x.k===n.niv)||{}).c}">${esc(lib(n.niv))}</span>`, lk(n,'haut'), lk(n,'bas'), lk(n,'meme')]));
  } else if(st.view==='graph') body=capUmlTrSvg(T, q);
  else body=capDiagHtml(capUmlTrChecks());
  const nivSel=st.view==='list'?capXtSelect('niv',[['',_L('Tous les niveaux')],...T.niveaux.map(n=>[n.k,n.l])],st.niv):'';
  box.innerHTML=capXtBar(capXtViewBtns([['cov',_L('📊 Couverture')],['list',_L('📋 Chemins')],['graph',_L('⇶ Graphe')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='list'||st.view==='graph'?`<span class="tsep"></span>${capXtSearch(st.q,st.view==='graph'?_L('Élément (et son voisinage)…'):_L('Élément, type…'))}${nivSel}`:''), cnt, st.view==='list')+body;
  capXtBind(box, st, capRenderUmlTracabilite, ()=>capCsvExport(_L('tracabilite-niveaux.csv'),[_L('Élément'),'Type',_L('Niveau'),_L('Vers le haut'),_L('Vers le bas'),_L('Même niveau')],
    N.map(n=>{ const o=cle=>capCxList(n[cle].map(a=>T.noeuds[a.src===n.id?a.tgt:a.src])); return [capCx(n.name,n.id), n.type, lib(n.niv), o('haut'), o('bas'), o('meme')]; })));
}

/** Boutons du panneau de détail vers 🎯 Cas d'utilisation (rangée posée par `capUmlVuesBoutons`, 88). @param {string} id - Identifiant @returns {string} HTML */
function capUmlUcDetail(id){
  if(!capUmlLec()) return '';
  const R=capUmlCas(); if(!R.byId[id]&&!R.acteurById[id]) return '';
  return `<button class="cap-lf-btn" onclick="capUmlUcOuvrir('${capEsc(id)}')" title="${_L('Ouvrir dans 🏗 Architecture › 🧬 UML / SysML v1 › 🎯 Cas d\'utilisation')}">🎯 ${_L('Cas d\'utilisation')}</button>`;
}

/** Indicateurs 🎯 et ⇶ du 📐 tableau de bord (vides hors UML / SysML v1) ; appelée par `capUmlDashCatalog` (88).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlUcDashCatalog(add){
  const G=_L('UML / SysML v1'), R=()=>capUmlCas(), T=()=>capUmlTracabilite();
  add(G,'uml.uc.n',_L('UML / SysML v1 — cas d\'utilisation'),'n',()=>({n:R().list.length, sub:_L(`${R().acteurs.length} acteur(s)`)}));
  add(G,'uml.uc.chk',_L('UML / SysML v1 — contrôles des cas d\'utilisation'),'series',()=>({cats:capUmlUcChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
  add(G,'uml.tr.niv',_L('UML / SysML v1 — éléments tracés par niveau'),'series',()=>({order:'natural', cats:T().niveaux.map(n=>({l:n.l, v:n.n, c:n.c}))}));
  add(G,'uml.tr.chk',_L('UML / SysML v1 — contrôles de la traçabilité par niveaux'),'series',()=>({cats:capUmlTrChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}
