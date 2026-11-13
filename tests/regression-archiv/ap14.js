const fs=require('fs');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,260):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,300),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const mkI=(code,name,o={})=>({code,name,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null,...o});
const ITEMS=[mkI('A1','Art1',{barcode:'BC1',weight:2,min:3}),mkI('A2','Art2',{barcode:'bc-two'}),mkI('A3','Art3',{max:50}),
 mkI('C'.repeat(65),'Legacy Code 65'),mkI('toString','Legacy reserviert 1'),mkI('__proto__','Legacy reserviert 2'),mkI('LN','N'.repeat(200)),mkI('LM','Legacy Min>Max',{min:500,max:100}),mkI('ab1','case1'),mkI('AB1','case2'),mkI('LB','Barcode=Code',{barcode:'lb'}),mkI('LP','Pack',{unit:'P',pack:12,weight:2.5,max:20,min:100})];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'LM',qty:100,blocked:0},{id:'b3',place:'H4A-1-3',code:'LM',qty:60,blocked:0}];
async function mk(base){const {open}=require(base==='old'?'./lib_old':'./lib');const h=await open();await h.p.evaluate(([cfg,it,bx])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...it);s.boxes.push(...bx)})},[FULL,ITEMS,BOX]);
 await h.p.evaluate(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video id=fakevid></video>';window.__cb=cb}async stop(){}async clear(){}}});return h}
async function fill(h,o){await h.go('articles');await h.p.evaluate(()=>aClear.click());const base={aName:'X',aCode:'',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'5',aMin:''};for(const [k,x] of Object.entries({...base,...o}))await h.p.evaluate(([k,x])=>{document.getElementById(k).value=x},[k,x])}
async function scan(h,code){await h.go('articles');await h.p.evaluate(()=>aBarcodeCamera.click());await h.p.waitForTimeout(120);await h.p.evaluate(c=>window.__cb&&window.__cb(c),code);await h.p.waitForTimeout(220);return {msg:await txt(h.p,'articleScanMessage'),cls:await h.p.evaluate(()=>articleScanMessage.className)}}
const save=async h=>{await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')};
const ok=m=>/Artikel gespeichert/.test(m);
const edit=async(h,code)=>{await h.go('articles');await h.p.evaluate(c=>{[...document.querySelectorAll('[data-edit]')].find(e=>e.getAttribute('data-edit')===c).click()},code)};
(async()=>{
let h=await mk('new'),b,a,m,r;
// attributes
R('1/2 maxlength: aCode=64, aName=150',(await h.p.evaluate(()=>[aCode.maxLength,aName.maxLength]))+''==='64,150');
await h.go('articles');await h.p.fill('#aCode','K'.repeat(90));await h.p.fill('#aName','N'.repeat(300));R('1/2 Tippen: Browser kürzt auf 64 / 150',(await h.p.evaluate(()=>[aCode.value.length,aName.value.length]))+''==='64,150');
// 1 Artikelnummern
const newItem=async(code,name='N',extra={})=>{await fill(h,{aCode:code,aName:name,...extra});b=await snap(h);m=await save(h);a=await snap(h);return {m,b,a}};
for(const [n,len,exp] of [['63',63,true],['64',64,true],['65',65,false],['200',200,false],['5000',5000,false]]){const x=await newItem('K'.repeat(len-1)+(len%10),'N'+len);
 R('1 Artikelnummer '+n+' Zeichen (Skript): '+(exp?'erlaubt':'abgelehnt'),exp?ok(x.m)&&x.a.st.items.length===x.b.st.items.length+1:(!ok(x.m)&&/höchstens 64 Zeichen/.test(x.m)&&x.a.raw===x.b.raw&&/Artikelnummer/.test(x.m)),x.m)}
let x=await newItem('  ','N');R('1 Nur Leerzeichen als Artikelnummer: "Artikelnummer fehlt."',!ok(x.m)&&/Artikelnummer fehlt/.test(x.m)&&x.a.raw===x.b.raw,x.m);
x=await newItem('  '+'T'.repeat(64)+'  ','T64');R('1 64 Zeichen mit Leerzeichen außen: Trim, erlaubt',ok(x.m),x.m);
x=await newItem('😀'.repeat(33),'E');R('1 33 Emoji (66 Einheiten) abgelehnt (UTF-16, Info)',!ok(x.m),x.m);
// 2 Namen
for(const [n,len,exp] of [['149',149,true],['150',150,true],['151',151,false],['5000',5000,false]]){x=await newItem('NM'+len,'n'.repeat(len));
 R('2 Bezeichnung '+n+' Zeichen: '+(exp?'erlaubt':'abgelehnt'),exp?ok(x.m):(!ok(x.m)&&/Bezeichnung darf höchstens 150/.test(x.m)&&x.a.raw===x.b.raw),x.m)}
x=await newItem('NM0','   ');R('2 Leere Bezeichnung: "Artikelbezeichnung fehlt."',!ok(x.m)&&/Artikelbezeichnung fehlt/.test(x.m),x.m);
await edit(h,'A1');await h.p.evaluate(()=>{aName.value='z'.repeat(151)});b=await snap(h);m=await save(h);R('2 A1 Bezeichnung auf 151 ändern: abgelehnt, A1 unverändert',!ok(m)&&(await snap(h)).raw===b.raw,m);
await h.p.evaluate(()=>{aName.value='z'.repeat(150)});m=await save(h);R('2 A1 Bezeichnung auf 150: erlaubt, Bestand unverändert',ok(m)&&(await snap(h)).st.boxes.find(q=>q.id==='b1').qty===50,m);
await edit(h,'A1');await h.p.evaluate(()=>{aName.value='Art1'});await save(h);
// 3 Duplikate
for(const [n,code,re] of [['a1 (klein) neben A1','a1',/bereits vergeben/],['Ab1? (Case-Dup legacy ab1/AB1)','aB1',/bereits vergeben/],['bc1 (= Barcode von A1)','bc1',/Barcode/],['BC-TWO (= Barcode von A2)','BC-TWO',/Barcode/]]){x=await newItem(code,'D');R('3 Neue Artikelnummer "'+code+'" ('+n+') abgelehnt, nichts geändert',!ok(x.m)&&x.a.raw===x.b.raw&&re.test(x.m),x.m)}
x=await newItem('d1'+'​','Z');R('3 Info Umgehung: Artikelnummer mit Zero-Width-Space (sieht aus wie bestehende) wird '+(ok(x.m)?'akzeptiert':'abgelehnt'),true,x.m);
x=await newItem('a1​','Z2');R('3 Info Umgehung: "a1"+ZWSP neben A1: '+(ok(x.m)?'akzeptiert (optisch fast gleich)':'abgelehnt'),true,x.m);
x=await newItem('Ａ1','Z3');R('3 Info Umgehung: Vollbreite "Ａ1" neben A1: '+(ok(x.m)?'akzeptiert':'abgelehnt'),true,x.m);
x=await newItem(' A3 ','Z4');R('3 Info: Eingabe der Nummer eines vorhandenen Artikels (A3) im Neu-Modus → '+(ok(x.m)?'überschreibt A3 still':'abgelehnt'),true,x.m+' | Name A3 jetzt: '+(await snap(h)).st.items.find(q=>q.code==='A3').name);
// 4 reserviert
const names=await h.p.evaluate(()=>[...new Set(['__proto__','constructor','prototype',...Object.getOwnPropertyNames(Object.prototype)])]);
let badCode=[],badBc=[];
for(const nm of names){for(const v of [nm,nm.toUpperCase()]){x=await newItem(v,'R');if(ok(x.m))badCode.push(v)||0;
  await fill(h,{aCode:'RB'+Math.floor(Math.random()*1e9),aName:'R',aBarcode:v});b=await snap(h);m=await save(h);if(ok(m))badBc.push(v)}}
R('4 Alle '+names.length+' Object.prototype-Namen (+Großschreibung) als Artikelnummer abgelehnt',badCode.length===0,'durchgelassen: '+badCode.join(','));
R('4 ... und als Barcode abgelehnt',badBc.length===0,'durchgelassen: '+badBc.join(','));
x=await newItem('toString','R');R('4 Meldung Artikelnummer reserviert',/Artikelnummer ist reserviert/.test(x.m),x.m);
await fill(h,{aCode:'RBX',aName:'R',aBarcode:'valueOf'});m=await save(h);R('4 Meldung Barcode reserviert',/Barcode ist reserviert/.test(m),m);
const extra=[];for(const v of ['null','undefined','NaN','true','length','name','toJSON','then','__proto__x','Infinity']){x=await newItem('X'+v,'R');await fill(h,{aCode:'Y'+v,aName:'R',aBarcode:v});const mm=await save(h);extra.push(v+':'+(ok(mm)?'ok':'x'))}
R('4 Info: weitere kritische Wörter als Barcode',true,extra.join(' '));
// 5 Min>Max
{const hh=await mk('new');const t=async(o,exp,re,lbl)=>{await fill(hh,{aCode:'MM'+Math.floor(Math.random()*1e6),aName:'M',...o});const bb=await snap(hh);const mm=await save(hh);const aa=await snap(hh);R('5 '+lbl,exp?ok(mm):(!ok(mm)&&aa.raw===bb.raw&&(re?re.test(mm):true)),mm)};
 await t({aMin:'10',aMax:'5'},false,/Mindestbestand darf die maximale Boxmenge nicht überschreiten/,'Neu: Min 10 > Max 5 → abgelehnt');
 await t({aMin:'5',aMax:'5'},true,0,'Neu: Min 5 = Max 5 erlaubt');
 await t({aMin:'500',aMax:'',aWeight:''},true,0,'Neu: Min 500, Max leer erlaubt');
 await t({aMin:'',aMax:'5'},true,0,'Neu: Min leer, Max 5 erlaubt');
 await t({aMin:'0',aMax:'5'},true,0,'Neu: Min 0 erlaubt');
 // Fachlich: Mindestbestand = Gesamtbestand, Max = je Box → min>max ist fachlich zulässig
 const sem=await hh.p.evaluate(()=>{const lm=state.items.find(a=>a.code==='LM');const total=state.boxes.filter(b=>b.code==='LM').reduce((s,b)=>s+b.qty,0);return {min:lm.min,max:lm.max,total}});
 R('5 FACHLICH: Home-Warnung vergleicht Mindestbestand mit Gesamtbestand aller Boxen, Max gilt je Box',true,JSON.stringify(sem));
 await hh.go('home');R('5 FACHLICH: Home zeigt Mindestbestand-Warnung für LM (Gesamtbestand 160 < Min 500) – belegt: Min bezieht sich auf Summe',/LM|Legacy Min/.test(await hh.p.evaluate(()=>document.getElementById('home').innerText)));
 // Praxisfall: Artikel mit Boxkapazität 100 und Mindestbestand 500
 await t({aMin:'500',aMax:'100'},false,0,'PRAXISFALL Neu: Mindestbestand 500 gesamt, Box-Max 100 → abgelehnt?');
 await edit(hh,'LM');await hh.p.evaluate(()=>{aMin.value='600'});let bb=await snap(hh);let mm=await save(hh);R('5 PRAXISFALL Altartikel LM (Min 500, Box-Max 100): Mindestbestand auf 600 erhöhen → '+(ok(mm)?'erlaubt':'ABGELEHNT'),ok(mm),mm);
 await edit(hh,'LM');await hh.p.evaluate(()=>{aMax.value='150'});mm=await save(hh);R('5 Altartikel LM: Max auf 150 (Min 500 bleibt) → '+(ok(mm)?'erlaubt':'abgelehnt'),ok(mm),mm);
 await edit(hh,'LM');await hh.p.evaluate(()=>{aMin.value='100';aMax.value='200'});mm=await save(hh);R('5 Altartikel LM: Min 100 / Max 200 (Reparatur) erlaubt',ok(mm),mm);
 await edit(hh,'A2');await hh.p.evaluate(()=>{aMin.value='101';aMax.value='100'});bb=await snap(hh);mm=await save(hh);R('5 A2: Min 101 > Max 100 → abgelehnt, nichts geändert',!ok(mm)&&(await snap(hh)).raw===bb.raw,mm);
 R('JS 5',hh.errs.length===0,hh.errs.join('|'));await hh.b.close()}
// 6 Meldungen
{const hh=await mk('new');const msgs=[];const t=async(lbl,o,re)=>{await fill(hh,{aCode:'MS',aName:'M',...o});const mm=await save(hh);msgs.push(lbl+' → '+mm);R('6 '+lbl+' → passende Einzelmeldung',!ok(mm)&&re.test(mm)&&!/Artikelangaben prüfen/.test(mm),mm)};
 await t('Artikelnummer leer',{aCode:''},/^Artikelnummer fehlt/);await t('Bezeichnung leer',{aName:''},/^Artikelbezeichnung fehlt/);
 await t('Pack 0',{aPack:'0'},/Stück pro Pack muss/);await t('Pack 1,5',{aPack:'1.5'},/Stück pro Pack muss/);await t('Pack leer',{aPack:''},/Stück pro Pack muss/);
 await t('Gewicht −1',{aWeight:'-1'},/Gewicht muss/);await t('Gewicht 1e999',{aWeight:'1e999'},/Gewicht muss/);
 await t('Max 0',{aMax:'0'},/Maximale Boxmenge muss/);await t('Max 1,5',{aMax:'1.5'},/Maximale Boxmenge muss/);await t('Max −3',{aMax:'-3'},/Maximale Boxmenge muss/);
 await t('Min −1',{aMin:'-1'},/Mindestbestand muss/);await t('Min 1,5',{aMin:'1.5'},/Mindestbestand muss/);
 await t('Barcode = Artikelnummer',{aCode:'MS',aBarcode:'ms'},/unterschiedlich/);
 const g=await (async()=>{await fill(hh,{aCode:'GW',aName:'G',aWeight:'1e308'});const mm=await save(hh);return mm})();R('6 Info Gewicht 1e308 (aus SA-12): '+(ok(g)?'weiterhin akzeptiert (keine Obergrenze)':'abgelehnt'),true,g);
 // Reihenfolge: mehrere Fehler → erste sinnvoll
 await fill(hh,{aCode:'',aName:'',aPack:'0'});R('6 Mehrere Fehler gleichzeitig: erste Meldung "Artikelnummer fehlt."',/Artikelnummer fehlt/.test(await save(hh)));
 R('JS 6',hh.errs.length===0,hh.errs.join('|'));await hh.b.close()}
// 7 Altdaten Matrix alt (e03c6dd) vs neu
const matrix={};
const OPS={name:()=>{aName.value=aName.value.slice(0,20)+' x'},noop:()=>{},weight:()=>{aWeight.value='3'},min:()=>{aMin.value='600'},max:()=>{aMax.value='150'},barcode:()=>{aBarcode.value='NEWBC-1'}};
const LEG={['C'.repeat(65)]:['name','noop','weight'],toString:['name','noop','weight'],'__proto__':['name','noop','weight'],LN:['noop','weight','name'],LM:['noop','name','min','max'],ab1:['name','noop'],AB1:['name','noop'],LB:['name','noop','barcode'],LP:['name','noop','min','max'],A1:['noop','name','weight']};
for(const ver of ['old','new']){const hh=await mk(ver);matrix[ver]={};
 for(const [code,ops] of Object.entries(LEG))for(const op of ops){await edit(hh,code);await hh.p.evaluate(`(${OPS[op].toString()})()`);const bb=await snap(hh);const mm=await save(hh);const aa=await snap(hh);const key=code.slice(0,12)+':'+op;
  matrix[ver][key]={ok:ok(mm),msg:mm,others:JSON.stringify(aa.st.items.filter(q=>q.code!==code))===JSON.stringify(bb.st.items.filter(q=>q.code!==code)),boxes:JSON.stringify(aa.st.boxes)===JSON.stringify(bb.st.boxes),same:op==='noop'?JSON.stringify(aa.st.items.find(q=>q.code===code))===JSON.stringify(bb.st.items.find(q=>q.code===code)):null}}
 R('JS Matrix '+ver,hh.errs.length===0,hh.errs.join('|').slice(0,160));await hh.b.close()}
const newly=[];for(const k of Object.keys(matrix.new)){const o=matrix.old[k],n=matrix.new[k];console.log('   '+k.padEnd(20)+' alt: '+(o.ok?'ok':'abgelehnt')+'   neu: '+(n.ok?'ok':'ABGELEHNT: '+n.msg.slice(0,80)));if(o.ok&&!n.ok)newly.push(k+' → '+n.msg)}
R('7 Altdaten: durch SA-12b/13 NEU blockierte bisherige Bearbeitungen',newly.length===0,newly.join(' ; '));
R('7 Altdaten: unverändertes Speichern (noop) lässt jeden Artikel byteweise gleich; andere Artikel/Boxen unberührt',Object.entries(matrix.new).filter(([k,v])=>v.ok).every(([k,v])=>(v.same===null||v.same)&&v.others&&v.boxes));
// 8 Scan
{const hh=await mk('new');
 await fill(hh,{aCode:'S1',aName:'S'});let rr=await scan(hh,'a3');R('8 Scan "a3" (Artikelnummer A3, klein) im Barcode-Feld: Warnung',/Artikelnummer/.test(rr.msg)&&/warning/.test(rr.cls),rr.msg+' | '+rr.cls);
 rr=await scan(hh,'A1');R('8 Scan "A1": Warnung',/warning/.test(rr.cls),rr.msg);
 await edit(hh,'A2');rr=await scan(hh,'A2');R('8 Eigene Artikelnummer A2 beim Bearbeiten von A2 gescannt: Warnung? (Info)',true,rr.msg+' | '+rr.cls);
 const bb=await snap(hh);const mm=await save(hh);R('8 ... Speichern abgelehnt (Barcode = Artikelnummer), nichts geändert',!ok(mm)&&(await snap(hh)).raw===bb.raw,mm);
 await edit(hh,'A2');rr=await scan(hh,'BC1');R('8 Scan Barcode von A1 bei A2: Warnung "gehört bereits zu A1"',/gehört bereits zu A1/.test(rr.msg),rr.msg);
 await edit(hh,'A2');rr=await scan(hh,'toString');R('8 Scan reserviertes Wort: Hinweis? (Info)',true,rr.msg+' | '+rr.cls);
 await edit(hh,'A2');rr=await scan(hh,'BC-TWO');R('8 Eigenen Barcode scannen: grün "gehört zum aktuellen Artikel"',/aktuellen Artikel A2/.test(rr.msg)&&/success/.test(rr.cls),rr.msg);
 await fill(hh,{aCode:'',aName:''});rr=await scan(hh,'a2');R('8 Leeres Formular, Scan "a2": Warnung (Artikelnummer vergeben)',/warning/.test(rr.cls),rr.msg);
 R('JS 8',hh.errs.length===0,hh.errs.join('|'));await hh.b.close()}
// 9 Import/Export/Bestand
{const hh=await mk('new');await hh.go('more');const [dl]=await Promise.all([hh.p.waitForEvent('download'),hh.p.evaluate(()=>jsonExport.click())]);const text=fs.readFileSync(await dl.path(),'utf8');const exp=JSON.parse(text);
 R('9 Export enthält Altartikel unverändert (65-Zeichen-Code, 200-Zeichen-Name, toString, __proto__, Min>Max)',exp.items.some(q=>q.code==='C'.repeat(65))&&exp.items.find(q=>q.code==='LN').name.length===200&&exp.items.some(q=>q.code==='toString')&&exp.items.some(q=>q.code==='__proto__')&&exp.items.find(q=>q.code==='LM').min===500&&exp.items.length===ITEMS.length);
 const h2=await mk('new');await h2.p.evaluate(()=>{transaction(s=>{s.items.length=0;s.boxes.length=0})});await h2.go('more');await h2.p.setInputFiles('#jsonImport',{name:'e.json',mimeType:'application/json',buffer:Buffer.from(text)});await h2.p.waitForTimeout(800);const d=await h2.dlg();const s2=await snap(h2);
 R('9 Import des Exports: Artikel und Boxen byteweise gleich',JSON.stringify(s2.st.items)===JSON.stringify(exp.items)&&JSON.stringify(s2.st.boxes)===JSON.stringify(exp.boxes),d.join('|').slice(0,140));
 R('9 Nach Import: valid() und Bearbeiten Altartikel möglich',(await h2.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state)))))===true);
 // Bestand-Interaktion
 await edit(hh,'A1');await hh.p.evaluate(()=>{aMax.value='40'});let bb=await snap(hh);let mm=await save(hh);R('9 Zusammenspiel AP3: Max 40 < Box 50 abgelehnt (Meldung zu Box, nicht Min/Max)',!ok(mm)&&/Box auf H4A-1-1/.test(mm)&&(await snap(hh)).raw===bb.raw,mm);
 await edit(hh,'A1');await hh.p.evaluate(()=>{aMax.value='60';aMin.value='10'});mm=await save(hh);R('9 A1 Max 60, Gewicht gleich: gespeichert, Box 50 unverändert',ok(mm)&&(await snap(hh)).st.boxes.find(q=>q.id==='b1').qty===50,mm);
 await hh.go('book');const bk=async o=>{await setf(hh.p,'bookArticle','A1');for(const [k,x] of Object.entries(o))await setf(hh.p,k,x);await hh.p.evaluate(()=>bookSubmit.click());await hh.dlg();return txt(hh.p,'bookMessage')};
 R('9 Wareneingang/Ausbuchen/Umlagern funktionieren weiter',/gespeichert/.test(await bk({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'5'}))&&/gespeichert/.test(await bk({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'5'}))&&/gespeichert/.test(await bk({bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-1',bookQty:'5'})));
 // Artikel mit Code = Reservierter Legacy: Wareneingang auf toString
 await setf(hh.p,'bookArticle','toString');for(const [k,x] of Object.entries({bookAction:'in',bookPlace:'H4A-6-1',bookQty:'3'}))await setf(hh.p,k,x);await hh.p.evaluate(()=>bookSubmit.click());await hh.dlg();R('9 Altartikel "toString": Buchen weiter möglich',/gespeichert/.test(await txt(hh.p,'bookMessage')),await txt(hh.p,'bookMessage'));
 R('JS 9',[hh,h2].every(q=>q.errs.length===0),[...hh.errs,...h2.errs].join('|').slice(0,200));await hh.b.close();await h2.b.close()}
R('JS Hauptteil',h.errs.length===0,h.errs.join('|').slice(0,250));await h.b.close();
const fl=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',fl.length);fl.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
