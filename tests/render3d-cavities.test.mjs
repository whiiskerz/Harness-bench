import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cavityLayout,mirroredFrontPosition,pigtailGuides,finitePoint} from '../render3d-cavities.mjs';

test('Deutsch DT style common cavity-count layouts have unique per-cavity rear exits',()=>{
 for(const [count,cols,rows] of [[2,2,1],[3,2,2],[4,2,2],[6,3,2],[8,4,2],[12,6,2]]){
   const a=cavityLayout(count,'DT');
   assert.equal(a.count,count);
   assert.equal(a.cols,cols);
   assert.equal(a.rows,rows);
   assert.equal(a.points.length,count);
   assert.equal(new Set(a.points.map(q=>q.x.toFixed(4)+','+q.y.toFixed(4))).size,count);
   assert.ok(a.points.every(p=>p.index>=0&&p.index<count));
 }
});
test('DTM and DTP variants change cavity pitch without changing index correspondence',()=>{
 const small=cavityLayout(4,'DTM'),middle=cavityLayout(4,'DT'),large=cavityLayout(4,'DTP');
 assert.ok(Math.abs(small.points[0].x)<Math.abs(middle.points[0].x));
 assert.ok(Math.abs(middle.points[0].x)<Math.abs(large.points[0].x));
 for(let i=0;i<4;i++)assert.equal(small.points[i].index,large.points[i].index);
});
test('The physical opposite face is mirrored to the viewer; not remapped to a different pin',()=>{
 const rear=cavityLayout(6,'DT').points;
 for(const p of rear){
   const front=mirroredFrontPosition(p);
   assert.equal(front.x,-p.x);assert.equal(front.y,p.y);
 }
});
test('Individual rear exits begin at distinct cavity positions before converging into a common loom',()=>{
 const layout=cavityLayout(6,'DT');
 const arr=layout.points.map(p=>pigtailGuides({
   exit:{x:p.x,y:.7+p.y,z:-.8},
   rearCenter:{x:0,y:.7,z:-.8},direction:{x:0,y:0,z:-1},
   target:{x:1.7,y:.4,z:-3.2},fanLength:.9,gauge:18
 }));
 assert.equal(new Set(arr.map(points=>points[0].x.toFixed(6)+','+points[0].y.toFixed(6))).size,6);
 arr.forEach(points=>{
   assert.equal(points.length,5);
   assert.ok(points.every(finitePoint));
   assert.equal(points[0].z,-.8);
   assert.ok(points[1].z<points[0].z,'First pigtail segment must exit rear face, not cross the connector body');
   assert.ok(points[2].z<points[1].z);
   assert.ok(points[3].z<points[2].z);
   assert.ok(Math.abs(points[3].x)<Math.abs(points[0].x),'Fan guides converge toward a shared harness centerline');
 });
});
test('Heavier AWG wire has a longer straight exit section (stiffer bend)',()=>{
 const cfg={exit:{x:.2,y:.8,z:-.5},rearCenter:{x:0,y:.8,z:-.5},direction:{x:0,y:0,z:-1},target:{x:1.5,y:.4,z:-2},fanLength:1};
 const large=pigtailGuides({...cfg,gauge:10});
 const small=pigtailGuides({...cfg,gauge:22});
 assert.ok(Math.abs(large[1].z-large[0].z)>Math.abs(small[1].z-small[0].z));
});
test('Malformed connector pigtail coordinates are rejected rather than producing invalid geometry',()=>{
 assert.throws(()=>pigtailGuides({exit:{x:NaN,y:0,z:0},rearCenter:{x:0,y:0,z:0},direction:{x:0,y:0,z:-1},target:{x:1,y:0,z:0}}),/finite/);
 assert.throws(()=>pigtailGuides({exit:{x:0,y:0,z:0},rearCenter:{x:0,y:0,z:0},direction:{x:0,y:0,z:0},target:{x:1,y:0,z:0}}),/direction/);
});
