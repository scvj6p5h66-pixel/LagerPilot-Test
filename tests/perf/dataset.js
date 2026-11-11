// Deterministische Testdaten für Leistungs- und Äquivalenztests (SA-14).
// Gleiche Eingabe (n, scenario, seed) ergibt immer exakt dieselben Artikel und Boxen.
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const SCENARIOS={
  // Wenige Artikel, viele Boxen je Artikel: ungünstigster Fall für paarweise Vergleiche.
  // Ein Artikel kann höchstens eine Box je Lagerplatz haben (valid() verbietet Duplikate),
  // daher werden für n > Platzanzahl mehrere Artikel verwendet.
  worst:(n,P)=>Math.max(1,Math.ceil(n/P)),
  multi:()=>50,      // 50 Artikel
  many:()=>1000      // 1.000 Artikel (viele kleine Artikelgruppen)
};
function build(n,scenario,places,seed=1){
  const rnd=mulberry32(seed),A=Math.min(SCENARIOS[scenario](n,places.length),n);
  const items=[];for(let i=0;i<A;i++)items.push({code:'T'+String(i+1).padStart(4,'0'),name:'Testartikel '+(i+1),barcode:'',unit:'STK',pack:1,weight:1,max:100,min:null});
  const boxes=[];const used=new Set();let i=0,guard=0;
  while(boxes.length<n&&guard++<n*50){
    const a=items[i%A],pl=places[Math.floor(rnd()*places.length)],key=pl+'|'+a.code;i++;
    if(used.has(key))continue;used.add(key);
    boxes.push({id:'b'+boxes.length,place:pl,code:a.code,qty:1+Math.floor(rnd()*70),blocked:0});
  }
  if(boxes.length!==n)throw Error('Datensatz konnte nicht mit '+n+' Boxen erzeugt werden ('+boxes.length+')');
  return {items,boxes};
}
module.exports={build,mulberry32,SCENARIOS};
