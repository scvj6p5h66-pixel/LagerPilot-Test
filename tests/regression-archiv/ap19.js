const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(500);
await p.evaluate(()=>{const places=Object.keys(state.places).slice(0,3000);transaction(s=>{s.items.push({code:'FULL',name:'Voll',barcode:'',unit:'STK',pack:1,weight:0.1,max:1000,min:null});Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.boxes=places.map((pl,i)=>({id:'f'+i,place:pl,code:'FULL',qty:10,blocked:0}))})});
console.log(await p.evaluate(()=>{const t=(f)=>{const a=performance.now();try{f()}catch(e){return 'ERR '+e.message}return Math.round(performance.now()-a)};
 return JSON.stringify({valid:t(()=>valid(state)),clone:t(()=>structuredClone(state)),renderHomeOccupancy:t(()=>renderHomeOccupancy()),renderHistory:t(()=>renderHistory()),stringify:t(()=>JSON.stringify(state))})}));
const src=await p.evaluate(()=>String(valid));console.log('valid() Länge',src.length);
const m=src.match(/boxes[^;]{0,200}(some|find|filter|indexOf)[^;]{0,150}/g);console.log((m||[]).slice(0,4).join('\n---\n'));
await b.close()})();
