import test from 'node:test';
import assert from 'node:assert/strict';
import {makePair,pairSummary,auditPair} from '../wireforge-dt-model.mjs';
const part={id:42,type:'dt2',name:'Sample DT2 bulk connector',pins:[{number:'1',label:'Pump trigger'},{number:'2',label:'CAN'}]};
const wires=[{id:1,a:{p:42,i:0},b:{p:88,i:1},sig:'GPO2',color:'GRN',awg:18}];
const housing={aHousing:'DT04-2P',bHousing:'DT06-2S'};
function rec(a={},b={}){return {...housing,cavities:{0:{...a,...b},1:{aSealPart:'114017',aSealConfirmed:true,state:'sealed',sealPart:'114017'}}}}
const aRecord={aTerminationState:'owner-confirmed',aContactPart:'PIN-TEST-PN',aDestination:'Race LS GPO2',aEvidence:'Photo crimp-001'};
const bRecord={state:'owner-confirmed',contactPart:'SOCKET-TEST-PN',destination:'Leash relay input',evidence:'Continuity checked'};
test('Two-sided Deutsch model does NOT treat a drawn wire as a physically confirmed crimp',()=>{
 const p=makePair(part,wires,rec({},bRecord));
 const q=pairSummary(p);
 assert.equal(p.cavities[0].a.terminationState,'planned');
 assert.equal(p.cavities[0].b.state,'owner-confirmed');
 assert.equal(q.confirmedA,0);
 assert.equal(q.pairedTerminations,0);
 assert.equal(q.completeRecord,false);
 assert.ok(auditPair(p).some(x=>x.message.includes('Side A cavity 1')));
});
test('Both sides require independent contact, destination and evidence fields',()=>{
 for(const key of ['aContactPart','aDestination','aEvidence']){
  const weak={...aRecord};delete weak[key];
  assert.equal(pairSummary(makePair(part,wires,rec(weak,bRecord))).completeRecord,false,'Missing '+key);
 }
 for(const key of ['contactPart','destination','evidence']){
  const weak={...bRecord};delete weak[key];
  assert.equal(pairSummary(makePair(part,wires,rec(aRecord,weak))).completeRecord,false,'Missing '+key);
 }
 const full=pairSummary(makePair(part,wires,rec(aRecord,bRecord)));
 assert.equal(full.confirmedA,1);
 assert.equal(full.confirmedB,1);
 assert.equal(full.pairedTerminations,1);
 assert.equal(full.completeRecord,true);
});
test('Invalid housings cannot be declared compatible even when all cavities were confirmed',()=>{
 const bad=makePair(part,wires,{...rec(aRecord,bRecord),bHousing:'DT04-2P'});
 assert.equal(pairSummary(bad).completeRecord,false);
 assert.ok(auditPair(bad).some(x=>x.severity==='error'));
});
test('Unused cavity requires real sealing plug confirmation on both halves',()=>{
 const r=rec(aRecord,bRecord);delete r.cavities[1].aSealConfirmed;
 assert.equal(pairSummary(makePair(part,wires,r)).completeRecord,false);
});
