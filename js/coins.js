
// ─── COINS ────────────────────────────────────────────────────────────────────
const COINS = [];
function spawnCoin(cx, cy, amount) {
  COINS.push({ cx, cy, amount, bob:Math.random()*Math.PI*2, life:300 });
}
const MAGNET_RADIUS = 8;   // tiles
const MAGNET_SPEED  = 0.14; // tiles/frame
function updateCoins() {
  for (let i=COINS.length-1;i>=0;i--) {
    const c=COINS[i]; c.bob+=0.08; c.life--;
    // Magnet: pull coins within radius toward player
    const magnetActive = activePerkTimers.magnet > 0 || player.perks.magnet > 0;
    const magnetRadius = player.perks.magnet > 0 ? MAGNET_RADII[player.perks.magnet] : MAGNET_RADII[0];
    if (magnetActive) {
      const dx=player.cx-c.cx, dy=player.cy-c.cy;
      const dist=Math.hypot(dx,dy);
      if (dist < magnetRadius && dist > 0.01) {
        c.cx += (dx/dist)*MAGNET_SPEED;
        c.cy += (dy/dist)*MAGNET_SPEED;
      }
    }
    const dist=Math.hypot(player.cx-c.cx,player.cy-c.cy);
    if (dist<0.75) {
      const earned = activePerkTimers.doublePoints>0 ? c.amount*2 : c.amount;
      player.money += earned;
      player.goldEarned += earned;
      // Show "2x" pop if double points active
      if (activePerkTimers.doublePoints>0)
        spawnDmgNum(c.cx*TW, c.cy*TH-TH*.5, earned, '#ffd700');
      COINS.splice(i,1); continue;
    }
    if (c.life<=0) COINS.splice(i,1);
  }
}
function drawCoins() {
  COINS.forEach(c=>{
    const px=c.cx*TW, py=c.cy*TH+Math.sin(c.bob)*TH*.08;
    const r=Math.min(TW,TH)*.17;
    const a=Math.min(1,c.life/40);
    ctx.save(); ctx.globalAlpha=a;
    // Coin glow — golden or purple tint if double points active
    const gCol = activePerkTimers.doublePoints>0 ? 'rgba(255,180,255,0.55)' : 'rgba(255,220,50,0.5)';
    const g=ctx.createRadialGradient(px,py,0,px,py,r*2.2);
    g.addColorStop(0,gCol); g.addColorStop(1,'rgba(255,180,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,r*2.2,0,Math.PI*2); ctx.fill();
    // Coin body
    ctx.fillStyle = activePerkTimers.doublePoints>0 ? '#ffaaff' : '#f5c518';
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffe060';
    ctx.beginPath(); ctx.arc(px-r*.25,py-r*.25,r*.4,0,Math.PI*2); ctx.fill();
    // Amount label
    if (c.amount>=5) {
      ctx.fillStyle='#000'; ctx.font=`bold ${Math.round(TH*.28)}px sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('$'+c.amount, px, py+r*1.9);
    }
    ctx.restore();
  });
}
