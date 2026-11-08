/* ═══════════════════════════════════════════════
   PHYSICAL LINK VIEW
═══════════════════════════════════════════════ */
let _capPhysLinkView = 'block'; // 'block' | 'line' | 'card' | 'matrix' | 'diag'

/** Extrait les PhysicalLink du modèle Capella.
 * Résout les linkEnds (IDs de PhysicalPort) vers leurs PhysicalComponent parents.
 * Utilise getAttribute('id') directement car xmi:id peut manquer de namespace.
 * @returns {Array} [{linkName, linkId, src:{pcName,pcId,pcNature,portName,portId}, tgt:{...}}]
 */
/* ═══════════════════════════════════════════════════════════════════
   RAPPORTS HTML AUTONOMES — onglets (une vue par onglet), recherche,
   matrice cliquable ; styles et couleurs repris du thème courant.
═══════════════════════════════════════════════════════════════════ */
/** Récupère les règles CSS de l'application utiles aux rapports (classes des vues d'interfaces, chaînes, contrôles).
 * @returns {string} Feuille de style
 */
function capReportCss(){
  const re=/\.(phl-|fex-|cb-|cap-mx|cap-diag|cap-chain|cap-lf-btn|cap-type-badge|prt-|cex-det|ana-)/;
  let css='';
  for(const sh of document.styleSheets){
    let rules; try{ rules=sh.cssRules; }catch(e){ continue; }
    for(const r of rules||[]) if(r.selectorText&&re.test(r.selectorText)) css+=r.cssText+'\n';
  }
  return css;
}

/** Nettoie un fragment HTML de l'application pour un fichier autonome : retire les appels au panneau de détail
 * et les boutons d'action qui n'ont pas de sens hors de l'application.
 * @param {string} html - Fragment HTML
 * @returns {string} Fragment nettoyé
 */
function capReportClean(html){
  return String(html)
    .replace(/\sonclick="[^"]*capOpenDetailById[^"]*"/g,'')
    .replace(/<button class="cap-lf-btn" data-(chx-one|open-map)[^>]*>[\s\S]*?<\/button>/g,'')
    .replace(/<input type="checkbox" class="cap-chx-sel"[^>]*>/g,'');
}

/** Choix des vues d'un export « ⬇ HTML (toutes les vues) » : fenêtre à cases (vues cochées sauf `off`, 🩺 Contrôles décoché par défaut).
 * @param {Array<[string,string]>} vues - [clé, libellé]
 * @param {{off?:string[], titre?:string}} [o] - Clés décochées au départ (défaut : ['diag']), titre
 * @returns {Promise<?string[]>} Clés choisies, ou null si l'utilisateur annule
 */
function capHtmlVuesChoix(vues, o){
  o=o||{}; const off=new Set(o.off||['diag']), esc=capEsc;
  if(typeof _capDlgAuto!=='undefined'&&_capDlgAuto) return Promise.resolve(_capDlgAuto==='ok'?vues.map(v=>v[0]).filter(k=>!off.has(k)):null);
  return new Promise(resolve=>{
    const ov=document.createElement('div'); ov.className='cap-dlg-ov';
    ov.innerHTML=`<div class="cap-dlg" role="dialog" aria-modal="true" aria-labelledby="cap-hv-t">
      <div class="cap-dlg-h"><span class="cap-dlg-i">⬇</span><b id="cap-hv-t">${esc(o.titre||_L('Rapport HTML : vues à inclure'))}</b></div>
      <div class="cap-dlg-b" style="white-space:normal">${_L('Une vue par onglet ; les filtres affichés sont appliqués, sans pagination.')}
        <div class="cap-hv-l">${vues.map(([k,l])=>`<label><input type="checkbox" data-hv="${esc(k)}"${off.has(k)?'':' checked'}> ${esc(l)}</label>`).join('')}</div>
        ${vues.some(v=>v[0]==='matrix')&&vues.some(v=>v[0]==='line')?`<div class="ana-dim" style="font-size:11px">${_L('▦ Matrice : la ≡ Vue Ligne est jointe pour le détail des cellules.')}</div>`:''}</div>
      <div class="cap-dlg-f"><button class="cap-lf-btn" data-c="cancel">${_L('Annuler')}</button><button class="cap-lf-btn pri" data-c="ok">${_L('⬇ Exporter')}</button></div></div>`;
    const ok=ov.querySelector('[data-c="ok"]'), maj=()=>{ ok.disabled=!ov.querySelector('[data-hv]:checked'); };
    const fin=v=>{ ov.remove(); document.removeEventListener('keydown',key,true); resolve(v); };
    const key=e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); fin(null); } else if(e.key==='Enter'&&!ok.disabled){ e.preventDefault(); ok.click(); } };
    ov.addEventListener('change',maj);
    ov.addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; fin(b.dataset.c==='ok'?[...ov.querySelectorAll('[data-hv]:checked')].map(c=>c.dataset.hv):null); });
    document.addEventListener('keydown',key,true); document.body.appendChild(ov); ok.focus(); maj();
  });
}

/** Construit et télécharge un rapport HTML autonome à onglets.
 * @param {object} o - {title, subtitle, tabs:[{key,label,html}], active, filename, cells?:object (clé 'i|j' → ids de lignes)}
 *   Les lignes référencées par cells doivent porter data-lid dans l'onglet 'line' (clic cellule → copie des lignes).
 */
function capHtmlReport(o){
  const cs=getComputedStyle(document.documentElement);
  const vars=['--c-bg','--c-bg2','--c-bg3','--c-bg4','--c-border','--c-text','--c-dim','--c-accent','--c-warn','--c-ok','--c-err']
    .map(v=>`${v}:${cs.getPropertyValue(v).trim()||'inherit'}`).join(';');
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||_L('Projet Capella');
  const tabs=o.tabs.filter(t=>t.html!=null);
  const active=tabs.some(t=>t.key===o.active)?o.active:tabs[0].key;
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${capEsc(o.title)} — ${capEsc(project)}</title>
<style>
:root{${vars}}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:13px;background:var(--c-bg);color:var(--c-text)}
header{padding:16px 22px 0;border-bottom:1px solid var(--c-border);background:var(--c-bg2);position:sticky;top:0;z-index:20}
h1{font-size:17px;margin:0 0 3px}.sub{font-size:11.5px;color:var(--c-dim);margin:0 0 10px}
.rtabs{display:flex;gap:3px;flex-wrap:wrap;align-items:flex-end}
.rtab{padding:6px 13px;border:1px solid var(--c-border);border-bottom:none;border-radius:6px 6px 0 0;background:var(--c-bg3);color:var(--c-dim);cursor:pointer;font-size:12px}
.rtab.on{background:var(--c-bg);color:var(--c-text);font-weight:600}
.rsearch{margin-left:auto;margin-bottom:6px;padding:5px 10px;border:1px solid var(--c-border);border-radius:5px;background:var(--c-bg);color:var(--c-text);width:240px}
main{padding:14px 22px}.rpanel{display:none}.rpanel.on{display:block}
.rfoot{font-size:10.5px;color:var(--c-dim);padding:10px 22px 18px}
.cex-det{cursor:default!important}
.fex-go,.fex-att-go,[data-fnl]{cursor:pointer}.fex-go:hover,.fex-att-go:hover{text-decoration:underline}.r-absent{opacity:.55;cursor:not-allowed!important}
.fex-blk.r-flash{animation:rflash 1.4s}@keyframes rflash{0%,60%{outline:3px solid var(--c-accent);outline-offset:3px}100%{outline:3px solid transparent}}
details summary{cursor:pointer}
@media print{header{position:static}.rsearch{display:none}.rpanel{display:block!important;page-break-after:always}.rtabs{display:none}}
${capReportCss()}
</style></head><body>
<header><h1>${capEsc(o.title)} — ${capEsc(project)}</h1>
<p class="sub">${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}${capCurrentFileName?' · '+capEsc(capCurrentFileName):''}${o.subtitle?' · '+capEsc(o.subtitle):''}</p>
<div class="rtabs">${tabs.length>1?tabs.map(t=>`<button class="rtab${t.key===active?' on':''}" data-t="${t.key}">${capEsc(t.label)}</button>`).join(''):''}
<input class="rsearch" id="rq" placeholder="${_L('🔍 Filtrer le contenu…')}"></div></header>
<main>${tabs.map(t=>`<section class="rpanel${t.key===active?' on':''}" id="p-${t.key}">${capReportClean(t.html)}</section>`).join('')}</main>
<div class="rfoot">${_L('Rapport généré par Relation Map · Capella — fichier autonome, aucune ressource externe.')}</div>
<script>
(function(){
  var cells=${JSON.stringify(o.cells||{})};
  document.querySelectorAll('.rtab').forEach(function(b){ b.onclick=function(){
    document.querySelectorAll('.rtab').forEach(function(x){x.classList.toggle('on',x===b);});
    document.querySelectorAll('.rpanel').forEach(function(p){p.classList.toggle('on',p.id==='p-'+b.dataset.t);}); }; });
  // Recherche : masque les lignes, cartes et lignes de tableau qui ne contiennent pas le texte
  var SEL='.phl-line,.phl-comp-card,.phl-link-row,.cap-chain-card,.cap-diag-t tr,.prt-t tbody tr,.ana-t tr,.cap-chain-xtable tr,.fex-blk';
  document.getElementById('rq').oninput=function(){
    var q=this.value.trim().toLowerCase();
    document.querySelectorAll(SEL).forEach(function(el){
      if(el.tagName==='TR'&&el.querySelector('th')) return; // lignes d'en-tête toujours visibles
      el.style.display=(!q||el.textContent.toLowerCase().indexOf(q)>=0)?'':'none';
    });
  };
  // ◧ Vue Blocs : « aller au bloc » (composant distant, fonction voisine, fonction mère) → défile jusqu'au bloc et le fait clignoter
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-go]'); if(!a) return;
    var panel=a.closest('.rpanel')||document, id=a.getAttribute('data-go'), blk=null;
    panel.querySelectorAll('.fex-blk').forEach(function(x){ if(x.getAttribute('data-fn')===id) blk=x; });
    if(!blk){ a.title=${JSON.stringify(_L('Ce bloc n\'est pas dans le rapport (filtré à l\'export)'))}; a.classList.add('r-absent'); return; }
    if(blk.style.display==='none'){ var q=document.getElementById('rq'); q.value=''; q.oninput(); }
    blk.scrollIntoView({behavior:'smooth',block:'center'});
    blk.classList.remove('r-flash'); void blk.offsetWidth; blk.classList.add('r-flash');
  });
  // ◧ Vue Blocs : « ƒ n fonctions » déplie la liste des fonctions allouées (incluse masquée) ; filtre de la liste
  document.querySelectorAll('[data-fnl]').forEach(function(t){ t.onclick=function(){
    var l=t.closest('.fex-blk').querySelector('[data-fnlist]'); if(!l) return; l.hidden=!l.hidden;
    t.textContent=t.textContent.replace(/[▴▾]$/, l.hidden?'▾':'▴'); }; });
  document.querySelectorAll('.cb-fnq').forEach(function(q){ q.oninput=function(){ var t=q.value.trim().toLowerCase();
    q.closest('[data-fnlist]').querySelectorAll('.cb-fn').forEach(function(x){ x.style.display=!t||x.textContent.toLowerCase().indexOf(t)>=0?'':'none'; }); }; });
  // Matrice : clic sur une cellule → copie des lignes correspondantes de la vue Ligne
  document.querySelectorAll('.cap-mx-cell').forEach(function(td){ td.onclick=function(){
    document.querySelectorAll('.cap-mx-cell.sel').forEach(function(x){x.classList.remove('sel');}); td.classList.add('sel');
    var box=td.closest('.rpanel').querySelector('.cap-mx-detail'); if(!box) return;
    var ids=cells[td.dataset.cell]||[]; box.innerHTML='<div style="font-size:11px;color:var(--c-dim);margin-bottom:6px">'+td.title+'</div>';
    ids.forEach(function(id){ var src=document.querySelector('#p-line [data-lid="'+id+'"]'); if(src) box.appendChild(src.cloneNode(true)); });
  }; });
})();
<\/script></body></html>`; // <\/script> : ne pas fermer le bloc script de l'application
  capDownloadBlob(new Blob([html],{type:'text/html'}), o.filename);
}