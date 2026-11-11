// Äquivalenz- und Regressionstest für SA-14.
// Prüft, dass die optimierte suggestions() exakt dieselben Ergebnisse liefert wie die bisherige Implementierung
// (tests/legacy/suggestions_legacy.js, Referenz aus Commit 8fde636), und dass reine Anzeigeoperationen den Bestand nicht ändern.
// Aufruf: node tests/unit/suggestions-equivalence.js [URL zur index.html]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const {build,mulberry32}=require('../perf/dataset');
const URL=process.argv[2]||'http://localhost:8123/index.html';
const KEY='lagerpilot_v2_7';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,300):''))};
const LEGACY=fs.readFileSync(path.join(__dirname,'../legacy/suggestions_legacy.js'),'utf8');
const LEGACY_OCC=fs.readFileSync(path.join(__dirname,'../legacy/home_occupancy_legacy.js'),'utf8');
(async()=>{
const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.setDefaultTimeout(0);
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(URL);await p.waitForTimeout(300);await p.addScriptTag({content:LEGACY});await p.addScriptTag({content:LEGACY_OCC});
const places=await p.evaluate(()=>Object.keys(state.places));
// Vergleich beider Implementierungen auf einem übergebenen Zustand (ohne zu speichern)
const cmp=(st)=>p.evaluate(s=>{const keep=state;state=s;try{
  const before=JSON.stringify(s);const n=suggestions(),o=suggestionsLegacy();
  const key=l=>l.map(x=>[x.a.code,x.src.id,x.dst.id].join('>'));
  const refs=n.every(x=>s.items.includes(x.a)&&s.boxes.includes(x.src)&&s.boxes.includes(x.dst));
  return {same:JSON.stringify(key(n))===JSON.stringify(key(o)),nNew:n.length,nOld:o.length,keyNew:key(n).slice(0,5),keyOld:key(o).slice(0,5),refs,unchanged:JSON.stringify(s)===before};
 }finally{state=keep}},st);
const base=async()=>p.evaluate(()=>structuredClone(state));
const it=(code,max,extra={})=>({code,name:'N '+code,barcode:'',unit:'STK',pack:1,weight:1,max,min:null,...extra});
const bx=(id,place,code,qty,extra={})=>({id,place,code,qty,blocked:0,...extra});
const T=async(id,mut,expect)=>{const s=await base();mut(s,places);const r=await cmp(s);R(id+' (alt = neu)',r.same&&r.refs&&r.unchanged,r.same?'Treffer: '+r.nNew:'ALT '+r.keyOld.join(',')+' | NEU '+r.keyNew.join(','));if(expect){const e=expect(r);R(id+' Erwartung fachlich',e,'Treffer neu='+r.nNew)}return r};
const P=(h,r,n)=>h+'-'+r+'-'+n;
// 1 Leere Bestände
await T('Leerer Zustand',s=>{s.items=[];s.boxes=[]},r=>r.nNew===0);
await T('Artikel ohne Boxen',s=>{s.items=[it('A',100)];s.boxes=[]},r=>r.nNew===0);
await T('Boxen ohne Maximalmenge (max=null)',s=>{s.items=[it('A',null)];s.boxes=[bx('1',P('H4A',1,1),'A',5),bx('2',P('H4A',1,2),'A',6)]},r=>r.nNew===0);
await T('Einzelne Box',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',5)]},r=>r.nNew===0);
// 2 Zulässige Zusammenführungen
await T('Zulässig: zwei Boxen 10+20<=100',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'A',20)]},r=>r.nNew===1);
await T('Grenze: Summe == Max (50+50)',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',50),bx('2',P('H4A',1,2),'A',50)]},r=>r.nNew===2);
await T('Grenze: Summe == Max+1 unzulässig',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',51),bx('2',P('H4A',1,2),'A',50)]},r=>r.nNew===0);
await T('Gleiche Mengen (dst.qty == src.qty zulässig)',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',30),bx('2',P('H4A',1,2),'A',30)]},r=>r.nNew===2);
await T('Kleinere Zielmenge ausgeschlossen (nur größere/gleiche Ziele)',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',40),bx('2',P('H4A',1,2),'A',10)]},r=>r.nNew===1);
// 3 Unzulässige
await T('Alle Boxen über Max/2: keine Vorschläge',s=>{s.items=[it('A',100)];s.boxes=[1,2,3,4].map(i=>bx(''+i,P('H4A',1,i),'A',60))},r=>r.nNew===0);
await T('Gesperrte Boxen ausgeschlossen (blocked)',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',10,{blocked:10}),bx('2',P('H4A',1,2),'A',20)]},r=>r.nNew===0);
await T('Teilweise gesperrt (blocked>0) ausgeschlossen',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',10,{blocked:1}),bx('2',P('H4A',1,2),'A',20)]},r=>r.nNew===0);
await T('Menge 0 ausgeschlossen',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',0),bx('2',P('H4A',1,2),'A',20)]},r=>r.nNew===0);
for(const st of ['locked','reserved','fixed'])await T('Platzstatus '+st+' ausgeschlossen',(s,pl)=>{s.items=[it('A',100)];s.places[P('H4A',1,1)].status=st;s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'A',20)]},r=>r.nNew===0);
// 4 Unterschiedliche Artikel
await T('Unterschiedliche Artikel werden nie vermischt',s=>{s.items=[it('A',100),it('B',100)];s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'B',20)]},r=>r.nNew===0);
await T('Zwei Artikel, jeweils zusammenführbar, verschachtelt',s=>{s.items=[it('A',100),it('B',50)];s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'B',20),bx('3',P('H4A',1,3),'A',30),bx('4',P('H4A',1,4),'B',5)]},r=>r.nNew>=2);
await T('Unterschiedliche Maximalmengen je Artikel',s=>{s.items=[it('A',30),it('B',1000)];s.boxes=[bx('1',P('H4A',1,1),'A',20),bx('2',P('H4A',1,2),'A',20),bx('3',P('H4A',1,3),'B',20),bx('4',P('H4A',1,4),'B',20)]},r=>r.nNew===2);
// 5 Zielwahl / Gleichstände
await T('Zielwahl: gleiche Halle vor anderer Halle',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',5,1),'A',10),bx('2',P('H4B',5,2),'A',20),bx('3',P('H4A',9,3),'A',20)]});
await T('Zielwahl: kleinster Regalabstand',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',10,1),'A',10),bx('2',P('H4A',3,2),'A',20),bx('3',P('H4A',11,3),'A',20),bx('4',P('H4A',20,4),'A',20)]});
await T('Zielwahl: bei gleichem Abstand größere Menge',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',10,1),'A',10),bx('2',P('H4A',9,2),'A',20),bx('3',P('H4A',11,3),'A',40)]});
await T('Gleichstand komplett: erste Box in Reihenfolge gewinnt',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',10,1),'A',10),bx('2',P('H4A',9,2),'A',20),bx('3',P('H4A',11,3),'A',20),bx('4',P('H4A',9,4),'A',20)]});
await T('Gleichstand Reihenfolge umgekehrt',s=>{s.items=[it('A',100)];s.boxes=[bx('4',P('H4A',9,4),'A',20),bx('3',P('H4A',11,3),'A',20),bx('2',P('H4A',9,2),'A',20),bx('1',P('H4A',10,1),'A',10)]});
await T('Gleiche Menge bei allen: Reihenfolge der Quellen stabil',s=>{s.items=[it('A',100)];s.boxes=[1,2,3,4,5,6].map(i=>bx(''+i,P('H4A',i,i),'A',25))},r=>r.nNew===6);
// 6 Mehr als 30 Treffer, Sortierung
await T('Mehr als 30 mögliche Vorschläge: nur 30, sortiert nach Quellmenge',(s,pl)=>{s.items=[it('A',1000)];s.boxes=pl.slice(0,200).map((x,i)=>bx('b'+i,x,'A',1+(i*7)%90))},r=>r.nNew===30);
await T('Mehrere Artikel, Gleichstand der Quellmenge: Artikelreihenfolge entscheidet',(s,pl)=>{s.items=[it('B',100),it('A',100),it('C',100)];s.boxes=[];for(const c of ['A','B','C'])for(let k=0;k<3;k++)s.boxes.push(bx(c+k,pl[s.boxes.length],c,10+k*2))},r=>r.nNew>=3);
// 7 Altdaten und ungewöhnliche Werte (teilweise außerhalb dessen, was valid() zulässt; das Verhalten muss trotzdem gleich bleiben)
await T('Altdaten: max undefined',s=>{s.items=[{...it('A',100),max:undefined}];s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'A',20)]},r=>r.nNew===0);
await T('Altdaten: max als Text',s=>{s.items=[{...it('A',100),max:'100'}];s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'A',20)]});
await T('Altdaten: doppelte Box-IDs',s=>{s.items=[it('A',100)];s.boxes=[bx('x',P('H4A',1,1),'A',10),bx('x',P('H4A',1,2),'A',20),bx('y',P('H4A',1,3),'A',20)]});
await T('Altdaten: Nachkommamengen',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',10.5),bx('2',P('H4A',1,2),'A',20.25),bx('3',P('H4A',1,3),'A',89.5)]});
await T('Altdaten: Plätze ohne Regalnummer (NaN-Fall)',s=>{s.items=[it('A',100)];s.places['ALT']={status:'free'};s.places['ALT2-x']={status:'free'};s.boxes=[bx('1','ALT','A',10),bx('2','ALT2-x','A',20),bx('3',P('H4A',1,1),'A',20)]});
await T('Altdaten: Artikel doppelt in Artikelliste',s=>{s.items=[it('A',100),it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'A',10),bx('2',P('H4A',1,2),'A',20)]});
await T('Altdaten: Boxen mit unbekanntem Artikel',s=>{s.items=[it('A',100)];s.boxes=[bx('1',P('H4A',1,1),'ZZ',10),bx('2',P('H4A',1,2),'ZZ',20)]},r=>r.nNew===0);
await T('Altdaten: Box an nicht vorhandenem Platz (status undefined)',s=>{s.items=[it('A',100)];s.boxes=[bx('1','H9X-9-9','A',10),bx('2',P('H4A',1,2),'A',20)]});
await T('Altdaten: Max 1',s=>{s.items=[it('A',1)];s.boxes=[bx('1',P('H4A',1,1),'A',1),bx('2',P('H4A',1,2),'A',1)]},r=>r.nNew===0);
await T('Sehr große Mengen',s=>{s.items=[it('A',Number.MAX_SAFE_INTEGER)];s.boxes=[bx('1',P('H4A',1,1),'A',4e15),bx('2',P('H4A',1,2),'A',5e15)]});
// 8 Zufällige Daten (viele Seeds, gemischte Halle/Regal/Menge/Status/Sperren)
let randOk=true,randInfo='',cases=0;
for(let seed=1;seed<=300;seed++){
  const rnd=mulberry32(seed*7919);const s=await base();const A=1+Math.floor(rnd()*6),N=Math.floor(rnd()*160);
  s.items=[];for(let i=0;i<A;i++)s.items.push(it('R'+i,rnd()<0.1?null:1+Math.floor(rnd()*120)));
  s.boxes=[];const used=new Set();
  for(let i=0;i<N;i++){const pl=places[Math.floor(rnd()*places.length)],code='R'+Math.floor(rnd()*A),k=pl+code;if(used.has(k))continue;used.add(k);
    s.boxes.push(bx('r'+i,pl,code,Math.floor(rnd()*80),{blocked:rnd()<0.1?1:0}));}
  for(const b of s.boxes)if(b.blocked&&b.qty<1)b.blocked=0;
  for(const pl of places.slice(0,0));
  for(let i=0;i<6;i++){const pl=places[Math.floor(rnd()*places.length)];s.places[pl].status=['locked','reserved','fixed'][Math.floor(rnd()*3)]}
  const r=await cmp(s);cases++;if(!(r.same&&r.refs&&r.unchanged)){randOk=false;randInfo='Seed '+seed+': ALT '+r.keyOld.join(',')+' NEU '+r.keyNew.join(',');break}
}
R('300 Zufallsdatensätze: Ergebnis identisch zur bisherigen Implementierung',randOk,randOk?cases+' Fälle':randInfo);
// 9 Große Datenbestände mit den Leistungsdatensätzen
for(const [n,sc] of [[500,'worst'],[2000,'worst'],[2000,'multi'],[6480,'worst'],[6480,'multi'],[6480,'many'],[10000,'worst'],[10000,'many']]){
  const d=build(n,sc,places);const s=await base();s.items=d.items;s.boxes=d.boxes;const t0=Date.now();const r=await cmp(s);
  R('Großer Bestand '+n+' Boxen ('+sc+'): identisch zur bisherigen Implementierung',r.same&&r.refs&&r.unchanged,r.same?'Treffer '+r.nNew+' (inkl. Referenzlauf '+Math.round((Date.now()-t0)/1000)+' s)':'ALT '+r.keyOld.join(',')+' NEU '+r.keyNew.join(','));
}
// 9b Belegungsanzeige (Startseite): Zählung identisch zur bisherigen Implementierung
{const occ=(st)=>p.evaluate(s=>{const keep=state;state=s;try{const a=homeOccupancyCounts(),b=homeOccupancyCountsLegacy();return {same:JSON.stringify(a)===JSON.stringify(b),a,b,unchanged:true}}finally{state=keep}},st);
 let ok=true,info='',cnt=0;
 for(let seed=1;seed<=200&&ok;seed++){const rnd=mulberry32(seed*104729);const s=await base();const A=1+Math.floor(rnd()*5);s.items=[];for(let i=0;i<A;i++)s.items.push(it('O'+i,100));
  s.boxes=[];const used=new Set();const N=Math.floor(rnd()*700);
  for(let i=0;i<N;i++){const pl=places[Math.floor(rnd()*places.length)],code='O'+Math.floor(rnd()*A),k=pl+code;if(used.has(k))continue;used.add(k);const q=Math.floor(rnd()*30);s.boxes.push(bx('o'+i,pl,code,q,{blocked:q>0&&rnd()<0.15?1+Math.floor(rnd()*q):0}));}
  for(let i=0;i<40;i++){const pl=places[Math.floor(rnd()*places.length)];s.places[pl].status=['free','locked','reserved','fixed'][Math.floor(rnd()*4)]}
  const r=await occ(s);cnt++;if(!r.same){ok=false;info='Seed '+seed+' neu '+JSON.stringify(r.a)+' alt '+JSON.stringify(r.b)}}
 R('Belegungszählung Startseite: 200 Zufallsdatensätze identisch zur bisherigen Implementierung',ok,ok?cnt+' Fälle':info);
 for(const [n,sc] of [[0,'worst'],[500,'worst'],[6480,'worst'],[10000,'many']]){const s=await base();if(n>0){const d=build(n,sc,places);s.items=d.items;s.boxes=d.boxes}else{s.boxes=[]}const r=await occ(s);R('Belegungszählung '+n+' Boxen ('+sc+') identisch',r.same,JSON.stringify(r.a))}
 const s2=await base();s2.items=[it('E',100)];s2.boxes=[bx('1',P('H4A',1,1),'E',0),bx('2',P('H4A',1,2),'E',5,{blocked:5}),bx('3',P('H4A',1,3),'E',5)];
 const r2=await occ(s2);R('Belegungszählung: Box mit Menge 0 zählt nicht als belegt, gesperrte Box zählt als gesperrt',r2.same&&r2.a.locked>=1&&r2.a.occupied>=1,JSON.stringify(r2.a));
}
// 10 Reine Anzeigeoperationen ändern den Bestand nicht
{const d=build(500,'multi',places);await p.evaluate(([k,d])=>{const s=structuredClone(state);s.items=d.items;s.boxes=d.boxes;s.config={shelf:100000,bay:100000,palletMax:100000,tare:25};localStorage.setItem(k,JSON.stringify(s))},[KEY,d]);await p.reload();await p.waitForTimeout(300);
 const before=await p.evaluate(k=>localStorage.getItem(k),KEY);const stBefore=await p.evaluate(()=>JSON.stringify(state));
 await p.evaluate(()=>{for(const t of ['home','stock','scan','merge','book','racks','articles','inventory','more','merge'])tab(t);renderMerge();render();$('mergeRefresh').click();suggestions();});
 const after=await p.evaluate(k=>localStorage.getItem(k),KEY);const stAfter=await p.evaluate(()=>JSON.stringify(state));
 R('Anzeigeoperationen (Tabwechsel, render, renderMerge, Aktualisieren): gespeicherte Daten unverändert',before===after);
 R('Anzeigeoperationen: Arbeitszustand unverändert',stBefore===stAfter);
}
// 11 Zusammenführ-Tab: Liste ist nie veraltet (verzögertes Rendern)
{const d=build(300,'worst',places);await p.evaluate(([k,d])=>{const s=structuredClone(state);s.items=d.items;s.boxes=d.boxes;s.config={shelf:100000,bay:100000,palletMax:100000,tare:25};localStorage.setItem(k,JSON.stringify(s))},[KEY,d]);await p.reload();await p.waitForTimeout(300);
 const listText=()=>p.evaluate(()=>document.getElementById('mergeList').textContent);
 const fresh=()=>p.evaluate(()=>{const arr=suggestions();return arr.map(x=>x.src.place+': '+x.src.qty+' '+x.a.unit+' → '+x.dst.place+': '+x.dst.qty+' '+x.a.unit).join('|')});
 const norm=t=>t.replace(/Vorschlag übernehmen/g,'|').replace(/\s+/g,' ');
 // a) Tab nicht aktiv: Buchung ändert Bestand, danach Tab öffnen => frische Liste
 await p.evaluate(()=>tab('book'));
 await p.evaluate(()=>{const sg=suggestions()[0];$('bookAction').value='out';$('bookArticle').value=sg.a.code;$('bookPlace').value=sg.src.place;$('bookQty').value=String(sg.src.qty);$('bookSubmit').click()});
 await p.evaluate(()=>tab('merge'));const l1=await listText(),f1=await fresh();
 R('Merge-Tab nach Buchung in anderem Tab: Liste entspricht aktuellem Bestand',f1.split('|').every(x=>l1.replace(/\s+/g,' ').includes(x.replace(/\s+/g,' '))),f1.split('|')[0]);
 // b) Tab aktiv: Buchung (Umlagerung über Merge) aktualisiert Liste sofort
 const msgBefore=await listText();
 await p.evaluate(()=>{const sg=suggestions()[0];$('mergeFrom').value=sg.src.place;$('mergeTo').value=sg.dst.place;$('mergeArticle').value=sg.a.code;$('mergeQty').value=String(sg.src.qty);$('mergeConfirm').click()});
 const l2=await listText(),f2=await fresh();
 R('Merge-Tab aktiv: Liste nach Umlagerung sofort aktuell',f2.split('|').every(x=>l2.replace(/\s+/g,' ').includes(x.replace(/\s+/g,' ')))&&l2!==msgBefore,f2.split('|')[0]);
 // c) Vorschlag übernehmen füllt korrekte Felder
 const ok=await p.evaluate(()=>{const b=document.querySelector('[data-suggestion="0"]');if(!b)return null;const x=window.currentSuggestions[0];b.click();return $('mergeFrom').value===x.src.place&&$('mergeTo').value===x.dst.place&&$('mergeArticle').value===x.a.code&&$('mergeQty').value===String(x.src.qty)});
 R('"Vorschlag übernehmen" füllt Quelle/Ziel/Artikel/Menge korrekt',ok===true,String(ok));
 // d) Bestandssumme bleibt bei Umlagerung erhalten
 const sums=await p.evaluate(()=>{const o={};for(const b of state.boxes)o[b.code]=(o[b.code]||0)+b.qty;return o});
 await p.evaluate(()=>{const sg=suggestions()[0];if(!sg)return;$('mergeFrom').value=sg.src.place;$('mergeTo').value=sg.dst.place;$('mergeArticle').value=sg.a.code;$('mergeQty').value=String(sg.src.qty);$('mergeConfirm').click()});
 const sums2=await p.evaluate(()=>{const o={};for(const b of state.boxes)o[b.code]=(o[b.code]||0)+b.qty;return o});
 R('Umlagerung: Gesamtbestand je Artikel bleibt erhalten',JSON.stringify(sums)===JSON.stringify(sums2));
 R('Zustand nach allen Aktionen gültig (valid) und Platzanzahl 6.480',await p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7')))&&Object.keys(state.places).length===6480));
}
R('Keine JavaScript-Fehler',errs.length===0,errs.slice(0,3).join('|'));
await browser.close();
const f=res.filter(r=>!r[1]).length;console.log('GESAMT '+res.length+' / FAIL '+f);process.exit(f?1:0);
})().catch(e=>{console.error('SCRIPTFEHLER',e);process.exit(2)});
