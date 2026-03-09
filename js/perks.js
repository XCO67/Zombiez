
// ─── PERKS ────────────────────────────────────────────────────────────────────
const PERK_DROP_CHANCE = 0.12; // 12% per kill
const PERK_DURATION    = 900;  // 15 seconds at 60fps
const DROPPED_PERKS    = [];
const activePerkTimers = { doublePoints:0, magnet:0 };

function spawnPerk(cx, cy) {
  if (Math.random() > PERK_DROP_CHANCE) return;
  const type = Math.random() < 0.5 ? 'doublePoints' : 'magnet';
  DROPPED_PERKS.push({ cx, cy, type, bob:Math.random()*Math.PI*2, life:600 }); // 10s on ground
}

function updatePerks() {
  if (activePerkTimers.doublePoints > 0) activePerkTimers.doublePoints--;
  if (activePerkTimers.magnet       > 0) activePerkTimers.magnet--;
  for (let i=DROPPED_PERKS.length-1;i>=0;i--) {
    const p=DROPPED_PERKS[i];
    p.bob += 0.07; p.life--;
    if (p.life<=0) { DROPPED_PERKS.splice(i,1); continue; }
    if (Math.hypot(player.cx-p.cx, player.cy-p.cy) < 0.7) {
      activePerkTimers[p.type] = PERK_DURATION;
      DROPPED_PERKS.splice(i,1);
    }
  }
}

function drawPerks() {
  DROPPED_PERKS.forEach(p => {
    const px=p.cx*TW, py=p.cy*TH + Math.sin(p.bob)*TH*.14;
    const sz=Math.min(TW,TH)*.5;
    const a=Math.min(1, p.life/60);
    const tt=performance.now()/1000;
    const pulse=Math.sin(tt*3)*.5+.5;
    ctx.save(); ctx.globalAlpha=a;

    if (p.type==='doublePoints') {
      // Golden glow
      const g=ctx.createRadialGradient(px,py,0,px,py,sz*2.4);
      g.addColorStop(0,`rgba(255,210,0,${0.45+pulse*.2})`);
      g.addColorStop(1,'rgba(255,150,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*2.4,0,Math.PI*2); ctx.fill();
      // Circle bg
      ctx.fillStyle='#1c1200';
      ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=`rgba(255,215,0,${0.7+pulse*.3})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.stroke();
      // "2×" label
      ctx.fillStyle=`rgba(255,220,40,${0.9+pulse*.1})`;
      ctx.font=`bold ${Math.round(sz*1.1)}px Segoe UI`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='#ffcc00'; ctx.shadowBlur=8;
      ctx.fillText('2×', px, py+sz*.06);
    } else {
      // Magnet — blue glow
      const g=ctx.createRadialGradient(px,py,0,px,py,sz*2.4);
      g.addColorStop(0,`rgba(40,160,255,${0.45+pulse*.2})`);
      g.addColorStop(1,'rgba(0,80,200,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*2.4,0,Math.PI*2); ctx.fill();
      // Circle bg
      ctx.fillStyle='#000d18';
      ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=`rgba(60,180,255,${0.7+pulse*.3})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.stroke();
      // Horseshoe U shape
      const arc=sz*.42, lw=sz*.28;
      ctx.lineCap='round';
      // U arc
      ctx.strokeStyle=`rgba(80,190,255,${0.9+pulse*.1})`; ctx.lineWidth=lw;
      ctx.shadowColor='#44aaff'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(px, py-sz*.05, arc, Math.PI, 0); ctx.stroke();
      // Left pole (red N)
      ctx.strokeStyle='#ff4455'; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(px-arc, py-sz*.05); ctx.lineTo(px-arc, py+sz*.38); ctx.stroke();
      // Right pole (blue S)
      ctx.strokeStyle='#4466ff'; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(px+arc, py-sz*.05); ctx.lineTo(px+arc, py+sz*.38); ctx.stroke();
    }
    ctx.restore();
  });
}
