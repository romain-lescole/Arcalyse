/* ═══════════════════════════════════════════════════════════════════════════
   ⬇ Excel natif (.xlsx) sans bibliothèque : classeur = ZIP (capZipBuild, 24) de feuilles XML
   (chaînes en ligne, nombres typés, en-tête en gras figé, filtre automatique, largeurs de colonnes).
   - Format des exports de tableaux : ⚙ Préférences › « Exports des tableaux : CSV / Excel »
     (`_capNav.xport`, bloc `cap-toolbar`) ; `capCsvDownload` (27) produit alors un .xlsx d'une feuille.
   - 📁 Fichier › ⬇ Classeur Excel des analyses : un classeur, une feuille par analyse (`capXlsxClasseur`).
   ═══════════════════════════════════════════════════════════════════════════ */

/** Format courant des exports de tableaux. @returns {'csv'|'xlsx'} */
function capExportFormat(){ return typeof _capNav!=='undefined'&&_capNav&&_capNav.xport==='xlsx'?'xlsx':'csv'; }

/** Bascule CSV ↔ Excel pour les exports de tableaux (⚙ Préférences). */
function capExportToggle(){ _capNav.xport=capExportFormat()==='xlsx'?'csv':'xlsx'; capNavSave(); capToast(capExportFormat()==='xlsx'?_L('✔ Exports des tableaux en Excel (.xlsx)'):_L('✔ Exports des tableaux en CSV')); }

/** Lettre(s) de colonne Excel (0 → A, 25 → Z, 26 → AA). @param {number} i - Indice @returns {string} */
function capXlsxCol(i){ let s=''; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }

/** Nom de feuille valide (31 caractères, sans []:*?/\\, unique). @param {string} n - Nom voulu @param {Set} used - Noms déjà pris @returns {string} */
function capXlsxSheetName(n, used){
  let b=String(n||'Feuille').replace(/[\[\]:*?/\\]/g,' ').replace(/\s+/g,' ').trim().slice(0,31)||'Feuille', s=b, k=2;
  while(used.has(s.toLowerCase())){ const suf=' ('+k+++')'; s=b.slice(0,31-suf.length)+suf; }
  used.add(s.toLowerCase()); return s;
}

/** Construit un classeur .xlsx.
 * @param {Array<{name:string, header:string[], rows:Array[]}>} sheets - Feuilles (cellules : texte, nombre, booléen, ou {v} de capCx)
 * @returns {Blob} Classeur
 */
function capXlsxBuild(sheets){
  const enc=new TextEncoder(), esc=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const used=new Set(), names=sheets.map(s=>capXlsxSheetName(s.name, used));
  const cell=(v,r,c,style)=>{ if(v&&typeof v==='object'&&'v' in v) v=v.v; if(v==null||v==='') return '';
    const ref=capXlsxCol(c)+(r+1), st=style?` s="${style}"`:'';
    if(typeof v==='number'&&isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
    if(typeof v==='boolean') return `<c r="${ref}"${st} t="b"><v>${v?1:0}</v></c>`;
    const s=String(v); if(/^-?\d{1,15}(\.\d+)?$/.test(s)&&!/^0\d/.test(s)&&s.length<16) return `<c r="${ref}"${st}><v>${s}</v></c>`;
    return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(s.length>32000?s.slice(0,32000)+'…':s)}</t></is></c>`; };
  const sheetXml=sh=>{ const H=sh.header||[], R=sh.rows||[], nc=Math.max(H.length, ...R.map(r=>r.length), 1);
    const w=Array.from({length:nc},(_,c)=>Math.min(60, Math.max(8, ...[H[c], ...R.slice(0,500).map(r=>r[c])].map(v=>{ if(v&&typeof v==='object'&&'v' in v) v=v.v; return String(v==null?'':v).split('\n')[0].length+2; }))));
    const rows=[`<row r="1">${H.map((h,c)=>cell(h,0,c,1)).join('')}</row>`, ...R.map((r,i)=>`<row r="${i+2}">${r.map((v,c)=>cell(v,i+1,c,0)).join('')}</row>`)];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${w.map((x,c)=>`<col min="${c+1}" max="${c+1}" width="${x}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A1:${capXlsxCol(nc-1)}${R.length+1}"/></worksheet>`; };
  const files=[
    {name:'[Content_Types].xml', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`},
    {name:'_rels/.rels', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:'xl/workbook.xml', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${esc(names[i])}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/styles.xml', data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7EEF7"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`},
    ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`, data:sheetXml(s)}))];
  return capZipBuild(files.map(f=>({name:f.name, data:enc.encode(f.data)})));
}

/** Télécharge un classeur .xlsx. @param {string} name - Nom de fichier @param {Array} sheets - Feuilles (voir capXlsxBuild) */
function capXlsxDownload(name, sheets){ capDownloadBlob(new Blob([capXlsxBuild(sheets)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), name.replace(/\.csv$/i,'')+(/\.xlsx$/i.test(name)?'':'.xlsx')); }

/** Classeur Excel de toutes les analyses : une feuille par sujet (éléments, fonctions, échanges, composants, liens, chaînes, exigences, statuts, contrôles). */
function capXlsxClasseur(){
  if(!capLoaded){ capAlert(_L('Chargez d\'abord un modèle.')); return; }
  const H=capAnaHuman, name=o=>o&&o.name||'', L=o=>o&&o.layer||'';
  const F=capComputeFunctions(), X=capComputeFunctionalExchanges(), CB=capComputeComponentBlocks(), CE=capComputeCompExchanges(), PL=capComputePhysLinks(), CH=capChainsData||(capChainsData=capComputeChains()), RQ=capComputeRequirements(), ST=capComputeStatus(), SA=capSanteCompute();
  const sheets=[
    {name:_L('Éléments'), header:[_L('Couche'),'Type',_L('Nom'),'ID',_L('Description')], rows:capAllElements.filter(capStEligible).map(e=>[e.layer, H(e.typeName), e.attrs.name, e.id, capHtmlToText(e.attrs.description||'')])},
    {name:_L('Fonctions'), header:[_L('Couche'),'N°',_L('Fonction'),_L('Feuille'),_L('Allocation'),_L('Allocataires'),_L('Réalise'),_L('Réalisée par'),_L('Description')], rows:F.list.map(f=>[f.layer, f.num, f.name, f.leaf?'✔':'', (CAP_FN_AK[capFnAllocKind(f)]||{}).l||'', f.alloc.map(name).join(' ; '), f.realizes.map(name).join(' ; '), f.realizedBy.map(name).join(' ; '), f.desc||''])},
    {name:_L('Functional Exchanges'), header:[_L('Couche'),'N°',_L('Échange'),_L('Source'),_L('Cible'),_L('Exchange Items'),_L('Catégories')], rows:X.list.map(x=>[x.layer, x.num, x.name, x.src.fnName, x.tgt.fnName, x.items.map(name).join(' ; '), capEcOf(x.id).map(name).join(' ; ')])},
    {name:_L('Composants'), header:[_L('Couche'),_L('Composant'),_L('Nature'),_L('Ports'),_L('Fonctions')], rows:CB.comps.map(c=>[c.layer, c.name, c.actor?_L('Acteur'):(c.nature||''), c.ports.length, F.list.filter(f=>f.alloc.some(a=>a.id===c.id)).length])},
    {name:_L('Component Exchanges'), header:[_L('Couche'),_L('Échange'),_L('Source'),_L('Cible'),_L('Sens'),_L('Functional Exchanges'),_L('Physical Links')], rows:CE.map(l=>[l.layer, l.linkName, l.src.pcName, l.tgt.pcName, l.dir, l.fes.map(name).join(' ; '), l.pls.map(name).join(' ; ')])},
    {name:_L('Physical Links'), header:[_L('Couche'),_L('Lien'),_L('Source'),_L('Cible'),_L('Component Exchanges')], rows:PL.map(l=>[l.layer, l.linkName, l.src.pcName, l.tgt.pcName, l.ces.map(name).join(' ; ')])},
    {name:_L('Chaînes'), header:[_L('Couche'),'Type',_L('Chaîne'),_L('Étapes'),_L('Échanges'),_L('Description')], rows:CH.map(c=>[c.layer, CAP_CHAIN_LABELS[c.type]||c.type, c.name, c.graph.nodes.length, c.graph.edges.length, c.desc||''])},
    {name:_L('Exigences'), header:['ID',_L('Exigence'),_L('Famille'),'Type',_L('Texte'),_L('Éléments liés')], rows:RQ.list.map(r=>[r.ident, r.name, r.src, r.kind, r.text, r.links.map(name).join(' ; ')])},
    {name:_L('Statut de revue'), header:[_L('Couche'),_L('Élément'),'Type',_L('Statut'),_L('Classe'),_L('Commentaire Capella')], rows:ST.list.map(e=>[e.layer, e.name, e.type, e.status, e.cls?(CAP_ST_CLS[e.cls]||{}).l||'':'', e.review])},
    {name:_L('Contrôles'), header:[_L('Vue'),_L('Contrôle'),_L('Gravité'),_L('Lignes'),...CAP_ANA_LAYERS], rows:SA.checks.map(c=>[(CAP_NAV_ITEMS.find(i=>i.k===c.view)||{}).l||c.view, c.title, (CAP_CHK_SEV.find(x=>x[0]===c.sev)||[])[2]||c.sev, c.n, ...CAP_ANA_LAYERS.map(l=>c.layers&&c.layers[l]!=null?c.layers[l]:'')])},
    {name:_L('Santé'), header:[_L('Indicateur'),_L('Valeur')], rows:[[_L('Score'),SA.score],[_L('Points à vérifier'),SA.points],[_L('Bloquants'),SA.bloquants],[_L('Éléments nommés'),SA.pop],...CAP_ANA_LAYERS.filter(l=>SA.couches[l]).map(l=>[_L(`Score ${l}`),SA.couches[l].score])]}];
  capXlsxDownload((capCurrentFileName||'modele').replace(/\.[^.]+$/,'')+_L('-analyses.xlsx'), sheets.filter(s=>s.rows.length));
  capToast(_L(`✔ Classeur Excel : ${sheets.filter(s=>s.rows.length).length} feuilles`));
}
