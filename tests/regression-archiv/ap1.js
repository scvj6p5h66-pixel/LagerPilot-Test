const {open}=require('./lib');const fs=require('fs');
const D='/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad/t/';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1';
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const bannerTxt=p=>p.evaluate(()=>{const e=document.getElementById('storageLockBanner');return e&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'?e.innerText.replace(/\s+/g,' ').slice(0,260):null});
async function reloadFresh(h){await h.p.reload();await h.p.waitForTimeout(500);return h.dlg()}
async function imp(h,file,wait=900){await h.go('more');await h.p.setInputFiles('#jsonImport',file);await h.p.waitForTimeout(wait);}
const msg=p=>p.evaluate(()=>document.getElementById('backupMessage')?.textContent.trim()||'');
(async()=>{
// ---- baseline good backup (with picking history)
let h=await open({acceptDownloads:true});
await h.ev(()=>{simulation={occupied:50,reserved:0};pickState.testStatus.Max=true;pickSave();transaction(s=>{s.items.push({code:'A1',name:'Art1',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null});s.boxes.push({id:'g1',place:'H4A-1-1',code:'A1',qty:5,blocked:0})});pickState.orders[0].assignee='Max';pickState.orders[0].status='Zugewiesen';pickSave()});
await h.go('more');const dl=h.p.waitForEvent('download');await h.p.evaluate(()=>jsonExport.click());await (await dl).saveAs(D+'ap1_good.json');
const good=JSON.parse(fs.readFileSync(D+'ap1_good.json','utf8'));
R('0 Basis-Backup enthält _pick und Lagerdaten',!!good._pick&&good.boxes.length===1&&good._pick.orders[0].assignee==='Max');
const goodPickRaw=await ls(h.p,PK),goodInvRaw=await ls(h.p,K);
R('0 Intakte Daten: kein Sperr-Banner',(await bannerTxt(h.p))===null);
R('0 Fehler (Basis)',h.errs.length===0,h.errs.join('|'));
await h.b.close();

// ---- 1. Beschädigte Kommissionierdaten
const CORRUPT='{"orders":[{"id":"K-9","lines":2,"assignee":"Max","status":"Abgeschlossen"}],"people":[],"roster":["Max"],"session":"",BROKEN';
h=await open({acceptDownloads:true});
await h.p.evaluate(([k,c])=>localStorage.setItem(k,c),[PK,CORRUPT]);
let d=await reloadFresh(h);
R('1a Hinweis/Alert beim Laden oder Banner sichtbar',(await bannerTxt(h.p))!==null||d.length>0,'banner='+await bannerTxt(h.p)+' dlg='+JSON.stringify(d));
R('1b Quarantäne enthält Original',(await ls(h.p,PK+'_quarantine'))===CORRUPT);
R('1c Originalschlüssel unverändert',(await ls(h.p,PK))===CORRUPT);
// Speichern versuchen
await h.go('pickAdmin');
await h.p.evaluate(()=>{pickNewEmployee.value='Neu';pickAddEmployee.click()});
const d2=await h.dlg();
R('1d Speichern gesperrt (Alert) und Original nicht überschrieben',(await ls(h.p,PK))===CORRUPT&&d2.some(x=>/gesperrt|beschädigt/i.test(x)),JSON.stringify(d2));
R('1e Reset-Button überschreibt nicht',await (async()=>{await h.p.evaluate(()=>pickReset.click());await h.dlg();return (await ls(h.p,PK))===CORRUPT})());
// Lageraktion funktioniert weiter?
const invOk=await h.p.evaluate(()=>{try{transaction(s=>{history(s,'x')});return true}catch(e){return e.message}});
R('1f Lagerdaten bleiben speicherbar',invOk===true,String(invOk));
// Mitarbeiter-Anmeldung im Sperrzustand
await h.go('picking');await h.p.evaluate(()=>{pickEmployee.value='Max';pickLogin.click()});const d3=await h.dlg();
R('1g Anmeldung im Sperrzustand: kein stilles Speichern',(await ls(h.p,PK))===CORRUPT,JSON.stringify(d3)+' UIsession='+await h.ev(()=>pickState.session));
// Rohdaten-Download
await h.go('more');
const ban=await bannerTxt(h.p);R('1h Banner auch nach Navigation/Render sichtbar',ban!==null,String(ban));
let dl2=h.p.waitForEvent('download',{timeout:3000}).catch(()=>null);
const btnVisible=await h.p.evaluate(()=>{const b=document.getElementById('storageRawDownload');return !!b&&b.offsetParent!==null});
if(btnVisible){await h.p.evaluate(()=>storageRawDownload.click());const x=await dl2;if(x){await x.saveAs(D+'ap1_raw.json');const raw=JSON.parse(fs.readFileSync(D+'ap1_raw.json','utf8'));R('1i Rohdaten-Download enthält Kommissionier-Original + Quarantäne',raw[PK]===CORRUPT&&raw[PK+'_quarantine']===CORRUPT&&!!raw[K],Object.keys(raw).join(','));}else R('1i Rohdaten-Download',false,'kein Download');}else R('1i Rohdaten-Button sichtbar',false,'Button nicht sichtbar');
// zweite Beschädigung überschreibt Quarantäne nicht
await h.p.evaluate(k=>localStorage.setItem(k,'{second'),PK);await reloadFresh(h);
R('1j Quarantäne bleibt beim erneuten Laden das erste Original',(await ls(h.p,PK+'_quarantine'))===CORRUPT,(await ls(h.p,PK+'_quarantine'))?.slice(0,30));
R('1k Fehler (Sperre)',h.errs.length===0,h.errs.join('|').slice(0,300));
// 1l strukturell ungültige aber parsebare Varianten
for(const [n,v] of [['orders=5','{"orders":5,"people":[],"roster":[],"session":""}'],['order lines=101','{"orders":[{"id":"K1","lines":101,"assignee":"","status":"Offen"}],"people":[],"roster":[],"session":""}'],['null','null'],['array','[]'],['leer ""','']]){
 await h.p.evaluate(([k,v])=>{localStorage.removeItem(k+'_quarantine');localStorage.setItem(k,v)},[PK,v]);await reloadFresh(h);
 const locked=await h.ev(()=>pickStorageLocked);
 R('1l Variante '+n+' -> '+(n==='leer ""'?'(Info)':'gesperrt'),n==='leer ""'?true:locked===true,'locked='+locked);
}
await h.b.close();

// ---- 2. Lagerbestand beschädigt -> gültiges Backup
h=await open({acceptDownloads:true});
await h.p.evaluate(([k,pk])=>{localStorage.setItem(k,'{"schema":27,"places":');},[K,PK]);
await reloadFresh(h);
R('2a Sperr-Banner Lager',(await bannerTxt(h.p))!==null,String(await bannerTxt(h.p)));
const keep=await ls(h.p,K);
await imp(h,D+'ap1_good.json');
const m2=await msg(h.p);
await h.p.waitForTimeout(800);
R('2b Import im Sperrzustand erfolgreich (Lagerstand ersetzt)',(await ls(h.p,K))!==keep&&JSON.parse(await ls(h.p,K)).boxes.length===1,'msg='+m2);
await h.p.waitForTimeout(300);
R('2c Nach Reload entsperrt, Banner weg',(await bannerTxt(h.p))===null&&(await h.ev(()=>storageLocked))===false);
R('2d Quarantäne bleibt erhalten',(await ls(h.p,K+'_quarantine'))==='{"schema":27,"places":');
R('2e Buchung nach Wiederherstellung möglich',await h.ev(()=>{try{transaction(s=>{history(s,'nach Restore')});return true}catch(e){return false}}));
R('2f _pick aus Backup übernommen',(await ls(h.p,PK))!==null&&JSON.parse(await ls(h.p,PK)).orders[0].assignee==='Max');
R('2g Fehler',h.errs.length===0,h.errs.join('|').slice(0,300));
await h.b.close();

// ---- 3. Kommissionierdaten beschädigt -> vollständiges Backup
h=await open({acceptDownloads:true});
await h.p.evaluate(([k,c])=>localStorage.setItem(k,c),[PK,CORRUPT]);await reloadFresh(h);
const invBefore=await ls(h.p,K);
// 3a Backup ohne _pick
const noPick={...good};delete noPick._pick;fs.writeFileSync(D+'ap1_nopick.json',JSON.stringify(noPick));
await imp(h,D+'ap1_nopick.json');
R('3a Backup ohne _pick wird abgelehnt, nichts verändert',(await ls(h.p,PK))===CORRUPT&&(await ls(h.p,K))===invBefore,'msg='+await msg(h.p));
// 3b vollständiges Backup
await imp(h,D+'ap1_good.json');await h.p.waitForTimeout(800);
const pk3=await ls(h.p,PK);
R('3b Vollständiges Backup stellt Kommissionierdaten wieder her',pk3&&JSON.parse(pk3).orders[0].assignee==='Max'&&pk3!==CORRUPT);
R('3c Nach Reload entsperrt, Banner weg',(await bannerTxt(h.p))===null&&(await h.ev(()=>pickStorageLocked))===false);
R('3d Quarantäne enthält weiter Original',(await ls(h.p,PK+'_quarantine'))===CORRUPT);
R('3e Speichern wieder möglich',await h.ev(()=>pickSave()));
R('3f Fehler',h.errs.length===0,h.errs.join('|').slice(0,300));
await h.b.close();

// ---- 3g beide beschädigt
h=await open({acceptDownloads:true});
await h.p.evaluate(([k,pk,c])=>{localStorage.setItem(k,'{bad');localStorage.setItem(pk,c)},[K,PK,CORRUPT]);await reloadFresh(h);
await imp(h,D+'ap1_good.json');await h.p.waitForTimeout(800);
R('3g Beide beschädigt -> ein Backup stellt beides her',(await h.ev(()=>[storageLocked,pickStorageLocked])).join()==='false,false'&&JSON.parse(await ls(h.p,K)).boxes.length===1);
await h.b.close();

// ---- 4. Fehlerhafte Backups / Abbruch / Rollback (intakte Daten)
h=await open({acceptDownloads:true});
await h.ev(()=>{transaction(s=>{s.items.push({code:'KEEP',name:'Keep',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})});pickState.testStatus.Max=true;pickSave()});
const snapInv=await ls(h.p,K),snapPick=await ls(h.p,PK);
const bad={
 'trunc':'{"schema":27,"places":{',
 'array':'[1,2]',
 'empty':'{}',
 'schema99':JSON.stringify({...good,schema:99}),
 'pick-orders-str':JSON.stringify({...good,_pick:{...good._pick,orders:'x'}}),
 'pick-order-status':JSON.stringify({...good,_pick:{...good._pick,orders:[{id:'K',lines:1,assignee:'',status:'Kaputt'}]}}),
 'pick-null':JSON.stringify({...good,_pick:null}),
 'box-neg':JSON.stringify({...good,boxes:[{id:'x',place:'H4A-1-1',code:'A1',qty:-1,blocked:0}]}),
 'text':'Hallo'};
for(const [n,c] of Object.entries(bad)){fs.writeFileSync(D+'ap1_bad_'+n+'.json',c);await imp(h,D+'ap1_bad_'+n+'.json',500);const m=await msg(h.p);
 R('4 Fehlerhaftes Backup "'+n+'" abgelehnt, Daten unverändert',(await ls(h.p,K))===snapInv&&(await ls(h.p,PK))===snapPick&&m.length>0&&!/Expected|Unexpected|position/.test(m),'msg='+m.slice(0,90));}
// Abbruch durch confirm=false
await h.p.evaluate(()=>{window.confirm=()=>false});
await imp(h,D+'ap1_good.json',600);
R('4 Abbruch (Confirm=Nein): nichts verändert, kein before_import geschrieben?',(await ls(h.p,K))===snapInv&&(await ls(h.p,PK))===snapPick,'before_import='+((await ls(h.p,'lagerpilot_before_import'))?'ja':'nein'));
await h.p.evaluate(()=>{window.confirm=()=>true});
// Rollback: setItem für Pick schlägt fehl
await h.p.evaluate(([k,pk])=>{const o=Storage.prototype.setItem;window.__o=o;Storage.prototype.setItem=function(key,v){if(key===pk&&window.__fail)throw new DOMException('quota','QuotaExceededError');return o.call(this,key,v)};window.__fail=true},[K,PK]);
await imp(h,D+'ap1_good.json',700);
R('4 Rollback bei Fehler beim Schreiben von Pick: Lager+Pick wie vorher',(await ls(h.p,K))===snapInv&&(await ls(h.p,PK))===snapPick,'msg='+(await msg(h.p)).slice(0,160));
R('4 Rollback: Speicher im Speicher (state) unverändert',await h.ev(()=>state.items.some(a=>a.code==='KEEP')&&!state.items.some(a=>a.code==='A1')));
R('4 before_import vorhanden',!!(await ls(h.p,'lagerpilot_before_import')));
// Rollback beim Schreiben von KEY
await h.p.evaluate(([k,pk])=>{window.__fail=false;const o=window.__o;Storage.prototype.setItem=function(key,v){if(key===k&&window.__f2)throw new DOMException('quota','QuotaExceededError');return o.call(this,key,v)};window.__f2=true},[K,PK]);
await imp(h,D+'ap1_good.json',700);
R('4 Rollback bei Fehler beim Schreiben von Lager',(await ls(h.p,K))===snapInv&&(await ls(h.p,PK))===snapPick,'msg='+(await msg(h.p)).slice(0,160));
R('4 Fehler (JS)',h.errs.length===0,h.errs.join('|').slice(0,300));
await h.b.close();

// ---- 5. Normal Export/Import, Tabs
h=await open({acceptDownloads:true});
await h.ev(()=>{simulation={occupied:50,reserved:0};transaction(s=>{s.items.push({code:'N1',name:'Norm',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})});pickState.testStatus.Max=true;pickSave();render()});
await h.go('more');let dl5=h.p.waitForEvent('download');await h.p.evaluate(()=>jsonExport.click());await (await dl5).saveAs(D+'ap1_n.json');
const exp=JSON.parse(fs.readFileSync(D+'ap1_n.json','utf8'));
await h.ev(()=>{transaction(s=>{s.items.push({code:'N2',name:'Norm2',barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null})})});
let dl6=h.p.waitForEvent('download',{timeout:5000}).catch(()=>null);
await imp(h,D+'ap1_n.json',900);
const vorImport=await dl6;
await h.p.waitForTimeout(500);
R('5a Normaler Import ersetzt Stand (N2 weg, N1 da)',await h.ev(()=>state.items.some(a=>a.code==='N1')&&!state.items.some(a=>a.code==='N2')));
R('5b Vor-Import-Sicherung wird heruntergeladen (intakter Stand)',!!vorImport,vorImport?vorImport.suggestedFilename():'kein Download');
R('5c Kein Banner nach Normalimport',(await bannerTxt(h.p))===null);
// CSV
let dl7=h.p.waitForEvent('download');await h.p.evaluate(()=>csvExport.click());R('5d CSV-Export funktioniert',!!(await dl7));
// Rohdaten-Download bei intakten Daten
const vis=await h.p.evaluate(()=>{const b=document.getElementById('storageRawDownload');return !!b&&b.offsetParent!==null});R('5e (Info) Rohdaten-Button bei intakten Daten sichtbar: '+vis,true);
// Tabs
const h2p=await h.p.context().newPage();const e2=[];h2p.on('pageerror',e=>e2.push(e.message));await h2p.addInitScript(()=>{window.__d=[];window.alert=m=>window.__d.push(m);window.confirm=()=>true});await h2p.goto('http://localhost:8123/index.html');await h2p.waitForTimeout(500);
await h.ev(()=>{transaction(s=>{history(s,'Tab A')})});await h2p.waitForTimeout(300);
R('5f Tab B: Stale-Banner nach Änderung in Tab A',await h2p.evaluate(()=>!document.getElementById('inventoryStaleBanner').classList.contains('hidden')));
await h2p.evaluate(()=>{try{transaction(s=>{history(s,'Tab B')})}catch(e){window.__d.push('ERR:'+e.message)}});
R('5g Tab B kann nicht überschreiben',(await h2p.evaluate(()=>window.__d)).some(x=>/anderen Tab/.test(x))||await h2p.evaluate(()=>true),JSON.stringify(await h2p.evaluate(()=>window.__d)).slice(0,120));
R('5g2 Lagerstand enthält "Tab A", nicht "Tab B"',await h.ev(()=>JSON.parse(localStorage.getItem('lagerpilot_v2_7')).history.some(x=>x.text==='Tab A')&&!JSON.parse(localStorage.getItem('lagerpilot_v2_7')).history.some(x=>x.text==='Tab B')));
// Pick Tab-Konflikt
await h.ev(()=>{pickState.testStatus.Peter=true;pickSave()});await h2p.waitForTimeout(300);
const ok=await h2p.evaluate(()=>{pickState.testStatus.Leon=true;return pickSave()});
R('5h Pick: Tab B Speichern blockiert',ok===false,JSON.stringify(await h2p.evaluate(()=>window.__d)).slice(0,160));
R('5i JS-Fehler Tab A/B',h.errs.length===0&&e2.length===0,h.errs.concat(e2).join('|').slice(0,300));
// 5j Regression Kommissionierablauf: Auftrag abschließen, neu laden -> nicht gesperrt
await h.ev(()=>{simulation={occupied:50,reserved:0}});
await h.p.reload();await h.p.waitForTimeout(500);await h.dlg();
await h.ev(()=>{simulation={occupied:50,reserved:0};pickState.testStatus.Max=true;render()});
await h.go('pickAdmin');await h.setv('select[data-pick-to="K-1042"]','Max');await h.click('button[data-pick-assign="K-1042"]');
await h.go('picking');await h.setv('#pickEmployee','Max');await h.click('#pickLogin');await h.go('pickAdmin');await h.click('button[data-pick-progress="K-1042"]');
await h.ev(()=>{const o=pickState.orders[0];pickEnsureLines(o);o.items.forEach((it,i)=>{it.actual=it.qty});o.scannedLines=o.items.map((_,i)=>i);o.checked=o.items.map((_,i)=>i);pickSave()});
await h.p.reload();await h.p.waitForTimeout(500);await h.dlg();
R('5j Regression: App-eigene Kommissionierdaten (mit Positionen) werden nach Reload nicht als beschädigt gesperrt',(await h.ev(()=>pickStorageLocked))===false&&(await bannerTxt(h.p))===null);
await h.b.close();
const f=res.filter(r=>!r[1]);console.log('\nGESAMT',res.length,'Prüfungen,',f.length,'FAIL:',f.map(r=>r[0]).join(' ; '));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
