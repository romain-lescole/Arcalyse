// ════════════════════════════════════════════════════════════════════
//  ⚙ PRÉFÉRENCES : niveau d'affichage des menus (Essentiel / Complet),
//  enregistrement automatique de la page, thème, interface et vues
//  Réglages rangés dans _capNav (bloc page `cap-toolbar`, partie ⚙ `toolbar`) :
//  mode ('essentiel' | 'complet'), pins, icons, auto {on, min, bak}.
// ════════════════════════════════════════════════════════════════════

/** Libellés et descriptions des niveaux d'affichage des menus. */
var CAP_PREF_MODES=[
  ['essentiel',_L('Essentiel'),_L('Les vues les plus utilisées dans les menus 🏗 Architecture, ✅ Vérifier et 💬 Revue & documents ; les vues avancées restent accessibles par la recherche 🔍 (Ctrl+K).')],
  ['complet',_L('Complet'),_L('Toutes les vues, dont REC / RPL, catégories d\'échanges, bibliothèques, cartes, index des types, liens et 📜 Scripts.')]
];
/** État de l'enregistrement automatique (non enregistré : fichiers choisis pour la session). */
var _capAuto={timer:null, hash:'', last:null, bak:null, err:'', warned:false};

/** Réglage de l'enregistrement automatique (créé à la première lecture, désactivé par défaut).
 * @returns {{on:boolean, min:number, bak:boolean}}
 */
function capAutoCfg(){
  if(!_capNav.auto) _capNav.auto={on:false, min:5, bak:true};
  return _capNav.auto;
}

/** Vrai si le navigateur permet d'écrire directement dans un fichier (Edge, Chrome). @returns {boolean} */
function capAutoSupported(){ return !!window.showSaveFilePicker; }

/** Change le style de la barre : icônes et textes, ou icônes seules (nom complet en infobulle).
 * @param {boolean} on - true : icônes seules
 */
function capPrefSetIcons(on){
  _capNav.icons=!!on; capNavSave(); capNavRender();
  if(typeof capWatchFlash==='function') capWatchFlash(on?_L('⚙ Barre : icônes seules (nom au survol)'):_L('⚙ Barre : icônes et textes'));
}

/** Contenu du menu ⚙ de la barre : niveau des menus, style de la barre, thème, enregistrement automatique, préférences.
 * @returns {string} HTML
 */
function capPrefMenuHtml(){
  const m=capNavEff().mode, A=capAutoCfg();
  return _L('<div class="cap-nav-h">Menus</div>')+
    CAP_PREF_MODES.map(([k,l,t])=>`<div class="ctx-i cap-nav-it${k===m?' cur':''}" data-lvl="${k}" title="${t}"><span>${l}</span></div>`).join('')+
    _L(`
    <div class="cap-nav-h">Style de la barre</div>
    <div class="ctx-i cap-nav-it${_capNav.icons?'':' cur'}" data-picons="0" title="Icônes seules automatiquement tant que la barre ne tient pas sur une ligne"><span>Icônes et textes${document.documentElement.hasAttribute('data-tbauto')?_L(' <span class="cap-nav-g">(icônes seules : la barre déborde)</span>'):''}</span></div>
    <div class="ctx-i cap-nav-it${_capNav.icons?' cur':''}" data-picons="1" title="Boutons réduits à leur icône ; le nom s'affiche au survol"><span>Icônes seules</span></div>
    <div class="cw-m-sep"></div>
    <div class="ctx-i" data-act="theme">🎨 Thème…</div>
    <div class="ctx-i" data-act="autosave" title="Enregistrer la page à intervalle régulier dans son fichier (Edge, Chrome)">💾 Enregistrement automatique <span class="cap-nav-g">${A.on?_L(`toutes les ${A.min} min`):_L('désactivé')}</span></div>
    <div class="ctx-i" data-act="xport" title="Format des exports ⬇ de tous les tableaux : fichier CSV (point-virgule, UTF-8) ou classeur Excel .xlsx (en-tête figé, filtres)">⬇ Exports des tableaux : <b>${capExportFormat()==='xlsx'?_L('Excel (.xlsx)'):'CSV'}</b> <span class="cap-nav-g">${_L('cliquer pour changer')}</span></div>
    <div class="ctx-i" data-act="checks" title="Activer ou désactiver chaque contrôle 🩺, gravité, seuils ; profil partageable en .json">🩺 Profil de contrôles…</div>
    <div class="cw-m-sep"></div>
    <div class="ctx-i" data-act="prefs">⚙ Préférences…</div>`);
}

/** Ouvre la fenêtre ⚙ Préférences.
 * @param {'aff'|'save'|'theme'|'cfg'} [tab] - Onglet affiché (par défaut : Affichage)
 */
function capPrefDialog(tab){
  let ov=document.getElementById('cap-pref-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-pref-ov'; document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  ov._tab=tab||ov._tab||'aff';
  capPrefDialogFill(ov);
  ov.style.display='flex';
}

/** Remplit la fenêtre ⚙ Préférences (onglet courant ov._tab) et branche ses commandes.
 * @param {HTMLElement} ov - Fond de la fenêtre
 */
function capPrefDialogFill(ov){
  const t=ov._tab, m=capNavEff().mode, A=capAutoCfg(), sup=capAutoSupported();
  const tabs=[['aff',_L('☰ Affichage')],['save',_L('💾 Enregistrement')],['theme',_L('🎨 Thème')],['cfg',_L('⚙ Interface et vues')]];
  let body='';
  if(t==='aff'){
    body=_L('<div class="cw-d-sub">Niveau d\'affichage des menus (aussi par les boutons <b>Essentiel</b> / <b>Complet</b> de la barre). Une vue absente des menus reste accessible par la recherche <b>🔍</b> (Ctrl+K).</div>')+
      CAP_PREF_MODES.map(([k,l,d])=>`<label class="cap-pref-row"><input type="radio" name="cap-pref-m" data-pm="${k}"${k===m?' checked':''}> <span><b>${l}</b><br><span class="ana-dim">${d}</span></span></label>`).join('')+
      _L(`<div class="cap-pref-sec" style="margin-top:14px">Style de la barre</div>
      <label class="cap-pref-row"><input type="radio" name="cap-pref-i" data-pi="0"${_capNav.icons?'':' checked'}> <span><b>Icônes et textes</b><br><span class="ana-dim">Quand la barre ne tient pas sur une ligne (fenêtre étroite), elle passe automatiquement en icônes seules.</span></span></label>
      <label class="cap-pref-row"><input type="radio" name="cap-pref-i" data-pi="1"${_capNav.icons?' checked':''}> <span><b>Icônes seules</b><br><span class="ana-dim">Barre plus compacte : chaque bouton garde son icône, le nom s'affiche au survol ; les menus déroulants et ☰ gardent leurs textes.</span></span></label>`);
  } else if(t==='save'){
    const st=_capAuto.last?_L(`Dernier enregistrement automatique : ${_capAuto.last.toLocaleTimeString('fr-FR')}`):_L('Aucun enregistrement automatique pour l\'instant.');
    body=_L(`<div class="cw-d-sub">La page est enregistrée dans son fichier (celui de 💾 / Ctrl+S), <b>seulement si quelque chose a changé</b>.</div>`)+
      (sup?'':_L('<div class="cw-d-sub">⚠ Ce navigateur ne permet pas d\'écrire directement dans un fichier (Edge ou Chrome nécessaire) : enregistrement automatique indisponible.</div>'))+
      _L(`<label class="cap-pref-row"><input type="checkbox" data-pc="on"${A.on?' checked':''}${sup?'':' disabled'}> <span><b>Enregistrer automatiquement</b> toutes les
        <select data-pc="min"${sup?'':' disabled'}>${[2,5,10,15,30].map(n=>`<option value="${n}"${n===A.min?' selected':''}>${n}</option>`).join('')}</select> minutes</span></label>
      <div class="cap-pref-st">Fichier de la page : <b>${_capSaveHandle?capEsc(_capSaveHandle.name):_L('non choisi')}</b>
        <button class="cap-lf-btn" data-pa="main"${sup?'':' disabled'}>Choisir…</button></div>
      <div class="cap-pref-st">${st}${_capAuto.err?_L(`<br>⚠ Dernière erreur : ${capEsc(_capAuto.err)}`):''}</div>
      <label class="cap-pref-row" style="margin-top:8px"><input type="checkbox" data-pc="bak"${A.bak?' checked':''}${sup?'':' disabled'}> <span><b>Garder la version précédente</b> dans un fichier de secours
        <br><span class="ana-dim">Avant chaque enregistrement (automatique ou 💾), le contenu actuel du fichier est copié dans le fichier de secours (par exemple <i>mon-projet.backup.html</i>, qui s'ouvre comme une page normale). Protège d'un enregistrement malencontreux.</span></span></label>
      <div class="cap-pref-st">Fichier de secours : <b>${_capAuto.bak?capEsc(_capAuto.bak.name):_L('non choisi')}</b>
        <button class="cap-lf-btn" data-pa="bak"${sup?'':' disabled'}>Choisir…</button></div>
      <div class="cw-d-sub" style="margin-top:10px">Le navigateur oublie les fichiers choisis quand la page est fermée : à la réouverture, un bandeau propose de les choisir à nouveau.</div>`);
  } else if(t==='theme'){
    const sel=document.getElementById('theme-sel');
    body=_L('<div class="cw-d-sub">Thème de l\'interface (enregistré avec la page).</div>')+
      [...sel.options].map(o=>`<label class="cap-pref-row"><input type="radio" name="cap-pref-t" data-pt="${o.value}"${o.value===sel.value?' checked':''}> <span>${o.textContent}</span></label>`).join('')+
      _L(`<div style="margin:8px 0 0 24px"><button class="phl-export-btn" data-pa="themeedit">🎨 Personnaliser le thème…</button></div>`);
  } else {
    body=_L(`<div class="cw-d-sub">Fichier <b>.json</b> sans le modèle : barre des vues et préférences, tableaux de bord, ▤ Tableau, thème, règles de nommage… pour réutiliser vos réglages avec un autre modèle.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="phl-export-btn" data-pa="cfgsave">⚙ Enregistrer l'interface et les vues…</button>
      <button class="phl-export-btn" data-pa="cfgload">⚙ Charger une interface et des vues…</button></div>`);
  }
  ov.innerHTML=_L(`<div class="cw-d-box" style="max-width:620px">
    <div class="cw-d-hdr"><b>⚙ Préférences</b><button class="cap-lf-btn" data-pa="x">✕</button></div>
    <div class="cw-d-body"><div class="cap-pref-tabs">${tabs.map(([k,l])=>`<button class="phl-toggle-btn${k===t?' active':''}" data-ptab="${k}">${l}</button>`).join('')}</div>${body}</div>
    <div class="cw-d-ftr"><span class="ana-dim" style="flex:1">Réglages enregistrés avec la 💾 Page HTML.</span><button class="cap-lf-btn" data-pa="x">Fermer</button></div></div>`);
  ov.onclick=e=>{
    if(e.target===ov){ ov.style.display='none'; return; }
    const tb=e.target.closest('[data-ptab]'); if(tb){ ov._tab=tb.dataset.ptab; capPrefDialogFill(ov); return; }
    const a=e.target.closest('[data-pa]'); if(!a) return;
    const k=a.dataset.pa;
    if(k==='x'){ ov.style.display='none'; return; }
    if(k==='themeedit'){ ov.style.display='none'; capThemeEditor(); return; }
    if(k==='cfgsave'){ ov.style.display='none'; capCfgDialog('save'); return; }
    if(k==='cfgload'){ ov.style.display='none'; capCfgLoadFile(); return; }
    if(k==='main') capAutoPickMain().then(()=>capPrefDialogFill(ov));
    if(k==='bak') capAutoPickBackup().then(()=>capPrefDialogFill(ov));
  };
  ov.onchange=e=>{
    const pm=e.target.closest('[data-pm]'); if(pm){ capNavSetMode(pm.dataset.pm); return; }
    const pi=e.target.closest('[data-pi]'); if(pi){ capPrefSetIcons(pi.dataset.pi==='1'); return; }
    const pt=e.target.closest('[data-pt]');
    if(pt){ const sel=document.getElementById('theme-sel'); sel.value=pt.dataset.pt; sel.dispatchEvent(new Event('change')); return; }
    const pc=e.target.closest('[data-pc]'); if(!pc) return;
    if(pc.dataset.pc==='min') A.min=+pc.value||5;
    else A[pc.dataset.pc]=pc.checked;
    capNavSave(); capAutoSchedule();
    // Activation : le fichier de la page (puis celui de secours) est demandé tout de suite (clic de l'utilisateur)
    if(pc.dataset.pc==='on'&&A.on&&!_capSaveHandle) capAutoPickMain().then(()=>capPrefDialogFill(ov));
    else if(pc.dataset.pc==='bak'&&A.bak&&!_capAuto.bak) capAutoPickBackup().then(()=>capPrefDialogFill(ov));
    else capPrefDialogFill(ov);
  };
}

// ── 💾 Enregistrement automatique ─────────────────────────────────────

/** Empreinte rapide d'un texte (FNV-1a 32 bits) pour savoir si la page a changé.
 * @param {string} s - Texte
 * @returns {string} Empreinte (longueur + hachage)
 */
function capAutoHash(s){
  let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193); }
  return s.length+':'+(h>>>0).toString(36);
}

/** Choisit le fichier de la page (« Enregistrer sous ») ; il sert ensuite à 💾 et à l'enregistrement automatique.
 * @returns {Promise<boolean>} true si un fichier a été choisi et écrit
 */
async function capAutoPickMain(){
  if(!capAutoSupported()) return false;
  if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle : la page enregistrée le contient.')); return false; }
  const ok=await capSavePageDirect(true);
  capAutoBanner(); return ok&&!!_capSaveHandle;
}

/** Choisit le fichier de secours (version précédente de la page).
 * @returns {Promise<boolean>} true si un fichier a été choisi
 */
async function capAutoPickBackup(){
  if(!capAutoSupported()) return false;
  const base=(_capSaveHandle&&_capSaveHandle.name||capPageFileName()).replace(/\.html?$/i,'');
  try{
    _capAuto.bak=await window.showSaveFilePicker({suggestedName:base+'.backup.html',
      types:[{description:_L('Page HTML'),accept:{'text/html':['.html','.htm']}}]});
    if(_capSaveHandle&&await _capAuto.bak.isSameEntry(_capSaveHandle)){ _capAuto.bak=null;
      capAlert(_L('Le fichier de secours doit être différent du fichier de la page.'),{level:'warn'}); return false; }
  }catch(e){ if(!(e&&e.name==='AbortError')) console.error(e); return false; }
  capAutoBanner(); return true;
}

/** Copie le contenu actuel du fichier de la page dans le fichier de secours (appelé avant chaque écriture, voir capSaveWrite). */
async function capAutoBackup(){
  const A=capAutoCfg();
  if(!A.bak||!_capAuto.bak||!_capSaveHandle) return;
  try{
    const old=await (await _capSaveHandle.getFile()).text();
    if(!old) return;   // fichier neuf : rien à garder
    const w=await _capAuto.bak.createWritable(); await w.write(old); await w.close();
  }catch(e){ console.error(e); _capAuto.err=_L('fichier de secours : ')+(e&&e.message||e); }
}

/** Note un enregistrement réussi (manuel ou automatique) : empreinte de la page écrite, heure.
 * @param {string} html - Page écrite
 */
function capAutoWritten(html){
  _capAuto.hash=capAutoHash(html); _capAuto.err='';
  capAutoBanner();
}

/** Enregistrement automatique : écrit la page si elle a changé depuis le dernier enregistrement. */
async function capAutoTick(){
  const A=capAutoCfg();
  if(!A.on||!capLoaded||!capAutoSupported()) return;
  if(!_capSaveHandle){ capAutoBanner(); return; }
  try{
    const html=capBuildPageHtml();
    if(capAutoHash(html)===_capAuto.hash) return;   // rien n'a changé
    await capSaveWrite(html);
    _capAuto.last=new Date();
    const btn=document.getElementById('b-save-direct');
    if(btn) btn.title=_L(`Enregistrer dans « ${_capSaveHandle.name} » (Ctrl+S) — enregistré automatiquement à ${_capAuto.last.toLocaleTimeString('fr-FR')} — Maj+clic ou Ctrl+Maj+S : enregistrer sous`);
    if(typeof capRevMarkSaved==='function') capRevMarkSaved();
  }catch(e){
    console.error(e); _capAuto.err=e&&e.message||String(e);
    if(!_capAuto.warned&&typeof capWatchFlash==='function'){ _capAuto.warned=true; capWatchFlash(_L('⚠ Enregistrement automatique impossible : ')+_capAuto.err); }
    capAutoBanner();
  }
}

/** (Re)lance la minuterie de l'enregistrement automatique selon le réglage. */
function capAutoSchedule(){
  clearInterval(_capAuto.timer); _capAuto.timer=null;
  const A=capAutoCfg();
  if(A.on&&capAutoSupported()) _capAuto.timer=setInterval(capAutoTick, Math.max(1,A.min)*60000);
  capAutoBanner();
}

/** Bandeau sous la barre quand l'enregistrement automatique est activé mais qu'un fichier manque
 * (page rouverte : le navigateur a oublié les fichiers choisis) ou après une erreur. */
function capAutoBanner(){
  let b=document.getElementById('cap-auto-bar');
  const A=capAutoCfg();
  const needMain=A.on&&capLoaded&&capAutoSupported()&&!_capSaveHandle;
  const needBak=A.on&&A.bak&&capLoaded&&capAutoSupported()&&!!_capSaveHandle&&!_capAuto.bak;
  const show=(needMain||needBak||(A.on&&_capAuto.err))&&!_capAuto.closed;
  if(!show){ if(b) b.style.display='none'; return; }
  if(!b){ b=document.createElement('div'); b.id='cap-auto-bar'; document.body.appendChild(b);
    b.addEventListener('click',e=>{
      const a=e.target.closest('[data-ab]'); if(!a) return;
      ({main:capAutoPickMain, bak:capAutoPickBackup,
        off:()=>{ capAutoCfg().on=false; capNavSave(); capAutoSchedule(); },
        prefs:()=>capPrefDialog('save'),
        x:()=>{ _capAuto.closed=true; capAutoBanner(); }})[a.dataset.ab]();
    }); }
  b.innerHTML=needMain?_L(`💾 Enregistrement automatique activé : choisissez le fichier de la page. <button class="phl-export-btn" data-ab="main">▶ Choisir le fichier…</button>`)
    :needBak?_L(`🛟 Fichier de secours (version précédente) non choisi. <button class="phl-export-btn" data-ab="bak">Choisir…</button>`)
    :_L(`⚠ Enregistrement automatique : ${capEsc(_capAuto.err)} <button class="cap-lf-btn" data-ab="prefs">⚙ Réglages</button>`);
  b.innerHTML+=_L(` <button class="cap-lf-btn" data-ab="off">Désactiver</button> <button class="cap-lf-btn" data-ab="x" title="Masquer">✕</button>`);
  b.style.display='flex';
}

// Démarrage : minuterie selon le réglage enregistré dans la page ; bandeau proposé peu après le chargement du modèle
capAutoSchedule();
setTimeout(capAutoBanner, 4000);
