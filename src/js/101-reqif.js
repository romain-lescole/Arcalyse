/* ═══════════════════════════════════════════════════════════════════════════
   📑 ReqIF : exigences au format d'échange de l'OMG (fichier .reqif, archive .reqifz avec ses images, fichiers d'un dossier)
   lues par le lecteur d'Arcature (src/vendor/arcature-lecteur-reqif*.js, `window.ArcatureLecteurReqif`, lecture seule, hors
   ligne ; repris par `node build.js --lecteur-reqif <dossier d'Arcature>`, mode d'emploi docs/REQIF.md). La lecture suit le même
   chemin que celles des lecteurs SysML / UML (87) : `capSysmlAppliquer(lecture, nom, ArcatureLecteurReqif, 'reqif')`, document
   XML « façon Capella » (`capReqifVersXml` : une balise par élément, attributs des exigences en attributs XML, textes XHTML en
   description HTML), puis 🌳 Arborescence, ▤ Tableau, ▦ Matrice, 📘 Rapports, 💬 Revue, panneau de détail fonctionnent sans
   changement. En plus : vue 📑 ReqIF (sous-vue `reqif` de 🔬 Analyses, `capRenderReqif` : 📄 Document, ▤ Exigences, 🔗 Relations,
   🧩 Types, 🖼 Pièces jointes, 🩺 Contrôles), section du panneau de détail `capReqifDetail`, contrôles `capReqifChecks`,
   indicateurs `capReqifDashCatalog`, icônes du lecteur `capReqifIcone` / `capReqifIconeType` (appelées par capIco / capIcoType, 54).
   Images des textes : marquées `data-reqif` dans les descriptions (le lecteur ne les recopie pas), résolues à l'affichage par
   `capReqifImgSrc` (adresse blob:, ou data: dans un document exporté ; capSafeHtml, 25), recopiées en data: dans la 💾 page
   (`capReqifPageXml`).
   ═══════════════════════════════════════════════════════════════════════════ */

/** État de la vue 📑 ReqIF. */
var _capRq={view:'doc', spec:'', q:'', type:'', rel:'', attrs:true, cols:null, piece:''};
/** Adresses blob: des images de la lecture affichée (chemin → adresse), libérées au changement de modèle. */
var _capRqImg={lec:null, urls:new Map()};
/** Objet à montrer à la prochaine ouverture de la vue (depuis le panneau de détail). */
var _capRqGo=null;

/** Vrai si le lecteur ReqIF d'Arcature est embarqué. @returns {boolean} */
function capReqifDispo(){ return typeof ArcatureLecteurReqif!=='undefined'&&!!ArcatureLecteurReqif&&typeof ArcatureLecteurReqif.lire==='function'; }

/** Vrai pour un fichier ReqIF (.reqif, .reqifz). @param {string} nom @returns {boolean} */
function capReqifReconnait(nom){ return capReqifDispo()&&ArcatureLecteurReqif.reconnait(String(nom||'')); }

/** Vrai si le modèle affiché est une lecture ReqIF. @returns {boolean} */
function capSyReqif(){ return typeof _capSysml!=='undefined'&&!!_capSysml.lecture&&_capSysml.format==='reqif'; }

/** Lecture ReqIF affichée, ou null. @returns {object|null} */
function capReqifLec(){ return capSyReqif()?_capSysml.lecture:null; }

/**
 * Ouvre un fichier ReqIF (.reqif ou archive .reqifz) à la place du modèle affiché (appelée par capLoadFile, 20).
 * @param {File} f - Fichier @param {FileSystemFileHandle} [handle] - Accès direct (non utilisé) @param {boolean} [confirme] - Remplacement déjà accepté
 */
function capReqifOuvrir(f, handle, confirme){
  const name=(f&&f.name)||'';
  if(capLoaded&&!confirme){ capReplaceConfirm(name).then(ok=>{ if(ok) capReqifOuvrir(f, handle, true); else capShowWelcome(false); }); return; }
  capWelcomeStatus(_L(`Chargement de « ${name} »…`),'busy'); capShowWelcome(true);
  capSourcesNoter('rq', name, [{nom:name, chemin:name, lire:()=>Promise.resolve(f)}]);   // 🌐 changement de langue (20)
  f.arrayBuffer().then(b=>ArcatureLecteurReqif.lire(new Uint8Array(b), name)).then(lec=>setTimeout(()=>capReqifAppliquer(lec, name),30))
    .catch(err=>{ capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true); });
}

/**
 * Ouvre plusieurs fichiers déposés ou choisis ensemble : les .reqif et leurs pièces jointes (images).
 * @param {File[]} files - Fichiers @param {boolean} [confirme] - Remplacement déjà accepté
 */
function capReqifOuvrirFichiers(files, confirme){
  capReqifOuvrirDossier(files.map(f=>({nom:f.name, chemin:f.webkitRelativePath||f.name, lire:()=>Promise.resolve(f)})), '', confirme);
}

/**
 * Ouvre les fichiers ReqIF d'un dossier (📁 dossier du projet, dépôt) : tous les .reqif lus ensemble, les images et autres
 * pièces jointes du dossier résolues par leur chemin ; une archive .reqifz seule est lue telle quelle.
 * @param {{nom:string, chemin:string, lire:function():Promise<File>}[]} fichiers - Fichiers du dossier
 * @param {string} [nom] - Nom affiché @param {boolean} [confirme] - Remplacement déjà accepté
 */
async function capReqifOuvrirDossier(fichiers, nom, confirme){
  if(!capReqifDispo()){ capWelcomeStatus(_L('Lecteur ReqIF absent de cette version.'),'err'); return; }
  const rq=fichiers.filter(f=>/\.reqifz?$/i.test(f.nom)); if(!rq.length) return;
  const dossier=(rq[0].chemin||'').includes('/')?rq[0].chemin.split('/')[0]:'';
  nom=nom||dossier||rq[0].nom;
  if(capLoaded&&!confirme){ if(!(await capReplaceConfirm(nom))){ capShowWelcome(false); return; } }
  const utiles=rq.some(f=>/\.reqif$/i.test(f.nom))?fichiers.filter(f=>!/\.reqifz$/i.test(f.nom)&&(/\.reqif$/i.test(f.nom)||CAP_RQ_PIECES.test(f.nom))):[rq[0]];
  capWelcomeStatus(_L(`Chargement de « ${nom} »…`),'busy'); capShowWelcome(true);
  try{
    const lus=[]; for(const f of utiles){ const file=await f.lire(); lus.push({chemin:f.chemin||f.nom, octets:new Uint8Array(await file.arrayBuffer())}); }
    const lec=lus.length===1&&/\.reqifz$/i.test(lus[0].chemin)?await ArcatureLecteurReqif.lire(lus[0].octets, lus[0].chemin.split('/').pop()):await ArcatureLecteurReqif.lireFichiers(lus, nom);
    capSourcesNoter('rqd', nom, utiles);   // 🌐 changement de langue (20)
    setTimeout(()=>capReqifAppliquer(lec, nom),30);
  }catch(err){ capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true); }
}
/** Pièces jointes lues avec un .reqif dans un dossier (images et documents cités par les textes). */
const CAP_RQ_PIECES=/\.(png|jpe?g|gif|svg|webp|bmp|pdf|ole|bin|docx?|xlsx?|txt|wmf|emf)$/i;

/**
 * Affiche une lecture ReqIF : pipeline commun des lecteurs (87), puis ▤ Tableau en texte riche par défaut.
 * @param {object} lec - Lecture @param {string} nom - Nom affiché
 */
function capReqifAppliquer(lec, nom){
  capSysmlAppliquer(lec, nom, ArcatureLecteurReqif, 'reqif');
  if(capSyReqif()&&lec.diagnostics.length) setTimeout(()=>capToast(_L(`📑 ReqIF : ${lec.erreurs} erreur(s), ${lec.avertissements} avertissement(s) — détail dans 🏗 Architecture › 📑 ReqIF › 🩺 Contrôles`)),500);
}

/**
 * Nom d'attribut XML pour une valeur ReqIF (« Object Text » → « Object_Text ») ; un nom réservé prend un « _ ».
 * @param {string} n - Nom de la définition @param {object} pris - Attributs déjà posés @returns {string}
 */
function capReqifCle(n, pris){
  let k=String(n||'').replace(/[^\p{L}\p{N}_.-]+/gu,'_').replace(/^[^\p{L}_]+/u,'');
  if(!k) k='attribut';
  while(k in pris||/^(id|name|description|summary)$/.test(k)) k+='_';
  return k;
}

/**
 * Convertit une lecture ReqIF en document XML « façon Capella » : une balise par élément (`reqif:SpecObject`…), imbriquée comme
 * dans la lecture ; nom (libellé), description (HTML du texte, images marquées data-reqif), identifiant ReqIF.ForeignID en
 * `nomCourt`, type ReqIF en `stereotypes` (sélecteurs des rapports, 100), numéro de chapitre, spécification, valeurs des attributs
 * en texte (une colonne du ▤ Tableau par attribut), références (type, objet cité, source et cible d'une relation) en « #id ».
 * @param {object} lec - Lecture @param {string} nom - Nom du modèle @returns {Document}
 */
function capReqifVersXml(lec, nom){
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const els=lec.elements(), byId=new Map(els.map(e=>[e.id,e])), num={}, spec={};
  lec.specifications().forEach(s=>lec.plan(s.id).forEach(p=>{ num[p.id]=p.numero; spec[p.id]=s.id; }));
  const attrs=e=>{
    const a={name:e.libelle||e.nom||('‹'+e.type+'›')};
    if(e.description) a.description=lec.html(e.id,{images:'marque'});
    if(e.identifiant) a.nomCourt=e.identifiant;
    if(e.typeReqif&&e.genre!=='type') a.stereotypes=e.typeReqif;
    if(e.famille) a.famille=e.famille;
    if(e.titre) a.titre='true';
    if(num[e.id]) a.numero=num[e.id];
    if(spec[e.id]) a.specification='#'+spec[e.id];
    if(e.derniereModification) a.derniereModification=e.derniereModification;
    if(e.images) a.images=String(e.images);
    if(e.technique) a.technique='true';
    if(e.genre==='racine'||e.genre==='projet') a.racine='true';
    lec.attributs(e.id).forEach(v=>{ if(v.role||!v.renseigne||v.nom==='ReqIF.ForeignID') return; a[capReqifCle(v.nom, a)]=v.valeur; });
    for(const k of ['type','object','source','target']){ const ids=(e.references[k]||[]).filter(i=>byId.has(i)); if(ids.length) a[k==='object'?'objet':k==='target'?'cible':k]=ids.map(i=>'#'+i).join(' '); }
    if(e.objet&&byId.has(e.objet)) a.objet='#'+e.objet;
    return a;
  };
  const out=[], vus=new Set();
  const ecrire=(e, prof)=>{
    if(!e||vus.has(e.id)||prof>400) return; vus.add(e.id);
    const kids=e.enfants.map(i=>byId.get(i)).filter(Boolean);
    out.push(`<ownedElements xsi:type="reqif:${esc(String(e.type||'Element').replace(/[^\w.-]/g,'_'))}" id="${esc(e.id)}"${Object.entries(attrs(e)).map(([k,v])=>` ${k}="${esc(v)}"`).join('')}${kids.length?'>':'/>'}`);
    if(kids.length){ kids.forEach(k=>ecrire(k, prof+1)); out.push('</ownedElements>'); }
  };
  ecrire(byId.get(lec.racine), 0);
  els.forEach(e=>{ if(!vus.has(e.id)) ecrire(e, 0); });
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<reqif:Model xmlns:reqif="urn:arcalyse:reqif" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${esc(nom)}" lecteur="ArcatureLecteurReqif ${esc(ArcatureLecteurReqif.version||'')}">\n${out.join('\n')}\n</reqif:Model>`;
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error(_L('Conversion ReqIF → XML impossible'));
  return doc;
}

/** Noms lisibles des types ReqIF (registre des types : CAP_HUMAN_NAMES, CAP_TECHNICAL_TYPES). */
const CAP_RQ_TYPES={
  ReqIF:[_L('En-tête ReqIF'), _L('En-tête du fichier ReqIF : titre, outil, version, date')],
  ReqIFProject:[_L('Projet ReqIF'), _L('Plusieurs fichiers ReqIF lus ensemble')],
  Specification:[_L('Spécification'), _L('Document d\'exigences ReqIF (SPECIFICATION) : plan des objets en hiérarchie')],
  SpecObject:[_L('Objet ReqIF'), _L('Exigence ou titre de chapitre (SPEC-OBJECT) : valeurs de ses attributs')],
  SpecHierarchy:[_L('Autre place'), _L('Place supplémentaire d\'un objet dans une spécification (SPEC-HIERARCHY)')],
  SpecRelation:[_L('Relation ReqIF'), _L('Relation typée entre deux objets (SPEC-RELATION)')],
  RelationGroup:[_L('Groupe de relations'), _L('Relations entre deux spécifications (RELATION-GROUP)')],
  SpecObjectType:[_L('Type d\'objet'), _L('Type d\'objet ReqIF et ses définitions d\'attributs')],
  SpecificationType:[_L('Type de spécification'), _L('Type de spécification ReqIF')],
  SpecRelationType:[_L('Type de relation'), _L('Type de relation ReqIF')],
  RelationGroupType:[_L('Type de groupe'), _L('Type de groupe de relations ReqIF')],
  EnumValue:[_L('Valeur énumérée'), _L('Valeur d\'un type de données énuméré')],
  Specifications:[_L('Spécifications'), _L('Partie du fichier ReqIF')], SpecObjects:[_L('Objets hors spécification'), _L('Partie du fichier ReqIF')],
  SpecRelations:[_L('Relations'), _L('Partie du fichier ReqIF')], SpecRelationGroups:[_L('Groupes de relations'), _L('Partie du fichier ReqIF')],
  SpecTypes:[_L('Types'), _L('Partie du fichier ReqIF')], Datatypes:[_L('Types de données'), _L('Partie du fichier ReqIF')]
};

/** Complète le registre des types avec ceux de la lecture ReqIF. @param {object} lec - Lecture */
function capReqifTypesHumains(lec){
  const tech={};
  lec.elements().forEach(e=>{ const t=tech[e.type]||(tech[e.type]={oui:0, non:0}); if(e.technique) t.oui++; else t.non++; });
  Object.keys(tech).forEach(t=>{
    const H=CAP_RQ_TYPES[t];
    if(H) CAP_HUMAN_NAMES[t]={h:H[0], d:H[1]};
    else if(/^AttributeDefinition/.test(t)) CAP_HUMAN_NAMES[t]={h:_L('Définition d\'attribut')+' '+t.slice(19).toUpperCase(), d:_L('Attribut d\'un type ReqIF')};
    else if(/^DatatypeDefinition/.test(t)) CAP_HUMAN_NAMES[t]={h:_L('Type de données')+' '+t.slice(18).toUpperCase(), d:_L('Type de données ReqIF')};
    else if(!CAP_HUMAN_NAMES[t]) CAP_HUMAN_NAMES[t]={h:t, d:'ReqIF'};
    if(tech[t].oui&&!tech[t].non) CAP_TECHNICAL_TYPES.add(t);
  });
}

/* ── Images des textes ─────────────────────────────────────────────── */

/**
 * Adresse d'une image citée par un texte ReqIF : blob: (affichage, une par image, libérée au changement de modèle) ou data:
 * (document exporté : page HTML, Word, page de relecture).
 * @param {string} chemin - Chemin de la pièce jointe (attribut data-reqif) @param {boolean} [exp] - Pour un export
 * @returns {string} Adresse, ou '' si l'image est absente
 */
function capReqifImgSrc(chemin, exp){
  const lec=capReqifLec(); if(!lec) return '';
  const p=lec.image(chemin); if(!p||!p.image) return '';
  if(exp) return p.dataUri();
  if(_capRqImg.lec!==lec){ _capRqImg.urls.forEach(u=>URL.revokeObjectURL(u)); _capRqImg.urls.clear(); _capRqImg.lec=lec; }
  let u=_capRqImg.urls.get(p.chemin);
  if(!u){ u=URL.createObjectURL(new Blob([p.octets], {type:p.type})); _capRqImg.urls.set(p.chemin, u); }
  return u;
}

/**
 * Images ReqIF recopiées en data: dans le XML de la 💾 page (la page enregistrée se relit sans le lecteur) ; appelée par
 * capBuildPageHtml (20) sur le XML sérialisé.
 * @param {string} xml - Document sérialisé @returns {string}
 */
function capReqifPageXml(xml){
  if(!capReqifLec()) return xml;
  return xml.replace(/&lt;img data-reqif=&quot;([^&]*?)&quot;/g, (m, c)=>{ const s=capReqifImgSrc(c.replace(/&amp;/g,'&'), true); return s?`&lt;img src=&quot;${s}&quot; data-reqif=&quot;${c}&quot;`:m; });
}

/* ── Icônes ─────────────────────────────────────────────────────────── */

/** Icône ReqIF d'un élément du modèle affiché, ou null hors modèle ReqIF. @param {string} id @param {number} [taille] @returns {?string} */
function capReqifIcone(id, taille){
  const lec=capReqifLec(); if(!lec) return null;
  const e=lec.element(id); return e?ArcatureLecteurReqif.icone(e, taille||14)||'':'';
}
/** Icône ReqIF d'un type, ou null hors modèle ReqIF. @param {string} type @param {number} [taille] @returns {?string} */
function capReqifIconeType(type, taille){ return capReqifLec()?ArcatureLecteurReqif.iconeType(type, taille||14)||capIcoPlus(type, taille):null; }

/* ── Données de la vue ───────────────────────────────────────────────── */

/**
 * Objets ReqIF de la lecture (exigences et titres), avec leur spécification, leur numéro, leurs valeurs et leurs relations (en cache).
 * @returns {{list:object[], byId:Object, specs:object[], attrs:string[], rels:object[]}} attrs : noms des attributs renseignés
 */
function capReqifObjets(){
  if(_capAnaCache.rqObj) return _capAnaCache.rqObj;
  const lec=capReqifLec(), R={list:[], byId:{}, specs:[], attrs:[], rels:[]}; if(!lec) return R;
  const vus=new Set(), noms=new Set();
  const lia=lec.toutesLiaisons();
  const objet=(e, s, p)=>{ const o={id:e.id, e, spec:s?s.id:'', specNom:s?s.libelle:'', numero:p?p.numero:'', niveau:p?p.niveau:0, titre:!!e.titre,
    vals:lec.attributs(e.id), out:[], in:[]};
    o.vals.forEach(v=>{ if(v.renseigne&&!v.role&&v.nom!=='ReqIF.ForeignID') noms.add(v.nom); });
    return o; };
  lec.specifications().forEach(s=>{ const S={id:s.id, nom:s.libelle, n:0, plan:lec.plan(s.id)}; R.specs.push(S);
    S.plan.forEach(p=>{ if(p.occurrence||vus.has(p.objet)) return; const e=lec.element(p.objet); if(!e) return; vus.add(e.id); S.n++;
      const o=objet(e, s, p); R.list.push(o); R.byId[o.id]=o; }); });
  lec.elements().filter(e=>e.type==='SpecObject'&&!vus.has(e.id)).forEach(e=>{ const o=objet(e, null, null); R.list.push(o); R.byId[o.id]=o; });
  lia.forEach(l=>{ const r={rel:l.relation, src:l.source, tgt:l.cible, via:l.via}; R.rels.push(r);
    if(R.byId[l.source]) R.byId[l.source].out.push(r); if(R.byId[l.cible]) R.byId[l.cible].in.push(r); });
  R.attrs=[...noms];
  return _capAnaCache.rqObj=R;
}

/** Libellé court d'un objet : identifiant (ReqIF.ForeignID) et nom. @param {object} e - Élément de la lecture @returns {string} */
function capReqifNom(e){ return e?(e.identifiant?e.identifiant+' · ':'')+(e.libelle||e.nom||'‹'+e.type+'›'):'—'; }

/** Lien vers un objet (panneau de détail). @param {string} id @returns {string} HTML */
function capReqifLien(id){
  const lec=capReqifLec(), e=lec&&lec.element(id);
  return e?`<span class="cap-tbl-link" onclick="capOpenDetailById('${capEsc(id)}')" title="${capEsc(e.texte||'').slice(0,300)}">${capEsc(capReqifNom(e))}</span>`:`<span class="ana-dim">${capEsc(id||'—')}</span>`;
}

/** HTML sûr d'un texte ReqIF (images résolues, liens neutralisés). @param {string} id @returns {string} HTML */
function capReqifTexteHtml(id){
  const lec=capReqifLec(); if(!lec) return '';
  const h=lec.html(id,{images:'marque'}); return h?capSafeHtml(h):'';
}

/** Attributs internes du document XML d'une lecture ReqIF, écartés des colonnes d'attributs ReqIF. */
const CAP_RQ_INTERNES=new Set(['id','name','description','summary','nomCourt','stereotypes','famille','titre','numero','specification','derniereModification','images','technique','racine','type','objet','source','cible','layer','fullType','href']);

/** Libellé d'une colonne du ▤ Tableau propre à une lecture ReqIF, ou '' (hors modèle ReqIF, autre colonne). @param {string} k - Clé @returns {string} */
function capReqifColLabel(k){ return capReqifLec()?({numero:_L('N°'), nomCourt:_L('Identifiant'), stereotypes:_L('Type ReqIF'), specification:_L('Spécification'), images:_L('Images')}[k]||''):''; }

/**
 * Ouvre les exigences ReqIF dans un onglet du ▤ Tableau : une ligne par objet, dans l'ordre des spécifications (ou de l'une d'elles),
 * colonnes N°, identifiant, nom, texte (riche : images comprises), type ReqIF, puis une par attribut ReqIF renseigné.
 * @param {string} [spec] - Spécification seule (identifiant) ; toutes sinon
 */
function capReqifVersTableau(spec){
  const lec=capReqifLec(); if(!lec) return;
  const Q=capReqifObjets(), ids=Q.list.filter(o=>!spec||o.spec===spec).map(o=>o.id).filter(id=>capGetElementById_(id));
  if(!ids.length){ capAlert(_L('Aucune exigence à montrer.'), {level:'warn'}); return; }
  const cles=[]; ids.forEach(id=>Object.keys(capGetElementById_(id).attrs).forEach(k=>{ if(!CAP_RQ_INTERNES.has(k)&&!cles.includes(k)) cles.push(k); }));
  const S=spec&&Q.specs.find(s=>s.id===spec), nom=S?S.nom:_L('Exigences ReqIF');
  capTableTabsEnsure(); capTableSyncToTab();
  const tab=capTableTabNew(nom);
  Object.assign(tab, {types:['SpecObject'], lignes:ids, visibleCols:['numero','nomCourt','name','description','stereotypes', ...cles]});
  capTableTabs.push(tab); capTableTabIdx=capTableTabs.length-1; capTableSyncFromTab(); capPage=0;
  if(capCurrentView==='table') capRenderTable(); else capNavOpen('table');
  capToast(_L(`✔ « ${nom} » ouvert dans ▤ Tableau : ${ids.length} ligne(s), ${cles.length+5} colonne(s)`));
}

/* ── Contrôles ───────────────────────────────────────────────────────── */

/**
 * Contrôles 🩺 d'une lecture ReqIF : diagnostics du lecteur (références, identifiants, pièces jointes), puis contenu des
 * exigences (sans texte, sans identifiant, identifiants en double, isolées, titres vides, spécifications vides).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capReqifChecks(){
  const lec=capReqifLec(); if(!lec) return [];
  const Q=capReqifObjets(), esc=capEsc, D=capSysmlDiagnostics();
  const row=o=>`<tr><td>${esc(o.numero||'')}</td><td>${capReqifLien(o.id)}</td><td class="ana-dim">${esc(o.specNom||_L('hors spécification'))}</td></tr>`;
  const cols=[_L('N°'), _L('Objet'), _L('Spécification')];
  const dg=d=>`<tr><td><span class="ana-dim">${esc(d.code)}</span></td><td>${esc(d.message||'')}</td><td>${d.element?capReqifLien(d.element):'<span class="ana-dim">—</span>'}</td></tr>`;
  const dcols=[_L('Règle'), _L('Message'), _L('Élément')];
  const ex=Q.list.filter(o=>!o.titre), ids={};
  ex.forEach(o=>{ if(o.e.identifiant) (ids[o.e.identifiant]=ids[o.e.identifiant]||[]).push(o); });
  const avecId=ex.some(o=>o.e.identifiant), avecRel=Q.rels.length>0;
  return [
    {icon:'✖', sev:'err', title:_L('ReqIF — références et identifiants'), tip:_L('Diagnostics du lecteur : référence vers un identifiant absent du fichier, identifiant en double'), cols:dcols,
      items:D.liste.filter(d=>d.severite==='erreur').map(dg)},
    {icon:'🖼', title:_L('ReqIF — pièces jointes absentes'), tip:_L('Image ou pièce citée par un texte mais absente de l\'archive .reqifz ou du dossier'), cols:dcols, items:D.liste.filter(d=>d.code==='RQ-PIECE').map(dg)},
    {icon:'⚠', title:_L('ReqIF — autres avertissements de lecture'), tip:_L('Valeur d\'un attribut hors de son type, objet présent dans aucune spécification'), cols:dcols,
      items:D.liste.filter(d=>d.severite!=='erreur'&&d.code!=='RQ-PIECE').map(dg)},
    {icon:'✎', title:_L('Exigences ReqIF sans texte'), tip:_L('Objet sans ReqIF.Text ni autre texte mis en forme'), cols, items:ex.filter(o=>!o.e.texte.trim()).map(row)},
    {icon:'#', sev:avecId?'warn':'info', title:_L('Exigences ReqIF sans identifiant'), tip:avecId?_L('ReqIF.ForeignID vide alors que d\'autres exigences en ont un'):_L('Le fichier ne donne aucun ReqIF.ForeignID'), cols, items:ex.filter(o=>!o.e.identifiant).map(row)},
    {icon:'⧉', sev:'err', title:_L('Identifiants d\'exigence ReqIF en double'), tip:_L('Même ReqIF.ForeignID sur plusieurs objets'), cols, items:Object.values(ids).filter(a=>a.length>1).flat().map(row)},
    {icon:'∅', sev:avecRel?'warn':'info', title:_L('Exigences ReqIF sans relation'), tip:avecRel?_L('Aucune relation ReqIF vers ou depuis cette exigence'):_L('Le fichier ne contient aucune relation'), cols, items:ex.filter(o=>!o.out.length&&!o.in.length).map(row)},
    {icon:'§', title:_L('Titres de chapitre ReqIF sans contenu'), tip:_L('Titre sans objet en dessous dans sa spécification'), cols,
      items:Q.list.filter(o=>o.titre&&o.spec&&!(lec.enfants(o.id)||[]).some(c=>c.genre==='objet'||c.genre==='occurrence')).map(row)},
    {icon:'▤', title:_L('Spécifications ReqIF vides'), tip:_L('Spécification sans aucun objet'), cols:[_L('Spécification')], items:Q.specs.filter(s=>!s.n).map(s=>`<tr><td>${capReqifLien(s.id)}</td></tr>`)}
  ];
}

/* ── Panneau de détail ───────────────────────────────────────────────── */

/**
 * Section 📑 ReqIF du panneau de détail : identifiant, type, spécification et numéro, valeurs des attributs (texte mis en forme
 * avec ses images), relations, autres places, diagnostics, extrait XML.
 * @param {string} id - Élément @param {Function} secTitle - Titre de section @returns {string} HTML
 */
function capReqifDetail(id, secTitle){
  const lec=capReqifLec(), e=lec&&lec.element(id); if(!e) return '';
  const esc=capEsc, Q=capReqifObjets(), o=Q.byId[id];
  const kv=[[_L('Identifiant'), e.identifiant], [_L('Type ReqIF'), e.typeReqif], [_L('Spécification'), o&&o.specNom], [_L('N°'), o&&o.numero],
    [_L('Identifiant ReqIF'), e.racine?'':e.id], [_L('Dernière modification'), e.derniereModification], [_L('Fichier'), lec.documents.length>1?e.fichier:'']].filter(([,v])=>v);
  let h=secTitle(_L('📑 ReqIF'),'#e3b341')+`<table class="ana-t ana-kv">${kv.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  const vals=lec.attributs(id).filter(v=>v.renseigne&&v.role!=='texte');
  if(vals.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Attributs')}</div><table class="ana-t ana-kv">${vals.map(v=>`<tr><td>${esc(v.nom)}</td><td>${v.genre==='XHTML'?`<div class="cap-desc">${capSafeHtml(lec.valeurHtml(id, v.cle, {images:'marque'}))}</div>`:esc(v.valeur)}</td></tr>`).join('')}</table>`;
  const lia=lec.liaisons(id);
  if(lia.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Relations')}</div><table class="ana-t ana-kv">${lia.map(l=>`<tr><td>${esc(l.libelle)}</td><td>${capReqifLien(l.autre)}</td></tr>`).join('')}</table>`;
  const places=lec.elements().filter(x=>x.genre==='occurrence'&&x.objet===id);
  if(places.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Autres places')}</div>`+places.map(p=>`<div>${capReqifLien(p.id)}</div>`).join('');
  if(e.genre==='occurrence'&&e.objet) h+=`<div style="margin-top:4px">${_L('Place de :')} ${capReqifLien(e.objet)}</div>`;
  const diags=capSysmlDiagnostics().liste.filter(d=>d.element===id);
  if(diags.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Diagnostics')}</div>`+diags.map(d=>`<div class="sy-diag sy-${d.severite==='erreur'?'err':'warn'}">${d.severite==='erreur'?'✖':'⚠'} ${esc(d.message||'')} <span class="ana-dim">${esc(d.code)}</span></div>`).join('');
  if(o) h+=`<div style="margin-top:6px"><button class="cap-lf-btn" onclick="capReqifOuvrirObjet('${esc(id)}')" title="${_L('Ouvrir dans 🏗 Architecture › 📑 ReqIF, à sa place dans le document')}">📄 ${_L('Voir dans le document')}</button></div>`;
  let ext=''; try{ ext=lec.extrait(id)||''; }catch(err){ ext=''; }
  if(ext) h+=`<details class="sy-extrait"><summary class="ana-dim" style="font-size:11px;cursor:pointer">${_L('Extrait du fichier ReqIF')}${ext.length>4000?_L(' (début)'):''}</summary><pre class="sy-texte">${esc(ext.slice(0,4000))}</pre></details>`;
  return h;
}

/** Ouvre la vue 📑 ReqIF sur un objet, à sa place dans le document. @param {string} id */
function capReqifOuvrirObjet(id){ _capRqGo=id; capNavOpen('ana:reqif'); }

/* ── Vue 📑 ReqIF ────────────────────────────────────────────────────── */

/** Puces de valeurs d'un objet (attributs énumérés et courts, sans le nom, le texte ni l'identifiant). @param {object} o @returns {string} HTML */
function capReqifPuces(o){
  return o.vals.filter(v=>v.renseigne&&!v.role&&v.nom!=='ReqIF.ForeignID'&&v.genre!=='XHTML'&&v.valeur.length<=40)
    .map(v=>`<span class="rq-puce" title="${capEsc(v.nom)}"><span class="ana-dim">${capEsc(v.nom)}</span> ${capEsc(v.valeur)}</span>`).join('');
}

/**
 * Vue 📑 ReqIF (sous-vue `reqif` de 🔬 Analyses) : 📄 Document (plan numéroté, textes et images, valeurs, relations), ▤ Exigences
 * (tableau des valeurs, colonnes au choix), 🔗 Relations, 🧩 Types, 🖼 Pièces jointes, 🩺 Contrôles.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderReqif(box){
  if(!capReqifDispo()){ box.innerHTML=`<div class="phl-empty">${_L('Lecteur ReqIF absent de cette version.')}</div>`; return; }
  const lec=capReqifLec();
  if(!lec){ box.innerHTML=`<div class="phl-empty">${_L('Le modèle affiché n\'est pas un fichier ReqIF : ouvrez un .reqif, une archive .reqifz (avec ses images) ou un dossier qui en contient.')}</div>`; return; }
  const st=_capRq, esc=capEsc, Q=capReqifObjets(), q=(st.q||'').trim().toLowerCase();
  if(_capRqGo){ const o=Q.byId[_capRqGo]; if(o){ st.view='doc'; st.spec=o.spec; st.q=''; st.cible=o.id; } _capRqGo=null; }
  if(st.spec&&!Q.specs.some(s=>s.id===st.spec)&&st.spec!=='§hors') st.spec='';
  const vues=[['doc',_L('📄 Document')],['tab',_L('▤ Exigences')],['rel',_L('🔗 Relations')],['types',_L('🧩 Types')],['pieces',_L('🖼 Pièces jointes')],['chk',_L('🩺 Contrôles')]];
  const nav=`<span class="tb-grp">${vues.map(([k,l])=>`<button class="cap-lf-btn${st.view===k?' active':''}" data-xv="${k}">${l}</button>`).join('')}</span>`;
  const hors=Q.list.filter(o=>!o.spec);
  const specSel=`<select data-xs="spec" class="phl-filter-input" title="${_L('Spécification montrée')}"><option value="">${_L('Toutes les spécifications')}</option>${Q.specs.map(s=>`<option value="${esc(s.id)}"${st.spec===s.id?' selected':''}>${esc(s.nom)} (${s.n})</option>`).join('')}${hors.length?`<option value="§hors"${st.spec==='§hors'?' selected':''}>${_L('Hors spécification')} (${hors.length})</option>`:''}</select>`;
  const filtre=o=>(!st.spec||(st.spec==='§hors'?!o.spec:o.spec===st.spec))&&(!st.type||o.e.typeReqif===st.type)&&capXtHas(q, o.e.identifiant, o.e.libelle, o.e.texte, o.numero, ...o.vals.map(v=>v.valeur));
  const types=[...new Set(Q.list.map(o=>o.e.typeReqif).filter(Boolean))].sort();
  const typeSel=types.length>1?`<select data-xs="type" class="phl-filter-input" title="${_L('Type d\'objet ReqIF')}"><option value="">${_L('Tous les types')}</option>${types.map(t=>`<option${st.type===t?' selected':''}>${esc(t)}</option>`).join('')}</select>`:'';
  const docs=lec.documents.map(d=>`${esc(d.titre||d.chemin)}${d.outil?` <span class="ana-dim">· ${esc(d.outil)}</span>`:''}${d.version?` <span class="ana-dim">· ReqIF ${esc(d.version)}</span>`:''}`).join(' — ');
  let body='', header=[], rows=[], cnt='', bar='';
  if(st.view==='doc'||st.view==='tab'){
    const shown=Q.list.filter(filtre); cnt=_L(`${shown.filter(o=>!o.titre).length} exigence(s), ${shown.filter(o=>o.titre).length} titre(s)`);
    bar=capXtBar(specSel+typeSel+capXtSearch(st.q, _L('Identifiant, texte, valeur…'))+(st.view==='doc'?`<label class="dos-opt" title="${_L('Valeurs des attributs sous chaque exigence')}"><input type="checkbox" data-xc="attrs"${st.attrs?' checked':''}> ${_L('Valeurs')}</label>`:''), cnt);
    const colsDispo=Q.attrs;
    if(!st.cols) st.cols=colsDispo.slice(0,6);
    const cols=st.cols.filter(c=>colsDispo.includes(c));
    header=[_L('N°'), _L('Identifiant'), _L('Nom'), _L('Texte'), _L('Type'), _L('Spécification'), ...cols, _L('Relations sortantes'), _L('Relations entrantes')];
    rows=shown.map(o=>{ const val=n=>(o.vals.find(v=>v.nom===n)||{}).valeur||'';
      return [o.numero, o.e.identifiant, capCx(o.e.libelle, o.id), o.e.texte, o.e.typeReqif, o.specNom, ...cols.map(val),
        capCxList(o.out.map(r=>({id:r.tgt, name:r.rel+' → '+capReqifNom(lec.element(r.tgt))}))), capCxList(o.in.map(r=>({id:r.src, name:r.rel+' ← '+capReqifNom(lec.element(r.src))})))]; });
    if(st.view==='doc'){
      const bloc=o=>{
        const marge=Math.min(o.niveau,8)*14, txt=o.e.description?capReqifTexteHtml(o.id):'';
        const rels=[...o.out.map(r=>`<span class="rq-rel">→ ${esc(r.rel)} ${capReqifLien(r.tgt)}</span>`), ...o.in.map(r=>`<span class="rq-rel">← ${esc(r.rel)} ${capReqifLien(r.src)}</span>`)].join('');
        if(o.titre) return `<div class="rq-bloc rq-titre${st.cible===o.id?' rq-cible':''}" data-rq="${esc(o.id)}" style="margin-left:${marge}px"><span class="rq-num">${esc(o.numero)}</span> <span class="cap-tbl-link" onclick="capOpenDetailById('${esc(o.id)}')">${esc(o.e.libelle)}</span>${txt?`<div class="rq-txt cap-desc">${txt}</div>`:''}</div>`;
        return `<div class="rq-bloc${st.cible===o.id?' rq-cible':''}" data-rq="${esc(o.id)}" style="margin-left:${marge}px"><div class="rq-tete"><span class="rq-num">${esc(o.numero)}</span>`+
          `${o.e.identifiant?`<b class="rq-id">${esc(o.e.identifiant)}</b>`:''}<span class="cap-tbl-link" onclick="capOpenDetailById('${esc(o.id)}')">${esc(o.e.nom||(o.e.identifiant?'':o.e.libelle))}</span>`+
          `${o.e.typeReqif?`<span class="rq-type">${esc(o.e.typeReqif)}</span>`:''}${o.e.images?`<span class="ana-dim" title="${_L('Images dans le texte')}">🖼 ${o.e.images}</span>`:''}</div>`+
          `${txt?`<div class="rq-txt cap-desc">${txt}</div>`:o.e.texte?'':`<div class="rq-txt ana-dim">${_L('(sans texte)')}</div>`}`+
          `${st.attrs?`<div class="rq-puces">${capReqifPuces(o)}${rels}</div>`:rels?`<div class="rq-puces">${rels}</div>`:''}</div>`;
      };
      // Plan à gauche (titres), document à droite (par pages de 200 objets)
      // Toutes les spécifications : le nom de chacune en tête de ses objets (dans le plan et dans le document)
      const plusieurs=!st.spec&&new Set(shown.map(o=>o.spec)).size>1, specNom=o=>o.spec?o.specNom:_L('Hors spécification');
      const enTete=(o,i)=>plusieurs&&(i===0||shown[i-1].spec!==o.spec);
      const plan=shown.map((o,i)=>(enTete(o,i)?`<div class="rq-plan-s">${esc(specNom(o))}</div>`:'')+(o.titre?`<div class="rq-plan-i" data-rqgo="${esc(o.id)}" style="padding-left:${4+Math.min(o.niveau,6)*10}px" title="${esc(o.e.libelle)}">${esc(o.numero)} ${esc(o.e.libelle)}</div>`:'')).join('');
      const rendu=(o,i)=>(enTete(o,i)?`<div class="rq-spec-h">▤ ${esc(specNom(o))}</div>`:'')+bloc(o);
      body=`<div class="rq-doc-h">${docs}</div><div class="rq-doc">${/rq-plan-i/.test(plan)?`<nav class="rq-plan" data-fill="6">${plan}</nav>`:''}<div class="rq-corps" data-fill="6">${shown.length?capPaged(shown,{render:rendu}):`<div class="phl-empty">${_L('Aucun objet ne correspond aux filtres.')}</div>`}</div></div>`;
    } else {
      const versTab=`<button class="cap-lf-btn" data-rqtab title="${_L('Les mêmes exigences dans un onglet du ▤ Tableau : tri, filtres par colonne, export Excel')}">▤ ${_L('Ouvrir dans ▤ Tableau')}</button>`;
      const choix=versTab+`<details class="rq-cols"><summary class="cap-lf-btn">${_L('Colonnes')} (${cols.length}/${colsDispo.length})</summary><div class="rq-cols-l">${colsDispo.map(c=>`<label><input type="checkbox" data-rqcol="${esc(c)}"${cols.includes(c)?' checked':''}> ${esc(c)}</label>`).join('')}</div></details>`;
      const ligne=o=>`<tr><td class="ana-dim">${esc(o.numero)}</td><td><b>${esc(o.e.identifiant||'')}</b></td><td>${o.titre?'<b>§</b> ':''}<span class="cap-tbl-link" onclick="capOpenDetailById('${esc(o.id)}')">${esc(o.e.nom||o.e.libelle)}</span></td>`+
        `<td><div class="rq-cell cap-desc">${o.e.description?capReqifTexteHtml(o.id):''}</div></td><td>${esc(o.e.typeReqif)}</td><td class="ana-dim">${esc(o.specNom)}</td>`+
        cols.map(c=>`<td>${esc((o.vals.find(v=>v.nom===c)||{}).valeur||'')}</td>`).join('')+
        `<td>${o.out.map(r=>`<div>${esc(r.rel)} → ${capReqifLien(r.tgt)}</div>`).join('')}</td><td>${o.in.map(r=>`<div>${esc(r.rel)} ← ${capReqifLien(r.src)}</div>`).join('')}</td></tr>`;
      body=choix+capPaged(shown,{render:ligne, open:`<table class="ana-t rq-t"><thead><tr>${header.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody class="cap-pg-body">`, close:'</tbody></table>'});
    }
  } else if(st.view==='rel'){
    const parType={}; Q.rels.forEach(r=>{ parType[r.rel]=(parType[r.rel]||0)+1; });
    const shown=Q.rels.filter(r=>(!st.rel||r.rel===st.rel)&&capXtHas(q, r.rel, capReqifNom(lec.element(r.src)), capReqifNom(lec.element(r.tgt))));
    cnt=_L(`${shown.length} relation(s)`);
    bar=capXtBar(`<span class="tb-grp">${[['',_L('Toutes'),Q.rels.length],...Object.entries(parType).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k,k,n])].map(([k,l,n])=>`<button class="cap-lf-btn${st.rel===k?' active':''}" data-rqrel="${esc(k)}">${esc(l)} <span class="ana-dim">${n}</span></button>`).join('')}</span>`+capXtSearch(st.q, _L('Type, source, cible…')), cnt);
    header=[_L('Relation'), _L('Source'), _L('Cible'), _L('Attributs de la relation')];
    const at=r=>r.via?lec.attributs(r.via).filter(v=>v.renseigne).map(v=>v.nom+' : '+v.valeur).join(' ; '):'';
    rows=shown.map(r=>[r.rel, capCx(capReqifNom(lec.element(r.src)), r.src), capCx(capReqifNom(lec.element(r.tgt)), r.tgt), at(r)]);
    body=Q.rels.length?capPaged(shown,{render:r=>`<tr><td>${esc(r.rel)}</td><td>${capReqifLien(r.src)}</td><td>${capReqifLien(r.tgt)}</td><td class="ana-dim">${esc(at(r))}</td></tr>`,
      open:`<table class="ana-t"><thead><tr>${header.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody class="cap-pg-body">`, close:'</tbody></table>'}):`<div class="phl-empty">${_L('Aucune relation (SPEC-RELATION) dans ce fichier.')}</div>`;
  } else if(st.view==='types'){
    const T=lec.types(), sortes={'SPEC-OBJECT-TYPE':_L('Objets'), 'SPECIFICATION-TYPE':_L('Spécifications'), 'SPEC-RELATION-TYPE':_L('Relations'), 'RELATION-GROUP-TYPE':_L('Groupes de relations')};
    bar=capXtBar('', _L(`${T.length} type(s)`));
    header=[_L('Type'), _L('Sorte'), _L('Éléments'), _L('Attributs')];
    rows=T.map(t=>[capCx(t.nom, t.id), sortes[t.sorte]||t.sorte, t.nombre, t.attributs.map(a=>a.nom+' ('+a.genre+')').join(', ')]);
    body=`<table class="ana-t"><thead><tr>${header.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${T.map(t=>`<tr><td>${capReqifLien(t.id)}</td><td>${esc(sortes[t.sorte]||t.sorte)}</td><td>${t.nombre}</td>`+
      `<td>${t.attributs.map(a=>`<span class="rq-puce"><b>${esc(a.nom)}</b> <span class="ana-dim">${esc(a.genre)}</span></span>`).join(' ')}</td></tr>`).join('')}</tbody></table>`;
  } else if(st.view==='pieces'){
    const cites={};
    Q.list.forEach(o=>{ (lec.html(o.id,{images:'marque'}).match(/data-reqif(?:-piece)?="([^"]+)"/g)||[]).forEach(m=>{ const c=m.replace(/^[^"]*"|"$/g,''), p=lec.image(c), k=p?p.chemin:c; (cites[k]=cites[k]||[]).push(o.id); }); });
    const absentes=Object.keys(cites).filter(c=>!lec.image(c));
    cnt=_L(`${lec.fichiers.length} pièce(s) jointe(s), ${absentes.length} absente(s)`);
    bar=capXtBar('', cnt);
    header=[_L('Pièce jointe'), _L('Type'), _L('Taille (octets)'), _L('Citée par')];
    const tous=[...lec.fichiers.map(f=>({chemin:f.chemin, type:f.type, taille:f.taille, absente:false})), ...absentes.map(c=>({chemin:c, type:'', taille:'', absente:true}))];
    rows=tous.map(f=>[f.chemin, f.absente?_L('absente'):f.type||_L('pièce jointe'), f.taille, capCxList((cites[f.chemin]||[]).map(id=>({id, name:capReqifNom(lec.element(id))})))]);
    body=tous.length?`<div class="rq-pieces">${tous.map(f=>{ const src=f.type?capReqifImgSrc(f.chemin):'';
      return `<div class="rq-piece-c${f.absente?' rq-absente':''}"><div class="rq-piece-v">${src?`<img src="${esc(src)}" alt="${esc(f.chemin)}">`:`<span>${f.absente?'🖼':'📎'}</span>`}</div>`+
        `<div class="rq-piece-n" title="${esc(f.chemin)}">${esc(f.chemin.split('/').pop())}</div><div class="ana-dim">${f.absente?_L('absente de l\'archive'):esc(f.type||_L('pièce jointe'))+(f.taille?' · '+Math.ceil(f.taille/1024)+' Ko':'')}</div>`+
        `<div>${(cites[f.chemin]||[]).slice(0,5).map(id=>`<div>${capReqifLien(id)}</div>`).join('')}${(cites[f.chemin]||[]).length>5?`<div class="ana-dim">…</div>`:''}</div></div>`; }).join('')}</div>`
      :`<div class="phl-empty">${lec.documents.length&&!/\.reqifz$/i.test(lec.nom)?_L('Aucune pièce jointe lue : ouvrez l\'archive .reqifz, ou le dossier qui contient le .reqif et ses images.'):_L('Aucune pièce jointe dans ce fichier.')}</div>`;
  } else {
    bar=capXtBar('', '', false);
    body=capDiagHtml(capReqifChecks());
  }
  box.innerHTML=`<div class="phl-filter-bar" style="margin-bottom:6px">${nav}</div>${bar}${body}`;
  capXtBind(box, st, capRenderReqif, ()=>capCsvExport(_L('reqif.csv'), header, rows));
  box.querySelectorAll('[data-rqrel]').forEach(b=>b.onclick=()=>{ st.rel=b.dataset.rqrel; capRenderReqif(box); });
  box.querySelectorAll('[data-rqcol]').forEach(c=>c.onchange=()=>{ const k=c.dataset.rqcol; st.cols=c.checked?[...(st.cols||[]), k]:(st.cols||[]).filter(x=>x!==k); capRenderReqif(box); const d=box.querySelector('.rq-cols'); if(d) d.open=true; });
  box.querySelector('[data-rqtab]')?.addEventListener('click',()=>capReqifVersTableau(st.spec&&st.spec!=='§hors'?st.spec:''));
  box.querySelectorAll('[data-rqgo]').forEach(d=>d.onclick=()=>{ st.cible=d.dataset.rqgo; capReqifAller(box, d.dataset.rqgo); });
  if(typeof capFillHeight==='function') capFillHeight(box);
  if(st.view==='doc'&&st.cible) setTimeout(()=>capReqifAller(box, st.cible),0);
}

/**
 * Fait défiler le document jusqu'à un objet (page de la pagination comprise) et le met en évidence.
 * @param {HTMLElement} box - Conteneur de la vue @param {string} id - Objet
 */
function capReqifAller(box, id){
  let b=box.querySelector(`[data-rq="${CSS.escape(id)}"]`);
  if(!b){ const pg=box.querySelector('.rq-corps .cap-pg'); const st=pg&&_capPg.blocks[pg.dataset.pg];
    if(st){ const i=st.items.findIndex(o=>o.id===id); if(i>=0){ capPgShow(pg, Math.floor(i/st.size)); b=box.querySelector(`[data-rq="${CSS.escape(id)}"]`); } } }
  if(!b) return;
  box.querySelectorAll('.rq-cible').forEach(x=>x.classList.remove('rq-cible')); b.classList.add('rq-cible');
  b.scrollIntoView({block:'center'});
}

/* ── Accueil, tableau de bord ───────────────────────────────────────── */

/** Cases « Fichiers du projet » de l'accueil pour une lecture ReqIF. @returns {string} HTML */
function capReqifCasesAccueil(){
  const lec=capReqifLec(); if(!lec) return '';
  const esc=capEsc, D=capSysmlDiagnostics(), Q=capReqifObjets(), img=lec.fichiers.filter(f=>f.image).length, abs=D.liste.filter(d=>d.code==='RQ-PIECE').length;
  const etat=D.erreurs?'err':D.avertissements?'todo':'ok';
  return capHomeCase(_L('Exigences'), esc(_capSysml.nom||capCurrentFileName||'—'), _L(`${lec.documents.length} fichier(s) · ${Q.specs.length} spécification(s) · ${Q.list.filter(o=>!o.titre).length} exigence(s)`), 'ok',
      `<button type="button" class="cap-lf-btn" data-nav="ana:reqif">${_L('📄 Document')}</button>`)+
    capHomeCase(_L('Pièces jointes'), lec.fichiers.length?_L(`${lec.fichiers.length} pièce(s), dont ${img} image(s)`):_L('Aucune'), abs?_L(`${abs} citée(s) mais absente(s)`):lec.fichiers.length?'':_L('Un .reqif seul ne contient pas les images : ouvrez l\'archive .reqifz ou le dossier.'), abs?'todo':lec.fichiers.length?'ok':'none')+
    capHomeCase(_L('Lecture'), D.erreurs||D.avertissements?_L(`${D.erreurs} erreur(s) · ${D.avertissements} avertissement(s)`):_L('Sans diagnostic'), _L('Diagnostics du lecteur ReqIF'), etat,
      D.liste.length?`<button type="button" class="cap-lf-btn" data-a="sy-diag">${_L('Voir')}</button>`:'');
}

/** Tâches « Que voulez-vous faire ? » de l'accueil pour une lecture ReqIF (même forme que capHomeTaches, 56). @returns {Array[]} */
function capReqifTaches(){
  const D=capSysmlDiagnostics(), Q=capReqifObjets();
  const doc=['📄', _L(`Lire les ${Q.list.filter(o=>!o.titre).length} exigences`), _L('Le document de chaque spécification : chapitres numérotés, textes et images, valeurs des attributs, relations.'), 'ana:reqif', _L('🏗 Architecture › 📑 ReqIF')];
  const excel=['▤', _L('Sortir un tableau Excel'), _L('Une ligne par exigence dans l\'ordre du document, une colonne par attribut ReqIF, textes et images.'), 'a:rq-tab', _L('▤ Tableau › Exigences ReqIF')];
  const matrice=['▦', _L('Croiser les exigences'), _L('Matrice des relations ReqIF (dérive de, raffine…) entre exigences ou spécifications.'), 'matrix', _L('▦ Matrice')];
  const revue=['💬', _L('Faire relire les exigences'), _L('Commentaires sur chaque exigence, dossier de relecture, rapport Word ou HTML.'), '@revue', _L('💬 Revue & documents')];
  const err=D.erreurs?['🔴', _L(`Corriger ${D.erreurs} erreur(s) de lecture`), capEsc((D.liste.find(d=>d.severite==='erreur')||{}).message||''), 'a:sy-diag', _L('📑 ReqIF › 🩺 Contrôles'), 'err', _L('À faire')]
    :['💚', _L('Vérifier les exigences'), _L('Textes manquants, identifiants en double, exigences sans relation, images absentes.'), 'ana:sante', _L('✅ Vérifier › 💚 Santé & contrôles')];
  return D.erreurs?[err, doc, excel, revue, matrice]:[doc, excel, err, revue, matrice];
}

/**
 * Indicateurs 📑 ReqIF du 📐 tableau de bord (vides hors modèle ReqIF).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capReqifDashCatalog(add){
  const G=_L('ReqIF'), Q=()=>capReqifLec()?capReqifObjets():{list:[], specs:[], rels:[]};
  add(G,'rq.n',_L('ReqIF — exigences'),'n',()=>({n:Q().list.filter(o=>!o.titre).length, sub:_L(`${Q().specs.length} spécification(s)`)}));
  add(G,'rq.spec',_L('ReqIF — exigences par spécification'),'series',()=>({cats:Q().specs.map(s=>({l:s.nom, v:Q().list.filter(o=>o.spec===s.id&&!o.titre).length}))}));
  add(G,'rq.rel',_L('ReqIF — relations par type'),'series',()=>{ const m={}; Q().rels.forEach(r=>{ m[r.rel]=(m[r.rel]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l, v}))}; });
  add(G,'rq.diag',_L('ReqIF — diagnostics du lecteur'),'series',()=>{ const D=capReqifLec()?capSysmlDiagnostics():{erreurs:0, avertissements:0}; return {cats:[{l:_L('Erreurs'), v:D.erreurs, c:'#f85149'},{l:_L('Avertissements'), v:D.avertissements, c:'#e3b341'}].filter(c=>c.v)}; },_L('Erreurs et avertissements du lecteur ReqIF d\'Arcature'));
}
