const assert=require('node:assert/strict');
const OUT=process.env.WF_SHOT_DIR||'';
module.exports=async function testBranchHarness(browser,url){
 const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:2,acceptDownloads:true});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 const base=url.split('#')[0];
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>showTab('vault')).catch(()=>{});
  await page.locator('[data-wfv="blank"]').first().evaluate(b=>b.click());
  await page.goto(base+'#studio',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const place=async(label,x,y)=>{await page.locator('button[aria-label="Parts"]').tap();await page.locator('.ds-part',{hasText:label}).tap();const b=await page.locator('#wfFormSvg').boundingBox();await page.touchscreen.tap(b.x+x,b.y+y);};
  const tapPart=async name=>{const n=await page.evaluate(n=>{const p=S.parts.find(p=>p.name.includes(n));return S.wfFormboard.nodes.find(x=>x.partId===p.id).id},name);await page.locator('[data-node="'+n+'"]').first().tap();};
  await place('4-pin relay + socket',110,200);
  await place('DT04-4P',480,200);
  await place('DT06-4S',680,200);
  await place('Device',880,200);
  await place('Device',380,430);
  assert.equal(await page.evaluate(()=>S.parts.length),5);
  // relay pigtail: four selectable leads, 30 / 85 / 86 / 87
  assert.equal(await page.locator('[data-lead-tip]').count(),4);
  const run=async(from,cav,to,toCav,id,awg,len)=>{
   await tapPart(from);await page.locator('.ds-cav',{hasText:new RegExp('^'+cav)}).first().tap();await page.getByRole('button',{name:'Run wire'}).tap();
   await tapPart(to);await page.locator('.ds-cav').nth(toCav).tap();
   await page.fill('#weId',id);await page.fill('#weAwg',awg);await page.fill('#weLen',len);
   await page.getByRole('button',{name:'Save wire'}).tap();await page.getByRole('button',{name:'Done'}).tap();
  };
  await run('Relay pigtail','30','DT04-4P',0,'L30','12','20');
  await run('Relay pigtail','87','DT04-4P',1,'L87','12','20');
  // mate the DT halves and continue 87 from the plug to device 1
  await tapPart('DT04-4P');await page.locator('#dsMate').selectOption({index:1});
  await run('DT06-4S','1','2-wire load',0,'M30','12','30');
  assert.equal(await page.evaluate(()=>S.wires.every(w=>w.wid)&&S.wires.filter(w=>w.wfSupplied).length),2);
  // right-click the shared cable: Add breakout here
  const segPoint=async(i,f)=>page.evaluate(([i,f])=>{const p=document.querySelectorAll('[data-seg]')[i].querySelectorAll('path')[1];const pt=p.getPointAtLength(p.getTotalLength()*f);const m=p.getScreenCTM();return{x:m.a*pt.x+m.c*pt.y+m.e,y:m.b*pt.x+m.d*pt.y+m.f}},[i,f]);
  await page.getByRole('button',{name:'Fit'}).tap();
  let pt=await segPoint(0,.5);
  await page.mouse.click(pt.x,pt.y,{button:'right'});
  assert.equal(await page.locator('#dsMenu [role=menuitem]').count(),5);
  await page.locator('#dsMenu button',{hasText:'Add breakout here'}).click({timeout:5000});
  assert.equal(await page.evaluate(()=>S.wfFormboard.nodes.filter(n=>n.partId==null).length),1);
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments.filter(s=>s.needsMeasure).length),2);
  assert.match(await page.locator('.fb-panel-title,.ds-panel').first().textContent().catch(()=>''),/./);
  // drag the breakout (mouse) and keep the measured wire lengths
  const lens=()=>page.evaluate(()=>JSON.stringify(S.wires.map(w=>w.len)));
  const l0=await lens();
  const bk=await page.evaluate(()=>S.wfFormboard.nodes.find(n=>n.partId==null).id);
  const bb=await page.locator('[data-node="'+bk+'"]').first().boundingBox();
  const px0=await page.evaluate(id=>S.wfFormboard.nodes.find(n=>n.id===id).y,bk);
  const gx=bb.x+bb.width/2,gy=bb.y+bb.height/2;await page.mouse.move(gx+16,gy);await page.mouse.down();await page.mouse.move(gx+16,gy+70,{steps:8});await page.mouse.up();
  assert.notEqual(await page.evaluate(id=>S.wfFormboard.nodes.find(n=>n.id===id).y,bk),px0,'breakout dragged');
  assert.equal(await lens(),l0);
  // branch: route the breakout to device 2 (Route tool, drag port to port), then run the 85 lead there
  await page.locator('.ds-rail button',{hasText:'Route'}).tap();
  const dev2=await page.evaluate(()=>{const ps=S.parts.filter(p=>p.t==='load2');return S.wfFormboard.nodes.find(n=>n.partId===ps[1].id).id});
  const a=await page.locator('[data-port="'+bk+'"]').boundingBox(),b=await page.locator('[data-port="'+dev2+'"]').boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await page.mouse.up();
  await page.locator('.ds-rail button',{hasText:'Select'}).tap();
  assert.equal(await page.evaluate(()=>S.wfFormboard.segments.length),4);
  await tapPart('Relay pigtail');await page.locator('.ds-cav',{hasText:/^85/}).first().tap();await page.getByRole('button',{name:'Run wire'}).tap();
  const dn=await page.evaluate(()=>{const ps=S.parts.filter(p=>p.t==='load2');return S.wfFormboard.nodes.find(n=>n.partId===ps[1].id).id});
  await page.locator('[data-node="'+dn+'"]').first().tap();await page.locator('.ds-cav').first().tap();
  await page.fill('#weId','L85');await page.fill('#weAwg','18');await page.getByRole('button',{name:'Save wire'}).tap();await page.getByRole('button',{name:'Done'}).tap();
  // lead 86 intentionally unused
  await tapPart('Relay pigtail');await page.locator('.ds-cav',{hasText:/^86/}).first().tap();await page.getByRole('button',{name:'Mark unused'}).tap();
  assert.equal(await page.evaluate(()=>Object.keys(S.parts.find(p=>p.t==='rp4').wfUnused||{}).length),1);
  await page.touchscreen.tap(60,780);
  await page.getByRole('button',{name:'Fit'}).tap();
  if(OUT)await page.screenshot({path:OUT+'/branched-loom.png'});
  // long press (touch) opens the menu; a drag does not
  const press=async(drag)=>page.evaluate(async drag=>{const g=document.querySelectorAll('[data-seg]')[0],p=g.querySelectorAll('path')[1],pt=p.getPointAtLength(p.getTotalLength()*.3),m=p.getScreenCTM(),x=m.a*pt.x+m.c*pt.y+m.e,y=m.b*pt.x+m.d*pt.y+m.f;
   const svg=document.getElementById('wfFormSvg'),o={bubbles:true,pointerType:'touch',pointerId:7,isPrimary:true,clientX:x,clientY:y,button:0,buttons:1};
   p.dispatchEvent(new PointerEvent('pointerdown',o));
   if(drag)svg.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:x+40,clientY:y+10}));
   await new Promise(r=>setTimeout(r,700));
   const open=!!document.getElementById('dsMenu');
   svg.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));return open;},drag);
  assert.equal(await press(true),false,'drag does not open the menu');
  assert.equal(await press(false),true,'long press opens the menu');
  await page.keyboard.press('Escape');await page.mouse.click(5,400);
  // Individual wires view
  await page.getByRole('button',{name:'Individual wires'}).tap();
  
  assert.ok(await page.locator('[data-look="wires"]').count()>=2);
  assert.ok(await page.locator('[data-wire-hit]').count()>=4);
  const hp=await page.evaluate(()=>{const id=String(S.wires.find(w=>w.wid==='L87').id),g=[...document.querySelectorAll('[data-wire-hit]')].find(x=>x.dataset.wireHit===id),p=g.querySelector('path'),m=p.getScreenCTM(),L=p.getTotalLength();const tips=[...document.querySelectorAll('[data-lead-tip]')].map(t=>{const r=t.getBoundingClientRect();return[r.x+r.width/2,r.y+r.height/2]});for(const f of [.5,.6,.4,.7,.3,.75,.25,.8,.2]){const pt=p.getPointAtLength(L*f),x=m.a*pt.x+m.c*pt.y+m.e,y=m.b*pt.x+m.d*pt.y+m.f,top=document.elementFromPoint(x,y);if(tips.some(([a,b])=>Math.hypot(a-x,b-y)<40))continue;if(top&&top.closest('[data-wire-hit]')===g)return{x,y}}return null});
  await page.touchscreen.tap(hp.x,hp.y);await page.waitForTimeout(400);
  assert.match(await page.locator('.ds-ends').textContent(),/pigtail.*87.*DT04-4P/);
  if(OUT)await page.screenshot({path:OUT+'/branched-individual.png'});
  await page.getByRole('button',{name:'Done'}).tap();
  await page.getByRole('button',{name:'Loom',exact:true}).tap();
  assert.equal(await page.locator('[data-look="wires"]').count(),0);
  // reload and compare
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const st=await page.evaluate(()=>({w:S.wires.map(w=>[w.wid,w.awg,w.len,!!w.wfSupplied]),unused:Object.keys(S.parts.find(p=>p.t==='rp4').wfUnused||{}),flag:S.wfFormboard.segments.filter(s=>s.needsMeasure).length,bk:S.wfFormboard.nodes.filter(n=>n.partId==null).length}));
  assert.equal(st.w.length,4);assert.equal(st.unused.length,1);assert.equal(st.flag,2);assert.equal(st.bk,1);
  await page.locator('[data-fb="studioCuts"]').tap();
  const [dl]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Wire schedule CSV'}).tap()]);
  const csv=require('fs').readFileSync(await dl.path(),'utf8').split('\n').map(l=>l.replace(/"/g,'').split(','));
  for(const id of ['L30','L87','M30','L85']){const r=csv.find(l=>l[0]===id);assert.ok(r,id);assert.ok(r[2]&&r[4]&&r[7]&&r[9],'both ends '+id);}
  assert.equal(csv.find(l=>l[0]==='L30')[18],'Supplied lead');
  assert.equal(csv.find(l=>l[0]==='M30')[18],'Cut wire');
  // BOM supplier is the relay socket in both directions (relay -> DT and DT -> relay)
  const bomSup=async()=>{await page.locator('[data-fb="studioBom"]').tap();return (await page.locator('.ds-report').textContent());};
  const fwd=await bomSup();
  assert.match(fwd,/Supplied lead[\s\S]*Relay pigtail/);
  await page.evaluate(()=>{for(const w of S.wires.filter(w=>w.wfSupplied)){const t=w.a;w.a=w.b;w.b=t}save()});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.ds-shell');
  const rev=await bomSup();
  assert.match(rev,/Supplied lead[\s\S]*Relay pigtail/);
  assert.equal((rev.match(/Supplied lead/g)||[]).length,(fwd.match(/Supplied lead/g)||[]).length);
  assert.deepEqual(errs,[]);
 }finally{await ctx.close();}
};
