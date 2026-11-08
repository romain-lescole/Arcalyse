/* ═══════════════════════════════════════════════════════════════════════════
   🧩 SysML v2 : lecture d'un modèle SysML v2 (notation textuelle .sysml, archive .kpar, dossier de .sysml) par le
   lecteur autonome d'Arcature (src/vendor/arcature-lecteur-sysml.js, `window.ArcatureLecteurSysml`, lecture seule,
   hors ligne ; mode d'emploi : docs/SYSML-V2.md). La lecture est convertie en document XML « façon Capella »
   (un élément par élément SysML, `xsi:type="sysml:<métaclasse>"`, références en attributs « #id ») et passée à
   `capApplyXmlDoc` (20) : 🌳 Arborescence, 🃏 Cartes, ▤ Tableau, 🔍 Ctrl+K, panneau de détail (références sortantes /
   entrantes), 🗺 Relation Map (liaisons), 💬 Revue et 💾 page fonctionnent sans changement. En plus : vue 🧩 SysML v2
   (sous-vue `sysml` de 🔬 Analyses : éléments, liaisons, 🩺 diagnostics, fichiers), section du panneau de détail
   (déclaration, liaisons, diagnostics, extrait), contrôles 🩺 (diagnostics du lecteur, repris par 💚 Santé), pastille de
   l'accueil, indicateurs du tableau de bord, vues calculées du lecteur dans 🔲 Diagrammes (fin du module). Les vues propres à Capella (fonctions, échanges, chaînes…) sont marquées
   « sans données » (41) pour un modèle SysML.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Lecture affichée : `lecture` (objet du lecteur), `nom` du fichier ou du dossier, `doc` XML produit (celui de `cap_xmlDoc`), `L` lecteur
 * qui l'a produite (null : SysML v2, `ArcatureLecteurSysml` ; UML / SysML v1 : `ArcatureLecteurUml`, 88), `format` (`sysml2`, `uml`, `sysml1`). */
var _capSysml={lecture:null, nom:'', doc:null, L:null, format:''};
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

/** Lecteur d'Arcature de la lecture affichée : SysML v2 (`ArcatureLecteurSysml`) ou UML / SysML v1 (`ArcatureLecteurUml`, 88) ; même contrat
 * là où les deux se recouvrent. @returns {object|null} */
function capSyL(){ return _capSysml.L||(capSysmlDispo()?ArcatureLecteurSysml:null); }

/** Vrai si la lecture affichée est un modèle UML ou SysML v1 (lu par le lecteur de 88). @returns {boolean} */
function capSyUml(){ return !!_capSysml.lecture&&!!_capSysml.format&&_capSysml.format!=='sysml2'&&_capSysml.format!=='reqif'; }   // ReqIF : capSyReqif (101)

/** Nom du format de la lecture affichée : « SysML v2 », « UML » ou « SysML v1 » (noms des langages, non traduits). @returns {string} */
function capSyNomFormat(){ return {uml:'UML', sysml1:'SysML v1', reqif:'ReqIF'}[_capSysml.format]||'SysML v2'; }

/** Sous-vue de 🔬 Analyses qui montre la lecture affichée : `ana:sysml` (SysML v2) ou `ana:uml` (UML / SysML v1, 88). @returns {string} */
function capSyNavCle(){ return capSyUml()?'ana:uml':_capSysml.format==='reqif'?'ana:reqif':'ana:sysml'; }

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
  capSourcesNoter('sy', name, [{nom:name, chemin:name, lire:()=>Promise.resolve(f)}]);   // 🌐 changement de langue (20)
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
    capSourcesNoter('syd', nom, sy);   // 🌐 changement de langue (20)
    setTimeout(()=>capSysmlAppliquer(lec, nom),30);
  }catch(err){ capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true); }
}

/** Remplace le modèle affiché par une lecture d'un lecteur d'Arcature (SysML v2, ou UML / SysML v1 depuis 88) : conversion en document
 * XML, pipeline Capella (`capApplyXmlDoc`), accueil.
 * @param {object} lecture - Lecture du lecteur d'Arcature
 * @param {string} nom - Nom du fichier ou du projet
 * @param {object} [L] - Lecteur qui l'a produite (`ArcatureLecteurUml`, `ArcatureLecteurReqif`) ; absent : lecteur SysML v2
 * @param {string} [format] - `uml` ou `sysml1` (UML), `reqif` (101) avec L ; `sysml2` sinon
 */
function capSysmlAppliquer(lecture, nom, L, format){
  try{
    const rq=format==='reqif'&&!!L, uml=!rq&&!!L&&!!format&&format!=='sysml2';
    if(!lecture||!lecture.elements||lecture.elements().length<2) throw new Error(rq?_L('Aucune exigence ReqIF reconnue dans ce fichier'):uml?_L('Aucun élément UML ou SysML v1 reconnu dans ce fichier'):_L('Aucun élément SysML v2 reconnu dans ce fichier'));
    const airdRetire=typeof capDiagAvantNouveauModele==='function'?capDiagAvantNouveauModele():'';   // 🔲 diagrammes d'un ancien modèle Capella
    const doc=rq?capReqifVersXml(lecture, nom):capSysmlVersXml(lecture, nom, uml?format:'sysml2', L);   // ReqIF : 101
    _capSysml={lecture, nom, doc, L:L||null, format:rq?'reqif':uml?format:'sysml2'};
    if(rq) capReqifTypesHumains(lecture); else capSysmlTypesHumains(lecture);
    capCurrentView='home';
    if(typeof _capProjetPage!=='undefined') _capProjetPage.nom='';
    capApplyXmlDoc(doc, nom);
    _capSources=_capSourcesPend;   // fichiers d'origine, relus après un 🌐 changement de langue (20)
    if(typeof _capWatch!=='undefined'&&_capWatch){ _capWatch.handle=null; _capWatch.file=null; if(typeof capWatchUpdateUi==='function') capWatchUpdateUi(); }   // pas de 🔄 suivi d'un .sysml
    capWelcomeStatus('',''); capShowWelcome(false);
    const d=capSysmlDiagnostics();
    if((d.erreurs||d.avertissements)&&!uml&&!rq) setTimeout(()=>capToast(_L(`🧩 SysML v2 : ${d.erreurs} erreur(s), ${d.avertissements} avertissement(s) — détail dans 🏗 Architecture › 🧩 SysML v2`)),500);
    if(d.liste.length&&uml) setTimeout(()=>capToast(_L(`🧬 ${capSyNomFormat()} : ${capUmlImpactTexte(capUmlParImpact(d.liste))} — détail dans 🏗 Architecture › 🧬 UML / SysML v1`)),500);   // par impact réel (98)
    if(airdRetire&&typeof capWatchFlash==='function') setTimeout(()=>capWatchFlash(_L(`🔲 Diagrammes de l'ancien modèle (« ${airdRetire} ») retirés`)),700);
  }catch(err){
    _capSysml={lecture:null, nom:'', doc:null, L:null, format:''};
    capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true);
  }
}

/** Oublie la lecture SysML quand un autre document (Capella) est appliqué ; appelée en tête de `capApplyXmlDoc` (20).
 * @param {Document} doc - Document qui va être affiché
 */
function capSysmlAvantModele(doc){ if(_capSysml.lecture&&doc!==_capSysml.doc) _capSysml={lecture:null, nom:'', doc:null, L:null, format:''}; _capSyVues.cle=''; _capSyVues.sel=''; }

/** Convertit une lecture en document XML « façon Capella » : un élément XML par élément du modèle, imbriqué comme dans le modèle,
 * `xsi:type="sysml:<métaclasse>"` (SysML v2) ou `xsi:type="uml:<type>"` (UML / SysML v1 : stéréotype SysML ou métaclasse), attributs
 * littéraux (nom, déclaration, mot-clé, famille, visibilité, direction, multiplicité, valeur, documentation → description, fichier, ligne ;
 * UML : métaclasse, stéréotypes, agrégation, propriétés des stéréotypes — texte d'une exigence… —) et références en attributs « #id »
 * (typedBy, specializes, type, general, client, supplier, source, target, extremites…), que le panneau de détail, le ▤ Tableau et la
 * 🗺 Relation Map résolvent comme celles d'un .capella.
 * @param {object} lec - Lecture
 * @param {string} nom - Nom du modèle (racine)
 * @param {string} [format] - `sysml2` (défaut), `uml` ou `sysml1`
 * @param {object} [L] - Lecteur (version notée sur la racine) ; défaut : lecteur SysML v2
 * @returns {Document} Document XML
 */
function capSysmlVersXml(lec, nom, format, L){
  const uml=!!format&&format!=='sysml2', pre=uml?'uml':'sysml', lecteur=uml?'ArcatureLecteurUml':'ArcatureLecteurSysml', version=((L||(capSysmlDispo()?ArcatureLecteurSysml:{})).version)||'';
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
    if(uml){   // UML / SysML v1 : métaclasse, stéréotypes, agrégation, propriétés des stéréotypes (« Requirement.text »…)
      if(e.metaclasse&&e.metaclasse!==e.type) a.metaclasse=e.metaclasse;
      if(e.stereotypes&&e.stereotypes.length) a.stereotypes=e.stereotypes.join(' ');
      if(e.agregation&&e.agregation!=='none') a.agregation=e.agregation;
      if(e.stereotypes&&e.stereotypes.length&&!e.technique&&typeof lec.attributs==='function') (lec.attributs(e.id)||[]).forEach(x=>{ if(/:/.test(x.nom)){ const k=x.nom.replace(/^[A-Za-z0-9_]+:/,''); if(/^[A-Za-z_][\w.-]*$/.test(k)&&!(k in a)) a[k]=x.valeur; } });
    }
    Object.entries(e.references||{}).forEach(([k,ids])=>{ const l=(ids||[]).filter(i=>i&&byId[i]); if(l.length) a[k]=l.map(i=>'#'+i).join(' '); });
    const ex=(e.extremites||[]).filter(i=>i&&byId[i]); if(ex.length) a.extremites=ex.map(i=>'#'+i).join(' ');
    return a;
  };
  const out=[], vus=new Set();
  const ecrire=(e, prof)=>{
    if(vus.has(e.id)||prof>400) return; vus.add(e.id);
    const a=attrs(e), kids=(e.enfants||[]).map(i=>byId[i]).filter(Boolean);
    out.push(`<ownedElements xsi:type="${pre}:${esc(String(e.type||'Element').replace(/[^\w.-]/g,'_'))}" id="${esc(e.id)}"${Object.entries(a).map(([k,v])=>` ${k}="${esc(v)}"`).join('')}${kids.length?'>':'/>'}`);
    if(kids.length){ kids.forEach(k=>ecrire(k, prof+1)); out.push('</ownedElements>'); }
  };
  racines.forEach(e=>ecrire(e,0));
  els.forEach(e=>{ if(!vus.has(e.id)) ecrire(e,0); });   // éléments dont le propriétaire a été écarté : au premier niveau
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<${pre}:Model xmlns:${pre}="urn:arcalyse:${pre}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${esc(nom)}" lecteur="${lecteur} ${esc(version)}">\n${out.join('\n')}\n</${pre}:Model>`;
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error(uml?_L('Conversion UML → XML impossible'):_L('Conversion SysML v2 → XML impossible'));
  return doc;
}

/** Complète le registre des types (noms lisibles `CAP_HUMAN_NAMES`, types techniques `CAP_TECHNICAL_TYPES`) avec les métaclasses SysML rencontrées.
 * @param {object} lec - Lecture
 */
function capSysmlTypesHumains(lec){
  const L=capSyL()||{}, uml=capSyUml(), tech={}, types=new Set(), meta={};
  lec.elements().forEach(e=>{ types.add(e.type); if(e.metaclasse) meta[e.type]=e.metaclasse; const t=tech[e.type]||(tech[e.type]={oui:0, non:0}); if(e.technique) t.oui++; else t.non++; });
  types.forEach(t=>{
    if(!CAP_HUMAN_NAMES[t]&&uml){ const mc=meta[t]||''; CAP_HUMAN_NAMES[t]={h:t.replace(/([a-z])([A-Z])/g,'$1 $2'), d:mc&&mc!==t?_L(`Stéréotype ${capSyNomFormat()} appliqué à la métaclasse UML ${mc}`):_L('Métaclasse UML')}; }
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

/** Diagnostics de la lecture affichée, sans ceux des règles désactivées par le 🩺 profil (`capChkRegleOn`, 14) : ce sont eux que
 * comptent 🏠 Accueil, 💚 Santé, le tableau de bord et l'onglet 🩺 Diagnostics.
 * @param {boolean} [tous] - Garder aussi les règles désactivées (Σ Répartition par règle, 88)
 * @returns {{liste:object[], erreurs:number, avertissements:number, masques:number}} masques : diagnostics des règles désactivées
 */
function capSysmlDiagnostics(tous){
  const lec=_capSysml.lecture; if(!lec) return {liste:[], erreurs:0, avertissements:0, masques:0};
  const brut=lec.diagnostics||[], liste=tous||typeof capChkRegleOn!=='function'?brut:brut.filter(d=>capChkRegleOn(d.code||d.regle||''));
  const err=liste.filter(d=>d.severite==='erreur').length;
  return {liste, erreurs:err, avertissements:liste.filter(d=>d.severite==='avertissement').length, masques:brut.length-liste.length};
}

/** Contrôles 🩺 d'un modèle lu par un lecteur d'Arcature : diagnostics (erreurs ✖, avertissements ⚠), rendus par `capDiagHtml` et repris
 * par 💚 Santé & contrôles (69) et le 🩺 profil (14). Vide sans lecture du format demandé.
 * @param {string} [format] - `sysml2` (défaut : vue `ana:sysml`) ou `uml` (vue `ana:uml` : modèles UML et SysML v1)
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capSyChecks(format){
  if(!_capSysml.lecture||(format==='uml')!==capSyUml()||(format==='reqif')!==(_capSysml.format==='reqif')) return [];
  if(format==='reqif') return capReqifChecks();   // 101
  if(capSyUml()) return capUmlChecks();   // 88 : diagnostics de la validation (contraintes UML, SysML, UAF)
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
function capSyRelLibelle(rel){ try{ return capSyL().libelleRelation(rel,'sortant')||rel; }catch(e){ return rel; } }

/** Index des liaisons du lecteur par relation et par sens, pour le moteur de chemin (21) et la ▦ Matrice (91) :
 * clé « relation> » (de la source vers la cible) ou « relation< » (en sens inverse) → Map id → ids atteints. En cache dans `_capAnaCache`.
 * @returns {Object<string, Map<string,string[]>>} Index */
function capMcSyIndex(){
  if(_capAnaCache.mcSy) return _capAnaCache.mcSy;
  const ix={}, put=(k,a,b)=>{ const m=ix[k]||(ix[k]=new Map()); let l=m.get(a); if(!l) m.set(a,l=[]); l.push(b); };
  capSysmlLiaisons().forEach(l=>{ if(!l.source||!l.cible) return; put(l.relation+'>',l.source,l.cible); put(l.relation+'<',l.cible,l.source); });
  return _capAnaCache.mcSy=ix;
}

/** Propriétés « liaison du lecteur » proposées par le moteur de chemin (colonne par chemin du ▤ Tableau, relation par chemin de la
 * ▦ Matrice) pour un type : une par relation, sens et type atteint réellement observés. Vide pour un modèle Capella.
 * @param {string} metaclass - Type de départ de l'étape
 * @returns {object[]} Propriétés {key, label, kind:'sy', relKey, direction, resultType}
 */
function capMcSyProps(metaclass){
  if(!_capSysml.lecture) return [];
  const lib=(r,s)=>{ try{ return capSyL().libelleRelation(r,s)||r; }catch(e){ return r; } }, props=[];
  Object.entries(capMcSyIndex()).forEach(([k,m])=>{
    const rel=k.slice(0,-1), fwd=k.endsWith('>'), types=new Set();
    m.forEach((ids,id)=>{ const e=capGetElementById_(id); if(!e||e.typeName!==metaclass) return; ids.forEach(t=>{ const x=capGetElementById_(t); if(x) types.add(x.typeName); }); });
    types.forEach(rt=>props.push({key:'sy:'+rel+':'+(fwd?'fwd':'rev')+':'+rt, label:fwd?lib(rel,'sortant')+' →':'← '+lib(rel,'entrant'), kind:'sy', relKey:rel, direction:fwd?'fwd':'rev', resultType:rt}));
  });
  return props;
}

/** Pas du moteur de chemin le long d'une liaison du lecteur (propriété de `capMcSyProps`).
 * @param {object} el - Élément de départ (capAllElements)
 * @param {object} prop - Propriété {relKey, direction, resultType}
 * @returns {object[]} Éléments atteints du type attendu
 */
function capMcSyPas(el, prop){
  const m=capMcSyIndex()[prop.relKey+(prop.direction==='fwd'?'>':'<')];
  return m?(m.get(el.id)||[]).map(capGetElementById_).filter(x=>x&&x.typeName===prop.resultType):[];
}

/** Déclare les relations SysML comme critères de la 🗺 Relation Map (`RCFG`, clé « sysml:<relation> ») ; appelée par
 * `capInjectCapellaRelsToCriteria` (20). Sans modèle SysML : rien. */
function capSysmlCriteres(){
  if(!_capSysml.lecture) return;
  const presentes=new Set(capSysmlLiaisons().map(l=>l.relation));
  presentes.forEach(rel=>{
    const key='sysml:'+rel, st=CAP_SY_REL_STYLE[rel]||['#8b949e',''];
    if(!RCFG[key]) RCFG[key]={color:st[0], dash:st[1], open:false, diamond:rel==='composition', hollowDiamond:rel==='reference', circle:false, noArrow:false, _capella:true, label:''};
    RCFG[key].label=(capSyUml()?_L('UML — '):_capSysml.format==='reqif'?'ReqIF — ':_L('SysML — '))+capSyRelLibelle(rel);
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

/** Cases « Fichiers du projet » de l'en-tête de 🏠 Accueil pour un modèle SysML v2 (56, `capHomeCase`) : modèle (fichiers, éléments),
 * vues calculées, lecture (diagnostics du lecteur).
 * @returns {string} HTML
 */
function capSysmlCasesAccueil(){
  const lec=_capSysml.lecture; if(!lec) return '';
  const esc=capEsc, D=capSysmlDiagnostics(), n=lec.elements().length-1, fic=lec.fichiers||[], vues=capSyVuesListe();
  const noms=vues.slice(0,4).map(v=>esc(v.nom||v.titre||'')).join(' · ')+(vues.length>4?' …':'');
  const etat=D.erreurs?'err':D.avertissements?'todo':'ok';
  return capHomeCase(_L('Modèle'), esc(_capSysml.nom||capCurrentFileName||'—'), _L(`${fic.length||1} fichier(s) · ${n} éléments`), 'ok')+
    capHomeCase(_L('Vues calculées'), _L(`${vues.length} vue(s)`), noms, vues.length?'ok':'none', vues.length?`<button type="button" class="cap-lf-btn" data-nav="diag">${_L('🔲 Ouvrir')}</button>`:'')+
    capHomeCase(_L('Lecture'), D.erreurs||D.avertissements?_L(`${D.erreurs} erreur(s) · ${D.avertissements} avertissement(s)`):_L('Sans diagnostic'), _L('Diagnostics du lecteur SysML v2'), etat,
      D.liste.length?`<button type="button" class="cap-lf-btn" data-a="sy-diag">${_L('Voir')}</button>`:'');
}

/** Vue 🧩 SysML v2 (sous-vue `sysml` de 🔬 Analyses) : éléments (par famille et type), liaisons (par relation), 🩺 diagnostics, fichiers.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderSysml(box){
  const lec=_capSysml.lecture, st=_capSy, esc=capEsc, uml=capSyUml();
  if(!uml&&!capSysmlDispo()){ box.innerHTML=`<div class="phl-empty">${_L('Lecteur SysML v2 absent de cette version.')}</div>`; return; }
  if(!lec){ box.innerHTML=`<div class="phl-empty">${_L('Le modèle affiché n\'est pas un modèle SysML v2 : ouvrez un fichier .sysml, une archive .kpar ou un dossier de .sysml (📁 Dossier du projet).')}</div>`; return; }
  const L=capSyL(), q=(st.q||'').trim().toLowerCase(), els=lec.elements().filter(e=>!e.racine&&!e.projet), D=capSysmlDiagnostics(), LI=capSysmlLiaisons();
  const avecTextes=(lec.fichiers||[]).some(f=>f.texte!=null);   // UML : fichiers sans texte (XMI, archives) : pas d'onglet 📄
  if(!avecTextes&&st.view==='fic') st.view='els';
  const fams=L.familles||{STR:'Structure', BEH:'Comportement', REQ:'Exigences & cas', ORG:'Organisation'};
  const puces=(items, cur, key, tout)=>`<span class="tb-grp">`+[['',tout],...items].map(([k,l,n])=>`<button class="cap-lf-btn${cur===k?' active':''}" data-${key}="${esc(k)}">${esc(l)}${n!=null?` <span class="ana-dim">${n}</span>`:''}</button>`).join('')+`</span>`;
  let body='', header=[], rows=[], cnt='', bar='';
  if(st.view==='els'){
    const parFam={}, parType={}; els.forEach(e=>{ parFam[e.famille]=(parFam[e.famille]||0)+1; parType[e.type]=(parType[e.type]||0)+1; });
    const shown=els.filter(e=>(!st.fam||e.famille===st.fam)&&(!st.type||e.type===st.type)&&capXtHas(q, e.nom, e.nomQualifie, e.declaration, e.type, e.motCle, e.fichier));
    header=[_L('Famille'),_L('Type'),_L('Nom'),_L('Nom qualifié'),_L('Déclaration'),_L('Fichier : ligne')];
    rows=shown.map(e=>[fams[e.famille]||e.famille, capAnaHuman(e.type), capCx(capSyNom(e), e.id), e.nomQualifie||'', e.declaration||'', capSyPosition(e)]);
    if(uml){ header=[_L('Famille'),_L('Type'),_L('Métaclasse'),_L('Nom'),_L('Nom qualifié'),_L('Déclaration'),_L('Ligne')]; rows=shown.map(e=>[fams[e.famille]||e.famille, capAnaHuman(e.type), e.metaclasse||'', capCx(capSyNom(e), e.id), e.nomQualifie||'', e.declaration||'', e.ligne?String(e.ligne):'']); }
    body=uml?capXtTable(header, shown.map(e=>[`<span style="color:${CAP_SY_FAM_COULEUR[e.famille]||'var(--c-dim)'}">${esc(fams[e.famille]||e.famille||'')}</span>`, `${capIco(e.id)} <span class="ana-dim">${esc(capAnaHuman(e.type))}</span>`,
      `<span class="ana-dim">${esc(e.metaclasse||'')}</span>`, capDetLink(e.id, capSyNom(e), 'font-weight:600'), `<span class="ana-dim">${esc(e.nomQualifie||'')}</span>`, e.declaration?`<code style="font-size:11px">${esc(e.declaration.length>120?e.declaration.slice(0,119)+'…':e.declaration)}</code>`:'', `<span class="ana-dim">${e.ligne||''}</span>`]))
      :capXtTable(header, shown.map(e=>[`<span style="color:${CAP_SY_FAM_COULEUR[e.famille]||'var(--c-dim)'}">${esc(fams[e.famille]||e.famille||'')}</span>`, `${capIcoType(e.type)} <span class="ana-dim">${esc(e.motCle||capAnaHuman(e.type))}</span>`,
      capDetLink(e.id, capSyNom(e), 'font-weight:600'), `<span class="ana-dim">${esc(e.nomQualifie||'')}</span>`, `<code style="font-size:11px">${capXtShort(e.declaration||'',120)}</code>`, `<span class="ana-dim">${esc(capSyPosition(e))}</span>`]));
    const types=Object.entries(parType).sort((a,b)=>b[1]-a[1]);
    bar=puces(Object.keys(fams).filter(k=>parFam[k]).map(k=>[k, fams[k], parFam[k]]), st.fam, 'syfam', _L('Toutes familles'))+
      ` <select data-xs="type" class="phl-filter-input" title="${_L('Métaclasse')}"><option value="">${_L('Tous types')} (${els.length})</option>${types.map(([t,n])=>`<option value="${esc(t)}"${st.type===t?' selected':''}>${L.motCle?esc(L.motCle(t)||t)+' · ':''}${esc(t)} (${n})</option>`).join('')}</select> `+
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
    body=(uml?capUmlDiagResume():'')+capDiagHtml(capSyChecks(uml?'uml':undefined));   // format requis : sans lui, liste vide pour un modèle UML
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
  const tabs=capXtViewBtns([['els',_L('🧩 Éléments')],['lia',_L('🔗 Liaisons')],['diag',_L(`🩺 Diagnostics${D.liste.length?` (${D.liste.length})`:''}`)],...(avecTextes?[['fic',_L('📄 Fichiers')]]:[])], st.view);
  box.innerHTML=(uml?capUmlEntete():'')+capXtBar(tabs+(bar?`<span class="tsep"></span>${bar}`:''), cnt, st.view!=='diag'&&!!rows.length)+body;
  capXtBind(box, st, capRenderSysml, ()=>capCsvExport(uml?_L('uml.csv'):_L('sysml-v2.csv'), header, rows));
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
  if(capSyUml()) return capUmlDetail(id, secTitle);   // 88
  if(_capSysml.format==='reqif') return capReqifDetail(id, secTitle);   // 101
  const esc=capEsc, L=capSyL(), fams=L.familles||{};
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
  const sy=()=>!capSyUml()&&_capSysml.format!=='reqif';
  if(typeof capReqifDashCatalog==='function') capReqifDashCatalog(add);   // 📑 ReqIF (101)
  const els=()=>_capSysml.lecture&&sy()?_capSysml.lecture.elements().filter(e=>!e.racine&&!e.projet):[];
  if(typeof capUmlDashCatalog==='function') capUmlDashCatalog(add);   // 88 : indicateurs UML / SysML v1
  add(G,'sy.n',_L('SysML v2 — éléments'),'n',()=>({n:els().length, sub:_L(`${(_capSysml.lecture&&_capSysml.lecture.fichiers||[]).length} fichier(s)`)}));
  add(G,'sy.fam',_L('SysML v2 — éléments par famille'),'series',()=>{ const m={}; els().forEach(e=>{ m[e.famille]=(m[e.famille]||0)+1; }); return {cats:Object.entries(m).map(([k,v])=>({l:fams()[k]||k, v, c:CAP_SY_FAM_COULEUR[k]})).filter(c=>c.v)}; });
  add(G,'sy.type',_L('SysML v2 — éléments par métaclasse'),'series',()=>{ const m={}; els().forEach(e=>{ m[e.type]=(m[e.type]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>({l:k, v}))}; });
  add(G,'sy.rel',_L('SysML v2 — liaisons par relation'),'series',()=>{ const m={}; (!sy()?[]:capSysmlLiaisons()).forEach(l=>{ m[l.relation]=(m[l.relation]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({l:capSyRelLibelle(k), v, c:(CAP_SY_REL_STYLE[k]||[])[0]}))}; });
  add(G,'sy.vues',_L('SysML v2 — vues calculées par genre'),'series',()=>{ const m={}; (!sy()?[]:capSyVuesListe()).forEach(v=>{ m[v.libelleGenre]=(m[v.libelleGenre]||0)+1; }); return {cats:Object.entries(m).map(([l,v])=>({l, v}))}; });
  add(G,'sy.diag',_L('SysML v2 — diagnostics du lecteur'),'series',()=>{ const D=!sy()?{erreurs:0, avertissements:0}:capSysmlDiagnostics(); return {cats:[{l:_L('Erreurs'), v:D.erreurs, c:'#f85149'},{l:_L('Avertissements'), v:D.avertissements, c:'#e3b341'}].filter(c=>c.v)}; },_L('Erreurs et avertissements du lecteur SysML v2 d\'Arcature'));
}

/* ── 🖼 Vues des lecteurs dans 🔲 Diagrammes (SysML v2 : vues calculées depuis le texte ; UML / SysML v1 : diagrammes du fichier et
   vues calculées, 88) ── L'enveloppe de la vue 🔲 (barre du haut, explorateur classé, ▣ carte, planches, ⧉ comparaison, ℹ Infos,
   section « Diagrammes » du détail) est celle de 54, commune avec Capella : ici seulement la partie droite (`#cdg-sy`) — deux lignes
   au gabarit de la visionneuse (identité · recherche Ctrl+F · thème · ⬇▾ · ✕ ; 📝 notes · ⧩ filtres · zoom · ▣ · 🖼 / ≡), dessin SVG
   du lecteur (clic → panneau de détail par `data-sem`, main, Ctrl+molette, 📝 notes de revue : 55), rendu textuel coloré, carte sous
   l'explorateur (`#cdg-carte-sy`) ou dans la vue, raccourcis clavier. */

/** État de la partie droite : vue ouverte (`cle`, dernière rendue `rendue`), mode visuel / texte, zoom (0 = ajusté à la largeur), taille du
 * texte, recherche dans le dessin (`q`, résultat courant `hit`), élément mis en évidence, thème (`auto` = celui d'Arcalyse), filtres
 * d'affichage (étiquettes des liens, compartiments, liens par genre masqués), ▣ carte dans la vue affichée (`carteVue`), défilement à rétablir. */
var _capSyVues={cle:'', rendue:'', mode:'visuel', zoom:0, texteZoom:1, q:'', hit:0, sel:'', theme:'auto', filtres:{etiq:true, comp:true, genres:{}}, carteVue:true, defil:null, grille:false};   // grille : # quadrillage du dessin (touche G)

/** Icône d'un genre de diagramme ou de vue, dessinée par le lecteur d'Arcature (`iconeVue`, SVG de classe `ico`) : cadre de
 * diagramme et son étiquette, couleur propre au genre (la même pour les genres semblables d'UML et de SysML) ; étiquette pleine
 * marquée « S » pour un diagramme SysML (SysML v2, et SysML v1 d'après l'outil qui l'a écrit : champ `sysml` de la vue).
 * @param {string|{genre:string, sysml:boolean}} genre - Genre (`generale`, `interconnexion`, `etats`, `actions` ; UML / SysML v1 :
 *   `bdd`, `classes`, `activite`…), ou la vue elle-même (genre et marque SysML)
 * @param {number} [taille] - Côté en pixels (14 par défaut)
 * @returns {string} SVG, ou '' pour un genre inconnu (ou un lecteur sans icônes)
 */
function capSyVueIco(genre, taille){
  const vue=genre&&typeof genre==='object'?genre:null, g=vue?vue.genre:genre;
  if(capSyUml()){ try{ return capSyL().iconeVue(vue?{genre:g, sysml:!!vue.sysml}:g, taille||14)||''; }catch(e){ return ''; } }   // 88 : genres des diagrammes UML / SysML v1
  if(!capSysmlDispo()||typeof ArcatureLecteurSysml.iconeVue!=='function') return '';
  try{ return ArcatureLecteurSysml.iconeVue(g, taille||14)||''; }catch(e){ return ''; }
}

/** Vue de la liste désignée par son identifiant de représentation « sy:<clé> » (💬 Revue, 🔍 palette).
 * @param {string} uid - Identifiant « sy:<clé> »
 * @returns {object|null} Vue de `capSyVuesListe`, ou null
 */
function capSyVueParUid(uid){ const cle=String(uid||'').replace(/^sy:/,''); return capSyVuesListe().find(v=>v.cle===cle)||null; }

/** Vue montrée par 🔲 Diagrammes : toutes celles d'un modèle SysML v2 (son texte n'a pas de diagrammes : le lecteur les calcule) ;
 * pour UML / SysML v1, seulement les diagrammes et tableaux enregistrés dans le fichier (Cameo, Enterprise Architect, Papyrus),
 * pas les vues que le lecteur calcule depuis le modèle (choix du propriétaire, 2026-11-05).
 * @param {object} v - Vue du lecteur (`origine`)
 * @returns {boolean}
 */
function capSyVueMontree(v){ return !!v&&!(capSyUml()&&v.origine==='calculee'); }

/** Vues du modèle affiché (liste des diagrammes), gardées avec la lecture ; filtrées par `capSyVueMontree`.
 * @returns {object[]} [{cle, genre, sigle, libelleGenre, nom, element, origine, tableau}] */
function capSyVuesListe(){
  const lec=_capSysml.lecture; if(!lec||typeof lec.vues!=='function') return [];
  if(!_capSysml.vues){ try{ _capSysml.vues=(lec.vues()||[]).filter(capSyVueMontree); }catch(e){ console.warn('SysML : vues',e); _capSysml.vues=[]; } }
  return _capSysml.vues;
}

/** Une vue calculée complète (formes, liens, SVG, texte), calculée une fois par lecture. @param {string} cle - Clé de la vue @returns {object|null} */
function capSyVue(cle){
  const lec=_capSysml.lecture; if(!lec||!cle||typeof lec.vue!=='function') return null;
  const c=_capSysml.vueCache||(_capSysml.vueCache={});
  if(!(cle in c)){ try{ c[cle]=lec.vue(cle)||null; }catch(e){ console.warn('SysML : vue',cle,e); c[cle]=null; } }
  return c[cle];
}

/** Vues proposées sur un élément (filtrées par `capSyVueMontree`). @param {string} id - Identifiant @returns {object[]} */
function capSyVuesPour(id){ const lec=_capSysml.lecture; if(!lec||typeof lec.vuesPour!=='function') return []; try{ return (lec.vuesPour(id)||[]).filter(capSyVueMontree); }catch(e){ return []; } }

/** Représentation commune (54) d'une vue du lecteur : `uid` « sy:<clé> », `type` = libellé du genre, `kind` = genre du lecteur, `couche` =
 * famille (STR / BEH / REQ / ORG : couleur des badges et des planches), `origine` (`cameo`, `ea`, `papyrus`, `calculee`) et son libellé,
 * `element` porteur ; `genre` = `diagramme` (nature, comme pour Capella).
 * @param {object} v - Descripteur du lecteur (`vues()`, `vuesPour`, ou la vue elle-même)
 * @returns {object} Représentation
 */
function capSyVueRep(v){
  const L=capSyL()||{}, G=(L.genresVues||{})[v.genre]||{}, O=L.origines||{}, origine=v.origine||'calculee';
  return {uid:'sy:'+v.cle, cle:v.cle, nom:v.nom||'', type:v.libelleGenre||G.libelle||v.genre||'', sigle:v.sigle||G.sigle||'', genre:v.tableau?'tableau':'diagramme', kind:v.genre||'', sysml:!!v.sysml,
    couche:G.famille||'', origine, libelleOrigine:v.libelleOrigine||O[origine]||(origine==='calculee'?_L('Vue calculée'):origine), element:v.element||''};
}

/** Vues du lecteur présentées comme des représentations communes (explorateur, planches, 🔍 palette, 💬 Revue, ◀ ▶ historique), gardées avec la lecture. @returns {object[]} */
function capSyVuesReps(){
  if(!_capSysml.lecture) return [];
  if(!_capSysml.reps) _capSysml.reps=capSyVuesListe().map(capSyVueRep);
  return _capSysml.reps;
}

/** Thème des SVG du lecteur : celui choisi dans la barre (`_capSyVues.theme`), sinon celui d'Arcalyse. @returns {'clair'|'sombre'} */
function capSyTheme(){ const t=typeof _capSyVues!=='undefined'&&_capSyVues?_capSyVues.theme:'auto'; if(t==='clair'||t==='sombre') return t; return typeof capIsLight==='function'&&capIsLight()?'clair':'sombre'; }   // appelée par applyTheme (02) dès l'initialisation, avant ce module

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
  const L=capSyL(), id=capSyUml()?'uml-svg-css':'sy-svg-css';   // une feuille par lecteur (SysML v2 : classes syv-… ; UML : uvd-…, s1-…)
  if(document.getElementById(id)||!L||!L.svgCss) return;
  const st=document.createElement('style'); st.id=id; st.textContent=capSyCssPortee(L.svgCss); document.head.appendChild(st);
}

/** Change le thème des SVG affichés quand celui d'Arcalyse change (appelée par `applyTheme`, 02) ou que la barre en choisit un autre. */
function capSyVuesTheme(){ const th=capSyTheme(); document.querySelectorAll('svg.sy-vue-svg, svg.sy-carte-svg').forEach(s=>{ s.classList.remove('clair','sombre'); s.classList.add(th); }); }

/** Ouvre une vue du lecteur dans 🔲 Diagrammes (explorateur, panneau de détail, 🔍 palette, 💬 Revue, ◀ ▶ historique).
 * @param {string} cle - Clé de la vue
 * @param {string} [id] - Élément à mettre en évidence
 */
function capSyVueOuvrir(cle, id){
  const st=_capSyVues; if(st.cle!==cle){ st.zoom=0; st.defil=null; st.q=''; st.hit=0; }
  st.cle=cle; st.sel=id||'';
  if(typeof _capDiag!=='undefined') _capDiag.actif='sy:'+cle;
  if(capCurrentView!=='diag'){ capNavOpen('diag'); return; }   // capRenderDiagrams (54) rend l'enveloppe puis cette partie
  const box=document.getElementById('cdg-sy'); if(box&&box.offsetParent!==null) capSyVuesRender(box);
  if(typeof capDiagMarquerActif==='function') capDiagMarquerActif();
}

/** Contexte de la vue affichée pour les notes de 💬 Revue (55) : identifiant « sy:<clé> », nom, SVG, zone qui porte le calque.
 * @returns {{uid:string, nom:string, svg:SVGSVGElement, zone:HTMLElement, vis:HTMLElement}|null} null si aucune vue n'est affichée en visuel ; `vis` : conteneur défilant (partie visible)
 */
function capSyRevCtx(){
  if(!_capSysml.lecture||!_capSyVues.cle) return null;
  const v=document.getElementById('cdg-sy'); if(!v||!v.offsetParent) return null;
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

/** ▣ Carte sous l'explorateur (`#cdg-carte-sy`, zone de 54 propre aux lecteurs) : même en-tête que pour Capella (▾ replier, ⇲ dans la vue,
 * ⇱ retour ; état `_capDiag.carte` / `carteReduite`, clics traités par `capDiagClic`), miniature du dessin à la largeur du volet, cadre de la
 * partie affichée ; vide sans vue visuelle ouverte. Appelée après chaque rendu de la partie droite et quand la largeur de l'explorateur change. */
function capSyCarteRender(){
  const z=document.getElementById('cdg-carte-sy'); if(!z) return;
  const st=_capSyVues, vue=st.cle&&_capSysml.lecture?capSyVue(st.cle):null;
  if(!vue||vue.tableau||st.mode!=='visuel'){ z.innerHTML=''; return; }   // tableau de Cameo (90) : pas de carte
  const D=_capDiag, pan=D.carte==='panneau', th=capSyTheme(), vb=vue.viewBox||[0,0,800,600];
  const tete=pan
    ?`<span class="cdg-carte-tog" data-carte-tog="1"><span class="cdg-tog">${D.carteReduite?'▸':'▾'}</span><b>${_L('▣ Carte')}</b></span><span style="flex:1"></span><button class="cap-lf-btn" data-carte="diagramme" title="${_L('Afficher la carte dans le diagramme')}">⇲</button>`
    :`<b>${_L('▣ Carte')}</b><span class="cdg-cnt">${_L('dans le diagramme')}</span><span style="flex:1"></span><button class="cap-lf-btn" data-carte="panneau" title="${_L('Afficher la carte sous l\'explorateur')}">⇱</button>`;
  const corps=pan&&!D.carteReduite?`<div class="sy-carte sy-carte-panneau" title="${_L('Carte : clic ou glisser pour se déplacer')}"><svg class="sy-carte-svg ${th}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${vue.svg}</svg><div class="sy-carte-vp"></div></div>`:'';
  z.innerHTML=`<div class="cdg-carte-tete">${tete}</div><div class="cdg-carte-corps"${corps?'':' hidden'}>${corps}</div>`;
  const box=document.getElementById('cdg-sy'), svg=box&&box.querySelector('svg.sy-vue-svg'), hote=svg&&svg.closest('.sy-vue-hote');
  if(corps&&svg&&hote) capSyCarte(z, hote, svg);
}

/** Partie droite de la vue 🔲 pour une lecture SysML / UML (conteneur `#cdg-sy`, dans l'enveloppe de 54) : ligne 1 (identité, recherche,
 * thème, ⬇▾, ✕), ligne 2 (📝 notes, ⧩ filtres, zoom, ▣, 🖼 / ≡), dessin ou texte ; la ▣ carte sous l'explorateur est rendue par
 * `capSyCarteRender`. Le défilement du dessin est rétabli quand la même vue est rendue de nouveau.
 * @param {HTMLElement} [box] - Conteneur `#cdg-sy`
 */
function capSyVuesRender(box){
  box=box||document.getElementById('cdg-sy'); if(!box) return;
  const esc=capEsc, st=_capSyVues, D=typeof _capDiag!=='undefined'?_capDiag:{carte:'panneau'};
  capSyVuesCss();
  const vues=capSyVuesListe(), uml=capSyUml();
  if(st.cle&&!vues.some(x=>x.cle===st.cle)&&!capSyVue(st.cle)) st.cle='';
  const vue=st.cle?capSyVue(st.cle):null, rep=vue?capSyVueRep(vue):null, vb=(vue&&vue.viewBox)||[0,0,800,600], th=capSyTheme();
  const h0=box.querySelector('.sy-vue-hote'); if(h0&&!st.defil&&st.rendue===st.cle) st.defil=[h0.scrollLeft,h0.scrollTop];
  let h='';
  if(!vue){
    h=`<div class="cdg-vide">${vues.length?(uml?_L(`${vues.length} diagramme(s) et tableau(x) enregistrés dans le fichier (Cameo, Enterprise Architect, Papyrus) : choisissez-en un à gauche (ou depuis le panneau de détail d'un élément).`):_L(`${vues.length} vue(s) calculée(s) depuis le texte SysML v2 : choisissez-en une à gauche (ou depuis le panneau de détail d'un élément).`)):(uml?_L('Aucun diagramme enregistré dans ce fichier (un .uml de Papyrus montre les siens avec son .notation : ouvrez les deux ensemble).'):_L('Aucune vue calculable dans ce modèle (pas de définition de part, d\'état ni d\'action).'))}</div>`;
  } else if(vue.tableau){
    h=capSyTabCorps(vue);   // tableau, matrice, Relation Map de Cameo (90)
  } else {
    const visuel=st.mode==='visuel', nNotes=typeof _capRev!=='undefined'?_capRev.comments.filter(c=>c.diag&&c.diag.uid==='sy:'+st.cle).length:0;
    const F=st.filtres, nF=(F.etiq?0:1)+(F.comp?0:1)+Object.values(F.genres).filter(v=>v===false).length;
    const genres=[...new Set((vue.liens||[]).map(l=>l.genre).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
    const opt=(v,l)=>`<option value="${v}"${st.theme===v?' selected':''}>${l}</option>`;
    // Ligne 1 : identité · recherche · thème · export · fermer
    h+=`<div class="sy-l1"><span class="cdg-ico">${capSyVueIco(vue,16)}</span><span class="cdg-sigle">${esc(rep.sigle)}</span><b class="sy-vue-titre" title="${esc(rep.type)}">${esc(vue.nom||'')}</b><span class="cdg-cnt">${esc(rep.libelleOrigine)}</span><span style="flex:1"></span>`+
      (visuel?`<span class="sy-chercher"><input id="sy-q" type="search" placeholder="${_L('Chercher (Ctrl+F)')}" value="${esc(st.q)}" title="${_L('Chercher dans le diagramme — Entrée : suivant · Maj+Entrée : précédent · Échap : effacer')}" autocomplete="off"><button class="cap-lf-btn" data-syq="-1" title="${_L('Résultat précédent (Maj+Entrée)')}">▲</button><button class="cap-lf-btn" data-syq="1" title="${_L('Résultat suivant (Entrée)')}">▼</button><span class="cdg-cnt" id="sy-q-n"></span></span>`:'')+
      (visuel?`<button class="cap-lf-btn${st.grille?' active':''}" id="sy-grille" title="${_L('Grille : quadrillage sous le dessin (G)')}">#</button>`:'')+
      `<select id="sy-theme" class="cap-lf-btn" title="${_L('Thème du dessin : celui d\'Arcalyse (Auto), clair ou sombre')}">${opt('auto',_L('◐ Auto'))}${opt('clair',_L('◐ Clair'))}${opt('sombre',_L('◐ Sombre'))}</select>`+
      `<span class="sy-menu-w"><button class="cap-lf-btn" id="sy-export-bt" title="${_L('Exporter : SVG, PNG, impression ou PDF, texte')}">⬇ ▾</button><div class="sy-menu" id="sy-export" hidden>`+
        `<button data-syexp="svg">${_L('SVG (vectoriel)')}</button><button data-syexp="png">${_L('PNG, taille réelle')}</button><button data-syexp="png2">${_L('PNG, haute définition (×2)')}</button><button data-syexp="imprimer">${_L('Imprimer / PDF…')}</button><button data-syexp="txt">${_L('Texte')}</button></div></span>`+
      `<button class="cap-lf-btn" id="sy-fermer" title="${_L('Fermer la vue')}">✕</button></div>`;
    // Ligne 2 : notes · filtres · zoom · carte · mode
    h+=`<div class="sy-l2">`+
      (typeof _capRev!=='undefined'?`<span class="tb-grp"><span class="crv-drag" id="sy-crv-note" draggable="true" title="${_L('Note de revue : glissez-la sur la vue (déposée sur un élément, elle lui est liée) ou cliquez pour la poser au centre. Les notes forment un calque indépendant du modèle.')}"><span class="crv-drag-h">⠿</span>${_L('📝 Note')}</span><button class="cap-lf-btn${_capRev.layer?' active':''}" id="sy-crv-layer" title="${_L('Afficher ou masquer le calque des notes de revue')}">${_L('💬 Calque')} <span class="cdg-nb">${nNotes}</span></button></span><span class="cdg-vd-sep"></span>`:'')+
      (visuel?`<span class="sy-menu-w"><button class="cap-lf-btn${nF?' active':''}" id="sy-filtres-bt" title="${_L('Filtres d\'affichage, pour toutes les vues : étiquettes des liens, compartiments, liens par genre')}">⧩ ▾${nF?` <span class="cdg-nb">${nF}</span>`:''}</button><div class="sy-menu" id="sy-filtres" hidden>`+
        `<label><input type="checkbox" data-syf="etiq"${F.etiq?' checked':''}> ${_L('Étiquettes des liens')}</label><label><input type="checkbox" data-syf="comp"${F.comp?' checked':''}> ${_L('Compartiments')}</label>`+
        (genres.length?`<div class="sy-menu-t">${_L('Liens')}</div>`+genres.map(g=>`<label><input type="checkbox" data-syg="${esc(g)}"${F.genres[g]===false?'':' checked'}> ${esc(capSyRelLibelle(g))} <span class="cdg-cnt">${vue.liens.filter(l=>l.genre===g).length}</span></label>`).join(''):'')+
        `<button class="cap-lf-btn" data-syf="tout">${_L('Tout afficher')}</button></div></span><span class="cdg-vd-sep"></span>`:'')+
      `<span class="tb-grp"><button class="cap-lf-btn" data-syzoom="-" title="${visuel?_L('Dézoomer (Ctrl+molette)'):_L('Texte plus petit')}">−</button><span class="cdg-cnt sy-pct" id="sy-zoom-pct"></span><button class="cap-lf-btn" data-syzoom="+" title="${visuel?_L('Zoomer (Ctrl+molette)'):_L('Texte plus grand')}">+</button>`+
        (visuel?`<button class="cap-lf-btn" data-syzoom="tout" title="${_L('Voir toute la vue')}">⤢</button><button class="cap-lf-btn" data-syzoom="1" title="${_L('Taille réelle (100 %)')}">1:1</button><button class="cap-lf-btn" data-syzoom="sel" title="${_L('Centrer sur l\'élément choisi (F)')}">⌖</button>`:`<button class="cap-lf-btn" data-syzoom="0" title="${_L('Taille normale du texte')}">⊡</button>`)+`</span>`+
      (visuel&&D.carte==='diagramme'?`<button class="cap-lf-btn${st.carteVue?' active':''}" data-sycarte-vue="1" title="${_L('Carte : vue d\'ensemble et position affichée (clic : s\'y rendre)')}">▣</button>`:'')+
      `<span style="flex:1"></span><span class="cdg-cnt">${_L(`${vue.formes.length} forme(s) · ${vue.liens.length} lien(s)`)}</span>`+
      `<span class="tb-grp"><button class="cap-lf-btn${visuel?' active':''}" data-symode="visuel" title="${_L('Dessin de la vue')}">${_L('🖼 Visuel')}</button><button class="cap-lf-btn${!visuel?' active':''}" data-symode="texte" title="${_L('Rendu textuel de la vue')}">${_L('≡ Texte')}</button></span></div>`;
    if(!visuel) h+=`<pre class="sy-texte sy-vue-texte" style="font-size:${(11.5*(st.texteZoom||1)).toFixed(1)}px" title="${_L('Ctrl + molette : taille du texte')}">${capSyTexteHtml(vue.texte||'')}</pre>`;
    else h+=`<div class="sy-vue-droite-corps"><div class="sy-vue-hote" title="${_L('Glisser : déplacer la vue · Ctrl + molette : zoom · clic : élément')}"><div class="sy-vue-cadre"><svg class="sy-vue-svg ${th}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" data-w="${vb[2]}" data-h="${vb[3]}">${vue.svg}</svg></div></div>`+
      (D.carte==='diagramme'&&st.carteVue?`<div class="sy-carte" title="${_L('Carte : clic ou glisser pour se déplacer')}"><svg class="sy-carte-svg ${th}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${vue.svg}</svg><div class="sy-carte-vp"></div></div>`:'')+`</div>`;
  }
  box.innerHTML=h; st.rendue=st.cle;
  const svg=box.querySelector('svg.sy-vue-svg');
  if(svg){ const hote=svg.closest('.sy-vue-hote'); capSyZoomPoser(svg, hote, st.zoom); capSyPct(box);
    if(st.sel) svg.querySelectorAll(`[data-sem="${CSS.escape(st.sel)}"]`).forEach(g=>g.classList.add('sy-sel'));
    if(st.defil){ hote.scrollLeft=st.defil[0]; hote.scrollTop=st.defil[1]; st.defil=null; }
    else if(st.sel){ const g=svg.querySelector(`[data-sem="${CSS.escape(st.sel)}"]`); if(g) requestAnimationFrame(()=>capSyDefilerVers(hote, g)); }
    svg.addEventListener('click',e=>{ if(hote._deplace) return; const g=e.target.closest('[data-sem]'); if(!g) return; const id=g.dataset.sem; st.sel=id; svg.querySelectorAll('.sy-sel').forEach(x=>x.classList.remove('sy-sel')); svg.querySelectorAll(`[data-sem="${CSS.escape(id)}"]`).forEach(x=>x.classList.add('sy-sel')); if(capGetElementById_(id)) capOpenDetailById(id); });
    capSyVuesMain(hote, box);
    capSyFiltresAppliquer(svg, vue);
    capSyGrille(svg);
    capSyCarte(box, hote, svg);
    if(st.q) capSyChercher(box, 0);
    if(typeof capRevLayerEnsure==='function') setTimeout(capRevLayerEnsure,0);   // 💬 notes de revue sur la vue (55)
  }
  capSyCarteRender();
  const pre=box.querySelector('.sy-vue-texte');   // ≡ texte : Ctrl + molette = taille du texte
  if(pre) pre.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); capSyTexteZoom(box, e.deltaY<0?1.15:1/1.15); },{passive:false});
  // Commandes des deux lignes
  const q=box.querySelector('#sy-q');
  if(q){ q.oninput=()=>{ st.q=q.value; st.hit=0; capSyChercher(box, 0); };
    q.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); capSyChercher(box, e.shiftKey?-1:1); } else if(e.key==='Escape'){ q.value=''; st.q=''; capSyChercher(box, 0); } }; }
  box.querySelectorAll('[data-syq]').forEach(b=>b.onclick=()=>capSyChercher(box, +b.dataset.syq));
  const sel=box.querySelector('#sy-theme'); if(sel) sel.onchange=()=>{ st.theme=sel.value; capSyVuesTheme(); };
  const gr=box.querySelector('#sy-grille'); if(gr) gr.onclick=()=>capSyGrilleBascule(box);
  box.querySelectorAll('.sy-menu-w > button').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const m=b.nextElementSibling, o=m.hidden; box.querySelectorAll('.sy-menu').forEach(x=>{ x.hidden=true; }); m.hidden=!o; });
  box.querySelectorAll('[data-syexp]').forEach(b=>b.onclick=()=>{ const m=b.closest('.sy-menu'); if(m) m.hidden=true; capSyExporter(vue, b.dataset.syexp); });
  box.querySelectorAll('[data-syel]').forEach(b=>b.onclick=()=>capOpenDetailById(b.dataset.syel));   // 🔎 Élément d'un tableau (90)
  if(vue&&vue.tableau) capSyTabWire(box, vue, box);   // commandes du tableau (90)
  box.querySelectorAll('input[data-syf],input[data-syg]').forEach(c=>c.onchange=()=>{ if(c.dataset.syf) st.filtres[c.dataset.syf]=c.checked; else st.filtres.genres[c.dataset.syg]=c.checked; if(svg) capSyFiltresAppliquer(svg, vue); capSyFiltresBadge(box); });
  const tout=box.querySelector('button[data-syf="tout"]'); if(tout) tout.onclick=()=>{ st.filtres={etiq:true, comp:true, genres:{}}; capSyVuesRender(box); };
  const fermer=box.querySelector('#sy-fermer'); if(fermer) fermer.onclick=()=>{ st.cle=''; st.sel=''; if(typeof _capDiag!=='undefined') _capDiag.actif=''; capSyVuesRender(box); if(typeof capDiagMarquerActif==='function') capDiagMarquerActif(); };
  box.querySelectorAll('[data-symode]').forEach(b=>b.onclick=()=>{ st.mode=b.dataset.symode; capSyVuesRender(box); });
  box.querySelectorAll('[data-syzoom]').forEach(b=>b.onclick=()=>{ const k=b.dataset.syzoom;
    if(st.mode==='texte'){ capSyTexteZoom(box, k==='0'?0:(k==='+'?1.25:0.8)); return; }
    if(k==='tout') capSyZoom(box, 'tout'); else if(k==='1') capSyZoom(box, 'reel'); else if(k==='sel') capSyCentrer(box); else capSyZoom(box, k==='+'?1.25:0.8); });
  box.querySelectorAll('[data-sycarte-vue]').forEach(b=>b.onclick=()=>{ st.carteVue=!st.carteVue; capSyVuesRender(box); });
  if(!box._syMenus){ box._syMenus=true; document.addEventListener('click',e=>{ if(!e.target.closest('.sy-menu-w')) box.querySelectorAll('.sy-menu').forEach(x=>{ x.hidden=true; }); }); }
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

/** Pourcentage de zoom affiché dans la ligne 2 (100 % = taille du dessin du lecteur). @param {HTMLElement} box - Conteneur `#cdg-sy` */
function capSyPct(box){
  const p=box.querySelector('#sy-zoom-pct'), svg=box.querySelector('svg.sy-vue-svg'); if(!p||!svg) return;
  const w=+svg.dataset.w||1; p.textContent=Math.round((parseFloat(svg.style.width)||w)/w*100)+' %';
}

/** Zoom de la vue affichée : facteur multiplicatif, 0 = ajusté à la largeur, `tout` = toute la vue visible (⤢), `reel` = 100 % (1:1) ;
 * position de défilement conservée au prorata ; le dessin est redimensionné sur place (pas de nouveau rendu : la carte suit, le
 * calque des notes est redessiné).
 * @param {HTMLElement} box - Conteneur `#cdg-sy`
 * @param {number|string} f - Facteur, 0, `tout` ou `reel`
 * @param {number[]} [centre] - Point écran à garder sous le pointeur [x, y] (Ctrl + molette)
 */
function capSyZoom(box, f, centre){
  const st=_capSyVues, svg=box.querySelector('svg.sy-vue-svg'), hote=svg&&svg.closest('.sy-vue-hote'); if(!svg||!hote) return;
  const w=+svg.dataset.w||1, h=+svg.dataset.h||1, cur=parseFloat(svg.style.width)/w||1;
  let z;
  if(f==='tout') z=Math.max(0.05, Math.min((hote.clientWidth-24)/w, (hote.clientHeight-24)/h));
  else if(f==='reel') z=1;
  else z=f?Math.min(4, Math.max(0.1, cur*f)):0;
  const r=hote.getBoundingClientRect(), px=centre?centre[0]-r.left:r.width/2, py=centre?centre[1]-r.top:r.height/2;
  st.zoom=z;
  const k=capSyZoomPoser(svg, hote, z)/cur;
  hote.scrollLeft=(hote.scrollLeft+px)*k-px; hote.scrollTop=(hote.scrollTop+py)*k-py;
  capSyPct(box);
  if(hote._carteMaj) hote._carteMaj();
  if(typeof capRevLayerDraw==='function') requestAnimationFrame(capRevLayerDraw);
}

/** Fait défiler le conteneur pour amener un groupe du SVG au centre de la partie visible.
 * @param {HTMLElement} hote - Conteneur défilant
 * @param {Element} g - Groupe du SVG
 */
function capSyDefilerVers(hote, g){
  if(!hote||!g) return;
  const r=g.getBoundingClientRect(), hr=hote.getBoundingClientRect();
  hote.scrollLeft+=r.left+r.width/2-(hr.left+hr.width/2); hote.scrollTop+=r.top+r.height/2-(hr.top+hr.height/2);
  if(hote._carteMaj) hote._carteMaj();
}

/** ⌖ Centre la vue sur l'élément choisi (`sel`), sinon sur le résultat courant de la recherche ; sans l'un ni l'autre, montre toute la vue.
 * @param {HTMLElement} box - Conteneur `#cdg-sy` */
function capSyCentrer(box){
  const st=_capSyVues, svg=box.querySelector('svg.sy-vue-svg'), hote=svg&&svg.closest('.sy-vue-hote'); if(!svg||!hote) return;
  const g=(st.sel&&svg.querySelector(`[data-sem="${CSS.escape(st.sel)}"]`))||svg.querySelector('.sy-hit-cur');
  if(!g){ capSyZoom(box,'tout'); return; }
  capSyDefilerVers(hote, g);
}

/** 🔍 Recherche dans le dessin : formes et liens (`[data-sem]`) dont le texte propre contient la saisie ; résultats marqués `sy-hit`,
 * résultat courant `sy-hit-cur` amené au centre, compteur « i / n ».
 * @param {HTMLElement} box - Conteneur `#cdg-sy`
 * @param {number} sens - 0 : recalcul (résultat courant gardé), 1 / -1 : suivant / précédent
 */
function capSyChercher(box, sens){
  const st=_capSyVues, svg=box.querySelector('svg.sy-vue-svg'), n=box.querySelector('#sy-q-n'); if(!svg) return;
  svg.querySelectorAll('.sy-hit,.sy-hit-cur').forEach(x=>x.classList.remove('sy-hit','sy-hit-cur'));
  const q=(st.q||'').trim().toLowerCase();
  if(!q){ if(n) n.textContent=''; return; }
  const propre=g=>[...g.querySelectorAll('text')].filter(t=>t.closest('[data-sem]')===g).map(t=>t.textContent).join(' ').toLowerCase();   // texte du groupe sans celui des groupes imbriqués
  const L=[...svg.querySelectorAll('[data-sem]')].filter(g=>!g.classList.contains('sy-off')&&propre(g).includes(q));
  if(!L.length){ if(n) n.textContent='0'; return; }
  st.hit=((st.hit+(sens||0))%L.length+L.length)%L.length;
  L.forEach(g=>g.classList.add('sy-hit')); L[st.hit].classList.add('sy-hit-cur');
  if(n) n.textContent=`${st.hit+1} / ${L.length}`;
  capSyDefilerVers(svg.closest('.sy-vue-hote'), L[st.hit]);
}

/** ⧩ Filtres d'affichage appliqués au SVG (classe `sy-off`) : liens d'un genre masqué, étiquettes des liens, compartiments. Les liens sont
 * retrouvés par `data-lien` (SysML v2) ou `data-v` (UML), sinon par le `data-sem` de leur élément (groupe sans rectangle).
 * @param {SVGSVGElement} svg - Dessin
 * @param {object} vue - Vue du lecteur (`liens`)
 */
function capSyFiltresAppliquer(svg, vue){
  const F=_capSyVues.filtres;
  svg.querySelectorAll('.sy-off').forEach(x=>x.classList.remove('sy-off'));
  const grp=l=>svg.querySelector(`[data-lien="${CSS.escape(l.id)}"]`)||svg.querySelector(`[data-v="${CSS.escape(l.id)}"]`)||
    (l.element?[...svg.querySelectorAll(`[data-sem="${CSS.escape(l.element)}"]`)].find(g=>g.querySelector('path,line,polyline')&&!g.querySelector('rect')):null);
  (vue.liens||[]).forEach(l=>{ const g=grp(l); if(!g) return; if(F.genres[l.genre]===false) g.classList.add('sy-off'); else if(!F.etiq) g.querySelectorAll('text').forEach(t=>t.classList.add('sy-off')); });
  if(!F.comp) svg.querySelectorAll('.syv-c,.s1-compartiment').forEach(c=>c.classList.add('sy-off'));
}

/** Met à jour le bouton ⧩ (actif, nombre de filtres engagés). @param {HTMLElement} box - Conteneur `#cdg-sy` */
function capSyFiltresBadge(box){
  const F=_capSyVues.filtres, n=(F.etiq?0:1)+(F.comp?0:1)+Object.values(F.genres).filter(v=>v===false).length, b=box.querySelector('#sy-filtres-bt'); if(!b) return;
  b.classList.toggle('active',!!n); b.innerHTML='⧩ ▾'+(n?` <span class="cdg-nb">${n}</span>`:'');
}

/** ⬇ Export de la vue affichée : SVG (document autonome du lecteur, au thème affiché), PNG ×1 / ×2 (fond clair), impression (fenêtre
 * d'impression du navigateur, PDF par l'imprimante virtuelle), texte.
 * @param {object} vue - Vue du lecteur
 * @param {string} fmt - `svg` | `png` | `png2` | `imprimer` | `txt`
 */
async function capSyExporter(vue, fmt){
  if(!vue) return;
  const nom=capSafeFileName(vue.nom||'vue');
  if(fmt==='txt'){ capDownloadBlob(new Blob([vue.texte||''],{type:'text/plain'}), nom+'.txt'); return; }
  if(typeof vue.svgDocument!=='function') return;   // tableau de Cameo (90) : texte seulement
  const doc=vue.svgDocument({theme:fmt==='svg'?capSyTheme():'clair'});
  if(fmt==='svg'){ capDownloadBlob(new Blob([doc],{type:'image/svg+xml'}), nom+'.svg'); return; }
  const vb=vue.viewBox||[0,0,800,600];
  if(fmt==='imprimer'){
    const w=window.open('','_blank'); if(!w){ capAlert(_L('Le navigateur a bloqué la fenêtre : autorisez les fenêtres surgissantes pour cette page, puis recommencez.')); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${capEsc(vue.nom||'')}</title><style>body{margin:10mm;font-family:Segoe UI,Arial,sans-serif}h1{font-size:14pt;margin:0 0 6mm}svg{max-width:100%;height:auto}@page{size:${vb[2]>=vb[3]?'landscape':'portrait'}}</style></head><body><h1>${capEsc(vue.nom||'')}</h1>${doc}</body></html>`);
    w.document.close(); setTimeout(()=>{ w.focus(); w.print(); },300); return;
  }
  try{ const c=await capSvgToCanvas(doc, vb[2], vb[3], fmt==='png2'?2:1); capDownloadBlob(await capCanvasBlob(c,'image/png'), nom+'.png'); }
  catch(e){ capAlert(_L('⚠ Échec de l\'export : ')+(e&&e.message||e), {level:'err'}); }
}

/** Taille du texte du rendu ≡ Texte (facteur multiplicatif, ou 0 = taille normale), entre 0,5 et 3.
 * @param {HTMLElement} box - Conteneur `#cdg-sy`
 * @param {number} f - Facteur, ou 0
 */
function capSyTexteZoom(box, f){
  const st=_capSyVues, pre=box.querySelector('.sy-vue-texte'); if(!pre) return;
  st.texteZoom=f?Math.min(3, Math.max(0.5, (st.texteZoom||1)*f)):1;
  pre.style.fontSize=(11.5*st.texteZoom).toFixed(1)+'px';
  const p=box.querySelector('#sy-zoom-pct'); if(p) p.textContent=Math.round(st.texteZoom*100)+' %';
}

/** Déplacement à la main (glisser sur la vue) et zoom à la molette avec Ctrl, comme la visionneuse Capella ; un glisser n'ouvre pas l'élément.
 * @param {HTMLElement} hote - Conteneur défilant de la vue
 * @param {HTMLElement} box - Conteneur `#cdg-sy`
 */
function capSyVuesMain(hote, box){
  hote.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==1) return; if(e.target.closest('.crv-note,.crv-linkbar,.sy-carte')) return;
    const x0=e.clientX, y0=e.clientY, sl=hote.scrollLeft, stp=hote.scrollTop; let bouge=false;
    hote.classList.add('sy-main'); hote._deplace=false;
    const mv=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!bouge&&Math.abs(dx)+Math.abs(dy)<4) return;
      if(!bouge){ try{ hote.setPointerCapture(e.pointerId); }catch(err){ /* capture refusée : glisser quand même */ } }   // capture au début du glisser seulement : sinon le clic vise l'hôte et non l'élément
      bouge=true; hote._deplace=true; hote.scrollLeft=sl-dx; hote.scrollTop=stp-dy; };
    const fin=()=>{ hote.classList.remove('sy-main'); hote.removeEventListener('pointermove',mv); hote.removeEventListener('pointerup',fin); hote.removeEventListener('pointercancel',fin); setTimeout(()=>{ hote._deplace=false; },0); };
    hote.addEventListener('pointermove',mv); hote.addEventListener('pointerup',fin); hote.addEventListener('pointercancel',fin);
  });
  hote.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); capSyZoom(box, e.deltaY<0?1.2:1/1.2, [e.clientX, e.clientY]); },{passive:false});
}

/** ▣ Carte de la vue, comme le Zoom de Cameo : boîte de taille fixe (sous l'explorateur : largeur du volet × hauteur réglée par le séparateur
 * ↕ ; flottante : au format du dessin), fond gris, miniature du dessin calée en haut à gauche, échelle qui contient le dessin et la partie
 * affichée — le cadre peut donc déborder le dessin quand on dézoome. Cadre suivi au défilement et au zoom. Glisser le cadre le déplace (l'affichage suit) ; un clic ailleurs dans la carte y centre
 * l'affichage ; les carrés aux angles du cadre règlent la taille de l'affichage (zoom), l'angle opposé restant fixe. Aucune sélection
 * de texte ni d'élément depuis la carte.
 * @param {HTMLElement} v - Conteneur qui porte la carte (`#cdg-carte-sy` ou `#cdg-sy`)
 * @param {HTMLElement} hote - Conteneur défilant de la vue
 * @param {SVGSVGElement} svg - Dessin
 */
function capSyCarte(v, hote, svg){
  const carte=v.querySelector('.sy-carte'), vp=carte&&carte.querySelector('.sy-carte-vp'), mini=carte&&carte.querySelector('svg.sy-carte-svg'); if(!carte||!vp||!mini) return;
  const w=+svg.dataset.w||1, h=+svg.dataset.h||1, pan=carte.classList.contains('sy-carte-panneau'), box=hote.closest('#cdg-sy')||document.getElementById('cdg-sy');
  // Boîte de taille fixe (comme le Zoom de Cameo) : sous l'explorateur, largeur du volet × hauteur du séparateur ↕ (54) ; flottante, au format du dessin
  let cw, ch;
  if(pan){ cw=Math.max(60, carte.parentElement.clientWidth-12); ch=Math.max(60, (typeof _capDiag!=='undefined'&&_capDiag.carteH)||190); }
  else { cw=Math.min(220, Math.max(120, Math.round(w/h*110))); ch=Math.round(cw*h/w); }
  carte.style.width=cw+'px'; carte.style.height=ch+'px';
  if(!vp.querySelector('.sy-carte-h')) vp.innerHTML=['nw','ne','sw','se'].map(k=>`<span class="sy-carte-h sy-carte-h-${k}" data-h="${k}" title="${_L('Glisser : taille de l\'affichage (zoom)')}"></span>`).join('');
  const zw=()=>parseFloat(svg.style.width)||w, zh=()=>parseFloat(svg.style.height)||h;   // taille affichée du dessin (zoom courant)
  const vue=()=>{ const z=zw()/w; return [hote.scrollLeft/z, hote.scrollTop/z, hote.clientWidth/z, hote.clientHeight/z]; };   // partie affichée, en unités du dessin
  // Échelle de la carte : contient le dessin ET la partie affichée (qui peut le déborder : zone grise), figée pendant un glisser
  let k=1;
  const echelle=()=>{ const V=vue(); return Math.min(cw/Math.max(w, V[0]+V[2]), ch/Math.max(h, V[1]+V[3])); };
  const maj=()=>{ if(!carte._fige) k=echelle(); const V=vue();
    mini.setAttribute('width',Math.max(1, Math.round(w*k))); mini.setAttribute('height',Math.max(1, Math.round(h*k)));
    vp.style.left=Math.round(V[0]*k)+'px'; vp.style.top=Math.round(V[1]*k)+'px';
    vp.style.width=Math.max(8, Math.round(V[2]*k))+'px'; vp.style.height=Math.max(8, Math.round(V[3]*k))+'px'; };
  maj(); hote.addEventListener('scroll',maj); hote._carteMaj=maj;
  const unites=e=>{ const r=carte.getBoundingClientRect(); return [(e.clientX-r.left)/k, (e.clientY-r.top)/k]; };   // point de la carte en unités du dessin
  const suivre=(e, mv, fin)=>{ carte.setPointerCapture(e.pointerId); carte._fige=true;
    const stop=()=>{ carte.removeEventListener('pointermove',mv); carte.removeEventListener('pointerup',stop); carte.removeEventListener('pointercancel',stop); carte._fige=false; maj(); if(fin) fin(); };
    carte.addEventListener('pointermove',mv); carte.addEventListener('pointerup',stop); carte.addEventListener('pointercancel',stop); };
  carte.addEventListener('pointerdown',e=>{
    e.preventDefault(); e.stopPropagation();
    const z=zw()/w, poignee=e.target.closest('.sy-carte-h');
    if(poignee){   // angle du cadre : taille de l'affichage, l'angle opposé reste fixe ; le cadre peut dépasser le dessin (zone grise)
      const q=poignee.dataset.h, cwid=hote.clientWidth, chei=hote.clientHeight;
      const x0=hote.scrollLeft/z, y0=hote.scrollTop/z, x1=x0+cwid/z, y1=y0+chei/z;   // cadre courant en unités
      const F=[q[1]==='w'?x1:x0, q[0]==='n'?y1:y0];   // angle fixe (opposé)
      suivre(e, ev=>{ const P=unites(ev); const W=Math.max(Math.abs(P[0]-F[0]), Math.abs(P[1]-F[1])*cwid/chei);
        const nz=Math.min(4, Math.max(0.05, cwid/Math.max(W, 1)));   // nouveau zoom : largeur visible = W unités
        _capSyVues.zoom=nz; capSyZoomPoser(svg, hote, nz);
        hote.scrollLeft=(q[1]==='w'?F[0]-cwid/nz:F[0])*nz; hote.scrollTop=(q[0]==='n'?F[1]-chei/nz:F[1])*nz;
        maj(); if(box) capSyPct(box); if(typeof capRevLayerDraw==='function') requestAnimationFrame(capRevLayerDraw); });
      return;
    }
    const P=unites(e), dansCadre=e.target===vp||vp.contains(e.target);
    let dx=hote.clientWidth/2/z, dy=hote.clientHeight/2/z;   // décalage pointeur → coin du cadre : centré, ou gardé si l'on saisit le cadre
    if(dansCadre){ dx=P[0]-hote.scrollLeft/z; dy=P[1]-hote.scrollTop/z; }
    const aller=ev=>{ const Q=unites(ev), zz=zw()/w; hote.scrollLeft=(Q[0]-dx)*zz; hote.scrollTop=(Q[1]-dy)*zz; };
    aller(e); suivre(e, aller);
  });
}

/** # Grille du dessin d'une vue des lecteurs (comme la grille de la visionneuse Capella) : quadrillage fin tous les 10 unités et marqué
 * tous les 50, posé sous les formes dans le repère du dessin (il suit le zoom, l'export SVG / PNG ne le reprend pas : `capSyExporter` part du
 * document du lecteur). Rien sans `_capSyVues.grille`.
 * @param {SVGSVGElement} svg - Dessin de la vue
 */
function capSyGrille(svg){
  svg.querySelectorAll('.sy-grille').forEach(x=>x.remove());
  if(!_capSyVues.grille) return;
  const vb=(svg.getAttribute('viewBox')||'0 0 800 600').split(/[\s,]+/).map(Number), NS='http://www.w3.org/2000/svg';
  const g=document.createElementNS(NS,'g'); g.setAttribute('class','sy-grille'); g.setAttribute('pointer-events','none');
  g.innerHTML=`<defs><pattern id="sy-grille-p" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" class="sy-grille-f"/></pattern>`+
    `<pattern id="sy-grille-P" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#sy-grille-p)"/><path d="M50 0H0V50" fill="none" class="sy-grille-F"/></pattern></defs>`+
    `<rect x="${Math.floor(vb[0]/50)*50}" y="${Math.floor(vb[1]/50)*50}" width="${vb[2]+100}" height="${vb[3]+100}" fill="url(#sy-grille-P)"/>`;
  svg.insertBefore(g, svg.firstChild);
}

/** Affiche ou masque la # grille de la vue ouverte (bouton # de la ligne 1, touche G). @param {HTMLElement} box - Conteneur `#cdg-sy` */
function capSyGrilleBascule(box){
  _capSyVues.grille=!_capSyVues.grille;
  const svg=box.querySelector('svg.sy-vue-svg'); if(svg) capSyGrille(svg);
  const b=box.querySelector('#sy-grille'); if(b) b.classList.toggle('active', _capSyVues.grille);
}

/** Raccourcis de la vue 🔲 pour une lecture SysML / UML (la visionneuse Capella a les siens) : Ctrl+F recherche dans le dessin, F centre
 * sur l'élément choisi, G affiche ou masque la grille, Échap efface la recherche ; Entrée / Maj+Entrée dans le champ : résultat suivant / précédent (`capSyVuesRender`). */
document.addEventListener('keydown',e=>{
  if(typeof capCurrentView==='undefined'||capCurrentView!=='diag'||!_capSysml.lecture||!_capSyVues.cle) return;
  const box=document.getElementById('cdg-sy'); if(!box||!box.offsetParent) return;
  const dansChamp=e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]');
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='f'||e.key==='F')){ const q=box.querySelector('#sy-q'); if(q){ e.preventDefault(); q.focus(); q.select(); } return; }
  if(dansChamp||e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.key==='f'||e.key==='F'){ e.preventDefault(); capSyCentrer(box); }
  else if((e.key==='g'||e.key==='G')&&_capSyVues.mode==='visuel'){ e.preventDefault(); capSyGrilleBascule(box); }
  else if(e.key==='Escape'&&_capSyVues.q){ _capSyVues.q=''; const q=box.querySelector('#sy-q'); if(q) q.value=''; capSyChercher(box,0); }
});

/* ── 🖼 Icônes des métaclasses SysML v2 : dessinées dans Arcature (src/js/sysml/35-icones.js, raisons des dessins dans
   docs/sysml/ICONES.md d'Arcature) et reprises par le lecteur embarqué (`icone`, `iconeCorps`, `iconeVue`) : une icône par
   métaclasse de l'OMG, couleur de la famille STR / BEH / REQ / ORG, définition pleine aux angles vifs, usage clair arrondi,
   référence en tirets, marques de l'élément (direction, rôle, port conjugué, import récursif). Appelées par `capIco` /
   `capIcoType` (54) avant la visionneuse quand le modèle ouvert est SysML, et par `capIcoPlus` (84) sinon. ── */

/** Le modèle affiché vient-il d'une lecture SysML v2 (et non UML / SysML v1, servis par le même chemin : 88) ? @returns {boolean} */
function capSysmlActif(){ return !!(_capSysml.lecture&&_capSysml.doc&&typeof cap_xmlDoc!=='undefined'&&cap_xmlDoc===_capSysml.doc)&&!capSyUml()&&_capSysml.format!=='reqif'; }

/** Corps SVG (viewBox 0 0 16 16) de l'icône d'une métaclasse SysML v2, ou '' (icône générique de 84).
 * @param {string|object} typeOuElement - Métaclasse (« PartDefinition ») ou élément de la lecture (marques comprises)
 * @returns {string} Corps SVG
 */
function capIcoSysml(typeOuElement){
  if(!typeOuElement||!capSysmlDispo()||typeof ArcatureLecteurSysml.iconeCorps!=='function') return '';
  try{ return ArcatureLecteurSysml.iconeCorps(typeOuElement)||''; }catch(e){ return ''; }
}

/** Icône SysML v2 d'un élément du modèle affiché (marques de l'élément : direction, rôle…), ou '' s'il n'en a pas.
 * @param {string} id - Identifiant de l'élément @param {number} [taille] - Côté (14 par défaut)
 * @returns {string} SVG
 */
function capIcoSysmlId(id, taille){
  if(!capSysmlActif()||typeof ArcatureLecteurSysml.icone!=='function') return '';
  let e=null; try{ e=_capSysml.lecture.element(id); }catch(x){ e=null; }
  try{ return e?ArcatureLecteurSysml.icone(e, taille||14)||'':''; }catch(x){ return ''; }
}
