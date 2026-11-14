// AP5.4 – Export/Import: Round-Trip, Fehlerfälle, Sicherung vor Import, Fehlerinjektion, Mehrfachimport.
// Aufruf: BASE=http://localhost:8123/index.html node tests/import-export/ap54-import-export.js
// Reine Prüfung; ändert keinen Anwendungscode. Jede Instanz läuft in einem eigenen Browser-Kontext (eigener Speicher).
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html';const K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1',BI='lagerpilot_before_import';
let pass=0,fail=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,200):''))};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'ap54-'));
const pickOrder=(id,assignee)=>({id,lines:2,assignee,status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:[{sku:'ART-1',name:'Artikel 1',place:'H4B-1-1',qty:20,actual:20,unitWeight:1},{sku:'ART-2',name:'Artikel 2',place:'H4B-1-2',qty:5,actual:null,unitWeight:2.5}],checkedLines:[0],scannedLines:[0,1],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:40,tolerancePercent:1.5}});
const pickData=tag=>({people:[{name:'Max',device:'Scanner '+tag,active:true,lastSeen:1700000000000}],roster:['Max','Peter'],orders:[pickOrder('T-'+tag,'Max')],session:'Max',testStatus:{Max:true}});
// Instanz mit eigenem Speicher; seed(tag) baut Lagerdaten + Kommissionierdaten
async function app(tag,withPick=true){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900},acceptDownloads:true});const p=await ctx.newPage();
 const st={errs:[],dlg:[],downloads:[],confirm:true,navs:0};p.on('pageerror',e=>st.errs.push(e.message));p.on('framenavigated',f=>{if(f===p.mainFrame())st.navs++});
 p.on('dialog',d=>{st.dlg.push(d.type()+':'+d.message());d.type()==='confirm'&&!st.confirm?d.dismiss():d.accept()});
 p.on('download',async d=>{try{const f=path.join(TMP,Date.now()+'-'+Math.random().toString(36).slice(2)+'-'+d.suggestedFilename());await d.saveAs(f);st.downloads.push({name:d.suggestedFilename(),file:f,text:fs.readFileSync(f,'utf8')})}catch(e){st.errs.push('download '+e.message)}});
 await p.goto(BASE);await p.waitForTimeout(300);
 await p.evaluate(tag=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'A-'+tag,name:'Artikel '+tag,barcode:'BC-'+tag,unit:'STK',pack:1,weight:2,max:100,min:3},{code:'P-'+tag,name:'Pack '+tag,barcode:'4000'+tag.length,unit:'P',pack:12,weight:30,max:50,min:null});s.boxes.push({id:'b1'+tag,place:'H4A-1-1',code:'A-'+tag,qty:50,blocked:0},{id:'b2'+tag,place:'H4A-1-2',code:'P-'+tag,qty:3,blocked:0},{id:'b3'+tag,place:'H4A-2-1',code:'A-'+tag,qty:7,blocked:1});s.qrMap['QR-'+tag]='H4A-1-1'})},tag);
 if(withPick){await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,pickData(tag)]);}
 await p.reload();await p.waitForTimeout(400);st.navs=0;return {b,p,st}}
const raw=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const clickExport=async(a)=>{const n=a.st.downloads.length;await a.p.evaluate(()=>{tab('more');document.getElementById('jsonExport').click()});for(let i=0;i<30&&a.st.downloads.length===n;i++)await a.p.waitForTimeout(100);return a.st.downloads[a.st.downloads.length-1]};
const importFile=async(a,file,{confirm=true,wait=true}={})=>{a.st.confirm=confirm;a.st.dlg.length=0;const n0=a.st.navs,d0=a.st.downloads.length;await a.p.evaluate(()=>tab('more'));
 const nav=confirm&&wait?a.p.waitForNavigation({timeout:6000}).then(()=>true).catch(()=>false):Promise.resolve(false);await a.p.setInputFiles('#jsonImport',file);const reloaded=await nav;await a.p.waitForTimeout(wait?700:400);
 const msg=await a.p.evaluate(()=>document.getElementById('backupMessage')?.textContent||'').catch(()=>'');return {reloaded,msg,navs:a.st.navs-n0,dl:a.st.downloads.length-d0,dlg:a.st.dlg.slice()}};
const wr=(name,obj)=>{const f=path.join(TMP,name);fs.writeFileSync(f,typeof obj==='string'?obj:JSON.stringify(obj));return f};
const canon=o=>JSON.stringify(o,Object.keys(o).sort());
(async()=>{
// ---------- 1 Vollständiger Export ----------
const A=await app('X1');const aRawK=await raw(A.p,K),aRawP=await raw(A.p,PK);const exA=await clickExport(A);const stA=JSON.parse(aRawK),pkA=JSON.parse(aRawP);const fileA=exA&&JSON.parse(exA.text);
R('1 Export erzeugt Datei lagerpilot-2.7.3-sicherung-DATUM.json',!!exA&&/^lagerpilot-2\.7\.3-sicherung-\d{4}-\d{2}-\d{2}\.json$/.test(exA.name),exA&&exA.name);
const {_pick,...fileState}=fileA||{};
for(const k of ['items','boxes','places','qrMap','config','history','inventoryLogs','legacyOrders'])R('1 Export enthält '+k+' identisch zum Speicher',JSON.stringify(fileState[k])===JSON.stringify(stA[k]),k+': '+(Array.isArray(stA[k])?stA[k].length:Object.keys(stA[k]||{}).length));
R('1 Export: Artikel mit Barcodes, Pack- und Stückartikel vollständig',fileState.items.some(i=>i.barcode==='BC-X1')&&fileState.items.some(i=>i.unit==='P'&&i.pack===12));
R('1 Export: Boxen (inkl. gesperrter Box) und QR-Zuordnung vollständig',fileState.boxes.length===3&&fileState.boxes.some(b=>b.blocked===1)&&fileState.qrMap['QR-X1']==='H4A-1-1');
R('1 Export: Kommissionierdaten (_pick) identisch zum Speicher, Aufträge/Verpackung/Toleranz vollständig',JSON.stringify(_pick)===JSON.stringify(pkA)&&_pick.orders[0].packaging.tolerancePercent===1.5&&_pick.orders[0].items.length===2);
R('1 Export: Zeitstempel letzter Sicherung gesetzt',!!(await raw(A.p,'lagerpilot_last_backup')));
R('1 Export verändert Lager- und Kommissionierdaten nicht (Speicher vor/nach Export byte-gleich)',await raw(A.p,K)===aRawK&&await raw(A.p,PK)===aRawP&&A.st.errs.length===0);
// Export ohne Kommissionierdaten im Speicher
const NP=await app('NP',false);const exNP=await clickExport(NP);const fNP=JSON.parse(exNP.text);R('1 Export ohne gespeicherte Kommissionierdaten: _pick mit Standardwerten, kein Fehler',Array.isArray(fNP._pick&&fNP._pick.orders)&&NP.st.errs.length===0,Array.isArray(fNP._pick&&fNP._pick.orders)?fNP._pick.orders.length+' Aufträge':'kein _pick');
// CSV
{const n=A.st.downloads.length;await A.p.evaluate(()=>document.getElementById('csvExport').click());for(let i=0;i<30&&A.st.downloads.length===n;i++)await A.p.waitForTimeout(100);const c=A.st.downloads[A.st.downloads.length-1];const lines=c.text.replace(/^﻿/,'').split('\r\n');R('1 CSV-Export: Kopfzeile und eine Zeile je Box',lines[0]==='"Artikelnummer";"Bezeichnung";"Platz";"Box-ID";"Menge";"Einheit";"Stueck";"Gesperrt"'&&lines.length===1+stA.boxes.length,lines.length+' Zeilen');
 R('1 CSV: Packartikel 3 Pack = 36 Stück',lines.some(l=>l.includes('"P-X1"')&&l.includes('"3"')&&l.includes('"36"')))}
// ---------- 2 Round-Trip in neue Instanz mit anderen Daten ----------
const B=await app('Y2');const bBeforeInv=await raw(B.p,K),bBeforePick=await raw(B.p,PK);
const r2=await importFile(B,exA.file);
R('2 Import: Rückfrage erschien und nennt Sicherung vor dem Import',r2.dlg.some(d=>/^confirm:.*ersetzt die aktuellen lokalen Lager.*bisherige Stand wird zuerst gesichert/s.test(d)),r2.dlg[0]);
R('2 Import: Seite wurde neu geladen',r2.reloaded);
const bAfter=JSON.parse(await raw(B.p,K));
for(const k of ['items','boxes','places','qrMap','config','history','inventoryLogs','legacyOrders','schema'])R('2 Round-Trip: '+k+' identisch zum exportierten Stand',JSON.stringify(bAfter[k])===JSON.stringify(stA[k]));
R('2 Round-Trip: Kommissionierdaten identisch (Aufträge, Verpackung, Toleranz, Personen)',await raw(B.p,PK)===JSON.stringify(pkA));
R('2 Round-Trip: zweite Instanz enthält keine Reste der vorherigen Daten (Artikel Y2/Boxen b1Y2)',!bAfter.items.some(i=>i.code.endsWith('Y2'))&&!bAfter.boxes.some(b=>b.id.endsWith('Y2')));
R('2 Round-Trip: App läuft danach ohne Sperre und ohne JS-Fehler',!(await B.p.evaluate(()=>storageLocked))&&B.st.errs.length===0,B.st.errs.join('|'));
// ---------- 3 Sicherung vor Import ----------
const bi=JSON.parse(await raw(B.p,BI)||'null');
R('3 Sicherheitskopie lagerpilot_before_import enthält den vorherigen Lagerstand byte-gleich',!!bi&&bi.inventory===bBeforeInv,bi?'':'fehlt');
R('3 Sicherheitskopie enthält die vorherigen Kommissionierdaten byte-gleich',!!bi&&bi.picking===bBeforePick);
const pre=B.st.downloads.find(d=>/^lagerpilot-vor-import-/.test(d.name));
R('3 Datei „vor-import“ wurde heruntergeladen und entspricht dem vorherigen Stand (Lager + _pick)',!!pre&&JSON.stringify(JSON.parse(pre.text))===JSON.stringify({...JSON.parse(bBeforeInv),_pick:JSON.parse(bBeforePick)}),pre&&pre.name);
// Wiederherstellung über die Datei: Import der Sicherung vor Import bringt den alten Stand zurück
const r3=await importFile(B,pre.file);const back=JSON.parse(await raw(B.p,K));
R('3 Wiederherstellung: Import der Datei „vor-import“ stellt den Stand vor dem ersten Import wieder her',r3.reloaded&&JSON.stringify(back.items)===JSON.stringify(JSON.parse(bBeforeInv).items)&&JSON.stringify(back.boxes)===JSON.stringify(JSON.parse(bBeforeInv).boxes)&&await raw(B.p,PK)===bBeforePick);
// ---------- 4 Abbruch ----------
const C=await app('Z3');const cInv=await raw(C.p,K),cPick=await raw(C.p,PK);const r4=await importFile(C,exA.file,{confirm:false});
R('4 Abbruch der Rückfrage: Lager- und Kommissionierdaten byte-gleich',await raw(C.p,K)===cInv&&await raw(C.p,PK)===cPick);
R('4 Abbruch: keine Sicherheitskopie angelegt, kein Download, kein Neuladen',(await raw(C.p,BI))===null&&r4.dl===0&&r4.navs===0,'dl='+r4.dl+' navs='+r4.navs);
// ---------- 5 Ungültige / beschädigte Dateien ----------
const good=JSON.parse(exA.text);const mut=f=>{const o=JSON.parse(JSON.stringify(good));f(o);return o};
const bad=[
 ['kein JSON (Text)','das ist keine json datei'],['abgeschnittene Datei',exA.text.slice(0,Math.floor(exA.text.length/2))],['leere Datei',''],['JSON null','null'],['JSON Array','[1,2,3]'],['leeres Objekt','{}'],
 ['Schema 99',mut(o=>{o.schema=99})],['items kein Array',mut(o=>{o.items={}})],['Box mit unbekanntem Artikel',mut(o=>{o.boxes[0].code='GIBT-ES-NICHT'})],['Box auf ungültigem Platz',mut(o=>{o.boxes[0].place='XX-9-9'})],
 ['Box mit negativer Menge',mut(o=>{o.boxes[0].qty=-5})],['Box mit Dezimalmenge 1,5',mut(o=>{o.boxes[0].qty=1.5})],['Box mit Textmenge',mut(o=>{o.boxes[0].qty='50'})],['history als Objekt',mut(o=>{o.history={}})],
 ['places als Array',mut(o=>{o.places=[]})],['qrMap mit ungültigem Platz',mut(o=>{o.qrMap['QR-X']='NIRGENDWO'})],['config.shelf negativ',mut(o=>{o.config.shelf=-1})],['config.shelf als Text',mut(o=>{o.config.shelf='abc'})],
 ['_pick: orders als Text',mut(o=>{o._pick.orders='x'})],['_pick: ungültiger Status',mut(o=>{o._pick.orders[0].status='Kaputt'})],['_pick: Positionsmenge 1,5',mut(o=>{o._pick.orders[0].items[0].qty=1.5})],['_pick: session fehlt',mut(o=>{delete o._pick.session})],['_pick: null',mut(o=>{o._pick=null})]];
const D=await app('V5');const dInv=await raw(D.p,K),dPick=await raw(D.p,PK);let i5=0;
for(const [name,content] of bad){const f=wr('bad'+(i5++)+'.json',content);const r=await importFile(D,f,{wait:false});
 const same=await raw(D.p,K)===dInv&&await raw(D.p,PK)===dPick&&(await raw(D.p,BI))===null;
 R('5 Ungültig „'+name+'“: abgelehnt mit Fehlermeldung, kein Neuladen/Download/Rückfrage, Speicher byte-gleich, keine Sicherheitskopie',r.msg.length>0&&!r.reloaded&&r.navs===0&&r.dl===0&&!r.dlg.some(x=>/^confirm:/.test(x))&&same,r.msg.slice(0,90)+(same?'':' | SPEICHER VERÄNDERT'))}
R('5 Nach allen Fehlversuchen: App entsperrt, keine JS-Fehler',!(await D.p.evaluate(()=>storageLocked))&&D.st.errs.length===0,D.st.errs.join('|'));
// ---------- 6 Fehlerinjektion beim Schreiben ----------
async function inject(tag,failFn){const E=await app(tag);const eInv=await raw(E.p,K),ePick=await raw(E.p,PK);await E.p.evaluate(f=>{const o=Storage.prototype.setItem;window.__n={};Storage.prototype.setItem=function(k,v){window.__n[k]=(window.__n[k]||0)+1;if((new Function('k','n','return '+f))(k,window.__n[k]))throw new DOMException('Simulierter Speicherfehler','QuotaExceededError');return o.call(this,k,v)}},failFn);
 const r=await importFile(E,exA.file,{wait:false});await E.p.waitForTimeout(500);return {E,r,eInv,ePick}}
{const {E,r,eInv,ePick}=await inject('F6a',"k==='lagerpilot_before_import'");R('6a Sicherheitskopie nicht speicherbar: Import abgebrochen, Meldung, Daten byte-gleich',!r.reloaded&&/Sicherheitskopie vor Import konnte nicht gespeichert werden/.test(r.msg)&&await raw(E.p,K)===eInv&&await raw(E.p,PK)===ePick,r.msg.slice(0,100));await E.b.close()}
{const {E,r,eInv,ePick}=await inject('F6b',"k==='lagerpilot_v2_7'");R('6b Schreiben der Lagerdaten schlägt fehl: Meldung, Lagerdaten und Kommissionierdaten byte-gleich (nichts halb importiert)',!r.reloaded&&/Import fehlgeschlagen/.test(r.msg)&&await raw(E.p,K)===eInv&&await raw(E.p,PK)===ePick,r.msg.slice(0,110));await E.b.close()}
{const {E,r,eInv,ePick}=await inject('F6c',"k==='lagerpilot_pick_demo_v1'&&n===1");R('6c Schreiben der Kommissionierdaten schlägt fehl (Lagerdaten bereits geschrieben): Rollback, beide Speicher byte-gleich zum Vorzustand',!r.reloaded&&/Import fehlgeschlagen; bisherige Daten wurden soweit möglich wiederhergestellt/.test(r.msg)&&await raw(E.p,K)===eInv&&await raw(E.p,PK)===ePick,r.msg.slice(0,120)+' | Lager='+(await raw(E.p,K)===eInv)+' Pick='+(await raw(E.p,PK)===ePick));await E.b.close()}
// ---------- 7 Mehrfachimport ----------
const M=await app('M7');const m0=await raw(M.p,K),m0p=await raw(M.p,PK);
const other=await app('O7');const exO=await clickExport(other);
await importFile(M,exA.file);const m1=await raw(M.p,K);const bi1=JSON.parse(await raw(M.p,BI));
R('7 Erster Import: Sicherheitskopie = Ausgangsstand M7',bi1.inventory===m0&&bi1.picking===m0p);
await importFile(M,exO.file);const bi2=JSON.parse(await raw(M.p,BI));
R('7 Zweiter Import (andere Datei): Sicherheitskopie wird überschrieben und enthält nun den Stand nach dem ersten Import (nur ein Speicherplatz)',bi2.inventory===m1&&bi2.inventory!==m0);
{const pres=M.st.downloads.filter(d=>/^lagerpilot-vor-import-/.test(d.name));R('7 Mehrfachimport: je Import eine Datei „vor-import“; die erste enthält den Ausgangsstand M7, die zweite den Stand nach dem ersten Import',pres.length===2&&pres[0].text.includes('A-M7')&&JSON.parse(pres[1].text).items.some(i=>i.code==='A-X1'),pres.length+' Dateien')}
const s2=JSON.parse(await raw(M.p,K));R('7 Nach dem zweiten Import entspricht der Stand genau dem zweiten Export (O7)',JSON.stringify(s2.items)===JSON.stringify(JSON.parse(exO.text).items)&&JSON.stringify(s2.boxes)===JSON.stringify(JSON.parse(exO.text).boxes));
const before3=await raw(M.p,K);await importFile(M,exO.file);R('7 Gleiche Datei zweimal importiert: Lagerstand unverändert identisch (idempotent)',await raw(M.p,K)===before3);
// ---------- 7b Beschädigter Speicher (Wiederherstellungsmodus) ----------
{const Rr=await app('R10',false);await Rr.p.evaluate(k=>localStorage.setItem(k,'{kaputt'),K);await Rr.p.reload();await Rr.p.waitForTimeout(400);const locked=await Rr.p.evaluate(()=>storageLocked);
 const r=await importFile(Rr,exA.file);const all=await Rr.p.evaluate(()=>Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]));const kept=all.some(([k,v])=>k!==K&&String(v).includes('{kaputt'));const st=JSON.parse(await raw(Rr.p,K)||'null');
 R('7b Beschädigter Lagerspeicher: App gesperrt, Import einer gültigen Sicherung stellt den Betrieb wieder her',locked&&r.reloaded&&!!st&&st.items.some(i=>i.code==='A-X1')&&!(await Rr.p.evaluate(()=>storageLocked)),'locked='+locked+' reloaded='+r.reloaded);
 R('7b Der beschädigte Rohstand „{kaputt“ bleibt in Sicherheitskopie/Quarantäne erhalten (nicht still gelöscht)',kept,all.map(a=>a[0]).join(','));await Rr.b.close()}
// ---------- 8 Import ohne _pick ----------
const G=await app('G8');const gPick=await raw(G.p,PK);const noPick=mut(o=>{delete o._pick});await importFile(G,wr('nopick.json',noPick));
R('8 Import ohne _pick: Lagerdaten ersetzt, vorhandene Kommissionierdaten unverändert',JSON.parse(await raw(G.p,K)).items.some(i=>i.code==='A-X1')&&await raw(G.p,PK)===gPick);
// ---------- 9 Zwei-Tab-Schutz nach Import ----------
{const H=await app('H9');const tab2=await H.p.context().newPage();tab2.on('dialog',d=>d.accept());await tab2.goto(BASE);await tab2.waitForTimeout(400);await importFile(H,exA.file);
 const msg=await tab2.evaluate(()=>{try{transaction(s=>{s.items.push({code:'ST',name:'stale',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:null})});return 'gespeichert'}catch(e){return e.message}});const inv=JSON.parse(await raw(H.p,K));
 R('9 Veralteter zweiter Tab kann nach Import nichts überschreiben (Meldung, importierter Stand bleibt)',/anderen Tab geändert/.test(msg)&&!inv.items.some(i=>i.code==='ST')&&inv.items.some(i=>i.code==='A-X1'),msg.slice(0,90));await H.b.close()}
R('JS-Fehler in allen Instanzen: keine',[A,B,C,D,M,G,NP,other].every(x=>x.st.errs.length===0),[A,B,C,D,M,G,NP,other].flatMap(x=>x.st.errs).join('|'));
for(const x of [A,B,C,D,M,G,NP,other])await x.b.close();fs.rmSync(TMP,{recursive:true,force:true});
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail);process.exit(fail?1:0)})();
