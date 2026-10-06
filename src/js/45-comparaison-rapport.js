/* ══ ⚖ RAPPORT DE COMPARAISON DE VERSIONS ═══════════════════════════════════════════
 * Transforme les différences brutes (capDiffCompute) en un rapport lisible :
 * - 8 catégories : ➕ Création, ➖ Suppression, ✏ Renommage, 📝 Description, ⚙ Propriétés, 🔗 Liens, ↪ Déplacement, 🔁 Type ;
 * - 4 niveaux : Synthèse (compteurs), Simple (une phrase par changement), Détaillé (avant / après), Complet (+ identifiant, chemin) ;
 * - filtres (catégories, couches, familles, recherche), regroupement, exclusion de lignes ;
 * - éléments techniques (allocations, réalisations, implications…) rattachés par défaut à l'élément qu'ils concernent ;
 * - copie dans le presse-papiers : texte mis en forme (Word, Outlook, Teams), texte brut, tableau Excel, Markdown ;
 *   exports CSV, HTML, impression.
 */
var CAP_DR_CATS=[
  {k:'add',  i:'➕', l:'Créations',     s:'Création',     c:'#3fb950'},
  {k:'del',  i:'➖', l:'Suppressions',  s:'Suppression',  c:'#f85149'},
  {k:'ren',  i:'✏', l:'Renommages',    s:'Renommage',    c:'#58a6ff'},
  {k:'desc', i:'📝', l:'Descriptions',  s:'Description',  c:'#a371f7'},
  {k:'prop', i:'⚙', l:'Propriétés',    s:'Propriété',    c:'#e3b341'},
  {k:'lnk',  i:'🔗', l:'Liens',         s:'Lien',         c:'#39c5cf'},
  {k:'mov',  i:'↪', l:'Déplacements',  s:'Déplacement',  c:'#f0883e'},
  {k:'type', i:'🔁', l:'Changements de type', s:'Type',  c:'#db61a2'}
];
/** Familles de types (filtre et synthèse), testées dans l'ordre. */
var CAP_DR_FAMS=[
  ['port', 'Ports',                 /Port$/],
  ['exch', 'Échanges',              /Exchange$|^Interaction$|CommunicationMean|PhysicalLink|^Message$/],
  ['chain','Chaînes & scénarios',   /Chain$|Process$|PhysicalPath|Scenario/],
  ['fn',   'Fonctions',             /Function$|OperationalActivity|^Activity$/],
  ['comp', 'Composants & acteurs',  /Component$|Actor$|^Entity$|^Role$|ConfigurationItem|^Part$/],
  ['cap',  'Capacités & missions',  /Capability|Mission/],
  ['state','Modes & états',         /State$|^Mode$|Region|Transition|PseudoState|Pseudostate/],
  ['req',  'Exigences',             /Requirement|^Req|Folder$|Module$/],
  ['data', 'Données & interfaces',  /^Class$|DataType|ExchangeItem|Interface$|Enumeration|Union|Collection|^Property$|NumericType|StringType|BooleanType|PhysicalQuantity|Unit$/],
  ['pkg',  'Paquetages',            /Pkg$|Package$|Architecture$|Analysis$|Engineering$|^Project$/]
];
/** Types « techniques » rattachés à leur élément propriétaire quand le regroupement est actif. */
var CAP_DR_TECH=/(Realization|Allocation|Involvement|Exploitation|DeploymentLink|Generalization|TransfoLink|GenericTrace|Include|Extend|CatalogElementLink|SequenceLink|ModelInformation|^Execution|ExecutionEnd|ExecutionEvent|MessageEnd|FragmentEnd|InteractionState|StateFragment|CombinedFragment|InteractionOperand|InteractionUse|Literal\w*Value|OpaqueExpression|KeyValue|PropertyValue$|PropertyValueGroup|Constraint$)$/;
/** Types techniques porteurs de valeur : rattachés comme ⚙ propriété (et non 🔗 lien). */
var CAP_DR_TECH_VAL=/Literal\w*Value|OpaqueExpression|KeyValue|PropertyValue$|PropertyValueGroup|Constraint$/;
var CAP_DR_SCREEN_MAX=1500;   // lignes au plus à l'écran (le copier et les exports prennent tout)

/** Famille d'un type d'élément. @param {string} t - Type @returns {string} Clé de famille ('other' sinon) */
function capDrFam(t){ const f=CAP_DR_FAMS.find(([,,re])=>re.test(t)); return f?f[0]:'other'; }
/** Libellé d'une famille. @param {string} k @returns {string} */
function capDrFamLabel(k){ const f=CAP_DR_FAMS.find(x=>x[0]===k); return f?f[1]:'Autres'; }
/** Catégorie d'un changement d'attribut d'un élément modifié. @param {object} c - Changement {k,ref} @returns {string} */
function capDrCatOf(c){
  if(c.cat) return c.cat;
  if(c.k==='name') return 'ren';
  if(c.k==='description'||c.k==='summary') return 'desc';
  if(c.k==='type') return 'type';
  if(c.k==='propriétaire') return 'mov';
  if(c.ref) return 'lnk';
  return 'prop';
}

/** Construit les éléments du rapport à partir des différences brutes.
 * @param {object[]} diffs - Résultat de capDiffCompute
 * @param {object} A - Index de l'ancienne version (capDiffIndex)
 * @param {object} B - Index de la nouvelle version
 * @param {boolean} groupTech - Rattacher les éléments techniques à leur propriétaire
 * @returns {object[]} Éléments {key,id,status,type,name,oldName,layer,fam,parent,path,changes:[{k,a,b,cat,added,removed}],cats:Set}
 */
function capDrBuild(diffs, A, B, groupTech){
  const items={}, order=[];
  const nm=(ix,id)=>{ const e=ix[id]; return e?(e.name||capAnaHuman(e.type)):''; };
  const pathOf=(ix,id)=>{ const out=[]; let p=ix[id]&&ix[id].parent, n=0; while(p&&ix[p]&&n++<40){ out.unshift(ix[p].name||capAnaHuman(ix[p].type)); p=ix[p].parent; } return out.join(' › '); };
  const mk=(e,status,ix)=>{
    let it=items[e.id]; if(it) return it;
    it=items[e.id]={key:e.id, id:e.id, status, type:e.type, name:e.name||'', oldName:'', layer:e.layer||'?', fam:capDrFam(e.type),
      parent:nm(ix,e.parent), path:pathOf(ix,e.id), changes:[], cats:new Set()};
    if(status==='add') it.cats.add('add'); else if(status==='del') it.cats.add('del');
    order.push(it); return it;
  };
  const statusOf={}; diffs.forEach(d=>statusOf[d.e.id]=d.status);
  const tech=[];
  diffs.forEach(d=>{
    if(groupTech&&CAP_DR_TECH.test(d.e.type)){ tech.push(d); return; }
    const ix=d.status==='del'?A:B, it=mk(d.e,d.status,ix);
    if(d.status==='mod') d.changes.forEach(c=>{
      const cat=capDrCatOf(c); it.cats.add(cat);
      if(cat==='ren') it.oldName=c.a;
      it.changes.push({...c, cat});
    });
  });
  // Éléments techniques → changement (🔗 lien ou ⚙ propriété) de leur propriétaire non technique
  tech.forEach(d=>{
    const ix=d.status==='del'?A:B;
    let p=d.e.parent; while(p&&ix[p]&&CAP_DR_TECH.test(ix[p].type)) p=ix[p].parent;
    if(!p||!ix[p]) return;
    if(statusOf[p]==='add'||statusOf[p]==='del') return;   // propriétaire créé ou supprimé : déjà dit
    const owner=items[p]||mk(ix[p],'mod',ix);
    const cat=CAP_DR_TECH_VAL.test(d.e.type)?'prop':'lnk';
    // Libellé : extrémités référencées autres que le propriétaire (ex. composant d'une allocation), ou valeur
    const refs=Object.values(d.e.attrs).filter(v=>/^#/.test(v)).flatMap(v=>v.split(/\s+/)).map(t=>t.slice(1)).filter(id=>id!==p);
    const other=[...new Set(refs.map(id=>nm(ix,id)).filter(Boolean))].join(', ');
    const label=cat==='prop'?[d.e.name,d.e.attrs.value||d.e.attrs.body||''].filter(Boolean).join(' = ')||capAnaHuman(d.e.type):(other||d.e.name||capAnaHuman(d.e.type));
    const k=capAnaHuman(d.e.type);
    if(d.status==='add') owner.changes.push({k, a:'', b:label, cat, added:[label], removed:[]});
    else if(d.status==='del') owner.changes.push({k, a:label, b:'', cat, added:[], removed:[label]});
    else d.changes.forEach(c=>owner.changes.push({...c, k:k+' › '+c.k, cat}));
    owner.cats.add(cat);
  });
  // Éléments créés / supprimés avec leur conteneur : rattachés au conteneur (« avec n éléments contenus »)
  const byId={}; order.forEach(it=>byId[it.id]=it);
  order.forEach(it=>{
    if(it.status!=='add'&&it.status!=='del') return;
    const ix=it.status==='del'?A:B; let p=ix[it.id]&&ix[it.id].parent, n=0;
    while(p&&n++<60){ const a=byId[p]; if(a&&a.status===it.status){ (a.contained=a.contained||[]).push(it); it.folded=true; break; } p=ix[p]&&ix[p].parent; }
  });
  return order.filter(it=>!it.folded&&it.cats.size);
}

/** Éléments contenus (récursivement) d'un élément créé ou supprimé. @param {object} it @returns {object[]} */
function capDrContained(it){ return (it.contained||[]).flatMap(c=>[c,...capDrContained(c)]); }

/** Entrées du rapport (un élément × une catégorie) retenues par les filtres.
 * @param {object[]} items - Résultat de capDrBuild
 * @param {object} st - État des filtres
 * @returns {object[]} Entrées {key,cat,it,changes}
 */
function capDrEntries(items, st){
  const q=capTfNorm(st.q.trim());
  const out=[];
  items.forEach(it=>{
    if(st.layers.size&&!st.layers.has(it.layer)) return;
    if(st.fams.size&&!st.fams.has(it.fam)) return;
    if(q&&!capTfNorm(it.name+' '+it.oldName+' '+capAnaHuman(it.type)+' '+it.parent).includes(q)) return;
    CAP_DR_CATS.forEach(C=>{
      if(!it.cats.has(C.k)||!st.cats.has(C.k)) return;
      out.push({key:it.id+'|'+C.k, cat:C.k, it, changes:it.changes.filter(c=>c.cat===C.k)});
    });
  });
  return out;
}

/** Valeur courte pour une phrase (tronquée). @param {string} v @param {number} [n] @returns {string} */
function capDrShort(v,n){ v=String(v==null?'':v).replace(/\s+/g,' ').trim(); n=n||60; return v.length>n?v.slice(0,n-1)+'…':v; }

/** Phrase d'une entrée (niveau Simple), en texte brut.
 * @param {object} en - Entrée
 * @returns {string} Phrase
 */
function capDrSentence(en){
  const it=en.it, H=capAnaHuman(it.type), N=`« ${it.name||'(sans nom)'} »`;
  const list=f=>en.changes.map(f).filter(Boolean).join(' ; ');
  switch(en.cat){
    case 'add':
    case 'del': { const n=capDrContained(it).length;
      return `${H} ${N}${it.parent?(en.cat==='add'?` — dans « ${it.parent} »`:` — était dans « ${it.parent} »`):''}${n?` — avec ${n} élément${n>1?'s':''} contenu${n>1?'s':''}`:''}`; }
    case 'ren':  return `${H} : « ${it.oldName} » → ${N}`;
    case 'desc': return `${H} ${N} : ${list(c=>c.k==='summary'?'résumé modifié':c.k==='description'?'description modifiée':c.k+' modifié')}`;
    case 'prop': return `${H} ${N} : ${list(c=>{ const a=capDrShort(c.a,30), b=capDrShort(c.b,30); return !c.a?`${c.k} = ${b}`:!c.b?`${c.k} retiré (${a})`:`${c.k} : ${a} → ${b}`; })}`;
    case 'lnk':  return `${H} ${N} : ${list(c=>{ const add=(c.added||[]).filter(Boolean), rem=(c.removed||[]).filter(Boolean);
                   return `${c.k} ${[add.length?'+ '+add.map(x=>`« ${capDrShort(x,40)} »`).join(', '):'', rem.length?'− '+rem.map(x=>`« ${capDrShort(x,40)} »`).join(', '):''].filter(Boolean).join(' ')||'modifié'}`; })}`;
    case 'mov':  { const c=en.changes[0]||{}; return `${H} ${N} : déplacé de « ${c.a} » vers « ${c.b} »`; }
    case 'type': { const c=en.changes[0]||{}; return `${N} : ${capAnaHuman(c.a)} → ${capAnaHuman(c.b)}`; }
  }
  return `${H} ${N}`;
}

/** Lignes avant / après d'une entrée (niveaux Détaillé et Complet). @param {object} en @returns {object[]} [{k,a,b}] */
function capDrDetail(en){
  if(en.cat==='lnk') return en.changes.map(c=>({k:c.k, a:(c.removed&&c.removed.length?c.removed.join(', '):c.a)||'', b:(c.added&&c.added.length?c.added.join(', '):c.b)||''}));
  if(en.cat==='add'||en.cat==='del'){
    const cs=capDrContained(en.it); if(!cs.length) return [];
    const by={}; cs.forEach(c=>{ const h=capAnaHuman(c.type); (by[h]=by[h]||[]).push(`« ${c.name||'(sans nom)'} »`); });
    return Object.entries(by).map(([h,ns])=>({k:`Contenu : ${h} (${ns.length})`, a:en.cat==='del'?ns.join(', '):'', b:en.cat==='add'?ns.join(', '):''}));
  }
  return en.changes.map(c=>({k:c.k, a:c.a||'', b:c.b||''}));
}

/** Groupes d'entrées selon le regroupement choisi. @param {object[]} ens @param {string} by @returns {object[]} [{label,ens}] */
function capDrGroups(ens, by){
  const g=new Map();
  const keyOf=en=>by==='layer'?(en.it.layer==='?'?'Hors couche':en.it.layer):by==='fam'?capDrFamLabel(en.it.fam):by==='parent'?(en.it.parent||'(racine)'):en.cat;
  ens.forEach(en=>{ const k=keyOf(en); if(!g.has(k)) g.set(k,[]); g.get(k).push(en); });
  let arr=[...g.entries()].map(([k,v])=>({k, ens:v}));
  if(by==='cat') arr.sort((a,b)=>CAP_DR_CATS.findIndex(c=>c.k===a.k)-CAP_DR_CATS.findIndex(c=>c.k===b.k));
  else if(by==='layer') arr.sort((a,b)=>CAP_CHAIN_LAYER_ORDER.indexOf(a.k)-CAP_CHAIN_LAYER_ORDER.indexOf(b.k));
  else arr.sort((a,b)=>a.k.localeCompare(b.k,'fr'));
  return arr.map(x=>{ const C=CAP_DR_CATS.find(c=>c.k===x.k); return {label:C?`${C.i} ${C.l}`:x.k, color:C?C.c:'', ens:x.ens}; });
}

/** Modèle du rapport (indépendant du format) : en-tête, synthèse, groupes.
 * @param {object[]} items - Éléments (capDrBuild)
 * @param {object} st - État (niveau, filtres, exclusions)
 * @param {object} meta - {oldName,newName}
 * @returns {object} Rapport
 */
function capDrModel(items, st, meta){
  const all=capDrEntries(items, st), ens=all.filter(en=>!st.ex.has(en.key));
  const cnt={}; CAP_DR_CATS.forEach(c=>cnt[c.k]=ens.filter(en=>en.cat===c.k).length);
  const layers=[...new Set(ens.map(en=>en.it.layer))].sort((a,b)=>CAP_CHAIN_LAYER_ORDER.indexOf(a)-CAP_CHAIN_LAYER_ORDER.indexOf(b));
  const byLayer=layers.map(L=>({L, v:CAP_DR_CATS.map(c=>ens.filter(en=>en.cat===c.k&&en.it.layer===L).length)}));
  const fams=[...new Set(ens.map(en=>en.it.fam))].sort((a,b)=>capDrFamLabel(a).localeCompare(capDrFamLabel(b),'fr'));
  const byFam=fams.map(f=>({f:capDrFamLabel(f), v:CAP_DR_CATS.map(c=>ens.filter(en=>en.cat===c.k&&en.it.fam===f).length)}));
  const filt=[st.cats.size<CAP_DR_CATS.length&&'catégories : '+CAP_DR_CATS.filter(c=>st.cats.has(c.k)).map(c=>c.l).join(', '),
    st.layers.size&&'couches : '+[...st.layers].join(', '), st.fams.size&&'familles : '+[...st.fams].map(capDrFamLabel).join(', '),
    st.q.trim()&&`recherche « ${st.q.trim()} »`, st.ex.size&&`${st.ex.size} ligne(s) exclue(s)`].filter(Boolean);
  return {title:'Comparaison de versions', oldName:meta.oldName, newName:meta.newName, date:new Date().toLocaleDateString('fr-FR'),
    total:ens.length, cnt, byLayer, byFam, filt, level:st.level, groups:capDrGroups(ens, st.by), all, ens};
}

/** Rapport au format HTML mis en forme (styles en ligne : collage dans Word, Outlook, Teams ; export, impression).
 * @param {object} R - Modèle (capDrModel)
 * @returns {string} HTML
 */
function capDrRichHtml(R){
  const E=capEsc, td='border:1px solid #bbb;padding:3px 6px;vertical-align:top;', th=td+'background:#eee;text-align:left;';
  const counts=`<table style="border-collapse:collapse;font-size:10pt;margin:6px 0"><tr><th style="${th}">Catégorie</th>${R.byLayer.map(r=>`<th style="${th}">${E(r.L==='?'?'Hors couche':r.L)}</th>`).join('')}<th style="${th}">Total</th></tr>
    ${CAP_DR_CATS.filter(c=>R.cnt[c.k]).map((c,i)=>`<tr><td style="${td}"><span style="color:${c.c}">${c.i}</span> ${E(c.l)}</td>${R.byLayer.map(r=>`<td style="${td}text-align:right">${r.v[CAP_DR_CATS.indexOf(c)]||''}</td>`).join('')}<td style="${td}text-align:right"><b>${R.cnt[c.k]}</b></td></tr>`).join('')}</table>`;
  let h=`<div style="font-family:Segoe UI,Arial,sans-serif;font-size:10.5pt">
    <h2 style="font-size:14pt;margin:0 0 4px">⚖ ${E(R.title)}</h2>
    <div style="color:#555;margin-bottom:6px">${E(R.oldName||'—')} → ${E(R.newName||'—')} · ${E(R.date)} · <b>${R.total}</b> changement(s)${R.filt.length?' · filtres : '+E(R.filt.join(' ; ')):''}</div>`;
  if(R.level==='synth'){
    h+=counts+(R.byFam.length?`<table style="border-collapse:collapse;font-size:10pt;margin:6px 0"><tr><th style="${th}">Famille</th>${CAP_DR_CATS.map(c=>`<th style="${th}" title="${E(c.l)}">${c.i}</th>`).join('')}</tr>
      ${R.byFam.map(r=>`<tr><td style="${td}">${E(r.f)}</td>${r.v.map(v=>`<td style="${td}text-align:right">${v||''}</td>`).join('')}</tr>`).join('')}</table>`:'');
    return h+'</div>';
  }
  R.groups.forEach(g=>{
    h+=`<h3 style="font-size:12pt;margin:12px 0 4px;${g.color?'color:'+g.color:''}">${E(g.label)} (${g.ens.length})</h3><ul style="margin:0 0 6px 18px;padding:0">`;
    g.ens.forEach(en=>{
      const C=CAP_DR_CATS.find(c=>c.k===en.cat);
      h+=`<li style="margin:2px 0"><span style="color:${C.c}">${C.i}</span> ${E(capDrSentence(en))}`;
      if(R.level==='full') h+=`<div style="color:#777;font-size:9pt">${E(en.it.layer)} · ${E(en.it.type)} · id ${E(en.it.id)}${en.it.path?' · '+E(en.it.path):''}</div>`;
      const det=(R.level==='detail'||R.level==='full')?capDrDetail(en):[];
      if(det.length) h+=`<table style="border-collapse:collapse;font-size:9.5pt;margin:3px 0 6px"><tr><th style="${th}">Propriété</th><th style="${th}">Avant</th><th style="${th}">Après</th></tr>
        ${det.map(r=>`<tr><td style="${td}"><b>${E(r.k)}</b></td><td style="${td}color:#b42318">${E(capDrShort(r.a,800))||'<i>vide</i>'}</td><td style="${td}color:#1a7f37">${E(capDrShort(r.b,800))||'<i>vide</i>'}</td></tr>`).join('')}</table>`;
      h+='</li>';
    });
    h+='</ul>';
  });
  return h+'</div>';
}

/** Rapport en texte brut (lignes indentées). @param {object} R - Modèle @returns {string} */
function capDrText(R){
  const L=[`⚖ ${R.title} — ${R.oldName||'—'} → ${R.newName||'—'} (${R.date}) — ${R.total} changement(s)`];
  if(R.filt.length) L.push('Filtres : '+R.filt.join(' ; '));
  if(R.level==='synth'){
    CAP_DR_CATS.filter(c=>R.cnt[c.k]).forEach(c=>L.push(`${c.i} ${c.l} : ${R.cnt[c.k]}  (${R.byLayer.filter(r=>r.v[CAP_DR_CATS.indexOf(c)]).map(r=>`${r.L} ${r.v[CAP_DR_CATS.indexOf(c)]}`).join(', ')})`));
    if(R.byFam.length){ L.push('', 'Par famille :'); R.byFam.forEach(r=>L.push(`  ${r.f} : `+CAP_DR_CATS.map((c,i)=>r.v[i]?`${c.i} ${r.v[i]}`:'').filter(Boolean).join('  '))); }
    return L.join('\n');
  }
  R.groups.forEach(g=>{
    L.push('', `${g.label} (${g.ens.length})`);
    g.ens.forEach(en=>{
      L.push(`  • ${capDrSentence(en)}`);
      if(R.level==='full') L.push(`      [${en.it.layer} · ${en.it.type} · id ${en.it.id}${en.it.path?' · '+en.it.path:''}]`);
      if(R.level==='detail'||R.level==='full') capDrDetail(en).forEach(r=>L.push(`      ${r.k} : « ${capDrShort(r.a,300)} » → « ${capDrShort(r.b,300)} »`));
    });
  });
  return L.join('\n');
}

/** Rapport en tableau (une ligne par changement de propriété) : colonnes pour Excel / CSV.
 * @param {object} R - Modèle
 * @returns {{head:string[], rows:string[][]}}
 */
function capDrTable(R){
  const head=['Catégorie','Couche','Famille','Type','Élément','Ancien nom','Parent','Propriété','Avant','Après','Résumé','ID','Chemin'];
  const rows=[];
  R.ens.forEach(en=>{
    const C=CAP_DR_CATS.find(c=>c.k===en.cat), it=en.it;
    const base=[C.s, it.layer, capDrFamLabel(it.fam), capAnaHuman(it.type), it.name, it.oldName, it.parent];
    const det=capDrDetail(en);
    if(!det.length) rows.push([...base,'','','',capDrSentence(en),it.id,it.path]);
    det.forEach(r=>rows.push([...base,r.k,r.a,r.b,capDrSentence(en),it.id,it.path]));
  });
  return {head, rows};
}

/** Rapport en Markdown (listes ; tableaux avant / après aux niveaux Détaillé et Complet). @param {object} R @returns {string} */
function capDrMarkdown(R){
  const md=v=>String(v==null?'':v).replace(/\|/g,'\\|').replace(/\s+/g,' ');
  const L=[`## ⚖ ${R.title}`, '', `**${R.oldName||'—'}** → **${R.newName||'—'}** · ${R.date} · **${R.total}** changement(s)${R.filt.length?' · filtres : '+R.filt.join(' ; '):''}`];
  if(R.level==='synth'){
    L.push('', `| Catégorie | ${R.byLayer.map(r=>r.L).join(' | ')} | Total |`, `|---|${R.byLayer.map(()=>'---:').join('|')}|---:|`);
    CAP_DR_CATS.filter(c=>R.cnt[c.k]).forEach(c=>L.push(`| ${c.i} ${c.l} | ${R.byLayer.map(r=>r.v[CAP_DR_CATS.indexOf(c)]||'').join(' | ')} | ${R.cnt[c.k]} |`));
    return L.join('\n');
  }
  R.groups.forEach(g=>{
    L.push('', `### ${g.label} (${g.ens.length})`);
    g.ens.forEach(en=>{
      L.push(`- ${md(capDrSentence(en))}`);
      if(R.level==='full') L.push(`  - \`${en.it.id}\` · ${md(en.it.type)}${en.it.path?' · '+md(en.it.path):''}`);
      const det=(R.level==='detail'||R.level==='full')?capDrDetail(en):[];
      if(det.length){ L.push('', '  | Propriété | Avant | Après |', '  |---|---|---|'); det.forEach(r=>L.push(`  | ${md(r.k)} | ${md(capDrShort(r.a,300))} | ${md(capDrShort(r.b,300))} |`)); L.push(''); }
    });
  });
  return L.join('\n');
}

/** Copie dans le presse-papiers (HTML mis en forme + texte brut ; repli par sélection si l'API est refusée).
 * @param {string} html - Version mise en forme (ou null)
 * @param {string} text - Version texte
 * @returns {Promise<boolean>} Succès
 */
async function capDrClipboard(html, text){
  try{
    if(html&&window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){
      await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);
      return true;
    }
    if(!html&&navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); return true; }
  }catch(e){ /* repli ci-dessous */ }
  // Repli : sélection d'un élément temporaire puis commande « copier »
  const d=document.createElement(html?'div':'textarea');
  d.style.cssText='position:fixed;left:-9999px;top:0;white-space:pre;';
  if(html){ d.contentEditable='true'; d.innerHTML=html; } else d.value=text;
  document.body.appendChild(d);
  let ok=false;
  try{
    if(html){ const r=document.createRange(); r.selectNodeContents(d); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }
    else d.select();
    ok=document.execCommand('copy');
  }catch(e){ ok=false; }
  getSelection().removeAllRanges(); d.remove();
  return ok;
}

/** Rend le rapport de comparaison dans un conteneur (barre de réglages, filtres, rapport, copie et exports).
 * @param {HTMLElement} host - Conteneur du rapport
 * @param {object[]} diffs - Différences brutes (capDiffCompute)
 * @param {object} A - Index de l'ancienne version
 * @param {object} B - Index de la nouvelle version
 * @param {object} meta - {oldName,newName}
 */
function capDrRender(host, diffs, A, B, meta){
  const st=host._dr=host._dr||{level:'simple', by:'cat', cats:new Set(CAP_DR_CATS.map(c=>c.k)), layers:new Set(), fams:new Set(), q:'', ex:new Set(), groupTech:true, fmt:'rich'};
  if(!host._drItems||host._drDiffs!==diffs||host._drTech!==st.groupTech){ host._drItems=capDrBuild(diffs,A,B,st.groupTech); host._drDiffs=diffs; host._drTech=st.groupTech; }
  const items=host._drItems;
  const R=capDrModel(items, st, meta);
  const allEns=capDrEntries(items,{...st, cats:new Set(CAP_DR_CATS.map(c=>c.k)), ex:new Set()});
  const catN=k=>allEns.filter(en=>en.cat===k).length;
  const layers=[...new Set(items.map(it=>it.layer))].sort((a,b)=>CAP_CHAIN_LAYER_ORDER.indexOf(a)-CAP_CHAIN_LAYER_ORDER.indexOf(b));
  const fams=[...new Set(items.map(it=>it.fam))].sort((a,b)=>capDrFamLabel(a).localeCompare(capDrFamLabel(b),'fr'));
  const LV=[['synth','Synthèse','Compteurs par catégorie, couche et famille'],['simple','Simple','Une phrase par changement'],['detail','Détaillé','Avec chaque propriété avant → après'],['full','Complet','Avec identifiant, type technique et chemin']];
  const BY=[['cat','Catégorie'],['layer','Couche'],['fam','Famille'],['parent','Élément parent']];
  const FMT=[['rich','📋 Copier (mis en forme)','Pour Word, Outlook, Teams, OneNote : titres, listes, tableaux et couleurs'],['text','📋 Copier (texte brut)','Lignes indentées, pour un e-mail simple ou un outil de suivi'],['tsv','📋 Copier (tableau Excel)','Une ligne par changement, colonnes séparées par des tabulations'],['md','📋 Copier (Markdown)','Pour GitLab / GitHub, wiki']];
  const chip=(on,attr,val,label,title,color)=>`<button class="cap-lf-btn${on?' active':''}" ${attr}="${capEsc(val)}"${title?` title="${capEsc(title)}"`:''}${on&&color?` style="border-color:${color};color:${color}"`:''}>${label}</button>`;

  // Rapport à l'écran : même contenu que la copie, avec cases d'exclusion
  let body;
  if(st.level==='synth') body=capDrRichHtml(R);
  else {
    let n=0;
    body=R.all.length?capDrGroups(R.all, st.by).map(g=>`<div class="dr-grp"><div class="dr-grp-h" style="${g.color?'color:'+g.color:''}">${capEsc(g.label)} <span class="ana-dim">(${g.ens.length})</span></div>
      ${g.ens.map(en=>{ if(n++>=CAP_DR_SCREEN_MAX) return '';
        const C=CAP_DR_CATS.find(c=>c.k===en.cat), it=en.it, inCur=it.status!=='del'!==capDiffSwap;
        const det=(st.level==='detail'||st.level==='full')?capDrDetail(en):[];
        return `<div class="dr-line"><label class="dr-chk" title="Inclure cette ligne dans la copie et les exports"><input type="checkbox" data-ex="${capEsc(en.key)}" checked></label>
          <div class="dr-txt"><span style="color:${C.c}">${C.i}</span> ${capEsc(capDrSentence(en))} ${capChainLayerBadge(it.layer)}${inCur?` <span class="dr-open" data-open="${capEsc(it.id)}" title="Ouvrir le détail">↗</span>`:''}
          ${st.level==='full'?`<div class="dr-meta">${capEsc(it.type)} · id ${capEsc(it.id)}${it.path?' · '+capEsc(it.path):''}</div>`:''}
          ${det.length?`<table class="ana-t dr-det"><tr><th>Propriété</th><th>Avant</th><th>Après</th></tr>${det.map(r=>`<tr><td><b>${capEsc(r.k)}</b></td><td class="ana-old">${capEsc(capDrShort(r.a,800))||'<i>vide</i>'}</td><td class="ana-new">${capEsc(capDrShort(r.b,800))||'<i>vide</i>'}</td></tr>`).join('')}</table>`:''}</div></div>`; }).join('')}</div>`).join('')
      +(R.all.length>CAP_DR_SCREEN_MAX?`<div class="cap-mx-hint">${CAP_DR_SCREEN_MAX} lignes affichées sur ${R.all.length} — la copie et les exports contiennent tout.</div>`:'')
      :'<div class="phl-empty">Aucun changement pour ces filtres.</div>';
  }

  host.innerHTML=`
    <div class="dr-bar">
      <span class="tb-grp"><span class="tb-grp-l">Niveau</span>${LV.map(([k,l,t])=>chip(st.level===k,'data-lv',k,l,t)).join('')}</span>
      <span class="tb-grp"><span class="tb-grp-l">Préréglage</span>
        <button class="cap-lf-btn" data-pre="notes" title="Simple, regroupé par catégorie, éléments techniques rattachés : pour des notes de version">📰 Notes de version</button>
        <button class="cap-lf-btn" data-pre="review" title="Détaillé, avant / après">🔍 Revue</button>
        <button class="cap-lf-btn" data-pre="audit" title="Complet, éléments techniques non regroupés">🧾 Audit</button></span>
    </div>
    <div class="dr-bar">
      <span class="tb-grp"><span class="tb-grp-l">Catégories</span>${CAP_DR_CATS.map(c=>chip(st.cats.has(c.k),'data-cat',c.k,`${c.i} ${c.l} (${catN(c.k)})`,'',c.c)).join('')}
        <button class="cap-lf-btn" data-cat="*" title="Tout cocher / tout décocher">✱</button></span>
    </div>
    <div class="dr-bar">
      <span class="tb-grp"><span class="tb-grp-l">Couches</span>${layers.map(L=>chip(st.layers.has(L),'data-ly',L,L==='?'?'Hors couche':L,'Aucune sélection = toutes')).join('')}</span>
      <select class="phl-filter-input" id="dr-fam" style="width:auto" title="Famille de types"><option value="">Toutes familles</option>${fams.map(f=>`<option value="${f}"${st.fams.has(f)?' selected':''}>${capEsc(capDrFamLabel(f))}</option>`).join('')}</select>
      <input class="phl-filter-input" id="dr-q" placeholder="🔍 Nom, type, parent…" value="${capEsc(st.q)}" style="width:170px">
      <label class="dr-opt">Regrouper par <select class="phl-filter-input" id="dr-by" style="width:auto">${BY.map(([k,l])=>`<option value="${k}"${st.by===k?' selected':''}>${l}</option>`).join('')}</select></label>
      <label class="dr-opt" title="Allocations, réalisations, implications, valeurs… sont rattachées à l'élément qu'elles concernent (sinon listées comme éléments à part)"><input type="checkbox" id="dr-tech"${st.groupTech?' checked':''}> Rattacher le technique à son élément</label>
    </div>
    <div class="dr-bar dr-actions">
      <span class="ana-dim"><b>${R.total}</b> changement(s) retenu(s)${st.ex.size?` · ${st.ex.size} exclu(s) <span class="dr-link" id="dr-unex">↺ tout réinclure</span>`:''}</span>
      <span style="flex:1"></span>
      <select class="phl-filter-input" id="dr-fmt" style="width:auto" title="Format de la copie">${FMT.map(([k,l,t])=>`<option value="${k}"${st.fmt===k?' selected':''} title="${capEsc(t)}">${l.replace('📋 Copier (','Format : ').replace(')','')}</option>`).join('')}</select>
      <button class="phl-export-btn" id="dr-copy" title="Copier le rapport affiché (niveau et filtres) dans le presse-papiers">📋 Copier</button>
      <button class="phl-export-btn" id="dr-csv" title="Tableau : une ligne par changement de propriété">⬇ CSV</button>
      <button class="phl-export-btn" id="dr-html" title="Rapport HTML autonome mis en forme">⬇ HTML</button>
      <button class="phl-export-btn" id="dr-print" title="Imprimer ou enregistrer en PDF">🖨 Imprimer</button>
    </div>
    <div class="dr-report">${body}</div>`;
  // Lignes exclues : décochées
  host.querySelectorAll('[data-ex]').forEach(cb=>{ if(st.ex.has(cb.dataset.ex)){ cb.checked=false; cb.closest('.dr-line').classList.add('dr-off'); } });

  const re=()=>capDrRender(host, diffs, A, B, meta);
  host.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{ st.level=b.dataset.lv; re(); });
  host.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ const k=b.dataset.cat;
    if(k==='*'){ if(st.cats.size===CAP_DR_CATS.length) st.cats.clear(); else CAP_DR_CATS.forEach(c=>st.cats.add(c.k)); }
    else if(st.cats.has(k)) st.cats.delete(k); else st.cats.add(k); re(); });
  host.querySelectorAll('[data-ly]').forEach(b=>b.onclick=()=>{ const k=b.dataset.ly; if(st.layers.has(k)) st.layers.delete(k); else st.layers.add(k); re(); });
  host.querySelector('#dr-fam').onchange=e=>{ st.fams=new Set(e.target.value?[e.target.value]:[]); re(); };
  host.querySelector('#dr-by').onchange=e=>{ st.by=e.target.value; re(); };
  host.querySelector('#dr-tech').onchange=e=>{ st.groupTech=e.target.checked; st.ex.clear(); re(); };
  host.querySelector('#dr-fmt').onchange=e=>{ st.fmt=e.target.value; };
  let deb; host.querySelector('#dr-q').oninput=e=>{ st.q=e.target.value; clearTimeout(deb); deb=setTimeout(()=>{ const p=e.target.selectionStart; re(); const i=host.querySelector('#dr-q'); i.focus(); i.setSelectionRange(p,p); },250); };
  host.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>{
    const p=b.dataset.pre; st.cats=new Set(CAP_DR_CATS.map(c=>c.k)); st.ex.clear(); st.by='cat';
    if(p==='notes'){ st.level='simple'; st.groupTech=true; }
    else if(p==='review'){ st.level='detail'; st.groupTech=true; }
    else { st.level='full'; st.groupTech=false; }
    re();
  });
  host.querySelectorAll('[data-ex]').forEach(cb=>cb.onchange=()=>{ if(cb.checked) st.ex.delete(cb.dataset.ex); else st.ex.add(cb.dataset.ex); re(); });
  host.querySelector('#dr-unex')?.addEventListener('click',()=>{ st.ex.clear(); re(); });
  host.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>capOpenDetailById(x.dataset.open));
  host.querySelector('#dr-copy').onclick=async()=>{
    const f=st.fmt, btn=host.querySelector('#dr-copy');
    let ok;
    if(f==='rich') ok=await capDrClipboard(capDrRichHtml(R), capDrText(R));
    else if(f==='text') ok=await capDrClipboard(null, capDrText(R));
    else if(f==='md') ok=await capDrClipboard(null, capDrMarkdown(R));
    else { const T=capDrTable(R); const cell=v=>String(v==null?'':v).replace(/[\t\r\n]+/g,' '); ok=await capDrClipboard(null, [T.head,...T.rows].map(r=>r.map(cell).join('\t')).join('\n')); }
    btn.textContent=ok?'✔ Copié':'⚠ Copie impossible'; setTimeout(()=>{ btn.textContent='📋 Copier'; },1600);
  };
  host.querySelector('#dr-csv').onclick=()=>{ const T=capDrTable(R); capCsvDownload('comparaison-versions.csv',T.head,T.rows); };
  /** Document HTML autonome du rapport. */
  const doc=()=>`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Comparaison de versions</title><style>body{margin:24px;background:#fff;color:#111}@media print{body{margin:10mm}}</style></head><body>${capDrRichHtml(R)}</body></html>`;
  host.querySelector('#dr-html').onclick=()=>{
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([doc()],{type:'text/html'})); a.download='comparaison-versions.html'; a.click(); URL.revokeObjectURL(a.href);
  };
  host.querySelector('#dr-print').onclick=()=>{
    const w=window.open('','_blank'); if(!w){ alert('Fenêtre bloquée par le navigateur : utilisez ⬇ HTML puis imprimez le fichier.'); return; }
    w.document.open(); w.document.write(doc()); w.document.close(); w.focus(); setTimeout(()=>w.print(),200);
  };
}
