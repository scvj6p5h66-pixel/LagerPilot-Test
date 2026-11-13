const {open}=require('./lib');const fs=require('fs');const {chromium}=require('playwright');
const D='/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad/t/';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7';
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,260),id);
(async()=>{
let h0=await open();const B=await h0.ev(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')));await h0.b.close();
const A=(c,extra={})=>({code:c,name:'Art '+c,barcode:'',unit:'STK',pack:1,weight:1,max:1000,min:null,...extra});
const bx=(id,pl,c,q,b=0,x={})=>({id,place:pl,code:c,qty:q,blocked:b,...x});
const H=n=>Array.from({length:n},(_,i)=>({at:new Date().toISOString(),text:'h'+i}));
const mk26=f=>{const s=structuredClone(B);s.schema=26;delete s.inventoryLogs;f(s);return s};
// ---------- Import
async function imp(name,obj,{raw,pre}={}){const h=await open({acceptDownloads:true});await h.ev(()=>{transaction(s=>{s.items.push({code:'KEEP',name:'K',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})})});
 const before=await ls(h.p,K);const f=D+'ap4_'+name.replace(/\W+/g,'_')+'.json';const content=raw??JSON.stringify(obj);fs.writeFileSync(f,content);
 await h.go('more');await h.p.setInputFiles('#jsonImport',f);await h.p.waitForTimeout(1500);
 const after=await ls(h.p,K);const st=after&&after!==before?JSON.parse(after):null;const m=await txt(h.p,'backupMessage');
 const out={changed:after!==before,st,msg:m,locked:await h.ev(()=>storageLocked),errs:h.errs.slice(),fileSame:fs.readFileSync(f,'utf8')===content,h};return out}
const done=async o=>o.h.b.close();
let o;
// 1 History
o=await imp('26 history 3500',mk26(s=>{s.history=H(3500)}));R('1 Schema 26, 3500 Historie -> importiert, auf 3000 gekappt, neueste behalten',o.changed&&o.st.history.length===3000&&o.st.history[0].text==='h0'&&o.st.schema===27&&!o.locked,'len='+(o.st&&o.st.history.length)+' msg='+o.msg);R('1 keine JS-Fehler',o.errs.length===0,o.errs.join('|'));await done(o);
o=await imp('26 history 3000',mk26(s=>{s.history=H(3000)}));R('1 Schema 26, genau 3000 -> unverändert 3000',o.changed&&o.st.history.length===3000);await done(o);
o=await imp('26 history 50000',mk26(s=>{s.history=H(50000)}));R('1 Schema 26, 50000 Historie -> 3000',o.changed&&o.st.history.length===3000);await done(o);
o=await imp('26 inventoryLogs 10500',mk26(s=>{s.items=[A('A1')];s.inventoryLogs=Array.from({length:10500},(_,i)=>({at:'x',place:'H4A-1-1',code:'A1',before:0,count:1}))}));R('1 Schema 26 inventoryLogs 10500 -> 10000',o.changed&&o.st.inventoryLogs.length===10000);await done(o);
// 2 Config
for(const [n,c,exp] of [['nur shelf',{shelf:500},{shelf:500,bay:null,palletMax:null,tare:null}],['leer {}',{},{shelf:800,bay:null,palletMax:null,tare:null}],['fehlend (undefined)',undefined,{shelf:800,bay:null,palletMax:null,tare:null}],['teilweise',{shelf:900,bay:2000,tare:20},{shelf:900,bay:2000,palletMax:null,tare:20}],['voll',{shelf:700,bay:1500,palletMax:900,tare:25},{shelf:700,bay:1500,palletMax:900,tare:25}]]){
 o=await imp('26 cfg '+n,mk26(s=>{if(c===undefined)delete s.config;else s.config=c}));R('2 Config '+n+' -> ergänzt/übernommen',o.changed&&o.st&&JSON.stringify(o.st.config)===JSON.stringify(exp),JSON.stringify(o.st&&o.st.config)+' msg='+o.msg);await done(o);}
for(const [n,c] of [['shelf "abc"',{shelf:'abc'}],['negativ',{shelf:-1}],['Array',[1]],['String','x'],['null',null]]){o=await imp('26 cfg bad '+n,mk26(s=>{s.config=c}));
 R('2 Ungültige Config-WERTE ('+n+'): entweder bereinigt oder sauber abgelehnt (kein Absturz, keine Halbdaten)',(o.changed?(o.st&&['shelf','bay','palletMax','tare'].every(k=>o.st.config[k]===null||Number.isFinite(o.st.config[k]))):true)&&o.errs.length===0,'changed='+o.changed+' cfg='+JSON.stringify(o.st&&o.st.config)+' msg='+o.msg.slice(0,70));await done(o);}
// 3 Duplikate
o=await imp('26 dup 2',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',3)]}));
R('3 Duplikat-Boxen zusammengeführt (Summe 5, eine Box, id der ersten)',o.changed&&o.st.boxes.length===1&&o.st.boxes[0].qty===5&&o.st.boxes[0].id==='b1',JSON.stringify(o.st&&o.st.boxes));
R('3 Hinweis an Nutzer über Zusammenführung (Meldung/Historie)',/zusammen|migr|normal|bereinigt/i.test(o.msg+JSON.stringify(o.st&&o.st.history.slice(0,3))),'msg='+o.msg+' hist0='+(o.st&&(o.st&&o.st.history[0]?o.st.history[0].text:'(keine)')));await done(o);
o=await imp('26 dup 3 + blocked',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',10,4,{qsReason:'QS',qsBy:'Max'}),bx('b2','H4A-1-1','A1',5,0),bx('b3','H4A-1-1','A1',7,2)]}));
R('3/7 Drei Duplikate: Summe 22, gesperrt 6, qs-Felder der ersten Box erhalten',o.changed&&o.st.boxes.length===1&&o.st.boxes[0].qty===22&&o.st.boxes[0].blocked===6&&o.st.boxes[0].qsReason==='QS',JSON.stringify(o.st&&o.st.boxes));await done(o);
o=await imp('26 dup + andere Artikel/Plätze',mk26(s=>{s.items=[A('A1'),A('A2')];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A2',3),bx('b3','H4A-1-2','A1',4),bx('b4','H4A-1-1','A1',1)]}));
const tot=c=>o.st.boxes.filter(b=>b.code===c).reduce((n,b)=>n+b.qty,0);
R('7 Gesamtmengen je Artikel vor/nach gleich (A1=7, A2=3), Mischpalette/anderer Platz unberührt',o.changed&&tot('A1')===7&&tot('A2')===3&&o.st.boxes.length===3,JSON.stringify(o.st&&o.st.boxes.map(b=>[b.place,b.code,b.qty])));await done(o);
o=await imp('26 dup qty0',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',0),bx('b2','H4A-1-1','A1',3)]}));R('7 Duplikat mit Menge 0',o.changed&&o.st.boxes.length===1&&o.st.boxes[0].qty===3,JSON.stringify(o.st&&o.st.boxes));await done(o);
// 9 Abbruch
for(const [n,boxes] of [['negative Menge',[bx('b1','H4A-1-1','A1',5),bx('b2','H4A-1-1','A1',-3)]],['Dezimal',[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',1.5)]],['String-Menge',[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1','3')]],['blocked>qty',[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',3,9)]],['Überlauf',[bx('b1','H4A-1-1','A1',Number.MAX_SAFE_INTEGER),bx('b2','H4A-1-1','A1',5)]]]){
 o=await imp('26 dup bad '+n,mk26(s=>{s.items=[A('A1')];s.boxes=boxes}));
 R('9 Duplikate mit ungültigen Mengen ('+n+') -> Abbruch, Daten unverändert, deutsche Meldung, kein JS-Fehler',!o.changed&&!o.locked&&o.errs.length===0&&o.msg.length>0&&!/Cannot|undefined|TypeError/.test(o.msg),'msg='+o.msg.slice(0,110));await done(o);}
for(const [n,f] of [['history Objekt',s=>{s.history={a:1}}],['items kein Array',s=>{s.items='x'}],['places Array',s=>{s.places=[]}],['Box mit unbekanntem Artikel',s=>{s.items=[];s.boxes=[bx('b1','H4A-1-1','X',1)]}],['Box auf ungültigem Platz',s=>{s.items=[A('A1')];s.boxes=[bx('b1','Z-9','A1',1)]}],['qrMap ungültiger Platz',s=>{s.qrMap={q:'Z-9'}}]]){
 o=await imp('26 bad '+n,mk26(f));R('9 Nicht sicher migrierbar ('+n+') -> abgelehnt/Fehlermeldung, Bestand unverändert',!o.changed&&o.errs.length===0&&o.msg.length>0&&!/Cannot read|is not a function|TypeError/.test(o.msg),'msg='+o.msg.slice(0,100)+' changed='+o.changed+' errs='+o.errs.join('|').slice(0,100));await done(o);}
// 4 QR
o=await imp('26 qr reserviert',mk26(s=>{s.qrMap={toString:'H4A-1-1',constructor:'H4A-1-2','__proto__x':'H4A-1-3',hasOwnProperty:'H4A-1-4',prototype:'H4A-1-5',QR1:'H4A-2-1'}}));
R('4 Reservierte QR-Schlüssel entfernt, normale bleiben',o.changed&&JSON.stringify(Object.keys(o.st.qrMap).sort())===JSON.stringify(['QR1','__proto__x']),JSON.stringify(o.st&&o.st.qrMap));await done(o);
R('4 JSON-Literal "__proto__" im qrMap der Datei',await (async()=>{const raw=JSON.stringify(mk26(s=>{s.qrMap={}})).replace('"qrMap":{}','"qrMap":{"__proto__":"H4A-1-1","QR2":"H4A-2-2"}');o=await imp('26 qr proto literal',null,{raw});const ok=o.changed&&o.st&&!Object.hasOwn(o.st.qrMap,'__proto__')&&o.st.qrMap.QR2==='H4A-2-2';await done(o);return ok})(),'');
// 5 Legacy
const leg=(items,hist=[])=>({places:{},items,history:hist,orders:[]});
o=await imp('legacy minStock',leg([{code:'L1',name:'A',minStock:5.5,locations:{}},{code:'L2',name:'B',minStock:'10',locations:{}},{code:'L3',name:'C',minStock:7,locations:{}},{code:'L4',name:'D',minStock:-2,locations:{}},{code:'L5',name:'E',locations:{}},{code:'L6',name:'F',minStock:null,locations:{}},{code:'L7',name:'G',minStock:0,locations:{}}]));
const mins=o.st&&Object.fromEntries(o.st.items.map(a=>[a.code,a.min]));
R('5 Legacy minStock: 5.5/"10"/-2/fehlend/null -> null; 7 und 0 bleiben',o.changed&&mins.L1===null&&mins.L2===null&&mins.L3===7&&mins.L4===null&&mins.L5===null&&mins.L6===null&&mins.L7===0,JSON.stringify(mins));await done(o);
o=await imp('legacy history 3500',leg([],Array.from({length:3500},(_,i)=>'e'+i)));R('5 Legacy Historie 3500 -> ≤3000 inkl. Migrationseintrag',o.changed&&o.st.history.length===3000&&/Kopie der Daten/.test((o.st&&o.st.history[0]?o.st.history[0].text:'(keine)')),'len='+(o.st&&o.st.history.length));await done(o);
o=await imp('legacy Mengen',leg([{code:'L1',name:'A',minStock:1,locations:{'H4A-1-1':{available:3,blocked:2},'H4A-1-2':{available:4,blocked:0}}}]));
R('7 Legacy Gesamt/gesperrte Menge korrekt (5/2 und 4/0)',o.changed&&JSON.stringify(o.st.boxes.map(b=>[b.place,b.qty,b.blocked]).sort())===JSON.stringify([['H4A-1-1',5,2],['H4A-1-2',4,0]]),JSON.stringify(o.st&&o.st.boxes.map(b=>[b.place,b.qty,b.blocked])));await done(o);
// 6/8 Originaldateien unverändert + Import schema 27 weiterhin streng
o=await imp('27 history 3001 bleibt abgelehnt',Object.assign(structuredClone(B),{history:H(3001)}));R('6 Schema 27 mit 3001 Historie weiter abgelehnt (keine stille Aufweichung)',!o.changed,o.msg);await done(o);
o=await imp('27 cfg {}',Object.assign(structuredClone(B),{config:{}}));R('6 Schema 27 mit leerer Config weiter abgelehnt',!o.changed,o.msg);await done(o);
o=await imp('27 dup boxes',Object.assign(structuredClone(B),{items:[A('A1')],boxes:[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',3)]}));R('6 Schema 27 mit Duplikat-Boxen weiter abgelehnt',!o.changed,o.msg);await done(o);
// Kapazität nach Merge
o=await imp('26 dup kapazität',mk26(s=>{s.items=[A('A1',{max:10,weight:300})];s.config={shelf:800,bay:2000,palletMax:1000,tare:25};s.boxes=[bx('b1','H4A-1-1','A1',6),bx('b2','H4A-1-1','A1',6)]}));
R('Info Kapazität: Merge ergibt 12 > Max 10 / 3600 kg > Fachlast 800 -> Import ohne Warnung?',true,'changed='+o.changed+' qty='+(o.st&&o.st.boxes[0]&&o.st.boxes[0].qty)+' msg="'+o.msg+'"');
if(o.changed){const hh=o.h;await hh.go('book');
 R('7 Nach Merge: Ausbuchen aus überfüllter Box möglich (Reparatur)',await (async()=>{const set=(id,v)=>hh.p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);await set('bookArticle','A1');await set('bookAction','out');await set('bookPlace','H4A-1-1');await set('bookQty','4');await hh.p.evaluate(()=>bookSubmit.click());await hh.dlg();return /gespeichert/.test(await txt(hh.p,'bookMessage'))&&(await hh.ev(()=>state.boxes[0].qty))===8})());}
await done(o);

// ---------- Laden aus lokalem Speicher
async function load(name,setup,{key='lagerpilot_v2_6'}={}){const b=await chromium.launch();const c=await b.newContext();const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const dl=[];p.on('dialog',d=>{dl.push(d.message().slice(0,80));d.accept()});
 await p.goto('http://localhost:8123/index.html');await p.evaluate(setup);const orig=await p.evaluate(k=>localStorage.getItem(k),key);await p.reload();await p.waitForTimeout(600);
 const r=await p.evaluate(()=>({locked:storageLocked,err:loadError,note:upgradeNote,items:state.items.length,boxes:state.boxes.map(b=>[b.place,b.code,b.qty,b.blocked]),hist:state.history.length,cfg:state.config,min:state.items.map(a=>a.min),qr:Object.keys(state.qrMap),keys:Object.keys(localStorage)}));
 r.orig=orig;r.origAfter=await p.evaluate(k=>localStorage.getItem(k),key);r.errs=errs;r.dl=dl;r.v27=await p.evaluate(k=>localStorage.getItem(k),K);r.p=p;r.b=b;return r}
const S=(o,key)=>({o,key});
let r=await load('v26 hist',()=>{},{});await r.b.close();
const set26=(obj)=>`localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_v2_6',JSON.stringify(${JSON.stringify(obj)}))`;
const run=async(name,obj,key,cb)=>{const r=await load(name,new Function(key==='lagerpilot_demo_v1'?`localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_demo_v1',JSON.stringify(${JSON.stringify(obj)}))`:set26(obj)),{key});await cb(r);await r.b.close();};
await run('v26 hist 3500',mk26(s=>{s.history=H(3500)}),'lagerpilot_v2_6',async r=>{R('6 Laden v2.6-Speicher mit 3500 Historie -> geladen, nicht gesperrt, 3000',!r.locked&&r.hist===3000&&r.errs.length===0,'locked='+r.locked+' hist='+r.hist+' err='+r.err);R('8 Originalschlüssel lagerpilot_v2_6 byteweise unverändert',r.orig===r.origAfter);R('6 Hinweis zur Übernahme (upgradeNote)',/2\.6/.test(r.note),r.note);});
await run('v26 cfg teil',mk26(s=>{s.config={shelf:600}}),'lagerpilot_v2_6',async r=>{R('6 Laden v2.6 mit Teil-Config -> ergänzt',!r.locked&&r.cfg.shelf===600&&r.cfg.palletMax===null&&r.cfg.tare===null,JSON.stringify(r.cfg));});
await run('v26 dup',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',2,1),bx('b2','H4A-1-1','A1',3,0)]}),'lagerpilot_v2_6',async r=>{R('6/7 Laden v2.6 mit Duplikat -> zusammengeführt (5, gesperrt 1)',!r.locked&&JSON.stringify(r.boxes)===JSON.stringify([['H4A-1-1','A1',5,1]]),JSON.stringify(r.boxes));R('8 Original unverändert (2 Boxen weiterhin in v2.6-Schlüssel)',r.orig===r.origAfter&&JSON.parse(r.origAfter).boxes.length===2);R('6 Neuer v2.7-Schlüssel enthält 1 Box',JSON.parse(r.v27).boxes.length===1);R('6 Hinweis über Zusammenführung bei Laden',/zusammen|bereinigt|normal/i.test(r.note),'note='+r.note);});
await run('v26 qr',mk26(s=>{s.qrMap={toString:'H4A-1-1',QR1:'H4A-1-2'}}),'lagerpilot_v2_6',async r=>{R('6 Laden v2.6 mit toString-QR -> entfernt',!r.locked&&JSON.stringify(r.qr)==='["QR1"]',JSON.stringify(r.qr));});
await run('v26 bad dup',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',5),bx('b2','H4A-1-1','A1',-3)]}),'lagerpilot_v2_6',async r=>{R('9 Laden v2.6 mit ungültigen Duplikaten -> Sperre, Originaldaten unverändert, Quarantäne, kein JS-Fehler',r.locked&&r.orig===r.origAfter&&r.errs.length===0&&r.keys.includes(K+'_quarantine'),'locked='+r.locked+' err='+r.err+' keys='+r.keys.join(','));R('9 Sperr-Grund deutsch/verständlich',/Doppelte Boxen|ungültig|geprüft/i.test(r.err),r.err);R('9 Kein v2.7-Schlüssel mit Halbdaten geschrieben',r.v27===null||JSON.parse(r.v27).boxes.length===0,String(r.v27).slice(0,40));
  const ban=await r.p.evaluate(()=>{const e=document.getElementById('storageLockBanner');return !e.classList.contains('hidden')});R('9 Sperr-Banner sichtbar',ban);});
await run('legacy minStock',leg([{code:'L1',name:'A',minStock:5.5,locations:{'H4A-1-1':{available:2,blocked:1}}}],Array.from({length:3500},(_,i)=>'e'+i)),'lagerpilot_demo_v1',async r=>{R('5/6 Laden Legacy-Hauptschlüssel: kein Sperrzustand, min null, Historie ≤3000, Menge 3/gesperrt 1',!r.locked&&r.min[0]===null&&r.hist<=3000&&JSON.stringify(r.boxes)===JSON.stringify([['H4A-1-1','L1',3,1]]),JSON.stringify({l:r.locked,min:r.min,h:r.hist,b:r.boxes,err:r.err}));R('8 Hauptschlüssel lagerpilot_demo_v1 unverändert',r.orig===r.origAfter);});
// v2.7 aktuell weiter streng
await run('v27 hist3001',(()=>{const s=structuredClone(B);s.history=H(3001);return s})(),'lagerpilot_v2_7',null).catch(()=>{});
{const b=await chromium.launch();const p=await (await b.newContext()).newPage();await p.goto('http://localhost:8123/index.html');await p.evaluate(([s,k])=>localStorage.setItem(k,JSON.stringify(s)),[Object.assign(structuredClone(B),{history:H(3001)}),K]);await p.reload();await p.waitForTimeout(500);R('6 Aktueller v2.7-Speicher mit 3001 Historie bleibt gesperrt (Strenge erhalten)',await p.evaluate(()=>storageLocked));await b.close();}
const f=res.filter(r=>!r[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(r=>console.log(' -',r[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
