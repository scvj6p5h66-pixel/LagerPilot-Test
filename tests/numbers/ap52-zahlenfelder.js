// AP5.2 – Zahlenfelder absichern. Aufruf: BASE=http://localhost:8123/index.html node tests/numbers/ap52-zahlenfelder.js
const {chromium,devices}=require('playwright');const fs=require('fs');const os=require('os');const path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html';const K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1';
let pass=0,fail=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,190):''))};
const CFG={shelf:800,bay:2000,palletMax:1000,tare:25};
async function open(o={}){const b=await chromium.launch();const ctx=await b.newContext(o.dev?{...devices[o.dev]}:{viewport:{width:1100,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[],dlg=[];p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>{dlg.push(d.message());o.dismiss?d.dismiss():d.accept()});await p.goto(BASE);await p.waitForTimeout(400);return {b,p,errs,dlg}}
async function seed(o={}){const h=await open(o);await h.p.evaluate(c=>{transaction(s=>{Object.assign(s.config,c);s.items.push({code:'A1',name:'Mit Werten',barcode:'',unit:'STK',pack:1,weight:2,max:100,min:5},{code:'S1',name:'Mit Bestand',barcode:'',unit:'STK',pack:1,weight:2,max:100,min:7},{code:'N1',name:'Ohne',barcode:'',unit:'STK',pack:1,weight:null,max:null,min:null});
 s.boxes.push({id:'b1',place:'H4A-1-1',code:'S1',qty:50,blocked:0});s.qrMap['QR-X']='H4A-1-1'})},CFG);return h}
const raw=h=>h.p.evaluate(k=>localStorage.getItem(k),K);
const part=(h,f)=>h.p.evaluate(([k,f])=>JSON.stringify(f.split('.').reduce((o,x)=>o[x],JSON.parse(localStorage.getItem(k)))),[K,f]);
const art=(h,c)=>h.p.evaluate(c=>{const a=state.items.find(x=>x.code===c);return a?{max:a.max,min:a.min,weight:a.weight,pack:a.pack}:null},c);
const msg=(h,id)=>h.p.evaluate(id=>document.getElementById(id).textContent+'|'+document.getElementById(id).className,id);
async function aform(h,o,edit){await h.p.evaluate(([o,edit])=>{tab('articles');document.getElementById('aClear').click();if(edit)document.querySelector('[data-edit="'+edit+'"]').click();for(const [k,v] of Object.entries(o))document.getElementById(k).value=v},[o,edit||null]);await h.p.evaluate(()=>document.getElementById('aSave').click());await h.p.waitForTimeout(60)}
async function cfg(h,o){await h.p.evaluate(o=>{tab('more');const m={shelf:'cfgShelf',bay:'cfgBay',palletMax:'cfgPalletMax',tare:'cfgTare'};for(const k in m)document.getElementById(m[k]).value=state.config[k]??'';for(const [k,v] of Object.entries(o))document.getElementById(m[k]).value=v;document.getElementById('cfgSave').click()},o);await h.p.waitForTimeout(60)}
const cfgNow=h=>h.p.evaluate(()=>JSON.stringify(state.config));
const BADINT=['abc','1e3','1e999','1E2','-1','+1','1.5','1,5','1 000','0x10','NaN','Infinity','٣','--1','9'.repeat(400),'9007199254740992','1.','.5'];
const short=v=>v.length>16?v.slice(0,8)+'…('+v.length+')':v;
(async()=>{
const h=await seed();const base={boxes:await part(h,'boxes'),places:await part(h,'places'),qrMap:await part(h,'qrMap')};
const baseItems=await part(h,'items');
// ===== Artikel: Maximale Boxmenge / Mindestbestand =====
for(const [v,exp] of [['1',1],['50',50],[' 75 ',75],['007',7]]){await aform(h,{aCode:'MX'+v.trim(),aName:'x',aUnit:'STK',aPack:'1',aMax:v});R('1 Max gültig "'+v+'" -> '+exp,(await art(h,'MX'+v.trim()))?.max===exp,(await msg(h,'aMessage')))}
for(const [v,exp] of [['0',0],['5',5],['500',500]]){await aform(h,{aCode:'MN'+v,aName:'x',aUnit:'STK',aPack:'1',aMin:v});R('1 Min gültig "'+v+'" -> '+exp,(await art(h,'MN'+v))?.min===exp)}
await aform(h,{aCode:'MM',aName:'x',aUnit:'STK',aPack:'1',aMax:'100',aMin:'500'});R('1 Min 500 > Max 100 weiterhin erlaubt (SA-12c)',(await art(h,'MM'))?.min===500);
for(const fld of ['aMax','aMin']){const badList=fld==='aMax'?[...BADINT,'0']:BADINT;let n=0;
 for(const v of badList){n++;const before=await raw(h);await aform(h,{aCode:'NB'+fld+n,aName:'x',aUnit:'STK',aPack:'1',[fld]:v});const m=await msg(h,'aMessage');
  R('2-5 Neuanlage '+fld+' ungültig "'+short(v)+'": abgelehnt, Speicher gleich',/error/.test(m)&&!/Artikel gespeichert/.test(m)&&(await raw(h))===before&&!(await art(h,'NB'+fld+n)),m.slice(0,70))}
 for(const code of ['A1','S1']){const o=await art(h,code);for(const v of ['abc','1e999','-1','1.5','9'.repeat(400)]){const before=await raw(h);await aform(h,{[fld]:v},code);const m=await msg(h,'aMessage');
  R('7/8 Bearbeiten '+code+' '+fld+' "'+short(v)+'": Wert '+o[fld==='aMax'?'max':'min']+' bleibt, Speicher gleich',JSON.stringify(await art(h,code))===JSON.stringify(o)&&(await raw(h))===before&&/error/.test(m),m.slice(0,60))}}}
// Entfernen
h.dlg.length=0;await aform(h,{aMax:'',aMin:''},'A1');R('6/8 A1 (ohne Bestand) leere Felder: erst nach Bestätigung entfernt (max, min -> null)',(await art(h,'A1')).max===null&&(await art(h,'A1')).min===null&&h.dlg.some(d=>/Maximale Boxmenge.*entfernt/.test(d)&&/Mindestbestand.*entfernt/.test(d)),h.dlg.join('|').slice(0,90));
{const hd=await seed({dismiss:true});const before=await raw(hd);await aform(hd,{aMax:'',aMin:''},'A1');R('6/8 Bestätigung abgelehnt: nichts gespeichert, Speicher gleich',(await raw(hd))===before&&/Nicht gespeichert/.test(await msg(hd,'aMessage')));await hd.b.close()}
{const before=await raw(h);await aform(h,{aMax:''},'S1');R('8 S1 (mit Bestand): Max entfernen abgelehnt, Speicher gleich',(await art(h,'S1')).max===100&&(await raw(h))===before&&/nicht gelöscht/.test(await msg(h,'aMessage')),await msg(h,'aMessage'))}
h.dlg.length=0;await aform(h,{aMin:''},'S1');R('8 S1 (mit Bestand): Mindestbestand entfernen erlaubt nach Bestätigung',(await art(h,'S1')).min===null&&h.dlg.length===1);
h.dlg.length=0;await aform(h,{aName:'N neu'},'N1');R('6 N1 ohne Werte: leer lassen = unbekannt, kein Dialog',h.dlg.length===0&&/Artikel gespeichert/.test(await msg(h,'aMessage')));
// Pack
{const before=await raw(h);await aform(h,{aCode:'PK1',aName:'x',aUnit:'P',aPack:'0'});R('2 Pack 0 abgelehnt',(await raw(h))===before);await aform(h,{aCode:'PK1',aName:'x',aUnit:'P',aPack:'1.5'});R('2 Pack 1.5 abgelehnt',(await raw(h))===before);await aform(h,{aCode:'PK1',aName:'x',aUnit:'P',aPack:'12'});R('1 Pack 12 gültig',(await art(h,'PK1'))?.pack===12)}
// ===== Konfiguration =====
for(const [k,v,exp] of [['shelf','800',800],['shelf','800,5',800.5],['bay','2500.25',2500.25],['palletMax','1000',1000],['tare','25,5',25.5],['tare','0',0],['tare','0.1',0.1]]){await cfg(h,{[k]:v});R('1/5 Konfiguration '+k+' "'+v+'" -> '+exp,JSON.parse(await cfgNow(h))[k]===exp,await msg(h,'cfgMessage'))}
await cfg(h,{shelf:'800',bay:'2000',palletMax:'1000',tare:'25'});
const BADDEC=['abc','1e3','1e999','1E2','-1','+1','1.2.3','1,2,3','1.500,5','0x10','NaN','Infinity','٣','.5','5.','9'.repeat(400),'9007199254740992'];
for(const [k,min] of [['shelf',1],['bay',1],['palletMax',1],['tare',0]]){const list=[...BADDEC,...(min===1?['0','0.5']:[])];
 for(const v of list){const before=await raw(h);await cfg(h,{[k]:v});const m=await msg(h,'cfgMessage');R('2-5 Konfiguration '+k+' ungültig "'+short(v)+'": abgelehnt, Speicher gleich',/error/.test(m)&&(await raw(h))===before&&JSON.stringify(JSON.parse(await cfgNow(h))).includes('800'),m.slice(0,60))}}
// leer: shelf Pflicht, andere nur nach Bestätigung
{const before=await raw(h);await cfg(h,{shelf:''});R('6 Fachlast leer: Fehler, Speicher gleich',/Fachlast muss angegeben/.test(await msg(h,'cfgMessage'))&&(await raw(h))===before)}
h.dlg.length=0;await cfg(h,{bay:'',tare:''});R('6 Feldlast/Leergewicht leer: erst nach Bestätigung entfernt',JSON.parse(await cfgNow(h)).bay===null&&JSON.parse(await cfgNow(h)).tare===null&&h.dlg.length===1&&/Feldlast.*entfernt/.test(h.dlg[0]),h.dlg.join('').slice(0,80));
{const hd=await seed({dismiss:true});const before=await raw(hd);await cfg(hd,{bay:'',palletMax:''});R('6/8 Konfiguration: Bestätigung abgelehnt -> nichts gespeichert',(await raw(hd))===before);await hd.b.close()}
{const hn=await open();h.dlg.length=0;await hn.p.evaluate(()=>{tab('more');document.getElementById('cfgShelf').value='700';document.getElementById('cfgSave').click()});await hn.p.waitForTimeout(60);R('6 Frischer Zustand: Fachlast setzen, übrige Felder leer ohne Dialog',hn.dlg.length===0&&JSON.parse(await hn.p.evaluate(()=>JSON.stringify(state.config))).shelf===700&&/Parameter gespeichert/.test(await msg(hn,'cfgMessage')));await hn.b.close()}
// ===== Speicherlogik direkt =====
for(const [lbl,code] of [['max Infinity','a.max=Infinity'],['max 1.5','a.max=1.5'],['max "5"','a.max="5"'],['min -1','a.min=-1'],['min NaN','a.min=NaN'],['config.tare NaN','s.config.tare=NaN'],['config.shelf Infinity','s.config.shelf=Infinity'],['config.bay "9"','s.config.bay="9"'],['config.palletMax -3','s.config.palletMax=-3'],['weight Infinity','a.weight=Infinity']]){const before=await raw(h);
 const r=await h.p.evaluate(c=>{try{transaction(s=>{const a=s.items.find(x=>x.code==='S1');eval(c)});return 'ok'}catch(e){return 'abgelehnt'}},code);R('Speicherlogik: '+lbl+' abgelehnt, Speicher gleich',r==='abgelehnt'&&(await raw(h))===before)}
// ===== Mengenfelder (echte Tastatureingabe -> badInput) =====
await h.p.evaluate(()=>tab('book'));
const type=async(id,v)=>{await h.p.evaluate(id=>{const e=document.getElementById(id);e.value=''},id);await h.p.click('#'+id);await h.p.keyboard.type(v)};
{const before=await raw(h);await h.p.evaluate(()=>{document.getElementById('bookAction').value='in';document.getElementById('bookArticle').value='S1';document.getElementById('bookPlace').value='H4A-1-2'});
 for(const v of ['1e999','1e','--']){await type('bookQty',v);await h.p.evaluate(()=>document.getElementById('bookSubmit').click());await h.p.waitForTimeout(60);const m=await msg(h,'bookMessage').catch(()=>'');R('Buchung Menge getippt "'+v+'": abgelehnt, Speicher gleich',(await raw(h))===before&&/error/.test(await h.p.evaluate(()=>document.querySelector('#book .error')?.className||'')),(await h.p.evaluate(()=>document.querySelector('#book .error')?.textContent||'')).slice(0,80))}
 for(const v of ['','0','-5','1.5']){await h.p.evaluate(v=>{document.getElementById('bookQty').value=v},v);await h.p.evaluate(()=>document.getElementById('bookSubmit').click());await h.p.waitForTimeout(60);R('Buchung Menge "'+v+'": abgelehnt, Speicher gleich',(await raw(h))===before)}}
await h.p.evaluate(()=>tab('inventory'));
{const before=await raw(h);for(const v of ['1e999','1e','--']){await h.p.evaluate(()=>{document.getElementById('invPlace').value='H4A-1-1';document.getElementById('invArticle').value='S1'});await type('invQty',v);await h.p.evaluate(()=>document.getElementById('invCompare').click());await h.p.waitForTimeout(60);const t=await h.p.evaluate(()=>document.getElementById('invResult').textContent+'|'+(document.querySelector('#inventory .error')?.textContent||''));R('Inventur Menge getippt "'+v+'": abgelehnt, Speicher gleich',(await raw(h))===before&&/ungültig|gültige/i.test(t),t.slice(0,80))}}
await cfg(h,{shelf:'800',bay:'2000',palletMax:'1000',tare:'25'});await h.p.evaluate(()=>tab('merge'));
{const before=await raw(h);for(const v of ['1e999','1e']){await h.p.evaluate(()=>{document.getElementById('mergeFrom').value='H4A-1-1';document.getElementById('mergeTo').value='H4A-1-3';document.getElementById('mergeArticle').value='S1'});await type('mergeQty',v);await h.p.evaluate(()=>document.getElementById('mergeValidate').click());await h.p.waitForTimeout(60);const t=await h.p.evaluate(()=>document.getElementById('mergeCheck').textContent);R('Umlagerung Menge getippt "'+v+'": abgelehnt, Speicher gleich',(await raw(h))===before&&/keine gültige Zahl|gültig/i.test(t),t.slice(0,80))}
 await h.p.evaluate(()=>{document.getElementById('mergeQty').value='5'});await h.p.evaluate(()=>document.getElementById('mergeValidate').click());await h.p.waitForTimeout(60);{const t=await h.p.evaluate(()=>document.getElementById('mergeCheck').textContent);R('Umlagerung 5 gültig: Prüfung besteht (ohne Buchung)',/Prüfung bestanden/.test(t)&&(await raw(h))===before,t)}}
// ===== Kommissionierung: Gewichtsfelder =====
{const mkItems=Array.from({length:3},(_,i)=>({sku:'ART-'+(i+1),name:'Artikel '+(i+1),place:'H4B-1-'+(i+1),qty:2,actual:2,unitWeight:1}));
 const order={id:'T1',lines:3,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:mkItems,checkedLines:[],scannedLines:[0,1,2],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:40,tolerancePercent:1}};
 const ps={people:[{name:'Max',device:'Scanner 1',active:true,lastSeen:Date.now()}],roster:['Max','Peter','Leon'],orders:[order],session:'Max',testStatus:{Max:true}};
 const hp=await open();await hp.p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,ps]);await hp.p.reload();await hp.p.waitForTimeout(400);await hp.p.evaluate(()=>{const b=document.querySelector('#nav [data-area="picking"]');if(b)b.click();tab('picking')});await hp.p.waitForTimeout(300);
 const po=()=>hp.p.evaluate(k=>JSON.parse(localStorage.getItem(k)).orders[0],PK);const ptype=async(sel,v)=>{await hp.p.click(sel);await hp.p.keyboard.press('Control+A');await hp.p.keyboard.press('Delete');await hp.p.keyboard.type(v);await hp.p.keyboard.press('Tab');await hp.p.waitForTimeout(120)};
 for(const [id,key,start] of [['#pick-pallet-weight','palletWeight',25],['#pick-box-weight','boxWeight',1.5],['#pick-tolerance','tolerancePercent',1]]){for(const v of ['1e999','--','1e']){hp.dlg.length=0;const before=await store(hp);await ptype(id,v);const o=await po();R('Kommissionierung '+key+' getippt "'+v+'": Wert '+start+' bleibt, Messwert 40 bleibt, Warnung',o.packaging[key]===start&&o.packaging.measuredWeight===40&&hp.dlg.some(d=>/Ungültige Eingabe/.test(d)),hp.dlg.join('|').slice(0,70))}}
 for(const v of ['1e999','--']){hp.dlg.length=0;await ptype('#pick-measured-weight',v);R('Kommissionierung Messwert getippt "'+v+'": Wert 40 bleibt',(await po()).packaging.measuredWeight===40&&hp.dlg.some(d=>/Ungültige Eingabe/.test(d)))}
 for(const v of ['1e999','--']){hp.dlg.length=0;await ptype('#pick-weight-0',v);R('Kommissionierung Stückgewicht Pos.1 getippt "'+v+'": Wert 1 bleibt',(await po()).items[0].unitWeight===1&&hp.dlg.some(d=>/Ungültige Eingabe/.test(d)))}
 for(const v of ['1e999','--']){hp.dlg.length=0;await ptype('#pick-actual-0',v);R('Kommissionierung Istmenge Pos.1 getippt "'+v+'": Wert 2 bleibt',(await po()).items[0].actual===2&&hp.dlg.some(d=>/Ungültige Eingabe/.test(d)))}
 hp.dlg.length=0;await ptype('#pick-tolerance','150');R('Kommissionierung Toleranz 150 (außerhalb 0–100): abgelehnt, Messwert bleibt',(await po()).packaging.tolerancePercent===1&&(await po()).packaging.measuredWeight===40);
 await ptype('#pick-pallet-weight','30');R('Kommissionierung gültige Palette 30: gespeichert, Messwert zurückgesetzt (bestehendes Verhalten)',(await po()).packaging.palletWeight===30&&(await po()).packaging.measuredWeight===null);
 await ptype('#pick-tolerance','2.5');R('Kommissionierung Toleranz 2.5 gültig',(await po()).packaging.tolerancePercent===2.5);
 R('Kommissionierung: keine JS-Fehler',hp.errs.length===0,hp.errs.join('|'));await hp.b.close();}
// ===== Mobiles Layout: Bearbeiten-Button =====
for(const [name,o,coarseExpect] of [['Desktop 1100',{},false],['iPhone SE',{dev:'iPhone SE'},true],['iPhone 14',{dev:'iPhone 14'},true],['Pixel 7',{dev:'Pixel 7'},true],['iPad Pro 11',{dev:'iPad Pro 11'},true],['iPad Pro 11 quer',{dev:'iPad Pro 11 landscape'},true]]){
 const hm=await seed(o);await hm.p.evaluate(()=>tab('articles'));await hm.p.waitForTimeout(200);const bb=await hm.p.locator('[data-edit="A1"]').boundingBox();
 const all=await hm.p.evaluate(()=>[...document.querySelectorAll('#articleRows button')].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]}));
 let overlap=false;for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],c=all[j];if(a[0]<c[2]&&c[0]<a[2]&&a[1]<c[3]&&c[1]<a[3])overlap=true}
 const sw=await hm.p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 if(name==='Desktop 1100')R('Layout '+name+': Button unverändert 30 px hoch',Math.round(bb.height)===30,bb.width.toFixed(0)+'x'+bb.height);else R('Layout '+name+': Bearbeiten-Button >= 44x44 ('+bb.width.toFixed(0)+'x'+bb.height.toFixed(0)+')',bb.height>=44&&bb.width>=44);
 R('Layout '+name+': Buttons überlappen nicht, kein horizontaler Seitenüberlauf',!overlap&&sw);
 await hm.p.evaluate(()=>document.querySelector('[data-edit="A1"]').click());await hm.p.waitForTimeout(150);R('Layout '+name+': Bearbeiten öffnet Formular (Funktion erhalten)',await hm.p.evaluate(()=>document.getElementById('aCode').readOnly&&document.getElementById('aCode').value==='A1'));await hm.b.close()}
// ===== Import/Export =====
{const dl=h.p.waitForEvent('download');await h.p.evaluate(()=>{tab('more');document.getElementById('jsonExport').click()});const d=await dl;const f=path.join(os.tmpdir(),'ap52_export.json');await d.saveAs(f);const ex=JSON.parse(fs.readFileSync(f,'utf8'));
 R('9 Export enthält Konfiguration, max/min/Gewichte unverändert',ex.config.shelf===800&&ex.items.find(a=>a.code==='A1').max===null&&ex.items.find(a=>a.code==='S1').max===100);
 const imp=o=>{const g=path.join(os.tmpdir(),'ap52_imp.json');fs.writeFileSync(g,JSON.stringify(o));return g};
 for(const [lbl,mut,okE] of [['gültig (max 77, min 3, shelf 900,5)',x=>{x.items.find(a=>a.code==='A1').max=77;x.items.find(a=>a.code==='A1').min=3;x.config.shelf=900.5},true],['max "5" (String)',x=>{x.items.find(a=>a.code==='A1').max='5'},false],['max 1.5',x=>{x.items.find(a=>a.code==='A1').max=1.5},false],['min -1',x=>{x.items.find(a=>a.code==='A1').min=-1},false],['config.tare "x"',x=>{x.config.tare='x'},false],['config.shelf -5',x=>{x.config.shelf=-5},false],['Altdaten: Min 500 > Max 100',x=>{x.items.find(a=>a.code==='A1').min=500},true]]){
  const h2=await seed();const o=JSON.parse(await raw(h2));mut(o);const before=await raw(h2);await h2.p.evaluate(()=>tab('more'));const nav=h2.p.waitForNavigation({timeout:4000}).then(()=>true).catch(()=>false);await h2.p.setInputFiles('#jsonImport',imp(o));await nav;await h2.p.waitForTimeout(400);
  const now=await h2.p.evaluate(k=>localStorage.getItem(k),K);R('9 Import '+lbl+': '+(okE?'übernommen':'abgelehnt, Speicher unverändert'),okE?now!==before&&JSON.stringify(JSON.parse(now).boxes)===JSON.stringify(JSON.parse(before).boxes):JSON.stringify(JSON.parse(now).items)===JSON.stringify(JSON.parse(before).items)&&JSON.stringify(JSON.parse(now).config)===JSON.stringify(JSON.parse(before).config));await h2.b.close()}}
// ===== Gewicht AP5.1 weiterhin =====
for(const v of ['abc','1e999','Infinity','-1','1.2.3']){const w0=(await art(h,'A1'));const before=await raw(h);await aform(h,{aWeight:v},'A1');R('AP5.1 Gewicht "'+v+'" weiterhin abgelehnt, Speicher gleich',(await raw(h))===before&&/Gewicht muss/.test(await msg(h,'aMessage')))}
await aform(h,{aWeight:'2,5'},'A1');R('AP5.1 Gewicht 2,5 gültig',(await art(h,'A1')).weight===2.5);
// ===== Integrität =====
R('Integrität: Boxen unverändert',(await part(h,'boxes'))===base.boxes);R('Integrität: Plätze unverändert',(await part(h,'places'))===base.places);R('Integrität: QR-Zuordnung unverändert',(await part(h,'qrMap'))===base.qrMap);
R('Integrität: Anzahl/Codes der Altartikel erhalten',JSON.stringify(JSON.parse(baseItems).map(a=>a.code))===JSON.stringify(await h.p.evaluate(()=>state.items.slice(0,3).map(a=>a.code))));
R('Integrität: valid()',await h.p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7')))));R('Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close();
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail);process.exit(fail?1:0)})();
async function store(h){return h.p.evaluate(k=>localStorage.getItem(k),PK)}
