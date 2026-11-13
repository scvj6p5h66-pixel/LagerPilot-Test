const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext(devices['iPhone 14']);const p=await ctx.newPage();
await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(400);
await p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});for(let i=1;i<=12;i++)s.items.push({code:'X'+i,name:'Art'+i,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})});render();tab('articles')});
const btn=p.locator('[data-edit="X12"]');await btn.scrollIntoViewIfNeeded();const y0=await p.evaluate(()=>scrollY);await btn.tap();await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const h=document.getElementById('aModeHint').getBoundingClientRect(),c=document.getElementById('aSave').getBoundingClientRect();return {scrollY,hintTop:h.top,hintBottom:h.bottom,saveTop:c.top,vh:innerHeight}});
console.log('scrollY vorher',y0,'nachher',JSON.stringify(r),'Hinweis im Sichtbereich:',r.hintBottom>0&&r.hintTop<r.vh,'Speichern im Sichtbereich:',r.saveTop>0&&r.saveTop<r.vh);
await p.screenshot({path:'../shots_iPhone_after_tap_X12.png'});await b.close()})();
