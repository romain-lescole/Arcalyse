/* ═══════════════════════════════════════════════════════════════════════════
   🔲 TABLEAUX, MATRICES ET RELATION MAP DE CAMEO (.mdzip) — vue 🔲 Diagrammes
   Cameo / CATIA Magic n'enregistre pas le contenu de ses tableaux ni de ses matrices : il le recalcule d'après leur
   définition. Le lecteur UML d'Arcature (vendor : `tableaux()`, `tableau(cle)`, docs/UML.md) refait ce calcul ; ce module les
   montre dans 🔲 Diagrammes avec les diagrammes (explorateur commun de 54 : par genre, origine ou 🌳 arborescence ; partie droite `capSyVuesRender` de 87),
   comme les tableaux de Capella dans la visionneuse :
     - tableau HTML : tri par clic sur l'en-tête (▲ / ▼ / sans tri), filtre, éléments cités cliquables ;
     - matrice à en-têtes verticaux : groupes par propriétaire (lignes en arbre et colonnes groupées, comme Cameo),
       « éléments reliés seulement », cellule = sens des relations (clic : la relation) ;
     - Relation Map (et cartes de décomposition) : arbre dessiné depuis la racine comme Cameo (icône, « nom : Type », ⊕ / ⊖
       pour déplier ou replier un nœud, liens colorés par critère et légende), d'après la définition lue par le lecteur
       (racine, critères, profondeur, types, nœuds dépliés), ouvrable en onglet de 🗺 Relation Map (`capSyTabVersRelationMap`) ;
   clic → panneau de détail, ⬇ CSV (ou Excel, ⚙), ℹ Infos dans le panneau de détail, et ouverture d'un tableau en onglet de
   ▤ Tableau (51) : lignes du tableau, colonnes ramenées à celles d'Arcalyse, les autres en lecture seule (clés « cameo:… »,
   valeurs calculées par le lecteur : `capSyTabValeurs`).
   ═══════════════════════════════════════════════════════════════════════════ */

/** État des tableaux affichés, par clé de vue : tri d'un tableau ({col, dir}), « éléments reliés seulement » d'une matrice,
 * filtre saisi, nœuds d'une Relation Map dépliés ou repliés à la main ({deplier, replier} : chemins du lecteur) ; taille du
 * texte commune. */
var _capSyTab={tri:{}, relies:{}, q:{}, plis:{}, zoom:1};

/** Couleurs des liens d'une Relation Map, une par critère (dans l'ordre de la définition), lisibles sur les thèmes clairs et sombres. */
const CAP_SY_RM_COULEURS=['#5b8def', '#e07b39', '#3aa676', '#b45cc8', '#d4485f', '#8a8f99', '#2bb3c0', '#c9a227'];

/** Flèche d'une cellule de matrice selon le sens de ses relations, comme Cameo (↗ ligne → colonne, ↙ colonne → ligne, ⤢ les deux). */
const CAP_SY_TAB_SENS={'→':'↗', '←':'↙', '↔':'⤢'};

/** Au-delà de ce nombre de cellules, une matrice n'est montrée qu'avec ses éléments reliés. */
const CAP_SY_TAB_CELLULES_MAX=250000;

/** Contenu calculé d'un tableau, d'une matrice ou d'une Relation Map de la lecture affichée (calculé une fois par lecture).
 * @param {string} cle - Clé de la vue
 * @returns {object|null} Contenu du lecteur (`tableau(cle)`), ou null
 */
function capSyTabContenu(cle){
  const lec=_capSysml.lecture; if(!lec||!cle||typeof lec.tableau!=='function') return null;
  const c=_capSysml.tabCache||(_capSysml.tabCache={}), p=_capSyTab.plis[cle], plis=p&&(p.deplier.length||p.replier.length)?p:null;
  const k=plis?cle+'\u0001'+JSON.stringify(plis):cle;   // Relation Map dépliée ou repliée à la main : recalculée par le lecteur
  if(!(k in c)){ try{ c[k]=(plis?lec.tableau(cle, plis):lec.tableau(cle))||null; }catch(e){ console.warn('tableau(cle)',cle,e); c[k]=null; } }
  return c[k];
}

/** Déplie ou replie un nœud d'une Relation Map (⊕ / ⊖) : chemin noté dans `_capSyTab.plis`, contenu recalculé par le lecteur.
 * @param {string} cle - Clé de la Relation Map
 * @param {string} chemin - Chemin du nœud (lecteur)
 * @param {boolean} deplier - Déplier (sinon replier)
 */
function capSyTabPli(cle, chemin, deplier){
  const p=_capSyTab.plis[cle]||(_capSyTab.plis[cle]={deplier:[], replier:[]});
  p.deplier=p.deplier.filter(x=>x!==chemin); p.replier=p.replier.filter(x=>x!==chemin);
  (deplier?p.deplier:p.replier).push(chemin);
}

/** Libellé d'un élément dans une Relation Map, comme Cameo : « nom : Type », « Association[A -> b:B] », sinon le nom.
 * @param {object} t - Contenu @param {string} id - Identifiant
 * @returns {{nom:string, type:string}} Nom, et nom du type ('' sans type)
 */
function capSyTabCarte(t, id){
  const e=(t.etiquettes||{})[id]||{};
  return e.libelleCarte!=null?{nom:e.typeCarte?e.nomCarte:e.libelleCarte, type:e.typeCarte||''}:{nom:capSyTabNom(t, id), type:''};
}

/** Nom d'un élément cité par un tableau (étiquettes du lecteur).
 * @param {object} t - Contenu @param {string} id - Identifiant
 * @returns {string}
 */
function capSyTabNom(t, id){ const e=t&&t.etiquettes&&t.etiquettes[id]; return e?(e.nom||e.libelle||id):String(id||''); }

/** Référence cliquable vers un élément cité (panneau de détail au clic) ; grisée si l'élément n'est pas dans le modèle affiché.
 * @param {object} t - Contenu
 * @param {string} id - Identifiant
 * @param {string} [texte] - Texte affiché (le nom sinon)
 * @param {boolean} [ico] - Avec l'icône de l'élément
 * @returns {string} HTML
 */
function capSyTabRef(t, id, texte, ico){
  const esc=capEsc, e=(t.etiquettes||{})[id]||{}, connu=!!capGetElementById_(id);
  return `<span class="sy-tab-ref${connu?'':' sy-tab-abs'}" data-sem="${esc(id)}" title="${esc((e.type?e.type+' · ':'')+(e.nomQualifie||e.nom||id))}">${ico&&connu&&typeof capIco==='function'?capIco(id, 13):''}${esc(texte!=null&&texte!==''?texte:capSyTabNom(t, id))}</span>`;
}

/** Libellé de l'en-tête d'un élément de matrice selon la présentation de Cameo : « nom:type », suivi du chemin de son
 * propriétaire en mode « Full qualified name ».
 * @param {object} t - Contenu @param {string} id - Élément @param {string} mode - Présentation de l'axe
 * @returns {string}
 */
function capSyTabAxe(t, id, mode){
  const e=t.etiquettes[id]||{}, lib=e.libelle||e.nom||id;
  if(mode!=='Full qualified name') return lib;
  const ch=String(e.nomQualifie||'').split('::').slice(0,-1).join('::');
  return ch?`${lib} (${ch})`:lib;
}

/** Lignes d'un tableau après le filtre saisi et le tri choisi (cellules vides en bas).
 * @param {object} t - Contenu (genre `tableau`) @param {string} cle - Clé de la vue
 * @returns {object[]} Lignes du lecteur
 */
function capSyTabLignes(t, cle){
  const q=(_capSyTab.q[cle]||'').trim().toLowerCase(), tri=_capSyTab.tri[cle];
  let l=t.lignes;
  if(q) l=l.filter(x=>x.valeurs.some(v=>v.texte.toLowerCase().includes(q)));
  if(tri&&tri.col!=null&&t.colonnes[tri.col]){
    const i=tri.col, d=tri.dir||1, txt=x=>(x.valeurs[i]||{texte:''}).texte.trim();
    l=l.slice().sort((a,b)=>{ const A=txt(a), B=txt(b); if(!A&&B) return 1; if(A&&!B) return -1; return A.localeCompare(B,'fr',{numeric:true, sensitivity:'base'})*d; });
  }
  return l;
}

/** HTML d'un tableau : en-têtes triables (largeurs de Cameo), une ligne par élément ; nom et éléments cités cliquables ; paginé
 * au-delà de 200 lignes (78).
 * @param {object} t - Contenu (genre `tableau`) @param {string} cle - Clé de la vue
 * @returns {string} HTML
 */
function capSyTabHtmlTableau(t, cle){
  const esc=capEsc, tri=_capSyTab.tri[cle]||{}, lignes=capSyTabLignes(t, cle);
  if(!t.colonnes.length) return `<div class="cdg-vide">${_L('Aucune colonne.')}</div>`;
  const tete=t.colonnes.map((c,i)=>`<th data-sytab-tri="${i}"${c.largeur?` style="min-width:${Math.min(400, Math.max(30, c.largeur))}px"`:''} title="${esc(c.id)}${_L(' — clic : trier')}">${esc(c.libelle)}${tri.col===i?(tri.dir===-1?' ▼':' ▲'):''}</th>`).join('');
  const ligne=l=>'<tr>'+l.valeurs.map((v,i)=>{
    const c=t.colonnes[i];
    if(c.id==='_NUMBER_') return `<td class="sy-tab-num">${capSyTabRef(t, l.element, v.texte)}</td>`;
    if(c.propriete==='name') return `<td>${capSyTabRef(t, l.element, v.texte, true)}</td>`;
    if(v.elements.length) return `<td>${v.elements.map(id=>capSyTabRef(t, id)).join(', ')}</td>`;
    return `<td>${esc(v.texte.trim())}</td>`;
  }).join('')+'</tr>';
  if(!lignes.length) return `<table class="sy-tab"><thead><tr>${tete}</tr></thead></table><div class="cdg-vide">${t.lignes.length?_L('Aucune ligne ne correspond au filtre.'):_L('Aucune ligne.')}</div>`;
  return capPaged(lignes, {render:ligne, open:`<table class="sy-tab sy-tab-t"><thead><tr>${tete}</tr></thead><tbody class="cap-pg-body">`, close:'</tbody></table>'});
}

/** Axes montrés d'une matrice : tous les éléments, ou les éléments reliés seulement (choix de l'utilisateur, sinon celui du
 * lecteur ; forcé au-delà de `CAP_SY_TAB_CELLULES_MAX` cellules), lignes filtrées par le texte saisi.
 * @param {object} t - Contenu (genre `matrice`) @param {string} cle - Clé de la vue
 * @returns {{lignes:string[], colonnes:string[], relies:boolean, force:boolean}}
 */
function capSyTabAxes(t, cle){
  let relies=cle in _capSyTab.relies?_capSyTab.relies[cle]:t.reliesParDefaut, force=false;
  if(!relies&&t.toutes.lignes.length*t.toutes.colonnes.length>CAP_SY_TAB_CELLULES_MAX){ relies=true; force=true; }
  const a=relies?t.reliees:t.toutes, q=(_capSyTab.q[cle]||'').trim().toLowerCase();
  const lignes=q?a.lignes.filter(id=>{ const e=t.etiquettes[id]||{}; return ((e.libelle||'')+' '+(e.nom||'')).toLowerCase().includes(q); }):a.lignes;
  return {lignes, colonnes:a.colonnes, relies, force};
}

/** HTML d'une matrice : colonnes en en-têtes verticaux (groupées par propriétaire si Cameo les montre en arbre), lignes en
 * arbre de propriétaires avec, dans chaque colonne, le nombre de relations de leur contenu ; cellule = sens des relations
 * (nombre s'il y en a plusieurs ; infobulle : les relations ; clic : la première). Paginé au-delà de 200 lignes (78).
 * @param {object} t - Contenu (genre `matrice`) @param {string} cle - Clé de la vue
 * @returns {string} HTML
 */
function capSyTabHtmlMatrice(t, cle){
  const esc=capEsc, ax=capSyTabAxes(t, cle), {lignes, colonnes}=ax, P=t.presentation||{};
  if(!lignes.length||!colonnes.length) return `<div class="cdg-vide">${_L('Aucun élément à montrer.')}</div>`;
  const arbreL=/tree/i.test(P.lignes||''), arbreC=/tree/i.test(P.colonnes||'');
  const cel=new Map(t.cellules.map(c=>[c.ligne+'\u0000'+c.colonne, c]));
  const hauteur=P.hauteurColonnes?` style="max-height:${Math.max(60, Math.min(400, P.hauteurColonnes))}px"`:'';
  const largeur=P.largeurLignes?` style="min-width:${Math.min(500, P.largeurLignes)}px"`:'';
  let groupes='';
  if(arbreC){
    const g=[]; colonnes.forEach(c=>{ const p=(t.etiquettes[c]||{}).proprietaire||''; if(g.length&&g[g.length-1].p===p) g[g.length-1].n++; else g.push({p, n:1}); });
    groupes=`<tr><th class="sy-tab-lig sy-tab-coin"></th>${g.map(x=>`<th class="sy-tab-grp" colspan="${x.n}">${x.p&&t.etiquettes[x.p]?capSyTabRef(t, x.p):''}</th>`).join('')}</tr>`;
  }
  const sens=t.sens==='Column to row'?_L('colonne → ligne'):t.sens==='Both'?_L('les deux sens'):_L('ligne → colonne');
  const tete=`<tr><th class="sy-tab-lig sy-tab-coin"${largeur}>${esc(t.critere.nom||'')} <span class="ana-dim">(${esc(sens)})</span></th>`+
    colonnes.map(c=>`<th class="sy-tab-vert"><span${hauteur}>${capSyTabRef(t, c, capSyTabAxe(t, c, P.colonnes))}</span></th>`).join('')+'</tr>';
  // Lignes en arbre : chaque propriétaire une fois, au-dessus de ses éléments, avec les totaux de son contenu par colonne
  const totaux=new Map(), montres=new Set(), rangs=[];
  if(arbreL) lignes.forEach(l=>{ (t.ancetres[l]||[]).forEach(a=>{ if(!totaux.has(a)) totaux.set(a, new Map()); const m=totaux.get(a);
    colonnes.forEach(c=>{ const x=cel.get(l+'\u0000'+c); if(x) m.set(c, (m.get(c)||0)+Math.max(1, x.relations.length)); }); }); });
  const retrait=n=>`padding-left:${6+14*n}px`;
  lignes.forEach(l=>{
    const anc=arbreL?(t.ancetres[l]||[]):[];
    anc.forEach((a,i)=>{ if(montres.has(a)) return; montres.add(a); const m=totaux.get(a);
      rangs.push(`<tr class="sy-tab-grp-l"><th class="sy-tab-lig sy-tab-grp" style="${retrait(i)}">${capSyTabRef(t, a)}</th>${colonnes.map(c=>`<td class="sy-tab-grp">${m&&m.get(c)||''}</td>`).join('')}</tr>`); });
    rangs.push(`<tr><th class="sy-tab-lig" style="${retrait(anc.length)}">${capSyTabRef(t, l, capSyTabAxe(t, l, P.lignes), true)}</th>`+colonnes.map(c=>{
      const x=cel.get(l+'\u0000'+c); if(!x) return '<td></td>';
      const r=x.relations[0], titre=x.relations.map(id=>{ const e=t.etiquettes[id]||{}; return (e.type?e.type+' : ':'')+(e.nom||id); }).join('\n');
      return `<td class="sy-tab-rel"${r?` data-sem="${esc(r)}"`:''} title="${esc(titre||x.sens)}">${CAP_SY_TAB_SENS[x.sens]||'•'}${x.relations.length>1?x.relations.length:''}</td>`;
    }).join('')+'</tr>');
  });
  return capPaged(rangs, {open:`<table class="sy-tab sy-tab-m"><thead>${groupes}${tete}</thead><tbody class="cap-pg-body">`, close:'</tbody></table>'});
}

/** Mesure de la largeur d'un texte de 12 px dans la police de la page (canevas), pour le dessin d'une Relation Map ; estimation
 * sans canevas.
 * @returns {function(string):number} Largeur en pixels
 */
function capSyTabMesureur(){
  let c=null; try{ c=document.createElement('canvas').getContext('2d'); }catch(e){ c=null; }
  if(!c) return x=>6.6*String(x).length;
  c.font='12px '+(getComputedStyle(document.body).fontFamily||'sans-serif');
  const cache=new Map();
  return x=>{ x=String(x); let w=cache.get(x); if(w==null){ w=c.measureText(x).width; cache.set(x, w); } return w; };
}

/** Dessin d'une Relation Map en arbre de gauche à droite, comme la disposition « Tree » de Cameo : la racine à gauche, un
 * niveau par colonne, chaque parent centré sur ses enfants ; nœud = icône et libellé (« nom : Type », type en gris), puis ⊖ s'il
 * est déplié, ⊕ s'il a des enfants non montrés (clic : `data-sytab-pli`) ; lien coloré selon son critère (légende si la carte la
 * montre), en tirets vers un élément déjà montré (« un seul nœud par élément »). Les nœuds portent `data-sem` (clic : panneau de
 * détail) ; un diagramme, `data-sydiag` (clic : il s'ouvre).
 * @param {object} t - Contenu (genre `relations`)
 * @param {boolean} [autonome] - Document SVG autonome (couleurs du thème recopiées, sans ⊕ / ⊖), pour l'export
 * @returns {{svg:string, w:number, h:number}} SVG
 */
function capSyTabSvgRelations(t, autonome){
  const esc=capEsc, def=t.definition||{options:{}, criteres:[]}, o=def.options||{}, noeuds=t.noeuds||[];
  if(!noeuds.length) return {svg:'', w:0, h:0};
  const couper=o.cutElementNames===true, H=22, GY=6, GX=56, PLI=11, mesure=capSyTabMesureur();
  const lib=n=>{ const c=capSyTabCarte(t, n.element); let nom=c.nom;
    if(couper&&nom.length+c.type.length>40) nom=nom.slice(0, Math.max(8, 39-c.type.length))+'…';
    return {nom, type:c.type?(nom?' ':'')+': '+c.type:''}; };
  const larg=n=>{ const l=lib(n); return Math.ceil(24+mesure(l.nom+l.type)+(n.etat?PLI+4:0)); };
  const fils=new Map(); noeuds.forEach(n=>{ if(n.parent){ if(!fils.has(n.parent)) fils.set(n.parent, []); fils.get(n.parent).push(n); } });
  const colW=[]; noeuds.forEach(n=>{ colW[n.niveau]=Math.max(colW[n.niveau]||0, larg(n)); });
  const colX=[]; colW.forEach((w,i)=>{ colX[i]=i?colX[i-1]+colW[i-1]+GX:10; });
  const pos=new Map(); let y=10;
  const placer=n=>{ const f=fils.get(n.id)||[]; f.forEach(placer); const py=f.length?(pos.get(f[0].id).y+pos.get(f[f.length-1].id).y)/2:y; if(!f.length) y+=H+GY; pos.set(n.id, {x:colX[n.niveau], y:py, w:larg(n)}); };
  placer(noeuds[0]);
  // Couleur d'un lien : celle de son premier critère ; légende des critères employés
  const crit=(def.criteres||[]).map(c=>c.nom), coul=noms=>{ const i=crit.indexOf((noms||[])[0]); return CAP_SY_RM_COULEURS[(i<0?crit.length:i)%CAP_SY_RM_COULEURS.length]; };
  const employes=crit.filter(c=>(t.liens||[]).some(l=>l.criteres.includes(c)));
  const legende=o.showLegend!==false&&employes.length?employes:[];
  const treeW=colX[colX.length-1]+colW[colW.length-1], legX=Math.ceil(treeW+30), legW=legende.length?Math.ceil(Math.min(300, 70+mesure(legende.reduce((a, c)=>c.length>a.length?c:a, ''))*11/12)):0;
  const W=Math.ceil((legende.length?legX+legW:treeW)+10), Ht=Math.ceil(Math.max(...[...pos.values()].map(p=>p.y), legende.length*18+30)+H+10);
  const parId=new Map(noeuds.map(n=>[n.id, n]));
  const lien=(l, tirets)=>{ const a=pos.get(l.source), b=pos.get(l.cible); if(!a||!b) return '';
    const x1=a.x+a.w, y1=a.y+H/2, x2=b.x-3, y2=b.y+H/2, xm=(x1+x2)/2, c=coul(l.criteres);
    return `<g class="sy-rm-lien"><title>${esc(l.criteres.join(', '))}</title><path class="sy-rm-l${tirets?' sy-rm-l2':''}" style="stroke:${c}" d="M${x1} ${y1}C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}"/><path style="fill:${c}" d="M${x2} ${y2}l-6 -3.5v7z"/></g>`; };
  let svg=(t.liens||[]).map(l=>{ const c=parId.get(l.cible); return lien(l, !c||c.parent!==l.source); }).join('');
  const vues=typeof capSyVuesListe==='function'?capSyVuesListe():[];
  svg+=noeuds.map(n=>{ const p=pos.get(n.id), e=t.etiquettes[n.element]||{}, l=lib(n), racine=!n.parent;
    const vue=e.vue?vues.find(v=>v.cle===e.vue):null, ico=vue?capSyVueIco(vue, 14):capGetElementById_(n.element)?capIco(n.element, 14):'';
    const icone=/^<svg/.test(ico||'')?ico.replace(/^<svg/, `<svg x="${p.x+2}" y="${p.y+4}"`):'';
    const att=vue?`data-sydiag="${esc(vue.cle)}"`:`data-sem="${esc(n.element)}"`, xt=p.x+20, xp=p.x+p.w-PLI-2;
    const pli=n.etat&&!autonome?`<g class="sy-rm-pli" data-sytab-pli="${esc(n.chemin)}" data-etat="${n.etat}"><title>${n.etat==='deplie'?_L('Replier'):_L('Déplier')}</title>`+
      `<rect x="${xp}" y="${p.y+(H-PLI)/2}" width="${PLI}" height="${PLI}" rx="2"/><path d="M${xp+2.5} ${p.y+H/2}h${PLI-5}${n.etat==='replie'?`M${xp+PLI/2} ${p.y+(H-PLI)/2+2.5}v${PLI-5}`:''}"/></g>`:'';
    return `<g class="sy-rm-n${racine?' sy-rm-racine':''}" ${att}><title>${esc((vue?vue.libelleGenre:e.type||'')+' · '+(e.nomQualifie||e.nom||l.nom))}</title><rect class="sy-rm-fond" x="${p.x}" y="${p.y}" width="${p.w-(n.etat?PLI+4:0)}" height="${H}" rx="3"/>${icone}`+
      `<text class="sy-rm-nom" x="${xt}" y="${p.y+15}">${esc(l.nom)}${l.type?`<tspan class="sy-rm-t">${esc(l.type)}</tspan>`:''}</text></g>${pli}`; }).join('');
  if(legende.length) svg+=`<g class="sy-rm-leg"><rect x="${legX}" y="10" width="${legW}" height="${legende.length*18+28}" rx="2"/><text class="sy-rm-leg-t" x="${legX+legW/2}" y="26" text-anchor="middle">${_L('Légende')}</text>`+
    legende.map((c, i)=>`<path style="stroke:${coul([c])}" d="M${legX+10} ${44+i*18}h40"/><text x="${legX+58}" y="${48+i*18}">${esc(c)}</text>`).join('')+'</g>';
  let style='';
  if(autonome){ const cs=getComputedStyle(document.documentElement), v=k=>cs.getPropertyValue(k).trim()||'#888';
    style=`<style>svg{font-family:system-ui,'Segoe UI',Arial,sans-serif}.sy-rm-fond{fill:none}.sy-rm-nom{fill:${v('--c-text')};font-size:12px}.sy-rm-t{fill:${v('--c-dim')}}.sy-rm-l{fill:none;stroke-width:1.2}.sy-rm-l2{stroke-dasharray:4 3}`+
      `.sy-rm-leg rect{fill:${v('--c-bg2')};stroke:${v('--c-border')}}.sy-rm-leg text{fill:${v('--c-text')};font-size:11px}.sy-rm-leg .sy-rm-leg-t{font-weight:700;font-size:12px}.sy-rm-leg path{stroke-width:2}</style><rect width="100%" height="100%" fill="${v('--c-bg2')}"/>`; }
  return {svg:`<svg class="sy-rm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}" data-w="${W}" data-h="${Ht}">${style}${svg}</svg>`, w:W, h:Ht};
}

/** HTML d'une Relation Map : l'arbre dessiné (`capSyTabSvgRelations`), à la taille réglée par le zoom des tableaux.
 * @param {object} t - Contenu (genre `relations`)
 * @returns {string} HTML
 */
function capSyTabHtmlRelations(t){
  const d=capSyTabSvgRelations(t), z=_capSyTab.zoom||1;
  if(!d.svg) return `<div class="cdg-vide">${_L('Aucun élément à montrer.')}</div>`;
  return d.svg.replace(/ width="(\d+)" height="(\d+)"/, (m,w,h)=>` width="${Math.round(w*z)}" height="${Math.round(h*z)}"`);
}

/** Résumé d'un tableau pour la barre : lignes, ou dimensions et relations d'une matrice.
 * @param {object} t - Contenu @param {string} cle - Clé de la vue
 * @returns {string} Texte
 */
function capSyTabResume(t, cle){
  if(t.genre==='tableau'){ const n=capSyTabLignes(t, cle).length; return n===t.lignes.length?_L(`${n} ligne(s)`):_L(`${n} / ${t.lignes.length} ligne(s)`); }
  if(t.genre==='matrice'){ const a=capSyTabAxes(t, cle); return _L(`${a.lignes.length} × ${a.colonnes.length} — ${t.cellules.length} cellule(s) reliée(s)`); }
  const d=t.definition;
  return _L(`${(t.noeuds||[]).length} nœud(s) · profondeur ${d?d.profondeur:0}`);
}

/** Corps de la vue 🔲 pour un tableau, une matrice ou une Relation Map (appelé par `capSyVuesRender`, 87) : barre (titre, Visuel /
 * Texte, filtre, « éléments reliés seulement », taille du texte, résumé, ⬇ CSV, ⬇ Texte, ℹ Infos, ▤ Tableau, 🗺 Relation Map,
 * 🔎 Élément), remarques du lecteur, puis le tableau.
 * @param {object} vue - Vue du lecteur (`tableau: true`, `contenu`)
 * @returns {string} HTML
 */
function capSyTabCorps(vue){
  const esc=capEsc, st=_capSyVues, cle=vue.cle, t=capSyTabContenu(cle)||vue.contenu, visuel=st.mode==='visuel';
  if(!t) return `<div class="cdg-vide">${_L('Contenu du tableau non calculé.')}</div>`;
  const rel=t.genre==='relations';
  const barre=`<div class="phl-toggle-bar sy-vue-barre"><b class="sy-vue-titre" title="${esc(vue.libelleGenre)}">${capSyVueIco(vue, 16)} <span class="cdg-sigle">${esc(vue.sigle)}</span> ${esc(vue.nom)}</b>`+
    (vue.type?`<span class="ana-dim" style="font-size:11px">${esc(vue.type)}</span>`:'')+
    `<span class="tb-grp"><button class="cap-lf-btn${visuel?' active':''}" data-symode="visuel">${rel?'🖼 '+_L('Visuel'):'▦ '+_L('Tableau')}</button><button class="cap-lf-btn${!visuel?' active':''}" data-symode="texte">≡ ${_L('Texte')}</button></span>`+
    (!rel&&visuel?`<span class="tb-grp"><input type="search" class="inp sy-tab-q" data-sytab-q="1" placeholder="${t.genre==='matrice'?_L('🔍 Filtrer les lignes…'):_L('🔍 Filtrer…')}" value="${esc(_capSyTab.q[cle]||'')}"></span>`:'')+
    (t.genre==='matrice'&&visuel?(()=>{ const a=capSyTabAxes(t, cle); return `<label class="tb-grp sy-tab-relies" title="${a.force?_L('Matrice trop grande : seuls les éléments reliés sont montrés'):_L('Ne montrer que les lignes et colonnes qui ont des relations')}"><input type="checkbox" data-sytab-relies="1"${a.relies?' checked':''}${a.force?' disabled':''}> ${_L('Éléments reliés seulement')}</label>`; })():'')+
    (rel&&visuel&&_capSyTab.plis[cle]&&(_capSyTab.plis[cle].deplier.length||_capSyTab.plis[cle].replier.length)?`<span class="tb-grp"><button class="cap-lf-btn" data-sytab-plis="0" title="${_L('Revenir aux nœuds dépliés enregistrés dans la carte (profondeur et nœuds dépliés dans Cameo)')}">↺ ${_L('Dépliage enregistré')}</button></span>`:'')+
    `<span class="tb-grp"><button class="cap-lf-btn" data-sytab-zoom="-" title="${_L('Texte plus petit')}">−</button><button class="cap-lf-btn" data-sytab-zoom="0" title="${_L('Taille normale du texte')}">⊡</button><button class="cap-lf-btn" data-sytab-zoom="+" title="${_L('Texte plus grand')}">+</button></span>`+
    `<span style="flex:1"></span><span class="ana-dim" style="font-size:11px">${esc(capSyTabResume(t, cle))}</span>`+
    `<button class="phl-export-btn" data-sytab-csv="1" title="${_L('Lignes affichées (filtre, tri, éléments reliés) en CSV, ou en Excel selon ⚙ Préférences')}">⬇ CSV</button>`+
    (rel?`<button class="phl-export-btn" data-sytab-svg="1" title="${_L('Document SVG autonome (couleurs du thème)')}">⬇ SVG</button>`:'')+
    `<button class="phl-export-btn" data-syexp="txt" title="${rel?_L('Rendu textuel (arbre en retraits)'):_L('Rendu textuel (colonnes séparées par des tabulations)')}">⬇ ${_L('Texte')}</button>`+
    `<button class="cap-lf-btn" data-sytab-info="1" title="${_L('Informations du tableau (panneau de détail) : définition, colonnes, remarques')}">ℹ ${_L('Infos')}</button>`+
    (t.genre==='tableau'?`<button class="cap-lf-btn" data-sytab-table="1" title="${_L('Ouvrir ce tableau dans un nouvel onglet de ▤ Tableau : ses lignes, ses colonnes ramenées à celles d\'Arcalyse, les autres en lecture seule')}">▤ ${_L('Tableau')}</button>`:'')+
    (rel?`<button class="cap-lf-btn" data-sytab-rm="1"${t.definition&&t.definition.racine&&capGetElementById_(t.definition.racine)?'':' disabled'} title="${_L('Ouvrir dans la 🗺 Relation Map d\'Arcalyse : nouvel onglet centré sur la racine, à la même profondeur, relations équivalentes aux critères cochées')}">🗺 ${_L('Relation Map')}</button>`:'')+
    (vue.element?`<button class="cap-lf-btn" data-syel="${esc(vue.element)}" title="${_L('Élément propriétaire : panneau de détail')}">🔎 ${_L('Élément')}</button>`:'')+`</div>`;
  const notes=(t.notes||[]).length?`<div class="sy-tab-notes">${t.notes.map(n=>`<div>⚠ ${esc(n)}</div>`).join('')}</div>`:'';
  if(!visuel) return barre+notes+`<pre class="sy-texte sy-vue-texte" style="font-size:${(11.5*(st.texteZoom||1)).toFixed(1)}px">${esc(vue.texte||'')}</pre>`;
  const html=t.genre==='tableau'?capSyTabHtmlTableau(t, cle):t.genre==='matrice'?capSyTabHtmlMatrice(t, cle):capSyTabHtmlRelations(t);
  return barre+notes+`<div class="sy-tab-hote" style="font-size:${(12*(_capSyTab.zoom||1)).toFixed(1)}px">${html}</div>`;
}

/** Branche les commandes d'un tableau affiché (après `capSyTabCorps`) : filtre, tri, éléments reliés, taille, CSV, ℹ Infos,
 * ▤ Tableau, clic sur un élément (choisi et ouvert dans le panneau de détail).
 * @param {HTMLElement} v - Conteneur de la partie droite (#cdg-sy, 87)
 * @param {object} vue - Vue affichée
 * @param {HTMLElement} box - Conteneur rendu de nouveau par `capSyVuesRender` (#cdg-sy)
 */
function capSyTabWire(v, vue, box){
  const cle=vue.cle, st=_capSyVues, rendre=()=>capSyVuesRender(box);
  const q=v.querySelector('[data-sytab-q]');
  if(q) q.oninput=()=>{ _capSyTab.q[cle]=q.value; const p=q.selectionStart; rendre(); const i=box.querySelector('[data-sytab-q]'); if(i){ i.focus(); i.setSelectionRange(p,p); } };
  v.querySelectorAll('[data-sytab-tri]').forEach(th=>th.onclick=e=>{ if(e.target.closest('[data-sem]')) return; const i=+th.dataset.sytabTri, t=_capSyTab.tri[cle];
    _capSyTab.tri[cle]=!t||t.col!==i?{col:i, dir:1}:t.dir===1?{col:i, dir:-1}:null; rendre(); });
  const rl=v.querySelector('[data-sytab-relies]'); if(rl) rl.onchange=()=>{ _capSyTab.relies[cle]=rl.checked; rendre(); };
  v.querySelectorAll('[data-sytab-zoom]').forEach(b=>b.onclick=()=>{ const z=b.dataset.sytabZoom;
    if(st.mode==='texte'){ capSyTexteZoom(box, z==='0'?0:z==='+'?1.15:1/1.15); return; }
    _capSyTab.zoom=z==='0'?1:Math.min(2.5, Math.max(0.5, (_capSyTab.zoom||1)*(z==='+'?1.15:1/1.15))); const h=v.querySelector('.sy-tab-hote'); if(h) h.style.fontSize=(12*_capSyTab.zoom).toFixed(1)+'px'; capSyTabZoomSvg(v); });
  const csv=v.querySelector('[data-sytab-csv]'); if(csv) csv.onclick=()=>capSyTabCsv(cle);
  const info=v.querySelector('[data-sytab-info]'); if(info) info.onclick=()=>capSyTabInfo(cle);
  const tab=v.querySelector('[data-sytab-table]'); if(tab) tab.onclick=()=>capSyTabVersTableau(cle);
  const rm=v.querySelector('[data-sytab-rm]'); if(rm) rm.onclick=()=>capSyTabVersRelationMap(cle);
  const plis=v.querySelector('[data-sytab-plis]'); if(plis) plis.onclick=()=>{ delete _capSyTab.plis[cle]; rendre(); };
  const svgb=v.querySelector('[data-sytab-svg]'); if(svgb) svgb.onclick=()=>{ const t=capSyTabContenu(cle), d=t&&capSyTabSvgRelations(t, true); if(d&&d.svg) capDownloadBlob(new Blob([d.svg],{type:'image/svg+xml'}), String(t.nom||'relation-map').replace(/[\\/:*?"<>|]+/g,'-')+'.svg'); };
  const hote=v.querySelector('.sy-tab-hote');
  if(hote){
    hote.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); _capSyTab.zoom=Math.min(2.5, Math.max(0.5, (_capSyTab.zoom||1)*(e.deltaY<0?1.1:1/1.1))); hote.style.fontSize=(12*_capSyTab.zoom).toFixed(1)+'px'; capSyTabZoomSvg(v); },{passive:false});
    hote.addEventListener('click',e=>{
      const pli=e.target.closest('[data-sytab-pli]');   // ⊕ / ⊖ d'une Relation Map : nœud déplié ou replié, carte recalculée
      if(pli&&hote.contains(pli)){ capSyTabPli(cle, pli.dataset.sytabPli, pli.dataset.etat==='replie'); const sc=[hote.scrollLeft, hote.scrollTop]; rendre(); const h=box.querySelector('.sy-tab-hote'); if(h){ h.scrollLeft=sc[0]; h.scrollTop=sc[1]; } return; }
      const dg=e.target.closest('[data-sydiag]');   // diagramme membre d'un élément : il s'ouvre
      if(dg&&hote.contains(dg)){ capSyVueOuvrir(dg.dataset.sydiag); return; }
      const g=e.target.closest('[data-sem]'); if(!g||!hote.contains(g)) return; const id=g.dataset.sem; st.sel=id;
      hote.querySelectorAll('.sy-tab-sel').forEach(x=>x.classList.remove('sy-tab-sel')); g.classList.add('sy-tab-sel');
      if(capGetElementById_(id)) capOpenDetailById(id); });
    if(st.sel) hote.querySelectorAll(`[data-sem="${CSS.escape(st.sel)}"]`).forEach(x=>x.classList.add('sy-tab-sel'));
  }
}

/** ⬇ CSV (ou Excel selon ⚙ Préférences, `capCsvDownload`) des lignes affichées d'un tableau (filtre et tri), d'une matrice
 * (éléments montrés, cellule = sens des relations) ou des propriétés d'une Relation Map.
 * @param {string} cle - Clé de la vue
 */
function capSyTabCsv(cle){
  const t=capSyTabContenu(cle); if(!t) return;
  const nom=String(t.nom||'tableau').replace(/[\\/:*?"<>|\s]+/g,'_')+'.csv';
  if(t.genre==='tableau'){ capCsvDownload(nom, t.colonnes.map(c=>c.libelle), capSyTabLignes(t, cle).map(l=>l.valeurs.map(v=>v.texte.trim()))); return; }
  if(t.genre==='matrice'){
    const a=capSyTabAxes(t, cle), cel=new Map(t.cellules.map(c=>[c.ligne+'\u0000'+c.colonne, c.sens]));
    capCsvDownload(nom, ['', ...a.colonnes.map(c=>capSyTabNom(t, c))], a.lignes.map(l=>[capSyTabNom(t, l), ...a.colonnes.map(c=>cel.get(l+'\u0000'+c)||'')]));
    return;
  }
  const parId=new Map((t.noeuds||[]).map(n=>[n.id, n]));
  const carte=id=>(t.etiquettes[id]||{}).libelleCarte||capSyTabNom(t, id);
  capCsvDownload(nom, [_L('Niveau'), _L('Élément'), _L('Type'), _L('Parent'), _L('Critères')], (t.noeuds||[]).map(n=>[n.niveau, carte(n.element), (t.etiquettes[n.element]||{}).type||'', n.parent?carte(parId.get(n.parent).element):'', n.criteres.join(', ')]));
}

/** Taille du dessin d'une Relation Map selon le zoom des tableaux (`_capSyTab.zoom`).
 * @param {HTMLElement} v - Conteneur de la partie droite (#cdg-sy, 87)
 */
function capSyTabZoomSvg(v){
  const svg=v.querySelector('svg.sy-rm-svg'), z=_capSyTab.zoom||1; if(!svg) return;
  svg.setAttribute('width', Math.round((+svg.dataset.w||0)*z)); svg.setAttribute('height', Math.round((+svg.dataset.h||0)*z));
}

/** Ouvre une Relation Map de Cameo dans la 🗺 Relation Map d'Arcalyse (10) : nouvel onglet de vue centré sur la racine, à la même
 * profondeur, relations des liaisons équivalentes aux critères cochées (« sysml:<relation> », `relation` du lecteur), un seul nœud
 * par élément et noms des relations comme la carte ; critères sans équivalent (contenance, chaînes) signalés — toutes les
 * relations restent alors cochées s'il n'en reste aucune.
 * @param {string} cle - Clé de la Relation Map
 */
function capSyTabVersRelationMap(cle){
  const t=capSyTabContenu(cle), d=t&&t.definition; if(!d||!d.racine) return;
  if(!MODEL.elements.some(e=>e.id===d.racine)){ capAlert(_L('La racine de cette Relation Map n\'est pas dans la 🗺 Relation Map d\'Arcalyse.'), {level:'warn'}); return; }
  const rels=new Set(d.criteres.map(c=>c.relation).filter(Boolean).map(r=>'sysml:'+r)), sans=d.criteres.filter(c=>!c.relation).map(c=>c.nom);
  document.getElementById('mode-rm')?.click();
  setTimeout(()=>{
    rmViewSync();
    const cur=rmViewCapture(), presentes=Object.keys(S.relF).filter(k=>rels.has(k));
    const relF=presentes.length?Object.fromEntries(Object.keys(S.relF).map(k=>[k, rels.has(k)])):Object.fromEntries(Object.keys(S.relF).map(k=>[k, true]));
    const v=Object.assign({}, cur, {ctx:d.racine, depth:Math.max(1, d.profondeur), relF, hidden:[], collapsed:[], zoom:null, chain:null, singleNode:!!d.unSeulNoeud, showRelNames:(d.options||{}).showRelationCriterion!==false});
    const tab=rmViewNewTab(v, {name:'🗺 '+t.nom});
    rmViews.tabs.push(tab); rmViews.idx=rmViews.tabs.length-1; rmViewsRender(); rmViewApply(tab.v);
    capToast(sans.length?_L(`✔ « ${t.nom} » ouverte dans la 🗺 Relation Map ; sans équivalent : ${sans.join(', ')}`):_L(`✔ « ${t.nom} » ouverte dans la 🗺 Relation Map`));
  }, 60);
}

/** ℹ Infos d'un tableau, d'une matrice ou d'une Relation Map dans le panneau de détail (comme `capDiagInfo`, 54) : nature, type
 * de Cameo, propriétaire, dimensions ; colonnes et colonne d'Arcalyse correspondante (tableau) ; critère, sens, présentation
 * (matrice) ; propriétés brutes (Relation Map) ; remarques du lecteur ; portées calculées par Cameo.
 * @param {string} cle - Clé de la vue
 */
function capSyTabInfo(cle){
  const t=capSyTabContenu(cle); if(!t) return;
  const esc=capEsc, titre=(x, c)=>`<div class="cdg-det-t" style="color:${c||'var(--c-dim)'}">${x}</div>`;
  const ligne=(k, v)=>v!==''&&v!=null?`<tr><td class="cdg-det-k">${esc(k)}</td><td class="cdg-det-v">${esc(v)}</td></tr>`:'';
  const lien=id=>capGetElementById_(id)?`<span class="cap-det-link cdg-det-el" onclick="capOpenDetail('${esc(id)}')">${capIco(id, 13)}<span>${esc(capSyTabNom(t, id))}</span></span>`:`<span class="ana-dim">${esc(capSyTabNom(t, id))}</span>`;
  let h=`<span class="cap-type-badge" style="display:inline-block;margin-bottom:6px">${capSyVueIco(t, 14)} ${esc(t.libelleGenre)} · ${esc(t.type||'')}</span>`+
    `<div style="font-size:11px;color:var(--c-accent);font-weight:600;margin-bottom:2px;">${t.genre==='relations'?_L('🔲 Relation Map de Cameo (calculée depuis sa définition)'):_L('🔲 Tableau de Cameo (calculé depuis sa définition)')}</div>`+
    `<h3 style="font-size:14px;font-weight:600;margin-bottom:10px;word-break:break-word">${esc(t.nom)}</h3>`+
    `<button class="cap-lf-btn" onclick="capSyVueOuvrir('${esc(cle)}')">${t.genre==='relations'?_L('🔲 Afficher la carte'):_L('🔲 Afficher le tableau')}</button>`+
    (t.genre==='relations'&&t.definition&&t.definition.racine?` <button class="cap-lf-btn" onclick="capSyTabVersRelationMap('${esc(cle)}')">${_L('🗺 Ouvrir dans la Relation Map')}</button>`:'')+
    (t.genre==='tableau'?` <button class="cap-lf-btn" onclick="capSyTabVersTableau('${esc(cle)}')">${_L('▤ Ouvrir dans Tableau')}</button>`:'');
  h+=titre(_L('Attributs'))+`<table class="cdg-det-tab">`+ligne(_L('Nature'), t.libelleGenre)+ligne(_L('Type'), t.type)+ligne(_L('Origine'), t.libelleOrigine)+
    ligne(_L('Dimensions'), t.genre==='tableau'?_L(`${t.lignes.length} ligne(s) × ${t.colonnes.length} colonne(s)`):t.genre==='matrice'?_L(`${t.toutes.lignes.length} × ${t.toutes.colonnes.length} (reliés : ${t.reliees.lignes.length} × ${t.reliees.colonnes.length})`):'')+
    (t.genre==='matrice'?ligne(_L('Critère'), t.critere.nom+(t.critere.regles.length?' — '+t.critere.regles.map(r=>r.nom+(r.oppose?' (←)':'')).join(', '):''))+ligne(_L('Sens'), t.sens)+ligne(_L('Éléments montrés'), t.montrer)+
      ligne(_L('Présentation'), `${t.presentation.lignes} / ${t.presentation.colonnes}`):'')+ligne('uid', cle)+`</table>`;
  if(t.element) h+=titre(_L('Propriétaire'), '#a78bfa')+`<div>${lien(t.element)}</div>`;
  if((t.notes||[]).length) h+=titre(_L('Remarques'), 'var(--c-warn,#e3b341)')+t.notes.map(n=>`<div class="cdg-det-desc">⚠ ${esc(n)}</div>`).join('');
  if((t.calculees||[]).length) h+=titre(_L('Portées calculées par Cameo (non évaluées)'))+`<div>${t.calculees.map(lien).join('')}</div>`;
  if(t.genre==='tableau'){
    const ids=t.lignes.map(l=>l.element).filter(id=>capGetElementById_(id));
    h+=titre(_L(`Colonnes (${t.colonnes.length})`), '#58a6ff')+`<table class="cdg-det-tab">`+t.colonnes.map(c=>{ const k=capSyTabColArcalyse(cle, c, ids);
      return `<tr><td class="cdg-det-k">${esc(c.libelle)}</td><td class="cdg-det-v">${!k?_L('(numéro de ligne)'):/^cameo:/.test(k)?_L('lecture seule (valeur de Cameo)'):esc(capTableColLabel(k))}</td></tr>`; }).join('')+`</table>`;
  }
  if(t.genre==='relations'){
    const d=t.definition;
    if(d){
      if(d.racine) h+=titre(_L('Racine'), '#a78bfa')+`<div>${lien(d.racine)}</div>`;
      h+=titre(_L('Définition'))+`<table class="cdg-det-tab">`+ligne(_L('Profondeur'), String(d.profondeur))+ligne(_L('Disposition'), d.disposition)+ligne(_L('Un seul nœud par élément'), d.unSeulNoeud?_L('oui'):_L('non'))+
        ligne(_L('Types d\'éléments'), d.types.map(x=>x.stereotype?'«'+x.nom+'»':x.nom).join(', ')+(d.types.length&&d.sousTypes?_L(' (sous-types compris)'):''))+ligne(_L('Types de la racine'), d.typesRacine.map(x=>x.nom).join(', '))+`</table>`;
      h+=titre(_L(`Critères (${d.criteres.length})`), '#58a6ff')+`<table class="cdg-det-tab">`+d.criteres.map(c=>`<tr><td class="cdg-det-k">${esc(c.nom||'—')}</td><td class="cdg-det-v">${esc(c.libelles.join(' ∪ '))}${c.relation?`<br><span class="ana-dim">${esc(_L('🗺 relation : ')+capSyRelLibelle(c.relation))}</span>`:''}${c.inconnu?'<br>⚠ '+esc(_L('non reconnu')):''}</td></tr>`).join('')+`</table>`;
    }
    h+=titre(_L('Propriétés brutes'))+`<table class="cdg-det-tab">`+(t.brut||[]).flatMap(b=>b.proprietes.filter(p=>p.nom!=='relationCriterion').map(p=>`<tr><td class="cdg-det-k">${esc(b.stereotype)}.${esc(p.nom)}</td><td class="cdg-det-v">${esc(p.valeurs.join(' '))}</td></tr>`)).join('')+`</table>`;
  }
  const box=document.getElementById('cap-detail-content'), det=document.getElementById('cap-detail');
  if(box) box.innerHTML=h;
  if(det) det.style.display='flex';
}

/** Colonne d'Arcalyse qui correspond à une colonne d'un tableau de Cameo : nom, description, propriétaire, stéréotypes, attribut
 * écrit de même nom (« Text » → « Requirement.text ») ; sinon colonne en lecture seule « cameo:<clé>:<colonne> » (valeurs
 * calculées par le lecteur) ; null pour le numéro de ligne (« # »).
 * @param {string} cle - Clé du tableau
 * @param {{id:string, propriete:string}} c - Colonne du lecteur
 * @param {string[]} ids - Éléments des lignes (attributs cherchés parmi les leurs)
 * @returns {string|null} Clé de colonne de ▤ Tableau
 */
function capSyTabColArcalyse(cle, c, ids){
  if(c.id==='_NUMBER_') return null;
  const p=String(c.propriete||''), fixe={name:'name', documentation:'description', owner:'parent'}[p];
  if(fixe) return fixe;
  const cles=new Set(); ids.forEach(id=>{ const e=capGetElementById_(id); if(e) Object.keys(e.attrs||{}).forEach(k=>cles.add(k)); });
  if(p==='APPLIED_STEREOTYPES'&&cles.has('stereotypes')) return 'stereotypes';
  if(p){ const pl=p.toLowerCase(), k=[...cles].find(k=>k!=='name'&&(k.toLowerCase()===pl||k.split('.').pop().toLowerCase()===pl)); if(k) return k; }
  return 'cameo:'+encodeURIComponent(cle)+':'+encodeURIComponent(c.id);
}

/** Décode une clé de colonne en lecture seule « cameo:<clé>:<colonne> » de ▤ Tableau.
 * @param {string} colKey - Clé de colonne
 * @returns {{cle:string, col:string}|null}
 */
function capSyTabColParse(colKey){
  const m=/^cameo:([^:]*):([^:]*)$/.exec(colKey||''); if(!m) return null;
  try{ return {cle:decodeURIComponent(m[1]), col:decodeURIComponent(m[2])}; }catch(e){ return null; }
}

/** Valeurs d'une colonne en lecture seule de ▤ Tableau pour un élément (appelée par `capTableGetValArray`, 21) : cellule du
 * tableau de Cameo sur la ligne de l'élément (noms des éléments cités, sinon texte), '' hors du tableau ou du modèle.
 * @param {object} el - Élément capAllElements
 * @param {string} colKey - Clé « cameo:… »
 * @returns {string[]}
 */
function capSyTabValeurs(el, colKey){
  const p=capSyTabColParse(colKey), t=p&&capSyTabContenu(p.cle); if(!t||t.genre!=='tableau') return [''];
  if(!t._parEl) t._parEl=new Map(t.lignes.map(l=>[l.element, l]));
  const l=t._parEl.get(el.id), i=t.colonnes.findIndex(c=>c.id===p.col), v=l&&i>=0?l.valeurs[i]:null;
  if(!v) return [''];
  return v.elements.length?v.elements.map(id=>capSyTabNom(t, id)):[v.texte.trim()];
}

/** Libellé d'une colonne en lecture seule de ▤ Tableau : libellé de Cameo, marqué 🔒 (appelée par `capTableColLabel`, 21).
 * @param {string} colKey - Clé « cameo:… »
 * @returns {string}
 */
function capSyTabColLabel(colKey){
  const p=capSyTabColParse(colKey), t=p&&capSyTabContenu(p.cle), c=t&&t.colonnes&&t.colonnes.find(x=>x.id===p.col);
  return '🔒 '+(c?c.libelle:(p?p.col.replace(/^QPROP:[^:]*:/,''):colKey));
}

/** Ouvre un tableau de Cameo dans un nouvel onglet de ▤ Tableau (51) : ses lignes (onglet à lignes données, `lignes`), les types
 * de ces lignes, ses colonnes ramenées à celles d'Arcalyse (`capSyTabColArcalyse`), les autres en lecture seule.
 * @param {string} cle - Clé du tableau
 */
function capSyTabVersTableau(cle){
  const t=capSyTabContenu(cle); if(!t||t.genre!=='tableau') return;
  const ids=t.lignes.map(l=>l.element).filter(id=>capGetElementById_(id));
  if(!ids.length){ capAlert(_L('Ce tableau n\'a aucune ligne parmi les éléments du modèle affiché.'), {level:'warn'}); return; }
  const types=[...new Set(ids.map(id=>capGetElementById_(id).typeName))];
  const cols=[...new Set(t.colonnes.map(c=>capSyTabColArcalyse(cle, c, ids)).filter(Boolean))];
  capTableTabsEnsure(); capTableSyncToTab();
  const tab=capTableTabNew(t.nom);
  Object.assign(tab, {types, lignes:ids, source:{cle, nom:t.nom, type:t.type||''}, visibleCols:cols});
  capTableTabs.push(tab); capTableTabIdx=capTableTabs.length-1; capTableSyncFromTab(); capPage=0;
  if(capCurrentView==='table') capRenderTable(); else capNavOpen('table');
  const ro=cols.filter(k=>/^cameo:/.test(k)).length;
  capToast(_L(`✔ « ${t.nom} » ouvert dans ▤ Tableau : ${ids.length} ligne(s), ${cols.length} colonne(s) dont ${ro} en lecture seule`));
}
