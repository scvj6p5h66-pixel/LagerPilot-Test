// AP5.3 – Artikeltabelle auf schmalen Displays: Ist-Zustand und Prüfung des CSS-Vorschlags (docs/ap53/artikeltabelle-vorschlag.css).
// Aufruf: BASE=http://localhost:8123/index.html node tests/mobile/ap53-artikeltabelle.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const BASE=process.env.BASE||'http://localhost:8123/index.html';
const CSS=fs.readFileSync(path.join(__dirname,'../../docs/ap53/artikeltabelle-vorschlag.css'),'utf8');
let pass=0,fail=0,befund=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,150):''))};const B=(id,info)=>{befund++;console.log('BEFUND '+id+(info?'  | '+String(info).slice(0,150):''))};
async function measure(b,w,withCss,touch=true){const c=await b.newContext({viewport:{width:w,height:800},hasTouch:touch,isMobile:touch});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(BASE);await p.waitForTimeout(250);if(withCss)await p.addStyleTag({content:CSS});
 await p.evaluate(()=>{transaction(s=>{for(let i=1;i<=6;i++)s.items.push({code:'ART-'+i,name:'Lange Artikelbezeichnung Nummer '+i+' für den Test mit viel Text',barcode:'',unit:i%2?'P':'STK',pack:12,weight:2.5,max:100,min:5})});tab('articles')});await p.waitForTimeout(250);
 const r=await p.evaluate(()=>{const bt=[...document.querySelectorAll('#articleRows button[data-edit]')];const rects=bt.map(x=>x.getBoundingClientRect());let ov=false;for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],c=rects[j];if(a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom)ov=true}
  const rows=[...document.querySelectorAll('#articleRows tr')].map(x=>Math.round(x.getBoundingClientRect().height));return {n:bt.length,visible:rects.every(x=>x.left>=0&&x.right<=innerWidth),w:Math.round(rects[0].width),h:Math.round(rects[0].height),overlap:ov,pageOverflow:document.documentElement.scrollWidth>innerWidth,rowH:rows[0],cut:rects.some(x=>x.left<0)}});
 const reach=await p.evaluate(()=>{const wr=document.querySelector('#articleRows').closest('.scroll');if(wr)wr.scrollLeft=99999;const bt=document.querySelector('#articleRows button[data-edit]').getBoundingClientRect();return bt.left>=0&&bt.right<=innerWidth});
 await p.evaluate(()=>{const e=document.querySelector('#articleRows button[data-edit]');e.scrollIntoView();e.click()});await p.waitForTimeout(150);const edit=await p.evaluate(()=>document.getElementById('aCode').readOnly&&document.getElementById('aCode').value==='ART-1');
 await c.close();return {...r,reach,edit,errs}}
(async()=>{const b=await chromium.launch();
for(const w of [320,360,375,390,414,430]){const a=await measure(b,w,false);
 if(!a.visible)B('Ist '+w+' px: Bearbeiten-Button liegt ohne seitliches Wischen außerhalb des Bildschirms','Button '+a.w+'x'+a.h);else R('Ist '+w+' px: Button sichtbar',true);
 R('Ist '+w+' px: Button durch Scrollen der Tabelle erreichbar, Seite ohne Überlauf, Funktion ok',a.reach&&!a.pageOverflow&&a.edit&&a.errs.length===0);
 const n=await measure(b,w,true);R('Vorschlag '+w+' px: alle Bearbeiten-Buttons sichtbar, '+n.w+'x'+n.h+' (>=44), keine Überlappung, kein Seitenüberlauf, Funktion ok',n.visible&&n.w>=44&&n.h>=44&&!n.overlap&&!n.pageOverflow&&n.edit&&n.errs.length===0,'Zeilenhöhe '+n.rowH)}
for(const w of [601,768,1100,1400]){const a=await measure(b,w,false,false),n=await measure(b,w,true,false);R('Vorschlag '+w+' px (Desktop/Tablet): Darstellung unverändert (Zeilenhöhe '+a.rowH+' = '+n.rowH+', Button '+a.w+'x'+a.h+' = '+n.w+'x'+n.h+')',a.rowH===n.rowH&&a.w===n.w&&a.h===n.h&&n.visible)}
await b.close();console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail+' / BEFUNDE '+befund);process.exit(fail?1:0)})();
