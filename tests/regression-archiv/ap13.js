const fs=require('fs');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,250):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,300),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const L200='L'.repeat(200);
const ITEMS=[{code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3},{code:'A2',name:'Art2',barcode:'bc-two',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'A3',name:'Art3',barcode:'',unit:'STK',pack:1,weight:1,max:50,min:null},
 {code:'L1',name:'Legacy lang',barcode:L200,unit:'STK',pack:1,weight:1,max:100,min:null},{code:'L2',name:'Legacy Case-Dup',barcode:'bc1',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'L3',name:'Legacy constructor',barcode:'constructor',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'L4',name:'Legacy Barcode=Code',barcode:'L4',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'L5',name:'Legacy Barcode=anderer Code',barcode:'A3',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'L6',name:'Legacy Barcode=Code Case',barcode:'l6',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'L7',name:'Legacy 65',barcode:'7'.repeat(65),unit:'STK',pack:1,weight:1,max:100,min:null}];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'L1',qty:5,blocked:0}];
async function mk(base){const {open}=require(base==='old'?'./lib_old':'./lib');const h=await open();await h.p.evaluate(([cfg,it,bx])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...it);s.boxes.push(...bx)})},[FULL,ITEMS,BOX]);
 await h.p.evaluate(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video id=fakevid></video>';window.__cb=cb}async stop(){}async clear(){}}});return h}
const form=h=>h.p.evaluate(()=>({aName:aName.value,aCode:aCode.value,aBarcode:aBarcode.value}));
async function fill(h,o){await h.go('articles');await h.p.evaluate(()=>aClear.click());const base={aName:'X',aCode:'',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'5',aMin:''};for(const [k,x] of Object.entries({...base,...o}))await setf(h.p,k,x)}
async function scan(h,code){await h.go('articles');await h.p.evaluate(()=>aBarcodeCamera.click());await h.p.waitForTimeout(120);await h.p.evaluate(c=>window.__cb&&window.__cb(c),code);await h.p.waitForTimeout(220);return {msg:await txt(h.p,'articleScanMessage'),cls:await h.p.evaluate(()=>articleScanMessage.className)}}
const save=async h=>{await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')};
const ok=m=>/Artikel gespeichert/.test(m);
const edit=async(h,code)=>{await h.go('articles');await h.p.evaluate(c=>document.querySelector('[data-edit="'+c+'"]').click(),code)};
(async()=>{
let h=await mk('new');
// 1 Länge
R('1 Eingabefeld hat maxlength=64',(await h.p.evaluate(()=>aBarcode.getAttribute('maxlength')))==='64');
await h.go('articles');await h.p.fill('#aBarcode','Z'.repeat(80));R('1 Tippen/Einfügen von 80 Zeichen wird vom Browser auf 64 gekürzt',(await h.p.evaluate(()=>aBarcode.value.length))===64);
let b,m,a,r;
for(const [n,len,exp] of [['63',63,true],['64',64,true],['65',65,false],['200',200,false],['5000',5000,false]]){
 await fill(h,{aCode:'N'+len,aName:'N'+len});await h.p.evaluate(v=>{aBarcode.value=v},'q'.repeat(len));b=await snap(h);m=await save(h);a=await snap(h);
 R('1 Neuer Artikel, Barcode '+n+' Zeichen (per Skript am maxlength vorbei): '+(exp?'erlaubt':'abgelehnt'),exp?ok(m)&&a.st.items.find(x=>x.code==='N'+len).barcode.length===len:(!ok(m)&&/höchstens 64/.test(m)&&a.raw===b.raw),m)}
await fill(h,{aCode:'NP',aName:'NP'});await h.p.evaluate(()=>{aBarcode.value='   '+'p'.repeat(64)+'  \n'});m=await save(h);R('1 64 Zeichen mit Leerzeichen/Umbruch außen: Trim, erlaubt',ok(m)&&(await snap(h)).st.items.find(x=>x.code==='NP').barcode==='p'.repeat(64),m);
await fill(h,{aCode:'NE',aName:'NE'});await h.p.evaluate(()=>{aBarcode.value='😀'.repeat(33)});b=await snap(h);m=await save(h);R('1 33 Emoji (66 UTF-16-Einheiten): abgelehnt, nichts geändert (Info: Zählung in UTF-16)',!ok(m)&&(await snap(h)).raw===b.raw,m);
await fill(h,{aCode:'NE2',aName:'NE2'});await h.p.evaluate(()=>{aBarcode.value='😀'.repeat(32)});m=await save(h);R('1 32 Emoji (64 Einheiten): erlaubt',ok(m),m);
// Edit A1: Barcode 65 / 64
await edit(h,'A1');await h.p.evaluate(()=>{aBarcode.value='9'.repeat(65)});b=await snap(h);m=await save(h);R('1 A1 bearbeiten, Barcode auf 65: abgelehnt, A1 unverändert',!ok(m)&&(await snap(h)).raw===b.raw,m);
await h.p.evaluate(()=>{aBarcode.value='9'.repeat(64)});m=await save(h);R('1 A1 Barcode 64: erlaubt, Rest unverändert',ok(m)&&(await snap(h)).st.items.find(x=>x.code==='A1').name==='Art1',m);
// 2 Groß/Klein
await edit(h,'A2');
const dup=async(n,code,barcode,expReject,re)=>{await fill(h,{aCode:code,aName:code});await h.p.evaluate(v=>{aBarcode.value=v},barcode);b=await snap(h);m=await save(h);a=await snap(h);R('2 '+n,expReject?(!ok(m)&&a.raw===b.raw&&(re?re.test(m):true)):ok(m),m)};
await dup('Neuer Artikel, Barcode "bc-two" = A2 (gleich)','D1','bc-two',true,/bereits/);
await dup('Neuer Artikel, Barcode "BC-TWO" (Großschreibung) abgelehnt','D2','BC-TWO',true,/bereits vergeben/);
await dup('Neuer Artikel, Barcode "Bc-Two" abgelehnt','D3','Bc-Two',true,/bereits vergeben/);
await dup('Neuer Artikel, Barcode "a3" (= Artikelnummer A3, klein) abgelehnt','D4','a3',true,/bereits vergeben/);
await dup('Neuer Artikel D5 mit Barcode "d5" (Code ≠ Barcode nur durch Case) abgelehnt','D5','d5',true,/unterschiedlich/);
await dup('Neuer Artikel D6 mit Barcode "D6" abgelehnt','D6','D6',true,/unterschiedlich/);
await dup('Neuer Artikel D7 mit neuem Barcode "unique-7" erlaubt','D7','unique-7',false);
await edit(h,'A2');await h.p.evaluate(()=>{aBarcode.value='BC-TWO'});m=await save(h);R('2 A2 ändert eigenen Barcode nur in der Schreibweise (bc-two → BC-TWO): erlaubt (kein Selbstkonflikt)',ok(m)&&(await snap(h)).st.items.find(x=>x.code==='A2').barcode==='BC-TWO',m);
await edit(h,'A2');await h.p.evaluate(()=>{aBarcode.value='Bc1'});b=await snap(h);m=await save(h);R('2 A2 will "Bc1" (= A1 BC1) : abgelehnt, nichts geändert',!ok(m)&&(await snap(h)).raw===b.raw,m);
await fill(h,{aCode:'a1',aName:'Kleinbuchstaben-Code'});b=await snap(h);m=await save(h);a=await snap(h);R('2 Info: Artikelnummer "a1" neben "A1" wird als eigener Artikel angelegt (Artikelnummern case-sensitiv)',true,'ok='+ok(m)+' Artikel +'+(a.st.items.length-b.st.items.length));
// 3 Reservierte
const RES=['__proto__','constructor','prototype','toString','tostring','TOSTRING','hasOwnProperty','HASOWNPROPERTY','__PROTO__'];
for(const v of RES){await fill(h,{aCode:'R'+Math.floor(Math.random()*1e6),aName:'R'});await h.p.evaluate(x=>{aBarcode.value=x},v);b=await snap(h);m=await save(h);R('3 Barcode "'+v+'" abgelehnt',!ok(m)&&/reserviert/.test(m)&&(await snap(h)).raw===b.raw,m)}
const NOTLISTED=['valueOf','toLocaleString','isPrototypeOf','propertyIsEnumerable','__defineGetter__','__lookupGetter__'];
const notRej=[];for(const v of NOTLISTED){await fill(h,{aCode:'V'+v.slice(0,6),aName:'V'});await h.p.evaluate(x=>{aBarcode.value=x},v);m=await save(h);if(ok(m))notRej.push(v)}
R('3 Info: nicht gesperrte Objekt-Eigenschaftsnamen als Barcode gespeichert: '+notRej.join(', '),true,'');
// Auswirkungen solcher Barcodes auf Scan/Suche
for(const v of notRej){await h.go('scan');await setf(h.p,'scanInput',v).catch(()=>{});}
const errBefore=h.errs.length;
for(const v of notRej.concat(['valueOf'])){await scan(h,v);await h.go('scan');await h.p.evaluate(v=>{const i=document.getElementById('scanCode')||document.querySelector('#scan input');if(i){i.value=v;}const btn=document.getElementById('scanSearch')||document.querySelector('#scan button');btn&&btn.click()},v);await h.go('stock');await h.p.evaluate(v=>{search.value=v;search.dispatchEvent(new Event('input'))},v)}
R('3 Folgeprüfung: Scan-/Bestandssuche mit solchen Barcodes ohne JS-Fehler',h.errs.length===errBefore,h.errs.slice(errBefore).join('|').slice(0,200));
// Reservierte Artikelnummern/Namen
for(const c of ['constructor','__proto__','toString']){await fill(h,{aCode:c,aName:'Res'});b=await snap(h);m=await save(h);R('3 Info: Artikelnummer "'+c+'" '+(ok(m)?'gespeichert (nicht gesperrt, SA-12 Rest)':'abgelehnt'),true,m)}
// 4 Scan-Warnungen
await fill(h,{aCode:'W1',aName:'W1'});b=await snap(h);
// AP5.4a: Ursache des früheren Fehlers #11: Ein früherer Schritt DIESES Testlaufs hat den Barcode von A1 auf eine 64-stellige Zahl geändert; "BC1" gehört hier also nicht mehr zu A1, die Warnung nennt zu Recht den einzigen verbliebenen Besitzer L2. Erwartung daher unabhängig aus dem aktuellen Speicher berechnet (kein "A1 oder L2").
const ownerBc1=await h.p.evaluate(()=>{const m=state.items.filter(x=>String(x.barcode||'').toLowerCase()==='bc1').map(x=>x.code);return m});
r=await scan(h,'BC1');R('4 Scan bekannter Barcode (neues Formular): Warnung nennt den Besitzer laut Speicher ('+ownerBc1.join(',')+'; A1 trägt in diesem Testverlauf bereits einen anderen Barcode)',ownerBc1.length===1&&new RegExp('gehört bereits zu '+ownerBc1[0]+'\\b').test(r.msg)&&/warning/.test(r.cls),r.msg+' | '+r.cls);
{const hF=await mk('new');const rf=await scan(hF,'BC1');R('4 Scan "BC1" im frischen Zustand (A1 "BC1", L2 "bc1" = Schreibweise-Dublette): seit AP5.5 Warnung "Mehrdeutiger Barcode" mit BEIDEN Artikeln A1 und L2',/Mehrdeutiger Barcode/.test(rf.msg)&&/\bA1\b/.test(rf.msg)&&/\bL2\b/.test(rf.msg)&&/warning/.test(rf.cls),rf.msg+' | '+rf.cls);
 const sc=await hF.p.evaluate(()=>{const out=[];for(const c of ['BC1','bc1']){const ex=state.items.filter(a=>a.code===c||a.barcode===c).map(a=>a.name);tab('scan');handleScan(c);out.push({c,ex,msg:document.getElementById('scanResult').textContent})}return out});// Scanner-Tab vergleicht exakt (Groß/Klein); Erwartung unabhängig aus dem Speicher: 1 Treffer -> dessen Name, 0 -> unbekannt, >1 -> Mehrdeutigkeit gemeldet
 for(const x of sc)R('4 Frischer Zustand, Scanner-Tab Code "'+x.c+'": '+(x.ex.length===1?'genau ein exakter Treffer ('+x.ex[0]+') -> dieser Artikel':x.ex.length===0?'kein exakter Treffer -> "Unbekannter Code"':'mehrere exakte Treffer -> Mehrdeutigkeit gemeldet'),x.ex.length===1?x.msg.includes('Artikel erkannt: '+x.ex[0]):x.ex.length===0?/Unbekannter Code/.test(x.msg):/mehrfach vergeben/.test(x.msg),x.msg);
 R('4 Frischer Zustand: "BC1" -> Art1 und "bc1" -> Legacy Case-Dup (zwei verschiedene exakte Treffer, keine Verwechslung)',sc[0].ex.join()==='Art1'&&sc[1].ex.join()==='Legacy Case-Dup');await hF.b.close()}
r=await scan(h,'bc1');R('4 Scan "bc1" (Case-Variante): ebenfalls Warnung (nennt den Besitzer laut Speicher)',new RegExp('gehört bereits zu '+ownerBc1[0]+'\\b').test(r.msg)&&/warning/.test(r.cls),r.msg);
R('4 Scan speichert nichts',(await snap(h)).raw===b.raw);
await edit(h,'A1');r=await scan(h,'9'.repeat(64));R('4 Scan beim Bearbeiten A1 mit eigenem (aktuellem) Barcode → Info/Erfolg',true,r.msg);
const own=(await snap(h)).st.items.find(x=>x.code==='A1').barcode;await edit(h,'A1');r=await scan(h,own);R('4 A1 bearbeiten, eigenen Barcode scannen: "gehört zum aktuellen Artikel", Erfolgsfarbe',/aktuellen Artikel A1/.test(r.msg)&&/success/.test(r.cls),r.msg+' | '+r.cls);
await edit(h,'A3');r=await scan(h,'BC-TWO');R('4 A3 bearbeiten, Barcode von A2 scannen: Warnung',/gehört bereits zu A2/.test(r.msg)&&/warning/.test(r.cls),r.msg);
r=await scan(h,'N'.repeat(65));R('4 Scan 65 Zeichen: Warnung "Barcode zu lang"',/zu lang/.test(r.msg)&&/warning/.test(r.cls),r.msg);
f=await form(h);R('4 ... Feld enthält trotzdem den langen Wert (Speichern wird abgelehnt)',f.aBarcode.length===65,String(f.aBarcode.length));
b=await snap(h);m=await save(h);R('4 ... Speichern abgelehnt, nichts geändert',!ok(m)&&(await snap(h)).raw===b.raw,m);
r=await scan(h,'FRESH-999');R('4 Scan unbekannter Barcode: Hinweis (hint)',/Barcode übernommen/.test(r.msg)&&/hint/.test(r.cls),r.msg+' | '+r.cls);
r=await scan(h,'A1');R('4 Info: Scan eines Artikelnummern-Textes (A1) → ',true,r.msg+' | '+r.cls);
m=await save(h);R('4 ... Speichern mit "A1" als Barcode von A3 abgelehnt',!ok(m),m);
R('JS-Fehler Teil 1–4',h.errs.length===0,h.errs.join('|').slice(0,250));
await h.b.close();
// 5/6 Altdaten – Matrix neu vs. alt
const matrix={};
for(const ver of ['old','new']){const hh=await mk(ver);matrix[ver]={};
 for(const [code,tests] of Object.entries({L1:['name','barcodeSame','barcodeLongOther','barcodeShort'],L2:['name','barcodeSame','barcodeBC1'],L3:['name','barcodeSame'],L4:['name','barcodeSame'],L5:['name','barcodeSame'],L6:['name','barcodeSame'],L7:['name','barcodeSame'],A1:['name']})){
  for(const t of tests){await edit(hh,code);await hh.p.evaluate(([t])=>{const c0=aBarcode.value;if(t==='name')aName.value=aName.value+' x';else if(t==='barcodeLongOther')aBarcode.value='Y'.repeat(150);else if(t==='barcodeShort')aBarcode.value='SHORT-1';else if(t==='barcodeBC1')aBarcode.value='BC1'},[t]);
   const bb=await snap(hh);const mm=await save(hh);const aa=await snap(hh);const it=aa.st.items.find(x=>x.code===code);
   matrix[ver][code+':'+t]={ok:ok(mm),msg:ok(mm)?'':mm,bcKept:it.barcode===bb.st.items.find(x=>x.code===code).barcode,hist:aa.st.history.length-bb.st.history.length,others:JSON.stringify(aa.st.items.filter(x=>x.code!==code))===JSON.stringify(bb.st.items.filter(x=>x.code!==code)),boxes:JSON.stringify(aa.st.boxes)===JSON.stringify(bb.st.boxes)}}}
 R('JS Matrix '+ver,hh.errs.length===0,hh.errs.join('|').slice(0,200));await hh.b.close()}
let newly=[],fixed=[];
for(const k of Object.keys(matrix.new)){const o=matrix.old[k],n=matrix.new[k];if(o.ok&&!n.ok)newly.push(k+' → '+n.msg);if(!o.ok&&n.ok)fixed.push(k)}
R('5 KEINE bisher zulässige Altdaten-Änderung neu blockiert',newly.length===0,newly.join(' ; '));
for(const k of Object.keys(matrix.new)){const n=matrix.new[k],o=matrix.old[k];console.log('   '+k.padEnd(22)+' alt: '+(o.ok?'ok':'abgelehnt')+'  neu: '+(n.ok?'ok':'abgelehnt: '+n.msg.slice(0,70)))}
R('5/6 Gespeicherte Altartikel: Barcode bleibt beim Namensändern unverändert (inkl. 200 und 65 Zeichen), nur 1 Historie, andere Artikel und Boxen unberührt',Object.entries(matrix.new).filter(([k,v])=>v.ok).every(([k,v])=>v.bcKept||/barcode(LongOther|Short|BC1)/.test(k))&&Object.entries(matrix.new).filter(([k,v])=>v.ok).every(([k,v])=>v.hist===1&&v.others&&v.boxes));
R('6 Namensänderung der Altartikel L1,L2,L3,L6,L7 weiter erlaubt',['L1:name','L2:name','L3:name','L6:name','L7:name'].every(k=>matrix.new[k].ok),['L1:name','L2:name','L3:name','L6:name','L7:name'].map(k=>k+'='+matrix.new[k].ok).join(' '));
// 6 Bearbeiten ohne Änderung: vollständige Gleichheit
{const hh=await mk('new');for(const c of ['A1','A2','A3','L1','L2','L3','L7']){await edit(hh,c);const bb=await snap(hh);const mm=await save(hh);const aa=await snap(hh);
 R('6 '+c+' laden und unverändert speichern: Artikel byteweise gleich (Ergebnis: '+(ok(mm)?'ok':mm.slice(0,60))+')',!ok(mm)||JSON.stringify(aa.st.items)===JSON.stringify(bb.st.items),'');}
 R('JS 6',hh.errs.length===0,hh.errs.join('|'));await hh.b.close()}
// 7 Export/Import
{const hh=await mk('new');await hh.go('more');
 const [dl]=await Promise.all([hh.p.waitForEvent('download'),hh.p.evaluate(()=>jsonExport.click())]);const path=await dl.path();const text=fs.readFileSync(path,'utf8');const exp=JSON.parse(text);
 R('7 Export enthält alle Artikel inkl. 200- und 65-Zeichen-Barcodes unverändert',exp.items.find(x=>x.code==='L1').barcode===L200&&exp.items.find(x=>x.code==='L7').barcode.length===65&&exp.items.length===ITEMS.length);
 // Import in frischen Browser
 const h2=await mk('new');await h2.p.evaluate(()=>{transaction(s=>{s.items.length=0;s.boxes.length=0})});
 await h2.go('more');await h2.p.setInputFiles('#jsonImport',{name:'e.json',mimeType:'application/json',buffer:Buffer.from(text)});await h2.p.waitForTimeout(700);const d=await h2.dlg();
 const s2=await snap(h2);
 // AP5.5a: Der Seed enthält Barcode-Mehrdeutigkeiten (A1 "BC1" / L2 "bc1"; L5-Barcode = Artikelnummer A3). Der Import fragt deshalb zuerst gesondert (Ausnahmeimport, nennt A1, L2, L5), dann normal. Der Test-Dialoghandler bestätigt beides (Dialogtexte gehen durch das Neuladen verloren; Reihenfolge und Wortlaut prüft tests/ap55a); Ergebnis muss wie früher byteweise gleich sein.
 R('7 Import des Exports (Altdaten mit langen/ähnlichen/reservierten Barcodes): nach bestätigtem Ausnahmeimport akzeptiert, Artikel byteweise gleich (nichts korrigiert)',JSON.stringify(s2.st.items)===JSON.stringify(exp.items),d.join('|').slice(0,160));
 {const exp2=JSON.parse(text);exp2.items.find(x=>x.code==='L2').barcode='L2-EINDEUTIG';exp2.items.find(x=>x.code==='L5').barcode='L5-EINDEUTIG';const h2b=await mk('new');await h2b.p.evaluate(()=>{transaction(s=>{s.items.length=0;s.boxes.length=0})});await h2b.go('more');
  await h2b.p.setInputFiles('#jsonImport',{name:'e2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exp2))});await h2b.p.waitForTimeout(700);const s2b=await snap(h2b);
  R('7 Derselbe Export, in dem die beiden mehrdeutigen Altdaten-Barcodes (L2 "bc1", L5 = Artikelnummer A3) eindeutig gemacht wurden (lange/ähnliche/reservierte Barcodes sonst unverändert): akzeptiert, Artikel byteweise gleich',JSON.stringify(s2b.st.items)===JSON.stringify(exp2.items),'');await h2b.b.close()}
 // Import mit zusätzlichen Altdaten (65 Z., reserviert, Case-Duplikat)
 const bad=JSON.parse(text);bad.items.push({code:'Z1',name:'Z1',barcode:'Z'.repeat(300),unit:'STK',pack:1,weight:1,max:10,min:null},{code:'Z2',name:'Z2',barcode:'__proto__x',unit:'STK',pack:1,weight:1,max:10,min:null},{code:'Z3',name:'Z3',barcode:'BC1',unit:'STK',pack:1,weight:1,max:10,min:null});
 const h3=await mk('new');await h3.go('more');await h3.p.setInputFiles('#jsonImport',{name:'b.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await h3.p.waitForTimeout(700);const d3=await h3.dlg();const s3=await snap(h3);
 R('7 Import mit 300-Zeichen-Barcode und Duplikat-Barcode (Altdaten-Stil): Verhalten (Info)',true,'importiert='+s3.st.items.some(x=>x.code==='Z1')+' | '+d3.join('|').slice(0,160));
 R('7 Nach Import: valid()',await h3.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state)))));
 R('JS 7',[hh,h2,h3].every(x=>x.errs.length===0),[...hh.errs,...h2.errs,...h3.errs].join('|').slice(0,200));await hh.b.close();await h2.b.close();await h3.b.close()}
const fl=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',fl.length);fl.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
