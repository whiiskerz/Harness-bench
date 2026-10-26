import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
 if(/^(?:e90)?dt(?:m|p)?\d+/i.test(type)||/\b(?:dtm|dtp|dt)[- ]?(?:2|3|4|6|8|12|16|24)\b/i.test(name))return 'deutsch';
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
export function hardwareRenderer({mesh,group,labels,textSprite,colorOf}){
 const ports=new Map(),models={deutsch:0,leash:0,relay:0,ecu:0,power:0,generic:0},scale=78;
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
 function deutsch(p){
   const n=Math.max(1,Math.min(64,Array.isArray(p.pins)?p.pins.length:1)),family=connectorFamily(p),{cols,rows}=cavityGrid(n);
   const spacing=family==='DTP'?.27:family==='DTM'?.16:.21;
   const w=clamp(.38+spacing*cols,.62,2.45),d=clamp(.39+spacing*rows,.58,1.65);
   const {cx,cz}=place(p),height=.36;
   const type=String(p.type||'').toLowerCase(),female=/socket|receptacle|female|dt04/i.test(p.name||'')||/dt04/.test(type);
   const shell=plastic(female?'#424b56':'#5b646b',.69);
   const gasket=plastic('#a75635',.84);
   const main=box(group,'Deutsch '+family+' housing (visual)',w,height,d,cx,height/2+.07,cz,shell,.09,{kind:'part',id:p.id,part:p});
   box(group,'Deutsch keyed front shoulder',w*.87,.075,d*.73,cx,height+.08,cz+d*.06,plastic('#2d343d',.75),.043);
   // Mating-side silicone seal and removable secondary wedge are visible.
   box(group,'Deutsch mating interface seal',w*.84,.023,d*.67,cx,height+.124,cz+d*.06,gasket,.055);
   const wedgeMat=female?green:orange;
   box(group,'Deutsch '+family+' secondary wedge lock',w*.78,.035,d*.53,cx,height+.15,cz+d*.07,wedgeMat,.04);
   // Rear grommet and stepped cable boot retain the harness at the shell exit.
   box(group,'Deutsch rear seal',w*.79,.11,d*.22,cx,.20,cz-d*.42,plastic('#b46b40',.81),.05);
   box(group,'Deutsch strain-relief boot',w*.65,.14,d*.18,cx,.23,cz-d*.59,rubber,.06);
   // Polarized latch, thumb ridge and side rails.
   box(group,'Deutsch positive lock latch',w*.42,.13,d*.37,cx,height+.09,cz+d*.39,shell,.05);
   box(group,'Deutsch latch catch',w*.24,.045,.105,cx,height+.175,cz+d*.48,plastic('#252c35'),.023);
   for(const side of [-1,1])box(group,'Deutsch side key rail',.055,.14,d*.60,cx+side*w*.46,height*.66,cz,shell,.021);
   const terminals=[];
   for(let i=0;i<n;i++){
     const column=i%cols,row=Math.floor(i/cols);
     const x=cx+(column-(cols-1)/2)*spacing;
     const z=cz+(row-(rows-1)/2)*spacing+d*.065;
     const r=clamp(spacing*.275,.028,.075);
     cylinder(group,'Deutsch molded cavity recess',r*1.30,.018,x,height+.178,z,shadow,16,{kind:'cavity',id:p.id,part:p,pin:p.pins?.[i]});
     cylinder(group,'Deutsch contact or seal',r*.69,.022,x,height+.189,z,p.pins?.[i]?.used?gold:plastic('#29313b'),14);
     if(p.pins?.[i]?.used){
       cylinder(group,'Deutsch cavity wire color ring',r*.24,.026,x,height+.202,z,plastic(colorOf(p.pins[i].color||'BLK')) ,10);
     }
     const px=cx+(column-(cols-1)/2)*spacing*.95;
     terminals.push(v(px,.32,cz-d*.55));
   }
   setPorts(p,terminals);
   addLabel(family+' '+n+'P',cx,height+.46,cz,.81);
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
     box(group,'Leash relay top label '+(i+1),.40,.012,.30,x,.79,cz+.23,plastic('#32383e'),.008);
     fuse(x,.36,cz-.23,'#38bc61');
     stud(x,.35,cz-.56);
     outputPorts.push(v(x,.32,cz-.88));
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
 function port(id,pin){
   const points=ports.get(String(id));
   if(!points?.length)return null;
   const i=Number(pin);
   return points[Number.isInteger(i)&&i>=0&&i<points.length?i:0].clone();
 }
 return {build,port,ports,models};
}
