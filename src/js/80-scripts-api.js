// ── 📜 API de scripts (macros) — noyau sans DOM ─────────────────────────────
// Repris de l'API de scripts d'Arcature (src/js/47-api.js, contrat docs/api/arcature.d.ts), limité à la LECTURE
// et à l'ANALYSE : Arcalyse ne modifie jamais le modèle. Noms publics en anglais (mêmes noms qu'Arcature : un script
// de lecture écrit pour l'un tourne dans l'autre) ; le code reste en français. Contrat : docs/api/arcalyse.d.ts.
//
// Tout le noyau tient dans la fonction capScrNoyau() : la console (81) la recopie telle quelle (toString) dans le
// worker des scripts, avec le script de l'utilisateur ; sans worker, elle l'appelle dans la page (exécution signalée
// comme non isolée). Le script voit uniquement : model, metamodel, analysis, out, ui, console.
//
// Données : un instantané du modèle affiché (82-scripts-analyses.js : éléments, relations de 🔗 Liens, diagrammes du
// .aird), reçu par le worker. Les analyses (ƒ fonctions, ⚡ chaînes, 🧬 traçabilité, 🩺 contrôles, 💚 santé…) sont
// calculées par la page à la demande du script (await analysis.xxx()) et rendues en JSON ; les objets qui désignent
// un élément reçoivent une propriété `element`.

/**
 * Construit le noyau de l'API de scripts : objets publics et exécution. Autonome (aucune autre fonction d'Arcalyse),
 * pour être recopié dans le worker ; dépend seulement de `_L`, `CAP_LANG` et `CAP_MM` (définis dans le worker par la console).
 * @returns {{executer:Function, servir:Function, exemples:Function, csv:Function, VERSION:string, MASQUES:string[], parametres:Function}} Noyau
 */
function capScrNoyau(){
  /** Version du contrat de l'API (docs/api/arcalyse.d.ts). */
  const API_VERSION='1.0';
  /** Relations publiques (mêmes noms qu'Arcature) acceptées par element.links(). */
  const API_RELATIONS=['source','target','allocation','functionalExchange','componentExchange','physicalLink','communicationMean','exchangedItem',
    'exchangeAllocation','componentExchangeAllocation','portAllocation','deployment','involvement','exploitation','include','extend','generalization',
    'realization','trace','transition','otherAllocation'];
  /** Couches ARCADIA acceptées par les filtres et model.layer(). */
  const API_COUCHES=['OA','SA','LA','PA','EPBS'];
  /** Noms globaux masqués pendant l'exécution d'un script (page, réseau, état d'Arcalyse). */
  const API_MASQUES=['document','window','self','globalThis','parent','top','frames','localStorage','sessionStorage','indexedDB','caches','navigator',
    'fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','postMessage','Worker','SharedWorker','require','process',
    'capAllElements','cap_xmlDoc','_capAnaCache','_capNav','_capHome','_capRev','capScrNoyau','capScrExecuter','capScrSnapshot','capScrAnalyse'];
  /** Données internes de chaque enveloppe d'élément ({ ctx, e }), inaccessibles depuis l'objet public. */
  const INTERNE=new WeakMap();
  /** Constructeur des fonctions asynchrones (le script peut utiliser await). */
  const ASYNC=Object.getPrototypeOf(async function(){ /* modèle */ }).constructor;
  /** Nom de source donné au script (numéros de ligne des erreurs). */
  const SOURCE='arcalyse-script.js';
  /** Analyses proposées par `analysis` (calculées par la page : 82-scripts-analyses.js). */
  const ANALYSES=['functions','chains','traceability','capabilities','states','health','requirements','properties','data','constraints','status',
    'categories','rec','libraries','scenarios','ports','functionalExchanges','componentExchanges','physicalLinks','deployment','checks','nameQuality','diagramsOf','sysml'];

  /** Erreur levée par l'API, avec un message affichable. @param {string} msg @returns {Error} */
  const erreur=msg=>{ const e=new Error(msg); e.name='ArcalyseError'; return e; };

  // ── Métamodèle (types et héritage : CAP_MM, 79-scripts-metamodele.js) ──
  const MMX={complet:null, court:null, anc:[]};
  /** Construit les index du référentiel (nom complet et nom court → indice). */
  function mmInit(){
    if(MMX.complet) return;
    MMX.complet=new Map(); MMX.court=new Map();
    CAP_MM.n.forEach((n,i)=>{ const k=n.indexOf(':'), nom=n.slice(k+1);
      MMX.complet.set(CAP_MM.p[+n.slice(0,k)]+':'+nom, i);
      MMX.court.set(nom, MMX.court.has(nom)?-1:i); });   // -1 : nom court ambigu
  }
  /** Nom court d'un type. @param {number} i @returns {string} */
  const mmNom=i=>CAP_MM.n[i].slice(CAP_MM.n[i].indexOf(':')+1);
  /** Ancêtres d'un type, lui compris. @param {number} i @returns {Set<number>} */
  function mmAncetres(i){
    if(MMX.anc[i]) return MMX.anc[i];
    const s=new Set([i]);
    for(const p of CAP_MM.t[i].slice(1)) for(const a of mmAncetres(p)) s.add(a);
    return (MMX.anc[i]=s);
  }
  /** Indice d'un type nommé : court (« LogicalFunction ») ou qualifié (« la:LogicalFunction », nom complet) ; -1 si hors métamodèle.
   * @param {string} nom @returns {number} */
  function mmIndice(nom){
    mmInit();
    if(nom.includes(':')){
      if(MMX.complet.has(nom)) return MMX.complet.get(nom);
      for(const [k,i] of MMX.complet) if(k.endsWith('.'+nom)) return i;
      return -1;
    }
    const i=MMX.court.get(nom);
    if(i===-1) throw erreur(_L(`Type ambigu : ${nom}. Préciser le paquetage, par exemple « la:${nom} ».`));
    return i==null?-1:i;
  }
  /** Indice du type d'un élément de l'instantané (fullType). @param {object} e @returns {number} */
  const mmType=e=>{ mmInit(); if(e._mm!==undefined) return e._mm; return (e._mm=MMX.complet.get(e.fullType)??-1); };

  // ── Contexte d'exécution : instantané, index, sorties ──
  /**
   * Contexte d'un script : instantané du modèle, index (parent, enfants, références), enveloppes, sorties.
   * @param {object} snap - Instantané (capScrSnapshot)
   * @param {object} options - Options d'exécution
   * @returns {object} Contexte
   */
  function contexte(snap, options){
    const parId=new Map(), enfants=new Map(), liens=new Map();
    snap.elements.forEach((e,i)=>{ e._i=i; parId.set(e.id, e); });
    snap.elements.forEach(e=>{ if(e.parent&&parId.has(e.parent)){ let l=enfants.get(e.parent); if(!l) enfants.set(e.parent, l=[]); l.push(e); } });
    const ajouter=(id,l)=>{ let t=liens.get(id); if(!t) liens.set(id, t=[]); t.push(l); };
    (snap.links||[]).forEach(r=>{
      if(!parId.has(r.src)||!parId.has(r.tgt)) return;
      ajouter(r.src, {rel:r.rel, dir:'out', autre:r.tgt, via:r.via||null});
      ajouter(r.tgt, {rel:r.rel, dir:'in', autre:r.src, via:r.via||null});
      if(r.via&&parId.has(r.via)){ ajouter(r.via, {rel:'source', dir:'out', autre:r.src, via:null}); ajouter(r.via, {rel:'target', dir:'out', autre:r.tgt, via:null}); }
    });
    return { snap, options, parId, enfants, liens, refs:null, technique:new Set(snap.technical||[]), enveloppes:new Map(), diagrammes:null,
      tampon:[], dernierEnvoi:Date.now(), nbSorties:0, emettre:options.emettre||(()=>{}) };
  }

  /** Envoie une sortie (regroupées par lots). @param {object} ctx @param {object} m */
  function sortie(ctx, m){
    ctx.tampon.push(m); ctx.nbSorties++;
    if(ctx.tampon.length>=(ctx.options.lot||200)||Date.now()-ctx.dernierEnvoi>100) vider(ctx);
  }
  /** Transmet les sorties en attente. @param {object} ctx */
  function vider(ctx){ if(!ctx.tampon.length) return; const lot=ctx.tampon; ctx.tampon=[]; ctx.dernierEnvoi=Date.now(); ctx.emettre(lot); }

  /** Index des références par attribut (sortantes et entrantes), calculé à la première demande.
   * @param {object} ctx @returns {{sortantes:Map, entrantes:Map}} */
  function references(ctx){
    if(ctx.refs) return ctx.refs;
    const sortantes=new Map(), entrantes=new Map();
    const push=(m,k,v)=>{ let l=m.get(k); if(!l) m.set(k, l=[]); l.push(v); };
    for(const e of ctx.snap.elements){
      for(const [k,v] of Object.entries(e.attrs||{})){
        if(k==='name'||k==='description'||k==='summary'||k==='id'||typeof v!=='string'||v.length<8) continue;
        for(const id of new Set(v.trim().split(/\s+/).map(x=>x.replace(/^#/,'')))){
          if(id===e.id||!ctx.parId.has(id)) continue;
          push(sortantes, e.id, {attr:k, id}); push(entrantes, id, {attr:k, id:e.id});
        }
      }
    }
    return (ctx.refs={sortantes, entrantes});
  }

  /** Enveloppe publique d'un élément (la même pour un même élément : el1 === el2 est fiable).
   * @param {object} ctx @param {object|null} e @returns {ApiElement|null} */
  function envelopper(ctx, e){
    if(!e) return null;
    let w=ctx.enveloppes.get(e);
    if(!w){ w=new ApiElement(); INTERNE.set(w, {ctx, e}); ctx.enveloppes.set(e, w); }
    return w;
  }
  /** Enveloppe depuis un identifiant. @param {object} ctx @param {string} id @returns {ApiElement|null} */
  const parId=(ctx,id)=>envelopper(ctx, ctx.parId.get(String(id==null?'':id).replace(/^#/,''))||null);
  /** Données internes d'une enveloppe (refuse les objets qui ne viennent pas de l'API). @param {*} w @returns {{ctx:object, e:object}} */
  function interne(w){ const i=INTERNE.get(w); if(!i) throw erreur(_L('Élément attendu (objet obtenu par l\'API).')); return i; }

  /** Couche publique ('' hors des architectures). @param {object} e @returns {string} */
  const couche=e=>(API_COUCHES.includes(e.layer)?e.layer:'');
  /** Libellé : nom, ou ‹Type› sans nom. @param {object} e @returns {string} */
  const libelle=e=>{ const n=e.attrs&&e.attrs.name; return n?String(n).replace(/\s*\n\s*/g,' '):'‹'+e.type+'›'; };
  /** Types d'architecture → couche. */
  const ARCHIS={OperationalAnalysis:'OA', SystemAnalysis:'SA', LogicalArchitecture:'LA', PhysicalArchitecture:'PA', EPBSArchitecture:'EPBS'};
  /** Ossature créée par Capella avec le projet (approximation : ingénierie, architectures, paquetages et fonctions racines).
   * @param {object} ctx @param {object} e @returns {string|null} raison, ou null */
  function ossature(ctx, e){
    if(!e.parent||!ctx.parId.has(e.parent)) return _L('racine du projet');
    if(ARCHIS[e.type]) return _L('niveau d\'architecture');
    if(e.type==='SystemEngineering') return _L('ingénierie système');
    const p=ctx.parId.get(e.parent);
    if(ARCHIS[p.type]) return /Pkg$/.test(e.type)?_L('paquetage racine du niveau'):/Realization|Realisation/.test(e.type)?_L('réalisation entre niveaux'):_L('élément racine du niveau');
    if(/Pkg$/.test(p.type)&&p.parent&&ctx.parId.has(p.parent)&&ARCHIS[ctx.parId.get(p.parent).type]&&/Function|Activity|Component|Entity/.test(e.type)&&/^Root /i.test(e.attrs.name||'')) return _L('élément racine du niveau');
    return null;
  }

  // ── Types et filtres ──
  /** Types courts présents dans le modèle. @param {object} ctx @returns {Set<string>} */
  function typesModele(ctx){ if(!ctx.types){ ctx.types=new Set(); ctx.snap.elements.forEach(e=>ctx.types.add(e.type)); } return ctx.types; }
  /** Prépare un test « est de ce type » : héritage du métamodèle, ou égalité du type court pour un type hors métamodèle présent dans le modèle.
   * @param {object} ctx @param {string} nom @param {boolean} exact @returns {function(object):boolean} */
  function testType(ctx, nom, exact){
    if(typeof nom!=='string'||!nom) throw erreur(_L('Nom de type attendu.'));
    const i=mmIndice(nom);
    if(i<0){
      const qualifie=nom.includes(':');
      const test=qualifie?e=>e.fullType===nom||e.fullType.endsWith('.'+nom):e=>e.type===nom;
      const present=qualifie?ctx.snap.elements.some(test):typesModele(ctx).has(nom);
      if(!present) throw erreur(_L(`Type inconnu : ${nom}`));
      return test;
    }
    if(exact) return e=>mmType(e)===i;
    return e=>{ const t=mmType(e); return t>=0&&mmAncetres(t).has(i); };
  }
  /** Compile un filtre public : nom de type, fonction, ou { type, exactType, layer, name, technical, where }.
   * @param {object} ctx @param {*} f @returns {function(object):boolean} */
  function filtre(ctx, f){
    if(f==null) return ()=>true;
    if(typeof f==='string') f={type:f};
    else if(typeof f==='function') f={where:f};
    if(typeof f!=='object') throw erreur(_L('Filtre invalide : nom de type, fonction ou objet attendu.'));
    const connus=['type','exactType','layer','name','technical','where'];
    const inconnu=Object.keys(f).find(k=>!connus.includes(k));
    if(inconnu) throw erreur(_L(`Critère de filtre inconnu : ${inconnu}`));
    const tests=[], liste=v=>(Array.isArray(v)?v:[v]);
    if(f.type!=null){ const t=liste(f.type).map(x=>testType(ctx,x,false)); tests.push(e=>t.some(x=>x(e))); }
    if(f.exactType!=null){ const t=liste(f.exactType).map(x=>testType(ctx,x,true)); tests.push(e=>t.some(x=>x(e))); }
    if(f.layer!=null){ const c=liste(f.layer); const faux=c.find(x=>!API_COUCHES.includes(x)&&x!=='');
      if(faux!==undefined) throw erreur(_L(`Couche inconnue : ${faux} (OA, SA, LA, PA, EPBS)`)); tests.push(e=>c.includes(couche(e))); }
    if(f.name!=null){ const nom=f.name; tests.push(nom instanceof RegExp?e=>{ nom.lastIndex=0; return nom.test(e.attrs.name??''); }:e=>(e.attrs.name??'')===String(nom)); }
    if(f.technical!=null) tests.push(e=>ctx.technique.has(e.type)===!!f.technical);
    if(f.where!=null){ if(typeof f.where!=='function') throw erreur(_L('Le critère « where » doit être une fonction.')); tests.push(e=>!!f.where(envelopper(ctx,e))); }
    return e=>tests.every(t=>t(e));
  }
  /** Descendants d'un élément (ordre du document) qui vérifient un test. @param {object} ctx @param {object} e @param {Function} test @returns {ApiElement[]} */
  function descendants(ctx, e, test){
    const res=[];
    const voir=x=>{ for(const c of ctx.enfants.get(x.id)||[]){ if(test(c)) res.push(envelopper(ctx,c)); voir(c); } };
    voir(e); return res;
  }
  /** Échappe un nom pour un chemin. @param {string} s @returns {string} */
  const echapper=s=>String(s).replace(/[\\/]/g, c=>'\\'+c);
  /** Découpe un chemin « A/B/C » (« \/ » : barre dans un nom). @param {string} chemin @returns {string[]} */
  function decouper(chemin){
    if(chemin===''||chemin==='/') return [];
    if(chemin[0]==='/') chemin=chemin.slice(1);
    const res=[]; let cour='';
    for(let i=0;i<chemin.length;i++){ const c=chemin[i]; if(c==='\\'&&i+1<chemin.length) cour+=chemin[++i]; else if(c==='/'){ res.push(cour); cour=''; } else cour+=c; }
    res.push(cour); return res;
  }
  /** Élément par chemin de noms sous un élément (homonymes : première branche qui aboutit). @param {object} ctx @param {object|null} e @param {string} chemin @returns {ApiElement|null} */
  function parChemin(ctx, e, chemin){
    if(typeof chemin!=='string') throw erreur(_L('Chemin attendu (noms séparés par « / »).'));
    const noms=decouper(chemin);
    const enfantsDe=x=>x?(ctx.enfants.get(x.id)||[]):ctx.snap.elements.filter(y=>!y.parent||!ctx.parId.has(y.parent));
    const chercher=(x,i)=>{ if(i===noms.length) return x; for(const c of enfantsDe(x)) if((c.attrs.name??'')===noms[i]){ const r=chercher(c,i+1); if(r) return r; } return null; };
    if(!noms.length) return e?envelopper(ctx,e):envelopper(ctx, ctx.snap.elements.find(y=>y.type==='SystemEngineering')||enfantsDe(null)[0]||null);   // chemin vide : l'élément de départ (la racine du modèle)
    const r=chercher(e,0);
    return r?envelopper(ctx,r):null;
  }

  // ── Diagrammes (instantané du .aird) ──
  /** Objets publics des diagrammes et index par élément. @param {object} ctx @returns {{liste:object[], parElement:Map}} */
  function diagrammes(ctx){
    if(ctx.diagrammes) return ctx.diagrammes;
    const liste=(ctx.snap.diagrams||[]).map(d=>Object.freeze({ id:d.id, name:d.name, type:d.type, code:d.code||'', layer:d.layer||'', kind:d.kind||'diagram',
      get target(){ return parId(ctx, d.target); }, toString(){ return d.name; }, toJSON(){ return {id:d.id, name:d.name, type:d.type}; } }));
    const parDiag=new Map(liste.map(d=>[d.id,d])), parElement=new Map();
    for(const [id,ids] of Object.entries(ctx.snap.diagramsOf||{})) parElement.set(id, ids.map(x=>parDiag.get(x)).filter(Boolean));
    return (ctx.diagrammes={liste, parElement});
  }

  /** Élément du modèle vu par les scripts (lecture seule). */
  class ApiElement {
    /** @returns {string} identifiant Capella */
    get id(){ return interne(this).e.id; }
    /** @returns {string} type court (« LogicalFunction ») */
    get type(){ return interne(this).e.type; }
    /** @returns {string} type tel qu'écrit dans le fichier (xsi:type) */
    get fullType(){ return interne(this).e.fullType; }
    /** @returns {string} couche ARCADIA : OA, SA, LA, PA, EPBS, ou '' */
    get layer(){ return couche(interne(this).e); }
    /** @returns {string} nom ('' si absent) */
    get name(){ return interne(this).e.attrs.name??''; }
    /** @returns {string} résumé ('' si absent) */
    get summary(){ return interne(this).e.attrs.summary??''; }
    /** @returns {string} description HTML ('' si absente) */
    get description(){ return interne(this).e.attrs.description??''; }
    /** @returns {string} commentaire de revue Capella ('' si absent) */
    get review(){ return interne(this).e.attrs.review??''; }
    /** @returns {string} libellé affiché : nom, ou ‹Type› pour un élément sans nom */
    get label(){ return libelle(interne(this).e); }
    /** @returns {ApiElement|null} propriétaire */
    get owner(){ const {ctx,e}=interne(this); return e.parent?parId(ctx, e.parent):null; }
    /** @returns {object[]} diagrammes du .aird qui montrent l'élément (ou dont il est la cible) */
    get diagrams(){ const {ctx,e}=interne(this); return (diagrammes(ctx).parElement.get(e.id)||[]).slice(); }
    /** @returns {string} chemin de noms depuis l'ingénierie système (comprise : le projet n'est pas un élément d'Arcalyse), utilisable par findByPath */
    get path(){ const {ctx,e}=interne(this); const ch=[]; for(let p=e; p; p=p.parent?ctx.parId.get(p.parent):null) ch.unshift(echapper(p.attrs.name??'')); return ch.join('/'); }
    /** @returns {boolean} élément de l'ossature créée par Capella (projet, architectures, paquetages et fonctions racines) */
    get isSkeleton(){ const {ctx,e}=interne(this); return ossature(ctx,e)!=null; }
    /** @returns {string|null} raison de la protection, ou null */
    get skeletonReason(){ const {ctx,e}=interne(this); return ossature(ctx,e); }
    /** @returns {boolean} élément technique (valeurs, traces, réalisations, ports, échanges… : CAP_TECHNICAL_TYPES d'Arcalyse) */
    get isTechnical(){ const {ctx,e}=interne(this); return ctx.technique.has(e.type); }
    /** Éléments directement contenus. @param {*} [f] filtre @returns {ApiElement[]} */
    children(f){ const {ctx,e}=interne(this), t=filtre(ctx,f); return (ctx.enfants.get(e.id)||[]).filter(t).map(c=>envelopper(ctx,c)); }
    /** Tous les éléments contenus, à toute profondeur. @param {*} [f] filtre @returns {ApiElement[]} */
    descendants(f){ const {ctx,e}=interne(this); return descendants(ctx, e, filtre(ctx,f)); }
    /** Élément contenu désigné par un chemin de noms relatif. @param {string} chemin @returns {ApiElement|null} */
    findByPath(chemin){ const {ctx,e}=interne(this); return parChemin(ctx, e, chemin); }
    /** Valeur d'un attribut XML, ou null. @param {string} nom @returns {string|null} */
    attribute(nom){ const v=interne(this).e.attrs[nom]; return v==null?null:String(v); }
    /** Tous les attributs XML (copie). @returns {Object<string,string>} */
    attributes(){ return Object.assign({}, interne(this).e.attrs); }
    /** Indique si l'élément est de ce type ou en hérite. @param {string} type @returns {boolean} */
    isA(type){ const {ctx,e}=interne(this); return testType(ctx,type,false)(e); }
    /** Éléments référencés par cet élément (attributs de référence), éventuellement par un seul attribut. @param {string} [attr] @returns {ApiElement[]} */
    references(attr){ const {ctx,e}=interne(this); return (references(ctx).sortantes.get(e.id)||[]).filter(r=>attr==null||r.attr===attr).map(r=>parId(ctx,r.id)); }
    /** Éléments qui référencent cet élément. @param {string} [attr] @returns {ApiElement[]} */
    referencedBy(attr){ const {ctx,e}=interne(this); return (references(ctx).entrantes.get(e.id)||[]).filter(r=>attr==null||r.attr===attr).map(r=>parId(ctx,r.id)); }
    /** Liaisons métier (celles de 🔗 Liens) : allocations, échanges, réalisations, implications…
     * @param {string} [relation] relation publique @param {'in'|'out'} [sens] @returns {Array<{relation:string, direction:string, element:ApiElement, via:ApiElement|null}>} */
    links(relation, sens){
      const {ctx,e}=interne(this);
      if(relation!=null&&!API_RELATIONS.includes(relation)) throw erreur(_L(`Relation inconnue : ${relation}`));
      if(sens!=null&&sens!=='in'&&sens!=='out') throw erreur(_L(`Sens inconnu : ${sens} (in ou out)`));
      return (ctx.liens.get(e.id)||[]).filter(l=>(relation==null||l.rel===relation)&&(sens==null||l.dir===sens))
        .map(l=>({relation:l.rel, direction:l.dir, element:parId(ctx,l.autre), via:l.via?parId(ctx,l.via):null}));
    }
    /** @returns {string} libellé */
    toString(){ return this.label; }
    /** @returns {{id:string, type:string, name:string}} forme JSON */
    toJSON(){ return {id:this.id, type:this.type, name:this.name}; }
  }

  // ── Objets publics ──
  /** Objet « model ». @param {object} ctx @returns {object} */
  function modele(ctx){
    const racines=()=>ctx.snap.elements.filter(e=>!e.parent||!ctx.parId.has(e.parent));
    const racine=()=>ctx.snap.elements.find(e=>e.type==='SystemEngineering')||racines().find(e=>e.type!=='ModelInformation')||racines()[0]||null;
    return Object.freeze({
      apiVersion:API_VERSION,
      tool:'Arcalyse',
      fileName:ctx.snap.fileName||'',
      capellaVersion:ctx.snap.capellaVersion||'',
      get root(){ return envelopper(ctx, racine()); },
      get selection(){ return (ctx.options.selection||[]).map(id=>parId(ctx,id)).filter(Boolean); },
      get diagrams(){ return diagrammes(ctx).liste.slice(); },
      get hasDiagrams(){ return diagrammes(ctx).liste.length>0; },
      /** Élément par identifiant, ou null. */
      getElementById(id){ return parId(ctx, id); },
      /** Tous les éléments qui vérifient un filtre, dans l'ordre du document. */
      elements(f){ const t=filtre(ctx,f); return ctx.snap.elements.filter(t).map(e=>envelopper(ctx,e)); },
      /** Premier élément qui vérifie un filtre, ou null. */
      find(f){ const t=filtre(ctx,f); return envelopper(ctx, ctx.snap.elements.find(t)||null); },
      /** Nombre d'éléments qui vérifient un filtre. */
      count(f){ const t=filtre(ctx,f); let n=0; for(const e of ctx.snap.elements) if(t(e)) n++; return n; },
      /** Élément par chemin de noms depuis la racine. */
      findByPath(chemin){ return parChemin(ctx, null, chemin); },
      /** Architecture d'une couche ARCADIA, ou null. */
      layer(code){ if(!API_COUCHES.includes(code)) throw erreur(_L(`Couche inconnue : ${code} (OA, SA, LA, PA, EPBS)`)); return envelopper(ctx, ctx.snap.elements.find(e=>ARCHIS[e.type]===code)||null); },
      /** Types présents dans le modèle avec leur nombre d'éléments, par ordre décroissant. */
      types(){ const n=new Map(); for(const e of ctx.snap.elements) n.set(e.type,(n.get(e.type)||0)+1); return [...n].sort((a,b)=>b[1]-a[1]).map(([type,count])=>({type,count})); }
    });
  }
  /** Objet « metamodel » : types de Capella et héritage. @returns {object} */
  function metamodele(){
    const indice=nom=>{ const i=mmIndice(nom); if(i<0) throw erreur(_L(`Type inconnu : ${nom}`)); return i; };
    return Object.freeze({
      version:CAP_MM.version,
      has(nom){ try{ return mmIndice(nom)>=0; }catch(e){ return true; } },
      isA(nom, parent){ return mmAncetres(indice(nom)).has(indice(parent)); },
      supertypes(nom){ return [...mmAncetres(indice(nom))].map(mmNom); },
      types(){ return CAP_MM.n.map((n,i)=>CAP_MM.p[+n.slice(0,n.indexOf(':'))].split('.').pop()+':'+mmNom(i)); }
    });
  }

  // ── Sorties ──
  /** Valeur publique → morceau de sortie : texte, ou référence d'élément. @param {*} v @returns {string|object} */
  function morceau(v){
    const i=INTERNE.get(v);
    if(i) return {id:i.e.id, label:libelle(i.e), type:i.e.type, layer:couche(i.e)};
    if(v==null) return String(v);
    if(typeof v==='string') return v;
    if(v instanceof Error) return v.message;
    if(typeof v==='object'){ try{ return JSON.stringify(v,(k,x)=>(x instanceof RegExp?String(x):x)); }catch(e){ return String(v); } }
    return String(v);
  }
  /** Valeurs → morceaux d'une ligne. @param {Array} valeurs @param {string} sep @returns {Array} */
  function morceaux(valeurs, sep){
    const res=[];
    valeurs.forEach((v,i)=>{ if(i) res.push(sep);
      if(Array.isArray(v)&&v.some(x=>INTERNE.has(x))) v.forEach((x,j)=>{ if(j) res.push(', '); res.push(morceau(x)); });
      else res.push(morceau(v)); });
    return res;
  }
  /** Normalise des lignes de tableau : colonnes, puis cellules en morceaux. @param {Array} lignes @param {string[]} [colonnes] @returns {{colonnes:string[], cellules:Array}} */
  function tableau(lignes, colonnes){
    if(!Array.isArray(lignes)) throw erreur(_L('Liste de lignes attendue.'));
    if(colonnes!=null&&!Array.isArray(colonnes)) throw erreur(_L('Liste de colonnes attendue.'));
    let cols=colonnes;
    if(!cols){ const vus=new Set();
      for(const l of lignes){ if(Array.isArray(l)) l.forEach((x,i)=>vus.add(String(i+1))); else if(l&&typeof l==='object'&&!INTERNE.has(l)) Object.keys(l).forEach(k=>vus.add(k)); else vus.add('value'); }
      cols=[...vus]; }
    cols=cols.map(String);
    const cellules=lignes.map(l=>cols.map((c,i)=>{ const v=Array.isArray(l)?l[colonnes?i:+c-1]:l&&typeof l==='object'&&!INTERNE.has(l)?l[c]:l; return v===undefined?[]:morceaux([v],''); }));
    return {colonnes:cols, cellules};
  }
  /** Texte CSV d'un tableau normalisé (RFC 4180). @param {{colonnes:string[], cellules:Array}} t @param {string} sep @returns {string} */
  function csv(t, sep){
    const champ=s=>(/[",\n\r;\t]/.test(s)||s!==s.trim()?'"'+s.replace(/"/g,'""')+'"':s);
    const texte=m=>m.map(x=>(typeof x==='string'?x:x.label)).join('');
    return [t.colonnes.map(champ).join(sep), ...t.cellules.map(l=>l.map(c=>champ(texte(c))).join(sep))].join('\r\n')+'\r\n';
  }
  /** Objet « out ». @param {object} ctx @returns {object} */
  function out(ctx){
    const sep=o=>{ const s=o&&o.separator!=null?String(o.separator):';'; if(s.length!==1) throw erreur(_L('Séparateur CSV : un seul caractère.')); return s; };
    return Object.freeze({
      print(...v){ sortie(ctx,{k:'print', niveau:'info', parts:morceaux(v,' ')}); },
      warn(...v){ sortie(ctx,{k:'print', niveau:'warn', parts:morceaux(v,' ')}); },
      error(...v){ sortie(ctx,{k:'print', niveau:'error', parts:morceaux(v,' ')}); },
      table(lignes, colonnes, options){ const t=tableau(lignes,colonnes); sortie(ctx,{k:'table', titre:options&&options.title?String(options.title):'', colonnes:t.colonnes, cellules:t.cellules}); },
      csv(lignes, colonnes, options){ return csv(tableau(lignes,colonnes), sep(options)); },
      file(nom, contenu, type){
        let n=String(nom||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/^\.+/,'');
        if(!n) throw erreur(_L('Nom de fichier attendu.'));
        let texte=String(contenu??'');
        if(/\.csv$/i.test(n)&&texte[0]!=='﻿') texte='﻿'+texte;
        sortie(ctx,{k:'file', nom:n, contenu:texte, type:type?String(type):/\.csv$/i.test(n)?'text/csv':/\.json$/i.test(n)?'application/json':'text/plain'});
      },
      clear(){ sortie(ctx,{k:'clear'}); },
      progress(fait, total){ sortie(ctx,{k:'progress', fait:+fait||0, total:total==null?null:+total}); }
    });
  }

  // ── Entrées (ui) et CSV ──
  /** Découpe un texte CSV (RFC 4180 ; séparateur détecté). @param {string} texte @param {{separator?:string, header?:boolean}} [options] @returns {{columns:string[], rows:Array}} */
  function lireCsv(texte, options){
    const o=options||{};
    let t=String(texte??''); if(t[0]==='﻿') t=t.slice(1);
    let sep=o.separator;
    if(sep==null){ const premiere=t.split(/\r?\n/,1)[0].replace(/"[^"]*"/g,''); const nb=c=>premiere.split(c).length-1; sep=[';',',','\t'].reduce((a,c)=>(nb(c)>nb(a)?c:a),';'); }
    if(typeof sep!=='string'||sep.length!==1) throw erreur(_L('Séparateur CSV : un seul caractère.'));
    const lignes=[]; let ligne=[], champ='', i=0, entre=false;
    while(i<t.length){ const c=t[i];
      if(entre){ if(c==='"'){ if(t[i+1]==='"'){ champ+='"'; i+=2; continue; } entre=false; i++; continue; } champ+=c; i++; continue; }
      if(c==='"'&&champ===''){ entre=true; i++; continue; }
      if(c===sep){ ligne.push(champ); champ=''; i++; continue; }
      if(c==='\r'||c==='\n'){ ligne.push(champ); champ=''; if(c==='\r'&&t[i+1]==='\n') i++; i++; if(ligne.some(x=>x!=='')) lignes.push(ligne); ligne=[]; continue; }
      champ+=c; i++; }
    ligne.push(champ); if(ligne.some(x=>x!=='')) lignes.push(ligne);
    if(o.header===false) return {columns:[], rows:lignes};
    const columns=(lignes.shift()||[]).map(x=>x.trim());
    return {columns, rows:lignes.map(l=>Object.fromEntries(columns.map((c,k)=>[c, l[k]??''])))};
  }
  /** Objet « ui » (asynchrone : await) ; sans interlocuteur, réponses par défaut. @param {object} ctx @returns {object} */
  function ui(ctx){
    const demander=async(d,defaut)=>{ vider(ctx); return ctx.options.interagir?ctx.options.interagir(d):defaut; };
    const texte=(v,quoi)=>{ if(v!=null&&typeof v!=='string') throw erreur(_L(`Texte attendu pour ${quoi}.`)); return v==null?'':v; };
    const lireFichier=async(o,accept)=>{ const r=await demander({k:'file', accept:o&&o.accept!=null?String(o.accept):accept}, null); return r&&typeof r.text==='string'?{name:String(r.name||''), text:r.text}:null; };
    return Object.freeze({
      async ask(question, defaut){ const r=await demander({k:'ask', question:texte(question,'question'), defaut:defaut==null?'':String(defaut)}, defaut==null?null:String(defaut)); return r==null?null:String(r); },
      async confirm(question){ return (await demander({k:'confirm', question:texte(question,'question')}, false))===true; },
      async choose(question, items, options){
        if(!Array.isArray(items)||!items.length) throw erreur(_L('Liste de choix attendue (non vide).'));
        const multiple=!!(options&&options.multiple);
        const r=await demander({k:'choose', question:texte(question,'question'), items:items.map(morceau), multiple}, multiple?[]:null);
        const pris=(Array.isArray(r)?r:r==null?[]:[r]).filter(k=>Number.isInteger(k)&&k>=0&&k<items.length).map(k=>items[k]);
        return multiple?pris:pris.length?pris[0]:null;
      },
      async readFile(options){ return lireFichier(options,''); },
      async readCsv(options){ const f=await lireFichier(options,'.csv,.tsv,.txt'); return f?Object.assign({name:f.name}, lireCsv(f.text, options)):null; },
      parseCsv(t, options){ return lireCsv(texte(t,'text'), options); }
    });
  }

  // ── Analyses (calculées par la page) ──
  /** Attache les éléments aux résultats d'une analyse : tout objet portant `$el` reçoit `element` (l'enveloppe, ou null).
   * @param {object} ctx @param {*} v @returns {*} */
  function attacher(ctx, v){
    if(Array.isArray(v)) return v.map(x=>attacher(ctx,x));
    if(v&&typeof v==='object'){
      const o={};
      for(const [k,x] of Object.entries(v)){ if(k==='$el'){ o.element=parId(ctx,x); } else o[k]=attacher(ctx,x); }
      return o;
    }
    return v;
  }
  /** Objet « analysis » : une fonction asynchrone par analyse (résultat JSON de la page, éléments attachés). @param {object} ctx @returns {object} */
  function analyse(ctx){
    const o={};
    for(const nom of ANALYSES) o[nom]=async(...args)=>{
      vider(ctx);
      const a=args.map(x=>{ const i=INTERNE.get(x); return i?{$id:i.e.id}:x; });
      if(!ctx.options.analyser) throw erreur(_L('Analyses indisponibles dans ce contexte.'));
      const r=await ctx.options.analyser(nom, a);
      if(r&&r.$error) throw erreur(r.$error);
      return attacher(ctx, r);
    };
    o.names=()=>ANALYSES.slice();
    return Object.freeze(o);
  }

  // ── Exécution ──
  /** Corps de la fonction qui enveloppe un script (fonction interne : ses déclarations peuvent reprendre les noms masqués). @param {string} code @returns {string} */
  const corps=code=>'"use strict";\nreturn (async () => {\n'+code+'\n})();\n//# sourceURL='+SOURCE;
  /** Paramètres de la fonction qui enveloppe un script : objets de l'API, puis noms masqués. @returns {string[]} */
  const parametres=()=>['model','metamodel','analysis','out','console','ui',...API_MASQUES];
  /** Ligne du script où une erreur s'est produite. @param {Error} e @param {number} decalage @param {string} [source] @returns {number|null} */
  function ligne(e, decalage, source){
    const nom=(source||SOURCE).replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');
    for(const m of String(e&&e.stack||'').matchAll(new RegExp(nom+':(\\d+)','g'))) if(+m[1]-decalage>=1) return +m[1]-decalage;
    const l=e&&typeof e.lineNumber==='number'&&!source?e.lineNumber-decalage:null;
    return l!=null&&l>=1?l:null;
  }
  /** Décalage entre les lignes du script et celles rapportées par le moteur (en-tête du constructeur de fonction), mesuré une fois. @returns {Promise<number|null>} */
  async function decalage(){
    if(decalage.val!==undefined) return decalage.val;
    try{ await new ASYNC(corps('throw new Error();'))(); }catch(e){ const l=ligne(e,0); decalage.val=l==null?null:l-1; }
    return decalage.val;
  }
  /**
   * Exécute un script sur un instantané. Sorties par options.emettre (lots), entrées par options.interagir, analyses par options.analyser.
   * @param {object} snap - Instantané (capScrSnapshot)
   * @param {string|Function} code - Texte du script, ou fonction déjà compilée (paramètres parametres())
   * @param {{emettre?:Function, interagir?:Function, analyser?:Function, selection?:string[], lot?:number, source?:string, decalage?:number}} [options]
   * @returns {Promise<{ok:boolean, erreur?:string, ligne?:number|null, duree:number, sorties:number}>} Bilan
   */
  async function executer(snap, code, options){
    options=options||{};
    const ctx=contexte(snap, options), t0=Date.now(), o=out(ctx);
    const globaux={ model:modele(ctx), metamodel:metamodele(), analysis:analyse(ctx), out:o,
      console:Object.freeze({log:o.print, info:o.print, warn:o.warn, error:o.error, table:o.table, clear:o.clear}), ui:ui(ctx) };
    const compile=typeof code==='function';
    const dec=compile?options.decalage??null:await decalage();
    const fin=(ok,e)=>{ vider(ctx); const r={ok, duree:Date.now()-t0, sorties:ctx.nbSorties};
      if(!ok){ r.erreur=e&&e.name==='ArcalyseError'?e.message:(e&&e.name?e.name+': ':'')+(e&&e.message!=null?e.message:String(e)); r.ligne=dec==null?null:ligne(e, dec, compile?options.source:null); }
      return r; };
    let fn=code;
    if(!compile){ try{ fn=new ASYNC(...parametres(), corps(code)); }catch(e){ return fin(false,e); } }
    try{ await fn(...parametres().map(n=>globaux[n])); }catch(e){ return fin(false,e); }
    return fin(true);
  }
  /**
   * Point d'entrée du worker : reçoit { snap, options }, renvoie { k:'sorties', lot } puis { k:'fin', … } ; une entrée ou une
   * analyse demandée part en { k:'ui'|'analyse', n, … }, la page répond { k:'reponse', n, valeur }. Les accès au réseau sont retirés.
   * @param {Function} script - Script compilé (paramètres parametres())
   */
  function servir(script){
    const envoyer=self.postMessage.bind(self);
    for(const n of ['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','indexedDB','caches','postMessage','Worker']) try{ self[n]=undefined; }catch(e){ /* non modifiable */ }
    const attentes=new Map(); let compteur=0;
    const demander=m=>new Promise(resoudre=>{ const n=++compteur; attentes.set(n, resoudre); envoyer(Object.assign({n}, m)); });
    self.onmessage=async e=>{
      if(e.data.k==='reponse'){ const f=attentes.get(e.data.n); attentes.delete(e.data.n); if(f) f(e.data.valeur); return; }
      const {snap, options}=e.data;
      const r=await executer(snap, script, Object.assign({}, options, { interagir:d=>demander({k:'ui', demande:d}), analyser:(nom,args)=>demander({k:'analyse', nom, args}), emettre:lot=>envoyer({k:'sorties', lot}) }));
      envoyer(Object.assign({k:'fin'}, r));
    };
  }

  /** Scripts d'exemple proposés dans la console (testés par tests/scripts.js). @returns {Array<{cle:string, nom:string, code:string}>} */
  function exemples(){
    const c=t=>t.split('\n').map(l=>'// '+l).join('\n');
    return [
      {cle:'sans-description', nom:_L('Fonctions sans description'), code:[
        c(_L('Fonctions (hors fonctions racines) dont la description est vide.')),
        'const sans = model.elements({ type: \'AbstractFunction\', where: f => !f.isSkeleton && !f.description.trim() });',
        'for (const f of sans) out.print(f.layer, f);',
        'out.print(`${sans.length} / ${model.count(\'AbstractFunction\')}`);'].join('\n')},
      {cle:'non-allouees', nom:_L('Fonctions non allouées'), code:[
        c(_L('Fonctions feuilles de SA, LA et PA allouées à aucun composant ni acteur.')),
        'const rows = [];',
        'for (const f of model.elements({ type: \'AbstractFunction\', layer: [\'SA\', \'LA\', \'PA\'] })) {',
        '  if (f.isSkeleton || f.children(\'AbstractFunction\').length) continue;',
        '  if (!f.links(\'allocation\', \'in\').length) rows.push({ layer: f.layer, function: f, owner: f.owner });',
        '}',
        'out.table(rows);'].join('\n')},
      {cle:'matrice-allocation', nom:_L('Matrice d\'allocation (CSV)'), code:[
        c(_L('Composants et fonctions allouées, affichés puis proposés en fichier CSV.')),
        'const rows = [];',
        'for (const c of model.elements({ type: \'Component\' }))',
        '  for (const l of c.links(\'allocation\', \'out\'))',
        '    rows.push({ layer: c.layer, component: c, function: l.element });',
        'out.table(rows);',
        'out.file(\'allocations.csv\', out.csv(rows));'].join('\n')},
      {cle:'statistiques', nom:_L('Statistiques par type et par couche'), code:[
        c(_L('Nombre d\'éléments par type et par couche (éléments techniques exclus).')),
        'const layers = [\'OA\', \'SA\', \'LA\', \'PA\', \'EPBS\'], counts = new Map();',
        'for (const e of model.elements({ technical: false })) {',
        '  if (!counts.has(e.type)) counts.set(e.type, Object.fromEntries([[\'type\', e.type], ...layers.map(l => [l, 0]), [\'-\', 0]]));',
        '  counts.get(e.type)[e.layer || \'-\']++;',
        '}',
        'out.table([...counts.values()].sort((a, b) => a.type.localeCompare(b.type)));'].join('\n')},
      {cle:'echanges', nom:_L('Échanges fonctionnels sans élément échangé'), code:[
        c(_L('Échanges fonctionnels qui ne transportent aucun élément d\'échange.')),
        'for (const x of model.elements(\'FunctionalExchange\')) {',
        '  if (x.links(\'exchangedItem\', \'out\').length) continue;',
        '  const [s] = x.links(\'source\'), [t] = x.links(\'target\');',
        '  out.print(x, \':\', s ? s.element : \'?\', \'→\', t ? t.element : \'?\');',
        '}'].join('\n')},
      {cle:'selection', nom:_L('Fiche de l\'élément sélectionné'), code:[
        c(_L('Attributs, liaisons, références et diagrammes de l\'élément ouvert dans le panneau de détail.')),
        'const [e] = model.selection;',
        'if (!e) throw new Error('+JSON.stringify(_L('Ouvrez d\'abord un élément dans le panneau de détail.'))+');',
        'out.print(e.type, e, \'—\', e.path);',
        'out.table(Object.entries(e.attributes()).map(([name, value]) => ({ name, value })), null, { title: '+JSON.stringify(_L('Attributs'))+' });',
        'out.table(e.links().map(l => ({ relation: l.relation, direction: l.direction, element: l.element, via: l.via || \'\' })), null, { title: '+JSON.stringify(_L('Liaisons'))+' });',
        'out.print('+JSON.stringify(_L('Référencé par :'))+', e.referencedBy());',
        'out.print('+JSON.stringify(_L('Diagrammes :'))+', e.diagrams.map(d => d.name).join(\' · \') || \'—\');'].join('\n')},
      {cle:'sante', nom:_L('Santé du modèle et contrôles'), code:[
        c(_L('Score 💚 global et par couche, puis les contrôles 🩺 les plus fournis (toutes vues, profil appliqué).')),
        'const h = await analysis.health();',
        'out.print('+JSON.stringify(_L('Score :'))+', h.score, \'/ 100 —\', h.points, '+JSON.stringify(_L('point(s) à vérifier,'))+', h.bloquants, '+JSON.stringify(_L('bloquant(s)'))+');',
        'out.table(Object.entries(h.couches).map(([layer, c]) => ({ layer, score: c.score, points: c.points, elements: c.pop })));',
        'const checks = await analysis.checks();',
        'out.table(checks.filter(c => c.rows.length).sort((a, b) => b.rows.length - a.rows.length).slice(0, 15)',
        '  .map(c => ({ view: c.view, check: c.title, severity: c.severity, rows: c.rows.length })), null, { title: '+JSON.stringify(_L('Contrôles'))+' });'].join('\n')},
      {cle:'controle', nom:_L('Lignes d\'un contrôle (export CSV)'), code:[
        c(_L('Choix d\'une vue puis d\'un contrôle ; ses lignes sont affichées et proposées en CSV.')),
        'const checks = await analysis.checks();',
        'const views = [...new Set(checks.map(c => c.view))];',
        'const view = await ui.choose('+JSON.stringify(_L('Vue :'))+', views);',
        'if (!view) return;',
        'const check = await ui.choose('+JSON.stringify(_L('Contrôle :'))+', checks.filter(c => c.view === view).map(c => `${c.title} (${c.rows.length})`));',
        'if (!check) return;',
        'const c = checks.find(x => x.view === view && check.startsWith(x.title + \' (\'));',
        'const rows = c.rows.map(r => Object.fromEntries(c.columns.map((col, i) => [col || String(i + 1), r[i] && r[i].element ? r[i].element : r[i]])));',
        'out.table(rows, null, { title: c.title });',
        'out.file(\'controle.csv\', out.csv(rows));'].join('\n')},
      {cle:'tracabilite', nom:_L('Fonctions non réalisées à la couche inférieure'), code:[
        c(_L('Fonctions feuilles de chaque couche qu\'aucune fonction de la couche suivante ne réalise (🧬 Traçabilité).')),
        'const t = await analysis.traceability({ leafOnly: true });',
        'const next = { OA: \'SA\', SA: \'LA\', LA: \'PA\' };',
        'const rows = [];',
        'for (const f of model.elements({ type: \'AbstractFunction\', layer: [\'OA\', \'SA\', \'LA\'] })) {',
        '  if (f.isSkeleton || f.children(\'AbstractFunction\').length) continue;',
        '  const below = (t.down[f.id] || []).map(id => model.getElementById(id)).filter(x => x && x.layer === next[f.layer]);',
        '  if (!below.length) rows.push({ layer: f.layer, function: f, expected: next[f.layer] });',
        '}',
        'out.table(rows);'].join('\n')},
      {cle:'chaines', nom:_L('Chaînes fonctionnelles : étapes et composants'), code:[
        c(_L('Pour chaque chaîne, ses fonctions dans l\'ordre et les composants qui les portent (⚡ Chaînes).')),
        'const chains = await analysis.chains();',
        'for (const ch of chains) {',
        '  const fns = ch.steps.filter(s => s.kind === \'function\' && s.element);',
        '  const comps = [...new Set(fns.flatMap(s => s.element.links(\'allocation\', \'in\').map(l => l.element.name)))];',
        '  out.print(ch.element || ch.name, \'—\', fns.length, '+JSON.stringify(_L('fonction(s) :'))+', fns.map(s => s.element), \'—\', comps.join(\', \') || \'∅\');',
        '}'].join('\n')},
      {cle:'exigences', nom:_L('Exigences et éléments couverts (CSV)'), code:[
        c(_L('Chaque exigence du Requirements Viewpoint avec ses éléments liés ; vide si le modèle n\'en a pas.')),
        'const r = await analysis.requirements();',
        'if (!r.list.length) { out.warn('+JSON.stringify(_L('Aucune exigence dans ce modèle.'))+'); return; }',
        'const rows = r.list.map(q => ({ id: q.ident || \'\', requirement: q.element || q.name, text: (q.text || \'\').slice(0, 120), linked: (q.links || []).map(l => l.element || l.name) }));',
        'out.table(rows);',
        'out.file(\'exigences.csv\', out.csv(rows));'].join('\n')},
      {cle:'noms', nom:_L('Qualité des noms de fonctions'), code:[
        c(_L('Fonctions dont le nom ne commence pas par un verbe ou présente un défaut (règles de ƒ Fonctions).')),
        'const rows = [];',
        'for (const f of model.elements({ type: \'AbstractFunction\', where: f => !f.isSkeleton })) {',
        '  const q = await analysis.nameQuality(f.name);',
        '  if (q.issues.length) rows.push({ layer: f.layer, function: f, issues: q.issues.map(i => i.label).join(\' ; \') });',
        '}',
        'out.table(rows);'].join('\n')}
    ];
  }

  return { executer, servir, exemples, csv, VERSION:API_VERSION, MASQUES:API_MASQUES, parametres, ANALYSES };
}
