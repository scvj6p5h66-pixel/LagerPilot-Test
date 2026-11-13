// AP5.3 – Analysetest Lastkonfiguration: Absenken von Fach-/Feld-/Palettenlast bei bereits überschreitenden Boxen.
// Charakterisiert das IST-Verhalten (keine Änderung am Anwendungscode). BEFUND = Sicherheitsfinding, nur Information.
// Aufruf: BASE=http://localhost:8123/index.html node tests/mobile/ap53-lastkonfiguration.js
const {chromium}=require('playwright');const BASE=process.env.BASE||'http://localhost:8123/index.html';const K='lagerpilot_v2_7';
let pass=0,fail=0,befund=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,180):''))};const B=(id,info)=>{befund++;console.log('BEFUND '+id+(info?'  | '+String(info).slice(0,200):''))};
async function seed(){const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1000,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(BASE);await p.waitForTimeout(400);
 await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'S1',name:'x',barcode:'',unit:'STK',pack:1,weight:2,max:500,min:null});
  s.boxes.push({id:'b1',place:'H4A-1-1',code:'S1',qty:300,blocked:0},{id:'b2',place:'H4A-1-2',code:'S1',qty:20,blocked:0},{id:'b3',place:'H4A-1-3',code:'S1',qty:100,blocked:0});s.qrMap['QR-X']='H4A-1-1'})});return {b,p,errs}}
const raw=p=>p.evaluate(k=>localStorage.getItem(k),K);
const cfgSet=(p,k,v)=>p.evaluate(([k,v])=>{tab('more');const m={shelf:'cfgShelf',bay:'cfgBay',palletMax:'cfgPalletMax',tare:'cfgTare'};for(const x in m)document.getElementById(m[x]).value=state.config[x]??'';document.getElementById(m[k]).value=v;document.getElementById('cfgSave').click();return document.getElementById('cfgMessage').textContent},[k,v]);
// Vorschlagslogik (reine Berechnung, wie loadCheck: Boxgewicht = Menge × Packgewicht + Leergewicht, je Box gegen jede Grenze)
const overloaded=(p,k,v)=>p.evaluate(([k,v])=>{const s=state;const out=[];for(const b of s.boxes){const a=s.items.find(x=>x.code===b.code);if(!a||a.weight===null)continue;const w=b.qty*a.weight+s.config.tare;if(w>v)out.push({place:b.place,code:b.code,kg:w})}return out},[k,v]);
(async()=>{
for(const [key,newVal,exp] of [['shelf','300',['H4A-1-1']],['shelf','100',['H4A-1-1','H4A-1-3']],['bay','300',['H4A-1-1']],['palletMax','300',['H4A-1-1']]]){
 const {b,p,errs}=await seed();const before=JSON.parse(await raw(p));const calc=(await overloaded(p,key,Number(newVal))).map(x=>x.place);
 R('Vorschlagsberechnung '+key+'→'+newVal+': überschreitende Boxen '+exp.join(','),JSON.stringify(calc)===JSON.stringify(exp),calc.join(','));
 const m=await cfgSet(p,key,newVal);const after=JSON.parse(await raw(p));
 R(key+' auf '+newVal+' abgesenkt: Parameter wird gespeichert',/Parameter gespeichert/.test(m)&&after.config[key]===Number(newVal),m);
 if(/Parameter gespeichert\./.test(m)&&!/Box|überschr|Überlast/i.test(m))B(key+'→'+newVal+': KEINE Warnung, obwohl '+calc.length+' vorhandene Box(en) die neue Grenze überschreiten','Meldung: "'+m+'"');
 R('  Boxen/Bestände/QR/Plätze byteweise unverändert',JSON.stringify(after.boxes)===JSON.stringify(before.boxes)&&JSON.stringify(after.qrMap)===JSON.stringify(before.qrMap)&&JSON.stringify(after.places)===JSON.stringify(before.places));
 R('  Zustand bleibt gültig (valid)',await p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7')))));
 if(key==='shelf'&&newVal==='300'){
  const act=async(a,place,q)=>{await p.evaluate(([a,place,q])=>{tab('book');bookAction.value=a;bookArticle.value='S1';bookPlace.value=place;bookQty.value=String(q);bookSubmit.click()},[a,place,q]);await p.waitForTimeout(70);return p.evaluate(()=>state.boxes.map(x=>x.place+':'+x.qty).join(','))};
  const ms=()=>p.evaluate(()=>[...document.querySelectorAll('#book .error,#book .success')].map(x=>x.textContent).join('/'));
  let s1=await act('out','H4A-1-1',10);R('  Ausbuchen aus überladener Box bleibt möglich (300→290)',/H4A-1-1:290/.test(s1));
  s1=await act('in','H4A-1-1',1);R('  Erhöhung der überladenen Box (+1) wird gesperrt (Fachlast-Meldung)',/H4A-1-1:290/.test(s1)&&/Fachlast/.test(await ms()),await ms());
  s1=await act('in','H4A-1-4',200);R('  Neue Box mit 425 kg (> 300) wird gesperrt',!/H4A-1-4/.test(s1));
  s1=await act('in','H4A-1-5',100);R('  Neue Box mit 225 kg (< 300) bleibt möglich',/H4A-1-5:100/.test(s1));
  await p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="S1"]').click();aName.value='S1 umbenannt';aSave.click()});await p.waitForTimeout(70);
  R('  Artikel-Namensänderung trotz überladener Box möglich (Gewicht/Max unverändert)',/Artikel gespeichert/.test(await p.evaluate(()=>aMessage.textContent)));
  await p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="S1"]').click();aWeight.value='2,5';aSave.click()});await p.waitForTimeout(70);
  R('  Gewichtserhöhung des Artikels mit überladener Box wird abgelehnt',/Fachlast|überschritten/.test(await p.evaluate(()=>aMessage.textContent)),await p.evaluate(()=>aMessage.textContent));
 }
 R('  keine JS-Fehler',errs.length===0,errs.join('|'));await b.close()}
// Home-/Plätze-Anzeige weist nicht auf überladene Boxen hin
{const {b,p}=await seed();await cfgSet(p,'shelf','300');const t=await p.evaluate(()=>{tab('home');return document.getElementById('home').innerText});if(!/Überlast|überschr|Fachlast/i.test(t))B('Startseite weist nach dem Absenken nicht auf überladene Boxen hin');await b.close()}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail+' / BEFUNDE '+befund);process.exit(fail?1:0)})();
