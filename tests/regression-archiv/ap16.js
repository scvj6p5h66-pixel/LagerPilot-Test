const {chromium,devices}=require('playwright');const fs=require('fs');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,240):''))};
const K='lagerpilot_v2_7';const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const mkI=(code,name,o={})=>({code,name,barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null,...o});
const ITEMS=[mkI('A1','Art1',{barcode:'BC1',weight:2,min:3}),mkI('A3','Art3',{max:50}),mkI('LM','Legacy Min>Max',{min:500,max:100})];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'LM',qty:100,blocked:0}];
const snap=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),K);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim(),id);
async function mk(dev,extra={}){const b=await chromium.launch();const ctx=await b.newContext({...(dev?devices[dev]:{viewport:{width:1200,height:800}}),...extra});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(500);
 await p.evaluate(([c,i,x])=>{transaction(s=>{Object.assign(s.config,c);s.items.push(...i);s.boxes.push(...x)})},[FULL,ITEMS,BOX]);
 await p.evaluate(()=>{render();tab('articles')});await p.waitForTimeout(200);return {b,ctx,p,errs}}
const vis=(p,sel)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {w:r.width,h:r.height,top:r.top,bottom:r.bottom,hidden:cs.display==='none'||cs.visibility==='hidden'||e.classList.contains('hidden'),inView:r.bottom>0&&r.top<innerHeight}},sel);
(async()=>{
for(const dev of ['iPhone 14','iPad Pro 11','iPad Pro 11 landscape']){
 const T=dev+': ';const h=await mk(dev),p=h.p;
 R(T+'hasTouch/UA emuliert',await p.evaluate(()=>navigator.maxTouchPoints>0&&/iPhone|iPad|Macintosh/.test(navigator.userAgent)),await p.evaluate(()=>navigator.userAgent.slice(0,60)));
 const ov=()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 R(T+'kein horizontaler Überlauf (Artikeltab)',await ov());
 const btn=p.locator('[data-edit="A1"]');await btn.scrollIntoViewIfNeeded();const bb=await btn.boundingBox();
 R(T+'Bearbeiten-Button Tap-Ziel >=32px',bb&&bb.height>=32&&bb.width>=32,JSON.stringify(bb));
 await btn.tap();await p.waitForTimeout(150);
 let hint=await vis(p,'#aModeHint');
 R(T+'Hinweis sichtbar nach Tap',hint&&!hint.hidden,await txt(p,'aModeHint'));
 const ro=await p.evaluate(()=>[aCode.readOnly,aCode.value,aName.value,aMin.value,aMax.value]);
 R(T+'Formular befüllt, Nummer schreibgeschützt',ro[0]===true&&ro[1]==='A1'&&ro[2]==='Art1',JSON.stringify(ro));
 // Hinweis im Sichtbereich nach Scroll zum Formular?
 await p.locator('#aSave').scrollIntoViewIfNeeded();await p.waitForTimeout(100);
 await p.screenshot({path:`../shots_${dev.replace(/ /g,'_')}_edit.png`});
 // Nummernfeld per Tastatur nicht änderbar
 await p.locator('#aCode').tap({force:true}).catch(()=>{});await p.keyboard.type('ZZ');
 R(T+'Tippen in Nummernfeld ändert nichts',(await p.inputValue('#aCode'))==='A1');
 // Mindestbestand ändern per Tippen
 await p.locator('#aMin').fill('600');await p.locator('#aSave').tap();await p.waitForTimeout(200);
 let s=await snap(p);let a=s.items.find(x=>x.code==='A1');
 R(T+'Bearbeitung speichert (Min 600)',a.min===600&&/gespeichert/.test(await txt(p,'aMessage')),await txt(p,'aMessage'));
 R(T+'Modus nach Speichern beendet',await p.evaluate(()=>[aCode.readOnly,aCode.value,document.getElementById('aModeHint').classList.contains('hidden')].join())==='false,,true');
 // Neuanlage mit vorhandener Nummer (a1) per Tippen
 const before=await p.evaluate(k=>localStorage.getItem(k),K);
 await p.locator('#aName').fill('Überschreiber');await p.locator('#aCode').fill('a1');await p.locator('#aMax').fill('7');await p.locator('#aSave').tap();await p.waitForTimeout(200);
 R(T+'Neuanlage "a1" abgelehnt, Speicher unverändert',(await p.evaluate(k=>localStorage.getItem(k),K))===before&&/existiert bereits/.test(await txt(p,'aMessage')),await txt(p,'aMessage'));
 const mv=await vis(p,'#aMessage');R(T+'Fehlermeldung sichtbar',mv&&!mv.hidden&&mv.h>0);
 // Neuanlage Min 500 / Max 100
 await p.locator('#aClear').tap();
 await p.locator('#aName').fill('Neu500');await p.locator('#aCode').fill('N500');await p.locator('#aWeight').fill('2');await p.locator('#aMax').fill('100');await p.locator('#aMin').fill('500');await p.locator('#aSave').tap();await p.waitForTimeout(200);
 s=await snap(p);a=s.items.find(x=>x.code==='N500');R(T+'Neuanlage Min 500 / Box-Max 100 gespeichert',a&&a.min===500&&a.max===100,await txt(p,'aMessage'));
 // Bearbeiten -> Eingabe leeren -> Modus verlassen
 await p.locator('[data-edit="LM"]').scrollIntoViewIfNeeded();await p.locator('[data-edit="LM"]').tap();await p.locator('#aClear').scrollIntoViewIfNeeded();await p.locator('#aClear').tap();
 R(T+'Eingabe leeren beendet Modus',await p.evaluate(()=>[aCode.readOnly,aCode.value,document.getElementById('aModeHint').classList.contains('hidden')].join())==='false,,true');
 // Altartikel LM 500->600
 await p.locator('[data-edit="LM"]').scrollIntoViewIfNeeded();await p.locator('[data-edit="LM"]').tap();await p.locator('#aMin').fill('600');await p.locator('#aSave').scrollIntoViewIfNeeded();await p.locator('#aSave').tap();await p.waitForTimeout(200);
 s=await snap(p);R(T+'Altartikel LM 500->600 speichert',s.items.find(x=>x.code==='LM').min===600&&s.boxes.filter(x=>x.code==='LM').length===1,await txt(p,'aMessage'));
 R(T+'kein horizontaler Überlauf am Ende',await ov());
 R(T+'valid() & keine JS-Fehler',await p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7'))))&&h.errs.length===0,h.errs.join('|'));
 await h.b.close();
}
// Desktop: andere Einstiege / Zustandswechsel im Bearbeitungsmodus
let h=await mk(null),p=h.p;
await p.evaluate(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){window.__cb=cb}async stop(){}async clear(){}}});
await p.evaluate(()=>{tab('articles')});
const formState=()=>p.evaluate(()=>[aCode.value,aName.value,aCode.readOnly,aModeHint.classList.contains('hidden')].join('|'));
const f0=await formState();
// Alle Tabs durchlaufen, Scan-Code A1/BC1: Formular darf sich nicht füllen
const tabs=await p.evaluate(()=>[...document.querySelectorAll('section[id]')].map(s=>s.id));
await p.evaluate(()=>{tab('scan')});
for(const c of ['A1','BC1','LM']){await p.evaluate(c=>{scanInput.value=c;handleScan(c)},c);}
R('Scan von Artikelcode öffnet kein Artikelformular',(await formState())===f0,await formState());
for(const t of tabs){try{await p.evaluate(t=>tab(t),t)}catch(e){}}
R('Durchlauf aller Tabs ('+tabs.length+') ändert Artikelformular nicht',(await formState())===f0,tabs.join(','));
const editers=await p.evaluate(()=>{const out=[];document.querySelectorAll('[data-edit]').forEach(e=>out.push(e.closest('section')?.id||'?'));return [...new Set(out)]});
R('data-edit-Buttons nur im Artikeltab',editers.length===1&&editers[0]==='articles',editers.join());
const html=await p.evaluate(()=>document.documentElement.outerHTML);
R('Quelltext: aCode.readOnly nur in Bearbeitungspfad/Clear',(html.match(/aCode'\)\.readOnly/g)||[]).length>=1,(html.match(/readOnly/g)||[]).length);
// Bearbeitungsmodus + Wechsel Tabs + Import
await p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A1"]').click()});
await p.evaluate(()=>{tab('home');tab('articles')});
R('Modus bleibt beim Tabwechsel',(await formState()).startsWith('A1|Art1|true|false'),await formState());
// Import: Export erzeugen, A1 entfernen, importieren
const exp=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
exp.items=exp.items.filter(x=>x.code!=='A1');exp.boxes=exp.boxes.filter(x=>x.code!=='A1');
fs.writeFileSync('/tmp/imp_noA1.json',JSON.stringify(exp));
// AP5.4: Der Import fragt per confirm() nach. Ohne Dialog-Handler lehnt Playwright den Dialog ab -> Import wurde nie ausgeführt (Testfehler #26). Jetzt: bestätigen und auf das Neuladen warten.
p.on('dialog',d=>d.accept());const navImp=p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);
await p.setInputFiles('#jsonImport','/tmp/imp_noA1.json');const reloadedImp=await navImp;await p.waitForTimeout(600);
const afterImp=await formState();const hasA1=(await snap(p)).items.some(x=>x.code==='A1');
R('Import (Dialog bestätigt) wurde tatsächlich ausgeführt: Seite neu geladen, A1 entfernt, Sicherung vor Import vorhanden',reloadedImp&&!hasA1&&!!(await p.evaluate(()=>localStorage.getItem('lagerpilot_before_import'))),'reload='+reloadedImp+' A1='+hasA1);
console.log('INFO nach Import ohne A1: Formular='+afterImp+' A1 vorhanden='+hasA1+' Meldung='+(await txt(p,'importMessage')||''));
await p.evaluate(()=>{tab('articles')});
await p.locator('#aMin').evaluate(e=>e.value='9').catch(()=>{});
const b4=await p.evaluate(k=>localStorage.getItem(k),K);
await p.evaluate(()=>aSave.click());await p.waitForTimeout(200);
const msg=await txt(p,'aMessage');const st=await snap(p);
R('Edit-Modus + A1 per Import entfernt: Speichern legt A1 NICHT neu an',!st.items.some(x=>x.code==='A1'),msg);
console.log('INFO Meldung:',msg,'| Modus danach:',await formState());
// Reload im Bearbeitungsmodus
await p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A3"]').click()});
await p.reload();await p.waitForTimeout(500);await p.evaluate(()=>tab('articles'));
R('Reload beendet Modus (Nummer wieder editierbar, Hinweis aus)',(await formState()).endsWith('false|true'),await formState());
// Zweiter Tab: A ist im Edit-Modus für A3, B ändert A3, A speichert -> stale guard
const p2=await h.ctx.newPage();await p2.goto('http://localhost:8123/index.html');await p2.waitForTimeout(400);
await p.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A3"]').click();aMin.value='11'});
await p2.evaluate(()=>transaction(s=>{s.items.find(x=>x.code==='A3').name='ChangedInB'}));
await p.evaluate(()=>aSave.click());await p.waitForTimeout(200);
const st2=await snap(p);
R('Zwei Tabs: veralteter Tab überschreibt A3 nicht',st2.items.find(x=>x.code==='A3').name==='ChangedInB'&&st2.items.find(x=>x.code==='A3').min!==11,await txt(p,'aMessage'));
R('Desktop JS-Fehler',h.errs.length===0,h.errs.join('|'));
await h.b.close();
const f=res.filter(r=>!r[1]).length;console.log('GESAMT '+res.length+' / FAIL '+f);
})().catch(e=>{console.log('SCRIPTFEHLER',e.message.slice(0,400))});
