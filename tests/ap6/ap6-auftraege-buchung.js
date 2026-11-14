// AP6 – Auftragsverwaltung, mobile Kommissionierung, sofortige und sichere Bestandsbuchung (Playwright/Chromium, isolierte Daten je Kontext).
// Aufruf: BASE=http://localhost:8123/index.html node tests/ap6/ap6-auftraege-buchung.js
// Tests mit Kennzeichen [VORHER] prüfen Fehler aus AP5-Final und sind so geschrieben, dass sie auf dem Stand 1e26c85 scheitern (Gegenprobe: BASE=<alter Stand>).
const L=require('../final/lib');const {R,B,N,done}=L.reporter('AP6');
const {open,st,raw,txt,go,setv,click,wr,K,PK,BI,BL,chromium}=L;
const ART=[['A-1','Art 1','BC-1','STK',1,2,100],['A-2','Art 2','BC-2','P',10,5,50],['A-3','Art 3','BC-3','STK',1,0.5,200]];
async function seed(h,{extra=0,boxes=true}={}){await h.p.evaluate(([ART,extra,boxes])=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});
 for(const [code,name,barcode,unit,pack,weight,max] of ART)s.items.push({code,name,barcode,unit,pack,weight,max,min:null});
 for(let i=0;i<extra;i++)s.items.push({code:'X-'+String(i).padStart(3,'0'),name:'Extra '+i,barcode:'XB'+i,unit:'STK',pack:1,weight:1,max:500,min:null});
 if(boxes){s.boxes.push({id:'b1',place:'H4A-1-1',code:'A-1',qty:40,blocked:0},{id:'b2',place:'H4A-2-2',code:'A-1',qty:15,blocked:0},{id:'b3',place:'H4A-3-3',code:'A-2',qty:12,blocked:0},{id:'b4',place:'H4B-4-4',code:'A-3',qty:100,blocked:0});
  for(let i=0;i<extra;i++)s.boxes.push({id:'bx'+i,place:'H4B-5-'+(1+i%162),code:'X-'+String(i).padStart(3,'0'),qty:100,blocked:0});}
 s.qrMap['QR-1']='H4A-1-1'})},[ART,extra,boxes]);await h.p.reload();await h.p.waitForTimeout(400)}
const stock=async h=>{const s=await st(h.p);return Object.fromEntries(s.boxes.map(b=>[b.place+':'+b.code,b.qty]))};
const journal=async h=>(await st(h.p)).pickJournal||[];
const ord=async(h,id)=>(await st(h.p,PK)).orders.find(o=>o.id===id);
// Auftrag über die Oberfläche anlegen: lines=[[sku,qty]]
async function createOrder(h,id,lines){await go(h.p,'pickAdmin');await h.p.evaluate(()=>ordReset());if(id)await setv(h.p,'ordId',id);for(const [sku,q] of lines){await h.p.evaluate(sku=>{const a=document.getElementById('ordArticle');a.value=sku;a.dispatchEvent(new Event('change'))},sku);await setv(h.p,'ordQty',String(q));await click(h.p,'ordAddLine')}await click(h.p,'ordSave');return txt(h.p,'ordMsg')}
async function assignStart(h,id,name='Max',device='Scanner 1'){await h.p.evaluate(([id,name])=>{pickState.testStatus[name]=true;const o=pickState.orders.find(x=>x.id===id);o.assignee=name;if(o.status==='Offen')o.status='Zugewiesen';pickSave()},[id,name]);await go(h.p,'picking');await h.p.evaluate(([n,d])=>{pickEmployee.value=n;pickEmployee.dispatchEvent(new Event('change'));pickDevice.value=d},[name,device]);await click(h.p,'pickLogin');await h.p.evaluate(()=>{const b=document.querySelector('[data-worker-action="toggle"]');if(b&&/starten|Fortsetzen/i.test(b.textContent))b.click()});await h.p.waitForTimeout(250)}
async function scan(h,i,place,code){await h.p.evaluate(i=>document.querySelector('[data-pick-keyboard="'+i+'"]').click(),i);const sub=async v=>{await h.p.evaluate(v=>{document.getElementById('pickScanInput').value=v;document.getElementById('pickScanSubmit').click()},v);await h.p.waitForTimeout(120);return txt(h.p,'pickScanMessage')};const m1=await sub(place);const m2=code===null?'':await sub(code);return m1+' | '+m2}
async function book(h,i,q,box,{dbl=false}={}){if(q!==null)await setv(h.p,'pick-take-'+i,String(q));if(box)await setv(h.p,'pick-source-'+i,box);await h.p.evaluate(([i,dbl])=>{const b=document.querySelector('[data-pick-book="'+i+'"]');if(!b)throw Error('Buchen-Button fehlt');b.click();if(dbl){b.click();b.click()}},[i,dbl]);await h.p.waitForTimeout(350);return txt(h.p,'pickScanMessage')}
const lineText=(h,i)=>h.p.evaluate(i=>(document.getElementById('pick-line-'+i)||{innerText:''}).innerText.replace(/\s+/g,' '),i);
const valid=h=>h.p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7'))));
(async()=>{
// ===== 1 [VORHER] Fehler A: große Aufträge werden nicht zurückgesetzt =====
{const h=await open();await seed(h);await h.p.evaluate(()=>{pickState.testStatus.Max=true;pickSave()});
 await h.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='K-1043');o.assignee='Max';o.status='Zugewiesen';pickSave()});await go(h.p,'picking');await h.p.evaluate(()=>{pickEmployee.value='Max';pickEmployee.dispatchEvent(new Event('change'));pickDevice.value='Scanner 1'});await click(h.p,'pickLogin');await h.p.evaluate(()=>document.querySelector('[data-worker-action="toggle"]').click());await h.p.waitForTimeout(250);
 const o0=await ord(h,'K-1043');const n0=(o0.items||[]).length;
 R('1 [VORHER] K-1043 (8 Positionen) bei nur '+n0+' Artikeln mit Bestand: Positionen bleiben erhalten, Auftrag wird nicht als „repariert“ markiert',n0>0&&n0<8&&!o0.repaired,'items='+n0+' lines='+o0.lines+' repaired='+o0.repaired+' shortfall='+o0.shortfall);
 const w0=await txt(h.p,'pickWorker');R('1 Fehlende Positionen werden verständlich gekennzeichnet („fehlen N Position(en)“)',/fehlen \d+ Position/.test(w0)&&!/beschädigt/.test(w0),w0.slice(0,160));
 // Fortschritt in der Mitte, mehrfach rendern, neu laden
 await scan(h,0,(o0.items[0]).place,o0.items[0].sku);await h.p.evaluate(()=>pickSave());for(let k=0;k<3;k++)await h.p.evaluate(()=>pickRender());
 const o1=await ord(h,'K-1043');R('1 [VORHER] Gescannter Fortschritt überlebt wiederholtes Rendern',o1.scannedLines.includes(0)&&!o1.repaired,JSON.stringify(o1.scannedLines));
 await h.p.reload();await h.p.waitForTimeout(400);const o2=await ord(h,'K-1043');R('1 [VORHER] … und Neuladen (Positionen, Scan, Status unverändert)',o2.items.length===n0&&o2.scannedLines.includes(0)&&o2.status==='In Bearbeitung'&&!o2.repaired);
 R('1 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Erstinitialisierung: Demo-Aufträge nur wenn noch nichts gespeichert ist
{const h=await open();const p0=await st(h.p,PK).catch(()=>null);R('1 Erstinitialisierung: ohne gespeicherte Kommissionierdaten werden die 3 Demoaufträge erzeugt (nicht überschrieben)',(await h.p.evaluate(()=>pickState.orders.map(o=>o.id).join(',')))==='K-1042,K-1043,K-1044');
 await h.p.evaluate(([k])=>{const p=JSON.parse(localStorage.getItem(k))||{};},[PK]);await h.b.close()}
{const h=await open();await h.p.evaluate(k=>localStorage.setItem(k,JSON.stringify({people:[],roster:['Max','Peter','Leon','Anna'],orders:[{id:'X-1',lines:2,assignee:'',status:'Offen'}],session:''})),PK);await h.p.reload();await h.p.waitForTimeout(300);
 R('1 Bestehende Auftragsdaten werden beim Laden nicht durch Demodaten ersetzt (nur X-1, Mitarbeiter Anna bleibt)',(await h.p.evaluate(()=>pickState.orders.map(o=>o.id).join(',')))==='X-1'&&(await h.p.evaluate(()=>pickState.roster.includes('Anna'))));await h.b.close()}
// Aufträge mit 20 / 50 / 100 Positionen
for(const n of [20,50,100]){const h=await open();await seed(h,{extra:n});const idx=[...Array(n).keys()];
 await go(h.p,'pickAdmin');await h.p.evaluate(([n])=>{ordReset();ordDraft.lines=Array.from({length:n},(_,i)=>{const code='X-'+String(i).padStart(3,'0');return{old:null,sku:code,name:'Extra '+i,place:'H4B-5-'+(1+i%162),qty:3,booked:false}});ordRefresh()},[n]);await setv(h.p,'ordId','G-'+n);await click(h.p,'ordSave');const m=await txt(h.p,'ordMsg');
 R('1 Auftrag G-'+n+' mit '+n+' Positionen anlegen',/angelegt/.test(m)&&(await ord(h,'G-'+n)).items.length===n,m);
 await assignStart(h,'G-'+n);const t0=Date.now();await h.p.evaluate(()=>pickRender());const dt=Date.now()-t0;const w=await h.p.evaluate(()=>document.querySelectorAll('#pickWorker .lp-worker-line').length);
 R('1 Auftrag G-'+n+': alle '+n+' Positionen in der Mitarbeiteransicht ('+dt+' ms Rendern), Auftrag nicht repariert',w===n&&!(await ord(h,'G-'+n)).repaired,'Zeilen='+w);
 await scan(h,n-1,'H4B-5-'+(1+(n-1)%162),'XB'+(n-1));await book(h,n-1,3);const oo=await ord(h,'G-'+n);await h.p.reload();await h.p.waitForTimeout(400);const o2=await ord(h,'G-'+n);
 R('1 Auftrag G-'+n+': letzte Position bucht, Fortschritt nach Neuladen erhalten ('+o2.checkedLines.length+' bestätigt), '+n+' Positionen unverändert',o2.items.length===n&&o2.checkedLines.includes(n-1)&&(await journal(h)).length===1&&(await valid(h)));
 if(n===100){await go(h.p,'pickAdmin');await h.p.evaluate(()=>{ordReset();ordDraft.lines=Array.from({length:100},(_,i)=>({old:null,sku:'X-'+String(i).padStart(3,'0'),name:'e',place:'H4B-5-1',qty:1,booked:false}));ordRefresh()});await h.p.evaluate(()=>{const a=document.getElementById('ordArticle');a.value='A-1';a.dispatchEvent(new Event('change'))});await setv(h.p,'ordQty','1');await click(h.p,'ordAddLine');R('1 101. Position wird abgewiesen (Limit 100)',/Maximal 100/.test(await txt(h.p,'ordMsg')),await txt(h.p,'ordMsg'))}
 R('1 Keine JavaScript-Fehler (n='+n+')',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Nicht mehr verfügbare Artikel / fehlender Bestand
{const h=await open();await seed(h);await createOrder(h,'V-1',[['A-1',20],['A-3',10]]);await assignStart(h,'V-1');
 await h.p.evaluate(()=>transaction(s=>{s.boxes=s.boxes.filter(b=>b.code!=='A-3')}));await h.p.evaluate(()=>pickRender());const t=await lineText(h,1);
 R('1 Position ohne Bestand: verständlicher Hinweis, kein Buchen möglich, Auftrag bleibt erhalten',/kein frei buchbarer Bestand/.test(t)&&(await ord(h,'V-1')).items.length===2,t.slice(0,200));
 await h.p.evaluate(()=>transaction(s=>{s.items=s.items.filter(a=>a.code!=='A-3')}));await h.p.evaluate(()=>pickRender());R('1 Artikel aus dem Stamm entfernt: Hinweis „nicht mehr im Artikelstamm“, Auftrag bleibt erhalten',/nicht mehr im Artikelstamm/.test(await lineText(h,1))&&(await ord(h,'V-1')).items.length===2,(await lineText(h,1)).slice(0,160));
 R('1 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// ===== 2 [VORHER] Fehler B: Import ohne schema =====
{const h0=await open();await seed(h0);const base=await st(h0.p);await h0.b.close();
 const mk=f=>{const o=structuredClone(base);f(o);return o};
 const cases=[['v27-Sicherung ohne schema (Boxen, QR, Konfiguration vorhanden)',mk(o=>{delete o.schema}),false],['nur items/places/history als Objekte (v27-History)',mk(o=>{delete o.schema;delete o.boxes;delete o.qrMap;delete o.config;delete o.inventoryLogs}),false],['Altformat mit boxes-Schlüssel',{places:{},items:[{code:'L1',name:'x',minStock:1}],boxes:[],history:[]},false],['leeres Objekt',{},false],['nur Artikel',{items:[{code:'a',name:'b'}]},false],['places ohne items',{places:{}},false]];
 for(const [name,data,ok] of cases){const h=await open();await seed(h);const bf={k:await raw(h.p,K),pk:await raw(h.p,PK),bl:await raw(h.p,BL)};await go(h.p,'more');h.answers=[true,true];await h.p.setInputFiles('#jsonImport',wr('b.json',data));await h.p.waitForTimeout(500);
  const af={k:await raw(h.p,K),pk:await raw(h.p,PK),bl:await raw(h.p,BL)};R('2 [VORHER] Datei „'+name+'“ wird abgelehnt: Daten und Sicherungsstände byte-gleich, klare Meldung',JSON.stringify(bf)===JSON.stringify(af)&&/schema|Sicherung|Format/i.test(await txt(h.p,'backupMessage')),await txt(h.p,'backupMessage'));await h.b.close()}
 // gültiges Altformat 2.5 bleibt importierbar, ausdrücklich gekennzeichnet
 const leg={places:{},items:[{code:'L1',name:'Alt',minStock:5,locations:{'H4A-1-1':{available:3,blocked:0}}}],history:['alter Eintrag 1','alter Eintrag 2'],orders:[]};
 const h=await open();await seed(h);await go(h.p,'more');h.answers=[true];await h.p.setInputFiles('#jsonImport',wr('leg.json',leg));await h.p.waitForTimeout(600);const a=await st(h.p);
 R('2 Gültiges Altformat 2.5 wird weiterhin importiert (Artikel L1, Historie übernommen) und im Dialog ausdrücklich als ALTFORMAT gekennzeichnet',a.items.some(x=>x.code==='L1')&&h.dlg.some(d=>/ALTFORMAT ERKANNT/.test(d)),h.dlg.map(d=>d.slice(0,60)).join('|'));
 R('2 Vorheriger Stand wurde vor dem Altformat-Import gesichert',JSON.parse(await raw(h.p,BL)).items.length===1);await h.b.close()}
// ===== 3 Auftragsverwaltung =====
{const h=await open();await seed(h);
 let m=await createOrder(h,'T-100',[['A-1',20],['A-2',30]]);R('3 Auftrag anlegen (2 Positionen, Packartikel in Vielfachen von 10)',/angelegt/.test(m)&&(await ord(h,'T-100')).items.length===2,m);
 m=await createOrder(h,'t-100',[['A-1',1]]);R('3 Doppelte Auftragsnummer (auch Groß-/Kleinschreibung) abgewiesen',/existiert bereits/.test(m)&&(await st(h.p,PK)).orders.filter(o=>/t-100/i.test(o.id)).length===1,m);
 for(const [id,txt0] of [['bad id!','Ungültige Auftragsnummer'],['a'.repeat(33),'Ungültige Auftragsnummer']]){m=await createOrder(h,id,[['A-1',1]]);R('3 Ungültige Auftragsnummer „'+id.slice(0,12)+'“ abgewiesen',new RegExp(txt0).test(m),m)}
 await go(h.p,'pickAdmin');await h.p.evaluate(()=>ordReset());
 const addBad=async(sku,q)=>{await h.p.evaluate(sku=>{const a=document.getElementById('ordArticle');a.value=sku;a.dispatchEvent(new Event('change'))},sku);await setv(h.p,'ordQty',q);await click(h.p,'ordAddLine');return txt(h.p,'ordMsg')};
 for(const q of ['0','-3','2.5','abc','1e3','',' ','99999999999999999999'])R('3 Ungültige Menge „'+q+'“ abgewiesen, keine Position angelegt',!/hinzugefügt/.test(await addBad('A-1',q))&&(await h.p.evaluate(()=>ordDraft.lines.length))===0);
 R('3 Packartikel mit 15 Stück (Pack 10) abgewiesen',/Vielfaches/.test(await addBad('A-2','15')));
 R('3 Artikel ohne Bestand: kein Anlegen',/kein freier Bestand/.test(await (async()=>{await h.p.evaluate(()=>transaction(s=>{s.items.push({code:'N-0',name:'ohne',barcode:'',unit:'STK',pack:1,weight:1,max:5,min:null})}));await h.p.evaluate(()=>ordRefresh());return addBad('N-0','1')})()));
 await addBad('A-1','5');R('3 Gleicher Artikel zweimal im Auftrag abgewiesen',/bereits im Auftrag/.test(await addBad('A-1','2')));
 // Zuweisen, Fortschritt, Pausieren, Fortsetzen
 await h.p.evaluate(()=>ordReset());await h.p.evaluate(()=>{pickState.testStatus.Max=true;pickState.testStatus.Peter=true;pickSave()});await go(h.p,'pickAdmin');
 await h.p.evaluate(()=>{const s=document.querySelector('select[data-pick-to="T-100"]');s.value='Peter';});await click(h.p,'x').catch(()=>{});await h.p.evaluate(()=>document.querySelector('button[data-pick-assign="T-100"]').click());await h.p.waitForTimeout(200);
 let o=await ord(h,'T-100');R('3 Auftrag Mitarbeiter zuweisen (Peter, Status Zugewiesen)',o.assignee==='Peter'&&o.status==='Zugewiesen');
 await h.p.evaluate(()=>document.querySelector('button[data-pick-progress="T-100"]').click());o=await ord(h,'T-100');R('3 Auftrag starten',o.status==='In Bearbeitung'&&!!o.startedAt);
 await h.p.evaluate(()=>document.querySelector('button[data-pick-progress="T-100"]').click());o=await ord(h,'T-100');R('3 Auftrag pausieren',o.status==='Pausiert');
 await h.p.evaluate(()=>document.querySelector('button[data-pick-progress="T-100"]').click());o=await ord(h,'T-100');R('3 Auftrag fortsetzen',o.status==='In Bearbeitung');
 R('3 Fortschrittsanzeige in der Auftragsübersicht („0 / 2 Pos.“, „gebucht 0 / 50 Stk.“)',/0 \/ 2 Pos\./.test(await txt(h.p,'pickOrders'))&&/gebucht 0 \/ 50 Stk\./.test(await txt(h.p,'pickOrders')),(await txt(h.p,'pickOrders')).slice(0,200));
 R('3 Laufender Auftrag ist nicht bearbeitbar (Hinweis zuerst pausieren)',!(await h.p.evaluate(()=>!!document.querySelector('[data-ord-edit="T-100"]'))));
 await h.p.evaluate(()=>document.querySelector('button[data-pick-progress="T-100"]').click());
 // Bearbeiten ohne Buchung
 await h.p.evaluate(()=>document.querySelector('[data-ord-edit="T-100"]').click());await h.p.waitForTimeout(150);R('3 Bearbeiten lädt Auftrag in den Editor (2 Positionen)',(await h.p.evaluate(()=>ordDraft.lines.length))===2&&(await h.p.evaluate(()=>ordDraft.mode))==='edit');
 await h.p.evaluate(()=>{const e=document.querySelector('[data-ord-qty="0"]');e.value='25';e.dispatchEvent(new Event('change',{bubbles:true}))});await h.p.evaluate(()=>{const a=document.getElementById('ordArticle');a.value='A-3';a.dispatchEvent(new Event('change'))});await setv(h.p,'ordQty','7');await click(h.p,'ordAddLine');await h.p.evaluate(()=>document.querySelector('[data-ord-remove="1"]').click());await click(h.p,'ordSave');o=await ord(h,'T-100');
 R('3 Auftrag ändern: Menge Pos. 1 = 25, Pos. 2 entfernt, A-3 hinzugefügt; Status/Mitarbeiter erhalten',o.items.map(i=>i.sku+':'+i.qty).join()==='A-1:25,A-3:7'&&o.assignee==='Peter'&&o.status==='Pausiert'&&o.lines===2,o.items.map(i=>i.sku+':'+i.qty).join());
 // Abschließen und Stornieren
 h.prompts=['Doppelt bestellt, nicht benötigt'];await h.p.evaluate(()=>document.querySelector('[data-ord-cancel="T-100"]').click());await h.p.waitForTimeout(250);o=await ord(h,'T-100');
 R('3 Auftrag ohne Entnahme stornieren: Status Storniert, Grund gespeichert, Bestand unverändert',o.status==='Storniert'&&/Doppelt/.test(o.cancelled.reason)&&(await stock(h))['H4A-1-1:A-1']===40);
 R('3 Stornierter Auftrag ist nicht mehr bearbeitbar/zuteilbar (keine Buttons Bearbeiten/Stornieren/Zuteilen)',!(await h.p.evaluate(()=>!!document.querySelector('[data-ord-edit="T-100"],[data-ord-cancel="T-100"],button[data-pick-assign="T-100"]'))));
 // Stornierung mit zu kurzem Grund
 await createOrder(h,'T-101',[['A-1',5]]);h.prompts=['abc'];await go(h.p,'pickAdmin');await h.p.evaluate(()=>document.querySelector('[data-ord-cancel="T-101"]').click());await h.p.waitForTimeout(200);R('3 Stornierung mit zu kurzem Grund wird abgewiesen, Auftrag bleibt offen',(await ord(h,'T-101')).status==='Offen');
 R('3 Reset der Testdaten bei manuellen Aufträgen gesperrt',await (async()=>{h.dlg.length=0;await click(h.p,'pickReset');return h.dlg.some(d=>/Zurücksetzen gesperrt/.test(d))&&!!(await ord(h,'T-101'))})());
 R('3 Demoaufträge K-1042…1044 weiterhin vorhanden und unverändert zuteilbar',(await Promise.all(['K-1042','K-1043','K-1044'].map(id=>ord(h,id)))).every(Boolean));
 R('3 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// ===== 4 Sofortbuchung, Quellen, Teilentnahme, Fehler =====
{const h=await open();await seed(h);await createOrder(h,'B-1',[['A-1',25],['A-2',30],['A-3',10]]);await assignStart(h,'B-1');const s0=await stock(h);
 let m=await scan(h,0,'H4A-9-9',null);R('4 Falscher Lagerplatz: kein Buchen möglich, keine Mengeneingabe',/Falscher Lagerplatz/.test(m)&&!(await h.p.evaluate(()=>!!document.querySelector('[data-pick-book]'))));
 m=await scan(h,0,'H4A-1-1','BC-3');R('4 Falscher Artikelbarcode abgewiesen',/Falscher Artikel/.test(m)&&JSON.stringify(await stock(h))===JSON.stringify(s0)&&!(await h.p.evaluate(()=>!!document.querySelector('[data-pick-book]'))),m);
 m=await scan(h,0,'H4A-1-1','BC-1');R('4 Richtiger Barcode: Entnahmemenge wird zur Kontrolle angezeigt (Vorgabe = Rest 25), Quelle wählbar',(await h.p.evaluate(()=>document.getElementById('pick-take-0').value))==='25'&&(await h.p.evaluate(()=>document.getElementById('pick-source-0').options.length))===2,m);
 const dsp=await h.p.evaluate(()=>{const e=document.getElementById('pick-take-0');return{fs:parseFloat(getComputedStyle(e).fontSize),h:e.getBoundingClientRect().height}});R('4 Entnahmemenge ist deutlich hervorgehoben (Schrift ≥ 20 px, Höhe ≥ 44 px)',dsp.fs>=20&&dsp.h>=44,JSON.stringify(dsp));
 // ungültige Mengen
 for(const q of ['0','-1','1.5','abc','','26','1e2']){const before=JSON.stringify(await stock(h));h.dlg.length=0;await book(h,0,q);R('4 Ungültige/zu große Menge „'+q+'“: nichts gebucht, Meldung',JSON.stringify(await stock(h))===before&&(await journal(h)).length===0&&h.dlg.length>0,h.dlg[0]||'')}
 // Teilentnahme 10 (Doppelklick = genau einmal)
 m=await book(h,0,10,null,{dbl:true});let s1=await stock(h);let J=await journal(h);
 R('4 Teilentnahme 10 mit dreifachem Klick: Bestand H4A-1-1 40 → 30, genau EIN Journaleintrag, Zeile zeigt „Gebucht 10 / Rest 15“',s1['H4A-1-1:A-1']===30&&J.length===1&&/Gebucht\s*10/.test(await lineText(h,0))&&/Rest\s*15/.test(await lineText(h,0)),JSON.stringify(s1)+' J='+J.length);
 R('4 Buchungseintrag nachvollziehbar: Kennung, Auftrag, Position, Artikel, Menge, Platz, Box, Mitarbeiter, Gerät, Zeit',J[0]&&J[0].id.startsWith('PB-')&&J[0].order==='B-1'&&J[0].line===0&&J[0].sku==='A-1'&&J[0].pieces===-10&&J[0].place==='H4A-1-1'&&J[0].boxId==='b1'&&J[0].by==='Max'&&J[0].device==='Scanner 1'&&!isNaN(Date.parse(J[0].at)));
 R('4 Historie erhält Eintrag „Kommissionierung · B-1 …“',/Kommissionierung · B-1 · Pos\. 1 · A-1 · −10/.test((await st(h.p)).history[0].text),(await st(h.p)).history[0].text);
 o=await ord(h,'B-1');R('4 Auftragsfortschritt: Ist = 10, Position noch offen, Scan muss erneut erfolgen',o.items[0].actual===10&&!o.checkedLines.includes(0)&&!o.scannedLines.includes(0)&&!o.confirm);
 R('4 Nach der Buchung ist der Buchen-Button weg (kein erneutes Bestätigen ohne Scan)',!(await h.p.evaluate(()=>!!document.querySelector('[data-pick-book]'))));
 // Rest aus ANDERER Box (explizite Wahl) – 15 aus Box b2
 await scan(h,0,'H4A-1-1','BC-1');h.dlg.length=0;h.answers=[false];await book(h,0,15,'b2');R('4 Entnahme aus anderer Box: Rückfrage; Abbruch bucht nichts',JSON.stringify(await stock(h))===JSON.stringify(s1)&&h.dlg.some(d=>/ANDEREM Lagerplatz/.test(d)));
 h.answers=[true];await book(h,0,15,'b2');s1=await stock(h);R('4 Nach Bestätigung: genau die gewählte Box b2 (H4A-2-2) reduziert 15 → 0 und die leere Box verschwindet; H4A-1-1 unverändert 30',s1['H4A-1-1:A-1']===30&&!('H4A-2-2:A-1' in s1)&&(await journal(h)).length===2&&(await journal(h))[1].boxId==='b2',JSON.stringify(s1));
 o=await ord(h,'B-1');R('4 Position 1 vollständig (25/25): bestätigt, erledigt',o.checkedLines.includes(0)&&o.items[0].actual===25);
 // Packartikel Position 2: 30 Stück = 3 Packs; 12 Packs in Box
 await scan(h,1,'H4A-3-3','BC-2');await book(h,1,25);R('4 Packartikel: 25 Stück nicht durch Pack 10 teilbar → abgewiesen, nichts gebucht',(await stock(h))['H4A-3-3:A-2']===12);
 await book(h,1,30);R('4 Packartikel: 30 Stück = 3 Packs gebucht (12 → 9), Journal in Stück und Packs',(await stock(h))['H4A-3-3:A-2']===9&&(await journal(h)).slice(-1)[0].pieces===-30&&(await journal(h)).slice(-1)[0].delta===-3);
 // nicht ausreichender Bestand: Box mit 100, Soll 10 → reduziere Bestand vorher auf 4
 await h.p.evaluate(()=>transaction(s=>{s.boxes.find(b=>b.id==='b4').qty=4}));await h.p.reload();await h.p.waitForTimeout(400);await scan(h,2,'H4B-4-4','BC-3');h.dlg.length=0;await book(h,2,10);
 R('4 Nicht ausreichender Bestand: Buchung abgewiesen, Bestand nicht negativ, Hinweis „Bestand reicht nicht“',(await stock(h))['H4B-4-4:A-3']===4&&h.dlg.some(d=>/Bestand reicht nicht/.test(d)),h.dlg.join('|').slice(0,120));
 await book(h,2,4);R('4 Teilentnahme des vorhandenen Restbestands (4 von 10): Box wird leer und entfernt, Bestand nie negativ',!(('H4B-4-4:A-3') in await stock(h))&&(await valid(h)));
 const wt=await lineText(h,2);R('4 Position mit Fehlmenge: Anzeige „Gebucht 4 / Rest 6“ und Button „mit Fehlmenge abschließen“',/Gebucht\s*4/.test(wt)&&/Rest\s*6/.test(wt)&&/mit Fehlmenge abschließen/.test(wt),wt.slice(0,200));
 h.answers=[true];await h.p.evaluate(()=>document.querySelector('[data-pick-short="2"]').click());await h.p.waitForTimeout(250);o=await ord(h,'B-1');R('4 Fehlmenge abschließen: Position erledigt (Ist 4 von 10), kein weiterer Bestandsabzug',o.checkedLines.includes(2)&&o.items[2].actual===4&&(await journal(h)).length===4);
 // Gewicht + Abschluss
  await h.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='B-1');o.packaging.palletWeight=25;o.packaging.boxWeight=1.5;o.packaging.tolerancePercent=1;o.packaging.scaleMode='gross';pickSave()});
 const wc=await h.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='B-1');const w=pickWeightCheck(o);return{exp:w.expected,items:o.items.map(i=>[i.qty,i.actual,i.unitWeight])}});
 R('4 Erwartetes Gesamtgewicht = Warengewicht (Ist × kg/Stk.) + Palette + Box',Math.abs(wc.exp-(25*2+30*0.5+4*0.5+26.5))<1e-9,JSON.stringify(wc));
 // Abschluss-Sperre ohne Abweichungsfreigabe, dann nach Freigabe
 await h.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='B-1');o.packaging.measuredWeight=pickWeightCheck(o).expected;pickSave()});h.dlg.length=0;await h.p.evaluate(()=>document.querySelector('[data-worker-action="finish"]').click());await h.p.waitForTimeout(250);
 R('4 Abschluss mit nicht freigegebener Fehlmenge gesperrt',(await ord(h,'B-1')).status==='In Bearbeitung'&&h.dlg.some(d=>/abweichung/i.test(d)),h.dlg.join('|').slice(0,120));
 await h.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='B-1');o.deviation={reason:'Restbestand fehlte',approver:'Leitung',approvedAt:new Date().toISOString(),signature:JSON.stringify(pickDiscrepancies(o))};pickSave()});const sBefore=await raw(h.p,K);h.dlg.length=0;await h.p.evaluate(()=>document.querySelector('[data-worker-action="finish"]').click());await h.p.waitForTimeout(350);
 o=await ord(h,'B-1');R('4 Abschluss nach Freigabe: Status Abgeschlossen; Bestand und Journal unverändert (keine erneute Ausbuchung)',o.status==='Abgeschlossen'&&(await raw(h.p,K))===sBefore,o.status);
 const slip=await h.p.evaluate(()=>pickSlipHtml(pickState.orders.find(o=>o.id==='B-1')));R('4 Kommissionierschein zeigt gebuchte Entnahmen (Journal), Ist-Mengen und Gewichte',/Gebuchte Entnahmen/.test(slip)&&/H4A-1-1/.test(slip)&&/ABGESCHLOSSEN/.test(slip)&&/Gewichtskontrolle/.test(slip));
 R('4 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Korrektur (Beispiel aus dem Auftrag: 12 bestätigt, 10 entnommen → +2)
{const h=await open();await seed(h);await createOrder(h,'C-1',[['A-1',12]]);await assignStart(h,'C-1');await scan(h,0,'H4A-1-1','BC-1');await book(h,0,12);const sA=await stock(h);const eid=(await journal(h))[0].id;
 R('4 Entnahme 12 gebucht (40 → 28)',sA['H4A-1-1:A-1']===28);
 R('4 Eine bestätigte Entnahme ist nicht durch Überschreiben änderbar: keine Mengeneingabe, keine Rückgängig-Schaltfläche, nur „Korrektur“',!(await h.p.evaluate(()=>!!document.querySelector('[data-pick-actual],[data-worker-line]')))&&(await h.p.evaluate(()=>!!document.querySelector('[data-pick-correct]'))));
 const corr=async(q,reason,by,conf=true)=>{h.prompts=[q,reason,by];h.answers=[conf];await h.p.evaluate(()=>document.querySelector('[data-pick-correct]').click());await h.p.waitForTimeout(400)};
 await corr('2','Versehentlich 12 statt 10 bestätigt','Max',false);R('4 Korrektur ohne Bestätigung: nichts gebucht',(await stock(h))['H4A-1-1:A-1']===28&&(await journal(h)).length===1);
 await corr('2','Versehentlich 12 statt 10 bestätigt','Max');const sC=await stock(h);const JJ=await journal(h);
 R('4 Korrektur +2: Bestand 28 → 30 in derselben Box, Original bleibt im Journal, Korrektur referenziert Original, Grund/Person/Zeit dokumentiert',sC['H4A-1-1:A-1']===30&&JJ.length===2&&JJ[0].id===eid&&JJ[1].type==='korrektur'&&JJ[1].ref===eid&&JJ[1].pieces===2&&JJ[1].boxId==='b1'&&/Versehentlich/.test(JJ[1].reason)&&JJ[1].by==='Max'&&!isNaN(Date.parse(JJ[1].at)),JSON.stringify(JJ[1]));
 const o1=await ord(h,'C-1');R('4 Auftrag aktualisiert: Ist 10 von Soll 12, Position wieder offen',o1.items[0].actual===10&&!o1.checkedLines.includes(0));
 for(const [q,why] of [['11','über dem Rest'],['0','null'],['x','Text'],['-2','negativ']]){const b=JSON.stringify(await stock(h));await corr(q,'Grund fuer Test','Max');R('4 Korrekturmenge „'+q+'“ ('+why+') abgewiesen',JSON.stringify(await stock(h))===b&&(await journal(h)).length===2)}
 await corr('1','kurz','Max');R('4 Korrektur mit zu kurzem Grund abgewiesen',(await journal(h)).length===2);
 await corr('10','Rest der Entnahme zurueck','Max');const J3=await journal(h);R('4 Weitere Korrektur bis zur vollständigen Rückbuchung (10): erlaubt, Bestand 40',(await stock(h))['H4A-1-1:A-1']===40&&J3.length===3);
 h.dlg.length=0;await h.p.evaluate(()=>{const b=document.querySelector('[data-pick-correct]');if(b)b.click()});await h.p.waitForTimeout(300);R('4 Doppelte Korrektur nach vollständiger Rückbuchung verhindert (Hinweis, nichts gebucht)',(await journal(h)).length===3&&(await stock(h))['H4A-1-1:A-1']===40,h.dlg.join('|').slice(0,100));
 // Box war leer und entfernt → Korrektur legt dieselbe Box wieder an
 R('4 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
{const h=await open();await seed(h);await createOrder(h,'C-2',[['A-3',100]]);await assignStart(h,'C-2');await scan(h,0,'H4B-4-4','BC-3');await book(h,0,100);R('4 Leere Box (100 → 0) wird entfernt',!('H4B-4-4:A-3' in await stock(h)));
 h.prompts=['30','Zu viel entnommen, Rest zurueck','Max'];h.answers=[true];await h.p.evaluate(()=>document.querySelector('[data-pick-correct]').click());await h.p.waitForTimeout(400);const bx=(await st(h.p)).boxes.find(b=>b.place==='H4B-4-4');
 R('4 Korrektur in entfernte Box: dieselbe Box-ID und derselbe Lagerplatz werden wiederhergestellt (30 Stk.)',bx&&bx.id==='b4'&&bx.qty===30&&bx.code==='A-3',JSON.stringify(bx));
 // Platz gesperrt → Korrektur abgewiesen, nichts verändert
 await h.p.evaluate(()=>transaction(s=>{s.places['H4B-4-4']={status:'locked',reason:'Test'};}));const b0=await raw(h.p,K);h.prompts=['10','Noch eine Korrektur','Max'];h.dlg.length=0;await h.p.evaluate(()=>document.querySelector('[data-pick-correct]').click());await h.p.waitForTimeout(400);
 R('4 Korrektur auf gesperrtem Lagerplatz abgewiesen, nichts verändert',(await raw(h.p,K))===b0&&h.dlg.some(d=>/gesperrt/.test(d)),h.dlg.join('|').slice(0,120));await h.b.close()}
// Mehrdeutiger Barcode
{const h=await open();await seed(h);await h.p.evaluate(()=>transaction(s=>{s.items.find(a=>a.code==='A-3').barcode='BC-1'}));await createOrder(h,'M-1',[['A-1',5]]);await assignStart(h,'M-1');const b0=await raw(h.p,K);
 const m=await scan(h,0,'H4A-1-1','BC-1');R('4 Mehrdeutiger Barcode (A-1 und A-3): keine Auswahl, kein Buchen, Meldung nennt beide Artikel',/A-1/.test(m)&&/A-3/.test(m)&&(await raw(h.p,K))===b0&&!(await h.p.evaluate(()=>!!document.querySelector('[data-pick-book]'))),m);
 const m2=await scan(h,0,'H4A-1-1','A-1');R('4 Eindeutige Artikelnummer funktioniert weiterhin',!(/Falscher|Mehrdeutig/.test(m2))&&(await h.p.evaluate(()=>!!document.querySelector('[data-pick-book]'))),m2);await h.b.close()}
// ===== 5 Atomarität, Zwei-Tab, Speicherfehler, Neuladen =====
{const h=await open();await seed(h);await createOrder(h,'S-1',[['A-1',20]]);await assignStart(h,'S-1');await scan(h,0,'H4A-1-1','BC-1');
 // Neuladen nach Scan: Token bleibt, Buchung danach genau einmal
 await h.p.reload();await h.p.waitForTimeout(400);R('5 Neuladen nach Scan: Auftrag, Scan-Status und Buchungskennung bleiben erhalten',await h.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='S-1');return o.status==='In Bearbeitung'&&o.scannedLines.includes(0)&&!!o.confirm&&!!document.querySelector('[data-pick-book="0"]')}));
 await book(h,0,8);await h.p.reload();await h.p.waitForTimeout(400);R('5 Neuladen nach Buchung: genau 1 Buchung, Bestand 32, Fortschritt 8/20',(await journal(h)).length===1&&(await stock(h))['H4A-1-1:A-1']===32&&(await ord(h,'S-1')).items[0].actual===8);
 // Wiederholte Verarbeitung derselben Bestätigung (gleiche Kennung) – nach Neuladen / manuell
 const dupe=await h.p.evaluate(async()=>{const J=state.pickJournal;const o=pickState.orders.find(x=>x.id==='S-1');o.confirm={line:0,id:J[0].id,at:new Date().toISOString()};o.scannedLines.push(0);pickSave();return null});await h.p.waitForTimeout(100);await h.p.evaluate(()=>{pickRender()});
 await h.p.evaluate(()=>{const b=document.querySelector('[data-pick-book="0"]');if(b)b.click()});await h.p.waitForTimeout(300);R('5 Erneut verarbeitete Bestätigung mit bereits gebuchter Kennung reduziert den Bestand NICHT noch einmal',(await journal(h)).length===1&&(await stock(h))['H4A-1-1:A-1']===32,'J='+(await journal(h)).length);
 // Absturz zwischen Bestandsschreiben und Auftragsfortschritt: Journal vorhanden, Auftrag noch alt
 await h.p.evaluate(([k])=>{const p=JSON.parse(localStorage.getItem(k));const o=p.orders.find(x=>x.id==='S-1');o.items[0].actual=0;o.checkedLines=[];o.scannedLines=[];delete o.confirm;localStorage.setItem(k,JSON.stringify(p))},[PK]);await h.p.reload();await h.p.waitForTimeout(500);
 R('5 Simulierter Absturz (Bestand+Journal gespeichert, Auftragsfortschritt veraltet): beim Laden wird der Fortschritt aus dem Journal nachgezogen (Ist 8 im Speicher), Bestand unverändert 32',(await h.p.evaluate(()=>pickState.orders.find(x=>x.id==='S-1').items[0].actual))===8&&(await stock(h))['H4A-1-1:A-1']===32);
 R('5 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Speicherfehler
for(const failKey of [K,PK]){const h=await open();await seed(h);await createOrder(h,'Q-1',[['A-1',20]]);await assignStart(h,'Q-1');await scan(h,0,'H4A-1-1','BC-1');await setv(h.p,'pick-take-0','7');
 const bk=await raw(h.p,K),bp=await raw(h.p,PK);await h.p.evaluate(fk=>{const o=Storage.prototype.setItem;window.__fail=fk;Storage.prototype.setItem=function(k,v){if(k===window.__fail)throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}},failKey);h.dlg.length=0;
 await h.p.evaluate(()=>document.querySelector('[data-pick-book="0"]').click());await h.p.waitForTimeout(400);const ak=await raw(h.p,K),ap=await raw(h.p,PK);const mem=await h.p.evaluate(()=>({q:state.boxes.find(b=>b.id==='b1').qty,j:(state.pickJournal||[]).length,a:pickState.orders.find(o=>o.id==='Q-1').items[0].actual}));
 R('5 Speicher voll beim Schreiben von „'+(failKey===K?'Bestand':'Auftragsdaten')+'“: Buchung nicht erfolgreich, Bestand und Auftrag gespeichert UND im Speicher unverändert (Bestand 40, Journal 0, Ist 0)',ak===bk&&(failKey===PK?ap===bp:true)&&mem.q===40&&mem.j===0&&mem.a===0&&h.dlg.length>0,JSON.stringify(mem)+' | '+(h.dlg[0]||'').slice(0,140));
 await h.p.evaluate(()=>{delete window.__fail});await h.p.reload();await h.p.waitForTimeout(400);R('5 Nach dem Fehler: Daten gültig, später wiederholbare Buchung ohne Doppelabzug',(await valid(h))&&(await stock(h))['H4A-1-1:A-1']===40&&(await journal(h)).length===0);
 await h.b.close()}
// Zwei Tabs, gleicher Auftrag
{const bw=await chromium.launch();const ctx=await bw.newContext({viewport:{width:1100,height:900},acceptDownloads:true});const a=await open({ctx});await seed(a);await createOrder(a,'Z-1',[['A-1',30]]);await assignStart(a,'Z-1');await scan(a,0,'H4A-1-1','BC-1');
 const b=await open({ctx});await go(b.p,'picking');await b.p.waitForTimeout(300);
 const scB=await b.p.evaluate(()=>!!document.querySelector('[data-pick-book="0"]'));
 await book(a,0,10);const sA=await raw(a.p,K);
 // Tab B (veraltet) versucht dieselbe Bestätigung
 b.dlg.length=0;await b.p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='Z-1');const e=document.getElementById('pick-take-0');if(e)e.value='10';const bt=document.querySelector('[data-pick-book="0"]');if(bt)bt.click();else pickBookLine(o,0)});await b.p.waitForTimeout(400);
 R('5 Zwei Tabs: Tab A bucht 10; Tab B (veraltet) kann dieselbe Bestätigung nicht ein zweites Mal buchen (Bestand 30, ein Journaleintrag)',(await raw(a.p,K))===sA&&(await stock(a)) ['H4A-1-1:A-1']===30&&(await journal(a)).length===1,'B-Dialoge: '+b.dlg.join('|').slice(0,200)+' scanB='+scB);
 await b.p.reload();await b.p.waitForTimeout(400);const lt=await b.p.evaluate(()=>{const l=document.getElementById('pick-line-0');return l?l.innerText.replace(/\s+/g,' '):''});R('5 Tab B zeigt nach Neuladen den gebuchten Stand (Gebucht 10, Rest 20) – kein doppelter Abzug möglich',/Gebucht\s*10/.test(lt)&&/Rest\s*20/.test(lt),lt.slice(0,120));
 R('5 Keine JavaScript-Fehler',a.errs.length===0&&b.errs.length===0,[...a.errs,...b.errs].join('|'));await bw.close()}
// ===== 6 Import/Export mit Auftragsdaten, Integrität, Lagerstruktur =====
{const h=await open();await seed(h);await createOrder(h,'E-1',[['A-1',10],['A-3',20]]);await assignStart(h,'E-1');await scan(h,0,'H4A-1-1','BC-1');await book(h,0,6);
 const s0=await st(h.p),p0=await st(h.p,PK);await go(h.p,'more');const n=h.downloads.length;await click(h.p,'jsonExport');for(let i=0;i<40&&h.downloads.length===n;i++)await h.p.waitForTimeout(100);const ex=JSON.parse(h.downloads[h.downloads.length-1].text);
 R('6 Export enthält Buchungsjournal und Kommissionierdaten (Aufträge, Fortschritt)',Array.isArray(ex.pickJournal)&&ex.pickJournal.length===1&&ex._pick.orders.some(o=>o.id==='E-1'&&o.items[0].actual===6));
 const h2=await open();await seed(h2);await go(h2.p,'more');h2.answers=[true];await h2.p.setInputFiles('#jsonImport',h.downloads[h.downloads.length-1].file);await h2.p.waitForTimeout(700);const s1=await st(h2.p),p1=await st(h2.p,PK);
 R('6 Wiederimport: Bestand, Journal, Aufträge und Fortschritt byte-gleich; Buchung wird nicht erneut ausgeführt',JSON.stringify(s1.boxes)===JSON.stringify(s0.boxes)&&JSON.stringify(s1.pickJournal)===JSON.stringify(s0.pickJournal)&&JSON.stringify(p1.orders)===JSON.stringify(p0.orders)&&(await valid(h2)));
 const bad=structuredClone(ex);bad.pickJournal.push({...bad.pickJournal[0]});const h3=await open();await seed(h3);const b0=await raw(h3.p,K);await go(h3.p,'more');h3.answers=[true,true];await h3.p.setInputFiles('#jsonImport',wr('dupj.json',bad));await h3.p.waitForTimeout(500);R('6 Import mit doppelter Buchungskennung im Journal wird abgelehnt, nichts verändert',(await raw(h3.p,K))===b0);
 const bad2=structuredClone(ex);bad2.pickJournal[0].pieces=5;const h4=await open();await seed(h4);const c0=await raw(h4.p,K);await go(h4.p,'more');h4.answers=[true,true];await h4.p.setInputFiles('#jsonImport',wr('posj.json',bad2));await h4.p.waitForTimeout(500);R('6 Import mit Journal „Entnahme mit positiver Menge“ abgelehnt',(await raw(h4.p,K))===c0);
 const old=structuredClone(ex);delete old.pickJournal;const h5=await open();await seed(h5);await go(h5.p,'more');h5.answers=[true];await h5.p.setInputFiles('#jsonImport',wr('nojournal.json',old));await h5.p.waitForTimeout(600);R('6 Export aus AP5-Zeit (ohne Journal) bleibt importierbar',(await valid(h5)));
 // Lagerstruktur / QR
 const places=Object.keys(s1.places);R('6 Lagerstruktur nach Buchungen und Import unverändert: 6.480 Plätze, 4A 3.564, 4B 2.916, je Regal 162',places.length===6480&&places.filter(p=>p.startsWith('H4A-')).length===3564&&places.filter(p=>p.startsWith('H4B-')).length===2916);
 R('6 QR-Zuordnung unverändert (QR-1 → H4A-1-1)',s1.qrMap['QR-1']==='H4A-1-1'&&s0.qrMap['QR-1']==='H4A-1-1');
 // Blindinventur nach Kommissionierung
 await go(h.p,'inventory');await setv(h.p,'invPlace','H4A-1-1');await setv(h.p,'invArticle','A-1');await setv(h.p,'invQty','34');await click(h.p,'invCompare');const ir=await txt(h.p,'invResult');R('6 Blindinventur nach Kommissionierung: Soll (34) stimmt mit gebuchtem Bestand überein, Zählung abweichungsfrei',/34/.test(ir)&&!/Abweichung: [^0]/.test(ir),ir.slice(0,140));
 R('6 Keine JavaScript-Fehler',h.errs.length===0&&h2.errs.length===0,[...h.errs,...h2.errs].join('|'));await h.b.close();await h2.b.close();await h3.b.close();await h4.b.close();await h5.b.close()}
// ===== 7 Mobil 320 px =====
{const h=await open({width:320,height:640});await seed(h);await createOrder(h,'W-1',[['A-1',12],['A-2',30]]);
 const meas=async()=>h.p.evaluate(()=>{const vw=document.documentElement.clientWidth;const out=[];document.querySelectorAll('main button,main input:not([type=hidden]),main select,#pickAdmin button,#pickAdmin input,#pickAdmin select,#picking button,#picking input,#picking select').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0&&r.height>0&&e.offsetParent&&!e.closest('nav,[role=tablist],.tabs')&&r.right>vw+1)out.push((e.id||e.dataset.pickBook||e.textContent).slice(0,24)+' '+Math.round(r.right))});return{hs:document.documentElement.scrollWidth>vw+1,out}});
 await go(h.p,'pickAdmin');let m=await meas();R('7 [320 px, Emulation] Auftragsverwaltung (Editor, Liste): kein horizontales Scrollen, nichts rechts abgeschnitten',!m.hs&&!m.out.length,JSON.stringify(m));
 await assignStart(h,'W-1');await scan(h,0,'H4A-1-1','BC-1');m=await meas();const tk=await h.p.evaluate(()=>{const e=document.getElementById('pick-take-0'),b=document.querySelector('[data-pick-book="0"]');return{im:e.getAttribute('inputmode'),bh:Math.round(b.getBoundingClientRect().height),bw:Math.round(b.getBoundingClientRect().width)}});
 R('7 [320 px, Emulation] Kommissionierung mit Entnahmefeld: kein horizontales Scrollen; Zahlentastatur (inputmode numeric); Buchen-Button ≥ 44 px hoch',!m.hs&&!m.out.length&&tk.im==='numeric'&&tk.bh>=44,JSON.stringify({m,tk}));
 await h.p.emulateMedia({media:'print'});const pdf=require('path').join(L.TMP,'ap6.pdf');await h.p.evaluate(()=>{pickPrintReceipt(pickState.orders.find(o=>o.id==='W-1'))});await h.p.pdf({path:pdf,format:'A4',printBackground:true});const pages=+(/Pages:\s+(\d+)/.exec(require('child_process').execSync('pdfinfo '+pdf).toString())||[0,0])[1];R('7 Kommissionierschein (A4-PDF-Rendering, Emulation): eine Seite für kleinen Auftrag',pages===1,'Seiten='+pages);
 N('7 Echte Geräte (iPhone Safari, Android, AirPrint, Kamera, Handscanner)','Nur Chromium-Emulation; reale Gerätetests stehen aus.');await h.b.close()}
done()})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(2)});
