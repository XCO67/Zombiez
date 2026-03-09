
// ─── LIGHTING ─────────────────────────────────────────────────────────────────
function applyLighting(flickers) {
  const TS=TW;
  lx.clearRect(0,0,lightCanvas.width,lightCanvas.height);
  lx.fillStyle='rgba(0,0,0,0.84)';lx.fillRect(0,0,lightCanvas.width,lightCanvas.height);
  lx.globalCompositeOperation='destination-out';
  let g;

  // All world coords converted to screen: sx = wx - camX, sy = wy - camY

  // Player light
  const plx=player.cx*TW-camX, ply=player.cy*TH-camY;
  g=lx.createRadialGradient(plx,ply,0,plx,ply,TS*5.5);
  g.addColorStop(0,'rgba(255,255,255,0.82)');g.addColorStop(.45,'rgba(255,255,255,0.38)');g.addColorStop(1,'rgba(0,0,0,0)');
  lx.fillStyle=g;lx.beginPath();lx.arc(plx,ply,TS*5.5,0,Math.PI*2);lx.fill();

  // Torches
  TORCHES.forEach(([tr,tc],i)=>{
    const tx=tc*TW+TW*.5-camX, ty=tr*TH+TH*.5-camY, radius=TS*(3.2+flickers[i]*.55);
    g=lx.createRadialGradient(tx,ty,0,tx,ty,radius);
    g.addColorStop(0,'rgba(255,210,110,0.92)');g.addColorStop(.38,'rgba(255,155,55,0.58)');
    g.addColorStop(.7,'rgba(200,75,18,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');
    lx.fillStyle=g;lx.beginPath();lx.arc(tx,ty,radius,0,Math.PI*2);lx.fill();
  });

  // Door amber glow
  DOORS.forEach(door=>{
    if(door.unlocked) return;
    const dx=door.cx*TW+TW*.5-camX, dy=door.cy*TH+TH*.5-camY, dr=TS*1.8;
    g=lx.createRadialGradient(dx,dy,0,dx,dy,dr);
    g.addColorStop(0,'rgba(255,180,40,0.45)');g.addColorStop(1,'rgba(0,0,0,0)');
    lx.fillStyle=g;lx.beginPath();lx.arc(dx,dy,dr,0,Math.PI*2);lx.fill();
  });

  // Mystery box light
  {
    const spin=(box.state==='spinning');
    const bx=BOX_POS.cx*TW-camX, by=BOX_POS.cy*TH-camY, br=TS*(spin?3.5:2.2);
    g=lx.createRadialGradient(bx,by,0,bx,by,br);
    g.addColorStop(0,spin?'rgba(255,210,50,0.75)':'rgba(160,60,255,0.55)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    lx.fillStyle=g;lx.beginPath();lx.arc(bx,by,br,0,Math.PI*2);lx.fill();
  }
  // Pack-a-Punch light (rainbow pulse)
  {
    const ph=(performance.now()/1000*60)%360;
    const papx=PAP_POS.cx*TW-camX, papy=PAP_POS.cy*TH-camY, pbr=TS*3.2;
    g=lx.createRadialGradient(papx,papy,0,papx,papy,pbr);
    g.addColorStop(0,`hsla(${ph},100%,60%,0.55)`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    lx.fillStyle=g;lx.beginPath();lx.arc(papx,papy,pbr,0,Math.PI*2);lx.fill();
  }

  // Bullets carry light
  projectiles.forEach(p=>{
    const bx=p.x-camX, by=p.y-camY;
    g=lx.createRadialGradient(bx,by,0,bx,by,TS*1.4);
    g.addColorStop(0,'rgba(150,220,255,0.65)');g.addColorStop(1,'rgba(0,0,0,0)');
    lx.fillStyle=g;lx.beginPath();lx.arc(bx,by,TS*1.4,0,Math.PI*2);lx.fill();
  });

  lx.globalCompositeOperation='source-over';
  ctx.drawImage(lightCanvas,0,0);

  // Warm torch tint
  ctx.save();
  TORCHES.forEach(([tr,tc],i)=>{
    const tx=tc*TW+TW*.5-camX, ty=tr*TH+TH*.5-camY, radius=TS*(2.2+flickers[i]*.3);
    g=ctx.createRadialGradient(tx,ty,0,tx,ty,radius);
    g.addColorStop(0,'rgba(255,175,55,0.14)');g.addColorStop(.55,'rgba(255,110,18,0.05)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(tx,ty,radius,0,Math.PI*2);ctx.fill();
  });
  ctx.restore();
}
