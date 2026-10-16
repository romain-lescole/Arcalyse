#!/usr/bin/env node
/* Génère src/js/57-sysml-bibliotheque.js : index compact de la bibliothèque standard SysML v2 / KerML
 * (paquetage → noms de ses membres de premier niveau, imports publics compris), pour résoudre ISQ::mass, SI::kg,
 * ScalarValues::Real… sans embarquer la bibliothèque entière (≈ 1,7 Mo).
 * Usage : node tools/sysml-biblio.js <dossier sysml.library>   (dépôt SysML-v2-Release, tag 2026-03)
 */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const dir=process.argv[2];
if(!dir||!fs.existsSync(dir)){ console.error('Usage : node tools/sysml-biblio.js <dossier sysml.library>'); process.exit(1); }
const ctx={}; vm.createContext(ctx); vm.runInContext('function _L(s){return s;}', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','js','56-sysml-langage.js'),'utf8').replace(/^const /gm,'var '), ctx);
/** Mots-clés KerML (bibliothèque .kerml) et SysML ignorés avant le nom déclaré. */
const KW=new Set(('class struct feature datatype function predicate behavior assoc classifier type step expr bool connector succession interaction metaclass multiplicity '+
  'specialization subclassifier subtype conjugation disjoining featuring inverse redefinition subset typing var composite portion member namespace inv disjoint unions '+
  'intersects differences chains featured conjugates abstract readonly derived end const').split(' '));
const files=[]; (function w(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) w(p); else if(/\.(sysml|kerml)$/.test(e.name)) files.push(p); } })(dir);
/** Paquetages des bases implicites (§7.6.8) : les membres de leurs définitions sont hérités par tout usage (start, done, self…). */
const BASES=new Set(['Base','Occurrences','Objects','Items','Parts','Ports','Connections','Interfaces','Allocations','Actions','States','Calculations','Constraints',
  'Requirements','Cases','AnalysisCases','VerificationCases','UseCases','Views','Metadata','Flows','Transfers','Performances','Links','Clocks','Triggers','Metaobjects','Observation']);
const pk={}, exp={}, feats=new Set();
for(const f of files){
  const toks=ctx.capSyLex(fs.readFileSync(f,'utf8'), f, []);
  const stack=[]; let stmt=[];
  for(let i=0;i<toks.length;i++){
    const t=toks[i];
    if(t.t==='sym'&&t.v==='{'){
      const top=stack[stack.length-1];
      const j=stmt.findIndex(x=>x.v==='package');
      if(j>=0){ const n=stmt.slice(j+1).find(x=>x.t==='id'); const full=(top&&top.pkg?top.full+'::':'')+(n?n.v:'?');
        if(top&&top.pkg) pk[top.full].add(n?n.v:'?');
        pk[full]=pk[full]||new Set(); exp[full]=exp[full]||[]; stack.push({pkg:true, full, simple:n?n.v:''}); }
      else { const nm=top&&top.pkg?take(stmt, top):null; if(top&&top.def){ const n=declName(stmt); if(n) feats.add(n); } stack.push({pkg:false, def:top&&top.pkg&&BASES.has(top.full.split('::')[0]), name:nm}); }
      stmt=[]; continue; }
    if(t.t==='sym'&&t.v==='}'){ stack.pop(); stmt=[]; continue; }
    if(t.t==='sym'&&t.v===';'){ const top=stack[stack.length-1]; if(top&&top.pkg) take(stmt, top); else if(top&&top.def) { const n=declName(stmt); if(n) feats.add(n); } stmt=[]; continue; }
    if(t.t!=='cmt') stmt.push(t);
  }
}
/** Nom déclaré par une instruction (après les mots-clés KerML / SysML et le nom court). */
function declName(s){
  let k=0; while(k<s.length&&(s[k].t==='kw'||KW.has(s[k].v)||(s[k].t==='sym'&&(s[k].v==='#'||s[k].v===':>>'||s[k].v===':>')))){ if(s[k].v==='#'){ k+=2; continue; } if(s[k].v===':>>'||s[k].v===':>') return ''; k++; }
  if(s[k]&&s[k].v==='<'&&s[k+2]&&s[k+2].v==='>') k+=3;
  return s[k]&&s[k].t==='id'?s[k].v:'';
}
/** Relève le nom (et le nom court) déclaré par une instruction d'un paquetage ; note les imports publics. */
function take(s, top){
  const cur=top.full;
  if(s.some(x=>x.v==='import')){ const q=[]; let on=false; for(const x of s){ if(x.v==='import'){ on=true; continue; } if(on&&(x.t==='id'||x.v==='::'||x.v==='*'||x.v==='**')) q.push(x.v); } if(s.some(x=>x.v==='public')) exp[cur].push(q.join('')); return null; }
  let k=0; while(k<s.length&&(s[k].t==='kw'||KW.has(s[k].v)||(s[k].t==='sym'&&s[k].v==='#'))){ if(s[k].v==='#'){ k+=2; continue; } k++; }
  if(s[k]&&s[k].v==='<'&&s[k+1]&&s[k+2]&&s[k+2].v==='>'){ pk[cur].add(s[k+1].v); k+=3; }
  if(s[k]&&s[k].t==='id'){ pk[cur].add(s[k].v); return s[k].v; }
  return null;
}
// Imports publics « P::* » notés « @P » (résolus à l'exécution, sans recopier les noms) ; imports d'un membre : nom ajouté
const out={}; Object.keys(pk).sort().forEach(p=>{ const s=new Set(pk[p]); const ex=[];
  (exp[p]||[]).forEach(q=>{ const m=/^(.+?)::\*/.exec(q); if(m){ const parent=p.split('::').slice(0,-1).join('::'); const cand=[p+'::'+m[1], parent?parent+'::'+m[1]:'', m[1]].find(c=>c&&pk[c]); ex.push('@'+(cand||m[1])); } else { const n=q.split('::').pop(); if(n) s.add(n); } });
  out[p]=[...s].sort().concat(ex).join(' '); });
const js=`/* ═══════════════════════════════════════════════════════════════════
   SysML v2 — INDEX DE LA BIBLIOTHÈQUE STANDARD (généré par node tools/sysml-biblio.js, ne pas modifier à la main)
   Source : sysml.library du dépôt SysML-v2-Release, tag 2026-03 (licence EPL-2.0 pour les textes d'origine ;
   seuls les noms des paquetages et de leurs membres de premier niveau, imports publics compris, sont repris ici).
═══════════════════════════════════════════════════════════════════ */
/** Paquetages de la bibliothèque standard → noms de leurs membres (séparés par des espaces ; « @P » : membres publics de P
 * ré-exportés par un import public ; Set créé à la première utilisation, capSyLibMembers). */
const CAP_SY_LIB=${JSON.stringify(out).replace(/","/g,'",\n"')};
/** Membres des définitions des bases implicites (Parts::Part, Actions::Action, Occurrences::Occurrence…) : hérités par tout usage. */
const CAP_SY_LIB_FEATURES=new Set(${JSON.stringify([...feats].sort().join(' '))}.split(' '));
`;
fs.writeFileSync(path.join(__dirname,'..','src','js','57-sysml-bibliotheque.js'), js);
console.log(Object.keys(out).length+' paquetages, '+feats.size+' membres hérités, '+(js.length/1024).toFixed(0)+' Ko');
