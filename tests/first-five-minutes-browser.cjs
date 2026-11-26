const assert=require('node:assert/strict');
const fs=require('node:fs');
const OUT=process.env.WF_SHOT_DIR||'';
module.exports=async function testFirstFive(browser,url){
 const ctx=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,deviceScaleFactor:2,acceptDownloads:true});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 const base=url.split('#')[0],T=[];
 const step=s=>T.push(s);
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>showTab('vault')).catch(()=>{});
  await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
  await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const svgTap=async(x,y)=>{const b=await page.locator('#wfFormSvg').boundingBox();await page.touchscreen.tap(b.x+x,b.y+y);};
  const nodeOf=name=>page.evaluate(n=>{const p=S.parts.find(p=>p.name===n);return S.wfFormboard.nodes.find(x=>x.partId===p.id).id},name);
  const tapNode=async name=>{await page.locator('[data-node="'+await nodeOf(name)+'"]').first().tap();};
  // 1 place a connector
  assert.match(await page.locator('.ds-first').textContent(),/Add your first connector/);
  await page.locator('#dsFirstQ').fill('RACE pigtail');
  assert.ok(await page.locator('.ds-firstres [data-type="mxpig48"]').count());
  await page.locator('.ds-firstres [data-type="mxpig48"]').tap();step('Tap "C1 · RACE pigtail" in the search results');
  await svgTap(130,380);step('Tap the canvas to place it');
  const place=async(type,x,y)=>{await page.locator('button[aria-label="Parts"]').tap();await page.locator('.ds-part[data-type="'+type+'"]').tap();await svgTap(x,y);};
  await place('hd30_47',390,380);await place('inj2',590,300);
  assert.equal(await page.evaluate(()=>S.parts.length),3);
  // name + duplicate injector
  const inj=await page.evaluate(()=>S.parts.find(p=>p.t==='inj2').name);
  await page.locator('#dsName').fill('INJ1');await page.locator('#dsPN').fill('TBD-INJ');
  await page.locator('[data-fb="partDup"]').tap();step('Tap injector, name it INJ1, tap Duplicate (makes INJ2)');
  const names=await page.evaluate(()=>S.parts.filter(p=>p.t==='inj2').map(p=>p.name).sort());
  assert.deepEqual(names,['INJ1','INJ2']);
  // 2 make a wire: C1 J4 -> bulkhead
  const c1=await page.evaluate(()=>S.parts.find(p=>p.t==='mxpig48').name);
  await page.locator('.ds-wirepanel [data-fb="dismiss"]').first().tap();
  await tapNode(c1);
  const tips=page.locator('[data-spread-tip]');
  assert.equal(await tips.count(),48);
  assert.equal(new Set(await tips.allTextContents()).size,48);
  await page.locator('[data-spread-tip="J4"]').tap();
  assert.match(await page.locator('.ds-wirepanel').textContent(),/AIN 4/);
  step('Tap C1 and tap its labeled J4 flying lead');
  await page.getByRole('button',{name:'Run wire'}).tap();step('Tap Run wire');
  assert.match(await page.locator('.ds-prompt, .ds-wirepanel').first().textContent(),/destination/i);
  await tapNode(await page.evaluate(()=>S.parts.find(p=>p.t==='hd30_47').name));
  await page.locator('.ds-cav').nth(4).tap();step('Tap the bulkhead, tap an open cavity');
  assert.equal(await page.evaluate(()=>S.wires.length),1);
  await page.locator('[data-fb="contMate"]').tap();step('Tap Continue from mate');
  await tapNode('INJ1');
  await page.locator('.ds-cav').first().tap();step('Tap INJ1, tap its cavity');
  assert.equal(await page.evaluate(()=>S.wires.length),2);
  await page.getByRole('button',{name:'Done'}).tap();
  // 3 bundle, breakout, measure
  await page.locator('.ds-steps [data-fb="bundle"]').tap();step('Tap Bundle into loom');
  assert.ok(await page.evaluate(()=>S.wfFormboard.segments.length)>=2);
  const mid=async id=>page.evaluate(id=>{const el=document.querySelector('[data-seg="'+id+'"] path'),L=el.getTotalLength(),m=el.getScreenCTM();for(const f of [.5,.4,.6,.3,.7,.2,.8,.1,.9]){const q=el.getPointAtLength(L*f),x=m.a*q.x+m.c*q.y+m.e,y=m.b*q.x+m.d*q.y+m.f;if(document.elementFromPoint(x,y)?.closest('[data-seg]')?.dataset.seg===id)return{x,y}}throw new Error('segment '+id+' fully covered')},id);
  const openRun=async id=>{const pt=await mid(id);await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(300);const b=page.locator('[data-fb="editRun"]');if(await b.count())await b.tap();};
  await openRun(await page.evaluate(()=>S.wfFormboard.segments[0].id));
  await page.locator('[data-fb="split"]').tap();step('Tap a cable run, Cable run: length + breakout, Insert breakout');
  assert.equal(await page.evaluate(()=>S.wfFormboard.nodes.filter(n=>n.partId==null).length),1);
  const lens=[42,18,9.5];
  for(const [k,id] of (await page.evaluate(()=>S.wfFormboard.segments.map(s=>s.id))).entries()){
   await page.locator('[data-fb="dismiss"]').first().tap().catch(()=>{});
   await openRun(id);await page.waitForTimeout(250);await page.locator('#fbLength').fill(String(lens[k]));await page.locator('[data-fb="segSave"]').tap();
  }
  step('Tap each cable run, enter its measured length, Save branch');
  assert.ok((await page.evaluate(()=>S.wfFormboard.segments.every(s=>s.length>0))));
  await page.locator('[data-fb="dismiss"]').first().tap();await page.waitForTimeout(200);
  if(OUT)await page.screenshot({path:OUT+'/first-five-branched.png'});
  // reload and export
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  assert.equal(await page.evaluate(()=>S.wires.length),2);
  await page.locator('.ds-head [data-fb="studioShop"]').tap();step('Tap Export for manufacturer');
  const dl=async sel=>{const [d]=await Promise.all([page.waitForEvent('download'),page.locator(sel).tap()]);return d;};
  const pdf=await dl('[data-fb="shopPdf"]'),csv=await dl('[data-fb="shopCsv"]');
  step('Tap Download drawing PDF, then Download wire CSV');
  const pb=fs.readFileSync(await pdf.path()),ct=fs.readFileSync(await csv.path(),'utf8');
  assert.equal(pb.slice(0,5).toString(),'%PDF-');
  assert.match(pb.toString('latin1'),/INJ1/);assert.match(pb.toString('latin1'),/42 in/);
  const lines=ct.trim().split('\n');
  assert.equal(lines[0],'Wire ID,AWG,Base color,Stripe color,From connector ID,From housing P/N,From cavity,To connector ID,To housing P/N,To cavity,Length in (user-entered),Wire source,Mate mapping');
  assert.equal(lines.length,3);
  assert.match(ct,/INJ1/);assert.match(ct,/TBD/);
  if(OUT){fs.copyFileSync(await pdf.path(),OUT+'/harness-bench-manufacturer.pdf');fs.copyFileSync(await csv.path(),OUT+'/harness-bench-manufacturer.csv');fs.writeFileSync(OUT+'/tap-sequence.txt',T.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n');}
  assert.deepEqual(errs,[]);
 }finally{await ctx.close();}
};
