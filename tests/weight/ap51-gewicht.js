// AP5.1 – Gewichtseingaben absichern. Aufruf: BASE=http://localhost:8123/index.html node tests/weight/ap51-gewicht.js
const {chromium}=require('playwright');const fs=require('fs');const os=require('os');const path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html';const K='lagerpilot_v2_7';
let pass=0,fail=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,200):''))};
const CFG={shelf:800,bay:2000,palletMax:1000,tare:25};
async function open(accept=true){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});const p=await ctx.newPage();const errs=[];const dlg=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dlg.push(d.message());accept?d.accept():d.dismiss()});await p.goto(BASE);await p.waitForTimeout(400);return {b,p,errs,dlg}}
async function seed(){const h=await open();await h.p.evaluate(c=>{transaction(s=>{Object.assign(s.config,c);s.items.push({code:'A1',name:'Mit Gewicht',barcode:'',unit:'STK',pack:1,weight:2,max:100,min:null},{code:'N1',name:'Ohne Gewicht',barcode:'',unit:'STK',pack:1,weight:null,max:100,min:null},{code:'S1',name:'Mit Bestand',barcode:'',unit:'STK',pack:1,weight:2,max:100,min:null});
 s.boxes.push({id:'b1',place:'H4A-1-1',code:'S1',qty:50,blocked:0});s.qrMap['QR-X']='H4A-1-1'})},CFG);return h}
const raw=h=>h.p.evaluate(k=>localStorage.getItem(k),K);
const part=(h,f)=>h.p.evaluate(([k,f])=>JSON.stringify(f.split('.').reduce((o,x)=>o[x],JSON.parse(localStorage.getItem(k)))),[K,f]);
const w=(h,c)=>h.p.evaluate(c=>{const a=state.items.find(x=>x.code===c);return a?a.weight:'FEHLT'},c);
const msg=h=>h.p.evaluate(()=>document.getElementById('aMessage').textContent+'|'+document.getElementById('aMessage').className);
async function form(h,o,edit){await h.p.evaluate(([o,edit])=>{tab('articles');document.getElementById('aClear').click();if(edit)document.querySelector('[data-edit="'+edit+'"]').click();for(const [k,v] of Object.entries(o)){document.getElementById(k).value=v}},[o,edit||null])}
const click=h=>h.p.evaluate(()=>document.getElementById('aSave').click()).then(()=>h.p.waitForTimeout(60));
(async()=>{
const h=await seed();
const base={boxes:await part(h,'boxes'),places:await part(h,'places'),qrMap:await part(h,'qrMap'),config:await part(h,'config')};
// 1 gültige Eingaben
let i=0;for(const [v,exp] of [['2',2],['2.5',2.5],['2,5',2.5],['0',0],['0.001',0.001],[' 3 ',3],['007',7],['12,75',12.75],['9007199254740991',9007199254740991]]){
 await form(h,{aCode:'V'+(++i),aName:'V',aUnit:'STK',aPack:'1',aWeight:v});await click(h);R('1 gültig "'+v+'" -> '+exp,(await w(h,'V'+i))===exp,await msg(h))}
// 2 ungültige Zeichen/Formate  3 Extremwerte  4 Neuanlage
const bad=['abc','1e5','1e999','1E3','Infinity','-Infinity','NaN','-1','+1','1.2.3','1,2,3','1.500,5','0x10','2 kg','.5','5.','1e-3','٣','１２','--1','1,','null','undefined','9'.repeat(400),'9007199254740992','1'+'0'.repeat(30)];
let n=0;for(const v of bad){n++;const before=await raw(h);await form(h,{aCode:'B'+n,aName:'B',aUnit:'STK',aPack:'1',aWeight:v});await click(h);
 const m=await msg(h);const after=await raw(h);
 R('2-4 Neuanlage ungültig "'+(v.length>20?v.slice(0,8)+'…('+v.length+')':v)+'": Fehlermeldung, nichts gespeichert, Speicher byteweise gleich, Formular behalten',/Gewicht muss/.test(m)&&/error/.test(m)&&!/Artikel gespeichert/.test(m)&&after===before&&(await w(h,'B'+n))==='FEHLT'&&(await h.p.evaluate(()=>document.getElementById('aCode').value))==='B'+n,m.slice(0,80))}
// 5/6 Bearbeiten ungültig: Gewicht bleibt (ohne und mit Bestand)
for(const code of ['A1','S1']){const orig=await w(h,code);for(const v of ['abc','1e999','Infinity','-1','1.2.3','1e5','NaN']){const before=await raw(h);await form(h,{aWeight:v},code);await click(h);const m=await msg(h);
 R('5/6 Bearbeiten '+code+' ungültig "'+v+'": Gewicht '+orig+' bleibt, Speicher gleich, Fehlermeldung',(await w(h,code))===orig&&(await raw(h))===before&&/Gewicht muss/.test(m)&&!/Artikel gespeichert/.test(m),m.slice(0,70))}}
// weitere Felder bleiben bei abgelehntem Speichern unangetastet (Name)
await form(h,{aWeight:'abc',aName:'GEÄNDERT'},'A1');await click(h);R('5 Abgelehnt: Name nicht geändert',(await h.p.evaluate(()=>state.items.find(a=>a.code==='A1').name))==='Mit Gewicht');
// 7 bewusstes Entfernen
let hist=await h.p.evaluate(()=>state.history.length);h.dlg.length=0;
await form(h,{aWeight:''},'A1');await click(h);R('7 Leeres Feld entfernt Gewicht erst nach Bestätigung (Dialog erschienen)',h.dlg.some(d=>/Gewicht.*entfernt/.test(d))&&(await w(h,'A1'))===null&&/Artikel gespeichert/.test(await msg(h)),h.dlg.join('|').slice(0,100));
R('7 Entfernen protokolliert (Historie +1)',(await h.p.evaluate(()=>state.history.length))===hist+1);
await form(h,{aWeight:'4'},'A1');await click(h);R('7 Gewicht danach wieder setzbar',(await w(h,'A1'))===4);
// Entfernen abgelehnt bei Bestand (egal ob bestätigt)
{const before=await raw(h);await form(h,{aWeight:''},'S1');await click(h);R('7/8 Artikel MIT Bestand: Gewicht entfernen abgelehnt, Speicher gleich',(await w(h,'S1'))===2&&(await raw(h))===before&&/nicht gelöscht/.test(await msg(h)),await msg(h))}
// Artikel ohne Gewicht: leer bleibt leer, ohne Dialog
h.dlg.length=0;await form(h,{aName:'Ohne Gewicht 2',aWeight:''},'N1');await click(h);R('8 Artikel ohne Gewicht: leer speichern erlaubt, kein Dialog',(await w(h,'N1'))===null&&h.dlg.length===0&&/Artikel gespeichert/.test(await msg(h)));
// Neuanlage ohne Gewicht (leer) weiterhin erlaubt
await form(h,{aCode:'NEU0',aName:'Neu',aUnit:'STK',aPack:'1',aWeight:''});await click(h);R('4 Neuanlage mit leerem Gewicht (unbekannt) weiterhin erlaubt',(await w(h,'NEU0'))===null);
// 8 Bestand: Fachlast-Grenzen unverändert
await form(h,{aWeight:'15.5'},'S1');await click(h);R('8 Bestand 50: Gewicht 15,5 (=800 kg) erlaubt',(await w(h,'S1'))===15.5,await msg(h));
{const before=await raw(h);await form(h,{aWeight:'15,6'},'S1');await click(h);R('8 Bestand 50: Gewicht 15,6 (805 kg) abgelehnt (Fachlast)',(await w(h,'S1'))===15.5&&(await raw(h))===before&&/Fachlast/.test(await msg(h)),await msg(h))}
// Storage-Ebene: ungültige Gewichte werden von transaction()/valid() abgelehnt
for(const [lbl,val] of [['Infinity','Infinity'],['NaN','NaN'],['-5','-5'],['String "2"','"2"'],['undefined','undefined']]){const before=await raw(h);
 const r=await h.p.evaluate(v=>{try{transaction(s=>{s.items.find(a=>a.code==='A1').weight=eval(v)});return 'ok'}catch(e){return 'abgelehnt: '+e.message}},val);
 R('Speicherlogik: weight='+lbl+' wird abgelehnt, Speicher gleich',/abgelehnt/.test(r)&&(await raw(h))===before,r.slice(0,70))}
// 9 Import/Export
const dl=h.p.waitForEvent('download');await h.p.evaluate(()=>{tab('more');document.getElementById('jsonExport').click()});const d=await dl;const f=path.join(os.tmpdir(),'ap51_export.json');await d.saveAs(f);
const ex=JSON.parse(fs.readFileSync(f,'utf8'));const exW=Object.fromEntries(ex.items.map(a=>[a.code,a.weight]));
R('9 Export: Gewichte unverändert (A1 4, S1 15.5, N1 null)',exW.A1===4&&exW.S1===15.5&&exW.N1===null);
const imp=(o)=>{const g=path.join(os.tmpdir(),'ap51_imp.json');fs.writeFileSync(g,JSON.stringify(o));return g};
for(const [lbl,val,okExpected] of [['gültig 3.25',3.25,true],['null',null,true],['String "abc"','abc',false],['String "2"','2',false],['negativ -1',-1,false],['1e308 (Altdaten-kompatibel)',1e308,true]]){
 const h2=await seed();const o=JSON.parse(await raw(h2));o.items.find(a=>a.code==='A1').weight=val;const before=await raw(h2);
 await h2.p.evaluate(()=>tab('more'));const nav=h2.p.waitForNavigation({timeout:4000}).then(()=>true).catch(()=>false);await h2.p.setInputFiles('#jsonImport',imp(o));await nav;await h2.p.waitForTimeout(400);
 const now=await h2.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);const got=now.items.find(a=>a.code==='A1')?.weight;
 R('9 Import Gewicht '+lbl+': '+(okExpected?'übernommen':'abgelehnt, Bestand unverändert'),okExpected?got===val:(got===2&&JSON.stringify(now.boxes)===JSON.stringify(JSON.parse(before).boxes)),'weight='+got);await h2.b.close()}
// Altdaten: v2.7-Speicher mit Gewichten laden und bearbeiten ohne Gewichtsänderung
{const h3=await seed();await h3.p.reload();await h3.p.waitForTimeout(400);await form(h3,{aMin:'5'},'A1');await click(h3);R('Altdaten: nach Reload Artikel ändern (Min) lässt Gewicht 2 unverändert',(await w(h3,'A1'))===2&&/Artikel gespeichert/.test(await msg(h3)));await h3.b.close()}
// Datenintegrität: Boxen, Plätze, QR, Config unverändert
R('Integrität: Boxen unverändert',(await part(h,'boxes'))===base.boxes);R('Integrität: Plätze unverändert',(await part(h,'places'))===base.places);R('Integrität: QR-Zuordnung unverändert',(await part(h,'qrMap'))===base.qrMap);R('Integrität: Konfiguration unverändert',(await part(h,'config'))===base.config);
R('Integrität: Zustand gültig (valid)',await h.p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7')))));
R('Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close();
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail);process.exit(fail?1:0)})();
