// AP5.3 – Analysetest mobile Eingaben (Kommissionierung + Mengenfelder) mit verschiedenen Browser-Gebietsschemata.
// Charakterisiert das IST-Verhalten (keine Änderung am Anwendungscode). BEFUND = Sicherheitsfinding, nur Information.
// Aufruf: BASE=http://localhost:8123/index.html node tests/mobile/ap53-kommissionier-eingaben.js
const {chromium,devices}=require('playwright');const BASE=process.env.BASE||'http://localhost:8123/index.html';const PK='lagerpilot_pick_demo_v1',K='lagerpilot_v2_7';
let pass=0,fail=0,befund=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,170):''))};const B=(id,info)=>{befund++;console.log('BEFUND '+id+(info?'  | '+String(info).slice(0,200):''))};
const LOCALES=['de-DE','de-CH','en-US','fr-FR'];
const order=()=>({id:'T1',lines:3,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:Array.from({length:3},(_,i)=>({sku:'ART-'+(i+1),name:'Artikel '+(i+1),place:'H4B-1-'+(i+1),qty:20,actual:20,unitWeight:1})),checkedLines:[],scannedLines:[0,1,2],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:40,tolerancePercent:1}});
async function open(locale,mobile){const b=await chromium.launch();const ctx=await b.newContext(mobile?{...devices['iPhone 14'],locale}:{locale,viewport:{width:1000,height:900}});const p=await ctx.newPage();const errs=[],dlg=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dlg.push(d.message());d.accept()});await p.goto(BASE);await p.waitForTimeout(300);
 const ps={people:[{name:'Max',device:'Scanner 1',active:true,lastSeen:Date.now()}],roster:['Max','Peter','Leon'],orders:[order()],session:'Max',testStatus:{Max:true}};
 await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,ps]);await p.reload();await p.waitForTimeout(300);await p.evaluate(()=>{const b=document.querySelector('#nav [data-area="picking"]');if(b)b.click();tab('picking')});await p.waitForTimeout(250);return {b,p,errs,dlg}}
const po=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).orders[0],PK);
const typeIn=async(p,sel,v)=>{await p.click(sel);await p.keyboard.press('Control+A');await p.keyboard.press('Delete');if(v!=='')await p.keyboard.type(v);await p.keyboard.press('Tab');await p.waitForTimeout(100)};
const fields=[['#pick-pallet-weight',o=>o.packaging.palletWeight,25,true],['#pick-box-weight',o=>o.packaging.boxWeight,1.5,true],['#pick-measured-weight',o=>o.packaging.measuredWeight,40,true],['#pick-tolerance',o=>o.packaging.tolerancePercent,1,true],['#pick-weight-0',o=>o.items[0].unitWeight,1,true],['#pick-actual-0',o=>o.items[0].actual,20,false]];
(async()=>{
for(const loc of LOCALES){for(const mobile of [false,true]){const tag=loc+(mobile?' (iPhone 14)':'');const {b,p,errs,dlg}=await open(loc,mobile);
 const nav=await p.evaluate(()=>navigator.language);
 for(const [sel,get,start,dec] of fields){
  // 1,5 getippt
  await typeIn(p,sel,'1,5');let o=await po(p);let v=get(o);const raw=await p.evaluate(s=>document.querySelector(s).value,sel);
  if(dec){ if(v===15)B(tag+' '+sel+': getipptes "1,5" wird still als 15 gespeichert (Faktor 10)','Feldwert="'+raw+'" gespeichert='+v);else R(tag+' '+sel+': "1,5" -> '+v+' (1.5)',v===1.5||v===start,'gespeichert='+v);}
  else { if(v===15)B(tag+' '+sel+': getipptes "1,5" wird still als 15 gespeichert (Stückzahl)','gespeichert='+v);else R(tag+' '+sel+': Stückzahl "1,5" nicht als 15 gespeichert',v===start,'gespeichert='+v);}
  // zurück auf Ausgangswert
  await typeIn(p,sel,String(start));
  // 1.5 getippt
  await typeIn(p,sel,'1.5');o=await po(p);v=get(o);
  if(dec)R(tag+' '+sel+': "1.5" -> 1.5',v===1.5,'gespeichert='+v);else R(tag+' '+sel+': Stückzahl "1.5" abgewiesen, Wert '+start+' bleibt',v===start&&dlg.length>0,'gespeichert='+v);
  await typeIn(p,sel,String(start));
  // ungültig
  for(const bad of ['1e999','--','1e']){dlg.length=0;await typeIn(p,sel,bad);o=await po(p);R(tag+' '+sel+': ungültig "'+bad+'" -> Wert '+start+' bleibt (+Warnung)',get(o)===start&&dlg.some(d=>/Ungültige Eingabe/.test(d)),'gespeichert='+get(o)+' dlg='+dlg.join('|').slice(0,50));await typeIn(p,sel,String(start))}
  // negativ
  dlg.length=0;await typeIn(p,sel,'-5');o=await po(p);R(tag+' '+sel+': negativ "-5" abgewiesen, Wert '+start+' bleibt',get(o)===start,'gespeichert='+get(o));await typeIn(p,sel,String(start));
  // Löschen eines vorhandenen Wertes
  dlg.length=0;await typeIn(p,sel,'');o=await po(p);v=get(o);
  if(sel==='#pick-actual-0'||sel==='#pick-weight-0')R(tag+' '+sel+': Leeren eines vorhandenen Werts wird abgewiesen',v===start,'gespeichert='+v);
  else if(v===null)B(tag+' '+sel+': Leeren löscht vorhandenen Wert '+start+' ohne Rückfrage (bewusst zugelassen; Messwert/Palette: gekoppelter Messwert wird zurückgesetzt)','gespeichert=null');else R(tag+' '+sel+': Leeren abgewiesen',true);
  await typeIn(p,sel,String(start));
 }
 // Scanner: Feld ist Text, verändert Eingaben nicht
 const sc=await p.evaluate(()=>{const e=document.getElementById('pickScanInput');return e?{type:e.type,inputmode:e.inputMode}:null});
 R(tag+' Scanner-Eingabefeld ist type=text (nicht von Zahlenlogik betroffen)',!!sc&&sc.type==='text',JSON.stringify(sc));
 // Mengenfelder der Lagerverwaltung (type=number): getipptes "1,5" im Feld
 for(const [t,id] of [['book','bookQty'],['inventory','invQty'],['merge','mergeQty'],['articles','aPack']]){await p.evaluate(t=>tab(t),t);await p.click('#'+id);await p.keyboard.press('Control+A');await p.keyboard.press('Delete');await p.keyboard.type('1,5');const v=await p.evaluate(id=>document.getElementById(id).value,id);
  if(v==='15')B(tag+' #'+id+': getipptes "1,5" steht im Feld als 15 (Stückzahl, wird so gebucht/geprüft)','Feldwert="'+v+'"');else R(tag+' #'+id+': "1,5" nicht als 15 übernommen',v!=='15','Feldwert="'+v+'"')}
 if(!mobile)R(tag+' (navigator.language='+nav+') keine JS-Fehler',errs.length===0,errs.join('|'));
 await b.close()}}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail+' / BEFUNDE '+befund);process.exit(fail?1:0)})();
