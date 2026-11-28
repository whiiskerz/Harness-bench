const assert=require('node:assert/strict');
module.exports=async function testTapWire(browser,url){
 let n=0;
 for(const touch of [true,false]){
  const ctx=await browser.newContext({viewport:{width:1024,height:768},hasTouch:touch,deviceScaleFactor:1});
  const page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
  const base=url.split('#')[0];
  const tap=l=>touch?l.tap():l.click();
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>showTab('vault')).catch(()=>{});await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
   await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
   // two custom connectors with functions
   const mk=async(name,text,x)=>{await tap(page.locator('.ds-first [data-fb="firstCustom"]').first());await page.locator('#usrName').fill(name);await page.locator('#usrLabels').fill(text);await page.locator('#usrSave').uncheck();await tap(page.locator('[data-fb="firstMake"]'));const b=await page.locator('#wfFormSvg').boundingBox();await (touch?page.touchscreen.tap(b.x+x,b.y+130):page.mouse.click(b.x+x,b.y+130));};
   await mk('SRC','1=Ground\n2=CAN H\n3=Pump output\n4=Sensor',200);
   await page.locator('button[aria-label="Parts"]').click();
   await page.locator('#dsPartQ').fill('SRC');await tap(page.locator('#dsPartRes .ds-part').first());
   let b=await page.locator('#wfFormSvg').boundingBox();await (touch?page.touchscreen.tap(b.x+600,b.y+130):page.mouse.click(b.x+600,b.y+130));
   assert.equal(await page.evaluate(()=>S.parts.length),2);n++;
   const nodeId=async i=>page.evaluate(i=>{const p=S.parts[i];return S.wfFormboard.nodes.find(x=>x.partId===p.id).id},i);
   await tap(page.locator('[data-fb="tapWire"]'));
   await tap(page.locator('[data-node="'+await nodeId(0)+'"]').first());
   await tap(page.locator('.ds-tw [data-fb="twCav"][data-side="a"][data-i="0"]'));
   assert.equal(await page.locator('.ds-tw-cavs [aria-pressed="true"]').count(),1);n++;
   await tap(page.locator('[data-node="'+await nodeId(1)+'"]').first());
   assert.ok(await page.locator('[data-tw-preview]').count());n++;
   assert.ok(await page.locator('.ds-tw [data-side="b"].ok').count()>=4);n++;
   await tap(page.locator('.ds-tw [data-fb="twCav"][data-side="b"][data-i="0"]'));
   let w=await page.evaluate(()=>S.wires.map(x=>({sig:x.sig,awg:x.awg,color:x.color,sug:x.wfSuggested,a:x.a.i,b:x.b.i})));
   assert.equal(w.length,1);assert.equal(w[0].color,'BLK');assert.equal(w[0].awg,18);assert.ok(w[0].sug);n++;
   // continuous: second and third wire with no menu reopening
   await tap(page.locator('.ds-tw [data-fb="twCav"][data-side="a"][data-i="1"]'));await tap(page.locator('.ds-tw [data-fb="twCav"][data-side="b"][data-i="1"]'));
   await tap(page.locator('.ds-tw [data-fb="twCav"][data-side="a"][data-i="3"]'));await tap(page.locator('.ds-tw [data-fb="twCav"][data-side="b"][data-i="3"]'));
   w=await page.evaluate(()=>S.wires.map(x=>x.color+'/'+x.awg));
   assert.deepEqual(w,['BLK/18','YEL/22','/22']);n++;
   // duplicate prevention: used cavity is disabled
   assert.equal(await page.locator('.ds-tw [data-side="b"][data-i="0"]').isDisabled(),true);n++;
   assert.equal(await page.evaluate(()=>S.wfFormboard.segments.length),1);n++;
   assert.deepEqual(errs,[]);
  }finally{await ctx.close();}
 }
 console.log('PASS tap wire (touch + mouse): '+n+' assertions');
};
if(require.main===module){(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();try{await module.exports(b,process.argv[2]||'http://localhost:8765/index.html');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});}
