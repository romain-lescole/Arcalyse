/* ═══════════════════════════════════════════════════════════════════════════
   🚦 Machines à états et 🎬 Interactions d'un modèle UML / SysML v1 (sous-vues `umlstm` / `umlseq` de 🔬 Analyses, famille
   🧬 UML / SysML v1 de 🏗 Architecture) : les équivalents de 🚦 Modes & états (32) et de 🎬 Scénarios (49) pour une lecture du
   lecteur UML d'Arcature (88). Ces vues donnent les tableaux, la matrice, les contrôles et un « 🖼 Diagramme calculé » recalculé à
   partir du seul modèle (module 98, comme les 🎬 Scénarios Capella) ; le bouton 🔲 ouvre le diagramme du fichier quand il existe :
   - `capUmlEtats` : machines (bloc dont elles sont le comportement), états (simples, composites, finaux, pseudo-états et leur
     nature), comportements des états, transitions (déclencheurs : signal, appel, temps, changement ; garde ; effet), signaux émis
     dans le modèle (SendSignalAction, messages, ItemFlow) ; contrôles : sans état initial, états inatteignables, impasses,
     transitions sans déclencheur, déclencheurs ambigus, choix sans « else », signaux attendus jamais émis ;
   - `capUmlInteractions` : interactions, lignes de vie (part représentée et son bloc), messages dans l'ordre des fragments
     (signature, nature), fragments combinés ; contrôles : lignes de vie sans part, messages sans signature, opération absente du
     bloc destinataire, messages entre parts qu'aucun connecteur ne relie (cohérence séquence ↔ ibd, 92), messages perdus ou trouvés.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Élément à montrer à la prochaine ouverture des vues : {v:'umlstm'|'umlseq', id, vue} (vue : onglet, 'one' par défaut). */
var _capUmlEiGo=null;
/** Métaclasses des comportements portés par un état ou une transition (entry / do / exit, effet). */
var CAP_UML_COMPORTEMENT=/^(Activity|OpaqueBehavior|StateMachine|Interaction|FunctionBehavior|ProtocolStateMachine)$/;

/** Valeur d'un attribut écrit d'un élément du lecteur (nom sans préfixe d'espace de noms), ou ''. @param {object} lec - Lecture
 * @param {string} id - Identifiant @param {string} nom - Nom de l'attribut @returns {string} */
function capUmlAttr(lec, id, nom){
  let at=[]; try{ at=lec.attributs(id)||[]; }catch(e){ at=[]; }
  const a=at.find(x=>String(x.nom||'').replace(/^[\w-]+:/,'')===nom); return a&&a.valeur!=null?String(a.valeur):'';
}

/** Texte d'une contrainte (garde) : expression, corps d'une OpaqueExpression, sinon son nom. @param {object} lec - Lecture @param {?object} c - Contrainte @returns {string} */
function capUmlTexteContrainte(lec, c){
  if(!c) return '';
  if(c.valeur||c.expression) return String(c.valeur||c.expression);
  for(const id of c.enfants||[]){ const x=lec.element(id); if(!x) continue; const v=x.valeur||x.expression||capUmlAttr(lec, x.id, 'body'); if(v) return String(v); }
  return c.nom||'';
}

/** Rôle d'un comportement porté par un état (entry, do, exit), lu sur la balise XMI qui le déclare ; '' si inconnu.
 * @param {object} lec - Lecture @param {string} id - Identifiant du comportement @returns {string} */
function capUmlRoleComportement(lec, id){
  let x=''; try{ x=String(lec.extrait(id)||'').slice(0,80); }catch(e){ x=''; }
  const m=/^<\s*(?:[\w-]+:)?(entry|doActivity|exit)\b/.exec(x);
  return m?(m[1]==='doActivity'?'do':m[1]):'';
}

/** Ensemble des signaux émis quelque part dans le modèle : SendSignalAction / BroadcastSignalAction, signatures de messages,
 * objets transportés par les ItemFlow. @param {object} lec - Lecture @returns {Set<string>} Identifiants */
function capUmlSignauxEmis(lec){
  const S=new Set();
  lec.elements().forEach(e=>{
    if(/^(SendSignalAction|BroadcastSignalAction)$/.test(e.metaclasse)) capUmlRef(e,'signal').forEach(i=>S.add(i));
    else if(e.metaclasse==='Message') capUmlRef(e,'signature').forEach(i=>S.add(i));
    else if(e.type==='ItemFlow'||(e.stereotypes||[]).includes('ItemFlow')) capUmlRef(e,'conveyed').forEach(i=>S.add(i));
  });
  return S;
}

/* ── 1. 🚦 Machines à états ─────────────────────────────────────── */

/** Machines à états, états et transitions de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{machines:object[], byId:object, etats:object, transitions:object[], emis:Set<string>}} Machines
 */
function capUmlEtats(){
  if(_capAnaCache.umlStm) return _capAnaCache.umlStm;
  const R={machines:[], byId:{}, etats:{}, transitions:[], emis:new Set()};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlStm=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  /** Machine qui contient un élément. */
  const machineDe=e=>{ for(let x=E(e.proprietaire); x; x=E(x.proprietaire)) if(/StateMachine$/.test(x.metaclasse)) return R.byId[x.id]||null; return null; };
  els.forEach(m=>{ if(!/StateMachine$/.test(m.metaclasse)) return;
    let ctx=null; for(let x=E(m.proprietaire); x; x=E(x.proprietaire)) if(capUmlEstBloc(x)){ ctx={id:x.id, name:capUmlNom(x)}; break; }
    const o={id:m.id, name:capUmlNom(m), ctx, etats:[], transitions:[]}; R.byId[m.id]=o; R.machines.push(o); });
  const nomGenre={initial:_L('Initial'), choice:_L('Choix'), junction:_L('Jonction'), fork:_L('Fourche'), join:_L('Jointure'), shallowHistory:_L('Historique'),
    deepHistory:_L('Historique profond'), entryPoint:_L('Point d\'entrée'), exitPoint:_L('Point de sortie'), terminate:_L('Terminaison')};
  els.forEach(e=>{
    if(!/^(State|FinalState|Pseudostate|ConnectionPointReference)$/.test(e.metaclasse)) return;
    const m=machineDe(e); if(!m) return;
    let parent=''; for(let x=E(e.proprietaire); x&&x.id!==m.id; x=E(x.proprietaire)) if(x.metaclasse==='State'){ parent=x.id; break; }
    const kids=(e.enfants||[]).map(E).filter(Boolean);
    const genre=e.metaclasse==='Pseudostate'?(capUmlAttr(lec, e.id, 'kind')||'initial'):e.metaclasse==='FinalState'?'final':e.metaclasse==='State'?(kids.some(k=>k.metaclasse==='Region')?'composite':'simple'):'reference';
    const own=E(e.proprietaire);
    const s={id:e.id, name:e.nom||(genre==='final'?_L('Final'):nomGenre[genre]||capUmlNom(e)), nomme:!!e.nom, genre, pseudo:e.metaclasse==='Pseudostate', machine:m.id, parent,
      region:own&&own.metaclasse==='Region'?own.id:'',   // région qui contient l'état ('' : point de connexion, porté par l'état ou la machine)
      comps:kids.filter(k=>CAP_UML_COMPORTEMENT.test(k.metaclasse)).map(k=>({id:k.id, name:capUmlNom(k), role:capUmlRoleComportement(lec, k.id)})), in:[], out:[]};
    R.etats[s.id]=s; m.etats.push(s);
  });
  els.forEach(t=>{
    if(t.metaclasse!=='Transition') return;
    const m=machineDe(t), src=R.etats[capUmlRef(t,'source')[0]], tgt=R.etats[capUmlRef(t,'target')[0]]; if(!m||!src||!tgt) return;
    const kids=(t.enfants||[]).map(E).filter(Boolean);
    const decl=kids.filter(k=>k.metaclasse==='Trigger').map(k=>{ const ev=E(capUmlRef(k,'event')[0]);
      const sig=ev&&E(capUmlRef(ev,'signal')[0]), op=ev&&E(capUmlRef(ev,'operation')[0]);
      const nature=!ev?'':ev.metaclasse.replace(/Event$/,'').toLowerCase();
      const lib=sig?capUmlNom(sig):op?capUmlNom(op)+'()':ev&&ev.metaclasse==='TimeEvent'?_L(`après ${capUmlNom(ev)}`):ev&&ev.metaclasse==='ChangeEvent'?_L(`quand ${capUmlNom(ev)}`):ev?capUmlNom(ev):capUmlNom(k);
      return {id:k.id, nature, lib, signal:sig?sig.id:'', port:capUmlRef(k,'port')[0]||''}; });
    const garde=capUmlTexteContrainte(lec, kids.find(k=>k.metaclasse==='Constraint'));
    const eff=kids.find(k=>CAP_UML_COMPORTEMENT.test(k.metaclasse));
    const x={id:t.id, name:t.nom||'', machine:m.id, src:src.id, tgt:tgt.id, decl, garde, effet:eff?{id:eff.id, name:capUmlNom(eff)}:null};
    x.cle=decl.length?decl.map(d=>d.lib).sort().join(' | '):(x.name||'');   // déclencheur (le nom d'une transition sans Trigger en tient lieu, comme dans Papyrus ou EA)
    R.transitions.push(x); m.transitions.push(x); src.out.push(x); tgt.in.push(x);
  });
  // Accessibilité : depuis les états initiaux du premier niveau ; entrer dans un état entre aussi dans ses ancêtres et ses états initiaux
  R.machines.forEach(m=>{
    const init=m.etats.filter(s=>s.genre==='initial');
    m.sansInitial=!init.some(s=>!s.parent);
    const vus=new Set(), pile=init.filter(s=>!s.parent).map(s=>s.id);
    while(pile.length){ const id=pile.pop(); if(vus.has(id)) continue; vus.add(id); const s=R.etats[id]; if(!s) continue;
      if(s.parent) pile.push(s.parent);
      if(s.genre==='composite') m.etats.filter(x=>x.parent===s.id&&(x.genre==='initial'||x.genre==='entryPoint')).forEach(x=>pile.push(x.id));
      if(/History$/.test(s.genre)&&s.parent) m.etats.filter(x=>x.parent===s.parent&&!x.pseudo).forEach(x=>pile.push(x.id));
      s.out.forEach(t=>pile.push(t.tgt)); }
    m.etats.forEach(s=>{ s.atteint=vus.has(s.id); });
  });
  R.emis=capUmlSignauxEmis(lec);
  R.machines.sort((a,b)=>capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlStm=R;
}

/** Contrôles 🩺 des machines à états (vue 🚦 Machines à états ; 💚 Santé, 🩺 profil, tableau de bord).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlStmChecks(){
  const R=capUmlEtats(); if(!R.machines.length) return [];
  const fl=(id,n)=>capDetLink(id,n), mach=id=>{ const m=R.byId[id]; return m?fl(m.id,m.name):'—'; };
  const srow=s=>`<tr><td>${fl(s.id,s.name)}</td><td class="ana-dim">${capEsc(capUmlGenreEtat(s.genre))}</td><td>${mach(s.machine)}</td></tr>`;
  const scols=[_L('État'),_L('Nature'),_L('Machine')];
  const trow=t=>`<tr><td>${fl(t.src,R.etats[t.src].name)} → ${fl(t.tgt,R.etats[t.tgt].name)}</td><td>${capEsc(t.cle||'—')}</td><td>${capEsc(t.garde||'—')}</td><td>${mach(t.machine)}</td></tr>`;
  const tcols=[_L('Transition'),_L('Déclencheur'),_L('Garde'),_L('Machine')];
  const etats=Object.values(R.etats), reel=s=>!s.pseudo&&s.genre!=='final';
  const anc=s=>{ const L=[]; for(let p=R.etats[s.parent]; p&&L.length<50; p=R.etats[p.parent]) L.push(p); return L; };
  const ambigus=[]; etats.filter(reel).forEach(s=>{ const g={}; s.out.forEach(t=>{ (g[t.cle]=g[t.cle]||[]).push(t); });
    Object.values(g).forEach(L=>{ if(L.length>1&&L.filter(t=>!t.garde).length>1) ambigus.push(...L); }); });
  const attendus=[]; R.transitions.forEach(t=>t.decl.forEach(d=>{ if(d.signal&&!R.emis.has(d.signal)) attendus.push({t,d}); }));
  return [
    {icon:'⊘', title:_L('Machines sans état initial'), tip:_L('Aucun pseudo-état initial au premier niveau : l\'état de départ n\'est pas défini'), cols:[_L('Machine'),_L('Bloc')],
      items:R.machines.filter(m=>m.sansInitial&&m.etats.length).map(m=>`<tr><td>${fl(m.id,m.name)}</td><td>${m.ctx?fl(m.ctx.id,m.ctx.name):'—'}</td></tr>`)},
    {icon:'⛔', title:_L('États inatteignables'), tip:_L('Aucun chemin de transitions depuis l\'état initial (machines qui en ont un)'), cols:scols,
      items:etats.filter(s=>!s.pseudo&&!s.atteint&&!R.byId[s.machine].sansInitial).map(srow)},
    {icon:'🛑', sev:'info', title:_L('États sans issue'), tip:_L('État (non final) sans transition sortante, ni sur lui ni sur un état englobant : la machine y reste'), cols:scols,
      items:etats.filter(s=>reel(s)&&!s.out.length&&!anc(s).some(p=>p.out.length)).map(srow)},
    {icon:'∅', sev:'info', title:_L('Transitions sans déclencheur'), tip:_L('Transition de complétion partant d\'un état : franchie dès que son comportement se termine'), cols:tcols,
      items:R.transitions.filter(t=>!t.cle&&reel(R.etats[t.src])).map(trow)},
    {icon:'⑂', title:_L('Déclencheurs ambigus (non déterministes)'), tip:_L('Plusieurs transitions sortent du même état sur le même déclencheur, au moins deux sans garde'), cols:tcols, items:ambigus.map(trow)},
    {icon:'◇', sev:'info', title:_L('Choix sans branche « else »'), tip:_L('Toutes les branches d\'un choix ou d\'une jonction sont gardées, aucune par « else » : la machine peut s\'y bloquer'), cols:scols,
      items:etats.filter(s=>(s.genre==='choice'||s.genre==='junction')&&s.out.length>1&&s.out.every(t=>t.garde)&&!s.out.some(t=>/^\s*\[?\s*else\s*\]?\s*$/i.test(t.garde))).map(srow)},
    {icon:'📭', sev:R.emis.size?'warn':'info', title:_L('Signaux attendus jamais émis'), tip:_L('Signal d\'un déclencheur qu\'aucune action d\'envoi, aucun message et aucun ItemFlow du modèle ne produit'), cols:[_L('Transition'),_L('Signal'),_L('Machine')],
      items:attendus.map(({t,d})=>`<tr><td>${fl(t.src,R.etats[t.src].name)} → ${fl(t.tgt,R.etats[t.tgt].name)}</td><td>${capSyLien(d.signal)}</td><td>${mach(t.machine)}</td></tr>`)}
  ];
}

/** Libellé d'une nature d'état (simple, composite, final, pseudo-état). @param {string} g - Nature @returns {string} */
function capUmlGenreEtat(g){
  return {simple:_L('État'), composite:_L('État composite'), final:_L('État final'), reference:_L('Référence de point de connexion'), initial:_L('Initial'), choice:_L('Choix'),
    junction:_L('Jonction'), fork:_L('Fourche'), join:_L('Jointure'), shallowHistory:_L('Historique'), deepHistory:_L('Historique profond'), entryPoint:_L('Point d\'entrée'),
    exitPoint:_L('Point de sortie'), terminate:_L('Terminaison')}[g]||g;
}

/* ── 2. 🎬 Interactions ────────────────────────────────────────── */

/** Interactions, lignes de vie et messages de la lecture UML / SysML v1 affichée (mis en cache).
 * @returns {{list:object[], byId:object}} Interactions
 */
function capUmlInteractions(){
  if(_capAnaCache.umlSeq) return _capAnaCache.umlSeq;
  const R={list:[], byId:{}};
  const lec=capUmlLec(); if(!lec) return _capAnaCache.umlSeq=R;
  const els=lec.elements(), E=id=>id?lec.element(id):null;
  els.forEach(I=>{
    if(I.metaclasse!=='Interaction') return;
    let ctx=null; for(let x=E(I.proprietaire); x; x=E(x.proprietaire)) if(capUmlEstBloc(x)){ ctx={id:x.id, name:capUmlNom(x)}; break; }
    const ordre={}; let n=0;
    const parcours=e=>{ (e.enfants||[]).forEach(id=>{ const c=E(id); if(!c||c.metaclasse==='Interaction') return; ordre[id]=n++; parcours(c); }); };
    parcours(I);
    const lls={}, lifelines=[];
    (I.enfants||[]).map(E).filter(x=>x&&x.metaclasse==='Lifeline').forEach(l=>{
      const rep=E(capUmlRef(l,'represents')[0]), typ=rep&&E(capUmlRef(rep,'type')[0]);
      const o={id:l.id, name:l.nom||(rep?capUmlNom(rep):'')||capUmlNom(l), rep:rep?{id:rep.id, name:capUmlNom(rep), meta:rep.metaclasse}:null, type:typ?{id:typ.id, name:capUmlNom(typ)}:null, env:0, rec:0};
      lls[l.id]=o; lifelines.push(o); });
    const ll=ev=>{ const o=E(ev); return o?lls[capUmlRef(o,'covered')[0]]||null:null; };
    const messages=[];
    els.forEach(m=>{ if(m.metaclasse!=='Message'||m.proprietaire!==I.id) return;
      const se=capUmlRef(m,'sendEvent')[0], re=capUmlRef(m,'receiveEvent')[0], sig=E(capUmlRef(m,'signature')[0]);
      const a=ll(se), b=ll(re), sort=capUmlAttr(lec, m.id, 'messageSort')||'synchCall';
      const o={id:m.id, name:m.nom||(sig?capUmlNom(sig):''), sort, src:a, tgt:b, sig:sig?{id:sig.id, name:capUmlNom(sig), meta:sig.metaclasse, owner:sig.proprietaire}:null,
        connecteur:capUmlRef(m,'connector')[0]||'', ordre:ordre[se]??ordre[re]??1e9, perdu:!re||!b, trouve:!se||!a};
      if(a) a.env++; if(b) b.rec++;
      messages.push(o); });
    messages.sort((a,b)=>a.ordre-b.ordre); messages.forEach((m,i)=>{ m.num=i+1; });
    const frags={}; Object.keys(ordre).map(E).forEach(f=>{ if(f&&f.metaclasse==='CombinedFragment'){ const op=capUmlAttr(lec, f.id, 'interactionOperator')||'seq'; frags[op]=(frags[op]||0)+1; } else if(f&&f.metaclasse==='InteractionUse') frags.ref=(frags.ref||0)+1; });
    const o={id:I.id, name:capUmlNom(I), ctx, lifelines, messages, frags};
    R.byId[I.id]=o; R.list.push(o);
  });
  R.list.sort((a,b)=>capUmlTriNom(a.name,b.name));
  return _capAnaCache.umlSeq=R;
}

/** Contrôles 🩺 des interactions (vue 🎬 Interactions ; 💚 Santé, 🩺 profil, tableau de bord).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlSeqChecks(){
  const Q=capUmlInteractions(); if(!Q.list.length) return [];
  const lec=capUmlLec(), E=id=>id?lec.element(id):null, S=capUmlStructure(), fl=(id,n)=>capDetLink(id,n);
  const msgs=Q.list.flatMap(I=>I.messages.map(m=>({I,m})));
  const mrow=({I,m})=>`<tr><td>${fl(m.id,'#'+m.num+' '+(m.name||'—'))}</td><td>${m.src?fl(m.src.id,m.src.name):'○'} → ${m.tgt?fl(m.tgt.id,m.tgt.name):'○'}</td><td>${fl(I.id,I.name)}</td></tr>`;
  const mcols=[_L('Message'),_L('De → vers'),_L('Interaction')];
  // Opération appelée : portée par le bloc destinataire, l'un de ses parents (généralisation) ou une interface qu'il réalise
  const real={}; lec.toutesLiaisons().forEach(x=>{ if(/realisation|realization/.test(x.relation)) (real[x.source]=real[x.source]||[]).push(x.cible); });
  const porteurs=t=>{ const L=new Set(), pile=[t]; while(pile.length){ const id=pile.pop(); if(!id||L.has(id)) continue; L.add(id); const e=E(id); if(!e) continue;
    capUmlRef(e,'general').forEach(g=>pile.push(g)); (e.enfants||[]).map(E).forEach(c=>{ if(c&&c.metaclasse==='Generalization') capUmlRef(c,'general').forEach(g=>pile.push(g)); }); }
    [...L].forEach(id=>(real[id]||[]).forEach(i=>L.add(i))); return L; };
  const opAbsente=msgs.filter(({m})=>m.sig&&m.sig.meta==='Operation'&&m.tgt&&m.tgt.type&&!porteurs(m.tgt.type.id).has(m.sig.owner));
  // Blocs reliés par un chemin de connecteurs (structure, 92 ; délégations comprises, qui relient une part à son bloc englobant)
  const grp={}, rac=x=>{ while(grp[x]&&grp[x]!==x) x=grp[x]=grp[grp[x]]||grp[x]; return x; }, uni=(a,b)=>{ grp[a]=grp[a]||a; grp[b]=grp[b]||b; grp[rac(a)]=rac(b); };
  S.links.forEach(l=>uni(l.src.id, l.tgt.id));
  const relies=(a,b)=>!!grp[a]&&!!grp[b]&&rac(a)===rac(b);
  const sansConn=msgs.filter(({m})=>!m.connecteur&&m.src&&m.tgt&&m.src.rep&&m.tgt.rep&&m.src.rep.meta==='Property'&&m.tgt.rep.meta==='Property'&&m.src.rep.id!==m.tgt.rep.id
    &&m.src.type&&m.tgt.type&&m.src.type.id!==m.tgt.type.id&&!relies(m.src.type.id, m.tgt.type.id));
  return [
    {icon:'?', sev:'info', title:_L('Lignes de vie sans élément représenté'), tip:_L('Ligne de vie sans « represents » : on ne sait pas quelle part ou quel acteur elle figure'), cols:[_L('Ligne de vie'),_L('Interaction')],
      items:Q.list.flatMap(I=>I.lifelines.filter(l=>!l.rep).map(l=>`<tr><td>${fl(l.id,l.name)}</td><td>${fl(I.id,I.name)}</td></tr>`))},
    {icon:'∅', title:_L('Messages sans signature'), tip:_L('Ni opération ni signal (hors réponses) : le contenu du message n\'est pas défini'), cols:mcols, items:msgs.filter(({m})=>!m.sig&&m.sort!=='reply').map(mrow)},
    {icon:'⚠', title:_L('Opérations absentes du bloc destinataire'), tip:_L('L\'opération appelée n\'appartient ni au type de la ligne de vie réceptrice, ni à ses parents, ni à une interface qu\'il réalise'), cols:[...mcols,_L('Opération'),_L('Bloc destinataire')],
      items:opAbsente.map(x=>mrow(x).replace('</tr>',`<td>${fl(x.m.sig.id,x.m.sig.name)}</td><td>${fl(x.m.tgt.type.id,x.m.tgt.type.name)}</td></tr>`))},
    {icon:'⇄', title:_L('Messages entre parts qu\'aucun connecteur ne relie'), tip:_L('Aucun chemin de connecteurs (directs ou par délégation) entre les blocs des deux lignes de vie : le message n\'a pas de support dans la structure (ibd)'), cols:mcols, items:sansConn.map(mrow)},
    {icon:'○', sev:'info', title:_L('Messages perdus ou trouvés'), tip:_L('Message sans ligne de vie émettrice ou réceptrice'), cols:mcols, items:msgs.filter(({m})=>m.perdu||m.trouve).map(mrow)},
    {icon:'∅', sev:'info', title:_L('Interactions sans message'), cols:[_L('Interaction'),_L('Bloc')], items:Q.list.filter(I=>!I.messages.length).map(I=>`<tr><td>${fl(I.id,I.name)}</td><td>${I.ctx?fl(I.ctx.id,I.ctx.name):'—'}</td></tr>`)}
  ];
}

/* ── 3. Vues ──────────────────────────────────────────────────── */

/** Bouton « 🔲 Diagramme » vers le diagramme du fichier ou la vue calculée qui montre un élément (machine, interaction), ou ''.
 * @param {string} id - Identifiant @returns {string} HTML */
function capUmlDiagBouton(id){
  const v=capSyVuesPour(id).find(x=>x&&x.cle)||capSyVuesListe().find(x=>x.element===id);
  return v?`<button class="cap-lf-btn" onclick="capSyVueOuvrir('${capEsc(v.cle)}','${capEsc(id)}')" title="${_L('Ouvrir son diagramme dans 🔲 Diagrammes')} — ${capEsc(v.nom||'')}">🔲 ${_L('Diagramme')}</button>`:'';
}

/** Ouvre 🚦 Machines à états ou 🎬 Interactions sur un élément (machine, état, transition ; interaction, ligne de vie, message).
 * @param {string} id - Identifiant @param {string} [vue] - Onglet : 'one' (par défaut) ou 'dg' (🖼 Diagramme calculé) @returns {boolean} Vrai si une vue le montre */
function capUmlEiOuvrir(id, vue){
  const R=capUmlEtats(), Q=capUmlInteractions();
  const m=R.byId[id]||(R.etats[id]&&R.byId[R.etats[id].machine])||(R.transitions.find(t=>t.id===id)&&R.byId[R.transitions.find(t=>t.id===id).machine]);
  if(m){ _capUmlEiGo={v:'umlstm', id:m.id, vue}; capNavOpen('ana:umlstm'); return true; }
  const I=Q.byId[id]||Q.list.find(x=>x.lifelines.some(l=>l.id===id)||x.messages.some(g=>g.id===id));
  if(I){ _capUmlEiGo={v:'umlseq', id:I.id, vue}; capNavOpen('ana:umlseq'); return true; }
  return false;
}

/** Boutons du panneau de détail vers 🚦 Machines à états et 🎬 Interactions (rangée posée par `capUmlVuesBoutons`, 88).
 * @param {string} id - Identifiant @returns {string} HTML */
function capUmlEiDetail(id){
  if(!capUmlLec()) return '';
  const R=capUmlEtats(), Q=capUmlInteractions(), b=[];
  if(R.byId[id]||R.etats[id]||R.transitions.some(t=>t.id===id)) b.push(`<button class="cap-lf-btn" onclick="capUmlEiOuvrir('${capEsc(id)}')" title="${_L('Ouvrir dans 🏗 Architecture › 🧬 UML / SysML v1 › 🚦 Machines à états')}">🚦 ${_L('Machines à états')}</button>`);
  if(Q.byId[id]||Q.list.some(x=>x.lifelines.some(l=>l.id===id)||x.messages.some(g=>g.id===id))) b.push(`<button class="cap-lf-btn" onclick="capUmlEiOuvrir('${capEsc(id)}')" title="${_L('Ouvrir dans 🏗 Architecture › 🧬 UML / SysML v1 › 🎬 Interactions')}">🎬 ${_L('Interactions')}</button>`);
  if(R.byId[id]||Q.byId[id]) b.push(`<button class="cap-lf-btn" onclick="capUmlEiOuvrir('${capEsc(id)}','dg')" title="${_L('Dessin recalculé à partir du modèle, indépendant des diagrammes du fichier')}">🖼 ${_L('Diagramme calculé')}</button>`, capUmlDiagBouton(id));
  return b.join('');
}

/** Vue 🚦 Machines à états (sous-vue `umlstm`) : liste des machines, détail d'une machine (états, transitions), 🖼 diagramme calculé (99),
 * matrice état × état, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_ust`)
 */
function capRenderUmlEtats(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : 🏗 Architecture › 🚦 Modes & états).')}</div>`; return; }
  const R=capUmlEtats();
  if(!R.machines.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucune machine à états dans ce modèle.')}</div>`; return; }
  const st=box._ust=box._ust||{view:'list', q:'', sel:'', zoom:1};
  if(_capUmlEiGo&&_capUmlEiGo.v==='umlstm'){ st.sel=_capUmlEiGo.id; st.view=_capUmlEiGo.vue||'one'; _capUmlEiGo=null; }
  if(!R.byId[st.sel]) st.sel=R.machines[0].id;
  const esc=capEsc, q=st.q.trim().toLowerCase(), fl=(id,n,s)=>capDetLink(id,n,s);
  const M=R.byId[st.sel], et=s=>R.etats[s];
  let body='', cnt='', D=null;
  const dgB=id=>`<button class="cap-lf-btn" data-dg="${esc(id)}" title="${_L('🖼 Diagramme calculé')}">🖼</button>`;
  const selB=id=>`<button class="cap-lf-btn" data-sel="${esc(id)}" title="${_L('🔎 Détail')}">🔎</button>`;
  if(st.view==='list'){
    const L=R.machines.filter(m=>capXtHas(q,m.name,m.ctx&&m.ctx.name)); cnt=`${L.length} / ${R.machines.length}`;
    body=`<p class="ana-help">${_L(`${R.machines.length} machine(s) à états, ${Object.keys(R.etats).length} état(s) et pseudo-état(s), ${R.transitions.length} transition(s). Cliquez une ligne pour afficher ou masquer le diagramme calculé de la machine ; 🔎 : ses états et transitions.`)}</p><div class="ud-liste">`+
      capXtTable([_L('Machine'),_L('Bloc'),_L('États'),_L('Transitions'),_L('Signaux attendus'),''], L.map(m=>{ const sigs=[...new Set(m.transitions.flatMap(t=>t.decl.filter(d=>d.signal).map(d=>d.signal)))];
        return [capUmlApercuTog(m.id, !!(st.apercus&&st.apercus.has(m.id)))+`<b>${esc(m.name)}</b>`, m.ctx?fl(m.ctx.id,m.ctx.name):'—', String(m.etats.filter(s=>!s.pseudo).length), String(m.transitions.length),
          sigs.length?capFoldList(sigs.map(id=>capSyLien(id))):'<span class="ana-dim">—</span>', selB(m.id)+dgB(m.id)+capUmlDiagBouton(m.id)]; }))+'</div>';
  } else if(st.view==='one'){
    const etats=M.etats.filter(s=>capXtHas(q,s.name)), trs=M.transitions.filter(t=>capXtHas(q,et(t.src).name,et(t.tgt).name,t.cle,t.garde));
    cnt=`${etats.length} · ${trs.length}`;
    body=`<p class="ana-help">${fl(M.id,M.name,'font-weight:600')}${M.ctx?` — ${_L('comportement de')} ${fl(M.ctx.id,M.ctx.name)}`:''} ${capUmlDiagBouton(M.id)}</p>`+
      capXtTable([_L('État'),_L('Nature'),_L('Dans'),_L('Comportements'),_L('Entrantes'),_L('Sortantes'),_L('Atteint')], etats.map(s=>[fl(s.id,s.name,'font-weight:600'), `<span class="ana-dim">${esc(capUmlGenreEtat(s.genre))}</span>`,
        s.parent?fl(s.parent,et(s.parent).name):'—', s.comps.length?capFoldList(s.comps.map(c=>fl(c.id,c.name))):'—', String(s.in.length), String(s.out.length),
        s.pseudo?'':M.sansInitial?'<span class="ana-dim">?</span>':s.atteint?'✔':`<span style="color:var(--c-warn,#e3b341)">✖</span>`]))+
      `<div style="height:10px"></div>`+
      capXtTable([_L('Source'),'',_L('Cible'),_L('Déclencheur'),_L('Garde'),_L('Effet')], trs.map(t=>[fl(t.src,et(t.src).name), '→', fl(t.tgt,et(t.tgt).name),
        t.decl.length?t.decl.map(d=>d.signal?capSyLien(d.signal):esc(d.lib)).join(', '):t.name?`<span class="ana-dim" title="${_L('Nom de la transition (aucun Trigger)')}">${esc(t.name)}</span>`:'<span class="ana-dim">—</span>',
        t.garde?`<code>[${esc(t.garde)}]</code>`:'—', t.effet?fl(t.effet.id,t.effet.name):'—']), _L('Aucune transition ne correspond au filtre.'));
  } else if(st.view==='dg'){
    D=capUmlStmSvg(M);
    body=capUmlDgCorps(D, st, `${fl(M.id,M.name,'font-weight:600')}${M.ctx?` — ${_L('comportement de')} ${fl(M.ctx.id,M.ctx.name)}`:''} ${capUmlDiagBouton(M.id)}`);
  } else if(st.view==='mx'){
    const vs=M.etats, cell={}; M.transitions.forEach(t=>{ (cell[t.src+'|'+t.tgt]=cell[t.src+'|'+t.tgt]||[]).push(t.cle||'∅'); });
    body=`<p class="ana-help">${fl(M.id,M.name,'font-weight:600')} — ${_L('ligne : état source, colonne : état cible ; dans la case, les déclencheurs (∅ : aucun)')}</p>`+
      `<div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">${_L('Source ↓ / Cible →')}</th>${vs.map(s=>`<th class="cap-mx-col" title="${esc(s.name)}"><div>${fl(s.id,s.name)}</div></th>`).join('')}</tr></thead><tbody>`+
      vs.map(a=>`<tr><th class="cap-mx-row" title="${esc(a.name)}">${fl(a.id,a.name)}</th>${vs.map(b=>{ const c=cell[a.id+'|'+b.id]; return c?`<td class="cap-mx-cell" style="background:rgba(88,166,255,.35)" title="${esc(c.join(' ; '))}">${esc(c.join(', ').slice(0,24))}</td>`:`<td class="${a===b?'cap-mx-diag':''}"></td>`; }).join('')}</tr>`).join('')+
      `</tbody></table></div>`;
  } else body=capDiagHtml(capUmlStmChecks());
  const sel=st.view==='one'||st.view==='mx'||st.view==='dg'?capXtSelect('sel', R.machines.map(m=>[m.id, m.name+(m.ctx?' — '+m.ctx.name:'')]), st.sel):'';
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Machines')],['one',_L('🔎 États & transitions')],['dg',_L('🖼 Diagramme calculé')],['mx',_L('▦ Matrice')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${sel}${st.view==='dg'?capUmlDgBarre(st):st.view!=='mx'?capXtSearch(st.q,_L('État, déclencheur, garde…')):''}`:''), cnt, st.view==='list'||st.view==='one')+body;
  box.querySelectorAll('[data-sel]').forEach(a=>a.onclick=()=>{ st.sel=a.dataset.sel; st.view='one'; capRenderUmlEtats(box); });
  box.querySelectorAll('[data-dg]').forEach(a=>a.onclick=()=>{ st.sel=a.dataset.dg; st.view='dg'; capRenderUmlEtats(box); });
  if(st.view==='dg') capUmlDgBind(box, st, D, 'stm-'+M.name, capRenderUmlEtats);
  if(st.view==='list') capUmlApercuBind(box, st, id=>R.byId[id]?capUmlStmSvg(R.byId[id]):null, id=>{ st.sel=id; st.view='dg'; capRenderUmlEtats(box); });   // ▸ aperçus (99)
  capXtBind(box, st, capRenderUmlEtats, ()=>{
    if(st.view==='list') capCsvExport(_L('machines-a-etats.csv'),[_L('Machine'),_L('Bloc'),_L('États'),_L('Transitions')], R.machines.map(m=>[capCx(m.name,m.id), m.ctx?capCx(m.ctx.name,m.ctx.id):'', m.etats.filter(s=>!s.pseudo).length, m.transitions.length]));
    else capCsvExport(_L('transitions.csv'),[_L('Machine'),_L('Source'),_L('Cible'),_L('Déclencheur'),_L('Garde'),_L('Effet')], M.transitions.map(t=>[capCx(M.name,M.id), capCx(et(t.src).name,t.src), capCx(et(t.tgt).name,t.tgt), t.cle, t.garde, t.effet?capCx(t.effet.name,t.effet.id):'']));
  });
}

/** Libellé de la nature d'un message (messageSort d'UML). @param {string} s - Nature @returns {string} */
function capUmlSorteMessage(s){ return {synchCall:_L('appel synchrone'), asynchCall:_L('appel asynchrone'), asynchSignal:_L('signal'), reply:_L('réponse'), createMessage:_L('création'), deleteMessage:_L('destruction')}[s]||s; }

/** Vue 🎬 Interactions (sous-vue `umlseq`) : liste des interactions, détail (lignes de vie, messages dans l'ordre), 🖼 diagramme de séquence
 * calculé (99), matrice ligne de vie × ligne de vie, contrôles.
 * @param {HTMLElement} box - Conteneur (porte l'état `_usq`)
 */
function capRenderUmlInteractions(box){
  if(!capUmlLec()){ box.innerHTML=`<div class="phl-empty">${_L('Vue des modèles UML et SysML v1 : ouvrez un fichier .uml, .xmi, .mdzip ou .qea (Capella : 🏗 Architecture › 🎬 Scénarios).')}</div>`; return; }
  const Q=capUmlInteractions();
  if(!Q.list.length){ box.innerHTML=`<div class="phl-empty">${_L('Aucune interaction (diagramme de séquence) dans ce modèle.')}</div>`; return; }
  const st=box._usq=box._usq||{view:'list', q:'', sel:'', zoom:1};
  if(_capUmlEiGo&&_capUmlEiGo.v==='umlseq'){ st.sel=_capUmlEiGo.id; st.view=_capUmlEiGo.vue||'one'; _capUmlEiGo=null; }
  if(!Q.byId[st.sel]) st.sel=Q.list[0].id;
  const esc=capEsc, q=st.q.trim().toLowerCase(), fl=(id,n,s)=>capDetLink(id,n,s), I=Q.byId[st.sel];
  const llk=l=>l?fl(l.id,l.name):'<span class="ana-dim">○</span>';
  let body='', cnt='', D=null;
  const dgB=id=>`<button class="cap-lf-btn" data-dg="${esc(id)}" title="${_L('🖼 Diagramme calculé')}">🖼</button>`;
  const selB=id=>`<button class="cap-lf-btn" data-sel="${esc(id)}" title="${_L('🔎 Détail')}">🔎</button>`;
  if(st.view==='list'){
    const L=Q.list.filter(x=>capXtHas(q,x.name,x.ctx&&x.ctx.name)); cnt=`${L.length} / ${Q.list.length}`;
    body=`<p class="ana-help">${_L(`${Q.list.length} interaction(s), ${Q.list.reduce((s,x)=>s+x.messages.length,0)} message(s). Cliquez une ligne pour afficher ou masquer le diagramme de séquence calculé de l'interaction ; 🔎 : ses lignes de vie et ses messages dans l'ordre.`)}</p><div class="ud-liste">`+
      capXtTable([_L('Interaction'),_L('Bloc'),_L('Lignes de vie'),_L('Messages'),_L('Fragments'),''], L.map(x=>[capUmlApercuTog(x.id, !!(st.apercus&&st.apercus.has(x.id)))+`<b>${esc(x.name)}</b>`,
        x.ctx?fl(x.ctx.id,x.ctx.name):'—', String(x.lifelines.length), String(x.messages.length), Object.entries(x.frags).map(([k,v])=>`${esc(k)} ${v}`).join(', ')||'—', selB(x.id)+dgB(x.id)+capUmlDiagBouton(x.id)]))+'</div>';
  } else if(st.view==='one'){
    const ms=I.messages.filter(m=>capXtHas(q,m.name,m.src&&m.src.name,m.tgt&&m.tgt.name)); cnt=`${ms.length} / ${I.messages.length}`;
    body=`<p class="ana-help">${fl(I.id,I.name,'font-weight:600')}${I.ctx?` — ${_L('comportement de')} ${fl(I.ctx.id,I.ctx.name)}`:''} ${capUmlDiagBouton(I.id)}</p>`+
      capXtTable([_L('Ligne de vie'),_L('Représente'),_L('Bloc'),_L('Émis'),_L('Reçus')], I.lifelines.map(l=>[fl(l.id,l.name,'font-weight:600'), l.rep?fl(l.rep.id,l.rep.name):'<span class="ana-dim">—</span>', l.type?fl(l.type.id,l.type.name):'—', String(l.env), String(l.rec)]))+
      `<div style="height:10px"></div>`+
      capXtTable(['N°',_L('De'),'',_L('Vers'),_L('Message'),_L('Nature'),_L('Signature')], ms.map(m=>[String(m.num), llk(m.src), m.sort==='reply'?'⇠':m.sort==='asynchSignal'||m.sort==='asynchCall'?'→':'⟶', llk(m.tgt),
        fl(m.id,m.name||'—'), `<span class="ana-dim">${esc(capUmlSorteMessage(m.sort))}</span>`, m.sig?`${fl(m.sig.id,m.sig.name)} <span class="ana-dim">${esc(m.sig.meta)}</span>`:'<span class="ana-dim">—</span>']), _L('Aucun message ne correspond au filtre.'));
  } else if(st.view==='dg'){
    D=capUmlSeqSvg(I);
    body=capUmlDgCorps(D, st, `${fl(I.id,I.name,'font-weight:600')}${I.ctx?` — ${_L('comportement de')} ${fl(I.ctx.id,I.ctx.name)}`:''} ${capUmlDiagBouton(I.id)}`);
  } else if(st.view==='mx'){
    const ls=I.lifelines, cell={}; I.messages.forEach(m=>{ if(m.src&&m.tgt) (cell[m.src.id+'|'+m.tgt.id]=cell[m.src.id+'|'+m.tgt.id]||[]).push(m); });
    const max=Math.max(1,...Object.values(cell).map(v=>v.length));
    body=`<p class="ana-help">${fl(I.id,I.name,'font-weight:600')} — ${_L('ligne : émetteur, colonne : récepteur ; nombre de messages')}</p>`+
      `<div class="cap-mx-wrap"><table class="cap-mx"><thead><tr><th class="cap-mx-corner">${_L('Émetteur ↓ / Récepteur →')}</th>${ls.map(l=>`<th class="cap-mx-col" title="${esc(l.name)}"><div>${fl(l.id,l.name)}</div></th>`).join('')}</tr></thead><tbody>`+
      ls.map(a=>`<tr><th class="cap-mx-row">${fl(a.id,a.name)}</th>${ls.map(b=>{ const c=cell[a.id+'|'+b.id]; return c?`<td class="cap-mx-cell" style="background:rgba(88,166,255,${(0.15+0.6*c.length/max).toFixed(2)})" title="${esc(c.map(m=>'#'+m.num+' '+(m.name||'—')).join('\n'))}">${c.length}</td>`:`<td class="${a===b?'cap-mx-diag':''}"></td>`; }).join('')}</tr>`).join('')+
      `</tbody></table></div>`;
  } else body=capDiagHtml(capUmlSeqChecks());
  const sel=st.view==='one'||st.view==='mx'||st.view==='dg'?capXtSelect('sel', Q.list.map(x=>[x.id, x.name+(x.ctx?' — '+x.ctx.name:'')]), st.sel):'';
  box.innerHTML=capXtBar(capXtViewBtns([['list',_L('📋 Interactions')],['one',_L('🔎 Messages')],['dg',_L('🖼 Diagramme calculé')],['mx',_L('▦ Matrice')],['diag',_L('🩺 Contrôles')]],st.view)+
    (st.view!=='diag'?`<span class="tsep"></span>${sel}${st.view==='dg'?capUmlDgBarre(st):st.view!=='mx'?capXtSearch(st.q,_L('Interaction, message, ligne de vie…')):''}`:''), cnt, st.view==='list'||st.view==='one')+body;
  box.querySelectorAll('[data-sel]').forEach(a=>a.onclick=()=>{ st.sel=a.dataset.sel; st.view='one'; capRenderUmlInteractions(box); });
  box.querySelectorAll('[data-dg]').forEach(a=>a.onclick=()=>{ st.sel=a.dataset.dg; st.view='dg'; capRenderUmlInteractions(box); });
  if(st.view==='dg') capUmlDgBind(box, st, D, 'sd-'+I.name, capRenderUmlInteractions, id=>{ if(Q.byId[id]){ st.sel=id; capRenderUmlInteractions(box); } });
  if(st.view==='list') capUmlApercuBind(box, st, id=>Q.byId[id]?capUmlSeqSvg(Q.byId[id]):null, id=>{ st.sel=id; st.view='dg'; capRenderUmlInteractions(box); });   // ▸ aperçus (99)
  capXtBind(box, st, capRenderUmlInteractions, ()=>{
    if(st.view==='list') capCsvExport(_L('interactions.csv'),[_L('Interaction'),_L('Bloc'),_L('Lignes de vie'),_L('Messages')], Q.list.map(x=>[capCx(x.name,x.id), x.ctx?capCx(x.ctx.name,x.ctx.id):'', x.lifelines.length, x.messages.length]));
    else capCsvExport(_L('messages.csv'),['N°',_L('Interaction'),_L('De'),_L('Vers'),_L('Message'),_L('Nature'),_L('Signature')], I.messages.map(m=>[m.num, capCx(I.name,I.id), m.src?capCx(m.src.name,m.src.id):'', m.tgt?capCx(m.tgt.name,m.tgt.id):'', capCx(m.name,m.id), capUmlSorteMessage(m.sort), m.sig?capCx(m.sig.name,m.sig.id):'']));
  });
}

/** Indicateurs 🚦 et 🎬 du 📐 tableau de bord (vides hors UML / SysML v1) ; appelée par `capUmlDashCatalog` (88).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlEiDashCatalog(add){
  const G=_L('UML / SysML v1'), R=()=>capUmlEtats(), Q=()=>capUmlInteractions();
  add(G,'uml.stm.n',_L('UML / SysML v1 — machines à états'),'n',()=>({n:R().machines.length, sub:_L(`${Object.values(R().etats).filter(s=>!s.pseudo).length} état(s) · ${R().transitions.length} transition(s)`)}));
  add(G,'uml.stm.chk',_L('UML / SysML v1 — contrôles des machines à états'),'series',()=>({cats:capUmlStmChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
  add(G,'uml.seq.n',_L('UML / SysML v1 — interactions'),'n',()=>({n:Q().list.length, sub:_L(`${Q().list.reduce((s,x)=>s+x.messages.length,0)} message(s)`)}));
  add(G,'uml.seq.chk',_L('UML / SysML v1 — contrôles des interactions'),'series',()=>({cats:capUmlSeqChecks().map(s=>({l:s.title, v:s.items.length})).filter(c=>c.v).sort((a,b)=>b.v-a.v)}));
}
