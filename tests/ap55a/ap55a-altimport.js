// AP5.5a – Altdatenkompatibler Import mit kontrollierter Ausnahme
// Aufruf: BASE=http://localhost:8123/index.html node tests/ap55a/ap55a-altimport.js
// Ablauf Import mit Barcode-Konflikt: 1) Ausnahme-Rückfrage (nennt Konflikte) -> 2) normale Importrückfrage -> Zwei-Tab-Prüfung -> Sicherung -> Schreiben.
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html',K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1',BI='lagerpilot_before_import',BL='lagerpilot_import_backups_v1';
let pass=0,fail=0;const R=(id,ok,info)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).replace(/\s+/g,' ').slice(0,230):''))};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'ap55a-'));
const it=(code,name,barcode,o={})=>({code,name,barcode,unit:'STK',pack:1,weight:1,max:100,min:null,...o});
const pickData=()=>({people:[{name:'Max',device:'S1',active:true,lastSeen:1}],roster:['Max'],orders:[],session:'Max',testStatus:{Max:true}});
// Instanz; st.answers = Antworten auf confirm-Dialoge der Reihe nach (sonst st.confirm); st.hook läuft vor der Antwort auf die n-te Rückfrage
async function app(items,{ctx:shared,boxes=true}={}){let b=null,ctx=shared;if(!ctx){b=await chromium.launch();ctx=await b.newContext({viewport:{width:1000,height:900},acceptDownloads:true});}
 const p=await ctx.newPage();const st={errs:[],dlg:[],confirm:true,answers:[],hook:null,downloads:[],navs:0};p.on('pageerror',e=>st.errs.push(e.message));p.on('framenavigated',f=>{if(f===p.mainFrame())st.navs++});
 p.on('download',async d=>{try{const f=path.join(TMP,Math.random().toString(36).slice(2)+d.suggestedFilename());await d.saveAs(f);st.downloads.push(fs.readFileSync(f,'utf8'))}catch(e){st.errs.push('dl '+e.message)}});
 p.on('dialog',async d=>{const idx=st.dlg.filter(x=>x.startsWith('confirm:')).length;st.dlg.push(d.type()+':'+d.message());if(d.type()!=='confirm'){await d.accept();return}
  if(st.hook&&st.hook.at===idx){await st.hook.fn();}const ans=st.answers.length?st.answers.shift():st.confirm;ans?await d.accept():await d.dismiss()});
 await p.addInitScript(()=>{window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){document.getElementById(this.id).innerHTML='<video></video>';window.__cb=cb}async stop(){}async clear(){}}});
 await p.goto(BASE);await p.waitForTimeout(300);
 await p.evaluate(([it,boxes])=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push(...it);if(boxes){const c=it[0].code;s.boxes.push({id:'bx-'+c,code:c,place:Object.keys(s.places)[0],qty:7,blocked:1});s.qrMap['QR-'+c]=Object.keys(s.places)[0]}})},[items,boxes]);
 await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,pickData()]);await p.reload();await p.waitForTimeout(400);st.navs=0;return {b,ctx,p,st}}
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const txt=(p,id)=>p.evaluate(id=>document.getElementById(id)?.textContent?.trim(),id);
const wr=(name,obj)=>{const f=path.join(TMP,name);fs.writeFileSync(f,typeof obj==='string'?obj:JSON.stringify(obj));return f};
const exportOf=async(p,mut)=>{const o=JSON.parse(await ls(p,K));mut&&mut(o);return o};
const snap=async p=>({k:await ls(p,K),pk:await ls(p,PK),bi:await ls(p,BI),bl:await ls(p,BL)});
const same=(a,b)=>a.k===b.k&&a.pk===b.pk&&a.bi===b.bi&&a.bl===b.bl;
const list=async p=>{const r=await ls(p,BL);return r===null?[]:JSON.parse(r).items};
async function doImport(a,file,answers){a.st.answers=answers?[...answers]:[];a.st.dlg.length=0;const d0=a.st.downloads.length;await a.p.evaluate(()=>tab('more'));
 const nav=a.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await a.p.setInputFiles('#jsonImport',file);const reloaded=await nav;await a.p.waitForTimeout(reloaded?600:450);
 const msg=await txt(a.p,'backupMessage').catch(()=>'');return {reloaded,msg,dlg:a.st.dlg.slice(),dl:a.st.downloads.length-d0}}
const cam=async(a,target,code)=>{await a.p.evaluate(async t=>{window.__cb=null;await stopCamera();return startCamera(t)},target);await a.p.waitForTimeout(150);await a.p.evaluate(c=>window.__cb&&window.__cb(c),code);await a.p.waitForTimeout(250)};
const SEED=()=>[it('A1','Art Eins','BC1'),it('A2','Art Zwei','BC2'),it('A3','Art Drei','')];
const CONFLICTS=[
 ['exakte Dublette',o=>{o.items.find(x=>x.code==='A2').barcode='BC1'},[/BC1/,/identisch/,/A1/,/A2/]],
 ['Schreibvariante BC1/bc1',o=>{o.items.find(x=>x.code==='A2').barcode='bc1'},[/Schreibvarianten/,/A1/,/A2/]],
 ['Barcode = fremde Artikelnummer',o=>{o.items.find(x=>x.code==='A2').barcode='A1'},[/„A1“/,/zugleich Artikelnummer von A1/,/A2/]],
 ['Altformat Schema 26 mit Dublette',o=>{o.schema=26;o.items.find(x=>x.code==='A2').barcode='BC1'},[/BC1/,/A1/,/A2/]],
];
const DATAKEYS=['items','boxes','places','qrMap','config','history','inventoryLogs'];
(async()=>{
// ---------- A Normaler Import ohne Konflikt ----------
{const src=await app(SEED());const f=wr('clean.json',await exportOf(src.p));const dst=await app([it('Z1','Ziel','ZZ1')]);const bf=await snap(dst.p);const r=await doImport(dst,f);
 const conf=r.dlg.filter(d=>d.startsWith('confirm:'));
 R('A Normaler Import ohne Konflikt: genau EINE Rückfrage (normale Importbestätigung), keine Ausnahme-Rückfrage, importiert',r.reloaded&&conf.length===1&&/ersetzt die aktuellen/.test(conf[0])&&!r.dlg.some(d=>/MEHRDEUTIGE/.test(d)));
 R('A Normaler Import: kein Hinweis auf mehrdeutige Barcodes im Abschlussdialog',!r.dlg.some(d=>/^alert:.*mehrdeutige Barcode-Fälle/.test(d)));
 const l=await list(dst.p);R('A Normaler Import: Vorstand als Sicherungsstand abgelegt und als Datei heruntergeladen',l.length===1&&l[0].inventory===bf.k&&r.dl===1);await src.b.close();await dst.b.close()}

// ---------- B Konfliktimporte: Standard, Abbrüche, Ausnahme ----------
for(const [name,mut,rx] of CONFLICTS){
 const src=await app(SEED());const exp=await exportOf(src.p,mut);const f=wr('k'+Math.random().toString(36).slice(2)+'.json',exp);await src.b.close();
 const mkDst=()=>app([it('Z1','Ziel','ZZ1'),it('Z2','Ziel 2','ZZ2')]);
 // B1 Ausnahme-Rückfrage abgebrochen
 {const d=await mkDst();const bf=await snap(d.p);const r=await doImport(d,f,[false]);const af=await snap(d.p);
  R('B "'+name+'": Standard = nicht importieren; Rückfrage 1 nennt Barcode und Artikelnummern',!r.reloaded&&r.dlg.length===1&&/^confirm:ACHTUNG: MEHRDEUTIGE BARCODES/.test((r.dlg[0]||''))&&rx.every(x=>x.test((r.dlg[0]||''))),(r.dlg[0]||'').slice(0,220));
  R('B "'+name+'": Abbruch der Ausnahme-Rückfrage: Lager-, Kommissionier- und Sicherungsdaten byte-gleich, kein Download, keine Sicherung',same(bf,af)&&r.dl===0&&af.bi===null&&af.bl===null&&/nicht bestätigt/.test(r.msg),r.msg);
  // B2 Ausnahme bestätigt, normale Importrückfrage abgebrochen
  const r2=await doImport(d,f,[true,false]);const af2=await snap(d.p);
  R('B "'+name+'": Ausnahme bestätigt, aber normale Importbestätigung abgebrochen: nichts verändert (byte-gleich), keine Sicherung, kein Download',!r2.reloaded&&r2.dlg.filter(x=>x.startsWith('confirm:')).length===2&&/ersetzt die aktuellen/.test((r2.dlg[1]||''))&&same(bf,af2)&&r2.dl===0,r2.dlg.length);
  R('B "'+name+'": keine JS-Fehler',d.st.errs.length===0,d.st.errs.join('|'));await d.b.close()}
 // B3 beide bestätigt: Ausnahmeimport
 {const d=await mkDst();const bf=await snap(d.p);const r=await doImport(d,f,[true,true]);await d.p.waitForTimeout(300);const stNew=JSON.parse(await ls(d.p,K));const l=await list(d.p);
  R('B "'+name+'": beide Rückfragen bestätigt -> Ausnahmeimport durchgeführt, Seite neu geladen; Reihenfolge: 1. Ausnahme, 2. normale Importrückfrage',r.reloaded&&/MEHRDEUTIGE/.test((r.dlg[0]||''))&&/ersetzt die aktuellen/.test((r.dlg[1]||'')));
  R('B "'+name+'": Abschlussdialog weist auf die mehrdeutigen Barcodes hin',r.dlg.some(d=>/^alert:.*mehrdeutige Barcode-Fälle/s.test(d)),(r.dlg[2]||''));
  const want=name.includes('26')?null:exp;
  if(want)R('B "'+name+'": Datenintegrität – items, boxes, places, qrMap, config, history, inventoryLogs byte-gleich zur Datei (nichts zusammengeführt, gelöscht oder korrigiert)',DATAKEYS.every(k=>JSON.stringify(stNew[k])===JSON.stringify(exp[k])),DATAKEYS.filter(k=>JSON.stringify(stNew[k])!==JSON.stringify(exp[k])).join(','));
  else R('B "'+name+'": Schema-26-Datei: Artikel (Nummern + Barcodes), Boxen und QR-Zuordnung unverändert übernommen, Schema 27',JSON.stringify(stNew.items)===JSON.stringify(exp.items)&&JSON.stringify(stNew.boxes)===JSON.stringify(exp.boxes)&&JSON.stringify(stNew.qrMap)===JSON.stringify(exp.qrMap)&&stNew.schema===27);
  R('B "'+name+'": Dublette bleibt unverändert bestehen (A2-Barcode wie in der Datei)',stNew.items.find(x=>x.code==='A2').barcode===exp.items.find(x=>x.code==='A2').barcode);
  R('B "'+name+'": Vorstand als Sicherungsstand abgelegt (byte-gleich) und als Datei heruntergeladen',l.length===1&&l[0].inventory===bf.k&&l[0].picking===bf.pk&&r.dl===1&&r.dl>=1&&d.st.downloads[d.st.downloads.length-1].includes('"Z1"'));
  R('B "'+name+'": keine JS-Fehler',d.st.errs.length===0,d.st.errs.join('|'));await d.b.close()}
}

// ---------- C Scanner-Sicherheit nach bestätigtem Ausnahmeimport ----------
{const src=await app([it('X1','Exakt Eins','DUP'),it('X2','Exakt Zwei','DUP'),it('U1','Eindeutig','UNI'),it('A1','Art Eins','BC1'),it('L2','Art Zwei (Legacy)','bc1')]);
 const exp=await exportOf(src.p);await src.b.close();const d=await app([it('Z1','Ziel','ZZ1')]);const r=await doImport(d,wr('scan.json',exp),[true,true]);await d.p.waitForTimeout(400);
 R('C Ausnahmeimport mit exakter Dublette DUP und Schreibvariante BC1/bc1 durchgeführt',r.reloaded);
 const before=await snap(d.p);
 await d.p.evaluate(()=>{tab('inventory');invArticle.value=''});await cam(d,'invArticle','DUP');let m=await txt(d.p,'invScanMessage'),v=await d.p.evaluate(()=>invArticle.value);
 R('C Inventur: "DUP" meldet Mehrdeutigkeit mit X1 und X2, keine Auswahl',v===''&&/Mehrdeutiger Barcode/.test(m)&&/X1/.test(m)&&/X2/.test(m),m);
 await cam(d,'invArticle','UNI');v=await d.p.evaluate(()=>invArticle.value);R('C Inventur: eindeutiger Barcode UNI -> U1',v==='U1');
 await d.p.evaluate(()=>{invArticle.value=''});await cam(d,'invArticle','BC1');v=await d.p.evaluate(()=>invArticle.value);R('C Inventur: "BC1" exakt eindeutig -> A1 (Schreibvariante bc1 gehört zu L2)',v==='A1');
 await d.p.evaluate(()=>{tab('stock');document.getElementById('search').value=''});await cam(d,'stockSearch','DUP');m=await txt(d.p,'stockScanMessage');v=await d.p.evaluate(()=>document.getElementById('search').value);R('C Bestandssuche: "DUP" meldet Mehrdeutigkeit, Suchfeld bleibt leer',v===''&&/Mehrdeutiger/.test(m)&&/X1/.test(m)&&/X2/.test(m),m);
 await cam(d,'stockSearch','UNI');v=await d.p.evaluate(()=>document.getElementById('search').value);R('C Bestandssuche: eindeutiger Barcode normal',v==='U1');
 await d.p.evaluate(()=>{tab('articles');aClear.click()});await cam(d,'aBarcode','DUP');m=await txt(d.p,'articleScanMessage');R('C Artikelformular: "DUP" nennt beide Artikel',/Mehrdeutiger/.test(m)&&/X1/.test(m)&&/X2/.test(m),m);
 await d.p.evaluate(()=>{tab('articles');aClear.click()});await cam(d,'aBarcode','BC1');m=await txt(d.p,'articleScanMessage');R('C Artikelformular: "BC1" (Schreibvariante) nennt A1 und L2',/A1/.test(m)&&/L2/.test(m),m);
 await d.p.evaluate(()=>{tab('scan');handleScan('DUP')});m=await txt(d.p,'scanResult');R('C Scanner-Tab: "DUP" zeigt Konflikt mit X1 und X2',/mehrfach vergeben/.test(m)&&/X1/.test(m)&&/X2/.test(m),m);
 await d.p.evaluate(()=>{tab('scan');handleScan('UNI')});m=await txt(d.p,'scanResult');R('C Scanner-Tab: eindeutiger Barcode normal',/Artikel erkannt: Eindeutig/.test(m),m);
 // Kommissionierung
 const order={id:'T1',lines:2,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-12T08:00:00.000Z',items:[{sku:'X1',name:'Exakt Eins',place:'H4B-1-1',qty:2,actual:2,unitWeight:1},{sku:'U1',name:'Eindeutig',place:'H4B-1-2',qty:2,actual:2,unitWeight:1}],checkedLines:[],scannedLines:[],packaging:{type:'euro',scaleMode:'gross',palletTare:25,tolerancePercent:1.5}};
 await d.p.evaluate(o=>{localStorage.setItem('lagerpilot_pick_demo_v1',JSON.stringify({people:[{name:'Max',device:'S1',active:true,lastSeen:1}],roster:['Max'],orders:[o],session:'Max',testStatus:{Max:true}}))},order);await d.p.reload();await d.p.waitForTimeout(400);
 const lagerK=await ls(d.p,K);const sc=(i,c)=>d.p.evaluate(([i,c])=>{pickScanIndex=i;pickScanPhase='article';const o=pickState.orders[0];const n0=(o.scannedLines||[]).length;const r=pickAcceptScan(c);return {r,msg:document.getElementById('pickScanMessage')?.textContent||'',n:(o.scannedLines||[]).length-n0}},[i,c]);
 let x=await sc(0,'DUP');R('C Kommissionierung: mehrdeutiger Scan "DUP" abgelehnt, nichts gebucht',x.r===false&&x.n===0&&/Mehrdeutiger/.test(x.msg)&&/nichts gebucht/.test(x.msg),x.msg);
 x=await sc(1,'UNI');R('C Kommissionierung: eindeutiger Barcode akzeptiert',x.r===true&&x.n===1);
 R('C Scans verändern keine Lagerdaten (Lager byte-gleich)',(await ls(d.p,K))===lagerK&&lagerK===before.k);
 R('C keine JS-Fehler',d.st.errs.length===0,d.st.errs.join('|'));await d.b.close()}

// ---------- D Beschädigte und ungültige Dateien bleiben gesperrt (auch mit Konflikt) ----------
{const src=await app(SEED());const base=await exportOf(src.p);await src.b.close();
 const dup=o=>{o.items.find(x=>x.code==='A2').barcode='BC1';return o};
 const bad=[
  ['kein JSON','{kaputt',/kein lesbares JSON/],
  ['Array statt Objekt','[1,2]',/Ungültiges Backupformat/],
  ['Konflikt + doppelte Artikelnummer',dup(Object.assign(structuredClone(base),{items:[...base.items,{...base.items[0]}]})),/Importdaten ungültig|Ungültiges Backupformat/],
  ['Konflikt + Box verweist auf unbekannten Artikel',dup(Object.assign(structuredClone(base),{boxes:[...base.boxes,{id:'bx-bad',code:'NOPE',place:Object.keys(base.places)[0],qty:1,blocked:0}]})),/Importdaten ungültig|Ungültiges Backupformat/],
  ['Konflikt + ungültige Einheit',(()=>{const o=dup(structuredClone(base));o.items[0].unit='XX';return o})(),/Importdaten ungültig|Ungültiges Backupformat/],
  ['Konflikt + falsches Schema',(()=>{const o=dup(structuredClone(base));o.schema=99;return o})(),/Ungültiges Backupformat/],
  ['Konflikt + kaputte Kommissionierdaten',(()=>{const o=dup(structuredClone(base));o._pick={orders:'x'};return o})(),/Kommissionierdaten in Sicherung ungültig/],
 ];
 for(const [name,content,rx] of bad){const d=await app([it('Z1','Ziel','ZZ1')]);const bf=await snap(d.p);const r=await doImport(d,wr('b'+Math.random().toString(36).slice(2)+'.json',content),[true,true,true]);
  R('D Datei "'+name+'": gesperrt, KEINE Ausnahme-Rückfrage, Meldung passt, Daten byte-gleich, keine Sicherung',!r.reloaded&&rx.test(r.msg)&&!r.dlg.some(x=>/MEHRDEUTIGE/.test(x))&&r.dlg.length===0&&same(bf,await snap(d.p)),r.msg);await d.b.close()}}

// ---------- E Speicherfehler ----------
{const src=await app(SEED());const f=wr('e.json',await exportOf(src.p,o=>{o.items.find(x=>x.code==='A2').barcode='BC1'}));await src.b.close();
 // E1 Sicherungsliste nicht schreibbar
 {const d=await app([it('Z1','Ziel','ZZ1')]);await d.p.evaluate(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lagerpilot_import_backups_v1')throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}});
  const bf=await snap(d.p);const r=await doImport(d,f,[true,true]);R('E1 Ausnahmeimport, Sicherung nicht speicherbar (Speicher voll): abgebrochen, Meldung, Daten und Sicherungen byte-gleich, kein Download',!r.reloaded&&/Sicherheitskopie vor Import konnte nicht gespeichert werden/.test(r.msg)&&same(bf,await snap(d.p))&&r.dl===0,r.msg);await d.b.close()}
 // E2 Altschlüssel nicht schreibbar
 {const d=await app([it('Z1','Ziel','ZZ1')]);await d.p.evaluate(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lagerpilot_before_import')throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}});
  const bf=await snap(d.p);const r=await doImport(d,f,[true,true]);R('E2 Ausnahmeimport, Altsicherung nicht speicherbar: abgebrochen, Liste zurückgerollt, alles byte-gleich',!r.reloaded&&/Sicherheitskopie vor Import konnte nicht gespeichert werden/.test(r.msg)&&same(bf,await snap(d.p)),r.msg);await d.b.close()}
 // E3 Schreiben der Lagerdaten schlägt fehl -> Rückstellung
 {const d=await app([it('Z1','Ziel','ZZ1')]);await d.p.evaluate(()=>{const o=Storage.prototype.setItem;let n=0;Storage.prototype.setItem=function(k,v){if(k==='lagerpilot_v2_7'&&n++===0)throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}});
  const bf=await snap(d.p);const r=await doImport(d,f,[true,true]);const af=await snap(d.p);R('E3 Ausnahmeimport, Schreiben der Lagerdaten schlägt fehl: Meldung „bisherige Daten wiederhergestellt“, Lager- und Kommissionierdaten byte-gleich',!r.reloaded&&/Import fehlgeschlagen/.test(r.msg)&&af.k===bf.k&&af.pk===bf.pk,r.msg);await d.b.close()}
 // E4 Sicherungsliste beschädigt
 {const d=await app([it('Z1','Ziel','ZZ1')]);await d.p.evaluate(k=>localStorage.setItem(k,'garbage'),BL);const bf=await snap(d.p);const r=await doImport(d,f,[true,true]);R('E4 Beschädigte Sicherungsliste: Import abgebrochen, nichts überschrieben, Lagerdaten byte-gleich',!r.reloaded&&/Liste der Sicherungsstände ist beschädigt/.test(r.msg)&&same(bf,await snap(d.p)),r.msg);await d.b.close()}
}

// ---------- F Zwei-Tab-Konflikte ----------
for(const [label,mutator] of [['Konflikt-Import (Ausnahme)',o=>{o.items.find(x=>x.code==='A2').barcode='BC1'}],['normaler Import',o=>{}]]){
 const src=await app(SEED());const f=wr('f'+Math.random().toString(36).slice(2)+'.json',await exportOf(src.p,mutator));await src.b.close();
 const bw=await chromium.launch();const ctx=await bw.newContext({viewport:{width:1000,height:900},acceptDownloads:true});const d=await app([it('Z1','Ziel','ZZ1')],{ctx});const p2=await ctx.newPage();await p2.goto(BASE);await p2.waitForTimeout(300);
 const conflict=label.startsWith('Konflikt');
 // Änderung im zweiten Tab, während die (letzte) Importrückfrage offen ist
 d.st.hook={at:conflict?1:0,fn:async()=>{await p2.evaluate(()=>transaction(s=>{s.items.push({code:'TAB2',name:'Tab 2',barcode:'TT2',unit:'STK',pack:1,weight:1,max:10,min:null})}))}};
 const bf=await snap(d.p);const r=await doImport(d,f,conflict?[true,true]:[true]);const k2=await ls(d.p,K);
 R('F '+label+': Änderung in anderem Tab während der Rückfrage -> sicherer Abbruch mit Meldung, nicht neu geladen',!r.reloaded&&/anderen Tab geändert/.test(r.msg)&&/nichts verändert/.test(r.msg),r.msg);
 R('F '+label+': Lagerdaten (inkl. Änderung aus Tab 2) unverändert, keine Sicherung angelegt, kein Download, Kommissionierdaten byte-gleich',JSON.parse(k2).items.some(x=>x.code==='TAB2')&&(await ls(d.p,BI))===null&&(await ls(d.p,BL))===null&&r.dl===0&&(await ls(d.p,PK))===bf.pk);
 R('F '+label+': keine JS-Fehler',d.st.errs.length===0,d.st.errs.join('|'));await bw.close()}

// ---------- G Wiederholte Importe, Sicherung und Wiederherstellung ----------
{const bw=await chromium.launch();const ctx=await bw.newContext({viewport:{width:1000,height:900},acceptDownloads:true});const d=await app([it('Z0','Start','ZZ0')],{ctx});
 const mk=async(n,conflict)=>{const s=await app(SEED().concat([it('N'+n,'Stand '+n,'NN'+n)]));const o=await exportOf(s.p,conflict?(o=>{o.items.find(x=>x.code==='A2').barcode='BC1'}):null);await s.b.close();return [wr('g'+n+'.json',o),o]};
 const seq=[[1,false],[2,true],[3,false],[4,true]];const states=[(await snap(d.p)).k];
 for(const [n,conf] of seq){const [f,o]=await mk(n,conf);const nBefore=(await list(d.p)).length;const r=await doImport(d,f,conf?[true,true]:[true]);await d.p.waitForTimeout(300);
  const cur=await snap(d.p);states.push(cur.k);const l=await list(d.p);
  R('G Import '+n+(conf?' (Ausnahme)':' (normal)')+': importiert, vorheriger Stand als jüngster Sicherungsstand, Liste ≤ 3'+(n===4?', älteste entfernt (in Rückfrage angekündigt)':''),r.reloaded&&l[l.length-1].inventory===states[n-1]&&l.length===Math.min(n,3)&&(n<4||r.dlg.some(x=>/Der älteste \(vom/.test(x))),'Liste '+l.length);}
 // Wiederherstellung eines Stands, der aus einem Konflikt-Import stammt: ältester verbliebener Stand
 let l=await list(d.p);const target=l.find(b=>b.inventory===states[2]);// Stand vor Import 3 = Ergebnis des Ausnahmeimports 2 (enthält Dublette)
 const cur0=await snap(d.p);d.st.answers=[false];d.st.dlg.length=0;await d.p.evaluate(id=>{tab('more');restoreBackup(id)},target.id);await d.p.waitForTimeout(250);
 R('G Wiederherstellung abgebrochen: nichts verändert',same(cur0,await snap(d.p))&&d.st.dlg.some(x=>/wiederherstellen\?/.test(x)));
 d.st.answers=[true];const nav=d.p.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);await d.p.evaluate(id=>{tab('more');restoreBackup(id)},target.id);const rn=await nav;await d.p.waitForTimeout(400);
 const aft=await snap(d.p);R('G Wiederherstellung bestätigt: Stand des Ausnahmeimports (mit Dublette) byte-gleich zurück, Seite neu geladen; aktueller Stand zuvor gesichert',rn&&aft.k===states[2]&&(await list(d.p)).some(b=>b.source==='restore'&&b.inventory===cur0.k)&&JSON.parse(aft.k).items.filter(x=>String(x.barcode).toLowerCase()==='bc1').length===2);
 R('G keine JS-Fehler',d.st.errs.length===0,d.st.errs.join('|'));await bw.close()}
console.log('\nGESAMT '+(pass+fail)+' / FAIL '+fail);fs.rmSync(TMP,{recursive:true,force:true});process.exit(fail?1:0)})();
