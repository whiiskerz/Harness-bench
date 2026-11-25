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
  assert.equal(dev[4],'1');assert.equal(dev[14],'42');assert.notEqual(rly[0],dev[0]);
  assert.equal(await page.evaluate(()=>S.parts.filter(p=>p.mate).length),2);
  const txt=await page.locator('.ds-report').textContent();
  assert.match(txt,/RLY-30/);assert.match(txt,/DEV-PWR/);assert.match(txt,/18\.5/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errs,[]);
 }finally{await ctx.close();}
};
