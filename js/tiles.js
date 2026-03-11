
// ─── TILE RENDERERS ───────────────────────────────────────────────────────────
let _tt = 0; // set once per frame by render.js — avoids performance.now() per tile
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
    ctx.moveTo(x+(v2%11)/11*TW,y+TH*.3); ctx.lineTo(x+TW*(1-(v2%8)/8*0.15),y+TH*.7);
    ctx.moveTo(x+TW*.2,y+(v2*3%11)/11*TH); ctx.lineTo(x+TW*.75,y+TH*(1-(v2*2%11)/11*0.2));
    ctx.stroke();
  }
}

function drawColorFloor(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  const cf = COLOR_FLOORS.find(f=>f[0]===r&&f[1]===c);
  const hex = cf?.[2] || '#44aacc';
  const cr=parseInt(hex.slice(1,3),16)||68, cg=parseInt(hex.slice(3,5),16)||170, cb=parseInt(hex.slice(5,7),16)||204;
  const bv = 0.45 + v*0.02;
  const r0=Math.round(cr*bv),  g0=Math.round(cg*bv),  b0=Math.round(cb*bv);
  const r1=Math.round(cr*(bv+0.08)), g1=Math.round(cg*(bv+0.08)), b1=Math.round(cb*(bv+0.08));
  const rh=Math.min(255,Math.round(cr*(bv+0.22))), gh=Math.min(255,Math.round(cg*(bv+0.22))), bh=Math.min(255,Math.round(cb*(bv+0.22)));
  const rd=Math.round(cr*(bv-0.12)), gd=Math.round(cg*(bv-0.12)), bd=Math.round(cb*(bv-0.12));
  ctx.fillStyle=`rgb(${r0},${g0},${b0})`; ctx.fillRect(x,y,TW,TH);
  ctx.fillStyle=`rgb(${r1},${g1},${b1})`; ctx.fillRect(x+1,y+1,TW-2,TH-2);
  ctx.fillStyle=`rgb(${rh},${gh},${bh})`; ctx.fillRect(x+1,y+1,TW-2,1); ctx.fillRect(x+1,y+1,1,TH-2);
  ctx.fillStyle=`rgb(${rd},${gd},${bd})`; ctx.fillRect(x+1,y+TH-2,TW-2,1); ctx.fillRect(x+TW-2,y+1,1,TH-2);
  // Subtle color shimmer lines
  const v2=variant(r+5,c+2);
  ctx.fillStyle=`rgba(${rh},${gh},${bh},0.12)`; ctx.fillRect(x+(v2%11)/11*TW,y+TH*.3,1,TH*.4);
}

function drawLavaFloor(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  const pulse=Math.sin(_tt*1.4+r*0.9+c*1.1)*0.5+0.5;
  // Dark cooled-lava base + pulsing midtone (solid fill, no gradient)
  const rb=40+pulse*60|0, gb=pulse*20|0;
  ctx.fillStyle=`rgb(${rb},${gb},0)`; ctx.fillRect(x,y,TW,TH);
  ctx.fillStyle='#200500'; ctx.fillRect(x+2,y+2,TW-4,TH-4);
  // Glowing crack lines — bright color only, no shadowBlur
  const crA=0.70+pulse*0.30;
  const crG=140+pulse*80|0;
  ctx.strokeStyle=`rgba(255,${crG},0,${crA})`; ctx.lineWidth=Math.max(1.5,TW*0.055);
  ctx.beginPath();
  ctx.moveTo(x+(v*6%11)/11*TW, y+TH*0.18);
  ctx.lineTo(x+TW*0.50+(v%5-2)*TW*0.04, y+TH*0.52);
  ctx.lineTo(x+TW*(1-(v*4%11)/11*0.22), y+TH*0.82);
  ctx.stroke();
  // Second crack (thinner)
  ctx.strokeStyle=`rgba(255,${crG+30|0},0,${crA*0.65})`; ctx.lineWidth=Math.max(1,TW*0.03);
  ctx.beginPath();
  ctx.moveTo(x+TW*0.15, y+(v*9%11)/11*TH);
  ctx.lineTo(x+TW*0.55+(v%3)*TW*0.04, y+TH*0.52);
  ctx.lineTo(x+TW*0.80, y+TH*(1-(v*3%11)/11*0.22));
  ctx.stroke();
  // Bright molten core dot
  ctx.fillStyle=`rgba(255,${220+pulse*35|0},${60+pulse*60|0},0.9)`;
  ctx.beginPath(); ctx.arc(x+TW*0.5,y+TH*0.5,TW*0.07,0,Math.PI*2); ctx.fill();
}

function drawIceFloor(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  const shimmer=Math.sin(_tt*2.0+r*1.3+c*0.7)*0.5+0.5;
  // Deep ice base (two solid fills, no gradient)
  ctx.fillStyle='#0a1828'; ctx.fillRect(x,y,TW,TH);
  const ib=30+shimmer*18|0;
  ctx.fillStyle=`rgb(${10+ib},${25+ib*2},${50+ib*3})`; ctx.fillRect(x+1,y+1,TW-2,TH-2);
  // Crystal crack lines — bright color only, no shadowBlur
  const ca=0.50+shimmer*0.22;
  ctx.strokeStyle=`rgba(160,225,255,${ca})`; ctx.lineWidth=Math.max(1,TW*0.04);
  ctx.beginPath();
  ctx.moveTo(x+(v*7%11)/11*TW, y+TH*0.15);
  ctx.lineTo(x+TW*0.50, y+TH*0.52);
  ctx.lineTo(x+TW*(1-(v*3%11)/11*0.18), y+TH*0.88);
  ctx.stroke();
  ctx.strokeStyle=`rgba(200,240,255,${ca*0.55})`; ctx.lineWidth=Math.max(1,TW*0.025);
  ctx.beginPath();
  ctx.moveTo(x+TW*0.30, y+(v*5%11)/11*TH);
  ctx.lineTo(x+TW*0.50, y+TH*0.52);
  ctx.lineTo(x+TW*0.85, y+TH*(1-(v*8%11)/11*0.18));
  ctx.stroke();
  // Frost sparkle highlight (solid rects, no gradient)
  const fa=0.12+shimmer*0.08;
  ctx.fillStyle=`rgba(220,245,255,${fa})`; ctx.fillRect(x+1,y+1,TW-2,2);
  ctx.fillStyle=`rgba(220,245,255,${fa*0.5})`; ctx.fillRect(x+1,y+1,2,TH-2);
  // Dark edges
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(x+1,y+TH-2,TW-2,1); ctx.fillRect(x+TW-2,y+1,1,TH-2);
}

function drawAncientStone(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  // Dark weathered stone base
  ctx.fillStyle='#151210'; ctx.fillRect(x,y,TW,TH);
  const shade=v>6?'#231e18':'#1e1a14';
  ctx.fillStyle=shade; ctx.fillRect(x+1,y+1,TW-2,TH-2);
  // Large flagstone grout lines
  ctx.strokeStyle='rgba(0,0,0,0.60)'; ctx.lineWidth=1.5;
  const half=v>5;
  ctx.beginPath();
  ctx.moveTo(x,y+TH*0.5); ctx.lineTo(x+TW,y+TH*0.5); ctx.stroke();
  ctx.beginPath();
  if(half){ ctx.moveTo(x+TW*0.5,y); ctx.lineTo(x+TW*0.5,y+TH*0.5); }
  else     { ctx.moveTo(x+TW*0.5,y+TH*0.5); ctx.lineTo(x+TW*0.5,y+TH); }
  ctx.stroke();
  // Worn stone highlight on top faces
  ctx.fillStyle='rgba(200,175,120,0.07)'; ctx.fillRect(x+2,y+2,TW-4,1);
  ctx.fillStyle='rgba(200,175,120,0.04)'; ctx.fillRect(x+2,y+2,1,TH*0.5-3);
  ctx.fillStyle='rgba(200,175,120,0.04)'; ctx.fillRect(x+2,y+TH*0.5+2,1,TH*0.5-4);
  // Moss patches
  const mx1=x+(v*5+1)%((TW*0.6)|1)+TW*0.1, my1=y+(v*7+2)%((TH*0.4)|1)+TH*0.05;
  ctx.fillStyle='rgba(38,72,18,0.50)';
  ctx.beginPath(); ctx.ellipse(mx1,my1,TW*0.13,TH*0.09,v*0.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(55,100,25,0.30)';
  ctx.beginPath(); ctx.ellipse(mx1-TW*0.05,my1+TH*0.04,TW*0.06,TH*0.05,0,0,Math.PI*2); ctx.fill();
  // Engraved rune mark (every 3rd tile)
  if (v%3===0) {
    ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle='#aa88ff'; ctx.lineWidth=1;
    const rx=x+TW*0.5, ry=y+TH*0.75, rs=TH*0.12;
    ctx.beginPath();
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2; ctx.lineTo(rx+Math.cos(a)*rs,ry+Math.sin(a)*rs);}
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
}

function drawWoodFloor(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  // Warm walnut plank base
  ctx.fillStyle='#2e1a0a'; ctx.fillRect(x,y,TW,TH);
  const plankCol=v>6?'#3d2412':'#452a14';
  ctx.fillStyle=plankCol; ctx.fillRect(x+1,y+1,TW-2,TH-2);
  // Horizontal planks — 3 bands
  ctx.save();
  const nGrain=3;
  for(let i=0;i<nGrain;i++){
    const gy=y+((i+0.5)/nGrain)*TH;
    ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x,gy); ctx.lineTo(x+TW,gy); ctx.stroke();
  }
  // Wood grain detail lines
  for(let i=0;i<4;i++){
    const gx2=x+2+(v*3+i*7)%Math.max(1,TW-4);
    ctx.strokeStyle='rgba(0,0,0,0.13)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(gx2,y+1); ctx.lineTo(gx2+v%4,y+TH-1); ctx.stroke();
  }
  // Plank seam (vertical join every tile boundary)
  ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(x+1,y); ctx.lineTo(x+1,y+TH); ctx.stroke();
  ctx.restore();
  // Warm toplight highlight
  ctx.fillStyle='rgba(255,195,100,0.06)'; ctx.fillRect(x+2,y+1,TW-4,1);
  // Dark shadow bottom
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(x+1,y+TH-2,TW-2,1);
}

function drawMossyFloor(r, c) {
  const x=c*TW, y=r*TH, v=variant(r,c);
  // Stable 0-1 fractions derived only from v (not TW/TH) so zoom doesn't shift patches
  const f1=(v*5%11)/11, f2=(v*7%11)/11, f3=(v*9%11)/11;
  const f4=(v*3%11)/11, f5=(v*6%11)/11, f6=(v*4%11)/11;
  // Damp dark stone base
  ctx.fillStyle='#131710'; ctx.fillRect(x,y,TW,TH);
  ctx.fillStyle='#1b2117'; ctx.fillRect(x+1,y+1,TW-2,TH-2);
  // Moss blob patches — positions as stable fractions of tile size
  const patches=[
    {ox:f1*TW, oy:f2*TH, ra:TW*0.22, rb:TH*0.17, col:'rgba(30,75,15,0.72)'},
    {ox:f3*TW, oy:f4*TH, ra:TW*0.16, rb:TH*0.13, col:'rgba(45,95,20,0.60)'},
    {ox:f5*TW, oy:f6*TH, ra:TW*0.12, rb:TH*0.10, col:'rgba(60,110,28,0.50)'},
  ];
  patches.forEach(p=>{
    ctx.fillStyle=p.col;
    ctx.beginPath(); ctx.ellipse(x+p.ox,y+p.oy,p.ra,p.rb,v*0.3,0,Math.PI*2); ctx.fill();
  });
  // Bright moss highlight
  ctx.fillStyle='rgba(80,160,35,0.15)';
  ctx.beginPath(); ctx.ellipse(x+f1*TW,y+f2*TH,TW*0.10,TH*0.08,0,0,Math.PI*2); ctx.fill();
  // Subtle stone crack
  ctx.strokeStyle='rgba(0,0,0,0.30)'; ctx.lineWidth=1;
  ctx.strokeRect(x,y,TW,TH);
  // Damp sheen
  ctx.fillStyle='rgba(100,180,50,0.07)'; ctx.fillRect(x+1,y+1,TW-2,1);
}

function drawSpiderSpawnTile(r, c) {
  drawFloor(r, c, T.FLOOR);
  const x = c * TW, y = r * TH;
  const cx2 = x + TW / 2, cy2 = y + TH / 2;
  const rad = Math.min(TW, TH) * 0.38;
  ctx.save();
  ctx.globalAlpha = 0.52;
  // Web ring
  ctx.strokeStyle = '#005500';
  ctx.lineWidth = Math.max(1, TW * 0.09);
  ctx.beginPath(); ctx.arc(cx2, cy2, rad, 0, Math.PI * 2); ctx.stroke();
  // Radial web lines
  ctx.strokeStyle = 'rgba(0,130,0,0.55)';
  ctx.lineWidth = Math.max(1, TW * 0.04);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    ctx.lineTo(cx2 + Math.cos(a) * rad, cy2 + Math.sin(a) * rad);
    ctx.stroke();
  }
  // Second inner ring
  ctx.strokeStyle = 'rgba(0,110,0,0.40)';
  ctx.lineWidth = Math.max(1, TW * 0.03);
  ctx.beginPath(); ctx.arc(cx2, cy2, rad * 0.55, 0, Math.PI * 2); ctx.stroke();
  // Center dot
  ctx.fillStyle = 'rgba(0,180,0,0.65)';
  ctx.beginPath(); ctx.arc(cx2, cy2, rad * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
  const tt=_tt;
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

// ─── DECORATIONS ──────────────────────────────────────────────────────────────
function drawDecorations() {
  const tt = _tt;
  DECORATIONS.forEach(d => {
    const px = d.cx * TW, py = d.cy * TH;
    ctx.save();
    switch (d.type) {
      case 'barrel':    _drawBarrel(px, py); break;
      case 'candle':    _drawCandle(px, py, tt); break;
      case 'brazier':   _drawBrazier(px, py, tt); break;
      case 'bones':     _drawBones(px, py); break;
      case 'bloodstain':_drawBloodStain(px, py); break;
      case 'rune':      _drawRune(px, py, tt); break;
      case 'lantern':   _drawLantern(px, py, tt); break;
      case 'web':       _drawWeb(px, py); break;
    }
    ctx.restore();
  });
}

function _drawBarrel(px, py) {
  const sz = TW * 0.36;
  // Shadow
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px, py + sz * 0.88, sz * 0.52, sz * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Body
  ctx.fillStyle = '#3e2008';
  ctx.beginPath(); ctx.ellipse(px, py, sz * 0.5, sz * 0.72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#573012';
  ctx.beginPath(); ctx.ellipse(px - sz * 0.06, py - sz * 0.06, sz * 0.42, sz * 0.62, -0.1, 0, Math.PI * 2); ctx.fill();
  // Wood grain lines
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px + i * sz * 0.2 - 0.5, py - sz * 0.68, 1, sz * 1.36);
  }
  // Metal bands
  [-0.42, 0, 0.42].forEach(yo => {
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath(); ctx.ellipse(px, py + yo * sz, sz * 0.5, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(px, py + yo * sz - sz * 0.02, sz * 0.5, sz * 0.06, 0, Math.PI, 0); ctx.fill();
  });
  // Top lid
  ctx.fillStyle = '#2e1606';
  ctx.beginPath(); ctx.ellipse(px, py - sz * 0.7, sz * 0.5, sz * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(px, py - sz * 0.7, sz * 0.5, sz * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
}

function _drawCandle(px, py, tt) {
  const sz = TW * 0.28;
  const flicker = Math.sin(tt * 8.2) * 0.12 + Math.sin(tt * 13.7) * 0.07;
  // Ground glow pool
  const gg = ctx.createRadialGradient(px, py + sz * 0.4, 0, px, py + sz * 0.4, sz * 2.5);
  gg.addColorStop(0, `rgba(255,200,80,${0.15 + flicker * 0.05})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py + sz * 0.4, sz * 2.5, 0, Math.PI * 2); ctx.fill();
  // 3 candles at different heights
  const candles = [{ ox:-sz*0.52, h:sz*1.1, r:sz*0.18 }, { ox:0, h:sz*0.82, r:sz*0.15 }, { ox:sz*0.48, h:sz*1.28, r:sz*0.17 }];
  candles.forEach((c, k) => {
    const cx2 = px + c.ox, baseY = py + sz * 0.5;
    // Wax body
    ctx.fillStyle = '#f0e8d0';
    ctx.beginPath(); ctx.roundRect(cx2 - c.r, baseY - c.h, c.r * 2, c.h, c.r * 0.35); ctx.fill();
    // Wax shading
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.roundRect(cx2 + c.r * 0.3, baseY - c.h + 2, c.r * 0.5, c.h - 3, 1); ctx.fill();
    // Wax drip blob
    ctx.fillStyle = '#e4d8c2';
    ctx.beginPath(); ctx.ellipse(cx2 - c.r * 0.3, baseY - c.h * 0.62, c.r * 0.4, c.r * 0.22, 0.3, 0, Math.PI * 2); ctx.fill();
    // Wick
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx2, baseY - c.h); ctx.lineTo(cx2 + 1, baseY - c.h - sz * 0.14); ctx.stroke();
    // Flame glow
    const fk = flicker * (0.8 + Math.sin(tt * 5 + k * 2.1) * 0.2);
    const fgr = ctx.createRadialGradient(cx2, baseY - c.h - sz * 0.1, 0, cx2, baseY - c.h - sz * 0.08, sz * 0.42);
    fgr.addColorStop(0, 'rgba(255,255,200,0.95)');
    fgr.addColorStop(0.35, `rgba(255,180,60,${0.7 + fk * 0.2})`);
    fgr.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = fgr; ctx.beginPath(); ctx.arc(cx2, baseY - c.h - sz * 0.08, sz * 0.42, 0, Math.PI * 2); ctx.fill();
    // Flame teardrop
    ctx.fillStyle = `rgba(255,240,180,0.92)`;
    ctx.beginPath(); ctx.ellipse(cx2 + fk * sz * 0.15, baseY - c.h - sz * 0.22, sz * 0.07, sz * 0.18, fk * 0.25, 0, Math.PI * 2); ctx.fill();
  });
}

function _drawBrazier(px, py, tt) {
  const sz = TW * 0.4;
  const pulse = Math.sin(tt * 3.5) * 0.5 + 0.5;
  // Ground glow
  const gg = ctx.createRadialGradient(px, py + sz * 0.3, 0, px, py + sz * 0.3, sz * 3.8);
  gg.addColorStop(0, `rgba(255,130,0,${0.24 + pulse * 0.1})`);
  gg.addColorStop(0.55, `rgba(255,50,0,${0.09 + pulse * 0.04})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py + sz * 0.3, sz * 3.8, 0, Math.PI * 2); ctx.fill();
  // Tripod legs
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = sz * 0.1;
  [[-0.52, 0.72], [0.1, 0.88], [0.52, 0.68]].forEach(([ox, oy]) => {
    ctx.beginPath(); ctx.moveTo(px, py - sz * 0.1); ctx.lineTo(px + ox * sz, py + oy * sz); ctx.stroke();
  });
  // Bowl
  ctx.fillStyle = '#2e1808';
  ctx.beginPath(); ctx.ellipse(px, py, sz * 0.58, sz * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e2210';
  ctx.beginPath(); ctx.arc(px, py - sz * 0.04, sz * 0.56, Math.PI, 0); ctx.fill();
  // Hot coals inside
  ctx.fillStyle = '#5a0000';
  ctx.beginPath(); ctx.ellipse(px, py - sz * 0.04, sz * 0.42, sz * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,110,0,${0.55 + pulse * 0.3})`;
  ctx.beginPath(); ctx.ellipse(px, py - sz * 0.04, sz * 0.28, sz * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  // Flames (time-based, no Math.random)
  for (let f = 0; f < 5; f++) {
    const fh = sz * (0.75 + Math.sin(tt * 5.3 + f * 1.618) * 0.22);
    const fx = px + Math.sin(tt * 2.1 + f * 1.1) * sz * 0.18;
    const fy = py - sz * 0.04 - fh * 0.28;
    const hue = 18 + Math.sin(tt * 3 + f) * 12;
    const fgr = ctx.createRadialGradient(fx, fy, 0, fx, fy, fh * 0.72);
    fgr.addColorStop(0, 'rgba(255,255,180,0.95)');
    fgr.addColorStop(0.3, `hsla(${hue},100%,55%,0.85)`);
    fgr.addColorStop(1, 'rgba(180,40,0,0)');
    ctx.fillStyle = fgr;
    ctx.beginPath(); ctx.ellipse(fx, fy, fh * 0.2, fh * 0.5, Math.sin(tt * 2.5 + f) * 0.2, 0, Math.PI * 2); ctx.fill();
  }
}

function _drawBones(px, py) {
  const sz = TW * 0.36;
  ctx.globalAlpha = 0.88;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(px, py + sz * 0.38, sz * 0.72, sz * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // Skull
  ctx.fillStyle = '#d0c8ac';
  ctx.beginPath(); ctx.arc(px + sz * 0.1, py - sz * 0.05, sz * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c4bca0';
  ctx.beginPath(); ctx.ellipse(px + sz * 0.1, py + sz * 0.2, sz * 0.2, sz * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // Eye sockets
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.arc(px + sz * 0.01, py - sz * 0.07, sz * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + sz * 0.19, py - sz * 0.07, sz * 0.07, 0, Math.PI * 2); ctx.fill();
  // Scattered bones (shaft + end knobs)
  [[-0.42, 0.12, 0.5], [0.28, 0.32, -0.25], [-0.18, 0.38, 0.85], [0.08, 0.1, 1.2]].forEach(([ox, oy, angle]) => {
    ctx.save();
    ctx.translate(px + ox * sz, py + oy * sz); ctx.rotate(angle);
    ctx.fillStyle = '#cec6a8';
    ctx.fillRect(-sz * 0.22, -sz * 0.04, sz * 0.44, sz * 0.08);
    [-0.22, 0.22].forEach(ex => {
      ctx.beginPath(); ctx.arc(ex * sz, 0, sz * 0.07, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function _drawBloodStain(px, py) {
  const sz = TW * 0.48;
  // Use position as seed for stable variation
  const v = (Math.sin(px * 0.031 + py * 0.017) * 0.5 + 0.5);
  ctx.globalAlpha = 0.6;
  // Main puddle
  ctx.fillStyle = '#500000';
  ctx.beginPath(); ctx.ellipse(px, py, sz * 0.68, sz * 0.44, v * Math.PI, 0, Math.PI * 2); ctx.fill();
  // Dark centre
  ctx.fillStyle = '#380000';
  ctx.beginPath(); ctx.ellipse(px, py, sz * 0.38, sz * 0.24, v * Math.PI * 0.5, 0, Math.PI * 2); ctx.fill();
  // Splatter drops
  [[-0.55, -0.2, 0.11], [0.6, 0.12, 0.08], [-0.2, 0.52, 0.1], [0.38, -0.48, 0.09], [-0.62, 0.3, 0.07]].forEach(([ox, oy, r]) => {
    ctx.fillStyle = '#460000';
    ctx.beginPath(); ctx.arc(px + ox * sz, py + oy * sz, r * sz, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function _drawRune(px, py, tt) {
  const sz = TW * 0.4;
  const spin = tt * 0.42;
  const pulse = Math.sin(tt * 2.5) * 0.5 + 0.5;
  const hue = (tt * 28) % 360;
  // Ground glow
  const gg = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.8);
  gg.addColorStop(0, `hsla(${hue},100%,62%,${0.18 + pulse * 0.1})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, sz * 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(px, py); ctx.rotate(spin);
  // Outer ring
  ctx.strokeStyle = `hsla(${hue},100%,65%,${0.55 + pulse * 0.3})`; ctx.lineWidth = sz * 0.06;
  ctx.beginPath(); ctx.arc(0, 0, sz, 0, Math.PI * 2); ctx.stroke();
  // Inner ring
  ctx.strokeStyle = `hsla(${(hue+70)%360},100%,72%,${0.4 + pulse * 0.2})`; ctx.lineWidth = sz * 0.04;
  ctx.beginPath(); ctx.arc(0, 0, sz * 0.58, 0, Math.PI * 2); ctx.stroke();
  // Pentagram star
  ctx.strokeStyle = `hsla(${hue},100%,78%,${0.65 + pulse * 0.2})`; ctx.lineWidth = sz * 0.05;
  ctx.setLineDash([sz * 0.08, sz * 0.05]);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a  = (i / 5) * Math.PI * 2 - Math.PI * 0.5;
    const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI * 0.5;
    ctx.moveTo(Math.cos(a) * sz, Math.sin(a) * sz);
    ctx.lineTo(Math.cos(a2) * sz, Math.sin(a2) * sz);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Radial spokes
  ctx.strokeStyle = `hsla(${(hue+130)%360},100%,65%,0.35)`; ctx.lineWidth = sz * 0.03;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * sz * 0.2, Math.sin(a) * sz * 0.2);
    ctx.lineTo(Math.cos(a) * sz * 0.95, Math.sin(a) * sz * 0.95);
    ctx.stroke();
  }
  // Centre gem
  ctx.fillStyle = `hsla(${hue},100%,82%,${0.7 + pulse * 0.25})`;
  ctx.beginPath(); ctx.arc(0, 0, sz * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function _drawLantern(px, py, tt) {
  const sz = TW * 0.32;
  const flicker = Math.sin(tt * 9.1) * 0.14 + Math.sin(tt * 5.7) * 0.07;
  const swing = Math.sin(tt * 1.8) * 0.07;
  ctx.translate(px, py - sz * 0.15);
  ctx.rotate(swing);
  // Chain links above
  ctx.strokeStyle = '#555'; ctx.lineWidth = sz * 0.07;
  ctx.beginPath(); ctx.moveTo(0, -sz * 1.2); ctx.lineTo(0, -sz * 0.62); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#666'; ctx.lineWidth = sz * 0.06;
    ctx.beginPath(); ctx.ellipse(0, -sz * 1.2 + i * sz * 0.2, sz * 0.07, sz * 0.11, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // Inner light glow
  const lh = sz * 1.1, lw = sz * 0.65;
  ctx.globalAlpha = 0.5;
  const og = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 2.0);
  og.addColorStop(0, `rgba(255,220,100,${0.6 + flicker * 0.3})`);
  og.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, sz * 2.0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Glass panels (warm amber light)
  ctx.fillStyle = `rgba(255,200,80,${0.45 + flicker * 0.18})`;
  ctx.beginPath(); ctx.roundRect(-lw * 0.38, -lh * 0.42, lw * 0.76, lh * 0.65, sz * 0.06); ctx.fill();
  // Frame bars
  const barCol = '#4a3408';
  ctx.fillStyle = barCol;
  ctx.fillRect(-lw * 0.5, -lh * 0.5, lw, sz * 0.1);
  ctx.fillRect(-lw * 0.5,  lh * 0.5 - sz * 0.1, lw, sz * 0.1);
  ctx.fillRect(-lw * 0.5, -lh * 0.5, sz * 0.08, lh);
  ctx.fillRect( lw * 0.5 - sz * 0.08, -lh * 0.5, sz * 0.08, lh);
  ctx.fillRect(-sz * 0.04, -lh * 0.5, sz * 0.08, lh);
  ctx.fillRect(-lw * 0.5, -sz * 0.04, lw, sz * 0.08);
  // Frame border outline
  ctx.strokeStyle = '#6a4a18'; ctx.lineWidth = sz * 0.06;
  ctx.strokeRect(-lw * 0.5, -lh * 0.5, lw, lh);
  // Bottom spike
  ctx.fillStyle = barCol;
  ctx.beginPath(); ctx.moveTo(-sz * 0.16, lh * 0.5); ctx.lineTo(0, lh * 0.5 + sz * 0.28); ctx.lineTo(sz * 0.16, lh * 0.5); ctx.closePath(); ctx.fill();
}

function _drawWeb(px, py) {
  const sz = TW * 0.44;
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = 'rgba(200,210,225,0.75)';
  ctx.lineWidth = 0.9;
  // Radial strands
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * sz, py + Math.sin(a) * sz); ctx.stroke();
  }
  // Concentric rings (connected polygon style)
  [0.28, 0.52, 0.76, 1.0].forEach(fr => {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = px + Math.cos(a) * sz * fr, y = py + Math.sin(a) * sz * fr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  });
  // Dew drops
  ctx.fillStyle = 'rgba(220,235,255,0.65)';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7 + 0.07) * Math.PI * 2;
    [0.35, 0.62, 0.88].forEach(fr => {
      ctx.beginPath(); ctx.arc(px + Math.cos(a) * sz * fr, py + Math.sin(a) * sz * fr, 1.5, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}
