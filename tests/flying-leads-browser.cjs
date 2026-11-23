const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function testFlyingLeads(browser,url){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 try{
  await page.goto(url.split('#')[0]+'#flying-leads',{waitUntil:'domcontentloaded'});
  const d=page.getByRole('dialog',{name:'Flying lead workbench'});
  const prior=await page.evaluate(()=>JSON.stringify(S.wires));
  async function openSection(label){
   const summary=d.locator('summary').filter({hasText:label});
   if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();
  }
  async function addPlug(type,name,count){
   await openSection('Add a Molex plug');
   await d.locator('#fbLeadType').selectOption(type);
   await d.locator('#fbLeadName').fill(name);
   await d.getByRole('button',{name:'Add flying leads'}).click();
   assert.equal(await d.locator('tbody tr').count(),count);
  }
  await addPlug('cust32','Test 32',32);
  await addPlug('mxrace48','Test 48',48);
  assert.equal(await page.evaluate(()=>JSON.stringify(S.wires)),prior);
  await openSection('Add a bulkhead');
  await d.locator('#fbLeadHousing').fill('Test firewall');
  await d.getByText('Add 47-position HD30',{exact:true}).click();
  const set=await page.evaluate(()=>S.parts.find(p=>p.name==='Test 32').id);
  await d.locator('#fbLeadScope').selectOption(String(set));
  await d.locator('#fbLeadSignal').fill('Test sensor');
  await d.locator('#fbLeadGauge').fill('22');
  await d.locator('#fbLeadColor').fill('GRN/WHT');
  await d.locator('#fbLeadCavity').selectOption({value:'11'});
  await d.getByRole('button',{name:'Land wire'}).click();
  assert.match(await d.locator('tbody tr').first().textContent(),/Test firewall.*12/);
  await d.locator('[data-lead-pin="1"]').click();
  assert.equal(await d.locator('#fbLeadCavity option[value="11"]').evaluate(option=>option.disabled),true);
  await d.locator('#fbLeadCavity').selectOption({value:'12'});
  await d.getByRole('button',{name:'Land wire'}).click();
  await d.locator('#fbLeadCover').selectOption('DR-25');
  await d.locator('[data-lead-run]').click();
  assert.equal(await page.evaluate(()=>WFFormboard.report().bundles.find(b=>b.s.sleeve==='DR-25').members.length),2);
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments.find(s=>s.sleeve==='DR-25').length),null);
  await page.reload({waitUntil:'domcontentloaded'});
  await d.locator('#fbLeadScope').selectOption(String(set));
  await d.locator('#fbLeadFilter').selectOption('Connected');
  assert.equal(await d.locator('tbody tr').count(),2);
  const [file]=await Promise.all([page.waitForEvent('download'),d.locator('[data-lead-csv]').click()]);
  assert.match(fs.readFileSync(await file.path(),'utf8'),/GRN\/WHT/);
  await d.locator('#fbLeadScope').selectOption('all');
  await d.locator('#fbLeadFilter').selectOption('all');
  assert.ok(await d.locator('tbody tr').count()>=80);
  await d.locator('[data-lead-drawing] summary').click();
  await d.locator('.fb-lead-line').first().waitFor();
  assert.equal(await d.locator('.fb-lead-line').count(),await d.locator('tbody tr').count());
  const large=await page.evaluate(()=>S.parts.find(p=>p.name==='Test 48').id);
  await d.locator('#fbLeadScope').selectOption(String(large));
  const housing=await page.evaluate(()=>S.parts.find(p=>p.name==='Test firewall').id);
  await d.locator('#fbLeadBulk').selectOption(String(housing));
  await d.locator('#fbLeadCavity').selectOption({value:'0'});
  await openSection('Land a range');
  await d.locator('#fbLeadCount').fill('48');
  await d.locator('[data-lead-preview]').click();
  assert.match(await d.locator('[data-lead-proposal]').textContent(),/exceeds/);
  await openSection('Add a bulkhead');
  await d.locator('[data-lead-custom]').click();
  await d.locator('#fbLeadCavity').selectOption({value:'0'});
  await openSection('Land a range');
  await d.locator('#fbLeadCount').fill('48');
  await d.locator('[data-lead-preview]').click();
  assert.equal(await d.locator('[data-lead-proposal] li').count(),48);
  await d.locator('[data-lead-accept]').click();
  await d.locator('#fbLeadFilter').selectOption('Connected');
  assert.equal(await d.locator('tbody tr').count(),48);
  assert.deepEqual(errs,[]);
 }finally{await page.close();}
};
