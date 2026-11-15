/* ═══════════════════════════════════════════════════════════════════════
   🔲 ÉLÉMENTS REPRÉSENTÉS des diagrammes dans les 📑 dossiers de relecture et les 📘 rapports automatiques
   ───────────────────────────────────────────────────────────────────────
   Réglages du bloc « diagramme » d'un dossier (b.elems : on / off ; b.eo : options) :
   - types d'éléments retenus : catégories (ƒ Fonctions, ⇆ Échanges fonctionnels, 🧩 Ports…) et types exacts écartés,
     proposés d'après les éléments présents sur le diagramme (index des présences, sinon SVG exporté) ;
   - informations affichées : type, couche, description, ports montrés, source → cible, éléments échangés,
     allocation, propriétaire, ID, attributs du modèle au choix ;
   - regroupement par catégorie ; présentation : tableau sous la figure, un sous-chapitre par catégorie, ou un
     sous-chapitre par élément (avec renvoi « voir § » pour un élément déjà détaillé plus haut) ;
   - 📘 modèles de rapport : mêmes réglages sur les diagrammes produits par une boucle ou un contenu automatique,
     « centré sur l'élément de la boucle » (lui, ses ports, ses échanges et leurs extrémités, ses allocations).
   Boucles : filtres « montrés sur le diagramme de la boucle englobante », « sur au moins un / aucun diagramme »,
   diagrammes montrant l'élément englobant ; contenu automatique « présence des éléments sur les diagrammes ».
   Les sous-chapitres sont produits à l'export (capDosContenu, 61) ; identifiants « bloc~élément » (commentaires),
   signets Word « bloc_e<n> » (n : rang dans b.elemsExp) et « bloc_c<catégorie> ».
   ═══════════════════════════════════════════════════════════════════════ */

/** Catégories d'éléments d'un modèle Capella (la dernière reçoit tout le reste). */
const CAP_DOS_EO_CATS=[
  {k:'fn', l:_L('ƒ Fonctions'), e:e=>/^(OperationalActivity|SystemFunction|LogicalFunction|PhysicalFunction)$/.test(e.typeName)},
  {k:'comp', l:_L('🧱 Composants, acteurs et entités'), e:e=>/(Component|Entity|Actor)$/.test(e.typeName)},
  {k:'fe', l:_L('⇆ Échanges fonctionnels'), e:e=>e.typeName==='FunctionalExchange'},
  {k:'ce', l:_L('🔀 Échanges entre composants'), e:e=>/^(ComponentExchange|CommunicationMean)$/.test(e.typeName)},
  {k:'pl', l:_L('🔌 Liens physiques'), e:e=>e.typeName==='PhysicalLink'},
  {k:'port', l:_L('🧩 Ports'), e:e=>/(Port|Pin)$/.test(e.typeName)},
  {k:'ch', l:_L('⚡ Chaînes, processus et chemins'), e:e=>/^(FunctionalChain|OperationalProcess|PhysicalPath)$/.test(e.typeName)},
  {k:'cap', l:_L('🎯 Capacités et missions'), e:e=>/^(Capability|OperationalCapability|CapabilityRealization|Mission)$/.test(e.typeName)},
  {k:'data', l:_L('🗃 Données et éléments échangés'), e:e=>/^(ExchangeItem|ExchangeItemElement|Class|Collection|Union|DataType|BooleanType|Enumeration|NumericType|StringType|PhysicalQuantity|Association|Property|EnumerationLiteral)$/.test(e.typeName)},
  {k:'etat', l:_L('🔁 Modes, états et transitions'), e:e=>/^(Mode|State|FinalState|StateTransition|StateMachine|Region)$/.test(e.typeName)||/PseudoState$/.test(e.typeName)},
  {k:'seq', l:_L('🎬 Scénarios'), e:e=>/^(Scenario|InstanceRole|SequenceMessage|CombinedFragment|InteractionOperand|StateFragment)$/.test(e.typeName)},
  {k:'req', l:_L('🧾 Exigences'), e:e=>/Requirement$/.test(e.typeName)},
  {k:'autre', l:_L('Autres'), e:()=>true}];
/** Informations proposées pour chaque élément représenté. */
const CAP_DOS_EO_COLS=[
  {k:'type', l:'Type'}, {k:'couche', l:_L('Couche')}, {k:'desc', l:'Description'},
  {k:'ports', l:_L('Ports montrés'), t:_L('Fonctions, composants, blocs : leurs ports dessinés sur le diagramme, avec leur sens (IN, OUT…)')},
  {k:'ech', l:_L('Source → cible'), t:_L('Échanges et liens : élément de départ et d\'arrivée (un port est remplacé par son propriétaire)')},
  {k:'items', l:_L('Éléments échangés'), t:_L('Échanges : Exchange Items transportés')},
  {k:'alloc', l:_L('Allocation'), t:_L('Fonction : composants qui la réalisent ; composant : ses fonctions allouées montrées sur le diagramme')},
  {k:'owner', l:_L('Propriétaire')}, {k:'id', l:'ID'}];
/** Présentations des éléments représentés. */
const CAP_DOS_EO_VUES=[
  {k:'tab', l:_L('▤ Tableau sous le diagramme'), t:_L('un tableau par catégorie si les éléments sont regroupés')},
  {k:'cat', l:_L('§ Un sous-chapitre par catégorie'), t:_L('chaque catégorie présente devient un sous-chapitre avec son tableau')},
  {k:'el', l:_L('§ Un sous-chapitre par élément'), t:_L('titre = nom de l\'élément, puis sa description et les informations choisies ; sous des chapitres de catégorie si les éléments sont regroupés')}];

/** @returns {object} options par défaut (tableau Élément, Type, Couche de toutes les catégories) */
function capDosEoDef(){ return {hors:[], sauf:[], cols:['type','couche'], attrs:[], grp:false, vue:'tab', une:false, foc:false}; }
/** @param {?object} src - Bloc (ou boucle) portant `eo` @returns {object} options complétées */
function capDosEo(src){ return Object.assign(capDosEoDef(), src&&src.eo||{}); }
/**
 * Catégories du format ouvert : celles de Capella, ou les familles des modèles génériques (100) pour SysML, UML, ReqIF.
 * @returns {{k:string, l:string, e:function(object):boolean}[]}
 */
function capDosEoCats(){
  if(capRapFormat()==='capella') return CAP_DOS_EO_CATS;
  const garde=['blocs','parts','ports','interfaces','connecteurs','fonctions','pins','etats','etatsSimples','transitions','interactions','uc','acteurs','exigences','titres','specs','tests','contraintes','items','valeurs','paquetages'];
  return [...CAP_RAP_FAMILLES.filter(f=>garde.includes(f.k)).map(f=>({k:f.k, l:f.l, e:e=>f.m(capRapSig(e), e)})), CAP_DOS_EO_CATS[CAP_DOS_EO_CATS.length-1]];
}
/** @param {object} e - Élément @param {object[]} cats - capDosEoCats() @returns {object} catégorie de l'élément */
function capDosEoCat(e, cats){ return cats.find(c=>c.e(e))||cats[cats.length-1]; }
/**
 * Élément tel qu'un lecteur le reconnaît : une implication sans nom (fonction d'une chaîne, composant d'une capacité…) est
 * remplacée par l'élément impliqué, une Part par son type ; les éléments techniques sans nom sont écartés.
 * @param {string} id - Élément dessiné
 * @returns {?object} élément du modèle
 */
function capDosEoReel(id){
  let e=capGetElementById_(id); if(!e) return null;
  const ref=v=>capParseAttrRefs_(String(v||'')).map(capGetElementById_).find(Boolean);
  if(!e.attrs.name&&e.attrs.involved) e=ref(e.attrs.involved)||e;
  if(e.typeName==='Part'&&e.attrs.abstractType) e=ref(e.attrs.abstractType)||e;
  return e.attrs.name?e:null;
}
/**
 * Index des présences : diagramme → éléments dessinés (visionneuse pour Capella, vues des lecteurs sinon), calculé une fois
 * par .aird (borné à quelques secondes sur un modèle énorme).
 * @returns {Map<string, Set<string>>} uid → identifiants dessinés
 */
function capDosDiagIdx(){
  const reps=capHomeReps(); if(!reps.length) return new Map();
  const cle=reps.length+'|'+reps[0].uid, c=_capAnaCache.dosDiagIdx; if(c&&c.cle===cle) return c.map;
  const map=new Map(), t0=Date.now();
  for(const e of capAllElements){
    if(Date.now()-t0>4000) break;
    (capDiagDe(e.id).presences||[]).forEach(r=>{ if(!map.has(r.uid)) map.set(r.uid, new Set()); map.get(r.uid).add(e.id); });
  }
  _capAnaCache.dosDiagIdx={cle, map}; _capAnaCache.dosDiagEls=new Map(); delete _capAnaCache.dosSurDiag;
  return map;
}
/**
 * Éléments représentés d'un diagramme : SVG exporté (attributs data-sem) s'il est fourni, sinon index des présences.
 * @param {string} uid - Diagramme
 * @param {string} [svg] - SVG exporté
 * @returns {{els:object[], ids:Set<string>, vus:Set<string>}} éléments reconnus (sans doublon), leurs identifiants, tout ce qui est dessiné
 */
function capDosDiagEls(uid, svg){
  if(!svg) capDosDiagIdx();
  const cache=_capAnaCache.dosDiagEls||(_capAnaCache.dosDiagEls=new Map());
  if(!svg&&cache.has(uid)) return cache.get(uid);
  const brut=svg?new Set((svg.match(/data-sem="[^"]+"/g)||[]).map(a=>a.slice(10,-1))):new Set(capDosDiagIdx().get(uid)||[]);
  const vus=new Set(brut), ids=new Set(), els=[];
  brut.forEach(id=>{ const e=capDosEoReel(id); if(!e||ids.has(e.id)) return; ids.add(e.id); vus.add(e.id); els.push(e); });
  const r={els, ids, vus}; cache.set(uid, r);
  return r;
}
/** @param {object} p - Port, pin ou paramètre @returns {string} sens : IN, OUT, INOUT… ('' si inconnu) */
function capDosEoSens(p){
  if(p.typeName==='FunctionInputPort') return 'IN';
  if(p.typeName==='FunctionOutputPort') return 'OUT';
  if(p.attrs.orientation) return String(p.attrs.orientation).toUpperCase();
  return capRapFormat()==='capella'?'':capRapSens(p);
}
/**
 * Éléments gardés quand le tableau est « centré » sur un élément : lui, ses ports, les échanges qui le touchent (ou touchent
 * ses ports) et leurs extrémités, ses allocations (fonction ↔ composant), ses liaisons (modèles génériques).
 * @param {string} fid - Élément central
 * @param {object[]} els - Éléments du diagramme
 * @returns {Set<string>} identifiants gardés
 */
function capDosEoFocus(fid, els){
  const P=capGetParentIndex().parentOf, garde=new Set([fid]), bout=v=>{ const x=capDosBout(v); return x?x.id:''; };
  els.forEach(e=>{ if(P[e.id]===fid) garde.add(e.id); });
  els.forEach(e=>{ if(!e.attrs.source&&!e.attrs.target) return; const a=bout(e.attrs.source), b=bout(e.attrs.target);
    if(a===fid||b===fid){ garde.add(e.id); garde.add(a); garde.add(b); capParseAttrRefs_(String(e.attrs.source||'')+' '+String(e.attrs.target||'')).forEach(p=>garde.add(p)); } });
  if(capRapFormat()==='capella'){ const F=capComputeFunctions(), f=F.byId[fid];
    if(f) f.alloc.forEach(a=>garde.add(a.id)); else F.list.forEach(x=>{ if(x.alloc.some(a=>a.id===fid)) garde.add(x.id); }); }
  else capRapLies(fid, '*', 'deux').forEach(x=>garde.add(x.id));
  return garde;
}
/**
 * Valeur d'une information pour un élément représenté.
 * @param {object} e - Élément
 * @param {string} k - Information (CAP_DOS_EO_COLS, ou « a:<attribut> »)
 * @param {?Set<string>} vus - Éléments dessinés sur le diagramme (ports et fonctions montrés)
 * @returns {string}
 */
function capDosEoVal(e, k, vus){
  const nom=x=>x?x.attrs.name||'':'', noms=v=>capParseAttrRefs_(String(v||'')).map(capGetElementById_).filter(Boolean).map(nom).filter(Boolean).join(', ');
  const montre=x=>!vus||!vus.size||vus.has(x.id);
  switch(k){
    case 'type': return capAnaHuman(e.typeName);
    case 'couche': return e.layer||'';
    case 'desc': return capHtmlToText(e.attrs.description||'');
    case 'ports': return (capGetParentIndex().childrenOf[e.id]||[]).map(capGetElementById_).filter(x=>x&&/(Port|Pin)$/.test(x.typeName)&&montre(x))
      .map(x=>{ const s=capDosEoSens(x); return (nom(x)||'—')+(s?' ('+s+')':''); }).join(', ');
    case 'ech': return e.attrs.source||e.attrs.target?nom(capDosBout(e.attrs.source))+' → '+nom(capDosBout(e.attrs.target)):'';
    case 'items': return noms(e.attrs.exchangedItems||e.attrs.convoyedInformations||e.attrs.itemProperty||'');
    case 'alloc': { if(capRapFormat()!=='capella') return ''; const F=capComputeFunctions(), f=F.byId[e.id];
      if(f) return f.alloc.map(a=>a.name).join(', ');
      return /(Component|Entity|Actor)$/.test(e.typeName)?F.list.filter(x=>x.alloc.some(a=>a.id===e.id)&&montre(x)).map(x=>x.name).join(', '):''; }
    case 'owner': return capRapColVal(e, {k:'owner'});
    case 'id': return e.id;
  }
  return k.startsWith('a:')?capRapColVal(e, {k:'attr', cle:k.slice(2)}):'';
}
/** @param {string} k - Information @returns {string} libellé de colonne */
function capDosEoColLib(k){ return k.startsWith('a:')?k.slice(2):(CAP_DOS_EO_COLS.find(c=>c.k===k)||{}).l||k; }
/**
 * Tableau des éléments représentés d'un diagramme selon les réglages du bloc.
 * @param {object} b - Bloc diagramme {ref, eo}
 * @param {string} uid - Diagramme
 * @param {string} [svg] - SVG exporté (sinon index des présences)
 * @returns {{o:object, cols:string[], head:string[], rows:{i:number, id:string, cat:string, e:object, c:string[]}[], groupes:{k:string, l:string, rows:object[]}[], grp:boolean, total:number}}
 */
function capDosEoTable(b, uid, svg){
  const o=capDosEo(b), D=capDosDiagEls(uid, svg), cats=capDosEoCats(), rang=new Map(cats.map((c,i)=>[c.k,i]));
  let l=D.els.map(e=>({e, cat:capDosEoCat(e, cats)})).filter(x=>!o.hors.includes(x.cat.k)&&!o.sauf.includes(x.e.typeName));
  if(o.focus){ const g=capDosEoFocus(o.focus, D.els); l=l.filter(x=>g.has(x.e.id)); }
  const grp=!!(o.grp||o.vue==='cat'), ty=e=>capAnaHuman(e.typeName);
  l.sort((a,b)=>(grp?rang.get(a.cat.k)-rang.get(b.cat.k):0)||capDiagRang(a.e.layer||'')-capDiagRang(b.e.layer||'')||ty(a.e).localeCompare(ty(b.e))||String(a.e.attrs.name).localeCompare(String(b.e.attrs.name)));
  const cols=[...CAP_DOS_EO_COLS.map(c=>c.k).filter(k=>o.cols.includes(k)), ...o.attrs.map(a=>'a:'+a)];
  const rows=l.map((x,i)=>({i, id:x.e.id, cat:x.cat.k, e:x.e, c:[x.e.attrs.name||'', ...cols.map(k=>capDosEoVal(x.e, k, D.vus))],
    h:capDosHtmlCellules(x.e, ['', ...cols])}));   // description : mise en forme d'origine
  const groupes=grp?cats.map(c=>({k:c.k, l:c.l, rows:rows.filter(r=>r.cat===c.k)})).filter(g=>g.rows.length):[{k:'', l:'', rows}];
  return {o, cols, head:[_L('Élément'), ...cols.map(capDosEoColLib)], rows, groupes, grp, total:D.els.length};
}
/** Lignes d'un tableau prêtes à exporter (sans les objets du modèle). @param {object[]} rows @returns {{i:number, id:string, c:string[]}[]} */
function capDosEoLignes(rows){ return rows.map(r=>Object.assign({i:r.i, id:r.id, c:r.c}, r.h?{h:r.h}:{})); }
/**
 * Cellules en HTML d'une ligne de tableau exporté : la colonne description reçoit la mise en forme d'origine (capDosRiche), les autres restent du texte.
 * @param {object} e - Élément de la ligne
 * @param {string[]} cols - Clé de chaque colonne ('desc' pour la description)
 * @returns {?Array<?string>} HTML par colonne (null : texte), ou null si aucune cellule mise en forme
 */
function capDosHtmlCellules(e, cols){
  const h=cols.map(k=>k==='desc'?capDosRiche(e.attrs.description)||null:null);
  return h.some(Boolean)?h:null;
}
/**
 * Nœuds exportés sous un diagramme (capDosContenu, 61) : tableau sous la figure, ou sous-chapitres (par catégorie, par élément).
 * @param {object} b - Bloc diagramme
 * @param {object} t - capDosEoTable
 * @param {function():string} num - Numéro du chapitre suivant au niveau du diagramme
 * @param {number} niv - Niveau des sous-chapitres
 * @param {Map<string,string>} deja - Élément → numéro du chapitre qui le détaille déjà (renvois)
 * @returns {{rep:?object, chaps:object[]}} tableau de la figure (vue « tableau ») ou chapitres produits
 */
function capDosEoNoeuds(b, t, num, niv, deja){
  const o=t.o, vide={ref:null, desc:'', html:'', avecDesc:false, enfants:[]};
  if(!t.rows.length) return {rep:null, chaps:[]};
  if(o.vue!=='cat'&&o.vue!=='el') return {rep:{head:t.head, n:t.rows.length, groupes:t.groupes.map(g=>({l:g.l, rows:capDosEoLignes(g.rows)}))}, chaps:[]};
  const catChap=(g, nu, en)=>Object.assign({}, vide, {id:b.id+'~c:'+g.k, bm:b.id+'_c'+g.k, k:'chap', num:nu, niv, titre:`${g.l} (${g.rows.length})`, enfants:en||[]});
  if(o.vue==='cat') return {rep:null, chaps:t.groupes.map(g=>Object.assign(catChap(g, num()), {table:{base:b.id, head:t.head, rows:capDosEoLignes(g.rows)}}))};
  const elChap=(r, nu, nv)=>{ const e=r.e, ty=[o.cols.includes('type')?capAnaHuman(e.typeName):'', o.cols.includes('couche')?e.layer||'':''].filter(Boolean).join(' · ');
    const n=Object.assign({}, vide, {id:b.id+'~'+e.id, bm:b.id+'_e'+r.i, k:'chap', num:nu, niv:nv, titre:e.attrs.name||'', ref:ty?{nom:e.attrs.name||'', type:ty, couche:''}:null});
    if(o.une&&deja.has(e.id)){ n.voir=deja.get(e.id); return n; }
    if(o.une) deja.set(e.id, nu);
    if(o.cols.includes('desc')) Object.assign(n, {avecDesc:true, desc:capHtmlToText(e.attrs.description||''), html:capDosRiche(e.attrs.description)});
    n.props=t.cols.map((k,j)=>[t.head[j+1], r.c[j+1], k]).filter(p=>!['type','couche','desc'].includes(p[2])&&p[1]).map(p=>[p[0], p[1]]);
    return n; };
  if(t.grp) return {rep:null, chaps:t.groupes.map(g=>{ const nu=num(); let m=0; return catChap(g, nu, g.rows.map(r=>elChap(r, nu+'.'+(++m), niv+1))); })};
  return {rep:null, chaps:t.rows.map(r=>elChap(r, num(), niv))};
}
/**
 * Résumé des réglages, affiché sur le bouton du bloc diagramme.
 * @param {object} o - Options (capDosEo)
 * @returns {string}
 */
function capDosEoResume(o){
  const n=o.hors.length+o.sauf.length, cols=[...o.cols.map(capDosEoColLib), ...o.attrs];
  const vue=o.vue==='cat'?_L('sous-chapitres par catégorie'):o.vue==='el'?_L('sous-chapitres par élément'):o.grp?_L('tableaux par catégorie'):_L('tableau');
  return [n?_L(`${n} type(s) écarté(s)`):_L('tous les types'), cols.length>3?cols.slice(0,3).join(', ')+'…':cols.join(', ')||_L('nom seul'), vue, o.foc||o.focus?_L('centré'):''].filter(Boolean).join(' · ');
}
/**
 * Bouton ⚙ des réglages des éléments représentés (bloc diagramme, boucle sur des diagrammes, contenu automatique).
 * @param {object} src - Objet portant `elems` et `eo`
 * @param {string} [ou] - 'bb' (boucle) | 'ba' (contenu automatique) | '' (bloc diagramme)
 * @returns {string} HTML
 */
function capDosEoBouton(src, ou){
  const p=ou?`data-${ou}="elems"`:'data-bf="elems"';
  return `<label class="dos-opt" title="${_L('Joindre les éléments représentés sur le diagramme')}"><input type="checkbox" ${p}${src.elems?' checked':''}> ${_L('Éléments représentés')}</label>`+
    `<button class="cap-lf-btn dos-eo-b" data-da="eo" data-eo="${ou||''}" title="${_L('Choisir les types d\'éléments, les informations affichées, le regroupement par catégorie et la présentation (tableau ou sous-chapitres)')}">⚙ ${capEsc(capDosEoResume(capDosEo(src)))}</button>`;
}
/**
 * Diagrammes concernés par un bloc d'un 🧩 modèle de rapport (pour relever les types proposés) : boucle sur des diagrammes,
 * diagrammes par couche et type, diagrammes de l'élément de la boucle, présence sur les diagrammes.
 * @param {object} src - Boucle ou bloc automatique
 * @returns {object[]} représentations
 */
function capDosEoRepsDe(src){
  const reps=capHomeReps(), sg=String(src.sigles||'').split(/[\s,;]+/).filter(Boolean).map(x=>x.toUpperCase());
  return reps.filter(r=>(!src.couche||r.couche===src.couche)&&(!sg.length||sg.includes(String(r.sigle).toUpperCase()))&&(!src.nom||String(r.nom).toLowerCase().includes(String(src.nom).toLowerCase())));
}
/**
 * Ouvre les réglages des éléments représentés d'un bloc (clic sur ⚙, data-da="eo").
 * @param {object} d - Dossier ou modèle
 * @param {object} f - Bloc trouvé (capDosTrouve)
 * @param {HTMLElement} a - Bouton
 * @param {Window} W - Fenêtre
 */
function capDosEoOuvrir(d, f, a, W){
  if(!f) return;
  const ou=a.dataset.eo||'', src=ou==='bb'?f.b.boucle:f.b; if(!src) return;
  let els=null, titre='', nd=0;
  if(capLoaded&&f.b.k==='diag'&&f.b.ref){ els=capDosDiagEls(f.b.ref.id).els; titre=capHomeRefNom(f.b.ref); nd=1; }
  else if(capLoaded){ const reps=capDosEoRepsDe(src).slice(0,80), m=new Map(); nd=reps.length;
    reps.forEach(r=>capDosDiagEls(r.uid).els.forEach(e=>m.set(e.id, e))); els=reps.length?[...m.values()]:null; titre=d.modele?_L('diagrammes produits par ce bloc'):''; }
  const tous=!d.modele&&f.b.k==='diag'?()=>{ let n=0; capDosParcours(d.blocs,b=>{ if(b.k==='diag'&&b!==f.b){ b.elems=true; b.eo=JSON.parse(JSON.stringify(f.b.eo||{})); n++; } }); return n; }:null;
  capDosEoDialog(W, capDosEo(src), {els, titre, nd, modele:!!d.modele, tous:!!tous, typesSeuls:src.quoi==='presence', focusNom:src.eo&&src.eo.focus?capHomeRefNom(capHomeRefEl(src.eo.focus)||{k:'el', id:src.eo.focus, nom:src.eo.focus}):''},
    (o, appliquerTous)=>{ src.eo=o; src.elems=true; let n=0; if(appliquerTous&&tous) n=tous(); capHomeSave(); capHomeRender(); if(n) capToast(_L(`✔ Réglages appliqués aux ${n} autre(s) diagramme(s) du dossier`)); });
}
/**
 * Fenêtre des réglages : types d'éléments (catégories et types présents, avec leur nombre), informations affichées,
 * attributs du modèle, regroupement par catégorie, présentation (tableau, sous-chapitres), renvois, centrage (modèles).
 * @param {Window} W - Fenêtre (page ou fenêtre séparée)
 * @param {object} o0 - Options actuelles
 * @param {{els:?object[], titre:string, nd:number, modele:boolean, tous:boolean, typesSeuls:boolean, focusNom:string}} info - Éléments relevés (null : aucun diagramme lu)
 * @param {function(object, boolean):void} cb - Reçoit les options (et « appliquer à tous les diagrammes du dossier »)
 */
function capDosEoDialog(W, o0, info, cb){
  W=W||window; const D=W.document, esc=capEsc, o=JSON.parse(JSON.stringify(o0)), cats=capDosEoCats(), els=info.els||[];
  const parCat=new Map(); els.forEach(e=>{ const k=capDosEoCat(e, cats).k; if(!parCat.has(k)) parCat.set(k, new Map()); const m=parCat.get(k); m.set(e.typeName, (m.get(e.typeName)||0)+1); });
  const visibles=info.els&&!info.modele?cats.filter(c=>parCat.has(c.k)):[...cats.filter(c=>parCat.has(c.k)), ...cats.filter(c=>!parCat.has(c.k))];
  const SAUF=new Set(['id','sid','name','description','summary','xsi:type','xmi:id','href','layer', ...CAP_RAP_PROPS_SAUF]), nAttr=new Map();
  els.forEach(e=>Object.keys(e.attrs).forEach(k=>{ if(!SAUF.has(k)&&e.attrs[k]!=='') nAttr.set(k, (nAttr.get(k)||0)+1); }));
  const attrs=[...new Set([...o.attrs, ...[...nAttr.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,40).map(x=>x[0])])];
  let ov=D.getElementById('dos-eo-ov');
  if(!ov){ ov=D.createElement('div'); ov.id='dos-eo-ov'; D.body.appendChild(ov); ov.addEventListener('mousedown',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const retenus=()=>els.filter(e=>!o.hors.includes(capDosEoCat(e, cats).k)&&!o.sauf.includes(e.typeName)).length;
  const corps=()=>{
    const ck=(c, attr, lib, tip, dis)=>`<label class="dos-opt dos-eo-l"${tip?` title="${esc(tip)}"`:''}><input type="checkbox" ${attr}${c?' checked':''}${dis?' disabled':''}> ${lib}</label>`;
    let h=`<div class="cw-d-sub">${info.els?(info.modele?_L(`Réglages appliqués à chaque diagramme produit ; types relevés sur ${info.nd} diagramme(s) du .aird (une catégorie absente aujourd'hui peut apparaître sur d'autres diagrammes).`)
        :_L(`${els.length} élément(s) sur ce diagramme : seuls les types présents sont proposés.`)):_L('Aucun diagramme lu (ouvrez le .aird du projet) : toutes les catégories sont proposées.')}</div>`;
    h+=`<div class="cmx-ps">${_L('Types d\'éléments')}</div><div class="dos-eo-cats">`+visibles.map(c=>{ const m=parCat.get(c.k), n=m?[...m.values()].reduce((a,b)=>a+b,0):0, off=o.hors.includes(c.k);
      return `<div class="dos-eo-cat${m?'':' dos-eo-abs'}">${ck(!off, `data-cat="${esc(c.k)}"`, `<b>${esc(c.l)}</b>`+(info.els?` <span class="ana-dim">(${n})</span>`:''))}`+
        (m&&m.size>1?`<span class="dos-eo-ty">${[...m.entries()].sort((a,b)=>capAnaHuman(a[0]).localeCompare(capAnaHuman(b[0]))).map(([t,k])=>ck(!o.sauf.includes(t), `data-ty="${esc(t)}"`, `${esc(capAnaHuman(t))} <span class="ana-dim">(${k})</span>`, '', off)).join('')}</span>`:'')+`</div>`; }).join('')+
      `</div><div class="dos-eo-btns"><button class="cap-lf-btn" data-c="tout">${_L('☑ Tout')}</button><button class="cap-lf-btn" data-c="rien">${_L('☐ Aucun')}</button></div>`;
    if((info.focusNom||info.modele)&&!info.typesSeuls) h+=`<div class="cmx-ps">${_L('Centrage')}</div>`+(info.modele?ck(o.foc, 'data-o="foc"', _L('Centré sur l\'élément de la boucle : lui, ses ports, ses échanges et leurs extrémités, ses allocations (diagrammes produits dans une boucle sur des éléments)')):'')+
      (info.focusNom?ck(!!o.focus, 'data-o="focus"', _L(`Centré sur « ${info.focusNom} » (décochez pour garder tous les éléments du diagramme)`)):'');
    if(!info.typesSeuls){
      h+=`<div class="cmx-ps">${_L('Informations affichées')}</div><div class="dos-eo-cols">${ck(true, 'disabled', _L('Nom'))}`+CAP_DOS_EO_COLS.map(c=>ck(o.cols.includes(c.k), `data-col="${c.k}"`, esc(c.l), c.t||'')).join('')+`</div>`;
      h+=`<div class="cmx-ps">${_L('Attributs du modèle')}</div><div class="dos-eo-cols">`+(attrs.length?attrs.map(k=>ck(o.attrs.includes(k), `data-attr="${esc(k)}"`, esc(k)+(nAttr.has(k)?` <span class="ana-dim">(${nAttr.get(k)})</span>`:''))).join(''):`<span class="ana-dim">${_L('aucun attribut relevé')}</span>`)+
        `<span class="dos-eo-add"><input data-attr-new placeholder="${_L('autre attribut…')}" style="width:130px"><button class="cap-lf-btn" data-c="attr" title="${_L('Ajouter cet attribut')}">＋</button></span></div>`;
      h+=`<div class="cmx-ps">${_L('Présentation')}</div>`+ck(o.grp||o.vue==='cat', 'data-o="grp"', _L('Regrouper par catégorie (fonctions, échanges, ports…)'), '', o.vue==='cat')+
        `<div class="dos-eo-vues">`+CAP_DOS_EO_VUES.map(v=>`<label class="dos-eo-l" title="${esc(v.t)}"><input type="radio" name="dos-eo-vue" value="${v.k}"${o.vue===v.k?' checked':''}> <b>${esc(v.l)}</b> <span class="ana-dim">${esc(v.t)}</span></label>`).join('')+`</div>`+
        ck(o.une, 'data-o="une"', _L('Élément déjà détaillé plus haut dans le document (chapitre ou autre diagramme) : simple renvoi « voir § »'), '', o.vue!=='el')+
        (o.vue!=='tab'?`<div class="ana-dim" style="margin-top:4px">${_L('Les sous-chapitres suivent le diagramme dans son chapitre et se numérotent avec lui ; les relecteurs peuvent commenter chacun d\'eux.')}</div>`:'');
    }
    return h;
  };
  const rendu=()=>{
    ov.innerHTML=`<div class="cw-d-box dos-eo-box"><div class="cw-d-hdr"><b>${_L('🔲 Éléments représentés')}${info.titre?` <span class="ana-dim">— ${esc(info.titre)}</span>`:''}</b><button class="cap-lf-btn" data-c="x" title="${_L('Fermer')}">✕</button></div>`+
      `<div class="cw-d-body">${corps()}</div><div class="cw-d-ftr"><span class="ana-dim">${info.els?_L(`${retenus()} / ${els.length} élément(s) retenu(s)`):''}</span><span style="flex:1"></span>`+
      (info.tous?`<button class="cap-lf-btn" data-c="tous" title="${_L('Mêmes réglages pour tous les diagrammes de ce dossier (leurs éléments représentés sont alors joints)')}">${_L('Appliquer à tous les diagrammes du dossier')}</button>`:'')+
      `<button class="cap-lf-btn" data-c="x">${_L('Annuler')}</button><button class="phl-export-btn" data-c="ok">${_L('💾 Enregistrer')}</button></div></div>`;
  };
  ov.onchange=e=>{ const t=e.target, bas=(l,v,on)=>{ const s=new Set(l); if(on) s.add(v); else s.delete(v); return [...s]; };
    if(t.dataset.cat) o.hors=bas(o.hors, t.dataset.cat, !t.checked);
    else if(t.dataset.ty) o.sauf=bas(o.sauf, t.dataset.ty, !t.checked);
    else if(t.dataset.col) o.cols=bas(o.cols, t.dataset.col, t.checked);
    else if(t.dataset.attr) o.attrs=bas(o.attrs, t.dataset.attr, t.checked);
    else if(t.name==='dos-eo-vue') o.vue=t.value;
    else if(t.dataset.o==='focus'){ if(!t.checked) delete o.focus; else o.focus=o0.focus; }
    else if(t.dataset.o) o[t.dataset.o]=t.checked;
    else return;
    const y=ov.querySelector('.cw-d-body').scrollTop; rendu(); ov.querySelector('.cw-d-body').scrollTop=y; };
  ov.onclick=e=>{ const b=e.target.closest('[data-c]'); if(!b) return; const c=b.dataset.c, body=ov.querySelector('.cw-d-body'), y=body.scrollTop;
    if(c==='x'){ ov.style.display='none'; return; }
    if(c==='tout'){ o.hors=[]; o.sauf=[]; }
    else if(c==='rien'){ o.hors=visibles.map(x=>x.k); o.sauf=[]; }
    else if(c==='attr'){ const v=String(ov.querySelector('[data-attr-new]').value||'').trim(); if(!v) return; if(!attrs.includes(v)) attrs.push(v); if(!o.attrs.includes(v)) o.attrs.push(v); }
    else if(c==='ok'||c==='tous'){ ov.style.display='none'; if(o.vue==='cat') o.grp=true; cb(o, c==='tous'); return; }
    rendu(); ov.querySelector('.cw-d-body').scrollTop=y; };
  rendu(); ov.style.display='flex';
}

/* ── Boucles et contenus automatiques des 🧩 modèles de rapport (63) ───────── */

/**
 * Éléments montrés sur le diagramme de la boucle englobante, ou sur les diagrammes dont l'élément englobant est l'élément représenté.
 * @param {?object} ctx - Élément de la boucle englobante {id, el, diag}
 * @returns {Set<string>} identifiants
 */
function capDosEoDgSet(ctx){
  const s=new Set(); if(!ctx||!ctx.id) return s;
  const uids=ctx.diag?[ctx.id]:capDosDiagsDe(ctx.id).map(r=>r.uid);
  uids.forEach(u=>capDosDiagEls(u).ids.forEach(i=>s.add(i)));
  return s;
}
/** @returns {Set<string>} éléments montrés sur au moins un diagramme du .aird (index des présences) */
function capDosEoSurDiag(){
  if(_capAnaCache.dosSurDiag) return _capAnaCache.dosSurDiag;
  const s=new Set(); capHomeReps().forEach(r=>capDosDiagEls(r.uid).ids.forEach(i=>s.add(i)));
  return (_capAnaCache.dosSurDiag=s);
}
/**
 * Filtre d'une boucle ou d'un tableau automatique sur la présence dans les diagrammes.
 * @param {object[]} l - Éléments
 * @param {string} f - 'dg' (diagramme de la boucle englobante) | 'surdiag' | 'horsdiag'
 * @param {?object} ctx - Élément de la boucle englobante
 * @returns {object[]}
 */
function capDosEoFiltre(l, f, ctx){
  if(f==='dg'){ const s=capDosEoDgSet(ctx); return l.filter(e=>s.has(e.id)); }
  const s=capDosEoSurDiag(); return l.filter(e=>f==='surdiag'?s.has(e.id):!s.has(e.id));
}
/**
 * Vrai si un diagramme est gardé par le filtre d'une boucle sur des diagrammes.
 * @param {object} r - Représentation
 * @param {string} f - '' (tous) | 'ctx' (montrant l'élément englobant ou le ciblant) | 'cible' (dont il est l'élément représenté)
 * @param {?object} ctx - Élément de la boucle englobante
 * @returns {boolean}
 */
function capDosEoDiagGarde(r, f, ctx){
  if(!f||!ctx||!ctx.id||ctx.diag) return true;
  let cible=false; try{ const m=capDiagMeta(r.uid); cible=!!(m.cible&&m.cible.id===ctx.id); }catch(e){ /* diagramme sans métadonnées */ }
  return f==='cible'?cible:cible||capDosDiagEls(r.uid).ids.has(ctx.id);
}
/**
 * Contenu automatique « présence des éléments sur les diagrammes » : tableau croisé élément × diagramme.
 * @param {object} b - Bloc {quoi:'presence', couche, sigles, dg, eo, titre, vide}
 * @param {?object} ctx - Élément de la boucle englobante
 * @returns {object[]} bloc tableau (k:'liste', cols:'presence'), ou rien
 */
function capDosEoPresence(b, ctx){
  let reps=capDosEoRepsDe(b);
  if(b.dg==='ctx'&&ctx&&ctx.id) reps=ctx.diag?reps.filter(r=>r.uid===ctx.id):reps.filter(r=>capDosEoDiagGarde(r, 'ctx', ctx));
  const o=capDosEo(b), cats=capDosEoCats(), ids=new Set();
  reps.forEach(r=>capDosDiagEls(r.uid).els.forEach(e=>{ if(!o.hors.includes(capDosEoCat(e, cats).k)&&!o.sauf.includes(e.typeName)) ids.add(e.id); }));
  if(!ids.size&&!b.vide) return [];
  return [{id:capHomeUid(), k:'liste', titre:capRapFill(b.titre||_L('Présence des éléments sur les diagrammes'), ctx), ids:[...ids], cols:'presence', uids:reps.map(r=>r.uid)}];
}
/**
 * Lignes du tableau de présence (lu sur le modèle et le .aird chargés) : une colonne par diagramme (jusqu'à 8), sinon la liste
 * des diagrammes ; nombre de diagrammes par élément. Éléments triés par catégorie puis par nom.
 * @param {object} b - Bloc {k:'liste', cols:'presence', ids, uids}
 * @returns {{head:string[], rows:{id:string, c:string[]}[]}}
 */
function capDosPresenceLignes(b){
  const reps=capHomeReps().filter(r=>(b.uids||[]).includes(r.uid)), cats=capDosEoCats(), rang=new Map(cats.map((c,i)=>[c.k,i]));
  const sets=reps.map(r=>capDosDiagEls(r.uid).ids), large=reps.length<=8;
  const els=(b.ids||[]).map(id=>capLoaded&&capGetElementById_(id)).filter(Boolean)
    .sort((x,y)=>rang.get(capDosEoCat(x, cats).k)-rang.get(capDosEoCat(y, cats).k)||String(x.attrs.name).localeCompare(String(y.attrs.name)));
  const lib=r=>(r.sigle?'['+r.sigle+'] ':'')+capDosNomDiag(r.nom);
  const head=[_L('Élément'), 'Type', ...(large?reps.map(lib):[_L('Diagrammes')]), _L('Nombre')];
  return {head, rows:els.map(e=>{ const dans=reps.filter((r,i)=>sets[i].has(e.id));
    return {id:e.id, c:[e.attrs.name||'', capAnaHuman(e.typeName), ...(large?reps.map((r,i)=>sets[i].has(e.id)?'✔':''):[dans.map(lib).join(', ')]), String(dans.length)]}; })};
}
