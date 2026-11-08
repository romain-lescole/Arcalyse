/* ═══════════════════════════════════════════════════════════════════════════
   🧾 Exigences SysML v1 (sous-vue `umlreq` de 🔬 Analyses, menu ✅ Vérifier) : exigences d'un modèle lu par le lecteur UML
   d'Arcature (88) — classes stéréotypées «Requirement» ou d'un stéréotype qui en dérive (functionalRequirement…, profils
   maison) —, leur identifiant et leur texte (propriétés `id` / `text` du stéréotype ; les autres propriétés en attributs),
   la contenance (exigence contenue dans une autre), et les relations de SysML : «satisfy», «verify», «deriveReqt»,
   «refine», «trace», «copy». Vues 📋 Liste, 🌳 Arbre, 📊 Couverture, ▦ Matrice (exigence × élément), 🩺 Contrôles ;
   ⬇ CSV. Moteur `capUmlExigences` (mis en cache), contrôles `capUmlReqChecks`, indicateurs `capUmlReqDashCatalog`.
   La vue 🧾 Exigences des modèles Capella (39) reste à part : elle lit le Requirements Viewpoint.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Exigence à montrer à la prochaine ouverture de la vue (depuis le panneau de détail). */
var _capUmlReqGo=null;
/** Relations d'exigences de SysML v1 reconnues dans les liaisons du lecteur : clé, motif du nom de relation, libellé. */
var CAP_UML_REQ_RELS=[['satisfy',/^satisf/i,'«satisfy»'],['verify',/^verif/i,'«verify»'],['derive',/^deriv/i,'«deriveReqt»'],['refine',/^refin/i,'«refine»'],['trace',/^trace/i,'«trace»'],['copy',/^copy/i,'«copy»']];

/** Vrai pour une exigence SysML v1 : classe dont le type ou un stéréotype nomme une exigence (« Requirement »).
 * @param {?object} e - Élément du lecteur @returns {boolean} */
function capUmlEstExigence(e){ return !!e&&!e.technique&&e.metaclasse==='Class'&&(/Requirement/i.test(e.type||'')||(e.stereotypes||[]).some(s=>/Requirement/i.test(s))); }

/** Exigences de la lecture UML / SysML v1 affichée, avec leurs relations et leur état de couverture (mis en cache).
 * @returns {{list:object[], byId:object, used:object, tests:number, mauvais:object[]}} Exigences
 */
function capUmlExigences(){
  if(_capAnaCache.umlReq) return _capAnaCache.umlReq;
  const R={list:[], byId:{}, used:{}, tests:0, mauvais:[]};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlReq=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  els.forEach(e=>{
    if((e.stereotypes||[]).some(s=>/^TestCase$/i.test(s))) R.tests++;
    if(!capUmlEstExigence(e)) return;
    let ident='', text=''; const attrs={};
    let at=[]; try{ at=lec.attributs(e.id)||[]; }catch(err){ at=[]; }
    at.forEach(a=>{ const k=String(a.nom||'').replace(/^[\w-]+:/,''); if(!k.includes('.')) return;
      const p=k.split('.').pop(), v=String(a.valeur==null?'':a.valeur);
      if(p==='id'&&!ident) ident=v.trim(); else if(p==='text'&&!text) text=v.replace(/\s+/g,' ').trim(); else if(v!=='') attrs[p]=v; });
    const path=[]; let parent='';
    for(let x=E(e.proprietaire); x&&!x.racine; x=E(x.proprietaire)){ if(capUmlEstExigence(x)){ if(!parent) parent=x.id; continue; } if(x.metaclasse!=='Model') path.unshift(capUmlNom(x)); }
    const r={id:e.id, name:capUmlNom(e), ident, text, type:e.type, path:path.join(' › '), parent, children:[], attrs,
      satisfy:[], verify:[], refine:[], trace:[], derivedFrom:[], derives:[], copyOf:[], copies:[]};
    R.byId[r.id]=r; R.list.push(r);
  });
  R.list.forEach(r=>{ if(r.parent&&R.byId[r.parent]) R.byId[r.parent].children.push(r.id); else r.parent=''; });
  const el=e=>({id:e.id, name:capUmlNom(e), type:e.type});
  const push=(L,e)=>{ if(!L.some(x=>x.id===e.id)) L.push(el(e)); };
  lec.toutesLiaisons().forEach(x=>{
    const genre=t=>(CAP_UML_REQ_RELS.find(([,re])=>re.test(t||''))||[])[0];
    const k=genre(x.relation)||(x.via&&genre((E(x.via)||{}).type)); if(!k) return;   // «refine» du profil standard : liaison « abstraction », type Refine
    const s=E(x.source), c=E(x.cible); if(!s||!c) return;
    const S=R.byId[s.id], C=R.byId[c.id];
    R.used[k]=(R.used[k]||0)+1;
    if(k==='satisfy'||k==='verify'){ if(S) R.mauvais.push({rel:k, src:el(s), tgt:el(c)}); else if(C) push(C[k], s); }   // depuis une exigence : mal orienté, ne compte pas
    else if(k==='derive'){ if(S&&C){ push(S.derivedFrom, c); push(C.derives, s); } else R.mauvais.push({rel:k, src:el(s), tgt:el(c)}); }
    else if(k==='copy'){ if(S&&C){ push(S.copyOf, c); push(C.copies, s); } }
    else if(k==='refine'){ if(C) push(C.refine, s); else if(S) push(S.refine, c); }
    else { if(C) push(C.trace, s); if(S) push(S.trace, c); }
  });
  // Couverture : satisfaite (directement, ou par toutes ses sous-exigences ou exigences dérivées), vérifiée de même
  const etat=(r, k, vus)=>{ if(r[k].length) return 'dir'; if(vus.has(r.id)) return ''; vus.add(r.id);
    const sous=[...r.children, ...(k==='satisfy'?r.derives.map(d=>d.id):[])].map(id=>R.byId[id]).filter(Boolean);
    return sous.length&&sous.every(x=>etat(x,k,vus))?'ind':''; };
  R.list.forEach(r=>{ r.sat=etat(r,'satisfy',new Set()); r.ver=etat(r,'verify',new Set()); r.leaf=!r.children.length; });
  R.list.sort((a,b)=>a.path.localeCompare(b.path,'fr',{numeric:true})||String(a.ident||a.name).localeCompare(String(b.ident||b.name),'fr',{numeric:true}));
  return _capAnaCache.umlReq=R;
}

/** Contrôles 🩺 des exigences SysML v1 (vue 🧾 Exigences SysML ; 💚 Santé, 🩺 profil, tableau de bord).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlReqChecks(){
  const Q=capUmlExigences(), list=Q.list; if(!list.length) return [];
  const row=r=>`<tr><td>${capEsc(r.ident||'')}</td><td>${capDetLink(r.id,r.name,'font-weight:600')}</td><td class="ana-dim">${capEsc(r.path||'')}</td></tr>`;
  const cols=['ID',_L('Exigence'),_L('Dossier')];
  const ids={}; list.forEach(r=>{ if(r.ident) (ids[r.ident]=ids[r.ident]||[]).push(r); });
  // Dérivations circulaires : exigence qui dérive, de proche en proche, d'elle-même
  const cyc=list.filter(r=>{ const vus=new Set(), pile=r.derivedFrom.map(x=>x.id); while(pile.length){ const id=pile.pop(); if(id===r.id) return true; if(vus.has(id)) continue; vus.add(id); (Q.byId[id]?Q.byId[id].derivedFrom:[]).forEach(x=>pile.push(x.id)); } return false; });
  const sec=[
    {icon:'∅', title:_L('Exigences feuilles non satisfaites'), tip:_L('Ni «satisfy» vers un élément du modèle, ni exigences dérivées toutes satisfaites'), cols, items:list.filter(r=>r.leaf&&!r.sat).map(row)},
    {icon:'🧪', sev:Q.used.verify?'warn':'info', title:_L('Exigences feuilles non vérifiées'), tip:Q.used.verify?_L('Aucun «verify» (cas de test) vers cette exigence'):_L('Le modèle ne contient encore aucun «verify»'), cols, items:list.filter(r=>r.leaf&&!r.ver).map(row)},
    {icon:'✎', title:_L('Exigences sans texte'), tip:_L('Propriété text du stéréotype vide'), cols, items:list.filter(r=>!r.text).map(row)},
    {icon:'#', title:_L('Exigences sans identifiant'), tip:_L('Propriété id du stéréotype vide'), cols, items:list.filter(r=>!r.ident).map(row)},
    {icon:'⧉', title:_L('Identifiants d\'exigence en double'), cols, items:Object.values(ids).filter(a=>a.length>1).flat().map(row)},
    {icon:'↻', sev:'err', title:_L('Dérivations circulaires'), tip:_L('Exigence qui dérive (deriveReqt), de proche en proche, d\'elle-même'), cols, items:cyc.map(row)},
    {icon:'⚠', title:_L('Relations d\'exigence mal orientées'), tip:_L('«satisfy» ou «verify» partant d\'une exigence, «deriveReqt» entre une exigence et un autre élément'), cols:[_L('Relation'),_L('Source'),_L('Cible')],
      items:Q.mauvais.map(m=>`<tr><td>${capEsc((CAP_UML_REQ_RELS.find(x=>x[0]===m.rel)||[])[2]||m.rel)}</td><td>${capDetLink(m.src.id,m.src.name)}</td><td>${capDetLink(m.tgt.id,m.tgt.name)}</td></tr>`)},
    {icon:'▣', sev:'info', title:_L('Exigences composites satisfaites directement'), tip:_L('Exigence qui contient d\'autres exigences mais porte elle-même un «satisfy»'), cols, items:list.filter(r=>!r.leaf&&r.satisfy.length).map(row)}
  ];
  return sec;
}

/** Ouvre la vue 🧾 Exigences SysML sur une exigence (liste filtrée sur son identifiant ou son nom). @param {string} id - Exigence */
function capUmlReqOuvrir(id){ _capUmlReqGo=id; capNavOpen('ana:umlreq'); }

/** Bouton « 🧾 Exigences SysML » du panneau de détail d'une exigence UML / SysML v1. @param {string} id - Identifiant @returns {string} HTML */
function capUmlReqDetail(id){
  if(!capUmlLec()||!capUmlExigences().byId[id]) return '';
  return `<button class="cap-lf-btn" onclick="capUmlReqOuvrir('${capEsc(id)}')" title="${_L('Ouvrir dans ✅ Vérifier › 🧾 Exigences SysML')}">🧾 ${_L('Exigences SysML')}</button>`;
}

/** Libellé d'un état de couverture : directement, par les sous-exigences ou exigences dérivées, non. @param {string} v - État ('dir', 'ind' ou '') @returns {string} */
function capUmlReqEtatLib(v){ return v==='dir'?_L('directement'):v==='ind'?_L('par ses sous-exigences ou exigences dérivées'):_L('non'); }

/** Pastille d'état de couverture d'une exigence (satisfaite / vérifiée). @param {object} r - Exigence @returns {string} HTML */
function capUmlReqEtat(r){
  const b=(v,ok,lib)=>`<span title="${lib} : ${capUmlReqEtatLib(v)}" style="color:${v==='dir'?'var(--c-ok,#3fb950)':v==='ind'?'var(--c-accent)':'var(--c-dim)'};font-weight:700">${v?ok:'·'}</span>`;
  return `<span style="white-space:nowrap;font-family:monospace">${b(r.sat,'S',_L('Satisfaite'))} ${b(r.ver,'V',_L('Vérifiée'))}</span>`;
}

/** Vue 🧾 Exigences SysML (sous-vue `umlreq` de 🔬 Analyses) : liste, arbre, couverture, matrice, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_urq`)
 */
function capRenderUmlExigences(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : ✅ Vérifier › 🧾 Exigences).')}</div>`; return; }
  const Q=capUmlExigences(), list=Q.list;
  if(!list.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucune exigence SysML («Requirement») dans ce modèle.')}</div>`; return; }
  const st=box._urq=box._urq||{view:'list', q:'', etat:'', path:'', type:'', mx:'satisfy'};
  if(_capUmlReqGo){ const r=Q.byId[_capUmlReqGo]; _capUmlReqGo=null; if(r){ st.view='list'; st.q=r.ident||r.name; st.etat=''; st.path=''; st.type=''; } }
  const esc=capEsc, q=st.q.trim().toLowerCase();
  const dos=r=>r.path||'/', paths=[...new Set(list.map(dos))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true})), types=[...new Set(list.map(r=>r.type))].sort();
  const ETATS={sat:r=>!!r.sat, nsat:r=>!r.sat, ver:r=>!!r.ver, nver:r=>!r.ver, feuille:r=>r.leaf};
  const shown=list.filter(r=>(!st.etat||ETATS[st.etat](r))&&(!st.path||dos(r)===st.path)&&(!st.type||r.type===st.type)&&capXtHas(q,r.ident,r.name,r.text,r.path));
  const lk=a=>a.length?capFoldList(a.map(x=>capDetLink(x.id,x.name))):'<span class="ana-dim">—</span>';
  const feuilles=list.filter(r=>r.leaf), pct=(n,d)=>d?Math.round(100*n/d):0;
  const nSat=feuilles.filter(r=>!!r.sat).length, nVer=feuilles.filter(r=>!!r.ver).length;
  let body='', cnt=`${shown.length} / ${list.length}`;
  if(st.view==='list'){
    body=`<p class="ana-help">${_L(`${list.length} exigence(s), dont ${feuilles.length} feuille(s) : <b>${pct(nSat,feuilles.length)} %</b> satisfaites, <b>${pct(nVer,feuilles.length)} %</b> vérifiées. S / V : satisfaite / vérifiée (vert : directement, bleu : par ses sous-exigences ou exigences dérivées).`)}</p>`+
      capXtTable(['ID',_L('Exigence'),'S / V',_L('Texte'),_L('Satisfaite par'),_L('Vérifiée par'),_L('Dérive de'),_L('Exigences dérivées'),_L('Autres relations')], shown.map(r=>[
        `<span style="font-family:monospace;white-space:nowrap">${esc(r.ident)}</span>`,
        `${capDetLink(r.id,r.name,'font-weight:600')}${r.path?`<div class="ana-dim">${esc(r.path)}</div>`:''}${r.type!=='Requirement'?`<div class="ana-dim">«${esc(r.type)}»</div>`:''}`,
        capUmlReqEtat(r), capXtShort(r.text), lk(r.satisfy), lk(r.verify), lk(r.derivedFrom), lk(r.derives),
        [...r.refine.map(x=>'«refine» '+capDetLink(x.id,x.name)), ...r.trace.map(x=>'«trace» '+capDetLink(x.id,x.name)), ...r.copyOf.map(x=>'«copy» '+capDetLink(x.id,x.name)),
          ...Object.entries(r.attrs).map(([k,v])=>`<span class="ana-dim">${esc(k)} :</span> ${esc(capXtPlain(v).slice(0,120))}`)].join('<br>')||'<span class="ana-dim">—</span>']));
  } else if(st.view==='tree'){
    const ok=new Set(shown.map(r=>r.id));
    const garde=r=>ok.has(r.id)||r.children.some(id=>garde(Q.byId[id]));
    const ligne=(r,d)=>{ const kids=r.children.map(id=>Q.byId[id]).filter(garde);
      const t=`${capUmlReqEtat(r)} <span style="font-family:monospace" class="ana-dim">${esc(r.ident)}</span> ${capDetLink(r.id,r.name,ok.has(r.id)?'font-weight:600':'opacity:.6')}${r.text?` <span class="ana-dim" title="${esc(r.text)}">— ${esc(r.text.slice(0,140))}${r.text.length>140?'…':''}</span>`:''}`;
      return kids.length?`<details${d<1?' open':''} style="margin-left:${d?14:0}px"><summary>${t} <span class="ana-dim">(${kids.length})</span></summary>${kids.map(k=>ligne(k,d+1)).join('')}</details>`
        :`<div style="margin-left:${d?14:0}px;padding:1px 0 1px 14px">${t}</div>`; };
    const racines=list.filter(r=>!r.parent&&garde(r)), parDossier={};
    racines.forEach(r=>{ (parDossier[r.path]=parDossier[r.path]||[]).push(r); });
    body=Object.keys(parDossier).sort((a,b)=>a.localeCompare(b,'fr',{numeric:true})).map(p=>`<div style="margin:8px 0 2px;font-weight:600">📁 ${esc(p||_L('(racine)'))}</div>${parDossier[p].map(r=>ligne(r,0)).join('')}`).join('')
      ||`<div class="phl-empty">${_L('Aucune exigence ne correspond au filtre.')}</div>`;
  } else if(st.view==='cov'){
    const bar=v=>`<span style="display:inline-block;width:80px;height:8px;background:var(--c-bg3);border-radius:4px;vertical-align:middle"><span style="display:block;height:8px;width:${v}%;background:var(--c-ok,#3fb950);border-radius:4px"></span></span> ${v} %`;
    const lignes=paths.map(p=>{ const rs=list.filter(r=>dos(r)===p), fs=rs.filter(r=>r.leaf);
      return [esc(p==='/'?_L('(racine)'):p), String(rs.length), String(fs.length), bar(pct(fs.filter(r=>!!r.sat).length,fs.length)), bar(pct(fs.filter(r=>!!r.ver).length,fs.length))]; });
    const parType={}; list.forEach(r=>r.satisfy.forEach(x=>{ parType[x.type]=(parType[x.type]||0)+1; }));
    body=`<p class="ana-help">${_L('Couverture des exigences feuilles par dossier : part satisfaite (directement ou par dérivation) et part vérifiée.')}</p>`+
      capXtTable([_L('Dossier'),_L('Exigences'),_L('Feuilles'),_L('Satisfaites'),_L('Vérifiées')], lignes)+
      `<p class="ana-help" style="margin-top:12px">${_L('Éléments qui satisfont les exigences, par type :')}</p>`+
      capXtTable(['Type',_L('Relations «satisfy»'),_L('Éléments')], Object.entries(parType).sort((a,b)=>b[1]-a[1]).map(([t,v])=>[esc(t), String(v), String(new Set(list.flatMap(r=>r.satisfy.filter(x=>x.type===t).map(x=>x.id))).size)]), _L('Aucune relation «satisfy».'))+
      `<p class="ana-help" style="margin-top:12px">${_L(`Relations d'exigences : ${CAP_UML_REQ_RELS.map(([k,,l])=>`${l} ${Q.used[k]||0}`).join(' · ')} · cas de test «TestCase» : ${Q.tests}`)}</p>`;
  } else if(st.view==='mx'){
    const rel=st.mx, rows=shown.filter(r=>r[rel].length).slice(0,300), deg={};
    rows.forEach(r=>r[rel].forEach(x=>{ deg[x.id]=deg[x.id]||{x, n:0}; deg[x.id].n++; }));
    const colsAll=Object.values(deg).sort((a,b)=>b.n-a.n), cs=colsAll.slice(0,100).map(c=>c.x).sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true}));
    const has=new Set(); rows.forEach(r=>r[rel].forEach(x=>has.add(r.id+'|'+x.id)));
    body=(colsAll.length>100?`<div class="cap-mx-hint">${_L(`⚠ ${colsAll.length} éléments : la matrice en garde 100 (les plus reliés). Filtrez pour voir les autres.`)}</div>`:'')+
      (rows.length?`<div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">${_L('Exigence ↓ / Élément →')}</th>${cs.map(c=>`<th class="cap-mx-col" title="${esc(c.name)} — ${esc(c.type)}"><div>${capDetLink(c.id,c.name)}</div></th>`).join('')}<th class="cap-mx-col"><div><b>Σ</b></div></th></tr></thead><tbody>`+
        rows.map(r=>`<tr><th class="cap-mx-row" title="${esc(r.ident?r.ident+' '+r.name:r.name)}">${capDetLink(r.id,(r.ident?r.ident+' ':'')+r.name)}</th>${cs.map(c=>has.has(r.id+'|'+c.id)?`<td class="cap-mx-cell" style="background:rgba(63,185,80,.45)" title="${esc(c.name)} ${esc((CAP_UML_REQ_RELS.find(x=>x[0]===rel)||[])[2]||rel)} ${esc(r.name)}">✓</td>`:'<td></td>').join('')}<td class="cap-mx-tot">${r[rel].length}</td></tr>`).join('')+
        `</tbody></table></div><div class="cap-mx-hint">${_L(`${rows.length} exigence(s) × ${cs.length} élément(s)`)}${shown.filter(r=>r[rel].length).length>300?_L(' (300 premières exigences)'):''}</div>`
        :`<div class="phl-empty">${_L('Aucune exigence filtrée ne porte cette relation.')}</div>`);
  } else { body=capDiagHtml(capUmlReqChecks()); cnt=''; }
  const relSel=st.view==='mx'?capXtSelect('mx',[['satisfy',_L('Satisfaite par («satisfy»)')],['verify',_L('Vérifiée par («verify»)')],['refine','«refine»'],['trace','«trace»'],['derives',_L('Exigences dérivées')],['derivedFrom',_L('Dérive de')]],st.mx):'';
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Liste')],['tree',_L('🌳 Arbre')],['cov',_L('📊 Couverture')],['mx',_L('▦ Matrice')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'&&st.view!=='cov'?`<span class="tsep"></span>${capXtSearch(st.q,_L('ID, nom, texte…'))}
      ${capXtSelect('etat',[['',_L('Toutes')],['nsat',_L('Non satisfaites')],['sat',_L('Satisfaites')],['nver',_L('Non vérifiées')],['ver',_L('Vérifiées')],['feuille',_L('Feuilles')]],st.etat)}
      ${paths.length>1?capXtSelect('path',[['',_L('Tous les dossiers')],...paths.map(p=>[p,p==='/'?_L('(racine)'):p])],st.path):''}
      ${types.length>1?capXtSelect('type',[['',_L('Tous les stéréotypes')],...types.map(t=>[t,t])],st.type):''}${relSel}`:''), cnt)+body;
  capXtBind(box, st, capRenderUmlExigences, ()=>capCsvExport(_L('exigences-sysml.csv'),['ID',_L('Exigence'),_L('Stéréotype'),_L('Dossier'),_L('Texte'),_L('Satisfaite'),_L('Vérifiée'),_L('Satisfaite par'),_L('Vérifiée par'),_L('Dérive de'),_L('Exigences dérivées'),'«refine»','«trace»'],
    shown.map(r=>[r.ident, capCx(r.name,r.id), r.type, r.path, r.text, capUmlReqEtatLib(r.sat), capUmlReqEtatLib(r.ver), capCxList(r.satisfy), capCxList(r.verify), capCxList(r.derivedFrom), capCxList(r.derives), capCxList(r.refine), capCxList(r.trace)])));
}

/** Indicateurs 🧾 Exigences SysML du 📐 tableau de bord (vides hors SysML v1) ; appelée par `capUmlDashCatalog` (88).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlReqDashCatalog(add){
  const G=_L('UML / SysML v1'), Q=()=>capUmlExigences(), F=()=>Q().list.filter(r=>r.leaf);
  add(G,'uml.req.n',_L('Exigences SysML — nombre'),'n',()=>({n:Q().list.length, sub:_L(`${F().length} feuille(s)`)}));
  add(G,'uml.req.sat',_L('Exigences SysML — feuilles satisfaites'),'pct',()=>capDashPct(F(),r=>!!r.sat),_L('«satisfy» direct ou exigences dérivées toutes satisfaites'));
  add(G,'uml.req.ver',_L('Exigences SysML — feuilles vérifiées'),'pct',()=>capDashPct(F(),r=>!!r.ver),_L('«verify» depuis un cas de test'));
  add(G,'uml.req.chk',_L('Exigences SysML — contrôles'),'series',()=>({cats:capUmlReqChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}
