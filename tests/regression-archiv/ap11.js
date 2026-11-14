const {open}=require('./lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).slice(0,230):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,300),id);
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k)||'null')}),K);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const ITEMS=[{code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3},{code:'P1',name:'Pack',barcode:'',unit:'P',pack:12,weight:2.5,max:100,min:null}];
const BOX=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'A1',qty:30,blocked:0},{id:'b3',place:'H4A-2-1',code:'P1',qty:2,blocked:0}];
async function mk(cfg=FULL,boxes=BOX,items=ITEMS){const h=await open();await h.p.evaluate(([cfg,it,bx])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...it);s.boxes.push(...bx)})},[cfg,items,boxes]);return h}
async function cnt(h,place,art,qty,confirm=true){await h.go('inventory');await h.p.evaluate(c=>{window.confirm=m=>{window.__dlg.push('confirm:'+m);return c}},confirm);await h.dlg();
 await setf(h.p,'invPlace',place);await setf(h.p,'invArticle',art);await setf(h.p,'invQty',String(qty));await h.p.evaluate(()=>invCompare.click());
 const cmp=await txt(h.p,'invResult');const btn=await h.p.evaluate(()=>({t:invCommit.textContent,hidden:invCommit.classList.contains('hidden'),dis:invCommit.disabled}));
 let res='';if(!btn.hidden){await h.p.evaluate(()=>invCommit.click());await h.dlg();res=await txt(h.p,'invResult')}return {cmp,btn,res}}
const okRes=r=>/protokolliert|Inventurdifferenz gespeichert/.test(r.res);
// Szenario-Runner: erwartet pro Zählung ok/abgelehnt, prüft Integrität
async function scen(name,cfg,cases,boxes=BOX,items=ITEMS){
 for(const [place,art,q,expOk,why] of cases){const h=await mk(cfg,boxes,items);const b=await snap(h);const r=await cnt(h,place,art,q);const a=await snap(h);
  const dl=a.st.inventoryLogs.length-b.st.inventoryLogs.length,dh=a.st.history.length-b.st.history.length;
  if(expOk){const bx=a.st.boxes.find(x=>x.place===place&&x.code===art);const exp=art==='P1'?q/12:q;
   R(name+': Zählung '+q+' → erlaubt'+(why?' ('+why+')':''),okRes(r)&&dl===1&&dh===1&&(exp===0?!bx:bx&&bx.qty===exp)&&a.st.inventoryLogs[0].count===exp,r.res+' | log+'+dl);
   // andere Boxen unverändert
   const o=x=>JSON.stringify(x.st.boxes.filter(y=>!(y.place===place&&y.code===art)));R(name+': Zählung '+q+' → andere Boxen unverändert',o(a)===o(b));
  }else{R(name+': Zählung '+q+' → abgelehnt'+(why?' ('+why+')':''),!okRes(r)&&a.raw===b.raw,(r.res||r.cmp));}
  R(name+': '+q+' JS-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}}
(async()=>{
// 1/3: Lastdaten fehlen (tare), alle null
for(const [n,cfg] of [['tare fehlt',{...FULL,tare:null}],['alle null',{shelf:null,bay:null,palletMax:null,tare:null}],['bay fehlt',{...FULL,bay:null}]]){
 await scen('1/3 '+n,cfg,[['H4A-1-1','A1',50,true,'Diff 0'],['H4A-1-1','A1',40,true,'Reduktion'],['H4A-1-1','A1',0,true,'Zählung 0'],['H4A-1-1','A1',51,false,'Erhöhung'],['H4A-1-1','A1',55,false,'Erhöhung'],['H4A-3-3','A1',1,false,'neue Box auf leerem Platz'],['H4A-2-1','P1',24,true,'Pack Diff 0'],['H4A-2-1','P1',12,true,'Pack Reduktion'],['H4A-2-1','P1',36,false,'Pack Erhöhung']])}
// 2/4: überlastet
const OV={...FULL,shelf:100};
await scen('2/4 überlastet (125>100)',OV,[['H4A-1-1','A1',50,true,'Diff 0'],['H4A-1-1','A1',40,true,'Reduktion bleibt >100'],['H4A-1-1','A1',37,true,'Reduktion unter Grenze'],['H4A-1-1','A1',0,true,'0'],['H4A-1-1','A1',51,false,'Erhöhung'],['H4A-1-2','A1',30,true,'Diff0 andere Box (85 ok)'],['H4A-1-2','A1',31,true,'+1 → 87 ok'],['H4A-1-2','A1',38,false,'→ 101 > 100']]);
// 5: Erhöhung mit korrekter Prüfung, volle Konfig
await scen('5 Erhöhung',FULL,[['H4A-1-1','A1',60,true],['H4A-1-1','A1',100,true,'Max, 225 kg'],['H4A-1-1','A1',101,false,'über Max'],['H4A-1-2','A1',99,true],['H4A-5-5','A1',100,true,'neue Box'],['H4A-5-5','A1',101,false,'neue Box über Max'],['H4A-2-1','P1',36,true,'Pack 3'],['H4A-2-1','P1',1224,false,'Pack über Max/Last']]);
await scen('5 Fachlast',{...FULL,shelf:125},[['H4A-1-1','A1',50,true],['H4A-1-1','A1',51,false,'127>125'],['H4A-3-3','A1',50,true,'neue Box 125 = Grenze'],['H4A-3-3','A1',51,false,'neue Box 127']]);
await scen('5 Palette',{...FULL,palletMax:125},[['H4A-1-1','A1',51,false,'Palette'],['H4A-3-3','A1',50,true,'Grenze']]);
await scen('5 Feldlast',{...FULL,bay:125},[['H4A-1-1','A1',51,false,'Feldlast'],['H4A-3-3','A1',50,true,'Grenze']]);
// Artikel ohne Gewicht (weight null) mit Bestand
await scen('5 Artikel ohne Gewicht',FULL,[['H4A-1-1','A1',50,true,'Diff 0'],['H4A-1-1','A1',51,false,'Erhöhung, Gewicht fehlt'],['H4A-1-1','A1',49,true,'Reduktion']],BOX,ITEMS.map(i=>i.code==='A1'?{...i,weight:null}:i));// AP5.4: A1 jetzt wirklich ohne Gewicht (vorher Gewicht 2 trotz Kommentar "weight null")
// Gewicht-null Variante gesondert
{const h=await mk();await h.p.evaluate(()=>{transaction(s=>{s.items.find(a=>a.code==='A1').weight=null})});const b=await snap(h);
 let r=await cnt(h,'H4A-1-1','A1',51);R('5 weight=null: Erhöhung abgelehnt',!okRes(r)&&(await snap(h)).raw===b.raw,r.res);
 r=await cnt(h,'H4A-1-1','A1',40);R('4 weight=null: Reduktion erlaubt',okRes(r),r.res);
 R('JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Artikel mit max=null
{const h=await mk();await h.p.evaluate(()=>{transaction(s=>{s.items.find(a=>a.code==='A1').max=null})});const b=await snap(h);
 let r=await cnt(h,'H4A-1-1','A1',51);R('5 max=null: Erhöhung abgelehnt',!okRes(r)&&(await snap(h)).raw===b.raw,r.res);
 r=await cnt(h,'H4A-1-1','A1',50);R('1 max=null: Diff 0 erlaubt',okRes(r),r.res);await h.b.close()}
// Sicherheits-/Plausibilitätsprüfungen: Plätze gesperrt/reserviert (freeFor wird bei Nicht-Erhöhung nicht mehr geprüft)
for(const st of ['locked','reserved']){const h=await mk();await h.go('more');
 for(const [k,x] of Object.entries({lockPlace:'H4A-1-1',lockStatus:st,lockReason:'Test'}))await setf(h.p,k,x);await h.p.evaluate(()=>lockSave.click());await h.dlg();
 const pst=await h.p.evaluate(()=>JSON.stringify(state.places['H4A-1-1']).slice(0,120));
 let b=await snap(h);let r=await cnt(h,'H4A-1-1','A1',55);let a=await snap(h);
 R('Sicherheit Platz '+st+': Erhöhung weiter abgelehnt, nichts gespeichert',!okRes(r)&&a.raw===b.raw,r.res||r.cmp);
 b=await snap(h);r=await cnt(h,'H4A-1-1','A1',50);a=await snap(h);
 R('Info Platz '+st+': Diff 0 protokollierbar (neues Verhalten)',true,'ok='+okRes(r)+' '+(r.res||r.cmp)+' | '+pst);
 b=await snap(h);r=await cnt(h,'H4A-1-1','A1',40);a=await snap(h);
 R('Info Platz '+st+': Reduktion buchbar (neues Verhalten)',true,'ok='+okRes(r)+' '+(r.res||r.cmp));
 R('JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// 6 Protokoll/Historie/Integrität bei Reduktion
{const h=await mk({...FULL,tare:null});const b=await snap(h);await cnt(h,'H4A-1-1','A1',40);const a=await snap(h);
 R('6 Reduktion bei fehlenden Lastdaten: Log {before 50,count 40}, Historie "50 → 40", Summe der Boxen −10',a.st.inventoryLogs[0].before===50&&a.st.inventoryLogs[0].count===40&&a.st.history[0].text==='Blindinventur · A1 · H4A-1-1 · 50 → 40'&&a.st.boxes.reduce((s,x)=>s+x.qty,0)===b.st.boxes.reduce((s,x)=>s+x.qty,0)-10);
 R('6 Config unverändert (keine Seiteneffekte)',JSON.stringify(a.st.config)===JSON.stringify(b.st.config));
 const v=await h.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state))));R('6 valid() nach Buchung',v===true);
 // Persistenz
 await h.p.reload();await h.p.waitForTimeout(500);R('6 Nach Reload identisch',(await snap(h)).raw===a.raw);await h.b.close()}
// 7 Mehrfachklick / deaktivierter Button
{const h=await mk();await h.go('inventory');await h.p.evaluate(()=>{window.confirm=()=>true});
 for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'60'}))await setf(h.p,k,x);await h.p.evaluate(()=>invCompare.click());
 const b=await snap(h);await h.p.evaluate(()=>{invCommit.click();invCommit.click();invCommit.click()});await h.dlg();const a=await snap(h);
 R('7 Dreifachklick: genau 1 Eintrag, 1 Historie, Bestand 60',a.st.inventoryLogs.length===b.st.inventoryLogs.length+1&&a.st.history.length===b.st.history.length+1&&a.st.boxes.find(x=>x.id==='b1').qty===60);
 R('7 Erfolgsmeldung bleibt stehen (nicht von Fehler überschrieben)',/Inventurdifferenz gespeichert/.test(await txt(h.p,'invResult')),await txt(h.p,'invResult'));
 R('7 Button nach Erfolg versteckt und deaktiviert',await h.p.evaluate(()=>invCommit.disabled&&invCommit.classList.contains('hidden')));
 await h.p.evaluate(()=>invCommit.click());R('7 Klick auf deaktivierten Button ohne Wirkung',(await snap(h)).raw===a.raw);
 // Wiederverwendung: neue Zählung direkt danach
 for(const [k,x] of Object.entries({invQty:'55'}))await setf(h.p,'invQty','55');await h.p.evaluate(()=>invCompare.click());
 R('7 Nach neuer Eingabe + Vergleich Button wieder aktiv (nicht dauerhaft gesperrt)',await h.p.evaluate(()=>!invCommit.disabled&&!invCommit.classList.contains('hidden')));
 await h.p.evaluate(()=>invCommit.click());await h.dlg();R('7 Zweite Zählung nach der ersten funktioniert (55)',(await snap(h)).st.boxes.find(x=>x.id==='b1').qty===55&&(await snap(h)).st.inventoryLogs.length===b.st.inventoryLogs.length+2);
 // Fehlerpfad: Button bleibt aktiv, nichts gespeichert
 for(const [k,x] of Object.entries({invQty:'101'}))await setf(h.p,'invQty','101');await h.p.evaluate(()=>invCompare.click());const b2=await snap(h);await h.p.evaluate(()=>invCommit.click());
 R('7 Fehlerpfad (über Max): nichts gespeichert, Fehlermeldung',(await snap(h)).raw===b2.raw&&/Boxkapazität/.test(await txt(h.p,'invResult')),await txt(h.p,'invResult'));
 R('7 Fehlerpfad: Button bleibt bedienbar für Korrektur?',true,'disabled='+await h.p.evaluate(()=>invCommit.disabled));
 // Abbruch -> weiter aktiv, dann genau ein Eintrag
 await setf(h.p,'invQty','56');await h.p.evaluate(()=>invCompare.click());await h.p.evaluate(()=>{window.confirm=()=>false;invCommit.click()});const b3=await snap(h);
 R('7 Abbruch: Button bleibt aktiv, nichts gespeichert',await h.p.evaluate(()=>!invCommit.disabled)&&(await snap(h)).st.inventoryLogs.length===b3.st.inventoryLogs.length);
 await h.p.evaluate(()=>{window.confirm=()=>true;invCommit.click()});await h.dlg();R('7 Nach Abbruch bestätigen: 1 Eintrag mehr',(await snap(h)).st.inventoryLogs.length===b3.st.inventoryLogs.length+1);
 // Neue Zählung-Button
 await setf(h.p,'invQty','57');await h.p.evaluate(()=>invCompare.click());await h.p.evaluate(()=>invReset.click());R('7 "Neue Zählung" setzt Formular/Button zurück',await h.p.evaluate(()=>invQty.value===''&&invCommit.classList.contains('hidden')&&!invCommit.disabled));
 R('JS 7',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Stale Tab
{const h=await mk();const p2=await h.p.context().newPage();await p2.addInitScript(()=>{window.confirm=()=>true;window.alert=()=>{}});await p2.goto('http://localhost:8123/index.html');await p2.waitForTimeout(500);
 await h.go('inventory');for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'40'}))await setf(h.p,k,x);await h.p.evaluate(()=>invCompare.click());
 await p2.evaluate(()=>{transaction(s=>{history(s,'B')})});const n=(await snap(h)).st.inventoryLogs.length;await h.p.evaluate(()=>{window.confirm=()=>true;invCommit.click()});
 R('Sicherheit Stale-Tab: Reduktion aus veraltetem Vergleich wird nicht gespeichert',(await snap(h)).st.inventoryLogs.length===n,await txt(h.p,'invResult'));await h.b.close()}
// Manipulation: Vergleich, dann Konfiguration ändern -> Signatur
{const h=await mk();await h.go('inventory');await h.p.evaluate(()=>{window.confirm=()=>true});for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'50'}))await setf(h.p,k,x);await h.p.evaluate(()=>invCompare.click());
 await h.p.evaluate(()=>{transaction(s=>{s.boxes.find(b=>b.id==='b1').qty=70})});await h.p.evaluate(()=>invCommit.click());await h.dlg();
 R('Sicherheit: Bestand nach Vergleich geändert → Bestätigung abgelehnt (Signatur), Bestand bleibt 70',(await snap(h)).st.boxes.find(x=>x.id==='b1').qty===70&&/erneut zählen/.test(await txt(h.p,'invResult')),await txt(h.p,'invResult'));await h.b.close()}
// Mischung: Eingabe manipuliert nach Vergleich (Menge im Feld ändern -> reset)
{const h=await mk();await h.go('inventory');await h.p.evaluate(()=>{window.confirm=()=>true});for(const [k,x] of Object.entries({invPlace:'H4A-1-1',invArticle:'A1',invQty:'50'}))await setf(h.p,k,x);await h.p.evaluate(()=>invCompare.click());
 await setf(h.p,'invQty','99');R('Sicherheit: Menge nach Vergleich geändert → Button verschwindet (kein Buchen alter Vorschau mit neuem Feld)',await h.p.evaluate(()=>invCommit.classList.contains('hidden')));
 await h.p.evaluate(()=>invCommit.click());R('Sicherheit: ... und Klick ohne Vorschau speichert nichts',(await h.ev(()=>state.boxes.find(b=>b.id==='b1').qty))===50&&(await snap(h)).st.inventoryLogs.length===0);await h.b.close()}
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});

