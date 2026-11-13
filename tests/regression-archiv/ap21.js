// SA-14 Abschlussprüfung: Import/Export und Altdaten, alter Stand (8fde636, Port 8125) gegen neuen Stand (8224daa, Port 8123)
const {chromium}=require('playwright');const fs=require('fs');const D='/tmp/ap21_';
const OLD='http://localhost:8125/index.html',NEW='http://localhost:8123/index.html',K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,260):''))};
const it=(code,o={})=>({code,name:'Art '+code,barcode:'',unit:'STK',pack:1,weight:2,max:100,min:null,...o});
(async()=>{const b=await chromium.launch();
const open=async url=>{const ctx=await b.newContext({viewport:{width:1000,height:800}});const p=await ctx.newPage();p.setDefaultTimeout(60000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url);await p.waitForTimeout(400);return {ctx,p,errs}};
// Referenzbestand mit Altdaten-Besonderheiten bauen (in neutralem Profil, dann identisch in beide Stände schreiben)
const seedPage=await open(OLD);
const seed=await seedPage.p.evaluate(()=>{
 const s=structuredClone(state);const pl=Object.keys(s.places);
 s.config={shelf:800,bay:2000,palletMax:1000,tare:25};
 s.items=[{code:'A1',name:'Normal',barcode:'4006381333931',unit:'STK',pack:6,weight:2,max:100,min:30},
  {code:'LEG',name:'Altartikel Min>Max',barcode:'',unit:'STK',pack:1,weight:1.5,max:100,min:500},
  {code:'a1x',name:'Kleinbuchstaben-Nummer',barcode:'',unit:'P',pack:1,weight:3,max:50,min:null},
  {code:'NOMAX',name:'Ohne Maximum',barcode:'',unit:'STK',pack:1,weight:null,max:null,min:5},
  {code:'ÄÖÜ-ß',name:'Umlaute & <b>Sonderzeichen</b> "x"',barcode:'',unit:'STK',pack:1,weight:1,max:1000,min:null}];
 s.boxes=[{id:'b1',place:pl[0],code:'A1',qty:40,blocked:0},{id:'b2',place:pl[1],code:'A1',qty:20,blocked:5},{id:'b3',place:pl[2],code:'LEG',qty:100,blocked:0},{id:'b4',place:pl[3],code:'a1x',qty:7,blocked:0},{id:'b5',place:pl[3],code:'NOMAX',qty:3,blocked:0},{id:'b6',place:pl[4],code:'ÄÖÜ-ß',qty:55,blocked:0}];
 s.places[pl[10]].status='locked';s.places[pl[11]].status='reserved';
 s.history=[{at:'2026-11-01T08:00:00.000Z',text:'Altlast Eintrag'}];
 return s});
await seedPage.ctx.close();
const put=async(url,key,obj)=>{const h=await open(url);await h.p.evaluate(([k,o])=>localStorage.setItem(k,JSON.stringify(o)),[key,obj]);await h.p.reload();await h.p.waitForTimeout(400);return h};
const exportJson=async h=>{await h.p.evaluate(()=>tab('more'));const dl=h.p.waitForEvent('download');await h.p.evaluate(()=>jsonExport.click());const d=await dl;const f=D+Math.random().toString(36).slice(2)+'.json';await d.saveAs(f);return f};
const importFile=async(h,f)=>{await h.p.setInputFiles('#jsonImport',f);await h.p.waitForTimeout(900)};
const stored=h=>h.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
const core=s=>JSON.stringify({c:s.config,i:s.items,b:s.boxes,p:s.places});
const strip=o=>{const c=JSON.parse(JSON.stringify(o));const walk=x=>{if(x&&typeof x==='object'){for(const k of Object.keys(x)){if(/exportedAt|savedAt|updatedAt|exported/i.test(k))delete x[k];else walk(x[k])}}};walk(c);return c};
// 1 Export aus altem und neuem Stand mit identischem Bestand
const hOld=await put(OLD,K,seed),hNew=await put(NEW,K,seed);
R('Beide Stände laden den Referenzbestand ohne Fehler',(await stored(hOld))&&(await stored(hNew))&&hOld.errs.length===0&&hNew.errs.length===0,hOld.errs.concat(hNew.errs).join('|'));
const fOld=await exportJson(hOld),fNew=await exportJson(hNew);
const eOld=JSON.parse(fs.readFileSync(fOld,'utf8')),eNew=JSON.parse(fs.readFileSync(fNew,'utf8'));
R('Export alt/neu: Artikel, Boxen, Plätze, Konfiguration identisch',core(eOld.state||eOld)===core(eNew.state||eNew),Object.keys(eNew).join(','));
R('Export alt/neu: gesamte Datei identisch (ohne Zeitstempel)',JSON.stringify(strip(eOld))===JSON.stringify(strip(eNew)));
// 2 Export-Datei des alten Stands in den neuen importieren und umgekehrt
const hNew2=await open(NEW);await importFile(hNew2,fOld);const s2=await stored(hNew2);
R('Import (Export von 8fde636) in neuen Stand: Artikel/Boxen/Plätze/Konfiguration unverändert',core(s2)===core(seed),'');
R('Import in neuen Stand: Sonderzeichen-Artikel korrekt',s2.items.some(a=>a.code==='ÄÖÜ-ß'&&a.name.includes('<b>Sonderzeichen</b>')));
R('Import in neuen Stand: Altartikel Min 500 / Max 100 unverändert',s2.items.find(a=>a.code==='LEG').min===500&&s2.items.find(a=>a.code==='LEG').max===100);
R('Import in neuen Stand: gesperrte Teilmenge, Platzstatus erhalten',s2.boxes.find(b=>b.id==='b2').blocked===5&&Object.values(s2.places).filter(p=>p.status==='locked').length===1);
const hOld2=await open(OLD);await importFile(hOld2,fNew);const s3=await stored(hOld2);
R('Rückrichtung: Export des neuen Stands in alten Stand importierbar, Bestand unverändert',core(s3)===core(seed));
// 3 Rundlauf im neuen Stand
const fRound=await exportJson(hNew2);const hNew3=await open(NEW);await importFile(hNew3,fRound);const s4=await stored(hNew3);
R('Rundlauf Export→Import im neuen Stand: unverändert',core(s4)===core(seed));
R('valid() nach Import bestanden, 6.480 Plätze',await hNew3.p.evaluate(()=>valid(JSON.parse(localStorage.getItem('lagerpilot_v2_7')))&&Object.keys(state.places).length===6480));
// 4 CSV-Export alt/neu
const csv=async h=>{await h.p.evaluate(()=>tab('more'));const dl=h.p.waitForEvent('download');await h.p.evaluate(()=>csvExport.click());const d=await dl;const f=D+Math.random().toString(36).slice(2)+'.csv';await d.saveAs(f);return fs.readFileSync(f,'utf8')};
const cOld=await csv(hOld),cNew=await csv(hNew);R('CSV-Export alt/neu identisch',cOld===cNew,cNew.split('\n').length+' Zeilen');
// 5 Defekte/beschädigte Importe werden weiter abgelehnt (unverändertes Verhalten)
fs.writeFileSync(D+'bad.json','{"kaputt":');const hBad=await open(NEW);const before=await hBad.p.evaluate(k=>localStorage.getItem(k),K);await importFile(hBad,D+'bad.json');
R('Beschädigte Importdatei: Bestand unverändert',(await hBad.p.evaluate(k=>localStorage.getItem(k),K))===before);
// 6 Kommissionier-Speicher bleibt von Lageroperationen unberührt
const hP=await open(NEW);const pk0=await hP.p.evaluate(k=>localStorage.getItem(k),PK);
await hP.p.evaluate(([k,o])=>localStorage.setItem(k,JSON.stringify(o)),[K,seed]);await hP.p.reload();await hP.p.waitForTimeout(400);
const pkBefore=await hP.p.evaluate(k=>localStorage.getItem(k),PK);
await hP.p.evaluate(()=>{tab('merge');renderMerge();render();tab('book');$('bookAction').value='in';$('bookArticle').value='A1';$('bookPlace').value=Object.keys(state.places)[0];$('bookQty').value='1';$('bookSubmit').click()});
R('Kommissionier-Speicher nach Lagerbuchung unverändert',(await hP.p.evaluate(k=>localStorage.getItem(k),PK))===pkBefore,String(pkBefore).slice(0,40));
R('Wareneingang +1 auf bestehende Box wirkt (40→41)',(await stored(hP)).boxes.find(b=>b.id==='b1').qty===41);
R('Keine JavaScript-Fehler (alle Seiten)',[hNew2,hOld2,hNew3,hBad,hP].every(h=>h.errs.length===0),[hNew2,hOld2,hNew3,hBad,hP].map(h=>h.errs.join('|')).join(';'));
await b.close();const f=res.filter(r=>!r[1]).length;console.log('GESAMT '+res.length+' / FAIL '+f);
})().catch(e=>{console.log('SCRIPTFEHLER',e.message.slice(0,500))});
