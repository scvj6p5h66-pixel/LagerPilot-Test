const {open}=require('./lib');const fs=require('fs');const {chromium}=require('playwright');
const D='/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad/t/';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7';
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,240),id);
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
(async()=>{
let h0=await open();const B=await h0.ev(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')));await h0.b.close();
const A=(c,x={})=>({code:c,name:'Art '+c,barcode:'',unit:'STK',pack:1,weight:1,max:1000,min:null,...x});
const bx=(id,pl,c,q,b=0,x={})=>({id,place:pl,code:c,qty:q,blocked:b,...x});
const H=n=>Array.from({length:n},(_,i)=>({at:new Date().toISOString(),text:'h'+i}));
const mk26=f=>{const s=structuredClone(B);s.schema=26;delete s.inventoryLogs;f(s);return s};
const full={shelf:800,bay:2000,palletMax:1000,tare:25};
async function imp(name,obj){const h=await open({acceptDownloads:true});await h.p.evaluate(()=>{const a=window.alert;window.alert=m=>{sessionStorage.setItem('lastAlert',String(m));a(m)}});
 await h.ev(()=>{transaction(s=>{s.items.push({code:'KEEP',name:'K',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})})});
 const before=await ls(h.p,K);const f=D+'ap6_'+name.replace(/\W+/g,'_')+'.json';fs.writeFileSync(f,JSON.stringify(obj));
 await h.go('more');await h.p.setInputFiles('#jsonImport',f);await h.p.waitForTimeout(1500);
 const after=await ls(h.p,K);const st=after&&after!==before?JSON.parse(after):null;
 return {changed:after!==before,st,alert:await h.p.evaluate(()=>sessionStorage.getItem('lastAlert')||''),msg:await txt(h.p,'backupMessage'),errs:h.errs.slice(),h}}
const mig=o=>o.st&&o.st.history.filter(x=>x.text.startsWith('Migration: '));
let o;
// ===== A QS
const qsCase=async(n,items,boxes,chk)=>{o=await imp('qs '+n,mk26(s=>{s.items=items;s.boxes=boxes;s.config=full}));let ok=false,info='';try{[ok,info]=chk(o.st.boxes,o)}catch(e){info='ERR '+e.message}R('A '+n,!!o.changed&&ok&&o.errs.length===0,info);return o};
let T1='2026-01-01T10:00:00Z',T2='2026-02-02T11:00:00Z';
await qsCase('frei + gesperrt(QS) -> QS-Felder bleiben',[A('A1')],[bx('b1','H4A-1-1','A1',5,0),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Beschädigt',qsBy:'Max',qsSince:T1})],b=>[b.length===1&&b[0].qty===8&&b[0].blocked===3&&b[0].qsReason==='Beschädigt'&&b[0].qsBy==='Max'&&b[0].qsSince===T1,JSON.stringify(b[0])]);
const mo=o;{const m=mig(mo);R('A Migrationseintrag nennt Zusammenführung inkl. QS-Hinweis',m&&m.length===1&&/1 doppelte Box\(en\) zusammengeführt/.test(m[0].text)&&/QS/.test(m[0].text),m&&m[0]&&m[0].text.slice(0,200));}await mo.h.b.close();
await qsCase('gesperrt(QS) + gesperrt(QS) verschiedene Angaben -> zusammengeführt',[A('A1')],[bx('b1','H4A-1-1','A1',5,2,{qsReason:'Grund1',qsBy:'Max',qsSince:T1}),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Grund2',qsBy:'Eva',qsSince:T2})],b=>[b.length===1&&b[0].qty===8&&b[0].blocked===5&&b[0].qsReason==='Grund1 | Grund2'&&b[0].qsBy==='Max | Eva'&&b[0].qsSince===T1+' | '+T2,JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('gleiche Angaben -> keine Duplikate',[A('A1')],[bx('b1','H4A-1-1','A1',5,2,{qsReason:'Gleich',qsBy:'Max',qsSince:T1}),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Gleich',qsBy:'Max',qsSince:T1})],b=>[b[0].qsReason==='Gleich'&&b[0].qsBy==='Max'&&b[0].qsSince===T1,JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('drei Boxen (frei, QS1, QS2)',[A('A1')],[bx('b1','H4A-1-1','A1',5),bx('b2','H4A-1-1','A1',2,2,{qsReason:'R1',qsBy:'M',qsSince:T1}),bx('b3','H4A-1-1','A1',4,4,{qsReason:'R2',qsBy:'E',qsSince:T2})],b=>[b.length===1&&b[0].qty===11&&b[0].blocked===6&&b[0].qsReason==='R1 | R2'&&b[0].qsBy==='M | E',JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('vier Boxen, dritte wiederholt R1 (Dedupe über bereits verkettete Werte)',[A('A1')],[bx('b1','H4A-1-1','A1',1,1,{qsReason:'R1',qsBy:'M',qsSince:T1}),bx('b2','H4A-1-1','A1',1,1,{qsReason:'R2',qsBy:'E',qsSince:T2}),bx('b3','H4A-1-1','A1',1,1,{qsReason:'R1',qsBy:'M',qsSince:T1}),bx('b4','H4A-1-1','A1',1)],b=>[b[0].qsReason==='R1 | R2'&&b[0].blocked===3&&b[0].qty===4,JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('frei + frei: keine QS-Felder erfunden',[A('A1')],[bx('b1','H4A-1-1','A1',5),bx('b2','H4A-1-1','A1',3)],b=>[b[0].qty===8&&b[0].blocked===0&&!('qsReason' in b[0])&&!('qsBy' in b[0]),JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('freigegebene Altfelder (blocked 0, qsReason "Alt") werden NICHT übernommen',[A('A1')],[bx('b1','H4A-1-1','A1',5,0,{qsReason:'AltFrei'}),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Aktuell',qsBy:'Max',qsSince:T1})],b=>[b[0].qsReason==='Aktuell'&&b[0].blocked===3,JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('erste gesperrt ohne QS-Felder, zweite mit -> Felder der zweiten',[A('A1')],[bx('b1','H4A-1-1','A1',5,5),bx('b2','H4A-1-1','A1',3,3,{qsReason:'X',qsBy:'Y',qsSince:T2})],b=>[b[0].qsReason==='X'&&b[0].qsBy==='Y'&&b[0].blocked===8,JSON.stringify(b[0])]);await o.h.b.close();
await qsCase('nicht zusammengeführte QS-Box bleibt unverändert',[A('A1')],[bx('b1','H4A-1-1','A1',5,5,{qsReason:'Solo',qsBy:'Max',qsSince:T1}),bx('b2','H4A-1-2','A1',3)],b=>[b.length===2&&b[0].qsReason==='Solo'&&b[0].qty===5&&b[1].qty===3,JSON.stringify(b.map(x=>[x.place,x.qty,x.blocked,x.qsReason]))]);{const m=mig(o);R('A keine Migrationszeile bei nicht zusammengeführten Boxen',!m||m.length===0);}await o.h.b.close();
// Gesamtmengen vor/nach
o=await imp('totals',mk26(s=>{s.items=[A('A1'),A('A2')];s.boxes=[bx('b1','H4A-1-1','A1',5,2,{qsReason:'a'}),bx('b2','H4A-1-1','A1',3,1,{qsReason:'b'}),bx('b3','H4A-1-2','A2',7,7,{qsReason:'c'}),bx('b4','H4A-1-3','A1',4),bx('b5','H4A-1-3','A1',6),bx('b6','H4A-1-4','A2',9,0)];s.config=full}));
const tq=c=>o.st.boxes.filter(b=>b.code===c).reduce((n,b)=>n+b.qty,0),tb=c=>o.st.boxes.filter(b=>b.code===c).reduce((n,b)=>n+b.blocked,0);
R('A Gesamt A1: 18 (vorher 5+3+4+6), gesperrt 3; A2: 16, gesperrt 7',tq('A1')===18&&tb('A1')===3&&tq('A2')===16&&tb('A2')===7,JSON.stringify(o.st.boxes.map(b=>[b.place,b.code,b.qty,b.blocked])));
const migP=o.h;
// Normalbetrieb nach Migration
o=await imp('betrieb',mk26(s=>{s.items=[A('A1',{max:100,weight:1})];s.boxes=[bx('b1','H4A-1-1','A1',5,0),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Grund <img src=x onerror=window.__xss=1>',qsBy:'Max',qsSince:T1}),bx('b3','H4A-1-1','A1',2,2,{qsReason:'Zweiter',qsBy:'Eva',qsSince:T2}),bx('o1','H4A-2-1','A1',6)];s.config=full}));
{const hh=o.h,p=hh.p;await hh.ev(()=>{});
 R('B-Betrieb: Zustand nach Migration gültig, nicht gesperrt',(await hh.ev(()=>storageLocked))===false&&(await hh.ev(()=>valid(state))));
 await hh.go('racks');await p.evaluate(()=>{showPlace('H4A-1-1')});
 const det=await p.evaluate(()=>document.getElementById('placeDetail').innerText.replace(/\s+/g,' '));
 R('B Platzdetail zeigt Menge 10, QS-gesperrt 5 und beide QS-Gründe',/10/.test(det)&&/QS-gesperrt: 5/.test(det)&&/Zweiter/.test(det)&&/Grund/.test(det),det.slice(0,230));
 R('B kein XSS durch QS-Grund',(await p.evaluate(()=>window.__xss))===undefined&&(await p.evaluate(()=>!document.querySelector('#placeDetail img'))));
 // Buchungen auf der teilgesperrten Box
 await hh.go('book');const book=async x=>{for(const [k,v] of Object.entries(x))await setf(p,k,v);await p.evaluate(()=>bookSubmit.click());await hh.dlg();return await txt(p,'bookMessage')};
 await setf(p,'bookArticle','A1');
 R('B Ausbuchen aus (teil)gesperrter Box abgelehnt',!/gespeichert/.test(await book({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'1'})),await txt(p,'bookMessage'));
 R('B Wareneingang auf gesperrte Box abgelehnt',!/gespeichert/.test(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'1'})));
 await setf(p,'bookTarget','H4A-3-3');
 R('B Umlagerung aus gesperrter Box abgelehnt',!/gespeichert/.test(await book({bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-3',bookQty:'1'})));
 R('B Normale (freie) Box anderswo bucht weiter',/gespeichert/.test(await book({bookAction:'out',bookPlace:'H4A-2-1',bookQty:'1'})));
 await hh.go('inventory');await setf(p,'invPlace','H4A-1-1');await setf(p,'invArticle','A1');await setf(p,'invQty','10');await p.evaluate(()=>invCompare.click());await p.evaluate(()=>invCommit.click());await hh.dlg();
 R('B Inventur auf gesperrter Box -> manuelle Klärung, keine Änderung',(await hh.ev(()=>state.boxes.find(b=>b.place==='H4A-1-1').qty))===10,await txt(p,'invResult'));
 // QS-Freigabe nur Rolle qs
 await hh.go('racks');await p.evaluate(()=>{localStorage.setItem('lagerpilot_qs_actor','Anna');localStorage.setItem('lagerpilot_qs_role','mitarbeiter');showPlace('H4A-1-1')});
 await p.evaluate(()=>document.querySelector('[data-qs-lock]').click());let d=await hh.dlg();
 R('B Freigabe als Mitarbeiter abgelehnt',d.some(x=>/Freigabe nur durch QS/.test(x))&&(await hh.ev(()=>state.boxes.find(b=>b.place==='H4A-1-1').blocked))===5,JSON.stringify(d));
 await p.evaluate(()=>{localStorage.setItem('lagerpilot_qs_role','qs');showPlace('H4A-1-1')});await p.evaluate(()=>document.querySelector('[data-qs-lock]').click());await hh.dlg();
 const rel=await hh.ev(()=>{const b=state.boxes.find(b=>b.place==='H4A-1-1');return {qty:b.qty,blocked:b.blocked,r:b.qsReason,rb:b.qsReleasedBy,h:state.history[0].text}});
 R('B Freigabe als QS: gesperrt 0, Menge 10, Freigeber gesetzt, Historie',rel.blocked===0&&rel.qty===10&&rel.r===''&&rel.rb==='Anna'&&/QS-Freigabe/.test(rel.h),JSON.stringify(rel));
 R('B Danach Ausbuchen möglich',/gespeichert/.test(await (async()=>{await hh.go('book');await setf(p,'bookArticle','A1');return book({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'2'})})())&&(await hh.ev(()=>state.boxes.find(b=>b.place==='H4A-1-1').qty))===8);
 // erneut sperren
 await hh.go('racks');await p.evaluate(()=>{window.__promptAns.push('Neuer Grund');showPlace('H4A-1-1')});await p.evaluate(()=>document.querySelector('[data-qs-lock]').click());await hh.dlg();
 const rl=await hh.ev(()=>{const b=state.boxes.find(b=>b.place==='H4A-1-1');return [b.blocked,b.qsReason,b.qsBy,typeof b.qsSince]});
 R('B Neu sperren nach Freigabe: gesperrt = Menge, neuer Grund, Person, Zeitstempel',rl[0]===8&&rl[1]==='Neuer Grund'&&rl[3]==='string',JSON.stringify(rl));
 // Export/Import Rundreise
 await hh.go('more');const dl=p.waitForEvent('download');await p.evaluate(()=>jsonExport.click());await (await dl).saveAs(D+'ap6_rt.json');
 const rt=JSON.parse(fs.readFileSync(D+'ap6_rt.json','utf8'));R('B Export des migrierten Standes ist gültiges Schema 27',rt.schema===27&&rt.boxes.some(b=>b.place==='H4A-1-1'));
 const snapB=await ls(p,K);await p.setInputFiles('#jsonImport',D+'ap6_rt.json');await p.waitForTimeout(1500);
 R('B Re-Import des Exports: unverändert, kein neuer Migrationseintrag',(await hh.ev(()=>valid(state)))&&!(JSON.parse(await ls(p,K)).history.some((x,i)=>i===0&&x.text.startsWith('Migration:'))&&JSON.parse(snapB).history[0].text!==JSON.parse(await ls(p,K)).history[0].text));
 R('B keine JS-Fehler',hh.errs.length===0,hh.errs.join('|'));await hh.b.close();}
await migP.b.close();
// ===== B inventoryLogs
for(const [n,v] of [['Objekt',{}],['String','x'],['Zahl',5],['true',true]]){o=await imp('logs '+n,mk26(s=>{s.inventoryLogs=v}));R('B inventoryLogs '+n+': abgelehnt, deutsche Meldung, Daten unverändert, kein JS-Fehler',!o.changed&&/Verlauf oder Inventurprotokolle ungültig/.test(o.msg)&&o.errs.length===0&&!/is not a function/.test(o.msg),o.msg.slice(0,80));await o.h.b.close();}
o=await imp('logs null',mk26(s=>{s.inventoryLogs=null}));R('B inventoryLogs null: wie fehlend behandelt',o.changed&&Array.isArray(o.st.inventoryLogs));await o.h.b.close();
o=await imp('hist null',mk26(s=>{s.history=null}));R('B history null: wie fehlend behandelt',o.changed&&Array.isArray(o.st.history),'msg='+o.msg);await o.h.b.close();
o=await imp('logs mit ungültigem Eintrag',mk26(s=>{s.items=[A('A1')];s.inventoryLogs=[{at:'x',place:'H4A-1-1',code:'A1',before:'a',count:1}]}));R('B inventoryLogs mit ungültigem Eintrag -> abgelehnt (valid) ohne JS-Fehler',!o.changed&&o.errs.length===0&&o.msg.length>0,o.msg);await o.h.b.close();
// ===== C Warnungen
const wc=async(n,items,boxes,cfg,expect)=>{o=await imp('w '+n,mk26(s=>{s.items=items;s.boxes=boxes;s.config=cfg}));const t=(mig(o)||[]).map(x=>x.text).join(' || ');const over=(t.match(/WARNUNG: (\d+) zusammengeführte Box\(en\) überschreiten/)||[])[1];const miss=(t.match(/WARNUNG: Lastprüfung bei (\d+)/)||[])[1];
 R('C '+n,o.changed&&(+over||0)===expect[0]&&(+miss||0)===expect[1],'über='+(over||0)+'/'+expect[0]+' fehlend='+(miss||0)+'/'+expect[1]);await o.h.b.close();};
const two=(a)=>[bx('a','H4A-1-1',a,6),bx('b','H4A-1-1',a,6)];
await wc('Artikel-Max (12>10)',[A('A1',{max:10})],two('A1'),full,[1,0]);
await wc('Fachlast (12×100+25>800)',[A('A1',{weight:100})],two('A1'),full,[1,0]);
await wc('nur Palettentragfähigkeit (12×50+25=625>500, Fachlast 5000)',[A('A1',{weight:50})],two('A1'),{shelf:5000,bay:5000,palletMax:500,tare:25},[1,0]);
await wc('nur Feldlast (625>500)',[A('A1',{weight:50})],two('A1'),{shelf:5000,bay:500,palletMax:5000,tare:25},[1,0]);
await wc('im Limit, volle Lastdaten -> keine Warnung',[A('A1',{weight:1})],two('A1'),full,[0,0]);
await wc('tare fehlt -> Hinweis fehlende Lastdaten',[A('A1',{weight:1})],two('A1'),{shelf:800,bay:2000,palletMax:1000,tare:null},[0,1]);
await wc('Artikelgewicht fehlt -> Hinweis fehlende Lastdaten',[A('A1',{weight:null})],two('A1'),full,[0,1]);
await wc('palletMax/bay fehlen (Default-Config) -> Hinweis fehlende Lastdaten',[A('A1',{weight:1})],two('A1'),{shelf:800},[0,1]);
await wc('Max überschritten UND tare fehlt -> beide Warnungen',[A('A1',{max:10,weight:1})],two('A1'),{shelf:800,bay:2000,palletMax:1000,tare:null},[1,1]);
await wc('zwei Boxen: eine über Max, eine im Limit -> 1',[A('A1',{max:10}),A('A2',{max:1000})],[...two('A1'),bx('c','H4A-1-2','A2',6),bx('d','H4A-1-2','A2',6)],full,[1,0]);
await wc('nicht zusammengeführte Box über Limit -> keine Warnung',[A('A1',{max:10})],[bx('a','H4A-1-1','A1',20)],full,[0,0]);
// Alert enthält Warnung
o=await imp('w alert',mk26(s=>{s.items=[A('A1',{max:10})];s.boxes=two('A1');s.config=full}));R('C Warnung im Import-Alert und Historie',/WARNUNG/.test(o.alert)&&mig(o).length===1);await o.h.b.close();
// ===== D Legacy
const legacy=(items,hist)=>({places:{},items,history:hist,orders:[]});
async function loadLeg(obj){const b=await chromium.launch();const p=await (await b.newContext()).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://localhost:8123/index.html');
 await p.evaluate(o=>{localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_demo_v1',JSON.stringify(o))},obj);const orig=await p.evaluate(()=>localStorage.getItem('lagerpilot_demo_v1'));await p.reload();await p.waitForTimeout(700);
 const r=await p.evaluate(()=>({locked:storageLocked,note:upgradeNote,hist:state.history.map(h=>h.text).slice(0,4),n:state.history.length,mig:state.history.filter(h=>h.text.startsWith('Migration:')).length,min:state.items.map(a=>a.min),boxes:state.boxes.map(b=>[b.place,b.code,b.qty,b.blocked])}));r.same=orig===await p.evaluate(()=>localStorage.getItem('lagerpilot_demo_v1'));r.errs=errs;await b.close();return r}
const L1=legacy([{code:'L1',name:'A',minStock:5.5,locations:{'H4A-1-1':{available:3,blocked:1}}},{code:'L2',name:'B',minStock:'10',locations:{}},{code:'L3',name:'C',minStock:4,locations:{}}],Array.from({length:3500},(_,i)=>'e'+i));
let r=await loadLeg(L1);
R('D Laden Legacy: genau 1 Migrationseintrag, enthält Mindestbestände (2) und Historie',r.mig===1&&/2 ungültige Mindestbestände zurückgesetzt/.test(r.hist[0])&&/Historie auf 3\.000/.test(r.hist[0]),r.hist[0]);
R('D Laden Legacy: Reihenfolge Migration, dann "Kopie der Daten"; Länge 3000',/^Migration:/.test(r.hist[0])&&/Kopie der Daten/.test(r.hist[1])&&r.n===3000,r.hist.slice(0,2).join(' // ').slice(0,200)+' n='+r.n);
R('D Laden Legacy: upgradeNote nennt Übernahme + Bereinigung',/LagerPilot 2\.5 übernommen/.test(r.note)&&/Mindestbestände/.test(r.note),r.note.slice(0,220));
R('D Laden Legacy: min [null,null,4]; Menge 4/gesperrt 1; Original unverändert; nicht gesperrt; keine Fehler',JSON.stringify(r.min)==='[null,null,4]'&&JSON.stringify(r.boxes)==='[["H4A-1-1","L1",4,1]]'&&r.same&&!r.locked&&r.errs.length===0);
r=await loadLeg(legacy([{code:'L1',name:'A',minStock:3,locations:{'H4A-1-1':{available:2,blocked:0}}}],['a','b']));
R('D Legacy sauber: kein Migrationseintrag, Hinweis nur Übernahme',r.mig===0&&!/Mindest|Historie auf/.test(r.note)&&r.n===3,'note='+r.note.slice(0,100)+' n='+r.n);
r=await loadLeg(legacy([{code:'L1',name:'A',minStock:1,locations:{}}],Array.from({length:2999},(_,i)=>'e'+i)));
R('D Legacy Historie genau 2999: nicht gekappt, kein Hinweis',r.mig===0&&r.n===3000,'n='+r.n+' mig='+r.mig);
r=await loadLeg(legacy([{code:'L1',name:'A',minStock:1,locations:{}}],Array.from({length:3000},(_,i)=>'e'+i)));
R('D Legacy Historie 3000: Hinweis gekappt (Info)',r.n===3000&&r.mig===1,'n='+r.n+' mig='+r.mig+' '+r.hist[0].slice(0,80));
o=await imp('legacy imp',L1);{const m=mig(o);R('D Import Legacy: 1 Migrationseintrag, Alert nennt Bereinigung, Bestand korrekt',o.changed&&m.length===1&&/Mindestbestände/.test(o.alert)&&JSON.stringify(o.st.boxes.map(b=>[b.place,b.code,b.qty,b.blocked]))==='[["H4A-1-1","L1",4,1]]',o.alert.replace(/\n/g,' ').slice(0,160));}await o.h.b.close();
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
