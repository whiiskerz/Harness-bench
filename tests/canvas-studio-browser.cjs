const assert=require('node:assert/strict');
module.exports=async function testStudio(browser,url){
 const page=await browser.newPage({viewport:{width:1200,height:760}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url.split('#')[0]+'#studio',{waitUntil:'domcontentloaded'});
  const act=id=>page.locator('.ds-shell [data-fb="'+id+'"]').first();
  const svg=page.locator('#wfFormSvg');
  const original=await page.evaluate(()=>JSON.stringify(S.wires));
  async function place(type,x,y){
   await act('parts').click();await page.locator('[data-type="'+type+'"]').click();
   await svg.click({position:{x,y}});
  }
  await place('mxrace48',230,280);
  await place('mxrace32',290,510);
  await place('hd30_47',750,280);
  await act('dismiss').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(S.wires)),original);
  const tip=page.locator('[data-lead-tip="0"]').first();
  const bulk=page.locator('#wfFormSvg [data-node]').last().locator('[data-port]');
  async function center(el){return el.evaluate(node=>{const r=node.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});}
  await page.mouse.move(...await center(tip));await page.mouse.down();await page.mouse.move(...await center(bulk),{steps:8});await page.mouse.up();
  await page.locator('#dsSource').selectOption({value:'0'});
  await page.locator('#dsFace').selectOption('R');
  await page.locator('#dsCavity').selectOption({value:'11'});
  await act('land').click();
  assert.equal(await page.evaluate(()=>S.wires.at(-1).b.i),11);
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments.at(-1).length),null);
  await act('studioWiring').click();assert.equal(await page.locator('[data-wirepart]').count(),3);
  await act('studioBom').click();await act('studioCuts').click();assert.ok(await page.getByRole('heading',{name:'Wire cut list'}).isVisible());
  await page.setViewportSize({width:390,height:844});await act('design').click();
  const box=await page.locator('.ds-shell').boundingBox();assert.equal(box.width,390);
  await act('parts').click();assert.ok(await page.locator('[data-type=fuse6]').isVisible());
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
};
