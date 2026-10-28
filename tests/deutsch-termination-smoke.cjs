const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.WFDT);
  await page.locator('#tabs [data-tab="dt"]').click();
  assert.equal(await page.locator('#t-dt').isVisible(),true);
  assert.ok(await page.locator('.dt-part').count()>=3,'E90 has multiple Deutsch assemblies');
  await page.locator('[data-dta="select"][data-id="163"]').click();
  assert.ok((await page.locator('.dt-inspector-head').textContent()).includes('Cabin DT2'));
  assert.equal(await page.locator('[data-dt-field="aTerminationState"]').count(),2,'Side A now has a separate crimp status for every wired cavity');
  const before=await page.evaluate(()=>WFDT.pairSummary(WFDT.selectedPair()));
  assert.equal(before.pairedTerminations,0,'Nothing may be auto-certified from drawn wires');
  await page.locator('[data-dt-index="0"][data-dt-field="aTerminationState"]').selectOption('owner-confirmed');
  assert.equal((await page.evaluate(()=>WFDT.selectedPair().cavities[0].a.terminationState)),'planned','Confirmation must not be permitted without measured/part evidence');
  for(const [field,value] of [['aHousing','DT04-2P'],['bHousing','DT06-2S']]){
   const inp=page.locator('[data-dt-key="'+field+'"]');await inp.fill(value);await inp.press('Tab');
  }
  const fill=async(key,value)=>{
   const inp=page.locator('[data-dt-index="0"][data-dt-field="'+key+'"]');
   await inp.fill(value);await inp.press('Tab');
  };
  await fill('aContactPart','PIN-OWNER-REFERENCE');
  await fill('aDestination','ECU GPO2 wire');
  await fill('aEvidence','Photo A-1 plus tug/crimp inspection');
  await page.locator('[data-dt-index="0"][data-dt-field="aTerminationState"]').selectOption('owner-confirmed');
  assert.equal(await page.evaluate(()=>WFDT.selectedPair().cavities[0].a.terminationState),'owner-confirmed');
  let mid=await page.evaluate(()=>WFDT.pairSummary(WFDT.selectedPair()));
  assert.equal(mid.pairedTerminations,0,'Confirming Side A alone does not count as a complete pair');
  await fill('contactPart','SOCKET-OWNER-REFERENCE');
  await fill('destination','Leash relay coil trigger');
  await fill('evidence','Photo B-1 and continuity inspection');
  await page.locator('[data-dt-index="0"][data-dt-field="state"]').selectOption('owner-confirmed');
  mid=await page.evaluate(()=>WFDT.pairSummary(WFDT.selectedPair()));
  assert.equal(mid.pairedTerminations,1,'One cavity may be counted only after both halves are confirmed');
  assert.equal(mid.completeRecord,false,'Other cavities remain incomplete');
  const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('[data-dta="export"]').first().click()]);
  assert.match(csv.suggestedFilename(),/termination-matrix\.csv$/);
  const text=fs.readFileSync(await csv.path(),'utf8');
  assert.match(text,/Side A physical state/);assert.match(text,/Side A evidence/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.WFDT);
  await page.locator('#tabs [data-tab="dt"]').click();
  const persisted=await page.evaluate(()=>WFDT.candidates().find(x=>x.partId===163).cavities[0]);
  assert.equal(persisted.a.terminationState,'owner-confirmed','Physical confirmation survives reload');
  assert.equal(persisted.b.state,'owner-confirmed');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'wireforge-v026-assembly-mobile.png',fullPage:true});
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS: independent A/B crimp proof, persisted records, CSV export, mobile UI');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
