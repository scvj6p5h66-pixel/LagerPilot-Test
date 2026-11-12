/* SA-15: Tests für Kommissionierschein und Auftragsabschluss.
   Aufruf: node tests/pick/sa15-kommissionierschein.js http://localhost:8130/index.html
   Eigenständig, frisches Browserprofil, ändert weder App noch Repository. Exit-Code 0 = alles bestanden. */
const {chromium,devices}=require('playwright');const fs=require('fs');const os=require('os');const path=require('path');const {execFileSync}=require('child_process');
const URL=process.argv[2]||'http://localhost:8130/index.html',PK='lagerpilot_pick_demo_v1',SK='lagerpilot_v2_7',TMP=fs.mkdtempSync(path.join(os.tmpdir(),'sa15-'));
const res=[];const R=(id,ok,info)=>{res.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,260):''))};
const mkItems=(n,o={})=>Array.from({length:n},(_,i)=>({sku:'ART-'+String(i+1).padStart(4,'0'),name:o.longNames?'Sehr lange Artikelbezeichnung mit vielen Wörtern und Sonderzeichen äöüß / Position '+(i+1)+' — nochmals verlängert zur Prüfung des Zeilenumbruchs in schmalen Spalten':'Artikel '+(i+1),place:'H4B-'+(1+i%18)+'-'+(1+(i*7)%162),qty:2+(i%5),actual:2+(i%5),unitWeight:0.5+(i%4)*0.25}));
const sumW=(it,pw,bw,tared)=>it.reduce((s,x)=>s+x.actual*x.unitWeight,0)+(tared?0:pw+bw);
function mkOrder(id,n,o={}){const items=o.items||mkItems(n,o);const pw=o.pw??25,bw=o.bw??1.5,tared=!!o.tared;const exp=sumW(items,pw,bw,tared);
 return {id,lines:items.length,assignee:o.assignee??'Max',status:o.status||'In Bearbeitung',startedAt:o.noStart?undefined:'2026-11-12T08:00:00.000Z',items,checkedLines:o.unchecked?[]:items.map((_,i)=>i),scannedLines:o.unchecked?[]:items.map((_,i)=>i),
  packaging:{type:o.type||'euro',scaleMode:tared?'tared':'gross',palletWeight:pw,boxWeight:bw,measuredWeight:o.measured===undefined?Math.round(exp*1000)/1000:o.measured,tolerancePercent:o.tol===undefined?1:o.tol},...(o.extra||{})}}
const pickState=(orders,o={})=>({people:[{name:'Max',device:o.noDevice?'':'Scanner 1',active:true,lastSeen:Date.now()}],roster:['Max','Peter','Leon'],orders,session:o.session??'Max',testStatus:{Max:true}});
async function open(b,seed,dev){const ctx=await b.newContext(dev?{...devices[dev]}:{viewport:{width:1100,height:900}});const p=await ctx.newPage();p.setDefaultTimeout(30000);const errs=[],dlg=[];p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>{dlg.push(d.type()+':'+d.message().slice(0,120));d.accept()});
 await p.addInitScript(()=>{window.__prints=0;window.print=()=>{window.__prints++;window.__lastPrint=document.getElementById('pickPrint').innerHTML};});
 await p.goto(URL);await p.waitForTimeout(300);
 if(seed){await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,seed]);await p.reload();await p.waitForTimeout(300);}
 return {ctx,p,errs,dlg}}
const store=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const order=(p,id)=>p.evaluate(([k,id])=>JSON.parse(localStorage.getItem(k)).orders.find(o=>o.id===id),[PK,id]);
const goPick=async p=>{await p.evaluate(()=>{const b=document.querySelector('#nav [data-area="picking"]');if(b)b.click();tab('picking')});await p.waitForTimeout(200)};
const text=(h)=>h.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ');
async function pdf(p,html,name){await p.evaluate(h=>{document.getElementById('pickPrint').innerHTML=h},html);await p.emulateMedia({media:'print'});const f=path.join(TMP,name+'.pdf');await p.pdf({path:f,format:'A4',printBackground:true,preferCSSPageSize:true});await p.emulateMedia({media:'screen'});
 const info=execFileSync('pdfinfo',[f]).toString();const pages=Number(/Pages:\s+(\d+)/.exec(info)[1]);const size=/Page size:\s+([\d.]+) x ([\d.]+)/.exec(info);return {f,pages,w:Number(size[1]),h:Number(size[2]),txt:execFileSync('pdftotext',['-layout',f,'-']).toString()}}
(async()=>{const b=await chromium.launch();

// 1 Vollständiger Auftrag über die Mitarbeiteroberfläche, erfolgreiche Gewichtskontrolle
{const h=await open(b,pickState([mkOrder('K-T1',3)]));const p=h.p;await goPick(p);
 const inv0=await store(p,SK);
 const btn=p.locator('[data-worker-action="finish"]');R('1 Abschluss-Button aktiv bei bestandener Gewichtskontrolle',await btn.isEnabled());
 await btn.click();await p.waitForTimeout(400);
 const o=await order(p,'K-T1');
 R('1 Status Abgeschlossen, Abschlusszeit gesetzt',o.status==='Abgeschlossen'&&!!o.finishedAt);
 R('1 Scanner/Gerät beim Abschluss festgehalten',o.completion&&o.completion.device==='Scanner 1'&&o.completion.assignee==='Max',JSON.stringify(o.completion));
 R('1 Abschlussansicht sichtbar mit Auftragsnummer',await p.locator('#pickClosure:not(.hidden) #pickClosureTitle').count()===1&&(await p.locator('#pickClosure').innerText()).includes('K-T1'));
 R('1 Gewichtskontrolle in Abschlussansicht: bestanden',(await p.locator('#pickClosure').innerText()).toLowerCase().includes('bestanden')&&!(await p.locator('#pickClosure .badc').count()));
 R('1 Druckansicht öffnet automatisch (genau 1×)',await p.evaluate(()=>window.__prints)===1);
 const t=text(await p.evaluate(()=>window.__lastPrint));
 R('1 Schein enthält Auftrag, Mitarbeiter, Scanner, Datum',t.includes('K-T1')&&t.includes('Max')&&t.includes('Scanner 1')&&t.includes('ABGESCHLOSSEN')&&/\d{2}\.\d{2}\.\d{4}|\d{1,2}\. \w+ \d{4}/.test(t));
 R('1 Schein enthält alle Artikel, Lagerplätze, Soll und Ist',['ART-0001','ART-0002','ART-0003','Artikel 1','H4B-1-1','H4B-2-8'].every(x=>t.includes(x)));
 R('1 Schein: Ladungsträger Europalette, Bruttogewicht, BESTANDEN',t.includes('Europalette')&&t.includes('Berechnetes Bruttogewicht')&&t.includes('BESTANDEN – innerhalb der Toleranz'));
 R('1 Lagerdaten (Bestand/Boxen/Plätze) durch Abschluss und Druck unverändert',(await store(p,SK))===inv0);
 R('1 Schließen-Button schließt die Abschlussansicht',await (async()=>{await p.locator('#pickClosureClose').click();return await p.locator('#pickClosure.hidden').count()===1})());
 R('1 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 2 Fehlerhafte Gewichtskontrolle darf nicht als Erfolg gelten
{const orders=[mkOrder('K-T2a',3,{measured:80}),mkOrder('K-T2b',3,{measured:null,assignee:'Peter'}),mkOrder('K-T2c',3,{tol:null,assignee:'Leon'})];
 const h=await open(b,pickState(orders));const p=h.p;await goPick(p);
 R('2 Zu hoher Waagenwert: Abschluss-Button gesperrt',await p.locator('[data-worker-action="finish"]').isDisabled());
 const r=await p.evaluate(()=>{const o=pickState.orders.find(x=>x.id==='K-T2a');const before=JSON.stringify(o);const res=pickComplete(o);return {res,same:JSON.stringify(o)===before,status:o.status}});
 R('2 Direkter Aufruf von pickComplete wird abgelehnt, Auftrag unverändert',!r.res&&r.same&&r.status==='In Bearbeitung',JSON.stringify(r)+' '+h.dlg.join('|'));
 R('2 Ablehnung mit klarer Meldung',h.dlg.some(d=>/Gewichtskontrolle nicht bestanden/.test(d)),h.dlg.join('|'));
 await p.evaluate(()=>{pickState.session='Max';});
 const s1=text(await p.evaluate(()=>{pickPrintReceipt(pickState.orders.find(x=>x.id==='K-T2a'));return window.__lastPrint}));
 R('2 Vorläufiger Schein zeigt "NICHT BESTANDEN" und "VORLÄUFIG"',s1.includes('NICHT BESTANDEN')&&s1.includes('VORLÄUFIG – NICHT ABGESCHLOSSEN')&&!s1.includes('BESTANDEN – innerhalb'));
 const s2=text(await p.evaluate(()=>{pickPrintReceipt(pickState.orders.find(x=>x.id==='K-T2b'));return window.__lastPrint}));
 R('2 Fehlender Waagenwert: "NICHT GEPRÜFT", nicht "bestanden"',s2.includes('NICHT GEPRÜFT')&&!s2.includes('BESTANDEN – innerhalb'));
 const s3=text(await p.evaluate(()=>{pickPrintReceipt(pickState.orders.find(x=>x.id==='K-T2c'));return window.__lastPrint}));
 R('2 Fehlende Toleranz: "NICHT GEPRÜFT"',s3.includes('NICHT GEPRÜFT'));
 // Administrationspfad
 await p.evaluate(()=>tab('pickAdmin'));await p.waitForTimeout(200);
 await p.evaluate(()=>{pickState.orders.find(x=>x.id==='K-T2a').assignee='Max';pickRender()});
 const before=await store(p,PK);await p.locator('[data-pick-finish="K-T2a"]').click();await p.waitForTimeout(200);
 R('2 Admin-Pfad: Abschluss bei nicht bestandener Kontrolle verweigert, Daten unverändert',(await store(p,PK))===before&&(await order(p,'K-T2a')).status==='In Bearbeitung');
 R('2 Keine Abschlussansicht bei Fehlschlag',await p.locator('#pickClosure:not(.hidden)').count()===0);
 R('2 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 3 Europalette und kleine Einwegpalette, tariert/brutto
{const h=await open(b,pickState([mkOrder('K-T3e',2,{type:'euro'}),mkOrder('K-T3s',2,{type:'small',pw:6,bw:0.8,assignee:'Peter'}),mkOrder('K-T3t',2,{type:'small',tared:true,pw:6,bw:0.8,assignee:'Leon'})]));const p=h.p;
 const g=async id=>text(await p.evaluate(id=>{pickPrintReceipt(pickState.orders.find(x=>x.id===id));return window.__lastPrint},id));
 const e=await g('K-T3e'),s=await g('K-T3s'),t=await g('K-T3t');
 R('3 Europalette: Beschriftung und Palettengewicht 25,00 kg',e.includes('Europalette + große Pappbox')&&e.includes('25,00 kg'));
 R('3 Kleine Einwegpalette: Beschriftung und Palettengewicht 6,00 kg',s.includes('Kleine Einwegpalette + kleine Pappbox')&&s.includes('6,00 kg')&&!s.includes('Europalette'));
 R('3 Tariert: Waagenwert = Nettogewicht, Hinweis "tariert"',t.includes('tariert')&&t.includes('Nettogewicht'));
 const exp=sumW(mkItems(2),6,0.8,true);R('3 Tariert: Gewogenes Gewicht korrekt ('+exp.toLocaleString('de-DE')+' kg)',t.includes(exp.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:3})+' kg'));
 R('3 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 4 Lange Aufträge: mehrere A4-Seiten
{const items=mkItems(100,{longNames:true});const h=await open(b,pickState([mkOrder('K-T4',100,{items})]));const p=h.p;
 const html=await p.evaluate(()=>pickSlipHtml(pickState.orders[0]));const r=await pdf(p,html,'lang');
 R('4 100 Positionen: A4 (595×842 pt)',Math.abs(r.w-595.3)<2&&Math.abs(r.h-841.9)<2,r.w+'x'+r.h);
 R('4 100 Positionen: mehrere Seiten ('+r.pages+')',r.pages>=3&&r.pages<=12);
 const pages=r.txt.split('\f').filter(x=>x.trim());
 R('4 Tabellenkopf auf jeder Tabellenseite wiederholt',pages.slice(0,r.pages-1).filter(t=>t.includes('Bezeichnung')).length>=2,pages.map(t=>t.includes('Bezeichnung')?'K':'-').join(''));
 const missing=[];for(let i=1;i<=100;i++)if(!r.txt.includes('ART-'+String(i).padStart(4,'0')))missing.push(i);
 R('4 Alle 100 Positionen im Ausdruck vorhanden, keine abgeschnitten',missing.length===0,missing.join(','));
 R('4 Gewichtskontrolle und Unterschriftsfelder vorhanden',r.txt.includes('Gewichtskontrolle')&&r.txt.includes('Kontrolle / Freigabe'));
 R('4 Navigation/App-Oberfläche nicht im Ausdruck',!/Lagerverwaltung|Meine Aufträge|Auftragsverwaltung/.test(r.txt));
 R('4 Seitennummerierung "Seite x von y" im Ausdruck (Chromium) bzw. Auftragsfuß am Ende',/Seite 1 von \d+/.test(r.txt)||r.txt.includes('Auftrag K-T4'),(/Seite \d+ von \d+/.exec(r.txt)||[''])[0]);
 // UI-Abschluss eines langen Auftrags
 await goPick(p);await p.locator('[data-worker-action="finish"]').click();await p.waitForTimeout(600);
 R('4 Langer Auftrag über UI abschließbar',(await order(p,'K-T4')).status==='Abgeschlossen');
 {const lastPage=pages[pages.length-1];R('4 Letzte Seite: Unterschriften nicht allein (Gewichtskontrolle steht auf derselben Seite)',lastPage.includes('Kontrolle / Freigabe')&&lastPage.includes('Gewichtskontrolle'),lastPage.trim().split('\n').slice(0,3).join(' / '));
  R('4 Unterschriften genau einmal im Dokument',(r.txt.match(/Kontrolle \/ Freigabe/g)||[]).length===1);}
 R('4 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 4b Seitenumbruch-Schleife: bei jeder Positionszahl 1–130 (normale Namen) steht die Unterschrift nie allein auf einer Seite
{const h=await open(b,pickState([mkOrder('K-T4b',1)]));const p=h.p;const bad=[],gaps=[];let maxPages=0;
 for(let n=1;n<=130;n+=(n<40?1:3)){const items=mkItems(n);const html=await p.evaluate(([it])=>pickSlipHtml({id:'K-T4b',lines:it.length,assignee:'Max',status:'Abgeschlossen',finishedAt:'2026-11-12T08:41:00.000Z',items:it,packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:0,tolerancePercent:1}}),[items]);
  const r=await pdf(p,html,'loop');maxPages=Math.max(maxPages,r.pages);const pg=r.txt.split('\f').filter(z=>z.trim());const last=pg[pg.length-1];
  if(!(last.includes('Kontrolle / Freigabe')&&last.includes('Gewichtskontrolle')))bad.push(n);
  const miss=[];for(let i=1;i<=n;i++)if(!r.txt.includes('ART-'+String(i).padStart(4,'0')))miss.push(i);if(miss.length)gaps.push(n);}
 R('4b Unterschrift nie allein auf einer Seite (1–130 Positionen, Schritt 1/3)',bad.length===0,'Problemfälle: '+bad.join(','));
 R('4b Alle Positionen in jedem Lauf vollständig im PDF (max. '+maxPages+' Seiten)',gaps.length===0,gaps.join(','));
 R('4b Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 5 Fehlende optionale Angaben und Altdaten
{const legacy={id:'K-OLD',lines:2,assignee:'Max',status:'Abgeschlossen',finishedAt:'2026-10-01T10:00:00.000Z'};
 const noOpt=mkOrder('K-T5',2,{noStart:true,extra:{status:'Abgeschlossen',finishedAt:'2026-11-01T09:00:00.000Z'}});
 const h=await open(b,pickState([legacy,noOpt],{noDevice:true,session:''}));const p=h.p;
 const lt=text(await p.evaluate(()=>{pickPrintReceipt(pickState.orders.find(x=>x.id==='K-OLD'));return window.__lastPrint}));
 R('5 Altauftrag ohne Positionen/Verpackung: Schein ohne Absturz',lt.includes('K-OLD')&&lt.includes('keine Positionsdaten'));
 R('5 Altauftrag: nichts erfunden (keine Beispielwerte, keine Gewichte)',!/Mustermann|AU-2026|71,40|ART-/.test(lt)&&lt.includes('NICHT GEPRÜFT'));
 const nt=text(await p.evaluate(()=>{pickPrintReceipt(pickState.orders.find(x=>x.id==='K-T5'));return window.__lastPrint}));
 R('5 Ohne Gerät/Startzeit/Bemerkung: Platzhalter "–" bzw. "Keine Bemerkungen erfasst"',nt.includes('Keine Bemerkungen erfasst')&&/Scanner \/ Gerät\s+–/.test(nt)&&/Gestartet\s+–/.test(nt),nt.slice(0,400));
 R('5 Altauftrag wird durch Druck nicht verändert',(await order(p,'K-OLD')).items===undefined&&(await order(p,'K-OLD')).packaging===undefined);
 R('5 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 6 Wiederholtes Drucken ohne Bestandsänderung
{const h=await open(b,pickState([mkOrder('K-T6',3,{extra:{status:'Abgeschlossen',finishedAt:'2026-11-01T09:00:00.000Z',completion:{at:'2026-11-01T09:00:00.000Z',assignee:'Max',device:'Scanner 1'}}})],{session:''}));const p=h.p;
 await p.evaluate(()=>tab('pickAdmin'));await p.waitForTimeout(200);
 const a=await store(p,PK),i=await store(p,SK);
 for(let k=0;k<5;k++){await p.locator('[data-pick-reprint="K-T6"]').click();await p.waitForTimeout(100);}
 R('6 5× Nachdruck: 5 Druckaufrufe',await p.evaluate(()=>window.__prints)===5);
 R('6 5× Nachdruck: Kommissionierdaten byte-identisch',(await store(p,PK))===a);
 R('6 5× Nachdruck: Lagerbestand byte-identisch',(await store(p,SK))===i||i===null);
 R('6 Nachdruck: Abschlusszeit unverändert',(await order(p,'K-T6')).finishedAt==='2026-11-01T09:00:00.000Z');
 R('6 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 7 Mengenabweichung mit/ohne Freigabe
{const it=mkItems(2);it[1].actual=it[1].qty-1;const o=mkOrder('K-T7',2,{items:it});
 const h=await open(b,pickState([o]));const p=h.p;await goPick(p);
 await p.locator('[data-worker-action="finish"]').click();await p.waitForTimeout(300);
 R('7 Mengenabweichung ohne Freigabe: Abschluss verweigert',(await order(p,'K-T7')).status==='In Bearbeitung'&&await p.locator('#pickClosure:not(.hidden)').count()===0,h.dlg.join('|'));
 await p.evaluate(()=>{const o=pickState.orders[0];const d=pickDiscrepancies(o);o.deviation={reason:'Restmenge nicht im Regal',approver:'Leon',approvedAt:'2026-11-12T08:30:00.000Z',signature:JSON.stringify(d)};pickSave()});
 await p.locator('[data-worker-action="finish"]').click();await p.waitForTimeout(400);
 R('7 Mit dokumentierter Freigabe: Abschluss möglich',(await order(p,'K-T7')).status==='Abgeschlossen');
 const t=text(await p.evaluate(()=>window.__lastPrint));
 R('7 Schein zeigt Mengenabweichung, Freigabe, Grund',t.includes('Position 2')&&t.includes('Leon')&&t.includes('Restmenge nicht im Regal'));
 R('7 Abschlussansicht nennt freigegebene Abweichung',(await p.locator('#pickClosure').innerText()).includes('freigegeben'));
 R('7 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 8 Bemerkung, Sonderzeichen/XSS
{const evil='<img src=x onerror="window.__xss=1">';const it=mkItems(1);it[0].name=evil+' & "Quote"';const h=await open(b,pickState([mkOrder('K-T8',1,{items:it})]));const p=h.p;await goPick(p);
 await p.locator('#pick-note').fill('Palette <b>vorsichtig</b> stapeln & "prüfen"');await p.locator('#pick-note').blur();await p.waitForTimeout(300);
 R('8 Bemerkung wird am Auftrag gespeichert',(await order(p,'K-T8')).note==='Palette <b>vorsichtig</b> stapeln & "prüfen"');
 await p.locator('[data-worker-action="finish"]').click();await p.waitForTimeout(400);
 const html=await p.evaluate(()=>window.__lastPrint);
 R('8 Schein enthält Bemerkung maskiert (kein aktives HTML)',html.includes('&lt;b&gt;vorsichtig&lt;/b&gt;')&&!html.includes('<b>vorsichtig</b>'));
 R('8 Artikelname mit HTML wird maskiert, kein Skript ausgeführt',html.includes('&lt;img')&&!await p.evaluate(()=>window.__xss===1));
 R('8 Bemerkung leeren entfernt das Feld',await (async()=>{await p.evaluate(()=>{pickClosureClose();const o=pickState.orders[0];o.status='In Bearbeitung';pickRender()});await p.waitForTimeout(100);await p.locator('#pick-note').fill('');await p.locator('#pick-note').blur();await p.waitForTimeout(200);return (await order(p,'K-T8')).note===undefined})());
 R('8 Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}

// 9 Mobil (iPhone 14, iPad Pro 11) und A4-Layout kurzer Auftrag
for(const dev of ['iPhone 14','iPad Pro 11']){const h=await open(b,pickState([mkOrder('K-T9',6,{longNames:true})]),dev);const p=h.p;await goPick(p);
 const fin=p.locator('[data-worker-action="finish"]');await fin.scrollIntoViewIfNeeded();await fin.tap();await p.waitForTimeout(500);
 R('9 '+dev+': Abschlussansicht erscheint nach Tap',await p.locator('#pickClosure:not(.hidden)').count()===1);
 const m=await p.evaluate(()=>{const c=document.querySelector('.pick-closure-card').getBoundingClientRect();return {cw:c.width,iw:innerWidth,over:document.documentElement.scrollWidth>innerWidth+1,btn:[...document.querySelectorAll('.pick-closure .actions button')].map(b=>Math.round(b.getBoundingClientRect().height))}});
 R('9 '+dev+': Abschlussansicht passt in die Breite, kein Seitenüberlauf',m.cw<=m.iw&&!m.over,JSON.stringify(m));
 R('9 '+dev+': Tap-Ziele ≥44 px',m.btn.every(x=>x>=44),m.btn.join(','));
 await p.locator('[data-closure-action="preview"]').tap();await p.waitForTimeout(200);
 const pv=await p.evaluate(()=>{const e=document.querySelector('.pick-closure-preview');return {vis:!e.classList.contains('hidden'),scroll:e.scrollWidth>=e.clientWidth,txt:e.innerText.includes('K-T9')}});
 R('9 '+dev+': Schein-Vorschau sichtbar (seitlich scrollbar)',pv.vis&&pv.scroll&&pv.txt);
 await p.locator('[data-closure-action="print"]').tap();await p.waitForTimeout(200);
 R('9 '+dev+': Erneut drucken per Tap (2. Druckaufruf)',await p.evaluate(()=>window.__prints)===2);
 await p.locator('[data-closure-action="close"]').tap();R('9 '+dev+': Schließen per Tap',await p.locator('#pickClosure.hidden').count()===1);
 R('9 '+dev+': Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.ctx.close();}
{const h=await open(b,pickState([mkOrder('K-T9b',6)]));const p=h.p;
 const r=await pdf(p,await p.evaluate(()=>pickSlipHtml(pickState.orders[0])),'kurz');
 R('9 A4: kurzer Auftrag (6 Pos.) auf 1 Seite',r.pages===1,r.pages);
 await p.screenshot({path:path.join(TMP,'screen.png')});await h.ctx.close();
 fs.copyFileSync(r.f,path.join(os.tmpdir(),'sa15-kurz.pdf'));}

// 10 Export/Import mit abgeschlossenem Auftrag, Altsicherung weiter importierbar
{const o=mkOrder('K-T10',2,{extra:{status:'Abgeschlossen',finishedAt:'2026-11-01T09:00:00.000Z',note:'Test',completion:{at:'2026-11-01T09:00:00.000Z',assignee:'Max',device:'Scanner 1'}}});
 const h=await open(b,pickState([o],{session:''}));const p=h.p;await p.evaluate(()=>tab('more'));
 const dl=p.waitForEvent('download');await p.evaluate(()=>jsonExport.click());const d=await dl;const f=path.join(TMP,'exp.json');await d.saveAs(f);const exp=JSON.parse(fs.readFileSync(f,'utf8'));
 R('10 Export enthält abgeschlossenen Auftrag mit completion und note',exp._pick.orders[0].completion.device==='Scanner 1'&&exp._pick.orders[0].note==='Test');
 const h2=await open(b,null);await h2.p.evaluate(()=>tab('more'));await h2.p.setInputFiles('#jsonImport',f);await h2.p.waitForTimeout(1500);
 const imp=await h2.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PK);
 R('10 Import stellt Auftrag, Gerät und Bemerkung unverändert wieder her',JSON.stringify(imp.orders[0])===JSON.stringify(exp._pick.orders[0]));
 R('10 Nachdruck nach Import möglich',text(await h2.p.evaluate(()=>{pickPrintReceipt(pickState.orders[0]);return window.__lastPrint})).includes('Scanner 1'));
 const old=JSON.parse(JSON.stringify(exp));delete old._pick.orders[0].completion;delete old._pick.orders[0].note;const fo=path.join(TMP,'alt.json');fs.writeFileSync(fo,JSON.stringify(old));
 const h3=await open(b,null);await h3.p.evaluate(()=>tab('more'));await h3.p.setInputFiles('#jsonImport',fo);await h3.p.waitForTimeout(1500);
 R('10 Sicherung im alten Format (ohne completion/note) importierbar',(await h3.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),PK)).orders[0].id==='K-T10');
 R('10 Keine JavaScript-Fehler',[h,h2,h3].every(x=>x.errs.length===0),[h,h2,h3].map(x=>x.errs.join('|')).join(';'));await h.ctx.close();await h2.ctx.close();await h3.ctx.close();}

// 11 Vorlagen-Platzhalter nie als Daten
{const h=await open(b,pickState([mkOrder('K-T11',2)]));const html=await h.p.evaluate(()=>pickSlipHtml(pickState.orders[0])+JSON.stringify(localStorage));
 R('11 Platzhalter der Vorschau (AU-2026-001458, Max Mustermann, 71,40) kommen nirgends vor',!/AU-2026-001458|Mustermann|71,40/.test(html));await h.ctx.close();}

await b.close();const f=res.filter(r=>!r[1]).length;console.log('GESAMT '+res.length+' Prüfungen / FAIL '+f);process.exit(f?1:0);
})().catch(e=>{console.log('SCRIPTFEHLER',e.stack.slice(0,800));process.exit(2)});
