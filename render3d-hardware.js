import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cavityLayout } from './render3d-cavities.mjs';
import { deutschFamily, makePair, pairSummary } from './wireforge-dt-model.mjs';

/*
 * WireForge v0.21 procedural hardware models.
 * These are visual approximations built from component categories and cavity counts.
 * They do NOT constitute manufacturer CAD drawings, validated cavity layouts,
 * cable bend specifications, or exact electrical board wiring.
 */
export function hardwareClass(part){
 const type=String(part?.type||'').toLowerCase();
 const name=String(part?.name||'').toLowerCase();
 if(type==='dual'||type==='e90leash1'||/leash (?:dual|single|relay)/.test(name))return 'leash';
 if(/^relay(?:4|5)?$/.test(type)||/relay (?:socket|module)/.test(name))return 'relay';
 if(deutschFamily(part)||/^(?:e90)?dt(?:m|p)?\d+/i.test(type))return 'deutsch';
 if(/^mxrace/.test(type)||(/maxxecu/.test(name)&&/ecu|race/i.test(name)))return 'ecu';
 if(/^(?:pdb|gbus|fuse|bat|bmwbig|bmwsmall|starter|speedwayalt)/.test(type))return 'power';
 return 'generic';
}
export function connectorFamily(part){
 const v=(String(part?.type||'')+' '+String(part?.name||'')).toUpperCase();
 return /(?:^|[^A-Z])DTP\d+/.test(v)?'DTP':/(?:^|[^A-Z])DTM\d+/.test(v)?'DTM':'DT';
}
export function cavityGrid(n){
 // Visual pattern only. Confirm the molded numbering/geometry against the datasheet.
 if(n<=2)return {cols:2,rows:1};
 if(n===3)return {cols:3,rows:1};
 if(n===4)return {cols:2,rows:2};
 if(n===6)return {cols:3,rows:2};
 if(n===8)return {cols:4,rows:2};
 if(n===12)return {cols:6,rows:2};
 const cols=Math.ceil(Math.sqrt(n*1.7));return {cols,rows:Math.ceil(n/cols)};
}
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function hardwareRenderer({mesh,group,labels,textSprite,colorOf,sceneData,assemblyOptions={}}){
 const ports=new Map(),portDetails=new Map(),matePortDetails=new Map(),mateSummaries=new Map(),models={deutsch:0,leash:0,relay:0,ecu:0,power:0,generic:0},scale=78;
 const plastic=(color,roughness=.68)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness:.045,clearcoat:.12,clearcoatRoughness:.34});
 const metal=(color='#b2bdc7')=>new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.75});
 const rubber=plastic('#20252c',.84),shadow=plastic('#11171d',.76);
 const silver=metal('#a9b1ba'),gold=metal('#d6af61'),orange=plastic('#ed8239',.57),green=plastic('#58b54c',.58);
 function box(parent,name,w,h,d,x,y,z,mat,r=.04,meta){
   const m=mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w*.20,h*.30,d*.20)),mat,parent,meta);
   m.name=name;m.position.set(x,y,z);return m;
 }
 function cylinder(parent,name,r,h,x,y,z,mat,radial=14,meta){
   const m=mesh(new THREE.CylinderGeometry(r,r,h,radial),mat,parent,meta);
   m.name=name;m.position.set(x,y,z);return m;
 }
 function cap(parent,name,r0,r1,h,x,y,z,mat){
   const m=mesh(new THREE.CylinderGeometry(r0,r1,h,18),mat,parent);
   m.name=name;m.position.set(x,y,z);return m;
 }
 function addLabel(text,x,y,z,dim=.90){
   const s=textSprite(String(text||'').slice(0,34),'#e9f0f7',22);s.position.set(x,y,z);
   s.scale.set(dim,.21,1);labels.add(s);
 }
 function place(p){
   const cx=(Number(p.x)+(Number(p.w)||100)/2)/scale,cz=-(Number(p.y)+(Number(p.h)||75)/2)/scale;
   return {cx,cz};
 }
 function setPorts(p,points){ports.set(String(p.id),points)}
 function screws(cx,y,cz,w,d){
   for(const x of [-1,1])for(const z of [-1,1]){
     cylinder(group,'Hardware · mounting screw',.028,.012,cx+x*w*.40,y,cz+z*d*.40,silver,12);
   }
 }

 function connectorDirection(p){
   // Aim the rear (-local Z) toward the collective outgoing diagram segments.
   // This is a viewing heuristic, not a specified physical installation angle.
   const center=place(p),wires=sceneData?.wires||[];
   let sx=0,sz=0,count=0,first=null;
   for(const w of wires){
     const isA=String(w.a?.p)===String(p.id),isB=String(w.b?.p)===String(p.id);
     if(!isA&&!isB)continue;
     const route=w.points||[],near=isA?route[Math.min(5,route.length-1)]:route[Math.max(0,route.length-6)];
     if(!near||!Number.isFinite(Number(near.x))||!Number.isFinite(Number(near.y)))continue;
     let ox=Number(near.x)/scale-center.cx,oz=-Number(near.y)/scale-center.cz;
     if(Math.hypot(ox,oz)<.16){
       const other=(sceneData?.parts||[]).find(q=>String(q.id)===String(isA?w.b?.p:w.a?.p));
       if(other){ox=(other.x+other.w/2)/scale-center.cx;oz=-(other.y+other.h/2)/scale-center.cz}
     }
     const d=Math.hypot(ox,oz);if(d<.02)continue;
     if(!first)first={x:ox/d,z:oz/d};
     sx+=ox/d;sz+=oz/d;count++;
   }
   if(Math.hypot(sx,sz)<.05&&first){sx=first.x;sz=first.z}
   if(!count)return 0;
   return Math.atan2(-sx,-sz);
 }
 function deutsch(p){
   const n=Math.max(1,Math.min(64,Array.isArray(p.pins)?p.pins.length:1));
   const pair=makePair(p,sceneData?.wires||[],p.dtMate||{});
   const family=pair?.family||connectorFamily(p),layout=cavityLayout(n,family),{cols,rows,spacing}=layout;
   const w=Math.max(.65,cols*spacing+.37);
   const h=Math.max(.58,rows*spacing+.36);
   const length=family==='DTP'?1.04:family==='DTM'?.82:.91;
   const {cx,cz}=place(p);
   const caseY=Math.max(.50,h*.72+.18),front=length*.5,rear=-length*.5;
   const assembly=new THREE.Group();
   assembly.name='Deutsch '+family+' cavity-specific '+n+'-way housing';
   assembly.position.set(cx,0,cz);
   assembly.rotation.y=connectorDirection(p);
   group.add(assembly);
   const title=String(p.name||'').toUpperCase();
   const female=pair?.sideA==='plug',male=!female;
   const shell=plastic(p.shellColor||'#535d65',.70);
   const inner=plastic('#303a42',.85),seal=plastic('#a86b48',.84);
   const housing=box(assembly,'Deutsch '+family+' molded main shell',w,h,length,0,caseY,0,shell,.11,{kind:'part',id:p.id,part:p});
   // Shell step, polarization key and spring lock: visible in profile and on the mating side.
   box(assembly,'Deutsch shell mating rim',w*.94,h*.93,.10,0,caseY,front-.002,plastic('#343d46',.73),.08);
   box(assembly,'Deutsch mating interface recess',w*.80,h*.79,.023,0,caseY,front+.060,inner,.065);
   const wedgeName=String(p.wedgeColor||'').toUpperCase();
   const wedgeColor=/^#[0-9A-F]{6}$/.test(wedgeName)?wedgeName:/(ORANGE|ORG)/.test(wedgeName)?'#e38b4e':pair?.sideA==='plug'?'#e38b4e':'#57b44c';
   const wedge=plastic(wedgeColor,.63);
   // Common DT wedges are green; a specific part's wedge variant may differ.
   box(assembly,'Deutsch secondary wedgelock (visual)',w*.70,h*.70,.029,0,caseY,front+.089,wedge,.046);
   box(assembly,'Deutsch rear gasket surround',w*.87,h*.86,.080,0,caseY,rear-.035,seal,.07);
   box(assembly,'Deutsch rear seal retaining collar',w*.95,h*.95,.081,0,caseY,rear-.105,shell,.07);
   const latchY=caseY+h*.53;
   box(assembly,'Deutsch positive-lock sprung latch',w*.46,.090,length*.51,0,latchY+.04,front*.17,shell,.03);
   box(assembly,'Deutsch latch thumb pad',w*.31,.068,.20,0,latchY+.103,front*.21,plastic('#777f83',.58),.026);
   box(assembly,'Deutsch polarization latch ridge',w*.21,.046,.15,0,latchY+.113,front*.57,inner,.015);
   for(const side of [-1,1]){
     box(assembly,'Deutsch molded side polarization key',.075,h*.50,length*.51,side*w*.493,caseY,front*.29,shell,.025);
     box(assembly,'Deutsch grip rib',.060,h*.19,length*.24,side*w*.512,caseY+h*.07,-length*.14,plastic('#657079',.71),.017);
   }
   // Every front terminal and its rear wire-seal aperture uses the SAME local X/Y
   // coordinate. Observing from the opposite side mirrors the visual cavity view.
   const terminals=[],detail=[];
   const r=clamp(spacing*.255,.027,.070);
   for(const cavity of layout.points){
     const i=cavity.index,x=cavity.x,y=caseY+cavity.y;
     const meta={kind:'cavity',id:p.id,part:p,pin:p.pins?.[i],index:i,side:'A'};
     const used=!!p.pins?.[i]?.used;
     // Cylinder primitives are normally along Y: turn them to face +Z/-Z.
     const tube=(name,rad,len,z,material,meta)=>{
       const q=cylinder(assembly,name,rad,len,x,y,z,material,20,meta);
       q.rotation.x=Math.PI/2;
       return q;
     };
     tube('Mating cavity dark recess',r*1.29,.018,front+.112,shadow,meta);
     tube(used?(female?'Socket female contact':'Male pin contact'):'Mating face empty cavity',r*.68,.035,front+.129,used?gold:inner);
     if(used&&male)tube('Male terminal pin tip',r*.33,.075,front+.170,gold);
     tube('Rear elastomer seal boss',r*1.45,.048,rear-.155,seal);
     tube('Individual rear grommet aperture',r*.85,.026,rear-.184,used?rubber:plastic('#262d35',.78));
     if(used){
       tube('Wire insulation emerging from rear cavity '+(i+1),r*.55,.042,rear-.212,plastic(colorOf(p.pins[i]?.color||'BLK'),.47));
     }else{
       // An unused cavity is visually capped by a *sample* sealing plug.
       // Confirm real plug installation, type, size and color on the build sheet.
       if(pair?.cavities[i]?.a?.aSealPart)
         tube('Side A sealing plug (owner specified · check installed)',r*.68,.065,rear-.221,plastic('#72818d',.77));
       else tube('Side A empty cavity · sealing NOT confirmed',r*.68,.025,rear-.218,shadow);
     }
     const local=new THREE.Vector3(x,y,rear-.235);
     const world=assembly.localToWorld(local.clone());
     const back=assembly.localToWorld(new THREE.Vector3(0,caseY,rear-.235));
     const dir=new THREE.Vector3(0,0,-1).applyQuaternion(assembly.quaternion).normalize();
     terminals.push(world);
     detail.push({position:world.clone(),rearCenter:back.clone(),direction:dir.clone(),index:i,used,cavity:p.pins?.[i]?.number??String(i+1),family,partId:p.id,rotation:assembly.rotation.y});
   }
   setPorts(p,terminals);
   portDetails.set(String(p.id),detail);
   if(pair)mateSummaries.set(String(p.id),{...pairSummary(pair),family:pair.family,sideA:pair.sideA,sideB:pair.sideB,aHousing:pair.aHousing||pair.suggestedA,bHousing:pair.bHousing||pair.suggestedB,verifiedA:!!pair.aHousing,verifiedB:!!pair.bHousing});
   // Separate mating half with its own front contacts, wedgelock and rear
   // cavity exits. B-side wires default to PLANNED until explicitly confirmed.
   if(pair&&assemblyOptions.showMates!==false){
     const gap=.26+clamp(Number(assemblyOptions.gap)||0,0,100)*.011;
     const other=new THREE.Group();
     other.name=pair.family+' '+n+'-way '+pair.sideB+' · companion half';
     other.rotation.y=Math.PI;
     other.position.z=length+gap;
     assembly.add(other);
     const mateShell=plastic('#66717d',.63),mateInner=plastic('#2c343d',.88);
     box(other,'Mating '+pair.sideB+' thermoplastic housing',w*.974,h*.965,length*.94,0,caseY,0,mateShell,.095,{kind:'part',id:p.id,part:p,side:'B'});
     box(other,'Mate molded interface collar',w*.93,h*.91,.11,0,caseY,front-.01,mateShell,.075);
     box(other,'Mate interfacial elastomer seal',w*.80,h*.80,.035,0,caseY,front+.064,seal,.06);
     box(other,'Mate polarized insert and keyed rim',w*.74,h*.73,.028,0,caseY,front+.096,mateInner,.044);
     box(other,'Mate terminal wedgelock',w*.68,h*.67,.024,0,caseY,front+.107,pair.sideB==='plug'?orange:green,.032);
     box(other,'Mate rear elastomer grommet',w*.88,h*.83,.055,0,caseY,rear-.07,seal,.045);
     box(other,'Mate connector rear boot shoulder',w*.89,h*.75,.115,0,caseY,rear-.145,rubber,.045);
     box(other,'Mate external locking ramp',w*.45,.075,length*.41,0,caseY+h*.52,front*.29,mateShell,.035);
     box(other,'Mate latch capture',w*.24,.055,.15,0,caseY+h*.57,front*.65,mateInner,.021);
     for(const side of [-1,1]){
       box(other,'Mate grip ribs',.055,h*.29,length*.43,side*w*.492,caseY,-length*.12,mateShell,.020);
       box(other,'Mate polarized side rail',.060,h*.55,length*.41,side*w*.489,caseY,front*.28,mateInner,.019);
     }
     const mateTerminals=[];
     for(const cavity of layout.points){
       const i=cavity.index,x=cavity.x,y=caseY+cavity.y;
       const entry=pair.cavities[i],b=entry.b;
       const hasLead=b.state==='planned'||b.state==='owner-confirmed';
       const mdata={kind:'cavity',id:p.id,part:p,pin:p.pins?.[i],index:i,side:'B',status:b.state};
       const drill=(name,radius,depth,z,material)=>{
         const m=cylinder(other,name,radius,depth,x,y,z,material,18,mdata);
         m.rotation.x=Math.PI/2;return m;
       };
       drill('Mate front contact cavity',r*1.29,.032,front+.116,shadow);
       drill('Mate '+(pair.sideB==='plug'?'socket contact':'pin contact')+' '+(i+1),r*.69,.043,front+.140,hasLead?gold:mateInner);
       if(pair.sideB==='receptacle'&&hasLead)drill('Mate exposed male terminal',r*.33,.052,front+.184,gold);
       drill('Mate rear silicone cable aperture',r*1.30,.042,rear-.201,seal);
       if(hasLead)drill('Mate '+b.state+' insulation transition',r*.76,.049,rear-.230,plastic(colorOf(b.color||'BLK'),.52));
       else if(b.state==='sealed')drill('Mate sealing plug specified but not independently verified',r*.66,.057,rear-.242,plastic('#7f919b',.73));
       else drill('Mate empty unassigned cavity',r*.68,.02,rear-.235,shadow);
       const local=new THREE.Vector3(x,y,rear-.270);
       const world=other.localToWorld(local.clone());
       const total=assembly.localToWorld(world.clone());
       const rearCenter=assembly.localToWorld(other.localToWorld(new THREE.Vector3(0,caseY,rear-.270)));
       const direction=new THREE.Vector3(0,0,-1).applyQuaternion(other.quaternion).applyQuaternion(assembly.quaternion).normalize();
       mateTerminals.push({position:total,rearCenter,direction,index:i,partId:p.id,
         family,status:b.state,color:b.color,awg:b.awg,
         destination:b.destination,contactPart:b.contactPart,side:'B'});
     }
     matePortDetails.set(String(p.id),mateTerminals);
   }
   // A rear neck outlines the grommet but stays open so individual wires are visible.
   const bootDepth=.18,bootRadius=Math.max(.30,w*.29);
   for(const side of [-1,1]){
      box(assembly,'Open wire-exit rear shroud side',.055,h*.72,bootDepth,side*w*.43,caseY,rear-.18,rubber,.021);
   }
   box(assembly,'Deutsch rear shroud bridge',w*.89,.050,bootDepth,0,caseY+h*.40,rear-.18,rubber,.018);
   const label=textSprite(family+' '+n+' WAY', '#e1e9ee',22);
   label.position.set(cx,caseY+h*.66,cz);labels.add(label);
 }
 function relay(p){
   const {cx,cz}=place(p),width=.84,depth=.83;
   box(group,'Relay socket',.92,.15,.91,cx,.13,cz,plastic('#252a32'),.06,{kind:'part',id:p.id,part:p});
   box(group,'Relay cube casing',width,.58,depth,cx,.49,cz,plastic('#191e26',.50),.09);
   box(group,'Relay molded cap',width*.92,.036,depth*.88,cx,.80,cz,plastic('#323941'),.034);
   box(group,'Relay seam gasket',width*.98,.023,depth*.95,cx,.27,cz,rubber,.014);
   screws(cx,.815,cz,width,depth);
   // Relay terminal names are generic conventional socket references, not validated mappings.
   const ids=['30','85','86','87','87a'],n=Math.min(p.pins?.length||4,5),points=[];
   for(let i=0;i<n;i++){
     const x=cx+(i%3-1)*.18,z=cz+(Math.floor(i/3)-.5)*.19;
     const pin=box(group,'Relay terminal cavity '+ids[i],.09,.024,.11,x,.215,z,plastic('#0d1117'),.018);
     points.push(v(x,.19,cz-.51));
   }
   setPorts(p,points);
   addLabel('RELAY 12V',cx,.91,cz,.87);
 }
 function stud(x,y,z,accent='#d6af61'){
   cylinder(group,'Power terminal insulator',.102,.05,x,y-.053,z,plastic('#252e39'),12);
   cylinder(group,'Power stud brass',.042,.21,x,y+.051,z,metal(accent),12);
   const nut=mesh(new THREE.CylinderGeometry(.075,.075,.055,6),silver,group);
   nut.name='Power stud hex nut';nut.position.set(x,y+.14,z);
   cylinder(group,'Power terminal washer',.087,.012,x,y+.094,z,silver,12);
 }
 function fuse(x,y,z,color){
   box(group,'ATC fuse socket',.22,.10,.25,x,y,z,plastic('#16232c'),.027);
   box(group,'Transparent automotive blade fuse',.17,.18,.11,x,y+.13,z,new THREE.MeshPhysicalMaterial({color,transparent:true,opacity:.78,roughness:.2,metalness:0,transmission:.05}),.022);
   for(const side of [-1,1])box(group,'Fuse test contact',.024,.015,.04,x+side*.049,y+.23,z,metal('#d6e0e6'),.008);
 }
 function leash(p){
   const {cx,cz}=place(p),dual=p.type==='dual'||/dual/i.test(p.name||''),width=dual?1.68:1.12,depth=1.62,count=dual?2:1;
   const plate=plastic('#171b22',.55),rim=plastic('#29333d',.68);
   box(group,'Leash relay module tray (concept)',width,.17,depth,cx,.12,cz,plate,.09,{kind:'part',id:p.id,part:p});
   box(group,'Leash molded tray rim',width*.97,.075,depth*.91,cx,.24,cz,rim,.035);
   for(const side of [-1,1]){
     const tab=box(group,'Leash mounting tab',width*.43,.055,.19,cx,.08,cz+side*depth*.52,plate,.036);
     cylinder(group,'Leash mounting hole',.046,.058,cx,.110,cz+side*depth*.55,plastic('#080b0f'),12);
   }
   const outputPorts=[];
   for(let i=0;i<count;i++){
     const x=cx+(i-(count-1)/2)*(dual?.75:0);
     box(group,'Leash relay socket '+(i+1),.61,.15,.61,x,.29,cz+.21,plastic('#222a32'),.05);
     box(group,'Leash high-current relay '+(i+1),.52,.42,.50,x,.56,cz+.23,plastic('#22262d',.48),.067);
     box(group,'Leash relay top badge '+(i+1),.40,.012,.30,x,.79,cz+.23,plastic('#3a4046'),.008);
     // This relay board's main current connections are stud terminals,
     // while the small control connections are spade-style terminals.
     // Do not invent integral fuses on the Leash board.
     stud(x,.35,cz-.58);
     for(const offset of [-1,1]){
       box(group,'Leash relay control spade',.068,.20,.034,x+offset*.18,.34,cz-.24,metal('#b1bcc7'),.012);
       box(group,'Leash spade insulating collar',.12,.066,.08,x+offset*.18,.255,cz-.24,plastic('#202933'),.015);
     }
     outputPorts.push(v(x,.32,cz-.87));
   }
   if(!dual)outputPorts.push(v(cx+.42,.33,cz-.60));
   screws(cx,.28,cz,width,depth);
   const n=p.pins?.length||0;
   setPorts(p,Array.from({length:n},(_,i)=>outputPorts[i%outputPorts.length].clone().add(v(((i%3)-1)*.08,.015,0))));
   addLabel(dual?'LEASH · DUAL':'LEASH · SINGLE',cx,.98,cz+.27,dual?1.55:1.13);
 }
 function ecu(p){
   const {cx,cz}=place(p),width=2,depth=1.35;
   box(group,'MaxxECU Race controller cover (concept)',width,.28,depth,cx,.21,cz,plastic('#4b565e',.4),.10,{kind:'part',id:p.id,part:p});
   box(group,'MaxxECU raised aluminum shell',width*.93,.11,depth*.92,cx,.39,cz,plastic('#68737e',.48),.07);
   for(const side of [-1,1])box(group,'MaxxECU mount flange',width*.12,.06,depth*.82,cx+side*width*.53,.095,cz,metal('#697581'),.03);
   screws(cx,.45,cz,width*.91,depth*.83);
   const n=p.pins?.length||1;const cols=Math.min(n,10);
   for(let i=0;i<cols;i++){
     box(group,'MaxxECU port pin block',.10,.12,.17,cx+(i-(cols-1)/2)*.14,.29,cz-depth*.45,rubber,.018);
   }
   setPorts(p,Array.from({length:n},(_,i)=>v(cx+(i%cols-(cols-1)/2)*.14,.34,cz-depth*.55)));
   addLabel('MAXXECU · RACE',cx,.63,cz,1.58);
 }
 function power(p){
   const {cx,cz}=place(p),n=p.pins?.length||2,size=Math.max(.78,Math.min(1.38,.64+.09*n));
   box(group,'Distribution insulated base',size,.17,.73,cx,.13,cz,plastic('#2c3540'),.06,{kind:'part',id:p.id,part:p});
   const ports=[];
   for(let i=0;i<Math.min(n,12);i++){
     const x=cx+(i-(Math.min(n,12)-1)/2)*size*.77/Math.max(1,Math.min(n,12)-1);
     stud(x,.3,cz, i%2?'#b9c2cd':'#d4af64');ports.push(v(x,.33,cz-.44));
   }
   setPorts(p,Array.from({length:n},(_,i)=>ports[i%ports.length]));
   addLabel((p.name||'POWER').slice(0,18),cx,.64,cz,1.08);
 }
 function generic(p){
   const {cx,cz}=place(p),n=p.pins?.length||1,size=clamp(.60+Math.sqrt(n)*.11,.74,2.12);
   box(group,'Component housing (visual)',size,.31,size*.76,cx,.23,cz,plastic('#3e4752'),.07,{kind:'part',id:p.id,part:p});
   box(group,'Component molded cover',size*.87,.028,size*.62,cx,.406,cz,plastic('#242d39'),.04);
   screws(cx,.425,cz,size*.8,size*.55);
   const cols=Math.min(Math.max(1,n),6);
   setPorts(p,Array.from({length:n},(_,i)=>v(cx+(i%cols-(cols-1)/2)*size*.65/cols,.26,cz-size*.48)));
   addLabel(p.name||p.type,cx,.61,cz,1.08);
 }
 function build(p){
   const kind=hardwareClass(p);
   models[kind]=(models[kind]||0)+1;
   ({deutsch,leash,relay,ecu,power,generic})[kind](p);
   return kind;
 }
 function portInfo(id,pin){
   const p=portDetails.get(String(id));
   const i=Number(pin);
   return p?.[Number.isInteger(i)&&i>=0&&i<p.length?i:0]||null;
 }
 function port(id,pin){
   const points=ports.get(String(id));
   if(!points?.length)return null;
   const i=Number(pin);
   return points[Number.isInteger(i)&&i>=0&&i<points.length?i:0].clone();
 }
 return {build,port,portInfo,ports,portDetails,matePortDetails,mateSummaries,models};
}
