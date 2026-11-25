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
function legacySeed(parts,wires){
 const g=fresh(),used=new Set(wires.flatMap(w=>[key(w.a?.p),key(w.b?.p)]));
 const ordered=parts.filter(p=>used.has(key(p.id))).slice().sort((a,b)=>(Number(a.x)||0)-(Number(b.x)||0)||(Number(a.y)||0)-(Number(b.y)||0));
 // Draft trunk in schematic x-order; no inferred physical dimensions.
 for(let i=0;i<ordered.length;i+=4){
 const x=100+Math.floor(i/4)*470,j=addNode(g,x,300,'Breakout '+(Math.floor(i/4)+1));
 const prev=g.nodes.filter(n=>n.partId==null).at(-2);if(prev)addSegment(g,prev.id,j.id);
 ordered.slice(i,i+4).forEach((p,k)=>{const px=x+(k%2===0?-130:130),py=k<2?85:520;const n=addNode(g,px,py,p.name||'Connector '+p.id,p.id);addSegment(g,j.id,n.id);});
 }return g;
}
function seed(parts,wires){
 const g=fresh(),used=new Set(wires.flatMap(w=>[key(w.a?.p),key(w.b?.p)]));
 const connected=parts.filter(p=>used.has(key(p.id))).sort((a,b)=>(a.x||0)-(b.x||0)||(a.y||0)-(b.y||0));
 // Start with a staging area. Electrical continuity alone cannot locate a loom split.
 const columns=Math.max(1,Math.ceil(Math.sqrt(connected.length*1.6)));
 connected.forEach((p,i)=>addNode(g,130+(i%columns)*230,85+Math.floor(i/columns)*125,p.name||'Connector '+p.id,p.id));
 return g;
}
const inspectedLayouts=new WeakSet();
function upgradeStarter(g,parts,wires){
 if(inspectedLayouts.has(g))return false;
 inspectedLayouts.add(g);
 if(!g.nodes.some(n=>n.partId==null&&n.label==='Breakout 1'))return false;
 const old=legacySeed(parts,wires);
 if(JSON.stringify(old.nodes)!==JSON.stringify(g.nodes)||JSON.stringify(old.segments)!==JSON.stringify(g.segments))return false;
 const next=seed(parts,wires);
 Object.assign(g,{nodes:next.nodes,segments:next.segments,next:next.next});
 return true;
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
 const members=bySeg.get(s.id)||[],ds=members.map(w=>positive(g.od?.[key(w.id)])?Number(g.od[key(w.id)]):typical[w.awg]||null);
 const estimated=members.some(w=>!positive(g.od?.[key(w.id)]));
 const d=ds.length&&ds.every(positive)&&positive(g.packing)&&g.packing<=1?Math.sqrt(ds.reduce((v,d)=>v+d*d,0)/g.packing):null;
 return {s,members,d,estimated};
 });
 return {rows,bundles};
}
const api={fresh,path,addSegment,addNode,seed,analyze,upgradeStarter};
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
 S.wfFormboard.od??={};
 if(upgradeStarter(S.wfFormboard,S.parts,S.wires))save();
 return S.wfFormboard;
}
function mutate(fn){
 commit();
 fn(graph());
 save();
 render();
}
function caption(n,p){return String(n.label||p?.name||(n.partId==null?'Breakout':'Connector'));}
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
 const width=svg?.clientWidth||840;
 if(detail&&box.w>1750)box.w=Math.max(650,width*1.1);
 const ratio=width/(svg?.clientHeight||580);
 const w=Math.max(box.w,box.h*ratio),height=w/ratio;
 view.cam={x:box.x+(box.w-w)/2,y:box.y+(box.h-height)/2,w,h:height};
}
function camera(svg,box=view.cam){
 svg.setAttribute('viewBox',[box.x,box.y,box.w,box.h].join(' '));
 const paper=svg.querySelector('#fb-paper');
 if(paper)for(const [name,v] of Object.entries({x:box.x,y:box.y,width:box.w,height:box.h}))paper.setAttribute(name,v);
}

function wiresMarkup(bundle,c,active){
 const {s,members}=bundle,n=members.length,gap=9,N=28;
 const pts=Array.from({length:N+1},(_,i)=>c.sample(i/N));
 const out=members.map((w,k)=>{
  const off=(k-(n-1)/2)*gap,line=pts.map((p,i)=>{
   const a=pts[Math.max(0,i-1)],b=pts[Math.min(N,i+1)],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
   return point(p.x-dy/L*off,p.y+dx/L*off);
  });
  const d='M'+line.map(xy).join(' L'),on=key(w.id)===view.trace||(view.wsel===w.id),inChain=active.has(s.id)&&on;
  const col=cpart(w.color,0)||'#8e9ca3',stripe=cpart(w.color,1);
  const mid=line[Math.floor(N/2)];
  return `<g data-wire-hit="${h(w.id)}"><title>${h(wireName(w))} · ${h(w.color||'color TBD')} · ${h(endWho(w.a))} → ${h(endWho(w.b))}</title>
  <path d="${d}" stroke="transparent" stroke-width="${gap+1}" fill="none" stroke-linecap="round"/>
  ${on?`<path d="${d}" stroke="#4fd1c5" stroke-opacity=".55" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:''}
  <path d="${d}" stroke="#10181b" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" stroke="${col}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${stripe?`<path d="${d}" stroke="${stripe}" stroke-width="3.2" stroke-dasharray="4 5" fill="none" stroke-linejoin="round"/>`:''}
  ${n<=6||on?`<text x="${mid.x}" y="${mid.y-6}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1b3440" stroke="#edf2f3" stroke-width="2.6" paint-order="stroke" pointer-events="none">${h(w.wid||'#'+w.id)}</text>`:''}</g>`;
 }).join('');
 return `<g data-seg="${h(s.id)}" data-look="wires">${out}</g>`;
}
function branchMarkup(bundle,c,active,orbit){
 const {s,members}=bundle;
 if(view.look==='wires'&&!orbit&&members.length&&!view.advanced)return wiresMarkup(bundle,c,active);
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
 const studioLabel=!view.advanced&&view.details&&!orbit;
 const band=s.label||s.sleeve||'';
 const widthLabel=Math.max(26,Math.min(140,band.length*6+12));
 const labels=studioLabel?`<g transform="translate(${xy(mid)}) rotate(${textAngle})">${band?`<rect x="${-widthLabel/2}" y="-7" width="${widthLabel}" height="14" rx="2" fill="#f4d452"/><text text-anchor="middle" y="3.5" fill="#17191a" font-size="10" font-weight="800">${h(band.slice(0,21))}</text>`:''}${positive(s.length)?`<text text-anchor="middle" y="24" fill="#333" font-size="10">${h(dim)}</text>`:''}</g>`:view.details&&!orbit?`<g transform="translate(${xy(mid)}) rotate(${textAngle})"><rect x="-23" y="-29" width="46" height="15" rx="3" fill="#f9fbfa" stroke="${selected?'#008d82':'#a6b8bd'}"/><text y="-18.5" fill="#253a43" text-anchor="middle" font-size="9" font-weight="700">${h(dim)}</text><text y="22" stroke="#edf2f3" stroke-width="3" paint-order="stroke" text-anchor="middle" fill="#354c55" font-size="10" font-weight="700">${h(belt+(sleeve?' · '+sleeve+(positive(s.size)?' '+num(s.size)+' mm':''):''))}</text></g>`:'';
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
 const type=p&&T[p.t],connector=n.partId!=null,chosen=view.chosen?.id===n.id||view.origin===n.id||view.drag?.target===n.id;
 const target=project(n),near=neighbors[0];
 const rotation=Number.isFinite(n.rotation)?n.rotation:(near?angle(near,n):0);
 const displayAngle=angle(target,project(point(n.x+Math.cos(rotation*Math.PI/180)*45,n.y+Math.sin(rotation*Math.PI/180)*45)));
 const bodyAngle=orbit?displayAngle:rotation;
 const label=caption(n,p);
 const family=type?.fam;
 const shellLength=family==='mxecu'?(p.t==='mxrace48'||p.t==='mxpig48'?94:76):family==='mx'?110:family==='term'?47:family==='bulk'||family==='maven'?72:family==='dt'||family==='pwr'?64:51;
 const center=point(target.x+Math.cos(bodyAngle*Math.PI/180)*shellLength*.54,target.y+Math.sin(bodyAngle*Math.PI/180)*shellLength*.54);
 const boot=n.boot?`<path d="M-26-5H-16L-8-11H4V11H-8L-16 5H-26Z" fill="url(#fb-rubber)" stroke="#1c282d"/><path d="M-19-5V5M-11-8V8M-4-10V10" stroke="#65767c" stroke-opacity=".5"/>`:'';
 let tails='';
 if(p?.wfFlying||p?.wfLeadDrafts||T[p?.t]?.pigtail){
  const wired=new Set(S.wires.flatMap(w=>[w.a,w.b]).filter(end=>end.p===p.id).map(end=>end.i));
  const count=type.pins.length;
  tails=type.pins.map((pin,i)=>{
   if(wired.has(i)||(!p.wfFlying&&!T[p.t]?.pigtail&&!p.wfLeadDrafts?.[i]))return '';
   const off=p.wfUnused?.[i];
   if(count<=8){
    const dy=(i-(count-1)/2)*8,dx=-46-(i%2)*8,draft=p.wfLeadDrafts?.[i]||{},col=(typeof cpart==='function'&&cpart(draft.color,0))||'#8e9ca3',labelOf=h(pin.p);
    return `<g><title>${labelOf} · ${off?'unused lead':'flying lead'}${draft.sig?' · '+h(draft.sig):''}</title><path d="M0 ${dy*.35} C-16 ${dy*.35} -18 ${dy} ${dx} ${dy}" fill="none" stroke="#10181b" stroke-width="3.6" stroke-linecap="round"/><path d="M0 ${dy*.35} C-16 ${dy*.35} -18 ${dy} ${dx} ${dy}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>${off?`<path d="M${dx-2} ${dy-3}l-6 6M${dx-8} ${dy-3}l6 6" stroke="#c4564f" stroke-width="1.6"/>`:`<rect x="${dx-7}" y="${dy-2.2}" width="7" height="4.4" rx="1" fill="#d5bb87" stroke="#756448" stroke-width=".8"/>`}<text x="${dx-12}" y="${dy+2.6}" text-anchor="end" font-size="7.5" font-weight="700" fill="#1b3440" stroke="#edf2f3" stroke-width="2.4" paint-order="stroke" transform="rotate(${-bodyAngle} ${dx-12} ${dy})" pointer-events="none">${labelOf}</text>${!view.advanced&&!orbit?`<circle data-lead-tip="${i}" cx="${dx-6}" cy="${dy}" r="7" fill="transparent" pointer-events="all"/>`:''}</g>`;
   }
   const dy=(i-(count-1)/2)*1.65,dx=-52-(i%4)*4;
   return `<g pointer-events="none"><title>${h(pin.p)} · ${off?'unused lead':'flying lead'}</title><path d="M0 0 Q-20 0 ${dx} ${dy}" fill="none" stroke="#677984" stroke-width="1.2"/><path d="M${dx} ${dy}h-4" stroke="#b18b5e"/>${!view.advanced&&!orbit?`<circle data-lead-tip="${i}" cx="${dx-4}" cy="${dy}" r="3" fill="transparent" pointer-events="all"/>`:''}</g>`;
  }).join('');
 }
 const port=orbit?'':`<circle data-port="${h(n.id)}" class="fb-node-mark" r="${connector?6:6}" fill="${chosen?'#007e73':'#e0f2ed'}" stroke="#42686a" stroke-width="1.7"><title>Drag port to another port to route</title></circle>`;
 const rad=bodyAngle*Math.PI/180;
 const bottomOfShell=target.y+Math.max(0,Math.sin(rad)*shellLength)+Math.abs(Math.cos(rad))*23;
 const centerY=connector?(view.advanced?center.y+34:bottomOfShell+15):target.y+24;
 const text=view.details?`<text x="${connector?center.x:target.x}" y="${centerY}" text-anchor="middle" fill="#1b3440" stroke="#edf2f3" stroke-width="4" paint-order="stroke" font-size="11" font-weight="700">${h(label.length>35?label.slice(0,33)+'…':label)}</text>`:'';
 return `<g data-node="${h(n.id)}"><title>${h(label)}</title>
 <g transform="translate(${xy(target)}) rotate(${bodyAngle})">
 ${connector?`<path class="fb-node-mark" d="M-28-28H${shellLength+4}V29H-28Z" fill="transparent" stroke="${chosen?'#008d82':'transparent'}" rx="4" stroke-dasharray="4 3"/>${tails}${boot}${art.hardware(family,p?.t)}`:
 `<circle r="20" fill="#4fd1c5" fill-opacity="${chosen?.18:.07}"/><circle class="fb-node-mark" r="12" fill="#273d43" stroke="${chosen?'#008d82':'#738a90'}" stroke-width="2"/>`}${port}</g>${text}</g>`;
}
function scene(g,report){
 const moved=view.drag?.type==='node'&&view.drag.to,reshaped=view.drag?.type==='bend'&&view.drag.to;
 const nodes=g.nodes.map(n=>moved&&n.id===view.drag.id?{...n,...moved}:n);
 const ns=new Map(nodes.map(n=>[n.id,n])),parts=lookup(),neighbors=new Map();
 const tw=S.wires.find(w=>key(w.id)===view.trace),tchain=tw?chain(tw):[];
 const active=new Set(report.rows.filter(r=>tchain.includes(r.w)).flatMap(r=>r.route?.map(s=>s.id)||[]));
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
 const byPart=new Map(nodes.filter(n=>n.partId!=null).map(n=>[key(n.partId),n]));
 const guides=new Map();
 if(!orbit&&view.guides!==false)for(const {w,route} of report.rows){
  if(route!==null)continue;
  const a=byPart.get(key(w.a.p)),b=byPart.get(key(w.b.p));
  if(!a||!b||a===b)continue;
  const id=[a.id,b.id].sort().join('/');
  if(!guides.has(id))guides.set(id,{a,b,count:0});guides.get(id).count++;
 }
 const guideMarkup=[...guides.values()].map(({a,b,count})=>`<path data-wiring-guide="" d="${curve(a,b,{}).path}" fill="none" stroke="#718d99" stroke-opacity=".52" stroke-width="1.5" stroke-dasharray="5 6" pointer-events="none"><title>${count} electrical connections · physical route pending</title></path>`).join('');
 const components=nodes.map(n=>nodeMarkup(n,parts.get(key(n.partId)),neighbors.get(n.id)||[],project,orbit)).join('');
 const from=view.drag?.type==='lead'?view.drag.start:view.drag?.type==='connect'?ns.get(view.drag.id):null,to=view.drag?.to;
 const preview=from&&to?`<path d="${curve(from,to,{}).path}" fill="none" stroke="#008578" stroke-width="3" stroke-dasharray="6 4" pointer-events="none"/>`:'';
 return guideMarkup+branches+components+preview;
}
function renderScene(g,report){
 const svg=$('wfFormSvg');if(!svg)return;
 if(!view.cam)fit(g,view.page==='design');
 camera(svg);
 svg.querySelector('#fb-scene').innerHTML=scene(g,report);
}
function canvas(){
 return '<svg id="wfFormSvg" xmlns="http://www.w3.org/2000/svg" data-mode="'+view.mode+'" tabindex="0" role="group" aria-label="Physical harness canvas" font-family="system-ui,sans-serif">'+art.definitions()+'<rect id="fb-paper" fill="#f6f6f3"/><rect x="-1000000" y="-1000000" width="2000000" height="2000000" fill="url(#fb-grid)"/><g id="fb-scene"></g></svg>';
}

function wireName(w){return w.wid?w.wid+(w.sig?' · '+w.sig:''):(w.sig||'Wire '+w.id);}
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
 const shields=new Map();
 function add(kind,name,variant,amount,unit,status){
  const id=JSON.stringify([kind,name,variant,unit,status]);
  if(!groups.has(id))groups.set(id,{kind,name,variant,unit,status,qty:0});
  groups.get(id).qty+=amount;
 }
 for(const n of g.nodes){
  const p=n.partId==null?null:part(n.partId),t=p&&T[p.t];
  if(t&&!t.node)add('Hardware',t.name,t.pn||'',1,'ea',t.pn?'Catalog reference · verify installed part':'Part number TBD');
  for(const pin of Object.values(p?.wfTerminations||{})){
   if(pin.contact)add('Contact',pin.contact,'',1,'ea','User specified');
   if(pin.seal)add('Seal / plug',pin.seal,'',1,'ea','User specified');
  }
  if(n.boot)add('Boot',n.boot,'',1,'ea','Verify fit');
 }
 for(const {s} of report.bundles){
  if(!s.sleeve)continue;
  const variant=positive(s.size)?num(s.size)+' mm ID':'ID TBD';
  if(positive(s.length))add('Covering',s.sleeve,variant,Number(s.length),'in','Measured branch');
  else add('Covering',s.sleeve,variant,1,'branch','Length TBD');
 }
 for(const r of report.rows.map(displayCut)){
  const sh=r.w.wfShield;if(sh)shields.set(sh.id,sh);
  for(const marker of r.w.wfMarkers||[])add('Marker',marker,'',1,'ea','User specified');
  if(r.w.wfSupplied){add('Supplied lead',(T[[part(r.w.a.p),part(r.w.b.p)].find(x=>x&&T[x.t]?.suppliedLeads)?.t]?.name||'Prewired socket')+' · '+(wireName(r.w)),[r.w.awg?r.w.awg+' AWG':'AWG TBD',r.w.color||'color TBD'].join(' · '),1,'ea','Supplied with socket · not cut');continue;}
  const spec=[r.w.wfWirePart,r.w.color||'Color TBD'].filter(Boolean).join(' · ');
  if(r.cut!==null)add('Wire',r.w.awg?r.w.awg+' AWG':'AWG TBD',spec,r.cut,'in',r.status);
  else add('Wire',r.w.awg?r.w.awg+' AWG':'AWG TBD',spec,1,'wire',r.status);
 }
 for(const sh of shields.values())add('Shield',sh.part,(sh.from||'Source TBD')+' → '+(sh.to||'Target TBD'),1,'assembly','Measure shield length');
 return [...groups.values()].map(row=>({...row,total:row.unit==='in'?row.qty*(1+Number(g.waste)/100):row.qty}));
}
function cutRows(report){
 return report.rows.map(displayCut).map(r=>r.w.wfSupplied?[r.w.id,wireName(r.w),endName(r.w.a),endName(r.w.b),r.w.awg,r.w.color,r.route?.map(s=>s.id).join(' / ')||'','','','','Supplied with socket · not cut']:[r.w.id,wireName(r.w),endName(r.w.a),endName(r.w.b),r.w.awg,r.w.color,r.route?.map(s=>s.id).join(' / ')||'',r.run,r.cut==null?'':r.cut-r.run,r.cut,r.status]);
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
function conductorView(members){
 if(!members.length)return '';
 const radius=Math.min(12,40/Math.sqrt(members.length));
 const dots=members.map((w,i)=>{
  const distance=(45-radius)*Math.sqrt((i+.25)/members.length),angle=i*2.39996;
  const cx=54+distance*Math.cos(angle),cy=54+distance*Math.sin(angle);
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+radius+'" fill="'+h(cpart(w.color,0)||'#8c9294')+'" stroke="'+(view.trace===key(w.id)?'#67a5ff':'#222')+'" stroke-width="1.5"><title>'+h(wireName(w))+'</title></circle>';
 }).join('');
 return '<svg class="ds-conductors" role="img" aria-label="Cable conductors, schematic cross-section" viewBox="0 0 108 108"><circle cx="54" cy="54" r="51" fill="#141819" stroke="#899093" stroke-width="2"/>'+dots+'</svg>';
}
function branchInspector(seg){
 const {s,members,d,estimated}=seg;
 return '<div class="fb-panel-title">Branch '+h(s.id)+'</div>'+(s.needsMeasure&&!positive(s.length)?'<p class="ds-assume"><b>Needs measuring.</b> This branch was split'+(s.wasLength?' from a '+num(s.wasLength)+' in cable':'')+'. Enter its measured length.</p>':'')+(!view.advanced?conductorView(members):'')+input('Cable label','fbSegLabel',s.label)+
 '<div class="fb-unit">'+field('Measured length (in)','fbLength',s.length,'TBD')+field('Sleeve ID (mm)','fbSize',s.size,'TBD')+'</div>'+
 '<label>Covering<input id="fbSleeve" list="fbCoverings" value="'+h(s.sleeve)+'" placeholder="Unspecified"></label><datalist id="fbCoverings"><option value="DR-25"><option value="Braided PET"><option value="Split loom"></datalist>'+
 '<p class="muted">'+members.length+' wires · '+(d?(estimated?'Approx. ':'Modeled ')+num(d)+' mm bundle OD':'Bundle OD TBD')+'</p><div class="fb-actions">'+btn('segSave','Save branch','fb-primary')+btn('split','Insert breakout')+btn('resetCurve','Reset curve')+btn('delete','Remove')+'</div>'+
 '<div class="fb-members">'+members.map(w=>'<button type="button" data-fb="trace" data-wire="'+h(w.id)+'">'+h(wireName(w))+'</button>').join('')+'</div>'+(members.length?'<div class="ds-exits"><h4>Wires in this loom</h4>'+exitList(seg,graph())+'</div>':'');
}
function nodeInspector(n){
 const p=part(n.partId),t=p&&T[p.t],hardware=n.partId!=null;
 return '<div class="fb-panel-title">'+(hardware?'Component':'Breakout')+'</div>'+
 (hardware?'<p class="muted">'+h(t?.name||'Schematic component unavailable')+(t?.pn?' · '+h(t.pn):'')+'</p>':'')+
 input('Canvas label','fbLabel',n.label)+(hardware?input('Cable boot part / label','fbBoot',n.boot,'Unspecified'):'')+
 '<div class="fb-unit"><label>Preview depth<input id="fbElevation" type="number" step="1" value="'+h(n.elevation??'')+'" placeholder="0"></label>'+
 (hardware?'<label>Rotation (°)<input id="fbRotation" type="number" step="1" value="'+h(n.rotation??'')+'" placeholder="Auto"></label>':'')+'</div>'+
 '<div class="fb-actions">'+btn('nodeSave','Save component','fb-primary')+btn('delete','Remove')+'</div>'+(hardware?btn('pinSchedule','Pin configuration')+(p.wfFlying||p.t==='mxrace32'||p.t==='mxrace48'?btn('flyingPart','Show flying leads'):'')+pins(n):'');
}
function bulkheadSelection(w){
 const choices=S.parts.filter(p=>T[p.t]?.bulk&&key(w.a.p)!==key(p.id)&&key(w.b.p)!==key(p.id));
 if(!choices.length)return '<p class="muted">Place a bulkhead in the wiring diagram to record a pass-through.</p>';
 return '<details class="fb-bulk" '+(view.bulk?'open':'')+'><summary>Route through bulkhead</summary>'+
 (w.tw||w.wfShield?'<p class="muted">Edit the grouped wires together in Pin configuration.</p>':
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
 '<details '+(!n&&!seg?'open':'')+'><summary>Place component</summary>'+select('Unplaced schematic component','fbPart',option('','Choose component')+choices.map(p=>option(p.id,p.name)).join(''))+btn('place','Place at view center')+select('Power hardware','fbHardware',powerHardware.map(t=>option(t,T[t].name)).join(''))+btn('addHardware','Add hardware')+'</details>'+
 '<details '+(traced?'open':'')+'><summary>Trace a circuit</summary>'+select('Schematic wire','fbTrace',option('','No highlight')+wires)+(traced?'<p class="muted">'+h(endName(traced.w.a))+' → '+h(endName(traced.w.b))+'</p><p>'+h(displayCut(traced).status)+'</p>'+field('Measured wire OD (mm)','fbOD',g.od[view.trace],'Approximate from gauge')+'<div class="fb-actions">'+btn('od','Save OD')+btn('schematicWire','Edit wiring')+'</div>'+bulkheadSelection(traced.w):'')+'</details>'+
 '<details><summary>Cut allowances</summary>'+field('Allowance per end (in)','fbAllowance',g.allowance)+field('Service loop per wire (in)','fbSlack',g.slack)+field('Material waste (%)','fbWaste',g.waste)+btn('settings','Save allowances')+'<p class="muted">The bundle model uses 65% packing by default. Verify insulation OD, sleeve fit and boot fit on the bench.</p></details>';
}
const powerHardware=['relay4','relay','rp4','rp5','dual','e90leash1','fuse6'];
function placeHardware(g,t,name,x,y,sx,sy){
 const p={id:nid(),t,name,pl:{},x:sx,y:sy};
 if(T[t]?.pigtail)p.wfFlying=true;
 S.parts.push(p);S.examples=false;
 return addNode(g,x,y,T[t]?.short||name,p.id);
}
function focusWire(g,w){
 const svg=$('wfFormSvg');if(!svg||!w)return;
 const ends=chain(w).flatMap(x=>[x.a.p,x.b.p]),ns=g.nodes.length<=10?g.nodes:g.nodes.filter(n=>ends.includes(n.partId));
 if(!ns.length)return;
 const x0=Math.min(...ns.map(n=>n.x))-90,x1=Math.max(...ns.map(n=>n.x))+130,y0=Math.min(...ns.map(n=>n.y))-80,y1=Math.max(...ns.map(n=>n.y))+110;
 const W=svg.clientWidth,H=svg.clientHeight,left=W>900?120:20,panel=W>900?Math.min(340,W*.42)+20:0,vw=Math.max(240,W-left-panel);
 const k=Math.max((x1-x0)/vw,(y1-y0)/(H*.7),.3);
 view.cam={x:(x0+x1)/2-(left+vw/2)*k,y:(y0+y1)/2-H/2*k,w:W*k,h:H*k};
}
function focusLoom(g){
 const n=g.nodes.find(n=>part(n.partId)?.t==='hd30_47'&&part(n.partId)?.wfHd30Loom);
 if(!n)return false;
 const svg=$('wfFormSvg'),ratio=(svg?.clientWidth||800)/(svg?.clientHeight||560);
 const w=Math.max(1170,640*ratio),height=w/ratio;
 view.cam={x:n.x+100-w/2,y:n.y+140-height/2,w,h:height};view.chosen={id:n.id};view.page='design';return true;
}
function insertLoom(){
 const g=graph();
 if(S.parts.some(p=>p.wfHd30Loom)){if(focusLoom(g))render();else toast('Your project already contains the loom. Place its bulkhead from the schematic.');return;}
 mutate(()=>{
  const x=g.nodes.length?Math.max(...g.nodes.map(n=>n.x))+450:120;
  const sx=S.parts.length?Math.max(...S.parts.map(p=>p.x))+650:0;
  function component(t,name,dx,dy,row){
   const n=placeHardware(g,t,name,x+dx,dy,sx+dx*2,row);
   part(n.partId).wfHd30Loom=true;
   return n;
  }
  const c1=component('mxrace48','C1 · RACE main',0,95,0);
  const c2=component('mxrace32','C2 · RACE auxiliary',0,385,1650);
  const a=component('hd30_47','BH-A · HD30 main',300,115,0);
  const b=component('hd30_47','BH-B · HD30 auxiliary',300,365,1650);

  const power=component('e90dt12','Power · DT12 interface',770,60,0);
  const analog=component('e90analog8','Analog · DT8 interface',770,245,620);
  const ctrl=component('e90can8','Control · DT8 interface',770,430,1200);
  const portrait=!view.advanced&&window.matchMedia('(max-width:650px)').matches;
  if(portrait){
   for(const [node,dx,dy,rotation] of [[c1,0,100,-90],[c2,180,100,-90],[a,15,330,90],[b,165,360,90],[power,-40,555,90],[analog,85,595,90],[ctrl,210,555,90]])Object.assign(node,{x:x+dx,y:dy,rotation});
  }
  const endpoints={
   'C1:C4':[power,3],'C1:B1':[power,4],'C1:D4':[power,5],
   'C1:G1':[analog,1],'C1:H1':[analog,2],'C1:J1':[analog,3],
   'C2:E4':[analog,5],'C2:F1':[analog,6],'C1:A1':[analog,8],
   'C1:E2':[ctrl,1],'C1:E1':[ctrl,2],'C1:K3':[ctrl,3],
   'C1:K4':[ctrl,4],'C2:F3':[ctrl,5],'C2:F4':[ctrl,6],'C1:E4':[ctrl,7]
  };
  function cable(from,to,label){
   addSegment(g,from.id,to.id);
   Object.assign(g.segments.at(-1),{label,sleeve:'DR-25'});
   if(portrait)g.segments.at(-1).bend={x:from===c1?-22:18,y:0};
  }
  cable(c1,a,'C1 / MAIN');cable(c2,b,'C2 / AUX');

  function wire(from,to,sig){
   S.wires.push(mkW(from,to,{id:nid(),sig,awg:0,color:'',measuredOnly:true,autoRoute:true}));
  }
  function bank(prefix,ecu,bulk,hold){
   const housing=part(bulk.partId);
   let cavity=0;
   T[part(ecu.partId).t].pins.forEach(({p,l},i)=>{
    if(hold.includes(p))return;
    const slot=cavity++;
    if(l.startsWith('EGT')){
     housing.pl[slot]=p+' · '+l+' reserved / thermocouple pass-through TBD';
     return;
    }
    housing.pl[slot]=l;
    wire({p:ecu.partId,i},{p:housing.id,i:slot,s:'R'},l);
    const end=endpoints[prefix+':'+p];
    if(end)wire({p:housing.id,i:slot,s:'L'},{p:end[0].partId,i:end[1]-1},l);
   });
  }
  bank('C1',c1,a,['L4','M4']);bank('C2',c2,b,['G4']);
  focusLoom(g);
  if(portrait){const r=$('wfFormSvg').getBoundingClientRect(),w=Math.max(415,930*r.width/r.height),height=w*r.height/r.width;view.cam={x:x+85-w/2,y:345-height/2,w,h:height};}
  if(!view.advanced)view.chosen=null;
 });
}
const leadTypes={
 mxpig48:'MaxxECU RACE C1 · 48-pin prewired pigtail',
 mxpig32:'MaxxECU RACE C2 · 32-pin prewired pigtail',
 mxrace32:'MaxxECU RACE C2 · 32-pin',
 mxrace48:'MaxxECU RACE C1 · 48-pin',
 cust32:'Molex · 32-pin blank layout',
 cust48:'Molex · 48-pin blank layout'
};
function leadSources(){
 return S.parts.filter(p=>p.wfFlying||T[p.t]?.pigtail||p.t==='mxrace32'||p.t==='mxrace48');
}
function leadRows(){
 const rows=[];
 for(const p of leadSources())for(const [i,pin] of T[p.t].pins.entries()){
  const ends=usedOn(p.id,i),draft=p.wfLeadDrafts?.[i]||{};
  for(const w of ends.length?ends:[null]){
   const e=w&&(w.a.p===p.id?w.b:w.a);
   const sp=window.WF_PIG?.isPig(p.t)?WF_PIG.spec(p.t,pin.p):null;
   rows.push({p,i,pin,w,e,sp,sig:w?.sig||draft.sig||plabel(p,i)||'',color:w?.color||draft.color||sp?.color||'',awg:w?.awg||draft.awg||'',
    status:w?'Connected':(p.wfFlying||p.wfLeadDrafts?.[i])?'Flying lead':'Open cavity'});
  }
 }
 return rows;
}
function leadDrawing(rows){
 const bands=[];
 let last=null;
 for(const r of rows){
  if(r.p.id!==last){bands.push('<h5>'+h(r.p.name)+'</h5>');last=r.p.id;}
  const end=r.e?endName(r.e):r.status,tip=r.w?110:78;
  const line='M5 12C22 12 28 5 45 5S68 12 '+tip+' 12';
  const color=h(cpart(r.color,0)||'#84959b'),stripe=h(cpart(r.color,1));
  bands.push('<button type="button" class="fb-lead-line" data-lead-part="'+r.p.id+'" data-lead-pin="'+r.i+'" data-lead-wire="'+(r.w?.id||'')+'"><b>'+h(r.pin.p)+'</b>'+
   '<svg viewBox="0 0 120 22" aria-hidden="true"><path d="'+line+'" fill="none" stroke="#34424a" stroke-width="5"/><path d="'+line+'" fill="none" stroke="'+color+'" stroke-width="3"/>'+
   (stripe?'<path d="'+line+'" fill="none" stroke="'+stripe+'" stroke-width="2" stroke-dasharray="5 7"/>':'')+
   (r.e?'<rect x="109" y="8" width="9" height="8" rx="2" fill="#819691"/>':'<path d="M78 12h7" stroke="#bf9668" stroke-width="2"/>')+'</svg><span>'+h(r.sig||'Unnamed')+'<small>'+h(end)+'</small></span></button>');
 }
 return bands.join('');
}
function pigPanel(row){
 const sp=row.sp;if(!sp)return '';
 const m=WF_PIG.molex(row.p.t),n=WF_PIG.notes,tag={official:'Verified · MaxxECU wiring PDF',owner:'Owner-supplied',tbd:'Not verified'}[sp.status];
 return '<div class="fb-lead-spec"><p><b>ECU function:</b> '+h(sp.fn)+' <small>(ECU pin function, separate from your vehicle assignment)</small></p>'+
  '<p><b>Wire:</b> '+h(row.color||'Color TBD')+' · '+h(row.awg?row.awg+' AWG':'size TBD (your design choice)')+'</p>'+
  '<p><b>Contact:</b> '+h(sp.contact)+'. '+h(n.contactStatus)+'</p>'+
  (sp.group?'<p><b>Twist / shield:</b> '+h(sp.group)+'</p>':'')+
  (sp.note?'<p>'+h(sp.note)+'</p>':'')+(sp.review?'<p><b>Review:</b> flag any intermediate bulkhead in this lead.</p>':'')+
  '<p><small>Status: '+h(tag)+'. Length and destination stay blank until you enter them.</small></p>'+
  '<details><summary>Molex reference · '+h(m.name)+'</summary><p>Housing '+h(m.housing)+' · cover '+h(m.cover)+' · contacts '+h(m.contacts.join(', '))+'</p><p><small>'+h(n.molexStatus)+'</small></p></details></div>';
}
function openFlyingLeads(initial){
 const visible=document.querySelector('dialog.fb-flying');
 if(visible){visible.focus();return;}
 const d=document.createElement('dialog');
 d.className='fb-mockup fb-cavity-sheet fb-flying';
 d.setAttribute('aria-label','Flying lead workbench');
 const sources=leadSources();
 let scope=initial?.id||'all',chosen=initial?.id||sources[0]?.id,idx=0,targetId=S.parts.find(p=>T[p.t]?.bulk)?.id,face='R';
 let status='',filter='all',wireId=null,diagram=false,query='';
 const faceName=s=>s==='L'?'engine':'cabin';
 function place(t,name){
  const g=graph(),x=Math.max(0,...g.nodes.map(n=>n.x))+250;
  const sx=Math.max(0,...S.parts.map(p=>p.x))+360;
  const n=placeHardware(g,t,name,x,180,sx,120);
  return part(n.partId);
 }
 function onward(r){
  if(!r.e||!T[part(r.e.p)?.t]?.bulk)return '—';
  const ends=usedOn(r.e.p,r.e.i).filter(w=>w!==r.w&&faceOf(w,r.e.p,r.e.i)!==r.e.s);
  return ends.length?ends.map(w=>endName(w.a.p===r.e.p?w.b:w.a)).join(', '):'Far face open';
 }
 function selected(p,i,id){
  chosen=p.id;idx=i;wireId=id;status='';update();
 }
 function update(){
  const all=leadRows(),src=leadSources(),bulkheads=S.parts.filter(p=>T[p.t]?.bulk);
  const qn=query.toLowerCase().replace(/\s+/g,'');
  const visible=all.filter(r=>(scope==='all'||r.p.id===Number(scope))&&(filter==='all'||r.status===filter)&&(!qn||r.pin.p.toLowerCase()===qn||(!/^[a-z]\d{1,2}$/.test(qn)&&[r.sig,r.sp?.fn,r.sp?.group].some(v=>String(v||'').toLowerCase().replace(/\s+/g,'').includes(qn)))));
  const matches=all.filter(r=>r.p.id===chosen&&r.i===idx);
  const row=matches.find(r=>wireId&&r.w?.id===wireId)||matches[0];

  const rowHtml=visible.map(r=>{
   const current=r===row;
   const route=r.e?endName(r.e):r.status;
   const wire=r.color||'Color TBD';
   return '<tr'+(current?' class="fb-current-lead"':'')+'><th><button type="button" data-lead-part="'+r.p.id+'" data-lead-pin="'+r.i+'" data-lead-wire="'+(r.w?.id||'')+'">'+h(r.pin.p)+'</button></th><td>'+h(r.p.name)+'</td><td>'+h(r.sig||'—')+'</td><td>'+h(wire)+' · '+h(r.awg?r.awg+' AWG':'AWG TBD')+'</td><td>'+(r.sp?h(r.sp.contact==='TBD'?'Contact TBD':r.sp.contact)+(r.sp.group?'<small> · '+h(r.sp.group)+'</small>':''):'—')+'</td><td>'+h(route)+'</td><td>'+h(onward(r))+'</td></tr>';
  });
  const newPart=select('Plug','fbLeadType',Object.entries(leadTypes).map(([t,label])=>option(t,label)).join(''))+input('Plug name','fbLeadName','','Optional')+'<button type="button" class="btn" data-lead-add>Add flying leads</button>';
  const head='<form method="dialog"><button class="btn">Close</button></form><h3>Flying lead workbench</h3>';
  let editor='';
  if(row){
   const linked=!!row.w,managed=!!row.w?.wfFlyingWire;
   editor='<section class="fb-lead-editor"><h4>'+h(row.p.name)+' · cavity '+h(row.pin.p)+'</h4>'+
    (linked?'<p>'+h(row.sig||'Unnamed wire')+' → '+h(endName(row.e))+'</p>':'')+
    pigPanel(row)+input('Circuit','fbLeadSignal',row.sig)+input('Color / stripe','fbLeadColor',row.color,'e.g. GRN/WHT')+
    field('Gauge (AWG)','fbLeadGauge',row.awg,'Unknown','1')+
    '<button type="button" class="btn" data-lead-save>Save wire details</button>'+
    (!linked?'<div>'+select('Bulkhead','fbLeadBulk',option('','Choose housing',targetId)+bulkheads.map(p=>option(p.id,p.name,targetId)).join(''))+
     select('Face','fbLeadFace',option('R','Cabin',face)+option('L','Engine',face))+
     select('Cavity','fbLeadCavity',option('','Choose cavity'))+'<button type="button" class="btn primary" data-lead-land>Land wire</button></div>':
     (T[part(row.e.p)?.t]?.bulk?select('Cable covering','fbLeadCover',option('','Unspecified / keep existing')+option('DR-25','DR-25')+option('Braided PET','Braided PET')+option('Split loom','Split loom'))+'<button type="button" class="btn" data-lead-run>Route / loom wires to bulkhead</button>':'')+(managed?'<button type="button" class="btn" data-lead-free>Return to flying lead</button>':''))+'</section>';
  }
  const batch=row&&!row.w&&bulkheads.length?'<details data-lead-batch><summary>Land a range of loose wires</summary><p>Start at the selected source and bulkhead cavity. Each following lead takes the next cavity in the displayed order. Verify keying, contacts, current capacity and thermocouple hardware before building.</p>'+field('Number of wires','fbLeadCount',1,'','1')+'<button type="button" class="btn" data-lead-preview>Preview assignments</button><div data-lead-proposal></div></details>':'';
  const connected=visible.filter(r=>r.w).length;
  d.innerHTML=head+'<details '+(!src.length?'open':'')+'><summary>Add a Molex plug</summary>'+newPart+
   '<p class="muted">Blank layouts use numbered planning positions. The RACE variants use the supplied ECU cavity labels.</p></details>'+
   '<details '+(src.length&&!bulkheads.length?'open':'')+'><summary>Add a bulkhead</summary>'+input('Housing name','fbLeadHousing','','e.g. BH-B')+
   '<button type="button" class="btn" data-lead-housing>Add 47-position HD30</button> <button type="button" class="btn" data-lead-custom>Add generic 48-position bulkhead</button></details>'+
   (src.length?select('View plugs','fbLeadScope',option('all','All plugs',scope)+src.map(p=>option(p.id,p.name,scope)).join(''))+
   '<label class="fb-lead-search"><span>Find a lead</span><input id="fbLeadQuery" type="search" value="'+h(query)+'" placeholder="J4, AIN 4, trigger, EGT 3+" autocomplete="off"></label>'+select('Show wires','fbLeadFilter',['all','Flying lead','Connected','Open cavity'].map(v=>option(v,v==='all'?'All wires':v,filter)).join(''))+
   '<button type="button" class="btn" data-lead-csv>Export visible wires</button><p>'+visible.length+' rows · '+connected+' connected</p>'+editor+batch+
   '<p role="status">'+h(status)+'</p><details data-lead-drawing '+(diagram?'open':'')+'><summary>Wire-by-wire drawing</summary><div class="fb-lead-lines">'+(diagram?leadDrawing(visible):'')+'</div></details>'+table(['Cavity','Source plug','Circuit','Wire','Contact · group','Destination','Beyond bulkhead'],rowHtml):'<p>Create a plug to start with a loose end at every cavity.</p>');
  d.querySelector('[data-lead-add]').onclick=()=>{
   const t=val('fbLeadType');if(!Object.hasOwn(leadTypes,t))return;
   const name=val('fbLeadName').trim()||leadTypes[t]+' #'+(S.parts.filter(p=>p.t===t).length+1);
   mutate(()=>{if(!T[t])makeCustom(t);const p=place(t,name);p.wfFlying=true;chosen=p.id;idx=0;scope=p.id;});filter='all';status='';update();
  };
  d.querySelector('[data-lead-housing]').onclick=()=>{
   const name=val('fbLeadHousing').trim()||'HD30 #'+(bulkheads.length+1);
   mutate(()=>{targetId=place('hd30_47',name).id;});status='Added '+name;update();
  };
  d.querySelector('[data-lead-custom]').onclick=()=>{
   const name=val('fbLeadHousing').trim()||'48-position bulkhead #'+(bulkheads.length+1);
   mutate(()=>{makeCustom('bulk48');targetId=place('bulk48',name).id;});status='Added generic planning housing.';update();
  };
  if(!src.length)return;
  d.querySelector('#fbLeadScope').onchange=e=>{scope=e.target.value;if(scope!=='all'){chosen=Number(scope);idx=0;}status='';update();};
  const qi=d.querySelector('#fbLeadQuery');
  qi.oninput=e=>{query=e.target.value;const at=e.target.selectionStart;update();const n=d.querySelector('#fbLeadQuery');n.focus();n.setSelectionRange(at,at);};
  d.querySelector('#fbLeadFilter').onchange=e=>{filter=e.target.value;status='';update();};
  d.querySelector('[data-lead-csv]').onclick=()=>csv('flying-lead-wire-list.csv',[['Source plug','Cavity','Circuit','AWG','Color','Status','Destination','Beyond bulkhead','Wire ID'],...visible.map(r=>[r.p.name,r.pin.p,r.sig,r.awg,r.color,r.status,r.e?endName(r.e):'',onward(r),r.w?.id||''])]);
  const drawing=d.querySelector('[data-lead-drawing]');
  drawing.ontoggle=()=>{
   diagram=drawing.open;
   if(diagram&&!drawing.querySelector('.fb-lead-lines').childElementCount)drawing.querySelector('.fb-lead-lines').innerHTML=leadDrawing(visible);
  };
  d.onclick=e=>{
   const button=e.target.closest('[data-lead-pin]');if(!button)return;
   selected(part(button.dataset.leadPart),Number(button.dataset.leadPin),Number(button.dataset.leadWire));
   d.querySelector('.fb-lead-editor')?.scrollIntoView({block:'nearest'});
  };
  if(!row)return;
  const showStatus=msg=>{status=msg;d.querySelector('[role=status]').textContent=msg;};
  function values(){
   const raw=val('fbLeadGauge'),awg=Number(raw);
   if(raw&&(!Number.isInteger(awg)||awg<1||awg>40)){showStatus('Enter a gauge from 1 to 40 AWG or leave it blank.');return null;}
   return {sig:val('fbLeadSignal').trim(),color:val('fbLeadColor').trim(),awg:raw?awg:0};
  }
  d.querySelector('[data-lead-save]').onclick=()=>{
   const attrs=values();if(!attrs)return;
   mutate(()=>{if(row.w)Object.assign(row.w,attrs);else{row.p.wfLeadDrafts??={};row.p.wfLeadDrafts[idx]={...row.p.wfLeadDrafts[idx],...attrs};}});
   status='Wire details saved.';update();
  };
  if(row.w){
   const run=d.querySelector('[data-lead-run]');
   if(run)run.onclick=()=>{
    const g=graph(),a=g.nodes.find(n=>n.partId===row.p.id),b=g.nodes.find(n=>n.partId===row.e.p);
    if(!a||!b){showStatus('Place both components on the formboard to route this cable.');return;}
    const existing=path(g,a.id,b.id),cover=val('fbLeadCover');
    if(cover&&existing?.length>1){showStatus('This run uses several branches. Select each branch on the formboard to set its covering.');return;}
    if(!existing||cover)mutate(()=>{
     if(!existing)addSegment(g,a.id,b.id);
     if(cover)path(g,a.id,b.id)[0].sleeve=cover;
    });
    const route=path(g,a.id,b.id)||[];
    view.page='design';view.chosen={id:route[0]?.id};view.trace=key(row.w.id);
    render();fit(g);camera($('wfFormSvg'));d.close();
   };
   const free=d.querySelector('[data-lead-free]');
   if(free)free.onclick=()=>{
    if(row.w.tw||row.w.wfShield){showStatus('Remove the wire from its twist or shield group before disconnecting.');return;}
    if(usedOn(row.e.p,row.e.i).length>1){showStatus('This cavity continues to another wire. Review both faces before disconnecting.');return;}
    if(!confirm('Disconnect this wire from '+endName(row.e)+' and keep its loose end?'))return;
    mutate(()=>{row.p.wfLeadDrafts??={};row.p.wfLeadDrafts[idx]={sig:row.sig,color:row.color,awg:row.awg,wirePart:row.w.wfWirePart,markers:row.w.wfMarkers};S.wires=S.wires.filter(w=>w.id!==row.w.id);});
    status='Lead disconnected.';update();
   };
   return;
  }
  function refreshPins(){
   const tgt=part(targetId),el=d.querySelector('#fbLeadCavity');
   el.innerHTML=option('','Choose cavity')+(T[tgt?.t]?.pins||[]).map((p,i)=>{
    const used=faceUsed(targetId,i,face);
    const far=usedOn(targetId,i).filter(w=>faceOf(w,targetId,i)!==face);
    return '<option value="'+i+'"'+(used?' disabled':'')+'>'+h(p.p+(used?' · occupied':far.length?' · onward to '+far.map(w=>endName(w.a.p===targetId?w.b:w.a)).join(', '):''))+'</option>';
   }).join('');
  }
  refreshPins();
  d.querySelector('#fbLeadBulk').onchange=e=>{targetId=Number(e.target.value);refreshPins();};
  d.querySelector('#fbLeadFace').onchange=e=>{face=e.target.value;refreshPins();};
  function rangeProposal(){
   const tgt=part(targetId),raw=val('fbLeadCavity'),start=Number(raw),count=Number(val('fbLeadCount'));
   if(!tgt||!T[tgt.t]?.bulk||raw===''||!Number.isInteger(count)||count<1)return {error:'Choose a starting cavity and a positive whole wire count.'};
   if(idx+count>T[row.p.t].pins.length||start+count>T[tgt.t].pins.length)return {error:'The range exceeds the available positions on one of the connectors.'};
   const assignments=[];
   for(let k=0;k<count;k++){
    const source=idx+k,dest=start+k,pin=T[tgt.t].pins[dest].p;
    if(usedOn(row.p.id,source).length||usedOn(tgt.id,dest).length||plabel(tgt,dest))return {error:'Range includes an occupied or labeled cavity. Review it individually.'};
    assignments.push({source,dest,label:T[row.p.t].pins[source].p+' → '+tgt.name+' / '+pin});
   }
   return {tgt,assignments};
  }
  const preview=d.querySelector('[data-lead-preview]');
  if(preview)preview.onclick=()=>{
   const proposal=rangeProposal(),panel=d.querySelector('[data-lead-proposal]');
   if(proposal.error){panel.textContent=proposal.error;return;}
   const stamp=JSON.stringify([chosen,idx,targetId,face,proposal.assignments]);
   panel.innerHTML='<p>'+h(row.p.name)+' → '+h(proposal.tgt.name)+' · '+faceName(face)+' face</p><ol>'+proposal.assignments.map(a=>'<li>'+h(a.label)+'</li>').join('')+'</ol><button type="button" class="btn" data-lead-accept>Apply these assignments</button>';
   panel.querySelector('button').onclick=()=>{
    const next=rangeProposal();
    if(next.error||stamp!==JSON.stringify([chosen,idx,targetId,face,next.assignments])){panel.textContent=next.error||'Settings changed. Preview the range again.';return;}
    const first=values();if(!first)return;
    mutate(()=>{for(const a of next.assignments){
     const draft=row.p.wfLeadDrafts?.[a.source]||{};
     const attrs=a.source===idx?first:{sig:draft.sig||plabel(row.p,a.source),color:draft.color||'',awg:draft.awg||0};
     S.wires.push(mkW({p:row.p.id,i:a.source},{p:targetId,i:a.dest,s:face},{...attrs,wfWirePart:draft.wirePart,wfMarkers:draft.markers,id:nid(),measuredOnly:true,autoRoute:true,wfFlyingWire:true}));
    }});status=next.assignments.length+' leads landed.';update();
   };
  };
  d.querySelector('[data-lead-land]').onclick=()=>{
   const tgt=part(targetId),raw=val('fbLeadCavity'),i=Number(raw),attrs=values();if(!attrs)return;
   if(!tgt||!T[tgt.t]?.bulk||raw===''||!T[tgt.t].pins[i]){showStatus('Choose a bulkhead and an open cavity.');return;}
   if(usedOn(row.p.id,idx).length||faceUsed(tgt.id,i,face)){showStatus('That endpoint is already occupied.');return;}
   mutate(()=>{
    const draft=row.p.wfLeadDrafts?.[idx]||{};
    S.wires.push(mkW({p:row.p.id,i:idx},{p:tgt.id,i,s:face},{wfWirePart:draft.wirePart,wfMarkers:draft.markers,...attrs,id:nid(),measuredOnly:true,autoRoute:true,wfFlyingWire:true}));
   });status='Landed at '+tgt.name+' · '+faceName(face)+' cavity '+T[tgt.t].pins[i].p+'.';update();
  };
 }
 document.body.append(d);update();d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
}

function wireTools(dialog,update){
 const boxes=()=>Array.from(dialog.querySelectorAll('[data-schedule-wire]:checked'));
 const status=dialog.querySelector('[data-wire-status]');
 dialog.querySelector('[data-wire-apply]').onclick=()=>{
  const ws=boxes().map(el=>wireById(el.dataset.scheduleWire)).filter(Boolean);
  if(!ws.length){status.textContent='Select at least one wire in the table.';return;}
  const mode=val('fbWireAction'),value=val('fbWireValue').trim();
  if(['shield','wirePart','marker'].includes(mode)&&!value){status.textContent='Enter the part number or marking.';return;}
  if(mode==='twist'&&(ws.length!==2||ws[0].a.p!==ws[1].a.p||ws[0].b.p!==ws[1].b.p)){
   status.textContent='Select two parallel wires running in the same direction between the same components.';return;
  }
  if(mode==='shield'&&ws.some(w=>w.a.p!==ws[0].a.p||w.b.p!==ws[0].b.p)){
   status.textContent='Group cores running between the same two components in the same direction.';return;
  }
  if(mode==='shield'&&ws.some(w=>w.tw&&S.wires.some(q=>q.tw===w.tw&&!ws.includes(q)))){
   status.textContent='Include both members of the twisted pair.';return;
  }
  mutate(()=>{
   const groupId=['twist','shield'].includes(mode)?nid():null;
   for(const w of ws){
    if(mode==='twist')w.tw=groupId;
    if(mode==='untwist')delete w.tw;
    if(mode==='wirePart')w.wfWirePart=value;
    if(mode==='marker')w.wfMarkers=[...new Set([...(w.wfMarkers||[]),value])];
    if(mode==='shield')w.wfShield={id:groupId,part:value,from:val('fbShieldFrom').trim(),to:val('fbShieldTo').trim()};
    if(mode==='unshield')delete w.wfShield;
   }
   if(mode==='twist'||mode==='untwist'){
    const counts=new Map();for(const w of S.wires)if(w.tw)counts.set(w.tw,(counts.get(w.tw)||0)+1);
    for(const w of S.wires)if(w.tw&&counts.get(w.tw)===1)delete w.tw;
   }
  });update();
 };
}

function pinSchedule(p){
 const dialog=document.createElement('dialog');
 dialog.className='fb-mockup fb-cavity-sheet';
 function update(){
  const bulk=T[p.t].bulk;
  const rows=T[p.t].pins.map((pin,i)=>{
   const links=usedOn(p.id,i);
   const term=p.wfTerminations?.[i]||{};
   const cells=links.map(w=>{
    const other=w.a.p===p.id?w.b:w.a;
    const dest=(bulk?(faceOf(w,p.id,i)==='R'?'Cabin · ':'Engine · '):'')+endName(other);
    const info=[w.sig,w.awg?w.awg+' AWG':'Gauge TBD',w.color,w.wfWirePart,...(w.wfMarkers||[]),w.tw?'Twist '+w.tw:'',w.wfShield?'Shield '+w.wfShield.id+' · '+w.wfShield.part+' ('+(w.wfShield.from||'End TBD')+' → '+(w.wfShield.to||'End TBD')+')':''].filter(Boolean);
    return '<label><input type="checkbox" data-schedule-wire="'+h(w.id)+'"> '+h(dest)+'</label><small>'+h(info.join(' · '))+'</small>';
   });
   return '<tr><th>'+h(pin.p)+'</th><td>'+h(plabel(p,i)||'—')+'</td><td>'+h(term.contact||'—')+'</td><td>'+h(term.seal||'—')+'</td><td>'+cells.join('<br>')+(cells.length?'':'Open')+'</td></tr>';
  });
  dialog.innerHTML='<form method="dialog"><button class="btn" autofocus>Close</button></form><h3>'+h(p.name)+' · Pin configuration</h3>'+
   (p.wfHd30Loom?'<p>Proposed cavity allocation. Verify insert orientation, contact size, current and keying before termination. ECU supply and engine grounds require separate design. EGT positions are reserved pending thermocouple hardware.</p>':'')+
   (bulk?select('First cavity','fbSwap1',T[p.t].pins.map((v,i)=>option(i,v.p)).join(''))+select('Second cavity','fbSwap2',T[p.t].pins.map((v,i)=>option(i,v.p)).join(''))+'<button type="button" class="btn" data-swap>Swap both faces</button>':'')+
   '<details><summary>Edit cavity details</summary>'+select('Cavity','fbEditPin',T[p.t].pins.map((v,i)=>option(i,v.p)).join(''))+input('Description','fbPinLabel')+input('Contact part number','fbContact')+input('Seal or cavity plug','fbSeal')+'<button type="button" class="btn" data-save-pin>Save cavity</button></details>'+
   '<details><summary>Selected wires</summary>'+select('Operation','fbWireAction',[['twist','Twist pair'],['untwist','Remove twist'],['shield','Group under shield'],['unshield','Remove shield'],['wirePart','Assign wire part'],['marker','Add heat-shrink marker']].map(([id,text])=>option(id,text)).join(''))+
   input('Part number or marker','fbWireValue')+input('Shield source termination','fbShieldFrom','','Floating, housing or component and pin')+input('Shield target termination','fbShieldTo','','Floating, housing or component and pin')+'<button type="button" class="btn" data-wire-apply>Apply to selected wires</button><p aria-live="polite" data-wire-status></p></details>'+
   table(['Cavity','Function','Contact','Seal / plug','Connected endpoint'],rows)+
   '<details><summary>Connect a cavity</summary>'+select('Source cavity','fbSource',T[p.t].pins.map((v,i)=>option(i,v.p)).join(''))+
   (bulk?select('Source face','fbSourceFace',option('L','Engine')+option('R','Cabin')):'')+
   select('Destination component','fbDest',option('','Select component')+S.parts.filter(q=>q.id!==p.id).map(q=>option(q.id,q.name)).join(''))+
   select('Destination cavity','fbDestPin','')+'<div data-face></div>'+input('Circuit name','fbNet')+(!bulk?'<label><input id="fbDouble" type="checkbox"> Double crimp at source</label>':'')+
   '<button type="button" class="btn" data-connect>Connect cavities</button><p role="status"></p></details>';
  wireTools(dialog,update);
  const editPin=dialog.querySelector('#fbEditPin');
  function showPin(){
   const i=Number(editPin.value),term=p.wfTerminations?.[i]||{};
   for(const [id,value] of [['fbPinLabel',plabel(p,i)],['fbContact',term.contact],['fbSeal',term.seal]])dialog.querySelector('#'+id).value=value||'';
  }
  editPin.onchange=showPin;showPin();
  dialog.querySelector('[data-save-pin]').onclick=()=>{
   const i=Number(editPin.value);
   mutate(()=>{
    p.pl??={};p.pl[i]=val('fbPinLabel').trim();
    p.wfTerminations??={};p.wfTerminations[i]={contact:val('fbContact').trim(),seal:val('fbSeal').trim()};
   });update();
  };
  const dest=dialog.querySelector('#fbDest');
  dest.onchange=()=>{
   const target=part(dest.value);
   dialog.querySelector('#fbDestPin').innerHTML=(T[target?.t]?.pins||[]).map((v,i)=>option(i,v.p+' '+(plabel(target,i)||''))).join('');
   dialog.querySelector('[data-face]').innerHTML=T[target?.t]?.bulk?select('Destination face','fbDestFace',option('L','Engine')+option('R','Cabin')):'';
  };
  dialog.querySelector('[data-connect]').onclick=()=>{
   const target=part(dest.value),status=dialog.querySelector('[role=status]');
   if(!target){status.textContent='Choose a destination component.';return;}
   const from={p:p.id,i:Number(val('fbSource'))},to={p:target.id,i:Number(val('fbDestPin'))};
   if(bulk)from.s=val('fbSourceFace');
   if(T[target.t].bulk)to.s=val('fbDestFace');
   if([from,to].some(end=>end.s?faceUsed(end.p,end.i,end.s):!T[part(end.p).t].node&&usedOn(end.p,end.i).length>(end===from&&$('fbDouble')?.checked?1:0))){
    status.textContent='An endpoint is occupied. Select an open cavity or face.';return;
   }
   mutate(()=>{S.wires.push(mkW(from,to,{id:nid(),awg:0,measuredOnly:true,sig:val('fbNet').trim(),autoRoute:true}));});
   update();
  };
  dialog.querySelector('[data-swap]')?.addEventListener('click',()=>{
   const a=Number(val('fbSwap1')),b=Number(val('fbSwap2'));
   if(a===b)return;
   mutate(()=>{
    for(const w of S.wires)for(const end of [w.a,w.b])if(end.p===p.id){if(end.i===a)end.i=b;else if(end.i===b)end.i=a;}
    for(const props of [p.pl,p.wfTerminations].filter(Boolean)){
     const first=props[a],second=props[b];
     if(first==null)delete props[b];else props[b]=first;
     if(second==null)delete props[a];else props[a]=second;
    }
   });
   update();
  });
 }
 update();document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(S.tab==='draw'){draw();renderInsp();}},{once:true});dialog.showModal();
}

function bulkheadWorksheet(){
 const groups=[
  ['A','Connector 1 · Main engine harness',MAXXECU_MAIN,new Set(['L4','M4'])],
  ['B','Connector 2 · Auxiliary harness',MAXXECU_AUX,new Set(['G4'])]
 ];
 const pending=[];
 const sections=groups.map(([bank,name,pins,hold])=>{
  let count=0;
  const rows=pins.flatMap(([pin,signal])=>{
   if(hold.has(pin)){
    pending.push([bank==='A'?'C1':'C2',pin,signal]);
    return [];
   }
   const slot=bank+String(++count).padStart(2,'0');
   const note=signal.startsWith('EGT')?'EGT pass-through TBD':'Cavity TBD';
   return ['<tr><td>'+slot+'</td><td>'+h(pin)+'</td><td>'+h(signal)+'</td><td>'+note+'</td></tr>'];
  });
  return '<details class="fb-mockup-bank"><summary>BH-'+bank+' · '+name+' · '+count+' worksheet slots</summary>'+
   table(['Slot','ECU pin','Function','HD30 cavity'],rows)+'</details>';
 });
 return sections.join('')+
  '<details class="fb-mockup-bank"><summary>Power and grounds · '+pending.length+' routes pending</summary>'+
  table(['ECU plug','ECU pin','Function','Route'],pending.map(row=>'<tr>'+row.map(v=>'<td>'+h(v)+'</td>').join('')+'<td>TBD</td></tr>'))+'</details>';
}

function openBulkheadMockup(el){
 const existing=el.querySelector('.fb-mockup');
 if(existing?.open)return;
 const dialog=document.createElement('dialog');
 dialog.className='fb-mockup';
 dialog.setAttribute('aria-labelledby','fbMockupTitle');
 dialog.innerHTML=`<div class="fb-mockup-top">
  <div><h3 id="fbMockupTitle">E90 firewall bulkhead mockup</h3><p class="muted">Hypothetical engine-harness layout · illustrative only</p></div>
  <form method="dialog"><button class="btn" aria-label="Close bulkhead mockup" autofocus>Close</button></form>
 </div>
 <div class="fb-mockup-diagram"></div>
 <div class="fb-mockup-actions"><button type="button" class="btn primary" aria-pressed="false">Unplug engine loom</button><p aria-live="polite"></p></div>
 <p><strong>Oil-pressure example</strong> · C1/J4 (AIN4) → BH-A worksheet slot A36 → sensor signal. Both wire lengths are TBD.</p>
 <p class="muted">Two nominal 47-cavity HD30s. Worksheet slots are planning labels. The physical insert, contact sizes, cavity assignments and EGT pass-through remain TBD.</p>
 ${bulkheadWorksheet()}`;
 const visual=dialog.querySelector('.fb-mockup-diagram');
 const toggle=dialog.querySelector('.fb-mockup-actions button');
 const status=dialog.querySelector('.fb-mockup-actions p');
 function show(unplugged){
  visual.innerHTML=art.bulkheadMockup(unplugged);
  toggle.textContent=unplugged?'Reconnect engine loom':'Unplug engine loom';
  toggle.setAttribute('aria-pressed',String(unplugged));
  status.textContent=unplugged?'Engine loom detached. ECU and cabin loom stay in place.':'Engine loom connected through the firewall.';
 }
 toggle.addEventListener('click',()=>show(toggle.getAttribute('aria-pressed')==='false'));
 dialog.addEventListener('close',()=>{dialog.remove();if(S.tab==='draw'){draw();renderInsp();}},{once:true});
 show(false);
 el.append(dialog);
 dialog.showModal();
}

const palette=[
 ['mxrace48','C1 · RACE main','48 cavities'],['mxrace32','C2 · RACE auxiliary','32 cavities'],
 ['mxpig48','C1 · RACE pigtail','48 prewired leads'],['mxpig32','C2 · RACE pigtail','32 prewired leads'],
 ['dt04_4p','DT04-4P receptacle','DT 4-way'],['dt06_4s','DT06-4S plug','DT 4-way'],['load2','Device','2 terminals'],['hd30_47','HD30 · bulkhead','47 positions'],['rp4','4-pin relay + socket','30 85 86 87 leads'],['rp5','5-pin relay + socket','30 85 86 87 87a leads'],['relay4','4-pin relay','Power'],['relay','5-pin relay','Power'],
 ['dual','Dual relay board','Leash'],['e90leash1','Single relay board','Leash'],['fuse6','Fuse box','6 circuits']
];
const toolPaths={parts:'M10 3v14M3 10h14',select:'M4 2l12 9-6 1-3 6z',connect:'M2 14h4c5 0 2-8 8-8h4M2 12v4m16-12v4',pan:'M5 10V6a1 1 0 012 0v4-6a1 1 0 012 0v6-7a1 1 0 012 0v7-5a1 1 0 012 0v6l2-2q2-1 2 1l-3 6q-2 3-5 2l-4-2-3-5q-1-2 1-2z',flying:'M2 6h6l4-3h6M2 10h16M2 14h6l4 3h6'};
function studioTool(action,label,active=false){
 return '<button type="button" data-fb="'+action+'" title="'+label+'" aria-label="'+label+'" class="'+(active?'active':'')+'"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="'+toolPaths[action]+'" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><i>'+label+'</i></button>';
}
function previewLoom(){
 const fit=(x,y,angle,type,label,tag)=>'<g transform="translate('+x+' '+y+')"><g transform="rotate('+angle+')">'+art.hardware(T[type].fam,type)+'</g><text y="52" text-anchor="middle">'+label+'</text><text class="ds-id" y="69" text-anchor="middle">'+tag+'</text></g>';
 const run=(d,x,y,label)=>'<path d="'+d+'" stroke="#141719" stroke-width="11" fill="none"/><path d="'+d+'" stroke="#495157" stroke-width="3" opacity=".72" fill="none"/><g transform="translate('+x+' '+y+')"><rect x="-18" y="-7" width="36" height="14" rx="2" fill="#f4d452"/><text text-anchor="middle" y="3" class="ds-tag">'+label+'</text></g>';
 if(window.matchMedia('(max-width:650px)').matches){
  const plug=(x,y,rotation,type,label)=>'<g transform="translate('+x+' '+y+')"><g transform="rotate('+rotation+')">'+art.hardware(T[type].fam,type)+'</g><text text-anchor="middle" y="'+(rotation<0?-105:95)+'">'+label+'</text></g>';
  return '<svg class="ds-preview-svg ds-portrait" aria-label="Proposed RACE plug to bulkhead layout" viewBox="0 0 360 420">'+
   run('M91 134C91 185 117 192 117 260',103,195,'MAIN')+run('M251 134C251 184 246 206 246 260',248,193,'AUX')+
   plug(91,134,-90,'mxrace48','C1 · 48-pin')+plug(251,134,-90,'mxrace32','C2 · 32-pin')+plug(117,260,90,'hd30_47','BH-A')+plug(246,260,90,'hd30_47','BH-B')+'</svg>';
 }
 return '<svg class="ds-preview-svg" aria-label="Proposed RACE plug to bulkhead layout" viewBox="0 0 840 300">'+
 run('M222 94 C355 94 439 58 615 58',390,79,'MAIN')+run('M222 211 C374 211 463 199 615 199',495,203,'AUX')+
 fit(222,94,180,'mxrace48','RACE C1','48-PIN MOLEX')+fit(222,211,180,'mxrace32','RACE C2','32-PIN MOLEX')+
 fit(615,58,0,'hd30_47','BH-A','HD30  /  47 POS')+fit(615,199,0,'hd30_47','BH-B','HD30  /  47 POS')+'</svg>';
}
function studioParts(){
 return '<aside class="ds-panel ds-palette"><div class="ds-panelhead"><h3>Place a part</h3>'+btn('dismiss','Close')+'</div>'+
 palette.map(([id,label,tag])=>'<button class="ds-part" type="button" data-fb="startPlace" data-type="'+id+'"><svg viewBox="-4 -35 122 70" aria-hidden="true">'+art.hardware(T[id].fam,id)+'</svg><span>'+h(label)+'<small>'+h(tag)+'</small></span></button>').join('')+
 '<button type="button" data-fb="junction">+ Branch point</button></aside>';
}
function wiringSheet(g){
 const parts=new Map(g.nodes.filter(n=>n.partId!=null&&part(n.partId)).map(n=>[n.partId,n]));
 const groups=[...parts.values()].sort((a,b)=>a.x-b.x||a.y-b.y);
 const pins=new Map(),blocks=[],lines=[];
 const columns=Math.min(3,Math.max(1,groups.length)),bottom=Array(columns).fill(65);
 for(const [i,n] of groups.entries()){
  const p=part(n.partId),t=T[p.t],col=Math.min(columns-1,Math.floor(i*columns/groups.length));
  const x=col*395+90,y=bottom[col],height=t.pins.length*15+38;
  bottom[col]+=height+55;
  const pinRows=t.pins.map((pin,i)=>{
   const cy=y+32+i*15;
   pins.set(p.id+'/'+i,{x,y:cy,right:x+187,col});
   return '<circle cx="'+x+'" cy="'+cy+'" r="2.3"/><circle cx="'+(x+187)+'" cy="'+cy+'" r="2.3"/><text x="'+(x+7)+'" y="'+(cy+3)+'">'+h(pin.p+'   '+(plabel(p,i)||'').slice(0,20))+'</text>';
  }).join('');
  blocks.push('<g class="ds-block" data-wirepart="'+p.id+'" role="button" tabindex="0" aria-label="'+h(p.name)+'"><rect x="'+x+'" y="'+y+'" width="187" height="'+height+'" rx="3"/><text class="ds-comp-title" x="'+(x+7)+'" y="'+(y+15)+'">'+h(p.name.slice(0,26))+'</text>'+pinRows+'</g>');
 }
 for(const w of S.wires){
  const a=pins.get(w.a.p+'/'+w.a.i),b=pins.get(w.b.p+'/'+w.b.i);if(!a||!b)continue;
  const ax=a.col<=b.col?a.right:a.x,bx=b.col<a.col||a.col===b.col?b.right:b.x;
  const lane=a.col===b.col?Math.max(ax,bx)+18+(w.id%11)*4:(ax+bx)/2+(w.id%13-6)*4;
  const d='M'+ax+' '+a.y+'H'+lane+'V'+b.y+'H'+bx;
  lines.push('<g data-wiredetail="'+w.id+'"><path d="'+d+'" fill="none" stroke="'+h(cpart(w.color,0)||'#54717d')+'" stroke-width="1.5"/><path d="'+d+'" fill="none" stroke="transparent" stroke-width="8"><title>'+h(wireName(w))+'</title></path></g>');
 }
 const width=columns*395;
 return '<div class="ds-schematic">'+(!groups.length?'<p>Place a connector in Design to see its cavities here.</p>':'')+'<svg role="group" aria-label="Cavity wiring" width="'+width+'" height="'+Math.max(...bottom)+'" viewBox="0 0 '+width+' '+Math.max(...bottom)+'">'+lines.join('')+blocks.join('')+'</svg></div>';
}

function landingPanel(g){
 const a=g.nodes.find(n=>n.id===view.landing?.src),b=g.nodes.find(n=>n.id===view.landing?.dst);
 if(!a)return '';
 const p=part(a.partId),q=b&&part(b.partId);
 if(!q)return '<div class="ds-prompt">Tap the destination bulkhead '+btn('dismiss','Cancel')+'</div>';
 return '<aside class="ds-panel ds-landing"><div class="ds-panelhead"><h3>Land a wire</h3>'+btn('dismiss','Cancel')+'</div>'+
 select(p.name,'dsSource',T[p.t].pins.map((pin,i)=>'<option value="'+i+'"'+(usedOn(p.id,i).length?' disabled':'')+(i===view.landing.i?' selected':'')+'>'+h(pin.p+' · '+(plabel(p,i)||'Unlabeled'))+'</option>').join(''))+
 select('Face of '+q.name,'dsFace',option('','Choose face')+option('R','Cabin')+option('L','Engine'))+
 select('Destination cavity','dsCavity',option('','Choose face first'))+btn('land','Connect wire','fb-primary')+'<p aria-live="polite" id="dsStatus"></p></aside>';
}
function finishLanding(g){
 const a=g.nodes.find(n=>n.id===view.landing?.src),b=g.nodes.find(n=>n.id===view.landing?.dst);
 if(!a||!b)return;
 const p=part(a.partId),q=part(b.partId),i=Number(val('dsSource')),j=Number(val('dsCavity')),side=val('dsFace');
 if(!val('dsSource')||!['L','R'].includes(side)||!val('dsCavity')||!T[q.t].pins[j]||usedOn(p.id,i).length||faceUsed(q.id,j,side)){
  $('dsStatus').textContent='Choose an available source, face and cavity.';return;
 }
 const draft=p.wfLeadDrafts?.[i]||{};
 mutate(()=>{
  const w=mkW({p:p.id,i},{p:q.id,i:j,s:side},{id:nid(),sig:draft.sig||plabel(p,i),awg:draft.awg||0,color:draft.color||'',wfWirePart:draft.wirePart,wfMarkers:draft.markers,measuredOnly:true,wfFlyingWire:true,autoRoute:true});
  S.wires.push(w);
  const run=path(g,a.id,b.id);if(!run)addSegment(g,a.id,b.id);
  view.chosen={id:(run||g.segments.slice(-1))[0]?.id};view.trace=key(w.id);view.landing=null;
 });
}

/* ---------- Wire workflow: cavity picker, Run wire, wire editor, mate trace ---------- */
const faceLabel=(p,s)=>T[p?.t]?.faces?.[s]||(s==='R'?'Cabin':'Engine');
const stripeOf=c=>String(c||'').split('/')[1]||'';
const baseOf=c=>String(c||'').split('/')[0]||'';
function cavOcc(p,i,s){return usedOn(p.id,i).filter(w=>!T[p.t].bulk||faceOf(w,p.id,i)===s);}
function endWho(e){const p=part(e.p),t=T[p?.t];return (p?.name||'?')+' · '+(t?.pins[e.i]?.p??e.i+1)+(t?.bulk&&e.s?' · '+faceLabel(p,e.s):'');}
function isLead(p,i){return !!(p&&(p.wfFlying||T[p.t]?.pigtail||p.wfLeadDrafts?.[i]));}
function contactOf(p,i){return p?.wfTerminations?.[i]?.contact||(T[p?.t]?.contactNote?'Size 16; part no. TBD':'TBD');}
function mateNote(w){const out=[];for(const e of [w.a,w.b]){const p=part(e.p),t=T[p?.t];if(p?.mate&&t?.mapNote)out.push(t.mapNote);}return [...new Set(out)].join(' ');}
function nextWid(){const n=S.wires.map(w=>/^W(\d+)$/.exec(w.wid||'')).filter(Boolean).map(m=>+m[1]);return 'W'+String((n.length?Math.max(...n):0)+1).padStart(2,'0');}
function chain(w){
 const out=[w];
 for(const dir of ['a','b']){
  let cur=w,end=dir;
  for(let k=0;k<12;k++){
   const e=cur[end],p=part(e.p),m=p?.mate&&part(p.mate);let next=null,np=null;
   if(m){np=m;next=usedOn(m.id,e.i).find(x=>x!==cur);}
   else if(T[p?.t]?.bulk&&e.s){np=p;next=usedOn(p.id,e.i).find(x=>x!==cur&&faceOf(x,p.id,e.i)!==e.s);}
   if(!next||out.includes(next))break;
   if(dir==='a')out.unshift(next);else out.push(next);
   end=(next.a.p===np.id&&next.a.i===e.i)?'b':'a';cur=next;
  }
 }
 return out;
}
function makeWire(g,src,dst){
 const sn=g.nodes.find(n=>n.id===src.nid),dn=g.nodes.find(n=>n.id===dst.nid),p=part(sn?.partId),q=part(dn?.partId);
 if(!p||!q||p.id===q.id)return null;
 const A={p:p.id,i:src.i},B={p:q.id,i:dst.i};
 if(T[p.t].bulk)A.s=src.s;if(T[q.t].bulk)B.s=dst.s;
 if(cavOcc(p,A.i,A.s).length||cavOcc(q,B.i,B.s).length){toast('That cavity is already used.');return null;}
 const lead=isLead(p,A.i)?[p,A.i]:isLead(q,B.i)?[q,B.i]:null,draft=lead?lead[0].wfLeadDrafts?.[lead[1]]||{}:{};
 const spec=lead&&root.WF_PIG?.isPig(lead[0].t)?WF_PIG.spec(lead[0].t,T[lead[0].t].pins[lead[1]].p):null;
 const w=mkW(A,B,{id:nid(),wid:nextWid(),sig:draft.sig||(lead?plabel(lead[0],lead[1]):''),awg:draft.awg||0,color:draft.color||spec?.color||'',wfWirePart:draft.wirePart,wfMarkers:draft.markers,measuredOnly:true,autoRoute:true,wfFlyingWire:!!lead,wfSupplied:!!(lead&&T[lead[0].t].suppliedLeads)});
 S.wires.push(w);
 if(path(g,sn.id,dn.id)===null)addSegment(g,sn.id,dn.id);
 return w;
}
function cavityGrid(p,face,run){
 const t=T[p.t];
 return '<div class="ds-cavs">'+t.pins.map((pin,i)=>{
  const ws=cavOcc(p,i,face),fn=plabel(p,i)||'';
  const sel=view.cav&&view.cav.pid===p.id&&view.cav.i===i&&(view.cav.s||'')===(face||'');
  const st=ws.length?wireName(ws[0]):p.wfUnused?.[i]?'Unused':isLead(p,i)?'Loose lead':'Open';
  return '<button type="button" class="ds-cav'+(ws.length?' used':isLead(p,i)?' lead':'')+(sel?' sel':'')+'" data-fb="cav" data-i="'+i+'" data-s="'+face+'" aria-pressed="'+sel+'" aria-label="Cavity '+h(pin.p)+', '+h(fn||'no function')+', '+h(st)+'"><b>'+h(pin.p)+'</b><span>'+h(fn||'—')+'</span><small>'+h(st)+'</small></button>';
 }).join('')+'</div>';
}
function mateSel(p){
 const w=T[p.t]?.mateWith;if(!w)return '';
 const opts=S.parts.filter(q=>q.t===w&&(!q.mate||q.mate===p.id));
 return '<label class="ds-mate">Mated with<select id="dsMate"><option value="">Not mated</option>'+opts.map(q=>option(q.id,q.name,p.mate)).join('')+'</select></label>'+(p.mate?'<p class="muted">Cavity n joins cavity n. The mate adds no wire to the cut list.</p>':'');
}
function wirePanel(g,n){
 const p=part(n.partId),t=T[p.t],run=view.run,srcNode=run&&g.nodes.find(x=>x.id===run.nid),srcPart=part(srcNode?.partId);
 const dst=!!run&&run.nid!==n.id,bulk=!!t.bulk,face=bulk?(view.face||'L'):'';
 const tabs=bulk?'<div class="ds-faces" role="group" aria-label="Connector side">'+['L','R'].map(s=>'<button type="button" data-fb="face" data-s="'+s+'" aria-pressed="'+(face===s)+'">'+h(faceLabel(p,s))+'</button>').join('')+'</div>':'';
 let msg='';
 if(run&&!dst)msg='<p class="ds-hint">Wire starts at <b>'+h(endWho({p:srcPart.id,i:run.i,s:run.s}))+'</b>. Tap the destination connector.</p><div class="fb-actions">'+btn('runCancel','Cancel')+'</div>';
 else if(dst)msg='<p class="ds-hint">From <b>'+h(endWho({p:srcPart.id,i:run.i,s:run.s}))+'</b>. Tap an open cavity here to finish.</p><div class="fb-actions">'+btn('runCancel','Cancel')+'</div>';
 else{
  const c=view.cav&&view.cav.pid===p.id?view.cav:null;
  if(c){
   const ws=cavOcc(p,c.i,c.s);
   msg='<div class="ds-cavinfo"><b>'+h(t.pins[c.i].p)+'</b> '+h(plabel(p,c.i)||'No function set')+'<br><small>'+(ws.length?'Used by '+h(wireName(ws[0])):isLead(p,c.i)?'Loose lead · contact '+h(contactOf(p,c.i)):'Open · contact '+h(contactOf(p,c.i)))+'</small></div>'+
    '<div class="fb-actions">'+(ws.length?btn('selWire','Edit wire','fb-primary').replace('<button','<button data-wire="'+ws[0].id+'"'):btn('runWire','Run wire','fb-primary')+(isLead(p,c.i)?btn('unused',p.wfUnused?.[c.i]?'Use this lead':'Mark unused'):''))+'</div>';
  }else msg='<p class="ds-hint">Tap a cavity to choose where the wire starts.</p>';
 }
 const here=S.wires.filter(w=>w.a.p===p.id||w.b.p===p.id);
 const list=here.length&&!run?'<div class="ds-wirelist"><h4>Wires on this connector</h4>'+here.map(w=>'<button type="button" data-fb="selWire" data-wire="'+w.id+'"><b>'+h(w.wid||'#'+w.id)+'</b> '+h(w.sig||'')+'<small>'+h(endWho(w.a))+' → '+h(endWho(w.b))+'</small></button>').join('')+'</div>':'';
 return '<aside class="ds-panel ds-wirepanel"><div class="ds-panelhead"><h3>'+h(n.label||p.name)+'</h3>'+btn('dismiss','Close')+'</div>'+
  '<p class="ds-sub">'+h(t.name)+'</p>'+mateSel(p)+tabs+cavityGrid(p,face,run)+msg+list+
  '<details class="ds-more"><summary>Component details</summary>'+nodeInspector(n)+'</details></aside>';
}
function pickPanel(g){
 const ws=(view.pick||[]).map(id=>S.wires.find(w=>w.id===id)).filter(Boolean);
 return '<aside class="ds-panel ds-wirepanel"><div class="ds-panelhead"><h3>'+ws.length+' wires here</h3>'+btn('dismiss','Close')+'</div><p class="ds-hint">Choose a wire.</p><div class="ds-wirelist">'+ws.map(w=>'<button type="button" data-fb="selWire" data-wire="'+w.id+'"><b>'+h(w.wid||'#'+w.id)+'</b> '+h(w.sig||'')+'<small>'+h(endWho(w.a))+' → '+h(endWho(w.b))+'</small></button>').join('')+'</div><div class="fb-actions">'+btn('loomEdit','Edit loom')+'</div></aside>';
}
function wireEditor(g,w){
 const d=view.wdraft&&view.wdraft.id===w.id?view.wdraft:(view.wdraft={id:w.id,a:{...w.a},b:{...w.b}});
 const endSel=(k,e)=>{
  const p=part(e.p),t=T[p?.t];
  const parts=S.parts.filter(x=>!T[x.t]?.node);
  return '<fieldset class="ds-end"><legend>'+(k==='a'?'From':'To')+'</legend>'+
   select('Connector','we'+k.toUpperCase()+'P',parts.map(x=>option(x.id,x.name,e.p)).join(''))+
   (t?.bulk?select('Side','we'+k.toUpperCase()+'S',['L','R'].map(s=>option(s,faceLabel(p,s),e.s||'L')).join('')):'')+
   select('Cavity','we'+k.toUpperCase()+'I',(t?.pins||[]).map((pin,i)=>{
    const busy=usedOn(p.id,i).filter(x=>x!==w&&(!t.bulk||faceOf(x,p.id,i)===(e.s||'L'))).length;
    return '<option value="'+i+'"'+(i===e.i?' selected':'')+(busy?' disabled':'')+'>'+h(pin.p+(plabel(p,i)?' · '+plabel(p,i):'')+(busy?' (used)':''))+'</option>';
   }).join(''))+'<small>Contact: '+h(contactOf(p,e.i))+'</small></fieldset>';
 };
 const ch=chain(w);
 const trace=ch.length>1?'<div class="ds-chain"><h4>Through the connector</h4>'+ch.map((x,k)=>'<div'+(x===w?' class="cur"':'')+'><b>'+h(x.wid||'#'+x.id)+'</b> '+h(endWho(x.a))+' → '+h(endWho(x.b))+'<small>'+(positive(x.len)?num(x.len)+' in':'length TBD')+'</small></div>').join('')+'<p class="muted">The mated connector joins these electrically and adds no wire to the cut list.</p></div>':'';
 return '<aside class="ds-panel ds-wireeditor"><div class="ds-panelhead"><h3>Wire '+h(w.wid||'#'+w.id)+'</h3>'+btn('wireDone','Done')+'</div>'+
  '<div class="ds-ends"><div><small>From</small><b>'+h(endWho(w.a))+'</b></div><span aria-hidden="true">→</span><div><small>To</small><b>'+h(endWho(w.b))+'</b></div></div>'+(mateNote(w)?'<p class="ds-assume"><b>Mate assumption.</b> '+h(mateNote(w))+'</p>':'')+
  '<div class="fb-unit">'+input('Wire ID','weId',w.wid||'','W01')+input('Circuit','weSig',w.sig||'','Circuit name')+'</div>'+
  '<div class="fb-unit">'+'<label>Color<input id="weColor" list="weColors" value="'+h(baseOf(w.color))+'" placeholder="TBD"></label><datalist id="weColors">'+Object.keys(typeof COLORS!=='undefined'?COLORS:{}).filter(k=>k.length===3).map(k=>'<option value="'+k+'">').join('')+'</datalist>'+input('Stripe','weStripe',stripeOf(w.color),'None')+'</div>'+
  '<div class="fb-unit">'+field('Gauge (AWG)','weAwg',w.awg||'','TBD','1')+field('Measured length (in)','weLen',w.len||'','TBD')+'</div>'+
  '<details class="ds-endpoints"><summary>Edit endpoints</summary>'+endSel('a',d.a)+endSel('b',d.b)+'</details>'+
  '<div class="fb-actions">'+btn('wireSave','Save wire','fb-primary')+btn('loomEdit','Loom')+btn('wireTrace','Trace')+btn('wireSwap','Swap ends')+btn('wireDelete','Delete')+'</div><p role="status" id="weStatus"></p>'+trace+'</aside>';
}
function saveWire(g,w){
 const d=view.wdraft,get=id=>val(id);
 const awgRaw=get('weAwg'),awg=Number(awgRaw||0);
 if(awgRaw&&(!Number.isInteger(awg)||awg<1||awg>40)){$('weStatus').textContent='Gauge must be 1 to 40 AWG, or blank.';return false;}
 const lenRaw=get('weLen');if(lenRaw&&!(Number(lenRaw)>0)){$('weStatus').textContent='Length must be above 0, or blank.';return false;}
 const ends={a:{p:Number(get('weAP')),i:Number(get('weAI')),s:$('weAS')?get('weAS'):undefined},b:{p:Number(get('weBP')),i:Number(get('weBI')),s:$('weBS')?get('weBS'):undefined}};
 for(const k of ['a','b']){const e=ends[k],p=part(e.p);if(!p||!T[p.t].pins[e.i]){$('weStatus').textContent='Choose a cavity for each end.';return false;}
  if(!T[p.t].bulk)delete e.s;
  if(usedOn(p.id,e.i).some(x=>x!==w&&(!T[p.t].bulk||faceOf(x,p.id,e.i)===e.s))){$('weStatus').textContent=endWho(e)+' is already used.';return false;}}
 if(ends.a.p===ends.b.p){$('weStatus').textContent='Choose two different connectors.';return false;}
 const id=get('weId').trim();
 if(id&&S.wires.some(x=>x!==w&&x.wid===id)){$('weStatus').textContent='Wire ID '+id+' is already used.';return false;}
 const color=(get('weColor').trim().toUpperCase()+(get('weStripe').trim()?'/'+get('weStripe').trim().toUpperCase():'')).replace(/^\//,'');
 mutate(g=>{
  Object.assign(w,{wid:id,sig:get('weSig').trim(),color,awg:awgRaw?awg:0,len:lenRaw?Number(lenRaw):0,a:ends.a,b:ends.b});
  const an=g.nodes.find(n=>n.partId===w.a.p),bn=g.nodes.find(n=>n.partId===w.b.p);
  if(an&&bn&&path(g,an.id,bn.id)===null)addSegment(g,an.id,bn.id);
 });
 view.wdraft=null;return true;
}
function scheduleRows(g,report){
 const by=new Map(report.rows.map(r=>[r.w,r]));
 return S.wires.map(w=>{
  const r=by.get(w),dr=r&&displayCut(r),A=part(w.a.p),B=part(w.b.p);
  const covers=[...new Set((r?.route||[]).map(s=>s.sleeve).filter(Boolean))].join(' / ');
  return [w.wid||'',w.sig||'',A?.name||'',A?.id??'',T[A?.t]?.pins[w.a.i]?.p||'',w.a.s?faceLabel(A,w.a.s):'',contactOf(A,w.a.i),B?.name||'',B?.id??'',T[B?.t]?.pins[w.b.i]?.p||'',w.b.s?faceLabel(B,w.b.s):'',contactOf(B,w.b.i),w.awg||'TBD',w.color||'TBD',positive(w.len)?w.len:'TBD',(r?.route||[]).map(s=>s.id).join(' / '),covers||'TBD',dr?.status||'Unrouted',w.wfSupplied?'Supplied lead':'Cut wire',mateNote(w)];
 });
}
const scheduleHeaders=['Wire ID','Circuit','From connector','From instance','From cavity','From side','From contact','To connector','To instance','To cavity','To side','To contact','AWG','Color','Measured length in','Branch IDs','Covering','Status','Wire source','Mate assumption'];
function exitList(seg,g){
 return seg.members.map(w=>{
  const a=g.nodes.find(n=>n.partId===w.a.p),b=g.nodes.find(n=>n.partId===w.b.p),route=path(g,a?.id,b?.id)||[];
  const i=route.findIndex(s=>s.id===seg.s.id),ends=[i<=0?endWho(w.a):null,i===route.length-1?endWho(w.b):null].filter(Boolean);
  return '<div><b>'+h(w.wid||'#'+w.id)+'</b> '+h(w.sig||'')+'<small>'+h(endWho(w.a))+' → '+h(endWho(w.b))+(ends.length?' · exits here: '+h(ends.join(', ')):' · continues')+'</small></div>';
 }).join('');
}

function studioRender(el,g,report){
 const tst=document.getElementById('toast');if(tst&&/^Blank harness ready/.test(tst.textContent))tst.hidden=true;
 const page=view.page,stage=page==='design'||page==='orbit';
 const n=g.nodes.find(n=>n.id===view.chosen?.id),seg=report.bundles.find(b=>b.s.id===view.chosen?.id);
 const selected=n||seg,empty=!g.nodes.length;
 const name=h(S.wfProjectName||S.projectName||'E90 LS');
 const toolbar='<div class="ds-modes" aria-label="Workspace views">'+btn('design','Design',page==='design'?'active':'')+btn('studioWiring','Wiring',page==='studioWiring'?'active':'')+btn('orbit','3D',page==='orbit'?'active':'')+btn('studioBom','BOM',page==='studioBom'?'active':'')+btn('studioCuts','Cut list',page==='studioCuts'?'active':'')+'</div>';
 const caption=view.run?'Tap the destination connector':view.placing?'Tap the canvas to place '+palette.find(p=>p[0]===view.placing)?.[1]:view.mode==='junction'?'Tap the split location':view.mode==='connect'?'Drag between connector ports':'';
 const tools='<div class="ds-rail">'+studioTool('parts','Parts',view.panel==='parts')+studioTool('select','Select',view.mode==='select')+studioTool('connect','Route',view.mode==='connect')+studioTool('pan','Pan',view.mode==='pan')+studioTool('flying','Wires')+'</div>';
 const wsel=view.wsel&&S.wires.find(w=>w.id===view.wsel);
 const inspector=wsel&&page==='design'?wireEditor(g,wsel):view.pick&&page==='design'?pickPanel(g):view.landing?landingPanel(g):page==='design'&&n?.partId!=null&&part(n.partId)&&!T[part(n.partId).t]?.node?wirePanel(g,n):page==='design'&&selected?'<aside class="ds-panel ds-inspector"><div class="ds-panelhead"><h3>'+h(n?captionForNode(n):seg.s.label||'Cable run')+'</h3>'+btn('dismiss','Close')+'</div>'+(n?.partId&&['mxrace32','mxrace48'].includes(part(n.partId)?.t)?btn('landStart','Land a wire','fb-primary'):'')+(n?nodeInspector(n):branchInspector(seg))+'</aside>':'';
 const preview=empty&&page==='design'&&!view.placing&&view.mode==='select'?'<div class="ds-start">'+previewLoom()+'<div class="ds-start-actions"><span>Proposed E90 loom</span>'+btn('loom','Use this layout','fb-primary')+btn('parts','Place my own parts')+'</div></div>':'';
 const controls='<div class="ds-look" role="group" aria-label="Harness view">'+btn('lookLoom','Loom',view.look!=='wires'?'active':'')+btn('lookWires','Individual wires',view.look==='wires'?'active':'')+'</div><div class="ds-zoom">'+btn('zoomOut','−')+btn('fit','Fit')+btn('zoomIn','+')+'</div>';
 el.innerHTML='<div class="ds-shell fb-workspace"><div class="ds-head"><strong>Harness Bench</strong><span class="ds-project">'+name+'</span><div>'+btn('advanced','Project tools')+'<button type="button" data-tab="project">Overview</button></div></div>'+
 '<div class="ds-desk">'+toolbar+(stage?canvas()+preview+(page==='design'?tools:'')+(caption?'<div class="ds-prompt">'+h(caption)+' '+btn('dismiss','Cancel')+'</div>':'')+
 (view.panel==='parts'&&page==='design'?studioParts():inspector)+controls:page==='studioWiring'?wiringSheet(g):'<div class="ds-report"><div class="ds-panelhead"><h3>'+(page==='studioBom'?'Bill of materials':'Wire cut list')+'</h3>'+btn(page==='studioBom'?'bom':'cut','Cut list CSV')+(page==='studioBom'?'':btn('schedule','Wire schedule CSV'))+'</div>'+studioReport(page,report,g)+'</div>')+
 '</div><div class="ds-foot"><b>Formboard</b><span>'+g.nodes.filter(n=>n.partId!=null).length+' parts &nbsp;·&nbsp; '+g.segments.length+' cable runs</span><span>'+ (page==='orbit'?'Drag to orbit':'Dimensions in inches')+'</span></div></div>';
 if(stage){renderScene(g,report);bindCanvas(g,report);}
}
function captionForNode(n){return n.label||'Component';}
function studioReport(page,r,g){
 const rows=page==='studioBom'?materials(g,r).map(v=>[v.kind,v.name,v.variant,num(v.qty),v.unit,v.status]):r.rows.map(displayCut).map(v=>[wireName(v.w),endName(v.w.a),endName(v.w.b),(v.w.awg?v.w.awg+' AWG':'AWG TBD')+' · '+(v.w.color||'color TBD'),v.run==null?'TBD':num(v.run),v.cut==null?'TBD':num(v.cut),v.status]);
 return table(page==='studioBom'?['Category','Part','Specification','Qty','Unit','Status']:['Wire','From','To','Wire','Measured (in)','Cut (in)','Status'],rows.map(cols=>'<tr>'+cols.map(c=>'<td>'+h(c)+'</td>').join('')+'</tr>'));
}

function render(){
 const el=$('t-formboard');if(!el)return;
 const g=graph(),report=analyze(g,S.wires,S.parts);
 if(view.graph!==g){view.cam=null;view.graph=g;view.chosen=null;view.origin=null;}
 if(!view.advanced)return studioRender(el,g,report);
 const count=report.rows.map(displayCut).filter(r=>r.cut!==null).length;
 const stage=view.page!=='build';
 const hint=view.page==='orbit'?'Drag to orbit · scroll to zoom':view.mode==='junction'?'Click open space to place a breakout':view.origin?'Select a destination port':view.mode==='connect'?'Drag between ports or click two endpoints':'Dashed lines show electrical connections awaiting a physical route. Drag ports to route a cable.';
 const actions=stage?'<div class="fb-actions">'+(view.page==='design'?btn('select','Select',view.mode==='select'?'active':'')+btn('connect','Route',view.mode==='connect'?'active':'')+btn('guides',view.guides===false?'Show wiring guides':'Hide wiring guides')+btn('junction','+ Breakout',view.mode==='junction'?'active':'')+btn('pan','Pan',view.mode==='pan'?'active':''):'')+btn('zoomOut','−')+btn('zoomIn','+')+btn('fit','Fit')+btn('labels',view.details?'Hide labels':'Show labels')+'</div>':
 '<div class="fb-actions">'+btn('svg','Formboard SVG')+btn('cut','Cut list CSV')+btn('bom','Materials CSV')+btn('print','Print build pack','fb-primary')+'</div>';
 el.innerHTML='<header class="fb-header"><div><h2>Physical Formboard</h2><p class="muted">Harness layout and fabrication for '+h(S.wfProjectName||S.projectName||'the active project')+'.</p></div><div class="fb-counts"><span><b>'+g.nodes.filter(n=>n.partId!=null).length+'</b> components</span><span><b>'+g.nodes.filter(n=>n.partId==null).length+'</b> breakouts</span><span><b>'+g.segments.length+'</b> cable runs</span><span><b>'+report.rows.filter(r=>r.route?.length).length+' / '+report.rows.length+'</b> wires routed</span><span><b>'+count+'</b> cut lengths</span></div></header>'+
 '<div class="fb-workspace"><div class="fb-bar"><div class="fb-actions">'+btn('design','Design',view.page==='design'?'active':'')+'<button class="btn" data-tab="draw">Wiring</button>'+btn('orbit','3D Routing',view.page==='orbit'?'active':'')+btn('build','Fabrication',view.page==='build'?'active':'')+btn('flying','Flying leads')+btn('loom',S.parts.some(p=>p.wfHd30Loom)?'Find pinned HD30 loom':'Add pinned HD30 loom','fb-primary')+btn('bulkheadMockup','Bulkhead Mockup')+btn('studio','Canvas studio')+'</div>'+actions+'</div>'+
 (stage?'<div class="fb-wrap"><div class="fb-stage">'+canvas()+
 (g.nodes.length?'':'<div class="fb-empty"><article><h3>Lay out the harness</h3><p>Place the wired components together, then route the physical cables where they run in the vehicle.</p>'+btn('seed','Generate starter layout','fb-primary')+'</article></div>')+
 '<div class="fb-overlay"><span class="fb-canvas-help" id="fbHint">'+hint+'</span><span>Layout units · '+(view.page==='orbit'?'3D preview':'inches for entered lengths')+'</span></div></div><aside class="fb-sidebar">'+sidebar(g,report)+
 (view.page==='design'&&g.nodes.length?'<details><summary>Layout setup</summary>'+btn('seed','Restage components without breakouts')+'</details>':'')+'</aside></div>':
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
 if(!view.advanced){
  let pinch=null;
  const pair=e=>{
   const [a,b]=e.touches;
   return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)};
  };
  svg.addEventListener('touchstart',e=>{if(e.touches.length===2){view.drag=null;pinch=pair(e);e.preventDefault();}},{passive:false});
  svg.addEventListener('touchmove',e=>{
   if(!pinch||e.touches.length!==2)return;
   const now=pair(e);e.preventDefault();
   if(now.d>0&&pinch.d>0)zoomAt(svg,now.x,now.y,pinch.d/now.d);
   pinch=now;
  },{passive:false});
  svg.addEventListener('touchend',()=>{pinch=null;});
  svg.addEventListener('touchcancel',()=>{pinch=null;});
 }
 svg.addEventListener('wheel',e=>{
  e.preventDefault();
  zoomAt(svg,e.clientX,e.clientY,Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.0025));
 },{passive:false});
 let lp=null;
 const targetAt=e=>{const seg=e.target.closest('[data-seg]')?.dataset.seg,node=e.target.closest('[data-node]')?.dataset.node;return seg?{seg,pt:position(svg,e.clientX,e.clientY)}:node?{node}:null;};
 svg.addEventListener('contextmenu',e=>{const t=targetAt(e);if(view.page&&view.page!=='design')return;e.preventDefault();if(t){view.drag=null;showMenu(e.clientX,e.clientY,t);}});
 svg.addEventListener('pointermove',e=>{if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>8){clearTimeout(lp.t);lp=null;}});
 ['pointerup','pointercancel'].forEach(ev=>svg.addEventListener(ev,()=>{if(lp){clearTimeout(lp.t);lp=null;}}));
 svg.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'&&view.mode==='select'&&!view.placing){const t=targetAt(e);if(t){const cx=e.clientX,cy=e.clientY;lp={x:cx,y:cy,t:setTimeout(()=>{lp=null;view.drag=null;showMenu(cx,cy,t);},520)};}}
  if(view.drag||![0,1].includes(e.button))return;
  const p=position(svg,e.clientX,e.clientY);
  if(view.placing){
   const t=view.placing;view.placing=null;view.panel=null;
   mutate(()=>{const n=placeHardware(g,t,T[t].name,Math.round(p.x),Math.round(p.y),Math.round(p.x),Math.round(p.y));if(t==='mxrace32'||t==='mxrace48')part(n.partId).wfFlying=true;view.chosen={id:n.id};});return;
  }
  const node=e.target.closest('[data-node]')?.dataset.node;
  const port=e.target.closest('[data-port]')?.dataset.port;
  const segment=e.target.closest('[data-seg]')?.dataset.seg;
  const bend=e.target.closest('[data-bend]')?.dataset.bend;
  const xyStart={clientX:e.clientX,clientY:e.clientY,pointerId:e.pointerId};
  const tip=e.target.closest('[data-lead-tip]');
  if(!view.advanced&&view.page==='design'&&view.landing&&!view.landing.dst&&node){
   const dst=part(g.nodes.find(n=>n.id===node)?.partId);
   if(dst&&T[dst.t].bulk){view.landing.dst=node;render();}return;
  }
  if(tip&&!view.advanced&&view.page==='design'){
   view.drag={type:'lead',id:node,i:Number(tip.dataset.leadTip),start:p,...xyStart};
  }else if(view.page==='orbit'){
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
   view.chosen={id:segment};view.wsel=null;view.pick=null;view.cav=null;
   const wh=e.target.closest('[data-wire-hit]')?.dataset.wireHit;
   if(wh&&view.look==='wires'){const w=S.wires.find(x=>key(x.id)===wh);if(w){view.wsel=w.id;view.wdraft=null;view.trace=key(w.id);focusWire(g,w);}}
   else if(!view.advanced&&view.page==='design'){
    const ids=[...new Set(document.elementsFromPoint(e.clientX,e.clientY).map(x=>x.closest?.('[data-seg]')?.dataset.seg).filter(Boolean))];
    const ws=analyze(g,S.wires,S.parts).rows.filter(r=>r.route?.some(sg=>ids.includes(sg.id))).map(r=>r.w);
    if(ws.length===1){view.wsel=ws[0].id;view.wdraft=null;view.trace=key(ws[0].id);focusWire(g,ws[0]);}
    else if(ws.length>1){view.pick=ws.map(w=>w.id);}
   }
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
  if(d.type==='connect'||d.type==='lead'){
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]')?.dataset.node;
   d.target=target&&target!==d.id?target:null;
   d.to=g.nodes.find(n=>n.id===d.target)||a;
  }
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
   if(!d.moved&&view.page==='design'){view.chosen=null;view.origin=null;view.wsel=null;view.pick=null;view.cav=null;view.wdraft=null;view.trace=null;render();}
   return;
  }
  if(d.type==='lead'){
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]')?.dataset.node;
   const dst=part(g.nodes.find(n=>n.id===target)?.partId);
   view.landing={src:d.id,i:d.i,dst:dst&&T[dst.t].bulk?target:null};view.panel=null;render();return;
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
function splitAt(g,s,pt){
 const a=g.nodes.find(n=>n.id===s.a),b=g.nodes.find(n=>n.id===s.b);if(!a||!b)return;
 const c=curve(a,b,s);let best=.5,bd=1e9;
 for(let i=1;i<40;i++){const q=c.sample(i/40),d=Math.hypot(q.x-pt.x,q.y-pt.y);if(d<bd){bd=d;best=i/40;}}
 const p=c.sample(best),had=positive(s.length)?Number(s.length):null;
 mutate(g=>{
  const j=addNode(g,Math.round(p.x),Math.round(p.y),'Breakout '+g.next);
  g.segments=g.segments.filter(q=>q!==s);
  addSegment(g,a.id,j.id);addSegment(g,j.id,b.id);
  for(const sg of g.segments.slice(-2))Object.assign(sg,{sleeve:s.sleeve,size:s.size,label:s.label,needsMeasure:true,wasLength:had});
  view.chosen={id:j.id};
 });
 toast('Breakout added. Measure both new branches.');
}
function closeMenu(){document.getElementById('dsMenu')?.remove();}
function showMenu(cx,cy,t){
 closeMenu();
 const g=graph(),node=t.node&&g.nodes.find(n=>n.id===t.node),p=node&&part(node.partId);
 const items=t.seg?[['breakout','Add breakout here'],['wires','Choose wires for branch'],['covering','Set covering'],['label','Label'],['length','Enter measured length']]
  :p&&!T[p.t]?.node?[['cavities','Inspect cavities'],['run','Run wire'],['mate','Show mate']]
  :[['delnode','Delete breakout']];
 const m=document.createElement('div');m.id='dsMenu';m.className='ds-menu';m.setAttribute('role','menu');
 m.innerHTML=items.map(([k,l])=>'<button type="button" role="menuitem" data-menu="'+k+'">'+l+'</button>').join('');
 document.body.appendChild(m);
 const W=innerWidth,H=innerHeight,r=m.getBoundingClientRect();
 m.style.left=Math.max(8,Math.min(cx,W-r.width-8))+'px';m.style.top=Math.max(8,Math.min(cy,H-r.height-8))+'px';
 m.addEventListener('click',e=>{
  const k=e.target.closest('[data-menu]')?.dataset.menu;if(!k)return;closeMenu();
  const g=graph(),seg=t.seg&&g.segments.find(x=>x.id===t.seg);
  view.wsel=null;view.pick=null;view.cav=null;
  if(seg){
   view.chosen={id:seg.id};
   if(k==='breakout')return splitAt(g,seg,t.pt);
   if(k==='wires'){const rep=analyze(g,S.wires,S.parts).rows.filter(r=>r.route?.some(x=>x.id===seg.id)).map(r=>r.w.id);view.pick=rep;render();return;}
   render();setTimeout(()=>{const id={covering:'fbSleeve',label:'fbSegLabel',length:'fbLength'}[k];const el=$(id);if(el){el.scrollIntoView({block:'center'});el.focus();}},30);return;
  }
  if(node){
   view.chosen={id:node.id};
   if(k==='mate'){const q=p?.mate&&part(p.mate),qn=q&&g.nodes.find(x=>x.partId===q.id);if(!qn)return toast(p?.mate?'The mated half is not on the formboard.':'This connector is not mated.');view.chosen={id:qn.id};render();return;}
   if(k==='delnode'){mutate(g=>{g.segments=g.segments.filter(x=>x.a!==node.id&&x.b!==node.id);g.nodes=g.nodes.filter(x=>x!==node);});view.chosen=null;return;}
   if(k==='run')toast('Tap a cavity, then Run wire.');
   render();
  }
 });
 setTimeout(()=>document.addEventListener('pointerdown',function f(ev){if(!ev.target.closest('#dsMenu')){closeMenu();}document.removeEventListener('pointerdown',f,true);},true),0);
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
 if(w.tw||w.wfShield||[w.a.p,w.b.p].includes(p.id))return toast('This wire requires editing in the wiring diagram.');
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
 const wirepart=e.target.closest('#t-formboard [data-wirepart]');
 if(wirepart)return pinSchedule(part(wirepart.dataset.wirepart));
 const wireline=e.target.closest('#t-formboard [data-wiredetail]');
 if(wireline){const w=wireById(wireline.dataset.wiredetail);if(w)return pinSchedule(part(w.a.p));}
 const config=e.target.closest('[data-pin-config]');
 if(config)return pinSchedule(part(config.dataset.pinConfig));
 const button=e.target.closest('#t-formboard [data-fb]');
 if(!button)return;
 const action=button.dataset.fb;
 if(!['land','landStart'].includes(action))view.landing=null;
 if(action==='landStart'){const src=graph().nodes.find(n=>n.id===view.chosen?.id);if(src){view.landing={src:src.id,i:T[part(src.partId).t].pins.findIndex((_,i)=>!usedOn(src.partId,i).length)};view.panel=null;render();}return;}
 if(action==='land')return finishLanding(graph());
 if(action==='advanced'||action==='studio'){view.advanced=action==='advanced';view.page='design';view.panel=null;view.placing=null;render();return;}
 if(action==='parts'){view.panel=view.panel==='parts'?null:'parts';view.placing=null;render();return;}
 if(action==='dismiss'){view.run=null;view.cav=null;view.wsel=null;view.wdraft=null;view.panel=null;view.chosen=null;view.placing=null;view.origin=null;view.mode='select';render();return;}
 if(action==='startPlace'&&palette.some(p=>p[0]===button.dataset.type)){view.placing=button.dataset.type;view.panel=null;view.chosen=null;view.mode='select';render();return;}
 if(action==='studioBom'||action==='studioCuts'||action==='studioWiring'){view.page=action;view.panel=null;view.placing=null;render();return;}
 if(['design','orbit','select','connect','pan','junction','loom'].includes(action)){view.panel=null;view.placing=null;}
 if(action==='bulkheadMockup')return openBulkheadMockup($('t-formboard'));
 const g=graph();
 if(action==='lookLoom'||action==='lookWires'){view.look=action==='lookWires'?'wires':'loom';render();return;}
 if(action==='face'){view.face=button.dataset.s;view.cav=null;render();return;}
 if(action==='cav'){
  const nn=g.nodes.find(x=>x.id===view.chosen?.id),p=part(nn?.partId);if(!p)return;
  const i=Number(button.dataset.i),sd=button.dataset.s||'',ws=cavOcc(p,i,sd);
  if(view.run&&view.run.nid!==nn.id){
   if(ws.length){toast('That cavity is already used.');return;}
   commit();
   const w=makeWire(g,view.run,{nid:nn.id,i,s:sd});
   if(w){view.run=null;view.cav=null;view.wsel=w.id;view.wdraft=null;view.trace=key(w.id);focusWire(g,w);save();render();}
   return;
  }
  if(ws.length){view.wsel=ws[0].id;view.wdraft=null;view.trace=key(ws[0].id);render();return;}
  view.cav={pid:p.id,i,s:sd};render();return;
 }
 if(action==='runWire'&&view.cav){view.run={nid:view.chosen.id,i:view.cav.i,s:view.cav.s};view.cav=null;render();return;}
 if(action==='unused'&&view.cav){const p=part(g.nodes.find(x=>x.id===view.chosen?.id)?.partId);if(p){commit();p.wfUnused??={};if(p.wfUnused[view.cav.i])delete p.wfUnused[view.cav.i];else p.wfUnused[view.cav.i]=true;save();render();}return;}
 if(action==='runCancel'){view.run=null;view.cav=null;render();return;}
 if(action==='loomEdit'){
  const w=S.wires.find(x=>x.id===view.wsel),r=w&&analyze(g,S.wires,S.parts).rows.find(x=>x.w===w);
  if(r?.route?.length)view.chosen={id:r.route[0].id};
  view.pick=null;view.wsel=null;render();return;}
 if(action==='selWire'){view.pick=null;view.wsel=Number(button.dataset.wire);view.wdraft=null;view.trace=key(view.wsel);focusWire(g,S.wires.find(x=>x.id===view.wsel));render();return;}
 if(action==='wireDone'){view.wsel=null;view.wdraft=null;render();return;}
 if(['wireSave','wireTrace','wireSwap','wireDelete'].includes(action)){
  const w=S.wires.find(x=>x.id===view.wsel);if(!w)return;
  if(action==='wireSave'){saveWire(g,w);return;}
  if(action==='wireTrace'){view.trace=key(w.id);render();return;}
  if(action==='wireSwap'){commit();[w.a,w.b]=[w.b,w.a];view.wdraft=null;save();render();return;}
  if(action==='wireDelete'){mutate(()=>{S.wires=S.wires.filter(x=>x!==w);});view.wsel=null;view.wdraft=null;render();return;}
 }
 const n=g.nodes.find(n=>n.id===view.chosen?.id),s=g.segments.find(s=>s.id===view.chosen?.id);
 if(['design','orbit','build'].includes(action)){
  view.page=action;view.origin=null;if(action==='orbit')view.cam=null;render();return;
 }
 if(['select','connect','junction','pan'].includes(action)){
  view.mode=action;view.origin=null;render();return;
 }
 if(action==='guides'){view.guides=view.guides===false;render();return;}
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
 if(action==='flyingPart'&&n)return openFlyingLeads(part(n.partId));
 if(action==='flying')return openFlyingLeads();
 if(action==='loom')return insertLoom();
 if(action==='pinSchedule'&&n?.partId!=null)return pinSchedule(part(n.partId));
 if(action==='addHardware'){
  const t=val('fbHardware');if(!powerHardware.includes(t))return;
  const c=view.cam,x=Math.round(c.x+c.w/2),y=Math.round(c.y+c.h/2);
  mutate(()=>{const n=placeHardware(g,t,T[t].name,x,y,x,y);view.chosen={id:n.id};});return;
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
 if(action==='schedule')return csv('harness-bench-wire-schedule.csv',[scheduleHeaders,...scheduleRows(g,report)]);
 if(action==='cut')return csv('wireforge-formboard-cut-list.csv',[cutHeaders,...cutRows(report)]);
 if(action==='bom')return csv('wireforge-formboard-materials.csv',[bomHeaders,...materials(g,report).map(r=>[r.kind,r.name,r.variant,r.qty,r.unit,r.total,r.status])]);
 if(action==='svg')downloadTextFile('wireforge-physical-formboard.svg',printableSvg(g,report),'image/svg+xml');
});
let cavDrag=null;
document.addEventListener('pointerdown',e=>{
 const b=e.pointerType==='mouse'&&e.target.closest('#t-formboard .ds-cav:not(.used)');
 cavDrag=b&&!view.run?{b,x:e.clientX,y:e.clientY}:null;
});
document.addEventListener('pointerup',e=>{
 const d=cavDrag;cavDrag=null;
 if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)<10)return;
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node]')?.dataset.node,g=graph(),src=view.chosen?.id;
 const tn=g.nodes.find(n=>n.id===target);
 if(!tn||tn.partId==null||tn.id===src)return;
 view.run={nid:src,i:Number(d.b.dataset.i),s:d.b.dataset.s||''};view.cav=null;view.chosen={id:tn.id};render();
});
document.addEventListener('change',e=>{
 if(e.target.id==='dsMate'){
  const n=graph().nodes.find(x=>x.id===view.chosen?.id),p=part(n?.partId);if(!p)return;
  commit();
  const old=p.mate&&part(p.mate);if(old)delete old.mate;delete p.mate;
  const q=part(Number(e.target.value));if(q){p.mate=q.id;q.mate=p.id;}
  save();render();return;
 }
 if(/^we[AB][PSI]$/.test(e.target.id||'')&&view.wdraft){
  const k=e.target.id[2]==='A'?'a':'b',d=view.wdraft,f=e.target.id[3];
  if(f==='P'){const p=part(Number(e.target.value));d[k]={p:p.id,i:0,s:T[p.t].bulk?'L':undefined};}
  else if(f==='S')d[k]={...d[k],s:e.target.value};
  else d[k]={...d[k],i:Number(e.target.value)};
  const keep=['weId','weSig','weColor','weStripe','weAwg','weLen'].map(id=>[id,val(id)]);
  render();keep.forEach(([id,v])=>{if($(id))$(id).value=v;});return;
 }
 if(e.target.id==='dsFace'){
  const q=part(graph().nodes.find(n=>n.id===view.landing?.dst)?.partId),side=e.target.value;
  $('dsCavity').innerHTML=option('','Choose cavity')+(q&&side?T[q.t].pins.map((pin,i)=>'<option value="'+i+'"'+(faceUsed(q.id,i,side)?' disabled':'')+'>'+h(pin.p+(plabel(q,i)?' · '+plabel(q,i):''))+'</option>').join(''):'');
 }
 if(e.target.id==='fbTrace'){view.trace=e.target.value||null;view.bulk=null;render();}
 if(e.target.id==='fbQuery'){view.query=e.target.value.toLowerCase();render();}
 if(e.target.id==='fbBulk'){view.bulk=e.target.value||null;render();$('fbBulk')?.closest('details')?.setAttribute('open','');}
});
const studioEntry=document.createElement('a');
studioEntry.href='#studio';studioEntry.className='btn';studioEntry.textContent='Open harness canvas';
studioEntry.onclick=e=>{e.preventDefault();if(location.hash!=='#studio')location.hash='studio';else{view.advanced=false;showTab('formboard');}};
document.querySelector('.wf-top-actions')?.prepend(studioEntry);
root.WFFormboard={...api,render,report:()=>analyze(graph(),S.wires,S.parts)};
document.addEventListener('keydown',e=>{
 if(S.tab!=='formboard'||document.querySelector('dialog[open]'))return;
 if(e.key==='Escape'&&!view.advanced){view.landing=null;view.placing=null;view.panel=null;view.chosen=null;view.mode='select';render();}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-wirepart]')){e.preventDefault();pinSchedule(part(e.target.dataset.wirepart));}
});
function openFormboardLink(){
 if(location.hash==='#flying-leads'){showTab('formboard');openFlyingLeads();return;}
 if(location.hash==='#studio'||location.hash==='#hd30'){view.advanced=false;showTab('formboard');}
}
root.addEventListener('hashchange',openFormboardLink);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openFormboardLink,{once:true});
else openFormboardLink();
})(typeof window!=='undefined'?window:null);
