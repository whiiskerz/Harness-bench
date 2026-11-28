const assert=require('node:assert/strict');
module.exports=async function testSectionsMaterials(browser,url){
 const ctx=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,deviceScaleFactor:1});
 const page=await ctx.newPage(),errs=[];let n=0;
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 const base=url.split('#')[0];
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});await page.goto(base,{waitUntil:'domcontentloaded'});
  // branding + storage compatibility
  assert.match(await page.title(),/Loomwright/);assert.match(await page.locator('header h1').textContent(),/Loomwright/);n+=2;
  await page.evaluate(()=>showTab('vault')).catch(()=>{});await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
  await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  assert.match(await page.locator('.ds-head strong').textContent(),/Loomwright/);n++;
  // materials library populated
  for(const [cat,names] of [['cable',['TXL wire','GXL wire','SXL wire','M22759 wire','Shielded cable','Twisted-pair cable','Battery cable']],['protect',['DR-25','Braided PET','Split loom','Heat shrink tubing','Molded boot','Grommet','Cable ties','Harness labels']]]){
   await page.locator('.ds-cats [data-cat="'+cat+'"]').tap();const t=await page.locator('#dsFirstRes').textContent();for(const x of names)assert.ok(t.includes(x),x);n++;
  }
  // custom material saved to personal library
  await page.locator('[data-fb="matForm"]').first().tap();await page.locator('#umName').fill('Tefzel 22 AWG');await page.locator('#umDesc').fill('my supplier');await page.locator('[data-fb="matMake"]').tap();
  assert.ok((await page.locator('#dsFirstRes').textContent()).includes('Tefzel 22 AWG'));n++;
  assert.equal(await page.evaluate(()=>WF_LIB.loadMats().length),1);n++;
  // template, then sections
  await page.locator('.ds-cats [data-cat=""]').tap();
  await page.locator('[data-fb="tpl"][data-id="sensor-leg"]').tap();
  assert.equal(await page.evaluate(()=>S.parts.length),5);
  await page.locator('.ds-head [data-fb="sections"]').tap();await page.locator('#dsSecNew').fill('Sensors');await page.locator('[data-fb="secNew"]').tap();
  const nid=async i=>page.evaluate(i=>S.wfFormboard.nodes.find(x=>x.partId===S.parts[i].id).id,i);
  for(const i of [1,2]){await page.locator('[data-node="'+await nid(i)+'"]').first().tap();}
  assert.equal(await page.evaluate(()=>S.wfSections[0].nodes.length),2);n++;
  await page.locator('[data-fb="secAssign"]').tap();
  await page.locator('.ds-secbtns [data-fb="secHide"]').tap();
  const hidden=await page.locator('[data-node]').evaluateAll(els=>els.filter(e=>e.style.display==='none').length);
  assert.ok(hidden>=3);n++;
  await page.locator('[data-fb="secAll"]').tap();
  assert.equal(await page.locator('[data-node]').evaluateAll(els=>els.filter(e=>e.style.display==='none').length),0);n++;
  await page.locator('[data-fb="secZoom"]').tap();n++;
  // rename persists
  await page.locator('[data-sec-name]').fill('Engine sensors');assert.equal(await page.evaluate(()=>S.wfSections[0].name),'Engine sensors');n++;
  // assign materials: cover a run, boot a connector
  await page.locator('.ds-head [data-fb="sections"]').tap();
  await page.locator('button[aria-label="Parts"]').tap();await page.locator('.ds-palette .ds-cats [data-cat="protect"]').tap();
  await page.locator('#dsPartRes [data-fb="addExtra"][data-mat="Cable ties"]').tap();
  assert.deepEqual(await page.evaluate(()=>S.wfExtras),[{name:'Cable ties',qty:1}]);n++;
  const seg=await page.evaluate(()=>S.wfFormboard.segments[0].id);
  await page.locator('[data-seg="'+seg+'"]').first().tap();
  await page.locator('#dsPartRes [data-fb="useCover"][data-mat="Split loom"]').tap();
  assert.equal(await page.evaluate(id=>S.wfFormboard.segments.find(s=>s.id===id).sleeve,seg),'Split loom');n++;
  await page.locator('[data-node="'+await nid(1)+'"]').first().tap();
  await page.locator('#dsPartRes [data-fb="useBoot"][data-mat="Molded boot"]').tap();
  assert.equal(await page.evaluate(()=>S.wfFormboard.nodes.filter(x=>x.boot==='Molded boot').length),1);n++;
  await page.locator('[data-fb="studioBom"]').first().tap();
  const bom=await page.locator('.ds-report').textContent();
  for(const x of ['Cable ties','Split loom','Molded boot'])assert.ok(bom.includes(x),x);n++;
  assert.deepEqual(errs,[]);
  console.log('PASS sections + materials + branding: '+n+' assertions');
 }finally{await ctx.close();}
};
if(require.main===module){(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();try{await module.exports(b,process.argv[2]||'http://localhost:8765/index.html');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});}
