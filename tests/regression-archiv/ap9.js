const {open}=require('./lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,220):''))};
const K='lagerpilot_v2_7',PREV='lagerpilot_v2_6',OLD='lagerpilot_demo_v1';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,260),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const A1={code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3};
async function seedItem(h){await h.p.evaluate(a=>{transaction(s=>{s.items.push(a)})},A1)}
async function cfg(h,v){await h.go('more');for(const [k,id] of [['shelf','cfgShelf'],['bay','cfgBay'],['palletMax','cfgPalletMax'],['tare','cfgTare']])await setf(h.p,id,v[k]??'');await h.p.evaluate(()=>cfgSave.click());return txt(h.p,'cfgMessage')}
async function book(h,o){await h.go('book');await setf(h.p,'bookArticle','A1');for(const [k,x] of Object.entries(o))await setf(h.p,k,x);await h.p.evaluate(()=>bookSubmit.click());await h.dlg();return txt(h.p,'bookMessage')}
const gotIn=m=>/gespeichert/.test(m);
(async()=>{
// 1 Neue Lagerdaten
let h=await open();
let c=await h.ev(()=>JSON.parse(JSON.stringify(state.config)));
R('1 Neues Lager: alle vier Werte null (keine stille 800)',JSON.stringify(c)==='{"shelf":null,"bay":null,"palletMax":null,"tare":null}',JSON.stringify(c));
await h.go('more');R('1 Eingabefeld Fachlast leer, Hinweistext sichtbar',(await h.p.evaluate(()=>cfgShelf.value))===''&&/Vor der ersten Einlagerung/.test(await h.p.evaluate(()=>document.getElementById('more').innerText)));
R('1 Frisches Lager nicht gesperrt/kein Banner',!(await h.ev(()=>storageLocked||pickStorageLocked)));
R('1 Alter Warntext "Bekannte Fachlast: 800 kg" steht noch (Info)',true,/Bekannte Fachlast: 800/.test(await h.p.evaluate(()=>document.getElementById('more').innerText)));
await seedItem(h);
// 2 Einlagerung ohne Werte
let b=await snap(h);let m=await book(h,{bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'});
R('2 Einlagerung ohne jede Konfiguration abgelehnt, Meldung nennt Fachlast',!gotIn(m)&&/unvollständig/.test(m)&&/Fachlast/.test(m),m);
R('2 Keine Box angelegt, Zustand unverändert',(await h.ev(()=>state.boxes.length))===0);
// Teilkonfigurationen
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
for(const miss of ['shelf','bay','palletMax','tare']){const hh=await open();await seedItem(hh);
 await hh.p.evaluate(([f,miss])=>{transaction(s=>{Object.assign(s.config,f);s.config[miss]=null})},[FULL,miss]);
 const mm=await book(hh,{bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'});
 R('2 Nur '+miss+' fehlt -> Einlagerung abgelehnt',!gotIn(mm)&&/unvollständig/.test(mm)&&(await hh.ev(()=>state.boxes.length))===0,mm);await hh.b.close()}
// 3 Konfiguration
await h.go('more');
const bad=async(n,v,re)=>{const b0=await snap(h);const mm=await cfg(h,v);const a0=await snap(h);R('3 '+n+' abgelehnt',/Ungültig|muss angegeben/.test(mm)&&(re?re.test(mm):true)&&JSON.stringify(a0.st?.config)===JSON.stringify(b0.st?.config),mm)};
await bad('Fachlast leer (andere gesetzt)',{bay:2000,palletMax:1000,tare:25},/Fachlast/);
await bad('Fachlast 0',{...FULL,shelf:0},/shelf/);
await bad('Fachlast -5',{...FULL,shelf:-5},/shelf/);
await bad('Feldlast 0',{...FULL,bay:0},/bay/);
await bad('Palette -1',{...FULL,palletMax:-1},/palletMax/);
await bad('Leergewicht -1',{...FULL,tare:-1},/tare/);
R('3 Nach Fehlversuchen weiterhin alles null',JSON.stringify(await h.ev(()=>state.config))==='{"shelf":null,"bay":null,"palletMax":null,"tare":null}');
// nur Fachlast speichern
m=await cfg(h,{shelf:800});R('3 Nur Fachlast speichern: erlaubt (Teilkonfiguration)',/gespeichert/.test(m),m);
m=await book(h,{bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'});R('3 Mit nur Fachlast weiter Einlagerung gesperrt',!gotIn(m)&&/unvollständig/.test(m),m);
R('3 Hinweis: Teilkonfiguration zeigt Nutzer, was fehlt? (Meldung nennt alle vier Begriffe, nicht gezielt)',true,m);
m=await cfg(h,{shelf:800,bay:2000,palletMax:1000,tare:0});R('3 Vollständig mit Leergewicht 0 gespeichert',/gespeichert/.test(m),m);
m=await cfg(h,FULL);R('3 Vollständig (800/2000/1000/25) gespeichert',/gespeichert/.test(m),m);
let s1=await snap(h);R('3 Persistiert + Historieneintrag "Traglastparameter geändert"',JSON.stringify(s1.st.config)===JSON.stringify(FULL)&&/Traglastparameter/.test(s1.st.history[0].text),JSON.stringify(s1.st.config));
await h.p.reload();await h.p.waitForTimeout(500);await h.go('more');
R('3 Nach Reload Felder gefüllt',(await h.p.evaluate(()=>[cfgShelf.value,cfgBay.value,cfgPalletMax.value,cfgTare.value].join('/')))==='800/2000/1000/25');
m=await cfg(h,{shelf:800,bay:2000,palletMax:1000,tare:25.5});R('3 Dezimal-Leergewicht 25,5 ok',/gespeichert/.test(m)&&(await h.ev(()=>state.config.tare))===25.5);
await cfg(h,FULL);
// 4 Einlagerung
m=await book(h,{bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'});R('4 Einlagerung nach Konfiguration (10×2+25)',gotIn(m)&&(await h.ev(()=>state.boxes.find(b=>b.place==='H4A-1-1').qty))===10,m);
m=await book(h,{bookAction:'in',bookPlace:'H4A-1-2',bookQty:'100'});R('4 Gewicht 100×2+25=225 ok (Max 100)',gotIn(m),m);
await h.p.evaluate(()=>{transaction(s=>{s.items.find(a=>a.code==='A1').weight=8})});
m=await book(h,{bookAction:'in',bookPlace:'H4A-1-3',bookQty:'100'});R('4 Fachlast 100×8+25=825>800 abgelehnt',!gotIn(m)&&/Fachlast/.test(m),m);
m=await book(h,{bookAction:'in',bookPlace:'H4A-1-3',bookQty:'96'});R('4 96×8+25=793 ok',gotIn(m),m);
// Folgewirkung: Konfig senken mit Bestand
b=await snap(h);m=await cfg(h,{shelf:100,bay:2000,palletMax:1000,tare:25});
const lowered=/gespeichert/.test(m);R('Info Fachlast 100 gesetzt obwohl Boxen 793 kg tragen (keine Prüfung bestehender Boxen)',true,'akzeptiert='+lowered);
if(lowered){m=await book(h,{bookAction:'out',bookPlace:'H4A-1-3',bookQty:'1'});R('Auswirkung: Ausbuchen aus überlasteter Box weiter möglich',gotIn(m),m);
 m=await book(h,{bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-1',bookQty:'1'});R('Auswirkung: Umlagern mit Überlast-Zielplatz geprüft (abgelehnt erwartet)',true,m)}
await cfg(h,FULL);
R('JS-Fehler Teil 1–4',h.errs.length===0,h.errs.join('|'));await h.b.close();
// 5 Bestehende Daten
{const hh=await open();
 const places=await hh.p.evaluate(()=>JSON.parse(JSON.stringify(state.places)));// AP5.4: vollständige Platzliste (valid() verlangt für jede Box einen vorhandenen Platz); vorher places:{} -> Speicher wurde zu Recht abgelehnt
 const v27=(shelf)=>({schema:27,places,items:[A1],boxes:[{id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0}],history:[],inventoryLogs:[],qrMap:{},config:{shelf,bay:2000,palletMax:1000,tare:25},legacyOrders:[]});
 for(const [n,sh,exp] of [['v2.7 mit Fachlast 800',800,800],['v2.7 mit Fachlast 600',600,600],['v2.7 mit Fachlast null',null,null]]){
  await hh.p.evaluate(([k,d])=>{localStorage.clear();localStorage.setItem(k,JSON.stringify(d))},[K,v27(sh)]);await hh.p.reload();await hh.p.waitForTimeout(500);
  const cf=await hh.ev(()=>state.config.shelf);R('5 '+n+' bleibt unverändert',cf===exp&&!(await hh.ev(()=>storageLocked)),cf);
  const mm=await book(hh,{bookAction:'in',bookPlace:'H4A-1-1',bookQty:'5'});R('5 '+n+': Einlagern '+(exp===null?'gesperrt':'möglich'),exp===null?(!gotIn(mm)&&/unvollständig/.test(mm)):gotIn(mm),mm);
  if(exp===null){const o=await book(hh,{bookAction:'out',bookPlace:'H4A-1-1',bookQty:'2'});R('5 Fachlast null: Ausbuchen bestehender Ware weiter möglich',gotIn(o),o)}}
 // v2.6 ohne shelf
 const v26={schema:26,places:{},items:[A1],boxes:[{id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0}],history:[],inventoryLogs:[],qrMap:{},config:{bay:null,palletMax:null,tare:null},legacyOrders:[]};
 await hh.p.evaluate(([k,d])=>{localStorage.clear();localStorage.setItem(k,JSON.stringify(d))},[PREV,v26]);await hh.p.reload();await hh.p.waitForTimeout(500);
 R('5 v2.6 ohne shelf -> Migration ergänzt Default 800 (Info, bestehende Daten)',true,JSON.stringify(await hh.ev(()=>state.config)));
 R('5 v2.6-Migration: Original unverändert',(await hh.p.evaluate(k=>localStorage.getItem(k),PREV))===JSON.stringify(v26));
 // Legacy demo_v1
 const leg={items:[{code:'L1',name:'L',barcode:'',unit:'STK',pack:1,weight:1,max:10,minStock:null}],boxes:[{place:'H4A-1-1',code:'L1',available:3,blocked:0}],history:[],places:{}};
 await hh.p.evaluate(([k,d])=>{localStorage.clear();localStorage.setItem(k,JSON.stringify(d))},[OLD,leg]);await hh.p.reload();await hh.p.waitForTimeout(500);
 R('5 Legacy-Hauptschlüssel lädt, Fachlast (Info)',!(await hh.ev(()=>storageLocked)),JSON.stringify(await hh.ev(()=>state.config)));
 // Import
 await hh.p.evaluate(()=>localStorage.clear());await hh.p.reload();await hh.p.waitForTimeout(500);
 const imp=async d=>hh.p.evaluate(d=>{try{const r=importCheck?importCheck(d):null;return 'x'}catch(e){return e.message}},d);
 R('JS-Fehler Teil 5',hh.errs.length===0,hh.errs.join('|'));await hh.b.close()}
// 6 Andere Auswirkungen: Inventur, Picking, QS, Export/Import bei null-Config
{const hh=await open();await seedItem(hh);
 await hh.p.evaluate(()=>{transaction(s=>{s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0})})});
 await hh.go('inventory');for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'12'}))await setf(hh.p,k,x);await hh.p.evaluate(()=>invCompare.click());await hh.p.evaluate(()=>invCommit.click());await hh.dlg();
 R('6 Inventur-Erhöhung ohne Lastdaten (Info: erlaubt/abgelehnt)',true,'qty='+await hh.ev(()=>state.boxes[0].qty)+' '+await txt(hh.p,'invResult'));
 const ex=await hh.p.evaluate(()=>{try{return JSON.stringify(exportData?exportData():'')}catch(e){return 'ERR '+e.message}});
 R('6 Startseite/Mehr rendern ohne Fehler bei Null-Config',hh.errs.length===0,hh.errs.join('|'));
 const o=await book(hh,{bookAction:'out',bookPlace:'H4A-1-1',bookQty:'1'});R('6 Ausbuchen ohne Lastdaten',gotIn(o),o);
 const mv=await book(hh,{bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-1',bookQty:'1'});R('6 Umlagern ohne Lastdaten (abgelehnt wegen Lastprüfung erwartet)',!gotIn(mv),mv);
 await hh.go('home');R('6 Startseite zeigt Hinweis auf fehlende Traglastkonfiguration? (Info)',true,/Traglast|Konfig/i.test(await hh.p.evaluate(()=>document.getElementById('home').innerText)));
 await hh.b.close()}
// Neuer Browser ohne Interaktion: Demo/Home
{const hh=await open();await hh.go('home');R('6 Frischer Start: Home rendert, keine JS-Fehler',hh.errs.length===0,hh.errs.join('|'));
 // Export + Import Roundtrip mit shelf null
 const rt=await hh.p.evaluate(()=>{try{const d=JSON.parse(JSON.stringify(state));return valid(d)}catch(e){return 'ERR '+e.message}});R('6 valid() akzeptiert Zustand mit Fachlast null (Roundtrip)',rt===true,rt);await hh.b.close()}
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
