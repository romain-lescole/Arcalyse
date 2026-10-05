/* ══ 🎓 VISITE GUIDÉE ═══════════════════════════════════════════════════════════════
 * Didacticiel pas à pas, lancé depuis le menu ? Aide ▾ (ou l'écran d'accueil) : chaque étape met en
 * évidence une zone de l'interface (cadre clignotant, reste de l'écran assombri) et l'explique dans une bulle
 * avec ◀ Précédent / Suivant ▶ et ✕ pour quitter (clavier : ← → Entrée, Échap).
 * Les étapes dont la zone n'est pas affichée (modèle non chargé, vue masquée, bouton non épinglé) sont sautées.
 */
/** Étapes de la visite : s = sélecteur de la zone (absent = bulle centrée), t = titre, x = texte (HTML),
 * m = 'loaded' (seulement avec un modèle chargé) ou 'empty' (seulement sans modèle), pre = action préalable. */
var CAP_TOUR_STEPS=[
  {t:'🎓 Bienvenue dans Relation Map Capella',
   x:'Cette visite présente les principales zones de l\'outil en quelques étapes.<br>Utilisez <b>Suivant ▶</b> et <b>◀ Précédent</b> (ou les flèches du clavier) ; <b>✕</b> ou <b>Échap</b> pour quitter à tout moment.'},
  {s:'#cap-drop-zone', m:'empty', t:'🔷 Ouvrir un modèle',
   x:'Glissez-déposez un fichier <b>.capella</b> ici, ou cliquez pour le chercher. Le fichier est lu sur ce poste : rien n\'est envoyé.'},
  {s:'#cap-tb-views', t:'🧭 Barre des vues',
   x:'Toutes les vues d\'analyse du modèle sont regroupées ici, dans des menus déroulants (▾) et des boutons directs.'},
  {s:'#cap-v-elements', t:'🧭 Explorateur',
   x:'Parcourir le modèle : arborescence, cartes, tableau filtrable, index des types et liens entre éléments.'},
  {s:'#cap-v-flux', t:'📡 Flux & interfaces',
   x:'Chaînes fonctionnelles, Component Exchange, Physical Link et traçabilité des ports.'},
  {s:'#cap-v-chains', t:'⚡ Chaînes',
   x:'Les chaînes fonctionnelles du modèle, filtrables par type, couche et contenu, avec export image, PDF ou HTML.'},
  {s:'#cap-v-functions', t:'ƒ Fonctions',
   x:'Hiérarchie des fonctions, tableau, allocation aux composants, métriques, contrôles de qualité des noms et dossier imprimable.'},
  {s:'#cap-v-analyses', t:'🔬 Analyses',
   x:'Traçabilité inter-couches, capacités & missions, modes & états, comparaison de versions, exigences, propriétés, données et contraintes.'},
  {s:'#cap-v-dashboard', t:'📐 Tableau de bord',
   x:'Composez vos propres tableaux de bord : indicateurs, graphiques et tableaux, imprimables en A4.'},
  {s:'#cap-nav-cfg', t:'☰ Toutes les vues',
   x:'Cherchez une vue par son nom (raccourci <b>Ctrl+K</b>) et réglez la barre : 📌 épingle une vue en bouton direct.'},
  {s:'#mode-rm', t:'🗺 Relation Map',
   x:'Graphe interactif des éléments et de leurs relations : zoom, dépliage, disposition, export en image.'},
  {s:'#mode-table', t:'📊 Table View',
   x:'Tableaux construits à la demande, avec colonnes calculées le long des relations du modèle.'},
  {s:'#cap-sidebar', m:'loaded', pre:()=>{ if(currentMode!=='capella') capNavOpen('cards'); }, t:'🏷 Types affichés',
   x:'Cochez les types d\'éléments à afficher dans les vues. Le champ du haut filtre la liste.'},
  {s:'#cap-sub-toolbar', m:'loaded', t:'🔍 Recherche et filtres',
   x:'Recherche plein texte, filtre par couche ARCADIA (OA, SA, LA, PA…) et export CSV / JSON de la vue affichée.'},
  {s:'#cap-content', m:'loaded', t:'▦ Zone de travail',
   x:'La vue choisie s\'affiche ici. Cliquez sur un élément pour ouvrir son panneau de détail (propriétés, relations, liens).'},
  {s:'#b-file-menu', t:'📁 Fichier',
   x:'Ouvrir un autre modèle, enregistrer la page, ou télécharger une page HTML autonome qui contient le modèle et vos réglages.'},
  {s:'#b-save-direct', t:'💾 Enregistrer',
   x:'Enregistre directement la page avec le modèle chargé (<b>Ctrl+S</b>) ; Maj+clic pour « Enregistrer sous ».'},
  {s:'#b-cap-watch', m:'loaded', t:'🔄 Suivi du fichier',
   x:'Détecte les nouvelles versions du fichier .capella et montre ce qui a changé (delta, historique).'},
  {s:'#b-theme-menu', t:'🎨 Thème',
   x:'Choisissez un thème clair ou sombre, ou créez votre propre thème personnalisé.'},
  {s:'#b-help', t:'? Aide',
   x:'L\'aide complète et cette visite guidée restent accessibles à tout moment depuis ce menu.'},
  {t:'✅ C\'est parti !',
   x:'La visite est terminée. Vous pouvez la relancer depuis <b>? Aide ▾ → 🎓 Visite guidée</b>.'}
];
var _capTour=null;   // visite en cours : {i, steps} ou null

/** Indique si la zone d'une étape est affichée à l'écran.
 * @param {Object} st - Étape de CAP_TOUR_STEPS
 * @returns {boolean} true si l'étape est utilisable (zone visible, ou bulle centrée)
 */
function capTourVisible(st){
  if(st.m==='loaded'&&!capLoaded) return false;
  if(st.m==='empty'&&capLoaded) return false;
  if(!st.s) return true;
  if(st.pre) return true;   // la zone apparaît après l'action préalable
  const el=document.querySelector(st.s); if(!el) return false;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';
}

/** Lance la visite guidée depuis la première étape. */
function capTourStart(){
  if(typeof capNavClose==='function') capNavClose();
  document.getElementById('help-ov')&&(document.getElementById('help-ov').style.display='none');
  if(!document.getElementById('cap-tour-spot')){
    const blk=document.createElement('div'); blk.id='cap-tour-block';
    const spot=document.createElement('div'); spot.id='cap-tour-spot';
    const pop=document.createElement('div'); pop.id='cap-tour-pop';
    document.body.append(blk,spot,pop);
    pop.addEventListener('click',e=>{
      const b=e.target.closest('[data-tour]'); if(!b) return;
      ({prev:()=>capTourGo(-1), next:()=>capTourGo(1), end:()=>capTourEnd()})[b.dataset.tour]();
    });
    document.addEventListener('keydown',capTourKey,true);
    window.addEventListener('resize',()=>{ if(_capTour) capTourPlace(); });
  }
  _capTour={i:-1};
  ['cap-tour-block','cap-tour-spot','cap-tour-pop'].forEach(id=>document.getElementById(id).style.display='block');
  capTourGo(1);
}

/** Passe à l'étape suivante ou précédente utilisable (les zones non affichées sont sautées).
 * @param {number} d - +1 (suivante) ou -1 (précédente)
 */
function capTourGo(d){
  if(!_capTour) return;
  let i=_capTour.i+d;
  while(i>=0&&i<CAP_TOUR_STEPS.length&&!capTourVisible(CAP_TOUR_STEPS[i])) i+=d;
  if(i>=CAP_TOUR_STEPS.length){ capTourEnd(); return; }
  if(i<0) return;
  _capTour.i=i;
  const st=CAP_TOUR_STEPS[i];
  if(st.pre){ try{ st.pre(); }catch(e){} }
  const el=st.s&&document.querySelector(st.s);
  if(el&&el.scrollIntoView) el.scrollIntoView({block:'nearest',inline:'nearest'});
  capTourRenderPop();
  // Laisse le temps à l'action préalable (changement de vue) de s'afficher avant de placer le cadre
  requestAnimationFrame(()=>capTourPlace());
}

/** Numéros (rang, total) de l'étape courante parmi les étapes utilisables.
 * @returns {{n:number,tot:number,first:boolean,last:boolean}} Position de l'étape courante
 */
function capTourPos(){
  const ok=CAP_TOUR_STEPS.map((s,j)=>j===_capTour.i||capTourVisible(s));
  const n=ok.slice(0,_capTour.i+1).filter(Boolean).length, tot=ok.filter(Boolean).length;
  return {n, tot, first:n===1, last:n===tot};
}

/** Remplit la bulle de l'étape courante (titre, texte, compteur, boutons). */
function capTourRenderPop(){
  const st=CAP_TOUR_STEPS[_capTour.i], p=capTourPos(), pop=document.getElementById('cap-tour-pop');
  pop.innerHTML=`<div class="ct-hd"><span class="ct-t">${st.t}</span><span class="ct-x" data-tour="end" title="Quitter la visite (Échap)">✕</span></div>
    <div class="ct-b">${st.x}</div>
    <div class="ct-ft"><span class="ct-n">Étape ${p.n} / ${p.tot}</span>
      <button class="tbtn" data-tour="prev"${p.first?' disabled':''}>◀ Précédent</button>
      <button class="tbtn ct-next" data-tour="${p.last?'end':'next'}">${p.last?'Terminer ✓':'Suivant ▶'}</button></div>`;
  pop.querySelector('.ct-next').focus({preventScroll:true});
}

/** Place le cadre clignotant sur la zone de l'étape courante et la bulle à côté (ou au centre). */
function capTourPlace(){
  if(!_capTour) return;
  const st=CAP_TOUR_STEPS[_capTour.i], spot=document.getElementById('cap-tour-spot'), pop=document.getElementById('cap-tour-pop');
  const W=window.innerWidth, H=window.innerHeight, M=6, G=12;
  const el=st.s&&document.querySelector(st.s), r=el&&el.getBoundingClientRect();
  if(!r||!r.width||!r.height){
    // Bulle centrée : cadre réduit à un point, tout l'écran est assombri
    Object.assign(spot.style,{left:W/2+'px',top:H/2+'px',width:'0px',height:'0px'}); spot.classList.add('ct-none');
    pop.style.left=Math.max(8,(W-pop.offsetWidth)/2)+'px'; pop.style.top=Math.max(8,(H-pop.offsetHeight)/2)+'px';
    return;
  }
  spot.classList.remove('ct-none');
  // Cadre limité à l'écran (zone plus grande que la fenêtre)
  const x=Math.max(2,r.left-M), y=Math.max(2,r.top-M), x2=Math.min(W-2,r.right+M), y2=Math.min(H-2,r.bottom+M);
  Object.assign(spot.style,{left:x+'px',top:y+'px',width:(x2-x)+'px',height:(y2-y)+'px'});
  // Bulle : en dessous, sinon au-dessus, sinon à droite, sinon à gauche, sinon à l'intérieur de la zone
  const pw=pop.offsetWidth, ph=pop.offsetHeight;
  let left, top;
  if(y2+G+ph<=H-8){ top=y2+G; left=x; }
  else if(y-G-ph>=8){ top=y-G-ph; left=x; }
  else if(x2+G+pw<=W-8){ left=x2+G; top=y; }
  else if(x-G-pw>=8){ left=x-G-pw; top=y; }
  else { left=x+(x2-x-pw)/2; top=y+(y2-y-ph)/2; }
  pop.style.left=Math.max(8,Math.min(left,W-pw-8))+'px';
  pop.style.top=Math.max(8,Math.min(top,H-ph-8))+'px';
}

/** Raccourcis clavier pendant la visite : ← → Entrée pour naviguer, Échap pour quitter.
 * @param {KeyboardEvent} e - Événement clavier (écouté en phase de capture)
 */
function capTourKey(e){
  if(!_capTour) return;
  const a={ArrowRight:()=>capTourGo(1), ArrowLeft:()=>capTourGo(-1), Escape:()=>capTourEnd(),
    Enter:()=>document.querySelector('#cap-tour-pop .ct-next')?.click()}[e.key];
  if(!a) return;
  e.preventDefault(); e.stopPropagation(); a();
}

/** Quitte la visite guidée et retire la mise en évidence. */
function capTourEnd(){
  _capTour=null;
  ['cap-tour-block','cap-tour-spot','cap-tour-pop'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
}

// Lien « 🎓 Visite guidée » de l'écran d'accueil (sans déclencher l'ouverture du sélecteur de fichier)
document.getElementById('cw-tour-link')?.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); capTourStart(); });
