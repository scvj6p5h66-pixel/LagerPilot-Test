const {open}=require('./lib');
(async()=>{const h=await open();
const leg={places:{},items:[{code:'L1',name:'A',minStock:5,locations:{'H4A-1-1':{available:3,blocked:1}}}],history:['x'],orders:[]};
await h.p.evaluate(d=>{localStorage.clear();localStorage.setItem('lagerpilot_demo_v1',JSON.stringify(d))},leg);await h.p.reload();await h.p.waitForTimeout(600);
console.log('Legacy: locked=',await h.p.evaluate(()=>storageLocked),'boxes=',JSON.stringify(await h.p.evaluate(()=>state.boxes.map(b=>[b.place,b.qty,b.blocked]))),'cfg=',JSON.stringify(await h.p.evaluate(()=>state.config)));
console.log('Legacy Hinweis:',await h.p.evaluate(()=>upgradeNote));
console.log('Legacy Historie0:',await h.p.evaluate(()=>state.history[0]?.text.slice(0,300)));
console.log('Original unverändert:',(await h.p.evaluate(()=>localStorage.getItem('lagerpilot_demo_v1')))===JSON.stringify(leg));
const A1={code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3};
// v2.6 ohne shelf (aus App-Zustand abgeleitet)
await h.p.evaluate(()=>localStorage.clear());await h.p.reload();await h.p.waitForTimeout(500);
await h.p.evaluate(a=>{transaction(s=>{s.items.push(a);s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0})})},A1);
const st=JSON.parse(await h.p.evaluate(()=>localStorage.getItem('lagerpilot_v2_7')));st.schema=26;delete st.config.shelf;
await h.p.evaluate(d=>{localStorage.clear();localStorage.setItem('lagerpilot_v2_6',JSON.stringify(d))},st);await h.p.reload();await h.p.waitForTimeout(600);
console.log('v2.6 ohne shelf: locked=',await h.p.evaluate(()=>storageLocked),'cfg=',JSON.stringify(await h.p.evaluate(()=>state.config)),'boxes=',await h.p.evaluate(()=>state.boxes.length));
console.log('Hinweis:',await h.p.evaluate(()=>upgradeNote),'| Hist0:',await h.p.evaluate(()=>state.history[0]?.text.slice(0,300)));
console.log(h.errs);await h.b.close()})();
