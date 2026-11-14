/* SA-12c Abschlussprüfung: gleichzeitige Bearbeitung in zwei Browser-Tabs (ein Browser-Kontext = gemeinsamer localStorage).
   node sa12c-zwei-tabs.js http://localhost:8150/index.html */
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const URL=process.argv[2]||'http://localhost:8150/index.html';const res=[];
const R=(id,ok,info)=>{res.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,230):''))};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({acceptDownloads:true,viewport:{width:430,height:900}});const errs=[];
const A=await ctx.newPage(),B=await ctx.newPage();for(const p of [A,B]){p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept())}
await A.goto(URL);await A.evaluate(()=>localStorage.clear());await A.goto(URL);await A.waitForTimeout(300);
const seed=()=>A.evaluate(()=>{transaction(s=>{s.config={shelf:500,bay:5000,palletMax:1000,tare:1};s.items.push({code:'ALT-1',name:'Altartikel',barcode:'4000000000017',unit:'STK',pack:1,weight:0.5,max:100,min:500},{code:'ALT-2',name:'Zweiter',barcode:'',unit:'P',pack:10,weight:2,max:50,min:null});s.boxes.push({id:'B1',place:'H4A-1-1',code:'ALT-1',qty:80,blocked:0})})});
const raw=p=>p.evaluate(()=>localStorage.getItem('lagerpilot_v2_7')),st=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')));
const msg=p=>p.evaluate(()=>document.getElementById('aMessage').textContent);
const fill=(p,o)=>p.evaluate(o=>{const s=(id,v)=>{document.getElementById(id).value=v};for(const [k,v] of Object.entries(o))s(k,v)},o);
const save=async p=>{await p.evaluate(()=>document.getElementById('aSave').click());await p.waitForTimeout(80);return msg(p)};
const edit=async(p,c)=>{await p.evaluate(()=>tab('articles'));await p.evaluate(c=>document.querySelector('[data-edit="'+c+'"]').click(),c);await p.waitForTimeout(40)};
const reset=async()=>{await A.evaluate(()=>localStorage.clear());await A.goto(URL);await A.waitForTimeout(250);await seed();await B.goto(URL);await B.waitForTimeout(250)};
/* Szenario 1: gleicher Artikel, A speichert zuerst, B veraltet */
await reset();await edit(A,'ALT-1');await edit(B,'ALT-1');
await fill(A,{aName:'Name von Tab A',aMin:'600'});let mA=await save(A);
const afterA=await raw(A);
R('1 Tab A speichert Änderung am Artikel',/gespeichert/.test(mA)&&(JSON.parse(afterA).items.find(a=>a.code==='ALT-1').name==='Name von Tab A'),mA);
R('1 Tab B bekommt über das Storage-Ereignis einen Hinweis „Daten geändert“ (Banner sichtbar)',await B.evaluate(()=>!document.getElementById('inventoryStaleBanner').classList.contains('hidden')),await B.evaluate(()=>document.getElementById('inventoryStaleBanner').textContent.slice(0,120)));
await fill(B,{aName:'Name von Tab B (veraltet)',aMax:'90'});let mB=await save(B);
R('1 Tab B speichert veraltete Version: wird ABGEWIESEN (kein stilles Überschreiben)',/anderen Tab|NICHT gespeichert/.test(mB),mB);
R('1 Speicher nach B-Versuch byteidentisch mit dem Stand nach Tab A (Änderung von A bleibt erhalten)',await raw(B)===afterA);
const itB=await B.evaluate(()=>state.items.find(a=>a.code==='ALT-1'));
R('1 Hinweis zur Anzeige: Tab B zeigt weiterhin die alte Version bis zum Neuladen (nur Anzeige, nicht gespeichert)',itB.name==='Altartikel',itB.name);
await B.reload();await B.waitForTimeout(250);await edit(B,'ALT-1');
R('1 Nach Neuladen sieht Tab B die Änderung von A (Name „Name von Tab A“, Min 600)',await B.evaluate(()=>document.getElementById('aName').value==='Name von Tab A'&&document.getElementById('aMin').value==='600'));
await fill(B,{aMax:'90'});mB=await save(B);const fB=await st(B).then(s=>s.items.find(a=>a.code==='ALT-1'));
R('1 Danach kann Tab B speichern, ohne die Änderung von A zu verlieren',/gespeichert/.test(mB)&&fB.name==='Name von Tab A'&&fB.min===600&&fB.max===90,mB);
/* Szenario 2: anderer Artikel in B (kein fachlicher Konflikt) */
await reset();await edit(B,'ALT-2');await edit(A,'ALT-1');await fill(A,{aName:'A ändert ALT-1'});await save(A);const r2=await raw(A);
await fill(B,{aName:'B ändert ALT-2'});mB=await save(B);
R('2 Veralteter Tab B ändert anderen Artikel: abgewiesen (grobe Sperre) – Daten von A unverändert',/anderen Tab/.test(mB)&&await raw(B)===r2,mB);
/* Szenario 3: beide legen denselben neuen Artikel an */
await reset();await A.evaluate(()=>tab('articles'));await B.evaluate(()=>tab('articles'));
await fill(A,{aName:'Neu von A',aCode:'DUP-1',aUnit:'P',aPack:'1'});await fill(B,{aName:'Neu von B',aCode:'DUP-1',aUnit:'P',aPack:'1'});
await save(A);const r3=await raw(A);mB=await save(B);const s3=await st(B);
R('3 Beide legen „DUP-1“ an: B wird abgewiesen, genau ein Artikel „Neu von A“',/anderen Tab|existiert bereits/.test(mB)&&s3.items.filter(a=>a.code==='DUP-1').length===1&&s3.items.find(a=>a.code==='DUP-1').name==='Neu von A'&&await raw(B)===r3,mB);
/* Szenario 4: andere Schreibpfade im veralteten Tab: Warenbewegung */
await reset();await A.evaluate(()=>tab('articles'));await fill(A,{aName:'A neu',aCode:'NEU-A',aUnit:'P',aPack:'1'});await save(A);const r4=await raw(A);
const bk=await B.evaluate(()=>{try{const copy=structuredClone(state);const bx=copy.boxes.find(x=>x.id==='B1');bx.qty+=5;persist(copy);return 'gespeichert'}catch(e){return e.message}});
R('4 Veralteter Tab B bucht Bestand (persist): abgewiesen, Bestand unverändert',/anderen Tab/.test(bk)&&await raw(B)===r4,bk);
/* Szenario 5: Import im veralteten Tab (Wiederherstellen einer Sicherung ersetzt bewusst alles) */
await reset();await edit(A,'ALT-1');await fill(A,{aName:'A-Änderung vor Import'});await save(A);
const dl=B.waitForEvent('download');await B.evaluate(()=>document.getElementById('jsonExport').click());const d=await dl;const f=path.join(os.tmpdir(),'sa12c-zt-export.json');await d.saveAs(f);
await B.reload();await B.waitForTimeout(250);await edit(A,'ALT-2');await fill(A,{aName:'A-Änderung nach Export'});await save(A);
// AP5.5a: Import im veralteten Tab wird sicher abgebrochen (nichts verändert, keine Sicherung); erst nach Neuladen ersetzt der Import den Stand bewusst.
const rawBeforeStale=await raw(A);await B.setInputFiles('#jsonImport',f);await B.waitForTimeout(500);const staleMsg=await B.evaluate(()=>document.getElementById('backupMessage')?.textContent||'');
R('5a Import im veralteten Tab B: sicher abgebrochen (Meldung „anderen Tab geändert“), Hauptstand inkl. A-Änderung byte-gleich, keine „vor Import“-Sicherung',/anderen Tab geändert/.test(staleMsg)&&await raw(A)===rawBeforeStale&&(await B.evaluate(()=>localStorage.getItem('lagerpilot_before_import')))===null,staleMsg.slice(0,100));
await B.reload();await B.waitForTimeout(300);await B.setInputFiles('#jsonImport',f);await B.waitForTimeout(500);await B.waitForLoadState();await B.waitForTimeout(300);const s5=await st(B);const bi=await B.evaluate(()=>localStorage.getItem('lagerpilot_before_import'));
R('5 Import einer älteren Sicherung im Tab B ersetzt den Stand bewusst (A-Änderung nach Export geht aus dem Hauptstand), aber „vor Import“-Sicherung enthält sie',s5.items.find(a=>a.code==='ALT-2').name==='Zweiter'&&bi&&JSON.parse(bi).items?.find?.(a=>a.code==='ALT-2')?.name==='A-Änderung nach Export'||(bi&&bi.includes('A-Änderung nach Export')),bi?('before_import vorhanden, '+bi.length+' Zeichen'):'keine before_import-Sicherung');
R('6 Keine JavaScript-Fehler',errs.length===0,errs.join('|'));
await b.close();const bad=res.filter(x=>!x).length;console.log('\nGESAMT '+res.length+' Prüfungen / FAIL '+bad);process.exit(bad?1:0)})().catch(e=>{console.log('SCRIPTFEHLER '+e.message);process.exit(2)});
