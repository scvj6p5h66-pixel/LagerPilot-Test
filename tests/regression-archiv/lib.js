const {chromium}=require('playwright');
exports.open=async(opts={})=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},...opts});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
 await p.addInitScript(()=>{window.__prints=[];window.__dlg=[];window.__promptAns=[];window.print=()=>{window.__prints.push(document.getElementById('pickPrint').innerHTML)};
  window.alert=m=>window.__dlg.push('alert:'+m);window.confirm=m=>{window.__dlg.push('confirm:'+String(m).slice(0,50));return true};
  window.prompt=(m,d)=>{window.__dlg.push('prompt');return window.__promptAns.length?window.__promptAns.shift():d}});
 await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(600);
 const ev=f=>p.evaluate(f);
 const go=async n=>{await p.evaluate(n=>{tab(n)},n)};
 const click=async s=>{const r=await p.evaluate(s=>{const e=document.querySelector(s);if(!e)return 'NOEL';if(e.disabled)return 'DISABLED';e.click();return 'ok'},s);return r};
 const setv=async(s,v)=>p.evaluate(([s,v])=>{const e=document.querySelector(s);if(!e)return 'NOEL';e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'},[s,v]);
 const dlg=async()=>{const d=await p.evaluate(()=>{const x=window.__dlg;window.__dlg=[];return x});return d};
 return {b,p,errs,ev,go,click,setv,dlg};
};
