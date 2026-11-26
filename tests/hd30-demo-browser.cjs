const assert=require('node:assert/strict');
module.exports=async function(browser,url){
 const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:2,acceptDownloads:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const action=async id=>{const b=page.locator('[data-fb="'+id+'"]').first();if(!await b.isVisible())await page.locator('.ds-demomenu summary').tap();await b.tap();};
 const count=()=>page.evaluate(()=>S.wires.length);
 try{
 await page.goto(url.split('#')[0]+'#studio');await page.waitForSelector('.ds-shell');
 await page.locator('#dsDemoSelect').selectOption('ls');
 const imported=await page.evaluate(()=>{
  const source=e90ProjectStarter();
  return source.wires.every(orig=>S.wires.some(w=>w.id===orig.id&&w.sig===orig.sig&&JSON.stringify(w.a)===JSON.stringify(orig.a)&&JSON.stringify(w.b)===JSON.stringify(orig.b)));
 });
 assert.ok(imported,'Every original vehicle conductor keeps its endpoints and function');
 assert.equal(await page.evaluate(()=>S.parts.filter(p=>p.t==='coilLogical'||p.t==='injectorLogical').length),16);
 await page.locator('#dsDemoSelect').selectOption('plan');
 assert.deepEqual(await page.evaluate(()=>[S.parts.length,S.parts.filter(p=>p.mate).length,S.looms.length]),[7,4,2]);
 await action('quickWire');
 await page.locator('[data-quick-connector="Source"]').selectOption(await page.evaluate(()=>S.wfFormboard.nodes.find(n=>n.partId===4).id));
 await page.locator('[data-quick-connector="Destination"]').selectOption(await page.evaluate(()=>S.wfFormboard.nodes.find(n=>n.partId===6).id));
 const before=await count();
 await page.locator('[data-fb="quickPin"][data-side="Source"]').first().tap();
 await page.locator('[data-fb="quickPin"][data-side="Destination"]').first().tap();
 assert.equal(await count(),before+1);
 await action('quickEdit');await page.waitForSelector('#weId');
 await page.locator('#dsDemoSelect').selectOption('hd30');
 assert.deepEqual(await page.evaluate(()=>[S.parts.length,S.wires.length,T[S.parts[0].t].pins.length,S.wires.filter(w=>w.loom).length,S.parts[1].mate,S.parts[2].mate]),[4,48,48,47,3,2]);
 await action('lookWires');assert.equal(await page.locator('[data-wire-hit]').count(),48);
 const pt=await page.locator('[data-wire-hit="10"] path').first().evaluate(p=>{const m=p.getScreenCTM();for(let f=.3;f<=.8;f+=.025){const q=p.getPointAtLength(p.getTotalLength()*f),x=m.a*q.x+m.c*q.y+m.e,y=m.b*q.x+m.d*q.y+m.f;if(document.elementFromPoint(x,y)?.closest('[data-wire-hit]')===p.closest('[data-wire-hit]'))return {x,y};}throw Error('No unobstructed W01 hit target');});await page.touchscreen.tap(pt.x,pt.y);await page.waitForSelector('#weId');
 assert.equal(await page.inputValue('#weId'),'W01');assert.equal(await page.inputValue('#weColor'),'GRN');assert.equal(await page.inputValue('#weLen'),'17.72');
 await action('wireTrace');assert.equal(await page.locator('[data-mate-trace="active"]').count(),1);
 await page.fill('#weSig','Fan edited');await action('wireSave');assert.equal(await page.evaluate(()=>S.wires[0].sig),'Fan edited');
 await action('wireDelete');assert.equal(await count(),47);await action('designUndo');assert.equal(await count(),48);
 await action('multiMode');await page.locator('[data-fb="multiWire"]').nth(0).tap();await page.locator('[data-fb="multiWire"]').nth(1).tap();await action('deleteSelected');assert.equal(await count(),46);await action('designUndo');assert.equal(await count(),48);
 await action('lookLoom');assert.equal(await page.locator('[data-wire-hit]').count(),0);
 await page.reload();await page.waitForSelector('.ds-shell');assert.equal(await count(),48);
 await action('studioShop');for(const id of ['shopPdf','shopCsv','bom']){const [dl]=await Promise.all([page.waitForEvent('download'),action(id)]);assert.ok(await dl.path());}
 await action('design');await action('clearDesign');assert.equal(await count(),0);await action('designUndo');assert.equal(await count(),48);await action('designRedo');assert.equal(await count(),0);
 // Exercise direct cavity selection independently of the side-by-side picker.
 const place=async(type,x,y)=>{
  await page.locator('button[aria-label="Parts"]').tap();
  await page.locator('.ds-part[data-type="'+type+'"]').tap();
  const box=await page.locator('#wfFormSvg').boundingBox();
  await page.touchscreen.tap(box.x+x,box.y+y);
 };
 await place('mxpig48',260,220);await place('dt04_4p',680,220);
 await action('pinWire');
 const pins=page.locator('[data-pin-node]'),from=await pins.first().getAttribute('data-pin-node'),to=await pins.last().getAttribute('data-pin-node');
 const pin=(id,i)=>page.locator('[data-pin-node="'+id+'"][data-canvas-pin="'+i+'"]');
 await action('pinNext');
 await pin(from,0).tap();assert.equal(await page.locator('#dsPinPreview').count(),1);
 await pin(to,0).tap();await pin(to,1).tap();
 assert.equal(await count(),2);
 assert.equal(await pin(from,2).getAttribute('class'),'ds-pin source');
 await pin(to,1).dispatchEvent('pointerdown',{button:0});assert.equal(await count(),2);
 await page.locator('.ds-pin-status [data-fb="pinWire"]').tap();
 await action('importWireCSV');
 const names=await page.evaluate(()=>S.parts.map(p=>p.name));
 await page.locator('#hdCsvText').fill('WireID,From,FromPin,To,ToPin,Circuit,Color,Stripe,AWG,LengthIn\nCSV01,'+names[0]+',B1,'+names[1]+',3,Test branch,BLU,WHT,22,12');
 await page.locator('#hdCsvApply').tap();assert.equal(await count(),3);
 await action('quickWire');await action('quickWire');
 await action('lookWires');
 await page.locator('[data-node="'+to+'"]').first().tap();
 await page.locator('.ds-wirelist button').filter({hasText:'CSV01'}).tap();
 await page.locator('#weUnit').selectOption('mm');assert.equal(await page.inputValue('#weLen'),'304.8');
 await page.locator('#weLen').fill('254');await page.locator('#weAwg').selectOption('20');
 await page.locator('.ds-swatches summary').first().tap();
 await page.getByRole('button',{name:'Color GRN',exact:true}).tap();
 await action('wireSave');
 assert.deepEqual(await page.evaluate(()=>{const w=S.wires.find(w=>w.wid==='CSV01');return [w.len,w.awg,w.color];}),[10,20,'GRN/WHT']);
 await action('autoLayout');
 assert.equal(await page.evaluate(()=>S.wires.find(w=>w.wid==='CSV01').len),10);
 assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
};
