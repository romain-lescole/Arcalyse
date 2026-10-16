/* ═══════════════════════════════════════════════════════════════════
   SysML v2 — LANGAGE : lexique, analyse syntaxique tolérante, résolution des noms, contrôles
   Cible : SysML 2.0 (formal/2026-03-02) et KerML 1.0. Ce module ne dépend ni du DOM ni de Capella :
   il transforme des textes .sysml en un graphe d'éléments (métaclasses SysML : PartUsage, PartDefinition…),
   que 57-sysml-modele.js convertit pour le socle commun d'Arcalyse (Explorateur, ▤ Tableau, Relation Map…).
═══════════════════════════════════════════════════════════════════ */

/** Mots réservés de SysML 2.0 (§8.2.2.1.2) : jamais utilisables comme nom simple. */
const CAP_SY_KEYWORDS=new Set(('about abstract accept action actor after alias all allocate allocation analysis and as assert assign assume at attribute bind binding by calc case comment '+
  'concern connect connection constant constraint crosses decide def default defined dependency derived do doc else end entry enum event exhibit exit expose '+
  'false filter first flow for fork frame from hastype if implies import in include individual inout interface istype item join language library locale loop merge '+
  'message meta metadata nonunique not null objective occurrence of or ordered out package parallel part perform port private protected public redefines ref '+
  'references render rendering rep require requirement return satisfy send snapshot specializes stakeholder standard state subject subsets succession terminate then '+
  'timeslice to transition true until use variant variation verification verify via view viewpoint when while xor').split(' '));
/** Symboles (KerML §8.2.2.7), du plus long au plus court : règle du plus long symbole possible. */
const CAP_SY_SYMBOLS=['::>',':>>','===','!==','..','::',':>',':=','->','=>','==','!=','<=','>=','**','??','.?',
  '(',')','{','}','[',']',';',',','~','@','#','%','&','^','|','*','+','-','/','$','.',':','<','=','>','?','!'];

/** Mot-clé d'élément → racine de la métaclasse (« Part » → PartDefinition / PartUsage). */
const CAP_SY_KIND_KW={part:'Part', item:'Item', attribute:'Attribute', port:'Port', connection:'Connection', interface:'Interface',
  allocation:'Allocation', flow:'Flow', message:'Flow', action:'Action', state:'State', calc:'Calculation', constraint:'Constraint',
  requirement:'Requirement', concern:'Concern', case:'Case', analysis:'AnalysisCase', verification:'VerificationCase', view:'View',
  viewpoint:'Viewpoint', rendering:'Rendering', metadata:'Metadata', occurrence:'Occurrence', enum:'Enumeration', snapshot:'Occurrence', timeslice:'Occurrence'};
/** Préfixes d'une déclaration (modificateurs) : ils précèdent le mot-clé de l'élément. */
const CAP_SY_PREFIX_KW=new Set(['abstract','variation','variant','readonly','derived','end','ref','in','out','inout','individual','constant','ordered','nonunique','composite','portion','var','parallel']);
/** Mots-clés introduisant une clause dans l'en-tête d'une déclaration (arrêtent une expression de valeur). */
const CAP_SY_CLAUSE_KW=new Set(['connect','from','to','of','by','first','then','accept','if','do','via','about','for','allocate','bind','at','after','when','else','until','crosses','defined','typed','subsets','redefines','references','specializes','chains','inverse','featured','conjugates','disjoint','unions','differences','intersects','locale','language','default']);
/** Éléments « comportementaux » d'un corps (cible ou source implicite d'une succession « then »). */
const CAP_SY_OCC_KINDS=new Set(['ActionUsage','StateUsage','PerformActionUsage','ExhibitStateUsage','AcceptActionUsage','SendActionUsage','AssignmentActionUsage','IfActionUsage',
  'WhileLoopActionUsage','ForLoopActionUsage','TerminateActionUsage','ForkNode','JoinNode','MergeNode','DecisionNode','CalculationUsage','CaseUsage','UseCaseUsage',
  'IncludeUseCaseUsage','EventOccurrenceUsage','OccurrenceUsage','AnalysisCaseUsage','VerificationCaseUsage','StateActionUsage','ConstraintUsage','PartUsage','ItemUsage']);

/**
 * Découpe un texte .sysml en lexèmes. Les notes (// et //* … *\/) sont ignorées ; les commentaires /* … *&#47; deviennent
 * des lexèmes « cmt » (éléments Comment / Documentation du modèle).
 * @param {string} src - Texte source
 * @param {string} file - Nom du fichier (diagnostics)
 * @param {object[]} diags - Diagnostics (complétés)
 * @returns {object[]} Lexèmes {t:'id'|'kw'|'str'|'num'|'sym'|'cmt'|'eof', v, l, c, q?}
 */
function capSyLex(src, file, diags){
  const toks=[], n=src.length; let i=0, line=1, col=1;
  /** Avance de k caractères en tenant à jour ligne et colonne. */
  const adv=k=>{ for(let j=0;j<k&&i<n;j++){ if(src.charCodeAt(i)===10){ line++; col=1; } else col++; i++; } };
  const isA=ch=>(ch>=65&&ch<=90)||(ch>=97&&ch<=122)||ch===95, isD=ch=>ch>=48&&ch<=57;
  const err=(code,msg,l,c)=>diags.push({severity:'error', code, message:msg, line:l, column:c, file});
  while(i<n){
    const ch=src.charCodeAt(i), c=src[i];
    if(ch===32||ch===9||ch===10||ch===13||ch===12||ch===0xA0||ch===0xFEFF){ adv(1); continue; }
    const L=line, C=col;
    if(c==='/'&&src[i+1]==='/'){
      if(src[i+2]==='*'){ const e=src.indexOf('*/',i+3); if(e<0){ err('E-LEX-NOTE',_L('Note multiligne //* non terminée'),L,C); adv(n-i); break; } adv(e+2-i); continue; }
      const e=src.indexOf('\n',i); adv((e<0?n:e)-i); continue;
    }
    if(c==='/'&&src[i+1]==='*'){
      let e=src.indexOf('*/',i+2); if(e<0){ err('E-LEX-COMMENTAIRE',_L('Commentaire /* non terminé'),L,C); e=n; }
      const raw=src.slice(i+2,e); adv(Math.min(n,e+2)-i);
      toks.push({t:'cmt', v:capSyCmtBody(raw), l:L, c:C}); continue;
    }
    if(isA(ch)){
      let j=i+1; while(j<n){ const d=src.charCodeAt(j); if(isA(d)||isD(d)) j++; else break; }
      // Lettre accentuée collée au nom : nom invalide hors apostrophes (piège des noms français)
      if(j<n&&src.charCodeAt(j)>127&&/[\p{L}\p{N}]/u.test(src[j])){
        let k=j; while(k<n&&/[\p{L}\p{N}_]/u.test(src[k])) k++;
        err('E-LEX-NOM-ASCII',_L(`Nom « ${src.slice(i,k)} » : un nom simple n'accepte que les lettres ASCII ; l'écrire entre apostrophes ('${src.slice(i,k)}')`),L,C);
        toks.push({t:'id', v:src.slice(i,k), l:L, c:C}); adv(k-i); continue;
      }
      const w=src.slice(i,j); adv(j-i);
      toks.push({t:CAP_SY_KEYWORDS.has(w)?'kw':'id', v:w, l:L, c:C}); continue;
    }
    if(ch>127&&/[\p{L}]/u.test(c)){
      let k=i; while(k<n&&/[\p{L}\p{N}_]/u.test(src[k])) k++;
      err('E-LEX-NOM-ASCII',_L(`Nom « ${src.slice(i,k)} » : un nom simple n'accepte que les lettres ASCII ; l'écrire entre apostrophes ('${src.slice(i,k)}')`),L,C);
      toks.push({t:'id', v:src.slice(i,k), l:L, c:C}); adv(k-i); continue;
    }
    if(c==="'"||c==='"'){
      let j=i+1, s='', ok=false;
      while(j<n){
        const d=src[j];
        if(d==='\\'&&j+1<n){ const e=src[j+1]; s+=({n:'\n',t:'\t',b:'\b',f:'\f'})[e]||e; j+=2; continue; }
        if(d===c){ ok=true; j++; break; }
        if(d==='\n'&&c==="'") break;
        s+=d; j++;
      }
      if(!ok) err('E-LEX-CHAINE',c==="'"?_L('Nom entre apostrophes non terminé'):_L('Chaîne non terminée'),L,C);
      adv(j-i);
      toks.push(c==="'"?{t:'id', v:s, q:true, l:L, c:C}:{t:'str', v:s, l:L, c:C}); continue;
    }
    if(isD(ch)){
      let j=i; while(j<n&&isD(src.charCodeAt(j))) j++;
      if(src[j]==='.'&&isD(src.charCodeAt(j+1))){ j++; while(j<n&&isD(src.charCodeAt(j))) j++; }
      if((src[j]==='e'||src[j]==='E')&&(isD(src.charCodeAt(j+1))||((src[j+1]==='+'||src[j+1]==='-')&&isD(src.charCodeAt(j+2))))){ j+=2; while(j<n&&isD(src.charCodeAt(j))) j++; }
      toks.push({t:'num', v:src.slice(i,j), l:L, c:C}); adv(j-i); continue;
    }
    const sym=CAP_SY_SYMBOLS.find(s=>src.startsWith(s,i));
    if(sym){ toks.push({t:'sym', v:sym, l:L, c:C}); adv(sym.length); continue; }
    err('E-LEX-CARACTERE',_L(`Caractère inattendu « ${c} »`),L,C); adv(1);
  }
  toks.push({t:'eof', v:'', l:line, c:col});
  return toks;
}

/** Corps d'un commentaire /* … *&#47; débarrassé des astérisques de début de ligne et des marges.
 * @param {string} raw - Texte entre /* et *&#47;
 * @returns {string} Texte du commentaire */
function capSyCmtBody(raw){
  const lines=String(raw).split(/\r?\n/).map((l,k)=>k===0?l:l.replace(/^\s*\*(?!\/)\s?/,''));
  return lines.join('\n').replace(/^\s+|\s+$/g,'');
}

/** Texte lisible d'une suite de lexèmes (expression, valeur, garde) : espaces placés comme dans la notation textuelle.
 * @param {object[]} toks - Lexèmes
 * @returns {string} Texte */
function capSyTokText(toks){
  let s='', prev=null;
  const tight=new Set(['.','::','.?','(','[','~','$','@','#']), noBefore=new Set(['.','::','.?',')',']',',',';','(','[']);
  for(const t of toks){
    let v=t.t==='str'?JSON.stringify(t.v):t.t==='id'&&t.q?capSyQuote(t.v):t.t==='cmt'?'/* '+t.v+' */':t.v;
    if(prev&&!(prev.t==='sym'&&tight.has(prev.v))&&!(t.t==='sym'&&noBefore.has(t.v))) s+=' ';
    // « f(x) », « a[2] » : pas d'espace avant la parenthèse ou le crochet d'un appel ou d'une unité collée
    const pt=prev&&prev.t==='sym'&&tight.has(prev.v);
    if(prev&&!pt&&t.t==='sym'&&t.v==='('&&!(prev.t==='id'||(prev.t==='sym'&&prev.v===')'))) s+=' ';
    if(prev&&!pt&&t.t==='sym'&&t.v==='['&&prev.t!=='id') s+=' ';   // « 1800 [kg] » : unité séparée de la valeur
    s+=v; prev=t;
  }
  return s.replace(/\s+/g,' ').trim();
}

/** Référence écrite par une suite de lexèmes de nom qualifié (noms non restreints gardés sans apostrophes, comme capSyQName).
 * @param {object[]} toks @returns {string} */
function capSyRefOf(toks){ return toks.filter(t=>t.t==='id'||(t.t==='sym'&&(t.v==='::'||t.v==='.'||t.v==='$'))||(t.t==='kw'&&(t.v==='start'||t.v==='done'))).map(t=>t.v).join(''); }

/** Écrit un nom tel qu'il doit apparaître dans un texte SysML : entre apostrophes s'il n'est pas un nom simple ASCII ou s'il est réservé.
 * @param {string} n - Nom
 * @returns {string} Nom écrit */
function capSyQuote(n){
  n=String(n||'');
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n)&&!CAP_SY_KEYWORDS.has(n)?n:"'"+n.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
}

/** Crée un élément du graphe SysML.
 * @param {object} P - État de l'analyse
 * @param {string} kind - Métaclasse (PartUsage, Package…)
 * @param {object} tok - Lexème de début (position)
 * @param {object} owner - Élément propriétaire
 * @returns {object} Élément */
function capSyNew(P, kind, tok, owner){
  const el={kind, name:'', shortName:'', owner:owner||null, members:[], file:P.file, line:tok?tok.l:0, col:tok?tok.c:0, endLine:0,
    keyword:'', isDef:false, vis:'', mods:{}, rels:{}, ends:[], docs:[], meta:[], exprs:[], refs:{}, res:{}};
  P.all.push(el);
  if(owner) owner.members.push(el);
  return el;
}

/** Analyse un texte .sysml : renvoie la racine (espace de noms du fichier) et les diagnostics. Tolérante : en cas de
 * lexème inattendu, l'erreur est notée et l'analyse reprend au prochain « ; » ou « } » équilibré.
 * @param {string} text - Texte source
 * @param {string} file - Chemin du fichier
 * @returns {{root:object, all:object[], diags:object[]}} Résultat
 */
function capSyParse(text, file){
  const diags=[];
  const P={toks:capSyLex(String(text||''), file, diags), p:0, file, diags, all:[]};
  const root=capSyNew(P, 'Namespace', P.toks[0], null);
  root.name=file; root.isFileRoot=true;
  capSyBody(P, root, true);
  return {root, all:P.all, diags};
}

/** Lexème courant (sans avancer). @param {object} P @param {number} [k] - Décalage */
function capSyPeek(P, k){ return P.toks[Math.min(P.p+(k||0), P.toks.length-1)]; }
/** Lexème courant (puis avance). @param {object} P */
function capSyNext(P){ const t=P.toks[P.p]; if(P.p<P.toks.length-1) P.p++; return t; }
/** Vrai si le lexème courant est le mot-clé ou le symbole v. @param {object} P @param {string} v @param {number} [k] */
function capSyIs(P, v, k){ const t=capSyPeek(P,k); return (t.t==='kw'||t.t==='sym')&&t.v===v; }
/** Consomme le mot-clé ou le symbole v s'il est présent. @param {object} P @param {string} v @returns {boolean} */
function capSyEat(P, v){ if(capSyIs(P,v)){ capSyNext(P); return true; } return false; }
/** Note une erreur de syntaxe au lexème courant. @param {object} P @param {string} msg @param {object} [tok] */
function capSyErr(P, msg, tok){ const t=tok||capSyPeek(P); P.diags.push({severity:'error', code:'E-SYNTAXE', message:msg, line:t.l, column:t.c, file:P.file}); }

/** Analyse un corps « { … } » (ou le fichier entier) : une suite de membres jusqu'à « } ».
 * @param {object} P - État
 * @param {object} owner - Propriétaire des membres
 * @param {boolean} [top] - Niveau fichier (fin = fin du texte)
 */
function capSyBody(P, owner, top){
  owner._prev=null;
  while(true){
    const t=capSyPeek(P);
    if(t.t==='eof'){ if(!top) capSyErr(P,_L('« } » manquant en fin de fichier'),t); break; }
    if(t.t==='sym'&&t.v==='}'){
      if(top){ capSyErr(P,_L('« } » en trop'),t); capSyNext(P); continue; }
      owner.endLine=t.l; capSyNext(P); break;
    }
    const p0=P.p;
    try{ capSyMember(P, owner); }
    catch(e){ capSyErr(P,_L('Analyse interrompue : ')+e.message); }
    if(P.p===p0){ capSyErr(P,_L(`Lexème inattendu « ${t.v} »`),t); capSySkip(P); }
  }
  delete owner._prev;
}

/** Saute jusqu'au prochain « ; » (consommé) ou « } » (laissé), en sautant les corps « { … } » équilibrés.
 * @param {object} P - État
 * @returns {object[]} Lexèmes sautés */
function capSySkip(P){
  const out=[]; let depth=0;
  while(true){
    const t=capSyPeek(P);
    if(t.t==='eof') break;
    if(t.t==='sym'){
      if(t.v==='{'||t.v==='('||t.v==='[') depth++;
      else if(t.v==='}'||t.v===')'||t.v===']'){ if(depth===0) break; depth--; if(depth===0&&t.v==='}'){ out.push(capSyNext(P)); if(capSyIs(P,';')) capSyNext(P); break; } }
      else if(t.v===';'&&depth===0){ capSyNext(P); break; }
    }
    out.push(capSyNext(P));
  }
  return out;
}

/** Lit un nom qualifié ou une chaîne de features (« A::B », « a.b.c », « $::X », « ~T ») à partir du lexème courant.
 * @param {object} P - État
 * @returns {string} Référence écrite ('' si aucune) */
function capSyQName(P){
  let s='';
  if(capSyIs(P,'$')&&capSyIs(P,'::',1)){ capSyNext(P); capSyNext(P); s='$::'; }
  const t=capSyPeek(P);
  if(t.t!=='id'&&!(t.t==='kw'&&(t.v==='start'||t.v==='done'))) return s;
  s+=capSyNext(P).v;
  while((capSyIs(P,'::')||capSyIs(P,'.'))&&(capSyPeek(P,1).t==='id'||(capSyIs(P,'::')&&capSyIs(P,'*',1)))){
    if(capSyIs(P,'*',1)) break;
    s+=capSyNext(P).v+capSyNext(P).v;
  }
  return s;
}

/** Analyse un membre d'un corps : déclaration (définition ou usage), relation (import, alias, satisfy, connect, flow,
 * succession, transition…), annotation (doc, commentaire, métadonnée) ou, à défaut, expression (corps de contrainte, de calcul).
 * @param {object} P - État
 * @param {object} owner - Propriétaire
 */
function capSyMember(P, owner){
  const t0=capSyPeek(P);
  if(t0.t==='cmt'){ capSyNext(P); const c=capSyNew(P,'Comment',t0,owner); c.body=t0.v; return; }
  if(t0.t==='sym'&&t0.v===';'){ capSyNext(P); return; }
  let vis='';
  if(t0.t==='kw'&&(t0.v==='public'||t0.v==='private'||t0.v==='protected')){ vis=capSyNext(P).v; }
  const t=capSyPeek(P), v=t.t==='kw'?t.v:'';
  if(v==='import') return capSyImport(P, owner, vis, t);
  if(v==='alias') return capSyAlias(P, owner, vis, t);
  if(v==='doc'){ capSyNext(P); const d=capSyNew(P,'Documentation',t,owner); capSyNameDecl(P,d); if(capSyEat(P,'locale')&&capSyPeek(P).t==='str') d.locale=capSyNext(P).v; if(capSyPeek(P).t==='cmt') d.body=capSyNext(P).v; else capSyErr(P,_L('Texte /* … */ attendu après doc')); owner.docs.push(d.body||''); return; }
  if(v==='comment'){ capSyNext(P); const c=capSyNew(P,'Comment',t,owner); c.vis=vis; capSyNameDecl(P,c);
    if(capSyEat(P,'about')){ c.refs.about=[]; do{ const q=capSyQName(P); if(q) c.refs.about.push(q); else break; } while(capSyEat(P,',')); }
    if(capSyEat(P,'locale')&&capSyPeek(P).t==='str') c.locale=capSyNext(P).v;
    if(capSyPeek(P).t==='cmt') c.body=capSyNext(P).v; else capSySkip(P);
    return; }
  if(v==='rep'||v==='language'){ capSyNext(P); const r=capSyNew(P,'TextualRepresentation',t,owner); if(v==='rep'){ capSyNameDecl(P,r); capSyEat(P,'language'); }
    if(capSyPeek(P).t==='str') r.language=capSyNext(P).v; if(capSyPeek(P).t==='cmt') r.body=capSyNext(P).v; return; }
  if(t.t==='sym'&&t.v==='@'){ capSyNext(P); return capSyMetadataUsage(P, owner, vis, t); }
  if(v==='metadata'&&!capSyIs(P,'def',1)){ capSyNext(P); return capSyMetadataUsage(P, owner, vis, t); }
  if(v==='package'||v==='library'||(v==='standard'&&capSyIs(P,'library',1))){
    let lib=false; if(capSyEat(P,'standard')) lib=true; if(capSyEat(P,'library')) lib=true; capSyEat(P,'package');
    const pk=capSyNew(P, lib?'LibraryPackage':'Package', t, owner); pk.vis=vis; pk.keyword=lib?'library package':'package';
    capSyNameDecl(P,pk);
    if(capSyEat(P,'{')) capSyBody(P,pk); else if(!capSyEat(P,';')){ capSyErr(P,_L('« { » ou « ; » attendu après le paquetage')); capSySkip(P); }
    return;
  }
  if(v==='filter'){ capSyNext(P); const f=capSyNew(P,'ElementFilterMembership',t,owner); f.expr=capSyTokText(capSySkip(P).filter(x=>!(x.t==='sym'&&x.v===';'))); return; }
  if(v==='locale'&&capSyPeek(P,1).t==='str'){ capSyNext(P); const c=capSyNew(P,'Comment',t,owner); c.locale=capSyNext(P).v; if(capSyPeek(P).t==='cmt') c.body=capSyNext(P).v; return; }
  // Préfixes : modificateurs et métadonnées en préfixe (#Securite)
  const mods={}, metaPfx=[];
  while(true){
    const u=capSyPeek(P);
    if(u.t==='kw'&&CAP_SY_PREFIX_KW.has(u.v)&&!(u.v==='end'&&false)){ mods[u.v]=true; capSyNext(P); continue; }
    if(u.t==='sym'&&u.v==='#'){ capSyNext(P); const q=capSyQName(P); if(q) metaPfx.push(q); continue; }
    if(u.t==='sym'&&u.v==='['&&mods.end){ mods._mult=capSyTokText(capSyBalanced(P,'[',']')).replace(/\s/g,''); continue; }
    break;
  }
  const k=capSyPeek(P);
  if(k.t==='kw'&&k.v==='dependency'){ capSyNext(P); const d=capSyDependency(P, owner, vis, k); if(d&&metaPfx.length) d.meta.push(...metaPfx); return; }
  const el=capSyKeyword(P, owner, k, mods, metaPfx);
  if(!el) return;
  el.vis=vis; if(mods._mult&&!el.mult) el.mult=mods._mult; delete mods._mult; Object.assign(el.mods, mods); if(metaPfx.length) el.meta.push(...metaPfx);
  if(mods.in) el.dir='in'; else if(mods.out) el.dir='out'; else if(mods.inout) el.dir='inout';
}

/** Lit la déclaration de nom d'un élément : « <shortName> nom » (chacun facultatif).
 * @param {object} P - État
 * @param {object} el - Élément */
function capSyNameDecl(P, el){
  if(capSyIs(P,'<')&&capSyPeek(P,1).t==='id'&&capSyIs(P,'>',2)){ capSyNext(P); el.shortName=capSyNext(P).v; capSyNext(P); }
  const t=capSyPeek(P);
  if(t.t==='id'&&!capSyIs(P,'::',1)&&!capSyIs(P,'.',1)){ el.name=capSyNext(P).v; el.declaredName=true; }
}

/** Import « [visibilité] import [all] A::B | A::* | A::** | A::*::** [filtre] ; ».
 * @param {object} P @param {object} owner @param {string} vis @param {object} t - Lexème « import » */
function capSyImport(P, owner, vis, t){
  capSyNext(P);
  const im=capSyNew(P,'Import',t,owner); im.vis=vis||'private';
  if(!vis) P.diags.push({severity:'warning', code:'W-IMPORT-VISIBILITE', message:_L('Import sans visibilité : écrire private, public ou protected (private retenu)'), line:t.l, column:t.c, file:P.file});
  if(capSyEat(P,'all')) im.importAll=true;
  im.target=capSyQName(P);
  if(capSyIs(P,'::')&&capSyIs(P,'*',1)){ capSyNext(P); capSyNext(P); im.star=true;
    if(capSyIs(P,'::')&&capSyIs(P,'**',1)){ capSyNext(P); capSyNext(P); im.recursive=true; } }
  else if(capSyIs(P,'::')&&capSyIs(P,'**',1)){ capSyNext(P); capSyNext(P); im.recursive=true; im.withSelf=true; }
  if(capSyIs(P,'[')){ im.filter=capSyTokText(capSyBalanced(P,'[',']')); }
  im.name=im.target+(im.star?'::*':'')+(im.recursive?'::**':'');
  if(capSyEat(P,'{')) capSyBody(P,im); else if(!capSyEat(P,';')){ capSyErr(P,_L('« ; » attendu après l\'import')); capSySkip(P); }
  owner.imports=(owner.imports||[]); owner.imports.push(im);
}

/** Alias « alias Nom for A::B ; ». @param {object} P @param {object} owner @param {string} vis @param {object} t */
function capSyAlias(P, owner, vis, t){
  capSyNext(P);
  const a=capSyNew(P,'Alias',t,owner); a.vis=vis; capSyNameDecl(P,a);
  if(capSyEat(P,'for')) a.refs.target=[capSyQName(P)]; else capSyErr(P,_L('« for » attendu dans l\'alias'));
  if(capSyEat(P,'{')) capSyBody(P,a); else if(!capSyEat(P,';')) capSySkip(P);
}

/** Dépendance « dependency [nom] [from] A, B to C, D ; ». @param {object} P @param {object} owner @param {string} vis @param {object} t */
function capSyDependency(P, owner, vis, t){
  const d=capSyNew(P,'Dependency',t,owner); d.vis=vis; d.keyword='dependency';
  if(capSyIs(P,'<')&&capSyPeek(P,1).t==='id'&&capSyIs(P,'>',2)){ capSyNext(P); d.shortName=capSyNext(P).v; capSyNext(P); }
  if(!capSyIs(P,'from')){ const save=P.p; capSyNameDecl(P,d); if(!capSyIs(P,'from')&&!capSyIs(P,',')&&!capSyIs(P,'to')){ } else if(!capSyIs(P,'from')){ P.p=save; d.name=''; d.shortName=''; } }
  capSyEat(P,'from');
  const list=()=>{ const l=[]; do{ const q=capSyQName(P); if(q) l.push(q); else break; } while(capSyEat(P,',')); return l; };
  d.refs.source=list();
  if(capSyEat(P,'to')) d.refs.target=list(); else capSyErr(P,_L('« to » attendu dans la dépendance'));
  if(capSyEat(P,'{')) capSyBody(P,d); else if(!capSyEat(P,';')) capSySkip(P);
  return d;
}

/** Usage de métadonnée « @Type [about …] { … } » ou « metadata [nom :] Type … ».
 * @param {object} P @param {object} owner @param {string} vis @param {object} t */
function capSyMetadataUsage(P, owner, vis, t){
  const m=capSyNew(P,'MetadataUsage',t,owner); m.vis=vis; m.keyword='metadata';
  const q=capSyQName(P);
  if(capSyIs(P,':')||capSyIs(P,'typed')||capSyIs(P,'defined')){ m.name=q; m.declaredName=true; if(capSyEat(P,':')){} else { capSyNext(P); capSyEat(P,'by'); } m.refs.typedBy=[capSyQName(P)]; }
  else m.refs.typedBy=[q];
  if(capSyEat(P,'about')){ m.refs.about=[]; do{ const r=capSyQName(P); if(r) m.refs.about.push(r); else break; } while(capSyEat(P,',')); }
  owner.meta.push(m.refs.typedBy[0]);
  if(capSyEat(P,'{')) capSyBody(P,m); else if(!capSyEat(P,';')) capSySkip(P);
}

/** Lit une suite équilibrée « ( … ) » ou « [ … ] » (délimiteurs compris).
 * @param {object} P @param {string} o - Ouvrant @param {string} c - Fermant @returns {object[]} Lexèmes */
function capSyBalanced(P, o, c){
  const out=[]; let d=0;
  while(true){
    const t=capSyPeek(P); if(t.t==='eof') break;
    out.push(capSyNext(P));
    if(t.t==='sym'&&t.v===o) d++;
    else if(t.t==='sym'&&t.v===c){ d--; if(d<=0) break; }
  }
  return out;
}

/** Traite le mot-clé (ou l'absence de mot-clé) d'une déclaration et crée l'élément correspondant.
 * @param {object} P - État
 * @param {object} owner - Propriétaire
 * @param {object} k - Lexème courant
 * @param {object} mods - Modificateurs déjà lus
 * @param {string[]} [metaPfx] - Métadonnées en préfixe (#mot-clé utilisateur)
 * @returns {object|null} Élément créé (null : rien de déclaré, ex. expression) */
function capSyKeyword(P, owner, k, mods, metaPfx){
  const v=k.t==='kw'?k.v:'';
  const prevOcc=owner._prev;
  // ── Successions « then » / « first » : relient le membre précédent au suivant ──
  if(v==='then'){
    capSyNext(P);
    if(capSySimpleRef(P)){ const r=capSyQName(P); capSyEat(P,';'); capSySuccession(P,owner,k,prevOcc,{ref:r}); owner._prev={ref:r}; return null; }
    const tk=capSyPeek(P), mods2={};
    while(capSyPeek(P).t==='kw'&&CAP_SY_PREFIX_KW.has(capSyPeek(P).v)) mods2[capSyNext(P).v]=true;
    const el=capSyKeyword(P, owner, capSyPeek(P), mods2);
    if(el){ Object.assign(el.mods,mods2); capSySuccession(P,owner,tk,prevOcc,{el}); owner._prev={el}; }
    return el;
  }
  if(v==='first'){
    capSyNext(P);
    const src=capSyQName(P);
    if(capSyEat(P,'then')){ const s=capSySuccession(P,owner,k,{ref:src},null); s.ends[1]={ref:capSyQName(P)}; owner._prev={ref:s.ends[1].ref}; capSyHeaderTail(P,s); return null; }
    capSyEat(P,';'); owner._prev={ref:src}; return null;
  }
  if(v==='entry'&&(capSyIs(P,';',1))){ capSyNext(P); capSyNext(P); owner._prev={ref:'@entry'}; return null; }
  if((v==='if'||v==='else')&&prevOcc&&prevOcc.el&&prevOcc.el.kind==='DecisionNode'||(v==='if'||v==='else')&&capSyCondSuccession(P)){
    capSyNext(P);
    let guard='';
    if(v==='if'){ const g=[]; let d=0; while(true){ const t=capSyPeek(P); if(t.t==='eof') break; if(d===0&&t.t==='kw'&&t.v==='then') break; if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; if(t.t==='sym'&&(t.v===')'||t.v===']')) d--; if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) break; g.push(capSyNext(P)); } guard=capSyTokText(g); }
    else guard='else';
    if(capSyEat(P,'then')){
      if(capSySimpleRef(P)){ const r=capSyQName(P); capSyEat(P,';'); const s=capSySuccession(P,owner,k,prevOcc,{ref:r}); s.guard=guard; return null; }
      const tk=capSyPeek(P); const el=capSyKeyword(P,owner,tk,{}); if(el){ const s=capSySuccession(P,owner,tk,prevOcc,{el}); s.guard=guard; }
      return el;
    }
    if(v==='else'){ // « else { … } » d'une action if : corps rattaché à l'action précédente
      if(capSyIs(P,'{')){ const target=prevOcc&&prevOcc.el||owner; capSyNext(P); capSyBody(P,target); return null; }
      if(capSyIs(P,'if')){ return capSyKeyword(P,owner,capSyPeek(P),{}); }
    }
    capSySkip(P); return null;
  }
  // ── Transitions abrégées dans un état : « accept S [if g] [do a] then cible ; » après un état ──
  if(v==='accept'&&capSyInState(owner)&&prevOcc&&capSyHasThen(P)){
    capSyNext(P);
    const tr=capSyNew(P,'TransitionUsage',k,owner); tr.keyword='transition';
    tr.ends[0]=prevOcc.el?{el:prevOcc.el}:{ref:prevOcc.ref};
    capSyTransitionTail(P, tr, true);
    return tr;
  }
  if(v==='transition'){
    capSyNext(P);
    const tr=capSyNew(P,'TransitionUsage',k,owner); tr.keyword='transition';
    if(capSyAhead(P,'first')) capSyNameDecl(P,tr);
    if(capSyEat(P,'first')) tr.ends[0]={ref:capSyQName(P)};
    else if(capSyPeek(P).t==='id') tr.ends[0]={ref:capSyQName(P)};
    else if(prevOcc) tr.ends[0]=prevOcc.el?{el:prevOcc.el}:{ref:prevOcc.ref};
    capSyTransitionTail(P, tr, capSyIs(P,'accept'));
    return tr;
  }
  // ── Nœuds de contrôle ──
  const CTRL={fork:'ForkNode', join:'JoinNode', merge:'MergeNode', decide:'DecisionNode'};
  if(CTRL[v]){ capSyNext(P); const n=capSyNew(P,CTRL[v],k,owner); n.keyword=v; capSyNameDecl(P,n); capSyHeaderTail(P,n); owner._prev={el:n}; return n; }
  // ── Usages qui référencent un élément existant (perform, exhibit, include, satisfy, verify…) ──
  const REFKW={perform:['action','PerformActionUsage'], exhibit:['state','ExhibitStateUsage'], include:['use','IncludeUseCaseUsage'],
    satisfy:['requirement','SatisfyRequirementUsage'], verify:['requirement','VerifyRequirementUsage'], frame:['concern','ConcernUsage'],
    render:['rendering','RenderingUsage'], expose:['','Expose'], entry:['action','StateActionUsage'], do:['action','StateActionUsage'], exit:['action','StateActionUsage'],
    assume:['constraint','ConstraintUsage'], require:['constraint','ConstraintUsage'], event:['occurrence','EventOccurrenceUsage']};
  if(v==='assert'||(v==='not'&&capSyIs(P,'satisfy',1))){
    capSyNext(P); const neg=capSyEat(P,'not');
    if(capSyIs(P,'satisfy')){ const el=capSyKeyword(P,owner,capSyPeek(P),mods); if(el){ el.mods.assert=true; if(neg) el.mods.negated=true; } return el; }
    if(capSyIs(P,'not')){ capSyNext(P); }
    const ak=capSyPeek(P);
    if(ak.t==='kw'&&ak.v==='constraint'){ capSyNext(P); const el=capSyNew(P,'AssertConstraintUsage',ak,owner); el.keyword='assert constraint'; if(neg) el.mods.negated=true; capSyHeader(P,el); return el; }
    const el=capSyNew(P,'AssertConstraintUsage',ak,owner); el.keyword='assert'; if(neg) el.mods.negated=true;
    if(capSyPeek(P).t==='id'){ el.refs.subsets=[capSyQName(P)]; el.isRefUsage=true; capSyHeaderTail(P,el); } else capSyHeader(P,el);
    return el;
  }
  if(REFKW[v]){
    capSyNext(P);
    const [kw2, kind]=REFKW[v];
    let declared=false;
    if(v==='include'&&capSyIs(P,'use')){ capSyNext(P); capSyEat(P,'case'); declared=true; }
    else if(kw2&&capSyIs(P,kw2)){ capSyNext(P); declared=true; if(kw2==='occurrence'){} }
    else if(v==='event'&&capSyPeek(P).t==='kw'&&CAP_SY_KIND_KW[capSyPeek(P).v]){ return capSyKeyword(P,owner,capSyPeek(P),Object.assign(mods,{event:true})); }
    const el=capSyNew(P,kind,k,owner); el.keyword=v+(declared&&kw2?' '+(kw2==='use'?'use case':kw2):'');
    if(v==='entry'||v==='do'||v==='exit') el.stateRole=v;
    if(v==='assume'||v==='require') el.reqRole=v;
    if(v==='verify') el.reqRole='verify';
    if(v==='frame') el.reqRole='frame';
    if(v==='expose'){ el.refs.target=[capSyQName(P)]; if(capSyIs(P,'::')&&capSyIs(P,'*',1)){ capSyNext(P); capSyNext(P); el.star=true; if(capSyIs(P,'::')&&capSyIs(P,'**',1)){ capSyNext(P); capSyNext(P); el.recursive=true; } }
      else if(capSyIs(P,'::')&&capSyIs(P,'**',1)){ capSyNext(P); capSyNext(P); el.recursive=true; }
      if(capSyIs(P,'[')) el.filter=capSyTokText(capSyBalanced(P,'[',']'));
      el.name=(el.refs.target[0]||'')+(el.star?'::*':'')+(el.recursive?'::**':''); capSyHeaderTail(P,el);
      owner.imports=owner.imports||[]; owner.imports.push({target:el.refs.target[0], star:el.star||!el.recursive, recursive:el.recursive, vis:'public', importAll:true});
      return el; }
    if(!declared&&(capSyPeek(P).t==='id'||(capSyPeek(P).t==='kw'&&(capSyPeek(P).v==='start'||capSyPeek(P).v==='done'))||(capSyIs(P,'$')))){
      // Référence : « perform a.b ; », « satisfy R by S ; », « exhibit s ; »
      const r=capSyQName(P);
      if(r){ (el.refs[v==='satisfy'||v==='verify'?'requirement':'subsets']=[r]); el.isRefUsage=true; }
      capSyHeader(P, el, true);
    } else capSyHeader(P, el);
    if(v==='entry'||v==='do'||v==='exit'){ if(v!=='do') owner._prev={el}; }
    else if(CAP_SY_OCC_KINDS.has(kind)) owner._prev={el};
    return el;
  }
  // ── Rôles : subject, actor, stakeholder, objective, return ──
  const ROLE={subject:'ReferenceUsage', actor:'PartUsage', stakeholder:'PartUsage', objective:'RequirementUsage', return:'ReferenceUsage'};
  if(ROLE[v]){
    capSyNext(P);
    const kk=capSyPeek(P);
    let el;
    if(kk.t==='kw'&&(CAP_SY_KIND_KW[kk.v]||kk.v==='use'||kk.v==='ref')) el=capSyKeyword(P,owner,kk,mods);
    else { el=capSyNew(P,ROLE[v],k,owner); el.keyword=v; capSyHeader(P,el); }
    if(el){ el.role=v; if(!el.keyword) el.keyword=v; }
    return el;
  }
  // ── Connecteurs abrégés : bind, connect, allocate, succession ──
  if(v==='bind'){ capSyNext(P); const el=capSyNew(P,'BindingConnectorAsUsage',k,owner); el.keyword='bind'; capSyBindTail(P,el); capSyHeaderTail(P,el); return el; }
  if(v==='binding'){ capSyNext(P); const el=capSyNew(P,'BindingConnectorAsUsage',k,owner); el.keyword='binding'; capSyHeader(P,el); return el; }
  if(v==='connect'){ const el=capSyNew(P,'ConnectionUsage',k,owner); el.keyword='connect'; capSyHeader(P,el); return el; }
  if(v==='allocate'){ const el=capSyNew(P,'AllocationUsage',k,owner); el.keyword='allocate'; capSyHeader(P,el); return el; }
  if(v==='succession'){
    capSyNext(P);
    if(capSyIs(P,'flow')){ capSyNext(P); const el=capSyNew(P,'SuccessionFlowUsage',k,owner); el.keyword='succession flow'; capSyHeader(P,el); return el; }
    const el=capSyNew(P,'SuccessionAsUsage',k,owner); el.keyword='succession'; capSyHeader(P,el); return el;
  }
  // ── Actions élémentaires : accept, send, assign, terminate, if, while, loop, for ──
  const ACT={accept:'AcceptActionUsage', send:'SendActionUsage', assign:'AssignmentActionUsage', terminate:'TerminateActionUsage',
    if:'IfActionUsage', while:'WhileLoopActionUsage', loop:'WhileLoopActionUsage', for:'ForLoopActionUsage'};
  if(ACT[v]){
    capSyNext(P);
    const el=capSyNew(P,ACT[v],k,owner); el.keyword=v;
    capSyActionTail(P, el, v);
    owner._prev={el};
    return el;
  }
  if(v==='until'){ capSyNext(P); capSySkip(P); return null; }
  // ── Définitions et usages : « part def X », « part x : X », « use case », « analysis » … ──
  let base='', kwText='', p2=0;
  if(v==='use'&&capSyIs(P,'case',1)){ base='UseCase'; kwText='use case'; p2=2; }
  else if((v==='analysis'||v==='verification')&&capSyIs(P,'case',1)){ base=CAP_SY_KIND_KW[v]; kwText=v; p2=2; }
  else if(v==='event'&&capSyIs(P,'occurrence',1)){ base='EventOccurrence'; kwText='event occurrence'; p2=2; }
  else if(v==='enum'&&capSyIs(P,'def',1)){ base='Enumeration'; kwText='enum'; p2=1; }
  else if(CAP_SY_KIND_KW[v]){ base=CAP_SY_KIND_KW[v]; kwText=v; p2=1; }
  // « individual def X », « #service def X » : définition sans mot-clé de sorte (occurrence / mot-clé utilisateur)
  if(!base&&v==='def'){ base=mods.individual?'Occurrence':(metaPfx&&metaPfx.length?'Occurrence':'Occurrence'); kwText=mods.individual?'individual':(metaPfx&&metaPfx.length?'#'+metaPfx[metaPfx.length-1]:'occurrence'); p2=0; }
  if(base){
    for(let j=0;j<p2;j++) capSyNext(P);
    const isDef=capSyEat(P,'def');
    let kind=base+(isDef?'Definition':'Usage');
    if(v==='message'&&!isDef) kind='FlowUsage';
    if(mods.event&&!isDef) kind='EventOccurrenceUsage';
    if(v==='enum'&&!isDef) kind='EnumerationUsage';
    const el=capSyNew(P,kind,k,owner); el.isDef=isDef; el.keyword=kwText+(isDef?' def':'');
    if(v==='snapshot'||v==='timeslice') el.portion=v;
    if(v==='message') el.isMessage=true;
    capSyHeader(P, el);
    if(!isDef&&CAP_SY_OCC_KINDS.has(kind)&&(kind!=='PartUsage'&&kind!=='ItemUsage'&&kind!=='ConstraintUsage')) owner._prev={el};
    return el;
  }
  // ── « ref » seul, ou usage sans mot-clé : « x : T ; », « :>> masse = 900 [kg] ; », « red ; » (valeur d'énumération) ──
  if(mods.ref||mods.end||mods.in||mods.out||mods.inout||mods.variant||capSyUsageStart(P, owner)){
    const el=capSyNew(P, owner.kind==='EnumerationDefinition'&&!mods.ref?'EnumerationUsage':'ReferenceUsage', k, owner);
    el.keyword=mods.ref?'ref':mods.end?'end':'';
    if(el.kind==='EnumerationUsage') el.keyword='enum';
    capSyHeader(P, el);
    return el;
  }
  // ── Expression (corps d'une contrainte, d'un calcul, résultat) ──
  if(k.t==='kw'&&!['true','false','null','not','all','new','meta'].includes(k.v)&&!(k.v==='if')){
    capSyErr(P,_L(`Mot-clé « ${k.v} » inattendu ici`),k);
    capSySkip(P); return null;
  }
  const ex=capSySkip(P).filter(x=>!(x.t==='sym'&&x.v===';'));
  if(ex.length) owner.exprs.push(capSyTokText(ex));
  return null;
}

/** Vrai si le lexème courant commence une simple référence suivie de « ; » (« then done; », « perform a.b; »).
 * @param {object} P @returns {boolean} */
function capSySimpleRef(P){
  let k=0; const t=capSyPeek(P);
  if(t.t!=='id'&&!(t.t==='kw'&&(t.v==='start'||t.v==='done'))) return false;
  k=1;
  while((capSyIs(P,'::',k)||capSyIs(P,'.',k))&&capSyPeek(P,k+1).t==='id') k+=2;
  return capSyIs(P,';',k);
}
/** Vrai si le lexème courant commence une chaîne qualifiée (« a.b », « A::B ») : une référence et non un nom déclaré.
 * @param {object} P @returns {boolean} */
function capSyRefStart(P){ return capSyPeek(P).t==='id'&&(capSyIs(P,'::',1)||capSyIs(P,'.',1)); }
/** Vrai si le mot-clé w apparaît dans l'en-tête courant, avant « ; » ou « { ». @param {object} P @param {string} w @returns {boolean} */
function capSyAhead(P, w){
  for(let k=0, d=0;;k++){ const t=capSyPeek(P,k); if(t.t==='eof') return false;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    else if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) return false;
    else if(d===0&&t.t==='kw'&&t.v===w) return true; }
}
/** Vrai si l'en-tête courant contient « then » avant « ; » ou « { » (transition abrégée). @param {object} P @returns {boolean} */
function capSyHasThen(P){
  for(let k=0, d=0;;k++){ const t=capSyPeek(P,k); if(t.t==='eof') return false;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    else if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) return false;
    else if(d===0&&t.t==='kw'&&t.v==='then') return true; }
}
/** Vrai si « if g then x ; » est une succession conditionnelle (après un nœud de décision) et non une action if.
 * @param {object} P @returns {boolean} */
function capSyCondSuccession(P){
  for(let k=1, d=0;;k++){ const t=capSyPeek(P,k); if(t.t==='eof') return false;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    else if(d===0&&t.t==='sym'&&(t.v==='{'||t.v==='}'||t.v===';')) return false;
    else if(d===0&&t.t==='kw'&&t.v==='then') return true; }
}
/** Vrai si l'élément est un état (définition ou usage) : contexte des transitions abrégées. @param {object} el @returns {boolean} */
function capSyInState(el){ return el&&(el.kind==='StateDefinition'||el.kind==='StateUsage'||el.kind==='ExhibitStateUsage'); }
/** Vrai si le lexème courant commence un usage sans mot-clé (« x : T ; », « :>> m = 1 ; », « red ; »).
 * @param {object} P @param {object} owner @returns {boolean} */
function capSyUsageStart(P, owner){
  const t=capSyPeek(P);
  if(t.t==='sym'&&(t.v===':>>'||t.v===':>'||t.v===':'||t.v==='::>')) return true;
  if(t.t==='kw'&&(t.v==='redefines'||t.v==='subsets'||t.v==='references')) return true;
  if(t.t==='sym'&&t.v==='<'&&capSyPeek(P,1).t==='id'&&capSyIs(P,'>',2)) return true;
  if(t.t!=='id') return false;
  const n=capSyPeek(P,1);
  if(n.t==='sym'&&[':',':>',':>>','::>','[',':=','~'].includes(n.v)) return true;
  if(n.t==='kw'&&['redefines','subsets','references','defined','typed','default','ordered','nonunique','crosses'].includes(n.v)) return true;
  const exprOwner=/^(Constraint|Calculation|Requirement|Concern|AnalysisCase|VerificationCase|Case|UseCase|AssertConstraint)/.test(owner.kind)||owner.kind==='ConstraintUsage';
  if(n.t==='sym'&&n.v===';') return !exprOwner;
  if(n.t==='sym'&&n.v==='='&&!exprOwner) return true;
  if(n.t==='sym'&&n.v==='{'&&!exprOwner) return true;
  return false;
}

/** Crée une succession entre deux membres d'un corps (« then », « first … then », « if g then x »).
 * @param {object} P - État @param {object} owner - Corps @param {object} tok - Position
 * @param {object|null} src - Source {el}|{ref} @param {object|null} tgt - Cible {el}|{ref}
 * @returns {object} Succession créée */
function capSySuccession(P, owner, tok, src, tgt){
  const s=capSyNew(P, capSyInState(owner)?'TransitionUsage':'SuccessionAsUsage', tok, owner);
  s.keyword=s.kind==='TransitionUsage'?'transition':'then'; s.implicit=true;
  s.ends=[src||{ref:'@prev'}, tgt||null];
  return s;
}

/** Fin d'une transition : « [accept déclencheur [via p]] [if garde] [do effet] then cible ».
 * @param {object} P @param {object} tr - Transition @param {boolean} acceptFirst - Le déclencheur suit directement */
function capSyTransitionTail(P, tr, acceptFirst){
  const until=stop=>{ const out=[]; let d=0; while(true){ const t=capSyPeek(P); if(t.t==='eof') break;
    if(t.t==='sym'&&(t.v==='('||t.v==='['||t.v==='{')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']'||t.v==='}')){ if(d===0) break; d--; }
    if(d===0&&((t.t==='kw'&&stop.includes(t.v))||(t.t==='sym'&&t.v===';'))) break; out.push(capSyNext(P)); } return out; };
  if(acceptFirst||capSyIs(P,'accept')){ capSyEat(P,'accept'); const tg=until(['if','do','then','via']); tr.trigger=capSyTokText(tg);
    // Déclencheur « accept T », « accept s : T » : type du signal (pas « accept at … », « after … », « when … »)
    let tt=tg; if(tt.length>2&&tt[0].t==='id'&&tt[1].t==='sym'&&tt[1].v===':') tt=tt.slice(2);
    if(tt.length&&tt.every(x=>x.t==='id'||(x.t==='sym'&&(x.v==='::'||x.v==='.')))) tr.refs.trigger=[capSyRefOf(tt)];
    if(capSyEat(P,'via')) tr.via=capSyTokText(until(['if','do','then'])); }
  if(capSyEat(P,'if')) tr.guard=capSyTokText(until(['do','then']));
  if(capSyEat(P,'do')) tr.effect=capSyTokText(until(['then']));
  if(capSyEat(P,'then')) tr.ends[1]={ref:capSyQName(P)};
  capSyHeaderTail(P, tr);
}

/** Fin d'un « bind a = b ». @param {object} P @param {object} el */
function capSyBindTail(P, el){
  const a=capSyQName(P); capSyEat(P,'=');
  const b=capSyQName(P);
  el.ends=[{ref:a},{ref:b}];
}

/** Fin d'une action élémentaire (accept, send, assign, if, while, for…) : texte gardé, références utiles relevées, corps éventuel.
 * @param {object} P @param {object} el @param {string} v - Mot-clé */
function capSyActionTail(P, el, v){
  const hdr=[]; let d=0;
  while(true){ const t=capSyPeek(P); if(t.t==='eof') break;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) break;
    hdr.push(capSyNext(P)); }
  el.text=capSyTokText(hdr);
  // accept [nom :] T [via p] ; send x [via p] [to q] ; for x in e
  if(v==='accept'){
    let i=0; if(hdr[0]&&hdr[0].t==='id'&&hdr[1]&&hdr[1].t==='sym'&&hdr[1].v===':'){ el.name=hdr[0].v; el.declaredName=true; i=2; }
    const tt=[]; while(i<hdr.length&&!(hdr[i].t==='kw'&&['via','then','if','do','at','after','when'].includes(hdr[i].v))) tt.push(hdr[i++]);
    const trig=hdr[i]&&hdr[i].t==='kw'&&['at','after','when'].includes(hdr[i].v);
    if(tt.length===1&&tt[0].t==='id'&&trig&&!el.name){ el.name=tt[0].v; el.declaredName=true; }
    else if(tt.length&&tt.every(x=>x.t==='id'||(x.t==='sym'&&(x.v==='::'||x.v==='.')))) el.refs.typedBy=[capSyRefOf(tt)];
    el.trigger=capSyTokText(tt);
    const vi=hdr.findIndex(x=>x.t==='kw'&&x.v==='via'); if(vi>=0) el.via=capSyTokText(hdr.slice(vi+1).filter((x,j,a)=>!a.slice(0,j+1).some(y=>y.t==='kw'&&y.v==='then')));
  }
  if(v==='send'){
    const ti=hdr.findIndex(x=>x.t==='kw'&&x.v==='to'), vi=hdr.findIndex(x=>x.t==='kw'&&x.v==='via');
    const end=[ti,vi].filter(x=>x>=0); el.payload=capSyTokText(hdr.slice(0,end.length?Math.min(...end):hdr.length));
    if(ti>=0) el.to=capSyTokText(hdr.slice(ti+1, vi>ti?vi:hdr.length)); if(vi>=0) el.via=capSyTokText(hdr.slice(vi+1, ti>vi?ti:hdr.length));
  }
  if(v==='if'||v==='while'||v==='loop'||v==='for') el.cond=el.text;
  if(capSyEat(P,'{')){ capSyBody(P, el);
    if(v==='loop'||v==='while'){ if(capSyIs(P,'until')){ capSyNext(P); el.until=capSyTokText(capSySkip(P).filter(x=>!(x.t==='sym'&&x.v===';'))); } }
    if(v==='if'&&capSyIs(P,'else')){ capSyNext(P); if(capSyIs(P,'{')){ capSyNext(P); const e=capSyNew(P,'ActionUsage',capSyPeek(P),el); e.keyword='else'; e.name='else'; capSyBody(P,e); } else if(capSyIs(P,'if')){ const k=capSyPeek(P); capSyKeyword(P, el, k, {}); } }
  } else capSyEat(P,';');
}

/** En-tête générique d'une déclaration : « [<court>] [nom] [: T] [:> A] [:>> B] [::> C] [[m]] [= valeur] [clauses] » puis « ; » ou corps.
 * @param {object} P - État
 * @param {object} el - Élément en cours
 * @param {boolean} [noName] - Pas de nom à lire (la référence vient d'être lue)
 */
function capSyHeader(P, el, noName){
  if(!noName){
    if(capSyIs(P,'<')&&capSyPeek(P,1).t==='id'&&capSyIs(P,'>',2)){ capSyNext(P); el.shortName=capSyNext(P).v; capSyNext(P); }
    const t=capSyPeek(P);
    if(t.t==='id'&&!capSyIs(P,'::',1)&&!capSyIs(P,'.',1)&&!capSyIs(P,'to',1)){ el.name=capSyNext(P).v; el.declaredName=true; }
    else if(t.t==='id'&&(el.kind==='FlowUsage'||el.kind==='SuccessionFlowUsage'||el.kind==='ConnectionUsage'||el.kind==='InterfaceUsage'||el.kind==='AllocationUsage'||el.kind==='SuccessionAsUsage')){
      // « flow a.b to c.d ; » : la source vient directement
      el.ends[0]={ref:capSyQName(P)};
    }
  }
  capSyHeaderTail(P, el);
}

/** Suite d'un en-tête (relations, multiplicité, valeur, clauses) puis « ; » ou « { corps } ».
 * @param {object} P @param {object} el */
function capSyHeaderTail(P, el){
  const list=()=>{ const l=[]; do{ const conj=capSyEat(P,'~'); const q=capSyQName(P); if(q) l.push((conj?'~':'')+q); else break; } while(capSyEat(P,',')); return l; };
  const push=(k,l)=>{ if(l.length) (el.refs[k]=el.refs[k]||[]).push(...l); };
  let guard=0;
  while(guard++<200){
    const t=capSyPeek(P);
    if(t.t==='eof') break;
    if(t.t==='sym'&&t.v===';'){ capSyNext(P); break; }
    if(t.t==='sym'&&t.v==='{'){ capSyNext(P); capSyBody(P, el); break; }
    if(t.t==='sym'&&t.v==='}') break;
    if(t.t==='sym'&&t.v===':'){ capSyNext(P); const l=list(); if(l.some(x=>x[0]==='~')) el.conjugated=true; push('typedBy',l.map(x=>x.replace(/^~/,''))); continue; }
    if(t.t==='kw'&&(t.v==='defined'||t.v==='typed')&&capSyIs(P,'by',1)){ capSyNext(P); capSyNext(P); const l=list(); if(l.some(x=>x[0]==='~')) el.conjugated=true; push('typedBy',l.map(x=>x.replace(/^~/,''))); continue; }
    if((t.t==='sym'&&t.v===':>')||(t.t==='kw'&&(t.v==='specializes'||t.v==='subsets'))){ capSyNext(P); push(el.isDef?'specializes':'subsets', list()); continue; }
    if((t.t==='sym'&&t.v===':>>')||(t.t==='kw'&&t.v==='redefines')){ capSyNext(P); push('redefines', list()); continue; }
    if((t.t==='sym'&&t.v==='::>')||(t.t==='kw'&&t.v==='references')){ capSyNext(P); push('references', list()); continue; }
    if((t.t==='sym'&&t.v==='=>')||(t.t==='kw'&&t.v==='crosses')){ capSyNext(P); push('crosses', list()); continue; }
    if(t.t==='kw'&&(t.v==='ordered'||t.v==='nonunique')){ el.mods[capSyNext(P).v]=true; continue; }
    if(t.t==='sym'&&t.v==='['&&!el.value){ el.mult=capSyTokText(capSyBalanced(P,'[',']')).replace(/\s/g,''); continue; }
    if((t.t==='sym'&&(t.v==='='||t.v===':='))||(t.t==='kw'&&t.v==='default')){
      const kind=capSyNext(P).v; if(kind==='default'){ el.valueKind='default'; if(capSyIs(P,'=')||capSyIs(P,':=')) capSyNext(P); } else el.valueKind=kind;
      el.value=capSyTokText(capSyUntilClause(P, ['connect','from','to','then','do','if','via','about','by','allocate','bind','first'])); continue; }
    if(t.t==='kw'&&t.v==='connect'){ capSyNext(P); capSyConnectEnds(P, el); continue; }
    if(t.t==='kw'&&t.v==='allocate'){ capSyNext(P); if(el.kind!=='AllocationUsage'&&el.kind!=='AllocationDefinition'){} capSyConnectEnds(P, el); continue; }
    if(t.t==='kw'&&t.v==='bind'){ capSyNext(P); capSyBindTail(P, el); continue; }
    if(t.t==='kw'&&t.v==='of'){ capSyNext(P); const save=P.p; const q=capSyQName(P);
      if(capSyIs(P,':')){ capSyNext(P); el.itemName=q; el.refs.item=[capSyQName(P)]; } else if(q) el.refs.item=[q]; else P.p=save;
      if(capSyIs(P,'[')) el.itemMult=capSyTokText(capSyBalanced(P,'[',']'));
      continue; }
    if(t.t==='kw'&&t.v==='from'){ capSyNext(P); el.ends[0]={ref:capSyQName(P)}; continue; }
    if(t.t==='kw'&&t.v==='to'){ capSyNext(P);
      if(el.kind==='SendActionUsage'||el.kind==='SendActionUsage') { el.to=capSyTokText(capSyUntilClause(P,['via'])); continue; }
      el.ends[1]={ref:capSyQName(P)}; continue; }
    if(t.t==='kw'&&t.v==='by'){ capSyNext(P); el.refs.by=[capSyQName(P)]; continue; }
    if(t.t==='kw'&&t.v==='first'){ capSyNext(P); el.ends[0]={ref:capSyQName(P)}; continue; }
    if(t.t==='kw'&&t.v==='then'){ capSyNext(P); if(el.kind==='TransitionUsage'||el.kind==='SuccessionAsUsage'||el.kind==='SuccessionFlowUsage'||el.kind==='ConnectionUsage') el.ends[1]={ref:capSyQName(P)}; else { el.thenRef=capSyQName(P); } continue; }
    if(t.t==='kw'&&t.v==='about'){ capSyNext(P); push('about', list()); continue; }
    if(t.t==='kw'&&t.v==='accept'&&el.kind==='TransitionUsage'){ capSyTransitionTail(P, el, true); break; }
    if(t.t==='kw'&&(t.v==='if'||t.v==='do')&&el.kind==='TransitionUsage'){ capSyTransitionTail(P, el, false); break; }
    if(t.t==='kw'&&t.v==='if'&&/Succession/.test(el.kind)){ capSyNext(P); el.guard=capSyTokText(capSyUntilClause(P,['then'])); continue; }
    if(t.t==='kw'&&t.v==='via'){ capSyNext(P); el.via=capSyQName(P); continue; }
    if(t.t==='kw'&&(t.v==='for'||t.v==='chains'||t.v==='inverse'||t.v==='featured'||t.v==='disjoint')){ capSyNext(P); continue; }
    if(t.t==='sym'&&t.v==='~'){ capSyNext(P); el.conjugated=true; continue; }
    if(t.t==='sym'&&t.v==='#'){ capSyNext(P); const q=capSyQName(P); if(q) el.meta.push(q); continue; }
    if(t.t==='cmt'){ const c=capSyNew(P,'Comment',t,el); c.body=capSyNext(P).v; continue; }
    if(t.t==='id'&&!el.name&&!el.declaredName&&!capSyIs(P,'::',1)&&!capSyIs(P,'.',1)){ el.name=capSyNext(P).v; el.declaredName=true; continue; }
    // Autre lexème : partie d'une expression non structurée (gardée comme texte)
    const ex=capSyUntilClause(P, ['connect','from','to','then','do','if','via','about','by','allocate','bind','first']);
    if(!ex.length){ capSyErr(P,_L(`Lexème inattendu « ${t.v} » dans la déclaration`),t); capSySkip(P); break; }
    el.rest=((el.rest?el.rest+' ':'')+capSyTokText(ex));
  }
}

/** Lit une expression jusqu'à « ; », « { », « } » ou un mot-clé de clause (au niveau 0 des parenthèses).
 * @param {object} P @param {string[]} stops - Mots-clés d'arrêt @returns {object[]} Lexèmes */
function capSyUntilClause(P, stops){
  const out=[]; let d=0;
  while(true){
    const t=capSyPeek(P); if(t.t==='eof') break;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++;
    else if(t.t==='sym'&&(t.v===')'||t.v===']')){ if(d===0) break; d--; }
    else if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) break;
    else if(d===0&&t.t==='kw'&&stops.includes(t.v)) break;
    else if(t.t==='sym'&&t.v==='{'){ out.push(...capSyBalanced(P,'{','}')); continue; }
    out.push(capSyNext(P));
  }
  return out;
}

/** Extrémités d'une connexion : « a to b » ou « ( e1 ::> a, e2 ::> b, … ) ».
 * @param {object} P @param {object} el */
function capSyConnectEnds(P, el){
  if(capSyIs(P,'(')){
    const toks=capSyBalanced(P,'(',')').slice(1,-1);
    const parts=[[]]; let d=0;
    toks.forEach(x=>{ if(x.t==='sym'&&(x.v==='('||x.v==='[')) d++; if(x.t==='sym'&&(x.v===')'||x.v===']')) d--; if(d===0&&x.t==='sym'&&x.v===',') parts.push([]); else parts[parts.length-1].push(x); });
    el.ends=parts.filter(p=>p.length).map(p=>{
      const i=p.findIndex(x=>x.t==='sym'&&(x.v==='::>'||x.v==='=>')||x.t==='kw'&&(x.v==='references'||x.v==='crosses'));
      const r=i>=0?p.slice(i+1):p;
      const ri=r.findIndex(x=>x.t==='sym'&&x.v==='['); return {ref:capSyRefOf(ri>=0?r.slice(0,ri):r), endName:i>0&&p[0].t==='id'?p[0].v:''};
    });
    return;
  }
  const endOf=()=>{ let endName=''; if(capSyIs(P,'[')) capSyBalanced(P,'[',']'); if(capSyPeek(P).t==='id'&&(capSyIs(P,'::>',1)||capSyIs(P,'references',1)||capSyIs(P,'=>',1))){ endName=capSyNext(P).v; capSyNext(P); } const r=capSyQName(P); if(capSyIs(P,'[')) capSyBalanced(P,'[',']'); return {ref:r, endName}; };
  const a=endOf();
  if(capSyEat(P,'to')) el.ends=[a, endOf()]; else el.ends=[a];
}

/* ── Résolution des noms (KerML §8.2.3.5) ──────────────────────────────────────────────────────────── */

/**
 * Construit un modèle SysML à partir de plusieurs fichiers : analyse, effective des noms (redéfinitions), index des membres,
 * résolution des références (typage, spécialisation, extrémités, satisfy…), successions implicites, puis contrôles.
 * @param {{path:string, text:string}[]} files - Fichiers .sysml du projet
 * @returns {{files:object[], all:object[], diags:object[], lib:Set}} Modèle
 */
function capSyBuildModel(files){
  const M={files:[], all:[], diags:[], libUsed:new Set()};
  (files||[]).forEach(f=>{
    const r=capSyParse(f.text, f.path);
    M.files.push({path:f.path, text:f.text, root:r.root});
    M.all.push(...r.all); M.diags.push(...r.diags);
  });
  // Nom effectif d'une redéfinition sans nom (« attribute :>> masse » s'appelle masse)
  M.all.forEach(el=>{
    if(!el.name&&el.refs.redefines&&el.refs.redefines.length) el.name=String(el.refs.redefines[0]).split(/::|\./).pop();
    if(!el.name&&el.isRefUsage&&el.refs.subsets&&el.refs.subsets.length&&el.kind!=='SatisfyRequirementUsage') el.name=String(el.refs.subsets[0]).split(/::|\./).pop();
    if(!el.name&&el.kind==='SatisfyRequirementUsage'&&el.refs.requirement) el.name=String(el.refs.requirement[0]).split(/::|\./).pop();
    if(!el.name&&el.kind==='VerifyRequirementUsage'&&el.refs.requirement) el.name=String(el.refs.requirement[0]).split(/::|\./).pop();
  });
  // Index : membres nommés de chaque espace de noms (nom déclaré et nom court)
  M.all.forEach(el=>{
    el.mem=new Map();
    el.members.forEach(m=>{
      if(m.kind==='Import'||((m.kind==='Comment'||m.kind==='Documentation')&&!m.declaredName)) return;
      // Nom déclaré, nom court, ou nom effectif (redéfinition, référence « perform a.b » : nom de l'élément visé)
      [m.name, m.shortName].forEach(n=>{ if(!n) return; const l=el.mem.get(n); if(l) l.push(m); else el.mem.set(n,[m]); });
    });
  });
  // Espace global : racines de tous les fichiers (portée plate)
  M.global=new Map();
  M.files.forEach(f=>f.root.mem.forEach((l,n)=>{ const g=M.global.get(n); if(g) g.push(...l); else M.global.set(n,[...l]); }));
  M.cache=new Map(); M.ridSeq=0;
  capSyResolveAll(M);
  capSyChecks(M);
  return M;
}

/** Vrai si un paquetage de la bibliothèque standard porte ce nom (index embarqué, 57-sysml-bibliotheque.js).
 * @param {string} n @returns {boolean} */
function capSyLibHas(n){ return typeof CAP_SY_LIB!=='undefined'&&Object.prototype.hasOwnProperty.call(CAP_SY_LIB,n); }
/** Membres connus d'un paquetage de la bibliothèque standard (Set de noms), ou null.
 * @param {string} pkg - Nom du paquetage @returns {Set|null} */
function capSyLibMembers(pkg, seen){
  if(!capSyLibHas(pkg)) return null;
  const v=CAP_SY_LIB[pkg]; if(v instanceof Set) return v;
  seen=seen||new Set(); if(seen.has(pkg)) return new Set(); seen.add(pkg);
  const s=new Set();
  String(v).split(' ').forEach(n=>{ if(n[0]==='@'){ const m=capSyLibMembers(n.slice(1), seen); if(m) m.forEach(x=>s.add(x)); } else if(n) s.add(n); });
  return (CAP_SY_LIB[pkg]=s);
}

/** Généraux d'un élément (types, spécialisations, sous-ensembles, redéfinitions, références) déjà résolus dans le projet.
 * @param {object} M @param {object} el @returns {object[]} */
function capSyGenerals(M, el){
  const out=[];
  ['typedBy','specializes','subsets','redefines','references'].forEach(k=>{
    if(!el.refs[k]) return;
    if(!el.res[k]) el.res[k]=el.refs[k].map(r=>capSyResolveSelf(M, r, el));
    el.res[k].forEach(x=>{ if(x&&x.el) out.push(x.el); });
  });
  return out;
}

/** Recherche « locale » d'un nom dans un espace de noms : membres possédés, alias, membres hérités, imports.
 * @param {object} M - Modèle @param {object} ns - Espace de noms @param {string} name - Nom
 * @param {Set} seen - Espaces déjà visités (imports et spécialisations circulaires) @param {boolean} [visible] - Résolution « visible » seulement
 * @param {object} [self] - Élément à ignorer (une redéfinition ne se résout pas vers elle-même)
 * @returns {object|null} {el} | {lib:'Pkg::nom'} | null */
function capSyLocal(M, ns, name, seen, visible, self){
  if(!ns||seen.has(ns)) return null;
  seen.add(ns);
  const own=(ns.mem&&ns.mem.get(name)||[]).filter(m=>m!==self&&(!visible||m.vis!=='private'));
  if(own.length){
    const m=own[0];
    if(m.kind==='Alias'){ const t=(m.refs.target||[])[0]; if(t) return capSyResolve(M, t, ns, null, 'alias'); }
    return {el:m, n:own.length};
  }
  // Membres hérités (types, spécialisations…)
  if(ns.kind!=='Package'&&ns.kind!=='Namespace'&&ns.kind!=='LibraryPackage'){
    for(const g of capSyGenerals(M, ns)){ const r=capSyLocal(M, g, name, seen, true, self); if(r) return r; }
  }
  // Imports
  for(const im of ns.imports||[]){
    if(visible&&im.vis==='private') continue;
    const tgt=im.target||''; if(!tgt) continue;
    if(im.star||im.recursive){
      const T=capSyResolve(M, tgt, ns, null, 'import');
      if(T&&T.el){
        const r=capSyLocal(M, T.el, name, seen, !im.importAll, self); if(r) return r;
        if(im.recursive){ const d=capSyDeep(T.el, name, new Set()); if(d) return {el:d}; }
      } else if(T&&T.lib){
        const pk=T.lib, mems=capSyLibMembers(pk);
        if(mems&&mems.has(name)) return {lib:capSyLibHas(pk+'::'+name)?pk+'::'+name:capSyLibHas(name)?name:pk+'::'+name};
        if(!mems) return null;
      } else if(!T){ ns._unknownImport=true; }
    } else {
      const last=tgt.split('::').pop();
      if(last===name) return capSyResolve(M, tgt, ns, null, 'import');
    }
  }
  return null;
}

/** Vrai si l'élément (ou l'un de ses généraux du projet) a un général dans la bibliothèque standard (ShapeItems::Box…) :
 * ses membres hérités ne sont pas connus en détail, un nom introuvable n'y est donc pas une erreur.
 * @param {object} M @param {object} el @returns {boolean} */
function capSyHasLibGeneral(M, el){
  if(el._libGen!==undefined) return el._libGen;
  el._libGen=false;
  const seen=new Set(), st=[el];
  while(st.length){ const x=st.pop(); if(seen.has(x)) continue; seen.add(x);
    capSyGenerals(M, x);
    for(const k of ['typedBy','specializes','subsets','redefines','references']) (x.res[k]||[]).forEach(r=>{ if(r&&r.lib&&!r.inherited) el._libGen=true; if(r&&(r.unchecked)) el._libGen=true; if(r&&r.el) st.push(r.el); });
  }
  return el._libGen;
}

/** Recherche récursive d'un nom dans toute la descendance d'un espace de noms (import « ::** »).
 * @param {object} ns @param {string} name @param {Set} seen @returns {object|null} */
function capSyDeep(ns, name, seen){
  if(seen.has(ns)) return null; seen.add(ns);
  for(const m of ns.members){ if(m.name===name&&m.declaredName) return m; }
  for(const m of ns.members){ if(m.members.length){ const r=capSyDeep(m, name, seen); if(r) return r; } }
  return null;
}

/** Membre visible d'un élément, en suivant ses types (pour « a.b » : b est cherché parmi les membres de a et de ses types).
 * @param {object} M @param {object} el @param {string} name @returns {object|null} */
function capSyFeature(M, el, name){
  const r=capSyLocal(M, el, name, new Set(), false, null);
  if(r) return r;
  return null;
}

/**
 * Résout une référence écrite (« Moteur », « ISQ::mass », « moteurs.arbre », « $::A::B ») depuis un espace de noms.
 * Nom simple : résolution complète (local, puis propriétaires successifs, puis espace global et bibliothèque).
 * « A::B » : B cherché parmi les membres visibles de A ; « a.b » : b cherché parmi les membres de a et de ses types.
 * @param {object} M - Modèle
 * @param {string} ref - Référence écrite
 * @param {object} ctx - Espace de noms de départ
 * @param {object} [self] - Élément à ignorer (redéfinition)
 * @param {string} [why] - Nature de la référence (mémoïsation)
 * @returns {object|null} {el} (élément du projet) | {lib:'Pkg::nom'} (bibliothèque standard) | {pseudo:'start'|'done'|'entry'} | null
 */
function capSyResolve(M, ref, ctx, self, why){
  ref=String(ref||'').replace(/^~/,'');
  if(!ref) return null;
  if(ref==='@entry') return {pseudo:'entry'};
  const rid=x=>x?(x._rid||(x._rid=++M.ridSeq)):0;
  const key=rid(ctx)+'|'+ref+'|'+rid(self);
  if(M.cache.has(key)) return M.cache.get(key);
  M.cache.set(key, null);   // garde contre les boucles
  const segs=[]; const re=/(\$::|::|\.)?([^:.]+)/g; let m;
  while((m=re.exec(ref))) segs.push({sep:m[1]||'', n:m[2]});
  let cur=null;
  for(let i=0;i<segs.length;i++){
    const s=segs[i];
    if(i===0){
      if(s.sep==='$::'){ const g=M.global.get(s.n); cur=g?{el:g[0]}:capSyLibHas(s.n)?{lib:s.n}:null; }
      else {
        for(let ns=ctx; ns&&!cur; ns=ns.owner) cur=capSyLocal(M, ns, s.n, new Set(), false, self);
        if(!cur){ const g=M.global.get(s.n); if(g) cur={el:g[0]}; }
        if(!cur&&capSyLibHas(s.n)) cur={lib:s.n};
        if(!cur&&(s.n==='start'||s.n==='done')&&segs.length===1) cur={pseudo:s.n};
        if(!cur&&(s.n==='self'||s.n==='that')&&segs.length>1) cur={el:ctx};
        // Membre hérité d'une base implicite (Parts::Part, Actions::Action…) ou d'un type de la bibliothèque
        if(!cur&&typeof CAP_SY_LIB_FEATURES!=='undefined'&&CAP_SY_LIB_FEATURES.has(s.n)) cur={lib:'*::'+s.n, inherited:true};
        if(!cur){ for(let ns=ctx; ns&&!cur; ns=ns.owner) if(capSyHasLibGeneral(M, ns)) cur={lib:'*::'+s.n, unchecked:true}; }
      }
    } else if(cur&&cur.el){
      const base=cur.el;
      cur=s.sep==='.'?capSyFeature(M, base, s.n):capSyLocal(M, base, s.n, new Set(), true, null);
      if(!cur&&base.kind!=='Package'&&base.kind!=='LibraryPackage'){
        if(typeof CAP_SY_LIB_FEATURES!=='undefined'&&CAP_SY_LIB_FEATURES.has(s.n)) cur={lib:'*::'+s.n, inherited:true};
        else if(capSyHasLibGeneral(M, base)) cur={lib:'*::'+s.n, unchecked:true};
      }
    } else if(cur&&cur.lib){
      // Dans la bibliothèque : membres connus pour un paquetage (« ISQ::mass »), non vérifiés au-delà (« Actions::Action::start »)
      const pkg=capSyLibHas(cur.lib)?cur.lib:null, mems=pkg&&s.sep==='::'?capSyLibMembers(pkg):null;
      if(mems&&!mems.has(s.n)) cur={libMissing:cur.lib+'::'+s.n};
      else { const np=cur.lib+(s.sep==='.'?'.':'::')+s.n; cur={lib:capSyLibHas(np)?np:(mems&&capSyLibHas(s.n)?s.n:np), unchecked:!mems}; }
    }
    if(!cur||cur.libMissing) break;
  }
  if(cur&&cur.libMissing) cur=null;
  if(cur&&cur.lib) M.libUsed.add(cur.lib.split(/::|\./)[0]);
  M.cache.set(key, cur);
  return cur;
}

/** Résout une référence portée par un élément depuis son propriétaire, en ignorant d'abord l'élément lui-même (une
 * redéfinition ou un « perform a.b » porte le nom de ce qu'il vise), puis en l'admettant (« ref p :> p.x », « part p4 :> p4 »).
 * @param {object} M @param {string} ref @param {object} el @returns {object|null} */
function capSyResolveSelf(M, ref, el){
  return capSyResolve(M, ref, el.owner||el, el, 'rel')||capSyResolve(M, ref, el.owner||el, null, 'rel');
}

/** Résout toutes les références de tous les éléments, relie les successions implicites et note les références introuvables.
 * @param {object} M - Modèle */
function capSyResolveAll(M){
  const miss=(el, ref)=>{
    let unknownImport=false; for(let ns=el; ns; ns=ns.owner) if(ns._unknownImport) unknownImport=true;
    M.diags.push({severity:unknownImport?'warning':'error', code:'R-INTROUVABLE', message:unknownImport?_L(`Nom « ${ref} » introuvable (peut-être défini dans un paquetage importé absent du projet)`):_L(`Nom « ${ref} » introuvable`), line:el.line, column:el.col, file:el.file, el});
  };
  M.all.forEach(el=>{
    Object.keys(el.refs).forEach(k=>{
      if(!el.res[k]) el.res[k]=el.refs[k].map(r=>capSyResolveSelf(M, r, el));
      el.res[k].forEach((x,i)=>{ if(!x) miss(el, el.refs[k][i]); });
    });
    el.ends.forEach((e,i)=>{
      if(!e) return;
      if(e.el){ e.res={el:e.el}; return; }
      if(e.ref==='@prev'){ e.res=null; return; }
      e.res=capSyResolve(M, e.ref, el.owner||el, null, 'end');
      if(!e.res&&e.ref) miss(el, e.ref);
    });
    if(el.kind==='Import'&&el.target){ el.res.target=[capSyResolve(M, el.target, el.owner, null, 'import')]; if(!el.res.target[0]) miss(el, el.target); }
  });
}

/** Élément du projet visé par une référence résolue, ou null. @param {object} r @returns {object|null} */
function capSyEl(r){ return r&&r.el||null; }

/** Libellé lisible d'une référence résolue ou non (nom qualifié de l'élément, nom de bibliothèque, texte écrit).
 * @param {object} r - Résultat de capSyResolve @param {string} [written] - Texte écrit @returns {string} */
function capSyRefLabel(r, written){
  if(r&&r.el) return capSyQualified(r.el);
  if(r&&r.lib) return r.lib;
  if(r&&r.pseudo) return r.pseudo;
  return written||'?';
}

/** Nom qualifié d'un élément (« Paquetage::Partie::membre »), sans l'espace de noms du fichier.
 * @param {object} el @returns {string} */
function capSyQualified(el){
  const parts=[];
  for(let e=el; e&&!e.isFileRoot; e=e.owner) parts.unshift(e.name?capSyQuote(e.name):e.shortName?'<'+capSyQuote(e.shortName)+'>':'('+(e.keyword||e.kind)+')');
  return parts.join('::');
}

/** Métaclasses de définition acceptées comme type de chaque sorte d'usage (validate…UsageDefinition, clause 8.3). */
const CAP_SY_TYPING={
  PartUsage:['PartDefinition','ItemDefinition','OccurrenceDefinition','ConnectionDefinition','InterfaceDefinition','AllocationDefinition','FlowDefinition'],
  ItemUsage:['ItemDefinition','PartDefinition','ConnectionDefinition','InterfaceDefinition','AllocationDefinition','MetadataDefinition','FlowDefinition'],
  PortUsage:['PortDefinition'],
  AttributeUsage:['AttributeDefinition','EnumerationDefinition'],
  EnumerationUsage:['EnumerationDefinition'],
  ActionUsage:['ActionDefinition','CalculationDefinition','StateDefinition','CaseDefinition','AnalysisCaseDefinition','VerificationCaseDefinition','UseCaseDefinition','FlowDefinition'],
  StateUsage:['StateDefinition'],
  ExhibitStateUsage:['StateDefinition'],
  PerformActionUsage:['ActionDefinition','CalculationDefinition','StateDefinition','CaseDefinition','AnalysisCaseDefinition','VerificationCaseDefinition','UseCaseDefinition'],
  CalculationUsage:['CalculationDefinition','CaseDefinition','AnalysisCaseDefinition','VerificationCaseDefinition','UseCaseDefinition'],
  ConstraintUsage:['ConstraintDefinition','RequirementDefinition','ConcernDefinition'],
  RequirementUsage:['RequirementDefinition','ConcernDefinition'],
  ConcernUsage:['ConcernDefinition'],
  ConnectionUsage:['ConnectionDefinition','InterfaceDefinition','AllocationDefinition','FlowDefinition'],
  InterfaceUsage:['InterfaceDefinition'],
  AllocationUsage:['AllocationDefinition'],
  FlowUsage:['FlowDefinition','ActionDefinition'],
  UseCaseUsage:['UseCaseDefinition'],
  IncludeUseCaseUsage:['UseCaseDefinition'],
  VerificationCaseUsage:['VerificationCaseDefinition'],
  AnalysisCaseUsage:['AnalysisCaseDefinition'],
  CaseUsage:['CaseDefinition','AnalysisCaseDefinition','VerificationCaseDefinition','UseCaseDefinition'],
  ViewUsage:['ViewDefinition'], ViewpointUsage:['ViewpointDefinition'], RenderingUsage:['RenderingDefinition'],
  MetadataUsage:['MetadataDefinition'],
  OccurrenceUsage:null, EventOccurrenceUsage:null, ReferenceUsage:null
};

/** Contrôles structurels (clause 8.3 et §6.5 du dossier) : doublons de noms, multiplicités, typage incompatible,
 * spécialisation d'une métaclasse différente, port hors d'une définition ou d'un usage.
 * @param {object} M - Modèle */
function capSyChecks(M){
  const add=(sev, code, msg, el)=>M.diags.push({severity:sev, code, message:msg, line:el.line, column:el.col, file:el.file, el});
  M.all.forEach(el=>{
    // 1. Doublons de noms dans un même espace de noms
    if(el.mem) el.mem.forEach((l,n)=>{ const d=l.filter(x=>x.declaredName&&x.name===n&&x.kind!=='Alias'); if(d.length>1) add('error','V-DOUBLON',_L(`Nom « ${n} » déclaré ${d.length} fois dans « ${el.name||el.file} »`), d[1]); });
    // 2. Multiplicité incohérente [3..1]
    if(el.mult){ const m=/^\[(\d+)\.\.(\d+)\]$/.exec(el.mult); if(m&&+m[1]>+m[2]) add('error','V-MULTIPLICITE',_L(`Multiplicité ${el.mult} : la borne inférieure dépasse la borne supérieure`), el); }
    // 3. Typage incompatible (usage typé par une définition d'une autre sorte)
    const allowed=CAP_SY_TYPING[el.kind];
    if(allowed&&el.res.typedBy) el.res.typedBy.forEach((r,i)=>{
      const T=capSyEl(r); if(!T) return;
      if(!T.isDef&&T.kind!=='Alias') add('error','V-TYPAGE',_L(`« ${el.name||el.keyword} » est typé par « ${T.name} », qui n'est pas une définition (${T.kind})`), el);
      else if(T.isDef&&!allowed.includes(T.kind)) add('error','V-TYPAGE',_L(`${el.keyword||el.kind} « ${el.name} » typé par ${T.keyword} « ${T.name} » : type incompatible (attendu : ${allowed.map(capSyKindKeyword).join(', ')})`), el);
    });
    // 4. Spécialisation entre définitions de sortes différentes (part def :> attribute def…)
    if(el.isDef&&el.kind!=='OccurrenceDefinition'&&el.res.specializes) el.res.specializes.forEach(r=>{ const T=capSyEl(r); if(T&&T.isDef&&T.kind!==el.kind&&T.kind!=='OccurrenceDefinition'&&!capSySubKind(el.kind,T.kind)) add('warning','V-SPECIALISATION',_L(`${el.keyword} « ${el.name} » spécialise ${T.keyword} « ${T.name} » (métaclasses différentes)`), el); });
    // 5. Usage de port hors d'une définition ou d'un usage (ports au niveau d'un paquetage)
    if(el.kind==='PortUsage'&&el.owner&&(el.owner.kind==='Package'||el.owner.isFileRoot)) add('warning','V-PORT-PAQUETAGE',_L(`Port « ${el.name} » déclaré directement dans un paquetage`), el);
  });
}

/** Vrai si une métaclasse de définition peut en spécialiser une autre (ex. InterfaceDefinition :> ConnectionDefinition).
 * @param {string} a @param {string} b @returns {boolean} */
function capSySubKind(a, b){
  const SUP={InterfaceDefinition:['ConnectionDefinition','PartDefinition','ItemDefinition'], ConnectionDefinition:['PartDefinition','ItemDefinition'], AllocationDefinition:['ConnectionDefinition','PartDefinition','ItemDefinition'],
    FlowDefinition:['ActionDefinition','ConnectionDefinition'], PartDefinition:['ItemDefinition','OccurrenceDefinition'], ItemDefinition:['OccurrenceDefinition'], PortDefinition:['OccurrenceDefinition'],
    ActionDefinition:['OccurrenceDefinition'], StateDefinition:['ActionDefinition','OccurrenceDefinition'], CalculationDefinition:['ActionDefinition','OccurrenceDefinition'],
    CaseDefinition:['CalculationDefinition','ActionDefinition'], AnalysisCaseDefinition:['CaseDefinition','CalculationDefinition','ActionDefinition'], VerificationCaseDefinition:['CaseDefinition','CalculationDefinition','ActionDefinition'],
    UseCaseDefinition:['CaseDefinition','CalculationDefinition','ActionDefinition'], RequirementDefinition:['ConstraintDefinition'], ConcernDefinition:['RequirementDefinition','ConstraintDefinition'],
    EnumerationDefinition:['AttributeDefinition'], ViewpointDefinition:['RequirementDefinition','ConstraintDefinition'], MetadataDefinition:['ItemDefinition'], RenderingDefinition:['PartDefinition','ItemDefinition'], ViewDefinition:['PartDefinition','ItemDefinition']};
  return (SUP[a]||[]).includes(b);
}

/** Vrai si la définition a spécialise b (directement ou non). @param {object} M @param {object} a @param {object} b @returns {boolean} */
function capSySpecializesEl(M, a, b){
  const seen=new Set(), st=[a];
  while(st.length){ const x=st.pop(); if(x===b) return true; if(seen.has(x)) continue; seen.add(x); capSyGenerals(M,x).forEach(g=>st.push(g)); }
  return false;
}

/** Mot-clé SysML d'une métaclasse (« PartDefinition » → « part def »). @param {string} kind @returns {string} */
function capSyKindKeyword(kind){
  const m=/^(.*?)(Definition|Usage)$/.exec(kind||''); if(!m) return kind;
  const base={Part:'part',Item:'item',Attribute:'attribute',Port:'port',Connection:'connection',Interface:'interface',Allocation:'allocation',Flow:'flow',Action:'action',State:'state',
    Calculation:'calc',Constraint:'constraint',Requirement:'requirement',Concern:'concern',Case:'case',AnalysisCase:'analysis',VerificationCase:'verification',UseCase:'use case',View:'view',
    Viewpoint:'viewpoint',Rendering:'rendering',Metadata:'metadata',Occurrence:'occurrence',Enumeration:'enum',EventOccurrence:'event occurrence',Reference:'ref'}[m[1]]||m[1];
  return base+(m[2]==='Definition'?' def':'');
}

/** Déclaration d'un élément sur une ligne, en notation textuelle (lignes des compartiments, colonne « Déclaration »).
 * @param {object} el - Élément @param {boolean} [short] - Sans mot-clé @returns {string} */
function capSyDeclText(el, short){
  const r=el.refs, d=[];
  if(!short){
    const pre=['abstract','variation','variant','ref','end','derived','constant','individual'].filter(m=>el.mods[m]&&!(m==='ref'&&el.keyword==='ref')&&!(m==='end'&&el.keyword==='end'));
    if(el.dir) pre.unshift(el.dir);
    d.push(...pre); if(el.keyword) d.push(el.keyword);
  }
  if(el.shortName) d.push('<'+capSyQuote(el.shortName)+'>');
  if(el.declaredName&&el.name) d.push(capSyQuote(el.name));
  let s=d.join(' ');
  const rel=(sym,list)=>{ if(list&&list.length) s+=' '+sym+' '+list.join(', '); };
  if(r.typedBy&&el.kind!=='MetadataUsage'&&!(el.kind==='AcceptActionUsage')){ s+=' : '+(el.conjugated?'~':'')+r.typedBy.join(', '); }
  rel(':>', el.isDef?r.specializes:(el.isRefUsage?null:r.subsets)); rel(':>>', r.redefines); rel('::>', r.references);
  if(el.isRefUsage&&r.subsets) s+=' '+r.subsets.join(', ');
  if(el.kind==='SatisfyRequirementUsage'||el.kind==='VerifyRequirementUsage'){ if(r.requirement) s+=' '+r.requirement[0]; if(r.by) s+=' by '+r.by[0]; }
  if(el.mult) s+=el.mult;
  if(el.value) s+=' '+(el.valueKind==='default'?'default =':el.valueKind||'=')+' '+el.value;
  if(r.item) s+=' of '+r.item[0];
  const E=el.ends.filter(Boolean);
  if(E.length&&!/Transition|Succession/.test(el.kind)) s+=(el.keyword==='connect'||el.kind==='ConnectionUsage'||el.kind==='InterfaceUsage'?' connect ':el.kind==='AllocationUsage'?' allocate ':el.kind==='BindingConnectorAsUsage'?' ':' from ')+E.map(e=>e.el?e.el.name:e.ref).join(el.kind==='BindingConnectorAsUsage'?' = ':' to ');
  if(/Transition|Succession/.test(el.kind)){ const a=E[0], b=el.ends[1]; s+=(a?' first '+(a.el?a.el.name||a.el.keyword:a.ref):'')+(el.trigger?' accept '+el.trigger:'')+(el.guard&&el.guard!=='else'?' if '+el.guard:'')+(el.effect?' do '+el.effect:'')+(b?' then '+(b.el?b.el.name||b.el.keyword:b.ref):''); }
  if(el.text&&!el.name) s+=' '+el.text;
  if(el.exprs.length&&/^(ConstraintUsage|AssertConstraintUsage|CalculationUsage|RequirementUsage)$/.test(el.kind)&&!el.declaredName) s+=' { '+el.exprs.join('; ')+' }';
  if(el.kind==='Import') s=(el.vis||'private')+' import '+el.name;
  return s.replace(/\s+/g,' ').trim();
}
