// Leistungsmessung der Lagerverwaltung (SA-14).
// Aufruf:  node tests/perf/benchmark.js <URL zur index.html> [Ausgabedatei.json] [Größen] [Szenarien]
// Beispiel: node tests/perf/benchmark.js http://localhost:8123/index.html out.json 500,2000,6480,10000 worst,multi,many
// Voraussetzung: Node.js mit Playwright (Chromium). Die App muss über HTTP ausgeliefert werden.
// Messmethode: Identische Daten werden direkt in den Browserspeicher geschrieben, die Seite neu geladen,
// dann jeder Schritt mit performance.now() im Browser gemessen (Median über REPS Wiederholungen).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const {build}=require('./dataset');
const URL=process.argv[2]||'http://localhost:8123/index.html',OUT=process.argv[3]||null;
const SIZES=(process.argv[4]||'500,2000,6480,10000').split(',').map(Number),SCEN=(process.argv[5]||'worst,multi,many').split(',');
const KEY='lagerpilot_v2_7';
const med=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
(async()=>{const results=[];const browser=await chromium.launch();
const ONLY=process.env.ONLY?process.env.ONLY.split(','):null;
for(const scenario of SCEN)for(const n of SIZES){
  if(ONLY&&!ONLY.includes(scenario+':'+n))continue;
  const ctx=await browser.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.setDefaultTimeout(0);
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(URL,{waitUntil:'load',timeout:0});await p.waitForTimeout(300);
  const places=await p.evaluate(()=>Object.keys(state.places));
  const data=build(n,scenario,places);
  await p.evaluate(([k,d])=>{const s=structuredClone(state);s.items=d.items;s.boxes=d.boxes;s.config={shelf:100000,bay:100000,palletMax:100000,tare:25};s.history=[];localStorage.setItem(k,JSON.stringify(s))},[KEY,data]);
  await p.reload({waitUntil:'load',timeout:0});await p.waitForTimeout(300);
  const REPS=n>=6480?1:3;
  const r=await p.evaluate(async([REPS,SKIP])=>{
    const t=f=>{const a=performance.now();const v=f();return [performance.now()-a,v]};
    const o={suggest:[],renderMerge:[],render:[],book:[],transfer:[],clone:[],valid:[],stringify:[]};
    o.boxes=state.boxes.length;
    if(!SKIP)for(let i=0;i<REPS;i++){
      o.suggest.push(t(()=>suggestions())[0]);
      o.renderMerge.push(t(()=>renderMerge())[0]);
      o.render.push(t(()=>render())[0]);
      o.clone.push(t(()=>structuredClone(state))[0]);o.valid.push(t(()=>valid(state))[0]);o.stringify.push(t(()=>JSON.stringify(state))[0]);
    }
    o.suggestCount=suggestions().length;
    // Wareneingang über die Bedienoberfläche (Klick auf "Buchung prüfen und bestätigen")
    const occ=new Map();for(const b of state.boxes)if(b.qty>0)occ.set(b.place,(occ.get(b.place)||0)+1);
    const bx=state.boxes.find(b=>!b.blocked&&b.qty>0&&occ.get(b.place)===1);
    for(let i=0;i<REPS;i++){
      $('bookAction').value='in';$('bookArticle').value=bx.code;$('bookPlace').value=bx.place;$('bookQty').value='1';$('bookNote').value='';
      const before=state.boxes.find(b=>b.id===bx.id).qty;
      const [d]=t(()=>$('bookSubmit').click());
      o.book.push(d);o.bookOk=(state.boxes.find(b=>b.id===bx.id).qty===before+1);
    }
    // Umlagerung über "Zusammenführen" mit dem ersten Vorschlag (Klick auf Bestätigen)
    o.transferOk=true;
    for(let i=0;i<Math.min(REPS,2);i++){
      const oc=new Map();for(const x of state.boxes)if(x.qty>0)oc.set(x.place,(oc.get(x.place)||0)+1);
      const sg=suggestions().find(x=>oc.get(x.src.place)===1&&oc.get(x.dst.place)===1);if(!sg){o.transferOk=null;break}
      $('mergeFrom').value=sg.src.place;$('mergeTo').value=sg.dst.place;$('mergeArticle').value=sg.a.code;$('mergeQty').value=String(sg.src.qty);
      const dstBefore=state.boxes.find(b=>b.id===sg.dst.id).qty;
      const [d]=t(()=>$('mergeConfirm').click());o.transfer.push(d);
      const dst=state.boxes.find(b=>b.id===sg.dst.id);if(!dst||dst.qty!==dstBefore+sg.src.qty)o.transferOk=false;
    }
    return o;
  },[REPS,!!process.env.SKIP_BASE]);
  const row={scenario,n,boxes:r.boxes,reps:REPS,suggestMs:med(r.suggest),renderMergeMs:med(r.renderMerge),renderMs:med(r.render),bookMs:med(r.book),transferMs:r.transfer.length?med(r.transfer):null,cloneMs:med(r.clone),validMs:med(r.valid),stringifyMs:med(r.stringify),suggestCount:r.suggestCount,bookOk:r.bookOk,transferOk:r.transferOk,jsErrors:errs.length};
  for(const k of Object.keys(row))if(typeof row[k]==='number'&&k.endsWith('Ms'))row[k]=Math.round(row[k]*10)/10;
  console.log(JSON.stringify(row));results.push(row);await ctx.close();
}
await browser.close();
if(OUT)fs.writeFileSync(OUT,JSON.stringify({url:URL,date:new Date().toISOString(),results},null,1));
})().catch(e=>{console.error('FEHLER',e);process.exit(1)});
