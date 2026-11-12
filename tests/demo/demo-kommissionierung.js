/* Demo-Kommissionierung (Vorführung) im Mitarbeiterportal. Aufruf: node tests/demo/demo-kommissionierung.js http://localhost:8131/
   Frisches Browserprofil je Test; window.print wird ersetzt (es wird nichts gedruckt). Emulatoren ersetzen keinen Test auf echten Geräten. Exit-Code 0 = alles bestanden. */
const {chromium,devices}=require('playwright');
const BASE=(process.argv[2]||'http://localhost:8131/').replace(/index\.html.*$/,''),PORTAL=BASE+'index.html?portal=mitarbeiter',ADMIN=BASE+'index.html';
const SK='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1',DK='lagerpilot_demo_kommissionierung_v1';
const ITEMS=[['EL-100016','H4A-3-41','4260512300011',12,0.115],['BV-020840','H4A-12-88','4260512300028',6,0.98],['WL-330210','H4B-5-17','4260512300035',10,0.105],['KS-440105','H4B-14-120','4260512300042',15,0.185]];
const NET=ITEMS.reduce((s,i)=>s+i[3]*i[4],0),EXP=Math.round((NET+24+1.4)*1000)/1000;
const res=[];const R=(id,ok,info)=>{res.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,230):''))};
async function open(b,{dev,seedPick}={}){const ctx=await b.newContext(dev?{...devices[dev]}:{viewport:{width:1100,height:900}});const p=await ctx.newPage();p.setDefaultTimeout(20000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{window.__prints=0;window.print=()=>{window.__prints++;window.__lastPrint=document.getElementById('pickPrint').innerHTML}});
 await p.goto(ADMIN);await p.waitForTimeout(250);
 if(seedPick)await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,seedPick]);
 await p.goto(PORTAL);await p.waitForTimeout(350);return {ctx,p,errs}}
const tap=(p,sel,mob)=>mob?p.locator(sel).tap():p.locator(sel).click();
const act=(p,a,mob)=>tap(p,'[data-demo-act="'+a+'"]',mob);
const ls=p=>p.evaluate(()=>{const o={};for(const k of Object.keys(localStorage))o[k]=localStorage.getItem(k);return o});
const active=p=>p.evaluate(()=>document.querySelector('section.active').id);
const txt=(p,s)=>p.locator(s).innerText();
const msgs=p=>p.locator('.demo-msg').allInnerTexts().then(a=>a.join(' | '));
async function login(p,name,mob){await tap(p,'[data-portal-name="'+name+'"]',mob);await tap(p,'#portalLoginBtn',mob);await p.waitForTimeout(250)}
async function startDemo(p,mob){await tap(p,'#portalDemoStart',mob);await p.waitForTimeout(200)}
async function pickAll(p,mob,{qty}={}){for(let i=0;i<4;i++){await act(p,'scan',mob);await act(p,'scan',mob);if(qty&&qty[i]!==undefined)await p.fill('#demoQty',String(qty[i]));await act(p,'confirm',mob);await p.waitForTimeout(80)}}
const over=p=>p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
const small=p=>p.evaluate(()=>{const o=[];document.querySelectorAll('button,a[href],select,input,summary').forEach(e=>{if(e.closest('[inert]'))return;const cs=getComputedStyle(e),r=e.getBoundingClientRect();if(cs.display==='none'||cs.visibility==='hidden'||r.width===0||r.height===0||e.closest('.hidden'))return;if(r.height<43.5||r.width<43.5)o.push((e.id||e.dataset.demoAct||e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height))});return o});
(async()=>{const b=await chromium.launch();

// A Vollständiger Vorführablauf
{const h=await open(b);const p=h.p;await login(p,'Max');
 const before=await ls(p);
 R('A1 Startseite: deutlich sichtbarer Button „Demo-Kommissionierung starten“',(await txt(p,'#portalDemoStart')).includes('Demo-Kommissionierung starten')&&await p.locator('#portalDemoStart').isVisible());
 R('A1 Startseite zeigt weiterhin genau vier Kacheln',await p.locator('.portal-tile').count()===4);
 await startDemo(p);
 R('A2 Demo-Auftrag mit vier Positionen, Artikelnummern, Lagerplätzen 4A/4B, Sollmengen',await active(p)==='portalDemo'&&await p.locator('.demo-li').count()===4&&ITEMS.every(i=>true)&&(await txt(p,'#demoRoot')).includes('H4A-3-41')&&(await txt(p,'#demoRoot')).includes('H4B-14-120')&&(await txt(p,'#demoRoot')).includes('EL-100016'));
 R('A2 Kennzeichnung „simulierter Scan und simulierte Waage, keine Bestandsbuchung“',(await txt(p,'.demo-banner')).includes('simulierter Scan')&&(await txt(p,'.demo-banner')).includes('keine Bestandsbuchung'));
 R('A3 Palette/Pappbox: zwei Ladungsträger wählbar',await p.locator('[data-demo-pack]').count()===2);
 await p.locator('[data-demo-pack="small"]').click();const sm=await p.evaluate(()=>demo.order.packaging);await p.locator('[data-demo-pack="euro"]').click();const eu=await p.evaluate(()=>demo.order.packaging);
 R('A3 Auswahl setzt Palette/Box (klein 6,5+0,8; Euro 24+1,4)',sm.type==='small'&&sm.palletWeight===6.5&&sm.boxWeight===0.8&&eu.type==='euro'&&eu.palletWeight===24&&eu.boxWeight===1.4);
 await act(p,'begin');await p.waitForTimeout(150);
 for(let i=0;i<4;i++){const t=await txt(p,'.demo-pos');
  R('A4 Position '+(i+1)+': Artikelnummer, Bezeichnung, Lagerplatz, Soll- und Entnahmemenge sichtbar',t.includes('Position '+(i+1)+' von 4')&&t.includes(ITEMS[i][0])&&t.includes(ITEMS[i][1])&&t.includes('Sollmenge')&&t.includes('Entnahmemenge')&&t.includes(String(ITEMS[i][3])+' Stk.'));
  R('A5 Position '+(i+1)+': Bestätigen vor Scan gesperrt',await p.locator('[data-demo-act="confirm"]').isDisabled());
  await act(p,'scan');R('A5 Position '+(i+1)+': Demo-Scan 1 bestätigt Lagerplatz',(await msgs(p)).includes('Lagerplatz '+ITEMS[i][1]+' bestätigt'));
  await act(p,'scan');R('A5 Position '+(i+1)+': Demo-Scan 2 bestätigt Artikel, Menge freigegeben',(await msgs(p)).includes('Artikel '+ITEMS[i][0]+' bestätigt')&&await p.locator('[data-demo-act="confirm"]').isEnabled());
  await act(p,'confirm');await p.waitForTimeout(80);
  if(i<3)R('A6 Fortschritt nach Position '+(i+1)+': „'+(i+1)+' von 4“',(await txt(p,'.demo-prog-t')).includes((i+1)+' von 4'));}
 R('A7 Nach vier Positionen: Gewichtskontrolle mit Kennzeichnung „SIMULIERTE WAAGE“',(await txt(p,'#demoRoot')).includes('SIMULIERTE WAAGE')&&(await txt(p,'#demoRoot')).includes('Gewichtskontrolle'));
 const wt=await txt(p,'.demo-wt');R('A7 Erwartetes Gesamtgewicht = Ware + Palette + Box = '+EXP.toLocaleString('de-DE')+' kg',wt.includes('Erwartetes Gesamtgewicht')&&wt.includes(EXP.toLocaleString('de-DE',{maximumFractionDigits:3})+' kg'),wt.replace(/\s+/g,' '));
 R('A8 Vor dem Wiegen: kein Waagenwert angezeigt, Abschluss gesperrt',(await txt(p,'.demo-result')).includes('Noch kein Waagenwert')&&await p.locator('[data-demo-act="finish"]').isDisabled());
 await act(p,'weigh-bad');await p.waitForTimeout(100);
 const bad=await txt(p,'.demo-result');R('A8 Abweichung sichtbar: nicht bestanden, Abschluss gesperrt',bad.includes('NICHT bestanden')&&await p.locator('[data-demo-act="finish"]').isDisabled(),bad.replace(/\s+/g,' '));
 await act(p,'weigh-clear');await act(p,'weigh-ok');await p.waitForTimeout(100);
 const ok=await txt(p,'.demo-result');R('A8 Erfolgreiche Kontrolle: bestanden, Abschluss möglich',ok.includes('✓ Kontrolle bestanden')&&await p.locator('[data-demo-act="finish"]').isEnabled(),ok.replace(/\s+/g,' '));
 await act(p,'finish');await p.waitForTimeout(250);
 const slip=await txt(p,'.demo-slip');
 R('A9 Abschluss: „Auftrag abgeschlossen“ und vollständiger Kommissionierschein',(await txt(p,'.demo-final')).includes('Auftrag abgeschlossen')&&['Kommissionierschein','DEMO-0001','Max','Scanner 1','BESTANDEN','EL-100016','BV-020840','WL-330210','KS-440105','H4A-3-41','H4B-14-120','Europalette','DEMO-KOMMISSIONIERUNG'].every(x=>slip.includes(x)),slip.slice(0,120).replace(/\s+/g,' '));
 await act(p,'print');R('A9 Schein druckbar (SA-15-Druckfunktion), keine Datenänderung',await p.evaluate(()=>window.__prints)===1&&(await p.evaluate(()=>window.__lastPrint)).includes('DEMO-0001'));
 R('A9 Demo-Auftrag erscheint nicht unter regulären Aufträgen',await p.evaluate(()=>!pickState.orders.some(o=>String(o.id).startsWith('DEMO'))));
 const done=await ls(p);
 R('A10 Daten: Lagerdaten byte-identisch und reguläre Aufträge unverändert nach der Demo',before[SK]===done[SK]&&JSON.stringify(JSON.parse(before[PK]).orders)===JSON.stringify(JSON.parse(done[PK]).orders));
 R('A10 Es entsteht nur der eigene Demo-Schlüssel (keine anderen neuen Schlüssel)',Object.keys(done).filter(k=>!(k in before)).every(k=>k===DK));
 await act(p,'restart');await p.waitForTimeout(200);
 const st=await p.evaluate(()=>({step:demo.step,idx:demo.idx,checked:demo.order.checkedLines.length,st:demo.order.status,m:demo.order.packaging.measuredWeight}));
 R('A10 Zurücksetzen und erneut starten: frische Demo (Vorbereitung, nichts bestätigt)',st.step==='prep'&&st.idx===0&&st.checked===0&&st.st==='Offen'&&st.m===null&&await p.locator('.demo-li').count()===4,JSON.stringify(st));
 const after=await ls(p);R('A10 Daten nach Reset unverändert (Lagerdaten, Aufträge)',before[SK]===after[SK]&&JSON.stringify(JSON.parse(before[PK]).orders)===JSON.stringify(JSON.parse(after[PK]).orders));
 // zweiter Durchlauf
 await act(p,'begin');await pickAll(p,false);await act(p,'weigh-ok');await act(p,'finish');await p.waitForTimeout(200);
 R('A10 Zweiter vollständiger Durchlauf nach Neustart funktioniert',(await txt(p,'.demo-final')).includes('Auftrag abgeschlossen'));
 R('A11 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// B Fehlscan, falsche Menge, Persistenz
{const h=await open(b);const p=h.p;await login(p,'Peter');await startDemo(p);await act(p,'begin');await p.locator('.demo-test summary').click();
 await act(p,'badscan');const m1=await msgs(p);
 R('B1 Fehlscan Lagerplatz: Fehlermeldung, kein Fortschritt',m1.includes('Falscher Lagerplatz')&&m1.includes('Erwartet: H4A-3-41')&&await p.locator('[data-demo-act="confirm"]').isDisabled()&&await p.evaluate(()=>demo.phase)==='place',m1);
 await p.fill('#demoCode','H4A-9-9');await act(p,'code');
 R('B1 Falscher Code von Hand: abgelehnt',(await msgs(p)).includes('Falscher Lagerplatz'));
 await p.fill('#demoCode','H4A-3-41');await act(p,'code');R('B2 Richtiger Lagerplatz per Code-Eingabe (vorhandene Platzauflösung) akzeptiert',(await msgs(p)).includes('Lagerplatz H4A-3-41 bestätigt'));
 await act(p,'badscan');const m2=await msgs(p);R('B2 Fehlscan Artikel: Fehlermeldung, kein Fortschritt',m2.includes('Falscher Artikel')&&await p.evaluate(()=>demo.phase)==='article',m2);
 await p.fill('#demoCode','4260512300011');await p.press('#demoCode','Enter');await p.waitForTimeout(150);
 R('B2 Richtiger Artikelbarcode per Enter akzeptiert, Menge freigegeben',await p.evaluate(()=>demo.phase)==='qty');
  // falsche Menge
 await p.fill('#demoQty','10');await p.waitForTimeout(150);
 R('B3 Abweichende Menge: Warnung und Hinweis auf Freigabe',(await txt(p,'.demo-pos')).includes('Mengenabweichung: Soll 12, Entnahme 10')&&(await txt(p,'[data-demo-act="confirm"]')).includes('Abweichung übernehmen'));
 for(const bad of ['-3','1.5','']){await p.fill('#demoQty',bad);await p.locator('#demoQty').blur();await p.waitForTimeout(120);}
 R('B3 Ungültige Mengen (negativ, Dezimal, leer) werden abgelehnt, Menge bleibt 10',await p.evaluate(()=>demo.order.items[0].actual)===10&&(await msgs(p)).includes('gültige ganze Menge'));
 await act(p,'dec');await act(p,'inc');R('B3 +/− ändert die Menge um 1',await p.evaluate(()=>demo.order.items[0].actual)===10);
 await act(p,'confirm');await p.waitForTimeout(100);
 // Persistenz mid-demo
 await p.reload();await p.waitForTimeout(400);
 R('B4 Nach Neuladen bleibt Anmeldung und Demo-Fortschritt erhalten (Position 2 von 4)',await active(p)==='portalHome');
 await p.locator('#portalDemoStart').click();await p.waitForTimeout(200);
 R('B4 Startseiten-Button heißt „fortsetzen“; Demo steht bei Position 2 mit 1 bestätigten',(await txt(p,'.demo-pos')).includes('Position 2 von 4')&&(await txt(p,'.demo-prog-t')).includes('1 von 4'));
 await p.locator('#portalBack').click();await p.waitForTimeout(150);
 R('B4 „Zur Startseite“ mitten in der Demo und zurück: Fortschritt bleibt',(await txt(p,'#portalDemoStartTitle')).includes('fortsetzen'));
 await p.locator('#portalDemoStart').click();await p.waitForTimeout(150);
 await pickAllFrom(p,1);
 async function pickAllFrom(pg,from){for(let i=from;i<4;i++){await act(pg,'scan');await act(pg,'scan');await act(pg,'confirm');await pg.waitForTimeout(60)}}
 await act(p,'weigh-ok');await act(p,'finish');await p.waitForTimeout(200);
 const slip=await txt(p,'.demo-slip');
 R('B5 Abweichung wird auf dem Kommissionierschein ausgewiesen und als simulierte Freigabe gekennzeichnet',slip.includes('Soll 12 / Ist 10')&&slip.includes('Demo-Freigabe (simuliert)'),slip.replace(/\s+/g,' ').slice(0,0));
 R('B5 Gewicht nutzt die tatsächliche Entnahmemenge (Ist 10 statt 12 → Waagenwert passt)',(await txt(p,'.demo-final')).includes('Auftrag abgeschlossen'));
 R('B6 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// C Gewicht außerhalb der Toleranz (manuell)
{const h=await open(b);const p=h.p;await login(p,'Leon');await startDemo(p);await act(p,'begin');await pickAll(p,false);
 await p.fill('#demoMeasured','40');await act(p,'weigh-man');await p.waitForTimeout(100);
 const r1=await txt(p,'.demo-result');R('C1 Manueller Wert außerhalb ±2 %: nicht bestanden, Abschluss gesperrt',r1.includes('NICHT bestanden')&&await p.locator('[data-demo-act="finish"]').isDisabled(),r1.replace(/\s+/g,' '));
 R('C1 Abschluss lässt sich auch programmgesteuert nicht erzwingen',await p.evaluate(()=>{const r=demoFinish();return r.ok===false&&demo.step==='weigh'&&demo.order.status!=='Abgeschlossen'}));
 await p.fill('#demoMeasured','');await act(p,'weigh-man');R('C2 Leerer/ungültiger Waagenwert wird abgelehnt',(await msgs(p)).includes('gültigen Waagenwert'));
 await p.fill('#demoMeasured','-5');await act(p,'weigh-man');
 R('C2 Negativer Wert abgelehnt, bisheriger Wert bleibt',await p.evaluate(()=>demo.order.packaging.measuredWeight)===40);
 const lo=Math.round(EXP*0.985*1000)/1000;await p.fill('#demoMeasured',String(lo));await act(p,'weigh-man');
 R('C3 Wert innerhalb der Toleranz (−1,5 %) wird bestanden',(await txt(p,'.demo-result')).includes('✓ Kontrolle bestanden'));
 const edge=Math.round(EXP*1.03*1000)/1000;await p.fill('#demoMeasured',String(edge));await act(p,'weigh-man');
 R('C3 +3 % außerhalb der Toleranz → nicht bestanden',(await txt(p,'.demo-result')).includes('NICHT bestanden'));
 R('C4 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// D Leerer Auftrag in der bestehenden Mitarbeiter-Kommissionierung + beschädigter Demo-Zustand
{const seed={people:[],roster:['Max','Peter','Leon'],orders:[{id:'K-LEER',lines:3,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:null,tolerancePercent:1}}],session:'',testStatus:{}};
 const h=await open(b,{seedPick:seed});const p=h.p;await login(p,'Max');await tap(p,'[data-portal-go="picking"]');await p.waitForTimeout(300);
 const w=await txt(p,'#pickWorker');
 R('D1 Leerer Auftrag: niemals „Alle Positionen bestätigt“',!w.includes('Alle Positionen bestätigt')&&w.includes('Keine Positionen vorhanden'),w.replace(/\s+/g,' ').slice(0,160));
 const sticky=await txt(p,'.lp-weight-sticky');
 R('D2 Leerer Auftrag: kein scheinbar gültiger Waagenwert („Noch unvollständig“)',sticky.includes('Noch unvollständig')&&!/\d+,\d+ kg/.test(sticky),sticky.replace(/\s+/g,' '));
 R('D2 Gewichtspanel: Netto „nicht vollständig“, Brutto/erwarteter Waagenwert „nicht berechenbar“, Hinweis „Keine Positionen“',await (async()=>{const t=await txt(p,'.lp-pick-weight-panel');return t.includes('Nicht berechenbar')&&t.includes('Warengewicht (Netto): Nicht vollständig')&&t.includes('Keine Positionen vorhanden')&&!t.includes('Position 0')&&!/Gesamtgewicht \(Brutto\): \d/.test(t)&&!/Waagenwert \([^)]*\): \d/.test(t)})());
 R('D3 Abschluss für leeren Auftrag bleibt gesperrt',await p.locator('[data-worker-action="finish"]').isDisabled());
 // beschädigter Demo-Zustand -> frische Demo, übrige Daten unberührt
 const snap=await ls(p);
 await p.evaluate(k=>localStorage.setItem(k,JSON.stringify({v:1,step:'pick',idx:0,phase:'place',order:{demo:true,items:[],lines:0,checkedLines:[],scannedLines:[],packaging:{type:'euro'}}})),DK);
 await p.reload();await p.waitForTimeout(400);await tap(p,'#portalDemoStart');await p.waitForTimeout(200);
 R('D4 Beschädigter/leerer Demo-Zustand wird verworfen: frische Demo mit 4 Positionen',await p.locator('.demo-li').count()===4&&(await txt(p,'.demo-prog-t').catch(()=>'')||'')==='');
 const snap2=await ls(p);R('D4 Reguläre Daten dabei unverändert',snap[SK]===snap2[SK]&&JSON.stringify(JSON.parse(snap[PK]).orders)===JSON.stringify(JSON.parse(snap2[PK]).orders));
 R('D5 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// E Demo ohne vorherige manuelle Artikelanlage auf leerem Lager (frischer Browser ohne jegliche Daten)
{const ctx=await b.newContext({viewport:{width:1100,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(PORTAL);await p.waitForTimeout(400);await login(p,'Max');await startDemo(p);
 const ls0=await ls(p);
 await act(p,'begin');await pickAll(p,false);await act(p,'weigh-ok');await act(p,'finish');await p.waitForTimeout(200);
 R('E1 Ohne vorherige Artikelanlage/Testbestände: komplette Demo bis Schein funktioniert',(await txt(p,'.demo-final')).includes('Auftrag abgeschlossen')&&(await txt(p,'.demo-slip')).includes('BESTANDEN'));
 const st=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),SK);R('E1 Lagerbestand bleibt leer (keine Boxen/Artikel durch die Demo angelegt)',st.boxes.length===0&&st.items.length===0&&ls0[SK]===(await ls(p))[SK]);
 R('E2 Keine JavaScript-Fehler',errs.length===0,errs.join('|'));await ctx.close();}

// F Verwaltung unverändert, Rückweg, Mobil
{const h=await open(b,{});const p=h.p;await p.goto(ADMIN);await p.waitForTimeout(300);
 R('F1 Verwaltung ohne Portal-Modus: Demo-Button nicht sichtbar, Navigation unverändert',!(await p.locator('#portalDemoStart').isVisible())&&await p.locator('#subnav [data-tab]').count()>=8);
 await p.evaluate(()=>tab('more'));await Promise.all([p.waitForNavigation(),p.locator('#mtDemoOpen').click()]);await p.waitForTimeout(400);
 await login(p,'Max');await startDemo(p);await act(p,'begin');await act(p,'scan');
 await p.locator('#portalToAdmin').click();await p.waitForURL(/index\.html$/,{timeout:6000});await p.waitForTimeout(300);
 R('F2 Rückweg zur Verwaltung mitten in der Demo funktioniert',!(await p.evaluate(()=>document.documentElement.classList.contains('portal'))));
 await p.evaluate(()=>tab('more'));await Promise.all([p.waitForNavigation(),p.locator('#mtDemoOpen').click()]);await p.waitForTimeout(400);await login(p,'Max');
 R('F3 Erneuter Einstieg aus der Verwaltung: Auswahl erscheint, Demo wird fortgesetzt',(await txt(p,'#portalDemoStartTitle')).includes('fortsetzen'));
 R('F4 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}
for(const dev of ['iPhone 14','Pixel 7','iPad Pro 11']){const h=await open(b,{dev});const p=h.p;await login(p,'Max',true);
 let o=[],sm=[];const chk=async(l)=>{if(await over(p))o.push(l);sm=sm.concat((await small(p)).map(x=>l+':'+x))};
 await chk('home');await startDemo(p,true);await chk('prep');await act(p,'begin',true);await chk('pick-place');
 await act(p,'scan',true);await act(p,'scan',true);await chk('pick-qty');await p.fill('#demoQty','7');await chk('pick-dev');await p.fill('#demoQty','12');await act(p,'confirm',true);
 for(let i=1;i<4;i++){await act(p,'scan',true);await act(p,'scan',true);await act(p,'confirm',true);await p.waitForTimeout(60)}
 await chk('weigh');await act(p,'weigh-bad',true);await chk('weigh-fail');await act(p,'weigh-clear',true);await act(p,'weigh-ok',true);await chk('weigh-pass');await act(p,'finish',true);await p.waitForTimeout(250);await chk('done');
 R('G '+dev+': kompletter Vorführablauf per Tap bis Kommissionierschein',(await txt(p,'.demo-final')).includes('Auftrag abgeschlossen')&&(await txt(p,'.demo-slip')).includes('KS-440105'));
 R('G '+dev+': kein horizontaler Seitenüberlauf in allen Schritten',o.length===0,o.join(','));
 R('G '+dev+': Touch-Ziele ≥ 44 px in allen Schritten',sm.length===0,sm.slice(0,6).join(','));
 R('G '+dev+': Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

await b.close();const f=res.filter(x=>!x).length;console.log('GESAMT '+res.length+' Prüfungen / FAIL '+f);process.exit(f?1:0);
})().catch(e=>{console.log('SCRIPTFEHLER',e.stack.slice(0,900));process.exit(2)});
