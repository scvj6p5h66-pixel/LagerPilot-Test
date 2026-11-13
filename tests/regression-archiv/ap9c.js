const {open}=require('./lib');
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,200),id);
const R=(id,ok,i)=>console.log((ok?'PASS ':'FAIL ')+id+(i!==undefined?'  | '+String(i).slice(0,200):''));
const A1={code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3};
(async()=>{const h=await open();
// A) handgebauter Seed (places:{})
const hand={schema:27,places:{},items:[A1],boxes:[{id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0}],history:[],inventoryLogs:[],qrMap:{},config:{shelf:800,bay:2000,palletMax:1000,tare:25},legacyOrders:[]};
await h.p.evaluate(d=>{localStorage.clear();localStorage.setItem('lagerpilot_v2_7',JSON.stringify(d))},hand);await h.p.reload();await h.p.waitForTimeout(600);
console.log('A) handgebaut: locked=',await h.p.evaluate(()=>storageLocked),'boxes=',await h.p.evaluate(()=>state.boxes.length),'shelf=',await h.p.evaluate(()=>state.config.shelf),'keys=',await h.p.evaluate(()=>Object.keys(localStorage)));
// B) App-erzeugte Seeds
async function seed(shelf){await h.p.evaluate(()=>localStorage.clear());await h.p.reload();await h.p.waitForTimeout(500);
 await h.p.evaluate(([a,sh])=>{transaction(s=>{s.items.push(a);s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0});Object.assign(s.config,{shelf:sh,bay:2000,palletMax:1000,tare:25})})},[A1,shelf]);
 const raw=await h.p.evaluate(()=>localStorage.getItem('lagerpilot_v2_7'));await h.p.reload();await h.p.waitForTimeout(500);return raw}
const book=async o=>{await h.go('book');await setf(h.p,'bookArticle','A1');for(const [k,x] of Object.entries(o))await setf(h.p,k,x);await h.p.evaluate(()=>bookSubmit.click());await h.dlg();return txt(h.p,'bookMessage')};
for(const [n,sh] of [['800',800],['600',600],['null',null]]){const raw=await seed(sh);
 R('5 v2.7 Fachlast '+n+' nach Reload unverändert, nicht gesperrt',(await h.p.evaluate(()=>state.config.shelf))===sh&&!(await h.p.evaluate(()=>storageLocked)));
 R('5 Byte-identisch gespeichert (kein stilles Umschreiben beim Laden)',(await h.p.evaluate(()=>localStorage.getItem('lagerpilot_v2_7')))===raw);
 const m=await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'5'});
 R('5 Fachlast '+n+': Einlagern '+(sh===null?'gesperrt':'möglich'),sh===null?/unvollständig/.test(m):/gespeichert/.test(m),m);
 if(sh===null){const o=await book({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'2'});R('5 Fachlast null: Ausbuchen möglich',/gespeichert/.test(o),o)}}
// C) Legacy
const leg={items:[{code:'L1',name:'L',barcode:'',unit:'STK',pack:1,weight:1,max:10,minStock:null}],boxes:[{place:'H4A-1-1',code:'L1',available:3,blocked:0}],history:[],places:{}};
await h.p.evaluate(d=>{localStorage.clear();localStorage.setItem('lagerpilot_demo_v1',JSON.stringify(d))},leg);await h.p.reload();await h.p.waitForTimeout(600);
console.log('C) Legacy main-key: locked=',await h.p.evaluate(()=>storageLocked),'boxes=',await h.p.evaluate(()=>state.boxes.length),'cfg=',JSON.stringify(await h.p.evaluate(()=>state.config)));
const leg2={schema:26,places:{},items:[A1],boxes:[{id:'b1',place:'H4A-1-1',code:'A1',qty:10,blocked:0}],history:[],inventoryLogs:[],qrMap:{},config:{bay:null,palletMax:null,tare:null},legacyOrders:[]};
console.log(h.errs);await h.b.close()})();
