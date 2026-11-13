const {open}=require('./lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,240):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,300),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const ITEMS=[{code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3},{code:'A2',name:'Art2',barcode:'BC2',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'A3',name:'Art3',barcode:'',unit:'STK',pack:1,weight:1,max:50,min:null}];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0}];
async function mk(){const h=await open();await h.p.evaluate(([cfg,it,bx])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...it);s.boxes.push(...bx)})},[FULL,ITEMS,BOX]);
 await h.p.evaluate(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video id=fakevid></video>';window.__cb=cb}async stop(){}async clear(){}}});return h}
const form=h=>h.p.evaluate(()=>({aName:aName.value,aCode:aCode.value,aBarcode:aBarcode.value,aUnit:aUnit.value,aPack:aPack.value,aWeight:aWeight.value,aMax:aMax.value,aMin:aMin.value}));
async function fill(h,o){await h.go('articles');const base={aName:'',aCode:'',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'',aMax:'',aMin:''};for(const [k,x] of Object.entries({...base,...o}))await setf(h.p,k,x)}
async function scan(h,code){await h.go('articles');await h.p.evaluate(()=>aBarcodeCamera.click());await h.p.waitForTimeout(150);
 const had=await h.p.evaluate(()=>typeof window.__cb);await h.p.evaluate(c=>window.__cb&&window.__cb(c),code);await h.p.waitForTimeout(250);return {had,msg:await txt(h.p,'articleScanMessage'),cls:await h.p.evaluate(()=>articleScanMessage.className)}}
const save=async h=>{await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')};
const ok=m=>/Artikel gespeichert/.test(m);
(async()=>{
let h=await mk();
// 1 bekannter Barcode bei ausgefülltem Formular
await fill(h,{aName:'Mein Neuer',aCode:'N9',aUnit:'P',aPack:'12',aWeight:'3',aMax:'20',aMin:'2'});
let b=await snap(h);let r=await scan(h,'BC1');let f=await form(h);let a=await snap(h);
R('1 Kamera-Callback erreicht',r.had==='function');
R('1 Artikelnummer, Bezeichnung, Einheit, Pack, Gewicht, Max, Min unverändert',f.aCode==='N9'&&f.aName==='Mein Neuer'&&f.aUnit==='P'&&f.aPack==='12'&&f.aWeight==='3'&&f.aMax==='20'&&f.aMin==='2',JSON.stringify(f));
R('1 Hinweis nennt erkannten Artikel und dass Eingaben bleiben',/Art1/.test(r.msg)&&/A1/.test(r.msg)&&/unverändert/.test(r.msg),r.msg);
R('1 Scan allein speichert nichts (localStorage byteweise gleich)',a.raw===b.raw);
R('1 Barcode-Feld = gescannter Code (Info)',true,'aBarcode='+f.aBarcode);
let m=await save(h);a=await snap(h);
R('1 Speichern mit fremdem Barcode BC1 abgelehnt, nichts angelegt/geändert',!ok(m)&&/bereits einem anderen Artikel/.test(m)&&a.raw===b.raw,m);
R('1 Formular bleibt nach Ablehnung erhalten',(await form(h)).aCode==='N9');
R('1 Hinweis beim Scan warnt NICHT, dass Barcode schon vergeben ist (Info/Verbesserung)',true,/vergeben|bereits|Konflikt/.test(r.msg)?'warnt':'warnt nicht – Fehler erst beim Speichern');
// 2 unbekannter Barcode
await fill(h,{aName:'Mein Neuer',aCode:'N9',aWeight:'3',aMax:'20',aMin:'2'});
r=await scan(h,'NEU-4711');f=await form(h);
R('2 Unbekannter Barcode: nur Barcode-Feld gesetzt, Rest unverändert',f.aBarcode==='NEU-4711'&&f.aCode==='N9'&&f.aName==='Mein Neuer'&&f.aWeight==='3',JSON.stringify(f));
R('2 Warnhinweis "Kein passender Artikel…"',/Kein passender Artikel/.test(r.msg)&&/warning/.test(r.cls),r.msg+' | '+r.cls);
b=await snap(h);m=await save(h);a=await snap(h);const n=a.st.items.find(x=>x.code==='N9');
R('2 Speichern legt N9 mit Barcode NEU-4711 an, genau 1 Artikel, 1 Historie, Boxen unverändert',ok(m)&&n&&n.barcode==='NEU-4711'&&n.name==='Mein Neuer'&&a.st.items.length===b.st.items.length+1&&a.st.history.length===b.st.history.length+1&&JSON.stringify(a.st.boxes)===JSON.stringify(b.st.boxes),m);
R('2 Formular nach Speichern geleert, danach Scan setzt nur Barcode',(await form(h)).aCode===''&&(await form(h)).aBarcode==='');
// 3 Bearbeiten eines vorhandenen Artikels
await h.go('articles');await h.p.evaluate(()=>document.querySelector('[data-edit="A1"]').click());
f=await form(h);R('3 Bearbeiten lädt A1 ins Formular',f.aCode==='A1'&&f.aName==='Art1'&&f.aBarcode==='BC1'&&f.aWeight==='2',JSON.stringify(f));
b=await snap(h);r=await scan(h,'XYZ-1');f=await form(h);
R('3 Scan unbekannt beim Bearbeiten: nur Barcode ändert sich (A1/Art1/2/100/3 bleiben)',f.aBarcode==='XYZ-1'&&f.aCode==='A1'&&f.aName==='Art1'&&f.aWeight==='2'&&f.aMax==='100'&&f.aMin==='3',JSON.stringify(f));
R('3 Vor dem Speichern bleibt der gespeicherte Artikel unverändert',(await snap(h)).raw===b.raw);
m=await save(h);a=await snap(h);const a1=a.st.items.find(x=>x.code==='A1');
R('3 Speichern: A1 hat Barcode XYZ-1, Rest unverändert, Bestand 50 unverändert',ok(m)&&a1.barcode==='XYZ-1'&&a1.name==='Art1'&&a1.weight===2&&a1.max===100&&a1.min===3&&a.st.boxes.find(x=>x.id==='b1').qty===50,m);
// Bearbeiten A2, Scan Barcode von A1 (jetzt XYZ-1) und anderer bekannter
for(const [n,code] of [['Barcode eines anderen Artikels (XYZ-1 von A1)','XYZ-1'],['Barcode von A3? (leer) -> Artikelnummer A3 eines anderen Artikels','A3'],['Artikelnummer von A1','A1'],['eigene Artikelnummer A2 (Barcode=Artikelnummer)','A2']]){
 await h.go('articles');await h.p.evaluate(()=>document.querySelector('[data-edit="A2"]').click());b=await snap(h);r=await scan(h,code);f=await form(h);
 R('3/4 A2 bearbeiten, Scan '+n+': Code/Name bleiben A2/Art2',f.aCode==='A2'&&f.aName==='Art2'&&f.aWeight==='1',JSON.stringify(f)+' | '+r.msg.slice(0,80));
 m=await save(h);a=await snap(h);R('3/5 ... Speichern abgelehnt, A2 und alles andere unverändert',!ok(m)&&a.raw===b.raw,m)}
// eigener Barcode erneut scannen
await h.go('articles');await h.p.evaluate(()=>document.querySelector('[data-edit="A2"]').click());b=await snap(h);r=await scan(h,'BC2');m=await save(h);a=await snap(h);
R('4 Eigenen Barcode BC2 erneut scannen + Speichern: ok, A2 unverändert',ok(m)&&JSON.stringify(a.st.items.find(x=>x.code==='A2'))===JSON.stringify(b.st.items.find(x=>x.code==='A2')),m);
// 5 Weitere Validierungen mit Scancodes
for(const [n,code,re] of [['Lagerplatz-QR-Text H4A-1-1','H4A-1-1',/Lagerplatz/],['Leerzeichen/Zeilenumbruch " BC9 \\n"',' BC9 \n',null],['sehr lang (5000 Zeichen)','X'.repeat(5000),null],['<img onerror=1>','<img src=x onerror=alert(1)>',null],['constructor','constructor',null],['__proto__','__proto__',null]]){
 await fill(h,{aName:'T',aCode:'T'+Math.floor(Math.random()*1e6),aWeight:'1',aMax:'5'});b=await snap(h);r=await scan(h,code);m=await save(h);a=await snap(h);
 const item=a.st.items[a.st.items.length-1];
 if(re)R('5 Scan "'+n+'": Speichern abgelehnt, nichts geändert',!ok(m)&&a.raw===b.raw&&re.test(m),m);
 else R('5 Scan "'+n+'": kein Absturz; Ergebnis ('+(ok(m)?'gespeichert, Barcode='+JSON.stringify(item.barcode).slice(0,40):'abgelehnt: '+m.slice(0,60))+')',h.errs.length===0,'');
}
R('5 HTML im Barcode wird nicht ausgeführt (kein Dialog/XSS)',!(await h.p.evaluate(()=>window.__dlg.some(d=>/alert/.test(d)))));
// Doppelt: gleicher neuer Barcode zweimal
await fill(h,{aName:'D1',aCode:'D1',aWeight:'1',aMax:'5'});await scan(h,'DUP-1');m=await save(h);
await fill(h,{aName:'D2',aCode:'D2',aWeight:'1',aMax:'5'});await scan(h,'DUP-1');b=await snap(h);m=await save(h);a=await snap(h);
R('5 Zweiter Artikel mit bereits vergebenem DUP-1 abgelehnt, nichts angelegt',!ok(m)&&a.raw===b.raw&&!a.st.items.some(x=>x.code==='D2'),m);
await fill(h,{aName:'D3',aCode:'D3',aWeight:'1',aMax:'5'});await scan(h,'dup-1');m=await save(h);
R('5 Info: Barcode "dup-1" (andere Schreibweise) wird als eigener Barcode akzeptiert',true,'ok='+ok(m));
// 6 Abbrechen / erneut scannen
await fill(h,{aName:'Z',aCode:'Z1',aWeight:'1',aMax:'5'});await scan(h,'ZZ-1');
await h.p.evaluate(()=>aClear.click());f=await form(h);R('6 Abbrechen (Leeren) setzt alle Felder inkl. Barcode zurück',Object.entries(f).every(([k,v])=>k==='aUnit'||k==='aPack'?true:v===''),JSON.stringify(f));
r=await scan(h,'ZZ-2');f=await form(h);R('6 Erneutes Scannen nach Abbrechen: nur Barcode gesetzt',f.aBarcode==='ZZ-2'&&f.aCode===''&&f.aName==='');
r=await scan(h,'ZZ-3');f=await form(h);R('6 Nochmal scannen überschreibt nur das Barcode-Feld',f.aBarcode==='ZZ-3'&&f.aCode==='');
// zweiter Callback nach Stop ohne Neustart
await h.p.evaluate(()=>window.__cb('LATE-1'));await h.p.waitForTimeout(200);R('6 Später/doppelter Callback nach Kamerastop ohne Wirkung',(await form(h)).aBarcode==='ZZ-3');
await h.p.evaluate(()=>aBarcodeCamera.click());await h.p.waitForTimeout(100);await h.p.evaluate(()=>aBarcodeStop.click());await h.p.waitForTimeout(150);
await h.p.evaluate(()=>window.__cb&&window.__cb('AFTERSTOP'));await h.p.waitForTimeout(200);R('6 Scan nach "Kamera stoppen" ohne Wirkung',(await form(h)).aBarcode==='ZZ-3');
// Tippen (Handscanner Tastatur) im Barcode-Feld
await fill(h,{aName:'H',aCode:'H1',aWeight:'1',aMax:'5'});b=await snap(h);await h.p.focus('#aBarcode');await h.p.keyboard.type('HW-123');await h.p.keyboard.press('Enter');f=await form(h);a=await snap(h);
R('6 Handscanner-Eingabe (Tippen + Enter) ins Barcode-Feld: nur Barcode, kein Autospeichern',f.aBarcode==='HW-123'&&f.aCode==='H1'&&a.raw===b.raw,JSON.stringify(f));
// Demo-Artikel Treffer
const dm=await h.p.evaluate(()=>({c:DEMO_ITEMS[0].code,b:DEMO_ITEMS[0].barcode||'',n:DEMO_ITEMS[0].name}));
await fill(h,{aName:'Eigen',aCode:'E1',aWeight:'1',aMax:'5'});r=await scan(h,dm.c);f=await form(h);
R('4 Demo-Katalogtreffer: Formular unverändert (Info: Meldung "'+r.msg.slice(0,70)+'")',f.aCode==='E1'&&f.aName==='Eigen',JSON.stringify(f));
// Leeres Formular + bekannter Barcode: kein Autofill mehr
await h.go('articles');await h.p.evaluate(()=>aClear.click());r=await scan(h,'BC2');f=await form(h);
R('4 Leeres Formular + bekannter Barcode: Artikel wird nicht automatisch geladen (Funktionsänderung, Info)',f.aCode===''&&f.aName==='',JSON.stringify(f)+' | '+r.msg);
// 7 Scan in anderen Bereichen unverändert
await h.go('inventory');await h.p.evaluate(()=>invArticleCamera.click());await h.p.waitForTimeout(150);await h.p.evaluate(()=>window.__cb('BC2'));await h.p.waitForTimeout(250);
R('7 Inventur-Artikelscan setzt Artikelauswahl weiter',(await h.p.evaluate(()=>invArticle.value))==='A2',await txt(h.p,'invScanMessage'));
await h.go('inventory');await h.p.evaluate(()=>invPlaceCamera.click());await h.p.waitForTimeout(150);await h.p.evaluate(()=>window.__cb('H4A-1-2'));await h.p.waitForTimeout(250);
R('7 Inventur-Platzscan weiter ok',(await h.p.evaluate(()=>invPlace.value))==='H4A-1-2');
R('JS-Fehler gesamt',h.errs.length===0,h.errs.join('|').slice(0,300));
await h.b.close();
const fl=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',fl.length);fl.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
