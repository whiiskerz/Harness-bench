const assert=require('node:assert/strict');
module.exports=async function testDashboardLibrary(browser,url){
 const ctx=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,deviceScaleFactor:2});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 const base=url.split('#')[0];let n=0;
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>showTab('vault')).catch(()=>{});
  await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
  await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const svgTap=async(x,y)=>{const b=await page.locator('#wfFormSvg').boundingBox();await page.touchscreen.tap(b.x+x,b.y+y);};
  // dashboard
  const txt=await page.locator('.ds-first').textContent();
  for(const w of ['Blank project','Open project','Import project','Import CSV','Templates','Demonstration harnesses'])assert.match(txt,new RegExp(w));n++;
  assert.equal(await page.locator('.ds-cats .ds-chip').count(),12);n++;
  // category filter
  await page.locator('.ds-cats [data-cat="relay"]').tap();
  const relayTypes=await page.locator('.ds-firstres [data-type]').evaluateAll(els=>els.map(e=>e.dataset.type));
  assert.ok(relayTypes.includes('relay')&&relayTypes.includes('ssr')&&!relayTypes.includes('inj2'));n++;
  await page.locator('.ds-cats [data-cat="actuator"]').tap();await page.locator('#dsFirstQ').fill('injector');
  assert.ok(await page.locator('.ds-firstres [data-type="inj2"]').count());n++;
  await page.locator('.ds-cats [data-cat=""]').tap();await page.locator('#dsFirstQ').fill('');
  // custom component with functions, saved to personal library
  await page.locator('[data-fb="firstCustom"]').first().tap();
  await page.locator('#usrName').fill('Fuel pump plug');await page.locator('#usrCat').selectOption('actuator');
  await page.locator('#usrLabels').fill('A=Pump power\nB=Pump ground\nC');
  await page.locator('[data-fb="firstMake"]').tap();
  await svgTap(300,300);
  const placed=await page.evaluate(()=>{const p=S.parts[0];return{t:p.t,pins:T[p.t].pins.map(x=>x.p+':'+x.l),saved:!!S.wfCustom[p.t]}});
  assert.deepEqual(placed.pins,['A:Pump power','B:Pump ground','C:']);assert.ok(placed.saved);n++;
  assert.equal(await page.evaluate(()=>WF_LIB.loadPersonal().length),1);n++;
  // Home on a non-empty project, then back
  await page.locator('.ds-head [data-fb="home"]').tap();assert.match(await page.locator('.ds-first').textContent(),/Home/);
  await page.locator('.ds-first [data-fb="home"]').tap();assert.equal(await page.locator('.ds-first').count(),0);n++;
  // personal part survives reload and is searchable in a template-built project
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  assert.equal(await page.evaluate(()=>S.parts.length),1);
  await page.locator('.ds-head [data-fb="home"]').tap();
  await page.locator('[data-fb="tpl"][data-id="power-relay"]').tap();
  const tp=await page.evaluate(()=>({parts:S.parts.length,segs:S.wfFormboard.segments.length,wires:S.wires.length}));
  assert.deepEqual(tp,{parts:5,segs:4,wires:0});n++;
  await page.locator('button[aria-label="Parts"]').tap();await page.locator('#dsPartQ').fill('fuel pump');
  assert.ok(await page.locator('#dsPartRes .ds-part:has-text("Fuel pump plug")').count());n++;
  await page.locator("#dsPartRes .ds-part:has-text(\"Fuel pump plug\")").first().tap();await svgTap(400,500);
  assert.ok(await page.evaluate(()=>S.parts.some(p=>/^usr/.test(p.t))&&Object.keys(S.wfCustom).length===1));n++;
  // demos still load from the dashboard
  await page.locator('.ds-head [data-fb="home"]').tap();await page.locator('.ds-first [data-fb="loadHD30Demo"]').tap();
  assert.equal(await page.evaluate(()=>S.wires.length),48);n++;
  assert.deepEqual(errs,[]);
  console.log('PASS dashboard + library: '+n+' assertions');
 }finally{await ctx.close();}
};
if(require.main===module){(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();try{await module.exports(b,process.argv[2]||'http://localhost:8765/index.html');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});}
