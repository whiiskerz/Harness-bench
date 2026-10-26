import * as THREE from 'three';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const COLOURS={BLK:'#171c23',BLACK:'#171c23',RED:'#e4514e',WHT:'#edf0f2',WHITE:'#edf0f2',GRN:'#349b64',GREEN:'#349b64',BLU:'#356fd2',BLUE:'#356fd2',YEL:'#e9b937',YELLOW:'#e9b937',ORG:'#ef873b',ORANGE:'#ef873b',BRN:'#78533a',BROWN:'#78533a',PUR:'#985cd3',PURPLE:'#985cd3',VIO:'#985cd3',PNK:'#e980bd',PINK:'#e980bd',GRY:'#89949e',GRAY:'#89949e',SLV:'#acb7c1',TAN:'#c5a97f'};
function tokenColor(t){
 if(/^#[a-f0-9]{6}$/i.test(t))return t;
 return COLOURS[String(t||'').trim().toUpperCase()]||null;
}
export function wireColors(label){
 const str=String(label||'').toUpperCase().trim();
 const tokens=str.replace(/\s+(?:WITH|STRIPE|TRACER)\s+/g,'/').split(/[\/+|,-]/).map(x=>x.trim()).filter(Boolean);
 const base=tokenColor(tokens[0])||'#a9b7c7';
 return {base,tracer:tokens.length>1?tokenColor(tokens[1]):null};
}
export function awgRadius(awg){
 const n=Number(awg)||20;
 return clamp(.028+(20-n)*.0024,.020,.069);
}
function world(p){
 return new THREE.Vector3((Number(p.x)||0)/78,Number.isFinite(+p.height)?+p.height:.34,-(Number(p.y)||0)/78);
}
function curveFrom(points){
 const distinct=[];
 for(const p of points||[]){
   const v=p?.isVector3?p.clone():world(p);
   if(!distinct.length||v.distanceToSquared(distinct[distinct.length-1])>.000005)distinct.push(v);
 }
 return distinct.length>1?new THREE.CatmullRomCurve3(distinct,false,'centripetal',.35):null;
}
function tube(mesh,group,name,curve,radius,material,meta,segmentCount){
 const segs=segmentCount||clamp(Math.round(curve.getLength()*14),24,210);
 const obj=mesh(new THREE.TubeGeometry(curve,segs,radius,10,false),material,group,meta);
 obj.name=name;return obj;
}
function braidTexture(){
 const c=document.createElement('canvas');c.width=96;c.height=96;
 const ctx=c.getContext('2d');ctx.fillStyle='#222d38';ctx.fillRect(0,0,96,96);
 for(let x=-96;x<192;x+=14){
   ctx.strokeStyle='#435262';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+96,96);ctx.stroke();
   ctx.strokeStyle='#151e29';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+96,0);ctx.lineTo(x,96);ctx.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,9);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function stripedCurve(curve,radius,turns=0,sign=1,amount=1){
 const N=clamp(Math.round(curve.getLength()*18),24,260),out=[];
 const frames=curve.computeFrenetFrames(N,false);
 for(let i=0;i<=N;i++){
   const u=i/N,pt=curve.getPointAt(u);
   const angle=(turns?Math.PI*2*turns*u*sign:Math.PI*.25);
   const amplitude=radius*amount;
   pt.addScaledVector(frames.normals[i],Math.cos(angle)*amplitude);
   pt.addScaledVector(frames.binormals[i],Math.sin(angle)*amplitude);
   out.push(pt);
 }
 return curveFrom(out);
}
function coilCurve(curve,phase){
 const count=clamp(Math.round(curve.getLength()*16),36,250),frames=curve.computeFrenetFrames(count,false),len=curve.getLength(),turns=Math.max(3,len/0.34),pts=[];
 for(let i=0;i<=count;i++){
   const t=i/count,p=curve.getPointAt(t),taper=Math.pow(Math.sin(Math.PI*t),.75);
   const angle=t*Math.PI*2*turns+phase;
   p.addScaledVector(frames.normals[i],Math.cos(angle)*.042*taper);
   p.addScaledVector(frames.binormals[i],Math.sin(angle)*.042*taper);
   pts.push(p);
 }
 return curveFrom(pts);
}
export function cableRenderer({mesh,wireGroup,loomGroup,labels,textSprite}){
 let cloth=braidTexture();
 const shell=(color,roughness=.37)=>new THREE.MeshPhysicalMaterial({color,metalness:0,roughness,clearcoat:.33,clearcoatRoughness:.22});
 const rubber=new THREE.MeshPhysicalMaterial({color:'#252b33',metalness:0,roughness:.73,clearcoat:.1});
 function collar(parent,pos,tangent,radius,length=.10){
   const m=mesh(new THREE.CylinderGeometry(radius,radius*.95,length,14),rubber,parent);
   m.name='Heat-shrink wire exit collar';
   m.position.copy(pos);
   m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tangent.clone().normalize());
   return m;
 }
 function makeWire(w,points,index,twistedPartner=null,opts={}){
   const initial=curveFrom(points);if(!initial)return null;
   const radius=awgRadius(w.awg),colors=wireColors(w.color);
   const len=initial.getLength();
   let path=initial;
   if(twistedPartner){
     // Intertwine two wires about a shared centerline, while fading toward real endpoints.
     const secondary=curveFrom(twistedPartner);
     if(secondary){
       const n=clamp(Math.round(Math.max(len,secondary.getLength())*14),28,200),shared=[];
       for(let i=0;i<=n;i++){
         const t=i/n,a=initial.getPointAt(t),b=secondary.getPointAt(t);
         shared.push(a.add(b).multiplyScalar(.5));
       }
       const sharedCurve=curveFrom(shared);
       if(sharedCurve){
         const strand=coilCurve(sharedCurve,index%2?Math.PI:0);
         if(strand)path=strand;
       }
     }
   }
   const strandGroup=new THREE.Group();strandGroup.name='Wire run '+w.id;strandGroup.userData.wireId=String(w.id);wireGroup.add(strandGroup);
   const core=tube(mesh,strandGroup,'Insulated '+(w.sig||'wire '+w.id),path,radius,shell(colors.base),{kind:'wire',id:w.id,wire:w});
   if(colors.tracer&&opts.showTracers!==false){
     const trace=stripedCurve(path,radius,0,1,.92);
     if(trace)tube(mesh,strandGroup,'Longitudinal wire tracer '+w.id,trace,.008,shell(colors.tracer,.45));
   }
   const first=path.getTangentAt(.015),last=path.getTangentAt(.985);
   collar(strandGroup,path.getPointAt(.025),first,radius*1.27,.052);
   collar(strandGroup,path.getPointAt(.975),last,radius*1.27,.052);
   return core;
 }
 function makeLoom(loom,points,opts={}){
   const initial=curveFrom(points);if(!initial)return null;
   const length=initial.getLength();
   if(length<.25)return null;
   const trimmed=clamp((opts.pigtail??.20)/Math.max(length,1),.065,.31);
   const usable=1-2*trimmed;if(usable<.22)return null;
   const start=trimmed,end=1-trimmed,n=clamp(Math.round(length*10),24,160),pts=[];
   for(let i=0;i<=n;i++)pts.push(initial.getPointAt(start+(end-start)*i/n));
   const path=curveFrom(pts);if(!path)return null;
   const mode=String(opts.sleeve||'braid'),radius=.115*clamp(+opts.ratio||1,.5,2);
   const material=mode==='braid'
     ?new THREE.MeshStandardMaterial({map:cloth,color:'#7d909e',metalness:.02,roughness:.86,transparent:true,opacity:.94,side:THREE.DoubleSide})
     :new THREE.MeshPhysicalMaterial({color:mode==='smooth'?'#2e3941':'#394552',roughness:mode==='smooth'?.47:.83,metalness:.03,transparent:true,opacity:.88,side:THREE.DoubleSide});
   const obj=tube(mesh,loomGroup,'Harness sleeve · '+(loom.name||loom.id),path,radius,material);
   const geometry=mode==='convoluted'?new THREE.TorusGeometry(radius+.004,.017,6,14):null;
   if(geometry){
     const mat=shell('#697788',.6);
     const count=clamp(Math.round(path.getLength()/.085),3,85);
     for(let i=0;i<count;i++){
       const t=(i+.5)/count,ring=mesh(geometry,mat,loomGroup);
       ring.name='Convoluted jacket rib';ring.position.copy(path.getPointAt(t));
       ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),path.getTangentAt(t));
     }
   }
   for(const i of [0,1]){
     const t=i?1:0,p=path.getPointAt(t),direction=path.getTangentAt(t);
     collar(loomGroup,p,direction,radius*1.06,.17);
   }
   const label=textSprite(String(loom.name||'LOOM').slice(0,24),'#e8eef5',20);
   label.position.copy(path.getPointAt(.5));label.position.y+=.26;label.scale.set(1.4,.31,1);labels.add(label);
   return obj;
 }
 return {makeWire,makeLoom};
}
