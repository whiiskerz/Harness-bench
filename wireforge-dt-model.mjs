/*
 * WireForge v0.25 — Deutsch mating-pair engineering model.
 * The SVG/3D geometry is illustrative. Stored cavity indices are WireForge
 * schematic indices, not manufacturer-verified molded cavity numbers.
 * Only explicit owner confirmation may flag an actual crimp as installed.
 */
const FAMILY={DT:{min:14,max:20,contacts:16,amps:13,positions:[2,3,4,6,8,12]},DTM:{min:16,max:22,contacts:20,amps:7.5,positions:[2,3,4,6,8,12]},DTP:{min:10,max:14,contacts:12,amps:25,positions:[2,4]}};
const norm=s=>String(s||'').trim().toUpperCase();
const validStates=['planned','owner-confirmed','unassigned','sealed'];
export function deutschFamily(p){
 const type=norm(p?.type||p?.t),name=norm(p?.name);
 if(/\bDTP(?:04|06|[-_ ]?[0-9])/.test(name+' '+type)||/^DTP\d/.test(type))return'DTP';
 if(/\bDTM(?:04|06|[-_ ]?[0-9])/.test(name+' '+type)||/^DTM\d/.test(type))return'DTM';
 if(/^(?:E90)?DT\d+/.test(type)||type==='E90ANALOG8'||type==='E90CAN8'||/\bDT(?:04|06|[ -]?[0-9]{1,2})\b/.test(name)||/\bDT(?:8|12)[_ -]/.test(name))return'DT';
 return null;
}
export function housingPartNumber(family,n,role,key='A'){
 const fam=FAMILY[family]?family:'DT',count=+n;
 const side=role==='plug'?'06':'04',contact=role==='plug'?'S':'P';
 const nstr=(count===8?'08':String(count)),suffix=count>=8?(String(key||'A').toUpperCase()):'';
 return fam+side+'-'+nstr+contact+suffix;
}
export function parseHousing(value){
 const s=norm(value);
 const m=s.match(/^(DTM|DTP|DT)(04|06)-(0?[23468]|12)(P|S)([A-D])?(?:[- ].*)?$/);
 if(!m)return null;
 return {family:m[1],role:m[2]==='04'?'receptacle':'plug',count:Number(m[3]),contact:m[4],key:m[5]||null};
}
export function familySpec(family){return FAMILY[family]||FAMILY.DT}
export function makePair(part,wires=[],record={}){
 const family=deutschFamily(part);if(!family)return null;
 const n=Array.isArray(part?.pins)?part.pins.length:(Number(part?.count)||0);
 if(n<1||n>64)return null;
 const props=record&&typeof record==='object'?record:{};
 const aHousing=String(props.aHousing||''),bHousing=String(props.bHousing||'');
 const roleGuess=parseHousing(aHousing)?.role||(parseHousing(part.name)?.role)||'receptacle';
 const sideA=roleGuess==='plug'?'plug':'receptacle';
 const sideB=sideA==='plug'?'receptacle':'plug';
 const cavities=[];
 for(let i=0;i<n;i++){
  const matches=wires.filter(w=>String(w.a?.p)===String(part.id)&&Number(w.a?.i)===i||String(w.b?.p)===String(part.id)&&Number(w.b?.i)===i);
  const explicit=props.cavities?.[i]||props.cavities?.[String(i)]||{};
  const state=validStates.includes(explicit.state)?explicit.state:(matches.length?'planned':'unassigned');
  const color=String(explicit.color||matches[0]?.color||'');
  const awg=Number(explicit.awg)||Number(matches[0]?.awg)||0;
  const connected=matches.length>0;
  cavities.push({
   index:i,number:String(part.pins?.[i]?.number??(i+1)),label:String(part.pins?.[i]?.label||''),
   a:{connected,wires:matches.map(w=>({id:w.id,sig:w.sig||'',color:w.color||'',awg:+w.awg||0})),color:matches[0]?.color||'',awg:+matches[0]?.awg||0},
   b:{state,destination:String(explicit.destination||''),color,awg,
      contactPart:String(explicit.contactPart||''),sealPart:String(explicit.sealPart||''),
      evidence:String(explicit.evidence||'').slice(0,600),sealed:!!explicit.sealed}
  });
 }
 return {
  partId:part.id,partName:part.name||'Deutsch connector',family,count:n,
  sideA,sideB,aHousing,bHousing,key:String(props.key||'A').toUpperCase(),
  suggestedA:housingPartNumber(family,n,sideA,props.key),
  suggestedB:housingPartNumber(family,n,sideB,props.key),
  cavities,record:props
 };
}
export function auditPair(pair){
 if(!pair)return[];
 const messages=[];
 const add=(severity,text,index=null)=>messages.push({severity,message:text,partId:pair.partId,cavity:index});
 const spec=familySpec(pair.family);
 if(!spec.positions.includes(pair.count))add('review',pair.family+' '+pair.count+'-way is outside the supported in-line configuration catalog; verify manufacturer part.');
 const a=parseHousing(pair.aHousing),b=parseHousing(pair.bHousing);
 if(!pair.aHousing||!pair.bHousing)add('unknown','Enter both physical housing part numbers before mating compatibility can be checked.');
 else if(!a||!b)add('review','One or both housing part numbers cannot be parsed; confirm against the manufacturer drawing.');
 else{
   if(a.family!==pair.family||b.family!==pair.family)add('error','Mating halves use inconsistent Deutsch connector families.');
   if(a.count!==pair.count||b.count!==pair.count)add('error','Mating halves do not have the same cavity count as the schematic.');
   if(a.role===b.role)add('error','Both mating housings are the same type (plug/receptacle). One DT04-style receptacle and one DT06-style plug are required.');
   if(a.contact===b.contact)add('error','Contact genders are not complementary; match pin receptacle to socket plug.');
   if(pair.count>=8&&a.key!==b.key)add('error','8/12-way connector polarization keys differ.');
 }
 const seen=new Set();
 for(const c of pair.cavities){
  const {a,b}=c;
  if(a.connected){
   if(b.state==='unassigned')add('unknown','Mating-side cavity '+(c.index+1)+' has no termination planned.',c.index);
   if(b.state==='sealed')add('error','Mating-side cavity '+(c.index+1)+' is marked sealed but its other half has a schematic wire.',c.index);
   if(b.state==='planned')add('review','Mating-side cavity '+(c.index+1)+' has only a planning lead—not a confirmed physical termination.',c.index);
  }else if(b.state==='owner-confirmed')add('review','Mating-side cavity '+(c.index+1)+' is owner-confirmed but opposite schematic side has no wire.',c.index);
  if(a.wires.length>1)add('review','Schematic cavity '+(c.index+1)+' has '+a.wires.length+' direct wires. Check actual splice/contact capacity.',c.index);
  for(const [side,gauge] of [['A',a.awg],['B',b.awg]]){
   if(gauge&&(gauge<spec.min||gauge>spec.max))add('error','Side '+side+' cavity '+(c.index+1)+' uses '+gauge+' AWG outside typical '+pair.family+' range '+spec.min+'–'+spec.max+' AWG.',c.index);
  }
  if(b.state==='owner-confirmed'&&(!b.contactPart||!b.destination||!b.evidence))add('review','Owner-confirmed cavity '+(c.index+1)+' lacks contact part number, destination or supporting evidence.',c.index);
  if(b.state==='sealed'&&!b.sealPart)add('unknown','Unused cavity '+(c.index+1)+' requires an identified sealing plug; sealing cannot be assumed.',c.index);
  seen.add(c.index);
 }
 return messages;
}
export function pairSummary(pair){
 if(!pair)return null;
 const issues=auditPair(pair);
 const populatedA=pair.cavities.filter(c=>c.a.connected).length;
 const plannedB=pair.cavities.filter(c=>c.b.state==='planned').length;
 const confirmedB=pair.cavities.filter(c=>c.b.state==='owner-confirmed').length;
 const sealedB=pair.cavities.filter(c=>c.b.state==='sealed').length;
 return {partId:pair.partId,count:pair.count,populatedA,plannedB,confirmedB,sealedB,
  missingB:pair.cavities.filter(c=>c.a.connected&&!['planned','owner-confirmed'].includes(c.b.state)).length,
  issues,hasError:issues.some(x=>x.severity==='error'),completeRecord:!!pair.aHousing&&!!pair.bHousing&&pair.cavities.every(c=>!c.a.connected||c.b.state==='owner-confirmed'&&!!c.b.contactPart&&!!c.b.destination&&!!c.b.evidence)};
}
