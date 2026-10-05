/* ═══════════════════════════════════════════════════════════════════════
   THÈME PERSONNALISÉ — éditeur de couleurs (menu 🎨 Thème › Personnaliser…)
   Un seul thème personnalisé (« 🎨 Personnalisé »), conservé dans la 💾 Page HTML
   (bloc JSON cap-theme-custom) : variables de couleur + couleurs des couches ARCADIA.
   ═══════════════════════════════════════════════════════════════════════ */
/** Variables de couleur personnalisables : [variable CSS, libellé, groupe]. */
const CAP_THEME_FIELDS=[
  ['--c-bg','Fond principal','Fonds'],['--c-bg2','Panneaux et cartes','Fonds'],
  ['--c-bg3','Champs, en-têtes, survol','Fonds'],['--c-bg4','Fond secondaire','Fonds'],
  ['--c-text','Texte','Textes et traits'],['--c-dim','Texte secondaire','Textes et traits'],
  ['--c-accent','Accent (liens, sélection, boutons actifs)','Textes et traits'],['--c-border','Bordures','Textes et traits'],
  ['--c-ok','Statut conforme','Statuts'],['--c-warn','Statut à surveiller','Statuts'],['--c-err','Statut en erreur','Statuts'],
  ['--c-ctx','Contexte / surbrillance','Relation Map'],['--c-node-bg','Fond des nœuds','Relation Map'],
  ['--c-node-txt','Texte des nœuds','Relation Map'],['--c-node-hdr','En-tête des nœuds','Relation Map'],['--c-shadow','Ombres','Relation Map']];
/** Couches ARCADIA dont la couleur est personnalisable : [clé CAP_LAYERS, libellé]. */
const CAP_THEME_LAYERS=[['OA','OA — Operational Analysis'],['SA','SA — System Analysis'],['LA','LA — Logical Architecture'],
  ['PA','PA — Physical Architecture'],['EPBS','EPBS'],['Shared','Transverse']];
var _capThemeReady=false;     // vrai une fois ce module chargé (CAP_LAYERS disponible)
var _capLayerDefaults=null;   // couleurs d'origine des couches, restaurées hors thème personnalisé
/* Stockage : un bloc JSON dans la page, conservé par la 💾 Page HTML */
var capThemeStore=(()=>{ try{ const el=document.getElementById('cap-theme-custom'); return el?JSON.parse(el.textContent):null; }catch(e){ return null; } })();

/** Enregistre le thème personnalisé dans la page (bloc JSON repris par la 💾 Page HTML). */
function capThemeSave(){
  let el=document.getElementById('cap-theme-custom');
  if(!el){ el=document.createElement('script'); el.type='application/json'; el.id='cap-theme-custom'; document.head.appendChild(el); }
  el.textContent=JSON.stringify(capThemeStore).replace(/</g,'\\u003c');
}
/** Déclare (ou retire) le thème personnalisé dans THEMES et dans le sélecteur de thème. */
function capThemeRegister(){
  const sel=document.getElementById('theme-sel'); let opt=sel&&sel.querySelector('option[value="custom"]');
  if(capThemeStore&&capThemeStore.css){
    const bg=capParseColor(capThemeStore.css['--c-bg']);
    THEMES.custom={css:{...capThemeStore.css}, light:!!bg&&capLuminance(bg)>0.35, layers:capThemeStore.layers||null};
    if(sel&&!opt){ opt=document.createElement('option'); opt.value='custom'; sel.appendChild(opt); }
    if(opt) opt.textContent='🎨 Personnalisé';
  } else { delete THEMES.custom; if(opt) opt.remove(); }
}
/** Couleurs d'origine des couches ARCADIA (mémorisées au premier appel). */
function capThemeLayerDefaults(){
  if(!_capLayerDefaults){ _capLayerDefaults={}; Object.keys(CAP_LAYERS).forEach(k=>_capLayerDefaults[k]=CAP_LAYERS[k].color); }
  return _capLayerDefaults;
}
/** Applique les couleurs de couches du thème personnalisé (ou celles d'origine pour un autre thème)
 * et mémorise le thème actif dans la page. Appelé par applyTheme.
 * @param {string} name - Thème appliqué
 */
function capThemeLayersApply(name){
  if(!_capThemeReady) return;   // appel d'initialisation (module 11) : CAP_LAYERS pas encore défini
  const D=capThemeLayerDefaults(), L=name==='custom'&&THEMES.custom&&THEMES.custom.layers||{};
  Object.keys(CAP_LAYERS).forEach(k=>{ const c=L[k]||D[k], p=capParseColor(c); CAP_LAYERS[k].color=c; if(p) CAP_LAYERS[k].bg=`rgba(${p[0]},${p[1]},${p[2]},.15)`; });
  document.querySelectorAll('#cap-tb-layer-grp [data-layer]').forEach(b=>{ const l=CAP_LAYERS[b.dataset.layer]; if(l) b.style.color=l.color; });
  if(capThemeStore&&capThemeStore.active!==(name==='custom')){ capThemeStore.active=name==='custom'; capThemeSave(); }
}

/** Ouvre l'éditeur du thème personnalisé : toutes les couleurs regroupées (fonds, textes, statuts,
 * Relation Map, couches ARCADIA), aperçu en direct, point de départ au choix, import / export JSON.
 */
function capThemeEditor(){
  if(document.querySelector('.thm-dlg')) return;
  const esc=capEsc, root=document.documentElement, prev=currentTheme, sel=document.getElementById('theme-sel');
  /** Valeurs calculées des variables pour le thème actuellement appliqué. */
  const read=()=>{ const cs=getComputedStyle(root), o={}; CAP_THEME_FIELDS.forEach(([v])=>o[v]=cs.getPropertyValue(v).trim()); return o; };
  let css=THEMES.custom?{...read(),...THEMES.custom.css}:read();
  let layers={...capThemeLayerDefaults(),...(THEMES.custom&&THEMES.custom.layers||{})};
  const hex=v=>{ const p=capParseColor(v); return p?capHex(p):'#000000'; };
  const row=(k,l,v)=>`<label class="thm-row"><span>${esc(l)}</span><input type="color" data-k="${esc(k)}" value="${hex(v)}"><input class="phl-filter-input thm-txt" data-t="${esc(k)}" value="${esc(v)}" title="Toute couleur CSS : #rrggbb, rgb(), rgba()"></label>`;
  const ov=document.createElement('div'); ov.className='dash-modal';
  ov.innerHTML=`<div class="thm-dlg"><div class="thm-hd"><b style="font-size:13px">🎨 Thème personnalisé</b>
      <span class="tb-grp" style="margin-left:auto" title="Remplacer toutes les couleurs par celles d'un thème existant"><span class="tb-grp-l">Partir de</span>
      <select id="thm-base" class="phl-filter-input" style="width:auto"><option value="">—</option>${[...sel.options].filter(o=>o.value!=='custom').map(o=>`<option value="${o.value}">${esc(o.textContent)}</option>`).join('')}</select></span></div>
    <div class="thm-body"></div>
    <div class="thm-ft"><span class="ana-dim" id="thm-ctr"></span>
      <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
      <button class="phl-export-btn" id="thm-exp" style="margin-left:0" title="Exporter ce thème (pour le réutiliser ailleurs)">⬇ JSON</button>
      <button class="phl-export-btn" id="thm-imp" style="margin-left:0" title="Importer un thème exporté">⬆ JSON</button><input type="file" id="thm-file" accept=".json" style="display:none">
      ${THEMES.custom?'<button class="cap-lf-btn" id="thm-del" title="Supprimer le thème personnalisé">🗑 Supprimer</button>':''}
      <button class="cap-lf-btn" id="thm-cancel">Annuler</button>
      <button class="cap-lf-btn" id="thm-ok" style="border-color:var(--c-accent);color:var(--c-accent)">✔ Enregistrer et appliquer</button></span></div></div>`;
  document.body.appendChild(ov);
  const body=ov.querySelector('.thm-body');
  /** Construit la grille des couleurs. */
  const fill=()=>{ let g0='';
    body.innerHTML=CAP_THEME_FIELDS.map(([k,l,g])=>{ const h=g!==g0?`<div class="thm-g">${esc(g)}</div>`:''; g0=g; return h+row(k,l,css[k]); }).join('')
      +`<div class="thm-g">Couches ARCADIA <span style="text-transform:none;font-weight:400">(appliquées à l'enregistrement)</span></div>`
      +CAP_THEME_LAYERS.map(([k,l])=>row('L:'+k,l,layers[k])).join('');
    wire(); };
  /** Aperçu en direct : variables posées sur la racine ; contrastes principaux affichés. */
  const preview=()=>{ Object.entries(css).forEach(([k,v])=>root.style.setProperty(k,v));
    const P=capParseColor, b2=P(css['--c-bg2']), t=P(css['--c-text']), d=P(css['--c-dim']);
    ov.querySelector('#thm-ctr').textContent=b2&&t&&d?`Contraste sur les panneaux : texte ${capContrast(t,b2).toFixed(1)} · secondaire ${capContrast(d,b2).toFixed(1)} (lisible à partir de 4,5)`:''; };
  /** Mémorise une valeur (variable CSS ou couche « L:… »). */
  const set=(k,v)=>{ if(k.startsWith('L:')) layers[k.slice(2)]=v; else { css[k]=v; preview(); } };
  /** Branche les champs : sélecteur de couleur (garde l'opacité éventuelle) et saisie libre. */
  const wire=()=>{
    body.querySelectorAll('input[type=color]').forEach(inp=>inp.oninput=()=>{ const k=inp.dataset.k, t=body.querySelector(`[data-t="${k}"]`), p=capParseColor(t.value), n=capParseColor(inp.value);
      const v=p&&p[3]<1?`rgba(${n[0]},${n[1]},${n[2]},${p[3]})`:inp.value; t.value=v; t.classList.remove('bad'); set(k,v); });
    body.querySelectorAll('[data-t]').forEach(t=>t.onchange=()=>{ const k=t.dataset.t, p=capParseColor(t.value.trim());
      t.classList.toggle('bad',!p); if(!p) return; body.querySelector(`[data-k="${k}"]`).value=capHex(p); set(k,t.value.trim()); }); };
  const close=()=>{ ov.remove(); document.removeEventListener('keydown',key); };
  const cancel=()=>{ close(); applyTheme(prev); };
  const key=e=>{ if(e.key==='Escape') cancel(); };
  document.addEventListener('keydown',key);
  ov.addEventListener('mousedown',e=>{ if(e.target===ov) cancel(); });
  ov.querySelector('#thm-cancel').onclick=cancel;
  ov.querySelector('#thm-base').onchange=e=>{ const b=e.target.value; if(!b) return; applyTheme(b); css=read(); layers={...capThemeLayerDefaults()}; e.target.value=''; fill(); preview(); };
  ov.querySelector('#thm-ok').onclick=()=>{
    capThemeStore={css:{...css}, layers:{...layers}, active:true}; capThemeSave(); capThemeRegister();
    close(); sel.value='custom'; applyTheme('custom');
    if(typeof currentMode!=='undefined'&&currentMode==='capella') capRenderCurrentView(); };
  ov.querySelector('#thm-del')?.addEventListener('click',()=>{ if(!confirm('Supprimer le thème personnalisé ?')) return;
    capThemeStore=null; capThemeSave(); capThemeRegister(); close();
    const to=prev==='custom'?'dark':prev; sel.value=to; applyTheme(to); });
  ov.querySelector('#thm-exp').onclick=()=>capDownloadBlob(new Blob([JSON.stringify({capellaTheme:1,css,layers},null,2)],{type:'application/json'}),'theme-personnalise.json');
  ov.querySelector('#thm-imp').onclick=()=>ov.querySelector('#thm-file').click();
  ov.querySelector('#thm-file').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d||typeof d.css!=='object') throw new Error('format');
      css={...css,...d.css}; layers={...layers,...(d.layers||{})}; fill(); preview(); }catch(err){ alert('Fichier de thème invalide.'); } }; r.readAsText(f); };
  fill(); preview();
}

// Câblage et restauration du thème personnalisé actif à l'ouverture de la page
_capThemeReady=true;
capThemeRegister();
document.getElementById('b-theme-edit')?.addEventListener('click',capThemeEditor);
if(capThemeStore&&capThemeStore.active&&THEMES.custom){ document.getElementById('theme-sel').value='custom'; applyTheme('custom'); }
