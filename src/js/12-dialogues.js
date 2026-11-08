/* ═══════════════════════════════════════════════════════════════════════════
   💬 Dialogues maison : capConfirm / capAlert / capPrompt (à la place de confirm / alert / prompt
   du navigateur) et notification brève capToast. Thème de la page, textes traduits au build,
   Entrée = OK, Échap = annuler, bouton par défaut au clavier ; fonctionnent aussi dans les
   fenêtres séparées (⧉ revue, check-lists, dossiers) : passer `win`.
   Asynchrones : `if(!await capConfirm('…')) return;` dans une fonction async.
   Tests : `window._capDlgAuto = 'ok' | 'cancel'` répond sans afficher (test fumée).
   ═══════════════════════════════════════════════════════════════════════════ */

var _capDlgAuto = null;   // 'ok' | 'cancel' : réponse automatique (tests), sinon null

/**
 * Affiche une boîte de dialogue modale et renvoie la réponse.
 * @param {Object} o - Options
 * @param {'confirm'|'alert'|'prompt'} [o.kind='confirm'] - Nature
 * @param {string} o.text - Message (texte brut, les retours à la ligne sont conservés)
 * @param {string} [o.title] - Titre (sinon selon la nature)
 * @param {string} [o.ok] - Libellé du bouton principal
 * @param {string} [o.cancel] - Libellé du bouton d'annulation
 * @param {boolean} [o.danger] - Action destructrice : bouton principal rouge, bouton Annuler par défaut
 * @param {'info'|'warn'|'err'} [o.level] - Pictogramme d'un message (alert)
 * @param {string} [o.value] - Valeur initiale (prompt)
 * @param {string} [o.placeholder] - Aide de saisie (prompt)
 * @param {Window} [o.win] - Fenêtre où afficher (fenêtres séparées), sinon la fenêtre principale
 * @returns {Promise<boolean|string|null>} confirm : vrai / faux ; alert : vrai ; prompt : texte ou null
 */
function capDlg(o) {
  const kind = o.kind || 'confirm', W = o.win || window, D = W.document;
  if (_capDlgAuto) return Promise.resolve(kind === 'prompt' ? (_capDlgAuto === 'ok' ? (o.value || '') : null) : kind === 'alert' ? true : _capDlgAuto === 'ok');
  return new Promise(resolve => {
    const esc = capEsc, ico = kind === 'prompt' ? '✎' : kind === 'alert' ? ({ warn: '⚠', err: '✖' }[o.level] || 'ℹ') : (o.danger ? '⚠' : '?');
    const title = o.title || (kind === 'prompt' ? _L('Saisie') : kind === 'alert' ? ({ warn: _L('Attention'), err: _L('Erreur') }[o.level] || _L('Information')) : _L('Confirmation'));
    const ov = D.createElement('div'); ov.className = 'cap-dlg-ov'; ov.dataset.kind = kind;
    ov.innerHTML = `<div class="cap-dlg" role="${kind === 'alert' ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="cap-dlg-t">
      <div class="cap-dlg-h"><span class="cap-dlg-i${o.danger || o.level === 'err' ? ' err' : o.level === 'warn' ? ' warn' : ''}">${ico}</span><b id="cap-dlg-t">${esc(title)}</b></div>
      <div class="cap-dlg-b">${esc(o.text || '')}</div>
      ${kind === 'prompt' ? `<div class="cap-dlg-in"><input type="text" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" autocomplete="off"></div>` : ''}
      <div class="cap-dlg-f">${kind === 'alert' ? '' : `<button class="cap-lf-btn" data-c="cancel">${esc(o.cancel || _L('Annuler'))}</button>`}<button class="cap-lf-btn${o.danger ? ' danger' : ' pri'}" data-c="ok">${esc(o.ok || (kind === 'alert' ? _L('OK') : o.danger ? _L('Supprimer') : _L('OK')))}</button></div>
    </div>`;
    const inp = ov.querySelector('input'), box = ov.firstElementChild;
    const fin = ok => {
      if (!ov.parentNode) return;
      ov.remove(); D.removeEventListener('keydown', key, true);
      if (prev && prev.focus) try { prev.focus(); } catch (e) { /* élément disparu */ }
      resolve(kind === 'prompt' ? (ok ? inp.value : null) : kind === 'alert' ? true : ok);
    };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); }
      else if (e.key === 'Enter' && !(e.target && e.target.tagName === 'BUTTON')) { e.preventDefault(); e.stopPropagation(); fin(true); }
      else if (e.key === 'Tab') {   // le focus reste dans la boîte
        const f = [...box.querySelectorAll('input,button')], i = f.indexOf(D.activeElement);
        if (f.length) { e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
      }
    };
    ov.addEventListener('mousedown', e => { if (e.target === ov) { e.preventDefault(); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); } });   // clic hors de la boîte : secousse, pas de fermeture
    ov.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) fin(b.dataset.c === 'ok'); });
    D.addEventListener('keydown', key, true);
    const prev = D.activeElement;
    D.body.appendChild(ov);
    (inp || ov.querySelector(o.danger ? '[data-c="cancel"]' : '[data-c="ok"]') || ov.querySelector('[data-c="ok"]')).focus();
    if (inp) inp.select();
  });
}

/** Demande une confirmation (remplace `confirm`).
 * @param {string} text - Question
 * @param {Object} [o] - Options de capDlg (title, ok, cancel, danger, win)
 * @returns {Promise<boolean>} vrai si l'utilisateur confirme
 */
function capConfirm(text, o) { return capDlg(Object.assign({ kind: 'confirm', text }, o || {})); }

/** Affiche un message à acquitter (remplace `alert`). Peut être appelée sans `await`.
 * @param {string} text - Message
 * @param {Object} [o] - Options de capDlg (title, level 'info'|'warn'|'err', ok, win)
 * @returns {Promise<boolean>} résolu à la fermeture
 */
function capAlert(text, o) { return capDlg(Object.assign({ kind: 'alert', text }, o || {})); }

/** Demande une saisie (remplace `prompt`).
 * @param {string} text - Invite
 * @param {string} [value] - Valeur initiale
 * @param {Object} [o] - Options de capDlg (title, ok, placeholder, win)
 * @returns {Promise<string|null>} texte saisi, ou null si annulé
 */
function capPrompt(text, value, o) { return capDlg(Object.assign({ kind: 'prompt', text, value: value == null ? '' : String(value) }, o || {})); }

/**
 * Notification brève en bas de la fenêtre (disparaît seule) : confirmation d'une action, petit avertissement.
 * @param {string} msg - Texte
 * @param {Object} [o] - Options
 * @param {'ok'|'warn'|'err'} [o.kind] - Couleur (liseré)
 * @param {number} [o.ms=3500] - Durée d'affichage
 * @param {Window} [o.win] - Fenêtre (fenêtres séparées)
 */
function capToast(msg, o) {
  o = o || {}; const W = o.win || window, D = W.document;
  let n = D.getElementById('cap-watch-flash');   // élément historique de la page principale (🔄 suivi)
  if (!n) { n = D.createElement('div'); n.id = 'cap-watch-flash'; D.body.appendChild(n); }
  n.textContent = msg; n.className = o.kind ? 'tk-' + o.kind : ''; n.style.display = 'block';
  clearTimeout(n._t); n._t = setTimeout(() => { n.style.display = 'none'; }, o.ms || 3500);
}

/** Fenêtre de choix du modèle à ouvrir quand un dossier en contient plusieurs (📁 dossier du projet : .capella de 54, UML / SysML v1
 * de 88) : boîte centrée sur un fond assombri, au lieu d'une liste perdue en bas de l'écran d'accueil ; filtre dès 8 modèles,
 * ↑ ↓ Entrée au clavier, Échap ou ✕ pour renoncer (le message de l'accueil reste affiché).
 * @param {{chemin:string}[]} mods - Modèles candidats
 * @param {{ico?:string, aide?:string}} o - Pictogramme des lignes, texte d'aide sous le titre
 * @param {function(object):void} ouvrir - Ouverture du modèle choisi
 */
function capChoixModele(mods, o, ouvrir) {
  const D = document, esc = capEsc, ico = o && o.ico || '📄';
  const dos = c => { const i = c.lastIndexOf('/'); return i < 0 ? ['', c] : [c.slice(0, i + 1), c.slice(i + 1)]; };   // dossier / nom
  D.querySelectorAll('.cap-choix-ov').forEach(x => x.remove());
  const ov = D.createElement('div'); ov.className = 'cap-dlg-ov cap-choix-ov';
  ov.innerHTML = `<div class="cap-dlg cap-choix" role="dialog" aria-modal="true" aria-labelledby="cap-choix-t">
    <div class="cap-dlg-h"><span class="cap-dlg-i">📁</span><b id="cap-choix-t">${esc(_L(`${mods.length} modèles dans ce dossier : lequel ouvrir ?`))}</b>
      <button type="button" class="cap-lf-btn cap-choix-x" data-c="x" title="${_L('Fermer sans ouvrir (Échap)')}">✕</button></div>
    ${o && o.aide ? `<div class="cw-choix-h">${esc(o.aide)}</div>` : ''}
    ${mods.length >= 8 ? `<div class="cap-dlg-in"><input type="text" placeholder="${_L('Filtrer par nom ou dossier…')}" autocomplete="off"></div>` : ''}
    <div class="cw-choix">${mods.map((m, i) => { const [d, n] = dos(m.chemin); return `<button type="button" class="cw-choix-b" data-mod="${i}">${ico} <span><span class="cw-choix-d">${esc(d)}</span><b>${esc(n)}</b></span><span class="cw-choix-o">${_L('Ouvrir →')}</span></button>`; }).join('')}</div>
  </div>`;
  const fin = () => { ov.remove(); D.removeEventListener('keydown', key, true); };
  const btns = () => [...ov.querySelectorAll('.cw-choix-b')].filter(b => b.style.display !== 'none');
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const l = btns(), i = l.indexOf(D.activeElement); if (!l.length) return;
      e.preventDefault(); l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length].focus();
    } else if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') { const l = btns(); if (l.length) { e.preventDefault(); l[0].click(); } }
  };
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-mod]'); if (b) { e.stopPropagation(); fin(); ouvrir(mods[+b.dataset.mod]); return; }
    if (e.target.closest('[data-c="x"]') || e.target === ov) fin();
  });
  const inp = ov.querySelector('input');
  if (inp) inp.addEventListener('input', () => { const q = inp.value.trim().toLowerCase(); ov.querySelectorAll('.cw-choix-b').forEach((b, i) => { b.style.display = !q || mods[i].chemin.toLowerCase().includes(q) ? '' : 'none'; }); });
  D.addEventListener('keydown', key, true);
  D.body.appendChild(ov);
  (inp || ov.querySelector('.cw-choix-b')).focus();
  const st = D.getElementById('cw-status');   // écran d'accueil : bouton pour rouvrir la fenêtre après Échap
  if (st && !st.querySelector('.cap-choix-re')) {
    st.insertAdjacentHTML('beforeend', ` <button type="button" class="cap-lf-btn cap-choix-re">${_L('📁 Choisir le modèle…')}</button>`);
    st.querySelector('.cap-choix-re').addEventListener('click', ev => { ev.stopPropagation(); capChoixModele(mods, o, ouvrir); });
  }
}
