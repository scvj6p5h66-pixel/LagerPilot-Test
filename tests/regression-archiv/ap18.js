const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(500);
for(const n of [500,2000,6480]){
 await p.evaluate(n=>{const places=Object.keys(state.places).slice(0,n);transaction(s=>{s.boxes=[];if(!s.items.some(i=>i.code==='FULL'))s.items.push({code:'FULL',name:'Voll',barcode:'',unit:'STK',pack:1,weight:0.1,max:1000,min:null});Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.boxes=places.map((pl,i)=>({id:'f'+i,place:pl,code:'FULL',qty:10,blocked:0}))})},n);
 const m=await p.evaluate(()=>{const t=(f)=>{const a=performance.now();f();return Math.round(performance.now()-a)};const r={};r.render=t(()=>render());r.tabRacks=t(()=>tab('racks'));r.tabStock=t(()=>tab('stock'));r.tabHome=t(()=>tab('home'));
 r.transaction=t(()=>transaction(s=>{s.items.find(i=>i.code==='FULL').name='Voll'}));r.loadState=t(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')));return r});
 console.log('Boxen',n,JSON.stringify(m));
}
await b.close()})();
