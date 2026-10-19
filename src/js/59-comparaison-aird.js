/* ═══════════════════════════════════════════════════════════════════════
   ⚖ COMPARAISON DES DIAGRAMMES (.aird) — version légère
   ───────────────────────────────────────────────────────────────────────
   Onglet 🔲 Diagrammes de 🔬 Analyses › ⚖ Comparaison de versions. Le .aird chargé est comparé à un .aird de
   référence (le précédent, gardé automatiquement quand le .aird est relu ou remplacé après une 🔄 mise à jour,
   ou choisi à la main) : diagrammes ajoutés, supprimés, renommés, éléments du modèle ajoutés ou retirés d'un
   diagramme, diagrammes modifiés seulement en mise en page ou en style. Sans référence : diagrammes qui montrent
   des éléments absents du modèle, et diagrammes touchés par les changements du modèle (⚖ Modèle).
   Lecture par expressions régulières (sans la visionneuse) : descripteurs « ownedRepresentationDescriptors »
   (uid, nom, repPath, type, élément représenté) et représentations de premier niveau (références « fichier#id »).
   Positions, tailles et styles ne sont pas comparés un par un (Capella les réécrit à chaque ouverture).
   ═══════════════════════════════════════════════════════════════════════ */

/** État : .aird de référence (texte, nom, choisi à la main ?), onglet de la comparaison, filtres, détails ouverts, analyses mémorisées. */
const _capDg = { ref:'', refNom:'', manuel:false, vue:'modele', q:'', filtre:'chg', ouverts:new Set(), memo:[], cache:null };

/**
 * Analyse un .aird : un enregistrement par diagramme (descripteur), avec les éléments du modèle qu'il montre.
 * Résultat mémorisé (deux derniers textes analysés).
 * @param {string} texte - Contenu du .aird
 * @returns {Map<string,{uid:string, nom:string, type:string, cible:string, ids:Set<string>, corps:string}>} uid du descripteur → diagramme
 */
function capDgAnalyser(texte){
  const m=_capDg.memo.find(x=>x.t===texte); if(m) return m.r;
  const att=(a,k)=>{ const r=a.match(new RegExp('\\s'+k+'="([^"]*)"')); return r?r[1]:''; };
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
  const descs=[], re=/<ownedRepresentationDescriptors\b((?:[^>"]|"[^"]*")*?)(\/>|>([\s\S]*?)<\/ownedRepresentationDescriptors>)/g;
  let x;
  while((x=re.exec(texte))){
    const corps=x[3]||'', ty=corps.match(/@ownedRepresentations\[name='([^']+)'\]/), ci=corps.match(/<target\b[^>]*href="[^"#]*#([^"]+)"/);
    descs.push({uid:att(x[1],'uid'), nom:capDiagTexte(att(x[1],'name'))||att(x[1],'name'), rep:att(x[1],'repPath').replace(/^#/,''), type:ty?dec(ty[1]):'', cible:ci?ci[1]:''});
  }
  // Représentation de chaque descripteur : élément portant l'uid du repPath, jusqu'à sa balise fermante
  // (les représentations ne s'imbriquent pas dans un élément de même balise)
  const r=new Map();
  descs.forEach(d=>{
    if(!d.rep) return;
    const i=texte.indexOf('uid="'+d.rep+'"'); if(i<0) return;
    const j=texte.lastIndexOf('<',i), tag=(texte.slice(j+1).match(/^[\w.:-]+/)||[''])[0], gt=texte.indexOf('>',i);
    if(!tag||gt<0) return;
    let e=texte[gt-1]==='/'?gt+1:texte.indexOf('</'+tag+'>',gt);
    e=e<0?texte.length:(texte[gt-1]==='/'?e:e+tag.length+3);
    const corps=texte.slice(j,e), ids=new Set(), rr=/<(?:target|semanticElements)\b[^>]*href="(?!platform:)[^"#]*#([^"]+)"/g;
    let y; while((y=rr.exec(corps))) ids.add(y[1]);
    r.set(d.uid,{uid:d.uid, nom:d.nom, type:d.type, cible:d.cible, ids, corps});
  });
  descs.forEach(d=>{ if(d.uid&&!r.has(d.uid)) r.set(d.uid,{uid:d.uid, nom:d.nom, type:d.type, cible:d.cible, ids:new Set(), corps:''}); });
  _capDg.memo=[{t:texte, r}, ..._capDg.memo].slice(0,2);
  return r;
}

/**
 * Le .aird chargé va être remplacé par une autre version (relu après une mise à jour, ou choisi) : l'ancien devient
 * la référence de la comparaison, sauf si une référence a été choisie à la main.
 * @param {string} texte - .aird précédent
 * @param {string} nom - Son nom de fichier
 */
function capDgReferenceAuto(texte, nom){
  if(_capDg.manuel||!texte) return;
  Object.assign(_capDg,{ref:texte, refNom:_L(`${nom} — avant ${capWatchTime(Date.now())}`), cache:null});
}
/** Un autre modèle est ouvert : la référence ne lui correspond plus. */
function capDgReset(){ Object.assign(_capDg,{ref:'', refNom:'', manuel:false, cache:null, memo:[]}); _capDg.ouverts.clear(); }

/** @returns {Set<string>|null} éléments ajoutés, supprimés ou modifiés selon ⚖ Modèle (null sans version comparée) */
function capDgChangesModele(){
  if(!capDiffDoc||!capLoaded) return null;
  if(!_capAnaCache.diff||_capAnaCache.diffSwap!==capDiffSwap){
    const cIdx=capDiffIndex(cap_xmlDoc), oIdx=capDiffIndex(capDiffDoc), A=capDiffSwap?cIdx:oIdx, B=capDiffSwap?oIdx:cIdx;
    _capAnaCache.diff=capDiffCompute(A,B); _capAnaCache.diffIdx={A,B}; _capAnaCache.diffSwap=capDiffSwap;
  }
  return new Set(_capAnaCache.diff.map(d=>d.e.id));
}
/**
 * Nom et type d'un élément : modèle chargé, sinon version comparée (⚖ Modèle).
 * @param {string} id - Élément
 * @returns {{nom:string, type:string, couche:string, ici:boolean}}
 */
function capDgEl(id){
  const e=capLoaded&&capGetElementById_(id);
  if(e) return {nom:e.attrs.name||e.typeName, type:(CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName, couche:e.layer||'', ici:true};
  const ix=_capAnaCache.diffIdx, o=ix&&(ix.A[id]||ix.B[id]);
  return o?{nom:o.name||o.type, type:o.type, couche:o.layer||'', ici:false}:{nom:id.slice(0,13)+'…', type:'', couche:'', ici:false};
}

/**
 * Compare le .aird chargé à la référence et au modèle.
 * @returns {{ref:boolean, rows:object[]}|null} lignes {uid, nom, ancien, type, couche, etats:Set, plus, moins, orph, touch} (null sans .aird ni référence)
 */
function capDgComparer(){
  const a=_capDiag.texteAird, b=_capDg.ref, chg=capDgChangesModele(), c=_capDg.cache;
  if(c&&c.a===a&&c.b===b&&c.doc===cap_xmlDoc&&c.diff===_capAnaCache.diff) return c.res;
  if(!a&&!b) return null;
  const N=a?capDgAnalyser(a):new Map(), O=b?capDgAnalyser(b):null, rows=[];
  // Couche : celle de la visionneuse (diagramme du .aird chargé), sinon celle de l'élément représenté
  const vc=new Map((a?capHomeReps():[]).map(x=>[x.uid,x.couche]));
  const couche=d=>{ if(vc.get(d.uid)) return vc.get(d.uid); const e=d.cible&&capDgEl(d.cible); return e?e.couche:''; };
  N.forEach(n=>{
    const r={uid:n.uid, nom:n.nom, ancien:'', type:n.type, couche:couche(n), etats:new Set(), plus:[], moins:[], ids:n.ids,
      orph:capLoaded?[...n.ids].filter(id=>!capGetElementById_(id)):[], touch:chg?[...n.ids].filter(id=>chg.has(id)):[]};
    const o=O&&O.get(n.uid);
    if(O&&!o) r.etats.add('add');
    if(o){
      if(o.nom!==n.nom){ r.etats.add('ren'); r.ancien=o.nom; }
      r.plus=[...n.ids].filter(id=>!o.ids.has(id)); r.moins=[...o.ids].filter(id=>!n.ids.has(id));
      if(r.plus.length||r.moins.length) r.etats.add('cont');
      else if(o.corps!==n.corps) r.etats.add('style');
    }
    if(r.orph.length) r.etats.add('orph');
    if(r.touch.length) r.etats.add('touch');
    rows.push(r);
  });
  if(O) O.forEach(o=>{ if(!N.has(o.uid)) rows.push({uid:o.uid, nom:o.nom, ancien:'', type:o.type, couche:couche(o), etats:new Set(['del']), plus:[], moins:[...o.ids], ids:o.ids, orph:[], touch:[]}); });
  rows.sort((x,y)=>capDiagRang(x.couche)-capDiagRang(y.couche)||x.nom.localeCompare(y.nom));
  const res={ref:!!O, cur:!!a, rows};
  _capDg.cache={a, b, doc:cap_xmlDoc, diff:_capAnaCache.diff, res};
  return res;
}

/** Onglets de ⚖ Comparaison de versions : 🔷 Modèle (rapport) / 🔲 Diagrammes. @returns {string} HTML */
function capDgOnglets(){
  const b=(k,l,t)=>`<button class="phl-toggle-btn${_capDg.vue===k?' active':''}" data-dgv="${k}" title="${t}">${l}</button>`;
  return `<div class="dg-tabs"><span class="tb-grp">${b('modele',_L('🔷 Modèle'),_L('Différences entre les deux versions du .capella'))}`+
    b('diag',_L('🔲 Diagrammes'),_L('Diagrammes ajoutés, supprimés, renommés ou modifiés par rapport à un .aird de référence ; diagrammes touchés par les changements du modèle'))+`</span></div>`;
}
/** @returns {{k:string, l:string, t:string, c:string}[]} états d'un diagramme (filtres, pastilles) */
function capDgEtats(){ return [
  {k:'add', l:_L('➕ Nouveaux'), t:_L('Diagrammes absents du .aird de référence'), c:'var(--c-ok,#3fb950)'},
  {k:'del', l:_L('➖ Supprimés'), t:_L('Diagrammes du .aird de référence absents du .aird chargé'), c:'var(--c-err,#f85149)'},
  {k:'ren', l:_L('✎ Renommés'), t:_L('Nom du diagramme changé'), c:'#58a6ff'},
  {k:'cont', l:_L('🧩 Contenu modifié'), t:_L('Éléments du modèle ajoutés au diagramme ou retirés'), c:'var(--c-warn,#e3b341)'},
  {k:'style', l:_L('🎨 Mise en page / style'), t:_L('Mêmes éléments, mais positions, tailles, styles ou filtres modifiés'), c:'#a78bfa'},
  {k:'orph', l:_L('⚠ Éléments absents du modèle'), t:_L('Le diagramme montre des éléments qui n\'existent pas dans le modèle chargé (.aird et .capella de versions différentes ?)'), c:'var(--c-err,#f85149)'},
  {k:'touch', l:_L('🔷 Touchés par le modèle'), t:_L('Le diagramme montre des éléments ajoutés, supprimés ou modifiés entre les deux versions du modèle (onglet 🔷 Modèle)'), c:'#f0883e'} ]; }

/**
 * Onglet 🔲 Diagrammes de ⚖ Comparaison de versions.
 * @param {HTMLElement} host - Conteneur
 */
function capDgRender(host){
  const esc=capEsc, R=capDgComparer(), E=capDgEtats(), u=_capDg;
  let h=`<div class="dg-head"><div class="ana-diff-file"><span class="ana-dim">${_L('.aird de référence (ancien)')}</span><b>${esc(u.refNom||'—')}</b></div>`+
    `<div class="ana-diff-file"><span class="ana-dim">${_L('.aird chargé (nouveau)')}</span><b>${esc(_capDiag.nomAird||'—')}</b></div>`+
    `<label class="cw-btn ana-diff-load">${u.ref?_L('📂 Changer le .aird de référence…'):_L('📂 Charger un .aird de référence…')}<input type="file" id="dg-ref"${capIsMobile()?'':' accept=".aird"'} style="display:none"></label>`+
    (u.ref?`<button class="cap-lf-btn" data-dg="noref" title="${_L('Ne plus comparer à un .aird de référence')}">✕</button>`:'')+
    (_capDiag.texteAird?'':`<button class="cap-lf-btn" data-dg="aird">${_L('📂 Ouvrir le .aird…')}</button>`)+`</div>`;
  if(!R){ host.innerHTML=h+`<div class="phl-empty">${_L('Ouvrez le .aird du projet (🔲 Diagrammes Capella) : ses diagrammes sont comparés au modèle chargé et, avec un .aird de référence, à une version précédente.<br>La référence est gardée automatiquement quand le .aird est relu ou remplacé après une 🔄 mise à jour du modèle ; vous pouvez aussi la choisir.')}</div>`; capDgWire(host); return; }
  if(!R.ref) h+=`<div class="crv-help">${_L('Pas de .aird de référence : seuls les liens avec le modèle sont vérifiés. Chargez le .aird d\'une version précédente pour voir les diagrammes ajoutés, supprimés, renommés ou modifiés.')}</div>`;
  const n=k=>R.rows.filter(r=>r.etats.has(k)).length, chgs=R.rows.filter(r=>r.etats.size).length;
  h+=`<div class="hm-chips dg-chips"><span class="hm-stat"><b>${R.rows.length}</b> ${_L('diagramme(s)')}</span>`+
    E.filter(e=>(R.ref||['orph','touch'].includes(e.k))&&n(e.k)).map(e=>`<span class="hm-stat dg-f${u.filtre===e.k?' on':''}" data-f="${e.k}" title="${e.t}" style="color:${e.c}"><b>${n(e.k)}</b> ${e.l}</span>`).join('')+
    (R.ref?`<span class="hm-stat ana-dim">${_L(`${R.rows.length-chgs} inchangé(s)`)}</span>`:'')+`</div>`;
  const opt=(v,l)=>`<option value="${v}"${u.filtre===v?' selected':''}>${l}</option>`;
  h+=`<div class="crv-filters"><select id="dg-filtre">${opt('chg',_L('Diagrammes à regarder'))}${opt('all',_L('Tous les diagrammes'))}${E.map(e=>opt(e.k,e.l)).join('')}</select>`+
    `<input id="dg-q" class="phl-filter-input" placeholder="${_L('🔍 Diagramme…')}" value="${esc(u.q)}" style="max-width:240px">`+
    `<button class="phl-export-btn" data-dg="csv" style="margin-left:auto">${_L('⬇ CSV')}</button></div>`;
  const norm=s=>String(s||'').toLowerCase(), q=norm(u.q);
  const l=R.rows.filter(r=>(u.filtre==='all'||(u.filtre==='chg'?r.etats.size:r.etats.has(u.filtre)))&&(!q||norm(r.nom+' '+r.ancien+' '+r.type).includes(q)));
  const ouvrable=new Set(capHomeReps().map(r=>r.uid));
  const puce=k=>{ const e=E.find(x=>x.k===k); return `<span class="dg-b" style="color:${e.c};border-color:${e.c}" title="${e.t}">${e.l}</span>`; };
  const els=(t,ids)=>ids.length?`<div class="dg-el"><b>${t}</b> (${ids.length})<div class="hm-chips">${ids.slice(0,300).map(id=>{ const e=capDgEl(id), lv=CAP_LAYERS[e.couche]||{color:'#8b949e'};
    return `<span class="hm-chip${e.ici?'':' hm-miss'}"${e.ici?` data-open="${esc(id)}"`:''} title="${esc(e.type)}">${e.ici?capIco(id,13):''}<span style="color:${lv.color};font-size:9px;font-weight:700">${esc(e.couche)}</span> ${esc(e.nom)}</span>`; }).join('')}${ids.length>300?' …':''}</div></div>`:'';
  h+=`<table class="ana-table dg-t"><thead><tr><th></th><th>${_L('Couche')}</th><th>${_L('Diagramme')}</th><th>${_L('Type')}</th><th>${_L('État')}</th><th title="${_L('Éléments du modèle ajoutés au diagramme / retirés')}">${_L('Éléments + / −')}</th><th></th></tr></thead><tbody>`+
    (l.length?l.map(r=>{ const lv=capDiagCouche(r.couche), o=u.ouverts.has(r.uid), det=r.plus.length||r.moins.length||r.orph.length||r.touch.length;
      return `<tr data-uid="${esc(r.uid)}"><td>${det?`<span class="dg-tog" data-dg="tog">${o?'▾':'▸'}</span>`:''}</td><td style="color:${lv.color};font-weight:700">${esc(r.couche)}</td>`+
        `<td><b>${esc(r.nom)}</b>${r.ancien?`<div class="ana-dim">${_L('avant :')} ${esc(r.ancien)}</div>`:''}</td><td class="ana-dim">${esc(r.type)}</td>`+
        `<td>${[...r.etats].map(puce).join(' ')||`<span class="ana-dim">${R.ref?_L('inchangé'):'—'}</span>`}</td>`+
        `<td>${r.plus.length?`<span style="color:var(--c-ok,#3fb950)">+${r.plus.length}</span> `:''}${r.moins.length?`<span style="color:var(--c-err,#f85149)">−${r.moins.length}</span>`:''}</td>`+
        `<td>${ouvrable.has(r.uid)?`<button class="cap-lf-btn" data-dg="open" title="${_L('Ouvrir le diagramme')}">🔲</button>`:''}</td></tr>`+
        (o?`<tr class="dg-det"><td></td><td colspan="6">${els(_L('➕ Ajoutés au diagramme'),r.plus)}${els(_L('➖ Retirés du diagramme'),r.moins)}${els(_L('⚠ Absents du modèle chargé'),r.orph)}${els(_L('🔷 Ajoutés, supprimés ou modifiés dans le modèle'),r.touch)}</td></tr>`:''); }).join('')
      :`<tr><td colspan="7" class="phl-empty">${_L('Aucun diagramme ne correspond.')}</td></tr>`)+`</tbody></table>`;
  host.innerHTML=h;
  capDgWire(host);
}

/**
 * Branche (une fois) les commandes de l'onglet : référence, filtres, détails, ouverture, CSV.
 * @param {HTMLElement} host - Conteneur
 */
function capDgWire(host){
  if(host._dg) return; host._dg=true;
  host.addEventListener('click',e=>{
    const t=e.target, f=t.closest('[data-f]');
    if(f){ _capDg.filtre=_capDg.filtre===f.dataset.f?'chg':f.dataset.f; capDgRender(host); return; }
    const op=t.closest('[data-open]'); if(op){ capOpenDetailById(op.dataset.open); return; }
    const a=t.closest('[data-dg]'); if(!a) return;
    const uid=(t.closest('[data-uid]')||{dataset:{}}).dataset.uid;
    switch(a.dataset.dg){
      case 'tog': if(_capDg.ouverts.has(uid)) _capDg.ouverts.delete(uid); else _capDg.ouverts.add(uid); capDgRender(host); return;
      case 'open': capDiagOpen(uid); return;
      case 'aird': capDiagPickAird(); return;
      case 'noref': Object.assign(_capDg,{ref:'', refNom:'', manuel:false, cache:null}); capDgRender(host); return;
      case 'csv': capDgCsv(); return;
    }
  });
  host.addEventListener('change',e=>{
    if(e.target.id==='dg-filtre'){ _capDg.filtre=e.target.value; capDgRender(host); return; }
    if(e.target.id==='dg-ref'){ const f=e.target.files[0]; if(!f) return;
      f.text().then(t=>{ if(!/ownedRepresentationDescriptors/.test(t)){ capAlert(_L('Ce fichier ne contient aucun diagramme Capella (.aird attendu).'),{level:'err'}); return; }
        Object.assign(_capDg,{ref:t, refNom:f.name, manuel:true, cache:null}); capDgRender(host); }); }
  });
  host.addEventListener('input',e=>{ if(e.target.id==='dg-q'){ _capDg.q=e.target.value; const p=e.target.selectionStart; capDgRender(host);
    const q=host.querySelector('#dg-q'); if(q){ q.focus(); q.setSelectionRange(p,p); } } });
}

/** Télécharge la comparaison des diagrammes (une ligne par diagramme). */
function capDgCsv(){
  const R=capDgComparer(); if(!R) return;
  const E=capDgEtats(), noms=ids=>ids.map(id=>capDgEl(id).nom).join(' | ');
  capCsvDownload(_L('comparaison-diagrammes.csv'), [_L('Couche'),_L('Diagramme'),_L('Ancien nom'),_L('Type'),_L('État'),_L('Ajoutés au diagramme'),_L('Retirés du diagramme'),_L('Absents du modèle'),_L('Touchés par le modèle'),'uid'],
    R.rows.map(r=>[r.couche, r.nom, r.ancien, r.type, [...r.etats].map(k=>E.find(e=>e.k===k).l).join(', '), noms(r.plus), noms(r.moins), noms(r.orph), noms(r.touch), r.uid]));
}

/**
 * Indicateurs du tableau de bord sur les diagrammes (.aird chargé) : nombre, par couche, liens avec le modèle,
 * changements depuis le .aird de référence. Valeur null sans .aird (ou sans référence).
 * @param {function} add - Ajout au catalogue (capDashCatalog)
 * @param {function} LC - Couleur d'une couche
 */
function capDgDashCatalog(add, LC){
  const R=()=>typeof _capDiag!=='undefined'&&_capDiag.texteAird?capDgComparer():null, cur=()=>{ const r=R(); return r?r.rows.filter(x=>!x.etats.has('del')):null; };
  add(_L('Diagrammes'),'dg.n',_L('Diagrammes — nombre'),'n',()=>{ const l=cur(); return l?{n:l.length, sub:_capDiag.nomAird}:null; });
  add(_L('Diagrammes'),'dg.layer',_L('Diagrammes — par couche'),'series',()=>{ const l=cur(); if(!l) return null;
    return {order:'natural', cats:[...CAP_DIAG_COUCHES,''].map(k=>({l:k||_L('Autres'), v:l.filter(x=>(x.couche||'')===k).length, c:LC(k)})).filter(x=>x.v)}; });
  add(_L('Diagrammes'),'dg.orph',_L('Diagrammes — montrant des éléments absents du modèle'),'n',()=>{ const l=cur(); return l?{n:l.filter(x=>x.orph.length).length, sub:_L(`${new Set([].concat(...l.map(x=>x.orph))).size} élément(s) absent(s)`)}:null; },
    _L('Diagrammes du .aird chargé qui montrent des éléments inexistants dans le modèle (versions différentes ?)'));
  add(_L('Diagrammes'),'dg.cmp',_L('Diagrammes — changements depuis le .aird de référence'),'series',()=>{ const r=R(); if(!r||!r.ref) return null;
    return {cats:capDgEtats().filter(e=>!['orph','touch'].includes(e.k)).map(e=>({l:e.l, v:r.rows.filter(x=>x.etats.has(e.k)).length})).filter(x=>x.v)}; },
    _L('Comparaison avec le .aird de référence (⚖ Comparaison de versions › 🔲 Diagrammes)'));
}
