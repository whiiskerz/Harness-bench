/* WireForge Workspace — named browser projects, recovery and validation.
 * This file runs after index.html's classic application script. It intentionally
 * reuses the existing S / T / save / part / showTab / compatIssues model.
 * Local-only data: no remote sync, account, payment or electrical certification.
 */
(()=>{
'use strict';
const PREFIX='wireforge-vault-v1:', INDEX='wireforge-vault-index-v1';
const MAX_SAVES=16, MAX_IMPORT=8*1024*1024;
const $=id=>document.getElementById(id);
const escText=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const validId=id=>typeof id==='string'&&/^wf-[a-z0-9-]{8,65}$/i.test(id);
const showMessage=(message,type='ok')=>{
 const el=$('wfProToast');if(el){el.textContent=message;el.dataset.kind=type;el.hidden=false;clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>el.hidden=true,4300)}
 if(typeof toast==='function')toast(message);
};
function snapshotList(){
 try{const a=JSON.parse(localStorage.getItem(INDEX)||'[]');return Array.isArray(a)?a.filter(x=>x&&validId(x.id)&&typeof x.name==='string').slice(0,MAX_SAVES):[]}catch{return []}
}
function setList(rows){localStorage.setItem(INDEX,JSON.stringify(rows))}
function metaName(){return String(S.wfProjectName||S.projectName||'E90 LS Swap Harness').trim().slice(0,80)||'Untitled Harness'}
function projectId(){return S.wfVaultId&&validId(S.wfVaultId)?S.wfVaultId:null}
function currentMeta(){return snapshotList().find(x=>x.id===projectId())}
function prettyDate(value){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleString():'Unknown date'}
function saveStatus(ok=true){
 const status=$('wfSaveStatus');
 if(!status)return;
 const item=currentMeta();
 status.dataset.state=ok?'saved':'error';
 status.textContent=ok?(item?'Autosave on · '+item.name:'Autosave on · Unsaved named project'):'Browser storage unavailable — export a backup';
 status.title=ok?'Working changes are stored automatically. Named vault snapshots update only when you click Save to Browser.':'Browser storage write failed. Download a project backup.';
}
function readSnapshot(id){
 if(!validId(id))throw new Error('Invalid project identifier');
 const text=localStorage.getItem(PREFIX+id);
 if(!text)throw new Error('Saved project not found. It may have been cleared in browser storage.');
 const pack=JSON.parse(text);
 if(pack?.schema!=='wireforge.saved-project.v1'||!pack.project)throw new Error('Saved project has an unsupported structure');
 const report=validateBackupObject(pack.project);
 if(report.errors.length)throw new Error('This save needs repair: '+report.errors.slice(0,2).join('; '));
 return pack;
}
function nameClean(n){return String(n||'').trim().replace(/\s+/g,' ').slice(0,80)}
function newId(){
 let id;do{id='wf-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)))}while(snapshotList().some(x=>x.id===id));
 return id;
}
function saveNamed({asNew=false,name}={}){
 try{
  const current=projectId(),rows=snapshotList();
  const present=rows.find(x=>x.id===current);
  const id=(!asNew&&present)?current:newId();
  if(!present&&rows.length>=MAX_SAVES)throw new Error('Project Vault is full ('+MAX_SAVES+' saves). Export/delete an old project first.');
  const label=nameClean(name||(asNew?'':present?.name)||metaName());
  if(!label)throw new Error('Enter a project name');
  const now=new Date().toISOString();
  const pack={schema:'wireforge.saved-project.v1',version:1,createdAt:(!asNew&&present?.createdAt)||now,updatedAt:now,name:label,project:null};
  // Save named snapshots without setting S.wfVaultId until storage accepts the write.
  const project=clone(S);project.wfProjectName=label;project.wfVaultId=id;
  pack.project=project;
  const data=JSON.stringify(pack);
  localStorage.setItem(PREFIX+id,data);
  const m={id,name:label,createdAt:pack.createdAt,updatedAt:now,parts:project.parts?.length||0,wires:project.wires?.length||0,bytes:data.length};
  const list=[m,...rows.filter(x=>x.id!==id)];
  try{setList(list)}catch(e){if(!present)localStorage.removeItem(PREFIX+id);throw e}
  S.wfProjectName=label;S.wfVaultId=id;save();
  saveStatus();showMessage('Saved to this browser: '+label);
  if(S.tab==='vault')renderVault();
  if(S.tab==='project')rProject();
  return m;
 }catch(e){showMessage('Save failed: '+(e?.message||'Browser storage is blocked or full')+'. Download a backup.', 'error');return null}
}
function loadNamed(id){
 try{
  const pack=readSnapshot(id);
  if(!confirm('Load "'+pack.name+'"? This replaces your active working drawing. Save your current project first.'))return false;
  // Do not overwrite active S before the saved payload passes validation.
  const project=clone(pack.project);
  for(const p of project.parts)if(!T[p.t])makeCustom(p.t);
  S=Object.assign(S,project,{wfVaultId:id,wfProjectName:pack.name,tab:'project'});
  S.nid=Math.max(Number(S.nid)||0,...S.parts.map(p=>+p.id||0),...S.wires.map(w=>+w.id||0))+1;
  selection=null;pending=null;
  save();showTab('project');saveStatus();
  showMessage('Loaded '+pack.name);
  return true;
 }catch(e){showMessage('Cannot load project: '+(e?.message||'Unknown error'),'error');return false}
}
function download(name,content,type='application/json'){
 const blob=new Blob([content],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function fileName(n){return nameClean(n).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,55)||'harness'}
function downloadNamed(id){
 try{const pack=readSnapshot(id);download('wireforge-'+fileName(pack.name)+'-project.json',JSON.stringify(pack,null,2));showMessage('Project file exported')}catch(e){showMessage(e.message,'error')}
}
function exportCurrent(){download('wireforge-'+fileName(metaName())+'-backup.json',JSON.stringify(clone(S),null,2));showMessage('Portable JSON backup downloaded')}
function removeNamed(id){
 const m=snapshotList().find(x=>x.id===id);if(!m)return;
 if(!confirm('Delete "'+m.name+'" from this browser? This cannot be undone. Export it first if you need a copy.'))return;
 try{const next=snapshotList().filter(x=>x.id!==id);setList(next);localStorage.removeItem(PREFIX+id);if(S.wfVaultId===id){S.wfVaultId=null;save()}saveStatus();renderVault();showMessage('Removed browser save '+m.name)}catch(e){showMessage('Could not delete project: '+e.message,'error')}
}
function renameNamed(id){
 const m=snapshotList().find(x=>x.id===id);if(!m)return;
 const response=prompt('Rename saved project',m.name);if(response==null)return;const name=nameClean(response);if(!name){showMessage('Project name cannot be empty','error');return}
 try{
  const pack=readSnapshot(id);pack.name=name;pack.project.wfProjectName=name;
  localStorage.setItem(PREFIX+id,JSON.stringify(pack));
  setList(snapshotList().map(x=>x.id===id?{...x,name}:x));
  if(S.wfVaultId===id){S.wfProjectName=name;save()}
  saveStatus();renderVault();showMessage('Project renamed');
 }catch(e){showMessage('Rename failed: '+e.message,'error')}
}
function startBlank(){
 if(!confirm('Start a blank harness? This replaces the active drawing. Save the current project in Project Vault first.'))return;
 const keep=typeof e90ProjectStarter==='function'?e90ProjectStarter():{};
 S=Object.assign({},keep,{parts:[],wires:[],zones:[],looms:[],circuitBook:[],examples:false,view:null,tab:'draw',wfProjectName:'Untitled Harness',wfVaultId:null,pro:null,wfBranches:[],scale:4,strip:.5,def:{awg:20,color:'BLK'}});
 selection=null;pending=null;
 save();showTab('draw');saveStatus();showMessage('Blank harness ready. Add a connector to begin.');
}
async function importFile(file){
 if(!file)return;
 if(file.size>MAX_IMPORT){showMessage('Import too large. Limit: 8 MB.','error');return}
 try{
  const raw=JSON.parse(await file.text());
  const payload=raw?.schema==='wireforge.saved-project.v1'?raw.project:raw;
  const check=validateBackupObject(payload);
  if(check.errors.length)throw new Error(check.errors.slice(0,3).join('; '));
  if(!confirm('Open this project file and replace the current drawing? Save your work first.'))return;
  const object=clone(payload);
  object.wfVaultId=null;object.wfProjectName=nameClean(raw.name||object.wfProjectName||'Imported Harness');
  S=Object.assign(S,object,{tab:'project'});
  S.nid=Math.max(Number(S.nid)||0,...S.parts.map(p=>+p.id||0),...S.wires.map(w=>+w.id||0))+1;
  selection=null;pending=null;
  save();showTab('project');saveStatus();showMessage('Imported project. Choose Save to Browser to keep a named copy.');
 }catch(e){showMessage('Import rejected: '+(e?.message||'Invalid JSON project'),'error')}
}
function projectCard(m){
 const active=m.id===projectId();
 return '<article class="wf-pro-project '+(active?'is-active':'')+'"><div class="wf-pro-project-top"><div><b>'+escText(m.name)+'</b><small>'+escText(prettyDate(m.updatedAt))+'</small></div><span class="wf-pro-tag '+(active?'active':'')+'">'+(active?'Active':'Saved')+'</span></div>'+
 '<div class="wf-pro-project-meta"><span>'+m.parts+' components</span><span>'+m.wires+' wires</span><span>Browser only</span></div>'+
 '<div class="wf-pro-buttons"><button data-wfv="load" data-id="'+m.id+'">Open</button><button data-wfv="export" data-id="'+m.id+'">Download</button><button data-wfv="rename" data-id="'+m.id+'">Rename</button><button data-wfv="remove" data-id="'+m.id+'">Delete</button></div></article>';
}
function renderVault(){
 const root=$('t-vault');if(!root)return;const rows=snapshotList(),name=metaName();
 root.innerHTML='<div class="wf-pro-hero"><div class="wf-eyebrow">WIRE FORGE / PROJECT MANAGEMENT</div><h2>Project Vault</h2><p>Keep multiple harness designs in this browser. Name versions, export portable backups and reopen previous builds without losing your current wiring editor tools.</p>'+
 '<div class="wf-pro-hero-actions"><button class="btn primary" data-wfv="quick">Save active project</button><button class="btn" data-wfv="as">Save a new copy</button><button class="btn" data-wfv="exportCurrent">Download active backup</button></div></div>'+
 '<div class="wf-pro-notice"><b>Where your work lives</b><p>WireForge auto-saves your active work in this browser. The named projects below are separate snapshots and update only when you click Save to Browser. Clearing site data, changing browsers or private mode can remove both. Download JSON backups for long-term storage.</p></div>'+
 '<div class="wf-pro-vault-top"><div><h3>Saved projects <span class="wf-pro-counter">'+rows.length+' / '+MAX_SAVES+'</span></h3><p class="muted">Active project: '+escText(name)+'</p></div><div class="wf-pro-vault-tools"><button class="btn" data-wfv="import">Import JSON</button><button class="btn" data-wfv="blank">New blank project</button></div></div>'+
 '<div class="wf-pro-project-grid">'+(rows.map(projectCard).join('')||'<div class="wf-pro-empty"><b>Your project library is empty</b><p>Use “Save active project” to create a named recovery point. You can come back to it anytime on this device.</p><button class="btn primary" data-wfv="quick">Save your first project</button></div>')+'</div>'+
 '<div class="wf-pro-footnote">For team sharing, download a project file and send it securely. Browser Vault is local storage, not encrypted cloud sync, version control, or an account subscription.</div>';
}
function labFindings(){
 const rows=[],push=(severity,category,message,wireId=null,partId=null)=>rows.push({severity,category,message,wireId,partId});
 const byId=new Map(S.parts.map(p=>[String(p.id),p]));
 const seen=new Map(),wids=new Set(),usedParts=new Set();
 for(const w of S.wires){
  const id=w.id;
  if(wids.has(String(id)))push('error','Structure','Duplicate wire ID '+id,id);
  wids.add(String(id));
  for(const [side,e] of [['From',w.a],['To',w.b]]){
   const p=e&&byId.get(String(e.p));
   if(!p){push('error','Connectivity',(w.sig||'Wire '+id)+' has a missing '+side.toLowerCase()+' connector',id);continue}
   usedParts.add(String(p.id));
   const t=T[p.t],n=t?.node?1:t?.pins?.length;
   if(!Number.isInteger(Number(e.i))||Number(e.i)<0||Number(e.i)>=n)push('error','Connectivity',(w.sig||'Wire '+id)+' has an invalid cavity on '+p.name,id,p.id);
   else{
    const k=String(e.p)+':'+String(e.i),a=seen.get(k)||[];a.push(w.id);seen.set(k,a)
   }
  }
  if(!String(w.sig||'').trim())push('review','Documentation','Wire '+id+' has no circuit label',id);
  if(!String(w.color||'').trim())push('review','Documentation',(w.sig||id)+' has no wire color',id);
  if(!(+w.awg>0))push('unknown','Build Data',(w.sig||id)+' has no confirmed conductor gauge',id);
  if(!(+w.len>0))push('unknown','Build Data',(w.sig||id)+' has no measured physical length',id);
  if(+w.fa>0&&+w.amps>+w.fa)push('error','Power',(w.sig||id)+' has entered current above its entered fuse rating',id);
  if(w.tw&&!S.wires.some(v=>v!==w&&String(v.tw)===String(w.tw)))push('review','CAN & Signal',(w.sig||id)+' has a twisted-pair group with no partner',id);
 }
 for(const [key,ids] of seen)if(ids.length>1){
  const [pid]=key.split(':'),p=byId.get(pid),t=p&&T[p.t];
  if(!t?.node&&!t?.bulk)push('review','Connectivity',(p?.name||pid)+' cavity '+key.split(':')[1]+' carries '+ids.length+' direct wire terminations; verify splice/double crimp',ids[0],p?.id);
 }
 for(const p of S.parts)if(!usedParts.has(String(p.id)))push('unknown','Connectivity',(p.name||p.id)+' is not connected to any drawn wire',null,p.id);
 const invalid=rows.some(x=>x.severity==='error'&&x.category==='Connectivity');
 if(!invalid){
  try{
   for(const q of compatIssues()){
    const severity=q.lvl==='bd'?'error':q.lvl==='wn'?'review':'unknown';
    push(severity,'Compatibility',q.plain||q.msg,[...(q.wires||[])][0]??null,[...(q.parts||[])][0]??null);
   }
  }catch(e){push('unknown','Compatibility','Compatibility engine could not analyze the current diagram. Check endpoint definitions.')}
 }
 // A project is NEVER labeled electrically safe simply because no rule fired.
 return rows;
}
let labFilter='all',labQuery='',lastRun=null;
function labReport(){return {app:'WireForge',version:APP_VERSION,date:new Date().toISOString(),project:metaName(),parts:S.parts.length,wires:S.wires.length,findings:labFindings(),notice:'Schematic consistency review only. Unknown ratings, pinouts, physical mating halves, contact seals, fuse properties and ECU current limits are not automatically verified.'}}
function renderLab(){
 const root=$('t-lab');if(!root)return;
 const all=labFindings(),counts={error:0,review:0,unknown:0};all.forEach(x=>counts[x.severity]++);
 const allowed=all.filter(x=>(labFilter==='all'||x.severity===labFilter)&&(!labQuery||String(x.message+' '+x.category).toLowerCase().includes(labQuery)));
 const connected=(S.wires||[]).reduce((n,w)=>n+Number(!!part(w.a?.p)&&!!part(w.b?.p)),0);
 const opts=[];
 for(const p of S.parts){
  const t=T[p.t];if(!t)continue;
  const n=t.node?1:t.pins.length;
  for(let i=0;i<n;i++){
   if(n>160)break;
   const used=S.wires.some(w=>(+w.a?.p===+p.id&&+w.a?.i===i)||(+w.b?.p===+p.id&&+w.b?.i===i));
   if(used||n<=12)opts.push({key:p.id+':'+i,label:p.name+' · '+(t.pins[i]?.p||String(i+1))});
  }
 }
 const options=opts.slice(0,900).map(o=>'<option value="'+escText(o.key)+'">'+escText(o.label)+'</option>').join('');
 root.innerHTML='<div class="wf-pro-hero"><div class="wf-eyebrow">WIRE FORGE / DESIGN VERIFICATION</div><h2>Validation Lab</h2><p>Catch missing connections, duplicate cavity terminations, incompatible signal types and incomplete build documentation. Select any finding to inspect it in Harness Designer.</p><div class="wf-pro-hero-actions"><button class="btn primary" data-wfl="run">Run wiring checks</button><button class="btn" data-wfl="export">Download findings CSV</button><button class="btn" data-wfl="report">Download full JSON report</button></div></div>'+
 '<div class="wf-pro-metrics"><div class="wf-pro-kpi"><strong>'+counts.error+'</strong><span>Conflicts detected</span></div><div class="wf-pro-kpi"><strong>'+counts.review+'</strong><span>Needs review</span></div><div class="wf-pro-kpi"><strong>'+counts.unknown+'</strong><span>Unverified data</span></div><div class="wf-pro-kpi"><strong>'+connected+' / '+S.wires.length+'</strong><span>Segments with both parts</span></div></div>'+
 '<div class="wf-pro-grid"><section class="wf-pro-card"><h3>Connection tester</h3><p>Compare any two modeled cavities. Results follow drawn wires, splices and explicitly modeled internal bus connections; they do not energize relays or prove physical continuity.</p>'+
 '<label>Starting cavity<select id="wfLabFrom">'+options+'</select></label><label>Destination cavity<select id="wfLabTo">'+options+'</select></label><button class="btn primary" data-wfl="trace" '+(opts.length<2?'disabled':'')+'>Check modeled continuity</button><div id="wfLabTrace" class="wf-pro-result" aria-live="polite">Select two cavities and run a check.</div></section>'+
 '<section class="wf-pro-card"><h3>What the lab can verify</h3><div class="wf-pro-checklist"><span>✓ Drawn connectivity and endpoint references</span><span>✓ Recognized power/ground/CAN net conflicts</span><span>✓ Duplicate cavity usage and wiring records</span><span>✓ Entered gauge, fuse and circuit metadata</span><span>○ Physical connectors, seals and pin gender require part-number verification</span><span>○ ECU/relay output ratings and mating compatibility are not fully modeled</span><span>○ No harness is certified safe by this checker</span></div><button class="btn" data-wfl="oldChecks">Open detailed Circuit Checks</button></section></div>'+
 '<section class="wf-pro-card wf-pro-findings"><div class="wf-pro-findings-head"><div><h3>Issue inspector</h3><p>'+allowed.length+' visible · '+all.length+' total findings</p></div><div class="wf-pro-tools"><input id="wfLabSearch" aria-label="Search findings" placeholder="Search circuits, categories…" value="'+escText(labQuery)+'"><select id="wfLabFilter" aria-label="Filter findings"><option value="all" '+(labFilter==='all'?'selected':'')+'>All findings</option><option value="error" '+(labFilter==='error'?'selected':'')+'>Conflicts</option><option value="review" '+(labFilter==='review'?'selected':'')+'>Review</option><option value="unknown" '+(labFilter==='unknown'?'selected':'')+'>Unverified</option></select></div></div>'+
 '<div id="wfLabRows" class="wf-pro-findings-list">'+(allowed.slice(0,200).map((x,i)=>'<div class="wf-pro-finding"><span class="wf-pro-severity '+x.severity+'">'+(x.severity==='error'?'CONFLICT':x.severity==='review'?'REVIEW':'UNKNOWN')+'</span><div><b>'+escText(x.category)+'</b><p>'+escText(x.message)+'</p></div><button class="btn" data-wfl="inspect" data-index="'+all.indexOf(x)+'" '+(x.wireId==null&&x.partId==null?'disabled':'')+'>Inspect</button></div>').join('')||'<div class="wf-pro-empty">No issues match this filter. This does not certify electrical safety.</div>')+'</div>'+
 (allowed.length>200?'<p class="muted">Showing first 200 matches. Download the full report to review all.</p>':'')+'</section>'+
 '<div class="wf-pro-footnote">Advisory check only. Manufacturer drawings, contact compatibility, relay states, electrical ratings, temperature effects, wire insulation, and installation conditions require independent verification.</div>';
 const a=$('wfLabFrom'),b=$('wfLabTo');if(a&&b&&opts.length>1){const stored=S.wfLabPins||[];if(stored[0]&&opts.some(q=>q.key===stored[0]))a.value=stored[0];if(stored[1]&&opts.some(q=>q.key===stored[1]))b.value=stored[1];else b.selectedIndex=1;}
 if(lastRun)traceDisplay(lastRun);
}
function traceDisplay(result){
 const target=$('wfLabTrace');if(!target)return;
 target.dataset.connected=String(result.connected);
 target.textContent=result.text;
}
function traceCavities(){
 const from=$('wfLabFrom')?.value,to=$('wfLabTo')?.value;
 if(!from||!to){showMessage('Select two cavities to test','error');return}
 S.wfLabPins=[from,to];save();
 const decode=v=>{const i=v.lastIndexOf(':');return {p:v.slice(0,i),i:Number(v.slice(i+1))}};
 const a=decode(from),b=decode(to);
 const pa=part(a.p),pb=part(b.p);
 if(!pa||!pb){showMessage('Missing connector in selected path','error');return}
 const {find,key}=netsOf(),connected=find(key(pa.id,a.i))===find(key(pb.id,b.i));
 const label1=endName({p:pa.id,i:a.i}),label2=endName({p:pb.id,i:b.i});
 const wires=connected?S.wires.filter(w=>find(key(w.a.p,w.a.i))===find(key(pa.id,a.i))):[];
 lastRun={connected,text:connected?'MODELED CONTINUITY FOUND: '+label1+' ↔ '+label2+' ('+wires.length+' wire segments on this net). This does not prove a physical connection.':'NO MODELED PATH: '+label1+' ↔ '+label2+'. This is an open path in the current schematic, not a measurement.'};
 traceDisplay(lastRun);
}
function labExport(){
 const r=labReport(),rows=[['Severity','Category','Finding','Wire ID','Component ID']];
 r.findings.forEach(x=>rows.push([x.severity,x.category,x.message,x.wireId??'',x.partId??'']));
 const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 download('wireforge-'+fileName(r.project)+'-validation.csv','\uFEFF'+csv,'text/csv');
}
function inspectFinding(index){
 const row=labFindings()[+index];if(!row)return;
 if(row.wireId!=null&&wireById(row.wireId))selection={type:'wire',id:+row.wireId};
 else if(row.partId!=null&&part(row.partId))selection={type:'part',id:+row.partId};
 else return;
 showTab('draw');showMessage('Opened related item in Harness Designer');
}
function onAutosave(ok){saveStatus(ok)}
function init(){
 $('wfQuickSave')?.addEventListener('click',()=>saveNamed());
 $('wfVaultOpen')?.addEventListener('click',()=>showTab('vault'));
 $('wfOpenImport')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await importFile(f);e.target.value=''});
 document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-wfv],[data-wfl]');if(!btn)return;
  if(btn.dataset.wfv){
   const act=btn.dataset.wfv,id=btn.dataset.id;
   switch(act){
    case'quick':saveNamed();break;
    case'as':{const answer=prompt('Name this new saved copy',metaName()+' copy');if(answer!=null)saveNamed({asNew:true,name:answer});break}
    case'load':loadNamed(id);break;
    case'export':downloadNamed(id);break;
    case'exportCurrent':exportCurrent();break;
    case'rename':renameNamed(id);break;
    case'remove':removeNamed(id);break;
    case'import':$('wfOpenImport')?.click();break;
    case'blank':startBlank();break;
   }
  }
  if(btn.dataset.wfl){
   const act=btn.dataset.wfl;
   if(act==='run'){lastRun=null;renderLab();showMessage('Wiring review updated');}
   else if(act==='export')labExport();
   else if(act==='report'){const rep=labReport();download('wireforge-'+fileName(rep.project)+'-review.json',JSON.stringify(rep,null,2))}
   else if(act==='trace')traceCavities();
   else if(act==='inspect')inspectFinding(btn.dataset.index);
   else if(act==='oldChecks')showTab('checks');
  }
 });
 document.addEventListener('change',e=>{if(e.target?.id==='wfLabFilter'){labFilter=e.target.value;renderLab()}});
 document.addEventListener('input',e=>{if(e.target?.id==='wfLabSearch'){labQuery=e.target.value.toLowerCase();const start=e.target.selectionStart;renderLab();const field=$('wfLabSearch');field?.focus();try{field?.setSelectionRange(start,start)}catch{}}});
 // Detect browser save failures in the underlying editor autosave.
 saveStatus();
}
window.WFPro={renderVault,renderLab,saveNamed,loadNamed,labReport,traceCavities,onAutosave,readSnapshot,snapshotList,importFile,exportCurrent};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
