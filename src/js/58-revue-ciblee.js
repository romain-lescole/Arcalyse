/* ═══════════════════════════════════════════════════════════════════════
   📤 REVUE CIBLÉE — page HTML autonome envoyée aux relecteurs, puis réimportée
   ───────────────────────────────────────────────────────────────────────
   L'auteur choisit des commentaires de 💬 Revue (liste filtrée, non clos, tous, ou périmètre d'un 📋 plan de revue)
   et produit une page HTML autonome (sans Arcalyse, hors ligne) : consignes, commentaires, éléments visés (type,
   couche, description), diagrammes commentés avec leurs notes. Chaque relecteur y saisit son nom, répond aux
   commentaires (avis : d'accord, pas d'accord, question, proposition) et peut en ajouter ; il enregistre la page
   (elle peut passer d'un relecteur à l'autre) ou exporte ses réponses en .json.
   Réimport : 💬 Revue › 💾 Revue ▾ › 📂 Importer / fusionner accepte la page .html (ou le .json) : réponses ajoutées
   aux commentaires, nouveaux commentaires ajoutés (cibles reliées au modèle chargé).
   Données de la page : bloc JSON « arcalyse-revue-ciblee » (type « arcalyse-revue-ciblee »).
   ═══════════════════════════════════════════════════════════════════════ */

/** Avis qu'un relecteur peut donner en répondant à un commentaire : k = valeur enregistrée, l = libellé. */
function capRevAvisListe(){ return [
  {k:'', l:_L('— Avis —')}, {k:'ok', l:_L('👍 D\'accord')}, {k:'ko', l:_L('👎 Pas d\'accord')},
  {k:'q', l:_L('❓ Question')}, {k:'prop', l:_L('💡 Proposition')}, {k:'fait', l:_L('✔ Correction vérifiée')} ]; }
/** @param {object} r - Réponse @returns {string} libellé de son avis ('' sans avis) */
function capRevAvis(r){ const a=r&&r.avis&&capRevAvisListe().find(x=>x.k===r.avis); return a?a.l:''; }

/**
 * Fenêtre « 📤 Revue ciblée » : titre, consignes, date de retour, commentaires à soumettre (cases), options.
 * @param {object} [o] - Préréglages : {titre, consignes, echeance, filtre:function(commentaire):boolean} (périmètre d'un plan de revue)
 */
function capRevCibleeDialog(o){
  o=o||{};
  const D=capRevDoc(), esc=capEsc;
  if(!_capRev.comments.length){ capRevAlert(_L('Aucun commentaire de revue : créez d\'abord des commentaires (💬 Revue).')); return; }
  const portees=[['list',_L('de la liste (filtres de 💬 Commentaires)')],['open',_L('non clos')],['all',_L('tous')]];
  if(o.filtre) portees.unshift(['perim',_L('du périmètre du plan de revue')]);
  const choix=k=>k==='perim'?_capRev.comments.filter(o.filtre):k==='list'?capRevFiltered():k==='open'?_capRev.comments.filter(c=>!capRevClosed(c)):_capRev.comments.slice();
  const tri=l=>l.slice().sort((a,b)=>a.num-b.num);
  let ov=D.getElementById('crv-ov');
  if(!ov){ ov=D.createElement('div'); ov.id='crv-ov'; D.body.appendChild(ov); }
  const diagOk=typeof _capDiag!=='undefined'&&_capDiag.airdCharge;
  ov.innerHTML=`<div class="cw-d-box" style="max-width:680px">
    <div class="cw-d-hdr"><b>${_L('📤 Revue ciblée : page HTML à faire relire')}</b><button class="cap-lf-btn" data-x="1">✕</button></div>
    <div class="cw-d-body">
      <div class="crv-help">${_L('Les relecteurs ouvrent la page dans leur navigateur (sans Arcalyse, hors ligne), répondent aux commentaires et en ajoutent, puis vous renvoient la page enregistrée (ou leurs réponses en .json). Réimport : 💬 Revue › 💾 Revue ▾ › 📂 Importer / fusionner.')}</div>
      <label class="crv-lbl">${_L('Titre')}<input id="crv-rc-titre" class="crv-in" value="${esc(o.titre||_L('Revue ciblée')+' — '+(capRevProjectName()||capCurrentFileName||''))}"></label>
      <label class="crv-lbl">${_L('Consignes aux relecteurs')}<textarea id="crv-rc-cons" class="crv-in" rows="3" placeholder="${_L('Ce qu\'il faut regarder, comment répondre…')}">${esc(o.consignes||'')}</textarea></label>
      <label class="crv-lbl" style="max-width:220px">${_L('Retour attendu le')}<input id="crv-rc-due" type="date" class="crv-in" value="${esc(o.echeance||'')}"></label>
      <div class="crv-filters"><label>${_L('Commentaires')} <select id="crv-rc-portee">${portees.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
        <span class="ana-dim" id="crv-rc-n"></span><button class="cap-lf-btn" data-tout="1">${_L('Tout cocher')}</button><button class="cap-lf-btn" data-tout="0">${_L('Tout décocher')}</button></div>
      <div class="crv-rc-l" id="crv-rc-l"></div>
      <div class="crv-opts">
        <label class="crv-opt"><input type="checkbox" id="crv-rc-rep" checked> ${_L('Réponses déjà faites')}</label>
        <label class="crv-opt"><input type="checkbox" id="crv-rc-desc" checked> ${_L('Description des éléments visés')}</label>
        <label class="crv-opt" title="${diagOk?'':_L('Ouvrez le .aird du projet pour joindre les diagrammes')}"><input type="checkbox" id="crv-rc-diag"${diagOk?' checked':' disabled'}> ${_L('Diagrammes commentés (avec les notes)')}</label>
      </div>
    </div>
    <div class="cw-d-ftr"><span id="crv-rc-st" class="ana-dim"></span><span style="flex:1"></span><button class="cap-lf-btn" data-x="1">${_L('Annuler')}</button>
      <button class="phl-export-btn" data-ok="1" style="margin-left:0">${_L('📤 Créer la page HTML')}</button></div></div>`;
  ov.style.display='flex';
  const sel=new Set(), q=id=>ov.querySelector('#'+id);
  const liste=()=>{
    const l=tri(choix(q('crv-rc-portee').value)); sel.clear(); l.forEach(c=>sel.add(c.id));
    q('crv-rc-l').innerHTML=l.length?l.map(c=>{ const st=capRevSt(c), cr=capRevCr(c);
      return `<label class="crv-rc-i"><input type="checkbox" data-c="${esc(c.id)}" checked> <b>#${c.num}</b> ${c.crit?`<span class="crv-crit" style="background:${cr.c};color:${capInk(cr.c)}">${cr.l}</span>`:''} <span style="color:${capTextOn(st.c)}">${st.i}</span> ${esc(c.title||String(c.text||'').split('\n')[0].slice(0,110))}</label>`; }).join('')
      :`<div class="crv-empty">${_L('Aucun commentaire.')}</div>`;
    compte();
  };
  const compte=()=>{ q('crv-rc-n').textContent=_L(`${sel.size} commentaire(s) choisi(s)`); };
  const fermer=()=>{ ov.style.display='none'; ov.innerHTML=''; };
  ov.onchange=e=>{
    if(e.target.id==='crv-rc-portee'){ liste(); return; }
    if(e.target.dataset.c){ if(e.target.checked) sel.add(e.target.dataset.c); else sel.delete(e.target.dataset.c); compte(); }
  };
  ov.oninput=null;
  ov.onkeydown=e=>{ if(e.key==='Escape') fermer(); };
  ov.onclick=async e=>{
    if(e.target===ov||e.target.closest('[data-x]')){ fermer(); return; }
    const t=e.target.closest('[data-tout]');
    if(t){ ov.querySelectorAll('#crv-rc-l [data-c]').forEach(c=>{ c.checked=t.dataset.tout==='1'; if(c.checked) sel.add(c.dataset.c); else sel.delete(c.dataset.c); }); compte(); return; }
    if(!e.target.closest('[data-ok]')) return;
    const cs=tri(_capRev.comments.filter(c=>sel.has(c.id)));
    if(!cs.length){ capRevAlert(_L('Cochez au moins un commentaire.')); return; }
    const opts={titre:q('crv-rc-titre').value.trim(), consignes:q('crv-rc-cons').value.trim(), echeance:q('crv-rc-due').value,
      rep:q('crv-rc-rep').checked, desc:q('crv-rc-desc').checked, diag:q('crv-rc-diag').checked};
    const b=e.target.closest('[data-ok]'); b.disabled=true; q('crv-rc-st').textContent=_L('Préparation de la page…');
    try{ await capRevCibleeExport(cs, opts); fermer(); }
    catch(err){ console.error(err); b.disabled=false; q('crv-rc-st').textContent=''; capRevAlert(_L('Page non créée : ')+(err&&err.message||err)); }
  };
  liste();
}

/**
 * Diagrammes commentés (notes posées sur un diagramme) : SVG exporté par la visionneuse, avec les notes des
 * commentaires (cadre et numéro) ajoutées en coordonnées du diagramme. La vue 🔲 Diagrammes Capella est ouverte le temps
 * de l'export, puis la vue précédente est rétablie.
 * @param {object[]} cs - Commentaires
 * @returns {Promise<Object<string,{nom:string,type:string,svg:string}>>} uid → diagramme
 */
async function capRevCibleeDiagrammes(cs){
  const uids=[...new Set(cs.filter(c=>c.diag&&c.diag.uid).map(c=>c.diag.uid))], out={};
  const reps=capDiagReps().filter(r=>uids.includes(r.uid)); if(!reps.length) return out;
  const avant=capNavCurKey(true)||'home', mode=currentMode;
  capNavOpen('diag');
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  try{
    for(const r of reps){
      let svg=''; try{ svg=await capDiagSvg(r.uid); }catch(e){ console.warn('Diagramme non exporté :', r.nom, e); continue; }
      const notes=cs.filter(c=>c.diag&&c.diag.uid===r.uid).map(c=>{ const d=c.diag, cr=capRevCr(c), col=c.crit?cr.c:'#e3b341', w=d.min?28:(d.w||120), h=d.min?28:(d.h||60);
        return `<g><rect x="${d.x}" y="${d.y}" width="${w}" height="${h}" rx="4" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="2" stroke-dasharray="6 3"/>`+
          `<circle cx="${d.x}" cy="${d.y}" r="11" fill="${col}"/><text x="${d.x}" y="${d.y+4}" text-anchor="middle" font-size="11" font-weight="700" font-family="Segoe UI,Arial,sans-serif" fill="${capInk(col)}">${c.num}</text></g>`; }).join('');
      out[r.uid]={nom:r.nom, type:(r.sigle?r.sigle+' · ':'')+(r.type||''), svg:svg.replace(/<\/svg>\s*$/,`<g class="arc-notes">${notes}</g></svg>`)};
    }
  } finally {
    if(mode!=='capella') document.getElementById('mode-rm')?.click(); else capNavOpen(avant);
  }
  return out;
}

/**
 * Crée et télécharge la page HTML de revue ciblée.
 * @param {object[]} cs - Commentaires choisis
 * @param {object} o - {titre, consignes, echeance, rep, desc, diag}
 */
async function capRevCibleeExport(cs, o){
  const elements={};
  cs.forEach(c=>(c.targets||[]).forEach(t=>{ if(elements[t.id]) return; const e=capLoaded&&capGetElementById_(t.id);
    elements[t.id]={nom:e?e.attrs.name||t.name||'':t.name||'', type:(CAP_HUMAN_NAMES[e?e.typeName:t.type]||{}).h||t.type||'', couche:e?e.layer||'':t.layer||'',
      desc:o.desc&&e?capHtmlToText(e.attrs.description||'').slice(0,4000):'', absent:!e}; }));
  const diagrams=o.diag&&typeof _capDiag!=='undefined'&&_capDiag.airdCharge?await capRevCibleeDiagrammes(cs):{};
  const comments=cs.map(c=>{ const x=JSON.parse(JSON.stringify(c)); if(!o.rep) x.replies=[]; (x.targets||[]).forEach(t=>{ delete t.snap; }); return x; });
  const data={type:'arcalyse-revue-ciblee', version:1, id:capRevUid(), titre:o.titre||_L('Revue ciblée'), consignes:o.consignes||'', echeance:o.echeance||'',
    auteur:_capRev.me||'', date:new Date().toISOString(), model:capCurrentFileName||'', project:capRevProjectId(), projectName:capRevProjectName(),
    comments, elements, diagrams, relecteur:'', reponses:[], nouveaux:[]};
  const base=(o.titre||'revue').replace(/[^\p{L}\p{N}\-]+/gu,'_').slice(0,60)||'revue';
  capDownloadBlob(new Blob([capRevCibleePage(data)],{type:'text/html'}), base+'.html');
  if(typeof capWatchFlash==='function') capWatchFlash(_L(`✔ Page de revue ciblée créée (${cs.length} commentaire(s)) : envoyez-la aux relecteurs`));
}

/**
 * Code HTML complet de la page de revue ciblée (autonome, hors ligne) : données, styles, script de saisie des réponses.
 * @param {object} data - Revue ciblée (type « arcalyse-revue-ciblee »)
 * @returns {string} Document HTML
 */
function capRevCibleePage(data){
  // Textes de la page (traduits avec le reste de l'interface dans la version anglaise)
  const T={lang:_L('fr'), me:_L('Votre nom (relecteur)'), mePh:_L('Nom, initiales'), save:_L('💾 Enregistrer la page avec mes réponses'), json:_L('⬇ Exporter mes réponses (.json)'),
    saveT:_L('Télécharge cette page avec toutes les réponses : renvoyez-la à l\'auteur, ou transmettez-la au relecteur suivant'),
    jsonT:_L('Fichier de réponses à renvoyer à l\'auteur (réimport dans Arcalyse : 💬 Revue › 📂 Importer / fusionner)'),
    proj:_L('Projet'), model:_L('Modèle'), author:_L('Auteur'), date:_L('Créée le'), due:_L('Retour attendu le'), cons:_L('Consignes'),
    all:_L('Tous les commentaires'), todo:_L('Sans réponse de ma part'), n:_L('commentaire(s)'), mine:_L('réponse(s) de ma part'), news:_L('nouveau(x) commentaire(s)'),
    reply:_L('↩ Ajouter ma réponse'), replyPh:_L('Votre réponse…'), noName:_L('Indiquez d\'abord votre nom (en haut de la page).'), empty:_L('Écrivez une réponse.'),
    del:_L('Supprimer'), delQ:_L('Supprimer cette réponse ?'), diag:_L('🔲 Diagramme'), showD:_L('Voir le diagramme'), desc:_L('Description'), gone:_L('absent du modèle'),
    newH:_L('✚ Nouveau commentaire'), newTitle:_L('Titre (facultatif)'), newText:_L('Commentaire…'), newTarget:_L('Porte sur'), general:_L('(commentaire général)'),
    crit:_L('Criticité'), add:_L('✚ Ajouter le commentaire'), newList:_L('Mes nouveaux commentaires'), unsaved:_L('Réponses non enregistrées : enregistrez la page avant de la fermer.'),
    saved:_L('✔ Page téléchargée : renvoyez-la à l\'auteur.'), status:_L('Statut'), field:_L('champ'), help:_L('Répondez aux commentaires ci-dessous (avis et texte), ajoutez les vôtres, puis 💾 enregistrez la page et renvoyez-la à l\'auteur.'),
    produced:_L('Page produite par Arcalyse — elle fonctionne hors ligne, sans installation.'), fileSuffix:_L('-relu')};
  const avis=capRevAvisListe(), statuts=capRevStatuts().map(s=>({k:s.k, l:s.i+' '+s.l, c:s.c})), crits=capRevCrits().map(c=>({k:c.k, l:c.l, c:c.c}));
  const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
  return `<!DOCTYPE html>
<html lang="${T.lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${capEsc(data.titre)}</title>
<style>
:root{--bg:#f6f8fa;--card:#fff;--b:#d0d7de;--t:#1f2328;--d:#656d76;--a:#0969da}
*{box-sizing:border-box}body{margin:0;font:13.5px/1.5 'Segoe UI',Arial,sans-serif;color:var(--t);background:var(--bg)}
header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--b);padding:10px 18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
header h1{font-size:17px;margin:0;flex:1;min-width:220px}main{max-width:1050px;margin:0 auto;padding:14px 18px 60px}
button{font:inherit;padding:5px 11px;border:1px solid var(--b);border-radius:6px;background:#f6f8fa;cursor:pointer}button.p{background:#1f883d;color:#fff;border-color:#1a7f37}
input,textarea,select{font:inherit;padding:5px 7px;border:1px solid var(--b);border-radius:6px;background:#fff;color:var(--t)}textarea{width:100%;resize:vertical}
.info{background:var(--card);border:1px solid var(--b);border-radius:8px;padding:10px 14px;margin-bottom:12px}.info table td{padding:1px 10px 1px 0;vertical-align:top}.d{color:var(--d);font-size:12px}
.cons{white-space:pre-wrap;margin-top:6px;padding:6px 10px;border-left:3px solid var(--a);background:#f0f6ff}
.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}
.c{background:var(--card);border:1px solid var(--b);border-left:5px solid var(--cc,#8b949e);border-radius:8px;padding:10px 14px;margin:10px 0}
.ch{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.num{font-weight:700}.crit{padding:0 8px;border-radius:9px;font-size:11.5px;font-weight:700}
.ti{font-weight:600;margin:4px 0}.tx{white-space:pre-wrap}.tg{display:inline-block;margin:3px 6px 0 0;padding:1px 8px;border:1px solid var(--b);border-radius:10px;font-size:12px;background:#f6f8fa}
.tgd{margin:4px 0 0 0;max-height:150px;overflow:auto;font-size:12px;color:#444c56;white-space:pre-wrap;border-left:3px solid var(--b);padding-left:8px}
.r{margin:6px 0 0 12px;padding:4px 10px;border-left:3px solid var(--b);white-space:pre-wrap}.r.me{border-left-color:#1f883d;background:#f0fff4}.r .d b{color:var(--t)}
.av{font-weight:600}.f{margin-top:8px;display:grid;grid-template-columns:170px 1fr auto;gap:6px;align-items:start}
details.dg{margin-top:6px}details.dg summary{cursor:pointer;color:var(--a)}.dgw{overflow:auto;max-height:70vh;border:1px solid var(--b);border-radius:6px;background:#fff;margin-top:4px}.dgw svg{max-width:100%;height:auto}
.x{border:none;background:none;color:#cf222e;cursor:pointer;padding:0 4px}.msg{color:#1a7f37;font-weight:600}.warn{color:#9a6700;font-weight:600}
@media print{header button,.f,.bar,#nf{display:none}header{position:static}}
</style>
<script type="application/json" id="arcalyse-revue-ciblee">${json(data)}<\/script>
</head><body>
<header><h1 id="h-t"></h1><label class="d">${capEsc(T.me)} <input id="me" placeholder="${capEsc(T.mePh)}" style="width:180px"></label>
<button class="p" id="b-save" title="${capEsc(T.saveT)}">${capEsc(T.save)}</button><button id="b-json" title="${capEsc(T.jsonT)}">${capEsc(T.json)}</button><span id="st" class="d"></span></header>
<main><div class="info" id="info"></div><div class="bar"><select id="flt"><option value="all">${capEsc(T.all)}</option><option value="todo">${capEsc(T.todo)}</option></select><span id="cnt" class="d"></span></div>
<div id="list"></div><div class="info" id="nf"></div><p class="d">${capEsc(T.produced)}</p></main>
<script>
(function(){
'use strict';
var T=${json(T)}, AV=${json(avis)}, ST=${json(statuts)}, CR=${json(crits)};
var el=document.getElementById('arcalyse-revue-ciblee'), D=JSON.parse(el.textContent), dirty=false;
function $(i){return document.getElementById(i);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function dt(s){if(!s)return'';var x=new Date(s.length===10?s+'T12:00:00':s);return isNaN(x)?s:(s.length===10?x.toLocaleDateString():x.toLocaleString());}
function find(l,k){for(var i=0;i<l.length;i++)if(l[i].k===k)return l[i];return null;}
function uid(){return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function ink(h){var m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return'#000';var n=parseInt(m[1],16),r=n>>16,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#000':'#fff';}
function me(){return (D.relecteur||'').trim();}
function mark(){dirty=true;$('st').innerHTML='<span class="warn">'+esc(T.unsaved)+'</span>';}
function mine(c){return D.reponses.filter(function(r){return r.cid===c.id&&r.author===me()&&me();}).length;}
function render(){
  // Brouillons en cours (réponses et nouveau commentaire) conservés d'un affichage à l'autre
  var dr={};document.querySelectorAll('#list .c').forEach(function(n){var ta=n.querySelector('.f textarea'),s=n.querySelector('.f select');if(ta&&(ta.value||s.value))dr[n.dataset.c]=[ta.value,s.value];});
  var nf={};['nf-t','nf-x','nf-c','nf-g'].forEach(function(i){if($(i))nf[i]=$(i).value;});
  $('h-t').textContent=D.titre;document.title=D.titre;$('me').value=D.relecteur||'';
  $('info').innerHTML='<table>'+[[T.proj,D.projectName],[T.model,D.model],[T.author,D.auteur],[T.date,dt(D.date)],[T.due,dt(D.echeance)]].filter(function(x){return x[1];}).map(function(x){return '<tr><td class="d">'+esc(x[0])+'</td><td><b>'+esc(x[1])+'</b></td></tr>';}).join('')+'</table>'+
    '<div class="d" style="margin-top:6px">'+esc(T.help)+'</div>'+(D.consignes?'<div class="cons"><b>'+esc(T.cons)+'</b>\\n'+esc(D.consignes)+'</div>':'');
  var f=$('flt').value, l=D.comments.filter(function(c){return f!=='todo'||!mine(c);});
  counts();
  $('list').innerHTML=l.map(card).join('');
  Object.keys(dr).forEach(function(id){var n=document.querySelector('#list .c[data-c="'+id+'"]');if(n){n.querySelector('.f textarea').value=dr[id][0];n.querySelector('.f select').value=dr[id][1];}});
  renderNew();
  Object.keys(nf).forEach(function(i){if($(i))$(i).value=nf[i];});
}
function counts(){$('cnt').textContent=D.comments.length+' '+T.n+' · '+D.reponses.filter(function(r){return r.author===me()&&me();}).length+' '+T.mine+' · '+D.nouveaux.length+' '+T.news;}
function card(c){
  var st=find(ST,c.status)||ST[0], cr=find(CR,c.crit||'')||CR[0], h='<div class="c" data-c="'+esc(c.id)+'" style="--cc:'+(c.crit?cr.c:'#8b949e')+'"><div class="ch"><span class="num">#'+c.num+'</span>'+
    (c.crit?'<span class="crit" style="background:'+cr.c+';color:'+ink(cr.c)+'">'+esc(cr.l)+'</span>':'')+'<span class="d">'+esc(st.l)+'</span><span class="d">'+esc(c.author||'')+' · '+dt(c.created)+'</span></div>'+
    (c.title?'<div class="ti">'+esc(c.title)+'</div>':'')+'<div class="tx">'+esc(c.text)+'</div>';
  (c.targets||[]).forEach(function(t){var e=D.elements[t.id]||{};h+='<div><span class="tg"><b>'+esc(e.couche||t.layer||'')+'</b> '+esc(e.nom||t.name||t.id)+' <span class="d">'+esc(e.type||t.type||'')+(t.field?' · '+esc(T.field)+' '+esc(t.field):'')+(e.absent?' · '+esc(T.gone):'')+'</span></span>'+(e.desc?'<div class="tgd">'+esc(e.desc)+'</div>':'')+'</div>';});
  if(c.diag){var g=D.diagrams[c.diag.uid];h+=g?'<details class="dg"><summary>'+esc(T.diag)+' : '+esc(g.nom)+' <span class="d">'+esc(g.type)+'</span></summary><div class="dgw">'+g.svg+'</div></details>':'<div class="d">'+esc(T.diag)+' : '+esc(c.diag.nom||'')+'</div>';}
  (c.replies||[]).forEach(function(r){h+=rep(r,false);});
  D.reponses.filter(function(r){return r.cid===c.id;}).forEach(function(r){h+=rep(r,true);});
  h+='<div class="f"><select data-av="1">'+AV.map(function(a){return '<option value="'+a.k+'">'+esc(a.l)+'</option>';}).join('')+'</select><textarea rows="2" placeholder="'+esc(T.replyPh)+'"></textarea><button data-rep="1">'+esc(T.reply)+'</button></div></div>';
  return h;
}
function rep(r,nouv){var a=find(AV,r.avis||'');var m=nouv&&r.author===me()&&me();
  return '<div class="r'+(m?' me':'')+'"><div class="d"><b>↩ '+esc(r.author||'?')+'</b> · '+dt(r.date)+(a&&a.k?' · <span class="av">'+esc(a.l)+'</span>':'')+(m?' <button class="x" data-del="'+esc(r.date)+'" title="'+esc(T.del)+'">✕</button>':'')+'</div>'+esc(r.text)+'</div>';}
function renderNew(){
  var opts='<option value="">'+esc(T.general)+'</option>'+Object.keys(D.elements).map(function(id){var e=D.elements[id];return '<option value="'+esc(id)+'">'+esc((e.couche?e.couche+' · ':'')+e.nom+' ('+e.type+')')+'</option>';}).join('');
  $('nf').innerHTML='<b>'+esc(T.newH)+'</b><div class="f" style="grid-template-columns:1fr 1fr"><input id="nf-t" placeholder="'+esc(T.newTitle)+'"><select id="nf-c" title="'+esc(T.crit)+'">'+CR.map(function(c){return '<option value="'+c.k+'">'+esc(c.l)+'</option>';}).join('')+'</select></div>'+
    '<div class="f" style="grid-template-columns:1fr"><textarea id="nf-x" rows="3" placeholder="'+esc(T.newText)+'"></textarea><label class="d">'+esc(T.newTarget)+' <select id="nf-g">'+opts+'</select></label><div><button class="p" id="nf-b">'+esc(T.add)+'</button></div></div>'+
    (D.nouveaux.length?'<div style="margin-top:8px"><b>'+esc(T.newList)+'</b>'+D.nouveaux.map(function(n){var cr=find(CR,n.crit||'')||CR[0];return '<div class="r'+(n.author===me()?' me':'')+'"><div class="d"><b>'+esc(n.author)+'</b> · '+dt(n.created)+(n.crit?' · '+esc(cr.l):'')+(n.targets.length?' · '+esc(n.targets[0].name):'')+(n.author===me()?' <button class="x" data-ndel="'+esc(n.id)+'" title="'+esc(T.del)+'">✕</button>':'')+'</div>'+(n.title?'<b>'+esc(n.title)+'</b>\\n':'')+esc(n.text)+'</div>';}).join('')+'</div>':'');
}
function needMe(){if(me())return true;alert(T.noName);$('me').focus();return false;}
document.addEventListener('click',function(e){
  var t=e.target, c=t.closest('[data-c]');
  if(t.dataset.rep&&c){if(!needMe())return;var f=t.closest('.f'),x=f.querySelector('textarea').value.trim(),a=f.querySelector('select').value;if(!x&&!a){alert(T.empty);return;}
    D.reponses.push({cid:c.dataset.c,author:me(),date:new Date().toISOString(),text:x,avis:a});f.querySelector('textarea').value='';f.querySelector('select').value='';mark();render();return;}
  if(t.dataset.del&&c){if(!confirm(T.delQ))return;D.reponses=D.reponses.filter(function(r){return !(r.cid===c.dataset.c&&r.date===t.dataset.del&&r.author===me());});mark();render();return;}
  if(t.dataset.ndel){D.nouveaux=D.nouveaux.filter(function(n){return n.id!==t.dataset.ndel;});mark();render();return;}
  if(t.id==='nf-b'){if(!needMe())return;var tx=$('nf-x').value.trim();if(!tx){alert(T.empty);return;}var g=$('nf-g').value,e2=D.elements[g],now=new Date().toISOString();
    D.nouveaux.push({id:uid(),title:$('nf-t').value.trim(),text:tx,crit:$('nf-c').value,author:me(),created:now,targets:g?[{id:g,name:e2.nom,type:e2.type,layer:e2.couche,field:''}]:[]});
    $('nf-t').value='';$('nf-x').value='';$('nf-c').value='';$('nf-g').value='';mark();render();return;}
  if(t.id==='b-save'){save();return;}
  if(t.id==='b-json'){exportJson();return;}
});
$('me').addEventListener('input',function(){D.relecteur=this.value;mark();});
$('me').addEventListener('change',counts);
$('flt').addEventListener('change',render);
function dl(txt,type,name){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
function base(){var r=/[^\\p{L}\\p{N}\\-]+/gu;return (D.titre||'revue').replace(r,'_').slice(0,60)+(me()?'-'+me().replace(r,'_'):T.fileSuffix);}
function save(){el.textContent=JSON.stringify(D).replace(/</g,'\\\\u003c');var h='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;dl(h,'text/html',base()+'.html');dirty=false;$('st').innerHTML='<span class="msg">'+esc(T.saved)+'</span>';}
function exportJson(){
  var cs=D.comments.map(function(c){var x=JSON.parse(JSON.stringify(c));x.replies=(x.replies||[]).concat(D.reponses.filter(function(r){return r.cid===c.id;}).map(function(r){return {author:r.author,date:r.date,text:r.text,avis:r.avis};}));return x;});
  D.nouveaux.forEach(function(n){cs.push({id:n.id,num:0,title:n.title,text:n.text,crit:n.crit,cat:'',status:'open',author:n.author,created:n.created,updated:n.created,due:'',assignees:[],tags:[],targets:n.targets,diag:null,replies:[],project:D.project});});
  dl(JSON.stringify({type:'arcalyse-revue',version:1,date:new Date().toISOString(),model:D.model,project:D.project,projectName:D.projectName,people:[me()].filter(Boolean),comments:cs,cible:D.id},null,1),'application/json',base()+'.json');
}
window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue='';}});
render();
})();
<\/script></body></html>`;
}

/**
 * Convertit une revue ciblée relue (page .html ou ses données) en revue importable (type « arcalyse-revue ») :
 * commentaires d'origine complétés des réponses des relecteurs, nouveaux commentaires (cibles reliées au modèle chargé).
 * @param {object} d - Données « arcalyse-revue-ciblee »
 * @returns {object} revue {type, project, people, comments}
 */
function capRevCibleeVersRevue(d){
  const people=new Set();
  const cs=(d.comments||[]).map(c=>{ const x=JSON.parse(JSON.stringify(c)), cur=capRevGet(c.id);
    if(cur) (cur.targets||[]).forEach(t=>{ const y=(x.targets||[]).find(z=>z.id===t.id&&z.field===t.field); if(y&&t.snap) y.snap=t.snap; });   // empreintes d'origine conservées
    x.replies=(x.replies||[]).concat((d.reponses||[]).filter(r=>r.cid===c.id).map(r=>{ people.add(r.author); return {author:r.author, date:r.date, text:r.text||'', avis:r.avis||''}; }));
    return x; });
  (d.nouveaux||[]).forEach(n=>{ people.add(n.author);
    cs.push({id:n.id, num:0, title:n.title||'', text:n.text||'', crit:n.crit||'', cat:'', status:'open', author:n.author||'', created:n.created, updated:n.created, due:'', assignees:[], tags:[],
      targets:(n.targets||[]).map(t=>capRevTarget(t.id, t.field)||t), diag:null, replies:[], project:d.project||''}); });
  return {type:'arcalyse-revue', version:1, date:d.date, model:d.model, project:d.project, projectName:d.projectName, people:[...people].filter(Boolean), comments:cs};
}

/**
 * Lit les données d'une page de revue ciblée (.html relue par un relecteur).
 * @param {string} texte - Code HTML
 * @returns {object|null} données « arcalyse-revue-ciblee », ou null
 */
function capRevCibleeLire(texte){
  try{
    const b=new DOMParser().parseFromString(texte,'text/html').getElementById('arcalyse-revue-ciblee');
    const d=b&&JSON.parse(b.textContent);
    return d&&d.type==='arcalyse-revue-ciblee'&&Array.isArray(d.comments)?d:null;
  }catch(e){ return null; }
}
