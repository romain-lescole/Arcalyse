/* ═══════════════════════════════════════════════════════════════════════
   🧩 MODÈLES DE RAPPORT GÉNÉRIQUES — pensés pour SysML v1 / v2 (tous formats)
   ───────────────────────────────────────────────────────────────────────
   Complète les 🧩 modèles personnalisés (63) d'un sélecteur d'éléments indépendant d'ARCADIA :
   - type : famille usuelle (blocs, parts, ports, fonctions, exigences…), type exact ou stéréotype du modèle ;
   - portée : tout le modèle, dans un paquetage ou un bloc choisi, contenus dans l'élément englobant, à son intérieur
     (contenus, parts et leurs types), reliés à lui par une relation du catalogue de la ▦ Matrice (91 : liaisons des
     lecteurs, relations Capella), ou atteints par un ✨ chemin (moteur de la colonne par chemin, 21) ;
   - « élément englobant » : élément de la boucle englobante, ou 🎯 sujet du modèle (système ou sous-système décrit).
   Contenus automatiques ajoutés : propriétés et valeurs, liens (relation au choix), ports / pins / paramètres
   (entrées, sorties), connexions, information par chemin ; colonnes au choix des tableaux d'éléments.
   Plans SSS / SSDD (MIL-STD-498) livrés comme 🧩 modèles à adapter (capRapModeleSs), pour les modèles SysML.
   Les tableaux produits restent lus sur le modèle chargé (capRapLignes, appelée par capDosListeLignes, 61).
   ═══════════════════════════════════════════════════════════════════════ */

/** @returns {'capella'|'sysml2'|'uml'} format du modèle ouvert (UML : aussi SysML v1) */
function capRapFormat(){ return typeof capMxFormat==='function'?capMxFormat():'capella'; }

/** Type, métaclasse et stéréotypes d'un élément, réunis pour les familles. @param {object} e @returns {{t:string, mc:string, st:string}} */
function capRapSig(e){ return {t:e.typeName||'', mc:e.attrs.metaclasse||e.typeName||'', st:String(e.attrs.stereotypes||'')}; }

/** Familles d'éléments usuelles (SysML v1 par les types / stéréotypes de la lecture UML, SysML v2 par les métaclasses). */
const CAP_RAP_FAMILLES=[
  {k:'blocs', l:_L('Blocs (Block, part def)'), m:x=>/^(Block|PartDefinition|System|Subsystem)$/.test(x.t)||(/^(Class|Component)$/.test(x.mc)&&/\bBlock\b/.test(x.st))},
  {k:'parts', l:_L('Parts (part, PartProperty)'), m:(x,e)=>/^(PartProperty|PartUsage)$/.test(x.t)||(x.mc==='Property'&&e.attrs.agregation==='composite'&&!/(Value|Flow|Constraint|Reference)Property$/.test(x.t)&&capRapDefs(e.id).some(d=>capRapEst(capGetElementById_(d),'blocs')))},
  {k:'ports', l:_L('Ports'), m:x=>(x.mc==='Port'||/Port(Usage)?$/.test(x.t))&&!/Definition$/.test(x.t)},
  {k:'interfaces', l:_L('Interfaces (InterfaceBlock, port def, interface def)'), m:x=>/^(InterfaceBlock|Interface|InterfaceDefinition|PortDefinition)$/.test(x.t)},
  {k:'connecteurs', l:_L('Connecteurs et connexions'), m:x=>(x.mc==='Connector'&&x.t!=='BindingConnector')||/^(ConnectionUsage|InterfaceUsage|FlowConnectionUsage|FlowUsage|SuccessionFlowUsage)$/.test(x.t)},
  {k:'fonctions', l:_L('Fonctions (activités, actions, stéréotype « fonction »)'), m:x=>(x.t==='Activity')||(/Action$/.test(x.mc)&&!/^(AcceptEventAction)$/.test(x.mc))||/^(ActionDefinition|ActionUsage|PerformActionUsage)$/.test(x.t)||/fonction|function/i.test(x.st+' '+x.t)},
  {k:'activites', l:_L('Activités (Activity, action def)'), m:x=>x.t==='Activity'||x.t==='ActionDefinition'},
  {k:'actions', l:_L('Actions'), m:x=>(/Action$/.test(x.mc)&&x.t!=='Activity')||/^(ActionUsage|PerformActionUsage)$/.test(x.t)},
  {k:'pins', l:_L('Pins et paramètres'), m:(x,e)=>/^(InputPin|OutputPin|ValuePin|ActionInputPin|ActivityParameterNode|Parameter)$/.test(x.mc)||(!!e.attrs.direction&&!/Port/.test(x.t))},
  {k:'etats', l:_L('Machines à états (StateMachine, state def)'), m:x=>/^(StateMachine|StateDefinition|ExhibitStateUsage)$/.test(x.t)},
  {k:'etatsSimples', l:_L('États'), m:x=>/^(State|StateUsage|FinalState)$/.test(x.t)},
  {k:'transitions', l:_L('Transitions'), m:x=>/^(Transition|TransitionUsage)$/.test(x.t)},
  {k:'interactions', l:_L('Interactions (séquences)'), m:x=>x.t==='Interaction'},
  {k:'uc', l:_L('Cas d\'utilisation'), m:x=>/^(UseCase|UseCaseDefinition|UseCaseUsage)$/.test(x.t)},
  {k:'acteurs', l:_L('Acteurs'), m:x=>x.mc==='Actor'||/^(ActorUsage)$/.test(x.t)},
  {k:'exigences', l:_L('Exigences'), m:(x,e)=>/^(Requirement|RequirementDefinition|RequirementUsage|ConcernUsage|ConcernDefinition)$/.test(x.t)||(x.mc==='Class'&&/Requirement/.test(x.st))||(x.t==='SpecObject'&&!e.attrs.titre)},
  {k:'titres', l:_L('Titres de chapitre (ReqIF)'), m:(x,e)=>x.t==='SpecObject'&&!!e.attrs.titre},
  {k:'specs', l:_L('Spécifications (ReqIF)'), m:x=>x.t==='Specification'},
  {k:'tests', l:_L('Cas de test et de vérification'), m:x=>/^(TestCase|VerificationCaseDefinition|VerificationCaseUsage)$/.test(x.t)},
  {k:'contraintes', l:_L('Contraintes (ConstraintBlock, constraint)'), m:x=>/^(ConstraintBlock|Constraint|ConstraintDefinition|ConstraintUsage|AssertConstraintUsage)$/.test(x.t)},
  {k:'items', l:_L('Objets échangés (Signal, item def)'), m:x=>/^(Signal|ItemDefinition|ItemUsage|InformationItem)$/.test(x.t)},
  {k:'valeurs', l:_L('Valeurs (ValueProperty, attribute)'), m:x=>/^(ValueProperty|AttributeUsage)$/.test(x.t)},
  {k:'paquetages', l:_L('Paquetages'), m:x=>/^(Package|Model|Namespace|LibraryPackage)$/.test(x.mc)},
  {k:'*', l:_L('Tous les éléments'), m:()=>true}];

/** Portées d'un sélecteur générique. */
const CAP_RAP_PORTEES=[
  {k:'tout', l:_L('dans tout le modèle')}, {k:'dans', l:_L('dans un paquetage ou un bloc choisi')},
  {k:'ctx', l:_L('contenus dans l\'élément englobant')}, {k:'int', l:_L('à l\'intérieur de l\'élément englobant (contenus, parts et leurs types)')},
  {k:'rel', l:_L('reliés à l\'élément englobant par une relation')}, {k:'chemin', l:_L('atteints depuis l\'élément englobant par un chemin ✨')}];
/** Sens d'une relation, vu de l'élément englobant (ou de la ligne d'un tableau). */
const CAP_RAP_SENS=[{k:'out', l:_L('élément englobant → eux')}, {k:'in', l:_L('eux → élément englobant')}, {k:'deux', l:_L('dans les deux sens')}];
/** Colonnes proposées pour un tableau d'éléments. */
const CAP_RAP_COLS=[
  {k:'type', l:'Type'}, {k:'desc', l:'Description'}, {k:'owner', l:_L('Propriétaire')}, {k:'def', l:_L('Typé par')},
  {k:'stereo', l:_L('Stéréotypes')}, {k:'reqid', l:_L('Identifiant')}, {k:'reqtxt', l:_L('Texte (exigence, contrainte)')}, {k:'sens', l:_L('Sens (ports, pins)')},
  {k:'attr', l:_L('Attribut…')}, {k:'rel', l:_L('Relation…')}, {k:'chemin', l:_L('✨ Chemin…')}];

/* ── Relations, types, intérieur ─────────────────────────────────────── */

/** Index des relations du catalogue de la ▦ Matrice (capMxRelations, 91), dans les deux sens, en cache.
 * @returns {{out:Map<string,object[]>, in:Map<string,object[]>, rels:object[]}} out : source → [{id, k, v}], in : cible → [{id, k, v}] */
function capRapRelIdx(){
  if(_capAnaCache.rapRel) return _capAnaCache.rapRel;
  const R={out:new Map(), in:new Map(), rels:[]}, add=(m,a,x)=>{ let l=m.get(a); if(!l) m.set(a, l=[]); l.push(x); };
  if(capLoaded&&typeof capMxRelations==='function'){
    let C={list:[]}; try{ C=capMxRelations(); }catch(e){ console.warn('Relations illisibles :', e); }
    C.list.filter(r=>!r.ch).forEach(r=>{ R.rels.push({k:r.k, l:r.l, n:r.n, avance:!!r.avance});
      (r.liens||[]).forEach(x=>{ add(R.out, x.s, {id:x.t, k:r.k, v:x.v||''}); add(R.in, x.t, {id:x.s, k:r.k, v:x.v||''}); }); });
  }
  return _capAnaCache.rapRel=R;
}
/** Relations proposées dans les listes (hors références par attribut, sauf si déjà choisies). @returns {object[]} */
function capRapRels(){ return capRapRelIdx().rels.filter(r=>!r.avance); }
/** Libellé d'une relation (ou d'une combinaison « a|b »). @param {string} k @returns {string} */
function capRapRelLib(k){
  if(!k||k==='*') return _L('toutes les relations');
  const by={}; capRapRelIdx().rels.forEach(r=>{ by[r.k]=r.l; });
  return String(k).split('|').map(x=>by[x]||x.replace(/^sy:/,'')).join(' / ');
}
/**
 * Éléments reliés à un élément par des relations du catalogue.
 * @param {string} id - Élément
 * @param {string} keys - Relation, « a|b » pour plusieurs, « * » pour toutes (hors contenance et références par attribut)
 * @param {string} sens - 'out' (l'élément → eux), 'in' (eux → l'élément), 'deux'
 * @returns {{id:string, k:string, v:string, sens:string}[]}
 */
function capRapLies(id, keys, sens){
  const I=capRapRelIdx(), tout=!keys||keys==='*', ks=new Set(String(keys||'').split('|')), av=new Set(I.rels.filter(r=>r.avance).map(r=>r.k));
  const ok=k=>tout?k!=='own'&&!av.has(k):ks.has(k), out=[];
  if(sens!=='in') (I.out.get(id)||[]).forEach(x=>{ if(ok(x.k)) out.push(Object.assign({sens:'out'}, x)); });
  if(sens!=='out') (I.in.get(id)||[]).forEach(x=>{ if(ok(x.k)) out.push(Object.assign({sens:'in'}, x)); });
  return out;
}
/** Définitions d'un élément (ce qui le type) : liaison « typage » des lecteurs, abstractType d'une Part Capella. @param {string} id @returns {string[]} */
function capRapDefs(id){
  const l=(capRapRelIdx().out.get(id)||[]).filter(x=>x.k==='sy:typage').map(x=>x.id), e=capGetElementById_(id);
  if(e&&e.typeName==='Part'&&e.attrs.abstractType) capParseAttrRefs_(String(e.attrs.abstractType)).forEach(x=>l.push(x));
  return [...new Set(l)].filter(x=>x!==id&&capGetElementById_(x));
}
/** L'élément et, si demandé, ses définitions. @param {string} id @param {boolean} vt - Avec son type @returns {string[]} */
function capRapAvecType(id, vt){ return vt===false?[id]:[id, ...capRapDefs(id)]; }
/**
 * Intérieur d'un élément : lui-même, ce qu'il contient, ses parts et leurs types, de proche en proche (et ce que contiennent ces types).
 * @param {string} id - Élément
 * @returns {Set<string>}
 */
function capRapInterieur(id){
  const memo=_capAnaCache.rapInt||(_capAnaCache.rapInt={}); if(memo[id]) return memo[id];
  const {childrenOf}=capGetParentIndex(), I=capRapRelIdx(), s=new Set(), pile=[id];
  while(pile.length&&s.size<20000){ const x=pile.pop(); if(s.has(x)) continue; s.add(x);
    (childrenOf[x]||[]).forEach(c=>pile.push(c));
    (I.out.get(x)||[]).forEach(r=>{ if(r.k==='sy:composition') pile.push(r.id); });
    const e=capGetElementById_(x); if(e&&x!==id&&(capRapEst(e,'parts')||/^(ConstraintProperty|ConstraintUsage|AssertConstraintUsage)$/.test(e.typeName))) capRapDefs(x).forEach(d=>pile.push(d));
    if(x===id) capRapDefs(x).forEach(d=>pile.push(d)); }
  return memo[id]=s;
}
/** Vrai si un élément est de la famille (ou du type « t:… », ou du stéréotype « s:… »). @param {object} e @param {string} g @returns {boolean} */
function capRapEst(e, g){
  if(!e) return false; g=g||'*';
  if(g.startsWith('t:')) return e.typeName===g.slice(2);
  if(g.startsWith('s:')) return String(e.attrs.stereotypes||'').split(' ').includes(g.slice(2));
  if(e.attrs.technique==='true') return false;
  const f=CAP_RAP_FAMILLES.find(x=>x.k===g); return !!f&&f.m(capRapSig(e), e);
}
/** Choix de type proposés : familles présentes (avec leur nombre), types et stéréotypes du modèle, en cache. @returns {{fam:object[], types:object[], st:object[]}} */
function capRapTypesDispo(){
  if(_capAnaCache.rapTypes) return _capAnaCache.rapTypes;
  const t={}, st={}, fam={};
  capAllElements.forEach(e=>{ t[e.typeName]=(t[e.typeName]||0)+1; String(e.attrs.stereotypes||'').split(' ').filter(Boolean).forEach(s=>{ st[s]=(st[s]||0)+1; });
    if(e.attrs.technique!=='true') CAP_RAP_FAMILLES.forEach(f=>{ if(f.k!=='*'&&f.m(capRapSig(e), e)) fam[f.k]=(fam[f.k]||0)+1; }); });
  const tri=o=>Object.keys(o).sort((a,b)=>capAnaHuman(a).localeCompare(capAnaHuman(b))).map(k=>({k, n:o[k]}));
  return _capAnaCache.rapTypes={fam:CAP_RAP_FAMILLES.filter(f=>f.k==='*'||fam[f.k]).map(f=>({k:f.k, l:f.l, n:fam[f.k]||capAllElements.length})), types:tri(t), st:tri(st)};
}
/** Libellé du type choisi. @param {string} g @returns {string} */
function capRapTypeLib(g){
  g=g||'*'; if(g.startsWith('t:')) return capAnaHuman(g.slice(2)); if(g.startsWith('s:')) return '«'+g.slice(2)+'»';
  return ((CAP_RAP_FAMILLES.find(f=>f.k===g)||{}).l||g).replace(/\s*\(.*\)$/,'');
}

/* ── Sélection ───────────────────────────────────────────────────────── */

/**
 * Résultat d'un ✨ chemin depuis un élément, quel que soit le type de départ déclaré à la première étape.
 * @param {object} el - Élément de départ
 * @param {object[]} steps - Étapes {metaclass, property} (moteur de 21)
 * @returns {Array} éléments, ou valeurs (dernière étape terminale)
 */
function capRapChemin(el, steps){
  if(!el||!steps||!steps.length||!steps.every(s=>s.property)) return [];
  const st=steps.map((s,i)=>i?s:Object.assign({}, s, {metaclass:el.typeName}));
  try{ return capResolveMetachain(el, st); }catch(e){ console.warn('Chemin illisible :', e); return []; }
}
/** Résumé d'un chemin (« Bloc → Ports → Nom »). @param {object[]} steps @returns {string} */
function capRapCheminLib(steps){
  if(!steps||!steps.length||!steps[0].property) return _L('(chemin à définir)');
  return steps.map(s=>s.property?s.property.label:'…').join(' → ');
}
/**
 * Éléments d'un sélecteur générique.
 * @param {object} r - {g, portee, ref, direct, rel, sens, de, vt, steps, nom, q, tri}
 * @param {?object} ctx - Élément englobant {id, el, …} (boucle englobante ou sujet du modèle)
 * @returns {object[]} éléments du modèle
 */
function capRapGenSel(r, ctx){
  const P=r.portee||'tout', g=r.g||'*', c=ctx&&ctx.el, vt=r.vt!==false;
  let cand=null;
  if(P==='dans'){ if(!r.ref||!r.ref.id) return []; cand=capMxPortee({ids:[r.ref.id], direct:!!r.direct}); }
  else if(P!=='tout'){
    if(!c) return [];
    if(P==='ctx'){ const ids=capRapAvecType(c.id, vt); cand=capMxPortee({ids, direct:!!r.direct}); }
    else if(P==='int'){ cand=new Set(capRapInterieur(c.id)); cand.delete(c.id); }
    else if(P==='rel'){ const de=r.de==='int'?[...capRapInterieur(c.id)]:capRapAvecType(c.id, vt); cand=new Set();
      de.forEach(id=>capRapLies(id, r.rel||'*', r.sens||'deux').forEach(x=>cand.add(x.id))); }
    else if(P==='chemin'){ cand=new Set(capRapChemin(c, r.steps).filter(x=>x&&x.id).map(x=>x.id)); }
    if(!cand) return [];
  }
  const nom=String(r.nom||'').toLowerCase();
  let rx=null; if(r.q){ try{ rx=new RegExp(r.q,'i'); }catch(e){ rx={test:s=>s.toLowerCase().includes(String(r.q).toLowerCase())}; } }
  let l=capAllElements.filter(e=>(!cand||cand.has(e.id))&&(!c||e.id!==c.id||P==='tout'||P==='dans')&&capRapEst(e, g));
  if(nom) l=l.filter(e=>String(e.attrs.name||'').toLowerCase().includes(nom));
  if(rx) l=l.filter(e=>rx.test([e.attrs.name||'', capHtmlToText(e.attrs.description||''), ...Object.entries(e.attrs).filter(([k])=>/\./.test(k)||/^(text|valeur|expression)$/.test(k)).map(([,v])=>v)].join(' ')));
  if(r.tri==='nom') l.sort((a,b)=>String(a.attrs.name||'').localeCompare(String(b.attrs.name||''),'fr',{numeric:true}));
  return l;
}
/** Phrase décrivant un sélecteur (titre par défaut d'un tableau). @param {object} r @returns {string} */
function capRapGenLib(r){
  const P=r.portee||'tout', t=capRapTypeLib(r.g);
  if(P==='dans') return _L(`${t} de « ${r.ref&&r.ref.nom||'…'} »`);
  if(P==='ctx'||P==='int') return _L(`${t} de « {nom} »`);
  if(P==='rel') return _L(`${t} liés à « {nom} » (${capRapRelLib(r.rel)})`);
  if(P==='chemin') return _L(`${t} atteints depuis « {nom} »`);
  return t;
}

/* ── Ports, connexions, propriétés ───────────────────────────────────── */

/**
 * Sens d'un port, d'un pin ou d'un paramètre : orientation calculée par 🧱 Blocs & ports (92) pour UML / SysML v1,
 * genre du pin, direction déclarée, sinon directions des attributs de son type (SysML v2 : port def), port conjugué inversé.
 * @param {object} e - Élément
 * @returns {''|'IN'|'OUT'|'INOUT'}
 */
function capRapSens(e){
  if(!e) return '';
  const norm=d=>{ d=String(d||'').toLowerCase(); return d==='in'?'IN':d==='out'||d==='return'?'OUT':d==='inout'?'INOUT':''; };
  if(typeof capSyUml==='function'&&capSyUml()){ const q=capUmlStructure().ports[e.id]; if(q&&q.orient&&q.orient!=='UNSET') return q.orient; }
  const mc=e.attrs.metaclasse||e.typeName;
  if(/^(InputPin|ValuePin|ActionInputPin)$/.test(mc)) return 'IN';
  if(mc==='OutputPin') return 'OUT';
  if(e.attrs.direction) return norm(e.attrs.direction);
  if(mc==='ActivityParameterNode'){ const p=capParseAttrRefs_(String(e.attrs.parameter||'')).map(capGetElementById_).find(Boolean); return p?norm(p.attrs.direction):''; }
  if(/Port/.test(e.typeName)){ const {childrenOf}=capGetParentIndex(), d=new Set();
    capRapDefs(e.id).forEach(t=>(childrenOf[t]||[]).map(capGetElementById_).forEach(x=>{ const s=x&&norm(x.attrs.direction||x.attrs['FlowProperty.direction']); if(s) d.add(s); }));
    let o=d.size===1?[...d][0]:d.size?'INOUT':'';
    if((e.attrs.conjugue==='true'||/conjugated/.test(e.attrs.modificateurs||''))&&(o==='IN'||o==='OUT')) o=o==='IN'?'OUT':'IN';
    return o; }
  return '';
}
/**
 * Ports, pins et paramètres d'un élément (et de son type).
 * @param {string} id - Élément
 * @param {string} [sens] - '' (tous), 'in' (entrées et entrées / sorties), 'out'
 * @param {boolean} [vt] - Avec ceux de son type (défaut : oui)
 * @returns {object[]}
 */
function capRapPorts(id, sens, vt){
  const {childrenOf}=capGetParentIndex(), vus=new Set(), l=[];
  capRapAvecType(id, vt).forEach(x=>(childrenOf[x]||[]).map(capGetElementById_).forEach(e=>{ if(e&&!vus.has(e.id)&&(capRapEst(e,'ports')||capRapEst(e,'pins'))){ vus.add(e.id); l.push(e); } }));
  const params=new Set(l.filter(e=>(e.attrs.metaclasse||e.typeName)==='Parameter').map(e=>e.id));   // nœud de paramètre d'activité : gardé seulement sans son paramètre
  const r=l.filter(e=>!((e.attrs.metaclasse||e.typeName)==='ActivityParameterNode'&&capParseAttrRefs_(String(e.attrs.parameter||'')).some(p=>params.has(p))));
  if(!sens) return r;
  return r.filter(e=>{ const s=capRapSens(e); return s==='INOUT'||s===(sens==='in'?'IN':'OUT'); });
}
/** Nom d'un élément précédé de son propriétaire (« Camera.img »). @param {string} id @returns {string} */
function capRapNomQualif(id){
  const e=capGetElementById_(id); if(!e) return '—';
  const p=capGetElementById_(capGetParentIndex().parentOf[id]);
  return (p&&p.attrs.name&&/Port|Pin|Parameter|Property|Usage/.test(e.typeName)?p.attrs.name+'.':'')+capMxNom(e);
}
/** Relations des connexions (connecteurs UML, connexions SysML v2, échanges Capella). */
const CAP_RAP_CNX='sy:connecteur|sy:connexion|ce|pl|fe';
/**
 * Connexions d'un élément : touchant l'élément ou ses ports ('ext'), possédées par lui ('int'), ou les deux.
 * @param {string} id - Élément
 * @param {string} quels - 'ext' | 'int' | 'tous'
 * @param {boolean} [vt] - Avec celles de son type
 * @returns {{id:string, c:string[]}[]} lignes : connexion, de, vers, transporte
 */
function capRapCnx(id, quels, vt){
  const I=capRapRelIdx(), ks=new Set(CAP_RAP_CNX.split('|')), P=capGetParentIndex().parentOf, moi=new Set(capRapAvecType(id, vt));
  const bouts=new Set([...moi, ...[...moi].flatMap(x=>capRapPorts(x,'',false).map(p=>p.id))]);
  const items={}; if(typeof capSyUml==='function'&&capSyUml()) capUmlStructure().links.forEach(l=>{ items[l.id]=l.items.map(i=>i.name); });
  const vus=new Set(), rows=[];
  I.out.forEach((l,s)=>l.forEach(x=>{
    if(!ks.has(x.k)) return; const cle=(x.v||s+'>'+x.id); if(vus.has(cle)) return;
    const ext=bouts.has(s)||bouts.has(x.id), int=!!x.v&&moi.has(P[x.v]);
    if(!(quels==='ext'?ext:quels==='int'?int:ext||int)) return; vus.add(cle);
    const v=x.v&&capGetElementById_(x.v);
    rows.push({id:x.v||x.id, c:[v?capMxNom(v):capRapRelLib(x.k), capRapNomQualif(s), capRapNomQualif(x.id), (items[x.v]||[]).join(', ')]}); }));
  return rows;
}
/** Attributs écartés des propriétés d'un élément (techniques ou déjà montrés ailleurs). */
const CAP_RAP_PROPS_SAUF=new Set(['name','description','summary','id','famille','fichier','ligne','nomQualifie','motCle','metaclasse','technique','anonyme','nature','bibliotheque','metadonnees','extremites','lecteur','agregation','typedBy','association','memberEnd','visibilite']);
/**
 * Propriétés d'un élément : stéréotypes et valeurs de leurs propriétés, déclaration, multiplicité, direction… (références lues
 * comme des noms), puis valeurs de ses attributs (ValueProperty, attribute) et de ceux de son type.
 * @param {string} id - Élément
 * @param {boolean} [vt] - Avec les valeurs de son type
 * @returns {{id:string, c:string[]}[]} lignes : propriété, valeur
 */
function capRapProps(id, vt){
  const e=capGetElementById_(id); if(!e) return [];
  const val=v=>{ const s=String(v||''), r=capParseAttrRefs_(s); return /^#/.test(s.trim())&&r.length?r.map(x=>capMxNom(capGetElementById_(x))).join(', '):capHtmlToText(s); };
  const rows=Object.entries(e.attrs).filter(([k,v])=>v!==''&&!CAP_RAP_PROPS_SAUF.has(k)).map(([k,v])=>({id, c:[k, val(v)]}));
  const {childrenOf}=capGetParentIndex(), vus=new Set();
  capRapAvecType(id, vt).forEach(x=>(childrenOf[x]||[]).map(capGetElementById_).forEach(c=>{   // valeurs de l'élément, puis de son type (un nom déjà vu n'est pas repris)
    if(c&&capRapEst(c,'valeurs')&&!vus.has(capMxNom(c))){ vus.add(capMxNom(c)); rows.push({id:c.id, c:[capMxNom(c), c.attrs.valeur||c.attrs.declaration||'']}); } }));
  return rows;
}
/** Valeur d'une colonne pour un élément. @param {object} e @param {object} col - {k, cle, rel, sens, steps} @returns {string} */
function capRapColVal(e, col){
  const noms=ids=>[...new Set(ids)].map(x=>capMxNom(capGetElementById_(x))).join(', ');
  const attr=rx=>{ const k=Object.keys(e.attrs).find(a=>rx.test(a)); return k?String(e.attrs[k]):''; };
  switch(col.k){
    case 'type': return capAnaHuman(e.typeName);
    case 'desc': return capHtmlToText(e.attrs.description||'');
    case 'owner': { const p=capGetElementById_(capGetParentIndex().parentOf[e.id]); return p?capMxNom(p):''; }
    case 'def': return noms(capRapDefs(e.id));
    case 'stereo': return String(e.attrs.stereotypes||'').split(' ').filter(Boolean).map(s=>'«'+s+'»').join(' ');
    case 'reqid': return attr(/(^|\.)(id|identifier|ReqIFIdentifier)$/i)||e.attrs.nomCourt||'';
    case 'reqtxt': { const v=attr(/(^|\.)(text|ReqIFText)$/i)||(capRapEst(e,'exigences')?e.attrs.description:'')||e.attrs.expression||''; if(v) return capHtmlToText(v);   // exigence : texte, sinon sa documentation
      const x=(capGetParentIndex().childrenOf[e.id]||[]).map(capGetElementById_).find(c=>c&&(c.attrs.expression||c.attrs.valeur));   // spécification d'une contrainte UML
      return x?x.attrs.expression||x.attrs.valeur:capHtmlToText(e.attrs.description||''); }
    case 'sens': return capRapSens(e);
    case 'attr': { const v=e.attrs[col.cle||'']; if(v==null) return ''; const r=capParseAttrRefs_(String(v)); return /^#/.test(String(v).trim())&&r.length?noms(r):capHtmlToText(String(v)); }
    case 'rel': return noms(capRapLies(e.id, col.rel||'*', col.sens||'deux').map(x=>x.id));
    case 'chemin': return capRapChemin(e, col.steps).map(x=>typeof x==='string'?x:capMxNom(x)).join(', ');
  }
  return '';
}
/** Libellé d'une colonne. @param {object} col @returns {string} */
function capRapColLib(col){
  if(col.l) return col.l;
  if(col.k==='attr') return col.cle||_L('Attribut');
  if(col.k==='rel') return capRapRelLib(col.rel)+(col.sens==='in'?' ←':col.sens==='out'?' →':'');
  if(col.k==='chemin') return capRapCheminLib(col.steps);
  return (CAP_RAP_COLS.find(c=>c.k===col.k)||{}).l||col.k;
}
/**
 * Lignes des tableaux propres aux modèles génériques, lues sur le modèle chargé (appelée par capDosListeLignes, 61).
 * @param {object} b - Bloc {k:'liste', cols:'perso'|'rel'|'cnx'|'props'|'port', …}
 * @returns {?{head:string[], rows:{id:string, c:string[]}[]}} null pour les autres tableaux
 */
function capRapLignes(b){
  if(!['perso','rel','cnx','props','port'].includes(b.cols)) return null;
  if(!capLoaded) return {head:[_L('Élément')], rows:[]};
  const els=()=>(b.ids||[]).map(id=>capGetElementById_(id)).filter(Boolean);
  if(b.cols==='perso'){ const cols=b.colonnes||[];
    return {head:[_L('Élément'), ...cols.map(capRapColLib)], rows:els().map(e=>({id:e.id, c:[capMxNom(e), ...cols.map(c=>capRapColVal(e, c))]}))}; }
  if(b.cols==='port') return {head:[_L('Port, pin ou paramètre'), _L('Sens'), _L('Typé par'), _L('Relié à')],
    rows:els().map(e=>({id:e.id, c:[capMxNom(e), capRapSens(e), capRapColVal(e,{k:'def'}), [...new Set(capRapLies(e.id, CAP_RAP_CNX, 'deux').map(x=>capRapNomQualif(x.id)))].join(', ')]}))};
  if(b.cols==='cnx') return {head:[_L('Connexion'), _L('De'), _L('Vers'), _L('Transporte')], rows:capRapCnx(b.src, b.quels||'tous', b.vt)};
  if(b.cols==='props') return {head:[_L('Propriété'), _L('Valeur')], rows:capRapProps(b.src, b.vt)};
  const vus=new Set(), rows=[], moi=capRapAvecType(b.src, b.vt);
  moi.forEach(x=>capRapLies(x, b.rel||'*', b.sens||'deux').forEach(y=>{ const k=y.k+y.sens+y.id; if(vus.has(k)||moi.includes(y.id)) return; vus.add(k);
    const o=capGetElementById_(y.id); if(o) rows.push({id:o.id, c:[capRapRelLib(y.k), y.sens==='out'?'→':'←', capMxNom(o), capAnaHuman(o.typeName)]}); }));
  return {head:[_L('Relation'), _L('Sens'), _L('Élément'), 'Type'], rows};
}
/** Description courte d'un tableau propre aux modèles génériques (éditeur du dossier). @param {object} b @returns {string} vide pour les autres */
function capRapListeLib(b){
  return {perso:_L('colonnes au choix'), rel:_L('liens : relation, sens, élément, type'), cnx:_L('connexions : de, vers, objets transportés'),
    props:_L('propriétés et valeurs'), port:_L('ports, pins et paramètres : sens, type, connexions')}[b.cols]||'';
}

/* ── Éditeur : réglages ──────────────────────────────────────────────── */

/**
 * Options du type d'un sélecteur générique : familles présentes, types, stéréotypes.
 * @param {string} v - Valeur choisie
 * @returns {string} HTML
 */
function capRapTypesOpts(v){
  const D=capLoaded?capRapTypesDispo():{fam:CAP_RAP_FAMILLES, types:[], st:[]}, esc=capEsc, sel=k=>k===(v||'*')?' selected':'';
  let h=`<optgroup label="${_L('Familles usuelles')}">`+D.fam.map(f=>`<option value="${f.k}"${sel(f.k)}>${esc(f.l)}${f.n?' ('+f.n+')':''}</option>`).join('')+'</optgroup>';
  if(D.types.length) h+=`<optgroup label="${_L('Types du modèle')}">`+D.types.map(t=>`<option value="t:${esc(t.k)}"${sel('t:'+t.k)}>${esc(capAnaHuman(t.k))} (${t.n})</option>`).join('')+'</optgroup>';
  if(D.st.length) h+=`<optgroup label="${_L('Stéréotypes')}">`+D.st.map(t=>`<option value="s:${esc(t.k)}"${sel('s:'+t.k)}>«${esc(t.k)}» (${t.n})</option>`).join('')+'</optgroup>';
  if(v&&!D.fam.some(f=>f.k===v)&&!D.types.some(t=>'t:'+t.k===v)&&!D.st.some(t=>'s:'+t.k===v)) h+=`<option value="${esc(v)}" selected>${esc(capRapTypeLib(v))} ${_L('(absent du modèle)')}</option>`;
  return h;
}
/**
 * Options d'une relation (catalogue de la ▦ Matrice), avec « toutes » et la valeur choisie si elle est absente.
 * @param {string} v - Relation choisie
 * @param {boolean} [tous] - Proposer « toutes les relations »
 * @returns {string} HTML
 */
function capRapRelsOpts(v, tous){
  const esc=capEsc, R=capLoaded?capRapRels():[];
  let h=(tous?`<option value="*"${!v||v==='*'?' selected':''}>${_L('toutes les relations')}</option>`:'')+R.map(r=>`<option value="${esc(r.k)}"${r.k===v?' selected':''}>${esc(r.l)} (${r.n})</option>`).join('');
  if(v&&v!=='*'&&!R.some(r=>r.k===v)) h+=`<option value="${esc(v)}" selected>${esc(capRapRelLib(v))}</option>`;
  return h;
}
/**
 * Réglages d'un sélecteur générique (boucle « pour chaque » ou tableau automatique).
 * @param {object} r - Sélecteur
 * @param {string} p - Attribut de saisie : 'bb' (boucle) ou 'ba' (contenu automatique)
 * @returns {string} HTML
 */
function capRapGenHtml(r, p){
  const esc=capEsc, P=r.portee||'tout';
  let h=`<select data-${p}="g" title="${_L('Type d\'élément : famille usuelle, type exact ou stéréotype du modèle')}">${capRapTypesOpts(r.g)}</select>`+
    `<select data-${p}="portee" title="${_L('Où chercher : « élément englobant » = élément de la boucle englobante, sinon 🎯 sujet du modèle')}">${capRapOpts(CAP_RAP_PORTEES, P)}</select>`;
  if(P==='dans') h+=(r.ref?capHomeChip(capHomeRefEl(r.ref.id)||{k:'el', id:r.ref.id, nom:r.ref.nom, type:'', couche:''},''):'')+
    `<button class="cap-lf-btn" data-da="rap-dans" title="${_L('Choisir le paquetage ou le bloc où chercher')}">${_L('📍 Choisir…')}</button>`;
  if(P==='dans'||P==='ctx') h+=`<label class="dos-opt"><input type="checkbox" data-${p}="direct"${r.direct?' checked':''}> ${_L('directement')}</label>`;
  if(P==='rel') h+=`<select data-${p}="rel" title="${_L('Relation (liaisons du lecteur, relations Capella)')}">${capRapRelsOpts(r.rel, true)}</select><select data-${p}="sens">${capRapOpts(CAP_RAP_SENS, r.sens||'deux')}</select>`+
    `<select data-${p}="de" title="${_L('Partir de l\'élément (et de son type) ou de tout son intérieur')}">${capRapOpts([{k:'', l:_L('de l\'élément')}, {k:'int', l:_L('de l\'élément et de son intérieur')}], r.de)}</select>`;
  if(P==='chemin') h+=`<button class="cap-lf-btn" data-da="rap-ch" data-ci="" title="${_L('Définir le chemin suivi depuis l\'élément englobant')}">✨ ${esc(capRapCheminLib(r.steps))}</button>`;
  if(P==='ctx'||(P==='rel'&&r.de!=='int')) h+=`<label class="dos-opt" title="${_L('Chercher aussi depuis ce qui type l\'élément (bloc d\'une part, part def d\'une part…)')}"><input type="checkbox" data-${p}="vt"${r.vt!==false?' checked':''}> ${_L('et son type')}</label>`;
  h+=`<input data-${p}="nom" value="${esc(r.nom||'')}" placeholder="${_L('nom contient…')}" style="width:105px">`+
    `<input data-${p}="q" value="${esc(r.q||'')}" placeholder="${_L('texte contient (a|b)…')}" title="${_L('Expression cherchée dans le nom, la description et les propriétés (« | » : ou)')}" style="width:120px">`+
    `<select data-${p}="tri">${capRapOpts([{k:'', l:_L('ordre du modèle')}, {k:'nom', l:_L('par nom')}], r.tri)}</select>`;
  return h;
}
/**
 * Colonnes d'un tableau automatique générique.
 * @param {object} b - Bloc {colonnes:[{k, l, cle, rel, sens, steps}]}
 * @returns {string} HTML
 */
function capRapColsHtml(b){
  const esc=capEsc, cols=b.colonnes||[];
  return `<div class="dos-rap-cols"><span class="ana-dim">${_L('Colonnes : Élément')}</span>`+cols.map((c,i)=>`<span class="dos-rap-col">`+
    `<select data-bc="${i}.k">${capRapOpts(CAP_RAP_COLS, c.k)}</select>`+
    (c.k==='attr'?`<input data-bc="${i}.cle" value="${esc(c.cle||'')}" placeholder="${_L('attribut (ex. Requirement.text)')}" list="dos-rap-attrs" style="width:130px">`:'')+
    (c.k==='rel'?`<select data-bc="${i}.rel">${capRapRelsOpts(c.rel, true)}</select><select data-bc="${i}.sens">${capRapOpts([{k:'deux', l:'⇄'}, {k:'out', l:_L('→ (ligne → eux)')}, {k:'in', l:_L('← (eux → ligne)')}], c.sens||'deux')}</select>`:'')+
    (c.k==='chemin'?`<button class="cap-lf-btn" data-da="rap-ch" data-ci="${i}" title="${_L('Définir le chemin suivi depuis chaque ligne')}">✨ ${esc(capRapCheminLib(c.steps))}</button>`:'')+
    `<input data-bc="${i}.l" value="${esc(c.l||'')}" placeholder="${esc(capRapColLib(Object.assign({}, c, {l:''})))}" title="${_L('Titre de la colonne')}" style="width:100px">`+
    `<button class="cap-lf-btn" data-da="rap-col-del" data-ci="${i}" title="${_L('Retirer la colonne')}">✕</button></span>`).join('')+
    `<button class="cap-lf-btn" data-da="rap-col-add" title="${_L('Ajouter une colonne')}">${_L('＋ Colonne')}</button>`+
    `<datalist id="dos-rap-attrs">${capLoaded?capGetAllRawAttrKeys().filter(k=>!CAP_RAP_PROPS_SAUF.has(k)).slice(0,400).map(k=>`<option value="${esc(k)}">`).join(''):''}</datalist></div>`;
}
/**
 * Saisie d'une colonne (data-bc="<indice>.<champ>").
 * @param {object} b - Bloc
 * @param {HTMLElement} t - Champ saisi
 * @param {Event} e - Événement
 * @returns {boolean} vrai si traité
 */
function capRapColInput(b, t, e){
  const [i, k]=String(t.dataset.bc).split('.'), c=(b.colonnes||[])[+i]; if(!c) return true;
  const liste=t.tagName==='SELECT'; if(liste&&e.type!=='change') return true;
  c[k]=t.value; if(liste){ capHomeSave(); capHomeRender(); } else capHomeSaveLater(); return true;
}
/** En-tête d'un 🧩 modèle : 🎯 sujet du rapport. @param {object} d - Modèle @returns {string} HTML */
function capRapSujetHtml(d){
  const r=d.sujet&&(capHomeRefEl(d.sujet.id)||{k:'el', id:d.sujet.id, nom:d.sujet.nom, type:'', couche:''});
  return `<div class="hm-row dos-sujet"><b title="${_L('Système ou sous-système décrit : élément englobant des boucles et contenus de premier niveau ; {sujet} dans les titres et textes')}">${_L('🎯 Sujet du rapport')}</b>`+
    (r?capHomeChip(r,'')+`<span class="hm-chip-x" data-da="rap-sujet-x" title="${_L('Retirer le sujet')}">✕</span>`:`<span class="ana-dim">${_L('aucun : les boucles partent du modèle entier')}</span>`)+
    `<button class="cap-lf-btn" data-da="rap-sujet" title="${_L('Choisir le système ou le sous-système décrit (bloc, part…)')}">${_L('📍 Choisir…')}</button>`+
    `<span class="ana-dim">${_L('Le même modèle sert pour un sous-système : changez seulement le sujet.')}</span></div>`;
}

/* ── Éditeur : actions ───────────────────────────────────────────────── */

/**
 * Actions propres aux modèles génériques (délégation depuis capDosClick, 61).
 * @param {string} act - Action (data-da)
 * @param {HTMLElement} a - Bouton
 * @param {?object} d - Dossier ou modèle
 * @param {?{b:object}} f - Bloc concerné
 * @param {Window} W - Fenêtre
 * @param {MouseEvent} e - Clic
 * @returns {boolean} vrai si traité
 */
function capRapAct(act, a, d, f, W, e){
  const cible=()=>f?(f.b.boucle||f.b):null, fin=()=>{ capHomeSave(); capHomeRender(); };
  switch(act){
    case 'rap-sss': case 'rap-ssdd': capRapModeleSs(act.slice(4)); return true;
    case 'rap-sujet': if(d) capDosChoisir(W, e.clientX, e.clientY, 'el', r=>{ if(r.k!=='el') return; d.sujet={id:r.id, nom:r.nom}; fin(); }); return true;
    case 'rap-sujet-x': if(d){ delete d.sujet; fin(); } return true;
    case 'rap-dans': if(cible()) capDosChoisir(W, e.clientX, e.clientY, 'el', r=>{ if(r.k!=='el') return; cible().ref={id:r.id, nom:r.nom}; fin(); }); return true;
    case 'rap-col-add': if(f){ (f.b.colonnes=f.b.colonnes||[]).push({k:'desc'}); fin(); } return true;
    case 'rap-col-del': if(f&&f.b.colonnes){ f.b.colonnes.splice(+a.dataset.ci,1); fin(); } return true;
    case 'rap-ch': { if(!f) return true; const ci=a.dataset.ci, o=ci===''?cible():(f.b.colonnes||[])[+ci]; if(!o) return true;
      capRapCheminDialog(o.steps, ci!==''||f.b.k==='auto'&&f.b.quoi==='chemin', st=>{ o.steps=st; fin(); }); return true; }
  }
  return false;
}
/**
 * Éditeur d'un ✨ chemin pour un modèle de rapport : type de départ (exemple de l'aperçu), étapes du moteur de la colonne par chemin,
 * dernière étape terminale permise (valeur à afficher), aperçu en direct (capPpRender, 21). La première étape ne contraint pas le type
 * de l'élément de départ à la génération (capRapChemin).
 * @param {?object[]} steps0 - Étapes actuelles
 * @param {boolean} valeur - Dernière étape terminale permise (colonne, information par chemin)
 * @param {function(object[]):void} cb - Reçoit les étapes enregistrées
 */
function capRapCheminDialog(steps0, valeur, cb){
  if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle.')); return; }
  const esc=capEsc, types=capGetMetachainMetaclasses();
  let steps=steps0&&steps0.length?JSON.parse(JSON.stringify(steps0)):[{metaclass:types[0]||null, property:null}];
  let ov=document.getElementById('dos-rap-ch-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='dos-rap-ch-ov'; document.body.appendChild(ov); ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  ov.innerHTML=`<div class="cw-d-box" style="max-width:760px"><div class="cw-d-hdr"><b>${_L('✨ Chemin')}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body"><div class="cw-d-sub">${_L('Suivre des relations d\'affilée depuis l\'élément de la boucle (ou de la ligne du tableau). Le type de départ sert à construire les étapes et l\'aperçu ; à la génération, le chemin part de chaque élément, quel que soit son type.')+(valeur?' '+_L('La dernière étape peut être une valeur (nom, attribut…).'):'')}</div>
      <div class="cmx-ps">${_L('Étapes')}</div><div data-steps></div><button class="cmx-add" data-add>${_L('＋ Étape')}</button>
      <div class="cmx-pp" id="rap-customcol-preview"></div></div>
    <div class="cw-d-ftr"><span data-err style="color:var(--c-err,#f85149)"></span><span style="flex:1"></span>
      <button class="cap-lf-btn" data-c="x">${_L('Annuler')}</button><button class="phl-export-btn" data-c="ok">${_L('💾 Enregistrer')}</button></div></div>`;
  ov.style.display='flex';
  const draw=()=>{
    for(let i=1;i<steps.length;i++){ const pr=steps[i-1]; steps[i].metaclass=pr.property?pr.property.resultType:null; }
    const box=ov.querySelector('[data-steps]');
    box.innerHTML=steps.map((s,i)=>{ const last=i===steps.length-1, props=s.metaclass?capGetMetachainProperties(s.metaclass).filter(p=>!p.isTerminal||(valeur&&last)):[];
      return `<div class="cmx-step"><span class="cap-step-num">${i+1}</span>${i===0?`<select class="inp" data-mc aria-label="${_L('Type de départ')}">${types.map(x=>`<option value="${esc(x)}"${x===s.metaclass?' selected':''}>${esc(capAnaHuman(x))}</option>`).join('')}</select>`:`<span class="ana-dim">${esc(capAnaHuman(s.metaclass||''))}</span>`}`+
        `<select class="inp" data-p="${i}" aria-label="${_L(`Propriété de l'étape ${i+1}`)}"><option value="">${_L('— choisir une propriété —')}</option>${props.map(p=>`<option value="${esc(p.key)}"${s.property&&s.property.key===p.key?' selected':''}>${esc(p.label)}${p.isTerminal?'':' ['+esc(capAnaHuman(p.resultType||''))+']'}</option>`).join('')}</select>`+
        `<button class="cap-lf-btn" data-x="${i}" title="${_L('Supprimer cette étape et les suivantes')}"${steps.length>1?'':' disabled'}>✕</button></div>`; }).join('');
    const mc=box.querySelector('[data-mc]'); if(mc) mc.onchange=()=>{ steps=[{metaclass:mc.value, property:null}]; draw(); };
    box.querySelectorAll('[data-p]').forEach(sel=>sel.onchange=()=>{ const i=+sel.dataset.p, s=steps[i]; s.property=capGetMetachainProperties(s.metaclass).find(p=>p.key===sel.value)||null; steps=steps.slice(0,i+1); draw(); });
    box.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.x; steps=steps.slice(0,Math.max(1,i)); if(i===0) steps[0].property=null; draw(); });
    const last=steps[steps.length-1]; ov.querySelector('[data-add]').disabled=!(last.property&&last.property.resultType&&!last.property.isTerminal);
    if(!_capPpState.rap) _capPpState.rap={type:null, id:null, q:'', auto:true};
    capPpRender('rap', steps, {res:_L('▣ Résultat pour cet élément')});
  };
  draw();
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  ov.querySelector('[data-c="ok"]').onclick=()=>{
    if(!steps.every(s=>s.property)){ ov.querySelector('[data-err]').textContent=_L('Chaque étape doit avoir une propriété.'); return; }
    ov.style.display='none'; cb(steps);
  };
}

/* ── Génération ──────────────────────────────────────────────────────── */

/**
 * Contenu automatique générique pour l'élément englobant (appelée par capRapEval, 63).
 * @param {object} b - Bloc {k:'auto', quoi, …}
 * @param {?object} ctx - Élément englobant {id, el, nom…}
 * @param {object} o - capDosOutils()
 * @returns {?object[]} blocs produits, ou null si le contenu n'est pas l'un des contenus génériques
 */
function capRapAutoGen(b, ctx, o){
  const c=ctx&&ctx.el, tit=d=>capRapFill(b.titre||d, ctx), id=()=>capHomeUid(), garde=(blk, n)=>n||b.vide?[blk]:[];
  switch(b.quoi){
    case 'props': { if(!c) return []; const blk={id:id(), k:'liste', titre:tit(_L('Propriétés de « {nom} »')), ids:[], cols:'props', src:c.id, vt:b.vt!==false}; return garde(blk, capRapLignes(blk).rows.length); }
    case 'rel': { if(!c) return []; const blk={id:id(), k:'liste', titre:tit(_L('Liens de « {nom} »')), ids:[], cols:'rel', src:c.id, rel:b.rel||'*', sens:b.sens||'deux', vt:b.vt!==false}; return garde(blk, capRapLignes(blk).rows.length); }
    case 'cnx': { if(!c) return []; const blk={id:id(), k:'liste', titre:tit(_L('Connexions de « {nom} »')), ids:[], cols:'cnx', src:c.id, quels:b.quels||'tous', vt:b.vt!==false}; return garde(blk, capRapLignes(blk).rows.length); }
    case 'ports': { if(!c) return []; const l=capRapPorts(c.id, b.sens||'', b.vt);
      const d=b.sens==='in'?_L('Entrées de « {nom} »'):b.sens==='out'?_L('Sorties de « {nom} »'):_L('Ports, pins et paramètres de « {nom} »');
      return garde({id:id(), k:'liste', titre:tit(d), ids:l.map(e=>e.id), cols:'port'}, l.length); }
    case 'chemin': { if(!c) return []; const res=capRapChemin(c, b.steps), lab=tit(capRapCheminLib(b.steps));
      if(res.length&&typeof res[0]!=='string') return [o.Lst(lab, res.filter(x=>x&&x.id))];
      return res.length||b.vide?[o.T(lab+' : '+(res.join(', ')||'—'))]:[]; }
  }
  return null;
}
/**
 * Élément englobant d'un rapport généré : 🎯 sujet du modèle, s'il existe dans le modèle chargé.
 * @param {object} m - Modèle
 * @param {object} o - capDosOutils()
 * @returns {?object} {id, el, nom, type, couche, sujet}
 */
function capRapSujetCtx(m, o){
  const e=m&&m.sujet&&capLoaded&&capGetElementById_(m.sujet.id); if(!e) return null;
  return {id:e.id, el:e, nom:e.attrs.name||'', type:capAnaHuman(e.typeName), couche:o.couche(e)||'', sujet:e.attrs.name||''};
}

/* ── Plans SSS / SSDD à adapter ──────────────────────────────────────── */

/**
 * Système le plus probable d'un modèle SysML : sujet des cas d'utilisation ou des exigences, sinon part de premier niveau
 * (instance système, SysML v2), sinon bloc qui compose le plus d'autres blocs sans être lui-même composé.
 * @returns {?object} élément
 */
function capRapSysteme(){
  const I=capRapRelIdx(), P=capGetParentIndex().parentOf, cpt=new Map(), plus=(id,n)=>cpt.set(id,(cpt.get(id)||0)+n);
  const struct=e=>capRapEst(e,'blocs')||capRapEst(e,'parts');
  I.out.forEach((l,s)=>l.forEach(x=>{ if(x.k!=='sy:sujet') return; [s, x.id].forEach(id=>{ const e=capGetElementById_(id); if(struct(e)) plus(id, 10); }); }));
  capAllElements.forEach(e=>{ if(!struct(e)) return; const p=capGetElementById_(P[e.id]);
    if(e.typeName==='PartUsage'&&p&&capRapEst(p,'paquetages')) plus(e.id, 5+capRapInterieur(e.id).size/1000);
    const n=(I.out.get(e.id)||[]).filter(x=>x.k==='sy:composition').length, compose=(I.in.get(e.id)||[]).some(x=>x.k==='sy:composition');
    if(n) plus(e.id, (compose?1:3)+n/100); });
  // une part de premier niveau typée par le bloc élu lui est préférée (SysML v2 : l'instance système porte perform / exhibit)
  let best=null, bn=0; cpt.forEach((n,id)=>{ if(n>bn){ bn=n; best=id; } });
  const u=best&&(capRapRelIdx().in.get(best)||[]).filter(x=>x.k==='sy:typage').map(x=>capGetElementById_(x.id))
    .find(e=>e&&e.typeName==='PartUsage'&&capRapEst(capGetElementById_(P[e.id]),'paquetages'));
  if(u) best=u.id;
  return best?capGetElementById_(best):capAllElements.find(e=>capRapEst(e,'blocs'))||null;
}
/**
 * Crée un 🧩 modèle SSS ou SSDD (MIL-STD-498) pensé pour SysML, à adapter : numérotation du DID, boucles et contenus génériques,
 * sujet = système probable (capRapSysteme), invites « [À compléter — …] » ; ouvert dans l'éditeur (▶ Générer le rapport).
 * @param {string} k - 'sss' | 'ssdd'
 * @returns {?object} modèle
 */
function capRapModeleSs(k){
  if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle.')); return null; }
  const id=()=>capHomeUid(), T=txt=>({id:id(), k:'txt', txt}), Q=q=>T(_L(`[À compléter — ${q}]`));
  const C=(titre, blocs)=>({id:id(), k:'chap', titre, ref:null, desc:false, blocs:blocs.filter(Boolean)});
  const A=(quoi, p)=>Object.assign({id:id(), k:'auto', quoi}, p||{});
  const B=(titre, sel, blocs)=>({id:id(), k:'chap', titre, ref:null, desc:true, boucle:Object.assign({type:'gen', max:40, vide:'rien'}, sel), blocs:blocs.filter(Boolean)});
  const Lg=(titre, sel, colonnes)=>A('liste', Object.assign({type:'gen', titre}, sel, colonnes?{colonnes}:{}));
  const FN='sy:allocate|sy:allocation|sy:perform', REQ=[{k:'reqid'}, {k:'reqtxt'}, {k:'rel', rel:'sy:satisfy', sens:'in', l:_L('Satisfaite par')}, {k:'rel', rel:'sy:verify', sens:'in', l:_L('Vérifiée par')}];
  const reqs=(titre, q)=>Lg(titre, {g:'exigences', portee:'tout', q}, REQ);
  const Sec=(titre, q, quoi)=>C(titre, [reqs(_L(`Exigences repérées : ${titre}`), q), Q(quoi)]);
  const sys=capRapSysteme(), sss=k==='sss';
  // dans une boucle, la description de l'élément est reprise par la case « Description » du chapitre : pas de contenu « description » en plus
  const fonction=[C(_L('Entrées'), [A('ports',{sens:'in', vide:true})]), C(_L('Sorties'), [A('ports',{sens:'out', vide:true})]), A('diags'),
    A('rel',{rel:'sy:satisfy|sy:refine|sy:trace', sens:'deux', titre:_L('Exigences liées à « {nom} »')})];
  const debut=doc=>[
    C(_L('Domaine d\'application'), [
      C(_L('Identification'), [Q(_L('identification complète : numéro, titre, abréviation, version, édition du système ou du sous-système')), T(_L('Objet décrit : {sujet}.'))]),
      C(_L('Présentation du système'), [A('desc'), A('diags'), Lg(_L('Cas d\'utilisation de « {nom} »'), {g:'uc', portee:'rel', rel:'sy:sujet', sens:'deux'}),
        Q(_L('objet général du système, nature, historique, parties prenantes (client, utilisateurs, développeur, soutien), sites d\'exploitation'))]),
      C(_L('Présentation du document'), [T(doc), Q(_L('exigences de sécurité ou de confidentialité liées à l\'usage du document'))])]),
    C(_L('Documents de référence'), [Q(_L('numéro, titre, révision et date de tous les documents cités, et leur origine'))])];
  const tracab=C(_L('Traçabilité des exigences'), [Lg(_L('Exigences et éléments liés'), {g:'exigences', portee:'tout'},
    [{k:'reqid'}, {k:'rel', rel:'sy:satisfy', sens:'in', l:_L('Satisfaite par')}, {k:'rel', rel:'sy:verify', sens:'in', l:_L('Vérifiée par')}, {k:'rel', rel:'sy:deriveReqt|sy:refine|sy:trace', sens:'deux', l:_L('Dérivée, raffinée, tracée')}]),
    Q(_L('traçabilité de chaque exigence vers les exigences du niveau supérieur qu\'elle couvre, et inversement'))]);
  const notes=C(_L('Notes'), [Q(_L('informations générales : sigles, abréviations, glossaire'))]);
  const blocs=sss?[
    ...debut(_L('Ce document spécifie les exigences du système (ou du sous-système) et les méthodes à employer pour vérifier que chacune est satisfaite (plan MIL-STD-498, DID DI-IPSC-81431). Il est produit à partir du modèle SysML, puis complété.')),
    C(_L('Exigences'), [
      C(_L('États et modes requis'), [B('{nom}', {g:'etats', portee:'int'}, [A('diags'), Lg(_L('États de « {nom} »'), {g:'etatsSimples', portee:'ctx'})]),
        Q(_L('états et modes dans lesquels le système doit fonctionner, et exigences propres à chacun'))]),
      C(_L('Exigences de capacité du système'), [B('{nom}', {g:'uc', portee:'rel', rel:'sy:sujet', sens:'deux'}, [A('rel',{rel:'*', titre:_L('Liens de « {nom} »')}), A('diags'),
          Q(_L('exigences de capacité : comportement attendu, performances, conditions, réaction aux situations imprévues'))]),
        B('{nom}', {g:'fonctions', portee:'rel', rel:FN, sens:'deux', de:'int'}, [...fonction, Q(_L('exigences fonctionnelles et de performances de cette capacité'))])]),
      C(_L('Exigences d\'interfaces externes'), [
        C(_L('Identification des interfaces et diagrammes'), [A('ports',{titre:_L('Ports de « {nom} »')}), A('cnx',{quels:'ext', titre:_L('Connexions de « {nom} » avec l\'extérieur')}),
          Q(_L('identification des interfaces externes, entités concernées, interfaces fixées et à développer'))]),
        B('{nom}', {g:'acteurs', portee:'tout'}, [A('rel',{rel:'*', titre:_L('Liens de « {nom} »')}), Q(_L('exigences de l\'interface avec cet acteur'))]),
        B('{nom}', {g:'ports', portee:'ctx', direct:true}, [A('props'), A('cnx',{quels:'ext'}),
          Q(_L('priorité de l\'interface, type (temps réel, stockage…), éléments de données (format, unités, précision, fréquence), protocoles, caractéristiques physiques'))])]),
      C(_L('Exigences d\'interfaces internes'), [A('cnx',{quels:'int', titre:_L('Connexions internes de « {nom} »'), vide:true}), Q(_L('exigences imposées aux interfaces internes ; peut être laissé à la conception (SSDD)'))]),
      C(_L('Exigences sur les données internes'), [Lg(_L('Objets échangés'), {g:'items', portee:'tout'}, [{k:'desc'}]), Lg(_L('Interfaces'), {g:'interfaces', portee:'tout'}, [{k:'desc'}]),
        Q(_L('données internes au système : bases de données, fichiers ; peut être laissé à la conception'))]),
      Sec(_L('Exigences d\'adaptation'), 'adaptation|param[eé]tr|configur|site', _L('données dépendantes de l\'installation ou paramètres d\'exploitation à fournir')),
      Sec(_L('Exigences de sécurité (sûreté)'), 's[ûu]ret[ée]|safety|danger|risque|hazard', _L('prévention ou réduction des risques pour les personnes, les biens et l\'environnement')),
      Sec(_L('Exigences de sécurité et de confidentialité'), 'security|confidential|privacy|cyber|chiffr|authentif', _L('environnement de sécurité, type et degré de sécurité ou de confidentialité, critères de certification')),
      Sec(_L('Exigences d\'environnement du système'), 'environnement|environment|temp[ée]rature|vibration|humidit|climat|thermal|thermique', _L('environnement d\'utilisation : matériel, système d\'exploitation, conditions climatiques, mécaniques…')),
      C(_L('Exigences sur les ressources informatiques'), [
        Sec(_L('Matériel informatique'), 'mat[ée]riel|hardware|processeur|processor|calculateur|computer', _L('matériel informatique à utiliser : nombre, type, taille, capacité')),
        Sec(_L('Utilisation des ressources matérielles'), 'm[ée]moire|memory|\\bcpu\\b|bande passante|bandwidth|power|puissance', _L('marges d\'utilisation : processeur, mémoire, entrées / sorties, stockage, réseau')),
        Sec(_L('Logiciel informatique'), 'logiciel|software|operating system', _L('logiciels à utiliser ou à intégrer : système d\'exploitation, bases de données, bibliothèques')),
        Sec(_L('Communications informatiques'), 'r[ée]seau|network|communication|protocol|downlink|liaison', _L('communications : localisation, configuration, débit, protocoles'))]),
      Sec(_L('Facteurs de qualité du système'), 'qualit|fiabilit|reliab|maintenab|disponib|availab|testab|portab|usab', _L('fiabilité, maintenabilité, disponibilité, souplesse, portabilité, réutilisabilité, testabilité, facilité d\'utilisation')),
      C(_L('Contraintes de conception et de construction'), [Lg(_L('Contraintes de « {nom} »'), {g:'contraintes', portee:'int'}, [{k:'owner'}, {k:'reqtxt'}]),
        A('props',{titre:_L('Propriétés et valeurs de « {nom} »')}), reqs(_L('Exigences de contraintes'), 'contrainte|constraint|impos|norme|standard|masse|mass'),
        Q(_L('contraintes de conception et de construction : architecture imposée, composants, normes, matériaux, réutilisation'))]),
      Sec(_L('Exigences liées au personnel'), 'personnel|op[ée]rateur|operator|ergonom|human', _L('effectifs, compétences, postes de travail, facteurs humains')),
      Sec(_L('Exigences liées à la formation'), 'formation|training', _L('formation à fournir : matériel, logiciels, documentation, simulateurs')),
      Sec(_L('Exigences liées à la logistique'), 'logisti|maintenance|soutien|rechange|spare|maintain', _L('maintenance, soutien logiciel, transport, approvisionnement, installations')),
      C(_L('Autres exigences'), [Q(_L('autres exigences : documentation à fournir, etc.'))]),
      Sec(_L('Exigences d\'emballage'), 'emballage|packag|conditionnement|livraison', _L('emballage, marquage, manutention pour la livraison')),
      C(_L('Priorité et criticité des exigences'), [reqs(_L('Exigences du périmètre'), ''), Q(_L('ordre de priorité, criticité ou poids des exigences (sûreté, sécurité, confidentialité…)'))])]),
    C(_L('Dispositions de qualification'), [T(_L('Méthodes : Démonstration · Essai · Analyse · Inspection · Méthodes particulières (simulations, maquettes…). La colonne « Vérification » reprend l\'attribut ou la propriété de chaque exigence.')),
      Lg(_L('Méthode de qualification de chaque exigence'), {g:'exigences', portee:'tout'}, [{k:'reqid'}, {k:'rel', rel:'sy:verify', sens:'in', l:_L('Vérifiée par')}, {k:'attr', cle:'verifyMethod', l:_L('Vérification')}]),
      Q(_L('méthode de qualification de chaque exigence de la section 3'))]),
    tracab, notes]
  :[
    ...debut(_L('Ce document décrit la conception du système (ou du sous-système) dans son ensemble et son architecture (plan MIL-STD-498, DID DI-IPSC-81432). Il est produit à partir du modèle SysML, puis complété.')),
    C(_L('Décisions de conception à l\'échelle du système'), [A('desc'), A('ports',{titre:_L('Ports de « {nom} »')}), A('cnx',{quels:'ext', titre:_L('Entrées et sorties (échanges avec l\'extérieur)')}),
      Q(_L('décisions de conception à l\'échelle du système : comportement vu de l\'utilisateur, entrées et sorties, réactions aux conditions anormales, bases de données, choix de sûreté et de sécurité, justification des choix'))]),
    C(_L('Architecture du système'), [
      C(_L('Composants du système'), [A('diags'), Lg(_L('Composants'), {g:'parts', portee:'ctx', direct:true}, [{k:'def'}, {k:'desc'}]),
        B('{nom}', {g:'parts', portee:'ctx', direct:true}, [A('props'),
          C(_L('Fonctions allouées'), [B('{nom}', {g:'fonctions', portee:'rel', rel:FN, sens:'deux'}, fonction)]),
          C(_L('Ports'), [A('ports',{vide:true})]), A('cnx',{quels:'ext'}), A('diags'),
          Q(_L('rôle du composant, exigences qui lui sont allouées, type (matériel, logiciel, manuel), état de développement (nouveau, réutilisé), ressources informatiques'))])]),
      C(_L('Concept d\'exécution'), [B('{nom}', {g:'fonctions', portee:'rel', rel:FN, sens:'deux', de:'int'}, [A('diags')]),
        B('{nom}', {g:'etats', portee:'int'}, [A('diags')]), B('{nom}', {g:'interactions', portee:'tout'}, [A('diags')]),
        Q(_L('concept d\'exécution entre les composants : flux de commande et de données, comportement dynamique, états et modes, séquencement, concurrence, gestion des erreurs'))]),
      C(_L('Conception des interfaces'), [
        C(_L('Identification des interfaces et diagrammes'), [A('cnx',{quels:'int', titre:_L('Connexions internes de « {nom} »'), vide:true}), Lg(_L('Interfaces'), {g:'interfaces', portee:'tout'}, [{k:'desc'}]),
          Q(_L('identification des interfaces entre composants et avec l\'extérieur, entités concernées'))]),
        B('{nom}', {g:'connecteurs', portee:'int'}, [A('rel',{rel:'*', titre:_L('Liens de « {nom} »')}),
          Q(_L('type d\'interface, éléments de données (format, unités, précision, fréquence, priorité), protocoles, caractéristiques physiques'))])])]),
    tracab, notes];
  const g=capDosGabarits().find(x=>x.k===k), m=capDosNouveau((g?g.l.replace(/^\S+\s/,''):k.toUpperCase())+_L(' — modèle SysML'));
  _capHomeUi.tab='rap';
  Object.assign(m, {modele:true, commentaires:false, gab:'', formats:[capRapFormat()], sujet:sys?{id:sys.id, nom:sys.attrs.name||''}:undefined, blocs,
    consignes:_L('Document produit automatiquement à partir du modèle, puis complété : relisez chaque chapitre et commentez ce qui est faux, manquant ou ambigu.')});
  if(!m.sujet) delete m.sujet;
  capHomeSave(); capHomeRender();
  capWatchFlash(_L(`✔ Modèle ${k.toUpperCase()} créé${sys?` pour « ${sys.attrs.name||''} »`:''} : adaptez boucles et contenus, puis ▶ Générer le rapport`));
  return m;
}
/** ✚ Nouveau modèle sur un modèle SysML / UML : exemple de boucles génériques (blocs, ports, fonctions allouées, exigences). @returns {object} modèle */
function capRapNouveauSysml(){
  const id=()=>capHomeUid(), T=txt=>({id:id(), k:'txt', txt}), A=(quoi,p)=>Object.assign({id:id(), k:'auto', quoi}, p||{});
  const B=(titre, sel, blocs)=>({id:id(), k:'chap', titre, ref:null, desc:true, boucle:Object.assign({type:'gen', max:30}, sel), blocs});
  const m=capDosNouveau(_L('Mon modèle de rapport')), sys=capRapSysteme();
  _capHomeUi.tab='rap';
  Object.assign(m, {modele:true, commentaires:false, consignes:'', formats:[capRapFormat()], blocs:[
    {id:id(), k:'chap', titre:_L('Objet'), ref:null, desc:false, blocs:[T(_L('[À rédiger — objet du document]')), A('desc'), A('diags')]},
    {id:id(), k:'chap', titre:_L('Composants de {sujet}'), ref:null, desc:false, blocs:[
      B('{nom}', {g:'parts', portee:'ctx', direct:true}, [A('ports'), A('cnx',{quels:'ext'}),
        {id:id(), k:'chap', titre:_L('Fonctions allouées'), ref:null, desc:false, blocs:[B('{nom}', {g:'fonctions', portee:'rel', rel:'sy:allocate|sy:allocation|sy:perform', sens:'deux'}, [A('ports',{sens:'in', titre:_L('Entrées de « {nom} »')}), A('ports',{sens:'out', titre:_L('Sorties de « {nom} »')}), A('diags')])]}])]},
    {id:id(), k:'chap', titre:_L('Exigences'), ref:null, desc:false, blocs:[A('liste',{type:'gen', g:'exigences', portee:'tout', titre:_L('Exigences'), colonnes:[{k:'reqid'}, {k:'reqtxt'}, {k:'rel', rel:'sy:satisfy', sens:'in', l:_L('Satisfaite par')}]})]}]});
  if(sys) m.sujet={id:sys.id, nom:sys.attrs.name||''};
  capHomeSave(); capHomeRender(); return m;
}
/** Boutons des plans SSS / SSDD à adapter, dans 📘 Plans types, sur un modèle SysML / UML (vide pour Capella). @returns {string} HTML */
function capRapPlansHtml(){
  if(!capLoaded||capRapFormat()==='capella') return '';
  return `<div class="dos-rap-t" style="margin-top:4px" title="${_L('Plans livrés comme 🧩 modèles : boucles, portées et contenus se règlent, puis ▶ Générer le rapport')}">${_L('🧩 Plans SysML à adapter')}</div>`+
    `<button class="cap-lf-btn dos-rap-b" data-da="rap-sss" title="${_L('Modèle SSS (MIL-STD-498) pour SysML : exigences, états et modes, capacités, interfaces, qualification, traçabilité ; sujet = système (modifiable)')}">${_L('SSS — modèle SysML à adapter')}</button>`+
    `<button class="cap-lf-btn dos-rap-b" data-da="rap-ssdd" title="${_L('Modèle SSDD (MIL-STD-498) pour SysML : composants (parts), fonctions allouées avec entrées / sorties et diagrammes, concept d\'exécution, interfaces ; sujet = système (modifiable)')}">${_L('SSDD — modèle SysML à adapter')}</button>`+
    `<div class="dos-rap-t" style="margin-top:4px">${_L('📘 Plans Capella (peu remplis sur ce format)')}</div>`;
}
