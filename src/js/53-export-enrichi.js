/* ══ ⬇ EXPORT CSV ENRICHI (📡 Flux & interfaces) ══════════════════════════════════
 * Avant le téléchargement, une fenêtre « Colonnes de l'export » permet de retirer des colonnes de base et,
 * pour chaque colonne qui désigne des éléments du modèle (fonction, port, échange, composant…), d'ajouter
 * des informations sur ces éléments, insérées juste à côté : ID, type, couche, owner, chemin des owners,
 * description, summary, attributs Capella, colonnes par chemin du ▤ Tableau (même type de départ).
 * Une cellule « élément » est un objet {v:texte affiché, ids:[identifiants]} (capCx) ; les autres sont du texte.
 * Les choix sont retenus par export (nom du fichier) dans _capCsvCfg, enregistré avec la page et le fichier ⚙.
 */
var _capCsvCfg = _capCsvCfg || {};   // nom d'export → {drop:[libellés retirés], add:{libellé:[clés d'informations]}} (rétabli par 46)

/** Cellule « élément » d'un export enrichi.
 * @param {string} v - Texte affiché (nom, ou noms séparés par des virgules)
 * @param {string|string[]} ids - Identifiant(s) des éléments désignés
 * @returns {{v:string, ids:string[]}} Cellule
 */
function capCx(v, ids){ return {v:v==null?'':String(v), ids:(Array.isArray(ids)?ids:[ids]).filter(Boolean)}; }

/** Cellule « élément » à partir d'une liste d'objets {id, name} (noms séparés par des virgules).
 * @param {Array<{id:string,name:string}>} list
 * @returns {{v:string, ids:string[]}} Cellule
 */
function capCxList(list){ list=list||[]; return capCx(list.map(x=>x.name).join(', '), list.map(x=>x.id)); }

/** Informations ajoutables de base (clé, libellé). */
var CAP_CSVX_INFOS=[['id','ID'],['type','Type'],['htype',_L('Type lisible')],['layer',_L('Couche')],['owner',_L('Owner')],['opath',_L('Chemin des owners')],['desc',_L('Description')],['summary',_L('Summary')]];

/** Owner (plus proche ancêtre qui est un élément du modèle) d'un élément.
 * @param {string} id @returns {object|null} Élément capAllElements */
function capCsvxOwner(id){
  const {parentOf}=capGetParentIndex(); let p=parentOf[id], k=0;
  while(p&&k<100){ const e=capGetElementById_(p); if(e&&e.typeName!=='Project') return e; p=parentOf[p]; k++; }
  return null;
}

/** Texte brut d'une description Capella (HTML retiré, sans exécuter quoi que ce soit).
 * @param {string} html @returns {string} */
function capCsvxPlain(html){
  if(!html) return '';
  try{ return (new DOMParser().parseFromString(html,'text/html').body.textContent||'').replace(/\s+/g,' ').trim(); }catch(e){ return String(html); }
}

/** Valeur d'une information pour un élément.
 * @param {string} id - Identifiant de l'élément
 * @param {string} key - Clé d'information (id, type, htype, layer, owner, opath, desc, summary, attr:…, path:…)
 * @returns {string} Valeur ('' si absente)
 */
function capCsvxInfo(id, key){
  const e=capGetElementById_(id);
  if(key==='id') return id;
  if(!e) return '';
  if(key==='type') return e.typeName;
  if(key==='htype') return (CAP_HUMAN_NAMES[e.typeName]||{}).h||e.typeName;
  if(key==='layer') return e.layer||'';
  if(key==='owner'){ const o=capCsvxOwner(id); return o?(o.attrs.name||o.typeName):''; }
  if(key==='opath'){ const out=[]; let o=capCsvxOwner(id), k=0; while(o&&k<50){ out.unshift(o.attrs.name||o.typeName); o=capCsvxOwner(o.id); k++; } return out.join(' › '); }
  if(key==='desc') return capCsvxPlain(e.attrs.description);
  if(key==='summary') return e.attrs.summary||'';
  if(key.startsWith('attr:')) return e.attrs[key.slice(5)]||'';
  if(key.startsWith('path:')){
    const c=capTableCustomCols.find(x=>x.key===key.slice(5)); if(!c) return '';
    return capResolveMetachain(e, c.steps).map(r=>typeof r==='string'?r:(r.attrs.name||r.typeName)).join(', ');
  }
  return '';
}

/** Libellé d'une clé d'information (pour l'en-tête « Colonne — information »).
 * @param {string} key @returns {string} */
function capCsvxInfoLabel(key){
  const b=CAP_CSVX_INFOS.find(x=>x[0]===key); if(b) return b[1];
  if(key.startsWith('attr:')) return key.slice(5);
  if(key.startsWith('path:')){ const c=capTableCustomCols.find(x=>x.key===key.slice(5)); return c?c.label:_L('(colonne supprimée)'); }
  return key;
}

/** Texte d'une cellule (élément ou texte).
 * @param {*} c @returns {string} */
function capCsvxText(c){ return c&&typeof c==='object' ? c.v : (c==null?'':String(c)); }

/** Construit l'en-tête et les lignes finales d'un export selon les choix enregistrés.
 * @param {string} name - Nom du fichier (clé des choix)
 * @param {string[]} header - Colonnes de base
 * @param {Array[]} rows - Lignes (cellules texte ou capCx)
 * @returns {{header:string[], rows:string[][]}} Export final
 */
function capCsvxBuild(name, header, rows){
  const cfg=_capCsvCfg[name]||{}, drop=new Set(cfg.drop||[]), add=cfg.add||{};
  const H=[], plan=[];
  header.forEach((h,i)=>{ if(drop.has(h)) return; H.push(h); plan.push({i}); (add[h]||[]).forEach(k=>{ H.push(`${h} — ${capCsvxInfoLabel(k)}`); plan.push({i,k}); }); });
  const R=rows.map(r=>plan.map(p=>{
    const c=r[p.i]; if(!p.k) return capCsvxText(c);
    const ids=c&&typeof c==='object'?c.ids:[];
    return [...new Set(ids.map(id=>capCsvxInfo(id,p.k)).filter(Boolean))].join(', ');
  }));
  return {header:H, rows:R};
}

/** Export CSV enrichi : ouvre la fenêtre « Colonnes de l'export » puis télécharge le fichier.
 * @param {string} name - Nom du fichier (.csv), aussi clé des choix retenus
 * @param {string[]} header - Colonnes de base
 * @param {Array[]} rows - Lignes : texte, ou capCx(texte, ids) pour une colonne qui désigne des éléments
 */
function capCsvExport(name, header, rows){
  // Colonnes « élément » : au moins une cellule porte des identifiants ; types et attributs rencontrés
  const ent=header.map((h,i)=>{ const ids=new Set(); rows.forEach(r=>{ const c=r[i]; if(c&&typeof c==='object') c.ids.forEach(x=>ids.add(x)); });
    if(!ids.size) return null;
    const types=new Set(), attrs=new Set();
    [...ids].slice(0,3000).forEach(id=>{ const e=capGetElementById_(id); if(!e) return; types.add(e.typeName); Object.keys(e.attrs).forEach(k=>attrs.add(k)); });
    ['name','id','description','summary'].forEach(k=>attrs.delete(k));
    const paths=capTableCustomCols.filter(c=>c.steps&&c.steps[0]&&types.has(c.steps[0].metaclass));
    return {n:ids.size, types:[...types], attrs:[...attrs].sort(), paths};
  });
  const cfg=_capCsvCfg[name]=_capCsvCfg[name]||{drop:[], add:{}};
  let ov=document.getElementById('cap-csvx-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-csvx-ov'; document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const draw=()=>{
    const drop=new Set(cfg.drop);
    const nCols=capCsvxBuild(name, header, []).header.length;
    ov.innerHTML=_L(`<div class="cw-d-box" style="max-width:760px">
      <div class="cw-d-hdr"><b>⬇ Export CSV — ${capEsc(name)}</b><button class="cap-lf-btn" data-c="x">✕</button></div>
      <div class="cw-d-body">
        <div class="cw-d-sub">Décochez les colonnes à retirer. Pour une colonne qui désigne des éléments du modèle, ajoutez des informations sur ces éléments : elles seront insérées juste à côté. Vos choix sont retenus pour cet export.</div>
        ${header.map((h,i)=>{ const E=ent[i], sel=new Set(cfg.add[h]||[]);
          const chip=(k,l,t)=>`<label class="cap-csvx-c${sel.has(k)?' on':''}"${t?` title="${capEsc(t)}"`:''}><input type="checkbox" data-add="${i}" data-k="${capEsc(k)}"${sel.has(k)?' checked':''}${drop.has(h)?' disabled':''}> ${capEsc(l)}</label>`;
          return `<div class="cap-csvx-row${drop.has(h)?' off':''}">
            <label class="cap-csvx-h"><input type="checkbox" data-col="${i}"${drop.has(h)?'':' checked'}> <b>${capEsc(h)}</b>${E?_L(` <span class="ana-dim">· ${E.n} élément(s) : ${capEsc(E.types.slice(0,3).map(t=>(CAP_HUMAN_NAMES[t]||{}).h||t).join(', '))}${E.types.length>3?'…':''}</span>`):''}</label>
            ${E?`<div class="cap-csvx-adds">${CAP_CSVX_INFOS.map(([k,l])=>chip(k,l)).join('')}
              ${E.paths.map(c=>chip('path:'+c.key,'✨ '+c.label,_L('Colonne par chemin du ▤ Tableau'))).join('')}
              ${[...sel].filter(k=>k.startsWith('attr:')).map(k=>chip(k,k.slice(5),_L('Attribut Capella'))).join('')}
              ${E.attrs.length?_L(`<select class="cap-csvx-attr" data-attr="${i}"${drop.has(h)?' disabled':''}><option value="">＋ Attribut…</option>${E.attrs.filter(a=>!sel.has('attr:'+a)).map(a=>`<option>${capEsc(a)}</option>`).join('')}</select>`):''}</div>`:''}
          </div>`; }).join('')}
      </div>
      <div class="cw-d-ftr"><button class="cap-lf-btn" data-c="reset" title="Revenir aux colonnes de base, sans information ajoutée">↺ Colonnes de base</button>
        <span class="ana-dim">${nCols} colonne(s), ${rows.length} ligne(s)</span><span style="flex:1"></span>
        <button class="cap-lf-btn" data-c="x">Annuler</button><button class="phl-export-btn" data-c="ok">⬇ Télécharger</button></div></div>`);
    ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
    ov.querySelector('[data-c="reset"]').onclick=()=>{ cfg.drop=[]; cfg.add={}; draw(); };
    ov.querySelector('[data-c="ok"]').onclick=()=>{
      ov.style.display='none';
      const out=capCsvxBuild(name, header, rows);
      capCsvDownload(name, out.header, out.rows);
    };
    ov.querySelectorAll('[data-col]').forEach(cb=>cb.onchange=()=>{ const h=header[+cb.dataset.col];
      cfg.drop=cfg.drop.filter(x=>x!==h); if(!cb.checked) cfg.drop.push(h); draw(); });
    ov.querySelectorAll('[data-add]').forEach(cb=>cb.onchange=()=>{ const h=header[+cb.dataset.add], k=cb.dataset.k;
      const a=(cfg.add[h]||[]).filter(x=>x!==k); if(cb.checked) a.push(k); if(a.length) cfg.add[h]=a; else delete cfg.add[h]; draw(); });
    ov.querySelectorAll('[data-attr]').forEach(s=>s.onchange=()=>{ if(!s.value) return; const h=header[+s.dataset.attr];
      cfg.add[h]=[...(cfg.add[h]||[]), 'attr:'+s.value]; draw(); });
  };
  draw();
  ov.style.display='flex';
}
