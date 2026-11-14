// AP5-Final – gemeinsame Hilfen für die Systemtests (Playwright/Chromium-Emulation, isolierte Testdaten je Browserkontext).
const {chromium,devices}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const BASE=process.env.BASE||'http://localhost:8123/index.html';
const K='lagerpilot_v2_7',PK='lagerpilot_pick_demo_v1',BI='lagerpilot_before_import',BL='lagerpilot_import_backups_v1';
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'ap5final-'));
// Ergebnisarten: PASS/FAIL = Erwartung erfüllt/verletzt; BEFUND = beobachtetes Verhalten/Fehler mit Schweregrad (kein Testabbruch); NICHT-DURCHFÜHRBAR = Funktion existiert nicht
function reporter(name){const c={pass:0,fail:0,bef:0,nd:0};const out=[];
 const log=l=>{console.log(l);out.push(l)};
 return {c,R:(id,ok,info)=>{ok?c.pass++:c.fail++;log((ok?'PASS ':'FAIL ')+id+(info!==undefined&&info!==''?'  | '+String(info).replace(/\s+/g,' ').slice(0,260):''))},
  B:(sev,id,info)=>{c.bef++;log('BEFUND['+sev+'] '+id+(info?'  | '+String(info).replace(/\s+/g,' ').slice(0,300):''))},
  N:(id,info)=>{c.nd++;log('NICHT-DURCHFÜHRBAR '+id+(info?'  | '+String(info).replace(/\s+/g,' ').slice(0,300):''))},
  done:()=>{log('\nGESAMT '+name+': PASS '+c.pass+' / FAIL '+c.fail+' / BEFUNDE '+c.bef+' / NICHT-DURCHFÜHRBAR '+c.nd);process.exit(c.fail?1:0)}}}
// Instanz mit leerem, eigenem Speicher. opts: {width,height,device,ctx}
async function open(opts={}){let b=null,ctx=opts.ctx;if(!ctx){b=await chromium.launch();ctx=await b.newContext(opts.device?{...devices[opts.device]}:{viewport:{width:opts.width||1100,height:opts.height||900},acceptDownloads:true});}
 const p=await ctx.newPage();p.setDefaultTimeout(20000);const h={b,ctx,p,errs:[],dlg:[],confirm:true,answers:[],downloads:[],navs:0};
 p.on('pageerror',e=>h.errs.push(e.message));p.on('framenavigated',f=>{if(f===p.mainFrame())h.navs++});
 p.on('download',async d=>{try{const f=path.join(TMP,Math.random().toString(36).slice(2)+d.suggestedFilename());await d.saveAs(f);h.downloads.push({name:d.suggestedFilename(),file:f,text:fs.readFileSync(f,'utf8')})}catch(e){h.errs.push('download '+e.message)}});
 p.on('dialog',async d=>{h.dlg.push(d.type()+':'+d.message());if(d.type()!=='confirm'){await d.accept();return}const a=h.answers.length?h.answers.shift():h.confirm;a?await d.accept():await d.dismiss()});
 await p.addInitScript(()=>{window.__prints=0;window.print=()=>{window.__prints++;window.__lastPrint=(document.getElementById('pickPrint')||{}).innerHTML};
  window.Html5Qrcode=class{constructor(id){this.id=id}async start(c,o,cb){const e=document.getElementById(this.id);if(e)e.innerHTML='<video style="width:100%"></video>';window.__cb=cb}async stop(){}async clear(){}}});
 await p.goto(BASE);await p.waitForTimeout(350);return h}
const raw=(p,k=K)=>p.evaluate(k=>localStorage.getItem(k),k);
const st=async(p,k=K)=>JSON.parse(await raw(p,k));
const txt=(p,id)=>p.evaluate(id=>(document.getElementById(id)?.textContent||'').trim(),id);
const go=async(p,t)=>{await p.evaluate(t=>tab(t),t);await p.waitForTimeout(120)};
const setv=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);if(!e)throw Error('Feld fehlt: '+id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,String(v)]);
const click=async(p,id)=>{await p.evaluate(id=>document.getElementById(id).click(),id);await p.waitForTimeout(120)};
// Artikelformular über die Oberfläche
async function saveArticle(h,a,{edit=false}={}){const p=h.p;await go(p,'articles');if(!edit)await click(p,'aClear');else await p.evaluate(c=>document.querySelector('[data-edit="'+c+'"]').click(),a.code);
 for(const [id,k] of [['aName','name'],['aCode','code'],['aBarcode','barcode'],['aUnit','unit'],['aPack','pack'],['aWeight','weight'],['aMax','max'],['aMin','min']])if(a[k]!==undefined&&(id!=='aCode'||!edit))await setv(p,id,a[k]);
 await click(p,'aSave');return txt(p,'aMessage')}
// Buchung über die Oberfläche (Bestätigungsdialog wird automatisch bestätigt)
async function book(h,{action,article,place,qty,target,note=''}){const p=h.p;await go(p,'book');await setv(p,'bookAction',action);await setv(p,'bookArticle',article);await setv(p,'bookPlace',place);if(target!==undefined)await setv(p,'bookTarget',target);await setv(p,'bookQty',qty);await setv(p,'bookNote',note);await click(p,'bookSubmit');return txt(p,'bookMessage')}
const qtyAt=(s,place,code)=>s.boxes.filter(b=>b.place===place&&b.code===code).reduce((a,b)=>a+b.qty,0);
const totalQty=(s,code)=>s.boxes.filter(b=>b.code===code).reduce((a,b)=>a+b.qty,0);
const wr=(name,obj)=>{const f=path.join(TMP,name);fs.writeFileSync(f,typeof obj==='string'?obj:JSON.stringify(obj));return f};
module.exports={chromium,devices,BASE,K,PK,BI,BL,TMP,reporter,open,raw,st,txt,go,setv,click,saveArticle,book,qtyAt,totalQty,wr};
