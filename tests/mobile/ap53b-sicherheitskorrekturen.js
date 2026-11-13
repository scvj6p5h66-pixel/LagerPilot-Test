// AP5.3b – gezielte Tests S1–S4 (Dezimaleingaben, Löschschutz, Lastwarnung, mobile Artikelkarten).
// Aufruf: BASE=http://localhost:8123/index.html BASE0=http://localhost:8130/index.html node tests/mobile/ap53b-sicherheitskorrekturen.js
// BASE0 = unveränderter Ausgangsstand 1c01db1 (für den Desktop-Vergleich der Artikeltabelle).
const {chromium,devices}=require('playwright');const BASE=process.env.BASE||'http://localhost:8123/index.html',BASE0=process.env.BASE0;const PK='lagerpilot_pick_demo_v1',K='lagerpilot_v2_7';
let pass=0,fail=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,170):''))};
const LOCALES=['de-DE','de-CH','en-US','fr-FR'];
const order=()=>({id:'T1',lines:3,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:Array.from({length:3},(_,i)=>({sku:'ART-'+(i+1),name:'Artikel '+(i+1),place:'H4B-1-'+(i+1),qty:20,actual:20,unitWeight:1})),checkedLines:[],scannedLines:[0,1,2],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:40,tolerancePercent:1}});
// dlgMode: 'accept' | 'dismiss'
async function open(locale,mobile){const b=await chromium.launch();const ctx=await b.newContext(mobile?{...devices['iPhone 14'],locale}:{locale,viewport:{width:1000,height:900}});const p=await ctx.newPage();const st={errs:[],dlg:[],mode:'accept'};p.on('pageerror',e=>st.errs.push(e.message));p.on('dialog',d=>{st.dlg.push(d.type()+':'+d.message());st.mode==='accept'||d.type()==='alert'?d.accept():d.dismiss()});await p.goto(BASE);await p.waitForTimeout(300);
 const ps={people:[{name:'Max',device:'Scanner 1',active:true,lastSeen:Date.now()}],roster:['Max','Peter','Leon'],orders:[order()],session:'Max',testStatus:{Max:true}};
 await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,ps]);await p.reload();await p.waitForTimeout(300);await p.evaluate(()=>{const b=document.querySelector('#nav [data-area="picking"]');if(b)b.click();tab('picking')});await p.waitForTimeout(250);return {b,p,st}}
const pRaw=p=>p.evaluate(k=>localStorage.getItem(k),PK),po=async p=>JSON.parse(await pRaw(p)).orders[0];
const typeIn=async(p,sel,v)=>{await p.click(sel);await p.keyboard.press('Control+A');await p.keyboard.press('Delete');if(v!=='')await p.keyboard.type(v);await p.keyboard.press('Tab');await p.waitForTimeout(120)};
const fields=[['#pick-pallet-weight',o=>o.packaging.palletWeight,25,true],['#pick-box-weight',o=>o.packaging.boxWeight,1.5,true],['#pick-measured-weight',o=>o.packaging.measuredWeight,40,true],['#pick-tolerance',o=>o.packaging.tolerancePercent,1,true],['#pick-weight-0',o=>o.items[0].unitWeight,1,true],['#pick-actual-0',o=>o.items[0].actual,20,false]];
(async()=>{
// ---------- S1 + S2: Kommissionierung ----------
for(const loc of LOCALES)for(const mobile of [false,true]){const tag=loc+(mobile?' iPhone':'');const {b,p,st}=await open(loc,mobile);
 for(const [sel,get,start,dec] of fields){
  const kind=await p.evaluate(s=>{const e=document.querySelector(s);return e.type+'/'+e.inputMode},sel);
  R(tag+' '+sel+': Feld ist type=text mit inputmode',/^text\/(decimal|numeric)$/.test(kind),kind);
  await typeIn(p,sel,'1,5');let v=get(await po(p));
  dec?R(tag+' '+sel+': "1,5" wird als 1,5 gespeichert (nicht 15)',v===1.5,v):R(tag+' '+sel+': Stückzahl "1,5" abgewiesen, Wert bleibt '+start,v===start,v);
  await typeIn(p,sel,String(start));
  await typeIn(p,sel,'1.5');v=get(await po(p));dec?R(tag+' '+sel+': "1.5" wird als 1,5 gespeichert',v===1.5,v):R(tag+' '+sel+': Stückzahl "1.5" abgewiesen',v===start,v);
  await typeIn(p,sel,String(start));
  for(const bad of ['1e999','--','1e','1,5,5','1.234,5','abc','1,','-5',' 1 5']){const before=await pRaw(p);st.dlg.length=0;await typeIn(p,sel,bad);const after=await pRaw(p);R(tag+' '+sel+': "'+bad+'" abgewiesen, Speicher byte-gleich, Warnung',before===after&&st.dlg.some(d=>/alert:/.test(d)),st.dlg[0]||'keine Warnung');const shown=await p.evaluate(s=>document.querySelector(s).value,sel);if(bad==='-5')R(tag+' '+sel+': nach Ablehnung zeigt Feld den gespeicherten Wert',String(shown)===String(start),shown)}
  // Leeren
  const before=await pRaw(p);st.dlg.length=0;
  if(sel==='#pick-actual-0'||sel==='#pick-weight-0'){await typeIn(p,sel,'');R(tag+' '+sel+': Leeren abgewiesen (Pflichtfeld je Position)',before===await pRaw(p)&&st.dlg.some(d=>/alert:/.test(d)))}
  else{const pk=sel==='#pick-pallet-weight'||sel==='#pick-box-weight';if(pk)await typeIn(p,'#pick-measured-weight','40');const bfr=await pRaw(p);st.mode='dismiss';await typeIn(p,sel,'');if(pk)R(tag+' '+sel+': Abbruch lässt auch den Messwert 40 unverändert',(await po(p)).packaging.measuredWeight===40&&bfr===await pRaw(p));const o=await po(p);R(tag+' '+sel+': Leeren + Abbrechen -> Wert '+start+' bleibt, Bestätigung gezeigt, Speicher byte-gleich',get(o)===start&&bfr===await pRaw(p)&&st.dlg.some(d=>/confirm:Gespeicherten Wert entfernen/.test(d)),st.dlg.join('|'));
   const shown=await p.evaluate(s=>document.querySelector(s).value,sel);R(tag+' '+sel+': nach Abbruch zeigt Feld wieder '+start,String(shown)===String(start),shown);
   st.mode='accept';st.dlg.length=0;await typeIn(p,sel,'');const o2=await po(p);R(tag+' '+sel+': Leeren + Bestätigen entfernt den Wert',get(o2)===null,get(o2));
   if(sel==='#pick-pallet-weight'||sel==='#pick-box-weight')R(tag+' '+sel+': Hinweis auf Rücksetzen des Messwerts + Messwert zurückgesetzt',/gemessene Gewicht/i.test(st.dlg.join('|'))&&o2.packaging.measuredWeight===null);
   // neues, bisher leeres Feld normal: erneut leeren -> keine Rückfrage
   st.dlg.length=0;await typeIn(p,sel,'');R(tag+' '+sel+': bereits leeres Feld leeren -> keine Rückfrage',!st.dlg.some(d=>/confirm:/.test(d)));
   await typeIn(p,sel,String(start));R(tag+' '+sel+': Neueingabe in leeres Feld ohne Rückfrage',get(await po(p))===start&&!st.dlg.some(d=>/confirm:/.test(d)))}
  await typeIn(p,sel,String(start));
 }
 // Toleranz-Grenze
 await typeIn(p,'#pick-tolerance','150');R(tag+' Toleranz 150 abgewiesen (0–100 %)',(await po(p)).packaging.tolerancePercent===1);
 await typeIn(p,'#pick-tolerance','0,5');R(tag+' Toleranz "0,5" -> 0,5 (nicht 5)',(await po(p)).packaging.tolerancePercent===0.5);
 // Scanner unverändert
 const sc=await p.evaluate(()=>{const e=document.getElementById('pickScanInput');return e?e.type:null});R(tag+' Scanner-Eingabefeld unverändert type=text',sc==='text',sc);
 R(tag+' keine JS-Fehler',st.errs.length===0,st.errs.join('|'));await b.close()}
// ---------- S1: Mengenfelder der Lagerverwaltung ----------
for(const loc of LOCALES){const b=await chromium.launch();const ctx=await b.newContext({locale:loc,viewport:{width:1000,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(BASE);await p.waitForTimeout(300);
 await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'S1',name:'x',barcode:'',unit:'STK',pack:1,weight:2,max:500,min:null});s.boxes.push({id:'b1',place:'H4A-1-1',code:'S1',qty:30,blocked:0})})});
 const raw=()=>p.evaluate(k=>localStorage.getItem(k),K);
 const run=async(t,id,val,btn,msg)=>{await p.evaluate(t=>tab(t),t);await p.fill('#'+id,val);const before=await raw();await p.click(btn);await p.waitForTimeout(80);return {before,after:await raw(),msg:await p.evaluate(m=>document.getElementById(m).textContent,msg)}};
 for(const [t,id,btn,msg] of [['book','bookQty','#bookSubmit','bookMessage'],['merge','mergeQty','#mergeValidate','mergeCheck'],['inventory','invQty','#invCompare','invResult'],['articles','aPack','#aSave','aMessage']]){
  const k=await p.evaluate(i=>{const e=document.getElementById(i);return e.type},id);R(loc+' #'+id+': type=text',k==='text',k);
  for(const bad of ['1,5','1.5','1e2','abc','--3']){const r=await run(t,id,bad,btn,msg);R(loc+' #'+id+': "'+bad+'" abgewiesen mit verständlicher Meldung, nichts gespeichert',r.before===r.after&&/keine gültige Zahl|ganze Zahl/i.test(r.msg),r.msg)}
  const nr=await run(t,id,'-3',btn,msg);R(loc+' #'+id+': "-3" nicht still akzeptiert',nr.before===nr.after||id==='bookQty');
 }
 // positive Gegenprobe: gültige ganze Zahlen funktionieren
 await p.evaluate(()=>{tab('inventory');document.getElementById('invPlace').value='H4A-1-1';document.getElementById('invArticle').value='S1'});let r=await run('inventory','invQty','30','#invCompare','invResult');R(loc+' #invQty: "30" wird gültig verarbeitet',/Soll: 30/.test(r.msg),r.msg);
 await p.evaluate(()=>{tab('articles');document.getElementById('aCode').value='N1';document.getElementById('aName').value='Neu';document.getElementById('aWeight').value='1,5';document.getElementById('aMax').value='50'});r=await run('articles','aPack','12','#aSave','aMessage');const it=await p.evaluate(()=>state.items.find(a=>a.code==='N1'));R(loc+' Artikel anlegen: Pack "12" und Gewicht "1,5" -> 12 / 1,5',/gespeichert/.test(r.msg)&&it&&it.pack===12&&it.weight===1.5,JSON.stringify(it));
 // Korrekturbuchung mit negativer Menge bleibt möglich (Grund erforderlich)
 await p.evaluate(()=>{tab('book');document.getElementById('bookAction').value='correct';document.getElementById('bookArticle').value='S1';document.getElementById('bookPlace').value='H4A-1-1';document.getElementById('bookNote').value='Test'});r=await run('book','bookQty','-3','#bookSubmit','bookMessage');const q=await p.evaluate(()=>state.boxes.find(b=>b.id==='b1').qty);R(loc+' Bestandskorrektur "-3" weiterhin möglich',q===27&&/gespeichert/.test(r.msg),q+' '+r.msg);
 R(loc+' Mengenfelder: keine JS-Fehler',errs.length===0,errs.join('|'));await b.close()}
// ---------- S3: Lastreduzierung ----------
{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1000,height:900}})).newPage();const st={dlg:[],mode:'accept'};p.on('dialog',d=>{st.dlg.push(d.type()+':'+d.message());st.mode==='accept'?d.accept():d.dismiss()});await p.goto(BASE);await p.waitForTimeout(300);
 await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'S1',name:'x',barcode:'',unit:'STK',pack:1,weight:2,max:500,min:null});s.boxes.push({id:'b1',place:'H4A-1-1',code:'S1',qty:300,blocked:0},{id:'b2',place:'H4A-1-2',code:'S1',qty:20,blocked:0},{id:'b3',place:'H4A-1-3',code:'S1',qty:100,blocked:0});s.qrMap['QR-X']='H4A-1-1'})});
 const raw=()=>p.evaluate(k=>localStorage.getItem(k),K);const snap=()=>p.evaluate(()=>JSON.stringify({b:state.boxes,q:state.qrMap,pl:state.places,i:state.items}));
 const setCfg=(k,v)=>p.evaluate(([k,v])=>{tab('more');const m={shelf:'cfgShelf',bay:'cfgBay',palletMax:'cfgPalletMax',tare:'cfgTare'};for(const x in m)document.getElementById(m[x]).value=state.config[x]??'';document.getElementById(m[k]).value=v;document.getElementById('cfgSave').click();return document.getElementById('cfgMessage').textContent},[k,v]);
 const cases=[['shelf','300',['H4A-1-1']],['shelf','100',['H4A-1-1','H4A-1-3']],['bay','300',['H4A-1-1']],['palletMax','300',['H4A-1-1']],['tare','500',['H4A-1-1']]];
 for(const [k,v,exp] of cases){await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25})})});const c0=await raw(),s0=await snap();
  st.mode='dismiss';st.dlg.length=0;let m=await setCfg(k,v);const d=st.dlg.find(x=>/confirm:Achtung/.test(x))||'';
  R('S3 '+k+'→'+v+': Warnung zeigt betroffene Plätze '+exp.join(','),exp.every(pl=>d.includes(pl))&&/nichts verändert/.test(d),d.replace(/\n/g,' / '));
  R('S3 '+k+'→'+v+': Abbruch -> alte Konfiguration und gesamter Speicher byte-gleich',c0===await raw()&&/Nicht gespeichert/.test(m),m);
  st.mode='accept';st.dlg.length=0;m=await setCfg(k,v);const cfg=await p.evaluate(k=>state.config[k],k);R('S3 '+k+'→'+v+': Bestätigung speichert nur den Parameter',cfg===Number(v)&&/gespeichert/.test(m),m);
  R('S3 '+k+'→'+v+': Boxen, QR, Plätze, Artikel unverändert',s0===await snap());R('S3 '+k+'→'+v+': valid() weiterhin ok',await p.evaluate(()=>valid(state)));}
 // keine Warnung ohne Überschreitung
 await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25})})});st.dlg.length=0;let m=await setCfg('shelf','700');R('S3 Absenken ohne Überschreitung: keine Warnung, gespeichert',!st.dlg.some(x=>/Achtung/.test(x))&&/gespeichert/.test(m),m);
 st.dlg.length=0;m=await setCfg('shelf','900');R('S3 Erhöhen: keine Warnung',!st.dlg.some(x=>/Achtung/.test(x))&&/gespeichert/.test(m));
 // bereits überlastete Boxen lösen bei unveränderter Last keine erneute Warnung aus
 await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:300,bay:2000,palletMax:1000,tare:25})})});st.dlg.length=0;m=await setCfg('bay','1900');R('S3 bereits überlastete Box, anderer Parameter geändert: keine zusätzliche Warnung',!st.dlg.some(x=>/Achtung/.test(x))&&/gespeichert/.test(m),m);
 // Mehr als 5 Boxen
 await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});for(let i=4;i<=9;i++)s.boxes.push({id:'b'+i,place:'H4A-1-'+i,code:'S1',qty:200,blocked:0})})});st.mode='dismiss';st.dlg.length=0;await setCfg('shelf','300');const dd=st.dlg.find(x=>/Achtung/.test(x))||'';R('S3 viele Boxen: Liste auf 5 begrenzt, „weitere“ genannt',/und \d+ weitere/.test(dd)&&/\d+ vorhandene Boxen liegen/.test(dd),dd.replace(/\n/g,' / ').slice(0,100));
 // Ausbuchen bleibt möglich, Erhöhung gesperrt (bestehende Regeln)
 await b.close()}
// ---------- S4: mobile Artikelkarten ----------
async function measure(url,w,touch){const b=await chromium.launch();const c=await b.newContext({viewport:{width:w,height:800},hasTouch:touch,isMobile:touch});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url);await p.waitForTimeout(250);
 await p.evaluate(()=>{transaction(s=>{for(let i=1;i<=6;i++)s.items.push({code:'ART-'+i,name:'Lange Artikelbezeichnung Nummer '+i+' für den Test mit viel Text',barcode:'',unit:i%2?'P':'STK',pack:12,weight:2.5,max:100,min:5});s.config.shelf=800;s.config.bay=2000;s.config.palletMax=1000;s.config.tare=25;s.boxes.push({id:'x1',place:'H4A-1-1',code:'ART-1',qty:7,blocked:0},{id:'x2',place:'H4A-1-2',code:'ART-2',qty:5,blocked:0})});tab('articles')});await p.waitForTimeout(250);
 const stateBefore=await p.evaluate(k=>localStorage.getItem(k),K);
 const r=await p.evaluate(()=>{const bt=[...document.querySelectorAll('#articleRows button[data-edit]')];const rects=bt.map(x=>x.getBoundingClientRect());let ov=false;for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],c=rects[j];if(a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom)ov=true}
  const rows=[...document.querySelectorAll('#articleRows tr')].map(x=>Math.round(x.getBoundingClientRect().height));const th=document.querySelector('#articleRows').closest('table').querySelector('thead');const stock=[...document.querySelectorAll('#articleRows .art-stock')];
  return {n:bt.length,visible:rects.every(x=>x.left>=0&&x.right<=innerWidth),w:Math.round(rects[0].width),h:Math.round(rects[0].height),overlap:ov,pageOverflow:document.documentElement.scrollWidth>innerWidth,rowH:rows[0],head:getComputedStyle(th).display,stockShown:stock.length?stock.map(x=>getComputedStyle(x).display!=='none'&&x.getBoundingClientRect().right<=innerWidth+1):[],stockTxt:stock.map(x=>x.textContent),cells:[...document.querySelectorAll('#articleRows tr:first-child td')].map(x=>Math.round(x.getBoundingClientRect().width)).join(',')}});
 await p.evaluate(()=>{const e=document.querySelector('#articleRows button[data-edit]');e.scrollIntoView();e.click()});await p.waitForTimeout(150);const edit=await p.evaluate(()=>document.getElementById('aCode').readOnly&&document.getElementById('aCode').value==='ART-1');
 const stateAfter=await p.evaluate(k=>localStorage.getItem(k),K);await b.close();return {...r,edit,errs,same:stateBefore===stateAfter}}
for(const w of [320,360,375,390,414,430,600]){const n=await measure(BASE,w,true);
 R('S4 '+w+' px: alle Bearbeiten-Buttons vollständig sichtbar, '+n.w+'×'+n.h+' (≥44), keine Überlappung, kein Seitenüberlauf',n.n>=6&&n.visible&&n.w>=44&&n.h>=44&&!n.overlap&&!n.pageOverflow,'Zeile '+n.rowH+' px');
 R('S4 '+w+' px: Kopfzeile ausgeblendet, Bestand je Karte sichtbar',n.head==='none'&&n.stockShown.length>=6&&n.stockShown.every(Boolean),n.stockTxt.slice(0,2).join(' / '));
 R('S4 '+w+' px: Bearbeiten öffnet Formular, Daten unverändert, keine JS-Fehler',n.edit&&n.same&&n.errs.length===0)}
{const n=await measure(BASE,390,true);R('S4 Bestand aus Boxen: ART-1 7 Pack = 84 Stück, ART-2 5 Stück',/84 Stück \(7 Pack\)/.test(n.stockTxt[0])&&/Bestand: 5 Stück/.test(n.stockTxt[1]),n.stockTxt.slice(0,2).join(' / '))}
for(const w of [601,768,1100,1400]){const n=await measure(BASE,w,false);R('S4 '+w+' px: Tabelle mit Kopfzeile, Bestandszeile nicht sichtbar',n.head!=='none'&&n.stockShown.every(x=>!x),n.head+' '+JSON.stringify(n.stockShown.slice(0,1)));
 if(BASE0){const a=await measure(BASE0,w,false);R('S4 '+w+' px Desktop identisch zum Ausgangsstand (Zeile '+a.rowH+'='+n.rowH+', Button '+a.w+'×'+a.h+'='+n.w+'×'+n.h+', Spalten '+a.cells+' = '+n.cells+')',a.rowH===n.rowH&&a.w===n.w&&a.h===n.h&&a.cells===n.cells)}}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail);process.exit(fail?1:0)})();
