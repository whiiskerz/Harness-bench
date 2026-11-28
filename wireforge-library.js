/* Harness Bench universal library: categories, personal parts, templates. No vehicle/ECU specifics in logic. */
(function(root){
 const CATS=[
  ['ecu','ECUs and controllers'],['conn','Connectors and terminals'],['sensor','Sensors'],['actuator','Actuators'],
  ['power','Power distribution'],['battery','Batteries and alternators'],['fuse','Fuses and circuit breakers'],
  ['relay','Relays and solid-state relays'],['ground','Grounds and distribution studs'],['splice','Splices and junctions'],
  ['cable','Wiring and cable'],['protect','Harness protection and coverings']];
 const names=Object.fromEntries(CATS);
 const BY_ID={mxecu:'ecu',mx12:'ecu',mx16:'ecu',mxwbo:'ecu',etb6:'actuator',tps3:'sensor',mxpedal:'sensor',
  inj2:'actuator',coil3:'actuator',coil4:'actuator',nsol:'actuator',psol:'actuator',heater:'actuator',load2:'actuator',starter:'actuator',surge:'actuator',
  jpt2:'sensor',knock2:'sensor',clt2:'sensor',sens2:'sensor',sens3:'sensor',flex:'sensor','ac-tap':'sensor',ekptrig:'sensor',
  bat:'battery',speedwayalt:'battery',
  fuse6:'fuse',fuse12:'fuse',inl:'fuse',demo_fused12:'fuse',fusegnd:'fuse',
  relay:'relay',relay4:'relay',rp4:'relay',rp5:'relay',dual:'relay',leash1:'relay',e90leash1:'relay',ssr:'relay',
  pdb:'power',stud:'ground',gbus6:'ground',gbus12:'ground',gnd:'ground',bmwbig:'ground',bmwsmall:'ground',
  splice:'splice',dist:'splice',canhub4:'splice',canhub6:'splice',cansplit:'splice',
  r10:'conn',r14:'conn',r516:'conn',r38:'conn'};
 function catOf(t){
  if(!t)return 'conn';
  if(t.cat&&names[t.cat])return t.cat;
  if(BY_ID[t.id])return BY_ID[t.id];
  if(/^mxrace|^mxpig/.test(t.id))return 'ecu';
  return 'conn'; // dt, molex, maven, HD30, user housings default to connectors
 }
 const tokens=q=>String(q||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(x=>x.replace(/s$/,''));
 function search(all,q,cat){
  const tk=tokens(q);
  return all.filter(t=>!cat||catOf(t)===cat).map(t=>{
   const hay=(t.name+' '+(t.sub||'')+' '+(t.pn||'')+' '+t.id+' '+names[catOf(t)]+' '+(t.pins||[]).map(p=>p.l).join(' ')).toLowerCase();
   return{t,score:tk.filter(k=>hay.includes(k)).length};
  }).filter(r=>!tk.length||r.score>0).sort((a,b)=>b.score-a.score||a.t.name.localeCompare(b.t.name)).map(r=>r.t);
 }
 /* cavity text: one cavity per line or comma. "A=Signal", "2 Ground", or just "1". */
 function parseCavities(text){
  const out=[],seen=new Set();
  for(const raw of String(text||'').split(/[\n,;]+/)){
   const s=raw.trim();if(!s)continue;
   const m=/^([^=:\s]+)\s*[=:\s]\s*(.+)$/.exec(s);
   const p=m?m[1]:s,l=m?m[2].trim():'';
   if(seen.has(p))return{error:'Cavity '+p+' is listed twice.'};
   seen.add(p);out.push({p,l});
  }
  if(!out.length)return{error:'Add at least one cavity.'};
  if(out.length>120)return{error:'Up to 120 cavities.'};
  return{pins:out};
 }
 const KEY='wfPersonalLib';
 function loadPersonal(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&x.id&&Array.isArray(x.pins)):[];}catch(e){return[];}}
 function savePersonal(a){try{localStorage.setItem(KEY,JSON.stringify(a));return true;}catch(e){return false;}}
 function makePersonal({name,pn,cat,text,notes}){
  name=String(name||'').trim();if(!name)return{error:'Give the part a name.'};
  const c=parseCavities(text);if(c.error)return c;
  return{part:{id:'usr'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36),name,pn:String(pn||'').trim(),cat:names[cat]?cat:'conn',pins:c.pins,notes:String(notes||'').trim()}};
 }
 /* Generic starter templates: parts and cable runs only. No wires, lengths or pin functions are invented. */
 const TEMPLATES=[
  {id:'ecu-bulkhead',name:'ECU to bulkhead to devices',desc:'Controller, a bulkhead pair and a device connector. Wire it by tapping cavities.',
   parts:[['mol48','ECU connector',140,300,180],['dt12','Bulkhead A',620,300,0],['dt12','Bulkhead B',780,300,180],['sens3','Sensor',1160,180,180],['load2','Actuator',1160,420,180]],
   runs:[[0,1],[2,3],[2,4]]},
  {id:'power-relay',name:'Fused power and relay',desc:'Battery, fuse box, relay, load and ground bus for a switched circuit.',
   parts:[['bat','Battery',140,300,180],['fuse6','Fuse box',500,300,0],['relay','Relay',860,180,0],['load2','Load',1200,180,180],['gbus6','Ground bus',860,440,0]],
   runs:[[0,1],[1,2],[2,3],[0,4]]},
  {id:'sensor-leg',name:'Controller with sensors and actuators',desc:'Controller connector with two sensors, an injector and a coil.',
   parts:[['mol32','Controller',140,300,180],['sens3','Sensor 1',700,120,180],['sens2','Sensor 2',700,260,180],['inj2','Injector',700,400,180],['coil3','Coil',700,540,180]],
   runs:[[0,1],[0,2],[0,3],[0,4]]}];
 const MATERIALS=[
 {id:'txl',name:'TXL wire',cat:'cable',kind:'wire',desc:'SAE J1128 thin-wall cross-linked automotive wire. Ratings: check the maker datasheet.'},
 {id:'gxl',name:'GXL wire',cat:'cable',kind:'wire',desc:'SAE J1128 general-purpose cross-linked automotive wire. Ratings: check the maker datasheet.'},
 {id:'sxl',name:'SXL wire',cat:'cable',kind:'wire',desc:'SAE J1128 standard-wall cross-linked automotive wire. Ratings: check the maker datasheet.'},
 {id:'m22759',name:'M22759 wire',cat:'cable',kind:'wire',desc:'MIL-W-22759 fluoropolymer wire. Slash sheet and rating: TBD, set from your supplier.'},
 {id:'shielded',name:'Shielded cable',cat:'cable',kind:'wire',desc:'Conductors with an overall shield. Drain and termination: TBD.'},
 {id:'twisted',name:'Twisted-pair cable',cat:'cable',kind:'wire',desc:'Two twisted conductors, for example a data pair. Twist rate: TBD.'},
 {id:'battery',name:'Battery cable',cat:'cable',kind:'wire',desc:'Large-gauge power cable. Gauge and rating: TBD.'},
 {id:'dr25',name:'DR-25',cat:'protect',kind:'cover',desc:'Heat-shrinkable harness sleeving. Size and recovery ratio: TBD.'},
 {id:'braid',name:'Braided PET',cat:'protect',kind:'cover',desc:'Expandable braided sleeving.'},
 {id:'split',name:'Split loom',cat:'protect',kind:'cover',desc:'Slit corrugated conduit for easy service.'},
 {id:'hs',name:'Heat shrink tubing',cat:'protect',kind:'cover',desc:'General heat-shrink tubing.'},
 {id:'boot',name:'Molded boot',cat:'protect',kind:'boot',desc:'Connector or backshell boot. Straight or angled: TBD.'},
 {id:'grommet',name:'Grommet',cat:'protect',kind:'count',desc:'Panel or firewall pass-through grommet.'},
 {id:'ties',name:'Cable ties',cat:'protect',kind:'count',desc:'Cable ties, count per harness.'},
 {id:'labels',name:'Harness labels',cat:'protect',kind:'count',desc:'Wire or branch labels.'}];
const MKEY='wfPersonalMats';
function loadMats(){try{const a=JSON.parse(localStorage.getItem(MKEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&x.id&&x.name):[];}catch(e){return[];}}
function saveMats(a){try{localStorage.setItem(MKEY,JSON.stringify(a));return true;}catch(e){return false;}}
function makeMat({name,desc,cat,kind}){name=String(name||'').trim();if(!name)return{error:'Give the material a name.'};return{mat:{id:'um'+Date.now().toString(36),name,cat:cat==='protect'?'protect':'cable',kind:kind||(cat==='protect'?'cover':'wire'),desc:String(desc||'').trim()||'Custom specification',custom:true}};}
function searchMats(q,cat){const tk=tokens(q);return MATERIALS.concat(loadMats()).filter(m=>(!cat||m.cat===cat)&&(cat||tk.length)).map(m=>{const hay=(m.name+' '+m.desc+' '+m.kind+' '+names[m.cat]).toLowerCase();return{m,score:tk.filter(k=>hay.includes(k)).length};}).filter(r=>!tk.length||r.score>0).sort((a,b)=>b.score-a.score).map(r=>r.m);}
root.WF_LIB={MATERIALS,loadMats,saveMats,makeMat,searchMats,CATS,catOf,search,parseCavities,loadPersonal,savePersonal,makePersonal,TEMPLATES,catName:id=>names[id]||''};
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.WF_LIB;
