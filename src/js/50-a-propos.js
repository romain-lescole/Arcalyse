/* ══ ℹ À PROPOS ══════════════════════════════════════════════════════════════════
 * Fenêtre « À propos » d'Arcalyse (menu ❓ Aide ▾) : identité et version, auteur, licence Apache 2.0, contact,
 * composants tiers (D3.js, licence ISC à reproduire), marques citées, informations techniques copiables.
 */
var CAP_APP_VERSION='3.1';   // à mettre à jour à chaque livraison (node build.js --livraison)
var CAP_APP_AUTHOR=_L('Romain Lescole');
var CAP_APP_NAME=_L('Arcalyse');
var CAP_APP_SLOGAN=_L('Votre modèle Capella, sous toutes ses coutures.');
var CAP_APP_REPO='github.com/romain-lescole/arcalyse';
/** Texte de la licence ISC de D3.js (reproduction obligatoire). */
var CAP_D3_LICENSE=`Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

/** Informations techniques (version, navigateur, accès direct aux fichiers, modèle chargé), pour un signalement.
 * @returns {string[][]} Lignes [libellé, valeur] */
function capAboutTech(){
  const ua=navigator.userAgent, br=(ua.match(/Edg\/[\d.]+/)||ua.match(/Firefox\/[\d.]+/)||ua.match(/Chrome\/[\d.]+/)||ua.match(/Version\/[\d.]+.*Safari/)||[ua.slice(0,60)])[0].replace('Edg/','Edge ').replace('/',' ');
  const d=new Date(document.lastModified);
  return [
    [_L('Version'), CAP_APP_VERSION],
    [_L('Fichier du'), isNaN(d)?'—':d.toLocaleDateString('fr-FR')],   // date seule, sans l'heure
    [_L('Navigateur'), br],
    [_L('Navigateur de test'), _L('Google Chrome version 155')],
    [_L('Accès direct au fichier (🔄 Suivi)'), 'showOpenFilePicker' in window?_L('disponible'):_L('non disponible (rechargement manuel)')],
    [_L('Modèle chargé'), capLoaded?_L(`${capCurrentFileName||'—'} · ${(typeof capAllElements!=='undefined'?capAllElements.length:0).toLocaleString('fr-FR')} éléments`):_L('aucun')],
    [_L('Fonctionnement'), _L('hors ligne (ressources intégrées au fichier)')]
  ];
}

/**
 * Logo d'Arcalyse (proposition B : la lettre « A » dessinée en graphe, nœuds aux couleurs des couches ARCADIA).
 * Les traits suivent la couleur du texte (currentColor).
 * @param {number} taille - côté du carré, en pixels
 * @returns {string} balise SVG
 */
function capLogoSvg(taille){
  return `<svg class="cap-logo" width="${taille}" height="${taille}" viewBox="0 0 100 100" aria-hidden="true">`
    +'<g stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none" opacity=".85"><path d="M50 16L20 84M50 16L80 84"/>'
    +'<path d="M32 58Q50 40 68 58" stroke="#5aa2e8" stroke-width="6"/></g>'
    +'<circle cx="50" cy="16" r="9" fill="#f0a35e"/><circle cx="20" cy="84" r="9" fill="#4fc3a1"/><circle cx="80" cy="84" r="9" fill="#e8c84f"/>'
    +'<circle cx="32" cy="58" r="5" fill="#5aa2e8"/><circle cx="68" cy="58" r="5" fill="#5aa2e8"/></svg>';
}

/** Ouvre la fenêtre « À propos ». */
function capAboutOpen(){
  let ov=document.getElementById('cap-about-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='cap-about-ov'; document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; }); }
  const tech=capAboutTech(), e=capEsc, yr=new Date().getFullYear();
  ov.innerHTML=_L(`<div class="cw-d-box ab-box">
    <div class="cw-d-hdr"><b>ℹ À propos</b><button class="cap-lf-btn" data-c="x">✕</button></div>
    <div class="cw-d-body">
      <div class="ab-id"><div class="ab-logo">${capLogoSvg(56)}</div><div><div class="ab-name">${e(CAP_APP_NAME)}</div><div class="ab-slogan">${e(CAP_APP_SLOGAN)}</div>
        <div class="ab-ver">Version ${e(CAP_APP_VERSION)} · ${e(tech[1][1])}</div>
        <div class="ana-dim">Explorateur et analyseur hors ligne de modèles Capella / ARCADIA : exploration, flux et interfaces, scénarios, analyses, contrôles et exports, dans un seul fichier HTML.</div></div></div>
      <h4>Auteur et licence</h4>
      <table class="ana-t ana-kv">
        <tr><td>Auteur</td><td>© ${yr} ${e(CAP_APP_AUTHOR)} — créateur et titulaire des droits</td></tr>
        <tr><td>Licence</td><td><b>Apache License 2.0</b> — logiciel libre : utilisation (y compris commerciale), étude, modification et redistribution autorisées, à condition de conserver les avis de droit d'auteur et de licence et de signaler les fichiers modifiés. Fourni <b>sans aucune garantie</b>.<br><span class="ana-dim">Texte complet : apache.org/licenses/LICENSE-2.0 (fichier LICENSE du dépôt)</span></td></tr>
        <tr><td>Contact</td><td>Code source, signalements et contributions : <a class="ab-mono" href="https://${e(CAP_APP_REPO)}" target="_blank" rel="noopener">${e(CAP_APP_REPO)}</a></td></tr>
        <tr><td>Développement</td><td>Développé avec l'aide de Claude Code (Anthropic).</td></tr>
      </table>
      <h4>Composants tiers et marques</h4>
      <table class="ana-t ana-kv">
        <tr><td>D3.js v7.9.0</td><td>Bibliothèque de visualisation, embarquée dans ce fichier — licence ISC, © 2010-2023 Mike Bostock.
          <details><summary class="ana-dim">Texte de la licence</summary><pre class="ab-lic">${e(CAP_D3_LICENSE)}</pre></details></td></tr>
        <tr><td>Capella, ARCADIA</td><td>Marques de leurs détenteurs respectifs (Eclipse Foundation, Thales). Outil indépendant, compatible avec les modèles Capella : ni officiel, ni affilié.</td></tr>
        <tr><td>Modèles de test</td><td>Exemples Capella « In-Flight Entertainment System » (<a href="https://github.com/dbinfrago/Capella-IFE-sample" target="_blank" rel="noopener">github.com/dbinfrago/Capella-IFE-sample</a>) et « AIDA » (<a href="https://sahara.irt-saintexupery.com/AIDA/AIDAArchitecture" target="_blank" rel="noopener">sahara.irt-saintexupery.com/AIDA/AIDAArchitecture</a>).</td></tr>
      </table>
      <h4>Informations techniques</h4>
      <table class="ana-t ana-kv">${tech.map(([k,v])=>`<tr><td>${e(k)}</td><td>${e(v)}</td></tr>`).join('')}</table>
    </div>
    <div class="cw-d-ftr"><button class="cap-lf-btn" data-c="copy" title="Copier version, navigateur et modèle, à joindre à un signalement">📋 Copier les infos</button><span style="flex:1"></span><button class="phl-export-btn" data-c="x">Fermer</button></div></div>`);
  ov.style.display='flex';
  ov.querySelectorAll('[data-c="x"]').forEach(b=>b.onclick=()=>{ ov.style.display='none'; });
  ov.querySelector('[data-c="copy"]').onclick=()=>{
    const txt=[CAP_APP_NAME, ...tech.map(([k,v])=>`${k} : ${v}`)].join('\n');
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>{ if(typeof capWatchFlash==='function') capWatchFlash(_L('✔ Informations copiées')); },()=>capPrompt(_L('Copiez les informations :'),txt,{title:_L('Copie manuelle')}));
  };
}

// Lien « ℹ À propos » de l'écran d'accueil
document.getElementById('cw-about-link')?.addEventListener('click',ev=>{ ev.preventDefault(); ev.stopPropagation(); capAboutOpen(); });
