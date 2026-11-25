const assert=require('node:assert/strict');

module.exports=async function testPigtails(browser,url){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 try{
  await page.goto(url.split('#')[0]+'#flying-leads',{waitUntil:'domcontentloaded'});
  const d=page.getByRole('dialog',{name:'Flying lead workbench'});
  const before=await page.evaluate(()=>[S.parts.length,S.wires.length]);
  const open=async l=>{const s=d.locator('summary').filter({hasText:l});if(!await s.evaluate(e=>e.parentElement.open))await s.click();};
  for(const [t,n] of [['mxpig48','Pig C1'],['mxpig32','Pig C2']]){
   await open('Add a Molex plug');
   await d.locator('#fbLeadType').selectOption(t);await d.locator('#fbLeadName').fill(n);
   await d.getByRole('button',{name:'Add flying leads'}).click();
  }
  await d.locator('#fbLeadScope').selectOption('all');
  assert.equal(await d.locator('tbody tr').count(),80);
  await open('Add a bulkhead');
  await d.locator('#fbLeadHousing').fill('Test bulkhead');
  await d.getByText('Add 47-position HD30',{exact:true}).click();
  // search by cavity and by function
  await d.locator('#fbLeadQuery').fill('J4');
  assert.match(await d.locator('tbody tr').first().textContent(),/J4.*Pig C1.*AIN 4/);
  assert.equal(await d.locator('tbody tr').count(),1);
  await d.locator('#fbLeadQuery').fill('AIN 4');
  assert.ok(await d.locator('tbody tr').count()>=1);
  await d.locator('#fbLeadQuery').fill('J4');
  await d.locator('tbody [data-lead-pin]').first().click();
  assert.match(await d.locator('.fb-lead-spec').textContent(),/AIN 4 \(0–5 V\)[\s\S]*size TBD[\s\S]*Contact: TBD/);
  await d.locator('#fbLeadCavity').selectOption({value:'5'});
  await d.getByRole('button',{name:'Land wire'}).click();
  // leave another lead loose: H3 trigger shows spec color, no wire
  await d.locator('#fbLeadQuery').fill('H3');
  const h3=await d.locator('tbody tr').first().textContent();
  assert.match(h3,/Pig C1/);assert.match(h3,/BLK/);assert.match(h3,/Flying lead|Test|—/);
  await d.locator('#fbLeadQuery').fill('EGT 3+');
  await d.locator('tbody [data-lead-pin]').first().click();
  assert.match(await d.locator('.fb-lead-spec').textContent(),/Cold-junction/);
  const state=await page.evaluate(()=>({wires:S.wires.length,j4:S.wires.filter(w=>/AIN 4/.test(w.sig||'')).length,pigs:S.parts.filter(p=>/^mxpig/.test(p.t)).map(p=>p.t)}));
  assert.equal(state.wires,before[1]+1);assert.equal(state.j4,1);assert.deepEqual(state.pigs.sort(),['mxpig32','mxpig48']);
  // overflow at phone width
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page scroll');
  // reload: both plugs and the landed wire survive; H3 still loose
  await d.getByRole('button',{name:'Close'}).click();
  await page.reload({waitUntil:'domcontentloaded'});
  const after=await page.evaluate(()=>({wires:S.wires.length,pigs:S.parts.filter(p=>/^mxpig/.test(p.t)).length,land:S.wires.some(w=>/AIN 4/.test(w.sig||'')),h3:S.wires.some(w=>/TRIGGER/.test(w.sig||''))}));
  assert.deepEqual(after,{wires:before[1]+1,pigs:2,land:true,h3:false});
  assert.deepEqual(errs,[]);
 }finally{await page.close();}
};
