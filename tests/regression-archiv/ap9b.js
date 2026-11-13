const {open}=require('./lib');
(async()=>{const h=await open();
const A1={code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3};
// Seed via a fresh context-less approach: build state from live app then edit
await h.p.evaluate(a=>{transaction(s=>{s.items.push(a);s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0});Object.assign(s.config,{shelf:600,bay:2000,palletMax:1000,tare:25})})},A1);
const raw=await h.p.evaluate(()=>localStorage.getItem('lagerpilot_v2_7'));
console.log('keys',await h.p.evaluate(()=>Object.keys(localStorage)));
const d=JSON.parse(raw);console.log(Object.keys(d).join(','));
await h.p.evaluate(()=>{localStorage.clear()});await h.p.evaluate(r=>localStorage.setItem('lagerpilot_v2_7',r),raw);
await h.p.reload();await h.p.waitForTimeout(600);
console.log('after reload shelf',await h.p.evaluate(()=>state.config.shelf),'locked',await h.p.evaluate(()=>storageLocked),'boxes',await h.p.evaluate(()=>state.boxes.length));
console.log(h.errs);await h.b.close()})();
