const assert=require('node:assert/strict');
const OUT=process.env.WF_SHOT_DIR||'';
module.exports=async function testWireWorkflow(browser,url){
 const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:false,deviceScaleFactor:2});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 const base=url.split('#')[0];
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  // blank project through the Project Vault button
  await page.evaluate(()=>showTab('vault')).catch(()=>{});
  const blank=page.locator('[data-wfv="blank"]').first();
  if(!await blank.count())await page.evaluate(()=>{document.querySelector('[data-tab="pro"],[data-tab="vault"]')?.click()});
  await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
  await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.ds-shell');
  assert.deepEqual(await page.evaluate(()=>[S.parts.length,S.wires.length]),[0,0]);
  const place=async(label,x,y)=>{
   await page.locator('button[aria-label="Parts"]').tap();
   await page.locator('.ds-part',{hasText:label}).tap();
   const box=await page.locator('#wfFormSvg').boundingBox();
   await page.touchscreen.tap(box.x+x,box.y+y);
  };
  await place('4-pin relay',120,250);
  await place('DT04-4P',330,250);
  await place('DT06-4S',540,250);
  await place('Device',750,250);
  assert.equal(await page.evaluate(()=>S.parts.length),4);
  const tapPart=async name=>{
   const n=await page.evaluate(n=>{const p=S.parts.find(p=>p.name.includes(n));return S.wfFormboard.nodes.find(x=>x.partId===p.id).id},name);
   await page.locator('[data-node="'+n+'"]').first().tap();
  };
  // mate the two separately placed halves
  await tapPart('DT04-4P');
  await page.locator('#dsMate').selectOption({index:1});
  assert.equal(await page.evaluate(()=>{const a=S.parts.find(p=>p.t==='dt04_4p'),b=S.parts.find(p=>p.t==='dt06_4s');return a.mate===b.id&&b.mate===a.id}),true);
  // compact cavity picker: cavities big enough to tap, panel inside the viewport
  const cav=await page.locator('.ds-cav').first().boundingBox();
  assert.ok(cav.height>=44&&cav.width>=80,'touch size');
  // relay 30 -> receptacle cavity 1
  await tapPart('Relay 4-pin');
  await page.locator('.ds-cav',{hasText:'Battery'}).tap();
  await page.getByRole('button',{name:'Run wire'}).tap();
  await tapPart('DT04-4P');
  await page.locator('.ds-cav').first().tap();
  await page.fill('#weId','RLY-30');await page.fill('#weColor','RED');await page.fill('#weStripe','WHT');
  await page.fill('#weAwg','14');await page.fill('#weLen','18.5');
  await page.getByRole('button',{name:'Save wire'}).tap();
  await page.getByRole('button',{name:'Done'}).tap();
  // plug cavity 1 -> device +
  await tapPart('DT06-4S');
  await page.locator('.ds-cav').first().tap();
  await page.getByRole('button',{name:'Run wire'}).tap();
  await tapPart('2-wire load');
  await page.locator('.ds-cav').first().tap();
  await page.fill('#weId','DEV-PWR');await page.fill('#weAwg','16');await page.fill('#weLen','42');
  await page.getByRole('button',{name:'Save wire'}).tap();
  const trace=await page.locator('.ds-chain').textContent();
  assert.match(trace,/RLY-30/);assert.match(trace,/DEV-PWR/);assert.match(trace,/adds no wire/);
  if(OUT)await page.screenshot({path:OUT+'/ipad-route.png'});
  const rows=await page.evaluate(()=>S.wires.map(w=>[w.wid,w.awg,w.color,w.len,w.a.i,w.b.i]));
  assert.deepEqual(rows,[['RLY-30',14,'RED/WHT',18.5,0,0],['DEV-PWR',16,'',42,0,0]]);
  assert.equal(await page.evaluate(()=>compatIssues().filter(i=>/DT0/.test(i.plain)).length),0);
  // ---- tap, trace, pan, pinch ----
  const svgBox=await page.locator('#wfFormSvg').boundingBox();
  const segPoint=async(i,frac)=>page.evaluate(([i,f])=>{const p=document.querySelectorAll('[data-seg]')[i].querySelectorAll('path')[1];const pt=p.getPointAtLength(p.getTotalLength()*f);const m=p.getScreenCTM();return{x:m.a*pt.x+m.c*pt.y+m.e,y:m.b*pt.x+m.d*pt.y+m.f}},[i,frac]);
  await page.touchscreen.tap(svgBox.x+380,svgBox.y+620);               // empty canvas dismisses
  assert.equal(await page.locator('.ds-wireeditor,.ds-wirepanel').count(),0);
  await page.getByRole('button',{name:'Fit'}).tap();
  if(OUT)await page.screenshot({path:OUT+'/ipad-harness.png'});
  const vb=()=>page.evaluate(()=>document.getElementById('wfFormSvg').getAttribute('viewBox'));
  const v0=await vb();
  await page.mouse.move(svgBox.x+300,svgBox.y+640);await page.mouse.down();await page.mouse.move(svgBox.x+380,svgBox.y+700,{steps:6});await page.mouse.up();
  assert.notEqual(await vb(),v0,'drag on empty canvas pans');
  assert.equal(await page.locator('.ds-wireeditor').count(),0);
  await page.evaluate(()=>{const svg=document.getElementById('wfFormSvg'),r=svg.getBoundingClientRect(),mk=(x,y)=>new Touch({identifier:x,target:svg,clientX:x,clientY:y});
   const cx=r.x+r.width/2,cy=r.y+r.height/2,fire=(t,a,b)=>svg.dispatchEvent(new TouchEvent(t,{touches:[mk(a,cy),mk(b,cy)],bubbles:true,cancelable:true}));
   fire('touchstart',cx-40,cx+40);fire('touchmove',cx-90,cx+90);svg.dispatchEvent(new TouchEvent('touchend',{touches:[],bubbles:true}));});
  const wOf=async()=>Number((await vb()).split(' ')[2]);
  const w1=await wOf();assert.ok(w1<Number(v0.split(' ')[2]),'pinch zooms in');
  await page.getByRole('button',{name:'Fit'}).tap();
  // tap the relay wire on the canvas: one wire, inspector opens with both ends
  let pt=await segPoint(0,.3);await page.touchscreen.tap(pt.x,pt.y);
  assert.match(await page.locator('.ds-ends').textContent(),/Relay 4-pin.*30.*DT04-4P.*1/);
  // a second wire in the same cable: picker lists both
  await page.getByRole('button',{name:'Done'}).tap();
  await tapPart('Relay 4-pin');await page.locator('.ds-cav',{hasText:'Coil +'}).tap();await page.getByRole('button',{name:'Run wire'}).tap();
  await tapPart('DT04-4P');await page.locator('.ds-cav').nth(1).tap();
  await page.fill('#weId','RLY-86');await page.getByRole('button',{name:'Save wire'}).tap();await page.getByRole('button',{name:'Done'}).tap();
  pt=await segPoint(0,.3);await page.touchscreen.tap(pt.x,pt.y);
  assert.equal(await page.locator('.ds-wirelist button').count(),2);
  await page.locator('.ds-wirelist button',{hasText:'RLY-86'}).tap();
  await page.getByRole('button',{name:'Delete'}).tap();
  assert.equal(await page.evaluate(()=>S.wires.length),2);
  // tap the device wire, edit it, trace through the mate
  pt=await segPoint(1,.5);await page.touchscreen.tap(pt.x,pt.y);
  assert.match(await page.locator('.ds-ends').textContent(),/DT06-4S.*1.*load/i);
  assert.match(await page.locator('.ds-assume').textContent(),/ASSUMPTION/);
  await page.fill('#weColor','BLK');await page.fill('#weStripe','YEL');await page.getByRole('button',{name:'Save wire'}).tap();
  if(OUT)await page.screenshot({path:OUT+'/ipad-trace.png'});
  assert.equal(await page.evaluate(()=>S.wires.find(w=>w.wid==='DEV-PWR').color),'BLK/YEL');
  // loom: cover the relay→DT cable with DR-25 and label
  const seg=await page.evaluate(()=>{const g=S.wfFormboard;return g.segments.map(s=>s.id)});
  assert.equal(seg.length,2);
  await page.evaluate(()=>{const g=S.wfFormboard;g.segments[0].sleeve='DR-25';g.segments[0].label='Relay feed';g.segments[0].length=20;g.segments[1].length=44;save();});
  // move a connector: measured lengths unchanged
  const before=await page.evaluate(()=>JSON.stringify([S.wfFormboard.segments.map(s=>s.length),S.wires.map(w=>w.len)]));
  await page.evaluate(()=>{const n=S.wfFormboard.nodes[0];n.x+=140;n.y+=60;save()});
  assert.equal(await page.evaluate(()=>JSON.stringify([S.wfFormboard.segments.map(s=>s.length),S.wires.map(w=>w.len)])),before);
  // MaxxECU pigtail: find J4, land on a bulkhead cavity, leave H3 loose
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  await place('C1 · RACE pigtail',200,520);
  await place('HD30',600,520);
  await tapPart('prewired pigtail');
  await page.locator('.ds-cav',{hasText:'AIN 4'}).tap();
  await page.getByRole('button',{name:'Run wire'}).tap();
  await tapPart('HD30');
  await page.locator('.ds-faces button').nth(1).tap();
  await page.locator('.ds-cav').nth(6).tap();
  assert.equal(await page.evaluate(()=>S.wires.filter(w=>/AIN 4/.test(w.sig||'')).length),1);
  assert.equal(await page.evaluate(()=>S.wires.some(w=>/TRIGGER/.test(w.sig||''))),false);
  // reload and compare the schedule
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const sched=await page.evaluate(()=>S.wires.map(w=>w.wid||w.sig));
  assert.equal(sched.length,3);
  await page.locator('[data-fb="studioCuts"]').tap();
  const [dl]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Wire schedule CSV'}).tap()]);
  const csvText=require('fs').readFileSync(await dl.path(),'utf8');
  const lines=csvText.replace(/^\uFEFF/,'').split('\n').map(l=>l.replace(/"/g,'').split(','));
  const rly=lines.find(l=>l[0]==='RLY-30'),dev=lines.find(l=>l[0]==='DEV-PWR');
  assert.ok(rly&&dev,'both wires in CSV');
  assert.match(rly[2],/DT04-4P|Relay/);assert.equal(rly[4],'30');assert.equal(rly[9],'1');assert.equal(rly[14],'18.5');
  assert.equal(dev[4],'1');assert.match(csvText,/ASSUMPTION/);assert.equal(dev[14],'42');assert.notEqual(rly[0],dev[0]);
  assert.equal(await page.evaluate(()=>S.parts.filter(p=>p.mate).length),2);
  const txt=await page.locator('.ds-report').textContent();
  assert.match(txt,/RLY-30/);assert.match(txt,/DEV-PWR/);assert.match(txt,/18\.5/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errs,[]);
 }finally{await ctx.close();}
};
