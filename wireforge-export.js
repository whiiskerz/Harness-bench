/* Harness Bench manufacturer export: dependency-free PDF writer (Helvetica, ASCII) + CSV rows.
   Lengths shown are ONLY user-entered measurements. Anything else prints TBD. */
(function(root){
 const W=792,H=612;
 const clean=s=>String(s??'').replace(/[→➔]/g,'->').replace(/[·•]/g,'-').replace(/[−–—]/g,'-').replace(/°/g,' deg').replace(/[^\x20-\x7e]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const f=n=>(Math.round(n*100)/100).toString();
 function Page(){const o=[];return{o,
  text(x,y,s,size=9,bold=false){o.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+f(x)+' '+f(H-y)+' Td ('+clean(s)+') Tj ET');},
  line(x1,y1,x2,y2,w=1,gray=0){o.push(f(gray)+' G '+w+' w '+f(x1)+' '+f(H-y1)+' m '+f(x2)+' '+f(H-y2)+' l S');},
  rect(x,y,w,h,lw=1,fill){if(fill!=null)o.push(f(fill)+' g '+f(x)+' '+f(H-y-h)+' '+f(w)+' '+f(h)+' re f 0 g');o.push('0 G '+lw+' w '+f(x)+' '+f(H-y-h)+' '+f(w)+' '+f(h)+' re S');},
  circle(x,y,r){const k=.5523*r,cy=H-y;o.push('0 G 1.2 w '+f(x+r)+' '+f(cy)+' m '+f(x+r)+' '+f(cy+k)+' '+f(x+k)+' '+f(cy+r)+' '+f(x)+' '+f(cy+r)+' c '+f(x-k)+' '+f(cy+r)+' '+f(x-r)+' '+f(cy+k)+' '+f(x-r)+' '+f(cy)+' c '+f(x-r)+' '+f(cy-k)+' '+f(x-k)+' '+f(cy-r)+' '+f(x)+' '+f(cy-r)+' c '+f(x+k)+' '+f(cy-r)+' '+f(x+r)+' '+f(cy-k)+' '+f(x+r)+' '+f(cy)+' c S');}
 };}
 function build(pages){
  const objs=[];const add=s=>{objs.push(s);return objs.length;};
  add('<< /Type /Catalog /Pages 2 0 R >>');add('');
  const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const kids=[];
  for(const p of pages){const body=p.o.join('\n');const c=add('<< /Length '+body.length+' >>\nstream\n'+body+'\nendstream');kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Contents '+c+' 0 R /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> >>'));}
  objs[1]='<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>';
  let out='%PDF-1.4\n';const off=[];
  objs.forEach((s,i)=>{off.push(out.length);out+=(i+1)+' 0 obj\n'+s+'\nendobj\n';});
  const x=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
  out+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF';
  return out;
 }
 const trunc=(s,n)=>{s=String(s??'');return s.length>n?s.slice(0,n-1)+'~':s;};
 function header(p,m,title,n,total){
  p.text(36,34,m.project+' - '+title,15,true);
  p.text(36,48,'Harness Bench manufacturer package - '+m.date+' - page '+n+' of '+total,8);
  p.line(36,54,W-36,54,1,.3);
 }
 function drawing(p,m){
  const box={x:60,y:84,w:W-120,h:360};
  const ns=m.nodes;
  if(!ns.length){p.text(60,110,'No parts placed.',11);return;}
  const xs=ns.map(n=>n.x),ys=ns.map(n=>n.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const sc=Math.min(box.w/Math.max(1,maxx-minx),box.h/Math.max(1,maxy-miny),1.2);
  const ox=box.x+(box.w-(maxx-minx)*sc)/2,oy=box.y+(box.h-(maxy-miny)*sc)/2;
  const pt=n=>({x:ox+(n.x-minx)*sc,y:oy+(n.y-miny)*sc});
  const byId=new Map(ns.map(n=>[n.id,n]));
  for(const s of m.segments){
   const a=byId.get(s.a),b=byId.get(s.b);if(!a||!b)continue;
   const A=pt(a),B=pt(b);p.line(A.x,A.y,B.x,B.y,3.2,.15);
   const mx=(A.x+B.x)/2,my=(A.y+B.y)/2,txt=(s.length!=null?s.length+' in':'TBD')+' ('+s.wires+' wire'+(s.wires===1?'':'s')+')';
   p.rect(mx-34,my-7,68,12,.6,1);p.text(mx-31,my+2,txt,7.5,s.length!=null);
   if(s.label)p.text(mx-31,my+14,trunc(s.label,22),6.5);
  }
  for(const n of ns){
   const q=pt(n);
   if(n.kind==='breakout'){p.circle(q.x,q.y,6);p.text(q.x+9,q.y+3,trunc(n.label,24),7.5,true);continue;}
   p.rect(q.x-52,q.y-16,104,32,1.2,.92);
   p.text(q.x-48,q.y-5,trunc(n.label,24),8.5,true);
   p.text(q.x-48,q.y+5,'P/N '+trunc(n.pn||'TBD',20),7);
   p.text(q.x-48,q.y+13,n.cav+' cavities',6.5);
  }
  p.text(36,470,'Layout view - not to scale. Printed lengths are user-entered measurements only; TBD = not measured yet.',8);
 }
 function table(pages,m,title,cols,rows,widths,rowH=13,first=true){
  let p=null,y=0;
  const fresh=()=>{p=Page();pages.push(p);header(p,m,title,pages.length,'{N}');y=76;let x=36;cols.forEach((c,i)=>{p.text(x,y,c,7,true);x+=widths[i];});p.line(36,y+3,W-36,y+3,.8,.3);y+=rowH;};
  fresh();
  for(const r of rows){if(y>H-40)fresh();let x=36;r.forEach((v,i)=>{p.text(x,y,trunc(v,Math.floor(widths[i]/3.5)),7);x+=widths[i];});y+=rowH;}
  return p;
 }
 function pdf(m){
  const pages=[];
  const p1=Page();pages.push(p1);header(p1,m,'Harness drawing',1,'{N}');drawing(p1,m);
  p1.text(36,490,'Breakouts: '+(m.breakouts.length?m.breakouts.map(b=>b.label).join(', '):'none')+'   Segments: '+m.segments.length+'   Wires: '+m.rows.length,9);
  const unk=m.notes.slice(0,4);unk.forEach((t,i)=>p1.text(36,508+i*11,'- '+trunc(t,150),7.5));
  table(pages,m,'Connectors and housing part numbers',['Connector ID','Part / type','Housing P/N','Cavities','Mated to'],m.parts.map(q=>[q.label,q.name,q.pn||'TBD',q.cav,q.mate||'-']),[110,260,160,60,120]);
  table(pages,m,'Cable runs and breakout lengths',['Run','From','To','User-entered length (in)','Wires','Covering'],m.segments.map(s=>[s.id,s.fromLabel,s.toLabel,s.length!=null?String(s.length):'TBD',String(s.wires),s.sleeve||'TBD']),[50,170,170,120,50,130]);
  table(pages,m,'Wire schedule',['Wire','AWG','Color','From conn','From P/N','Cav','To conn','To P/N','Cav','Len (in)'],m.rows.map(r=>[r.id,r.awg,r.color,r.aConn,r.aPn,r.aCav,r.bConn,r.bPn,r.bCav,r.len]),[40,40,70,90,100,40,90,100,40,60]);
  const pn=Page();pages.push(pn);header(pn,m,'Open items for quote (TBD)',pages.length,'{N}');
  (m.notes.length?m.notes:['No open items recorded.']).slice(0,40).forEach((t,i)=>pn.text(36,80+i*13,'- '+trunc(t,170),8.5));
  return build(pages).replace(/\{N\}/g,String(pages.length));
 }
 const csvHeaders=['Wire ID','AWG','Base color','Stripe color','From connector ID','From housing P/N','From cavity','To connector ID','To housing P/N','To cavity','Length in (user-entered)','Wire source','Mate mapping'];
 const csvRows=m=>m.rows.map(r=>[r.id,r.awg,r.base,r.stripe,r.aConn,r.aPn,r.aCav,r.bConn,r.bPn,r.bCav,r.len,r.source,r.mate]);
 root.WF_EXPORT={pdf,csvHeaders,csvRows};
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.WF_EXPORT;
