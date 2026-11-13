const {chromium}=require('playwright');const fs=require('fs');const K='lagerpilot_v2_7';
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const mkI=(code,name,o={})=>({code,name,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null,...o});
(async()=>{
for(const variant of ['A1 entfernt','A1 geändert']){
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:800}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const dl=[];p.on('dialog',d=>{dl.push(d.type()+':'+d.message().slice(0,80));d.accept()});
await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(400);
await p.evaluate(([c,i])=>{transaction(s=>{Object.assign(s.config,c);s.items.push(...i);s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0})})},[FULL,[mkI('A1','Art1',{weight:2,min:3}),mkI('A3','Art3')]]);
await p.evaluate(()=>{render();tab('articles');document.querySelector('[data-edit="A1"]').click();aMin.value='9';aName.value='Meine Eingabe'});
const exp=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
if(variant==='A1 entfernt'){exp.items=exp.items.filter(x=>x.code!=='A1');exp.boxes=exp.boxes.filter(x=>x.code!=='A1');}else{exp.items.find(x=>x.code==='A1').name='Importname';exp.items.find(x=>x.code==='A1').min=77;}
fs.writeFileSync('/tmp/imp.json',JSON.stringify(exp));
await p.setInputFiles('#jsonImport','/tmp/imp.json');await p.waitForTimeout(600);
let s=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
console.log('==',variant,'| Dialoge:',dl.join(' ; '),'| A1 nach Import:',JSON.stringify(s.items.find(x=>x.code==='A1')||null));
console.log('Formular nach Import:',await p.evaluate(()=>[aCode.value,aName.value,aMin.value,aCode.readOnly,aModeHint.classList.contains('hidden')].join('|')));
await p.evaluate(()=>{tab('articles');aSave.click()});await p.waitForTimeout(300);
s=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
console.log('Speichern ->',await p.evaluate(()=>aMessage.textContent.trim()),'| A1 danach:',JSON.stringify(s.items.find(x=>x.code==='A1')||null),'| Boxen A1:',s.boxes.filter(x=>x.code==='A1').length,'| Modus:',await p.evaluate(()=>[aCode.readOnly,aModeHint.classList.contains('hidden')].join()),'| JS-Fehler:',errs.length);
await b.close();}
})();
