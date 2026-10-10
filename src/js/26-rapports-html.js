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
  var SEL='.phl-line,.phl-comp-card,.phl-link-row,.cap-chain-card,.cap-diag-t tr,.prt-t tbody tr,.ana-t tr,.cap-chain-xtable tr';
  document.getElementById('rq').oninput=function(){
    var q=this.value.trim().toLowerCase();
    document.querySelectorAll(SEL).forEach(function(el){
      if(el.tagName==='TR'&&el.querySelector('th')) return; // lignes d'en-tête toujours visibles
      el.style.display=(!q||el.textContent.toLowerCase().indexOf(q)>=0)?'':'none';
    });
  };
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