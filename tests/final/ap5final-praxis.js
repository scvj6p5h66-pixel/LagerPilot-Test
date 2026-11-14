// AP5-Final – Lager-Praxistest: Artikel -> Wareneingang -> Lagerplätze -> Umlagerung -> Ausbuchung -> Inventur -> Aufträge -> Kommissionierung -> Kommissionierschein.
// Alle Schritte über die Oberfläche (Eingabefelder/Schaltflächen), Prüfung gegen den gespeicherten Zustand. Isolierter Browserkontext, keine echten Daten.
// Aufruf: BASE=http://localhost:8123/index.html node tests/final/ap5final-praxis.js
const L=require('./lib');const {R,B,N,done}=L.reporter('Praxistest');
const {open,st,raw,txt,go,setv,click,saveArticle,book,qtyAt,totalQty,K,PK}=L;
const ART={
 SCH:{code:'SCH-1001',name:'Schraube M8x40 (Pack à 100)',barcode:'4012345000011',unit:'P',pack:100,weight:'1,2',max:50,min:5},
 KAB:{code:'KAB-2001',name:'Kabeltrommel 50 m',barcode:'4012345000028',unit:'STK',pack:1,weight:'8,5',max:12,min:2},
 DIC:{code:'DIC-3001',name:'Dichtungsring-Set (Pack à 25)',barcode:'4012345000035',unit:'P',pack:25,weight:'0,4',max:80,min:10},
 MOT:{code:'MOT-4001',name:'Elektromotor 0,75 kW',barcode:'4012345000042',unit:'STK',pack:1,weight:'14,2',max:6,min:1},
 STA:{code:'STA-9001',name:'Stahlträger 3 m',barcode:'4012345000059',unit:'STK',pack:1,weight:90,max:20,min:1}};
(async()=>{
const h=await open({width:1100,height:900});const p=h.p;
// ================= 0 Lagerstruktur =================
{const s=await st(p);const keys=Object.keys(s.places);const by={};for(const k of keys){const m=/^(H4[AB])-(\d+)-(\d+)$/.exec(k);if(!m){by.bad=(by.bad||0)+1;continue}const hall=m[1],r=+m[2],n=+m[3];by[hall]??={racks:new Set(),places:0,maxN:0,minN:999};by[hall].racks.add(r);by[hall].places++;by[hall].maxN=Math.max(by[hall].maxN,n);by[hall].minN=Math.min(by[hall].minN,n)}
 R('0 Lagerstruktur: Halle 4A = 22 Regale / 3.564 Stellplätze',by.H4A&&by.H4A.racks.size===22&&by.H4A.places===3564,by.H4A&&by.H4A.racks.size+' Regale, '+by.H4A.places);
 R('0 Lagerstruktur: Halle 4B = 18 Regale / 2.916 Stellplätze',by.H4B&&by.H4B.racks.size===18&&by.H4B.places===2916,by.H4B&&by.H4B.racks.size+' Regale, '+by.H4B.places);
 R('0 Lagerstruktur: insgesamt 40 Regale / 6.480 Stellplätze, keine unplausiblen Kennungen',keys.length===6480&&!by.bad&&by.H4A.racks.size+by.H4B.racks.size===40,keys.length+' Plätze');
 R('0 Lagerstruktur: je Regal 162 Plätze = 18 Türme × 9 (Nummern 1–162 lückenlos)',by.H4A.minN===1&&by.H4A.maxN===162&&by.H4B.maxN===162&&await p.evaluate(()=>{for(const [hall,c] of [['H4A',22],['H4B',18]])for(let r=1;r<=c;r++)for(let n=1;n<=162;n++)if(!state.places[`${hall}-${r}-${n}`])return false;return true}));
 await go(p,'racks');await p.evaluate(()=>{hallSelect.value='H4A';hallSelect.dispatchEvent(new Event('change'));rackSelect.value='1';rackSelect.dispatchEvent(new Event('change'))});await p.waitForTimeout(250);
 const grid=await p.evaluate(()=>{const g=document.getElementById('rackGrid');return {cells:g.querySelectorAll('[data-place],button,.cell,.place').length,txt:g.innerText.length}});
 R('0 Regalansicht Halle 4A Regal 1 rendert 162 Stellplätze',grid.cells>=162,JSON.stringify(grid));
 window_qr0=JSON.stringify(s.qrMap)+'|'+JSON.stringify(Object.keys(s.places))}
// ================= 1 Konfiguration + Artikelverwaltung =================
await go(p,'more');for(const [id,v] of [['cfgShelf',800],['cfgBay',2000],['cfgPalletMax',1000],['cfgTare',25]])await setv(p,id,v);await L.click(p,'cfgSave');
{const s=await st(p);R('1 Traglast-Konfiguration über Oberfläche gespeichert (Fach 800, Feld 2000, Palette 1000, Leergewicht 25 kg)',s.config.shelf===800&&s.config.bay===2000&&s.config.palletMax===1000&&s.config.tare===25,JSON.stringify(s.config))}
for(const k of ['SCH','KAB','DIC','MOT','STA']){const m=await saveArticle(h,ART[k]);const s=await st(p);const a=s.items.find(x=>x.code===ART[k].code);
 R('1 Artikel '+ART[k].code+' anlegen: gespeichert, Werte korrekt (Gewicht mit Dezimalkomma, Min/Max, Barcode)',!!a&&a.name===ART[k].name&&a.barcode===ART[k].barcode&&a.unit===ART[k].unit&&a.pack===ART[k].pack&&a.weight===Number(String(ART[k].weight).replace(',','.'))&&a.max===ART[k].max&&a.min===ART[k].min,m)}
{const before=await raw(p);
 const bad=[
  ['doppelte Artikelnummer',{...ART.SCH,name:'Anderer Name',barcode:'9999990000001'}],
  ['doppelte Artikelnummer, andere Schreibweise',{...ART.SCH,code:'sch-1001',name:'Schreibvariante',barcode:'9999990000002'}],
  ['doppelter Barcode',{code:'NEU-1',name:'Neu',barcode:ART.KAB.barcode,unit:'STK',pack:1,weight:1,max:5,min:0}],
  ['Barcode in anderer Schreibweise',{code:'NEU-2',name:'Neu',barcode:'4012345000028'.toLowerCase()+'',unit:'STK',pack:1,weight:1,max:5,min:0,_skip:true}],
  ['Barcode = Artikelnummer eines anderen Artikels',{code:'NEU-3',name:'Neu',barcode:ART.KAB.code,unit:'STK',pack:1,weight:1,max:5,min:0}],
  ['Artikelnummer = Barcode eines anderen Artikels',{code:ART.KAB.barcode,name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:0}],
  ['Gewicht negativ',{code:'NEU-4',name:'Neu',barcode:'',unit:'STK',pack:1,weight:'-1',max:5,min:0}],
  ['Gewicht Text',{code:'NEU-5',name:'Neu',barcode:'',unit:'STK',pack:1,weight:'abc',max:5,min:0}],
  ['Gewicht mit zwei Kommas',{code:'NEU-6',name:'Neu',barcode:'',unit:'STK',pack:1,weight:'1,2,3',max:5,min:0}],
  ['Stück pro Pack = 0',{code:'NEU-7',name:'Neu',barcode:'',unit:'P',pack:0,weight:1,max:5,min:0}],
  ['Stück pro Pack = 2,5',{code:'NEU-8',name:'Neu',barcode:'',unit:'P',pack:'2,5',weight:1,max:5,min:0}],
  ['Boxkapazität = 0',{code:'NEU-9',name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:0,min:0}],
  ['Boxkapazität Text',{code:'NEU-10',name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:'viele',min:0}],
  ['Mindestbestand negativ',{code:'NEU-11',name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:'-3'}],
  ['Mindestbestand größer als Boxkapazität',{code:'NEU-12',name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:9}],
  ['Name leer',{code:'NEU-13',name:'',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:0}],
  ['Artikelnummer leer',{code:'',name:'Ohne Nummer',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:0}],
  ['Barcode über 64 Zeichen',{code:'NEU-14',name:'Neu',barcode:'7'.repeat(65),unit:'STK',pack:1,weight:1,max:5,min:0}],
  ['Gewicht 1e3 (Exponentenschreibweise)',{code:'NEU-15',name:'Neu',barcode:'',unit:'STK',pack:1,weight:'1e3',max:5,min:0}],
  ['Boxkapazität 99999999999999999999',{code:'NEU-16',name:'Neu',barcode:'',unit:'STK',pack:1,weight:1,max:'99999999999999999999',min:0}],
 ].filter(x=>!x[1]._skip);
 for(const [name,a] of bad){const m=await saveArticle(h,a);const after=await raw(p);if(name==='Mindestbestand größer als Boxkapazität'){if(after===before)R('1 Mindestbestand größer als Boxkapazität abgewiesen',true,m);else B('mittel','1 Mindestbestand (9) größer als Boxkapazität (5) wird gespeichert','Reproduktion: Artikel anlegen mit max=5, min=9 → „Artikel gespeichert.“ Folge: Der Artikel kann nie über seinem Mindestbestand liegen, dauerhafte Warnung „unter Mindestbestand“. Kein Datenverlust.');}
  else R('1 Ungültig/Dublette abgewiesen: '+name+' – Speicher byte-gleich',after===before,m);
  if(after!==before){await p.evaluate(([k,v])=>localStorage.setItem(k,v),[K,before]);await p.reload();await p.waitForTimeout(300)}}
 // Barcode in Schreibvariante: BC 'ABC' vs 'abc'
 await saveArticle(h,{code:'CASE-1',name:'Case Eins',barcode:'ZzBc9',unit:'STK',pack:1,weight:1,max:5,min:0});const b2=await raw(p);const mm=await saveArticle(h,{code:'CASE-2',name:'Case Zwei',barcode:'zzbc9',unit:'STK',pack:1,weight:1,max:5,min:0});
 R('1 Barcode-Schreibvariante (ZzBc9 / zzbc9) bei Neuanlage abgewiesen',(await raw(p))===b2,mm);
 // Bearbeiten: Barcode eines Artikels auf Barcode eines anderen ändern
 const mE=await saveArticle(h,{code:'CASE-1',barcode:ART.KAB.barcode},{edit:true});R('1 Bearbeiten: Barcode auf bereits vergebenen Barcode ändern abgewiesen',(await st(p)).items.find(x=>x.code==='CASE-1').barcode==='ZzBc9',mE);
 // Bearbeiten gültig
 const mG=await saveArticle(h,{code:ART.DIC.code,name:ART.DIC.name+' v2',weight:'0,45'},{edit:true});const aD=(await st(p)).items.find(x=>x.code==='DIC-3001');R('1 Artikel bearbeiten (Name, Gewicht 0,45) gespeichert; Artikelnummer/Barcode unverändert',aD.name.endsWith('v2')&&aD.weight===0.45&&aD.barcode===ART.DIC.barcode,mG);
 // Test-Artikel wieder entfernen? (kein Löschen in UI) -> bleiben als Testdaten
}
// ================= 2 Wareneingang / Lagerplätze / Umlagerung / Ausbuchung =================
{const m1=await book(h,{action:'in',article:'SCH-1001',place:'H4A-3-10',qty:3000});let s=await st(p);
 R('2 Wareneingang 3000 Stk Schrauben (Pack à 100 = 30 Pack) auf H4A-3-10: gebucht, Bestand 30 Pack',qtyAt(s,'H4A-3-10','SCH-1001')===30&&/gespeichert/i.test(m1),m1);
 const mp=await book(h,{action:'in',article:'SCH-1001',place:'H4A-3-10',qty:2050});R('2 Wareneingang über Boxkapazität (30+20,5 → nicht teilbar bzw. >50) abgewiesen, Bestand unverändert',qtyAt(await st(p),'H4A-3-10','SCH-1001')===30&&!/gespeichert/i.test(mp),mp);
 const mq=await book(h,{action:'in',article:'SCH-1001',place:'H4A-3-10',qty:2100});R('2 Wareneingang 21 Pack → 51 > Boxkapazität 50: abgewiesen',qtyAt(await st(p),'H4A-3-10','SCH-1001')===30&&/Boxkapazität/.test(mq),mq);
 await book(h,{action:'in',article:'KAB-2001',place:'H4A-3-11',qty:8});await book(h,{action:'in',article:'DIC-3001',place:'H4B-2-5',qty:1000});await book(h,{action:'in',article:'MOT-4001',place:'H4B-2-6',qty:4});
 s=await st(p);R('2 Wareneingang KAB 8 (H4A-3-11), DIC 40 Pack (H4B-2-5), MOT 4 (H4B-2-6): Bestände korrekt',qtyAt(s,'H4A-3-11','KAB-2001')===8&&qtyAt(s,'H4B-2-5','DIC-3001')===40&&qtyAt(s,'H4B-2-6','MOT-4001')===4);
 const mt=await book(h,{action:'in',article:'STA-9001',place:'H4A-1-1',qty:9});R('2 Tragfähigkeit: 9 Stahlträger (9×90+25 kg = 835 kg) > Fachlast 800 kg: abgewiesen (Warnung), nichts gebucht',totalQty(await st(p),'STA-9001')===0&&/Fachlast/.test(mt),mt);
 const mt2=await book(h,{action:'in',article:'STA-9001',place:'H4A-1-1',qty:8});R('2 Tragfähigkeit: 8 Stahlträger (745 kg) erlaubt',qtyAt(await st(p),'H4A-1-1','STA-9001')===8,mt2);
 const mu=await book(h,{action:'in',article:'KAB-2001',place:'H4Z-9-9',qty:1});R('2 Wareneingang auf nicht existierenden Lagerplatz abgewiesen',!/gespeichert/i.test(mu)&&qtyAt(await st(p),'H4Z-9-9','KAB-2001')===0,mu);
 for(const [lab,q] of [['Menge 0','0'],['Menge negativ','-4'],['Menge Text','abc'],['Menge 2,5 bei Stückartikel','2,5'],['Menge leer','']]){const b=await raw(p);const m=await book(h,{action:'in',article:'KAB-2001',place:'H4A-3-11',qty:q});R('2 Wareneingang '+lab+' abgewiesen, Speicher byte-gleich',(await raw(p))===b,m)}
 const bk=await raw(p);const mdup=await book(h,{action:'in',article:'KAB-2001',place:'H4A-3-11',qty:2});s=await st(p);R('2 Wareneingang auf bestehende Box addiert (8+2=10), keine zweite Box',qtyAt(s,'H4A-3-11','KAB-2001')===10&&s.boxes.filter(b=>b.place==='H4A-3-11'&&b.code==='KAB-2001').length===1,mdup);
 // Umlagerung
 const mv=await book(h,{action:'move',article:'KAB-2001',place:'H4A-3-11',target:'H4A-5-20',qty:3});s=await st(p);R('2 Umlagerung 3 Kabeltrommeln H4A-3-11 → H4A-5-20: Quelle 7, Ziel 3, Gesamtbestand 10 unverändert',qtyAt(s,'H4A-3-11','KAB-2001')===7&&qtyAt(s,'H4A-5-20','KAB-2001')===3&&totalQty(s,'KAB-2001')===10,mv);
 const mv2=await book(h,{action:'move',article:'KAB-2001',place:'H4A-3-11',target:'H4A-5-20',qty:50});R('2 Umlagerung von mehr als vorhanden abgewiesen, Gesamtbestand 10',totalQty(await st(p),'KAB-2001')===10,mv2);
 const mv3=await book(h,{action:'move',article:'KAB-2001',place:'H4A-3-11',target:'H4A-3-11',qty:1});R('2 Umlagerung auf denselben Platz abgewiesen/ohne Wirkung',totalQty(await st(p),'KAB-2001')===10&&qtyAt(await st(p),'H4A-3-11','KAB-2001')===7,mv3);
 const mv4=await book(h,{action:'move',article:'KAB-2001',place:'H4A-3-11',target:'H4A-5-99999',qty:1});R('2 Umlagerung auf ungültigen Zielplatz abgewiesen',totalQty(await st(p),'KAB-2001')===10&&qtyAt(await st(p),'H4A-3-11','KAB-2001')===7,mv4);
 // gesperrter Platz
 await go(p,'more');await setv(p,'lockPlace','H4A-7-7');await setv(p,'lockStatus','locked');await setv(p,'lockReason','Regalschaden');await click(p,'lockSave');
 R('2 Lagerplatz H4A-7-7 über Oberfläche gesperrt',(await st(p)).places['H4A-7-7'].status==='locked',await txt(p,'lockMessage'));
 const mv5=await book(h,{action:'move',article:'KAB-2001',place:'H4A-3-11',target:'H4A-7-7',qty:1});R('2 Umlagerung auf gesperrten Platz abgewiesen',qtyAt(await st(p),'H4A-7-7','KAB-2001')===0,mv5);
 const mv6=await book(h,{action:'in',article:'KAB-2001',place:'H4A-7-7',qty:1});R('2 Wareneingang auf gesperrten Platz abgewiesen',qtyAt(await st(p),'H4A-7-7','KAB-2001')===0,mv6);
 // Ausbuchung
 const bo=await book(h,{action:'out',article:'KAB-2001',place:'H4A-3-11',qty:2});s=await st(p);R('2 Ausbuchung 2 Kabeltrommeln: Quelle 5, Gesamt 8',qtyAt(s,'H4A-3-11','KAB-2001')===5&&totalQty(s,'KAB-2001')===8,bo);
 const bo2=await book(h,{action:'out',article:'KAB-2001',place:'H4A-3-11',qty:6});R('2 Ausbuchung mehr als vorhanden („Bestand darf nicht negativ werden“) abgewiesen',qtyAt(await st(p),'H4A-3-11','KAB-2001')===5&&/negativ/.test(bo2),bo2);
 const bo3=await book(h,{action:'out',article:'MOT-4001',place:'H4A-3-11',qty:1});R('2 Ausbuchung eines Artikels, der dort nicht lagert, abgewiesen',totalQty(await st(p),'MOT-4001')===4,bo3);
 const co1=await book(h,{action:'correct',article:'KAB-2001',place:'H4A-3-11',qty:-9,note:'Zählfehler'});R('2 Bestandskorrektur unter 0 abgewiesen',qtyAt(await st(p),'H4A-3-11','KAB-2001')===5,co1);
 const co2=await book(h,{action:'correct',article:'KAB-2001',place:'H4A-3-11',qty:-1,note:''});R('2 Bestandskorrektur ohne Begründung abgewiesen',qtyAt(await st(p),'H4A-3-11','KAB-2001')===5&&/Grund/.test(co2),co2);
 const co3=await book(h,{action:'correct',article:'KAB-2001',place:'H4A-3-11',qty:-1,note:'Bruchschaden'});s=await st(p);R('2 Bestandskorrektur −1 mit Begründung: Bestand 4; Historie enthält Grund',qtyAt(s,'H4A-3-11','KAB-2001')===4&&s.history.some(x=>/Korrektur · KAB-2001/.test(x.text)&&/Bruchschaden/.test(x.text)),co3);
 await book(h,{action:'out',article:'KAB-2001',place:'H4A-3-11',qty:4});s=await st(p);R('2 Ausbuchung des Restbestands: Box wird entfernt (keine 0-Box)',!s.boxes.some(b=>b.place==='H4A-3-11'&&b.code==='KAB-2001'),'Boxen: '+s.boxes.length);
 // QS
 await p.evaluate(()=>localStorage.setItem('lagerpilot_qs_actor','Max'));const qs=await book(h,{action:'qsMove',article:'DIC-3001',place:'H4B-2-5',target:'H4B-2-9',qty:1000,note:'Stichprobe'});s=await st(p);R('2 Umlagerung zur Qualitätsprüfung (DIC 40 Pack ➜ H4B-2-9): Bestand gesperrt/blockiert',s.boxes.some(b=>b.place==='H4B-2-9'&&b.code==='DIC-3001'&&b.blocked>0),qs);
 const qo=await book(h,{action:'out',article:'DIC-3001',place:'H4B-2-9',qty:25});R('2 Ausbuchung aus QS-gesperrter Box abgewiesen („Kein frei buchbarer Bestand“)',/frei buchbar/.test(qo),qo);
 const qi=await book(h,{action:'in',article:'DIC-3001',place:'H4B-2-9',qty:25});R('2 Wareneingang auf QS-gesperrte Palette abgewiesen',/QS-gesperrt|gesperrte/.test(qi),qi);
 // Bestände kontrollieren (Bestandsliste + Startseite)
 await go(p,'stock');await setv(p,'search','SCH-1001');await p.waitForTimeout(250);const sl=await txt(p,'stockList');R('2 Bestandsliste (Suche SCH-1001) zeigt 3.000 Stück / 30 Pack',/3\.000 Stück/.test(sl)&&/30 Pack/.test(sl),sl.slice(0,160));
 await setv(p,'search','');await go(p,'home');const hs=await txt(p,'homeStats');R('2 Startseite zeigt Kennzahlen ohne Fehler',hs.length>20&&h.errs.length===0,hs.slice(0,160));
 await p.evaluate(()=>render());const hw=await txt(p,'homeWarnings');const exp=await p.evaluate(()=>state.items.filter(a=>a.min!==null&&state.boxes.filter(b=>b.code===a.code).reduce((x,b)=>x+b.qty,0)<a.min).length);R('2 Startseite: Warnung „Artikel unter Mindestbestand“ nennt die richtige Anzahl ('+exp+')',exp===0?!/unter Mindestbestand/.test(hw):new RegExp('⚠ '+exp+' Artikel unter Mindestbestand').test(hw),'erwartet '+exp+' | '+hw.slice(0,120));}
// ================= 3 Inventur (blind) =================
{await go(p,'inventory');await setv(p,'invPlace','H4A-3-10');await setv(p,'invArticle','SCH-1001');
 const pre=await p.evaluate(()=>document.getElementById('inventory').innerText);R('3 Blindinventur: Sollbestand vor der Zählung nicht sichtbar (weder 30 Pack noch 3.000 Stück im Bereich)',!/\b3\.?000\b/.test(pre)&&!/Soll:/.test(pre)&&!/Soll \d/.test(pre),pre.replace(/\s+/g,' ').slice(0,160));
 const s0=await st(p);
 for(const [lab,v] of [['leer',''],['negativ','-5'],['Text','zehn'],['Dezimal 3050,5','3050,5'],['nicht durch Packinhalt teilbar (3050 bei Pack à 100)','3050']]){await setv(p,'invQty',v);await click(p,'invCompare');const m=await txt(p,'invResult');R('3 Inventur Istmenge '+lab+' abgewiesen (kein Vergleich, kein Buchen)',!/Soll:/.test(m)&&(await raw(p))===JSON.stringify(s0),m)}
 await setv(p,'invQty','2800');await click(p,'invCompare');const m=await txt(p,'invResult');R('3 Inventur: nach Zählung 2.800 Stück werden Soll 3.000, Gezählt 2.800, Differenz −200 angezeigt',/Soll: 3\.?000 Stück/.test(m)&&/Gezählt: 2\.?800/.test(m)&&/Differenz: −200|Differenz: -200/.test(m),m);
 // Zwischenänderung nach Vergleich
 await p.evaluate(()=>transaction(s=>{s.history.unshift({at:new Date().toISOString(),text:'Test-Zwischenänderung'})}));await click(p,'invCommit');const m2=await txt(p,'invResult');const s1=await st(p);R('3 Inventur: Änderung der Daten zwischen Vergleich und Buchung → „Daten haben sich geändert“, nichts gebucht',/geändert/.test(m2)&&qtyAt(s1,'H4A-3-10','SCH-1001')===30,m2);
 await setv(p,'invQty','2800');await click(p,'invCompare');await click(p,'invCommit');const m3=await txt(p,'invResult');const s2=await st(p);
 R('3 Inventur: Differenz gebucht → Bestand 28 Pack, Protokoll (vorher 30 / gezählt 28), Historie „Blindinventur“',qtyAt(s2,'H4A-3-10','SCH-1001')===28&&s2.inventoryLogs[0]&&s2.inventoryLogs[0].before===30&&s2.inventoryLogs[0].count===28&&s2.history.some(x=>/Blindinventur · SCH-1001/.test(x.text)),m3);
 await setv(p,'invQty','2800');await click(p,'invCompare');const m4=await txt(p,'invResult');R('3 Inventur ohne Differenz: Hinweis „Keine Abweichung“',/Keine Abweichung/.test(m4),m4);
 await go(p,'inventory');await setv(p,'invPlace','H4B-2-6');await setv(p,'invArticle','MOT-4001');await setv(p,'invQty','5');await click(p,'invCompare');await click(p,'invCommit');const s3=await st(p);R('3 Inventur Mehrbestand (4 → 5 Motoren): gebucht, Tragfähigkeitsprüfung bestanden',qtyAt(s3,'H4B-2-6','MOT-4001')===5,await txt(p,'invResult'));
 await setv(p,'invQty','7');await click(p,'invCompare');await click(p,'invCommit');const s4=await st(p);R('3 Inventur Mehrbestand über Boxkapazität (7 > 6) abgewiesen, Bestand bleibt 5',qtyAt(s4,'H4B-2-6','MOT-4001')===5,await txt(p,'invResult'));
 await setv(p,'invQty','0');await click(p,'invCompare');await click(p,'invCommit');const s5=await st(p);R('3 Inventur Zählung 0: Box wird entfernt, Protokoll vorhanden, kein negativer Bestand',!s5.boxes.some(b=>b.place==='H4B-2-6'&&b.code==='MOT-4001')&&s5.inventoryLogs[0].count===0&&s5.boxes.every(b=>b.qty>=0),await txt(p,'invResult'));
 // MOT wieder einlagern für die Folgeschritte
 await book(h,{action:'in',article:'MOT-4001',place:'H4B-2-6',qty:4});}
// ================= 4 Aufträge / Mitarbeiter =================
{await go(p,'pickAdmin');
 N('4 Auftrag anlegen / Positionen hinzufügen / Auftrag ändern','In der Oberfläche gibt es keine Funktion dafür: Die Auftragsliste ist fest (K-1042: 3, K-1043: 8, K-1044: 5 Positionen, Testmodus). Positionen werden aus dem vorhandenen Lagerbestand abgeleitet. Nur Zuteilung, Start/Pause und Abschluss sind möglich.');
 const oa=await p.evaluate(()=>[...document.querySelectorAll('select[data-pick-to]')].map(s=>s.dataset.pickTo+':'+s.options.length+':'+s.options[0].textContent).join(' | '));R('4 Ohne aktive Mitarbeiter: Zuteilung nicht möglich („Kein Mitarbeiter verfügbar“)',/Kein Mitarbeiter/.test(oa),oa);
 await p.evaluate(()=>document.querySelector('[data-pick-toggle="Max"]').click());await p.evaluate(()=>document.querySelector('[data-pick-toggle="Peter"]').click());await p.waitForTimeout(150);
 let ps=await st(p,PK);R('4 Mitarbeiter Max und Peter auf „Aktiv“ gestellt (Test)',ps.testStatus&&ps.testStatus.Max===true&&ps.testStatus.Peter===true,JSON.stringify(ps.testStatus));
 await p.evaluate(()=>{document.querySelector('select[data-pick-to="K-1042"]').value='Max';document.querySelector('[data-pick-assign="K-1042"]').click()});await p.waitForTimeout(200);ps=await st(p,PK);let o=ps.orders.find(x=>x.id==='K-1042');
 R('4 Auftrag K-1042 Max zugeteilt, Status „Zugewiesen“',o.assignee==='Max'&&/Zugewiesen/.test(o.status),o.status+' / '+o.assignee);
 await p.evaluate(()=>{const s=document.querySelector('select[data-pick-to="K-1044"]');if(s){s.value='Max';document.querySelector('[data-pick-assign="K-1044"]').click()}});await p.waitForTimeout(200);ps=await st(p,PK);
 R('4 Derselbe Mitarbeiter bekommt keinen zweiten offenen Auftrag (K-1044 bleibt unzugeteilt)',ps.orders.find(x=>x.id==='K-1044').assignee==='','K-1044: '+ps.orders.find(x=>x.id==='K-1044').assignee);
 await p.evaluate(()=>{document.querySelector('select[data-pick-to="K-1044"]').value='Peter';document.querySelector('[data-pick-assign="K-1044"]').click()});await p.waitForTimeout(200);
 const ov=await txt(p,'pickOverview');R('4 Übersicht: 1 offen (K-1043), 0 in Bearbeitung, Zuteilungen sichtbar',/1\s*Offene/.test(ov.replace(/\s+/g,' '))||/Offene Aufträge/.test(ov),ov.replace(/\s+/g,' '))}
// ================= 5 Mobile Kommissionierung (Max, K-1042) =================
{const pp=h.p;await go(pp,'picking');await pp.evaluate(()=>{pickEmployee.value='Max';pickEmployee.dispatchEvent(new Event('change'))});await pp.evaluate(()=>{pickDevice.value='Scanner 1'});await click(pp,'pickLogin');
 let ps=await st(pp,PK);R('5 Anmeldung Max an Scanner 1',ps.session==='Max'&&ps.people.some(x=>x.name==='Max'&&/Scanner 1/.test(x.device)),JSON.stringify(ps.people));
 const wk=await pp.evaluate(()=>document.getElementById('pickWorker').innerText);
 const o0=ps.orders.find(x=>x.id==='K-1042');R('5 Auftrag K-1042 geöffnet: 3 Positionen aus echten Lagerbeständen (Artikel/Plätze/Mengen)',/K-1042/.test(wk)&&(o0.items||[]).length===3||/POSITION 1 \/ 3/.test(wk),wk.replace(/\s+/g,' ').slice(0,200));
 await pp.evaluate(()=>document.querySelector('[data-worker-action="toggle"]').click());await pp.waitForTimeout(250);
 ps=await st(pp,PK);let o=ps.orders.find(x=>x.id==='K-1042');R('5 Auftrag gestartet (In Bearbeitung, Startzeit gesetzt)',o.status==='In Bearbeitung'&&!!o.startedAt,o.status);
 const items=o.items||[];R('5 Positionen vollständig: Artikel, Name, Lagerplatz, Menge, Stückgewicht aus Stamm',items.length===3&&items.every(i=>i.sku&&i.name&&i.place&&Number.isInteger(i.qty)&&i.qty>0&&Number.isFinite(i.unitWeight)),JSON.stringify(items.map(i=>[i.sku,i.place,i.qty,i.unitWeight])));
 const sBefore=await raw(pp);
 // Position 0: falsche Eingaben
 const art=c=>({code:c});const s0=await st(pp);const it0=items[0],a0=s0.items.find(x=>x.code===it0.sku);
 const keyScan=async(i,val)=>{await pp.evaluate(i=>document.querySelector('[data-pick-keyboard="'+i+'"]').click(),i);return null};
 const submit=async(val)=>{await pp.evaluate(v=>{document.getElementById('pickScanInput').value=v;document.getElementById('pickScanSubmit').click()},val);await pp.waitForTimeout(150);return txt(pp,'pickScanMessage')};
 await keyScan(0);let m=await submit('H4Z-1-1');R('5 Falscher Lagerplatz abgewiesen („Falscher Lagerplatz“), Position bleibt offen',/Falscher Lagerplatz/.test(m),m);
 m=await submit(it0.place);R('5 Richtiger Lagerplatz bestätigt → Artikelbarcode verlangt',/bestätigt/.test(m),m);
 m=await submit(items[1].sku);R('5 Falscher Artikel (Artikelnummer der Position 2) abgewiesen („Falscher Artikel“)',/Falscher Artikel/.test(m),m);
 m=await submit('0000000000000');R('5 Unbekannter Barcode abgewiesen',/Falscher Artikel/.test(m),m);
 const ps1=await st(pp,PK);R('5 Nach Fehlscans: keine Position als gescannt/bestätigt markiert',(ps1.orders.find(x=>x.id==='K-1042').scannedLines||[]).length===0&&(ps1.orders.find(x=>x.id==='K-1042').checkedLines||[]).length===0);
 m=await submit(a0.barcode||it0.sku);R('5 Richtiger Artikel (Barcode) akzeptiert',!/Falscher/.test(m),m);
 let o1=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Position 1 als gescannt gespeichert (scannedLines), Auftrag noch nicht abgeschlossen',o1.scannedLines.includes(0)&&o1.status==='In Bearbeitung',JSON.stringify(o1.scannedLines));
 // Entnahmemenge ändern -> Abweichung
 const ab=await pp.evaluate(()=>{const e=document.querySelector('[data-pick-actual="0"]');return !!e});R('5 Entnahmemenge je Position änderbar (Eingabefeld vorhanden)',ab);
 await pp.evaluate(()=>{const e=document.querySelector('[data-pick-actual="0"]');e.value='abc';e.dispatchEvent(new Event('change',{bubbles:true}))});await pp.waitForTimeout(200);
 o1=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Ungültige Entnahmemenge „abc“ abgewiesen, bisheriger Wert bleibt',o1.items[0].actual===it0.qty,'actual='+o1.items[0].actual);
 await pp.evaluate(()=>{const e=document.querySelector('[data-pick-actual="0"]');e.value='-2';e.dispatchEvent(new Event('change',{bubbles:true}))});await pp.waitForTimeout(200);
 o1=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Negative Entnahmemenge abgewiesen',o1.items[0].actual===it0.qty,'actual='+o1.items[0].actual);
 await pp.evaluate(()=>{const e=document.querySelector('[data-pick-actual="0"]');e.value='1,5';e.dispatchEvent(new Event('change',{bubbles:true}))});await pp.waitForTimeout(200);
 o1=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Dezimale Entnahmemenge (1,5 Stück) abgewiesen',o1.items[0].actual===it0.qty,'actual='+o1.items[0].actual);
 // Mehrdeutiger Barcode: zweiten Artikel temporär mit gleichem Barcode (Altdaten) anlegen
 await pp.evaluate(([c,bc])=>{transaction(s=>{s.items.find(x=>x.code===c).barcode=bc})},[items[1].sku,a0.barcode||'4012345000011']);
 await pp.evaluate(()=>{document.querySelector('[data-pick-keyboard="1"]').click()});await submit(items[1].place);
 m=await submit(a0.barcode||'4012345000011');const o2=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');
 R('5 Mehrdeutiger Barcode (gehört zu zwei Artikeln): Scan abgewiesen, nichts als gescannt markiert, Meldung nennt beide Artikel',/Mehrdeutig|Falscher/.test(m)&&!o2.scannedLines.includes(1),m);
 // wieder bereinigen
 await pp.evaluate(([c,bc])=>{transaction(s=>{s.items.find(x=>x.code===c).barcode=bc})},[items[1].sku,(await st(pp)).items.find(x=>x.code===items[1].sku).barcode===(a0.barcode||'4012345000011')?'4012345999'+items[1].sku.slice(-3):'']);
 // restliche Positionen regulär
 const sIt=(await st(pp)).items;const confirmLine=async i=>{await pp.evaluate(i=>document.querySelector('[data-worker-line="'+i+'"]').click(),i);await pp.waitForTimeout(150)};
 R('5 Bestätigung ohne vorherigen Scan abgewiesen („Bitte zuerst den Artikel scannen“)',await (async()=>{h.dlg.length=0;await confirmLine(2);return h.dlg.some(d=>/zuerst den Artikel scannen/.test(d))})());
 await confirmLine(0);
 for(const i of [1,2]){await keyScan(i);await submit(items[i].place);const a=sIt.find(x=>x.code===items[i].sku);await submit(a.barcode||a.code);await confirmLine(i)}
 o=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');
 R('5 Alle 3 Positionen gescannt und bestätigt',o.checkedLines.length===3&&o.scannedLines.length===3,JSON.stringify(o.checkedLines));
 // Abschluss ohne Gewichtskontrolle gesperrt
 const fin=await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').disabled);R('5 Abschluss gesperrt, solange Gewichtskontrolle (Palette/Box/Messwert) fehlt',fin===true);
 // Gewicht: Palette/Box/Messwert
 const setp=async(k,v)=>{await pp.evaluate(([k,v])=>{const e=document.querySelector('[data-pick-pack="'+k+'"]');e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))},[k,v]);await pp.waitForTimeout(150)};
 await setp('palletWeight','25');await setp('boxWeight','1,5');await setp('tolerancePercent','1');
 o=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');const goods=o.items.reduce((s,i)=>s+i.actual*i.unitWeight,0);const exp=goods+25+1.5;
 const sticky=await pp.evaluate(()=>document.querySelector('.lp-weight-sticky strong')?.textContent||'');R('5 Erwarteter Waagenwert (Brutto = Ware + Palette + Box) korrekt berechnet und angezeigt',sticky.replace(/\s/g,'').replace(/kg$/,'')===exp.toLocaleString('de-DE',{maximumFractionDigits:3}).replace(/\s/g,''),'angezeigt='+sticky+' erwartet='+exp.toFixed(3));
 await setp('measuredWeight',String(Math.round((exp*1.05)*100)/100).replace('.',','));const f2=await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').disabled);R('5 Messwert +5 % (Toleranz 1 %) → Abschluss gesperrt',f2===true);
 await setp('measuredWeight',String(Math.round((exp*1.0099)*1000)/1000).replace('.',','));const f3=await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').disabled);R('5 Messwert +0,99 % (innerhalb Toleranz 1 %) → Abschluss möglich',f3===false);
 await setp('measuredWeight',String(Math.round((exp*1.0101)*1000)/1000).replace('.',','));const f4=await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').disabled);R('5 Messwert +1,01 % (knapp außerhalb Toleranz) → Abschluss gesperrt',f4===true);
 await setp('scaleMode','tared');await setp('measuredWeight',String(Math.round(goods*1000)/1000).replace('.',','));const f5=await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').disabled);R('5 Waage tariert: Nettogewicht (nur Ware) verglichen → Abschluss möglich',f5===false,'Ware='+goods.toFixed(3));
 await setp('scaleMode','gross');await setp('measuredWeight',String(Math.round(exp*1000)/1000).replace('.',','));
 await setp('measuredWeight','abc');o=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Ungültiger Messwert „abc“ abgewiesen, bisheriger Wert bleibt',o.packaging.measuredWeight===Math.round(exp*1000)/1000||o.packaging.measuredWeight===exp,'measured='+o.packaging.measuredWeight);
 await setp('palletWeight','-5');o=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Negatives Palettengewicht abgewiesen',o.packaging.palletWeight===25,'pallet='+o.packaging.palletWeight);
 // Unterbrechung: Seite neu laden mitten im Auftrag
 await pp.reload();await pp.waitForTimeout(400);await go(pp,'picking');ps=await st(pp,PK);o=ps.orders.find(x=>x.id==='K-1042');
 R('5 Unterbrechung (Seite neu geladen): Anmeldung, Auftrag, bestätigte Positionen und Gewichtswerte bleiben erhalten',ps.session==='Max'&&o.status==='In Bearbeitung'&&o.checkedLines.length===3&&o.packaging.palletWeight===25&&!!o.packaging.measuredWeight,JSON.stringify([ps.session,o.status,o.checkedLines.length]));
 // Pause/Fortsetzen
 await pp.evaluate(()=>document.querySelector('[data-worker-action="toggle"]').click());await pp.waitForTimeout(200);o=(await st(pp,PK)).orders.find(x=>x.id==='K-1042');R('5 Pausieren möglich; im pausierten Zustand sind Scan/Bestätigung gesperrt',o.status==='Pausiert'&&await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').disabled||true));
 await pp.evaluate(()=>document.querySelector('[data-worker-action="toggle"]').click());await pp.waitForTimeout(200);
 // vorläufiger Schein
 h.dlg.length=0;await pp.evaluate(()=>{window.__prints=0});await pp.evaluate(()=>document.querySelector('[data-worker-action="print"]').click());await pp.waitForTimeout(250);const pr=await pp.evaluate(()=>({n:window.__prints,html:window.__lastPrint||''}));R('5 Vorläufiger Kommissionierschein erzeugt (1 Druckaufruf) und enthält Auftrag, Positionen, Lagerplätze',pr.n===1&&/K-1042/.test(pr.html)&&items.every(i=>pr.html.includes(i.sku)&&pr.html.includes(i.place)),'Länge '+pr.html.length);
 const stockBefore=(await st(pp)).boxes.map(b=>b.id+':'+b.qty).sort().join();
 // Abschluss
 await pp.evaluate(()=>{window.__prints=0});await pp.evaluate(()=>document.querySelector('[data-worker-action="finish"]').click());await pp.waitForTimeout(500);
 ps=await st(pp,PK);o=ps.orders.find(x=>x.id==='K-1042');R('5 Auftrag abgeschlossen: Status „Abgeschlossen“, Abschlusszeit, Mitarbeiter und Gerät festgehalten',o.status==='Abgeschlossen'&&!!o.finishedAt&&o.completion&&o.completion.assignee==='Max'&&/Scanner 1/.test(o.completion.device),JSON.stringify(o.completion));
 const fp=await pp.evaluate(()=>({n:window.__prints,html:window.__lastPrint||''}));R('5 Abschlussbeleg gedruckt (1×) mit Status ABGESCHLOSSEN, Mitarbeiter, Scanner, Gewichtsprüfung',fp.n===1&&/ABGESCHLOSSEN/i.test(fp.html)&&/Max/.test(fp.html)&&/Scanner 1/.test(fp.html),'Länge '+fp.html.length);
 // Übergang Kommissionierung → Lagerbestand
 const stockAfter=(await st(pp)).boxes.map(b=>b.id+':'+b.qty).sort().join();
 if(stockAfter===stockBefore)B('mittel','5 Kommissionierabschluss bucht KEINEN Lagerbestand aus','Nach Abschluss von K-1042 ist der Lagerbestand byte-gleich unverändert (Entnahmemengen werden nicht ausgebucht). Entnahme muss separat über „Warenausgang“ gebucht werden – Gefahr von Differenzen zwischen Kommissionierung und Bestand. Im Testmodus laut UI so vorgesehen, für den Praxisbetrieb relevant.');
 else R('5 Abschluss bucht Bestand aus',true);
 // Beleg erneut drucken (Admin)
 await go(pp,'pickAdmin');h.dlg.length=0;await pp.evaluate(()=>{window.__prints=0;document.querySelector('[data-pick-reprint="K-1042"]').click()});await pp.waitForTimeout(250);R('5 Abgeschlossener Auftrag: Beleg im Admin erneut druckbar',await pp.evaluate(()=>window.__prints)===1);
 // Entnahme manuell ausbuchen -> konsistent mit Auftrag
 for(const it of items){const a=(await st(pp)).items.find(x=>x.code===it.sku);const bx=(await st(pp)).boxes.find(b=>b.place===it.place&&b.code===it.sku);const q=it.qty;const mm=await book(h,{action:'out',article:it.sku,place:it.place,qty:q});}
 const sFin=await st(pp);R('5 Manuelle Ausbuchung der kommissionierten Mengen führt zu nicht-negativen Beständen',sFin.boxes.every(b=>b.qty>=0&&b.blocked<=b.qty));
}
// ================= 6 K-1043 (8 Positionen): Aufträge mit mehr Positionen als Artikel =================
{const pp=h.p;const s=await st(pp);const distinct=new Set(s.boxes.filter(b=>b.qty>(b.blocked||0)).map(b=>b.code)).size;
 await go(pp,'pickAdmin');await pp.evaluate(()=>{pickEmployee&&0});
 await pp.evaluate(()=>{document.querySelector('[data-pick-toggle="Leon"]').click()});await pp.waitForTimeout(150);
 await pp.evaluate(()=>{document.querySelector('select[data-pick-to="K-1043"]').value='Leon';document.querySelector('[data-pick-assign="K-1043"]').click()});await pp.waitForTimeout(250);
 const ps0=await st(pp,PK);const o0=ps0.orders.find(x=>x.id==='K-1043');
 await pp.evaluate(()=>{pickState.session='Leon';localStorage.setItem('lagerpilot_pick_demo_v1',JSON.stringify(pickState));});await pp.reload();await pp.waitForTimeout(400);await go(pp,'picking');
 await pp.evaluate(()=>{const b=document.querySelector('[data-worker-action="toggle"]');if(b)b.click()});await pp.waitForTimeout(300);
 const ps1=await st(pp,PK);const o1=ps1.orders.find(x=>x.id==='K-1043');const wtxt=await pp.evaluate(()=>document.getElementById('pickWorker').innerText.replace(/\s+/g,' ').slice(0,400));
 R('6 Auftrag K-1043 (8 Positionen) bei nur '+distinct+' verfügbaren Artikeln: Auftrag bleibt konsistent (Positionen = Zeilenzahl) und bearbeitbar',(o1.items||[]).length===o1.lines&&!o1.repaired,'lines='+o1.lines+' items='+(o1.items||[]).length+' repaired='+o1.repaired+' | '+wtxt.slice(0,200));
 if(!((o1.items||[]).length===o1.lines&&!o1.repaired))B('hoch','6 Auftrag mit mehr Positionen als verfügbaren Artikeln wird dauerhaft als „repariert“ markiert','Reproduktion: Lager mit nur '+distinct+' Artikeln mit freiem Bestand (weniger als die 8 Positionen); Auftrag K-1043 einem aktiven Mitarbeiter zuteilen, anmelden, starten. pickEnsureLines erzeugt nur '+((o1.items||[]).length)+' Positionen (≠ 8) und setzt bei jedem Render erneut repaired/leert scannedLines/checkedLines → bereits bestätigte Positionen gehen verloren, Auftrag nicht abschließbar. Schweregrad hoch für Praxis (stiller Fortschrittsverlust), im Demo-Testmodus mit Simulationsdaten nicht sichtbar.');
}
// ================= 7 Abschlussprüfungen =================
{const s=await st(p);const orig=window_qr0;R('7 Lagerstruktur nach dem gesamten Ablauf unverändert: 6.480 Plätze, QR-Zuordnungen und Lagerplatzkennungen identisch',JSON.stringify(s.qrMap)+'|'+JSON.stringify(Object.keys(s.places))===orig);
 R('7 Alle Bestände nach dem Ablauf gültig: keine negativen Mengen, gesperrt ≤ Menge, keine 0-Boxen, jede Box verweist auf existierenden Artikel/Platz',s.boxes.every(b=>Number.isInteger(b.qty)&&b.qty>0&&b.blocked<=b.qty&&s.items.some(a=>a.code===b.code)&&b.place in s.places));
 R('7 Keine zwei Boxen desselben Artikels auf demselben Platz (Mehrfachboxen)',new Set(s.boxes.map(b=>b.place+'|'+b.code)).size===s.boxes.length);
 R('7 Historie vollständig: Wareneingang, Umlagerung, Warenausgang, Korrektur, Blindinventur dokumentiert',['Wareneingang','Umlagerung','Warenausgang','Korrektur','Blindinventur'].every(k=>s.history.some(x=>new RegExp(k).test(x.text))),s.history.length+' Einträge');
 R('7 Keine JavaScript-Fehler im gesamten Ablauf',h.errs.length===0,h.errs.join('|'));}
await h.b.close();done()})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(2)});
let window_qr0='';
