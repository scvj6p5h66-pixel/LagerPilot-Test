const fs=require('fs');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,260):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,300),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const mkI=(code,name,o={})=>({code,name,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null,...o});
const ITEMS=[mkI('A1','Art1',{barcode:'BC1',weight:2,min:3}),mkI('A2','Art2',{barcode:'bc-two'}),mkI('A3','Art3',{max:50}),
 mkI('C'.repeat(65),'Legacy Code 65'),mkI('toString','Legacy reserviert 1'),mkI('__proto__','Legacy reserviert 2'),mkI('LN','N'.repeat(200)),mkI('LM','Legacy Min>Max',{min:500,max:100}),mkI('ab1','case1'),mkI('AB1','case2'),mkI('LB','Barcode=Code',{barcode:'lb'}),mkI('LP','Pack',{unit:'P',pack:12,weight:2.5,max:20,min:100})];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'LM',qty:100,blocked:0},{id:'b3',place:'H4A-1-3',code:'LM',qty:60,blocked:0}];
async function mk(){const {open}=require('./lib');const h=await open();await h.p.evaluate(([cfg,it,bx])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...it);s.boxes.push(...bx)})},[FULL,ITEMS,BOX]);
 await h.p.evaluate(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video id=fakevid></video>';window.__cb=cb}async stop(){}async clear(){}}});return h}
async function fill(h,o){await h.go('articles');const base={aName:'X',aCode:'',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'5',aMin:''};for(const [k,x] of Object.entries({...base,...o}))await h.p.evaluate(([k,x])=>{document.getElementById(k).value=x},[k,x])}
const save=async h=>{await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')};
const ok=m=>/Artikel gespeichert/.test(m);
const edit=async(h,code)=>{await h.go('articles');await h.p.evaluate(c=>{[...document.querySelectorAll('[data-edit]')].find(e=>e.getAttribute('data-edit')===c).click()},code)};
const item=(s,c)=>s.st.items.find(x=>x.code===c);
const others=(s,c)=>JSON.stringify(s.st.items.filter(x=>x.code!==c));
(async()=>{
let h=await mk(),b,a,m;
// T1 Min 500 / Max 100 Neuanlage
await fill(h,{aCode:'N500',aName:'Mindest 500',aMax:'100',aMin:'500',aWeight:'2'});b=await snap(h);m=await save(h);a=await snap(h);
R('T1 Neuanlage Mindestbestand 500 / Box-Max 100 wird gespeichert',ok(m)&&item(a,'N500').min===500&&item(a,'N500').max===100,m);
R('T1 Nur dieser Artikel neu, 1 Historie, Boxen/andere Artikel unverändert',a.st.items.length===b.st.items.length+1&&others(a,'N500')===others(b,'N500')&&JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes)&&a.st.history.length===b.st.history.length+1);
for(const [lbl,mn,mx] of [['Min 1000 / Max 1',1000,1],['Min 0 / Max 100',0,100],['Min 100 / Max 100',100,100],['Min 500 / Max leer',500,'']]){await fill(h,{aCode:'T'+mn+'x'+mx,aName:'T',aMax:String(mx),aMin:String(mn)});m=await save(h);R('T1 Neuanlage '+lbl,ok(m),m)}
// unabhängige Zahlenprüfung
for(const [lbl,o,re] of [['Min −1',{aMin:'-1'},/Mindestbestand muss/],['Min 1,5',{aMin:'1.5'},/Mindestbestand muss/],['Max 0',{aMax:'0'},/Maximale Boxmenge muss/],['Max 1,5',{aMax:'1.5'},/Maximale Boxmenge muss/],['Max −2',{aMax:'-2'},/Maximale Boxmenge muss/]]){await fill(h,{aCode:'Z'+Math.floor(Math.random()*1e6),...o});b=await snap(h);m=await save(h);R('T1 Zahlenprüfung weiterhin einzeln: '+lbl,!ok(m)&&re.test(m)&&(await snap(h)).raw===b.raw,m)}
// Box-Max pro Box + Mindestbestand Gesamtsumme
await h.p.evaluate(()=>{transaction(s=>{s.boxes.push({id:'n1',place:'H4A-4-1',code:'N500',qty:100,blocked:0},{id:'n2',place:'H4A-4-2',code:'N500',qty:60,blocked:0})})});
await h.go('home');let hw=await txt(h.p,'homeWarnings');R('T1 Mindestbestand-Warnung nach Gesamtbestand: 160 < 500 → Warnung',/unter Mindestbestand/.test(hw),hw);
await h.go('book');const bk=async o=>{await setf(h.p,'bookArticle','N500');for(const [k,x] of Object.entries(o))await setf(h.p,k,x);await h.p.evaluate(()=>bookSubmit.click());await h.dlg();return txt(h.p,'bookMessage')};
let r1=await bk({bookAction:'in',bookPlace:'H4A-4-1',bookQty:'1'});R('T1 Box-Maximum 100 pro Box weiter durchgesetzt (+1 auf volle Box abgelehnt)',!/gespeichert/.test(r1)&&/Boxkapazität/.test(r1),r1);
let r2=await bk({bookAction:'in',bookPlace:'H4A-4-3',bookQty:'100'});R('T1 Weitere Box darf wieder 100 aufnehmen',/gespeichert/.test(r2),r2);
await bk({bookAction:'in',bookPlace:'H4A-4-4',bookQty:'100'});await bk({bookAction:'in',bookPlace:'H4A-4-5',bookQty:'100'});await bk({bookAction:'in',bookPlace:'H4A-4-6',bookQty:'100'});
await h.go('home');hw=await txt(h.p,'homeWarnings');const tot=await h.p.evaluate(()=>state.boxes.filter(b=>b.code==='N500').reduce((s,b)=>s+b.qty,0));R('T1 Gesamtbestand '+tot+' ≥ 500 → N500 nicht mehr in der Warnung (Gesamtbestand-Berechnung)',tot>=500&&(await h.p.evaluate(()=>{const it=state.items.find(a=>a.code==='N500');return state.boxes.filter(b=>b.code==='N500').reduce((s,b)=>s+b.qty,0)>=it.min})),hw);
// T2 Altartikel LM 500 -> 600
await edit(h,'LM');b=await snap(h);await setf(h.p,'aMin','600');m=await save(h);a=await snap(h);
R('T2 Altartikel LM (Min 500 / Max 100): Mindestbestand 600 gespeichert',ok(m)&&item(a,'LM').min===600&&item(a,'LM').max===100,m);
R('T2 LM: Name/Barcode/Gewicht/Max unverändert, Boxen (100/60) und andere Artikel unverändert',item(a,'LM').name==='Legacy Min>Max'&&JSON.stringify(a.st.boxes.filter(x=>x.code==='LM'))===JSON.stringify(b.st.boxes.filter(x=>x.code==='LM'))&&others(a,'LM')===others(b,'LM'));
await edit(h,'LM');await setf(h.p,'aMax','150');m=await save(h);R('T2 LM: Max 150 (Boxen 100/60 ≤ 150, Min 600 bleibt) gespeichert',ok(m)&&item(await snap(h),'LM').max===150,m);
await edit(h,'LM');await setf(h.p,'aMax','80');b=await snap(h);m=await save(h);R('T2 LM: Max 80 < Box 100 weiterhin durch Boxprüfung abgelehnt (SA-05)',!ok(m)&&/Box auf H4A-1-2/.test(m)&&(await snap(h)).raw===b.raw,m);
await edit(h,'LP');await setf(h.p,'aMin','250');m=await save(h);R('T2 LP (Pack, Min 100 / Max 20): Min 250 gespeichert',ok(m)&&item(await snap(h),'LP').min===250,m);
// T3 Neuanlage A3
await fill(h,{aCode:'A3',aName:'Überschreibungsversuch',aBarcode:'OVR-1',aWeight:'9',aMax:'7',aMin:'1'});b=await snap(h);m=await save(h);a=await snap(h);
R('T3 Neuanlage mit vorhandener Nummer A3: abgelehnt mit verständlicher Meldung',!ok(m)&&/Artikelnummer A3 existiert bereits/.test(m)&&/Bearbeiten/.test(m),m);
R('T3 Speicher byteweise unverändert, A3 unverändert (Name Art3), keine Historie',a.raw===b.raw&&item(a,'A3').name==='Art3'&&item(a,'A3').max===50&&a.st.history.length===b.st.history.length);
R('T3 Formular behält Eingaben (zum Korrigieren)',(await h.p.evaluate(()=>[aCode.value,aName.value,aBarcode.value].join('|')))==='A3|Überschreibungsversuch|OVR-1');
// T4 Schreibweisen
for(const v of ['a3','A3 ','  a3','Ab1','AB1','aB1','Toststring']){await fill(h,{aCode:v,aName:'Variante'});b=await snap(h);m=await save(h);a=await snap(h);
 const shouldReject=v.trim().toLowerCase()!=='toststring';
 R('T4 Neuanlage "'+JSON.stringify(v)+'": '+(shouldReject?'abgelehnt, nichts geändert':'erlaubt'),shouldReject?(!ok(m)&&/existiert bereits/.test(m)&&a.raw===b.raw):ok(m),m)}
// T5 reguläre Bearbeitung
await edit(h,'A1');
R('T5 Bearbeitungsmodus sichtbar (Hinweis) und Artikelnummer gesperrt',(await h.p.evaluate(()=>!aModeHint.classList.contains('hidden')&&/Artikel A1/.test(aModeHint.textContent)&&aCode.readOnly)));
await setf(h.p,'aName','Art1 neu');await setf(h.p,'aBarcode','BC1-NEU');await setf(h.p,'aWeight','3');await setf(h.p,'aMax','60');await setf(h.p,'aMin','7');b=await snap(h);m=await save(h);a=await snap(h);
R('T5 Reguläre Bearbeitung A1 gespeichert (Name, Barcode, Gewicht, Max, Min)',ok(m)&&item(a,'A1').name==='Art1 neu'&&item(a,'A1').barcode==='BC1-NEU'&&item(a,'A1').weight===3&&item(a,'A1').max===60&&item(a,'A1').min===7,m);
R('T5 Bestand A1 (50) und andere Artikel unverändert, genau 1 Historie',a.st.boxes.find(x=>x.id==='b1').qty===50&&others(a,'A1')===others(b,'A1')&&a.st.history.length===b.st.history.length+1);
R('T5 Nach Speichern: Bearbeitungsmodus beendet (Hinweis weg, Nummer frei, Formular leer)',await h.p.evaluate(()=>aModeHint.classList.contains('hidden')&&!aCode.readOnly&&aCode.value===''&&aName.value===''));
await fill(h,{aCode:'A1',aName:'nochmal'});b=await snap(h);m=await save(h);R('T5 Danach "A1" im Neuanlage-Modus: abgelehnt (kein stilles Überschreiben)',!ok(m)&&(await snap(h)).raw===b.raw,m);
// T6 Umgehung
await edit(h,'A2');await h.p.evaluate(()=>{aCode.readOnly=false;aCode.value='A3'});b=await snap(h);m=await save(h);a=await snap(h);
R('T6 Bearbeitungsmodus A2, Nummer per Skript auf A3 geändert: abgelehnt, A2 und A3 unverändert',!ok(m)&&/Artikelnummer nicht geändert werden/.test(m)&&a.raw===b.raw,m);
await edit(h,'A2');await h.p.evaluate(()=>{aCode.readOnly=false;aCode.value='NEU-VIA-EDIT'});b=await snap(h);m=await save(h);a=await snap(h);
R('T6 Bearbeitungsmodus + neue Nummer: legt KEINEN Artikel an',!ok(m)&&a.raw===b.raw&&!a.st.items.some(x=>x.code==='NEU-VIA-EDIT'),m);
await edit(h,'A2');await h.p.evaluate(()=>{aCode.readOnly=false;aCode.value='a2'});b=await snap(h);m=await save(h);R('T6 Bearbeitungsmodus A2, Nummer "a2" (nur Schreibweise): abgelehnt',!ok(m)&&(await snap(h)).raw===b.raw,m);
await edit(h,'A2');await h.p.evaluate(()=>{aClear.click();aCode.value='A2';aName.value='leer->neu'});b=await snap(h);m=await save(h);R('T6 Modus per "Eingabe leeren" beendet, dann A2 eintippen: abgelehnt',!ok(m)&&(await snap(h)).raw===b.raw,m);
await edit(h,'A2');await h.p.evaluate(()=>{transaction(s=>{s.items=s.items.filter(x=>x.code!=='A2');s.boxes=s.boxes.filter(x=>x.code!=='A2')})});b=await snap(h);m=await save(h);a=await snap(h);
R('T6 Artikel im Bearbeitungsmodus inzwischen entfernt: Speichern legt ihn NICHT neu an (Meldung)',!ok(m)&&!a.st.items.some(x=>x.code==='A2')&&a.raw===b.raw,m);
await h.p.evaluate(()=>aClear.click());
await edit(h,'A1');await edit(h,'A3');R('T6 Wechsel A1 → A3: Formular zeigt A3, Hinweis nennt A3',await h.p.evaluate(()=>aCode.value==='A3'&&/Artikel A3/.test(aModeHint.textContent)));
await setf(h.p,'aName','A3 neu benannt');b=await snap(h);m=await save(h);a=await snap(h);R('T6 Speichern ändert nur A3, A1 unverändert',ok(m)&&item(a,'A3').name==='A3 neu benannt'&&JSON.stringify(item(a,'A1'))===JSON.stringify(item(b,'A1')),m);
// Doppelklick
await edit(h,'A3');await setf(h.p,'aName','DK');b=await snap(h);await h.p.evaluate(()=>{aSave.click();aSave.click();aSave.click()});a=await snap(h);R('T6 Dreifachklick Speichern: genau 1 Historieneintrag, kein doppelter Artikel',a.st.history.length===b.st.history.length+1&&a.st.items.filter(x=>x.code==='A3').length===1);
// Stale
{const p2=await h.p.context().newPage();await p2.addInitScript(()=>{window.confirm=()=>true;window.alert=()=>{}});await p2.goto('http://localhost:8123/index.html');await p2.waitForTimeout(500);
 await edit(h,'A3');await setf(h.p,'aName','Stale');await p2.evaluate(()=>{transaction(s=>{history(s,'B')})});b=await snap(h);m=await save(h);R('T6 Veralteter Tab im Bearbeitungsmodus: nichts gespeichert',!ok(m)&&(await snap(h)).raw===b.raw,m);await p2.close()}
R('JS T1–T6',h.errs.length===0,h.errs.join('|').slice(0,250));await h.b.close();
// T7 Kompatibilität Altdaten
h=await mk();
for(const [c,ops] of Object.entries({['C'.repeat(65)]:['noop','name'],toString:['noop','name'],'__proto__':['noop','name'],LN:['noop','weight'],LM:['noop','min'],ab1:['noop','name'],AB1:['noop','name'],LB:['noop','name'],LP:['noop','min'],A1:['noop','name']}))for(const op of ops){
 await edit(h,c);if(op==='name')await setf(h.p,'aName',(await h.p.evaluate(()=>aName.value)).slice(0,20)+' x');if(op==='weight')await setf(h.p,'aWeight','3');if(op==='min')await setf(h.p,'aMin','900');
 b=await snap(h);m=await save(h);a=await snap(h);
 R('T7 Altartikel '+c.slice(0,10)+' '+op+': gespeichert, andere Artikel/Boxen unberührt'+(op==='noop'?', Artikel byteweise gleich':''),ok(m)&&others(a,c)===others(b,c)&&JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes)&&(op!=='noop'||JSON.stringify(item(a,c))===JSON.stringify(item(b,c))),m)}
for(const c of ['C'.repeat(65),'toString','__proto__','ab1','AB1']){}
await fill(h,{aCode:'K'.repeat(65),aName:'x'});b=await snap(h);m=await save(h);R('T7 SA-12b bleibt: neue Nummer 65 Zeichen abgelehnt',!ok(m)&&/höchstens 64/.test(m),m);
await fill(h,{aCode:'Q1',aName:'x'.repeat(151)});m=await save(h);R('T7 SA-12b bleibt: Bezeichnung 151 abgelehnt',!ok(m)&&/höchstens 150/.test(m),m);
{const hh=await open0();for(const c of ['__proto__','toString','valueOf','constructor']){await fill(hh,{aCode:c,aName:'R'});m=await save(hh);R('T7 SA-12b bleibt: reservierte Nummer "'+c+'" in leerem Lager abgelehnt',!ok(m)&&/reserviert/.test(m),m)}await hh.b.close()}
await fill(h,{aCode:'Q2',aName:'x',aBarcode:'bc1'});m=await save(h);R('T7 SA-12 bleibt: Barcode Case-Duplikat abgelehnt',!ok(m)&&/Barcode ist bereits vergeben/.test(m),m);
await fill(h,{aCode:'Q3',aName:'x',aBarcode:'__proto__'});m=await save(h);R('T7 SA-12 bleibt: reservierter Barcode abgelehnt',!ok(m)&&/reserviert/.test(m),m);
await fill(h,{aCode:'',aName:'x'});m=await save(h);R('T7 SA-13 bleibt: Einzelmeldung "Artikelnummer fehlt."',/^Artikelnummer fehlt/.test(m),m);
// Scan im Bearbeitungsmodus
await edit(h,'A2');await h.p.evaluate(()=>aBarcodeCamera.click());await h.p.waitForTimeout(150);await h.p.evaluate(()=>window.__cb('SCAN-77'));await h.p.waitForTimeout(250);
R('T7 Scan im Bearbeitungsmodus setzt nur den Barcode',await h.p.evaluate(()=>aBarcode.value==='SCAN-77'&&aCode.value==='A2'&&aName.value==='Art2'));
m=await save(h);R('T7 ... und Speichern übernimmt ihn',ok(m)&&item(await snap(h),'A2').barcode==='SCAN-77',m);
// Export / Import
await h.go('more');const [dl]=await Promise.all([h.p.waitForEvent('download'),h.p.evaluate(()=>jsonExport.click())]);const text=fs.readFileSync(await dl.path(),'utf8');const exp=JSON.parse(text);
const h2=await mk();await h2.p.evaluate(()=>{transaction(s=>{s.items.length=0;s.boxes.length=0})});await h2.go('more');await h2.p.setInputFiles('#jsonImport',{name:'e.json',mimeType:'application/json',buffer:Buffer.from(text)});await h2.p.waitForTimeout(800);await h2.dlg();const s2=await snap(h2);
R('T7 Export/Import: Artikel und Boxen byteweise gleich',JSON.stringify(s2.st.items)===JSON.stringify(exp.items)&&JSON.stringify(s2.st.boxes)===JSON.stringify(exp.boxes));
await edit(h2,'LM');await setf(h2.p,'aMin','700');m=await save(h2);R('T7 Nach Import: Altartikel LM weiter bearbeitbar',ok(m),m);
R('T7 valid() nach allen Aktionen',(await h.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state)))))===true&&(await h2.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state)))))===true);
R('JS T7',h.errs.length===0&&h2.errs.length===0,[...h.errs,...h2.errs].join('|').slice(0,250));await h.b.close();await h2.b.close();
const fl=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',fl.length);fl.forEach(x=>console.log(' -',x[0]));
async function open0(){const {open}=require('./lib');return open()}
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
