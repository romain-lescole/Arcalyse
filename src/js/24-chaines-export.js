/* ═══════════════════════════════════════════════════════════════════
   CHAÎNES — Export des diagrammes (PNG / SVG / presse-papiers / PDF / ZIP)
   Aucune bibliothèque externe : PDF et ZIP sont écrits à la main.
═══════════════════════════════════════════════════════════════════ */
let capChainExportOpts={frame:true, titleBlock:true, legend:true, desc:true, annex:true, scale:2}; // options d'export
const capChainsSelection=new Set(); // ids des chaînes cochées pour l'export groupé
const CAP_CHAIN_TAG={FunctionalChain:'FC', OperationalProcess:'OP', PhysicalPath:'PP'};

/** Estime la largeur d'un texte SVG (police sans-serif) pour dimensionner les cartouches.
 * @param {string} t - Texte
 * @param {number} fs - Taille de police en px
 * @returns {number} Largeur approximative en px
 */
function capTextW(t, fs){ return String(t||'').length*fs*0.56; }

/** Nom de fichier sûr (sans caractères interdits sous Windows).
 * @param {string} s - Nom brut
 * @returns {string} Nom nettoyé
 */
function capSafeFileName(s){ return String(s||'diagramme').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'_').replace(/\s+/g,' ').trim().slice(0,120)||'diagramme'; }

/** Construit le diagramme d'une chaîne encadré, prêt à l'export : cadre, cartouche d'onglet
 * en haut à gauche ([FC] Nom de la chaîne), description, légende et cartouche technique
 * en bas à droite (projet, type, couche, statistiques, date, fichier source).
 * @param {object} chain - Chaîne (issue de capComputeChains)
 * @param {object} [opts] - Options {frame, titleBlock, legend, desc, pageLabel}
 * @returns {{svg:string, w:number, h:number}} SVG autonome et dimensions
 */
function capChainFramedSvg(chain, opts){
  opts=Object.assign({}, capChainExportOpts, opts||{});
  const inner=capChainDiagramSvg(chain);
  const m=inner.match(/^<svg[^>]*width="([\d.]+)" height="([\d.]+)"/);
  const iw=m?+m[1]:400, ih=m?+m[2]:200;
  const M=18, F='Segoe UI,Arial,sans-serif';
  const lv=capChainLayerInfo(chain.layer);
  const tagTxt=`[${CAP_CHAIN_TAG[chain.type]||'CH'}] ${chain.name}`;
  const tagW=Math.max(160, capTextW(tagTxt,13)+34), tagH=26;
  // Description (repliée sur 3 lignes max)
  const descLines=(opts.desc&&chain.desc)?capWrapLines(chain.desc, Math.max(60,Math.floor((iw-20)/6.2)), 3):[];
  const descH=descLines.length?descLines.length*14+8:0;
  // Statistiques pour le cartouche
  const g=chain.graph||{nodes:[],edges:[]}; const lay=capChainLayout(g);
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||'Projet Capella';
  const tbRows=[
    ['Projet', project],
    ['Diagramme', chain.name],
    ['Type', CAP_CHAIN_LABELS[chain.type]||chain.type],
    ['Couche', chain.layer==='?'?'Non classée':`${chain.layer} — ${lv.label}`],
    ['Contenu', `${g.nodes.length} ${chain.type==='PhysicalPath'?'composants':'fonctions'} · ${g.edges.length} échanges · ${lay.entries.length} E / ${lay.exits.length} S`],
    ['Date', new Date().toLocaleDateString('fr-FR')+(capCurrentFileName?' · '+capCurrentFileName:'')],
  ];
  if(opts.pageLabel) tbRows.push(['Planche', opts.pageLabel]);
  const tbKW=70, tbVW=Math.min(340, Math.max(170, ...tbRows.map(r=>capTextW(r[1],10.5)+12))), tbRH=16;
  const tbW=opts.titleBlock?tbKW+tbVW:0, tbH=opts.titleBlock?tbRows.length*tbRH:0;
  const legW=opts.legend?430:0, legH=opts.legend?20:0;
  const footH=Math.max(tbH, legH);
  const contentW=Math.max(iw, tagW+20, legW+tbW+30);
  const W=contentW+M*2;
  const topY=M+tagH+10;
  const diagY=topY+descH;
  const H=diagY+ih+(footH?footH+14:0)+M;
  let out='';
  out+=`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
  if(opts.frame){
    out+=`<rect x="${M/2}" y="${M/2}" width="${W-M}" height="${H-M}" fill="none" stroke="#3a3a3a" stroke-width="1.4"/>`;
    // Onglet façon cadre SysML/Capella : coin inférieur droit coupé
    const x0=M/2, y0=M/2, cut=9;
    out+=`<path d="M${x0},${y0} H${x0+tagW} V${y0+tagH-cut} L${x0+tagW-cut},${y0+tagH} H${x0} Z" fill="#f4f6f8" stroke="#3a3a3a" stroke-width="1.2"/>`;
    out+=`<rect x="${x0}" y="${y0}" width="6" height="${tagH}" fill="${lv.color}"/>`;
    out+=`<text x="${x0+14}" y="${y0+17.5}" font-size="13" font-weight="700" fill="#111">${capEsc(tagTxt)}</text>`;
  } else {
    out+=`<text x="${M}" y="${M+17}" font-size="14" font-weight="700" fill="#111">${capEsc(tagTxt)}</text>`;
  }
  descLines.forEach((l,i)=>{ out+=`<text x="${M+4}" y="${topY+11+i*14}" font-size="11" font-style="italic" fill="#555">${capEsc(l)}</text>`; });
  // Diagramme imbriqué (SVG enfant positionné)
  const ix=M+(contentW-iw)/2;
  out+=inner.replace(/^<svg /,`<svg x="${ix}" y="${diagY}" `).replace(/style="display:block;margin:0 auto;/,'style="');
  if(opts.legend){
    const K=CAP_CHAIN_KIND; let lx=M+4;
    const ly2=H-M-legH+4; // légende alignée en bas à gauche
    [['actor','Acteur'],['system','Système'],['none','Non alloué']].forEach(([k,lab])=>{
      out+=`<rect x="${lx}" y="${ly2}" width="18" height="11" fill="${K[k].fill}" stroke="${K[k].stroke}"/><text x="${lx+23}" y="${ly2+9.5}" font-size="10.5" fill="#333">${lab}</text>`;
      lx+=28+capTextW(lab,10.5)+14;
    });
    out+=`<text x="${lx}" y="${ly2+9.5}" font-size="10.5" fill="#555">Bordure épaisse = entrée / sortie</text>`;
  }
  if(opts.titleBlock){
    const tx=W-M-tbW, ty=H-M-tbH;
    out+=`<rect x="${tx}" y="${ty}" width="${tbW}" height="${tbH}" fill="#fafbfc" stroke="#3a3a3a" stroke-width="1"/>`;
    out+=`<line x1="${tx+tbKW}" y1="${ty}" x2="${tx+tbKW}" y2="${ty+tbH}" stroke="#3a3a3a" stroke-width=".8"/>`;
    tbRows.forEach((r,i)=>{
      const y=ty+i*tbRH;
      if(i) out+=`<line x1="${tx}" y1="${y}" x2="${tx+tbW}" y2="${y}" stroke="#9aa0a6" stroke-width=".6"/>`;
      let v=String(r[1]); const maxC=Math.floor((tbVW-10)/(10.5*0.56)); if(v.length>maxC) v=v.slice(0,maxC-1)+'…';
      out+=`<text x="${tx+5}" y="${y+11.5}" font-size="9.5" font-weight="700" fill="#555">${capEsc(r[0])}</text>`;
      out+=`<text x="${tx+tbKW+5}" y="${y+11.5}" font-size="10.5" fill="#111"${i===1?' font-weight="700"':''}>${capEsc(v)}</text>`;
    });
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">${out}</svg>`;
  return {svg, w:W, h:H};
}

/** Rastérise un SVG autonome dans un canvas (fond blanc), avec une échelle bornée
 * pour rester sous les limites de taille des navigateurs.
 * @param {string} svg - Code SVG
 * @param {number} w - Largeur logique
 * @param {number} h - Hauteur logique
 * @param {number} scale - Facteur d'échelle souhaité
 * @returns {Promise<HTMLCanvasElement>} Canvas rendu
 */
function capSvgToCanvas(svg, w, h, scale){
  const s=Math.max(0.5, Math.min(scale||2, 8000/Math.max(w,h), Math.sqrt(40e6/(w*h))));
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas'); c.width=Math.round(w*s); c.height=Math.round(h*s);
      const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
      ctx.drawImage(img,0,0,c.width,c.height); resolve(c);
    };
    img.onerror=()=>reject(new Error('Rendu SVG impossible'));
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}

/** Déclenche le téléchargement d'un Blob.
 * @param {Blob} blob - Contenu
 * @param {string} name - Nom du fichier
 */
function capDownloadBlob(blob, name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/** Convertit un canvas en Blob (PNG ou JPEG).
 * @param {HTMLCanvasElement} c - Canvas
 * @param {string} type - Type MIME
 * @param {number} [q] - Qualité JPEG
 * @returns {Promise<Blob>} Image encodée
 */
function capCanvasBlob(c, type, q){ return new Promise(r=>c.toBlob(r, type, q)); }

/** Exporte une chaîne seule : 'png', 'svg' ou 'clip' (copie PNG dans le presse-papiers).
 * @param {object} chain - Chaîne à exporter
 * @param {string} fmt - Format
 */
async function capChainExportOne(chain, fmt){
  const base=capSafeFileName(chain.name);
  if(fmt==='csv'){ capDownloadBlob(new Blob([capChainCsvText(chain)],{type:'text/csv'}), base+'.csv'); return; }
  const f=capChainFramedSvg(chain);
  if(fmt==='svg'){ capDownloadBlob(new Blob([f.svg],{type:'image/svg+xml'}), base+'.svg'); return; }
  const c=await capSvgToCanvas(f.svg, f.w, f.h, capChainExportOpts.scale);
  const blob=await capCanvasBlob(c,'image/png');
  if(fmt==='clip'){
    try{ await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); capChainExportStatus('📋 Image copiée dans le presse-papiers'); }
    catch(e){ capChainExportStatus('⚠ Copie refusée par le navigateur — utilisez PNG'); }
    return;
  }
  capDownloadBlob(blob, base+'.png');
}

/** Affiche un message d'état dans la barre d'export des chaînes.
 * @param {string} msg - Message
 */
function capChainExportStatus(msg){
  const el=document.getElementById('cap-chx-status'); if(el) el.textContent=msg||'';
}

/** Chaînes visées par un export groupé : la sélection si elle existe, sinon toutes les chaînes filtrées
 * (dans l'ordre d'affichage : par catégorie ARCADIA).
 * @returns {object[]} Chaînes à exporter
 */
function capChainExportTargets(){
  const f=capChainsFiltered();
  const ordered=CAP_CHAIN_LAYER_ORDER.flatMap(lk=>f.filter(c=>c.layer===lk));
  const sel=ordered.filter(c=>capChainsSelection.has(c.id));
  return sel.length?sel:ordered;
}

/** Encode une chaîne JavaScript en chaîne PDF UTF-16BE hexadécimale (<FEFF…>), pour les titres et signets.
 * @param {string} s - Texte
 * @returns {string} Littéral PDF hexadécimal
 */
function capPdfHexStr(s){
  let h='FEFF'; for(const ch of String(s)){ const cp=ch.codePointAt(0);
    if(cp>0xffff){ const v=cp-0x10000; h+=(0xd800+(v>>10)).toString(16).padStart(4,'0')+(0xdc00+(v&0x3ff)).toString(16).padStart(4,'0'); }
    else h+=cp.toString(16).padStart(4,'0'); }
  return '<'+h.toUpperCase()+'>';
}

/** Écrit un PDF minimal (une image JPEG par page, signets de navigation), sans bibliothèque.
 * @param {object[]} pages - [{jpeg:Uint8Array, iw, ih (px), pw, ph (pt), title}]
 * @param {string} docTitle - Titre du document (métadonnées)
 * @returns {Blob} Fichier PDF
 */
function capPdfBuild(pages, docTitle){
  const enc=new TextEncoder(); const parts=[]; const offs=[]; let pos=0;
  const push=x=>{ const b=typeof x==='string'?enc.encode(x):x; parts.push(b); pos+=b.length; };
  const n=pages.length;
  // Numérotation : 1 Catalog, 2 Pages, 3 Outlines, 4 Info, puis par page : Page, Contents, Image, Signet
  const pObj=i=>5+i*4, cObj=i=>6+i*4, imObj=i=>7+i*4, oObj=i=>8+i*4;
  const total=4+n*4;
  const obj=(id,body)=>{ offs[id]=pos; push(`${id} 0 obj\n`); if(typeof body==='function') body(); else push(body); push('\nendobj\n'); };
  push('%PDF-1.4\n'); push(new Uint8Array([0x25,0xE2,0xE3,0xCF,0xD3,0x0A]));
  obj(1,`<< /Type /Catalog /Pages 2 0 R /Outlines 3 0 R /PageMode /UseOutlines >>`);
  obj(2,`<< /Type /Pages /Count ${n} /Kids [${pages.map((_,i)=>pObj(i)+' 0 R').join(' ')}] >>`);
  obj(3,`<< /Type /Outlines /Count ${n}${n?` /First ${oObj(0)} 0 R /Last ${oObj(n-1)} 0 R`:''} >>`);
  obj(4,`<< /Title ${capPdfHexStr(docTitle)} /Producer (relation-map-capella) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g,'').slice(0,14)}) >>`);
  pages.forEach((p,i)=>{
    const mg=24, aw=p.pw-2*mg, ah=p.ph-2*mg;
    const k=Math.min(aw/p.iw, ah/p.ih);
    const dw=p.iw*k, dh=p.ih*k, dx=(p.pw-dw)/2, dy=(p.ph-dh)/2;
    obj(pObj(i),`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw} ${p.ph}] /Resources << /XObject << /Im0 ${imObj(i)} 0 R >> >> /Contents ${cObj(i)} 0 R >>`);
    const cs=`q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /Im0 Do Q`;
    obj(cObj(i),`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    obj(imObj(i),()=>{ push(`<< /Type /XObject /Subtype /Image /Width ${p.iw} /Height ${p.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); push(p.jpeg); push('\nendstream'); });
    obj(oObj(i),`<< /Title ${capPdfHexStr(p.title)} /Parent 3 0 R${i>0?` /Prev ${oObj(i-1)} 0 R`:''}${i<n-1?` /Next ${oObj(i+1)} 0 R`:''} /Dest [${pObj(i)} 0 R /Fit] >>`);
  });
  const xref=pos;
  let x=`xref\n0 ${total+1}\n0000000000 65535 f \n`;
  for(let id=1; id<=total; id++) x+=String(offs[id]).padStart(10,'0')+' 00000 n \n';
  push(x+`trailer\n<< /Size ${total+1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}

/** Table CRC-32 (ZIP), construite à la demande. */
let _capCrcTable=null;
/** Calcule le CRC-32 d'un tableau d'octets.
 * @param {Uint8Array} b - Données
 * @returns {number} CRC-32 non signé
 */
function capCrc32(b){
  if(!_capCrcTable){ _capCrcTable=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; _capCrcTable[n]=c>>>0; } }
  let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=_capCrcTable[(c^b[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}

/** Écrit une archive ZIP non compressée (méthode « stored », noms UTF-8), sans bibliothèque.
 * @param {object[]} files - [{name, data:Uint8Array}]
 * @returns {Blob} Archive ZIP
 */
function capZipBuild(files){
  const enc=new TextEncoder(); const parts=[], central=[]; let off=0;
  const d=new Date(), dosT=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), dosD=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  const used=new Set();
  files.forEach(f=>{
    let name=f.name, k=2; while(used.has(name)){ name=f.name.replace(/(\.\w+)$/,` (${k++})$1`); } used.add(name);
    const nm=enc.encode(name), crc=capCrc32(f.data), sz=f.data.length;
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true);
    h.setUint16(10,dosT,true); h.setUint16(12,dosD,true); h.setUint32(14,crc,true); h.setUint32(18,sz,true); h.setUint32(22,sz,true);
    h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true);
    c.setUint16(12,dosT,true); c.setUint16(14,dosD,true); c.setUint32(16,crc,true); c.setUint32(20,sz,true); c.setUint32(24,sz,true);
    c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer), nm);
    off+=30+nm.length+sz;
  });
  const cdSize=central.reduce((s,b)=>s+b.length,0);
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true);
  e.setUint32(12,cdSize,true); e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'});
}

/** Tables d'une chaîne : fonctions (ou composants) impliquées et échanges impliqués,
 * dans l'ordre du flux (couches du graphe), avec rôle entrée/sortie et allocations.
 * @param {object} chain - Chaîne issue de capComputeChains
 * @returns {{funcs:object[], fes:object[], entries:object[], exits:object[], isPath:boolean}} Données tabulaires
 */
function capChainTables(chain){
  const g=chain.graph||{nodes:[],edges:[]}; const lay=capChainLayout(g);
  const byId={}; g.nodes.forEach(n=>byId[n.id]=n);
  const ent=new Set(lay.entries), ext=new Set(lay.exits);
  const order=lay.layers.flat().filter(id=>byId[id]);
  g.nodes.forEach(n=>{ if(!order.includes(n.id)) order.push(n.id); });
  const edges=g.edges.filter(e=>byId[e.srcId]&&byId[e.tgtId]);
  const funcs=order.map((id,i)=>{ const n=byId[id];
    return {num:i+1, id, refId:n.refId, name:n.name, type:(CAP_HUMAN_NAMES[n.elemType]||{}).h||n.elemType, owner:n.owner||'', kind:n.kind,
      role:ent.has(id)&&ext.has(id)?'Entrée / Sortie':ent.has(id)?'Entrée':ext.has(id)?'Sortie':'—',
      nIn:edges.filter(e=>e.tgtId===id).length, nOut:edges.filter(e=>e.srcId===id).length}; });
  const numOf={}; funcs.forEach(f=>numOf[f.id]=f.num);
  const fes=edges.slice().sort((a,b)=>numOf[a.srcId]-numOf[b.srcId]||numOf[a.tgtId]-numOf[b.tgtId]).map((e,i)=>({
    num:i+1, refId:e.refId, name:e.name||'—', src:byId[e.srcId].name, srcNum:numOf[e.srcId], tgt:byId[e.tgtId].name, tgtNum:numOf[e.tgtId],
    items:(e.items||[]).join(', '), alloc:(e.alloc||[]).join(', ')}));
  return {funcs, fes, entries:lay.entries.map(id=>byId[id]), exits:lay.exits.map(id=>byId[id]), isPath:chain.type==='PhysicalPath'};
}

/** Texte CSV (séparateur « ; ») des deux tables d'une chaîne, pour Excel.
 * @param {object} chain - Chaîne
 * @returns {string} Contenu CSV avec BOM
 */
function capChainCsvText(chain){
  const t=capChainTables(chain), esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const line=a=>a.map(esc).join(';');
  const out=[line([chain.name, CAP_CHAIN_LABELS[chain.type]||chain.type, chain.layer]), '',
    line([t.isPath?'N° composant':'N° fonction', t.isPath?'Composant':'Fonction','Type','Alloué à','Rôle','Entrants','Sortants']),
    ...t.funcs.map(f=>line([f.num,f.name,f.type,f.owner,f.role,f.nIn,f.nOut])), '',
    line(['N° échange', t.isPath?'Physical Link':'Functional Exchange','De (N°)','Source','Vers (N°)','Cible', t.isPath?'Component Exchanges alloués':'Exchange Items', t.isPath?'':'Component Exchange porteur']),
    ...t.fes.map(e=>line([e.num,e.name,e.srcNum,e.src,e.tgtNum,e.tgt,t.isPath?e.alloc:e.items,t.isPath?'':e.alloc]))];
  return '\uFEFF'+out.join('\n');
}

/** Met en page (et dessine si demandé) les pages d'annexe d'une chaîne sur des canvas A4 paysage (~150 dpi) :
 * entrées / sorties, table des fonctions, table des échanges, avec pagination et en-têtes répétés.
 * @param {object} chain - Chaîne
 * @param {boolean} draw - false : ne calcule que le nombre de pages ; true : renvoie les canvas
 * @param {string[]} [labels] - Libellés de pied de page (« p / total ») par page d'annexe
 * @returns {number|HTMLCanvasElement[]} Nombre de pages ou canvas dessinés
 */
function capChainAnnexPages(chain, draw, labels){
  const W=1754, H=1240, X0=70, X1=W-70, TOP=150, BOT=H-80, RH=30, FS=17;
  const t=capChainTables(chain);
  const kind=n=>n?(CAP_CHAIN_KIND[n.kind]||CAP_CHAIN_KIND.none):CAP_CHAIN_KIND.none;
  const blocks=[
    {heading:'Entrées / Sorties', cols:[{l:'Rôle',w:.12},{l:t.isPath?'Composant':'Fonction',w:.5},{l:'Alloué à',w:.38}],
      rows:[...t.entries.map(n=>['Entrée',n.name,n.owner||'—',kind(n)]),...t.exits.map(n=>['Sortie',n.name,n.owner||'—',kind(n)])]},
    {heading:t.isPath?'Composants impliqués':'Fonctions impliquées', cols:[{l:'N°',w:.05},{l:t.isPath?'Composant':'Fonction',w:.33},{l:'Type',w:.18},{l:'Alloué à',w:.22},{l:'Rôle',w:.1},{l:'Entr.',w:.06},{l:'Sort.',w:.06}],
      rows:t.funcs.map(f=>[f.num,f.name,f.type,f.owner||'—',f.role,f.nIn,f.nOut,CAP_CHAIN_KIND[f.kind]||CAP_CHAIN_KIND.none])},
    {heading:t.isPath?'Physical Links impliqués':'Functional Exchanges impliqués', cols:t.isPath
      ?[{l:'N°',w:.05},{l:'Physical Link',w:.25},{l:'Source',w:.22},{l:'Cible',w:.22},{l:'Component Exchanges alloués',w:.26}]
      :[{l:'N°',w:.05},{l:'Functional Exchange',w:.22},{l:'Source',w:.17},{l:'Cible',w:.17},{l:'Exchange Items',w:.2},{l:'CE porteur',w:.19}],
      rows:t.fes.map(e=>t.isPath?[e.num,e.name,`${e.srcNum}. ${e.src}`,`${e.tgtNum}. ${e.tgt}`,e.alloc||'—']
                                :[e.num,e.name,`${e.srcNum}. ${e.src}`,`${e.tgtNum}. ${e.tgt}`,e.items||'—',e.alloc||'—'])},
  ];
  // Mise en page : liste d'opérations par page
  const pages=[[]]; let y=TOP;
  const newPage=()=>{ pages.push([]); y=TOP; };
  blocks.forEach(b=>{
    if(y+44+RH*2>BOT) newPage();
    pages[pages.length-1].push({op:'h', y, text:b.heading}); y+=44;
    pages[pages.length-1].push({op:'th', y, cols:b.cols}); y+=RH+2;
    if(!b.rows.length){ pages[pages.length-1].push({op:'empty', y}); y+=RH; }
    b.rows.forEach((r,i)=>{
      if(y+RH>BOT){ newPage(); pages[pages.length-1].push({op:'h', y, text:b.heading+' (suite)'}); y+=44; pages[pages.length-1].push({op:'th', y, cols:b.cols}); y+=RH+2; }
      pages[pages.length-1].push({op:'tr', y, cols:b.cols, row:r, odd:i%2}); y+=RH;
    });
    y+=30;
  });
  if(!draw) return pages.length;
  const F='Segoe UI, Arial, sans-serif';
  const tag=`[${CAP_CHAIN_TAG[chain.type]||'CH'}] ${chain.name}`;
  return pages.map((ops,pi)=>{
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,H);
    x.strokeStyle='#3a3a3a'; x.lineWidth=2; x.strokeRect(30,30,W-60,H-60);
    x.fillStyle=capChainLayerInfo(chain.layer).color; x.fillRect(30,30,10,80);
    x.fillStyle='#111'; x.font=`700 30px ${F}`; x.fillText('Annexe — '+tag, X0, 85);
    x.font=`17px ${F}`; x.fillStyle='#666'; x.fillText(`${CAP_CHAIN_LABELS[chain.type]||chain.type} · ${chain.layer==='?'?'Non classée':chain.layer} · ${t.funcs.length} ${t.isPath?'composants':'fonctions'} · ${t.fes.length} échanges`, X0, 115);
    /** Texte tronqué à une largeur maximale (ellipse). */
    const fit=(s,w)=>{ s=String(s??''); if(x.measureText(s).width<=w) return s; while(s.length>1&&x.measureText(s+'…').width>w) s=s.slice(0,-1); return s+'…'; };
    ops.forEach(o=>{
      if(o.op==='h'){ x.fillStyle='#111'; x.font=`700 21px ${F}`; x.fillText(o.text, X0, o.y+26); x.fillStyle='#1a6e2e'; x.fillRect(X0,o.y+34,60,3); }
      else if(o.op==='th'||o.op==='tr'){
        const ws=o.cols.map(cc=>cc.w*(X1-X0));
        if(o.op==='th'){ x.fillStyle='#e8ecf0'; x.fillRect(X0,o.y,X1-X0,RH); x.font=`700 15px ${F}`; x.fillStyle='#444'; }
        else { if(o.odd){ x.fillStyle='#f6f8fa'; x.fillRect(X0,o.y,X1-X0,RH); } x.font=`${FS}px ${F}`; }
        let cx=X0;
        o.cols.forEach((cc,ci)=>{
          if(o.op==='th') x.fillText(fit(cc.l, ws[ci]-12), cx+6, o.y+20);
          else {
            const k=o.row[o.cols.length]; // style de nœud éventuel (pastille couleur sur la colonne nom)
            const isName=ci===1&&k&&k.fill;
            if(isName){ x.fillStyle=k.fill; x.strokeStyle=k.stroke; x.lineWidth=1.5; x.fillRect(cx+6,o.y+8,14,14); x.strokeRect(cx+6,o.y+8,14,14); }
            x.fillStyle='#111'; x.fillText(fit(o.row[ci], ws[ci]-(isName?32:12)), cx+(isName?26:6), o.y+21);
          }
          cx+=ws[ci];
        });
        x.strokeStyle='#d0d4d9'; x.lineWidth=1; x.beginPath(); x.moveTo(X0,o.y+RH); x.lineTo(X1,o.y+RH); x.stroke();
      } else if(o.op==='empty'){ x.fillStyle='#888'; x.font=`italic ${FS}px ${F}`; x.fillText('—', X0+6, o.y+21); }
    });
    x.fillStyle='#888'; x.font=`14px ${F}`;
    x.fillText(`${(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||''}${capCurrentFileName?' · '+capCurrentFileName:''}`, X0, H-45);
    const lab=(labels&&labels[pi])||`${pi+1} / ${pages.length}`; x.textAlign='right'; x.fillText('Planche '+lab, X1, H-45); x.textAlign='left';
    return c;
  });
}

/** Dessine la page de garde / sommaire du PDF dans un canvas (texte natif, accents compris).
 * @param {object[]} chains - Chaînes exportées (dans l'ordre des planches)
 * @param {number[]} [starts] - Numéro de la première page de chaque chaîne
 * @returns {HTMLCanvasElement} Canvas A4 paysage (≈ 150 dpi)
 */
function capChainPdfCover(chains, starts){
  const W=1754, H=1240, c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,H);
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||'Projet Capella';
  x.strokeStyle='#3a3a3a'; x.lineWidth=3; x.strokeRect(30,30,W-60,H-60);
  x.fillStyle='#111'; x.font='700 44px Segoe UI, Arial, sans-serif'; x.fillText('Diagrammes de chaînes', 80, 130);
  x.font='28px Segoe UI, Arial, sans-serif'; x.fillStyle='#444';
  x.fillText(`${project}${capCurrentFileName?' — '+capCurrentFileName:''}`, 80, 180);
  x.fillText(`${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})} · ${chains.length} planche${chains.length>1?'s':''}`, 80, 222);
  x.font='700 24px Segoe UI, Arial, sans-serif'; x.fillStyle='#111'; x.fillText('Sommaire', 80, 300);
  const perCol=Math.floor((H-400)/34), cols=Math.min(3, Math.ceil(chains.length/perCol)||1), colW=(W-160)/cols;
  x.font='20px Segoe UI, Arial, sans-serif';
  chains.slice(0, perCol*3).forEach((ch,i)=>{
    const col=Math.floor(i/perCol), row=i%perCol, cx=80+col*colW, cy=345+row*34;
    const lv=capChainLayerInfo(ch.layer);
    x.fillStyle=lv.color; x.fillRect(cx, cy-16, 8, 20);
    x.fillStyle='#666'; x.fillText(String(starts&&starts[i]?starts[i]:i+2).padStart(2,' '), cx+16, cy);
    x.fillStyle='#111'; let t=`[${CAP_CHAIN_TAG[ch.type]||'CH'}] ${ch.name}`;
    while(x.measureText(t).width>colW-80 && t.length>4) t=t.slice(0,-2)+'…';
    x.fillText(t, cx+52, cy);
  });
  if(chains.length>perCol*3){ x.fillStyle='#666'; x.fillText(`… et ${chains.length-perCol*3} autres (voir les signets du PDF)`, 80, H-70); }
  return c;
}

/** Export groupé des chaînes (sélection ou toutes les chaînes filtrées).
 * 'pdf' : une planche par chaîne (A4 orientée automatiquement), page de sommaire et signets ;
 * 'zip-png' / 'zip-svg' : archive des images individuelles.
 * @param {string} fmt - 'pdf' | 'zip-png' | 'zip-svg'
 */
async function capChainExportBatch(fmt){
  const list=capChainExportTargets(); if(!list.length){ capChainExportStatus('Aucune chaîne à exporter.'); return; }
  if(fmt==='html'){ capChainExportHtml(list); return; }
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||'Capella';
  const annex=capChainExportOpts.annex;
  const enc=new TextEncoder(); const files=[], pages=[];
  /** Encode un canvas en JPEG (octets) pour le PDF. */
  const jpg=async c=>new Uint8Array(await (await capCanvasBlob(c,'image/jpeg',0.92)).arrayBuffer());
  try{
    // Pagination : 1 sommaire + pour chaque chaîne 1 diagramme (+ n pages d'annexe)
    const starts=[], annexN=[]; let total=1;
    if(fmt==='pdf') list.forEach((ch,i)=>{ starts[i]=total+1; annexN[i]=annex?capChainAnnexPages(ch,false):0; total+=1+annexN[i]; });
    if(fmt==='pdf'){
      const cov=capChainPdfCover(list, starts);
      pages.push({jpeg:await jpg(cov), iw:cov.width, ih:cov.height, pw:842, ph:595, title:'Sommaire'});
    }
    for(let i=0;i<list.length;i++){
      const ch=list[i];
      capChainExportStatus(`⏳ ${i+1}/${list.length} — ${ch.name}`);
      await new Promise(r=>setTimeout(r,0)); // laisse l'interface respirer
      const f=capChainFramedSvg(ch, fmt==='pdf'?{pageLabel:`${starts[i]} / ${total}`}:{});
      const base=`${String(i+1).padStart(2,'0')} - ${capSafeFileName(ch.name)}`;
      if(fmt!=='pdf'&&annex) files.push({name:base+'.csv', data:enc.encode(capChainCsvText(ch))});
      if(fmt==='zip-svg'){ files.push({name:base+'.svg', data:enc.encode(f.svg)}); continue; }
      const c=await capSvgToCanvas(f.svg, f.w, f.h, capChainExportOpts.scale);
      if(fmt==='zip-png'){ files.push({name:base+'.png', data:new Uint8Array(await (await capCanvasBlob(c,'image/png')).arrayBuffer())}); continue; }
      const land=f.w>=f.h, title=`[${CAP_CHAIN_TAG[ch.type]||'CH'}] ${ch.name}`;
      pages.push({jpeg:await jpg(c), iw:c.width, ih:c.height, pw:land?842:595, ph:land?595:842, title});
      if(annexN[i]){
        const labels=[...Array(annexN[i])].map((_,k)=>`${starts[i]+1+k} / ${total}`);
        const cvs=capChainAnnexPages(ch,true,labels);
        for(let k=0;k<cvs.length;k++) pages.push({jpeg:await jpg(cvs[k]), iw:cvs[k].width, ih:cvs[k].height, pw:842, ph:595, title:`${title} — annexe${cvs.length>1?' '+(k+1):''}`});
      }
    }
    const stamp=new Date().toISOString().slice(0,10);
    if(fmt==='pdf') capDownloadBlob(capPdfBuild(pages, `Chaînes — ${project}`), `${capSafeFileName(project)} - chaines - ${stamp}.pdf`);
    else capDownloadBlob(capZipBuild(files), `${capSafeFileName(project)} - chaines ${fmt==='zip-svg'?'SVG':'PNG'} - ${stamp}.zip`);
    capChainExportStatus(`✔ ${list.length} chaîne${list.length>1?'s':''} exportée${list.length>1?'s':''}${fmt==='pdf'?` (${total} pages)`:''}`);
  }catch(e){ console.error(e); capChainExportStatus('⚠ Échec de l\'export : '+e.message); }
}

/** Rapport HTML autonome des chaînes (sans la vue Relation Map) : onglet Sommaire (tableau avec liens)
 * et onglet Diagrammes (cartes par catégorie : entrées/sorties, diagramme SVG vectoriel, tables des fonctions et des échanges).
 * @param {object[]} list - Chaînes à exporter
 */
function capChainExportHtml(list){
  capChainExportStatus(`⏳ Rapport HTML (${list.length} chaînes)…`);
  const rows=list.map((c,i)=>{ const t=capChainTables(c);
    return `<tr><td class="num">${i+1}</td><td>${capChainLayerBadge(c.layer)}</td><td>${capEsc(CAP_CHAIN_LABELS[c.type]||c.type)}</td>
      <td><a href="#ch-${i}" onclick="document.querySelector('.rtab[data-t=diag]')&&document.querySelector('.rtab[data-t=diag]').click()" style="color:var(--c-accent)">${capEsc(c.name)}</a></td>
      <td class="num">${t.funcs.length}</td><td class="num">${t.fes.length}</td><td class="num">${t.entries.length}</td><td class="num">${t.exits.length}</td></tr>`; }).join('');
  const summary=`<table class="cap-chain-xtable cap-chain-ft"><tr><th>N°</th><th>Couche</th><th>Type</th><th>Chaîne</th><th>${list.some(c=>c.type==='PhysicalPath')?'Fonctions / composants':'Fonctions'}</th><th>Échanges</th><th>Entrées</th><th>Sorties</th></tr>${rows}</table>`;
  const legend=`<div class="cap-chain-legend">
      <span><i style="background:${CAP_CHAIN_KIND.actor.fill};border-color:${CAP_CHAIN_KIND.actor.stroke}"></i>Porté par un acteur</span>
      <span><i style="background:${CAP_CHAIN_KIND.system.fill};border-color:${CAP_CHAIN_KIND.system.stroke}"></i>Porté par le système</span>
      <span><i style="background:${CAP_CHAIN_KIND.none.fill};border-color:${CAP_CHAIN_KIND.none.stroke}"></i>Non alloué</span>
      <span>Bordure épaisse = entrée / sortie</span></div>`;
  const cards=CAP_CHAIN_LAYER_ORDER.map(lk=>{
    const grp=list.map((c,i)=>({c,i})).filter(x=>x.c.layer===lk); if(!grp.length) return '';
    const lv=capChainLayerInfo(lk);
    return `<div class="cap-chain-lhdr" style="border-color:${lv.color}">${capChainLayerBadge(lk)}<span>${capEsc(lv.label)}</span><span class="cap-chain-lcnt">${grp.length}</span></div>`+
      grp.map(({c,i})=>{ const color=CAP_CHAIN_COLORS[c.type]||'#a78bfa';
        return `<div class="cap-chain-card" id="ch-${i}">
          <div class="cap-chain-hdr" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.cap-chain-tog').classList.toggle('open')">
            ${capChainLayerBadge(c.layer)}<span class="cap-type-badge" style="color:${color};background:${color}22">${capEsc(CAP_CHAIN_LABELS[c.type]||c.type)}</span>
            <span class="cap-chain-title">${i+1}. ${capEsc(c.name)}</span><span class="cap-chain-tog open">▶</span></div>
          <div class="cap-chain-body open">${c.desc?`<p style="font-style:italic;color:var(--c-dim);margin:0 0 8px">${capEsc(c.desc)}</p>`:''}${capChainCardBody(c)}</div></div>`; }).join('');
  }).join('');
  const project=(cap_xmlDoc&&cap_xmlDoc.documentElement&&cap_xmlDoc.documentElement.getAttribute('name'))||'Capella';
  capHtmlReport({title:'⚡ Chaînes', subtitle:`${list.length} chaîne${list.length>1?'s':''}`, active:'sum',
    tabs:[{key:'sum',label:'📋 Sommaire',html:summary},{key:'diag',label:'▦ Diagrammes',html:legend+cards}],
    filename:`${capSafeFileName(project)} - chaines.html`});
  capChainExportStatus(`✔ Rapport HTML : ${list.length} chaîne${list.length>1?'s':''}`);
}

/** Barre d'export de la sous-vue Diagrammes : sélection, options de mise en page, exports groupés.
 * @returns {string} HTML de la barre
 */
function capChainExportBar(){
  const f=capChainsFiltered(); const nSel=f.filter(c=>capChainsSelection.has(c.id)).length;
  const o=capChainExportOpts;
  const chk=(k,lab,tip)=>`<label class="cap-chx-opt" title="${tip}"><input type="checkbox" data-chx-opt="${k}"${o[k]?' checked':''}> ${lab}</label>`;
  return `<div class="cap-lf-bar cap-chx-bar" style="flex-wrap:wrap;align-items:center;margin-top:-4px">
    <label class="cap-chx-opt" title="Tout cocher / décocher (chaînes affichées)"><input type="checkbox" id="cap-chx-all"${nSel&&nSel===f.length?' checked':''}> Tout</label>
    <span id="cap-chx-count" style="font-size:11px;color:var(--c-dim)">${nSel?`${nSel} sélectionnée${nSel>1?'s':''}`:`aucune sélection → export des ${f.length} affichées`}</span>
    <span class="tsep"></span>
    ${chk('frame','Cadre','Cadre et onglet [FC] Nom en haut à gauche')}
    ${chk('titleBlock','Cartouche','Cartouche technique en bas à droite (projet, type, couche, date…)')}
    ${chk('legend','Légende','Légende des couleurs en bas à gauche')}
    ${chk('desc','Description','Description Capella de la chaîne sous l\'onglet')}
    ${chk('annex','Annexes','PDF : planche(s) d\'annexe après chaque diagramme (entrées/sorties, fonctions, échanges) · ZIP : CSV par chaîne')}
    <select id="cap-chx-scale" class="phl-filter-input" style="width:auto" title="Résolution des images PNG / PDF">
      ${[1,2,3].map(v=>`<option value="${v}"${o.scale===v?' selected':''}>×${v}</option>`).join('')}
    </select>
    <span style="margin-left:auto;display:flex;gap:4px;align-items:center">
      <span id="cap-chx-status" style="font-size:11px;color:var(--c-dim)"></span>
      <button class="cap-lf-btn" data-chx-batch="pdf" title="Un PDF : sommaire + une planche par chaîne, avec signets">📄 PDF</button>
      <button class="cap-lf-btn" data-chx-batch="zip-png" title="Archive ZIP des images PNG">🗜 ZIP PNG</button>
      <button class="cap-lf-btn" data-chx-batch="zip-svg" title="Archive ZIP des images SVG (vectoriel)">🗜 ZIP SVG</button>
      <button class="cap-lf-btn" data-chx-batch="html" title="Rapport HTML autonome : sommaire + diagrammes et tables de chaque chaîne (vectoriel, recherche intégrée)">🌐 HTML</button>
    </span>
  </div>`;
}

/** Branche les contrôles de la barre d'export et les cases à cocher des cartes.
 * @param {HTMLElement} container - Conteneur de la vue Chaînes
 */
function capWireChainExport(container){
  container.querySelectorAll('[data-chx-opt]').forEach(cb=>cb.addEventListener('change',()=>{ capChainExportOpts[cb.dataset.chxOpt]=cb.checked; }));
  container.querySelector('#cap-chx-scale')?.addEventListener('change',e=>{ capChainExportOpts.scale=+e.target.value; });
  container.querySelectorAll('[data-chx-batch]').forEach(b=>b.addEventListener('click',()=>capChainExportBatch(b.dataset.chxBatch)));
  container.querySelector('#cap-chx-all')?.addEventListener('change',e=>{
    capChainsFiltered().forEach(c=>{ if(e.target.checked) capChainsSelection.add(c.id); else capChainsSelection.delete(c.id); });
    container.querySelectorAll('.cap-chx-sel').forEach(cb=>cb.checked=capChainsSelection.has(cb.dataset.id));
    capChainExportRefreshCount(container);
  });
  container.querySelectorAll('.cap-chx-sel').forEach(cb=>{
    cb.addEventListener('click',ev=>ev.stopPropagation());
    cb.addEventListener('change',()=>{ if(cb.checked) capChainsSelection.add(cb.dataset.id); else capChainsSelection.delete(cb.dataset.id); capChainExportRefreshCount(container); });
  });
}

/** Met à jour le compteur de sélection et la case « Tout » sans re-rendre les cartes (garde les cartes ouvertes).
 * @param {HTMLElement} container - Conteneur de la vue Chaînes
 */
function capChainExportRefreshCount(container){
  const f=capChainsFiltered(); const nSel=f.filter(c=>capChainsSelection.has(c.id)).length;
  const cnt=container.querySelector('#cap-chx-count');
  if(cnt) cnt.textContent=nSel?`${nSel} sélectionnée${nSel>1?'s':''}`:`aucune sélection → export des ${f.length} affichées`;
  const all=container.querySelector('#cap-chx-all');
  if(all){ all.checked=nSel>0&&nSel===f.length; all.indeterminate=nSel>0&&nSel<f.length; }
}

/** Rend la sous-vue « Relation Map » : liste des chaînes groupée par catégorie ARCADIA à gauche,
 * graphe interactif à droite avec les mêmes réglages que la Relation Map principale :
 * disposition (LR, TB, RL, radiale, zigzag), mode compact et coupure des noms (✂ Noms). */
function capRenderChainMap(){
  const wrap=document.getElementById('cap-chainmap-wrap'); if(!wrap) return;
  const list=capChainsFiltered();
  if(!list.length){ wrap.innerHTML='<div style="color:var(--c-dim);padding:40px;text-align:center;width:100%">Aucune chaîne.</div>'; return; }
  if(!list.find(c=>c.id===capChainsSelectedId)){
    const br=list.find(c=>{const l=capChainLayout(c.graph); return l.entries.length>1||l.exits.length>1;});
    capChainsSelectedId=(br||list[0]).id;
  }
  const o=capChainMapOpts;
  const LAYOUTS=[['LR','→ LR','Gauche → droite'],['TB','↓ TB','Haut → bas'],['RL','← RL','Droite → gauche'],['radial','◉ Rad','Radiale : couches en anneaux'],['zigzag','⚡ Zig','Zigzag : couches en lignes serpentines']];
  wrap.innerHTML=`<div class="ccm-side">
      <input class="inp ccm-search" placeholder="🔍 Rechercher une chaîne…" value="${capEsc(capChainsSearch)}">
      <div class="ccm-list"></div>
    </div>
    <div class="ccm-main">
      <div class="ccm-tools">
        <span class="ccm-title"></span>
        <span class="ccm-tgroup" title="Disposition">${LAYOUTS.map(([k,l,t])=>`<button class="cap-lf-btn${o.layout===k?' active':''}" data-lay="${k}" title="${t}">${l}</button>`).join('')}</span>
        <span class="ccm-tgroup">
          <button class="cap-lf-btn${o.compact?' active':''}" data-act="compact" title="Nœuds réduits en pilules (nom seul)">⬡ Compact</button>
          <button class="cap-lf-btn${o.cut?' active':''}" data-act="cut" title="Tronque les noms à ${(S&&S.cutLen)||16} caractères (nom complet au survol)">✂ Noms</button>
        </span>
        <span class="ccm-tgroup">
          <button class="cap-lf-btn" data-act="fit">⊡ Ajuster</button>
          <button class="cap-lf-btn" data-act="rm" title="Injecte la chaîne dans la Relation Map principale">↗ Relation Map principale</button>
        </span>
      </div>
      <svg class="ccm-svg"></svg>
    </div>`;

  // ── Liste groupée par catégorie ARCADIA ──
  const listEl=wrap.querySelector('.ccm-list');
  const renderList=()=>{
    const q=capChainsSearch.trim().toLowerCase();
    const shown=list.filter(c=>!q||c.name.toLowerCase().includes(q));
    listEl.innerHTML=CAP_CHAIN_LAYER_ORDER.map(lk=>{
      const grp=shown.filter(c=>c.layer===lk); if(!grp.length) return '';
      const lv=capChainLayerInfo(lk);
      return `<div class="ccm-lhdr" style="color:${lv.color}">${capChainLayerBadge(lk)}<span>${capEsc(lv.label)}</span><span class="ccm-lcnt">${grp.length}</span></div>`+
        grp.map(c=>{const color=CAP_CHAIN_COLORS[c.type]||'#a78bfa'; const l=capChainLayout(c.graph);
          return `<div class="ccm-item${c.id===capChainsSelectedId?' active':''}" data-id="${capEsc(c.id)}" title="${capEsc(CAP_CHAIN_LABELS[c.type])} — ${capEsc(c.name)}">
            <span class="ccm-dot" style="background:${color}"></span><span class="ccm-name">${capEsc(c.name)}</span>
            <span class="ccm-io">${l.entries.length}→${l.exits.length}</span></div>`;}).join('');
    }).join('') || '<div style="color:var(--c-dim);padding:10px;font-size:11px">Aucun résultat.</div>';
    listEl.querySelectorAll('.ccm-item').forEach(it=>it.addEventListener('click',()=>{capChainsSelectedId=it.dataset.id; renderList(); drawGraph();}));
  };
  wrap.querySelector('.ccm-search').addEventListener('input',e=>{capChainsSearch=e.target.value; renderList();});

  const svg=d3.select(wrap.querySelector('.ccm-svg'));
  let zoom=null, root=null;
  const fit=()=>{
    if(!root) return;
    const box=root.node().getBBox(), el=wrap.querySelector('.ccm-svg');
    const w=el.clientWidth||800, h=el.clientHeight||500;
    const s=Math.min(1.4, 0.92*Math.min(w/Math.max(box.width,1), h/Math.max(box.height,1)));
    svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity.translate(w/2-s*(box.x+box.width/2), h/2-s*(box.y+box.height/2)).scale(s));
  };

  function drawGraph(){
    const chain=list.find(c=>c.id===capChainsSelectedId); if(!chain) return;
    wrap.querySelector('.ccm-title').innerHTML=`${capChainLayerBadge(chain.layer)} <span class="cap-type-badge" style="color:${CAP_CHAIN_COLORS[chain.type]};background:${CAP_CHAIN_COLORS[chain.type]}22">${capEsc(CAP_CHAIN_LABELS[chain.type])}</span> ${capEsc(chain.name)}`;
    svg.selectAll('*').remove();
    const uid='cm'+(++_capChainSvgSeq);
    svg.append('defs').append('marker').attr('id',uid+'-a').attr('viewBox','0 0 10 10').attr('refX',9).attr('refY',5)
      .attr('markerWidth',7).attr('markerHeight',7).attr('orient','auto-start-reverse')
      .append('path').attr('d','M0,0 L10,5 L0,10 z').style('fill','var(--c-accent)');
    root=svg.append('g');
    zoom=d3.zoom().scaleExtent([0.1,3]).on('zoom',ev=>root.attr('transform',ev.transform));
    svg.call(zoom).on('dblclick.zoom',null);

    const g=chain.graph, lay=capChainLayout(g);
    if(!g.nodes.length){
      root.append('text').attr('text-anchor','middle').text('Chaîne vide : aucune fonction impliquée dans le modèle')
        .style('font-size','14px').style('fill','var(--c-dim)');
      fit(); return;
    }
    const byId={}; g.nodes.forEach(n=>byId[n.id]=n);
    const cutLen=(S&&S.cutLen)||16;
    const label=n=>o.cut&&n.name.length>cutLen ? n.name.slice(0,cutLen)+'…' : n.name;

    // ── Dimensions des nœuds (identiques pour tout le graphe) ──
    let W, H;
    if(o.compact){
      const longest=Math.max(...g.nodes.map(n=>label(n).length));
      W=Math.max(100, Math.min(o.cut?220:340, longest*6.6+26)); H=26;
    } else { W=200; H=58; }
    const DH=8;
    // Écart entre couches : assez large pour l'étiquette d'échange la plus longue
    // quand les couches s'enchaînent horizontalement (LR, RL, zigzag)
    const longestEdge=Math.max(0,...g.edges.map(e=>(e.name||'').length));
    const baseGap=o.compact?70:120;
    const GAP_L=(o.layout==='TB'||o.layout==='radial') ? baseGap
      : Math.max(baseGap, Math.min(280, longestEdge*(o.compact?5.6:6.1)+34));
    const GAP_I=o.compact?16:30;
    const isD=id=>id[0]==='~';

    // ── Positions selon la disposition ──
    const P={};
    const nL=lay.layers.length;
    const stackH=l=>l.reduce((s,id)=>s+(isD(id)?DH:H),0)+Math.max(0,l.length-1)*GAP_I;
    const stackW=l=>l.reduce((s,id)=>s+(isD(id)?DH:W),0)+Math.max(0,l.length-1)*GAP_I;
    const placeV=(l,x,y0)=>{ let y=y0; l.forEach(id=>{ const h=isD(id)?DH:H; P[id]={x,y:y+h/2}; y+=h+GAP_I; }); };
    const placeH=(l,y,x0)=>{ let x=x0; l.forEach(id=>{ const w=isD(id)?DH:W; P[id]={x:x+w/2,y}; x+=w+GAP_I; }); };
    if(o.layout==='LR'||o.layout==='RL'){
      const sign=o.layout==='LR'?1:-1;
      lay.layers.forEach((l,L)=>placeV(l, sign*L*(W+GAP_L), -stackH(l)/2));
    } else if(o.layout==='TB'){
      lay.layers.forEach((l,L)=>placeH(l, L*(H+GAP_L+(o.compact?10:20)), -stackW(l)/2));
    } else if(o.layout==='radial'){
      // Couches en anneaux concentriques. Chaque nœud hérite de l'angle moyen de ses
      // prédécesseurs : les branches s'ouvrent en éventail à partir de leur origine.
      const predOf={}; lay.routes.forEach(r=>{ if(r.back) return;
        for(let i=1;i<r.pts.length;i++) (predOf[r.pts[i]]=predOf[r.pts[i]]||[]).push(r.pts[i-1]); });
      const ang={}; let r=0;
      const ringGap=Math.max(W,H)*0.7+GAP_L;
      lay.layers.forEach((l,L)=>{
        const sepLen=(l.some(id=>!isD(id))?W:DH)+GAP_I; // largeur complète : pas de chevauchement
        const need=l.length*sepLen/(2*Math.PI);
        r = (L===0 && l.length===1) ? 0 : Math.max(L===0?need:r+ringGap, need);
        // Angle souhaité : moyenne circulaire des prédécesseurs déjà placés hors centre
        const wish=l.map((id,i)=>{
          const ps=(predOf[id]||[]).filter(p=>ang[p]!==undefined && ang[p]!==null);
          if(!ps.length) return {id, a:null, i};
          const sx=ps.reduce((s,p)=>s+Math.cos(ang[p]),0), sy=ps.reduce((s,p)=>s+Math.sin(ang[p]),0);
          return {id, a:Math.atan2(sy,sx), i};
        });
        const minSep=r>0 ? sepLen/r : 0;
        if(r===0){ l.forEach(id=>{ ang[id]=null; P[id]={x:0,y:0}; }); return; }
        if(wish.every(w=>w.a===null) || minSep*l.length>=2*Math.PI){
          l.forEach((id,i)=>{ ang[id]=2*Math.PI*(i+0.5)/l.length-Math.PI/2; });
        } else {
          // Sans prédécesseur placé : répartis dans l'espace laissé libre
          let free=-Math.PI/2; wish.forEach(w=>{ if(w.a===null){ w.a=free; free+=minSep; } });
          wish.sort((a,b)=>a.a-b.a);
          for(let k=1;k<wish.length;k++) if(wish[k].a<wish[k-1].a+minSep) wish[k].a=wish[k-1].a+minSep;
          wish.forEach(w=>{ ang[w.id]=w.a; });
        }
        l.forEach(id=>{ P[id]={x:r*Math.cos(ang[id]), y:r*Math.sin(ang[id])}; });
      });
    } else { // zigzag : couches par lignes, sens alterné d'une ligne à l'autre
      const perRow=Math.max(2, Math.round(Math.sqrt(nL*2.3)));
      let y=0;
      for(let r0=0; r0*perRow<nL; r0++){
        const rowLayers=lay.layers.slice(r0*perRow,(r0+1)*perRow);
        const bandH=Math.max(...rowLayers.map(stackH));
        rowLayers.forEach((l,c)=>{
          const col=r0%2===0?c:perRow-1-c;
          placeV(l, col*(W+GAP_L), y+(bandH-stackH(l))/2);
        });
        y+=bandH+GAP_L+30;
      }
    }

    // ── Tracé des arêtes ──
    const axis = o.layout==='LR'?'R' : o.layout==='RL'?'L' : o.layout==='TB'?'B' : null; // côté de sortie
    const outs={}, ins={};
    lay.routes.forEach((r,ri)=>{ if(r.back) return; (outs[r.pts[0]]=outs[r.pts[0]]||[]).push(ri); const t=r.pts[r.pts.length-1]; (ins[t]=ins[t]||[]).push(ri); });
    // Port réparti sur un côté (dispositions linéaires)
    const port=(id,lst,ri,nbKey,side)=>{
      const vertSide=side==='L'||side==='R';
      const s=[...lst].sort((a,b)=>vertSide? P[nbKey(a)].y-P[nbKey(b)].y : P[nbKey(a)].x-P[nbKey(b)].x);
      const f=(s.indexOf(ri)+1)/(s.length+1);
      const p=P[id];
      if(side==='R') return [p.x+W/2, p.y-H/2+H*f];
      if(side==='L') return [p.x-W/2, p.y-H/2+H*f];
      if(side==='B') return [p.x-W/2+W*f, p.y+H/2];
      return [p.x-W/2+W*f, p.y-H/2];
    };
    const opp={R:'L',L:'R',B:'T'};
    // Point de bord d'une boîte dans la direction d'un point (dispositions radiale/zigzag)
    const anchor=(id,tx,ty)=>{
      const p=P[id]; if(isD(id)) return [p.x,p.y];
      const dx=tx-p.x, dy=ty-p.y; if(!dx&&!dy) return [p.x,p.y];
      const s=Math.min((W/2)/Math.abs(dx||1e-9),(H/2)/Math.abs(dy||1e-9));
      return [p.x+dx*s, p.y+dy*s];
    };
    const curve=d3.line().curve(d3.curveCatmullRom.alpha(0.5));
    const gl=root.append('g'), glab=root.append('g'), gn=root.append('g');
    const entrySet=new Set(lay.entries), exitSet=new Set(lay.exits);

    lay.routes.forEach((r,ri)=>{
      const e=r.edge; let d;
      const a=P[e.srcId], b=P[e.tgtId];
      if(r.back){
        // Retour de cycle : arc déporté hors du flux principal
        if(axis==='R'||axis==='L'){ const dy=Math.max(a.y,b.y)+H/2+60, sx=axis==='R'?1:-1;
          d=`M${a.x+sx*W/2},${a.y} C${a.x+sx*(W/2+80)},${dy} ${b.x-sx*(W/2+80)},${dy} ${b.x-sx*W/2},${b.y}`; }
        else if(axis==='B'){ const dx=Math.max(a.x,b.x)+W/2+70;
          d=`M${a.x+W/2},${a.y} C${dx},${a.y} ${dx},${b.y} ${b.x+W/2},${b.y}`; }
        else { const [x0,y0]=anchor(e.srcId,b.x,b.y), [x1,y1]=anchor(e.tgtId,a.x,a.y);
          const mx=(x0+x1)/2-(y1-y0)*0.35, my=(y0+y1)/2+(x1-x0)*0.35; d=`M${x0},${y0} Q${mx},${my} ${x1},${y1}`; }
      } else if(axis){
        const pts=r.pts.map((id,i)=>{
          if(isD(id)) return [P[id].x, P[id].y];
          if(i===0) return port(id,outs[id],ri,x=>lay.routes[x].pts[1],axis);
          return port(id,ins[id],ri,x=>lay.routes[x].pts[lay.routes[x].pts.length-2],opp[axis]);
        });
        d=`M${pts[0][0]},${pts[0][1]}`;
        for(let i=1;i<pts.length;i++){
          const [x0,y0]=pts[i-1],[x1,y1]=pts[i];
          if(axis==='B'){ const my=(y0+y1)/2; d+=` C${x0},${my} ${x1},${my} ${x1},${y1}`; }
          else { const mx=(x0+x1)/2; d+=` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
        }
      } else {
        const mids=r.pts.slice(1,-1).map(id=>[P[id].x,P[id].y]);
        const first=mids[0]||[b.x,b.y], last=mids[mids.length-1]||[a.x,a.y];
        d=curve([anchor(e.srcId,first[0],first[1]), ...mids, anchor(e.tgtId,last[0],last[1])]);
      }
      const path=gl.append('path').attr('d',d).attr('fill','none').style('stroke','var(--c-accent)')
        .attr('stroke-width',1.6).attr('stroke-dasharray',r.back?'6,4':null).attr('marker-end',`url(#${uid}-a)`).attr('opacity',.85);
      path.append('title').text(`${byId[e.srcId].name} → ${e.name||''} → ${byId[e.tgtId].name}${r.back?' (retour)':''}`);
      if(e.name){
        // Branches issues d'une même fonction : étiquettes décalées le long de l'arête
        const sib=r.back?[]:(outs[e.srcId]||[]), si=sib.indexOf(ri);
        const t=sib.length>1 ? 0.5+(si%2?0.16:-0.16) : 0.5;
        const len=path.node().getTotalLength(), pt=path.node().getPointAtLength(len*t);
        glab.append('text').attr('x',pt.x).attr('y',pt.y-4).attr('text-anchor','middle').text(e.name+(r.back?' ↺':''))
          .style('font-size',o.compact?'10px':'11px').style('fill','var(--c-text)').style('paint-order','stroke')
          .style('stroke','var(--c-bg)').style('stroke-width','4px').style('stroke-linejoin','round');
      }
    });

    // ── Nœuds ──
    g.nodes.forEach(n=>{
      const k=CAP_CHAIN_KIND[n.kind]||CAP_CHAIN_KIND.none, p=P[n.id];
      const io=entrySet.has(n.id)||exitSet.has(n.id);
      const node=gn.append('g').attr('transform',`translate(${p.x-W/2},${p.y-H/2})`).style('cursor',n.refId?'pointer':'default')
        .on('click',()=>{ if(n.refId) capOpenDetail(n.refId); });
      node.append('title').text(`${n.name} — ${n.elemType}${n.owner?' · alloué à '+n.owner:''}${entrySet.has(n.id)?' · ENTRÉE':''}${exitSet.has(n.id)?' · SORTIE':''}`);
      if(o.compact){
        // Pilule colorée, nom seul (comme le mode Compact de la Relation Map)
        node.append('rect').attr('width',W).attr('height',H).attr('rx',H/2).style('fill',k.rm)
          .style('stroke',io?'var(--c-text)':k.rm).attr('stroke-width',io?2.2:1);
        node.append('text').attr('x',W/2).attr('y',H/2+4).attr('text-anchor','middle').text(label(n))
          .style('font-size','11px').style('font-weight','600').style('fill','#10131a');
        return;
      }
      node.append('rect').attr('width',W).attr('height',H).attr('rx',7).style('fill','var(--c-node-bg)')
        .style('stroke',k.rm).attr('stroke-width',io?2.6:1.4);
      node.append('path').attr('d',`M0,7 Q0,0 7,0 H${W-7} Q${W},0 ${W},7 V19 H0 Z`).style('fill',k.rm).attr('opacity',.9);
      const tags=[entrySet.has(n.id)?'▶ ENTRÉE':'', exitSet.has(n.id)?'SORTIE ■':''].filter(Boolean).join('  ');
      const ownerTxt=n.owner||k.label;
      node.append('text').attr('x',7).attr('y',13.5).text(o.cut&&ownerTxt.length>cutLen?ownerTxt.slice(0,cutLen)+'…':ownerTxt.slice(0,28))
        .style('font-size','9.5px').style('font-weight','700').style('fill','#10131a');
      if(tags) node.append('text').attr('x',W-6).attr('y',13.5).attr('text-anchor','end').text(tags)
        .style('font-size','8.5px').style('font-weight','700').style('fill','#10131a');
      const lines=o.cut?[label(n)]:capWrapLines(n.name,30,2);
      lines.forEach((l,i,arr)=>node.append('text').attr('x',W/2).attr('y',38+(i-(arr.length-1)/2)*14)
        .attr('text-anchor','middle').text(l).style('font-size','12px').style('fill','var(--c-node-txt)'));
    });
    fit();
  }

  // ── Réglages ──
  wrap.querySelectorAll('[data-lay]').forEach(b=>b.addEventListener('click',()=>{
    o.layout=b.dataset.lay; wrap.querySelectorAll('[data-lay]').forEach(x=>x.classList.toggle('active',x===b)); drawGraph(); }));
  wrap.querySelector('[data-act="compact"]').addEventListener('click',e=>{ o.compact=!o.compact; e.currentTarget.classList.toggle('active',o.compact); drawGraph(); });
  wrap.querySelector('[data-act="cut"]').addEventListener('click',e=>{ o.cut=!o.cut; e.currentTarget.classList.toggle('active',o.cut); drawGraph(); });
  wrap.querySelector('[data-act="fit"]').addEventListener('click',fit);
  wrap.querySelector('[data-act="rm"]').addEventListener('click',()=>{
    const chain=list.find(c=>c.id===capChainsSelectedId); if(chain) capShowChainInMap(chain);
  });
  renderList(); drawGraph();
}