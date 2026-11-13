const {open}=require('./lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,200):''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,240),id);
const FULL={shelf:800,bay:2000,palletMax:1000,tare:25};
const A1=(w=2,mx=100)=>({code:'A1',name:'Art1',barcode:'BC1',unit:'STK',pack:1,weight:w,max:mx,min:3});
async function setup(h,cfg,items,boxes){await h.p.evaluate(([cfg,items,boxes])=>{transaction(s=>{Object.assign(s.config,cfg);s.items.push(...items);s.boxes.push(...boxes)})},[cfg,items,boxes])}
const B=[{id:'b1',place:'H4A-1-1',code:'A1',qty:50,blocked:0},{id:'b2',place:'H4A-1-2',code:'A1',qty:30,blocked:0}];
async function edit(h,o,code='A1'){await h.go('articles');const base={aName:'Art1',aCode:'A1',aBarcode:'BC1',aUnit:'STK',aPack:'1',aWeight:'2',aMax:'100',aMin:'3'};const vv={...base,...o};await h.p.evaluate(c=>{const b=[...document.querySelectorAll('[data-edit]')].find(e=>e.dataset.edit===c);if(b)b.click()},vv.aCode);for(const [k,x] of Object.entries(vv))await setf(h.p,k,x);await h.p.evaluate(()=>aSave.click());return txt(h.p,'aMessage')}
const snap=h=>h.p.evaluate(k=>({raw:localStorage.getItem(k),st:JSON.parse(localStorage.getItem(k))}),K);
const art=(s,c)=>s.st.items.find(a=>a.code===c);
const ok=m=>/Artikel gespeichert/.test(m);
(async()=>{
// 1 Max-only bei fehlenden Lastdaten
for(const [n,cfg] of [['tare',{...FULL,tare:null}],['palletMax',{...FULL,palletMax:null}],['bay',{...FULL,bay:null}],['shelf',{...FULL,shelf:null}],['alle',{shelf:null,bay:null,palletMax:null,tare:null}]]){
 const h=await open();await setup(h,cfg,[A1()],B);
 let m=await edit(h,{aMax:'90'});R('1 '+n+' fehlt: Max 100→90 (Boxen 50/30) erlaubt',ok(m)&&art(await snap(h),'A1').max===90,m);
 let b=await snap(h);m=await edit(h,{aMax:'40'});R('1 '+n+' fehlt: Max 40 < 50 weiter abgelehnt, Speicher unverändert',!ok(m)&&/H4A-1-1/.test(m)&&(await snap(h)).raw===b.raw,m);
 b=await snap(h);m=await edit(h,{aWeight:'3',aMax:'90'});R('1 '+n+' fehlt: Gewichtsänderung weiter abgelehnt (Lastdaten fehlen)',!ok(m)&&/Lastdaten fehlen/.test(m)&&(await snap(h)).raw===b.raw,m);
 m=await edit(h,{aName:'N',aMin:'9',aMax:'90'});R('1 '+n+' fehlt: Name/Min ändern erlaubt',ok(m),m);
 R('1 JS-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// 2 Löschen
{const h=await open();await setup(h,FULL,[A1()],B);let b=await snap(h);
 for(const [n,o] of [['Gewicht leeren',{aWeight:''}],['Max leeren',{aMax:''}],['beides leeren',{aWeight:'',aMax:''}]]){const m=await edit(h,o);R('2 '+n+' bei Bestand abgelehnt, deutsche Meldung',!ok(m)&&/nicht gelöscht/.test(m)&&(await snap(h)).raw===b.raw,m)}
 R('2 Formular behält Eingabe',(await h.p.evaluate(()=>aWeight.value+'|'+aMax.value))==='|');
 const m=await edit(h,{aWeight:'0'});R('2 Gewicht 0 bei Bestand (Info)',true,'ok='+ok(m)+' '+m);
 R('2 JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// 2b nur Boxen Menge 0 / kein Bestand: Löschen erlaubt
{const h=await open();await setup(h,FULL,[A1(),{...A1(),code:'A2',name:'A2',barcode:''}],[{id:'z',place:'H4A-7-7',code:'A2',qty:0,blocked:0}]);
 let m=await edit(h,{aCode:'A1',aWeight:'',aMax:''});R('4 Artikel ohne Box: Gewicht+Max löschen erlaubt',ok(m)&&art(await snap(h),'A1').weight===null&&art(await snap(h),'A1').max===null,m);
 m=await edit(h,{aName:'A2',aCode:'A2',aBarcode:'',aWeight:'',aMax:''});R('4 Artikel nur mit Menge-0-Box: löschen erlaubt',ok(m),m);
 m=await edit(h,{aName:'A2',aCode:'A2',aBarcode:'',aWeight:'999',aMax:'1'});R('4 Artikel ohne Bestand: Gewicht 999/Max 1 erlaubt',ok(m),m);
 m=await edit(h,{aName:'Neu',aCode:'N1',aBarcode:'',aWeight:'',aMax:''});R('4 Neuer Artikel ohne Gewicht/Max anlegbar',ok(m),m);
 R('4 JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// 2c Legacy: Artikel mit Bestand und null Gewicht/Max
{const h=await open();await setup(h,FULL,[A1(null,null)],B);
 let b=await snap(h);let m=await edit(h,{aWeight:'',aMax:'',aName:'Umbenannt'});R('2c Legacy null/null mit Bestand: nur Name ändern (nichts gelöscht) erlaubt',ok(m),m);
 m=await edit(h,{aName:'Umbenannt',aWeight:'2',aMax:'100'});R('2c Legacy null/null: Werte erstmals setzen (gültig) erlaubt',ok(m)&&art(await snap(h),'A1').weight===2,m);
 R('2c JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
{const h=await open();await setup(h,FULL,[A1(null,100)],B);let m=await edit(h,{aWeight:'',aMax:'90'});R('2c Legacy Gewicht null, nur Max 90 ändern (Info)',true,'ok='+ok(m)+' '+m);
 m=await edit(h,{aWeight:'500',aMax:'100'});R('2c Legacy Gewicht null→500: Fachlast abgelehnt',!ok(m)&&/Fachlast/.test(m),m);await h.b.close()}
// 3 Gewicht über Limits
for(const [n,cfg,w,exp] of [['Fachlast ok',{shelf:800,bay:5000,palletMax:5000,tare:25},'15.5','ok'],['Fachlast +',{shelf:800,bay:5000,palletMax:5000,tare:25},'15.6','Fachlast'],['Palette ok',{shelf:5000,bay:5000,palletMax:500,tare:25},'9.5','ok'],['Palette +',{shelf:5000,bay:5000,palletMax:500,tare:25},'9.6','Palettentragfähigkeit'],['Feld ok',{shelf:5000,palletMax:5000,bay:500,tare:25},'9.5','ok'],['Feld +',{shelf:5000,palletMax:5000,bay:500,tare:25},'9.6','Feldlast']]){
 const h=await open();await setup(h,cfg,[A1()],B);const b=await snap(h);const m=await edit(h,{aWeight:w});
 R('3 '+n+' (Gew. '+w+')',exp==='ok'?ok(m)&&art(await snap(h),'A1').weight===+w:(!ok(m)&&new RegExp(exp).test(m)&&/H4A-1-1/.test(m)&&(await snap(h)).raw===b.raw),m);await h.b.close()}
// 3b Gewicht gleich, Max-Änderung bei bereits überlasteter Box (Legacy): Reparatur möglich?
{const h=await open();await setup(h,FULL,[A1(20,100)],B);// 50*20+25=1025>800 bereits überlastet
 let m=await edit(h,{aWeight:'20',aMax:'60'});R('3b Bereits überlastete Box, Gewicht gleich, Max senken erlaubt (keine Blockade)',ok(m),m);
 m=await edit(h,{aWeight:'21',aMax:'60'});R('3b Überlastete Box, Gewicht erhöhen abgelehnt',!ok(m)&&/Fachlast/.test(m),m);
 m=await edit(h,{aWeight:'10',aMax:'60'});R('3b Überlastete Box, Gewicht senken in Limit erlaubt',ok(m),m);await h.b.close()}
// 5 mehrere Plätze, kein Teilspeichern, QS-Box
{const h=await open();await setup(h,FULL,[A1()],[...B,{id:'b4',place:'H4A-5-1',code:'A1',qty:55,blocked:55,qsReason:'x'}]);const b=await snap(h);
 let m=await edit(h,{aName:'Geändert',aBarcode:'BC7',aMin:'8',aMax:'52'});R('5 Name/Barcode/Min+Max 52: abgelehnt, nichts davon gespeichert',!ok(m)&&/H4A-5-1/.test(m)&&(await snap(h)).raw===b.raw,m);
 m=await edit(h,{aName:'Geändert',aBarcode:'BC7',aMin:'8',aMax:'100',aWeight:'14.5'});R('5 Gewicht 14,5 (55×14,5+25>800): abgelehnt, nichts gespeichert',!ok(m)&&(await snap(h)).raw===b.raw,m);
 R('5 Historie unverändert',(await snap(h)).st.history.length===b.st.history.length);
 m=await edit(h,{aName:'Geändert',aWeight:'14',aMax:'60'});R('5 Gewicht 14, Max 60 mit QS-Box: erlaubt; Boxen/QS unverändert',ok(m)&&JSON.stringify((await snap(h)).st.boxes)===JSON.stringify(b.st.boxes),m);
 R('5 JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// 8 Funktionen
{const h=await open();await setup(h,FULL,[A1()],B);await edit(h,{aWeight:'10',aMax:'60'});
 await h.go('book');const book=async o=>{for(const [k,x] of Object.entries(o))await setf(h.p,k,x);await h.p.evaluate(()=>bookSubmit.click());await h.dlg();return txt(h.p,'bookMessage')};await setf(h.p,'bookArticle','A1');
 R('8 Wareneingang +10',/gespeichert/.test(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'10'})));
 R('8 über Max abgelehnt',/Boxkapazität/.test(await book({bookAction:'in',bookPlace:'H4A-1-1',bookQty:'1'})));
 R('8 Ausbuchen',/gespeichert/.test(await book({bookAction:'out',bookPlace:'H4A-1-1',bookQty:'5'})));
 R('8 Umlagerung',/gespeichert/.test(await book({bookAction:'move',bookPlace:'H4A-1-1',bookTarget:'H4A-3-1',bookQty:'5'})));
 const m=await edit(h,{aName:'X',aCode:'N2',aBarcode:'BC1',aWeight:'1',aMax:'5'});R('8 Doppelter Barcode abgelehnt',!ok(m));
 R('8 Einheit bei Bestand gesperrt',/Migration/.test(await edit(h,{aWeight:'10',aMax:'60',aUnit:'P',aPack:'12'})));
 R('8 JS',h.errs.length===0,h.errs.join('|'));await h.b.close()}
const f=res.filter(x=>!x[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(x=>console.log(' -',x[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
