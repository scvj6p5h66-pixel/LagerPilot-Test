// SA-14 Abschlussprüfung: mobile Bedienung mit echten Touch-Taps, großer Bestand, gedrosselte CPU (Simulation eines langsameren Geräts)
const {chromium,devices}=require('playwright');
const {build}=require('../final/tests/perf/dataset');
const URL=process.argv[2]||'http://localhost:8123/index.html',THROTTLE=Number(process.argv[3]||4),N=Number(process.argv[4]||6480),SC=process.argv[5]||'multi';
const K='lagerpilot_v2_7';const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,240):''))};
(async()=>{const b=await chromium.launch();
for(const dev of ['iPhone 14','iPad Pro 11']){
 const T=dev+' (CPU '+THROTTLE+'x, '+N+' Boxen): ';
 const ctx=await b.newContext({...devices[dev]});const p=await ctx.newPage();p.setDefaultTimeout(120000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(URL);await p.waitForTimeout(400);
 const places=await p.evaluate(()=>Object.keys(state.places));const d=build(N,SC,places);
 await p.evaluate(([k,d])=>{const s=structuredClone(state);s.items=d.items;s.boxes=d.boxes;s.config={shelf:100000,bay:100000,palletMax:100000,tare:25};localStorage.setItem(k,JSON.stringify(s))},[K,d]);
 await p.reload();await p.waitForTimeout(500);
 const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:THROTTLE});
 const ov=()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 // exklusive Box (einziger Eintrag am Platz) für eine saubere Buchung
 const pick=await p.evaluate(()=>{const o=new Map();for(const b of state.boxes)if(b.qty>0)o.set(b.place,(o.get(b.place)||0)+1);const bx=state.boxes.find(b=>!b.blocked&&b.qty>0&&o.get(b.place)===1);return {id:bx.id,code:bx.code,place:bx.place,qty:bx.qty}});
 // 1 Wareneingang per Touch
 await p.locator("button[data-tab=\"book\"]").first().tap();await p.waitForTimeout(300);
 await p.selectOption('#bookAction','in');await p.selectOption('#bookArticle',pick.code);await p.locator('#bookPlace').fill(pick.place);await p.locator('#bookQty').fill('3');
 await p.locator('#bookSubmit').scrollIntoViewIfNeeded();
 const t0=Date.now();await p.locator('#bookSubmit').tap();
 await p.waitForFunction(id=>state.boxes.find(b=>b.id===id).qty>0&&/gebucht|erfolg|Wareneingang|✓/i.test(document.getElementById('bookMessage').textContent)||false,pick.id,{timeout:120000}).catch(()=>{});
 const tBook=Date.now()-t0;
 const q1=await p.evaluate(id=>state.boxes.find(b=>b.id===id).qty,pick.id);
 R(T+'Wareneingang per Tap: Menge +3 ('+pick.qty+'→'+q1+') in '+(tBook/1000).toFixed(2)+' s',q1===pick.qty+3,await p.evaluate(()=>document.getElementById('bookMessage').textContent.trim().slice(0,80)));
 R(T+'Buchung unter 3 s (Zielwert für Bedienbarkeit)',tBook<3000,(tBook/1000).toFixed(2)+' s');
 // 2 Zusammenführ-Tab per Touch
 const t1=Date.now();await p.locator("button[data-tab=\"merge\"]").first().tap();await p.waitForSelector('#mergeList [data-suggestion]',{timeout:120000}).catch(()=>{});const tMerge=Date.now()-t1;
 const cnt=await p.locator('#mergeList [data-suggestion]').count();
 R(T+'Zusammenführ-Tab zeigt Vorschläge ('+cnt+') nach '+(tMerge/1000).toFixed(2)+' s',cnt>0&&cnt<=30);
 R(T+'Öffnen des Tabs unter 3 s',tMerge<3000,(tMerge/1000).toFixed(2)+' s');
 // geeigneten Vorschlag (Quell- und Zielplatz exklusiv) wählen und per Tap übernehmen
 const idx=await p.evaluate(()=>{const o=new Map();for(const b of state.boxes)if(b.qty>0)o.set(b.place,(o.get(b.place)||0)+1);return window.currentSuggestions.findIndex(x=>o.get(x.src.place)===1&&o.get(x.dst.place)===1)});
 if(idx<0){R(T+'geeigneter Vorschlag vorhanden',false,'keiner der 30 Vorschläge hat exklusive Plätze')}else{
  const sg=await p.evaluate(i=>{const x=window.currentSuggestions[i];return {src:x.src.id,dst:x.dst.id,sq:x.src.qty,dq:x.dst.qty,code:x.a.code}},idx);
  const sb=p.locator(`#mergeList [data-suggestion="${idx}"]`);await sb.scrollIntoViewIfNeeded();await sb.tap();
  R(T+'"Vorschlag übernehmen" füllt Felder per Tap',await p.evaluate(i=>{const x=window.currentSuggestions[i];return mergeFrom.value===x.src.place&&mergeTo.value===x.dst.place&&mergeArticle.value===x.a.code&&mergeQty.value===String(x.src.qty)},idx));
  await p.locator('#mergeConfirm').scrollIntoViewIfNeeded();const t2=Date.now();await p.locator('#mergeConfirm').tap();
  await p.waitForFunction(([s,dq])=>{const d=state.boxes.find(b=>b.id===s.dst);return d&&d.qty===dq+s.sq&&!state.boxes.some(b=>b.id===s.src&&b.qty>0)},[sg,sg.dq],{timeout:120000}).catch(()=>{});const tMv=Date.now()-t2;
  const ok=await p.evaluate(s=>{const d=state.boxes.find(b=>b.id===s.dst);return !!d&&d.qty===s.dq+s.sq&&!state.boxes.some(b=>b.id===s.src&&b.qty>0)},sg);
  R(T+'Zusammenführen per Tap: Zielmenge '+sg.dq+'+'+sg.sq+', Quellbox leer, in '+(tMv/1000).toFixed(2)+' s',ok);
  R(T+'Umlagerung unter 3 s',tMv<3000,(tMv/1000).toFixed(2)+' s');
 }
 // 3 Gesamtbestand je Artikel konstant seit Beginn der Zusammenführung, Daten gültig
 R(T+'Zustand gültig (valid) und gespeichert',await p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7')))));
 R(T+'kein horizontaler Seitenüberlauf',await ov());
 for(const t of ['home','stock','scan','racks','articles','inventory','more']){await p.locator(`nav button[data-tab="${t}"], .tabs button[data-tab="${t}"]`).first().tap().catch(()=>{});}
 R(T+'Tabwechsel per Tap ohne JavaScript-Fehler',errs.length===0,errs.slice(0,2).join('|'));
 await ctx.close();
}
await b.close();const f=res.filter(r=>!r[1]).length;console.log('GESAMT '+res.length+' / FAIL '+f);
})().catch(e=>{console.log('SCRIPTFEHLER',e.message.slice(0,500))});
