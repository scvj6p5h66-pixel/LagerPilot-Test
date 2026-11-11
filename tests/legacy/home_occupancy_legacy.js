// Verbatim-Logik der Belegungszählung aus Commit 8fde636 (renderHomeOccupancy, nur der Zählteil, ohne Simulation), umbenannt.
// Referenz für tests/unit/suggestions-equivalence.js. NICHT in die Anwendung einbinden.
function homeOccupancyCountsLegacy(){
 const counts={free:0,occupied:0,locked:0};
 for(const [hall,racks] of [['H4A',22],['H4B',18]])for(let r=1;r<=racks;r++)for(let n=1;n<=162;n++){
  const p=hall+'-'+r+'-'+n;
  const st=state.places[p]?.status,b=occupied(state,p);if(st==='locked'||st==='reserved'||st==='fixed'||b.some(x=>x.blocked>0))counts.locked++;else if(b.length)counts.occupied++;else counts.free++;
 }
 return counts;
}
