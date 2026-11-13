const {open}=require('./lib');const fs=require('fs');
const D='/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad/t/';
const res=[];const R=(id,ok,info)=>{res.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+info:''))};
const K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1';
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const ban=p=>p.evaluate(()=>{const e=document.getElementById('storageLockBanner');const r=e.getBoundingClientRect();return (!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'&&r.height>0&&r.bottom>0)?e.innerText.replace(/\s+/g,' '):null});
const CP='{"orders":[{"id":"K-9","lines":2,"assignee":"Max","status":"Abgeschlossen"}],"people":[],"roster":["Max"],"session":"",BROKEN';
const CI='{"schema":27,"places":';
const good=JSON.parse(fs.readFileSync(D+'ap1_good.json','utf8'));
(async()=>{
let h=await open({acceptDownloads:true});const {p}=h;
await p.evaluate(([k,c])=>localStorage.setItem(k,c),[PK,CP]);await p.reload();await p.waitForTimeout(600);
let b=await ban(p);
R('1a Banner sofort sichtbar nach Laden (nur Pick beschädigt)',b!==null&&/Kommissionierdaten/.test(b),String(b).slice(0,130));
await h.ev(()=>render());R('1h render() lässt Banner sichtbar',(await ban(p))!==null);
const seen=[];for(const [a,t] of [['warehouse','home'],['warehouse','book'],['warehouse','more'],['picking','picking'],['picking','pickAdmin'],['warehouse','racks']]){await p.evaluate(([a,t])=>{setArea(a,false);tab(t)},[a,t]);seen.push(t+':'+((await ban(p))!==null));}
R('1h Banner in allen Bereichen/Tabs sichtbar',seen.every(x=>x.endsWith('true')),seen.join(' '));
await h.ev(()=>pickRender());R('1h pickRender() lässt Banner sichtbar',(await ban(p))!==null);
await h.go('pickAdmin');await p.evaluate(()=>{pickNewEmployee.value='X';pickAddEmployee.click()});await h.dlg();
R('1h Banner bleibt nach Speicherversuch',(await ban(p))!==null&&(await ls(p,PK))===CP);
const vis=await p.evaluate(()=>{const e=document.getElementById('storageRawDownload');return !!e&&e.offsetParent!==null&&e.getBoundingClientRect().height>0});
R('1i Rohdaten-Button sichtbar/klickbar',vis);
const dl=p.waitForEvent('download',{timeout:4000}).catch(()=>null);
await p.locator('#storageRawDownload').click({timeout:3000}).catch(async()=>{await p.evaluate(()=>storageRawDownload.click())});
const x=await dl;
if(x){await x.saveAs(D+'ap1c_raw.json');const raw=JSON.parse(fs.readFileSync(D+'ap1c_raw.json','utf8'));
 R('1i Download enthält beschädigte Kommissionierdaten (Original + Quarantäne)',raw[PK]===CP&&raw[PK+'_quarantine']===CP,Object.keys(raw).join(','));
 R('1i Download enthält Lagerstand',typeof raw[K]==='string'&&JSON.parse(raw[K]).schema===27);}else R('1i Download',false,'kein Download');
R('1 Fehler',h.errs.length===0,h.errs.join('|'));
await h.b.close();

// beide beschädigt
h=await open({acceptDownloads:true});
await h.p.evaluate(([k,pk,a,b])=>{localStorage.setItem(k,a);localStorage.setItem(pk,b)},[K,PK,CI,CP]);await h.p.reload();await h.p.waitForTimeout(600);await h.dlg();
b=await ban(h.p);
R('2a Beide Fehlergründe im Banner',b&&/Unexpected|JSON|Lagerdaten|gespeicherten/.test(b)&&/Kommissionierdaten sind beschädigt/.test(b),String(b).slice(0,330));
await h.ev(()=>render());R('2b Beide Gründe nach render()',(await ban(h.p))===b);
const dl2=h.p.waitForEvent('download',{timeout:4000}).catch(()=>null);await h.p.evaluate(()=>storageRawDownload.click());const y=await dl2;
if(y){await y.saveAs(D+'ap1c_raw2.json');const raw=JSON.parse(fs.readFileSync(D+'ap1c_raw2.json','utf8'));R('2c Download enthält beide beschädigten Rohwerte',raw[K]===CI&&raw[PK]===CP,Object.keys(raw).join(','))}else R('2c Download',false);
// Speichersperren
const s1=await h.p.evaluate(()=>{try{transaction(s=>{history(s,'x')});return 'saved'}catch(e){return e.message}});
await h.go('pickAdmin');await h.p.evaluate(()=>{pickNewEmployee.value='X';pickAddEmployee.click()});const d=await h.dlg();
R('2d Speichersperre Lager + Pick aktiv, Rohwerte unverändert',/gesperrt/.test(s1)&&d.some(x=>/gesperrt/.test(x))&&(await ls(h.p,K))===CI&&(await ls(h.p,PK))===CP,s1.slice(0,60)+' | '+JSON.stringify(d).slice(0,80));
// Recovery mit vollständigem Backup
await h.go('more');await h.p.setInputFiles('#jsonImport',D+'ap1_good.json');await h.p.waitForTimeout(1200);
R('2e Backup stellt beides wieder her; Banner weg',(await h.ev(()=>[storageLocked,pickStorageLocked])).join()==='false,false'&&(await ban(h.p))===null&&JSON.parse(await ls(h.p,K)).boxes.length===1);
R('2f Quarantänen erhalten',(await ls(h.p,K+'_quarantine'))===CI&&(await ls(h.p,PK+'_quarantine'))===CP);
R('2g Speichern wieder möglich (Lager+Pick)',await h.ev(()=>{try{transaction(s=>{history(s,'ok')});return pickSave()}catch(e){return false}}));
R('2 Fehler',h.errs.length===0,h.errs.join('|'));
await h.b.close();

// nur Pick kaputt + Recovery; nur Lager kaputt
h=await open({acceptDownloads:true});
await h.p.evaluate(([pk,c])=>localStorage.setItem(pk,c),[PK,CP]);await h.p.reload();await h.p.waitForTimeout(500);
const inv0=await ls(h.p,K);
const nop={...good};delete nop._pick;fs.writeFileSync(D+'ap1c_nopick.json',JSON.stringify(nop));
await h.go('more');await h.p.setInputFiles('#jsonImport',D+'ap1c_nopick.json');await h.p.waitForTimeout(600);
R('3a Pick-Sperre: Backup ohne _pick abgelehnt, Banner bleibt',(await ls(h.p,PK))===CP&&(await ls(h.p,K))===inv0&&(await ban(h.p))!==null,(await h.p.evaluate(()=>backupMessage.textContent.trim())).slice(0,90));
await h.p.setInputFiles('#jsonImport',D+'ap1_good.json');await h.p.waitForTimeout(1200);
R('3b Pick-Sperre: vollständiges Backup stellt her, Banner weg',(await h.ev(()=>pickStorageLocked))===false&&(await ban(h.p))===null&&JSON.parse(await ls(h.p,PK)).orders[0].assignee==='Max');
await h.b.close();
h=await open({acceptDownloads:true});
await h.p.evaluate(k=>localStorage.setItem(k,'{bad'),K);await h.p.reload();await h.p.waitForTimeout(500);await h.dlg();
b=await ban(h.p);R('4a Nur Lager kaputt: Banner mit Grund, ohne Pick-Text',b&&!/Kommissionierdaten sind beschädigt/.test(b),String(b).slice(0,120));
await h.p.setInputFiles('#jsonImport',D+'ap1_good.json');await h.p.waitForTimeout(1200);
R('4b Lager-Recovery funktioniert, Banner weg',(await ban(h.p))===null&&JSON.parse(await ls(h.p,K)).boxes.length===1);
await h.b.close();
// intakt + Regression
h=await open({acceptDownloads:true});
R('5a Intakt: kein Banner',(await ban(h.p))===null);
await h.ev(()=>{simulation={occupied:50,reserved:0};pickState.testStatus.Max=true;render()});
await h.go('pickAdmin');await h.setv('select[data-pick-to="K-1042"]','Max');await h.click('button[data-pick-assign="K-1042"]');await h.p.reload();await h.p.waitForTimeout(500);
R('5b Intakt nach Kommissionier-Änderung + Reload: weder gesperrt noch Banner',(await h.ev(()=>pickStorageLocked))===false&&(await ban(h.p))===null);
await h.go('more');let dl3=h.p.waitForEvent('download');await h.p.evaluate(()=>jsonExport.click());await dl3;await h.p.setInputFiles('#jsonImport',D+'ap1_good.json');await h.p.waitForTimeout(1200);
R('5c Normaler Import intakt funktioniert, kein Banner',(await ban(h.p))===null&&JSON.parse(await ls(h.p,K)).boxes.length===1);
R('5 Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close();
const f=res.filter(r=>!r[1]);console.log('\nGESAMT',res.length,'/ FAIL',f.length,f.map(r=>r[0]).join(';'));
})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(1)});
