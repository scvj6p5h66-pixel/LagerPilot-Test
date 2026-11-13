const {open}=require('./lib');
(async()=>{const h=await open();const {p,ev}=h;
const setf=(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
await h.go('more');await setf('lockPlace','constructor');await setf('lockStatus','locked');await setf('lockReason','x');await p.evaluate(()=>lockSave.click());
const st=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('lagerpilot_v2_7'));return {n:Object.keys(s.places).length,has:Object.hasOwn(s.places,'constructor'),val:s.places.constructor,hist:s.history[0].text}});
console.log('stored after lock "constructor":',JSON.stringify(st));
await p.reload();await p.waitForTimeout(500);await h.dlg();
console.log('after reload: locked=',await ev(()=>storageLocked),'places=',await ev(()=>Object.keys(state.places).length),'hasOwn constructor',await ev(()=>Object.hasOwn(state.places,'constructor')));
console.log('resolve("constructor") now:',await ev(()=>resolve('constructor')));
await h.go('racks');console.log('errs',h.errs);
// can a box be put on 'constructor'? 
await h.go('more');await setf('lockPlace','__proto__');await setf('lockStatus','locked');await p.evaluate(()=>lockSave.click());
console.log('__proto__ lock msg:',await p.evaluate(()=>lockMessage.textContent),'| stored own keys',await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('lagerpilot_v2_7')).places).length),'| history',await ev(()=>state.history[0].text));
console.log('errs',h.errs);await h.b.close();})();
