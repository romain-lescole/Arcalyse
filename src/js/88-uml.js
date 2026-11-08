/* ═══════════════════════════════════════════════════════════════════════════
   🧬 UML / SysML v1 : lecture d'un modèle UML 2.5.1, SysML v1 (1.7 et versions lues par Arcature) ou UAF 1.2 en XMI — `.uml`
   d'Eclipse UML2 / Papyrus (avec son `.notation`), `.xmi` (OMG, Cameo, Papyrus, Enterprise Architect), projet Cameo / CATIA
   Magic `.mdzip`, projet Enterprise Architect `.qea` / `.qeax` — par le lecteur autonome d'Arcature
   (src/vendor/arcature-lecteur-uml.js, `window.ArcatureLecteurUml`, lecture seule, hors ligne ; mode d'emploi : docs/UML.md).
   Même chemin que SysML v2 (87) : la lecture est convertie en document XML « façon Capella » par `capSysmlVersXml` et passée à
   `capApplyXmlDoc` (20) — 🌳 Arborescence, 🃏 Cartes, ▤ Tableau, 🔍 Ctrl+K, panneau de détail, 🗺 Relation Map, 💬 Revue et
   💾 page fonctionnent sans changement ; la vue 🔬 Analyses › 🧬 UML / SysML v1 (sous-vue `uml`), les 🔲 Diagrammes (diagrammes
   et tableaux du fichier : Cameo, Enterprise Architect, Papyrus — pas les vues calculées du lecteur —) et les notes de revue sur les vues sont celles de 87,
   rendues par le lecteur de la lecture affichée (`capSyL`). Ce module ajoute l'ouverture des fichiers, l'en-tête, la section
   du panneau de détail, les contrôles 🩺, les indicateurs et les icônes propres à UML.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Icônes des éléments de la lecture UML affichée, gardées par identifiant et taille (vidées à chaque lecture). */
var _capUmlIco={lecture:null, cache:new Map()};

/** Vrai si le lecteur UML / SysML v1 d'Arcature est embarqué dans la page. @returns {boolean} */
function capUmlDispo(){ return typeof ArcatureLecteurUml!=='undefined'&&!!ArcatureLecteurUml&&typeof ArcatureLecteurUml.lire==='function'; }

/** Vrai si le nom de fichier est un modèle UML / SysML v1 que le lecteur sait ouvrir (.uml, .xmi, .mdzip, .qea, .qeax).
 * @param {string} nom - Nom du fichier @returns {boolean} */
function capUmlReconnait(nom){ return capUmlDispo()&&ArcatureLecteurUml.reconnait(String(nom||'')); }

/** Unités d'un projet Rhapsody (paquetages .sbs, classes .cls, composants .cmp…) et sa table des fichiers : lues avec le .rpy. */
const CAP_UML_RHP_UNITES=/(\.(sbs|cls|cmp|ctd|prp|rpl)|(^|[\\/])filesTable\.dat)$/i;

/** Vrai pour un fichier qui n'a de sens qu'avec son modèle : diagrammes de Papyrus (.notation), unité d'un projet Rhapsody (.sbs…).
 * @param {string} nom - Nom @returns {boolean} */
function capUmlAnnexe(nom){ return /\.notation$/i.test(String(nom||''))||CAP_UML_RHP_UNITES.test(String(nom||'')); }

/** Vrai pour le fichier principal d'un projet Rhapsody (.rpy au format texte, .rpyx au format XML). @param {string} nom - Nom @returns {boolean} */
function capUmlRhapsody(nom){ return /\.rpyx?$/i.test(String(nom||'')); }

/** Lit un File en octets. @param {File} f - Fichier @returns {Promise<Uint8Array>} */
function capUmlOctets(f){
  return new Promise((resolve, reject)=>{
    const r=new FileReader();
    r.onerror=()=>reject(new Error(_L(`Impossible de lire « ${f.name} ».`)));
    r.onload=ev=>resolve(new Uint8Array(ev.target.result));
    r.readAsArrayBuffer(f);
  });
}

/** Ouvre un modèle UML / SysML v1 seul (.uml, .xmi, .mdzip, .qea) à la place du modèle affiché (appelée par `capLoadFile`, 20).
 * @param {File} f - Fichier choisi ou déposé
 * @param {FileSystemFileHandle} [handle] - Accès direct (non utilisé : pas de 🔄 suivi pour UML)
 * @param {boolean} [confirme] - true : remplacement du modèle affiché déjà accepté
 */
function capUmlOuvrir(f, handle, confirme){ capUmlOuvrirFichiers([f], confirme); }

/** Ouvre plusieurs fichiers déposés ou choisis ensemble : le modèle et le .notation de Papyrus qui l'accompagne.
 * @param {File[]} files - Fichiers (.uml, .xmi, .mdzip, .qea, .notation)
 * @param {boolean} [confirme] - true : remplacement déjà accepté
 */
function capUmlOuvrirFichiers(files, confirme){
  const mod=files.find(f=>capUmlReconnait(f.name));
  if(!mod){
    capWelcomeStatus(files.some(f=>CAP_UML_RHP_UNITES.test(f.name))?_L('Un fichier .sbs n\'est qu\'une partie d\'un projet Rhapsody : ouvrez le 📁 dossier du projet (le .rpy et son dossier _rpy).')
      :_L('Un fichier .notation ne contient que les diagrammes de Papyrus : ouvrez-le avec son modèle .uml (sélection multiple ou 📁 dossier du projet).'),'err'); capShowWelcome(true); return; }
  capUmlOuvrirDossier(files.filter(f=>capUmlReconnait(f.name)||capUmlAnnexe(f.name)).map(f=>({nom:f.name, chemin:f.webkitRelativePath||f.name, lire:()=>Promise.resolve(f)})), '', confirme);
}

/** Ouvre un modèle UML / SysML v1 depuis les fichiers d'un dossier de projet (ou de plusieurs fichiers déposés ensemble). Modèle principal :
 * celui qu'aucun autre modèle du dossier ne référence (références « fichier#id » des .uml / .xmi relevées par `capUmlExtAnalyse`) ; s'il y en a
 * plusieurs, choix dans l'écran d'accueil (`capUmlChoix`) ; à défaut, ordre des extensions (.uml avant .xmi, .mdzip, .qea). Appelée par
 * `capProjectFromFiles` (54) quand le dossier ne contient ni .capella ni .sysml, et par `capUmlOuvrirFichiers`.
 * @param {{nom:string, chemin:string, lire:function():Promise<File>}[]} fichiers - Fichiers du dossier (modèles, .notation)
 * @param {string} [nom] - Nom affiché (par défaut : le modèle)
 * @param {boolean} [confirme] - true : remplacement déjà accepté
 * @param {string} [choix] - Chemin du modèle principal déjà choisi (🌐 changement de langue) : pas de nouvelle question
 */
async function capUmlOuvrirDossier(fichiers, nom, confirme, choix){
  if(!capUmlDispo()){ capWelcomeStatus(_L('Lecteur UML / SysML v1 absent de cette version.'),'err'); return; }
  const utiles=fichiers.filter(f=>capUmlReconnait(f.nom)||capUmlAnnexe(f.nom));
  const ordre=n=>ArcatureLecteurUml.extensions.indexOf((String(n).split('.').pop()||'').toLowerCase());
  const mods=utiles.filter(f=>capUmlReconnait(f.nom)).sort((a,b)=>ordre(a.nom)-ordre(b.nom)||a.chemin.split('/').length-b.chemin.split('/').length);
  if(!mods.length) return;
  // Plusieurs modèles : références de chaque .uml / .xmi vers les autres (choix du modèle principal, fichiers à lui transmettre)
  const ana=new Map(), xml=mods.length>1?mods.filter(f=>capUmlExtXml(f.nom)):[];
  if(xml.length){
    capWelcomeStatus(_L('Lecture du dossier…'),'busy'); capShowWelcome(true);
    for(const f of xml){ try{ ana.set(f.chemin, capUmlExtAnalyse(capUmlExtTexte(await capUmlOctets(await f.lire())), f.chemin)); }catch(err){ ana.set(f.chemin, []); } }
  }
  const vises=new Set();
  ana.forEach((refs, ch)=>refs.forEach(r=>{ const c=capUmlExtTrouve(r, ch, mods); if(c&&c.chemin!==ch) vises.add(c.chemin); }));
  const racines=mods.filter(f=>!vises.has(f.chemin)), deja=choix&&mods.find(f=>f.chemin===choix);
  if(deja){ capUmlCharger(deja, utiles, ana, nom, confirme); return; }   // modèle choisi avant un 🌐 changement de langue
  if(racines.length>1){ capUmlChoix(racines, m=>capUmlCharger(m, utiles, ana, '', confirme)); return; }
  capUmlCharger(racines[0]||mods[0], utiles, ana, nom, confirme);
}

/** Demande, dans une fenêtre centrée (`capChoixModele`, 12), quel modèle ouvrir quand le dossier en contient plusieurs qu'aucun autre ne référence (même présentation
 * que pour plusieurs .capella, 54). @param {object[]} mods - Modèles candidats @param {function(object):void} ouvrir - Ouverture du modèle choisi */
function capUmlChoix(mods, ouvrir){
  capShowWelcome(true);
  capWelcomeStatus(_L(`${mods.length} modèles dans ce dossier : lequel ouvrir ?`), '');
  capChoixModele(mods, {ico:'🧬', aide:_L('Les autres modèles du dossier auxquels le modèle choisi fait référence lui seront transmis.')}, ouvrir);   // fenêtre centrée (12)
}

/** Charge le modèle principal choisi avec son .notation, les modèles du dossier qu'il référence de proche en proche (et leur .notation),
 * puis relève ses références vers d'autres fichiers (`capUmlExtReleve`). Le lecteur actuel ne lit que le modèle principal : les autres lui
 * sont transmis pour qu'une version qui sait les fusionner les lise, et leurs références sont signalées comme non lues.
 * @param {object} m - Modèle principal
 * @param {object[]} utiles - Fichiers du dossier (modèles, .notation)
 * @param {Map<string, object[]>} ana - Références déjà relevées, par chemin
 * @param {string} [nom] - Nom affiché
 * @param {boolean} [confirme] - true : remplacement déjà accepté
 */
async function capUmlCharger(m, utiles, ana, nom, confirme){
  if(/\.mdzip$/i.test(m.nom)&&typeof DecompressionStream==='undefined'){   // contrainte : archive décompressée par le navigateur
    capWelcomeStatus(_L('Ce navigateur ne sait pas décompresser une archive .mdzip (DecompressionStream) : utilisez Chrome ou Edge 80+, Firefox 113+ ou Safari 16.4+, ou exportez le modèle en XMI depuis Cameo.'),'err'); capShowWelcome(true); return;
  }
  const mods=utiles.filter(f=>capUmlReconnait(f.nom)), base=n=>n.replace(/\.[^.]+$/,'').toLowerCase(), dossier=c=>c.slice(0, c.lastIndexOf('/')+1);
  const lots=[m], vus=new Set([m.chemin]);   // modèles référencés, de proche en proche
  for(let i=0; i<lots.length; i++) (ana.get(lots[i].chemin)||[]).forEach(r=>{ const c=capUmlExtTrouve(r, lots[i].chemin, mods); if(c&&!vus.has(c.chemin)){ vus.add(c.chemin); lots.push(c); } });
  const nt=utiles.filter(f=>/\.notation$/i.test(f.nom)), bases=new Set(mods.map(f=>dossier(f.chemin)+base(f.nom)));
  // .notation de même nom ; pour le modèle principal, à défaut, le seul .notation de son dossier s'il n'a pas le nom d'un autre modèle
  const ntDe=(f, seul)=>{ const l=nt.filter(x=>dossier(x.chemin)===dossier(f.chemin)); return l.find(x=>base(x.nom)===base(f.nom))||(seul&&l.length===1&&!bases.has(dossier(l[0].chemin)+base(l[0].nom))?l[0]:null); };
  const notation=ntDe(m, true);
  // Projet Rhapsody : le .rpy et toutes les unités du dossier (le lecteur les trouve par leur nom de fichier)
  const envoi=capUmlRhapsody(m.nom)?[m, ...utiles.filter(f=>CAP_UML_RHP_UNITES.test(f.nom))]
    :[m, ...(notation?[notation]:[]), ...lots.slice(1).flatMap(f=>{ const n=/\.uml$/i.test(f.nom)?ntDe(f, false):null; return n&&n!==notation?[f, n]:[f]; })];
  nom=nom||m.nom;
  if(capLoaded&&!confirme){ if(!(await capReplaceConfirm(nom))){ capShowWelcome(false); return; } }
  capSourcesNoter('umld', nom, utiles, m.chemin);   // 🌐 changement de langue (20) : fichiers du dossier et modèle principal choisi
  capWelcomeStatus(_L(`Chargement de « ${nom} »…`),'busy'); capShowWelcome(true);
  try{
    const lus=[]; for(const f of envoi){ const file=await f.lire(); lus.push({chemin:f.chemin||f.nom, nom:f.nom, octets:await capUmlOctets(file)}); }
    const lec=await ArcatureLecteurUml.lireDossier(lus.map(f=>({chemin:f.chemin, octets:f.octets})), m.nom);
    let ext=null; try{ ext=capUmlExtReleve(lec, lus, mods, ana); }catch(err){ ext=null; }   // relevé facultatif : jamais bloquant
    setTimeout(()=>capUmlAppliquer(lec, m.nom, ext),30);
  }catch(err){ capWelcomeStatus(_L('Erreur de chargement : ')+(err&&err.message||err),'err'); capShowWelcome(true); }
}

/** Remplace le modèle affiché par une lecture UML / SysML v1 (pipeline de 87 : `capSysmlAppliquer`), garde le relevé de ses références vers
 * d'autres fichiers et prévient de celles qui n'ont pas été lues.
 * @param {object} lec - Lecture @param {string} nom - Nom du fichier
 * @param {?{refs:object[], fichiers:object[]}} [ext] - Références vers d'autres fichiers (`capUmlExtReleve`)
 */
function capUmlAppliquer(lec, nom, ext){
  _capUmlIco={lecture:lec, cache:new Map()};
  _capUmlExt={lecture:lec, refs:ext?ext.refs:[], fichiers:ext?ext.fichiers:[]};
  capSysmlAppliquer(lec, nom, ArcatureLecteurUml, lec.format);
  // Projet Rhapsody importé : compte rendu du lecteur (diagrammes pas encore lus, unités absentes)
  // (sans la phrase sur « Enregistrer sous… », propre à l'éditeur Arcature)
  if(capUmlRhapsody(nom)&&lec.importe&&lec.importe.message&&_capSysml.lecture===lec){
    const msg=lec.importe.message.split(/(?<=\.)\s+/).filter(x=>!/Enregistrer sous|Save as/.test(x)).join(' ');
    setTimeout(()=>capToast('🧬 '+msg, {kind:/_rpy/.test(msg)?'warn':'info', ms:7000}), 600);
  }
  const nl=_capUmlExt.fichiers.filter(f=>f.etat!=='lu'); if(!nl.length||_capSysml.lecture!==lec) return;
  const D=capSysmlDiagnostics(), noms=nl.slice(0, 3).map(f=>f.nom).join(', ')+(nl.length>3?', …':'');
  const absent=nl.some(f=>f.etat==='absent');
  setTimeout(()=>capToast(_L(`🧬 ${nl.length} autre(s) fichier(s) référencé(s) non lu(s) (${noms}) : leurs éléments, et les types et liens qui les visent, manquent — détail dans 🏗 Architecture › 🧬 UML / SysML v1`)+
    (absent?_L(' ; ouvrez le 📁 dossier du projet pour les fournir'):''), {kind:'warn', ms:7000}), D.erreurs||D.avertissements?4000:600);
}

/* ── 📎 Références vers d'autres fichiers ────────────────────────────────────────────────────────────────────────────────────────────
   Un .uml de Papyrus peut viser des éléments d'autres fichiers (« B.uml#_id » : type, généralisation, import, profil appliqué, sous-modèle
   contrôlé « <packagedElement href="Sous.uml#…"/> »). Les bibliothèques et profils standard (pathmap://, http://, platform:/plugin/…) sont
   reconnus par le lecteur et ne sont pas relevés. Le lecteur ne lit qu'un modèle : les références vers un autre fichier sont perdues sans
   message (cible inconnue) ; ce relevé les signale (en-tête 🧬, pastille de l'accueil, contrôle 🩺, panneau de détail, tableau de bord). */

/** Relevé des références vers d'autres fichiers de la lecture UML affichée, posé par `capUmlAppliquer` ; lu par `capUmlExt`. */
var _capUmlExt={lecture:null, refs:[], fichiers:[]};

/** Vrai pour un modèle écrit en XML lisible (.uml, .xmi), dont les références sont relevées ; les projets .mdzip / .qea ne le sont pas.
 * @param {string} nom - Nom du fichier @returns {boolean} */
function capUmlExtXml(nom){ return /\.(uml|xmi)$/i.test(String(nom||'')); }

/** Texte d'un fichier XML lu en octets (UTF-8 ; un XMI en windows-1252 garde des références lisibles : elles sont en ASCII).
 * @param {Uint8Array} octets - Contenu @returns {string} */
function capUmlExtTexte(octets){ return new TextDecoder('utf-8').decode(octets); }

/** Chemin de fichier d'une référence « chemin#id » (encodage %xx retiré), ou null pour une bibliothèque ou un profil standard (pathmap://,
 * http://, platform:/plugin/…). `abs` : chemin non relatif au fichier qui référence (platform:/resource/<projet>/…, file:…).
 * @param {string} brut - Partie avant « # » @returns {?{chemin:string, nom:string, abs:boolean}} */
function capUmlExtChemin(brut){
  let p=String(brut||'').replace(/\?.*$/, ''), abs=false;
  try{ p=decodeURIComponent(p); }catch(e){ /* chemin gardé tel quel */ }
  p=p.replace(/\\/g, '/');
  if(/^platform:\/resource\//i.test(p)){ p=p.replace(/^platform:\/resource\/[^/]+\//i, ''); abs=true; }
  else if(/^file:/i.test(p)){ p=p.replace(/^file:\/*/i, ''); abs=true; }
  else if(/^[a-z][\w+.-]+:/i.test(p)) return null;   // pathmap:, http:, platform:/plugin/… (« C:/… » : lettre de lecteur, gardé)
  else if(/^([a-z]:)?\//i.test(p)) abs=true;
  const nom=p.split('/').pop();
  return nom?{chemin:p, nom, abs}:null;
}

/** Références « fichier#id » d'un modèle XMI vers d'autres fichiers de modèle (hors bibliothèques et profils standard) : élément porteur
 * (ancêtre à `xmi:id`), propriété (balise de l'élément à `href`, ou nom de l'attribut), fichier et identifiant visés ; `contenu` : élément
 * rangé dans l'autre fichier (sous-modèle contrôlé de Papyrus). Repli par expression régulière si le XML ne se lit pas.
 * @param {string} texte - Contenu du fichier @param {string} chemin - Chemin du fichier dans le dossier
 * @returns {{el:string, prop:string, brut:string, fichier:string, nom:string, abs:boolean, id:string, contenu:boolean}[]}
 */
function capUmlExtAnalyse(texte, chemin){
  const RE='([^\\s"\'<>#]+\\.(?:uml|xmi|mdzip|mdxml|xml|qea|qeax))#([^\\s"\'<>]*)';
  if(!new RegExp(RE, 'i').test(texte)) return [];
  const reG=new RegExp(RE, 'gi'), out=[], soi=capUmlExtNorme(chemin);
  const dos=chemin.slice(0, chemin.lastIndexOf('/')+1);
  /** Ajoute une référence trouvée dans une valeur. */
  const ajoute=(valeur, el, prop, contenu)=>{
    for(const m of String(valeur).matchAll(reG)){
      const p=capUmlExtChemin(m[1]); if(!p) continue;
      if(!p.abs&&capUmlExtNorme(dos+p.chemin)===soi) continue;   // référence vers le fichier lui-même
      let id=m[2]; try{ id=decodeURIComponent(id); }catch(e){ /* gardé */ }
      out.push({el, prop, brut:m[0], fichier:p.chemin, nom:p.nom, abs:p.abs, id, contenu});
    }
  };
  let doc=null; try{ doc=new DOMParser().parseFromString(texte, 'application/xml'); }catch(e){ doc=null; }
  if(!doc||doc.getElementsByTagName('parsererror').length){ ajoute(texte, '', '', false); return out; }
  const idDe=n=>{ for(let x=n; x&&x.nodeType===1; x=x.parentNode){ const v=x.getAttribute('xmi:id')||x.getAttribute('xmi.id'); if(v) return v; } return ''; };
  const CONTENU=/^(packagedElement|nestedPackage|ownedMember|ownedElement|ownedType)$/;
  for(const el of doc.getElementsByTagName('*')){
    for(const a of el.attributes){
      if(a.value.indexOf('#')<0) continue;
      const href=a.name==='href';
      ajoute(a.value, href?idDe(el.parentNode):idDe(el), href?el.localName:a.localName, href&&CONTENU.test(el.localName));
    }
  }
  return out;
}

/** Chemin normalisé (« . » et « .. » résolus, minuscules) pour comparer deux chemins. @param {string} c - Chemin @returns {string} */
function capUmlExtNorme(c){
  const o=[]; String(c||'').replace(/\\/g, '/').split('/').forEach(s=>{ if(s==='..') o.pop(); else if(s&&s!=='.') o.push(s); });
  return o.join('/').toLowerCase();
}

/** Fichier du dossier visé par une référence : chemin relatif au fichier qui référence, sinon fin de chemin, sinon nom de fichier (seulement
 * s'il est unique). @param {{fichier:string, nom:string, abs:boolean}} r - Référence @param {string} source - Chemin du fichier qui référence
 * @param {{nom:string, chemin:string}[]} fichiers - Fichiers du dossier @returns {?object} Fichier trouvé */
function capUmlExtTrouve(r, source, fichiers){
  if(!r.abs){ const c=capUmlExtNorme(source.slice(0, source.lastIndexOf('/')+1)+r.fichier), f=fichiers.find(x=>capUmlExtNorme(x.chemin)===c); if(f) return f; }
  const suf=capUmlExtNorme(r.fichier.replace(/^([a-z]:)?\//i, ''));
  const parFin=fichiers.filter(x=>{ const c=capUmlExtNorme(x.chemin); return c===suf||c.endsWith('/'+suf); });
  if(parFin.length===1) return parFin[0];
  const parNom=fichiers.filter(x=>x.nom.toLowerCase()===r.nom.toLowerCase());
  return parNom.length===1?parNom[0]:null;
}

/** Relevé des références vers d'autres fichiers des modèles lus par le lecteur, avec leur état : `lu` (fichier lu par le lecteur), `nonlu`
 * (fourni mais non lu : le lecteur ne lit qu'un modèle), `absent` (ni dans le dossier ni dans la sélection), `format` (format que le lecteur
 * ne lit pas : module .mdxml de Cameo…).
 * @param {object} lec - Lecture @param {{chemin:string, nom:string, octets:Uint8Array}[]} lus - Fichiers transmis au lecteur
 * @param {{nom:string, chemin:string}[]} mods - Modèles du dossier @param {Map<string, object[]>} ana - Références déjà relevées, par chemin
 * @returns {{refs:object[], fichiers:{nom:string, chemin:string, n:number, contenus:number, etat:string, sources:string[]}[]}}
 */
function capUmlExtReleve(lec, lus, mods, ana){
  const lu=new Set((lec.fichiers||[]).map(f=>f.chemin)), fournis=new Set(lus.map(f=>f.chemin)), refs=[], parFichier=new Map();
  lus.filter(f=>lu.has(f.chemin)&&capUmlExtXml(f.nom)).forEach(f=>{
    const liste=ana.get(f.chemin)||capUmlExtAnalyse(capUmlExtTexte(f.octets), f.chemin);
    liste.forEach(r=>{
      const c=capUmlExtTrouve(r, f.chemin, mods);
      const etat=c?(lu.has(c.chemin)?'lu':'nonlu'):(capUmlReconnait(r.nom)?'absent':'format');
      const cle=c?c.chemin:capUmlExtNorme(r.abs?r.fichier:f.chemin.slice(0, f.chemin.lastIndexOf('/')+1)+r.fichier);
      refs.push(Object.assign({}, r, {source:f.chemin, cible:c?c.chemin:'', etat, fournis:c?fournis.has(c.chemin):false}));
      let g=parFichier.get(cle); if(!g){ g={nom:c?c.nom:r.nom, chemin:c?c.chemin:r.fichier, n:0, contenus:0, etat, sources:[]}; parFichier.set(cle, g); }
      g.n++; if(r.contenu) g.contenus++; if(!g.sources.includes(f.chemin)) g.sources.push(f.chemin);
    });
  });
  return {refs, fichiers:[...parFichier.values()].sort((a, b)=>(a.etat==='lu')-(b.etat==='lu')||b.n-a.n||a.nom.localeCompare(b.nom))};
}

/** Relevé des références vers d'autres fichiers de la lecture UML affichée (vide pour un autre modèle ou une lecture sans relevé).
 * @returns {{refs:object[], fichiers:object[]}} */
function capUmlExt(){
  const lec=typeof _capSysml!=='undefined'?_capSysml.lecture:null;
  return lec&&_capUmlExt.lecture===lec?_capUmlExt:{refs:[], fichiers:[]};
}

/** Pictogramme et libellé de l'état d'un fichier référencé. @param {string} etat - lu, nonlu, absent, format @returns {{ico:string, txt:string}} */
function capUmlExtEtat(etat){
  return ({lu:{ico:'✔', txt:_L('lu par le lecteur')}, nonlu:{ico:'⚠', txt:_L('présent, non lu par le lecteur (un seul modèle lu)')},
    absent:{ico:'⚠', txt:_L('absent du dossier ou de la sélection')}, format:{ico:'⚠', txt:_L('format que le lecteur ne lit pas')}})[etat]||{ico:'', txt:etat};
}

/** Ligne 📎 de l'en-tête de la vue 🧬 : fichiers référencés par le modèle, nombre de références et état, conseil si un fichier manque.
 * @returns {string} HTML (vide sans référence vers un autre fichier) */
function capUmlExtEntete(){
  const F=capUmlExt().fichiers, esc=capEsc; if(!F.length) return '';
  const li=F.map(f=>{ const e=capUmlExtEtat(f.etat);
    return `<span${f.etat==='lu'?'':' style="color:var(--c-warn,#e3b341)"'} title="${esc(f.chemin)}">${e.ico} ${esc(f.nom)}</span> <span class="ana-dim">(${_L(`${f.n} réf.`)}${f.contenus?_L(`, ${f.contenus} élément(s) rangé(s) dans ce fichier`):''} · ${esc(e.txt)})</span>`; }).join(' · ');
  const absent=F.some(f=>f.etat==='absent');
  return `<br>📎 ${_L('Autres fichiers référencés :')} ${li}`+
    (F.some(f=>f.etat!=='lu')?`<br><span class="ana-dim">${_L('Les éléments des fichiers non lus manquent : les types, généralisations, imports et sous-modèles qui les visent sont absents des vues (contrôle 🩺 « Références vers d\'autres fichiers non lus »).')}${absent?' '+_L('Ouvrez le 📁 dossier du projet (ou déposez les fichiers ensemble) pour fournir les fichiers absents.'):''}</span>`:'');
}

/** Icône d'un élément de la lecture UML affichée (jeu d'icônes d'Arcature), ou null s'il n'y a pas de lecture UML (icônes de Capella).
 * Appelée en tête de `capIco` (54). @param {string} id - Identifiant @param {number} [taille] - Côté @returns {?string} */
function capUmlIcone(id, taille){
  if(typeof capSyUml!=='function'||!capSyUml()) return null;
  const lec=_capSysml.lecture, k=id+'|'+(taille||14);
  if(_capUmlIco.lecture!==lec) _capUmlIco={lecture:lec, cache:new Map()};
  let s=_capUmlIco.cache.get(k);
  if(s==null){ try{ s=lec.icone(id, taille||14)||''; }catch(e){ s=''; } if(!s){ const e=lec.element(id); s=e?capUmlIconeType(e.type, taille)||'':''; } _capUmlIco.cache.set(k, s); }
  return s;
}

/** Icône d'un type (stéréotype SysML ou métaclasse UML) quand une lecture UML est affichée, sinon null. Appelée en tête de `capIcoType` (54).
 * @param {string} type - Type @param {number} [taille] - Côté @returns {?string} */
function capUmlIconeType(type, taille){
  if(typeof capSyUml!=='function'||!capSyUml()) return null;
  try{ return ArcatureLecteurUml.icone(String(type||''), taille||14)||capIcoPlus(type, taille); }catch(e){ return ''; }
}

/** En-tête de la vue 🧬 UML / SysML v1 : outil et version reconnus, fichiers lus, projet importé d'Enterprise Architect. @returns {string} HTML */
function capUmlEntete(){
  const lec=_capSysml.lecture, esc=capEsc; if(!lec) return '';
  const fic=(lec.fichiers||[]).map(f=>`📄 ${esc(f.chemin)}`).join(' · ');
  return `<p class="ana-help">${_L(`🧬 ${esc(capSyNomFormat())} — ${esc(lec.outil||'')}${lec.versionModele?' · '+esc(lec.versionModele):''} — ${fic}`)}`+
    (lec.encodage&&lec.encodage!=='utf-8'?` <span class="ana-dim">(${esc(lec.encodage)})</span>`:'')+
    (lec.importe?`<br><span class="ana-dim">${capUmlRhapsody(lec.nom)?_L('Projet IBM Rhapsody importé en SysML v1 par le lecteur d\'Arcature (lecture seule : le projet n\'est jamais modifié ; diagrammes pas encore lus).')
      :_L('Projet Enterprise Architect importé en SysML v1 par le lecteur d\'Arcature (lecture seule : le fichier n\'est jamais modifié).')}</span>`:'')+capUmlExtEntete()+`</p>`;
}

/** Contrôles 🩺 d'un modèle UML / SysML v1 : diagnostics de la validation d'Arcature (contraintes de la spécification UML 2.5.1, des
 * profils SysML 1.7 et UAF 1.2 sous leur nom, règles d'Arcature), classés par impact réel (98) : 🔴 incohérences, 🟡 à vérifier,
 * 🟢 écarts de forme (ℹ, hors score) ; appelée par `capSyChecks('uml')` (87).
 * @returns {object[]} Sections {icon, title, tip, sev, cols, items}
 */
function capUmlChecks(){
  const D=capSysmlDiagnostics(), esc=capEsc;
  const row=d=>{ const c=d.code||d.regle||''; return `<tr><td><span title="${esc(c)}">${esc(capUmlRegleFiche(c, d.regle).quoi)}</span> <span class="ana-dim">${esc(capUmlRegleOrigine(c))}</span></td><td>${esc(d.message||'')}</td><td>${d.element?capSyLien(d.element):'<span class="ana-dim">—</span>'}</td></tr>`; };
  const cols=[_L('Règle'),_L('Message'),_L('Élément')], de=k=>D.liste.filter(d=>capUmlRegleImpact(d.code||d.regle||'')===k);
  return [   // par impact réel (98) et non par gravité de la norme : 🟢 forme en ℹ, hors score de santé
    {icon:'🔴', sev:'err', title:_L('Incohérences UML / SysML v1'), tip:_L('Le modèle se contredit (flux sans connecteur, cycle, référence vers rien…) : à regarder en priorité. Fiche de chaque règle dans 🧬 UML / SysML v1 › 🩺 Diagnostics › Σ Répartition par règle.'), cols, items:de('incoh').map(row)},
    {icon:'🟡', sev:'warn', title:_L('Points à vérifier UML / SysML v1'), tip:_L('Oubli ou doublon probable (noms en double, contexte d\'une relation, classe active…) : le modèle reste lisible.'), cols, items:de('verif').map(row)},
    {icon:'🟢', sev:'info', title:_L('Écarts de forme à la norme UML / SysML v1'), tip:_L('Écarts sans conséquence pratique, souvent dus à la façon dont l\'outil enregistre le fichier ; ne comptent pas dans le score de santé.'), cols, items:de('forme').map(row)},
    {icon:'📎', title:_L('Références vers d\'autres fichiers non lus'), tip:_L('Références « fichier#id » du modèle vers un autre fichier (type, généralisation, import, profil appliqué, sous-modèle de Papyrus) que le lecteur n\'a pas lu : l\'élément visé manque, et le lien ou le type avec lui. Les bibliothèques et profils standard (pathmap://, http://…) ne sont pas comptés.'),
      cols:[_L('Élément'),_L('Propriété'),_L('Fichier'),_L('Identifiant visé'),_L('État')],
      items:capUmlExt().refs.filter(r=>r.etat!=='lu').map(r=>`<tr><td>${r.el?(capSyEl(r.el)?capSyLien(r.el):`<code>${esc(r.el)}</code>`):'<span class="ana-dim">—</span>'}</td><td>${esc(r.prop||'')}${r.contenu?` <span class="ana-dim">${_L('(élément rangé dans ce fichier)')}</span>`:''}</td>`+
        `<td title="${esc(r.brut)}">${esc(r.nom)}</td><td><code>${esc(r.id)}</code></td><td>${esc(capUmlExtEtat(r.etat).txt)}</td></tr>`)}
  ];
}

/** Résumé des diagnostics d'un modèle UML / SysML v1 par règle (en tête de l'onglet 🩺 Diagnostics de 🧬 UML / SysML v1, 87) : case
 * ☑ pour activer / désactiver la règle (`capChkRegleSet`, 14 : enregistrée dans le 🩺 profil ; une règle désactivée n'est plus comptée
 * ni par 🏠 Accueil, ni par 💚 Santé, ni par le tableau de bord), origine (UML 2.5.1, SysML, UAF, Arcature), règle, gravité, nombre,
 * exemple ; explique pourquoi un grand modèle en compte des milliers (toutes les contraintes de la spécification sont vérifiées, alors
 * que Cameo n'en active par défaut qu'une partie).
 * @returns {string} HTML (vide sans diagnostic)
 */
function capUmlDiagResume(){
  const T=capSysmlDiagnostics(true), D=capSysmlDiagnostics(), esc=capEsc; if(!T.liste.length) return '';
  const rang={incoh:0, verif:1, forme:2};
  const par={}; T.liste.forEach(d=>{ const k=d.code||d.regle||'?'; const o=par[k]||(par[k]={code:k, regle:d.regle||'', n:0, ex:d.message||'', els:[]}); o.n++; if(d.element&&o.els.length<200&&!o.els.includes(d.element)) o.els.push(d.element); });
  const regles=Object.values(par).map(r=>Object.assign(r, {on:capChkRegleOn(r.code), f:capUmlRegleFiche(r.code, r.regle)}))
    .sort((a,b)=>(b.on-a.on)||rang[a.f.impact]-rang[b.f.impact]||b.n-a.n);
  const actives=regles.filter(r=>r.on), N=capUmlParImpact(D.liste), off=regles.length-actives.length;
  return `<details class="cap-diag" open><summary><span class="cap-diag-ico">Σ</span><b>${_L('Répartition par règle')}</b> <span class="cap-diag-cnt warn">${actives.length}</span>
    <span class="cap-diag-tip">${_L('Toutes les contraintes de la spécification UML 2.5.1 et des profils SysML et UAF sont vérifiées, comme le ferait une validation complète : Cameo n\'en active par défaut qu\'une partie, d\'où beaucoup plus de diagnostics. Quelques règles font souvent l\'essentiel du total (noms en double dans un même paquetage, éléments sans nom…).')}</span></summary>
    <div class="uml-imp-bilan">${['incoh','verif','forme'].map(k=>`<span class="uml-imp-case uml-imp-${k}" title="${esc(CAP_UML_IMPACTS[k][2])}"><b>${N[k]}</b> ${CAP_UML_IMPACTS[k][0]} ${esc(CAP_UML_IMPACTS[k][1])}</span>`).join('')}</div>
    <p class="ana-help" style="margin:4px 0 6px">${_L('La norme classe presque tout en « erreur » ; l\'impact dit ce que cela change vraiment : 🔴 le modèle se contredit, 🟡 oubli ou doublon probable, 🟢 écart de forme sans conséquence. Cliquez sur une règle pour sa fiche : ce qu\'elle dit, cause probable, gravité, correction, éléments concernés.')}`+
    (off?' '+_L(`${off} règle(s) désactivée(s) : ${T.liste.length-D.liste.length} diagnostic(s) ni affichés ni comptés (Accueil, Santé, tableau de bord).`):'')+
    ` <span class="ana-dim">${_L('Décochez une règle pour ne plus la compter ; le choix est gardé dans le 🩺 profil de contrôles.')}</span></p>
    <table class="cap-diag-t uml-regles"><tr><th title="${_L('Règle active : ses diagnostics sont affichés et comptés')}">☑</th><th>${_L('Impact')}</th><th>${_L('Règle')}</th><th>${_L('Origine')}</th><th>${_L('Nombre')}</th><th>${_L('Éléments')}</th><th>${_L('Exemple')}</th></tr>`+
    regles.map(r=>`<tr class="${r.on?'':'cap-regle-off'}"><td><input type="checkbox" data-umlregle="${esc(r.code)}"${r.on?' checked':''} title="${r.on?_L('Désactiver cette règle (ses diagnostics ne seront plus comptés)'):_L('Réactiver cette règle')}"></td><td>${capUmlImpactBadge(r.f.impact)}</td>`+
      `<td><span class="uml-regle-tog" data-umlfiche="${esc(r.code)}" title="${_L('Afficher la fiche de la règle')}">▸ <b>${esc(r.f.quoi)}</b></span><div class="ana-dim" style="font-size:11px">${esc(r.code.replace(/^(SysML|UAF)::/,''))}</div></td>`+
      `<td>${esc(r.f.origine)}</td><td><b>${r.n}</b></td><td>${r.els.length}${r.els.length>=200?'+':''}</td><td class="ana-dim" style="font-size:11px">${capXtShort(r.ex,140)}</td></tr>`+
      `<tr class="uml-fiche-tr" data-umlfiche-de="${esc(r.code)}" hidden><td></td><td colspan="6">${capUmlFicheHtml(r.code, r.regle)}`+
      `<div class="uml-fiche-l"><b>${_L('Éléments concernés :')}</b> ${r.els.length?capFoldList(r.els.slice(0,60).map(capSyLien), 12)+(r.els.length>60?` <span class="ana-dim">${_L(`(${r.els.length-60} autres : voir la liste des diagnostics plus bas)`)}</span>`:''):'<span class="ana-dim">—</span>'}</div></td></tr>`).join('')+`</table></details>`;
}

/** Σ Répartition par règle (`capUmlDiagResume`) : ▸ déplie la fiche d'une règle ; case ☑ : active ou désactive la règle et redessine la vue 🧬. */
document.addEventListener('click', e=>{   // ▸ fiche d'une règle (ligne dépliée sous la règle)
  const t=e.target&&e.target.closest&&e.target.closest('[data-umlfiche]'); if(!t) return;
  const tr=t.closest('table').querySelector(`tr[data-umlfiche-de="${CSS.escape(t.dataset.umlfiche)}"]`); if(!tr) return;
  tr.hidden=!tr.hidden; t.firstChild.textContent=tr.hidden?'▸ ':'▾ ';
});
document.addEventListener('change', e=>{
  const cb=e.target&&e.target.closest&&e.target.closest('input[data-umlregle]'); if(!cb) return;
  const box=cb.closest('[data-hold]');
  capChkRegleSet(cb.dataset.umlregle, cb.checked);
  if(box) capRenderSysml(box);
});

/** Cases « Fichiers du projet » de l'en-tête de 🏠 Accueil pour un modèle UML / SysML v1 (56, `capHomeCase`) : modèle (outil, éléments),
 * diagrammes et tableaux de l'outil (explique l'absence de diagrammes : export XMI de Cameo, .uml sans son .notation), validation,
 * fichiers référencés non lus (`capUmlExt`).
 * @returns {string} HTML
 */
function capUmlCasesAccueil(){
  const lec=_capSysml.lecture; if(!lec) return '';
  const esc=capEsc, D=capSysmlDiagnostics(), n=lec.elements().length-1, vues=capSyVuesListe(), nt=vues.filter(v=>v.tableau).length, nd=vues.length-nt;
  const noms=(lec.fichiers||[]).map(f=>f.chemin||f.nom||'').filter(Boolean), tous=noms.join(' ')||capCurrentFileName||'';
  const pourquoi=nd?'':/\.xmi\b/i.test(tous)&&/cameo|magic/i.test(lec.outil||'')?_L('Un export .xmi de Cameo ne contient pas les diagrammes : ouvrez le .mdzip du projet.')
    :/\.uml\b/i.test(tous)&&!/\.notation\b/i.test(tous)?_L('Les diagrammes de Papyrus sont dans le .notation : ouvrez-le avec le .uml (ou le dossier du projet).'):'';
  const N=capUmlParImpact(D.liste), etat=N.incoh?'err':N.verif?'todo':'ok';   // couleur selon l'impact réel (98), pas la gravité de la norme
  const h=capHomeCase(_L('Modèle'), noms.map(esc).join(' + ')||esc(capCurrentFileName||'—'), esc(lec.outil||capSyNomFormat())+' · '+_L(`${n} éléments`), 'ok')+
    capHomeCase(_L('Diagrammes'), nd?_L(`${nd} diagramme(s) de l'outil`):_L('Aucun diagramme de l\'outil'), (nt?_L(`${nt} tableau(x) ou matrice(s).`):'')+(pourquoi?(nt?' ':'')+pourquoi:''), nd?'ok':pourquoi?'todo':'none',
      vues.length?`<button type="button" class="cap-lf-btn" data-nav="diag">${_L('🔲 Ouvrir')}</button>`:'')+
    capHomeCase(_L('Validation'), N.total?capUmlImpactTexte(N):_L('Sans écart'), _L('Contraintes UML 2.5.1, SysML 1.7, UAF 1.2')+(D.masques?' — '+_L(`${D.masques} diagnostic(s) de règles désactivées non comptés`):''), etat,
      D.liste.length||D.masques?`<button type="button" class="cap-lf-btn" data-a="sy-diag">${_L('Voir')}</button>`:'');
  const nl=capUmlExt().fichiers.filter(f=>f.etat!=='lu').length;
  return h+(nl?capHomeCase(_L('Fichiers référencés'), _L(`${nl} fichier(s) non lu(s)`), _L('Le modèle fait référence à d\'autres fichiers que le lecteur n\'a pas lus : leurs éléments manquent (détail dans 🧬 UML / SysML v1 et dans le contrôle 🩺).'), 'todo',
    `<button type="button" class="cap-lf-btn" data-nav="ana:uml">${_L('Voir')}</button>`):'');
}

/** Section 🧬 UML / SysML v1 du panneau de détail : type, métaclasse, stéréotypes, déclaration, attributs écrits (propriétés des
 * stéréotypes : texte d'une exigence…), liaisons cliquables, diagnostics de l'élément, extrait XMI ; appelée par `capSyDetail` (87).
 * @param {string} id - Identifiant de l'élément
 * @param {Function} secTitle - Titre de section du panneau (texte, couleur)
 * @returns {string} HTML
 */
function capUmlDetail(id, secTitle){
  const lec=_capSysml.lecture, e=lec?lec.element(id):null; if(!e) return '';
  const esc=capEsc, fams=ArcatureLecteurUml.familles||{};
  const kv=[[_L('Type'), e.type], [_L('Métaclasse'), e.metaclasse&&e.metaclasse!==e.type?e.metaclasse:''], [_L('Stéréotypes'), (e.stereotypes||[]).map(x=>'«'+x+'»').join(' ')],
    [_L('Nom qualifié'), e.nomQualifie], [_L('Déclaration'), e.declaration?`<code>${esc(e.declaration)}</code>`:''],
    [_L('Famille'), e.famille?`<span style="color:${CAP_SY_FAM_COULEUR[e.famille]||'inherit'}">${esc(fams[e.famille]||e.famille)}</span>`:''],
    [_L('Visibilité'), e.visibilite], [_L('Modificateurs'), (e.modificateurs||[]).join(' ')], [_L('Direction'), e.direction], [_L('Multiplicité'), e.multiplicite],
    [_L('Agrégation'), e.agregation&&e.agregation!=='none'?e.agregation:''], [_L('Valeur'), e.valeur], [_L('Ligne'), e.ligne?String(e.ligne):'']].filter(([,v])=>v);
  let h=secTitle(_L(`🧬 ${capSyNomFormat()}`),'#58a6ff')+capUmlVuesBoutons(id)+`<table class="ana-t ana-kv">${kv.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${/^<(code|span)/.test(String(v))?v:esc(v)}</td></tr>`).join('')}</table>`;
  let at=[]; try{ at=lec.attributs(id)||[]; }catch(err){ at=[]; }
  if(at.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Attributs')}</div><table class="ana-t ana-kv">${at.map(a=>`<tr><td>${esc(a.libelle)}</td><td>${capXtShort(a.valeur,600)}</td></tr>`).join('')}</table>`;
  let lia=[]; try{ lia=lec.liaisons(id)||[]; }catch(err){ lia=[]; }
  if(lia.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Liaisons')}</div><table class="ana-t ana-kv">${lia.slice(0, 300).map(l=>`<tr><td><span style="color:${(CAP_SY_REL_STYLE[l.relation]||['var(--c-dim)'])[0]}">${esc(l.libelle||l.relation)}</span> ${l.sens==='entrant'?'←':'→'}</td><td>${capSyLien(l.autre)}${l.via?` <span class="ana-dim">${_L('via')} ${capSyLien(l.via)}</span>`:''}</td></tr>`).join('')}</table>`;
  const xr=capUmlExt().refs.filter(r=>r.el===id);
  if(xr.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('📎 Références vers d\'autres fichiers')}</div><table class="ana-t ana-kv">${xr.slice(0, 300).map(r=>{ const et=capUmlExtEtat(r.etat);
    return `<tr><td>${esc(r.prop||'')} →</td><td><code title="${esc(r.brut)}">${esc(r.nom)}#${esc(r.id)}</code> <span class="ana-dim">${et.ico} ${esc(et.txt)}</span></td></tr>`; }).join('')}</table>`;
  const diags=capSysmlDiagnostics().liste.filter(d=>d.element===id);
  if(diags.length) h+=`<div class="ana-dim" style="margin:6px 0 2px;font-size:11px">${_L('Diagnostics')}</div>`+diags.map(d=>{ const c=d.code||d.regle||'', k=capUmlRegleImpact(c);   // impact et fiche de la règle (98)
    return `<details class="sy-diag uml-diag-${k}"><summary>${capUmlImpactBadge(k, true)} ${esc(d.message||'')}</summary>${capUmlFicheHtml(c, d.regle)}</details>`; }).join('');
  let ext=''; try{ ext=lec.extrait(id)||''; }catch(err){ ext=''; }
  if(ext) h+=`<details class="sy-extrait"><summary class="ana-dim" style="font-size:11px;cursor:pointer">${_L('Extrait XMI')}${ext.length>4000?_L(' (début)'):''}</summary><pre class="sy-texte">${esc(ext.slice(0,4000))}</pre></details>`;
  return h;
}

/** Boutons du panneau de détail vers les vues qui montrent l'élément : ◧ Blocs & ports, ◧ Activités & flux (92), 🧾 Exigences SysML (93), 🚦 Machines à états, 🎬 Interactions, 🔲 Diagramme (94).
 * @param {string} id - Identifiant @returns {string} HTML (vide si aucune vue ne le montre) */
function capUmlVuesBoutons(id){ const b=capUmlBlkDetail(id)+capUmlReqDetail(id)+capUmlEiDetail(id)+capUmlUcDetail(id); return b?`<div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap">${b}</div>`:''; }

/** Indicateurs 🧬 UML / SysML v1 du 📐 tableau de bord (vides pour un autre modèle) ; appelée par `capSyDashCatalog` (87).
 * @param {Function} add - Ajout d'un indicateur (groupe, clé, libellé, forme, calcul, info-bulle)
 */
function capUmlDashCatalog(add){
  const G=_L('UML / SysML v1'), fams=()=>(capUmlDispo()&&ArcatureLecteurUml.familles)||{}, uml=()=>typeof capSyUml==='function'&&capSyUml();
  const els=()=>uml()?_capSysml.lecture.elements().filter(e=>!e.racine):[];
  add(G,'uml.n',_L('UML / SysML v1 — éléments'),'n',()=>({n:els().length, sub:uml()?_capSysml.lecture.outil||'':''}));
  add(G,'uml.fam',_L('UML / SysML v1 — éléments par famille'),'series',()=>{ const m={}; els().forEach(e=>{ m[e.famille]=(m[e.famille]||0)+1; }); return {cats:Object.entries(m).map(([k,v])=>({l:fams()[k]||k, v, c:CAP_SY_FAM_COULEUR[k]})).filter(c=>c.v)}; });
  add(G,'uml.type',_L('UML / SysML v1 — éléments par type'),'series',()=>{ const m={}; els().filter(e=>!e.technique).forEach(e=>{ m[e.type]=(m[e.type]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>({l:k, v}))}; });
  add(G,'uml.rel',_L('UML / SysML v1 — liaisons par relation'),'series',()=>{ const m={}; (uml()?capSysmlLiaisons():[]).forEach(l=>{ m[l.relation]=(m[l.relation]||0)+1; }); return {cats:Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({l:capSyRelLibelle(k), v, c:(CAP_SY_REL_STYLE[k]||[])[0]}))}; });
  add(G,'uml.vues',_L('UML / SysML v1 — diagrammes par genre'),'series',()=>{ const m={}; (uml()?capSyVuesListe():[]).forEach(v=>{ m[v.libelleGenre]=(m[v.libelleGenre]||0)+1; }); return {cats:Object.entries(m).map(([l,v])=>({l, v}))}; });
  capUmlBlkDashCatalog(add); capUmlReqDashCatalog(add); capUmlEiDashCatalog(add); capUmlUcDashCatalog(add); capUmlIbDashCatalog(add); capUmlPlDashCatalog(add);   // 🔒 / 📦 (97), 🗃 / ⚖ (96), 🎯 / ⇶ (95), 🧱 Blocs & ports, ƒ Activités & flux (92), 🧾 Exigences SysML (93), 🚦 / 🎬 (94)
  add(G,'uml.diag',_L('UML / SysML v1 — écarts à la norme par impact'),'series',()=>{ const N=uml()?capUmlParImpact():{incoh:0, verif:0, forme:0}; return {cats:[{l:_L('Incohérences'), v:N.incoh, c:'#f85149'},{l:_L('À vérifier'), v:N.verif, c:'#e3b341'},{l:_L('Forme'), v:N.forme, c:'#3fb950'}].filter(c=>c.v)}; },_L('Écarts relevés par la validation d\'Arcature (contraintes UML, SysML, UAF), par impact réel : incohérences, points à vérifier, écarts de forme'));
  add(G,'uml.ext',_L('UML / SysML v1 — références vers d\'autres fichiers'),'series',()=>({cats:(uml()?capUmlExt().fichiers:[]).map(f=>({l:f.nom+(f.etat==='lu'?'':' ⚠'), v:f.n, c:f.etat==='lu'?'#3fb950':'#e3b341'}))}),
    _L('Nombre de références « fichier#id » du modèle vers chaque autre fichier ; ⚠ : fichier non lu (ses éléments manquent)'));
}

/** Vue 🧬 UML / SysML v1 (sous-vue `uml` de 🔬 Analyses) : celle de 87 (éléments, liaisons, 🩺 diagnostics) pour une lecture UML.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderUml(box){
  if(!capUmlDispo()){ box.innerHTML=`<div class="phl-empty">${_L('Lecteur UML / SysML v1 absent de cette version.')}</div>`; return; }
  if(typeof capSyUml!=='function'||!capSyUml()){ box.innerHTML=`<div class="phl-empty">${_L('Le modèle affiché n\'est pas un modèle UML ou SysML v1 : ouvrez un fichier .uml (avec son .notation), .xmi, .mdzip ou .qea, ou le dossier du projet (📁).')}</div>`; return; }
  capRenderSysml(box);
}
