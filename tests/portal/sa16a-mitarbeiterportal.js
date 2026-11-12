/* SA-16a: Tests für das Mitarbeiterportal (Portal-Modus). 
   Aufruf: node tests/portal/sa16a-mitarbeiterportal.js http://localhost:8131/
   Eigenständig, frisches Browserprofil je Test, verändert weder App noch Repository. Exit-Code 0 = alles bestanden.
   Emulatoren (iPhone 14, Pixel 7, iPad Pro 11) ersetzen keinen Test auf echten Geräten. */
const {chromium,devices}=require('playwright');const fs=require('fs');const os=require('os');const path=require('path');
const BASE=(process.argv[2]||'http://localhost:8131/').replace(/index\.html.*$/,''),PORTAL=BASE+'index.html?portal=mitarbeiter',ADMIN=BASE+'index.html',PK='lagerpilot_pick_demo_v1',SK='lagerpilot_v2_7',SIM='lagerpilot27_article_simulation_v1',TMP=fs.mkdtempSync(path.join(os.tmpdir(),'sa16a-'));
const res=[];const R=(id,ok,info)=>{res.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,240):''))};
const mkItems=n=>Array.from({length:n},(_,i)=>({sku:'ART-'+String(i+1).padStart(4,'0'),name:'Artikel '+(i+1),place:'H4B-'+(1+i%18)+'-'+(1+(i*7)%162),qty:2+(i%5),actual:2+(i%5),unitWeight:0.5+(i%4)*0.25}));
function mkOrder(id,n,o={}){const items=mkItems(n),pw=25,bw=1.5,exp=items.reduce((s,x)=>s+x.actual*x.unitWeight,0)+pw+bw;return {id,lines:n,assignee:o.assignee??'Max',status:o.status||'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items,checkedLines:items.map((_,i)=>i),scannedLines:items.map((_,i)=>i),packaging:{type:'euro',scaleMode:'gross',palletWeight:pw,boxWeight:bw,measuredWeight:Math.round(exp*1000)/1000,tolerancePercent:1},...(o.extra||{})}}
const pickState=(orders,session='')=>({people:[],roster:['Max','Peter','Leon'],orders,session,testStatus:{}});
const baseOrders=()=>[{id:'K-1042',lines:3,assignee:'',status:'Offen'},{id:'K-1043',lines:8,assignee:'Peter',status:'Zugewiesen'},mkOrder('K-9001',3,{assignee:'Max'}),mkOrder('K-9000',2,{assignee:'Leon',status:'Abgeschlossen',extra:{finishedAt:'2026-11-01T09:00:00.000Z',completion:{at:'2026-11-01T09:00:00.000Z',assignee:'Leon',device:'Scanner 3'}}})];
async function open(b,url,{seed=true,dev,sim=false,stock=true}={}){const ctx=await b.newContext(dev?{...devices[dev]}:{viewport:{width:1100,height:900}});const p=await ctx.newPage();p.setDefaultTimeout(30000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{window.__prints=0;window.print=()=>{window.__prints++;window.__lastPrint=document.getElementById('pickPrint').innerHTML}});
 await p.goto(ADMIN);await p.waitForTimeout(300);
 if(seed){await p.evaluate(([k,v,stock,sim,sk])=>{localStorage.setItem(k,JSON.stringify(v));if(stock){const s=structuredClone(state);s.items.push({code:'A100',name:'Testschraube M8',unit:'STK',pack:1,weight:0.5,barcode:'4000000000017',max:100},{code:'A200',name:'Testmutter M8',unit:'STK',pack:1,weight:0.1,barcode:'4000000000024',max:100});s.boxes.push({id:'bx1',place:'H4B-1-5',code:'A100',qty:12,blocked:0},{id:'bx2',place:'H4A-2-7',code:'A200',qty:30,blocked:0});persist(s)}if(sim)localStorage.setItem(sk,JSON.stringify({occupied:60,reserved:5}))},[PK,pickState(baseOrders()),stock,sim,SIM]);}
 if(url!==ADMIN||seed){await p.goto(url);await p.waitForTimeout(400);}
 return {ctx,p,errs}}
const ls=(p)=>p.evaluate(()=>{const o={};for(const k of Object.keys(localStorage))o[k]=localStorage.getItem(k);return o});
const active=p=>p.evaluate(()=>(document.querySelector('section.active')||{}).id);
const loginAs=async(p,name,device)=>{await p.locator('[data-portal-name="'+name+'"]').click();if(device)await p.selectOption('#portalDevice',device);await p.locator('#portalLoginBtn').click();await p.waitForTimeout(250)};
const vis=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0&&!e.closest('[inert]')},sel);
(async()=>{const b=await chromium.launch();

// 1 Direkter Einstieg über eigenen Link
{const h=await open(b,PORTAL);const p=h.p;
 R('1 Portal öffnet direkt über index.html?portal=mitarbeiter mit Anmeldeansicht',await active(p)==='portalLogin'&&await p.evaluate(()=>document.documentElement.classList.contains('portal')));
 R('1 Verwaltungsnavigation nicht sichtbar',!(await vis(p,'#nav'))&&!(await vis(p,'#subnav')));
 R('1 Hinweis "Demo-Identifikation, keine echte Anmeldung" sichtbar',(await p.locator('#portalLogin .portal-demo-note').innerText()).includes('keine echte Anmeldung'));
 R('1 Keine PIN-/Passwortfelder in der Anmeldung',await p.locator('#portalLogin input[type=password],#portalLogin input[type=tel],#portalLogin input[type=number]').count()===0);
 const p2=await h.ctx.newPage();await p2.goto(BASE+'mitarbeiter.html');await p2.waitForTimeout(800);
 R('1 mitarbeiter.html leitet zum Portal weiter',/index\.html\?portal=mitarbeiter$/.test(p2.url())&&await active(p2)==='portalLogin',p2.url());
 R('1 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 2+3 Anmeldung Max/Peter/Leon, Gerät vorausgefüllt und wählbar, Wechsel
{const h=await open(b,PORTAL);const p=h.p;
 R('2 "Weiter" erst nach Namenswahl aktiv',await p.locator('#portalLoginBtn').isDisabled());
 for(const [n,d] of [['Max','Scanner 1'],['Peter','Scanner 2'],['Leon','Scanner 3']]){
  await p.locator('[data-portal-name="'+n+'"]').click();
  R('2 '+n+': Gerät vorausgefüllt ('+d+')',await p.inputValue('#portalDevice')===d);
  await p.locator('#portalLoginBtn').click();await p.waitForTimeout(250);
  const st=await p.evaluate(()=>({sec:document.querySelector('section.active').id,session:pickState.session,who:document.getElementById('portalWho').textContent,dev:document.getElementById('portalWhere').textContent}));
  R('2 '+n+': Anmeldung → Startseite, Sitzung, Anzeige',st.sec==='portalHome'&&st.session===n&&st.who===n&&st.dev===d,JSON.stringify(st));
  await p.locator('#portalSwitch').click();await p.waitForTimeout(250);
  R('3 '+n+': Wechseln führt zur Anmeldung, Sitzung beendet',await active(p)==='portalLogin'&&await p.evaluate(()=>pickState.session==='')&&await p.evaluate(n=>!pickState.people.find(x=>x.name===n).active,n));}
 await loginAs(p,'Max','Scanner 3');
 R('3 Gerät frei wählbar: Max mit Scanner 3',await p.evaluate(()=>pickState.people.find(x=>x.name==='Max').device==='Scanner 3'&&document.getElementById('portalWhere').textContent==='Scanner 3'));
 await p.locator('#portalSwitch').click();await loginAs(p,'Peter');
 R('3 Mitarbeiterwechsel Max → Peter',await p.evaluate(()=>pickState.session==='Peter'&&document.getElementById('portalWho').textContent==='Peter'));
 await p.reload();await p.waitForTimeout(400);
 R('3 Nach Neuladen im selben Tab bleibt die Demo-Identifikation erhalten',await active(p)==='portalHome'&&await p.evaluate(()=>document.getElementById('portalWho').textContent==='Peter'));
 const p3=await h.ctx.newPage();await p3.goto(PORTAL);await p3.waitForTimeout(400);
 R('3 Neuer Tab zeigt wieder die Anmeldung',await active(p3)==='portalLogin');
 R('2 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 4 Vier Kacheln
{const h=await open(b,PORTAL);const p=h.p;await loginAs(p,'Max');
 R('4 Startseite enthält genau vier Kacheln',await p.locator('#portalHome .portal-tile').count()===4);
 R('4 Kein Buchungsknopf auf der Startseite (nur "Weitere Funktionen" als Hinweis)',await p.evaluate(()=>[...document.querySelectorAll('#portalHome button')].every(x=>x.classList.contains('portal-tile')||x.id==='portalDemoStart')&&/folgen später/.test(document.querySelector('#portalHome .portal-more p').textContent)));
 for(const [go,probe,label] of [['picking','#pickWorker','Meine Aufträge'],['stock','#search','Artikelbestand'],['racks','#hallSelect','Regalansicht'],['scan','#scanInput','Scanner']]){
  await p.locator('[data-portal-go="'+go+'"]').click();await p.waitForTimeout(250);
  R('4 Kachel "'+label+'" öffnet den passenden Bereich',await active(p)===go&&await vis(p,probe));
  R('4 "'+label+'": Zurück-Knopf zur Startseite vorhanden und funktioniert',await (async()=>{const v=await vis(p,'#portalBack');await p.locator('#portalBack').click();await p.waitForTimeout(150);return v&&await active(p)==='portalHome'})());}
 await p.locator('[data-portal-go="picking"]').click();await p.waitForTimeout(250);
 R('4 Meine Aufträge zeigt den Auftrag von Max (K-9001), ohne zweite Anmeldemaske',(await p.locator('#pickWorker').innerText()).includes('K-9001')&&!(await vis(p,'#pickLoginCard')));
 await p.locator('[data-portal-go]').count();await p.locator('#portalBack').click();await p.locator('[data-portal-go="stock"]').click();await p.waitForTimeout(200);
 await p.fill('#search','Testschraube');await p.waitForTimeout(200);
 R('4 Artikelbestand: Suche findet Artikel und Bestand',(await p.locator('#stockList').innerText()).includes('Testschraube'));
 await p.evaluate(()=>document.getElementById('demoStockHint').classList.remove('hidden'));R('4 Bestandshinweis im Portal ohne Verweis auf den ausgeblendeten „Regale“-Umschalter',!(await p.locator('#demoStockHint').innerText()).includes('Regale')&&(await p.locator('#demoStockHint').innerText()).includes('TESTBESTÄNDE'));
 R('4 Artikelbestand: keine Stammdaten-Bearbeitung (kein Bearbeiten-Knopf sichtbar)',await p.locator('#stock [data-edit]').count()===0);
 await p.locator('#portalBack').click();await p.locator('[data-portal-go="scan"]').click();await p.fill('#scanInput','H4B-1-5');await p.locator('#scanLookup').click();await p.waitForTimeout(300);
 R('4 Scanner: Lagerplatz-Eingabe navigiert zur Regalansicht mit Platzdetails',await active(p)==='racks'&&(await p.locator('#placeDetail').innerText()).includes('H4B-1-5'));
 await p.locator('#portalBack').click();await p.locator('[data-portal-go="scan"]').click();await p.fill('#scanInput','4000000000017');await p.locator('#scanLookup').click();await p.waitForTimeout(300);
 R('4 Scanner: Artikelbarcode wird erkannt',(await p.locator('#scanResult').innerText()).includes('Testschraube'));
 R('4 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 5 Verwaltungsfunktionen nicht erreichbar
{const h=await open(b,PORTAL,{sim:true});const p=h.p;
 const allowed=['portalLogin','portalHome','picking','stock','racks','scan'];
 const r0=await p.evaluate(()=>{tab('book');return document.querySelector('section.active').id});
 R('5 Ohne Anmeldung führt jeder Bereichswechsel zur Anmeldung',r0==='portalLogin',r0);
 await loginAs(p,'Max');
 const bad=[];for(const t of ['home','merge','book','articles','inventory','more','pickAdmin','irgendwas']){const r=await p.evaluate(t=>{tab(t);return document.querySelector('section.active').id},t);if(r!=='portalHome')bad.push(t+'→'+r)}
 R('5 tab() verweigert alle Verwaltungsbereiche (Benutzer-/Auftragsverwaltung, Artikelstamm, Import/Export/Reset, Inventur, Buchen, Anbruchsboxen)',bad.length===0,bad.join(','));
 const bad2=await p.evaluate(()=>{const out=[];document.querySelectorAll('[data-tab],[data-area]').forEach(btn=>{btn.click();const id=document.querySelector('section.active').id;if(!['portalLogin','portalHome','picking','stock','racks','scan'].includes(id))out.push(id)});return out});
 R('5 Programmatischer Klick auf alle versteckten Navigationsknöpfe erreicht keinen Verwaltungsbereich',bad2.length===0,bad2.join(','));
 R('5 Verwaltungsbereiche sind gesperrt (inert) und nicht sichtbar',await p.evaluate(()=>['nav','subnav','home','merge','book','articles','inventory','more','pickAdmin'].every(id=>{const e=document.getElementById(id);return e.inert&&getComputedStyle(e).display==='none'||e.inert&&!e.classList.contains('active')})));
 R('5 Anmeldemaske der Verwaltung, QR-Zuordnung, Platz-Initialisierung und Simulation sind im Portal nicht bedienbar',await p.evaluate(()=>['pickLoginCard','scanMap','rackInit','simulationPanel'].every(id=>{const e=document.getElementById(id);return e&&e.inert&&getComputedStyle(e).display==='none'})));
 // Platzdetails: schreibende Bedienelemente nicht gerendert (Testlager mit QS-/Technik-Funktionen)
 await p.evaluate(()=>tab('racks'));await p.waitForTimeout(200);
 const places=await p.evaluate(()=>{const out=[];for(const h of ['H4B','H4A'])for(let r=1;r<=3;r++)for(let n=1;n<=162;n++){const pl=h+'-'+r+'-'+n;if(simType(pl)==='used'||simType(pl)==='reserved'||simType(pl)==='mixed'||simType(pl)==='occupied')out.push(pl);if(out.length>=6)return out}return out});
 let wrote=[];for(const pl of places.concat(['H4B-1-5','H4A-2-7','H4B-3-3'])){await p.evaluate(x=>{showPlace(x)},pl);await p.waitForTimeout(60);const n=await p.evaluate(()=>document.querySelectorAll('#placeDetail [data-qs-lock],#placeDetail [data-demo-qs],#placeDetail [data-qs-identity],#placeDetail [data-tech-action],#placeDetail #techActor,#placeDetail #qsActorInput').length);if(n)wrote.push(pl)}
 R('5 Platzdetails im Portal: keine QS-/Technik-Bedienelemente ('+(places.length+3)+' Plätze geprüft)',wrote.length===0,wrote.join(','));
 await h.ctx.close();
 // Kontrolle: gleiche Plätze in der Verwaltung HABEN diese Bedienelemente (Test ist aussagekräftig)
 const a=await open(b,ADMIN,{sim:true,seed:true});await a.p.evaluate(()=>tab('racks'));await a.p.waitForTimeout(200);
 const adminHas=await a.p.evaluate(()=>{for(const pl of ['H4B-1-5','H4A-2-7','H4B-3-3'].concat((()=>{const o=[];for(let n=1;n<=162;n++){const s=simType('H4B-1-'+n);if(s)o.push('H4B-1-'+n)}return o})())){showPlace(pl);if(document.querySelector('#placeDetail [data-qs-lock],#placeDetail [data-demo-qs],#placeDetail [data-tech-action],#placeDetail #techActor'))return pl}return null});
 R('5 Kontrolle: Verwaltungsansicht zeigt die QS-/Technik-Bedienelemente weiterhin',!!adminHas,adminHas||'');await a.ctx.close();}

// 6 Verwaltungsoberfläche unverändert
{const h=await open(b,ADMIN);const p=h.p;
 R('6 Verwaltung: kein Portal-Modus, Navigation sichtbar',!(await p.evaluate(()=>document.documentElement.classList.contains('portal')))&&await vis(p,'#nav')&&await vis(p,'#subnav'));
 await p.evaluate(()=>document.getElementById('demoStockHint').classList.remove('hidden'));R('6 Verwaltung: Bestandshinweis unverändert mit „Regale“-Verweis',(await p.locator('#demoStockHint').innerText()).includes('Über „Regale“ ein- und ausschalten.'));
 R('6 Verwaltung: Portal-Elemente nicht sichtbar',!(await vis(p,'#portalBar'))&&!(await vis(p,'#portalHome'))&&!(await vis(p,'#portalLogin')));
 const miss=[];for(const t of ['home','scan','stock','merge','book','racks','articles','more','pickAdmin','picking']){await p.evaluate(t=>tab(t),t);const id=await active(p);if(id!==t)miss.push(t+'→'+id)}
 R('6 Verwaltung: alle 10 Bereiche öffnen wie bisher',miss.length===0,miss.join(','));
 await p.evaluate(()=>tab('inventory'));R('6 Verwaltung: Inventurbereich öffnet',await active(p)==='inventory');
 await p.evaluate(()=>tab('picking'));await p.selectOption('#pickEmployee','Max');await p.fill('#pickDevice','Scanner 1');await p.locator('#pickLogin').click();await p.waitForTimeout(250);
 R('6 Verwaltung: Test-Anmeldung funktioniert wie bisher (Refactoring ohne Verhaltensänderung)',await p.evaluate(()=>pickState.session==='Max'&&pickState.people.find(x=>x.name==='Max').device==='Scanner 1'&&pickState.people.find(x=>x.name==='Max').active===true));
 await p.locator('#pickLogout').click();await p.waitForTimeout(250);
 R('6 Verwaltung: Abmelden funktioniert wie bisher',await p.evaluate(()=>pickState.session===''&&pickState.people.find(x=>x.name==='Max').active===false));
 await p.evaluate(()=>tab('pickAdmin'));R('6 Verwaltung: Auftragsverwaltung zeigt Aufträge',(await p.locator('#pickOrders').innerText()).includes('K-1043'));
 R('6 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 7 Daten unverändert (Lager, Artikel, Boxen, Plätze)
{const h=await open(b,PORTAL);const p=h.p;const before=await ls(p);
 R('7 Portal öffnen ohne Anmeldung schreibt nichts in den Speicher (alle Schlüssel byte-identisch)',JSON.stringify(before)===JSON.stringify(await ls(p)));
 await loginAs(p,'Max');
 for(const go of ['stock','racks','scan','picking']){await p.evaluate(g=>tab(g),go);await p.waitForTimeout(120);}
 await p.evaluate(()=>tab('stock'));await p.fill('#search','Test');await p.evaluate(()=>tab('racks'));await p.fill('#rackSearch','H4A-2-7');await p.locator('#rackFind').click();await p.evaluate(()=>{tab('scan')});await p.fill('#scanInput','4000000000024');await p.locator('#scanLookup').click();await p.waitForTimeout(200);
 await p.locator('#portalSwitch').click();await loginAs(p,'Leon');await p.locator('#portalSwitch').click();
 const after=await ls(p);
 R('7 Lagerdaten (lagerpilot_v2_7) nach Portalnutzung, Suche, Scan, Regalansicht, Anmeldewechsel byte-identisch',before[SK]===after[SK]);
 const bs=JSON.parse(before[SK]),as=JSON.parse(after[SK]);
 R('7 Artikel, Boxen, QR-Zuordnungen, Historie unverändert',JSON.stringify([bs.items,bs.boxes,bs.qrMap,bs.history])===JSON.stringify([as.items,as.boxes,as.qrMap,as.history]));
 const cnt=s=>({a:Object.keys(s.places).filter(k=>k.startsWith('H4A-')).length,b:Object.keys(s.places).filter(k=>k.startsWith('H4B-')).length,total:Object.keys(s.places).length,rA:new Set(Object.keys(s.places).filter(k=>k.startsWith('H4A-')).map(k=>k.split('-')[1])).size,rB:new Set(Object.keys(s.places).filter(k=>k.startsWith('H4B-')).map(k=>k.split('-')[1])).size});
 R('7 Lagerstruktur: 4A 22 Regale/3.564, 4B 18 Regale/2.916, gesamt 6.480 Plätze',JSON.stringify(cnt(as))===JSON.stringify({a:3564,b:2916,total:6480,rA:22,rB:18}),JSON.stringify(cnt(as)));
 R('7 Lagerplatzkennungen und Platzstatus unverändert',JSON.stringify(bs.places)===JSON.stringify(as.places));
 const po=JSON.parse(before[PK]).orders,pa=JSON.parse(after[PK]).orders;
 R('8 Bestehende Aufträge (inkl. abgeschlossener, Positionen, Gewichte) unverändert erhalten',JSON.stringify(po)===JSON.stringify(pa)&&pa.length===4);
 R('7 Nur Anmeldedaten (people/session) der Kommissionierung geändert, nichts sonst',(()=>{const b0=JSON.parse(before[PK]),a0=JSON.parse(after[PK]);const keys=Object.keys(a0).filter(k=>JSON.stringify(a0[k])!==JSON.stringify(b0[k]));return keys.every(k=>['people','session','testStatus'].includes(k))})());
 // Wechsel Portal -> Verwaltung -> Portal
 await p.goto(ADMIN);await p.waitForTimeout(300);await p.goto(PORTAL);await p.waitForTimeout(300);
 R('7 Reiner Wechsel Portal ↔ Verwaltung verändert Lagerdaten nicht',(await ls(p))[SK]===before[SK]);
 R('7 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 9 SA-15 Kommissionierschein im Portal
{const h=await open(b,PORTAL);const p=h.p;await loginAs(p,'Max');await p.locator('[data-portal-go="picking"]').click();await p.waitForTimeout(300);
 const before=(await ls(p))[SK];
 const fin=p.locator('[data-worker-action="finish"]');R('9 SA-15: Abschluss-Button aktiv (Gewichtskontrolle bestanden)',await fin.isEnabled());
 await fin.click();await p.waitForTimeout(500);
 const o=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).orders.find(x=>x.id==='K-9001'),PK);
 R('9 SA-15: Auftrag abgeschlossen, Gerät festgehalten',o.status==='Abgeschlossen'&&o.completion&&o.completion.device==='Scanner 1',JSON.stringify(o.completion));
 R('9 SA-15: Abschlussansicht und automatischer Druckaufruf',await p.locator('#pickClosure:not(.hidden)').count()===1&&await p.evaluate(()=>window.__prints)===1);
 const t=(await p.evaluate(()=>window.__lastPrint)).replace(/<[^>]+>/g,' ');
 R('9 SA-15: Schein enthält Auftrag, Mitarbeiter, Scanner, BESTANDEN',t.includes('K-9001')&&t.includes('Max')&&t.includes('Scanner 1')&&t.includes('BESTANDEN – innerhalb der Toleranz'));
 await p.locator('[data-closure-action="print"]').click();
 R('9 SA-15: Nachdruck möglich ohne Datenänderung',await p.evaluate(()=>window.__prints)===2&&(await ls(p))[SK]===before);
 R('9 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 10 Import/Export
{const h=await open(b,ADMIN,{seed:true});const p=h.p;await p.evaluate(()=>tab('more'));
 const dl=async(pg,name)=>{const w=pg.waitForEvent('download');await pg.evaluate(()=>document.getElementById('jsonExport').click());const d=await w;const f=path.join(TMP,name);await d.saveAs(f);return JSON.parse(fs.readFileSync(f,'utf8'))};
 const e1=await dl(p,'e1.json');
 await p.goto(PORTAL);await p.waitForTimeout(300);await loginAs(p,'Max');for(const g of ['stock','racks','scan','picking'])await p.evaluate(x=>tab(x),g);await p.locator('#portalSwitch').click();
 await p.goto(ADMIN);await p.waitForTimeout(300);await p.evaluate(()=>tab('more'));const e2=await dl(p,'e2.json');
 R('10 Export nach Portalnutzung: Lagerdaten identisch zum Export davor',JSON.stringify(e1.state||e1.lager||Object.fromEntries(Object.entries(e1).filter(([k])=>k!=='_pick'&&k!=='exportedAt'&&k!=='_exportedAt')))===JSON.stringify(e2.state||e2.lager||Object.fromEntries(Object.entries(e2).filter(([k])=>k!=='_pick'&&k!=='exportedAt'&&k!=='_exportedAt'))));
 R('10 Export nach Portalnutzung: Aufträge identisch',JSON.stringify(e1._pick.orders)===JSON.stringify(e2._pick.orders));
 const h2=await open(b,ADMIN,{seed:false});await h2.p.evaluate(()=>tab('more'));await h2.p.setInputFiles('#jsonImport',path.join(TMP,'e2.json'));await h2.p.waitForTimeout(1500);
 const imp=await ls(h2.p);R('10 Import des Exports: Lagerdaten und Aufträge wiederhergestellt',JSON.parse(imp[SK]).boxes.length===2&&JSON.parse(imp[PK]).orders.length===4);
 await h2.p.goto(PORTAL);await h2.p.waitForTimeout(300);await loginAs(h2.p,'Max');R('10 Portal arbeitet nach Import mit den importierten Daten (Auftrag K-9001 sichtbar)',await (async()=>{await h2.p.evaluate(()=>tab('picking'));return (await h2.p.locator('#pickWorker').innerText()).includes('K-9001')})());
 R('10 Keine JavaScript-Fehler',h.errs.length===0&&h2.errs.length===0,h.errs.concat(h2.errs).join('|'));await h.ctx.close();await h2.ctx.close();}

// 8b Bestehendes Verhalten: Peters zugewiesener Auftrag erhält beim ersten Öffnen Positionen - im Portal identisch zur Verwaltung
{const get=async(url,portal)=>{const h=await open(b,url);const p=h.p;if(portal){await loginAs(p,'Peter');await p.evaluate(()=>tab('picking'))}else{await p.evaluate(()=>tab('picking'));await p.selectOption('#pickEmployee','Peter');await p.fill('#pickDevice','Scanner 2');await p.locator('#pickLogin').click()}await p.waitForTimeout(400);const o=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).orders.find(x=>x.id==='K-1043'),PK);await h.ctx.close();return JSON.stringify(o)};
 const a=await get(ADMIN,false),pt=await get(PORTAL,true);R('8 Auftragsverhalten (Positionserzeugung K-1043 für Peter) im Portal identisch zur Verwaltung',a===pt,a===pt?'':a.slice(0,100)+' <> '+pt.slice(0,100));}

// 11 Mobil: iPhone 14, Android (Pixel 7), iPad Pro 11
for(const dev of ['iPhone 14','Pixel 7','iPad Pro 11']){const h=await open(b,PORTAL,{dev});const p=h.p;
 const chk=async(label)=>{const r=await p.evaluate(()=>{const small=[];document.querySelectorAll('button,select,input,textarea,summary,a[href]').forEach(e=>{if(e.closest('[inert]'))return;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(cs.display==='none'||cs.visibility==='hidden'||r.width===0||r.height===0)return;if(e.closest('.hidden'))return;if(e.type==='hidden')return;if(r.height<43.5||r.width<43.5)small.push((e.id||e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height))});return {over:document.documentElement.scrollWidth>innerWidth+1,small}});return r};
 let r=await chk();R('11 '+dev+': Anmeldung ohne Seitenüberlauf, Touch-Ziele ≥44 px',!r.over&&r.small.length===0,JSON.stringify(r));
 await p.locator('[data-portal-name="Leon"]').tap();await p.locator('#portalLoginBtn').tap();await p.waitForTimeout(300);
 R('11 '+dev+': Anmeldung per Tap funktioniert (Leon/Scanner 3)',await p.evaluate(()=>pickState.session==='Leon'&&document.getElementById('portalWhere').textContent==='Scanner 3'));
 r=await chk();R('11 '+dev+': Startseite ohne Seitenüberlauf, Touch-Ziele ≥44 px',!r.over&&r.small.length===0,JSON.stringify(r));
 const tiles=await p.evaluate(()=>[...document.querySelectorAll('.portal-tile')].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.width),Math.round(b.height),b.right<=innerWidth,b.bottom]}));
 R('11 '+dev+': vier Kacheln, groß (≥100 px hoch) und vollständig im Bildschirm',tiles.length===4&&tiles.every(t=>t[0]>=120&&t[1]>=100&&t[2]),JSON.stringify(tiles));
 for(const go of ['picking','stock','racks','scan']){await p.locator('[data-portal-go="'+go+'"]').tap();await p.waitForTimeout(250);r=await chk();
  R('11 '+dev+': "'+go+'" ohne Seitenüberlauf'+(go==='racks'?' (Regalraster scrollt im eigenen Container)':'')+', Touch-Ziele ≥44 px',!r.over&&r.small.length===0,JSON.stringify(r));
  await p.locator('#portalBack').tap();await p.waitForTimeout(150);}
 R('11 '+dev+': Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));
 if(dev==='iPhone 14'){await p.screenshot({path:path.join(TMP,'home-iphone.png')});}
 await h.ctx.close();}

// 12 Mitarbeiter-Testdemo aus der Verwaltung: Mehr -> Demo -> Portal -> Verwaltung
{const h=await open(b,ADMIN);const p=h.p;const before=await ls(p);
 await p.evaluate(()=>tab('more'));
 R('12 "Mehr" enthält den Eintrag "Mitarbeiter-Testdemo"',(await p.locator('#mtDemoCard .mt-demo-title').innerText())==='Mitarbeiter-Testdemo'&&await vis(p,'#mtDemoOpen'));
 R('12 Verwaltungsnavigation unverändert (gleiche 8 Tabs + 2 Bereiche)',await p.locator('#subnav [data-tab]').count()>=8&&await p.locator('#nav [data-area]').count()===2);
 await p.evaluate(()=>sessionStorage.setItem('lagerpilot_portal_user','Peter'));
 await Promise.all([p.waitForNavigation(),p.locator('#mtDemoOpen').click()]);await p.waitForTimeout(400);
 R('12 Demo öffnet Portal mit Mitarbeiterauswahl Max/Peter/Leon (auch bei altem Tab-Merker)',await active(p)==='portalLogin'&&await p.locator('[data-portal-name]').count()===3,p.url());
 R('12 Gut sichtbarer Rückweg "Zur Verwaltung" in der Anmeldung (≥44 px)',await vis(p,'#portalToAdmin')&&(await p.locator('#portalToAdmin').boundingBox()).height>=44);
 await loginAs(p,'Leon');
 R('12 Geräteauswahl vorhanden, Anmeldung führt zur Startseite mit 4 Kacheln',await p.locator('#portalDevice').count()===1&&await active(p)==='portalHome'&&await p.locator('.portal-tile').count()===4);
 R('12 Rückweg auch auf Startseite sichtbar',await vis(p,'#portalToAdmin'));
 await p.reload();await p.waitForTimeout(400);R('12 Neuladen im Portal behält Demo-Modus, Rückweg und Anmeldung',await active(p)==='portalHome'&&await vis(p,'#portalToAdmin'));
 await p.locator('[data-portal-go="picking"]').click();R('12 Rückweg auch in Unterbereich sichtbar',await vis(p,'#portalToAdmin'));
 const ordersBefore=JSON.stringify(JSON.parse(await p.evaluate(k=>localStorage.getItem(k),PK)).orders);
 await p.locator('#portalToAdmin').click();await p.waitForTimeout(300);
 const bye=await p.evaluate(()=>({sec:document.querySelector('section.active').id,session:pickState.session,marker:sessionStorage.getItem('lagerpilot_portal_user'),txt:document.getElementById('portalBye').innerText,p:pickState.people.find(x=>x.name==='Leon').active}));
 R('12 Klick auf "Zur Verwaltung": Abmeldung-erfolgreich-Ansicht, Demo-Sitzung beendet',bye.sec==='portalBye'&&bye.session===''&&!bye.marker&&!bye.p&&bye.txt.includes('Abmeldung erfolgreich')&&bye.txt.includes('Verwaltung'),JSON.stringify(bye));
 R('12 Abmeldung: Aufträge und Lagerdaten unverändert',JSON.stringify(JSON.parse(await p.evaluate(k=>localStorage.getItem(k),PK)).orders)===ordersBefore&&(await ls(p))[SK]===before[SK]);
 await p.waitForURL(/index\.html$/,{timeout:6000});await p.waitForTimeout(400);
 R('12 Automatische Rückleitung öffnet normale Verwaltung ohne Portal-Modus',!(await p.evaluate(()=>document.documentElement.classList.contains('portal')))&&await vis(p,'#nav')&&!(await vis(p,'#portalToAdmin')),p.url());
 await p.evaluate(()=>tab('more'));await Promise.all([p.waitForNavigation(),p.locator('#mtDemoOpen').click()]);await p.waitForTimeout(400);
 R('12 Erneuter Demo-Einstieg zeigt wieder die Mitarbeiterauswahl',await active(p)==='portalLogin'&&await p.locator('[data-portal-name]').count()===3);
 await p.evaluate(()=>tab('portalLogin'));await p.locator('#portalToAdmin').click();await p.waitForURL(/index\.html$/,{timeout:6000});await p.waitForTimeout(300);
 {const h2=await open(b,ADMIN);const q=h2.p;await q.evaluate(()=>tab('picking'));await q.selectOption('#pickEmployee','Peter');await q.fill('#pickDevice','Scanner 2');await q.locator('#pickLogin').click();await q.waitForTimeout(250);
  await q.evaluate(()=>tab('more'));await Promise.all([q.waitForNavigation(),q.locator('#mtDemoOpen').click()]);await q.waitForTimeout(400);
  await q.locator('#portalToAdmin').click();await q.waitForURL(/index\.html$/,{timeout:6000});await q.waitForTimeout(300);
  R('12 Rückweg aus der Auswahl (ohne Demo-Anmeldung) beendet keine bestehende Test-Anmeldung der Verwaltung',await q.evaluate(()=>pickState.session==='Peter'));await h2.ctx.close();}

 await p.evaluate(()=>tab('stock'));R('12 Verwaltung nach Rückkehr bedienbar',await active(p)==='stock');
 const after=await ls(p);
 R('12 Lagerdaten nach vollem Wechsel byte-identisch',before[SK]===after[SK]);
 R('12 Aufträge/Kommissionierdaten unverändert (nur Anmeldung geändert)',(()=>{const b0=JSON.parse(before[PK]),a0=JSON.parse(after[PK]);return JSON.stringify(b0.orders)===JSON.stringify(a0.orders)})());
 const p2=await h.ctx.newPage();await p2.goto(PORTAL);await p2.waitForTimeout(400);
 R('12 Separate Portal-Adresse funktioniert weiter, ohne Rückweg zur Verwaltung',await active(p2)==='portalLogin'&&!(await vis(p2,'#portalToAdmin')));
 await p2.close();
 for(const dev of ['iPhone 14','Pixel 7','iPad Pro 11']){const m=await open(b,ADMIN,{dev});await m.p.evaluate(()=>tab('more'));
  const ok1=await m.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  await m.p.locator('#mtDemoOpen').tap();await m.p.waitForTimeout(500);
  const r=await m.p.evaluate(()=>{const small=[];document.querySelectorAll('button,a[href],select').forEach(e=>{if(e.closest('[inert]'))return;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(cs.display==='none'||r.width===0)return;if(r.height<43.5||r.width<43.5)small.push(e.id||e.className)});return {over:document.documentElement.scrollWidth>innerWidth+1,small}});
  R('12 '+dev+': Mehr + Demo-Login mit Rückweg ohne Überlauf, Touch-Ziele ≥44 px',ok1&&!r.over&&r.small.length===0,JSON.stringify(r));
  R('12 '+dev+': Keine JavaScript-Fehler',m.errs.length===0,m.errs.join('|'));await m.ctx.close();}
 R('12 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

await b.close();const f=res.filter(r=>!r[1]).length;console.log('GESAMT '+res.length+' Prüfungen / FAIL '+f);process.exit(f?1:0);
})().catch(e=>{console.log('SCRIPTFEHLER',e.stack.slice(0,900));process.exit(2)});
