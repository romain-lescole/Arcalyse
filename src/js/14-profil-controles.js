/* ═══════════════════════════════════════════════════════════════════════════
   🩺 Profil de contrôles : pour chaque contrôle 🩺 de toutes les vues, activé ou non, gravité
   (ℹ information, ⚠ à vérifier, ✖ bloquant) et quelques seuils. Enregistré dans la page
   (bloc JSON `cap-checks`), repris par 📄 Ouvrir un projet et par le fichier ⚙ Interface et vues,
   exportable seul en .json pour une équipe. Appliqué par `capDiagHtml` (27) et par les
   indicateurs « Contrôles » du tableau de bord (`capChkFilter`).
   Clé d'un contrôle = son titre affiché (propre à chaque langue de l'interface).
   ═══════════════════════════════════════════════════════════════════════════ */

/** Seuils réglables : clé, libellé, valeur par défaut, vue concernée (clé de CAP_NAV_ITEMS). */
const CAP_CHK_PARAMS=[
  ['fn.descMin',    _L('Description trop courte : moins de … caractères'),         20, 'functions'],
  ['nq.longChars',  _L('Nom trop long : plus de … caractères'),                     70, 'functions'],
  ['nq.longWords',  _L('Nom trop long : plus de … mots'),                            9, 'functions'],
  ['st.minStatuts', _L('Couche « majoritairement validée » : au moins … statuts'),   5, 'ana:status']];
/** Gravités : clé, pictogramme, libellé. */
const CAP_CHK_SEV=[['info','ℹ',_L('Information')],['warn','⚠',_L('À vérifier')],['err','✖',_L('Bloquant')]];
/** Vues dont les contrôles sont connus d'avance (clé de CAP_NAV_ITEMS → sections). Les vues qui bâtissent leurs
 * contrôles en ligne (🔌, 🔀, 🧬, 🚦) sont ajoutées au catalogue à leur premier affichage (`_capChkSeen`). */
const CAP_CHK_VIEWS=[
  ['functions', ()=>capFnChecks(capComputeFunctions(),'all')], ['fex', ()=>capFexChecks('all')], ['csys', ()=>capCbChecks('SA')], ['cblk', ()=>capCbChecks('LA')],
  ['ports', ()=>capPortsDiagSections(capComputePortLinks())], ['chains', ()=>capChChecks('all')], ['scen', ()=>capScChecks()], ['ana:reqs', ()=>capReqChecks()], ['ana:pvmt', ()=>capPvChecks()],
  ['ana:data', ()=>capDmChecks()], ['ana:cts', ()=>capCtChecks()], ['ana:cats', ()=>capEcChecks()], ['ana:libs', ()=>capLibChecks()], ['ana:status', ()=>capStChecks()]];

var capChkProfile=(()=>{ try{ const el=document.getElementById('cap-checks'); const p=el?JSON.parse(el.textContent):null; return Object.assign({off:{}, sev:{}, params:{}}, p||{}); }catch(e){ return {off:{}, sev:{}, params:{}}; } })();
var _capChkSeen={};   // titre → {tip, view} des contrôles déjà affichés (vues sans fonction de contrôles)

/** Enregistre le profil dans la page (bloc `cap-checks`, repris par la 💾 Page HTML). */
function capChkSave(){
  let el=document.getElementById('cap-checks');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-checks'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(capChkProfile);
}

/** Valeur d'un seuil (profil, sinon défaut). @param {string} k - Clé de CAP_CHK_PARAMS @returns {number} */
function capChkParam(k){ const v=capChkProfile.params&&capChkProfile.params[k]; const d=(CAP_CHK_PARAMS.find(p=>p[0]===k)||[])[2]; return v==null||isNaN(+v)?d:+v; }

/** Gravité d'un contrôle. @param {string} title - Titre @returns {'info'|'warn'|'err'} */
function capChkSev(title){ return capChkProfile.sev[title]||'warn'; }

/** Vrai si le profil désactive un contrôle. @param {string} title - Titre @returns {boolean} */
function capChkOff(title){ return !!capChkProfile.off[title]; }

/** Sections de contrôles conservées par le profil (contrôles activés), gravité renseignée (`sev`).
 * @param {object[]} sections - Sections {title, tip, icon, items…}
 * @returns {object[]} Sections activées
 */
function capChkFilter(sections){ return (sections||[]).filter(s=>s&&!capChkOff(s.title)).map(s=>Object.assign({}, s, {sev:capChkSev(s.title)})); }

/** Note les contrôles affichés par une vue (catalogue des vues sans fonction de contrôles).
 * @param {object[]} sections - Sections affichées
 */
function capChkSeen(sections){
  const v=typeof capNavCurKey==='function'?capNavCurKey(true):'';
  (sections||[]).forEach(s=>{ if(s&&s.title&&!_capChkSeen[s.title]) _capChkSeen[s.title]={tip:s.tip||'', view:v}; });
}

/** Catalogue des contrôles connus : par vue, titre, info-bulle et nombre de lignes actuel.
 * @returns {Array<{view:string, label:string, items:Array<{title:string, tip:string, n:number}>}>} Vues
 */
function capChkCatalog(){
  const lab=k=>{ const it=(typeof CAP_NAV_ITEMS!=='undefined'?CAP_NAV_ITEMS:[]).find(i=>i.k===k); return it?it.l:(k||_L('Autres vues')); };
  const byView={}, seen=new Set();
  const put=(v, s)=>{ if(!s||!s.title||seen.has(s.title)) return; seen.add(s.title); (byView[v]=byView[v]||[]).push({title:s.title, tip:s.tip||'', n:(s.items||[]).length}); };
  if(typeof capLoaded!=='undefined'&&capLoaded) CAP_CHK_VIEWS.forEach(([v,f])=>{ try{ f().forEach(s=>put(v,s)); }catch(e){ console.warn('Profil de contrôles : vue',v,e); } });
  Object.entries(_capChkSeen).forEach(([title,o])=>put(o.view, {title, tip:o.tip, items:[]}));
  const order=k=>{ const i=(typeof CAP_NAV_ITEMS!=='undefined'?CAP_NAV_ITEMS:[]).findIndex(x=>x.k===k); return i<0?999:i; };
  return Object.keys(byView).sort((a,b)=>order(a)-order(b)).map(v=>({view:v, label:lab(v), items:byView[v]}));
}

/** Applique un profil (fichier ⚙, 📄 projet, import) puis rafraîchit l'affichage.
 * @param {Object} p - Profil {off, sev, params}
 */
function capChkSet(p){
  if(!p||typeof p!=='object') return;
  const full=JSON.stringify(p.params||{})!==JSON.stringify(capChkProfile.params||{});   // seuils changés : tout recalculer (sinon la sous-vue affichée est conservée)
  capChkProfile={off:p.off||{}, sev:p.sev||{}, params:p.params||{}};
  capChkSave(); capChkRefresh(full);
}

/** Rafraîchit ce qui dépend du profil : valeurs du tableau de bord, vue affichée (et tous les calculs si un seuil a changé :
 * comme ↻ Recalculer, les sous-vues des analyses reviennent alors à leur onglet par défaut).
 * @param {boolean} [full] - Vider aussi les caches de calcul (seuils)
 */
function capChkRefresh(full){
  if(typeof _capAnaCache!=='undefined'){ if(full){ _capAnaCache={}; if(typeof _capPortsCache!=='undefined') _capPortsCache=null; } else Object.keys(_capAnaCache).forEach(k=>{ if(k.startsWith('dv:')||k==='dashCat'||k.startsWith('sante')) delete _capAnaCache[k]; }); }   // + 💚 santé (69)
  if(full){ ['cap-view-analyses','cap-view-functions'].forEach(id=>{ const c=document.getElementById(id); if(c){ c.querySelectorAll('[data-hold]').forEach(h=>{ h.innerHTML=''; ['_fn','_tr','_cp','_sm','_rq','_pv','_dm','_ct'].forEach(k=>delete h[k]); }); } }); }
  if(typeof capLoaded!=='undefined'&&capLoaded&&typeof currentMode!=='undefined'&&currentMode==='capella'&&typeof capRenderCurrentView==='function') capRenderCurrentView();
}

/** Fenêtre 🩺 Profil de contrôles : par vue, chaque contrôle (activé, gravité, nombre actuel), seuils, export / import .json.
 * @param {string} [focusTitle] - Contrôle à mettre en évidence
 */
function capChkDialog(focusTitle){
  let ov=document.getElementById('cap-chk-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-chk-ov'; document.body.appendChild(ov); ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const esc=capEsc, P=capChkProfile, cat=capChkCatalog(), q=(ov._q||'').toLowerCase();
  const nOff=Object.keys(P.off).filter(k=>P.off[k]).length, nSev=Object.keys(P.sev).filter(k=>P.sev[k]&&P.sev[k]!=='warn').length, nPar=CAP_CHK_PARAMS.filter(p=>capChkParam(p[0])!==p[2]).length;
  const rows=cat.map(v=>{ const its=v.items.filter(i=>!q||(i.title+' '+i.tip).toLowerCase().includes(q)); if(!its.length) return '';
    return `<tr class="chk-v"><th colspan="4">${v.label}</th></tr>`+its.map(i=>`<tr class="chk-r${i.title===focusTitle?' chk-focus':''}${P.off[i.title]?' chk-off':''}" data-t="${esc(i.title)}">
      <td><input type="checkbox" data-on${P.off[i.title]?'':' checked'} title="${_L('Activé')}"></td>
      <td><b>${esc(i.title)}</b>${i.tip?`<div class="ana-dim">${esc(i.tip)}</div>`:''}</td>
      <td><select data-sev title="${_L('Gravité')}">${CAP_CHK_SEV.map(([k,ico,l])=>`<option value="${k}"${capChkSev(i.title)===k?' selected':''}>${ico} ${l}</option>`).join('')}</select></td>
      <td class="chk-n">${capLoaded?`<span class="cap-diag-cnt ${i.n?capChkSev(i.title):'ok'}">${i.n}</span>`:''}</td></tr>`).join(''); }).join('');
  ov.innerHTML=_L(`<div class="cw-d-box" style="width:min(820px,calc(100vw - 32px))">
    <div class="cw-d-hdr"><b>🩺 Profil de contrôles</b><span class="ana-dim" style="font-size:11px">${nOff} désactivé(s) · ${nSev} gravité(s) modifiée(s) · ${nPar} seuil(s) modifié(s)</span><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body">
      <p class="cw-d-sub">Chaque contrôle 🩺 peut être <b>désactivé</b> (il n'apparaît plus dans les vues ni au tableau de bord) ou recevoir une <b>gravité</b> : ℹ information (compté à part), ⚠ à vérifier, ✖ bloquant. Le profil est enregistré avec la 💾 page, repris par 📄 Ouvrir un projet et par le fichier ⚙ Interface et vues ; exportez-le seul pour le partager avec votre équipe.${capLoaded?'':_L(' <b>Chargez un modèle</b> pour voir tous les contrôles et leurs nombres.')}</p>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap"><input id="chk-q" class="phl-filter-input" placeholder="🔍 Filtrer les contrôles…" value="${esc(ov._q||'')}" style="width:240px">
        <button class="cap-lf-btn" data-c="allon" title="Réactiver tous les contrôles">☑ Tout activer</button><button class="cap-lf-btn" data-c="alloff" title="Désactiver les contrôles affichés (filtre)">☐ Tout désactiver</button></div>
      <table class="ana-t chk-t"><thead><tr><th></th><th>Contrôle</th><th>Gravité</th><th title="Lignes actuellement signalées">n</th></tr></thead><tbody>${rows||_L('<tr><td colspan="4" class="ana-dim">Aucun contrôle ne correspond.</td></tr>')}</tbody></table>
      <h4 style="margin:12px 0 4px">Seuils</h4>
      <table class="ana-t chk-t"><tbody>${CAP_CHK_PARAMS.map(([k,l,d,v])=>`<tr><td>${esc(l)}</td><td><input type="number" data-par="${k}" value="${capChkParam(k)}" min="0" style="width:70px"> <span class="ana-dim">${_L('défaut')} ${d} · ${esc((CAP_NAV_ITEMS.find(i=>i.k===v)||{}).l||v)}</span></td></tr>`).join('')}</tbody></table>
    </div>
    <div class="cw-d-ftr"><button class="cap-lf-btn" data-c="reset" title="Tout réactiver, gravité « à vérifier », seuils par défaut">↺ Rétablir</button>
      <button class="cap-lf-btn" data-c="exp" title="Fichier .json du profil seul (sans le modèle ni les autres réglages)">💾 Exporter .json</button><button class="cap-lf-btn" data-c="imp">📂 Importer .json</button>
      <span class="ana-dim" style="font-size:11px;margin-left:auto">Aussi dans ⚙ Interface et vues</span><button class="cap-lf-btn" data-c="x">✕ Fermer</button></div></div>`);
  ov.style.display='flex';
  const touch=full=>{ capChkSave(); capChkRefresh(full); };
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  const qi=ov.querySelector('#chk-q'); qi.oninput=()=>{ ov._q=qi.value; const p=qi.selectionStart; capChkDialog(focusTitle); const i=document.getElementById('chk-q'); i.focus(); i.setSelectionRange(p,p); };
  ov.querySelectorAll('tr.chk-r').forEach(tr=>{ const t=tr.dataset.t;
    tr.querySelector('[data-on]').onchange=e=>{ if(e.target.checked) delete P.off[t]; else P.off[t]=true; tr.classList.toggle('chk-off',!e.target.checked); touch(false); };
    tr.querySelector('[data-sev]').onchange=e=>{ if(e.target.value==='warn') delete P.sev[t]; else P.sev[t]=e.target.value; touch(false); }; });
  ov.querySelectorAll('[data-par]').forEach(i=>i.onchange=()=>{ const k=i.dataset.par, d=(CAP_CHK_PARAMS.find(p=>p[0]===k)||[])[2]; if(i.value===''||+i.value===d) delete P.params[k]; else P.params[k]=+i.value; touch(true); });
  ov.querySelector('[data-c="allon"]').onclick=()=>{ P.off={}; touch(false); capChkDialog(); };
  ov.querySelector('[data-c="alloff"]').onclick=()=>{ ov.querySelectorAll('tr.chk-r').forEach(tr=>{ P.off[tr.dataset.t]=true; }); touch(false); capChkDialog(); };
  ov.querySelector('[data-c="reset"]').onclick=async()=>{ if(!await capConfirm(_L('Rétablir le profil par défaut : tous les contrôles activés, gravité « à vérifier », seuils d\'origine ?'),{ok:_L('Rétablir')})) return; capChkProfile={off:{},sev:{},params:{}}; touch(true); capChkDialog(); };
  ov.querySelector('[data-c="exp"]').onclick=()=>capDownloadBlob(new Blob([JSON.stringify({type:'arcalyse-controles', version:1, date:new Date().toISOString(), profil:capChkProfile},null,1)],{type:'application/json'}), _L('profil-controles.json'));
  ov.querySelector('[data-c="imp"]').onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; let o; try{ o=JSON.parse(await f.text()); }catch(e){ capAlert(_L('Fichier illisible (JSON attendu).'),{level:'err'}); return; }
      const p=o&&o.type==='arcalyse-controles'?o.profil:(o&&o.off&&o.sev?o:null); if(!p){ capAlert(_L('Ce fichier n\'est pas un profil de contrôles Arcalyse.'),{level:'err'}); return; }
      capChkSet(p); capChkDialog(); capToast(_L('✔ Profil de contrôles importé')); }; inp.click(); };
}
