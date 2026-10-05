/* ══ ☰ BARRE DES VUES CAPELLA ══════════════════════════════════════════════════════
 * La barre du haut regroupe les vues dans des menus déroulants (🧭 Explorateur, 📡 Flux & interfaces,
 * 🔬 Analyses) ; n'importe quelle vue ou sous-vue peut être épinglée (📌) en bouton direct.
 * Le menu ☰ (ou Ctrl+K) permet de chercher une vue et de régler la barre : menus affichés, épingles,
 * retour aux réglages par défaut. Réglage enregistré dans la page (bloc JSON cap-toolbar, repris par la 💾 Page HTML).
 */
/** Catalogue des vues : k = clé (vue capShowView, ou « ana:… » pour une sous-vue de 🔬 Analyses), l = libellé,
 * g = groupe (menu déroulant ; '' = vue sans menu), t = info-bulle. */
var CAP_NAV_ITEMS=[
  {k:'tree',      l:'🌳 Arborescence',      g:'explore'},
  {k:'cards',     l:'▦ Cartes',             g:'explore'},
  {k:'table',     l:'📋 Tableau',           g:'explore'},
  {k:'index',     l:'📖 Index des types',   g:'explore'},
  {k:'links',     l:'🔗 Liens',             g:'explore', t:'Relations entre les éléments du modèle'},
  {k:'chains',    l:'⚡ Chaînes',           g:'flux'},
  {k:'compex',    l:'🔀 Component Exchange', g:'flux'},
  {k:'physlink',  l:'🔌 Physical Link',     g:'flux'},
  {k:'ports',     l:'🧩 Ports',             g:'flux', t:'Traçabilité Function Port ↔ Component Port ↔ Physical Port'},
  {k:'functions', l:'ƒ Fonctions',          g:'',     t:'Fonctions : hiérarchie, tableau, traçabilité, métriques, contrôles, dossier'},
  {k:'ana:trace', l:'🧬 Traçabilité inter-couches', g:'ana'},
  {k:'ana:caps',  l:'🎯 Capacités & missions',     g:'ana'},
  {k:'ana:states',l:'🔁 Modes & états',            g:'ana'},
  {k:'ana:diff',  l:'⚖ Comparaison de versions',  g:'ana'},
  {k:'ana:reqs',  l:'📑 Exigences',               g:'ana'},
  {k:'ana:pvmt',  l:'🏷 Propriétés',              g:'ana'},
  {k:'ana:data',  l:'🗃 Données & interfaces',     g:'ana'},
  {k:'ana:cts',   l:'⛓ Contraintes',              g:'ana'},
  {k:'dashboard', l:'📐 Tableau de bord',   g:'',     t:'Tableaux de bord personnalisés : indicateurs, graphiques, tableaux'}
];
/** Menus déroulants de la barre, dans l'ordre d'affichage (id = identifiant du bouton). */
var CAP_NAV_GROUPS=[
  {g:'explore', id:'cap-v-elements', l:'🧭 Explorateur',       t:'Explorer le modèle : arborescence, cartes, tableau, index des types, liens'},
  {g:'flux',    id:'cap-v-flux',     l:'📡 Flux & interfaces', t:'Chaînes, Component Exchange, Physical Link, ports'},
  {g:'',        id:'',               l:'',                     t:''},   // place des vues sans menu (ƒ Fonctions)
  {g:'ana',     id:'cap-v-analyses', l:'🔬 Analyses',          t:'Traçabilité inter-couches, capacités & missions, modes & états, comparaison de versions, exigences, propriétés, données & interfaces, contraintes'}
];
/** Réglage par défaut : tous les menus affichés, ⚡ Chaînes, ƒ Fonctions et 📐 Tableau de bord en boutons directs. */
var CAP_NAV_DEFAULT={groups:{explore:true, flux:true, ana:true}, pins:['chains','functions','dashboard']};
var _capNav=(()=>{ try{ const el=document.getElementById('cap-toolbar'); const o=el&&JSON.parse(el.textContent);
  if(o&&o.groups&&Array.isArray(o.pins)) return o; }catch(e){} return JSON.parse(JSON.stringify(CAP_NAV_DEFAULT)); })();
var _capNavLast={explore:'cards', flux:'chains', ana:'ana:trace'};   // dernière sous-vue ouverte par menu

/** Enregistre le réglage de la barre dans la page (bloc JSON repris par la 💾 Page HTML). */
function capNavSave(){
  let el=document.getElementById('cap-toolbar');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-toolbar'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(_capNav).replace(/</g,'\\u003c');
}

/** Clé de la vue Capella affichée (« ana:… » pour une sous-vue de 🔬 Analyses).
 * @param {boolean} [force] - Ignorer le mode courant (appel pendant une bascule vers le mode capella)
 * @returns {string} Clé, ou '' hors du mode capella
 */
function capNavCurKey(force){
  if(!force&&currentMode!=='capella') return '';
  return capCurrentView==='analyses'?'ana:'+capAnaSub:capCurrentView;
}

/** Ouvre une vue du catalogue (ou Relation Map / Table View pour les clés @rm, @table).
 * @param {string} k - Clé de la vue
 */
function capNavOpen(k){
  capNavClose();
  if(k==='@rm'||k==='@table'){ document.getElementById(k==='@rm'?'mode-rm':'mode-table')?.click(); return; }
  if(k.startsWith('ana:')){ capAnaSub=k.slice(4); capShowView('analyses'); }
  else capShowView(k);
}

/** Ouvre la vue d'un menu (clic sur son nom) : la dernière vue non épinglée utilisée, sinon la première non épinglée.
 * @param {string} g - Groupe ('explore'|'flux'|'ana')
 */
function capNavGroupOpen(g){
  const items=CAP_NAV_ITEMS.filter(i=>i.g===g), free=items.filter(i=>!_capNav.pins.includes(i.k));
  const last=_capNavLast[g];
  capNavOpen(free.some(i=>i.k===last)?last:(free[0]||items[0]).k);
}

/** Onglets du menu 📡 Flux & interfaces (comme ceux de 🔬 Analyses) : vues du menu non épinglées,
 * affichés quand la vue courante en fait partie.
 * @param {string} cur - Clé de la vue affichée
 */
function capNavFluxTabs(cur){
  const bar=document.getElementById('cap-flux-tabs'); if(!bar) return;
  const free=CAP_NAV_ITEMS.filter(i=>i.g==='flux'&&!_capNav.pins.includes(i.k));
  const show=free.some(i=>i.k===cur);
  bar.style.display=show?'flex':'none';
  if(!show) return;
  bar.innerHTML=`<span class="tb-grp">${free.map(i=>`<button class="cap-lf-btn${i.k===cur?' active':''}" data-open="${i.k}" title="${i.t||''}">${i.l}</button>`).join('')}</span>`;
}

/** Reconstruit les boutons de la barre des vues selon le réglage (menus, épingles). */
function capNavRender(){
  const box=document.getElementById('cap-tb-views'); if(!box) return;
  const pin=k=>{ const it=CAP_NAV_ITEMS.find(i=>i.k===k);
    return `<div class="tbtn" id="cap-v-${k.replace(':','-')}" data-open="${k}" title="${it.t||''}">${it.l}</div>`; };
  let h='';
  CAP_NAV_GROUPS.forEach(G=>{
    if(G.g&&_capNav.groups[G.g]!==false)
      h+=`<div class="tbtn cap-nav-grp" id="${G.id}" data-g="${G.g}" title="${G.t}">${G.l}<span class="cap-nav-arr" data-dd="${G.g}" title="Choisir une vue">▾</span></div>`;
    CAP_NAV_ITEMS.filter(i=>i.g===G.g&&_capNav.pins.includes(i.k)).forEach(i=>h+=pin(i.k));
  });
  // Vues épinglées sans menu placées après le dernier groupe (📐 Tableau de bord)
  h=h.replace(pin('dashboard'),'');
  if(_capNav.pins.includes('dashboard')) h+=pin('dashboard');
  h+=`<div class="tbtn" id="cap-nav-cfg" title="Toutes les vues, recherche (Ctrl+K) et réglage de la barre">☰</div>`;
  box.innerHTML=h;
  capNavSync();
}

/** Met à jour l'état actif des boutons de la barre (vue affichée, dernière sous-vue de chaque menu).
 * @param {boolean} [force] - Ignorer le mode courant (voir capNavCurKey)
 */
function capNavSync(force){
  if(typeof _capNav==='undefined') return;   // appelé avant le chargement de ce module
  const cur=capNavCurKey(force), it=CAP_NAV_ITEMS.find(i=>i.k===cur);
  if(it&&it.g) _capNavLast[it.g]=cur;
  document.querySelectorAll('#cap-tb-views [data-open]').forEach(b=>b.classList.toggle('active',b.dataset.open===cur));
  document.querySelectorAll('#cap-tb-views .cap-nav-grp').forEach(b=>{
    const on=!!it&&it.g===b.dataset.g&&!_capNav.pins.includes(cur);
    b.classList.toggle('active',on);
    const G=CAP_NAV_GROUPS.find(x=>x.g===b.dataset.g);
    b.title=(it&&it.g===b.dataset.g?'Vue affichée : '+it.l+'\n':'')+G.t;
  });
  capNavFluxTabs(cur);
}

/** Ferme le menu déroulant de la barre des vues. */
function capNavClose(){
  const dd=document.getElementById('cap-nav-dd'); if(dd) dd.style.display='none';
}

/** Ligne d'une vue dans un menu : ouverture au clic, 📌 pour l'épingler en bouton direct.
 * @param {Object} it - Élément de CAP_NAV_ITEMS
 * @param {string} [extra] - Texte complémentaire (groupe, en recherche)
 * @returns {string} HTML
 */
function capNavRow(it, extra){
  const on=_capNav.pins.includes(it.k), cur=capNavCurKey()===it.k;
  return `<div class="ctx-i cap-nav-it${cur?' cur':''}" data-open="${it.k}" title="${it.t||''}"><span>${it.l}${extra?` <span class="cap-nav-g">${extra}</span>`:''}</span>`+
    (it.k[0]==='@'?'':`<span class="cap-nav-pin${on?' on':''}" data-pin="${it.k}" title="${on?'Retirer de la barre':'Épingler dans la barre (bouton direct)'}">📌</span>`)+`</div>`;
}

/** Ouvre le menu déroulant d'un groupe, ou le menu ☰ (toutes les vues, recherche, réglage).
 * @param {string} g - Groupe ('explore'|'flux'|'ana') ou '☰'
 * @param {HTMLElement} anchor - Bouton sous lequel placer le menu
 */
function capNavMenu(g, anchor){
  let dd=document.getElementById('cap-nav-dd');
  if(!dd){
    dd=document.createElement('div'); dd.id='cap-nav-dd'; document.body.appendChild(dd);
    dd.addEventListener('click',e=>{
      const p=e.target.closest('[data-pin]');
      if(p){ e.stopPropagation(); const k=p.dataset.pin, i=_capNav.pins.indexOf(k);
        if(i>=0) _capNav.pins.splice(i,1); else _capNav.pins.push(k);
        capNavSave(); capNavRender(); capNavMenuFill(); return; }
      const o=e.target.closest('[data-open]'); if(o){ capNavOpen(o.dataset.open); return; }
      const th=e.target.closest('[data-thm]');
      if(th){ capNavClose(); const sel=document.getElementById('theme-sel'); sel.value=th.dataset.thm; sel.dispatchEvent(new Event('change')); return; }
      const a=e.target.closest('[data-act]');
      if(a){ capNavClose(); ({open:()=>capPickCapellaFile(), save:()=>capSavePageDirect(false), saveas:()=>capSavePageDirect(true),
        page:()=>capSaveFullPage(), themeedit:()=>capThemeEditor(),
        help:()=>openHelpModal(), tour:()=>capTourStart(), tourview:()=>capTourStartView()})[a.dataset.act](); return; }
      if(e.target.closest('[data-reset]')){ _capNav=JSON.parse(JSON.stringify(CAP_NAV_DEFAULT)); capNavSave(); capNavRender(); capNavMenuFill(); }
    });
    dd.addEventListener('change',e=>{
      const c=e.target.closest('[data-gv]'); if(!c) return;
      _capNav.groups[c.dataset.gv]=c.checked; capNavSave(); capNavRender();
    });
  }
  if(dd.style.display!=='none'&&dd.dataset.g===g){ capNavClose(); return; }
  dd.dataset.g=g;
  dd.innerHTML=g==='☰'?`<input id="cap-nav-q" type="text" placeholder="🔍 Aller à une vue… (Ctrl+K)" autocomplete="off"><div id="cap-nav-res"></div>`:'<div id="cap-nav-res"></div>';
  capNavMenuFill();
  dd.style.display='block';
  const r=anchor.getBoundingClientRect(), w=dd.offsetWidth;
  dd.style.top=(r.bottom+4)+'px';
  dd.style.left=Math.max(8,Math.min(r.left, window.innerWidth-w-8))+'px';
  const q=dd.querySelector('#cap-nav-q');
  if(q){
    q.focus();
    q.oninput=()=>capNavMenuFill();
    q.onkeydown=e=>{
      const rows=[...dd.querySelectorAll('#cap-nav-res [data-open]')], i=rows.findIndex(r=>r.classList.contains('hl'));
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!rows.length) return;
        const n=(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;
        rows.forEach((r,j)=>r.classList.toggle('hl',j===n)); rows[n].scrollIntoView({block:'nearest'}); }
      else if(e.key==='Enter'){ const r=rows[i<0?0:i]; if(r) capNavOpen(r.dataset.open); }
      else if(e.key==='Escape') capNavClose();
    };
  }
}

/** Remplit le menu ouvert : vues du groupe, ou (menu ☰) réglage complet ou résultats de la recherche. */
function capNavMenuFill(){
  const dd=document.getElementById('cap-nav-dd'), res=dd&&dd.querySelector('#cap-nav-res'); if(!res) return;
  const g=dd.dataset.g;
  if(g==='file'){
    const sc=s=>` <span class="cap-nav-g">${s}</span>`;
    res.innerHTML=`<div class="ctx-i" data-act="open">🔷 Ouvrir un modèle Capella…</div><div class="cw-m-sep"></div>
      <div class="ctx-i" data-act="save">💾 Enregistrer${sc('Ctrl+S')}</div>
      <div class="ctx-i" data-act="saveas">💾 Enregistrer sous…${sc('Ctrl+Maj+S')}</div>
      <div class="ctx-i" data-act="page" title="Télécharger la page actuelle (avec le fichier Capella déjà chargé) en HTML autonome">🌐 Télécharger la page HTML</div>
      <div class="cap-nav-hint">La page enregistrée contient le modèle chargé et vos réglages.</div>`;
    return;
  }
  if(g==='help'){
    const v=capTourCtx();
    res.innerHTML=`<div class="ctx-i" data-act="help">📖 Aide complète</div>
      <div class="ctx-i" data-act="tour" title="Découvrir l'interface pas à pas">🎓 Visite guidée</div>`+
      (v?`<div class="ctx-i" data-act="tourview" title="Présente les menus et les commandes de la vue affichée">🎯 Visite de cette vue <span class="cap-nav-g">${v.l}</span></div>`
        :`<div class="cap-nav-hint">🎯 Chargez un modèle pour la visite de chaque vue.</div>`);
    return;
  }
  if(g==='theme'){
    const sel=document.getElementById('theme-sel');
    res.innerHTML=[...sel.options].map(o=>`<div class="ctx-i cap-nav-it${o.value===sel.value?' cur':''}" data-thm="${o.value}"><span>${o.textContent}</span></div>`).join('')+
      `<div class="cw-m-sep"></div><div class="ctx-i" data-act="themeedit" title="Créer ou modifier un thème personnalisé (toutes les couleurs)">🎨 Personnaliser…</div>`;
    return;
  }
  if(g!=='☰'){ res.innerHTML=CAP_NAV_ITEMS.filter(i=>i.g===g).map(i=>capNavRow(i)).join('')+
    `<div class="cap-nav-hint">📌 épingle une vue en bouton direct dans la barre.</div>`; return; }
  const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const q=norm((dd.querySelector('#cap-nav-q')||{}).value||'').trim();
  const gl=x=>(CAP_NAV_GROUPS.find(G=>G.g===x)||{}).l||'';
  if(q){
    const all=[{k:'@rm',l:'🗺 Relation Map',g:''},{k:'@table',l:'📊 Table View',g:''},...CAP_NAV_ITEMS];
    const hit=all.filter(i=>q.split(/\s+/).every(w=>norm(i.l+' '+gl(i.g)+' '+(i.t||'')).includes(w)));
    res.innerHTML=hit.length?hit.map(i=>capNavRow(i,gl(i.g))).join(''):'<div class="cap-nav-hint">Aucune vue ne correspond.</div>';
    res.querySelector('[data-open]')?.classList.add('hl');
    return;
  }
  let h='';
  CAP_NAV_GROUPS.forEach(G=>{
    h+=G.g?`<label class="cap-nav-h"><input type="checkbox" data-gv="${G.g}"${_capNav.groups[G.g]!==false?' checked':''}> Menu ${G.l} ▾ dans la barre</label>`
          :'<div class="cap-nav-h">Autres vues</div>';
    h+=CAP_NAV_ITEMS.filter(i=>i.g===G.g).map(i=>capNavRow(i)).join('');
  });
  h+=`<div class="cw-m-sep"></div><div class="ctx-i" data-reset="1">↺ Rétablir la barre par défaut</div>
    <div class="cap-nav-hint">📌 = bouton direct dans la barre. Une vue masquée reste accessible ici. Réglage enregistré avec la 💾 Page HTML.</div>`;
  res.innerHTML=h;
}

// Câblage : clics de la barre (délégation), fermeture du menu, raccourci Ctrl+K
(function(){
  const box=document.getElementById('cap-tb-views'); if(!box) return;
  box.addEventListener('click',e=>{
    const dd=e.target.closest('[data-dd]'); if(dd){ e.stopPropagation(); capNavMenu(dd.dataset.dd, dd.closest('.cap-nav-grp')); return; }
    const grp=e.target.closest('.cap-nav-grp'); if(grp){ capNavGroupOpen(grp.dataset.g); return; }
    const o=e.target.closest('[data-open]'); if(o){ capNavOpen(o.dataset.open); return; }
    const cfg=e.target.closest('#cap-nav-cfg'); if(cfg){ e.stopPropagation(); capNavMenu('☰', cfg); }
  });
  // Menus 📁 Fichier, 🎨 Thème et ? Aide (partie droite de la barre), onglets 📡 Flux & interfaces
  ['b-file-menu','b-theme-menu','b-help'].forEach(id=>document.getElementById(id)?.addEventListener('click',e=>{
    e.stopPropagation(); capNavMenu(e.currentTarget.dataset.dd, e.currentTarget); }));
  document.getElementById('cap-flux-tabs')?.addEventListener('click',e=>{ const o=e.target.closest('[data-open]'); if(o) capNavOpen(o.dataset.open); });
  document.addEventListener('mousedown',e=>{ if(!e.target.closest('#cap-nav-dd,[data-dd],#cap-nav-cfg')) capNavClose(); });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='k'||e.key==='K')){ e.preventDefault();
      const dd=document.getElementById('cap-nav-dd');
      if(dd&&dd.style.display!=='none'&&dd.dataset.g==='☰') capNavClose(); else capNavMenu('☰', document.getElementById('cap-nav-cfg')); }
    else if(e.key==='Escape') capNavClose();
  });
  window.addEventListener('resize',capNavClose);
  capNavRender();
})();
