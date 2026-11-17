const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fresh,addNode,addSegment,path,seed,analyze}=require('../wireforge-formboard.js');
const parts=[{id:1,name:'ECU'},{id:2,name:'Injector'},{id:3,name:'Sensor'}];
const wires=[{id:1,a:{p:1,i:0},b:{p:2,i:0},awg:20},{id:2,a:{p:1,i:1},b:{p:3,i:0},awg:18}];
test('shared trunk counts and explicit measured cut length',()=>{
 const g=fresh(),a=addNode(g,0,0,'ECU',1),j=addNode(g,10,0,'J'),b=addNode(g,20,0,'Injector',2),c=addNode(g,10,10,'Sensor',3);
 assert.ok(addSegment(g,a.id,j.id));assert.ok(addSegment(g,j.id,b.id));assert.ok(addSegment(g,j.id,c.id));
 assert.equal(addSegment(g,b.id,c.id),false);
 let r=analyze(g,wires,parts);assert.equal(r.rows[0].cut,null);assert.equal(r.bundles[0].members.length,2);
 g.segments[0].length=24;g.segments[1].length=6;g.segments[2].length=9;g.allowance=1;g.slack=3;
 r=analyze(g,wires,parts);assert.equal(r.rows[0].cut,35);assert.equal(r.rows[1].cut,38);
 assert.equal(r.bundles[0].estimated,true);g.od={'1':2,'2':3};r=analyze(g,wires,parts);
 assert.equal(r.bundles[0].estimated,false);assert.ok(Math.abs(r.bundles[0].d-Math.sqrt(13/.65))<1e-9);
 assert.equal(path(g,'missing','missing'),null);
});
test('seed produces connected draft with no invented cut lengths',()=>{
 const g=seed(parts,wires),r=analyze(g,wires,parts);
 assert.equal(g.nodes.length,4);assert.equal(g.segments.length,3);
 assert.ok(r.rows.every(r=>r.route.length===2&&r.cut===null));
 g.nodes=g.nodes.filter(n=>n.partId!==2);assert.equal(analyze(g,wires,parts).rows[0].status,'Unrouted');
});
test('local leads and duplicate placement are not assigned bogus cut lengths',()=>{
 const g=fresh();addNode(g,0,0,'ECU',1);
 const local=[{id:4,a:{p:1,i:0},b:{p:1,i:1},awg:20}];
 assert.equal(analyze(g,local,parts).rows[0].status,'Local lead – measure separately');
 addNode(g,10,0,'ECU duplicate',1);assert.equal(analyze(g,local,parts).rows[0].status,'Unrouted');
});
test('zero allowance is valid, zero branch length is not',()=>{
 const g=seed(parts,wires);g.segments.forEach(s=>s.length=1);g.allowance=0;g.slack=0;
 assert.equal(analyze(g,wires,parts).rows[0].cut,2);g.segments[0].length=0;
 assert.equal(analyze(g,wires,parts).rows[0].cut,null);
});