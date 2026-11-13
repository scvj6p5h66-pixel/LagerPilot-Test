const {chromium}=require('playwright');const K='lagerpilot_v2_7';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(500);
console.log('Version/Frischstart: Places',await p.evaluate(()=>Object.keys(state.places).length),'Items',await p.evaluate(()=>state.items.length),'Boxes',await p.evaluate(()=>state.boxes.length));
// XSS: Artikelname/Nummer/Barcode mit HTML
const X='<img src=x onerror="window.__xss=(window.__xss||0)+1">';
await p.evaluate(x=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'XS1',name:x,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:5});s.boxes.push({id:'bx',place:'H4A-1-1',code:'XS1',qty:3,blocked:0})})},X);
await p.evaluate(()=>{render()});
for(const t of ['home','stock','scan','merge','book','racks','articles','inventory','more']){try{await p.evaluate(t=>tab(t),t);await p.waitForTimeout(80)}catch(e){}}
await p.evaluate(()=>{scanInput.value='XS1';handleScan('XS1')});
console.log('XSS durch Artikelname in allen Tabs ausgelöst:',await p.evaluate(()=>window.__xss||0));
// Name in Historie / Inventur
await p.evaluate(()=>tab('more'));console.log('XSS nach Historie:',await p.evaluate(()=>window.__xss||0));
// Lagerplatz-QR / Barcode mit HTML? Import mit präpariertem Platz
// Rollen: Einstellung per Dropdown?
console.log('Rolle-Eingabe vorhanden:',await p.evaluate(()=>!!document.getElementById('qsRoleInput')),'Optionen:',await p.evaluate(()=>[...(document.getElementById('qsRoleInput')?.options||[])].map(o=>o.value).join(',')));
// Volllast: 6480 Boxen
const t0=Date.now();
await p.evaluate(()=>{const places=Object.keys(state.places).slice(0,6480);transaction(s=>{s.items.push({code:'FULL',name:'Voll',barcode:'',unit:'STK',pack:1,weight:0.1,max:1000,min:null});places.forEach((pl,i)=>{if(!s.boxes.some(b=>b.place===pl))s.boxes.push({id:'f'+i,place:pl,code:'FULL',qty:10,blocked:0})})})});
const sz=await p.evaluate(k=>localStorage.getItem(k).length,K);
console.log('Vollbelegung ms',Date.now()-t0,'| Boxen',await p.evaluate(()=>state.boxes.length),'| gespeicherte Größe (Zeichen)',sz,'(~',(sz*2/1048576).toFixed(2),'MB UTF-16)');
const r0=Date.now();await p.evaluate(()=>{render();tab('racks');tab('stock');tab('home')});console.log('Render Vollbelegung ms',Date.now()-r0);
// localStorage-Grenze
const lim=await p.evaluate(()=>{let n=0;try{const s='x'.repeat(100000);for(;;){localStorage.setItem('probe'+n,s);n++}}catch(e){const c=n*100000;for(let i=0;i<n;i++)localStorage.removeItem('probe'+i);return c}});
console.log('freier localStorage-Platz zusätzlich ca. Zeichen:',lim);
console.log('JS-Fehler',errs.length,errs.slice(0,3).join('|'));await b.close()})();
