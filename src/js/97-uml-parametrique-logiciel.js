/* ═══════════════════════════════════════════════════════════════════════════
   🔒 Paramétrique & contraintes (sous-vue `umlpar`, ✅ Vérifier) et 📦 Paquetages & classes (sous-vue `umlsoft`, famille
   🧬 UML / SysML v1) d'un modèle lu par le lecteur UML d'Arcature (88) :
   - `capUmlParametrique` : blocs de contrainte SysML (ConstraintBlock) avec leurs équations et paramètres, usages
     (ConstraintProperty) dans un bloc de contexte, liaisons (BindingConnector) entre un paramètre et une valeur (valeur par
     défaut, unité) ou un autre paramètre ; contraintes UML (OCL…) et éléments contraints ; contrôles : paramètres non liés,
     unités différentes, blocs sans équation ou inutilisés, équations citant un nom qui n'est pas un paramètre, contraintes
     sans texte ou sans élément contraint. Aucune équation n'est résolue (pas de solveur).
   - `capUmlLogiciel` : classes, interfaces et énumérations d'UML (sans stéréotype SysML) ; dépendances entre classes
     (généralisation, réalisation, usage, attribut typé, association, dépendance) et entre paquetages ; métriques (attributs,
     opérations, profondeur d'héritage, sous-classes, couplage ; paquetages : Ca, Ce, instabilité, abstraction, distance de
     Martin) ; déploiement (nœuds, artefacts, manifestations) ; contrôles : cycles de paquetages, cycles d'héritage, classes
     abstraites sans sous-classe, opérations abstraites dans une classe concrète, interfaces requises non fournies ou
     inutilisées, héritage profond, couplage fort, artefacts non déployés, nœuds vides.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Seuils fixes des contrôles logiciels : profondeur d'héritage et couplage au-delà desquels une classe est signalée. */
var CAP_UML_DIT_MAX=5, CAP_UML_CBO_MAX=10;
/** Noms reconnus dans une équation sans être des paramètres (fonctions et constantes usuelles, mots-clés). */
var CAP_UML_EQ_MOTS=/^(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|sqrt|exp|log|log10|ln|abs|min|max|pow|floor|ceil|round|sum|mean|pi|e|and|or|not|if|then|else|true|false|der|Math|PI)$/;

/** Vrai pour un bloc de contrainte SysML. @param {?object} e - Élément du lecteur @returns {boolean} */
function capUmlEstBlocContrainte(e){ return !!e&&(e.type==='ConstraintBlock'||(e.stereotypes||[]).includes('ConstraintBlock')); }

/* ── 1. 🔒 Paramétrique & contraintes ─────────────────────────── */

/** Blocs de contrainte, usages, liaisons et contraintes UML de la lecture affichée (mis en cache).
 * @returns {{blocs:object[], byId:object, usages:object[], contraintes:object[]}} Paramétrique
 */
function capUmlParametrique(){
  if(_capAnaCache.umlPar) return _capAnaCache.umlPar;
  const R={blocs:[], byId:{}, usages:[], contraintes:[]};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlPar=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  const typeDe=p=>{ const t=E(capUmlRef(p,'type')[0]); return t?{id:t.id, name:capUmlNom(t)}:null; };
  els.forEach(e=>{ if(!capUmlEstBlocContrainte(e)) return;
    const kids=(e.enfants||[]).map(E).filter(Boolean);
    const b={id:e.id, name:capUmlNom(e), equations:kids.filter(k=>k.metaclasse==='Constraint').map(k=>({id:k.id, texte:capUmlTexteContrainte(lec,k)})),
      params:kids.filter(k=>k.metaclasse==='Property'&&k.type!=='ConstraintProperty'&&!(k.stereotypes||[]).includes('ConstraintProperty')).map(k=>({id:k.id, name:capUmlNom(k), type:typeDe(k)})), usages:[]};
    R.byId[b.id]=b; R.blocs.push(b); });
  const usageById={};
  els.forEach(e=>{ if(e.metaclasse!=='Property') return; const cb=R.byId[capUmlRef(e,'type')[0]]; if(!cb) return;
    const ctx=E(e.proprietaire), u={id:e.id, name:capUmlNom(e), cb, ctx:ctx?{id:ctx.id, name:capUmlNom(ctx)}:null, liens:{}};
    cb.params.forEach(p=>{ u.liens[p.id]=[]; }); cb.usages.push(u); R.usages.push(u); usageById[u.id]=u; });
  /** Extrémité d'une liaison : paramètre d'un usage, ou valeur (part.valeur) avec sa valeur par défaut. */
  const bout=end=>{ const r=E(capUmlRef(end,'role')[0]), pw=E(capUmlRef(end,'partWithPort')[0]); if(!r) return null;
    const u=pw&&usageById[pw.id], cb=r&&R.byId[r.proprietaire];
    if(u&&cb&&u.cb===cb) return {param:true, u, p:cb.params.find(x=>x.id===r.id)};
    return {param:false, id:r.id, name:(pw?capUmlNom(pw)+'.':'')+capUmlNom(r), val:capUmlNombre(r.valeur), type:typeDe(r)}; };
  els.forEach(c=>{ if(c.metaclasse!=='Connector'||!(c.type==='BindingConnector'||(c.stereotypes||[]).includes('BindingConnector'))) return;
    const ends=(c.enfants||[]).map(E).filter(x=>x&&x.metaclasse==='ConnectorEnd'); if(ends.length!==2) return;
    const a=bout(ends[0]), b=bout(ends[1]); if(!a||!b) return;
    [[a,b],[b,a]].forEach(([x,y])=>{ if(!x.param||!x.p) return;
      const autre=y.param?{id:y.p?y.p.id:'', name:y.u.name+'.'+(y.p?y.p.name:'?'), val:null, type:y.p?y.p.type:null, param:true}:y;
      const ecart=!!(x.p.type&&autre.type&&x.p.type.id!==autre.type.id);
      x.u.liens[x.p.id].push({id:c.id, autre, ecart}); }); });
  // Contraintes UML (hors équations des blocs de contrainte, gardes de transitions et invariants d'interactions)
  els.forEach(k=>{ if(k.metaclasse!=='Constraint'||R.byId[k.proprietaire]) return; const ow=E(k.proprietaire);
    if(ow&&/^(Transition|StateInvariant|InteractionOperand|Interaction)$/.test(ow.metaclasse)) return;   // gardes et invariants : vus dans 🚦 / 🎬 (94)
    const c={id:k.id, name:k.nom||'', texte:capUmlTexteContrainte(lec,k).replace(new RegExp('^'+(k.nom||'§').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),''),
      langue:capUmlAttr(lec, (k.enfants||[])[0]||k.id, 'language'), stereo:(k.stereotypes||[]).join(', '), elements:capUmlRef(k,'constrainedElement').map(E).filter(Boolean).map(x=>({id:x.id, name:capUmlNom(x)})), porteur:ow?{id:ow.id, name:capUmlNom(ow)}:null};
    Object.assign(c, capUmlContrainteNature(c.texte));   // nature (texte, OCL, expression structurée de Cameo, vide) et résumé lisible
    R.contraintes.push(c); });
  // Noms cités par les équations qui ne sont pas des paramètres
  R.blocs.forEach(b=>{ const noms=new Set(b.params.map(p=>p.name)); b.inconnus=[...new Set(b.equations.flatMap(q=>(q.texte.match(/[A-Za-z_][\w]*/g)||[]).filter(t=>!noms.has(t)&&!CAP_UML_EQ_MOTS.test(t))))]; });
  R.blocs.sort((a,b)=>capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlPar=R;
}

/** Contrôles 🩺 de la paramétrique et des contraintes (vue 🔒 ; 💚 Santé, 🩺 profil). @returns {object[]} Sections */
function capUmlParChecks(){
  const R=capUmlParametrique(); if(!R.blocs.length&&!R.contraintes.length) return [];
  const fl=(id,n)=>capDetLink(id,n), brow=b=>`<tr><td>${fl(b.id,b.name)}</td><td>${b.params.length}</td></tr>`, bcols=[_L('Bloc de contrainte'),_L('Paramètres')];
  const libres=R.usages.flatMap(u=>u.cb.params.filter(p=>!u.liens[p.id].length).map(p=>({u,p})));
  const ecarts=R.usages.flatMap(u=>u.cb.params.flatMap(p=>u.liens[p.id].filter(l=>l.ecart).map(l=>({u,p,l}))));
  const crow=c=>`<tr><td>${fl(c.id,c.name||'—')}</td><td>${c.porteur?fl(c.porteur.id,c.porteur.name):'—'}</td><td>${capXtShort(c.texte,120)}</td></tr>`, ccols=[_L('Contrainte'),_L('Porteur'),_L('Texte')];
  return [
    {icon:'⭘', title:_L('Paramètres non liés'), tip:_L('Paramètre d\'un usage de bloc de contrainte qu\'aucun BindingConnector ne relie à une valeur ou à un autre paramètre'), cols:[_L('Contexte'),_L('Usage'),_L('Paramètre')],
      items:libres.map(({u,p})=>`<tr><td>${u.ctx?fl(u.ctx.id,u.ctx.name):'—'}</td><td>${fl(u.id,u.name)} : ${capEsc(u.cb.name)}</td><td>${fl(p.id,p.name)}</td></tr>`)},
    {icon:'≠', title:_L('Liaisons entre types ou unités différents'), tip:_L('Le paramètre et la valeur liée n\'ont pas le même ValueType (unités différentes : kg et W…)'), cols:[_L('Usage'),_L('Paramètre'),_L('Lié à'),_L('Types')],
      items:ecarts.map(({u,p,l})=>`<tr><td>${fl(u.id,u.name)}</td><td>${fl(p.id,p.name)}</td><td>${l.autre.id?fl(l.autre.id,l.autre.name):capEsc(l.autre.name)}</td><td>${capEsc(p.type.name)} ≠ ${capEsc(l.autre.type.name)}</td></tr>`)},
    {icon:'∅', title:_L('Blocs de contrainte sans équation'), cols:bcols, items:R.blocs.filter(b=>!b.equations.some(q=>q.texte)).map(brow)},
    {icon:'○', sev:'info', title:_L('Blocs de contrainte inutilisés'), tip:_L('Aucune ConstraintProperty ne l\'utilise dans un bloc de contexte'), cols:bcols, items:R.blocs.filter(b=>!b.usages.length).map(brow)},
    {icon:'?', sev:'info', title:_L('Équations citant un nom qui n\'est pas un paramètre'), tip:_L('Nom de l\'équation qui n\'est ni un paramètre du bloc ni une fonction usuelle (sin, sqrt, max…)'), cols:[_L('Bloc de contrainte'),_L('Noms')],
      items:R.blocs.filter(b=>b.inconnus.length).map(b=>`<tr><td>${fl(b.id,b.name)}</td><td><code>${capEsc(b.inconnus.join(', '))}</code></td></tr>`)},
    {icon:'✎', title:_L('Contraintes sans texte'), tip:_L('Contrainte sans expression (OCL, texte…)'), cols:ccols, items:R.contraintes.filter(c=>!c.texte).map(crow)},
    {icon:'⊙', sev:'info', title:_L('Contraintes sans élément contraint'), tip:_L('Aucun constrainedElement explicite'), cols:ccols, items:R.contraintes.filter(c=>!c.elements.length).map(crow)}
  ];
}

/** Natures d'une contrainte UML, dans l'ordre des puces de l'onglet 🔒 Contraintes : [clé, libellé, info-bulle]. */
const CAP_UML_CT_NATURES=[
  ['texte', _L('📝 Texte / OCL'), _L('Contrainte écrite (OCL, texte, équation…) : la règle telle que l\'auteur l\'a saisie')],
  ['cameo', _L('🧩 Expression de Cameo'), _L('Expression structurée de Cameo (StructuredExpression, enregistrée en XML) : critère d\'une légende, d\'un groupe d\'éléments, d\'une propriété dérivée… ; résumée ici, XML complet repliable')],
  ['vide', _L('∅ Sans texte'), _L('Contrainte sans expression : seul son nom porte la règle')]
];

/** Nature et résumé lisible du texte d'une contrainte : une expression structurée de Cameo (XML « StructuredExpression », souvent des
 * milliers de caractères) est résumée par les noms de ses opérandes (propriétés testées, conditions) et son opérateur (union,
 * intersection, négation) ; le XML reste disponible (`capUmlXmlJoli`).
 * @param {string} t - Texte de la contrainte
 * @returns {{nature:string, resume:string}} nature `texte` | `cameo` | `vide`
 */
function capUmlContrainteNature(t){
  t=String(t||'').trim(); if(!t) return {nature:'vide', resume:''};
  if(!/^<\?xml|StructuredExpression|ExpressionSpecification[\s>]/.test(t)) return {nature:'texte', resume:''};
  const deco=x=>{ let v=x; for(let i=0;i<3;i++) v=v.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'); return v; };
  const noms=[], vus=new Set();
  const re=/<entry key="name">\s*<value>([^<]*)<\/value>/g; let m;
  while((m=re.exec(t))){ const n=deco(m[1]).trim(); if(n&&!/^(Condition|Expression)$/i.test(n)&&!vus.has(n)){ vus.add(n); noms.push(n); } }
  const op=/<unionExpressionSpecification/.test(t)?_L('ou'):/<intersectionExpressionSpecification/.test(t)?_L('et'):'';
  const neg=/<(not|negation)ExpressionSpecification/i.test(t)?_L('non')+' ':'';
  return {nature:'cameo', resume:noms.length?neg+noms.join(op?` ${op} `:' · '):_L('(expression sans opérande nommé)')};
}

/** Met en forme un texte XML sur plusieurs lignes, en retrait (une balise par ligne), pour l'afficher dans un bloc repliable.
 * @param {string} x - XML sur une ligne
 * @returns {string} XML en retrait (texte brut, à échapper)
 */
function capUmlXmlJoli(x){
  let n=0; return String(x||'').replace(/>\s*</g,'>\n<').split('\n').map(l=>{ l=l.trim(); if(/^<\//.test(l)) n=Math.max(0,n-1); const r='  '.repeat(n)+l; if(/^<[^!?\/][^>]*[^\/]>$/.test(l)&&!/<\/[^>]+>$/.test(l)) n++; return r; }).join('\n');
}

/** Vue 🔒 Paramétrique & contraintes (sous-vue `umlpar`) : blocs de contrainte, liaisons, contraintes, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_upa`)
 */
function capRenderUmlParametrique(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : ✅ Vérifier › 🎛 Propriétés & contraintes).')}</div>`; return; }
  const R=capUmlParametrique();
  if(!R.blocs.length&&!R.contraintes.length){ box.innerHTML=`<div class="phl-empty">${_L('Ni bloc de contrainte ni contrainte dans ce modèle.')}</div>`; return; }
  const st=box._upa=box._upa||{view:R.blocs.length?'cb':'ct', q:''};
  const esc=capEsc, q=st.q.trim().toLowerCase(), fl=(id,n,s)=>capDetLink(id,n,s), num=v=>v==null?'<span class="ana-dim">—</span>':esc(v.toLocaleString(CAP_LANG==='en'?'en-GB':'fr-FR'));
  let body='', cnt='';
  if(st.view==='cb'){
    const L=R.blocs.filter(b=>capXtHas(q,b.name,...b.equations.map(x=>x.texte))); cnt=`${L.length} / ${R.blocs.length}`;
    body=capXtTable([_L('Bloc de contrainte'),_L('Équations'),_L('Paramètres'),_L('Usages')], L.map(b=>[fl(b.id,b.name,'font-weight:600'),
      b.equations.map(x=>`<div><code>${esc(x.texte||'—')}</code></div>`).join('')||'<span class="ana-miss">∅</span>',
      b.params.map(p=>`${esc(p.name)}${p.type?` <span class="ana-dim">: ${esc(p.type.name)}</span>`:''}`).join(', ')||'—',
      b.usages.map(u=>`${fl(u.id,u.name)}${u.ctx?` <span class="ana-dim">${_L('dans')} ${esc(u.ctx.name)}</span>`:''}`).join('<br>')||'<span class="ana-dim">—</span>']));
  } else if(st.view==='bind'){
    const lignes=R.usages.flatMap(u=>u.cb.params.map(p=>({u,p,ls:u.liens[p.id]}))).filter(x=>capXtHas(q,x.u.name,x.p.name,x.u.ctx&&x.u.ctx.name,...x.ls.map(l=>l.autre.name)));
    cnt=String(lignes.length);
    body=`<p class="ana-help">${_L('Une ligne par paramètre de chaque usage : ce à quoi un BindingConnector le lie, avec la valeur par défaut et le type. Aucune équation n\'est résolue.')}</p>`+
      capXtTable([_L('Contexte'),_L('Usage'),_L('Paramètre'),_L('Lié à'),_L('Valeur'),'Type'], lignes.map(({u,p,ls})=>[u.ctx?fl(u.ctx.id,u.ctx.name):'—', `${fl(u.id,u.name)} <span class="ana-dim">: ${esc(u.cb.name)}</span>`,
        `${fl(p.id,p.name,'font-weight:600')}${p.type?` <span class="ana-dim">: ${esc(p.type.name)}</span>`:''}`,
        ls.length?ls.map(l=>`${l.autre.id?fl(l.autre.id,l.autre.name):esc(l.autre.name)}${l.ecart?` <span style="color:var(--c-warn,#e3b341)">≠</span>`:''}`).join('<br>'):'<span class="ana-miss">⭘ '+_L('non lié')+'</span>',
        ls.map(l=>num(l.autre.val)).join('<br>')||'—', ls.map(l=>l.autre.type?esc(l.autre.type.name):'—').join('<br>')||'—']));
  } else if(st.view==='ct'){
    const parN={}; R.contraintes.forEach(c=>{ parN[c.nature]=(parN[c.nature]||0)+1; });
    if(st.nat&&!parN[st.nat]) st.nat='';
    const L=R.contraintes.filter(c=>(!st.nat||c.nature===st.nat)&&capXtHas(q,c.name,c.resume,c.nature==='cameo'?'':c.texte,c.stereo,c.porteur&&c.porteur.name,...c.elements.map(x=>x.name))); cnt=`${L.length} / ${R.contraintes.length}`;
    const nat=k=>(CAP_UML_CT_NATURES.find(x=>x[0]===k)||[k,k,''])[1];
    const texte=c=>c.nature==='vide'?'<span class="ana-miss">∅</span>'
      :c.nature==='cameo'?`<div class="upa-res">${esc(c.resume)}</div><details class="upa-xml"><summary>${_L(`XML de Cameo (${c.texte.length.toLocaleString(CAP_LANG==='en'?'en-GB':'fr-FR')} caractères)`)}</summary><pre>${esc(capUmlXmlJoli(c.texte))}</pre></details>`
      :`<code class="upa-txt">${esc(c.texte)}</code>`;
    body=`<p class="ana-help">${_L('Contraintes UML du modèle (hors équations des blocs de contrainte, gardes de transitions et invariants d\'interactions). Les expressions structurées de Cameo (légendes, groupes d\'éléments, propriétés dérivées) sont résumées par leurs opérandes ; leur XML reste consultable.')}</p>`+
      `<div class="upa-puces">`+[['',_L('Toutes'),R.contraintes.length,''],...CAP_UML_CT_NATURES.filter(x=>parN[x[0]]).map(x=>[x[0],x[1],parN[x[0]],x[2]])].map(([k,l,n,t])=>`<button class="cap-lf-btn${(st.nat||'')===k?' active':''}" data-upnat="${k}" title="${esc(t)}">${esc(l)} <span class="ana-dim">${n}</span></button>`).join('')+`</div>`+
      capXtTable([_L('Contrainte'),_L('Porteur'),_L('Nature'),_L('Expression'),_L('Éléments contraints')], L.map(c=>[fl(c.id,c.name||'—','font-weight:600')+(c.stereo?`<div class="ana-dim" style="font-size:11px">«${esc(c.stereo)}»</div>`:''), c.porteur?fl(c.porteur.id,c.porteur.name):'—',
      `<span class="ana-dim">${esc(nat(c.nature))}${c.langue?` · ${esc(c.langue)}`:''}</span>`, texte(c), c.elements.length?capFoldList(c.elements.map(x=>fl(x.id,x.name))):'<span class="ana-dim">—</span>']));
  } else body=capDiagHtml(capUmlParChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['cb',_L('📋 Blocs de contrainte')],['bind',_L('🔗 Liaisons')],['ct',_L('🔒 Contraintes')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${capXtSearch(st.q,_L('Nom, équation, texte…'))}`:''), cnt, st.view!=='diag')+body;
  box.querySelectorAll('[data-upnat]').forEach(b=>b.onclick=()=>{ st.nat=b.dataset.upnat; capRenderUmlParametrique(box); });
  capXtBind(box, st, capRenderUmlParametrique, ()=>{
    if(st.view==='ct') capCsvExport(_L('contraintes.csv'),[_L('Contrainte'),_L('Porteur'),_L('Nature'),_L('Résumé'),_L('Texte'),_L('Éléments contraints')], R.contraintes.map(c=>[capCx(c.name,c.id), c.porteur?capCx(c.porteur.name,c.porteur.id):'', (CAP_UML_CT_NATURES.find(x=>x[0]===c.nature)||[])[1]||c.nature, c.resume, c.texte, capCxList(c.elements)]));
    else capCsvExport(_L('parametrique.csv'),[_L('Contexte'),_L('Usage'),_L('Bloc de contrainte'),_L('Paramètre'),_L('Lié à'),_L('Valeur'),'Type'],
      R.usages.flatMap(u=>u.cb.params.map(p=>[u.ctx?capCx(u.ctx.name,u.ctx.id):'', capCx(u.name,u.id), capCx(u.cb.name,u.cb.id), capCx(p.name,p.id), u.liens[p.id].map(l=>l.autre.name).join(' ; '), u.liens[p.id].map(l=>l.autre.val??'').join(' ; '), p.type?p.type.name:''])));
  });
}

/* ── 2. 📦 Paquetages & classes (UML logiciel) ─────────────────── */

/** Classes, interfaces, paquetages et déploiement UML de la lecture affichée, avec métriques et cycles (mis en cache).
 * @returns {{classes:object[], byId:object, paquetages:object[], pById:object, cyclesP:string[][], cyclesH:string[][], noeuds:object[], artefacts:object[]}} Logiciel
 */
function capUmlLogiciel(){
  if(_capAnaCache.umlSoft) return _capAnaCache.umlSoft;
  const R={classes:[], byId:{}, paquetages:[], pById:{}, cyclesP:[], cyclesH:[], noeuds:[], artefacts:[]};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlSoft=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  const pkgDe=e=>{ for(let x=E(e.proprietaire); x&&!x.racine; x=E(x.proprietaire)) if(/^(Package|Model)$/.test(x.metaclasse)) return x; return null; };
  els.forEach(e=>{
    if(!/^(Class|Interface|Enumeration|Component)$/.test(e.metaclasse)||(e.stereotypes||[]).length||e.famille==='REQ') return;
    const p=pkgDe(e), kids=(e.enfants||[]).map(E).filter(Boolean);
    const c={id:e.id, name:capUmlNom(e), meta:e.metaclasse, abstrait:(e.modificateurs||[]).includes('abstract')||e.metaclasse==='Interface', pkg:p?p.id:'',
      attrs:kids.filter(k=>k.metaclasse==='Property').length, ops:kids.filter(k=>k.metaclasse==='Operation'), generaux:[], sous:[], dep:new Set(), depPar:new Set(), realise:[], requiert:[], realisePar:[], requisPar:[]};
    R.byId[c.id]=c; R.classes.push(c);
    if(p&&!R.pById[p.id]){ R.pById[p.id]={id:p.id, name:capUmlNom(p), classes:[], ce:new Set(), ca:new Set()}; R.paquetages.push(R.pById[p.id]); }
    if(p) R.pById[p.id].classes.push(c.id);
  });
  const cl=e=>{ for(let x=e, i=0; x&&i<8; x=E(x.proprietaire), i++) if(R.byId[x.id]) return R.byId[x.id]; return null; };
  lec.toutesLiaisons().forEach(x=>{
    if(/^(annotation|import|metadonnee|instance|comportement|represente|message|transition|flux|appel)$/.test(x.relation)) return;
    let a=cl(E(x.source)); const t=E(x.cible), b=t&&R.byId[t.id]?R.byId[t.id]:cl(t);
    if(x.relation==='typage'){ const s=E(x.source); a=s&&s.metaclasse!=='Class'?cl(E(s.proprietaire)):a; }
    if(!a||!b||a===b) return;
    a.dep.add(b.id); b.depPar.add(a.id);
    if(x.relation==='generalisation'){ if(!a.generaux.includes(b.id)) a.generaux.push(b.id); if(!b.sous.includes(a.id)) b.sous.push(a.id); }
    else if(/^realisation/.test(x.relation)&&b.meta==='Interface'){ a.realise.push(b.id); b.realisePar.push(a.id); }
    else if(x.relation==='utilisation'&&b.meta==='Interface'){ a.requiert.push(b.id); b.requisPar.push(a.id); }
    if(a.pkg&&b.pkg&&a.pkg!==b.pkg){ R.pById[a.pkg].ce.add(b.pkg); R.pById[b.pkg].ca.add(a.pkg); }
  });
  /** Composantes fortement connexes (Tarjan) de taille > 1 d'un graphe {id → voisins}. */
  const cycles=(ids, succ)=>{ let i=0; const idx={}, low={}, pile=[], dans=new Set(), out=[];
    const visite=v=>{ idx[v]=low[v]=i++; pile.push(v); dans.add(v);
      succ(v).forEach(w=>{ if(!(w in idx)){ visite(w); low[v]=Math.min(low[v],low[w]); } else if(dans.has(w)) low[v]=Math.min(low[v],idx[w]); });
      if(low[v]===idx[v]){ const comp=[]; let w; do{ w=pile.pop(); dans.delete(w); comp.push(w); }while(w!==v); if(comp.length>1) out.push(comp); } };
    ids.forEach(v=>{ if(!(v in idx)) visite(v); }); return out; };
  R.cyclesP=cycles(R.paquetages.map(p=>p.id), id=>[...R.pById[id].ce]);
  R.cyclesH=cycles(R.classes.map(c=>c.id), id=>R.byId[id].generaux);
  const enCycle=new Set(R.cyclesH.flat());
  const dit=(id,vus)=>{ const c=R.byId[id]; if(!c||vus.has(id)) return 0; vus.add(id); return c.generaux.length?1+Math.max(...c.generaux.map(g=>dit(g,new Set(vus)))):0; };
  R.classes.forEach(c=>{ c.dit=enCycle.has(c.id)?null:dit(c.id,new Set()); c.cbo=new Set([...c.dep,...c.depPar]).size; });
  R.paquetages.forEach(p=>{ const ce=p.ce.size, ca=p.ca.size, cs=p.classes.map(id=>R.byId[id]);
    p.I=ce+ca?ce/(ce+ca):0; p.A=cs.length?cs.filter(c=>c.abstrait).length/cs.length:0; p.D=Math.abs(p.A+p.I-1); });
  // Déploiement : nœuds (Node, Device, ExecutionEnvironment), artefacts et ce qu'ils manifestent
  const art={};
  els.forEach(e=>{ if(e.metaclasse==='Artifact') art[e.id]={id:e.id, name:capUmlNom(e), noeuds:[], manifeste:[]}; });
  els.forEach(e=>{ if(/^(Node|Device|ExecutionEnvironment)$/.test(e.metaclasse)) R.noeuds.push({id:e.id, name:capUmlNom(e), meta:e.metaclasse, artefacts:[]}); });
  const nById={}; R.noeuds.forEach(n=>{ nById[n.id]=n; });
  els.forEach(e=>{
    if(e.metaclasse==='Deployment'){ const n=nById[capUmlRef(e,'client')[0]]||nById[e.proprietaire];
      [...capUmlRef(e,'deployedArtifact'), ...capUmlRef(e,'supplier')].forEach(id=>{ const a=art[id]; if(n&&a&&!n.artefacts.includes(a)){ n.artefacts.push(a); a.noeuds.push({id:n.id, name:n.name}); } }); }
    else if(e.metaclasse==='Manifestation'){ const a=art[capUmlRef(e,'client')[0]]||art[e.proprietaire];
      [...new Set([...capUmlRef(e,'utilizedElement'), ...capUmlRef(e,'supplier')])].forEach(id=>{ const x=E(id); if(a&&x) a.manifeste.push({id:x.id, name:capUmlNom(x)}); }); }
  });
  R.artefacts=Object.values(art);
  R.classes.sort((a,b)=>capUmlTriNom(a.name,b.name)); R.paquetages.sort((a,b)=>capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlSoft=R;
}

/** Contrôles 🩺 du logiciel UML (vue 📦 Paquetages & classes ; 💚 Santé, 🩺 profil). @returns {object[]} Sections */
function capUmlSoftChecks(){
  const R=capUmlLogiciel(); if(!R.classes.length&&!R.noeuds.length&&!R.artefacts.length) return [];
  const fl=(id,n)=>capDetLink(id,n), nom=id=>(R.byId[id]||R.pById[id]||{}).name||'—';
  const crow=c=>`<tr><td>${fl(c.id,c.name)}</td><td class="ana-dim">${capEsc(nom(c.pkg))}</td></tr>`, ccols=[_L('Classe'),_L('Paquetage')];
  const itf=R.classes.filter(c=>c.meta==='Interface');
  const sec=[
    {icon:'↻', title:_L('Cycles de dépendances entre paquetages'), tip:_L('Paquetages qui dépendent les uns des autres en boucle : ils ne peuvent être livrés ni testés séparément'), cols:[_L('Paquetages du cycle')],
      items:R.cyclesP.map(cy=>`<tr><td>${cy.map(id=>fl(id,nom(id))).join(' ⇄ ')}</td></tr>`)},
    {icon:'↻', sev:'err', title:_L('Cycles d\'héritage'), tip:_L('Classes qui héritent les unes des autres en boucle (interdit en UML)'), cols:[_L('Classes du cycle')],
      items:R.cyclesH.map(cy=>`<tr><td>${cy.map(id=>fl(id,nom(id))).join(' ⇄ ')}</td></tr>`)},
    {icon:'⚠', title:_L('Interfaces requises que personne ne fournit'), tip:_L('Interface utilisée (Usage, interface requise) qu\'aucune classe ou composant ne réalise'), cols:[_L('Interface'),_L('Requise par')],
      items:itf.filter(c=>c.requisPar.length&&!c.realisePar.length).map(c=>`<tr><td>${fl(c.id,c.name)}</td><td>${c.requisPar.map(id=>fl(id,nom(id))).join(', ')}</td></tr>`)},
    {icon:'○', sev:'info', title:_L('Interfaces inutilisées'), tip:_L('Ni réalisée ni requise par aucune classe'), cols:ccols, items:itf.filter(c=>!c.requisPar.length&&!c.realisePar.length).map(crow)},
    {icon:'◇', sev:'info', title:_L('Classes abstraites sans sous-classe'), cols:ccols, items:R.classes.filter(c=>c.meta!=='Interface'&&c.abstrait&&!c.sous.length).map(crow)},
    {icon:'ƒ', title:_L('Opérations abstraites dans une classe concrète'), tip:_L('Classe non abstraite qui déclare une opération abstraite : elle ne peut pas être instanciée'), cols:[_L('Classe'),_L('Opérations')],
      items:R.classes.filter(c=>c.meta==='Class'&&!c.abstrait&&c.ops.some(o=>(o.modificateurs||[]).includes('abstract'))).map(c=>`<tr><td>${fl(c.id,c.name)}</td><td>${c.ops.filter(o=>(o.modificateurs||[]).includes('abstract')).map(o=>fl(o.id,capUmlNom(o))).join(', ')}</td></tr>`)},
    {icon:'⇣', sev:'info', title:_L('Héritage profond'), tip:_L(`Profondeur d'héritage supérieure à ${CAP_UML_DIT_MAX}`), cols:[_L('Classe'),_L('Profondeur')], items:R.classes.filter(c=>c.dit>CAP_UML_DIT_MAX).map(c=>`<tr><td>${fl(c.id,c.name)}</td><td>${c.dit}</td></tr>`)},
    {icon:'⛓', sev:'info', title:_L('Classes fortement couplées'), tip:_L(`Plus de ${CAP_UML_CBO_MAX} autres classes en dépendent ou en sont dépendantes`), cols:[_L('Classe'),_L('Couplage')], items:R.classes.filter(c=>c.cbo>CAP_UML_CBO_MAX).map(c=>`<tr><td>${fl(c.id,c.name)}</td><td>${c.cbo}</td></tr>`)}
  ];
  if(R.noeuds.length||R.artefacts.length){
    sec.push({icon:'📦', title:_L('Artefacts non déployés'), tip:_L('Artefact qu\'aucun Deployment ne place sur un nœud'), cols:[_L('Artefact')], items:R.artefacts.filter(a=>!a.noeuds.length).map(a=>`<tr><td>${fl(a.id,a.name)}</td></tr>`)});
    sec.push({icon:'🖧', sev:'info', title:_L('Nœuds sans artefact'), cols:[_L('Nœud'),'Type'], items:R.noeuds.filter(n=>!n.artefacts.length).map(n=>`<tr><td>${fl(n.id,n.name)}</td><td class="ana-dim">${capEsc(n.meta)}</td></tr>`)});
  }
  return sec;
}

/** Vue 📦 Paquetages & classes (sous-vue `umlsoft`) : paquetages (dépendances, métriques de Martin), classes (métriques), déploiement, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_uso`)
 */
function capRenderUmlLogiciel(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML : ouvrez un fichier .uml, .xmi, .mdzip ou .qea.')}</div>`; return; }
  const R=capUmlLogiciel();
  if(!R.classes.length&&!R.noeuds.length&&!R.artefacts.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucune classe, interface ou nœud UML sans stéréotype SysML dans ce modèle.')}</div>`; return; }
  const st=box._uso=box._uso||{view:R.paquetages.length?'pkg':'cls', q:''};
  const esc=capEsc, q=st.q.trim().toLowerCase(), fl=(id,n,s)=>capDetLink(id,n,s), nom=id=>(R.byId[id]||R.pById[id]||{}).name||'—';
  const f2=v=>v.toFixed(2), enCycleP=new Set(R.cyclesP.flat());
  let body='', cnt='';
  if(st.view==='pkg'){
    const L=R.paquetages.filter(p=>capXtHas(q,p.name)); cnt=`${L.length} / ${R.paquetages.length}`;
    body=`<p class="ana-help">${_L('Ca : paquetages qui en dépendent · Ce : paquetages dont il dépend · I = Ce / (Ca + Ce) : instabilité · A : part de classes abstraites et d\'interfaces · D = |A + I − 1| : distance à la séquence principale (près de 0 : équilibré). ↻ : paquetage pris dans un cycle.')}</p>`+
      capXtTable([_L('Paquetage'),_L('Classes'),'Ca','Ce','I','A','D',_L('Dépend de')], L.map(p=>[`${fl(p.id,p.name,'font-weight:600')}${enCycleP.has(p.id)?' <span style="color:var(--c-warn,#e3b341)" title="'+_L('Pris dans un cycle de dépendances')+'">↻</span>':''}`,
        String(p.classes.length), String(p.ca.size), String(p.ce.size), p.ca.size+p.ce.size?f2(p.I):'—', f2(p.A), p.ca.size+p.ce.size?`<span style="color:${p.D>0.7?'var(--c-warn,#e3b341)':'inherit'}">${f2(p.D)}</span>`:`<span class="ana-dim" title="${_L('Paquetage isolé : instabilité non définie')}">—</span>`, [...p.ce].map(id=>fl(id,nom(id))).join(', ')||'<span class="ana-dim">—</span>']));
  } else if(st.view==='cls'){
    const L=R.classes.filter(c=>capXtHas(q,c.name,nom(c.pkg))); cnt=`${L.length} / ${R.classes.length}`;
    body=`<p class="ana-help">${_L('DIT : profondeur d\'héritage · NOC : sous-classes directes · Couplage : classes distinctes dont elle dépend ou qui en dépendent.')}</p>`+
      capXtTable([_L('Classe'),_L('Nature'),_L('Paquetage'),_L('Attributs'),_L('Opérations'),'DIT','NOC',_L('Couplage'),_L('Hérite de'),_L('Réalise'),_L('Requiert')], L.map(c=>[fl(c.id,c.name,'font-weight:600'+(c.abstrait?';font-style:italic':'')),
        `<span class="ana-dim">${esc(c.meta)}${c.abstrait&&c.meta!=='Interface'?' · '+_L('abstraite'):''}</span>`, esc(nom(c.pkg)), String(c.attrs), String(c.ops.length), c.dit==null?'↻':String(c.dit), String(c.sous.length), String(c.cbo),
        c.generaux.map(id=>fl(id,nom(id))).join(', ')||'—', c.realise.map(id=>fl(id,nom(id))).join(', ')||'—', c.requiert.map(id=>fl(id,nom(id))).join(', ')||'—']));
  } else if(st.view==='dep'){
    body=(R.noeuds.length||R.artefacts.length)?capXtTable([_L('Nœud'),'Type',_L('Artefacts déployés'),_L('Éléments manifestés')], [
        ...R.noeuds.map(n=>[fl(n.id,n.name,'font-weight:600'), `<span class="ana-dim">${esc(n.meta)}</span>`, n.artefacts.map(a=>fl(a.id,a.name)).join('<br>')||'<span class="ana-dim">—</span>', n.artefacts.map(a=>a.manifeste.map(x=>fl(x.id,x.name)).join(', ')||'—').join('<br>')||'—']),
        ...R.artefacts.filter(a=>!a.noeuds.length).map(a=>[`<span class="ana-miss">${_L('(non déployé)')}</span>`, '', fl(a.id,a.name), a.manifeste.map(x=>fl(x.id,x.name)).join(', ')||'—'])])
      :`<div class="phl-empty">${_L('Aucun nœud ni artefact (diagramme de déploiement) dans ce modèle.')}</div>`;
  } else body=capDiagHtml(capUmlSoftChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['pkg',_L('📦 Paquetages')],['cls',_L('🧮 Classes')],['dep',_L('🖧 Déploiement')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view==='pkg'||st.view==='cls'?`<span class="tsep"></span>${capXtSearch(st.q,_L('Nom, paquetage…'))}`:''), cnt, st.view==='pkg'||st.view==='cls')+body;
  capXtBind(box, st, capRenderUmlLogiciel, ()=>{
    if(st.view==='pkg') capCsvExport(_L('paquetages.csv'),[_L('Paquetage'),_L('Classes'),'Ca','Ce','I','A','D',_L('Dépend de')], R.paquetages.map(p=>[capCx(p.name,p.id), p.classes.length, p.ca.size, p.ce.size, f2(p.I), f2(p.A), f2(p.D), [...p.ce].map(nom).join(', ')]));
    else capCsvExport(_L('classes.csv'),[_L('Classe'),_L('Nature'),_L('Paquetage'),_L('Attributs'),_L('Opérations'),'DIT','NOC',_L('Couplage')], R.classes.map(c=>[capCx(c.name,c.id), c.meta+(c.abstrait?' abstract':''), nom(c.pkg), c.attrs, c.ops.length, c.dit??'', c.sous.length, c.cbo]));
  });
}

/** Indicateurs 🔒 et 📦 du 📐 tableau de bord (vides hors UML / SysML v1) ; appelée par `capUmlDashCatalog` (88).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlPlDashCatalog(add){
  const G=_L('UML / SysML v1'), P=()=>capUmlParametrique(), S=()=>capUmlLogiciel();
  add(G,'uml.par.n',_L('UML / SysML v1 — blocs de contrainte'),'n',()=>({n:P().blocs.length, sub:_L(`${P().usages.length} usage(s) · ${P().contraintes.length} contrainte(s)`)}));
  add(G,'uml.par.chk',_L('UML / SysML v1 — contrôles de la paramétrique et des contraintes'),'series',()=>({cats:capUmlParChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
  add(G,'uml.soft.n',_L('UML / SysML v1 — classes et interfaces UML'),'n',()=>({n:S().classes.length, sub:_L(`${S().paquetages.length} paquetage(s) · ${S().cyclesP.length} cycle(s)`)}));
  add(G,'uml.soft.chk',_L('UML / SysML v1 — contrôles des paquetages et classes'),'series',()=>({cats:capUmlSoftChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}
