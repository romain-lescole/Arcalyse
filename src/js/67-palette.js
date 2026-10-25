/* ═══════════════════════════════════════════════════════════════════════════
   🔍 Palette Ctrl+K : éléments du modèle et diagrammes dans la recherche du menu ☰
   Le menu ☰ (41) ne cherchait que des vues ; ce module ajoute à la même requête les éléments
   du modèle (nom, type, identifiant, chemin) et les diagrammes du .aird chargé, puis l'ouverture
   du résultat (panneau de détail ou diagramme) et les 🕘 derniers ouverts.
   ═══════════════════════════════════════════════════════════════════════════ */

const CAP_PAL_MAX=8;        // éléments affichés au plus
const CAP_PAL_MAX_DIAG=5;   // diagrammes affichés au plus
const CAP_PAL_RECENT=6;     // derniers résultats ouverts gardés
var _capPalRecent=[];       // [{kind:'el'|'diag', id}] du plus récent au plus ancien (session seulement)

/** Normalise un texte pour la recherche : sans accents, en minuscules.
 * @param {string} s - Texte
 * @returns {string} Texte normalisé
 */
function capPalNorm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }

/** Index des éléments du modèle cherchables par la palette (valeurs, liens techniques, paquetages et éléments sans nom exclus),
 * en cache dans `_capAnaCache` (vidé au chargement d'un modèle) et lié au document XML courant.
 * @returns {Array<{id:string,name:string,typeName:string,type:string,layer:string,n:string,t:string,path:string}>} Entrées
 */
function capPalIndex(){
  const c=_capAnaCache.palIdx; if(c&&c.doc===cap_xmlDoc) return c.idx;
  const byId={}; capAllElements.forEach(e=>{ byId[e.id]=e; });
  const {parentOf}=capGetParentIndex();
  const nameOf=e=>(e.attrs&&(e.attrs.name||e.attrs.ReqIFLongName||e.attrs.ReqIFName))||'';
  const idx=[];
  capAllElements.forEach(e=>{
    if(!capStEligible(e)) return;   // éléments nommés hors valeurs, liens techniques, paquetages (68) : échanges, ports et liens physiques compris
    const name=nameOf(e);
    const path=[]; let p=parentOf[e.id], n=0;
    while(p&&n<3){ const pe=byId[p]; if(pe){ const pn=nameOf(pe); if(pn&&!CAP_TECHNICAL_TYPES.has(pe.typeName)){ path.unshift(pn); n++; } } p=parentOf[p]; }
    const type=capAnaHuman(e.typeName);
    idx.push({id:e.id, name, typeName:e.typeName, type, layer:e.layer||'', n:capPalNorm(name), t:capPalNorm(type+' '+e.typeName), path:path.join(' › ')});
  });
  _capAnaCache.palIdx={doc:cap_xmlDoc, idx};
  return idx;
}

/** Pertinence d'une entrée pour une requête : 0 = pas de correspondance, puis par ordre croissant :
 * type contenant les mots (1), mots à l'intérieur de mots du nom (2), mots = termes exacts du type ou du sigle (2.5),
 * mots en tête de mots du nom (3), nom commençant par la requête (4), nom exact (5), identifiant exact (6).
 * @param {string} n - Nom normalisé
 * @param {string} t - Type (et sigle, couche) normalisé
 * @param {string} id - Identifiant
 * @param {string} q - Requête normalisée
 * @param {string[]} words - Mots de la requête
 * @returns {number} Score
 */
function capPalScore(n, t, id, q, words){
  if(id&&id.toLowerCase()===q) return 6;
  if(!words.every(w=>n.includes(w)||t.includes(w))) return 0;
  if(n===q) return 5;
  if(n.startsWith(q)) return 4;
  const nw=n.split(/[^a-z0-9]+/), tw=t.split(/[^a-z0-9]+/);
  if(words.every(w=>nw.some(x=>x.startsWith(w)))) return 3;
  if(words.every(w=>tw.includes(w))) return 2.5;
  if(words.every(w=>n.includes(w))) return 2;
  return 1;
}

/** Cherche les éléments du modèle et les diagrammes correspondant à une requête.
 * @param {string} q - Requête (texte saisi)
 * @returns {{els:Array, nEls:number, diags:Array, nDiags:number}} Meilleurs résultats et nombres totaux
 */
function capPalSearch(q){
  q=capPalNorm(q).trim(); const words=q.split(/\s+/).filter(Boolean);
  if(!words.length||!capAllElements.length) return {els:[], nEls:0, diags:[], nDiags:0};
  const els=[]; capPalIndex().forEach(e=>{ const s=capPalScore(e.n, e.t, e.id, q, words); if(s) els.push({s,e}); });
  els.sort((a,b)=>b.s-a.s||a.e.name.length-b.e.name.length||(a.e.n<b.e.n?-1:a.e.n>b.e.n?1:0));
  const reps=[...(typeof capDiagReps==='function'?capDiagReps():[]), ...(typeof capSyVuesReps==='function'?capSyVuesReps():[])], diags=[];   // + vues SysML v2 (87)
  reps.forEach(r=>{ const s=capPalScore(capPalNorm(r.nom), capPalNorm(`${r.type||''} ${r.sigle||''} ${r.couche||''}`), r.uid, q, words); if(s) diags.push({s,r}); });
  diags.sort((a,b)=>b.s-a.s||(a.r.nom<b.r.nom?-1:a.r.nom>b.r.nom?1:0));
  return {els:els.slice(0,CAP_PAL_MAX).map(x=>x.e), nEls:els.length, diags:diags.slice(0,CAP_PAL_MAX_DIAG).map(x=>x.r), nDiags:diags.length,
    diagsFirst:diags.length&&(!els.length||diags[0].s>els[0].s)};   // la section la plus pertinente en premier
}

/** Ligne de résultat (élément ou diagramme) du menu ☰.
 * @param {string} kind - 'el' ou 'diag'
 * @param {Object} x - Entrée de l'index (élément) ou représentation (diagramme)
 * @returns {string} HTML
 */
function capPalRow(kind, x){
  const esc=capEsc;
  if(kind==='diag'){
    const lv=capDiagCouche(x.couche);
    const ico=String(x.uid).startsWith('sy:')&&typeof capSyVueIco==='function'?capSyVueIco(x.genre,13)||'🔲':'🔲';   // vue SysML v2 : icône du genre (87)
    return `<div class="ctx-i cap-nav-it cap-pal-it" data-pal="diag" data-id="${esc(x.uid)}" title="${esc(x.type||'')}"><span>${ico} <span class="cap-pal-l" style="color:${lv.color}">${esc(x.couche||'')}</span> ${esc(x.nom)} <span class="cap-nav-g">${esc(x.type||'')}</span></span></div>`;
  }
  const lv=CAP_LAYERS[x.layer]||{color:'#8b949e'}, couche=CAP_ANA_LAYERS.includes(x.layer)?x.layer:'';
  return `<div class="ctx-i cap-nav-it cap-pal-it" data-pal="el" data-id="${esc(x.id)}" title="${esc(x.type)}${x.path?' — '+esc(x.path):''}"><span>${capIcoType(x.typeName,13)}${couche?`<span class="cap-pal-l" style="color:${lv.color}">${couche}</span> `:''}${esc(x.name)} <span class="cap-nav-g">${esc(x.type)}${x.path?' · '+esc(x.path):''}</span></span></div>`;
}

/** HTML des résultats « Éléments du modèle » et « Diagrammes » du menu ☰ pour une requête ('' si aucun).
 * @param {string} q - Requête saisie
 * @returns {string} HTML
 */
function capPalHtml(q){
  const R=capPalSearch(q); let els='', diags='';
  if(R.els.length){
    els=_L('<div class="cap-nav-h">Éléments du modèle</div>')+R.els.map(e=>capPalRow('el',e)).join('');
    if(R.nEls>R.els.length) els+=_L(`<div class="cap-nav-hint">… et ${R.nEls-R.els.length} autre(s) : précisez la recherche (nom, type, couche)</div>`);
  }
  if(R.diags.length){
    diags=_L('<div class="cap-nav-h">Diagrammes</div>')+R.diags.map(r=>capPalRow('diag',r)).join('');
    if(R.nDiags>R.diags.length) diags+=_L(`<div class="cap-nav-hint">… et ${R.nDiags-R.diags.length} autre(s) diagramme(s)</div>`);
  }
  return R.diagsFirst?diags+els:els+diags;
}

/** 🕘 Derniers éléments et diagrammes ouverts par la palette (menu ☰ sans requête ; '' si aucun).
 * @returns {string} HTML
 */
function capPalRecentHtml(){
  if(!_capPalRecent.length||!capAllElements.length) return '';
  const idx=capPalIndex(), reps=typeof capDiagReps==='function'?capDiagReps():[];
  const rows=_capPalRecent.map(r=>{ const x=r.kind==='diag'?reps.find(d=>d.uid===r.id):idx.find(e=>e.id===r.id); return x?capPalRow(r.kind,x):''; }).filter(Boolean);
  return rows.length?_L('<div class="cap-nav-h">🕘 Derniers ouverts</div>')+rows.join(''):'';
}

/** Ouvre un résultat de la palette : le panneau de détail d'un élément (en vues Capella) ou un diagramme.
 * @param {string} kind - 'el' ou 'diag'
 * @param {string} id - Identifiant de l'élément ou uid du diagramme
 */
function capPalOpen(kind, id){
  capNavClose();
  _capPalRecent=[{kind,id}, ..._capPalRecent.filter(r=>!(r.kind===kind&&r.id===id))].slice(0,CAP_PAL_RECENT);
  if(kind==='diag'){ capDiagOpen(id); return; }
  if(typeof currentMode!=='undefined'&&currentMode!=='capella') capShowView(capCurrentView&&capCurrentView!=='home'?capCurrentView:'tree');   // depuis la Relation Map : vues Capella (panneau de détail)
  capOpenDetailById(id);
}
