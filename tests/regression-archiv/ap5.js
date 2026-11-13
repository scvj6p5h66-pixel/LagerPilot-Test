const {open}=require('./lib');const fs=require('fs');const {chromium}=require('playwright');
const D='/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad/t/';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7';
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
(async()=>{
let h0=await open();const B=await h0.ev(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')));await h0.b.close();
const A=(c,x={})=>({code:c,name:'Art '+c,barcode:'',unit:'STK',pack:1,weight:1,max:1000,min:null,...x});
const bx=(id,pl,c,q,b=0,x={})=>({id,place:pl,code:c,qty:q,blocked:b,...x});
const H=n=>Array.from({length:n},(_,i)=>({at:new Date().toISOString(),text:'h'+i}));
const mk26=f=>{const s=structuredClone(B);s.schema=26;delete s.inventoryLogs;f(s);return s};
async function imp(name,obj,{raw}={}){const h=await open({acceptDownloads:true});await h.p.evaluate(()=>{const a=window.alert;window.alert=m=>{sessionStorage.setItem('lastAlert',String(m));a(m)}});
 await h.ev(()=>{transaction(s=>{s.items.push({code:'KEEP',name:'K',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})})});
 const before=await ls(h.p,K);const f=D+'ap5_'+name.replace(/\W+/g,'_')+'.json';fs.writeFileSync(f,raw??JSON.stringify(obj));
 await h.go('more');await h.p.setInputFiles('#jsonImport',f);await h.p.waitForTimeout(1500);
 const after=await ls(h.p,K);const st=after&&after!==before?JSON.parse(after):null;
 const alert=await h.p.evaluate(()=>sessionStorage.getItem('lastAlert')||'');const msg=await h.p.evaluate(()=>document.getElementById('backupMessage')?.textContent.trim()||'');
 return {changed:after!==before,st,alert,msg,errs:h.errs.slice(),h}}
const mig=o=>o.st&&o.st.history.find(x=>x.text.startsWith('Migration: '));
let o;
// 1 + 2: alle Bereinigungen
o=await imp('alles',mk26(s=>{s.items=[A('A1',{min:'x'}),A('A2',{min:1.5}),A('A3',{min:4})];s.boxes=[bx('b1','H4A-1-1','A1',2),bx('b2','H4A-1-1','A1',3),bx('b3','H4A-1-1','A1',4),bx('b4','H4A-1-2','A2',1),bx('b5','H4A-1-2','A2',1)];s.history=H(3500);s.inventoryLogs=Array.from({length:10500},()=>({at:'x',place:'H4A-1-1',code:'A1',before:0,count:1}));s.config={shelf:900,bay:2000};s.qrMap={toString:'H4A-1-1',constructor:'H4A-1-2',QR1:'H4A-2-1'}}));
const m=mig(o);const t=m?m.text:'';
R('1 Migrationseintrag als neuester Verlaufseintrag vorhanden',!!m&&o.st.history[0]===m||(m&&o.st.history[0].text===m.text),t.slice(0,300));
R('1 dokumentiert: Konfiguration ergänzt (palletMax, tare)',/Konfiguration ergänzt: palletMax, tare/.test(t));
R('1 dokumentiert: Historie begrenzt',/Historie auf 3\.000/.test(t));
R('1 dokumentiert: Inventurprotokolle begrenzt',/Inventurprotokolle auf 10\.000/.test(t));
R('1 dokumentiert: 2 Mindestbestände zurückgesetzt',/2 ungültige Mindestbestände/.test(t));
R('1 dokumentiert: 2 QR-Zuordnungen entfernt',/2 reservierte QR/.test(t));
R('2 dokumentiert: 3 überzählige Boxen zusammengeführt (b1+b2+b3 -> 1, b4+b5 -> 1 = 3 entfernt)',/3 doppelte Box/.test(t),t.match(/\d+ doppelte Box\(en\)[^;]*/)?.[0]);
R('2 Mengen: A1 am Platz = 9, A2 = 2; Gesamtzahl Boxen 2 (+KEEP-frei)',o.st.boxes.length===2&&o.st.boxes.find(b=>b.code==='A1').qty===9&&o.st.boxes.find(b=>b.code==='A2').qty===2,JSON.stringify(o.st.boxes.map(b=>[b.code,b.qty])));
R('1 Verlauf auf 3000 inkl. Migrationseintrag, Originaleinträge h0.. folgen',o.st.history.length===3000&&o.st.history[1].text==='h0');
R('1 Protokolle 10000, Config ergänzt gespeichert',o.st.inventoryLogs.length===10000&&JSON.stringify(o.st.config)==='{"shelf":900,"bay":2000,"palletMax":null,"tare":null}');
R('4 Import-Hinweis (Alert) enthält Migrationsprotokoll',/Migration: /.test(o.alert)&&/Sicherung importiert/.test(o.alert),o.alert.slice(0,120).replace(/\n/g,' '));
R('keine JS-Fehler',o.errs.length===0,o.errs.join('|'));await o.h.b.close();
// Nicht dokumentierte Bereinigungen
o=await imp('26 sauber',mk26(s=>{s.items=[A('A1',{min:3})];s.boxes=[bx('b1','H4A-1-1','A1',5,2,{qsReason:'QS'})];s.config={shelf:800,bay:2000,palletMax:1000,tare:25};s.history=H(10);s.qrMap={QR1:'H4A-3-3'};s.places['H4A-5-5']={status:'locked',reason:'Defekt'};s.inventoryLogs=[{at:'x',place:'H4A-1-1',code:'A1',before:1,count:5}]}));
R('5 Sauberes Schema 26: kein Migrationseintrag',o.changed&&!mig(o)&&o.st.history.length===10,'hist='+(o.st&&o.st.history.length));
const strip=s=>JSON.stringify({i:s.items,b:s.boxes,c:s.config,q:s.qrMap,p:s.places['H4A-5-5'],l:s.inventoryLogs,h:s.history.map(x=>x.text)});
R('5 Sauberes Schema 26: Artikel/Boxen/Config/QR/Platz/Logs/Historie unverändert (Schema 27 gesetzt)',o.st.schema===27&&strip(o.st)===strip(mk26(s=>{s.items=[A('A1',{min:3})];s.boxes=[bx('b1','H4A-1-1','A1',5,2,{qsReason:'QS'})];s.config={shelf:800,bay:2000,palletMax:1000,tare:25};s.history=H(10);s.qrMap={QR1:'H4A-3-3'};s.places['H4A-5-5']={status:'locked',reason:'Defekt'};s.inventoryLogs=[{at:'x',place:'H4A-1-1',code:'A1',before:1,count:5}]})),'');
R('5 Hinweis ohne Migration: kein Migrationstext im Alert',!/Migration:/.test(o.alert),o.alert.replace(/\n/g,' ').slice(0,100));await o.h.b.close();
// Schema 27 unverändert
o=await imp('27 gueltig',Object.assign(structuredClone(B),{items:[A('A1')],boxes:[bx('b1','H4A-1-1','A1',4)]}));R('5 Schema 27: Import unverändert, kein Migrationseintrag',o.changed&&!mig(o)&&o.st.boxes[0].qty===4);await o.h.b.close();
// Datenverlust QS-Felder
o=await imp('dup qs',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',5,0),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Beschädigt',qsBy:'Max',qsSince:'2026-01-01T00:00:00Z'})]}));
const mb=o.st&&o.st.boxes[0];R('2/Datenverlust: zusammengeführte Box mit gesperrter Menge behält QS-Grund/-Person des gesperrten Teils',!!mb&&mb.qty===8&&mb.blocked===3&&mb.qsReason==='Beschädigt'&&mb.qsBy==='Max',JSON.stringify(mb));await o.h.b.close();
o=await imp('dup qs2',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('b1','H4A-1-1','A1',5,2,{qsReason:'Grund1',qsBy:'Max'}),bx('b2','H4A-1-1','A1',3,3,{qsReason:'Grund2',qsBy:'Eva'})]}));
const mb2=o.st&&o.st.boxes[0];R('2/Datenverlust: zwei gesperrte Teile mit verschiedenen QS-Gründen -> beide Gründe erhalten oder dokumentiert',!!mb2&&(JSON.stringify(mb2).includes('Grund2')||/Grund2/.test(JSON.stringify(mig(o)))),JSON.stringify(mb2));await o.h.b.close();
// 3 Kapazitätswarnungen
const cfg=(x={})=>({shelf:800,bay:2000,palletMax:1000,tare:25,...x});
const warnCase=async(n,items,boxes,config,expectWarn)=>{o=await imp('warn '+n,mk26(s=>{s.items=items;s.boxes=boxes;s.config=config}));const w=(mig(o)?.text||'').match(/WARNUNG: (\d+)/);const got=w?+w[1]:0;
 R('3 Warnung '+n,got===expectWarn&&o.changed,'erwartet '+expectWarn+', erhalten '+got+' | '+(mig(o)?.text||'(kein Eintrag)').slice(0,200));await o.h.b.close();};
await warnCase('Artikel-Max überschritten (6+6>10)',[A('A1',{max:10,weight:1})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg(),1);
await warnCase('Fachlast überschritten (6+6 × 100 kg)',[A('A1',{max:1000,weight:100})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg(),1);
await warnCase('Zusammenführung im Limit -> keine Warnung',[A('A1',{max:100,weight:1})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg(),0);
await warnCase('zwei überschrittene Boxen -> Zähler 2',[A('A1',{max:10}),A('A2',{max:10})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6),bx('c','H4A-1-2','A2',6),bx('d','H4A-1-2','A2',6)],cfg(),2);
await warnCase('nicht zusammengeführte Box über Max -> keine Warnung (Info)',[A('A1',{max:10})],[bx('a','H4A-1-1','A1',20)],cfg(),0);
await warnCase('Palettentragfähigkeit überschritten (nur palletMax 500)',[A('A1',{max:1000,weight:50})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg({shelf:5000,bay:5000,palletMax:500}),1);
await warnCase('Feldlast überschritten (nur bay 500)',[A('A1',{max:1000,weight:50})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg({shelf:5000,palletMax:5000,bay:500}),1);
await warnCase('Gewicht überschritten, aber tare fehlt (null)',[A('A1',{max:1000,weight:300})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg({tare:null}),1);
await warnCase('Warnung nur bei Artikel mit weight=null: Max nicht überschritten',[A('A1',{max:1000,weight:null})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg(),0);
await warnCase('Artikel ohne Max (null) nach Merge -> Info',[A('A1',{max:null})],[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)],cfg(),0);
// Warnung sichtbar im Alert
o=await imp('warn alert',mk26(s=>{s.items=[A('A1',{max:10})];s.boxes=[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)]}));R('3/4 Warnung erscheint im Import-Alert',/WARNUNG/.test(o.alert),o.alert.replace(/\n/g,' ').slice(0,200));
{const hh=o.h;await hh.go('more');R('3 Verlauf zeigt Migrationseintrag im UI',await hh.p.evaluate(()=>/Migration:/.test(document.body.innerText)));}await o.h.b.close();
// 6 Fehlerfälle
for(const [n,f] of [['history Objekt',s=>{s.history={a:1}}],['history String',s=>{s.history='abc'}],['history null',s=>{s.history=null}],['inventoryLogs Objekt',s=>{s.inventoryLogs={}}],['inventoryLogs String',s=>{s.inventoryLogs='x'}],['places []',s=>{s.places=[]}],['places String',s=>{s.places='x'}],['places null',s=>{s.places=null}],['places Zahl',s=>{s.places=5}],['places {} leer',s=>{s.places={}}]]){
 const src=mk26(f);if(n==='inventoryLogs Objekt'||n==='inventoryLogs String'){src.inventoryLogs=n==='inventoryLogs Objekt'?{}:'x'}
 o=await imp('err '+n,src);const rejected=!o.changed;
 R('6 '+n+': '+(n==='places {} leer'||n==='history null'?'(Info) ':'')+'sauber behandelt, ohne JS-Fehler/Rohtext',o.errs.length===0&&!/is not a function|Cannot read|undefined|TypeError/.test(o.msg+o.alert)&&(rejected?o.msg.length>0:true),'changed='+o.changed+' msg='+o.msg.slice(0,90)+(o.st?' places='+Object.keys(o.st.places).length+' hist='+o.st.history.length:''));await o.h.b.close();}
// 4 Laden aus 2.6
async function load(name,obj,key){const b=await chromium.launch();const c=await b.newContext();const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://localhost:8123/index.html');
 await p.evaluate(([o,key])=>{localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem(key,JSON.stringify(o))},[obj,key]);const orig=await p.evaluate(k=>localStorage.getItem(k),key);await p.reload();await p.waitForTimeout(700);
 const r=await p.evaluate(()=>({locked:storageLocked,note:upgradeNote,hist0:state.history[0]?.text,boxes:state.boxes.map(b=>[b.place,b.code,b.qty,b.blocked]),vis:document.body.innerText.includes('Daten aus Version 2.6'),visMig:/Migration:/.test(document.body.innerText)}));r.origSame=orig===await p.evaluate(k=>localStorage.getItem(k),key);r.errs=errs;r.p=p;r.b=b;return r}
let r=await load('26 mig',mk26(s=>{s.items=[A('A1',{max:10})];s.boxes=[bx('a','H4A-1-1','A1',6),bx('b','H4A-1-1','A1',6)];s.config={shelf:800};s.history=H(3200)}),'lagerpilot_v2_6');
R('4 Laden v2.6: upgradeNote enthält Übernahme + Migrationsprotokoll + Warnung',/2\.6 übernommen/.test(r.note)&&/Migration: /.test(r.note)&&/WARNUNG/.test(r.note),r.note.slice(0,260));
R('4 Laden v2.6: Hinweis im UI sichtbar',r.vis||r.visMig,'vis='+r.vis+' mig='+r.visMig);
R('5 Laden v2.6: Original-Schlüssel unverändert, 1 zusammengeführte Box (12)',r.origSame&&JSON.stringify(r.boxes)===JSON.stringify([['H4A-1-1','A1',12,0]]));
R('Laden: keine JS-Fehler, nicht gesperrt',r.errs.length===0&&!r.locked);await r.b.close();
r=await load('26 clean',mk26(s=>{s.items=[A('A1')];s.boxes=[bx('a','H4A-1-1','A1',6)]}),'lagerpilot_v2_6');
R('4/5 Laden sauberes v2.6: Hinweis nur "übernommen", kein Migrationseintrag, Bestand gleich',/2\.6 übernommen/.test(r.note)&&!/Migration:/.test(r.note)&&!/Migration:/.test(r.hist0||'')&&JSON.stringify(r.boxes)===JSON.stringify([['H4A-1-1','A1',6,0]]),r.note);await r.b.close();
r=await load('26 places []',mk26(s=>{s.places=[]}),'lagerpilot_v2_6');R('6 Laden v2.6 mit places []: Sperre/Quarantäne, Original unverändert, kein JS-Fehler',r.locked&&r.origSame&&r.errs.length===0,'locked='+r.locked);await r.b.close();
r=await load('26 hist obj',mk26(s=>{s.history={a:1}}),'lagerpilot_v2_6');R('6 Laden v2.6 mit ungültiger Historie: Sperre, Original unverändert',r.locked&&r.origSame&&r.errs.length===0);await r.b.close();
// Legacy
const leg={places:{},items:[{code:'L1',name:'A',minStock:5.5,locations:{'H4A-1-1':{available:3,blocked:1}}}],history:Array.from({length:3500},(_,i)=>'e'+i),orders:[]};
r=await load('legacy',leg,'lagerpilot_demo_v1');
R('Info Legacy: Laden dokumentiert Bereinigung (Migrationseintrag/Hinweis)?',true,'note="'+r.note+'" hist0="'+r.hist0+'" ; min zurückgesetzt/Historie gekappt ohne Protokoll: '+(!/Migration:/.test(r.hist0||'')));
R('5 Legacy: Hauptschlüssel unverändert, Menge 3/gesperrt 1 korrekt',r.origSame&&JSON.stringify(r.boxes)===JSON.stringify([['H4A-1-1','L1',3,1]]));await r.b.close();
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
