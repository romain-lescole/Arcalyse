/* ═══════════════════════════════════════════════════════════════════════════
   ⇄ Avant / après — écarts d'un diagramme entre deux versions (🔲 Diagrammes)
   Le diagramme ouvert est dessiné dans la version affichée et dans une version d'avant (gardée d'elle-même
   quand le modèle ou le .aird est remplacé par une version plus récente, ou choisie à la main), puis les deux
   dessins sont superposés dans une surimpression de la vue :
   - ◐ Fondu : un seul dessin, celui d'après ; seuls les écarts bougent avec le curseur — éléments ajoutés qui
     apparaissent, retirés qui s'effacent (repris du dessin d'avant), déplacés ou redimensionnés qui glissent de
     leur ancienne place à la nouvelle, liens retracés et éléments renommés en fondu enchaîné ;
   - ◧ Volet : les deux dessins entiers, séparés par une barre à faire glisser (avant à gauche, après à droite).
   Surbrillance des écarts (vert : ajouté, rouge : retiré, orange : déplacé ou redimensionné, bleu : renommé,
   violet : lien retracé), liste des écarts (clic : centrer, double-clic : panneau de détail), ◀ ▶ d'un écart à
   l'autre, recherche des diagrammes modifiés.
   Formats : Capella (visionneuse d'Arcature : `reference`, `svg`), UML / SysML v1 et SysML v2 (lecteurs d'Arcature :
   vues du fichier ou calculées, `vue(cle).svgDocument`). Les dessins des quatre familles marquent leurs formes
   (classe « …-f ») et leurs liens (« …-l ») de la même façon : vue GMF ou Cameo `data-v`, élément `data-sem`.
   ═══════════════════════════════════════════════════════════════════════════ */

/** État : version d'avant (auto, choisie), affichage ouvert, mode, curseur, écarts, vue partagée des dessins. */
var _capAv={auto:null, manuel:null, capPrec:false, airdChg:null, visRef:null, ouvert:false, uid:'', mode:'fondu', t:100, volet:50,
  surb:true, ecarts:[], idx:-1, vb:null, union:null, objets:null, anim:0, modifies:null, cherche:false};
/** Couleurs des écarts (fixes : lisibles sur les dessins clairs et sombres). */
const CAP_AV_COUL={ajout:'#2ea043', retrait:'#f85149', depl:'#d29922', taille:'#d29922', nom:'#388bfd', trace:'#a371f7'};
/** Genres d'écart : clé, pictogramme, libellé (ordre de la liste). */
const CAP_AV_GENRES=[['ajout','＋',_L('Ajoutés')],['retrait','－',_L('Retirés')],['depl','↔',_L('Déplacés')],['taille','⤡',_L('Redimensionnés')],['nom','✎',_L('Renommés')],['trace','〰',_L('Liens retracés')]];

/* ── Version d'avant ─────────────────────────────────────────────────────── */

/**
 * Un modèle Capella va remplacer celui affiché (appelée en tête de `capApplyXmlDoc`, 20) : si c'est une nouvelle version du même
 * fichier (même nom), l'ancien document et son .aird deviennent la version d'avant.
 * @param {Document} doc - Document qui arrive
 * @param {string} nom - Nom du fichier
 */
function capAvNoterModele(doc, nom){
  const sy=typeof _capSysml!=='undefined'&&!!_capSysml.lecture&&_capSysml.doc===doc, cap=!sy;
  if(cap&&_capAv.capPrec&&capLoaded&&cap_xmlDoc&&cap_xmlDoc!==doc&&capCurrentFileName===nom){
    const ch=_capAv.airdChg, aird=ch&&ch.doc===cap_xmlDoc?ch.texte:(typeof _capDiag!=='undefined'?_capDiag.texteAird:'');
    _capAv.auto={genre:'capella', doc:cap_xmlDoc, texte:'', aird:aird||'', nom:nom, quand:Date.now()};
  }
  _capAv.capPrec=cap; _capAv.airdChg=null; _capAv.modifies=null; _capAv.visRef=null;
  if(_capAv.ouvert) capAvFermer();   // autre version affichée : l'affichage se rouvre sur elle
}
/**
 * Le .aird va être remplacé (appelée par `capDiagSetAird`, 54) : l'ancien texte est retenu pour la version d'avant.
 * @param {string} ancien - Texte du .aird remplacé
 * @param {string} nouveau - Texte du nouveau .aird
 */
function capAvNoterAird(ancien, nouveau){
  if(!ancien||!nouveau||ancien===nouveau) return;
  _capAv.airdChg={texte:ancien, doc:cap_xmlDoc, quand:Date.now()};
  if(_capAv.auto&&_capAv.auto.genre==='capella'&&_capAv.auto.doc!==cap_xmlDoc) return;   // modèle déjà remplacé : son .aird d'avant est noté
  if(capLoaded&&cap_xmlDoc&&!(typeof _capSysml!=='undefined'&&_capSysml.lecture)) _capAv.auto={genre:'capella', doc:null, texte:'', aird:ancien, nom:capCurrentFileName, quand:Date.now()};   // .aird seul changé
  _capAv.modifies=null;
}
/**
 * Une lecture SysML / UML va remplacer celle affichée (appelée par `capSysmlAppliquer`, 87) : la lecture affichée devient la
 * version d'avant si elle est du même langage (SysML v2, ou UML / SysML v1).
 * @param {object} ancienne - `_capSysml` affiché
 * @param {string} format - Format de la lecture qui arrive
 */
function capAvNoterLecture(ancienne, format){
  const fam=f=>f==='sysml2'?'sy2':f==='reqif'?'rq':'uml';
  if(ancienne&&ancienne.lecture&&ancienne.format&&fam(ancienne.format)===fam(format)&&fam(format)!=='rq')
    _capAv.auto={genre:'lecture', lecture:ancienne.lecture, L:ancienne.L, format:ancienne.format, nom:ancienne.nom, quand:Date.now(), cache:{}};
  _capAv.modifies=null;
}
/**
 * Version chargée dans ⚖ Comparaison de versions, vue comme version d'avant du diagramme : lecture comparée (SysML, UML / SysML v1)
 * ou .aird de référence de l'onglet 🔲 Diagrammes (Capella, avec le .capella comparé s'il est l'ancienne version). Quand le modèle
 * affiché est l'ancienne version (⇄ des deux versions), elle devient la version d'après (`inverse`).
 * @returns {object|null} version (gardée tant que la comparaison ne change pas)
 */
function capAvRefComparaison(){
  const sy=typeof capDiagSy==='function'&&capDiagSy(), c=_capAv.compRef;
  if(sy){
    if(typeof capDiffLu==='undefined'||!capDiffLu||capDiffLu===_capSysml.lecture) return null;
    if(c&&c.lecture===capDiffLu&&c.inverse===!!capDiffSwap) return c;
    return _capAv.compRef={genre:'lecture', comparaison:true, lecture:capDiffLu, L:null, format:_capSysml.format, nom:capDiffName, quand:capDiffDate||0, inverse:!!capDiffSwap, cache:{}};
  }
  if(typeof _capDg==='undefined'||!_capDg.ref) return null;
  const doc=!capDiffSwap&&capDiffDoc?capDiffDoc:null;   // .capella comparé : seulement s'il est l'ancienne version, comme le .aird de référence
  if(c&&c.genre==='capella'&&c.aird===_capDg.ref&&c.doc===doc) return c;
  return _capAv.compRef={genre:'capella', comparaison:true, doc, texte:'', aird:_capDg.ref, nom:_capDg.refNom||capDiffName, quand:0};
}
/**
 * Version d'avant retenue pour le modèle affiché : choisie à la main, sinon celle de ⚖ Comparaison de versions, sinon gardée
 * d'elle-même ; celle de la comparaison d'abord quand l'affichage a été ouvert depuis elle. null si aucune ne lui va.
 * @returns {object|null}
 */
function capAvRef(){
  const sy=typeof capDiagSy==='function'&&capDiagSy(), comp=capAvRefComparaison();
  for(const r of _capAv.prefComp?[comp, _capAv.manuel, _capAv.auto]:[_capAv.manuel, comp, _capAv.auto]) if(r&&(sy?r.genre==='lecture':r.genre==='capella')) return r;
  return null;
}
/** Nom affiché de la version d'avant. @param {object} r @returns {string} */
function capAvRefNom(r){ return r?(r.nom||'')+(r.quand?' — '+capWatchTime(r.quand):''):''; }

/**
 * Choisit à la main la version d'avant : .capella et / ou .aird (Capella), .sysml / .kpar (SysML v2), fichiers UML / SysML v1
 * (.uml + .notation, .xmi, .mdzip, .qea).
 */
function capAvChoisir(){
  const inp=document.createElement('input'); inp.type='file'; inp.multiple=true;
  inp.accept='.capella,.melodymodeller,.aird,.sysml,.kpar,.uml,.notation,.xmi,.mdzip,.qea';
  inp.onchange=async()=>{ const fs=[...inp.files]; if(!fs.length) return;
    try{ await capAvLireFichiers(fs); capToast(_L('✔ Version d\'avant choisie')); _capAv.modifies=null; if(_capAv.ouvert) capAvRendre(); }
    catch(e){ capAlert(_L('Version d\'avant illisible : ')+(e&&e.message||e), {level:'err'}); } };
  inp.click();
}
/**
 * Lit les fichiers d'une version d'avant choisie à la main et la retient.
 * @param {File[]} fs - Fichiers
 */
async function capAvLireFichiers(fs){
  const ext=f=>(f.name.split('.').pop()||'').toLowerCase();
  const cap=fs.find(f=>['capella','melodymodeller'].includes(ext(f))), aird=fs.find(f=>ext(f)==='aird');
  const sy=fs.filter(f=>['sysml','kpar'].includes(ext(f))), uml=fs.filter(f=>['uml','notation','xmi','mdzip','qea'].includes(ext(f)));
  if(cap||aird){
    if(!aird) throw new Error(_L('choisissez aussi le .aird de cette version (les diagrammes y sont)'));
    _capAv.manuel={genre:'capella', doc:null, texte:cap?await cap.text():'', aird:await aird.text(), nom:(cap||aird).name, quand:0}; return;
  }
  if(sy.length){
    if(!capSysmlDispo()) throw new Error(_L('lecteur SysML v2 absent de cette version'));
    let lec;
    if(sy.length===1) lec=await capSysmlLireFichier(sy[0]);
    else { const textes=[]; for(const f of sy) textes.push({chemin:f.name, texte:await f.text()}); lec=ArcatureLecteurSysml.lireDossier(textes, sy[0].name); }
    _capAv.manuel={genre:'lecture', lecture:lec, L:null, format:'sysml2', nom:sy.length===1?sy[0].name:_L(`${sy.length} fichiers .sysml`), quand:0, cache:{}}; return;
  }
  if(uml.length){
    if(!capUmlDispo()) throw new Error(_L('lecteur UML / SysML v1 absent de cette version'));
    const lus=[]; for(const f of uml) lus.push({chemin:f.name, octets:await capUmlOctets(f)});
    const lec=await window.ArcatureLecteurUml.lireDossier(lus, uml[0].name);
    _capAv.manuel={genre:'lecture', lecture:lec, L:window.ArcatureLecteurUml, format:'uml', nom:uml.map(f=>f.name).join(' + '), quand:0, cache:{}}; return;
  }
  throw new Error(_L('aucun fichier de modèle reconnu'));
}

/* ── Dessins des deux versions ───────────────────────────────────────────── */

/**
 * SVG du diagramme dans la version affichée et dans la version d'avant.
 * @param {string} uid - Représentation (Capella) ou « sy:<clé> » (vue d'un lecteur)
 * @param {object} ref - Version d'avant (capAvRef)
 * @returns {{apres:string, avant:string}} '' : diagramme absent de cette version
 */
function capAvSvgs(uid, ref){
  if(String(uid).startsWith('sy:')){
    const cle=uid.slice(3), th=capSyTheme(), doc=v=>{ try{ return v&&typeof v.svgDocument==='function'?capSyDocument(v, th).replace(/^\s*<\?xml[^>]*>\s*/,''):''; }catch(e){ console.warn('⇄',e); return ''; } };
    let av=null; try{ av=ref.lecture.vue(cle)||null; }catch(e){ av=null; }
    const ici=doc(capSyVue(cle)), la=doc(av);
    return ref.inverse?{apres:la, avant:ici}:{apres:ici, avant:la};   // modèle affiché = ancienne version de la comparaison
  }
  const v=_capDiag.vis; if(!v||typeof v.reference!=='function') throw new Error(_L('visionneuse sans comparaison : reprenez-la d\'Arcature'));
  if(_capAv.visRef!==ref){
    const txt=ref.texte||(ref.doc?(ref.serial||(ref.serial=new XMLSerializer().serializeToString(ref.doc))):'');
    v.reference(txt||null, ref.aird, ref.nom); _capAv.visRef=ref;
  }
  return {apres:v.svg(uid), avant:v.svg(uid, {reference:true})};
}

/** Rend uniques les identifiants d'un SVG inséré dans la page (définitions, marqueurs, dégradés). @param {string} s @param {string} p - Préfixe @returns {string} */
function capAvIds(s, p){
  return String(s||'').replace(/(\s)id="([^"]+)"/g, `$1id="${p}-$2"`).replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`).replace(/((?:xlink:)?href)="#([^"]+)"/g, `$1="#${p}-$2"`);
}

/**
 * Objets dessinés d'un SVG : formes (classe « …-f »), liens (« …-l ») et étiquettes posées à part (« …-tb », data-symbole
 * « etiquette » : libellés des liens de Cameo), avec leur clé d'appariement (vue `data-v`, sinon élément `data-sem` et rang,
 * sinon `data-forme` / `data-lien`), leur boîte, leur texte et la signature de leur tracé.
 * @param {SVGSVGElement} svg - Dessin inséré dans la page
 * @returns {Map<string, object>} clé → {el, lien, etiq, sem, bb:{x,y,w,h}, txt, trace, parent}
 */
function capAvObjets(svg){
  const m=new Map(), rangs=new Map(), est=(el,k)=>[...el.classList].some(c=>new RegExp(`^[a-z0-9]+-${k}$`).test(c));
  const etiq=g=>est(g,'tb')||g.getAttribute('data-symbole')==='etiquette';
  const els=[...svg.querySelectorAll('g')].filter(g=>est(g,'f')||est(g,'l')||etiq(g));
  const racine=svg.getScreenCTM();
  els.forEach(el=>{
    const et=!est(el,'f')&&!est(el,'l')&&etiq(el), lien=!et&&est(el,'l'), sem=el.getAttribute('data-sem')||'', v=el.getAttribute('data-v')||'';
    let cle=v?(et?'e:':'v:')+v:'';
    if(!cle&&sem){ const n=(rangs.get(sem)||0)+1; rangs.set(sem,n); cle='s:'+sem+'#'+n; }
    if(!cle) cle='i:'+(el.getAttribute('data-forme')||el.getAttribute('data-lien')||m.size);
    if(m.has(cle)) cle+='~'+m.size;
    let bb={x:0,y:0,w:0,h:0};
    try{ const b=el.getBBox(), c=el.getScreenCTM(); if(c&&racine){ const r=racine.inverse().multiply(c); const p=(x,y)=>({x:r.a*x+r.c*y+r.e, y:r.b*x+r.d*y+r.f}); const a=p(b.x,b.y), z=p(b.x+b.width,b.y+b.height);
      bb={x:Math.min(a.x,z.x), y:Math.min(a.y,z.y), w:Math.abs(z.x-a.x), h:Math.abs(z.y-a.y)}; } else bb={x:b.x,y:b.y,w:b.width,h:b.height}; }catch(e){ /* objet sans boîte */ }
    const txt=[...el.querySelectorAll('text')].map(t=>t.textContent).join(' ').replace(/\s+/g,' ').trim();
    const trace=lien?[...el.querySelectorAll('path,polyline,line')].map(p=>(p.getAttribute('d')||p.getAttribute('points')||[p.getAttribute('x1'),p.getAttribute('y1'),p.getAttribute('x2'),p.getAttribute('y2')].join(' ')).replace(/-?\d+\.?\d*/g,x=>String(Math.round(+x)))).join('|'):'';
    let parent=null; for(let p=el.parentElement; p&&p!==svg; p=p.parentElement) if(p.tagName.toLowerCase()==='g'&&(est(p,'f')||est(p,'l'))){ parent=p; break; }
    m.set(cle, {cle, el, lien, etiq:et, sem, bb, txt, trace, parent});
  });
  return m;
}

/**
 * Écarts entre les objets d'avant et d'après : ajoutés, retirés, déplacés, redimensionnés, renommés, liens retracés. Un objet
 * qui ne fait que suivre son conteneur déplacé (même décalage, contenu dans sa boîte) n'est pas listé à part.
 * @param {Map} A - Objets d'après (capAvObjets)
 * @param {Map} B - Objets d'avant
 * @returns {object[]} écarts {cle, genres:Set, a, b, nom, suit}
 */
function capAvEcarts(A, B){
  const out=[], tol=1.5, prop=new Map();
  const dans=(p,q)=>q.x<=p.x+0.5&&q.y<=p.y+0.5&&q.x+q.w>=p.x+p.w-0.5&&q.y+q.h>=p.y+p.h-0.5;
  A.forEach((a,k)=>{
    const b=B.get(k);
    if(!b){ out.push({cle:k, genres:new Set(['ajout']), a, b:null}); return; }
    const g=new Set();
    if(a.lien){ if(a.trace!==b.trace) g.add('trace'); }
    else if(a.etiq){ if(Math.abs(a.bb.x-b.bb.x)>3||Math.abs(a.bb.y-b.bb.y)>3) g.add('depl'); }   // étiquette : son texte et sa place seulement
    else {
      if(Math.abs(a.bb.x-b.bb.x)>tol||Math.abs(a.bb.y-b.bb.y)>tol) g.add('depl');
      if(Math.abs(a.bb.w-b.bb.w)>tol||Math.abs(a.bb.h-b.bb.h)>tol) g.add('taille');
    }
    if(a.txt!==b.txt) g.add('nom');
    if(g.size) out.push({cle:k, genres:g, a, b});
  });
  B.forEach((b,k)=>{ if(!A.has(k)) out.push({cle:k, genres:new Set(['retrait']), a:null, b}); });
  // Objets qui suivent un conteneur déplacé : même décalage que la plus petite forme déplacée qui les contenait
  const depl=out.filter(e=>e.a&&e.b&&!e.a.lien&&e.genres.has('depl')).sort((x,y)=>x.b.bb.w*x.b.bb.h-y.b.bb.w*y.b.bb.h);
  out.forEach(e=>{
    if(!e.a||!e.b||e.genres.has('nom')||e.genres.has('taille')) return;
    const dx=e.a.bb.x-e.b.bb.x, dy=e.a.bb.y-e.b.bb.y;
    if(!(e.genres.has('depl')||e.genres.has('trace'))) return;
    const c=depl.find(p=>p!==e&&p.b.bb.w*p.b.bb.h>e.b.bb.w*e.b.bb.h&&dans(e.b.bb,p.b.bb)&&Math.abs((p.a.bb.x-p.b.bb.x)-dx)<=tol&&Math.abs((p.a.bb.y-p.b.bb.y)-dy)<=tol&&(!e.a.lien||(Math.abs(e.a.bb.w-e.b.bb.w)<=tol&&Math.abs(e.a.bb.h-e.b.bb.h)<=tol)));
    if(c) e.suit=c.cle;
  });
  // Objets contenus dans une forme ajoutée (ou retirée) : comptés sous la plus petite qui les contient
  const aire=e=>{ const o=e.a||e.b; return o.bb.w*o.bb.h; }, bb=e=>(e.a||e.b).bb;
  const nouv=out.filter(e=>!e.suit&&!(e.a||e.b).lien&&(e.genres.has('ajout')||e.genres.has('retrait'))).sort((x,y)=>aire(x)-aire(y));
  out.forEach(e=>{ if(e.suit||!(e.genres.has('ajout')||e.genres.has('retrait'))) return;
    const c=nouv.find(p=>p!==e&&p.genres.has([...e.genres][0])&&aire(p)>aire(e)&&dans(bb(e),bb(p))); if(c) e.suit=c.cle; });
  // Vue de plus (ou de moins) d'un élément déjà dessiné dans l'autre version (barre d'activation, deuxième vue) : secondaire
  const semDe=M=>new Set([...M.values()].map(o=>o.sem).filter(Boolean)), semA=semDe(A), semB=semDe(B);
  out.forEach(e=>{ const o=e.a||e.b; if(!o.lien&&!o.etiq&&o.sem&&((e.genres.has('ajout')&&semB.has(o.sem))||(e.genres.has('retrait')&&semA.has(o.sem)))) e.sec=true; });
  // Liens qui ne font que suivre une forme qui a changé (retracés, ou ajoutés / retirés avec elle) : comptés sous elle
  const touche=(p,q)=>p.x<=q.x+q.w+3&&q.x<=p.x+p.w+3&&p.y<=q.y+q.h+3&&q.y<=p.y+p.h+3;
  const formes=out.filter(e=>!e.suit&&!e.sec&&!(e.a||e.b).lien&&!(e.a||e.b).etiq&&(e.genres.has('depl')||e.genres.has('taille')||e.genres.has('ajout')||e.genres.has('retrait')));
  out.forEach(e=>{ const o=e.a||e.b; if(e.suit||!o.lien||e.genres.has('nom')) return;
    const g=[...e.genres][0], c=formes.find(f=>(g==='trace'?(f.genres.has('depl')||f.genres.has('taille')||f.genres.has('ajout')||f.genres.has('retrait')):f.genres.has(g))
      &&((e.a&&touche(e.a.bb,(f.a||f.b).bb))||(e.b&&touche(e.b.bb,(f.b||f.a).bb))));
    if(c) e.suit=c.cle; });
  // Vues secondaires rangées sous le lien ajouté (ou retiré) qui les touche ; étiquettes déplacées sous ce qui a changé à côté
  const liens=out.filter(e=>!e.suit&&(e.a||e.b).lien&&(e.genres.has('ajout')||e.genres.has('retrait')));
  out.forEach(e=>{ if(e.suit||!e.sec) return; const g=[...e.genres][0], c=liens.find(l=>l.genres.has(g)&&touche(bb(l),bb(e))); if(c) e.suit=c.cle; });
  const changes=out.filter(e=>!(e.a||e.b).etiq);   // objets entraînés compris : l'étiquette suit alors leur chef de file
  out.forEach(e=>{ const o=e.a||e.b; if(e.suit||!o.etiq||e.genres.has('nom')) return; const c=changes.find(f=>touche(bb(f),bb(e))||(e.b&&f.b&&touche(f.b.bb,e.b.bb))); if(c) e.suit=c.cle; });
  const parCle=new Map(out.map(e=>[e.cle,e]));
  out.forEach(e=>{ let r=e.suit, n=0; while(r&&parCle.get(r)&&parCle.get(r).suit&&n++<50) r=parCle.get(r).suit; if(r) e.suit=r; });   // rattaché à l'écart listé
  out.forEach(e=>{ if(e.suit) prop.set(e.suit,(prop.get(e.suit)||0)+1); });
  out.forEach(e=>{ e.nb=prop.get(e.cle)||0; });
  return out;
}

/**
 * Nom lisible d'un objet : nom de l'élément (modèle affiché, sinon version d'avant), sinon texte dessiné de l'objet ou d'une autre
 * vue du même élément (tête d'une ligne de vie), sinon « (sans nom) » ; les noms de remplacement « ‹Type› » ne comptent pas.
 * @param {object} e - Écart
 * @returns {{nom:string, type:string}}
 */
function capAvNom(e){
  const o=e.a||e.b, sem=o.sem, vrai=n=>{ n=String(n||'').trim(); return n&&!/^‹[^›]*›$/.test(n)?n:''; };
  const dessin=()=>{ if(o.txt) return o.txt; const O=_capAv.objets; if(sem&&O) for(const M of [O.A, O.B]) for(const x of M.values()) if(x.sem===sem&&x.txt) return x.txt; return ''; };
  const nommer=(n, type)=>({nom:vrai(n)||dessin()||_L('(sans nom)'), type});
  if(sem){
    const el=capGetElementById_(sem); if(el) return nommer(el.attrs.name||el.name, capAnaHuman(el.typeName));
    const r=capAvRef(); if(r&&r.genre==='lecture'){ try{ const x=r.lecture.element(sem); if(x) return nommer(x.nom||x.name, x.type||x.metaclasse||''); }catch(err){ /* élément inconnu */ } }
    if(r&&r.genre==='capella'&&r.doc){ const x=r.doc.querySelector(`[id="${CSS.escape(sem)}"]`); if(x) return nommer(capXName(x), capAnaHuman(capTName(x))); }
  }
  return {nom:o.txt||(o.etiq?_L('(étiquette)'):o.lien?_L('(lien)'):_L('(forme)')), type:o.etiq?_L('étiquette'):''};
}

/* ── Affichage ───────────────────────────────────────────────────────────── */

/** Bouton ⇄ de la barre de 🔲 Diagrammes. @returns {string} HTML */
function capAvBouton(){
  return `<button class="tbtn${_capAv.ouvert?' active':''}" id="cdg-avap" onclick="capAvBasculer()" title="${_L('Avant / après : écarts du diagramme ouvert avec une version d\'avant (fondu, volet, surbrillance des éléments ajoutés, retirés, déplacés, renommés)')}">${_L('⇄ Avant / après')}</button>`;
}

/** Ouvre ou ferme l'affichage avant / après du diagramme ouvert. */
function capAvBasculer(){ if(_capAv.ouvert) capAvFermer(); else capAvOuvrir(); }

/** Ouvre l'affichage avant / après sur le diagramme ouvert. */
function capAvOuvrir(){
  if(!_capDiag.actif){ capToast(_L('Ouvrez d\'abord un diagramme.')); return; }
  _capAv.ouvert=true; _capAv.uid=''; capAvRendre();
  const b=document.getElementById('cdg-avap'); if(b) b.classList.add('active');
}
/** Ferme l'affichage avant / après. */
function capAvFermer(){
  _capAv.ouvert=false; _capAv.uid=''; _capAv.prefComp=false; _capAv.tournee=null; capAvAnimer(false);
  const o=document.getElementById('cav'); if(o) o.remove();
  const b=document.getElementById('cdg-avap'); if(b) b.classList.remove('active');
}
/** Le diagramme ouvert a changé (explorateur, liens) : l'affichage avant / après le suit. */
function capAvSuivre(){ if(_capAv.ouvert&&_capDiag.actif&&_capDiag.actif!==_capAv.uid) capAvRendre(); }

/** Place la surimpression sur la zone du dessin (à droite de l'explorateur). @param {HTMLElement} o */
function capAvPlacer(o){
  const corps=document.querySelector('#cap-view-diag .cdg-corps'), h=document.getElementById(capDiagSy()?'cdg-sy':'cdg-hote');
  if(!corps||!h) return;
  o.style.left=h.offsetLeft+'px';
}

/** Dessine l'affichage avant / après du diagramme ouvert (barre, dessins, marques, liste). */
function capAvRendre(){
  const corps=document.querySelector('#cap-view-diag .cdg-corps'); if(!corps){ capAvFermer(); return; }
  let o=document.getElementById('cav');
  if(!o){ o=document.createElement('div'); o.id='cav'; o.className='cav'; corps.appendChild(o); }
  capAvPlacer(o);
  const uid=_capDiag.actif, ref=capAvRef(); _capAv.uid=uid; _capAv.refRendue=ref; _capAv.idx=-1; capAvAnimer(false);
  const tete=`<div class="cav-barre" id="cav-barre"></div>`;
  if(!ref){
    o.innerHTML=tete+`<div class="phl-empty" style="margin:30px auto;max-width:640px;text-align:left;line-height:1.6">${_L('<b>Aucune version d\'avant pour ce modèle.</b><br>Elle est gardée d\'elle-même quand le modèle ou le .aird est remplacé par une version plus récente du même fichier (🔄 suivi du fichier, réouverture, 📁 dossier du projet). Vous pouvez aussi la choisir : .capella et .aird d\'une autre version, .sysml / .kpar, fichiers UML / SysML v1.')}</div>`;
    capAvBarre(null); return;
  }
  let S;
  try{ S=capAvSvgs(uid, ref); }catch(e){ o.innerHTML=tete+`<div class="phl-empty">${capEsc(e.message||String(e))}</div>`; capAvBarre(ref); return; }
  if(!S.apres){ o.innerHTML=tete+`<div class="phl-empty">${_L('Ce diagramme ne peut pas être comparé (tableau, matrice ou vue sans dessin).')}</div>`; capAvBarre(ref); return; }
  o.innerHTML=tete+`<div class="cav-corps"><div class="cav-scene" id="cav-scene"><div class="cav-calque" id="cav-a">${capAvIds(S.apres,'cava')}</div>`+
    `<div class="cav-calque" id="cav-b">${capAvIds(S.avant,'cavb')}</div><svg class="cav-marques" id="cav-m" xmlns="http://www.w3.org/2000/svg"></svg>`+
    `<div class="cav-poignee" id="cav-poignee" title="${_L('Glisser : avant à gauche, après à droite')}"><span>${_L('Avant')}</span><span>${_L('Après')}</span></div></div>`+
    `<aside class="cav-liste" id="cav-liste"></aside></div>`;
  const sa=o.querySelector('#cav-a svg'), sb=o.querySelector('#cav-b svg');
  [sa,sb].forEach(s=>{ if(!s) return; s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('preserveAspectRatio','xMidYMid meet'); });
  const vb=s=>{ const v=s&&(s.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number); return v&&v.length===4&&v.every(isFinite)?{x:v[0],y:v[1],w:v[2],h:v[3]}:null; };
  const va=vb(sa), vbB=vb(sb), u=[va,vbB].filter(Boolean);
  const x0=Math.min(...u.map(v=>v.x)), y0=Math.min(...u.map(v=>v.y)), x1=Math.max(...u.map(v=>v.x+v.w)), y1=Math.max(...u.map(v=>v.y+v.h));
  _capAv.union={x:x0, y:y0, w:x1-x0, h:y1-y0}; _capAv.vb={..._capAv.union};
  capAvVue();
  const A=sa?capAvObjets(sa):new Map(), B=sb?capAvObjets(sb):new Map();
  _capAv.objets={A, B, sa, sb};
  _capAv.ecarts=capAvEcarts(A, B);
  _capAv.ecarts.forEach(e=>{ const n=capAvNom(e); e.nom=n.nom; e.type=n.type; });
  if(!S.avant) _capAv.absent=true; else _capAv.absent=false;
  capAvBarre(ref);
  capAvListe();
  capAvMarques();
  capAvAppliquer();
  capAvBrancher(o);
}

/** Barre de l'affichage : mode, curseur, surbrillance, ◀ ▶, ajuster, version d'avant, diagrammes modifiés, fermer. @param {?object} ref */
function capAvBarre(ref){
  const b=document.getElementById('cav-barre'); if(!b) return;
  const n=_capAv.ecarts.filter(e=>!e.suit).length, fondu=_capAv.mode==='fondu';
  b.innerHTML=(ref?`<span class="tb-grp"><button class="tbtn${fondu?' active':''}" data-cav="fondu" title="${_L('Fondu : le dessin d\'après, dont seuls les écarts bougent avec le curseur (apparaissent, s\'effacent, glissent de leur ancienne place)')}">${_L('◐ Fondu')}</button>`+
      `<button class="tbtn${fondu?'':' active'}" data-cav="volet" title="${_L('Volet : les deux dessins entiers, avant à gauche de la barre, après à droite')}">${_L('◧ Volet')}</button></span>`+
      `<label class="cav-curseur" title="${fondu?_L('Glisser de la version d\'avant (à gauche) à celle d\'après (à droite)'):_L('Position de la barre du volet')}"><span>${_L('Avant')}</span><input type="range" id="cav-t" min="0" max="100" value="${fondu?_capAv.t:_capAv.volet}"><span>${_L('Après')}</span></label>`+
      (fondu?`<button class="tbtn" id="cav-anim" title="${_L('Animer : aller et retour entre avant et après')}">${_capAv.anim?'⏸':'▶'}</button>`:'')+
      `<label class="cav-case"><input type="checkbox" id="cav-surb"${_capAv.surb?' checked':''}> ${_L('Surbrillance')}</label>`+
      `<span class="tb-grp"><button class="tbtn" id="cav-prec" title="${_L('Écart précédent')}">◀</button><span class="cav-pos" id="cav-pos">${n?`${_capAv.idx+1>0?_capAv.idx+1:'–'} / ${n}`:_L('aucun écart')}</span><button class="tbtn" id="cav-suiv" title="${_L('Écart suivant')}">▶</button></span>`+
      `<button class="tbtn" id="cav-ajuster" title="${_L('Tout le diagramme')}">⤢</button>`:'')+
    capAvTourneeHtml()+
    `<span class="cav-ref">${ref?(ref.inverse?_L(`Après : <b>${capEsc(capAvRefNom(ref))}</b> (le modèle affiché est l'ancienne version)`):_L(`Avant : <b>${capEsc(capAvRefNom(ref))}</b>`))+(ref.comparaison?` <span class="ana-dim" title="${_L('Version chargée dans ⚖ Comparaison de versions')}">⚖</span>`:''):''}${_capAv.absent&&ref?(ref.inverse?_L(' — <i>diagramme absent de la nouvelle version</i>'):_L(' — <i>diagramme absent de cette version</i>')):''}</span>`+
    `<button class="tbtn" id="cav-choisir" title="${_L('Choisir la version d\'avant : .capella et .aird, .sysml / .kpar, fichiers UML / SysML v1')}">${_L('📂 Version d\'avant…')}</button>`+
    (ref?`<button class="tbtn" id="cav-modifies" title="${_L('Chercher les diagrammes qui diffèrent de la version d\'avant')}">${_L('🔎 Diagrammes modifiés')}</button>`:'')+
    `<button class="tbtn" id="cav-fermer" title="${_L('Fermer l\'affichage avant / après')}">✕</button>`;
}

/** Liste des écarts, par genre (les objets qui suivent leur conteneur sont comptés sous lui). */
function capAvListe(){
  const l=document.getElementById('cav-liste'); if(!l) return;
  const E=_capAv.ecarts.filter(e=>!e.suit);
  if(!E.length){ l.innerHTML=`<div class="cav-vide">${_capAv.absent?_L('Diagramme absent de la version d\'avant.'):_L('✔ Aucun écart avec la version d\'avant.')}</div>`+capAvModifiesHtml(); return; }
  let h='';
  CAP_AV_GENRES.forEach(([g,ic,lib])=>{
    const xs=E.filter(e=>[...e.genres][0]===g); if(!xs.length) return;
    h+=`<div class="cav-gr"><span style="color:${CAP_AV_COUL[g]}">${ic}</span> ${capEsc(lib)} <span class="ana-dim">${xs.length}</span></div>`+
      xs.map(e=>{ const i=E.indexOf(e), d=capAvDetail(e);
        return `<div class="cav-it${i===_capAv.idx?' actif':''}" data-cav-i="${i}" title="${capEsc(e.type||'')}${e.a&&e.a.sem||e.b&&e.b.sem?' — '+_L('double-clic : panneau de détail'):''}"><span class="cav-pastille" style="background:${CAP_AV_COUL[[...e.genres][0]]}"></span>`+
          `<span class="cav-nom">${capEsc(e.nom)}</span>${d?`<span class="cav-det">${capEsc(d)}</span>`:''}</div>`; }).join('');
  });
  l.innerHTML=h+capAvModifiesHtml();
}
/** Détail d'un écart (décalage, nouvelle taille, ancien nom, éléments emportés). @param {object} e @returns {string} */
function capAvDetail(e){
  const p=[];
  if(e.genres.has('depl')) p.push(_L(`déplacé de ${Math.round(Math.hypot(e.a.bb.x-e.b.bb.x, e.a.bb.y-e.b.bb.y))} px`));
  if(e.genres.has('taille')) p.push(_L(`${Math.round(e.b.bb.w)}×${Math.round(e.b.bb.h)} → ${Math.round(e.a.bb.w)}×${Math.round(e.a.bb.h)}`));
  if(e.genres.has('nom')&&e.b){ const t=e.b.txt.length>48?e.b.txt.slice(0,47)+'…':e.b.txt; p.push(_L(`avant : « ${t} »`)); }
  if(e.genres.has('trace')&&e.a&&e.a.lien&&!e.genres.has('nom')) p.push(_L('tracé changé'));
  if(e.nb) p.push(_L(`et ${e.nb} élément(s) entraîné(s)`));
  if(e.type&&(!p.length||e.nom===_L('(sans nom)'))) p.unshift(e.type);
  return p.join(' · ');
}

/** Pose la vue partagée (viewBox) sur les deux dessins et les marques. */
function capAvVue(){
  const v=_capAv.vb; if(!v) return;
  ['#cav-a svg','#cav-b svg','#cav-m'].forEach(s=>{ const e=document.querySelector(s); if(e){ e.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`); e.setAttribute('preserveAspectRatio','xMidYMid meet'); } });
}

/** Marques des écarts (boîtes colorées, ancienne place en pointillé et trait jusqu'à la nouvelle). */
function capAvMarques(){
  const m=document.getElementById('cav-m'); if(!m) return;
  const r=(bb,c,cls,dash)=>`<rect class="${cls}" x="${bb.x-4}" y="${bb.y-4}" width="${bb.w+8}" height="${bb.h+8}" rx="5" fill="none" stroke="${c}" stroke-width="2.5" vector-effect="non-scaling-stroke"${dash?' stroke-dasharray="6 4"':''}/>`;
  m.innerHTML=_capAv.ecarts.filter(e=>!e.suit).map((e,i)=>{
    const g=[...e.genres][0], c=CAP_AV_COUL[g];
    let s='';
    if(e.a&&e.b&&(e.genres.has('depl')||e.genres.has('taille'))){
      const ca={x:e.a.bb.x+e.a.bb.w/2, y:e.a.bb.y+e.a.bb.h/2}, cb={x:e.b.bb.x+e.b.bb.w/2, y:e.b.bb.y+e.b.bb.h/2};
      s+=r(e.b.bb,c,'cav-m-avant',true)+`<line x1="${cb.x}" y1="${cb.y}" x2="${ca.x}" y2="${ca.y}" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;
    }
    s+=r((e.a||e.b).bb,c,'cav-m-cadre',g==='retrait');
    return `<g class="cav-m" data-cav-i="${i}">${s}</g>`;
  }).join('');
  m.style.display=_capAv.surb?'':'none';
}

/**
 * Applique le curseur : en fondu, opacités des écarts et glissement des formes déplacées ou redimensionnées (de leur boîte
 * d'avant à celle d'après, conteneurs imbriqués compensés) ; en volet, découpe des deux dessins à la position de la barre.
 */
function capAvAppliquer(){
  const O=_capAv.objets; if(!O) return;
  const a=document.getElementById('cav-a'), b=document.getElementById('cav-b'), p=document.getElementById('cav-poignee');
  const t=_capAv.t/100, fondu=_capAv.mode==='fondu';
  O.A.forEach(o=>{ o.el.style.opacity=''; o.el.removeAttribute('transform'); });
  O.B.forEach(o=>{ o.el.style.opacity=''; o.el.style.visibility=''; });
  if(O.sb) O.sb.style.visibility='';
  if(!fondu){
    a.style.clipPath=`inset(0 0 0 ${_capAv.volet}%)`; b.style.clipPath=`inset(0 ${100-_capAv.volet}% 0 0)`; b.style.display='';
    p.style.display=''; p.style.left=_capAv.volet+'%'; return;
  }
  a.style.clipPath=''; b.style.clipPath=''; p.style.display='none';
  // Dessin d'avant : seulement ce qui s'efface (retirés, liens retracés, renommés), le reste caché
  if(O.sb){ O.sb.style.visibility='hidden'; }
  const fondus=new Set();
  _capAv.ecarts.forEach(e=>{
    if(e.genres.has('retrait')&&e.b){ e.b.el.style.visibility='visible'; e.b.el.style.opacity=String(1-t); }
    else if(e.a&&e.b&&(e.genres.has('trace')||(e.genres.has('nom')&&!e.genres.has('depl')&&!e.genres.has('taille')))){ e.b.el.style.visibility='visible'; e.b.el.style.opacity=String(1-t); e.a.el.style.opacity=String(t); fondus.add(e.a.el); }
    if(e.genres.has('ajout')&&e.a) e.a.el.style.opacity=String(t);
  });
  // Glissement : chaque objet est mené de sa boîte d'avant à celle d'après ; un objet dans un groupe déjà déplacé est compensé
  if(t>=1) return;
  const lerp=(x,y)=>x+(y-x)*t, abs=new Map();
  const carte=(o)=>{   // application absolue (s, t) de la boîte d'après vers la boîte intermédiaire
    const e=_capAv.ecarts.find(x=>x.a===o); if(!e||!e.b||o.lien||!(e.genres.has('depl')||e.genres.has('taille'))) return null;
    const A_=o.bb, B_=e.b.bb, w=lerp(B_.w,A_.w), h=lerp(B_.h,A_.h), x=lerp(B_.x,A_.x), y=lerp(B_.y,A_.y);
    const sx=A_.w>0?w/A_.w:1, sy=A_.h>0?h/A_.h:1; return {sx, sy, tx:x-sx*A_.x, ty:y-sy*A_.y};
  };
  O.A.forEach(o=>{
    const M=carte(o), P=o.parent?abs.get(o.parent):null;
    if(!M&&!P) return;
    const m=M||{sx:1,sy:1,tx:0,ty:0}; abs.set(o.el, m);
    const l=P?{sx:m.sx/P.sx, sy:m.sy/P.sy, tx:(m.tx-P.tx)/P.sx, ty:(m.ty-P.ty)/P.sy}:m;
    o.el.setAttribute('transform', `matrix(${l.sx} 0 0 ${l.sy} ${l.tx} ${l.ty})`);
  });
}

/** Ajuste la vue à tout le diagramme. */
function capAvAjuster(){ if(_capAv.union){ const u=_capAv.union, m=Math.max(u.w,u.h)*0.03; _capAv.vb={x:u.x-m, y:u.y-m, w:u.w+2*m, h:u.h+2*m}; capAvVue(); } }

/**
 * Centre la vue sur un écart et le fait clignoter.
 * @param {number} i - Rang dans la liste des écarts (hors objets qui suivent leur conteneur)
 */
function capAvAller(i){
  const E=_capAv.ecarts.filter(e=>!e.suit); if(!E.length) return;
  _capAv.idx=(i+E.length)%E.length;
  const e=E[_capAv.idx], bs=[e.a&&e.a.bb, e.b&&e.b.bb].filter(Boolean);
  const x0=Math.min(...bs.map(b=>b.x)), y0=Math.min(...bs.map(b=>b.y)), x1=Math.max(...bs.map(b=>b.x+b.w)), y1=Math.max(...bs.map(b=>b.y+b.h));
  const sc=document.getElementById('cav-scene'), r=sc?sc.clientWidth/Math.max(1,sc.clientHeight):1.6;
  let w=Math.max(x1-x0, 120)*3, h=Math.max(y1-y0, 80)*3; if(w/h>r) h=w/r; else w=h*r;
  _capAv.vb={x:(x0+x1)/2-w/2, y:(y0+y1)/2-h/2, w, h}; capAvVue();
  document.querySelectorAll('#cav-liste .cav-it').forEach(x=>x.classList.toggle('actif', +x.dataset.cavI===_capAv.idx));
  const it=document.querySelector(`#cav-liste .cav-it[data-cav-i="${_capAv.idx}"]`); if(it) it.scrollIntoView({block:'nearest'});
  const mk=document.querySelector(`#cav-m .cav-m[data-cav-i="${_capAv.idx}"]`);
  if(mk){ mk.classList.remove('cav-pulse'); void mk.getBoundingClientRect(); mk.classList.add('cav-pulse'); }
  const pos=document.getElementById('cav-pos'); if(pos) pos.textContent=`${_capAv.idx+1} / ${E.length}`;
}

/** Lance ou arrête l'animation aller-retour du fondu. @param {boolean} oui */
function capAvAnimer(oui){
  if(_capAv.anim){ cancelAnimationFrame(_capAv.anim); _capAv.anim=0; }
  if(!oui) return;
  const t0=performance.now();
  const pas=now=>{ const k=((now-t0)/1800)%2; _capAv.t=Math.round(100*(k<1?k:2-k)); const r=document.getElementById('cav-t'); if(r) r.value=_capAv.t; capAvAppliquer(); _capAv.anim=requestAnimationFrame(pas); };
  _capAv.anim=requestAnimationFrame(pas);
}

/** Branche les commandes (barre, curseur, molette, glisser, clics sur la liste et le dessin). @param {HTMLElement} o */
function capAvBrancher(o){
  const sc=o.querySelector('#cav-scene');
  o.onclick=e=>{
    const t=e.target.closest('[data-cav],#cav-anim,#cav-prec,#cav-suiv,#cav-ajuster,#cav-choisir,#cav-modifies,#cav-fermer,[data-cav-i],[data-cav-uid],[data-cav-tour]'); if(!t) return;
    if(t.dataset.cavTour){ capAvTourneeAller(t.dataset.cavTour); return; }
    if(t.dataset.cav){ _capAv.mode=t.dataset.cav; capAvAnimer(false); capAvBarre(capAvRef()); capAvAppliquer(); }
    else if(t.id==='cav-anim'){ capAvAnimer(!_capAv.anim); t.textContent=_capAv.anim?'⏸':'▶'; }
    else if(t.id==='cav-prec') capAvAller(_capAv.idx-1);
    else if(t.id==='cav-suiv') capAvAller(_capAv.idx+1);
    else if(t.id==='cav-ajuster') capAvAjuster();
    else if(t.id==='cav-choisir') capAvChoisir();
    else if(t.id==='cav-modifies') capAvChercherModifies();
    else if(t.id==='cav-fermer') capAvFermer();
    else if(t.dataset.cavUid) capDiagOuvrirUid(t.dataset.cavUid);
    else if(t.dataset.cavI!=null&&t.closest('#cav-liste')) capAvAller(+t.dataset.cavI);
  };
  o.ondblclick=e=>{ const t=e.target.closest('#cav-liste [data-cav-i]'); if(!t) return; const x=_capAv.ecarts.filter(z=>!z.suit)[+t.dataset.cavI], s=x&&((x.a&&x.a.sem)||(x.b&&x.b.sem)); if(s&&capGetElementById_(s)) capOpenDetailById(s); };
  o.oninput=e=>{ if(e.target.id!=='cav-t') return; const v=+e.target.value; if(_capAv.mode==='fondu'){ capAvAnimer(false); const a=document.getElementById('cav-anim'); if(a) a.textContent='▶'; _capAv.t=v; } else _capAv.volet=v; capAvAppliquer(); };
  o.onchange=e=>{ if(e.target.id==='cav-surb'){ _capAv.surb=e.target.checked; capAvMarques(); } };
  if(!sc) return;
  // Molette = zoom autour du pointeur ; glisser = déplacer (ou la barre du volet)
  const pt=e=>{ const r=sc.getBoundingClientRect(), v=_capAv.vb, k=Math.min(r.width/v.w, r.height/v.h), ox=(r.width-v.w*k)/2, oy=(r.height-v.h*k)/2;
    return {x:v.x+(e.clientX-r.left-ox)/k, y:v.y+(e.clientY-r.top-oy)/k, k}; };
  sc.addEventListener('wheel', e=>{ e.preventDefault(); const p=pt(e), f=Math.exp((e.deltaY>0?1:-1)*0.15), v=_capAv.vb;
    _capAv.vb={x:p.x-(p.x-v.x)*f, y:p.y-(p.y-v.y)*f, w:v.w*f, h:v.h*f}; capAvVue(); }, {passive:false});
  sc.addEventListener('pointerdown', e=>{
    if(e.button!==0) return;
    const r=sc.getBoundingClientRect(), volet=e.target.closest('#cav-poignee');
    const x0=e.clientX, y0=e.clientY, v0={..._capAv.vb}, k=pt(e).k; let bouge=false;
    sc.setPointerCapture(e.pointerId);
    const mv=ev=>{ if(Math.abs(ev.clientX-x0)+Math.abs(ev.clientY-y0)>3) bouge=true;
      if(volet){ _capAv.volet=Math.max(0, Math.min(100, 100*(ev.clientX-r.left)/r.width)); const c=document.getElementById('cav-t'); if(c) c.value=Math.round(_capAv.volet); capAvAppliquer(); return; }
      _capAv.vb={...v0, x:v0.x-(ev.clientX-x0)/k, y:v0.y-(ev.clientY-y0)/k}; capAvVue(); };
    const up=ev=>{ sc.removeEventListener('pointermove', mv); sc.removeEventListener('pointerup', up);
      if(!bouge&&!volet){ const g=document.elementsFromPoint(ev.clientX, ev.clientY).map(x=>x.closest&&x.closest('#cav-a [data-sem],#cav-b [data-sem]')).find(Boolean);
        if(g){ const s=g.getAttribute('data-sem'), E=_capAv.ecarts.filter(z=>!z.suit), i=E.findIndex(z=>(z.a&&z.a.sem===s)||(z.b&&z.b.sem===s)); if(i>=0) capAvAller(i); else if(capGetElementById_(s)) capOpenDetailById(s); } } };
    sc.addEventListener('pointermove', mv); sc.addEventListener('pointerup', up);
  });
}

/* ── Diagrammes modifiés ─────────────────────────────────────────────────── */

/** Liste des diagrammes modifiés trouvés (sous la liste des écarts). @returns {string} HTML */
function capAvModifiesHtml(){
  const M=_capAv.modifies; if(!M||M.ref!==capAvRef()) return '';
  if(M.encours!=null) return `<div class="cav-gr">${_L('🔎 Diagrammes modifiés')} <span class="ana-dim">${M.encours} / ${M.total}</span></div>`;
  return `<div class="cav-gr">${_L('🔎 Diagrammes modifiés')} <span class="ana-dim">${M.liste.length}</span></div>`+
    (M.liste.length?M.liste.map(d=>`<div class="cav-it${d.uid===_capAv.uid?' actif':''}" data-cav-uid="${capEsc(d.uid)}"><span class="cav-pastille" style="background:${d.nouveau?CAP_AV_COUL.ajout:CAP_AV_COUL.depl}"></span><span class="cav-nom">${capEsc(d.nom)}</span>${d.nouveau?`<span class="cav-det">${_L('nouveau')}</span>`:''}</div>`).join('')
      :`<div class="cav-vide">${_L('✔ Aucun autre diagramme modifié.')}</div>`);
}

/** Cherche, par tranches, les diagrammes dont le dessin diffère de la version d'avant (texte du SVG). */
function capAvChercherModifies(){
  const ref=capAvRef(); if(!ref||_capAv.cherche) return;
  const reps=capDiagReps().filter(r=>r.genre!=='tableau'&&!r.tableau), M={liste:[], encours:0, total:reps.length, ref};
  _capAv.modifies=M; _capAv.cherche=true; capAvListe();
  const norm=s=>String(s||'').replace(/\s(id|href|xlink:href)="[^"]*"/g,'').replace(/url\(#[^)]*\)/g,'');
  let i=0;
  const tranche=()=>{
    if(!_capAv.ouvert){ _capAv.cherche=false; return; }
    const fin=Math.min(reps.length, i+4);
    for(; i<fin; i++){ const r=reps[i]; try{ const S=capAvSvgs(r.uid, ref); if(S.apres&&norm(S.apres)!==norm(S.avant)) M.liste.push({uid:r.uid, nom:r.nom||r.uid, nouveau:!S.avant}); }catch(e){ /* dessin impossible */ } }
    M.encours=i; capAvListe();
    if(i<reps.length) setTimeout(tranche, 0); else { delete M.encours; _capAv.cherche=false; capAvListe(); capToast(_L(`🔎 ${M.liste.length} diagramme(s) modifié(s)`)); }
  };
  setTimeout(tranche, 0);
}

/* ── Depuis ⚖ Comparaison de versions ────────────────────────────────────── */

/**
 * Ouvre un diagramme en ⇄ Avant / après depuis l'onglet 🔲 Diagrammes de ⚖ Comparaison de versions : la version comparée sert de
 * version d'avant (ou d'après), et les diagrammes de la liste affichée se parcourent ensuite par ⏮ ⏭ dans la barre.
 * @param {string} uid - Diagramme à ouvrir
 * @param {string[]} [uids] - Diagrammes de la liste (ordre affiché)
 */
function capAvDepuisComparaison(uid, uids){
  _capAv.prefComp=true; _capAv.tournee=uids&&uids.length?uids.slice():null; _capAv.modifies=null;
  capDiagOpen(uid);
  let n=0;
  const pret=()=>{
    if(_capDiag.actif===uid&&document.querySelector('#cap-view-diag .cdg-corps')){
      if(!_capAv.ouvert) capAvOuvrir(); else if(_capAv.uid!==uid||_capAv.refRendue!==capAvRef()) capAvRendre();   // déjà suivi par capAvSuivre sinon
      return; }
    if(++n<60) setTimeout(pret, 50); else capToast(_L('Diagramme introuvable dans le modèle affiché.'));
  };
  setTimeout(pret, 0);
}
/** Groupe ⏮ i / n ⏭ ↩ de la barre quand les diagrammes viennent de ⚖ Comparaison de versions. @returns {string} HTML */
function capAvTourneeHtml(){
  const T=_capAv.tournee; if(!T) return '';
  const i=T.indexOf(_capAv.uid);
  return `<span class="tb-grp"><button class="tbtn" data-cav-tour="-1" title="${_L('Diagramme précédent de la comparaison')}"${i>0?'':' disabled'}>⏮</button>`+
    `<span class="cav-pos" title="${_L('Diagrammes de la liste de ⚖ Comparaison de versions')}">${_L(`Diagramme ${i>=0?i+1:'–'} / ${T.length}`)}</span>`+
    `<button class="tbtn" data-cav-tour="1" title="${_L('Diagramme suivant de la comparaison')}"${i>=0&&i<T.length-1?'':' disabled'}>⏭</button>`+
    `<button class="tbtn" data-cav-tour="retour" title="${_L('Revenir à ⚖ Comparaison de versions › 🔲 Diagrammes')}">${_L('↩ Comparaison')}</button></span>`;
}
/** Diagramme précédent / suivant de la liste de la comparaison, ou retour à la comparaison. @param {string} k - « -1 », « 1 » ou « retour » */
function capAvTourneeAller(k){
  const T=_capAv.tournee; if(!T) return;
  if(k==='retour'){ capAvFermer(); _capDg.vue='diag'; capNavOpen('ana:diff'); return; }
  const i=T.indexOf(_capAv.uid), j=i+(+k);
  if(j>=0&&j<T.length) capDiagOuvrirUid(T[j]);
}
