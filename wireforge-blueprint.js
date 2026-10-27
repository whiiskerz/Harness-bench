/* WireForge E90 Blueprint — design readout and owner-confirmation board.
 * Uses existing wire union/net model; not a physical continuity test or CAD certification.
 * Planning zones are schematic placements, not automotive dimensions.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const expected=[
 {id:'gpo2',group:'Fuel',name:'Fuel pump A trigger',from:[101,2],to:[104,4],source:'Race LS 12-pin C = GPO2; owner-described DT2-A → DT6 → Leash A−'},
 {id:'gpo3',group:'Fuel',name:'Fuel pump B staged trigger',from:[101,4],to:[104,6],source:'Race LS 12-pin E = GPO3; owner-described DT2-A → DT6 → Leash B−'},
 {id:'gpo7',group:'Nitrous',name:'Bottle heater relay coil trigger',from:[102,6],to:[166,1],source:'Race LS 16-pin 7 = GPO7; owner-described DT2-B → DT6 → relay 85'},
 {id:'ain2',group:'Nitrous',name:'Nitrous pressure signal',from:[102,3],to:[151,2],source:'Race LS 16-pin 4 = AIN2; owner-described DT2-B → DT6'},
 {id:'ref5',group:'Sensors',name:'Fuel pressure sensor +5 V',from:[102,0],to:[125,0],source:'Race LS 16-pin 1 = sensor 5 V; check physical sensor and supply requirements'},
 {id:'sgnd',group:'Sensors',name:'Fuel pressure sensor reference ground',from:[102,1],to:[125,1],source:'Race LS 16-pin 2 = sensor ground; never chassis ground'},
 {id:'ain6',group:'Sensors',name:'Fuel pressure signal AIN6',from:[102,4],to:[125,2],source:'Race LS 16-pin 5 = AIN6; owner mapping'},
 {id:'ain7',group:'Cooling',name:'BMW A/C pressure signal AIN7',from:[102,5],to:[126,0],source:'Race LS 16-pin 6 = AIN7; X126 black/white signal tap is owner-described'},
 {id:'fanpwm',group:'Cooling',name:'Fan PWM GPO5 interface',from:[102,7],to:[114,2],source:'Race LS 16-pin 8 = GPO5; BMW X60001 pin 20 is owner described; verify interface'},
 {id:'brake',group:'Cabin',name:'Brake switch DIN1',from:[103,2],to:[114,3],source:'Race LS 16-pin 11 = DIN1; BMW X60001 pin 38 is owner described'},
 {id:'up',group:'Transmission',name:'Shifter DIN2',from:[103,3],to:[116,1],source:'Race LS 16-pin 12 = DIN2; owner DT4 pin map'},
 {id:'down',group:'Transmission',name:'Shifter DIN4',from:[103,4],to:[116,0],source:'Race LS 16-pin 13 = DIN4; owner DT4 pin map'},
 {id:'flex',group:'Sensors',name:'Flex-fuel signal DIN5',from:[103,5],to:[115,1],source:'Race LS 16-pin 14 = DIN5; owner DIN5 ethanol input'},
 {id:'ac',group:'Cooling',name:'A/C relay low-side GPO6',from:[101,3],to:[108,1],source:'Race LS 12-pin D = GPO6; owner A/C control'},
 {id:'pumpA',group:'Fuel',name:'Leash A output → 535',from:[104,1],to:[105,0],source:'Owner-reported 535 pump; output cable is provisional until physical AWG/fuse confirmed'},
 {id:'pumpB',group:'Fuel',name:'Leash B output → 525',from:[104,2],to:[105,2],source:'Owner-reported 525 staged pump; output cable is provisional until physical AWG/fuse confirmed'}
];
const questions=[
 {id:'dt-mating',priority:'critical',title:'DT6 and DT2 mating halves',ask:'Which Deutsch housings do you physically have (part numbers, plug/receptacle, male/female)? What are the actual molded cavity numbers for all six DT6 functions and three DT2 breakouts?',reason:'Logical signals are shown. Exact mating-half orientation, pin numbering, seals and contacts cannot be approved from the supplied notes.'},
 {id:'ecu-breakout',priority:'critical',title:'ECU breakout and engine-harness pin maps',ask:'Are DT12 / analog DT8 / CAN DT8 custom breakouts physically built? Send their wire-side cavity photos or numbered pin tables, plus any standalone MaxxECU Race CMC assignments you have.',reason:'The supplied Race LS document verifies 12-pin/16-pin extra connectors, not every custom Deutsch breakout cavity or CMC terminal.'},
 {id:'relay-power',priority:'critical',title:'Actual fuse, relay and cable ratings',ask:'Confirm main battery fuse location/rating, the DME and trunk fuse slots/ratings, Leash Dual/Single terminal functions, pump cable AWG, and the real 535/525 current demand.',reason:'The source notes include placeholders and owner-stated ratings; these cannot justify fuse protection or conductor sizing yet.'},
 {id:'gpo-purge',priority:'critical',title:'Purge relay / valved muffler outputs',ask:'Is purge driven directly from GPO7, GPO15, or an external keypad/relay? Confirm relay pin 85/86 wiring. Which output actually controls the two muffler valves, and is Motor 2 used for anything else?',reason:'The example has a low-side GPO15 to relay terminal 86, which may be a coil polarity error, and muffler Motor 2 output usage is unresolved.'},
 {id:'sensor-harness',priority:'important',title:'Actual CLT, IAT, oil-pressure and LS engine harness',ask:'Which sensors and connectors are fitted? Confirm CLT repair, AIN4 oil-pressure wiring, IAT and crank/cam adapter types, and whether the injection/coils are all through the terminated LS harness.',reason:'The Race LS document describes terminated engine-harness functions, but not enough physical data to complete your modified wiring diagram.'},
 {id:'can',priority:'important',title:'CAN termination and topology',ask:'Where are the two 120 Ω terminators located? Confirm keypad speed, 8HP TCU CAN pin assignments, and whether the CAN splitter branches are separate from BMW PT-CAN.',reason:'The prior setup indicated possible termination and bitrate incompatibility; the schematic does not verify bus operation.'},
 {id:'dimension',priority:'important',title:'Real harness measurements',ask:'What are the actual front-bay, firewall, cabin, transmission and trunk trunk/branch lengths, service loops, grommet positions and sleeving diameters?',reason:'The 2D/3D layout coordinates are not cut dimensions. Manufacturing cut lengths need measured routes.'},
 {id:'nitrous',priority:'important',title:'Nitrous hardware and control',ask:'Confirm SSR part number/terminal polarity, nitrous solenoid amperage, pressure sensor pinout, heater contact fuse and purge actuation scheme.',reason:'The model includes several nitrous protection and terminal placeholders.'}
];
let chosenGroup='All',search='';
function isStarter(){return !!part(101)&&!!part(161)&&!!part(163)&&!!part(104)}
function routePresent(route,net){
 const a=part(route.from[0]),b=part(route.to[0]);
 if(!a||!b)return false;
 const isValid=([id,pin])=>{const p=part(id),t=p&&T[p.t];return !!t&&Number.isInteger(pin)&&pin>=0&&pin<(t.node?1:t.pins.length)};
 if(!isValid(route.from)||!isValid(route.to))return false;
 return net.find(net.key(route.from[0],route.from[1]))===net.find(net.key(route.to[0],route.to[1]));
}
function report(){
 const lines=[];
 let net;try{net=netsOf()}catch(_){}
 for(const route of expected)lines.push({...route,drawn:!!(net&&routePresent(route,net))});
 const visible=lines.filter(line=>(chosenGroup==='All'||line.group===chosenGroup)&&(!search||String(line.name+' '+line.source).toLowerCase().includes(search)));
 const n=lines.filter(x=>x.drawn).length;
 const recorded=questions.filter(q=>String((S.wfExampleAnswers||{})[q.id]||'').trim()).length;
 return {lines,visible,drawn:n,total:lines.length,recorded,questions:questions.length,unresolved:questions.length-recorded};
}
function showZone(id){
 const z=(S.zones||[]).find(x=>x.id===id);
 if(!z){if(isStarter())return alert('Planning zones were moved/removed. Use “Arrange example” to recreate them.');return}
 showTab('draw');
 const r=rectOf(),w=Math.max(1,r.width),h2=Math.max(1,r.height);
 const k=Math.max(.14,Math.min(1.05,(w-80)/z.w,(h2-80)/z.h));
 S.view={k,x:(w-z.w*k)/2-z.x*k,y:(h2-z.h*k)/2-z.y*k};
 save();draw();renderInsp();
}
function findLinked(id){
 const route=expected.find(r=>r.id===id);if(!route)return;
 const p=part(route.from[0]);if(!p)return;
 selection={type:'part',id:p.id};
 showTab('draw');
 const z=(S.zones||[]).find(z=>p.x>=z.x&&p.x<z.x+z.w&&p.y>=z.y&&p.y<z.y+z.h);
 if(z)showZone(z.id);
 renderInsp();
}
function arrange(){
 if(!isStarter()){toast('Load the BMW E90 example first');return}
 const message='Arrange all E90 example components into six spacious physical planning zones? Your current drawing positions will be replaced. Save a named project copy first if needed.';
 if(!confirm(message))return;
 commit();
 e90Layout(true);
 showTab('draw');fit();toast('Six-zone E90 reference layout created. Use the Blueprint cards to focus an area.');
}
function download(){
 const data={app:'WireForge',project:S.wfProjectName||'E90 reference',version:APP_VERSION,date:new Date().toISOString(),routes:report().lines,questions:questions.map(q=>({...q,answer:S.wfExampleAnswers?.[q.id]||''})),disclaimer:'Modeled path presence does not prove physical wiring, terminal orientation, valid fuse sizing, CAN operation or manufacturer-approved mating compatibility.'};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='wireforge-e90-verification-board.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1600);
}
function render(){
 const root=$('t-blueprint');if(!root)return;
 if(!isStarter()){root.innerHTML='<div class="wb-hero"><div class="wb-eyebrow">BLUEPRINT / REFERENCE PROJECT</div><h2>BMW E90 · LS / MaxxECU</h2><p>The reference blueprint appears when you load the E90 example. Your own projects can use the normal editor, layout and validation tools.</p><button type="button" class="btn primary" data-act="loadE90">Load E90 reference</button></div>';return}
 const a=report(),zones=(S.zones||[]).filter(z=>z.id.startsWith('zone-'));
 const progress=(100*a.drawn/a.total).toFixed(0);
 const groups=['All',...new Set(expected.map(x=>x.group))];
 root.innerHTML='<div class="wb-hero"><div class="wb-eyebrow">WIRE FORGE / VEHICLE PROJECT BLUEPRINT</div><div class="wb-hero-split"><div><h2>2011 BMW E90 <span>×</span> LS / MaxxECU Race</h2><p>One project. A real schematic, a readable six-zone physical plan, a 3D preview, and an explicit checklist for the details that still need confirmation.</p><div class="wb-hero-actions"><button class="btn primary" data-wb="arrange">Arrange example</button><button class="btn" data-wb="fit">Open full drawing</button><button class="btn" data-wb="3d">View in 3D</button><button class="btn" data-wb="download">Export verification report</button></div></div><div class="wb-dial"><b>'+a.drawn+' / '+a.total+'</b><small>MODELED CONNECTIONS<br>NOT PHYSICAL SIGNOFF</small></div></div></div>'+
 '<div class="wb-stats"><div class="wb-stat"><b>'+S.parts.length+'</b><span>Components</span></div><div class="wb-stat"><b>'+S.wires.length+'</b><span>Wire segments</span></div><div class="wb-stat"><b>'+a.drawn+' / '+a.total+'</b><span>Tracked connections drawn</span></div><div class="wb-stat"><b>'+a.unresolved+'</b><span>Confirmation questions</span></div></div>'+
 '<div class="wb-note"><strong>Engineering boundary</strong><p>Green means the ends share a modeled electrical net. It does <b>not</b> confirm that the real harness is wired, the Deutsch halves mate, contact/gauge fits, or a fuse/ECU output is safe. The physical placements are illustrative and the measured lengths remain unknown.</p></div>'+
 '<section class="wb-section"><div class="wb-head"><div><span class="wb-eyebrow">01 / PHYSICAL PLAN</span><h3>Vehicle zones</h3><p>Ordered front-to-rear for clarity. Pick an area to zoom in without hunting around a giant schematic.</p></div><button class="btn" data-wb="arrange">Re-space layout</button></div><div class="wb-zone-grid">'+zones.map((z,i)=>'<button type="button" class="wb-zone" data-wb="zone" data-id="'+h(z.id)+'"><span class="wb-zone-index" style="color:'+h(z.col)+'">'+String(i+1).padStart(2,'0')+'</span><b>'+h(z.name.replace(/^\d+ · /,''))+'</b><small>'+S.parts.filter(p=>p.x>=z.x&&p.x<z.x+z.w&&p.y>=z.y&&p.y<z.y+z.h).length+' components · focus area</small><span class="wb-zone-line" style="background:'+h(z.col)+'"></span></button>').join('')+'</div></section>'+
 '<section class="wb-section"><div class="wb-head"><div><span class="wb-eyebrow">02 / CONNECTION REGISTER</span><h3>Modeled wiring paths</h3><p>Source-to-load mapping from the supplied Race LS connector reference and owner-described ECU breakout and vehicle wiring.</p></div><button class="btn" data-wb="lab">Run electrical validation</button></div><div class="wb-filters"><div class="wb-chips">'+groups.map(x=>'<button data-wb="group" data-group="'+h(x)+'" class="'+(x===chosenGroup?'active':'')+'">'+h(x)+'</button>').join('')+'</div><input id="wbSearch" type="search" aria-label="Search mapped connections" value="'+h(search)+'" placeholder="Search AIN, GPO, pump, pressure…"></div><div class="wb-connections">'+a.visible.map(x=>'<div class="wb-connection"><div><span class="wb-status '+(x.drawn?'yes':'missing')+'">'+(x.drawn?'SCHEMATIC PATH':'NOT MODELED')+'</span><strong>'+h(x.name)+'</strong><small>'+h(x.source)+'</small></div><button class="btn" data-wb="trace" data-id="'+x.id+'">Inspect source</button></div>').join('')+'</div></section>'+
 '<section class="wb-section"><div class="wb-head"><div><span class="wb-eyebrow">03 / REAL-WORLD SIGNOFF</span><h3>What I still need from you</h3><p>Record physical evidence or answers for the missing details. Notes are saved with your WireForge project and never silently mark a circuit safe.</p></div><button class="btn" data-wb="download">Download questions</button></div><div class="wb-questions">'+questions.map((q,i)=>'<article class="wb-question"><div class="wb-question-top"><span>'+(i+1)+'. '+h(q.priority.toUpperCase())+'</span><b>'+h(q.title)+'</b></div><p>'+h(q.ask)+'</p><small>'+h(q.reason)+'</small><label>Physical confirmation / part number / measurement<textarea rows="2" data-wb-answer="'+h(q.id)+'" placeholder="Add what you actually verified…">'+h(S.wfExampleAnswers?.[q.id]||'')+'</textarea></label></article>').join('')+'</div></section>'+
 '<div class="wb-bottom">Sources: MaxxECU RACE LS terminated-harness connector reference; user-described E90 LS wiring; software layout design inspired by harness.design’s schematic/layout/part workflow and JC HarnessLab’s physical loom/3D approach. Functional topology ≠ pinout certification.</div>';
}
function init(){
 document.addEventListener('click',event=>{
  const b=event.target.closest('[data-wb]');if(!b)return;
  switch(b.dataset.wb){
   case 'arrange':arrange();break;
   case 'zone':showZone(b.dataset.id);break;
   case 'fit':showTab('draw');fit();break;
   case '3d':if(typeof wf3dOpen==='function')wf3dOpen();break;
   case 'lab':showTab('lab');break;
   case 'download':download();break;
   case 'group':chosenGroup=b.dataset.group;render();break;
   case 'trace':findLinked(b.dataset.id);break;
  }
 });
 document.addEventListener('input',event=>{
  if(event.target.id!=='wbSearch')return;
  search=event.target.value.toLowerCase();const pos=event.target.selectionStart;
  render();const el=$('wbSearch');el?.focus();try{el?.setSelectionRange(pos,pos)}catch(_){}
 });
 document.addEventListener('change',event=>{
  if(!event.target.matches('[data-wb-answer]'))return;
  S.wfExampleAnswers=S.wfExampleAnswers||{};
  S.wfExampleAnswers[event.target.dataset.wbAnswer]=event.target.value.trim().slice(0,2000);
  save();toast('Physical confirmation note saved in active project');
 });
 if(S.tab==='blueprint')render();
}
window.WFBlueprint={render,report,arrange,showZone,questions,expected};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();