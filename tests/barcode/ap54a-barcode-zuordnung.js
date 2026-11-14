// AP5.4a – Barcode-Zuordnung: Wie kann ein Barcode zu zwei Artikeln gehören, was zeigt die App, wo wird "erster Treffer" gewählt?
// Aufruf: BASE=http://localhost:8123/index.html node tests/barcode/ap54a-barcode-zuordnung.js
// PASS/FAIL = geprüfte Erwartung an das Ist-Verhalten; BEFUND = nachgewiesenes Risiko (kein Testfehler, keine Änderung am Anwendungscode).
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html',K='lagerpilot_v2_7';
let pass=0,fail=0,bef=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).replace(/\s+/g,' ').slice(0,210):''))};
const B=(id,info)=>{bef++;console.log('BEFUND '+id+(info?'  | '+String(info).replace(/\s+/g,' ').slice(0,230):''))};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'ap54a-'));
const it=(code,name,barcode,o={})=>({code,name,barcode,unit:'STK',pack:1,weight:1,max:100,min:null,...o});
async function app(items,boxes=[]){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900},acceptDownloads:true});const p=await ctx.newPage();const st={errs:[],dlg:[]};p.on('pageerror',e=>st.errs.push(e.message));p.on('dialog',d=>{st.dlg.push(d.type()+':'+d.message());d.accept()});
 await p.goto(BASE);await p.waitForTimeout(300);
 await p.evaluate(([it,bx])=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push(...it);s.boxes.push(...bx)});window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video></video>';window.__cb=cb}async stop(){}async clear(){}}},[items,boxes]);return {b,p,st}}
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim(),id);
const cam=async(a,target,code)=>{await a.p.evaluate(t=>{window.__cb=null;return startCamera(t)},target);await a.p.waitForTimeout(150);await a.p.evaluate(c=>window.__cb&&window.__cb(c),code);await a.p.waitForTimeout(250)};
const items=(order)=>{const A1=it('A1','Art Eins','BC1'),L2=it('L2','Art Zwei (Legacy)','bc1');return order==='AL'?[A1,L2]:[L2,A1]};
(async()=>{
// ---------- 1 Wie können zwei Artikel denselben Barcode haben? ----------
{const a=await app(items('AL'));const before=await a.p.evaluate(k=>localStorage.getItem(k),K);
 for(const [lbl,bc] of [['exakt gleicher Barcode BC1','BC1'],['Schreibweise bc1','bc1'],['Schreibweise Bc1','Bc1']]){
  await a.p.evaluate(()=>{tab('articles');aClear.click()});await a.p.evaluate(([bc])=>{aName.value='Neu';aCode.value='N9';aBarcode.value=bc;aUnit.value='STK';aPack.value='1';aWeight.value='1';aMax.value='5';aSave.click()},[bc]);const m=await txt(a.p,'aMessage');
  R('1 Neuanlage mit '+lbl+' wird abgelehnt, Speicher byte-gleich',!/Artikel gespeichert/.test(m)&&await a.p.evaluate(k=>localStorage.getItem(k),K)===before,m)}
 // Barcode eines Artikels auf den eines anderen ändern
 await a.p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A1"]').click();aBarcode.value='bc1';aSave.click()});const m1=await txt(a.p,'aMessage');R('1 Bestehenden Artikel A1 auf Barcode "bc1" (Barcode von L2) ändern: abgelehnt',!/Artikel gespeichert/.test(m1),m1);
 // Legacy-Artikel L2 ohne Barcodeänderung speichern: erlaubt (kein Auto-Korrigieren), Barcode bleibt
 await a.p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="L2"]').click();aName.value='Art Zwei (Legacy) b';aSave.click()});const m2=await txt(a.p,'aMessage');const l2=await a.p.evaluate(()=>state.items.find(x=>x.code==='L2'));
 R('1 Legacy-Artikel L2 (Barcode "bc1") bleibt ohne Barcodeänderung speicherbar, Barcode unverändert (keine Auto-Korrektur)',/Artikel gespeichert/.test(m2)&&l2.barcode==='bc1',m2);
 R('1 JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));await a.b.close()}
// Wege, auf denen Dubletten in einen Bestand gelangen können: Import
async function importCase(name,mutate){const a=await app(items('AL'));const exp=await a.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);mutate(exp);const f=path.join(TMP,name.replace(/\W+/g,'_')+'.json');fs.writeFileSync(f,JSON.stringify(exp));
 const b=await chromium.launch();const c=await b.newContext();const p=await c.newPage();p.on('dialog',d=>d.accept());await p.goto(BASE);await p.waitForTimeout(300);const nav=p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await p.evaluate(()=>tab('more'));await p.setInputFiles('#jsonImport',f);const reloaded=await nav;await p.waitForTimeout(500);
 const msg=await p.evaluate(()=>document.getElementById('backupMessage')?.textContent||'').catch(()=>'');const items2=await p.evaluate(k=>{try{return JSON.parse(localStorage.getItem(k)).items.map(x=>[x.code,x.barcode])}catch{return null}},K);await b.close();await a.b.close();return {reloaded,msg,items2}}
{const r=await importCase('import exakt doppelt',o=>{o.items.find(x=>x.code==='L2').barcode='BC1'});r.reloaded?B('1 Import einer Sicherung, in der zwei Artikel exakt denselben Barcode "BC1" haben: wird ANGENOMMEN (Dublette kann über Import in den Bestand gelangen)',JSON.stringify(r.items2)):R('1 Import mit exakt doppeltem Barcode wird abgelehnt',true,r.msg)}
{const r=await importCase('import schreibweise',o=>{}) ;r.reloaded?R('1 Import mit Schreibweise-Dublette BC1/bc1 wird angenommen (Altdaten bleiben ladbar, bewusst nicht auto-korrigiert)',true,JSON.stringify(r.items2)):R('1 Import Schreibweise-Dublette abgelehnt',false,r.msg)}
// ---------- 2 Verhalten je Scan-Pfad bei Schreibweise-Dublette (A1 "BC1" / L2 "bc1") ----------
for(const order of ['AL','LA']){const a=await app(items(order));const tag='Reihenfolge '+(order==='AL'?'[A1, L2]':'[L2, A1]');
 // Scanner-Tab (exakter, groß/klein-sensitiver Vergleich)
 const scan=async c=>{await a.p.evaluate(c=>{tab('scan');handleScan(c)},c);return txt(a.p,'scanResult')};
 const sBC1=await scan('BC1'),sbc1=await scan('bc1'),sBc1=await scan('Bc1');
 R('2 '+tag+' Scanner-Tab: "BC1" -> nur A1 (eindeutig, unabhängig von der Reihenfolge)',/Art Eins/.test(sBC1)&&!/Art Zwei/.test(sBC1),sBC1);
 R('2 '+tag+' Scanner-Tab: "bc1" -> nur L2 (eindeutig)',/Art Zwei/.test(sbc1)&&!/Art Eins/.test(sbc1),sbc1);
 R('2 '+tag+' Scanner-Tab: "Bc1" -> unbekannter Code (keine Raterei)',/Unbekannter Code/.test(sBc1),sBc1);
 // Artikelformular (neuer Artikel, Barcode scannen): Meldung nennt NUR den ersten Treffer (ohne Groß/Klein)
 for(const c of ['BC1','bc1']){await a.p.evaluate(()=>{tab('articles');aClear.click()});await cam(a,'aBarcode',c);const m=await txt(a.p,'articleScanMessage');const named=/zu (A1|L2)\b/.exec(m);
  R('2 '+tag+' Artikelformular, Scan "'+c+'": Warnung nennt genau einen Artikel',!!named&&await a.p.evaluate(()=>articleScanMessage.className.includes('warning')),m);
  if(c==='BC1')a['formName'+order]=named&&named[1]}
 // Inventur-Artikelscan: erster Treffer, exakt
 for(const c of ['BC1','bc1']){await a.p.evaluate(()=>{tab('inventory');invArticle.value=''});await cam(a,'invArticle',c);const v=await a.p.evaluate(()=>invArticle.value);const exp=c==='BC1'?'A1':'L2';R('2 '+tag+' Inventur-Artikelscan "'+c+'": wählt '+exp+' (exakter Treffer)',v===exp,'gewählt='+v)}
 R('2 '+tag+' JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));a.kept=a;a._n=a.formNameAL;await a.b.close();
 if(order==='AL')global.firstAL=a.formNameAL;else global.firstLA=a.formNameLA}
// Reihenfolgeabhängigkeit der Meldung im Artikelformular
if(global.firstAL&&global.firstLA&&global.firstAL!==global.firstLA)B('2 Artikelformular nennt bei Schreibweise-Dublette den ERSTEN Treffer der Artikelliste: Reihenfolge [A1,L2] -> '+global.firstAL+', Reihenfolge [L2,A1] -> '+global.firstLA+' (der zweite Besitzer wird nicht genannt, nichts wird gespeichert)');
else R('2 Artikelformular: Meldung unabhängig von der Reihenfolge',true,global.firstAL+'/'+global.firstLA);
// ---------- 3 Exakte Dublette (nur aus Altdaten möglich) ----------
{const a=await app([it('X1','Exakt Eins','DUP'),it('X2','Exakt Zwei','DUP')]);
 await a.p.evaluate(()=>{tab('scan');handleScan('DUP')});const m=await txt(a.p,'scanResult');R('3 Scanner-Tab: exakt doppelter Barcode wird dem Benutzer gemeldet und nicht zugeordnet ("mehrfach vergeben … Bitte Zuordnung prüfen")',/mehrfach vergeben/.test(m)&&!/Artikel erkannt/.test(m),m);
 await a.p.evaluate(()=>{tab('inventory');invArticle.value=''});await cam(a,'invArticle','DUP');const v=await a.p.evaluate(()=>invArticle.value),im=await txt(a.p,'invScanMessage');
 /mehrfach|Mehrdeut|prüfen/i.test(im)?R('3 Inventur-Artikelscan meldet die Mehrdeutigkeit',true,im):B('3 Inventur-Artikelscan bei exakt doppeltem Barcode: wählt STILL den ersten Treffer ('+v+'), Meldung: "'+im+'" – keine Mehrdeutigkeitsanzeige (nur der Name des gewählten Artikels erscheint)');
 await a.p.evaluate(()=>{tab('stock')});await cam(a,'stockSearch','DUP');const sm=await txt(a.p,'stockScanMessage'),sv=await a.p.evaluate(()=>document.getElementById('search').value);
 /mehrfach|Mehrdeut/i.test(sm)?R('3 Bestandssuche meldet die Mehrdeutigkeit',true,sm):B('3 Bestandssuche bei exakt doppeltem Barcode: wählt STILL den ersten Treffer ('+sv+'), Meldung: "'+sm+'"');
 await a.p.evaluate(()=>{tab('articles');aClear.click()});await cam(a,'aBarcode','DUP');const am=await txt(a.p,'articleScanMessage');R('3 Artikelformular: Warnung "gehört bereits zu …" (nennt nur einen der beiden)',/gehört bereits zu (X1|X2)/.test(am),am);
 R('3 JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));await a.b.close()}
// ---------- 4 Kommissionierung: erwarteter Artikel entscheidet, nie der erste Treffer ----------
{const a=await app(items('LA'));
 const order={id:'T1',lines:2,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:[{sku:'A1',name:'Art Eins',place:'H4B-1-1',qty:2,actual:2,unitWeight:1},{sku:'L2',name:'Art Zwei',place:'H4B-1-2',qty:2,actual:2,unitWeight:1}],checkedLines:[],scannedLines:[],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:null,tolerancePercent:1}};
 await a.p.evaluate(o=>{localStorage.setItem('lagerpilot_pick_demo_v1',JSON.stringify({people:[{name:'Max',device:'S1',active:true,lastSeen:1}],roster:['Max'],orders:[o],session:'Max',testStatus:{Max:true}}))},order);await a.p.reload();await a.p.waitForTimeout(400);
 const scanLine=(i,code)=>a.p.evaluate(([i,c])=>{pickScanIndex=i;pickScanPhase='article';const r=pickAcceptScan(c);return {r,msg:document.getElementById('pickScanMessage')?.textContent||''}},[i,code]);
 let r=await scanLine(0,'BC1');R('4 Kommissionierung Zeile A1: Scan "BC1" akzeptiert',r.r===true,r.msg);
 r=await scanLine(0,'bc1');R('4 Kommissionierung Zeile A1: Scan "bc1" (Barcode des anderen Artikels L2) wird als "Falscher Artikel" abgelehnt',r.r===false&&/Falscher Artikel/.test(r.msg),r.msg);
 r=await scanLine(1,'BC1');R('4 Kommissionierung Zeile L2: Scan "BC1" (Barcode von A1) wird als "Falscher Artikel" abgelehnt',r.r===false&&/Falscher Artikel/.test(r.msg),r.msg);
 r=await scanLine(1,'bc1');R('4 Kommissionierung Zeile L2: Scan "bc1" akzeptiert',r.r===true,r.msg);
 R('4 JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));await a.b.close()}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail+' / BEFUNDE '+bef);fs.rmSync(TMP,{recursive:true,force:true});process.exit(fail?1:0)})();
