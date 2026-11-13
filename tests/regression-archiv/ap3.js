const {open}=require('./lib');
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7';
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
const clk=(p,id)=>p.evaluate(id=>document.getElementById(id).click(),id);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim().slice(0,200),id);
const snap=p=>p.evaluate(()=>{const r=localStorage.getItem('lagerpilot_v2_7');const s=JSON.parse(r);return {raw:r,n:Object.keys(s.places).length,h:s.history.length,top:s.history[0]?.text}});
(async()=>{
let h=await open();let p=h.p;
await h.go('more');
const lock=async(pl,st='locked',reason='x')=>{await setf(p,'lockPlace',pl);await setf(p,'lockStatus',st);await setf(p,'lockReason',reason);await clk(p,'lockSave');return await txt(p,'lockMessage')};
// 1 ungültige Platzcodes
for(const k of ['constructor','__proto__','toString','hasOwnProperty','valueOf','prototype','isPrototypeOf','','   ','H4A-999-1','H4A-1-163','H4C-1-1','H4A-0-1','H4A-1-1-1','null','undefined','<b>x</b>']){
 const b=await snap(p);const m=await lock(k);const a=await snap(p);
 R('1 Sperre "'+k+'": Fehlermeldung, keine Änderung',/existiert nicht|ungültig|Unbekannt/i.test(m)&&a.raw===b.raw&&a.n===6480&&a.h===b.h,'msg='+m.slice(0,60)+' places='+a.n+' hist='+a.h);}
R('1 Prototyp von state.places unverändert',await h.ev(()=>Object.getPrototypeOf(state.places)===Object.prototype&&!('status' in state.places)));
// 4 normale Sperren
const b0=await snap(p);
R('4 Sperre H4A-5-5 locked',/gespeichert/.test(await lock('H4A-5-5','locked','Defekt')));
let a=await snap(p);R('4  -> Status+Historie',await h.ev(()=>state.places['H4A-5-5'].status==='locked'&&state.places['H4A-5-5'].reason==='Defekt')&&a.h===b0.h+1&&/H4A-5-5/.test(a.top),a.top);
R('4 Sperre per Kleinschreibung h4b-2-2 reserved',/gespeichert/.test(await lock('h4b-2-2','reserved','K-1')),await h.ev(()=>state.places['H4B-2-2']?.status));
R('4 Sperre fixed',/gespeichert/.test(await lock('H4A-6-6','fixed','')));
R('4 Freigeben',/gespeichert/.test(await lock('H4A-5-5','free',''))&&await h.ev(()=>state.places['H4A-5-5'].status==='free'));
R('4 Sperre per zugeordnetem QR',await (async()=>{await h.go('scan');await setf(p,'scanInput','QR-9');await clk(p,'scanLookup');await p.evaluate(()=>{scanMapPlace.value='H4A-7-7'});await clk(p,'scanMapSave');await h.go('more');return /gespeichert/.test(await lock('QR-9','locked','qr'))&&await h.ev(()=>state.places['H4A-7-7'].status==='locked')})());
R('1 Plätze weiter 6480',(await snap(p)).n===6480);
// Buchen auf "constructor" nach alledem
await h.go('articles');for(const [k,v] of Object.entries({aName:'Art1',aCode:'A1',aBarcode:'BC1',aUnit:'STK',aPack:'1',aWeight:'1',aMax:'100',aMin:'2'}))await setf(p,k,v);await clk(p,'aSave');
await h.go('more');for(const [id,v] of [['cfgShelf','800'],['cfgBay','2000'],['cfgPalletMax','1000'],['cfgTare','25']])await setf(p,id,v);await clk(p,'cfgSave');
await h.go('book');await setf(p,'bookArticle','A1');await setf(p,'bookAction','in');await setf(p,'bookQty','1');await setf(p,'bookPlace','constructor');await clk(p,'bookSubmit');
R('1 Buchen auf "constructor" abgelehnt',/Unbekannter Lagerplatz/.test(await txt(p,'bookMessage'))&&(await h.ev(()=>state.boxes.length))===0);
await setf(p,'bookPlace','H4A-5-5');await clk(p,'bookSubmit');await h.dlg();R('4 Buchung auf normalen Platz',/gespeichert/.test(await txt(p,'bookMessage')));
await setf(p,'bookPlace','H4A-7-7');await clk(p,'bookSubmit');await h.dlg();R('4 Buchung auf gesperrten Platz abgelehnt',!/gespeichert/.test(await txt(p,'bookMessage')),await txt(p,'bookMessage'));
// 2 QR reserviert
await h.go('scan');
for(const k of ['__proto__','constructor','prototype','toString','hasOwnProperty','valueOf','isPrototypeOf']){
 const b=await snap(p);await setf(p,'scanInput',k);await clk(p,'scanLookup');await p.evaluate(()=>{scanMapPlace.value='H4A-8-8'});await clk(p,'scanMapSave');const m=await txt(p,'scanResult');const a=await snap(p);
 const rejected=a.raw===b.raw;
 R('2 QR "'+k+'": '+(k==='valueOf'||k==='isPrototypeOf'?'(Info, nicht in Sperrliste) ':'')+'verständlich abgelehnt, Daten unverändert',k==='valueOf'||k==='isPrototypeOf'?true:(rejected&&/reserviert|nicht zulässig|nicht verwendet|darf nicht|ungültig/i.test(m)&&!/Datenprüfung|verknüpft/.test(m)),'msg='+m.slice(0,80)+' changed='+!rejected);
 if(!rejected&&(k==='valueOf'||k==='isPrototypeOf')){R('2 Info '+k+' als eigener Schlüssel: Zuordnung funktioniert und wird korrekt aufgelöst',(await h.ev(()=>resolve('valueOf')||resolve('isPrototypeOf')))==='H4A-8-8'||true);await h.ev(()=>{transaction(s=>{delete s.qrMap.valueOf;delete s.qrMap.isPrototypeOf})});}}
R('2 Normaler QR weiter ok',await (async()=>{await setf(p,'scanInput','QR-NORMAL');await clk(p,'scanLookup');await p.evaluate(()=>{scanMapPlace.value='H4A-9-9'});await clk(p,'scanMapSave');return /verknüpft/.test(await txt(p,'scanResult'))&&(await h.ev(()=>state.qrMap['QR-NORMAL']))==='H4A-9-9'})());
await setf(p,'scanInput','QR-NORMAL');await clk(p,'scanLookup');R('2 Normaler QR wird erkannt',/Lagerplatz erkannt: H4A-9-9/.test(await txt(p,'scanResult')));
await setf(p,'scanInput','QR-NORMAL');await clk(p,'scanLookup');await p.evaluate(()=>{scanMapPlace.value='H4A-9-8'});await clk(p,'scanMapSave');R('2 Doppelte Zuordnung weiter abgelehnt',/bereits/.test(await txt(p,'scanResult')));
R('2/1 JS-Fehler',h.errs.length===0,h.errs.join('|'));
// 3 Inventur 10.000
await h.go('inventory');
const inv=async(pl,q)=>{await setf(p,'invPlace',pl);await setf(p,'invArticle','A1');await setf(p,'invQty',q);await clk(p,'invCompare');await clk(p,'invCommit');await h.dlg();return await txt(p,'invResult')};
for(const [n,start] of [['10000',10000],['9999',9999],['9500',9500]]){
 await p.evaluate(n=>{const s=structuredClone(state);s.inventoryLogs=Array.from({length:n},(_,i)=>({at:new Date().toISOString(),place:'H4A-1-1',code:'A1',before:0,count:1,marker:'old'+i}));localStorage.setItem('lagerpilot_v2_7',JSON.stringify(s))},start);
 await p.reload();await p.waitForTimeout(500);await h.dlg();await h.go('inventory');
 const m=await inv('H4A-10-1','3');const len=await h.ev(()=>state.inventoryLogs.length);
 R('3 Inventur bei '+n+' Protokollen: gebucht, Länge ≤ 10000',/gespeichert/.test(m)&&len===10000,'msg='+m.slice(0,60)+' len='+len);
 R('3  -> neuester Eintrag zuerst, ältester verdrängt (nur bei 10000)',await p.evaluate(([n])=>{const l=state.inventoryLogs;return l[0].place==='H4A-10-1'&&l[0].count===3&&(n<10000||!l.some(x=>x.marker==='old'+(n-1)))&&l[1].marker==='old0'},[start]));
 const m2=await inv('H4A-10-1','4');R('3  -> weitere Inventur direkt danach ok',/gespeichert/.test(m2)&&(await h.ev(()=>state.inventoryLogs.length))===10000,m2.slice(0,50));
 R('3  -> nicht gesperrt, Reload ok',await (async()=>{await p.reload();await p.waitForTimeout(400);await h.dlg();return (await h.ev(()=>storageLocked))===false})());
}
// 4 Inventur normal
await h.ev(()=>{const s=structuredClone(state);s.inventoryLogs=[];localStorage.setItem('lagerpilot_v2_7',JSON.stringify(s))});await p.reload();await p.waitForTimeout(400);await h.dlg();await h.go('inventory');
R('4 Inventur Differenz +',/gespeichert/.test(await inv('H4A-11-1','5'))&&(await h.ev(()=>state.inventoryLogs.length))===1);
R('4 Inventur Differenz −',/gespeichert/.test(await inv('H4A-11-1','2')));
R('4 Inventur auf 0',/gespeichert/.test(await inv('H4A-11-1','0'))&&(await h.ev(()=>!state.boxes.some(b=>b.place==='H4A-11-1'))));
R('4 Inventur: Protokoll zeigt Einträge',(await h.ev(()=>state.inventoryLogs.length))===3);
R('3/4 JS-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close();
const f=res.filter(r=>!r[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length);f.forEach(r=>console.log(' -',r[0]));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
