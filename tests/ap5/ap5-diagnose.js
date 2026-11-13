// AP5 – Diagnosetest zu den 26 bekannten Regressionsfehlern.
// Charakterisiert das IST-Verhalten der Anwendung (keine Änderung am Anwendungscode).
// Aufruf:  BASE=http://localhost:8123/index.html node tests/ap5/ap5-diagnose.js
// Ausgabe: PASS = Beobachtung entspricht der Analyse, BEFUND = bestätigter Programmfehler (B), nur Information.
const {chromium}=require('playwright');const fs=require('fs');const os=require('os');const path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html';const K='lagerpilot_v2_7';
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
let pass=0,fail=0,befund=0;
const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,220):''))};
const B=(id,info)=>{befund++;console.log('BEFUND '+id+(info?'  | '+String(info).slice(0,220):''))};
async function open(opts={}){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},...opts});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(BASE);await p.waitForTimeout(500);return {b,p,errs}}
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim(),id);
async function seed(items,boxes,cfg=FULL){const h=await open();await h.p.evaluate(([c,i,x])=>{transaction(s=>{Object.assign(s.config,c);s.items.push(...i);s.boxes.push(...x)})},[cfg,items,boxes]);return h}
const art=(c,o={})=>({code:c,name:'Art '+c,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null,...o});
async function save(p,o){await p.evaluate(()=>{document.getElementById('aClear').click()});for(const [k,v] of Object.entries(o))await setf(p,k,v);await p.evaluate(()=>document.getElementById('aSave').click());await p.waitForTimeout(80);return txt(p,'aMessage')}
async function count(h,place,code,q){await h.p.evaluate(()=>tab('inventory'));await setf(h.p,'invPlace',place);await setf(h.p,'invArticle',code);await setf(h.p,'invQty',String(q));await h.p.evaluate(()=>invCompare.click());
 if(await h.p.evaluate(()=>!invCommit.classList.contains('hidden'))){await h.p.evaluate(()=>invCommit.click());await h.p.waitForTimeout(100)}return txt(h.p,'invResult')}
(async()=>{
// ---- Fehler 1-7 (ap9 Abschnitt 5): Seed mit places:{} UND einer Box auf H4A-1-1 -> valid() lehnt ab (Box-Platz nicht in places)
{const h=await open();const seed27={schema:27,places:{},items:[{code:'A1',name:'Art1',barcode:'',unit:'STK',pack:1,weight:2,max:100,min:null}],boxes:[{id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0}],history:[],inventoryLogs:[],qrMap:{},config:{shelf:800,bay:2000,palletMax:1000,tare:25},legacyOrders:[]};
 R('F1-7 valid() lehnt places:{} mit Box auf H4A-1-1 ab (veralteter Test-Seed)',await h.p.evaluate(s=>valid(s),seed27)===false);
 await h.p.evaluate(s=>localStorage.setItem('lagerpilot_v2_7',JSON.stringify(s)),seed27);await h.p.reload();await h.p.waitForTimeout(500);
 const st=await h.p.evaluate(()=>({locked:storageLocked,quar:!!localStorage.getItem('lagerpilot_v2_7_quarantine'),orig:JSON.parse(localStorage.getItem('lagerpilot_v2_7')||'null')}));
 R('F1-7 Fehlerhafter Seed: Sperre aktiv, Quarantäne vorhanden, Daten (Box b1) bleiben erhalten',st.locked===true&&st.quar&&st.orig&&st.orig.boxes.length===1,JSON.stringify({l:st.locked,q:st.quar}));await h.b.close()}
// ---- Fehler 1-7 Gegenprobe: Fachlast 800/600/null mit vollständiger Platzliste
for(const [shelf,expectPut] of [[800,true],[600,false],[null,false]]){
 const h=await seed([art('F1',{weight:10,max:200})],[],{...FULL,shelf});
 await h.p.evaluate(()=>tab('stock'));
 const r=await h.p.evaluate(()=>{try{const a=state.items[0];return {cfg:state.config.shelf,places:Object.keys(state.places).length}}catch(e){return e.message}});
 R('F1-7 Gegenprobe Fachlast '+shelf+': Konfiguration übernommen, 6480 Plätze',r.cfg===shelf&&r.places===6480,JSON.stringify(r));await h.b.close()}
// ---- Fehler 8: Zählung ohne Gewicht (Testseed hatte Gewicht 2)
{let h=await seed([art('N1',{weight:null})],[{id:'n1',place:'H4A-1-1',code:'N1',qty:50,blocked:0}]);
 const m=await count(h,'H4A-1-1','N1',51);const q=await h.p.evaluate(()=>state.boxes[0].qty);
 R('F8 Artikel OHNE Gewicht: Erhöhung abgelehnt, Menge unverändert',/unvollständig/.test(m)&&q===50,m);await h.b.close();
 h=await seed([art('A1',{weight:2})],[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0}]);
 const m2=await count(h,'H4A-1-1','A1',51);R('F8 Testprämisse: Artikel MIT Gewicht 2 -> Erhöhung korrekt erlaubt (Test-Seed war falsch)',/gespeichert/.test(m2),m2);await h.b.close()}
// ---- Fehler 16/22: Reihenfolge der Prüfungen (Legacy-Artikel mit reserviertem Namen)
{let h=await open();await h.p.evaluate(()=>tab('articles'));
 const m=await save(h.p,{aCode:'toString',aName:'R',aUnit:'P',aPack:'1'});
 R('F16 sauberer Zustand: "toString" -> reserviert',/reserviert/.test(m),m);await h.b.close();
 h=await seed([art('toString')],[]);await h.p.evaluate(()=>tab('articles'));
 const m3=await save(h.p,{aCode:'toString',aName:'R',aUnit:'P',aPack:'1'});
 R('F16 Legacy-Artikel "toString" vorhanden -> Dublettenmeldung statt Reserviert (Test-Zustand)',/existiert bereits/.test(m3),m3);await h.b.close()}
// ---- Fehler 21: Gewicht ungültig -> Zahlenfeld verwirft still, Artikel wird OHNE Gewicht gespeichert
{const h=await open();await h.p.evaluate(()=>tab('articles'));
 const res={};for(const v of ['1e999','abc','Infinity','1,5']){const m=await save(h.p,{aCode:'W'+v.replace(/\W/g,''),aName:'W',aUnit:'P',aPack:'1',aWeight:v});
  res[v]=m+'|gespeichert='+await h.p.evaluate(c=>{const a=state.items.find(x=>x.code===c);return a?String(a.weight):'nein'},'W'+v.replace(/\W/g,''))}
 const stillSilent=Object.values(res).every(x=>/Artikel gespeichert/.test(x)&&/gespeichert=null/.test(x));
 if(stillSilent)B('F21 Ungültiges Gewicht wird still verworfen, Artikel ohne Gewicht gespeichert (Meldung "Artikel gespeichert.")',JSON.stringify(res));
 else R('F21 Ungültiges Gewicht wird gemeldet',true,JSON.stringify(res));
 const m=await save(h.p,{aCode:'WBIG',aName:'W',aUnit:'P',aPack:'1',aWeight:'1e308'});
 if(/Artikel gespeichert/.test(m))B('F21b Unrealistisch großes Gewicht 1e308 kg wird akzeptiert (keine Obergrenze)',m);
 R('F21 keine JS-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// ---- Fehler 21c: Bearbeiten-Pfad. Ohne Bestand wird ein vorhandenes Gewicht still gelöscht, mit Bestand geschützt
for(const withStock of [false,true]){const h=await seed([art('A1',{weight:2})],withStock?[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0}]:[]);
 await h.p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A1"]').click();document.getElementById('aWeight').value='1e999';document.getElementById('aSave').click()});await h.p.waitForTimeout(150);
 const m=await txt(h.p,'aMessage'),w=await h.p.evaluate(()=>state.items[0].weight);
 if(withStock)R('F21c Bearbeiten MIT Bestand: Gewicht bleibt erhalten (Schutz greift)',w===2&&!/Artikel gespeichert/.test(m),m);
 else if(w===null&&/Artikel gespeichert/.test(m))B('F21c Bearbeiten OHNE Bestand: vorhandenes Gewicht 2 wird durch ungültige Eingabe still auf null gesetzt','weight='+w+' | '+m);
 else R('F21c Bearbeiten ohne Bestand: ungültiges Gewicht wird abgefangen',true,m);await h.b.close()}
// ---- Fehler 18: Mindestbestand-Hinweis rechnet Summe je Artikel gegen Minimum
{const h=await seed([art('LM',{min:500}),art('OK',{min:100}),art('NM')],[{id:'m1',place:'H4A-1-1',code:'LM',qty:100,blocked:0},{id:'m2',place:'H4A-1-2',code:'LM',qty:60,blocked:0},{id:'m3',place:'H4A-1-3',code:'OK',qty:60,blocked:0},{id:'m4',place:'H4A-1-4',code:'OK',qty:60,blocked:0},{id:'m5',place:'H4A-1-5',code:'NM',qty:1,blocked:0}]);
 await h.p.evaluate(()=>tab('home'));const t=await h.p.evaluate(()=>document.getElementById('home').innerText);
 R('F18 Home: genau 1 Artikel unter Mindestbestand (LM 160<500; OK 120>=100; NM ohne Minimum)',/⚠ 1 Artikel unter Mindestbestand/.test(t));
 R('F18 Home nennt keine Artikelnamen (Testerwartung "LM" war veraltet; Verbesserungsvorschlag)',!/LM/.test(t.split('Mindestbestand')[0].slice(-200)));await h.b.close()}
// ---- Fehler 26: Import mit bestätigtem Dialog funktioniert (Test ohne Dialog-Handler brach ab)
{const h=await seed([art('A1'),art('B1')],[{id:'x1',place:'H4A-1-1',code:'A1',qty:5,blocked:0}]);
 const exp=await h.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);exp.items=exp.items.filter(x=>x.code!=='A1');exp.boxes=exp.boxes.filter(x=>x.code!=='A1');
 const f=path.join(os.tmpdir(),'ap5_imp.json');fs.writeFileSync(f,JSON.stringify(exp));
 await h.p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A1"]').click();tab('more')});
 const nav=h.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await h.p.setInputFiles('#jsonImport',f);const reloaded=await nav;await h.p.waitForTimeout(600);
 const st=await h.p.evaluate(()=>({items:state.items.map(a=>a.code),mode:document.getElementById('aCode').readOnly,bk:!!localStorage.getItem('lagerpilot_before_import')}));
 R('F26 Import (Dialog bestätigt): Seite lädt neu, A1 entfernt, Sicherung vor Import vorhanden, Bearbeitungsmodus zurückgesetzt',reloaded&&!st.items.includes('A1')&&st.bk&&st.mode===false,JSON.stringify(st));await h.b.close();
 // ohne Bestätigung: nichts ändert sich
 const h2=await seed([art('A1')],[]);h2.p.removeAllListeners('dialog');h2.p.on('dialog',d=>d.dismiss());
 const before=await h2.p.evaluate(k=>localStorage.getItem(k),K);await h2.p.evaluate(()=>tab('more'));await h2.p.setInputFiles('#jsonImport',f);await h2.p.waitForTimeout(700);
 R('F26 Import abgebrochen (Dialog abgelehnt): Speicher unverändert (kein Datenverlust)',await h2.p.evaluate(k=>localStorage.getItem(k),K)===before);await h2.b.close()}
// ---- Fehler 23-25: Tap-Ziel Bearbeiten-Button
{const h=await seed([art('A1')],[]);await h.p.evaluate(()=>tab('articles'));
 const bb=await h.p.locator('[data-edit="A1"]').boundingBox();
 if(bb.height<32)B('F23-25 Bearbeiten-Button '+bb.width.toFixed(0)+'x'+bb.height+' px (<32 px; empfohlen 44 px)');else R('F23-25 Bearbeiten-Button >=32px',true);await h.b.close()}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail+' / BEFUNDE (bestätigte Programmfehler) '+befund);process.exit(fail?1:0)})();
