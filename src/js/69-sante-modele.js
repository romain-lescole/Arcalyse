/* ═══════════════════════════════════════════════════════════════════════════
   💚 Santé du modèle : score global et par couche ARCADIA bâti sur tous les contrôles 🩺 (avec le
   🩺 profil : contrôles désactivés ignorés, gravité ℹ 0 / ⚠ 1 / ✖ 3), carte de 🏠 Accueil, sous-vue
   `sante` de 🔬 Analyses (détail contrôle × couche, historique), indicateurs du tableau de bord,
   historique des scores par version du modèle (`_capHome.sante`, bloc `cap-home`).
   Score = 100 × e^(−Σ poids × lignes ÷ nombre d'éléments nommés) : 0,1 anomalie par élément ≈ 90, 0,36 ≈ 70, 0,7 ≈ 50.
   ═══════════════════════════════════════════════════════════════════════════ */

const CAP_SANTE_W={info:0, warn:1, err:3};   // poids des gravités
const CAP_SANTE_MAX_HIST=60;                   // versions gardées dans l'historique
const CAP_SANTE_AUTO=30000;                    // au-delà (éléments), la carte de l'accueil attend un clic pour calculer

/** Niveau lisible d'un score. @param {number} s - Score 0–100 @returns {{l:string, c:string, h:string}} libellé, couleur CSS, couleur fixe */
function capSanteNiveau(s){ return s>=90?{l:_L('Bon'), c:'var(--c-ok,#3fb950)', h:'#3fb950'}:s>=70?{l:_L('À surveiller'), c:'var(--c-warn,#e3b341)', h:'#e3b341'}:{l:_L('À reprendre'), c:'var(--c-err,#f85149)', h:'#f85149'}; }

/** Tous les contrôles de toutes les vues (profil appliqué), avec le nombre de lignes global et par couche quand la vue le permet.
 * @returns {Array<{view:string, title:string, sev:string, n:number, layers:(Object|null)}>} Contrôles
 */
function capSanteChecks(){
  if(_capAnaCache.santeChecks) return _capAnaCache.santeChecks;
  const F=capComputeFunctions(), out=[];
  const views=[
    {k:'functions', all:()=>capFnChecks(F,'all'), layer:l=>capFnChecks(F,l)},
    {k:'fex', all:()=>capFexChecks('all'), layer:l=>capFexChecks(l)},
    {k:'csys', all:()=>capCbChecks('all'), layer:l=>capCbChecks(l)},
    {k:'ports', all:()=>capPortsDiagSections(capComputePortLinks())}, {k:'chains', all:()=>capChChecks('all'), layer:l=>capChChecks(l)}, {k:'scen', all:()=>capScChecks()},
    {k:'ana:reqs', all:()=>capReqChecks()}, {k:'ana:pvmt', all:()=>capPvChecks()}, {k:'ana:data', all:()=>capDmChecks()}, {k:'ana:cts', all:()=>capCtChecks()},
    {k:'ana:cats', all:()=>capEcChecks()}, {k:'ana:libs', all:()=>capLibChecks()}, {k:'ana:rec', all:()=>capRecChecks()}, {k:'ana:deploy', all:()=>capDepChecks()}, {k:'ana:status', all:()=>capStChecks()}];
  views.forEach(v=>{
    let secs; try{ secs=capChkFilter(v.all()); }catch(e){ console.warn('Santé : vue',v.k,e); return; }
    const byLayer={};
    if(v.layer) CAP_ANA_LAYERS.forEach(l=>{ try{ capChkFilter(v.layer(l)).forEach(s=>{ (byLayer[s.title]=byLayer[s.title]||{})[l]=(s.items||[]).length; }); }catch(e){ /* couche absente */ } });
    secs.forEach(s=>out.push({view:v.k, title:s.title, sev:s.sev, n:(s.items||[]).length, layers:v.layer?(byLayer[s.title]||{}):null}));
  });
  // Contrôles bâtis en ligne (🔀, 🔌, 🎯, 🚦) : valeurs des indicateurs du tableau de bord, gravité ⚠ sauf profil sur leur libellé
  [['compex','chk.ce'],['physlink','chk.pl'],['ana:caps','cap.chk'],['ana:states','sm.chk']].forEach(([k,id])=>{
    try{ const m=capDashCatalog().find(x=>x.id===id), val=m&&capDashValue(m);
      (val&&val.cats||[]).forEach(c=>{ if(!capChkOff(c.l)) out.push({view:k, title:c.l, sev:capChkSev(c.l), n:c.v, layers:null}); }); }
    catch(e){ console.warn('Santé : indicateur',id,e); }
  });
  return _capAnaCache.santeChecks=out;
}

/** Score de santé global et par couche.
 * @returns {{score:number, points:number, bloquants:number, info:number, pop:number, nChecks:number, nOk:number, couches:Object, parVue:Object, checks:object[]}} Résultat
 */
function capSanteCompute(){
  if(_capAnaCache.sante) return _capAnaCache.sante;
  const checks=capSanteChecks(), {xmap}=capAnaCtx();
  const layerOf=e=>{ if(CAP_ANA_LAYERS.includes(e.layer)) return e.layer; const x=xmap[e.id], l=x?capArchLayerOf(x):'?'; return CAP_ANA_LAYERS.includes(l)?l:''; };
  const popL={}; let pop=0;
  capAllElements.forEach(e=>{ if(!capStEligible(e)) return; pop++; const l=layerOf(e); if(l) popL[l]=(popL[l]||0)+1; });
  const w=s=>CAP_SANTE_W[s.sev]||0, excl=capSanteExclues(), masq=capSanteVuesMasquees();
  // Lignes d'un contrôle retenues pour le score global : hors couches décochées quand le contrôle est calculé par couche (le reste, non attribuable, est gardé)
  const popRet=pop-excl.reduce((s,l)=>s+(popL[l]||0),0);
  const nRet=c=>{ if(masq.includes(c.view)) return 0;   // vue masquée du score
    if(!excl.length) return c.n;
    if(!c.layers) return Math.round(c.n*popRet/Math.max(1,pop));   // contrôle sans couche : au prorata des éléments gardés (répartition supposée uniforme)
    const inL=CAP_ANA_LAYERS.reduce((s,l)=>s+(c.layers[l]||0),0), kept=CAP_ANA_LAYERS.filter(l=>!excl.includes(l)).reduce((s,l)=>s+(c.layers[l]||0),0); return kept+Math.round(Math.max(0,c.n-inL)*popRet/Math.max(1,pop)); };
  const pen=checks.reduce((s,c)=>s+w(c)*nRet(c),0);
  const score=p=>Math.round(100*Math.exp(-p));   // 0 anomalie → 100 ; 0,1 par élément → 90 ; 0,36 → 70
  const couches={};
  CAP_ANA_LAYERS.forEach(l=>{ if(!popL[l]) return; const cs=checks.filter(c=>c.layers&&c.layers[l]!=null); const p=cs.reduce((s,c)=>s+w(c)*c.layers[l],0);
    couches[l]={score:score(p/Math.max(1,popL[l])), points:cs.filter(c=>c.sev!=='info').reduce((s,c)=>s+c.layers[l],0), bloquants:cs.filter(c=>c.sev==='err').reduce((s,c)=>s+c.layers[l],0), pop:popL[l], nChecks:cs.length}; });
  const parVue={}; checks.forEach(c=>{ const v=parVue[c.view]=parVue[c.view]||{points:0, bloquants:0, n:0, ok:0}; v.n++; if(!c.n) v.ok++; if(c.sev!=='info') v.points+=c.n; if(c.sev==='err') v.bloquants+=c.n; });
  return _capAnaCache.sante={score:score(pen/Math.max(1,popRet)), points:checks.filter(c=>c.sev!=='info').reduce((s,c)=>s+nRet(c),0), bloquants:checks.filter(c=>c.sev==='err').reduce((s,c)=>s+nRet(c),0),
    info:checks.filter(c=>c.sev==='info').reduce((s,c)=>s+nRet(c),0), pop:popRet, popTotal:pop, exclues:excl.slice(), masquees:masq.slice(), nChecks:checks.length, nOk:checks.filter(c=>!c.n).length, couches, parVue, checks};
}

/** Vues dont les contrôles sont masqués du score (réglage du projet, bloc `cap-home`). @returns {string[]} */
function capSanteVuesMasquees(){ return typeof _capHome!=='undefined'&&Array.isArray(_capHome.santeVuesMasquees)?_capHome.santeVuesMasquees:[]; }

/** Masque ou compte de nouveau les contrôles d'une vue dans le score, puis recalcule et réaffiche.
 * @param {string} v - Clé de la vue (functions, fex, ana:reqs…)
 * @param {boolean} on - Comptée ou non
 */
function capSanteToggleVue(v, on){
  if(typeof _capHome==='undefined') return;
  const m=new Set(capSanteVuesMasquees()); if(on) m.delete(v); else m.add(v);
  _capHome.santeVuesMasquees=[...m]; capHomeSave();
  delete _capAnaCache.sante; Object.keys(_capAnaCache).forEach(k=>{ if(k.startsWith('dv:sante')) delete _capAnaCache[k]; });
  if(capCurrentView==='home') capHomeRender(); else capRenderCurrentView();
}

/** Couches ARCADIA décochées (exclues du score global ; réglage du projet, bloc `cap-home`). @returns {string[]} */
function capSanteExclues(){ return typeof _capHome!=='undefined'&&Array.isArray(_capHome.santeExclues)?_capHome.santeExclues.filter(l=>CAP_ANA_LAYERS.includes(l)):[]; }

/** Coche ou décoche une couche pour le score global, puis recalcule et réaffiche.
 * @param {string} l - Couche (OA, SA, LA, PA, EPBS)
 * @param {boolean} on - Cochée (comptée) ou non
 */
function capSanteToggleCouche(l, on){
  if(typeof _capHome==='undefined'||!CAP_ANA_LAYERS.includes(l)) return;
  const ex=new Set(capSanteExclues()); if(on) ex.delete(l); else ex.add(l);
  _capHome.santeExclues=CAP_ANA_LAYERS.filter(x=>ex.has(x)); capHomeSave();
  delete _capAnaCache.sante; Object.keys(_capAnaCache).forEach(k=>{ if(k.startsWith('dv:sante')) delete _capAnaCache[k]; });
  if(capCurrentView==='home') capHomeRender(); else capRenderCurrentView();
}

/** Clé de la version du modèle affichée : nom du fichier, nombre d'éléments et de relations (stable, indépendante du 🔄 suivi). @returns {string} */
function capSanteCle(){ const L=capLinksData||(capLinksData=capComputeLinks()); return capCurrentFileName+'|'+capAllElements.length+'|'+Object.values(L).reduce((s,a)=>s+(Array.isArray(a)?a.length:0),0); }

/** Note le score de la version affichée dans l'historique (`_capHome.sante`) : même version → entrée remplacée.
 * @returns {object[]} Historique
 */
function capSanteRecord(){
  if(!capLoaded||typeof _capHome==='undefined') return [];
  const S=capSanteCompute(), H=_capHome.sante=_capHome.sante||[], cle=capSanteCle();
  const e={date:new Date().toISOString(), nom:capCurrentFileName, cle, elements:capAllElements.length, score:S.score, points:S.points, bloquants:S.bloquants, exclues:S.exclues, couches:Object.fromEntries(Object.entries(S.couches).map(([k,v])=>[k,v.score]))};
  const i=H.findIndex(x=>x.cle===cle);
  if(i>=0){ const same=JSON.stringify([H[i].score,H[i].points,H[i].bloquants,H[i].couches,H[i].exclues||[]])===JSON.stringify([e.score,e.points,e.bloquants,e.couches,e.exclues]); if(same) return H; e.date=H[i].date; H[i]=e; }
  else H.push(e);
  while(H.length>CAP_SANTE_MAX_HIST) H.shift();
  if(typeof capHomeSave==='function') capHomeSave();
  return H;
}

/** Petite courbe SVG de l'historique des scores. @param {object[]} H - Historique @param {number} [w=140] @param {number} [h=28] @returns {string} SVG */
function capSanteSpark(H, w, h){
  w=w||140; h=h||28; const l=H.slice(-12); if(l.length<2) return '';
  const x=i=>2+i*(w-4)/(l.length-1), y=s=>2+(h-4)*(1-s/100);
  return `<svg class="sante-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="var(--c-accent,#58a6ff)" stroke-width="1.5" points="${l.map((e,i)=>x(i).toFixed(1)+','+y(e.score).toFixed(1)).join(' ')}"/>${l.map((e,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(e.score).toFixed(1)}" r="2" fill="${capSanteNiveau(e.score).h}"><title>${capEsc(capSanteDate(e.date))} : ${e.score}</title></circle>`).join('')}</svg>`;
}

/** Date courte d'une entrée d'historique. @param {string} iso @returns {string} */
function capSanteDate(iso){ const d=new Date(iso); return isNaN(d)?'':d.toLocaleDateString('fr-FR')+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }

/** Carte 💚 Santé du modèle de 🏠 Accueil. @returns {string} HTML */
function capSanteCarte(){
  const esc=capEsc;
  if(!capLoaded) return `<div class="ana-dim">${_L('Chargez un modèle.')}</div>`;
  if(capAllElements.length>CAP_SANTE_AUTO&&!_capAnaCache.sante&&!_capHomeUi.santeOk) return `<div class="ana-dim">${_L(`Modèle volumineux (${capAllElements.length} éléments) : le calcul de tous les contrôles peut prendre quelques secondes.`)}</div><div class="hm-row"><button class="cap-lf-btn" data-a="sante-calc">${_L('💚 Calculer la santé du modèle')}</button></div>`;
  const S=capSanteCompute(), H=capSanteRecord(), N=capSanteNiveau(S.score), prev=H.length>1?H[H.length-2]:null, delta=prev?S.score-prev.score:0;
  return `<div class="sante-head"><div class="sante-score" style="color:${N.c}">${S.score}<span class="sante-unit">/100</span></div><div><div class="sante-niv" style="color:${N.c}">${N.l}</div>
      <div class="ana-dim">${_L(`${S.points} point(s) à vérifier`)}${S.bloquants?` · <span style="color:var(--c-err,#f85149)">${_L(`${S.bloquants} bloquant(s)`)}</span>`:''} · ${_L(`${S.nOk} / ${S.nChecks} contrôles sans anomalie`)}</div>
      ${prev?`<div class="ana-dim">${delta>0?'▲':delta<0?'▼':'='} ${delta>0?'+':''}${delta} ${_L('depuis la version précédente')} <span title="${esc(prev.nom)}">(${capSanteDate(prev.date)})</span></div>`:''}</div>${capSanteSpark(H)}</div>
    <div class="sante-layers">${CAP_ANA_LAYERS.filter(l=>S.couches[l]).map(l=>{ const c=S.couches[l], lv=CAP_LAYERS[l]||{color:'#8b949e'}, n=capSanteNiveau(c.score), off=S.exclues.includes(l);
      return `<div class="sante-layer${off?' sante-off':''}" title="${_L(`${c.points} point(s) à vérifier sur ${c.pop} éléments, ${c.nChecks} contrôles par couche`)}"><label><input type="checkbox" data-sante-l="${l}"${off?'':' checked'} title="${_L('Décochée : couche exclue du score global')}"><b style="color:${lv.color}">${l}</b></label><div class="sante-bar"><div style="width:${c.score}%;background:${n.h}"></div></div><span style="color:${n.c}">${c.score}</span></div>`; }).join('')}</div>
    ${S.exclues.length?`<div class="ana-dim" style="font-size:11px">${_L(`Hors score global : ${S.exclues.join(', ')} (${S.popTotal-S.pop} éléments)`)}</div>`:''}
    ${S.masquees.length?`<div class="ana-dim" style="font-size:11px">${_L(`Vues masquées du score : ${S.masquees.map(k=>(CAP_NAV_ITEMS.find(i=>i.k===k)||{}).l||k).join(', ')}`)}</div>`:''}
    <div class="hm-row"><button class="cap-lf-btn" data-nav="ana:sante" title="${_L('Détail contrôle par contrôle et par couche, historique')}">📊 ${_L('Détail')}</button><button class="cap-lf-btn" data-a="sante-profil" title="${_L('Activer ou désactiver des contrôles, gravités, seuils')}">🩺 ${_L('Profil')}</button><button class="cap-lf-btn" data-a="sante-hide" title="${_L('Masquer cette carte (⚙ Disposer › Masquées pour la réafficher)')}" style="margin-left:auto">✕ ${_L('Masquer')}</button></div>`;
}

/** Sous-vue 💚 Santé du modèle de 🔬 Analyses : synthèse, contrôle × couche, historique.
 * @param {HTMLElement} box - Conteneur
 */
function capRenderSante(box){
  const st=box._sa=box._sa||{view:'tab', q:''}, esc=capEsc, S=capSanteCompute(), H=capSanteRecord(), N=capSanteNiveau(S.score);
  const L=CAP_ANA_LAYERS.filter(l=>S.couches[l]), lab=k=>{ const it=CAP_NAV_ITEMS.find(i=>i.k===k); return it?it.l:k; }, sevL=s=>(CAP_CHK_SEV.find(x=>x[0]===s)||[])[2]||s;
  const q=st.q.trim().toLowerCase(), shown=S.checks.filter(c=>!q||(c.title+' '+lab(c.view)).toLowerCase().includes(q));
  const head=_L(`<p class="ana-help">Score <b style="color:${N.c}">${S.score} / 100 (${N.l})</b>${S.exclues.length?_L(` — couches décochées : <b>${S.exclues.join(', ')}</b> (leurs lignes et leurs ${S.popTotal-S.pop} éléments ne comptent pas)`):''} = 100 × e<sup>−(Σ poids × lignes ÷ ${S.pop} éléments nommés)</sup>, poids ℹ 0 · ⚠ 1 · ✖ 3 (🩺 profil) : 0,1 anomalie par élément ≈ 90, 0,36 ≈ 70. <b>${S.points}</b> point(s) à vérifier dont <b>${S.bloquants}</b> bloquant(s) ; ${S.info} pour information ; ${S.nOk} / ${S.nChecks} contrôles sans anomalie. Le score par couche ne compte que les contrôles calculables par couche (fonctions, échanges fonctionnels, composants, chaînes).</p>`);
  let body='';
  if(st.view==='tab'){
    body=head+capXtTable([_L('Vue'),_L('Contrôle'),_L('Gravité'),'Σ',...L], shown.map(c=>[esc(lab(c.view)), esc(c.title), `<span class="cap-diag-cnt ${c.n?c.sev:'ok'}">${sevL(c.sev)}</span>`, c.n?`<b>${c.n}</b>`:'<span class="ana-dim">0</span>',
      ...L.map(l=>c.layers?(c.layers[l]?`<b>${c.layers[l]}</b>`:'0'):'<span class="ana-dim">—</span>')]))+
      capXtTable([_L('Couche'),_L('Score'),_L('Points à vérifier'),_L('Bloquants'),_L('Éléments nommés'),_L('Contrôles par couche')], L.map(l=>{ const c=S.couches[l], n=capSanteNiveau(c.score); return [capChainLayerBadge(l), `<b style="color:${n.c}">${c.score}</b> <span class="ana-dim">${n.l}</span>`, String(c.points), String(c.bloquants), String(c.pop), String(c.nChecks)]; }));
  } else if(st.view==='vue'){
    body=head+_L(`<p class="ana-help">Décochez une vue pour <b>masquer ses contrôles du score</b> (réglage conservé avec le projet).</p>`)+capXtTable([_L('Comptée'),_L('Vue'),_L('Contrôles'),_L('Sans anomalie'),_L('Points à vérifier'),_L('Bloquants')], Object.entries(S.parVue).map(([k,v])=>{ const off=S.masquees.includes(k); return [`<input type="checkbox" data-sante-v="${esc(k)}"${off?'':' checked'} title="${_L('Décochée : contrôles de la vue masqués du score')}">`, off?`<span class="ana-dim">${esc(lab(k))}</span>`:esc(lab(k)), String(v.n), String(v.ok), v.points?`<b>${v.points}</b>`:'0', v.bloquants?`<b style="color:var(--c-err,#f85149)">${v.bloquants}</b>`:'0']; }));
  } else {
    body=_L(`<p class="ana-help">Une ligne par version du modèle ouverte dans ce projet (même fichier → entrée mise à jour) ; conservé avec la 💾 page. ${capSanteSpark(H,320,60)}</p>`)+
      capXtTable([_L('Date'),_L('Fichier'),_L('Éléments'),_L('Score'),_L('Points'),_L('Bloquants'),...CAP_ANA_LAYERS], [...H].reverse().map(e=>[capSanteDate(e.date), esc(e.nom||''), String(e.elements||''), `<b style="color:${capSanteNiveau(e.score).c}">${e.score}</b>`, String(e.points), String(e.bloquants), ...CAP_ANA_LAYERS.map(l=>e.couches&&e.couches[l]!=null?String(e.couches[l]):'<span class="ana-dim">—</span>')]));
  }
  box.innerHTML=capXtBar(capXtViewBtns([['tab',_L('📋 Contrôles × couches')],['vue',_L('▦ Par vue')],['hist',_L('📈 Historique')]],st.view)+(st.view==='tab'?`<span class="tsep"></span>${capXtSearch(st.q,_L('Vue, contrôle…'))}`:'')+
    `<span class="tb-grp" title="${_L('Couches comptées dans le score global (décocher = exclure)')}"><span class="tb-grp-l">${_L('Couches')}</span>${L.map(l=>`<label class="cap-lf-btn" style="cursor:pointer"><input type="checkbox" data-sante-l="${l}"${S.exclues.includes(l)?'':' checked'}> ${l}</label>`).join('')}</span>`+
    `<button class="cap-lf-btn" onclick="capChkDialog()" title="${_L('Activer ou désactiver des contrôles, gravités, seuils')}">🩺 ${_L('Profil')}</button>`, st.view==='tab'?`${shown.length} / ${S.checks.length}`:'')+body;
  capXtBind(box, st, capRenderSante, ()=>capCsvExport(_L('sante-modele.csv'),[_L('Vue'),_L('Contrôle'),_L('Gravité'),_L('Lignes'),...CAP_ANA_LAYERS], S.checks.map(c=>[lab(c.view),c.title,sevL(c.sev),String(c.n),...CAP_ANA_LAYERS.map(l=>c.layers&&c.layers[l]!=null?String(c.layers[l]):'')])));
}

/** Indicateurs du tableau de bord : santé du modèle.
 * @param {Function} add - Ajout d'un indicateur
 * @param {Function} LC - Couleur d'une couche
 */
function capSanteDashCatalog(add, LC){
  const G=_L('Santé du modèle');
  add(G,'sante.score',_L('Santé du modèle — score'),'pct',()=>{ const S=capSanteCompute(); return {v:S.score, num:S.score, den:100}; },_L('100 × e^(−Σ poids × lignes des contrôles ÷ éléments nommés)'));
  add(G,'sante.pts',_L('Santé du modèle — points à vérifier'),'n',()=>({n:capSanteCompute().points}));
  add(G,'sante.err',_L('Santé du modèle — points bloquants'),'n',()=>({n:capSanteCompute().bloquants}));
  add(G,'sante.layer',_L('Santé du modèle — score par couche'),'series',()=>({cats:CAP_ANA_LAYERS.filter(l=>capSanteCompute().couches[l]).map(l=>({l, v:capSanteCompute().couches[l].score, c:LC(l)})), order:'natural'}));
  add(G,'sante.vue',_L('Santé du modèle — points à vérifier par vue'),'series',()=>({cats:Object.entries(capSanteCompute().parVue).map(([k,v])=>({l:(CAP_NAV_ITEMS.find(i=>i.k===k)||{}).l||k, v:v.points})).filter(c=>c.v)}));
  add(G,'sante.hist',_L('Santé du modèle — historique des scores'),'series',()=>({cats:capSanteRecord().slice(-12).map(e=>({l:capSanteDate(e.date), v:e.score, c:capSanteNiveau(e.score).h})), order:'natural'}));
}

// Cases des couches (carte de l'accueil, sous-vue) : exclusion du score global
document.addEventListener('change',e=>{ const i=e.target&&e.target.closest&&e.target.closest('input[data-sante-l]'); if(i) capSanteToggleCouche(i.dataset.santeL, i.checked);
  const v=e.target&&e.target.closest&&e.target.closest('input[data-sante-v]'); if(v) capSanteToggleVue(v.dataset.santeV, v.checked); });
