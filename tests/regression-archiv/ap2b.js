const {open}=require('./lib');
(async()=>{const h=await open();const {p,ev}=h;
const setf=(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
await h.go('more');await setf('lockPlace','constructor');await setf('lockStatus','locked');await p.evaluate(()=>lockSave.click());console.log('lock constructor:',await p.evaluate(()=>lockMessage.textContent));
await setf('lockPlace','__proto__');await p.evaluate(()=>lockSave.click());console.log('lock __proto__:',await p.evaluate(()=>lockMessage.textContent));
await h.go('scan');await setf('scanInput','__proto__');await p.evaluate(()=>scanLookup.click());await setf('scanMapPlace','H4A-2-2');await p.evaluate(()=>scanMapSave.click());
console.log('map __proto__:',await p.evaluate(()=>scanResult.textContent),'| qrMap',await ev(()=>JSON.stringify(state.qrMap)),'| stored',await p.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('lagerpilot_v2_7')).qrMap)),'| history top',await ev(()=>state.history[0].text));
await setf('scanInput','__proto__');await p.evaluate(()=>scanLookup.click());console.log('rescan:',await p.evaluate(()=>scanResult.textContent));
console.log('errs',h.errs);await h.b.close();})();
