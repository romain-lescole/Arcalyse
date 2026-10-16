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
  {k:'dcs', l:_L('📗 Dossier de conception du système (boîte blanche)'), t:_L('Plan type DCS : conception fonctionnelle / logique (architecture, flux externes et internes, données, chaînes, séquences), conception organique (architecture physique, interfaces, allocation), constituants et exigences dérivées')} ]; }

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
    /** Vue 🔗 Liens entre couches. */ X:opts=>({id:id(), k:'xlay', ref:opts.seed?capHomeRefEl(opts.seed):null, opts:Object.assign({mode:'el', seed:'', dir:'dir', cat:'fn', fnCh:true}, opts)}),
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
 * Plan type STS (boîte noire, couche SA).
 * @param {object} o - capDosOutils()
 * @returns {object[]} chapitres
 */
function capDosPlanSts(o){
  const {T, C, E, Lst, D, R, F}=o, sys=o.sys('SA');
  const acteurs=o.comps('SA').filter(o.acteur), sysIds=new Set(o.comps('SA').filter(e=>!o.acteur(e)).map(e=>e.id));
  const fns=F.list.filter(f=>f.layer==='SA'&&f.alloc.some(a=>!a.actor)), fnEl=f=>capGetElementById_(f.id);
  const elsDe=(t,L)=>capAllElements.filter(e=>e.typeName===t&&o.couche(e)===L);
  const ceExt=elsDe('ComponentExchange','SA').filter(e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return a&&b&&(o.acteur(a)!==o.acteur(b)); });
  const feSys=(sens)=>fns.flatMap(f=>capDosEchExt(F,f,sens));
  const chapFn=f=>C(f.name, [
    C(_L('Entrées externes'), [Lst(_L(`Entrées externes de « ${f.name} »`), capDosEchExt(F,f,'in'), 'ech')]),
    C(_L('Sorties externes'), [Lst(_L(`Sorties externes de « ${f.name} »`), capDosEchExt(F,f,'out'), 'ech')]),
    ...capDosDiagsDe(f.id).slice(0,3).map(r=>({id:capHomeUid(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:false})),
    R(_L('exigences fonctionnelles et de performances associées à cette fonction'))], fnEl(f));
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
 * @param {string} k - 'sts' | 'dcs'
 */
function capDosGenerer(k){
  if(!capLoaded){ alert(_L('Chargez d\'abord un modèle.')); capHomeRender(); return; }
  const g=capDosGabarits().find(x=>x.k===k); if(!g) return;
  const o=capDosOutils(), projet=capRevProjectName()||capCurrentFileName||'';
  const d=capDosNouveau(g.l.replace(/^\S+\s/,'')+' — '+projet);
  d.blocs=k==='sts'?capDosPlanSts(o):capDosPlanDcs(o);
  d.consignes=_L('Document produit automatiquement à partir du modèle, puis complété : relisez chaque chapitre et commentez ce qui est faux, manquant ou ambigu.');
  capHomeSave(); capHomeRender();
  capWatchFlash(_L(`✔ ${g.l} créé : complétez les parties « [À rédiger — …] »`)+(o.reps.length?'':_L(' — ouvrez le .aird du projet puis régénérez pour y avoir les diagrammes')));
}
