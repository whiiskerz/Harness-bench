const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1500,height:940},acceptDownloads:true});
 const faults=[];page.on('pageerror',e=>faults.push(e.stack||e.message));
 try{
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.WFBlueprint);
  const initial=await page.evaluate(()=>({
   parts:S.parts.length,wires:S.wires.length,zones:S.zones.length,report:WFBlueprint.report()
  }));
  assert.equal(initial.parts,59);assert.equal(initial.wires,94);
  assert.equal(initial.zones,6,'Six physically ordered planning areas');
  assert.equal(initial.report.lines.length,16);
  const traced=['gpo2','gpo3','gpo7','ain2'];
  for(const id of traced)assert.ok(initial.report.lines.find(x=>x.id===id).drawn,id+' must be connected in the diagram');
  assert.ok(initial.report.lines.every(x=>x.source),'Every blueprint entry has a provenance note');
  const stats=await page.evaluate(()=>{
   const bad=[],partSet=new Set();
   for(const z of S.zones){
    const within=S.parts.filter(p=>p.x>=z.x&&p.x<z.x+z.w&&p.y>=z.y&&p.y<z.y+z.h);
    for(const p of within)partSet.add(p.id);
    for(let i=0;i<within.length;i++)for(let j=i+1;j<within.length;j++){
      const a=within[i],b=within[j],d=dims(a),e=dims(b);
      const dx=Math.max(a.x-b.x-e.w,b.x-a.x-d.w,0);
      const dy=Math.max(a.y-b.y-e.h,b.y-a.y-d.h,0);
      if(dx===0&&dy===0)bad.push([a.id,b.id]);
    }
   }
   return {placed:partSet.size,overlaps:bad,zoneWidths:S.zones.map(z=>z.w),width:S.zones.at(-1).x+S.zones.at(-1).w};
  });
  assert.equal(stats.placed,59,'Every active example part is placed within a zone');
  assert.deepEqual(stats.overlaps,[],'No component rectangle overlap');
  assert.ok(stats.zoneWidths.every(x=>x>=540));
  await page.locator('#tabs [data-tab="blueprint"]').click();
  assert.equal(await page.locator('.wb-zone').count(),6);
  assert.equal(await page.locator('.wb-connection').count(),16);
  assert.equal(await page.locator('[data-wb-answer]').count(),8);
  const a=page.locator('[data-wb-answer="dt-mating"]');
  await a.fill('DT6 body P/N pending physical image review');
  await a.blur();
  assert.equal(await page.evaluate(()=>S.wfExampleAnswers['dt-mating']),'DT6 body P/N pending physical image review');
  await page.locator('[data-wb="group"][data-group="Fuel"]').click();
  assert.ok((await page.locator('.wb-connection').count())<16);
  await page.locator('[data-wb="group"][data-group="All"]').click();
  await page.locator('#wbSearch').fill('AIN2');
  assert.equal(await page.locator('.wb-connection').count(),1);
  await page.locator('#wbSearch').fill('');
  await page.screenshot({path:'wireforge-e90-blueprint-desktop.png',fullPage:true});
  const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('[data-wb="download"]').first().click()]);
  const json=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
  assert.equal(json.routes.length,16);
  assert.ok(json.questions.some(q=>q.id==='dt-mating'&&q.answer.includes('DT6 body P/N')));
  assert.match(json.disclaimer,/does not prove physical wiring/i);
  await page.locator('.wb-zone').nth(0).click();
  assert.ok(await page.locator('#t-draw').isVisible(),'Zone focus should navigate editor');
  const focused=await page.evaluate(()=>({k:S.view.k,zone:S.zones[0],view:S.view}));
  assert.ok(focused.k>0.14&&focused.k<=1.05);
  await page.locator('#tabs [data-tab="blueprint"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-wb="arrange"]').first().click();
  assert.equal(await page.evaluate(()=>S.wfE90Layout),'spacious-v2');
  const res=await page.evaluate(()=>S.zones.length);assert.equal(res,6);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.WFBlueprint);
  assert.equal(await page.evaluate(()=>S.wfExampleAnswers['dt-mating']),'DT6 body P/N pending physical image review','Answers persist');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#tabs [data-tab="blueprint"]').click();
  assert.equal(await page.locator('.wb-zone').count(),6);
  await page.screenshot({path:'wireforge-e90-blueprint-mobile.png',fullPage:true});
  if(faults.length)throw Error('Page errors: '+faults.join(' | '));
  console.log('PASS',JSON.stringify({parts:initial.parts,wires:initial.wires,zones:stats.zoneWidths,mapped:initial.report.drawn,export:true,savedAnswers:true}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
