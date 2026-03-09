
// ─── TILE RENDERERS ───────────────────────────────────────────────────────────
function variant(r, c) { return (Math.sin(r*17.31+c*31.71)*0.5+0.5)*11|0; }

function drawWall(r, c) {
  const x=c*TW,y=r*TH,bH=TH*0.36,bW=TW*0.55,gY=r*TH,gX=c*TW;
  ctx.fillStyle='#16122a'; ctx.fillRect(x,y,TW,TH);
  const r0=Math.floor(gY/bH),r1=Math.ceil((gY+TH)/bH);
  for (let br=r0;br<=r1;br++) {
    const byW=br*bH,byL=byW-gY,xOff=(br&1)?bW*.5:0;
    const c0=Math.floor((gX-xOff)/bW),c1=Math.ceil((gX+TW-xOff)/bW);
    for (let bc=c0;bc<=c1;bc++) {
      const bxL=bc*bW+xOff-gX;
      const cx1=Math.max(0,bxL+1),cy1=Math.max(0,byL+1);
      const cx2=Math.min(TW,bxL+bW-1),cy2=Math.min(TH,byL+bH-1);
      if (cx2<=cx1||cy2<=cy1) continue;
      ctx.fillStyle='#1f1b35'; ctx.fillRect(x+cx1,y+cy1,cx2-cx1,cy2-cy1);
      ctx.fillStyle='#2e274a'; ctx.fillRect(x+cx1,y+cy1,cx2-cx1,1);
      ctx.fillStyle='#27204a'; ctx.fillRect(x+cx1,y+cy1,1,cy2-cy1);
      ctx.fillStyle='#0f0c1e'; ctx.fillRect(x+cx1,y+cy2-1,cx2-cx1,1);
    }
  }
  ctx.fillStyle='rgba(255,255,255,0.035)'; ctx.fillRect(x,y,TW,2);
}

function drawFloor(r,c,type) {
  const x=c*TW,y=r*TH,v=variant(r,c);
  let h=248,s=13,L=26+v;
  if (type===T.SPAWN) { h=0; s=55; L=15+(v*.4|0); }
  if (type===T.FLOOR2) { h=270; s=28; L=14+(v*.5|0); }
  ctx.fillStyle=`hsl(${h},${s}%,${L}%)`; ctx.fillRect(x,y,TW,TH);
  ctx.fillStyle=`hsl(${h},${s-2}%,${L+6}%)`; ctx.fillRect(x+1,y+1,TW-2,TH-2);
  ctx.fillStyle=`hsl(${h},${s}%,${L+11}%)`; ctx.fillRect(x+1,y+1,TW-2,1); ctx.fillRect(x+1,y+1,1,TH-2);
  ctx.fillStyle=`hsl(${h},${s}%,${L-6}%)`; ctx.fillRect(x+1,y+TH-2,TW-2,1); ctx.fillRect(x+TW-2,y+1,1,TH-2);
  if (type===T.SPAWN) { ctx.strokeStyle='rgba(190,45,45,0.55)'; ctx.lineWidth=1; ctx.strokeRect(x+.5,y+.5,TW-1,TH-1); }
  if (type===T.FLOOR2) {
    // Dark runic cracks
    const v2=variant(r+7,c+3);
    ctx.strokeStyle=`rgba(${120+v2*3},0,${180+v2*2},0.22)`; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(x+v2%TW,y+TH*.3); ctx.lineTo(x+TW-v2%8,y+TH*.7);
    ctx.moveTo(x+TW*.2,y+(v2*3)%TH); ctx.lineTo(x+TW*.75,y+TH-(v2*2)%12);
    ctx.stroke();
  }
}

function drawPillar(r,c) {
  const x=c*TW,y=r*TH;
  ctx.fillStyle='#242032'; ctx.fillRect(x,y,TW,TH);
  ctx.fillStyle='#3b3054'; ctx.fillRect(x+2,y+2,TW-4,TH-4);
  ctx.fillStyle='#5c4a7e'; ctx.fillRect(x+2,y+2,TW-4,2); ctx.fillRect(x+2,y+2,2,TH-4);
  ctx.fillStyle='#18132c'; ctx.fillRect(x+TW-4,y+4,2,TH-6); ctx.fillRect(x+4,y+TH-4,TW-6,2);
  ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(x+4,y+4,TW-8,TH-8);
}

function drawDoor(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  // Floor base underneath
  drawFloor(r,c,T.FLOOR);
  // Plank body
  const nP=4;
  for(let i=0;i<nP;i++){
    const py=y+i*(TH/nP)+1, ph=TH/nP-2;
    const shade=i%2===0?'#5a2e10':'#6b3a18';
    ctx.fillStyle=shade; ctx.fillRect(x+2,py,TW-4,ph);
    // Wood grain lines
    ctx.fillStyle='rgba(255,200,120,0.06)'; ctx.fillRect(x+2,py+1,TW-4,1);
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(x+2,py+ph-1,TW-4,1);
    // Grain variation
    const gx=x+4+(v*3%((TW-8)|1));
    ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(gx,py+1,1,ph-2);
  }
  // Cross brace (X pattern)
  ctx.save(); ctx.globalAlpha=0.55; ctx.strokeStyle='#8b5e28'; ctx.lineWidth=Math.max(1,TW*.06);
  ctx.beginPath(); ctx.moveTo(x+3,y+3); ctx.lineTo(x+TW-3,y+TH-3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+TW-3,y+3); ctx.lineTo(x+3,y+TH-3); ctx.stroke();
  ctx.restore();
  // Metal bolt studs at corners + center
  ctx.fillStyle='#999';
  [[.15,.12],[.85,.12],[.15,.88],[.85,.88],[.5,.5]].forEach(([ox,oy])=>{
    ctx.beginPath(); ctx.arc(x+ox*TW,y+oy*TH,TW*.055,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#bbb'; ctx.beginPath(); ctx.arc(x+ox*TW-TW*.015,y+oy*TH-TH*.015,TW*.02,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#999';
  });
  // Yellow price glow on top plank
  ctx.save(); ctx.globalAlpha=0.18;
  ctx.fillStyle='#ffd700'; ctx.fillRect(x+2,y+1,TW-4,TH/nP-2);
  ctx.restore();
}

function drawDoorPrompts() {
  const tt=performance.now()/1000;
  DOORS.forEach(door=>{
    if(door.unlocked) return;
    const dist=Math.hypot(player.cx-door.cx, player.cy-door.cy);
    // Draw glow on door tiles always
    door.tiles.forEach(({r,c})=>{
      const px=c*TW+TW*.5, py=r*TH+TH*.5;
      const pulse=Math.sin(tt*2.5+r)*.4+.6;
      ctx.save(); ctx.globalAlpha=0.25*pulse;
      const g=ctx.createRadialGradient(px,py,0,px,py,TW*.9);
      g.addColorStop(0,'rgba(255,200,60,0.9)'); g.addColorStop(1,'rgba(255,100,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,TW*.9,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
    if(dist>3) return;
    // Interaction prompt above door center
    const wx=(door.cx+.5)*TW, wy=door.cy*TH-TH*1.8-Math.sin(tt*2)*TH*.08;
    const canAfford=player.money>=door.cost;
    const alpha=Math.min(1,(3-dist)/1.5);
    ctx.save(); ctx.globalAlpha=alpha;
    // Badge background
    const bw=TW*6, bh=TH*1.55, bx=wx-bw/2, by=wy-bh/2;
    ctx.fillStyle='rgba(0,0,0,0.75)';
    roundRect(ctx,bx,by,bw,bh,8,true,false);
    ctx.strokeStyle=canAfford?'rgba(255,200,60,0.6)':'rgba(255,60,60,0.4)'; ctx.lineWidth=1.5;
    roundRect(ctx,bx,by,bw,bh,8,false,true);
    // Name
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`bold ${Math.round(TH*.3)}px Segoe UI`;
    ctx.fillText('[E]  Unlock: '+door.name, wx, by+bh*.32);
    // Price
    ctx.font=`${Math.round(TH*.25)}px Segoe UI`;
    ctx.fillStyle=canAfford?'#ffd700':'#ff5555';
    ctx.fillText(`$${door.cost}  ${canAfford?'— can afford':'— need more $'}`, wx, by+bh*.72);
    ctx.restore();
  });
}

function drawWallShadows() {
  for (let r=0;r<MAP_H;r++) for (let c=0;c<MAP_W;c++) {
    if (MAP[r][c]===T.WALL) continue;
    const x=c*TW,y=r*TH;
    if (r>0&&MAP[r-1][c]===T.WALL){
      const g=ctx.createLinearGradient(x,y,x,y+TH*.6);
      g.addColorStop(0,'rgba(0,0,0,0.65)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(x,y,TW,TH*.6);
    }
    if (c>0&&MAP[r][c-1]===T.WALL){
      const g=ctx.createLinearGradient(x,y,x+TW*.38,y);
      g.addColorStop(0,'rgba(0,0,0,0.38)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(x,y,TW*.38,TH);
    }
    if (c<MAP_W-1&&MAP[r][c+1]===T.WALL){
      const g=ctx.createLinearGradient(x+TW,y,x+TW*.75,y);
      g.addColorStop(0,'rgba(0,0,0,0.28)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(x+TW*.75,y,TW*.25,TH);
    }
  }
}

function drawTorch(r,c,flicker,color,opacity) {
  const op = (opacity !== undefined ? opacity : 1.0);
  const x=c*TW+TW*.5,y=r*TH+TH*.5,rad=TW*.15+flicker*TW*.06;
  let cr=255,cg=150,cb=40;
  if (color && color.length>=7) {
    cr=parseInt(color.slice(1,3),16)||255;
    cg=parseInt(color.slice(3,5),16)||150;
    cb=parseInt(color.slice(5,7),16)||40;
  }
  const bright=`rgba(${Math.min(255,cr+80)},${Math.min(255,cg+80)},${Math.min(255,cb+60)},${op})`;
  const mid=`rgba(${cr},${cg},${cb},${(0.9*op).toFixed(2)})`;
  const edge=`rgba(${Math.round(cr*.6)},${Math.round(cg*.3)},${Math.round(cb*.2)},0)`;
  const g=ctx.createRadialGradient(x,y,0,x,y,rad*2.8);
  g.addColorStop(0,bright); g.addColorStop(.35,mid); g.addColorStop(1,edge);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad*2.8,0,Math.PI*2);ctx.fill();
}
