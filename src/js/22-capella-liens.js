// ── Links ──
const CAP_LINK_SECTIONS=[
  // relType = clé technique (inchangée : vues sauvegardées) · humanLabel = libellé affiché (panneau, légende, arêtes)
  {key:'pcNode_pcNode',   relType:'PC NODE→PC NODE',              srcC:'#f97316',tgtC:'#f97316', humanLabel:_L('Sous-composant nœud'), grp:'deco'},
  {key:'pcBeh_pcBeh',     relType:'PC BEHAVIOR→PC BEHAVIOR',      srcC:'#eab308',tgtC:'#eab308', humanLabel:_L('Sous-composant comportemental'), grp:'deco'},
  {key:'pcRoot_pcAny',    relType:'PC Root→PC',                   srcC:'#a78bfa',tgtC:'#f97316', humanLabel:_L('Sous-composant physique (nature mixte)'), grp:'deco'},
  {key:'pcNode_pcBeh',    relType:'PC NODE→PC BEHAVIOR',          srcC:'#f97316',tgtC:'#eab308', humanLabel:_L('Déploie (comportement sur nœud)'), grp:'alloc'},
  {key:'pcBeh_fn',        relType:'PC BEHAVIOR→PhysicalFunction', srcC:'#eab308',tgtC:'#4ade80', humanLabel:_L('Composant physique → fonction (réalise)'), grp:'alloc'},
  {key:'fn_fn',           relType:'PhysicalFunction→PhysicalFunction',srcC:'#4ade80',tgtC:'#4ade80', humanLabel:_L('Sous-fonction physique'), grp:'deco'},
  {key:'lc_lc',           relType:'LogicalComponent→LogicalComponent',srcC:'#eab308',tgtC:'#eab308', humanLabel:_L('Sous-composant logique'), grp:'deco'},
  {key:'lf_lf',           relType:'LogicalFunction→LogicalFunction',srcC:'#facc15',tgtC:'#facc15', humanLabel:_L('Sous-fonction logique'), grp:'deco'},
  {key:'lc_lf',           relType:'LogicalComponent→LogicalFunction',srcC:'#eab308',tgtC:'#facc15', humanLabel:_L('Composant logique → fonction (réalise)'), grp:'alloc'},
  {key:'sc_sc',           relType:'SystemComponent→SystemComponent',srcC:'#22c55e',tgtC:'#22c55e', humanLabel:_L('Sous-composant système'), grp:'deco'},
  {key:'sf_sf',           relType:'SystemFunction→SystemFunction', srcC:'#4ade80',tgtC:'#4ade80', humanLabel:_L('Sous-fonction système'), grp:'deco'},
  {key:'sc_sf',           relType:'SystemComponent→SystemFunction',srcC:'#22c55e',tgtC:'#4ade80', humanLabel:_L('Système / acteur → fonction (réalise)'), grp:'alloc'},
  {key:'oa_oa',           relType:'OperationalActivity→OperationalActivity',srcC:'#3b82f6',tgtC:'#3b82f6', humanLabel:_L('Sous-activité opérationnelle'), grp:'deco'},
  {key:'entity_oa',       relType:'Entity→OperationalActivity',   srcC:'#60a5fa',tgtC:'#3b82f6', humanLabel:_L('Entité → activité (réalise)'), grp:'alloc'},
  {key:'cap_comp',        relType:'Capability→SystemComponent',   srcC:'#22c55e',tgtC:'#22c55e', humanLabel:_L('Capacité → système / acteur impliqué'), grp:'cap'},
  {key:'lcap_lcomp',      relType:'CapabilityRealization→LogicalComponent',srcC:'#eab308',tgtC:'#eab308', humanLabel:_L('Réalisation de capacité → composant logique impliqué'), grp:'cap'},
  {key:'pcap_pcomp',      relType:'CapabilityRealization→PhysicalComponent',srcC:'#f97316',tgtC:'#f97316', humanLabel:_L('Réalisation de capacité → composant physique impliqué'), grp:'cap'},
  {key:'ocap_entity',     relType:'OperationalCapability→Entity', srcC:'#3b82f6',tgtC:'#60a5fa', humanLabel:_L('Capacité opérationnelle → entité impliquée'), grp:'cap'},
  {key:'mission_comp',    relType:'Mission→SystemComponent',      srcC:'#16a34a',tgtC:'#22c55e', humanLabel:_L('Mission → système / acteur impliqué'), grp:'cap'},
  {key:'mission_cap',     relType:'Mission→Capability',           srcC:'#16a34a',tgtC:'#22c55e', humanLabel:_L('Mission → capacité exploitée'), grp:'cap'},
  // Relations ajoutées (échanges, réalisations inter-couches, allocations d'échanges et de ports, chaînes)
  {key:'fe_fn',     relType:'FunctionalExchange: Function→Function', srcT:_L('Function'), tgtT:_L('Function'), via:'FunctionalExchange', srcC:'#4ade80',tgtC:'#4ade80', humanLabel:_L('Échange fonctionnel (fonction → fonction)'), grp:'exch'},
  {key:'ce_comp',   relType:'ComponentExchange: Component→Component', srcT:'Component', tgtT:'Component', via:'ComponentExchange', srcC:'#0ea5e9',tgtC:'#0ea5e9', humanLabel:_L('Échange de composants (composant → composant)'), grp:'exch'},
  {key:'pl_pc',     relType:'PhysicalLink: PhysicalComponent→PhysicalComponent', srcT:'PhysicalComponent', tgtT:'PhysicalComponent', via:'PhysicalLink', srcC:'#f97316',tgtC:'#f97316', humanLabel:_L('Lien physique (composant ↔ composant)'), grp:'exch'},
  {key:'ex_ei',     relType:'Exchange→ExchangeItem', srcC:'#4ade80',tgtC:'#c084fc', humanLabel:_L('Échange → élément échangé (Exchange Item)'), grp:'exch'},
  {key:'fn_real',   relType:'FunctionRealization: Function→Function', srcT:_L('Function'), tgtT:_L('Function'), srcC:'#a78bfa',tgtC:'#a78bfa', humanLabel:_L('Fonction → fonction réalisée (couche supérieure)'), grp:'real'},
  {key:'comp_real', relType:'ComponentRealization: Component→Component', srcT:'Component', tgtT:'Component', srcC:'#a78bfa',tgtC:'#a78bfa', humanLabel:_L('Composant → composant réalisé (couche supérieure)'), grp:'real'},
  {key:'fe_real',   relType:'FunctionalExchangeRealization: FunctionalExchange→FunctionalExchange', srcT:'FunctionalExchange', tgtT:'FunctionalExchange', srcC:'#a78bfa',tgtC:'#a78bfa', humanLabel:_L('Échange fonctionnel → échange réalisé (couche supérieure)'), grp:'real'},
  {key:'ce_fe',     relType:'ComponentExchange→FunctionalExchange', srcC:'#0ea5e9',tgtC:'#4ade80', humanLabel:_L('Échange de composants → échange fonctionnel alloué'), grp:'alloc'},
  {key:'pl_ce',     relType:'PhysicalLink→ComponentExchange', srcC:'#f97316',tgtC:'#0ea5e9', humanLabel:_L('Lien / chemin physique → échange de composants alloué'), grp:'alloc'},
  {key:'pp_cp',     relType:'PhysicalPort→ComponentPort', srcC:'#f97316',tgtC:'#0ea5e9', humanLabel:_L('Port physique → port de composant alloué'), grp:'alloc'},
  {key:'fc_fn',     relType:'FunctionalChain→Function', srcC:'#f472b6',tgtC:'#4ade80', humanLabel:_L('Chaîne fonctionnelle → fonction impliquée'), grp:'chain'},
  {key:'fc_fe',     relType:'FunctionalChain→FunctionalExchange', srcC:'#f472b6',tgtC:'#4ade80', humanLabel:_L('Chaîne fonctionnelle → échange impliqué'), grp:'chain'},
  {key:'cap_fn',    relType:'Capability→Function', srcC:'#22c55e',tgtC:'#4ade80', humanLabel:_L('Capacité → fonction impliquée'), grp:'cap'},
  {key:'cap_fc',    relType:'Capability→FunctionalChain', srcC:'#22c55e',tgtC:'#f472b6', humanLabel:_L('Capacité → chaîne fonctionnelle impliquée'), grp:'cap'},
];
/** Groupes de relations affichés dans la barre de la vue 🔗 Liens (ordre d'affichage). */
const CAP_LINK_GROUPS=[
  {key:'deco',  label:_L('Décomposition')},
  {key:'alloc', label:'Allocation'},
  {key:'exch',  label:_L('Échanges')},
  {key:'real',  label:_L('Réalisation inter-couches')},
  {key:'cap',   label:_L('Capacités & missions')},
  {key:'chain', label:_L('Chaînes')},
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
  const E=el=>({name:N(capXName(el)), id:capXId(el), type:capTName(el)});
  const PORTS=new Set(['FunctionInputPort','FunctionOutputPort','ComponentPort','PhysicalPort']);
  /** Remonte d'un port (ou d'une Part) à l'élément propriétaire : fonction ou composant.
   * @param {Element|null} el - Élément XML (port, Part, fonction, composant)
   * @returns {Element|null} Fonction ou composant propriétaire
   */
  function own(el){
    if(el&&PORTS.has(capTName(el))) el=el.parentElement;
    if(el&&capTName(el)==='Part') el=res(el.getAttribute('abstractType')||'')||el;
    return el||null;
  }
  /** Résout une liste de références séparées par des espaces (« #a #b »).
   * @param {string} v - Valeur brute de l'attribut
   * @returns {Element[]} Éléments résolus
   */
  const resAll=v=>(v||'').trim().split(/\s+/).filter(Boolean).map(res).filter(Boolean);
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
  // Échanges, réalisations, allocations d'échanges et de ports, chaînes, implications de fonctions
  const SRC_TGT={FunctionRealization:'fn_real', ComponentRealization:'comp_real', FunctionalExchangeRealization:'fe_real',
    ComponentExchangeFunctionalExchangeAllocation:'ce_fe', ComponentExchangeAllocation:'pl_ce', ComponentPortAllocation:'pp_cp'};
  const INVOLVED={FunctionalChainInvolvementFunction:'fc_fn', FunctionalChainInvolvementLink:'fc_fe',
    AbstractFunctionAbstractCapabilityInvolvement:'cap_fn', FunctionalChainAbstractCapabilityInvolvement:'cap_fc'};
  for(const el of allNodes){
    const t=capTName(el);
    if(t==='FunctionalExchange'||t==='ComponentExchange'){
      const s=own(res(el.getAttribute('source')||'')), g=own(res(el.getAttribute('target')||''));
      if(s&&g) links[t==='FunctionalExchange'?'fe_fn':'ce_comp'].push({src:E(s),tgt:E(g),via:E(el)});
      resAll(el.getAttribute('exchangedItems')).forEach(ei=>links.ex_ei.push({src:E(el),tgt:E(ei)}));
    } else if(t==='PhysicalLink'){
      const ends=resAll(el.getAttribute('linkEnds')).map(own);
      if(ends.length===2&&ends[0]&&ends[1]) links.pl_pc.push({src:E(ends[0]),tgt:E(ends[1]),via:E(el)});
    } else if(SRC_TGT[t]){
      const s=res(el.getAttribute('sourceElement')||''), g=res(el.getAttribute('targetElement')||'');
      if(s&&g) links[SRC_TGT[t]].push({src:E(s),tgt:E(g)});
    } else if(INVOLVED[t]){
      const p=el.parentElement, v=own(res(el.getAttribute('involved')||''));
      if(p&&v) links[INVOLVED[t]].push({src:E(p),tgt:E(v)});
    }
  }
  return links;
}
