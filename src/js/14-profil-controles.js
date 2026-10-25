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
const CAP_CHK_POIDS={info:0, warn:1, err:3};   // poids d'origine des gravités dans le score 💚 (69), réglables dans le profil (`poids`)
/** Vues dont les contrôles sont connus d'avance (clé de CAP_NAV_ITEMS → sections). Les vues qui bâtissent leurs
 * contrôles en ligne (🔌, 🔀, 🧬, 🚦) sont ajoutées au catalogue à leur premier affichage (`_capChkSeen`). */
const CAP_CHK_VIEWS=[
  ['functions', ()=>capFnChecks(capComputeFunctions(),'all')], ['fex', ()=>capFexChecks('all')], ['csys', ()=>capCbChecks('SA')], ['cblk', ()=>capCbChecks('LA')],
  ['ports', ()=>capPortsDiagSections(capComputePortLinks())], ['chains', ()=>capChChecks('all')], ['scen', ()=>capScChecks()], ['ana:reqs', ()=>capReqChecks()], ['ana:pvmt', ()=>capPvChecks()],
  ['ana:data', ()=>capDmChecks()], ['ana:cts', ()=>capCtChecks()], ['ana:cats', ()=>capEcChecks()], ['ana:libs', ()=>capLibChecks()], ['ana:rec', ()=>capRecChecks()], ['ana:deploy', ()=>capDepChecks()], ['ana:status', ()=>capStChecks()], ['ana:sysml', ()=>capSyChecks()]];

var capChkProfile=(()=>{ try{ const el=document.getElementById('cap-checks'); const p=el?JSON.parse(el.textContent):null; return Object.assign({off:{}, sev:{}, params:{}, poids:{}}, p||{}); }catch(e){ return {off:{}, sev:{}, params:{}, poids:{}}; } })();
var _capChkSeen={};   // titre → {tip, view} des contrôles déjà affichés (vues sans fonction de contrôles)

/** Enregistre le profil dans la page (bloc `cap-checks`, repris par la 💾 Page HTML). */
function capChkSave(){
  let el=document.getElementById('cap-checks');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-checks'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(capChkProfile);
}

/** Valeur d'un seuil (profil, sinon défaut). @param {string} k - Clé de CAP_CHK_PARAMS @returns {number} */
function capChkParam(k){ const v=capChkProfile.params&&capChkProfile.params[k]; const d=(CAP_CHK_PARAMS.find(p=>p[0]===k)||[])[2]; return v==null||isNaN(+v)?d:+v; }

/** Gravité d'un contrôle : celle du profil, sinon la gravité d'origine portée par sa section (`sev`), sinon ⚠.
 * @param {string} title - Titre @param {string} [defaut] - Gravité d'origine de la section @returns {'info'|'warn'|'err'} */
function capChkSev(title, defaut){ return capChkProfile.sev[title]||defaut||'warn'; }

/** Poids d'une gravité dans le score 💚 : celui du profil (`poids`), sinon l'origine `CAP_CHK_POIDS`. @param {string} sev - Gravité @returns {number} Poids */
function capChkPoids(sev){ const p=capChkProfile.poids&&capChkProfile.poids[sev]; return p==null||p===''||isNaN(+p)?(CAP_CHK_POIDS[sev]||0):+p; }

/** Vrai si le profil désactive un contrôle. @param {string} title - Titre @returns {boolean} */
function capChkOff(title){ return !!capChkProfile.off[title]; }

/** Sections de contrôles conservées par le profil (contrôles activés), gravité renseignée (`sev`).
 * @param {object[]} sections - Sections {title, tip, icon, items…}
 * @returns {object[]} Sections activées
 */
function capChkFilter(sections){ return (sections||[]).filter(s=>s&&!capChkOff(s.title)).map(s=>Object.assign({}, s, {sev:capChkSev(s.title, s.sev)})); }

/** Note les contrôles affichés par une vue (catalogue des vues sans fonction de contrôles).
 * @param {object[]} sections - Sections affichées
 */
function capChkSeen(sections){
  const v=typeof capNavCurKey==='function'?capNavCurKey(true):'';
  (sections||[]).forEach(s=>{ if(s&&s.title&&!_capChkSeen[s.title]) _capChkSeen[s.title]={tip:s.tip||'', view:v, sev:s.sev||'warn'}; });
}

/** Catalogue des contrôles connus : par vue, titre, info-bulle, gravité d'origine et nombre de lignes actuel.
 * @returns {Array<{view:string, label:string, items:Array<{title:string, tip:string, sev:string, n:number}>}>} Vues
 */
function capChkCatalog(){
  const lab=k=>{ const it=(typeof CAP_NAV_ITEMS!=='undefined'?CAP_NAV_ITEMS:[]).find(i=>i.k===k); return it?it.l:(k||_L('Autres vues')); };
  const byView={}, seen=new Set();
  const put=(v, s)=>{ if(!s||!s.title||seen.has(s.title)) return; seen.add(s.title); (byView[v]=byView[v]||[]).push({title:s.title, tip:s.tip||'', sev:s.sev||'warn', n:(s.items||[]).length}); };
  const sysml=typeof _capSysml!=='undefined'&&!!_capSysml.lecture;   // 🧩 modèle SysML v2 : contrôles des vues Capella sans objet (87)
  if(typeof capLoaded!=='undefined'&&capLoaded) CAP_CHK_VIEWS.forEach(([v,f])=>{ if(sysml&&CAP_SY_VUES_CAPELLA.includes(v)) return; try{ f().forEach(s=>put(v,s)); }catch(e){ console.warn('Profil de contrôles : vue',v,e); } });
  Object.entries(_capChkSeen).forEach(([title,o])=>put(o.view, {title, tip:o.tip, sev:o.sev, items:[]}));
  const order=k=>{ const i=(typeof CAP_NAV_ITEMS!=='undefined'?CAP_NAV_ITEMS:[]).findIndex(x=>x.k===k); return i<0?999:i; };
  return Object.keys(byView).sort((a,b)=>order(a)-order(b)).map(v=>({view:v, label:lab(v), items:byView[v]}));
}

/** Applique un profil (fichier ⚙, 📄 projet, import) puis rafraîchit l'affichage.
 * @param {Object} p - Profil {off, sev, params, poids}
 */
function capChkSet(p){
  if(!p||typeof p!=='object') return;
  const full=JSON.stringify(p.params||{})!==JSON.stringify(capChkProfile.params||{});   // seuils changés : tout recalculer (sinon la sous-vue affichée est conservée)
  capChkProfile={off:p.off||{}, sev:p.sev||{}, params:p.params||{}, poids:p.poids||{}};
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

/** Fenêtre 🩺 Profil de contrôles : par vue, chaque contrôle (activé, gravité, nombre actuel, coût dans le score 💚 ; tri par coût), seuils, poids du score, export / import .json.
 * @param {string} [focusTitle] - Contrôle à mettre en évidence
 */
function capChkDialog(focusTitle){
  let ov=document.getElementById('cap-chk-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-chk-ov'; document.body.appendChild(ov); ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const esc=capEsc, P=capChkProfile, cat=capChkCatalog(), q=(ov._q||'').toLowerCase();
  let SC=null; try{ SC=capLoaded&&typeof capSanteCompute==='function'?capSanteCompute():null; }catch(e){ SC=null; }   // coût de chaque contrôle dans le score 💚 (69)
  const cout=t=>{ if(!SC||SC.couts[t]==null) return null; const c=SC.couts[t]; return {pts:c, gain:Math.round(100*Math.exp(-(SC.pen-c)/Math.max(1,SC.pop)))-SC.score}; };
  const coutHtml=t=>{ if(!SC) return ''; const c=cout(t); if(!c) return `<span class="ana-dim" title="${_L('Non repris dans le score 💚 : déjà compté par une autre vue')}">—</span>`;
    return c.pts?`<span title="${_L(`Poids × lignes = ${c.pts} ; score sans ce contrôle : ${SC.score+c.gain}`)}"><b>${c.pts}</b>${c.gain?` <span class="ana-dim">+${c.gain}</span>`:''}</span>`:'<span class="ana-dim">0</span>'; };
  const defSev={}; cat.forEach(v=>v.items.forEach(i=>{ defSev[i.title]=i.sev; }));   // gravité d'origine de chaque contrôle
  const nOff=Object.keys(P.off).filter(k=>P.off[k]).length, nSev=Object.keys(P.sev).filter(k=>P.sev[k]&&P.sev[k]!==(defSev[k]||'warn')).length, nPar=CAP_CHK_PARAMS.filter(p=>capChkParam(p[0])!==p[2]).length, nPoids=Object.keys(CAP_CHK_POIDS).filter(k=>capChkPoids(k)!==CAP_CHK_POIDS[k]).length;
  const filt=i=>!q||(i.title+' '+i.tip).toLowerCase().includes(q), tri=!!(ov._tri&&SC);
  const rowOf=(i,v)=>`<tr class="chk-r${i.title===focusTitle?' chk-focus':''}${P.off[i.title]?' chk-off':''}" data-t="${esc(i.title)}" data-sev-d="${i.sev||'warn'}">
      <td><input type="checkbox" data-on${P.off[i.title]?'':' checked'} title="${_L('Activé')}"></td>
      <td><b>${esc(i.title)}</b>${tri?` <span class="ana-dim">· ${esc(v.label)}</span>`:''}${i.tip?`<div class="ana-dim">${esc(i.tip)}</div>`:''}</td>
      <td><select data-sev title="${_L('Gravité')}">${CAP_CHK_SEV.map(([k,ico,l])=>`<option value="${k}"${capChkSev(i.title, i.sev)===k?' selected':''}>${ico} ${l}${k===(i.sev||'warn')?' · '+_L('défaut'):''}</option>`).join('')}</select></td>
      <td class="chk-n">${capLoaded?`<span class="cap-diag-cnt ${i.n?capChkSev(i.title, i.sev):'ok'}">${i.n}</span>`:''}</td>${SC?`<td class="chk-n">${coutHtml(i.title)}</td>`:''}</tr>`;
  // Par vue (en-têtes), ou à plat triés par coût dans le score 💚 (les plus coûteux d'abord)
  const rows=tri?cat.flatMap(v=>v.items.filter(filt).map(i=>({i,v,c:(cout(i.title)||{pts:-1}).pts}))).sort((a,b)=>b.c-a.c||a.i.title.localeCompare(b.i.title)).map(x=>rowOf(x.i,x.v)).join('')
    :cat.map(v=>{ const its=v.items.filter(filt); if(!its.length) return ''; return `<tr class="chk-v"><th colspan="${SC?5:4}">${v.label}</th></tr>`+its.map(i=>rowOf(i,v)).join(''); }).join('');
  ov.innerHTML=_L(`<div class="cw-d-box" style="width:min(820px,calc(100vw - 32px))">
    <div class="cw-d-hdr"><b>🩺 Profil de contrôles</b><span class="ana-dim" style="font-size:11px">${nOff} désactivé(s) · ${nSev} gravité(s) modifiée(s) · ${nPar} seuil(s) modifié(s)${nPoids?_L(` · ${nPoids} poids modifié(s)`):''}</span><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body">
      <p class="cw-d-sub">Chaque contrôle 🩺 peut être <b>désactivé</b> (il n'apparaît plus dans les vues ni au tableau de bord) ou recevoir une <b>gravité</b> : ℹ information (compté à part, hors score 💚 de santé), ⚠ à vérifier, ✖ bloquant. Gravité d'origine : ℹ pour la complétude et les bonnes pratiques (descriptions, nommage, Exchange Items, allocations, réalisations…), ✖ pour les incohérences (références introuvables, chaînes discontinues, sens de ports contradictoires…), ⚠ sinon. Le profil est enregistré avec la 💾 page, repris par 📄 Ouvrir un projet et par le fichier ⚙ Interface et vues ; exportez-le seul pour le partager avec votre équipe.${capLoaded?'':_L(' <b>Chargez un modèle</b> pour voir tous les contrôles et leurs nombres.')}</p>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap"><input id="chk-q" class="phl-filter-input" placeholder="🔍 Filtrer les contrôles…" value="${esc(ov._q||'')}" style="width:240px">
        <button class="cap-lf-btn" data-c="allon" title="Réactiver tous les contrôles">☑ Tout activer</button><button class="cap-lf-btn" data-c="alloff" title="Désactiver les contrôles affichés (filtre)">☐ Tout désactiver</button>${SC?`<button class="cap-lf-btn${tri?' active':''}" data-c="tri" title="${_L('Tous les contrôles à plat, les plus coûteux pour le score 💚 d\'abord (sinon : par vue)')}">⇅ ${_L('Par coût')}</button>`:''}</div>
      <table class="ana-t chk-t"><thead><tr><th></th><th>Contrôle</th><th>Gravité</th><th title="Lignes actuellement signalées">n</th>${SC?`<th title="${_L('Coût dans le score 💚 : poids × lignes, et gain de score si ce contrôle était passé ℹ')}">💚</th>`:''}</tr></thead><tbody>${rows||_L('<tr><td colspan="4" class="ana-dim">Aucun contrôle ne correspond.</td></tr>')}</tbody></table>
      <h4 style="margin:12px 0 4px">Poids du score 💚</h4>
      <p class="cw-d-sub">Score = 100 × e<sup>−(Σ poids × lignes ÷ éléments nommés)</sup> ; un poids 0 sort la gravité du score (compté « pour information »).</p>
      <table class="ana-t chk-t"><tbody><tr>${CAP_CHK_SEV.map(([k,ico,l])=>`<td>${ico} ${l} <input type="number" data-poids="${k}" value="${capChkPoids(k)}" min="0" step="0.5" style="width:60px"> <span class="ana-dim">${_L('défaut')} ${CAP_CHK_POIDS[k]}</span></td>`).join('')}</tr></tbody></table>
      <h4 style="margin:12px 0 4px">Seuils</h4>
      <table class="ana-t chk-t"><tbody>${CAP_CHK_PARAMS.map(([k,l,d,v])=>`<tr><td>${esc(l)}</td><td><input type="number" data-par="${k}" value="${capChkParam(k)}" min="0" style="width:70px"> <span class="ana-dim">${_L('défaut')} ${d} · ${esc((CAP_NAV_ITEMS.find(i=>i.k===v)||{}).l||v)}</span></td></tr>`).join('')}</tbody></table>
    </div>
    <div class="cw-d-ftr"><button class="cap-lf-btn" data-c="reset" title="Tout réactiver, gravités, poids et seuils d'origine">↺ Rétablir</button>
      <button class="cap-lf-btn" data-c="exp" title="Fichier .json du profil seul (sans le modèle ni les autres réglages)">💾 Exporter .json</button><button class="cap-lf-btn" data-c="imp">📂 Importer .json</button>
      <span class="ana-dim" style="font-size:11px;margin-left:auto">Aussi dans ⚙ Interface et vues</span><button class="cap-lf-btn" data-c="x">✕ Fermer</button></div></div>`);
  ov.style.display='flex';
  const touch=full=>{ capChkSave(); capChkRefresh(full); };
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  const qi=ov.querySelector('#chk-q'); qi.oninput=()=>{ ov._q=qi.value; const p=qi.selectionStart; capChkDialog(focusTitle); const i=document.getElementById('chk-q'); i.focus(); i.setSelectionRange(p,p); };
  ov.querySelectorAll('tr.chk-r').forEach(tr=>{ const t=tr.dataset.t;
    tr.querySelector('[data-on]').onchange=e=>{ if(e.target.checked) delete P.off[t]; else P.off[t]=true; tr.classList.toggle('chk-off',!e.target.checked); touch(false); };
    tr.querySelector('[data-sev]').onchange=e=>{ if(e.target.value===(tr.dataset.sevD||'warn')) delete P.sev[t]; else P.sev[t]=e.target.value; touch(false); }; });
  ov.querySelectorAll('[data-poids]').forEach(i=>i.onchange=()=>{ const k=i.dataset.poids; if(i.value===''||+i.value===CAP_CHK_POIDS[k]||isNaN(+i.value)) delete P.poids[k]; else P.poids[k]=+i.value; touch(false); capChkDialog(focusTitle); });
  ov.querySelector('[data-c="tri"]')&&(ov.querySelector('[data-c="tri"]').onclick=()=>{ ov._tri=!ov._tri; capChkDialog(focusTitle); });
  ov.querySelectorAll('[data-par]').forEach(i=>i.onchange=()=>{ const k=i.dataset.par, d=(CAP_CHK_PARAMS.find(p=>p[0]===k)||[])[2]; if(i.value===''||+i.value===d) delete P.params[k]; else P.params[k]=+i.value; touch(true); });
  ov.querySelector('[data-c="allon"]').onclick=()=>{ P.off={}; touch(false); capChkDialog(); };
  ov.querySelector('[data-c="alloff"]').onclick=()=>{ ov.querySelectorAll('tr.chk-r').forEach(tr=>{ P.off[tr.dataset.t]=true; }); touch(false); capChkDialog(); };
  ov.querySelector('[data-c="reset"]').onclick=async()=>{ if(!await capConfirm(_L('Rétablir le profil par défaut : tous les contrôles activés, gravités, poids et seuils d\'origine ?'),{ok:_L('Rétablir')})) return; capChkProfile={off:{},sev:{},params:{},poids:{}}; touch(true); capChkDialog(); };
  ov.querySelector('[data-c="exp"]').onclick=()=>capDownloadBlob(new Blob([JSON.stringify({type:'arcalyse-controles', version:1, date:new Date().toISOString(), profil:capChkProfile},null,1)],{type:'application/json'}), _L('profil-controles.json'));
  ov.querySelector('[data-c="imp"]').onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; let o; try{ o=JSON.parse(await f.text()); }catch(e){ capAlert(_L('Fichier illisible (JSON attendu).'),{level:'err'}); return; }
      const p=o&&o.type==='arcalyse-controles'?o.profil:(o&&o.off&&o.sev?o:null); if(!p){ capAlert(_L('Ce fichier n\'est pas un profil de contrôles Arcalyse.'),{level:'err'}); return; }
      capChkSet(p); capChkDialog(); capToast(_L('✔ Profil de contrôles importé')); }; inp.click(); };
}
