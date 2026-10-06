/* ══ 🔄 SUIVI DU FICHIER .capella ═══════════════════════════════════════════
 * Détecte qu'une nouvelle version du fichier chargé a été enregistrée (par Capella),
 * calcule le delta avec le modèle affiché (moteur de ⚖ Comparaison de versions) et propose
 * la mise à jour, qui n'est appliquée qu'après validation.
 * - Accès direct (Edge/Chrome, fichier ouvert par 📁 Fichier › 🔷 Ouvrir ou glissé) : relecture possible à tout moment.
 * - Accès limité (autre navigateur, page sauvegardée) : le navigateur signale au mieux que le fichier a changé ;
 *   il faut alors le resélectionner (📂).
 * Plusieurs enregistrements avant validation : le delta proposé est CUMULÉ (affiché → dernière version),
 * chaque enregistrement détecté est listé avec son propre delta (pas à pas), et les mises à jour appliquées
 * forment un historique de session (avec comparaison possible depuis la version d'ouverture).
 */
const _capWatch={
  handle:null, file:null, name:'',              // source suivie (accès direct ou simple fichier)
  shownHash:'', shownMtime:0, shownAt:0, shownIdx:null, // version affichée
  diskMtime:0, diskSize:-1, diskHash:'',        // dernier état vu sur le disque
  auto:false, period:30, onFocus:true, timer:null, busy:false,
  state:'',                                     // '' | 'stale' (modifié, relecture impossible) | 'missing' | 'denied' | 'writing'
  lastCheck:0,
  pending:null,                                 // version en attente de validation
  history:[],                                   // mises à jour appliquées (session)
  origDoc:null, origAt:0, prevDoc:null,         // version d'ouverture, version avant la dernière mise à jour
  diffDoc:null,                                 // document placé par le suivi dans ⚖ Comparaison (pour ne pas écraser un choix de l'utilisateur)
  dismissed:false
};

/** Empreinte rapide d'un texte (FNV-1a 32 bits + longueur), pour reconnaître une version déjà vue.
 * @param {string} s - Contenu du fichier
 * @returns {string} Empreinte
 */
function capWatchHash(s){
  let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193); }
  return (h>>>0).toString(16)+':'+s.length;
}

/** Heure lisible (hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes */
function capWatchTime(t){ return t?new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'; }
/** Date et heure lisibles (jj/mm hh:mm:ss) d'un horodatage. @param {number} t - Millisecondes */
function capWatchDate(t){ return t?new Date(t).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+capWatchTime(t):'—'; }

/** Compte les différences par statut. @param {object[]} diff - Résultat de capDiffCompute
 * @returns {{add:number,del:number,mod:number,mov:number,total:number}} */
function capWatchCounts(diff){
  const c={add:0,del:0,mod:0,mov:0,total:diff.length};
  diff.forEach(d=>{ c[d.status]++; if(d.moved) c.mov++; });
  return c;
}

/** Copie allégée d'un delta (sans les nœuds XML), pour le garder en mémoire sans retenir les anciens documents.
 * @param {object[]} diff - Résultat de capDiffCompute
 * @returns {object[]} Delta allégé
 */
function capWatchLite(diff){
  return diff.map(d=>({status:d.status, moved:d.moved, changes:d.changes, e:{id:d.e.id, type:d.e.type, name:d.e.name, layer:d.e.layer}}));
}

/** Pastilles ➕ ➖ ✎ ↪ d'un comptage. @param {object} c - Comptage capWatchCounts @returns {string} HTML */
function capWatchChips(c){
  if(!c.total) return '<span class="ana-dim">aucune différence</span>';
  return [['add','➕','var(--c-ok,#3fb950)','ajouté(s)'],['del','➖','var(--c-err,#f85149)','supprimé(s)'],['mod','✎','var(--c-warn,#e3b341)','modifié(s)'],['mov','↪','#58a6ff','déplacé(s)']]
    .filter(([k])=>c[k]).map(([k,i,col,l])=>`<span class="cw-chip" style="color:${col}" title="${c[k]} ${l}">${i} ${c[k]}</span>`).join(' ');
}

/** Enregistre la source suivie après le chargement d'un modèle (remet le suivi à zéro).
 * @param {File} file - Fichier chargé
 * @param {FileSystemFileHandle|null} handle - Accès direct au fichier (Edge/Chrome), sinon null
 * @param {string} text - Contenu chargé
 */
function capWatchSetSource(file, handle, text){
  const h=capWatchHash(text||'');
  Object.assign(_capWatch,{handle, file, name:file.name, shownHash:h, shownMtime:file.lastModified||0, shownAt:Date.now(), shownIdx:null,
    diskMtime:file.lastModified||0, diskSize:file.size, diskHash:h, state:'', lastCheck:Date.now(), pending:null, history:[],
    origDoc:cap_xmlDoc, origAt:Date.now(), prevDoc:null, dismissed:false});
  if(_capWatch.diffDoc&&capDiffDoc===_capWatch.diffDoc){ capDiffDoc=null; capDiffName=''; }
  _capWatch.diffDoc=null;
  capWatchNote(false);
  capWatchArm();
  capWatchUpdateUi();
}

/** (Ré)arme la vérification périodique selon les réglages. */
function capWatchArm(){
  clearInterval(_capWatch.timer); _capWatch.timer=null;
  if(_capWatch.auto&&(_capWatch.handle||_capWatch.file))
    _capWatch.timer=setInterval(()=>{ if(document.visibilityState==='visible') capWatchCheck(false); }, _capWatch.period*1000);
}

/** Vrai sur téléphone / tablette : leurs sélecteurs ne connaissent pas l'extension .capella et grisent ces fichiers
 * si on filtre (attribut accept, types du sélecteur à accès direct). @returns {boolean} */
function capIsMobile(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent||''));
}
// Sur mobile : aucun filtre de type (l'extension est vérifiée au chargement) et sélecteur classique uniquement
let _capPickerKo=capIsMobile();   // sélecteur à accès direct refusé une fois (stratégie du poste, page intégrée…) ou mobile : sélecteur classique
if(_capPickerKo) ['capella-file-input','cap-watch-input','ana-df-file'].forEach(id=>document.getElementById(id)?.removeAttribute('accept'));

/** Ouvre un fichier Capella à charger : sélecteur avec accès direct (Edge/Chrome, permet le 🔄 suivi),
 * sinon sélecteur de fichier classique. Le choix est fait sans attendre, pour garder l'autorisation du clic. */
function capPickCapellaFile(){
  if(!window.showOpenFilePicker||_capPickerKo){ document.getElementById('capella-file-input').click(); return; }
  capWatchPick().then(r=>{
    if(!r) return;
    if(r.input){ capWatchPickerFailed(document.getElementById('capella-file-input'), true); return; }
    capLoadFile(r.file, r.handle);
  });
}

/** Repli quand le sélecteur à accès direct a été refusé : tente le sélecteur classique (le navigateur peut
 * l'ignorer, le clic d'origine ayant été consommé) et invite à recliquer ou à glisser le fichier.
 * @param {HTMLInputElement} input - Sélecteur classique à ouvrir
 * @param {boolean} welcome - true : message dans l'écran d'accueil, sinon message bref
 */
function capWatchPickerFailed(input, welcome){
  try{ input.click(); }catch(e){}
  const msg='Le sélecteur de fichiers de ce navigateur est indisponible : cliquez de nouveau pour choisir le fichier, ou glissez-le dans la fenêtre.';
  if(welcome){ capShowWelcome(true); capWelcomeStatus(msg,'err'); } else capWatchFlash(msg);
}

/** Demande un fichier .capella avec le sélecteur à accès direct quand le navigateur le permet.
 * Un refus (ou une annulation immédiate, signe d'un blocage) bascule définitivement sur le sélecteur classique.
 * @returns {Promise<{file:File,handle:FileSystemFileHandle}|{input:true,failed?:boolean}|null>} Fichier choisi,
 *   {input:true} s'il faut passer par le sélecteur classique (failed : après un refus), null si annulé
 */
async function capWatchPick(){
  if(!window.showOpenFilePicker||_capPickerKo) return {input:true};
  const t0=Date.now();
  try{
    const [h]=await window.showOpenFilePicker({types:[{description:'Modèle Capella',accept:{'application/xml':['.capella','.melodymodeller','.xml']}}]});
    return {file:await h.getFile(), handle:h};
  }catch(e){
    if(e&&e.name==='AbortError'&&Date.now()-t0>400) return null;   // fenêtre fermée par l'utilisateur
    console.warn('Sélecteur à accès direct indisponible :', e);
    _capPickerKo=true;
    return {input:true, failed:true};
  }
}

/** Lit l'état du fichier suivi sur le disque.
 * @param {boolean} full - true : lire le contenu même si date et taille semblent inchangées
 * @returns {Promise<object|null>} {text,mtime,size} | {same:true} | {err:'stale'|'missing'|'denied'} | null (aucune source)
 */
async function capWatchReadDisk(full){
  let f;
  if(_capWatch.handle){
    try{ f=await _capWatch.handle.getFile(); }
    catch(e){ return {err:e&&e.name==='NotFoundError'?'missing':'denied'}; }
    if(!full&&f.lastModified===_capWatch.diskMtime&&f.size===_capWatch.diskSize) return {same:true};
  } else if(_capWatch.file){
    f=_capWatch.file;
    // Accès limité : Chrome/Edge refusent de relire un fichier modifié depuis sa sélection → signe de modification
    try{ await f.slice(0,1).arrayBuffer(); }catch(e){ return {err:'stale'}; }
    if(!full) return {same:true};
  } else return null;
  try{ return {text:await f.text(), mtime:f.lastModified, size:f.size}; }
  catch(e){ return {err:_capWatch.handle?'writing':'stale'}; }
}

/** Vérifie si le fichier suivi a changé et, le cas échéant, prépare la mise à jour (delta + notification).
 * @param {boolean} manual - true : demandé par l'utilisateur (message même si rien n'a changé, relecture complète)
 */
async function capWatchCheck(manual){
  if(_capWatch.busy||!capLoaded) return;
  if(!_capWatch.handle&&!_capWatch.file){ if(manual) capWatchPickNewVersion(); return; }
  _capWatch.busy=true; capWatchUpdateUi();
  try{
    const r=await capWatchReadDisk(manual);
    _capWatch.lastCheck=Date.now();
    if(!r) return;
    if(r.err){
      const was=_capWatch.state; _capWatch.state=r.err;
      if(r.err!=='writing'&&(manual||was!==r.err)){ _capWatch.dismissed=false; capWatchNote(true); }
      return;
    }
    if(_capWatch.state&&_capWatch.state!=='stale'){ _capWatch.state=''; if(!_capWatch.pending) capWatchNote(false); }
    if(r.same){ if(manual) capWatchFlash('✔ Le fichier n\'a pas changé'); return; }
    _capWatch.diskMtime=r.mtime; _capWatch.diskSize=r.size;
    const h=capWatchHash(r.text);
    if(h===_capWatch.diskHash&&(_capWatch.pending||h===_capWatch.shownHash)){
      if(manual) capWatchFlash(_capWatch.pending?'Aucun nouvel enregistrement depuis la dernière détection':'✔ Le fichier n\'a pas changé');
      if(manual&&_capWatch.pending){ _capWatch.dismissed=false; capWatchNote(true); }
      return;
    }
    _capWatch.diskHash=h;
    if(h===_capWatch.shownHash){   // revenu à la version affichée (annulation dans Capella…)
      if(_capWatch.pending){ _capWatch.pending=null; capWatchNote(false); capWatchModalRefresh(); }
      if(manual) capWatchFlash('✔ Le fichier correspond au modèle affiché');
      return;
    }
    capWatchRegister(r.text, h, r.mtime, manual);
  }finally{
    _capWatch.busy=false; capWatchUpdateUi();
  }
}

/** Analyse une nouvelle version lue sur le disque et l'ajoute aux enregistrements en attente :
 * delta cumulé (modèle affiché → cette version) et delta pas à pas (version précédente en attente → cette version).
 * @param {string} text - Contenu XML
 * @param {string} hash - Empreinte du contenu
 * @param {number} mtime - Date de modification du fichier
 * @param {boolean} manual - Vérification demandée par l'utilisateur
 */
function capWatchRegister(text, hash, mtime, manual){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')){
    // Enregistrement probablement en cours : on réessaiera au prochain passage
    _capWatch.diskHash=''; _capWatch.diskMtime=0;
    if(manual) capWatchFlash('⚠ Fichier illisible pour l\'instant (enregistrement en cours ?) — réessayez');
    return;
  }
  const curIdx=_capWatch.shownIdx||(_capWatch.shownIdx=capDiffIndex(cap_xmlDoc));
  const newIdx=capDiffIndex(doc);
  const diff=capDiffCompute(curIdx,newIdx);
  const p=_capWatch.pending;
  if(!diff.length){
    // Réenregistrement sans changement d'élément : la version affichée est déjà à jour
    _capWatch.shownHash=hash; _capWatch.shownMtime=mtime; _capWatch.pending=null;
    capWatchNote(false); capWatchModalRefresh();
    capWatchFlash('Fichier réenregistré — aucune différence de contenu');
    return;
  }
  const step=p?capDiffCompute(p.idx,newIdx):diff;
  const v={at:Date.now(), mtime, counts:capWatchCounts(step), step:capWatchLite(step)};
  _capWatch.pending={doc, hash, mtime, idx:newIdx, diff, counts:capWatchCounts(diff), common:capWatchCommon(curIdx,newIdx),
    versions:[...(p?p.versions:[]), v].slice(-30), first:p?p.first:v.at};
  _capWatch.state=''; _capWatch.dismissed=false;
  capWatchNote(true); capWatchModalRefresh(); capWatchUpdateUi();
}

var CAP_WATCH_SAME_MIN=0.5;   // en dessous de 50 % d'éléments communs : « ce n'est peut-être pas le même projet »

/** Part des éléments identifiés communs aux deux versions (rapportée à la plus grande).
 * @param {object} A - Index de la version affichée (capDiffIndex)
 * @param {object} B - Index de la nouvelle version
 * @returns {number} Ratio entre 0 et 1
 */
function capWatchCommon(A, B){
  const a=Object.keys(A), nb=Object.keys(B).length; let n=0;
  a.forEach(id=>{ if(B[id]) n++; });
  return n/Math.max(1,a.length,nb);
}

/** Avertissement (HTML) quand la nouvelle version partage trop peu d'éléments avec le modèle affiché.
 * @param {object} p - Version en attente
 * @returns {string} HTML, vide si les versions sont proches
 */
function capWatchSuspectHtml(p){
  if(!p||p.common==null||p.common>=CAP_WATCH_SAME_MIN) return '';
  return `<div class="cw-suspect">⚠ Seuls <b>${Math.round(p.common*100)} %</b> des éléments sont communs avec le modèle affiché : ce n'est peut-être <b>pas le même projet</b>. Vérifiez le delta avant de mettre à jour.</div>`;
}

/** Choisit manuellement la nouvelle version du fichier (accès limité, page sauvegardée, fichier déplacé) :
 * le fichier choisi devient la source suivie et son contenu est comparé au modèle affiché, sans le charger. */
async function capWatchPickNewVersion(){
  const inp=document.getElementById('cap-watch-input');
  inp.onchange=()=>{ const f=inp.files[0]; inp.value=''; if(f) adopt(f,null); };
  if(!window.showOpenFilePicker||_capPickerKo){ inp.click(); return; }
  const r=await capWatchPick(); if(!r) return;
  if(r.input){ capWatchPickerFailed(inp, false); return; }
  adopt(r.file, r.handle);
  /** Adopte le fichier choisi comme source et le compare au modèle affiché. */
  async function adopt(f, h){
    if(_capWatch.name&&f.name!==_capWatch.name&&!confirm(`Le fichier choisi (« ${f.name} ») n'a pas le même nom que le modèle affiché (« ${_capWatch.name} »).\nLe comparer quand même ?`)) return;
    let text; try{ text=await f.text(); }catch(e){ alert('Impossible de lire « '+f.name+' ».'); return; }
    Object.assign(_capWatch,{handle:h, file:f, name:f.name, state:'', diskMtime:f.lastModified, diskSize:f.size, lastCheck:Date.now()});
    if(!_capWatch.origDoc){ _capWatch.origDoc=cap_xmlDoc; _capWatch.origAt=Date.now(); }
    capWatchArm();
    const hash=capWatchHash(text);
    if(hash===_capWatch.shownHash){ _capWatch.diskHash=hash; capWatchNote(false); capWatchFlash('✔ Le fichier correspond au modèle affiché'); capWatchUpdateUi(); return; }
    if(_capWatch.pending&&hash===_capWatch.pending.hash){ _capWatch.diskHash=hash; _capWatch.dismissed=false; capWatchNote(true); capWatchUpdateUi(); return; }
    _capWatch.diskHash=hash;
    capWatchRegister(text, hash, f.lastModified, true);
    if(!_capWatch.pending) capWatchUpdateUi();
  }
}

/** Applique la version en attente : recharge le modèle (vue courante conservée), archive le delta dans l'historique
 * et place la version précédente dans ⚖ Comparaison de versions (sauf si l'utilisateur y a chargé sa propre version). */
function capWatchApply(){
  const p=_capWatch.pending; if(!p) return;
  if(p.common!=null&&p.common<CAP_WATCH_SAME_MIN&&!confirm(`Seuls ${Math.round(p.common*100)} % des éléments sont communs avec le modèle affiché : ce n'est peut-être pas le même projet.\n\nRemplacer quand même le modèle affiché par cette version ?`)) return;
  const prev=cap_xmlDoc, prevName=capCurrentFileName, mode=currentMode;
  const name=_capWatch.name||capCurrentFileName;
  try{ capApplyXmlDoc(p.doc, name); }
  catch(e){
    alert('Mise à jour impossible : '+e.message+'\nLe modèle précédent est conservé.');
    try{ capApplyXmlDoc(prev, prevName); }catch(_){}
    return;
  }
  if(mode!=='capella') applyMode(mode);
  const at=Date.now();
  _capWatch.history.unshift({at, from:_capWatch.shownMtime, mtime:p.mtime, counts:p.counts, saves:p.versions.length, diff:capWatchLite(p.diff)});
  _capWatch.history=_capWatch.history.slice(0,30);
  Object.assign(_capWatch,{prevDoc:prev, shownHash:p.hash, shownMtime:p.mtime, shownAt:at, shownIdx:p.idx, pending:null, dismissed:false});
  if(!capDiffDoc||capDiffDoc===_capWatch.diffDoc){
    capDiffDoc=prev; capDiffName=`${name} — avant la mise à jour de ${capWatchTime(at)}`; capDiffSwap=false; _capWatch.diffDoc=prev;
  }
  capWatchNote(false); capWatchModalClose(); capWatchUpdateUi();
  capWatchFlash(`✔ Modèle mis à jour (${p.counts.total} différence(s))`);
}

/** Ouvre ⚖ Comparaison de versions (🔬 Analyses) sur deux versions connues du suivi.
 * @param {'pending'|'last'|'orig'} what - Version sur disque en attente / avant la dernière mise à jour / version d'ouverture
 */
function capWatchOpenCompare(what){
  const name=_capWatch.name||capCurrentFileName;
  let doc, label, swap;
  if(what==='pending'&&_capWatch.pending){ doc=_capWatch.pending.doc; label=`${name} — sur le disque (${capWatchDate(_capWatch.pending.mtime)}), non appliquée`; swap=true; }
  else if(what==='last'&&_capWatch.prevDoc){ doc=_capWatch.prevDoc; label=`${name} — avant la mise à jour de ${capWatchTime(_capWatch.history[0]&&_capWatch.history[0].at)}`; swap=false; }
  else if(what==='orig'&&_capWatch.origDoc&&_capWatch.origDoc!==cap_xmlDoc){ doc=_capWatch.origDoc; label=`${name} — version d'ouverture (${capWatchTime(_capWatch.origAt)})`; swap=false; }
  else return;
  capDiffDoc=doc; capDiffName=label; capDiffSwap=swap; _capWatch.diffDoc=doc;
  if(_capAnaCache) delete _capAnaCache.diff;
  capWatchModalClose(); capWatchMenu(false);
  capAnaSub='diff';
  capShowView('analyses');
}

/* ── Interface : bouton, menu, notification, fenêtre du delta ───────────── */

/** Met à jour le bouton 🔄 Suivi (visibilité, badge, info-bulle). */
function capWatchUpdateUi(){
  const b=document.getElementById('b-cap-watch'); if(!b) return;
  b.style.display=capLoaded?'':'none';
  const badge=document.getElementById('b-cap-watch-badge');
  const p=_capWatch.pending, st=_capWatch.state;
  if(badge){
    badge.textContent=p?String(p.versions.length):(st==='stale'||st==='missing'||st==='denied')?'!':'';
    badge.style.display=badge.textContent?'':'none';
  }
  b.classList.toggle('cw-busy',_capWatch.busy);
  b.title=p?`${p.versions.length} enregistrement(s) détecté(s) — ${p.counts.total} différence(s) avec le modèle affiché`
    :st==='stale'?'Le fichier a été modifié : resélectionnez-le pour voir le delta'
    :'Suivi du fichier .capella : vérifier les mises à jour, delta, historique';
  if(document.getElementById('cap-watch-dd')?.style.display==='block') capWatchMenuRender();
}

/** Affiche brièvement un message dans la notification (sans action). @param {string} msg - Message */
function capWatchFlash(msg){
  const n=document.getElementById('cap-watch-flash'); if(!n) return;
  n.textContent=msg; n.style.display='block';
  clearTimeout(n._t); n._t=setTimeout(()=>{ n.style.display='none'; },3500);
}

/** Affiche ou masque la notification de mise à jour (coin inférieur droit).
 * @param {boolean} show - true : afficher selon l'état courant (version en attente, fichier non relisible…)
 */
function capWatchNote(show){
  const n=document.getElementById('cap-watch-note'); if(!n) return;
  const p=_capWatch.pending, st=_capWatch.state, name=capEsc(_capWatch.name||capCurrentFileName);
  if(!show||_capWatch.dismissed||(!p&&!['stale','missing','denied'].includes(st))){ n.style.display='none'; return; }
  let html;
  if(p){
    const nv=p.versions.length;
    html=`<div class="cw-n-t">🔄 Nouvelle version du modèle</div>
      <div class="cw-n-s">« ${name} » — ${nv>1?`<b>${nv} enregistrements</b> détectés depuis ${capWatchTime(p.first)}, dernier à ${capWatchTime(p.versions[nv-1].at)}`:`enregistré le ${capWatchDate(p.mtime)}`}</div>
      <div class="cw-n-c">${capWatchChips(p.counts)} <span class="ana-dim">par rapport au modèle affiché</span></div>${capWatchSuspectHtml(p)}
      <div class="cw-n-b"><button class="cap-lf-btn" data-cw="delta">🔍 Voir le delta</button><button class="phl-export-btn" data-cw="apply">✔ Mettre à jour</button><button class="cap-lf-btn" data-cw="later">Plus tard</button></div>`;
  } else {
    const msg={stale:'a été modifié sur le disque, mais le navigateur ne peut pas le relire directement. Resélectionnez-le pour voir le delta.',
      missing:'est introuvable (déplacé, renommé ou supprimé). Choisissez le fichier à suivre.',
      denied:'n\'est plus accessible (autorisation refusée). Choisissez de nouveau le fichier à suivre.'}[st];
    html=`<div class="cw-n-t">🔄 ${st==='stale'?'Modèle modifié sur le disque':'Fichier suivi indisponible'}</div>
      <div class="cw-n-s">« ${name} » ${msg}</div>
      <div class="cw-n-b"><button class="phl-export-btn" data-cw="pick">📂 Choisir le fichier…</button><button class="cap-lf-btn" data-cw="later">Plus tard</button></div>`;
  }
  n.innerHTML=html; n.style.display='block';
  n.querySelectorAll('[data-cw]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.cw;
    if(a==='delta') capWatchShowDelta('pending');
    else if(a==='apply') capWatchApply();
    else if(a==='pick') capWatchPickNewVersion();
    else { _capWatch.dismissed=true; n.style.display='none'; }
  });
}

/** Ouvre ou ferme le menu du bouton 🔄 Suivi. @param {boolean} [show] - Forcer l'état (sinon bascule) */
function capWatchMenu(show){
  const dd=document.getElementById('cap-watch-dd'); if(!dd) return;
  const open=show===undefined?dd.style.display!=='block':show;
  dd.style.display=open?'block':'none';
  if(open) capWatchMenuRender();
}

/** Construit le contenu du menu 🔄 Suivi (état de la source, réglages, historique). */
function capWatchMenuRender(){
  const dd=document.getElementById('cap-watch-dd'); if(!dd) return;
  const w=_capWatch, p=w.pending, src=w.handle||w.file;
  const acc=w.handle?'accès direct — relecture automatique':w.file?'accès limité — modification signalée, fichier à resélectionner':'aucun fichier suivi (page sauvegardée)';
  const per=[[10,'10 s'],[30,'30 s'],[60,'1 min'],[300,'5 min']];
  dd.innerHTML=`<div class="cw-m-info"><b>${capEsc(w.name||capCurrentFileName||'—')}</b><br>${acc}<br>
      Affiché : fichier du ${capWatchDate(w.shownMtime)}${src?`<br>Dernière vérification : ${w.busy?'en cours…':capWatchTime(w.lastCheck)}`:''}</div>
    <div class="ctx-i" data-wm="check">🔍 ${src?'Vérifier maintenant':'Choisir le fichier à comparer…'}</div>
    ${p?`<div class="ctx-i" data-wm="delta">📋 Voir le delta en attente (${p.versions.length} enreg., ${p.counts.total} diff.)</div>
      <div class="ctx-i" data-wm="apply">✔ Mettre à jour l'affichage</div>`:''}
    <div class="cw-m-sep"></div>
    <label class="cw-m-opt" title="${src?'':'Disponible quand un fichier .capella est suivi'}"><input type="checkbox" data-wm="auto"${w.auto?' checked':''}${src?'':' disabled'}> Détecter les nouvelles versions toutes les
      <select data-wm="period">${per.map(([v,l])=>`<option value="${v}"${w.period===v?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="cw-m-opt"><input type="checkbox" data-wm="focus"${w.onFocus?' checked':''}${src?'':' disabled'}> Vérifier au retour dans la fenêtre</label>
    <div class="cw-m-hint">Vous êtes seulement prévenu : la mise à jour n'est jamais appliquée sans votre validation (✔ Mettre à jour). En cas de plusieurs enregistrements, c'est la dernière version qui est appliquée.</div>
    <div class="cw-m-sep"></div>
    <div class="ctx-i${w.history.length?'':' cw-off'}" data-wm="hist">🕘 Historique des mises à jour (${w.history.length})</div>
    <div class="ctx-i${w.prevDoc?'':' cw-off'}" data-wm="last">⚖ Comparer avec la version avant la dernière mise à jour</div>
    <div class="ctx-i${w.origDoc&&w.origDoc!==cap_xmlDoc?'':' cw-off'}" data-wm="orig">⚖ Comparer avec la version d'ouverture</div>
    ${src?'<div class="ctx-i" data-wm="pick">📂 Suivre un autre fichier (nouvelle version)…</div>':''}`;
  dd.querySelectorAll('.ctx-i[data-wm]').forEach(el=>el.onclick=()=>{
    if(el.classList.contains('cw-off')) return;
    const a=el.dataset.wm; capWatchMenu(false);
    if(a==='check') capWatchCheck(true);
    else if(a==='delta') capWatchShowDelta('pending');
    else if(a==='apply') capWatchApply();
    else if(a==='hist') capWatchShowHistory();
    else if(a==='last'||a==='orig') capWatchOpenCompare(a);
    else if(a==='pick') capWatchPickNewVersion();
  });
  dd.querySelector('[data-wm="auto"]').onchange=e=>{ w.auto=e.target.checked; capWatchArm(); };
  dd.querySelector('[data-wm="period"]').onchange=e=>{ w.period=+e.target.value; capWatchArm(); };
  dd.querySelector('[data-wm="focus"]').onchange=e=>{ w.onFocus=e.target.checked; };
}

/** Ferme la fenêtre du delta. */
function capWatchModalClose(){
  const ov=document.getElementById('cap-watch-ov'); if(ov){ ov.style.display='none'; ov._what=null; }
}
/** Réaffiche la fenêtre du delta si elle montre la version en attente (nouvel enregistrement détecté entre-temps). */
function capWatchModalRefresh(){
  const ov=document.getElementById('cap-watch-ov');
  if(ov&&ov.style.display!=='none'&&ov._what==='pending'){ if(_capWatch.pending) capWatchShowDelta('pending'); else capWatchModalClose(); }
}

/** Affiche la fenêtre du delta : version en attente (cumul et enregistrements pas à pas) ou mise à jour de l'historique.
 * @param {'pending'|number} what - 'pending' ou indice dans l'historique
 */
function capWatchShowDelta(what){
  const ov=document.getElementById('cap-watch-ov'); if(!ov) return;
  const w=_capWatch, name=capEsc(w.name||capCurrentFileName);
  const isP=what==='pending', p=w.pending, hx=isP?null:w.history[what];
  if(isP&&!p||!isP&&!hx){ capWatchModalClose(); return; }
  const st=ov._what===what&&ov._st?ov._st:{sel:'cumul', status:'all', q:'', open:new Set()};
  ov._what=what; ov._st=st;
  const versions=isP?p.versions:[];
  if(st.sel!=='cumul'&&!versions[st.sel]) st.sel='cumul';
  const diff=st.sel==='cumul'?(isP?p.diff:hx.diff):versions[st.sel].step;
  const counts=capWatchCounts(diff);
  const head=isP
    ?`Modèle affiché : fichier du <b>${capWatchDate(w.shownMtime)}</b> &nbsp;→&nbsp; sur le disque : fichier du <b>${capWatchDate(p.mtime)}</b>${capWatchSuspectHtml(p)}`
    :`Mise à jour appliquée à <b>${capWatchTime(hx.at)}</b> : fichier du ${capWatchDate(hx.from)} → ${capWatchDate(hx.mtime)}${hx.saves>1?` (${hx.saves} enregistrements cumulés)`:''}`;
  // Plusieurs enregistrements : cumul (appliqué) + chaque enregistrement pas à pas
  const timeline=versions.length>1?`<div class="cw-d-sec">Enregistrements détectés avant validation : le delta <b>cumulé</b> est celui qui sera appliqué ; chaque ligne montre ce qu'a changé un enregistrement par rapport au précédent.</div>
    <table class="ana-t cw-d-tl"><tr><th></th><th>Détecté à</th><th>Fichier du</th><th>Changements</th></tr>
      <tr class="cw-d-v${st.sel==='cumul'?' sel':''}" data-v="cumul"><td>Σ</td><td colspan="2"><b>Cumul</b> — modèle affiché → dernier enregistrement</td><td>${capWatchChips(p.counts)}</td></tr>
      ${versions.map((v,i)=>`<tr class="cw-d-v${st.sel===i?' sel':''}" data-v="${i}"><td>${i+1}</td><td>${capWatchTime(v.at)}</td><td>${capWatchDate(v.mtime)}</td><td>${capWatchChips(v.counts)}</td></tr>`).join('')}
    </table>`:'';
  const ST={add:{i:'➕',l:'Ajouté',c:'var(--c-ok,#3fb950)'}, del:{i:'➖',l:'Supprimé',c:'var(--c-err,#f85149)'}, mod:{i:'✎',l:'Modifié',c:'var(--c-warn,#e3b341)'}};
  const q=st.q.trim().toLowerCase();
  const rows=diff.filter(d=>(st.status==='all'||(st.status==='mov'?d.moved:d.status===st.status))&&(!q||((d.e.name||'')+' '+d.e.type+' '+capAnaHuman(d.e.type)).toLowerCase().includes(q)))
    .sort((a,b)=>CAP_CHAIN_LAYER_ORDER.indexOf(a.e.layer)-CAP_CHAIN_LAYER_ORDER.indexOf(b.e.layer)||a.e.type.localeCompare(b.e.type)||(a.e.name||'').localeCompare(b.e.name||'','fr'));
  ov._rows=rows;
  // Synthèse par couche
  const byL={}; diff.forEach(d=>{ const k=d.e.layer||'?'; const t=byL[k]=byL[k]||{add:0,del:0,mod:0}; t[d.status]++; });
  const layers=CAP_CHAIN_LAYER_ORDER.filter(k=>byL[k]);
  const MAX=400;
  const list=rows.slice(0,MAX).map(d=>{
    const s=ST[d.status], k=d.e.id+d.status, open=st.open.has(k);
    return `<tr class="ana-df-row" data-k="${capEsc(k)}"><td style="color:${s.c};white-space:nowrap">${s.i} ${s.l}${d.moved?' <span style="color:#58a6ff">↪</span>':''}</td>
      <td>${capChainLayerBadge(d.e.layer)}</td><td class="ana-dim">${capEsc(capAnaHuman(d.e.type))}</td><td>${capEsc(d.e.name||'('+capAnaHuman(d.e.type)+')')}</td>
      <td class="ana-dim">${d.changes.length?`${d.changes.length} changement(s) ${open?'▾':'▸'}`:''}</td></tr>
      ${open&&d.changes.length?`<tr class="ana-df-det"><td colspan="5"><table class="ana-t"><tr><th>Propriété</th><th>Avant</th><th>Après</th></tr>
        ${d.changes.map(c=>`<tr><td><b>${capEsc(c.k)}</b></td><td class="ana-old">${capEsc(String(c.a).slice(0,600))||'<i>vide</i>'}</td><td class="ana-new">${capEsc(String(c.b).slice(0,600))||'<i>vide</i>'}</td></tr>`).join('')}</table></td></tr>`:''}`;
  }).join('');
  const cnt=k=>k==='all'?counts.total:counts[k];
  ov.innerHTML=`<div class="cw-d-box">
    <div class="cw-d-hdr"><b>🔄 ${isP?'Delta des modifications':'Mise à jour du '+capWatchTime(hx.at)} — « ${name} »</b><button class="cap-lf-btn" data-d="close" title="Fermer">✕</button></div>
    <div class="cw-d-body">
      <div class="cw-d-sub">${head}</div>
      ${timeline}
      ${layers.length?`<div class="cw-d-sec">${st.sel==='cumul'?'':`<b>Enregistrement ${st.sel+1}</b> — `}Par couche : ${layers.map(k=>`${capChainLayerBadge(k)} ${capWatchChips({...byL[k],mov:0,total:1})}`).join(' &nbsp; ')}</div>`:''}
      <div class="phl-filter-bar" style="flex-wrap:wrap;margin:6px 0">
        ${[['all','Tous'],['add','➕ Ajoutés'],['del','➖ Supprimés'],['mod','✎ Modifiés'],['mov','↪ Déplacés']].map(([k,l])=>`<button class="cap-lf-btn${st.status===k?' active':''}" data-dfs="${k}">${l} (${cnt(k)})</button>`).join('')}
        <input class="phl-filter-input" data-d="q" placeholder="🔍 Nom ou type…" value="${capEsc(st.q)}" style="width:170px">
      </div>
      ${rows.length?`<table class="ana-t ana-df"><tr><th>Statut</th><th>Couche</th><th>Type</th><th>Élément</th><th>Détail</th></tr>${list}</table>
        ${rows.length>MAX?`<div class="cap-mx-hint">${MAX} lignes affichées sur ${rows.length} — filtrez, exportez en CSV ou ouvrez ⚖ Comparaison.</div>`:''}`
        :'<div class="phl-empty">Aucune différence pour ce filtre.</div>'}
    </div>
    <div class="cw-d-ftr">
      <button class="phl-export-btn" data-d="csv">⬇ CSV</button>
      ${isP?'<button class="cap-lf-btn" data-d="cmp" title="Analyse complète (filtres par couche et type, synthèse) dans 🔬 Analyses">⚖ Ouvrir dans Comparaison de versions</button>'
        :(what===0&&w.prevDoc?'<button class="cap-lf-btn" data-d="cmpl">⚖ Ouvrir dans Comparaison de versions</button>':'')}
      <span style="flex:1"></span>
      ${isP?'<button class="cap-lf-btn" data-d="later">Plus tard</button><button class="phl-export-btn cw-d-apply" data-d="apply">✔ Mettre à jour l\'affichage</button>':'<button class="cap-lf-btn" data-d="close">Fermer</button>'}
    </div></div>`;
  ov.style.display='flex';
  const re=()=>capWatchShowDelta(what);
  ov.querySelectorAll('[data-d="close"]').forEach(b=>b.onclick=capWatchModalClose);
  ov.querySelector('[data-d="later"]')?.addEventListener('click',()=>{ w.dismissed=true; capWatchNote(false); capWatchModalClose(); });
  ov.querySelector('[data-d="apply"]')?.addEventListener('click',capWatchApply);
  ov.querySelector('[data-d="cmp"]')?.addEventListener('click',()=>capWatchOpenCompare('pending'));
  ov.querySelector('[data-d="cmpl"]')?.addEventListener('click',()=>capWatchOpenCompare('last'));
  ov.querySelectorAll('.cw-d-v').forEach(tr=>tr.onclick=()=>{ st.sel=tr.dataset.v==='cumul'?'cumul':+tr.dataset.v; st.open=new Set(); re(); });
  ov.querySelectorAll('[data-dfs]').forEach(b=>b.onclick=()=>{ st.status=b.dataset.dfs; re(); });
  ov.querySelectorAll('.ana-df-row').forEach(tr=>tr.onclick=()=>{ const k=tr.dataset.k; if(st.open.has(k)) st.open.delete(k); else st.open.add(k); re(); });
  let deb; ov.querySelector('[data-d="q"]').oninput=e=>{ st.q=e.target.value; clearTimeout(deb); deb=setTimeout(()=>{ const pos=e.target.selectionStart; re(); const i=ov.querySelector('[data-d="q"]'); i.focus(); i.setSelectionRange(pos,pos); },250); };
  ov.querySelector('[data-d="csv"]').onclick=()=>{
    const out=[]; (ov._rows||[]).forEach(d=>{
      const base=[{add:'Ajouté',del:'Supprimé',mod:'Modifié'}[d.status]+(d.moved?' (déplacé)':''), d.e.layer, capAnaHuman(d.e.type), d.e.name, d.e.id];
      if(!d.changes.length) out.push([...base,'','','']); else d.changes.forEach(c=>out.push([...base,c.k,c.a,c.b]));
    });
    capCsvDownload('delta-mise-a-jour.csv',['Statut','Couche','Type','Élément','ID','Propriété','Avant','Après'],out);
  };
}

/** Affiche l'historique des mises à jour appliquées pendant la session (chacune ouvre son delta). */
function capWatchShowHistory(){
  const ov=document.getElementById('cap-watch-ov'); if(!ov) return;
  const w=_capWatch;
  ov._what=null;
  ov.innerHTML=`<div class="cw-d-box" style="max-width:720px">
    <div class="cw-d-hdr"><b>🕘 Historique des mises à jour — « ${capEsc(w.name||capCurrentFileName)} »</b><button class="cap-lf-btn" data-d="close">✕</button></div>
    <div class="cw-d-body">
      <div class="cw-d-sub">Ouvert à ${capWatchTime(w.origAt)}. Cliquez sur une mise à jour pour voir son delta.</div>
      ${w.history.length?`<table class="ana-t cw-d-tl"><tr><th>Appliquée à</th><th>Fichier du</th><th>Enreg.</th><th>Changements</th></tr>
        ${w.history.map((h,i)=>`<tr class="cw-d-v" data-h="${i}"><td>${capWatchTime(h.at)}</td><td>${capWatchDate(h.mtime)}</td><td>${h.saves}</td><td>${capWatchChips(h.counts)}</td></tr>`).join('')}</table>`
        :'<div class="phl-empty">Aucune mise à jour appliquée depuis l\'ouverture du modèle.</div>'}
    </div>
    <div class="cw-d-ftr">${w.origDoc&&w.origDoc!==cap_xmlDoc?'<button class="cap-lf-btn" data-d="orig">⚖ Delta cumulé depuis l\'ouverture</button>':''}<span style="flex:1"></span><button class="cap-lf-btn" data-d="close">Fermer</button></div></div>`;
  ov.style.display='flex';
  ov.querySelectorAll('[data-d="close"]').forEach(b=>b.onclick=capWatchModalClose);
  ov.querySelector('[data-d="orig"]')?.addEventListener('click',()=>capWatchOpenCompare('orig'));
  ov.querySelectorAll('[data-h]').forEach(tr=>tr.onclick=()=>capWatchShowDelta(+tr.dataset.h));
}

// Câblage
(function(){
  document.getElementById('b-cap-watch-main')?.addEventListener('click',ev=>{ ev.stopPropagation(); capWatchMenu(); });
  document.addEventListener('click',ev=>{ const wrap=document.getElementById('b-cap-watch'); if(wrap&&!wrap.contains(ev.target)) capWatchMenu(false); });
  document.getElementById('cap-watch-ov')?.addEventListener('click',ev=>{ if(ev.target.id==='cap-watch-ov') capWatchModalClose(); });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&document.getElementById('cap-watch-ov')?.style.display==='flex') capWatchModalClose(); });
  // Retour dans la fenêtre (après un enregistrement dans Capella) : vérification immédiate
  let deb;
  const back=()=>{ if(!_capWatch.onFocus||document.visibilityState!=='visible') return; clearTimeout(deb); deb=setTimeout(()=>capWatchCheck(false),400); };
  window.addEventListener('focus',back);
  document.addEventListener('visibilitychange',back);
  capWatchUpdateUi();
  window.addEventListener('load',capWatchUpdateUi);   // après un éventuel amorçage de page sauvegardée
})();
