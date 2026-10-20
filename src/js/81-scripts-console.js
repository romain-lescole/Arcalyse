// ── 📜 Console de scripts (macros) ──────────────────────────────────────────
// Reprise de la console de scripts d'Arcature (src/js/57-scripts.js et 59-scripts-dossier.js), sans la partie
// « modifications » : Arcalyse ne modifie jamais le modèle. Tiroir en bas des vues (bouton 📜 Scripts, Alt+4) :
// bibliothèque (exemples, scripts du projet gardés dans le bloc JSON `cap-scripts-data` de la 💾 page, dossier partagé
// Chrome / Edge), éditeur (Ctrl+Entrée), sortie (liens vers les éléments, tableaux avec CSV, fichiers à télécharger),
// questions posées par le script (ui.ask, ui.choose, ui.readCsv…). Le script s'exécute dans un worker construit à partir
// du noyau (capScrNoyau, 80) : pas d'accès à la page ni au réseau, interruptible ; il reçoit un instantané du modèle (82)
// et demande ses analyses à la page. Sans worker (navigateur qui le refuse) : exécution dans la page, signalée.

/** État de la console de scripts. */
var _capScr={ worker:null, url:null, decalage:0, enCours:false, debut:0, questions:[], choix:'', charge:'', tableaux:[], urls:[], nbSorties:0, tronque:false,
  bib:[], dossier:null, attente:null, noyau:null, open:false };
/** Nombre maximal de sorties affichées (au-delà : sortie tronquée). */
const CAP_SCR_MAX_SORTIES=5000;
/** Nombre maximal de lignes affichées par tableau (le CSV les contient toutes). */
const CAP_SCR_MAX_LIGNES=1000;
/** Base du navigateur où la poignée du dossier de scripts partagé est mémorisée (seule donnée hors de la page : une poignée ne se sérialise pas). */
const CAP_SCR_BASE={nom:'arcalyse', table:'poignees', cle:'dossier-scripts'};

/** Noyau de l'API (construit une fois dans la page : exemples, CSV, exécution sans worker). @returns {object} */
function capScrApi(){ return _capScr.noyau||(_capScr.noyau=capScrNoyau()); }

/** Bloc JSON `cap-scripts-data` de la page : bibliothèque et brouillon. @returns {{bib:object[], brouillon:object|null, hauteur:string}} */
function capScrData(){
  try{ const el=document.getElementById('cap-scripts-data'); const d=el?JSON.parse(el.textContent):null; if(d&&typeof d==='object') return Object.assign({bib:[], brouillon:null, hauteur:''}, d); }catch(e){ /* bloc absent ou illisible */ }
  return {bib:[], brouillon:null, hauteur:''};
}
/** Enregistre la bibliothèque et le brouillon dans la page (repris par la 💾 page HTML et 📄 Ouvrir un projet). */
function capScrSave(){
  let el=document.getElementById('cap-scripts-data');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-scripts-data'; document.head.appendChild(el); }
  const code=document.getElementById('scr-code'), sec=document.getElementById('cap-scripts');
  el.textContent=JSON.stringify({ bib:_capScr.bib, brouillon:{choix:_capScr.choix, code:code?code.value:''}, hauteur:sec&&sec.style.height||'' }).replace(/</g,'\\u003c');
}

/** Remplit la liste de la bibliothèque. */
function capScrListe(){
  const sel=document.getElementById('scr-liste'); if(!sel) return;
  const opt=(v,t)=>`<option value="${capEsc(v)}">${capEsc(t)}</option>`;
  let h=opt('', _L('(brouillon)'));
  h+=`<optgroup label="${capEsc(_L('Exemples'))}">`+capScrApi().exemples().map(x=>opt('ex:'+x.cle, x.nom)).join('')+'</optgroup>';
  if(_capScr.bib.length) h+=`<optgroup label="${capEsc(_L('Scripts du projet'))}">`+_capScr.bib.map((s,i)=>opt('bib:'+i, s.nom)).join('')+'</optgroup>';
  if(_capScr.dossier) h+=`<optgroup label="${capEsc('📁 '+_capScr.dossier.nom)}">`+_capScr.dossier.scripts.map((s,i)=>opt('dos:'+i, s.nom)).join('')+'</optgroup>';
  sel.innerHTML=h; sel.value=_capScr.choix;
  document.getElementById('scr-supprimer').disabled=!_capScr.choix.startsWith('bib:');
}
/** Script désigné par un choix de la liste. @param {string} choix - 'ex:clé', 'bib:indice' ou 'dos:indice' @returns {{nom:string, code:string}|null} */
function capScrScript(choix){
  if(choix.startsWith('ex:')) return capScrApi().exemples().find(x=>'ex:'+x.cle===choix)||null;
  if(choix.startsWith('bib:')) return _capScr.bib[+choix.slice(4)]||null;
  if(choix.startsWith('dos:')) return (_capScr.dossier&&_capScr.dossier.scripts[+choix.slice(4)])||null;
  return null;
}
/** Vrai si le texte de l'éditeur a changé depuis son chargement ou son enregistrement. @returns {boolean} */
function capScrModifie(){ const c=document.getElementById('scr-code'); return c.value!==_capScr.charge&&c.value.trim()!==''; }

/** Affiche un script de la liste dans l'éditeur (après confirmation si le texte en cours a changé). @param {string} choix */
async function capScrOuvrir(choix){
  const s=capScrScript(choix);
  if(!s){ _capScr.choix=''; capScrListe(); return; }
  if(capScrModifie()&&!(await capConfirm(_L('Le script en cours n\'est pas enregistré. Le remplacer ?')))){ capScrListe(); return; }
  _capScr.choix=choix; _capScr.charge=s.code;
  document.getElementById('scr-code').value=s.code;
  capScrListe(); capScrSave();
}
/** Enregistre le script affiché : dans son fichier (dossier partagé), à sa place (projet), sinon comme nouveau script. */
async function capScrEnregistrer(){
  const code=document.getElementById('scr-code').value;
  try{
    if(_capScr.choix.startsWith('dos:')&&capScrScript(_capScr.choix)){ await capScrDosEcrire(capScrScript(_capScr.choix).fichier, code, false); }
    else if(_capScr.choix.startsWith('bib:')&&_capScr.bib[+_capScr.choix.slice(4)]){ _capScr.bib[+_capScr.choix.slice(4)].code=code; capToast(_L('✔ Script enregistré dans le projet (💾 page HTML).')); }
    else {
      const ex=capScrScript(_capScr.choix);
      const nom=await capPrompt(_capScr.dossier?_L(`Nom du script (enregistré dans le dossier « ${_capScr.dossier.nom} ») :`):_L('Nom du script :'), ex?ex.nom:_L(`Script ${_capScr.bib.length+1}`));
      if(!nom||!nom.trim()) return;
      if(_capScr.dossier){ if(!(await capScrDosEcrire(nom.trim().replace(/[\\/:*?"<>|]/g,'_')+'.js', code, true))) return; }
      else { _capScr.bib.push({nom:nom.trim(), code}); _capScr.choix='bib:'+(_capScr.bib.length-1); capToast(_L('✔ Script enregistré dans le projet (💾 page HTML).')); }
    }
  }catch(e){ capToast(e.message, {level:'err'}); return; }
  _capScr.charge=code; capScrListe(); capScrSave();
}
/** Supprime le script affiché de la bibliothèque du projet. */
async function capScrSupprimer(){
  const i=_capScr.choix.startsWith('bib:')?+_capScr.choix.slice(4):-1;
  if(i<0||!_capScr.bib[i]||!(await capConfirm(_L(`Supprimer le script « ${_capScr.bib[i].nom} » du projet ?`), {danger:true}))) return;
  _capScr.bib.splice(i,1); _capScr.choix=''; _capScr.charge='';
  capScrListe(); capScrSave();
}
/** Nouveau script vide. */
async function capScrNouveau(){
  if(capScrModifie()&&!(await capConfirm(_L('Le script en cours n\'est pas enregistré. Le remplacer ?')))) return;
  _capScr.choix=''; _capScr.charge=''; document.getElementById('scr-code').value='';
  capScrListe(); capScrSave(); document.getElementById('scr-code').focus();
}
/** Décode un fichier texte : UTF-8, sinon Windows-1252 (CSV d'Excel). @param {ArrayBuffer} buf @returns {string} */
function capScrDecoder(buf){
  let t; try{ t=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(e){ t=new TextDecoder('windows-1252').decode(buf); }
  return t[0]==='﻿'?t.slice(1):t;
}
/** Importe des fichiers .js dans la bibliothèque du projet ; le premier est affiché. @param {File[]} fichiers */
async function capScrImporter(fichiers){
  if(!fichiers.length) return;
  if(capScrModifie()&&!(await capConfirm(_L('Le script en cours n\'est pas enregistré. Le remplacer ?')))) return;
  const premier=_capScr.bib.length;
  for(const f of fichiers) _capScr.bib.push({nom:f.name.replace(/\.(js|txt)$/i,''), code:capScrDecoder(await f.arrayBuffer())});
  _capScr.choix='bib:'+premier; _capScr.charge=_capScr.bib[premier].code;
  document.getElementById('scr-code').value=_capScr.charge;
  capScrListe(); capScrSave();
  capToast(_L(`✔ ${fichiers.length} script(s) importé(s) dans le projet.`));
}
/** Propose un texte en téléchargement. @param {string} contenu @param {string} nom @param {string} type */
function capScrTelecharger(contenu, nom, type){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([contenu],{type:type||'text/plain'})); a.download=nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
/** Exporte le script affiché en fichier .js. */
function capScrExporter(){ const s=capScrScript(_capScr.choix); capScrTelecharger(document.getElementById('scr-code').value, (s?s.nom:'script').replace(/[\\/:*?"<>|]/g,'_')+'.js', 'text/javascript'); }

// ── Dossier de scripts partagé (Chrome / Edge : File System Access API) ──
/** Ouvre la base du navigateur (null si indisponible). @returns {Promise<IDBDatabase|null>} */
function capScrBase(){
  return new Promise(resoudre=>{ try{ const r=indexedDB.open(CAP_SCR_BASE.nom,1); r.onupgradeneeded=()=>r.result.createObjectStore(CAP_SCR_BASE.table); r.onsuccess=()=>resoudre(r.result); r.onerror=()=>resoudre(null); }catch(e){ resoudre(null); } });
}
/** Lit ou mémorise la poignée du dossier. @param {FileSystemDirectoryHandle} [poignee] @returns {Promise<FileSystemDirectoryHandle|null>} */
async function capScrDosMemoire(poignee){
  const base=await capScrBase(); if(!base) return null;
  return new Promise(resoudre=>{ try{ const t=base.transaction(CAP_SCR_BASE.table, poignee?'readwrite':'readonly').objectStore(CAP_SCR_BASE.table);
    const r=poignee?t.put(poignee, CAP_SCR_BASE.cle):t.get(CAP_SCR_BASE.cle); r.onsuccess=()=>resoudre(poignee||r.result||null); r.onerror=()=>resoudre(null); }catch(e){ resoudre(null); } });
}
/** Vérifie, et demande si besoin, l'autorisation d'accès au dossier. @param {FileSystemDirectoryHandle} h @param {boolean} ecrire @param {boolean} demander @returns {Promise<boolean>} */
async function capScrDosAutorise(h, ecrire, demander){
  const mode={mode:ecrire?'readwrite':'read'};
  if(!h.queryPermission||(await h.queryPermission(mode))==='granted') return true;
  return demander&&(await h.requestPermission(mode))==='granted';
}
/** Lit les scripts (.js) du dossier et les place dans la bibliothèque. @param {FileSystemDirectoryHandle} h */
async function capScrDosCharger(h){
  const scripts=[];
  for await (const [nom,f] of h.entries()){ if(f.kind!=='file'||!/\.js$/i.test(nom)) continue; scripts.push({nom:nom.replace(/\.js$/i,''), fichier:nom, code:capScrDecoder(await (await f.getFile()).arrayBuffer())}); }
  scripts.sort((a,b)=>a.nom.localeCompare(b.nom));
  const affiche=_capScr.choix.startsWith('dos:')&&capScrScript(_capScr.choix)?capScrScript(_capScr.choix).fichier:null;
  _capScr.dossier={poignee:h, nom:h.name, scripts}; _capScr.attente=null;
  if(affiche){ const i=scripts.findIndex(x=>x.fichier===affiche); _capScr.choix=i>=0?'dos:'+i:''; }
  capScrListe(); capScrDosBouton();
}
/** Écrit un script dans le dossier, puis relit le dossier et affiche ce script. @param {string} fichier @param {string} code @param {boolean} nouveau @returns {Promise<boolean>} */
async function capScrDosEcrire(fichier, code, nouveau){
  const h=_capScr.dossier.poignee;
  if(!(await capScrDosAutorise(h,true,true))) throw new Error(_L(`Écriture refusée dans le dossier « ${h.name} ».`));
  if(nouveau&&_capScr.dossier.scripts.some(x=>x.fichier.toLowerCase()===fichier.toLowerCase())&&!(await capConfirm(_L(`Le fichier « ${fichier} » existe déjà dans le dossier. Le remplacer ?`)))) return false;
  const w=await (await h.getFileHandle(fichier,{create:true})).createWritable(); await w.write(code); await w.close();
  await capScrDosCharger(h);
  const i=_capScr.dossier.scripts.findIndex(x=>x.fichier===fichier); if(i>=0) _capScr.choix='dos:'+i;
  capToast(_L(`✔ Script enregistré dans le dossier « ${h.name} » : ${fichier}`));
  return true;
}
/** Bouton 📁 : visible si le navigateur sait ouvrir un dossier ; infobulle selon l'état. */
function capScrDosBouton(){
  const b=document.getElementById('scr-dossier'); if(!b) return;
  b.style.display=window.showDirectoryPicker?'':'none';
  b.classList.toggle('active', !!_capScr.dossier);
  b.title=_capScr.dossier?_L(`Dossier de scripts partagé : « ${_capScr.dossier.nom} » (${_capScr.dossier.scripts.length} scripts). Cliquer pour en choisir un autre.`)
    :_capScr.attente?_L(`Rouvrir le dossier de scripts « ${_capScr.attente.name} » (le navigateur demande l'autorisation)`):_L('Ouvrir un dossier de scripts partagé (à côté du modèle, sur un partage réseau…)');
}
/** Bouton 📁 : rouvre le dossier mémorisé, ou en fait choisir un. */
async function capScrDosChoisir(){
  try{
    if(_capScr.attente&&!_capScr.dossier){ if(await capScrDosAutorise(_capScr.attente,false,true)){ await capScrDosCharger(_capScr.attente); return; } }
    const h=await window.showDirectoryPicker({id:'arcalyse-scripts', mode:'readwrite'});
    await capScrDosCharger(h); await capScrDosMemoire(h);
    capToast(_L(`✔ Dossier de scripts : « ${h.name} », ${_capScr.dossier.scripts.length} script(s).`));
  }catch(e){ if(e.name!=='AbortError') capToast(e.message,{level:'err'}); }
}
/** Retrouve le dossier mémorisé : relu tout de suite si l'autorisation est encore valable. */
async function capScrDosInit(){
  capScrDosBouton();
  if(!window.showDirectoryPicker) return;
  const h=await capScrDosMemoire(); if(!h) return;
  _capScr.attente=h;
  try{ if(await capScrDosAutorise(h,false,false)) await capScrDosCharger(h); }catch(e){ /* dossier déplacé ou supprimé */ }
  capScrDosBouton();
}

// ── Sortie ──
/** Ouvre ou ferme le tiroir des scripts (bascule en mode Capella si besoin). @param {boolean} [ouvrir] */
function capScrToggle(ouvrir){
  const t=document.getElementById('cap-scripts'); if(!t) return;
  const voir=ouvrir==null?!_capScr.open:!!ouvrir;
  if(voir&&!capLoaded){ capToast(_L('Ouvrez d\'abord un modèle.'),{level:'warn'}); return; }
  if(voir&&currentMode!=='capella') applyMode('capella');
  _capScr.open=voir; t.style.display=voir?'flex':'none';
  document.getElementById('b-scripts')?.classList.toggle('active', voir);
  if(voir){ if(_capScr.dossier) capScrDosCharger(_capScr.dossier.poignee).catch(()=>{ /* dossier inaccessible : liste inchangée */ }); document.getElementById('scr-code').focus(); }
}
/** Vide la sortie (et libère les fichiers proposés). */
function capScrEffacer(){
  _capScr.urls.forEach(u=>URL.revokeObjectURL(u)); _capScr.urls=[]; _capScr.tableaux=[]; _capScr.nbSorties=0; _capScr.tronque=false;
  document.getElementById('scr-sortie').innerHTML='';
}
/** HTML d'un morceau de sortie : texte, ou lien vers un élément. @param {string|object} m @returns {string} */
function capScrMorceau(m){
  if(typeof m==='string') return capEsc(m);
  const el=capGetElementById_(m.id);
  if(!el) return `<span class="scr-dim" title="${capEsc(m.id)}">${capEsc(m.type)} ${capEsc(m.label)}</span>`;
  return `<span class="cap-det-link" data-id="${capEsc(m.id)}" title="${capEsc(m.type)}${m.layer?' · '+capEsc(m.layer):''}">${capIcoType(m.type,12)}${capEsc(m.label)}</span>`;
}
/** Ajoute un nœud à la sortie (fin gardée visible si l'utilisateur y était). @param {HTMLElement} n */
function capScrAjouter(n){ const s=document.getElementById('scr-sortie'), enBas=s.scrollHeight-s.scrollTop-s.clientHeight<40; s.appendChild(n); if(enBas) s.scrollTop=s.scrollHeight; }
/** Affiche une ligne (état, erreur…). @param {string} html @param {string} [classe] @returns {HTMLElement} */
function capScrLigne(html, classe){ const d=document.createElement('div'); d.className='scr-l '+(classe||''); d.innerHTML=html; capScrAjouter(d); return d; }
/** Affiche un lot de sorties du script. @param {object[]} lot - Messages { k, … } */
function capScrAfficher(lot){
  for(const m of lot){
    if(m.k==='clear'){ capScrEffacer(); continue; }
    if(m.k==='progress'){ let p=document.getElementById('scr-sortie').querySelector('.scr-progression'); if(!p) p=capScrLigne('','scr-progression');
      p.textContent=m.total?_L(`Avancement : ${m.fait} / ${m.total}`):_L(`Avancement : ${m.fait}`); continue; }
    if(_capScr.nbSorties>=CAP_SCR_MAX_SORTIES){ if(!_capScr.tronque){ _capScr.tronque=true; capScrLigne(capEsc(_L(`… sortie tronquée après ${CAP_SCR_MAX_SORTIES} messages.`)),'scr-av'); } continue; }
    _capScr.nbSorties++;
    if(m.k==='print') capScrLigne(m.parts.map(capScrMorceau).join(''), m.niveau==='warn'?'scr-av':m.niveau==='error'?'scr-err':'');
    else if(m.k==='table') capScrTableau(m);
    else if(m.k==='file'){ const url=URL.createObjectURL(new Blob([m.contenu],{type:m.type})); _capScr.urls.push(url);
      capScrLigne(`📄 <a href="${capEsc(url)}" download="${capEsc(m.nom)}">${capEsc(m.nom)}</a> <span class="scr-dim">${capEsc(_L(`${new Blob([m.contenu]).size} octets`))}</span>`,'scr-fic'); }
  }
}
/** Affiche un tableau de sortie (lignes bornées) avec son export CSV. @param {{titre:string, colonnes:string[], cellules:Array}} m */
function capScrTableau(m){
  const i=_capScr.tableaux.push(m)-1;
  const lignes=m.cellules.slice(0,CAP_SCR_MAX_LIGNES).map(l=>'<tr>'+l.map(c=>{ const num=c.length===1&&typeof c[0]==='string'&&/^-?\d+(\.\d+)?$/.test(c[0]); return `<td${num?' class="num"':''}>${c.map(capScrMorceau).join('')}</td>`; }).join('')+'</tr>').join('');
  const reste=m.cellules.length-CAP_SCR_MAX_LIGNES, d=document.createElement('div'); d.className='scr-tableau';
  d.innerHTML=`<div class="scr-t-titre">${m.titre?`<strong>${capEsc(m.titre)}</strong> `:''}<span class="scr-dim">${capEsc(_L(`${m.cellules.length} ligne(s)`))}</span>`+
    ` <button class="cap-lf-btn" data-csv="${i}" title="${capEsc(_L('Télécharger le tableau complet en CSV'))}">⬇ CSV</button></div>`+
    `<table><thead><tr>${m.colonnes.map(c=>`<th>${capEsc(c)}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table>`+
    (reste>0?`<div class="scr-dim">${capEsc(_L(`… et ${reste} ligne(s) de plus (voir le CSV)`))}</div>`:'');
  capScrAjouter(d);
}
/** Pose dans la sortie une question du script et attend la réponse. @param {object} d - Demande { k, question, defaut, items, multiple, accept } @returns {Promise<*>} */
function capScrDemander(d){
  return new Promise(resoudre=>{
    const cadre=document.createElement('div'); cadre.className='scr-question';
    const abandon=d.k==='confirm'?false:d.k==='choose'&&d.multiple?[]:null;
    let fini=false;
    const fin=(v,resume)=>{ if(fini) return; fini=true; cadre.querySelectorAll('button, input').forEach(x=>{ x.disabled=true; }); cadre.classList.add('repondue');
      const r=document.createElement('div'); r.className='scr-dim'; r.textContent='→ '+resume; cadre.appendChild(r);
      _capScr.questions=_capScr.questions.filter(q=>q!==annuler); resoudre(v); };
    const annuler=()=>fin(abandon, _L('(annulé)'));
    _capScr.questions.push(annuler);
    const bouton=(cle,texte,principal)=>`<button class="cap-lf-btn${principal?' scr-principal':''}" data-q="${cle}">${capEsc(texte)}</button>`;
    const titre=d.question?`<div class="scr-q-titre">❓ ${capEsc(d.question)}</div>`:'';
    const libelle=m=>(typeof m==='string'?capEsc(m):`<span class="scr-pastille">${capEsc(m.type)}</span> ${capEsc(m.label)}`);
    if(d.k==='ask'){ cadre.innerHTML=titre+`<div class="scr-q-ligne"><input type="text">${bouton('ok',_L('OK'),true)}${bouton('annuler',_L('Annuler'))}</div>`; cadre.querySelector('input').value=d.defaut||''; }
    else if(d.k==='confirm'){ cadre.innerHTML=titre+`<div class="scr-q-ligne">${bouton('oui',_L('Oui'),true)}${bouton('non',_L('Non'))}</div>`; }
    else if(d.k==='choose'){ const type=d.multiple?'checkbox':'radio', nom='q'+Date.now();
      cadre.innerHTML=titre+(d.items.length>8?`<input type="search" class="scr-q-filtre" placeholder="${capEsc(_L('Filtrer…'))}">`:'')+
        `<div class="scr-q-liste">${d.items.map((m,i)=>`<label><input type="${type}" name="${nom}" value="${i}"> ${libelle(m)}</label>`).join('')}</div>`+
        `<div class="scr-q-ligne">${bouton('ok',_L('OK'),true)}${bouton('annuler',_L('Annuler'))}</div>`; }
    else if(d.k==='file'){ cadre.innerHTML=titre+`<div class="scr-q-ligne">${bouton('fichier',_L('Choisir un fichier…'),true)}${bouton('annuler',_L('Annuler'))}<span class="scr-dim">${capEsc(_L('Le script demande un fichier.'))}</span><input type="file" hidden></div>`;
      if(d.accept) cadre.querySelector('input[type=file]').accept=d.accept; }
    else { resoudre(abandon); return; }
    const valider=()=>{ if(d.k==='ask'){ const v=cadre.querySelector('input').value; fin(v,v); return; }
      const coches=[...cadre.querySelectorAll('.scr-q-liste input:checked')].map(x=>+x.value);
      fin(d.multiple?coches:coches.length?coches[0]:null, coches.map(i=>(typeof d.items[i]==='string'?d.items[i]:d.items[i].label)).join(', ')||_L('(aucun)')); };
    cadre.addEventListener('click',e=>{ const b=e.target.closest('[data-q]'); if(!b) return;
      ({ok:valider, annuler, oui:()=>fin(true,_L('Oui')), non:()=>fin(false,_L('Non')), fichier:()=>cadre.querySelector('input[type=file]').click()})[b.dataset.q](); });
    cadre.addEventListener('dblclick',e=>{ if(d.k==='choose'&&!d.multiple&&e.target.closest('label')) valider(); });
    cadre.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); annuler(); } else if(e.key==='Enter'&&d.k!=='file'&&!e.target.closest('button')){ e.preventDefault(); valider(); } });
    const filtre=cadre.querySelector('.scr-q-filtre');
    if(filtre) filtre.oninput=()=>{ const t=filtre.value.toLowerCase(); cadre.querySelectorAll('.scr-q-liste label').forEach(l=>{ l.hidden=!!t&&!l.textContent.toLowerCase().includes(t); }); };
    const entree=cadre.querySelector('input[type=file]');
    if(entree) entree.onchange=async()=>{ const f=entree.files[0]; if(!f) return; try{ fin({name:f.name, text:capScrDecoder(await f.arrayBuffer())}, f.name); }catch(e){ capToast(e.message,{level:'err'}); annuler(); } };
    capScrAjouter(cadre);
    document.getElementById('scr-etat').textContent=_L('Le script attend une réponse…');
    const focus=cadre.querySelector('.scr-q-filtre, input[type=text], .scr-q-liste input, button'); if(focus) focus.focus();
  });
}
/** Abandonne les questions encore ouvertes (fin ou arrêt du script). */
function capScrAbandonner(){ _capScr.questions.slice().forEach(q=>q()); }

// ── Exécution ──
/** Fin d'exécution : bilan dans la console. @param {{ok:boolean, erreur?:string, ligne?:number|null, duree:number, sorties:number}} r */
function capScrFin(r){
  if(_capScr.worker){ _capScr.worker.terminate(); _capScr.worker=null; }
  capScrAbandonner();
  if(_capScr.url){ URL.revokeObjectURL(_capScr.url); _capScr.url=null; }
  _capScr.enCours=false;
  document.getElementById('scr-executer').disabled=false; document.getElementById('scr-arreter').disabled=true;
  if(r.ok){ document.getElementById('scr-etat').textContent=_L(`Terminé en ${r.duree} ms`); if(!r.sorties) capScrLigne(capEsc(_L('Script terminé, sans sortie (utilisez out.print).')),'scr-dim'); return; }
  const ou=r.ligne?' '+_L(`(ligne ${r.ligne})`):'';
  document.getElementById('scr-etat').textContent=_L('Erreur')+ou;
  const d=capScrLigne(capEsc('✖ '+r.erreur+ou),'scr-err');
  if(r.ligne){ d.dataset.ligne=r.ligne; d.title=_L('Aller à la ligne'); d.classList.add('scr-lien'); }
}
/** Sélectionne une ligne de l'éditeur. @param {number} n */
function capScrAllerLigne(n){
  const t=document.getElementById('scr-code'), lignes=t.value.split('\n'); if(n<1||n>lignes.length) return;
  const debut=lignes.slice(0,n-1).reduce((s,l)=>s+l.length+1,0);
  t.focus(); t.setSelectionRange(debut, debut+lignes[n-1].length);
  t.scrollTop=Math.max(0,(n-3)*(parseFloat(getComputedStyle(t).lineHeight)||17));
}
/** Élément « sélectionné » pour le script : celui du panneau de détail affiché. @returns {string[]} */
function capScrSelection(){
  const sec=document.querySelector('#cap-detail[style*="flex"] #crv-det-sec, #rm-detail #crv-det-sec');
  return sec&&sec.dataset.el&&capGetElementById_(sec.dataset.el)?[sec.dataset.el]:[];
}
/**
 * Code du worker d'un script : prélude (langue, _L, métamodèle), noyau recopié (capScrNoyau), puis le script enveloppé
 * dans une fonction (la politique de la page interdit eval : le script fait partie du code du worker).
 * @param {string} code - Texte du script
 * @returns {string} URL du worker (Blob)
 */
function capScrUrlWorker(code){
  const api=capScrApi();
  const tete=`const CAP_LANG=${JSON.stringify(CAP_LANG)}; const _L=s=>s; const CAP_MM=${JSON.stringify(CAP_MM)};\n(${capScrNoyau.toString()})().servir(async function (${api.parametres().join(', ')}) { return (async () => {\n`;
  _capScr.decalage=tete.split('\n').length-1;
  _capScr.url=URL.createObjectURL(new Blob([tete+code+'\n})(); });\n'],{type:'text/javascript'}));
  return _capScr.url;
}
/** Exécute le script de l'éditeur sur un instantané du modèle affiché. */
async function capScrExecuter(){
  if(!capLoaded){ capToast(_L('Ouvrez d\'abord un modèle.'),{level:'warn'}); return; }
  if(_capScr.enCours) return;
  capScrSave(); capScrEffacer();
  const code=document.getElementById('scr-code').value;
  const options={selection:capScrSelection()};
  _capScr.enCours=true; _capScr.debut=Date.now();
  document.getElementById('scr-executer').disabled=true;
  document.getElementById('scr-etat').textContent=_L('Préparation…');
  let snap;
  try{ snap=capScrSnapshot(options.selection); }catch(e){ capScrFin({ok:false, erreur:e.message, duree:0, sorties:0}); return; }
  document.getElementById('scr-etat').textContent=_L('Exécution…');
  let w=null;
  try{ if(typeof Worker!=='undefined') w=new Worker(capScrUrlWorker(code)); }catch(e){ w=null; }
  if(!w){
    capScrLigne(capEsc(_L('Exécution dans la page, sans isolement : ce navigateur refuse le worker des scripts.')),'scr-av');
    capScrFin(await capScrApi().executer(snap, code, Object.assign(options,{emettre:capScrAfficher, interagir:capScrDemander, analyser:(n,a)=>capScrAnalyse(n,a)})));
    return;
  }
  _capScr.worker=w; document.getElementById('scr-arreter').disabled=false;
  w.onmessage=e=>{
    if(w!==_capScr.worker) return;
    const m=e.data;
    if(m.k==='sorties') capScrAfficher(m.lot);
    else if(m.k==='ui') capScrDemander(m.demande).then(valeur=>{ if(w!==_capScr.worker) return; document.getElementById('scr-etat').textContent=_L('Exécution…'); w.postMessage({k:'reponse', n:m.n, valeur}); });
    else if(m.k==='analyse'){ document.getElementById('scr-etat').textContent=_L(`Analyse ${m.nom}…`); let valeur; try{ valeur=capScrAnalyse(m.nom, m.args); }catch(x){ valeur={$error:x.message}; }
      if(w!==_capScr.worker) return; document.getElementById('scr-etat').textContent=_L('Exécution…'); w.postMessage({k:'reponse', n:m.n, valeur}); }
    else if(m.k==='fin') capScrFin(m);
  };
  w.onerror=e=>{ e.preventDefault(); if(w!==_capScr.worker) return; const l=e.lineno?e.lineno-_capScr.decalage:0;
    capScrFin({ok:false, erreur:(e.message||_L('Erreur du worker des scripts.')).replace(/^Uncaught /,''), ligne:l>=1?l:null, duree:Date.now()-_capScr.debut, sorties:0}); };
  w.postMessage({snap, options:Object.assign(options,{source:_capScr.url, decalage:_capScr.decalage})});
}
/** Arrête le script en cours. */
function capScrArreter(){ if(!_capScr.worker) return; capScrFin({ok:false, erreur:_L('Arrêté par l\'utilisateur.'), duree:Date.now()-_capScr.debut, sorties:0}); }
/** Raccourcis de l'éditeur : Tab (indentation), Ctrl+Entrée (exécuter). @param {KeyboardEvent} e */
function capScrClavier(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); capScrExecuter(); return; }
  if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){ e.preventDefault(); const t=e.target, d=t.selectionStart; t.setRangeText('  ',d,t.selectionEnd,'end'); t.dispatchEvent(new Event('input')); }
}
/** Redimensionne le tiroir en glissant sa poignée. @param {PointerEvent} e */
function capScrGlisser(e){
  e.preventDefault();
  const t=document.getElementById('cap-scripts');
  const bouger=ev=>{ t.style.height=Math.max(140, Math.min(window.innerHeight-160, window.innerHeight-ev.clientY))+'px'; };
  const fin=()=>{ document.removeEventListener('pointermove',bouger); document.removeEventListener('pointerup',fin); capScrSave(); };
  document.addEventListener('pointermove',bouger); document.addEventListener('pointerup',fin);
}
/** Remplace le bloc `cap-scripts-data` (📄 Ouvrir un projet de travail, 57) et recharge la console. @param {object} d - Bloc { bib, brouillon, hauteur } */
function capScrSetData(d){
  let el=document.getElementById('cap-scripts-data');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-scripts-data'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(d||{bib:[]}).replace(/</g,'\\u003c');
  capScrRecharger();
}

/** Recharge la bibliothèque et le brouillon depuis la page (ouverture d'un projet). */
function capScrRecharger(){
  const d=capScrData(); _capScr.bib=Array.isArray(d.bib)?d.bib.filter(s=>s&&typeof s.code==='string'):[];
  const code=document.getElementById('scr-code'), sec=document.getElementById('cap-scripts');
  if(d.brouillon&&typeof d.brouillon.code==='string'){ _capScr.choix=capScrScript(d.brouillon.choix||'')?d.brouillon.choix:''; code.value=d.brouillon.code; const s=capScrScript(_capScr.choix); _capScr.charge=s?s.code:''; }
  else { const ex=capScrApi().exemples()[0]; _capScr.choix='ex:'+ex.cle; _capScr.charge=ex.code; code.value=ex.code; }
  if(d.hauteur&&sec) sec.style.height=d.hauteur;
  capScrListe();
}

// ── Branchement ──
(()=>{
  const $=id=>document.getElementById(id);
  if(!$('cap-scripts')) return;
  capScrRecharger();
  $('b-scripts')?.addEventListener('click',()=>capScrToggle());
  $('scr-fermer').onclick=()=>capScrToggle(false);
  $('scr-visite').onclick=()=>capTourScripts();
  $('scr-liste').onchange=e=>capScrOuvrir(e.target.value);
  $('scr-nouveau').onclick=capScrNouveau; $('scr-enregistrer').onclick=capScrEnregistrer; $('scr-supprimer').onclick=capScrSupprimer;
  $('scr-importer').onclick=()=>$('scr-fichier').click();
  $('scr-fichier').onchange=e=>{ const f=[...e.target.files]; e.target.value=''; capScrImporter(f); };
  $('scr-dossier').onclick=capScrDosChoisir; capScrDosInit();
  $('scr-exporter').onclick=capScrExporter; $('scr-executer').onclick=capScrExecuter; $('scr-arreter').onclick=capScrArreter;
  $('scr-effacer').onclick=()=>{ capScrEffacer(); $('scr-etat').textContent=''; };
  $('scr-code').onkeydown=capScrClavier;
  let minuterie; $('scr-code').oninput=()=>{ clearTimeout(minuterie); minuterie=setTimeout(capScrSave, 500); };
  $('cap-scripts').querySelector('.scr-poignee').onpointerdown=capScrGlisser;
  $('scr-sortie').onclick=e=>{
    const csv=e.target.closest('[data-csv]'); if(csv){ const t=_capScr.tableaux[+csv.dataset.csv]; capScrTelecharger('﻿'+capScrApi().csv(t,';'), (t.titre||'table').replace(/[\\/:*?"<>|]/g,'_')+'.csv','text/csv'); return; }
    const l=e.target.closest('[data-ligne]'); if(l){ capScrAllerLigne(+l.dataset.ligne); return; }
    const p=e.target.closest('[data-id]'); if(p&&capLoaded) capOpenDetail(p.dataset.id);
  };
  document.addEventListener('keydown',e=>{ if(e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key==='4'){ e.preventDefault(); capScrToggle(); } });
})();
