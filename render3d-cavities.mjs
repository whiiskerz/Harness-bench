/*
 * Schematic-derived cavity geometry. Index i is the project's terminal-array index,
 * NOT a verified OEM molded cavity number. Exact cavity orientation/numbering must be
 * checked against the TE Connectivity part-number-specific rear-view drawing.
 * Pure functions so geometry can be regression-tested without a WebGL context.
 */
export function cavityLayout(count,family='DT'){
 const n=Math.max(1,Math.min(64,Math.floor(Number(count)||1)));
 let rows,cols;
 if(n===3){cols=2;rows=2} // DT 3-way triangular body
 else if(n<=2){cols=n;rows=1}
 else if(n===4){cols=2;rows=2}
 else if(n===6){cols=3;rows=2}
 else if(n===8){cols=4;rows=2}
 else if(n===12){cols=6;rows=2}
 else {cols=Math.ceil(Math.sqrt(n*1.7));rows=Math.ceil(n/cols)}
 const spacing=family==='DTP'?.28:family==='DTM'?.158:.212;
 const points=[];
 for(let i=0;i<n;i++){
   let column=i%cols,row=Math.floor(i/cols);
   let x=(column-(cols-1)/2)*spacing,y=((rows-1)/2-row)*spacing;
   if(n===3){
     // TRIANGLE VISUAL: rear viewed with latch up.
     [[-.5,-.46],[.5,-.46],[0,.46]].forEach(()=>{});
     const xy=[[-.5,-.46],[.5,-.46],[0,.46]][i];
     x=xy[0]*spacing*1.45;y=xy[1]*spacing*1.45;
   }
   points.push({index:i,x,y});
 }
 return {count:n,cols,rows,spacing,points,orientation:'WIRE_SIDE_LATCH_UP_VISUAL'};
}
export function mirroredFrontPosition(rear){
 return {x:-rear.x,y:rear.y}; // looking from the opposite end mirrors X
}
const sum=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const mul=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const minus=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const length=a=>Math.hypot(a.x,a.y,a.z);
export function pigtailGuides({exit,rearCenter,direction,target,fanLength=.55,gauge=20}){
 if(!exit||!rearCenter||!direction||!target)throw Error('Missing pigtail geometry');
 if(![exit,rearCenter,direction,target].every(p=>[p.x,p.y,p.z].every(Number.isFinite)))throw Error('Pigtail coordinates must be finite');
 const norm=length(direction);
 if(norm<.00001)throw Error('Pigtail exit direction is undefined');
 const d=mul(direction,1/norm);
 const travel=Math.min(2.8,Math.max(.30,Number(fanLength)||.55));
 const stiff=Math.max(0,Math.min(1,(20-Number(gauge||20))/12));
 const straight=Math.min(travel*.52,.20+.1*stiff);
 const offset=minus(exit,rearCenter);
 const guide1=sum(exit,mul(d,straight));
 const guide2=sum(sum(exit,mul(d,travel*.68)),mul(offset,-.30));
 const gather=sum(sum(rearCenter,mul(d,travel)),mul(offset,.12));
 // Let the external spline follow the schematic away from the connector; the
 // first 4 points enforce rear exit, strain relief, then gradual convergence.
 return [exit,guide1,guide2,gather].map(p=>({...p}));
}
export function finitePoint(p){
 return !!p&&['x','y','z'].every(k=>Number.isFinite(Number(p[k])));
}
