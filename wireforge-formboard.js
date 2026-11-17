/* WireForge physical formboard. Independent implementation; drawing positions are not measurements. */
(function(root){
'use strict';
const key=v=>String(v),positive=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>0;
const nonnegative=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
const fresh=()=>({version:1,nodes:[],segments:[],allowance:1,slack:0,waste:10,packing:0.65,od:{},next:1});
function path(g,start,end){
 if(!start||!end)return null;
 const valid=new Set(g.nodes.map(n=>n.id)),adj=new Map(); 
 if(!valid.has(start)||!valid.has(end))return null;
 if(start===end)return [];
 for(const s of g.segments){if(!valid.has(s.a)||!valid.has(s.b)||s.a===s.b)continue;
 for(const [a,b] of [[s.a,s.b],[s.b,s.a]]){if(!adj.has(a))adj.set(a,[]);adj.get(a).push([b,s]);}}
 const seen=new Set([start]),queue=[[start,[]]];
 for(let i=0;i<queue.length;i++){const [n,p]=queue[i];for(const [b,s] of adj.get(n)||[]){if(seen.has(b))continue;const route=[...p,s];if(b===end)return route;seen.add(b);queue.push([b,route]);}}
 return null;
}
function addSegment(g,a,b){
 if(a===b||!g.nodes.some(n=>n.id===a)||!g.nodes.some(n=>n.id===b)||path(g,a,b)!==null)return false;
 g.segments.push({id:'s'+g.next++,a,b,length:null,sleeve:'',size:null});return true;
}
function addNode(g,x,y,label,partId=null){const n={id:'n'+g.next++,x,y,label,partId};g.nodes.push(n);return n;}
function seed(parts,wires){
 const g=fresh(),used=new Set(wires.flatMap(w=>[key(w.a?.p),key(w.b?.p)]));
 const ordered=parts.filter(p=>used.has(key(p.id))).slice().sort((a,b)=>(Number(a.x)||0)-(Number(b.x)||0)||(Number(a.y)||0)-(Number(b.y)||0));
 // Draft trunk in schematic x-order; no inferred physical dimensions.
 for(let i=0;i<ordered.length;i+=4){
 const x=100+Math.floor(i/4)*350,j=addNode(g,x,300,'Breakout '+(Math.floor(i/4)+1));
 const prev=g.nodes.filter(n=>n.partId==null).at(-2);if(prev)addSegment(g,prev.id,j.id);
 ordered.slice(i,i+4).forEach((p,k)=>{const px=x+(k%2===0?-130:130),py=k<2?85:520;const n=addNode(g,px,py,p.name||'Connector '+p.id,p.id);addSegment(g,j.id,n.id);});
 }return g;
}
const typical={8:5.0,10:4.0,12:3.3,14:2.7,16:2.3,18:1.9,20:1.6,22:1.4,24:1.2,26:1.0};
function analyze(g,wires,parts){
 const partIds=new Set(parts.map(p=>key(p.id))),map=new Map();
 for(const n of g.nodes)if(n.partId!=null&&partIds.has(key(n.partId))){const k=key(n.partId);map.set(k,map.has(k)?null:n.id);}
 const bySeg=new Map(g.segments.map(s=>[s.id,[]])),rows=[];
 for(const w of wires){
 const a=map.get(key(w.a?.p)),b=map.get(key(w.b?.p)),route=path(g,a,b);
 if(route)for(const s of route)bySeg.get(s.id)?.push(w);
 const measured=route!==null&&route.length>0&&route.every(s=>positive(s.length));
 const run=measured?route.reduce((v,s)=>v+Number(s.length),0):null;
 const allowance=nonnegative(g.allowance)&&nonnegative(g.slack)?2*Number(g.allowance)+Number(g.slack):null;
 const cut=run!==null&&allowance!==null?run+allowance:null;
 rows.push({w,route,run,cut,status:route===null?'Unrouted':!route.length?'Local lead – measure separately':cut===null?'Measure branch / allowance':'Measured route'});
 }
 const bundles=g.segments.map(s=>{
 const members=bySeg.get(s.id)||[],ds=members.map(w=>positive(g.od[key(w.id)])?Number(g.od[key(w.id)]):typical[w.awg]||null);
 const estimated=members.some(w=>!positive(g.od[key(w.id)]));
 const d=ds.length&&ds.every(positive)&&positive(g.packing)&&g.packing<=1?Math.sqrt(ds.reduce((v,d)=>v+d*d,0)/g.packing):null;
 return {s,members,d,estimated};
 });
 return {rows,bundles};
}
const api={fresh,path,addSegment,addNode,seed,analyze};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!root?.document)return;
const $=id=>document.getElementById(id),h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v==null?'—':Number(v).toFixed(1);
let selected=null,mode='select',origin=null,wirePick=null,query='',drag=null;
function graph(){const g=S.wfFormboard;if(!g||g.version!==1||!Array.isArray(g.nodes)||!Array.isArray(g.segments))S.wfFormboard=fresh();return S.wfFormboard;}
function mutate(fn){commit();fn(graph());save();render();}
function csv(name,rows){proCSV(name,rows.map(r=>r.map(v=>typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v)));}
function cutRows(g,report){return [['Wire ID','Circuit','From','To','AWG','Color','Branch IDs','Run in','Allowance in','Cut in','Status'],...report.rows.map(r=>[r.w.id,r.w.sig,endName(r.w.a),endName(r.w.b),r.w.awg,r.w.color,r.route?.map(s=>s.id).join(' / ')||'',r.run,r.cut==null?'':r.cut-r.run,r.cut,r.status])];}
function svg(g,report){
 const ns=new Map(g.nodes.map(n=>[n.id,n])),minX=Math.min(0,...g.nodes.map(n=>n.x-150)),minY=Math.min(0,...g.nodes.map(n=>n.y-70)),maxX=Math.max(1000,...g.nodes.map(n=>n.x+150)),maxY=Math.max(620,...g.nodes.map(n=>n.y+70));
 const active=report.rows.find(r=>key(r.w.id)===wirePick),activeIds=new Set(active?.route?.map(s=>s.id)||[]);
 const lines=report.bundles.map(({s,members,d,estimated})=>{
 const a=ns.get(s.a),b=ns.get(s.b);if(!a||!b)return '';
 const x=(a.x+b.x)/2,y=(a.y+b.y)/2,stroke=activeIds.has(s.id)?'#fbbf24':selected?.id===s.id?'#38bdf8':wirePick?'#526074':'#8da4b8',width=Math.min(19,3+Math.sqrt(members.length)*2);
 return '<g data-seg="'+h(s.id)+'" style="cursor:pointer"><line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="transparent" stroke-width="28"/><line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#263448" stroke-width="'+(width+5)+'" stroke-linecap="round"/><line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" '+(positive(s.length)?'':'stroke-dasharray="9 5"')+'/><g transform="translate('+x+' '+y+')"><rect x="-59" y="-19" width="118" height="38" rx="6" fill="#172335" stroke="#42536a"/><text text-anchor="middle" y="-3" fill="#f1f5f9" font-size="11">'+h(positive(s.length)?num(s.length)+' in':'LENGTH TBD')+'</text><text text-anchor="middle" y="12" fill="#b6c7d9" font-size="10">'+members.length+' wires'+(d?' · '+(estimated?'~':'')+num(d)+' mm':'')+'</text></g></g>';
 }).join('');
 const nodes=g.nodes.map(n=>{
 const p=n.partId==null?null:S.parts.find(p=>key(p.id)===key(n.partId)),connector=n.partId!=null,chosen=selected?.id===n.id||origin===n.id,caption=p?.name||n.label||'Junction',label=caption.length>31?caption.slice(0,29)+'…':caption;
 return '<g data-node="'+h(n.id)+'" transform="translate('+n.x+' '+n.y+')" style="cursor:grab"><title>'+h(caption)+'</title>'+(connector?'<rect x="-43" y="-18" width="86" height="36" rx="8" fill="#213b4f" stroke="'+(chosen?'#fbbf24':'#67b6cc')+'" stroke-width="2"/><rect x="-32" y="-8" width="64" height="16" rx="4" fill="#101b2b"/>'+Array.from({length:5},(_,i)=>'<circle cx="'+(-24+i*12)+'" cy="0" r="3" fill="#b6c7d9"/>').join(''):'<circle r="11" fill="#172335" stroke="'+(chosen?'#fbbf24':'#9bd3e8')+'" stroke-width="3"/><circle r="4" fill="#9bd3e8"/>')+'<text x="0" y="'+(connector?33:26)+'" text-anchor="middle" font-size="11" font-weight="600" fill="#e9f1fc" stroke="#111b29" stroke-width="4" paint-order="stroke">'+h(label)+'</text></g>';
 }).join('');
 return '<svg id="wfFormSvg" xmlns="http://www.w3.org/2000/svg" viewBox="'+[minX,minY,maxX-minX,maxY-minY].join(' ')+'" style="width:'+Math.max(1000,maxX-minX)+'px;max-width:none;height:auto;display:block;background:#111b29;touch-action:none" font-family="Arial,sans-serif"><defs><pattern id="formgrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#243347" stroke-width=".7"/></pattern></defs><rect x="'+minX+'" y="'+minY+'" width="'+(maxX-minX)+'" height="'+(maxY-minY)+'" fill="#111b29"/><rect x="'+minX+'" y="'+minY+'" width="'+(maxX-minX)+'" height="'+(maxY-minY)+'" fill="url(#formgrid)"/>'+lines+nodes+'</svg>';
}
function render(){
 const el=$('t-formboard');if(!el)return;
 const g=graph(),report=analyze(g,S.wires,S.parts),n=g.nodes.find(n=>n.id===selected?.id),seg=report.bundles.find(b=>b.s.id===selected?.id),used=new Set(g.nodes.filter(n=>n.partId!=null).map(n=>key(n.partId))),available=S.parts.filter(p=>!used.has(key(p.id))),count=report.rows.filter(r=>r.cut!==null).length;
 const field=(label,id,value,placeholder='',step='.1')=>'<label>'+label+'<input id="'+id+'" type="number" min="0" step="'+step+'" value="'+h(value??'')+'" placeholder="'+placeholder+'"></label>';
 const rowOptions=report.rows.map(r=>'<option value="'+h(r.w.id)+'" '+(key(r.w.id)===wirePick?'selected':'')+'>'+h(r.w.sig||'Wire '+r.w.id)+'</option>').join('');
 let inspector='<p>Select a connector, junction or branch to edit it. Use Connect to join two nodes.</p>';
 if(n)inspector='<h3>'+h(n.partId==null?'Junction':'Connector endpoint')+'</h3><label>Label<input id="fbLabel" value="'+h(n.label)+'"></label><button data-fb="nodeSave">Save label</button> <button data-fb="delete">Remove node</button>';
 if(seg){const s=seg.s;inspector='<h3>Branch '+h(s.id)+'</h3>'+field('Measured length (in)','fbLength',s.length,'Unmeasured')+'<label>Sleeving / loom<input id="fbSleeve" value="'+h(s.sleeve)+'" placeholder="DR-25, braided, split loom…"></label>'+field('Sleeve ID (mm)','fbSize',s.size,'Unspecified')+'<p>'+seg.members.length+' wires · '+(seg.d?(seg.estimated?'Approx. ':'Modeled ')+num(seg.d)+' mm bundle OD':'Unknown bundle OD')+'</p><button data-fb="segSave">Save measurements</button> <button data-fb="split">Split branch</button> <button data-fb="delete">Remove</button><div class="fb-members">'+seg.members.map(w=>'<button data-fb="trace" data-wire="'+h(w.id)+'">'+h(w.sig||'Wire '+w.id)+'</button>').join('')+'</div>';}
 const traced=report.rows.find(r=>key(r.w.id)===wirePick);
 const bom=new Map();for(const r of report.rows)if(r.cut!==null){const k=r.w.awg+' AWG / '+(r.w.color||'TBD');bom.set(k,(bom.get(k)||0)+r.cut);}
 const sleeves=new Map();for(const {s} of report.bundles)if(positive(s.length)&&s.sleeve){const k=s.sleeve+' / '+(s.size||'size TBD')+' mm';sleeves.set(k,(sleeves.get(k)||0)+Number(s.length));}
 const tableRows=report.rows.filter(r=>!query||String(r.w.sig+' '+r.w.id+' '+endName(r.w.a)+' '+endName(r.w.b)).toLowerCase().includes(query)).map(r=>'<tr><td><button data-fb="trace" data-wire="'+h(r.w.id)+'">'+h(r.w.sig||'Wire '+r.w.id)+'</button><small>'+h(endName(r.w.a))+' → '+h(endName(r.w.b))+'</small></td><td>'+h(r.w.awg)+' / '+h(r.w.color)+'</td><td>'+h(r.route?.map(s=>s.id).join(' → ')||'—')+'</td><td>'+num(r.run)+'</td><td>'+num(r.cut)+'</td><td>'+h(r.status)+'</td></tr>').join('');
 const style='<style>#t-formboard .fb-wrap{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:12px}#t-formboard .fb-panel{border:1px solid var(--line);background:var(--panel);padding:14px;border-radius:10px;min-width:0}#t-formboard .fb-scroll{overflow:auto;max-height:72vh;border:1px solid #334155;border-radius:9px}#t-formboard .fb-tools{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:10px 0}#t-formboard button[data-fb]{border:1px solid var(--line);background:var(--panel2);color:var(--fg);border-radius:6px;padding:7px 10px;cursor:pointer}#t-formboard button[data-fb].active{background:#0e7490;color:white}#t-formboard label{display:block;margin:8px 0}#t-formboard input,#t-formboard select{width:100%;margin-top:5px}#t-formboard small{display:block;color:var(--mute);font-size:11px}#t-formboard .fb-members{display:flex;flex-direction:column;gap:4px;margin-top:12px;max-height:190px;overflow:auto}#t-formboard .fb-kpis{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}#t-formboard .fb-kpis b{font-size:20px;display:block}#t-formboard .fb-kpis div{min-width:110px}#t-formboard .fb-scroll svg{user-select:none}#t-formboard table td{vertical-align:top}@media(max-width:850px){#t-formboard .fb-wrap{grid-template-columns:1fr}}@media print{#t-formboard .fb-tools,#t-formboard .fb-sidebar{display:none}#t-formboard .fb-wrap{display:block}#t-formboard .fb-scroll{overflow:visible;max-height:none}#t-formboard .fb-scroll svg{width:100%!important}}</style>';
 el.innerHTML=style+'<div class="wf-pro-head"><div><div class="pill">WIRE FORGE · PHYSICAL ROUTING</div><h2>Harness Formboard</h2><p class="muted">Manufacturing layout linked to your pin-to-pin schematic. Dashed branches have no measured length; the drawing is not to scale.</p></div><button class="btn" data-tab="draw">Electrical schematic</button></div><div class="fb-kpis"><div><b>'+g.nodes.length+'</b><small>Placed nodes</small></div><div><b>'+g.segments.length+'</b><small>Physical branches</small></div><div><b>'+report.rows.filter(r=>r.route!==null).length+' / '+S.wires.length+'</b><small>Wires routed</small></div><div><b>'+count+'</b><small>Measured cut lengths</small></div></div><div class="fb-tools"><button data-fb="seed">Generate draft from schematic</button><button data-fb="select" class="'+(mode==='select'?'active':'')+'">Select / drag</button><button data-fb="junction" class="'+(mode==='junction'?'active':'')+'">+ Junction</button><button data-fb="connect" class="'+(mode==='connect'?'active':'')+'">Connect nodes</button><button data-fb="clearTrace">Clear highlight</button><button data-fb="svg">Export formboard SVG</button><button data-fb="cut">Cut list CSV</button><button data-fb="bom">Material CSV</button></div><div class="fb-wrap"><div class="fb-panel"><div id="fbHint" class="muted">'+(mode==='connect'?(origin?'Select destination node.':'Select starting node.') :mode==='junction'?'Tap empty canvas to add junction.':'Drag nodes to arrange; select a branch for measurements.')+'</div><div class="fb-scroll">'+svg(g,report)+'</div></div><aside class="fb-sidebar fb-panel"><h3>Physical inspector</h3>'+inspector+'<hr><label>Unplaced schematic component<select id="fbPart"><option value="">Select component</option>'+available.map(p=>'<option value="'+h(p.id)+'">'+h(p.name)+'</option>').join('')+'</select></label><button data-fb="place">Place connector</button><hr><label>Trace any schematic wire<select id="fbTrace"><option value="">No highlight</option>'+rowOptions+'</select></label>'+(traced?'<p>'+h(traced.status)+' · '+num(traced.cut)+' in cut</p>'+field('Measured wire outer diameter (mm)','fbOD',g.od[wirePick],'Use approximate library')+'<button data-fb="od">Save OD</button>':'')+'<hr><h3>Build settings</h3>'+field('Allowance per end (in)','fbAllowance',g.allowance)+field('Extra service loop per wire (in)','fbSlack',g.slack)+field('Material waste (%)','fbWaste',g.waste)+'<button data-fb="settings">Save settings</button><p class="muted">Bundle OD uses a 65% packing estimate; verify actual cable OD and sleeve fit. Branch IDs represent mechanical routes, not electrical splices.</p></aside></div><div class="fb-panel" style="margin-top:12px"><h3>Physical wire schedule</h3><p class="muted">No cut length is produced for incomplete routes or local leads. Existing schematic-entered wire lengths are not overwritten. Confirm allowances and dimensions before cutting.</p><label>Find circuit<input id="fbQuery" value="'+h(query)+'" placeholder="Signal, connector, wire ID"></label><div class="tw"><table><thead><tr><th>Circuit</th><th>AWG / color</th><th>Branch route</th><th>Run (in)</th><th>Cut (in)</th><th>Status</th></tr></thead><tbody>'+tableRows+'</tbody></table></div></div><div class="fb-panel" style="margin-top:12px"><h3>Measured material summary</h3><p class="muted">Measured routes only; excludes unmeasured wires and branches. Includes '+h(g.waste)+'% waste.</p>'+[...bom,...sleeves].map(([k,v])=>'<div>'+h(k)+' · '+num(v*(1+Number(g.waste)/100)/12)+' ft</div>').join('')+'</div>';
 const sc=el.querySelector('.fb-scroll');if(root.WFFormboard.scroll){sc.scrollLeft=root.WFFormboard.scroll.x;sc.scrollTop=root.WFFormboard.scroll.y;}sc.addEventListener('scroll',()=>root.WFFormboard.scroll={x:sc.scrollLeft,y:sc.scrollTop});
 bindCanvas();
}
function coords(e,s){const p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(s.getScreenCTM().inverse());return {x:Math.round(q.x/10)*10,y:Math.round(q.y/10)*10};}
function bindCanvas(){
 const s=$('wfFormSvg');if(!s)return;
 s.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;const node=e.target.closest('[data-node]'),branch=e.target.closest('[data-seg]'),p=coords(e,s),g=graph();
 if(mode==='junction'&&!node&&!branch){mutate(g=>addNode(g,p.x,p.y,'Junction '+g.next));return;}
 if(node){const id=node.dataset.node;
 if(mode==='connect'){if(!origin){origin=id;render();return;}const a=origin;origin=null;if(a===id||path(g,a,id)!==null){toast('Cannot create a loop or duplicate branch');render();return;}mutate(g=>addSegment(g,a,id));return;}
 selected={id,type:'node'};if(mode==='select'){const n=g.nodes.find(x=>x.id===id);drag={id,start:p,x:n.x,y:n.y,moved:false};s.setPointerCapture(e.pointerId);return;}render();return;}
 if(branch){selected={id:branch.dataset.seg,type:'segment'};render();}else{selected=null;render();}
 });
 s.addEventListener('pointermove',e=>{if(!drag)return;const p=coords(e,s),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!dx&&!dy&&!drag.moved)return;drag.moved=true;drag.to={x:drag.x+dx,y:drag.y+dy};s.querySelector('[data-node="'+drag.id+'"]')?.setAttribute('transform','translate('+drag.to.x+' '+drag.to.y+')');});
 const end=()=>{if(!drag)return;const d=drag;drag=null;if(d.moved&&d.to)mutate(g=>Object.assign(g.nodes.find(n=>n.id===d.id),d.to));else render();};
 s.addEventListener('pointerup',end);s.addEventListener('pointercancel',()=>{drag=null;render();});
}
const value=id=>$(id)?.value??'',numeric=(id,allowZero=false)=>{const v=value(id);return (allowZero?nonnegative(v):positive(v))?Number(v):null;};
document.addEventListener('click',e=>{
 const b=e.target.closest('#t-formboard [data-fb]');if(!b)return;const action=b.dataset.fb,g=graph(),n=g.nodes.find(n=>n.id===selected?.id),s=g.segments.find(s=>s.id===selected?.id);
 if(['select','connect','junction'].includes(action)){mode=action;origin=null;render();return;}
 if(action==='seed'){if(g.nodes.length&&!confirm('Replace only the physical formboard? Existing schematic stays unchanged; physical measurements will be lost.'))return;mutate(()=>{S.wfFormboard=seed(S.parts,S.wires);selected=null;wirePick=null;origin=null;mode='select';root.WFFormboard.scroll=null;});}
 if(action==='place'){const p=S.parts.find(p=>key(p.id)===value('fbPart'));if(!p)return toast('Select an unplaced component');mutate(g=>{const n=addNode(g,120+g.nodes.length%8*45,120,p.name,p.id);selected={id:n.id,type:'node'};});}
 if(action==='nodeSave'&&n){const label=value('fbLabel');mutate(()=>n.label=label);}
 if(action==='segSave'&&s){const length=numeric('fbLength'),size=numeric('fbSize');if((value('fbLength')&&length===null)||(value('fbSize')&&size===null))return toast('Enter positive measurements or leave blank');const sleeve=value('fbSleeve');mutate(()=>Object.assign(s,{length,size,sleeve}));}
 if(action==='delete'&&(n||s)){if(!confirm('Remove this physical item? Electrical wiring is unchanged.'))return;mutate(g=>{if(n){g.nodes=g.nodes.filter(q=>q!==n);g.segments=g.segments.filter(q=>q.a!==n.id&&q.b!==n.id);}else g.segments=g.segments.filter(q=>q!==s);selected=null;origin=null;});}
 if(action==='split'&&s){mutate(g=>{const a=g.nodes.find(n=>n.id===s.a),b=g.nodes.find(n=>n.id===s.b);if(!a||!b)return;const j=addNode(g,(a.x+b.x)/2,(a.y+b.y)/2,'Breakout '+g.next);g.segments=g.segments.filter(q=>q!==s);addSegment(g,a.id,j.id);addSegment(g,j.id,b.id);selected={id:j.id,type:'node'};});}
 if(action==='settings'){const allowance=numeric('fbAllowance',true),slack=numeric('fbSlack',true),waste=numeric('fbWaste',true);if([allowance,slack,waste].includes(null))return toast('Enter nonnegative settings');mutate(g=>Object.assign(g,{allowance,slack,waste}));}
 if(action==='trace'){wirePick=key(b.dataset.wire);render();}
 if(action==='clearTrace'){wirePick=null;render();}
 if(action==='od'&&wirePick){const od=numeric('fbOD');if(value('fbOD')&&od===null)return toast('Enter positive OD or blank');mutate(g=>{if(od===null)delete g.od[wirePick];else g.od[wirePick]=od;});}
 if(action==='cut')csv('wireforge-formboard-cut-list.csv',cutRows(g,analyze(g,S.wires,S.parts)));
 if(action==='bom'){const q=analyze(g,S.wires,S.parts),rows=[['Category','Item','Color / size','Measured in','With waste in','Status']];for(const r of q.rows)rows.push(['Wire',r.w.awg,r.w.color,r.cut,r.cut===null?'':r.cut*(1+g.waste/100),r.status]);for(const {s,members,d,estimated} of q.bundles)rows.push(['Sleeve',s.sleeve||'TBD',s.size||'',positive(s.length)?s.length:'',positive(s.length)?s.length*(1+g.waste/100):'',members.length+' wires; '+(d?(estimated?'Approx. ':'')+num(d)+' mm OD':'unknown OD')]);csv('wireforge-formboard-materials.csv',rows);}
 if(action==='svg'){const data=$('wfFormSvg').outerHTML,blob=new Blob([data],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='wireforge-physical-formboard.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
document.addEventListener('change',e=>{if(e.target.id==='fbTrace'){wirePick=e.target.value||null;render();}if(e.target.id==='fbQuery'){query=e.target.value.toLowerCase();render();}});
root.WFFormboard={...api,render,report:()=>analyze(graph(),S.wires,S.parts),scroll:null};
})(typeof window!=='undefined'?window:null);
