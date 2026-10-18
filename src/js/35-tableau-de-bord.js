/* ── 6. TABLEAU DE BORD PERSONNALISABLE ─────────────────────────────── */
/** Palette catégorielle à ordre fixe (contrôlée pour le daltonisme), déclinée pour thèmes clairs et sombres. */
const CAP_DASH_PAL={light:['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#4a3aa7','#e34948'],
  dark:['#3987e5','#d95926','#199e70','#c98500','#d55181','#008300','#9085e9','#e66767']};
/** Couleurs des natures d'allocation (identiques au filtre « Allocation » de ƒ Fonctions). */
const CAP_DASH_AK={sys:'#3fb950',act:'#58a6ff',mix:'#a371f7',none:'#8b949e'};
/** Représentations proposées selon la forme de l'indicateur : [clé, libellé, largeur, hauteur par défaut]. */
const CAP_DASH_VIZ={
  n:[['kpi',_L('Indicateur chiffré'),1,1]],
  pct:[['kpi',_L('Indicateur chiffré'),1,1],['gauge',_L('Jauge'),1,2]],
  series:[['hbar',_L('Barres horizontales'),2,2],['bar',_L('Barres verticales'),2,2],['donut',_L('Anneau'),2,2],['table',_L('Tableau'),2,2],['kpi',_L('Total'),1,1]],
  multi:[['stack',_L('Barres empilées'),2,2],['group',_L('Barres groupées'),2,2],['table',_L('Tableau'),2,2]],
  table:[['table',_L('Tableau'),4,2]],
  text:[['text',_L('Texte libre'),2,1]],
  diag:[['img',_L('Image du diagramme'),2,3]],
  xlay:[['img',_L('Image'),4,3]]};
/** Libellés courts des formes d'indicateurs (badges du catalogue). */
const CAP_DASH_KIND={n:_L('nombre'),pct:'%',series:_L('répartition'),multi:_L('croisé'),table:_L('liste'),text:_L('texte'),diag:_L('diagramme'),xlay:_L('vue')};

/** Couleur de la i-ème série dans la palette du thème courant (au-delà de 8 : gris « Autres »).
 * @param {number} i - Rang de la série
 * @returns {string} Couleur hexadécimale
 */
function capDashColor(i){ const p=CAP_DASH_PAL[capIsLight()?'light':'dark']; return i<p.length?p[i]:'#8b949e'; }
/** Taux arrondi d'éléments vérifiant un prédicat.
 * @param {Array} arr - Population
 * @param {Function} pred - Prédicat
 * @returns {{v:number,num:number,den:number}|null} Pourcentage, numérateur, dénominateur (null si population vide)
 */
function capDashPct(arr,pred){ const den=arr.length; if(!den) return null; const num=arr.filter(pred).length; return {v:Math.round(100*num/den),num,den}; }
/** Compte les éléments par clé (une ou plusieurs clés par élément) et trie par effectif décroissant.
 * @param {Array} items - Éléments
 * @param {Function} keysFn - Renvoie une clé ou un tableau de clés
 * @returns {{l:string,v:number}[]} Catégories
 */
function capDashCount(items,keysFn){
  const m=new Map(); items.forEach(x=>{ let k=keysFn(x); if(!Array.isArray(k)) k=[k]; k.forEach(y=>{ if(y==null||y==='') return; m.set(y,(m.get(y)||0)+1); }); });
  return [...m].map(([l,v])=>({l,v})).sort((a,b)=>b.v-a.v);
}

/** Catalogue de tous les indicateurs disponibles pour le modèle ouvert (fonctions, chaînes, interfaces,
 * ports, traçabilité, capacités, états, contrôles). Chaque entrée : {g:groupe, id, l:libellé, kind, f:calcul, d:aide}.
 * Les valeurs sont calculées à la demande (capDashValue) et mises en cache jusqu'au prochain ↻ Recalculer.
 * @returns {object[]} Indicateurs
 */
function capDashCatalog(){
  if(_capAnaCache.dashCat) return _capAnaCache.dashCat;
  const C=[], add=(g,id,l,kind,f,d)=>C.push({g,id,l,kind,f,d:d||''});
  const LC=k=>(CAP_LAYERS[k]||{}).color||'#8b949e';
  const F=capComputeFunctions(), layers=CAP_ANA_LAYERS.filter(k=>F.list.some(f=>f.layer===k));
  const fnsOf=k=>F.list.filter(f=>f.layer===k), leaves=fs=>fs.filter(f=>f.leaf);
  const natural=cats=>({cats,order:'natural'});

  // Modèle
  add(_L('Modèle'),'mdl.n',_L('Éléments du modèle'),'n',()=>({n:capAllElements.length}));
  add(_L('Modèle'),'mdl.layer',_L('Éléments du modèle par couche'),'series',()=>natural([...CAP_ANA_LAYERS,'Shared'].map(k=>({l:k==='Shared'?_L('Transverse'):k,v:capAllElements.filter(e=>e.layer===k).length,c:LC(k)})).filter(x=>x.v)));
  add(_L('Modèle'),'mdl.types',_L('Types d\'éléments les plus représentés'),'series',()=>({cats:capDashCount(capAllElements,e=>capAnaHuman(e.typeName))}));
  add(_L('Modèle'),'mdl.rels',_L('Relations Capella par type'),'series',()=>{ const L=capLinksData||(capLinksData=capComputeLinks()); return {cats:CAP_LINK_SECTIONS.map(s=>({l:s.humanLabel,v:(L[s.key]||[]).length})).filter(x=>x.v).sort((a,b)=>b.v-a.v)}; });

  // Fonctions : indicateurs par couche
  const IND=[
    {k:'n', l:'nombre', kind:'n', f:fs=>fs.length},
    {k:'leaf', l:_L('feuilles'), kind:'n', f:fs=>leaves(fs).length},
    {k:'depth', l:_L('profondeur maximale'), kind:'n', f:fs=>fs.reduce((m,f)=>Math.max(m,f.depth),0)},
    {k:'desc', l:_L('taux de description'), kind:'pct', f:fs=>capDashPct(fs.filter(f=>f.parentId),f=>f.desc), d:_L('Fonctions (hors racine) ayant une description')},
    {k:'alloc', l:_L('feuilles allouées'), kind:'pct', f:fs=>capDashPct(leaves(fs),f=>f.alloc.length)},
    {k:'fe', l:_L('feuilles avec échanges'), kind:'pct', f:fs=>capDashPct(leaves(fs),f=>f.fesIn.length+f.fesOut.length)},
    {k:'trace', l:_L('feuilles tracées'), kind:'pct', f:fs=>capDashPct(leaves(fs),f=>f.realizes.length||f.realizedBy.length), d:_L('Feuilles qui réalisent ou sont réalisées par une autre couche')},
    {k:'chain', l:_L('feuilles dans une chaîne'), kind:'pct', f:fs=>capDashPct(leaves(fs),f=>f.chains.length)},
    {k:'cap', l:_L('feuilles dans une capacité'), kind:'pct', f:fs=>capDashPct(leaves(fs),f=>f.caps.length)},
    {k:'nq', l:_L('noms conformes'), kind:'pct', f:fs=>capDashPct(fs.filter(f=>f.parentId),f=>!capFnNQ(f).issues.length), d:_L('Règles de ✍ Qualité des noms')}];
  IND.forEach(ind=>add(_L('Fonctions'),'fn.L.'+ind.k,_L(`Fonctions — ${ind.l} (comparaison des couches)`),'series',()=>({pct:ind.kind==='pct',order:'natural',
    cats:layers.map(k=>{ const r=ind.f(fnsOf(k)); if(r==null) return null; return ind.kind==='pct'?{l:k,v:r.v,c:LC(k),tip:`${r.num} / ${r.den}`}:{l:k,v:r,c:LC(k)}; }).filter(Boolean)}),ind.d));
  const AKL=[['sys',_L('Système')],['act',_L('Acteurs')],['mix',_L('Système + acteur')],['none',_L('Non allouées')]];
  add(_L('Fonctions'),'fn.ak',_L('Fonctions — nature de l\'allocation des feuilles, par couche'),'multi',()=>({cats:layers,
    series:AKL.map(([x,l])=>({l,c:CAP_DASH_AK[x],vals:layers.map(k=>leaves(fnsOf(k)).filter(f=>capFnAllocKind(f)===x).length)})).filter(s=>s.vals.some(v=>v))}));
  const NQL={ing:_L('Forme en -ing en tête'),noun:_L('Nom d\'action en tête'),noverb:_L('Pas de verbe en tête'),vague:_L('Verbe vague'),case:_L('Minuscule en tête'),space:_L('Espaces superflus'),punct:_L('Ponctuation finale'),long:_L('Nom trop long'),short:_L('Un seul mot')};
  add(_L('Fonctions'),'fn.nq',_L('Fonctions — problèmes de nommage par nature'),'series',()=>({cats:capDashCount(F.list.filter(f=>f.parentId),f=>capFnNQ(f).issues.map(i=>NQL[i.code]||i.code))}));
  add(_L('Fonctions'),'fn.top',_L('Fonctions les plus connectées'),'table',()=>({cols:[_L('Couche'),'N°',_L('Fonction'),_L('Échanges')],
    rows:F.list.filter(f=>f.fesIn.length+f.fesOut.length).sort((a,b)=>(b.fesIn.length+b.fesOut.length)-(a.fesIn.length+a.fesOut.length)).slice(0,30).map(f=>[f.layer,f.num,f.name,f.fesIn.length+f.fesOut.length])}));
  layers.forEach(k=>{
    const g=_L('Fonctions ')+k;
    IND.forEach(ind=>add(g,`fn.${k}.${ind.k}`,_L(`Fonctions ${k} — ${ind.l}`),ind.kind,()=>{ const r=ind.f(fnsOf(k)); return ind.kind==='pct'?r:{n:r}; },ind.d));
    add(g,`fn.${k}.ak`,_L(`Fonctions ${k} — nature de l'allocation (feuilles)`),'series',()=>natural(AKL.map(([x,l])=>({l,v:leaves(fnsOf(k)).filter(f=>capFnAllocKind(f)===x).length,c:CAP_DASH_AK[x]})).filter(x=>x.v)));
    add(g,`fn.${k}.who`,_L(`Fonctions ${k} — par allocataire`),'series',()=>({cats:capDashCount(fnsOf(k),f=>f.alloc.map(a=>(a.actor?'👤 ':'')+a.name))}));
    if(k==='LA'||k==='PA') add(g,`fn.${k}.sub`,_L(`Fonctions ${k} — par sous-système`),'series',()=>({cats:capDashCount(fnsOf(k),f=>[...new Set(capFnSubsystems(f).map(p=>p.split(' › ')[0]))])}),_L('Premier niveau sous le système'));
    add(g,`fn.${k}.lvl`,_L(`Fonctions ${k} — par niveau de profondeur`),'series',()=>{ const m=new Map(); fnsOf(k).forEach(f=>m.set(f.depth,(m.get(f.depth)||0)+1)); return natural([...m].sort((a,b)=>a[0]-b[0]).map(([d,v])=>({l:_L('Niveau ')+d,v}))); });
  });

  // Chaînes
  const CH=()=>capChainsData||(capChainsData=capComputeChains());
  add(_L('Chaînes'),'ch.n',_L('Nombre de chaînes'),'n',()=>({n:CH().length, sub:_L(`dont ${CH().filter(capChainIsEmpty).length} vide(s)`)}));
  add(_L('Chaînes'),'ch.type',_L('Chaînes par type'),'series',()=>natural(Object.keys(CAP_CHAIN_LABELS).map(t=>({l:CAP_CHAIN_LABELS[t],v:CH().filter(c=>c.type===t).length,c:CAP_CHAIN_COLORS[t]})).filter(x=>x.v)));
  add(_L('Chaînes'),'ch.layer',_L('Chaînes par couche'),'series',()=>natural(CAP_CHAIN_LAYER_ORDER.map(k=>({l:k==='?'?_L('Non classées'):k,v:CH().filter(c=>c.layer===k).length,c:LC(k)})).filter(x=>x.v)));
  add(_L('Chaînes'),'ch.empty',_L('Chaînes vides / non vides'),'series',()=>natural([{l:_L('Non vides'),v:CH().filter(c=>!capChainIsEmpty(c)).length,c:'#3fb950'},{l:_L('Vides'),v:CH().filter(capChainIsEmpty).length,c:'#8b949e'}].filter(x=>x.v)));
  add(_L('Chaînes'),'ch.full',_L('Chaînes non vides'),'pct',()=>capDashPct(CH(),c=>!capChainIsEmpty(c)));
  add(_L('Chaînes'),'ch.avg',_L('Étapes par chaîne (moyenne)'),'n',()=>{ const ne=CH().filter(c=>!capChainIsEmpty(c)); return ne.length?{n:+(ne.reduce((s,c)=>s+c.graph.nodes.length,0)/ne.length).toFixed(1),sub:_L('chaînes non vides')}:null; });
  add(_L('Chaînes'),'ch.kind',_L('Étapes des chaînes par nature d\'allocation'),'series',()=>{ const all=CH().flatMap(c=>c.type==='PhysicalPath'?[]:c.graph.nodes);
    return natural([['system',_L('Système'),'sys'],['actor',_L('Acteurs'),'act'],['none',_L('Non allouées'),'none']].map(([k,l,c])=>({l,v:all.filter(n=>n.kind===k).length,c:CAP_DASH_AK[c]})).filter(x=>x.v)); });
  add(_L('Chaînes'),'ch.top',_L('Chaînes les plus longues'),'table',()=>({cols:[_L('Chaîne'),'Type',_L('Couche'),_L('Étapes'),_L('Échanges')],
    rows:[...CH()].sort((a,b)=>b.graph.nodes.length-a.graph.nodes.length).slice(0,30).map(c=>[c.name,CAP_CHAIN_LABELS[c.type]||c.type,c.layer,c.graph.nodes.length,c.graph.edges.length])}));

  // Component Exchanges
  const CE=()=>_capAnaCache.dashCE||(_capAnaCache.dashCE=capComputeCompExchanges());
  const DIRL={fwd:_L('→ Orienté'),rev:_L('← Inversé'),bi:_L('⇄ Bidirectionnel'),unset:_L('? Non orienté')};
  add(_L('Component Exchanges'),'ce.n',_L('Nombre de Component Exchanges'),'n',()=>({n:CE().length}));
  add(_L('Component Exchanges'),'ce.kind',_L('Component Exchanges par kind'),'series',()=>({cats:capDashCount(CE(),x=>x.kind||'UNSET')}));
  add(_L('Component Exchanges'),'ce.dir',_L('Sens des Component Exchanges'),'series',()=>({cats:capDashCount(CE(),x=>x.warn?_L('⚠ Incohérent'):DIRL[x.dir]||x.dir)}));
  add(_L('Component Exchanges'),'ce.layer',_L('Component Exchanges par couche'),'series',()=>natural(CAP_ANA_LAYERS.map(k=>({l:k,v:CE().filter(x=>x.layer===k).length,c:LC(k)})).filter(x=>x.v)));
  add(_L('Component Exchanges'),'ce.fe',_L('Component Exchanges avec FE alloué'),'pct',()=>capDashPct(CE(),x=>x.fes.length));
  add(_L('Component Exchanges'),'ce.orph',_L('Ports de composant orphelins'),'n',()=>({n:(CE().allPorts||[]).filter(p=>!p.connected).length,sub:_L('ComponentPort sans exchange')}));
  add(_L('Component Exchanges'),'ce.papl',_L('CE de couche PA sans Physical Link'),'n',()=>({n:CE().filter(x=>x.layer==='PA'&&x.kind!=='DELEGATION'&&!x.pls.length).length}));
  add(_L('Component Exchanges'),'ce.comp',_L('Component Exchanges par composant'),'series',()=>({cats:capDashCount(CE(),x=>[...new Set([x.src.pcName,x.tgt.pcName])])}));

  // Physical Links
  const PL=()=>_capAnaCache.dashPL||(_capAnaCache.dashPL=capComputePhysLinks());
  add(_L('Physical Links'),'pl.n',_L('Nombre de Physical Links'),'n',()=>({n:PL().length}));
  add(_L('Physical Links'),'pl.layer',_L('Physical Links par couche'),'series',()=>natural(CAP_ANA_LAYERS.map(k=>({l:k,v:PL().filter(x=>x.layer===k).length,c:LC(k)})).filter(x=>x.v)));
  add(_L('Physical Links'),'pl.ce',_L('Physical Links portant un CE'),'pct',()=>capDashPct(PL(),x=>x.ces.length));
  add(_L('Physical Links'),'pl.orph',_L('Ports physiques sans lien'),'n',()=>({n:(PL().allPorts||[]).filter(p=>!p.connected).length}));
  add(_L('Physical Links'),'pl.nocp',_L('Ports physiques sans Component Port'),'n',()=>({n:(PL().allPorts||[]).filter(p=>!(p.cps||[]).length).length}));
  add(_L('Physical Links'),'pl.comp',_L('Physical Links par composant'),'series',()=>({cats:capDashCount(PL(),x=>[...new Set([x.src.pcName,x.tgt.pcName])])}));

  // Ports
  const PT=()=>capComputePortLinks();
  add(_L('Ports'),'pt.fp',_L('Function Ports alloués à un Component Port'),'pct',()=>capDashPct(Object.values(PT().fps||{}),p=>p.cps.length));
  add(_L('Ports'),'pt.cp',_L('Component Ports (PA) alloués à un port physique'),'pct',()=>capDashPct(Object.values(PT().cps||{}).filter(p=>p.layer==='PA'),p=>(p.pps||[]).length));
  add(_L('Ports'),'pt.pp',_L('Ports physiques portant un Component Port'),'pct',()=>capDashPct(Object.values(PT().pps||{}),p=>p.cps.length));

  // Traçabilité
  const TR=()=>capComputeTrace(false,true), COV=()=>_capAnaCache.dashCov||(_capAnaCache.dashCov=capTraceCoverage(TR()));
  add(_L('Traçabilité'),'tr.n',_L('Liens de réalisation'),'n',()=>({n:TR().links.length}));
  add(_L('Traçabilité'),'tr.tab',_L('Couverture de traçabilité (▼ réalisés · ▲ réalisants)'),'table',()=>{ const cells=COV(), pas=[...new Set(cells.map(c=>c.hi+'→'+c.lo))];
    const used=pas.filter(p=>cells.some(c=>c.hi+'→'+c.lo===p&&c.used)); if(!used.length) return null;
    const P=(a,b)=>a.length?Math.round(100*a.length/b.length)+' %':'—';
    return {cols:[_L('Catégorie'),...used],rows:CAP_TRACE_CATS.filter(k=>cells.some(c=>c.cat===k.k&&c.used)).map(k=>[k.label,...used.map(p=>{ const c=cells.find(x=>x.cat===k.k&&x.hi+'→'+x.lo===p); return c&&c.used?`▼ ${P(c.upOk,c.upAll)} · ▲ ${P(c.loOk,c.loAll)}`:'—'; })])}; });
  try{
    const cells=COV();
    CAP_TRACE_CATS.filter(k=>cells.some(c=>c.cat===k.k&&c.used)).forEach(k=>{
      const mk=(dir,lab)=>add(_L('Traçabilité'),`tr.${dir}.${k.k}`,_L(`Traçabilité — ${k.label} : % ${lab} par passage`),'series',()=>({pct:true,order:'natural',cats:COV().filter(c=>c.cat===k.k&&c.used).map(c=>{
        const a=dir==='dn'?c.upOk:c.loOk, b=dir==='dn'?c.upAll:c.loAll; return b.length?{l:c.hi+'→'+c.lo,v:Math.round(100*a.length/b.length),tip:`${a.length} / ${b.length}`,c:LC(dir==='dn'?c.hi:c.lo)}:null; }).filter(Boolean)}),
        dir==='dn'?_L('Éléments de la couche haute réalisés par la couche basse'):_L('Éléments de la couche basse qui réalisent la couche haute'));
      mk('dn',_L('réalisés ▼')); mk('up',_L('réalisants ▲'));
    });
  }catch(e){ console.warn('Tableau de bord : traçabilité indisponible',e); }

  // Capacités & missions
  const CP=()=>capComputeCapabilities(), nonMis=()=>CP().filter(c=>c.type!=='Mission');
  add(_L('Capacités'),'cap.n',_L('Capacités et missions'),'n',()=>({n:CP().length}));
  add(_L('Capacités'),'cap.type',_L('Capacités par type'),'series',()=>({cats:capDashCount(CP(),c=>capAnaHuman(c.type))}));
  add(_L('Capacités'),'cap.layer',_L('Capacités par couche'),'series',()=>natural(CAP_ANA_LAYERS.map(k=>({l:k,v:CP().filter(c=>c.layer===k).length,c:LC(k)})).filter(x=>x.v)));
  add(_L('Capacités'),'cap.fn',_L('Capacités décrites par des fonctions ou chaînes'),'pct',()=>capDashPct(nonMis(),c=>c.fns.length||c.chains.length));
  add(_L('Capacités'),'cap.chk',_L('Contrôles des capacités'),'series',()=>({cats:[
    {l:_L('Sans fonction ni chaîne'),v:nonMis().filter(c=>!c.fns.length&&!c.chains.length).length},
    {l:_L('Sans acteur ni composant'),v:CP().filter(c=>!c.actors.length).length},
    {l:_L('Sans scénario'),v:nonMis().filter(c=>!c.scen.length).length},
    {l:_L('Missions sans capacité'),v:CP().filter(c=>c.type==='Mission'&&!c.exploits.length).length}].filter(x=>x.v)}));

  // Modes & états
  const SM=()=>capComputeStates(), real=sm=>sm.states.filter(s=>!s.pseudo&&!s.final);
  add(_L('Modes & états'),'sm.n',_L('Machines à états'),'n',()=>({n:SM().sms.length,sub:_L(`${SM().sms.reduce((s,m)=>s+real(m).length,0)} états/modes · ${SM().sms.reduce((s,m)=>s+m.trans.length,0)} transitions`)}));
  add(_L('Modes & états'),'sm.owner',_L('États et modes par machine'),'series',()=>({cats:SM().sms.map(m=>({l:m.owner&&m.owner.name?m.owner.name:m.name,v:real(m).length})).filter(x=>x.v).sort((a,b)=>b.v-a.v)}));
  add(_L('Modes & états'),'sm.chk',_L('Contrôles des machines à états'),'series',()=>{ const t={noInit:0,unreach:0,deadEnd:0,noTrig:0}; SM().sms.forEach(m=>{ const c=capStateChecks(m); Object.keys(t).forEach(k=>t[k]+=c[k].length); });
    return {cats:[{l:_L('Régions sans état initial'),v:t.noInit},{l:_L('États inatteignables'),v:t.unreach},{l:_L('États sans issue'),v:t.deadEnd},{l:_L('Transitions sans déclencheur'),v:t.noTrig}].filter(x=>x.v)}; });

  // Contrôles
  const secs=s=>({cats:s.map(x=>({l:x.title,v:(x.items||[]).length})).filter(x=>x.v).sort((a,b)=>b.v-a.v)});
  add(_L('Contrôles'),'chk.fn',_L('Contrôles des fonctions'),'series',()=>secs(capFnChecks(F,'all')));
  add(_L('Contrôles'),'chk.pt',_L('Contrôles des ports'),'series',()=>secs(capPortsDiagSections(PT())));
  add(_L('Contrôles'),'chk.ce',_L('Contrôles des Component Exchanges'),'series',()=>({cats:[
    {l:_L('Sans Functional Exchange'),v:CE().filter(x=>!x.fes.length).length},{l:_L('Ports orphelins'),v:(CE().allPorts||[]).filter(p=>!p.connected).length},
    {l:_L('Orientations incohérentes'),v:CE().filter(x=>x.warn).length},{l:_L('Non orientés'),v:CE().filter(x=>x.dir==='unset').length},
    {l:_L('PA sans Physical Link'),v:CE().filter(x=>x.layer==='PA'&&x.kind!=='DELEGATION'&&!x.pls.length).length}].filter(x=>x.v)}));
  add(_L('Contrôles'),'chk.pl',_L('Contrôles des Physical Links'),'series',()=>({cats:[
    {l:_L('Sans Component Exchange'),v:PL().filter(x=>!x.ces.length).length},{l:_L('Ports physiques sans lien'),v:(PL().allPorts||[]).filter(p=>!p.connected).length},
    {l:_L('Ports physiques sans Component Port'),v:(PL().allPorts||[]).filter(p=>!(p.cps||[]).length).length},{l:_L('CE (PA) non alloués'),v:(PL().unallocCEs||[]).length}].filter(x=>x.v)}));
  add(_L('Contrôles'),'chk.sum',_L('Synthèse des contrôles par domaine'),'series',()=>{ const tot=id=>{ const m=C.find(x=>x.id===id), v=m&&capDashValue(m); return v?v.cats.reduce((s,c)=>s+c.v,0):0; };
    return {cats:[[_L('Fonctions'),'chk.fn'],[_L('Ports'),'chk.pt'],[_L('Component Exchanges'),'chk.ce'],[_L('Physical Links'),'chk.pl'],[_L('Capacités'),'cap.chk'],[_L('Modes & états'),'sm.chk'],[_L('Exigences'),'rq.chk'],[_L('Propriétés'),'pv.chk'],[_L('Données & interfaces'),'dm.chk'],[_L('Contraintes'),'ct.chk']].map(([l,id])=>({l,v:tot(id)})).filter(x=>x.v).sort((a,b)=>b.v-a.v)}; },_L('Nombre total de constats par domaine'));

  capXtDashCatalog(add, LC);
  capFexDashCatalog(add, LC);
  capCbDashCatalog(add, LC);
  capScDashCatalog(add, LC);
  capDgDashCatalog(add, LC);

  add(_L('Mise en page'),'txt',_L('Texte libre (titre, commentaire)'),'text',()=>({}));
  add(_L('Diagrammes et vues'),'diag',_L('🔲 Diagramme Capella'),'diag',()=>({}));
  add(_L('Diagrammes et vues'),'xlay',_L('🪜 Liens entre couches'),'xlay',()=>({}));
  return _capAnaCache.dashCat=C;
}
/** Valeur (mise en cache) d'un indicateur du catalogue ; null si le modèle ne contient pas la donnée.
 * @param {object} m - Indicateur
 * @returns {object|null} Valeur selon sa forme
 */
function capDashValue(m){
  const k='dv:'+m.id; if(k in _capAnaCache) return _capAnaCache[k];
  let v=null; try{ v=m.f(); }catch(e){ console.warn('Indicateur',m.id,e); v=null; }
  if(v&&v.cats&&!v.cats.length) v=null; if(v&&v.rows&&!v.rows.length) v=null; if(v&&v.series&&!v.series.length) v=null;
  return _capAnaCache[k]=v;
}

/* Rendu des représentations (SVG dessiné à la main, aux dimensions réelles du cadre) */
/** Échappe un texte et le tronque pour une étiquette de graphique.
 * @param {string} s - Texte
 * @param {number} n - Longueur maximale
 * @returns {string} Texte échappé
 */
function capDashCut(s,n){ s=String(s); return capEsc(s.length>n?s.slice(0,Math.max(1,n-1))+'…':s); }
/** Niveau d'un pourcentage : bon (≥ 90), à surveiller (≥ 50), faible.
 * @param {number} v - Pourcentage
 * @returns {{c:string,i:string,l:string}} Couleur, icône, libellé
 */
function capDashLevel(v){ return v>=90?{c:'#3fb950',i:'✔',l:_L('bon')}:v>=50?{c:'#d29922',i:'▲',l:_L('à surveiller')}:{c:'#f85149',i:'✖',l:_L('faible')}; }
/** Prépare les catégories d'une répartition : tri, limite d'affichage et regroupement en « Autres ».
 * @param {object} val - Valeur {cats, order, pct}
 * @param {object} w - Élément du tableau de bord (top, sort)
 * @returns {object[]} Catégories prêtes à dessiner
 */
function capDashCats(val,w){
  let cats=val.cats.map(c=>({...c}));
  if((w.sort||(val.order==='natural'?'natural':'value'))==='value') cats.sort((a,b)=>b.v-a.v);
  const top=+w.top||0;
  if(top&&cats.length>top){ const rest=cats.slice(top); cats=cats.slice(0,top); if(!val.pct) cats.push({l:_L(`Autres (${rest.length})`),v:rest.reduce((s,c)=>s+c.v,0),c:'#8b949e',other:true}); }
  return cats;
}
/** Dessine le contenu d'un élément du tableau de bord.
 * @param {object} w - Élément {m, v, top, sort, txt}
 * @param {object} m - Indicateur du catalogue (ou undefined)
 * @param {number} W - Largeur disponible (px)
 * @param {number} H - Hauteur disponible (px)
 * @returns {string} HTML / SVG
 */
function capDashDraw(w,m,W,H){
  if(m&&(m.kind==='diag'||m.kind==='xlay')) return capDashImgDraw(w,m);
  if(w.v==='text') return `<div class="dash-txt${(w.txt||'').length<90&&!(w.txt||'').includes('\n')?' dash-h':''}">${capEsc(w.txt||'')||_L('<span class="ana-dim">Texte vide — ⚙ pour le modifier.</span>')}</div>`;
  if(!m) return _L('<div class="dash-empty">Indicateur indisponible pour ce modèle.</div>');
  const val=capDashValue(m); if(!val) return _L('<div class="dash-empty">Aucune donnée dans ce modèle.</div>');
  const esc=capEsc, dim='var(--c-dim)', txt='var(--c-text)', surf='var(--c-bg2)';
  const fmt=(v,pct)=>pct?v+' %':(+v).toLocaleString('fr-FR');
  W=Math.max(120,W); H=Math.max(60,H);
  if(m.kind==='n') return `<div class="dash-kpi"><b>${fmt(val.n)}</b>${val.sub?`<span>${esc(val.sub)}</span>`:''}</div>`;
  if(m.kind==='pct'){
    const lv=capDashLevel(val.v);
    if(w.v==='gauge'){ const r=Math.max(16,Math.min(W/2-8,H-40)), cx=W/2, cy=r+6, a=Math.PI*(1-val.v/100), x=cx+r*Math.cos(a), y=cy-r*Math.sin(a), sw=Math.max(8,r/5);
      return `<svg width="${W}" height="${cy+30}" role="img"><title>${val.num} / ${val.den}</title>
        <path d="M${cx-r},${cy} A${r},${r} 0 0 1 ${cx+r},${cy}" fill="none" stroke="var(--c-bg4)" stroke-width="${sw}" stroke-linecap="round"/>
        ${val.v>0?`<path d="M${cx-r},${cy} A${r},${r} 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${lv.c}" stroke-width="${sw}" stroke-linecap="round"/>`:''}
        <text x="${cx}" y="${cy-4}" text-anchor="middle" style="font-size:${Math.max(14,r/2.4)}px;font-weight:700;fill:${txt}">${val.v} %</text>
        <text x="${cx}" y="${cy+20}" text-anchor="middle" style="font-size:11px;fill:${dim}">${val.num} / ${val.den} · ${lv.i} ${lv.l}</text></svg>`; }
    return `<div class="dash-kpi"><b>${val.v} %</b><span>${val.num} / ${val.den}<span class="dash-st" style="color:${lv.c}">${lv.i} ${lv.l}</span></span></div>`;
  }
  if(m.kind==='table'||w.v==='table'){
    let cols, rows;
    if(m.kind==='table'){ cols=val.cols; rows=val.rows; }
    else if(m.kind==='multi'){ cols=['',...val.series.map(s=>s.l)]; rows=val.cats.map((c,i)=>[c,...val.series.map(s=>s.vals[i])]); }
    else { const cats=capDashCats(val,w), tot=val.cats.reduce((s,c)=>s+c.v,0); cols=[_L('Catégorie'),val.pct?_L('Taux'):_L('Nombre'),...(val.pct?[_L('Détail')]:['Part'])]; rows=cats.map(c=>[c.l,fmt(c.v,val.pct),val.pct?(c.tip||''):(tot?Math.round(100*c.v/tot)+' %':'')]); }
    const RH=19, all=Math.floor((H-RH)/RH), fit=rows.length>all?Math.max(1,Math.floor((H-RH-16)/RH)):rows.length, more=rows.length-fit; rows=rows.slice(0,fit);
    const len=cols.map((c,i)=>Math.min(40,Math.max(3,String(c).length*0.8,...rows.map(r=>String(r[i]??'').length)))), lt=len.reduce((s,x)=>s+x,0);
    return `<table class="dash-tbl"><colgroup>${len.map(x=>`<col style="width:${(100*x/lt).toFixed(1)}%">`).join('')}</colgroup><thead><tr>${cols.map(c=>`<th title="${esc(c)}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td title="${esc(x)}"${i&&typeof x==='number'?' style="text-align:right"':''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>${more?_L(`<div class="dash-more">… et ${more} autre(s) ligne(s) — agrandir le cadre pour tout voir</div>`):''}`;
  }
  if(m.kind==='series'){
    const cats=capDashCats(val,w), tot=val.cats.reduce((s,c)=>s+c.v,0), one=!cats.some(c=>c.c&&!c.other);
    const col=(c,i)=>c.c||(one?capDashColor(0):capDashColor(i));
    if(w.v==='kpi') return _L(`<div class="dash-kpi"><b>${fmt(tot)}</b><span>${val.cats.length} catégorie(s)</span></div>`);
    if(w.v==='donut'){
      const r=Math.max(24,Math.min(H,W*0.45)/2-4), sw=Math.max(10,r*0.38); let a0=-Math.PI/2; const arcs=[];
      cats.forEach((c,i)=>{ const frac=tot?c.v/tot:0; if(!frac) return; const a1=a0+frac*2*Math.PI, big=a1-a0>Math.PI?1:0, rr=r-sw/2;
        const p=frac>=0.9999?`M${r},${r-rr} A${rr},${rr} 0 1 1 ${r-0.01},${r-rr}`:`M${r+rr*Math.cos(a0)},${r+rr*Math.sin(a0)} A${rr},${rr} 0 ${big} 1 ${r+rr*Math.cos(a1)},${r+rr*Math.sin(a1)}`;
        arcs.push(`<path class="dash-mk" d="${p}" fill="none" stroke="${c.other?'#8b949e':i<8?(c.c||capDashColor(i)):'#8b949e'}" stroke-width="${sw}"><title>${esc(c.l)} : ${fmt(c.v)} (${Math.round(100*frac)} %)</title></path>`); a0=a1; });
      return `<div style="display:flex;gap:12px;align-items:center;height:100%"><svg width="${2*r}" height="${2*r}" style="flex:none" role="img">${arcs.join('')}
        <text x="${r}" y="${r+5}" text-anchor="middle" style="font-size:${Math.max(12,r/3)}px;font-weight:700;fill:${txt}">${fmt(tot)}</text></svg>
        <div class="dash-leg" style="flex-direction:column;flex-wrap:nowrap;overflow:hidden;max-height:${H}px;min-width:0">${cats.slice(0,Math.max(1,Math.floor(H/16))).map((c,i)=>`<span title="${esc(c.l)}"><i style="background:${c.other?'#8b949e':i<8?(c.c||capDashColor(i)):'#8b949e'}"></i>${capDashCut(c.l,28)} <b style="color:${txt}">${fmt(c.v)}</b> · ${tot?Math.round(100*c.v/tot):0} %</span>`).join('')}</div></div>`;
    }
    const max=val.pct?100:Math.max(1,...cats.map(c=>c.v));
    if(w.v==='bar'){
      let vc=cats; const maxB=Math.max(2,Math.floor(W/22));
      if(vc.length>maxB){ const rest=vc.slice(maxB-1); vc=vc.slice(0,maxB-1); if(!val.pct) vc.push({l:_L(`Autres (${rest.length})`),v:rest.reduce((s,c)=>s+c.v,0),c:'#8b949e',other:true}); }
      if(vc!==cats){ cats.length=0; cats.push(...vc); } const max=val.pct?100:Math.max(1,...cats.map(c=>c.v));
      const n=cats.length, bw=Math.min(60,(W-10)/n), ch=H-34, x0=(W-bw*n)/2;
      return `<svg width="${W}" height="${H}" role="img"><line x1="0" x2="${W}" y1="${ch+12}" y2="${ch+12}" stroke="var(--c-border)"/>${cats.map((c,i)=>{ const h=Math.max(c.v?2:0,ch*c.v/max), x=x0+i*bw+2;
        return `<g class="dash-mk"><title>${esc(c.l)} : ${fmt(c.v,val.pct)}${c.tip?' ('+esc(c.tip)+')':''}</title><rect x="${x}" y="${ch+12-h}" width="${bw-4}" height="${h}" rx="3" fill="${col(c,i)}"/>
          <text x="${x+(bw-4)/2}" y="${ch+8-h}" text-anchor="middle" style="font-size:10px;fill:${txt}">${fmt(c.v,val.pct)}</text>
          <text x="${x+(bw-4)/2}" y="${ch+26}" text-anchor="middle" style="font-size:10px;fill:${dim}">${capDashCut(c.l,Math.max(3,Math.floor(bw/6)))}</text></g>`; }).join('')}</svg>`;
    }
    let hc=cats; const maxRows=Math.max(1,Math.floor(H/14));
    if(hc.length>maxRows){ const rest=hc.slice(maxRows-1); hc=hc.slice(0,maxRows-1); if(!val.pct) hc.push({l:_L(`Autres (${rest.length})`),v:rest.reduce((s,c)=>s+c.v,0),c:'#8b949e',other:true}); }
    const rh=Math.min(24,H/hc.length), fs=Math.max(9,Math.min(11,rh-4)), lw=Math.min(W*0.42,200), bmax=Math.max(10,W-lw-56), hmax=val.pct?100:Math.max(1,...hc.map(c=>c.v));
    return `<svg width="${W}" height="${Math.floor(hc.length*rh)}" role="img">${hc.map((c,i)=>{ const y=i*rh, bwid=Math.max(c.v?2:0,bmax*c.v/hmax), ty=y+rh/2+fs/2-1;
      return `<g class="dash-mk"><title>${esc(c.l)} : ${fmt(c.v,val.pct)}${c.tip?' ('+esc(c.tip)+')':''}</title>
        <text x="${lw-6}" y="${ty}" text-anchor="end" style="font-size:${fs}px;fill:${dim}">${capDashCut(c.l,Math.floor(lw/(fs*0.56)))}</text>
        <rect x="${lw}" y="${y+Math.max(1,rh*0.18)}" width="${bwid}" height="${Math.max(2,rh*0.64)}" rx="3" fill="${col(c,i)}"/>
        <text x="${lw+bwid+5}" y="${ty}" style="font-size:${fs}px;fill:${txt}">${fmt(c.v,val.pct)}</text></g>`; }).join('')}</svg>`;
  }
  if(m.kind==='multi'){
    const S=val.series, n=val.cats.length, leg=`<div class="dash-leg">${S.map((s,i)=>`<span><i style="background:${s.c||capDashColor(i)}"></i>${esc(s.l)}</span>`).join('')}</div>`;
    const legW=S.reduce((s,x)=>s+x.l.length*6.3+26,0), legH=Math.ceil(legW/Math.max(60,W))*17+2;
    const ch=Math.max(20,H-legH-36), gw=Math.min(90,(W-10)/n), x0=(W-gw*n)/2, base=ch+16;
    const tots=val.cats.map((_,j)=>S.reduce((s,x)=>s+x.vals[j],0));
    const max=w.v==='group'?Math.max(1,...S.flatMap(s=>s.vals)):Math.max(1,...tots);
    const body=val.cats.map((cat,j)=>{
      if(w.v==='group'){ const bw=(gw-8)/S.length;
        return S.map((s,i)=>{ const h=Math.max(s.vals[j]?2:0,ch*s.vals[j]/max), x=x0+j*gw+4+i*bw; return `<rect class="dash-mk" x="${x}" y="${base-h}" width="${Math.max(1,bw-2)}" height="${h}" rx="2" fill="${s.c||capDashColor(i)}"><title>${esc(cat)} · ${esc(s.l)} : ${fmt(s.vals[j])}</title></rect>`; }).join('')
          +`<text x="${x0+j*gw+gw/2}" y="${base+14}" text-anchor="middle" style="font-size:10px;fill:${dim}">${capDashCut(cat,Math.floor(gw/6))}</text>`; }
      let y=base; const x=x0+j*gw+6, bw=gw-12;
      return S.map((s,i)=>{ const h=ch*s.vals[j]/max; if(!h) return ''; y-=h; return `<rect class="dash-mk" x="${x}" y="${y}" width="${bw}" height="${Math.max(0,h-1.5)}" rx="2" fill="${s.c||capDashColor(i)}"><title>${esc(cat)} · ${esc(s.l)} : ${fmt(s.vals[j])} (${tots[j]?Math.round(100*s.vals[j]/tots[j]):0} %)</title></rect>`; }).join('')
        +`<text x="${x+bw/2}" y="${y-4}" text-anchor="middle" style="font-size:10px;fill:${txt}">${fmt(tots[j])}</text><text x="${x+bw/2}" y="${base+14}" text-anchor="middle" style="font-size:10px;fill:${dim}">${capDashCut(cat,Math.floor(gw/6))}</text>`;
    }).join('');
    return `${leg}<svg width="${W}" height="${ch+32}" role="img"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--c-border)"/>${body}</svg>`;
  }
  return '';
}

/* Stockage : un bloc JSON dans la page, conservé par la 💾 Page HTML */
var capDashStore=(()=>{ try{ const el=document.getElementById('cap-dashboards'); return el?JSON.parse(el.textContent):null; }catch(e){ return null; } })();
/** Enregistre les tableaux de bord dans la page (bloc JSON repris par la 💾 Page HTML). */
function capDashSave(){
  let el=document.getElementById('cap-dashboards');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-dashboards'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(capDashStore).replace(/</g,'\\u003c');
}
/** Identifiant court et unique pour un tableau de bord ou un élément. */
function capDashUid(){ return 'd'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
/** Tableau de bord d'exemple adapté au modèle ouvert (synthèse de quelques indicateurs clés).
 * @returns {object} Tableau de bord {id, name, cols, widgets}
 */
function capDashExample(){
  const cat=capDashCatalog(), has=id=>cat.some(m=>m.id===id), W=(m,v,w,h,o)=>({id:capDashUid(),m,v,w,h,...(o||{})});
  const F=capComputeFunctions(), main=['SA','LA','PA','OA'].find(k=>F.list.some(f=>f.layer===k));
  const ws=[W('txt','text',4,1,{txt:_L('Synthèse du modèle — ')+((cap_xmlDoc&&cap_xmlDoc.documentElement.getAttribute('name'))||_L('Capella'))}),
    W('mdl.n','kpi',1,1),W('fn.L.n','kpi',1,1,{t:_L('Fonctions (toutes couches)')}),W('ch.n','kpi',1,1),W('ce.n','kpi',1,1),
    W('mdl.layer','bar',2,2),W('fn.ak','stack',2,2),
    W('fn.L.desc','bar',2,2),W('ch.empty','donut',2,2),
    main&&W(`fn.${main}.alloc`,'gauge',1,2),main&&W(`fn.${main}.trace`,'gauge',1,2),W('ce.dir','donut',2,2),
    W('chk.sum','hbar',2,2),W('tr.tab','table',2,2)].filter(x=>x&&(x.m==='txt'||has(x.m)));
  return {id:capDashUid(), name:_L('Synthèse du modèle'), cols:4, widgets:ws};
}

/** Vue « 📐 Tableau de bord » : tableaux de bord personnalisés (indicateurs, graphiques, tableaux, textes),
 * un onglet par page (＋ pour en ajouter), disposition libre par glisser-déposer, redimensionnement à la souris,
 * insertion d'un élément entre deux autres, exports HTML et JSON. La position de défilement est conservée
 * d'un rendu à l'autre tant que l'on reste sur la même page.
 * @param {HTMLElement} box - Conteneur de la sous-vue
 */
function capRenderDashboard(box){
  if(!capDashStore||!capDashStore.list||!capDashStore.list.length){ const d=capDashExample(); capDashStore={cur:d.id,list:[d]}; capDashSave(); }
  const S=capDashStore, dash=S.list.find(d=>d.id===S.cur)||S.list[0]; S.cur=dash.id;
  const st=box._dash=box._dash||{edit:false};
  // Défilement conservé lors des modifications (remis en haut seulement au changement de page)
  const sc0=box.querySelector('.dash-scroll'), keep=st.shown===dash.id;
  const scTop=keep&&sc0?sc0.scrollTop:0, boxTop=keep?box.scrollTop:0; st.shown=dash.id;
  const cat=capDashCatalog(), byId={}; cat.forEach(m=>byId[m.id]=m);
  const esc=capEsc, cols=dash.cols||4;
  const rerender=()=>capRenderDashboard(box), save=()=>{ capDashSave(); };
  const titleOf=w=>capDashTitre(w,byId[w.m]);
  // Élément en cours d'ajout ou de configuration (panneau à gauche) : affiché tel quel dans la grille
  if(st.side&&(!st.edit||st.side.dash!==dash.id)) st.side=null;
  const sd=st.side, shown=dash.widgets.map(w=>sd&&sd.w0===w?sd.w:w);
  if(sd&&!sd.w0) shown.splice(sd.at>=0?sd.at:shown.length, 0, sd.w);
  const ouvrir=(w0,at)=>{ st.side={dash:dash.id, w0:w0||null, at:at==null?-1:at, q:'', open:null,
    w:w0?JSON.parse(JSON.stringify(w0)):{id:capDashUid(),m:'',v:'',w:2,h:2,top:10}}; rerender(); };
  box.innerHTML=_L(`<div class="dash-tabs">${S.list.map(d=>_L(`<div class="dash-tab${d.id===dash.id?' active':''}" data-dtab="${esc(d.id)}" title="${esc(d.name)} — double-clic pour renommer"><span class="dash-tab-n">${esc(d.name)}</span>${d.id===dash.id?_L('<span class="dash-tab-ren" data-dren title="Renommer la page">✎</span>'):''}</div>`)).join('')}<button class="dash-tab dash-tab-add" id="dash-new" title="Nouvelle page de tableau de bord">＋</button></div>
    <div class="phl-filter-bar" style="flex-wrap:wrap;margin-bottom:8px;gap:6px">
      <span class="tb-grp"><button class="cap-lf-btn${st.edit?' active':''}" id="dash-edit" title="Ajouter, configurer, déplacer et redimensionner les éléments">${st.edit?_L('✔ Terminer'):_L('✏ Modifier')}</button></span>
      ${st.edit?_L(`<span class="tb-grp" title="Contenu"><button class="cap-lf-btn" id="dash-add" style="border-color:var(--c-accent);color:var(--c-accent)">＋ Ajouter un élément</button></span>
        <span class="tb-grp" title="Mise en page"><input id="dash-name" class="phl-filter-input" value="${esc(dash.name)}" title="Nom du tableau de bord" style="width:170px">
        <select id="dash-cols" class="phl-filter-input" title="Nombre de colonnes de la grille">${[3,4,6].map(n=>_L(`<option value="${n}"${n===cols?' selected':''}>${n} colonnes</option>`)).join('')}</select></span>
        <span class="tb-grp" title="Gestion des pages"><button class="cap-lf-btn" id="dash-dup" title="Dupliquer ce tableau de bord">⧉ Dupliquer</button>
        <button class="cap-lf-btn" id="dash-ex" title="Ajouter un tableau de bord d'exemple">✨ Exemple</button>
        <button class="cap-lf-btn" id="dash-del" title="Supprimer ce tableau de bord"${S.list.length<2?' disabled':''}>🗑 Supprimer</button></span>`):''}
      <span class="tb-grp" style="margin-left:auto" title="Impression">
        <select id="dash-orient" class="phl-filter-input" style="width:auto" title="Orientation de la page A4"><option value="portrait"${st.orient!=='landscape'?' selected':''}>A4 portrait</option><option value="landscape"${st.orient==='landscape'?' selected':''}>A4 paysage</option></select>
        <button class="phl-export-btn" id="dash-print" title="Imprimer au format A4 (ou enregistrer en PDF depuis la fenêtre d'impression)">🖨 Imprimer</button></span>
      <span class="tb-grp" title="Exports">
        <button class="phl-export-btn" id="dash-html" title="Tableau de bord en HTML autonome (tel qu'affiché), imprimable">🌐 HTML</button>
        <button class="phl-export-btn" id="dash-json" title="Exporter la disposition (pour la réutiliser sur un autre modèle)">⬇ JSON</button>
        <button class="phl-export-btn" id="dash-imp" title="Importer une disposition exportée">⬆ JSON</button><input type="file" id="dash-file" accept=".json" style="display:none"></span>
    </div>
    ${st.edit?_L('<p class="ana-help">Glisser un élément par son titre pour le déplacer · coin inférieur droit pour le redimensionner · ＋ à gauche d\'un élément pour en insérer un avant lui · ⚙ configurer (panneau à gauche) · ⧉ dupliquer · ✕ retirer. Les tableaux de bord sont conservés dans la 💾 Page HTML.</p>'):''}
    <div class="dash-lay" data-fill="6">${sd?'<aside class="dash-side"></aside>':''}<div class="dash-scroll"><div class="dash-grid${st.edit?' dash-edit':''}" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">
      ${shown.map(w=>`<div class="dash-w${sd&&sd.w===w?' dash-cur':''}" data-wid="${esc(w.id)}" style="grid-column:span ${Math.min(cols,w.w||1)};grid-row:span ${w.h||1}">
        <div class="dash-wh${!st.edit&&w.v==='text'&&!w.t?' dash-wh-none':''}"${st.edit?' draggable="true"':''}>${st.edit?'<span class="ana-dim" style="cursor:grab">⠿</span>':''}<span class="dash-wt" title="${esc(titleOf(w))}">${esc(titleOf(w))}</span>
          ${st.edit?'<span class="dash-wa"><button data-wcfg title="Configurer">⚙</button><button data-wdup title="Dupliquer">⧉</button><button data-wdel title="Retirer">✕</button></span>':''}</div>
        <div class="dash-wb"></div>${st.edit?_L('<div class="dash-rz" title="Glisser pour redimensionner"></div><button class="dash-ins" data-ins title="Insérer un élément ici">＋</button>'):''}</div>`).join('')}
      ${st.edit&&dash.widgets.length?_L('<button class="dash-add-tile" data-add-end title="Ajouter un élément à la fin">＋ Ajouter un élément</button>'):''}
      ${!shown.length?_L(`<div class="dash-empty" style="grid-column:1/-1;height:200px;border:1px dashed var(--c-border);border-radius:8px">Tableau de bord vide. ${st.edit?_L('Cliquez sur « ＋ Ajouter un élément ».'):_L('Cliquez sur « ✏ Modifier » pour ajouter des indicateurs.')}</div>`):''}
    </div></div></div>`);
  capFillHeight(box);
  const grid=box.querySelector('.dash-grid');
  box.scrollTop=boxTop; box.querySelector('.dash-scroll').scrollTop=scTop;
  /** Dessine le contenu de chaque élément aux dimensions réelles de son cadre. */
  const paint=()=>grid.querySelectorAll('.dash-w[data-wid]').forEach(el=>{ const w=shown.find(x=>x.id===el.dataset.wid), b=el.querySelector('.dash-wb');
    b.innerHTML=w.m?capDashDraw(w,byId[w.m],b.clientWidth-20,b.clientHeight-12):_L('<div class="dash-empty">Nouvel élément : choisissez un indicateur, un diagramme ou une vue dans le panneau de gauche.</div>'); });
  paint();
  if(box._dashRO) box._dashRO.disconnect();
  if(window.ResizeObserver){ let t, w0=grid.clientWidth; box._dashRO=new ResizeObserver(()=>{ if(Math.abs(grid.clientWidth-w0)<4) return; w0=grid.clientWidth; clearTimeout(t); t=setTimeout(paint,150); }); box._dashRO.observe(grid); }

  // Barre d'outils
  /** Renommage d'une page dans son onglet : Entrée ou sortie du champ = valider, Échap = annuler. */
  const renameTab=tab=>{ const d=S.list.find(x=>x.id===tab.dataset.dtab); if(!d||tab.querySelector('input')) return;
    tab.innerHTML=_L(`<input class="dash-tab-in" value="${esc(d.name)}" title="Nom de la page">`);
    const inp=tab.querySelector('input'); let done=false; inp.focus(); inp.select();
    const end=ok=>{ if(done) return; done=true; if(ok){ d.name=inp.value.trim()||d.name; save(); } rerender(); };
    inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') end(true); else if(e.key==='Escape') end(false); };
    inp.onblur=()=>end(true); inp.onclick=e=>e.stopPropagation(); inp.ondblclick=e=>e.stopPropagation(); };
  box.querySelectorAll('[data-dtab]').forEach(b=>{
    b.onclick=()=>{ if(b.dataset.dtab!==S.cur){ S.cur=b.dataset.dtab; save(); rerender(); } };
    b.ondblclick=()=>renameTab(b); });
  box.querySelector('[data-dren]')?.addEventListener('click',e=>{ e.stopPropagation(); renameTab(e.target.closest('[data-dtab]')); });
  box.querySelector('#dash-edit').onclick=()=>{ st.edit=!st.edit; rerender(); };
  box.querySelector('#dash-add')?.addEventListener('click',()=>ouvrir(null));
  box.querySelector('#dash-name')?.addEventListener('change',e=>{ dash.name=e.target.value.trim()||_L('Tableau de bord'); save(); rerender(); });
  box.querySelector('#dash-cols')?.addEventListener('change',e=>{ dash.cols=+e.target.value; save(); rerender(); });
  box.querySelector('#dash-new').onclick=()=>{ const d={id:capDashUid(),name:_L('Page ')+(S.list.length+1),cols:4,widgets:[]}; S.list.push(d); S.cur=d.id; st.edit=true; save(); rerender(); };
  box.querySelector('#dash-dup')?.addEventListener('click',()=>{ const d=JSON.parse(JSON.stringify(dash)); d.id=capDashUid(); d.name+=_L(' (copie)'); d.widgets.forEach(w=>w.id=capDashUid()); S.list.push(d); S.cur=d.id; save(); rerender(); });
  box.querySelector('#dash-ex')?.addEventListener('click',()=>{ const d=capDashExample(); S.list.push(d); S.cur=d.id; save(); rerender(); });
  box.querySelector('#dash-del')?.addEventListener('click',()=>{ if(S.list.length<2||!confirm(_L(`Supprimer le tableau de bord « ${dash.name} » ?`))) return; S.list=S.list.filter(d=>d!==dash); S.cur=S.list[0].id; save(); rerender(); });
  box.querySelector('#dash-orient').onchange=e=>{ st.orient=e.target.value; };
  box.querySelector('#dash-print').onclick=()=>capDashPrint(dash, byId, st.orient||'portrait');
  box.querySelector('#dash-json').onclick=()=>capDownloadBlob(new Blob([JSON.stringify({capellaDashboard:1,...dash},null,2)],{type:'application/json'}),(dash.name.replace(/[^\w\-]+/g,'_')||_L('tableau-de-bord'))+'.json');
  box.querySelector('#dash-imp').onclick=()=>box.querySelector('#dash-file').click();
  box.querySelector('#dash-file').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!Array.isArray(d.widgets)) throw new Error('format');
      const n={id:capDashUid(),name:d.name||_L('Tableau importé'),cols:d.cols||4,widgets:d.widgets.map(w=>({...w,id:capDashUid()}))}; S.list.push(n); S.cur=n.id; save(); rerender();
    }catch(err){ alert(_L('Fichier de tableau de bord invalide.')); } }; r.readAsText(f); };
  box.querySelector('#dash-html').onclick=()=>{
    const css=`.dash-grid{display:grid;gap:10px;grid-auto-rows:120px}.dash-w{background:var(--c-bg2);border:1px solid var(--c-border);border-radius:8px;display:flex;flex-direction:column;overflow:hidden;break-inside:avoid}
      .dash-wh{padding:6px 10px 2px;font-size:12px;font-weight:600}.dash-wb{flex:1;padding:4px 10px 8px;overflow:hidden}.dash-kpi{display:flex;flex-direction:column;justify-content:center;height:100%}
      .dash-kpi b{font-size:30px;line-height:1.1}.dash-kpi span{font-size:11px;color:var(--c-dim)}.dash-st{font-size:10px;padding:0 6px;border-radius:8px;border:1px solid currentColor;margin-left:6px}
      .dash-leg{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11px;color:var(--c-dim)}.dash-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}
      .dash-tbl{border-collapse:collapse;width:100%;font-size:11px}.dash-tbl th,.dash-tbl td{border-bottom:1px solid var(--c-border);padding:2px 6px;text-align:left}.dash-txt{font-size:15px;font-weight:600;white-space:pre-wrap}.dash-empty{color:var(--c-dim);font-size:12px}`;
    const html=_L(`<style>${css}</style><div class="dash-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${[...grid.querySelectorAll('.dash-w[data-wid]')].map(el=>{ const w=dash.widgets.find(x=>x.id===el.dataset.wid);
      return `<div class="dash-w" style="grid-column:span ${Math.min(cols,w.w||1)};grid-row:span ${w.h||1}"><div class="dash-wh">${esc(titleOf(w))}</div><div class="dash-wb">${el.querySelector('.dash-wb').innerHTML}</div></div>`; }).join('')}</div>`);
    capHtmlReport({title:'📐 '+dash.name, subtitle:_L(`${dash.widgets.length} élément(s)`), tabs:[{key:'d',label:_L('Tableau de bord'),html}], filename:(dash.name.replace(/[^\w\-]+/g,'_')||_L('tableau-de-bord'))+'.html'});
  };
  // Diagrammes et vues : clic = ouvrir (hors modification)
  if(!st.edit) grid.querySelectorAll('.dash-w[data-wid]').forEach(el=>{ const w=shown.find(x=>x.id===el.dataset.wid), b=el.querySelector('.dash-wb');
    if(w&&(w.m==='diag'||w.m==='xlay')){ b.style.cursor='pointer'; b.title=_L('Ouvrir');
      b.onclick=()=>{ if(w.m==='xlay'&&w.opts){ Object.assign(_capXl,w.opts); capAnaSub='xlay'; capShowView('analyses'); } else if(w.uid&&capHomeReps().some(r=>r.uid===w.uid)) capDiagOpen(w.uid); }; } });
  if(!st.edit) return;
  if(sd) capDashSide(box.querySelector('.dash-side'), dash, st, grid, ()=>{ save(); rerender(); });

  // Édition : configurer, dupliquer, retirer
  const wOf=el=>dash.widgets.find(x=>x.id===el.closest('.dash-w').dataset.wid)||(sd&&sd.w.id===el.closest('.dash-w').dataset.wid?(sd.w0||sd.w):null);
  grid.querySelectorAll('[data-wcfg]').forEach(b=>b.onclick=()=>{ const w=wOf(b); if(w&&w!==(sd&&sd.w)) ouvrir(w); });
  grid.querySelectorAll('[data-wdup]').forEach(b=>b.onclick=()=>{ const w=wOf(b); if(!w||dash.widgets.indexOf(w)<0) return; const c={...JSON.parse(JSON.stringify(w)),id:capDashUid()}; dash.widgets.splice(dash.widgets.indexOf(w)+1,0,c); save(); rerender(); });
  grid.querySelectorAll('[data-ins]').forEach(b=>b.onclick=()=>{ const i=dash.widgets.indexOf(wOf(b)); ouvrir(null, i); });
  grid.querySelector('[data-add-end]')?.addEventListener('click',()=>ouvrir(null));
  grid.querySelectorAll('[data-wdel]').forEach(b=>b.onclick=()=>{ const w=wOf(b); if(sd&&(sd.w0===w||sd.w===w)) st.side=null; const i=dash.widgets.indexOf(w); if(i>=0) dash.widgets.splice(i,1); save(); rerender(); });
  // Glisser-déposer : insertion avant / après l'élément survolé
  let drag=null;
  grid.querySelectorAll('.dash-wh[draggable]').forEach(h=>{
    h.addEventListener('dragstart',e=>{ drag=wOf(h); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain',drag.id); }catch(_){} h.closest('.dash-w').classList.add('dash-dragging'); });
    h.addEventListener('dragend',()=>{ drag=null; grid.querySelectorAll('.dash-w').forEach(x=>x.classList.remove('dash-dragging','dash-drop-l','dash-drop-r')); });
  });
  grid.querySelectorAll('.dash-w[data-wid]').forEach(el=>{
    el.addEventListener('dragover',e=>{ if(!drag) return; e.preventDefault(); const r=el.getBoundingClientRect(), right=e.clientX>r.left+r.width/2;
      el.classList.toggle('dash-drop-r',right); el.classList.toggle('dash-drop-l',!right); });
    el.addEventListener('dragleave',()=>el.classList.remove('dash-drop-l','dash-drop-r'));
    el.addEventListener('drop',e=>{ e.preventDefault(); const tgt=wOf(el); if(!drag||tgt===drag) return; const right=el.classList.contains('dash-drop-r');
      dash.widgets.splice(dash.widgets.indexOf(drag),1); dash.widgets.splice(dash.widgets.indexOf(tgt)+(right?1:0),0,drag); drag=null; save(); rerender(); });
  });
  // Redimensionnement à la souris, aimanté à la grille
  grid.querySelectorAll('.dash-rz').forEach(h=>h.onmousedown=ev=>{
    ev.preventDefault(); const el=h.closest('.dash-w'), w=wOf(h), gap=10, colW=(grid.clientWidth-gap*(cols-1))/cols, rowH=120+gap;
    const x0=ev.clientX, y0=ev.clientY, w0=Math.min(cols,w.w||1), h0=w.h||1; let nw=w0, nh=h0;
    document.body.style.cursor='nwse-resize';
    const mv=e=>{ nw=Math.max(1,Math.min(cols,w0+Math.round((e.clientX-x0)/colW))); nh=Math.max(1,Math.min(8,h0+Math.round((e.clientY-y0)/rowH)));
      el.style.gridColumn=`span ${nw}`; el.style.gridRow=`span ${nh}`; };
    const up=()=>{ document.body.style.cursor=''; document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
      if(nw!==w0||nh!==h0){ w.w=nw; w.h=nh; save(); rerender(); } };
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
}

/** Imprime un tableau de bord au format A4 : les éléments sont redessinés à la taille de la page
 * (grille identique, couleurs claires), avec en-tête (nom, modèle, date) et sauts de page entre les éléments.
 * @param {object} dash - Tableau de bord
 * @param {object} byId - Indicateurs du catalogue indexés par identifiant
 * @param {string} orient - 'landscape' ou 'portrait'
 */
function capDashPrint(dash, byId, orient){
  const cols=dash.cols||4, gap=8, rowH=orient==='portrait'?112:104;
  const pageW=Math.floor(((orient==='portrait'?210:297)-20)*96/25.4);   // largeur utile en px CSS (marges 10 mm)
  const colW=(pageW-gap*(cols-1))/cols, esc=capEsc;
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement.getAttribute('name'))||_L('Modèle Capella');
  const titleOf=w=>capDashTitre(w,byId[w.m]);
  const cells=dash.widgets.map(w=>{ const ww=Math.min(cols,w.w||1), hh=w.h||1, W=colW*ww+gap*(ww-1)-16, H=rowH*hh+gap*(hh-1)-(w.v==='text'&&!w.t?10:30);
    return `<div class="w" style="grid-column:span ${ww};grid-row:span ${hh}">${w.v==='text'&&!w.t?'':`<div class="h">${esc(titleOf(w))}</div>`}<div class="b">${capDashDraw(w,byId[w.m],W,H)}</div></div>`; }).join('');
  const css=`@page{size:A4 ${orient};margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#15202b;background:#fff;
      --c-bg:#fff;--c-bg2:#fff;--c-bg3:#eef2f7;--c-bg4:#e1e8f1;--c-border:#c9d3df;--c-text:#15202b;--c-dim:#55657a;--c-accent:#1f5fae;--c-warn:#8a5a00;--c-ok:#1a7f37;--c-err:#c62828}
    header{display:flex;align-items:baseline;gap:12px;border-bottom:2px solid #1f5fae;padding-bottom:4px;margin-bottom:8px;width:${pageW}px}
    header b{font-size:16px} header span{font-size:11px;color:#55657a} header i{margin-left:auto;font-style:normal;font-size:10px;color:#55657a}
    .g{display:grid;grid-template-columns:repeat(${cols},${colW}px);grid-auto-rows:${rowH}px;gap:${gap}px;width:${pageW}px}
    .w{border:1px solid #c9d3df;border-radius:6px;padding:4px 8px 6px;overflow:hidden;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column}
    .h{font-size:11px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.b{flex:1;overflow:hidden}.b svg{display:block}
    .dash-kpi{display:flex;flex-direction:column;justify-content:center;height:100%}.dash-kpi b{font-size:26px;line-height:1.1}.dash-kpi span{font-size:10px;color:#55657a}
    .dash-st{font-size:9px;padding:0 5px;border-radius:8px;border:1px solid currentColor;margin-left:5px}
    .dash-leg{display:flex;flex-wrap:wrap;gap:3px 9px;font-size:10px;color:#55657a}.dash-leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:3px}
    .dash-tbl{border-collapse:collapse;width:100%;font-size:10px;table-layout:fixed}.dash-tbl th,.dash-tbl td{border-bottom:1px solid #c9d3df;padding:0 5px;height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
    .dash-tbl th{background:#eef2f7}.dash-more{font-size:9.5px;color:#55657a}.dash-empty{color:#55657a;font-size:11px}
    .dash-txt{font-size:13px;white-space:pre-wrap}.dash-txt.dash-h{display:flex;align-items:center;height:100%;font-size:18px;font-weight:700}`;
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(dash.name)}</title><style>${css}</style></head><body>
    <header><b>📐 ${esc(dash.name)}</b><span>${esc(project)}</span><i>${new Date().toLocaleString('fr-FR')}</i></header><div class="g">${cells}</div></body></html>`;
  const fr=document.createElement('iframe'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);
  fr.onload=()=>{ setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ console.error(e); } setTimeout(()=>fr.remove(),60000); },150); };
  fr.srcdoc=html;
}

/** Titre affiché d'un élément du tableau de bord.
 * @param {object} w - Élément
 * @param {object} [m] - Indicateur du catalogue
 * @returns {string} Titre
 */
function capDashTitre(w,m){
  return w.t||(w.v==='text'?'':w.m==='diag'?(w.nom||(m||{}).l||''):w.m==='xlay'&&w.opts?capXlTitre(w.opts):(m||{}).l||w.m||'');
}
/** Images base64 déjà calculées (diagrammes et vues des tableaux de bord). */
const _capDashB64=new Map();
/** Dessine un élément « image » : diagramme Capella (image enregistrée avec l'élément) ou 🔗 liens entre couches (redessinés sur le modèle chargé).
 * @param {object} w - Élément {m:'diag', uid, nom, svg} ou {m:'xlay', opts}
 * @param {object} m - Indicateur du catalogue
 * @returns {string} HTML
 */
function capDashImgDraw(w,m){
  let svg='';
  if(m.kind==='diag'){
    if(!w.svg) return _L('<div class="dash-empty">Choisissez un diagramme dans le panneau de gauche (le .aird du projet doit être ouvert).</div>');
    svg=w.svg;
  } else {
    const o=w.opts; if(!o||(o.mode!=='cat'&&!o.seed)) return _L('<div class="dash-empty">Choisissez l\'élément de départ dans le panneau de gauche.</div>');
    if(!capLoaded) return _L('<div class="dash-empty">Aucun modèle chargé.</div>');
    const k='xl:'+JSON.stringify(o); if(!(k in _capAnaCache)) _capAnaCache[k]=capXlSvg(o).svg; svg=_capAnaCache[k];
    if(!svg) return _L('<div class="dash-empty">Aucun lien de réalisation.</div>');
  }
  const k=(w.id||'')+':'+svg.length+':'+svg.slice(-40);
  if(!_capDashB64.has(k)) _capDashB64.set(k, capDosB64(svg));
  return `<img class="dash-img" alt="${capEsc(capDashTitre(w,m))}" src="data:image/svg+xml;base64,${_capDashB64.get(k)}">`;
}

/**
 * Panneau de gauche du tableau de bord (mode ✏ Modifier) : ajout ou configuration d'un élément, affiché en direct
 * dans la grille (cadre en pointillé). Réglages en haut (titre, représentation, taille, catégories, tri, texte ;
 * diagramme à choisir ; départ des liens entre couches), catalogue déplié en dessous, ✔ / Annuler en bas.
 * @param {HTMLElement} aside - Panneau
 * @param {object} dash - Tableau de bord
 * @param {object} st - État de la vue (st.side : {w brouillon, w0 élément configuré ou null, at, q, open})
 * @param {HTMLElement} grid - Grille (pour redessiner l'élément en cours)
 * @param {function} done - Enregistre et réaffiche le tableau de bord
 */
function capDashSide(aside, dash, st, grid, done){
  const sd=st.side, w=sd.w, cat=capDashCatalog(), esc=capEsc, cols=dash.cols||4;
  const rangG=g=>g===_L('Mise en page')?0:g===_L('Diagrammes et vues')?1:2;
  const groups=[...new Set(cat.map(m=>m.g))].sort((a,b)=>rangG(a)-rangG(b));
  if(!sd.open) sd.open=new Set(groups);   // catalogue déplié par défaut
  const mOf=()=>cat.find(x=>x.id===w.m);
  /** Redessine l'élément en cours dans la grille (taille, titre, contenu). */
  const tile=()=>{ const el=grid.querySelector(`.dash-w[data-wid="${CSS.escape(w.id)}"]`); if(!el) return; const m=mOf();
    el.style.gridColumn=`span ${Math.min(cols,w.w||1)}`; el.style.gridRow=`span ${w.h||1}`;
    const t=el.querySelector('.dash-wt'); if(t) t.textContent=capDashTitre(w,m);
    requestAnimationFrame(()=>{ const b=el.querySelector('.dash-wb'); b.innerHTML=m?capDashDraw(w,m,b.clientWidth-20,b.clientHeight-12):''; });
    el.scrollIntoView({block:'nearest'}); };
  aside.innerHTML=`<div class="dash-side-h"><b>${sd.w0?_L('⚙ Configurer l\'élément'):_L('＋ Nouvel élément')}</b><span style="flex:1"></span><button class="cap-lf-btn" data-sx title="${_L('Fermer sans enregistrer')}">✕</button></div>`+
    `<div class="dash-form dash-side-form"></div>`+
    `<div class="dash-side-cat"><input id="dash-q" class="phl-filter-input" placeholder="${_L('🔍 Rechercher un indicateur…')}" value="${esc(sd.q)}">`+
      `<div class="dash-side-tog"><button class="cap-lf-btn" data-cat="1" title="${_L('Déplier toutes les catégories')}">${_L('⊞ Tout déplier')}</button><button class="cap-lf-btn" data-cat="0" title="${_L('Replier toutes les catégories')}">${_L('⊟ Tout replier')}</button></div>`+
      `<div class="dash-cat-l"></div></div>`+
    `<div class="dash-side-f"><button class="cap-lf-btn" data-sx>${_L('Annuler')}</button><button class="cap-lf-btn dash-side-ok" data-ok>${sd.w0?_L('✔ Enregistrer'):_L('✔ Ajouter dans la grille')}</button></div>`;
  const L=aside.querySelector('.dash-cat-l'), form=aside.querySelector('.dash-side-form');
  /** Catalogue filtré par la recherche, groupé et repliable. */
  const list=()=>{ const ql=sd.q.toLowerCase();
    L.innerHTML=groups.map(g=>{ const ms=cat.filter(m=>m.g===g&&(!ql||(m.l+' '+m.g+' '+(m.d||'')).toLowerCase().includes(ql))); if(!ms.length) return '';
      const op=!!ql||sd.open.has(g);
      return `<div class="dash-cat-g" data-g="${esc(g)}"><span class="dash-cat-tog">${op?'▾':'▸'}</span>${esc(g)}<em>${ms.length}</em></div>`+(!op?'':ms.map(m=>`<div class="dash-cat-i${m.id===w.m?' sel':''}" data-m="${esc(m.id)}" title="${esc(m.d||m.l)}"><span>${esc(m.l)}</span><em>${CAP_DASH_KIND[m.kind]}</em></div>`).join('')); }).join('')
      ||_L('<div class="ana-dim" style="padding:10px">Aucun indicateur.</div>');
    L.querySelectorAll('[data-g]').forEach(el=>el.onclick=()=>{ const g=el.dataset.g; if(sd.open.has(g)) sd.open.delete(g); else sd.open.add(g); list(); });
    L.querySelectorAll('[data-m]').forEach(el=>el.onclick=()=>{ const m=cat.find(x=>x.id===el.dataset.m), keep=w.m&&(mOf()||{}).kind===m.kind;
      w.m=m.id; if(!keep){ const v=CAP_DASH_VIZ[m.kind][0]; w.v=v[0]; w.w=Math.min(cols,v[2]); w.h=v[3]; }
      if(m.kind==='xlay'&&!w.opts) w.opts=Object.assign(capXlOpts(),{seed:_capXl.seed||''});
      list(); cfg(); tile(); }); };
  /** Réglages de l'élément choisi. */
  const cfg=()=>{
    const m=mOf(); aside.querySelector('[data-ok]').disabled=!m;
    if(!m){ form.innerHTML=_L('<span class="ana-dim" style="grid-column:1/-1">Choisissez ci-dessous un indicateur, un diagramme ou une vue : il apparaît aussitôt dans la grille, à sa place.</span>'); return; }
    const vz=CAP_DASH_VIZ[m.kind], ser=m.kind==='series'&&w.v!=='kpi';
    const taille=`<label>${_L('Taille')}</label><span><select id="dash-w" class="phl-filter-input">${Array.from({length:cols},(_,i)=>`<option value="${i+1}"${i+1===w.w?' selected':''}>${_L(`${i+1} col.`)}</option>`).join('')}</select>
        <select id="dash-h" class="phl-filter-input">${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}"${n===w.h?' selected':''}>${_L(`${n} ligne${n>1?'s':''}`)}</option>`).join('')}</select></span>`;
    let h=`<label>${_L('Élément')}</label><b>${esc(m.g)} › ${esc(m.l)}</b>`+
      `<label>${_L('Titre')}</label><input id="dash-t" class="phl-filter-input" placeholder="${esc(capDashTitre(Object.assign({},w,{t:''}),m))}" value="${esc(w.t||'')}">`;
    if(m.kind==='diag'){
      const reps=capHomeReps();
      h+=`<label>${_L('Diagramme')}</label><span>${w.nom?`<b>${esc(w.nom)}</b> `:''}${w.uid?`<button class="cap-lf-btn" data-dref title="${_L('Reprendre l\'image du diagramme dans le .aird chargé')}">${_L('↻ Mettre à jour')}</button>`:''}</span>`+
        (reps.length?`<label></label><span><input id="dash-dq" class="phl-filter-input" placeholder="${_L('🔍 Choisir un diagramme…')}" value="${esc(sd.dq||'')}"><div class="dash-dl"></div></span>`
          :`<label></label><span class="ana-dim">${_L('Aucun .aird chargé :')} <button class="cap-lf-btn" data-aird>${_L('📂 Ouvrir le .aird…')}</button></span>`)+taille;
    } else if(m.kind==='xlay'){
      const o=w.opts, se=o.seed&&capLoaded&&capGetElementById_(o.seed);
      h+=`<label>${_L('Mode')}</label><select id="dash-xm" class="phl-filter-input"><option value="el"${o.mode==='el'?' selected':''}>${_L('À partir d\'un élément')}</option><option value="cat"${o.mode==='cat'?' selected':''}>${_L('Toute une catégorie')}</option></select>`+
        (o.mode==='cat'?`<label>${_L('Catégorie')}</label><select id="dash-xc" class="phl-filter-input">${CAP_TRACE_CATS.map(c=>`<option value="${c.k}"${o.cat===c.k?' selected':''}>${esc(c.label)}</option>`).join('')}</select>`
          :`<label>${_L('Départ')}</label><span>${se?`<b>${esc(se.attrs.name||'')}</b>`:`<span class="ana-dim">${_L('à choisir')}</span>`}<input id="dash-xq" class="phl-filter-input" placeholder="${_L('🔍 Élément de départ…')}" value="${esc(sd.xq||'')}"><div class="dash-dl"></div></span>`+
           `<label>${_L('Sens')}</label><select id="dash-xd" class="phl-filter-input"><option value="dir"${o.dir==='dir'?' selected':''}>${_L('Réalisations vers le haut et vers le bas')}</option><option value="all"${o.dir==='all'?' selected':''}>${_L('Tous les liens de proche en proche')}</option></select>`)+
        `<label></label><label class="xl-opt"><input type="checkbox" id="dash-xf"${o.fnCh?' checked':''}> ${_L('Fonctions des chaînes')}</label>`+taille;
    } else {
      h+=(m.kind==='text'?`<label>${_L('Texte')}</label><textarea id="dash-txt" class="phl-filter-input" style="height:70px">${esc(w.txt||'')}</textarea>`:'')+
        `<label>${_L('Représentation')}</label><select id="dash-v" class="phl-filter-input">${vz.map(v=>`<option value="${v[0]}"${v[0]===w.v?' selected':''}>${v[1]}</option>`).join('')}</select>`+taille+
        (ser?`<label>${_L('Catégories')}</label><select id="dash-top" class="phl-filter-input">${[[5,_L('5 premières')],[8,_L('8 premières')],[10,_L('10 premières')],[15,_L('15 premières')],[20,_L('20 premières')],[0,_L('Toutes')]].map(([n,l])=>`<option value="${n}"${(+w.top||0)===n?' selected':''}>${l}</option>`).join('')}</select>`+
          `<label>${_L('Tri')}</label><select id="dash-sort" class="phl-filter-input"><option value="">${_L('Par défaut')}</option><option value="value"${w.sort==='value'?' selected':''}>${_L('Valeur décroissante')}</option><option value="natural"${w.sort==='natural'?' selected':''}>${_L('Ordre naturel')}</option></select>`:'');
    }
    form.innerHTML=h;
    const q=id=>form.querySelector('#'+id);
    const upd=()=>{ w.t=q('dash-t').value.trim(); if(q('dash-v')) w.v=q('dash-v').value; if(q('dash-w')) w.w=+q('dash-w').value; if(q('dash-h')) w.h=+q('dash-h').value;
      if(q('dash-top')) w.top=+q('dash-top').value; if(q('dash-sort')) w.sort=q('dash-sort').value; if(q('dash-txt')) w.txt=q('dash-txt').value; tile(); };
    form.querySelectorAll('#dash-t,#dash-v,#dash-w,#dash-h,#dash-top,#dash-sort,#dash-txt').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{ const s0=ser; upd(); if(el.id==='dash-v'&&s0!==(m.kind==='series'&&w.v!=='kpi')) cfg(); }));
    // Diagramme : choix dans la liste du .aird, image reprise par la visionneuse (vue 🔲 ouverte un instant)
    const prendre=async uid=>{ const r=capHomeReps().find(x=>x.uid===uid); if(!r) return;
      form.querySelector('.dash-dl')&&(form.querySelector('.dash-dl').innerHTML=`<div class="ana-dim">${_L('⏳ Image du diagramme…')}</div>`);
      const svg=(await capDosDiagSvgs([uid]))[uid];
      if(svg){ const p=capDiagPlanche(r, svg, {cadre:false, cartouche:false, desc:false}); Object.assign(w,{uid, nom:r.nom, svg:p.svg}); if(w.h<3) w.h=3; }
      done(); };
    const dq=q('dash-dq'), dl=form.querySelector('.dash-dl');
    if(dq){ const lst=()=>{ const t=(sd.dq||'').toLowerCase(), l=capHomeReps().filter(r=>!t||(r.nom+' '+(r.sigle||'')).toLowerCase().includes(t)).slice(0,60);
        dl.innerHTML=l.map(r=>`<div class="ctx-i" data-duid="${esc(r.uid)}"><b style="color:${(CAP_LAYERS[r.couche]||{}).color||'#8b949e'};font-size:10px">${esc(r.couche||'')}</b> ${esc(r.nom)}</div>`).join('');
        dl.querySelectorAll('[data-duid]').forEach(x=>x.onclick=()=>prendre(x.dataset.duid)); };
      dq.oninput=()=>{ sd.dq=dq.value; lst(); }; lst(); }
    form.querySelector('[data-dref]')?.addEventListener('click',()=>prendre(w.uid));
    form.querySelector('[data-aird]')?.addEventListener('click',()=>capDiagPickAird());
    // Liens entre couches
    const xo=w.opts, re=()=>{ cfg(); tile(); };
    q('dash-xm')?.addEventListener('change',e=>{ xo.mode=e.target.value; re(); });
    q('dash-xc')?.addEventListener('change',e=>{ xo.cat=e.target.value; re(); });
    q('dash-xd')?.addEventListener('change',e=>{ xo.dir=e.target.value; re(); });
    q('dash-xf')?.addEventListener('change',e=>{ xo.fnCh=e.target.checked; re(); });
    const xq=q('dash-xq');
    if(xq){ const lst=()=>{ const t=(sd.xq||'').trim().toLowerCase(); if(t.length<2){ dl.innerHTML=''; return; }
        const l=capXlChercher(t, 40).slice(0,40);
        dl.innerHTML=l.map(e=>`<div class="ctx-i" data-xs="${esc(e.id)}"><b style="color:${(CAP_LAYERS[e.layer]||{}).color};font-size:10px">${esc(e.layer)}</b> ${esc(e.name)} <span class="ana-dim">${esc(capAnaHuman(e.type))}</span></div>`).join('');
        dl.querySelectorAll('[data-xs]').forEach(x=>x.onclick=()=>{ xo.seed=x.dataset.xs; sd.xq=''; re(); }); };
      xq.oninput=()=>{ sd.xq=xq.value; lst(); }; lst(); }
  };
  aside.querySelector('#dash-q').oninput=e=>{ sd.q=e.target.value; list(); };
  aside.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ if(b.dataset.cat==='1') groups.forEach(g=>sd.open.add(g)); else sd.open.clear(); list(); });
  aside.querySelectorAll('[data-sx]').forEach(b=>b.onclick=()=>{ st.side=null; done(); });
  aside.querySelector('[data-ok]').onclick=()=>{ if(!w.m) return;
    if(sd.w0) Object.assign(sd.w0,w); else if(sd.at>=0) dash.widgets.splice(sd.at,0,w); else dash.widgets.push(w);
    st.side=null; done(); };
  list(); cfg();
  if(w.m) L.querySelector('.dash-cat-i.sel')?.scrollIntoView({block:'nearest'});
  grid.querySelector('.dash-cur')?.scrollIntoView({block:'nearest'});
}
