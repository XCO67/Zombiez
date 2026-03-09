
// ─── DAMAGE NUMBERS ───────────────────────────────────────────────────────────
const dmgNums = [];
function spawnDmgNum(x,y,amount,color='#ff4444') {
  dmgNums.push({x,y,amount,color,life:55,maxLife:55});
}
function updateDmgNums() {
  for (let i=dmgNums.length-1;i>=0;i--){dmgNums[i].y-=.65;dmgNums[i].life--;if(dmgNums[i].life<=0)dmgNums.splice(i,1);}
}
function drawDmgNums() {
  const fs=Math.round(TW*.48);
  dmgNums.forEach(d=>{
    const a=d.life/d.maxLife;
    const sx=d.x-camX, sy=d.y-camY;
    ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`bold ${fs}px sans-serif`;
    ctx.fillStyle='#000'; ctx.fillText(d.amount,sx+1,sy+1);
    ctx.fillStyle=d.color; ctx.fillText(d.amount,sx,sy);
    ctx.restore();
  });
}
