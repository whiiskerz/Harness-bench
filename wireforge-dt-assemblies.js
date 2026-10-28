import {deutschFamily,makePair,auditPair,pairSummary,housingPartNumber,parseHousing,familySpec} from './wireforge-dt-model.mjs';
/* WireForge DT Assembly Studio: no implied physical termination.
 * Side A is modeled from schematic endpoints; Side B is independently planned
 * and must be explicitly owner-confirmed using real housing/contact evidence.
 */
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
let selected='',filter='',showOnlyMissing=false;
function candidates(){
 return (S.parts||[]).filter(p=>deutschFamily({type:p.t,name:p.name})).map(p=>{
   const pins=T[p.t]?.pins||[];
   const pw={...p,type:p.t,pins:pins.map((t,i)=>({number:t.p,label:plabel(p,i)}))};
   return makePair(pw,S.wires,S.dtAssemblies?.[p.id]||{});
 }).filter(Boolean);
}
function selectedPair(){
 const all=candidates();
 return all.find(p=>String(p.partId)===String(selected))||all[0]||null;
}
function record(partId){
 S.dtAssemblies=S.dtAssemblies||{};
 return S.dtAssemblies[partId]||(S.dtAssemblies[partId]={key:'A',aHousing:'',bHousing:'',cavities:{}});
}
function saved(update=true){
 save();if(update)render();
}
function setField(partId,key,value){
 const row=record(partId);
 row[key]=String(value||'').trim().slice(0,100);
 saved();
}
function setCavity(partId,index,key,value){
 const pair=candidates().find(p=>String(p.partId)===String(partId));if(!pair)return;
 const r=record(partId);r.cavities=r.cavities||{};
 const item=r.cavities[index]||{};
 if(key==='aTerminationState'){
   if(value==='owner-confirmed'){
     const p=pair.cavities[index],hA=parseHousing(r.aHousing),hB=parseHousing(r.bHousing);
     if(!p.a.connected||!hA||!hB||!item.aContactPart?.trim()||!item.aDestination?.trim()||!item.aEvidence?.trim()){
       toast('Side A physical crimp needs both actual housings, contact PN, destination and inspection evidence before confirmation.');render();return;
     }
     if(auditPair({...pair,aHousing:r.aHousing,bHousing:r.bHousing}).some(x=>x.severity==='error')){
       toast('Resolve mating part mismatch before recording Side A as confirmed.');render();return;
     }
   }
   item.aTerminationState=value==='owner-confirmed'?'owner-confirmed':'planned';
 }else if(key==='state'){
   if(value==='owner-confirmed'){
     const housingA=parseHousing(r.aHousing),housingB=parseHousing(r.bHousing);
     const p=pair.cavities[index],destination=item.destination||'',contactPart=item.contactPart||'',evidence=item.evidence||'';
     if(!housingA||!housingB||!destination.trim()||!contactPart.trim()||!evidence.trim()){
       toast('To mark owner-confirmed, enter both actual housing part numbers, a mate destination, contact part, and observed evidence.');
       render();return;
     }
     if(auditPair({...pair,aHousing:r.aHousing,bHousing:r.bHousing}).some(x=>x.severity==='error')){
       toast('Resolve the mating-family and contact compatibility errors first.');render();return;
     }
   }
   item.state=value;
 }else if(key==='aSealConfirmed'){
   if(value==='true'&&(!item.aSealPart||!item.evidence)){
     toast('Record the Side A sealing plug part and evidence before confirming it installed.');render();return;
   }
   item.aSealConfirmed=value==='true';
 }else if(key==='awg')item.awg=value===''?'':Math.max(0,Math.min(24,Number(value)||0));
 else item[key]=String(value||'').trim().slice(0,key==='evidence'?600:200);
 r.cavities[index]=item;
 saved();
}
function planCurrent(){
 const p=selectedPair();if(!p)return;
 const r=record(p.partId),n=p.cavities.length;
 if(!r.aHousing&&!r.bHousing)toast('Suggested housings are examples. Check physical part numbers before entering them.');
 for(const row of p.cavities){
   if(!row.a.connected)continue;
   const entry=r.cavities[row.index]||{};
   if(!entry.state||entry.state==='unassigned')entry.state='planned';
   if(!entry.color)entry.color=row.a.color||'';
   if(!entry.awg)entry.awg=row.a.awg||'';
   if(!entry.destination)entry.destination='TBD · match '+row.a.wires.map(w=>w.sig).filter(Boolean).join(' / ').slice(0,160);
   r.cavities[row.index]=entry;
 }
 saved();
 toast('Created '+n+'-cavity plan; no physical terminations have been confirmed.');
}
function exportMatrix(){
 const all=candidates(),lines=[['Part','Connector','Family','Cavity index (unverified molded position)','Side A housing','Side A wire(s)','Side A color','Side A AWG','Side A physical state','Side A contact PN','Side A destination','Side A evidence','Side B housing','Side B state','Side B target','Side B color','Side B AWG','Side B contact PN','Side B seal PN','Owner evidence','Findings']];
 for(const p of all)for(const c of p.cavities){
   const findings=auditPair(p).filter(q=>q.cavity==null||q.cavity===c.index).map(q=>q.message).join('; ');
   lines.push([p.partId,p.partName,p.family,c.index+1,p.aHousing,c.a.wires.map(x=>x.sig).join(' | '),c.a.color,c.a.awg,c.a.terminationState,c.a.contactPart,c.a.destination,c.a.evidence,p.bHousing,c.b.state,c.b.destination,c.b.color,c.b.awg,c.b.contactPart,c.b.sealPart,c.b.evidence,findings]);
 }
 const text=lines.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='wireforge-deutsch-two-sided-termination-matrix.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 toast('Both-side termination matrix downloaded.');
}
function findings(){
 const a=[];
 for(const p of candidates())for(const q of auditPair(p)){
   a.push({severity:q.severity,category:'Deutsch mating assembly',message:p.partName+': '+q.message,partId:p.partId,cavity:q.cavity});
 }
 return a;
}
function render(){
 const root=$('t-dt');if(!root)return;
 const all=candidates(),total=all.length;
 const numCavities=all.reduce((s,p)=>s+p.count,0);
 const plan=all.reduce((s,p)=>s+pairSummary(p).plannedB,0);
 const confirmed=all.reduce((s,p)=>s+pairSummary(p).confirmedB,0);
 const paired=all.reduce((s,p)=>s+pairSummary(p).pairedTerminations,0);
 const problems=all.flatMap(x=>auditPair(x)).filter(x=>x.severity==='error').length;
 const list=all.filter(p=>{
   if(filter&&!String(p.partName+' '+p.family+' '+p.partId).toLowerCase().includes(filter))return false;
   return !showOnlyMissing||(!pairSummary(p).completeRecord);
 });
 const active=selectedPair();if(active)selected=String(active.partId);
 const asummary=pairSummary(active),issues=active?auditPair(active):[];
 const spec=active?familySpec(active.family):null;
 root.innerHTML='<div class="dt-pro-hero"><div><span class="dt-eyebrow">WIRE FORGE / CONNECTOR ENGINEERING</span><h2>Deutsch Assembly Studio</h2><p>Engineer both ends of each inline connection: matching housings, complementary pin/socket contacts, independent rear terminations, wedgelocks and physical verification records.</p><div class="dt-actions"><button class="btn primary" data-dta="render3d">View complete 3D pair</button><button class="btn" data-dta="export">Export both-side pin schedule</button><button class="btn" data-tab="lab">Open Validation Lab</button></div></div><div class="dt-pro-symbol" aria-hidden="true"><span>04</span><i></i><span>06</span><small>RECEPTACLE · PLUG</small></div></div>'+
 '<div class="dt-pro-kpis"><div><b>'+total+'</b><span>Deutsch assemblies</span></div><div><b>'+numCavities+'</b><span>Paired cavity positions</span></div><div><b>'+plan+'</b><span>Mate leads planned</span></div><div><b>'+confirmed+'</b><span>Verified mate tails</span></div><div><b>'+paired+'</b><span>Both sides signed off</span></div></div>'+
 '<div class="dt-note"><strong>Two physical halves, two independently documented terminations.</strong> WireForge can draw both housings and provisional mate-side pigtails, but a matched schematic net is <em>not</em> proof that both real halves are crimped or even installed. Suggested part numbers and cavity indices must be verified against TE manufacturer drawings.</div>'+
 '<div class="dt-pro-grid"><aside class="dt-list"><div class="dt-list-head"><h3>Connector library <small>'+total+' in project</small></h3><label class="dt-find"><span>Find assembly</span><input id="dtSearch" type="search" placeholder="DT6, CAN, GPO2…" value="'+escapeHtml(filter)+'"></label><label class="dt-toggle"><input type="checkbox" id="dtShowMissing" '+(showOnlyMissing?'checked':'')+'> Needs confirmation only</label></div><div class="dt-scroll">'+(list.map(p=>{const q=pairSummary(p),isActive=String(p.partId)===selected;return'<button class="dt-part '+(isActive?'active':'')+'" data-dta="select" data-id="'+p.partId+'"><span class="dt-part-top"><b>'+escapeHtml(p.partName)+'</b><small>'+escapeHtml(p.family)+' · '+p.count+'P</small></span><span class="dt-pair-chip">'+q.populatedA+' schematic / '+q.confirmedB+' confirmed mate</span><span class="dt-pair-progress"><i style="width:'+(q.populatedA?Math.round(q.confirmedB/q.populatedA*100):0)+'%"></i></span></button>'}).join('')||'<p class="dt-nothing">No assemblies match the filter.</p>')+'</div></aside>'+
 '<main class="dt-inspector">'+(active?renderActive(active,asummary,issues,spec):'<div class="dt-nothing">Add a Deutsch DT/DTM/DTP connector to begin building an assembly.</div>')+'</main></div>';
}
function renderActive(p,q,issues,spec){
 const front=p.sideA==='plug'?'socket':'pin',back=p.sideB==='plug'?'socket':'pin';
 const row=(c)=>{
  const b=c.b;
  return '<tr><th scope="row"><span class="dt-cavity">'+(c.index+1)+'</span></th>'+
   '<td><div class="dt-side-a"><b>'+escapeHtml(c.a.wires.map(x=>x.sig||'Wire '+x.id).join('; ')||'No schematic conductor')+'</b><small>'+(c.a.connected?escapeHtml((c.a.color||'Color TBD')+' · '+(c.a.awg||'AWG TBD')):'Unassigned on A')+'</small>'+
   (c.a.connected?'<select data-dt-index="'+c.index+'" data-dt-field="aTerminationState" aria-label="Side A physical termination cavity '+(c.index+1)+'"><option value="planned" '+(c.a.terminationState!=='owner-confirmed'?'selected':'')+'>A physical crimp unverified</option><option value="owner-confirmed" '+(c.a.terminationState==='owner-confirmed'?'selected':'')+'>A physical crimp confirmed</option></select><input data-dt-index="'+c.index+'" data-dt-field="aContactPart" aria-label="Side A contact part cavity '+(c.index+1)+'" value="'+escapeHtml(c.a.contactPart)+'" placeholder="Side A contact PN"><input data-dt-index="'+c.index+'" data-dt-field="aDestination" aria-label="Side A physical destination cavity '+(c.index+1)+'" value="'+escapeHtml(c.a.destination)+'" placeholder="Actual physical source / wire"><textarea rows="2" data-dt-index="'+c.index+'" data-dt-field="aEvidence" aria-label="Side A inspection evidence cavity '+(c.index+1)+'" placeholder="Crimp photo, inspection ID, continuity reading…">'+escapeHtml(c.a.evidence)+'</textarea>':'<input data-dt-index="'+c.index+'" data-dt-field="aSealPart" aria-label="Side A unused cavity seal part '+(c.index+1)+'" placeholder="Side A seal plug PN" value="'+escapeHtml(c.a.aSealPart)+'"><select data-dt-index="'+c.index+'" data-dt-field="aSealConfirmed" aria-label="Side A seal installation '+(c.index+1)+'"><option value="false" '+(!c.a.aSealConfirmed?'selected':'')+'>A seal unverified</option><option value="true" '+(c.a.aSealConfirmed?'selected':'')+'>A seal owner-confirmed</option></select>')+'</div></td>'+
   '<td><select aria-label="Mate-side state cavity '+(c.index+1)+'" data-dt-index="'+c.index+'" data-dt-field="state" class="dt-status '+b.state+'">'+
   [['planned','Planned lead'],['owner-confirmed','Owner-confirmed'],['unassigned','No assignment'],['sealed','Sealed (record plug)']].map(([val,label])=>'<option value="'+val+'" '+(b.state===val?'selected':'')+'>'+label+'</option>').join('')+'</select>'+
   '<input data-dt-index="'+c.index+'" data-dt-field="destination" aria-label="Mate destination cavity '+(c.index+1)+'" placeholder="Mate wire destination" value="'+escapeHtml(b.destination)+'"></td>'+
   '<td><input data-dt-index="'+c.index+'" data-dt-field="color" aria-label="Mate wire color cavity '+(c.index+1)+'" placeholder="RED" value="'+escapeHtml(b.color)+'"><input type="number" min="0" max="24" data-dt-index="'+c.index+'" data-dt-field="awg" aria-label="Mate AWG cavity '+(c.index+1)+'" placeholder="AWG" value="'+(b.awg||'')+'"></td>'+
   '<td><input data-dt-index="'+c.index+'" data-dt-field="contactPart" aria-label="Contact part number cavity '+(c.index+1)+'" placeholder="Contact PN" value="'+escapeHtml(b.contactPart)+'"><input data-dt-index="'+c.index+'" data-dt-field="sealPart" aria-label="Seal plug part number cavity '+(c.index+1)+'" placeholder="Seal plug PN if unused" value="'+escapeHtml(b.sealPart)+'"></td>'+
   '<td><textarea rows="2" data-dt-index="'+c.index+'" data-dt-field="evidence" aria-label="Owner evidence cavity '+(c.index+1)+'" placeholder="Photo ID, crimp inspection, continuity log…">'+escapeHtml(b.evidence)+'</textarea></td></tr>';
 };
 const title=p.partName;
 return '<div class="dt-inspector-head"><div><span class="dt-eyebrow">ASSEMBLY / '+escapeHtml(p.family)+' '+p.count+' POSITION</span><h3>'+escapeHtml(title)+'</h3><p>'+q.populatedA+' schematic-side wired cavities · '+q.plannedB+' mate leads planned · '+q.confirmedB+' owner-confirmed</p></div><div class="dt-inspector-actions"><button class="btn" data-dta="plan">Plan mates from drawing</button><button class="btn primary" data-dta="render3d">Preview A + B in 3D</button></div></div>'+
 '<div class="dt-key-select"><label>Polarization / insert key <select data-dt-key="key"><option value="A" '+(p.key==='A'?'selected':'')+'>A</option><option value="B" '+(p.key==='B'?'selected':'')+'>B</option><option value="C" '+(p.key==='C'?'selected':'')+'>C</option><option value="D" '+(p.key==='D'?'selected':'')+'>D</option></select></label><small>8- and 12-way keys must match both physical halves; smaller connectors may not use lettered keys.</small></div><div class="dt-assembly-halves"><article><div class="dt-half-top"><span>HALF A · SCHEMATIC SIDE</span><b>'+escapeHtml(p.sideA.toUpperCase())+'</b></div><div class="dt-case"><span>'+p.family+'</span><strong>'+p.count+' WAY</strong><small>'+escapeHtml(front.toUpperCase())+' CONTACTS</small></div><label>Actual housing part number<input data-dt-key="aHousing" placeholder="e.g. '+escapeHtml(p.suggestedA)+'" value="'+escapeHtml(p.aHousing)+'"></label><small class="dt-suggestion">Reference example: '+escapeHtml(p.suggestedA)+' · enter exact installed PN</small></article>'+
 '<div class="dt-mate-coupler"><div class="dt-coupler-lines">↔</div><strong>MATe</strong><small>matching family<br>cavity count<br>keying · contacts</small></div>'+
 '<article><div class="dt-half-top"><span>HALF B · COMPANION</span><b>'+escapeHtml(p.sideB.toUpperCase())+'</b></div><div class="dt-case mate"><span>'+p.family+'</span><strong>'+p.count+' WAY</strong><small>'+escapeHtml(back.toUpperCase())+' CONTACTS</small></div><label>Actual mating housing part number<input data-dt-key="bHousing" placeholder="e.g. '+escapeHtml(p.suggestedB)+'" value="'+escapeHtml(p.bHousing)+'"></label><small class="dt-suggestion">Reference example: '+escapeHtml(p.suggestedB)+' · confirm keying, boots and seals</small></article></div>'+
 '<div class="dt-compat"><div><h4>Mating & contact check</h4><p>'+escapeHtml(p.family)+' nominal wire range '+spec.min+'–'+spec.max+' AWG · contacts size '+spec.contacts+' (illustrative catalog range, not application sign-off)</p></div><div class="dt-compat-lines">'+(issues.slice(0,12).map(issue=>'<p class="dt-audit '+issue.severity+'"><span>'+(issue.severity==='error'?'×':issue.severity==='review'?'!':'?')+'</span>'+escapeHtml(issue.message)+'</p>').join('')||'<p class="dt-audit ok">No modeled issues found. Physical verification still required.</p>')+'</div></div>'+
 '<div class="dt-matrix-head"><div><h4>Two-sided cavity termination matrix</h4><p>Document housing PN, contact PN, physical wire destination and crimp/continuity evidence on BOTH A and B before declaring a position complete. A drawn wire is not a confirmed crimp.</p></div><button class="btn" data-dta="export">Export CSV</button></div>'+
 '<div class="dt-table-scroll"><table class="dt-table"><thead><tr><th>CAVITY*</th><th>HALF A / SCHEMATIC</th><th>HALF B / TERMINATION</th><th>INSULATION / AWG</th><th>CONTACT / PLUG</th><th>EVIDENCE</th></tr></thead><tbody>'+p.cavities.map(row).join('')+'</tbody></table></div>'+
 '<div class="dt-footnote">*Cavity numbers shown here are diagram indices. The real front and rear molded numbering can be mirrored. Do not finalize a mating-side termination without verifying manufacturer cavity orientation, contact size/part and wire seal specifications.</div>';
}
function setup(){
 const root=$('t-dt');if(!root)return;
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-dt-open]');if(!button)return;
  selected=String(button.dataset.dtOpen);showTab('dt');
 });
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-dta]');if(!b)return;
  const act=b.dataset.dta;
  if(act==='select'){selected=b.dataset.id;render()}
  if(act==='export')exportMatrix();
  if(act==='plan')planCurrent();
  if(act==='render3d')typeof wf3dOpen==='function'?wf3dOpen():toast('Open Harness Designer to render the 3D assembly.');
 });
 root.addEventListener('change',e=>{
  const field=e.target;
  if(field.id==='dtShowMissing'){showOnlyMissing=field.checked;render();return}
  const p=selectedPair();if(!p)return;
  if(field.dataset.dtKey)setField(p.partId,field.dataset.dtKey,field.value);
  if(field.dataset.dtField)setCavity(p.partId,+field.dataset.dtIndex,field.dataset.dtField,field.value);
 });
 root.addEventListener('input',e=>{
  if(e.target.id!=='dtSearch')return;
  filter=e.target.value.toLowerCase();
  const pos=e.target.selectionStart;render();const el=$('dtSearch');
  el?.focus();try{el?.setSelectionRange(pos,pos)}catch(_){}
 });
 const query=new URLSearchParams(location.search).get('dt');
 if(query&&S.parts.some(p=>String(p.id)===query&&deutschFamily({type:p.t,name:p.name}))){selected=query;showTab('dt')}
}
window.WFDT={render,candidates,selectedPair,findings,pairSummary,planCurrent,exportMatrix};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
