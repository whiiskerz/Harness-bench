/* Original, illustrative formboard geometry. All coordinates are drawing units. */
(function(root){
'use strict';
const coordinate=v=>Number.isFinite(Number(v))?Number(v):0;
const point=(x,y)=>({x:coordinate(x),y:coordinate(y)});
const mix=(a,b,t)=>point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
const xy=p=>p.x+' '+p.y;
const offset=(p,x,y)=>point(p.x+x,p.y+y);
function curve(start,end,segment){
 const a=point(start.x,start.y),b=point(end.x,end.y);
 const dx=b.x-a.x,dy=b.y-a.y;
 const bend=point(segment.bend?.x,segment.bend?.y);
 const c=offset(a,dx*.52+bend.x,dy*.1+bend.y);
 const d=offset(b,-dx*.52+bend.x,-dy*.1+bend.y);
 const sample=t=>mix(mix(mix(a,c,t),mix(c,d,t),t),mix(mix(c,d,t),mix(d,b,t),t),t);
 return {a,b,c,d,sample,path:'M'+xy(a)+' C'+xy(c)+' '+xy(d)+' '+xy(b)};
}
function definitions(){
 return `<defs>
 <pattern id="fb-grid-small" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dce4e7" stroke-width=".8"/></pattern>
 <pattern id="fb-grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#fb-grid-small)"/><path d="M100 0H0V100" fill="none" stroke="#c7d3d8" stroke-width="1"/></pattern>
 <linearGradient id="fb-shell" x2="0" y2="1"><stop stop-color="#e2e7e7"/><stop offset=".21" stop-color="#a9b3b7"/><stop offset=".64" stop-color="#77868e"/><stop offset="1" stop-color="#48575f"/></linearGradient>
 <linearGradient id="fb-rubber" x2="0" y2="1"><stop stop-color="#596870"/><stop offset=".32" stop-color="#303f46"/><stop offset=".64" stop-color="#242c30"/><stop offset="1" stop-color="#111719"/></linearGradient>
 <linearGradient id="fb-module" x2="0" y2="1"><stop stop-color="#667880"/><stop offset=".36" stop-color="#424f56"/><stop offset="1" stop-color="#20292d"/></linearGradient>
 </defs>`;
}
function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;}
function hardware(family,type){
 if(type==='relay4'||type==='relay'){
  const blades=Array.from({length:type==='relay4'?4:5},(_,i)=>'<rect x="'+(8+i*9)+'" y="12" width="4" height="11" fill="#d5bb87" stroke="#756448"/>').join('');
  return blades+'<path d="M2-15L12-22H52L61-15V13L53 18H2Z" fill="url(#fb-module)" stroke="#162125"/><path d="M2-15H52V17M52-15L60-20" fill="none" stroke="#87949a"/><text x="8" y="4" fill="white" font-size="9">RELAY</text>';
 }
 if(type==='fuse6'){
  return '<rect y="-19" width="68" height="38" rx="4" fill="url(#fb-module)"/>'+Array.from({length:6},(_,i)=>'<rect x="'+(5+i*10)+'" y="-12" width="7" height="23" rx="2" fill="#93a6af" stroke="#29373e"/><circle cx="'+(8+i*10)+'" cy="4" r="1.4" fill="#d6cfac"/>').join('');
 }
 if(type==='dual'||type==='e90leash1'){
  return '<rect y="-19" width="72" height="38" rx="4" fill="#305048" stroke="#24382f"/><rect x="8" y="-15" width="24" height="21" rx="2" fill="url(#fb-module)"/>'+(type==='dual'?'<rect x="39" y="-15" width="24" height="21" rx="2" fill="url(#fb-module)"/>':'')+'<path d="M8 12H63" stroke="#c7ae75" stroke-width="5" stroke-dasharray="5 4"/>';
 }
 if(family==='mxecu')family='mx';
 if(family==='term')return '<path d="M0-5H16L24-11A14 14 0 1 1 24 11L16 5H0Z" fill="url(#fb-shell)" stroke="#49575e"/><circle cx="33" cy="0" r="6" fill="#e8eef0" stroke="#48575d"/><path d="M3-3H14M3 3H14" stroke="#5f747d"/>';
 if(family==='bulk'||family==='maven')return '<path d="M0-12H13V-19H21L27-23H52L60-17H71V17H60L52 23H27L21 19H13V12H0Z" fill="url(#fb-rubber)" stroke="#101719"/><path d="M21-25V25M49-22V22M54-20V20M60-16V16M65-16V16" stroke="#607078" stroke-width="2"/><path d="M68-17V17" stroke="#b85749" stroke-width="2"/>';
 if(family==='mx')return '<path d="M0-10H15L23-19H37V19H23L15 10H0Z" fill="url(#fb-shell)" stroke="#34414a"/><rect x="37" y="-28" width="73" height="56" rx="5" fill="url(#fb-module)" stroke="#1a252a" stroke-width="2"/><path d="M42-25V25M102-24V24M48-19H96M48-12H96M48-5H96M48 2H96M48 9H96M48 16H96" stroke="#87989c" stroke-opacity=".56" stroke-width="2"/>';
 if(family==='pwr')return '<rect x="0" y="-17" width="62" height="34" rx="4" fill="url(#fb-module)" stroke="#25333a"/><path d="M14-5H50M14 0H50M14 5H50" stroke="#b59a68" stroke-width="2"/><rect x="53" y="-13" width="9" height="26" rx="2" fill="#7f3734"/>';
 if(family==='dt'||family==='dtm'||family==='dtp')return '<path d="M0-10H14L20-16H48V16H20L14 10H0Z" fill="url(#fb-shell)" stroke="#45555e"/><path d="M46-15H58L64-10V10L58 15H46Z" fill="url(#fb-shell)" stroke="#47545c"/><path d="M17-14V-23H30L35-18H49V-14" fill="none" stroke="#65767c" stroke-width="3"/><path d="M23-11H45M23 11H45M8-8V8M54-12V12" fill="none" stroke="#e5eff0" stroke-opacity=".6"/><path d="M61-10V10" stroke="#bf764a" stroke-width="2"/>';
 return '<path d="M0-8H10L15-13H42L51-8V8L42 13H15L10 8H0Z" fill="url(#fb-shell)" stroke="#45555e"/><path d="M17-11V11M40-12V12M22-5H36M22 5H36" stroke="#637881"/><path d="M51-6V6" stroke="#34454c" stroke-width="3"/>';
}
function projectFor(yaw,pitch,center){
 return (p,z=0)=>{
  const x=p.x-center.x,y=p.y-center.y;
  const u=x*Math.cos(yaw)+z*Math.sin(yaw),v=z*Math.cos(yaw)-x*Math.sin(yaw);
  return point(center.x+u,center.y+y*Math.cos(pitch)-v*Math.sin(pitch));
 };
}
function bulkheadMockup(unplugged){
 const start=unplugged?366:328;
 const breakout=start+65;
 const fitting=family=>hardware(family).replaceAll('fb-','fb-demo-');
 function route(y,bank,label,color){
  return `<g transform="translate(0 ${y})">
   <text x="36" y="-37">MaxxECU ${bank==='A'?'C1 · 48-pin':'C2 · 32-pin'}</text>
   <text x="272" y="42" text-anchor="middle">BH-${bank} · HD30</text>
   <text x="583" y="-34" text-anchor="end">${label}</text>
   <path d="M147 0H238M${start} 0H${breakout}C${breakout+35} 0 477 -18 532 -18" fill="none" stroke="#1b2b33" stroke-width="13" stroke-linecap="round"/>
   <path d="M147 0H238M${start} 0H${breakout}C${breakout+35} 0 477 -18 532 -18" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
   <g transform="translate(148) scale(-1 .72)">${fitting('mx')}</g>
   <path d="M236-12H251V-18H276V18H251V12H236Z" fill="url(#fb-demo-shell)" stroke="#31464f" stroke-width="2"/>
   <path d="M268-20V20M280-17V17" stroke="#253a42" stroke-width="5"/>
   <g transform="translate(${start}) scale(-.66 .8)">${fitting('bulk')}</g>
   <g transform="translate(532 -18) scale(.72)">${fitting('dt')}</g>
  </g>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 604 277" role="img" aria-label="${unplugged?'Engine-side plug detached from the firewall':'Cabin loom connected to engine loom through the firewall'}">
 ${definitions().replaceAll('fb-','fb-demo-')}
 <rect width="604" height="277" fill="#edf2f3"/>
 <rect width="604" height="277" fill="url(#fb-demo-grid)"/>
 <path d="M272 0V277" stroke="#688088" stroke-width="8"/>
 <path d="M272 0V277" stroke="#9aafb4" stroke-width="2" stroke-dasharray="4 7"/>
 <g font-family="system-ui,sans-serif" font-weight="700" fill="#20343d" font-size="15">
  <text x="20" y="29">CABIN</text><text x="292" y="29">ENGINE BAY</text>
  ${route(103,'A','Main engine loom','#2dc4b0')}
  ${route(222,'B','Auxiliary loom','#d19b54')}
 </g>
 </svg>`;
}
root.WFFormArt={point,xy,curve,definitions,angle,hardware,projectFor,bulkheadMockup};
})(window);
