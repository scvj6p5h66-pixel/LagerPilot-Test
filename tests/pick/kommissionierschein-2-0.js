/* Kommissionierschein 2.0 (IntraBold-Layout): echte PDF-Ausdrucke, Seitenzahl, Inhalte, Summen, Toleranz.
   Aufruf: node tests/pick/kommissionierschein-2-0.js http://localhost:8123/   (benötigt pdfinfo/pdftotext/pdftoppm; ändert weder App noch Repository)
   Emulation ersetzt keinen Druck auf echten Geräten (iPhone Safari/AirPrint). Exit-Code 0 = alles bestanden. */
const {chromium,devices}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');const {execFileSync}=require('child_process');
const BASE=(process.argv[2]||'http://localhost:8123/').replace(/index\.html.*$/,''),PORTAL=BASE+'index.html?portal=mitarbeiter',TMP=process.env.SLIP_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'slip20-'));fs.mkdirSync(TMP,{recursive:true});
const res=[];const R=(id,ok,info)=>{res.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,240):''))};
const de=(n,min=2,max=3)=>n.toLocaleString('de-DE',{minimumFractionDigits:min,maximumFractionDigits:max});
async function pdf(p,html,name,opt={}){await p.evaluate(h=>{document.getElementById('pickPrint').innerHTML=h},html);const st=opt.css?await p.addStyleTag({content:opt.css}):null;await p.emulateMedia({media:'print'});const f=path.join(TMP,name+'.pdf');await p.pdf({path:f,format:'A4',printBackground:true,preferCSSPageSize:true,scale:opt.scale||1});if(st)await st.evaluate(e=>e.remove());
 const fonts=await p.evaluate(()=>{const o=[];document.querySelectorAll('#pickPrint .slip *').forEach(e=>{if(e.children.length===0&&e.textContent.trim()){o.push(parseFloat(getComputedStyle(e).fontSize)*0.75)}});return o});
 await p.emulateMedia({media:'screen'});const info=execFileSync('pdfinfo',[f]).toString();const pages=Number(/Pages:\s+(\d+)/.exec(info)[1]);const size=/Page size:\s+([\d.]+) x ([\d.]+)/.exec(info);
 const pt=[];for(let i=1;i<=pages;i++)pt.push(execFileSync('pdftotext',['-f',String(i),'-l',String(i),'-layout',f,'-']).toString());
 return {f,pages,w:+size[1],h:+size[2],pt,txt:pt.join('\n'),minPt:Math.min(...fonts)}}
const mk=(n,o={})=>{const items=o.items||Array.from({length:n},(_,i)=>({sku:'ART-'+String(i+1).padStart(4,'0'),name:o.long?'Sehr lange Artikelbezeichnung mit vielen Wörtern und Sonderzeichen äöüß / Position '+(i+1)+' – Zusatz zur Prüfung des Zeilenumbruchs':'Artikel '+(i+1),place:'H4B-'+(1+i%18)+'-'+(1+(i*7)%162),qty:2+(i%5),actual:2+(i%5),unitWeight:0.5+(i%4)*0.25}));
 const pw=o.pw??24,bw=o.bw??1.4,net=items.reduce((s,x)=>s+x.actual*x.unitWeight,0),exp=net+pw+bw;
 return {id:o.id||'T-'+n,lines:items.length,assignee:'Max',status:'Abgeschlossen',startedAt:'2026-11-12T08:00:00.000Z',finishedAt:'2026-11-12T09:00:00.000Z',items,note:o.note||'',checkedLines:items.map((_,i)=>i),scannedLines:items.map((_,i)=>i),
  completion:{at:'2026-11-12T09:00:00.000Z',assignee:'Max',device:'Scanner 1'},packaging:{type:o.small?'small':'euro',scaleMode:'gross',palletWeight:pw,boxWeight:bw,measuredWeight:o.measured??Math.round(exp*1000)/1000,tolerancePercent:o.tol??2},_exp:exp,_net:net}};
(async()=>{const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1100,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{window.print=()=>{window.__lastPrint=document.getElementById('pickPrint').innerHTML}});await p.goto(BASE+'index.html');await p.waitForTimeout(300);
 /* 1: echter Demo-Ablauf bis zum Schein */
 const dctx=await b.newContext({...devices['iPhone 14']});const dp=await dctx.newPage();const derrs=[];dp.on('pageerror',e=>derrs.push(e.message));dp.on('dialog',d=>d.accept());await dp.addInitScript(()=>{window.print=()=>{window.__prints=(window.__prints||0)+1}});
 await dp.goto(PORTAL);await dp.waitForTimeout(400);await dp.locator('[data-portal-name="Max"]').tap();await dp.locator('#portalLoginBtn').tap();await dp.waitForTimeout(250);
 await dp.locator('#portalDemoStart').tap();await dp.locator('[data-demo-pack="small"]').tap();await dp.locator('[data-demo-act="begin"]').tap();
 for(let i=0;i<4;i++){await dp.locator('[data-demo-act="scan"]').tap();await dp.locator('[data-demo-act="scan"]').tap();await dp.locator('[data-demo-act="confirm"]').tap();await dp.waitForTimeout(80)}
 await dp.locator('[data-demo-act="weigh-ok"]').tap();await dp.waitForTimeout(100);await dp.locator('[data-demo-act="finish"]').tap();await dp.waitForTimeout(300);
 const mobOver=await dp.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 const demoOrder=await dp.evaluate(()=>JSON.parse(JSON.stringify(demo.order)));const html=await dp.evaluate(()=>pickSlipHtml(demo.order));
 const r=await pdf(p,html,'demo4');
 R('1 Demo-Schein (4 Positionen, kleine Palette): exakt 1 A4-Seite (Hochformat)',r.pages===1&&Math.abs(r.w-595)<3&&Math.abs(r.h-842)<3,r.pages+' Seite(n) '+r.w+'x'+r.h+' pt');
 const net=demoOrder.items.reduce((s,x)=>s+x.actual*x.unitWeight,0),pk=demoOrder.packaging,gross=net+pk.palletWeight+pk.boxWeight,qty=demoOrder.items.reduce((s,x)=>s+x.actual,0);
 const T=r.txt;
 R('1 Kopf: IntraBold, Titel, Status',T.includes('INTRABOLD')&&T.includes('Kommissionierschein')&&T.includes('ABGESCHLOSSEN'));
 R('1 Auftragsinfos: Nr., Datum, Mitarbeiter, Scanner, Positionen, Ladungsträger',['DEMO-0001','Abschlussdatum','Max','Scanner 1','Positionen','Kleine Einwegpalette +'].every(x=>T.toLowerCase().includes(x.toLowerCase()))&&T.includes('kleine Pappbox'));
 R('1 Tabellenspalten vollständig',['Pos.','Artikelnr.','Bezeichnung','Lagerplatz','Soll','Ist','kg/Stk.','Gewicht'].every(x=>T.includes(x)));
 R('1 Vier Positionen mit vollständigen Bezeichnungen',demoOrder.items.every(it=>it.sku&&T.includes(it.sku)&&T.includes(it.place))&&['Sechskantschraube','M8×40','verzinkt','(Beutel','50','Stk.)','Kabelbinder','300×4,8','100','Rillenkugellager','6204-2RS','Leitungsschutzschalter','B16','1-polig'].every(w=>T.includes(w)));
 R('1 Summenzeile: Stückzahl '+qty+' und Warengewicht '+de(net)+' kg aus Auftragsdaten',T.includes('Summe (4 Positionen)')&&T.includes(String(qty))&&T.includes(de(net)+' kg'),de(net));
 R('1 Gewichtskontrolle: Ware/Palette/Box/Brutto/Gewogen/Differenz/Toleranz/Ergebnis',['Warengewicht',de(pk.palletWeight)+' kg',de(pk.boxWeight)+' kg','Berechnetes Bruttogewicht',de(gross)+' kg','Tatsächlich gewogenes Gewicht','Differenz','Zulässige Toleranz','BESTANDEN'].every(x=>T.includes(x)),de(gross));
 const tolKg=de(gross*pk.tolerancePercent/100,2,2);
 R('1 Toleranz exakt aus den Auftragsdaten: ± 2 % (± '+tolKg+' kg), NICHT ±2 kg',/±\s*2\s*%/.test(T)&&T.replace(/\s+/g,' ').includes('± '+tolKg+' kg')&&!/±\s*2\s*kg/.test(T),(T.match(/Zulässige Toleranz.*/)||[''])[0]);
 R('1 Bemerkungen, zwei Unterschriftsfelder, Fußzeile mit Seitenzahl',T.includes('Bemerkungen')&&T.includes('DEMO-KOMMISSIONIERUNG')&&T.includes('Kommissionierer: Max')&&T.includes('Kontrolle / Freigabe')&&T.includes('Seite 1 von 1')&&T.includes('IntraBold LagerPilot'));
 R('1 Schriftgröße: kleinste Schrift '+r.minPt.toFixed(1)+' pt (Fließtext/Tabelle ≥ 9 pt, kleinste Beschriftungen ≥ 8 pt)',r.minPt>=8,r.minPt.toFixed(2));
 execFileSync('pdftoppm',['-r','110','-png','-singlefile',r.f,path.join(TMP,'demo4')]);
 /* 2: Euro-Palette-Variante und weitere Ladungsträger */
 const e=mk(4,{id:'E-4'}); const re=await pdf(p,await p.evaluate(o=>pickSlipHtml(o),e),'euro4');R('2 Vier Positionen, Europalette: 1 Seite',re.pages===1,re.pages);
 /* 2b: iOS-Safari/AirPrint-Befund (Echtgerät 21:02): Safari druckt sichtbar vergrößert (Layoutbreite kleiner als Papierbreite). Nachgestellt über Druckskalierung; der alte Stand 2f7cb89 brach ab 120 % in 2 Seiten (Tabelle | Gewichtskontrolle). */
 for(const sc of [1.2,1.3,1.4]){const rs=await pdf(p,await p.evaluate(o=>pickSlipHtml(o),mk(4,{id:'S-4',small:true})),'safari4_'+sc,{scale:sc});
  R('2b iOS-Skalierung '+Math.round(sc*100)+' %: 4 Positionen = 1 Seite, Tabelle + Gewichtskontrolle + Unterschriften zusammen',rs.pages===1&&rs.pt[0].includes('Artikelnr.')&&rs.pt[0].includes('Gewichtskontrolle')&&rs.pt[0].includes('Unterschrift'),rs.pages)}
 R('2b Spaltenbreiten über colgroup in Prozent (unabhängig von Layoutbreite)',/<colgroup>(<col style="width:\d+%">){8}<\/colgroup>/.test(await p.evaluate(o=>pickSlipHtml(o),mk(1))));
 /* 3: Seitenumbrüche */
 for(const n of [8,15,30]){const o=mk(n,{id:'N-'+n}),rn=await pdf(p,await p.evaluate(x=>pickSlipHtml(x),o),'n'+n);
  const last=rn.pt[rn.pt.length-1];const heads=rn.pt.every(t=>!t.includes('ART-')||t.includes('Artikelnr.'));
  R('3 '+n+' Positionen: '+rn.pages+' Seite(n), jede Seite mit Inhalt und Tabellenkopf, letzte Seite mit Summe/Gewichtskontrolle/Unterschriften',(n<=15?rn.pages<=2:rn.pages<=3)&&heads&&rn.pt.every(t=>t.trim().length>80)&&rn.txt.includes('Summe ('+n+' Positionen)')&&last.includes('Gewichtskontrolle')&&last.includes('Unterschrift')&&rn.txt.includes('Seite '+rn.pages+' von '+rn.pages),'Seiten '+rn.pages);
  R('3 '+n+' Positionen: alle Positionen vorhanden, kein abgeschnittener Inhalt',Array.from({length:n},(_,i)=>'ART-'+String(i+1).padStart(4,'0')).every(s=>rn.txt.includes(s)));
  R('3 '+n+' Positionen: Summe Warengewicht '+de(o._net)+' kg und Brutto '+de(o._exp)+' kg korrekt',rn.txt.includes(de(o._net)+' kg')&&rn.txt.includes(de(o._exp)+' kg'));
  R('3 '+n+' Positionen: Gewichtskontrolle nicht von Seitenumbruch zerrissen (Titel, Ergebnis, Unterschriften auf derselben Seite)',last.includes('Gewichtskontrolle')&&last.includes('BESTANDEN')&&last.includes('Unterschrift')&&last.includes('Bemerkungen'));
  execFileSync('pdftoppm',['-r','60','-png','-f','1','-l','1','-singlefile',rn.f,path.join(TMP,'n'+n)])}
 /* 4: lange Bezeichnungen */
 const lo=mk(8,{long:true,id:'L-8'}),rl=await pdf(p,await p.evaluate(x=>pickSlipHtml(x),lo),'lang');
 const flat=rl.txt.replace(/\s+/g,' ');R('4 Lange Bezeichnungen: vollständig lesbar (Wörter erhalten, nichts abgeschnitten)',lo.items.every((it,i)=>{const words=it.name.split(' ');return words.every(w=>flat.includes(w))})&&/Zusatz.*Zeilenumbruchs/.test(flat)&&rl.pages>=1);
 /* 5: Gewichtskontrolle bestanden/nicht bestanden + keine festen Beispielwerte */
 const ok=mk(4,{id:'P-OK',measured:undefined});const rok=await pdf(p,await p.evaluate(x=>pickSlipHtml(x),ok),'ok');
 const bad=mk(4,{id:'P-BAD',measured:Math.round(ok._exp*1.05*1000)/1000});const rbad=await pdf(p,await p.evaluate(x=>pickSlipHtml(x),bad),'bad');
 R('5 Bestanden: „BESTANDEN“, nicht „NICHT BESTANDEN“',/BESTANDEN/.test(rok.txt)&&!/NICHT BESTANDEN/.test(rok.txt));
 R('5 Nicht bestanden (+5 %): „NICHT BESTANDEN“, Differenz +5 % ausgewiesen',/NICHT BESTANDEN/.test(rbad.txt)&&/\+[\d,]+ kg \(5 %\)/.test(rbad.txt.replace(/\s+/g,' ')),(rbad.txt.match(/Differenz.*/)||[''])[0]);
 R('5 Beide Fälle bleiben auf 1 Seite',rok.pages===1&&rbad.pages===1);
 const o2=mk(4,{id:'V-1',pw:6.5,bw:0.8,tol:5});const r2=await pdf(p,await p.evaluate(x=>pickSlipHtml(x),o2),'tol5');
 R('5 Keine festen Werte: andere Toleranz (5 %) und andere Gewichte erscheinen im Ausdruck',/±\s*5\s*%/.test(r2.txt)&&r2.txt.includes(de(o2._exp)+' kg')&&!/±\s*2\s*%/.test(r2.txt));
 const dev=mk(4,{id:'D-1'});dev.items[1].actual=dev.items[1].qty-1;dev.deviation={reason:'Demo: Freigabe zum Test',approver:'Peter',approvedAt:'2026-11-12T09:00:00.000Z',signature:JSON.stringify([{index:1,expected:dev.items[1].qty,actual:dev.items[1].actual}])};dev.packaging.measuredWeight=null;
 const rd=await pdf(p,await p.evaluate(x=>pickSlipHtml(x),dev),'dev');R('5 Mengenabweichung wird in Bemerkungen ausgewiesen, Schein bleibt auf 1 Seite',rd.txt.includes('Mengenabweichungen')&&rd.txt.includes('Position 2')&&rd.pages===1,rd.pages);
 /* 6: Druckansicht unter iPhone-Emulation (echter App-Druckpfad) und Desktop */
 const ip=await dp.evaluate(()=>{pickPrintReceipt(demo.order);return document.getElementById('pickPrint').innerHTML.length});
 await dp.emulateMedia({media:'print'});const f=path.join(TMP,'iphone.pdf');await dp.pdf({path:f,format:'A4',printBackground:true,preferCSSPageSize:true});await dp.emulateMedia({media:'screen'});
 const ipPages=Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo',[f]).toString())[1]);R('6 Druck aus der iPhone-Emulation (App-Druckpfad pickPrintReceipt): 1 A4-Seite, window.print aufgerufen',ipPages===1&&ip>0&&(await dp.evaluate(()=>window.__prints))>=1,ipPages);
 R('6 Normale mobile Ansicht: kein seitlicher Überlauf nach Abschluss (iPhone 14)',!mobOver);
 R('7 Keine JavaScript-Fehler',errs.length===0&&derrs.length===0,errs.concat(derrs).join('|'));
 await b.close();const bad2=res.filter(x=>!x).length;console.log('\nPDF/PNG-Ausgaben: '+TMP);console.log('GESAMT '+res.length+' Prüfungen / FAIL '+bad2);process.exit(bad2?1:0)})().catch(e=>{console.log('SCRIPTFEHLER '+e.message);process.exit(2)});
