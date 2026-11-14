// AP5.5 – Barcode-Sicherheit und Importschutz
// Aufruf: BASE=http://localhost:8123/index.html node tests/ap55/ap55-barcode-importschutz.js
// 1 Import-Dublettenprüfung · 2 mehrdeutige Scans · 3 Sicherungsstände/Wiederherstellung · 4 Zwei-Tab-Schutz
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html',K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1',BI='lagerpilot_before_import',BL='lagerpilot_import_backups_v1';
let pass=0,fail=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).replace(/\s+/g,' ').slice(0,230):''))};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'ap55-'));
const it=(code,name,barcode,o={})=>({code,name,barcode,unit:'STK',pack:1,weight:1,max:100,min:null,...o});
const pickData=()=>({people:[{name:'Max',device:'S1',active:true,lastSeen:1}],roster:['Max'],orders:[],session:'Max',testStatus:{Max:true}});
async function app(items,{ctx:shared,seedPick=true,tag='x'}={}){let b=null,ctx=shared;if(!ctx){b=await chromium.launch();ctx=await b.newContext({viewport:{width:1000,height:900},acceptDownloads:true});}
 const p=await ctx.newPage();const st={errs:[],dlg:[],confirm:true,navs:0,downloads:0};p.on('pageerror',e=>st.errs.push(e.message));p.on('framenavigated',f=>{if(f===p.mainFrame())st.navs++});p.on('download',()=>st.downloads++);
 p.on('dialog',d=>{st.dlg.push(d.type()+':'+d.message());d.type()==='confirm'&&!st.confirm?d.dismiss():d.accept()});
 await p.addInitScript(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video></video>';window.__cb=cb}async stop(){}async clear(){}}});
 await p.goto(BASE);await p.waitForTimeout(300);
 await p.evaluate(([it])=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push(...it)})},[items]);
 if(seedPick)await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,pickData()]);
 await p.reload();await p.waitForTimeout(400);st.navs=0;return {b,ctx,p,st}}
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim(),id);
const wr=(name,obj)=>{const f=path.join(TMP,name);fs.writeFileSync(f,typeof obj==='string'?obj:JSON.stringify(obj));return f};
const exportOf=async(p,mut)=>{const o=JSON.parse(await ls(p,K));mut&&mut(o);return o};
const list=async p=>{const r=await ls(p,BL);return r===null?[]:JSON.parse(r).items};
async function doImport(a,file,{confirm=true}={}){a.st.confirm=confirm;a.st.dlg.length=0;const n0=a.st.navs,d0=a.st.downloads;await a.p.evaluate(()=>tab('more'));
 const nav=confirm?a.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false):Promise.resolve(false);await a.p.setInputFiles('#jsonImport',file);const reloaded=await nav;await a.p.waitForTimeout(reloaded?600:400);
 const msg=await txt(a.p,'backupMessage').catch(()=>'');return {reloaded,msg,dlg:a.st.dlg.slice(),dl:a.st.downloads-d0}}
const snap=async p=>({k:await ls(p,K),pk:await ls(p,PK),bi:await ls(p,BI),bl:await ls(p,BL)});
const same=(a,b)=>a.k===b.k&&a.pk===b.pk&&a.bi===b.bi&&a.bl===b.bl;
const cam=async(a,target,code)=>{await a.p.evaluate(async t=>{window.__cb=null;await stopCamera();return startCamera(t)},target);await a.p.waitForTimeout(150);await a.p.evaluate(c=>window.__cb&&window.__cb(c),code);await a.p.waitForTimeout(250)};
const SEED=()=>[it('A1','Art Eins','BC1'),it('A2','Art Zwei','BC2'),it('A3','Art Drei','')];
(async()=>{
// ================= 1 Import: Dublettenprüfung =================
const cases=[
 ['eindeutige Barcodes',o=>{},true],
 ['mehrere Artikel ohne Barcode (leer / fehlend)',o=>{o.items.push(it('E1','Ohne 1',''),it('E2','Ohne 2',''));delete o.items[o.items.length-1].barcode},true],
 ['exakte Dublette (A2 hat Barcode von A1)',o=>{o.items.find(x=>x.code==='A2').barcode='BC1'},false,[/BC1/,/identisch/,/A1/,/A2/]],
 ['Schreibvariante (A2 "bc1" statt BC2)',o=>{o.items.find(x=>x.code==='A2').barcode='bc1'},false,[/bc1|BC1/,/Schreibvarianten/,/A1/,/A2/]],
 ['Barcode ist Artikelnummer eines anderen Artikels',o=>{o.items.find(x=>x.code==='A2').barcode='A1'},false,[/„A1“/,/zugleich Artikelnummer von A1/,/A2/]],
 ['Altformat Schema 26 ohne Dublette',o=>{o.schema=26},true],
 ['Altformat Schema 26 mit Dublette',o=>{o.schema=26;o.items.find(x=>x.code==='A2').barcode='BC1'},false,[/BC1/,/A1/,/A2/]],
];
for(const [name,mut,accept,rx] of cases){const src=await app(SEED(),{tag:'s'});const exp=await exportOf(src.p,mut);const f=wr('c'+Math.random().toString(36).slice(2)+'.json',exp);
 const dst=await app([it('Z1','Ziel','ZZ1')],{tag:'d'});const before=await snap(dst.p);const r=await doImport(dst,f);const after=await snap(dst.p);
 if(accept){R('1 Import "'+name+'": angenommen, Seite neu geladen',r.reloaded&&!!JSON.parse(after.k).items.find(x=>x.code==='A1'),r.msg);
  const inList=await list(dst.p);R('1 Import "'+name+'": Stand vorher als Sicherungsstand abgelegt (genau 1 Eintrag, byte-gleich)',inList.length===1&&inList[0].inventory===before.k&&inList[0].picking===before.pk&&after.bi!==null)}
 else{R('1 Import "'+name+'": BLOCKIERT, keine Neuladung',!r.reloaded,r.msg);
  R('1 Import "'+name+'": Meldung nennt Barcode und betroffene Artikelnummern',rx.every(x=>x.test(r.msg)),r.msg);
  R('1 Import "'+name+'": keine Rückfrage zum Ersetzen, kein Download, keine Sicherung angelegt',!r.dlg.some(d=>/ersetzt die aktuellen/.test(d))&&r.dl===0&&after.bi===null&&after.bl===null);
  R('1 Import "'+name+'": Lager-, Kommissionier- und Sicherungsdaten byte-gleich (nichts geändert, nichts zugeordnet)',same(before,after))}
 R('1 Import "'+name+'": keine JS-Fehler',dst.st.errs.length===0&&src.st.errs.length===0,dst.st.errs.join('|'));await src.b.close();await dst.b.close()}
// Viele Fälle: Meldung gekürzt
{const src=await app(SEED());const exp=await exportOf(src.p,o=>{for(let i=0;i<10;i++)o.items.push(it('D'+i+'a','Dup '+i+'a','DUPBC'+i),it('D'+i+'b','Dup '+i+'b','DUPBC'+i))});const dst=await app([it('Z1','Ziel','ZZ1')]);const bf=await snap(dst.p);const r=await doImport(dst,wr('many.json',exp));
 R('1 Import mit 10 Dubletten-Gruppen: blockiert, Meldung nennt Anzahl und „weitere“, Daten unverändert',!r.reloaded&&/10 Fälle/.test(r.msg)&&/und 2 weitere/.test(r.msg)&&same(bf,await snap(dst.p)),r.msg.slice(0,120));await src.b.close();await dst.b.close()}
// Altdaten im Zielspeicher (mit Dubletten) bleiben beim Import einer sauberen Datei geschützt gesichert
{const dst=await app([it('X1','Alt Eins','DUP'),it('X2','Alt Zwei','DUP')]);const src=await app(SEED());const exp=await exportOf(src.p);const bf=await snap(dst.p);const r=await doImport(dst,wr('clean.json',exp));
 const l=await list(dst.p);R('1 Zielspeicher mit Alt-Dubletten: saubere Datei wird importiert, der alte Stand (mit Dubletten) wird unverändert gesichert, nichts automatisch korrigiert',r.reloaded&&l.length===1&&l[0].inventory===bf.k);await src.b.close();await dst.b.close()}
// Beschädigte / ungültige Dateien
for(const [name,content,rx] of [['kein JSON','{kaputt',/kein lesbares JSON/],['Array statt Objekt','[1,2]',/Ungültiges Backupformat/],['leeres Objekt','{}',/Ungültiges Backupformat/],['Schema 27 ohne Artikelliste',{schema:27,places:{},boxes:[],history:[],config:{},qrMap:{}},/Ungültiges Backupformat|ungültig/]]){
 const dst=await app([it('Z1','Ziel','ZZ1')]);const bf=await snap(dst.p);const r=await doImport(dst,wr('bad'+Math.random().toString(36).slice(2)+'.json',content));R('1 Beschädigte Datei "'+name+'": abgelehnt, Daten unverändert, keine Sicherung',!r.reloaded&&rx.test(r.msg)&&same(bf,await snap(dst.p)),r.msg);await dst.b.close()}

// ================= 2 Mehrdeutige Scans =================
{const a=await app([it('X1','Exakt Eins','DUP'),it('X2','Exakt Zwei','DUP'),it('U1','Eindeutig','UNI'),it('Y1','Code als Barcode','X1')]);
 // Hinweis: Barcode von Y1 ist zugleich die Artikelnummer X1 -> Scan "X1" trifft X1 (Nummer) UND Y1 (Barcode)
 const before=await snap(a.p);
 await a.p.evaluate(()=>{tab('inventory');invArticle.value=''});await cam(a,'invArticle','DUP');
 let m=await txt(a.p,'invScanMessage'),v=await a.p.evaluate(()=>invArticle.value);
 R('2 Inventur: Scan "DUP" (zwei Artikel) -> keine Auswahl, Warnung nennt X1 und X2',v===''&&/Mehrdeutiger Barcode/.test(m)&&/X1/.test(m)&&/X2/.test(m)&&await a.p.evaluate(()=>invScanMessage.className.includes('error')),m);
 await cam(a,'invArticle','X1');m=await txt(a.p,'invScanMessage');v=await a.p.evaluate(()=>invArticle.value);
 R('2 Inventur: Scan "X1" (Artikelnummer von X1 und Barcode von Y1) -> mehrdeutig gemeldet, keine Auswahl',v===''&&/X1/.test(m)&&/Y1/.test(m)&&/Mehrdeutig/.test(m),m);
 await cam(a,'invArticle','UNI');v=await a.p.evaluate(()=>invArticle.value);m=await txt(a.p,'invScanMessage');R('2 Inventur: eindeutiger Barcode "UNI" wird normal verarbeitet (U1 gewählt)',v==='U1'&&/Artikel erkannt: Eindeutig/.test(m),m);
 await a.p.evaluate(()=>{tab('stock');document.getElementById('search').value=''});await cam(a,'stockSearch','DUP');m=await txt(a.p,'stockScanMessage');v=await a.p.evaluate(()=>document.getElementById('search').value);
 R('2 Bestandssuche: Scan "DUP" -> Suchfeld unverändert, Warnung nennt X1 und X2',v===''&&/Mehrdeutiger Barcode/.test(m)&&/X1/.test(m)&&/X2/.test(m),m);
 await cam(a,'stockSearch','UNI');m=await txt(a.p,'stockScanMessage');v=await a.p.evaluate(()=>document.getElementById('search').value);R('2 Bestandssuche: eindeutiger Barcode normal (Suchfeld U1)',v==='U1'&&/Artikel gefunden/.test(m),m);
 await a.p.evaluate(()=>{tab('articles');aClear.click()});await cam(a,'aBarcode','DUP');m=await txt(a.p,'articleScanMessage');
 R('2 Artikelformular: Scan "DUP" -> Warnung nennt BEIDE Artikel (nicht nur den ersten)',/Mehrdeutiger Barcode/.test(m)&&/X1/.test(m)&&/X2/.test(m),m);
 await a.p.evaluate(()=>{tab('articles');aClear.click()});await cam(a,'aBarcode','NEU-123');m=await txt(a.p,'articleScanMessage');R('2 Artikelformular: freier Barcode normal übernommen (keine Warnung)',!/Mehrdeutig|gehört bereits/.test(m)&&await a.p.evaluate(()=>aBarcode.value)==='NEU-123',m);
 await a.p.evaluate(()=>{tab('scan');handleScan('DUP')});m=await txt(a.p,'scanResult');R('2 Scanner-Tab: Scan "DUP" -> „mehrfach vergeben“ mit Nennung von X1 und X2',/mehrfach vergeben/.test(m)&&/X1/.test(m)&&/X2/.test(m)&&!/Artikel erkannt/.test(m),m);
 await a.p.evaluate(()=>{tab('scan');handleScan('UNI')});m=await txt(a.p,'scanResult');R('2 Scanner-Tab: eindeutiger Barcode normal',/Artikel erkannt: Eindeutig/.test(m),m);
 R('2 Scans (inkl. mehrdeutige) verändern weder Lager- noch Kommissionier- noch Sicherungsdaten',same(before,await snap(a.p)));
 R('2 keine JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));await a.b.close()}
// Schreibvarianten: exakte Scans bleiben eindeutig; Formular nennt beide
{const a=await app([it('A1','Art Eins','BC1'),it('L2','Art Zwei (Legacy)','bc1')]);
 await a.p.evaluate(()=>{tab('inventory');invArticle.value=''});await cam(a,'invArticle','BC1');let v=await a.p.evaluate(()=>invArticle.value);R('2 Schreibvarianten: Inventur "BC1" -> A1 (exakt, eindeutig)',v==='A1');
 await a.p.evaluate(()=>{invArticle.value=''});await cam(a,'invArticle','bc1');v=await a.p.evaluate(()=>invArticle.value);R('2 Schreibvarianten: Inventur "bc1" -> L2',v==='L2');
 await a.p.evaluate(()=>{tab('articles');aClear.click()});await cam(a,'aBarcode','BC1');const m=await txt(a.p,'articleScanMessage');R('2 Schreibvarianten: Artikelformular "BC1" nennt A1 und L2 (reihenfolgeunabhängig)',/A1/.test(m)&&/L2/.test(m)&&/Mehrdeutig/.test(m),m);await a.b.close()}
// Kommissionierung
{const a=await app([it('X1','Exakt Eins','DUP'),it('X2','Exakt Zwei','DUP'),it('U1','Eindeutig','UNI')]);
 const order={id:'T1',lines:3,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:[{sku:'X1',name:'Exakt Eins',place:'H4B-1-1',qty:2,actual:2,unitWeight:1},{sku:'U1',name:'Eindeutig',place:'H4B-1-2',qty:2,actual:2,unitWeight:1},{sku:'X2',name:'Exakt Zwei',place:'H4B-1-3',qty:2,actual:2,unitWeight:1}],checkedLines:[],scannedLines:[],packaging:{type:'euro',scaleMode:'gross',palletTare:25,tolerancePercent:1.5}};
 await a.p.evaluate(o=>{localStorage.setItem('lagerpilot_pick_demo_v1',JSON.stringify({people:[{name:'Max',device:'S1',active:true,lastSeen:1}],roster:['Max'],orders:[o],session:'Max',testStatus:{Max:true}}))},order);await a.p.reload();await a.p.waitForTimeout(400);
 const before=await snap(a.p);const scanLine=(i,c)=>a.p.evaluate(([i,c])=>{pickScanIndex=i;pickScanPhase='article';const o=pickState.orders[0];const n0=(o.scannedLines||[]).length;const r=pickAcceptScan(c);return {r,msg:document.getElementById('pickScanMessage')?.textContent||'',n:(o.scannedLines||[]).length-n0}},[i,c]);
 let r=await scanLine(0,'DUP');R('2 Kommissionierung Zeile X1: Scan "DUP" (passt zu X1 und X2) -> abgelehnt mit Warnung, nichts gebucht',r.r===false&&r.n===0&&/Mehrdeutiger Barcode/.test(r.msg)&&/X1/.test(r.msg)&&/X2/.test(r.msg)&&/nichts gebucht/.test(r.msg),r.msg);
 r=await scanLine(2,'DUP');R('2 Kommissionierung Zeile X2: Scan "DUP" ebenfalls abgelehnt (nie „erster Treffer“)',r.r===false&&r.n===0&&/Mehrdeutiger/.test(r.msg),r.msg);
 r=await scanLine(1,'UNI');R('2 Kommissionierung Zeile U1: eindeutiger Barcode "UNI" akzeptiert',r.r===true&&r.n===1,r.msg);
 r=await scanLine(0,'X1');R('2 Kommissionierung: Artikelnummer als Scan weiterhin akzeptiert, wenn eindeutig (X1)',r.r===true,r.msg);
 const after=await snap(a.p);R('2 Kommissionierung: Lager- und Sicherungsdaten unverändert (Lager byte-gleich)',after.k===before.k&&after.bl===before.bl&&after.bi===before.bi);
 R('2 keine JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));await a.b.close()}

// ================= 3 Sicherungsstände =================
{const ctxB=await chromium.launch();const ctx=await ctxB.newContext({viewport:{width:1000,height:900},acceptDownloads:true});
 const a=await app([it('Z0','Start','ZZ0')],{ctx});
 const mk=async n=>{const s=await app(SEED().concat([it('N'+n,'Stand '+n,'NN'+n)]));const o=await exportOf(s.p);await s.b.close();return wr('st'+n+'.json',o)};
 const files=[];for(let n=1;n<=5;n++)files.push(await mk(n));
 const marks=[];let before=await snap(a.p);marks.push(before.k);
 for(let n=1;n<=3;n++){const r=await doImport(a,files[n-1]);R('3 Import '+n+': angenommen',r.reloaded,r.msg);await a.p.waitForTimeout(300);const cur=await snap(a.p);marks.push(cur.k);
  const l=await list(a.p);R('3 Nach Import '+n+': '+n+' Sicherungsstand/-stände, jeder mit Datum, neuester = vorheriger Stand byte-gleich',l.length===n&&l.every(b=>!isNaN(Date.parse(b.createdAt)))&&l[l.length-1].inventory===marks[n-1]);}
 const rows=await a.p.evaluate(()=>{tab('more');return [...document.querySelectorAll('#backupList .card')].map(x=>x.textContent)});
 R('3 Oberfläche listet 3 Sicherungsstände mit Datum/Uhrzeit, Artikelzahl und Größe',rows.length===3&&rows.every(t=>/\d{1,2}\.\d{1,2}\.\d{4}, \d{2}:\d{2}:\d{2} Uhr/.test(t)&&/Artikel/.test(t)&&/KB/.test(t)),rows[0]);
 // 4. Import bei voller Liste: Rückfrage nennt Entfernung des ältesten; Abbruch ändert nichts
 const full=await snap(a.p);const oldestId=(await list(a.p))[0].id;
 let r=await doImport(a,files[3],{confirm:false});R('3 Import bei voller Liste, Rückfrage abgebrochen: Hinweis auf Entfernung des ältesten stand in der Rückfrage, nichts geändert',r.dlg.some(d=>/Der älteste \(vom/.test(d))&&same(full,await snap(a.p)),r.dlg[0]?.slice(-260));
 r=await doImport(a,files[3]);await a.p.waitForTimeout(300);let l=await list(a.p);R('3 Import bei voller Liste, bestätigt: weiterhin 3 Stände, ältester entfernt, neuer vorhanden',r.reloaded&&l.length===3&&!l.some(b=>b.id===oldestId)&&l[2].inventory===marks[3]);
 // Wiederherstellung
 const idMid=l[1].id,midInv=l[1].inventory;const cur0=await snap(a.p);
 a.st.confirm=false;a.st.dlg.length=0;await a.p.evaluate(id=>{tab('more');restoreBackup(id)},idMid);await a.p.waitForTimeout(300);
 R('3 Wiederherstellung: ohne Bestätigung (abgebrochen) keine Änderung an Lager-/Kommissionier-/Sicherungsdaten',same(cur0,await snap(a.p))&&a.st.dlg.some(d=>/^confirm:.*wiederherstellen\?/s.test(d)&&/ersetzt/.test(d)),a.st.dlg[0]?.slice(0,160));
 a.st.confirm=true;a.st.dlg.length=0;const nav=a.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await a.p.evaluate(id=>{tab('more');restoreBackup(id)},idMid);const rn=await nav;await a.p.waitForTimeout(500);
 const aft=await snap(a.p);l=await list(a.p);
 R('3 Wiederherstellung bestätigt: Lagerdaten byte-gleich dem gewählten Stand, Seite neu geladen',rn&&aft.k===midInv);
 R('3 Wiederherstellung: aktueller Stand wurde vorher als neuer Sicherungsstand (vor Wiederherstellung) abgelegt, Liste bleibt bei 3, ältester wegen Limit entfernt (in der Rückfrage angekündigt)',l.length===3&&l.some(b=>b.source==='restore'&&b.inventory===cur0.k)&&a.st.dlg.some(d=>/Der älteste \(vom/.test(d)));
 // Löschen
 l=await list(a.p);a.st.confirm=false;await a.p.evaluate(id=>{tab('more');deleteBackup(id)},l[0].id);await a.p.waitForTimeout(200);R('3 Löschen ohne Bestätigung: nichts gelöscht',(await list(a.p)).length===3);
 a.st.confirm=true;await a.p.evaluate(id=>{tab('more');deleteBackup(id)},l[0].id);await a.p.waitForTimeout(200);R('3 Löschen bestätigt: 2 Stände, Lagerdaten unberührt',(await list(a.p)).length===2&&(await ls(a.p,K))===aft.k);
 // Rohdaten-Download enthält die Liste
 await a.p.evaluate(()=>{tab('more')});const dlP=a.p.waitForEvent('download',{timeout:4000}).catch(()=>null);await a.p.evaluate(()=>storageRawDownload.click());const dl=await dlP;let rawOk=false;if(dl){const f=path.join(TMP,'raw.json');await dl.saveAs(f);rawOk=!!JSON.parse(fs.readFileSync(f,'utf8'))[BL]}R('3 „Rohdaten sichern“ enthält die Sicherungsstände',rawOk);
 R('3 keine JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));
 // Beschädigte Einträge / Liste
 const t=await snap(a.p);
 await a.p.evaluate(([k,l])=>{const v=JSON.parse(localStorage.getItem(k));v.items.push({id:'bad1',createdAt:new Date().toISOString(),source:'import',inventory:'{kaputt',picking:null},{id:'bad2',createdAt:new Date().toISOString(),source:'import',inventory:JSON.stringify({schema:27}),picking:null},{id:'bad3',createdAt:new Date().toISOString(),source:'import',inventory:null,picking:null});localStorage.setItem(k,JSON.stringify(v))},[BL]);
 for(const id of ['bad1','bad2','bad3']){const k0=await ls(a.p,K);await a.p.evaluate(id=>{tab('more');restoreBackup(id)},id);await a.p.waitForTimeout(250);const m=await txt(a.p,'backupListMessage');R('3 Wiederherstellung eines '+({bad1:'unlesbaren',bad2:'ungültigen',bad3:'leeren (ohne Lagerdaten)'})[id]+' Stands wird verweigert, Lagerdaten unberührt',/beschädigt|ungültig|keine Lagerdaten/.test(m)&&(await ls(a.p,K))===k0,m)}
 await a.p.evaluate(k=>localStorage.setItem(k,'garbage'),BL);const lagerBefore=await ls(a.p,K);r=await doImport(a,files[4]);R('3 Beschädigte Liste der Sicherungsstände: Import wird abgebrochen (Meldung), Lagerdaten unberührt, nichts überschrieben',!r.reloaded&&/Liste der Sicherungsstände ist beschädigt/.test(r.msg)&&(await ls(a.p,K))===lagerBefore&&(await ls(a.p,BL))==='garbage',r.msg);
 await a.p.reload();await a.p.waitForTimeout(300);const reset=await a.p.evaluate(()=>{tab('more');const b=[...document.querySelectorAll('#backupList button')].find(x=>/zurücksetzen/.test(x.textContent));if(!b)return false;b.click();return true});await a.p.waitForTimeout(250);R('3 Beschädigte Liste: Oberfläche bietet „zurücksetzen“ (mit Bestätigung), danach leer, Lagerdaten unberührt',reset&&(await ls(a.p,BL))===null&&(await ls(a.p,K))===lagerBefore);
 await ctxB.close()}
// Speichergrenze: Sicherungsliste nicht schreibbar -> Import abgebrochen, nichts geändert
{const dst=await app([it('Z1','Ziel','ZZ1')]);const src=await app(SEED());const f=wr('q.json',await exportOf(src.p));
 await dst.p.evaluate(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lagerpilot_import_backups_v1')throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}});
 const bf=await snap(dst.p);const r=await doImport(dst,f);R('3 Speichergrenze (Sicherungsliste nicht schreibbar): Import abgebrochen mit Meldung, Daten und Sicherungen byte-gleich',!r.reloaded&&/Sicherheitskopie vor Import konnte nicht gespeichert werden/.test(r.msg)&&same(bf,await snap(dst.p)),r.msg);await src.b.close();await dst.b.close()}
// Legacy-Schlüssel wird weiterhin geschrieben (Kompatibilität)
{const dst=await app([it('Z1','Ziel','ZZ1')]);const src=await app(SEED());const bf=await snap(dst.p);await doImport(dst,wr('l.json',await exportOf(src.p)));const bi=JSON.parse(await ls(dst.p,BI));R('3 Kompatibilität: Schlüssel lagerpilot_before_import bleibt im bisherigen Format {inventory,picking,createdAt}',bi.inventory===bf.k&&bi.picking===bf.pk&&typeof bi.createdAt==='string');await src.b.close();await dst.b.close()}

// ================= 4 Zwei-Tab-Schutz =================
{const bw=await chromium.launch();const ctx=await bw.newContext({viewport:{width:1000,height:900}});const a=await app([it('Z0','Start','ZZ0')],{ctx});const src=await app(SEED());const f=wr('t.json',await exportOf(src.p));await src.b.close();
 let r=await doImport(a,f);await a.p.waitForTimeout(300);const l=await list(a.p);
 const p2=await ctx.newPage();await p2.goto(BASE);await p2.waitForTimeout(300);await p2.evaluate(()=>transaction(s=>{s.items.push({code:'TAB2',name:'Tab2',barcode:'TT2',unit:'STK',pack:1,weight:1,max:10,min:null})}));
 const k2=await ls(a.p,K);a.st.dlg.length=0;await a.p.evaluate(id=>{tab('more');restoreBackup(id)},l[0].id);await a.p.waitForTimeout(300);const m=await txt(a.p,'backupListMessage');
 R('4 Zwei-Tab: Wiederherstellung nach Änderung in anderem Tab wird abgebrochen (Meldung), Lagerdaten (inkl. Änderung aus Tab 2) unverändert, keine Rückfrage',/anderen Tab geändert/.test(m)&&(await ls(a.p,K))===k2&&JSON.parse(k2).items.some(x=>x.code==='TAB2')&&!a.st.dlg.some(d=>/^confirm/.test(d)),m);
 R('4 Zwei-Tab: Sicherungsliste unverändert (keine Sicherung durch abgebrochene Wiederherstellung)',(await list(a.p)).length===l.length);
 R('4 keine JS-Fehler',a.st.errs.length===0,a.st.errs.join('|'));await bw.close()}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail);fs.rmSync(TMP,{recursive:true,force:true});process.exit(fail?1:0)})();
