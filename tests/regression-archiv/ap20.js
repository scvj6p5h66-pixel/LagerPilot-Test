const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(500);
await p.evaluate(()=>{const places=Object.keys(state.places).slice(0,3000);transaction(s=>{s.items.push({code:'FULL',name:'Voll',barcode:'',unit:'STK',pack:1,weight:0.1,max:1000,min:null});Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.boxes=places.map((pl,i)=>({id:'f'+i,place:pl,code:'FULL',qty:10,blocked:0}))})});
console.log(await p.evaluate(()=>{const t=(f)=>{const a=performance.now();try{f()}catch(e){return 'ERR '+e.message}return Math.round(performance.now()-a)};const r={};
 for(const n of ['renderStock','renderMerge','renderRack','renderHomeOccupancy','renderInventory','renderBoxes','renderArticles','renderWeights','suggestions','renderHome','renderBook'])if(typeof window[n]==='function')r[n]=t(()=>window[n]());return JSON.stringify(r)}));
await b.close()})();
