const {open}=require('./lib');
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const A1={code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3};
(async()=>{for(const [n,cfg,q] of [['Altbox überlastet (Fachlast 100), Zählung 40 (<50)',{shelf:100,bay:2000,palletMax:1000,tare:25},40],['Altbox überlastet, Zählung 30 (125→85 ok)',{shelf:100,bay:2000,palletMax:1000,tare:25},30],['Lastdaten fehlen, Zählung 40 (<50)',{shelf:800,bay:2000,palletMax:1000,tare:null},40],['Lastdaten fehlen, Zählung 0',{shelf:800,bay:2000,palletMax:1000,tare:null},0]]){
 const h=await open();await h.p.evaluate(([cfg,a])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(a);s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0})})},[cfg,A1]);
 await h.go('inventory');await h.p.evaluate(()=>{window.confirm=()=>true});for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:String(q)}))await setf(h.p,k,x);
 await h.p.evaluate(()=>invCompare.click());await h.p.evaluate(()=>invCommit.click());
 console.log(n,'=>',await h.p.evaluate(()=>invResult.textContent.trim().slice(0,120)),'| qty',await h.p.evaluate(()=>state.boxes[0]?.qty??'(Box weg)'));await h.b.close()}})();
