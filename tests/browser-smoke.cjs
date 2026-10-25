const { chromium } = require('playwright');
(async () => {
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#tabs button');
 const result=await page.evaluate(()=>{
   const s=runProjectSelfTests();
   return {version:APP_VERSION,tests:s.results,parts:S.parts.length,wires:S.wires.length};
 });
 if(!result.version.startsWith('0.17'))throw Error('Unexpected base version '+result.version);
 if(!result.parts||!result.wires)throw Error('Project seed empty');
 const draw=page.locator('#tabs button[data-tab="draw"]');
 await draw.click();
 await page.locator('#wfPhasePanel').waitFor();
 await page.locator('#wfBranchName').fill('Test branch');
 await page.locator('#wfBranchLength').fill('24');
 await page.locator('#wfAddBranch').click();
 const exists=await page.evaluate(()=>S.wfBranches&&S.wfBranches.some(b=>b.name==='Test branch'&&b.length===24));
 if(!exists)throw Error('Branch was not saved');
 await page.reload();
 await page.locator('#tabs button[data-tab="draw"]').click();
 const persisted=await page.evaluate(()=>S.wfBranches&&S.wfBranches.some(b=>b.name==='Test branch'));
 if(!persisted)throw Error('Branch did not persist across reload');
 await page.locator('#wfRouteAudit').click();
 await page.locator('#wfPhaseResults').waitFor();
 for(const [button,filename] of [['wfCutList','wireforge-cut-list-review.csv'],['wfEcuSchedule','wireforge-maxxecu-pin-schedule.csv'],['wfValidation','wireforge-validation-review.csv']]){
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#'+button).click()]);
   if(download.suggestedFilename()!==filename)throw Error('Wrong filename '+download.suggestedFilename());
 }
 if(errors.length)throw Error('Browser JavaScript errors: '+errors.join(' | '));
 console.log(JSON.stringify({result,passed:true},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
