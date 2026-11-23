const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function testFormboard(browser,url='http://127.0.0.1:8765/index.html'){
 const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.stack||error.message));
 const act=name=>page.locator('[data-fb="'+name+'"]');
 const read=()=>page.evaluate(()=>JSON.stringify({parts:S.parts,wires:S.wires}));
 async function point(selector,dy=0){
  return page.locator(selector).evaluate((el,dy)=>{
   const p=el.ownerSVGElement.createSVGPoint();
   if(el.tagName==='circle'){p.x=el.cx.baseVal.value;p.y=el.cy.baseVal.value+dy;}
   const {x,y}=p.matrixTransform(el.getScreenCTM());
   return {x,y};
  },dy);
 }
 async function drag(from,to){
  await page.mouse.move(from.x,from.y);
  await page.mouse.down();
  await page.mouse.move(to.x,to.y,{steps:7});
  await page.mouse.up();
 }
 async function download(name){
  const [file]=await Promise.all([page.waitForEvent('download'),act(name).click()]);
  return fs.readFileSync(await file.path(),'utf8');
 }
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.WFFormboard);
  const original=await read();
  await page.locator('#tabs [data-tab="formboard"]').click();
  const savedProject=()=>page.evaluate(()=>JSON.stringify({state:S,saved:localStorage.getItem(KEY)}));
  const beforeMockup=await savedProject();
  await act('bulkheadMockup').click();
  const mockup=page.getByRole('dialog',{name:'E90 firewall bulkhead mockup'});
  assert.equal(await mockup.isVisible(),true);
  await mockup.getByRole('button',{name:'Unplug engine loom'}).click();
  assert.equal(await mockup.getByRole('img',{name:'Engine-side plug detached from the firewall'}).isVisible(),true);
  await mockup.getByRole('button',{name:'Reconnect engine loom'}).click();
  assert.equal(await mockup.getByRole('img',{name:'Cabin loom connected to engine loom through the firewall'}).isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await mockup.isVisible(),false);
  assert.equal(await savedProject(),beforeMockup,'Opening and using the mockup leaves the active project and browser save untouched');
  await act('seed').click();
  assert.equal(await read(),original,'Starter layout must preserve electrical records byte for byte');
  assert.equal(await page.evaluate(()=>WFFormboard.report().rows.filter(r=>r.cut!==null).length),0);
  assert.ok(await page.locator('#wfFormSvg [data-seg]').count()>15);
  assert.ok(await page.locator('#wfFormSvg path[d*=" C"]').count()>15);
  const starterCanvas=page.locator('#wfFormSvg');
  const openingWidth=await starterCanvas.evaluate(svg=>svg.viewBox.baseVal.width/svg.clientWidth);
  assert.ok(openingWidth<1.5,'Large starter opens at a readable zoom');
  await act('fit').click();
  assert.ok(await starterCanvas.evaluate(svg=>svg.viewBox.baseVal.width/svg.clientWidth)>openingWidth);

  // Use a deterministic three-component project to exercise physical and electrical editing.
  const fixture=await page.evaluate(()=>{
   makeCustom('bulk4');
   S.parts=[
    {id:11,t:'dt2',name:'Engine connector',x:30,y:30,pl:{}},
    {id:12,t:'dt2',name:'Cabin connector',x:740,y:30,pl:{}},
    {id:13,t:'bulk4',name:'Firewall pass-through',x:390,y:260,pl:{}}
   ];
   S.wires=[mkW({p:11,i:0},{p:12,i:1},{id:31,sig:'Test circuit',awg:20,color:'BLK'})];
   S.nid=40;
   const g=WFFormboard.fresh();
   const a=WFFormboard.addNode(g,210,230,'Engine connector',11);
   const b=WFFormboard.addNode(g,610,285,'Cabin connector',12);
   const j=WFFormboard.addNode(g,430,440,'Breakout');
   S.wfFormboard=g;
   save();
   showTab('formboard');
   return {a:a.id,b:b.id,j:j.id};
  });
  const {a,b,j}=fixture;
  const port=id=>'[data-port="'+id+'"]';
  let src=await point(port(a)),dest=await point(port(b));
  await drag(src,dest);
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments.length),1,'Drag-to-connect created a physical branch');
  assert.equal(await page.evaluate(()=>S.wires.length),1);
  const branch=await page.evaluate(()=>S.wfFormboard.segments[0].id);
  const bend='[data-bend="'+branch+'"]';
  const handle=await point(bend);
  await drag(handle,{x:handle.x,y:handle.y-46});
  assert.ok(await page.evaluate(()=>S.wfFormboard.segments[0].bend.y<0),'Dragging curve handle reshaped the jacket');
  await page.locator('#fbSegLabel').fill('CABIN RUN');
  await page.locator('#fbLength').fill('22');
  await page.locator('#fbSleeve').fill('DR-25');
  await page.locator('#fbSize').fill('8');
  await act('segSave').click();
  assert.equal(await page.evaluate(()=>WFFormboard.report().rows[0].cut),24);
  assert.match(await page.locator('#wfFormSvg [data-seg="'+branch+'"]').textContent(),/CABIN RUN · DR-25/);

  src=await point(port(j),-10);
  await drag(src,{x:src.x+55,y:src.y});
  assert.ok(await page.evaluate(id=>S.wfFormboard.nodes.find(n=>n.id===id).x>430,j),'Breakout body can be dragged');
  src=await point(port(a));
  dest=await point(port(b));
  await drag(src,dest);
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments.length),1,'Duplicate branches are rejected');
  const canvas=page.locator('#wfFormSvg'),camera=await canvas.getAttribute('viewBox');
  const bounds=await canvas.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.52,bounds.y+bounds.height*.19);
  await page.mouse.wheel(0,-240);
  await page.waitForFunction(v=>document.querySelector('#wfFormSvg').getAttribute('viewBox')!==v,camera);
  await act('fit').click();
  const fit=await canvas.getAttribute('viewBox');
  await drag({x:bounds.x+38,y:bounds.y+38},{x:bounds.x+93,y:bounds.y+63});
  assert.notEqual(await canvas.getAttribute('viewBox'),fit,'Dragging open canvas pans the view');
  await act('fit').click();

  src=await point(port(a));
  await page.mouse.click(src.x,src.y);
  await page.locator('#fbBoot').fill('TEST-BOOT');
  await page.locator('#fbElevation').fill('55');
  await act('nodeSave').click();
  await act('orbit').click();
  const beforeOrbit=await page.locator('#fb-scene path[d*=" C"]').first().getAttribute('d');
  await drag({x:bounds.x+85,y:bounds.y+90},{x:bounds.x+235,y:bounds.y+130});
  assert.notEqual(await page.locator('#fb-scene path[d*=" C"]').first().getAttribute('d'),beforeOrbit);
  await act('build').click();
  assert.match(await download('cut'),/"Test circuit"[\s\S]*"22","2","24","Measured route"/);
  assert.match(await download('bom'),/"Covering","DR-25","8.0 mm ID","22","in"/);
  assert.match(await download('bom'),/"Boot","TEST-BOOT"/);
  assert.match(await download('svg'),/CABIN RUN · DR-25/);
  await page.context().addInitScript(()=>{window.print=()=>{};});
  const popupPromise=page.waitForEvent('popup');
  await act('print').click();
  const print=await popupPromise;
  assert.match(await print.locator('body').textContent(),/Fabrication worksheet[\s\S]*Wire cut list[\s\S]*Material schedule/);
  await print.close();

  await act('design').click();
  src=await point(port(a));
  await page.mouse.click(src.x,src.y);
  await page.getByText('Cavities (2)',{exact:true}).click();
  await act('schematicPart').click();
  assert.equal(await page.locator('#t-draw').isVisible(),true);
  await page.locator('#tabs [data-tab="formboard"]').click();
  const trace=page.locator('#fbTrace');
  await trace.locator('..').locator('..').locator('summary').click();
  await trace.selectOption('31');
  await page.getByText('Route through bulkhead',{exact:true}).click();
  await page.locator('#fbBulk').selectOption('13');
  await page.locator('#fbCavity').selectOption({label:'3'});
  assert.equal(await page.locator('#fbCavity').inputValue(),'2','Displayed cavity label maps to the intended index');
  await page.locator('#fbFace').selectOption('L');
  page.once('dialog',dialog=>dialog.accept());
  await act('bulkApply').click();
  const result=await page.evaluate(()=>S.wires.map(({a,b,len})=>({a,b,len})));
  assert.deepEqual(result,[
   {a:{p:11,i:0},b:{p:13,i:2,s:'L'},len:0},
   {a:{p:13,i:2,s:'R'},b:{p:12,i:1},len:0}
  ]);
  assert.equal(await page.evaluate(()=>WFFormboard.report().rows.filter(r=>r.cut!==null).length),0);
  await page.keyboard.press('Control+z');
  assert.equal(await page.evaluate(()=>S.wires.length),1,'Undo restores the original circuit');
  await page.keyboard.press('Control+Shift+z');
  assert.equal(await page.evaluate(()=>S.wires.length),2,'Redo reapplies the selected bulkhead assignment');
  await page.locator('#tabs [data-tab="lab"]').click();
  await page.locator('#wfLabFrom').selectOption({value:'11:0'});
  await page.locator('#wfLabTo').selectOption({value:'12:1'});
  await page.locator('[data-wfl="trace"]').click();
  assert.equal(await page.locator('#wfLabTrace').getAttribute('data-connected'),'true');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#tabs [data-tab="formboard"]').click();
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments[0].length),22,'Measurements survive reload');
  const workspace=await page.locator('.fb-workspace').boundingBox();
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.locator('.fb-workspace').boundingBox();
  assert.ok(mobile.width<workspace.width&&mobile.width<=390,'Physical workspace fits a narrow screen');
  assert.deepEqual(errors,[]);
  console.log('PASS physical formboard routing, measurements, hardware, 3D, fabrication, bulkhead and persistence');
 }finally{await page.close();}
};
