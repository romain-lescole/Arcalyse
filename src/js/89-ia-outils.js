// ── 🤖 Outils pour une IA : catalogue commun au serveur MCP (mcp/serveur.js) et au futur panneau intégré ─────────
// Aucun accès au réseau ici : ces fonctions lisent le modèle chargé et rendent des résultats compacts (JSON) qu'une IA
// peut appeler comme « outils ». Le serveur MCP les appelle dans une page sans fenêtre (page.evaluate → capIaAppel).
// Économie de tokens : identifiants courts (E12 au lieu d'un UUID, table _capIa), listes paginées (limit / offset),
// descriptions tronquées sauf demande. Les noms d'outils et de paramètres sont en anglais (comme l'API de scripts).
// Formats : Capella, et les modèles lus par un lecteur d'Arcature (SysML v2 : 87 ; UML / SysML v1 : 88), convertis en document
// « façon Capella » ; pour ces derniers, familles au lieu des couches, liaisons du lecteur, traçabilité par satisfy / verify…,
// contrôles = validation du lecteur, diagrammes = vues du lecteur (diagrammes du fichier et vues calculées).

/** Table des identifiants courts du modèle affiché (recréée quand le modèle change) : éléments (E12) et diagrammes (D3). */
const _capIa={src:null, court:new Map(), long:[], dCourt:new Map(), dLong:[]};
/** Nombre maximum de lignes rendues par une liste. */
const CAP_IA_MAX=200;
/** Types techniques (CAP_TECHNICAL_TYPES) gardés dans les types principaux du résumé. */
const CAP_IA_TYPES_GARDES=['FunctionalExchange','ComponentExchange','PhysicalLink','ComponentPort'];
/** Taille maximale de la sortie texte d'un script (caractères). */
const CAP_IA_MAX_SORTIE=20000;

/** Relations de traçabilité des lecteurs d'Arcature (UML / SysML v1 : satisfy, verify, deriveReqt, copy, refine, trace, allocate,
 * realisation ; SysML v2 : satisfy, verify, allocation). */
const CAP_IA_TRACE_LECTURE=['satisfy','verify','deriveReqt','copy','refine','trace','allocate','allocation','realisation'];

/** Remet la table des identifiants courts à zéro si le modèle a changé. */
function capIaTable(){ if(_capIa.src!==capAllElements){ _capIa.src=capAllElements; _capIa.court=new Map(); _capIa.long=[]; _capIa.dCourt=new Map(); _capIa.dLong=[]; } }

/** Lecture d'un lecteur d'Arcature (SysML v2, UML / SysML v1) dont vient le modèle affiché, ou null pour un modèle Capella.
 * @returns {object|null} Lecture */
function capIaLecture(){ return typeof _capSysml!=='undefined'&&_capSysml.lecture&&typeof cap_xmlDoc!=='undefined'&&cap_xmlDoc===_capSysml.doc?_capSysml.lecture:null; }
/** Format du modèle affiché. @returns {string} Capella, SysML v2, UML ou SysML v1 */
function capIaFormat(){ return capIaLecture()?capSyNomFormat():'Capella'; }
/** Vue de contrôles du lecteur du modèle affiché (validation du lecteur), ou '' pour un modèle Capella. @returns {string} ana:sysml, ana:uml ou '' */
function capIaVueLecteur(){ return capIaLecture()?(capSyUml()?'ana:uml':'ana:sysml'):''; }
/** Vues de contrôles qui ont un sens pour le modèle affiché (clés de CAP_CHK_VIEWS). @returns {string[]} Clés */
function capIaVuesControles(){ const v=capIaVueLecteur(); return v?[v]:CAP_CHK_VIEWS.map(x=>x[0]).filter(k=>k!=='ana:sysml'&&k!=='ana:uml'); }
/**
 * Identifiant court d'un élément (E1, E2…), attribué à la première demande.
 * @param {string} id - Identifiant du modèle
 * @returns {string} Identifiant court
 */
function capIaCourt(id){
  capIaTable();
  let c=_capIa.court.get(id);
  if(!c){ c='E'+(_capIa.long.push(id)); _capIa.court.set(id, c); }
  return c;
}
/**
 * Identifiant du modèle à partir d'un identifiant court ou complet.
 * @param {string} x - E12 ou identifiant complet
 * @returns {string|null} Identifiant complet, ou null s'il est inconnu
 */
function capIaLong(x){
  capIaTable();
  const s=String(x==null?'':x).trim().replace(/^#/,'');
  const m=s.match(/^E(\d+)$/);
  if(m) return _capIa.long[+m[1]-1]||null;
  return capGetElementById_(s)?s:null;
}
/**
 * Élément sous forme compacte pour une IA (couche omise quand l'élément n'en a pas, et pour un modèle SysML ou UML : pas de couches ARCADIA).
 * @param {object|string} e - Élément de capAllElements, ou son identifiant
 * @returns {{id:string, type:string, layer?:string, name:string}|null} Élément compact
 */
function capIaEl(e){
  if(typeof e==='string') e=capGetElementById_(e);
  if(!e) return null;
  const o={id:capIaCourt(e.id), type:e.typeName};
  if(e.layer&&!capIaLecture()) o.layer=e.layer;
  o.name=(e.attrs&&e.attrs.name)||'';
  return o;
}

/**
 * Identifiant court d'un diagramme (D1, D2…), attribué à la première demande.
 * @param {string} uid - Diagramme du .aird, ou « sy:<clé> » d'une vue d'un lecteur d'Arcature
 * @returns {string} Identifiant court
 */
function capIaDgCourt(uid){
  capIaTable();
  let c=_capIa.dCourt.get(uid);
  if(!c){ c='D'+(_capIa.dLong.push(uid)); _capIa.dCourt.set(uid, c); }
  return c;
}
/**
 * Diagramme sous forme interne commune, depuis une vue d'un lecteur d'Arcature (liste `vues()`, `vuesPour` ou vue complète).
 * @param {object} v - Vue {cle, nom, sigle, libelleGenre, origine, element}
 * @returns {{uid:string, name:string, code:string, type:string, layer:string, origin:string, target:string}} Diagramme
 */
function capIaDgVue(v){
  return {uid:'sy:'+v.cle, name:v.nom||'', code:v.sigle||'', type:v.libelleGenre||v.genre||'', layer:'',
    origin:v.origine&&v.origine!=='calculee'?v.origine:'computed', target:v.element||''};
}
/**
 * Diagrammes du modèle affiché : ceux du .aird (Capella), ou les diagrammes du fichier et les vues calculées d'un lecteur d'Arcature.
 * @returns {Array<{uid:string, name:string, code:string, type:string, layer:string, origin:string, target:string}>} Diagrammes
 */
function capIaDiagrammes(){
  if(capIaLecture()) return capSyVuesListe().map(capIaDgVue);
  return capScrDiagrammes().liste.map(d=>({uid:d.id, name:d.name, code:d.code, type:d.type, layer:d.layer, origin:'', target:d.target}));
}
/**
 * Diagramme désigné par son identifiant court (D3), son identifiant complet ou la clé d'une vue d'un lecteur.
 * @param {string} x - Identifiant
 * @returns {object|null} Diagramme (forme de capIaDiagrammes), ou null s'il est inconnu
 */
function capIaDgTrouver(x){
  capIaTable();
  const s=String(x==null?'':x).trim(), m=s.match(/^D(\d+)$/), uid=m?_capIa.dLong[+m[1]-1]:s;
  if(!uid) return null;
  const d=capIaDiagrammes().find(y=>y.uid===uid||y.uid==='sy:'+uid);
  if(d||!capIaLecture()) return d||null;
  const v=capSyVue(uid.replace(/^sy:/,''));   // vue proposée sur un élément (vuesPour) sans figurer dans la liste
  return v?capIaDgVue(v):null;
}
/**
 * Diagramme sous forme compacte pour une IA : id court, nom, sigle, type, couche (Capella), origine (SysML, UML), élément cible.
 * @param {object} d - Diagramme (forme de capIaDiagrammes)
 * @returns {object} Diagramme compact
 */
function capIaDg(d){
  const o={id:capIaDgCourt(d.uid), name:d.name};
  if(d.code) o.code=d.code;
  if(d.type) o.type=d.type;
  if(d.layer) o.layer=d.layer;
  if(d.origin) o.origin=d.origin;
  if(d.target&&capGetElementById_(d.target)) o.target=capIaCourt(d.target);
  return o;
}
/**
 * Éléments montrés par une vue d'un lecteur d'Arcature (formes et liens).
 * @param {object} v - Vue complète (`vue(cle)` du lecteur)
 * @returns {string[]} Identifiants des éléments du modèle, sans doublon
 */
function capIaVueElements(v){ return [...new Set([...(v.formes||[]), ...(v.liens||[])].map(x=>x.element).filter(id=>id&&capGetElementById_(id)))]; }

/**
 * Index des diagrammes du fichier (Papyrus, Cameo, Enterprise Architect : origine autre que « calculee ») d'un modèle UML : éléments
 * montrés par chacun et, pour chaque élément, les diagrammes qui le montrent. Les vues sont dessinées par le lecteur sans être gardées
 * (seules les listes d'identifiants le sont) ; calcul borné à quelques secondes (index partiel au-delà), gardé dans _capAnaCache.
 * @returns {{parElement:Map<string,string[]>, partiel:boolean}} Index
 */
function capIaDgIndexLecture(){
  const lec=capIaLecture();
  if(_capAnaCache.iaDgLec&&_capAnaCache.iaDgLec.src===lec) return _capAnaCache.iaDgLec;
  const parElement=new Map(), t0=Date.now(); let partiel=false;
  for(const v of capSyVuesListe()){
    if(!v.origine||v.origine==='calculee') continue;
    if(Date.now()-t0>4000){ partiel=true; break; }   // très gros projet : les diagrammes restants ne sont pas indexés
    let vue=null; try{ vue=lec.vue(v.cle); }catch(x){ vue=null; }
    if(vue) for(const id of capIaVueElements(vue)){ let l=parElement.get(id); if(!l) parElement.set(id, l=[]); l.push(v); }
  }
  return (_capAnaCache.iaDgLec={src:lec, parElement, partiel});
}

/**
 * Éléments montrés par un diagramme : formes et liens d'une vue d'un lecteur d'Arcature, ou index inverse des diagrammes du .aird
 * (capScrDiagrammes, gardé dans _capAnaCache).
 * @param {string} uid - Diagramme
 * @returns {string[]} Identifiants des éléments du modèle
 */
function capIaDgElements(uid){
  if(uid.startsWith('sy:')){
    const v=capIaLecture()?capSyVue(uid.slice(3)):null;
    return v?capIaVueElements(v):[];
  }
  const D=capScrDiagrammes();
  if(!_capAnaCache.iaDgEls||_capAnaCache.iaDgEls.src!==D){
    const inv=new Map();
    for(const [id, l] of Object.entries(D.parElement)) for(const u of l){ let a=inv.get(u); if(!a) inv.set(u, a=[]); a.push(id); }
    _capAnaCache.iaDgEls={src:D, inv};
  }
  return _capAnaCache.iaDgEls.inv.get(uid)||[];
}
/**
 * Diagrammes qui montrent un élément (Capella : .aird ; UML : diagrammes du fichier, capIaDgIndexLecture) et vues proposées sur lui
 * (SysML, UML : `vuesPour` du lecteur, comme le panneau de détail).
 * @param {string} id - Élément
 * @returns {object[]} Diagrammes compacts (20 au plus, puis {more})
 */
function capIaElDiagrammes(id){
  let l;
  if(capIaLecture()){
    const vus=new Set(); l=[];
    for(const v of [...(capIaDgIndexLecture().parElement.get(id)||[]), ...capSyVuesPour(id)]) if(!vus.has(v.cle)){ vus.add(v.cle); l.push(capIaDgVue(v)); }
  }
  else { const parUid=new Map(capIaDiagrammes().map(d=>[d.uid, d])); l=(capScrDiagrammes().parElement[id]||[]).map(u=>parUid.get(u)).filter(Boolean); }
  const r=l.slice(0, 20).map(capIaDg);
  if(l.length>20) r.push({more:l.length-20});
  return r;
}
/**
 * Texte en minuscules sans accents (recherche).
 * @param {string} s - Texte
 * @returns {string} Texte normalisé
 */
function capIaNorm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
/**
 * Bornes de pagination lues dans les arguments.
 * @param {object} a - Arguments (limit, offset)
 * @param {number} defaut - Nombre de lignes par défaut
 * @returns {{limit:number, offset:number}} Bornes
 */
function capIaPage(a, defaut){
  const limit=Math.max(1, Math.min(CAP_IA_MAX, Math.floor(+a.limit||defaut)));
  return {limit, offset:Math.max(0, Math.floor(+a.offset||0))};
}
/**
 * Découpe une liste selon la pagination demandée.
 * @param {Array} liste - Liste complète
 * @param {object} a - Arguments (limit, offset)
 * @param {number} defaut - Nombre de lignes par défaut
 * @returns {{total:number, offset:number, items:Array, next_offset?:number}} Page
 */
function capIaPaginer(liste, a, defaut){
  const {limit, offset}=capIaPage(a, defaut);
  const r={total:liste.length, offset, items:liste.slice(offset, offset+limit)};
  if(offset+limit<liste.length) r.next_offset=offset+limit;
  return r;
}
/**
 * Texte d'une description Capella (HTML) borné.
 * @param {string} html - Description
 * @param {number} [max] - Longueur maximale (0 : sans limite)
 * @returns {string} Texte
 */
function capIaTexte(html, max){
  const t=capHtmlToText(html||'');
  return max&&t.length>max?t.slice(0, max)+' […]':t;
}
/** Rang d'une couche ARCADIA (tri). @param {string} l - Couche @returns {number} Rang */
function capIaRangCouche(l){ const i=['OA','SA','LA','PA','EPBS'].indexOf(l); return i<0?9:i; }

/**
 * Index des relations de l'API de scripts par élément (relations de 🔗 Liens, CAP_SCR_RELATIONS), gardé dans _capAnaCache.
 * @returns {Map<string, Array<{rel:string, dir:string, autre:string, via:string}>>} Relations par identifiant
 */
function capIaLiens(){
  if(_capAnaCache.iaLiens) return _capAnaCache.iaLiens;
  const L=capLinksData||(capLinksData=capComputeLinks()), idx=new Map(), vus=new Set();
  const ajouter=(id, x)=>{ const k=id+'|'+x.rel+'|'+x.dir+'|'+x.autre; if(vus.has(k)) return; vus.add(k); let l=idx.get(id); if(!l) idx.set(id, l=[]); l.push(x); };
  for(const [cle, rel] of Object.entries(CAP_SCR_RELATIONS)) for(const r of L[cle]||[]){
    if(!(r.src&&r.tgt&&r.src.id&&r.tgt.id)) continue;
    const via=r.via&&r.via.id||'';
    ajouter(r.src.id, {rel, dir:'out', autre:r.tgt.id, via});
    ajouter(r.tgt.id, {rel, dir:'in', autre:r.src.id, via});
  }
  return (_capAnaCache.iaLiens=idx);
}

/**
 * Chemin d'un élément par les noms de ses conteneurs (racine → élément).
 * @param {string} id - Identifiant
 * @returns {string} Chemin « A / B / C »
 */
function capIaChemin(id){
  const {parentOf}=capGetParentIndex(), noms=[];
  let p=parentOf[id], n=0;
  while(p&&n++<40){ const e=capGetElementById_(p); if(e&&e.attrs&&e.attrs.name) noms.unshift(e.attrs.name); p=parentOf[p]; }
  return noms.join(' / ');
}

/* ── Outils ─────────────────────────────────────────────────────────────── */

/**
 * Résumé du modèle chargé : fichier, format, nombre d'éléments par couche (Capella) ou par famille (SysML, UML), types principaux,
 * diagrammes (et vues calculées), diagnostics du lecteur, vues de contrôles.
 * @returns {object} Résumé
 */
function capIaResume(){
  const lec=capIaLecture(), parGroupe={}, parType={};
  for(const e of capAllElements){
    const at=e.attrs||{}, g=lec?at.famille||'—':e.layer||'—';
    parGroupe[g]=(parGroupe[g]||0)+1;
    if(lec?at.technique==='true':CAP_TECHNICAL_TYPES.has(e.typeName)&&!CAP_IA_TYPES_GARDES.includes(e.typeName)) continue;   // types techniques : comptés par couche / famille seulement
    const k=lec?e.typeName:g+' '+e.typeName; parType[k]=(parType[k]||0)+1;
  }
  const types=Object.entries(parType).sort((a,b)=>b[1]-a[1]).slice(0, 30).map(([k,n])=>k+': '+n);
  const r={file:capCurrentFileName||'', format:capIaFormat(), elements:capAllElements.length};
  if(lec){
    if(lec.outil) r.tool=lec.outil;
    const f=(lec.fichiers||[]).map(x=>x.chemin).filter(Boolean); if(f.length) r.files=f.slice(0, 20);
    r.by_family=parGroupe;
  } else r.by_layer=parGroupe;
  r.main_types=types;
  const D=capIaDiagrammes();
  if(lec){
    r.diagrams=D.filter(d=>d.origin!=='computed').length; r.computed_views=D.length-r.diagrams;
    const dg=capSysmlDiagnostics(); r.diagnostics={errors:dg.erreurs, warnings:dg.avertissements};
  } else r.diagrams=D.length;
  r.check_views=capIaVuesControles();
  return r;
}

/**
 * Recherche d'éléments par nom (nom qualifié A::B pour SysML et UML), type (UML : stéréotype ou métaclasse), couche (Capella) et famille
 * (SysML, UML).
 * @param {{query?:string, type?:string, layer?:string, family?:string, limit?:number, offset?:number}} a - Critères
 * @returns {object} Page d'éléments compacts
 */
function capIaChercher(a){
  const lec=capIaLecture(), q=capIaNorm(a.query), t=capIaNorm(a.type), l=String(a.layer||'').toUpperCase(), f=String(a.family||'').toUpperCase();
  if(!q&&!t&&!l&&!f) throw new Error(_L('Préciser au moins query, type, layer ou family.'));
  if(lec&&l) throw new Error(_L(`layer (couche ARCADIA) est propre à Capella : pour un modèle ${capIaFormat()}, utiliser family (STR, BEH, REQ, ORG) ou type.`));
  if(!lec&&f) throw new Error(_L('family est propre aux modèles SysML et UML : pour un modèle Capella, utiliser layer.'));
  const exact=q?capIaLong(a.query):null, qualifie=q.includes('::');
  const res=capAllElements.filter(e=>{
    if(exact) return e.id===exact;
    const at=e.attrs||{};
    if(l&&(e.layer||'')!==l) return false;
    if(f&&(at.famille||'')!==f) return false;
    if(t&&!capIaNorm(e.typeName+' '+(at.metaclasse||'')+' '+(at.stereotypes||'')).includes(t)) return false;
    if(q&&!capIaNorm(qualifie?at.nomQualifie:at.name).includes(q)) return false;
    return true;
  }).sort((x,y)=>capIaRangCouche(x.layer)-capIaRangCouche(y.layer)||String(x.attrs.name||'').localeCompare(String(y.attrs.name||'')));
  const p=capIaPaginer(res, a, 30);
  p.items=p.items.map(capIaEl);
  return p;
}

/**
 * Partie propre aux modèles lus par un lecteur d'Arcature (SysML v2, UML / SysML v1) d'une fiche : métaclasse, stéréotypes, nom qualifié,
 * famille, déclaration, propriétés du lecteur, attributs écrits (propriétés des stéréotypes : texte d'une exigence…), diagnostics.
 * @param {object} lec - Lecture
 * @param {string} id - Élément
 * @param {object} r - Fiche complétée
 */
function capIaElementLecture(lec, id, r){
  let e=null; try{ e=lec.element(id); }catch(x){ e=null; }
  if(!e) return;
  if(e.metaclasse&&e.metaclasse!==e.type) r.metaclass=e.metaclasse;
  if(e.stereotypes&&e.stereotypes.length) r.stereotypes=e.stereotypes;
  if(e.nomQualifie) r.qualified_name=e.nomQualifie;
  if(e.famille) r.family=e.famille;
  if(e.declaration) r.declaration=e.declaration;
  const props={};
  [['keyword','motCle'],['visibility','visibilite'],['direction','direction'],['multiplicity','multiplicite'],['value','valeur']].forEach(([k,c])=>{ if(e[c]) props[k]=String(e[c]); });
  if(e.modificateurs&&e.modificateurs.length) props.modifiers=e.modificateurs.join(' ');
  if(e.agregation&&e.agregation!=='none') props.aggregation=e.agregation;
  if(e.technique) props.technical=true;
  if(e.fichier) props.file=e.fichier+(e.ligne?':'+e.ligne:'');
  if(Object.keys(props).length) r.properties=props;
  let at=[]; try{ at=typeof lec.attributs==='function'?lec.attributs(id)||[]:[]; }catch(x){ at=[]; }
  if(at.length) r.attributes=at.slice(0, 40).map(x=>({name:x.libelle||x.nom, value:capXtShort(String(x.valeur==null?'':x.valeur), 600)}));
  const dg=capSysmlDiagnostics().liste.filter(d=>d.element===id);
  if(dg.length) r.diagnostics=dg.slice(0, 20).map(d=>({severity:d.severite==='erreur'?'error':'warning', rule:d.regle||d.code||'', message:d.message||''}));
}

/**
 * Liaisons d'un élément lues par un lecteur d'Arcature, groupées par « relation in|out » (in : l'élément est la cible).
 * @param {object} lec - Lecture
 * @param {string} id - Élément
 * @returns {Object<string, object[]>} Groupes d'éléments compacts (25 au plus par groupe, puis {more})
 */
function capIaLiaisons(lec, id){
  let l=[]; try{ l=lec.liaisons(id)||[]; }catch(x){ l=[]; }
  const g={};
  for(const x of l){
    const o=capIaEl(x.autre); if(!o) continue;
    if(x.via&&capGetElementById_(x.via)) o.via=capIaCourt(x.via);
    const k=x.relation+' '+(x.sens==='entrant'?'in':'out');
    (g[k]=g[k]||[]).push(o);
  }
  for(const k of Object.keys(g)) if(g[k].length>25){ const n=g[k].length-25; g[k]=g[k].slice(0, 25); g[k].push({more:n}); }
  return g;
}

/**
 * Fiche d'un élément : identité, chemin, description, propriétés, références, enfants, relations, diagrammes ; pour un modèle SysML ou UML,
 * aussi métaclasse, stéréotypes, nom qualifié, attributs écrits et diagnostics (capIaElementLecture), liaisons du lecteur.
 * @param {{id:string, full_description?:boolean}} a - Élément (E12 ou identifiant complet)
 * @returns {object} Fiche
 */
function capIaElement(a){
  const id=capIaLong(a.id); if(!id) throw new Error(_L(`Élément inconnu : ${a.id}`));
  const e=capGetElementById_(id), at=e.attrs||{}, lec=capIaLecture();
  const {parentOf, childrenOf}=capGetParentIndex();
  const r={...capIaEl(e), uid:id, type_label:(CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName};
  if(parentOf[id]&&capGetElementById_(parentOf[id])) r.owner=capIaEl(parentOf[id]);
  r.path=capIaChemin(id);
  if(at.summary) r.summary=at.summary;
  if(at.description) r.description=capIaTexte(at.description, a.full_description?0:500);
  if(lec) capIaElementLecture(lec, id, r);
  // Propriétés simples (Capella ; celles d'un lecteur viennent de capIaElementLecture) et références vers d'autres éléments
  const props={}, refs={};
  for(const [k,v] of Object.entries(at)){
    if(['id','name','description','summary'].includes(k)||typeof v!=='string'||!v) continue;
    const ids=v.trim().split(/\s+/).map(x=>x.replace(/^#/,'')).filter(x=>x!==id&&capGetElementById_(x));
    if(ids.length){ refs[k]=ids.slice(0, 10).map(capIaEl); if(ids.length>10) refs[k].push({more:ids.length-10}); }
    else if(v.length<=120&&!lec) props[k]=v;
  }
  if(Object.keys(props).length) r.properties=props;
  if(Object.keys(refs).length) r.references=refs;
  // Enfants : nombre par type, puis les premiers
  const enf=(childrenOf[id]||[]).map(capGetElementById_).filter(Boolean);
  if(enf.length){
    const n={}; enf.forEach(c=>n[c.typeName]=(n[c.typeName]||0)+1);
    r.children={count:enf.length, by_type:n, first:enf.filter(c=>c.attrs&&c.attrs.name).slice(0, 30).map(capIaEl)};
  }
  // Relations : liaisons du lecteur (SysML, UML), sinon noms de l'API de scripts (allocation, realization, involvement…)
  if(lec){ const g=capIaLiaisons(lec, id); if(Object.keys(g).length) r.links=g; }
  else {
    const groupes={};
    for(const x of capIaLiens().get(id)||[]){ const k=x.rel+' '+x.dir; (groupes[k]=groupes[k]||[]).push(x); }
    if(Object.keys(groupes).length){
      r.links={};
      for(const [k,l] of Object.entries(groupes)){
        r.links[k]=l.slice(0, 25).map(x=>{ const o=capIaEl(x.autre); if(x.via&&capGetElementById_(x.via)) o.via=capIaEl(x.via).id; return o; });
        if(l.length>25) r.links[k].push({more:l.length-25});
      }
    }
  }
  const dg=capIaElDiagrammes(id);
  if(dg.length) r.diagrams=dg;
  return r;
}

/**
 * Traçabilité inter-couches (liens *Realization) : chaîne d'un élément, couverture par couche, ou éléments non couverts.
 * @param {{id?:string, category?:string, layer?:string, direction?:string, leaf_only?:boolean, limit?:number, offset?:number}} a - Paramètres
 * @returns {object} Résultat
 */
function capIaTracabilite(a){
  const lec=capIaLecture();
  if(lec) return capIaTraceLecture(lec, a);
  const leaf=a.leaf_only!==false;
  if(a.id){
    const id=capIaLong(a.id); if(!id) throw new Error(_L(`Élément inconnu : ${a.id}`));
    const d=capComputeTrace(false, false);
    /** Parcours en largeur d'un sens (up : réalisé par, down : réalise). */
    const suivre=(sens)=>{
      const out=[], vus=new Set([id]); let front=[id], niv=0;
      while(front.length&&niv++<6&&out.length<60){
        const suiv=[];
        for(const x of front) for(const l of (sens==='up'?d.up[x]:d.down[x])||[]){
          const o=sens==='up'?l.src:l.tgt; if(vus.has(o.id)) continue; vus.add(o.id); suiv.push(o.id);
          out.push({level:niv, ...(capIaEl(o.id)||{type:o.type, layer:o.layer, name:o.name}), link:l.type});
        }
        front=suiv;
      }
      return out;
    };
    return {element:capIaEl(id), realizes:suivre('down'), realized_by:suivre('up')};
  }
  const d=capComputeTrace(false, leaf), cells=capTraceCoverage(d);
  const libelle=k=>(CAP_TRACE_CATS.find(c=>c.k===k)||{}).label||k;
  if(a.category&&a.layer){
    const L=String(a.layer).toUpperCase(), bas=a.direction==='not_realizing';
    const c=cells.find(x=>x.cat===a.category&&(bas?x.lo===L:x.hi===L));
    if(!c) throw new Error(_L(`Aucune donnée pour la catégorie ${a.category} et la couche ${L} (catégories : ${CAP_TRACE_CATS.map(x=>x.k).join(', ')}).`));
    const ok=new Set((bas?c.loOk:c.upOk).map(x=>x.id));
    const manq=(bas?c.loAll:c.upAll).filter(x=>!ok.has(x.id));
    const p=capIaPaginer(manq, a, 50);
    p.items=p.items.map(x=>capIaEl(x.id)||{name:x.name, type:x.type, layer:x.layer});
    return Object.assign({category:libelle(c.cat), from:c.hi, to:c.lo, missing:bas?_L(`éléments ${c.lo} qui ne réalisent rien en ${c.hi}`):_L(`éléments ${c.hi} réalisés par rien en ${c.lo}`)}, p);
  }
  return {leaf_only:leaf, coverage:cells.filter(c=>c.upAll.length||c.loAll.length).map(c=>({category:c.cat, label:libelle(c.cat), from:c.hi, to:c.lo,
    upper_total:c.upAll.length, upper_realized:c.upOk.length, lower_total:c.loAll.length, lower_realizing:c.loOk.length}))};
}

/**
 * Traçabilité d'un modèle lu par un lecteur d'Arcature (SysML v2, UML / SysML v1) : liens satisfy, verify, deriveReqt, refine, trace,
 * copy, allocate… (CAP_IA_TRACE_LECTURE). Avec id : liens sortants et entrants sur plusieurs niveaux ; sans id : couverture des exigences
 * et exigences non satisfaites (paginé). Les paramètres propres aux couches ARCADIA lèvent une erreur.
 * @param {object} lec - Lecture
 * @param {{id?:string, category?:string, layer?:string, direction?:string, limit?:number, offset?:number}} a - Paramètres
 * @returns {object} Résultat
 */
function capIaTraceLecture(lec, a){
  const fmt=capIaFormat();
  if(a.category||a.layer||a.direction) throw new Error(_L(`category, layer et direction sont propres à Capella (couches ARCADIA) : pour un modèle ${fmt}, appeler traceability avec id (liens satisfy, verify, deriveReqt, refine, trace, allocate…) ou sans paramètre (couverture des exigences).`));
  const liens=id=>{ let l=[]; try{ l=lec.liaisons(id)||[]; }catch(x){ l=[]; } return l.filter(x=>CAP_IA_TRACE_LECTURE.includes(x.relation)); };
  if(a.id){
    const id=capIaLong(a.id); if(!id) throw new Error(_L(`Élément inconnu : ${a.id}`));
    /** Parcours en largeur d'un sens (sortant : l'élément satisfait, vérifie, raffine… ; entrant : il est satisfait, vérifié…). */
    const suivre=sens=>{
      const out=[], vus=new Set([id]); let front=[id], niv=0;
      while(front.length&&niv++<6&&out.length<60){
        const suiv=[];
        for(const x of front) for(const l of liens(x)){
          if(l.sens!==sens||vus.has(l.autre)) continue;
          const o=capIaEl(l.autre); if(!o) continue;
          vus.add(l.autre); suiv.push(l.autre);
          out.push(Object.assign({level:niv, relation:l.relation, label:l.libelle||l.relation}, o));
        }
        front=suiv;
      }
      return out;
    };
    return {element:capIaEl(id), format:fmt, outgoing:suivre('sortant'), incoming:suivre('entrant')};
  }
  const compte={};
  capSysmlLiaisons().forEach(l=>{ if(CAP_IA_TRACE_LECTURE.includes(l.relation)) compte[l.relation]=(compte[l.relation]||0)+1; });
  const exigences=lec.elements().filter(e=>e.famille==='REQ'&&!e.technique&&!e.racine&&/Requirement/.test(e.type||'')&&!/^(Satisfy|Verify)/.test(e.type||'')&&capGetElementById_(e.id));
  let satisfaites=0, verifiees=0; const manq=[];
  for(const e of exigences){
    const s=new Set(liens(e.id).filter(l=>l.sens==='entrant').map(l=>l.relation));
    if(s.has('satisfy')) satisfaites++; else manq.push(e.id);
    if(s.has('verify')) verifiees++;
  }
  const p=capIaPaginer(manq, a, 50);
  p.items=p.items.map(capIaEl);
  return Object.assign({format:fmt, trace_links:compte, requirements:exigences.length, satisfied:satisfaites, verified:verifiees,
    missing:_L('exigences qu\'aucun élément ne satisfait (aucun lien satisfy entrant)')}, p);
}

/**
 * Contrôles 🩺 (profil appliqué) : synthèse des contrôles en défaut, ou lignes d'une vue. Modèle SysML ou UML : seulement la validation
 * du lecteur d'Arcature (vue ana:sysml ou ana:uml), les contrôles de Capella étant sans objet.
 * @param {{view?:string, title?:string, limit?:number, offset?:number}} a - Vue (clé de CAP_CHK_VIEWS) et filtre de titre
 * @returns {object} Synthèse ou détail
 */
function capIaControles(a){
  const cell=c=>typeof c==='string'?c:`${c.name} [${capIaCourt(c.$el)}]`;
  const vl=capIaVueLecteur();
  if(vl&&a.view&&a.view!==vl) throw new Error(_L(`Vue de contrôles propre à Capella, sans objet pour un modèle ${capIaFormat()} : vue disponible ${vl} (validation du lecteur d'Arcature).`));
  if(!a.view){
    const s=capScrControles(vl).filter(x=>x.rows.length);
    return {failing:s.length, checks:s.map(x=>({view:x.view, title:x.title, severity:x.severity, count:x.rows.length}))};
  }
  const t=capIaNorm(a.title);
  const s=capScrControles(String(a.view)).filter(x=>x.rows.length&&(!t||capIaNorm(x.title).includes(t)));
  return {view:a.view, sections:s.map(x=>Object.assign({title:x.title, tip:x.tip, severity:x.severity, columns:x.columns}, capIaPaginer(x.rows.map(r=>r.map(cell)), a, 30)))};
}

/**
 * Diagrammes : liste filtrée et paginée, ou un diagramme et les éléments qu'il montre (avec le rendu textuel d'une vue d'un lecteur
 * d'Arcature sur demande).
 * @param {{id?:string, query?:string, text?:boolean, limit?:number, offset?:number}} a - Paramètres
 * @returns {object} Liste ou diagramme
 */
function capIaDiagramme(a){
  if(a.id){
    const d=capIaDgTrouver(a.id); if(!d) throw new Error(_L(`Diagramme inconnu : ${a.id} (identifiants courts D3 rendus par diagrams ou get_element).`));
    const p=capIaPaginer(capIaDgElements(d.uid), a, 50);
    p.items=p.items.map(capIaEl).filter(Boolean);
    const r=Object.assign({diagram:capIaDg(d)}, p);
    const v=d.uid.startsWith('sy:')?capSyVue(d.uid.slice(3)):null;
    if(v){
      r.shapes=(v.formes||[]).length; r.connections=(v.liens||[]).length;
      if(a.text&&v.texte) r.text=v.texte.length>8000?v.texte.slice(0, 8000)+' […]':v.texte;
    }
    return r;
  }
  const tous=capIaDiagrammes(), q=capIaNorm(a.query);
  const p=capIaPaginer(q?tous.filter(d=>capIaNorm(d.name+' '+d.code+' '+d.type).includes(q)):tous, a, 50);
  p.items=p.items.map(capIaDg);
  if(!tous.length) p.note=capIaLecture()?_L('Aucun diagramme ni aucune vue calculable dans ce modèle.'):_L('Aucun diagramme : le .aird n\'est pas chargé (open_model le cherche à côté du .capella, ou paramètre aird).');
  return p;
}

/**
 * Sortie d'un script (lots de l'API) mise en texte : lignes, tableaux (tabulations), fichiers ; éléments notés « nom [E12] ».
 * @param {object[]} lots - Messages { k, … } de l'API de scripts
 * @returns {string} Texte
 */
function capIaSortieTexte(lots){
  const m=x=>typeof x==='string'?x:`${x.label} [${capIaCourt(x.id)}]`;
  const l=[];
  for(const o of lots){
    if(o.k==='print') l.push((o.niveau==='info'?'':o.niveau.toUpperCase()+': ')+o.parts.map(m).join(''));
    else if(o.k==='table'){
      if(o.titre) l.push('## '+o.titre);
      l.push(o.colonnes.join('\t'));
      o.cellules.slice(0, CAP_IA_MAX).forEach(r=>l.push(r.map(c=>c.map(m).join('')).join('\t')));
      if(o.cellules.length>CAP_IA_MAX) l.push(_L(`… ${o.cellules.length-CAP_IA_MAX} ligne(s) de plus`));
    }
    else if(o.k==='file') l.push(_L(`[fichier ${o.nom} : ${o.contenu.length} caractères]`)+'\n'+o.contenu.slice(0, 2000));
    else if(o.k==='clear') l.length=0;
  }
  const t=l.join('\n');
  return t.length>CAP_IA_MAX_SORTIE?t.slice(0, CAP_IA_MAX_SORTIE)+'\n'+_L('… sortie tronquée'):t;
}

/**
 * Exécute un script de l'API (lecture seule) dans un worker isolé, sans interaction : ui.ask rend la valeur par défaut,
 * les autres questions rendent null. Arrêt après timeout_s secondes.
 * @param {{code:string, timeout_s?:number}} a - Script et délai
 * @returns {Promise<object>} Bilan { ok, error?, line?, duration_ms, output }
 */
function capIaScript(a){
  const code=String(a.code||'');
  if(!code.trim()) throw new Error(_L('Script vide.'));
  const lots=[], delai=Math.max(1, Math.min(300, +a.timeout_s||60))*1000, t0=Date.now();
  const snap=capScrSnapshot([]);
  const reponse=d=>d&&d.k==='ask'?(d.defaut??null):null;
  return new Promise(resoudre=>{
    let fini=false;
    const finir=r=>{ if(fini) return; fini=true; clearTimeout(minuteur); if(w) w.terminate(); resoudre(Object.assign({ok:r.ok, duration_ms:Date.now()-t0}, r.erreur?{error:r.erreur}:{}, r.ligne?{line:r.ligne}:{}, {output:capIaSortieTexte(lots)})); };
    let w=null;
    const minuteur=setTimeout(()=>finir({ok:false, erreur:_L(`Arrêté après ${delai/1000} s.`)}), delai);
    const wc=capScrCodeWorker(code);
    const url=URL.createObjectURL(new Blob([wc.texte],{type:'text/javascript'}));
    try{ w=new Worker(url); }catch(e){ w=null; }
    if(!w){
      capScrApi().executer(snap, code, {emettre:l=>lots.push(...l), interagir:async d=>reponse(d), analyser:(n,x)=>capScrAnalyse(n,x)}).then(finir);
      return;
    }
    w.onmessage=e=>{
      const m=e.data;
      if(m.k==='sorties') lots.push(...m.lot);
      else if(m.k==='ui') w.postMessage({k:'reponse', n:m.n, valeur:reponse(m.demande)});
      else if(m.k==='analyse'){ let valeur; try{ valeur=capScrAnalyse(m.nom, m.args); }catch(x){ valeur={$error:x.message}; } w.postMessage({k:'reponse', n:m.n, valeur}); }
      else if(m.k==='fin') finir(m);
    };
    w.onerror=e=>{ e.preventDefault(); const l=e.lineno?e.lineno-wc.decalage:0; finir({ok:false, erreur:(e.message||'').replace(/^Uncaught /,''), ligne:l>=1?l:null}); };
    w.postMessage({snap, options:{selection:[], source:url, decalage:wc.decalage}});
  });
}

/** Catalogue des outils : nom (anglais, comme l'API), description et paramètres (schéma JSON), calcul. */
const CAP_IA_OUTILS=[
  {name:'model_summary', description:_L('Résumé du modèle chargé : fichier, format (Capella, SysML v2, UML, SysML v1), nombre d\'éléments par couche ARCADIA (OA, SA, LA, PA, EPBS) pour Capella ou par famille (STR structure, BEH comportement, REQ exigences, ORG organisation) pour SysML et UML, types les plus nombreux, nombre de diagrammes (et de vues calculées), diagnostics du lecteur, vues de contrôles disponibles. À appeler en premier.'),
    schema:{}, faire:()=>capIaResume()},
  {name:'search_elements', description:_L('Cherche des éléments par nom (sans tenir compte des accents ni de la casse ; nom qualifié A::B pour SysML et UML), type (Capella : LogicalFunction, PhysicalComponent… ; UML / SysML v1 : stéréotype ou métaclasse, ex. Block, Requirement, Class ; une partie du nom suffit), couche ARCADIA (Capella) ou famille (SysML, UML). Rend des éléments compacts {id, type, layer, name} ; id court (E12) réutilisable dans les autres outils. Paginé.'),
    schema:{query:{type:'string', description:_L('Texte contenu dans le nom, ou identifiant exact')}, type:{type:'string', description:_L('Type, stéréotype ou métaclasse, ou une partie')},
      layer:{type:'string', enum:['OA','SA','LA','PA','EPBS'], description:_L('Couche ARCADIA (Capella)')}, family:{type:'string', enum:['STR','BEH','REQ','ORG'], description:_L('Famille (SysML, UML) : STR structure, BEH comportement, REQ exigences, ORG organisation')},
      limit:{type:'integer', description:_L('Nombre de lignes (30 par défaut, 200 au plus)')}, offset:{type:'integer', description:_L('Première ligne (pagination)')}},
    faire:a=>capIaChercher(a)},
  {name:'get_element', description:_L('Fiche d\'un élément : type, couche, conteneur, chemin, description (tronquée à 500 caractères sauf full_description), propriétés, références, enfants, relations (Capella : allocation, realization, involvement, functionalExchange, componentExchange… ; SysML et UML : liaisons du lecteur — typage, generalisation, satisfy, verify… —, « in » quand l\'élément est la cible) et diagrammes qui le montrent (id court D3, voir diagrams). SysML et UML : aussi métaclasse, stéréotypes, nom qualifié, famille, attributs écrits (texte d\'une exigence…) et diagnostics. uid = identifiant complet (pour les scripts).'),
    schema:{id:{type:'string', description:_L('Identifiant court (E12) ou complet')}, full_description:{type:'boolean', description:_L('Description complète')}}, requis:['id'],
    faire:a=>capIaElement(a)},
  {name:'diagrams', description:_L('Diagrammes du modèle. Sans id : liste paginée (Capella : diagrammes du .aird ; UML / SysML v1 : diagrammes du fichier — Papyrus, Cameo, Enterprise Architect — puis vues calculées ; SysML v2 : vues calculées), filtrée par query (nom, sigle, type) ; origin = outil d\'origine ou computed ; target = élément dont c\'est le diagramme. Avec id (court D3, ou complet) : le diagramme et les éléments qu\'il montre (paginé) ; text=true ajoute le rendu textuel d\'une vue SysML ou UML.'),
    schema:{id:{type:'string', description:_L('Diagramme (D3 ou identifiant complet) : éléments montrés')}, query:{type:'string', description:_L('Texte contenu dans le nom, le sigle ou le type')},
      text:{type:'boolean', description:_L('Rendu textuel de la vue (SysML, UML)')}, limit:{type:'integer'}, offset:{type:'integer'}},
    faire:a=>capIaDiagramme(a)},
  {name:'traceability', description:_L('Traçabilité. Capella (liens de réalisation entre couches) : avec id, ce que l\'élément réalise (couches supérieures) et ce qui le réalise (couches inférieures), sur plusieurs niveaux ; sans id, couverture par catégorie (fn, comp, fe, ce, pl, port…) et par passage de couche ; avec category et layer, liste des éléments non couverts (direction unrealized : éléments de la couche non réalisés par la suivante ; not_realizing : éléments de la couche qui ne réalisent rien au-dessus). SysML et UML (liens satisfy, verify, deriveReqt, refine, trace, copy, allocate) : avec id, liens sortants (outgoing) et entrants (incoming) sur plusieurs niveaux ; sans id, couverture des exigences et liste paginée des exigences non satisfaites.'),
    schema:{id:{type:'string', description:_L('Élément (facultatif)')}, category:{type:'string', enum:CAP_TRACE_CATS.map(c=>c.k), description:_L('Catégorie d\'éléments')},
      layer:{type:'string', enum:['OA','SA','LA','PA','EPBS'], description:_L('Couche')}, direction:{type:'string', enum:['unrealized','not_realizing']},
      leaf_only:{type:'boolean', description:_L('Fonctions feuilles seulement (vrai par défaut)')}, limit:{type:'integer'}, offset:{type:'integer'}},
    faire:a=>capIaTracabilite(a)},
  {name:'checks', description:_L('Contrôles de qualité du modèle (🩺, profil de l\'utilisateur appliqué). Sans view : liste des contrôles en défaut avec leur nombre de lignes. Avec view (clé rendue par la synthèse ou model_summary) : lignes en défaut, éléments notés « nom [E12] » ; title filtre les contrôles. Paginé par contrôle. SysML et UML : seulement la validation du lecteur d\'Arcature (vue ana:sysml ou ana:uml : contraintes d\'UML 2.5.1, de SysML 1.7 et d\'UAF 1.2, syntaxe SysML v2), les contrôles de Capella étant sans objet.'),
    schema:{view:{type:'string', description:_L('Clé de la vue de contrôles')}, title:{type:'string', description:_L('Partie du titre du contrôle')}, limit:{type:'integer'}, offset:{type:'integer'}},
    faire:a=>capIaControles(a)},
  {name:'run_script', description:_L('Exécute un script JavaScript de l\'API de scripts d\'Arcalyse (lecture seule, sans réseau) : objets model, metamodel, analysis (avec await), out. Rend la sortie texte (out.print, out.table en colonnes séparées par des tabulations ; éléments notés « nom [E12] »). Pour toute question que les autres outils ne couvrent pas. Les identifiants courts E12 ne sont pas connus des scripts : utiliser uid (get_element) ou chercher par nom. Contrat : outil script_api_reference. Modèle SysML ou UML : await analysis.sysml() rend la lecture complète (format sysml2, uml ou sysml1 ; elements, liaisons, diagnostics, vues), les analyses propres à Capella y sont vides.'),
    schema:{code:{type:'string', description:_L('Texte du script')}, timeout_s:{type:'integer', description:_L('Délai maximal en secondes (60 par défaut)')}}, requis:['code'],
    faire:a=>capIaScript(a)}
];

/**
 * Définitions des outils (sans leur calcul) au format attendu par MCP : name, description, inputSchema.
 * @returns {Array<{name:string, description:string, inputSchema:object}>} Outils
 */
function capIaOutils(){
  return CAP_IA_OUTILS.map(o=>({name:o.name, description:o.description, inputSchema:Object.assign({type:'object', properties:o.schema}, o.requis?{required:o.requis}:{})}));
}

/**
 * Appelle un outil sur le modèle chargé.
 * @param {string} nom - Nom de l'outil
 * @param {object} [args] - Arguments
 * @returns {Promise<{ok:boolean, result?:*, error?:string}>} Résultat ou erreur
 */
async function capIaAppel(nom, args){
  const o=CAP_IA_OUTILS.find(x=>x.name===nom);
  if(!o) return {ok:false, error:_L(`Outil inconnu : ${nom}`)};
  if(!capLoaded) return {ok:false, error:_L('Aucun modèle chargé.')};
  try{ return {ok:true, result:await o.faire(args||{})}; }
  catch(e){ return {ok:false, error:e&&e.message||String(e)}; }
}
