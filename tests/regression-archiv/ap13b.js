const {open}=require('./lib');
const setf=(p,id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},[id,v]);
(async()=>{const h=await open();
await h.p.evaluate(()=>{transaction(s=>{Object.assign(s.config,{shelf:800,bay:2000,palletMax:1000,tare:25});s.items.push({code:'X1',name:'Normal',barcode:'',unit:'STK',pack:1,weight:2,max:100,min:3})})});
// per UI angelegt
for(const c of ['__proto__','toString','valueOf']){await h.go('articles');for(const [k,x] of Object.entries({aName:'Res '+c,aCode:c,aBarcode:'',aUnit:'STK',aPack:'1',aWeight:'2',aMax:'50',aMin:'1'}))await setf(h.p,k,x);await h.p.evaluate(()=>aSave.click());console.log('Anlegen',c,'→',await h.p.evaluate(()=>aMessage.textContent.trim()))}
console.log('Items:',await h.p.evaluate(()=>state.items.map(a=>a.code).join(',')));
// Wareneingang auf solche Artikel
await h.go('book');
for(const c of ['__proto__','toString']){await setf(h.p,'bookArticle',c);for(const [k,x] of Object.entries({bookAction:'in',bookPlace:'H4A-1-'+(c==='toString'?2:1),bookQty:'5'}))await setf(h.p,k,x);await h.p.evaluate(()=>bookSubmit.click());await h.dlg();console.log('Wareneingang',c,'→',await h.p.evaluate(()=>bookMessage.textContent.trim().slice(0,80)),'| select value',await h.p.evaluate(()=>bookArticle.value))}
for(const t of ['home','stock','inventory','more','picking','articles','book']){await h.go(t)}
console.log('Boxen:',JSON.stringify(await h.p.evaluate(()=>state.boxes.map(b=>[b.code,b.place,b.qty]))));
console.log('valid:',await h.p.evaluate(()=>valid(JSON.parse(JSON.stringify(state)))), 'Prototype ok:',await h.p.evaluate(()=>({}).toString===Object.prototype.toString&&Object.getPrototypeOf({})===Object.prototype));
console.log('Fehler:',h.errs.join('|').slice(0,300)||'keine');await h.b.close()})();
