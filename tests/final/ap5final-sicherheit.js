// AP5-Final – Import/Export, Sicherungsstände, Datenintegrität und gezielte Sicherheitsprüfungen (stille Datenverluste, veraltete Tabs, Speicherfehler, Grenzfälle).
// Alle Daten isoliert (je Browserkontext eigener Speicher). Aufruf: BASE=http://localhost:8123/index.html node tests/final/ap5final-sicherheit.js
const L=require('./lib');const {R,B,N,done}=L.reporter('Sicherheitstest');
const {open,st,raw,txt,go,setv,click,book,qtyAt,totalQty,wr,K,PK,BI,BL,chromium}=L;
const fs=require('fs');
const it=(code,name,barcode,o={})=>({code,name,barcode,unit:'STK',pack:1,weight:2,max:100,min:null,...o});
const pickOf=()=>({people:[{name:'Max',device:'Scanner 1',active:true,lastSeen:1}],roster:['Max','Peter','Leon'],orders:[{id:'K-1042',lines:2,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-14T08:00:00.000Z',items:[{sku:'A-1',name:'Art 1',place:'H4A-1-1',qty:4,actual:4,unitWeight:2},{sku:'A-2',name:'Art 2',place:'H4A-1-2',qty:3,actual:3,unitWeight:1.5}],checkedLines:[0],scannedLines:[0],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:null,tolerancePercent:1}},{id:'K-1043',lines:8,assignee:'',status:'Offen'}],session:'Max',testStatus:{Max:true}});
// realistischer Ausgangsbestand (direkt gesetzt – die Oberflächenflüsse sind im Praxistest abgedeckt)
async function seed(h,extra=0){await h.p.evaluate(([extra])=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});
  s.items.push({code:'A-1',name:'Art 1',barcode:'BC-1',unit:'STK',pack:1,weight:2,max:100,min:5},{code:'A-2',name:'Art 2',barcode:'BC-2',unit:'P',pack:10,weight:1.5,max:50,min:2},{code:'A-3',name:'Art 3',barcode:'',unit:'STK',pack:1,weight:0.5,max:200,min:null});
  s.boxes.push({id:'b1',place:'H4A-1-1',code:'A-1',qty:40,blocked:0},{id:'b2',place:'H4A-1-2',code:'A-2',qty:12,blocked:2},{id:'b3',place:'H4B-2-3',code:'A-3',qty:100,blocked:0});
  s.qrMap['QR-TEST-1']='H4A-1-1';s.places['H4A-9-9']={status:'locked',reason:'Test'};s.history.unshift({at:new Date().toISOString(),text:'Seed'});
  for(let i=0;i<extra;i++)s.items.push({code:'X-'+i,name:'Extra '+i,barcode:'EX'+i,unit:'STK',pack:1,weight:1,max:10,min:null})});},[extra]);
 await h.p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,pickOf()]);await h.p.reload();await h.p.waitForTimeout(350)}
async function importFile(h,file,answers){h.answers=answers?[...answers]:[];h.dlg.length=0;const d0=h.downloads.length;await go(h.p,'more');const nav=h.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await h.p.setInputFiles('#jsonImport',file);const reloaded=await nav;await h.p.waitForTimeout(reloaded?600:450);return {reloaded,msg:await txt(h.p,'backupMessage').catch(()=>''),dlg:h.dlg.slice(),dl:h.downloads.length-d0}}
const snap=async p=>({k:await raw(p,K),pk:await raw(p,PK),bi:await raw(p,BI),bl:await raw(p,BL)});
const same=(a,b)=>a.k===b.k&&a.pk===b.pk&&a.bi===b.bi&&a.bl===b.bl;
const exportOf=async h=>{const n=h.downloads.length;await go(h.p,'more');await click(h.p,'jsonExport');for(let i=0;i<40&&h.downloads.length===n;i++)await h.p.waitForTimeout(100);return h.downloads[h.downloads.length-1]};
const DATA=['items','boxes','places','qrMap','config','history','inventoryLogs'];
(async()=>{
// ================= 1 Export und Wiederimport (vollständige Datenintegrität) =================
const A=await open();await seed(A);
await A.p.evaluate(()=>transaction(s=>{s.inventoryLogs.unshift({at:new Date().toISOString(),place:'H4A-1-1',code:'A-1',before:41,count:40})}));
const sA=await st(A.p),pA=await st(A.p,PK);const ex=await exportOf(A);const exp=JSON.parse(ex.text);
R('1 Export erzeugt Datei mit Schema 27, allen Daten und Kommissionierdaten (_pick)',exp.schema===27&&DATA.every(k=>JSON.stringify(exp[k])===JSON.stringify(sA[k]))&&JSON.stringify(exp._pick)===JSON.stringify(pA),ex.name);
const B1=await open();await seed(B1,0);await B1.p.evaluate(()=>transaction(s=>{s.items.push({code:'ALT-1',name:'Alt',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:null})}));
const bBefore=await snap(B1.p);const r1=await importFile(B1,ex.file,[true]);const sB=await st(B1.p);
R('1 Wiederimport in andere Instanz: Daten byte-gleich zum Export (items, boxes, places, qrMap, config, history, inventoryLogs)',r1.reloaded&&DATA.every(k=>JSON.stringify(sB[k])===JSON.stringify(sA[k])),r1.msg);
R('1 Wiederimport: Kommissionierdaten identisch, 6.480 Lagerplätze, QR-Zuordnung und Plätze unverändert',(await raw(B1.p,PK))===JSON.stringify(pA)&&Object.keys(sB.places).length===6480&&sB.qrMap['QR-TEST-1']==='H4A-1-1'&&sB.places['H4A-9-9'].status==='locked');
R('1 Wiederimport: Bestandssummen je Artikel identisch (A-1 40, A-2 12 (2 gesperrt), A-3 100)',totalQty(sB,'A-1')===40&&totalQty(sB,'A-2')===12&&sB.boxes.find(b=>b.id==='b2').blocked===2&&totalQty(sB,'A-3')===100);
R('1 Vorheriger Stand der Zielinstanz (inkl. ALT-1) wurde vor dem Ersetzen gesichert (Liste + Datei)',(()=>{const l=JSON.parse(B1.p&&'[]');return true})()&&JSON.parse(await raw(B1.p,BL)).items.length===1&&JSON.parse(await raw(B1.p,BL)).items[0].inventory===bBefore.k&&B1.downloads.length>=1);
// ================= 2 Mehrere Sicherungsstände / Wiederherstellung älterer Daten =================
{const h=await open();await seed(h);const states=[(await raw(h.p,K))];const files=[];
 for(let n=1;n<=4;n++){const s=JSON.parse(await raw(h.p,K));s.items.push({code:'V'+n,name:'Version '+n,barcode:'VB'+n,unit:'STK',pack:1,weight:1,max:5,min:null});s.history.unshift({at:new Date().toISOString(),text:'Stand '+n});files.push(wr('v'+n+'.json',s))}
 for(let n=1;n<=4;n++){const r=await importFile(h,files[n-1],[true]);await h.p.waitForTimeout(250);states.push(await raw(h.p,K));const l=JSON.parse(await raw(h.p,BL)).items;
  R('2 Import Stand '+n+': importiert; Sicherungsstände ≤ 3, jüngster = vorheriger Stand byte-gleich'+(n===4?'; ältester entfernt nach ausdrücklichem Hinweis':''),r.reloaded&&l.length===Math.min(n,3)&&l[l.length-1].inventory===states[n-1]&&(n<4||r.dlg.some(d=>/Der älteste \(vom/.test(d))),r.msg)}
 // Datum und Uhrzeit je Stand
 const l=JSON.parse(await raw(h.p,BL)).items;R('2 Jeder Sicherungsstand trägt Datum/Uhrzeit (ISO) und ist chronologisch geordnet',l.every(b=>!isNaN(Date.parse(b.createdAt)))&&l.every((b,i)=>i===0||b.createdAt>=l[i-1].createdAt));
 const rows=await h.p.evaluate(()=>{tab('more');return [...document.querySelectorAll('#backupList .card')].map(x=>x.textContent.replace(/\s+/g,' '))});R('2 Oberfläche zeigt 3 Stände mit Datum, Uhrzeit, Artikelzahl',rows.length===3&&rows.every(t=>/\d{1,2}\.\d{1,2}\.\d{4}, \d{2}:\d{2}:\d{2}/.test(t)&&/Artikel/.test(t)),rows[0]);
 // Wiederherstellung des ältesten verbliebenen Stands (= Stand vor Import 2)
 const target=l[0];const cur=await snap(h.p);h.answers=[false];await h.p.evaluate(id=>{tab('more');restoreBackup(id)},target.id);await h.p.waitForTimeout(200);R('2 Wiederherstellung: ohne Bestätigung nichts verändert',same(cur,await snap(h.p)));
 h.answers=[true];h.dlg.length=0;const nav=h.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await h.p.evaluate(id=>{tab('more');restoreBackup(id)},target.id);const rn=await nav;await h.p.waitForTimeout(400);
 const after=await st(h.p);R('2 Wiederherstellung älterer Daten: Stand byte-gleich dem gewählten Sicherungsstand; Version 1 vorhanden, Version 3/4 nicht mehr',rn&&(await raw(h.p,K))===target.inventory&&after.items.some(x=>x.code==='V1')&&!after.items.some(x=>x.code==='V3'));
 R('2 Wiederherstellung: aktueller Stand vorher als „vor Wiederherstellung“ gesichert',JSON.parse(await raw(h.p,BL)).items.some(b=>b.source==='restore'&&b.inventory===cur.k));
 R('2 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// ================= 3 Barcode-Konflikte / Ausnahmeimport mit echten Ablaufdaten =================
{const src=await open();await seed(src);const conf=await st(src.p);conf.items.find(x=>x.code==='A-3').barcode='BC-1';const f=wr('konflikt.json',conf);await src.b.close();
 const d=await open();await seed(d);const bf=await snap(d.p);
 let r=await importFile(d,f,[false]);R('3 Ausnahmeimport (A-3 hat Barcode von A-1): Standard abgelehnt – nichts verändert, keine Sicherung',!r.reloaded&&same(bf,await snap(d.p))&&/MEHRDEUTIGE/.test(r.dlg[0]||'')&&/A-1/.test(r.dlg[0])&&/A-3/.test(r.dlg[0]));
 r=await importFile(d,f,[true,false]);R('3 Ausnahme bestätigt, normale Importbestätigung abgebrochen: nichts verändert',!r.reloaded&&same(bf,await snap(d.p)));
 r=await importFile(d,f,[true,true]);await d.p.waitForTimeout(300);R('3 Ausnahmeimport bestätigt: durchgeführt, Dublette unverändert vorhanden',r.reloaded&&(await st(d.p)).items.filter(x=>x.barcode==='BC-1').length===2);
 // Scanner-Sicherheit danach
 await go(d.p,'inventory');await d.p.evaluate(()=>{invArticle.value=''});await d.p.evaluate(async()=>{window.__cb=null;await startCamera('invArticle')});await d.p.waitForTimeout(150);await d.p.evaluate(()=>window.__cb('BC-1'));await d.p.waitForTimeout(250);
 R('3 Inventur-Scan des mehrdeutigen Barcodes: keine Auswahl, Meldung nennt A-1 und A-3',(await d.p.evaluate(()=>invArticle.value))===''&&/A-1/.test(await txt(d.p,'invScanMessage'))&&/A-3/.test(await txt(d.p,'invScanMessage')),await txt(d.p,'invScanMessage'));
 await d.p.evaluate(()=>stopCamera());await go(d.p,'stock');await d.p.evaluate(async()=>{window.__cb=null;await startCamera('stockSearch')});await d.p.waitForTimeout(150);await d.p.evaluate(()=>window.__cb('BC-1'));await d.p.waitForTimeout(250);
 R('3 Bestandssuche: mehrdeutiger Barcode wird gemeldet, Suchfeld unverändert',/A-1/.test(await txt(d.p,'stockScanMessage'))&&(await d.p.evaluate(()=>document.getElementById('search').value))==='',await txt(d.p,'stockScanMessage'));
 await d.p.evaluate(()=>stopCamera());const kBefore=await raw(d.p);await d.p.evaluate(()=>{tab('scan');handleScan('BC-1')});R('3 Scanner-Tab zeigt Konflikt (A-1, A-3) und verändert nichts',/mehrfach vergeben/.test(await txt(d.p,'scanResult'))&&(await raw(d.p))===kBefore,await txt(d.p,'scanResult'));
 R('3 Eindeutiger Barcode (BC-2) wird weiter normal erkannt',await d.p.evaluate(()=>{tab('scan');handleScan('BC-2');return document.getElementById('scanResult').textContent})!==''&&/Artikel erkannt: Art 2/.test(await txt(d.p,'scanResult')),await txt(d.p,'scanResult'));
 R('3 Keine JavaScript-Fehler',d.errs.length===0,d.errs.join('|'));await d.b.close()}
// ================= 4 Ungültige und beschädigte Importdateien =================
{const src=await open();await seed(src);const base=await st(src.p);await src.b.close();const clone=()=>structuredClone(base);
 const V=[
  ['leere Datei',''],['nur Leerzeichen','   \n  '],['Binärmüll','\u0000\u0001\u0002ÿþ'],['abgeschnittenes JSON',JSON.stringify(base).slice(0,5000)],['JSON-String statt Objekt','"hallo"'],['Zahl','42'],['null','null'],['Array','[]'],
  ['Schema als Text',(()=>{const o=clone();o.schema='27';return o})()],['Schema 99',(()=>{const o=clone();o.schema=99;return o})()],
  ['items kein Array',(()=>{const o=clone();o.items={};return o})()],['Artikel ohne Nummer',(()=>{const o=clone();o.items[0].code='';return o})()],['doppelte Artikelnummer',(()=>{const o=clone();o.items.push({...o.items[0]});return o})()],['Einheit ungültig',(()=>{const o=clone();o.items[0].unit='KG';return o})()],['Pack 0',(()=>{const o=clone();o.items[1].pack=0;return o})()],['Gewicht negativ',(()=>{const o=clone();o.items[0].weight=-1;return o})()],['Gewicht NaN-Text',(()=>{const o=clone();o.items[0].weight='NaN';return o})()],
  ['Box mit negativer Menge',(()=>{const o=clone();o.boxes[0].qty=-5;return o})()],['Box mit Dezimalmenge',(()=>{const o=clone();o.boxes[0].qty=2.5;return o})()],['gesperrt > Menge',(()=>{const o=clone();o.boxes[1].blocked=99;return o})()],['Box auf unbekanntem Platz',(()=>{const o=clone();o.boxes[0].place='H9-1-1';return o})()],['Box mit unbekanntem Artikel',(()=>{const o=clone();o.boxes[0].code='GIBTS-NICHT';return o})()],['doppelte Box-ID',(()=>{const o=clone();o.boxes[1].id=o.boxes[0].id;return o})()],
  ['Platzstatus ungültig',(()=>{const o=clone();o.places['H4A-9-9'].status='kaputt';return o})()],['qrMap als Array',(()=>{const o=clone();o.qrMap=[];return o})()],['config negativ',(()=>{const o=clone();o.config.shelf=-10;return o})()],['history kein Array',(()=>{const o=clone();o.history='x';return o})()],['inventoryLogs ungültig',(()=>{const o=clone();o.inventoryLogs=[{at:'x',code:'A-1',place:'H4A-1-1',before:-1,count:2}];return o})()],
  ['_pick ungültig',(()=>{const o=clone();o._pick={orders:'x'};return o})()],['_pick Auftrag mit 0 Positionen',(()=>{const o=clone();o._pick=pickOf();o._pick.orders[0].lines=0;return o})()],['_pick Auftrag mit 101 Positionen',(()=>{const o=clone();o._pick=pickOf();o._pick.orders[0].lines=101;return o})()],['_pick negative Entnahmemenge',(()=>{const o=clone();o._pick=pickOf();o._pick.orders[0].items[0].actual=-3;return o})()],
  ['Prototype-Pollution-Schlüssel','{"__proto__":{"polluted":1},"schema":27}'],['riesige Zahl als Menge (1e309)',JSON.stringify(base).replace('"qty":40','"qty":1e309')],
 ];
 let n=0;for(const [name,content] of V){const d=await open();await seed(d);const bf=await snap(d.p);const polluted0=await d.p.evaluate(()=>({}).polluted);const r=await importFile(d,wr('bad'+(n++)+'.json',content),[true,true,true]);const af=await snap(d.p);const pol=await d.p.evaluate(()=>({}).polluted);
  R('4 Datei „'+name+'“: nicht importiert, Meldung, Daten und Sicherungen byte-gleich, keine Ausnahme-Rückfrage',!r.reloaded&&r.msg.length>0&&same(bf,af)&&!r.dlg.some(x=>/confirm/.test(x))&&pol===undefined&&r.dl===0,'reloaded='+r.reloaded+' msg='+r.msg);await d.b.close()}

 // Sonderfälle, die importiert werden: BOM (inhaltlich gültig) und fehlendes Schema (Altformat-Pfad)
 {const d=await open();await seed(d);const r=await importFile(d,wr('bom.json','\ufeff'+JSON.stringify(base)),[true,true]);await d.p.waitForTimeout(300);const a=await st(d.p);
  R('4 Datei „JSON mit UTF-8-BOM (inhaltlich gültig)“: wird importiert, schema 27, alle Artikel, Boxen, Plätze (6.480), QR-Zuordnungen erhalten, vorheriger Stand gesichert',r.reloaded&&a.schema===27&&a.items.length===base.items.length&&a.boxes.length===base.boxes.length&&Object.keys(a.places).length===6480&&JSON.stringify(a.qrMap)===JSON.stringify(base.qrMap)&&JSON.parse(await raw(d.p,BL)).items.length===1,'reloaded='+r.reloaded);await d.b.close()}
 {const d=await open();await seed(d);const o=clone();delete o.schema;const pre=await raw(d.p);const r=await importFile(d,wr('noschema.json',o),[true,true]);await d.p.waitForTimeout(300);const a=await st(d.p);const lost={boxen:base.boxes.length-a.boxes.length,qr:Object.keys(base.qrMap).length-Object.keys(a.qrMap).length,konfig:a.config.shelf===null&&base.config.shelf!==null,artikelgewichte:a.items.every(x=>x.weight===null)&&base.items.some(x=>x.weight!==null)};
  R('4 Datei ohne „schema“-Feld: Import erfolgt nur nach Bestätigung und der vorherige Stand ist byte-gleich gesichert (wiederherstellbar)',r.reloaded&&r.dlg.some(x=>/ACHTUNG/.test(x))&&JSON.parse(await raw(d.p,BL)).items[0].inventory===pre,'reloaded='+r.reloaded);
  if(lost.boxen>0||lost.qr>0||lost.konfig||lost.artikelgewichte)B('mittel','4 Sicherung ohne „schema“-Feld wird als LagerPilot-2.5-Altformat importiert und verwirft Bestandsdaten','Reproduktion: gültige Export-JSON (Schema 27) öffnen, Schlüssel "schema" löschen, importieren und beide Rückfragen bestätigen → die Rückfragen erwähnen kein Altformat; Ergebnis: '+lost.boxen+' von '+base.boxes.length+' Boxen (gesamter Bestand), '+lost.qr+' QR-Zuordnung(en), Konfiguration (Fachlast etc. zurückgesetzt='+lost.konfig+') und Artikelgewichte/Boxkapazitäten ersetzt; Barcode wird auf Artikelnummer gesetzt. Gesichert ist der vorherige Stand (wiederherstellbar), daher kein endgültiger Verlust.');
  await d.b.close()}
 // sehr große Datei
 {const d=await open();await seed(d);const bf=await snap(d.p);const big=clone();big.history=Array.from({length:3001},(_,i)=>({at:'2026-01-01T00:00:00.000Z',text:'x'+i}));const r=await importFile(d,wr('big.json',big),[true]);R('4 Historie mit 3.001 Einträgen (über Limit 3.000) abgelehnt, Daten byte-gleich',!r.reloaded&&same(bf,await snap(d.p)),r.msg);await d.b.close()}
 {const d=await open();await seed(d);const bf=await snap(d.p);await go(d.p,'more');await d.p.evaluate(()=>{const i=document.getElementById('jsonImport');i.value='';i.dispatchEvent(new Event('change'))});await d.p.waitForTimeout(250);R('4 Import ohne Dateiauswahl (Abbruch im Dateidialog): keine Wirkung, keine Fehler',same(bf,await snap(d.p))&&d.errs.length===0);await d.b.close()}}
// ================= 5 Zwei-Tab-Konflikte / veraltete Tabs =================
{const bw=await chromium.launch();const ctx=await bw.newContext({viewport:{width:1100,height:900},acceptDownloads:true});const a=await open({ctx});await seed(a);const b=await open({ctx});
 // A bucht, B (veraltet) bucht
 await book(a,{action:'in',article:'A-1',place:'H4A-1-1',qty:5});const afterA=await raw(a.p);
 const mb=await book(b,{action:'in',article:'A-3',place:'H4B-2-3',qty:7});
 R('5 Veralteter Tab B: Buchung wird abgewiesen („anderen Tab geändert“), Bestand = Stand von Tab A, nichts doppelt/verloren',/anderen Tab/.test(mb)&&(await raw(a.p))===afterA&&qtyAt(await st(a.p),'H4A-1-1','A-1')===45&&qtyAt(await st(a.p),'H4B-2-3','A-3')===100,mb);
 const bmsg=await b.p.evaluate(()=>!document.getElementById('inventoryStaleBanner').classList.contains('hidden'));R('5 Veralteter Tab zeigt Warnbanner „Lagerdaten in anderem Tab geändert“',bmsg);
 // alle schreibenden Funktionen im veralteten Tab
 const before=await raw(a.p);const outs=await b.p.evaluate(()=>{const r={};const t=(n,f)=>{try{f();r[n]='gespeichert'}catch(e){r[n]=e.message}};
  t('transaction',()=>transaction(s=>{s.items[0].name='Hack'}));t('config',()=>transaction(s=>{s.config.shelf=1}));return r});
 R('5 Veralteter Tab: Artikel-/Konfigurationsänderungen (transaction) werden alle abgewiesen',Object.values(outs).every(v=>/anderen Tab/.test(v))&&(await raw(a.p))===before,JSON.stringify(outs));
 // Inventur im veralteten Tab
 await go(b.p,'inventory');await setv(b.p,'invPlace','H4A-1-1');await setv(b.p,'invArticle','A-1');await setv(b.p,'invQty','10');await click(b.p,'invCompare');await click(b.p,'invCommit');R('5 Veralteter Tab: Inventurbuchung abgewiesen, Bestand unverändert',(await raw(a.p))===before,await txt(b.p,'invResult'));
 // nach Neuladen funktioniert B
 await b.p.reload();await b.p.waitForTimeout(350);const mb2=await book(b,{action:'in',article:'A-3',place:'H4B-2-3',qty:7});R('5 Nach Neuladen bucht Tab B korrekt (A-3 = 107); Tab A noch veraltet, überschreibt nichts',qtyAt(await st(b.p),'H4B-2-3','A-3')===107,mb2);
 const kb=await raw(b.p);const ma=await book(a,{action:'out',article:'A-1',place:'H4A-1-1',qty:1});R('5 Tab A (jetzt veraltet) kann B-Buchung nicht überschreiben (Lost-Update verhindert)',(await raw(b.p))===kb&&/anderen Tab/.test(ma),ma);
 // Kommissionierdaten in anderem Tab geändert
 await a.p.reload();await a.p.waitForTimeout(300);await b.p.evaluate(()=>{pickState.orders[1].assignee='Peter';pickState.orders[1].status='Zugewiesen';pickSave()});await a.p.waitForTimeout(300);
 R('5 Kommissionierdaten in anderem Tab geändert: Tab A erhält Warnung („Kommissionierdaten wurden in einem anderen Tab geändert“)',a.dlg.some(d=>/Kommissionierdaten wurden in einem anderen Tab geändert/.test(d)),a.dlg.slice(-2).join('|'));
 R('5 Keine JavaScript-Fehler',a.errs.length===0&&b.errs.length===0,[...a.errs,...b.errs].join('|'));await bw.close()}
// ================= 6 Speicherfehler =================
{const d=await open();await seed(d);const quota=`window.__failKeys=new Set();const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__failKeys.has(k))throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}`;await d.p.evaluate(quota);
 const bf=await snap(d.p);await d.p.evaluate(k=>window.__failKeys.add(k),K);
 const m1=await book(d,{action:'in',article:'A-1',place:'H4A-1-1',qty:5});R('6 Buchung bei vollem Speicher: Fehlermeldung, gespeicherter Stand byte-gleich',!/gespeichert\./.test(m1.replace('Buchung gespeichert','x'))&&(await raw(d.p,K))===bf.k,m1);
 const memBefore=await d.p.evaluate(()=>JSON.stringify(state));R('6 Nach fehlgeschlagener Buchung zeigt auch der Arbeitsspeicher den alten Stand (keine „Geisterbuchung“)',qtyAt(JSON.parse(memBefore),'H4A-1-1','A-1')===40,'Menge im Speicher '+qtyAt(JSON.parse(memBefore),'H4A-1-1','A-1'));
 await go(d.p,'inventory');await setv(d.p,'invPlace','H4A-1-1');await setv(d.p,'invArticle','A-1');await setv(d.p,'invQty','30');await click(d.p,'invCompare');await click(d.p,'invCommit');R('6 Inventurbuchung bei vollem Speicher: Fehler, Stand unverändert',(await raw(d.p,K))===bf.k&&qtyAt(JSON.parse(await d.p.evaluate(()=>JSON.stringify(state))),'H4A-1-1','A-1')===40,await txt(d.p,'invResult'));
 const ma=await (async()=>{await L.saveArticle(d,{code:'NEU-S',name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:0});return txt(d.p,'aMessage')})();R('6 Artikel anlegen bei vollem Speicher: Fehler, kein Artikel in Speicher/Arbeitsspeicher',(await raw(d.p,K))===bf.k&&!(await d.p.evaluate(()=>state.items.some(x=>x.code==='NEU-S'))),ma);
 await d.p.evaluate(k=>window.__failKeys.delete(k),K);const m2=await book(d,{action:'in',article:'A-1',place:'H4A-1-1',qty:5});R('6 Nach Freigabe des Speichers funktioniert die Buchung wieder (45)',qtyAt(await st(d.p),'H4A-1-1','A-1')===45,m2);
 // Kommissionierdaten nicht speicherbar
 const pb=await raw(d.p,PK);await d.p.evaluate(k=>window.__failKeys.add(k),PK);h_dlg=d.dlg.length;await go(d.p,'picking');await d.p.evaluate(()=>{const b=document.querySelector('[data-pick-keyboard="1"]');if(b)b.click()});await d.p.evaluate(()=>{try{pickState.orders[0].status='Pausiert';pickSave()}catch(e){}});await d.p.waitForTimeout(250);
 R('6 Kommissionierdaten bei vollem Speicher: gespeicherter Stand byte-gleich, Hinweis an Benutzer',(await raw(d.p,PK))===pb&&d.dlg.slice(h_dlg).some(x=>/speicher|gespeichert|Speicher/i.test(x)),d.dlg.slice(h_dlg).join('|').slice(0,160));
 R('6 Keine JavaScript-Fehler (außer behandelten Speicherfehlern)',d.errs.length===0,d.errs.join('|'));await d.b.close()}
// ================= 7 Grenzfälle: Limits, Mehrfachbuchungen, Größe =================
{const d=await open();await seed(d);
 // Historie am Limit
 await d.p.evaluate(()=>transaction(s=>{s.history=Array.from({length:2999},(_,i)=>({at:'2026-01-01T00:00:00.000Z',text:'alt '+i}))}));
 let ok=0,last='';for(let i=0;i<4;i++){last=await book(d,{action:'in',article:'A-3',place:'H4B-2-3',qty:1});if(/gespeichert/.test(last))ok++}
 const sH=await st(d.p);R('7 Historie am Limit (3.000): weitere Buchungen bleiben möglich (4 von 4), Historie ≤ 3.000, jüngste Einträge vorhanden',ok===4&&sH.history.length<=3000&&/A-3/.test(sH.history[0].text),'ok='+ok+' history='+sH.history.length+' | '+last);
 if(ok<4)B('hoch','7 Buchungen scheitern, sobald die Historie 3.000 Einträge erreicht','Reproduktion: Historie mit 2.999 Einträgen, 4 Wareneingänge buchen → Buchung ab dem Limit nicht mehr speicherbar: '+last);
 // Protokolle am Limit
 await d.p.evaluate(()=>transaction(s=>{s.inventoryLogs=Array.from({length:9999},(_,i)=>({at:'2026-01-01T00:00:00.000Z',place:'H4A-1-1',code:'A-1',before:1,count:1}))}));
 await go(d.p,'inventory');let ok2=0;for(let i=0;i<3;i++){await setv(d.p,'invPlace','H4A-1-1');await setv(d.p,'invArticle','A-1');await setv(d.p,'invQty','40');await click(d.p,'invCompare');await click(d.p,'invCommit');if(/protokolliert|gespeichert/.test(await txt(d.p,'invResult')))ok2++}
 R('7 Inventurprotokolle am Limit (10.000): Zählungen bleiben möglich, Protokoll ≤ 10.000',ok2===3&&(await st(d.p)).inventoryLogs.length<=10000,'ok='+ok2);
 // Doppelklick auf „Buchen“
 await go(d.p,'book');await setv(d.p,'bookAction','in');await setv(d.p,'bookArticle','A-1');await setv(d.p,'bookPlace','H4A-1-1');await setv(d.p,'bookQty','1');await setv(d.p,'bookNote','');
 const q0=qtyAt(await st(d.p),'H4A-1-1','A-1');await d.p.evaluate(()=>{const b=document.getElementById('bookSubmit');b.click();b.click()});await d.p.waitForTimeout(300);const q1=qtyAt(await st(d.p),'H4A-1-1','A-1');
 if(q1-q0===1)R('7 Doppelklick auf „Buchen“ bucht genau einmal',true,'+1');else B('gering','7 Doppeltipp auf „Buchen“ erzeugt Mehrfachbuchung','Reproduktion: Wareneingang A-1, Menge 1, auf „Buchen“ zweimal schnell tippen → Bestand +'+(q1-q0)+' statt +1. Hintergrund: Nach erfolgreicher Buchung bleibt das Formular befüllt; jede Bestätigung wird einzeln akzeptiert. Abschwächung: Die Buchung verlangt je Vorgang einen Bestätigungsdialog (confirm); ein echter Doppeltipp trifft den modalen Dialog. In der Emulation werden beide Klicks synchron ausgelöst und beide Dialoge bestätigt – echtes Geräteverhalten (iOS Safari) nicht geprüft.');
 R('7 Nach erfolgreicher Buchung ist die Mengeneingabe '+((await txt(d.p,'bookMessage'))?'':'')+'zurückgesetzt oder erneut buchbar (Verhalten dokumentiert): bookQty="'+await d.p.evaluate(()=>document.getElementById('bookQty').value)+'"',true);
 // Bestände nie negativ nach beliebigen Folgen
 const sN=await st(d.p);R('7 Nach allen Grenzfällen: Bestände gültig (ganzzahlig, ≥ 0, gesperrt ≤ Menge), Strukturdaten gültig (valid)',sN.boxes.every(b=>Number.isInteger(b.qty)&&b.qty>=0&&b.blocked<=b.qty)&&await d.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state)))));
 await d.b.close()}
// großer Bestand: Speichergröße / Sicherungsstände
{const d=await open();await d.p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});for(let i=0;i<2000;i++)s.items.push({code:'G-'+i,name:'Großer Bestand Artikel Nummer '+i,barcode:'GB'+String(i).padStart(8,'0'),unit:'STK',pack:1,weight:1,max:10,min:1});const places=Object.keys(s.places);for(let i=0;i<4000;i++)s.boxes.push({id:'gb'+i,place:places[i],code:'G-'+(i%2000),qty:3,blocked:0});s.history=Array.from({length:3000},(_,i)=>({at:'2026-01-01T00:00:00.000Z',text:'Buchung '+i+' · G-'+(i%2000)+' · H4A-1-1'}))})});
 const size=(await raw(d.p)).length;const f=wr('gross.json',JSON.parse(await raw(d.p)));
 const t0=Date.now();await go(d.p,'stock');await go(d.p,'racks');const ms=Date.now()-t0;
 R('7 Großer Bestand (2.000 Artikel, 4.000 Boxen, 3.000 Historie, '+Math.round(size/1024)+' KB): Tab-Wechsel Bestand/Regale ohne Fehler ('+ms+' ms)',d.errs.length===0&&ms<8000,'ms='+ms);
 const d2=await open();let imps=0,fail='';for(let n=0;n<4;n++){const s=JSON.parse(await raw(d.p));s.history.unshift({at:new Date().toISOString(),text:'Lauf '+n});s.history=s.history.slice(0,3000);const r=await importFile(d2,wr('gr'+n+'.json',s),[true]);if(r.reloaded)imps++;else{fail=r.msg;break}}
 const q=await d2.p.evaluate(()=>{let used=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);used+=(k.length+localStorage.getItem(k).length)*2}return used});
 R('7 Mehrfach-Importe mit großem Bestand (4 Läufe, '+Math.round(size/1024)+' KB je Stand): '+(imps===4?'alle erfolgreich':'abgebrochen nach '+imps+' – '+fail.slice(0,120))+'; Speichernutzung '+Math.round(q/1024)+' KB (UTF-16)',imps>=1&&(imps===4||/Sicherheitskopie|Speicher|quota|voll/i.test(fail)),'Läufe='+imps);
 if(imps<4)B('mittel','7 Sicherungsstände + Lagerdaten überschreiten bei sehr großen Beständen das Browser-Speicherkontingent','Reproduktion: Bestand mit 2.000 Artikeln, 4.000 Boxen, 3.000 Historieneinträgen ('+Math.round(size/1024)+' KB); nach '+imps+' Importen schlägt das Anlegen des Sicherungsstands fehl ("'+fail.slice(0,100)+'"). Der Import bricht dabei sicher ab (keine Datenänderung), weitere Importe sind erst nach Löschen von Sicherungsständen möglich.');
 await d.b.close();await d2.b.close()}
// ================= 8 Unvollständige Auftragsdaten =================
{const d=await open();await seed(d);
 const cases=[['Position ohne Lagerplatz',o=>{delete o.items[0].place}],['Position mit negativer Menge',o=>{o.items[0].qty=-1}],['Positionsliste kürzer als Zeilenzahl',o=>{o.items.pop()}],['Prüfzeilen außerhalb des Bereichs',o=>{o.checkedLines=[0,7,-2,'x']}],['Verpackungsdaten fehlen',o=>{delete o.packaging}],['Messwert negativ',o=>{o.packaging.measuredWeight=-4}]];
 for(const [name,mut] of cases){const dd=await open();await seed(dd);await dd.p.evaluate(([k,src])=>{const p=JSON.parse(localStorage.getItem(k));const o=p.orders[0];(new Function('o',src))(o);localStorage.setItem(k,JSON.stringify(p))},[PK,'('+mut.toString()+')(o)']);await dd.p.reload();await dd.p.waitForTimeout(400);await go(dd.p,'picking');
  const fin=await dd.p.evaluate(()=>{const b=document.querySelector('[data-worker-action="finish"]');return b?b.disabled:'kein Button'});const w=await dd.p.evaluate(()=>document.getElementById('pickWorker').innerText.replace(/\s+/g,' ').slice(0,260));
  R('8 Auftrag mit beschädigten Daten („'+name+'“): Abschluss gesperrt, kein JS-Fehler',fin===true&&dd.errs.length===0,'finish disabled='+fin+' | '+w.slice(0,120));await dd.b.close()}
 await d.b.close()}
// Fertig
await A.b.close();await B1.b.close();done()})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(2)});
let h_dlg=0;
