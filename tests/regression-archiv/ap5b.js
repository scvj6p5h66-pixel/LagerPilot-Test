const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();p.on('dialog',d=>d.accept());await p.goto('http://localhost:8123/index.html');
const leg={places:{},items:[{code:'L1',name:'A',minStock:5.5,locations:{'H4A-1-1':{available:3,blocked:1}}}],history:Array.from({length:3500},(_,i)=>'e'+i),orders:[]};
await p.evaluate(o=>{localStorage.removeItem('lagerpilot_v2_7');localStorage.setItem('lagerpilot_demo_v1',JSON.stringify(o))},leg);const orig=await p.evaluate(()=>localStorage.getItem('lagerpilot_demo_v1'));await p.reload();await p.waitForTimeout(600);
console.log('same',orig===await p.evaluate(()=>localStorage.getItem('lagerpilot_demo_v1')),'boxes',JSON.stringify(await p.evaluate(()=>state.boxes.map(b=>[b.place,b.code,b.qty,b.blocked]))),'locked',await p.evaluate(()=>storageLocked),'err',await p.evaluate(()=>loadError));
// v2.6 UI sichtbar im Mehr-Tab?
const s=await p.evaluate(()=>0);
await p.evaluate(()=>{const s=structuredClone(state);s.schema=26;delete s.inventoryLogs;s.history=Array.from({length:3200},(_,i)=>({at:'x',text:'h'+i}));s.config={shelf:800};localStorage.removeItem('lagerpilot_v2_7');localStorage.removeItem('lagerpilot_demo_v1');localStorage.setItem('lagerpilot_v2_6',JSON.stringify(s))});await p.reload();await p.waitForTimeout(600);
await p.evaluate(()=>{tab('more')});
console.log('Mehr-Tab zeigt Migration:',await p.evaluate(()=>/Migration:/.test(document.body.innerText)),'| zeigt "Daten aus Version 2.6":',await p.evaluate(()=>document.body.innerText.includes('Daten aus Version 2.6')));
console.log('Home zeigt Hinweis:',await (async()=>{await p.evaluate(()=>tab('home'));return p.evaluate(()=>/Version 2\.6|Migration/.test(document.body.innerText))})());
await b.close();})();
