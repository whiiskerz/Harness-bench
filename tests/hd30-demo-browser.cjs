const assert=require('node:assert/strict');
module.exports=async function(browser,url){
 const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:2,acceptDownloads:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const action=async id=>{const b=page.locator('[data-fb="'+id+'"]').first();if(!await b.isVisible())await page.locator('.ds-demomenu summary').tap();await b.tap();};
 const count=()=>page.evaluate(()=>S.wires.length);
 try{
 await page.goto(url.split('#')[0]+'#studio');await page.waitForSelector('.ds-shell');await action('loadHD30Demo');
 assert.deepEqual(await page.evaluate(()=>[S.parts.length,S.wires.length,T[S.parts[0].t].pins.length,S.wires.filter(w=>w.loom).length,S.parts[1].mate,S.parts[2].mate]),[4,48,48,47,3,2]);
 await action('lookWires');assert.equal(await page.locator('[data-wire-hit]').count(),48);
 await page.locator('[data-wire-hit="10"] path').first().tap({force:true});await page.waitForSelector('#weId');
 assert.equal(await page.inputValue('#weId'),'W01');assert.equal(await page.inputValue('#weColor'),'GRN');assert.equal(await page.inputValue('#weLen'),'17.72');
 await action('wireTrace');assert.equal(await page.locator('[data-mate-trace="active"]').count(),1);
 await page.fill('#weSig','Fan edited');await action('wireSave');assert.equal(await page.evaluate(()=>S.wires[0].sig),'Fan edited');
 await action('wireDelete');assert.equal(await count(),47);await action('designUndo');assert.equal(await count(),48);
 await action('multiMode');await page.locator('[data-fb="multiWire"]').nth(0).tap();await page.locator('[data-fb="multiWire"]').nth(1).tap();await action('deleteSelected');assert.equal(await count(),46);await action('designUndo');assert.equal(await count(),48);
 await action('lookLoom');assert.equal(await page.locator('[data-wire-hit]').count(),0);
 await page.reload();await page.waitForSelector('.ds-shell');assert.equal(await count(),48);
 await action('studioShop');for(const id of ['shopPdf','shopCsv','bom']){const [dl]=await Promise.all([page.waitForEvent('download'),action(id)]);assert.ok(await dl.path());}
 await action('design');await action('clearDesign');assert.equal(await count(),0);await action('designUndo');assert.equal(await count(),48);await action('designRedo');assert.equal(await count(),0);
 assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
};
