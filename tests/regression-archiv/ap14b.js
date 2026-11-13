const {open}=require('./lib');
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const save=async(h,o)=>{await h.go('articles');for(const [k,x] of Object.entries({aName:'N',aCode:'',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'5',aMin:'',...o}))await setf(h.p,k,x);await h.p.evaluate(()=>aSave.click());return h.p.evaluate(()=>aMessage.textContent.trim())};
(async()=>{const h=await open();
for(const c of ['__proto__','toString','TOSTRING','valueOf','constructor','hasOwnProperty','__defineGetter__','__lookupSetter__','prototype','isPrototypeOf','propertyIsEnumerable','toLocaleString','__defineSetter__','__lookupGetter__'])console.log('Artikelnummer',c.padEnd(22),'→',await save(h,{aCode:c}));
console.log('Items danach:',await h.p.evaluate(()=>state.items.length));
// Mindestbestand Semantik
await h.p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'M1',name:'Mindest',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:500});s.boxes.push({id:'m1',place:'H4A-1-1',code:'M1',qty:100,blocked:0},{id:'m2',place:'H4A-1-2',code:'M1',qty:60,blocked:0})})});
await h.go('home');const t=await h.p.evaluate(()=>document.getElementById('homeWarnings').innerText);console.log('Home-Warnungen:',JSON.stringify(t.slice(0,200)));
await h.go('stock');console.log('Bestand enthält M1 / Mindest:',/Mindest/.test(await h.p.evaluate(()=>document.getElementById('stock').innerText)));
console.log('Fehler:',h.errs.join('|')||'keine');await h.b.close()})();
