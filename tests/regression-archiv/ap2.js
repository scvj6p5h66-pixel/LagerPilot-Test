const {open}=require('./lib');const fs=require('fs');const {chromium}=require('playwright');
const D='/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad/t/';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1';
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const clk=(p,id)=>p.evaluate(id=>document.getElementById(id).click(),id);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,240),id);
const base=async()=>{const h=await open();const s=await h.ev(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')));await h.b.close();return s};
(async()=>{
const B=await base();
const A1={code:'A1',name:'Art1',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null};
// ===== 1 Scanner
let h=await open();let {p}=h;
await h.go('articles');for(const [k,v] of Object.entries({aName:'Art1',aCode:'A1',aBarcode:'BC1',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'100',aMin:'2'}))await setf(p,k,v);await clk(p,'aSave');
await h.go('scan');
for(const k of ['constructor','__proto__','toString','hasOwnProperty','valueOf','prototype','isPrototypeOf']){
 await setf(p,'scanInput',k);await clk(p,'scanLookup');const m=await txt(p,'scanResult');
 R('1 Scan "'+k+'" -> unbekannt, kein Fehler',/Unbekannter Code/.test(m)&&!/function|object Object/.test(m)&&h.errs.length===0,m.slice(0,80)+' errs='+h.errs.length);h.errs.length=0;}
// Mapping versuchen
for(const k of ['__proto__','constructor']){await setf(p,'scanInput',k);await clk(p,'scanLookup');await p.evaluate(()=>{const s=document.getElementById('scanMapPlace');s.value=s.options[3].value});await clk(p,'scanMapSave');
 const m=await txt(p,'scanResult');R('1 QR-Zuordnung "'+k+'": sinnvolle Ablehnung, qrMap unverändert',Object.keys(await h.ev(()=>state.qrMap)).length===0&&!/bereits zugeordnet/.test(m),m.slice(0,100));}
// normaler QR
await setf(p,'scanInput','QR-77');await clk(p,'scanLookup');await p.evaluate(()=>{const s=document.getElementById('scanMapPlace');s.value='H4A-3-3'});await clk(p,'scanMapSave');
R('1 Normaler QR wird zugeordnet',(await h.ev(()=>state.qrMap['QR-77']))==='H4A-3-3',await txt(p,'scanResult'));
await setf(p,'scanInput','QR-77');await clk(p,'scanLookup');R('1 Normaler QR wird erkannt',/Lagerplatz erkannt: H4A-3-3/.test(await txt(p,'scanResult')));
await h.go('scan');await setf(p,'scanInput','h4a-1-2');await clk(p,'scanLookup');R('1 Expliziter Platzcode (klein) erkannt',/H4A-1-2/.test(await txt(p,'scanResult')));
await setf(p,'scanInput','BC1');await clk(p,'scanLookup');R('1 Artikelbarcode erkannt',/Artikel erkannt/.test(await txt(p,'scanResult')));
await setf(p,'scanInput','QR-konstruktor-constructor-1');await clk(p,'scanLookup');R('1 Code mit Teilwort "constructor" normal behandelt',/Unbekannter Code/.test(await txt(p,'scanResult')));
// andere Platzfelder
await h.go('book');await setf(p,'bookArticle','A1');await setf(p,'bookAction','in');await setf(p,'bookQty','1');
for(const k of ['constructor','__proto__','toString']){await setf(p,'bookPlace',k);await clk(p,'bookSubmit');const m=await txt(p,'bookMessage');R('1 Buchen Platz "'+k+'"',/Unbekannter Lagerplatz: (constructor|__proto__|toString)/.test(m)&&!/function|object Object/.test(m),m.slice(0,80));}
await h.go('inventory');for(const k of ['constructor','__proto__']){await setf(p,'invPlace',k);await setf(p,'invArticle','A1');await setf(p,'invQty','1');await clk(p,'invCompare');const m=await txt(p,'invResult');R('1 Inventur Platz "'+k+'"',!/function|object Object/.test(m),m.slice(0,80));}
await h.go('more');await setf(p,'lockPlace','constructor');await clk(p,'lockSave');R('1 Sperren Platz "constructor"',/existiert nicht/.test(await txt(p,'lockMessage')));
// Kommissionier-Scan
await h.ev(()=>{simulation={occupied:50,reserved:0};pickState.testStatus.Max=true;pickSave();render()});
await h.go('pickAdmin');await h.setv('select[data-pick-to="K-1042"]','Max');await h.click('button[data-pick-assign="K-1042"]');await h.go('picking');await h.setv('#pickEmployee','Max');await h.click('#pickLogin');await h.go('pickAdmin');await h.click('button[data-pick-progress="K-1042"]');await h.go('picking');
await h.ev(()=>{pickScanIndex=0;pickScanPhase='place'});
for(const k of ['constructor','__proto__']){await setf(p,'pickScanInput',k);await clk(p,'pickScanSubmit');const m=await p.evaluate(()=>pickScanMessage.textContent.trim());R('1 Pick-Scan Platz "'+k+'" ohne Funktionstext',/Falscher Lagerplatz/.test(m)&&!/function|object Object/.test(m),m.slice(0,110));}
await setf(p,'pickScanInput','H4B-1-1');await clk(p,'pickScanSubmit');R('1 Pick-Scan korrekter Platz',/bestätigt/.test(await p.evaluate(()=>pickScanMessage.textContent)));
R('1 JS-Fehler Scanner',h.errs.length===0,h.errs.join('|'));await h.b.close();

// ===== Import-Helfer
async function tryImport(name,obj,{expectOk,raw}={}){const hh=await open({acceptDownloads:true});await hh.ev(()=>{transaction(s=>{s.items.push({code:'KEEP',name:'K',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})})});
 const before=await ls(hh.p,K);const f=D+'ap2_'+name.replace(/\W+/g,'_')+'.json';fs.writeFileSync(f,raw??JSON.stringify(obj));
 await hh.go('more');await hh.p.setInputFiles('#jsonImport',f);await hh.p.waitForTimeout(1300);
 const after=await ls(hh.p,K);const m=await txt(hh.p,'backupMessage');const changed=after!==before;
 const locked=await hh.ev(()=>storageLocked);
 R('Import '+name+' -> '+(expectOk?'angenommen':'abgelehnt'),expectOk?(changed&&!locked):(!changed),'msg='+m.slice(0,90)+' locked='+locked+' errs='+hh.errs.length);
 const errs=hh.errs.slice();await hh.b.close();return errs;}
const mk=f=>{const s=structuredClone(B);f(s);return s};
// ===== 2 Config
for(const [n,c,ok] of [['cfg shelf string',{shelf:'abc',bay:null,palletMax:null,tare:null},false],['cfg negative',{shelf:800,bay:null,palletMax:-5,tare:null},false],['cfg leer {}',{},false],['cfg Teil (nur shelf)',{shelf:800},false],['cfg tare string',{shelf:800,bay:null,palletMax:null,tare:'1'},false],['cfg true',{shelf:true,bay:null,palletMax:null,tare:null},false],['cfg Array',[800],false],['cfg gültig Zahlen',{shelf:800,bay:2000,palletMax:1000,tare:25},true],['cfg gültig nulls',{shelf:800,bay:null,palletMax:null,tare:null},true],['cfg 0-Werte',{shelf:0,bay:0,palletMax:0,tare:0},true]])await tryImport(n,mk(s=>{s.config=c}),{expectOk:ok});
await tryImport('cfg shelf null',mk(s=>{s.config={shelf:null,bay:null,palletMax:null,tare:null}}),{expectOk:true});
// ===== 3 min
for(const [n,m,ok] of [['min "abc"','abc',false],['min 1.5',1.5,false],['min -1',-1,false],['min 5',5,true],['min 0',0,true],['min null',null,true],['min undefined',undefined,true],['min "5"','5',false]]){await tryImport(n,mk(s=>{s.items=[{...A1,min:m}];if(m===undefined)delete s.items[0].min}),{expectOk:ok});}
// ===== 4 Doppelte Boxen
const bx=(id,pl,c,q,b=0)=>({id,place:pl,code:c,qty:q,blocked:b});
await tryImport('Duplikat gleicher Platz+Artikel',mk(s=>{s.items=[A1];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',3)]}),{expectOk:false});
await tryImport('Zwei Artikel gleicher Platz (Mischpalette)',mk(s=>{s.items=[A1,{...A1,code:'A2'}];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A2',3)]}),{expectOk:true});
await tryImport('Gleicher Artikel verschiedene Plätze',mk(s=>{s.items=[A1];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-2','A1',3)]}),{expectOk:true});
await tryImport('Teilgesperrte Box',mk(s=>{s.items=[A1];s.boxes=[bx('b1','H4A-1-1','A1',5,2)]}),{expectOk:true});
// ===== 5 Historie/Protokolle
const H=n=>Array.from({length:n},(_,i)=>({at:new Date().toISOString(),text:'h'+i}));
const L=n=>Array.from({length:n},(_,i)=>({at:new Date().toISOString(),place:'H4A-1-1',code:'A1',before:i%5,count:i%7}));
await tryImport('history 3000',mk(s=>{s.history=H(3000)}),{expectOk:true});
await tryImport('history 3001',mk(s=>{s.history=H(3001)}),{expectOk:false});
await tryImport('history 50000',mk(s=>{s.history=H(50000)}),{expectOk:false});
await tryImport('inventoryLogs 10000',mk(s=>{s.items=[A1];s.inventoryLogs=L(10000)}),{expectOk:true});
await tryImport('inventoryLogs 10001',mk(s=>{s.items=[A1];s.inventoryLogs=L(10001)}),{expectOk:false});
// ===== 6 Schema 26 + Schema 27 + Legacy
const s26=mk(s=>{s.schema=26;s.items=[A1];s.boxes=[bx('b1','H4A-1-1','A1',5)];delete s.inventoryLogs});
await tryImport('Schema 26 gültig',s26,{expectOk:true});
await tryImport('Schema 26 mit history 3500',mk(s=>{s.schema=26;s.history=H(3500)}),{expectOk:true});
await tryImport('Schema 26 mit config-Teil',mk(s=>{s.schema=26;s.config={shelf:800}}),{expectOk:true});
await tryImport('Schema 26 Duplikat-Boxen',mk(s=>{s.schema=26;s.items=[A1];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',3)]}),{expectOk:true});
await tryImport('Schema 26 qrMap __proto__',mk(s=>{s.schema=26;s.qrMap={'toString':'H4A-1-1'}}),{expectOk:true});
const legacy={places:{},items:[{code:'L1',name:'Alt',minStock:5.5,buy:1,sell:2,locations:{'H4A-1-1':{available:3,blocked:1}}},{code:'L2',name:'Alt2',minStock:'10',locations:{}}],history:['a','b'],orders:[]};
await tryImport('Legacy 2.5 (minStock 5.5/"10")',legacy,{expectOk:true});
await tryImport('Legacy 2.5 (minStock ok)',{...legacy,items:[{code:'L1',name:'Alt',minStock:5,locations:{'H4A-1-1':{available:3,blocked:1}}}]},{expectOk:true});
await tryImport('Legacy 2.5 history 3500',{...legacy,items:[],history:Array.from({length:3500},(_,i)=>'e'+i)},{expectOk:true});
// Schema 27 reale Exporte
for(const f of ['ap1_good.json','ap1_n.json']){if(fs.existsSync(D+f)){const o=JSON.parse(fs.readFileSync(D+f,'utf8'));await tryImport('Reales Backup '+f,o,{expectOk:true});}}
// ===== Bestehende Daten laden (localStorage) unter strengerer Prüfung
async function loadCase(name,setup,expectLocked){const b=await chromium.launch();const c=await b.newContext();const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://localhost:8123/index.html');await p.evaluate(setup,{B,A1});await p.reload();await p.waitForTimeout(500);
 const r=await p.evaluate(()=>({locked:storageLocked,err:loadError,items:state.items.length,boxes:state.boxes.length}));
 R('Laden '+name+' -> '+(expectLocked?'gesperrt':'nicht gesperrt'),r.locked===expectLocked,JSON.stringify(r).slice(0,150)+' errs='+errs.length);await b.close();}
await loadCase('v2.7 history 3000',({B})=>{B.history=Array.from({length:3000},(_,i)=>({at:'x',text:'h'+i}));localStorage.setItem('lagerpilot_v2_7',JSON.stringify(B))},false);
await loadCase('v2.7 history 3001 (alter Stand?)',({B})=>{B.history=Array.from({length:3001},(_,i)=>({at:'x',text:'h'+i}));localStorage.setItem('lagerpilot_v2_7',JSON.stringify(B))},true);
await loadCase('v2.7 inventoryLogs 10001',({B})=>{B.inventoryLogs=Array.from({length:10001},(_,i)=>({at:'x',place:'H4A-1-1',code:'A',before:0,count:1}));localStorage.setItem('lagerpilot_v2_7',JSON.stringify(B))},true);
await loadCase('v2.7 config ohne Schlüssel (palletMax fehlt)',({B})=>{B.config={shelf:800,bay:null,tare:null};localStorage.setItem('lagerpilot_v2_7',JSON.stringify(B))},true);
await loadCase('v2.6-Speicher (config vollständig)',({B,A1})=>{B.schema=26;delete B.inventoryLogs;localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_v2_6',JSON.stringify(B))},false);
await loadCase('v2.6-Speicher history 3500',({B})=>{B.schema=26;B.history=Array.from({length:3500},(_,i)=>({at:'x',text:'h'+i}));localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_v2_6',JSON.stringify(B))},false);
await loadCase('v2.6-Speicher Duplikat-Boxen',({B,A1})=>{B.schema=26;B.items=[A1];B.boxes=[{id:'1',place:'H4A-1-1',code:'A1',qty:1,blocked:0},{id:'2',place:'H4A-1-1',code:'A1',qty:2,blocked:0}];localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_v2_6',JSON.stringify(B))},false);
await loadCase('Legacy lagerpilot_demo_v1 minStock 5.5',()=>{localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_demo_v1',JSON.stringify({places:{},items:[{code:'L1',name:'Alt',minStock:5.5,locations:{}}],history:[],orders:[]}))},false);
await loadCase('Legacy lagerpilot_demo_v1 history 3500',()=>{localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_demo_v1',JSON.stringify({places:{},items:[],history:Array.from({length:3500},(_,i)=>'e'+i),orders:[]}))},false);
await loadCase('v2.7 qrMap mit "toString"',({B})=>{B.qrMap={toString:'H4A-1-1'};localStorage.setItem('lagerpilot_v2_7',JSON.stringify(B))},true);
await loadCase('v2.7 min als String',({B,A1})=>{B.items=[{...A1,min:'3'}];localStorage.setItem('lagerpilot_v2_7',JSON.stringify(B))},true);
// ===== Laufzeit-Abläufe mit Duplikat-/Grenzprüfung
h=await open();p=h.p;
await h.go('articles');for(const [k,v] of Object.entries({aName:'Art1',aCode:'A1',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'100',aMin:'2'}))await setf(p,k,v);await clk(p,'aSave');
await h.go('more');for(const [id,v] of [['cfgShelf','800'],['cfgBay','2000'],['cfgPalletMax','1000'],['cfgTare','25']])await setf(p,id,v);await clk(p,'cfgSave');
await h.go('book');await setf(p,'bookArticle','A1');
const book=async o=>{for(const [k,v] of Object.entries(o))await setf(p,k,v);await clk(p,'bookSubmit');await h.dlg();return await txt(p,'bookMessage')};
const ok=m=>/gespeichert/.test(m);
R('R in A',ok(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'})));
R('R in A2 weiterer Platz',ok(await book({bookAction:'in',bookPlace:'H4A-1-2',bookQty:'5'})));
R('R Umlagerung auf Platz mit gleichem Artikel (Zusammenführung, keine Duplikat-Box)',ok(await book({bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-1-2',bookQty:'3'}))&&(await h.ev(()=>state.boxes.filter(b=>b.place==='H4A-1-2').length))===1,(await txt(p,'bookMessage')));
R('R in auf bestehende Box (addiert)',ok(await book({bookAction:'in',bookPlace:'H4A-1-2',bookQty:'1'}))&&(await h.ev(()=>state.boxes.filter(b=>b.place==='H4A-1-2').length))===1);
R('R out',ok(await book({bookAction:'out',bookPlace:'H4A-1-2',bookQty:'1'})));
R('R correct +',ok(await book({bookAction:'correct',bookPlace:'H4A-1-2',bookQty:'2',bookNote:'x'})));
await h.ev(()=>{localStorage.setItem('lagerpilot_qs_actor','Tester')});
R('R QS-Umlagerung ganze Palette',ok(await book({bookAction:'qsMove',bookPlace:'H4A-1-1',bookTarget:'H4A-4-4',bookQty:'7',bookNote:'Prüfung'})),await txt(p,'bookMessage'));
R('R Wareneingang auf QS-Platz weiter abgelehnt',!ok(await book({bookAction:'in',bookPlace:'H4A-4-4',bookQty:'1',bookNote:''})));
await h.go('inventory');const inv=async(pl,q)=>{await setf(p,'invPlace',pl);await setf(p,'invArticle','A1');await setf(p,'invQty',q);await clk(p,'invCompare');await clk(p,'invCommit');await h.dlg();return await txt(p,'invResult')};
R('R Inventur mit Differenz',/gespeichert/.test(await inv('H4A-1-2','20')),await txt(p,'invResult'));
R('R Inventur auf leerem Platz',/gespeichert/.test(await inv('H4A-6-6','4')));
R('R Inventur auf 0',/gespeichert/.test(await inv('H4A-6-6','0')));
// Inventurprotokoll Grenze zur Laufzeit
await h.ev(()=>{const s=structuredClone(state);s.inventoryLogs=Array.from({length:10000},(_,i)=>({at:new Date().toISOString(),place:'H4A-1-1',code:'A1',before:0,count:1}));localStorage.setItem('lagerpilot_v2_7',JSON.stringify(s))});
await p.reload();await p.waitForTimeout(500);
R('R 10000 Protokolle: App lädt (nicht gesperrt)',(await h.ev(()=>storageLocked))===false);
await h.go('inventory');const m10=await inv('H4A-1-2','21');
R('R Inventur bei 10000 Protokollen weiterhin möglich (Grenze wird gekappt)',/gespeichert/.test(m10),m10.slice(0,100)+' | logs='+await h.ev(()=>state.inventoryLogs.length));
// Historie Grenze zur Laufzeit
await h.ev(()=>{const s=structuredClone(state);s.history=Array.from({length:3000},(_,i)=>({at:'x',text:'h'+i}));localStorage.setItem('lagerpilot_v2_7',JSON.stringify(s))});
await p.reload();await p.waitForTimeout(500);await h.go('book');await setf(p,'bookArticle','A1');
R('R Buchung bei 3000 Historieneinträgen',ok(await book({bookAction:'in',bookPlace:'H4A-1-2',bookQty:'1'}))&&(await h.ev(()=>state.history.length))===3000);
R('R JS-Fehler Laufzeit',h.errs.length===0,h.errs.join('|'));await h.b.close();
const f=res.filter(r=>!r[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(r=>console.log(' -',r[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
