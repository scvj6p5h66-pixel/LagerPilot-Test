/* Test der getrennten Entwicklungs-Testseite (tools/build-dev-testseite.js).
   Aufruf: node tests/devtest/devtest-build.js   (baut in ein temporäres Verzeichnis, startet einen lokalen Server, verändert das Repository nicht)
   Emulatoren ersetzen keinen Test auf einem echten iPhone. Exit-Code 0 = alles bestanden. */
const {chromium,devices}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'devtest-')),SITE=path.join(TMP,'www');
const DEVDIR='LagerPilot-Dev-Test',PRE='lagerpilot_devtest::';
const res=[];const R=(id,ok,info)=>{res.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(info?'  | '+String(info).slice(0,220):''))};
const sh=c=>cp.execSync(c,{cwd:root,stdio:['ignore','pipe','pipe']}).toString();
const before=sh('git status --porcelain -- index.html styles mitarbeiter.html')+sh('git rev-parse HEAD:index.html');
cp.execSync('node tools/build-dev-testseite.js '+JSON.stringify(path.join(SITE,DEVDIR))+' "Stand development @ test"',{cwd:root,stdio:'pipe'});
// "Andere Versionen" auf demselben Origin simulieren: Hauptseite und /test/ als Kopien der Quelle (ohne Präfix bzw. mit Präfix der alten Testseite)
fs.cpSync(root+'/styles',SITE+'/LagerPilot-Test/styles',{recursive:true});fs.copyFileSync(root+'/index.html',SITE+'/LagerPilot-Test/index.html');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.md':'text/plain'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(SITE,u);if(!f.startsWith(SITE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf')}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
(async()=>{await new Promise(r=>srv.listen(0,r));const O='http://127.0.0.1:'+srv.address().port,DEV=O+'/'+DEVDIR+'/',MAIN=O+'/LagerPilot-Test/index.html';
const b=await chromium.launch();
const mk=async(opt={})=>{const c=await b.newContext(opt);const p=await c.newPage();p.setDefaultTimeout(30000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());return {c,p,errs}};
const rawLS=p=>p.evaluate(()=>{const s=window.localStorage,o={};for(let i=0;i<s.length;i++){const k=s.key(i);o[k]=s.getItem(k)}return o});
const rawSS=p=>p.evaluate(()=>{const s=window.sessionStorage,o={};for(let i=0;i<s.length;i++){const k=s.key(i);o[k]=s.getItem(k)}return o});
const active=p=>p.evaluate(()=>(document.querySelector('section.active')||{}).id);

const h=await mk({viewport:{width:1100,height:900}});const p=h.p;
// 1 Hauptseite (andere Version) legt echte Daten an, "alte Testseite" legt Daten mit ihrem Präfix an
await p.goto(MAIN);await p.waitForTimeout(400);
await p.evaluate(()=>{const s=structuredClone(state);s.items.push({code:'ECHT-1',name:'Echter Bestandsartikel',unit:'STK',pack:1,weight:1,barcode:'4260000000011',max:50});persist(s);window.localStorage.setItem('lagerpilot_iphone_test::lagerpilot_v2_7','{"alte":"testseite"}');window.localStorage.setItem('lagerpilot_last_backup','{"x":1}')});
const foreign=await rawLS(p);
R('1 Vorbereitung: fremde Daten auf demselben Origin vorhanden (Hauptseite + alte Testseite)',!!foreign.lagerpilot_v2_7&&foreign.lagerpilot_v2_7.includes('ECHT-1')&&!!foreign['lagerpilot_iphone_test::lagerpilot_v2_7']);
// 2 Neue Testadresse
const e0=h.errs.length;
await p.goto(DEV);await p.waitForTimeout(500);
R('2 Neue Testadresse ist aufrufbar, Titel "LagerPilot Entwicklungstest"',(await p.title())==='LagerPilot Entwicklungstest'&&await active(p)!==undefined);
R('2 Sichtbarer Hinweisbalken nennt Stand und Speicherpräfix',(await p.locator('#devtestBanner').innerText()).includes('ENTWICKLUNGSTEST')&&(await p.locator('#devtestBanner').innerText()).includes(PRE));
R('2 build-info.json und .nojekyll vorhanden',fs.existsSync(SITE+'/'+DEVDIR+'/build-info.json')&&fs.existsSync(SITE+'/'+DEVDIR+'/.nojekyll'));
// 3 Datentrennung
const afterOpen=await rawLS(p);
const own=Object.keys(afterOpen).filter(k=>k.startsWith(PRE));
R('3 Beim Öffnen werden fremde Daten nicht verändert (alle fremden Schlüssel byte-identisch)',Object.keys(foreign).every(k=>afterOpen[k]===foreign[k]));
R('3 Neue Seite schreibt ausschließlich Schlüssel mit Präfix; keine neuen unpräfixierten lagerpilot-Schlüssel',Object.keys(afterOpen).filter(k=>!(k in foreign)).every(k=>k.startsWith(PRE)));
const seen=await p.evaluate(()=>JSON.stringify(state.items.map(i=>i.code)));
R('3 Neue Seite sieht die Daten der anderen Versionen nicht (kein "ECHT-1")',!seen.includes('ECHT-1'),seen.slice(0,80));
// 4 Mitarbeiter-Testdemo
await p.evaluate(()=>tab('more'));
R('4 Mitarbeiter-Testdemo unter „Mehr“ vorhanden',await p.locator('#mtDemoOpen').isVisible());
await Promise.all([p.waitForNavigation(),p.locator('#mtDemoOpen').click()]);await p.waitForTimeout(500);
R('4 Demo öffnet Mitarbeiterauswahl (Unterpfad-URL korrekt)',await active(p)==='portalLogin'&&p.url().startsWith(DEV)&&p.url().includes('portal=mitarbeiter'),p.url());
await p.locator('[data-portal-name="Max"]').click();await p.locator('#portalLoginBtn').click();await p.waitForTimeout(300);
R('4 Max angemeldet, Startseite mit vier Kacheln',await active(p)==='portalHome'&&await p.locator('.portal-tile').count()===4);
await p.locator('[data-portal-go="stock"]').click();await p.waitForTimeout(200);R('4 Kachel Artikelbestand öffnet',await active(p)==='stock');
const dur=await rawSS(p);R('4 Tab-Merker des Portals liegt im präfixierten sessionStorage',Object.keys(dur).every(k=>k.startsWith(PRE))&&Object.keys(dur).length>0,JSON.stringify(Object.keys(dur)));
await p.locator('#portalBack').click();await p.locator('#portalToAdmin').click();await p.waitForURL(u=>u.href.startsWith(DEV)&&!u.href.includes('portal='),{timeout:6000});await p.waitForTimeout(400);
R('4 „Zur Verwaltung“ führt zurück auf die Entwicklungstestseite (nicht auf eine andere Version)',p.url().startsWith(DEV)&&!(await p.evaluate(()=>document.documentElement.classList.contains('portal')))&&await p.locator('#devtestBanner').isVisible(),p.url());
// 5 fremde Daten nach intensiver Nutzung weiterhin unverändert; eigene Schreibvorgänge nur mit Präfix
await p.evaluate(()=>{const s=structuredClone(state);s.items.push({code:'DEV-9',name:'Entwicklungstest-Artikel',unit:'STK',pack:1,weight:1,barcode:'4260000000099',max:5});persist(s)});
const after=await rawLS(p);
R('5 Nach Schreibvorgängen der Testseite: Hauptseiten-Daten und alte Testseiten-Daten byte-identisch',Object.keys(foreign).every(k=>after[k]===foreign[k]));
R('5 Entwicklungsdaten liegen nur unter dem Präfix',Object.keys(after).filter(k=>!(k in foreign)).every(k=>k.startsWith(PRE))&&Object.keys(after).some(k=>k===PRE+'lagerpilot_v2_7'));
await p.goto(MAIN);await p.waitForTimeout(400);
const mainSeen=await p.evaluate(()=>JSON.stringify(state.items.map(i=>i.code)));
R('5 Umgekehrt: Hauptseite sieht keine Entwicklungsdaten (kein "DEV-9"), eigene Daten intakt ("ECHT-1")',!mainSeen.includes('DEV-9')&&mainSeen.includes('ECHT-1'),mainSeen.slice(0,100));
R('5 Keine JavaScript-Fehler (Desktop)',h.errs.length===e0||h.errs.length===0,h.errs.join('|'));
await h.c.close();
// 6 Mobil
for(const dev of ['iPhone 14','Pixel 7','iPad Pro 11']){const m=await mk({...devices[dev]});const q=m.p;await q.goto(DEV);await q.waitForTimeout(500);
 const a=await q.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth+1,ban:!!document.getElementById('devtestBanner')}));
 await q.evaluate(()=>tab('more'));await q.locator('#mtDemoOpen').tap();await q.waitForTimeout(500);await q.locator('[data-portal-name="Leon"]').tap();await q.locator('#portalLoginBtn').tap();await q.waitForTimeout(300);
 const c=await q.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth+1,sec:document.querySelector('section.active').id,tiles:document.querySelectorAll('.portal-tile').length}));
 R('6 '+dev+': Entwicklungstestseite und Mitarbeiter-Startseite ohne Seitenüberlauf, vier Kacheln',!a.over&&a.ban&&!c.over&&c.sec==='portalHome'&&c.tiles===4,JSON.stringify([a,c]));
 R('6 '+dev+': Keine JavaScript-Fehler',m.errs.length===0,m.errs.join('|'));await m.c.close();}
// 7 Quelle unverändert
R('7 Quelldateien (index.html, styles, mitarbeiter.html) durch den Build unverändert',before===sh('git status --porcelain -- index.html styles mitarbeiter.html')+sh('git rev-parse HEAD:index.html'));
await b.close();srv.close();fs.rmSync(TMP,{recursive:true,force:true});
const f=res.filter(x=>!x).length;console.log('GESAMT '+res.length+' Prüfungen / FAIL '+f);process.exit(f?1:0)})().catch(e=>{console.log('SCRIPTFEHLER',e.stack.slice(0,800));process.exit(2)});
