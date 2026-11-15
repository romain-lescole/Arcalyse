/* ══ ◎ VOISINAGE (CAPELLA) ═══════════════════════════════════════════════════════════════
 * Dessin commun de la vue ◎ Voisinage des vues de blocs de Capella (🧱 System / Logical Component, 🔀 Behavior Exchange,
 * 🔌 Physical Link, ƒ⇆ Functional Exchange, 🟨 Operational Analysis) : l'élément choisi au centre avec ses ports, ses liens
 * entrants à gauche et sortants à droite, un bloc par élément relié (avec son port), un trait par lien. Clic sur un voisin :
 * il passe au centre ; clic sur un lien, un port ou le bloc central : panneau de détail. Couleurs écrites dans le SVG
 * (thème clair ou sombre), pour que le dessin exporté (SVG, PNG, rapport HTML) reste fidèle.
 * Données préparées par les vues : `capRenderComponentBlocks` (47), `capRenderFunctionalExchange` (44).
 */

/** Couleurs des blocs par genre (fond, trait), en thème sombre et clair. */
var CAP_VSN_GENRES = {
  sys:    { d: ['#24344f', '#6f9be0'], l: ['#c9e0f7', '#3c3c96'] },
  act:    { d: ['#1d3a45', '#7fd8ff'], l: ['#e3feff', '#3c3c96'] },
  node:   { d: ['#3a321a', '#e3b341'], l: ['#fff3b0', '#8a6d00'] },
  fn:     { d: ['#1f3a26', '#4dd880'], l: ['#dcffc8', '#2f6b2f'] },
  fnact:  { d: ['#1d3048', '#79b8ff'], l: ['#d6ecff', '#3c3c96'] },
  fnnone: { d: ['#2a2e33', '#8b949e'], l: ['#ececec', '#7d7d7d'] },
  oa:     { d: ['#3d3520', '#c9a227'], l: ['#fff2a8', '#6b4f2a'] }
};

/** Nombre de lignes dessinées par côté au plus (au-delà : renvoi à ≡ Vue Ligne). */
var CAP_VSN_MAX = 60;

/**
 * Couleurs du thème pour le dessin : texte, texte secondaire, fond, et genres des blocs.
 * @returns {{clair:boolean, texte:string, dim:string, fond:string, bloc:function(string):string[]}} couleurs
 */
function capVsnCouleurs() {
  const clair = capIsLight();
  return { clair, texte: clair ? '#111111' : '#e6edf3', dim: clair ? '#555555' : '#8b949e', fond: clair ? '#ffffff' : '#0d1117',
    bloc: g => (CAP_VSN_GENRES[g] || CAP_VSN_GENRES.sys)[clair ? 'l' : 'd'] };
}

/**
 * Port ou pin façon Capella, centré sur (x, y), sur le bord gauche (`L`) ou droit (`R`) d'un bloc.
 * Component Port : UNSET plein (rouge brun), IN / OUT blancs avec un chevron vers l'intérieur / l'extérieur du bloc, INOUT blanc vide ;
 * port physique (PP) jaune ; pins de fonction : entrée verte (FIP), sortie orange (FOP), flèche dans le sens du flux.
 * @param {number} x - Abscisse du centre
 * @param {number} y - Ordonnée du centre
 * @param {string} orient - IN, OUT, INOUT, UNSET, PP, FIP, FOP
 * @param {'L'|'R'} cote - Bord du bloc qui porte le port
 * @returns {string} SVG
 */
function capVsnPort(x, y, orient, cote) {
  const s = 5, carre = (f, t) => `<rect x="${x - s}" y="${y - s}" width="${2 * s}" height="${2 * s}" fill="${f}" stroke="${t}" stroke-width="1.2"/>`;
  const dedans = cote === 'L' ? 1 : -1;   // sens « vers l'intérieur du bloc » en x
  const fleche = (d, c) => `<path d="M${x - 2.5 * d},${y - 3} L${x + 3 * d},${y} L${x - 2.5 * d},${y + 3}Z" fill="${c}"/>`;
  switch (orient) {
    case 'UNSET': return carre('#8f3f3f', '#4a1515');
    case 'IN': return carre('#ffffff', '#222222') + fleche(dedans, '#222222');
    case 'OUT': return carre('#ffffff', '#222222') + fleche(-dedans, '#222222');
    case 'PP': return carre('#e3b341', '#6b5200');
    case 'FIP': return carre('#3fb950', '#1a5c2a') + fleche(dedans, '#ffffff');
    case 'FOP': return carre('#f0883e', '#7a3a0a') + fleche(-dedans, '#ffffff');
    default: return carre('#ffffff', '#222222');   // INOUT
  }
}

/**
 * Coupe un texte trop long (points de suspension).
 * @param {string} s - Texte
 * @param {number} n - Longueur maximale
 * @returns {string} texte coupé
 */
function capVsnCoupe(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/**
 * Dessin ◎ Voisinage. Chaque ligne est un lien entre l'élément central et un voisin ; les lignes d'un même voisin, d'un même côté,
 * partagent son bloc. Côté : gauche = entrant, droite = sortant (décidé par la vue).
 * @param {object} o - Données
 * @param {{id:string, nom:string, sous:string, genre:string, ports:{id:string, nom:string, orient:string}[], pied:string[]}} o.centre - Élément central
 * @param {{cote:string, port:string, lien:{id:string, nom:string, info:string, couleur:string, fleche:string, tirets:boolean}, voisin:{id:string, nom:string, sous:string, genre:string, centrable:boolean, port:?{id:string, nom:string, orient:string}}}[]} o.lignes - Liens
 * @param {{L:string, R:string}} o.titres - Titres des deux colonnes
 * @param {number} [o.zoom] - Facteur d'échelle de l'affichage
 * @param {boolean} [o.autonome] - Vrai : fond et police écrits dans le SVG (export)
 * @returns {string} SVG
 */
function capVoisinageSvg(o) {
  const K = capVsnCouleurs(), esc = capEsc, z = o.zoom || 1;
  const pw = 220, gx = 190, cw = 250, xL = 20, xC = xL + pw + gx, xR = xC + cw + gx, W = xR + pw + 20;
  const rh = 34, tete = 30, ecart = 12, top = 48;
  // Lignes de chaque côté, regroupées par voisin (ordre : voisin, puis lien)
  const cotes = { L: [], R: [] };
  o.lignes.forEach(r => (cotes[r.cote === 'R' ? 'R' : 'L']).push(r));
  const plus = {};
  const blocs = { L: [], R: [] };
  ['L', 'R'].forEach(c => {
    const par = new Map();
    cotes[c].sort((a, b) => String(a.voisin.nom).localeCompare(String(b.voisin.nom)) || String(a.lien.nom).localeCompare(String(b.lien.nom)))
      .forEach(r => { if (!par.has(r.voisin.id)) par.set(r.voisin.id, []); par.get(r.voisin.id).push(r); });
    let y = top, n = 0;
    for (const [, rs] of par) {
      if (n >= CAP_VSN_MAX) { plus[c] = (plus[c] || 0) + rs.length; continue; }
      const garde = rs.slice(0, CAP_VSN_MAX - n); n += garde.length; if (garde.length < rs.length) plus[c] = (plus[c] || 0) + rs.length - garde.length;
      const h = tete + garde.length * rh;
      blocs[c].push({ v: garde[0].voisin, y, h, rows: garde.map((r, i) => ({ r, y: y + tete + i * rh + rh / 2 })) });
      y += h + ecart;
    }
    blocs[c].bas = y;
  });
  const hC = Math.max(130, Math.max(blocs.L.bas, blocs.R.bas) - top - ecart);
  // Ports du centre : à la hauteur moyenne de leurs lignes ; lien sans port : point d'accroche sur le bord, à sa hauteur
  const pc = { L: new Map(), R: new Map() };
  ['L', 'R'].forEach(c => blocs[c].forEach(b => b.rows.forEach(x => { const k = x.r.port || '~' + x.r.lien.id + '~' + x.y;
    if (!pc[c].has(k)) pc[c].set(k, { ys: [], port: (o.centre.ports || []).find(p => p.id === x.r.port) || null }); pc[c].get(k).ys.push(x.y); x.k = k; })));
  ['L', 'R'].forEach(c => pc[c].forEach(v => { v.y = v.ys.reduce((a, b) => a + b, 0) / v.ys.length; }));
  // Ports du centre trop proches : écartés dans l'ordre (au moins 14 px), sans sortir du bloc
  ['L', 'R'].forEach(c => { const l = [...pc[c].values()].sort((a, b) => a.y - b.y); for (let i = 1; i < l.length; i++) if (l[i].y < l[i - 1].y + 14) l[i].y = l[i - 1].y + 14;
    const max = top + hC - 10; for (let i = l.length - 1; i >= 0; i--) { if (l[i].y > max) l[i].y = max; if (i < l.length - 1 && l[i].y > l[i + 1].y - 14) l[i].y = l[i + 1].y - 14; } });
  const H = top + hC + 30 + (o.centre.pied || []).length * 15 + (plus.L || plus.R ? 18 : 0);
  let svg = '';
  const fl = (x, y, d, c) => `<path d="M${x - 8 * d},${y - 4} L${x},${y} L${x - 8 * d},${y + 4}Z" fill="${c}"/>`;
  // Traits (sous les blocs)
  ['L', 'R'].forEach(c => blocs[c].forEach((b, ib) => b.rows.forEach((x, i) => {
    const g = c === 'L', px = g ? xL + pw : xR, cx = g ? xC : xC + cw, yc = pc[c].get(x.k).y, col = x.r.lien.couleur || K.dim;
    const mx = g ? xL + pw + 50 + ((ib * 3 + i) % 7) * 13 : xC + cw + gx - 50 - ((ib * 3 + i) % 7) * 13;
    const f = x.r.lien.fleche, tet = (f === 'centre' || f === 'deux' ? fl(g ? cx - 6 : cx + 6, yc, g ? 1 : -1, col) : '') + (f === 'pair' || f === 'deux' ? fl(g ? px + 6 : px - 6, x.y, g ? -1 : 1, col) : '');
    svg += `<g><title>${esc(x.r.lien.nom)}${x.r.lien.info ? '\n' + esc(x.r.lien.info) : ''}</title><path d="M${px},${x.y} H${mx} V${yc} H${cx}" fill="none" stroke="${col}" stroke-width="1.6"${x.r.lien.tirets ? ' stroke-dasharray="5 3"' : ''}/>${tet}` +
      `<text x="${g ? px + 10 : px - 10}" y="${x.y - 5}" text-anchor="${g ? 'start' : 'end'}" font-size="10.5" fill="${col}" class="cul-clic" data-det="${esc(x.r.lien.id)}">${esc(capVsnCoupe(x.r.lien.nom, 28))}</text></g>`;
  })));
  // Blocs des voisins, avec leurs ports
  ['L', 'R'].forEach(c => blocs[c].forEach(b => {
    const g = c === 'L', bx = g ? xL : xR, px = g ? xL + pw : xR, [fd, tr] = K.bloc(b.v.genre), v = b.v;
    const att = v.centrable ? `data-vois="${esc(v.id)}"` : `data-det="${esc(v.id)}"`;
    svg += `<g class="cul-clic" ${att}><title>${esc(v.nom)}${v.sous ? ' — ' + esc(v.sous) : ''}${v.centrable ? '\n' + _L('clic : le mettre au centre') : ''}</title>` +
      `<rect x="${bx}" y="${b.y}" width="${pw}" height="${b.h}" rx="4" fill="${fd}" stroke="${tr}" stroke-width="1.4"/>` +
      `<text x="${bx + pw / 2}" y="${b.y + 13}" text-anchor="middle" font-size="12" font-weight="700" fill="${K.texte}">${esc(capVsnCoupe(v.nom, 30))}</text>` +
      (v.sous ? `<text x="${bx + pw / 2}" y="${b.y + 25}" text-anchor="middle" font-size="9.5" fill="${K.dim}">${esc(capVsnCoupe(v.sous, 38))}</text>` : '') + `</g>`;
    b.rows.forEach(x => { const p = x.r.voisin.port; if (!p) return;
      svg += `<g class="cul-clic" data-det="${esc(p.id)}"><title>${esc(p.nom)} (${esc(p.orient)})</title>${capVsnPort(px, x.y, p.orient, g ? 'R' : 'L')}</g>` +
        `<text x="${g ? px - 9 : px + 9}" y="${x.y + 4}" text-anchor="${g ? 'end' : 'start'}" font-size="10" font-family="monospace" fill="${K.dim}">${esc(capVsnCoupe(p.nom, 26))}</text>`; });
  }));
  // Bloc central et ses ports
  const ce = o.centre, [fd, tr] = K.bloc(ce.genre);
  svg += `<g class="cul-clic" data-det="${esc(ce.id)}"><title>${esc(ce.nom)}${ce.sous ? ' — ' + esc(ce.sous) : ''}</title><rect x="${xC}" y="${top}" width="${cw}" height="${hC}" rx="5" fill="${fd}" stroke="${tr}" stroke-width="2.4"/>` +
    (ce.sous ? `<text x="${xC + cw / 2}" y="${top + 15}" text-anchor="middle" font-size="10" fill="${K.dim}">${esc(capVsnCoupe(ce.sous, 40))}</text>` : '') +
    `<text x="${xC + cw / 2}" y="${top + (ce.sous ? 32 : 22)}" text-anchor="middle" font-size="14" font-weight="700" fill="${K.texte}">${esc(capVsnCoupe(ce.nom, 30))}</text></g>`;
  ['L', 'R'].forEach(c => pc[c].forEach(v => { const x = c === 'L' ? xC : xC + cw, p = v.port; if (!p) return;
    svg += `<g class="cul-clic" data-det="${esc(p.id)}"><title>${esc(p.nom)} (${esc(p.orient)})</title>${capVsnPort(x, v.y, p.orient, c)}</g>` +
      `<text x="${c === 'L' ? x + 9 : x - 9}" y="${v.y + 4}" text-anchor="${c === 'L' ? 'start' : 'end'}" font-size="10" font-family="monospace" fill="${K.dim}">${esc(capVsnCoupe(p.nom, 22))}</text>`; }));
  if (!o.lignes.length) svg += `<text x="${xC + cw / 2}" y="${top + hC / 2 + 14}" text-anchor="middle" font-size="11" fill="${K.dim}">${esc(o.vide || _L('aucun lien'))}</text>`;
  svg += `<text x="${xL + pw / 2}" y="${top - 16}" text-anchor="middle" font-size="11" fill="${K.dim}">← ${esc(o.titres.L)} (${cotes.L.length})</text>` +
    `<text x="${xR + pw / 2}" y="${top - 16}" text-anchor="middle" font-size="11" fill="${K.dim}">${esc(o.titres.R)} (${cotes.R.length}) →</text>`;
  let yp = top + hC + 20;
  (ce.pied || []).forEach(t => { svg += `<text x="${xC + cw / 2}" y="${yp}" text-anchor="middle" font-size="10.5" fill="${K.dim}">${esc(capVsnCoupe(t, 100))}</text>`; yp += 15; });
  if (plus.L || plus.R) svg += `<text x="${W / 2}" y="${yp + 4}" text-anchor="middle" font-size="10.5" fill="${K.dim}">${esc(_L(`… ${(plus.L || 0) + (plus.R || 0)} autre(s) lien(s) non dessiné(s) : voir ≡ Vue Ligne`))}</text>`;
  const fond = o.autonome ? `<rect width="${W}" height="${H}" fill="${K.fond}"/>` : '';
  return `<svg class="cul-svg vsn-svg" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" width="${Math.round(W * z)}" height="${Math.round(H * z)}" viewBox="0 0 ${W} ${H}">${fond}${svg}</svg>`;
}

/**
 * Barre de la vue ◎ Voisinage : élément au centre (liste avec le nombre de liens), éléments visités, zoom, exports.
 * @param {{cands:{id:string, nom:string, n:number}[], courant:string, hist:string[], nomDe:function(string):string, zoom:number, quoi:string}} o - Données
 * @returns {string} HTML
 */
function capVoisinageBarre(o) {
  const esc = capEsc, liste = o.cands.some(c => c.id === o.courant) ? o.cands : [{ id: o.courant, nom: o.nomDe(o.courant), n: 0 }, ...o.cands];
  const fil = (o.hist || []).filter(id => id !== o.courant).slice(-5).map(id => `<span class="fex-go" data-vois="${esc(id)}">${esc(o.nomDe(id))}</span>`).join(' › ');
  return `<div class="cub-zoom"><span class="ana-dim">${_L('Au centre')} :</span>` +
    `<select class="phl-filter-input vsn-choix" style="max-width:300px" title="${esc(o.quoi)}">${liste.map(c => `<option value="${esc(c.id)}"${c.id === o.courant ? ' selected' : ''}>${esc(c.nom)} (${c.n})</option>`).join('')}</select>` +
    (fil ? `<span class="ana-dim" style="margin-left:8px">${_L('Visités')} : ${fil}</span>` : '') +
    `<span style="margin-left:auto"></span>` +
    `<button class="cap-lf-btn" data-vz="-1" title="${_L('Réduire')}">−</button><span class="ana-dim" style="min-width:42px;text-align:center">${Math.round((o.zoom || 1) * 100)} %</span>` +
    `<button class="cap-lf-btn" data-vz="1" title="${_L('Agrandir')}">+</button><button class="cap-lf-btn" data-vz="0" title="${_L('Taille réelle')}">1:1</button>` +
    `<button class="cap-lf-btn" data-vx="svg" title="${_L('Télécharger le dessin (SVG)')}">⬇ SVG</button><button class="cap-lf-btn" data-vx="png" title="${_L('Télécharger le dessin (PNG, ×2)')}">⬇ PNG</button></div>`;
}

/**
 * Branche une vue ◎ Voisinage rendue (barre de `capVoisinageBarre` et dessin de `capVoisinageSvg`).
 * @param {HTMLElement} el - Conteneur
 * @param {object} st - État de la vue (`focus`, `hist`, `vz` : zoom)
 * @param {function():void} rendre - Nouveau rendu
 * @param {function():string} svgAutonome - Dessin autonome pour l'export
 * @param {string} nom - Base du nom de fichier
 */
function capVoisinageWire(el, st, rendre, svgAutonome, nom) {
  const centrer = id => { if (!id || id === st.focus) return; st.hist = [...(st.hist || []).filter(x => x !== st.focus), st.focus].filter(Boolean).slice(-20); st.focus = id; rendre(); };
  el.querySelector('.vsn-choix')?.addEventListener('change', e => centrer(e.target.value));
  el.querySelectorAll('[data-vois]').forEach(a => a.addEventListener('click', ev => { ev.stopPropagation(); centrer(a.dataset.vois); }));
  el.querySelectorAll('[data-det]').forEach(a => a.addEventListener('click', ev => { ev.stopPropagation(); capOpenDetailById(a.dataset.det); }));
  el.querySelectorAll('[data-vz]').forEach(b => b.addEventListener('click', () => { const d = +b.dataset.vz; st.vz = d === 0 ? 1 : Math.max(0.3, Math.min(3, (st.vz || 1) * (d > 0 ? 1.2 : 1 / 1.2))); rendre(); }));
  const fichier = String(nom || 'voisinage').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'voisinage';
  el.querySelectorAll('[data-vx]').forEach(b => b.addEventListener('click', async () => {
    const svg = svgAutonome();
    if (b.dataset.vx === 'svg') { capDownloadBlob(new Blob([svg], { type: 'image/svg+xml' }), fichier + '.svg'); return; }
    try {
      const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/), w = m ? +m[1] : 800, h = m ? +m[2] : 600, k = 2;
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(bl => { if (bl) capDownloadBlob(bl, fichier + '.png'); }, 'image/png');
    } catch (e) { capAlert(_L('Export PNG impossible : ') + (e && e.message || e), { level: 'err' }); }
  }));
}
