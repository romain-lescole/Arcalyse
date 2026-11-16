/* ═══════════════════════════════════════════════════════════════════════════
   🎚 Variantes — graphes en blocs (onglets de 103-variantes.js)
   - 🧱 Blocs 150 % : les composants d'une couche, imbriqués comme dans le modèle, avec leurs fonctions allouées, les
     échanges fonctionnels et les échanges de composants. Trait plein : élément commun à toutes les variantes ; tirets :
     élément variable (couleur de son premier critère, pastilles des critères) ; hachures : retenu par aucune variante.
     Une variante choisie estompe ce qui n'en fait pas partie ; une fonction présente sans aucun de ses composants
     est cerclée de rouge.
   - 🔀 Critères → variantes : arbre des critères (groupés par paquet / groupe), nombre d'éléments marqués, liens vers les
     variantes qui les retiennent, variantes composées reliées à celles qu'elles combinent, anomalies signalées.
   Dessins SVG autonomes (couleurs écrites selon le thème, pour l'export SVG / PNG) ; zoom et export par capVoisinageWire (105).
   ═══════════════════════════════════════════════════════════════════════════ */

/** Couleurs catégorielles des critères, dans un ordre fixe (clair, sombre) ; au-delà de huit critères : gris. */
var CAP_VAR_PAL = {
  l: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  d: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767']
};
/** Nombre de fonctions montrées par bloc au plus (au-delà : « + n fonctions »). */
var CAP_VAR_FN_MAX = 8;
/** Nombre d'échanges dessinés au plus (au-delà : non dessinés, nombre signalé). */
var CAP_VAR_LIENS_MAX = 400;
/** Nombre de critères dessinés au plus dans 🔀 Critères → variantes. */
var CAP_VAR_CRIT_MAX = 80;

/**
 * Couleurs du dessin selon le thème : texte, fonds des composants et des fonctions, palette des critères.
 * @returns {object} couleurs
 */
function capVarGrCouleurs() {
  const c = capIsLight();
  return { clair: c, texte: c ? '#1f2937' : '#e6edf3', dim: c ? '#57606a' : '#8b949e', fond: c ? '#ffffff' : '#0d1117',
    cadre: c ? '#f3f8fd' : '#111a24', comp: c ? '#dcebfa' : '#1c2e45', compTrait: c ? '#5b7fa6' : '#6d8fb5',
    fn: c ? '#d8f5d4' : '#173a1c', fnTrait: c ? '#3f8f3a' : '#4fae4a', fnTexte: c ? '#14532d' : '#cfeecb',
    hach1: c ? '#f2f2f2' : '#20252c', hach2: c ? '#c4c7cc' : '#3b424c', lien: c ? '#4b5563' : '#9aa4b0',
    variable: c ? '#d97706' : '#e3a33a', alerte: c ? '#e34948' : '#f47067', alerteTexte: c ? '#9b1c1c' : '#ffb1aa',
    alerteFond: c ? '#fde2e1' : '#3d1d1d', pal: CAP_VAR_PAL[c ? 'l' : 'd'] };
}

/**
 * Couleur d'un critère : sa place dans la liste des critères (ordre fixe), gris au-delà de la palette.
 * @param {object} R - capVarCompute()
 * @param {string} nom - Nom du critère
 * @param {object} C - Couleurs (capVarGrCouleurs)
 * @returns {string} couleur
 */
function capVarGrCouleurCrit(R, nom, C) {
  const k = String(nom).toLowerCase(), i = R.crit.findIndex(c => [c.nom, c.alias, c.id].filter(Boolean).some(x => String(x).toLowerCase() === k));
  return i >= 0 && i < C.pal.length ? C.pal[i] : '#8b8f96';
}

/**
 * Critères cités par la propre marque d'un élément (restrictions simples, puis critères cités par les expressions).
 * @param {?object} m - Marque {r, txt}
 * @returns {string[]} noms
 */
function capVarGrCrits(m) {
  if (!m) return [];
  const s = new Set();
  m.r.forEach(x => { if (x.c != null) s.add(String(x.c)); else if (x.e && x.e.ids) x.e.ids.forEach(y => s.add(String(y))); });
  return [...s];
}

/**
 * Pastilles de critères (texte blanc sur la couleur du critère).
 * @param {object} R - capVarCompute()
 * @param {object} C - Couleurs
 * @param {number} x - Abscisse
 * @param {number} y - Ordonnée du haut
 * @param {string[]} cs - Critères
 * @param {number} [wmax] - Largeur disponible (pastilles en trop : « +n »)
 * @returns {{svg:string, w:number}} dessin et largeur occupée
 */
function capVarGrPastilles(R, C, x, y, cs, wmax) {
  let s = '', xx = x; const lim = wmax || 1e9;
  for (let i = 0; i < cs.length; i++) {
    const t = capVsnCoupe(cs[i], 16), w = Math.round(6.4 * t.length + 12);
    if (xx + w - x > lim) { s += `<text x="${xx}" y="${y + 11}" font-size="10" fill="${C.dim}">+${cs.length - i}</text>`; xx += 20; break; }
    s += `<rect x="${xx}" y="${y}" width="${w}" height="15" rx="7.5" fill="${capVarGrCouleurCrit(R, cs[i], C)}"/>` +
      `<text x="${xx + w / 2}" y="${y + 11}" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="600">${capEsc(t)}</text>`;
    xx += w + 4;
  }
  return { svg: s, w: xx - x };
}

/**
 * Présence d'un élément dans les variantes : nombre de variantes qui le retiennent, commun, retenu par aucune.
 * @param {object} R - capVarCompute()
 * @param {number} i - Index de l'élément
 * @returns {{n:number, commun:boolean, aucune:boolean}}
 */
function capVarGrPresence(R, i) {
  let n = 0; for (const v of R.vars) if (v.a[i]) n++;
  return { n, commun: R.vars.length > 0 && n === R.vars.length, aucune: n === 0 };
}

/**
 * Couches qui ont des composants nommés (ordre ARCADIA).
 * @param {object} R - capVarCompute()
 * @returns {string[]} couches
 */
function capVarGrCouches(R) {
  const s = new Set();
  R.nodes.forEach((n, i) => { if (R.elig[i]) { const c = capTraceCatOf(capTName(n)); if (c && c.k === 'comp') s.add(R.layer[i]); } });
  return CAP_ANA_LAYERS.filter(L => s.has(L));
}

/**
 * Dessin 🧱 Blocs 150 % d'une couche : composants imbriqués, fonctions allouées, échanges ; variante choisie mise en avant.
 * @param {object} R - capVarCompute()
 * @param {string} L - Couche (OA, SA, LA, PA, EPBS)
 * @param {?object} v - Variante choisie (null ou R.tout : le 150 %)
 * @param {{echanges:boolean}} o - Options
 * @returns {{svg:string, w:number, h:number, nb:object}} SVG autonome, taille, décomptes
 */
function capVarArchiSvg(R, L, v, o) {
  const C = capVarGrCouleurs(), esc = capEsc, B = capVarBase(R), I = id => capVarI(R, id), vi = v && !v.tout ? v : null;
  const cat = i => capTraceCatOf(capTName(R.nodes[i]));
  const estComp = i => { const c = cat(i); return !!c && c.k === 'comp'; }, estFn = i => { const c = cat(i); return !!c && c.k === 'fn'; };
  const comps = [], dans = new Set();
  R.nodes.forEach((n, i) => { if (R.elig[i] && R.layer[i] === L && estComp(i)) { comps.push(i); dans.add(i); } });
  const pere = i => { for (let j = R.par[i]; j >= 0; j = R.par[j]) if (dans.has(j)) return j; return -1; };
  const enfants = new Map(); comps.forEach(i => { const p = pere(i); if (!enfants.has(p)) enfants.set(p, []); enfants.get(p).push(i); });
  const pres = i => !vi || !!vi.a[i];
  // Fonctions allouées (feuilles de la couche), par composant
  const fnsDe = new Map();
  comps.forEach(i => { const l = (B.compFns[capXId(R.nodes[i])] || []).map(I).filter(j => j >= 0 && R.elig[j] && estFn(j) && R.layer[j] === L);
    fnsDe.set(i, [...new Set(l)].sort((a, b) => capXName(R.nodes[a]).localeCompare(capXName(R.nodes[b])))); });
  const compsDeFn = new Map(); fnsDe.forEach((l, c) => l.forEach(f => { if (!compsDeFn.has(f)) compsDeFn.set(f, []); compsDeFn.get(f).push(c); }));
  // Tailles (de bas en haut), puis positions
  const WF = 270, HF = 26, PAS = 32, PAD = 14, G = 18, HT = 46;
  const taille = new Map();
  const mesure = i => {
    const ks = enfants.get(i) || [], fs = fnsDe.get(i) || [], nf = Math.min(fs.length, CAP_VAR_FN_MAX) + (fs.length > CAP_VAR_FN_MAX ? 1 : 0);
    ks.forEach(mesure);
    const hf = nf ? nf * PAS + 4 : 0;
    let w = WF + 2 * PAD, h = HT + hf + (ks.length ? 0 : 8);
    if (ks.length) {
      const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(ks.length)))), lignes = [];
      ks.forEach((k, n) => { (lignes[Math.floor(n / cols)] = lignes[Math.floor(n / cols)] || []).push(k); });
      let lw = 0, lh = 0;
      lignes.forEach(l => { lw = Math.max(lw, l.reduce((s, k) => s + taille.get(k).w, 0) + G * (l.length - 1)); lh += Math.max(...l.map(k => taille.get(k).h)) + G; });
      w = Math.max(w, lw + 2 * PAD); h += lh; taille.set(i, { w, h, lignes, hf });
    } else taille.set(i, { w, h, lignes: [], hf });
  };
  const racines = enfants.get(-1) || [];
  racines.forEach(mesure);
  const pos = new Map(), posFn = new Map();
  const placer = (i, x, y) => {
    const t = taille.get(i); pos.set(i, { x, y, w: t.w, h: t.h });
    let yy = y + HT + t.hf;
    t.lignes.forEach(l => { let xx = x + PAD; const lh = Math.max(...l.map(k => taille.get(k).h)); l.forEach(k => { placer(k, xx, yy); xx += taille.get(k).w + G; }); yy += lh + G; });
  };
  // Composants de premier niveau en rangées
  const LMAX = 1500; let x = 24, y = 56, lh = 0, W = 0;
  racines.forEach(i => { const t = taille.get(i); if (x > 24 && x + t.w > LMAX) { x = 24; y += lh + G; lh = 0; } placer(i, x, y); x += t.w + G; lh = Math.max(lh, t.h); W = Math.max(W, x); });
  const H = Math.max(y + lh + 24, 120); W = Math.max(W + 6, 520);
  // Dessin des blocs
  const nb = { comps: comps.length, fns: 0, perdues: 0, liens: 0, liensMax: false };
  let blocs = '', fonctions = '';
  const titre = (i, p) => { const pr = capVarGrPresence(R, i), m = R.own[i], cs = capVarGrCrits(m), mk = capVarMarqueDe(R, i);
    return `${capXName(R.nodes[i])} — ${capAnaHuman(capTName(R.nodes[i]))}\n` + (pr.commun ? _L('Commun à toutes les variantes') : pr.aucune ? _L('Retenu par aucune variante') : _L(`Présent dans ${pr.n} variante(s) sur ${R.vars.length}`)) +
      (m ? '\n' + _L(`Critères : ${m.txt}`) : mk ? '\n' + _L(`Marque héritée de ${capXName(R.nodes[mk.de])} : ${mk.m.txt}`) : '') + (cs.length ? '' : '') +
      (vi && !vi.a[i] ? '\n' + _L(`Absent de « ${vi.nom} » : ${capVarPourquoi(R, vi, i)}`) : '') + (p ? '\n' + p : ''); };
  const dessinerComp = i => {
    const p = pos.get(i), pr = capVarGrPresence(R, i), cs = capVarGrCrits(R.own[i]), varie = !pr.commun && !pr.aucune;
    const trait = pr.aucune ? C.hach2 : varie ? (cs.length ? capVarGrCouleurCrit(R, cs[0], C) : C.variable) : C.compTrait;
    const op = pres(i) ? 1 : 0.18;
    blocs += `<g opacity="${op}" data-det="${esc(capXId(R.nodes[i]))}" style="cursor:pointer"><title>${esc(titre(i))}</title>` +
      `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="${pr.aucune ? 'url(#vgr-hach)' : C.comp}" stroke="${trait}" stroke-width="${varie ? 2 : 1.2}"${varie || pr.aucune ? ' stroke-dasharray="6 3"' : ''}/>` +
      `<text x="${p.x + 10}" y="${p.y + 18}" font-size="12.5" font-weight="600" fill="${C.texte}">▣ ${esc(capVsnCoupe(capXName(R.nodes[i]), Math.floor((p.w - 30) / 7)))}</text>` +
      (cs.length ? capVarGrPastilles(R, C, p.x + 10, p.y + 25, cs, p.w - 20).svg
        : `<text x="${p.x + 10}" y="${p.y + 36}" font-size="10.5" fill="${C.dim}">${pr.commun ? _L('commun à toutes les variantes') : pr.aucune ? _L('retenu par aucune variante') : _L(`${pr.n} / ${R.vars.length} variantes (marque héritée)`)}</text>`) + `</g>`;
    const fs = fnsDe.get(i) || [], t = taille.get(i), y0 = p.y + HT;
    fs.slice(0, CAP_VAR_FN_MAX).forEach((f, k) => {
      const fy = y0 + k * PAS, fx = p.x + PAD, fp = capVarGrPresence(R, f), fc = capVarGrCrits(R.own[f]), fv = !fp.commun && !fp.aucune;
      const cdf = compsDeFn.get(f) || [];
      // Fonction présente sans aucun de ses composants : dans la variante choisie, ou commune mais allouée à des composants tous variables
      const perdue = vi ? (vi.a[f] && !cdf.some(c => vi.a[c])) : (fp.commun && cdf.length && cdf.every(c => !capVarGrPresence(R, c).commun));
      if (!posFn.has(f)) posFn.set(f, { x: fx, y: fy, w: t.w - 2 * PAD, h: HF, on: pres(f) && (pres(i) || perdue) });
      nb.fns++; if (perdue) nb.perdues++;
      const fop = pres(f) && (pres(i) || perdue) ? 1 : 0.18;
      const pc = fc.join() !== cs.join() ? capVarGrPastilles(R, C, 0, 0, fc, 120) : null;
      const pt = pc ? capVarGrPastilles(R, C, fx + t.w - 2 * PAD - pc.w - 6, fy + 5, fc, 120).svg : '';
      fonctions += `<g opacity="${fop}" data-det="${esc(capXId(R.nodes[f]))}" style="cursor:pointer"><title>${esc(titre(f, perdue ? (vi ? _L('⚠ présente dans la variante sans aucun de ses composants') : _L('⚠ commune, mais allouée seulement à des composants variables')) : ''))}</title>` +
        `<rect x="${fx}" y="${fy}" width="${t.w - 2 * PAD}" height="${HF}" rx="13" fill="${fp.aucune ? 'url(#vgr-hach)' : C.fn}" stroke="${perdue ? C.alerte : fv ? (fc.length ? capVarGrCouleurCrit(R, fc[0], C) : C.variable) : C.fnTrait}" stroke-width="${perdue ? 2.2 : fv ? 1.8 : 1}"${fv && !perdue ? ' stroke-dasharray="5 3"' : ''}/>` +
        `<text x="${fx + 12}" y="${fy + 17}" font-size="11.5" fill="${C.fnTexte}">ƒ ${esc(capVsnCoupe(capXName(R.nodes[f]), Math.floor((t.w - 2 * PAD - 24 - (pc ? pc.w : 0) - (perdue ? 16 : 0)) / 6.3)))}</text>` + pt +
        (perdue ? `<text x="${fx + t.w - 2 * PAD - 8}" y="${fy + 17}" font-size="12" font-weight="700" fill="${C.alerteTexte}" text-anchor="end">⚠</text>` : '') + `</g>`;
    });
    if (fs.length > CAP_VAR_FN_MAX) fonctions += `<text x="${p.x + PAD + 12}" y="${y0 + CAP_VAR_FN_MAX * PAS + 16}" font-size="11" fill="${C.dim}">${_L(`+ ${fs.length - CAP_VAR_FN_MAX} autre(s) fonction(s)`)}</text>`;
  };
  const ordre = i => { dessinerComp(i); (enfants.get(i) || []).forEach(ordre); };
  racines.forEach(ordre);
  // Échanges : fonctionnels entre fonctions dessinées, de composants entre blocs
  let liens = ''; const etiq = [];
  /** Ordonnée libre pour une étiquette d'échange (décalée tant qu'elle en chevauche une autre). */
  const libre = (x, y, w) => { let yy = y; for (let n = 0; n < 12 && etiq.some(e => Math.abs(e.x - x) < (e.w + w) / 2 && Math.abs(e.y - yy) < 13); n++) yy -= 13; etiq.push({ x, y: yy, w }); return yy; };
  if (o.echanges) {
    const { rid } = capAnaCtx(), portDe = r => { const e = cap_xmlDoc.querySelector(`[id="${CSS.escape(rid(r))}"]`); return e && e.parentElement ? I(capXId(e.parentElement)) : -1; };
    const traits = [];
    R.nodes.forEach((n, i) => {
      if (R.layer[i] !== L) return; const t = capTName(n);
      if (t !== 'FunctionalExchange' && t !== 'ComponentExchange') return;
      const s = portDe(n.getAttribute('source')), c = portDe(n.getAttribute('target'));
      const a = t === 'FunctionalExchange' ? posFn.get(s) : pos.get(s), b = t === 'FunctionalExchange' ? posFn.get(c) : pos.get(c);
      if (!a || !b || a === b) return; traits.push({ i, a, b, ce: t === 'ComponentExchange' });
    });
    if (traits.length > CAP_VAR_LIENS_MAX) { nb.liensMax = traits.length; traits.length = CAP_VAR_LIENS_MAX; }
    traits.forEach(({ i, a, b, ce }) => {
      const pr = capVarGrPresence(R, i), on = pres(i) && (a.on !== false) && (b.on !== false), varie = !pr.commun;
      const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
      let x1, y1, x2, y2, d, cote = false;
      if (Math.abs(a.x - b.x) < 2 && Math.abs(a.w - b.w) < 2) {   // même colonne (même bloc) : contourné par la droite
        x1 = a.x + a.w; x2 = b.x + b.w; y1 = ay; y2 = by; const dx = 26 + Math.min(60, Math.abs(by - ay) / 4); d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 + dx},${y2} ${x2},${y2}`; x1 = x2 = a.x + a.w + dx * 0.75 + 4; cote = true; }
      else if (Math.abs(bx - ax) > (a.w + b.w) / 2) { x1 = bx > ax ? a.x + a.w : a.x; x2 = bx > ax ? b.x : b.x + b.w; y1 = ay; y2 = by; const dx = Math.max(30, Math.abs(x2 - x1) / 2) * (bx > ax ? 1 : -1); d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`; }
      else { x1 = ax; x2 = bx; y1 = by > ay ? a.y + a.h : a.y; y2 = by > ay ? b.y : b.y + b.h; const dy = Math.max(30, Math.abs(y2 - y1) / 2) * (by > ay ? 1 : -1); d = `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`; }
      const coul = varie ? C.variable : C.lien, lib = capVsnCoupe(capXName(R.nodes[i]), 28), lw = lib.length * 6 + 6, lx = cote ? x1 + lw / 2 : (x1 + x2) / 2, ly = libre(lx, (y1 + y2) / 2 - 5, lw);
      liens += `<g opacity="${on ? 1 : 0.15}" data-det="${esc(capXId(R.nodes[i]))}" style="cursor:pointer"><title>${esc(titre(i))}</title><path d="${d}" fill="none" stroke="transparent" stroke-width="9"/>` +
        `<path d="${d}" fill="none" stroke="${coul}" stroke-width="${ce ? 2.2 : 1.5}"${varie ? ' stroke-dasharray="5 3"' : ''} marker-end="url(#vgr-fl${varie ? 'v' : ''})"/>` +
        `<text x="${lx}" y="${ly}" font-size="10.5" fill="${C.texte}" text-anchor="middle" paint-order="stroke" stroke="${C.fond}" stroke-width="3">${esc(lib)}</text></g>`;
      nb.liens++;
    });
  }
  const defs = `<defs><pattern id="vgr-hach" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${C.hach1}"/><line x1="0" y1="0" x2="0" y2="7" stroke="${C.hach2}" stroke-width="3"/></pattern>` +
    `<marker id="vgr-fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${C.lien}"/></marker>` +
    `<marker id="vgr-flv" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${C.variable}"/></marker></defs>`;
  const entete = `<text x="16" y="28" font-size="13.5" font-weight="700" fill="${C.texte}">${esc(vi ? _L(`Variante « ${vi.nom} »`) : _L('150 % — tout le modèle'))}</text>` +
    `<text x="16" y="44" font-size="11" fill="${C.dim}">${esc(vi ? (vi.def || '') : _L(`${R.vars.length} variante(s) confondues`))} · ${esc(L)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, system-ui, sans-serif">${defs}` +
    `<rect width="${W}" height="${H}" fill="${C.fond}"/>${entete}` + (comps.length ? blocs + fonctions + liens
      : `<text x="16" y="80" font-size="12" fill="${C.dim}">${esc(_L('Aucun composant nommé dans cette couche.'))}</text>`) + `</svg>`;
  return { svg, w: W, h: H, nb };
}

/**
 * Dessin 🔀 Critères → variantes : arbre des critères (groupés par paquet), liens vers les variantes qui les retiennent,
 * variantes composées reliées à leurs membres, anomalies.
 * @param {object} R - capVarCompute()
 * @returns {{svg:string, w:number, h:number, anomalies:number}} SVG autonome
 */
function capVarCriteresSvg(R) {
  const C = capVarGrCouleurs(), esc = capEsc, kc = c => [c.nom, c.alias, c.id].filter(Boolean).map(x => String(x).toLowerCase());
  const crits = R.crit.slice(0, CAP_VAR_CRIT_MAX), V = R.vars;
  const nMarq = c => { const k = new Set(kc(c)); let n = 0; R.own.forEach((m, i) => { if (m && R.elig[i] && m.r.some(x => x.c != null ? k.has(String(x.c).toLowerCase()) : x.e.ids.some(y => k.has(String(y).toLowerCase())))) n++; }); return n; };
  const retient = (v, c) => !!v.S && kc(c).some(x => v.S.has(x));
  const groupes = new Map(); crits.forEach(c => { const g = c.pkg || ''; if (!groupes.has(g)) groupes.set(g, []); groupes.get(g).push(c); });
  const avecGroupes = [...groupes.keys()].some(Boolean);
  const XR = 24, WR = 170, XG = 250, WG = 180, XC = avecGroupes ? 490 : 260, WC = 190, HC = 46, PC = 60, XV = XC + WC + 300, WV = 240, HV = 64;
  let s = '', y = 30; const pc = new Map(), pg = new Map(); let anomalies = 0;
  [...groupes.entries()].sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1) || a[0].localeCompare(b[0])).forEach(([g, l]) => {
    const y0 = y; l.forEach(c => { pc.set(c, y); y += PC; });
    if (g) pg.set(g, (y0 + y - PC) / 2); y += g ? 16 : 6;
  });
  const hCrit = y, hVar = 30 + V.length * (HV + 30);
  const H = Math.max(hCrit, hVar, 200) + 40, yR = (Math.min(hCrit, H - 40) - HC) / 2;
  const courbe = (x1, y1, x2, y2) => `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
  const bloc = (x, y, w, h, t, sous, trait, fond, dash, det, tip) => `<g${det ? ` data-det="${esc(det)}" style="cursor:pointer"` : ''}>${tip ? `<title>${esc(tip)}</title>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fond || C.fond}" stroke="${trait}" stroke-width="1.8"${dash ? ' stroke-dasharray="6 3"' : ''}/>` +
    `<text x="${x + w / 2}" y="${y + (sous ? 19 : h / 2 + 5)}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.texte}">${esc(capVsnCoupe(t, Math.floor(w / 7.5)))}</text>` +
    (sous ? `<text x="${x + w / 2}" y="${y + 36}" text-anchor="middle" font-size="11" fill="${C.dim}">${esc(sous)}</text>` : '') + `</g>`;
  // Racine et groupes
  s += bloc(XR, yR, WR, HC, _L('150 %'), _L(`${R.tout.n} éléments nommés`), C.texte, C.cadre);
  pg.forEach((gy, g) => { s += `<path d="${courbe(XR + WR, yR + HC / 2, XG, gy + HC / 2)}" fill="none" stroke="${C.lien}" stroke-width="1.4"/>` + bloc(XG, gy, WG, HC, g, _L('groupe de critères'), C.texte, C.cadre); });
  // Variantes (positions) et liens critère → variante
  const pv = new Map(); V.forEach((v, k) => pv.set(v.id, 30 + k * (HV + 30)));
  let liens = '';
  crits.forEach(c => { const cy = pc.get(c), col = capVarGrCouleurCrit(R, c.nom, C);
    V.forEach(v => { if (!v.comp && retient(v, c)) liens += `<path d="${courbe(XC + WC, cy + HC / 2, XV, pv.get(v.id) + HV / 2)}" fill="none" stroke="${col}" stroke-width="2.4" opacity=".9" marker-end="url(#vgr-flg)"/>`; }); });
  // Variantes composées : liens depuis leurs membres (à droite)
  V.forEach(v => { if (!v.comp) return; const yv = pv.get(v.id) + HV / 2;
    [['u', '∪'], ['i', '∩'], ['x', '∖']].forEach(([k, sym]) => v.comp[k].forEach((id, n) => { const ym = pv.get(id); if (ym == null) return;
      const xd = XV + WV, bx = xd + 70 + 40 * Math.abs(pv.get(id) - pv.get(v.id)) / (HV + 30) / 2;
      liens += `<path d="M${xd},${ym + HV / 2} C${bx},${ym + HV / 2} ${bx},${yv} ${xd},${yv}" fill="none" stroke="${C.dim}" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#vgr-flg)"/>` +
        (n === 0 ? `<text x="${xd + 14}" y="${yv - 10}" font-size="13" font-weight="700" fill="${C.dim}">${sym}</text>` : ''); })); });
  s += liens;
  // Critères
  crits.forEach(c => { const cy = pc.get(c), g = c.pkg || '', n = nMarq(c), col = capVarGrCouleurCrit(R, c.nom, C), utilise = V.some(v => retient(v, c));
    s += `<path d="${courbe(g ? XG + WG : XR + WR, g ? pg.get(g) + HC / 2 : yR + HC / 2, XC, cy + HC / 2)}" fill="none" stroke="${C.lien}" stroke-width="1.2"/>`;
    s += `<g data-vcrit-go="${esc(c.nom)}" style="cursor:pointer"><title>${esc(_L(`${c.nom} : ${n} élément(s) marqué(s) — clic : ces éléments dans ▦ Éléments × variantes`))}</title><rect x="${XC}" y="${cy}" width="${WC}" height="${HC}" rx="6" fill="${C.fond}" stroke="${col}" stroke-width="1.8"/><rect x="${XC}" y="${cy}" width="7" height="${HC}" rx="3" fill="${col}"/>` +
      `<text x="${XC + WC / 2 + 3}" y="${cy + 19}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.texte}">${esc(capVsnCoupe(c.nom, 22))}</text><text x="${XC + WC / 2 + 3}" y="${cy + 36}" text-anchor="middle" font-size="11" fill="${C.dim}">${esc(_L(`${n} élément(s) marqué(s)`))}</text></g>`;
    const pb = !n ? _L('ne marque aucun élément') : !utilise && !V.some(v => v.impl) ? _L('retenu par aucune variante') : '';
    if (pb) { anomalies++; const w = Math.round(6.3 * pb.length + 30);
      s += `<rect x="${XC + WC + 10}" y="${cy + 13}" width="${w}" height="20" rx="10" fill="${C.alerteFond}" stroke="${C.alerte}"/><text x="${XC + WC + 20}" y="${cy + 27}" font-size="11" fill="${C.alerteTexte}">⚠ ${esc(pb)}</text>`; } });
  // Variantes
  V.forEach(v => { const vy = pv.get(v.id), vide = !v.comp && !(v.sel && v.sel.length), w = Math.round(200 * (R.tout.n ? v.n / R.tout.n : 0));
    s += `<g data-vvar="${esc(v.id)}" style="cursor:pointer"><title>${esc(_L(`${v.nom} : ${v.def || ''} — ${v.n} élément(s) sur ${R.tout.n} — clic : ses blocs dans 🧱 Blocs 150 %`))}</title>` +
      `<rect x="${XV}" y="${vy}" width="${WV}" height="${HV}" rx="6" fill="${v.comp ? C.cadre : C.fond}" stroke="${vide ? C.alerte : C.pal[0]}" stroke-width="1.8"${v.comp ? ' stroke-dasharray="6 3"' : ''}/>` +
      `<text x="${XV + WV / 2}" y="${vy + 22}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.texte}">${esc(capVsnCoupe(v.nom, 28))}${v.perso ? ' ✚' : ''}</text>` +
      `<rect x="${XV + 20}" y="${vy + 34}" width="200" height="9" rx="4.5" fill="${C.hach1}"/><rect x="${XV + 20}" y="${vy + 34}" width="${w}" height="9" rx="4.5" fill="${C.pal[0]}"/>` +
      `<text x="${XV + 20}" y="${vy + 57}" font-size="10.5" fill="${C.dim}">${esc(capVsnCoupe(`${v.n} / ${R.tout.n} · ${v.comp ? _L('variante composée') : v.def || ''}`, 40))}</text></g>`;
    if (vide) { anomalies++; s += `<text x="${XV}" y="${vy + HV + 16}" font-size="11" fill="${C.alerteTexte}">⚠ ${esc(_L('aucun critère : le socle commun seul'))}</text>`; } });
  if (R.crit.length > crits.length) s += `<text x="${XC}" y="${H - 14}" font-size="11" fill="${C.dim}">${esc(_L(`${R.crit.length - crits.length} autre(s) critère(s) non dessiné(s)`))}</text>`;
  const W = XV + WV + 190;
  const defs = `<defs><marker id="vgr-flg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${C.dim}"/></marker></defs>`;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, system-ui, sans-serif">${defs}<rect width="${W}" height="${H}" fill="${C.fond}"/>${s}</svg>`, w: W, h: H, anomalies };
}

/**
 * Barre de zoom et d'export des graphes (boutons lus par capVoisinageWire, 105).
 * @param {number} z - Zoom
 * @returns {string} HTML
 */
function capVarGrZoom(z) {
  return `<span style="margin-left:auto"></span><button class="cap-lf-btn" data-vz="-1" title="${_L('Réduire')}">−</button><span class="ana-dim" style="min-width:42px;text-align:center">${Math.round((z || 1) * 100)} %</span>` +
    `<button class="cap-lf-btn" data-vz="1" title="${_L('Agrandir')}">+</button><button class="cap-lf-btn" data-vz="0" title="${_L('Taille réelle')}">1:1</button>` +
    `<button class="cap-lf-btn" data-vfit title="${_L('Ajuster le dessin à la largeur de la vue')}">${_L('⤢ Ajuster')}</button><button class="cap-lf-btn" data-vx="svg" title="${_L('Télécharger le dessin (SVG)')}">⬇ SVG</button><button class="cap-lf-btn" data-vx="png" title="${_L('Télécharger le dessin (PNG, ×2)')}">⬇ PNG</button>`;
}

/**
 * Corps des onglets 🧱 Blocs 150 % et 🔀 Critères → variantes de capRenderVariants (103) : commandes, légende, dessin.
 * @param {object} R - capVarCompute()
 * @param {object} st - État de la vue (_capVarUi : view, v, archL, archEx, vz)
 * @returns {string} HTML
 */
function capVarGraphesHtml(R, st) {
  const esc = capEsc, C = capVarGrCouleurs();
  if (st.view === 'archi') {
    const Ls = capVarGrCouches(R); if (!Ls.includes(st.archL)) st.archL = Ls.includes('LA') ? 'LA' : (Ls[0] || 'LA');
    const v = capVarGet(R, st.v) || R.tout, D = capVarArchiSvg(R, st.archL, v, { echanges: st.archEx !== false });
    const leg = `<span><i style="background:${C.comp};border:1px solid ${C.compTrait}"></i>${_L('commun (trait plein)')}</span>` +
      `<span><i style="background:${C.fond};border:2px dashed ${C.variable}"></i>${_L('variable (tirets, couleur du 1er critère)')}</span>` +
      `<span><i style="background:repeating-linear-gradient(45deg,${C.hach2} 0 2px,${C.hach1} 2px 5px)"></i>${_L('retenu par aucune variante')}</span>` +
      `<span><i style="background:${C.fond};border:2px solid ${C.alerte};border-radius:6px"></i>${_L('fonction sans composant dans la variante')}</span>` +
      R.crit.slice(0, CAP_VAR_PAL.l.length).map(c => `<span><i style="background:${capVarGrCouleurCrit(R, c.nom, C)}"></i>${esc(c.nom)}</span>`).join('');
    const opts = [['*', R.tout.nom], ...R.vars.map(x => [x.id, x.nom])];
    return `<div class="var-gr-cmd"><span class="ana-dim">${_L('Couche')}</span>` + Ls.map(L => `<button class="cap-lf-btn${st.archL === L ? ' active' : ''}" data-varl="${L}">${L}</button>`).join('') +
      `<span class="tsep"></span><span class="ana-dim">${_L('Variante')}</span><select class="phl-filter-input" data-varv style="width:auto;max-width:260px">${opts.map(([k, l]) => `<option value="${esc(k)}"${(v.tout ? '*' : v.id) === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` +
      `<label class="ana-dim" style="white-space:nowrap"><input type="checkbox" data-varex${st.archEx !== false ? ' checked' : ''}> ${_L('Échanges')}</label>` + capVarGrZoom(st.vz) + `</div>` +
      `<div class="var-g-legende var-gr-leg">${leg}</div>` +
      `<p class="ana-help">${_L(`${D.nb.comps} composant(s), ${D.nb.fns} fonction(s) allouée(s), ${D.nb.liens} échange(s) dessiné(s). Clic sur un bloc : son détail ; survol : critères et présence dans les variantes.`)}` +
      (D.nb.perdues ? ` <b style="color:var(--c-err,#f85149)">${_L(`⚠ ${D.nb.perdues} fonction(s) sans composant`)}</b>` : '') +
      (D.nb.liensMax ? ` ${_L(`(${D.nb.liensMax} échanges : les ${CAP_VAR_LIENS_MAX} premiers seulement)`)}` : '') + `</p>` +
      `<div class="var-gr-dessin">${D.svg.replace(/ width="[\d.]+" height="[\d.]+"/, ` width="${Math.round(D.w * (st.vz || 1))}" height="${Math.round(D.h * (st.vz || 1))}"`)}</div>`;
  }
  const D = capVarCriteresSvg(R);
  return `<div class="var-gr-cmd"><span class="ana-dim">${_L(`${R.crit.length} critère(s), ${R.vars.length} variante(s)`)}${D.anomalies ? ` · <b style="color:var(--c-err,#f85149)">${_L(`⚠ ${D.anomalies} anomalie(s)`)}</b>` : ''}</span>` + capVarGrZoom(st.vz) + `</div>` +
    `<div class="var-g-legende var-gr-leg"><span>${_L('Lien coloré : la variante retient ce critère')}</span><span>${_L('Tirets : variante composée (∪ union, ∩ intersection, ∖ exclusion)')}</span>` +
    `<span>${_L('Clic sur un critère : ses éléments ; sur une variante : ses blocs')}</span></div>` +
    `<div class="var-gr-dessin">${D.svg.replace(/ width="[\d.]+" height="[\d.]+"/, ` width="${Math.round(D.w * (st.vz || 1))}" height="${Math.round(D.h * (st.vz || 1))}"`)}</div>`;
}

/**
 * Branche les onglets 🧱 / 🔀 : couche, variante, échanges, clics sur les critères et les variantes, zoom et export.
 * @param {HTMLElement} box - Conteneur
 * @param {object} R - capVarCompute()
 * @param {object} st - État de la vue
 * @param {function():void} rendre - Nouveau rendu
 */
function capVarGraphesWire(box, R, st, rendre) {
  box.querySelectorAll('[data-varl]').forEach(b => b.onclick = () => { st.archL = b.dataset.varl; rendre(); });
  box.querySelector('[data-varv]')?.addEventListener('change', e => { st.v = e.target.value; rendre(); });
  box.querySelector('[data-varex]')?.addEventListener('change', e => { st.archEx = e.target.checked; rendre(); });
  box.querySelectorAll('[data-vcrit-go]').forEach(g => g.addEventListener('click', () => { Object.assign(st, { view: 'mx', q: g.dataset.vcritGo, tout: true, type: '' }); rendre(); }));
  box.querySelectorAll('[data-vvar]').forEach(g => g.addEventListener('click', () => { Object.assign(st, { view: 'archi', v: g.dataset.vvar }); rendre(); }));
  box.querySelector('[data-vfit]')?.addEventListener('click', () => {
    const d = box.querySelector('.var-gr-dessin'), m = d && d.querySelector('svg')?.getAttribute('viewBox').split(' ');
    if (!m) return; st.vz = Math.max(0.2, Math.min(1, (box.clientWidth - 30) / +m[2])); rendre(); });
  const svgAutonome = () => st.view === 'archi' ? capVarArchiSvg(R, st.archL, capVarGet(R, st.v) || R.tout, { echanges: st.archEx !== false }).svg : capVarCriteresSvg(R).svg;
  const nom = st.view === 'archi' ? _L(`variantes-blocs-${st.archL}`) : _L('variantes-criteres');
  const z = { get vz() { return st.vz; }, set vz(x) { st.vz = x; } };
  capVoisinageWire(box, z, rendre, svgAutonome, nom);
}
