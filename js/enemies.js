
// ─── ZOMBIES ──────────────────────────────────────────────────────────────────
function getSpawnTiles() {
  const pts = [];
  for (let r = 0; r < MAP_H; r++)
    for (let c = 0; c < MAP_W; c++)
      if (MAP[r][c] === T.SPAWN) pts.push({ cx: c + 0.5, cy: r + 0.5 });
  // Fallback: use map edges if no spawn tiles defined
  if (!pts.length) {
    pts.push({ cx: MAP_W * 0.5, cy: 0.5 });
    pts.push({ cx: MAP_W * 0.5, cy: MAP_H - 0.5 });
    pts.push({ cx: 0.5,         cy: MAP_H * 0.5 });
    pts.push({ cx: MAP_W - 0.5, cy: MAP_H * 0.5 });
  }
  return pts;
}
function spawnZombie() {
  const pts = getSpawnTiles();
  const sp  = pts[Math.floor(Math.random() * pts.length)];
  const hp  = 20 + game.round * 20;
  return { cx: sp.cx + (Math.random()-.5)*.4, cy: sp.cy + (Math.random()-.5)*.4,
           frame:Math.random()*8|0, ft:Math.random()*.1, hp, maxHp:hp,
           dead:false, deathTimer:0, hitFlash:0, vx:0, vy:0 };
}

const ZOMBIES = [];
const ZOMBIE_SPEED = 0.018;

function updateZombies() {
  ZOMBIES.forEach(z=>{
    if (z.dead){if(z.deathTimer>0)z.deathTimer--;return;}
    // Apply knockback
    if(z.vx||z.vy){
      const nx=z.cx+z.vx, ny=z.cy+z.vy;
      if(!isBlocked(nx,z.cy)) z.cx=nx; else z.vx=0;
      if(!isBlocked(z.cx,ny)) z.cy=ny; else z.vy=0;
      z.vx*=0.78; z.vy*=0.78;
      if(Math.abs(z.vx)<0.005) z.vx=0;
      if(Math.abs(z.vy)<0.005) z.vy=0;
    }
    const spd = ZOMBIE_SPEED + game.round*0.0008; // scale speed with round
    const tgt=nearestPlayerTo(z.cx,z.cy);
    const dx=tgt.cx-z.cx,dy=tgt.cy-z.cy,dist=Math.hypot(dx,dy);
    if(dist>0.4){z.cx+=(dx/dist)*spd;z.cy+=(dy/dist)*spd;}
    // Hurt nearest player on contact
    if(dist<0.65&&tgt.hurtTimer<=0&&!tgt.dead&&!tgt.downed&&game.state==='playing'){
      applyDamage(tgt, 8);
      if(tgt===player){if(tgt.hp<=0)playerGoDown();}
      else{if(tgt.hp<=0)remoteGoDown(tgt);}
    }
    z.ft+=1/60; if(z.ft>=.11){z.frame=(z.frame+1)%8;z.ft=0;}
    if(z.hitFlash>0)z.hitFlash--;
  });
  // Remove fully faded dead zombies
  for(let i=ZOMBIES.length-1;i>=0;i--){if(ZOMBIES[i].dead&&ZOMBIES[i].deathTimer<=0)ZOMBIES.splice(i,1);}
}

function drawZombie(z) {
  if(z.dead&&z.deathTimer<=0) return;
  const px=z.cx*TW,py=z.cy*TH,sz=TW*1.45;
  const alpha=z.dead?(z.deathTimer/25):1;
  const facing=dir8(player.cx-z.cx,player.cy-z.cy);
  const img=zWalk[facing]?.[z.frame];
  if(!img||!img.complete||!img.naturalWidth) return;
  // Shadow
  ctx.save();ctx.globalAlpha=.35*alpha;ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(px,py+sz*.44,sz*.28,sz*.1,0,0,Math.PI*2);ctx.fill();ctx.restore();
  // Sprite (with optional hit flash)
  ctx.save(); ctx.globalAlpha=alpha;
  if(z.hitFlash>0) ctx.filter=`brightness(4) saturate(0.2)`;
  ctx.drawImage(img,px-sz/2,py-sz/2,sz,sz);
  ctx.filter='none'; ctx.restore();
  // Health bar (when damaged)
  if(!z.dead&&z.hp<z.maxHp){
    const bw=sz*.75,bh=Math.max(3,TH*.09),bx=px-bw/2,by=py-sz*.58;
    ctx.fillStyle='#1a0808';ctx.fillRect(bx,by,bw,bh);
    const f=z.hp/z.maxHp;
    ctx.fillStyle=f>.5?'#40c840':f>.25?'#c8c040':'#c84040';
    ctx.fillRect(bx,by,bw*f,bh);
  }
}

// ─── SKELETONS ────────────────────────────────────────────────────────────────
const SKELETONS = [];
const SKEL_HP    = 110;
const SKEL_SPEED = 0.032;   // noticeably faster than zombies (0.018)
const SKEL_STEAL = 20;      // gold stolen per hit

function skeletonCount(round) {
  if (round < 7) return 0;
  return Math.floor((round - 7) / 3) + 1;  // r7:1  r10:2  r13:3  r16:4 …
}

function spawnSkeleton() {
  const pts=getSpawnTiles();
  const sp=pts[Math.floor(Math.random()*pts.length)];
  return { cx:sp.cx+(Math.random()-.5)*.4, cy:sp.cy+(Math.random()-.5)*.4,
           frame:Math.random()*4|0, ft:Math.random()*.1,
           hp:SKEL_HP, maxHp:SKEL_HP,
           dead:false, deathTimer:0, hitFlash:0, vx:0, vy:0 };
}

function hitSkeleton(s, wkey, papMult=1) {
  const {dmg:rawDmg,crit}=rollDamage(WEAPONS[wkey].baseDmg);
  const dmg=Math.round(rawDmg*papMult);
  s.hp-=dmg; s.hitFlash=7;
  const nc=papMult>1?`hsl(${(performance.now()/4)%360},100%,65%)`:crit?'#cc44ff':'#aaddff';
  spawnDmgNum(s.cx*TW, s.cy*TH-TH*.4, dmg, nc);
  if(s.hp<=0){
    s.dead=true; s.deathTimer=22; game.kills++; game.score+=15;
    spawnCoin(s.cx+(Math.random()-.5)*.4, s.cy+(Math.random()-.5)*.4,
              15+game.round*3);
    spawnPerk(s.cx, s.cy);
    if(player.perks.lifesteal>0&&!player.dead){
      const heal=LIFESTEAL_HP[player.perks.lifesteal];
      player.hp=Math.min(player.maxHp,player.hp+heal);
      spawnDmgNum(player.cx*TW,player.cy*TH-TH*.6,heal,'#44ff88');
    }
  }
}

function updateSkeletons() {
  SKELETONS.forEach(s=>{
    if(s.dead){if(s.deathTimer>0)s.deathTimer--;return;}
    if(s.vx||s.vy){
      const nx=s.cx+s.vx,ny=s.cy+s.vy;
      if(!isBlocked(nx,s.cy))s.cx=nx; else s.vx=0;
      if(!isBlocked(s.cx,ny))s.cy=ny; else s.vy=0;
      s.vx*=0.78;s.vy*=0.78;
      if(Math.abs(s.vx)<0.005)s.vx=0;if(Math.abs(s.vy)<0.005)s.vy=0;
    }
    const spd=SKEL_SPEED+game.round*0.001;
    const tgt=nearestPlayerTo(s.cx,s.cy);
    const dx=tgt.cx-s.cx,dy=tgt.cy-s.cy,dist=Math.hypot(dx,dy);
    if(dist>0.4){s.cx+=(dx/dist)*spd;s.cy+=(dy/dist)*spd;}
    // Contact: steal money + tiny HP hit
    if(dist<0.62&&tgt.hurtTimer<=0&&!tgt.dead&&!tgt.downed&&game.state==='playing'){
      const stolen=Math.min(player.money,SKEL_STEAL);
      player.money=Math.max(0,player.money-stolen);
      if(stolen>0)spawnDmgNum(tgt.cx*TW,tgt.cy*TH-TH,stolen,'#f5c518');
      applyDamage(tgt, 4);
      if(tgt===player){if(tgt.hp<=0)playerGoDown();}
      else{if(tgt.hp<=0)remoteGoDown(tgt);}
    }
    s.ft+=1/60;if(s.ft>=.09){s.frame=(s.frame+1)%4;s.ft=0;}
    if(s.hitFlash>0)s.hitFlash--;
  });
  for(let i=SKELETONS.length-1;i>=0;i--){if(SKELETONS[i].dead&&SKELETONS[i].deathTimer<=0)SKELETONS.splice(i,1);}
}

function drawSkeleton(s) {
  if(s.dead&&s.deathTimer<=0) return;
  const px=s.cx*TW,py=s.cy*TH,sz=TW*1.35;
  const alpha=s.dead?(s.deathTimer/22):1;
  const facing=dir8(player.cx-s.cx,player.cy-s.cy);
  const img=skelWalk[facing]?.[s.frame];
  ctx.save();ctx.globalAlpha=.3*alpha;ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(px,py+sz*.44,sz*.26,sz*.09,0,0,Math.PI*2);ctx.fill();ctx.restore();
  if(img&&img.complete&&img.naturalWidth){
    ctx.save();ctx.globalAlpha=alpha;
    if(s.hitFlash>0)ctx.filter='brightness(5) saturate(0)';
    ctx.drawImage(img,px-sz/2,py-sz/2,sz,sz);
    ctx.filter='none';ctx.restore();
  }
  if(!s.dead&&s.hp<s.maxHp){
    const bw=sz*.7,bh=Math.max(3,TH*.09),bx=px-bw/2,by=py-sz*.58;
    ctx.fillStyle='#101025';ctx.fillRect(bx,by,bw,bh);
    const f=s.hp/s.maxHp;
    ctx.fillStyle=f>.5?'#88ccff':f>.25?'#aaaaff':'#cc44ff';
    ctx.fillRect(bx,by,bw*f,bh);
  }
}

// ─── DRAGONS ──────────────────────────────────────────────────────────────────
const DRAGONS = [];
const FLAMES  = [];
const DRAGON_HP            = 200;
const DRAGON_SPEED         = 0.012;
const DRAGON_FIRE_RANGE    = 10;   // tiles
const DRAGON_FIRE_INTERVAL = 90;   // frames between shots (~1.5s)
const FLAME_SPEED          = 5.5;  // px/frame
const FLAME_DMG            = 20;
const FLAME_LIFE           = 200;  // frames

function spawnDragon() {
  const pts = getSpawnTiles();
  const sp  = pts[Math.floor(Math.random()*pts.length)];
  return { cx:sp.cx+(Math.random()-.5)*.5, cy:sp.cy+(Math.random()-.5)*.5,
           frame:Math.random()*8|0, ft:Math.random()*.1,
           hp:DRAGON_HP, maxHp:DRAGON_HP,
           dead:false, deathTimer:0, hitFlash:0, vx:0, vy:0,
           fireTimer:Math.random()*DRAGON_FIRE_INTERVAL|0 };
}

function spawnFlame(cx, cy) {
  const sx=cx*TW,sy=cy*TH;
  const tgt=nearestPlayerTo(cx,cy);
  const dx=tgt.cx*TW-sx,dy=tgt.cy*TH-sy,d=Math.hypot(dx,dy)||1;
  FLAMES.push({x:sx,y:sy,vx:(dx/d)*FLAME_SPEED,vy:(dy/d)*FLAME_SPEED,life:FLAME_LIFE,maxLife:FLAME_LIFE});
}

function hitDragon(d, wkey, papMult=1) {
  const {dmg:rawDmg,crit} = rollDamage(WEAPONS[wkey].baseDmg);
  const dmg=Math.round(rawDmg*papMult);
  d.hp -= dmg; d.hitFlash = 9;
  const nc=papMult>1?`hsl(${(performance.now()/4)%360},100%,65%)`:crit?'#cc44ff':'#ff6600';
  spawnDmgNum(d.cx*TW, d.cy*TH-TW*.7, dmg, nc);
  if (d.hp<=0) {
    d.dead=true; d.deathTimer=30; game.kills++; game.score+=50;
    spawnCoin(d.cx, d.cy, 60+game.round*10);
    // Dragons always drop a perk
    const type=Math.random()<.5?'doublePoints':'magnet';
    DROPPED_PERKS.push({cx:d.cx, cy:d.cy, type, bob:0, life:600});
    if(player.perks.lifesteal>0&&!player.dead){
      const heal=LIFESTEAL_HP[player.perks.lifesteal];
      player.hp=Math.min(player.maxHp,player.hp+heal);
      spawnDmgNum(player.cx*TW,player.cy*TH-TH*.6,heal,'#44ff88');
    }
  }
}

function updateDragons() {
  DRAGONS.forEach(d => {
    if (d.dead){if(d.deathTimer>0)d.deathTimer--;return;}
    if(d.vx||d.vy){
      const nx=d.cx+d.vx, ny=d.cy+d.vy;
      if(!isBlocked(nx,d.cy)) d.cx=nx; else d.vx=0;
      if(!isBlocked(d.cx,ny)) d.cy=ny; else d.vy=0;
      d.vx*=0.75; d.vy*=0.75;
      if(Math.abs(d.vx)<0.005)d.vx=0; if(Math.abs(d.vy)<0.005)d.vy=0;
    }
    const tgt=nearestPlayerTo(d.cx,d.cy);
    const dx=tgt.cx-d.cx,dy=tgt.cy-d.cy,dist=Math.hypot(dx,dy);
    if(dist>0.5){d.cx+=(dx/dist)*DRAGON_SPEED;d.cy+=(dy/dist)*DRAGON_SPEED;}
    // Melee contact
    if(dist<0.9&&tgt.hurtTimer<=0&&!tgt.dead&&!tgt.downed&&game.state==='playing'){
      applyDamage(tgt, 12);
      if(tgt===player){if(tgt.hp<=0)playerGoDown();}
      else{if(tgt.hp<=0)remoteGoDown(tgt);}
    }
    // Flame attack
    d.fireTimer++;
    if(d.fireTimer>=DRAGON_FIRE_INTERVAL&&dist<DRAGON_FIRE_RANGE){
      d.fireTimer=0; spawnFlame(d.cx,d.cy);
    }
    d.ft+=1/60; if(d.ft>=.11){d.frame=(d.frame+1)%8;d.ft=0;}
    if(d.hitFlash>0)d.hitFlash--;
  });
  for(let i=DRAGONS.length-1;i>=0;i--){if(DRAGONS[i].dead&&DRAGONS[i].deathTimer<=0)DRAGONS.splice(i,1);}
}

function updateFlames() {
  for(let i=FLAMES.length-1;i>=0;i--){
    const f=FLAMES[i]; f.x+=f.vx; f.y+=f.vy; f.life--;
    const tr=Math.floor(f.y/TH),tc=Math.floor(f.x/TW);
    const wallHit=f.life<=0||tr<0||tr>=MAP_H||tc<0||tc>=MAP_W||MAP[tr]?.[tc]===T.WALL||MAP[tr]?.[tc]===T.PILLAR;
    if(wallHit){FLAMES.splice(i,1);continue;}
    const ftgt=nearestPlayerTo(f.x/TW,f.y/TH);
    if(!ftgt.dead&&!ftgt.downed&&ftgt.hurtTimer<=0&&Math.hypot(f.x-ftgt.cx*TW,f.y-ftgt.cy*TH)<TW*.55){
      applyDamage(ftgt, FLAME_DMG);
      if(ftgt===player){if(ftgt.hp<=0)playerGoDown();}
      else{if(ftgt.hp<=0)remoteGoDown(ftgt);}
      FLAMES.splice(i,1);
    }
  }
}

function drawDragon(d) {
  if(d.dead&&d.deathTimer<=0) return;
  const px=d.cx*TW, py=d.cy*TH, sz=TW*2.1;
  const alpha=d.dead?(d.deathTimer/30):1;
  const facing=dir8(player.cx-d.cx,player.cy-d.cy);
  const img=dragonWalk[facing]?.[d.frame];
  // Shadow
  ctx.save();ctx.globalAlpha=.45*alpha;ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(px,py+sz*.42,sz*.32,sz*.1,0,0,Math.PI*2);ctx.fill();ctx.restore();
  // Sprite
  if(img&&img.complete&&img.naturalWidth){
    ctx.save();ctx.globalAlpha=alpha;
    if(d.hitFlash>0)ctx.filter='brightness(5) sepia(1) saturate(4) hue-rotate(-20deg)';
    ctx.drawImage(img,px-sz/2,py-sz/2,sz,sz);
    ctx.filter='none';ctx.restore();
  }
  // Health bar
  if(!d.dead&&d.hp<d.maxHp){
    const bw=sz*.9,bh=Math.max(4,TH*.11),bx=px-bw/2,by=py-sz*.65;
    ctx.fillStyle='#1a0000';ctx.fillRect(bx,by,bw,bh);
    const f=d.hp/d.maxHp;
    ctx.fillStyle=f>.5?'#ff6600':f>.25?'#ff2200':'#cc0000';
    ctx.fillRect(bx,by,bw*f,bh);
    ctx.strokeStyle='rgba(255,80,0,0.5)';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);
  }
  // Name tag
  if(!d.dead){
    ctx.save();ctx.fillStyle='rgba(255,80,0,0.95)';ctx.font=`bold ${Math.round(TH*.24)}px Segoe UI`;
    ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.shadowColor='#ff4400';ctx.shadowBlur=6;
    ctx.fillText('🐉 DRAGON',px,py-sz*.65);ctx.restore();
  }
}

function drawFlames() {
  FLAMES.forEach(f=>{
    const a=f.life/f.maxLife;
    const r=TW*(0.2+(1-a)*0.22);
    ctx.save();ctx.globalAlpha=a*.95;
    const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,r*2.8);
    g.addColorStop(0,'rgba(255,240,80,0.95)');
    g.addColorStop(0.3,'rgba(255,100,0,0.8)');
    g.addColorStop(0.7,'rgba(200,20,0,0.4)');
    g.addColorStop(1,'rgba(100,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,r*2.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,220,80,0.9)';
    ctx.beginPath();ctx.arc(f.x,f.y,r*.45,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
}
