/* ═══════════════════════════════════════════════════════════════════════
   CAPELLA ENGINE — Détail & câblage événements
   ═══════════════════════════════════════════════════════════════════════ */
/** Ouvre le panneau de détail Capella pour un des deux IDs fournis (src ou tgt).
 * Essaie id1 en premier, puis id2 si id1 non trouvé dans capAllElements.
 */
function capOpenDetailById(id1, id2){
  const id=id1||id2;
  if(!id) return;
  const el=capAllElements.find(e=>e.id===id);
  if(el) capOpenDetail(el.id);
  else if(id2){ const el2=capAllElements.find(e=>e.id===id2); if(el2) capOpenDetail(el2.id); }
}

// ── cap-sidebar resize ──
(function(){
  const resizer=document.getElementById('cap-sidebar-resizer');
  const sidebar=document.getElementById('cap-sidebar');
  if(!resizer||!sidebar) return;
  let startX, startW;
  resizer.addEventListener('mousedown',e=>{
    startX=e.clientX; startW=sidebar.offsetWidth; e.preventDefault();
    resizer.style.borderColor='var(--c-accent)';
    const onMove=e2=>{
      const w=Math.max(140,Math.min(480,startW+(e2.clientX-startX)));
      sidebar.style.width=w+'px';
    };
    const onUp=()=>{
      resizer.style.borderColor='';
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
  resizer.addEventListener('mouseenter',()=>resizer.style.borderColor='var(--c-accent)');
  resizer.addEventListener('mouseleave',e=>{ if(!e.buttons) resizer.style.borderColor=''; });
})();