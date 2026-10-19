/* ═══════════════════════════════════════════════════════════════════════
   📘 RAPPORTS AUTOMATIQUES — plans types remplis à partir du modèle
   ───────────────────────────────────────────────────────────────────────
   Crée un 📑 dossier (🏠 Accueil › 📑 Dossiers de relecture) selon un plan type d'ingénierie système,
   rempli avec ce que le modèle Capella contient, puis entièrement modifiable (chapitres, blocs, textes) et
   exportable (page HTML à commenter, Word) comme tout dossier :
   - 📘 Spécification technique du système (STS, boîte noire) : contexte, système, capacités, exigences
     fonctionnelles par fonction système (entrées / sorties externes), interfaces externes, scénarios, modes ;
   - 📗 Dossier de conception du système (DCS, boîte blanche) : architecture logique (flux externes / internes,
     données), chaînes fonctionnelles, scénarios, architecture physique (interfaces, allocation LA → PA),
     constituants et exigences dérivées par constituant.
   Les parties que le modèle ne renseigne pas sont des textes « [À rédiger — …] ».
   Les diagrammes sont choisis par couche et par type (le .aird du projet doit être ouvert).
   ═══════════════════════════════════════════════════════════════════════ */

/** @returns {{k:string, l:string, t:string}[]} plans types proposés (k : clé, l : libellé, t : description) */
function capDosGabarits(){ return [
  {k:'sts', l:_L('📘 Spécification technique du système (boîte noire)'), t:_L('Plan type STS : objet, domaine d\'application, documents, terminologie, analyse fonctionnelle, exigences fonctionnelles par fonction système (entrées et sorties externes), interfaces externes, exigences opérationnelles, contraintes, vérification')},
  {k:'sts2', l:_L('📘 Spécification technique du système (boîte noire, plan 2)'), t:_L('Plan type STS (exemple 2) : introduction, présentation du système (finalité, contexte, parties prenantes), exigences techniques (fonctionnelles, performances, interfaces fonctionnelles et physiques, opérationnelles et scénarios, contraintes, validation et certification)')},
  {k:'dcs', l:_L('📗 Dossier de conception du système (boîte blanche)'), t:_L('Plan type DCS : conception fonctionnelle / logique (architecture, flux externes et internes, données, chaînes, séquences), conception organique (architecture physique, interfaces, allocation), constituants et exigences dérivées')},
  {k:'sss', l:_L('📘 SSS — Spécification du système / sous-système'), t:_L('Plan MIL-STD-498 (DID DI-IPSC-81431) pour le système ou un sous-système choisi : domaine d\'application, documents, exigences (états et modes, capacités, interfaces externes et internes, données, adaptation, sûreté, sécurité, environnement, ressources informatiques, qualité, contraintes, personnel, formation, logistique, emballage, priorité), dispositions de qualification, traçabilité, notes')},
  {k:'ssdd', l:_L('📗 SSDD — Description de la conception du système / sous-système'), t:_L('Plan MIL-STD-498 (DID DI-IPSC-81432) pour le système ou un sous-système choisi : domaine d\'application, documents, décisions de conception à l\'échelle du système, architecture (composants, concept d\'exécution, conception des interfaces), traçabilité, notes')} ]; }

/**
 * Outils de construction d'un plan : blocs du dossier, éléments du modèle par couche, diagrammes par type.
 * @returns {object} outils {T, C, E, Lst, D, X, couche, comps, F, reps, sys}
 */
function capDosOutils(){
  const id=()=>capHomeUid(), {xmap}=capAnaCtx();
  const couche=e=>{ const x=xmap[e.id]; return x?capArchLayerOf(x):e.layer; };
  const acteur=e=>e.attrs.actor==='true'||/Actor$/.test(e.typeName);
  const comps=L=>capAllElements.filter(e=>/(System|Logical|Physical)Component$|Actor$/.test(e.typeName)&&couche(e)===L);
  const reps=capHomeReps();
  const o={
    couche, acteur, comps, reps, F:capComputeFunctions(),
    /** Texte libre. */ T:txt=>({id:id(), k:'txt', txt}),
    /** Chapitre (titre, blocs, élément associé dont la description est reprise). */
    C:(titre, blocs, e)=>({id:id(), k:'chap', titre, ref:e?capHomeRefEl(e.id):null, desc:!!e, blocs:(blocs||[]).filter(Boolean)}),
    /** Élément avec sa description. */ E:e=>e?{id:id(), k:'el', ref:capHomeRefEl(e.id), desc:true}:null,
    /** Tableau d'éléments (cols : 'desc' ou 'ech'). */ Lst:(titre, els, cols)=>({id:id(), k:'liste', titre, ids:[...new Set(els.map(e=>e.id))], cols:cols||'desc'}),
    /** Diagrammes d'une couche dont le sigle est dans la liste (au plus n). */
    D:(L, sigles, n)=>reps.filter(r=>r.couche===L&&sigles.includes(r.sigle)).slice(0,n||8).map(r=>({id:id(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:false})),
    /** Vue ⇶ Liens entre couches. */ X:opts=>({id:id(), k:'xlay', ref:opts.seed?capHomeRefEl(opts.seed):null, opts:Object.assign({mode:'el', seed:'', dir:'dir', cat:'fn', fnCh:true}, opts)}),
  };
  o.sys=L=>{ const l=comps(L).filter(e=>!acteur(e)); const P=capGetParentIndex().parentOf; return l.find(e=>!l.some(x=>x.id===P[e.id]))||l[0]||null; };   // composant racine non acteur
  o.R=(quoi)=>o.T(_L(`[À rédiger — ${quoi}]`));
  return o;
}

/**
 * Échanges fonctionnels d'une fonction avec l'extérieur (fonctions allouées à des acteurs).
 * @param {object} F - capComputeFunctions()
 * @param {object} f - Fonction
 * @param {string} sens - 'in' (entrées) | 'out' (sorties)
 * @returns {object[]} échanges (éléments du modèle)
 */
function capDosEchExt(F, f, sens){
  const ext=id=>{ const g=F.byId[id]; return g&&g.alloc.length&&g.alloc.every(a=>a.actor); };
  return (sens==='in'?f.fesIn:f.fesOut).filter(x=>ext(x.other)).map(x=>capGetElementById_(x.id)).filter(Boolean);
}

/**
 * Éléments communs aux plans boîte noire (couche SA) : système, acteurs, fonctions du système, échanges avec l'extérieur,
 * chapitre par fonction (description, entrées et sorties externes, diagrammes).
 * @param {object} o - capDosOutils()
 * @returns {object} {sys, acteurs, fns, elsDe, ceExt, feSys, chapFn}
 */
function capDosStsBase(o){
  const {C, Lst, R, F}=o, sys=o.sys('SA');
  const acteurs=o.comps('SA').filter(o.acteur);
  const fns=F.list.filter(f=>f.layer==='SA'&&f.alloc.some(a=>!a.actor)), fnEl=f=>capGetElementById_(f.id);
  const elsDe=(t,L)=>capAllElements.filter(e=>e.typeName===t&&o.couche(e)===L);
  const ceExt=elsDe('ComponentExchange','SA').filter(e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return a&&b&&(o.acteur(a)!==o.acteur(b)); });
  const feSys=(sens)=>fns.flatMap(f=>capDosEchExt(F,f,sens));
  const chapFn=f=>C(f.name, [
    C(_L('Entrées externes'), [Lst(_L(`Entrées externes de « ${f.name} »`), capDosEchExt(F,f,'in'), 'ech')]),
    C(_L('Sorties externes'), [Lst(_L(`Sorties externes de « ${f.name} »`), capDosEchExt(F,f,'out'), 'ech')]),
    ...capDosDiagsDe(f.id).slice(0,3).map(r=>({id:capHomeUid(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:false})),
    R(_L('exigences fonctionnelles et de performances associées à cette fonction'))], fnEl(f));
  return {sys, acteurs, fns, elsDe, ceExt, feSys, chapFn};
}

/**
 * Plan type STS (boîte noire, couche SA), exemple 1.
 * @param {object} o - capDosOutils()
 * @returns {object[]} chapitres
 */
function capDosPlanSts(o){
  const {C, E, Lst, D, R}=o, {sys, acteurs, fns, elsDe, ceExt, feSys, chapFn}=capDosStsBase(o);
  return [
    C(_L('Objet'), [R(_L('objet du document, système concerné, phase du projet'))]),
    C(_L('Domaine d\'application'), [
      C(_L('Contexte de développement du système'), [R(_L('contexte, enjeux, parties prenantes')), ...D('OA',['OEBD','OCB'],2), ...D('SA',['MCB','CC'],3)]),
      C(_L('Description générale du système'), [E(sys), ...D('SA',['SAB','CSA'],2)])]),
    C(_L('Documents cités'), [C(_L('Documents de référence'), [R(_L('liste des documents de référence'))]), C(_L('Documents applicables'), [R(_L('liste des documents applicables'))])]),
    C(_L('Terminologie'), [C(_L('Glossaire'), [R(_L('termes et définitions'))]), C(_L('Sigles et acronymes'), [R(_L('sigles et acronymes'))])]),
    C(_L('Analyse fonctionnelle'), [Lst(_L('Missions'), elsDe('Mission','SA')), Lst(_L('Capacités du système'), elsDe('Capability','SA')),
      Lst(_L('Chaînes fonctionnelles'), elsDe('FunctionalChain','SA')), ...D('SA',['SFBD','SDFB'],3)]),
    C(_L('Exigences'), [
      C(_L('Exigences fonctionnelles et de performances associées'), fns.length?fns.slice(0,40).map(chapFn):[R(_L('aucune fonction allouée au système dans le modèle'))]),
      C(_L('Exigences de performances'), [R(_L('performances globales du système'))]),
      C(_L('Exigences d\'interfaces externes'), [Lst(_L('Échanges entre le système et son environnement'), ceExt, 'ech'), ...D('SA',['SAB'],1),
        C(_L('Environnement'), [Lst(_L('Acteurs'), acteurs)]),
        C(_L('Entrées'), [Lst(_L('Entrées du système'), feSys('in'), 'ech')]),
        C(_L('Sorties'), [Lst(_L('Sorties du système'), feSys('out'), 'ech')])]),
      C(_L('Exigences opérationnelles'), [
        C(_L('Scénarios, profil de mission'), [...D('SA',['ES','FS'],8), ...D('SA',['MSM'],3)]),
        C(_L('Durée de vie'), [R(_L('durée de vie'))]), C(_L('Ergonomie et facteurs humains'), [R(_L('ergonomie'))]),
        C(_L('Sûreté de fonctionnement'), [C(_L('Sécurité'),[R(_L('sécurité'))]), C(_L('Fiabilité'),[R(_L('fiabilité'))]), C(_L('Maintenabilité'),[R(_L('maintenabilité'))]), C(_L('Disponibilité'),[R(_L('disponibilité'))])]),
        C(_L('Qualité produit'), [R(_L('qualité'))]), C(_L('Ressources du système'), [R(_L('ressources'))]), C(_L('Exigences documentaires'), [R(_L('documentation'))])]),
      C(_L('Exigences de contraintes'), [C(_L('Réglementation'),[R(_L('réglementation'))]), C(_L('Masse et autres caractéristiques physiques'),[R(_L('masse, volume…'))]),
        C(_L('Conception et fabrication'),[R(_L('études ou solutions imposées, matériaux, fabrication'))]), C(_L('Traçabilité et gestion de configuration'),[R(_L('traçabilité'))]),
        C(_L('Transportabilité, stockage et conditionnement'),[R(_L('transport, stockage'))]), C(_L('Flexibilité et évolution'),[R(_L('évolutions'))]),
        C(_L('Retrait de service'),[R(_L('retrait de service'))]), C(_L('Conditions d\'environnement'),[R(_L('environnement climatique, mécanique…'))])]),
      C(_L('Exigences d\'intégration, de vérification et de validation'), [R(_L('méthodes de vérification, essais, recette'))])])];
}

/**
 * Plan type STS (boîte noire, couche SA), exemple 2 : introduction, présentation du système, exigences techniques.
 * @param {object} o - capDosOutils()
 * @returns {object[]} chapitres
 */
function capDosPlanSts2(o){
  const {C, E, Lst, D, R}=o, {sys, acteurs, fns, elsDe, ceExt, feSys, chapFn}=capDosStsBase(o);
  const oa=capAllElements.filter(e=>/^(Entity|OperationalActor)$/.test(e.typeName)&&o.couche(e)==='OA');
  const Rc=(titre, quoi)=>C(titre, [R(quoi)]);
  return [
    C(_L('Introduction'), [Rc(_L('Objet'), _L('objet du document, système concerné, phase du projet')),
      Rc(_L('Documents (documents en référence, documents applicables)'), _L('documents en référence et documents applicables')),
      Rc(_L('Terminologie'), _L('termes, sigles et acronymes'))]),
    C(_L('Présentation du système'), [
      C(_L('Finalité, mission et objectifs du système'), [E(sys), Lst(_L('Missions'), elsDe('Mission','SA')), Lst(_L('Capacités du système'), elsDe('Capability','SA')), ...D('SA',['MCB'],2)]),
      C(_L('Contexte physique / organique et fonctionnel du système'), [...D('SA',['CC','SAB','CSA'],3), Lst(_L('Acteurs'), acteurs)]),
      C(_L('Parties prenantes'), [Lst(_L('Entités et acteurs opérationnels'), oa), ...D('OA',['OEBD'],1), R(_L('parties prenantes'))])]),
    C(_L('Exigences techniques'), [
      C(_L('Exigences fonctionnelles'), fns.length?fns.slice(0,40).map(chapFn):[R(_L('aucune fonction allouée au système dans le modèle'))]),
      Rc(_L('Exigences de performance'), _L('performances globales du système')),
      C(_L('Exigences d\'interface'), [
        C(_L('Interfaces fonctionnelles'), [Lst(_L('Entrées du système'), feSys('in'), 'ech'), Lst(_L('Sorties du système'), feSys('out'), 'ech')]),
        C(_L('Interfaces physiques'), [Lst(_L('Échanges entre le système et son environnement'), ceExt, 'ech'), ...D('SA',['SAB'],1)])]),
      C(_L('Exigences opérationnelles et scénarios opérationnels'), [
        C(_L('Modes opérationnels et scénarios'), [...D('SA',['MSM'],3), ...D('SA',['ES','FS'],8), Lst(_L('Chaînes fonctionnelles'), elsDe('FunctionalChain','SA'))]),
        Rc(_L('Exigences d\'ergonomie et de facteurs humains'), _L('ergonomie')),
        Rc(_L('Exigences de sûreté de fonctionnement (sécurité, fiabilité, disponibilité, maintenabilité)'), _L('sûreté de fonctionnement')),
        Rc(_L('Exigences de sécurité de l\'information'), _L('sécurité de l\'information')),
        Rc(_L('Exigences d\'environnement opérationnel'), _L('environnement opérationnel')),
        Rc(_L('Exigences de moyens'), _L('moyens')),
        Rc(_L('Exigences de transport et de stockage'), _L('transport, stockage'))]),
      C(_L('Contraintes'), [Rc(_L('Contraintes physiques'), _L('masse, volume…')), Rc(_L('Contraintes de conception et de réalisation'), _L('études ou solutions imposées, matériaux, fabrication')),
        Rc(_L('Contraintes de réserve et d\'extension'), _L('réserves et extensions')), Rc(_L('Contraintes de mise en service'), _L('mise en service')),
        Rc(_L('Contraintes de retrait de service'), _L('retrait de service')), Rc(_L('Contraintes de maintenance et de documentation'), _L('maintenance, documentation')),
        Rc(_L('Contraintes de production'), _L('production')), Rc(_L('Contraintes de réglementation'), _L('réglementation')),
        Rc(_L('Contraintes de coûts et de délai du produit'), _L('coûts, délais'))]),
      Rc(_L('Exigences de validation et de certification'), _L('méthodes de validation, certification'))])];
}

/**
 * Plan type DCS (boîte blanche, couches LA et PA).
 * @param {object} o - capDosOutils()
 * @returns {object[]} chapitres
 */
function capDosPlanDcs(o){
  const {T, C, E, Lst, D, R, X, F}=o, sys=o.sys('SA');
  const elsDe=(t,L)=>capAllElements.filter(e=>e.typeName===t&&o.couche(e)===L);
  const laComp=o.comps('LA').filter(e=>!o.acteur(e)), paComp=o.comps('PA').filter(e=>!o.acteur(e));
  const noeuds=paComp.filter(e=>e.attrs.nature==='NODE'); const constituants=(noeuds.length?noeuds:paComp).slice(0,20);
  const laFns=F.list.filter(f=>f.layer==='LA'), estAct=id=>{ const g=F.byId[id]; return g&&g.alloc.length&&g.alloc.every(a=>a.actor); };
  const feLA=laFns.flatMap(f=>f.fesOut.map(x=>({x, ext:estAct(f.id)!==estAct(x.other)})));
  const fe=ext=>feLA.filter(y=>y.ext===ext).map(y=>capGetElementById_(y.x.id)).filter(Boolean);
  const pl=elsDe('PhysicalLink','PA'), plExt=pl.filter(e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return a&&b&&o.acteur(a)!==o.acteur(b); });
  if(!capChainsData) capChainsData=capComputeChains();
  const chLA=capChainsData.filter(c=>c.layer==='LA'&&c.type==='FunctionalChain').map(c=>capGetElementById_(c.id)).filter(Boolean);
  // Déploiement (PartDeploymentLink) : composants de comportement déployés sur un nœud
  const deploy={}; capAllElements.filter(e=>e.typeName==='PartDeploymentLink').forEach(l=>{ const a=capDosBout(l.attrs.location), b=capDosBout(l.attrs.deployedElement); if(a&&b) (deploy[a.id]=deploy[a.id]||[]).push(b.id); });
  const fnsDe=c=>{ const P=capGetParentIndex().childrenOf, ids=new Set([c.id]); const pile=[c.id]; while(pile.length){ const x=pile.pop(); [...(P[x]||[]), ...(deploy[x]||[])].forEach(k=>{ if(!ids.has(k)){ ids.add(k); pile.push(k); } }); }
    return F.list.filter(f=>f.alloc.some(a=>ids.has(a.id))).map(f=>capGetElementById_(f.id)).filter(Boolean); };
  const plDe=c=>pl.filter(e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return (a&&a.id===c.id)||(b&&b.id===c.id); });
  return [
    C(_L('Objet'), [R(_L('objet du document, système concerné, phase du projet'))]),
    C(_L('Domaine d\'application'), [C(_L('Description générale du projet'), [R(_L('projet, organisation, jalons'))]), C(_L('Description générale du système'), [E(sys)])]),
    C(_L('Documents cités'), [C(_L('Documents de référence'), [R(_L('liste des documents de référence'))]), C(_L('Documents applicables'), [R(_L('liste des documents applicables'))])]),
    C(_L('Terminologie'), [C(_L('Glossaire'), [R(_L('termes et définitions'))]), C(_L('Sigles et acronymes'), [R(_L('sigles et acronymes'))])]),
    C(_L('Conception fonctionnelle / logique'), [
      C(_L('Décomposition statique'), [
        C(_L('Architecture fonctionnelle / logique'), [...D('LA',['LAB'],3), Lst(_L('Composants logiques'), laComp), ...D('LA',['LDFB'],2)]),
        C(_L('Flux externes'), [Lst(_L('Échanges fonctionnels avec l\'extérieur'), fe(true), 'ech')]),
        C(_L('Flux internes'), [Lst(_L('Échanges fonctionnels internes'), fe(false), 'ech')]),
        C(_L('Données de paramétrage'), [Lst(_L('Éléments échangés'), capAllElements.filter(e=>e.typeName==='ExchangeItem').slice(0,120)), R(_L('données de paramétrage'))])]),
      C(_L('Analyse dynamique'), [
        C(_L('Chaînes fonctionnelles'), chLA.length?chLA.slice(0,30).map(c=>C(c.attrs.name||'', [...capDosDiagsDe(c.id).slice(0,2).map(r=>({id:capHomeUid(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:false})), X({seed:c.id})], c)):[R(_L('aucune chaîne fonctionnelle en LA dans le modèle'))]),
        C(_L('Diagrammes de séquences'), [...D('LA',['ES','FS','IS'],10), R(_L('scénarios logiques'))])])]),
    C(_L('Conception organique'), [
      C(_L('Décomposition statique'), [
        C(_L('Architecture physique'), [...D('PA',['PAB'],3), Lst(_L('Composants physiques'), paComp)]),
        C(_L('Interfaces physiques externes'), [Lst(_L('Liens physiques avec l\'extérieur'), plExt, 'ech')]),
        C(_L('Interfaces physiques internes'), [Lst(_L('Liens physiques internes'), pl.filter(e=>!plExt.includes(e)), 'ech')]),
        C(_L('Allocation de l\'architecture fonctionnelle / logique'), [X({mode:'cat', cat:'comp', fnCh:false}), R(_L('principes d\'allocation'))])]),
      C(_L('Analyse dynamique'), [
        C(_L('Flux physiques'), [Lst(_L('Chemins physiques'), elsDe('PhysicalPath','PA')), Lst(_L('Échanges entre composants'), elsDe('ComponentExchange','PA').slice(0,150), 'ech')]),
        C(_L('Diagrammes de séquences'), [...D('PA',['ES','FS','IS'],10), R(_L('scénarios physiques'))])]),
      C(_L('Constituants de niveau inférieur'), [Lst(_L('Constituants'), constituants)])]),
    C(_L('Exigences dérivées'), constituants.length?constituants.map(c=>C(c.attrs.name||'', [
      C(_L('Exigences fonctionnelles'), [Lst(_L(`Fonctions allouées à « ${c.attrs.name||''} »`), fnsDe(c))]),
      C(_L('Exigences de performances'), [R(_L('performances'))]),
      C(_L('Exigences d\'interfaces externes'), [Lst(_L(`Liens physiques de « ${c.attrs.name||''} »`), plDe(c), 'ech')]),
      C(_L('Exigences opérationnelles'), [R(_L('exigences opérationnelles'))]),
      C(_L('Exigences de contraintes'), [R(_L('contraintes'))]),
      C(_L('Exigences d\'intégration, de vérification et de validation'), [R(_L('vérification'))])], c)):[R(_L('aucun constituant physique dans le modèle'))])];
}

/**
 * Crée un dossier selon un plan type, rempli à partir du modèle chargé, et l'ouvre.
 * @param {string} k - 'sts' | 'sts2' | 'dcs' | 'sss' | 'ssdd'
 * @param {?object} [comp] - SSS / SSDD : composant décrit (sous-système), null pour le système ; absent : fenêtre de choix
 */
function capDosGenerer(k, comp){
  if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle.')); capHomeRender(); return; }
  const g=capDosGabarits().find(x=>x.k===k); if(!g) return;
  if((k==='sss'||k==='ssdd')&&comp===undefined){ capDosPerimetre(k); return; }   // système ou sous-système (66)
  const o=capDosOutils(), projet=capRevProjectName()||capCurrentFileName||'';
  const d=capDosNouveau(g.l.replace(/^\S+\s/,'')+' — '+(comp?comp.attrs.name||'':projet));
  d.blocs=k==='sts'?capDosPlanSts(o):k==='sts2'?capDosPlanSts2(o):k==='sss'?capDosPlanSss(o, capDosSujet(o, comp)):k==='ssdd'?capDosPlanSsdd(o, capDosSujet(o, comp)):capDosPlanDcs(o);
  d.gab=k; d.commentaires=false;   // rapport à lire : sans 💬 dans la page HTML (option dans l'en-tête)
  d.consignes=_L('Document produit automatiquement à partir du modèle, puis complété : relisez chaque chapitre et commentez ce qui est faux, manquant ou ambigu.');
  capHomeSave(); capHomeRender();
  capWatchFlash(_L(`✔ ${g.l} créé : complétez les parties « [À rédiger — …] » ou « [À compléter — …] »`)+(o.reps.length?'':_L(' — ouvrez le .aird du projet puis régénérez pour y avoir les diagrammes')));
}

/* ── 🧩 Modèles de rapport personnalisés ─────────────────────────────────
   Un modèle est un dossier (modele:true) édité comme les autres, avec deux sortes de blocs en plus :
   - 🔁 boucle : un chapitre marqué « pour chaque » (type d'élément, couche, filtre, nom) ; à la génération,
     un chapitre par élément trouvé, titré par « {nom} » (aussi {type}, {couche}), dont le contenu est évalué
     pour cet élément (boucles imbriquées : filtre « liés à l'élément de la boucle englobante ») ;
   - ⚙ contenu automatique : description, diagrammes, échanges, fonctions allouées, liens physiques, chaînes,
     tableau d'éléments, liens entre couches — calculés pour l'élément de la boucle.
   ▶ Générer le rapport crée un dossier ordinaire (modifiable, exportable) ; le modèle se réutilise (💾 .json). */

/** Types d'éléments parcourus par une boucle ou listés par un tableau automatique. */
const CAP_RAP_TYPES=[
  {k:'fn', l:_L('Fonctions')}, {k:'comp', l:_L('Composants (hors acteurs)')}, {k:'node', l:_L('Nœuds physiques (PA)')}, {k:'actor', l:_L('Acteurs')},
  {k:'chain', l:_L('Chaînes fonctionnelles')}, {k:'cap', l:_L('Capacités')}, {k:'mission', l:_L('Missions')}, {k:'fe', l:_L('Échanges fonctionnels')},
  {k:'ce', l:_L('Échanges entre composants')}, {k:'pl', l:_L('Liens physiques')}, {k:'ei', l:_L('Éléments échangés')}, {k:'diag', l:_L('Diagrammes')}];
/** Filtres d'une boucle ou d'un tableau automatique. */
const CAP_RAP_FILTRES=[
  {k:'', l:_L('tous')}, {k:'sys', l:_L('alloués au système')}, {k:'act', l:_L('alloués à un acteur')}, {k:'leaf', l:_L('feuilles seulement')},
  {k:'ctx', l:_L('liés à l\'élément de la boucle englobante')}];
/** Contenus automatiques proposés. */
const CAP_RAP_AUTO=[
  {k:'desc', l:_L('Description de l\'élément de la boucle')}, {k:'diags', l:_L('Diagrammes dont il est l\'élément représenté')},
  {k:'diagtype', l:_L('Diagrammes par couche et par type')}, {k:'fein', l:_L('Échanges fonctionnels entrants')}, {k:'feout', l:_L('Échanges fonctionnels sortants')},
  {k:'alloc', l:_L('Fonctions allouées (et déployées)')}, {k:'pl', l:_L('Liens physiques')}, {k:'chaines', l:_L('Chaînes qui impliquent la fonction')},
  {k:'liste', l:_L('Tableau d\'éléments (type, couche, filtre)')}, {k:'xlay', l:_L('⇶ Liens entre couches')}];

/**
 * Options d'une liste déroulante.
 * @param {{k:string,l:string}[]} l - Choix
 * @param {string} v - Valeur choisie
 * @returns {string} HTML
 */
function capRapOpts(l, v){ return l.map(x=>`<option value="${x.k}"${x.k===(v||'')?' selected':''}>${capEsc(x.l)}</option>`).join(''); }
/** @returns {{k:string,l:string}[]} couches proposées ('' : toutes) */
function capRapCouches(){ return [{k:'', l:_L('toutes couches')}, ...CAP_ANA_LAYERS.map(k=>({k, l:k}))]; }

/**
 * Réglages d'un chapitre « boucle » (sous son titre, dans l'éditeur du modèle).
 * @param {object} c - Chapitre {boucle:{type, couche, filtre, nom, max}}
 * @returns {string} HTML
 */
function capRapBoucleHtml(c){
  const r=c.boucle;
  return `<div class="dos-boucle"><b>${_L('🔁 Pour chaque')}</b><select data-bb="type">${capRapOpts(CAP_RAP_TYPES, r.type)}</select>`+
    `<select data-bb="couche">${capRapOpts(capRapCouches(), r.couche)}</select>`+
    (r.type==='diag'?`<input data-bb="sigles" value="${capEsc(r.sigles||'')}" placeholder="${_L('types : LAB, SDFB… (vide : tous)')}" style="width:150px">`:`<select data-bb="filtre">${capRapOpts(CAP_RAP_FILTRES, r.filtre)}</select>`)+
    `<input data-bb="nom" value="${capEsc(r.nom||'')}" placeholder="${_L('nom contient…')}" style="width:120px">`+
    `<label>${_L('au plus')} <input data-bb="max" type="number" min="1" max="200" value="${+r.max||30}" style="width:55px"></label>`+
    `<span class="ana-dim">${_L('→ un chapitre par élément ; titre : {nom}, {type}, {couche}')}</span></div>`;
}
/**
 * Réglages d'un bloc « contenu automatique ».
 * @param {object} b - Bloc {k:'auto', quoi, …}
 * @returns {string} HTML
 */
function capRapAutoHtml(b){
  let h=`<span class="dos-ico">⚙</span><select data-ba="quoi">${capRapOpts(CAP_RAP_AUTO, b.quoi)}</select>`;
  if(b.quoi==='diagtype') h+=`<select data-ba="couche">${capRapOpts(capRapCouches(), b.couche)}</select><input data-ba="sigles" value="${capEsc(b.sigles||'')}" placeholder="${_L('types : SAB, ES… (vide : tous)')}" style="width:150px">`;
  if(b.quoi==='liste') h+=`<select data-ba="type">${capRapOpts(CAP_RAP_TYPES.filter(t=>t.k!=='diag'), b.type)}</select><select data-ba="couche">${capRapOpts(capRapCouches(), b.couche)}</select>`+
    `<select data-ba="filtre">${capRapOpts(CAP_RAP_FILTRES, b.filtre)}</select><input data-ba="nom" value="${capEsc(b.nom||'')}" placeholder="${_L('nom contient…')}" style="width:110px">`;
  if(b.quoi==='fein'||b.quoi==='feout') h+=`<label class="dos-opt"><input type="checkbox" data-ba="ext"${b.ext?' checked':''}> ${_L('avec l\'extérieur seulement')}</label>`;
  if(['diagtype','liste','fein','feout','alloc','pl','chaines'].includes(b.quoi)) h+=`<input data-ba="titre" value="${capEsc(b.titre||'')}" placeholder="${_L('titre (facultatif, {nom}…)')}" style="width:150px">`;
  return h;
}
/** Libellé d'un bloc « contenu automatique ». @param {object} b @returns {string} */
function capRapAutoLib(b){ return (CAP_RAP_AUTO.find(x=>x.k===b.quoi)||{}).l||''; }

/**
 * Remplace {nom}, {type}, {couche} par les valeurs de l'élément de la boucle.
 * @param {string} s - Texte
 * @param {?object} ctx - Élément de la boucle {nom, type, couche}
 * @returns {string}
 */
function capRapFill(s, ctx){ return String(s||'').replace(/\{(nom|type|couche)\}/g,(m,k)=>ctx?ctx[k]||'':m); }

/**
 * Fonctions allouées à un composant, à ses sous-composants et aux composants déployés sur lui.
 * @param {string} id - Composant
 * @param {object} F - capComputeFunctions()
 * @returns {Set<string>} identifiants des fonctions
 */
function capRapFonctionsDe(id, F){
  if(!_capAnaCache.rapDeploy){ const dep={}; capAllElements.filter(e=>e.typeName==='PartDeploymentLink').forEach(l=>{ const a=capDosBout(l.attrs.location), b=capDosBout(l.attrs.deployedElement); if(a&&b) (dep[a.id]=dep[a.id]||[]).push(b.id); }); _capAnaCache.rapDeploy=dep; }
  const dep=_capAnaCache.rapDeploy, P=capGetParentIndex().childrenOf, ids=new Set([id]), pile=[id];
  while(pile.length){ const x=pile.pop(); [...(P[x]||[]), ...(dep[x]||[])].forEach(k=>{ if(!ids.has(k)){ ids.add(k); pile.push(k); } }); }
  return new Set(F.list.filter(f=>f.alloc.some(a=>ids.has(a.id))).map(f=>f.id));
}

/**
 * Éléments parcourus par une boucle (ou listés par un tableau automatique).
 * @param {object} r - {type, couche, filtre, nom, sigles}
 * @param {?object} ctx - Élément de la boucle englobante
 * @param {object} o - capDosOutils()
 * @returns {object[]} éléments du modèle, ou représentations (diagrammes)
 */
function capRapSelect(r, ctx, o){
  const L=r.couche||'', F=o.F, dansL=e=>!L||o.couche(e)===L, t=r.type||'fn';
  if(t==='diag'){ const sg=String(r.sigles||'').split(/[\s,;]+/).filter(Boolean).map(x=>x.toUpperCase());
    return o.reps.filter(x=>(!L||x.couche===L)&&(!sg.length||sg.includes(String(x.sigle).toUpperCase()))&&(!r.nom||String(x.nom).toLowerCase().includes(r.nom.toLowerCase()))); }
  const de=tn=>capAllElements.filter(e=>tn.includes(e.typeName)&&dansL(e));
  let l;
  if(t==='fn') l=F.list.filter(f=>!L||f.layer===L).filter(f=>r.filtre==='sys'?f.alloc.some(a=>!a.actor):r.filtre==='act'?f.alloc.length&&f.alloc.every(a=>a.actor):r.filtre==='leaf'?f.leaf:true).map(f=>capGetElementById_(f.id));
  else if(t==='comp'||t==='actor'||t==='node') l=CAP_ANA_LAYERS.filter(x=>!L||x===L).flatMap(x=>o.comps(x)).filter(e=>t==='actor'?o.acteur(e):!o.acteur(e)&&(t!=='node'||e.attrs.nature==='NODE'));
  else if(t==='chain'){ if(!capChainsData) capChainsData=capComputeChains(); l=capChainsData.filter(c=>!L||c.layer===L).map(c=>capGetElementById_(c.id)); }
  else l=de({cap:['Capability','OperationalCapability','CapabilityRealization'], mission:['Mission'], fe:['FunctionalExchange'], ce:['ComponentExchange'], pl:['PhysicalLink'], ei:['ExchangeItem']}[t]||[]);
  l=l.filter(Boolean);
  if((r.filtre==='sys'||r.filtre==='act')&&t!=='fn') l=l.filter(e=>t==='actor'?r.filtre==='act':r.filtre==='sys');
  if(r.nom) l=l.filter(e=>String(e.attrs.name||'').toLowerCase().includes(r.nom.toLowerCase()));
  if(r.filtre==='ctx'&&ctx&&ctx.id) l=l.filter(e=>capRapLie(e, t, ctx, o));
  return l;
}
/**
 * Vrai si un élément est lié à l'élément de la boucle englobante : fonction allouée au composant (ou impliquée dans la
 * chaîne, ou sous-fonction), échange dont il est une extrémité, chaîne qui implique la fonction, ou élément contenu.
 * @param {object} e - Élément candidat
 * @param {string} t - Type de la boucle
 * @param {object} ctx - Élément englobant {id, el}
 * @param {object} o - capDosOutils()
 * @returns {boolean}
 */
function capRapLie(e, t, ctx, o){
  const c=ctx.el, F=o.F;
  if(t==='fn'&&c){
    if(/Component$|Actor$/.test(c.typeName)) return capRapFonctionsDe(c.id, F).has(e.id);
    if(/FunctionalChain|OperationalProcess/.test(c.typeName)) return capRevChainFns(c.id).some(x=>x.id===e.id);
    if(F.byId[c.id]) return F.byId[e.id]&&F.byId[e.id].parentId===c.id;
  }
  if(['fe','ce','pl'].includes(t)){ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return !!((a&&a.id===c.id)||(b&&b.id===c.id)); }
  if(t==='chain'&&F.byId[c.id]) return capRevChainFns(e.id).some(x=>x.id===c.id);
  const P=capGetParentIndex().parentOf; for(let x=P[e.id], n=0; x&&n<40; x=P[x], n++) if(x===c.id) return true;
  return false;
}

/**
 * Évalue les blocs d'un modèle pour un élément de boucle : boucles déroulées, contenus automatiques calculés,
 * textes et titres complétés ({nom}…), blocs ordinaires recopiés.
 * @param {object[]} blocs - Blocs du modèle
 * @param {?object} ctx - Élément de la boucle {id, el, nom, type, couche} (null au premier niveau)
 * @param {object} o - capDosOutils()
 * @returns {object[]} blocs du dossier généré
 */
function capRapEval(blocs, ctx, o){
  const out=[], id=()=>capHomeUid(), {C, E, Lst, R, X}=o;
  const diagB=r=>({id:id(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:false});
  (blocs||[]).forEach(b=>{
    if(b.k==='chap'&&b.boucle){
      const r=b.boucle, max=Math.max(1,Math.min(200,+r.max||30));
      capRapSelect(r, ctx, o).slice(0,max).forEach(x=>{
        if(r.type==='diag'){ const c2={id:x.uid, el:null, nom:x.nom, type:x.type||_L('Diagramme'), couche:x.couche||''};
          out.push(C(capRapFill(b.titre||'{nom}', c2), [diagB(x), ...capRapEval(b.blocs, c2, o)])); return; }
        const c2={id:x.id, el:x, nom:x.attrs.name||'', type:(CAP_HUMAN_NAMES[x.typeName]||{}).h||x.typeName, couche:o.couche(x)};
        const ch=C(capRapFill(b.titre||'{nom}', c2), capRapEval(b.blocs, c2, o), b.desc!==false?x:null); out.push(ch); });
      if(!capRapSelect(r, ctx, o).length) out.push(R(_L(`aucun élément pour « ${capRapFill(b.titre||'{nom}', null)} »`)));
      return;
    }
    if(b.k==='chap'){ out.push(Object.assign({}, b, {id:id(), titre:capRapFill(b.titre, ctx), blocs:capRapEval(b.blocs, ctx, o)})); return; }
    if(b.k==='txt'){ out.push({id:id(), k:'txt', txt:capRapFill(b.txt, ctx)}); return; }
    if(b.k!=='auto'){ out.push(Object.assign(JSON.parse(JSON.stringify(b)), {id:id()})); return; }
    const c=ctx&&ctx.el, f=c&&o.F.byId[c.id], tit=d=>capRapFill(b.titre||d, ctx);
    switch(b.quoi){
      case 'desc': if(c) out.push(E(c)); break;
      case 'diags': if(ctx) capDosDiagsDe(ctx.id).slice(0,6).forEach(r=>out.push(diagB(r))); break;
      case 'diagtype': { const sg=String(b.sigles||'').split(/[\s,;]+/).filter(Boolean).map(x=>x.toUpperCase());
        o.reps.filter(r=>(!b.couche||r.couche===b.couche)&&(!sg.length||sg.includes(String(r.sigle).toUpperCase()))).slice(0,20).forEach(r=>out.push(diagB(r))); break; }
      case 'fein': case 'feout': if(f){ const sens=b.quoi==='fein'?'in':'out';
        const l=b.ext?capDosEchExt(o.F, f, sens):(sens==='in'?f.fesIn:f.fesOut).map(x=>capGetElementById_(x.id)).filter(Boolean);
        out.push(Lst(tit(sens==='in'?_L('Échanges entrants de « {nom} »'):_L('Échanges sortants de « {nom} »')), l, 'ech')); } break;
      case 'alloc': if(c) out.push(Lst(tit(_L('Fonctions allouées à « {nom} »')), [...capRapFonctionsDe(c.id, o.F)].map(capGetElementById_).filter(Boolean))); break;
      case 'pl': if(c) out.push(Lst(tit(_L('Liens physiques de « {nom} »')), capAllElements.filter(e=>e.typeName==='PhysicalLink'&&[e.attrs.source,e.attrs.target].some(v=>{ const x=capDosBout(v); return x&&x.id===c.id; })), 'ech')); break;
      case 'chaines': if(f) out.push(Lst(tit(_L('Chaînes qui impliquent « {nom} »')), f.chains.map(x=>capGetElementById_(x.id)).filter(Boolean))); break;
      case 'liste': { const l=capRapSelect({type:b.type||'fn', couche:b.couche, filtre:b.filtre, nom:b.nom}, ctx, o);
        out.push(Lst(tit((CAP_RAP_TYPES.find(t=>t.k===(b.type||'fn'))||{}).l+(b.couche?' '+b.couche:'')), l, ['fe','ce','pl'].includes(b.type)?'ech':'desc')); break; }
      case 'xlay': if(c) out.push(X({seed:c.id})); break;
    }
  });
  return out;
}

/**
 * ▶ Génère un rapport à partir d'un modèle personnalisé : nouveau dossier ordinaire, ouvert dans l'éditeur.
 * @param {object} m - Modèle (dossier modele:true)
 */
function capRapGenerer(m){
  if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle.')); return; }
  const o=capDosOutils(), d=capDosNouveau((m.titre||_L('Rapport'))+' — '+(capRevProjectName()||capCurrentFileName||''));
  Object.assign(d, {blocs:capRapEval(m.blocs, null, o), consignes:m.consignes||'', gab:'perso', depuis:m.id, commentaires:m.commentaires!==false});
  capHomeSave(); capHomeRender();
  capWatchFlash(_L(`✔ Rapport généré à partir du modèle « ${m.titre} »`)+(o.reps.length?'':_L(' — ouvrez le .aird du projet puis régénérez pour y avoir les diagrammes')));
}
/** ✚ Nouveau modèle de rapport, prérempli d'un exemple de boucles (à adapter). @returns {object} modèle */
function capRapNouveau(){
  const id=()=>capHomeUid(), T=txt=>({id:id(), k:'txt', txt}), A=(quoi,p)=>Object.assign({id:id(), k:'auto', quoi}, p||{});
  const B=(titre, boucle, blocs)=>({id:id(), k:'chap', titre, ref:null, desc:true, boucle, blocs});
  const m=capDosNouveau(_L('Mon modèle de rapport'));
  Object.assign(m, {modele:true, commentaires:false, consignes:'', blocs:[
    {id:id(), k:'chap', titre:_L('Objet'), ref:null, desc:false, blocs:[T(_L('[À rédiger — objet du document]'))]},
    {id:id(), k:'chap', titre:_L('Architecture du système'), ref:null, desc:false, blocs:[A('diagtype',{couche:'SA', sigles:'SAB'})]},
    {id:id(), k:'chap', titre:_L('Fonctions du système'), ref:null, desc:false, blocs:[
      B('{nom}', {type:'fn', couche:'SA', filtre:'sys', nom:'', max:30}, [A('fein',{ext:true}), A('feout',{ext:true}), A('diags')])]},
    {id:id(), k:'chap', titre:_L('Constituants physiques'), ref:null, desc:false, blocs:[
      B('{nom}', {type:'node', couche:'PA', filtre:'', nom:'', max:20}, [A('alloc'), A('pl'), T(_L('[À rédiger — exigences dérivées de {nom}]'))])]}]});
  capHomeSave(); capHomeRender(); return m;
}
/** Enregistre un modèle de rapport en .json (réutilisable dans un autre projet). @param {object} m */
function capRapJson(m){
  capDownloadBlob(new Blob([JSON.stringify({type:'arcalyse-modele-rapport', version:1, modele:Object.assign({}, m, {retours:[], relus:{}})}, null, 1)],{type:'application/json'}),
    (m.titre||'modele').replace(/[^\p{L}\p{N}\-]+/gu,'_')+'.json');
}
/** Importe un ou plusieurs modèles de rapport (.json). @param {Window} [W] - Fenêtre d'où part la demande */
function capRapImporter(W){
  W=W||window; const inp=W.document.createElement('input'); inp.type='file'; inp.multiple=true; if(!capIsMobile()) inp.accept='.json';
  inp.onchange=async()=>{ let n=0;
    for(const f of inp.files){ try{ const o=JSON.parse(await f.text()); if(!o||o.type!=='arcalyse-modele-rapport'||!o.modele) throw new Error(_L('ce fichier n\'est pas un modèle de rapport Arcalyse'));
      const m=capDosNorm([Object.assign({}, o.modele, {id:capHomeUid(), modele:true})])[0]; _capHome.dossiers.push(m); _capDosUi.cur=m.id; n++; }
      catch(e){ capAlert(f.name+' : '+(e&&e.message||e),{win:W, level:'err'}); } }
    if(n){ capHomeSave(); capHomeRender(); capWatchFlash(_L(`✔ ${n} modèle(s) de rapport importé(s)`)); } };
  inp.click();
}
