// ════════════════════════════════════════════════════════════════════
//  📘 RAPPORTS SSS / SSDD (plans types MIL-STD-498)
//  SSS  : System/Subsystem Specification, DID DI-IPSC-81431 (1994, rév. A 2000)
//  SSDD : System/Subsystem Design Description, DID DI-IPSC-81432 (1994, rév. A 1999)
//  Même plan pour un système (System de la SA) ou un sous-système (composant LA / PA choisi) :
//  numérotation du DID gardée (chapitres numérotés par le dossier), titres en français,
//  contenu tiré du modèle, invites « [À compléter — …] » pour ce que le modèle ne contient pas.
// ════════════════════════════════════════════════════════════════════

/**
 * Fenêtre de choix du périmètre d'un rapport SSS / SSDD : le système, ou un composant (sous-système).
 * @param {string} k - 'sss' | 'ssdd'
 */
function capDosPerimetre(k){
  const g=capDosGabarits().find(x=>x.k===k); if(!g) return;
  let ov=document.getElementById('dos-per-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='dos-per-ov'; document.body.appendChild(ov); }
  const o=capDosOutils(), sys=o.sys('SA');
  const comps=[...o.comps('SA'), ...o.comps('LA'), ...o.comps('PA')].filter(e=>!o.acteur(e)&&e!==sys);
  ov.innerHTML=`<div class="cw-d-box" style="max-width:620px">
    <div class="cw-d-hdr"><b>${capEsc(g.l)}</b><button class="cap-lf-btn" data-pe="x">✕</button></div>
    <div class="cw-d-body">
      <div class="cw-d-sub">${_L('Le même plan s\'applique au <b>système</b> ou à un <b>sous-système</b> : choisissez le périmètre décrit.')}</div>
      <div class="cap-pref-sec">${_L('🌐 Système')}</div>
      <button class="phl-export-btn" data-pe="sys"${sys?'':' disabled'}>${sys?_L(`▶ Système : ${capEsc(sys.attrs.name||'')}`):_L('Aucun système dans la couche SA')}</button>
      <div class="cap-pref-sec" style="margin-top:12px">${_L('🧩 Sous-système : un composant')}</div>
      <input type="text" class="dos-per-q" placeholder="${_L('🔍 Nom du composant (SA, LA ou PA)…')}" autocomplete="off" style="width:100%;box-sizing:border-box;padding:5px 8px">
      <div class="dos-per-l"></div>
    </div>
    <div class="cw-d-ftr"><span class="ana-dim" style="flex:1">${_L('Le rapport créé reste entièrement modifiable.')}</span><button class="cap-lf-btn" data-pe="x">${_L('Annuler')}</button></div></div>`;
  const q=ov.querySelector('.dos-per-q'), l=ov.querySelector('.dos-per-l');
  const fill=()=>{ const ws=capDosTxNorm(q.value).split(' ').filter(Boolean);
    const res=comps.filter(e=>ws.every(w=>capDosTxNorm((e.attrs.name||'')+' '+o.couche(e)+' '+e.typeName).includes(w))).slice(0,80);
    l.innerHTML=res.length?res.map(e=>`<div class="ctx-i" data-pe="c" data-id="${capEsc(e.id)}">${capIco(e.id,13)} ${capEsc(e.attrs.name||e.id)} <span class="cap-nav-g">${capEsc(o.couche(e)||'')} · ${capEsc((CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName)}</span></div>`).join('')
      :`<div class="cap-nav-hint">${_L('Aucun composant.')}</div>`; };
  q.oninput=fill; fill();
  ov.onclick=e=>{
    if(e.target===ov){ ov.style.display='none'; return; }
    const b=e.target.closest('[data-pe]'); if(!b) return;
    if(b.dataset.pe==='x'){ ov.style.display='none'; return; }
    ov.style.display='none';
    capDosGenerer(k, b.dataset.pe==='sys'?null:capGetElementById_(b.dataset.id));
  };
  ov.style.display='flex'; q.focus();
}

/**
 * Contexte d'un périmètre : sujet, couche, éléments intérieurs, fonctions, échanges externes et internes,
 * partenaires (composants ou acteurs avec qui le sujet échange), exigences liées.
 * @param {object} o - capDosOutils()
 * @param {?object} comp - Composant choisi (sous-système), ou null pour le système (SA)
 * @returns {object} {S, L, sous, ins, fs, fsSet, feExt, ceExt, ceInt, partenaires, reqs, comps}
 */
function capDosSujet(o, comp){
  const S=comp||o.sys('SA'), L=S?o.couche(S)||'SA':'SA', P=capGetParentIndex(), F=o.F;
  // Intérieur : le sujet, ses descendants et (PA) les composants déployés sur ses nœuds
  const deploy={}; capAllElements.filter(e=>e.typeName==='PartDeploymentLink').forEach(x=>{ const a=capDosBout(x.attrs.location), b=capDosBout(x.attrs.deployedElement); if(a&&b) (deploy[a.id]=deploy[a.id]||[]).push(b.id); });
  const ins=new Set(); if(S){ const pile=[S.id]; while(pile.length){ const x=pile.pop(); if(ins.has(x)) continue; ins.add(x); pile.push(...(P.childrenOf[x]||[]), ...(deploy[x]||[])); } }
  const fs=F.list.filter(f=>f.alloc.some(a=>ins.has(a.id))), fsSet=new Set(fs.map(f=>f.id));
  const ext=[]; fs.forEach(f=>{ f.fesIn.forEach(x=>{ if(!fsSet.has(x.other)) ext.push({x, sens:'in'}); }); f.fesOut.forEach(x=>{ if(!fsSet.has(x.other)) ext.push({x, sens:'out'}); }); });
  const feExt=ext.map(y=>({e:capGetElementById_(y.x.id), sens:y.sens, autre:(F.byId[y.x.other]||{alloc:[]}).alloc[0]||null})).filter(y=>y.e);
  const ces=capAllElements.filter(e=>e.typeName==='ComponentExchange'&&o.couche(e)===L);
  const bouts=e=>[capDosBout(e.attrs.source), capDosBout(e.attrs.target)];
  const ceExt=[], ceInt=[];
  ces.forEach(e=>{ const [a,b]=bouts(e); if(!a||!b) return; const ia=ins.has(a.id), ib=ins.has(b.id);
    if(ia!==ib) ceExt.push({e, autre:ia?b:a}); else if(ia&&a.id!==b.id) ceInt.push(e); });
  // Partenaires : composants ou acteurs de l'autre côté des échanges externes
  const part=new Map(), ajout=(p, k, e)=>{ if(!p) return; const id=p.id; if(!part.has(id)) part.set(id, {p:capGetElementById_(id)||p, ces:[], fes:[]}); const z=part.get(id)[k]; if(!z.includes(e)) z.push(e); };
  ceExt.forEach(y=>ajout(y.autre, 'ces', y.e));
  feExt.forEach(y=>ajout(y.autre&&capGetElementById_(y.autre.id), 'fes', y.e));
  const partenaires=[...part.values()].filter(x=>x.p&&x.p.attrs).sort((a,b)=>(a.p.attrs.name||'').localeCompare(b.p.attrs.name||'','fr'));
  // Exigences liées au sujet, à ses fonctions ou à ses échanges ; pour le système, à défaut : celles de la couche SA, puis toutes
  const R=capComputeRequirements().list, lies=new Set([...ins, ...fsSet, ...ceExt.map(y=>y.e.id), ...feExt.map(y=>y.e.id)]);
  let reqs=R.filter(r=>r.links.some(x=>lies.has(x.id)));
  if(!comp&&!reqs.length) reqs=R.filter(r=>r.layer==='SA');
  if(!comp&&!reqs.length) reqs=R;
  // Composants directs du sujet (SSDD) : composants dont le composant parent le plus proche est le sujet
  const estComp=e=>e&&/(System|Logical|Physical)Component$/.test(e.typeName);
  const parentComp=e=>{ for(let p=P.parentOf[e.id], i=0; p&&i<30; p=P.parentOf[p], i++){ const x=capGetElementById_(p); if(estComp(x)) return x; } return null; };
  const sous=x=>x?capAllElements.filter(e=>estComp(e)&&!o.acteur(e)&&o.couche(e)===o.couche(x)&&parentComp(e)===x):[];
  return {S, L, ins, fs, fsSet, feExt, ceExt, ceInt, partenaires, reqs, sous, deploy};
}

/**
 * Exigences dont le type, le nom, le texte ou un attribut correspond à une expression.
 * @param {object[]} reqs - Exigences (capComputeRequirements)
 * @param {RegExp} rx - Expression
 * @returns {object[]}
 */
function capDosReqsDe(reqs, rx){ return reqs.filter(r=>rx.test([r.kind, r.name, r.text, ...Object.keys(r.attrs), ...Object.values(r.attrs)].join(' '))); }

/**
 * Priorité et méthode de vérification d'une exigence : attribut ou propriété PVMT dont le nom contient
 * « priorit » ou « vérif / verif / qualif / méthode ».
 * @param {object} r - Exigence
 * @returns {{prio:string, verif:string}}
 */
function capDosReqQualif(r){
  const pv=(capComputePvmt().byEl[r.id]||[]).map(v=>[v.prop, v.value]);
  const tout=[...Object.entries(r.attrs), ...pv];
  const lire=rx=>(tout.find(([k])=>rx.test(k))||[])[1]||'';
  return {prio:lire(/priorit/i), verif:lire(/v[ée]rif|qualif|m[ée]thod/i)};
}

/**
 * Lignes d'un tableau d'exigences (bloc « liste » cols:'req') : identifiant, exigence, texte, priorité, vérification, éléments liés.
 * @param {string[]} ids - Exigences
 * @returns {{head:string[], rows:{id:string, c:string[]}[]}}
 */
function capDosReqLignes(ids){
  const R=capLoaded?capComputeRequirements().list:[], by=new Map(R.map(r=>[r.id, r]));
  return {head:[_L('Identifiant'), _L('Exigence'), _L('Texte'), _L('Priorité'), _L('Vérification'), _L('Éléments liés')],
    rows:ids.map(id=>by.get(id)).filter(Boolean).map(r=>{ const q=capDosReqQualif(r);
      return {id:r.id, c:[r.ident||'', r.name||'', r.text||'', q.prio, q.verif, r.links.map(x=>x.name).filter(Boolean).slice(0,6).join(', ')]}; })};
}

/**
 * Outils communs aux plans SSS / SSDD (au-dessus de capDosOutils) : invite à compléter, tableau d'exigences,
 * diagrammes d'un élément, chapitre « exigences de … » (exigences repérées par mots-clés, sinon invite).
 * @param {object} o - capDosOutils()
 * @param {object} x - capDosSujet()
 * @returns {object} {L, Q, Req, Dg, Sec}
 */
function capDosOutilsSs(o, x){
  const t={};
  /** Tableau d'éléments, omis s'il est vide. */ t.L=(titre, l, cols)=>l&&l.length?o.Lst(titre, l, cols):null;
  /** Invite « [À compléter — …] » : ce que le DID attend. */ t.Q=quoi=>o.T(_L(`[À compléter — ${quoi}]`));
  /** Tableau d'exigences. */ t.Req=(titre, l)=>l.length?{id:capHomeUid(), k:'liste', titre, ids:l.slice(0,300).map(r=>r.id), cols:'req'}:null;
  /** Diagrammes dont l'élément est la cible (au plus n). */ t.Dg=(id, n)=>capDosDiagsDe(id).slice(0,n||3).map(r=>({id:capHomeUid(), k:'diag', ref:capHomeRefDiag(r), desc:true, elems:false}));
  /** Chapitre d'exigences repérées par mots-clés (sinon invite). */
  t.Sec=(titre, rx, quoi, plus)=>{ const l=rx?capDosReqsDe(x.reqs, rx):[];
    return o.C(titre, [...(plus||[]), l.length?t.Req(_L(`Exigences repérées : ${titre}`), l):null, t.Q(quoi)]); };
  return t;
}

/**
 * Chapitres 1 (domaine d'application) et 2 (documents de référence), communs au SSS et au SSDD.
 * @param {object} o - capDosOutils()
 * @param {object} x - capDosSujet()
 * @param {object} t - capDosOutilsSs()
 * @param {string} doc - Rôle du document (phrase de 1.3)
 * @returns {object[]} chapitres
 */
function capDosSsDebut(o, x, t, doc){
  const {C, E, D}=o, Lst=t.L, S=x.S, sys=!S||x.L==='SA';
  const missions=capAllElements.filter(e=>e.typeName==='Mission'&&o.couche(e)==='SA'), caps=capAllElements.filter(e=>e.typeName==='Capability'&&o.couche(e)==='SA');
  return [
    C(_L('Domaine d\'application'), [
      C(_L('Identification'), [t.Q(_L('identification complète : numéro, titre, abréviation, version, édition du système ou du sous-système')), S?o.T(_L(`Objet décrit : ${S.attrs.name||''} (${(CAP_HUMAN_NAMES[S.typeName]||{}).h||S.typeName}, couche ${x.L}).`)):null]),
      C(_L('Présentation du système'), [E(S), ...(sys?[Lst(_L('Missions'), missions), Lst(_L('Capacités'), caps), ...D('SA',['MCB','CC'],2)]:t.Dg(S.id,2)),
        t.Q(_L('objet général du système, nature, historique, parties prenantes (client, utilisateurs, développeur, soutien), sites d\'exploitation'))]),
      C(_L('Présentation du document'), [o.T(doc), t.Q(_L('exigences de sécurité ou de confidentialité liées à l\'usage du document'))])]),
    C(_L('Documents de référence'), [t.Q(_L('numéro, titre, révision et date de tous les documents cités, et leur origine'))])];
}

/**
 * Plan SSS (DI-IPSC-81431) : spécification du système ou du sous-système et de sa qualification.
 * @param {object} o - capDosOutils()
 * @param {object} x - capDosSujet()
 * @returns {object[]} chapitres
 */
function capDosPlanSss(o, x){
  const {C, E, D, X}=o, t=capDosOutilsSs(o, x), Lst=t.L, S=x.S, L=x.L, sys=!S||L==='SA';
  const elsDe=(ty,l)=>capAllElements.filter(e=>e.typeName===ty&&o.couche(e)===l);
  // 3.1 États et modes du sujet
  const sms=capComputeStates().sms.filter(m=>m.owner&&x.ins.has(m.owner.id));
  const smEls=sms.map(m=>capGetElementById_(m.id)).filter(Boolean);
  // 3.2 Capacités : celles de la couche (système) ou celles où le sujet ou ses fonctions interviennent
  const caps=capComputeCapabilities().filter(c=>c.layer===L&&/^(Capability|CapabilityRealization)$/.test(c.type)&&(sys||c.actors.some(a=>x.ins.has(a.id))||c.fns.some(f=>x.fsSet.has(f.id))));
  const ids=l=>l.map(e=>capGetElementById_(e.id)).filter(Boolean);
  const capChap=c=>C(c.name, [Lst(_L('Fonctions impliquées'), ids(c.fns)), Lst(_L('Chaînes fonctionnelles'), ids(c.chains)), ...t.Dg(c.id,3),
    t.Req(_L(`Exigences liées à « ${c.name} »`), x.reqs.filter(r=>r.links.some(l=>l.id===c.id||c.fns.some(f=>f.id===l.id)))),
    t.Q(_L('exigences de capacité : comportement attendu, performances, conditions, réaction aux situations imprévues'))], capGetElementById_(c.id));
  const fnChap=f=>{ const el=capGetElementById_(f.id), fe=x.feExt.filter(y=>f.fesIn.concat(f.fesOut).some(z=>z.id===y.e.id));
    return C(f.name, [Lst(_L('Entrées externes'), fe.filter(y=>y.sens==='in').map(y=>y.e), 'ech'), Lst(_L('Sorties externes'), fe.filter(y=>y.sens==='out').map(y=>y.e), 'ech'), ...t.Dg(f.id,2),
      t.Req(_L(`Exigences liées à « ${f.name} »`), x.reqs.filter(r=>r.links.some(l=>l.id===f.id))), t.Q(_L('exigences fonctionnelles et de performances de cette capacité'))], el); };
  const cap32=caps.length?caps.slice(0,40).map(capChap):x.fs.length?x.fs.slice(0,40).map(fnChap):[t.Q(_L('capacités requises du système (aucune capacité ni fonction allouée dans le modèle)'))];
  // 3.3 Interfaces externes : identification, puis une interface par partenaire
  const diag331=sys?D('SA',['SAB','CSA','CC'],3):[...t.Dg(S.id,2), ...D(L,[L==='LA'?'LAB':'PAB'],1)];
  const partChap=y=>C(y.p.attrs.name||'', [
    Lst(_L('Échanges entre composants'), y.ces, 'ech'), Lst(_L('Échanges fonctionnels'), y.fes, 'ech'),
    t.Req(_L(`Exigences de l'interface avec « ${y.p.attrs.name||''} »`), x.reqs.filter(r=>r.links.some(l=>l.id===y.p.id||y.ces.concat(y.fes).some(e=>e.id===l.id)))),
    t.Q(_L('priorité de l\'interface, type (temps réel, stockage…), éléments de données (format, unités, précision, fréquence), protocoles, caractéristiques physiques'))], y.p);
  // 3.10 Ressources informatiques (PA : nœuds, composants de comportement, liens physiques du sujet)
  const paIns=L==='PA'?[...x.ins].map(capGetElementById_).filter(e=>e&&e.typeName==='PhysicalComponent'):[];
  const pl=L==='PA'?elsDe('PhysicalLink','PA').filter(e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return (a&&x.ins.has(a.id))||(b&&x.ins.has(b.id)); }):[];
  // 3.12 Contraintes du modèle sur le sujet et ses fonctions
  const cts=capComputeConstraints(), ctl=[...new Set([...x.ins, ...x.fsSet].flatMap(id=>cts.byEl[id]||[]))];
  const ctTxt=ctl.length?o.T(ctl.slice(0,80).map(c=>'• '+(c.name||_L('(contrainte)'))+(c.text?' : '+c.text:'')+(c.on.length?_L(` (sur ${c.on.map(e=>e.name).slice(0,4).join(', ')})`):'')).join('\n')):null;
  const ei=elsDe('ExchangeItem', L), eiUt=new Set(x.feExt.concat(x.ceExt).flatMap(y=>capParseAttrRefs_(String(y.e.attrs.exchangedItems||y.e.attrs.convoyedInformations||''))));
  return [
    ...capDosSsDebut(o, x, t, _L('Ce document spécifie les exigences du système (ou du sous-système) et les méthodes à employer pour vérifier que chacune est satisfaite (plan MIL-STD-498, DID DI-IPSC-81431). Il est produit à partir du modèle Capella, puis complété.')),
    C(_L('Exigences'), [
      C(_L('États et modes requis'), [Lst(_L('Machines à états et modes'), smEls), ...smEls.flatMap(m=>t.Dg(m.id,2)), ...(sys?D('SA',['MSM'],2):[]),
        t.Q(_L('états et modes dans lesquels le système doit fonctionner, et exigences propres à chacun'))]),
      C(_L('Exigences de capacité du système'), cap32),
      C(_L('Exigences d\'interfaces externes'), [
        C(_L('Identification des interfaces et diagrammes'), [...diag331, Lst(_L('Interfaces externes (partenaires)'), x.partenaires.map(y=>y.p)), t.Q(_L('identification des interfaces externes, entités concernées, interfaces fixées et à développer'))]),
        ...x.partenaires.slice(0,40).map(partChap)]),
      C(_L('Exigences d\'interfaces internes'), [Lst(_L('Échanges internes au périmètre'), x.ceInt.slice(0,150), 'ech'), t.Q(_L('exigences imposées aux interfaces internes ; peut être laissé à la conception (SSDD)'))]),
      C(_L('Exigences sur les données internes'), [Lst(_L('Éléments échangés avec l\'extérieur'), ei.filter(e=>eiUt.has(e.id)).slice(0,120)), t.Q(_L('données internes au système : bases de données, fichiers ; peut être laissé à la conception'))]),
      t.Sec(_L('Exigences d\'adaptation'), /adaptation|param[eé]tr|configur|site/i, _L('données dépendantes de l\'installation ou paramètres d\'exploitation à fournir')),
      t.Sec(_L('Exigences de sécurité (sûreté)'), /s[ûu]ret[ée]|safety|danger|risque|hazard/i, _L('prévention ou réduction des risques pour les personnes, les biens et l\'environnement')),
      t.Sec(_L('Exigences de sécurité et de confidentialité'), /s[ée]curit[ée] de l|security|confidential|privacy|cyber|chiffr|authentif/i, _L('environnement de sécurité, type et degré de sécurité ou de confidentialité, critères de certification')),
      t.Sec(_L('Exigences d\'environnement du système'), /environnement|environment|temp[ée]rature|vibration|humidit|climat|CEM|EMC/i, _L('environnement d\'utilisation : matériel, système d\'exploitation, conditions climatiques, mécaniques…')),
      C(_L('Exigences sur les ressources informatiques'), [
        t.Sec(_L('Matériel informatique'), /mat[ée]riel|hardware|processeur|processor|calculateur/i, _L('matériel informatique à utiliser : nombre, type, taille, capacité'), paIns.length?[Lst(_L('Composants physiques du périmètre'), paIns.filter(e=>e.attrs.nature==='NODE'))]:[]),
        t.Sec(_L('Utilisation des ressources matérielles'), /m[ée]moire|memory|\bcpu\b|processeur|taux d'occupation|capacit[ée] de stockage|bande passante|bandwidth/i, _L('marges d\'utilisation : processeur, mémoire, entrées / sorties, stockage, réseau')),
        t.Sec(_L('Logiciel informatique'), /logiciel|software|syst[èe]me d'exploitation|operating system/i, _L('logiciels à utiliser ou à intégrer : système d\'exploitation, bases de données, bibliothèques'), paIns.length?[Lst(_L('Composants de comportement du périmètre'), paIns.filter(e=>e.attrs.nature!=='NODE'))]:[]),
        t.Sec(_L('Communications informatiques'), /r[ée]seau|network|communication|protocol|bus\b/i, _L('communications : localisation, configuration, débit, protocoles'), pl.length?[Lst(_L('Liens physiques du périmètre'), pl, 'ech')]:[])]),
      t.Sec(_L('Facteurs de qualité du système'), /qualit|fiabilit|reliab|maintenab|disponib|availab|testab|portab|r[ée]utilis|usab/i, _L('fiabilité, maintenabilité, disponibilité, souplesse, portabilité, réutilisabilité, testabilité, facilité d\'utilisation')),
      C(_L('Contraintes de conception et de construction'), [ctTxt, t.Req(_L('Exigences de contraintes'), capDosReqsDe(x.reqs, /contrainte|constraint|impos|norme|standard|r[èe]gle/i)), t.Q(_L('contraintes de conception et de construction : architecture imposée, composants, normes, matériaux, réutilisation'))]),
      t.Sec(_L('Exigences liées au personnel'), /personnel|op[ée]rateur|operator|ergonom|facteurs? humains?|human/i, _L('effectifs, compétences, postes de travail, facteurs humains')),
      t.Sec(_L('Exigences liées à la formation'), /(^|[^a-zà-ÿ])formation|training|apprentissage/i, _L('formation à fournir : matériel, logiciels, documentation, simulateurs')),
      t.Sec(_L('Exigences liées à la logistique'), /logisti|maintenance|soutien|rechange|spare/i, _L('maintenance, soutien logiciel, transport, approvisionnement, installations')),
      t.Sec(_L('Autres exigences'), null, _L('autres exigences : documentation à fournir, etc.')),
      t.Sec(_L('Exigences d\'emballage'), /emballage|packag|conditionnement|livraison/i, _L('emballage, marquage, manutention pour la livraison')),
      C(_L('Priorité et criticité des exigences'), [t.Req(_L('Exigences du périmètre'), x.reqs), t.Q(_L('ordre de priorité, criticité ou poids des exigences (sûreté, sécurité, confidentialité…)'))])]),
    C(_L('Dispositions de qualification'), [o.T(_L('Méthodes : Démonstration · Essai · Analyse · Inspection · Méthodes particulières (simulations, maquettes…). La colonne « Vérification » reprend l\'attribut ou la propriété de chaque exigence.')),
      t.Req(_L('Méthode de qualification de chaque exigence'), x.reqs), t.Q(_L('méthode de qualification de chaque exigence de la section 3'))]),
    C(_L('Traçabilité des exigences'), [sys?X({mode:'cat', cat:'fn', fnCh:false}):X({seed:S.id, dir:'all'}),
      t.Req(_L('Exigences et éléments liés'), x.reqs), t.Q(_L('traçabilité de chaque exigence vers les exigences du niveau supérieur qu\'elle couvre, et inversement'))]),
    C(_L('Notes'), [t.Q(_L('informations générales : sigles, abréviations, glossaire'))])];
}

/**
 * Plan SSDD (DI-IPSC-81432) : conception du système ou du sous-système (architecture, exécution, interfaces).
 * @param {object} o - capDosOutils()
 * @param {object} x - capDosSujet()
 * @returns {object[]} chapitres
 */
function capDosPlanSsdd(o, x){
  const {C, E, D, X, F}=o, t=capDosOutilsSs(o, x), Lst=t.L, sys=!x.S||x.L==='SA';
  // Architecture décrite : pour le système, la couche LA (à défaut PA) ; pour un sous-système, sa propre couche
  const La=sys?(o.sys('LA')?'LA':'PA'):x.L, racine=sys?o.sys(La):x.S;
  let comps=x.sous(racine); if(sys&&!comps.length&&La==='LA'&&o.sys('PA')) comps=x.sous(o.sys('PA'));
  const elsDe=(ty,l)=>capAllElements.filter(e=>e.typeName===ty&&o.couche(e)===l);
  const lienDe=(ty, attr)=>{ const m={}; capAllElements.filter(e=>e.typeName===ty).forEach(l=>{ const s=capDosBout(l.attrs.sourceElement), g=capDosBout(l.attrs.targetElement); if(s&&g) (m[attr==='t'?g.id:s.id]=m[attr==='t'?g.id:s.id]||[]).push(attr==='t'?s:g); }); return m; };
  const realise=lienDe('LogicalComponentRealization','s'), realisePar=lienDe('LogicalComponentRealization','t');
  const pcReal=lienDe('PhysicalComponentRealization','t');
  const ceFe=lienDe('ComponentExchangeFunctionalExchangeAllocation','s'), plCe=lienDe('ComponentExchangeAllocation','t');
  // Fonctions allouées à un composant (et à ses descendants / déployés)
  const P=capGetParentIndex();
  const interieur=c=>{ const s=new Set(), pile=[c.id]; while(pile.length){ const k=pile.pop(); if(s.has(k)) continue; s.add(k); pile.push(...(P.childrenOf[k]||[]), ...(x.deploy[k]||[])); } return s; };
  const fnsDe=c=>{ const s=interieur(c); return F.list.filter(f=>f.alloc.some(a=>s.has(a.id))).map(f=>capGetElementById_(f.id)).filter(Boolean); };
  const compChap=c=>C(c.attrs.name||'', [
    Lst(_L('Sous-composants'), x.sous(c)), Lst(_L('Fonctions allouées'), fnsDe(c)),
    Lst(_L('Éléments réalisés (couche supérieure)'), realise[c.id]||[]), Lst(_L('Réalisé par (couche inférieure)'), [...(realisePar[c.id]||[]), ...(pcReal[c.id]||[])]),
    o.couche(c)==='PA'?Lst(_L('Composants déployés'), (x.deploy[c.id]||[]).map(capGetElementById_).filter(Boolean)):null,
    ...t.Dg(c.id,2), t.Q(_L('rôle du composant, exigences qui lui sont allouées, type (matériel, logiciel, manuel), état de développement (nouveau, réutilisé), ressources informatiques'))], c);
  // Interfaces : échanges entre composants de l'architecture décrite (internes) et avec l'extérieur
  const dedans=new Set([...comps.flatMap(c=>[...interieur(c)]), ...(racine?[racine.id]:[])]);
  const ces=elsDe('ComponentExchange', La).filter(e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target); return a&&b&&(dedans.has(a.id)||dedans.has(b.id)); });
  const ceChap=e=>{ const a=capDosBout(e.attrs.source), b=capDosBout(e.attrs.target);
    return C(e.attrs.name||'', [o.T(_L(`De « ${a&&a.attrs.name||'?'} » vers « ${b&&b.attrs.name||'?'} ».`)),
      Lst(_L('Éléments échangés'), capParseAttrRefs_(String(e.attrs.exchangedItems||e.attrs.convoyedInformations||'')).map(capGetElementById_).filter(Boolean)),
      Lst(_L('Échanges fonctionnels alloués'), ceFe[e.id]||[], 'ech'), Lst(_L('Liens physiques porteurs'), plCe[e.id]||[], 'ech'),
      t.Q(_L('type d\'interface, éléments de données (format, unités, précision, fréquence, priorité), protocoles, caractéristiques physiques'))], e); };
  if(!capChainsData) capChainsData=capComputeChains();
  const chaines=capChainsData.filter(c=>c.layer===La&&(sys||((c.graph||{}).nodes||[]).some(n=>x.fsSet.has(n.refId)))).map(c=>capGetElementById_(c.id)).filter(Boolean);
  const sms=capComputeStates().sms.filter(m=>m.layer===La&&(sys||m.owner&&x.ins.has(m.owner.id))).map(m=>capGetElementById_(m.id)).filter(Boolean);
  const feExt=sys?[]:x.feExt.map(y=>y.e);
  return [
    ...capDosSsDebut(o, x, t, _L('Ce document décrit la conception du système (ou du sous-système) dans son ensemble et son architecture (plan MIL-STD-498, DID DI-IPSC-81432). Il est produit à partir du modèle Capella, puis complété.')),
    C(_L('Décisions de conception à l\'échelle du système'), [E(racine),
      Lst(_L('Entrées et sorties (échanges avec l\'extérieur)'), [...x.ceExt.map(y=>y.e), ...feExt].slice(0,150), 'ech'),
      t.Sec(_L('Décisions liées aux exigences critiques'), /s[ûu]ret[ée]|safety|s[ée]curit|security|confidential|privacy/i, _L('décisions répondant aux exigences critiques (sûreté, sécurité, confidentialité)')),
      t.Q(_L('décisions de conception à l\'échelle du système : comportement vu de l\'utilisateur, entrées et sorties, réactions aux conditions anormales, bases de données, choix de sûreté et de sécurité, justification des choix'))]),
    C(_L('Architecture du système'), [
      C(_L('Composants du système'), [...D(La,[La==='LA'?'LAB':'PAB'],2), Lst(_L('Composants'), comps), ...(comps.length?comps.slice(0,40).map(compChap):[t.Q(_L('composants du système ou du sous-système (aucun sous-composant dans le modèle)'))])]),
      C(_L('Concept d\'exécution'), [Lst(_L('Chaînes fonctionnelles'), chaines.slice(0,60)), ...chaines.slice(0,6).flatMap(c=>t.Dg(c.id,1)),
        ...D(La,['ES','IS','FS'],8), ...D(La,[La==='LA'?'LDFB':'PDFB'],2), Lst(_L('Machines à états et modes'), sms),
        t.Q(_L('concept d\'exécution entre les composants : flux de commande et de données, comportement dynamique, états et modes, séquencement, concurrence, gestion des erreurs'))]),
      C(_L('Conception des interfaces'), [
        C(_L('Identification des interfaces et diagrammes'), [...D(La,[La==='LA'?'LAB':'PAB','CEI','CDI'],3), Lst(_L('Interfaces'), ces.slice(0,150), 'ech'),
          t.Q(_L('identification des interfaces entre composants et avec l\'extérieur, entités concernées'))]),
        ...ces.slice(0,60).map(ceChap)])]),
    C(_L('Traçabilité des exigences'), [X(sys?{mode:'cat', cat:'comp', fnCh:false}:{seed:x.S.id, dir:'all'}), t.Req(_L('Exigences et éléments liés'), x.reqs),
      t.Q(_L('traçabilité de chaque composant vers les exigences qui lui sont allouées (SSS), et inversement'))]),
    C(_L('Notes'), [t.Q(_L('informations générales : sigles, abréviations, glossaire, justification des choix'))])];
}
