// ── Links ──
const CAP_LINK_SECTIONS=[
  // relType = clé technique (inchangée : vues sauvegardées) · humanLabel = libellé affiché (panneau, légende, arêtes)
  {key:'pcNode_pcNode',   relType:'PC NODE→PC NODE',              srcC:'#f97316',tgtC:'#f97316', humanLabel:'Sous-composant nœud'},
  {key:'pcBeh_pcBeh',     relType:'PC BEHAVIOR→PC BEHAVIOR',      srcC:'#eab308',tgtC:'#eab308', humanLabel:'Sous-composant comportemental'},
  {key:'pcRoot_pcAny',    relType:'PC Root→PC',                   srcC:'#a78bfa',tgtC:'#f97316', humanLabel:'Sous-composant physique (nature mixte)'},
  {key:'pcNode_pcBeh',    relType:'PC NODE→PC BEHAVIOR',          srcC:'#f97316',tgtC:'#eab308', humanLabel:'Déploie (comportement sur nœud)'},
  {key:'pcBeh_fn',        relType:'PC BEHAVIOR→PhysicalFunction', srcC:'#eab308',tgtC:'#4ade80', humanLabel:'Composant physique → fonction (réalise)'},
  {key:'fn_fn',           relType:'PhysicalFunction→PhysicalFunction',srcC:'#4ade80',tgtC:'#4ade80', humanLabel:'Sous-fonction physique'},
  {key:'lc_lc',           relType:'LogicalComponent→LogicalComponent',srcC:'#eab308',tgtC:'#eab308', humanLabel:'Sous-composant logique'},
  {key:'lf_lf',           relType:'LogicalFunction→LogicalFunction',srcC:'#facc15',tgtC:'#facc15', humanLabel:'Sous-fonction logique'},
  {key:'lc_lf',           relType:'LogicalComponent→LogicalFunction',srcC:'#eab308',tgtC:'#facc15', humanLabel:'Composant logique → fonction (réalise)'},
  {key:'sc_sc',           relType:'SystemComponent→SystemComponent',srcC:'#22c55e',tgtC:'#22c55e', humanLabel:'Sous-composant système'},
  {key:'sf_sf',           relType:'SystemFunction→SystemFunction', srcC:'#4ade80',tgtC:'#4ade80', humanLabel:'Sous-fonction système'},
  {key:'sc_sf',           relType:'SystemComponent→SystemFunction',srcC:'#22c55e',tgtC:'#4ade80', humanLabel:'Système / acteur → fonction (réalise)'},
  {key:'oa_oa',           relType:'OperationalActivity→OperationalActivity',srcC:'#3b82f6',tgtC:'#3b82f6', humanLabel:'Sous-activité opérationnelle'},
  {key:'entity_oa',       relType:'Entity→OperationalActivity',   srcC:'#60a5fa',tgtC:'#3b82f6', humanLabel:'Entité → activité (réalise)'},
  {key:'cap_comp',        relType:'Capability→SystemComponent',   srcC:'#22c55e',tgtC:'#22c55e', humanLabel:'Capacité → système / acteur impliqué'},
  {key:'lcap_lcomp',      relType:'CapabilityRealization→LogicalComponent',srcC:'#eab308',tgtC:'#eab308', humanLabel:'Réalisation de capacité → composant logique impliqué'},
  {key:'pcap_pcomp',      relType:'CapabilityRealization→PhysicalComponent',srcC:'#f97316',tgtC:'#f97316', humanLabel:'Réalisation de capacité → composant physique impliqué'},
  {key:'ocap_entity',     relType:'OperationalCapability→Entity', srcC:'#3b82f6',tgtC:'#60a5fa', humanLabel:'Capacité opérationnelle → entité impliquée'},
  {key:'mission_comp',    relType:'Mission→SystemComponent',      srcC:'#16a34a',tgtC:'#22c55e', humanLabel:'Mission → système / acteur impliqué'},
  {key:'mission_cap',     relType:'Mission→Capability',           srcC:'#16a34a',tgtC:'#22c55e', humanLabel:'Mission → capacité exploitée'},
];

/** Extrait et résout toutes les relations Capella depuis le XML :
 * décompositions PC/LC/SC/OA, allocations fonctionnelles, capacités.
 * Retourne un objet {key → [{src:{name,id,type}, tgt:{name,id,type}}]}.
 */
function capComputeLinks(){
  if(!cap_xmlDoc) return {};
  const allNodes=[...cap_xmlDoc.getElementsByTagName('*')];
  const xmap={}; allNodes.forEach(el=>{const i=capXId(el);if(i)xmap[i]=el;});
  /** Résout une référence XML (#id) vers l'élément Capella correspondant.
   * @param {string} ref - Référence brute
   * @returns {Element|null} Élément XML ciblé
   */
  function res(ref){return ref?xmap[ref.replace(/^#/,'')]:null;}
  const N=n=>n||'—';
  // Helper: build a {name, id} object for an XML element
  const E=el=>({name:N(capXName(el)), id:capXId(el)});
  const links={}; CAP_LINK_SECTIONS.forEach(sec=>links[sec.key]=[]);

  // PC containment via Part
  for(const el of allNodes){
    if(capTName(el)!=='PhysicalComponent') continue;
    const srcN=el.getAttribute('nature')||'';
    for(const child of el.children){
      if(capTName(child)!=='Part') continue;
      const at=child.getAttribute('abstractType')||''; const tgtEl=res(at); if(!tgtEl) continue;
      const tgtN=tgtEl.getAttribute('nature')||'';
      const entry={src:E(el), tgt:E(tgtEl)};
      if(srcN==='NODE'&&tgtN==='NODE') links.pcNode_pcNode.push(entry);
      else if(srcN==='BEHAVIOR'&&tgtN==='BEHAVIOR') links.pcBeh_pcBeh.push(entry);
      else links.pcRoot_pcAny.push(entry);
    }
  }
  // NODE → BEHAVIOR via PartDeploymentLink
  for(const el of allNodes){
    if(capTName(el)!=='PhysicalComponent'||el.getAttribute('nature')!=='NODE') continue;
    for(const part of el.children){
      if(capTName(part)!=='Part') continue;
      for(const pdl of part.children){
        if(capTName(pdl)!=='PartDeploymentLink') continue;
        const de=pdl.getAttribute('deployedElement')||''; const deEl=res(de);
        if(deEl){
          const at=deEl.getAttribute('abstractType')||''; const behEl=res(at);
          links.pcNode_pcBeh.push({src:E(el), tgt:behEl?E(behEl):{name:de,id:de}});
        }
      }
    }
  }
  // ComponentFunctionalAllocation
  for(const el of allNodes){
    if(capTName(el)!=='ComponentFunctionalAllocation') continue;
    const srcEl=res(el.getAttribute('sourceElement')||''); const tgtEl=res(el.getAttribute('targetElement')||'');
    if(!srcEl||!tgtEl) continue;
    const st=capTName(srcEl); const tt=capTName(tgtEl);
    if(st==='PhysicalComponent'&&tt==='PhysicalFunction') links.pcBeh_fn.push({src:E(srcEl),tgt:E(tgtEl)});
    else if(st==='LogicalComponent'&&tt==='LogicalFunction') links.lc_lf.push({src:E(srcEl),tgt:E(tgtEl)});
    else if(st==='SystemComponent'&&tt==='SystemFunction') links.sc_sf.push({src:E(srcEl),tgt:E(tgtEl)});
    else if((st==='Entity'||st==='OperationalActor')&&tt==='OperationalActivity') links.entity_oa.push({src:E(srcEl),tgt:E(tgtEl)});
  }
  // Containment hierarchies
  /** Collecte les couples parent/enfant d'un type donné dans le XML Capella et les ajoute
   * au tableau de liens fourni (utilisé pour matérialiser les relations de containment).
   * @param {string} pt - Type du parent
   * @param {string} ct - Type de l'enfant
   * @param {object[]} arr - Tableau de liens à compléter
   */
  function parentChild(pt,ct,arr){
    for(const el of allNodes){
      if(capTName(el)!==pt) continue;
      for(const c of el.children){
        if(capTName(c)===ct) arr.push({src:E(el),tgt:E(c)});
      }
    }
  }
  parentChild('PhysicalFunction','PhysicalFunction',links.fn_fn);
  parentChild('LogicalFunction','LogicalFunction',links.lf_lf);
  parentChild('SystemFunction','SystemFunction',links.sf_sf);
  parentChild('OperationalActivity','OperationalActivity',links.oa_oa);
  parentChild('LogicalComponent','LogicalComponent',links.lc_lc);
  parentChild('SystemComponent','SystemComponent',links.sc_sc);
  // ActivityAllocation, CapabilityInvolvement, CapabilityRealizationInvolvement
  for(const el of allNodes){
    if(capTName(el)==='ActivityAllocation'){
      const srcEl=res(el.getAttribute('sourceElement')||el.getAttribute('source')||'');
      const tgtEl=res(el.getAttribute('targetElement')||el.getAttribute('activity')||'');
      if(srcEl&&tgtEl) links.entity_oa.push({src:E(srcEl),tgt:E(tgtEl)});
    }
    if(capTName(el)==='CapabilityInvolvement'){
      const cap=el.parentElement; let invEl=res(el.getAttribute('involved')||''); if(invEl&&capTName(invEl)==='Part') invEl=res(invEl.getAttribute('abstractType')||'')||invEl;
      if(cap&&invEl) links.cap_comp.push({src:E(cap),tgt:E(invEl)});
    }
    const invOf=x=>{ let v=res(x.getAttribute('involved')||''); if(v&&capTName(v)==='Part') v=res(v.getAttribute('abstractType')||'')||v; return v; };
    if(capTName(el)==='CapabilityRealizationInvolvement'){
      const cap=el.parentElement; const invEl=invOf(el);
      if(cap&&invEl&&capTName(invEl)==='LogicalComponent') links.lcap_lcomp.push({src:E(cap),tgt:E(invEl)});
      else if(cap&&invEl&&capTName(invEl)==='PhysicalComponent') links.pcap_pcomp.push({src:E(cap),tgt:E(invEl)});
    }
    if(capTName(el)==='EntityOperationalCapabilityInvolvement'){
      const cap=el.parentElement, invEl=invOf(el); if(cap&&invEl) links.ocap_entity.push({src:E(cap),tgt:E(invEl)});
    }
    if(capTName(el)==='MissionInvolvement'){
      const m=el.parentElement, invEl=invOf(el); if(m&&invEl) links.mission_comp.push({src:E(m),tgt:E(invEl)});
    }
    if(capTName(el)==='CapabilityExploitation'){
      const m=el.parentElement, c=res(el.getAttribute('capability')||''); if(m&&c) links.mission_cap.push({src:E(m),tgt:E(c)});
    }
  }
  return links;
}

/** Rend la vue Liens : tableau des relations Capella groupées par type. */
function capRenderLinks(){
  if(!capLinksData) capLinksData=capComputeLinks();
  const container=document.getElementById('cap-view-links'); if(!container) return;
  // Libellés lisibles (humanLabel, comme dans la Relation Map) ; relations absentes du modèle masquées
  const present=CAP_LINK_SECTIONS.filter(s=>(capLinksData[s.key]||[]).length);
  if(capLinksFilter!=='all'&&!present.some(s=>s.key===capLinksFilter)) capLinksFilter='all';
  const total=present.reduce((n,s)=>n+capLinksData[s.key].length,0);
  const allBtn=`<button class="cap-lf-btn${capLinksFilter==='all'?' active':''}" data-lf="all">Toutes (${total})</button>`;
  const filterBtns=present.map(s=>`<button class="cap-lf-btn${capLinksFilter===s.key?' active':''}" data-lf="${s.key}" title="${capEsc(s.relType||s.key)}" style="${capLinksFilter===s.key?`border-color:${s.srcC};`:''}"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.srcC};margin-right:5px"></i>${capEsc(s.humanLabel||s.relType||s.key)} (${capLinksData[s.key].length})</button>`).join('');
  let html=`<div class="cap-lf-bar" style="flex-wrap:wrap">${allBtn}${filterBtns}</div>`;
  for(const sec of CAP_LINK_SECTIONS){
    if(capLinksFilter!=='all'&&capLinksFilter!==sec.key) continue;
    const rows=capLinksData[sec.key]||[]; if(!rows.length) continue;
    html+=`<div class="cap-link-section"><div class="cap-link-hdr">
      <b style="font-size:13px;color:var(--c-text);margin-right:8px">${capEsc(sec.humanLabel||sec.relType||sec.key)}</b>
      <span class="cap-link-type" style="color:${sec.srcC};background:${sec.srcC}22">${capEsc((sec.relType||sec.key).split('→')[0]||'')}</span>
      <span style="color:var(--c-dim)">→</span>
      <span class="cap-link-type" style="color:${sec.tgtC};background:${sec.tgtC}22">${capEsc(((sec.relType||sec.key).split('→')[1])||'')}</span>
      <span style="margin-left:auto;font-size:11px;color:var(--c-dim);font-family:monospace;">${rows.length}</span>
    </div>
    <table class="cap-link-table"><thead><tr><th>Source</th><th>ID source</th><th></th><th>Cible</th><th>ID cible</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>
      <td style="color:${sec.srcC};font-weight:600;font-size:12px;">${capEsc(r.src.name)}</td>
      <td style="font-family:monospace;font-size:10px;color:var(--c-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${capEsc(r.src.id||'')}">${capEsc((r.src.id||'').slice(0,20))}${(r.src.id||'').length>20?'…':''}</td>
      <td style="color:var(--c-dim);text-align:center;padding:0 6px;">→</td>
      <td style="color:${sec.tgtC};font-weight:600;font-size:12px;">${capEsc(r.tgt.name)}</td>
      <td style="font-family:monospace;font-size:10px;color:var(--c-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${capEsc(r.tgt.id||'')}">${capEsc((r.tgt.id||'').slice(0,20))}${(r.tgt.id||'').length>20?'…':''}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }
  container.innerHTML=html||'<div style="color:var(--c-dim);padding:40px;text-align:center">Aucun lien.</div>';
  container.querySelectorAll('.cap-lf-btn').forEach(btn=>btn.addEventListener('click',()=>{capLinksFilter=btn.dataset.lf;capRenderLinks();}));
}