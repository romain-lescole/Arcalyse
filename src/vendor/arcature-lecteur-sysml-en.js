/* Arcature — lecteur SysML v2 (en), assemblé par « node build.js --lecteur-sysml ». Licence Apache 2.0.
   Expose ArcatureLecteurSysml (voir src/lecteur-sysml/socle-fin.js, docs/LECTEUR-SYSML.md, docs/api/lecteur-sysml.d.ts). */
(function (racine, fabrique) {
  if (typeof module === 'object' && module && module.exports) module.exports = fabrique();
  else racine.ArcatureLecteurSysml = fabrique();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
'use strict';
/* ── src/js/01-config.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   01. CONFIGURATION ET TEXTES
   ═══════════════════════════════════════════════════════════════════════ */


/** Version d'Arcature (à mettre à jour à chaque livraison). */
const ARC_VERSION = '0.1.0';

/**
 * Texte affiché. Le texte français sert de clé : dans la version française, renvoyé tel quel ;
 * pour la version anglaise, `node build.js --lang en` remplace l'argument par sa traduction
 * (dictionnaire src/i18n/en.json). N'envelopper que des textes AFFICHÉS, jamais une valeur
 * comparée ou une clé.
 * @param {string} texte texte français (littéral entre apostrophes)
 * @returns {string}
 */
function _L(texte) { return texte; }

/**
 * Texte affiché avec paramètres : « {n} élément(s) » → remplace {n} par p.n.
 * Même mécanisme de traduction que _L (la phrase entière est traduite, pas ses morceaux).
 * @param {string} texte texte français avec des repères {nom}
 * @param {Object<string,*>} p valeurs des repères
 * @returns {string}
 */
function _Lp(texte, p) { return texte.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)); }

/* ── src/js/sysml/10-langage.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   SYSML/10. SysML v2 — LANGAGE : lexique, analyse syntaxique tolérante, résolution des noms, contrôles
   Cible : SysML 2.0 (formal/2026-03-02) et KerML 1.0. Sans DOM (chargé aussi par les tests Node).
   Transforme des textes .sysml en un graphe d'éléments (métaclasses SysML : PartUsage, PartDefinition…),
   que l'adaptateur du format SysML (sysml/30-format.js) présente à l'interface.
   Repris du lecteur d'Arcalyse (même auteur, Apache 2.0 comme Arcature), corpus officiel SysML-v2-Release lu sans erreur.
   ═══════════════════════════════════════════════════════════════════════ */

/** Mots réservés de SysML 2.0 (§8.2.2.1.2) : jamais utilisables comme nom simple. */
const SY_KEYWORDS=new Set(('about abstract accept action actor after alias all allocate allocation analysis and as assert assign assume at attribute bind binding by calc case comment '+
  'concern connect connection constant constraint crosses decide def default defined dependency derived do doc else end entry enum event exhibit exit expose '+
  'false filter first flow for fork frame from hastype if implies import in include individual inout interface istype item join language library locale loop merge '+
  'message meta metadata nonunique not null objective occurrence of or ordered out package parallel part perform port private protected public redefines ref '+
  'references render rendering rep require requirement return satisfy send snapshot specializes stakeholder standard state subject subsets succession terminate then '+
  'timeslice to transition true until use variant variation verification verify via view viewpoint when while xor').split(' '));
/** Symboles (KerML §8.2.2.7), du plus long au plus court : règle du plus long symbole possible. */
const SY_SYMBOLS=['::>',':>>','===','!==','..','::',':>',':=','->','=>','==','!=','<=','>=','**','??','.?',
  '(',')','{','}','[',']',';',',','~','@','#','%','&','^','|','*','+','-','/','$','.',':','<','=','>','?','!'];

/** Mot-clé d'élément → racine de la métaclasse (« Part » → PartDefinition / PartUsage). */
const SY_KIND_KW={part:'Part', item:'Item', attribute:'Attribute', port:'Port', connection:'Connection', interface:'Interface',
  allocation:'Allocation', flow:'Flow', message:'Flow', action:'Action', state:'State', calc:'Calculation', constraint:'Constraint',
  requirement:'Requirement', concern:'Concern', case:'Case', analysis:'AnalysisCase', verification:'VerificationCase', view:'View',
  viewpoint:'Viewpoint', rendering:'Rendering', metadata:'Metadata', occurrence:'Occurrence', enum:'Enumeration', snapshot:'Occurrence', timeslice:'Occurrence'};
/** Préfixes d'une déclaration (modificateurs) : ils précèdent le mot-clé de l'élément. */
/** Mots-clés des opérateurs d'expression (KerML §8.2.5.8) : une expression se poursuit après eux. */
const SY_OPERATEURS_KW=new Set(['if','else','or','and','xor','implies','not','as','meta','hastype','istype','all']);
/** Symboles des opérateurs binaires et de navigation : une expression se poursuit après un corps « { … } » qu'ils suivent. */
const SY_OPERATEURS_SYM=new Set(['|','&','+','-','*','/','%','^','**','==','!=','===','!==','<','>','<=','>=','?','??','..','->','.','.?',',']);
const SY_PREFIX_KW=new Set(['abstract','variation','variant','readonly','derived','end','ref','in','out','inout','individual','constant','ordered','nonunique','composite','portion','var','parallel']);
/** Mots-clés introduisant une clause dans l'en-tête d'une déclaration (arrêtent une expression de valeur). */
const SY_CLAUSE_KW=new Set(['connect','from','to','of','by','first','then','accept','if','do','via','about','for','allocate','bind','at','after','when','else','until','crosses','defined','typed','subsets','redefines','references','specializes','chains','inverse','featured','conjugates','disjoint','unions','differences','intersects','locale','language','default']);
/** Éléments « comportementaux » d'un corps (cible ou source implicite d'une succession « then »). */
const SY_OCC_KINDS=new Set(['ActionUsage','StateUsage','PerformActionUsage','ExhibitStateUsage','AcceptActionUsage','SendActionUsage','AssignmentActionUsage','IfActionUsage',
  'WhileLoopActionUsage','ForLoopActionUsage','TerminateActionUsage','ForkNode','JoinNode','MergeNode','DecisionNode','CalculationUsage','CaseUsage','UseCaseUsage',
  'IncludeUseCaseUsage','EventOccurrenceUsage','OccurrenceUsage','AnalysisCaseUsage','VerificationCaseUsage','StateActionUsage','ConstraintUsage','PartUsage','ItemUsage']);

/**
 * Découpe un texte .sysml en lexèmes. Les notes (// et //* … *\/) sont ignorées ; les commentaires /* … *&#47; deviennent
 * des lexèmes « cmt » (éléments Comment / Documentation du modèle).
 * @param {string} src - Texte source
 * @param {string} file - Nom du fichier (diagnostics)
 * @param {object[]} diags - Diagnostics (complétés)
 * @returns {object[]} Lexèmes {t:'id'|'kw'|'str'|'num'|'sym'|'cmt'|'eof', v, l, c, o, e, q?} (o, e : début et fin dans le texte)
 */
function syLex(src, file, diags){
  const toks=[], n=src.length; let i=0, line=1, col=1;
  /** Avance de k caractères en tenant à jour ligne et colonne. */
  const adv=k=>{ for(let j=0;j<k&&i<n;j++){ if(src.charCodeAt(i)===10){ line++; col=1; } else col++; i++; } };
  const isA=ch=>(ch>=65&&ch<=90)||(ch>=97&&ch<=122)||ch===95, isD=ch=>ch>=48&&ch<=57;
  const err=(code,msg,l,c)=>diags.push({severity:'error', code, message:msg, line:l, column:c, file});
  while(i<n){
    if(toks.length&&toks[toks.length-1].e==null) toks[toks.length-1].e=i;   // fin du lexème précédent (positions exactes, écriture par plages)
    const ch=src.charCodeAt(i), c=src[i];
    if(ch===32||ch===9||ch===10||ch===13||ch===12||ch===0xA0||ch===0xFEFF){ adv(1); continue; }
    const L=line, C=col, O=i;
    if(c==='/'&&src[i+1]==='/'){
      if(src[i+2]==='*'){ const e=src.indexOf('*/',i+3); if(e<0){ err('E-LEX-NOTE',_L('Unterminated multi-line note //*'),L,C); adv(n-i); break; } adv(e+2-i); continue; }
      const e=src.indexOf('\n',i); adv((e<0?n:e)-i); continue;
    }
    if(c==='/'&&src[i+1]==='*'){
      let e=src.indexOf('*/',i+2); if(e<0){ err('E-LEX-COMMENTAIRE',_L('Unterminated comment /*'),L,C); e=n; }
      const raw=src.slice(i+2,e); adv(Math.min(n,e+2)-i);
      toks.push({o:O, t:'cmt', v:syCmtBody(raw), l:L, c:C}); continue;
    }
    if(isA(ch)){
      let j=i+1; while(j<n){ const d=src.charCodeAt(j); if(isA(d)||isD(d)) j++; else break; }
      // Lettre accentuée collée au nom : nom invalide hors apostrophes (piège des noms français)
      if(j<n&&src.charCodeAt(j)>127&&/[\p{L}\p{N}]/u.test(src[j])){
        let k=j; while(k<n&&/[\p{L}\p{N}_]/u.test(src[k])) k++;
        err('E-LEX-NOM-ASCII',_Lp('Name “{a}”: a basic name only accepts ASCII letters; write it between single quotes (\'{b}\')', { a: src.slice(i,k), b: src.slice(i,k) }),L,C);
        toks.push({o:O, t:'id', v:src.slice(i,k), l:L, c:C}); adv(k-i); continue;
      }
      const w=src.slice(i,j); adv(j-i);
      toks.push({o:O, t:SY_KEYWORDS.has(w)?'kw':'id', v:w, l:L, c:C}); continue;
    }
    if(ch>127&&/[\p{L}]/u.test(c)){
      let k=i; while(k<n&&/[\p{L}\p{N}_]/u.test(src[k])) k++;
      err('E-LEX-NOM-ASCII',_Lp('Name “{a}”: a basic name only accepts ASCII letters; write it between single quotes (\'{b}\')', { a: src.slice(i,k), b: src.slice(i,k) }),L,C);
      toks.push({o:O, t:'id', v:src.slice(i,k), l:L, c:C}); adv(k-i); continue;
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
      if(!ok) err('E-LEX-CHAINE',c==="'"?_L('Unterminated quoted name'):_L('Unterminated string'),L,C);
      adv(j-i);
      toks.push(c==="'"?{o:O, t:'id', v:s, q:true, l:L, c:C}:{o:O, t:'str', v:s, l:L, c:C}); continue;
    }
    if(isD(ch)){
      let j=i; while(j<n&&isD(src.charCodeAt(j))) j++;
      if(src[j]==='.'&&isD(src.charCodeAt(j+1))){ j++; while(j<n&&isD(src.charCodeAt(j))) j++; }
      if((src[j]==='e'||src[j]==='E')&&(isD(src.charCodeAt(j+1))||((src[j+1]==='+'||src[j+1]==='-')&&isD(src.charCodeAt(j+2))))){ j+=2; while(j<n&&isD(src.charCodeAt(j))) j++; }
      toks.push({o:O, t:'num', v:src.slice(i,j), l:L, c:C}); adv(j-i); continue;
    }
    const sym=SY_SYMBOLS.find(s=>src.startsWith(s,i));
    if(sym){ toks.push({o:O, t:'sym', v:sym, l:L, c:C}); adv(sym.length); continue; }
    err('E-LEX-CARACTERE',_Lp('Unexpected character “{a}”', { a: c }),L,C); adv(1);
  }
  if(toks.length&&toks[toks.length-1].e==null) toks[toks.length-1].e=i;
  toks.push({t:'eof', v:'', l:line, c:col, o:n, e:n});
  return toks;
}

/** Corps d'un commentaire /* … *&#47; débarrassé des astérisques de début de ligne et des marges.
 * @param {string} raw - Texte entre /* et *&#47;
 * @returns {string} Texte du commentaire */
function syCmtBody(raw){
  const lines=String(raw).split(/\r?\n/).map((l,k)=>k===0?l:l.replace(/^\s*\*(?!\/)\s?/,''));
  return lines.join('\n').replace(/^\s+|\s+$/g,'');
}

/** Texte lisible d'une suite de lexèmes (expression, valeur, garde) : espaces placés comme dans la notation textuelle.
 * @param {object[]} toks - Lexèmes
 * @returns {string} Texte */
function syTokText(toks){
  let s='', prev=null;
  const tight=new Set(['.','::','.?','(','[','~','$','@','#']), noBefore=new Set(['.','::','.?',')',']',',',';','(','[']);
  for(const t of toks){
    let v=t.t==='str'?JSON.stringify(t.v):t.t==='id'&&t.q?syQuote(t.v):t.t==='cmt'?'/* '+t.v+' */':t.v;
    if(prev&&!(prev.t==='sym'&&tight.has(prev.v))&&!(t.t==='sym'&&noBefore.has(t.v))) s+=' ';
    // « f(x) », « a[2] » : pas d'espace avant la parenthèse ou le crochet d'un appel ou d'une unité collée
    const pt=prev&&prev.t==='sym'&&tight.has(prev.v);
    if(prev&&!pt&&t.t==='sym'&&t.v==='('&&!(prev.t==='id'||(prev.t==='sym'&&prev.v===')'))) s+=' ';
    if(prev&&!pt&&t.t==='sym'&&t.v==='['&&prev.t!=='id') s+=' ';   // « 1800 [kg] » : unité séparée de la valeur
    s+=v; prev=t;
  }
  return s.replace(/\s+/g,' ').trim();
}

/** Référence écrite par une suite de lexèmes de nom qualifié (noms non restreints gardés sans apostrophes, comme syQName).
 * @param {object[]} toks @returns {string} */
function syRefOf(toks){ return toks.filter(t=>t.t==='id'||(t.t==='sym'&&(t.v==='::'||t.v==='.'||t.v==='$'))||(t.t==='kw'&&(t.v==='start'||t.v==='done'))).map(t=>t.t==='id'?syNomRef(t):t.v).join(''); }

/** Segment de référence d'un lexème de nom : sans apostrophes, sauf un nom non restreint contenant « . », « : » ou « ' »,
 * gardé entre apostrophes pour ne pas être découpé (sySegmentsRef).
 * @param {object} t - Lexème @returns {string} */
function syNomRef(t){ return t.q&&/[.:']/.test(t.v)?syQuote(t.v):t.v; }

/** Segments d'une référence écrite (« A::B », « a.b », « $::X », « 'P3.1'.'FIP 1' ») : séparateur et nom, apostrophes retirées.
 * @param {string} ref - Référence @returns {{sep:string, n:string, brut:string}[]} */
function sySegmentsRef(ref){
  const segs=[]; const re=/(\$::|::|\.)?('(?:[^'\\]|\\.)*'|[^:.']+)/g; let m;
  while((m=re.exec(String(ref||'')))) segs.push({sep:m[1]||'', n:m[2][0]==="'"?m[2].slice(1,-1).replace(/\\(.)/g,'$1'):m[2], brut:m[0]});
  return segs;
}

/** Écrit un nom tel qu'il doit apparaître dans un texte SysML : entre apostrophes s'il n'est pas un nom simple ASCII ou s'il est réservé.
 * @param {string} n - Nom
 * @returns {string} Nom écrit */
function syQuote(n){
  n=String(n||'');
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n)&&!SY_KEYWORDS.has(n)?n:"'"+n.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
}

/** Crée un élément du graphe SysML.
 * @param {object} P - État de l'analyse
 * @param {string} kind - Métaclasse (PartUsage, Package…)
 * @param {object} tok - Lexème de début (position)
 * @param {object} owner - Élément propriétaire
 * @returns {object} Élément */
function syNew(P, kind, tok, owner){
  const el={kind, name:'', shortName:'', owner:owner||null, members:[], file:P.file, line:tok?tok.l:0, col:tok?tok.c:0, endLine:0,
    keyword:'', isDef:false, vis:'', mods:{}, rels:{}, ends:[], docs:[], meta:[], metaPfx:[], exprs:[], refs:{}, res:{}};
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
function syParse(text, file){
  const diags=[];
  const P={toks:syLex(String(text||''), file, diags), p:0, file, diags, all:[]};
  const root=syNew(P, 'Namespace', P.toks[0], null);
  root.name=file; root.isFileRoot=true;
  syBody(P, root, true);
  return {root, all:P.all, diags};
}

/** Lexème courant (sans avancer). @param {object} P @param {number} [k] - Décalage */
function syPeek(P, k){ return P.toks[Math.min(P.p+(k||0), P.toks.length-1)]; }
/** Lexème courant (puis avance). @param {object} P */
function syNext(P){ const t=P.toks[P.p]; if(P.p<P.toks.length-1) P.p++; return t; }
/** Vrai si le lexème courant est le mot-clé ou le symbole v. @param {object} P @param {string} v @param {number} [k] */
function syIs(P, v, k){ const t=syPeek(P,k); return (t.t==='kw'||t.t==='sym')&&t.v===v; }
/** Consomme le mot-clé ou le symbole v s'il est présent. @param {object} P @param {string} v @returns {boolean} */
function syEat(P, v){ if(syIs(P,v)){ syNext(P); return true; } return false; }
/** Note une erreur de syntaxe au lexème courant. @param {object} P @param {string} msg @param {object} [tok] */
function syErr(P, msg, tok){ const t=tok||syPeek(P); P.diags.push({severity:'error', code:'E-SYNTAXE', message:msg, line:t.l, column:t.c, file:P.file}); }

/** Analyse un corps « { … } » (ou le fichier entier) : une suite de membres jusqu'à « } ».
 * @param {object} P - État
 * @param {object} owner - Propriétaire des membres
 * @param {boolean} [top] - Niveau fichier (fin = fin du texte)
 */
function syBody(P, owner, top){
  owner._prev=null;
  // Positions pour l'écriture par plages : accolade ouvrante du corps, puis fermante
  if(!top){ const b=P.toks[P.p-1]; if(b&&b.t==='sym'&&b.v==='{') owner.ouvre=b.o; }
  while(true){
    const t=syPeek(P);
    if(t.t==='eof'){ if(!top) syErr(P,_L('“}” missing at end of file'),t); break; }
    if(t.t==='sym'&&t.v==='}'){
      if(top){ syErr(P,_L('Extra “}”'),t); syNext(P); continue; }
      owner.endLine=t.l; owner.ferme=t.o; syNext(P); break;
    }
    const p0=P.p, n0=owner.members.length;
    try{ syMember(P, owner); }
    catch(e){ syErr(P,_L('Parsing interrupted: ')+e.message); }
    // Plage du membre dans le texte (visibilité et préfixes compris) ; « ; » final d'un élément sans corps
    const der=P.toks[P.p-1];
    for(const m of owner.members.slice(n0)){
      if(m.debut==null){ m.debut=t.o; m.fin=der?der.e:t.e; }
      if(m.ouvre==null&&der&&der.t==='sym'&&der.v===';') m.pointVirgule=der.o;
    }
    // « ) » ou « ] » isolé : sySkip s'y arrête sans le consommer ; le lexème est sauté (sinon l'analyse bouclerait)
    if(P.p===p0){ syErr(P,_Lp('Unexpected token “{a}”', { a: t.v }),t); sySkip(P); if(P.p===p0) syNext(P); }
  }
  delete owner._prev;
}

/** Saute jusqu'au prochain « ; » (consommé) ou « } » (laissé), en sautant les corps « { … } » équilibrés.
 * @param {object} P - État
 * @returns {object[]} Lexèmes sautés */
function sySkip(P){
  const out=[]; let depth=0;
  while(true){
    const t=syPeek(P);
    if(t.t==='eof') break;
    if(t.t==='sym'){
      if(t.v==='{'||t.v==='('||t.v==='[') depth++;
      else if(t.v==='}'||t.v===')'||t.v===']'){ if(depth===0) break; depth--;
        if(depth===0&&t.v==='}'){ out.push(syNext(P)); const u=syPeek(P);
          // « (…)->forAll { … } or (…) » : un opérateur après le corps poursuit l'expression
          if((u.t==='kw'&&SY_OPERATEURS_KW.has(u.v)&&u.v!=='if')||(u.t==='sym'&&SY_OPERATEURS_SYM.has(u.v))) continue;
          if(syIs(P,';')) syNext(P); break; } }
      else if(t.v===';'&&depth===0){ syNext(P); break; }
    }
    out.push(syNext(P));
  }
  return out;
}

/** Lit un nom qualifié ou une chaîne de features (« A::B », « a.b.c », « $::X », « ~T ») à partir du lexème courant.
 * @param {object} P - État
 * @returns {string} Référence écrite ('' si aucune) */
function syQName(P){
  let s='';
  if(syIs(P,'$')&&syIs(P,'::',1)){ syNext(P); syNext(P); s='$::'; }
  const t=syPeek(P);
  if(t.t!=='id'&&!(t.t==='kw'&&(t.v==='start'||t.v==='done'))) return s;
  s+=t.t==='id'?syNomRef(syNext(P)):syNext(P).v;
  while((syIs(P,'::')||syIs(P,'.'))&&(syPeek(P,1).t==='id'||(syIs(P,'::')&&syIs(P,'*',1)))){
    if(syIs(P,'*',1)) break;
    s+=syNext(P).v+syNomRef(syNext(P));
  }
  return s;
}

/** Analyse un membre d'un corps : déclaration (définition ou usage), relation (import, alias, satisfy, connect, flow,
 * succession, transition…), annotation (doc, commentaire, métadonnée) ou, à défaut, expression (corps de contrainte, de calcul).
 * @param {object} P - État
 * @param {object} owner - Propriétaire
 */
function syMember(P, owner){
  const t0=syPeek(P);
  if(t0.t==='cmt'){ syNext(P); const c=syNew(P,'Comment',t0,owner); c.body=t0.v; return; }
  if(t0.t==='sym'&&t0.v===';'){ syNext(P); return; }
  let vis='';
  if(t0.t==='kw'&&(t0.v==='public'||t0.v==='private'||t0.v==='protected')){ vis=syNext(P).v; }
  const t=syPeek(P), v=t.t==='kw'?t.v:'';
  if(v==='import') return syImport(P, owner, vis, t);
  if(v==='alias') return syAlias(P, owner, vis, t);
  if(v==='doc'){ syNext(P); const d=syNew(P,'Documentation',t,owner); syNameDecl(P,d); if(syEat(P,'locale')&&syPeek(P).t==='str') d.locale=syNext(P).v; if(syPeek(P).t==='cmt') d.body=syNext(P).v; else syErr(P,_L('Text /* … */ expected after doc')); owner.docs.push(d.body||''); return; }
  if(v==='comment'){ syNext(P); const c=syNew(P,'Comment',t,owner); c.vis=vis; syNameDecl(P,c);
    if(syEat(P,'about')){ c.refs.about=[]; do{ const q=syQName(P); if(q) c.refs.about.push(q); else break; } while(syEat(P,',')); }
    if(syEat(P,'locale')&&syPeek(P).t==='str') c.locale=syNext(P).v;
    if(syPeek(P).t==='cmt') c.body=syNext(P).v; else sySkip(P);
    return; }
  if(v==='rep'||v==='language'){ syNext(P); const r=syNew(P,'TextualRepresentation',t,owner); if(v==='rep'){ syNameDecl(P,r); syEat(P,'language'); }
    if(syPeek(P).t==='str') r.language=syNext(P).v; if(syPeek(P).t==='cmt') r.body=syNext(P).v; return; }
  if(t.t==='sym'&&t.v==='@'){ syNext(P); return syMetadataUsage(P, owner, vis, t); }
  if(v==='metadata'&&!syIs(P,'def',1)){ syNext(P); return syMetadataUsage(P, owner, vis, t); }
  if(v==='package'||v==='library'||(v==='standard'&&syIs(P,'library',1))){
    let lib=false; if(syEat(P,'standard')) lib=true; if(syEat(P,'library')) lib=true; syEat(P,'package');
    const pk=syNew(P, lib?'LibraryPackage':'Package', t, owner); pk.vis=vis; pk.keyword=lib?'library package':'package';
    syNameDecl(P,pk);
    if(syEat(P,'{')) syBody(P,pk); else if(!syEat(P,';')){ syErr(P,_L('“{” or “;” expected after the package')); sySkip(P); }
    return;
  }
  if(v==='filter'){ syNext(P); const f=syNew(P,'ElementFilterMembership',t,owner); f.expr=syTokText(sySkip(P).filter(x=>!(x.t==='sym'&&x.v===';'))); return; }
  if(v==='locale'&&syPeek(P,1).t==='str'){ syNext(P); const c=syNew(P,'Comment',t,owner); c.locale=syNext(P).v; if(syPeek(P).t==='cmt') c.body=syNext(P).v; return; }
  // Préfixes : modificateurs et métadonnées en préfixe (#Securite)
  const mods={}, metaPfx=[];
  while(true){
    const u=syPeek(P);
    if(u.t==='kw'&&SY_PREFIX_KW.has(u.v)&&!(u.v==='end'&&false)){ mods[u.v]=true; syNext(P); continue; }
    if(u.t==='sym'&&u.v==='#'){ syNext(P); const q=syQName(P); if(q) metaPfx.push(q); continue; }
    if(u.t==='sym'&&u.v==='['&&mods.end){ mods._mult=syTokText(syBalanced(P,'[',']')).replace(/\s/g,''); continue; }
    break;
  }
  const k=syPeek(P);
  if(k.t==='kw'&&k.v==='dependency'){ syNext(P); const d=syDependency(P, owner, vis, k); if(d&&metaPfx.length){ d.meta.push(...metaPfx); d.metaPfx.push(...metaPfx); } return; }
  const el=syKeyword(P, owner, k, mods, metaPfx);
  if(!el) return;
  el.vis=vis; if(mods._mult&&!el.mult) el.mult=mods._mult; delete mods._mult; Object.assign(el.mods, mods); if(metaPfx.length){ el.meta.push(...metaPfx); el.metaPfx.push(...metaPfx); }
  if(mods.in) el.dir='in'; else if(mods.out) el.dir='out'; else if(mods.inout) el.dir='inout';
}

/** Lit la déclaration de nom d'un élément : « <shortName> nom » (chacun facultatif).
 * @param {object} P - État
 * @param {object} el - Élément */
function syNameDecl(P, el){
  if(syIs(P,'<')&&syPeek(P,1).t==='id'&&syIs(P,'>',2)){ syNext(P); el.shortName=syNext(P).v; syNext(P); }
  const t=syPeek(P);
  if(t.t==='id'&&!syIs(P,'::',1)&&!syIs(P,'.',1)){ el.nameTok=syPeek(P); el.name=syNext(P).v; el.declaredName=true; }
}

/** Import « [visibilité] import [all] A::B | A::* | A::** | A::*::** [filtre] ; ».
 * @param {object} P @param {object} owner @param {string} vis @param {object} t - Lexème « import » */
function syImport(P, owner, vis, t){
  syNext(P);
  const im=syNew(P,'Import',t,owner); im.vis=vis||'private';
  if(!vis) P.diags.push({severity:'warning', code:'W-IMPORT-VISIBILITE', message:_L('Import without visibility: write private, public or protected (private assumed)'), line:t.l, column:t.c, file:P.file});
  if(syEat(P,'all')) im.importAll=true;
  im.target=syQName(P);
  if(syIs(P,'::')&&syIs(P,'*',1)){ syNext(P); syNext(P); im.star=true;
    if(syIs(P,'::')&&syIs(P,'**',1)){ syNext(P); syNext(P); im.recursive=true; } }
  else if(syIs(P,'::')&&syIs(P,'**',1)){ syNext(P); syNext(P); im.recursive=true; im.withSelf=true; }
  if(syIs(P,'[')){ im.filter=syTokText(syBalanced(P,'[',']')); }
  im.name=im.target+(im.star?'::*':'')+(im.recursive?'::**':'');
  if(syEat(P,'{')) syBody(P,im); else if(!syEat(P,';')){ syErr(P,_L('“;” expected after the import')); sySkip(P); }
  owner.imports=(owner.imports||[]); owner.imports.push(im);
}

/** Alias « alias Nom for A::B ; ». @param {object} P @param {object} owner @param {string} vis @param {object} t */
function syAlias(P, owner, vis, t){
  syNext(P);
  const a=syNew(P,'Alias',t,owner); a.vis=vis; syNameDecl(P,a);
  if(syEat(P,'for')) a.refs.target=[syQName(P)]; else syErr(P,_L('“for” expected in the alias'));
  if(syEat(P,'{')) syBody(P,a); else if(!syEat(P,';')) sySkip(P);
}

/** Dépendance « dependency [nom] [from] A, B to C, D ; ». @param {object} P @param {object} owner @param {string} vis @param {object} t */
function syDependency(P, owner, vis, t){
  const d=syNew(P,'Dependency',t,owner); d.vis=vis; d.keyword='dependency';
  if(syIs(P,'<')&&syPeek(P,1).t==='id'&&syIs(P,'>',2)){ syNext(P); d.shortName=syNext(P).v; syNext(P); }
  if(!syIs(P,'from')){ const save=P.p; syNameDecl(P,d); if(!syIs(P,'from')&&!syIs(P,',')&&!syIs(P,'to')){ } else if(!syIs(P,'from')){ P.p=save; d.name=''; d.shortName=''; } }
  syEat(P,'from');
  const list=()=>{ const l=[]; do{ const q=syQName(P); if(q) l.push(q); else break; } while(syEat(P,',')); return l; };
  d.refs.source=list();
  if(syEat(P,'to')) d.refs.target=list(); else syErr(P,_L('“to” expected in the dependency'));
  if(syEat(P,'{')) syBody(P,d); else if(!syEat(P,';')) sySkip(P);
  return d;
}

/** Usage de métadonnée « @Type [about …] { … } » ou « metadata [nom :] Type … ».
 * @param {object} P @param {object} owner @param {string} vis @param {object} t */
function syMetadataUsage(P, owner, vis, t){
  const m=syNew(P,'MetadataUsage',t,owner); m.vis=vis; m.keyword='metadata';
  const q=syQName(P);
  if(syIs(P,':')||syIs(P,'typed')||syIs(P,'defined')){ m.name=q; m.declaredName=true; if(syEat(P,':')){} else { syNext(P); syEat(P,'by'); } m.refs.typedBy=[syQName(P)]; }
  else m.refs.typedBy=[q];
  if(syEat(P,'about')){ m.refs.about=[]; do{ const r=syQName(P); if(r) m.refs.about.push(r); else break; } while(syEat(P,',')); }
  owner.meta.push(m.refs.typedBy[0]);
  if(syEat(P,'{')) syBody(P,m); else if(!syEat(P,';')) sySkip(P);
}

/** Lit une suite équilibrée « ( … ) » ou « [ … ] » (délimiteurs compris).
 * @param {object} P @param {string} o - Ouvrant @param {string} c - Fermant @returns {object[]} Lexèmes */
function syBalanced(P, o, c){
  const out=[]; let d=0;
  while(true){
    const t=syPeek(P); if(t.t==='eof') break;
    out.push(syNext(P));
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
function syKeyword(P, owner, k, mods, metaPfx){
  const v=k.t==='kw'?k.v:'';
  const prevOcc=owner._prev;
  // ── Successions « then » / « first » : relient le membre précédent au suivant ──
  if(v==='then'){
    syNext(P);
    if(sySimpleRef(P)){ const r=syQName(P); syEat(P,';'); sySuccession(P,owner,k,prevOcc,{ref:r}); owner._prev={ref:r}; return null; }
    // « then private action a … » : visibilité puis préfixes du membre visé (TargetSuccessionMember, §8.2.2.17)
    const tk=syPeek(P), mods2={}; let vis2='';
    if(tk.t==='kw'&&(tk.v==='public'||tk.v==='private'||tk.v==='protected')) vis2=syNext(P).v;
    while(syPeek(P).t==='kw'&&SY_PREFIX_KW.has(syPeek(P).v)) mods2[syNext(P).v]=true;
    const el=syKeyword(P, owner, syPeek(P), mods2);
    if(el){ Object.assign(el.mods,mods2); if(vis2) el.vis=vis2; sySuccession(P,owner,tk,prevOcc,{el}); owner._prev={el}; }
    return el;
  }
  if(v==='first'){
    syNext(P);
    const src=syQName(P);
    if(syEat(P,'then')){ const s=sySuccession(P,owner,k,{ref:src},null); s.ends[1]={ref:syQName(P)}; owner._prev={ref:s.ends[1].ref}; syHeaderTail(P,s); return null; }
    syEat(P,';'); owner._prev={ref:src}; return null;
  }
  if(v==='entry'&&(syIs(P,';',1))){ syNext(P); syNext(P); owner._prev={ref:'@entry'}; return null; }
  if((v==='if'||v==='else')&&prevOcc&&prevOcc.el&&prevOcc.el.kind==='DecisionNode'||(v==='if'||v==='else')&&syCondSuccession(P)){
    syNext(P);
    let guard='';
    if(v==='if'){ const g=[]; let d=0; while(true){ const t=syPeek(P); if(t.t==='eof') break; if(d===0&&t.t==='kw'&&t.v==='then') break; if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; if(t.t==='sym'&&(t.v===')'||t.v===']')) d--; if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) break; g.push(syNext(P)); } guard=syTokText(g); }
    else guard='else';
    if(syEat(P,'then')){
      if(sySimpleRef(P)){ const r=syQName(P); syEat(P,';'); const s=sySuccession(P,owner,k,prevOcc,{ref:r}); s.guard=guard; return null; }
      const tk=syPeek(P); const el=syKeyword(P,owner,tk,{}); if(el){ const s=sySuccession(P,owner,tk,prevOcc,{el}); s.guard=guard; }
      return el;
    }
    if(v==='else'){ // « else { … } » d'une action if : corps rattaché à l'action précédente
      if(syIs(P,'{')){ const target=prevOcc&&prevOcc.el||owner; syNext(P); syBody(P,target); return null; }
      if(syIs(P,'if')){ return syKeyword(P,owner,syPeek(P),{}); }
    }
    sySkip(P); return null;
  }
  // ── Transitions abrégées dans un état : « accept S [if g] [do a] then cible ; » après un état ──
  if(v==='accept'&&syInState(owner)&&prevOcc&&syHasThen(P)){
    syNext(P);
    const tr=syNew(P,'TransitionUsage',k,owner); tr.keyword='transition';
    tr.ends[0]=prevOcc.el?{el:prevOcc.el}:{ref:prevOcc.ref};
    syTransitionTail(P, tr, true);
    return tr;
  }
  if(v==='transition'){
    syNext(P);
    const tr=syNew(P,'TransitionUsage',k,owner); tr.keyword='transition';
    if(syAhead(P,'first')) syNameDecl(P,tr);
    if(syEat(P,'first')) tr.ends[0]={ref:syQName(P)};
    else if(syPeek(P).t==='id') tr.ends[0]={ref:syQName(P)};
    else if(prevOcc) tr.ends[0]=prevOcc.el?{el:prevOcc.el}:{ref:prevOcc.ref};
    syTransitionTail(P, tr, syIs(P,'accept'));
    return tr;
  }
  // ── Nœuds de contrôle ──
  const CTRL={fork:'ForkNode', join:'JoinNode', merge:'MergeNode', decide:'DecisionNode'};
  if(CTRL[v]){ syNext(P); const n=syNew(P,CTRL[v],k,owner); n.keyword=v; syNameDecl(P,n); syHeaderTail(P,n); owner._prev={el:n}; return n; }
  // ── Usages qui référencent un élément existant (perform, exhibit, include, satisfy, verify…) ──
  const REFKW={perform:['action','PerformActionUsage'], exhibit:['state','ExhibitStateUsage'], include:['use','IncludeUseCaseUsage'],
    satisfy:['requirement','SatisfyRequirementUsage'], verify:['requirement','VerifyRequirementUsage'], frame:['concern','ConcernUsage'],
    render:['rendering','RenderingUsage'], expose:['','Expose'], entry:['action','StateActionUsage'], do:['action','StateActionUsage'], exit:['action','StateActionUsage'],
    assume:['constraint','ConstraintUsage'], require:['constraint','ConstraintUsage'], event:['occurrence','EventOccurrenceUsage']};
  if(v==='assert'||(v==='not'&&syIs(P,'satisfy',1))){
    syNext(P); const neg=syEat(P,'not');
    if(syIs(P,'satisfy')){ const el=syKeyword(P,owner,syPeek(P),mods); if(el){ el.mods.assert=true; if(neg) el.mods.negated=true; } return el; }
    if(syIs(P,'not')){ syNext(P); }
    const ak=syPeek(P);
    if(ak.t==='kw'&&ak.v==='constraint'){ syNext(P); const el=syNew(P,'AssertConstraintUsage',ak,owner); el.keyword='assert constraint'; if(neg) el.mods.negated=true; syHeader(P,el); return el; }
    const el=syNew(P,'AssertConstraintUsage',ak,owner); el.keyword='assert'; if(neg) el.mods.negated=true;
    if(syPeek(P).t==='id'){ el.refs.subsets=[syQName(P)]; el.isRefUsage=true; syHeaderTail(P,el); } else syHeader(P,el);
    return el;
  }
  if(REFKW[v]){
    syNext(P);
    const [kw2, kind]=REFKW[v];
    let declared=false;
    if(v==='include'&&syIs(P,'use')){ syNext(P); syEat(P,'case'); declared=true; }
    else if(kw2&&syIs(P,kw2)){ syNext(P); declared=true; if(kw2==='occurrence'){} }
    else if(v==='event'&&syPeek(P).t==='kw'&&SY_KIND_KW[syPeek(P).v]){ return syKeyword(P,owner,syPeek(P),Object.assign(mods,{event:true})); }
    const el=syNew(P,kind,k,owner); el.keyword=v+(declared&&kw2?' '+(kw2==='use'?'use case':kw2):'');
    if(v==='entry'||v==='do'||v==='exit') el.stateRole=v;
    if(v==='assume'||v==='require') el.reqRole=v;
    if(v==='verify') el.reqRole='verify';
    if(v==='frame') el.reqRole='frame';
    if(v==='expose'){ el.refs.target=[syQName(P)]; if(syIs(P,'::')&&syIs(P,'*',1)){ syNext(P); syNext(P); el.star=true; if(syIs(P,'::')&&syIs(P,'**',1)){ syNext(P); syNext(P); el.recursive=true; } }
      else if(syIs(P,'::')&&syIs(P,'**',1)){ syNext(P); syNext(P); el.recursive=true; }
      if(syIs(P,'[')) el.filter=syTokText(syBalanced(P,'[',']'));
      el.name=(el.refs.target[0]||'')+(el.star?'::*':'')+(el.recursive?'::**':''); syHeaderTail(P,el);
      owner.imports=owner.imports||[]; owner.imports.push({target:el.refs.target[0], star:el.star||!el.recursive, recursive:el.recursive, vis:'public', importAll:true});
      return el; }
    if(!declared&&(syPeek(P).t==='id'||(syPeek(P).t==='kw'&&(syPeek(P).v==='start'||syPeek(P).v==='done'))||(syIs(P,'$')))){
      // Référence : « perform a.b ; », « satisfy R by S ; », « exhibit s ; »
      const r=syQName(P);
      if(r){ (el.refs[v==='satisfy'||v==='verify'?'requirement':'subsets']=[r]); el.isRefUsage=true; }
      syHeader(P, el, true);
    } else syHeader(P, el);
    if(v==='entry'||v==='do'||v==='exit'){ if(v!=='do') owner._prev={el}; }
    else if(SY_OCC_KINDS.has(kind)) owner._prev={el};
    return el;
  }
  // ── Rôles : subject, actor, stakeholder, objective, return ──
  const ROLE={subject:'ReferenceUsage', actor:'PartUsage', stakeholder:'PartUsage', objective:'RequirementUsage', return:'ReferenceUsage'};
  if(ROLE[v]){
    syNext(P);
    // Préfixes après le rôle : « return ref result[0..*] », « subject ref s »
    while(syPeek(P).t==='kw'&&SY_PREFIX_KW.has(syPeek(P).v)) mods[syNext(P).v]=true;
    const kk=syPeek(P);
    let el;
    if(kk.t==='kw'&&(SY_KIND_KW[kk.v]||kk.v==='use'||kk.v==='ref')) el=syKeyword(P,owner,kk,mods);
    else { el=syNew(P,ROLE[v],k,owner); el.keyword=v; syHeader(P,el); }
    if(el){ el.role=v; if(!el.keyword) el.keyword=v; }
    return el;
  }
  // ── Connecteurs abrégés : bind, connect, allocate, succession ──
  if(v==='bind'){ syNext(P); const el=syNew(P,'BindingConnectorAsUsage',k,owner); el.keyword='bind'; syBindTail(P,el); syHeaderTail(P,el); return el; }
  if(v==='binding'){ syNext(P); const el=syNew(P,'BindingConnectorAsUsage',k,owner); el.keyword='binding'; syHeader(P,el); return el; }
  if(v==='connect'){ const el=syNew(P,'ConnectionUsage',k,owner); el.keyword='connect'; syHeader(P,el); return el; }
  if(v==='allocate'){ const el=syNew(P,'AllocationUsage',k,owner); el.keyword='allocate'; syHeader(P,el); return el; }
  if(v==='succession'){
    syNext(P);
    if(syIs(P,'flow')){ syNext(P); const el=syNew(P,'SuccessionFlowUsage',k,owner); el.keyword='succession flow'; syHeader(P,el); return el; }
    const el=syNew(P,'SuccessionAsUsage',k,owner); el.keyword='succession'; syHeader(P,el); return el;
  }
  // ── Actions élémentaires : accept, send, assign, terminate, if, while, loop, for ──
  const ACT={accept:'AcceptActionUsage', send:'SendActionUsage', assign:'AssignmentActionUsage', terminate:'TerminateActionUsage',
    if:'IfActionUsage', while:'WhileLoopActionUsage', loop:'WhileLoopActionUsage', for:'ForLoopActionUsage'};
  if(ACT[v]){
    syNext(P);
    const el=syNew(P,ACT[v],k,owner); el.keyword=v;
    syActionTail(P, el, v);
    owner._prev={el};
    return el;
  }
  if(v==='until'){ syNext(P); sySkip(P); return null; }
  // ── Définitions et usages : « part def X », « part x : X », « use case », « analysis » … ──
  let base='', kwText='', p2=0;
  if(v==='use'&&syIs(P,'case',1)){ base='UseCase'; kwText='use case'; p2=2; }
  else if((v==='analysis'||v==='verification')&&syIs(P,'case',1)){ base=SY_KIND_KW[v]; kwText=v; p2=2; }
  else if(v==='event'&&syIs(P,'occurrence',1)){ base='EventOccurrence'; kwText='event occurrence'; p2=2; }
  else if(v==='enum'&&syIs(P,'def',1)){ base='Enumeration'; kwText='enum'; p2=1; }
  else if(SY_KIND_KW[v]){ base=SY_KIND_KW[v]; kwText=v; p2=1; }
  // « individual def X », « #service def X » : définition sans mot-clé de sorte (occurrence / mot-clé utilisateur)
  if(!base&&v==='def'){ base=mods.individual?'Occurrence':(metaPfx&&metaPfx.length?'Occurrence':'Occurrence'); kwText=mods.individual?'individual':(metaPfx&&metaPfx.length?'#'+metaPfx[metaPfx.length-1]:'occurrence'); p2=0; }
  if(base){
    for(let j=0;j<p2;j++) syNext(P);
    const isDef=syEat(P,'def');
    let kind=base+(isDef?'Definition':'Usage');
    if(v==='message'&&!isDef) kind='FlowUsage';
    if(mods.event&&!isDef) kind='EventOccurrenceUsage';
    if(v==='enum'&&!isDef) kind='EnumerationUsage';
    const el=syNew(P,kind,k,owner); el.isDef=isDef; el.keyword=kwText+(isDef?' def':'');
    if(v==='snapshot'||v==='timeslice') el.portion=v;
    if(v==='message') el.isMessage=true;
    syHeader(P, el);
    if(!isDef&&SY_OCC_KINDS.has(kind)&&(kind!=='PartUsage'&&kind!=='ItemUsage'&&kind!=='ConstraintUsage')) owner._prev={el};
    return el;
  }
  // ── « ref » seul, ou usage sans mot-clé : « x : T ; », « :>> masse = 900 [kg] ; », « red ; » (valeur d'énumération) ──
  if(mods.ref||mods.end||mods.in||mods.out||mods.inout||mods.variant||syUsageStart(P, owner)){
    const el=syNew(P, owner.kind==='EnumerationDefinition'&&!mods.ref?'EnumerationUsage':'ReferenceUsage', k, owner);
    el.keyword=mods.ref?'ref':mods.end?'end':'';
    if(el.kind==='EnumerationUsage') el.keyword='enum';
    syHeader(P, el);
    return el;
  }
  // ── Expression (corps d'une contrainte, d'un calcul, résultat) ──
  if(k.t==='kw'&&!['true','false','null','not','all','new','meta'].includes(k.v)&&!(k.v==='if')){
    syErr(P,_Lp('Unexpected keyword “{a}” here', { a: k.v }),k);
    sySkip(P); return null;
  }
  const t0=syPeek(P), ex=sySkip(P).filter(x=>!(x.t==='sym'&&x.v===';'));
  if(ex.length){ owner.exprs.push(syTokText(ex)); if(owner.debutExpr==null) owner.debutExpr=t0.o; }   // début du résultat : les membres créés vont avant
  return null;
}

/** Vrai si le lexème courant commence une simple référence suivie de « ; » (« then done; », « perform a.b; »).
 * @param {object} P @returns {boolean} */
function sySimpleRef(P){
  let k=0; const t=syPeek(P);
  if(t.t!=='id'&&!(t.t==='kw'&&(t.v==='start'||t.v==='done'))) return false;
  k=1;
  while((syIs(P,'::',k)||syIs(P,'.',k))&&syPeek(P,k+1).t==='id') k+=2;
  return syIs(P,';',k);
}
/** Vrai si le lexème courant commence une chaîne qualifiée (« a.b », « A::B ») : une référence et non un nom déclaré.
 * @param {object} P @returns {boolean} */
function syRefStart(P){ return syPeek(P).t==='id'&&(syIs(P,'::',1)||syIs(P,'.',1)); }
/** Vrai si le mot-clé w apparaît dans l'en-tête courant, avant « ; » ou « { ». @param {object} P @param {string} w @returns {boolean} */
function syAhead(P, w){
  for(let k=0, d=0;;k++){ const t=syPeek(P,k); if(t.t==='eof') return false;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    else if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) return false;
    else if(d===0&&t.t==='kw'&&t.v===w) return true; }
}
/** Vrai si l'en-tête courant contient « then » avant « ; » ou « { » (transition abrégée). @param {object} P @returns {boolean} */
function syHasThen(P){
  for(let k=0, d=0;;k++){ const t=syPeek(P,k); if(t.t==='eof') return false;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    else if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) return false;
    else if(d===0&&t.t==='kw'&&t.v==='then') return true; }
}
/** Vrai si « if g then x ; » est une succession conditionnelle (après un nœud de décision) et non une action if.
 * @param {object} P @returns {boolean} */
function syCondSuccession(P){
  for(let k=1, d=0;;k++){ const t=syPeek(P,k); if(t.t==='eof') return false;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    else if(d===0&&t.t==='sym'&&(t.v==='{'||t.v==='}'||t.v===';')) return false;
    else if(d===0&&t.t==='kw'&&t.v==='then') return true; }
}
/** Vrai si l'élément est un état (définition ou usage) : contexte des transitions abrégées. @param {object} el @returns {boolean} */
function syInState(el){ return el&&(el.kind==='StateDefinition'||el.kind==='StateUsage'||el.kind==='ExhibitStateUsage'); }
/** Vrai si le lexème courant commence un usage sans mot-clé (« x : T ; », « :>> m = 1 ; », « red ; »).
 * @param {object} P @param {object} owner @returns {boolean} */
function syUsageStart(P, owner){
  const t=syPeek(P);
  if(t.t==='sym'&&(t.v===':>>'||t.v===':>'||t.v===':'||t.v==='::>')) return true;
  if(t.t==='kw'&&(t.v==='redefines'||t.v==='subsets'||t.v==='references')) return true;
  if(t.t==='sym'&&t.v==='<'&&syPeek(P,1).t==='id'&&syIs(P,'>',2)) return true;
  if(t.t!=='id') return false;
  const n=syPeek(P,1);
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
function sySuccession(P, owner, tok, src, tgt){
  const s=syNew(P, syInState(owner)?'TransitionUsage':'SuccessionAsUsage', tok, owner);
  s.keyword=s.kind==='TransitionUsage'?'transition':'then'; s.implicit=true;
  s.ends=[src||{ref:'@prev'}, tgt||null];
  return s;
}

/** Fin d'une transition : « [accept déclencheur [via p]] [if garde] [do effet] then cible ».
 * @param {object} P @param {object} tr - Transition @param {boolean} acceptFirst - Le déclencheur suit directement */
function syTransitionTail(P, tr, acceptFirst){
  const until=stop=>{ const out=[]; let d=0; while(true){ const t=syPeek(P); if(t.t==='eof') break;
    if(t.t==='sym'&&(t.v==='('||t.v==='['||t.v==='{')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']'||t.v==='}')){ if(d===0) break; d--; }
    if(d===0&&((t.t==='kw'&&stop.includes(t.v))||(t.t==='sym'&&t.v===';'))) break; out.push(syNext(P)); } return out; };
  if(acceptFirst||syIs(P,'accept')){ syEat(P,'accept'); const tg=until(['if','do','then','via']); tr.trigger=syTokText(tg);
    // Déclencheur « accept T », « accept s : T » : type du signal (pas « accept at … », « after … », « when … »)
    let tt=tg, charge=null;
    // « accept s : T » : le paramètre s (payloadParameter) est un membre de la transition (« t.s » s'y résout)
    if(tt.length>2&&tt[0].t==='id'&&tt[1].t==='sym'&&tt[1].v===':'){
      charge=syNew(P,'ReferenceUsage',tt[0],tr); charge.keyword='accept'; charge.nameTok=tt[0]; charge.name=tt[0].v; charge.declaredName=true; charge.dir='in';
      tt=tt.slice(2); }
    if(tt.length&&tt.every(x=>x.t==='id'||(x.t==='sym'&&(x.v==='::'||x.v==='.')))){ tr.refs.trigger=[syRefOf(tt)]; if(charge) charge.refs.typedBy=[syRefOf(tt)]; }
    if(syEat(P,'via')) tr.via=syTokText(until(['if','do','then'])); }
  if(syEat(P,'if')) tr.guard=syTokText(until(['do','then']));
  if(syEat(P,'do')) tr.effect=syTokText(until(['then']));
  if(syEat(P,'then')) tr.ends[1]={ref:syQName(P)};
  syHeaderTail(P, tr);
}

/** Fin d'un « bind a = b ». @param {object} P @param {object} el */
function syBindTail(P, el){
  const a=syQName(P); syEat(P,'=');
  const b=syQName(P);
  el.ends=[{ref:a},{ref:b}];
}

/** Fin d'une action élémentaire (accept, send, assign, if, while, for…) : texte gardé, références utiles relevées, corps éventuel.
 * @param {object} P @param {object} el @param {string} v - Mot-clé */
function syActionTail(P, el, v){
  const hdr=[]; let d=0;
  while(true){ const t=syPeek(P); if(t.t==='eof') break;
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++; else if(t.t==='sym'&&(t.v===')'||t.v===']')) d--;
    if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) break;
    hdr.push(syNext(P)); }
  el.text=syTokText(hdr);
  // accept [nom :] T [via p] ; send x [via p] [to q] ; for x in e
  if(v==='accept'){
    let i=0; if(hdr[0]&&hdr[0].t==='id'&&hdr[1]&&hdr[1].t==='sym'&&hdr[1].v===':'){ el.nameTok=hdr[0]; el.name=hdr[0].v; el.declaredName=true; i=2; }
    const tt=[]; while(i<hdr.length&&!(hdr[i].t==='kw'&&['via','then','if','do','at','after','when'].includes(hdr[i].v))) tt.push(hdr[i++]);
    const trig=hdr[i]&&hdr[i].t==='kw'&&['at','after','when'].includes(hdr[i].v);
    if(tt.length===1&&tt[0].t==='id'&&trig&&!el.name){ el.nameTok=tt[0]; el.name=tt[0].v; el.declaredName=true; }
    else if(tt.length&&tt.every(x=>x.t==='id'||(x.t==='sym'&&(x.v==='::'||x.v==='.')))) el.refs.typedBy=[syRefOf(tt)];
    el.trigger=syTokText(tt);
    const vi=hdr.findIndex(x=>x.t==='kw'&&x.v==='via'); if(vi>=0) el.via=syTokText(hdr.slice(vi+1).filter((x,j,a)=>!a.slice(0,j+1).some(y=>y.t==='kw'&&y.v==='then')));
  }
  if(v==='send'){
    const ti=hdr.findIndex(x=>x.t==='kw'&&x.v==='to'), vi=hdr.findIndex(x=>x.t==='kw'&&x.v==='via');
    const end=[ti,vi].filter(x=>x>=0); el.payload=syTokText(hdr.slice(0,end.length?Math.min(...end):hdr.length));
    if(ti>=0) el.to=syTokText(hdr.slice(ti+1, vi>ti?vi:hdr.length)); if(vi>=0) el.via=syTokText(hdr.slice(vi+1, ti>vi?ti:hdr.length));
  }
  if(v==='if'||v==='while'||v==='loop'||v==='for') el.cond=el.text;
  if(syEat(P,'{')){ syBody(P, el);
    if(v==='loop'||v==='while'){ if(syIs(P,'until')){ syNext(P); el.until=syTokText(sySkip(P).filter(x=>!(x.t==='sym'&&x.v===';'))); } }
    if(v==='if'&&syIs(P,'else')){ syNext(P); if(syIs(P,'{')){ syNext(P); const e=syNew(P,'ActionUsage',syPeek(P),el); e.keyword='else'; e.name='else'; syBody(P,e); } else if(syIs(P,'if')){ const k=syPeek(P); syKeyword(P, el, k, {}); } }
  } else syEat(P,';');
}

/** En-tête générique d'une déclaration : « [<court>] [nom] [: T] [:> A] [:>> B] [::> C] [[m]] [= valeur] [clauses] » puis « ; » ou corps.
 * @param {object} P - État
 * @param {object} el - Élément en cours
 * @param {boolean} [noName] - Pas de nom à lire (la référence vient d'être lue)
 */
function syHeader(P, el, noName){
  if(!noName){
    if(syIs(P,'<')&&syPeek(P,1).t==='id'&&syIs(P,'>',2)){ syNext(P); el.shortName=syNext(P).v; syNext(P); }
    const t=syPeek(P);
    if(t.t==='id'&&!syIs(P,'::',1)&&!syIs(P,'.',1)&&!syIs(P,'to',1)){ el.nameTok=syPeek(P); el.name=syNext(P).v; el.declaredName=true; }
    else if(t.t==='id'&&(el.kind==='FlowUsage'||el.kind==='SuccessionFlowUsage'||el.kind==='ConnectionUsage'||el.kind==='InterfaceUsage'||el.kind==='AllocationUsage'||el.kind==='SuccessionAsUsage')){
      // « flow a.b to c.d ; » : la source vient directement
      el.ends[0]={ref:syQName(P)};
    }
  }
  syHeaderTail(P, el);
}

/** Suite d'un en-tête (relations, multiplicité, valeur, clauses) puis « ; » ou « { corps } ».
 * @param {object} P @param {object} el */
function syHeaderTail(P, el){
  const list=()=>{ const l=[]; do{ const conj=syEat(P,'~'); const q=syQName(P); if(q) l.push((conj?'~':'')+q); else break; } while(syEat(P,',')); return l; };
  const push=(k,l)=>{ if(l.length) (el.refs[k]=el.refs[k]||[]).push(...l); };
  let guard=0;
  while(guard++<200){
    const t=syPeek(P);
    if(t.t==='eof') break;
    if(t.t==='sym'&&t.v===';'){ syNext(P); break; }
    if(t.t==='sym'&&t.v==='{'){ syNext(P); syBody(P, el); break; }
    if(t.t==='sym'&&t.v==='}') break;
    if(t.t==='sym'&&t.v===':'){ syNext(P); const l=list(); if(l.some(x=>x[0]==='~')) el.conjugated=true; push('typedBy',l.map(x=>x.replace(/^~/,''))); continue; }
    if(t.t==='kw'&&(t.v==='defined'||t.v==='typed')&&syIs(P,'by',1)){ syNext(P); syNext(P); const l=list(); if(l.some(x=>x[0]==='~')) el.conjugated=true; push('typedBy',l.map(x=>x.replace(/^~/,''))); continue; }
    if((t.t==='sym'&&t.v===':>')||(t.t==='kw'&&(t.v==='specializes'||t.v==='subsets'))){ syNext(P); push(el.isDef?'specializes':'subsets', list()); continue; }
    if((t.t==='sym'&&t.v===':>>')||(t.t==='kw'&&t.v==='redefines')){ syNext(P); push('redefines', list()); continue; }
    if((t.t==='sym'&&t.v==='::>')||(t.t==='kw'&&t.v==='references')){ syNext(P); push('references', list()); continue; }
    if((t.t==='sym'&&t.v==='=>')||(t.t==='kw'&&t.v==='crosses')){ syNext(P); push('crosses', list()); continue; }
    if(t.t==='kw'&&(t.v==='ordered'||t.v==='nonunique')){ el.mods[syNext(P).v]=true; continue; }
    if(t.t==='sym'&&t.v==='['&&!el.value){ el.mult=syTokText(syBalanced(P,'[',']')).replace(/\s/g,''); continue; }
    if((t.t==='sym'&&(t.v==='='||t.v===':='))||(t.t==='kw'&&t.v==='default')){
      const kind=syNext(P).v; if(kind==='default'){ el.valueKind='default'; if(syIs(P,'=')||syIs(P,':=')) syNext(P); } else el.valueKind=kind;
      el.value=syTokText(syUntilClause(P, ['connect','from','to','then','do','if','via','about','by','allocate','bind','first'], true)); continue; }
    if(t.t==='kw'&&t.v==='connect'){ syNext(P); syConnectEnds(P, el); continue; }
    if(t.t==='kw'&&t.v==='allocate'){ syNext(P); if(el.kind!=='AllocationUsage'&&el.kind!=='AllocationDefinition'){} syConnectEnds(P, el); continue; }
    if(t.t==='kw'&&t.v==='bind'){ syNext(P); syBindTail(P, el); continue; }
    if(t.t==='kw'&&t.v==='of'){ syNext(P); const save=P.p; const q=syQName(P);
      if(syIs(P,':')){ syNext(P); el.itemName=q; el.refs.item=[syQName(P)]; } else if(q) el.refs.item=[q]; else P.p=save;
      if(syIs(P,'[')) el.itemMult=syTokText(syBalanced(P,'[',']'));
      continue; }
    if(t.t==='kw'&&t.v==='from'){ syNext(P); el.ends[0]={ref:syQName(P)}; continue; }
    if(t.t==='kw'&&t.v==='to'){ syNext(P);
      if(el.kind==='SendActionUsage'||el.kind==='SendActionUsage') { el.to=syTokText(syUntilClause(P,['via'])); continue; }
      el.ends[1]={ref:syQName(P)}; continue; }
    if(t.t==='kw'&&t.v==='by'){ syNext(P); el.refs.by=[syQName(P)]; continue; }
    if(t.t==='kw'&&t.v==='first'){ syNext(P); if(syIs(P,'[')) syBalanced(P,'[',']'); el.ends[0]={ref:syQName(P)}; continue; }
    if(t.t==='kw'&&t.v==='then'){ syNext(P); if(syIs(P,'[')) syBalanced(P,'[',']'); if(el.kind==='TransitionUsage'||el.kind==='SuccessionAsUsage'||el.kind==='SuccessionFlowUsage'||el.kind==='ConnectionUsage') el.ends[1]={ref:syQName(P)}; else { el.thenRef=syQName(P); } continue; }
    if(t.t==='kw'&&t.v==='about'){ syNext(P); push('about', list()); continue; }
    if(t.t==='kw'&&t.v==='accept'&&el.kind==='TransitionUsage'){ syTransitionTail(P, el, true); break; }
    // « action a accept s : T [via p] » (AcceptActionUsage nommée) : la charge s (payloadParameter) est un membre de l'action
    // (« a.s » s'y résout, comme pour une transition)
    if(t.t==='kw'&&t.v==='accept'&&el.kind==='ActionUsage'){ syNext(P); const tg=syUntilClause(P,['via','then','if','do']); el.trigger=syTokText(tg);
      let tt=tg;
      if(tt.length>2&&tt[0].t==='id'&&tt[1].t==='sym'&&tt[1].v===':'){
        const c=syNew(P,'ReferenceUsage',tt[0],el); c.keyword='accept'; c.nameTok=tt[0]; c.name=tt[0].v; c.declaredName=true; c.dir='in'; tt=tt.slice(2);
        if(tt.length&&tt.every(x=>x.t==='id'||(x.t==='sym'&&(x.v==='::'||x.v==='.')))) c.refs.typedBy=[syRefOf(tt)]; }
      else if(tt.length&&tt.every(x=>x.t==='id'||(x.t==='sym'&&(x.v==='::'||x.v==='.')))) el.refs.trigger=[syRefOf(tt)];
      if(syEat(P,'via')) el.via=syQName(P);
      continue; }
    if(t.t==='kw'&&(t.v==='if'||t.v==='do')&&el.kind==='TransitionUsage'){ syTransitionTail(P, el, false); break; }
    if(t.t==='kw'&&t.v==='if'&&/Succession/.test(el.kind)){ syNext(P); el.guard=syTokText(syUntilClause(P,['then'])); continue; }
    if(t.t==='kw'&&t.v==='via'){ syNext(P); el.via=syQName(P); continue; }
    if(t.t==='kw'&&(t.v==='for'||t.v==='chains'||t.v==='inverse'||t.v==='featured'||t.v==='disjoint')){ syNext(P); continue; }
    if(t.t==='sym'&&t.v==='~'){ syNext(P); el.conjugated=true; continue; }
    if(t.t==='sym'&&t.v==='#'){ syNext(P); const q=syQName(P); if(q){ el.meta.push(q); el.metaPfx.push(q); } continue; }
    if(t.t==='cmt'){ const c=syNew(P,'Comment',t,el); c.body=syNext(P).v; continue; }
    if(t.t==='id'&&!el.name&&!el.declaredName&&!syIs(P,'::',1)&&!syIs(P,'.',1)){ el.nameTok=syPeek(P); el.name=syNext(P).v; el.declaredName=true; continue; }
    // Autre lexème : partie d'une expression non structurée (gardée comme texte)
    const ex=syUntilClause(P, ['connect','from','to','then','do','if','via','about','by','allocate','bind','first']);
    if(!ex.length){ syErr(P,_Lp('Unexpected token “{a}” in the declaration', { a: t.v }),t); sySkip(P); break; }
    el.rest=((el.rest?el.rest+' ':'')+syTokText(ex));
  }
}

/** Lit une expression jusqu'à « ; », « { », « } » ou un mot-clé de clause (au niveau 0 des parenthèses).
 * Valeur (valeur) : « if c ? a else b » est une expression conditionnelle (KerML §8.2.5.8.2), pas une clause « if »,
 * quand « if » ouvre l'expression ou suit un opérateur.
 * @param {object} P @param {string[]} stops - Mots-clés d'arrêt @param {boolean} [valeur] @returns {object[]} Lexèmes */
function syUntilClause(P, stops, valeur){
  const out=[]; let d=0;
  while(true){
    const t=syPeek(P); if(t.t==='eof') break;
    const prec=out[out.length-1];
    if(valeur&&d===0&&t.t==='kw'&&t.v==='if'&&(!prec||(prec.t==='sym'&&prec.v!==')'&&prec.v!==']')||(prec.t==='kw'&&SY_OPERATEURS_KW.has(prec.v)))){ out.push(syNext(P)); continue; }
    if(t.t==='sym'&&(t.v==='('||t.v==='[')) d++;
    else if(t.t==='sym'&&(t.v===')'||t.v===']')){ if(d===0) break; d--; }
    else if(d===0&&t.t==='sym'&&(t.v===';'||t.v==='{'||t.v==='}')) break;
    else if(d===0&&t.t==='kw'&&stops.includes(t.v)) break;
    else if(t.t==='sym'&&t.v==='{'){ out.push(...syBalanced(P,'{','}')); continue; }
    out.push(syNext(P));
  }
  return out;
}

/** Extrémités d'une connexion : « a to b » ou « ( e1 ::> a, e2 ::> b, … ) ».
 * @param {object} P @param {object} el */
function syConnectEnds(P, el){
  if(syIs(P,'(')){
    const toks=syBalanced(P,'(',')').slice(1,-1);
    const parts=[[]]; let d=0;
    toks.forEach(x=>{ if(x.t==='sym'&&(x.v==='('||x.v==='[')) d++; if(x.t==='sym'&&(x.v===')'||x.v===']')) d--; if(d===0&&x.t==='sym'&&x.v===',') parts.push([]); else parts[parts.length-1].push(x); });
    el.ends=parts.filter(p=>p.length).map(p=>{
      const i=p.findIndex(x=>x.t==='sym'&&(x.v==='::>'||x.v==='=>')||x.t==='kw'&&(x.v==='references'||x.v==='crosses'));
      const r=i>=0?p.slice(i+1):p;
      const ri=r.findIndex(x=>x.t==='sym'&&x.v==='['); return {ref:syRefOf(ri>=0?r.slice(0,ri):r), endName:i>0&&p[0].t==='id'?p[0].v:''};
    });
    return;
  }
  const endOf=()=>{ let endName=''; if(syIs(P,'[')) syBalanced(P,'[',']'); if(syPeek(P).t==='id'&&(syIs(P,'::>',1)||syIs(P,'references',1)||syIs(P,'=>',1))){ endName=syNext(P).v; syNext(P); } const r=syQName(P); if(syIs(P,'[')) syBalanced(P,'[',']'); return {ref:r, endName}; };
  const a=endOf();
  if(syEat(P,'to')) el.ends=[a, endOf()]; else el.ends=[a];
}

/* ── Résolution des noms (KerML §8.2.3.5) ──────────────────────────────────────────────────────────── */

/**
 * Construit un modèle SysML à partir de plusieurs fichiers : analyse, effective des noms (redéfinitions), index des membres,
 * résolution des références (typage, spécialisation, extrémités, satisfy…), successions implicites, puis contrôles.
 * @param {{path:string, text:string}[]} files - Fichiers .sysml du projet
 * @returns {{files:object[], all:object[], diags:object[], lib:Set}} Modèle
 */
function syBuildModel(files){
  const M={files:[], all:[], diags:[], libUsed:new Set()};
  (files||[]).forEach(f=>{
    const r=syParse(f.text, f.path);
    M.files.push({path:f.path, text:f.text, root:r.root});
    M.all.push(...r.all); M.diags.push(...r.diags);
  });
  // Nom effectif d'une redéfinition sans nom (« attribute :>> masse » s'appelle masse)
  M.all.forEach(el=>{
    if(!el.name&&el.refs.redefines&&el.refs.redefines.length) el.name=(sySegmentsRef(el.refs.redefines[0]).pop()||{n:''}).n;
    if(!el.name&&el.isRefUsage&&el.refs.subsets&&el.refs.subsets.length&&el.kind!=='SatisfyRequirementUsage') el.name=(sySegmentsRef(el.refs.subsets[0]).pop()||{n:''}).n;
    if(!el.name&&el.kind==='SatisfyRequirementUsage'&&el.refs.requirement) el.name=(sySegmentsRef(el.refs.requirement[0]).pop()||{n:''}).n;
    if(!el.name&&el.kind==='VerifyRequirementUsage'&&el.refs.requirement) el.name=(sySegmentsRef(el.refs.requirement[0]).pop()||{n:''}).n;
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
  // Modèle retrouvé depuis la racine d'un fichier (sans être énuméré) : noms déjà employés plus bas dans la hiérarchie
  M.files.forEach(f=>Object.defineProperty(f.root,'M',{value:M, configurable:true}));
  syResolveAll(M);
  syChecks(M);
  return M;
}

/** Vrai si un paquetage de la bibliothèque standard porte ce nom (index embarqué, 57-sysml-bibliotheque.js).
 * @param {string} n @returns {boolean} */
function syLibHas(n){ return typeof SY_LIB!=='undefined'&&Object.prototype.hasOwnProperty.call(SY_LIB,n); }
/** Membres connus d'un paquetage de la bibliothèque standard (Set de noms), ou null.
 * @param {string} pkg - Nom du paquetage @returns {Set|null} */
function syLibMembers(pkg, seen){
  if(!syLibHas(pkg)) return null;
  const v=SY_LIB[pkg]; if(v instanceof Set) return v;
  seen=seen||new Set(); if(seen.has(pkg)) return new Set(); seen.add(pkg);
  const s=new Set();
  String(v).split(' ').forEach(n=>{ if(n[0]==='@'){ const m=syLibMembers(n.slice(1), seen); if(m) m.forEach(x=>s.add(x)); } else if(n) s.add(n); });
  return (SY_LIB[pkg]=s);
}

/** Généraux d'un élément (types, spécialisations, sous-ensembles, redéfinitions, références) déjà résolus dans le projet.
 * @param {object} M @param {object} el @returns {object[]} */
function syGenerals(M, el){
  const out=[];
  ['typedBy','specializes','subsets','redefines','references'].forEach(k=>{
    if(!el.refs[k]) return;
    if(!el.res[k]) el.res[k]=el.refs[k].map(r=>syResolveSelf(M, r, el));
    el.res[k].forEach(x=>{ if(x&&x.el) out.push(x.el); });
  });
  return out;
}

/** Recherche « locale » d'un nom dans un espace de noms : membres possédés, alias, membres hérités, imports.
 * @param {object} M - Modèle @param {object} ns - Espace de noms @param {string} name - Nom
 * @param {Set} seen - Espaces déjà visités (imports et spécialisations circulaires) @param {boolean} [visible] - Résolution « visible » seulement
 * @param {object} [self] - Élément à ignorer (une redéfinition ne se résout pas vers elle-même)
 * @param {boolean} [type] - Référence qui ne vise pas un paquetage (typage, spécialisation, extrémité…) : entre deux homonymes,
 *   l'élément qui n'est pas un paquetage l'emporte (paquetage « Drone » et « part def Drone » importés par « P::** »)
 * @returns {object|null} {el} | {lib:'Pkg::nom'} | null */
function syLocal(M, ns, name, seen, visible, self, type){
  if(!ns||seen.has(ns)) return null;
  seen.add(ns);
  const own=(ns.mem&&ns.mem.get(name)||[]).filter(m=>m!==self&&(!visible||m.vis!=='private'));
  if(own.length){
    const m=(type&&own.find(x=>!syEstPaquetage(x)))||own[0];
    if(m.kind==='Alias'){ const t=(m.refs.target||[])[0]; if(t) return syResolve(M, t, ns, null, 'alias'); }
    return {el:m, n:own.length};
  }
  // Membres hérités (types, spécialisations…)
  if(ns.kind!=='Package'&&ns.kind!=='Namespace'&&ns.kind!=='LibraryPackage'){
    for(const g of syGenerals(M, ns)){ const r=syLocal(M, g, name, seen, true, self, type); if(r) return r; }
  }
  // Imports
  for(const im of ns.imports||[]){
    if(visible&&im.vis==='private') continue;
    const tgt=im.target||''; if(!tgt) continue;
    if(im.star||im.recursive){
      const T=syResolve(M, tgt, ns, null, 'import');
      if(T&&T.el){
        const r=syLocal(M, T.el, name, seen, !im.importAll, self, type);
        if(r&&!(type&&im.recursive&&r.el&&syEstPaquetage(r.el))) return r;
        if(im.recursive){ const d=syDeep(T.el, name, new Set(), type); if(d) return {el:d}; }
        if(r) return r;
      } else if(T&&T.lib){
        const pk=T.lib, mems=syLibMembers(pk);
        if(mems&&mems.has(name)) return {lib:syLibHas(pk+'::'+name)?pk+'::'+name:syLibHas(name)?name:pk+'::'+name};
        if(!mems) return null;
      } else if(!T){ ns._unknownImport=true; }
    } else {
      const last=tgt.split('::').pop();
      if(last===name) return syResolve(M, tgt, ns, null, 'import');
    }
  }
  return null;
}

/** Vrai si l'élément (ou l'un de ses généraux du projet) a un général dans la bibliothèque standard (ShapeItems::Box…) :
 * ses membres hérités ne sont pas connus en détail, un nom introuvable n'y est donc pas une erreur.
 * @param {object} M @param {object} el @returns {boolean} */
function syHasLibGeneral(M, el){
  if(el._libGen!==undefined) return el._libGen;
  el._libGen=false;
  const seen=new Set(), st=[el];
  while(st.length){ const x=st.pop(); if(seen.has(x)) continue; seen.add(x);
    syGenerals(M, x);
    for(const k of ['typedBy','specializes','subsets','redefines','references']) (x.res[k]||[]).forEach(r=>{ if(r&&r.lib&&!r.inherited) el._libGen=true; if(r&&(r.unchecked)) el._libGen=true; if(r&&r.el) st.push(r.el); });
  }
  return el._libGen;
}

/** Recherche récursive d'un nom dans toute la descendance d'un espace de noms (import « ::** »).
 * @param {object} ns @param {string} name @param {Set} seen @param {boolean} [type] - Paquetages ignorés (voir syLocal)
 * @returns {object|null} */
function syDeep(ns, name, seen, type){
  if(seen.has(ns)) return null; seen.add(ns);
  for(const m of ns.members){ if(m.name===name&&m.declaredName&&!(type&&syEstPaquetage(m))) return m; }
  for(const m of ns.members){ if(m.members.length){ const r=syDeep(m, name, seen, type); if(r) return r; } }
  return null;
}

/** Vrai pour un paquetage (ou paquetage de bibliothèque). @param {object} el @returns {boolean} */
function syEstPaquetage(el){ return el.kind==='Package'||el.kind==='LibraryPackage'; }

/** Membre visible d'un élément, en suivant ses types (pour « a.b » : b est cherché parmi les membres de a et de ses types).
 * @param {object} M @param {object} el @param {string} name @returns {object|null} */
function syFeature(M, el, name){
  const r=syLocal(M, el, name, new Set(), false, null);
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
function syResolve(M, ref, ctx, self, why){
  ref=String(ref||'').replace(/^~/,'');
  if(!ref) return null;
  if(ref==='@entry') return {pseudo:'entry'};
  const rid=x=>x?(x._rid||(x._rid=++M.ridSeq)):0;
  const key=rid(ctx)+'|'+ref+'|'+rid(self)+(why==='rel'?'|t':'');
  if(M.cache.has(key)) return M.cache.get(key);
  M.cache.set(key, null);   // garde contre les boucles
  const segs=sySegmentsRef(ref);
  let cur=null;
  for(let i=0;i<segs.length;i++){
    const s=segs[i];
    if(i===0){
      if(s.sep==='$::'){ const g=M.global.get(s.n); cur=g?{el:g[0]}:syLibHas(s.n)?{lib:s.n}:null; }
      else {
        for(let ns=ctx; ns&&!cur; ns=ns.owner) cur=syLocal(M, ns, s.n, new Set(), false, self, why==='rel'&&segs.length===1);
        if(!cur){ const g=M.global.get(s.n); if(g) cur={el:g[0]}; }
        if(!cur&&syLibHas(s.n)) cur={lib:s.n};
        if(!cur&&(s.n==='start'||s.n==='done')&&segs.length===1) cur={pseudo:s.n};
        if(!cur&&(s.n==='self'||s.n==='that')&&segs.length>1) cur={el:ctx};
        // Membre hérité d'une base implicite (Parts::Part, Actions::Action…) ou d'un type de la bibliothèque
        if(!cur&&typeof SY_LIB_FEATURES!=='undefined'&&SY_LIB_FEATURES.has(s.n)) cur={lib:'*::'+s.n, inherited:true};
        if(!cur){ for(let ns=ctx; ns&&!cur; ns=ns.owner) if(syHasLibGeneral(M, ns)) cur={lib:'*::'+s.n, unchecked:true}; }
      }
    } else if(cur&&cur.el){
      const base=cur.el;
      cur=s.sep==='.'?syFeature(M, base, s.n):syLocal(M, base, s.n, new Set(), true, null, why==='rel'&&i===segs.length-1);
      if(!cur&&base.kind!=='Package'&&base.kind!=='LibraryPackage'){
        if(typeof SY_LIB_FEATURES!=='undefined'&&SY_LIB_FEATURES.has(s.n)) cur={lib:'*::'+s.n, inherited:true};
        else if(syHasLibGeneral(M, base)) cur={lib:'*::'+s.n, unchecked:true};
      }
    } else if(cur&&cur.lib){
      // Dans la bibliothèque : membres connus pour un paquetage (« ISQ::mass »), non vérifiés au-delà (« Actions::Action::start »)
      const pkg=syLibHas(cur.lib)?cur.lib:null, mems=pkg&&s.sep==='::'?syLibMembers(pkg):null;
      if(mems&&!mems.has(s.n)) cur={libMissing:cur.lib+'::'+s.n};
      else { const np=cur.lib+(s.sep==='.'?'.':'::')+s.n; cur={lib:syLibHas(np)?np:(mems&&syLibHas(s.n)?s.n:np), unchecked:!mems}; }
    }
    if(!cur||cur.libMissing) break;
  }
  if(cur&&cur.libMissing) cur=null;
  // « A::B » introuvable par le A le plus proche (« part def Domain » importé par « Domain::* » masque le paquetage
  // global Domain) : repris depuis l'espace global, comme le pressentait l'auteur (lecture tolérante)
  if(!cur&&segs.length>1&&segs[0].sep!=='$::'&&M.global.has(segs[0].n)) cur=syResolve(M, '$::'+ref, ctx, self, why);
  if(cur&&cur.lib) M.libUsed.add(cur.lib.split(/::|\./)[0]);
  M.cache.set(key, cur);
  return cur;
}

/** Résout une référence portée par un élément depuis son propriétaire, en ignorant d'abord l'élément lui-même (une
 * redéfinition ou un « perform a.b » porte le nom de ce qu'il vise), puis en l'admettant (« ref p :> p.x », « part p4 :> p4 »).
 * @param {object} M @param {string} ref @param {object} el @returns {object|null} */
function syResolveSelf(M, ref, el){
  return syResolve(M, ref, el.owner||el, el, 'rel')||syResolve(M, ref, el.owner||el, null, 'rel');
}

/** Résout toutes les références de tous les éléments, relie les successions implicites et note les références introuvables.
 * @param {object} M - Modèle */
function syResolveAll(M){
  const miss=(el, ref)=>{
    let unknownImport=false; for(let ns=el; ns; ns=ns.owner) if(ns._unknownImport) unknownImport=true;
    M.diags.push({severity:unknownImport?'warning':'error', code:'R-INTROUVABLE', message:unknownImport?_Lp('Name “{a}” not found (perhaps defined in an imported package missing from the project)', { a: ref }):_Lp('Name “{a}” not found', { a: ref }), line:el.line, column:el.col, file:el.file, el, ref});
  };
  M.all.forEach(el=>{
    Object.keys(el.refs).forEach(k=>{
      if(!el.res[k]) el.res[k]=el.refs[k].map(r=>syResolveSelf(M, r, el));
      el.res[k].forEach((x,i)=>{ if(!x) miss(el, el.refs[k][i]); });
    });
    el.ends.forEach((e,i)=>{
      if(!e) return;
      if(e.el){ e.res={el:e.el}; return; }
      if(e.ref==='@prev'){ e.res=null; return; }
      e.res=syResolve(M, e.ref, el.owner||el, null, 'end');
      if(!e.res&&e.ref) miss(el, e.ref);
    });
    // Métadonnées en préfixe (#Securite, #Capella::LogicalComponent) : résolues comme les autres références
    if(el.metaPfx.length){ el.res.metaPfx=el.metaPfx.map(r=>syResolveSelf(M, r, el)); el.res.metaPfx.forEach((x,i)=>{ if(!x) miss(el, el.metaPfx[i]); }); }
    if(el.kind==='Import'&&el.target){ el.res.target=[syResolve(M, el.target, el.owner, null, 'import')]; if(!el.res.target[0]) miss(el, el.target); }
  });
}

/** Élément du projet visé par une référence résolue, ou null. @param {object} r @returns {object|null} */
function syEl(r){ return r&&r.el||null; }

/** Libellé lisible d'une référence résolue ou non (nom qualifié de l'élément, nom de bibliothèque, texte écrit).
 * @param {object} r - Résultat de syResolve @param {string} [written] - Texte écrit @returns {string} */
function syRefLabel(r, written){
  if(r&&r.el) return syQualified(r.el);
  if(r&&r.lib) return r.lib;
  if(r&&r.pseudo) return r.pseudo;
  return written||'?';
}

/** Nom qualifié d'un élément (« Paquetage::Partie::membre »), sans l'espace de noms du fichier.
 * @param {object} el @returns {string} */
function syQualified(el){
  const parts=[];
  for(let e=el; e&&!e.isFileRoot; e=e.owner) parts.unshift(e.name?syQuote(e.name):e.shortName?'<'+syQuote(e.shortName)+'>':'('+(e.keyword||e.kind)+')');
  return parts.join('::');
}

/** Métaclasses de définition acceptées comme type de chaque sorte d'usage (validate…UsageDefinition, clause 8.3). */
const SY_TYPING={
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
function syChecks(M){
  const add=(sev, code, msg, el)=>M.diags.push({severity:sev, code, message:msg, line:el.line, column:el.col, file:el.file, el});
  M.all.forEach(el=>{
    // 1. Doublons de noms dans un même espace de noms
    if(el.mem) el.mem.forEach((l,n)=>{ const d=[...new Set(l.filter(x=>x.declaredName&&x.name===n&&x.kind!=='Alias'))]; if(d.length>1) add('error','V-DOUBLON',_Lp('Name “{a}” declared {b} times in “{c}”', { a: n, b: d.length, c: el.name||el.file }), d[1]); });
    // 1 bis. Nom court égal au nom ou au nom court d'un autre membre (« Duplicate of other owned member name »)
    if(el.members&&el.members.some(m=>m.shortName)){
      const vus=new Map();
      for(const m of el.members) for(const n of new Set([m.shortName,m.declaredName&&m.name].filter(Boolean))){
        const autre=vus.get(n);
        if(autre&&autre!==m&&(m.shortName===n||autre.shortName===n)) add('warning','V-DOUBLON-COURT',_Lp('Short name “{a}” already used in “{b}”', { a: n, b: el.name||el.file }), m);
        else if(!autre) vus.set(n,m);
      }
    }
    // 2. Multiplicité incohérente [3..1]
    if(el.mult){ const m=/^\[(\d+)\.\.(\d+)\]$/.exec(el.mult); if(m&&+m[1]>+m[2]) add('error','V-MULTIPLICITE',_Lp('Multiplicity {a}: the lower bound exceeds the upper bound', { a: el.mult }), el); }
    // 3. Typage incompatible (usage typé par une définition d'une autre sorte)
    const allowed=SY_TYPING[el.kind];
    if(allowed&&el.res.typedBy) el.res.typedBy.forEach((r,i)=>{
      const T=syEl(r); if(!T) return;
      if(!T.isDef&&T.kind!=='Alias') add('error','V-TYPAGE',_Lp('“{a}” is typed by “{b}”, which is not a definition ({c})', { a: el.name||el.keyword, b: T.name, c: T.kind }), el);
      else if(T.isDef&&!allowed.includes(T.kind)) add('error','V-TYPAGE',_Lp('{a} “{b}” typed by {c} “{d}”: incompatible type (expected: {e})', { a: el.keyword||el.kind, b: el.name, c: T.keyword, d: T.name, e: allowed.map(syKindKeyword).join(', ') }), el);
    });
    // 4. Spécialisation entre définitions de sortes différentes (part def :> attribute def…)
    if(el.isDef&&el.kind!=='OccurrenceDefinition'&&el.res.specializes) el.res.specializes.forEach(r=>{ const T=syEl(r); if(T&&T.isDef&&T.kind!==el.kind&&T.kind!=='OccurrenceDefinition'&&!sySubKind(el.kind,T.kind)) add('warning','V-SPECIALISATION',_Lp('{a} “{b}” specializes {c} “{d}” (different metaclasses)', { a: el.keyword, b: el.name, c: T.keyword, d: T.name }), el); });
    // 4 bis. Métadonnée en préfixe qui n'est pas une définition de métadonnée
    (el.res.metaPfx||[]).forEach((r,i)=>{ const T=syEl(r); if(T&&T.kind!=='MetadataDefinition'&&T.kind!=='Alias') add('error','V-TYPAGE',_Lp('“#{a}” does not designate a metadata definition ({b})', { a: el.metaPfx[i], b: T.kind }), el); });
    // 5. Usage de port hors d'une définition ou d'un usage (ports au niveau d'un paquetage)
    if(el.kind==='PortUsage'&&el.owner&&(el.owner.kind==='Package'||el.owner.isFileRoot)) add('warning','V-PORT-PAQUETAGE',_Lp('Port “{a}” declared directly in a package', { a: el.name }), el);
    // Règles relevées par l'épreuve de l'implémentation de référence (S.8)
    // 6. Sujet d'un cas ou d'une exigence : premier paramètre (validateCaseUsageSubjectParameterPosition et apparentées) ;
    //    les acteurs et les parties prenantes sont des paramètres
    if(/^(Case|UseCase|AnalysisCase|VerificationCase|Requirement|Concern|Viewpoint)(Definition|Usage)$/.test(el.kind)){
      const params=el.members.filter(m=>m.dir||['subject','actor','stakeholder'].includes(m.role));
      if(params.length&&params[0].role!=='subject') add('error','V-SUJET',_Lp('“{a}”: the subject must be the first parameter (“subject;” before actors and parameters)', { a: el.name||el.keyword }), params[0]);
    }
    // 7. Usages d'une définition de port : ports ou usages référentiels (validatePortDefinitionOwnedUsagesNotComposite)
    if(el.owner&&el.owner.kind==='PortDefinition'&&/Usage$/.test(el.kind)&&!['PortUsage','AttributeUsage','ReferenceUsage','EnumerationUsage','MetadataUsage'].includes(el.kind)&&!el.mods.ref&&!el.dir)
      add('error','V-PORT-COMPOSITE',_Lp('“{a}”: in a port definition, a usage other than a port must be referential (ref, in, out)', { a: el.name||el.keyword }), el);
    // 8. Définition de connexion ou d'interface concrète : au moins deux extrémités (validateAssociationRelatedTypes),
    //    sauf si elle les hérite d'une définition spécialisée
    if((el.kind==='ConnectionDefinition'||el.kind==='InterfaceDefinition')&&!el.mods.abstract&&!(el.refs.specializes||[]).length&&el.members.filter(m=>m.mods.end).length<2)
      add('error','V-EXTREMITES',_Lp('{a} “{b}”: at least two ends (end) are required, unless the definition is abstract', { a: el.keyword, b: el.name }), el);
  });
}

/** Vrai si une métaclasse de définition peut en spécialiser une autre (ex. InterfaceDefinition :> ConnectionDefinition).
 * @param {string} a @param {string} b @returns {boolean} */
function sySubKind(a, b){
  const SUP={InterfaceDefinition:['ConnectionDefinition','PartDefinition','ItemDefinition'], ConnectionDefinition:['PartDefinition','ItemDefinition'], AllocationDefinition:['ConnectionDefinition','PartDefinition','ItemDefinition'],
    FlowDefinition:['ActionDefinition','ConnectionDefinition'], PartDefinition:['ItemDefinition','OccurrenceDefinition'], ItemDefinition:['OccurrenceDefinition'], PortDefinition:['OccurrenceDefinition'],
    ActionDefinition:['OccurrenceDefinition'], StateDefinition:['ActionDefinition','OccurrenceDefinition'], CalculationDefinition:['ActionDefinition','OccurrenceDefinition'],
    CaseDefinition:['CalculationDefinition','ActionDefinition'], AnalysisCaseDefinition:['CaseDefinition','CalculationDefinition','ActionDefinition'], VerificationCaseDefinition:['CaseDefinition','CalculationDefinition','ActionDefinition'],
    UseCaseDefinition:['CaseDefinition','CalculationDefinition','ActionDefinition'], RequirementDefinition:['ConstraintDefinition'], ConcernDefinition:['RequirementDefinition','ConstraintDefinition'],
    EnumerationDefinition:['AttributeDefinition'], ViewpointDefinition:['RequirementDefinition','ConstraintDefinition'], MetadataDefinition:['ItemDefinition'], RenderingDefinition:['PartDefinition','ItemDefinition'], ViewDefinition:['PartDefinition','ItemDefinition']};
  return (SUP[a]||[]).includes(b);
}

/** Vrai si la définition a spécialise b (directement ou non). @param {object} M @param {object} a @param {object} b @returns {boolean} */
function sySpecializesEl(M, a, b){
  const seen=new Set(), st=[a];
  while(st.length){ const x=st.pop(); if(x===b) return true; if(seen.has(x)) continue; seen.add(x); syGenerals(M,x).forEach(g=>st.push(g)); }
  return false;
}

/** Mot-clé SysML d'une métaclasse (« PartDefinition » → « part def »). @param {string} kind @returns {string} */
function syKindKeyword(kind){
  const m=/^(.*?)(Definition|Usage)$/.exec(kind||''); if(!m) return kind;
  const base={Part:'part',Item:'item',Attribute:'attribute',Port:'port',Connection:'connection',Interface:'interface',Allocation:'allocation',Flow:'flow',Action:'action',State:'state',
    Calculation:'calc',Constraint:'constraint',Requirement:'requirement',Concern:'concern',Case:'case',AnalysisCase:'analysis',VerificationCase:'verification',UseCase:'use case',View:'view',
    Viewpoint:'viewpoint',Rendering:'rendering',Metadata:'metadata',Occurrence:'occurrence',Enumeration:'enum',EventOccurrence:'event occurrence',Reference:'ref'}[m[1]]||m[1];
  return base+(m[2]==='Definition'?' def':'');
}

/** Déclaration d'un élément sur une ligne, en notation textuelle (lignes des compartiments, colonne « Déclaration »).
 * @param {object} el - Élément @param {boolean} [short] - Sans mot-clé @returns {string} */
function syDeclText(el, short){
  const r=el.refs, d=[];
  if(!short){
    const pre=['abstract','variation','variant','ref','end','derived','constant','individual'].filter(m=>el.mods[m]&&!(m==='ref'&&el.keyword==='ref')&&!(m==='end'&&el.keyword==='end'));
    if(el.dir) pre.unshift(el.dir);
    d.push(...pre); if(el.keyword) d.push(el.keyword);
  }
  if(el.shortName) d.push('<'+syQuote(el.shortName)+'>');
  if(el.declaredName&&el.name) d.push(syQuote(el.name));
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

/* ── src/js/sysml/20-bibliotheque.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   SYSML/20. SysML v2 — INDEX DE LA BIBLIOTHÈQUE STANDARD (généré par node tools/sysml-biblio.js, ne pas modifier)
   Source : sysml.library du dépôt SysML-v2-Release, tag 2026-03 (EPL-2.0 pour les textes d'origine ;
   seuls les noms des paquetages et de leurs membres sont repris ici).
   ═══════════════════════════════════════════════════════════════════════ */
/** Paquetages de la bibliothèque standard → noms de leurs membres (séparés par des espaces ; « @P » : membres publics de P
 * ré-exportés par un import public ; Set créé à la première utilisation, syLibMembers). */
const SY_LIB={"Actions":"AcceptAction AcceptMessageAction Action AssignmentAction ControlAction DecisionAction DecisionTransitionAction ForLoopAction ForkAction IfThenAction IfThenElseAction JoinAction LoopAction MergeAction SendAction TerminateAction TransitionAction WhileLoopAction acceptActions actions assignmentActions forLoopActions ifThenActions ifThenElseActions loopActions sendActions terminateActions transitionActions whileLoopActions",
"Allocations":"Allocation allocations",
"AnalysisCases":"AnalysisCase analysisCases",
"AnalysisTooling":"ToolExecution ToolVariable",
"Attributes":"AttributeValue attributeValues",
"Base":"Anything DataValue dataValues exactlyOne naturals oneToMany things zeroOrOne zeroToMany",
"BaseFunctions":"!= !== # , == === @ @@ ToString [ all as hastype istype meta",
"BooleanFunctions":"& == ToBoolean ToString not xor | @ScalarValues",
"Calculations":"Calculation calculations",
"Cases":"Case cases",
"CausationConnections":"Causation Multicausation causations causes effects multicausations",
"CauseAndEffect":"CausationMetadata CausationSemanticMetadadata CauseMetadata EffectMetadata MulticausationSemanticMetadata causation cause effect multicausation @CausationConnections",
"Clocks":"BasicClock BasicDurationOf BasicTimeOf Clock DurationOf TimeOf UniversalClockLife universalClock",
"CollectionFunctions":"# == array# contains containsAll head isEmpty last notEmpty size tail @Collections",
"Collections":"Array Bag Collection KeyValuePair List Map OrderedCollection OrderedMap OrderedSet Set UniqueCollection",
"ComplexFunctions":"* ** + - / == ToComplex ToString ^ abs arg i im isUnit isZero polar product re rect sum @ScalarValues",
"Connections":"BinaryConnection Connection binaryConnections connections",
"Constraints":"ConstraintCheck assertedConstraintChecks constraintChecks negatedConstraintChecks",
"ControlFunctions":". ?? allTrue and anyTrue collect exists forAll if implies maximize minimize or reduce reject select selectOne",
"ControlPerformances":"DecisionPerformance IfElsePerformance IfPerformance IfThenElsePerformance IfThenPerformance LoopPerformance MergePerformance",
"DataFunctions":"% & * ** + - .. / < <= == === > >= ^ max min not xor | ~",
"DerivationConnections":"Derivation derivations derivedRequirements originalRequirements",
"FeatureReferencingPerformances":"BooleanEvaluationResultMonitorPerformance BooleanEvaluationResultToMonitorPerformance EvaluationResultMonitorPerformance FeatureAccessPerformance FeatureMonitorPerformance FeatureReadEvaluation FeatureReferencingPerformance FeatureWritePerformance",
"Flows":"Flow Message MessageAction SuccessionFlow flows messages successionFlows",
"ISQ":"TemperatureDifferenceUnit TemperatureDifferenceValue temperatureDifference @ISQBase @ISQSpaceTime @ISQMechanics @ISQThermodynamics @ISQElectromagnetism @ISQLight @ISQAcoustics @ISQChemistryMolecular @ISQAtomicNuclear @ISQCharacteristicNumbers @ISQCondensedMatter @ISQInformation",
"ISQAcoustics":"AcousticImpedanceUnit AcousticImpedanceValue CartesianSoundIntensity3dCoordinateFrame CartesianSoundIntensity3dVector CartesianSoundParticleAcceleration3dVector CartesianSoundParticleDisplacement3dVector CartesianSoundParticleVelocity3dVector CharacteristicImpedanceOfAMediumForLongitudinalWavesUnit CharacteristicImpedanceOfAMediumForLongitudinalWavesValue LogarithmicFrequencyRangeUnit LogarithmicFrequencyRangeValue SoundEnergyDensityUnit SoundEnergyDensityValue SoundExposureLevelUnit SoundExposureLevelValue SoundExposureUnit SoundExposureValue SoundIntensityUnit SoundIntensityValue SoundPowerLevelUnit SoundPowerLevelValue SoundPressureLevelUnit SoundPressureLevelValue acousticImpedance cartesianSoundIntensity3dVector cartesianSoundParticleAcceleration3dVector cartesianSoundParticleDisplacement3dVector cartesianSoundParticleVelocity3dVector characteristicImpedanceOfAMediumForLongitudinalWaves logarithmicFrequencyRange reverberationTime soundEnergy soundEnergyDensity soundExposure soundExposureLevel soundIntensity soundPower soundPowerLevel soundPressure soundPressureLevel staticPressure volumeFlowRate volumeVelocity",
"ISQAtomicNuclear":"AbsorbedDoseRateUnit AbsorbedDoseRateValue AbsorbedDoseUnit AbsorbedDoseValue ActivityConcentrationUnit ActivityConcentrationValue ActivityDensityUnit ActivityDensityValue AtomicAttenuationCoefficientUnit AtomicAttenuationCoefficientValue AverageEnergyLossPerElementaryChargeProducedUnit AverageEnergyLossPerElementaryChargeProducedValue AverageLogarithmicEnergyDecrementValue BindingFractionValue CartesianMagneticDipoleMoment3dCoordinateFrame CartesianMagneticDipoleMoment3dVector CartesianParticleCurrentDensity3dCoordinateFrame CartesianParticleCurrentDensity3dVector CartesianSpin3dCoordinateFrame CartesianSpin3dVector CartesianTotalAngularMomentum3dCoordinateFrame CartesianTotalAngularMomentum3dVector ChargeNumberValue DecayConstantUnit DecayConstantValue DiffusionCoefficientForParticleNumberDensityUnit DiffusionCoefficientForParticleNumberDensityValue DirectionAndEnergyDistributionOfCrossSectionUnit DirectionAndEnergyDistributionOfCrossSectionValue DirectionDistributionOfCrossSectionUnit DirectionDistributionOfCrossSectionValue DisintegrationConstantUnit DisintegrationConstantValue DoseEquivalentUnit DoseEquivalentValue EnergyDistributionOfCrossSectionUnit EnergyDistributionOfCrossSectionValue EnergyFluenceRateUnit EnergyFluenceRateValue EnergyFluenceUnit EnergyFluenceValue ExposureRateUnit ExposureRateValue ExposureUnit ExposureValue FastFissionFactorUnit FastFissionFactorValue GFactorOfNucleusOrNuclearParticleValue GyromagneticCoefficientOfTheElectronUnit GyromagneticCoefficientOfTheElectronValue GyromagneticCoefficientUnit GyromagneticCoefficientValue GyromagneticRatioOfTheElectronUnit GyromagneticRatioOfTheElectronValue GyromagneticRatioUnit GyromagneticRatioValue HartreeEnergyUnit HartreeEnergyValue InfiniteMultiplicationFactorUnit InfiniteMultiplicationFactorValue InternalConversionFactorValue IonDensityUnit IonDensityValue IonNumberDensityUnit IonNumberDensityValue KermaRateUnit KermaRateValue KermaUnit KermaValue LandeFactorValue LarmorFrequencyUnit LarmorFrequencyValue LethargyValue LinearAttenuationCoefficientForIonizingRadiationUnit LinearAttenuationCoefficientForIonizingRadiationValue LinearEnergyTransferUnit LinearEnergyTransferValue LinearIonizationUnit LinearIonizationValue LinearStoppingPowerUnit LinearStoppingPowerValue MacroscopicCrossSectionUnit MacroscopicCrossSectionValue MacroscopicTotalCrossSectionUnit MacroscopicTotalCrossSectionValue MagneticDipoleMomentUnit MagneticDipoleMomentValue MagnetogyricRatioOfTheElectronUnit MagnetogyricRatioOfTheElectronValue MagnetogyricRatioUnit MagnetogyricRatioValue MassAttenuationCoefficientForIonizingRadiationUnit MassAttenuationCoefficientForIonizingRadiationValue MassEnergyTransferCoefficientUnit MassEnergyTransferCoefficientValue MassStoppingPowerUnit MassStoppingPowerValue MassicActivityUnit MassicActivityValue MeanMassRangeUnit MeanMassRangeValue MobilityUnit MobilityValue MolarAttenuationCoefficientUnit MolarAttenuationCoefficientValue MultiplicationFactorUnit MultiplicationFactorValue NonLeakageProbabilityUnit NonLeakageProbabilityValue NuclearActivityUnit NuclearActivityValue NuclearQuadrupoleMomentUnit NuclearQuadrupoleMomentValue PackingFractionValue ParticleCurrentDensityUnit ParticleCurrentDensityValue ParticleEmissionRateUnit ParticleEmissionRateValue ParticleFluenceRateUnit ParticleFluenceRateValue ParticleFluenceUnit ParticleFluenceValue ParticleNumberDensityUnit ParticleNumberDensityValue ParticleSourceDensityUnit ParticleSourceDensityValue QualityFactorForIonizingRadiationUnit QualityFactorForIonizingRadiationValue QuantumNumberValue RecombinationCoefficientUnit RecombinationCoefficientValue RelativeMassDefectValue RelativeMassExcessValue ResonanceEscapeProbabilityValue RydbergConstantUnit RydbergConstantValue SlowingDownDensityUnit SlowingDownDensityValue SpecificActivityUnit SpecificActivityValue SpinUnit SpinValue SurfaceActivityDensityUnit SurfaceActivityDensityValue ThermalUtilizationFactorUnit ThermalUtilizationFactorValue TotalAngularMomentumUnit TotalAngularMomentumValue TotalIonizationValue TotalLinearStoppingPowerUnit TotalLinearStoppingPowerValue TotalMassStoppingPowerUnit TotalMassStoppingPowerValue VolumicActivityUnit VolumicActivityValue VolumicCrossSectionUnit VolumicCrossSectionValue VolumicTotalCrossSectionUnit VolumicTotalCrossSectionValue absorbedDose absorbedDoseRate activityConcentration activityDensity alphaDisintegrationEnergy atomicAttenuationCoefficient atomicMass atomicNumber averageEnergyLossPerElementaryChargeProduced averageLogarithmicEnergyDecrement betaDisintegrationEnergy bindingFraction bohrMagneton bohrRadius cartesianMagneticDipoleMoment3dVector cartesianParticleCurrentDensity3dVector cartesianSpin3dVector cartesianTotalAngularMomentum3dVector chargeNumber comptonWavelength crossSection cyclotronAngularFrequency decayConstant diffusionArea diffusionCoefficientForFluenceRate diffusionCoefficientForParticleNumberDensity diffusionLength directionAndEnergyDistributionOfCrossSection directionDistributionOfCrossSection disintegrationConstant doseEquivalent doseEquivalentRate electronRadius elementaryCharge energyDistributionOfCrossSection energyFluence energyFluenceRate energyImparted exposure exposureRate fastFissionFactor gFactorOfAtom gFactorOfNucleusOrNuclearParticle gyromagneticCoefficient gyromagneticCoefficientOfTheElectron gyromagneticRatio gyromagneticRatioOfTheElectron gyroradius halfLife halfValueThickness hartreeEnergy hyperfineStructureQuantumNumber infiniteMultiplicationFactor internalConversionFactor ionDensity ionNumberDensity ionizationNumber kerma kermaRate landeFactor larmorAngularFrequency larmorFrequency larmorRadius lethargy levelWidth linearAttenuationCoefficientForIonizingRadiation linearEnergyTransfer linearIonization linearStoppingPower macroscopicCrossSection macroscopicTotalCrossSection magneticDipoleMoment magneticQuantumNumber magnetogyricRatio magnetogyricRatioOfTheElectron massAttenuationCoefficientForIonizingRadiation massDefect massEnergyTransferCoefficient massExcess massNumber massStoppingPower massicActivity maximumBetaParticleEnergy meanDurationOfLife meanEnergyImparted meanFreePathForAtomicPhysics meanLifeTime meanLinearRange meanMassRange migrationArea migrationLength mobility molarAttenuationCoefficient multiplicationFactor neutronNumber neutronYieldPerAbsorption neutronYieldPerFission nonLeakageProbability nuclearActivity nuclearMagneton nuclearPrecessionAngularFrequency nuclearQuadrupoleMoment nuclearRadius nuclearSpinQuantumNumber nucleonNumber nuclidicMass orbitalAngularMomentumQuantumNumber packingFraction particleCurrentDensity particleEmissionRate particleFluence particleFluenceRate particleNumberDensity particleSourceDensity principalQuantumNumber properMass protonNumber qualityFactorForIonizingRadiation quantumNumber radiantEnergyForIonizingRadiation reactionEnergy reactorTimeConstant recombinationCoefficient relativeMassDefect relativeMassExcess resonanceEnergy resonanceEscapeProbability restEnergy restMass rydbergConstant slowingDownArea slowingDownDensity slowingDownLength specificActivity specificEnergyImparted spin spinQuantumNumber surfaceActivityDensity thermalUtilizationFactor totalAngularMomentum totalAngularMomentumQuantumNumber totalCrossSection totalIonization totalLinearStoppingPower totalMassStoppingPower unifiedAtomicMassConstant volumicActivity volumicCrossSection volumicTotalCrossSection",
"ISQBase":"AmountOfSubstanceUnit AmountOfSubstanceValue DurationUnit DurationValue ElectricCurrentUnit ElectricCurrentValue International System of Quantities LengthUnit LengthValue LuminousIntensityUnit LuminousIntensityValue MassUnit MassValue ThermodynamicTemperatureUnit ThermodynamicTemperatureValue amountOfSubstance duration electricCurrent isq length luminousIntensity mass thermodynamicTemperature",
"ISQCharacteristicNumbers":"AbsorptionNumberValue AlfvénNumberValue AmpèreNumberValue ArchimedesNumberValue ArrheniusNumberValue AtwoodNumberValue BagnoldNumberForSolidParticlesValue BagnoldNumberValue BatchelorNumberValue BejanNumberForEntropyValue BejanNumberForHeatTransferValue BejanNumberForMassTransferValue BejanNumberValue BinghamNumberValue BiotNumberForMassTransferValue BiotNumberValue BlakeNumberValue BodensteinNumberValue BoltzmannNumberValue BondNumberValue BrinkmanNumberValue CapillaryNumberValue CarnotNumberValue CauchyNumberValue CavitationNumberValue ChandrasekharNumberValue ClausiusNumberValue CompressibilityNumberValue CowlingNumberValue DarcyFrictionFactorValue DeanNumberValue DeborahNumberValue DynamicCapillaryNumberValue EckertNumberValue EkmanNumberValue ElasticityNumberValue ElectricFieldParameterValue EulerNumberValue ExpansionNumberValue FanningNumberValue FourierNumberForMassTransferValue FourierNumberValue FroudeNumberForHeatTransferValue FroudeNumberValue GalileiNumberValue GoertlerNumberValue GraetzNumberForMassTransferValue GraetzNumberValue GrashofMagneticNumberValue GrashofNumberForMassTransferValue GrashofNumberValue HagenNumberValue HallNumberValue HartmannNumberValue HeatTransferNumberValue HedströmNumberValue HookeNumberValue JFactorValue JouleMagneticNumberValue KnudsenNumberValue LagrangeNumberValue LandauGinzburgNumberValue LaplaceNumberValue LavalNumberValue LewisNumberValue LiftCoefficientValue LockhartMartinelliParameterValue LorentzNumberValue LundquistNumberValue MachNumberValue MagneticNumberValue MagneticPressureNumberValue MarangoniNumberValue MassTransferFactorValue MortonNumberValue NazeNumberValue NusseltElectricNumberValue NusseltNumberForMassTransferValue NusseltNumberValue OhnesorgeNumberValue PoiseuilleNumberValue PomerantsevNumberValue PowerNumberValue PrandtlMagneticNumberValue PrandtlNumberValue PécletNumberForMassTransferValue PécletNumberValue RayleighNumberValue ReechNumberValue ReynoldsElectricNumberValue ReynoldsMagneticNumberValue ReynoldsNumberValue RichardsonNumberValue RobertsNumberValue RossbyNumberValue SchmidtNumberValue SommerfeldNumberValue StantonNumberForMassTransferValue StantonNumberValue StarkNumberValue StefanNumberValue StokesNumberForDragValue StokesNumberForGravityValue StokesNumberForRotameterValue StokesNumberForVibratingParticlesValue StokesNumberValue StrouhalNumberValue StuartElectricalNumberValue StuartNumberValue TaylorNumberValue ThrustCoefficientValue WeberNumberValue WeissenbergNumberValue WomersleyNumberValue absorptionNumber aeroelasticityParameter alfvénNumber ampèreNumber archimedesNumber arrheniusNumber atwoodNumber bagnoldNumber bagnoldNumberForSolidParticles batchelorNumber bejanNumber bejanNumberForEntropy bejanNumberForHeatTransfer bejanNumberForMassTransfer binghamNumber biotNumber biotNumberForMassTransfer blakeNumber bodensteinNumber boltzmannNumber bondNumber brinkmanNumber capillaryNumber carnotNumber cauchyNumber cavitationNumber chandrasekharNumber clausiusNumber colburnNumber compressibilityNumber cowlingNumber darcyFrictionFactor deanNumber deborahNumber dulongNumber dynamicCapillaryNumber eckertNumber ekmanNumber elasticityNumber electricFieldParameter eulerMagneticNumber eulerNumber expansionNumber eötvösNumber fanningNumber fourierNumber fourierNumberForMassTransfer froudeNumber froudeNumberForHeatTransfer galileiNumber goertlerNumber goertlerParameter graetzNumber graetzNumberForMassTransfer grashofMagneticNumber grashofNumber grashofNumberForMassTransfer hagenNumber hallNumber hartmannNumber heatTransferFactor heatTransferNumber hedströmNumber hookeNumber jFactor jouleMagneticNumber kiebelNumber knudsenNumber kármanNumber lagrangeNumber landauGinzburgNumber laplaceNumber lavalNumber lewisNumber liftCoefficient lockhartMartinelliParameter lorentzNumber lundquistNumber machMagneticNumber machNumber magneticNumber magneticPressureNumber marangoniNumber massTransferFactor moodyFrictionFactor mortonNumber nazeNumber nusseltElectricNumber nusseltNumber nusseltNumberForMassTransfer ohnesorgeNumber plasticityNumber poiseuilleNumber pomerantsevNumber powerCoefficient powerNumber prandtlMagneticNumber prandtlNumber pécletNumber pécletNumberForMassTransfer rayleighNumber reechNumber reynoldsElectricNumber reynoldsMagneticNumber reynoldsNumber richardsonNumber robertsNumber rossbyNumber schmidtNumber sommerfeldNumber stantonNumber stantonNumberForMassTransfer starkNumber stefanNumber stokesNumber stokesNumberForDrag stokesNumberForGravity stokesNumberForRotameter stokesNumberForVibratingParticles strouhalNumber stuartElectricalNumber stuartNumber suratmanNumber taylorNumber thomsonNumber thrustCoefficient weberNumber weissenbergNumber womersleyNumber",
"ISQChemistryMolecular":"AbsoluteActivityValue ActivityCoefficientValue ActivityFactorValue ActivityOfSoluteValue ActivityOfSolventValue AffinityOfAChemicalReactionUnit AffinityOfAChemicalReactionValue AmountOfSubstanceConcentrationUnit AmountOfSubstanceConcentrationValue AmountOfSubstanceFractionMoleFractionValue CanonicalPartitionFunctionValue ChemicalPotentialUnit ChemicalPotentialValue DegeneracyValue DegreeOfDissociationValue DiffusionCoefficientUnit DiffusionCoefficientValue ElectrolyticConductivityUnit ElectrolyticConductivityValue EquilibriumConstantOnConcentrationBasisUnit EquilibriumConstantOnConcentrationBasisValue EquilibriumConstantOnPressureBasisUnit EquilibriumConstantOnPressureBasisValue FugacityUnit FugacityValue GrandCanonicalPartitionFunctionValue IonicStrengthUnit IonicStrengthValue MassConcentrationUnit MassConcentrationValue MassFractionValue MolalityUnit MolalityValue MolarConductivityUnit MolarConductivityValue MolarEnthalpyUnit MolarEnthalpyValue MolarEntropyUnit MolarEntropyValue MolarGasConstantUnit MolarGasConstantValue MolarGibbsEnergyUnit MolarGibbsEnergyValue MolarHeatCapacityUnit MolarHeatCapacityValue MolarHelmholtzEnergyUnit MolarHelmholtzEnergyValue MolarInternalEnergyUnit MolarInternalEnergyValue MolarMassUnit MolarMassValue MolarOpticalRotatoryPowerUnit MolarOpticalRotatoryPowerValue MolarVolumeUnit MolarVolumeValue MolecularPartitionFunctionValue NumberOfMolesUnit NumberOfMolesValue OsmoticFactorOfSolventValue OsmoticPressureUnit OsmoticPressureValue PartialPressureUnit PartialPressureValue ParticleConcentrationUnit ParticleConcentrationValue RelativeAtomicMassValue SpecificOpticalRotatoryPowerUnit SpecificOpticalRotatoryPowerValue StandardAbsoluteActivityInMixtureValue StandardAbsoluteActivityInSolutionValue StandardAbsoluteActivityOfSolventValue StandardChemicalPotentialUnit StandardChemicalPotentialValue StandardEquilibriumConstantValue StoichiometricNumberOfSubstanceValue ThermalDiffusionCoefficientUnit ThermalDiffusionCoefficientValue ThermalDiffusionFactorValue ThermalDiffusionRatioValue TransportNumberOfTheIonBValue VolumeFractionUnit VolumeFractionValue absoluteActivity activityCoefficient activityFactor activityOfSolute activityOfSolvent affinityOfAChemicalReaction amountOfSubstanceConcentration amountOfSubstanceFractionMoleFraction angleOfOpticalRotation canonicalPartitionFunction chemicalPotential currentFractionOfTheIonB degeneracy degreeOfDissociation diffusionCoefficient dissociationFraction electrolyticConductivity enthalpyOfPhaseTransition equilibriumConstantOnConcentrationBasis equilibriumConstantOnPressureBasis extentOfReaction fugacity grandCanonicalPartitionFunction grandPartitionFunction ionicStrength latentHeatOfPhaseTransition massConcentration massFraction meanFreePath microcanonicalPartitionFunction molality molarConductivity molarEnthalpy molarEntropy molarGasConstant molarGibbsEnergy molarHeatCapacity molarHelmholtzEnergy molarInternalEnergy molarMass molarOpticalRotatoryPower molarVolume molecularConcentration molecularPartitionFunction numberOfEntities numberOfMoles osmoticCoefficientOfSolventA osmoticFactorOfSolvent osmoticPressure partialPressure particleConcentration partitionFunctionOfAMolecule relativeActivityOfSolute relativeActivityOfSolvent relativeAtomicMass specificOpticalRotatoryPower standardAbsoluteActivityInMixture standardAbsoluteActivityInSolution standardAbsoluteActivityOfSolvent standardAmountOfSubstanceConcentration standardChemicalPotential standardEquilibriumConstant statisticalWeightOfSubsystem stoichiometricNumberOfSubstance thermalDiffusionCoefficient thermalDiffusionFactor thermalDiffusionRatio thermodynamicEquilibriumConstant transportNumberOfTheIonB volumeFraction",
"ISQCondensedMatter":"AcceptorDensityUnit AcceptorDensityValue AngularReciprocalLatticeVectorMagnitudeUnit AngularReciprocalLatticeVectorMagnitudeValue AtomicScatteringFactorValue CartesianAngularReciprocalLattice3dCoordinateFrame CartesianAngularReciprocalLattice3dVector CartesianBurgers3dVector CartesianDisplacement3dVector CartesianEquilibriumPosition3dVector CartesianFundamentalLattice3dVector CartesianFundamentalReciprocalLattice3dCoordinateFrame CartesianFundamentalReciprocalLattice3dVector CartesianLattice3dVector CartesianParticlePosition3dVector DebyeWallerFactorValue DensityOfVibrationalStatesUnit DensityOfVibrationalStatesValue DonorDensityUnit DonorDensityValue ElectronDensityUnit ElectronDensityValue EnergyDensityOfStatesUnit EnergyDensityOfStatesValue FundamentalReciprocalLatticeVectorMagnitudeUnit FundamentalReciprocalLatticeVectorMagnitudeValue GrüneisenParameterValue HallCoefficientUnit HallCoefficientValue HoleDensityUnit HoleDensityValue IntrinsicCarrierDensityUnit IntrinsicCarrierDensityValue LongRangeOrderParameterValue LorenzCoefficientUnit LorenzCoefficientValue MobilityRatioValue RichardsonConstantUnit RichardsonConstantValue SeebeckCoefficientForSubstancesAAndBUnit SeebeckCoefficientForSubstancesAAndBValue ShortRangeOrderParameterValue StructureFactorValue ThermodynamicGrüneisenParameterValue ThomsonCoefficientUnit ThomsonCoefficientValue acceptorDensity angularReciprocalLatticeVectorMagnitude angularRepetency angularWavenumber atomicScatteringFactor braggAngle carrierLifetime cartesianAngularReciprocalLattice3dVector cartesianBurgers3dVector cartesianDisplacement3dVector cartesianEquilibriumPosition3dVector cartesianFundamentalLattice3dVector cartesianFundamentalReciprocalLattice3dVector cartesianLattice3dVector cartesianParticlePosition3dVector coherenceLength curieTemperature debyeAngularFrequency debyeAngularRepetency debyeAngularWavenumber debyeTemperature debyeWallerFactor densityOfVibrationalStates diffusionLengthForCondensedMatterPhysics donorDensity effectiveMass electronAffinity electronDensity energyDensityOfStates exchangeIntegral fermiAngularRepetency fermiAngularWavenumber fermiEnergy fermiTemperature fundamentalReciprocalLatticeVectorMagnitude gapEnergy grüneisenParameter hallCoefficient holeDensity intrinsicCarrierDensity ionizationEnergy latticePlaneSpacing londonPenetrationDepth longRangeOrderParameter lorenzCoefficient lowerCriticalMagneticFluxDensity meanFreePathOfElectrons meanFreePathOfPhonons mobilityRatio néelTemperature peltierCoefficientForSubstancesAAndB relaxationTime residualResistivity richardsonConstant seebeckCoefficientForSubstancesAAndB shortRangeOrderParameter structureFactor superconductionTransitionTemperature superconductorEnergyGap thermodynamicCriticalMagneticFluxDensity thermodynamicGrüneisenParameter thermoelectricVoltageBetweenSubstancesAAndB thomsonCoefficient upperCriticalMagneticFluxDensity workFunction",
"ISQElectromagnetism":"AdmittanceUnit AdmittanceValue AreicElectricChargeUnit AreicElectricChargeValue CapacitanceUnit CapacitanceValue CartesianAreicElectricCurrent3dCoordinateFrame CartesianDisplacementCurrentDensity3dCoordinateFrame CartesianDisplacementCurrentDensity3dVector CartesianElectricCurrentDensity3dCoordinateFrame CartesianElectricCurrentDensity3dVector CartesianElectricDipoleMoment3dCoordinateFrame CartesianElectricDipoleMoment3dVector CartesianElectricDisplacement3dCoordinateFrame CartesianElectricFieldStrength3dCoordinateFrame CartesianElectricFieldStrength3dVector CartesianElectricFluxDensity3dCoordinateFrame CartesianElectricFluxDensity3dVector CartesianElectricPolarization3dCoordinateFrame CartesianElectricPolarization3dVector CartesianLinearElectricCurrentDensity3dCoordinateFrame CartesianLinearElectricCurrentDensity3dVector CartesianLineicElectricCurrent3dCoordinateFrame CartesianMagneticAreaMoment3dCoordinateFrame CartesianMagneticDipoleMoment3dCoordinateFrame CartesianMagneticDipoleMoment3dVector CartesianMagneticFieldStrength3dCoordinateFrame CartesianMagneticFieldStrength3dVector CartesianMagneticFluxDensity3dCoordinateFrame CartesianMagneticFluxDensity3dVector CartesianMagneticMoment3dCoordinateFrame CartesianMagneticMoment3dVector CartesianMagneticPolarization3dCoordinateFrame CartesianMagneticPolarization3dVector CartesianMagneticVectorPotential3dCoordinateFrame CartesianMagneticVectorPotential3dVector CartesianMagnetization3dCoordinateFrame CartesianMagnetization3dVector CartesianMagnetizingField3dCoordinateFrame CartesianPoynting3dCoordinateFrame CartesianPoynting3dVector CartesianTotalCurrentDensity3dCoordinateFrame CartesianTotalCurrentDensity3dVector CoercivityUnit CoercivityValue ComplexAdmittanceUnit ComplexAdmittanceValue ComplexImpedanceUnit ComplexImpedanceValue ConductanceUnit ConductanceValue ConductivityUnit ConductivityValue CouplingFactorValue DisplacementCurrentDensityUnit DisplacementCurrentDensityValue ElectricChargeDensityUnit ElectricChargeDensityValue ElectricChargeUnit ElectricChargeValue ElectricConstantUnit ElectricConstantValue ElectricCurrentDensityUnit ElectricCurrentDensityValue ElectricDipoleMomentUnit ElectricDipoleMomentValue ElectricFieldStrengthUnit ElectricFieldStrengthValue ElectricFluxDensityUnit ElectricFluxDensityValue ElectricFluxUnit ElectricFluxValue ElectricPolarizationUnit ElectricPolarizationValue ElectricPotentialDifferenceUnit ElectricPotentialDifferenceValue ElectricPotentialUnit ElectricPotentialValue ElectricSusceptibilityValue ElectromagneticEnergyDensityUnit ElectromagneticEnergyDensityValue ImpedanceUnit ImpedanceValue InductanceUnit InductanceValue LeakageFactorValue LightSpeedUnit LightSpeedValue LinearDensityOfElectricChargeUnit LinearDensityOfElectricChargeValue LinearElectricCurrentDensityUnit LinearElectricCurrentDensityValue LineicElectricChargeUnit LineicElectricChargeValue LinkedFluxUnit LinkedFluxValue LossFactorValue MagneticConstantUnit MagneticConstantValue MagneticDipoleMomentUnit MagneticDipoleMomentValue MagneticFieldStrengthUnit MagneticFieldStrengthValue MagneticFluxDensityUnit MagneticFluxDensityValue MagneticFluxUnit MagneticFluxValue MagneticMomentUnit MagneticMomentValue MagneticPolarizationUnit MagneticPolarizationValue MagneticSusceptibilityValue MagneticVectorPotentialUnit MagneticVectorPotentialValue MagnetizationUnit MagnetizationValue MagnetomotiveForceUnit MagnetomotiveForceValue ModulusOfAdmittanceUnit ModulusOfAdmittanceValue ModulusOfImpedanceUnit ModulusOfImpedanceValue PermeabilityOfVacuumUnit PermeabilityOfVacuumValue PermeabilityUnit PermeabilityValue PermeanceUnit PermeanceValue PermittivityOfVacuumUnit PermittivityOfVacuumValue PermittivityUnit PermittivityValue PhaseDifferenceUnit PhaseDifferenceValue PhaseSpeedOfElectromagneticWavesUnit PhaseSpeedOfElectromagneticWavesValue PowerFactorValue PoyntingVectorMagnitudeUnit PoyntingVectorMagnitudeValue QualityFactorValue ReactanceUnit ReactanceValue RelativePermeabilityValue RelativePermittivityValue ReluctanceUnit ReluctanceValue ResistanceToAlternatingCurrentUnit ResistanceToAlternatingCurrentValue ResistanceUnit ResistanceValue ResistivityUnit ResistivityValue SelfInductanceUnit SelfInductanceValue SourceTensionUnit SourceTensionValue SourceVoltageUnit SourceVoltageValue SpeedOfLightUnit SpeedOfLightValue SurfaceDensityOfElectricChargeUnit SurfaceDensityOfElectricChargeValue SusceptanceUnit SusceptanceValue TotalCurrentDensityUnit TotalCurrentDensityValue VolumicElectricChargeUnit VolumicElectricChargeValue VolumicElectromagneticEnergyUnit VolumicElectromagneticEnergyValue activeEnergy activePower admittance apparentPower areicElectricCharge capacitance cartesianAreicElectricCurrent3dVector cartesianDisplacementCurrentDensity3dVector cartesianElectricCurrentDensity3dVector cartesianElectricDipoleMoment3dVector cartesianElectricDisplacement3dVector cartesianElectricFieldStrength3dVector cartesianElectricFluxDensity3dVector cartesianElectricPolarization3dVector cartesianLinearElectricCurrentDensity3dVector cartesianLineicElectricCurrent3dVector cartesianMagneticAreaMoment3dVector cartesianMagneticDipoleMoment3dVector cartesianMagneticFieldStrength3dVector cartesianMagneticFluxDensity3dVector cartesianMagneticMoment3dVector cartesianMagneticPolarization3dVector cartesianMagneticVectorPotential3dVector cartesianMagnetization3dVector cartesianMagnetizingField3dVector cartesianPoynting3dVector cartesianTotalCurrentDensity3dVector coercivity complexAdmittance complexImpedance complexPower conductance conductanceForAlternatingCurrent conductivity couplingFactor currentLinkage displacementCurrent displacementCurrentDensity electricCharge electricChargeDensity electricConstant electricCurrentDensity electricCurrentPhasor electricDipoleMoment electricFieldStrength electricFlux electricFluxDensity electricPolarization electricPotential electricPotentialDifference electricPower electricSusceptibility electricTension electromagneticEnergyDensity impedance inductance instantaneousPower leakageFactor lightSpeed linearDensityOfElectricCharge linearElectricCurrentDensity lineicElectricCharge linkedFlux lossAngle lossFactor magneticConstant magneticDipoleMoment magneticFieldStrength magneticFlux magneticFluxDensity magneticMoment magneticPolarization magneticSusceptibility magneticTension magneticVectorPotential magnetization magnetomotiveForce modulusOfAdmittance modulusOfImpedance mutualInductance nonActivePower numberOfTurnsInAWinding permeability permeabilityOfVacuum permeance permittivity permittivityOfVacuum phaseDifference phaseSpeedOfElectromagneticWaves powerFactor poyntingVectorMagnitude qualityFactor reactance reactivePower relativePermeability relativePermittivity reluctance resistance resistanceToAlternatingCurrent resistivity scalarMagneticPotential selfInductance sourceTension sourceVoltage speedOfLight surfaceDensityOfElectricCharge susceptance totalCurrent totalCurrentDensity voltage voltagePhasor volumicElectricCharge volumicElectromagneticEnergy",
"ISQInformation":"AverageConditionalInformationContentUnit AverageConditionalInformationContentValue AverageInformationRateUnit AverageInformationRateValue AverageTransinformationRateUnit AverageTransinformationRateValue BinaryDigitRateUnit BinaryDigitRateValue BitRateUnit BitRateValue CallIntensityUnit CallIntensityValue CallingRateUnit CallingRateValue ChannelCapacityPerCharacterUnit ChannelCapacityPerCharacterValue ChannelCapacityUnit ChannelCapacityValue ChannelTimeCapacityUnit ChannelTimeCapacityValue CharacterMeanEntropyUnit CharacterMeanEntropyValue CharacterMeanTransinformationContentUnit CharacterMeanTransinformationContentValue CompletedCallIntensityUnit CompletedCallIntensityValue ConditionalEntropyUnit ConditionalEntropyValue ConditionalInformationContentUnit ConditionalInformationContentValue DecisionContentValue EntropyForInformationScienceUnit EntropyForInformationScienceValue EquivalentBinaryDigitRateUnit EquivalentBinaryDigitRateValue EquivalentBinaryStorageCapacityUnit EquivalentBinaryStorageCapacityValue EquivalentBitRateUnit EquivalentBitRateValue EquivocationUnit EquivocationValue ErrorProbabilityValue InformationContentUnit InformationContentValue IrrelevanceUnit IrrelevanceValue JointInformationContentUnit JointInformationContentValue LineDigitRateUnit LineDigitRateValue LossProbabilityValue MaximumEntropyUnit MaximumEntropyValue MeanConditionalInformationContentUnit MeanConditionalInformationContentValue MeanQueueLengthValue MeanTransinformationContentUnit MeanTransinformationContentValue ModulationRateUnit ModulationRateValue RedundancyUnit RedundancyValue RelativeEntropyValue RelativeRedundancyValue StorageCapacityUnit StorageCapacityValue StorageSizeUnit StorageSizeValue TrafficCarriedIntensityUnit TrafficCarriedIntensityValue TrafficIntensityUnit TrafficIntensityValue TrafficLoadUnit TrafficLoadValue TrafficOfferedIntensityUnit TrafficOfferedIntensityValue TransferRateUnit TransferRateValue TransinformationContentUnit TransinformationContentValue WaitingProbabilityValue averageConditionalInformationContent averageInformationRate averageTransinformationRate binaryDigitRate bitPeriod bitRate callIntensity callingRate carrierPower channelCapacity channelCapacityPerCharacter channelTimeCapacity characterMeanEntropy characterMeanTransinformationContent clockFrequency clockRate completedCallIntensity conditionalEntropy conditionalInformationContent decisionContent entropyForInformationScience equivalentBinaryDigitRate equivalentBinaryStorageCapacity equivalentBitRate equivocation errorProbability hammingDistance informationContent irrelevance jointInformationContent lineDigitRate lossProbability maximumEntropy meanConditionalInformationContent meanQueueLength meanTransinformationContent modulationRate periodOfBinaryDigits periodOfDataElements quantizingDistortionRate redundancy relativeEntropy relativeRedundancy signalEnergyPerBinaryDigit storageCapacity storageSize trafficCarriedIntensity trafficIntensity trafficLoad trafficOfferedIntensity transferRate transinformationContent waitingProbability",
"ISQLight":"AbsorptanceValue ChromaticityCoordinatesInTheCie1931StandardColorimetricSystemValue ChromaticityCoordinatesInTheCie1964StandardColorimetricSystemValue CieColourMatchingFunctionsForTheCie1931StandardColorimetricObserverValue CieColourMatchingFunctionsForTheCie1964StandardColorimetricObserverValue EmissivityAtASpecifiedWavelengthValue EmissivityValue IlluminanceUnit IlluminanceValue IrradianceUnit IrradianceValue LightExposureUnit LightExposureValue LinearAbsorptionCoefficientUnit LinearAbsorptionCoefficientValue LinearAttenuationCoefficientUnit LinearAttenuationCoefficientValue LinearExtinctionCoefficientUnit LinearExtinctionCoefficientValue LuminanceFactorValue LuminanceUnit LuminanceValue LuminousAbsorptanceValue LuminousEfficacyOfASourceUnit LuminousEfficacyOfASourceValue LuminousEfficacyOfRadiationUnit LuminousEfficacyOfRadiationValue LuminousEfficiencyValue LuminousEnergyUnit LuminousEnergyValue LuminousExitanceUnit LuminousExitanceValue LuminousExposureUnit LuminousExposureValue LuminousFluxUnit LuminousFluxValue LuminousReflectanceValue LuminousTransmittanceValue MassAbsorptionCoefficientUnit MassAbsorptionCoefficientValue MassAttenuationCoefficientUnit MassAttenuationCoefficientValue MaximumLuminousEfficacyUnit MaximumLuminousEfficacyValue MolarAbsorptionCoefficientUnit MolarAbsorptionCoefficientValue NapierianAbsorbanceValue PhotonExitanceUnit PhotonExitanceValue PhotonExposureUnit PhotonExposureValue PhotonFluxUnit PhotonFluxValue PhotonIntensityUnit PhotonIntensityValue PhotonIrradianceUnit PhotonIrradianceValue PhotonNumberValue PhotonRadianceUnit PhotonRadianceValue QuantityOfIlluminationUnit QuantityOfIlluminationValue QuantityOfLightUnit QuantityOfLightValue RadianceFactorValue RadianceUnit RadianceValue RadiantEmittanceUnit RadiantEmittanceValue RadiantEnergyDensityUnit RadiantEnergyDensityValue RadiantExitanceUnit RadiantExitanceValue RadiantExposureUnit RadiantExposureValue RadiantFluxUnit RadiantFluxValue RadiantIntensityUnit RadiantIntensityValue RadiantPowerUnit RadiantPowerValue ReflectanceFactorValue ReflectanceValue RefractiveIndexValue SpectralIrradianceUnit SpectralIrradianceValue SpectralLuminousEfficacyUnit SpectralLuminousEfficacyValue SpectralLuminousEfficiencyValue SpectralRadianceUnit SpectralRadianceValue SpectralRadiantEnergyDensityInTermsOfWavelengthUnit SpectralRadiantEnergyDensityInTermsOfWavelengthValue SpectralRadiantEnergyDensityInTermsOfWavenumberUnit SpectralRadiantEnergyDensityInTermsOfWavenumberValue SpectralRadiantEnergyUnit SpectralRadiantEnergyValue SpectralRadiantExitanceUnit SpectralRadiantExitanceValue SpectralRadiantExposureUnit SpectralRadiantExposureValue SpectralRadiantFluxUnit SpectralRadiantFluxValue SpectralRadiantIntensityUnit SpectralRadiantIntensityValue SpectralRadiantPowerUnit SpectralRadiantPowerValue SpeedOfLightInAMediumUnit SpeedOfLightInAMediumValue TransmittanceOpticalDensityValue TransmittanceValue TristimulusValuesForTheCie1931StandardColorimetricObserverUnit TristimulusValuesForTheCie1931StandardColorimetricObserverValue TristimulusValuesForTheCie1964StandardColorimetricObserverUnit TristimulusValuesForTheCie1964StandardColorimetricObserverValue absorptance chromaticityCoordinatesInTheCie1931StandardColorimetricSystem chromaticityCoordinatesInTheCie1964StandardColorimetricSystem cieColourMatchingFunctionsForTheCie1931StandardColorimetricObserver cieColourMatchingFunctionsForTheCie1964StandardColorimetricObserver colourTemperature correlatedColourTemperature decadicAbsorbance emissivity emissivityAtASpecifiedWavelength illuminance irradiance lightExposure linearAbsorptionCoefficient linearAttenuationCoefficient linearExtinctionCoefficient luminance luminanceFactor luminousAbsorptance luminousEfficacyOfASource luminousEfficacyOfRadiation luminousEfficiency luminousEnergy luminousExitance luminousExposure luminousFlux luminousReflectance luminousTransmittance massAbsorptionCoefficient massAttenuationCoefficient maximumLuminousEfficacy molarAbsorptionCoefficient napierianAbsorbance numberOfPhotons opticalDensity photonEnergy photonExitance photonExposure photonFlux photonIntensity photonIrradiance photonNumber photonRadiance quantityOfIllumination quantityOfLight radiance radianceFactor radiantEmittance radiantEnergy radiantEnergyDensity radiantExitance radiantExposure radiantFlux radiantIntensity radiantPower reflectance reflectanceFactor refractiveIndex spectralIrradiance spectralLuminousEfficacy spectralLuminousEfficiency spectralRadiance spectralRadiantEnergy spectralRadiantEnergyDensityInTermsOfWavelength spectralRadiantEnergyDensityInTermsOfWavenumber spectralRadiantExitance spectralRadiantExposure spectralRadiantFlux spectralRadiantIntensity spectralRadiantPower speedOfLightInAMedium transmittance transmittanceDensity transmittanceOpticalDensity tristimulusValuesForTheCie1931StandardColorimetricObserver tristimulusValuesForTheCie1964StandardColorimetricObserver",
"ISQMechanics":"ActionQuantityUnit ActionQuantityValue AngularImpulseUnit AngularImpulseValue AngularMomentumUnit AngularMomentumValue BulkModulusUnit BulkModulusValue Cartesian3dMomentOfInertiaMeasurementReference Cartesian3dMomentOfInertiaTensor Cartesian3dStrainMeasurementReference Cartesian3dStrainTensor Cartesian3dStressMeasurementReference Cartesian3dStressTensor CartesianAngularImpulse3dCoordinateFrame CartesianAngularImpulse3dVector CartesianAngularMomentum3dCoordinateFrame CartesianAngularMomentum3dVector CartesianDragForce3dVector CartesianForce3dCoordinateFrame CartesianForce3dVector CartesianImpulse3dCoordinateFrame CartesianImpulse3dVector CartesianKineticFrictionForce3dVector CartesianMassFlow3dCoordinateFrame CartesianMassFlow3dVector CartesianMomentOfForce3dCoordinateFrame CartesianMomentOfForce3dVector CartesianMomentum3dCoordinateFrame CartesianMomentum3dVector CartesianRollingResistance3dVector CartesianStaticFrictionForce3dVector CartesianWeight3dVector CompressibilityUnit CompressibilityValue DensityUnit DensityValue DragCoefficientValue DynamicViscosityUnit DynamicViscosityValue ForceUnit ForceValue ImpulseUnit ImpulseValue KinematicViscosityUnit KinematicViscosityValue KineticFrictionFactorValue LinearDensityUnit LinearDensityValue LinearMassDensityUnit LinearMassDensityValue MassChangeRateUnit MassChangeRateValue MassDensityUnit MassDensityValue MassFlowRateUnit MassFlowRateValue MassFlowUnit MassFlowValue MechanicalEfficiencyValue ModulusOfCompressionUnit ModulusOfCompressionValue ModulusOfElasticityUnit ModulusOfElasticityValue ModulusOfRigidityUnit ModulusOfRigidityValue MomentOfForceUnit MomentOfForceValue MomentOfInertiaUnit MomentOfInertiaValue MomentumUnit MomentumValue NormalStressUnit NormalStressValue PoissonNumberValue PowerUnit PowerValue PressureUnit PressureValue RelativeLinearStrainValue RelativeMassDensityValue RelativeVolumeStrainValue RollingResistanceFactorValue SecondAxialMomentOfAreaUnit SecondAxialMomentOfAreaValue SecondPolarMomentOfAreaUnit SecondPolarMomentOfAreaValue SectionModulusUnit SectionModulusValue ShearModulusUnit ShearModulusValue ShearStrainValue ShearStressUnit ShearStressValue SpecificVolumeUnit SpecificVolumeValue StaticFrictionCoefficientValue StrainUnit StrainValue StressUnit StressValue SurfaceDensityUnit SurfaceDensityValue SurfaceMassDensityUnit SurfaceMassDensityValue SurfaceTensionUnit SurfaceTensionValue TorqueUnit TorqueValue ViscosityUnit ViscosityValue VolumeFlowRateUnit VolumeFlowRateValue YoungModulusUnit YoungModulusValue actionQuantity angularImpulse angularMomentum bulkModulus cartesianAngularImpulse3dVector cartesianAngularMomentum3dVector cartesianDragForce3dVector cartesianDynamicFrictionForce3dVector cartesianForce3dVector cartesianImpulse3dVector cartesianKineticFrictionForce3dVector cartesianMassFlow3dVector cartesianMomentOfForce3dVector cartesianMomentum3dVector cartesianRollingDrag3dVector cartesianRollingFrictionForce3dVector cartesianRollingResistance3dVector cartesianStaticFriction3dVector cartesianStaticFrictionForce3dVector cartesianWeight3dVector coefficientOfStaticFriction compressibility density dragCoefficient dragFactor dynamicFrictionFactor dynamicViscosity force gaugePressure impulse kinematicViscosity kineticEnergy kineticFrictionFactor linearDensity linearMassDensity massChangeRate massDensity massFlow massFlowRate mechanicalEfficiency mechanicalEnergy mechanicalPower mechanicalWork modulusOfCompression modulusOfElasticity modulusOfRigidity momentOfForce momentOfInertia momentOfInertiaTensor momentum normalStress poissonNumber potentialEnergy power pressure relativeDensity relativeLinearStrain relativeMassDensity relativeVolumeStrain rollingResistanceFactor secondAxialMomentOfArea secondPolarMomentOfArea sectionModulus shearModulus shearStrain shearStress specificVolume staticFrictionCoefficient staticFrictionFactor strain strainTensor stress stressTensor surfaceDensity surfaceMassDensity surfaceTension torque viscosity volumeFlowRate work youngModulus",
"ISQSpaceTime":"AccelerationUnit AccelerationValue AngularAccelerationUnit AngularAccelerationValue AngularFrequencyUnit AngularFrequencyValue AngularMeasureUnit AngularMeasureValue AngularRepetencyUnit AngularRepetencyValue AngularVelocityUnit AngularVelocityValue AngularWavenumberUnit AngularWavenumberValue AreaUnit AreaValue AttenuationUnit AttenuationValue CartesianAcceleration3dCoordinateFrame CartesianAcceleration3dVector CartesianAngularAcceleration3dCoordinateFrame CartesianAngularAcceleration3dVector CartesianAngularVelocity3dCoordinateFrame CartesianAngularVelocity3dVector CartesianDisplacement3dVector CartesianPosition3dVector CartesianSpatial3dCoordinateFrame CartesianVelocity3dCoordinateFrame CartesianVelocity3dVector CartesianWave3dVector CartesianWaveVector3dCoordinateFrame CurvatureUnit CurvatureValue CylindricalDisplacement3dVector CylindricalPosition3dVector CylindricalSpatial3dCoordinateFrame DampingCoefficientUnit DampingCoefficientValue Displacement3dVector ExtinctionUnit ExtinctionValue FrequencyUnit FrequencyValue LogarithmicDecrementValue PhaseCoefficientUnit PhaseCoefficientValue PhaseSpeedUnit PhaseSpeedValue PhaseVelocityUnit PhaseVelocityValue PlaneAngleUnit PlaneAngleValue PlanetaryPosition3dVector PlanetarySpatial3dCoordinateFrame Position3dVector PropagationCoefficientUnit PropagationCoefficientValue RepetencyUnit RepetencyValue SolidAngularMeasureUnit SolidAngularMeasureValue Spatial3dCoordinateFrame SpeedUnit SpeedValue SphericalDisplacement3dVector SphericalPosition3dVector SphericalSpatial3dCoordinateFrame TimeUnit TimeValue VolumeUnit VolumeValue WavenumberUnit WavenumberValue acceleration altitude angularAcceleration angularDisplacement angularFrequency angularMeasure angularRepetency angularVelocity angularWavenumber arcLength area attenuation breadth cartesianAcceleration3dVector cartesianAngularAcceleration3dVector cartesianAngularVelocity3dVector cartesianDisplacement3dVector cartesianPosition3dVector cartesianVelocity3dVector cartesianWave3dVector curvature cylindricalDisplacement3dVector cylindricalPosition3dVector dampingCoefficient depth diameter displacement3dVector distance extinction frequency groupSpeed groupVelocity height logarithmicDecrement pathLength period periodDuration phaseAngle phaseCoefficient phaseSpeed phaseVelocity planeAngle planetaryPosition3dVector position3dVector propagationCoefficient radialDistance radius radiusOfCurvature repetency rotation rotationalDisplacement rotationalFrequency solidAngularMeasure speed sphericalDisplacement3dVector sphericalPosition3dVector thickness time timeConstant universalCartesianSpatial3dCoordinateFrame volume wavelength wavenumber width",
"ISQThermodynamics":"CelsiusTemperatureUnit CelsiusTemperatureValue CoefficientOfHeatTransferUnit CoefficientOfHeatTransferValue CoefficientOfThermalInsulanceUnit CoefficientOfThermalInsulanceValue CubicExpansionCoefficientUnit CubicExpansionCoefficientValue DensityOfHeatFlowRateUnit DensityOfHeatFlowRateValue EnergyUnit EnergyValue EntropyUnit EntropyValue HeatCapacityUnit HeatCapacityValue HeatFlowRateUnit HeatFlowRateValue IsentropicCompressibilityUnit IsentropicCompressibilityValue IsentropicExponentValue IsothermalCompressibilityUnit IsothermalCompressibilityValue JouleThomsonCoefficientUnit JouleThomsonCoefficientValue LinearExpansionCoefficientUnit LinearExpansionCoefficientValue MassConcentrationOfWaterUnit MassConcentrationOfWaterValue MassConcentrationOfWaterVapourAbsoluteHumidityUnit MassConcentrationOfWaterVapourAbsoluteHumidityValue MassFractionOfDryMatterValue MassFractionOfWaterValue MassRatioOfWaterToDryMatterValue MassRatioOfWaterVapourToDryGasValue MassieuFunctionUnit MassieuFunctionValue MaximumThermalEfficiencyValue PlanckFunctionUnit PlanckFunctionValue PressureCoefficientUnit PressureCoefficientValue RatioOfSpecificHeatCapacitiesValue RelativeHumidityValue RelativeMassConcentrationOfVapourValue RelativeMassRatioOfVapourValue RelativePressureCoefficientUnit RelativePressureCoefficientValue SpecificEnergyUnit SpecificEnergyValue SpecificEnthalpyUnit SpecificEnthalpyValue SpecificEntropyUnit SpecificEntropyValue SpecificGasConstantUnit SpecificGasConstantValue SpecificHeatCapacityAtConstantPressureUnit SpecificHeatCapacityAtConstantPressureValue SpecificHeatCapacityAtConstantVolumeUnit SpecificHeatCapacityAtConstantVolumeValue SpecificHeatCapacityAtSaturatedVapourPressureUnit SpecificHeatCapacityAtSaturatedVapourPressureValue SpecificHeatCapacityUnit SpecificHeatCapacityValue SurfaceCoefficientOfHeatTransferUnit SurfaceCoefficientOfHeatTransferValue TemperatureUnit TemperatureValue ThermalConductanceUnit ThermalConductanceValue ThermalConductivityUnit ThermalConductivityValue ThermalDiffusivityUnit ThermalDiffusivityValue ThermalEfficiencyValue ThermalInsulanceUnit ThermalInsulanceValue ThermalResistanceUnit ThermalResistanceValue amountOfHeat celsiusTemperature coefficientOfHeatTransfer coefficientOfThermalInsulance cubicExpansionCoefficient densityOfHeatFlowRate dewPointTemperature energy enthalpy entropy gibbsEnergy gibbsFunction heat heatCapacity heatFlowRate helmholtzEnergy helmholtzFunction internalEnergy isentropicCompressibility isentropicExpansionFactor isentropicExponent isothermalCompressibility jouleThomsonCoefficient latentHeat linearExpansionCoefficient massConcentrationOfWater massConcentrationOfWaterVapourAbsoluteHumidity massFractionOfDryMatter massFractionOfWater massRatioOfWaterToDryMatter massRatioOfWaterVapourToDryGas massieuFunction maximumThermalEfficiency planckFunction pressureCoefficient ratioOfSpecificHeatCapacities relativeHumidity relativeMassConcentrationOfVapour relativeMassRatioOfVapour relativePressureCoefficient specificEnergy specificEnthalpy specificEntropy specificGasConstant specificGibbsEnergy specificGibbsFunction specificHeatCapacity specificHeatCapacityAtConstantPressure specificHeatCapacityAtConstantVolume specificHeatCapacityAtSaturatedVapourPressure specificHelmholtzEnergy specificHelmholtzFunction specificInternalEnergy specificThermodynamicEnergy surfaceCoefficientOfHeatTransfer temperature thermalConductance thermalConductivity thermalDiffusivity thermalEfficiency thermalInsulance thermalResistance thermodynamicEnergy",
"ImageMetadata":"Icon Image",
"IntegerFunctions":"% * ** + - .. / < <= == > >= ToInteger ToNatural ToString ^ abs max min product sum @ScalarValues",
"Interfaces":"BinaryInterface Interface binaryInterfaces excludingOnce interfaces",
"Items":"Item Touches items",
"KerML":"Core Kernel Root @KerML::Kernel",
"KerML::Core":"Classifier Conjugation CrossSubsetting Differencing Disjoining EndFeatureMembership Feature FeatureChaining FeatureDirectionKind FeatureInverting FeatureMembership FeatureTyping Intersecting Multiplicity Redefinition ReferenceSubsetting Specialization Subclassification Subsetting Type TypeFeaturing Unioning @KerML::Root",
"KerML::Kernel":"Association AssociationStructure Behavior BindingConnector BooleanExpression Class CollectExpression Connector ConstructorExpression DataType ElementFilterMembership Expression FeatureChainExpression FeatureReferenceExpression FeatureValue Flow FlowEnd Function IndexExpression InstantiationExpression Interaction Invariant InvocationExpression LibraryPackage LiteralBoolean LiteralExpression LiteralInfinity LiteralInteger LiteralRational LiteralString Metaclass MetadataAccessExpression MetadataFeature MultiplicityRange NullExpression OperatorExpression Package ParameterMembership PayloadFeature Predicate ResultExpressionMembership ReturnParameterMembership SelectExpression Step Structure Succession SuccessionFlow @KerML::Core",
"KerML::Root":"AnnotatingElement Annotation Comment Dependency Documentation Element Import Membership MembershipImport Namespace NamespaceImport OwningMembership Relationship TextualRepresentation VisibilityKind",
"Links":"BinaryLink Link SelfLink binaryLinks links selfLinks",
"MeasurementRefCalculations":"* ** / CoordinateFrame* CoordinateFrame/ ToString ^",
"MeasurementReferences":"3dCoordinateFrame AffineTransformationMatrix3d ConversionByConvention ConversionByPrefix CoordinateFrame CoordinateFramePlacement CoordinateTransformation CountValue CyclicRatioScale DefinitionalQuantityValue DerivedUnit DimensionOneUnit DimensionOneValue IntervalScale LogarithmicScale MeasurementScale MeasurementUnit NullTransformation OrdinalScale QuantityValueMapping Rotation ScalarMeasurementReference SimpleUnit SystemOfUnits TensorMeasurementReference ThreeDCoordinateFrame Translation TranslationOrRotation TranslationRotationSequence UnitConversion UnitPowerFactor UnitPrefix VectorMeasurementReference VerifyUnitPowerFactors countQuantities dimensionOneQuantities nullTransformation one",
"Metadata":"MetadataItem metadataItems",
"Metaobjects":"Metaobject SemanticMetadata metaobjects",
"ModelingMetadata":"Issue Rationale Refinement StatusInfo StatusKind refinement",
"NaturalFunctions":"% * + / < <= == > >= ToNatural ToString max min @ScalarValues",
"NumericalFunctions":"% * ** + - / < <= > >= ^ abs isUnit isZero max min product product1 sum sum0 @ScalarValues",
"Objects":"BinaryLinkObject Body Curve LinkObject Object Point StructuredSpaceObject Surface binaryLinkObjects linkObjects objects",
"Observation":"ChangeMonitor ChangeSignal DefaultMonitorLife ObserveChange defaultMonitor",
"OccurrenceFunctions":"=== addNew addNewAt create destroy isDuring removeOld removeOldAt",
"Occurrences":"HappensBefore HappensDuring HappensJustBefore HappensLink HappensWhile IncomingTransferSort InnerSpaceOf InsideOf JustOutsideOf Life MatesWith Occurrence OutsideOf PortionOf SelfLink SelfSameLifeLink SnapshotOf SpaceLink SpaceShotOf SpaceSliceOf SurroundedBy TimeSliceOf Within WithinBoth Without earlierFirstIncomingTransferSort happensBeforeLinks occurrences",
"ParametersOfInterestMetadata":"MeasureOfEffectiveness MeasureOfPerformance measuresOfEffectiveness measuresOfPerformance moe mop",
"Parts":"Part parts",
"Performances":"BooleanEvaluation Evaluation InvolvedIn LiteralBooleanEvaluation LiteralEvaluation LiteralIntegerEvaluation LiteralRationalEvaluation LiteralStringEvaluation MetadataAccessEvaluation NullEvaluation Performance Performs booleanEvaluations constructorEvaluations evaluations falseEvaluations literalBooleanEvaluations literalEvaluations literalIntegerEvaluations literalRationalEvaluations literalStringEvaluations metadataAccessEvaluations nullEvaluations performances trueEvaluations",
"Ports":"Port ports",
"Quantities":"3dVectorQuantityValue QuantityDimension QuantityPowerFactor QuantityValue ScalarQuantityValue SystemOfQuantities TensorQuantityValue ThreeDVectorQuantityValue VectorQuantityValue quantities scalarQuantities tensorQuantities vectorQuantities",
"QuantityCalculations":"* ** + - / < <= == > >= ConvertQuantity ToDimensionOneValue ToInteger ToRational ToReal ToString [ ^ abs floor isUnit isZero max min product round sqrt sum",
"RationalFunctions":"* ** + - / < <= == > >= ToInteger ToRational ToString ^ abs denom floor gcd max min numer product rat round sum @ScalarValues",
"RealFunctions":"* ** + - / < <= == > >= ToInteger ToRational ToReal ToString ^ abs arg floor im max min product re round sqrt sum @ScalarValues",
"RequirementDerivation":"DerivationMetadata DerivedRequirementMetadata OriginalRequirementMetadata derivation derive original @DerivationConnections",
"Requirements":"ConcernCheck DesignConstraintCheck FunctionalRequirementCheck InterfaceRequirementCheck PerformanceRequirementCheck PhysicalRequirementCheck RequirementCheck RequirementConstraintCheck concernChecks notSatisfiedRequirementChecks requirementChecks satisfiedRequirementChecks",
"RiskMetadata":"Level LevelEnum Risk RiskLevel RiskLevelEnum",
"SI":"A A/m A/m² A⋅m² A⋅m²⋅J⁻¹⋅s⁻¹ A⋅m⁻²⋅K⁻² A⋅s/kg B B/s Bd Bq Bq/kg Bq/m² Bq/m³ C C/(kg⋅s) C/kg C/m C/m² C/m³ C⋅m Da E F F/m GJ Gy Gy/s H H/m Hart Hart/s Hz H⁻¹ ISO/IEC 80000 International System of Units J J/(kg⋅K) J/(mol⋅K) J/(m²⋅nm) J/(m³⋅nm) J/K J/kg J/m J/mol J/m² J/m³ J/nm J/s J⁻¹⋅m⁻³⋅eV⁻¹⋅m⁻³ J⋅m²/kg J⋅s J⋅s⁻¹ J⋅s⋅eV⋅s K K/Pa K/W K⁻¹ L MJ N N⋅m N⋅m⁻² N⋅m⁻¹ N⋅m⋅s N⋅m⋅s⁻¹ N⋅s Pa Pa/K Pa²⋅s Pa⁻¹ Pa⋅s Pa⋅s/m Pa⋅s/m³ S S/m Sh Sh/s Sv Sv/s S⋅m²/mol T V V/K V/m V²/K² V⋅A W W/(m²⋅K) W/(m²⋅nm) W/(m⋅K) W/(sr⋅m²) W/(sr⋅m²⋅nm) W/(sr⋅nm) W/K W/kg W/m² W/nm W/sr Wb Wb/m Wb⋅m W⋅h ampere ampere metre squared ampere metre squared joule to the power minus 1 second to the power minus 1 ampere metre to the power minus 2 kelvin to the power minus 2 ampere per metre ampere per square metre ampere second per kilogram arcmin arcsec astronomical unit atomic mass unit b barn baud becquerel becquerel per cubic metre becquerel per kilogram becquerel per square metre bit bit per second bit/s byte byte per second candela candela metre to the power minus 2 candela steradian candela steradian kilogram to the power minus 1 metre to the power minus 2 second to the power 3 candela steradian metre to the power minus 2 candela steradian metre to the power minus 2 second candela steradian second cd cd⋅m⁻² cd⋅sr cd⋅sr⋅kg⁻¹⋅m⁻²⋅s³ cd⋅sr⋅m⁻² cd⋅sr⋅m⁻²⋅s cd⋅sr⋅s centimetre cm coulomb coulomb metre coulomb per cubic metre coulomb per kilogram coulomb per kilogram second coulomb per metre coulomb per square metre d dB dalton day dec decade decibel degree degree celsius (absolute temperature scale) degree celsius (temperature difference) eV eV/m eV/m² eV⋅J⋅kg⋅m²⋅s⁻² eV⋅m⁻²/kg electronvolt electronvolt joule kilogram metre squared second to the power minus 2 electronvolt metre to the power minus 2 per kilogram electronvolt per metre electronvolt per square metre erlang farad farad per metre g g per l g per mole g/L g/mol gigajoule gram gray gray per second h hartley hartley per second henry henry per metre henry to the power minus 1 hertz hour joule joule metre squared per kilogram joule per cubic metre joule per cubic metre nm joule per kelvin joule per kilogram joule per kilogram kelvin joule per metre joule per mole joule per mole kelvin joule per nm joule per second joule per square metre joule per square metre nm joule second joule second electronvolt second joule second to the power minus 1 joule to the power minus 1 metre to the power minus 3 electronvolt to the power minus 1 metre to the power minus 3 kJ kW kelvin kelvin per pascal kelvin per watt kelvin to the power minus 1 kg kg²⋅m⁴⋅s⁻⁶⋅A⁻²⋅K⁻² kg²⋅m⁻²⋅s⁻³ kg⁻¹⋅A kg⁻¹⋅m² kg⁻¹⋅m³ kg⁻¹⋅m⁻²⋅s³⋅K kg⁻¹⋅m⁻³⋅s³⋅A² kg⁻¹⋅m⁻⁵⋅s² kg⁻¹⋅m⋅s² kg⁻¹⋅m⋅s²⋅K kg⁻¹⋅s² kg⁻¹⋅s²⋅A kg⁻¹⋅s³⋅A²⋅mol⁻¹ kg⁻¹⋅s³⋅K kg⁻¹⋅s⁻¹ kg⁻¹⋅s⋅A kg⋅mol⁻¹ kg⋅m² kg⋅m²⋅s⁻² kg⋅m²⋅s⁻²⋅K⁻¹ kg⋅m²⋅s⁻²⋅K⁻¹⋅mol⁻¹ kg⋅m²⋅s⁻²⋅mol⁻¹ kg⋅m²⋅s⁻³ kg⋅m²⋅s⁻³⋅A⁻¹ kg⋅m²⋅s⁻³⋅A⁻¹⋅K⁻¹ kg⋅m²⋅s⁻³⋅K⁻¹ kg⋅m²⋅s⁻³⋅sr⁻¹ kg⋅m²⋅s⁻¹ kg⋅m³⋅s⁻³⋅A⁻² kg⋅m⁻² kg⋅m⁻²⋅s⁻² kg⋅m⁻²⋅s⁻¹ kg⋅m⁻³ kg⋅m⁻¹ kg⋅m⁻¹⋅s⁻² kg⋅m⁻¹⋅s⁻²⋅K⁻¹ kg⋅m⁻¹⋅s⁻³ kg⋅m⁻¹⋅s⁻³⋅sr⁻¹ kg⋅m⁻¹⋅s⁻¹ kg⋅m⁻⁴⋅s⁻¹ kg⋅m⋅s⁻² kg⋅m⋅s⁻³ kg⋅m⋅s⁻³⋅K⁻¹ kg⋅m⋅s⁻³⋅sr⁻¹ kg⋅m⋅s⁻¹ kg⋅s⁻² kg⋅s⁻²⋅A⁻¹ kg⋅s⁻³ kg⋅s⁻³⋅K⁻¹ kg⋅s⁻³⋅sr⁻¹ kg⋅s⁻¹ kilogram kilogram metre cubed second to the power minus 3 ampere to the power minus 2 kilogram metre second to the power minus 1 kilogram metre second to the power minus 2 kilogram metre second to the power minus 3 kilogram metre second to the power minus 3 kelvin to the power minus 1 kilogram metre second to the power minus 3 steradian to the power minus 1 kilogram metre squared kilogram metre squared second to the power minus 1 kilogram metre squared second to the power minus 2 kilogram metre squared second to the power minus 2 kelvin to the power minus 1 kilogram metre squared second to the power minus 2 kelvin to the power minus 1 mole to the power minus 1 kilogram metre squared second to the power minus 2 mole to the power minus 1 kilogram metre squared second to the power minus 3 kilogram metre squared second to the power minus 3 ampere to the power minus 1 kilogram metre squared second to the power minus 3 ampere to the power minus 1 kelvin to the power minus 1 kilogram metre squared second to the power minus 3 kelvin to the power minus 1 kilogram metre squared second to the power minus 3 steradian to the power minus 1 kilogram metre to the power minus 1 kilogram metre to the power minus 1 second to the power minus 1 kilogram metre to the power minus 1 second to the power minus 2 kilogram metre to the power minus 1 second to the power minus 2 kelvin to the power minus 1 kilogram metre to the power minus 1 second to the power minus 3 kilogram metre to the power minus 1 second to the power minus 3 steradian to the power minus 1 kilogram metre to the power minus 2 kilogram metre to the power minus 2 second to the power minus 1 kilogram metre to the power minus 2 second to the power minus 2 kilogram metre to the power minus 3 kilogram metre to the power minus 4 second to the power minus 1 kilogram mole to the power minus 1 kilogram second to the power minus 1 kilogram second to the power minus 2 kilogram second to the power minus 2 ampere to the power minus 1 kilogram second to the power minus 3 kilogram second to the power minus 3 kelvin to the power minus 1 kilogram second to the power minus 3 steradian to the power minus 1 kilogram to the power 2 metre to the power 4 second to the power minus 6 ampere to the power minus 2 kelvin to the power minus 2 kilogram to the power 2 metre to the power minus 2 second to the power minus 3 kilogram to the power minus 1 ampere kilogram to the power minus 1 metre cubed kilogram to the power minus 1 metre second to the power 2 kilogram to the power minus 1 metre second to the power 2 kelvin kilogram to the power minus 1 metre squared kilogram to the power minus 1 metre to the power minus 2 second to the power 3 kelvin kilogram to the power minus 1 metre to the power minus 3 second to the power 3 ampere to the power 2 kilogram to the power minus 1 metre to the power minus 5 second to the power 2 kilogram to the power minus 1 second ampere kilogram to the power minus 1 second to the power 2 kilogram to the power minus 1 second to the power 2 ampere kilogram to the power minus 1 second to the power 3 ampere to the power 2 mole to the power minus 1 kilogram to the power minus 1 second to the power 3 kelvin kilogram to the power minus 1 second to the power minus 1 kilojoule kilometre kilometre per hour kilowatt km km/h litre lm lm/W lm/m² lm⋅s lumen lumen per square metre lumen per watt lumen second lux lux second lx lx⋅s m m/s m/s² mL mL/L  mN megajoule metre metre cubed metre cubed mole to the power minus 1 metre cubed per coulomb cubic metre second to the power minus 1 ampere to the power minus 1 metre cubed second to the power minus 1 metre per second metre second to the power minus 1 metre second to the power minus 2 metre squared metre squared ampere metre squared kelvin per watt metre squared mole to the power minus 1 metre squared per joule metre squared per joule steradian metre squared per volt second metre squared second to the power minus 1 metre squared second to the power minus 2 metre squared second to the power minus 2 kelvin to the power minus 1 metre squared second to the power minus 3 metre squared steradian to the power minus 1 metre to the power 4 metre to the power 4 second to the power minus 2 metre to the power minus 1 metre to the power minus 2 metre to the power minus 2 second to the power minus 1 metre to the power minus 2 second to the power minus 1 steradian to the power minus 1 metre to the power minus 3 metre to the power minus 3 second metre to the power minus 3 second to the power minus 1 metric ton millilitre millimetre millinewton min minute minute (angle) ml per l mm mol mol/L mol/kg mol/m³ mole mole kilogram to the power minus 1 mole metre to the power minus 3 mole per cubic metre mole per kilogram mole per l mol⋅kg⁻¹ mol⋅m⁻³ m² m²/(J⋅sr) m²/(V⋅s) m²/J m²⋅A m²⋅K/W m²⋅mol⁻¹ m²⋅sr⁻¹ m²⋅s⁻² m²⋅s⁻²⋅K⁻¹ m²⋅s⁻³ m²⋅s⁻¹ m³ m³/C⋅m³⋅s⁻¹⋅A⁻¹ m³⋅mol⁻¹ m³⋅s⁻¹ m⁴ m⁴⋅s⁻² m⁻² m⁻²⋅s⁻¹ m⁻²⋅s⁻¹⋅sr⁻¹ m⁻³ m⁻³⋅s m⁻³⋅s⁻¹ m⁻¹ m⋅s⁻² m⋅s⁻¹ nanometre nat nat/s natural unit of information natural unit of information per second newton newton metre newton metre second newton metre second to the power minus 1 newton metre to the power minus 1 newton metre to the power minus 2 newton second nm o o/s oct octave octet octet per second ohm ohm metre pascal pascal per kelvin pascal second pascal second per cubic metre pascal second per metre pascal to the power 2 second pascal to the power minus 1 rad rad/m radian radian metre squared per kilogram to the power 1 radian metre squared per mole radian per metre radian second to the power minus 1 radian second to the power minus 2 rad⋅m²/kg¹ rad⋅m²/mol rad⋅s⁻² rad⋅s⁻¹ s second second (angle) second ampere second to the power minus 1 second to the power minus 1 steradian to the power minus 1 second to the power minus 2 shannon shannon per second si siemens siemens metre squared per mole siemens per metre sievert sievert per second sr steradian s⁻² s⁻¹ s⁻¹⋅sr⁻¹ s⋅A tesla tonne u ua var volt volt ampere volt ampere reactive volt per kelvin volt per metre volt to the power 2 per kelvin to the power 2 watt watt hour watt per kelvin watt per kilogram watt per metre kelvin watt per nm watt per square metre watt per square metre kelvin watt per square metre nm watt per steradian watt per steradian nm watt per steradian square metre watt per steradian square metre nm weber weber metre weber per metre ° °C °C_abs Å ångström Ω Ω⋅m ′ ″ @ISQ @SIPrefixes",
"SIPrefixes":"atto centi deca deci exa exbi femto gibi giga hecto kibi kilo mebi mega micro milli nano pebi peta pico tebi tera yobi yocto yotta zebi zepto zetta",
"SampledFunctions":"Domain Interpolate Range Sample SamplePair SampledFunction interpolateLinear",
"ScalarFunctions":"% & * ** + - .. / < <= > >= ^ max min not xor | ~ @ScalarValues",
"ScalarValues":"Boolean Complex Integer Natural Number NumericalValue Positive Rational Real ScalarValue String",
"SequenceFunctions":"# add addAt equals excludes excluding excludingAt head includes includesOnly including includingAt intersection isEmpty last notEmpty remove removeAt same size subsequence tail union",
"ShapeItems":"Box Circle CircularCone CircularCylinder CircularDisc Cone ConeOrCylinder ConicSection ConicSurface Cuboid CuboidOrTriangularPrism Cylinder Disc EccentricCone EccentricCylinder Ellipse Ellipsoid Hyperbola Hyperboloid Line Parabola Paraboloid Path PlanarCurve PlanarSurface Polygon Polyhedron Pyramid Quadrilateral Rectangle RectangularCuboid RectangularPyramid RectangularToroid RightCircularCone RightCircularCylinder RightTriangle RightTriangularPrism Shell Sphere Tetrahedron Toroid Torus Triangle TriangularPrism Wedge baseLength baseWidth semiMajorAxis semiMinorAxis xoffset yoffset",
"SpatialFrames":"CartesianCurrentDisplacementOf CartesianCurrentPositionOf CartesianDisplacementOf CartesianPositionOf CartesianSpatialFrame CurrentDisplacementOf CurrentPositionOf DefaultFrameLife DisplacementOf PositionOf SpatialFrame defaultFrame",
"SpatialItems":"CurrentDisplacementOf CurrentPositionOf DisplacementOf PositionOf SpatialItem",
"StandardViewDefinitions":"ActionFlowView BrowserView GeneralView GeometryView GridView InterconnectionView SequenceView StateTransitionView afv bv gev grv gv iv stv sv @SysML",
"StatePerformances":"StatePerformance StateTransitionPerformance",
"StateSpaceRepresentation":"ContinuousStateSpaceDynamics DiscreteStateSpaceDynamics GetDerivative GetDifference GetNextState GetOutput Input Integrate Output StateDerivative StateSpace StateSpaceDynamics StateSpaceEventDef StateSpaceItem ZeroCrossingEventDef",
"States":"StateAction StateTransitionAction stateActions",
"StringFunctions":"+ < <= == > >= Length Substring ToString @ScalarValues",
"SysML":"Systems @SysML::Systems",
"SysML::Systems":"AcceptActionUsage ActionDefinition ActionUsage ActorMembership AllocationDefinition AllocationUsage AnalysisCaseDefinition AnalysisCaseUsage AssertConstraintUsage AssignmentActionUsage AttributeDefinition AttributeUsage BindingConnectorAsUsage CalculationDefinition CalculationUsage CaseDefinition CaseUsage ConcernDefinition ConcernUsage ConjugatedPortDefinition ConjugatedPortTyping ConnectionDefinition ConnectionUsage ConnectorAsUsage ConstraintDefinition ConstraintUsage ControlNode DecisionNode Definition EnumerationDefinition EnumerationUsage EventOccurrenceUsage ExhibitStateUsage Expose FlowDefinition FlowUsage ForLoopActionUsage ForkNode FramedConcernMembership IfActionUsage IncludeUseCaseUsage InterfaceDefinition InterfaceUsage ItemDefinition ItemUsage JoinNode LoopActionUsage MembershipExpose MergeNode MetadataDefinition MetadataUsage NamespaceExpose ObjectiveMembership OccurrenceDefinition OccurrenceUsage PartDefinition PartUsage PerformActionUsage PortConjugation PortDefinition PortUsage PortionKind ReferenceUsage RenderingDefinition RenderingUsage RequirementConstraintKind RequirementConstraintMembership RequirementDefinition RequirementUsage RequirementVerificationMembership SatisfyRequirementUsage SendActionUsage StakeholderMembership StateDefinition StateSubactionKind StateSubactionMembership StateUsage SubjectMembership SuccessionAsUsage SuccessionFlowUsage TerminateActionUsage TransitionFeatureKind TransitionFeatureMembership TransitionUsage TriggerInvocationExpression TriggerKind Usage UseCaseDefinition UseCaseUsage VariantMembership VerificationCaseDefinition VerificationCaseUsage ViewDefinition ViewRenderingMembership ViewUsage ViewpointDefinition ViewpointUsage WhileLoopActionUsage @KerML::Kernel",
"TensorCalculations":"+ - TensorScalarMult TensorScalarQuantityMult [ isUnitTensorQuantity isZeroTensorQuantity scalarQuantityTensorMult scalarTensorMult tensorTensorMult tensorVectorMult transform vectorTensorMult",
"Time":"Clock Coordinated Universal Time Date DateTime DurationOf DurationUnit DurationValue Iso8601DateTime Iso8601DateTimeEncoding Iso8601DateTimeStructure TimeInstantValue TimeOf TimeOfDay TimeScale TimeUnit TimeValue UTC UtcTimeInstantValue convertIso8601DateTimeToStructure convertIso8601StructureToDateTime duration time timeInstant universalClock utcTimeInstant",
"TradeStudies":"EvaluationFunction MaximizeObjective MinimizeObjective TradeStudy TradeStudyObjective",
"Transfers":"AcceptPerformance FlowTransfer FlowTransferBefore MessageTransfer SendPerformance Transfer TransferBefore acceptPerformances flowTransfers flowTransfersBefore messageTransfers sendPerformances transfers transfersBefore",
"TransitionPerformances":"NonStateTransitionPerformance TPCGuardConstraint TransitionPerformance",
"TrigFunctions":"Real UnitBoundedReal arccos arcsin arctan cos cot deg pi piPrecision rad sin tan",
"Triggers":"TimeSignal TriggerAfter TriggerAt TriggerWhen @Clocks @Observation",
"USCU":"AT British thermal unit (39 °F) British thermal unit (59 °F) British thermal unit (60 °F) British thermal unit (IT) British thermal unit (IT) foot per hour square foot degree Fahrenheit British thermal unit (IT) inch per hour square foot degree Fahrenheit British thermal unit (IT) inch per second square foot degree Fahrenheit British thermal unit (IT) per degree Fahrenheit British thermal unit (IT) per degree Rankine British thermal unit (IT) per hour British thermal unit (IT) per hour square foot degree Fahrenheit British thermal unit (IT) per pound British thermal unit (IT) per pound degree Fahrenheit British thermal unit (IT) per pound degree Rankine British thermal unit (IT) per second British thermal unit (IT) per second square foot degree Fahrenheit British thermal unit (IT) per square foot hour British thermal unit (IT) per square foot second British thermal unit (mean) British thermal unit (th) British thermal unit (th) foot per hour square foot degree Fahrenheit British thermal unit (th) inch per hour square foot degree Fahrenheit British thermal unit (th) inch per second square foot degree Fahrenheit British thermal unit (th) per degree Fahrenheit British thermal unit (th) per degree Rankine British thermal unit (th) per hour British thermal unit (th) per hour square foot degree Fahrenheit British thermal unit (th) per minute British thermal unit (th) per pound British thermal unit (th) per pound degree Fahrenheit British thermal unit (th) per pound degree Rankine British thermal unit (th) per second British thermal unit (th) per second square foot degree Fahrenheit British thermal unit (th) per square foot hour British thermal unit (th) per square foot minute British thermal unit (th) per square foot second British thermal unit (th) per square inch second Btu Btu_39°F Btu_59°F Btu_60°F Btu_IT Btu_IT/(ft²⋅h) Btu_IT/(ft²⋅s) Btu_IT/(h⋅ft²⋅°F) Btu_IT/(lb⋅°F) Btu_IT/(lb⋅°R) Btu_IT/(s⋅ft²⋅°F) Btu_IT/h Btu_IT/lb Btu_IT/s Btu_IT/°F Btu_IT/°R Btu_IT⋅ft/(h⋅ft²⋅°F) Btu_IT⋅in/(h⋅ft²⋅°F) Btu_IT⋅in/(s⋅ft²⋅°F) Btu_mean Btu_th Btu_th/(ft²⋅h) Btu_th/(ft²⋅min) Btu_th/(ft²⋅s) Btu_th/(h⋅ft²⋅°F) Btu_th/(in²⋅s) Btu_th/(lb⋅°F) Btu_th/(lb⋅°R) Btu_th/(s⋅ft²⋅°F) Btu_th/h Btu_th/lb Btu_th/min Btu_th/s Btu_th/°F Btu_th/°R Btu_th⋅ft/(h⋅ft²⋅°F) Btu_th⋅in/(h⋅ft²⋅°F) Btu_th⋅in/(s⋅ft²⋅°F) NM W/in² acre (based on US survey foot) acre foot (based on US survey foot) barrel (for petroleum, 42 gallons (US)) bbl bu bushel (US) candela per square inch cd/in² ch chain (based on US survey foot) circular mil clo cord (128 ft^3) cubic foot cubic foot per minute cubic foot per second cubic inch cubic inch per minute cubic mile cubic yard cubic yard per minute cup (US) degree Fahrenheit (temperature difference) degree Fahrenheit hour per British thermal unit (IT) degree Fahrenheit hour per British thermal unit (th) degree Fahrenheit hour square foot per British thermal unit (IT) degree Fahrenheit hour square foot per British thermal unit (th) degree Fahrenheit second per British thermal unit (IT) degree Fahrenheit second per British thermal unit (th) degree Rankine degree fahrenheit (absolute temperature scale) drypt dryqt fathom (based on US survey foot) floz fluid ounce (US) foot foot (US survey) foot of mercury, conventional foot of water (39.2 °F) foot of water, conventional foot per hour foot per minute foot per second foot per second squared foot pound-force foot pound-force per hour foot pound-force per minute foot pound-force per second foot poundal foot to the fourth power footcandle footlambert ft ft/h ft/min ft/s ft/s² ftH2O ftHg ft² ft²/h ft²/s ft³ ft³/min ft³/s ft⁴ ft⋅lbf ft⋅lbf/h ft⋅lbf/min ft⋅lbf/s gal gal/d gal/min gallon (US) gallon (US) per day gallon (US) per minute (gpm) gi gill (US) gr gr/gal grain grain per gallon (US) horsepower (550 ft*lbf/s) horsepower (boiler) horsepower (electric) horsepower (water) hp hundredweight (long, 112 lb) hundredweight (short, 100 lb) in in/s in/s² inH2O inHg inch inch of mercury (32 °F) inch of mercury (60 °F) inch of mercury, conventional inch of water (39.2 °F) inch of water (60 °F) inch of water, conventional inch per second inch per second squared inch to the fourth power in² in³ in³/min in⁴ kip kip (1 kip = 1000 lbf) kip per square inch (ksi) kip/in² knot knot (nautical mile per hour) lb lb/(ft⋅h) lb/(ft⋅s) lb/ft lb/ft² lb/ft³ lb/gal lb/h lb/in lb/in² lb/in³ lb/min lb/s lb/yd lb/yd³ lbf lbf/ft lbf/ft² lbf/in lbf/in² lbf⋅ft lbf⋅ft/in lbf⋅in lbf⋅in/in lbf⋅s/ft² lbf⋅s/in² lb⋅ft² lb⋅in² liqpt liqqt lm/ft² lumen per square foot mi mi/h mi/min mi/s microinch mil mil (0.001 in) mile mile (based on US survey foot) mile per hour mile per minute mile per second mile, nautical mi² mi³ mph nmi ohm circular-mil per foot ounce (US fluid) ounce (avoirdupois) ounce (avoirdupois) per cubic inch ounce (avoirdupois) per gallon (US) ounce (avoirdupois) per square foot ounce (avoirdupois) per square inch ounce (avoirdupois) per square yard ounce (avoirdupois)-force ounce (avoirdupois)-force inch oz oz/ft² oz/gal oz/in² oz/in³ oz/yd² ozf ozf⋅in peck (US) pica pica (computer) (1/6 in) pica (printer′s) pint (US dry) pint (US liquid) pk point (computer) (1/72 in) point (printer′s) pound (avoirdupois) pound foot squared pound inch squared pound per cubic foot pound per cubic inch pound per cubic yard pound per foot pound per foot hour pound per foot second pound per gallon (US) pound per hour pound per inch pound per minute pound per second pound per square foot pound per square inch (not pound-force) pound per yard pound-force pound-force foot pound-force foot per inch pound-force inch pound-force inch per inch pound-force per foot pound-force per inch pound-force per square foot pound-force per square inch pound-force per square inch (psi) pound-force second per square foot pound-force second per square inch psi pt quad (10^15 Btu_IT) quart (US dry) quart (US liquid) rd rod (based on US survey foot) slug slug per cubic foot slug per foot second slug/(ft⋅s) slug/ft³ square foot square foot per hour square foot per second square inch square mile square mile (based on US survey foot) square yard tablespoon teaspoon therm (EC) therm (US) ton of refrigeration (12 000 Btu_IT/h) ton, assay ton, long (2240 lb) ton, long, per cubic yard ton, register ton, short (2000 lb) ton, short, per cubic yard ton, short, per hour ton-force (2000 lbf) unit pole watt per square inch yard yd yd² yd³ yd³/min °F °F_abs °F⋅h/Btu_IT °F⋅h/Btu_th °F⋅h⋅ft²/Btu_IT °F⋅h⋅ft²/Btu_th °F⋅s/Btu_IT °F⋅s/Btu_th °R @ISQ",
"UseCases":"UseCase useCases",
"VectorCalculations":"* + - [ angle inner isUnitVectorQuantity isZeroVectorQuantity norm outer scalarQuantityVectorMult scalarVectorMult transform vectorScalarDiv vectorScalarMult vectorScalarQuantityDiv vectorScalarQuantityMult",
"VectorFunctions":"* + - CartesianThreeVectorOf CartesianVectorOf VectorOf angle cartesian+ cartesian- cartesian3DZeroVector cartesianAngle cartesianInner cartesianNorm cartesianScalarVectorMult cartesianVectorScalarMult cartesianZeroVector inner isCartesianZeroVector isZeroVector norm scalarVectorMult sum sum0 vectorScalarDiv vectorScalarMult @VectorValues",
"VectorValues":"CartesianThreeVectorValue CartesianVectorValue NumericalVectorValue ThreeVectorValue VectorValue",
"VerificationCases":"PassIf VerdictKind VerificationCase VerificationMethod VerificationMethodKind verificationCases",
"Views":"GraphicalRendering Rendering TabularRendering TextualRendering View ViewpointCheck asElementTable asInterconnectionDiagram asTextualNotation asTreeDiagram renderings viewpointChecks views"};
/** Membres des définitions des bases implicites (Parts::Part, Actions::Action, Occurrences::Occurrence…) : hérités par tout usage. */
const SY_LIB_FEATURES=new Set("AssignObservations SequenceFunctions StructuredCurve StructuredPoint StructuredSurface aState acceptSubactions acceptedMessage acceptedTransfer accepter actors analyze annotatedElement assignments assumptions baseType body boundingShapes cancelObservation changeObserver changeSignal checkedConstraints clock columnView concerns condition constraints controls currentTime dSelf decisionTransitions decisions delay delivering demo differencesOf dispatchScope doAction done duration earlierOccurrence edges effect elseClause enactedPerformances enclosedPerformances endShot entryAction envelopingShapes error exclusiveStates exhibitedStates exitAction faces fail falseValue forLoops forks genus happensDuring happensWhile ifSubactions ifTest immediatePredecessors immediateSuccessors includedUseCases incomingTransferSort incomingTransfers incomingTransfersToSelf inconclusive index initialization innerSpace innerSpaceDimension innerSpaceOccurrences insideOf inspect instant instantNum interfacingPorts intersectionsOf involvedObject involvedObjects involvingPerformance involvingPerformances isClosed isDispatch isInstant isMove isPassing isPush isRunToCompletion isSolid iterator joins justOutsideOfOccurrences kind laterOccurrence localClock loops matingOccurrences matingSpace matingSpaceToo merges middleTimeSlice monitor moving myselfSameLives o oSelf obj observations outerSpace outerSpaceDimension outgoingTransfers outgoingTransfersFromSelf outsideOfOccurrences ownedActions ownedPerformances ownedPorts ownedStates participant pass payload payloadNum performance performedActions performerObject performers portionOccurrence portionOf portionOfLife portionWithin portions position predecessors pushing receiver replacementValues requirementVerifications result runToCompletionScope sameLifeOccurrences sameThing seBeforeNum self self2 selfSameLives sendSubactions sender sending sentMessage sentTransfer separateOccurrence separateOccurrenceToo separateSpace separateSpaceToo seq shape shorterOccurrence signal signalClock signalCondition signalMonitor signalTime smallerOccurrence smallerSpace snapshotOccurrence snapshotOf snapshotWithin snapshots source sourceDataValue sourceEvent sourceOccurrence sourceOutputLink spaceBoundary spaceBoundaryOf spaceEnclosedOccurrences spaceInterior spaceInteriorOf spaceShotOccurrence spaceShotOf spaceShotWithin spaceShots spaceSliceOccurrence spaceSliceOf spaceSliceWithin spaceSlices spaceTimeCoincidentOccurrences spaceTimeEnclosedOccurrences spaceTimeEnclosedPoints stakeholders start startObservation startShot startTimeConstraint stateSequencing stateTransitions structuredSpaceBoundary structuredSpaceObjectCells subAnalysisCases subUseCases subVerificationCases subactions subcalculations subcases subitems subj subobjects suboccurrences subparts subperformances subports subrenderings subrequirements substates subviews successors superoccurrence surroundedByOccurrences surroundedSpace surroundingSpace t1 t1First t2 target targetDataValue targetEvent targetInputLink targetOccurrence teAfterNum terminateOccurrence terminateSubactions terminatedOccurrence test that thenClause this thisClock thisConnection thisMonitor thisOccurrence thisPerformance thisThing timeCoincidentOccurrences timeContinuityConstraint timeEnclosedOccurrences timeFlowConstraint timeInstant timeOrderingConstraint timeSignal timeSliceOccurrence timeSliceOf timeSliceWithin timeSlices touches touchesToo transfer transitionLinkSource transitions trueValue unionsOf untilTest value verdict vertices viewRendering viewpointConformance viewpointSatisfactions voids wait whileLoop whileLoops whileTest within withinBoth withoutOccurrences".split(' '));

/* ── src/js/sysml/25-kpar.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   SYSML/25. ARCHIVES .kpar — projets d'échange KerML / SysML v2 (KerML §10.3)
   Un .kpar est une archive zip : un dossier racine (souvent), .project.json (nom, version, dépendances
   « usage »), .meta.json (index paquetage → fichier, date, métamodèle) et les textes .sysml.
   Lecture synchrone (décompression DEFLATE ici même, sans DecompressionStream) et réécriture sans perte :
   les entrées non modifiées sont recopiées octet pour octet (en-têtes, champs extra, descripteurs compris),
   les textes modifiés sont réécrits sans compression (méthode « store »), le répertoire central et la fin
   d'archive sont recopiés avec leurs seules positions, tailles et sommes mises à jour.
   Défauts tolérés (constatés sur les .kpar publiés par l'OMG, docs/sysml/DOCUMENTS-NORMATIFS.md) : index de
   .meta.json vers un fichier absent (tous les textes de l'archive sont lus), fichiers parasites (.DS_Store,
   __MACOSX/ ignorés). Pas de ZIP64 (archives de plus de 4 Go). Sans DOM : chargé aussi par les tests Node.
   ═══════════════════════════════════════════════════════════════════════ */

/** Bases et bits supplémentaires des longueurs (codes 257 à 285) et des distances (DEFLATE, RFC 1951 §3.2.5). */
const SY_INF_LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const SY_INF_LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const SY_INF_DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const SY_INF_DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
/** Ordre des longueurs de code du code des longueurs (bloc à codes dynamiques). */
const SY_INF_ORDRE = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/**
 * Code de Huffman canonique construit depuis les longueurs de ses symboles.
 * @param {number[]|Uint8Array} longueurs longueur du code de chaque symbole (0 : absent)
 * @returns {{nb:Uint16Array, symboles:Uint16Array}} nombre de codes par longueur, symboles dans l'ordre canonique
 */
function syInfCode(longueurs) {
  const nb = new Uint16Array(16), symboles = new Uint16Array(longueurs.length), debut = new Uint16Array(16);
  for (const l of longueurs) nb[l]++;
  nb[0] = 0;
  for (let l = 1; l < 16; l++) debut[l] = debut[l - 1] + nb[l - 1];
  for (let s = 0; s < longueurs.length; s++) if (longueurs[s]) symboles[debut[longueurs[s]]++] = s;
  return { nb, symboles };
}

/**
 * Décompresse un flux DEFLATE brut (méthode 8 du zip).
 * @param {Uint8Array} src données compressées
 * @param {number} [taille] taille attendue (réserve la sortie d'un coup)
 * @returns {Uint8Array} données
 */
function syInflate(src, taille) {
  let out = new Uint8Array(Math.max(taille || 0, 1024)), n = 0, pos = 0, tampon = 0, nbBits = 0;
  const place = k => { if (n + k <= out.length) return; const o = new Uint8Array(Math.max(out.length * 2, n + k)); o.set(out.subarray(0, n)); out = o; };
  const bits = k => {
    while (nbBits < k) { if (pos >= src.length) throw new Error(_L('.kpar archive damaged: incomplete compressed data.')); tampon |= src[pos++] << nbBits; nbBits += 8; }
    const v = tampon & ((1 << k) - 1); tampon >>>= k; nbBits -= k; return v;
  };
  const decoder = h => {
    let code = 0, premier = 0, index = 0;
    for (let l = 1; l < 16; l++) {
      code |= bits(1);
      const c = h.nb[l];
      if (code - c < premier) return h.symboles[index + (code - premier)];
      index += c; premier += c; premier <<= 1; code <<= 1;
    }
    throw new Error(_L('.kpar archive damaged: invalid Huffman code.'));
  };
  let fixeL = null, fixeD = null, dernier = 0;
  while (!dernier) {
    dernier = bits(1);
    const type = bits(2);
    if (type === 0) {                                   // bloc non compressé
      tampon = 0; nbBits = 0;
      const len = src[pos] | (src[pos + 1] << 8); pos += 4;
      if (pos + len > src.length) throw new Error(_L('.kpar archive damaged: incomplete compressed data.'));
      place(len); out.set(src.subarray(pos, pos + len), n); n += len; pos += len;
      continue;
    }
    let hl, hd;
    if (type === 1) {                                   // codes fixes
      if (!fixeL) {
        const l = new Uint8Array(288); l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288);
        fixeL = syInfCode(l); fixeD = syInfCode(new Uint8Array(30).fill(5));
      }
      hl = fixeL; hd = fixeD;
    } else if (type === 2) {                            // codes dynamiques
      const nl = bits(5) + 257, nd = bits(5) + 1, nc = bits(4) + 4;
      const lc = new Uint8Array(19);
      for (let i = 0; i < nc; i++) lc[SY_INF_ORDRE[i]] = bits(3);
      const hc = syInfCode(lc), l = new Uint8Array(nl + nd);
      for (let i = 0; i < nl + nd;) {
        const s = decoder(hc);
        if (s < 16) { l[i++] = s; continue; }
        let r, v = 0;
        if (s === 16) { if (!i) throw new Error(_L('.kpar archive damaged: invalid Huffman code.')); v = l[i - 1]; r = 3 + bits(2); }
        else if (s === 17) r = 3 + bits(3); else r = 11 + bits(7);
        while (r-- && i < nl + nd) l[i++] = v;
      }
      hl = syInfCode(l.subarray(0, nl)); hd = syInfCode(l.subarray(nl));
    } else throw new Error(_L('.kpar archive damaged: unknown block type.'));
    for (;;) {
      const s = decoder(hl);
      if (s < 256) { place(1); out[n++] = s; continue; }
      if (s === 256) break;
      const k = s - 257, len = SY_INF_LBASE[k] + bits(SY_INF_LEXT[k]);
      const d = decoder(hd), dist = SY_INF_DBASE[d] + bits(SY_INF_DEXT[d]);
      if (dist > n) throw new Error(_L('.kpar archive damaged: distance outside the data.'));
      place(len);
      for (let i = 0; i < len; i++, n++) out[n] = out[n - dist];
    }
  }
  return out.subarray(0, n);
}

/** Table du CRC-32 (polynôme 0xEDB88320), calculée à la première utilisation. */
let SY_CRC_TABLE = null;
/**
 * CRC-32 d'un contenu (somme de contrôle des entrées zip).
 * @param {Uint8Array} o contenu @returns {number} somme (non signée)
 */
function syCrc32(o) {
  if (!SY_CRC_TABLE) {
    SY_CRC_TABLE = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; SY_CRC_TABLE[i] = c >>> 0; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < o.length; i++) c = SY_CRC_TABLE[(c ^ o[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Lit la structure d'une archive zip : entrées du répertoire central (nom, méthode, tailles, positions).
 * Le contenu d'une entrée est décompressé à la demande (syZipContenu).
 * @param {Uint8Array} o octets de l'archive
 * @returns {{octets:Uint8Array, entrees:object[], debutCentral:number, finCentral:number, fin:number}} archive
 */
function syZipLire(o) {
  const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  let fin = -1;
  for (let i = o.length - 22; i >= Math.max(0, o.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error(_L('Unreadable .kpar file: it is not a zip archive.'));
  const nb = v.getUint16(fin + 10, true), debutCentral = v.getUint32(fin + 16, true);
  if (nb === 0xFFFF || debutCentral === 0xFFFFFFFF) throw new Error(_L('.kpar file too large (ZIP64 archive): not supported.'));
  const entrees = [], dec = new TextDecoder();
  let p = debutCentral;
  for (let k = 0; k < nb; k++) {
    if (p + 46 > o.length || v.getUint32(p, true) !== 0x02014b50) throw new Error(_L('Damaged .kpar file: unreadable archive directory.'));
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    if (local + 30 > o.length || v.getUint32(local, true) !== 0x04034b50) throw new Error(_L('Damaged .kpar file: unreadable archive entry.'));
    entrees.push({
      nom: dec.decode(o.subarray(p + 46, p + 46 + ln)),
      drapeaux: v.getUint16(p + 8, true), methode: v.getUint16(p + 10, true), crc: v.getUint32(p + 16, true),
      tailleComp: v.getUint32(p + 20, true), taille: v.getUint32(p + 24, true),
      central: p, longCentral: 46 + ln + le + lc, local,
      donnees: local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    });
    p += 46 + ln + le + lc;
  }
  return { octets: o, entrees, debutCentral, finCentral: p, fin };
}

/**
 * Contenu d'une entrée de l'archive (décompressé).
 * @param {object} zip archive (syZipLire) @param {object} e entrée @returns {Uint8Array}
 */
function syZipContenu(zip, e) {
  const brut = zip.octets.subarray(e.donnees, e.donnees + e.tailleComp);
  if (e.methode === 0) return brut;
  if (e.methode === 8) return syInflate(brut, e.taille);
  throw new Error(_Lp('Entry “{a}” of the .kpar is compressed with an unknown method ({b}).', { a: e.nom, b: e.methode }));
}

/**
 * Réécrit l'archive avec des entrées remplacées, sans rien perdre du reste : les autres entrées sont recopiées
 * octet pour octet (en-tête local, données, descripteur), dans leur ordre ; les entrées remplacées sont écrites
 * sans compression ; répertoire central et fin d'archive recopiés, positions, tailles et sommes mises à jour.
 * @param {object} zip archive (syZipLire)
 * @param {Map<string, Uint8Array>} remplacements nom de l'entrée → nouveau contenu
 * @returns {Uint8Array} octets de la nouvelle archive (l'archive d'origine si rien n'est remplacé)
 */
function syZipEcrire(zip, remplacements) {
  if (!remplacements.size) return zip.octets;
  const o = zip.octets, v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  const parLocal = zip.entrees.slice().sort((a, b) => a.local - b.local);
  const morceaux = [], nouvelles = new Map();     // entrée → { position, crc, taille }
  let taille = 0;
  const ajouter = m => { morceaux.push(m); taille += m.length; };
  if (parLocal.length) ajouter(o.subarray(0, parLocal[0].local));
  parLocal.forEach((e, i) => {
    const finEntree = i + 1 < parLocal.length ? parLocal[i + 1].local : zip.debutCentral;
    const r = remplacements.get(e.nom);
    if (!r) { nouvelles.set(e, { position: taille }); ajouter(o.subarray(e.local, finEntree)); return; }
    const ln = v.getUint16(e.local + 26, true), crc = syCrc32(r);
    const h = new Uint8Array(30 + ln), w = new DataView(h.buffer);
    h.set(o.subarray(e.local, e.local + 30));
    w.setUint16(6, v.getUint16(e.local + 6, true) & ~0x0008, true);   // sans descripteur de données
    w.setUint16(8, 0, true); w.setUint32(14, crc, true); w.setUint32(18, r.length, true); w.setUint32(22, r.length, true);
    w.setUint16(28, 0, true);                                           // sans champ extra
    h.set(o.subarray(e.local + 30, e.local + 30 + ln), 30);
    nouvelles.set(e, { position: taille, crc, taille: r.length });
    ajouter(h); ajouter(r);
  });
  const debutCentral = taille;
  for (const e of zip.entrees) {
    const c = o.slice(e.central, e.central + e.longCentral), w = new DataView(c.buffer), n = nouvelles.get(e);
    w.setUint32(42, n.position, true);
    if (n.crc != null) {
      w.setUint16(8, e.drapeaux & ~0x0008, true); w.setUint16(10, 0, true);
      w.setUint32(16, n.crc, true); w.setUint32(20, n.taille, true); w.setUint32(24, n.taille, true);
    }
    ajouter(c);
  }
  const tailleCentral = taille - debutCentral;
  if (zip.finCentral < zip.fin) ajouter(o.subarray(zip.finCentral, zip.fin));   // octets entre répertoire et fin (rares)
  const f = o.slice(zip.fin), w = new DataView(f.buffer);
  w.setUint32(12, tailleCentral + (zip.fin - zip.finCentral), true); w.setUint32(16, debutCentral, true);
  ajouter(f);
  const res = new Uint8Array(taille);
  let k = 0; for (const m of morceaux) { res.set(m, k); k += m.length; }
  return res;
}

/**
 * Vrai pour un fichier étranger au projet (métadonnées du Finder de macOS) : ignoré à la lecture, recopié à l'écriture.
 * @param {string} nom chemin dans l'archive @returns {boolean}
 */
function syKparParasite(nom) { return /(^|\/)__MACOSX\/|(^|\/)\.DS_Store$/.test(nom); }

/**
 * Lit une archive .kpar : projet (.project.json), métadonnées (.meta.json) et textes .sysml (tous ceux de
 * l'archive, l'index de .meta.json n'étant pas toujours juste), triés par chemin.
 * @param {Uint8Array} octets contenu du fichier
 * @returns {{zip:object, projet:object, meta:object, racine:string, textes:Array<{chemin:string, texte:string}>, autres:string[], avertissements:string[]}}
 */
function syKparLire(octets) {
  const zip = syZipLire(octets), dec = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }), avertissements = [];
  const texte = e => { try { return dec.decode(syZipContenu(zip, e)); } catch (x) { if (x instanceof TypeError) throw new Error(_Lp('“{a}” is not UTF-8 encoded: Arcature cannot modify it safely.', { a: e.nom })); throw x; } };
  const json = e => { if (!e) return {}; try { return JSON.parse(texte(e).replace(/^﻿/, '')); } catch (x) { avertissements.push(_Lp('{a} unreadable: {b}', { a: e.nom, b: x.message })); return {}; } };
  const utiles = zip.entrees.filter(e => !e.nom.endsWith('/') && !syKparParasite(e.nom));
  const ep = utiles.find(e => /(^|\/)\.project\.json$/.test(e.nom)), em = utiles.find(e => /(^|\/)\.meta\.json$/.test(e.nom));
  const projet = json(ep), meta = json(em);
  const racine = ep ? ep.nom.replace(/\.project\.json$/, '') : '';
  const textes = utiles.filter(e => /\.sysml$/i.test(e.nom)).map(e => ({ chemin: e.nom, texte: texte(e) })).sort((a, b) => a.chemin.localeCompare(b.chemin));
  const autres = utiles.filter(e => e !== ep && e !== em && !/\.sysml$/i.test(e.nom)).map(e => e.nom);
  if (!ep) avertissements.push(_L('Archive without .project.json: it may not be a SysML v2 project.'));
  for (const [pq, f] of Object.entries(meta.index || {})) if (!textes.some(t => t.chemin === racine + f)) avertissements.push(_Lp('.meta.json: package “{a}” refers to “{b}”, which is missing from the archive.', { a: pq, b: f }));
  if (!textes.length) avertissements.push(_L('No .sysml text in the archive.'));
  return { zip, projet, meta, racine, textes, autres, avertissements };
}

/**
 * Archive .kpar réécrite avec les textes modifiés (les autres entrées recopiées telles quelles).
 * @param {object} kpar archive lue (syKparLire)
 * @param {Array<{chemin:string, texte:string}>} fichiers textes actuels
 * @returns {Uint8Array} octets (ceux d'origine si aucun texte n'a changé)
 */
function syKparEcrire(kpar, fichiers) {
  const enc = new TextEncoder(), remplacements = new Map();
  for (const f of fichiers) { const o = kpar.textes.find(t => t.chemin === f.chemin); if (o && o.texte !== f.texte) remplacements.set(f.chemin, enc.encode(f.texte)); }
  return syZipEcrire(kpar.zip, remplacements);
}

/* ── src/lecteur-sysml/socle-debut.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   LECTEUR SysML v2 — SOCLE (avant l'adaptateur du format)
   ───────────────────────────────────────────────────────────────────────
   Le lecteur autonome (pour Arcalyse) reprend tels quels les modules de lecture d'Arcature : langage
   (sysml/10), index de la bibliothèque standard (sysml/20), archives .kpar (sysml/25), adaptateur du format
   (sysml/30) et règles de ses diagnostics (sysml/45). L'adaptateur s'inscrit dans le registre des formats
   d'Arcature (28-formats.js), absent ici : ce socle en fournit un substitut vide. Rien n'est écrit : le lecteur
   ne modifie jamais les textes qu'il lit.
   ═══════════════════════════════════════════════════════════════════════ */

/** Registre des formats d'Arcature (substitut : l'adaptateur SysML s'y inscrit, personne ne le consulte). */
const FORMATS = [];

/* ── src/js/sysml/30-format.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   SYSML/30. FORMAT SysML v2 — adaptateur (S.1 lecture, S.2 écriture sans perte)
   Présente un fichier .sysml, ou les textes d'une archive .kpar (sysml/25-kpar.js : un nœud racine pour le
   projet, un par fichier), à l'interface avec le contrat de js/28-formats.js : nœuds de même forme
   que le cœur XML ({parent, enfants, prof, attrs, tag}), identifiants stables calculés (le texte n'en
   porte pas), liaisons SysML (typage, spécialisation, composition, connexions, satisfy…).
   Écriture sans perte : seules les plages modifiées du texte sont réécrites (nom et références à
   l'élément renommé, bloc doc) ; tout le reste — mise en forme, notes //, commentaires — est recopié
   tel quel. Après chaque modification le texte est relu et les identifiants sont reportés.
   Sans DOM : chargé aussi par les tests Node.
   ═══════════════════════════════════════════════════════════════════════ */

/** Familles d'éléments SysML : elles jouent le rôle des couches ARCADIA (pastilles, filtre). */
const SY_FAMILLES = { STR: _L('Structure'), BEH: _L('Behavior'), REQ: _L('Requirements & cases'), ORG: _L('Organization') };

/**
 * Famille d'une métaclasse SysML (STR, BEH, REQ, ORG).
 * @param {string} kind métaclasse
 * @returns {string}
 */
function syFamille(kind) {
  kind = String(kind || '');
  if (/^(Requirement|Concern|Constraint|AssertConstraint|Satisfy|VerifyRequirement|Case|AnalysisCase|VerificationCase|UseCase|IncludeUseCase|Viewpoint)/.test(kind)) return 'REQ';
  if (/^(Action|State|Calculation|Transition|Succession|Flow|Perform|Exhibit|Accept|Send|Assignment|If|WhileLoop|ForLoop|Terminate|Fork|Join|Merge|Decision|StateAction|EventOccurrence|BindingConnector)/.test(kind)) return 'BEH';
  if (/^(Part|Item|Port|Attribute|Enumeration|Connection|Interface|Allocation|Occurrence|Reference)/.test(kind)) return 'STR';
  return 'ORG';
}

/** Métaclasses techniques, masquées par défaut dans l'arborescence (comme les liens Capella). */
const SY_TECHNIQUES = new Set(['Import', 'SuccessionAsUsage', 'Expose', 'ElementFilterMembership', 'TextualRepresentation', 'BindingConnectorAsUsage', 'StateActionUsage', 'Comment']);

/** Lettres de l'icône de chaque sorte d'élément (définition : majuscule ; usage : minuscule). */
const SY_ICONES = { Part: 'P', Item: 'I', Attribute: 'A', Port: 'Pt', Connection: 'C', Interface: 'If', Allocation: 'Al', Flow: 'F', Action: 'Ac', State: 'S', Calculation: 'Ca',
  Constraint: 'Co', Requirement: 'R', Concern: 'Cn', Case: 'Cs', AnalysisCase: 'An', VerificationCase: 'V', UseCase: 'U', View: 'Vw', Viewpoint: 'Vp', Rendering: 'Rd', Metadata: '@',
  Occurrence: 'O', Enumeration: 'E', EventOccurrence: 'Ev', Reference: 'r', Import: '⇢', Alias: '≡', Comment: '"', Dependency: '⤳', Transition: '→', Succession: '⇒',
  SatisfyRequirement: '✓', VerifyRequirement: '✔', PerformAction: '▶', ExhibitState: '◉', IncludeUseCase: '+', ForkNode: '‖', JoinNode: '‖', MergeNode: '◇', DecisionNode: '◇',
  BindingConnectorAs: '=', AcceptAction: '⌛', SendAction: '✉', AssignmentAction: ':=', IfAction: '?', WhileLoopAction: '↻', ForLoopAction: '↻', TerminateAction: '■', StateAction: 's',
  Expose: '👁', AssertConstraint: '!', SuccessionFlow: 'F' };

/** Relations SysML montrées dans la rubrique « Liaisons », dans l'ordre d'affichage. */
const SY_RELATIONS = ['typage', 'specialisation', 'sous-ensemble', 'redefinition', 'composition', 'reference', 'connexion', 'flux', 'liaison', 'allocation',
  'succession', 'transition', 'perform', 'exhibit', 'satisfy', 'verify', 'sujet', 'acteur', 'inclusion', 'dependance', 'import', 'metadonnee'];

/**
 * Libellé d'une relation SysML vue d'un côté.
 * @param {string} rel relation (SY_RELATIONS)
 * @param {string} sens 'sortant' ou 'entrant'
 * @returns {string}
 */
function syLibelleRelation(rel, sens) {
  const s = sens === 'sortant';
  switch (rel) {
    case 'typage': return s ? _L('Typed by (:)') : _L('Type of');
    case 'specialisation': return s ? _L('Specializes (:>)') : _L('Specialized by');
    case 'sous-ensemble': return s ? _L('Subset of (subsets)') : _L('Has subset');
    case 'redefinition': return s ? _L('Redefines (:>>)') : _L('Redefined by');
    case 'composition': return s ? _L('Contains (composite member)') : _L('Composite member of');
    case 'reference': return s ? _L('References (ref)') : _L('Referenced by (ref)');
    case 'connexion': return s ? _L('Connected to') : _L('Connected from');
    case 'flux': return s ? _L('Flow to') : _L('Flow from');
    case 'liaison': return s ? _L('Bound (bind) to') : _L('Bound (bind) from');
    case 'allocation': return s ? _L('Allocated to (allocate)') : _L('Receives the allocation of');
    case 'succession': return s ? _L('Followed by (then)') : _L('Preceded by');
    case 'transition': return s ? _L('Transition to') : _L('Transition from');
    case 'perform': return s ? _L('Performs (perform)') : _L('Performed by (perform)');
    case 'exhibit': return s ? _L('Exhibits (exhibit)') : _L('Exhibited by (exhibit)');
    case 'satisfy': return s ? _L('Satisfies (satisfy)') : _L('Satisfied by');
    case 'verify': return s ? _L('Verifies (verify)') : _L('Verified by');
    case 'sujet': return s ? _L('Has subject') : _L('Subject of');
    case 'acteur': return s ? _L('Has actor') : _L('Actor of');
    case 'inclusion': return s ? _L('Includes (include)') : _L('Included by');
    case 'dependance': return s ? _L('Depends on') : _L('Dependency of');
    case 'import': return s ? _L('Imports') : _L('Imported by');
    default: return s ? _L('Applied metadata') : _L('Applied to');
  }
}

/**
 * Empreinte courte et stable d'un texte (FNV-1a, deux passes, en base 36) : identifiants des éléments.
 * @param {string} s texte
 * @returns {string}
 */
function syEmpreinte(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ (c + i), 2246822519) >>> 0; }
  return h1.toString(36) + (h2 & 0xfffff).toString(36);
}

/**
 * Attribue un identifiant stable à chaque élément : empreinte du chemin qualifié (métaclasse:nom des
 * propriétaires successifs ; rang pour un élément anonyme). Il survit au rechargement et à la plupart des
 * modifications faites ailleurs, ce qui permettra d'y accrocher mise en page et commentaires.
 * @param {object} M modèle (syBuildModel)
 */
function syAttribuerIds(M) {
  const pris = new Set();
  const unique = cle => { let id = 'sy' + syEmpreinte(cle); while (pris.has(id)) id += 'x'; pris.add(id); return id; };
  const parcourir = (el, cle, racine) => {
    const anonymes = {};
    for (const m of el.members) {
      if (m.kind === 'Documentation') continue;
      let seg;
      if (m.name && m.kind !== 'Comment') seg = m.kind + ':' + m.name + (m.shortName ? '<' + m.shortName + '>' : '');
      else { const k = m.kind + (m.shortName || ''); anonymes[k] = (anonymes[k] || 0) + 1; seg = (racine ? el.name + '|' : '') + m.kind + '#' + anonymes[k]; }
      const mk = cle + '/' + seg;
      m._id = unique(mk);
      parcourir(m, mk, false);
    }
  };
  for (const f of M.files) { f.root._id = unique('file:' + f.path); parcourir(f.root, '', true); }
}

/**
 * Libellé d'un élément anonyme : extrémités d'une connexion, d'une succession ou d'une transition
 * (« arret → marche »), type d'un usage sans nom (« : Transmission »), expression d'une contrainte.
 * @param {object} el élément SysML
 * @returns {string} libellé ('' si rien d'utile)
 */
function syNomCalcule(el) {
  const bout = e => e ? (e.el ? (e.el.name || e.el.keyword) : e.ref === '@entry' ? 'entry' : e.ref || '?') : '?';
  const E = el.ends.filter(Boolean);
  if (/Transition|Succession/.test(el.kind) && E.length) return bout(el.ends[0]) + ' → ' + bout(el.ends[1]);
  if (E.length > 1) return E.map(bout).join(el.kind === 'BindingConnectorAsUsage' ? ' = ' : /Flow|Allocation/.test(el.kind) ? ' → ' : ' ↔ ');
  if (el.refs.typedBy) return ': ' + el.refs.typedBy.join(', ');
  if (el.exprs.length) { const x = el.exprs.join('; '); return '{ ' + (x.length > 60 ? x.slice(0, 59) + '…' : x) + ' }'; }
  if (el.kind === 'Comment' && el.body) { const b = el.body.replace(/\s+/g, ' '); return '/* ' + (b.length > 50 ? b.slice(0, 49) + '…' : b) + ' */'; }
  return el.text || '';
}

/**
 * Élément racine d'un projet .kpar (pas un élément SysML) : il contient les espaces de noms des fichiers.
 * @param {object} M modèle @param {object} projet { nom, fichier, version, description, dependances }
 * @returns {object} élément de même forme que ceux du lecteur
 */
function syElementProjet(M, projet) {
  return { kind: 'Namespace', isFileRoot: true, isProject: true, _id: 'syprojet', name: projet.nom, shortName: '', keyword: '', vis: '',
    members: M.files.map(f => f.root), mods: {}, refs: {}, res: {}, ends: [], docs: projet.description ? [projet.description] : [], meta: [], exprs: [],
    file: projet.fichier, line: 0, projet };
}

/**
 * Construit le document présenté à l'interface : un nœud par élément SysML (documentation exceptée),
 * attributs lisibles (déclaration, nom qualifié, multiplicité, valeur…) et références « #id ».
 * @param {object} M modèle (syBuildModel)
 * @param {string|Uint8Array} src contenu d'origine (texte, ou octets d'une archive .kpar)
 * @param {object} [ancien] document précédent (relecture après modification) : ses identifiants sont reportés
 * @param {object} [projet] projet d'une archive .kpar : racine qui contient un nœud par fichier
 * @returns {{racine:object, parId:Map, src:(string|Uint8Array), M:object, diags:object[]}} document
 */
function syDocument(M, src, ancien, projet) {
  syAttribuerIds(M);
  if (ancien) syReporterIds(ancien.M, M);
  const etats = syRetenirEtat(M, ancien && ancien.etats);
  const parId = new Map();
  const ids = l => (l || []).map(r => r && r.el && r.el._id ? '#' + r.el._id : '').filter(Boolean).join(' ');
  const noeud = (el, parent, prof) => {
    const attrs = [], ajout = (n, v) => { if (v != null && v !== '' && !attrs.some(a => a.n === n)) attrs.push({ n, v: String(v) }); };
    ajout('id', el._id);
    ajout('name', el.name || (el.isFileRoot ? '' : syNomCalcule(el)));
    if (!el.name && !el.isFileRoot) ajout('anonymous', 'true');
    ajout('shortName', el.shortName);
    ajout('keyword', el.keyword);
    if (!el.isFileRoot) { ajout('declaration', syDeclText(el)); if (el.name && el.kind !== 'Import') ajout('qualifiedName', syQualified(el)); }
    else ajout('file', el.isProject ? el.file : el.name);
    if (el.isProject) { ajout('version', el.projet.version); ajout('dependencies', el.projet.dependances); ajout('metamodel', el.projet.metamodele); }
    if (el.vis && el.vis !== 'public') ajout('visibility', el.vis);
    ajout('multiplicity', el.mult); ajout('value', el.value); ajout('direction', el.dir);
    for (const m of ['abstract', 'variation', 'variant', 'ref', 'end', 'derived', 'constant', 'individual', 'ordered', 'nonunique']) if (el.mods[m]) ajout('is' + m[0].toUpperCase() + m.slice(1), 'true');
    if (el.conjugated) ajout('isConjugated', 'true');
    ajout('role', el.role); ajout('triggerText', el.trigger); ajout('guard', el.guard); ajout('effect', el.effect);
    if (el.exprs.length) ajout('expression', el.exprs.join(' ; '));
    const doc = (el.kind === 'Comment' || el.kind === 'TextualRepresentation') ? el.body : el.docs.filter(Boolean).join('\n\n');
    if (doc) ajout('description', doc.split(/\n\s*\n/).map(p => '<p>' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>').join(''));
    const lib = [];
    for (const [k, a] of [['typedBy', 'typedBy'], ['specializes', 'specializes'], ['subsets', 'subsets'], ['redefines', 'redefines'], ['references', 'references'],
      ['about', 'annotatedElement'], ['item', 'itemType'], ['trigger', 'trigger'], ['requirement', 'requirement'], ['by', 'satisfyingFeature'], ['target', 'target'], ['source', 'source']]) {
      if (!el.res[k]) continue;
      ajout(a, ids(el.res[k]));
      for (const r of el.res[k]) if (r && r.lib && !r.inherited) lib.push(r.lib.replace(/^\*::/, ''));
    }
    if (el.kind === 'Import' && el.res.target && el.res.target[0] && el.res.target[0].el) ajout('importedNamespace', '#' + el.res.target[0].el._id);
    if (el.kind !== 'Dependency') {
      const a = el.ends[0] && el.ends[0].res && el.ends[0].res.el, b = el.ends.slice(1).map(e => e && e.res && e.res.el).filter(Boolean);
      if (a) ajout('source', '#' + a._id);
      if (b.length) ajout('target', b.map(x => '#' + x._id).join(' '));
    }
    if (lib.length) ajout('library', [...new Set(lib)].join(' '));
    if (el.meta.length) ajout('metadata', [...new Set(el.meta)].join(' '));
    if (el.line) ajout('position', el.file + ':' + el.line);
    const n = { tag: el.isFileRoot ? 'Namespace' : el.kind, parent, enfants: [], prof, attrs, sy: el };
    parId.set(el._id, n);
    for (const m of el.members) if (m.kind !== 'Documentation') n.enfants.push(noeud(m, n, prof + 1));
    return n;
  };
  const racine = noeud(projet ? syElementProjet(M, projet) : M.files[0].root, null, 0);
  return { racine, parId, src, M, diags: M.diags, etats };
}

/** Nombre d'états du texte dont les identifiants sont retenus (au-delà, les plus anciens sont oubliés). */
const SY_ETATS_MAX = 1000;

/**
 * Éléments qui portent un identifiant, dans l'ordre où syAttribuerIds les parcourt : racine de chaque fichier, puis
 * membres (sauf la documentation) en profondeur. Deux lectures d'un même texte donnent la même suite.
 * @param {object} M modèle @returns {object[]}
 */
function syElementsIdentifies(M) {
  const l = [];
  const parcourir = el => { l.push(el); for (const m of el.members) if (m.kind !== 'Documentation') parcourir(m); };
  for (const f of M.files) parcourir(f.root);
  return l;
}

/**
 * Clé d'un état du texte : chemin, longueur et empreinte de chaque fichier.
 * @param {object} M modèle @returns {string}
 */
function syCleEtat(M) { return M.files.map(f => f.path + '\u0000' + f.text.length + '\u0000' + syEmpreinte(f.text)).join('\u0001'); }

/**
 * Identifiants d'un état du texte, retenus pour y revenir à l'identique. Les identifiants calculés puis reportés
 * (syAttribuerIds, syReporterIds) dépendent du chemin d'arrivée : un élément renommé garde l'identifiant de son ancien
 * nom, mais s'il disparaît puis revient (suppression annulée), il recevrait celui de son nom actuel, et une opération
 * plus ancienne du journal qui le désigne ne le retrouverait plus. Un texte déjà vu reprend donc les identifiants
 * qu'il avait : annuler et rétablir rendent exactement les mêmes éléments.
 * @param {object} M nouveau modèle (identifiants posés, remplacés au besoin)
 * @param {Map<string, string[]>} [etats] identifiants retenus par état (ceux du document précédent)
 * @returns {Map<string, string[]>} les mêmes, complétés de cet état
 */
function syRetenirEtat(M, etats) {
  etats = etats || new Map();
  const cle = syCleEtat(M), els = syElementsIdentifies(M), connus = etats.get(cle);
  if (connus && connus.length === els.length) els.forEach((el, i) => { el._id = connus[i]; });
  etats.delete(cle);
  etats.set(cle, els.map(el => el._id));
  while (etats.size > SY_ETATS_MAX) etats.delete(etats.keys().next().value);
  return etats;
}

/**
 * Liaisons du document SysML : références brutes (attributs « #id ») sortantes et entrantes, et liaisons
 * métier SysML vues des deux côtés. Même forme que liaCalculer.
 * @param {object} doc document syDocument
 * @returns {{doc:object, metier:Map, sortantes:Map, entrantes:Map}}
 */
function syLiaisons(doc) {
  const metier = new Map(), sortantes = new Map(), entrantes = new Map();
  const pousser = (m, el, x) => { const l = m.get(el); if (l) l.push(x); else m.set(el, [x]); };
  const N = el => el && el._id ? doc.parId.get(el._id) || null : null;
  const lier = (rel, a, b, via) => {
    a = N(a); b = N(b); if (!a || !b || a === b || !a.parent || !b.parent) return;
    via = via ? N(via) : null;
    pousser(metier, a, { rel, sens: 'sortant', autre: b, via });
    pousser(metier, b, { rel, sens: 'entrant', autre: a, via });
  };
  const els = l => (l || []).map(r => r && r.el).filter(Boolean);
  const bout = e => e && e.res && e.res.el || null;
  const STRUCT = /^(Part|Item|Port|Occurrence|Connection|Interface|Allocation|Reference)/;
  const porteur = el => { let p = el.owner; while (p && !/^(Part|Item|Occurrence)/.test(p.kind) && !p.isFileRoot) p = p.owner; return p && !p.isFileRoot ? p : null; };
  // Références brutes
  for (const n of doc.parId.values()) for (const a of n.attrs) {
    const r = syEstReference(a.n, a.v); if (!r) continue;
    for (const id of r) { const c = doc.parId.get(id) || null; pousser(sortantes, n, { attr: a.n, cible: c, id }); if (c) pousser(entrantes, c, { attr: a.n, source: n }); }
  }
  // Liaisons métier
  for (const el of doc.M.all) {
    const R = el.res, o = el.owner;
    if (!el.isDef) els(R.typedBy).forEach(t => lier('typage', el, t));
    if (el.isDef) els(R.specializes).forEach(t => lier('specialisation', el, t));
    if (!el.isRefUsage) els(R.subsets).forEach(t => lier('sous-ensemble', el, t));
    els(R.redefines).forEach(t => lier('redefinition', el, t));
    if (o && !o.isFileRoot && /^(PartUsage|ItemUsage|PortUsage|OccurrenceUsage)$/.test(el.kind) && STRUCT.test(o.kind)) lier(el.mods.ref ? 'reference' : 'composition', o, el);
    const a = bout(el.ends[0]), suite = el.ends.slice(1).map(bout).filter(Boolean);
    if (el.kind === 'ConnectionUsage' || el.kind === 'InterfaceUsage') suite.forEach(b => lier('connexion', a, b, el));
    else if (el.kind === 'BindingConnectorAsUsage') suite.forEach(b => lier('liaison', a, b, el));
    else if (el.kind === 'AllocationUsage') suite.forEach(b => lier('allocation', a, b, el));
    else if (/^(FlowUsage|SuccessionFlowUsage)$/.test(el.kind)) suite.forEach(b => lier('flux', a, b, el));
    else if (el.kind === 'SuccessionAsUsage') suite.forEach(b => lier('succession', a, b, el));
    else if (el.kind === 'TransitionUsage') suite.forEach(b => lier('transition', a, b, el));
    // perform / exhibit : action ou état visé (« perform a.b ») ; déclaré sur place (« perform action x : X ») : lui-même
    if (el.kind === 'PerformActionUsage') lier('perform', porteur(el), el.isRefUsage ? els(R.subsets)[0] : el, el.isRefUsage ? el : null);
    if (el.kind === 'ExhibitStateUsage') lier('exhibit', porteur(el), el.isRefUsage ? els(R.subsets)[0] : el, el.isRefUsage ? el : null);
    if (el.kind === 'SatisfyRequirementUsage') lier('satisfy', els(R.by)[0] || (o && !o.isFileRoot && o.kind !== 'Package' ? o : null), els(R.requirement)[0] || els(R.typedBy)[0], el);
    if (el.kind === 'VerifyRequirementUsage' || el.reqRole === 'verify') { let v = o; while (v && !/^VerificationCase/.test(v.kind) && !v.isFileRoot) v = v.owner; lier('verify', v && !v.isFileRoot ? v : o, els(R.requirement)[0] || els(R.typedBy)[0], el); }
    if (el.role === 'subject' && o) els(R.typedBy).forEach(t => lier('sujet', o, t, el));
    if ((el.role === 'actor' || el.role === 'stakeholder') && o) els(R.typedBy).forEach(t => lier('acteur', o, t, el));
    if (el.kind === 'IncludeUseCaseUsage') lier('inclusion', o, els(R.subsets)[0] || els(R.typedBy)[0], el);
    if (el.kind === 'Dependency') els(R.source).forEach(s => els(R.target).forEach(t => lier('dependance', s, t, el)));
    if (el.kind === 'Import' && R.target && R.target[0] && R.target[0].el && o && !o.isFileRoot) lier('import', o, R.target[0].el, el);
    if (el.kind === 'MetadataUsage') { const t = els(R.typedBy)[0], c = els(R.about); (c.length ? c : [o]).forEach(x => lier('metadonnee', x, t, el)); }
  }
  return { doc, metier, sortantes, entrantes };
}

/**
 * Identifiants référencés par un attribut « #a #b » d'un nœud SysML, ou null (attribut de texte).
 * @param {string} nom nom de l'attribut
 * @param {string} v valeur
 * @returns {string[]|null}
 */
function syEstReference(nom, v) {
  if (nom === 'id' || nom === 'name' || nom === 'description' || nom === 'declaration' || !/^#\S+( #\S+)*$/.test(v)) return null;
  return v.split(' ').map(r => r.slice(1));
}

/** Refus d'une opération non encore disponible pour SysML v2 (création, suppression, déplacement). */
function syLectureSeule() { throw new Error(_L('Operation not yet available for SysML v2: only the name and documentation can be modified.')); }

/**
 * Reporte les identifiants d'une lecture précédente sur une nouvelle, par parcours parallèle des deux arbres :
 * un renommage ou une documentation modifiée ne change pas la structure, chaque élément garde donc son identifiant
 * (le journal, l'élément affiché et l'arborescence le retrouvent). Quand des membres ont été ajoutés ou retirés, les
 * autres sont appariés dans l'ordre par sorte et par nom ; les nouveaux gardent leur identifiant calculé (rendu unique).
 * @param {object} A modèle précédent @param {object} B nouveau modèle
 */
function syReporterIds(A, B) {
  const membres = el => el.members.filter(m => m.kind !== 'Documentation');
  const pris = new Set(), reportes = new Set();
  const meme = (a, b) => a.kind === b.kind && (a.name || '') === (b.name || '');
  const marcher = (a, b) => {
    if (!a || !b || a.kind !== b.kind) return;
    if (a._id && !pris.has(a._id)) { b._id = a._id; pris.add(a._id); reportes.add(b); }
    const ma = membres(a), mb = membres(b);
    if (ma.length === mb.length) {
      // Mêmes membres dans un autre ordre (ordre changé parmi les frères) : appariés par sorte et par nom, l'identifiant suit
      // l'élément ; sinon (renommage…) appariés par rang
      const cle = m => m.kind + '|' + (m.name || ''), ka = ma.map(cle), kb = mb.map(cle);
      if (ka.some((k, i) => k !== kb[i]) && ka.slice().sort().join('\n') === kb.slice().sort().join('\n')) {
        const restants = new Map();
        mb.forEach((m, i) => { const k = kb[i]; if (!restants.has(k)) restants.set(k, []); restants.get(k).push(m); });
        ma.forEach((m, i) => marcher(m, restants.get(ka[i]).shift()));
        return;
      }
      for (let i = 0; i < ma.length; i++) marcher(ma[i], mb[i]);
      return;
    }
    // Membres ajoutés ou retirés (création, suppression) : les autres sont appariés dans l'ordre, par sorte et par nom
    let i = 0, j = 0;
    while (i < ma.length && j < mb.length) {
      if (meme(ma[i], mb[j])) { marcher(ma[i], mb[j]); i++; j++; }
      else if (mb.length > ma.length) j++; else i++;
    }
  };
  for (let i = 0; i < Math.min(A.files.length, B.files.length); i++) marcher(A.files[i].root, B.files[i].root);
  // Un élément nouveau ne prend pas l'identifiant reporté d'un autre (élément renommé dont l'ancien nom est réutilisé)
  const vus = new Set(pris);
  for (const f of B.files) (function verifier(el) {
    if (!reportes.has(el)) { while (vus.has(el._id)) el._id += 'x'; vus.add(el._id); }
    for (const m of el.members) if (m.kind !== 'Documentation') verifier(m);
  })(f.root);
}

/**
 * Relit les textes modifiés et met le document à jour sur place (même objet : ARC.doc reste valable),
 * identifiants reportés de la lecture précédente. Un .sysml garde son texte dans doc.src ; une archive .kpar
 * garde ses octets d'origine (ecrire la réécrit).
 * @param {object} doc document @param {string[]} textes nouveau texte de chaque fichier (ordre de doc.fichiers)
 */
function syRelire(doc, textes) {
  const fichiers = doc.fichiers.map((f, i) => ({ chemin: f.chemin, texte: textes[i] }));
  const nouveau = syDocument(syBuildModel(fichiers.map(f => ({ path: f.chemin, text: f.texte }))), doc.src, doc, doc.projet);
  for (const k of ['racine', 'parId', 'M', 'diags', 'etats']) doc[k] = nouveau[k];
  doc.fichiers = fichiers;
  if (!doc.kpar && !doc.dossier) doc.src = textes[0];
}

/**
 * Texte actuel du fichier qui contient un élément.
 * @param {object} doc document @param {string} chemin chemin du fichier (el.file) @returns {string}
 */
function syTexte(doc, chemin) { const f = doc.fichiers.find(x => x.chemin === chemin); return f ? f.texte : ''; }

/**
 * Texte brut d'une description HTML (éditeur de description) : paragraphes séparés par une ligne vide,
 * sauts de ligne conservés, balises retirées, entités décodées.
 * @param {string} html @returns {string}
 */
function syHtmlVersTexte(html) {
  return String(html || '').replace(/\r/g, '')
    .replace(/<\/(p|div|h[1-6]|li|pre|blockquote)>\s*/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Marge (espaces et tabulations) de la ligne qui contient une position du texte.
 * @param {string} src texte @param {number} o position @returns {string}
 */
function syMarge(src, o) {
  const d = src.lastIndexOf('\n', o - 1) + 1;
  return src.slice(d, o).match(/^[ \t]*/)[0];
}

/**
 * Bloc « doc » écrit comme dans les exemples de la spécification : sur une ligne si le texte est court,
 * sinon sur plusieurs lignes préfixées par « * ». « *\/ » dans le texte est neutralisé.
 * @param {string} texte texte brut @param {string} marge marge des lignes suivantes
 * @returns {string}
 */
function syFormaterDoc(texte, marge) {
  const t = texte.replace(/\*\//g, '* /');
  if (!/\n/.test(t) && t.length <= 80) return 'doc /* ' + t + ' */';
  return 'doc\n' + marge + '/*\n' + t.split('\n').map(l => marge + ' *' + (l ? ' ' + l : '')).join('\n') + '\n' + marge + ' */';
}

/**
 * Remplacements à faire dans le texte pour renommer un élément : son nom déclaré et chaque référence qui le
 * désigne (directement ou comme segment d'un nom qualifié, d'une chaîne a.b, d'un import), retrouvées par la
 * résolution des noms. Les expressions (contraintes, calculs) ne sont pas résolues : elles ne sont pas modifiées.
 * @param {object} doc document @param {object} cible élément SysML renommé @param {string} nouveau nouveau nom
 * @returns {{f:string, s:number, e:number, t:string}[]} remplacements (f : chemin du fichier)
 */
function syEditionsNom(doc, cible, nouveau) {
  const M = doc.M, ancien = cible.name, t = syQuote(nouveau), eds = [{ f: cible.file, s: cible.nameTok.o, e: cible.nameTok.e, t }];
  // Élément le plus intérieur du fichier dont la plage contient une position
  const porteur = (chemin, o) => { let best = null; for (const el of M.all) if (el.file === chemin && el.debut != null && el.debut <= o && o < el.fin && (!best || el.debut >= best.debut && el.fin <= best.fin)) best = el; return best; };
  /** Vrai si une référence écrite de l'élément passe par la cible sur un segment portant l'ancien nom. */
  const designe = (el, ref, ctx, self) => {
    const segs = sySegmentsRef(String(ref || '').replace(/^~/, ''));
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].n !== ancien) continue;
      const pre = segs.slice(0, i + 1).map(x => x.brut).join('');
      const r = (self && syResolve(M, pre, ctx, self, 'renommage')) || syResolve(M, pre, ctx, null, 'renommage');
      if (r && r.el === cible) return true;
    }
    return false;
  };
  for (const fichier of doc.fichiers) for (const k of syLex(fichier.texte, '', [])) {
    if (k.t !== 'id' || k.v !== ancien || (fichier.chemin === cible.file && k.o === cible.nameTok.o)) continue;
    const el = porteur(fichier.chemin, k.o); if (!el) continue;
    const ctx = el.owner || el;
    const refs = [];
    for (const key of Object.keys(el.refs)) for (const r of el.refs[key]) refs.push([r, ctx, el]);
    for (const e of el.ends) if (e && e.ref) refs.push([e.ref, ctx, null]);
    if (el.kind === 'Import' && el.target) refs.push([el.target, el.owner, null]);
    if (refs.some(([r, c, s]) => designe(el, r, c, s))) eds.push({ f: fichier.chemin, s: k.o, e: k.e, t });
  }
  return eds;
}

/**
 * Remplacements pour fixer la documentation d'un élément : bloc doc existant remplacé (les suivants retirés),
 * ou ajouté en tête du corps (corps créé si l'élément se termine par « ; ») ; texte vide : blocs doc retirés.
 * @param {object} doc document @param {object} el élément SysML @param {string} texte texte brut
 * @returns {{f:string, s:number, e:number, t:string}[]} remplacements (f : chemin du fichier)
 */
function syEditionsDoc(doc, el, texte) {
  return syEditionsDocTexte(syTexte(doc, el.file), el, texte).map(x => Object.assign(x, { f: el.file }));
}

/**
 * Remplacements de la documentation dans le texte du fichier de l'élément (voir syEditionsDoc).
 * @param {string} src texte du fichier @param {object} el élément SysML @param {string} texte texte brut
 * @returns {{s:number, e:number, t:string}[]} remplacements
 */
function syEditionsDocTexte(src, el, texte) {
  const docs = el.members.filter(m => m.kind === 'Documentation' && m.debut != null);
  /** Plage d'un membre étendue à sa ligne entière s'il est seul dessus (retrait sans laisser de ligne vide). */
  const ligne = m => { let s0 = m.debut, e0 = m.fin; const d = src.lastIndexOf('\n', s0 - 1) + 1, f = src.indexOf('\n', e0);
    if (/^[ \t]*$/.test(src.slice(d, s0)) && /^[ \t]*$/.test(src.slice(e0, f < 0 ? src.length : f))) { s0 = d; e0 = f < 0 ? src.length : f + 1; } return { s: s0, e: e0, t: '' }; };
  if (!texte) return docs.map(ligne);
  if (docs.length) {
    const marge = syMarge(src, docs[0].debut);
    return [{ s: docs[0].debut, e: docs[0].fin, t: syFormaterDoc(texte, marge) }, ...docs.slice(1).map(ligne)];
  }
  const marge = syMarge(src, el.debut) + '    ';
  if (el.ouvre != null) return [{ s: el.ouvre + 1, e: el.ouvre + 1, t: '\n' + marge + syFormaterDoc(texte, marge) }];
  if (el.pointVirgule != null) return [{ s: el.pointVirgule, e: el.pointVirgule + 1, t: ' {\n' + marge + syFormaterDoc(texte, marge) + '\n' + syMarge(src, el.debut) + '}' }];
  throw new Error(_L('Documentation cannot be placed for this element.'));
}

/**
 * Applique des remplacements disjoints au texte (de la fin vers le début, les positions restent valables).
 * @param {string} src texte @param {{s:number, e:number, t:string}[]} eds remplacements @returns {string}
 */
function syAppliquer(src, eds) {
  let out = src;
  for (const x of eds.slice().sort((a, b) => b.s - a.s)) out = out.slice(0, x.s) + x.t + out.slice(x.e);
  return out;
}

/**
 * Applique des remplacements répartis entre les fichiers du document.
 * @param {object} doc document @param {{f:string, s:number, e:number, t:string}[]} eds remplacements
 * @returns {string[]} nouveaux textes (ordre de doc.fichiers)
 */
function syAppliquerFichiers(doc, eds) {
  return doc.fichiers.map(x => syAppliquer(x.texte, eds.filter(e => e.f === x.chemin)));
}

/**
 * Vrai si deux états du document (textes de ses fichiers) sont identiques.
 * @param {string[]} a @param {string[]} b @returns {boolean}
 */
function syMemeEtat(a, b) { return a.length === b.length && a.every((t, i) => t === b[i]); }

/**
 * Modifie un attribut d'un élément SysML en réécrivant les seules plages concernées, puis relit le texte.
 * Annuler et rétablir retrouvent le texte exact d'avant ou d'après (historique des textes du document).
 * @param {object} doc document @param {object} n nœud @param {string} attr 'name' ou 'description'
 * @param {string|null} v nouvelle valeur (description : HTML de l'éditeur)
 */
function syDefinirAttr(doc, n, attr, v) {
  const el = n.sy, cle = FMT_SYSML.id(n) + '|' + attr, actuel = FMT_SYSML.attr(n, attr) ?? null;
  doc.historique = doc.historique || [];
  const etat = doc.fichiers.map(f => f.texte);
  const h = doc.historique.find(x => x.cle === cle && syMemeEtat(x.apres, etat) && x.vAvant === v) || null;
  const h2 = !h && doc.historique.find(x => x.cle === cle && syMemeEtat(x.avant, etat) && x.vApres === v) || null;
  let textes;
  if (h) textes = h.avant;                // annuler : textes exacts d'avant la modification
  else if (h2) textes = h2.apres;         // rétablir : textes exacts d'après
  else {
    if (!FMT_SYSML.modifiable(n, attr)) throw new Error(_Lp('“{a}” cannot be modified for this SysML element.', { a: attr }));
    let eds;
    if (attr === 'name') {
      const nom = String(v ?? '').trim();
      if (!nom) throw new Error(_L('A named SysML element keeps a name: enter one.'));
      eds = syEditionsNom(doc, el, nom);
    } else {
      const brut = syHtmlVersTexte(v);
      if (brut === syHtmlVersTexte(actuel)) return; // même texte : le fichier n'est pas reformaté
      eds = syEditionsDoc(doc, el, brut);
    }
    textes = syAppliquerFichiers(doc, eds);
    doc.historique.push({ cle, avant: etat, apres: textes, vAvant: actuel, vApres: v });
  }
  syRelire(doc, textes);
}

/**
 * Lit une archive .kpar : textes lus ensemble (les noms se résolvent d'un fichier à l'autre), sous un nœud de projet.
 * @param {Uint8Array} octets contenu de l'archive @param {string} nom nom du fichier
 * @returns {object} document (doc.kpar : archive lue, doc.src : octets d'origine)
 */
function syLireKpar(octets, nom) {
  const kpar = syKparLire(octets), p = kpar.projet;
  const dependances = (Array.isArray(p.usage) ? p.usage : []).map(u => u && u.resource ? u.resource.split('/').pop() + (u.versionConstraint ? ' ' + u.versionConstraint : '') : '').filter(Boolean).join(', ');
  const projet = { nom: p.name || nom, fichier: nom, version: p.version, description: p.description, dependances, metamodele: kpar.meta.metamodel };
  const fichiers = kpar.textes.map(t => ({ chemin: t.chemin, texte: t.texte }));
  const M = syBuildModel(fichiers.map(f => ({ path: f.chemin, text: f.texte })));
  for (const a of kpar.avertissements) M.diags.push({ severity: 'warning', code: 'W-KPAR', message: a, line: 0, column: 0, file: nom });
  const doc = syDocument(M, octets, null, projet);
  Object.assign(doc, { fichiers, kpar, projet });
  return doc;
}

/**
 * Lit les textes .sysml d'un dossier de projet ensemble (ils s'importent d'un fichier à l'autre), sous un nœud de projet
 * portant le nom du dossier, comme ceux d'une archive .kpar.
 * @param {Array<{chemin:string, texte:string}>} fichiers textes, chemins relatifs au dossier
 * @param {string} nom nom du dossier
 * @returns {object} document (doc.dossier : vrai ; ecrire rend les textes de tous les fichiers)
 */
function syLireDossier(fichiers, nom) {
  const liste = fichiers.map(f => ({ chemin: f.chemin, texte: f.texte })).sort((a, b) => a.chemin.localeCompare(b.chemin));
  const projet = { nom, fichier: nom };
  const doc = syDocument(syBuildModel(liste.map(f => ({ path: f.chemin, text: f.texte }))), null, null, projet);
  Object.assign(doc, { fichiers: liste, projet, dossier: true, nom });
  doc.erreursOrigine = doc.diags.filter(d => d.severity === 'error').length;
  doc.diagsOrigine = doc.diags.slice();               // diagnostics de l'ouverture : erreurs nouvelles (45-validation.js)
  return doc;
}

/** Adaptateur du format SysML v2 (notation textuelle .sysml, archive .kpar, dossier de .sysml) : nom et documentation modifiables, sans perte. */
const FMT_SYSML = {
  cle: 'sysml',
  nom: 'SysML v2',
  fichiers: { description: _L('SysML v2 model'), mime: 'text/plain', extensions: ['.sysml', '.kpar'], dossier: ['.sysml', '.kpar'], parDefaut: 'modele.sysml' },
  capacites: { modifier: true, creer: false, diagnostic: false, relecture: true },
  /** Pas de diagrammes pour l'instant (S.4). */
  diagrammes: null,
  /** Simulation (sysml/40-simulation.js) : machines à états, flux d'actions, contraintes ; sans diagramme à animer. */
  simulation: {
    /** @param {object} doc @returns {object[]} simulations proposées sur tout le modèle */
    simulables(doc) { return sySimSimulables(doc); },
    /** @param {object} doc @param {object} n @returns {object[]} simulations proposées sur un élément */
    pour(doc, n) { return sySimPour(doc, n); },
    /** @param {object} doc @param {object|null} n @param {string} cle @returns {object} représentation neutre ou { erreur } */
    preparer(doc, n, cle) { return sySimPreparer(doc, cle); },
    /** Pas de diagrammes SysML : rien à ouvrir ni à animer. @returns {Array} */
    diagrammes() { return []; },
    /** @returns {string} aucun diagramme affiché */
    affiche() { return ''; },
    /** Sans objet. */
    ouvrir() {},
    /** Sans objet. */
    animer() {}
  },
  /** Champs du formulaire de détail gérés par ce format (pas de « summary » en SysML). */
  champs: ['name', 'description'],
  couches: Object.entries(SY_FAMILLES).map(([k, l]) => [k, k + ' — ' + l]),
  titreCouches: _L('SysML element family'),

  /** @param {string} nom @returns {boolean} vrai pour un fichier .sysml ou une archive .kpar */
  reconnait(nom) { return /\.(sysml|kpar)$/i.test(nom || ''); },
  /** @param {string} nom @returns {boolean} vrai si le fichier se lit et s'écrit en octets (archive .kpar) */
  binaire(nom) { return /\.kpar$/i.test(nom || ''); },
  /**
   * Lit ensemble les textes .sysml d'un dossier de projet.
   * @param {Array<{chemin:string, texte:string}>} fichiers @param {string} nom nom du dossier @returns {object} document
   */
  lireDossier(fichiers, nom) { return syLireDossier(fichiers, nom); },
  /**
   * Lit le contenu : analyse tolérante, résolution des noms, contrôles, puis nœuds présentés à l'interface.
   * @param {string|Uint8Array} contenu texte d'un .sysml, ou octets d'une archive .kpar
   * @param {string} [nom] nom du fichier
   * @returns {object} document
   */
  lire(contenu, nom) {
    let doc;
    if (typeof contenu !== 'string') doc = syLireKpar(contenu instanceof Uint8Array ? contenu : new Uint8Array(contenu), nom || 'projet.kpar');
    else {
      const chemin = nom || 'modele.sysml';
      doc = syDocument(syBuildModel([{ path: chemin, text: contenu }]), contenu);
      doc.fichiers = [{ chemin, texte: contenu }];
    }
    doc.nom = nom;
    doc.erreursOrigine = doc.diags.filter(d => d.severity === 'error').length;
    doc.diagsOrigine = doc.diags.slice();             // diagnostics de l'ouverture : erreurs nouvelles (45-validation.js)
    return doc;
  },
  /**
   * Contenu à écrire : le texte courant d'un .sysml (d'origine, ou modifié par plages) ; l'archive .kpar réécrite
   * (ses octets d'origine, même objet, si aucun texte n'a changé) ; pour un dossier, le texte de chacun de ses fichiers.
   * @param {object} doc @returns {string|Uint8Array|Array<{chemin:string, texte:string}>}
   */
  ecrire(doc) { return doc.kpar ? syKparEcrire(doc.kpar, doc.fichiers) : doc.dossier ? doc.fichiers.map(f => ({ chemin: f.chemin, texte: f.texte })) : doc.src; },
  /**
   * Contrôle avant écriture : le contenu se relit avec le même nombre d'éléments et sans nouvelle erreur.
   * @param {object} doc document @param {string|Uint8Array|Array} texte contenu produit (dossier : textes des fichiers) @returns {string|null} message, ou null
   */
  controler(doc, texte) {
    let relu;
    try { relu = Array.isArray(texte) ? syLireDossier(texte, doc.nom) : FMT_SYSML.lire(texte, doc.nom || (doc.kpar ? 'projet.kpar' : doc.fichiers[0].chemin)); }
    catch (e) { return _Lp('Check before writing: re-reading failed ({a}). Save cancelled.', { a: e.message }); }
    const nE = relu.diags.filter(d => d.severity === 'error').length;
    if (relu.parId.size !== doc.parId.size) return _Lp('Pre-write check: {a} elements read back instead of {b}. Save cancelled.', { a: relu.parId.size, b: doc.parId.size });
    if (nE > (doc.erreursOrigine || 0)) return _Lp('Pre-write check: {a} parse error(s) instead of {b}. Save cancelled.', { a: nE, b: doc.erreursOrigine || 0 });
    return null;
  },
  /**
   * Indique si un champ se modifie pour cet élément : le nom s'il est déclaré dans le texte, la documentation
   * si l'élément a une place pour elle (bloc doc existant, corps, ou « ; » final).
   * @param {object} n nœud @param {string} attr champ @returns {boolean}
   */
  modifiable(n, attr) {
    const el = n.sy; if (!el || el.isFileRoot) return false;
    if (attr === 'name') return !!(el.declaredName && el.nameTok && el.nameTok.o != null);
    if (attr === 'description') return el.kind !== 'Comment' && el.kind !== 'TextualRepresentation' && el.debut != null &&
      (el.members.some(m => m.kind === 'Documentation' && m.debut != null) || el.ouvre != null || el.pointVirgule != null);
    return false;
  },

  /** @param {object} el @returns {string|undefined} identifiant stable calculé */
  id(el) { return el.attrs.length && el.attrs[0].n === 'id' ? el.attrs[0].v : undefined; },
  /** @param {object} el @returns {string} métaclasse (PartUsage, PartDefinition…) */
  type(el) { return el.tag; },
  /** @param {object} el @returns {string} nom, ou métaclasse entre chevrons */
  libelle(el) { const n = FMT_SYSML.attr(el, 'name'); return n ? n : '‹' + el.tag + '›'; },
  /** @param {object} el @returns {string} famille (STR, BEH, REQ, ORG), '' pour le fichier */
  couche(el) { return el.parent && !(el.sy && el.sy.isFileRoot) ? syFamille(el.tag) : ''; },
  /** @param {object} el @returns {object[]} ancêtres, racine exclue */
  chemin(el) { const ch = []; for (let p = el.parent; p && p.parent; p = p.parent) ch.unshift(p); return ch; },
  /** @param {object} el @returns {string|null} la racine (fichier) est protégée */
  ossature(el) { return el.sy && el.sy.isProject ? (el.sy.projet && /\.kpar$/i.test(el.sy.file || '') ? _L('SysML v2 project (.kpar archive)') : _L('SysML v2 project (folder)')) : el.sy && el.sy.isFileRoot ? _L('SysML file (root namespace)') : null; },
  /** @param {object} el @returns {boolean} élément technique (import, succession, commentaire…) */
  technique(el) { return SY_TECHNIQUES.has(el.tag); },
  /** @param {object} el @returns {string} lettres de l'icône */
  icone(el) {
    if (/^(Package|LibraryPackage|Namespace)$/.test(el.tag)) return '▣';
    const base = el.tag.replace(/(Definition|Usage)$/, '').replace(/AsUsage$/, '');
    const t = SY_ICONES[base] || SY_ICONES[el.tag] || el.tag[0];
    return /Usage$/.test(el.tag) && t.length && /^[A-Z]/.test(t) ? t.toLowerCase() : t;
  },
  /** Icône dessinée : aucune pour SysML v2 (initiales seules). @returns {string} */
  iconeSvg() { return ''; },
  /** @param {object} el @param {string} n @returns {string|undefined} valeur de l'attribut */
  attr(el, n) { const a = el.attrs.find(x => x.n === n); return a ? a.v : undefined; },
  /** Parcours en profondeur. @param {object} racine @param {function(object)} f */
  parcourir(racine, f) { const pile = [racine]; while (pile.length) { const n = pile.pop(); f(n); for (let i = n.enfants.length - 1; i >= 0; i--) pile.push(n.enfants[i]); } },
  /**
   * Informations générales : premier paquetage, diagnostics de l'analyse.
   * @param {object} doc @returns {{version:string, nom:string, approche:string}}
   */
  infos(doc) {
    const nE = doc.diags.filter(d => d.severity === 'error').length, nW = doc.diags.length - nE;
    const racines = doc.projet ? doc.racine.enfants : [doc.racine];
    const p = racines.map(r => r.enfants.find(c => c.tag === 'Package')).find(Boolean);
    return { version: '2.0', nom: doc.projet ? doc.projet.nom : p ? FMT_SYSML.attr(p, 'name') : '', approche: nE || nW ? _Lp('{e} error(s), {w} parsing warning(s)', { e: nE, w: nW }) : '' };
  },

  /** @param {object} doc @returns {object} liaisons SysML */
  liaisons(doc) { return syLiaisons(doc); },
  /**
   * Liaisons d'un élément groupées par relation et par sens, dans l'ordre de SY_RELATIONS.
   * @param {object} index résultat de syLiaisons @param {object} el nœud @returns {object[]}
   */
  groupes(index, el) {
    const g = new Map();
    for (const l of index.metier.get(el) || []) {
      const k = l.rel + '|' + l.sens;
      if (!g.has(k)) g.set(k, { rel: l.rel, sens: l.sens, libelle: syLibelleRelation(l.rel, l.sens), liens: [] });
      g.get(k).liens.push(l);
    }
    const rang = x => { const i = SY_RELATIONS.indexOf(x.rel); return (i < 0 ? SY_RELATIONS.length : i) * 2 + (x.sens === 'sortant' ? 0 : 1); };
    return [...g.values()].sort((a, b) => rang(a) - rang(b));
  },
  /** @param {string} nom @param {string} v @returns {string[]|null} */
  estReference(nom, v) { return syEstReference(nom, v); },

  /** Modifie le nom ou la documentation (réécriture par plages). @param {object} doc @param {object} n @param {string} attr @param {string|null} v */
  definirAttr(doc, n, attr, v) { return syDefinirAttr(doc, n, attr, v); },
  inserer: syLectureSeule,
  supprimer: syLectureSeule,
  indexerSousArbre: syLectureSeule,
  indexInsertion: syLectureSeule,
  /** Aucun changement lié : les références au nom sont réécrites avec lui. @returns {Array} */
  liesAuxChangements() { return []; },
  /** Pas d'attribut simple au-delà du nom et de la documentation. @returns {Array} */
  attributsSimples() { return []; },
  /** Valeur saisie écrite telle quelle. @param {object} el @param {string} n @param {string} saisie @returns {string} */
  valeurAttribut(el, n, saisie) { return saisie === '' ? null : saisie; },
  /** Aucun lien tracé sans sysml/42-liens.js (qui remplace ces fonctions). @returns {Array} */
  liensDepuis() { return []; },
  /** @returns {Array} aucune cible */
  ciblesLien() { return []; },
  preparerLien: syLectureSeule,
  /** Aucun champ de relations (remplacé par sysml/40-creation.js : typage, spécialisation). @returns {Array} */
  relations() { return []; },
  /** @returns {Array} aucun candidat */
  candidatsRelation() { return []; },
  preparerRelation: syLectureSeule,
  /** Pas de déplacement sans sysml/42-liens.js (qui remplace cette fonction). @returns {string} raison */
  raisonDeplacement() { return _L('SysML v2 format: moving is coming soon.'); },
  preparerDeplacement: syLectureSeule,
  preparerSuppression: syLectureSeule,
  /** Aucune transition entre niveaux (pas de niveaux en SysML v2). @returns {Array} */
  transitions() { return []; },
  preparerTransition: syLectureSeule,
  /** Aucun changement entraîné par une création (le texte écrit suffit). @returns {Array} */
  liesALaCreation() { return []; },

  /** Aucune création proposée sans sysml/40-creation.js (qui remplace ces fonctions). @returns {Array} */
  regles() { return []; },
  /** @returns {Array} menu vide */
  menu() { return []; },
  noeuds: syLectureSeule,
  /** @returns {string} sans objet */
  balisePart() { return ''; },
  /** @returns {string} sans objet */
  nomDefaut() { return ''; },
  /** Nœud détaché minimal. @param {string} tag @param {Array} attrs @returns {object} */
  nouveau(tag, attrs) { return { tag, parent: null, enfants: [], prof: 0, attrs: (attrs || []).map(([n, v]) => ({ n, v })) }; },
  /** Liste collée : aucune tant que la création n'est pas disponible (rien n'est proposé au collage). @returns {Array} */
  decouperListe() { return []; }
};

FORMATS.push(FMT_SYSML);

/* ── src/js/sysml/45-validation.js ── */
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   SysML v2 — validation continue (sans DOM). Le texte est relu après chaque opération (syAppliquerOp) : ses diagnostics
   (analyse tolérante syParse, résolution des noms syResolveAll, contrôles structurels syChecks) sont ceux du modèle tel
   qu'il est. Ils remontent dans la validation continue commune (54-problemes.js : compteur de la barre, onglet
   « Problèmes », pastilles de l'arborescence) au contrat de 28-formats.js : une règle par code de diagnostic.
   Une référence qui se résolvait à l'ouverture (ou au dernier enregistrement) et ne se résout plus (élément supprimé) est
   une erreur, même là où l'analyse la tient pour un avertissement (import d'un paquetage absent du projet).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Règles de la validation SysML v2 : identifiant (code du diagnostic ; E-LEX regroupe les erreurs lexicales, SY-AUTRE ce
 * qui n'a pas de règle), catégorie, sévérité par défaut, nom. La sévérité d'un problème est celle de son diagnostic.
 */
const SY_VAL_REGLES = [
  { id: 'E-LEX', categorie: 'syntax', severite: 'E', nom: () => _L('Well-formed characters, strings, comments and names.') },
  { id: 'E-SYNTAXE', categorie: 'syntax', severite: 'E', nom: () => _L('Text conforms to the SysML v2 textual grammar.') },
  { id: 'W-IMPORT-VISIBILITE', categorie: 'syntax', severite: 'W', nom: () => _L('Each import states its visibility.') },
  { id: 'R-INTROUVABLE', categorie: 'resolution', severite: 'E', nom: () => _L('Each name referenced designates an element (imports, inheritance, library).') },
  { id: 'V-DOUBLON', categorie: 'checks', severite: 'E', nom: () => _L('Distinct names within a namespace.') },
  { id: 'V-DOUBLON-COURT', categorie: 'checks', severite: 'W', nom: () => _L('Short names distinct from the other names of the namespace.') },
  { id: 'V-MULTIPLICITE', categorie: 'checks', severite: 'E', nom: () => _L('Lower bound of a multiplicity at most equal to the upper bound.') },
  { id: 'V-TYPAGE', categorie: 'checks', severite: 'E', nom: () => _L('Usage typed by a definition of a compatible kind.') },
  { id: 'V-SPECIALISATION', categorie: 'checks', severite: 'W', nom: () => _L('A definition specializes a definition of the same metaclass.') },
  { id: 'V-PORT-PAQUETAGE', categorie: 'checks', severite: 'W', nom: () => _L('Ports declared in a definition or a usage.') },
  { id: 'V-SUJET', categorie: 'checks', severite: 'E', nom: () => _L('The subject of a case or a requirement is its first parameter.') },
  { id: 'V-PORT-COMPOSITE', categorie: 'checks', severite: 'E', nom: () => _L('In a port definition, usages other than ports are referential.') },
  { id: 'V-EXTREMITES', categorie: 'checks', severite: 'E', nom: () => _L('A concrete connection or interface has at least two ends.') },
  { id: 'W-KPAR', categorie: 'project', severite: 'W', nom: () => _L('Well-formed .kpar archive (index, metadata).') },
  { id: 'SY-AUTRE', categorie: 'syntax', severite: 'W', nom: () => _L('Other parser diagnostics.') }
];

/**
 * Règle d'un diagnostic : son code, E-LEX pour une erreur lexicale, SY-AUTRE pour un code sans règle.
 * @param {string} code code du diagnostic (E-SYNTAXE, R-INTROUVABLE…) @returns {string} identifiant de la règle
 */
function syValRegle(code) {
  const c = String(code || '');
  if (/^E-LEX/.test(c)) return 'E-LEX';
  return SY_VAL_REGLES.some(r => r.id === c) ? c : 'SY-AUTRE';
}

/**
 * Nœud présenté qui porte un diagnostic : celui de l'élément signalé, sinon de son plus proche propriétaire présenté
 * (documentation…), sinon la racine du fichier du diagnostic, sinon la racine du document.
 * @param {object} doc document @param {object} d diagnostic @returns {object}
 */
function syValNoeud(doc, d) {
  for (let el = d.el; el; el = el.owner) { const n = el._id && doc.parId.get(el._id); if (n) return n; }
  const f = d.file && (doc.M.files || []).find(x => x.path === d.file);
  return (f && f.root && doc.parId.get(f.root._id)) || doc.racine;
}

/**
 * Diagnostics du texte apparus depuis l'ouverture du modèle (comparés par code et message : les lignes se décalent).
 * @param {object} doc document @param {function(object):boolean} [filtre] diagnostics retenus
 * @returns {object[]} diagnostics nouveaux
 */
function syDiagsNouveaux(doc, filtre) {
  const f = filtre || (() => true), cle = d => d.code + '|' + d.message, reste = new Map();
  for (const d of (doc.diagsOrigine || []).filter(f)) reste.set(cle(d), (reste.get(cle(d)) || 0) + 1);
  const out = [];
  for (const d of (doc.diags || []).filter(f)) { const k = cle(d); if (reste.get(k)) reste.set(k, reste.get(k) - 1); else out.push(d); }
  return out;
}

/**
 * Diagnostic qui compte comme une erreur à l'enregistrement : erreur d'analyse, ou référence introuvable.
 * @param {object} d diagnostic @returns {boolean}
 */
function syDiagGrave(d) { return d.severity === 'error' || d.code === 'R-INTROUVABLE'; }

/**
 * Valide le document : un problème par diagnostic du texte relu, sur le nœud de l'élément signalé ; une référence
 * introuvable apparue depuis l'ouverture est une erreur.
 * @param {object} doc document @param {Set<string>|null} actives règles actives (toutes si null)
 * @returns {{problemes:object[], ms:number}}
 */
function syValider(doc, actives) {
  const t0 = Date.now(), problemes = [], nouvelles = new Set(syDiagsNouveaux(doc, d => d.code === 'R-INTROUVABLE'));
  for (const d of doc.diags || []) {
    const regle = syValRegle(d.code);
    if (actives && !actives.has(regle)) continue;
    const el = syValNoeud(doc, d), ou = d.line ? (doc.fichiers && doc.fichiers.length > 1 && d.file ? _Lp('{f}, line {l}', { f: d.file, l: d.line }) : _Lp('line {l}', { l: d.line })) : '';
    const severite = d.severity === 'error' || nouvelles.has(d) ? 'E' : 'W';
    // Référence cassée depuis l'ouverture : dite telle quelle (l'analyse, qui ne connaît pas l'histoire, l'excuse parfois)
    const texte = nouvelles.has(d) && d.ref ? _Lp('Name “{a}” not found: it designated an element before your changes', { a: d.ref }) : d.message;
    problemes.push({ regle, severite, source: 'sysml', el, elements: [el], message: ou ? _Lp('{m} ({o})', { m: texte, o: ou }) : texte,
      donnees: { code: d.code, ligne: d.line, fichier: d.file }, rep: null, vues: null });
  }
  return { problemes, ms: Date.now() - t0 };
}

/**
 * Corrections rapides : renommer l'élément d'un nom en double ; montrer l'élément signalé.
 * @param {object} pb problème @returns {Array<{libelle:string, action:object}>}
 */
function syCorrections(pb) {
  const out = [];
  if (/^V-DOUBLON/.test(pb.regle) && pb.el && FMT_SYSML.modifiable(pb.el, 'name')) out.push({ libelle: _Lp('Rename “{e}”', { e: FMT_SYSML.libelle(pb.el) }), action: { genre: 'renommer', el: pb.el } });
  if (pb.el && pb.el.parent) out.push({ libelle: _Lp('Show “{e}”', { e: FMT_SYSML.libelle(pb.el) }), action: { genre: 'montrer', el: pb.el } });
  return out;
}

/**
 * Avertissement après l'enregistrement (sans le bloquer) : erreurs et références introuvables du texte apparues depuis
 * l'ouverture ou le dernier enregistrement (relu : nouvelle référence) — contrat ARC.fmt.avertirEcriture.
 * @param {object} doc document @returns {string|null}
 */
function syAvertirEcriture(doc) {
  const n = syDiagsNouveaux(doc, syDiagGrave);
  if (!n.length) return null;
  return _Lp('Warning: the saved text has {n} new error(s) ({p}) — see the “Problems” tab.', { n: n.length, p: n[0].ref ? _Lp('Name “{a}” not found', { a: n[0].ref }) : n[0].message });
}

/** Extension « validation » de FMT_SYSML (contrat de 28-formats.js). */
FMT_SYSML.validation = {
  /** @returns {Array<{id:string, categorie:string, severite:string, actif:boolean, source:string, nom:string}>} */
  regles() { return SY_VAL_REGLES.map(r => ({ id: r.id, categorie: r.categorie, severite: r.severite, actif: true, source: 'sysml', nom: r.nom() })); },
  /** @returns {Array<{cle:string, titre:string, filtre:string}>} origine des règles */
  sources() { return [{ cle: 'sysml', titre: _L('SysML v2 text parsing and name resolution'), filtre: _L('SysML v2 text only') }]; },
  /** @returns {string} présentation de la fenêtre des règles */
  presentation() { return _L('Diagnostics of the SysML v2 text, re-read after each change: parsing, name resolution and structural checks. A reference that resolved when the model was opened and no longer resolves is an error.'); },
  /** @param {object} doc @param {Set<string>} actives @returns {{problemes:object[], ms:number}} */
  valider(doc, actives) { return syValider(doc, actives); },
  /** @param {object} pb @returns {Array<{libelle:string, action:object}>} */
  corrections(pb) { return syCorrections(pb); },
  /** Pas de diagramme. @returns {string} */
  nomDiagramme() { return ''; },
  /** Pas de diagramme à ouvrir. */
  ouvrirDiagramme() {}
};
/** Avertissement à l'enregistrement : erreurs nouvelles du texte. @param {object} doc @returns {string|null} */
FMT_SYSML.avertirEcriture = syAvertirEcriture;
/**
 * Après l'enregistrement (le document n'est pas relu) : les diagnostics du texte écrit deviennent la référence des erreurs
 * nouvelles, comme à l'ouverture (contrat ARC.fmt.apresEnregistrement).
 * @param {object} doc document
 */
FMT_SYSML.apresEnregistrement = doc => { doc.diagsOrigine = (doc.diags || []).slice(); };

/* ── src/js/sysml/60-vues.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   SYSML/60. VUES SysML v2 — vues normalisées calculées depuis le modèle (sans DOM)
   Le texte est le modèle : il n'y a pas de fichier de notation. Les vues normalisées de SysML v2
   (formal/2026-03-02, §8.2.3 « Graphical Notation » et vues de la bibliothèque Views) sont donc
   calculées depuis le modèle et disposées automatiquement, en lecture, comme les vues calculées
   d'UML : Vue générale (General View) d'un paquetage ou d'une définition, Vue d'interconnexion
   (Interconnection View) d'une part, Vue des états (State Transition View), Vue du flux d'actions
   (Action Flow View). Notation graphique de SysML v2 : définition à angles droits, usage à angles
   arrondis, mot-clé entre guillemets (« part def », « part »), compartiments (attributes, ports, parts…),
   ports et paramètres sur le bord, connexions, liaisons, flux, successions, transitions ; inventaire
   dans docs/SYSML2-NOTATION.md. Scène de même forme que celles d'UML ({formes, liens}), dessin SVG.
   Extensions de l'adaptateur : FMT_SYSML.diagrammes (vue des diagrammes, liste, rubrique) et
   FMT_SYSML.vues (menu « Vues ▸ ») ; dessinées par sysml/70-vue.js. Rien n'est écrit.
   ═══════════════════════════════════════════════════════════════════════ */

/** Genres de vues : sigle (pastille), famille (couleur de la pastille), libellé. */
const SYV_GENRES = {
  generale: { sigle: 'GV', famille: 'STR', libelle: _L('General view') },
  interconnexion: { sigle: 'IV', famille: 'STR', libelle: _L('Interconnection view') },
  etats: { sigle: 'STV', famille: 'BEH', libelle: _L('State transition view') },
  actions: { sigle: 'AFV', famille: 'BEH', libelle: _L('Action flow view') }
};

/** Hauteur d'une ligne de compartiment, taille de la police (px). */
const SYV_LIGNE = 15, SYV_POLICE = 12;

/** Écarts de la disposition : entre formes d'une couche, entre couches, bord intérieur d'un conteneur, pas des ports. */
const SYV_ECARTS = { forme: 40, couche: 70, bord: 18, pasPort: 20, marge: 20 };

/** Lignes montrées au plus dans un compartiment (les autres : « … »). */
const SYV_MAX_LIGNES = 8;

/** Profondeur des parts imbriquées d'une vue d'interconnexion, des états et des actions dépliés. */
const SYV_PROFONDEUR = 3;

/** Usages qui sont des actions dans un flux d'actions. */
const SYV_ACTIONS = /^(ActionUsage|PerformActionUsage|AcceptActionUsage|SendActionUsage|AssignmentActionUsage|IfActionUsage|WhileLoopActionUsage|ForLoopActionUsage|TerminateActionUsage|CalculationUsage)$/;

/** Comportements dont on montre le flux d'actions : actions, cas d'utilisation, cas d'analyse et de vérification. */
const SYV_FLUX = /^(ActionDefinition|ActionUsage|PerformActionUsage|UseCaseDefinition|UseCaseUsage|CaseDefinition|CaseUsage|AnalysisCaseDefinition|AnalysisCaseUsage|VerificationCaseDefinition|VerificationCaseUsage)$/;

/** Nœuds de contrôle d'un flux d'actions et leur figure. */
const SYV_CONTROLES = { ForkNode: 'fourche', JoinNode: 'fourche', MergeNode: 'losange', DecisionNode: 'losange' };

/** Connecteurs d'une vue d'interconnexion et genre du lien dessiné. */
const SYV_CONNECTEURS = { ConnectionUsage: 'connexion', InterfaceUsage: 'interface', BindingConnectorAsUsage: 'liaison', FlowUsage: 'flux', SuccessionFlowUsage: 'flux', AllocationUsage: 'allocation' };

/** Éléments jamais montrés en forme dans une vue générale (relations dessinées en liens, annotations, éléments techniques). */
const SYV_HORS_VUE = /^(Import|Comment|Documentation|TextualRepresentation|MetadataUsage|Alias|Dependency|Expose|ElementFilterMembership|SatisfyRequirementUsage|VerifyRequirementUsage|ConnectionUsage|InterfaceUsage|BindingConnectorAsUsage|FlowUsage|SuccessionFlowUsage|SuccessionAsUsage|TransitionUsage|AllocationUsage|StateActionUsage|ForkNode|JoinNode|MergeNode|DecisionNode|IncludeUseCaseUsage)$/;

/**
 * Compartiments d'une définition ou d'un usage : titre (mot-clé de la notation, au pluriel, non traduit) et sortes
 * d'usages qu'il liste, dans l'ordre de la notation.
 */
const SYV_COMPARTIMENTS = [
  ['attributes', /^AttributeUsage$/], ['ports', /^PortUsage$/], ['parts', /^PartUsage$/], ['items', /^ItemUsage$/],
  ['references', /^ReferenceUsage$/], ['enums', /^EnumerationUsage$/], ['interfaces', /^InterfaceUsage$/], ['connections', /^ConnectionUsage$/],
  ['actions', /^(ActionUsage|AcceptActionUsage|SendActionUsage|AssignmentActionUsage)$/], ['perform actions', /^PerformActionUsage$/],
  ['states', /^StateUsage$/], ['exhibit states', /^ExhibitStateUsage$/], ['calcs', /^CalculationUsage$/],
  ['constraints', /^(ConstraintUsage|AssertConstraintUsage)$/], ['requirements', /^RequirementUsage$/], ['satisfy requirements', /^SatisfyRequirementUsage$/],
  ['use cases', /^UseCaseUsage$/], ['occurrences', /^(OccurrenceUsage|EventOccurrenceUsage)$/]
];

/**
 * Largeur estimée d'un texte (police sans empattement) : la même dans Node et dans le navigateur, pour que la disposition
 * et le dessin s'accordent.
 * @param {string} t texte @param {number} [taille] taille de la police @param {boolean} [gras] texte en gras
 * @returns {number}
 */
function syvLargeur(t, taille, gras) {
  let l = 0;
  for (const c of String(t || '')) l += /[il.,:;'|!()[\]{} ]/.test(c) ? 0.32 : /[mwMW@«»~]/.test(c) ? 0.86 : /[A-Z]/.test(c) ? 0.66 : 0.56;
  return l * (taille || SYV_POLICE) * (gras ? 1.08 : 1);
}

/**
 * Éléments visés par une relation résolue d'un élément (typage, spécialisation…), dans le projet.
 * @param {object} el élément SysML @param {string} cle relation (typedBy, specializes, subsets, redefines, by, requirement…)
 * @returns {object[]}
 */
function syvRefs(el, cle) { return (el.res[cle] || []).map(r => r && r.el).filter(Boolean); }

/**
 * Généraux d'un élément dont il hérite les membres : types et spécialisations, sous-ensembles et redéfinitions d'un usage.
 * @param {object} el @returns {object[]}
 */
function syvGeneraux(el) {
  return [...syvRefs(el, 'typedBy'), ...syvRefs(el, 'specializes'), ...syvRefs(el, 'subsets'), ...syvRefs(el, 'redefines')];
}

/**
 * Membres effectifs d'un élément : les siens, puis ceux de ses généraux qu'il ne redéfinit pas (même nom), de proche en
 * proche (une part typée par une définition montre les ports et les parts de sa définition).
 * @param {object} el élément SysML @returns {object[]}
 */
function syvMembres(el) {
  const out = [], noms = new Set(), vus = new Set();
  const visiter = (x, prof) => {
    if (!x || vus.has(x) || prof > 6) return;
    vus.add(x);
    const ajout = x.members.filter(m => m.kind !== 'Documentation' && !(m.name && noms.has(m.name)));
    for (const m of ajout) {
      out.push(m);
      if (m.name) noms.add(m.name);
      for (const r of m.refs.redefines || []) { const s = sySegmentsRef(r).pop(); if (s) noms.add(s.n); }
    }
    for (const g of syvGeneraux(x)) visiter(g, prof + 1);
  };
  visiter(el, 0);
  return out;
}

/**
 * Corps d'un comportement : l'élément lui-même s'il contient ce qu'on cherche, sinon le premier général qui le contient
 * (« exhibit state etats : EtatsMoteur », « perform action demarrage : Demarrage », « perform a.b »).
 * @param {object} el @param {function(object):boolean} contient le corps convient
 * @returns {object}
 */
function syvCorps(el, contient) {
  const vus = new Set(), file = [el];
  while (file.length) {
    const x = file.shift();
    if (vus.has(x)) continue;
    vus.add(x);
    if (contient(x)) return x;
    file.push(...syvGeneraux(x));
  }
  return el;
}

/** @param {object} x @returns {boolean} le corps a des sous-états ou des transitions */
function syvAEtats(x) { return x.members.some(m => m.kind === 'StateUsage' || m.kind === 'ExhibitStateUsage' || m.kind === 'TransitionUsage'); }

/** @param {object} x @returns {boolean} le corps a des actions, des nœuds de contrôle ou des successions */
function syvAActions(x) { return x.members.some(m => SYV_ACTIONS.test(m.kind) || SYV_CONTROLES[m.kind] || m.kind === 'SuccessionAsUsage'); }

/**
 * Indique si un élément est un paquetage (ou l'espace de noms d'un fichier) : vue générale de son contenu.
 * @param {object} el @returns {boolean}
 */
function syvEstPaquetage(el) { return el.kind === 'Package' || el.kind === 'LibraryPackage' || (el.isFileRoot && !el.isProject); }

/**
 * Éléments d'un paquetage montrés dans sa vue générale : définitions, usages et paquetages qu'il contient (relations,
 * annotations et éléments techniques exceptés).
 * @param {object} p paquetage @returns {object[]}
 */
function syvContenuGeneral(p) {
  return p.members.filter(m => !SYV_HORS_VUE.test(m.kind) && !SY_TECHNIQUES.has(m.kind) && (m.isDef || /Usage$/.test(m.kind) || m.kind === 'Package' || m.kind === 'LibraryPackage'));
}

/**
 * Parts imbriquées et ports d'une part (ou de sa définition), connecteurs : de quoi faire une vue d'interconnexion.
 * @param {object} el @returns {boolean}
 */
function syvAInterconnexion(el) {
  const m = syvMembres(el);
  return m.some(x => x.kind === 'PartUsage' || x.kind === 'ItemUsage' || SYV_CONNECTEURS[x.kind] === 'connexion' || SYV_CONNECTEURS[x.kind] === 'interface' || x.kind === 'BindingConnectorAsUsage')
    && m.some(x => x.kind === 'PartUsage' || x.kind === 'ItemUsage' || x.kind === 'PortUsage');
}

/**
 * Nom affiché d'un élément dans une vue : nom court, nom ; usage : « : Type » et multiplicité.
 * @param {object} el @returns {string}
 */
function syvLibelle(el) {
  let t = (el.shortName ? '<' + el.shortName + '> ' : '') + (el.name || '');
  if (!el.isDef && el.refs.typedBy && el.kind !== 'MetadataUsage') t += ' : ' + (el.conjugated ? '~' : '') + el.refs.typedBy.join(', ');
  else if (!el.isDef && el.isRefUsage && el.refs.subsets && !el.name) t += el.refs.subsets.join(', ');
  if (el.mult) t += ' ' + el.mult;
  t = t.trim();
  if (!t && el.kind === 'AcceptActionUsage') t = el.trigger || '';
  if (!t && el.text) t = el.text;
  return t || syNomCalcule(el) || '';
}

/**
 * Mot-clé d'un élément dans sa forme (« part def », « part », « exhibit state »…), sans guillemets.
 * @param {object} el @returns {string}
 */
function syvMotCle(el) {
  const k = el.keyword && el.keyword !== 'then' ? el.keyword : syKindKeyword(el.kind);
  return /^#/.test(k) ? k.slice(1) : k;
}

/**
 * Vues proposées sur un élément : vue générale d'un paquetage ou d'une définition, d'interconnexion d'une part, des
 * états d'un état, du flux d'actions d'une action. liste : l'élément porte lui-même ce que la vue montre (les vues de la
 * liste des diagrammes ; une part typée sans corps propre ne fait que répéter la vue de sa définition).
 * @param {object} doc document SysML @param {object} n nœud
 * @returns {Array<{cle:string, genre:string, nom:string, semId:string, liste:boolean}>}
 */
function syvVuesPour(doc, n) {
  const el = n && n.sy;
  if (!el || !el._id || el.isProject) return [];
  const id = el._id, nom = el.name || (el.isFileRoot ? el.name : syvLibelle(el)) || el.kind, out = [];
  const vue = (genre, texte, liste) => out.push({ cle: genre + ':' + id, genre, nom: texte, semId: id, liste });
  if (syvEstPaquetage(el)) {
    // Fichier qui ne contient qu'un paquetage : sa vue répéterait celle du paquetage
    const contenu = syvContenuGeneral(el);
    if (contenu.length && (!el.isFileRoot || contenu.length > 1 || !/Package$/.test(contenu[0].kind))) vue('generale', _Lp('General view — {e}', { e: nom }), true);
  } else if (el.isDef && !/^(Enumeration|Metadata)Definition$/.test(el.kind)) {
    if (syvRefs(el, 'specializes').length || el.members.some(m => /^(PartUsage|ItemUsage|ReferenceUsage)$/.test(m.kind) && syvRefs(m, 'typedBy').length))
      vue('generale', _Lp('General view — {e}', { e: nom }), false);
  }
  if (/^(PartDefinition|PartUsage|ItemDefinition|ItemUsage)$/.test(el.kind) && syvAInterconnexion(el)) {
    const propre = el.members.some(m => /^(PartUsage|ItemUsage|PortUsage)$/.test(m.kind));
    vue('interconnexion', _Lp('Interconnection — {e}', { e: nom }), propre && (el.isDef || !el.owner || syvEstPaquetage(el.owner)));
  }
  if (/^(StateDefinition|StateUsage|ExhibitStateUsage)$/.test(el.kind)) {
    const corps = syvCorps(el, syvAEtats);
    // États imbriqués dans un autre état : ils paraissent dans la vue de leur machine (liste), mais s'ouvrent aussi seuls
    if (syvAEtats(corps)) vue('etats', _Lp('States — {e}', { e: nom }), corps === el && !(el.owner && /^(StateDefinition|StateUsage|ExhibitStateUsage)$/.test(el.owner.kind)));
  }
  if (SYV_FLUX.test(el.kind)) {
    const corps = syvCorps(el, syvAActions);
    if (syvAActions(corps)) vue('actions', _Lp('Action flow — {e}', { e: nom }), corps === el && !(el.owner && SYV_FLUX.test(el.owner.kind)));
  }
  return out;
}

/** Vues de la liste des diagrammes, par modèle lu (le document est relu après chaque modification). */
const SYV_MEMO = new WeakMap();

/**
 * Vues du modèle montrées dans la liste des diagrammes : celles des éléments qui portent eux-mêmes ce que la vue montre.
 * @param {object} doc document SysML @returns {object[]}
 */
function syvToutesVues(doc) {
  if (!doc || !doc.M) return [];
  if (SYV_MEMO.has(doc.M)) return SYV_MEMO.get(doc.M);
  const out = [];
  for (const n of doc.parId.values()) for (const v of syvVuesPour(doc, n)) if (v.liste) out.push(v);
  SYV_MEMO.set(doc.M, out);
  return out;
}

/* ─────────────────────────────── Scène ─────────────────────────────── */

/**
 * Scène vide d'une vue.
 * @param {string} genre @param {object} vue description (syvVuesPour) @param {object} el élément de la vue
 * @returns {object}
 */
function syvScene(genre, vue, el) {
  return { genre, nom: vue ? vue.nom : '', cle: vue ? vue.cle : '', semId: el ? el._id : '', formes: [], liens: [], parVue: new Map(), calculee: true };
}

/**
 * Lignes des compartiments d'une forme : membres propres de l'élément, rangés par sorte (SYV_COMPARTIMENTS).
 * @param {object} el @param {RegExp} [exclus] sortes à ne pas lister (montrées autrement)
 * @returns {Array<{titre:string, lignes:Array<{t:string, semId:string}>}>}
 */
function syvCompartiments(el, exclus) {
  const out = [];
  for (const [titre, re] of SYV_COMPARTIMENTS) {
    const ms = el.members.filter(m => re.test(m.kind) && !(exclus && exclus.test(m.kind)));
    if (!ms.length) continue;
    const lignes = ms.slice(0, SYV_MAX_LIGNES).map(m => {
      let t = syDeclText(m, true) || syvLibelle(m);
      if (m.dir && !/^(in|out|inout) /.test(t)) t = m.dir + ' ' + t;
      if (m.role && m.kind === 'ReferenceUsage') t = m.role + ' ' + t;
      return { t: t.length > 70 ? t.slice(0, 69) + '…' : t, semId: m._id };
    });
    if (ms.length > SYV_MAX_LIGNES) lignes.push({ t: '…', semId: '' });
    out.push({ titre, lignes });
  }
  // Documentation d'une exigence : compartiment « doc » (texte coupé en lignes)
  if (/^Requirement(Definition|Usage)$/.test(el.kind) && el.docs.length) {
    const mots = el.docs.join(' ').replace(/\s+/g, ' ').trim().split(' '), lignes = [];
    let l = '';
    for (const m of mots) { if (l && (l + ' ' + m).length > 40) { lignes.push({ t: l, semId: '' }); l = m; } else l = l ? l + ' ' + m : m; }
    if (l) lignes.push({ t: l, semId: '' });
    out.unshift({ titre: 'doc', lignes: lignes.slice(0, SYV_MAX_LIGNES) });
  }
  return out;
}

/**
 * Taille naturelle d'une forme (sans contenu imbriqué) : en-tête, nom, compartiments ; figures des nœuds de contrôle.
 * @param {object} f forme @returns {{w:number, h:number}}
 */
function syvTaille(f) {
  switch (f.figure) {
    case 'port': return { w: 12, h: 12 };
    case 'debut': return { w: 20, h: 20 };
    case 'fin': return { w: 24, h: 24 };
    case 'fourche': return f.vertical ? { w: 7, h: 60 } : { w: 70, h: 7 };
    case 'losange': return { w: 28, h: 28 };
    case 'paquet': return { w: Math.max(110, Math.ceil(syvLargeur(f.libelle, 12, true)) + 30), h: 58 };
    default: {
      let w = Math.max(syvLargeur('«' + f.entete + '»', 11), syvLargeur(f.libelle, 12, true)), h = 8 + (f.entete ? 15 : 0) + 17;
      for (const c of f.compartiments || []) {
        h += 8 + 14 + c.lignes.length * SYV_LIGNE;
        w = Math.max(w, syvLargeur(c.titre, 11), ...c.lignes.map(l => syvLargeur(l.t, 12)));
      }
      return { w: Math.max(f.figure === 'etat' ? 70 : 90, Math.ceil(w) + 26), h: h + 6 };
    }
  }
}

/**
 * Crée une forme dans la scène.
 * @param {object} scene @param {object|null} el élément représenté (null : pseudo-état, nœud sans élément)
 * @param {object} o { figure (def, usage, etat, paquet, port, debut, fin, fourche, losange), parent, compartiments, entete, libelle }
 * @returns {object} forme
 */
function syvForme(scene, el, o) {
  const f = Object.assign({ id: 'f' + scene.formes.length, semId: el ? el._id : '', el, figure: 'usage', parent: null, enfants: [], ports: [],
    entete: el ? syvMotCle(el) : '', libelle: el ? syvLibelle(el) : '', compartiments: [], famille: el ? syFamille(el.kind) : '',
    abstrait: !!(el && el.mods.abstract), ref: !!(el && (el.mods.ref || (el.kind === 'ReferenceUsage' && !el.dir))), x: 0, y: 0, w: 0, h: 0 }, o || {});
  const t = syvTaille(f);
  f.w0 = f.w = t.w; f.h0 = f.h = t.h;
  scene.formes.push(f);
  scene.parVue.set(f.id, f);
  if (f.parent) (f.figure === 'port' ? f.parent.ports : f.parent.enfants).push(f);
  return f;
}

/**
 * Crée un lien dans la scène (rien si une extrémité manque, si les deux sont la même forme d'un connecteur, ou si l'une
 * contient l'autre).
 * @param {object} scene @param {string} genre @param {object|null} s source @param {object|null} c cible
 * @param {object} [o] { semId, libelle }
 * @returns {object|null}
 */
function syvLien(scene, genre, s, c, o) {
  if (!s || !c) return null;
  if (s === c && genre !== 'transition' && genre !== 'succession') return null;
  for (let p = s.parent; p; p = p.parent) if (p === c) return null;
  for (let p = c.parent; p; p = p.parent) if (p === s) return null;
  const l = Object.assign({ id: 'l' + scene.liens.length, semId: '', genre, source: s, cible: c, points: [], libelle: '' }, o || {});
  l.titre = l.libelle;
  l.libelle = syvCourt(l.libelle);
  scene.liens.push(l);
  return l;
}

/**
 * Forme d'un bout de connecteur : la référence « a.b.c » est suivie segment par segment depuis la forme où le connecteur
 * est déclaré (part, puis sa part ou son port…), jusqu'à la forme la plus profonde montrée.
 * @param {object} M modèle @param {object} depuis forme du contexte (cadre ou part) @param {object} conn connecteur
 * @param {object|null} bout extrémité ({ref, res})
 * @returns {object|null} forme (null : rien de montré)
 */
function syvFormeBout(M, depuis, conn, bout) {
  if (!bout) return null;
  if (bout.el) return syvChercherEl(depuis, bout.el);
  const ref = String(bout.ref || '').replace(/^~/, '');
  if (!ref || ref === '@prev') return null;
  const segs = sySegmentsRef(ref);
  let cur = depuis;
  for (let i = 0; i < segs.length; i++) {
    const r = syResolve(M, segs.slice(0, i + 1).map(s => s.brut).join(''), conn.owner || conn, null, 'end');
    const el = r && r.el;
    const dans = [...cur.enfants, ...cur.ports];
    const suivant = (el && dans.find(f => f.el === el)) || dans.find(f => f.el && f.el.name === segs[i].n);
    if (!suivant) {
      // Premier segment qui ne désigne rien du contexte : élément cherché ailleurs dans la vue (connecteur hérité)
      if (i === 0 && el) { const f = syvChercherEl(depuis, el); if (f) { cur = f; continue; } }
      break;
    }
    cur = suivant;
  }
  return cur === depuis ? null : cur;
}

/**
 * Forme qui représente un élément, cherchée dans une forme et ses descendants.
 * @param {object} f forme de départ @param {object} el élément @returns {object|null}
 */
function syvChercherEl(f, el) {
  const pile = [f];
  while (pile.length) {
    const x = pile.shift();
    if (x.el === el) return x;
    pile.push(...x.ports, ...x.enfants);
  }
  return null;
}

/**
 * Vue calculée d'un élément.
 * @param {object} doc document SysML @param {string} cle clé de la vue (« genre:id », syvVuesPour)
 * @returns {object|null} scène { genre, nom, cle, semId, formes, liens, parVue, calculee }
 */
function syvVue(doc, cle) {
  const i = String(cle || '').indexOf(':'), genre = cle.slice(0, i), id = cle.slice(i + 1);
  const n = doc && doc.parId.get(id), el = n && n.sy;
  if (!el || !SYV_GENRES[genre]) return null;
  const vue = syvVuesPour(doc, n).find(v => v.cle === cle);
  if (!vue) return null;
  const scene = genre === 'generale' ? syvVueGenerale(doc, el, vue) : genre === 'interconnexion' ? syvVueInterconnexion(doc, el, vue)
    : genre === 'etats' ? syvVueEtats(doc, el, vue) : syvVueActions(doc, el, vue);
  return scene;
}

/**
 * Vue générale : définitions et usages d'un paquetage (paquetages imbriqués repliés), ou une définition avec ses généraux,
 * ce qui la spécialise et les définitions de ses usages ; spécialisations, typages, compositions (usage d'une définition
 * typé par une autre : losange plein du côté du tout, nom de l'usage), références, satisfy, dépendances, allocations,
 * imports entre paquetages.
 * @param {object} doc @param {object} el paquetage ou définition @param {object} vue
 * @returns {object} scène
 */
function syvVueGenerale(doc, el, vue) {
  const scene = syvScene('generale', vue, el), M = doc.M, parEl = new Map();
  let elements;
  if (syvEstPaquetage(el)) elements = syvContenuGeneral(el);
  else {
    const types = el.members.filter(m => /^(PartUsage|ItemUsage|ReferenceUsage)$/.test(m.kind)).flatMap(m => syvRefs(m, 'typedBy'));
    const speciaux = M.all.filter(x => x !== el && x.isDef && syvRefs(x, 'specializes').includes(el));
    elements = [...new Set([el, ...syvRefs(el, 'specializes'), ...speciaux, ...types])].filter(x => x.isDef || /Usage$/.test(x.kind));
  }
  for (const x of elements) {
    const paquet = x.kind === 'Package' || x.kind === 'LibraryPackage';
    const f = syvForme(scene, x, { figure: paquet ? 'paquet' : x.isDef ? 'def' : 'usage', compartiments: paquet ? [] : syvCompartiments(x) });
    parEl.set(x, f);
  }
  const lier = (genre, a, b, o) => { const l = syvLien(scene, genre, parEl.get(a), parEl.get(b), o); if (l) l.hier = o && o.hier; return l; };
  for (const x of elements) {
    if (x.isDef) for (const g of syvRefs(x, 'specializes')) lier('specialisation', x, g, { hier: 'cible' });
    else {
      for (const t of syvRefs(x, 'typedBy')) lier('typage', x, t, { hier: 'source' });
      for (const t of syvRefs(x, 'subsets')) lier('sous-ensemble', x, t, { hier: 'cible' });
      for (const t of syvRefs(x, 'redefines')) lier('redefinition', x, t, { hier: 'cible' });
    }
    // Compositions : usages propres typés par une définition montrée
    for (const m of x.members) {
      if (!/^(PartUsage|ItemUsage|ReferenceUsage)$/.test(m.kind)) continue;
      const ref = m.mods.ref || m.kind === 'ReferenceUsage';
      for (const t of syvRefs(m, 'typedBy')) if (t !== x) lier(ref ? 'reference' : 'composition', x, t, { semId: m._id, libelle: (m.name || '') + (m.mult ? ' ' + m.mult : ''), hier: 'source' });
    }
  }
  // Relations portées par d'autres éléments : satisfy, verify, dépendances, allocations, imports
  for (const x of M.all) {
    if (x.kind === 'SatisfyRequirementUsage') {
      const par = syvRefs(x, 'by')[0] || (x.owner && !x.owner.isFileRoot && !syvEstPaquetage(x.owner) ? x.owner : null), req = syvRefs(x, 'requirement')[0] || syvRefs(x, 'typedBy')[0];
      if (par && req) lier('satisfy', par, req, { semId: x._id });
    } else if (x.kind === 'Dependency') {
      for (const s of syvRefs(x, 'source')) for (const t of syvRefs(x, 'target')) lier('dependance', s, t, { semId: x._id, libelle: x.name || '' });
    } else if (x.kind === 'AllocationUsage') {
      const a = x.ends[0] && x.ends[0].res && x.ends[0].res.el, b = x.ends[1] && x.ends[1].res && x.ends[1].res.el;
      if (a && b) lier('allocation', a, b, { semId: x._id, libelle: x.name || '' });
    } else if (x.kind === 'Import' && x.owner && parEl.has(x.owner)) {
      const t = x.res.target && x.res.target[0] && x.res.target[0].el;
      if (t && t !== x.owner) lier('import', x.owner, t, { semId: x._id });
    }
  }
  syvDisposerScene(scene, 'bas', 'bas');
  return scene;
}

/**
 * Vue d'interconnexion : la part (ou sa définition) en cadre, ses parts imbriquées (de proche en proche, avec celles de
 * leurs définitions), ports sur le bord, connexions, interfaces, liaisons (bind) et flux entre ports ou parts.
 * @param {object} doc @param {object} el part ou définition de part @param {object} vue
 * @returns {object} scène
 */
function syvVueInterconnexion(doc, el, vue) {
  const scene = syvScene('interconnexion', vue, el), M = doc.M, connecteurs = [];
  const cadre = syvForme(scene, el, { figure: el.isDef ? 'def' : 'usage', cadre: true });
  const deplier = (x, f, prof) => {
    const ms = syvMembres(x);
    for (const m of ms) {
      const part = m.kind === 'PartUsage' || m.kind === 'ItemUsage' || (m.kind === 'ReferenceUsage' && syvRefs(m, 'typedBy').some(t => /^(Part|Item)Definition$/.test(t.kind)));
      if (part && !m.dir && prof < SYV_PROFONDEUR) {
        const c = syvForme(scene, m, { figure: 'usage', parent: f });
        deplier(m, c, prof + 1);
      } else if (m.kind === 'PortUsage') syvForme(scene, m, { figure: 'port', parent: f, entete: '', libelle: syvLibelle(m) });
      else if (SYV_CONNECTEURS[m.kind] && SYV_CONNECTEURS[m.kind] !== 'allocation') connecteurs.push({ m, f });
    }
  };
  deplier(el, cadre, 0);
  for (const { m, f } of connecteurs) {
    const genre = SYV_CONNECTEURS[m.kind];
    const a = syvFormeBout(M, f, m, m.ends[0]), b = syvFormeBout(M, f, m, m.ends[1]);
    let libelle = m.declaredName ? m.name : '';
    if (m.refs.typedBy) libelle = (libelle ? libelle + ' ' : '') + ': ' + m.refs.typedBy.join(', ');
    if (genre === 'liaison') libelle = '=';
    if (genre === 'flux' && m.refs.item) libelle = (libelle ? libelle + ' ' : '') + 'of ' + m.refs.item[0];
    syvLien(scene, genre, a, b, { semId: m._id, libelle });
  }
  syvDisposerScene(scene, 'droite', 'droite');
  return scene;
}

/**
 * Vue des états : l'état (ou sa définition) en cadre, ses sous-états (états composés dépliés), pseudo-état d'entrée,
 * état final (done), transitions avec « déclencheur [garde] / effet » ; régions d'un état « parallel » séparées.
 * @param {object} doc @param {object} el état ou définition d'état @param {object} vue
 * @returns {object} scène
 */
function syvVueEtats(doc, el, vue) {
  const scene = syvScene('etats', vue, el), transitions = [];
  const cadre = syvForme(scene, el, { figure: el.isDef ? 'def' : 'etat', cadre: true, compartiments: syvActionsEtat(el) });
  const remplir = (corps, f, prof) => {
    f.parallele = syvParallele(doc, f.el);
    for (const s of corps.members) {
      if (s.kind !== 'StateUsage' && s.kind !== 'ExhibitStateUsage') continue;
      const c = syvForme(scene, s, { figure: 'etat', parent: f, compartiments: syvActionsEtat(s) });
      const sc = syvCorps(s, syvAEtats);
      if (prof < SYV_PROFONDEUR && syvAEtats(sc)) remplir(sc, c, prof + 1);
    }
    for (const t of corps.members) if (t.kind === 'TransitionUsage') transitions.push({ t, f });
  };
  remplir(syvCorps(el, syvAEtats), cadre, 0);
  const pseudos = new Map();
  const pseudo = (f, genre, semId) => {
    const k = f.id + genre;
    if (!pseudos.has(k)) pseudos.set(k, syvForme(scene, null, { figure: genre, parent: f, semId: semId || '', entete: '', libelle: '' }));
    return pseudos.get(k);
  };
  for (const { t, f } of transitions) {
    const s0 = t.ends[0] && t.ends[0].res, c0 = t.ends[1] && t.ends[1].res;
    // Source : pseudo-état d'entrée (« entry; then x », « entry action initial ; transition initial then x »)
    let s = null;
    if (s0 && s0.pseudo === 'entry') s = pseudo(f, 'debut');
    else if (s0 && s0.el && s0.el.kind === 'StateActionUsage' && /^entry/.test(s0.el.keyword || '')) s = pseudo(f, 'debut', s0.el._id);
    else if (s0 && s0.el) s = syvChercherEl(cadre, s0.el);
    let c = null;
    if (c0 && c0.pseudo === 'done') c = pseudo(f, 'fin');
    else if (c0 && c0.el) c = syvChercherEl(cadre, c0.el);
    if (!s || !c || s === cadre || c === cadre) continue;
    syvLien(scene, 'transition', s, c, { semId: t._id, libelle: syvLibelleTransition(t) });
  }
  syvDisposerScene(scene, 'droite', 'bas');
  return scene;
}

/**
 * Indique si un état est déclaré « parallel » (le lecteur ne garde pas ce mot : il est relu dans la tête de la déclaration,
 * dans le texte de son fichier).
 * @param {object} doc @param {object} el état @returns {boolean}
 */
function syvParallele(doc, el) {
  if (!el || el.debut == null) return false;
  const fin = el.ouvre != null && el.ouvre > el.debut ? el.ouvre : Math.min(el.fin || el.debut + 200, el.debut + 300);
  const f = doc.fichiers && doc.fichiers.find(x => x.chemin === el.file), src = f ? f.texte : typeof doc.src === 'string' ? doc.src : '';
  return /\bparallel\b/.test(src.slice(el.debut, fin));
}

/**
 * Lignes « entry / do / exit » d'un état (compartiment de ses actions).
 * @param {object} el état @returns {Array<{titre:string, lignes:object[]}>}
 */
function syvActionsEtat(el) {
  const lignes = el.members.filter(m => m.kind === 'StateActionUsage' && m.stateRole && !(m.stateRole === 'entry' && m.name === 'initial'))
    .map(m => ({ t: m.stateRole + ' / ' + (m.name || (m.refs.subsets || [])[0] || m.text || (m.keyword || '').replace(/^\w+\s*/, '')), semId: m._id }));
  return lignes.length ? [{ titre: 'actions', lignes }] : [];
}

/**
 * Libellé d'une transition : « déclencheur [garde] / effet », sinon son nom.
 * @param {object} t transition @returns {string}
 */
function syvLibelleTransition(t) {
  const l = [t.trigger || '', t.guard && t.guard !== 'else' ? '[' + t.guard + ']' : t.guard === 'else' ? '[else]' : '', t.effect ? '/ ' + t.effect : ''].filter(Boolean).join(' ');
  return l || (t.declaredName ? t.name : '');
}

/**
 * Libellé de lien raccourci (au-delà de 44 caractères : « … » ; le texte entier reste dans l'infobulle du lien).
 * @param {string} t @returns {string}
 */
function syvCourt(t) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > 44 ? t.slice(0, 43) + '…' : t; }

/**
 * Vue du flux d'actions : l'action (ou sa définition) en cadre, ses actions (dépliées de proche en proche), nœuds de
 * contrôle, départ (start) et fin (done), paramètres sur le bord, successions (then) et flux d'un paramètre à l'autre.
 * @param {object} doc @param {object} el action ou définition d'action @param {object} vue
 * @returns {object} scène
 */
function syvVueActions(doc, el, vue) {
  const scene = syvScene('actions', vue, el), M = doc.M, successions = [], flux = [];
  const cadre = syvForme(scene, el, { figure: el.isDef ? 'def' : 'usage', cadre: true });
  const parametres = (x, f) => {
    for (const m of syvMembres(x)) if (m.dir && /^(ReferenceUsage|ItemUsage|AttributeUsage|PartUsage|PortUsage)$/.test(m.kind))
      syvForme(scene, m, { figure: 'port', parent: f, entete: '', libelle: m.dir + ' ' + syvLibelle(m) });
  };
  const remplir = (corps, f, prof) => {
    for (const m of corps.members) {
      if (SYV_ACTIONS.test(m.kind)) {
        const c = syvForme(scene, m, { figure: 'usage', parent: f });
        parametres(m, c);
        const sc = syvCorps(m, syvAActions);
        if (prof < SYV_PROFONDEUR && sc !== corps && syvAActions(sc)) remplir(sc, c, prof + 1);
      } else if (SYV_CONTROLES[m.kind]) syvForme(scene, m, { figure: SYV_CONTROLES[m.kind], parent: f, entete: '', libelle: m.declaredName ? m.name : '' });
      else if (m.kind === 'SuccessionAsUsage') successions.push({ m, f });
      else if (m.kind === 'FlowUsage' || m.kind === 'SuccessionFlowUsage') flux.push({ m, f });
    }
  };
  parametres(el, cadre);
  remplir(syvCorps(el, syvAActions), cadre, 0);
  const pseudos = new Map();
  const pseudo = (f, genre) => {
    const k = f.id + genre;
    if (!pseudos.has(k)) pseudos.set(k, syvForme(scene, null, { figure: genre, parent: f, entete: '', libelle: '' }));
    return pseudos.get(k);
  };
  const bout = (e, f, s) => {
    const r = e && e.res;
    if (!r) return null;
    if (r.pseudo === 'start') return pseudo(f, 'debut');
    if (r.pseudo === 'done') return pseudo(f, 'fin');
    return r.el ? syvChercherEl(f, r.el) || syvChercherEl(cadre, r.el) || syvFormeBout(M, f, s, e) : null;
  };
  for (const { m, f } of successions) {
    const a = bout(m.ends[0], f, m), b = bout(m.ends[1], f, m);
    if (a && b && a !== cadre && b !== cadre) syvLien(scene, 'succession', a, b, { semId: m._id, libelle: m.guard ? '[' + m.guard + ']' : '' });
  }
  for (const { m, f } of flux) {
    const a = syvFormeBout(M, f, m, m.ends[0]), b = syvFormeBout(M, f, m, m.ends[1]);
    let libelle = m.declaredName ? m.name : '';
    if (m.refs.item) libelle = (libelle ? libelle + ' ' : '') + 'of ' + m.refs.item[0];
    syvLien(scene, 'flux', a, b, { semId: m._id, libelle });
  }
  syvDisposerScene(scene, 'bas', 'bas');
  return scene;
}

/* ─────────────────────────────── Disposition ─────────────────────────────── */

/**
 * Forme ancêtre (ou elle-même) d'une forme, enfant direct d'un conteneur ; les ports comptent pour leur forme.
 * @param {object} f forme @param {object|null} conteneur conteneur (null : premier niveau)
 * @returns {object|null}
 */
function syvAncetreDans(f, conteneur) {
  for (let x = f; x; x = x.parent) if (x.parent === conteneur && x.figure !== 'port') return x;
  return null;
}

/**
 * Dispose une couche de formes sœurs (positions relatives à 0, 0) par couches (Sugiyama simplifié) : couches d'après les
 * arcs (plus long chemin, cycles rompus), formes sans arc rangées près de leurs voisins ou en rangées à la fin, ordre par
 * barycentres, couches centrées, couches trop longues coupées en rangées.
 * @param {object[]} F formes @param {Array<number[]>} arcs [i, j] : i avant j @param {Array<number[]>} paires voisins
 * @param {'bas'|'droite'} sens @param {{forme:number, couche:number}} ecarts
 * @returns {{w:number, h:number}} taille occupée
 */
function syvCouches(F, arcs, paires, sens, ecarts) {
  if (!F.length) return { w: 0, h: 0 };
  const succ = F.map(() => []), etat = F.map(() => 0), garde = [];
  for (const [a, b] of arcs) if (a !== b) succ[a].push(b);
  const visiter = a => { etat[a] = 1; for (const b of succ[a]) { if (etat[b] === 1) continue; garde.push([a, b]); if (!etat[b]) visiter(b); } etat[a] = 2; };
  const entrants = F.map(() => 0); for (const [a, b] of arcs) if (a !== b) entrants[b]++;
  F.forEach((f, i) => { if (!entrants[i] && !etat[i]) visiter(i); });
  F.forEach((f, i) => { if (!etat[i]) visiter(i); });
  const rang = F.map(() => 0), aArc = F.map(() => false);
  for (const [a, b] of garde) { aArc[a] = aArc[b] = true; }
  for (let k = 0; k < F.length; k++) { let change = false; for (const [a, b] of garde) if (rang[b] < rang[a] + 1) { rang[b] = rang[a] + 1; change = true; } if (!change) break; }
  const voisins = F.map(() => []);
  for (const [a, b] of [...arcs, ...paires]) if (a !== b) { voisins[a].push(b); voisins[b].push(a); }
  const maxRang = Math.max(0, ...rang);
  F.forEach((f, i) => {
    if (aArc[i]) return;
    const v = voisins[i].find(j => aArc[j]);
    rang[i] = v != null ? rang[v] : voisins[i].length ? 0 : (garde.length ? maxRang + 1 : 0);
  });
  const nb = Math.max(...rang) + 1, couches = Array.from({ length: nb }, () => []);
  F.forEach((f, i) => couches[rang[i]].push(i));
  const pos = F.map(() => 0);
  const numeroter = () => couches.forEach(c => c.forEach((i, k) => { pos[i] = k; }));
  numeroter();
  for (let it = 0; it < 8; it++) {
    const desc = it % 2 === 0;
    for (let r = desc ? 1 : nb - 2; desc ? r < nb : r >= 0; r += desc ? 1 : -1) {
      const bary = i => { const v = voisins[i].filter(j => rang[j] !== rang[i]); return v.length ? v.reduce((s, j) => s + pos[j], 0) / v.length : pos[i]; };
      couches[r].sort((a, b) => bary(a) - bary(b) || a - b);
      numeroter();
    }
  }
  const H = sens === 'droite', long = f => (H ? f.h : f.w), larg = f => (H ? f.w : f.h);
  const etendues = [], max = Math.max(5, Math.ceil(Math.sqrt(F.length)) + 1);
  for (const c of couches) for (let k = 0; k < c.length; k += max) etendues.push(c.slice(k, k + max));
  const tailles = etendues.map(c => c.reduce((s, i) => s + long(F[i]), 0) + (c.length - 1) * ecarts.forme);
  const maxT = Math.max(...tailles);
  let p = 0;
  etendues.forEach((c, r) => {
    const epais = Math.max(...c.map(i => larg(F[i])));
    let q = (maxT - tailles[r]) / 2;
    for (const i of c) {
      const f = F[i];
      if (H) { f.x = p + (epais - f.w) / 2; f.y = q; } else { f.x = q; f.y = p + (epais - f.h) / 2; }
      q += long(f) + ecarts.forme;
    }
    p += epais + (r < etendues.length - 1 ? ecarts.couche : 0);
  });
  for (const f of F) { f.x = Math.round(f.x); f.y = Math.round(f.y); }
  // Arcs qui sautent une couche ou remontent : tracés en détour (syvTracer), place réservée à côté du contenu
  const longs = arcs.filter(([a, b]) => a !== b && Math.abs(rang[b] - rang[a]) !== 1).length;
  return H ? { w: Math.round(p), h: Math.round(maxT), longs } : { w: Math.round(maxT), h: Math.round(p), longs };
}

/**
 * Arcs et voisins entre les enfants d'un conteneur d'après les liens de la scène (ceux qui relient deux de ses enfants,
 * ou leur contenu) : un lien hiérarchique d'une vue générale va du haut (général, tout, usage) vers le bas.
 * @param {object} scene @param {object[]} F enfants @param {object|null} conteneur
 * @returns {{arcs:Array<number[]>, paires:Array<number[]>}}
 */
function syvArcs(scene, F, conteneur) {
  const idx = new Map(F.map((f, i) => [f, i])), arcs = [], paires = [];
  for (const l of scene.liens) {
    const a = idx.get(syvAncetreDans(l.source, conteneur)), b = idx.get(syvAncetreDans(l.cible, conteneur));
    if (a == null || b == null || a === b) continue;
    if (scene.genre !== 'generale') arcs.push([a, b]);
    else if (l.hier === 'cible') arcs.push([b, a]);
    else if (l.hier === 'source') arcs.push([a, b]);
    else paires.push([a, b]);
  }
  return { arcs, paires };
}

/**
 * Dispose toute une scène : contenu de chaque conteneur, des plus profonds vers le premier niveau (un conteneur prend la
 * taille de son contenu), puis positions absolues, ports sur le bord (côté de leurs partenaires) et tracés des liens.
 * @param {object} scene @param {'bas'|'droite'} sens sens du premier niveau @param {'bas'|'droite'} sensInterieur sens dans
 *   un conteneur
 */
function syvDisposerScene(scene, sens, sensInterieur) {
  const ecarts = scene.genre === 'interconnexion' ? { forme: SYV_ECARTS.forme, couche: SYV_ECARTS.couche + 30 } : { forme: SYV_ECARTS.forme, couche: SYV_ECARTS.couche };
  // Ports de chaque forme répartis sur deux côtés, sous l'en-tête : hauteur minimale ; étiquettes écrites dans la forme
  // (hors du cadre de la vue) : largeur minimale, et bord intérieur d'un conteneur
  for (const f of scene.formes) {
    if (!f.ports.length) continue;
    f.hPorts = f.h0 + Math.ceil(f.ports.length / 2) * SYV_ECARTS.pasPort + 6;
    f.h = Math.max(f.h, f.hPorts);
    if (f.cadre) continue;
    f.lPorts = Math.ceil(Math.max(...f.ports.map(p => syvLargeur(p.libelle, 11)))) + 14;
    f.w0 = f.w = Math.max(f.w0, (f.ports.length > 1 ? 2 : 1) * f.lPorts + 20);
  }
  const disposer = (f, s) => {
    for (const c of f.enfants) if (c.enfants.length) disposer(c, sensInterieur);
    const F = f.enfants, { arcs, paires } = syvArcs(scene, F, f);
    // Régions d'un état « parallel » : l'une sous l'autre, sans arc entre elles
    const t = syvCouches(F, f.parallele ? [] : arcs, f.parallele ? [] : paires, f.parallele ? 'droite' : s, f.parallele ? { forme: SYV_ECARTS.forme, couche: 0 } : syvEcartsLibelles(scene, F, f, s, ecarts));
    const bord = SYV_ECARTS.bord + (f.lPorts || 0);
    // Place des détours : couloir à droite du contenu (de haut en bas) ou dessous (de gauche à droite), libellés compris
    f.sensDisp = f.parallele ? 'droite' : s;
    const detours = f.parallele ? 0 : t.longs, lib = detours ? Math.max(0, ...scene.liens.filter(l => F.includes(syvAncetreDans(l.source, f)) && F.includes(syvAncetreDans(l.cible, f))).map(l => syvLargeur(l.libelle, 11))) : 0;
    const resW = detours && f.sensDisp === 'bas' ? 12 + 14 * detours + Math.ceil(lib) + 8 : 0, resH = detours && f.sensDisp === 'droite' ? 12 + 14 * detours + 18 : 0;
    f.w = Math.max(f.w0, t.w + 2 * bord + resW);
    f.h = Math.max(f.hPorts || 0, f.h0 + t.h + SYV_ECARTS.bord + resH);
    const dx = resW ? bord : Math.round((f.w - t.w) / 2);
    for (const c of F) { c.rx = c.x + dx; c.ry = c.y + f.h0; }
  };
  const racines = scene.formes.filter(f => !f.parent && f.figure !== 'port');
  for (const f of racines) if (f.enfants.length) disposer(f, sens);
  const { arcs, paires } = syvArcs(scene, racines, null);
  syvCouches(racines, arcs, paires, sens, syvEcartsLibelles(scene, racines, null, sens, ecarts));
  scene.sensDisp = sens;
  const placer = (f, x, y) => { f.x = x; f.y = y; for (const c of f.enfants) placer(c, x + c.rx, y + c.ry); };
  for (const f of racines) placer(f, f.x + SYV_ECARTS.marge, f.y + SYV_ECARTS.marge);
  syvPlacerPorts(scene);
  syvTracer(scene);
}

/**
 * Écarts d'une couche de formes sœurs disposées de gauche à droite, élargis pour les libellés des liens qui vont d'une
 * couche à l'autre (déclencheur et garde d'une transition, nom d'une interface).
 * @param {object} scene @param {object[]} F formes sœurs @param {object|null} conteneur @param {'bas'|'droite'} sens
 * @param {{forme:number, couche:number}} ecarts écarts de base
 * @returns {{forme:number, couche:number}}
 */
function syvEcartsLibelles(scene, F, conteneur, sens, ecarts) {
  if (sens !== 'droite') return ecarts;
  const dans = new Set(F);
  let l0 = 0;
  for (const l of scene.liens) {
    const a = syvAncetreDans(l.source, conteneur), b = syvAncetreDans(l.cible, conteneur);
    if (a && b && a !== b && dans.has(a) && dans.has(b)) l0 = Math.max(l0, syvLargeur(l.libelle, 11), SYV_LIENS[l.genre] && SYV_LIENS[l.genre].motCle ? syvLargeur('«' + SYV_LIENS[l.genre].motCle + '»', 11) : 0);
  }
  return { forme: ecarts.forme, couche: Math.min(280, Math.max(ecarts.couche, Math.ceil(l0) + 40)) };
}

/**
 * Centre d'une forme.
 * @param {object} f @returns {number[]}
 */
function syvCentre(f) { return [f.x + f.w / 2, f.y + f.h / 2]; }

/**
 * Place les ports de chaque forme sur son bord gauche ou droit, du côté de leurs partenaires (port d'une part relié vers
 * l'extérieur, port du cadre relié vers l'intérieur), dans l'ordre vertical des partenaires ; un côté plein déborde sur
 * l'autre.
 * @param {object} scene
 */
function syvPlacerPorts(scene) {
  const partenaires = new Map();
  const noter = (p, autre) => { if (p.figure === 'port') { if (!partenaires.has(p)) partenaires.set(p, []); partenaires.get(p).push(autre); } };
  for (const l of scene.liens) { noter(l.source, l.cible); noter(l.cible, l.source); }
  for (const f of scene.formes) {
    if (!f.ports.length) continue;
    const c = syvCentre(f), cap = Math.max(1, Math.floor((f.h - f.h0 - 6) / SYV_ECARTS.pasPort));
    const cote = { g: [], d: [] };
    const cible = p => { const l = partenaires.get(p) || []; if (!l.length) return null; const xs = l.map(o => syvCentre(syvPortOuForme(o))); return [xs.reduce((s, q) => s + q[0], 0) / xs.length, xs.reduce((s, q) => s + q[1], 0) / xs.length]; };
    f.ports.forEach((p, k) => {
      const q = cible(p);
      p.vise = q;
      const gauche = q ? q[0] < c[0] : /^in\b/.test(p.libelle) ? true : /^out\b/.test(p.libelle) ? false : k % 2 === 0;
      cote[gauche ? 'g' : 'd'].push(p);
    });
    while (cote.g.length > cap && cote.d.length < cap) cote.d.push(cote.g.pop());
    while (cote.d.length > cap && cote.g.length < cap) cote.g.push(cote.d.pop());
    for (const k of ['g', 'd']) {
      const l = cote[k].sort((a, b) => ((a.vise || c)[1] - (b.vise || c)[1]));
      const haut = f.y + f.h0, bas = f.y + f.h - 6, pas = l.length ? (bas - haut) / l.length : 0;
      l.forEach((p, i) => {
        const y = Math.round(haut + pas * (i + 0.5));
        p.cote = k;
        p.x = k === 'g' ? f.x - p.w / 2 : f.x + f.w - p.w / 2;
        p.y = y - p.h / 2;
      });
    }
  }
}

/**
 * Forme qui donne la position d'une extrémité (un port non encore placé : sa forme).
 * @param {object} f @returns {object}
 */
function syvPortOuForme(f) { return f.figure === 'port' && !f.cote && f.parent ? f.parent : f; }

/**
 * Point où le segment du centre d'une forme vers un point sort de la forme (bord du rectangle).
 * @param {object} f forme @param {number[]} p point visé
 * @returns {number[]}
 */
function syvBord(f, p) {
  const [cx, cy] = syvCentre(f), dx = p[0] - cx, dy = p[1] - cy;
  if (!dx && !dy) return [cx, f.y];
  const tx = dx ? (f.w / 2) / Math.abs(dx) : Infinity, ty = dy ? (f.h / 2) / Math.abs(dy) : Infinity, t = Math.min(tx, ty);
  return [Math.round((cx + dx * t) * 10) / 10, Math.round((cy + dy * t) * 10) / 10];
}

/**
 * Trace les liens d'une scène disposée : d'un bord à l'autre (port : du côté où il sort), réflexifs en boucle, liens
 * parallèles écartés.
 * @param {object} scene
 */
function syvTracer(scene) {
  const paires = new Map(), detours = new Map();
  for (const l of scene.liens) { const k = [l.source.id, l.cible.id].sort().join('|'); if (!paires.has(k)) paires.set(k, []); paires.get(k).push(l); }
  for (const l of scene.liens) {
    const s = l.source, c = l.cible, cs = syvCentre(s), cc = syvCentre(c);
    if (s === c) { l.points = [[s.x + s.w, cs[1] - 8], [s.x + s.w + 26, cs[1] - 8], [s.x + s.w + 26, cs[1] + 8], [s.x + s.w, cs[1] + 8]]; continue; }
    // Port : le lien part de son côté extérieur (ou intérieur pour le cadre), dans l'axe du bord
    const sortie = (p, autre) => {
      if (p.figure !== 'port' || !p.cote) return syvBord(p, syvCentre(autre));
      const vers = syvCentre(autre)[0] < syvCentre(p)[0] ? p.x : p.x + p.w;
      return [vers, p.y + p.h / 2];
    };
    const groupe = paires.get([s.id, c.id].sort().join('|'));
    let a = sortie(s, c), b = sortie(c, s);
    if (groupe.length > 1 && s.figure !== 'port' && c.figure !== 'port') {
      const k = (groupe.indexOf(l) - (groupe.length - 1) / 2) * 16, [u, v] = s.id < c.id ? [cs, cc] : [cc, cs], d = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1;
      const nx = -(v[1] - u[1]) / d * k, ny = (v[0] - u[0]) / d * k;
      const ds = [cs[0] + nx, cs[1] + ny], dc = [cc[0] + nx, cc[1] + ny];
      const dedans = (f, q) => q[0] > f.x + 2 && q[0] < f.x + f.w - 2 && q[1] > f.y + 2 && q[1] < f.y + f.h - 2;
      if (dedans(s, ds) && dedans(c, dc)) { a = syvSortieDe(s, ds, dc); b = syvSortieDe(c, dc, ds); }
      // Libellé du côté extérieur du faisceau (deux transitions opposées : de part et d'autre)
      if (k) l.cote = [nx / Math.abs(k), ny / Math.abs(k)];
    }
    l.points = [a, b];
    syvDetour(scene, l, detours);
  }
}

/**
 * Indique si un segment traverse une forme (rectangle réduit de 2 px).
 * @param {number[]} a @param {number[]} b @param {object} f
 * @returns {boolean}
 */
function syvTraverse(a, b, f) {
  const x0 = f.x + 2, y0 = f.y + 2, x1 = f.x + f.w - 2, y1 = f.y + f.h - 2;
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (!p) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 < t1;
}

/**
 * Lien droit qui traverse une autre forme : tracé en détour par un couloir à droite du contenu de leur conteneur commun
 * (disposé de haut en bas) ou dessous (de gauche à droite), d'un bord à l'autre ; libellé le long du couloir.
 * @param {object} scene @param {object} l lien tracé droit @param {Map<object,number>} detours détours déjà tracés par conteneur
 */
function syvDetour(scene, l, detours) {
  const s = l.source, c = l.cible;
  if (s === c || s.figure === 'port' || c.figure === 'port') return;
  const ancetres = f => { const l0 = []; for (let x = f; x; x = x.parent) l0.push(x); return l0; };
  const as = ancetres(s), ac = ancetres(c);
  const evites = scene.formes.filter(f => f.figure !== 'port' && !as.includes(f) && !ac.includes(f)
    && !ancetres(f).some(x => x === s || x === c));
  if (!evites.some(f => syvTraverse(l.points[0], l.points[1], f))) return;
  const commun = as.find(x => x !== s && ac.includes(x)) || null;
  const freres = commun ? commun.enfants : scene.formes.filter(f => !f.parent && f.figure !== 'port');
  const k = detours.get(commun) || 0;
  detours.set(commun, k + 1);
  const sens = commun ? commun.sensDisp : scene.sensDisp;
  if (sens === 'droite') {
    const yb = Math.max(...freres.map(f => f.y + f.h)) + 12 + 14 * k, xs = s.x + s.w / 2, xc = c.x + c.w / 2;
    l.points = [[xs, s.y + s.h], [xs, yb], [xc, yb], [xc, c.y + c.h]];
    l.cote = [0, 1];
  } else {
    const xr = Math.max(...freres.map(f => f.x + f.w)) + 12 + 14 * k, ys = s.y + s.h / 2, yc = c.y + c.h / 2;
    l.points = [[s.x + s.w, ys], [xr, ys], [xr, yc], [c.x + c.w, yc]];
    l.cote = [1, 0];
  }
}

/**
 * Point où une demi-droite partie de l'intérieur d'une forme en sort.
 * @param {object} f forme @param {number[]} a départ (dans la forme) @param {number[]} b direction
 * @returns {number[]}
 */
function syvSortieDe(f, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const tx = dx > 0 ? (f.x + f.w - a[0]) / dx : dx < 0 ? (f.x - a[0]) / dx : Infinity, ty = dy > 0 ? (f.y + f.h - a[1]) / dy : dy < 0 ? (f.y - a[1]) / dy : Infinity;
  const t = Math.min(tx, ty);
  return Number.isFinite(t) ? [Math.round((a[0] + dx * t) * 10) / 10, Math.round((a[1] + dy * t) * 10) / 10] : a;
}

/**
 * Indique si deux formes se chevauchent (contrôle des dispositions, tests).
 * @param {object} a @param {object} b @returns {boolean}
 */
function syvChevauche(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

/* ─────────────────────────────── Dessin SVG ─────────────────────────────── */

/**
 * Échappe un texte pour le SVG.
 * @param {string} s @returns {string}
 */
function syvEsc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/**
 * Texte SVG.
 * @param {number} x @param {number} y @param {string} t @param {string} [classe] @param {string} [ancre] start, middle, end
 * @returns {string}
 */
function syvTexte(x, y, t, classe, ancre) { return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" class="${classe || 'syv-t'}" text-anchor="${ancre || 'middle'}">${syvEsc(t)}</text>`; }

/**
 * Dessin d'une forme en notation SysML v2 : définition à angles droits, usage à angles arrondis (référence : bord en
 * pointillés), mot-clé entre guillemets, nom, compartiments ; paquetage en dossier ; port en carré sur le bord ; départ,
 * fin, fourche et jonction, décision et fusion.
 * @param {object} f forme @returns {string} groupe SVG
 */
function syvDessinForme(f) {
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2;
  const attrs = `class="syv-f syv-${f.figure}${f.cadre ? ' syv-cadre' : ''}" data-forme="${f.id}"${f.semId ? ` data-sem="${syvEsc(f.semId)}"` : ''}${f.famille ? ` data-c="${f.famille}"` : ''}`;
  let c = '';
  switch (f.figure) {
    case 'port': {
      c += `<rect class="syv-c syv-port-c" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      // Étiquette dans la forme du port (dehors pour le cadre de la vue : rien n'y est dessiné)
      const gauche = f.cote === 'g', dehors = !!(f.parent && f.parent.cadre);
      const tx = gauche !== dehors ? x + w + 4 : x - 4;
      c += syvTexte(tx, y + h / 2 + 4, f.libelle, 'syv-t syv-etiquette', gauche !== dehors ? 'start' : 'end');
      break;
    }
    case 'debut': c += `<circle class="syv-plein" cx="${cx}" cy="${cy}" r="${w / 2}"/>`; break;
    case 'fin': c += `<circle class="syv-c" cx="${cx}" cy="${cy}" r="${w / 2}"/><circle class="syv-plein" cx="${cx}" cy="${cy}" r="${w / 2 - 5}"/>`; break;
    case 'fourche': c += `<rect class="syv-plein" x="${x}" y="${y}" width="${w}" height="${h}"/>` + (f.libelle ? syvTexte(x + w + 6, cy + 4, f.libelle, 'syv-t syv-etiquette', 'start') : ''); break;
    case 'losange': c += `<path class="syv-c" d="M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z"/>` + (f.libelle ? syvTexte(x + w + 6, cy + 4, f.libelle, 'syv-t syv-etiquette', 'start') : ''); break;
    case 'paquet': {
      const tw = Math.min(w * 0.6, Math.max(40, syvLargeur(f.libelle, 12, true) + 16));
      c += `<path class="syv-c" d="M${x},${y + 16} V${y} H${x + tw} V${y + 16} H${x + w} V${y + h} H${x} Z M${x},${y + 16} H${x + tw}"/>`;
      c += syvTexte(x + 6, y + 12, '«' + f.entete + '»', 'syv-t syv-mc', 'start') + syvTexte(cx, y + 40, f.libelle, 'syv-t syv-nom');
      break;
    }
    default: {
      const arrondi = f.figure === 'def' ? 0 : f.figure === 'etat' ? 14 : 10;
      c += `<rect class="syv-c${f.ref ? ' syv-tirets' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${arrondi}"/>`;
      let yy = y + 8;
      if (f.entete) { yy += 11; c += syvTexte(cx, yy, '«' + f.entete + (f.parallele ? '» parallel' : '»'), 'syv-t syv-mc'); }
      yy += 16;
      c += syvTexte(cx, yy, f.libelle, 'syv-t syv-nom' + (f.abstrait ? ' syv-abstrait' : ''));
      yy += 6;
      for (const k of f.compartiments) {
        yy += 2;
        c += `<line class="syv-sep" x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}"/>`;
        yy += 13;
        c += syvTexte(cx, yy, k.titre, 'syv-t syv-titre');
        yy += 2;
        for (const l of k.lignes) {
          yy += SYV_LIGNE;
          const t = syvTexte(x + 8, yy - 3, l.t, 'syv-t syv-ligne', 'start');
          c += l.semId ? `<g data-sem="${syvEsc(l.semId)}">${t}</g>` : t;
        }
        yy += 4;
      }
      // Régions d'un état « parallel » : traits en pointillés entre ses sous-états
      if (f.parallele && f.enfants.length > 1) {
        const l = f.enfants.slice().sort((a, b) => a.y - b.y);
        for (let i = 1; i < l.length; i++) {
          const ym = Math.round((l[i - 1].y + l[i - 1].h + l[i].y) / 2);
          c += `<line class="syv-region" x1="${x}" y1="${ym}" x2="${x + w}" y2="${ym}"/>`;
        }
      }
    }
  }
  return `<g ${attrs}>${c}</g>`;
}

/**
 * Pointe d'un lien.
 * @param {string} genre triangle, triangleDeux (typage : deux points), triangleBarre (redéfinition), fleche, plein,
 *   losange, losangePlein
 * @param {number[]} p pointe @param {number[]} q point précédent
 * @returns {string}
 */
function syvPointe(genre, p, q) {
  const dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const pt = (a, b) => `${(p[0] - ux * a + nx * b).toFixed(1)},${(p[1] - uy * a + ny * b).toFixed(1)}`;
  const rond = a => `<circle class="syv-plein" cx="${(p[0] - ux * a).toFixed(1)}" cy="${(p[1] - uy * a).toFixed(1)}" r="1.8"/>`;
  switch (genre) {
    case 'triangle': return `<path class="syv-pointe-vide" d="M${pt(0, 0)} L${pt(14, 7)} L${pt(14, -7)} Z"/>`;
    case 'triangleDeux': return `<path class="syv-pointe-vide" d="M${pt(0, 0)} L${pt(14, 7)} L${pt(14, -7)} Z"/>` + rond(19) + rond(25);
    case 'triangleBarre': return `<path class="syv-pointe-vide" d="M${pt(0, 0)} L${pt(14, 7)} L${pt(14, -7)} Z"/><path class="syv-trait-l" d="M${pt(18, 7)} L${pt(18, -7)}"/>`;
    case 'plein': return `<path class="syv-pointe-pleine" d="M${pt(0, 0)} L${pt(11, 5)} L${pt(11, -5)} Z"/>`;
    case 'losange': return `<path class="syv-pointe-vide" d="M${pt(0, 0)} L${pt(8, 5)} L${pt(16, 0)} L${pt(8, -5)} Z"/>`;
    case 'losangePlein': return `<path class="syv-pointe-pleine" d="M${pt(0, 0)} L${pt(8, 5)} L${pt(16, 0)} L${pt(8, -5)} Z"/>`;
    case 'fleche': return `<path class="syv-trait-l" d="M${pt(11, 6)} L${pt(0, 0)} L${pt(11, -6)}"/>`;
    default: return '';
  }
}

/**
 * Notation de chaque genre de lien : pointe à la cible, pointe à la source, pointillés, mot-clé (docs/SYSML2-NOTATION.md).
 */
const SYV_LIENS = {
  specialisation: { fin: 'triangle' },
  typage: { fin: 'triangleDeux' },
  'sous-ensemble': { fin: 'fleche', motCle: 'subsets' },
  redefinition: { fin: 'triangleBarre' },
  composition: { debut: 'losangePlein', fin: 'fleche' },
  reference: { debut: 'losange', fin: 'fleche' },
  connexion: {},
  interface: {},
  liaison: {},
  flux: { fin: 'plein' },
  succession: { fin: 'fleche' },
  transition: { fin: 'fleche' },
  satisfy: { fin: 'fleche', tirets: true, motCle: 'satisfy' },
  dependance: { fin: 'fleche', tirets: true },
  allocation: { fin: 'fleche', tirets: true, motCle: 'allocate' },
  import: { fin: 'fleche', tirets: true, motCle: 'import' }
};

/**
 * Dessin d'un lien : trait (pointillés au besoin), pointes, mot-clé et libellé au milieu.
 * @param {object} l lien @returns {string} groupe SVG
 */
function syvDessinLien(l) {
  const p = l.points;
  if (p.length < 2) return '';
  const n = SYV_LIENS[l.genre] || {};
  const d = 'M' + p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L');
  let out = `<path class="syv-zone-l" d="${d}"/><path class="syv-trait-l${n.tirets ? ' syv-tirets' : ''}" d="${d}"/>`;
  if (n.fin) out += syvPointe(n.fin, p[p.length - 1], p[p.length - 2]);
  if (n.debut) out += syvPointe(n.debut, p[0], p[1]);
  const i = Math.floor((p.length - 1) / 2), a = p[i], b = p[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  // Côté du libellé : celui du faisceau (liens parallèles), sinon au-dessus d'un trait plutôt horizontal, à droite d'un
  // trait plutôt vertical
  const dx = b[0] - a[0], dy = b[1] - a[1], cote = l.cote || (Math.abs(dx) >= Math.abs(dy) ? [0, -1] : [1, 0]);
  const ancre = cote[0] > 0.5 ? 'start' : cote[0] < -0.5 ? 'end' : 'middle';
  if (l.genre === 'composition' || l.genre === 'reference') {
    // Nom de l'usage près de la définition qui le type (bout de la flèche)
    const q = p[p.length - 1], r = p[p.length - 2], ex = r[0] - q[0], ey = r[1] - q[1], dd = Math.hypot(ex, ey) || 1;
    if (l.libelle) out += syvTexte(q[0] + ex / dd * 26 + cote[0] * 8, q[1] + ey / dd * 26 + cote[1] * 8 + 4, l.libelle, 'syv-t syv-etiquette', ancre);
  } else {
    const lignes = [n.motCle ? '«' + n.motCle + '»' : '', l.libelle].filter(Boolean);
    // Lignes empilées en s'éloignant du trait : au-dessus, au-dessous, ou centrées à côté
    const nb = lignes.length, haut = cote[1] < -0.5, bas = cote[1] > 0.5;
    lignes.forEach((t, k) => {
      const y = haut ? my - 6 - (nb - 1 - k) * 13 : bas ? my + 15 + k * 13 : my + 4 + (k - (nb - 1) / 2) * 13;
      out += syvTexte(mx + (haut || bas ? 0 : cote[0] * 8), y, t, 'syv-t syv-etiquette', ancre);
    });
  }
  if (l.titre && l.titre !== l.libelle) out += `<title>${syvEsc(l.titre)}</title>`;
  return `<g class="syv-l syv-l-${l.genre}" data-lien="${l.id}"${l.semId ? ` data-sem="${syvEsc(l.semId)}"` : ''}>${out}</g>`;
}

/**
 * Dessine une scène : formes (conteneurs d'abord, ports au-dessus), puis liens ; cadre de la vue (viewBox) autour de tout,
 * étiquettes des ports comprises.
 * @param {object} scene @returns {{svg:string, vb:number[]}}
 */
function syvSvg(scene) {
  const profondeur = f => { let k = f.figure === 'port' ? 1 : 0; for (let p = f.parent; p; p = p.parent) k++; return k; };
  const formes = scene.formes.slice().sort((a, b) => profondeur(a) - profondeur(b));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const etendre = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const f of formes) {
    etendre(f.x, f.y); etendre(f.x + f.w, f.y + f.h);
    if (f.figure === 'port' && f.libelle && f.parent && f.parent.cadre) { const lw = syvLargeur(f.libelle, 11) + 6; etendre(f.cote === 'g' ? f.x - lw : f.x + f.w + lw, f.y); }
  }
  for (const l of scene.liens) {
    for (const q of l.points) etendre(q[0], q[1]);
    // Libellés (au milieu du tracé, d'un côté ou de l'autre)
    const lw = Math.max(syvLargeur(l.libelle, 11), SYV_LIENS[l.genre] && SYV_LIENS[l.genre].motCle ? 60 : 0);
    if (lw && l.points.length > 1) {
      const i = Math.floor((l.points.length - 1) / 2), mx = (l.points[i][0] + l.points[i + 1][0]) / 2, my = (l.points[i][1] + l.points[i + 1][1]) / 2;
      etendre(mx - lw - 10, my - 32); etendre(mx + lw + 10, my + 32);
    }
  }
  if (!Number.isFinite(x0)) { x0 = y0 = 0; x1 = y1 = 100; }
  const svg = formes.map(syvDessinForme).join('') + scene.liens.map(syvDessinLien).join('');
  return { svg, vb: [Math.floor(x0 - 30), Math.floor(y0 - 30), Math.ceil(x1 - x0 + 60), Math.ceil(y1 - y0 + 60)] };
}

/* ─────────────────────────────── Extensions de l'adaptateur ─────────────────────────────── */

/**
 * Diagrammes du format SysML v2 (contrat de 28-formats.js) : vues calculées depuis le modèle, dessinées par
 * sysml/70-vue.js ; aucun fichier de diagrammes (rien à charger ni à enregistrer), aucune création.
 */
const SYV_DIAGRAMMES = {
  extensions: [],
  /** @returns {boolean} aucun fichier de diagrammes à part */
  reconnait() { return false; },
  /** @returns {Promise<null>} aucun fichier à associer */
  async associer() { return null; },
  /** @returns {Promise<void>} sans objet */
  async charger() {},
  /** @returns {Promise<{ok:boolean, message:string}>} rien à écrire : les vues sont calculées */
  async enregistrer() { return { ok: true, message: '' }; },
  /** @returns {boolean} rien en attente */
  enAttente() { return false; },
  /** @returns {string} */
  messageAbsent() { return ''; },
  /** @returns {string} */
  messageSeul() { return ''; },
  /** Modèle modifié (relu) : vue affichée recalculée, liste refaite. @param {object} op @returns {boolean} false : le reste de l'interface suit */
  apresModification(op) { if (typeof sywApresModification === 'function') sywApresModification(op); return false; },
  /** Élément créé : vue affichée recalculée. */
  apresCreation() { if (typeof sywRafraichir === 'function') sywRafraichir(); },
  /** Redessine la vue affichée (thème). */
  redessiner() { if (typeof sywDessiner === 'function') sywDessiner(false); },
  /** Pas de marque de validation dans les vues. */
  apresValidation() {},
  /** @param {object|null} el élément choisi : mis en évidence dans la vue affichée */
  apresChoix(el) { if (typeof sywApresChoix === 'function') sywApresChoix(el); },
  /** @param {object} el @returns {string} HTML de la rubrique « Diagrammes » du détail */
  rubrique(el) { return typeof sywRubrique === 'function' ? sywRubrique(el) : ''; },
  /** @returns {Array} vues calculées non rangées dans l'explorateur de projet (rien n'est enregistré) */
  arborescence() { return []; },
  /** @param {string} cle « vue:genre:id » @param {string} [semId] @param {object} [opts] */
  ouvrir(cle, semId, opts) { if (typeof sywOuvrir === 'function') sywOuvrir(cle, semId, opts); },
  /** Oublie la vue du modèle précédent. */
  reinitialiser() { if (typeof sywReinitialiser === 'function') sywReinitialiser(); },
  /** @returns {Array} aucun diagramme à créer : les vues sont calculées */
  types() { return []; },
  /** @throws {Error} sans objet */
  creer() { throw new Error(_L('SysML v2: views are computed from the model, there is nothing to create.')); },
  /** @returns {string} refus : une vue calculée se modifie par le modèle */
  coller() { return _L('View computed from the model: paste the list in the tree.'); }
};

/** Vues calculées proposées sur un élément (menu « Vues ▸ », palette de commandes). */
const SYV_VUES = {
  /** @param {object} doc @param {object} el nœud @returns {Array<{cle:string, nom:string}>} */
  pour(doc, el) { return syvVuesPour(doc, el); },
  /** @param {object} el @param {object} type vue (pour) @returns {{nbElements:number, nbLiens:number}} */
  ouvrir(el, type) { return (typeof sywOuvrir === 'function' && sywOuvrir('vue:' + type.cle)) || { nbElements: 0, nbLiens: 0 }; }
};

FMT_SYSML.diagrammes = SYV_DIAGRAMMES;
FMT_SYSML.vues = SYV_VUES;
/** Interface propre au format : vue des diagrammes SysML v2 (sysml/70-vue.js). */
FMT_SYSML.initialiser = () => { if (typeof sywInitialiser === 'function') sywInitialiser(); };
// Simulation animée dans la vue des états ou du flux d'actions de l'élément simulé
Object.assign(FMT_SYSML.simulation, {
  /** @param {string[]} ids @param {string} [cible] @returns {Array<{uid:string, nom:string, n:number}>} vues qui le montrent */
  diagrammes(ids, cible) { return typeof sywDiagrammesSimulation === 'function' ? sywDiagrammesSimulation(ids, cible) : []; },
  /** @returns {string} clé de la vue affichée, ou '' */
  affiche() { return typeof sywAffiche === 'function' ? sywAffiche() : ''; },
  /** @param {string} uid « vue:genre:id » */
  ouvrir(uid) { if (typeof sywOuvrir === 'function') sywOuvrir(uid); },
  /** @param {object|null} marques état de la simulation */
  animer(marques) { if (typeof sywAnimerSimulation === 'function') sywAnimerSimulation(marques); }
});

/** Feuille de styles des dessins SVG des vues (classes syv-…), reprise de src/css/styles.css par le build. */
const LEC_SVG_CSS = "svg.clair{--syv-toile:#f6f8fc;--syv-fond:#ffffff;--syv-trait:#4a5675;--syv-texte:#1f2335;--syv-accent:#2f5fd0;--c-STR:#1f8ca3;--c-BEH:#3a9a3a;--c-REQ:#c2387a;--c-ORG:#8250df}svg.sombre{--syv-toile:#151826;--syv-fond:#1f2333;--syv-trait:#9aa4c4;--syv-texte:#dfe5f7;--syv-accent:#7aa7ff;--c-STR:#89dceb;--c-BEH:#a6e3a1;--c-REQ:#f5c2e7;--c-ORG:#cba6f7}.syv-toile{fill:var(--syv-toile)}svg{flex:1 1 0;min-width:0;width:100%;height:100%;display:block;user-select:none;text-rendering:geometricPrecision}.syv-c{fill:var(--syv-fond);stroke:var(--syv-trait);stroke-width:1.2}.syv-f[data-c=\"STR\"]>.syv-c{fill:color-mix(in srgb,var(--c-STR) 9%,var(--syv-fond))}.syv-f[data-c=\"BEH\"]>.syv-c{fill:color-mix(in srgb,var(--c-BEH) 9%,var(--syv-fond))}.syv-f[data-c=\"REQ\"]>.syv-c{fill:color-mix(in srgb,var(--c-REQ) 9%,var(--syv-fond))}.syv-cadre>.syv-c{fill:none}.syv-tirets{stroke-dasharray:6 4}.syv-region{stroke:var(--syv-trait);stroke-dasharray:4 4;opacity:.7}.syv-plein,.syv-pointe-pleine{fill:var(--syv-trait)}.syv-pointe-vide{fill:var(--syv-fond);stroke:var(--syv-trait);stroke-width:1.2}.syv-sep,.syv-trait-l{fill:none;stroke:var(--syv-trait);stroke-width:1.2}.syv-zone-l{fill:none;stroke:transparent;stroke-width:10}.syv-t{font-size:12px;fill:var(--syv-texte);font-family:-apple-system,'Segoe UI',sans-serif}.syv-nom{font-weight:700}.syv-mc{font-size:11px;opacity:.85}.syv-titre{font-size:11px;font-style:italic;opacity:.8}.syv-abstrait{font-style:italic}.syv-etiquette{font-size:11px;paint-order:stroke;stroke:var(--syv-toile);stroke-width:3px}[data-sem]{cursor:pointer}.syv-f[data-sem]:hover>.syv-c,.syv-l[data-sem]:hover>.syv-trait-l{stroke:var(--syv-accent)}.syv-sel>.syv-c,.syv-sel>.syv-trait-l,.syv-sel>.syv-plein{stroke:var(--syv-accent) !important;stroke-width:2.6px;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--syv-accent) 55%,transparent))}g.syv-sel>text{fill:var(--syv-accent)}svg{--sim-actif:#2ea043;--sim-franchi:#e5a00d;--sim-point:#e5534b}.syv-f.sim-actif>.syv-c{stroke:var(--sim-actif) !important;stroke-width:3px}.syv-f.sim-actif{filter:drop-shadow(0 0 4px var(--sim-actif))}.syv-f.sim-visite>.syv-c{stroke:var(--sim-actif) !important;stroke-dasharray:4 3;stroke-width:1.6px}.syv-l.sim-franchi>.syv-trait-l{stroke:var(--sim-franchi) !important;stroke-width:3.2px;stroke-dasharray:9 5;animation:sim-flux .7s linear infinite}.syv-f.sim-point>.syv-c,.syv-l.sim-point>.syv-trait-l{stroke:var(--sim-point) !important}@media (prefers-reduced-motion:reduce){.syv-l.sim-franchi>.syv-trait-l{animation:none}}";
/* ── src/lecteur-sysml/socle-fin.js ── */
/* ═══════════════════════════════════════════════════════════════════════
   LECTEUR SysML v2 — API (après l'adaptateur du format)
   ───────────────────────────────────────────────────────────────────────
   ArcatureLecteurSysml : lecteur autonome de modèles SysML v2 (notation textuelle .sysml, archives .kpar,
   projet en dossier), en lecture seule, pour une application hôte (Arcalyse). Assemblé par
   « node build.js --lecteur-sysml » en un seul fichier JS sans dépendance, utilisable dans une page
   (window.ArcatureLecteurSysml), un worker (self.ArcatureLecteurSysml) ou Node.js (require).
     lire(contenu, nom)                    → lecture : texte d'un .sysml, octets d'un .kpar, ou [{ chemin, texte }] d'un dossier
     lireTexte(texte, nom)  lireKpar(octets, nom)  lireDossier(fichiers, nom)
     analyser(texte, nom)                  → diagnostics d'un seul texte, sans résolution des noms (contrôle rapide)
     reconnait(nom)  binaire(nom)          → extensions reconnues ; fichier à lire en octets (.kpar)
     motCle(type)  famille(type)  citer(nom)  motsReserves  familles  relations  libelleRelation(rel, sens)  regles()
     bibliotheque.paquetages()  bibliotheque.membres(paquetage)  bibliotheque.contient(nom)
   Une lecture expose des éléments en objets simples (sérialisables, désignés par leur identifiant stable) :
     elements()  element(id)  racine  enfants(id)  proprietaire(id)  descendants(id)  parNomQualifie(nom)  parNom(nom)
     diagnostics  erreurs  avertissements
     liaisons(id)  toutesLiaisons()  references(id)  resoudre(reference, depuisId)
     texte(chemin)  extrait(id)  arbre([id])  json()
     vues()  vuesPour(id)  vue(cle)         → vues calculées (sysml/60-vues.js : générale, interconnexion, états, flux d'actions) :
                                              scène en données (formes, liens), dessin SVG (fragment, document autonome), rendu textuel
     document  noeud(id)  brut(id)          → objets internes d'Arcature (document, nœud présenté, élément du lecteur)
   Contrat : docs/api/lecteur-sysml.d.ts ; mode d'emploi : docs/LECTEUR-SYSML.md.
   ═══════════════════════════════════════════════════════════════════════ */

/** Attributs du nœud présenté (syDocument) → propriétés de l'élément exposé (les autres gardent leur nom). */
const LEC_ATTRIBUTS = { name: 'nom', shortName: 'nomCourt', keyword: 'motCle', declaration: 'declaration', qualifiedName: 'nomQualifie', file: 'fichier',
  version: 'version', dependencies: 'dependances', metamodel: 'metamodele', visibility: 'visibilite', multiplicity: 'multiplicite', value: 'valeur',
  direction: 'direction', role: 'role', triggerText: 'declencheur', guard: 'garde', effect: 'effet', expression: 'expression' };

/** Attributs du nœud présenté qui ne sont pas repris tels quels (calculés autrement, ou sans objet pour l'hôte). */
const LEC_ATTRIBUTS_ECARTES = new Set(['id', 'anonymous', 'description', 'library', 'metadata', 'position', 'isConjugated']);

/**
 * Sévérité d'un diagnostic du lecteur, en français.
 * @param {string} s 'error' ou 'warning'
 * @returns {string} 'erreur' ou 'avertissement'
 */
function lecSeverite(s) { return s === 'error' ? 'erreur' : 'avertissement'; }

/**
 * Élément exposé à l'hôte : objet simple et sérialisable construit depuis le nœud présenté par l'adaptateur
 * (mêmes attributs que l'arborescence d'Arcature) et l'élément du lecteur (positions dans le texte, documentation brute).
 * Les références désignent les éléments par leur identifiant.
 * @param {object} n nœud présenté (syDocument : { tag, attrs, enfants, parent, sy })
 * @returns {object} élément
 */
function lecElement(n) {
  const el = n.sy, kind = n.tag;
  const e = { id: '', type: kind, motCle: el.isFileRoot ? '' : (el.keyword || syKindKeyword(kind)), nom: '', nomCourt: '', nomQualifie: '', declaration: '',
    anonyme: !el.name && !el.isFileRoot, racine: !!el.isFileRoot, projet: !!el.isProject, definition: !!el.isDef, usage: /Usage$/.test(kind),
    technique: SY_TECHNIQUES.has(kind), famille: el.isFileRoot ? 'ORG' : syFamille(kind), visibilite: 'public', modificateurs: [], conjugue: !!el.conjugated,
    documentation: el.kind === 'Comment' || el.kind === 'TextualRepresentation' ? (el.body || '') : (el.docs || []).filter(Boolean).join('\n\n'),
    fichier: el.file || '', ligne: el.line || 0, colonne: el.col || 0, ligneFin: el.endLine || 0, debut: el.debut == null ? null : el.debut, fin: el.fin == null ? null : el.fin,
    proprietaire: n.parent ? n.parent.attrs[0].v : null, enfants: n.enfants.map(c => c.attrs[0].v), references: {}, extremites: [], bibliotheque: [], metadonnees: [] };
  for (const a of n.attrs) {
    if (a.n === 'id') { e.id = a.v; continue; }
    if (LEC_ATTRIBUTS_ECARTES.has(a.n)) continue;
    const refs = syEstReference(a.n, a.v);
    if (refs) { e.references[a.n] = refs; continue; }
    if (/^is[A-Z]/.test(a.n)) { e.modificateurs.push(a.n[2].toLowerCase() + a.n.slice(3)); continue; }
    e[LEC_ATTRIBUTS[a.n] || a.n] = a.v;
  }
  if (el.isFileRoot) e.nom = el.name || '';
  // Libellé affichable : le nom ; pour un élément anonyme, le nom calculé par Arcature (extrémités, type, expression), sinon le mot-clé
  e.libelle = e.nom || e.motCle;
  if (e.anonyme) e.nom = '';
  e.extremites = (el.ends || []).map(x => x && x.res && x.res.el && x.res.el._id ? x.res.el._id : null);
  const lib = n.attrs.find(a => a.n === 'library'), meta = n.attrs.find(a => a.n === 'metadata');
  if (lib) e.bibliotheque = lib.v.split(' ');
  if (meta) e.metadonnees = meta.v.split(' ');
  return e;
}

/* ─────────────────────────────── Vues calculées ─────────────────────────────── */

/**
 * Description d'une vue exposée à l'hôte.
 * @param {object} v vue (syvVuesPour)
 * @returns {{cle:string, genre:string, sigle:string, libelleGenre:string, nom:string, element:string, liste:boolean}}
 */
function lecVueInfo(v) {
  const g = SYV_GENRES[v.genre] || {};
  return { cle: v.cle, genre: v.genre, sigle: g.sigle || '', libelleGenre: g.libelle || v.genre, nom: v.nom, element: v.semId, liste: !!v.liste };
}

/**
 * Forme d'une scène en objet simple (les autres formes sont désignées par leur identifiant de vue).
 * @param {object} f forme (syvForme)
 * @returns {object}
 */
function lecForme(f) {
  return { id: f.id, element: f.semId || null, figure: f.figure, entete: f.entete || '', libelle: f.libelle || '', famille: f.famille || '',
    abstrait: !!f.abstrait, ref: !!f.ref, cadre: !!f.cadre, parallele: !!f.parallele, cote: f.cote || '', x: f.x, y: f.y, w: f.w, h: f.h,
    parent: f.parent ? f.parent.id : null, enfants: (f.enfants || []).map(x => x.id), ports: (f.ports || []).map(x => x.id),
    compartiments: (f.compartiments || []).map(k => ({ titre: k.titre, lignes: k.lignes.map(l => ({ texte: l.t, element: l.semId || null })) })) };
}

/**
 * Lien d'une scène en objet simple.
 * @param {object} l lien (syvLien)
 * @returns {object}
 */
function lecLien(l) {
  return { id: l.id, element: l.semId || null, genre: l.genre, source: l.source.id, cible: l.cible.id, points: l.points.map(p => [p[0], p[1]]), libelle: l.libelle || '', titre: l.titre || '' };
}

/**
 * Rendu textuel d'une scène : les formes en arbre (mot-clé, libellé, compartiments, ports), puis les liens
 * (« source → cible [genre] libellé »). Lisible tel quel, comparable d'une lecture à l'autre.
 * @param {object} scene scène (syvVue)
 * @returns {string}
 */
function lecVueTexte(scene) {
  const lignes = [], g = SYV_GENRES[scene.genre] || {};
  lignes.push(scene.nom + (g.sigle ? ' (' + g.sigle + ')' : ''));
  lignes.push(_L('Elements') + ' :');
  const forme = (f, prof) => {
    const marge = '  '.repeat(prof + 1);
    const tete = f.figure === 'port' ? _L('port') : f.entete ? '«' + f.entete + (f.parallele ? '» parallel' : '»') : f.figure;
    lignes.push(marge + tete + (f.libelle ? ' ' + f.libelle : '') + (f.abstrait ? ' (abstract)' : '') + (f.ref ? ' (ref)' : ''));
    for (const k of f.compartiments || []) lignes.push(marge + '  ' + k.titre + ' : ' + k.lignes.map(l => l.t).join(' ; '));
    for (const p of f.ports || []) forme(p, prof + 1);
    for (const e of f.enfants || []) forme(e, prof + 1);
  };
  for (const f of scene.formes) if (!f.parent) forme(f, 0);
  lignes.push(_L('Links') + ' :');
  const nomDe = f => f.libelle || (f.el && f.el.name) || f.figure;
  for (const l of scene.liens) lignes.push('  ' + nomDe(l.source) + ' → ' + nomDe(l.cible) + ' [' + l.genre + ']' + (l.titre || l.libelle ? ' ' + (l.titre || l.libelle) : ''));
  return lignes.join('\n');
}

/**
 * Document SVG autonome d'une vue : espace de noms, boîte englobante, feuille de styles d'Arcature (LEC_SVG_CSS, produite par
 * le build depuis styles.css), fond, puis le dessin. S'affiche seul (fichier .svg, <img>, <object>) comme dans Arcature.
 * @param {{svg:string, vb:number[]}} dessin dessin (syvSvg)
 * @param {{theme?:string, largeur?:number, hauteur?:number}} [o] thème « clair » (défaut) ou « sombre » ; taille (celle de la boîte sinon)
 * @returns {string}
 */
function lecSvgDocument(dessin, o) {
  o = o || {};
  const vb = dessin.vb, theme = o.theme === 'sombre' ? 'sombre' : 'clair';
  const w = o.largeur || vb[2], h = o.hauteur || vb[3];
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${theme}" viewBox="${vb.join(' ')}" width="${w}" height="${h}">` +
    `<style>${LEC_SVG_CSS}</style><rect class="syv-toile" x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}"/>${dessin.svg}</svg>`;
}

/**
 * Vue calculée exposée à l'hôte : description, scène en données, dessin SVG et rendu textuel.
 * @param {object} doc document @param {string} cle clé de la vue (« genre:id »)
 * @returns {object|null} vue, ou null si la clé ne désigne aucune vue
 */
function lecVue(doc, cle) {
  const scene = syvVue(doc, String(cle || ''));
  if (!scene) return null;
  const dessin = syvSvg(scene), g = SYV_GENRES[scene.genre] || {};
  return { cle: scene.cle, genre: scene.genre, sigle: g.sigle || '', libelleGenre: g.libelle || scene.genre, nom: scene.nom, element: scene.semId,
    formes: scene.formes.map(lecForme), liens: scene.liens.map(lecLien), viewBox: dessin.vb.slice(), svg: dessin.svg, texte: lecVueTexte(scene),
    /** @param {{theme?:string, largeur?:number, hauteur?:number}} [o] @returns {string} document SVG autonome */
    svgDocument(o) { return lecSvgDocument(dessin, o); } };
}

/**
 * Lecture d'un modèle : enveloppe du document de l'adaptateur SysML v2 d'Arcature, exposée à l'hôte.
 * @param {object} doc document (FMT_SYSML.lire, syLireDossier)
 * @returns {object} lecture (voir l'en-tête du module)
 */
function lecLecture(doc) {
  let elements = null, parId = null, liaisons = null;
  /** Éléments exposés, calculés une fois, dans l'ordre du texte (racine en tête). */
  const tous = () => {
    if (elements) return elements;
    elements = []; parId = new Map();
    const parcourir = n => { const e = lecElement(n); elements.push(e); parId.set(e.id, e); n.enfants.forEach(parcourir); };
    parcourir(doc.racine);
    return elements;
  };
  const index = () => { tous(); return parId; };
  /** Liaisons métier (syLiaisons), calculées une fois. */
  const lia = () => (liaisons || (liaisons = syLiaisons(doc)));
  const idDe = n => (n ? n.attrs[0].v : null);
  const diagnostics = (doc.diags || []).map(d => ({ severite: lecSeverite(d.severity), code: d.code, regle: syValRegle(d.code), message: d.message,
    fichier: d.file || '', ligne: d.line || 0, colonne: d.column || 0, element: d.el && d.el._id && doc.parId.has(d.el._id) ? d.el._id : null, reference: d.ref || null }));
  const L = {
    /** Nom du fichier, de l'archive ou du dossier lu. */
    nom: doc.nom || '',
    /** Projet d'une archive .kpar ou d'un dossier ({ nom, fichier, version, description, dependances, metamodele }), sinon null. */
    projet: doc.projet ? Object.assign({}, doc.projet) : null,
    /** Fichiers lus : chemin et texte de chacun. */
    fichiers: (doc.fichiers || []).map(f => ({ chemin: f.chemin, texte: f.texte })),
    /** Identifiant de la racine : espace de noms du fichier, ou nœud du projet (archive, dossier). */
    racine: idDe(doc.racine),
    /** Diagnostics de la lecture (analyse, résolution des noms, contrôles structurels, archive). */
    diagnostics,
    /** Nombre d'erreurs. */
    erreurs: diagnostics.filter(d => d.severite === 'erreur').length,
    /** Nombre d'avertissements. */
    avertissements: diagnostics.filter(d => d.severite === 'avertissement').length,
    /** Paquetages de la bibliothèque standard employés par le modèle (ISQ, SI, ScalarValues…). */
    bibliothequeUtilisee: [...(doc.M.libUsed || [])].sort(),
    /** Document interne d'Arcature (adaptateur FMT_SYSML). */
    document: doc,
    /** @returns {object[]} tous les éléments, racine en tête, dans l'ordre du texte */
    elements() { return tous().slice(); },
    /** @param {string} id @returns {object|null} élément par son identifiant */
    element(id) { return index().get(id) || null; },
    /** @param {string} id @returns {object[]} éléments contenus directement */
    enfants(id) { const e = index().get(id); return e ? e.enfants.map(x => parId.get(x)).filter(Boolean) : []; },
    /** @param {string} id @returns {object|null} élément propriétaire */
    proprietaire(id) { const e = index().get(id); return e && e.proprietaire ? parId.get(e.proprietaire) || null : null; },
    /** @param {string} id @returns {object[]} descendants, en profondeur, dans l'ordre du texte */
    descendants(id) { const out = []; const rec = x => { for (const c of L.enfants(x)) { out.push(c); rec(c.id); } }; if (index().has(id)) rec(id); return out; },
    /** @param {string} nom nom qualifié (« Paquetage::Partie::membre ») @returns {object|null} */
    parNomQualifie(nom) { nom = String(nom || ''); return tous().find(e => e.nomQualifie === nom) || null; },
    /** @param {string} nom nom (ou nom court) @returns {object[]} éléments qui le portent */
    parNom(nom) { nom = String(nom || ''); return tous().filter(e => !e.racine && !e.anonyme && (e.nom === nom || e.nomCourt === nom)); },
    /**
     * Liaisons métier d'un élément, vues de son côté (typage, spécialisation, composition, connexion, flux, allocation,
     * succession, transition, perform, exhibit, satisfy, verify, sujet, acteur, inclusion, dépendance, import, métadonnée).
     * @param {string} id @returns {Array<{relation:string, libelle:string, sens:string, autre:string, via:(string|null)}>}
     */
    liaisons(id) {
      const n = doc.parId.get(id); if (!n) return [];
      return (lia().metier.get(n) || []).map(l => ({ relation: l.rel, libelle: syLibelleRelation(l.rel, l.sens), sens: l.sens, autre: idDe(l.autre), via: idDe(l.via) }));
    },
    /** @returns {Array<{relation:string, source:string, cible:string, via:(string|null)}>} toutes les liaisons, chacune une fois */
    toutesLiaisons() {
      const out = [];
      for (const [n, l] of lia().metier) for (const x of l) if (x.sens === 'sortant') out.push({ relation: x.rel, source: idDe(n), cible: idDe(x.autre), via: idDe(x.via) });
      return out;
    },
    /** @param {string} id @returns {{sortantes:Array<{attribut:string, cible:(string|null)}>, entrantes:Array<{attribut:string, source:string}>}} références brutes */
    references(id) {
      const n = doc.parId.get(id); if (!n) return { sortantes: [], entrantes: [] };
      return { sortantes: (lia().sortantes.get(n) || []).map(r => ({ attribut: r.attr, cible: idDe(r.cible) })), entrantes: (lia().entrantes.get(n) || []).map(r => ({ attribut: r.attr, source: idDe(r.source) })) };
    },
    /**
     * Résout une référence écrite (« Moteur », « ISQ::mass », « moteurs.arbre ») depuis un élément, comme le lecteur.
     * @param {string} reference référence écrite @param {string} [depuis] identifiant de l'élément de départ (racine sinon)
     * @returns {{id:string}|{bibliotheque:string}|{pseudo:string}|null}
     */
    resoudre(reference, depuis) {
      const n = doc.parId.get(depuis || L.racine), ctx = n ? n.sy : doc.racine.sy;
      const r = syResolve(doc.M, reference, ctx.isProject ? doc.M.files[0].root : ctx, null, 'rel');
      if (!r) return null;
      if (r.el) return r.el._id && doc.parId.has(r.el._id) ? { id: r.el._id } : null;
      if (r.lib) return { bibliotheque: r.lib.replace(/^\*::/, '') };
      return r.pseudo ? { pseudo: r.pseudo } : null;
    },
    /** @param {string} [chemin] chemin d'un fichier lu (le premier sinon) @returns {string} son texte */
    texte(chemin) { const f = chemin ? L.fichiers.find(x => x.chemin === chemin) : L.fichiers[0]; return f ? f.texte : ''; },
    /** @param {string} id @returns {string} texte de la déclaration de l'élément dans son fichier (corps compris) */
    extrait(id) { const e = index().get(id); if (!e || e.debut == null) return ''; return L.texte(e.fichier).slice(e.debut, e.fin); },
    /**
     * Arbre des éléments (objets simples imbriqués).
     * @param {string} [id] racine de l'arbre (la racine de la lecture sinon) @returns {{element:object, enfants:object[]}|null}
     */
    arbre(id) { const e = index().get(id || L.racine); if (!e) return null; const rec = x => ({ element: x, enfants: L.enfants(x.id).map(rec) }); return rec(e); },
    /** @returns {object} tout ce qui se sérialise en JSON : nom, projet, chemins des fichiers, racine, éléments, diagnostics, liaisons */
    json() { return { nom: L.nom, projet: L.projet, fichiers: L.fichiers.map(f => f.chemin), racine: L.racine, elements: L.elements(), diagnostics: L.diagnostics.slice(), liaisons: L.toutesLiaisons() }; },
    /** @returns {object[]} vues calculées du modèle (celles de la liste des diagrammes d'Arcature : chaque élément qui porte lui-même ce que la vue montre) */
    vues() { return syvToutesVues(doc).map(lecVueInfo); },
    /** @param {string} id @returns {object[]} vues proposées sur un élément (celles de sa définition pour un usage typé) */
    vuesPour(id) { const n = doc.parId.get(id); return n ? syvVuesPour(doc, n).map(lecVueInfo) : []; },
    /** @param {string} cle clé d'une vue (vues, vuesPour) @returns {object|null} vue : formes, liens, viewBox, svg, texte, svgDocument(o) */
    vue(cle) { return lecVue(doc, cle); },
    /** @param {string} id @returns {object|null} nœud présenté par l'adaptateur ({ tag, attrs, enfants, parent, sy }) */
    noeud(id) { return doc.parId.get(id) || null; },
    /** @param {string} id @returns {object|null} élément du lecteur (syParse : kind, name, refs, res, ends, members…) */
    brut(id) { const n = doc.parId.get(id); return n ? n.sy : null; }
  };
  return L;
}

/**
 * Octets d'un contenu binaire fourni par l'hôte (Uint8Array, ArrayBuffer, Buffer de Node).
 * @param {*} contenu contenu
 * @returns {Uint8Array}
 */
function lecOctets(contenu) {
  if (contenu instanceof Uint8Array) return contenu;
  if (contenu instanceof ArrayBuffer) return new Uint8Array(contenu);
  if (contenu && contenu.buffer instanceof ArrayBuffer) return new Uint8Array(contenu.buffer, contenu.byteOffset || 0, contenu.byteLength);
  throw new Error(_L('Binary content expected (Uint8Array or ArrayBuffer).'));
}

/** Lecteur SysML v2 autonome exposé à l'hôte. */
const ArcatureLecteurSysml = {
  /** Version d'Arcature dont le lecteur est tiré. */
  version: ARC_VERSION,
  /**
   * Lit un modèle : le texte d'un .sysml, les octets d'une archive .kpar, ou les fichiers d'un dossier de projet
   * ([{ chemin, texte }], lus ensemble : les noms se résolvent d'un fichier à l'autre).
   * @param {string|Uint8Array|ArrayBuffer|Array<{chemin:string, texte:string}>} contenu contenu
   * @param {string} [nom] nom du fichier, de l'archive ou du dossier
   * @returns {object} lecture
   */
  lire(contenu, nom) {
    if (Array.isArray(contenu)) return ArcatureLecteurSysml.lireDossier(contenu, nom);
    if (typeof contenu === 'string') return ArcatureLecteurSysml.lireTexte(contenu, nom);
    return ArcatureLecteurSysml.lireKpar(contenu, nom);
  },
  /** @param {string} texte texte d'un .sysml @param {string} [nom] nom du fichier @returns {object} lecture */
  lireTexte(texte, nom) { return lecLecture(FMT_SYSML.lire(String(texte == null ? '' : texte), nom || 'modele.sysml')); },
  /** @param {Uint8Array|ArrayBuffer} octets contenu d'une archive .kpar @param {string} [nom] nom de l'archive @returns {object} lecture */
  lireKpar(octets, nom) { return lecLecture(FMT_SYSML.lire(lecOctets(octets), nom || 'projet.kpar')); },
  /** @param {Array<{chemin:string, texte:string}>} fichiers textes du dossier @param {string} [nom] nom du dossier @returns {object} lecture */
  lireDossier(fichiers, nom) {
    const liste = (fichiers || []).map(f => ({ chemin: String(f.chemin || f.path || f.nom || ''), texte: String(f.texte == null ? (f.text == null ? '' : f.text) : f.texte) }));
    const doc = syLireDossier(liste, nom || _L('SysML v2 project'));
    doc.nom = nom || doc.nom;
    return lecLecture(doc);
  },
  /**
   * Analyse un seul texte sans résoudre les noms : diagnostics lexicaux et syntaxiques, nombre d'éléments (contrôle rapide).
   * @param {string} texte texte d'un .sysml @param {string} [nom] nom du fichier
   * @returns {{diagnostics:object[], erreurs:number, elements:number}}
   */
  analyser(texte, nom) {
    const r = syParse(String(texte == null ? '' : texte), nom || 'modele.sysml');
    const diagnostics = r.diags.map(d => ({ severite: lecSeverite(d.severity), code: d.code, regle: syValRegle(d.code), message: d.message, fichier: d.file || '', ligne: d.line || 0, colonne: d.column || 0 }));
    return { diagnostics, erreurs: diagnostics.filter(d => d.severite === 'erreur').length, elements: r.all.length };
  },
  /** @param {string} nom nom de fichier @returns {boolean} vrai pour un .sysml ou un .kpar */
  reconnait(nom) { return FMT_SYSML.reconnait(nom); },
  /** @param {string} nom nom de fichier @returns {boolean} vrai si le fichier se lit en octets (archive .kpar) */
  binaire(nom) { return FMT_SYSML.binaire(nom); },
  /** @param {string} type métaclasse (« PartDefinition ») @returns {string} mot-clé SysML (« part def ») */
  motCle(type) { return syKindKeyword(type); },
  /** @param {string} type métaclasse @returns {string} famille : STR, BEH, REQ ou ORG */
  famille(type) { return syFamille(type); },
  /** Familles d'éléments et leur libellé. */
  familles: Object.assign({}, SY_FAMILLES),
  /** Genres de vues calculées : sigle, famille, libellé. */
  genresVues: Object.fromEntries(Object.entries(SYV_GENRES).map(([k, g]) => [k, { sigle: g.sigle, famille: g.famille, libelle: g.libelle }])),
  /** Feuille de styles des dessins SVG (classes syv-…, thèmes « clair » et « sombre » sur l'élément svg), reprise d'Arcature. */
  svgCss: LEC_SVG_CSS,
  /** Mots réservés de SysML v2. */
  motsReserves: [...SY_KEYWORDS].sort(),
  /** Relations des liaisons, dans l'ordre d'affichage d'Arcature. */
  relations: SY_RELATIONS.slice(),
  /** @param {string} relation relation @param {string} sens 'sortant' ou 'entrant' @returns {string} libellé */
  libelleRelation(relation, sens) { return syLibelleRelation(relation, sens); },
  /** @returns {Array<{id:string, categorie:string, severite:string, nom:string}>} règles des diagnostics (code → intitulé) */
  regles() { return SY_VAL_REGLES.map(r => ({ id: r.id, categorie: r.categorie, severite: r.severite, nom: r.nom() })); },
  /** @param {string} nom nom d'élément @returns {string} nom écrit comme dans un texte SysML (entre apostrophes au besoin) */
  citer(nom) { return syQuote(nom); },
  /** Index de la bibliothèque standard SysML v2 (noms des paquetages et de leurs membres). */
  bibliotheque: {
    /** @returns {string[]} paquetages de la bibliothèque standard */
    paquetages() { return Object.keys(SY_LIB).sort(); },
    /** @param {string} paquetage nom du paquetage @returns {string[]} ses membres (imports publics compris), ou [] */
    membres(paquetage) { const m = syLibMembers(String(paquetage || '')); return m ? [...m].sort() : []; },
    /** @param {string} nom nom qualifié (« ISQ::mass ») ou nom de paquetage @returns {boolean} */
    contient(nom) { const s = sySegmentsRef(String(nom || '')); if (!s.length) return false; if (s.length === 1) return syLibHas(s[0].n); const m = syLibMembers(s[0].n); return !!m && m.has(s[1].n); }
  }
};

return ArcatureLecteurSysml;
});
