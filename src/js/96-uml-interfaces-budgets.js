/* ═══════════════════════════════════════════════════════════════════════════
   🗃 Interfaces (ICD) et ⚖ Budgets d'un modèle UML / SysML v1 (sous-vues `umlicd` de la famille 🧬 UML / SysML v1 et
   `umlbudget` de ✅ Vérifier), pour une lecture du lecteur UML d'Arcature (88) :
   - `capUmlInterfaces` : interfaces = types des ports (InterfaceBlock, Interface, classes stéréotypées par un profil) avec
     leurs FlowProperty (sens, type), opérations, ports qui les utilisent (bloc, conjugaison) ; ICD = une ligne par connecteur
     entre ports (structure de 92) : bloc ⬦ port, interface, flux, objets transportés par les ItemFlow ; contrôles : interfaces
     inutilisées ou vides, FlowProperty sans type, connecteurs entre interfaces différentes, objets transportés absents de
     l'interface du port.
   - `capUmlBudgets` : grandeurs numériques portées par les blocs (valeur par défaut d'une ValueProperty : masse, puissance,
     coût…), regroupées par nom ; **cumul** sur l'arbre des parts (multiplicités comprises), **limite** lue dans une valeur du
     même nom suffixée max / limite / budget (massMax, mass_limit…), marge ; contrôles : dépassements, feuilles sans valeur,
     unités différentes, valeur propre qui s'écarte de la somme des parts, multiplicités indéterminées. Bilan statique : ni
     simulation, ni paramétrique.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. 🗃 Interfaces (ICD) ─────────────────────────────────────── */

/** Interfaces (types des ports) et lignes d'ICD de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{list:object[], byId:object, icd:object[]}} Interfaces
 */
function capUmlInterfaces(){
  if(_capAnaCache.umlIcd) return _capAnaCache.umlIcd;
  const R={list:[], byId:{}, icd:[]};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlIcd=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null, S=capUmlStructure();
  /** Fiche d'une interface (créée au premier appel). */
  const itf=e=>{ let o=R.byId[e.id]; if(o) return o;
    const flux=[], ops=[], vus=new Set();
    const lire=t=>{ if(!t||vus.has(t.id)) return; vus.add(t.id);
      (t.enfants||[]).map(E).forEach(c=>{ if(!c) return;
        if(c.type==='FlowProperty'||(c.stereotypes||[]).includes('FlowProperty')){ const ty=E(capUmlRef(c,'type')[0]); flux.push({id:c.id, name:c.nom||(ty?capUmlNom(ty):'—'), dir:String(c.direction||'inout').toLowerCase(), type:ty?{id:ty.id, name:capUmlNom(ty)}:null}); }
        else if(c.metaclasse==='Operation') ops.push({id:c.id, name:capUmlNom(c)}); });
      capUmlRef(t,'general').forEach(g=>lire(E(g))); (t.enfants||[]).map(E).forEach(c=>{ if(c&&c.metaclasse==='Generalization') capUmlRef(c,'general').forEach(g=>lire(E(g))); }); };
    lire(e);
    o={id:e.id, name:capUmlNom(e), type:e.type, flux, ops, ports:[], liens:0, generaux:[...vus]};
    R.byId[e.id]=o; R.list.push(o); return o; };
  els.forEach(e=>{ if(e.metaclasse==='Interface'||e.type==='InterfaceBlock'||(e.stereotypes||[]).includes('InterfaceBlock')) itf(e); });
  Object.values(S.ports).forEach(p=>{ if(!p.typeId) return; const t=E(p.typeId); if(!t||!/^(Class|Interface|DataType|Signal)$/.test(t.metaclasse)) return;
    const o=itf(t), b=S.byId[p.owner]; o.ports.push({id:p.id, name:p.name, conj:p.conj, orient:p.orient, bloc:b?{id:b.id, name:b.name}:null}); });
  const itfDe=pid=>{ const p=S.ports[pid]; return p&&p.typeId?R.byId[p.typeId]||null:null; };
  S.links.forEach(l=>{
    if(!l.src.portId&&!l.tgt.portId) return;
    const a=itfDe(l.src.portId), b=itfDe(l.tgt.portId);
    if(a) a.liens++; if(b&&b!==a) b.liens++;
    const compat=!a||!b||a===b||a.generaux.includes(b.id)||b.generaux.includes(a.id);
    // objets transportés absents des FlowProperty de l'interface (quand elle en déclare)
    const types=new Set([...(a?a.flux:[]), ...(b?b.flux:[])].map(f=>f.type&&f.type.id).filter(Boolean));
    const hors=types.size?l.items.filter(i=>i.id&&!types.has(i.id)):[];
    R.icd.push({l, a, b, compat, hors});
  });
  R.list.sort((x,y)=>capUmlTriNom(x.name,y.name));
  return _capAnaCache.umlIcd=R;
}

/** Contrôles 🩺 des interfaces (vue 🗃 Interfaces ; 💚 Santé, 🩺 profil, tableau de bord). @returns {object[]} Sections */
function capUmlIcdChecks(){
  const R=capUmlInterfaces(); if(!R.list.length) return [];
  const fl=(id,n)=>capDetLink(id,n), irow=i=>`<tr><td>${fl(i.id,i.name)}</td><td class="ana-dim">${capEsc(i.type)}</td></tr>`, icols=[_L('Interface'),'Type'];
  const ext=x=>x?`${fl(x.id,x.name)}`:'—', lrow=d=>`<tr><td>${fl(d.l.id,d.l.name)}</td><td>${fl(d.l.src.id,d.l.src.name)} ⬦ ${capEsc(d.l.src.portName)} : ${ext(d.a)}</td><td>${fl(d.l.tgt.id,d.l.tgt.name)} ⬦ ${capEsc(d.l.tgt.portName)} : ${ext(d.b)}</td></tr>`;
  const lcols=[_L('Connecteur'),_L('Extrémité 1 : interface'),_L('Extrémité 2 : interface')];
  return [
    {icon:'∅', title:_L('Interfaces inutilisées'), tip:_L('InterfaceBlock ou Interface ne typant aucun port'), cols:icols, items:R.list.filter(i=>!i.ports.length).map(irow)},
    {icon:'○', sev:'info', title:_L('Interfaces vides'), tip:_L('Ni FlowProperty ni opération (généralisations comprises) : l\'interface ne dit pas ce qui passe'), cols:icols, items:R.list.filter(i=>!i.flux.length&&!i.ops.length).map(irow)},
    {icon:'?', sev:'info', title:_L('FlowProperty sans type'), cols:[_L('Interface'),_L('FlowProperty'),_L('Sens')],
      items:R.list.flatMap(i=>i.flux.filter(f=>!f.type).map(f=>`<tr><td>${fl(i.id,i.name)}</td><td>${fl(f.id,f.name)}</td><td>${capEsc(f.dir)}</td></tr>`))},
    {icon:'≠', title:_L('Connecteurs entre interfaces différentes'), tip:_L('Les deux ports sont typés par des interfaces différentes, sans généralisation entre elles'), cols:lcols, items:R.icd.filter(d=>!d.compat).map(lrow)},
    {icon:'▤', title:_L('Objets transportés absents de l\'interface'), tip:_L('Un ItemFlow du connecteur transporte un objet qui n\'est le type d\'aucune FlowProperty des interfaces de ses ports'), cols:[...lcols,_L('Objets')],
      items:R.icd.filter(d=>d.hors.length).map(d=>lrow(d).replace('</tr>',`<td>${d.hors.map(i=>fl(i.id,i.name)).join(', ')}</td></tr>`))}
  ];
}

/** Libellé du sens d'une FlowProperty. @param {string} d - in / out / inout @returns {string} */
function capUmlSensFlux(d){ return d==='in'?_L('▶ entrée'):d==='out'?_L('sortie ▶'):_L('⇄ entrée / sortie'); }

/** Vue 🗃 Interfaces (sous-vue `umlicd`) : interfaces, ICD (une ligne par connecteur entre ports), contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_uic`)
 */
function capRenderUmlInterfaces(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : 🏗 Architecture › 🗃 Données & interfaces).')}</div>`; return; }
  const R=capUmlInterfaces();
  if(!R.list.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucune interface (type de port, InterfaceBlock, Interface) dans ce modèle.')}</div>`; return; }
  const st=box._uic=box._uic||{view:'list', q:''};
  const esc=capEsc, q=st.q.trim().toLowerCase(), fl=(id,n,s)=>capDetLink(id,n,s);
  let body='', cnt='';
  if(st.view==='list'){
    const L=R.list.filter(i=>capXtHas(q,i.name,i.type,...i.flux.map(f=>f.name+' '+(f.type?f.type.name:'')))); cnt=`${L.length} / ${R.list.length}`;
    body=`<p class="ana-help">${_L(`${R.list.length} interface(s), typant ${R.list.reduce((s,i)=>s+i.ports.length,0)} port(s). FlowProperty : ▶ entrée, sortie ▶, ⇄ les deux (vu de l'interface ; un port conjugué inverse le sens).`)}</p>`+
      capXtTable([_L('Interface'),'Type',_L('Flux (FlowProperty)'),_L('Opérations'),_L('Ports'),_L('Blocs'),_L('Connecteurs')], L.map(i=>[fl(i.id,i.name,'font-weight:600'), `<span class="ana-dim">${esc(i.type)}</span>`,
        i.flux.length?i.flux.map(f=>`<div>${esc(capUmlSensFlux(f.dir))} ${fl(f.id,f.name)}${f.type&&f.type.name!==f.name?` <span class="ana-dim">: ${esc(f.type.name)}</span>`:''}</div>`).join(''):'<span class="ana-dim">—</span>',
        i.ops.length?capFoldList(i.ops.map(o=>fl(o.id,o.name))):'<span class="ana-dim">—</span>', String(i.ports.length),
        capFoldList([...new Map(i.ports.filter(p=>p.bloc).map(p=>[p.bloc.id,p.bloc])).values()].map(b=>fl(b.id,b.name)))||'<span class="ana-dim">—</span>', String(i.liens)]));
  } else if(st.view==='icd'){
    const L=R.icd.filter(d=>capXtHas(q,d.l.name,d.l.src.name,d.l.tgt.name,d.a&&d.a.name,d.b&&d.b.name,...d.l.items.map(i=>i.name))); cnt=`${L.length} / ${R.icd.length}`;
    const bout=(x,i)=>`${fl(x.id,x.name,'font-weight:600')} ⬦ ${esc(x.portName||'—')}${x.orient?` <span class="ana-dim">${esc(x.orient)}</span>`:''}${i?`<div class="ana-dim">${fl(i.id,i.name)}</div>`:''}`;
    body=`<p class="ana-help">${_L('Une ligne par connecteur entre ports (contexte : bloc propriétaire du connecteur). ⚠ : interfaces différentes ou objet transporté absent de l\'interface.')}</p>`+
      capXtTable([_L('Contexte'),_L('Source ⬦ port : interface'),_L('Connecteur'),_L('Cible ⬦ port : interface'),_L('Objets transportés'),''], L.map(d=>[d.l.grp?fl(d.l.grp,d.l.ctxName):'—', bout(d.l.src,d.a),
        `${fl(d.l.id,d.l.name)} <span class="ana-dim">${d.l.dir==='fwd'?'→':d.l.dir==='rev'?'←':d.l.dir==='bi'?'⇄':'—'}${d.l.deleg?' · '+esc(_L('délégation')):''}</span>`, bout(d.l.tgt,d.b),
        d.l.items.length?capFoldList(d.l.items.map(i=>i.id?fl(i.id,i.name):esc(i.name))):'<span class="ana-dim">—</span>',
        !d.compat||d.hors.length?`<span style="color:var(--c-warn,#e3b341)" title="${esc([!d.compat?_L('Interfaces différentes'):'', d.hors.length?_L('Objet absent de l\'interface'):''].filter(Boolean).join(' · '))}">⚠</span>`:'']));
  } else body=capDiagHtml(capUmlIcdChecks());
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Interfaces')],['icd',_L('▤ ICD')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${capXtSearch(st.q,st.view==='icd'?_L('Bloc, port, interface, objet…'):_L('Interface, flux, type…'))}`:''), cnt, st.view!=='diag')+body;
  capXtBind(box, st, capRenderUmlInterfaces, ()=>{
    if(st.view==='icd') capCsvExport(_L('icd.csv'),[_L('Contexte'),_L('Bloc source'),_L('Port source'),_L('Interface source'),_L('Connecteur'),_L('Bloc cible'),_L('Port cible'),_L('Interface cible'),_L('Objets transportés')],
      R.icd.map(d=>[capCx(d.l.ctxName,d.l.grp), capCx(d.l.src.name,d.l.src.id), capCx(d.l.src.portName,d.l.src.portId), d.a?capCx(d.a.name,d.a.id):'', capCx(d.l.name,d.l.id), capCx(d.l.tgt.name,d.l.tgt.id), capCx(d.l.tgt.portName,d.l.tgt.portId), d.b?capCx(d.b.name,d.b.id):'', capCxList(d.l.items.filter(i=>i.id))]));
    else capCsvExport(_L('interfaces.csv'),[_L('Interface'),'Type',_L('Flux (FlowProperty)'),_L('Opérations'),_L('Ports'),_L('Connecteurs')],
      R.list.map(i=>[capCx(i.name,i.id), i.type, i.flux.map(f=>f.dir+' '+f.name+(f.type?' : '+f.type.name:'')).join(' ; '), capCxList(i.ops), i.ports.length, i.liens]));
  });
}

/* ── 2. ⚖ Budgets ─────────────────────────────────────────────── */

/** Motif des suffixes ou préfixes d'une valeur limite (massMax, mass_limit, maxMass, budgetPower…). */
var CAP_UML_LIMITE=/(^|[\s_.-])(max|maxi|maximum|limit|limite|budget|alloue|allou[ée]e?|allocated|requis|required)([\s_.-]|$)|max$|^max|limit$|budget$|^budget/i;

/** Clé d'une grandeur d'après le nom d'une valeur : minuscules, sans unité entre crochets ni suffixe de limite (« Mass [kg] », « massMax » → « mass »).
 * @param {string} nom - Nom de la ValueProperty @returns {{cle:string, limite:boolean}} */
function capUmlGrandeur(nom){
  let n=String(nom||'').replace(/\[[^\]]*\]|\([^)]*\)/g,'').trim();
  const limite=CAP_UML_LIMITE.test(n.replace(/([a-z])([A-Z])/g,'$1_$2'));
  n=n.replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase().replace(/(^|[\s_.-])(max|maxi|maximum|limit|limite|budget|alloue|allouee?|allocated|requis|required)(?=[\s_.-]|$)/g,'$1').replace(/[\s_.-]+/g,' ').trim();
  return {cle:n, limite};
}

/** Nombre écrit dans une valeur par défaut, ou null. @param {*} v - Valeur @returns {?number} */
function capUmlNombre(v){ const s=String(v==null?'':v).trim().replace(',', '.'); return /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(s)?parseFloat(s):null; }

/** Multiplicité d'une part : borne haute numérique (« 4 », « 1..4 » → 4) ; « * » → borne basse, marquée indéterminée.
 * @param {string} m - Multiplicité écrite @returns {{n:number, flou:boolean}} */
function capUmlMultiplicite(m){
  const s=String(m||'').trim(); if(!s) return {n:1, flou:false};
  const p=s.split('..'), hi=p[p.length-1].trim(), lo=p[0].trim();
  if(hi==='*'){ const n=parseInt(lo,10); return {n:isNaN(n)||n<1?1:n, flou:true}; }
  const n=parseInt(hi,10); return {n:isNaN(n)?1:n, flou:false};
}

/** Grandeurs et valeurs numériques des blocs de la lecture UML / SysML v1 affichée (mis en cache) ; une grandeur n'est gardée que si plusieurs blocs la portent ou qu'une limite la borne.
 * @returns {{grandeurs:object[], parCle:object, valeurs:object}} Budgets : valeurs[bloc][clé] = {val, unite, id, limite?}
 */
function capUmlBudgets(){
  if(_capAnaCache.umlBud) return _capAnaCache.umlBud;
  const R={grandeurs:[], parCle:{}, valeurs:{}};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlBud=R;
  const E=id=>id?lec.element(id):null, S=capUmlStructure();
  /** Unité d'une valeur : propriété « unit » de son ValueType, unité entre crochets du type ou du nom, ou nom court du type. */
  const unite=(p)=>{ const t=E(capUmlRef(p,'type')[0]);
    if(t){ const u=capUmlAttr(lec, t.id, 'ValueType.unit')||capUmlAttr(lec, t.id, 'unit'); if(u){ const ue=E(u); return ue?capUmlNom(ue):u; }
      const m=capUmlNom(t).match(/\[([^\]]+)\]/); if(m) return m[1].trim();
      if(/^[A-Za-zµ°%/²³·.^0-9]{1,8}$/.test(capUmlNom(t))&&!/^(Real|Integer|String|Boolean|Number|float|int|double|long)$/i.test(capUmlNom(t))) return capUmlNom(t); }
    const m=String(p.nom||'').match(/\[([^\]]+)\]/); return m?m[1].trim():''; };
  S.nodes.forEach(n=>{ const e=E(n.id); if(!e) return;
    (e.enfants||[]).map(E).forEach(p=>{
      if(!p||p.metaclasse!=='Property'||p.type==='FlowProperty'||p.type==='PartProperty'||(p.stereotypes||[]).includes('FlowProperty')) return;
      const v=capUmlNombre(p.valeur); if(v==null) return;
      const g=capUmlGrandeur(p.nom); if(!g.cle) return;
      const V=R.valeurs[n.id]=R.valeurs[n.id]||{}, u=unite(p);
      if(g.limite){ (V['#'+g.cle]=V['#'+g.cle]||{val:v, unite:u, id:p.id}); }
      else if(!V[g.cle]) V[g.cle]={val:v, unite:u, id:p.id, nom:p.nom};
      let G=R.parCle[g.cle]; if(!G){ G=R.parCle[g.cle]={cle:g.cle, nom:g.limite?g.cle:p.nom.replace(/\s*\[[^\]]*\]/,''), blocs:new Set(), unites:new Set(), limites:0}; R.grandeurs.push(G); }
      if(g.limite) G.limites++; else { G.blocs.add(n.id); if(u) G.unites.add(u); if(G.nom===G.cle) G.nom=p.nom.replace(/\s*\[[^\]]*\]/,''); }
    }); });
  R.grandeurs=R.grandeurs.filter(G=>G.blocs.size>1||G.limites);   // une grandeur à cumuler : portée par plusieurs blocs, ou bornée par une limite (une consigne isolée n'est pas un budget)
  R.grandeurs.sort((a,b)=>b.blocs.size-a.blocs.size||a.cle.localeCompare(b.cle));
  return _capAnaCache.umlBud=R;
}

/** Arbre de budget d'une grandeur à partir d'un bloc : valeur propre, cumul des parts (× multiplicités), total retenu, limite, marge ; branches sans valeur élaguées.
 * @param {string} cle - Grandeur @param {string} racine - Bloc de départ
 * @returns {object} Nœud {id, name, part, mult, flou, propre, unite, cumul, total, limite, marge, enfants, sansValeur}
 */
function capUmlBudgetArbre(cle, racine){
  const S=capUmlStructure(), B=capUmlBudgets();
  const noeud=(id, part, mult, flou, pile)=>{
    const n=S.byId[id], V=B.valeurs[id]||{}, propre=V[cle]?V[cle].val:null, lim=V['#'+cle]?V['#'+cle].val:null;
    const o={id, name:n?n.name:'—', part, mult, flou, propre, unite:V[cle]?V[cle].unite:'', enfants:[], limite:lim, cycle:pile.has(id)};
    if(n&&!o.cycle){ const p2=new Set(pile).add(id);
      n.parts.forEach(p=>{ const m=capUmlMultiplicite((capUmlLec().element(p.id)||{}).multiplicite); o.enfants.push(noeud(p.type, p, m.n, m.flou, p2)); }); }
    const avec=o.enfants.filter(c=>c.total!=null);
    o.cumul=avec.length?avec.reduce((s,c)=>s+c.total*c.mult,0):null;
    o.total=o.cumul!=null?o.cumul:propre;
    o.sansValeur=!o.enfants.length&&propre==null;
    o.marge=o.limite!=null&&o.total!=null?o.limite-o.total:null;
    return o; };
  /** Garde les branches qui portent une valeur, et les feuilles sans valeur dont un voisin en porte une (oubli probable). */
  const elaguer=o=>{ const garde=o.enfants.some(c=>c.total!=null); o.enfants=o.enfants.filter(c=>c.total!=null||(c.sansValeur&&garde)); o.enfants.forEach(elaguer); return o; };
  return elaguer(noeud(racine, null, 1, false, new Set()));
}

/** Racines proposées pour une grandeur : blocs dont l'arbre contient la grandeur et qui ne sont la part d'aucun autre bloc qui la contient.
 * @param {string} cle - Grandeur @returns {object[]} Blocs {id, name} */
function capUmlBudgetRacines(cle){
  const S=capUmlStructure(), G=capUmlBudgets().parCle[cle]; if(!G) return [];
  const contient={}, vu=(id,pile)=>{ if(id in contient) return contient[id]; if(pile.has(id)) return false; const n=S.byId[id]; if(!n) return false; pile.add(id);
    return contient[id]=G.blocs.has(id)||n.parts.some(p=>vu(p.type,pile)); };
  S.nodes.forEach(n=>vu(n.id,new Set()));
  const parts=new Set(S.nodes.filter(n=>contient[n.id]).flatMap(n=>n.parts.map(p=>p.type)));
  return S.nodes.filter(n=>contient[n.id]&&!parts.has(n.id)&&(n.parts.length||G.blocs.has(n.id))).map(n=>({id:n.id, name:n.name}));
}

/** Contrôles 🩺 des budgets, toutes grandeurs et racines confondues (vue ⚖ Budgets ; 💚 Santé, 🩺 profil). @returns {object[]} Sections */
function capUmlBudgetChecks(){
  const B=capUmlBudgets(); if(!B.grandeurs.length) return [];
  const fl=(id,n)=>capDetLink(id,n), fmt=v=>v==null?'—':(Math.round(v*1000)/1000).toLocaleString('fr-FR');
  const dep=[], feuilles=new Map(), ecarts=new Map(), flous=new Map();
  B.grandeurs.forEach(G=>capUmlBudgetRacines(G.cle).forEach(r=>{
    const parcours=o=>{ if(o.marge!=null&&o.marge<0) dep.push({G,o});
      if(o.sansValeur) feuilles.set(G.cle+'|'+o.id,{G,o});
      if(o.propre!=null&&o.cumul!=null&&Math.abs(o.propre-o.cumul)>0.01*Math.max(Math.abs(o.propre),Math.abs(o.cumul))) ecarts.set(G.cle+'|'+o.id,{G,o});
      if(o.flou&&o.part) flous.set(o.part.id,{G,o});
      o.enfants.forEach(parcours); };
    parcours(capUmlBudgetArbre(G.cle, r.id)); }));
  const g=G=>capEsc(G.nom);
  return [
    {icon:'⛔', sev:'err', title:_L('Budgets dépassés'), tip:_L('Le total (cumul des parts) dépasse la limite déclarée sur le bloc (valeur …Max, …Limit, budget…)'), cols:[_L('Grandeur'),_L('Bloc'),_L('Total'),_L('Limite'),_L('Dépassement')],
      items:dep.map(({G,o})=>`<tr><td>${g(G)}</td><td>${fl(o.id,o.name)}</td><td>${fmt(o.total)}</td><td>${fmt(o.limite)}</td><td>${fmt(-o.marge)}</td></tr>`)},
    {icon:'∅', title:_L('Blocs feuilles sans valeur'), tip:_L('Bloc sans part qui ne porte pas la grandeur alors qu\'un bloc voisin (même bloc parent) la porte : le cumul l\'ignore'), cols:[_L('Grandeur'),_L('Bloc')],
      items:[...feuilles.values()].map(({G,o})=>`<tr><td>${g(G)}</td><td>${fl(o.id,o.name)}</td></tr>`)},
    {icon:'≠', title:_L('Unités différentes pour une grandeur'), tip:_L('Les valeurs d\'une même grandeur n\'ont pas toutes la même unité : le cumul additionne des nombres incompatibles'), cols:[_L('Grandeur'),_L('Unités')],
      items:B.grandeurs.filter(G=>G.unites.size>1).map(G=>`<tr><td>${g(G)}</td><td>${capEsc([...G.unites].join(', '))}</td></tr>`)},
    {icon:'Σ', sev:'info', title:_L('Valeur propre différente de la somme des parts'), tip:_L('Bloc composite qui porte sa propre valeur, à plus de 1 % du cumul de ses parts (c\'est le cumul qui est retenu)'), cols:[_L('Grandeur'),_L('Bloc'),_L('Valeur propre'),_L('Cumul des parts')],
      items:[...ecarts.values()].map(({G,o})=>`<tr><td>${g(G)}</td><td>${fl(o.id,o.name)}</td><td>${fmt(o.propre)}</td><td>${fmt(o.cumul)}</td></tr>`)},
    {icon:'*', sev:'info', title:_L('Multiplicités indéterminées'), tip:_L('Part de multiplicité « * » : comptée pour sa borne basse'), cols:[_L('Part'),_L('Bloc'),_L('Compté')],
      items:[...flous.values()].map(({o})=>`<tr><td>${fl(o.part.id,o.part.name)}</td><td>${fl(o.id,o.name)}</td><td>× ${o.mult}</td></tr>`)}
  ];
}

/** Vue ⚖ Budgets (sous-vue `umlbudget`) : grandeurs, arbre de cumul d'une grandeur depuis un bloc, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_ubu`)
 */
function capRenderUmlBudgets(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea.')}</div>`; return; }
  const B=capUmlBudgets();
  if(!B.grandeurs.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucune valeur numérique (valeur par défaut d\'une ValueProperty : masse, puissance, coût…) sur les blocs de ce modèle.')}</div>`; return; }
  const st=box._ubu=box._ubu||{view:'tree', g:'', r:''};
  if(!B.parCle[st.g]) st.g=B.grandeurs[0].cle;
  const racines=capUmlBudgetRacines(st.g); if(!racines.some(r=>r.id===st.r)) st.r=racines[0]?racines[0].id:'';
  const esc=capEsc, fl=(id,n,s)=>capDetLink(id,n,s), fmt=v=>v==null?'<span class="ana-dim">—</span>':(Math.round(v*1000)/1000).toLocaleString(CAP_LANG==='en'?'en-GB':'fr-FR');
  const G=B.parCle[st.g], unite=[...G.unites].join(' / ');
  let body='';
  if(st.view==='tree'&&st.r){
    const A=capUmlBudgetArbre(st.g, st.r), lignes=[], tot=A.total||0;
    const par=(o,d)=>{ lignes.push([`<span style="padding-left:${d*16}px">${d?'└ ':''}${o.part?`<span class="ana-dim">${esc(o.part.name)} :</span> `:''}${fl(o.id,o.name,d?'':'font-weight:700')}</span>`,
      o.mult!==1||o.flou?`× ${o.mult}${o.flou?' *':''}`:'', fmt(o.propre), fmt(o.cumul), `<b>${fmt(o.total)}</b>`,
      o.total!=null&&tot?`<span style="display:inline-block;width:60px;height:7px;background:var(--c-bg3);border-radius:4px;vertical-align:middle"><span style="display:block;height:7px;width:${Math.min(100,Math.round(100*o.total*(o.mult||1)/tot))}%;background:var(--c-accent);border-radius:4px"></span></span>`:'',
      esc(o.unite||''), fmt(o.limite), o.marge==null?'':`<span style="color:${o.marge<0?'var(--c-err,#f85149)':'var(--c-ok,#3fb950)'};font-weight:600">${o.marge<0?'⛔ ':''}${fmt(o.marge)} (${o.limite?Math.round(100*o.marge/o.limite):0} %)</span>`,
      o.sansValeur?`<span style="color:var(--c-warn,#e3b341)">${_L('sans valeur')}</span>`:o.cycle?'↻':'']);
      o.enfants.forEach(c=>par(c,d+1)); };
    par(A,0);
    body=`<p class="ana-help">${_L(`Grandeur « ${esc(G.nom)} »${unite?` (${esc(unite)})`:''} : total = somme des parts × multiplicités, sinon valeur propre. Limite : valeur du même nom suffixée Max, Limit, budget… Bilan statique sur les valeurs par défaut du modèle.`)}</p>`+
      capXtTable([_L('Bloc / part'),_L('Mult.'),_L('Valeur propre'),_L('Cumul des parts'),_L('Total'),_L('Part du total'),_L('Unité'),_L('Limite'),_L('Marge'),''], lignes);
  } else if(st.view==='list'){
    body=capXtTable([_L('Grandeur'),_L('Blocs qui la portent'),_L('Unités'),_L('Limites'),_L('Racines')], B.grandeurs.map(g=>[`<span class="fex-att-go" data-g="${esc(g.cle)}" style="font-weight:600">${esc(g.nom)}</span>`,
      String(g.blocs.size), esc([...g.unites].join(', '))||'<span class="ana-dim">—</span>', String(g.limites), capUmlBudgetRacines(g.cle).map(r=>esc(r.name)).join(', ')]));
  } else if(st.view==='diag') body=capDiagHtml(capUmlBudgetChecks());
  else body=`<div class="phl-empty">${_L('Aucun bloc racine pour cette grandeur.')}</div>`;
  const sels=st.view==='tree'?`${capXtSelect('g', B.grandeurs.map(g=>[g.cle, g.nom+' ('+g.blocs.size+')']), st.g)}${capXtSelect('r', racines.map(r=>[r.id, r.name]), st.r)}`:'';
  box.innerHTML=capXtBar(capXtViewBtns([['tree',_L('🌳 Cumul')],['list',_L('📋 Grandeurs')],['diag',_L('🩺 Contrôles')]],st.view)+(sels?`<span class="tsep"></span>${sels}`:''), '', st.view==='tree')+body;
  box.querySelectorAll('[data-g]').forEach(a=>a.onclick=()=>{ st.g=a.dataset.g; st.r=''; st.view='tree'; capRenderUmlBudgets(box); });
  capXtBind(box, st, b=>{ if(st.g!==G.cle) st.r=''; capRenderUmlBudgets(b); }, ()=>{
    const A=capUmlBudgetArbre(st.g, st.r), rows=[], par=(o,d)=>{ rows.push([d, o.part?capCx(o.part.name,o.part.id):'', capCx(o.name,o.id), o.mult, o.propre??'', o.cumul??'', o.total??'', o.unite, o.limite??'', o.marge??'']); o.enfants.forEach(c=>par(c,d+1)); };
    par(A,0); capCsvExport(_L('budget.csv'),[_L('Niveau'),_L('Part'),_L('Bloc'),_L('Mult.'),_L('Valeur propre'),_L('Cumul des parts'),_L('Total'),_L('Unité'),_L('Limite'),_L('Marge')], rows);
  });
}

/** Indicateurs 🗃 et ⚖ du 📐 tableau de bord (vides hors UML / SysML v1) ; appelée par `capUmlDashCatalog` (88).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlIbDashCatalog(add){
  const G=_L('UML / SysML v1'), I=()=>capUmlInterfaces(), B=()=>capUmlBudgets();
  add(G,'uml.icd.n',_L('UML / SysML v1 — interfaces'),'n',()=>({n:I().list.length, sub:_L(`${I().icd.length} connecteur(s) entre ports`)}));
  add(G,'uml.icd.chk',_L('UML / SysML v1 — contrôles des interfaces'),'series',()=>({cats:capUmlIcdChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
  add(G,'uml.bud.n',_L('UML / SysML v1 — grandeurs de budget'),'n',()=>({n:B().grandeurs.length, sub:B().grandeurs.slice(0,3).map(g=>g.nom).join(', ')}));
  add(G,'uml.bud.chk',_L('UML / SysML v1 — contrôles des budgets'),'series',()=>({cats:capUmlBudgetChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}
