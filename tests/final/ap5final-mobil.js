// AP5-Final – Mobile Bedienbarkeit (BROWSER-EMULATION in Chromium, KEINE echten Geräte).
// Prüft je Breite (320/375/390/430/Tablet/Desktop) alle Arbeitsbereiche auf horizontales Scrollen, abgeschnittene Elemente,
// Touch-Zielgrößen (>=44 px bei Touch-Breiten), Schriftgröße, Zahleneingabe-Tastaturen (inputmode), Kamerafelder, Kommissionierschein/Druck.
const L=require('./lib');const {R,B,N,done}=L.reporter('Mobiltest');const {open,go,setv,click,st,PK}=L;
const SIZES=[[320,640,'320 px (Emulation)'],[375,667,'375 px (Emulation)'],[390,844,'390 px (Emulation)'],[430,932,'430 px (Emulation)'],[820,1180,'Tablet 820×1180 (Emulation)'],[1440,900,'Desktop 1440 (Emulation)']];
const TABS=['home','book','stock','racks','articles','scan','inventory','merge','picking','more'];
async function seed(h){await h.p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});
 for(let i=1;i<=6;i++)s.items.push({code:'M-'+i,name:'Mobiltest-Artikel mit längerem Namen Nummer '+i,barcode:'MB'+i,unit:i%2?'P':'STK',pack:i%2?10:1,weight:1.5,max:50,min:5});
 for(let i=1;i<=6;i++)s.boxes.push({id:'m'+i,place:'H4A-'+i+'-'+i,code:'M-'+i,qty:30,blocked:0})});});await h.p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[PK,{people:[{name:'Max',device:'Scanner 1',active:true,lastSeen:1}],roster:['Max','Peter','Leon'],orders:[{id:'K-1042',lines:2,assignee:'Max',status:'In Bearbeitung',startedAt:'2026-11-14T08:00:00.000Z',items:[{sku:'M-1',name:'Mobiltest-Artikel mit längerem Namen Nummer 1',place:'H4A-1-1',qty:4,actual:4,unitWeight:1.5},{sku:'M-2',name:'Mobiltest-Artikel mit längerem Namen Nummer 2',place:'H4A-2-2',qty:3,actual:3,unitWeight:1.5}],checkedLines:[],scannedLines:[],packaging:{type:'euro',scaleMode:'gross',palletWeight:25,boxWeight:1.5,measuredWeight:null,tolerancePercent:1}},{id:'K-1043',lines:8,assignee:'',status:'Offen'}],session:'',testStatus:{}}]);await h.p.reload();await h.p.waitForTimeout(400)}
// Messfunktion im Seitenkontext: liefert Probleme der aktuell sichtbaren Ansicht
const MEASURE=`(touch)=>{const vw=document.documentElement.clientWidth;const out={hscroll:document.documentElement.scrollWidth>vw+1||document.body.scrollWidth>vw+1,sw:document.documentElement.scrollWidth,over:[],small:[],tiny:[],clipped:[]};
 const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'};
 const inScroll=e=>{for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){const o=getComputedStyle(n).overflowX;if((o==='auto'||o==='scroll')&&n.scrollWidth>n.clientWidth)return true}return false};
 const sec=document.querySelector('main section.active, main section:not(.hidden):not([hidden])')||document.body;
 document.querySelectorAll('button,input:not([type=hidden]):not([type=file]),select,textarea,a,[role=button]').forEach(e=>{if(!vis(e)||!e.offsetParent)return;if(e.closest('.hidden,[hidden]'))return;const r=e.getBoundingClientRect();const n=(e.id||e.dataset.tab||e.textContent||e.tagName).toString().trim().slice(0,30);
  if(r.right>vw+1&&!inScroll(e))out.over.push(n+' ('+Math.round(r.right)+')');if(r.left<-1&&!inScroll(e))out.over.push(n+' (links '+Math.round(r.left)+')');
  if(touch&&(r.height<40||r.width<40)&&e.tagName!=='A'&&!e.disabled)out.small.push(n+' '+Math.round(r.width)+'×'+Math.round(r.height))});
 document.querySelectorAll('p,span,label,td,th,small,li,b,strong,div,h1,h2,h3,button').forEach(e=>{if(!vis(e)||e.children.length>0&&e.tagName==='DIV')return;if(!(e.childNodes.length&&[...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())))return;const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<11)out.tiny.push((e.textContent||'').trim().slice(0,24)+' '+fs+'px');
  if(e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='hidden'&&!e.closest('.scroll'))out.clipped.push((e.id||e.className||e.tagName)+':'+(e.textContent||'').trim().slice(0,24))});
 return out}`;
(async()=>{
const dbg={};const seenSmall=new Set();
for(const [w,hgt,label] of SIZES){const touch=w<=820;const h=await open({width:w,height:hgt,ctx:undefined});await h.p.setViewportSize({width:w,height:hgt});await seed(h);
 for(const t of TABS){await go(h.p,t);const m=await h.p.evaluate(`(${MEASURE})(${touch})`);
  const bad=m.hscroll||m.over.length||m.clipped.length;
  R('['+label+'] Tab „'+t+'“: kein horizontales Scrollen, nichts rechts außerhalb, nichts abgeschnitten',!bad,(m.hscroll?'scrollWidth '+m.sw+' > '+w+' | ':'')+m.over.slice(0,4).join('; ')+(m.clipped.length?' | abgeschnitten: '+m.clipped.slice(0,3).join('; '):''));
  {const nw=m.small.filter(x=>!seenSmall.has(w+'|'+x.replace(/ \d+×\d+$/,'').replace(/^\d+$/,'#')));m.small.forEach(x=>seenSmall.add(w+'|'+x.replace(/ \d+×\d+$/,'').replace(/^\d+$/,'#')));if(touch&&nw.length)B('gering','['+label+'] Tab „'+t+'“: '+nw.length+' neue(s) Bedienelement(e) kleiner als 40 px (Touch-Ziel; bereits gemeldete wiederholen sich nicht)','z. B. '+nw.slice(0,6).join('; '))}
  if(m.tiny.length)B('gering','['+label+'] Tab „'+t+'“: Text kleiner als 11 px','z. B. '+m.tiny.slice(0,3).join('; '))}
 // Zahleneingaben: Tastaturtyp
 if(w===375){const im=await h.p.evaluate(()=>{const r={};['bookQty','invQty','aPack','aWeight','aMax','aMin','cfgShelf','cfgBay','cfgPalletMax','cfgTare','mergeQty'].forEach(id=>{const e=document.getElementById(id);r[id]=e?(e.getAttribute('inputmode')||'FEHLT')+'/'+e.type:'—'});return r});
  R('Zahleneingaben (außer Buchungsmenge) nutzen Mobil-Tastatur (inputmode numeric/decimal)',Object.entries(im).filter(([k,v])=>v!=='—'&&k!=='bookQty').every(([k,v])=>/^(numeric|decimal)\//.test(v)),JSON.stringify(im));if(!/^(numeric|decimal)\//.test(im.bookQty))B('gering','Feld „Menge“ im Buchungsformular (bookQty) ohne inputmode: auf dem Smartphone erscheint die Text- statt der Zahlentastatur','Reproduktion: Tab Buchen öffnen (iPhone/Android), Mengenfeld antippen. Alle anderen Zahlenfelder (Inventur, Artikel, Konfiguration, Umlagerung, Kommissionierung) haben numeric/decimal. Wert: '+im.bookQty);
  // Dezimaleingabe mit Komma
  await go(h.p,'more');await setv(h.p,'cfgShelf','800,5');await click(h.p,'cfgSave');R('Dezimaleingabe mit Komma (800,5) wird akzeptiert oder klar abgewiesen',/gespeichert|ung/i.test(await L.txt(h.p,'cfgMessage')),await L.txt(h.p,'cfgMessage'))}
 // Kamera: Startbutton, Kamerafeld und Stoppen
 await go(h.p,'inventory');await click(h.p,'invArticleCamera');await h.p.waitForTimeout(250);const cam=await h.p.evaluate(()=>{const b=document.getElementById('invCameraBox'),s=document.getElementById('invCameraStop');const r=b.getBoundingClientRect();return {w:Math.round(r.width),vis:r.height>0,stopVis:s&&!s.classList.contains('hidden')&&s.getBoundingClientRect().height>0,hs:document.documentElement.scrollWidth}});
 R('['+label+'] Kamerafeld (Emulation/Mock) passt in die Breite, „Kamera stoppen“ sichtbar',cam.vis&&cam.w<=w&&cam.stopVis&&cam.hs<=w+1,JSON.stringify(cam));await h.p.evaluate(()=>stopCamera&&stopCamera());
 // Kommissionierung Mitarbeiteransicht + Schein
 await go(h.p,'picking');await h.p.evaluate(()=>{pickEmployee.value='Max';pickEmployee.dispatchEvent(new Event('change'))});await h.p.evaluate(()=>{pickDevice.value='Scanner 1'});await click(h.p,'pickLogin');await h.p.waitForTimeout(300);
 const wm=await h.p.evaluate(`(${MEASURE})(${touch})`);const wtxt=await h.p.evaluate(()=>document.getElementById('pickWorker').innerText.length);
 R('['+label+'] Mitarbeiteransicht Kommissionierung: kein horizontales Scrollen, nichts abgeschnitten, Inhalt vorhanden',!wm.hscroll&&!wm.over.length&&!wm.clipped.length&&wtxt>50,(wm.hscroll?'sw '+wm.sw+' ':'')+wm.over.slice(0,4).join('; ')+' '+wm.clipped.slice(0,3).join('; '));
 {const nw=wm.small.filter(x=>!seenSmall.has(w+'|'+x.replace(/ \d+×\d+$/,'').replace(/^\d+$/,'#')));if(touch&&nw.length)B('gering','['+label+'] Kommissionierung: '+nw.length+' neue(s) Bedienelement(e) < 40 px','z. B. '+nw.slice(0,6).join('; '))}
 const wk=await h.p.evaluate(()=>{const e=document.getElementById('pick-measured-weight'),a=document.querySelector('[data-pick-actual]');return {mw:e?e.getAttribute('inputmode'):null,act:a?a.getAttribute('inputmode'):null}});
 R('['+label+'] Mengen-/Gewichtsfelder der Kommissionierung: numeric/decimal-Tastatur',wk.mw==='decimal'&&wk.act==='numeric',JSON.stringify(wk));
 // Druck: Schein (Druckinhalt) bei Druckmedium prüfen
 await h.p.evaluate(()=>{const b=document.querySelector('[data-worker-action="print"]');if(b)b.click()});await h.p.waitForTimeout(250);
 await h.p.emulateMedia({media:'print'});await h.p.waitForTimeout(150);
 // Druck geht auf Papier (AirPrint/Android-Druckdienst: A4), nicht auf Viewport-Breite: Schein als A4-PDF mit Druck-CSS rendern und auswerten
 const pdf=require('path').join(L.TMP,'schein-'+w+'.pdf');await h.p.pdf({path:pdf,format:'A4',printBackground:true});
 const cp=require('child_process');const info=cp.execSync('pdfinfo '+pdf).toString();const pages=+(/Pages:\s+(\d+)/.exec(info)||[0,0])[1];const ptxt=cp.execSync('pdftotext -layout '+pdf+' -').toString();
 const pr=await h.p.evaluate(()=>{const e=document.getElementById('pickPrint');return e?{ex:true,vis:getComputedStyle(e).display!=='none',len:e.innerText.length}:{ex:false}});
 R('['+label+'] Kommissionierschein als A4-Druck (PDF-Rendering mit Druck-CSS): 1–2 Seiten, enthält Auftrag, Mitarbeiter, Positionen, Gewichtsangaben; kein abgeschnittener Text (Emulation, kein echter Drucker)',pr.ex&&pr.vis&&pr.len>400&&pages>=1&&pages<=2&&/K-1042/.test(ptxt)&&/Max/.test(ptxt)&&/M-1/.test(ptxt)&&/M-2/.test(ptxt)&&/kg/.test(ptxt),'Seiten='+pages+' Text='+ptxt.replace(/\s+/g,' ').slice(0,140));
 if(w===375)require('fs').copyFileSync(pdf,require('path').join(process.env.PDFOUT||L.TMP,'kommissionierschein-emulation.pdf'));
 await h.p.emulateMedia({media:'screen'});
 R('['+label+'] Keine JavaScript-Fehler',h.errs.length===0,h.errs.join('|'));await h.b.close()}
// Echte Geräte
N('Echtgerät: iPhone Safari (Layout, Kamera, AirPrint-Druck)','Nur Chromium-Emulation verfügbar – kein physisches Gerät. Muss manuell getestet werden.');
N('Echtgerät: Android Chrome (Layout, Kamera, Druck)','Nur Chromium-Emulation verfügbar – kein physisches Gerät.');
N('Echtgerät: Kamera-Barcode-Scan mit realen Etiketten','Kamera wird in der Emulation durch einen Mock ersetzt (Html5Qrcode); echte Erkennungsqualität/Fokus nicht prüfbar.');
N('Echtgerät: Handscanner (Tastaturkeil/Enter-Suffix)','Kein Gerät verfügbar; nur simulierte Eingabe.');
N('Echtgerät: Waage / reale Kommissionierschein-Druckausgabe','Kein Drucker/keine Waage; nur @media-print-Emulation.');
done()})().catch(e=>{console.error('SCRIPTFAIL',e);process.exit(2)});
