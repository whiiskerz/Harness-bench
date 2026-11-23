/* WireForge physical formboard. Independent implementation; drawing positions are not measurements. */
(function(root){
'use strict';
const key=v=>String(v);
const numberEntered=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
const positive=v=>numberEntered(v)&&Number(v)>0;
const nonnegative=v=>numberEntered(v)&&Number(v)>=0;
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
const $=id=>document.getElementById(id);
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v==null?'—':Number(v).toFixed(1);
const art=root.WFFormArt;
const {point,xy,curve,angle}=art;
const btn=(id,label,cls='')=>'<button type="button" data-fb="'+id+'" class="'+cls+'">'+label+'</button>';
const field=(label,id,value,placeholder='',step='.1')=>'<label>'+label+'<input id="'+id+'" type="number" min="0" step="'+step+'" value="'+h(value)+'" placeholder="'+placeholder+'"></label>';
const input=(label,id,value='',placeholder='')=>'<label>'+label+'<input id="'+id+'" value="'+h(value)+'" placeholder="'+placeholder+'"></label>';
const option=(v,label,selectedValue)=>'<option value="'+h(v)+'"'+(key(v)===key(selectedValue)?' selected':'')+'>'+h(label)+'</option>';
const select=(label,id,options)=>'<label>'+label+'<select id="'+id+'">'+options+'</select></label>';
const val=id=>$(id)?.value??'';
const numeric=(id,zero=false)=>(zero?nonnegative(val(id)):positive(val(id)))?Number(val(id)):null;
const view={cam:null,mode:'select',page:'design',chosen:null,origin:null,trace:null,details:true,query:'',yaw:.32,pitch:.51,drag:null};

function graph(){
 const g=S.wfFormboard;
 if(!g||g.version!==1||!Array.isArray(g.nodes)||!Array.isArray(g.segments))S.wfFormboard=fresh();
 return S.wfFormboard;
}
function mutate(fn){
 commit();
 fn(graph());
 save();
 render();
}
function caption(n,p){return n.label||p?.name||(n.partId==null?'Breakout':'Connector');}
function lookup(){return new Map(S.parts.map(p=>[key(p.id),p]));}
function boardBounds(g){
 const left=Math.min(0,...g.nodes.map(n=>n.x-180),...g.segments.map(s=>segmentExtent(g,s,'x',-1)));
 const top=Math.min(0,...g.nodes.map(n=>n.y-155),...g.segments.map(s=>segmentExtent(g,s,'y',-1)));
 const right=Math.max(740,...g.nodes.map(n=>n.x+180),...g.segments.map(s=>segmentExtent(g,s,'x',1)));
 const bottom=Math.max(530,...g.nodes.map(n=>n.y+155),...g.segments.map(s=>segmentExtent(g,s,'y',1)));
 return {x:left,y:top,w:right-left,h:bottom-top};
}
function segmentExtent(g,s,axis,direction){
 if(!s.bend)return 0;
 const a=g.nodes.find(n=>n.id===s.a),b=g.nodes.find(n=>n.id===s.b);
 if(!a||!b)return 0;
 const c=curve(a,b,s);
 return (direction<0?Math.min:Math.max)(c.c[axis],c.d[axis])+direction*42;
}
function fit(g,detail=false){
 const box=boardBounds(g),svg=$('wfFormSvg');
 if(detail&&box.w>1750)box.w=1450;
 const ratio=(svg?.clientWidth||840)/(svg?.clientHeight||580);
 const w=Math.max(box.w,box.h*ratio),height=w/ratio;
 view.cam={x:box.x+(box.w-w)/2,y:box.y+(box.h-height)/2,w,h:height};
}
function camera(svg,box=view.cam){
 svg.setAttribute('viewBox',[box.x,box.y,box.w,box.h].join(' '));
 const paper=svg.querySelector('#fb-paper');
 if(paper)for(const [name,v] of Object.entries({x:box.x,y:box.y,width:box.w,height:box.h}))paper.setAttribute(name,v);
}

function branchMarkup(bundle,c,active,orbit){
 const {s,members}=bundle;
 const selected=view.chosen?.id===s.id;
 const traced=active.has(s.id);
 const width=Math.min(20,6+Math.sqrt(members.length)*1.65);
 const d=c.path,mid=orbit?null:c.sample(.5),sleeve=s.sleeve||'',covered=!!sleeve;
 const belt=s.label||s.id.toUpperCase();
 const dim=positive(s.length)?num(s.length)+' in':'TBD';
 let labelAngle=orbit?0:angle(c.sample(.44),c.sample(.56));
 if(Math.abs(labelAngle)>90)labelAngle+=180;
 const shell=traced?'#007d70':selected?'#008d82':covered?'#162329':'#273940';
 const accent=traced||selected?'#6be8d5':'#899ca2';
 const textAngle=Math.abs(labelAngle)>63?0:labelAngle;
 const labels=view.details&&!orbit?`<g transform="translate(${xy(mid)}) rotate(${textAngle})"><rect x="-23" y="-29" width="46" height="15" rx="3" fill="#f9fbfa" stroke="${selected?'#008d82':'#a6b8bd'}"/><text y="-18.5" fill="#253a43" text-anchor="middle" font-size="9" font-weight="700">${h(dim)}</text><text y="22" stroke="#edf2f3" stroke-width="3" paint-order="stroke" text-anchor="middle" fill="#354c55" font-size="10" font-weight="700">${h(belt+(sleeve?' · '+sleeve+(positive(s.size)?' '+num(s.size)+' mm':''):''))}</text></g>`:'';
 const handle=selected&&!orbit?`<circle data-bend="${h(s.id)}" cx="${mid.x}" cy="${mid.y}" r="7" fill="#eafff8" stroke="#007f77" stroke-width="2"><title>Drag to reshape branch</title></circle>`:'';
 return `<g data-seg="${h(s.id)}" ${view.trace&&!traced&&!selected?'opacity=".47"':''}><title>${h(belt)} · ${h(dim)} · ${members.length} wires</title>
 <path d="${d}" stroke="transparent" stroke-width="${Math.max(26,width+8)}" fill="none"/>
 <path d="${d}" stroke="${shell}" stroke-width="${width}" stroke-linecap="round" fill="none"/>
 <path d="${d}" stroke="${accent}" stroke-opacity=".52" stroke-width="${width*.52}" stroke-linecap="round" fill="none"/>
 <path d="${d}" stroke="${shell}" stroke-opacity=".64" stroke-width="${width*.31}" stroke-linecap="round" fill="none"/>
 ${covered&&/split|braid/i.test(sleeve)?`<path d="${d}" stroke="#759096" stroke-opacity=".5" stroke-width="${width*.66}" stroke-dasharray="1.5 3" fill="none"/>`:''}
 ${labels}${handle}</g>`;
}
function nodeMarkup(n,p,neighbors,project,orbit){
 const type=p&&T[p.t],connector=n.partId!=null,chosen=view.chosen?.id===n.id||view.origin===n.id;
 const target=project(n),near=neighbors[0];
 const rotation=Number.isFinite(n.rotation)?n.rotation:(near?angle(near,n):0);
 const displayAngle=angle(target,project(point(n.x+Math.cos(rotation*Math.PI/180)*45,n.y+Math.sin(rotation*Math.PI/180)*45)));
 const bodyAngle=orbit?displayAngle:rotation;
 const label=caption(n,p);
 const family=type?.fam;
 const shellLength=family==='mx'?110:family==='term'?47:family==='bulk'||family==='maven'?72:family==='dt'||family==='pwr'?64:51;
 const center=point(target.x+Math.cos(bodyAngle*Math.PI/180)*shellLength*.54,target.y+Math.sin(bodyAngle*Math.PI/180)*shellLength*.54);
 const boot=n.boot?`<path d="M-26-5H-16L-8-11H4V11H-8L-16 5H-26Z" fill="url(#fb-rubber)" stroke="#1c282d"/><path d="M-19-5V5M-11-8V8M-4-10V10" stroke="#65767c" stroke-opacity=".5"/>`:'';
 const port=orbit?'':`<circle data-port="${h(n.id)}" class="fb-node-mark" r="${connector?6:8}" fill="${chosen?'#007e73':'#e0f2ed'}" stroke="#42686a" stroke-width="1.7"><title>Drag port to another port to route</title></circle>`;
 const centerY=connector?center.y+34:target.y+24;
 const text=view.details?`<text x="${connector?center.x:target.x}" y="${centerY}" text-anchor="middle" fill="#1b3440" stroke="#edf2f3" stroke-width="4" paint-order="stroke" font-size="11" font-weight="700">${h(label.length>35?label.slice(0,33)+'…':label)}</text>`:'';
 return `<g data-node="${h(n.id)}"><title>${h(label)}</title>
 <g transform="translate(${xy(target)}) rotate(${bodyAngle})">
 ${connector?`<path class="fb-node-mark" d="M-28-28H${shellLength+4}V29H-28Z" fill="transparent" stroke="${chosen?'#008d82':'transparent'}" rx="4" stroke-dasharray="4 3"/>${boot}${art.hardware(family)}`:
 `<circle class="fb-node-mark" r="12" fill="#273d43" stroke="${chosen?'#008d82':'#738a90'}" stroke-width="2"/>`}${port}</g>${text}</g>`;
}
function scene(g,report){
 const moved=view.drag?.type==='node'&&view.drag.to,reshaped=view.drag?.type==='bend'&&view.drag.to;
 const nodes=g.nodes.map(n=>moved&&n.id===view.drag.id?{...n,...moved}:n);
 const ns=new Map(nodes.map(n=>[n.id,n])),parts=lookup(),neighbors=new Map();
 const active=new Set(report.rows.find(r=>key(r.w.id)===view.trace)?.route?.map(s=>s.id)||[]);
 const orbit=view.page==='orbit';
 const box=orbit?boardBounds(g):null;
 const projection=orbit?art.projectFor(view.yaw,view.pitch,point(box.x+box.w/2,box.y+box.h/2)):p=>point(p.x,p.y);
 const project=n=>projection(n,Number(n.elevation)||0);
 const branches=report.bundles.map(bundle=>{
  const s=bundle.s,a=ns.get(s.a),b=ns.get(s.b);
  if(!a||!b)return '';
  if(!neighbors.has(a.id))neighbors.set(a.id,[]);
  if(!neighbors.has(b.id))neighbors.set(b.id,[]);
  neighbors.get(a.id).push(b);
  neighbors.get(b.id).push(a);
  const c=curve(a,b,reshaped&&s.id===view.drag.id?{...s,bend:reshaped}:s);
  if(!orbit)return branchMarkup(bundle,c,active,false);
  const za=Number(a.elevation)||0,zb=Number(b.elevation)||0;
  const points=[project(a),projection(c.c,(2*za+zb)/3),projection(c.d,(za+2*zb)/3),project(b)];
  return branchMarkup(bundle,{path:'M'+xy(points[0])+' C'+points.slice(1).map(xy).join(' ')},active,true);
 }).join('');
 const components=nodes.map(n=>nodeMarkup(n,parts.get(key(n.partId)),neighbors.get(n.id)||[],project,orbit)).join('');
 const from=view.drag?.type==='connect'?ns.get(view.drag.id):null,to=view.drag?.to;
 const preview=from&&to?`<path d="${curve(from,to,{}).path}" fill="none" stroke="#008578" stroke-width="3" stroke-dasharray="6 4" pointer-events="none"/>`:'';
 return branches+components+preview;
}
function renderScene(g,report){
 const svg=$('wfFormSvg');if(!svg)return;
 if(!view.cam)fit(g,view.page==='design');
 camera(svg);
 svg.querySelector('#fb-scene').innerHTML=scene(g,report);
}
function canvas(){
 return '<svg id="wfFormSvg" xmlns="http://www.w3.org/2000/svg" data-mode="'+view.mode+'" tabindex="0" role="group" aria-label="Physical harness canvas" font-family="system-ui,sans-serif">'+art.definitions()+'<rect id="fb-paper" fill="#edf2f3"/><rect x="-1000000" y="-1000000" width="2000000" height="2000000" fill="url(#fb-grid)"/><g id="fb-scene"></g></svg>';
}

function wireName(w){return w.sig||'Wire '+w.id;}
function shortPin(p,i){return pinId(p,i)+(p.pl?.[i]?' · '+p.pl[i]:'');}
function displayCut(r){
 if(positive(r.w.len)){
  const allowance=nonnegative(r.w.proAllowance)?Number(r.w.proAllowance):null;
  return {...r,run:Number(r.w.len),cut:allowance===null?null:Number(r.w.len)+allowance,status:allowance===null?'Measured wire · enter allowance in Production Studio':'Measured wire'};
 }
 return r;
}
function materials(g,report){
 const groups=new Map();
 function add(kind,name,variant,amount,unit,status){
  const id=JSON.stringify([kind,name,variant,unit,status]);
  if(!groups.has(id))groups.set(id,{kind,name,variant,unit,status,qty:0});
  groups.get(id).qty+=amount;
 }
 for(const n of g.nodes){
  const p=n.partId==null?null:part(n.partId),t=p&&T[p.t];
  if(t&&!t.node)add('Hardware',t.name,t.pn||'',1,'ea',t.pn?'Catalog reference · verify installed part':'Part number TBD');
  if(n.boot)add('Boot',n.boot,'',1,'ea','Verify fit');
 }
 for(const {s} of report.bundles){
  if(!s.sleeve)continue;
  const variant=positive(s.size)?num(s.size)+' mm ID':'ID TBD';
  if(positive(s.length))add('Covering',s.sleeve,variant,Number(s.length),'in','Measured branch');
  else add('Covering',s.sleeve,variant,1,'branch','Length TBD');
 }
 for(const r of report.rows.map(displayCut)){
  if(r.cut!==null)add('Wire',r.w.awg?r.w.awg+' AWG':'AWG TBD',r.w.color||'Color TBD',r.cut,'in',r.status);
  else add('Wire',r.w.awg?r.w.awg+' AWG':'AWG TBD',r.w.color||'Color TBD',1,'wire',r.status);
 }
 return [...groups.values()].map(row=>({...row,total:row.unit==='in'?row.qty*(1+Number(g.waste)/100):row.qty}));
}
function cutRows(report){
 return report.rows.map(displayCut).map(r=>[r.w.id,wireName(r.w),endName(r.w.a),endName(r.w.b),r.w.awg,r.w.color,r.route?.map(s=>s.id).join(' / ')||'',r.run,r.cut==null?'':r.cut-r.run,r.cut,r.status]);
}
function csv(name,rows){
 proCSV(name,rows.map(r=>r.map(v=>typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v)));
}
const cutHeaders=['Wire ID','Circuit','From','To','AWG','Color','Branch IDs','Run in','Allowance in','Cut in','Status'];
const bomHeaders=['Category','Item','Part / size','Quantity','Unit','With waste','Status'];
function table(headers,rows){
 return '<div class="tw"><table><thead><tr>'+headers.map(v=>'<th>'+h(v)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
}
function output(g,report,forPrint=false){
 const list=report.rows.map(displayCut).filter(r=>forPrint||!view.query||[wireName(r.w),r.w.id,endName(r.w.a),endName(r.w.b)].join(' ').toLowerCase().includes(view.query));
 const wires=list.map(r=>'<tr><td>'+(forPrint?h(wireName(r.w)):'<button type="button" data-fb="trace" data-wire="'+h(r.w.id)+'">'+h(wireName(r.w))+'</button>')+'<small>'+h(endName(r.w.a))+' → '+h(endName(r.w.b))+'</small></td><td>'+h(r.w.awg)+' / '+h(r.w.color)+'</td><td>'+h(r.route?.map(s=>s.id).join(' → ')||'—')+'</td><td>'+num(r.run)+'</td><td>'+num(r.cut)+'</td><td>'+h(r.status)+'</td></tr>');
 const bom=materials(g,report).map(r=>'<tr>'+[r.kind,r.name,r.variant,num(r.qty),r.unit,num(r.total),r.status].map(v=>'<td>'+h(v)+'</td>').join('')+'</tr>');
 const branches=report.bundles.map(({s,members,d,estimated})=>'<tr>'+[s.id,s.label||'',positive(s.length)?num(s.length):'TBD',s.sleeve||'TBD',positive(s.size)?num(s.size):'TBD',members.length,d?(estimated?'Approx. ':'')+num(d):'TBD'].map(v=>'<td>'+h(v)+'</td>').join('')+'</tr>');
 return '<section class="fb-output"><h3>Branch schedule</h3>'+table(['ID','Label','Length (in)','Covering','Sleeve ID (mm)','Wires','Bundle OD (mm)'],branches)+'</section>'+
 '<section class="fb-output"><h3>Wire cut list</h3><p class="fb-subtitle">Complete measured routes use the branch sum plus both end allowances and the service loop. An entered wire length takes precedence.</p>'+
 (forPrint?'':input('Find circuit','fbQuery',view.query,'Signal, endpoint or wire ID'))+table(['Circuit','AWG / color','Branch route','Run (in)','Cut (in)','Status'],wires)+'</section>'+
 '<section class="fb-output"><h3>Material schedule</h3><p class="fb-subtitle">Measured material totals include '+h(g.waste)+'% waste. Pending rows count wires or branches without adding any length.</p>'+table(bomHeaders,bom)+'</section>';
}
function pins(n){
 const p=part(n.partId),t=p&&T[p.t];
 if(!t||t.node)return '';
 const rows=t.pins.map((pin,i)=>{
  const ws=usedOn(p.id,i);
  return '<div><b>'+h(shortPin(p,i))+'</b><br><span>'+h(ws.length?ws.map(w=>wireName(w)+(t.bulk?' ['+faceOf(w,p.id,i)+']':'')).join(', '):'Open in schematic')+'</span></div>';
 }).join('');
 return '<details><summary>Cavities ('+t.pins.length+')</summary><div class="fb-pins">'+rows+'</div>'+btn('schematicPart','Edit in wiring diagram')+'</details>';
}
function branchInspector(seg){
 const {s,members,d,estimated}=seg;
 return '<div class="fb-panel-title">Branch '+h(s.id)+'</div>'+input('Cable label','fbSegLabel',s.label)+
 '<div class="fb-unit">'+field('Measured length (in)','fbLength',s.length,'TBD')+field('Sleeve ID (mm)','fbSize',s.size,'TBD')+'</div>'+
 '<label>Covering<input id="fbSleeve" list="fbCoverings" value="'+h(s.sleeve)+'" placeholder="Unspecified"></label><datalist id="fbCoverings"><option value="DR-25"><option value="Braided PET"><option value="Split loom"></datalist>'+
 '<p class="muted">'+members.length+' wires · '+(d?(estimated?'Approx. ':'Modeled ')+num(d)+' mm bundle OD':'Bundle OD TBD')+'</p><div class="fb-actions">'+btn('segSave','Save branch','fb-primary')+btn('split','Insert breakout')+btn('resetCurve','Reset curve')+btn('delete','Remove')+'</div>'+
 '<div class="fb-members">'+members.map(w=>'<button type="button" data-fb="trace" data-wire="'+h(w.id)+'">'+h(wireName(w))+'</button>').join('')+'</div>';
}
function nodeInspector(n){
 const p=part(n.partId),t=p&&T[p.t],hardware=n.partId!=null;
 return '<div class="fb-panel-title">'+(hardware?'Component':'Breakout')+'</div>'+
 (hardware?'<p class="muted">'+h(t?.name||'Schematic component unavailable')+(t?.pn?' · '+h(t.pn):'')+'</p>':'')+
 input('Canvas label','fbLabel',n.label)+(hardware?input('Cable boot part / label','fbBoot',n.boot,'Unspecified'):'')+
 '<div class="fb-unit"><label>Preview depth<input id="fbElevation" type="number" step="1" value="'+h(n.elevation??'')+'" placeholder="0"></label>'+
 (hardware?'<label>Rotation (°)<input id="fbRotation" type="number" step="1" value="'+h(n.rotation??'')+'" placeholder="Auto"></label>':'')+'</div>'+
 '<div class="fb-actions">'+btn('nodeSave','Save component','fb-primary')+btn('delete','Remove')+'</div>'+(hardware?pins(n):'');
}
function bulkheadSelection(w){
 const choices=S.parts.filter(p=>T[p.t]?.bulk&&key(w.a.p)!==key(p.id)&&key(w.b.p)!==key(p.id));
 if(!choices.length)return '<p class="muted">Place a bulkhead in the wiring diagram to record a pass-through.</p>';
 return '<details class="fb-bulk" '+(view.bulk?'open':'')+'><summary>Route through bulkhead</summary>'+
 (w.tw?'<p class="muted">Use the wiring diagram to edit twisted pairs as a group.</p>':
 select('Existing bulkhead','fbBulk',option('','Choose housing',view.bulk)+choices.map(p=>option(p.id,p.name,view.bulk)).join(''))+
 select('Verified cavity','fbCavity',option('','Choose cavity')+(T[part(view.bulk)?.t]?.pins||[]).map((p,i)=>option(i,pinId(part(view.bulk),i))).join(''))+
 select('Original From endpoint enters','fbFace',option('','Choose face')+option('L','Engine face')+option('R','Cabin face'))+
 '<p class="muted">Use the verified cavity and face from your hardware documentation. Both new legs need their own cut measurements.</p>'+btn('bulkApply','Insert pass-through'))+'</details>';
}
function sidebar(g,report){
 const n=g.nodes.find(n=>n.id===view.chosen?.id),seg=report.bundles.find(b=>b.s.id===view.chosen?.id);
 const placed=new Set(g.nodes.filter(n=>n.partId!=null).map(n=>key(n.partId)));
 const choices=S.parts.filter(p=>!placed.has(key(p.id)));
 const traced=report.rows.find(r=>key(r.w.id)===view.trace);
 const wires=report.rows.map(r=>option(r.w.id,wireName(r.w)+' · #'+r.w.id,view.trace)).join('');
 if(view.page==='orbit')return '<h3>3D routing preview</h3><p class="muted">Drag to orbit the physical branches. Preview depth is entered per component in Design and is used only for visualization.</p>'+btn('resetOrbit','Reset orientation')+'<details><summary>Pin-level hardware</summary><p class="muted">Open the existing schematic-based 3D Hardware Studio for individual cavity exits and housings.</p>'+btn('hardware3d','Open Hardware Studio')+'</details>';
 return '<h3>Inspector</h3>'+(n?nodeInspector(n):seg?branchInspector(seg):'<p class="muted">Select a connector or cable to inspect it. Drag a port to another port to route a cable.</p>')+
 '<details '+(!n&&!seg?'open':'')+'><summary>Place component</summary>'+select('Unplaced schematic component','fbPart',option('','Choose component')+choices.map(p=>option(p.id,p.name)).join(''))+btn('place','Place at view center')+'</details>'+
 '<details '+(traced?'open':'')+'><summary>Trace a circuit</summary>'+select('Schematic wire','fbTrace',option('','No highlight')+wires)+(traced?'<p class="muted">'+h(endName(traced.w.a))+' → '+h(endName(traced.w.b))+'</p><p>'+h(displayCut(traced).status)+'</p>'+field('Measured wire OD (mm)','fbOD',g.od[view.trace],'Approximate from gauge')+'<div class="fb-actions">'+btn('od','Save OD')+btn('schematicWire','Edit wiring')+'</div>'+bulkheadSelection(traced.w):'')+'</details>'+
 '<details><summary>Cut allowances</summary>'+field('Allowance per end (in)','fbAllowance',g.allowance)+field('Service loop per wire (in)','fbSlack',g.slack)+field('Material waste (%)','fbWaste',g.waste)+btn('settings','Save allowances')+'<p class="muted">The bundle model uses 65% packing by default. Verify insulation OD, sleeve fit and boot fit on the bench.</p></details>';
}
function render(){
 const el=$('t-formboard');if(!el)return;
 const g=graph(),report=analyze(g,S.wires,S.parts);
 if(view.graph!==g){view.cam=null;view.graph=g;view.chosen=null;view.origin=null;}
 const count=report.rows.map(displayCut).filter(r=>r.cut!==null).length;
 const stage=view.page!=='build';
 const hint=view.page==='orbit'?'Drag to orbit · scroll to zoom':view.mode==='junction'?'Click open space to place a breakout':view.origin?'Select a destination port':view.mode==='connect'?'Drag between ports or click two endpoints':'Drag parts to move · drag ports to connect · scroll to zoom';
 const actions=stage?'<div class="fb-actions">'+(view.page==='design'?btn('select','Select',view.mode==='select'?'active':'')+btn('connect','Route',view.mode==='connect'?'active':'')+btn('junction','+ Breakout',view.mode==='junction'?'active':'')+btn('pan','Pan',view.mode==='pan'?'active':''):'')+btn('zoomOut','−')+btn('zoomIn','+')+btn('fit','Fit')+btn('labels',view.details?'Hide labels':'Show labels')+'</div>':
 '<div class="fb-actions">'+btn('svg','Formboard SVG')+btn('cut','Cut list CSV')+btn('bom','Materials CSV')+btn('print','Print build pack','fb-primary')+'</div>';
 el.innerHTML='<header class="fb-header"><div><h2>Physical Formboard</h2><p class="muted">Harness layout and fabrication for '+h(S.wfProjectName||S.projectName||'the active project')+'.</p></div><div class="fb-counts"><span><b>'+g.nodes.length+'</b> nodes</span><span><b>'+g.segments.length+'</b> branches</span><span><b>'+report.rows.filter(r=>r.route?.length).length+' / '+report.rows.length+'</b> wires routed</span><span><b>'+count+'</b> cut lengths</span></div></header>'+
 '<div class="fb-workspace"><div class="fb-bar"><div class="fb-actions">'+btn('design','Design',view.page==='design'?'active':'')+'<button class="btn" data-tab="draw">Wiring</button>'+btn('orbit','3D Routing',view.page==='orbit'?'active':'')+btn('build','Fabrication',view.page==='build'?'active':'')+'</div>'+actions+'</div>'+
 (stage?'<div class="fb-wrap"><div class="fb-stage">'+canvas()+
 (g.nodes.length?'':'<div class="fb-empty"><article><h3>Lay out the harness</h3><p>Generate a draft from the current schematic or start by placing a component.</p>'+btn('seed','Generate starter layout','fb-primary')+'</article></div>')+
 '<div class="fb-overlay"><span class="fb-canvas-help" id="fbHint">'+hint+'</span><span>Layout units · '+(view.page==='orbit'?'3D preview':'inches for entered lengths')+'</span></div></div><aside class="fb-sidebar">'+sidebar(g,report)+
 (view.page==='design'&&g.nodes.length?'<details><summary>Layout setup</summary>'+btn('seed','Regenerate draft')+'</details>':'')+'</aside></div>':
 '<div class="fb-sidebar" style="height:auto;border:0"><p class="muted">Review the branch and wire schedules before cutting. Verify cavity orientation, measurements and fit at the bench.</p><div class="fb-actions"><button class="btn" data-tab="pro">Production Studio</button><button class="btn" data-tab="bom">Electrical parts BOM</button><button class="btn" data-tab="book">Harness Book</button><button class="btn" data-tab="build">Build tracker</button></div></div>')+'</div>'+
 (stage?'':output(g,report));
 if(stage){renderScene(g,report);bindCanvas(g,report);}
}

function position(svg,x,y){
 const p=svg.createSVGPoint();p.x=x;p.y=y;
 return p.matrixTransform(svg.getScreenCTM().inverse());
}
function zoomAt(svg,x,y,factor){
 const p=position(svg,x,y),c=view.cam;
 const actual=Math.max(110,Math.min(22000,c.w*factor))/c.w;
 view.cam={x:p.x-(p.x-c.x)*actual,y:p.y-(p.y-c.y)*actual,w:c.w*actual,h:c.h*actual};
 camera(svg);
}
function route(a,b,g){
 if(!a||!b||a===b)return false;
 if(!g.nodes.some(n=>n.id===a)||!g.nodes.some(n=>n.id===b)||path(g,a,b)!==null){
  toast('These points already share a route. Choose a different endpoint.');
  return false;
 }
 mutate(g=>{
  addSegment(g,a,b);
  view.chosen={id:g.segments.at(-1).id};
  view.origin=null;
 });
 return true;
}
function bindCanvas(g,report){
 const svg=$('wfFormSvg');
 const repaint=()=>renderScene(g,report);
 svg.addEventListener('wheel',e=>{
  e.preventDefault();
  zoomAt(svg,e.clientX,e.clientY,Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.0025));
 },{passive:false});
 svg.addEventListener('pointerdown',e=>{
  if(view.drag||![0,1].includes(e.button))return;
  const p=position(svg,e.clientX,e.clientY);
  const node=e.target.closest('[data-node]')?.dataset.node;
  const port=e.target.closest('[data-port]')?.dataset.port;
  const segment=e.target.closest('[data-seg]')?.dataset.seg;
  const bend=e.target.closest('[data-bend]')?.dataset.bend;
  const xyStart={clientX:e.clientX,clientY:e.clientY,pointerId:e.pointerId};
  if(view.page==='orbit'){
   view.drag={type:e.button===1?'pan':'orbit',cam:{...view.cam},yaw:view.yaw,pitch:view.pitch,...xyStart};
  }else if(e.button===1||view.mode==='pan'||(!node&&!segment&&view.mode==='select')){
   view.drag={type:'pan',cam:{...view.cam},...xyStart};
  }else if(view.mode==='junction'&&!node&&!segment){
   mutate(g=>{view.chosen={id:addNode(g,Math.round(p.x),Math.round(p.y),'Breakout '+g.next).id};view.mode='select';});
   return;
  }else if(port||node&&view.mode==='connect'){
   view.drag={type:'connect',id:port||node,...xyStart};
  }else if(bend&&view.mode==='select'){
   const start=g.segments.find(s=>s.id===bend).bend||point(0,0);
   view.drag={type:'bend',id:bend,start,p,...xyStart};
  }else if(node&&view.mode==='select'){
   const start=g.nodes.find(n=>n.id===node);
   view.chosen={id:node};
   view.drag={type:'node',id:node,start,p,...xyStart};
  }else if(segment&&view.mode==='select'){
   view.chosen={id:segment};
   render();
   return;
  }else{
   return;
  }
  e.preventDefault();
  svg.setPointerCapture(e.pointerId);
 });
 svg.addEventListener('pointermove',e=>{
  const d=view.drag;
  if(!d||d.pointerId!==e.pointerId)return;
  const dx=e.clientX-d.clientX,dy=e.clientY-d.clientY;
  if(Math.hypot(dx,dy)<4&&!d.moved)return;
  d.moved=true;
  if(d.type==='pan'){
   const k=d.cam.w/svg.clientWidth;
   view.cam={...d.cam,x:d.cam.x-dx*k,y:d.cam.y-dy*k};
   camera(svg);
   return;
  }
  if(d.type==='orbit'){
   view.yaw=d.yaw+dx*.009;
   view.pitch=Math.max(-1.35,Math.min(1.35,d.pitch+dy*.009));
   repaint();
   return;
  }
  const a=position(svg,e.clientX,e.clientY);
  if(d.type==='connect')d.to=a;
  else {
   const k=d.type==='bend'?4/3:1;
   d.to=point(Math.round(d.start.x+(a.x-d.p.x)*k),Math.round(d.start.y+(a.y-d.p.y)*k));
  }
  repaint();
 });
 svg.addEventListener('pointerup',e=>{
  const d=view.drag;
  if(!d||d.pointerId!==e.pointerId)return;
  view.drag=null;
  if(d.type==='pan'||d.type==='orbit'){
   if(!d.moved&&view.page==='design'){view.chosen=null;view.origin=null;render();}
   return;
  }
  if(d.type==='connect'){
   if(d.moved){
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]')?.dataset.node;
    view.origin=null;
    if(route(d.id,target,g))return;
   }else if(view.origin&&view.origin!==d.id){
    const start=view.origin;view.origin=null;
    if(route(start,d.id,g))return;
   }else{
    view.origin=view.origin===d.id?null:d.id;
    view.chosen={id:d.id};
   }
  }
  if(d.to&&d.type==='node')return mutate(g=>Object.assign(g.nodes.find(n=>n.id===d.id),d.to));
  if(d.to&&d.type==='bend')return mutate(g=>{g.segments.find(s=>s.id===d.id).bend=d.to;});
  render();
 });
 function cancel(e){
  if(view.drag?.pointerId!==e.pointerId)return;
  view.drag=null;repaint();
 }
 svg.addEventListener('pointercancel',cancel);
 svg.addEventListener('lostpointercapture',cancel);
 svg.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  view.origin=null;view.chosen=null;view.mode='select';render();$('wfFormSvg')?.focus();
 });
}
function saveBranch(s){
 const length=numeric('fbLength'),size=numeric('fbSize');
 if((val('fbLength')&&length===null)||(val('fbSize')&&size===null))return toast('Enter positive dimensions or leave the fields blank.');
 mutate(()=>Object.assign(s,{length,size,label:val('fbSegLabel').trim(),sleeve:val('fbSleeve').trim()}));
}
function saveNode(n){
 const z=val('fbElevation'),rotation=val('fbRotation');
 if([z,rotation].some(v=>v&&!Number.isFinite(Number(v))))return toast('Enter valid preview values.');
 mutate(()=>Object.assign(n,{label:val('fbLabel').trim(),boot:val('fbBoot').trim(),elevation:z===''?null:Number(z),rotation:rotation===''?null:Number(rotation)}));
}
function splitBranch(g,s){
 const a=g.nodes.find(n=>n.id===s.a),b=g.nodes.find(n=>n.id===s.b);
 if(!a||!b)return;
 if(positive(s.length)&&!confirm('Insert a breakout and remeasure both resulting branches?'))return;
 const geometry=curve(a,b,s),p=geometry.sample(.5);
 mutate(g=>{
  const j=addNode(g,p.x,p.y,'Breakout '+g.next);
  g.segments=g.segments.filter(q=>q!==s);
  addSegment(g,a.id,j.id);
  addSegment(g,j.id,b.id);
  for(const segment of g.segments.slice(-2))Object.assign(segment,{sleeve:s.sleeve,size:s.size});
  view.chosen={id:j.id};
 });
}
function applyBulkhead(g,w){
 const p=part(val('fbBulk')),raw=val('fbCavity'),side=val('fbFace');
 const i=Number(raw),t=p&&T[p.t];
 if(!w||!t?.bulk||!raw||!Number.isInteger(i)||!t.pins[i]||!['L','R'].includes(side))return toast('Choose a housing, verified cavity and entry face.');
 if(w.tw||[w.a.p,w.b.p].includes(p.id))return toast('This wire requires editing in the wiring diagram.');
 if(usedOn(p.id,i).length)return toast('That cavity is already used. Choose an unused, verified cavity.');
 if(!confirm('Split this circuit at '+p.name+' cavity '+pinId(p,i)+'? Existing endpoints stay connected through the cavity. Measure both resulting legs.'))return;
 mutate(()=>{
  const first={p:p.id,i,s:side},second={...first,s:side==='L'?'R':'L'};
  const {a,b,...attrs}=w;
  const reset={len:0,proAllowance:'',proBranch:''};
  for(const field of ['v','auditStatus','auditNotes','autoRoute'])delete attrs[field];
  const next={...attrs,...reset,id:nid(),a:second,b};
  const original={...attrs,...reset,a,b:first};
  S.wires.splice(S.wires.indexOf(w),1,original,next);
  delete g.od[key(next.id)];
  if(positive(g.od[key(w.id)]))g.od[key(next.id)]=g.od[key(w.id)];
  S.examples=false;
  view.bulk=null;
 });
 toast('Bulkhead added to the circuit. Place its component on the formboard and measure the two routes.');
}
function printableSvg(g,report){
 const before={page:view.page,details:view.details,trace:view.trace,chosen:view.chosen,drag:view.drag};
 Object.assign(view,{page:'design',details:true,trace:null,chosen:null,drag:null});
 try{
  const box=boardBounds(g);
  return '<svg xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif" width="'+box.w+'" height="'+box.h+'" viewBox="'+[box.x,box.y,box.w,box.h].join(' ')+'">'+art.definitions()+'<rect x="'+box.x+'" y="'+box.y+'" width="'+box.w+'" height="'+box.h+'" fill="#edf2f3"/>'+scene(g,report)+'</svg>';
 }finally{Object.assign(view,before);}
}
function printPack(g,report){
 const w=window.open('','_blank');
 if(!w)return toast('Allow pop-ups to print the build pack.');
 const project=h(S.wfProjectName||S.projectName||'WireForge harness');
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+project+' · Fabrication</title><style>body{font:13px system-ui;color:#19313c;margin:24px}h1{margin-bottom:4px}svg{display:block;width:100%;height:auto;max-height:65vh;print-color-adjust:exact;-webkit-print-color-adjust:exact}table{width:100%;border-collapse:collapse}td,th{padding:5px;border:1px solid #b2c2c8;text-align:left}tr{break-inside:avoid}small{display:block}caption{text-align:left}</style></head><body><h1>'+project+'</h1><p>Fabrication worksheet · Reference layout. Use the entered dimensions and verify hardware and pin orientation before assembly.</p>'+printableSvg(g,report)+output(g,report,true)+'</body></html>');
 w.document.close();
 w.focus();
 w.print();
}

document.addEventListener('click',e=>{
 const button=e.target.closest('#t-formboard [data-fb]');
 if(!button)return;
 const action=button.dataset.fb,g=graph();
 const n=g.nodes.find(n=>n.id===view.chosen?.id),s=g.segments.find(s=>s.id===view.chosen?.id);
 if(['design','orbit','build'].includes(action)){
  view.page=action;view.origin=null;if(action==='orbit')view.cam=null;render();return;
 }
 if(['select','connect','junction','pan'].includes(action)){
  view.mode=action;view.origin=null;render();return;
 }
 if(action==='labels'){view.details=!view.details;render();return;}
 if(action==='fit'){fit(g);camera($('wfFormSvg'));renderScene(g,analyze(g,S.wires,S.parts));return;}
 if(action==='zoomIn'||action==='zoomOut'){
  const svg=$('wfFormSvg'),r=svg.getBoundingClientRect();
  zoomAt(svg,r.x+r.width/2,r.y+r.height/2,action==='zoomIn'?.8:1.25);return;
 }
 if(action==='resetOrbit'){view.yaw=.32;view.pitch=.51;render();return;}
 if(action==='seed'){
  if(g.nodes.length&&!confirm('Replace the physical layout and its measurements with a draft from the wiring diagram?'))return;
  mutate(()=>{
   S.wfFormboard=seed(S.parts,S.wires);view.chosen=null;view.trace=null;view.origin=null;view.cam=null;view.mode='select';
  });
  return;
 }
 if(action==='place'){
  const p=part(val('fbPart'));
  if(!p)return toast('Choose a schematic component.');
  if(g.nodes.some(n=>key(n.partId)===key(p.id)))return toast('That component is already placed.');
  const c=view.cam;
  mutate(g=>{
   view.chosen={id:addNode(g,Math.round(c.x+c.w/2),Math.round(c.y+c.h/2),p.name,p.id).id};
  });
  return;
 }
 if(action==='nodeSave'&&n)return saveNode(n);
 if(action==='segSave'&&s)return saveBranch(s);
 if(action==='split'&&s)return splitBranch(g,s);
 if(action==='resetCurve'&&s&&s.bend)return mutate(()=>{delete s.bend;});
 if(action==='delete'&&(n||s)){
  if(!confirm('Remove this item from the physical layout?'))return;
  mutate(g=>{
   if(n){
    g.nodes=g.nodes.filter(q=>q!==n);
    g.segments=g.segments.filter(q=>q.a!==n.id&&q.b!==n.id);
   }else g.segments=g.segments.filter(q=>q!==s);
   view.chosen=null;view.origin=null;
  });
  return;
 }
 if(action==='settings'){
  const allowance=numeric('fbAllowance',true),slack=numeric('fbSlack',true),waste=numeric('fbWaste',true);
  if([allowance,slack,waste].includes(null))return toast('Enter nonnegative allowances and waste.');
  return mutate(g=>Object.assign(g,{allowance,slack,waste}));
 }
 if(action==='od'&&view.trace){
  const od=numeric('fbOD');
  if(val('fbOD')&&od===null)return toast('Enter a positive diameter or leave it blank.');
  return mutate(g=>{if(od===null)delete g.od[view.trace];else g.od[view.trace]=od;});
 }
 if(action==='trace'){view.trace=key(button.dataset.wire);view.bulk=null;view.page='design';render();return;}
 if(action==='schematicPart'&&n&&part(n.partId)){
  selection={type:'part',id:n.partId};pending=null;showTab('draw');return;
 }
 if(action==='schematicWire'&&wireById(view.trace)){
  selection={type:'wire',id:wireById(view.trace).id};pending=null;showTab('draw');return;
 }
 if(action==='hardware3d')return wf3dOpen();
 if(action==='bulkApply')return applyBulkhead(g,wireById(view.trace));
 const report=analyze(g,S.wires,S.parts);
 if(action==='print')return printPack(g,report);
 if(action==='cut')return csv('wireforge-formboard-cut-list.csv',[cutHeaders,...cutRows(report)]);
 if(action==='bom')return csv('wireforge-formboard-materials.csv',[bomHeaders,...materials(g,report).map(r=>[r.kind,r.name,r.variant,r.qty,r.unit,r.total,r.status])]);
 if(action==='svg')downloadTextFile('wireforge-physical-formboard.svg',printableSvg(g,report),'image/svg+xml');
});
document.addEventListener('change',e=>{
 if(e.target.id==='fbTrace'){view.trace=e.target.value||null;view.bulk=null;render();}
 if(e.target.id==='fbQuery'){view.query=e.target.value.toLowerCase();render();}
 if(e.target.id==='fbBulk'){view.bulk=e.target.value||null;render();$('fbBulk')?.closest('details')?.setAttribute('open','');}
});
root.WFFormboard={...api,render,report:()=>analyze(graph(),S.wires,S.parts)};
})(typeof window!=='undefined'?window:null);
