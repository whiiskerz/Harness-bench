const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#tabs [data-tab="pro"]').click();
 await page.locator('#proRoot #proPart').waitFor();
 const result=await page.evaluate(()=>({version:APP_VERSION,parts:S.parts.length,wires:S.wires.length}));
 if(result.parts<1||result.wires<1)throw Error('No project data');
 const first=page.locator('[data-pro-pin]').first();await first.fill('TEST SIGNAL');
 await page.locator('#proSavePins').click();
 let stored=await page.evaluate(()=>{const p=part(proState().selectedPart);return p.pl[0]});
 if(stored!=='TEST SIGNAL')throw Error('Pin label save failed: '+stored);
 page.once('dialog',dialog=>dialog.accept('Smoke template'));
 await page.locator('#proTemplateSave').click();
 if(!(await page.evaluate(()=>proState().templates.some(t=>t.name==='Smoke template'))))throw Error('Template save failed');
 await page.locator('#proBranchName').fill('Firewall branch');
 await page.locator('#proBranchLength').fill('42');
 await page.locator('#proBranchDiameter').fill('13');
 await page.locator('#proBranchAdd').click();
 if(!(await page.evaluate(()=>proState().branches.some(b=>b.name==='Firewall branch'&&b.length===42))))throw Error('Branch add failed');
 await page.locator('#proLayer').selectOption('CAN');
 await page.locator('#proLayerHidden').check();
 if(!(await page.evaluate(()=>proState().hiddenLayers.includes('CAN'))))throw Error('Layer hide failed');
 await page.locator('#proLayerShowAll').click();
 if((await page.evaluate(()=>proState().hiddenLayers.length))!==0)throw Error('Show all failed');
 for(const [button,file] of [['proBranchCSV','wireforge-branch-schedule.csv'],['proValidationCSV','wireforge-production-validation.csv'],['proCutCSV','wireforge-production-cut-list.csv']]){
  const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#'+button).click()]);
  if(dl.suggestedFilename()!==file)throw Error('Unexpected download '+dl.suggestedFilename());
 }
 await page.locator('#proSnapshot').click();
 await page.reload();
 await page.locator('#tabs [data-tab="pro"]').click();
 if(!(await page.evaluate(()=>proState().branches.some(b=>b.name==='Firewall branch'))))throw Error('Project metadata did not persist');
 if(errors.length)throw Error('Page errors: '+errors.join(' | '));
 console.log('PASS',JSON.stringify(result));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
