import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { hardwareRenderer, hardwareClass } from './render3d-hardware.js';
import { cableRenderer } from './render3d-wiring.js';

const STORAGE='wireforge-3d-scene-v1';
const $=id=>document.getElementById(id);
const canvas=$('viewport');
const groups={};
const selectable=[];
let activeScene=null,selected=null,selectedMesh=null,renderer,scene,camera,controls,worldRoot,grid;
let selectedMeta=null,hardware=null,cables=null;
const SCALE=78;
const COLORS={BLK:'#15191f',BLACK:'#15191f',RED:'#e54a49',WHT:'#eceff2',WHITE:'#eceff2',GRN:'#36a66e',GREEN:'#36a66e',BLU:'#347eda',BLUE:'#347eda',YEL:'#f3c545',YELLOW:'#f3c545',ORG:'#f28f38',ORANGE:'#f28f38',BRN:'#76543a',BROWN:'#76543a',PUR:'#9e67db',VIO:'#9e67db',PNK:'#ed8ab2',GRY:'#858f9d',GRAY:'#858f9d',SLV:'#aeb8bf',TAN:'#c8aa7d',GND:'#20262e'};
const clean=v=>String(v??'').slice(0,240);
const finite=v=>Number.isFinite(Number(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vec=(p,y=.35)=>new THREE.Vector3((+p.x||0)/SCALE,y,-(+p.y||0)/SCALE);
function colorOf(v){
 const text=clean(v).toUpperCase().trim();
 if(/^#[\dA-F]{6}$/.test(text))return text;
 const token=text.split(/[/,\-\s]+/)[0];
 return COLORS[token]||'#b0bccb';
}
function layer(group,name){groups[name]=new THREE.Group();groups[name].name=name;group.add(groups[name]);return groups[name]}
function makeMaterial(color,metalness=.05,roughness=.65,transparent=false,opacity=1){
 return new THREE.MeshStandardMaterial({color,metalness,roughness,transparent,opacity,side:THREE.FrontSide});
}
function mesh(geometry,material,parent,meta){
 const m=new THREE.Mesh(geometry,material);parent.add(m);
 if(meta){m.userData.meta=meta;selectable.push(m)}
 return m;
}
function lineTube(points,radius,material,parent,meta,smooth=false){
 if(!Array.isArray(points)||points.length<2)return null;
 const pts=[];
 for(const p of points){const q=vec(p,.30);
   if(p.height!==undefined)q.y=clamp(+p.height||.3,.04,4);
   if(!pts.length||q.distanceToSquared(pts[pts.length-1])>0.000001)pts.push(q);
 }
 if(pts.length<2)return null;
 const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.2);
 const segments=clamp(pts.length*(smooth?2:1),12,170);
 const tube=new THREE.TubeGeometry(curve,segments,radius,6,false);
 const result=mesh(tube,material,parent,meta);
 result.userData.curve=curve;return result;
}
function textSprite(text,color='#e8edf4',size=25){
 const title=clean(text).trim().slice(0,40);
 const c=document.createElement('canvas'),ctx=c.getContext('2d');
 c.width=512;c.height=112;
 ctx.font='700 '+size+'px system-ui,Arial,sans-serif';
 const w=Math.min(c.width-20,ctx.measureText(title).width+34);
 ctx.fillStyle='rgba(11,18,28,.8)';
 ctx.beginPath();ctx.roundRect((512-w)/2,18,w,62,13);ctx.fill();
 ctx.font='700 '+size+'px system-ui,Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(title,256,59);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
 const sprite=new THREE.Sprite(material);sprite.scale.set(2.2,.5,1);
 return sprite;
}
function spliceNode(p,parent){
 const pos=vec({x:p.x,y:p.y},.25);
 const m=mesh(new THREE.SphereGeometry(.15,14,10),makeMaterial('#b7a27b',.4,.3),parent,{kind:'part',id:p.id,part:p});
 m.position.copy(pos);
}
function wirePath(w,wireIndex){
 const raw=Array.isArray(w.points)?w.points:[];
 if(raw.length<2)return [];
 const step=1/Math.max(1,raw.length-1),rise=.09+(wireIndex%5)*.024;
 const base=raw.map((p,i)=>({x:Number(p.x)||0,y:Number(p.y)||0,height:.32+Math.sin(Math.PI*i*step)*rise}));
 const conv=port=>port&&{x:port.x*SCALE,y:-port.z*SCALE,height:port.y};
 const tail=Number($('pigtailLength')?.value||35);
 const extension=(port,to)=>{
  if(!port)return [];
  const start=conv(port),dx=to.x-start.x,dy=to.y-start.y,l=Math.hypot(dx,dy)||1;
  const d=Math.min(tail*.7,l*.6);
  return[start,{x:start.x+dx/l*d,y:start.y+dy/l*d,height:start.height+.02}];
 };
 const from=hardware?.port(w.a?.p,w.a?.i),to=hardware?.port(w.b?.p,w.b?.i);
 if(from)base.unshift(...extension(from,base[Math.min(3,base.length-1)]));
 if(to)base.push(...extension(to,base[Math.max(0,base.length-4)]).reverse());
 return base;
}
function build(sceneData,resetCamera=true){
 if(!sceneData||sceneData.schema!=='wireforge.3d.scene.v1'||!Array.isArray(sceneData.parts)||!Array.isArray(sceneData.wires))
   throw new Error('Not a supported WireForge 3D scene file.');
 if(sceneData.parts.length>850||sceneData.wires.length>2500)throw new Error('Scene too large for the current 3D preview.');
 activeScene=sceneData;
 if(worldRoot){scene.remove(worldRoot);worldRoot.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();const materials=obj.material?[].concat(obj.material):[];for(const material of materials){if(material.map)material.map.dispose();if(material.dispose)material.dispose()}})}
 worldRoot=new THREE.Group();scene.add(worldRoot);
 for(const name of ['parts','wires','loom','labels'])layer(worldRoot,name);
 hardware=hardwareRenderer({mesh,group:groups.parts,labels:groups.labels,textSprite,colorOf});
 cables=cableRenderer({mesh,wireGroup:groups.wires,loomGroup:groups.loom,labels:groups.labels,textSprite});
 selectable.length=0;selected=null;selectedMesh=null;selectedMeta=null;
 const looms=Array.isArray(sceneData.looms)?sceneData.looms:[];
 const wireGroups=new Map();
 sceneData.wires.forEach(w=>{const id=String(w.loom||'');if(id){if(!wireGroups.has(id))wireGroups.set(id,[]);wireGroups.get(id).push(w)}});
 for(const p of sceneData.parts){if(!finite(p.x)||!finite(p.y))continue;if(p.node)spliceNode(p,groups.parts);else hardware.build(p)}
 let paintedWires=0,paintedSleeves=0;
 const twistPairs=new Map();
 for(const w of sceneData.wires){
   if(!w.tw)continue;
   const key=String(w.tw);if(!twistPairs.has(key))twistPairs.set(key,[]);
   twistPairs.get(key).push(w);
 }
 sceneData.wires.forEach((w,i)=>{
   const points=wirePath(w,i);if(points.length<2)return;
   const pair=twistPairs.get(String(w.tw||''))||[];
   const other=$('canTwists')?.checked&&pair.length===2?pair.find(q=>q!==w):null;
   const sibling=other?wirePath(other,sceneData.wires.indexOf(other)):null;
   const result=cables.makeWire(w,points,pair.length===2&&w===pair[1]?1:0,sibling,{showTracers:$('wireTracers')?.checked!==false});
   if(result)paintedWires++;
 });
 for(const [id,ws] of wireGroups){
   const loom=looms.find(l=>String(l.id)===id)||{id,name:'Loom '+id,color:'#505966'};
   const representative=ws.find(q=>Array.isArray(q.points)&&q.points.length>1);
   if(!representative)continue;
   const points=wirePath(representative,sceneData.wires.indexOf(representative));
   if(cables.makeLoom(loom,points,{sleeve:$('sleeve').value,ratio:Number($('radius').value)/100,pigtail:Number($('pigtailLength')?.value||35)/SCALE}))paintedSleeves++;
 }
 window.__WF3D_STATS={models:{...hardware.models},paintedWires,paintedSleeves,wireCount:sceneData.wires.length};
 if($('hardwareMix'))$('hardwareMix').textContent=Object.entries(hardware.models).filter(([,n])=>n>0).map(([k,n])=>n+' '+k).join(' · ');
 const items=[...sceneData.parts,...sceneData.wires];
 $('projectTitle').textContent=clean(sceneData.projectName||'Untitled harness');
 $('viewSubtitle').textContent=clean(sceneData.generatedAt?'From 2D drawing · '+new Date(sceneData.generatedAt).toLocaleString():'Imported scene · schematic scale');
 $('countParts').textContent=sceneData.parts.length;
 $('countWires').textContent=sceneData.wires.length;
 $('countLooms').textContent=wireGroups.size;
 $('countBranches').textContent=Array.isArray(sceneData.branches)?sceneData.branches.length:0;
 $('selected').textContent='Select any component or wire for details.';
 updateLayerVisibility();
 updateSearch();
 if(resetCamera)fit();
 $('loading').hidden=true;
}
function updateLayerVisibility(){
 for(const [name,id] of [['parts','layerParts'],['wires','layerWires'],['loom','layerLoom'],['labels','layerLabels']])
  if(groups[name])groups[name].visible=$(id).checked;
 if(grid)grid.visible=$('layerGrid').checked;
}
function updateSearch(){
 const list=$('itemList');list.replaceChildren();
 if(!activeScene)return;
 const search=$('search').value.toLowerCase().trim();
 const items=[
  ...activeScene.parts.map(p=>({kind:'part',id:p.id,text:p.name||p.type||'Unnamed connector'})),
  ...activeScene.wires.map(w=>({kind:'wire',id:w.id,text:w.sig||'Wire '+w.id,color:colorOf(w.color)}))
 ].filter(item=>String(item.text+' '+item.id).toLowerCase().includes(search)).slice(0,80);
 for(const item of items){
  const button=document.createElement('button');button.type='button';
  const dot=document.createElement('span');dot.className='dot';dot.style.background=item.color||'#c7d2df';
  const title=document.createElement('span');title.textContent=clean(item.text);
  button.append(dot,title);button.addEventListener('click',()=>choose(item.kind,item.id));
  if(selectedMeta&&selectedMeta.kind===item.kind&&String(selectedMeta.id)===String(item.id))button.classList.add('active');
  list.append(button);
 }
 if(!items.length){const p=document.createElement('p');p.className='sub';p.textContent='No matching components or wires.';list.append(p)}
}
function choose(kind,id,meshObj=null){
 if(selectedMesh&&selectedMesh.material&&selectedMesh.material.emissive)
  selectedMesh.material.emissive.setHex(0x000000);
 selectedMesh=null;
 selectedMeta=null;
 if(!activeScene){return}
 const item=kind==='wire'?activeScene.wires.find(q=>String(q.id)===String(id)):activeScene.parts.find(q=>String(q.id)===String(id));
 if(!item)return;
 selectedMeta={kind,id,item};
 const target=meshObj||selectable.find(q=>q.userData.meta&&q.userData.meta.kind===kind&&String(q.userData.meta.id)===String(id));
 if(target&&target.material?.emissive){selectedMesh=target;selectedMesh.material.emissive.setHex(0x272014)}
 let info;
 if(kind==='wire'){
  const p=activeScene.parts.find(q=>String(q.id)===String(item.a?.p));
  const q=activeScene.parts.find(q=>String(q.id)===String(item.b?.p));
  info=(item.sig||'Unnamed wire')+'\nColor: '+(item.color||'TBD')+'\nGauge: '+(item.awg||'TBD')+' AWG\nFrom: '+(p?.name||'?')+' / '+(item.fromPin||'?')+'\nTo: '+(q?.name||'?')+' / '+(item.toPin||'?')+'\nLoom: '+(item.loom||'Unassigned')+'\nLength: '+(item.len?'Entered '+item.len+' in':'Drawing-derived only');
 }else{
  info=(item.name||'Component')+'\n3D hardware: '+hardwareClass(item)+' (procedural concept)\nType: '+(item.type||'Unknown')+'\nCavities: '+(item.pins?.length||0)+'\nPosition: '+Math.round(item.x)+', '+Math.round(item.y)+' (diagram units)\nVerify actual manufacturer body and cavity geometry.';
 }
 $('selected').textContent=info;
 updateSearch();
}
function fit(){
 if(!worldRoot)return;
 const box=new THREE.Box3();
 if(groups.parts?.children.length)box.expandByObject(groups.parts);
 if(groups.wires?.children.length)box.expandByObject(groups.wires);
 if(box.isEmpty()){controls.target.set(0,0,0);camera.position.set(8,9,12);controls.update();return}
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const max=Math.max(size.x,size.z,size.y,2);
 controls.target.copy(center);
 camera.position.copy(center.clone().add(new THREE.Vector3(max*.68,max*.95,max*.9)));
 camera.near=.05;camera.far=Math.max(10000,max*50);camera.updateProjectionMatrix();
 controls.minDistance=.25;controls.maxDistance=Math.max(60,max*15);
 controls.update();
}
function preset(mode){
 if(!worldRoot)return;
 const target=controls.target.clone(),distance=camera.position.distanceTo(target)||12;
 const directions={iso:new THREE.Vector3(.7,1,.85),top:new THREE.Vector3(.003,1,.002),front:new THREE.Vector3(0,.3,1),side:new THREE.Vector3(1,.3,0)};
 const dir=(directions[mode]||directions.iso).normalize();
 camera.position.copy(target.clone().addScaledVector(dir,distance));
 camera.up.set(0,1,0);controls.update();
 $('viewMode').textContent=mode.toUpperCase()+' · SCHEMATIC SCALE';
}
function focus(){
 if(!selectedMeta)return;
 const m=selectedMesh||selectable.find(q=>q.userData.meta?.kind===selectedMeta.kind&&String(q.userData.meta.id)===String(selectedMeta.id));
 if(!m)return;
 const center=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
 const bounds=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
 const dist=Math.max(2.2,Math.max(bounds.x,bounds.y,bounds.z)*5.0);
 const dir=camera.position.clone().sub(controls.target).normalize();
 controls.target.copy(center);camera.position.copy(center).addScaledVector(dir,dist);controls.update();
}
function updateBackground(){
 const bg=$('background').value;
 const colors={studio:'#080e18',graphite:'#262e38',light:'#e6ecf1'};
 if(bg==='transparent'){scene.background=null;renderer.setClearAlpha(0)}
 else{scene.background=new THREE.Color(colors[bg]);renderer.setClearAlpha(1)}
 if(grid)grid.material.opacity=bg==='light'?.25:.20;
}
function download(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function filename(ext){const name=clean(activeScene?.projectName||'harness').replace(/[^a-z0-9_-]+/gi,'-').slice(0,55);return 'wireforge-'+(name||'harness')+'-3d.'+ext}
async function savePNG(){
 if(!activeScene)return;
 const original=renderer.getPixelRatio();
 try{
  renderer.setPixelRatio(Math.min(2,original*1.5));
  resize();
  renderer.render(scene,camera);
  const blob=await new Promise(resolve=>renderer.domElement.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('The browser could not create a PNG.');
  download(blob,filename('png'));
 }catch(e){showError(e)}finally{renderer.setPixelRatio(original);resize()}
}
async function saveGLB(){
 if(!activeScene)return;
 const btn=$('saveGlb');btn.disabled=true;btn.textContent='Exporting…';
 try{
  const exporter=new GLTFExporter();
  const output=await new Promise((resolve,reject)=>exporter.parse(worldRoot,resolve,reject,{binary:true,onlyVisible:true,maxTextureSize:1024}));
  download(new Blob([output],{type:'model/gltf-binary'}),filename('glb'));
 }catch(e){showError(e)}finally{btn.disabled=false;btn.textContent='Export GLB'}
}
function showError(error){
 console.error(error);
 const el=$('loading');el.hidden=false;
 $('loadingTitle').textContent='Could not render the scene';
 $('loadingText').textContent=clean(error?.message||error)+' · Check WebGL support, internet connectivity, or import a smaller project.';
}
function resize(){
 const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
 renderer.setSize(r.width,r.height,false);
 camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
}
function init(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(43,1,.05,10000);
 camera.position.set(8,9,12);
 controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.08;
 controls.screenSpacePanning=true;controls.maxPolarAngle=Math.PI*.97;
 const hemi=new THREE.HemisphereLight('#eef8ff','#566780',1.9);scene.add(hemi);
 const key=new THREE.DirectionalLight('#f7faff',3.15);key.position.set(11,23,12);scene.add(key);
 const fill=new THREE.DirectionalLight('#8dbed9',2.1);fill.position.set(-17,9,-13);scene.add(fill);
 const rim=new THREE.DirectionalLight('#f9c588',.72);rim.position.set(8,5,-18);scene.add(rim);
 grid=new THREE.GridHelper(450,110,0x6c7b91,0x334155);
 grid.material.transparent=true;grid.material.opacity=.2;grid.position.y=-.15;scene.add(grid);
 updateBackground();resize();
 new ResizeObserver(resize).observe(canvas.parentElement);
 canvas.addEventListener('pointerup',event=>{
  if(Math.abs(event.movementX)>6||Math.abs(event.movementY)>6)return;
  if(event.button!==0)return;
  const rect=canvas.getBoundingClientRect();
  const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
  const intersections=ray.intersectObjects(selectable.filter(m=>m.visible&&m.parent?.visible),false);
  if(intersections.length){const meta=intersections[0].object.userData.meta;choose(meta.kind==='cavity'?'part':meta.kind,meta.id,intersections[0].object)}
 });
 function tick(){requestAnimationFrame(tick);controls.autoRotate=$('autoRotate').checked;controls.autoRotateSpeed=.8;controls.update();renderer.render(scene,camera)}
 tick();
 for(const id of ['layerParts','layerWires','layerLoom','layerLabels','layerGrid'])$(id).addEventListener('change',updateLayerVisibility);
 for(const id of ['sleeve','radius','pigtailLength','wireTracers','canTwists'])$(id).addEventListener('change',()=>{if(activeScene)build(activeScene,false)});
 $('radius').addEventListener('input',()=>$('radiusValue').textContent=$('radius').value+'%');
 $('pigtailLength').addEventListener('input',()=>$('pigtailValue').textContent=$('pigtailLength').value+' px');
 $('background').addEventListener('change',updateBackground);
 $('search').addEventListener('input',updateSearch);
 $('savePng').addEventListener('click',savePNG);
 $('saveGlb').addEventListener('click',saveGLB);
 $('saveJson').addEventListener('click',()=>{if(activeScene)download(new Blob([JSON.stringify(activeScene,null,2)],{type:'application/json'}),filename('json'))});
 $('loadJson').addEventListener('click',()=>$('fileImport').click());
 $('fileImport').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const input=JSON.parse(await file.text());build(input);localStorage.setItem(STORAGE,JSON.stringify(input))}catch(err){showError(err)}finally{e.target.value=''}});
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.view)));
 $('fit').addEventListener('click',fit);
 $('reset').addEventListener('click',()=>{for(const id of ['layerParts','layerWires','layerLoom','layerLabels','layerGrid'])$(id).checked=true;$('radius').value=100;$('radiusValue').textContent='100%';$('sleeve').value='braid';$('background').value='studio';$('autoRotate').checked=false;$('pigtailLength').value=35;$('pigtailValue').textContent='35 px';$('wireTracers').checked=true;$('canTwists').checked=true;updateLayerVisibility();updateBackground();if(activeScene)build(activeScene)});
 $('focusSelection').addEventListener('click',focus);
 document.querySelectorAll('[data-hardware-focus]').forEach(b=>b.addEventListener('click',()=>{const category=b.dataset.hardwareFocus,p=activeScene?.parts.find(q=>hardwareClass(q)===category);if(!p)return;choose('part',p.id);focus()}));
 $('clearSelection').addEventListener('click',()=>{selectedMeta=null;selected=null;$('selected').textContent='No selection';updateSearch()});
 let raw=null;
 try{raw=localStorage.getItem(STORAGE)}catch(e){}
 if(!raw)throw new Error('No 3D scene snapshot found. Return to WireForge Harness Designer and click Render 3D.');
 build(JSON.parse(raw));
}
window.__WF3D_READY=true;
try{init()}catch(err){showError(err)}
