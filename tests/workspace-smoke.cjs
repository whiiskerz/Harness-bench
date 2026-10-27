const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1366,height:850},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.WFPro);
  assert.equal(await page.locator('#wfQuickSave').count(),1);
  const original=await page.evaluate(()=>({parts:S.parts.length,wires:S.wires.length,version:APP_VERSION}));
  assert.ok(original.parts>15&&original.wires>15);
  assert.match(original.version,/0\.23/);
  await page.locator('#wfQuickSave').click();
  const first=await page.evaluate(()=>{
   const a=WFPro.snapshotList(),p=WFPro.readSnapshot(a[0].id);
   return{id:a[0].id,name:a[0].name,parts:p.project.parts.length,wires:p.project.wires.length};
  });
  assert.equal(first.parts,original.parts);assert.equal(first.wires,original.wires);
  await page.locator('#wfVaultOpen').click();
  assert.equal(await page.locator('.wf-pro-project').count(),1);
  page.once('dialog',dialog=>dialog.accept('Harness Rev B'));
  await page.locator('[data-wfv="as"]').click();
  assert.equal(await page.locator('.wf-pro-project').count(),2);
  const active=await page.evaluate(()=>S.wfVaultId);
  await page.evaluate(()=>{S.wires[0].sig='Smoke modified circuit';save()});
  await page.locator('[data-wfv="quick"]').first().click();
  const saved=await page.evaluate(()=>({
   saves:WFPro.snapshotList(),
   old:WFPro.readSnapshot(WFPro.snapshotList().find(x=>x.id!==S.wfVaultId).id).project.wires[0].sig,
   active:WFPro.readSnapshot(S.wfVaultId).project.wires[0].sig
  }));
  assert.notEqual(saved.old,saved.active);assert.equal(saved.active,'Smoke modified circuit');
  const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('[data-wfv="export"][data-id="'+active+'"]').click()]);
  const exported=fs.readFileSync(await dl.path(),'utf8'),pack=JSON.parse(exported);
  assert.match(dl.suggestedFilename(),/\.json$/);
  assert.equal(pack.schema,'wireforge.saved-project.v1');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.WFPro);
  await page.locator('#wfVaultOpen').click();
  assert.equal(await page.locator('.wf-pro-project').count(),2);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-wfv="load"][data-id="'+first.id+'"]').click();
  const restored=await page.evaluate(()=>({id:S.wfVaultId,wire:S.wires[0].sig}));
  assert.equal(restored.id,first.id);assert.notEqual(restored.wire,'Smoke modified circuit');
  await page.evaluate(()=>{const legacy={name:'Legacy shop job',data:JSON.stringify(S),parts:S.parts.length,wires:S.wires.length};designPut([legacy])});
  await page.locator('#wfVaultOpen').click();
  assert.equal(await page.locator('[data-wfv="migrate"]').count(),1);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-wfv="migrate"]').click();
  assert.equal(await page.locator('.wf-pro-project').count(),3,'Legacy design migration should add a third independent save');
  assert.equal(await page.evaluate(()=>designList().length),1,'Original legacy backup must remain untouched');

  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#wfOpenImport').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(exported)});
  await page.waitForFunction(()=>S.wires[0].sig==='Smoke modified circuit');
  assert.equal(await page.evaluate(()=>S.wfVaultId),null);
  await page.locator('#tabs [data-tab="lab"]').click();
  await page.locator('#wfLabFrom').waitFor();
  assert.equal(await page.locator('.wf-pro-kpi').count(),4);
  const [from,to]=await page.evaluate(()=>{const w=S.wires.find(x=>x.a&&x.b&&part(x.a.p)&&part(x.b.p));return[w.a.p+':'+w.a.i,w.b.p+':'+w.b.i]});
  await page.locator('#wfLabFrom').selectOption(from);
  await page.locator('#wfLabTo').selectOption(to);
  await page.locator('[data-wfl="trace"]').click();
  assert.equal(await page.locator('#wfLabTrace').getAttribute('data-connected'),'true');
  await page.evaluate(()=>{S.wires[0].amps=30;S.wires[0].fa=5;save()});
  await page.locator('[data-wfl="run"]').click();
  assert.ok((await page.locator('#wfLabRows').textContent()).includes('entered current above its entered fuse rating'));
  await page.locator('#wfLabFilter').selectOption('error');
  const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('[data-wfl="export"]').click()]);
  assert.match(csv.suggestedFilename(),/validation\.csv$/);
  const [json]=await Promise.all([page.waitForEvent('download'),page.locator('[data-wfl="report"]').click()]);
  const report=JSON.parse(fs.readFileSync(await json.path(),'utf8'));
  assert.ok(report.findings.some(x=>x.category==='Power'));
  assert.match(report.notice,/not automatically verified/i);
  await page.locator('.wf-pro-finding button:not([disabled])').first().click();
  assert.equal(await page.locator('#t-draw').isVisible(),true);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#wfVaultOpen').click();
  const layout=await page.evaluate(()=>({vw:document.documentElement.clientWidth,body:document.body.scrollWidth}));
  assert.ok(layout.body<=layout.vw+100,'Vault overflows mobile viewport: '+JSON.stringify(layout));
  await page.screenshot({path:'wireforge-v023-project-vault-mobile.png',fullPage:true});
  assert.deepEqual(errors,[],'No uncaught JavaScript errors');
  console.log('PASS',JSON.stringify({original,namedProjects:saved.saves.length,restored:true,imported:true,continuity:true,validation:true,mobile:layout}));
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
