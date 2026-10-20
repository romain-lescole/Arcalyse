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
