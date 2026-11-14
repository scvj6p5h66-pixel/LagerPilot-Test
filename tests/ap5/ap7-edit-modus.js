const {open}=require('../regression-archiv/lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,240),id);
(async()=>{
async function fresh(cfg={shelf:800,bay:2000,palletMax:1000,tare:25},extra){const h=await open();
 await h.ev(([cfg])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push({code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3},{code:'A2',name:'Art2',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'P1',name:'Pack',barcode:'',unit:'P',pack:12,weight:2.5,max:100,min:null});
  s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'A1',qty:30,blocked:0},{id:'b3',place:'H4A-2-1',code:'P1',qty:2,blocked:0})})},[cfg]).catch(e=>console.log('setup err',e));
 // evaluate arg workaround
 return h}
async function setup(h,cfg){await h.p.evaluate(cfg=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push({code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:2,max:100,min:3},{code:'A2',name:'Art2',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null},{code:'P1',name:'Pack',barcode:'',unit:'P',pack:12,weight:2.5,max:100,min:null});s.boxes.push({id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'A1',qty:30,blocked:0},{id:'b3',place:'H4A-2-1',code:'P1',qty:2,blocked:0})})},cfg)}
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
async function edit(h,o){await h.go('articles');await h.p.evaluate(c=>{const b=document.querySelector('[data-edit="'+c+'"]');if(b)b.click()},(o&&o.aCode)||'A1');const base={aName:'Art1',aCode:'A1',aBarcode:'BC1',aUnit:'STK',aPack:'1',aWeight:'2',aMax:'100',aMin:'3'};const v={...base,...o};for(const [k,x] of Object.entries(v))await setf(h.p,k,x);await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')}
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k))}),K);
const art=(s,c)=>s.st.items.find(a=>a.code===c);
const ok=m=>/Artikel gespeichert/.test(m);
let h=await open();await setup(h,FULL);
// 1 Max
let b=await snap(h);let m=await edit(h,{aMax:'49'});let a=await snap(h);
R('1 Max 49 < Box 50: abgelehnt mit Platz/Menge/Max',!ok(m)&&/H4A-1-1/.test(m)&&/50/.test(m)&&/49/.test(m)&&a.raw===b.raw,m);
R('6 Abgelehnt: Speicher byteweise unverändert, kein Historieneintrag',a.raw===b.raw);
R('6 Abgelehnt: Formularwerte bleiben erhalten (aMax=49)',(await h.p.evaluate(()=>aMax.value))==='49'&&(await h.p.evaluate(()=>aCode.value))==='A1');
R('6 Abgelehnt: In-Memory-Artikel unverändert',(await h.ev(()=>state.items.find(a=>a.code==='A1').max))===100);
m=await edit(h,{aMax:'50'});R('1 Max 50 = Boxmenge: erlaubt',ok(m)&&art(await snap(h),'A1').max===50,m);
m=await edit(h,{aMax:'49'});R('1 danach Max 49 wieder abgelehnt',!ok(m));
m=await edit(h,{aMax:'100'});R('1 Max zurück auf 100',ok(m));
m=await edit(h,{aMax:'29'});R('1 Max 29: abgelehnt (beide Boxen zu groß, erste gemeldet)',!ok(m)&&/Box auf H4A-1-/.test(m),m);
m=await edit(h,{aMax:'40'});R('1/5 Max 40: abgelehnt wegen Box 50, obwohl zweite Box (30) passt — keine Teiländerung',!ok(m)&&/H4A-1-1/.test(m)&&(await snap(h)).st.items.find(a=>a.code==='A1').max===100,m);
m=await edit(h,{aMax:''});R('1 Max leeren (null) bei Bestand: erlaubt/abgelehnt (Info)',true,'ok='+ok(m)+' max='+art(await snap(h),'A1').max+' msg='+m);
await edit(h,{aMax:'100'});
// P-Artikel
const pe=async o=>{await h.go('articles');await h.p.evaluate(()=>{const b=document.querySelector('[data-edit="P1"]');if(b)b.click()});/* AP5.4: erst Bearbeiten öffnen, sonst wird die Neuanlage-Prüfung (Dublette) ausgelöst */for(const [k,x] of Object.entries({aName:'Pack',aCode:'P1',aBarcode:'',aUnit:'P',aPack:'12',aWeight:'2.5',aMax:'100',aMin:'',...o}))await setf(h.p,k,x);await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')};
m=await pe({aMax:'1'});R('1 Pack-Artikel: Max 1 < 2 Pack: abgelehnt',!ok(m)&&/H4A-2-1/.test(m),m);
m=await pe({aMax:'2'});R('1 Pack-Artikel: Max 2 = 2 Pack: erlaubt',ok(m));
m=await pe({aMax:'100',aWeight:'500'});R('2 Pack-Artikel: Gewicht 500 (2×500+25=1025>800): abgelehnt',!ok(m)&&/Fachlast/.test(m),m);
// 2 Gewicht
await edit(h,{aMax:'100'});
m=await edit(h,{aWeight:'15.5'});R('2/3 Gewicht 15,5 → 50×15,5+25 = 800 = Fachlast: erlaubt (Grenze)',ok(m),m);
m=await edit(h,{aWeight:'15.6'});R('2 Gewicht 15,6 → 805 > 800: Fachlast abgelehnt mit Platz',!ok(m)&&/Fachlast/.test(m)&&/H4A-1-1/.test(m),m);
R('2 Gewicht blieb 15,5',art(await snap(h),'A1').weight===15.5);
await edit(h,{aWeight:'2'});
m=await edit(h,{aWeight:'500'});R('2 Altfall SA-05: Gewicht 500: abgelehnt',!ok(m)&&/Fachlast/.test(m),m);
// 3 innerhalb
b=await snap(h);m=await edit(h,{aWeight:'3',aMax:'60'});a=await snap(h);
R('3 Gewicht 3, Max 60 (alle Limits ok): gespeichert, Historie',ok(m)&&art(a,'A1').weight===3&&art(a,'A1').max===60&&/Artikel gespeichert: A1/.test(a.st.history[0].text)&&a.st.history.length===b.st.history.length+1,m);
R('3 Boxbestände unverändert (50/30/2)',JSON.stringify(a.st.boxes.map(x=>[x.id,x.qty,x.blocked]))===JSON.stringify(b.st.boxes.map(x=>[x.id,x.qty,x.blocked])));
m=await edit(h,{aName:'Neuer Name',aBarcode:'BC9',aMin:'7',aWeight:'3',aMax:'60'});R('3 Nur Name/Barcode/Min ändern bei Bestand: erlaubt',ok(m)&&art(await snap(h),'A1').name==='Neuer Name'&&art(await snap(h),'A1').min===7,m);
m=await edit(h,{aName:'Neuer Name',aBarcode:'BC9',aMin:'7',aWeight:'3',aMax:'60',aUnit:'P',aPack:'12'});R('8 Einheit ändern bei Bestand weiter gesperrt',!ok(m)&&/Migration/.test(m),m);
await edit(h,{aName:'Art1',aBarcode:'BC1',aMin:'3',aWeight:'2',aMax:'100'});
R('JS-Fehler Teil 1–3',h.errs.length===0,h.errs.join('|'));await h.b.close();
// Fachlast / Feldlast / Palette einzeln
const lim=async(name,cfg,w,expect)=>{const hh=await open();await setup(hh,cfg);const mm=await edit(hh,{aWeight:w});R('2 '+name+' (Gewicht '+w+')',expect==='ok'?ok(mm):(!ok(mm)&&new RegExp(expect).test(mm)),mm);R('6  -> '+name+': '+(expect==='ok'?'gespeichert':'unverändert'),art(await snap(hh),'A1').weight===(expect==='ok'?+w:2));await hh.b.close()};
await lim('nur Palettentragfähigkeit 500 (50×9,5+25=500 ok)',{shelf:5000,bay:5000,palletMax:500,tare:25},'9.5','ok');
await lim('nur Palettentragfähigkeit 500',{shelf:5000,bay:5000,palletMax:500,tare:25},'9.6','Palettentragfähigkeit');
await lim('nur Feldlast 500',{shelf:5000,palletMax:5000,bay:500,tare:25},'9.6','Feldlast');
await lim('nur Feldlast 500 (Grenze ok)',{shelf:5000,palletMax:5000,bay:500,tare:25},'9.5','ok');
await lim('Fachlast + Palette beide überschritten -> Fachlast zuerst',{shelf:300,bay:5000,palletMax:300,tare:25},'9','Fachlast');
// 4 Lastdaten fehlen
for(const [n,cfg] of [['tare fehlt',{shelf:800,bay:2000,palletMax:1000,tare:null}],['palletMax fehlt',{shelf:800,bay:2000,palletMax:null,tare:25}],['bay fehlt',{shelf:800,bay:null,palletMax:1000,tare:25}]]){
 const hh=await open();await setup(hh,cfg);const bb=await snap(hh);
 let mm=await edit(hh,{aWeight:'3'});R('4 '+n+': Gewichtsänderung mit Bestand abgelehnt (Lastdaten fehlen)',!ok(mm)&&/Lastdaten fehlen/.test(mm)&&(await snap(hh)).raw===bb.raw,mm);
 mm=await edit(hh,{aWeight:'2',aMax:'90'});R('4 '+n+': nur Max ändern (Gewicht gleich) -> Verhalten (Info)',true,'ok='+ok(mm)+' | '+mm.slice(0,110));
 const maxOnly=ok(mm);
 R('4 '+n+': Max-only-Änderung wird nicht durch fehlende Lastdaten blockiert',maxOnly,'ok='+maxOnly);
 mm=await edit(hh,{aWeight:'',aMax:'100'});R('4 '+n+': Gewicht löschen (null) bei Bestand (Info)',true,'ok='+ok(mm));
 const m47=await edit(hh,{aCode:'A2',aName:'Art2',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'999',aMax:'5',aMin:''});/* AP5.4: per Bearbeiten-Modus (sonst Neuanlage-Dublette) */
 R('4/7 '+n+': Artikel A2 ohne Bestand: beliebige Änderung erlaubt',ok(m47)&&art(await snap(hh),'A2').weight===999,m47);
 R('4 JS-Fehler',hh.errs.length===0,hh.errs.join('|'));await hh.b.close();}
// 5 mehrere Plätze, dritte Box verletzt
{const hh=await open();await setup(hh,FULL);await hh.p.evaluate(()=>{transaction(s=>{s.boxes.push({id:'b4',place:'H4A-5-1',code:'A1',qty:55,blocked:0})})});
 const bb=await snap(hh);let mm=await edit(hh,{aMax:'52'});R('5 drei Plätze, nur dritte (55) verletzt Max 52: abgelehnt, Platz genannt, nichts geändert',!ok(mm)&&/H4A-5-1/.test(mm)&&(await snap(hh)).raw===bb.raw,mm);
 mm=await edit(hh,{aWeight:'14.8'});R('5 Gewicht 14,8: Box 55×14,8+25=839>800 abgelehnt (Platz 5-1), 50er-Box allein wäre ok',!ok(mm)&&/H4A-5-1/.test(mm)&&(await snap(hh)).raw===bb.raw,mm);
 // AP5.4: 55×14,5+25 = 822,5 kg > Fachlast 800 -> die App lehnt zu Recht ab (frühere Erwartung "erlaubt" war falsch gerechnet)
 mm=await edit(hh,{aWeight:'14.5',aMax:'60'});R('5 Gewicht 14,5 (55×14,5+25=822,5>800): abgelehnt (Platz 5-1), nichts geändert',!ok(mm)&&/H4A-5-1/.test(mm)&&(await snap(hh)).raw===bb.raw,mm);
 mm=await edit(hh,{aWeight:'14',aMax:'60'});R('5 Gewicht 14 & Max 60 (55×14+25=795≤800): alle Boxen ok -> erlaubt',ok(mm)&&art(await snap(hh),'A1').weight===14&&art(await snap(hh),'A1').max===60,mm);
 // blockierte Box
 await hh.p.evaluate(()=>{transaction(s=>{s.boxes.find(b=>b.id==='b4').blocked=55;s.boxes.find(b=>b.id==='b4').qsReason='x'})});
 mm=await edit(hh,{aWeight:'14',aMax:'54'});R('5 QS-gesperrte Box (55) wird ebenfalls geprüft: Max 54 abgelehnt',!ok(mm)&&/H4A-5-1/.test(mm),mm);
 // Box mit Menge 0 wird ignoriert
 await hh.p.evaluate(()=>{transaction(s=>{s.boxes.push({id:'z0',place:'H4A-7-7',code:'A2',qty:0,blocked:0})})});
 const m7=await edit(hh,{aCode:'A2',aName:'Art2',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'999',aMax:'1',aMin:''});
 R('7 Artikel mit Box-Menge 0: Änderung erlaubt (leere Box ignoriert)',ok(m7)&&art(await snap(hh),'A2').weight===999,m7);
 R('5 JS-Fehler',hh.errs.length===0,hh.errs.join('|'));await hh.b.close();}
// 8 Regression Funktionen nach Änderung
{const hh=await open();await setup(hh,FULL);await edit(hh,{aWeight:'10',aMax:'60'});
 await hh.go('book');const book=async o=>{for(const [k,x] of Object.entries(o))await setf(hh.p,k,x);await hh.p.evaluate(()=>bookSubmit.click());await hh.dlg();return txt(hh.p,'bookMessage')};await setf(hh.p,'bookArticle','A1');
 R('8 Wareneingang nutzt neues Gewicht: +10 auf 50er-Box (60×10+25=625 ok)',ok(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'}))||/gespeichert/.test(await txt(hh.p,'bookMessage')),await txt(hh.p,'bookMessage'));
 R('8 Wareneingang über neues Max 60 abgelehnt',!/gespeichert/.test(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'1'}))&&/Boxkapazität/.test(await txt(hh.p,'bookMessage')),await txt(hh.p,'bookMessage'));
 R('8 Ausbuchen funktioniert',/gespeichert/.test(await book({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'5'})));
 R('8 Umlagerung funktioniert',/gespeichert/.test(await book({bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-1',bookQty:'5'})));
 await hh.go('inventory');for(const [k,x] of Object.entries({invPlace:'H4A-1-2',invArticle:'A1',invQty:'25'}))await setf(hh.p,k,x);await hh.p.evaluate(()=>invCompare.click());await hh.p.evaluate(()=>invCommit.click());await hh.dlg();
 R('8 Inventur funktioniert',(await hh.ev(()=>state.boxes.find(b=>b.place==='H4A-1-2').qty))===25,await txt(hh.p,'invResult'));
 await hh.go('articles');for(const [k,x] of Object.entries({aName:'Neu',aCode:'N1',aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'10',aMin:''}))await setf(hh.p,k,x);await hh.p.evaluate(()=>aSave.click());
 R('8 Neuer Artikel anlegen',ok(await txt(hh.p,'aMessage')));
 await hh.go('articles');for(const [k,x] of Object.entries({aName:'Dup',aCode:'N2',aBarcode:'BC1',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'10',aMin:''}))await setf(hh.p,k,x);await hh.p.evaluate(()=>aSave.click());
 R('8 Doppelter Barcode weiter abgelehnt',!ok(await txt(hh.p,'aMessage')));
 R('8 JS-Fehler',hh.errs.length===0,hh.errs.join('|'));await hh.b.close();}
// Stale-Tab bei Artikelspeichern
{const hh=await open();await setup(hh,FULL);const p2=await hh.p.context().newPage();await p2.addInitScript(()=>{window.confirm=()=>true;window.alert=()=>{}});await p2.goto('http://localhost:8123/index.html');await p2.waitForTimeout(500);
 await hh.p.evaluate(()=>{transaction(s=>{history(s,'Tab A')})});
 await p2.evaluate(()=>{tab('articles');document.querySelector('[data-edit="A1"]').click();aName.value='Art1';aCode.value='A1';aBarcode.value='BC1';aUnit.value='STK';aPack.value='1';aWeight.value='3';aMax.value='100';aMin.value='3';aSave.click()});
 R('8 Veralteter Tab kann Artikel nicht speichern',/anderen Tab/.test(await p2.evaluate(()=>aMessage.textContent))&&(await snap(hh)).st.items.find(a=>a.code==='A1').weight===2,await p2.evaluate(()=>aMessage.textContent.slice(0,80)));await hh.b.close();}
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
