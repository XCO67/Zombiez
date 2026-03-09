
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

  // Torches — tinted by each torch's color
  TORCHES.forEach(([tr,tc,color],i)=>{
    const tx=tc*TW+TW*.5-camX, ty=tr*TH+TH*.5-camY, radius=TS*(3.2+flickers[i]*.55);
    let cr=255,cg=210,cb=110;
    if(color&&color.length>=7){cr=parseInt(color.slice(1,3),16)||255;cg=parseInt(color.slice(3,5),16)||210;cb=parseInt(color.slice(5,7),16)||110;}
    const br=Math.min(255,cr+80),bg=Math.min(255,cg+80),bb=Math.min(255,cb+80);
    g=lx.createRadialGradient(tx,ty,0,tx,ty,radius);
    g.addColorStop(0,`rgba(${br},${bg},${bb},0.92)`);
    g.addColorStop(.38,`rgba(${cr},${cg},${cb},0.58)`);
    g.addColorStop(.7,`rgba(${Math.round(cr*.78)},${Math.round(cg*.29)},${Math.round(cb*.07)},0.22)`);
    g.addColorStop(1,'rgba(0,0,0,0)');
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

  // Coloured torch tint overlay on the scene
  ctx.save();
  TORCHES.forEach(([tr,tc,color],i)=>{
    const tx=tc*TW+TW*.5-camX, ty=tr*TH+TH*.5-camY, radius=TS*(2.2+flickers[i]*.3);
    let cr=255,cg=175,cb=55;
    if(color&&color.length>=7){cr=parseInt(color.slice(1,3),16)||255;cg=parseInt(color.slice(3,5),16)||175;cb=parseInt(color.slice(5,7),16)||55;}
    g=ctx.createRadialGradient(tx,ty,0,tx,ty,radius);
    g.addColorStop(0,`rgba(${cr},${cg},${cb},0.15)`);
    g.addColorStop(.55,`rgba(${cr},${cg},${cb},0.06)`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(tx,ty,radius,0,Math.PI*2);ctx.fill();
  });
  ctx.restore();
}
