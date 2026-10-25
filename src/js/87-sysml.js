/* ═══════════════════════════════════════════════════════════════════════════
   🧩 SysML v2 : lecture d'un modèle SysML v2 (notation textuelle .sysml, archive .kpar, dossier de .sysml) par le
   lecteur autonome d'Arcature (src/vendor/arcature-lecteur-sysml.js, `window.ArcatureLecteurSysml`, lecture seule,
   hors ligne ; mode d'emploi : docs/SYSML-V2.md). La lecture est convertie en document XML « façon Capella »
   (un élément par élément SysML, `xsi:type="sysml:<métaclasse>"`, références en attributs « #id ») et passée à
   `capApplyXmlDoc` (20) : 🌳 Arborescence, ▦ Cartes, ▤ Tableau, 🔍 Ctrl+K, panneau de détail (références sortantes /
   entrantes), 🗺 Relation Map (liaisons), 💬 Revue et 💾 page fonctionnent sans changement. En plus : vue 🧩 SysML v2
   (sous-vue `sysml` de 🔬 Analyses : éléments, liaisons, 🩺 diagnostics, fichiers), section du panneau de détail
   (déclaration, liaisons, diagnostics, extrait), contrôles 🩺 (diagnostics du lecteur, repris par 💚 Santé), pastille de
   l'accueil, indicateurs du tableau de bord, vues calculées du lecteur dans 🔲 Diagrammes (fin du module). Les vues propres à Capella (fonctions, échanges, chaînes…) sont marquées
   « sans données » (41) pour un modèle SysML.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Lecture SysML affichée : `lecture` (objet du lecteur), `nom` du fichier ou du dossier, `doc` XML produit (celui de `cap_xmlDoc`). */
var _capSysml={lecture:null, nom:'', doc:null};
/** État de la vue 🧩 SysML v2. */
var _capSy={view:'els', q:'', fam:'', type:'', rel:'', fic:''};
/** Vues propres à Capella, sans données pour un modèle SysML v2 (retirées des menus en Essentiel, grisées en Complet). */
const CAP_SY_VUES_CAPELLA=['functions','fex','oav','csys','cblk','compex','physlink','ports','chains','scen',
  'ana:states','ana:caps','ana:data','ana:deploy','ana:trace','ana:xlay','ana:reqs','ana:pvmt','ana:cts','ana:status','ana:cats','ana:rec','ana:libs'];
/** Couleur et trait des relations SysML dans la 🗺 Relation Map (clé RCFG : « sysml:<relation> »). */
const CAP_SY_REL_STYLE={typage:['#58a6ff',''], specialisation:['#a78bfa','6,3'], 'sous-ensemble':['#a78bfa','3,3'], redefinition:['#a78bfa','2,3'],
  composition:['#e3b341',''], reference:['#e3b341','4,3'], connexion:['#3fb950',''], flux:['#3fb950','6,3'], liaison:['#3fb950','3,3'], allocation:['#f0883e','6,3'],
  succession:['#8b949e',''], transition:['#8b949e','6,3'], perform:['#f778ba',''], exhibit:['#f778ba','6,3'], satisfy:['#f85149',''], verify:['#f85149','6,3'],
  sujet:['#d2a8ff','3,3'], acteur:['#d2a8ff','3,3'], inclusion:['#d2a8ff','6,3'], dependance:['#8b949e','3,3'], import:['#6e7681','2,3'], metadonnee:['#6e7681','2,3']};
/** Couleurs des familles d'éléments SysML (STR / BEH / REQ / ORG). */
const CAP_SY_FAM_COULEUR={STR:'#58a6ff', BEH:'#3fb950', REQ:'#e3b341', ORG:'#a78bfa'};

/** Vrai si le lecteur d'Arcature est embarqué dans la page. @returns {boolean} */
function capSysmlDispo(){ return typeof ArcatureLecteurSysml!=='undefined'&&!!ArcatureLecteurSysml&&typeof ArcatureLecteurSysml.lire==='function'; }

/** Vrai si le nom de fichier est un modèle SysML v2 (.sysml, .kpar) que le lecteur sait lire. @param {string} nom - Nom du fichier @returns {boolean} */
function capSysmlReconnait(nom){ return capSysmlDispo()&&ArcatureLecteurSysml.reconnait(String(nom||'')); }

/** Lit un File SysML (.sysml en texte, .kpar en octets). @param {File} f - Fichier @returns {Promise<object>} Lecture du lecteur */
function capSysmlLireFichier(f){
  const L=ArcatureLecteurSysml, binaire=L.binaire(f.name);
  return new Promise((resolve, reject)=>{
    const r=new FileReader();
    r.onerror=()=>reject(new Error(_L(`Impossible de lire « ${f.name} ».`)));
    r.onload=ev=>{ try{ resolve(L.lire(ev.target.result, f.name)); }catch(e){ reject(e); } };
    if(binaire) r.readAsArrayBuffer(f); else r.readAsText(f,'UTF-8');
  });
}

/** Ouvre un fichier SysML v2 (.sysml ou .kpar) à la place du modèle affiché (appelée par `capLoadFile`, 20).
 * @param {File} f - Fichier choisi ou déposé
 * @param {FileSystemFileHandle} [handle] - Accès direct (non utilisé : pas de 🔄 suivi pour SysML)
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté
 */
function capSysmlOuvrir(f, handle, confirme){
  const name=(f&&f.name)||'';
  if(capLoaded&&!confirme){ capReplaceConfirm(name).then(ok=>{ if(ok) capSysmlOuvrir(f, handle, true); else capShowWelcome(false); }); return; }
  capWelcomeStatus(_L(`Chargement de « ${name} »…`),'busy'); capShowWelcome(true);
  capSysmlLireFichier(f).then(lec=>setTimeout(()=>capSysmlAppliquer(lec, name),30))
    .catch(err=>{ capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true); });
}

/** Ouvre plusieurs fichiers .sysml déposés ensemble comme un projet (noms résolus d'un fichier à l'autre).
 * @param {File[]} files - Fichiers .sysml
 * @param {boolean} [confirme] - true : remplacement déjà accepté
 */
function capSysmlOuvrirFichiers(files, confirme){
  const nom=_L(`${files.length} fichiers .sysml`);
  if(capLoaded&&!confirme){ capReplaceConfirm(nom).then(ok=>{ if(ok) capSysmlOuvrirFichiers(files, true); else capShowWelcome(false); }); return; }
  capSysmlOuvrirDossier(files.map(f=>({nom:f.name, chemin:f.webkitRelativePath||f.name, lire:()=>Promise.resolve(f)})), nom, true);
}

/** Ouvre un dossier de projet SysML v2 : tous les .sysml lus ensemble (ou la première archive .kpar s'il n'y a pas de .sysml).
 * Appelée par `capProjectFromFiles` (54) quand le dossier ne contient aucun .capella.
 * @param {{nom:string, chemin:string, lire:function():Promise<File>}[]} fichiers - Fichiers .sysml / .kpar du dossier
 * @param {string} [nom] - Nom du projet affiché (par défaut : dossier commun ou premier fichier)
 * @param {boolean} [confirme] - true : remplacement déjà accepté
 */
async function capSysmlOuvrirDossier(fichiers, nom, confirme){
  if(!capSysmlDispo()){ capWelcomeStatus(_L('Lecteur SysML v2 absent de cette version.'),'err'); return; }
  const sy=fichiers.filter(f=>/\.sysml$/i.test(f.nom)), kp=fichiers.filter(f=>/\.kpar$/i.test(f.nom));
  if(!sy.length&&!kp.length) return;
  if(!sy.length){ const f=await kp[0].lire(); capSysmlOuvrir(f, kp[0].h||null, confirme); return; }
  const dossier=(sy[0].chemin||'').includes('/')?sy[0].chemin.split('/')[0]:'';
  nom=nom||dossier||sy[0].nom;
  if(capLoaded&&!confirme){ if(!(await capReplaceConfirm(nom))){ capShowWelcome(false); return; } }
  capWelcomeStatus(_L(`Chargement de « ${nom} » (${sy.length} fichier(s) .sysml)…`),'busy'); capShowWelcome(true);
  try{
    const textes=[];
    for(const f of sy){ const file=await f.lire(); textes.push({chemin:f.chemin||f.nom, texte:await file.text()}); }
    const lec=ArcatureLecteurSysml.lireDossier(textes, nom);
    setTimeout(()=>capSysmlAppliquer(lec, nom),30);
  }catch(err){ capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true); }
}

/** Remplace le modèle affiché par une lecture SysML v2 : conversion en document XML, pipeline Capella (`capApplyXmlDoc`), accueil.
 * @param {object} lecture - Lecture du lecteur d'Arcature
 * @param {string} nom - Nom du fichier ou du projet
 */
function capSysmlAppliquer(lecture, nom){
  try{
    if(!lecture||!lecture.elements||lecture.elements().length<2) throw new Error(_L('Aucun élément SysML v2 reconnu dans ce fichier'));
    const airdRetire=typeof capDiagAvantNouveauModele==='function'?capDiagAvantNouveauModele():'';   // 🔲 diagrammes d'un ancien modèle Capella
    const doc=capSysmlVersXml(lecture, nom);
    capSysmlTypesHumains(lecture);
    _capSysml={lecture, nom, doc};
    capCurrentView='home';
    if(typeof _capProjetPage!=='undefined') _capProjetPage.nom='';
    capApplyXmlDoc(doc, nom);
    if(typeof _capWatch!=='undefined'&&_capWatch){ _capWatch.handle=null; _capWatch.file=null; if(typeof capWatchUpdateUi==='function') capWatchUpdateUi(); }   // pas de 🔄 suivi d'un .sysml
    capWelcomeStatus('',''); capShowWelcome(false);
    const d=capSysmlDiagnostics();
    if(d.erreurs||d.avertissements) setTimeout(()=>capToast(_L(`🧩 SysML v2 : ${d.erreurs} erreur(s), ${d.avertissements} avertissement(s) — détail dans 🏗 Architecture › 🧩 SysML v2`)),500);
    if(airdRetire&&typeof capWatchFlash==='function') setTimeout(()=>capWatchFlash(_L(`🔲 Diagrammes de l'ancien modèle (« ${airdRetire} ») retirés`)),700);
  }catch(err){
    _capSysml={lecture:null, nom:'', doc:null};
    capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true);
  }
}

/** Oublie la lecture SysML quand un autre document (Capella) est appliqué ; appelée en tête de `capApplyXmlDoc` (20).
 * @param {Document} doc - Document qui va être affiché
 */
function capSysmlAvantModele(doc){ if(_capSysml.lecture&&doc!==_capSysml.doc) _capSysml={lecture:null, nom:'', doc:null}; _capSyVues.cle=''; _capSyVues.sel=''; }

/** Convertit une lecture SysML v2 en document XML « façon Capella » : un élément XML par élément SysML, imbriqué comme dans le modèle,
 * `xsi:type="sysml:<métaclasse>"`, attributs littéraux (nom, déclaration, mot-clé, famille, visibilité, direction, multiplicité, valeur,
 * documentation → description, fichier, ligne…) et références en attributs « #id » (typedBy, specializes, source, target, extremites…),
 * que le panneau de détail, le ▤ Tableau et la 🗺 Relation Map résolvent comme celles d'un .capella.
 * @param {object} lec - Lecture
 * @param {string} nom - Nom du modèle (racine)
 * @returns {Document} Document XML
 */
function capSysmlVersXml(lec, nom){
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const els=lec.elements(), byId={}; els.forEach(e=>{ byId[e.id]=e; });
  const racines=els.filter(e=>!e.proprietaire||!byId[e.proprietaire]);
  const attrs=e=>{
    const a={name:e.nom||e.libelle||e.fichier||e.motCle||e.type};
    if(e.motCle) a.motCle=e.motCle;
    if(e.nomQualifie) a.nomQualifie=e.nomQualifie;
    if(e.nomCourt) a.nomCourt=e.nomCourt;
    if(e.declaration) a.declaration=e.declaration;
    if(e.famille) a.famille=e.famille;
    a.nature=e.definition?'definition':e.usage?'usage':(e.racine?'racine':'');
    if(!a.nature) delete a.nature;
    if(e.visibilite&&e.visibilite!=='public') a.visibilite=e.visibilite;
    if(e.modificateurs&&e.modificateurs.length) a.modificateurs=e.modificateurs.join(' ');
    if(e.direction) a.direction=e.direction;
    if(e.multiplicite) a.multiplicite=e.multiplicite;
    if(e.valeur) a.valeur=e.valeur;
    if(e.conjugue) a.conjugue='true';
    if(e.role) a.role=e.role;
    if(e.declencheur) a.declencheur=e.declencheur;
    if(e.garde) a.garde=e.garde;
    if(e.effet) a.effet=e.effet;
    if(e.expression) a.expression=e.expression;
    if(e.documentation) a.description=capEsc(e.documentation).replace(/\r?\n/g,'<br>');   // la description Capella est du HTML : texte échappé
    if(e.technique) a.technique='true';
    if(e.anonyme) a.anonyme='true';
    if(e.fichier) a.fichier=e.fichier;
    if(e.ligne) a.ligne=String(e.ligne);
    if(e.bibliotheque&&e.bibliotheque.length) a.bibliotheque=e.bibliotheque.join(' ');
    if(e.metadonnees&&e.metadonnees.length) a.metadonnees=e.metadonnees.join(' ');
    Object.entries(e.references||{}).forEach(([k,ids])=>{ const l=(ids||[]).filter(i=>i&&byId[i]); if(l.length) a[k]=l.map(i=>'#'+i).join(' '); });
    const ex=(e.extremites||[]).filter(i=>i&&byId[i]); if(ex.length) a.extremites=ex.map(i=>'#'+i).join(' ');
    return a;
  };
  const out=[], vus=new Set();
  const ecrire=(e, prof)=>{
    if(vus.has(e.id)||prof>400) return; vus.add(e.id);
    const a=attrs(e), kids=(e.enfants||[]).map(i=>byId[i]).filter(Boolean);
    out.push(`<ownedElements xsi:type="sysml:${esc(e.type||'Element')}" id="${esc(e.id)}"${Object.entries(a).map(([k,v])=>` ${k}="${esc(v)}"`).join('')}${kids.length?'>':'/>'}`);
    if(kids.length){ kids.forEach(k=>ecrire(k, prof+1)); out.push('</ownedElements>'); }
  };
  racines.forEach(e=>ecrire(e,0));
  els.forEach(e=>{ if(!vus.has(e.id)) ecrire(e,0); });   // éléments dont le propriétaire a été écarté : au premier niveau
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<sysml:Model xmlns:sysml="urn:arcalyse:sysml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${esc(nom)}" lecteur="ArcatureLecteurSysml ${esc(ArcatureLecteurSysml.version||'')}">\n${out.join('\n')}\n</sysml:Model>`;
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error(_L('Conversion SysML v2 → XML impossible'));
  return doc;
}

/** Complète le registre des types (noms lisibles `CAP_HUMAN_NAMES`, types techniques `CAP_TECHNICAL_TYPES`) avec les métaclasses SysML rencontrées.
 * @param {object} lec - Lecture
 */
function capSysmlTypesHumains(lec){
  const L=ArcatureLecteurSysml, tech={}, types=new Set();
  lec.elements().forEach(e=>{ types.add(e.type); const t=tech[e.type]||(tech[e.type]={oui:0, non:0}); if(e.technique) t.oui++; else t.non++; });
  types.forEach(t=>{
    if(!CAP_HUMAN_NAMES[t]){ const mc=L.motCle?L.motCle(t):''; CAP_HUMAN_NAMES[t]={h:t.replace(/([a-z])([A-Z])/g,'$1 $2')+(mc?' ('+mc+')':''), d:_L('Métaclasse SysML v2')+(mc?_L(` — mot-clé « ${mc} »`):'')}; }
    if(tech[t].oui&&!tech[t].non) CAP_TECHNICAL_TYPES.add(t);   // imports, successions, commentaires… décochés par défaut
  });
}

/** Élément SysML (objet du lecteur) d'un identifiant, ou null. @param {string} id - Identifiant @returns {object|null} */
function capSyEl(id){ return _capSysml.lecture?_capSysml.lecture.element(id):null; }

/** Libellé affichable d'un élément SysML. @param {object} e - Élément du lecteur @returns {string} */
function capSyNom(e){ return e?(e.nom||e.libelle||e.motCle||e.type):'—'; }

/** Lien cliquable vers un élément SysML (panneau de détail). @param {string} id - Identifiant @returns {string} HTML */
function capSyLien(id){ const e=capSyEl(id); return e?capDetLink(id, capSyNom(e), 'font-weight:600'):'<span class="ana-dim">—</span>'; }

/** Position « fichier:ligne » d'un élément ou d'un diagnostic. @param {object} o - Objet à `fichier` / `ligne` @returns {string} */
function capSyPosition(o){ return o&&o.fichier?o.fichier+(o.ligne?':'+o.ligne:''):(o&&o.ligne?':'+o.ligne:''); }

/** Diagnostics de la lecture affichée. @returns {{liste:object[], erreurs:number, avertissements:number}} */
function capSysmlDiagnostics(){
  const lec=_capSysml.lecture; if(!lec) return {liste:[], erreurs:0, avertissements:0};
  return {liste:lec.diagnostics||[], erreurs:lec.erreurs||0, avertissements:lec.avertissements||0};
}

/** Contrôles 🩺 d'un modèle SysML v2 : diagnostics du lecteur (erreurs ✖, avertissements ⚠), rendus par `capDiagHtml` et repris par
 * 💚 Santé & contrôles (69) et le 🩺 profil (14). Vide sans modèle SysML.
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capSyChecks(){
  if(!_capSysml.lecture) return [];
  const D=capSysmlDiagnostics(), esc=capEsc;
  const row=d=>`<tr><td>${esc(capSyPosition(d))}</td><td><span class="ana-dim" title="${esc(d.regle||'')}">${esc(d.code||d.regle||'')}</span></td><td>${esc(d.message||'')}</td><td>${d.element?capSyLien(d.element):'<span class="ana-dim">—</span>'}</td></tr>`;
  const cols=[_L('Fichier : ligne'),_L('Règle'),_L('Message'),_L('Élément')];
  return [
    {icon:'✖', sev:'err', title:_L('Erreurs SysML v2 (syntaxe, noms introuvables…)'), tip:_L('Diagnostics du lecteur d\'Arcature de gravité erreur : texte non conforme à la grammaire, référence vers un nom introuvable…'), cols,
      items:D.liste.filter(d=>d.severite==='erreur').map(row)},
    {icon:'⚠', title:_L('Avertissements SysML v2'), tip:_L('Diagnostics du lecteur d\'Arcature de gravité avertissement : visibilité d\'un import absente, usage sans type…'), cols,
      items:D.liste.filter(d=>d.severite!=='erreur').map(row)}
  ];
}

/** Toutes les liaisons de la lecture, chacune une fois. @returns {{relation:string, source:string, cible:string, via:?string}[]} */
function capSysmlLiaisons(){ const lec=_capSysml.lecture; try{ return lec?lec.toutesLiaisons():[]; }catch(e){ return []; } }

/** Libellé d'une relation SysML vue de la source (lecteur, sinon la clé). @param {string} rel - Relation @returns {string} */
function capSyRelLibelle(rel){ try{ return ArcatureLecteurSysml.libelleRelation(rel,'sortant')||rel; }catch(e){ return rel; } }

/** Déclare les relations SysML comme critères de la 🗺 Relation Map (`RCFG`, clé « sysml:<relation> ») ; appelée par
 * `capInjectCapellaRelsToCriteria` (20). Sans modèle SysML : rien. */
function capSysmlCriteres(){
  if(!_capSysml.lecture) return;
  const presentes=new Set(capSysmlLiaisons().map(l=>l.relation));
  presentes.forEach(rel=>{
    const key='sysml:'+rel, st=CAP_SY_REL_STYLE[rel]||['#8b949e',''];
    if(!RCFG[key]) RCFG[key]={color:st[0], dash:st[1], open:false, diamond:rel==='composition', hollowDiamond:rel==='reference', circle:false, noArrow:false, _capella:true, label:''};
    RCFG[key].label=_L('SysML — ')+capSyRelLibelle(rel);
    if(!(key in S.relF)) S.relF[key]=['typage','composition','connexion','specialisation','allocation','satisfy'].includes(rel);   // les plus parlantes affichées d'emblée
  });
}

/** Relations SysML à injecter dans `MODEL.relations` (🗺 Relation Map), appelées par `capInjectLinksToModel` (20).
 * @returns {{src:string, tgt:string, type:string}[]} Relations (type = clé RCFG)
 */
function capSysmlLiensModel(){
  if(!_capSysml.lecture) return [];
  return capSysmlLiaisons().filter(l=>l.source&&l.cible).map(l=>({src:l.source, tgt:l.cible, type:'sysml:'+l.relation}));
}

/** Pastille 🧩 SysML v2 de l'en-tête de 🏠 Accueil (nombre d'éléments, erreurs et avertissements du lecteur) ; vide pour un .capella.
 * @returns {string} HTML
 */
function capSysmlPastille(){
  const lec=_capSysml.lecture; if(!lec) return '';
  const D=capSysmlDiagnostics(), n=lec.elements().length-1, nf=(lec.fichiers||[]).length, nv=capSyVuesListe().length;
  const etat=D.erreurs?'err':D.avertissements?'warn':'ok';
  const txt=D.erreurs||D.avertissements?_L(`${D.erreurs} erreur(s) · ${D.avertissements} avertissement(s)`):_L('lu sans diagnostic');
  return `<button type="button" class="hm-pill" data-nav="ana:sysml" title="${_L('🧩 Modèle SysML v2 lu par le lecteur d\'Arcature : éléments, liaisons, diagnostics')}"><i class="${etat}"></i>🧩 ${_L(`SysML v2 : ${n} éléments${nf>1?` · ${nf} fichiers`:''} · ${txt}`)}</button>`+
    `<button type="button" class="hm-pill" data-nav="diag" title="${_L('🔲 Vues calculées depuis le texte (générale, interconnexion, états, flux d\'actions)')}"><i class="${nv?'ok':''}"></i>${_L(`Vues : ${nv}`)}</button>`;
}

/** Vue 🧩 SysML v2 (sous-vue `sysml` de 🔬 Analyses) : éléments (par famille et type), liaisons (par relation), 🩺 diagnostics, fichiers.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderSysml(box){
  const lec=_capSysml.lecture, st=_capSy, esc=capEsc;
  if(!capSysmlDispo()){ box.innerHTML=`<div class="phl-empty">${_L('Lecteur SysML v2 absent de cette version.')}</div>`; return; }
  if(!lec){ box.innerHTML=`<div class="phl-empty">${_L('Le modèle affiché n\'est pas un modèle SysML v2 : ouvrez un fichier .sysml, une archive .kpar ou un dossier de .sysml (📁 Dossier du projet).')}</div>`; return; }
  const L=ArcatureLecteurSysml, q=(st.q||'').trim().toLowerCase(), els=lec.elements().filter(e=>!e.racine&&!e.projet), D=capSysmlDiagnostics(), LI=capSysmlLiaisons();
  const fams=L.familles||{STR:'Structure', BEH:'Comportement', REQ:'Exigences & cas', ORG:'Organisation'};
  const puces=(items, cur, key, tout)=>`<span class="tb-grp">`+[['',tout],...items].map(([k,l,n])=>`<button class="cap-lf-btn${cur===k?' active':''}" data-${key}="${esc(k)}">${esc(l)}${n!=null?` <span class="ana-dim">${n}</span>`:''}</button>`).join('')+`</span>`;
  let body='', header=[], rows=[], cnt='', bar='';
  if(st.view==='els'){
    const parFam={}, parType={}; els.forEach(e=>{ parFam[e.famille]=(parFam[e.famille]||0)+1; parType[e.type]=(parType[e.type]||0)+1; });
    const shown=els.filter(e=>(!st.fam||e.famille===st.fam)&&(!st.type||e.type===st.type)&&capXtHas(q, e.nom, e.nomQualifie, e.declaration, e.type, e.motCle, e.fichier));
    header=[_L('Famille'),_L('Type'),_L('Nom'),_L('Nom qualifié'),_L('Déclaration'),_L('Fichier : ligne')];
    rows=shown.map(e=>[fams[e.famille]||e.famille, capAnaHuman(e.type), capCx(capSyNom(e), e.id), e.nomQualifie||'', e.declaration||'', capSyPosition(e)]);
    body=capXtTable(header, shown.map(e=>[`<span style="color:${CAP_SY_FAM_COULEUR[e.famille]||'var(--c-dim)'}">${esc(fams[e.famille]||e.famille||'')}</span>`, `${capIcoType(e.type)} <span class="ana-dim">${esc(e.motCle||capAnaHuman(e.type))}</span>`,
      capDetLink(e.id, capSyNom(e), 'font-weight:600'), `<span class="ana-dim">${esc(e.nomQualifie||'')}</span>`, `<code style="font-size:11px">${esc(capXtShort(e.declaration||'',120))}</code>`, `<span class="ana-dim">${esc(capSyPosition(e))}</span>`]));
    const types=Object.entries(parType).sort((a,b)=>b[1]-a[1]);
    bar=puces(Object.keys(fams).filter(k=>parFam[k]).map(k=>[k, fams[k], parFam[k]]), st.fam, 'syfam', _L('Toutes familles'))+
      ` <select data-xs="type" class="phl-filter-input" title="${_L('Métaclasse')}"><option value="">${_L('Tous types')} (${els.length})</option>${types.map(([t,n])=>`<option value="${esc(t)}"${st.type===t?' selected':''}>${esc(L.motCle?L.motCle(t)||t:t)} · ${esc(t)} (${n})</option>`).join('')}</select> `+
      capXtSearch(st.q, _L('Nom, déclaration, type, fichier…'));
    cnt=`${shown.length} / ${els.length}`;
  } else if(st.view==='lia'){
    const parRel={}; LI.forEach(l=>{ parRel[l.relation]=(parRel[l.relation]||0)+1; });
    const shown=LI.filter(l=>(!st.rel||l.relation===st.rel)&&capXtHas(q, capSyRelLibelle(l.relation), capSyNom(capSyEl(l.source)), capSyNom(capSyEl(l.cible)), l.via?capSyNom(capSyEl(l.via)):''));
    header=[_L('Relation'),_L('Source'),_L('Cible'),_L('Via')];
    rows=shown.map(l=>[capSyRelLibelle(l.relation), capCx(capSyNom(capSyEl(l.source)), l.source), capCx(capSyNom(capSyEl(l.cible)), l.cible), l.via?capCx(capSyNom(capSyEl(l.via)), l.via):'']);
    body=capXtTable(header, shown.map(l=>{ const st2=CAP_SY_REL_STYLE[l.relation]||['var(--c-dim)','']; return [`<span style="color:${st2[0]}">${esc(capSyRelLibelle(l.relation))}</span> <span class="ana-dim">(${esc(l.relation)})</span>`, capSyLien(l.source), capSyLien(l.cible), l.via?capSyLien(l.via):'<span class="ana-dim">—</span>']; }),
      _L('Aucune liaison ne correspond au filtre.'));
    bar=puces(Object.entries(parRel).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k, capSyRelLibelle(k), n]), st.rel, 'syrel', _L('Toutes relations'))+' '+capXtSearch(st.q, _L('Relation, source, cible…'));
    cnt=`${shown.length} / ${LI.length}`;
  } else if(st.view==='diag'){
    body=capDiagHtml(capSyChecks());
  } else {
    const fichiers=lec.fichiers||[], cur=fichiers.find(f=>f.chemin===st.fic)||fichiers[0];
    const nEl=ch=>els.filter(e=>e.fichier===ch).length, nD=ch=>D.liste.filter(d=>d.fichier===ch).length;
    header=[_L('Fichier'),_L('Lignes'),_L('Éléments'),_L('Diagnostics')];
    rows=fichiers.map(f=>[f.chemin, String((f.texte||'').split('\n').length), String(nEl(f.chemin)), String(nD(f.chemin))]);
    const proj=lec.projet?_L(`<p class="ana-help">Projet <b>${esc(lec.projet.nom||'')}</b>${lec.projet.version?` · version ${esc(lec.projet.version)}`:''}${lec.projet.description?` — ${esc(lec.projet.description)}`:''}</p>`):'';
    const lignes=cur?(cur.texte||'').split('\n'):[];
    body=proj+capXtTable(header, fichiers.map(f=>[`<button class="cap-lf-btn${cur===f?' active':''}" data-syfic="${esc(f.chemin)}">📄 ${esc(f.chemin)}</button>`, String((f.texte||'').split('\n').length), String(nEl(f.chemin)), nD(f.chemin)?`<b>${nD(f.chemin)}</b>`:'0']), _L('Aucun fichier.'))+
      (cur?`<h4 style="margin:12px 0 4px">📄 ${esc(cur.chemin)}</h4><pre class="sy-texte">${lignes.map((l,i)=>`<span class="sy-ln">${i+1}</span>${esc(l)}`).join('\n')}</pre>`:'');
    cnt=`${fichiers.length}`;
  }
  const tabs=capXtViewBtns([['els',_L('🧩 Éléments')],['lia',_L('🔗 Liaisons')],['diag',_L(`🩺 Diagnostics${D.liste.length?` (${D.liste.length})`:''}`)],['fic',_L('📄 Fichiers')]], st.view);
  box.innerHTML=capXtBar(tabs+(bar?`<span class="tsep"></span>${bar}`:''), cnt, st.view!=='diag'&&!!rows.length)+body;
  capXtBind(box, st, capRenderSysml, ()=>capCsvExport(_L('sysml-v2.csv'), header, rows));
  box.querySelectorAll('[data-syfam]').forEach(b=>b.onclick=()=>{ st.fam=b.dataset.syfam; capRenderSysml(box); });
  box.querySelectorAll('[data-syrel]').forEach(b=>b.onclick=()=>{ st.rel=b.dataset.syrel; capRenderSysml(box); });
  box.querySelectorAll('[data-syfic]').forEach(b=>b.onclick=()=>{ st.fic=b.dataset.syfic; capRenderSysml(box); });
}

/** Section 🧩 SysML v2 du panneau de détail : déclaration, position, liaisons (cliquables), diagnostics de l'élément, extrait du texte.
 * @param {string} id - Identifiant de l'élément
 * @param {Function} secTitle - Titre de section du panneau (texte, couleur)
 * @returns {string} HTML (vide hors modèle SysML)
 */
function capSyDetail(id, secTitle){
  const lec=_capSysml.lecture, e=lec?lec.element(id):null; if(!e) return '';
  const esc=capEsc, L=ArcatureLecteurSysml, fams=L.familles||{};
  const kv=[[_L('Déclaration'), e.declaration?`<code>${esc(e.declaration)}</code>`:''], [_L('Mot-clé'), e.motCle], [_L('Nom qualifié'), e.nomQualifie], [_L('Famille'), e.famille?`<span style="color:${CAP_SY_FAM_COULEUR[e.famille]||'inherit'}">${esc(fams[e.famille]||e.famille)}</span>`:''],
    [_L('Nature'), e.definition?_L('définition'):e.usage?_L('usage'):''], [_L('Visibilité'), e.visibilite], [_L('Modificateurs'), (e.modificateurs||[]).join(' ')], [_L('Direction'), e.direction], [_L('Multiplicité'), e.multiplicite], [_L('Valeur'), e.valeur],
    [_L('Rôle'), e.role], [_L('Déclencheur'), e.declencheur], [_L('Garde'), e.garde], [_L('Effet'), e.effet], [_L('Expression'), e.expression], [_L('Bibliothèque standard'), (e.bibliotheque||[]).join(', ')], [_L('Métadonnées'), (e.metadonnees||[]).join(', ')],
    [_L('Position'), capSyPosition(e)+(e.ligneFin&&e.ligneFin!==e.ligne?_L(` → ligne ${e.ligneFin}`):'')]].filter(([,v])=>v);
  let h=secTitle(_L('🧩 SysML v2'),'#58a6ff')+`<table class="ana-t ana-kv">${kv.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${/^<(code|span)/.test(String(v))?v:esc(v)}</td></tr>`).join('')}</table>`;
  let lia=[]; try{ lia=lec.liaisons(id)||[]; }catch(err){ lia=[]; }
  if(lia.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Liaisons')}</div><table class="ana-t ana-kv">${lia.map(l=>`<tr><td><span style="color:${(CAP_SY_REL_STYLE[l.relation]||['var(--c-dim)'])[0]}">${esc(l.libelle||l.relation)}</span> ${l.sens==='entrant'?'←':'→'}</td><td>${capSyLien(l.autre)}${l.via?` <span class="ana-dim">${_L('via')} ${capSyLien(l.via)}</span>`:''}</td></tr>`).join('')}</table>`;
  const diags=capSysmlDiagnostics().liste.filter(d=>d.element===id);
  if(diags.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Diagnostics')}</div>`+diags.map(d=>`<div class="sy-diag sy-${d.severite==='erreur'?'err':'warn'}">${d.severite==='erreur'?'✖':'⚠'} ${esc(d.message||'')} <span class="ana-dim">${esc(d.code||d.regle||'')} · ${esc(capSyPosition(d))}</span></div>`).join('');
  let ext=''; try{ ext=lec.extrait(id)||''; }catch(err){ ext=''; }
  if(ext) h+=`<details class="sy-extrait"><summary class="ana-dim" style="font-size:11px;cursor:pointer">${_L('Extrait du texte')}${ext.length>4000?_L(' (début)'):''}</summary><pre class="sy-texte">${esc(ext.slice(0,4000))}</pre></details>`;
  return h;
}

/** Indicateurs 🧩 SysML v2 du 📐 tableau de bord (vides pour un modèle Capella).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capSyDashCatalog(add){
  const G=_L('SysML v2'), fams=()=>(capSysmlDispo()&&ArcatureLecteurSysml.familles)||{};
  const els=()=>_capSysml.lecture?_capSysml.lecture.elements().filter(e=>!e.racine&&!e.projet):[];
  add(G,'sy.n',_L('SysML v2 — éléments'),'n',()=>({n:els().length, sub:_L(`${(_capSysml.lecture&&_capSysml.lecture.fichiers||[]).length} fichier(s)`)}));
  add(G,'sy.fam',_L('SysML v2 — éléments par famille'),'series',()=>{ const m={}; els().forEach(e=>{ m[e.famille]=(m[e.famille]||0)+1; }); return {cats:Object.entries(m).map(([k,v])=>({l:fams()[k]||k, v, c:CAP_SY_FAM_COULEUR[k]})).filter(c=>c.v)}; });
  add(G,'sy.type',_L('SysML v2 — éléments par métaclasse'),'series',()=>{ const m={}; els().forEach(e=>{ m[e.type]=(m[e.type]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>({l:k, v}))}; });
  add(G,'sy.rel',_L('SysML v2 — liaisons par relation'),'series',()=>{ const m={}; capSysmlLiaisons().forEach(l=>{ m[l.relation]=(m[l.relation]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({l:capSyRelLibelle(k), v, c:(CAP_SY_REL_STYLE[k]||[])[0]}))}; });
  add(G,'sy.vues',_L('SysML v2 — vues calculées par genre'),'series',()=>{ const m={}; capSyVuesListe().forEach(v=>{ m[v.libelleGenre]=(m[v.libelleGenre]||0)+1; }); return {cats:Object.entries(m).map(([l,v])=>({l, v}))}; });
  add(G,'sy.diag',_L('SysML v2 — diagnostics du lecteur'),'series',()=>{ const D=capSysmlDiagnostics(); return {cats:[{l:_L('Erreurs'), v:D.erreurs, c:'#f85149'},{l:_L('Avertissements'), v:D.avertissements, c:'#e3b341'}].filter(c=>c.v)}; },_L('Erreurs et avertissements du lecteur SysML v2 d\'Arcature'));
}

/* ── 🖼 Vues calculées (SysML v2 n'a pas de fichier de diagrammes : le lecteur les calcule et les dispose depuis le texte) ──
   Liste dans 🔲 Diagrammes (à la place de la visionneuse Capella quand le modèle est SysML) : groupes par genre repliables,
   largeur réglable, icône par genre `capSyVueIco`, ▣ carte sous l'explorateur ou dans la vue (comme pour un diagramme Capella) ; vues d'un élément dans son
   panneau de détail (onglet 🔲) ; présentation visuelle (SVG du lecteur, thème clair / sombre d'Arcalyse, clic sur une forme ou
   un lien → panneau de détail par `data-sem`, déplacement à la main, Ctrl+molette, zoom, 📝 notes de revue posées comme sur un
   diagramme Capella : 55) ou textuelle (`vue.texte` coloré, taille du texte par Ctrl+molette), exports SVG et texte. */

/** État de la vue 🔲 pour un modèle SysML : vue ouverte, mode visuel / texte, zoom (0 = ajusté), taille du texte, filtre, élément
 * mis en évidence, genres repliés, largeur de la liste, ▣ carte (`panneau` sous l'explorateur, repliable `carteReduite`, ou
 * `diagramme` dans la vue, affichée `carteVue`), défilements à rétablir après un rendu (liste, vue). */
var _capSyVues={cle:'', mode:'visuel', zoom:0, texteZoom:1, q:'', sel:'', plis:{}, largeur:260, carte:'panneau', carteReduite:false, carteVue:true, listeDefil:0};

/** Icône d'un genre de vue calculée (GV vue générale, IV interconnexion, STV états, AFV flux d'actions), dessinée comme les
 * icônes des diagrammes Capella de la visionneuse (SVG 16 × 16, classe `ico`), couleur de la famille du genre (STR / BEH).
 * @param {string} genre - Genre (`generale`, `interconnexion`, `etats`, `actions`)
 * @param {number} [taille] - Côté en pixels (14 par défaut)
 * @returns {string} SVG, ou '' pour un genre inconnu
 */
function capSyVueIco(genre, taille){
  const G=(capSysmlDispo()&&ArcatureLecteurSysml.genresVues||{})[genre], fam=(G&&G.famille)||{generale:'STR', interconnexion:'STR', etats:'BEH', actions:'BEH'}[genre];
  if(!fam) return '';
  const [s, f]=CAP_SY_ICO_COULEUR[fam]||CAP_SY_ICO_COULEUR.ORG, n=taille||14;
  const corps={
    generale:`<rect x="1.5" y="2" width="13" height="12" rx="1" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M1.5 6H14.5" stroke="${s}" stroke-width="1.2"/><path d="M4 9H10M4 11.5H8" stroke="${s}" stroke-width="1.1" stroke-linecap="round"/>`,
    interconnexion:`<rect x="1" y="3.5" width="5.5" height="9" rx="1" fill="${f}" stroke="${s}" stroke-width="1.2"/><rect x="9.5" y="3.5" width="5.5" height="9" rx="1" fill="${f}" stroke="${s}" stroke-width="1.2"/><rect x="5.3" y="6.8" width="2.4" height="2.4" fill="#fff" stroke="${s}" stroke-width="1"/><rect x="8.3" y="6.8" width="2.4" height="2.4" fill="#fff" stroke="${s}" stroke-width="1"/><path d="M7.7 8H8.3" stroke="${s}" stroke-width="1.4"/>`,
    etats:`<rect x="1" y="1.5" width="8" height="5.5" rx="2.5" fill="${f}" stroke="${s}" stroke-width="1.2"/><rect x="7" y="9" width="8" height="5.5" rx="2.5" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M4.5 7V11.5H6.2" fill="none" stroke="${s}" stroke-width="1.2"/><path d="M5.6 9.9L7.4 11.5L5.6 13.1Z" fill="${s}"/>`,
    actions:`<circle cx="8" cy="2.6" r="1.8" fill="${s}"/><rect x="2.5" y="5.5" width="11" height="5" rx="2.5" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M8 4.4V5.5M8 10.5V13" stroke="${s}" stroke-width="1.2"/><circle cx="8" cy="13.5" r="1.9" fill="none" stroke="${s}" stroke-width="1.1"/><circle cx="8" cy="13.5" r=".9" fill="${s}"/>`
  }[genre]||`<rect x="1.5" y="2" width="13" height="12" rx="1" fill="${f}" stroke="${s}" stroke-width="1.2"/>`;
  return `<svg class="ico" viewBox="0 0 16 16" width="${n}" height="${n}" aria-hidden="true" stroke-linejoin="round">${corps}</svg>`;
}

/** Vues calculées du modèle affiché (liste des diagrammes), gardées avec la lecture. @returns {object[]} [{cle, genre, sigle, libelleGenre, nom, element}] */
function capSyVuesListe(){
  const lec=_capSysml.lecture; if(!lec||typeof lec.vues!=='function') return [];
  if(!_capSysml.vues){ try{ _capSysml.vues=lec.vues()||[]; }catch(e){ console.warn('SysML : vues',e); _capSysml.vues=[]; } }
  return _capSysml.vues;
}

/** Une vue calculée complète (formes, liens, SVG, texte), calculée une fois par lecture. @param {string} cle - Clé de la vue @returns {object|null} */
function capSyVue(cle){
  const lec=_capSysml.lecture; if(!lec||!cle||typeof lec.vue!=='function') return null;
  const c=_capSysml.vueCache||(_capSysml.vueCache={});
  if(!(cle in c)){ try{ c[cle]=lec.vue(cle)||null; }catch(e){ console.warn('SysML : vue',cle,e); c[cle]=null; } }
  return c[cle];
}

/** Vues calculées proposées sur un élément. @param {string} id - Identifiant @returns {object[]} */
function capSyVuesPour(id){ const lec=_capSysml.lecture; if(!lec||typeof lec.vuesPour!=='function') return []; try{ return lec.vuesPour(id)||[]; }catch(e){ return []; } }

/** Vues SysML présentées comme des représentations pour la 🔍 palette Ctrl+K (67) et 💬 Revue : uid « sy:<clé> ». @returns {object[]} */
function capSyVuesReps(){ return capSyVuesListe().map(v=>({uid:'sy:'+v.cle, nom:v.nom, type:v.libelleGenre, sigle:v.sigle, genre:v.genre, couche:''})); }

/** Thème des SVG du lecteur selon celui d'Arcalyse. @returns {'clair'|'sombre'} */
function capSyTheme(){ return typeof capIsLight==='function'&&capIsLight()?'clair':'sombre'; }

/** Restreint la feuille de styles des vues du lecteur (écrite pour un document SVG autonome : règles `svg{…}`, `[data-sem]`…)
 * aux dessins de la vue 🔲 : les sélecteurs commençant par `svg` ne visent plus que `svg.sy-vue-svg` et `svg.sy-carte-svg`, les
 * autres sont préfixés par `.sy-vues` ; les blocs `@media` sont traités de même, les autres `@…` gardés tels quels. Sans cela, la
 * règle `svg{width:100%;height:100%}` du lecteur s'appliquait à toutes les icônes et légendes de la page.
 * @param {string} css - Feuille du lecteur (`ArcatureLecteurSysml.svgCss`)
 * @returns {string} Feuille restreinte
 */
function capSyCssPortee(css){
  const pref=sel=>sel.split(',').map(s=>{ s=s.trim(); if(!s) return ''; return /^svg(?![\w-])/.test(s)?['svg.sy-vue-svg','svg.sy-carte-svg'].map(r=>r+s.slice(3)).join(','):'.sy-vues '+s; }).filter(Boolean).join(',');
  let out='', i=0; const n=css.length;
  while(i<n){
    const a=css.indexOf('{',i); if(a<0) break;
    const sel=css.slice(i,a).trim();
    if(sel[0]==='@'){   // bloc imbriqué : fin trouvée par profondeur
      let d=1, j=a+1; while(j<n&&d){ if(css[j]==='{') d++; else if(css[j]==='}') d--; j++; }
      const corps=css.slice(a+1,j-1);
      out+=sel+'{'+(/^@(media|supports|container)\b/.test(sel)?capSyCssPortee(corps):corps)+'}'; i=j;
    } else { const b=css.indexOf('}',a); if(b<0) break; out+=pref(sel)+'{'+css.slice(a+1,b)+'}'; i=b+1; }
  }
  return out;
}

/** Pose une fois la feuille de styles des vues du lecteur dans la page (`ArcatureLecteurSysml.svgCss`, restreinte par `capSyCssPortee`). */
function capSyVuesCss(){
  if(document.getElementById('sy-svg-css')||!capSysmlDispo()||!ArcatureLecteurSysml.svgCss) return;
  const st=document.createElement('style'); st.id='sy-svg-css'; st.textContent=capSyCssPortee(ArcatureLecteurSysml.svgCss); document.head.appendChild(st);
}

/** Change le thème des SVG affichés quand celui d'Arcalyse change (appelée par `applyTheme`, 02). */
function capSyVuesTheme(){ const th=capSyTheme(); document.querySelectorAll('svg.sy-vue-svg, svg.sy-carte-svg').forEach(s=>{ s.classList.remove('clair','sombre'); s.classList.add(th); }); }

/** Ouvre une vue calculée dans 🔲 Diagrammes (depuis le panneau de détail, la 🔍 palette, 💬 Revue, la liste).
 * @param {string} cle - Clé de la vue
 * @param {string} [id] - Élément à mettre en évidence
 */
function capSyVueOuvrir(cle, id){
  _capSyVues.cle=cle; _capSyVues.sel=id||'';
  if(capCurrentView!=='diag') capNavOpen('diag');
  const box=document.getElementById('cap-view-diag'); if(box&&box.offsetParent!==null) capSyVuesRender(box);
}

/** Contexte de la vue SysML affichée pour les notes de 💬 Revue (55) : identifiant « sy:<clé> », nom, SVG, zone qui porte le calque.
 * @returns {{uid:string, nom:string, svg:SVGSVGElement, zone:HTMLElement, vis:HTMLElement}|null} null si aucune vue SysML n'est affichée en visuel ; `vis` : conteneur défilant (partie visible)
 */
function capSyRevCtx(){
  if(!_capSysml.lecture||!_capSyVues.cle) return null;
  const v=document.getElementById('cap-sy-vues'); if(!v||v.style.display==='none'||!v.offsetParent) return null;
  const svg=v.querySelector('svg.sy-vue-svg'), zone=v.querySelector('.sy-vue-cadre'); if(!svg||!zone) return null;
  const vue=capSyVue(_capSyVues.cle);
  return {uid:'sy:'+_capSyVues.cle, nom:vue?vue.nom:'', svg, zone, vis:zone.closest('.sy-vue-hote')||zone};
}

/** Rendu textuel d'une vue coloré pour la lecture : titre, sections, « mots-clés », noms, types, compartiments, liens « a → b [genre] ».
 * @param {string} texte - `vue.texte` du lecteur
 * @returns {string} HTML (texte échappé, balises <span class="sy-tk-…">)
 */
function capSyTexteHtml(texte){
  const esc=capEsc, lignes=String(texte||'').split('\n');
  const nomType=s=>{   // « nom : Type [n] » → nom en gras, type coloré, multiplicité atténuée
    const m=/^(.*?)(\s*:\s*)([^\[]*?)(\s*\[[^\]]*\])?\s*$/.exec(s);
    if(!m||!m[3].trim()) return `<span class="sy-tk-nom">${esc(s)}</span>`;
    return `<span class="sy-tk-nom">${esc(m[1])}</span><span class="sy-tk-dim">${esc(m[2])}</span><span class="sy-tk-type">${esc(m[3])}</span>${m[4]?`<span class="sy-tk-dim">${esc(m[4])}</span>`:''}`;
  };
  return lignes.map((l,i)=>{
    if(i===0) return `<span class="sy-tk-titre">${esc(l)}</span>`;
    const ind=(l.match(/^\s*/)||[''])[0], r=l.slice(ind.length);
    if(!ind&&/:$/.test(r)) return `<span class="sy-tk-sec">${esc(l)}</span>`;
    let m;
    if((m=/^(.+?) (→|->) (.+?) \[(\w[\w-]*)\](.*)$/.exec(r))){   // lien : source → cible [genre] libellé
      const coul=(CAP_SY_REL_STYLE[m[4]]||[])[0]||'var(--c-dim)';
      return `${ind}<span class="sy-tk-nom">${esc(m[1])}</span> <span class="sy-tk-fleche">${esc(m[2])}</span> <span class="sy-tk-nom">${esc(m[3])}</span> <span class="sy-tk-genre" style="color:${coul};border-color:${coul}">${esc(m[4])}</span><span class="sy-tk-dim">${esc(m[5])}</span>`;
    }
    if((m=/^(«[^»]*»)\s*(.*)$/.exec(r))) return `${ind}<span class="sy-tk-kw">${esc(m[1])}</span> ${nomType(m[2])}`;   // «mot-clé» nom : Type
    if((m=/^([a-zA-Zéèêàçùûô' ]+?) : (.*)$/.exec(r))&&ind.length>=4&&!/^(port|in|out|inout) /.test(r)){   // compartiment : valeurs ; séparées
      return `${ind}<span class="sy-tk-comp">${esc(m[1])}</span><span class="sy-tk-dim"> : </span>${m[2].split(' ; ').map(v=>`<span class="sy-tk-val">${esc(v)}</span>`).join('<span class="sy-tk-dim"> ; </span>')}`;
    }
    if((m=/^(port|in|out|inout|debut|fin|entry|start|done)\b(.*)$/.exec(r))) return `${ind}<span class="sy-tk-kw">${esc(m[1])}</span>${nomType(m[2])}`;
    return `${ind}${nomType(r)}`;
  }).join('\n');
}

/** Zone ▣ Carte de l'explorateur (sous la liste des vues), comme `capDiagCarte` (54) : en-tête repliable et bouton ⇲ (carte dans la
 * vue) quand la carte est sous l'explorateur, mention « dans le diagramme » et bouton ⇱ sinon ; vide sans vue visuelle ouverte.
 * @param {object|null} vue - Vue ouverte
 * @param {number[]} vb - viewBox de la vue
 * @param {string} th - Thème des SVG (`clair` / `sombre`)
 * @returns {string} HTML
 */
function capSyCarteZoneHtml(vue, vb, th){
  const st=_capSyVues; if(!vue||st.mode!=='visuel') return '';
  const pan=st.carte==='panneau';
  const tete=pan
    ?`<span class="cdg-carte-tog" data-sycarte-tog="1"><span class="cdg-tog">${st.carteReduite?'▸':'▾'}</span><b>${_L('▣ Carte')}</b></span><span style="flex:1"></span><button class="cap-lf-btn" data-sycarte="diagramme" title="${_L('Afficher la carte dans le diagramme')}">⇲</button>`
    :`<b>${_L('▣ Carte')}</b><span class="cdg-cnt">${_L('dans le diagramme')}</span><span style="flex:1"></span><button class="cap-lf-btn" data-sycarte="panneau" title="${_L('Afficher la carte sous l\'explorateur')}">⇱</button>`;
  const corps=pan&&!st.carteReduite?`<div class="sy-carte sy-carte-panneau" title="${_L('Carte : clic ou glisser pour se déplacer')}"><svg class="sy-carte-svg ${th}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${vue.svg}</svg><div class="sy-carte-vp"></div></div>`:'';
  return `<div class="cdg-carte-zone sy-carte-zone"><div class="cdg-carte-tete">${tete}</div><div class="cdg-carte-corps"${corps?'':' hidden'}>${corps}</div></div>`;
}

/** Rend la vue 🔲 Diagrammes pour un modèle SysML v2 : liste des vues par genre à gauche (repliable, largeur réglable, ▣ carte en
 * dessous), vue ouverte à droite (visuel ou texte). Les éléments de la visionneuse Capella présents dans le conteneur sont masqués,
 * pas détruits (`capRenderDiagrams`, 54). Les défilements de la liste et de la vue sont rétablis après le rendu (un clic sur une vue
 * ne ramène pas la liste en haut).
 * @param {HTMLElement} box - Conteneur #cap-view-diag
 */
function capSyVuesRender(box){
  const esc=capEsc, st=_capSyVues, L=ArcatureLecteurSysml, G=L.genresVues||{};
  if(typeof st.carte!=='string') st.carte=st.carte===false?'diagramme':'panneau';   // ancien booléen
  let v=box.querySelector('#cap-sy-vues'); if(!v){ v=document.createElement('div'); v.id='cap-sy-vues'; v.className='sy-vues'; box.appendChild(v); }
  const liste0=v.querySelector('.sy-vues-liste'); if(liste0) st.listeDefil=liste0.scrollTop;   // défilement de la liste gardé
  const boxDefil=box.scrollTop;
  [...box.children].forEach(c=>{ c.style.display=c===v?'':'none'; });
  capSyVuesCss();
  const vues=capSyVuesListe(), q=(st.q||'').trim().toLowerCase();
  if(st.cle&&!vues.some(x=>x.cle===st.cle)&&!capSyVue(st.cle)) st.cle='';
  const shown=vues.filter(x=>!q||(x.nom+' '+x.libelleGenre+' '+x.sigle).toLowerCase().includes(q));
  const groupes=Object.keys(G).filter(g=>shown.some(x=>x.genre===g)).map(g=>({g, l:G[g].libelle, items:shown.filter(x=>x.genre===g), pli:!!st.plis[g]&&!q}));
  const liste=`<div class="cdg-outils"><input type="search" id="sy-vues-q" placeholder="${_L('🔍 Filtrer les vues…')}" value="${esc(st.q||'')}"></div><div class="sy-vues-liste">`+
    (groupes.length?groupes.map(gr=>`<div class="sy-grp-h" data-syplg="${esc(gr.g)}" title="${_L('Replier / déplier')}"><span class="sy-grp-chv">${gr.pli?'▸':'▾'}</span><span class="cdg-ico">${capSyVueIco(gr.g, 13)}</span>${esc(gr.l)} <span class="ana-dim">${gr.items.length}</span></div>`+
      (gr.pli?'':gr.items.map(x=>`<div class="cdg-it sy-vue-it${x.cle===st.cle?' actif':''}" data-cle="${esc(x.cle)}" title="${esc(x.libelleGenre)}"><span class="cdg-ico">${capSyVueIco(x.genre, 14)}</span><span class="cdg-sigle">${esc(x.sigle)}</span><span class="cdg-nom">${esc(x.nom)}</span></div>`).join(''))).join('')
      :`<div class="cdg-aide">${_L('Aucune vue ne correspond.')}</div>`)+`</div>`;
  let corps='';
  const vue=st.cle?capSyVue(st.cle):null, vb=(vue&&vue.viewBox)||[0,0,800,600], th=capSyTheme();
  const nNotes=typeof _capRev!=='undefined'&&st.cle?_capRev.comments.filter(c=>c.diag&&c.diag.uid==='sy:'+st.cle).length:0;
  if(!vue) corps=`<div class="cdg-vide">${vues.length?_L(`${vues.length} vue(s) calculée(s) depuis le texte SysML v2 : choisissez-en une à gauche (ou depuis le panneau de détail d'un élément).`):_L('Aucune vue calculable dans ce modèle (pas de définition de part, d\'état ni d\'action).')}</div>`;
  else {
    const visuel=st.mode==='visuel';
    const barre=`<div class="phl-toggle-bar sy-vue-barre"><b class="sy-vue-titre" title="${esc(vue.libelleGenre)}">${capSyVueIco(vue.genre, 16)} <span class="cdg-sigle">${esc(vue.sigle)}</span> ${esc(vue.nom)}</b>`+
      `<span class="tb-grp"><button class="cap-lf-btn${visuel?' active':''}" data-symode="visuel">🖼 ${_L('Visuel')}</button><button class="cap-lf-btn${!visuel?' active':''}" data-symode="texte">≡ ${_L('Texte')}</button></span>`+
      `<span class="tb-grp"><button class="cap-lf-btn" data-syzoom="-" title="${visuel?_L('Réduire'):_L('Texte plus petit')}">−</button><button class="cap-lf-btn" data-syzoom="0" title="${visuel?_L('Ajuster à la largeur'):_L('Taille normale du texte')}">⊡</button><button class="cap-lf-btn" data-syzoom="+" title="${visuel?_L('Agrandir'):_L('Texte plus grand')}">+</button>`+
        (visuel&&st.carte==='diagramme'?`<button class="cap-lf-btn${st.carteVue?' active':''}" data-sycarte-vue="1" title="${_L('Carte : vue d\'ensemble et position affichée (clic : s\'y rendre)')}">${_L('▣ Carte')}</button>`:'')+`</span>`+
      (visuel&&typeof _capRev!=='undefined'?`<span class="tb-grp"><span class="crv-drag" id="sy-crv-note" draggable="true" title="${_L('Note de revue : glissez-la sur la vue (déposée sur un élément, elle lui est liée) ou cliquez pour la poser au centre. Les notes forment un calque indépendant du modèle.')}"><span class="crv-drag-h">⠿</span>${_L('📝 Note')}</span><button class="cap-lf-btn${_capRev.layer?' active':''}" id="sy-crv-layer" title="${_L('Afficher ou masquer le calque des notes de revue')}">${_L('💬 Calque')} <span class="cdg-nb">${nNotes}</span></button></span>`:'')+
      `<span style="flex:1"></span><span class="ana-dim" style="font-size:11px">${_L(`${vue.formes.length} forme(s) · ${vue.liens.length} lien(s)`)}</span>`+
      `<button class="phl-export-btn" data-syexp="svg" title="${_L('Document SVG autonome (styles embarqués)')}">⬇ SVG</button><button class="phl-export-btn" data-syexp="txt" title="${_L('Rendu textuel de la vue')}">⬇ ${_L('Texte')}</button>`+
      (vue.element?`<button class="cap-lf-btn" data-syel="${esc(vue.element)}" title="${_L('Élément dont c\'est la vue : panneau de détail')}">🔎 ${_L('Élément')}</button>`:'')+`</div>`;
    if(!visuel) corps=barre+`<pre class="sy-texte sy-vue-texte" style="font-size:${(11.5*(st.texteZoom||1)).toFixed(1)}px" title="${_L('Ctrl + molette : taille du texte')}">${capSyTexteHtml(vue.texte||'')}</pre>`;
    else corps=barre+`<div class="sy-vue-droite-corps"><div class="sy-vue-hote" title="${_L('Glisser : déplacer la vue · Ctrl + molette : zoom · clic : élément')}"><div class="sy-vue-cadre"><svg class="sy-vue-svg ${th}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" data-w="${vb[2]}" data-h="${vb[3]}">${vue.svg}</svg></div></div>`+
      (st.carte==='diagramme'&&st.carteVue?`<div class="sy-carte" title="${_L('Carte : clic ou glisser pour se déplacer')}"><svg class="sy-carte-svg ${th}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${vue.svg}</svg><div class="sy-carte-vp"></div></div>`:'')+`</div>`;
  }
  v.innerHTML=`<aside class="sy-vues-gauche" style="width:${Math.max(160, st.largeur||260)}px"><div class="sy-vues-explo">${liste}</div>${capSyCarteZoneHtml(vue, vb, th)}</aside><div class="sy-vues-split" title="${_L('Glisser pour régler la largeur de la liste')}"></div><div class="sy-vues-droite">${corps}</div>`;
  const liste1=v.querySelector('.sy-vues-liste'); if(liste1&&st.listeDefil) liste1.scrollTop=st.listeDefil;
  if(boxDefil) box.scrollTop=boxDefil;
  // Taille du dessin : zoom réglé, sinon ajusté à la largeur disponible ; élément mis en évidence ; clic → détail ; main ; Ctrl+molette ; carte
  const svg=v.querySelector('svg.sy-vue-svg');
  if(svg){ const hote=svg.closest('.sy-vue-hote'); capSyZoomPoser(svg, hote, st.zoom);
    if(st.sel){ svg.querySelectorAll(`[data-sem="${CSS.escape(st.sel)}"]`).forEach(g=>g.classList.add('sy-sel')); }
    if(st.defil){ hote.scrollLeft=st.defil[0]; hote.scrollTop=st.defil[1]; st.defil=null; }
    svg.addEventListener('click',e=>{ if(hote._deplace) return; const g=e.target.closest('[data-sem]'); if(!g) return; const id=g.dataset.sem; st.sel=id; svg.querySelectorAll('.sy-sel').forEach(x=>x.classList.remove('sy-sel')); svg.querySelectorAll(`[data-sem="${CSS.escape(id)}"]`).forEach(x=>x.classList.add('sy-sel')); if(capGetElementById_(id)) capOpenDetailById(id); });
    capSyVuesMain(hote, box);
    capSyCarte(v, hote, svg);
    if(typeof capRevLayerEnsure==='function') setTimeout(capRevLayerEnsure,0);   // 💬 notes de revue sur la vue (55)
  }
  const pre=v.querySelector('.sy-vue-texte');   // ≡ texte : Ctrl + molette = taille du texte
  if(pre) pre.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); capSyTexteZoom(box, e.deltaY<0?1.15:1/1.15); },{passive:false});
  const qi=v.querySelector('#sy-vues-q'); if(qi) qi.oninput=()=>{ st.q=qi.value; const p=qi.selectionStart; capSyVuesRender(box); const i=box.querySelector('#sy-vues-q'); if(i){ i.focus(); i.setSelectionRange(p,p); } };
  v.querySelectorAll('[data-syplg]').forEach(h=>h.onclick=()=>{ st.plis[h.dataset.syplg]=!st.plis[h.dataset.syplg]; capSyVuesRender(box); });
  v.querySelectorAll('.sy-vue-it').forEach(it=>it.onclick=()=>{ st.cle=it.dataset.cle; st.sel=''; st.zoom=0; st.defil=null; capSyVuesRender(box); });
  v.querySelectorAll('[data-symode]').forEach(b=>b.onclick=()=>{ st.mode=b.dataset.symode; capSyVuesRender(box); });
  v.querySelectorAll('[data-syzoom]').forEach(b=>b.onclick=()=>{ const f=b.dataset.syzoom==='0'?0:(b.dataset.syzoom==='+'?1.25:0.8); if(st.mode==='texte') capSyTexteZoom(box, f); else capSyZoom(box, f); });
  v.querySelectorAll('[data-sycarte]').forEach(b=>b.onclick=()=>{ st.carte=b.dataset.sycarte; capSyVuesRender(box); });
  v.querySelectorAll('[data-sycarte-tog]').forEach(b=>b.onclick=()=>{ st.carteReduite=!st.carteReduite; capSyVuesRender(box); });
  v.querySelectorAll('[data-sycarte-vue]').forEach(b=>b.onclick=()=>{ st.carteVue=!st.carteVue; capSyVuesRender(box); });
  v.querySelectorAll('[data-syexp]').forEach(b=>b.onclick=()=>{ if(!vue) return; const nom=(vue.nom||'vue').replace(/[\\/:*?"<>|]+/g,'-');
    if(b.dataset.syexp==='svg') capDownloadBlob(new Blob([vue.svgDocument({theme:capSyTheme()})],{type:'image/svg+xml'}), nom+'.svg');
    else capDownloadBlob(new Blob([vue.texte||''],{type:'text/plain'}), nom+'.txt'); });
  v.querySelectorAll('[data-syel]').forEach(b=>b.onclick=()=>capOpenDetailById(b.dataset.syel));
  // Largeur de la liste : séparateur glissé (la carte sous l'explorateur se redessine à la fin)
  const sp=v.querySelector('.sy-vues-split'), aside=v.querySelector('.sy-vues-gauche');
  if(sp) sp.onpointerdown=e=>{ e.preventDefault(); const x0=e.clientX, w0=aside.getBoundingClientRect().width; sp.classList.add('on'); sp.setPointerCapture(e.pointerId);
    const mv=ev=>{ st.largeur=Math.max(160, Math.min(600, w0+ev.clientX-x0)); aside.style.width=st.largeur+'px'; };
    const fin=()=>{ sp.classList.remove('on'); sp.removeEventListener('pointermove',mv); sp.removeEventListener('pointerup',fin); sp.removeEventListener('pointercancel',fin); if(v.querySelector('.sy-carte-panneau')) capSyVuesRender(box); };
    sp.addEventListener('pointermove',mv); sp.addEventListener('pointerup',fin); sp.addEventListener('pointercancel',fin); };
}

/** Applique un zoom au dessin : largeur et hauteur du SVG (facteur, ou 0 = ajusté à la largeur du conteneur, entre 0,2 et 1,5).
 * @param {SVGSVGElement} svg - Dessin
 * @param {HTMLElement} hote - Conteneur défilant
 * @param {number} z - Facteur, ou 0
 * @returns {number} Facteur appliqué
 */
function capSyZoomPoser(svg, hote, z){
  const w=+svg.dataset.w||800, h=+svg.dataset.h||600, k=z||Math.min(1.5, Math.max(0.2, (hote.clientWidth-24)/w));
  svg.style.width=Math.round(w*k)+'px'; svg.style.height=Math.round(h*k)+'px';
  return k;
}

/** Zoom de la vue affichée (facteur, ou 0 = ajusté à la largeur), position de défilement conservée au prorata ; le dessin est
 * redimensionné sur place (pas de nouveau rendu : la liste et la carte restent, le calque des notes est redessiné).
 * @param {HTMLElement} box - Conteneur #cap-view-diag
 * @param {number} f - Facteur multiplicatif, ou 0
 * @param {number[]} [centre] - Point écran à garder sous le pointeur [x, y] (Ctrl + molette)
 */
function capSyZoom(box, f, centre){
  const st=_capSyVues, svg=box.querySelector('svg.sy-vue-svg'), hote=svg&&svg.closest('.sy-vue-hote'); if(!svg||!hote) return;
  const w=+svg.dataset.w||1, cur=parseFloat(svg.style.width)/w||1, z=f?Math.min(4, Math.max(0.1, cur*f)):0;
  const r=hote.getBoundingClientRect(), px=centre?centre[0]-r.left:r.width/2, py=centre?centre[1]-r.top:r.height/2;
  st.zoom=z;
  const k=capSyZoomPoser(svg, hote, z)/cur;
  hote.scrollLeft=(hote.scrollLeft+px)*k-px; hote.scrollTop=(hote.scrollTop+py)*k-py;
  if(hote._carteMaj) hote._carteMaj();
  if(typeof capRevLayerDraw==='function') requestAnimationFrame(capRevLayerDraw);
}

/** Taille du texte du rendu ≡ Texte (facteur multiplicatif, ou 0 = taille normale), entre 0,5 et 3.
 * @param {HTMLElement} box - Conteneur #cap-view-diag
 * @param {number} f - Facteur, ou 0
 */
function capSyTexteZoom(box, f){
  const st=_capSyVues, pre=box.querySelector('.sy-vue-texte'); if(!pre) return;
  st.texteZoom=f?Math.min(3, Math.max(0.5, (st.texteZoom||1)*f)):1;
  pre.style.fontSize=(11.5*st.texteZoom).toFixed(1)+'px';
}

/** Déplacement à la main (glisser sur la vue) et zoom à la molette avec Ctrl, comme la visionneuse Capella ; un glisser n'ouvre pas l'élément.
 * @param {HTMLElement} hote - Conteneur défilant de la vue
 * @param {HTMLElement} box - Conteneur #cap-view-diag
 */
function capSyVuesMain(hote, box){
  hote.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==1) return; if(e.target.closest('.crv-note,.crv-linkbar,.sy-carte')) return;
    const x0=e.clientX, y0=e.clientY, sl=hote.scrollLeft, stp=hote.scrollTop; let bouge=false;
    hote.classList.add('sy-main'); hote._deplace=false;
    const mv=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!bouge&&Math.abs(dx)+Math.abs(dy)<4) return; bouge=true; hote._deplace=true; hote.scrollLeft=sl-dx; hote.scrollTop=stp-dy; };
    const fin=()=>{ hote.classList.remove('sy-main'); hote.removeEventListener('pointermove',mv); hote.removeEventListener('pointerup',fin); hote.removeEventListener('pointercancel',fin); setTimeout(()=>{ hote._deplace=false; },0); };
    hote.addEventListener('pointermove',mv); hote.addEventListener('pointerup',fin); hote.addEventListener('pointercancel',fin);
    try{ hote.setPointerCapture(e.pointerId); }catch(err){ /* capture refusée : glisser quand même */ }
  });
  hote.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); capSyZoom(box, e.deltaY<0?1.2:1/1.2, [e.clientX, e.clientY]); },{passive:false});
}

/** ▣ Carte de la vue : miniature du dessin (sous l'explorateur, à la largeur du volet, ou flottante dans la vue), cadre de la partie
 * affichée suivi au défilement et au zoom, clic ou glisser pour s'y rendre.
 * @param {HTMLElement} v - Conteneur #cap-sy-vues
 * @param {HTMLElement} hote - Conteneur défilant de la vue
 * @param {SVGSVGElement} svg - Dessin
 */
function capSyCarte(v, hote, svg){
  const carte=v.querySelector('.sy-carte'), vp=carte&&carte.querySelector('.sy-carte-vp'), mini=carte&&carte.querySelector('svg.sy-carte-svg'); if(!carte||!vp||!mini) return;
  const w=+svg.dataset.w||1, h=+svg.dataset.h||1, pan=carte.classList.contains('sy-carte-panneau');
  let cw, ch;
  if(pan){ cw=Math.max(60, carte.parentElement.clientWidth-12); ch=Math.round(cw*h/w); if(ch>190){ ch=190; cw=Math.round(ch*w/h); } }
  else { cw=Math.min(220, Math.max(120, Math.round(w/h*110))); ch=Math.round(cw*h/w); }
  mini.setAttribute('width',cw); mini.setAttribute('height',ch); carte.style.width=cw+'px'; carte.style.height=ch+'px';
  const maj=()=>{ const zw=parseFloat(svg.style.width)||w, zh=parseFloat(svg.style.height)||h, kx=cw/zw, ky=ch/zh;
    vp.style.left=Math.round(hote.scrollLeft*kx)+'px'; vp.style.top=Math.round(hote.scrollTop*ky)+'px';
    vp.style.width=Math.max(8, Math.round(Math.min(hote.clientWidth, zw)*kx))+'px'; vp.style.height=Math.max(8, Math.round(Math.min(hote.clientHeight, zh)*ky))+'px'; };
  maj(); hote.addEventListener('scroll',maj); hote._carteMaj=maj;
  const aller=e=>{ const r=carte.getBoundingClientRect(), zw=parseFloat(svg.style.width)||w, zh=parseFloat(svg.style.height)||h;
    hote.scrollLeft=(e.clientX-r.left)/cw*zw-hote.clientWidth/2; hote.scrollTop=(e.clientY-r.top)/ch*zh-hote.clientHeight/2; };
  carte.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); aller(e); carte.setPointerCapture(e.pointerId);
    const mv=ev=>aller(ev), fin=()=>{ carte.removeEventListener('pointermove',mv); carte.removeEventListener('pointerup',fin); carte.removeEventListener('pointercancel',fin); };
    carte.addEventListener('pointermove',mv); carte.addEventListener('pointerup',fin); carte.addEventListener('pointercancel',fin); });
}

/** Section « Vues SysML » du panneau de détail (onglet 🔲) : vues calculées proposées sur l'élément, cliquables.
 * @param {string} id - Identifiant de l'élément
 * @param {Function} secTitle - Titre de section du panneau
 * @returns {string} HTML (vide hors modèle SysML)
 */
function capSyVuesDetail(id, secTitle){
  if(!_capSysml.lecture) return '';
  const vs=capSyVuesPour(id); if(!vs.length) return '';
  return secTitle(_L(`Vues SysML v2 (${vs.length})`),'#58a6ff')+vs.map(v=>`<div class="cap-det-link cdg-lien" onclick="capSyVueOuvrir('${capEsc(v.cle)}','${capEsc(id)}')" title="${capEsc(v.libelleGenre)}">${capSyVueIco(v.genre, 14)} <span class="cdg-sigle">${capEsc(v.sigle)}</span>${capEsc(v.nom)}</div>`).join('');
}

/* ── 🖼 Icônes des métaclasses SysML v2 (dessinées pour Arcalyse, aucun fichier d'un autre outil repris : un glyphe par nature d'élément, couleur de la famille STR / BEH / REQ / ORG,
   définition = forme pleine aux angles vifs, usage = forme claire aux angles arrondis, usages de référence (perform, exhibit,
   satisfy, assert, binding, flow…) = contour en tirets). Appelées par `capIcoPlus` (84) quand la visionneuse ne dessine rien. ── */

/** Couleurs des icônes SysML par famille : trait / fond d'une définition, fond d'un usage. */
const CAP_SY_ICO_COULEUR={STR:['#1f8ca3','#d4eef3'], BEH:['#3a9a3a','#dcf1dc'], REQ:['#c2387a','#f8dcea'], ORG:['#8250df','#e8ddfa']};

/** Glyphes SVG (viewBox 0 0 16 16) des icônes SysML par nature d'élément, construits au premier appel. Chaque glyphe est une
 * fonction (trait, fond, texte) → SVG, pour être coloré selon la famille et la nature (définition / usage).
 * @returns {Object<string,function(string,string,string):string>} Nature → glyphe
 */
function capIcoSysmlTable(){
  if(capIcoSysmlTable._t) return capIcoSysmlTable._t;
  const tx=(t, x, y, taille, coul, gras)=>`<text x="${x}" y="${y}" font-size="${taille}" font-weight="${gras===false?'400':'700'}" text-anchor="middle" fill="${coul}" stroke="none">${t}</text>`;
  const fleche=(x1, x2, s, tirets)=>`<path d="M${x1} 8H${x2-2.6}" stroke="${s}" stroke-width="1.6"${tirets?' stroke-dasharray="2.2 1.6"':''}/><path d="M${x2-3.2} 5.6L${x2} 8L${x2-3.2} 10.4Z" fill="${s}"/>`;
  const doc=(s, f, lignes)=>`<path d="M3.5 1.5H10L12.5 4V14.5H3.5Z" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M10 1.5V4H12.5" fill="none" stroke="${s}" stroke-width="1"/>`+(lignes||'');
  const boite=(s, f, r, x, y, w, h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" stroke="${s}" stroke-width="1.2"/>`;
  const dossier=(s, f)=>`<path d="M1.5 3.5H6.5L8 5.5H14.5V13.5H1.5Z" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M1.5 6.5H14.5" stroke="${s}" stroke-width="1"/>`;
  const oeil=(s, f)=>`<path d="M1.5 8C4 3.8 12 3.8 14.5 8C12 12.2 4 12.2 1.5 8Z" fill="${f}" stroke="${s}" stroke-width="1.2"/><circle cx="8" cy="8" r="2.3" fill="${s}"/>`;
  const coche=(s, f, inner)=>boite(s, f, 1.5, 2, 2, 12, 12)+(inner||`<path d="M4.6 8.3L7 10.7L11.6 5.6" fill="none" stroke="${s}" stroke-width="1.8" stroke-linecap="round"/>`);
  capIcoSysmlTable._t={
    // Structure
    Part:(s, f, t)=>`<path d="M2.5 5.3L8 2.5L13.5 5.3V10.7L8 13.5L2.5 10.7Z" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M2.5 5.3L8 8L13.5 5.3M8 8V13.5" fill="none" stroke="${s}" stroke-width="1"/>`,
    Port:(s, f)=>`<path d="M3.5 1.5V14.5" stroke="${s}" stroke-width="1.4"/><rect x="1" y="5.5" width="5" height="5" fill="${f}" stroke="${s}" stroke-width="1.2"/>`+fleche(6.5, 14.5, s),
    Attribute:(s, f, t)=>boite(s, f, 1.5, 2, 2.5, 12, 11)+`<path d="M4.5 6H11.5M4.5 8.5H11.5M4.5 11H9" stroke="${t}" stroke-width="1.2" stroke-linecap="round"/>`,
    Item:(s, f)=>`<path d="M2 4H10L14 8L10 12H2Z" fill="${f}" stroke="${s}" stroke-width="1.2"/><circle cx="5" cy="8" r="1.3" fill="${s}"/>`,
    Interface:(s, f)=>`<circle cx="8" cy="5.5" r="3.6" fill="${f}" stroke="${s}" stroke-width="1.3"/><path d="M8 9.1V14.5M4.5 14.5H11.5" stroke="${s}" stroke-width="1.4"/>`,
    Connection:(s, f)=>`<rect x="1" y="5" width="4.5" height="6" fill="${f}" stroke="${s}" stroke-width="1.2"/><rect x="10.5" y="5" width="4.5" height="6" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M5.5 8H10.5" stroke="${s}" stroke-width="1.6"/>`,
    Allocation:(s, f)=>`<rect x="1" y="5" width="4.5" height="6" fill="${f}" stroke="${s}" stroke-width="1.2"/><rect x="10.5" y="5" width="4.5" height="6" fill="${f}" stroke="${s}" stroke-width="1.2"/>`+fleche(5.5, 11, s, true),
    Enumeration:(s, f, t)=>boite(s, f, 1.5, 2, 2.5, 12, 11)+`<circle cx="5" cy="6" r="1" fill="${t}"/><circle cx="5" cy="8.5" r="1" fill="${t}"/><circle cx="5" cy="11" r="1" fill="${t}"/><path d="M7 6H11.5M7 8.5H11.5M7 11H10" stroke="${t}" stroke-width="1.2" stroke-linecap="round"/>`,
    Reference:(s, f)=>boite(s, f, 1.5, 1.5, 4, 6, 8)+fleche(7.5, 15, s, true),
    Occurrence:(s, f)=>`<circle cx="8" cy="8" r="6" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M8 4.5V8L10.6 9.8" fill="none" stroke="${s}" stroke-width="1.4" stroke-linecap="round"/>`,
    Individual:(s, f)=>`<path d="M2.5 5.3L8 2.5L13.5 5.3V10.7L8 13.5L2.5 10.7Z" fill="${f}" stroke="${s}" stroke-width="1.2"/><circle cx="8" cy="8.5" r="2.2" fill="${s}"/>`,
    // Comportement
    Action:(s, f, t)=>boite(s, f, 3.5, 1.5, 3.5, 13, 9)+`<path d="M6.3 5.8L9.8 8L6.3 10.2Z" fill="${t}"/>`,
    State:(s, f, t)=>boite(s, f, 4.5, 1.5, 3.5, 13, 9)+`<circle cx="5.2" cy="8" r="1.6" fill="${t}"/><path d="M6.8 8H11.3" stroke="${t}" stroke-width="1.4" stroke-linecap="round"/>`,
    Calculation:(s, f, t)=>boite(s, f, 3.5, 1.5, 3, 13, 10)+tx('ƒx', 8, 11.2, 7.6, t),
    Flow:(s, f)=>`<rect x="1" y="5" width="4" height="6" fill="${f}" stroke="${s}" stroke-width="1.2"/>`+fleche(5, 15, s)+`<rect x="8" y="6.5" width="3" height="3" fill="${s}"/>`,
    Transition:(s)=>`<path d="M2.5 12.5C3 5.5 9.5 3.5 12.6 6.8" fill="none" stroke="${s}" stroke-width="1.5"/><path d="M10.4 7.6L13.6 8.4L13.2 5Z" fill="${s}"/><circle cx="2.5" cy="12.5" r="1.6" fill="${s}"/>`,
    Succession:(s)=>`<circle cx="3" cy="8" r="1.8" fill="${s}"/>`+fleche(4.5, 15, s),
    Send:(s, f)=>`<path d="M1.5 4H10L13.5 8L10 12H1.5Z" fill="${f}" stroke="${s}" stroke-width="1.2"/>`,
    Accept:(s, f)=>`<path d="M2.5 4H14V12H2.5L6 8Z" fill="${f}" stroke="${s}" stroke-width="1.2"/>`,
    Assignment:(s, f, t)=>boite(s, f, 3.5, 1.5, 3.5, 13, 9)+tx('=', 8, 11.3, 9.5, t),
    If:(s, f, t)=>boite(s, f, 3.5, 1.5, 3.5, 13, 9)+tx('?', 8, 11.3, 9, t),
    Loop:(s, f, t)=>boite(s, f, 3.5, 1.5, 3.5, 13, 9)+tx('↻', 8, 11.3, 9, t),
    Decision:(s, f)=>`<path d="M8 2L14 8L8 14L2 8Z" fill="${f}" stroke="${s}" stroke-width="1.2"/>`,
    Fork:(s)=>`<rect x="1.5" y="6.5" width="13" height="3" fill="${s}"/>`,
    Start:(s)=>`<circle cx="8" cy="8" r="4.5" fill="${s}"/>`,
    Done:(s, f)=>`<circle cx="8" cy="8" r="5.5" fill="${f}" stroke="${s}" stroke-width="1.3"/><circle cx="8" cy="8" r="2.6" fill="${s}"/>`,
    Event:(s, f)=>`<path d="M9 1.5L4 9H8L7 14.5L12 7H8Z" fill="${f}" stroke="${s}" stroke-width="1.1" stroke-linejoin="round"/>`,
    // Exigences et cas
    Requirement:(s, f, t)=>doc(s, f, `<path d="M5.5 7H10.5M5.5 9.5H10.5M5.5 12H8.5" stroke="${t}" stroke-width="1.2" stroke-linecap="round"/>`),
    Constraint:(s, f, t)=>boite(s, f, 1.5, 1.5, 2.5, 13, 11)+tx('{ }', 8, 11.3, 8.5, t),
    UseCase:(s, f)=>`<ellipse cx="8" cy="8" rx="6.5" ry="4.3" fill="${f}" stroke="${s}" stroke-width="1.2"/>`,
    Case:(s, f)=>coche(s, f),
    Analysis:(s, f, t)=>coche(s, f, `<path d="M4.5 11V8M8 11V5M11.5 11V7" stroke="${t}" stroke-width="1.8" stroke-linecap="round"/>`),
    Verification:(s, f, t)=>coche(s, f, `<path d="M3.6 8.3L5.8 10.5L9.4 6M7.2 10.5L12.4 5.4" fill="none" stroke="${t}" stroke-width="1.6" stroke-linecap="round"/>`),
    Concern:(s, f, t)=>coche(s, f, tx('!', 8, 11.6, 10, t)),
    Viewpoint:(s, f)=>oeil(s, f),
    // Organisation
    Package:(s, f)=>dossier(s, f),
    Library:(s, f)=>dossier(s, f)+`<path d="M5 8.5V12M8 8.5V12M11 8.5V12" stroke="${s}" stroke-width="1.2"/>`,
    Import:(s, f)=>dossier(s, f)+`<path d="M11 1V7" stroke="${s}" stroke-width="1.6"/><path d="M8.6 5L11 8L13.4 5Z" fill="${s}"/>`,
    Comment:(s, f, t)=>doc(s, f, tx('“', 7.5, 12.5, 11, t)),
    Documentation:(s, f, t)=>doc(s, f, `<path d="M5.5 6.5H8.5M5.5 9H10.5M5.5 11.5H10.5" stroke="${t}" stroke-width="1.2" stroke-linecap="round"/>`),
    Dependency:(s)=>`<rect x="1" y="5" width="4" height="6" fill="none" stroke="${s}" stroke-width="1.2"/>`+fleche(5.5, 15, s, true),
    Metadata:(s, f)=>`<path d="M2 2H8.5L14 7.5L7.5 14L2 8.5Z" fill="${f}" stroke="${s}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="5.2" cy="5.2" r="1.3" fill="${s}"/>`,
    View:(s, f)=>oeil(s, f),
    Rendering:(s, f)=>oeil(s, f)+`<path d="M11 13.5L14.5 10" stroke="${s}" stroke-width="1.8" stroke-linecap="round"/>`,
    Alias:(s, f, t)=>boite(s, f, 1.5, 1.5, 3, 13, 10)+tx('≡', 8, 11.5, 10, t),
    Namespace:(s, f, t)=>boite(s, f, 1.5, 1.5, 3, 13, 10)+tx('::', 8, 11.3, 9, t),
    Multiplicity:(s, f, t)=>tx('[n]', 8, 11.4, 8.4, s),
    Expression:(s, f, t)=>tx('x', 8, 11.6, 10.5, s),
    Literal:(s, f, t)=>tx('1', 8, 11.6, 10.5, s),
    Text:(s, f, t)=>tx('“a”', 8, 11.3, 7.8, s),
    Membership:(s, f)=>`<circle cx="4" cy="8" r="2.2" fill="${s}"/><path d="M6.5 8H10" stroke="${s}" stroke-width="1.4"/><rect x="10" y="5" width="5" height="6" fill="${f}" stroke="${s}" stroke-width="1.2"/>`,
    Feature:(s, f)=>`<rect x="2" y="5" width="12" height="6" rx="1" fill="${f}" stroke="${s}" stroke-width="1.2"/>`,
    Type:(s, f, t)=>boite(s, f, 1, 1.5, 2.5, 13, 11)+tx('T', 8, 11.4, 9, t),
  };
  return capIcoSysmlTable._t;
}

/** Nature, famille et forme (définition / usage / référence) d'une métaclasse SysML : clé de `capIcoSysmlTable`.
 * @param {string} type - Métaclasse (« PartDefinition », « PerformActionUsage », « Package »…)
 * @returns {{nature:string, fam:string, def:boolean, usage:boolean, ref:boolean}|null} null si la métaclasse n'a pas d'icône
 */
function capIcoSysmlNature(type){
  const T=capIcoSysmlTable();
  const def=/Definition$/.test(type), usage=/(As)?Usage$/.test(type);
  let n=type.replace(/Definition$|AsUsage$|Usage$/,''), ref=false;
  const alias={SatisfyRequirement:['Requirement',true], AssertConstraint:['Constraint',true], ExhibitState:['State',true], PerformAction:['Action',true], IncludeUseCase:['UseCase',true],
    FlowConnection:['Flow',false], SuccessionFlow:['Flow',false], BindingConnection:['Connection',true], Succession:['Succession',false], AnalysisCase:['Analysis',false], VerificationCase:['Verification',false],
    LibraryPackage:['Library',false], WhileLoopAction:['Loop',false], ForLoopAction:['Loop',false], IfAction:['If',false], SendAction:['Send',false], AcceptAction:['Accept',false], AssignmentAction:['Assignment',false],
    DecisionNode:['Decision',false], MergeNode:['Decision',false], ForkNode:['Fork',false], JoinNode:['Fork',false], StartNode:['Start',false], DoneNode:['Done',false], ControlNode:['Decision',false],
    EventOccurrence:['Event',false], MessageEvent:['Event',false], TerminateAction:['Done',false], ReturnParameterMembership:['Membership',false], OwningMembership:['Membership',false], FeatureMembership:['Membership',false],
    ActorMembership:['Membership',false], SubjectMembership:['Membership',false], ObjectiveMembership:['Membership',false], StateSubactionMembership:['Membership',false], TransitionFeatureMembership:['Membership',false],
    VariantMembership:['Membership',false], EndFeatureMembership:['Membership',false], Classifier:['Type',false], Class:['Type',false], DataType:['Type',false], Structure:['Type',false], Behavior:['Action',false],
    Function:['Calculation',false], Predicate:['Constraint',false], Association:['Connection',false], AssociationStructure:['Connection',false], Interaction:['Connection',false], Connector:['Connection',false],
    Step:['Action',false], BooleanExpression:['Expression',false], Invariant:['Constraint',false], Metaclass:['Metadata',false], AnnotatingElement:['Comment',false], TextualRepresentation:['Documentation',false],
    Annotation:['Comment',false], Namespace:['Namespace',false], Element:['Feature',false], Relationship:['Dependency',false], Specialization:['Dependency',false], Subsetting:['Dependency',false], Redefinition:['Dependency',false],
    FeatureTyping:['Dependency',false], Conjugation:['Dependency',false], Differencing:['Dependency',false], Intersecting:['Dependency',false], Unioning:['Dependency',false], Disjoining:['Dependency',false],
    NamespaceImport:['Import',false], MembershipImport:['Import',false], MultiplicityRange:['Multiplicity',false]};
  if(alias[n]||alias[type]){ const a=alias[n]||alias[type]; n=a[0]; ref=a[1]; }
  else if(/Expression$/.test(n)) n='Expression';
  else if(/^Literal/.test(n)) n=/String/.test(n)?'Text':'Literal';
  else if(/Membership$/.test(n)) n='Membership';
  else if(/Node$/.test(n)) n='Decision';
  else if(/Import$/.test(n)) n='Import';
  if(!T[n]) return null;
  const famOf={Part:'STR', Port:'STR', Attribute:'STR', Item:'STR', Interface:'STR', Connection:'STR', Allocation:'STR', Enumeration:'STR', Reference:'STR', Occurrence:'STR', Individual:'STR',
    Action:'BEH', State:'BEH', Calculation:'BEH', Flow:'BEH', Transition:'BEH', Succession:'BEH', Send:'BEH', Accept:'BEH', Assignment:'BEH', If:'BEH', Loop:'BEH', Decision:'BEH', Fork:'BEH', Start:'BEH', Done:'BEH', Event:'BEH',
    Requirement:'REQ', Constraint:'REQ', UseCase:'REQ', Case:'REQ', Analysis:'REQ', Verification:'REQ', Concern:'REQ', Viewpoint:'REQ'};
  let fam=famOf[n];
  if(!fam){ let f=''; if(capSysmlDispo()&&typeof ArcatureLecteurSysml.famille==='function') f=ArcatureLecteurSysml.famille(type); fam=f&&CAP_SY_ICO_COULEUR[f]?f:'ORG'; }   // nature partagée (membership, import…) : famille du lecteur
  return {nature:n, fam, def, usage, ref};
}

/** Corps SVG (viewBox 0 0 16 16) de l'icône d'une métaclasse SysML v2, ou '' si elle n'en a pas (icône générique de 84).
 * Définition : glyphe plein de la couleur de la famille (texte blanc), angles vifs ; usage : fond clair, trait de la famille ;
 * usage de référence (perform, exhibit, satisfy…) : trait en tirets ; autres éléments : trait de la famille sur fond clair.
 * @param {string} type - Métaclasse (« PartDefinition »)
 * @returns {string} Corps SVG
 */
function capIcoSysml(type){
  const nat=type&&capIcoSysmlNature(type); if(!nat) return '';
  const [s, clair]=CAP_SY_ICO_COULEUR[nat.fam]||CAP_SY_ICO_COULEUR.ORG, T=capIcoSysmlTable();
  let corps=nat.def?T[nat.nature](s, s, '#fff'):T[nat.nature](s, clair, s);
  if(nat.def) corps=corps.replace(/ rx="[\d.]+"/g,' rx="1"');   // définition : angles vifs
  if(nat.ref) corps=corps.replace(/(<(?:rect|path|ellipse|circle)\b[^>]*?stroke="[^"]+"[^>]*?)(\/?>)/g,(m, a, z)=>/stroke-dasharray/.test(a)?m:a+' stroke-dasharray="2.4 1.6"'+z);
  return corps;
}
