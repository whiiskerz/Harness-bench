const real=require('node:assert/strict');let assertions=0;
const assert=Object.fromEntries(['equal','deepEqual','ok','match','notEqual'].map(k=>[k,(...a)=>{assertions++;return real[k](...a);}]));
module.exports=async function(browser,url){
 const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:2,acceptDownloads:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const action=async id=>{const b=page.locator('[data-fb="'+id+'"]').first();if(!await b.isVisible())await page.locator('.ds-demomenu summary').tap();await b.tap();};
 const count=()=>page.evaluate(()=>S.wires.length);
 try{
 await page.goto(url.split('#')[0]+'#studio');await page.waitForSelector('.ds-shell');
 await page.locator('#dsDemoSelect').selectOption('ls');
 assert.deepEqual(await page.evaluate(()=>[S.parts.length>7,S.parts.filter(p=>p.mate).length,S.looms.length,S.wires.filter(w=>/^V/.test(w.wid||'')).length>8]),[true,4,12,true]);
 await action('quickWire');
 await page.locator('[data-quick-connector="Source"]').selectOption(await page.evaluate(()=>S.wfFormboard.nodes.find(n=>n.partId===4).id));
 await page.locator('[data-quick-connector="Destination"]').selectOption(await page.evaluate(()=>S.wfFormboard.nodes.find(n=>n.partId===6).id));
 const before=await count();
 await page.locator('[data-fb="quickPin"][data-side="Source"]:not([disabled])').first().tap();
 await page.locator('[data-fb="quickPin"][data-side="Destination"]:not([disabled])').first().tap();
 assert.equal(await count(),before+1);
 await page.locator('[data-fb="quickPin"][data-side="Source"]:not([disabled])').first().tap();await page.locator('[data-fb="quickPin"][data-side="Destination"]:not([disabled])').first().tap();
 assert.equal(await count(),before+2,'second consecutive wire needs only two taps');
 await action('quickEdit');await page.waitForSelector('#weId');
 await page.locator('#dsDemoSelect').selectOption('hd30');
 assert.deepEqual(await page.evaluate(()=>[S.parts.length,S.wires.length,T[S.parts[0].t].pins.length,S.wires.filter(w=>w.loom).length,S.parts[1].mate,S.parts[2].mate]),[4,48,48,47,3,2]);
 await action('lookWires');assert.equal(await page.locator('[data-wire-hit]').count(),48);
 const pt=await page.locator('[data-wire-hit="10"] path').first().evaluate(p=>{const m=p.getScreenCTM();for(let f=.3;f<=.8;f+=.025){const q=p.getPointAtLength(p.getTotalLength()*f),x=m.a*q.x+m.c*q.y+m.e,y=m.b*q.x+m.d*q.y+m.f;if(document.elementFromPoint(x,y)?.closest('[data-wire-hit]')===p.closest('[data-wire-hit]'))return {x,y};}throw Error('No unobstructed W01 hit target');});await page.touchscreen.tap(pt.x,pt.y);await page.waitForSelector('#weId');
 assert.equal(await page.inputValue('#weId'),'W01');assert.equal(await page.inputValue('#weColor'),'GRN');assert.equal(await page.inputValue('#weLen'),'17.72');
 await action('wireTrace');assert.equal(await page.locator('[data-mate-trace="active"]').count(),1);
 await page.fill('#weSig','Fan edited');await action('wireSave');assert.equal(await page.evaluate(()=>S.wires[0].sig),'Fan edited');
 await action('wireDelete');assert.equal(await count(),47);await action('designUndo');assert.equal(await count(),48);
 await action('multiMode');await page.locator('[data-fb="multiWire"]').nth(0).tap();await page.locator('[data-fb="multiWire"]').nth(1).tap();await action('deleteSelected');assert.equal(await count(),46);await action('designUndo');assert.equal(await count(),48);
 await action('lookLoom');assert.equal(await page.locator('[data-wire-hit]').count(),0);
 await page.reload();await page.waitForSelector('.ds-shell');assert.equal(await count(),48);
 await action('studioShop');for(const id of ['shopPdf','shopCsv','bom']){const [dl]=await Promise.all([page.waitForEvent('download'),action(id)]);assert.ok(await dl.path());}
 await action('design');await action('clearDesign');assert.equal(await count(),0);await action('designUndo');assert.equal(await count(),48);await action('designRedo');assert.equal(await count(),0);
 await page.locator('#dsDemoSelect').selectOption('ls');await page.waitForTimeout(300);
 await page.reload();await page.waitForSelector('.ds-shell');
 assert.ok(await page.evaluate(()=>S.wires.filter(w=>/^V/.test(w.wid||'')&&w.awg&&w.color).length>8),'vehicle-side wires keep gauge and color after reload');
 assert.equal(await page.evaluate(()=>S.wires.filter(w=>!w.color).length),0);
 const topo=await page.evaluate(()=>{const nm=id=>S.parts.find(p=>p.id===id)?.name||'';const ecuPins=w=>[w.a,w.b].map(e=>S.parts.find(p=>p.id===e.p)).filter(Boolean).map(p=>p.name);return{
  g:Object.fromEntries(S.wires.filter(w=>/^G0/.test(w.wid||'')).map(w=>[w.wid,[nm(w.a.p),nm(w.b.p)]])),
  trig:S.wires.filter(w=>/Trigger GND|Sensor GND/.test(w.sig||'')).map(w=>[w.sig,nm(w.a.p),nm(w.b.p)]),
  shieldOnBulkhead:S.wires.filter(w=>/GND Shield/.test(w.sig||'')).length,
  counts:{coils:S.parts.filter(p=>/^Ignition coil/.test(p.name)).length,inj:S.parts.filter(p=>/^Injector \d/.test(p.name)).length},
  h01:S.wires.find(w=>w.wid==='H01')&&[nm(S.wires.find(w=>w.wid==='H01').a.p),nm(S.wires.find(w=>w.wid==='H01').b.p)],
  chassis:S.wires.filter(w=>[w.a.p,w.b.p].includes(S.parts.find(p=>p.name==='Engine bay chassis ground stud').id)).length,
  looms:S.looms.map(l=>l.name)}});
 assert.equal(topo.g.G01[1],'ECU ground – back of head');assert.equal(topo.g.G02[1],'ECU ground – back of head');
 assert.ok(topo.trig.every(t=>!/ground stud|ECU ground|back of head/.test(t[1]+t[2])),'Sensor/Trigger GND never go to head or chassis');
 assert.ok(topo.trig.some(t=>/Sensor GND return junction/.test(t[2])),'sensor return junction');assert.ok(topo.trig.some(t=>/Trigger GND return junction/.test(t[2])),'trigger return junction');
 assert.equal(topo.shieldOnBulkhead,0,'shield drains stay at the ECU (MaxxECU: shields grounded only through the ECU)');
 assert.deepEqual([topo.counts.coils,topo.counts.inj,topo.chassis],[8,8,0]);assert.equal(topo.h01[1],'8HP harness (6-position, owner map)');
 for(const n of ['5 · Engine sensors','6 · DBW throttle + pedal','7 · ZF 8HP','4 · Injectors'])assert.ok(topo.looms.includes(n),n);
 const studs=await page.evaluate(()=>({names:S.parts.filter(p=>p.t==='stud').map(p=>p.name),wires:Object.fromEntries(S.wires.filter(w=>/^[GP]\d\d$/.test(w.wid||'')).map(w=>[w.wid,[S.parts.find(p=>p.id===w.a.p).name,S.parts.find(p=>p.id===w.b.p).name,w.auditStatus,w.loom]]))}));
 for(const n of ['Engine bay +12V large stud (unfused)','Engine bay +12V small stud (OEM fused constant 12V)','Engine bay chassis ground stud','ECU ground – back of head'])assert.ok(studs.names.includes(n),'stud '+n);
 assert.equal(studs.wires.G01[1],'ECU ground – back of head');assert.equal(studs.wires.P04[0],'Engine bay +12V small stud (OEM fused constant 12V)');
 assert.equal(studs.wires.P02[0],'Engine bay +12V large stud (unfused)');assert.ok(Object.values(studs.wires).every(w=>w[2]==='unverified'),'stud circuits are flagged unverified');
 assert.equal(await page.evaluate(()=>S.wires.filter(w=>w.b.p===S.parts.find(p=>p.name==='Engine bay chassis ground stud').id||w.a.p===S.parts.find(p=>p.name==='Engine bay chassis ground stud').id).length),0,'no invented chassis ground connections');
 await action('studioShop');for(const id of ['shopPdf','shopCsv','bom']){const [dl]=await Promise.all([page.waitForEvent('download'),action(id)]);assert.ok(await dl.path());}
 assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
};
module.exports.assertions=()=>assertions;
if(require.main===module)(async()=>{
 const {chromium}=require('playwright');const b=await chromium.launch();
 try{await module.exports(b,process.argv[2]||'http://127.0.0.1:8765/index.html');console.log('PASS hd30 demo browser: '+assertions+' assertions executed');}
 catch(e){console.error(e.stack);process.exitCode=1;}finally{await b.close();}
})();
