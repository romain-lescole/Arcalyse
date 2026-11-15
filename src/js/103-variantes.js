/* ═══════════════════════════════════════════════════════════════════════════
   🎚 Variantes — modèle 150 % (sous-vue `variants` de 🔬 Analyses)
   Un modèle « 150 % » contient toutes les variantes d'une ligne de produits ; chaque élément propre à
   certaines variantes porte une marque. Trois façons de marquer sont lues :
   - 🧩 l'add-on Filtering de Capella (FilteringCriterion, FilteringResult simples et composés,
     AssociatedFilteringCriterionSet posé sur les éléments) ;
   - 🎛 des propriétés PVMT (énumération, texte « A ; B », booléens nommés comme les variantes, ou
     expression de présence « Diesel OR Hybride ») ;
   - 🟦 les fichiers de pure::variants (.xfm caractéristiques, .ccfm / .xml correspondances avec
     restrictions, .vdm variantes), lus de façon tolérante : identifiants Capella relevés dans le fichier.
   Présence d'un élément dans une variante : son conteneur est présent, ses propres marques sont
   satisfaites (aucune marque = élément commun ; au moins une restriction vraie, comme pure::variants),
   ses extrémités sont présentes (échange, lien, allocation, réalisation, part et son type).
   La vue donne l'avancement de chaque variante (allocation, réalisations, échanges alloués, descriptions,
   statut de revue), le reste à faire, une matrice éléments × variantes, les définitions et des contrôles.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Sources de variabilité reconnues : clé → pictogramme, libellé. */
const CAP_VAR_SRC={
  filt:{i:'🧩', l:_L('Add-on Filtering de Capella')},
  pvmt:{i:'🎛', l:_L('Propriétés PVMT')},
  pv:{i:'🟦', l:_L('pure::variants')}};
/** Noms (propriété, groupe ou domaine PVMT) qui désignent un marquage de variantes. */
const CAP_VAR_PV_RE=/(^|[^a-zà-ÿ])(variants?|variantes?|configurations?|produits?|products?|options?|features?|caract[ée]ristiques?|crit[èe]res?|criteri(on|a)|d[ée]clinaisons?|gammes?|product ?line|lignes? de produits?|applicabilit[ée]|effectivit[ée]|effectivity|restrictions?|pr[ée]sence)([^a-zà-ÿ]|$)/i;
/** Valeurs qui signifient « toutes les variantes » (élément commun). */
const CAP_VAR_TOUS=/^(\*|all|tous|toutes|common|commun|commune|any|toutes variantes|all variants|150 ?%)$/i;
/** Types jamais comptés comme éléments du modèle : ceux de l'add-on Filtering, les parts (doublons de leur type) et les ports. */
const CAP_VAR_TECH=/^(Filtering|AssociatedFilteringCriterionSet$|CreationDefaultFilteringCriterionSet$|UnionFilteringResultSet$|IntersectionFilteringResultSet$|ExclusionFilteringResultSet$|ComposedFilteringResult$|Part$)|Port$/;
/** Attributs de référence qui rendent un élément dépendant de ses extrémités (échange, lien, allocation, réalisation, part → type). */
const CAP_VAR_DEPS=['source','target','sourceElement','targetElement','linkEnds','involved','abstractType'];
/** Couche suivante de chaque couche ARCADIA (réalisations attendues). */
const CAP_VAR_NEXT={OA:'SA', SA:'LA', LA:'PA', PA:'EPBS'};
/** Mesures d'avancement : clé, libellé, explication. */
const CAP_VAR_MESURES=[
  {k:'alloc', l:_L('Fonctions allouées'), t:_L('Fonctions feuilles de la variante allouées à un composant (ou acteur, entité) présent dans la variante')},
  {k:'real',  l:_L('Fonctions réalisées'), t:_L('Fonctions de la variante réalisées par une fonction présente de la couche suivante (OA → SA → LA → PA), quand la variante a déjà des fonctions dans cette couche')},
  {k:'creal', l:_L('Composants réalisés'), t:_L('Composants et acteurs de la variante réalisés dans la couche suivante (SA → LA → PA), quand la variante a déjà des composants dans cette couche')},
  {k:'fe',    l:_L('Échanges alloués'), t:_L('Functional Exchanges de la variante (SA, LA, PA) alloués à un Component Exchange présent dans la variante')},
  {k:'cfn',   l:_L('Composants avec fonction'), t:_L('Composants feuilles de la variante (SA, LA, PA, hors nœuds physiques) qui reçoivent au moins une fonction présente')},
  {k:'desc',  l:_L('Éléments décrits'), t:_L('Éléments nommés de la variante dont la description est remplie')},
  {k:'stat',  l:_L('Éléments validés'), t:_L('Éléments nommés de la variante dont le statut de revue Capella est validé (REVIEWED, OK…)')}];
var _capVarUi={view:'av', layer:'all', v:'', m:'alloc', q:'', type:'', tout:false};   // état de l'affichage (non enregistré)
var _capVarQueue=[];   // fichiers pure::variants du 📁 dossier du projet, lus après le chargement du modèle

/** Réglages des variantes, enregistrés avec le projet de travail (bloc `cap-home`, 56) : source choisie, propriétés PVMT
 * retenues (null = détection automatique), variantes ajoutées à la main, fichiers pure::variants lus.
 * @returns {{src:string, props:string[]|null, perso:object[], pv:object[]}} Réglages (modifiables)
 */
function capVarCfg(){
  if(!_capHome.variantes||typeof _capHome.variantes!=='object') _capHome.variantes={};
  const c=_capHome.variantes;
  if(!Array.isArray(c.perso)) c.perso=[];
  if(!Array.isArray(c.pv)) c.pv=[];
  if(c.props!==null&&!Array.isArray(c.props)) c.props=null;
  return c;
}
/** Oublie les calculs des variantes (après un changement de réglage ou de fichiers pure::variants). */
function capVarReset(){ if(typeof _capAnaCache!=='undefined'){ delete _capAnaCache.variants; delete _capAnaCache.navVides; } }
/** Enregistre les réglages dans la page, recalcule et réaffiche la vue. */
function capVarCfgSave(){ capHomeSave(); capVarReset(); capVarRerender(); }
/** Réaffiche la sous-vue si elle est ouverte. */
function capVarRerender(){ if(capLoaded&&capCurrentView==='analyses'&&capAnaSub==='variants') capRenderAnalyses(); }

/* ── Restrictions (expressions de présence) ─────────────────────────────── */

/** Analyse une restriction : expression booléenne à la façon de pvSCL (AND, OR, NOT, XOR, IMPLIES, &&, ||, !, ->,
 * parenthèses, hasFeature('X'), true / false, noms de critères ; ET / OU / NON acceptés).
 * @param {string} txt - Expression
 * @returns {{f:function(Set<string>):boolean, ids:string[], err:string}} évaluation sur les critères choisis (minuscules),
 *   identifiants lus, erreur ('' si lisible ; une restriction illisible garde l'élément)
 */
function capVarExpr(txt){
  const src=String(txt||'').trim(), toks=[], ids=[];
  const re=/\s*(?:(\(|\)|,|&&|\|\||!|<->|<=>|->|=>)|'([^']*)'|"([^"]*)"|((?:[\wÀ-ÿ.:]|-(?!>))+))/y;
  let i=0, err='';
  while(i<src.length){
    re.lastIndex=i; const m=re.exec(src);
    if(!m){ if(/^\s+$/.test(src.slice(i))) break; err=_L(`caractère inattendu « ${src[i]} »`); break; }
    i=re.lastIndex;
    if(m[1]) toks.push({k:'op', v:m[1]}); else if(m[2]!=null||m[3]!=null) toks.push({k:'str', v:m[2]!=null?m[2]:m[3]}); else if(m[4]) toks.push({k:'id', v:m[4]});
  }
  let p=0;
  const up=t=>t?(t.k==='str'?'':t.v.toUpperCase()):'';
  const op=(...n)=>{ const t=toks[p]; if(t&&n.includes(up(t))){ p++; return true; } return false; };
  const lit=n=>{ const k=String(n).toLowerCase(); ids.push(String(n)); return s=>s.has(k); };
  const prim=()=>{
    const t=toks[p++]; if(!t) throw new Error(_L('expression incomplète'));
    if(t.k==='op'&&t.v==='('){ const x=impl(); if(!op(')')) throw new Error(_L('parenthèse fermante manquante')); return x; }
    if(t.k==='str') return lit(t.v);
    if(t.k!=='id') throw new Error(_L(`« ${t.v} » inattendu`));
    const U=t.v.toUpperCase();
    if(toks[p]&&toks[p].v==='('&&toks[p].k==='op'){
      p++; const args=[];
      while(toks[p]&&toks[p].v!==')'){ const a=toks[p++]; if(a.k==='op'&&a.v===',') continue; if(a.k==='op') throw new Error(_L(`argument inattendu « ${a.v} »`)); args.push(a.v); }
      if(!op(')')) throw new Error(_L('parenthèse fermante manquante'));
      const fn=U.replace(/^PV(SCL)?:/,'');
      if(/^(HASFEATURE|HASELEMENT|SELECTED|ISSELECTED)$/.test(fn)&&args.length) return lit(args[0]);
      throw new Error(_L(`fonction non prise en charge : ${t.v}`));
    }
    if(U==='TRUE'||U==='VRAI') return ()=>true;
    if(U==='FALSE'||U==='FAUX') return ()=>false;
    return lit(t.v);
  };
  const not=()=>{ if(op('NOT','!','NON')){ const x=not(); return s=>!x(s); } return prim(); };
  const and=()=>{ let l=not(); while(op('AND','&&','ET')){ const a=l, r=not(); l=s=>a(s)&&r(s); } return l; };
  const xor=()=>{ let l=and(); while(op('XOR')){ const a=l, r=and(); l=s=>a(s)!==r(s); } return l; };
  const or=()=>{ let l=xor(); while(op('OR','||','OU')){ const a=l, r=xor(); l=s=>a(s)||r(s); } return l; };
  function impl(){ const l=or(); if(op('IMPLIES','REQUIRES','->','=>')){ const r=impl(); return s=>!l(s)||r(s); } if(op('<->','<=>','EQUIVALENT','IFF')){ const r=impl(); return s=>l(s)===r(s); } return l; }
  let f=()=>true;
  if(!err){
    if(!toks.length) err=_L('restriction vide');
    else try{ f=impl(); if(p<toks.length) throw new Error(_L(`texte en trop après « ${toks[p-1].v} »`)); }catch(e){ err=e.message||String(e); f=()=>true; }
  }
  return {f:err?()=>true:f, ids:err?[]:ids, err};
}
const _capVarExprs=new Map();
/** Restriction analysée, gardée en mémoire par texte. @param {string} t - Expression @returns {object} Voir capVarExpr */
function capVarExprCache(t){ let e=_capVarExprs.get(t); if(!e){ e=capVarExpr(t); _capVarExprs.set(t,e); } return e; }
/** Vrai si une expression de texte ressemble à une restriction (opérateur, parenthèse, hasFeature). @param {string} v @returns {boolean} */
function capVarEstExpr(v){ return /[()!&|]|->|\b(and|or|not|xor|implies|hasfeature|ou|et|non)\b/i.test(String(v||'')); }

/** Les propres marques d'un élément sont-elles satisfaites par une sélection de critères ?
 * @param {{r:object[]}} m - Marque : restrictions {c: critère} ou {e: expression} (aucune = élément exclu partout)
 * @param {Set<string>} S - Critères choisis (identifiants en minuscules)
 * @returns {boolean}
 */
function capVarOk(m, S){ return m.r.some(x=>x.c!=null?S.has(String(x.c).toLowerCase()):x.e.f(S)); }

/* ── Sources ─────────────────────────────────────────────────────────────── */

/** Lit l'add-on Filtering de Capella : critères (paquets compris), résultats simples et composés, critères des éléments.
 * @returns {object|null} {crit:[{id,nom,pkg}], vars, marks:Map(id → {r, txt}), missing:[{id, ref, quoi}]} ou null sans critère
 */
function capVarFiltering(){
  const {all,rid}=capAnaCtx(), crit=[], byId={};
  all.forEach(n=>{ if(capTName(n)!=='FilteringCriterion') return; const p=n.parentElement, o={id:capXId(n), nom:capXName(n)||'—', pkg:p&&capTName(p)==='FilteringCriterionPkg'?capXName(p):''}; crit.push(o); byId[o.id]=o; });
  if(!crit.length&&!all.some(n=>capTName(n)==='AssociatedFilteringCriterionSet')) return null;
  const marks=new Map(), missing=[], vars=[];
  const refs=(n,a)=>(n.getAttribute(a)||'').trim().split(/\s+/).filter(Boolean).map(rid);
  all.forEach(n=>{
    const t=capTName(n);
    if(t==='AssociatedFilteringCriterionSet'){
      const o=n.parentElement, id=o&&capXId(o); if(!id) return;
      const cs=[]; refs(n,'filteringCriteria').forEach(r=>{ if(byId[r]) cs.push(byId[r].nom); else missing.push({id, ref:r, quoi:_L('critère posé sur l\'élément')}); });
      if(cs.length) marks.set(id, {r:cs.map(c=>({c})), txt:cs.join(', ')});
    } else if(t==='FilteringResult'){
      const id=capXId(n), cs=[]; refs(n,'filteringCriteria').forEach(r=>{ if(byId[r]) cs.push(byId[r].nom); else missing.push({id, ref:r, quoi:_L('critère d\'un résultat')}); });
      vars.push({id, nom:capXName(n)||'—', sel:cs, def:cs.join(' ∪ ')||_L('(aucun critère)')});
    } else if(t==='ComposedFilteringResult'){
      const comp={u:[], i:[], x:[]};
      [...n.children].forEach(c=>{ const k={UnionFilteringResultSet:'u', IntersectionFilteringResultSet:'i', ExclusionFilteringResultSet:'x'}[capTName(c)]; if(k) comp[k].push(...refs(c,'filteringResults')); });
      vars.push({id:capXId(n), nom:capXName(n)||'—', comp});
    }
  });
  const nomV=id=>{ const v=vars.find(x=>x.id===id); return v?v.nom:'?'; };
  vars.forEach(v=>{ if(!v.comp) return;
    v.def=[v.comp.u.length?v.comp.u.map(nomV).join(' ∪ '):'', v.comp.i.length?v.comp.i.map(nomV).join(' ∩ '):'', v.comp.x.length?'∖ '+v.comp.x.map(nomV).join(' ∖ '):''].filter(Boolean).join(' ');
    [...v.comp.u,...v.comp.i,...v.comp.x].forEach(r=>{ if(!vars.some(x=>x.id===r)) missing.push({id:v.id, ref:r, quoi:_L('résultat d\'un résultat composé')}); }); });
  return {crit, vars, marks, missing};
}

/** Propriétés PVMT qui peuvent marquer des variantes (hors nombres) : une par « groupe / propriété ».
 * @returns {{k:string, group:string, domain:string, prop:string, kinds:Set, n:number, vals:string[], auto:boolean}[]} détectées d'abord
 */
function capVarPvmtProps(){
  if(_capAnaCache.varProps) return _capAnaCache.varProps;
  const m=new Map();
  capComputePvmt().vals.forEach(v=>{
    if(v.kind==='num') return;
    const k=(v.group?v.group+' / ':'')+v.prop; let o=m.get(k);
    if(!o){ o={k, group:v.group||'', domain:v.domain||'', prop:v.prop, kinds:new Set(), els:new Set(), vals:new Set(), auto:false}; m.set(k,o); }
    o.kinds.add(v.kind); o.els.add(v.el.id); if(v.value&&!v.dflt&&o.vals.size<30) o.vals.add(String(v.value));
  });
  const out=[...m.values()].map(o=>({k:o.k, group:o.group, domain:o.domain, prop:o.prop, kinds:o.kinds, n:o.els.size, vals:[...o.vals],
    auto:CAP_VAR_PV_RE.test(o.prop)||CAP_VAR_PV_RE.test(o.group)||CAP_VAR_PV_RE.test(o.domain)}));
  return _capAnaCache.varProps=out.sort((a,b)=>(b.auto-a.auto)||a.k.localeCompare(b.k));
}
/** Clés des propriétés PVMT retenues (choix enregistré, sinon détection automatique). @returns {Set<string>} */
function capVarPvmtOn(){ const c=capVarCfg(); return new Set(c.props||capVarPvmtProps().filter(p=>p.auto).map(p=>p.k)); }

/** Lit les marques PVMT : énumération (littéral = critère), texte (« A ; B » ou restriction), booléen nommé comme un critère
 * (vrai = présent ; tous faux = élément retenu par aucune variante). « Tous », « * », « All » = élément commun.
 * @returns {object|null} {crit, vars:[], marks, missing:[]} ou null sans propriété retenue
 */
function capVarPvmt(){
  const props=capVarPvmtProps(); if(!props.length) return null;
  const on=capVarPvmtOn(); if(!props.some(p=>on.has(p.k))) return null;
  const marks=new Map(), crit=new Map();
  const addC=n=>{ const k=String(n).toLowerCase(); if(!crit.has(k)) crit.set(k,{id:'pvmt:'+n, nom:String(n), pkg:''}); return crit.get(k).nom; };
  const get=id=>{ let m=marks.get(id); if(!m){ m={r:[], txt:[], none:false, tous:false}; marks.set(id,m); } return m; };
  capComputePvmt().vals.forEach(v=>{
    if(v.kind==='num'||!on.has((v.group?v.group+' / ':'')+v.prop)) return;
    const val=String(v.value??'').trim();
    if(v.kind==='bool'){ const m=get(v.el.id), n=addC(v.prop); if(val==='true'){ m.r.push({c:n}); m.txt.push(n); } else m.none=true; return; }
    if(v.dflt||!val) return;
    const m=get(v.el.id);
    if(CAP_VAR_TOUS.test(val)){ m.tous=true; return; }
    if(v.kind==='str'&&capVarEstExpr(val)){ const e=capVarExprCache(val); m.r.push({e, t:val}); m.txt.push(val); e.ids.forEach(addC); return; }
    val.split(/\s*[;,|]\s*/).filter(Boolean).forEach(x=>{ if(CAP_VAR_TOUS.test(x)){ m.tous=true; return; } const n=addC(x); m.r.push({c:n}); m.txt.push(n); });
  });
  marks.forEach((m,id)=>{ if(m.tous||(!m.r.length&&!m.none)) marks.delete(id); else m.txt=m.txt.join(', ')||_L('aucune variante'); });
  return {crit:[...crit.values()].sort((a,b)=>a.nom.localeCompare(b.nom)), vars:[], marks, missing:[]};
}

/** Lit un fichier de pure::variants (XML « consulmodel »), de façon tolérante : caractéristiques (éléments dont la classe ou le
 * type contient « feature », ou tout élément d'un .xfm), restrictions des éléments qui citent un identifiant Capella
 * (restrictions des éléments parents comprises), sélections d'un modèle de variante (.vdm).
 * @param {string} txt - Contenu
 * @param {string} nom - Nom du fichier
 * @returns {{nom:string, genre:string, crit:object[], restr:object, vars:object[]}} restr : id Capella → restrictions
 */
function capVarPvLire(txt, nom){
  const doc=new DOMParser().parseFromString(txt,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error(_L('XML illisible'));
  const genre=(nom.split('.').pop()||'').toLowerCase();
  const att=(n,k)=>{ for(const a of n.attributes) if(a.localName===k) return a.value; return ''; };
  const tous=[...doc.getElementsByTagName('*')], loc=n=>n.localName;
  const elems=tous.filter(n=>loc(n)==='element');
  const owner=n=>{ for(let p=n.parentElement; p; p=p.parentElement) if(loc(p)==='element') return p; return null; };
  const parId=new Map(), byId=new Map();   // parent d'un élément (imbrication XML ou relation « parent » / « children »)
  elems.forEach(e=>{ const id=att(e,'id'); if(id) byId.set(id,e); });
  const cible=s=>String(s||'').trim().split('/').pop();
  elems.forEach(e=>{
    const o=owner(e); if(o) parId.set(e,o);
    [...e.getElementsByTagName('*')].filter(n=>loc(n)==='relation'&&owner(n)===e).forEach(r=>{
      const ty=(att(r,'type')||att(r,'class')).toLowerCase(), cs=[...r.getElementsByTagName('*')].filter(n=>loc(n)==='target').map(n=>cible(n.textContent||att(n,'id')));
      if(/parent/.test(ty)) cs.forEach(c=>{ if(byId.has(c)) parId.set(e,byId.get(c)); });
      else if(/child/.test(ty)) cs.forEach(c=>{ if(byId.has(c)) parId.set(byId.get(c),e); });
    });
  });
  const propre=new Map();
  elems.forEach(e=>{ const rs=[...e.getElementsByTagName('*')].filter(n=>loc(n)==='restriction'&&owner(n)===e).map(n=>n.textContent.trim()).filter(Boolean);
    propre.set(e, rs.length>1?rs.map(r=>'('+r+')').join(' OR '):(rs[0]||'')); });
  const crit=[], restr={}, uuid=/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
  elems.forEach(e=>{
    const cl=(att(e,'class')+' '+att(e,'type')).toLowerCase();
    if(genre==='xfm'||/feature/.test(cl)){ const id=att(e,'id'), n=att(e,'name'); crit.push({id, nom:att(e,'vname')||n||id, alias:n}); }
    const ids=new Set(), scan=s=>(String(s||'').match(uuid)||[]).forEach(u=>ids.add(u));
    for(const a of e.attributes) if(a.localName!=='id') scan(a.value);
    [...e.getElementsByTagName('*')].forEach(n=>{ if(owner(n)!==e||loc(n)==='restriction') return; for(const a of n.attributes) scan(a.value); if(!n.children.length) scan(n.textContent); });
    if(!ids.size) return;
    const chaine=[], vus=new Set(); for(let p=e; p&&!vus.has(p); p=parId.get(p)){ vus.add(p); const r=propre.get(p); if(r) chaine.push(r); }
    if(!chaine.length) return;   // élément mis en correspondance sans restriction : commun
    const x=chaine.length>1?chaine.map(r=>'('+r+')').join(' AND '):chaine[0];
    ids.forEach(id=>{ (restr[id]=restr[id]||[]).push(x); });
  });
  const vars=[], sels=tous.filter(n=>loc(n)==='selection');
  if(sels.length||genre==='vdm'){
    const sel=sels.filter(n=>!/exclu|deselect|non/i.test(att(n,'type'))).map(n=>cible(att(n,'element')||att(n,'ref')||att(n,'feature')||att(n,'id')||n.textContent)).filter(Boolean);
    vars.push({id:'pv:'+nom, nom:att(doc.documentElement,'name')||nom.replace(/\.[^.]+$/,''), sel});
  }
  return {nom, genre, crit, restr, vars};
}

/** Source pure::variants : fichiers lus et restrictions écrites sur les éléments du modèle.
 * @returns {object|null} {crit, vars, marks, missing, horsModele} ou null sans fichier
 */
function capVarPureV(){
  const F=capVarCfg().pv; if(!F.length) return null;
  const {xmap}=capAnaCtx(), crit=[], vus=new Map(), marks=new Map(), missing=[], vars=[]; let horsModele=0;
  F.forEach(f=>(f.crit||[]).forEach(c=>{ const k=(c.alias||c.nom).toLowerCase(); if(!vus.has(k)){ vus.set(k,c); crit.push({id:c.id, nom:c.nom, alias:c.alias, pkg:f.nom}); } }));
  F.forEach(f=>{
    Object.entries(f.restr||{}).forEach(([id,ts])=>{ if(!xmap[id]){ horsModele++; return; }
      const m=marks.get(id)||{r:[], txt:[]}; ts.forEach(t=>{ m.r.push({e:capVarExprCache(t), t}); m.txt.push(t); }); marks.set(id,m); });
    (f.vars||[]).forEach(v=>vars.push({id:v.id, nom:v.nom, sel:v.sel, def:_L(`${v.sel.length} caractéristique(s) choisie(s) — ${f.nom}`)}));
  });
  marks.forEach(m=>{ m.txt=m.txt.join(' ; '); });
  return {crit, vars, marks, missing, horsModele};
}

/* ── Calcul ──────────────────────────────────────────────────────────────── */

/** Calcule les variantes du modèle (en cache dans `_capAnaCache.variants`) : source retenue, critères, variantes,
 * présence de chaque élément dans chaque variante (tableau d'octets par variante, indexé comme `nodes`).
 * @returns {object} {src, dispo, S, crit, vars:[{id,nom,src,sel,comp,impl,perso,def,a:Uint8Array,n}], nodes, idx:Map, par, own, elig, layer, tout}
 */
function capVarCompute(){
  if(_capAnaCache.variants) return _capAnaCache.variants;
  const cfg=capVarCfg(), S={};
  try{ S.filt=capVarFiltering(); }catch(e){ console.warn('Variantes (Filtering)',e); }
  try{ S.pvmt=capVarPvmt(); }catch(e){ console.warn('Variantes (PVMT)',e); }
  try{ S.pv=capVarPureV(); }catch(e){ console.warn('Variantes (pure::variants)',e); }
  const dispo=['filt','pv','pvmt'].filter(k=>S[k]&&(S[k].crit.length||S[k].marks.size||S[k].vars.length));
  const src=dispo.includes(cfg.src)?cfg.src:(dispo[0]||'');
  const R={src, dispo, S, crit:[], vars:[], nodes:[], idx:new Map(), par:[], own:[], elig:[], layer:[], _m:{}};
  if(!src) return _capAnaCache.variants=R;
  const D=S[src], {all,rid}=capAnaCtx();
  R.crit=D.crit; R.missing=D.missing||[];
  // Éléments du modèle, parents, dépendances
  const nodes=R.nodes, idx=R.idx, par=R.par;
  all.forEach(n=>{ const id=capXId(n); if(!id||idx.has(id)||!capXType(n)) return; idx.set(id,nodes.length); nodes.push(n); });
  const N=nodes.length, deps=[], parts=[];
  nodes.forEach((n,i)=>{ let p=n.parentElement, j=-1; while(p){ const k=idx.get(capXId(p)); if(k!=null){ j=k; break; } p=p.parentElement; } par[i]=j; });
  nodes.forEach((n,i)=>{
    const t=capTName(n);
    R.layer[i]=CAP_CHAIN_ARCH[t]||(par[i]>=0?R.layer[par[i]]:'?');
    R.elig[i]=!!capXName(n)&&!CAP_ST_EXCL.test(t)&&!CAP_VAR_TECH.test(t);
    let d=null;
    CAP_VAR_DEPS.forEach(a=>{ const v=n.getAttribute(a); if(v) v.trim().split(/\s+/).forEach(r=>{ const j=idx.get(rid(r)); if(j!=null&&j!==i&&j!==par[i]) (d=d||[]).push(j); }); });
    if(d) deps[i]=d;
    if(t==='Part'){ const j=idx.get(rid(n.getAttribute('abstractType'))); if(j!=null) (parts[j]=parts[j]||[]).push(i); }
    R.own[i]=D.marks.get(capXId(n))||null;
  });
  // Variantes : celles de la source, sinon une par critère ; puis celles ajoutées à la main
  let vars=D.vars.map(v=>Object.assign({src}, v));
  if(!vars.length) vars=D.crit.map(c=>({id:'c:'+c.id, nom:c.nom, src, sel:[c.nom], def:_L(`critère ${c.nom} seul`), impl:true}));
  cfg.perso.filter(p=>!p.src||p.src===src).forEach(p=>vars.push({id:p.id, nom:p.nom, src, sel:p.crit||[], def:(p.crit||[]).join(' ∪ ')||_L('(aucun critère)'), perso:true}));
  const crits=new Map(); D.crit.forEach(c=>[c.nom,c.alias,c.id].filter(Boolean).forEach(k=>crits.set(String(k).toLowerCase(),c)));
  const ens=sel=>{ const s=new Set(); (sel||[]).forEach(x=>{ const k=String(x).toLowerCase(), c=crits.get(k)||D.crit.find(c=>String(c.id).split('/').pop().toLowerCase()===k);
    if(c) [c.nom,c.alias,c.id].filter(Boolean).forEach(y=>s.add(String(y).toLowerCase())); else s.add(k); }); return s; };
  // Prédicat sur les propres marques d'un élément (résultats composés : union, intersection, exclusion)
  const pred=new Map();
  const predOf=(v,pile)=>{
    if(pred.has(v.id)) return pred.get(v.id);
    if(pile.has(v.id)) return null; pile.add(v.id);
    let f;
    if(v.comp){ const g=ids=>ids.map(id=>vars.find(x=>x.id===id)).filter(Boolean).map(w=>predOf(w,pile)).filter(Boolean);
      const U=g(v.comp.u), I=g(v.comp.i), X=g(v.comp.x);
      f=m=>(!v.comp.u.length||U.some(h=>h(m)))&&(!v.comp.i.length||I.every(h=>h(m)))&&!X.some(h=>h(m)); }
    else { const s=ens(v.sel); v.S=s; f=m=>capVarOk(m,s); }
    pred.set(v.id,f); return f;
  };
  const presence=f=>{
    const a=new Uint8Array(N);
    for(let i=0;i<N;i++){ const p=par[i]; if(p>=0&&!a[p]) continue; const m=R.own[i]; a[i]=!m||f(m)?1:0; }
    for(let tour=0; tour<6; tour++){ let ch=false;
      for(let i=0;i<N;i++){ if(!a[i]) continue; const p=par[i];
        if((p>=0&&!a[p])||(deps[i]&&deps[i].some(j=>!a[j]))||(parts[i]&&!parts[i].some(j=>a[j]))){ a[i]=0; ch=true; } }
      if(!ch) break; }
    return a;
  };
  vars.forEach(v=>{ const f=predOf(v,new Set())||(()=>true); v.a=presence(f); v.ownOk=f; });
  vars.forEach(v=>{ let n=0; for(let i=0;i<N;i++) if(v.a[i]&&R.elig[i]) n++; v.n=n; });
  const tout=new Uint8Array(N).fill(1); R.tout={id:'*', nom:_L('150 % (tout le modèle)'), src, a:tout, tout:true, def:_L('tous les éléments, toutes variantes confondues')};
  let n=0; for(let i=0;i<N;i++) if(R.elig[i]) n++; R.tout.n=n;
  // Éléments variables (présence différente d'une variante à l'autre) et éléments propres à chaque variante
  R.varie=new Uint8Array(N);
  if(vars.length) for(let i=0;i<N;i++){ const x=vars[0].a[i]; if(vars.some(v=>v.a[i]!==x)||(R.own[i]&&!x)) R.varie[i]=1; }
  vars.forEach(v=>{ let k=0; for(let i=0;i<N;i++) if(v.a[i]&&R.elig[i]&&vars.some(w=>w!==v&&!w.a[i])) k++; v.propres=k; });
  R.vars=vars;
  return _capAnaCache.variants=R;
}

/** Vrai si le modèle porte des variantes (add-on Filtering, propriétés PVMT détectées ou choisies, fichiers pure::variants) — sans tout calculer.
 * @returns {boolean}
 */
function capVarExiste(){
  if(!capLoaded||(typeof _capSysml!=='undefined'&&_capSysml.lecture)) return false;   // modèle lu par un lecteur d'Arcature (SysML, UML, ReqIF) : sans objet
  const c=capVarCfg();
  if(c.pv.length||c.perso.length) return true;
  if(capAllElements.some(e=>e.typeName==='FilteringCriterion'||e.typeName==='AssociatedFilteringCriterionSet')) return true;
  try{ const on=capVarPvmtOn(); return capVarPvmtProps().some(p=>on.has(p.k)); }catch(e){ return false; }
}

/** Variante par identifiant ('*' = 150 %). @param {object} R - capVarCompute() @param {string} id @returns {object|null} */
function capVarGet(R, id){ return id==='*'?R.tout:(R.vars.find(v=>v.id===id)||null); }
/** Index d'un élément dans le calcul. @param {object} R @param {string} id @returns {number} -1 s'il est inconnu */
function capVarI(R, id){ const i=R.idx.get(id); return i==null?-1:i; }
/** Élément décrit pour l'affichage. @param {object} R @param {number} i @returns {{id,name,type,typeName,layer}} */
function capVarEl(R, i){ const n=R.nodes[i], t=capTName(n); return {id:capXId(n), name:capXName(n)||'—', type:capAnaHuman(t), typeName:t, layer:R.layer[i]}; }

/** Marque qui s'applique à un élément : la sienne, sinon celle du conteneur marqué le plus proche.
 * @param {object} R @param {number} i
 * @returns {{m:object, de:number}|null} marque et index de l'élément qui la porte
 */
function capVarMarqueDe(R, i){ for(let j=i; j>=0; j=R.par[j]) if(R.own[j]) return {m:R.own[j], de:j}; return null; }

/** Raison de l'absence d'un élément dans une variante.
 * @param {object} R @param {object} v - Variante @param {number} i
 * @returns {string} '' si présent ; sinon texte court
 */
function capVarPourquoi(R, v, i){
  if(v.a[i]) return '';
  if(R.own[i]&&!v.ownOk(R.own[i])) return _L('ses critères');
  for(let j=R.par[i]; j>=0; j=R.par[j]) if(R.own[j]&&!v.ownOk(R.own[j])) return _L(`conteneur ${capXName(R.nodes[j])||capTName(R.nodes[j])} absent`);
  return _L('extrémité, type ou conteneur absent');
}

/* ── Avancement ──────────────────────────────────────────────────────────── */

/** Données partagées des mesures : fonctions, réalisations, allocations d'échanges, fonctions par composant (en cache).
 * @param {object} R - capVarCompute()
 * @returns {object} {F, realBy, feAlloc, compFns}
 */
function capVarBase(R){
  if(R._base) return R._base;
  const F=capComputeFunctions(), realBy={}, feAlloc={}, compFns={};
  capComputeTrace(false,false).links.forEach(l=>{ (realBy[l.tgt.id]=realBy[l.tgt.id]||[]).push(l.src.id); });
  const {all,rid}=capAnaCtx();
  all.forEach(n=>{ if(capTName(n)==='ComponentExchangeFunctionalExchangeAllocation'){ const fe=rid(n.getAttribute('targetElement')), ce=rid(n.getAttribute('sourceElement')); if(fe&&ce) (feAlloc[fe]=feAlloc[fe]||[]).push(ce); } });
  F.list.forEach(f=>f.alloc.forEach(c=>{ (compFns[c.id]=compFns[c.id]||[]).push(f.id); }));
  return R._base={F, realBy, feAlloc, compFns};
}

/** Mesure d'avancement d'une variante (en cache) : éléments concernés, faits ou non, avec ce qui manque.
 * @param {object} R - capVarCompute()
 * @param {object} v - Variante (ou R.tout)
 * @param {string} k - Clé de CAP_VAR_MESURES
 * @returns {{i:number, ok:boolean, pq:string}[]} pq : ce qui manque
 */
function capVarMesure(R, v, k){
  const key=v.id+'|'+k; if(R._m[key]) return R._m[key];
  const B=capVarBase(R), a=v.a, I=id=>capVarI(R,id), pres=id=>{ const i=I(id); return i>=0&&!!a[i]; }, out=[];
  const isComp=i=>{ const c=capTraceCatOf(capTName(R.nodes[i])); return !!c&&c.k==='comp'; };
  const isFn=i=>{ const c=capTraceCatOf(capTName(R.nodes[i])); return !!c&&c.k==='fn'; };
  const aDans=(L,test)=>{ for(let i=0;i<R.nodes.length;i++) if(a[i]&&R.layer[i]===L&&test(i)) return true; return false; };
  const nextFn={}, nextComp={}; Object.keys(CAP_VAR_NEXT).forEach(L=>{ nextFn[L]=aDans(CAP_VAR_NEXT[L],isFn); nextComp[L]=aDans(CAP_VAR_NEXT[L],isComp); });
  if(k==='alloc') B.F.list.forEach(f=>{ const i=I(f.id); if(i<0||!a[i]||f.children.some(pres)) return;
    const ok=f.alloc.some(c=>pres(c.id)); out.push({i, ok, pq:ok?'':f.alloc.length?_L(`allouée seulement à ${f.alloc.map(c=>c.name).join(', ')}, absent(s) de la variante`):_L('non allouée')}); });
  else if(k==='real') B.F.list.forEach(f=>{ const i=I(f.id); if(i<0||!a[i]||!CAP_VAR_NEXT[f.layer]||f.layer==='PA'||!nextFn[f.layer]) return;
    const rb=B.realBy[f.id]||[], ok=rb.some(pres); out.push({i, ok, pq:ok?'':rb.length?_L('réalisée seulement par des éléments absents de la variante'):_L(`aucune réalisation en ${CAP_VAR_NEXT[f.layer]}`)}); });
  else if(k==='creal'||k==='cfn'){
    for(let i=0;i<R.nodes.length;i++){
      if(!a[i]||!R.elig[i]||!isComp(i)) continue;
      const n=R.nodes[i], L=R.layer[i], id=capXId(n);
      if(k==='creal'){ if(!(L==='SA'||L==='LA')||!nextComp[L]) continue;
        const rb=B.realBy[id]||[], ok=rb.some(pres); out.push({i, ok, pq:ok?'':rb.length?_L('réalisé seulement par des éléments absents de la variante'):_L(`aucune réalisation en ${CAP_VAR_NEXT[L]}`)}); }
      else { if(!(L==='SA'||L==='LA'||L==='PA')||n.getAttribute('nature')==='NODE'||/ConfigurationItem$/.test(capTName(n))) continue;
        let feuille=true; for(const c of n.children){ const j=I(capXId(c)); if(j>=0&&a[j]&&isComp(j)){ feuille=false; break; } } if(!feuille) continue;
        const fs=B.compFns[id]||[], ok=fs.some(pres); out.push({i, ok, pq:ok?'':fs.length?_L('ses fonctions sont absentes de la variante'):_L('aucune fonction allouée')}); }
    }
  }
  else if(k==='fe') R.nodes.forEach((n,i)=>{ if(!a[i]||capTName(n)!=='FunctionalExchange'||!['SA','LA','PA'].includes(R.layer[i])) return;
    const ces=B.feAlloc[capXId(n)]||[], ok=ces.some(pres); out.push({i, ok, pq:ok?'':ces.length?_L('alloué seulement à des Component Exchanges absents'):_L('non alloué à un Component Exchange')}); });
  else if(k==='desc') R.nodes.forEach((n,i)=>{ if(!a[i]||!R.elig[i]) return; const ok=!!capHtmlToText(n.getAttribute('description')||'').trim(); out.push({i, ok, pq:ok?'':_L('sans description')}); });
  else if(k==='stat'){ const St=capComputeStatus(); R.nodes.forEach((n,i)=>{ if(!a[i]||!R.elig[i]) return; const s=St.byEl[capXId(n)], ok=!!s&&s.cls==='ok';
    out.push({i, ok, pq:ok?'':s&&s.status?_L(`statut ${s.status}`):_L('sans statut de revue')}); }); }
  return R._m[key]=out;
}
/** Mesures utiles pour ce modèle (le statut de revue seulement s'il est employé). @returns {object[]} */
function capVarMesures(){ const st=capAllElements.some(e=>e.attrs&&e.attrs.status); return CAP_VAR_MESURES.filter(m=>m.k!=='stat'||st); }

/** Barre d'avancement colorée selon le taux. @param {number} ok @param {number} n @param {string} [tip] @returns {string} HTML */
function capVarBarre(ok, n, tip){
  if(!n) return '<span class="ana-dim">—</span>';
  const pc=Math.round(100*ok/n), c=pc>=80?'var(--c-ok,#3fb950)':pc>=50?'var(--c-warn,#e3b341)':'var(--c-err,#f85149)';
  return `<span style="display:inline-flex;align-items:center;gap:5px" title="${capEsc(tip||'')}"><span class="hm-prog"><span style="width:${pc}%;background:${c}"></span></span><span class="hm-prog-t"><b style="color:var(--c-text)">${pc} %</b> ${ok}/${n}</span></span>`;
}

/* ── Contrôles ───────────────────────────────────────────────────────────── */

/** Contrôles du modèle 150 % : éléments retenus par aucune variante, allocations et réalisations perdues dans une variante,
 * marques sans effet, critères inutilisés ou introuvables, restrictions illisibles, variantes sans critère ou identiques.
 * @returns {object[]} Sections {icon, sev, title, tip, cols, items}
 */
function capVarChecks(){
  const R=capVarCompute(); if(!R.src) return [];
  const B=capVarBase(R), V=R.vars, row=(i,...c)=>{ const e=capVarEl(R,i); return `<tr><td>${capChainLayerBadge(e.layer)} ${capDetLink(e.id,e.name,'font-weight:600')}</td><td class="ana-dim">${capEsc(e.type)}</td>${c.map(x=>`<td>${x}</td>`).join('')}</tr>`; };
  const noms=vs=>vs.map(v=>capEsc(v.nom)).join(', '), mtxt=i=>{ const m=R.own[i]; return m?capEsc(m.txt):''; };
  const C=[_L('Élément'),'Type'];
  const morts=[], perdA=[], perdR=[], sansEffet=[];
  const I=id=>capVarI(R,id);
  R.nodes.forEach((n,i)=>{
    if(!R.elig[i]) return;
    if(R.own[i]&&V.length&&!V.some(v=>v.a[i])&&(R.par[i]<0||V.some(v=>v.a[R.par[i]]))) morts.push(row(i,mtxt(i)));
    if(R.own[i]){ const vs=V.filter(v=>!v.a[i]&&v.ownOk(R.own[i])&&R.par[i]>=0&&!v.a[R.par[i]]); if(vs.length) sansEffet.push(row(i,mtxt(i),noms(vs))); }
  });
  B.F.list.forEach(f=>{ const i=I(f.id); if(i<0||!f.alloc.length) return;
    const vs=V.filter(v=>v.a[i]&&!f.children.some(c=>{ const j=I(c); return j>=0&&v.a[j]; })&&!f.alloc.some(c=>{ const j=I(c.id); return j>=0&&v.a[j]; }));
    if(vs.length) perdA.push(row(i,f.alloc.map(c=>capDetLink(c.id,c.name)).join(', '),noms(vs))); });
  R.nodes.forEach((n,i)=>{ if(!R.elig[i]) return; const rb=B.realBy[capXId(n)]; if(!rb||!rb.length) return;
    const vs=V.filter(v=>v.a[i]&&!rb.some(id=>{ const j=I(id); return j>=0&&v.a[j]; }));
    if(vs.length) perdR.push(row(i,rb.map(id=>{ const j=I(id); return j>=0?capDetLink(id,capXName(R.nodes[j])||'—'):capEsc(id); }).join(', '),noms(vs))); });
  // Critères employés (marques et restrictions) et retenus par une variante
  const emp=new Set(); R.own.forEach(m=>{ if(m) m.r.forEach(x=>{ if(x.c!=null) emp.add(String(x.c).toLowerCase()); else x.e.ids.forEach(y=>emp.add(y.toLowerCase())); }); });
  const kc=c=>[c.nom,c.alias,c.id].filter(Boolean).map(x=>String(x).toLowerCase());
  const inutil=R.crit.filter(c=>!kc(c).some(k=>emp.has(k)));
  const explicites=V.filter(v=>!v.impl&&!v.comp);
  const nonRetenus=explicites.length?R.crit.filter(c=>!explicites.some(v=>v.S&&kc(c).some(k=>v.S.has(k)))):[];
  const crow=c=>`<tr><td><b>${capEsc(c.nom)}</b></td><td class="ana-dim">${capEsc(c.pkg||'')}</td></tr>`;
  // Restrictions illisibles et identifiants inconnus
  const conn=new Set(); R.crit.forEach(c=>kc(c).forEach(k=>conn.add(k)));
  const illis=[], inconnus=[];
  R.own.forEach((m,i)=>{ if(!m) return; m.r.forEach(x=>{ if(!x.e) return;
    if(x.e.err) illis.push(row(i,`<code>${capEsc(x.t)}</code>`,capEsc(x.e.err)));
    else if(R.src==='pv'&&R.crit.length){ const u=x.e.ids.filter(y=>!conn.has(y.toLowerCase())); if(u.length) inconnus.push(row(i,`<code>${capEsc(x.t)}</code>`,capEsc(u.join(', ')))); } }); });
  // Variantes identiques (même présence sur les éléments nommés)
  const sig=v=>{ let s=''; for(let i=0;i<R.nodes.length;i++) if(R.elig[i]&&R.varie[i]) s+=v.a[i]?'1':'0'; return s; };
  const parSig=new Map(); V.forEach(v=>{ const s=sig(v); (parSig.get(s)||parSig.set(s,[]).get(s)).push(v); });
  const ident=[...parSig.values()].filter(g=>g.length>1).map(g=>`<tr><td>${noms(g)}</td><td>${g[0].n}</td></tr>`);
  const miss=(R.missing||[]).map(x=>{ const i=I(x.id); return i>=0?row(i,capEsc(x.quoi),`<code>${capEsc(x.ref)}</code>`):`<tr><td colspan="2"><code>${capEsc(x.id)}</code></td><td>${capEsc(x.quoi)}</td><td><code>${capEsc(x.ref)}</code></td></tr>`; });
  const horsModele=R.src==='pv'&&R.S.pv.horsModele?[`<tr><td>${R.S.pv.horsModele}</td><td>${_L('identifiant(s) cités par les fichiers pure::variants, absents de ce modèle (autre modèle, élément supprimé ?)')}</td></tr>`]:[];
  return [
    {icon:'⊘', sev:'warn', title:_L('Éléments retenus par aucune variante'), tip:_L('Élément marqué que ni ses critères ni sa restriction ne font entrer dans une variante (alors que son conteneur est présent) : élément mort, ou variante à ajouter'), cols:[...C,_L('Marque')], items:morts},
    {icon:'🔗', sev:'warn', title:_L('Allocation perdue dans une variante'), tip:_L('Fonction feuille présente dans la variante, allouée dans le modèle 150 %, mais dont tous les composants sont absents de la variante'), cols:[...C,_L('Allouée à'),_L('Variantes')], items:perdA},
    {icon:'⇶', sev:'warn', title:_L('Réalisation perdue dans une variante'), tip:_L('Élément présent dans la variante, réalisé dans le modèle 150 %, dont toutes les réalisations sont absentes de la variante'), cols:[...C,_L('Réalisé par'),_L('Variantes')], items:perdR},
    {icon:'?', sev:'err', title:_L('Référence de variabilité introuvable'), tip:_L('Critère ou résultat cité par un élément, un résultat ou un résultat composé, absent du modèle'), cols:[...C,_L('Référence'),_L('Identifiant')], items:miss},
    {icon:'✖', sev:'err', title:_L('Restriction illisible'), tip:_L('Expression de présence qu\'Arcalyse ne sait pas lire (l\'élément est alors compté présent partout)'), cols:[...C,_L('Restriction'),_L('Erreur')], items:illis},
    {icon:'❔', sev:'warn', title:_L('Restriction citant une caractéristique inconnue'), tip:_L('Nom absent des caractéristiques lues dans les fichiers pure::variants'), cols:[...C,_L('Restriction'),_L('Inconnus')], items:inconnus},
    {icon:'◌', sev:'info', title:_L('Marque sans effet (conteneur absent)'), tip:_L('Les critères de l\'élément le retiennent, mais son conteneur est absent de ces variantes : la marque ne sert à rien'), cols:[...C,_L('Marque'),_L('Variantes')], items:sansEffet},
    {icon:'∅', sev:'info', title:_L('Critères sans élément'), tip:_L('Critère (ou caractéristique) qu\'aucun élément du modèle ne cite'), cols:[_L('Critère'),_L('Paquet / fichier')], items:inutil.map(crow)},
    {icon:'◇', sev:'info', title:_L('Critères retenus par aucune variante'), tip:_L('Critère qu\'aucune variante définie ne sélectionne : ses éléments n\'entrent dans aucun produit'), cols:[_L('Critère'),_L('Paquet / fichier')], items:nonRetenus.map(crow)},
    {icon:'0', sev:'warn', title:_L('Variante sans critère'), tip:_L('Résultat de filtrage ou variante sans aucun critère choisi : seuls les éléments communs y entrent'), cols:[_L('Variante'),_L('Définition')], items:explicites.filter(v=>!(v.sel||[]).length).map(v=>`<tr><td><b>${capEsc(v.nom)}</b></td><td class="ana-dim">${capEsc(v.def||'')}</td></tr>`)},
    {icon:'=', sev:'info', title:_L('Variantes identiques'), tip:_L('Variantes qui retiennent exactement les mêmes éléments'), cols:[_L('Variantes'),_L('Éléments')], items:ident},
    {icon:'↗', sev:'info', title:_L('Identifiants pure::variants hors du modèle'), tip:_L('Identifiants Capella cités par les fichiers pure::variants et absents de ce modèle'), cols:[_L('Nombre'),_L('Remarque')], items:horsModele}];
}

/* ── Vue ─────────────────────────────────────────────────────────────────── */

/** Message et commandes quand le modèle ne porte pas encore de variantes. @returns {string} HTML */
function capVarVideHtml(){
  const P=capVarPvmtProps();
  return _L(`<div class="phl-empty" style="text-align:left;max-width:760px;margin:12px auto;line-height:1.6"><b>Aucune variante reconnue dans ce modèle.</b><br>
    Arcalyse lit trois façons de marquer un modèle 150 % :<br>
    🧩 <b>l'add-on Filtering de Capella</b> : critères de filtrage posés sur les éléments et résultats de filtrage (lus directement dans le .capella) ;<br>
    🎛 <b>des propriétés PVMT</b> dont le nom, le groupe ou le domaine évoque une variante (Variante, Configuration, Produit, Option, Applicabilité…) : valeur d'énumération, texte « A ; B », booléen par variante ou restriction « Diesel OR Hybride » ;<br>
    🟦 <b>pure::variants</b> : chargez les fichiers du projet (.xfm caractéristiques, .ccfm / .xml correspondances avec leurs restrictions, .vdm variantes), ou ouvrez le 📁 dossier du projet.</div>`)+
    `<div style="text-align:center;margin:8px">${_L('<button class="cap-lf-btn" data-vpv>📂 Charger des fichiers pure::variants…</button>')}</div>`+
    (P.length?`<div style="max-width:760px;margin:12px auto">${capVarPropsHtml(P)}</div>`:'');
}

/** Cases des propriétés PVMT qui marquent les variantes. @param {object[]} P - capVarPvmtProps() @returns {string} HTML */
function capVarPropsHtml(P){
  const on=capVarPvmtOn(), auto=capVarCfg().props===null;
  return _L(`<p class="ana-help"><b>🎛 Propriétés PVMT qui marquent les variantes</b> ${auto?_L('(détection automatique : cochez ou décochez pour choisir vous-même)'):_L('(choix enregistré avec le projet)')}</p>`)+
    capXtTable(['',_L('Propriété'),_L('Domaine'),_L('Valeurs'),_L('Éléments')], P.slice(0,300).map(p=>[`<input type="checkbox" data-vprop="${capEsc(p.k)}"${on.has(p.k)?' checked':''}>`,
      `<b>${capEsc(p.k)}</b>${p.auto?' <span class="ana-dim" title="'+_L('Nom reconnu comme un marquage de variantes')+'">✦</span>':''}`, `<span class="ana-dim">${capEsc(p.domain)}</span>`, capXtShort(p.vals.join(' · '),120), String(p.n)]))+
    (auto?'':`<button class="cap-lf-btn" data-vpropauto style="margin-top:4px">${_L('↺ Revenir à la détection automatique')}</button>`);
}

/** Rend la sous-vue 🎚 Variantes : 📊 Avancement, ✅ Reste à faire, ▦ Éléments × variantes, 🏷 Critères & variantes, 🩺 Contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderVariants(box){
  const st=_capVarUi, R=capVarCompute();
  if(!R.src){ box.innerHTML=capVarVideHtml(); capVarBind(box); return; }
  const V=R.vars, toutes=[R.tout,...V], M=capVarMesures();
  if(!toutes.some(v=>v.id===st.v)) st.v=V[0]?V[0].id:'*';
  if(!M.some(m=>m.k===st.m)) st.m=M[0].k;
  const Ls=[...CAP_ANA_LAYERS,'?'].filter(L=>R.layer.some((x,i)=>x===L&&R.elig[i]));
  const lyr=i=>st.layer==='all'||R.layer[i]===st.layer;
  const layerBtns=()=>Ls.length<2?'':`<span class="tsep"></span><button class="cap-lf-btn${st.layer==='all'?' active':''}" data-xl="all">${_L('Toutes les couches')}</button>`+
    Ls.map(L=>`<button class="cap-lf-btn${st.layer===L?' active':''}" data-xl="${L}">${L==='?'?_L('Hors couche'):L}</button>`).join('');
  const srcSel=R.dispo.length>1?`<span class="tsep"></span><label class="ana-dim">${_L('Source')} <select class="phl-filter-input" data-vsrc style="width:auto">${R.dispo.map(k=>`<option value="${k}"${k===R.src?' selected':''}>${CAP_VAR_SRC[k].i} ${capEsc(CAP_VAR_SRC[k].l)}</option>`).join('')}</select></label>`
    :`<span class="ana-dim" style="margin-left:6px" title="${_L('Source des variantes')}">${CAP_VAR_SRC[R.src].i} ${capEsc(CAP_VAR_SRC[R.src].l)}</span>`;
  const vOpts=toutes.map(v=>[v.id,v.nom]);
  let body='', cnt='', csv=null;
  if(st.view==='av'){
    body=_L(`<p class="ana-help"><b>${V.length}</b> variante(s), <b>${R.crit.length}</b> critère(s) · <b>${R.own.filter((m,i)=>m&&R.elig[i]).length}</b> élément(s) marqué(s) sur ${R.tout.n} nommés. Chaque barre donne, pour la variante, la part faite de ce qui est attendu ; cliquez une barre pour voir le reste à faire.${st.layer!=='all'?` Couche : <b>${st.layer}</b>.`:''}</p>`)+
      capXtTable([_L('Variante'),_L('Définition'),_L('Éléments'),_L('Propres'),...M.map(m=>`<span title="${capEsc(m.t)}">${capEsc(m.l)}</span>`)], toutes.map(v=>[
        `<b>${capEsc(v.nom)}</b>${v.perso?` <span class="ana-dim" title="${_L('Variante ajoutée dans Arcalyse')}">✚</span>`:''}`, `<span class="ana-dim">${capXtShort(v.def||'',80)}</span>`,
        String(R.nodes.reduce((s,n,i)=>s+(v.a[i]&&R.elig[i]&&lyr(i)?1:0),0)), v.tout?'':String(v.propres),
        ...M.map(m=>{ const l=capVarMesure(R,v,m.k).filter(x=>lyr(x.i)), ok=l.filter(x=>x.ok).length; return l.length?`<span style="cursor:pointer" data-vgo="${capEsc(v.id)}|${m.k}">${capVarBarre(ok,l.length,m.t)}</span>`:'<span class="ana-dim">—</span>'; })]))+
      _L('<p class="ana-help" style="margin-top:12px"><b>Éléments nommés par couche</b> dans chaque variante.</p>')+
      capXtTable([_L('Variante'),...Ls.map(L=>L==='?'?_L('Hors couche'):L),'Σ'], toutes.map(v=>[`<b>${capEsc(v.nom)}</b>`, ...Ls.map(L=>{ let n=0; for(let i=0;i<R.nodes.length;i++) if(v.a[i]&&R.elig[i]&&R.layer[i]===L) n++; return n?String(n):''; }), String(v.n)]));
    csv=()=>capCsvExport(_L('variantes-avancement.csv'),[_L('Variante'),_L('Définition'),_L('Éléments'),_L('Propres'),...M.flatMap(m=>[m.l+_L(' (faits)'),m.l+_L(' (attendus)')])],
      toutes.map(v=>[v.nom,v.def||'',String(v.n),v.tout?'':String(v.propres),...M.flatMap(m=>{ const l=capVarMesure(R,v,m.k).filter(x=>lyr(x.i)); return [String(l.filter(x=>x.ok).length),String(l.length)]; })]));
  } else if(st.view==='todo'){
    const v=capVarGet(R,st.v)||R.tout, q=st.q.trim().toLowerCase();
    const l0=capVarMesure(R,v,st.m).filter(x=>!x.ok&&lyr(x.i)).map(x=>Object.assign(capVarEl(R,x.i),{pq:x.pq})), l=l0.filter(e=>(!st.type||e.type===st.type)&&capXtHas(q,e.name,e.type,e.pq));
    const tot=capVarMesure(R,v,st.m).filter(x=>lyr(x.i)), m=M.find(x=>x.k===st.m);
    cnt=`${l.length}`;
    body=_L(`<p class="ana-help"><b>${capEsc(v.nom)}</b> · ${capEsc(m.l)} : ${capVarBarre(tot.filter(x=>x.ok).length,tot.length,m.t)} — ${capEsc(m.t)}.</p>`)+
      capXtTable([_L('Couche'),_L('Élément'),'Type',_L('Ce qui manque')], l.map(e=>[capChainLayerBadge(e.layer), capDetLink(e.id,e.name,'font-weight:600'), `<span class="ana-dim">${capEsc(e.type)}</span>`, capEsc(e.pq)]), _L('✔ Rien à faire pour cette mesure.'));
    csv=()=>capCsvExport(_L('variantes-reste-a-faire.csv'),[_L('Variante'),_L('Mesure'),_L('Couche'),_L('Élément'),'Type',_L('Ce qui manque')], l.map(e=>[v.nom,m.l,e.layer,capCx(e.name,e.id),e.type,e.pq]));
    box._vtypes=[...new Set(l0.map(e=>e.type))].sort();
  } else if(st.view==='mx'){
    const q=st.q.trim().toLowerCase(), types=new Set(), rows=[];
    R.nodes.forEach((n,i)=>{ if(!R.elig[i]||!lyr(i)||(!st.tout&&!R.varie[i])) return; const e=capVarEl(R,i); types.add(e.type);
      if(st.type&&e.type!==st.type) return; const mk=capVarMarqueDe(R,i); if(!capXtHas(q,e.name,e.type,mk&&mk.m.txt)) return; rows.push({e,i,mk}); });
    cnt=String(rows.length);
    body=_L(`<p class="ana-help">${st.tout?_L('Tous les éléments nommés'):_L('Éléments dont la présence change d\'une variante à l\'autre')} : ✔ présent, · absent (survol : pourquoi). La marque est celle de l'élément, ou celle de son conteneur (↳).</p>`)+
      capXtTable([_L('Couche'),_L('Élément'),'Type',_L('Marque'),...V.map(v=>`<span title="${capEsc(v.def||'')}">${capEsc(v.nom)}</span>`)], rows.map(({e,i,mk})=>[capChainLayerBadge(e.layer), capDetLink(e.id,e.name,'font-weight:600'), `<span class="ana-dim">${capEsc(e.type)}</span>`,
        mk?(mk.de===i?capXtShort(mk.m.txt,80):`<span class="ana-dim" title="${capEsc(capXName(R.nodes[mk.de]))}">↳ ${capXtShort(mk.m.txt,60)}</span>`):'<span class="ana-dim">—</span>',
        ...V.map(v=>v.a[i]?'<b style="color:var(--c-ok,#3fb950)">✔</b>':`<span class="ana-dim" title="${capEsc(capVarPourquoi(R,v,i))}">·</span>`)]));
    csv=()=>capCsvExport(_L('variantes-elements.csv'),[_L('Couche'),_L('Élément'),'Type',_L('Marque'),...V.map(v=>v.nom)], rows.map(({e,i,mk})=>[e.layer,capCx(e.name,e.id),e.type,mk?mk.m.txt:'',...V.map(v=>v.a[i]?'1':'0')]));
    box._vtypes=[...types].sort();
  } else if(st.view==='def') body=capVarDefHtml(R);
  else body=capDiagHtml(capVarChecks());
  const vues=[['av',_L('📊 Avancement')],['todo',_L('✅ Reste à faire')],['mx',_L('▦ Éléments × variantes')],['def',_L('🏷 Critères & variantes')],['diag',_L('🩺 Contrôles')]];
  const typeSel=()=>capXtSelect('type',[['',_L('Tous les types')],...(box._vtypes||[]).map(t=>[t,t])],st.type);
  box.innerHTML=capXtBar(capXtViewBtns(vues,st.view)+srcSel+
    (st.view==='av'?layerBtns():'')+
    (st.view==='todo'?`<span class="tsep"></span>${capXtSelect('v',vOpts,st.v)}${capXtSelect('m',M.map(m=>[m.k,m.l]),st.m)}${layerBtns()}<span class="tsep"></span>${capXtSearch(st.q,_L('Nom, type, ce qui manque…'))}`:'')+
    (st.view==='mx'?`${layerBtns()}<span class="tsep"></span>${capXtSearch(st.q,_L('Nom, type, marque…'))}<label class="ana-dim" style="white-space:nowrap"><input type="checkbox" data-xc="tout"${st.tout?' checked':''}> ${_L('Tous les éléments (pas seulement les variables)')}</label>`:''),
    cnt, !!csv)+body;
  if(st.view==='todo'||st.view==='mx'){ const bar=box.querySelector('.phl-filter-bar'), s=document.createElement('span'); s.innerHTML=typeSel(); const sp=bar&&bar.querySelector('.ana-fn-cnt'); if(bar) bar.insertBefore(s.firstChild, sp||null); }
  capXtBind(box, st, capRenderVariants, csv||undefined);
  capVarBind(box);
}

/** Onglet 🏷 Critères & variantes : sources, critères, variantes (et ajout de variantes), propriétés PVMT, fichiers pure::variants.
 * @param {object} R - capVarCompute()
 * @returns {string} HTML
 */
function capVarDefHtml(R){
  const cfg=capVarCfg(), D=R.S[R.src], kc=c=>[c.nom,c.alias,c.id].filter(Boolean).map(x=>String(x).toLowerCase());
  const nMarq=c=>{ const k=new Set(kc(c)); let n=0; R.own.forEach((m,i)=>{ if(m&&R.elig[i]&&m.r.some(x=>x.c!=null?k.has(String(x.c).toLowerCase()):x.e.ids.some(y=>k.has(y.toLowerCase())))) n++; }); return n; };
  const srcs=['filt','pv','pvmt'].map(k=>{ const s=R.S[k]; return `<tr><td>${CAP_VAR_SRC[k].i} <b>${capEsc(CAP_VAR_SRC[k].l)}</b>${k===R.src?_L(' <span class="ana-dim">(affichée)</span>'):''}</td><td>${s?_L(`${s.crit.length} critère(s), ${s.marks.size} élément(s) marqué(s), ${s.vars.length} variante(s) définie(s)`):'<span class="ana-dim">—</span>'}</td></tr>`; }).join('');
  let h=_L('<p class="ana-help"><b>Sources lues</b> — la source affichée se choisit dans la barre quand il y en a plusieurs.</p>')+`<div style="overflow:auto"><table class="ana-t"><tbody>${srcs}</tbody></table></div>`;
  h+=_L(`<p class="ana-help" style="margin-top:12px"><b>Critères</b> (${R.crit.length})${R.src==='pv'?_L(' : caractéristiques des fichiers pure::variants'):R.src==='pvmt'?_L(' : valeurs des propriétés PVMT retenues'):' : FilteringCriterion'}.</p>`)+
    capXtTable([_L('Critère'),_L('Paquet / fichier'),_L('Éléments marqués'),_L('Variantes qui le retiennent')], R.crit.map(c=>{ const k=kc(c); return [`<b>${capEsc(c.nom)}</b>`, `<span class="ana-dim">${capEsc(c.pkg||'')}</span>`, String(nMarq(c)), capEsc(R.vars.filter(v=>v.S&&k.some(x=>v.S.has(x))).map(v=>v.nom).join(', '))]; }), _L('Aucun critère.'));
  h+=_L(`<p class="ana-help" style="margin-top:12px"><b>Variantes</b> (${R.vars.length})${R.vars.some(v=>v.impl)?_L(' — aucune variante n\'est définie dans la source : une par critère.'):''} ✚ : variante ajoutée dans Arcalyse (enregistrée avec le projet de travail).</p>`)+
    capXtTable([_L('Variante'),_L('Définition'),_L('Éléments'),_L('Propres'),''], R.vars.map(v=>[`<b>${capEsc(v.nom)}</b>${v.perso?' ✚':''}`, `<span class="ana-dim">${capEsc(v.def||'')}</span>`, String(v.n), String(v.propres),
      v.perso?`<button class="cap-lf-btn" data-vdel="${capEsc(v.id)}" title="${_L('Retirer cette variante')}">🗑</button>`:'']), _L('Aucune variante.'));
  h+=`<div class="ana-help" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center"><b>${_L('✚ Nouvelle variante')}</b> <input id="var-nom" class="phl-filter-input" placeholder="${_L('Nom')}" style="width:160px">
    ${R.crit.slice(0,200).map(c=>`<label style="white-space:nowrap"><input type="checkbox" data-vcrit="${capEsc(c.nom)}"> ${capEsc(c.nom)}</label>`).join('')}
    <button class="cap-lf-btn" data-vadd>${_L('Ajouter')}</button></div>`;
  const P=capVarPvmtProps(); if(P.length) h+=`<div style="margin-top:12px">${capVarPropsHtml(P)}</div>`;
  h+=_L(`<p class="ana-help" style="margin-top:12px"><b>🟦 Fichiers pure::variants</b> — lecture tolérante : caractéristiques (.xfm), restrictions des éléments qui citent un identifiant Capella (.ccfm, .xml), sélections des modèles de variante (.vdm). Ils sont gardés avec le projet de travail.</p>`)+
    capXtTable([_L('Fichier'),_L('Caractéristiques'),_L('Éléments restreints'),_L('Variantes'),''], cfg.pv.map(f=>[`<b>${capEsc(f.nom)}</b>`, String((f.crit||[]).length), String(Object.keys(f.restr||{}).length), String((f.vars||[]).length),
      `<button class="cap-lf-btn" data-vpvdel="${capEsc(f.nom)}" title="${_L('Retirer ce fichier')}">🗑</button>`]), _L('Aucun fichier chargé.'))+
    `<button class="cap-lf-btn" data-vpv style="margin-top:4px">${_L('📂 Charger des fichiers pure::variants…')}</button>`;
  return h+(D&&D.horsModele?_L(`<p class="ana-help">${D.horsModele} identifiant(s) cité(s) par les fichiers pure::variants sont absents de ce modèle.</p>`):'');
}

/** Branche les commandes propres à la vue (source, aller au reste à faire, propriétés PVMT, variantes ajoutées, fichiers pure::variants).
 * @param {HTMLElement} box - Conteneur
 */
function capVarBind(box){
  const cfg=capVarCfg(), st=_capVarUi;
  box.querySelector('[data-vsrc]')?.addEventListener('change',e=>{ cfg.src=e.target.value; capVarCfgSave(); });
  box.querySelectorAll('[data-vgo]').forEach(b=>b.onclick=()=>{ const [v,m]=b.dataset.vgo.split('|'); Object.assign(st,{view:'todo', v, m, q:'', type:''}); capRenderVariants(box); });
  box.querySelectorAll('[data-vprop]').forEach(c=>c.onchange=()=>{ const on=capVarPvmtOn(); if(c.checked) on.add(c.dataset.vprop); else on.delete(c.dataset.vprop); cfg.props=[...on]; capVarCfgSave(); });
  box.querySelector('[data-vpropauto]')?.addEventListener('click',()=>{ cfg.props=null; capVarCfgSave(); });
  box.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=()=>{ cfg.perso=cfg.perso.filter(p=>p.id!==b.dataset.vdel); capVarCfgSave(); });
  box.querySelector('[data-vadd]')?.addEventListener('click',()=>{
    const nom=(box.querySelector('#var-nom')||{}).value||'', crit=[...box.querySelectorAll('[data-vcrit]:checked')].map(c=>c.dataset.vcrit);
    if(!nom.trim()){ capAlert(_L('Donnez un nom à la variante.')); return; }
    if(!crit.length){ capAlert(_L('Cochez au moins un critère.')); return; }
    cfg.perso.push({id:'perso:'+capHomeUid(), nom:nom.trim(), crit, src:capVarCompute().src}); capVarCfgSave(); capToast(_L('✔ Variante ajoutée'));
  });
  box.querySelectorAll('[data-vpvdel]').forEach(b=>b.onclick=()=>{ cfg.pv=cfg.pv.filter(f=>f.nom!==b.dataset.vpvdel); capVarCfgSave(); });
  box.querySelectorAll('[data-vpv]').forEach(b=>b.onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.multiple=true; inp.accept='.xfm,.vdm,.ccfm,.xml';
    inp.onchange=()=>capVarPvFichiers([...inp.files]); inp.click(); });
}

/** Lit des fichiers pure::variants et les garde avec le projet (un fichier de même nom est remplacé).
 * @param {File[]} files - Fichiers .xfm, .ccfm, .vdm ou .xml
 * @param {boolean} [remplacer] - Oublier d'abord les fichiers déjà lus (📁 dossier du projet)
 */
async function capVarPvFichiers(files, remplacer){
  const cfg=capVarCfg(); if(remplacer) cfg.pv=[];
  let ok=0; const errs=[];
  for(const f of files){
    try{ const r=capVarPvLire(await f.text(), f.name); cfg.pv=cfg.pv.filter(x=>x.nom!==r.nom); cfg.pv.push(r); ok++; }
    catch(e){ errs.push(f.name+' : '+(e&&e.message||e)); }
  }
  capVarCfgSave();
  if(ok) capToast(_L(`✔ ${ok} fichier(s) pure::variants lu(s)`));
  if(errs.length) capAlert(_L('Lecture impossible :\n')+errs.join('\n'), {level:'err'});
}
/** Note les fichiers pure::variants du 📁 dossier du projet, lus après le chargement du modèle. @param {object[]} fichiers - {nom, lire} */
function capVarPvQueue(fichiers){ _capVarQueue=fichiers||[]; }
/** Après le chargement d'un modèle : lit les fichiers pure::variants du dossier du projet (ils remplacent les précédents). */
async function capVarOnModelLoad(){
  const q=_capVarQueue; _capVarQueue=[]; if(!q.length) return;
  try{ await capVarPvFichiers(await Promise.all(q.map(f=>f.lire())), true); }catch(e){ console.warn('pure::variants',e); }
}

/** Ouvre la sous-vue 🎚 Variantes, sur un onglet et une recherche.
 * @param {string} [view] - av, todo, mx, def, diag
 * @param {string} [q] - Recherche
 */
function capVarOpen(view, q){ Object.assign(_capVarUi,{view:view||'av', q:q||'', type:''}); if(view==='mx') _capVarUi.tout=true; capAnaSub='variants'; if(capCurrentView==='analyses') capRenderAnalyses(); else capShowView('analyses'); }

/** Section « Variantes » du panneau de détail : marque de l'élément (ou de son conteneur) et présence dans chaque variante.
 * @param {string} id - Élément
 * @param {Function} secTitle - Titre de section (libellé, couleur)
 * @returns {string} HTML ('' sans variantes)
 */
function capVarDetail(id, secTitle){
  if(!capVarExiste()) return '';
  let R; try{ R=capVarCompute(); }catch(e){ console.warn('Variantes',e); return ''; }
  if(!R.src||!R.vars.length) return '';
  const i=capVarI(R,id); if(i<0) return '';
  const mk=capVarMarqueDe(R,i);
  const chips=R.vars.map(v=>v.a[i]?`<span class="st-badge" style="color:var(--c-ok,#3fb950);border-color:var(--c-ok,#3fb950)">✔ ${capEsc(v.nom)}</span>`
    :`<span class="st-badge" style="color:var(--c-dim);border-color:var(--c-border,#444)" title="${capEsc(_L('Absent : ')+capVarPourquoi(R,v,i))}">✗ ${capEsc(v.nom)}</span>`).join(' ');
  const marque=mk?(mk.de===i?_L(`Marque : <b>${capEsc(mk.m.txt)}</b>`):_L(`Hérite de ${capDetLink(capXId(R.nodes[mk.de]),capXName(R.nodes[mk.de])||'—')} : <b>${capEsc(mk.m.txt)}</b>`)):_L('Aucune marque : élément commun (sauf conteneur ou extrémité absents)');
  return secTitle(_L('Variantes'),'var(--c-accent,#58a6ff)')+`<div style="font-size:11.5px;line-height:1.7">${CAP_VAR_SRC[R.src].i} ${marque}<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">${chips}</div>
    <a href="#" class="cap-det-link" onclick="capVarOpen('mx',${capEsc(JSON.stringify(capXName(R.nodes[i])||''))});return false">🎚 ${_L('voir dans Éléments × variantes')}</a></div>`;
}

/** Indicateurs du tableau de bord : variantes du modèle 150 %.
 * @param {Function} add - Ajout d'un indicateur (groupe, id, libellé, nature, calcul, description)
 */
function capVarDashCatalog(add){
  const G=_L('Variantes'), R=()=>capVarCompute();
  const parVar=k=>()=>{ const r=R(); if(!r.src) return null; return {cats:r.vars.map(v=>{ const l=capVarMesure(r,v,k); return {l:v.nom, v:l.length?Math.round(100*l.filter(x=>x.ok).length/l.length):0}; }), order:'natural'}; };
  add(G,'var.n',_L('Variantes — nombre de variantes'),'n',()=>{ const r=R(); return r.src?{n:r.vars.length}:null; });
  add(G,'var.marq',_L('Variantes — éléments marqués'),'n',()=>{ const r=R(); return r.src?{n:r.own.filter((m,i)=>m&&r.elig[i]).length}:null; });
  add(G,'var.els',_L('Variantes — éléments par variante'),'series',()=>{ const r=R(); return r.src?{cats:r.vars.map(v=>({l:v.nom, v:v.n})), order:'natural'}:null; });
  add(G,'var.alloc',_L('Variantes — fonctions allouées par variante (%)'),'series',parVar('alloc'),_L('Fonctions feuilles de chaque variante allouées à un composant présent'));
  add(G,'var.real',_L('Variantes — fonctions réalisées par variante (%)'),'series',parVar('real'),_L('Fonctions de chaque variante réalisées dans la couche suivante'));
  add(G,'var.fe',_L('Variantes — échanges alloués par variante (%)'),'series',parVar('fe'),_L('Functional Exchanges de chaque variante alloués à un Component Exchange présent'));
  add(_L('Contrôles'),'chk.var',_L('Variantes — contrôles'),'series',()=>({cats:capChkFilter(capVarChecks()).filter(x=>x.sev!=='info').map(x=>({l:x.title, v:x.items.length}))}));
}
