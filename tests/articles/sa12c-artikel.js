/* SA-12c: Mindestbestandsregel und Überschreibschutz der Artikelverwaltung.  node sa12c-artikel.js http://localhost:8150/index.html */
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const URL=process.argv[2]||'http://localhost:8150/index.html';const res=[];
const R=(id,ok,info)=>{res.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,200):''))};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({acceptDownloads:true,viewport:{width:430,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.goto(URL);await p.waitForTimeout(300);
const snap=()=>p.evaluate(()=>JSON.stringify({i:state.items,b:state.boxes,pl:state.places,q:state.qrMap,c:state.config}));
const raw=()=>p.evaluate(()=>localStorage.getItem('lagerpilot_v2_7'));
const msg=()=>p.evaluate(()=>document.getElementById('aMessage').textContent);
const fill=async(o)=>{await p.evaluate(o=>{const s=(id,v)=>{document.getElementById(id).value=v};s('aName',o.name??'');s('aCode',o.code??'');s('aBarcode',o.barcode??'');s('aUnit',o.unit??'P');s('aPack',o.pack??1);s('aWeight',o.weight??'');s('aMax',o.max??'');s('aMin',o.min??'')},o)};
const save=async()=>{await p.evaluate(()=>document.getElementById('aSave').click());await p.waitForTimeout(60);return msg()};
const edit=async c=>{await p.evaluate(c=>document.querySelector('[data-edit="'+c+'"]').click(),c);await p.waitForTimeout(40)};
await p.evaluate(()=>tab('articles'));
/* Ausgangsdaten: Altartikel mit Bestand, Barcode, Platz (direkt über die App-Transaktion, kein Formular) */
await p.evaluate(()=>{transaction(s=>{s.config={shelf:500,bay:5000,palletMax:1000,tare:1};s.items.push({code:'ALT-1',name:'Altartikel',barcode:'4000000000017',unit:'STK',pack:1,weight:0.5,max:100,min:500},{code:'ALT-2',name:'Zweiter Altartikel',barcode:'',unit:'P',pack:10,weight:2,max:50,min:null});s.boxes.push({id:'B1',place:'H4A-1-1',code:'ALT-1',qty:80,blocked:0},{id:'B2',place:'H4A-1-2',code:'ALT-2',qty:20,blocked:0});s.qrMap['QR-X']='H4A-1-1'})});
await p.evaluate(()=>render());
const base=await snap();
/* 1 Neuanlage */
await fill({name:'Neuer Artikel',code:'NEU-1',barcode:'4000000000024',unit:'STK',pack:1,weight:0.25,max:100,min:500});
let m=await save();
const afterNew=JSON.parse(await snap()),b0=JSON.parse(base);
R('1 Neuanlage eines neuen Artikels: gespeichert',/Artikel gespeichert/.test(m)&&afterNew.i.length===3&&afterNew.i.some(a=>a.code==='NEU-1'&&a.name==='Neuer Artikel'),m);
R('1 Neuanlage: bestehende Artikel, Boxen, Plätze, QR-Zuordnungen und Konfiguration unverändert',JSON.stringify(afterNew.i.slice(0,2))===JSON.stringify(b0.i)&&JSON.stringify(afterNew.b)===JSON.stringify(b0.b)&&JSON.stringify(afterNew.pl)===JSON.stringify(b0.pl)&&JSON.stringify(afterNew.q)===JSON.stringify(b0.q)&&JSON.stringify(afterNew.c)===JSON.stringify(b0.c));
R('1 Formular nach Speichern leer, Neuanlage-Modus (Artikelnummer editierbar)',await p.evaluate(()=>document.getElementById('aCode').value===''&&!document.getElementById('aCode').readOnly&&document.getElementById('aModeHint').classList.contains('hidden')));
/* 4 Mindestbestand > maximale Boxmenge */
R('4 Mindestbestand 500 > max. Boxmenge 100 bei Neuanlage zulässig (kein Fehler, Werte gespeichert)',afterNew.i.find(a=>a.code==='NEU-1').min===500&&afterNew.i.find(a=>a.code==='NEU-1').max===100);
await fill({name:'Mindest-Test',code:'MIN-1',unit:'P',pack:1,max:100,min:500});m=await save();R('4 Beispiel Mindestbestand 500 / Box 100: Meldung „gespeichert“, keine Mindestbestand-Fehlermeldung',/gespeichert/.test(m)&&!/Mindestbestand darf/.test(m),m);
await fill({name:'Min 0',code:'MIN-2',unit:'P',pack:1,max:1,min:0});m=await save();R('4 Mindestbestand 0 bleibt zulässig',/gespeichert/.test(m),m);
await fill({name:'Min negativ',code:'MIN-3',unit:'P',pack:1,max:1,min:-1});m=await save();R('4 Weiterhin geprüft: negativer Mindestbestand abgewiesen',/Mindestbestand muss eine ganze Zahl ab 0/.test(m),m);
await fill({name:'Min Dezimal',code:'MIN-4',unit:'P',pack:1,max:1,min:1.5});m=await save();R('4 Weiterhin geprüft: Mindestbestand mit Dezimalstellen abgewiesen',/ganze Zahl/.test(m),m);
await fill({name:'Max 0',code:'MIN-5',unit:'P',pack:1,max:0,min:5});m=await save();R('4 Weiterhin geprüft: maximale Boxmenge 0 abgewiesen',/Maximale Boxmenge/.test(m),m);
await fill({name:'',code:'MIN-6'});m=await save();R('4 Weiterhin geprüft: fehlende Bezeichnung',/Artikelbezeichnung fehlt/.test(m),m);
await fill({name:'x',code:'',pack:1});m=await save();R('4 Weiterhin geprüft: fehlende Artikelnummer',/Artikelnummer fehlt/.test(m),m);
await fill({name:'x',code:'P-0',pack:0});m=await save();R('4 Weiterhin geprüft: Stück pro Pack 0',/positive ganze Zahl/.test(m),m);
await p.evaluate(()=>document.getElementById('aClear').click());
const afterMin=await snap();
/* 2 Neuanlage mit vorhandener Nummer */
const dupCases=[['ALT-1','exakt'],['alt-1','Kleinschreibung'],['ALT-1  ','Leerzeichen am Ende'],['Alt-1','gemischte Schreibweise'],['NEU-1','vorher neu angelegter Artikel']];
for(const [c,l] of dupCases){const before=await snap(),rb=await raw();await fill({name:'ÜBERSCHREIBT',code:c,barcode:'9999999999999',unit:'P',pack:5,weight:9,max:9,min:9});m=await save();
 R('2 Neuanlage mit vorhandener Artikelnummer ('+l+') abgewiesen, verständliche Meldung',/existiert bereits/.test(m)&&/Bearbeiten/.test(m),m);
 R('2 … Daten und Speicher unverändert ('+l+')',await snap()===before&&await raw()===rb)}
await p.evaluate(()=>document.getElementById('aClear').click());
/* 3 Bearbeiten */
await edit('ALT-1');
R('3 Bearbeitungsmodus: Hinweis sichtbar, Artikelnummer gesperrt, Felder gefüllt',await p.evaluate(()=>{const h=document.getElementById('aModeHint');return !h.classList.contains('hidden')&&/Bearbeitungsmodus: Artikel ALT-1/.test(h.textContent)&&document.getElementById('aCode').readOnly&&document.getElementById('aName').value==='Altartikel'&&document.getElementById('aMin').value==='500'&&document.getElementById('aMax').value==='100'}));
await p.evaluate(()=>{document.getElementById('aName').value='Altartikel (umbenannt)';document.getElementById('aMin').value='800'});
m=await save();const e1=JSON.parse(await snap()),ed=e1.i.find(a=>a.code==='ALT-1');
R('3 Bearbeitung bestehender Artikel: Name und Mindestbestand (800 > Box 100) gespeichert',/Artikel gespeichert/.test(m)&&ed.name==='Altartikel (umbenannt)'&&ed.min===800&&ed.max===100,m);
R('3 Bearbeitung: Barcode, Einheit, Gewicht, Box- und Platzdaten unverändert, kein Duplikat',ed.barcode==='4000000000017'&&ed.unit==='STK'&&ed.weight===0.5&&e1.i.filter(a=>a.code==='ALT-1').length===1&&JSON.stringify(e1.b)===JSON.stringify(b0.b)&&JSON.stringify(e1.pl)===JSON.stringify(b0.pl)&&JSON.stringify(e1.q)===JSON.stringify(b0.q));
R('3 Nach erfolgreichem Bearbeiten wieder Neuanlage-Modus',await p.evaluate(()=>!document.getElementById('aCode').readOnly&&document.getElementById('aCode').value===''));
/* Artikelnummer im Bearbeitungsmodus manipuliert */
await edit('ALT-2');await p.evaluate(()=>{const c=document.getElementById('aCode');c.readOnly=false;c.value='ALT-1';document.getElementById('aName').value='MANIPULIERT'});
let before=await snap();m=await save();R('3 Bearbeitungsmodus ALT-2, Nummer auf ALT-1 manipuliert: abgewiesen, ALT-1 nicht überschrieben',/nicht geändert werden/.test(m)&&await snap()===before,m);
await p.evaluate(()=>document.getElementById('aClear').click());
/* Speicherlogik: Artikel verschwindet während der Bearbeitung */
await edit('ALT-2');await p.evaluate(()=>{transaction(s=>{s.boxes=s.boxes.filter(b=>b.code!=='ALT-2');s.items=s.items.filter(a=>a.code!=='ALT-2')});render()});
before=await snap();await p.evaluate(()=>{document.getElementById('aName').value='Geist'});m=await save();R('5 Speicherlogik: gelöschter Artikel wird beim Speichern nicht neu angelegt',/existiert nicht mehr/.test(m)&&await snap()===before&&!JSON.parse(before).i.some(a=>a.code==='ALT-2'),m);
await p.evaluate(()=>document.getElementById('aClear').click());
/* Zustand im Speicher manipuliert: Bearbeitungscode ohne Artikel */
await p.evaluate(()=>{transaction(s=>{s.items.push({code:'ALT-2',name:'Zweiter Altartikel',barcode:'',unit:'P',pack:10,weight:2,max:50,min:null});s.boxes.push({id:'B2',place:'H4A-1-2',code:'ALT-2',qty:20,blocked:0})});render()});
/* 5 Schutz vorhandener Bestände/Boxen */
const rejects=[['Einheit mit Bestand ändern (STK→P)',{unit:'P'},/Einheit\/Packgröße/],['Packgröße mit Bestand ändern',{pack:5},/Einheit\/Packgröße/],['max. Boxmenge unter Bestand (80 > 50)',{max:50},/Artikeländerung abgelehnt/],['Gewicht und Max bei Bestand löschen',{weight:'',max:''},/dürfen bei vorhandenem Bestand nicht gelöscht/]];
for(const [l,ch,rx] of rejects){await edit('ALT-1');await p.evaluate(ch=>{if('unit' in ch)document.getElementById('aUnit').value=ch.unit;if('pack' in ch)document.getElementById('aPack').value=ch.pack;if('max' in ch)document.getElementById('aMax').value=ch.max;if('weight' in ch)document.getElementById('aWeight').value=ch.weight},ch);before=await snap();m=await save();R('5 '+l+': abgelehnt, Artikel und Boxen unverändert',rx.test(m)&&await snap()===before,m);await p.evaluate(()=>document.getElementById('aClear').click())}
/* Barcode/Platz-Kollisionen bei Neuanlage */
for(const [l,o,rx] of [['Barcode eines vorhandenen Artikels als Artikelnummer',{code:'4000000000017'},/Barcode|zugeordnet/],['Artikelnummer = Lagerplatz',{code:'H4A-1-5'},/Lagerplatz/],['Barcode bereits vergeben',{code:'NEU-9',barcode:'4000000000017'},/Barcode|zugeordnet/]]){before=await snap();await fill({name:'Kollision',unit:'P',pack:1,...o});m=await save();R('2 '+l+': abgewiesen, Daten unverändert',rx.test(m)&&await snap()===before,m);await p.evaluate(()=>document.getElementById('aClear').click())}
/* 7 wiederholtes Speichern */
const hist0=await p.evaluate(()=>state.history.length);let okAll=true,itemsLen0=await p.evaluate(()=>state.items.length);
for(let i=0;i<5;i++){await edit('NEU-1');await p.evaluate(i=>{document.getElementById('aName').value='Neuer Artikel v'+i},i);const mm=await save();if(!/gespeichert/.test(mm))okAll=false}
const fin=JSON.parse(await snap());
R('7 Wiederholtes Bearbeiten (5×): immer gespeichert, Artikelanzahl konstant, keine Duplikate',okAll&&fin.i.length===itemsLen0&&new Set(fin.i.map(a=>a.code.toLowerCase())).size===fin.i.length);
R('7 Wiederholtes Speichern: Bestände/Boxen/Plätze identisch zum Ausgangszustand',JSON.stringify(fin.b.filter(x=>x.id==='B1'))===JSON.stringify(b0.b.filter(x=>x.id==='B1'))&&JSON.stringify(fin.pl)===JSON.stringify(b0.pl)&&JSON.stringify(fin.q)===JSON.stringify(b0.q));
await fill({name:'Doppelklick',code:'DK-1',unit:'P',pack:1});await p.evaluate(()=>{const s=document.getElementById('aSave');s.click();s.click()});await p.waitForTimeout(80);
const dk=await p.evaluate(()=>state.items.filter(a=>a.code==='DK-1').length);R('7 Doppelklick auf „Artikel speichern“ legt genau einen Artikel an',dk===1,dk);
/* 6 Export/Import */
const dl=p.waitForEvent('download');await p.evaluate(()=>document.getElementById('jsonExport').click());const d=await dl;const f=path.join(os.tmpdir(),'sa12c-export.json');await d.saveAs(f);
const exp=JSON.parse(fs.readFileSync(f,'utf8')),cur=JSON.parse(await snap());
R('6 Export enthält Artikel, Boxen, Plätze unverändert (inkl. Altartikel mit Mindestbestand > Boxmenge)',JSON.stringify(exp.items)===JSON.stringify(cur.i)&&JSON.stringify(exp.boxes)===JSON.stringify(cur.b)&&exp.items.find(a=>a.code==='ALT-1').min===800);
await p.evaluate(()=>{transaction(s=>{s.items=s.items.filter(a=>a.code!=='DK-1')});render()});
await p.setInputFiles('#jsonImport',f);await p.waitForTimeout(400);const imp=JSON.parse(await snap());
R('6 Import der Sicherung: Artikel, Boxen, Plätze, QR identisch zum Export',JSON.stringify(imp.i)===JSON.stringify(exp.items)&&JSON.stringify(imp.b)===JSON.stringify(exp.boxes)&&JSON.stringify(imp.pl)===JSON.stringify(exp.places)&&JSON.stringify(imp.q)===JSON.stringify(exp.qrMap));
const dl2=p.waitForEvent('download');await p.evaluate(()=>document.getElementById('jsonExport').click());const d2=await dl2;const f2=path.join(os.tmpdir(),'sa12c-export2.json');await d2.saveAs(f2);const e2=JSON.parse(fs.readFileSync(f2,'utf8'));
R('6 Export → Import → Export: Daten identisch',JSON.stringify(e2.items)===JSON.stringify(exp.items)&&JSON.stringify(e2.boxes)===JSON.stringify(exp.boxes)&&JSON.stringify(e2.places)===JSON.stringify(exp.places)&&JSON.stringify(e2.config)===JSON.stringify(exp.config));
/* Neuanlage nach Import weiterhin geschützt */
await p.evaluate(()=>tab('articles'));before=await snap();await fill({name:'Nach Import',code:'alt-1',unit:'P',pack:1});m=await save();R('2 Nach dem Import: Duplikat-Schutz weiterhin aktiv',/existiert bereits/.test(m)&&await snap()===before,m);
R('8 Keine JavaScript-Fehler',errs.length===0,errs.join('|'));
await b.close();const bad=res.filter(x=>!x).length;console.log('\nGESAMT '+res.length+' Prüfungen / FAIL '+bad);process.exit(bad?1:0)})().catch(e=>{console.log('SCRIPTFEHLER '+e.message);process.exit(2)});
