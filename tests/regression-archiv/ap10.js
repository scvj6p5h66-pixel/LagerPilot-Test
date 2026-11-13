const {open}=require('./lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,230):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,300),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const ITEMS=[{code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3},{code:'P1',name:'Pack',barcode:'',unit:'P',pack:12,weight:2.5,max:100,min:null}];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'A1',qty:30,blocked:0},{id:'b3',place:'H4A-2-1',code:'P1',qty:2,blocked:0}];
async function mk(cfg=FULL,boxes=BOX){const h=await open();await h.p.evaluate(([cfg,it,bx])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...it);s.boxes.push(...bx)})},[cfg,ITEMS,boxes]);return h}
async function count(h,place,art,qty,{confirm=true,commit=true}={}){await h.go('inventory');await h.p.evaluate(c=>{window.confirm=m=>{window.__dlg.push('confirm:'+m);return c}},confirm);
 await h.dlg();await setf(h.p,'invPlace',place);await setf(h.p,'invArticle',art);await setf(h.p,'invQty',String(qty));await h.p.evaluate(()=>invCompare.click());
 const cmp=await txt(h.p,'invResult');const btn=await h.p.evaluate(()=>({t:invCommit.textContent,hidden:invCommit.classList.contains('hidden')}));
 let dlg=[],res='';if(commit&&!btn.hidden){await h.p.evaluate(()=>invCommit.click());dlg=await h.dlg();res=await txt(h.p,'invResult')}
 return {cmp,btn,dlg,res}}
const logs=async h=>(await snap(h)).st.inventoryLogs, hist=async h=>(await snap(h)).st.history;
(async()=>{
// 1–3 Differenz 0
let h=await mk();let b=await snap(h);let t0=Date.now();
let r=await count(h,'H4A-1-1','A1',50);let a=await snap(h);
R('1 Vergleich zeigt Differenz 0, Button "Zählung ohne Differenz protokollieren" sichtbar',/Differenz: 0 Stück/.test(r.cmp)&&!r.btn.hidden&&/ohne Differenz protokollieren/.test(r.btn.t),r.cmp+' | '+r.btn.t);
R('1 Bestätigungsdialog benennt Protokollierung (nicht "Differenz buchen")',r.dlg.some(d=>/ohne Differenz/.test(d)),r.dlg.join('|'));
R('1 Erfolgsmeldung',/ohne Differenz protokolliert/.test(r.res),r.res);
R('1 Genau ein neuer Inventurprotokolleintrag',a.st.inventoryLogs.length===b.st.inventoryLogs.length+1);
const e=a.st.inventoryLogs[0];
R('3 Eintrag: Platz/Artikel/before/count korrekt',e.place==='H4A-1-1'&&e.code==='A1'&&e.before===50&&e.count===50,JSON.stringify(e));
R('3 Datum ISO und aktuell',/^\d{4}-\d\d-\d\dT/.test(e.at)&&Math.abs(Date.parse(e.at)-t0)<60000,e.at);
R('1 Historieneintrag "Blindinventur · A1 · H4A-1-1 · 50 → 50"',a.st.history[0].text==='Blindinventur · A1 · H4A-1-1 · 50 → 50'&&a.st.history.length===b.st.history.length+1,a.st.history[0].text);
R('2 Bestand/Boxen byteweise unverändert (inkl. Box-ID)',JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes));
R('2 Konfiguration/Artikel/Plätze unverändert',JSON.stringify([a.st.items,a.st.config,a.st.qrMap,a.st.places])===JSON.stringify([b.st.items,b.st.config,b.st.qrMap,b.st.places]));
R('3 Anzeige im Inventurprotokoll (UI)',/A1 · H4A-1-1 · 50 → 50/.test(await h.p.evaluate(()=>invHistory.innerText)));
R('JS 1–3',h.errs.length===0,h.errs.join('|'));
// Vergleichstext
R('Info Vergleichstext enthält weiter "Keine Buchung nötig." obwohl protokolliert wird',true,/Keine Buchung nötig/.test(r.cmp));
// Packartikel
b=await snap(h);r=await count(h,'H4A-2-1','P1',24);a=await snap(h);
R('3 Packartikel: 24 Stück = 2 Pack, Differenz 0 protokolliert (Einheit Pack)',!r.btn.hidden&&a.st.inventoryLogs[0].before===2&&a.st.inventoryLogs[0].count===2&&JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes),JSON.stringify(a.st.inventoryLogs[0]));
// 4 positive/negative
b=await snap(h);r=await count(h,'H4A-1-1','A1',55);a=await snap(h);
R('4 Positive Differenz +5: Bestand 55, Eintrag before 50 count 55, Button "Differenz buchen"',a.st.boxes.find(x=>x.id==='b1').qty===55&&a.st.inventoryLogs[0].before===50&&a.st.inventoryLogs[0].count===55&&/Differenz buchen/.test(r.btn.t)&&/Inventurdifferenz gespeichert/.test(r.res),r.res);
r=await count(h,'H4A-1-1','A1',40);a=await snap(h);
R('4 Negative Differenz −15: Bestand 40',a.st.boxes.find(x=>x.id==='b1').qty===40&&a.st.inventoryLogs[0].before===55&&a.st.inventoryLogs[0].count===40);
b=await snap(h);r=await count(h,'H4A-1-1','A1',101);a=await snap(h);
R('4 Zählung über Max abgelehnt, Speicher unverändert',a.raw===b.raw&&/Boxkapazität/.test(r.res),r.res);
r=await count(h,'H4A-1-1','A1',100);a=await snap(h);R('4 Zählung 100 (Max, 100×2+25 ok) gebucht',a.st.boxes.find(x=>x.id==='b1').qty===100);
b=await snap(h);r=await count(h,'H4A-1-1','A1',-1);R('4 Negative Zählung abgelehnt',a.raw===(await snap(h)).raw&&/Gültige Stückzahl/.test(r.cmp),r.cmp);
r=await count(h,'H4A-1-1','A1','');R('4 Leere Zählung abgelehnt',/Gültige Stückzahl/.test(r.cmp));
r=await count(h,'H4A-1-1','A1',1.5);R('4 Dezimalzählung abgelehnt',/Gültige Stückzahl/.test(r.cmp));
r=await count(h,'H4A-2-1','P1',13);R('4 Packartikel Nicht-Vielfaches abgelehnt',/Gültige Stückzahl/.test(r.cmp));
// 5 Menge 0
b=await snap(h);r=await count(h,'H4A-1-2','A1',0);a=await snap(h);
R('5 Zählung 0 bei Bestand 30: Box entfernt, Eintrag before 30 count 0',!a.st.boxes.some(x=>x.id==='b2')&&a.st.inventoryLogs[0].before===30&&a.st.inventoryLogs[0].count===0&&a.st.boxes.length===b.st.boxes.length-1,JSON.stringify(a.st.inventoryLogs[0]));
b=await snap(h);r=await count(h,'H4A-1-2','A1',0);a=await snap(h);
R('5 Zählung 0 bei Bestand 0 (leerer Platz): Verhalten',true,'Button='+r.btn.t+' hidden='+r.btn.hidden+' Logs +'+(a.st.inventoryLogs.length-b.st.inventoryLogs.length)+' Boxen gleich='+(JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes))+' | '+r.res);
R('5 Zählung 0/0 verändert keine Boxen und erzeugt keine Box mit Menge 0',JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes)&&!a.st.boxes.some(x=>x.qty===0));
// Platz leer, Zählung >0 neu
r=await count(h,'H4A-5-5','A1',10);a=await snap(h);R('4/5 Leerer Platz + Zählung 10: Box neu, Eintrag before 0',a.st.boxes.some(x=>x.place==='H4A-5-5'&&x.qty===10)&&a.st.inventoryLogs[0].before===0);
R('JS 4–5',h.errs.length===0,h.errs.join('|'));
// 6 Abbruch
b=await snap(h);r=await count(h,'H4A-1-1','A1',100,{confirm:false});a=await snap(h);
R('6 Abbruch (Differenz 0): Speicher byteweise unverändert, kein Log, keine Historie',a.raw===b.raw&&r.dlg.length>0,r.dlg.join('|'));
R('6 Abbruch: In-Memory-Zustand gleich',(await h.ev(()=>JSON.stringify(state.boxes)))===JSON.stringify(b.st.boxes));
await h.p.evaluate(()=>{window.confirm=m=>true});await h.p.evaluate(()=>invCommit.click());await h.dlg();a=await snap(h);
R('6 Nach Abbruch erneutes Bestätigen: genau ein Eintrag',a.st.inventoryLogs.length===b.st.inventoryLogs.length+1&&a.st.inventoryLogs[0].count===100&&a.st.inventoryLogs[0].before===100);
b=await snap(h);await count(h,'H4A-1-1','A1',60,{confirm:false});a=await snap(h);
R('6 Abbruch bei Differenz: unverändert',a.raw===b.raw);
// 7 Doppelte Einträge
b=await snap(h);await h.go('inventory');await h.p.evaluate(()=>{window.confirm=()=>true});
for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'100'}))await setf(h.p,k,x);await h.p.evaluate(()=>invCompare.click());
await h.p.evaluate(()=>{invCommit.click();invCommit.click();invCommit.click()});await h.dlg();a=await snap(h);
R('7 Dreifachklick auf Bestätigen: genau 1 Eintrag, 1 Historie',a.st.inventoryLogs.length===b.st.inventoryLogs.length+1&&a.st.history.length===b.st.history.length+1,'logs +'+(a.st.inventoryLogs.length-b.st.inventoryLogs.length));
R('7 Meldung nach Mehrfachklick ist Erfolg (nicht überschrieben durch Fehler) (Info)',true,await txt(h.p,'invResult'));
b=await snap(h);await h.p.evaluate(()=>invCommit.click());a=await snap(h);R('7 Bestätigen ohne Vergleich (Button versteckt, per Skript): kein Eintrag',a.raw===b.raw);
b=await snap(h);for(let i=0;i<3;i++){await h.p.evaluate(()=>invCompare.click())}await h.p.evaluate(()=>invCommit.click());await h.dlg();a=await snap(h);
R('7 Dreimal Vergleichen, einmal Bestätigen: 1 Eintrag',a.st.inventoryLogs.length===b.st.inventoryLogs.length+1);
b=await snap(h);await h.p.reload();await h.p.waitForTimeout(500);a=await snap(h);R('7 Neu laden erzeugt keine Einträge',a.raw===b.raw);
// Zwei Tabs: Daten geändert
{const h2=await mk();const p2=await h2.p.context().newPage();await p2.addInitScript(()=>{window.confirm=()=>true;window.alert=()=>{}});await p2.goto('http://localhost:8123/index.html');await p2.waitForTimeout(500);
 await h2.go('inventory');for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'50'}))await setf(h2.p,k,x);await h2.p.evaluate(()=>invCompare.click());
 await p2.evaluate(()=>{transaction(s=>{history(s,'Tab B')})});const before=(await snap(h2)).st.inventoryLogs.length;
 await h2.p.evaluate(()=>{window.confirm=()=>true;invCommit.click()});const m=await txt(h2.p,'invResult');
 R('7 Veraltete Zählung nach Änderung in anderem Tab: kein Eintrag, Meldung',(await snap(h2)).st.inventoryLogs.length===before&&/erneut zählen|anderen Tab/.test(m),m);await h2.b.close()}
// 8-Info: Differenz 0 trotz Last-/Konfigurationsproblemen
for(const [n,cfg,boxes] of [['Lastdaten fehlen (tare null)',{...FULL,tare:null},BOX],['Fachlast alle null',{shelf:null,bay:null,palletMax:null,tare:null},BOX],['Altbox überlastet (50×2+25=125 > Fachlast 100)',{...FULL,shelf:100},BOX]]){
 const hh=await mk(cfg,boxes);const bb=await snap(hh);const rr=await count(hh,'H4A-1-1','A1',50);const aa=await snap(hh);
 const ok=aa.st.inventoryLogs.length===bb.st.inventoryLogs.length+1;
 R('8a Differenz 0 bei '+n+': protokollierbar',ok,'Log +'+(aa.st.inventoryLogs.length-bb.st.inventoryLogs.length)+' | '+(rr.res||rr.cmp));await hh.b.close()}
// QS-gesperrt / Mehrfachboxen
{const hh=await mk(FULL,[...BOX.slice(0,1),{id:'q',place:'H4A-3-3',code:'A1',qty:5,blocked:5,qsReason:'x'}]);const bb=await snap(hh);const rr=await count(hh,'H4A-3-3','A1',5);
 R('8 QS-gesperrte Box: Zählung weiter gesperrt ("manuelle Klärung"), nichts gespeichert',/gesperrte Boxen/.test(rr.cmp)&&(await snap(hh)).raw===bb.raw,rr.cmp);await hh.b.close()}
// Protokoll-Obergrenze bei Differenz 0
{const hh=await mk();await hh.p.evaluate(()=>{transaction(s=>{s.inventoryLogs=Array.from({length:10000},(_,i)=>({at:'2026-01-01T00:00:00.000Z',place:'H4A-9-9',code:'A1',before:i,count:i}))})});
 const rr=await count(hh,'H4A-1-1','A1',50);const aa=await snap(hh);R('8 Bei 10.000 Protokollen: Diff-0-Eintrag möglich, Länge bleibt 10.000, neuester vorn',aa.st.inventoryLogs.length===10000&&aa.st.inventoryLogs[0].place==='H4A-1-1',rr.res);await hh.b.close()}
// Folgefunktionen
{const hh=await mk();await count(hh,'H4A-1-1','A1',50);
 await hh.go('book');const book=async o=>{await setf(hh.p,'bookArticle','A1');for(const [k,x] of Object.entries(o))await setf(hh.p,k,x);await hh.p.evaluate(()=>bookSubmit.click());await hh.dlg();return txt(hh.p,'bookMessage')};
 R('8 Wareneingang nach Diff-0-Inventur',/gespeichert/.test(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'5'})));
 R('8 Ausbuchen',/gespeichert/.test(await book({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'5'})));
 R('8 Umlagern',/gespeichert/.test(await book({bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-1',bookQty:'5'})));
 const ex=await hh.p.evaluate(()=>{try{return valid(JSON.parse(JSON.stringify(state)))}catch(e){return e.message}});R('8 Export-Zustand nach Diff-0-Protokoll valide',ex===true,ex);
 R('JS Rest',hh.errs.length===0,hh.errs.join('|'));await hh.b.close()}
await h.b.close();
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
