const assert=require('node:assert/strict');
const OUT=process.env.WF_SHOT_DIR||'';
module.exports=async function testPigtail48(browser,url){
 const ctx=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,deviceScaleFactor:2});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 const base=url.split('#')[0];
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>showTab('vault')).catch(()=>{});
  await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
  await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const svgTap=async(x,y)=>{const b=await page.locator('#wfFormSvg').boundingBox();await page.touchscreen.tap(b.x+x,b.y+y);};
  await page.locator('#dsFirstQ').fill('RACE pigtail');
  await page.locator('.ds-firstres [data-type="mxpig48"]').tap();await svgTap(150,380);
  await page.locator('button[aria-label="Parts"]').tap();await page.locator('.ds-part[data-type="hd30_47"]').tap();await svgTap(560,380);
  await page.locator('.ds-wirepanel [data-fb="dismiss"]').first().tap();
  const ecu=await page.evaluate(()=>{const p=S.parts.find(p=>p.t==='mxpig48');return S.wfFormboard.nodes.find(x=>x.partId===p.id).id});
  await page.locator('[data-node="'+ecu+'"]').first().tap();
  assert.equal(await page.locator('[data-lead-tip]').count(),48);
  if(OUT)await page.screenshot({path:OUT+'/pigtail-48-leads.png'});
  const bh=await page.evaluate(()=>{const p=S.parts.find(p=>p.t==='hd30_47');return S.wfFormboard.nodes.find(x=>x.partId===p.id).id});
  for(const [lead,cav] of [[3,5],[0,6],[47,7]]){
   await page.locator('[data-node="'+ecu+'"]').first().tap();
   await page.locator('[data-lead-tip="'+lead+'"]').tap();await page.waitForTimeout(300);
   await page.getByRole('button',{name:'Run wire'}).tap();
   await page.locator('[data-node="'+bh+'"]').first().tap();await page.waitForTimeout(300);
   await page.locator('.ds-cav').nth(cav).tap();await page.waitForTimeout(300);
   await page.locator('[data-fb="wireDone"]').tap().catch(()=>{});
  }
  const used=await page.evaluate(()=>S.wires.map(w=>w.a.i).sort((a,b)=>a-b));
  assert.deepEqual(used,[0,3,47]);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  assert.equal(await page.evaluate(()=>S.wires.length),3);
  assert.deepEqual(errs,[]);
 }finally{await ctx.close();}
};
