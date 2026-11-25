/* MaxxECU Gen1 RACE prewired pigtail templates (Phase 1).
   Function names come from the existing RACE tables (MAXXECU_MAIN V1/RACE/PRO column, MAXXECU_AUX).
   Every fact carries a status: 'official' (seen in MaxxECU RACE REV9+ wiring PDF), 'owner' (owner-supplied/convention),
   'tbd' (not verified). Nothing here sets a gauge, length or destination. */
(function(){
 const OFF='MaxxECU RACE (REV9+) wiring PDF',OWN='Owner-supplied';
 const MOLEX={
  mxpig48:{name:'C1 · 48-pin main',housing:'643203311',cover:'643201301',contacts:['643231039','643231029','643221029']},
  mxpig32:{name:'C2 · 32-pin black',housing:'0643193211',cover:'0643191201',contacts:['643231029','643221029']}
 };
 const molexStatus='Owner-supplied reference number. Not confirmed in the MaxxECU documents checked (store page names the 32-pin Molex connector but lists no housing, cover or contact numbers). Confirm with MaxxECU or Molex before ordering.';
 const contactStatus='Contact quantity and crimp range do not say which cavity uses which terminal.';
 const sizeStatus='Wire size: TBD (editable design choice).';
 function rule(t,fn,cav){
  const f=String(fn).toLowerCase();
  if(t==='mxpig48'){
   if(cav==='H3')return{color:'BLK',group:'Crank/trigger lead · shield: review',note:'Trigger wire is black in the MaxxECU wiring. Cable shields are grounded only through the ECU. Twist and shield build: confirm in MaxxECU wiring instructions.',status:'official',src:OFF};
   if(cav==='H4')return{color:'GRY',group:'Cam/home lead · shield: review',note:'Home/cam wire is grey in the MaxxECU wiring. Cable shields are grounded only through the ECU. Twist and shield build: confirm in MaxxECU wiring instructions.',status:'official',src:OFF};
   if(cav==='H2')return{group:'Trigger return · shield: review',note:'VR/trigger ground. Never join to chassis ground. Pair with the trigger lead per MaxxECU instructions.',status:'official',src:OFF};
   if(cav==='H1')return{group:'Sensor ground',note:'Sensor GND must never be connected to chassis ground.',status:'official',src:OFF};
   if(cav==='E3')return{group:'Shield ground',note:'Shield GND pin. Shields are grounded only through the ECU.',status:'official',src:OFF};
   if(cav==='E1')return{color:'GRY',group:'CAN pair · twist (design choice)',note:'CAN H. Grey/pink leads directly off the ECU (owner convention: H grey, L pink). 120 ohm termination is built into CAN 1.',status:'owner',src:OWN};
   if(cav==='E2')return{color:'PNK',group:'CAN pair · twist (design choice)',note:'CAN L. Grey/pink leads directly off the ECU (owner convention: H grey, L pink). 120 ohm termination is built into CAN 1.',status:'owner',src:OWN};
  }else{
   if(/^EGT/.test(fn))return{group:'Thermocouple pair · '+fn.replace(/[+−-]$/,'').trim(),note:'EGT: use thermocouple (type K/N) cable and contacts only, tip isolated from ground. Cold-junction compensation note kept: any intermediate bulkhead or non-thermocouple contact in this path needs review.',status:'owner',src:OFF+' / '+OWN,review:true};
   if(/^Knock/.test(fn))return{group:'Knock · shield: TBD',note:'Knock sensors (Bosch 0261 231 046 in the MaxxECU wiring) are not polarity sensitive. Shield and cable build: TBD.',status:'tbd'};
  }
  return{};
 }
 function build(t){
  const rows=t==='mxpig48'?MAXXECU_MAIN.map(r=>[r[0],r[1]]):MAXXECU_AUX;
  const out={};
  rows.forEach(r=>{out[r[0]]=Object.assign({fn:r[1],contact:'TBD',awg:0,color:'',group:'',note:'',status:'tbd'},rule(t,r[1],r[0]))});
  return out;
 }
 const cache={};
 window.WF_PIG={
  isPig:t=>t==='mxpig48'||t==='mxpig32',
  spec(t,cav){cache[t]??=build(t);return cache[t][cav]||null},
  molex:t=>MOLEX[t],
  notes:{molexStatus,contactStatus,sizeStatus},
  /* tests use this to find a lead by cavity text or function text */
  find(t,q){q=String(q||'').trim().toLowerCase().replace(/\s+/g,'');if(!q)return[];cache[t]??=build(t);
   return Object.entries(cache[t]).filter(([c,s])=>c.toLowerCase()===q||(c+s.fn).toLowerCase().replace(/\s+/g,'').includes(q)).map(([c])=>c)}
 };
})();
