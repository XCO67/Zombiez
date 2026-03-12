
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
  const hp  = Math.round((20 + game.round * 22) * enemyHpScale(game.round));
  return { cx: sp.cx + (Math.random()-.5)*.4, cy: sp.cy + (Math.random()-.5)*.4,
           frame:Math.random()*8|0, ft:Math.random()*.1, hp, maxHp:hp,
           dead:false, deathTimer:0, hitFlash:0, vx:0, vy:0,
           spreadAngle: (Math.random() - 0.5) * 1.8 };
}

// Exponential HP multiplier — kicks in after round 1, grows 10% per round
function enemyHpScale(round) {
  return Math.pow(1.10, Math.max(0, round - 1));
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
    const spd = ZOMBIE_SPEED + game.round*0.0009; // scale speed with round
    const tgt=nearestPlayerTo(z.cx,z.cy);
    const dx=tgt.cx-z.cx,dy=tgt.cy-z.cy,dist=Math.hypot(dx,dy);
    // Spread: aim for a point slightly offset from the player so zombies fan out
    let tx=tgt.cx, ty=tgt.cy;
    if(dist>1.5){
      const perp=Math.atan2(dy,dx)+Math.PI/2;
      tx+=Math.cos(perp)*Math.sin(z.spreadAngle)*1.1;
      ty+=Math.sin(perp)*Math.sin(z.spreadAngle)*1.1;
    }
    const tdx=tx-z.cx,tdy=ty-z.cy,td=Math.hypot(tdx,tdy);
    if(td>0.4){z.cx+=(tdx/td)*spd;z.cy+=(tdy/td)*spd;}
    // Separation: push apart from overlapping zombies so they don't merge
    for(const other of ZOMBIES){
      if(other===z||other.dead)continue;
      const sdx=z.cx-other.cx,sdy=z.cy-other.cy;
      const sd2=sdx*sdx+sdy*sdy;
      if(sd2<0.64&&sd2>0.0001){
        const sd=Math.sqrt(sd2);
        const push=0.008*(1-sd/0.8);
        z.cx+=(sdx/sd)*push; z.cy+=(sdy/sd)*push;
      }
    }
    // Hurt nearest player on contact
    const contactDmg = 8 + Math.floor(game.round / 5) * 2; // r1:8 r5:10 r10:12 r15:14 r20:16
    if(dist<0.65&&tgt.hurtTimer<=0&&!tgt.dead&&!tgt.downed&&game.state==='playing'){
      applyDamage(tgt, contactDmg);
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
const SKEL_HP    = 180;
const SKEL_SPEED = 0.032;   // noticeably faster than zombies (0.018)
const SKEL_STEAL = 20;      // gold stolen per hit

function skeletonCount(round) {
  if (round < 7) return 0;
  return Math.floor((round - 7) / 3) + 1;  // r7:1  r10:2  r13:3  r16:4 …
}

function spawnSkeleton() {
  const pts=getSpawnTiles();
  const sp=pts[Math.floor(Math.random()*pts.length)];
  const hp = Math.round(SKEL_HP * enemyHpScale(game.round));
  return { cx:sp.cx+(Math.random()-.5)*.4, cy:sp.cy+(Math.random()-.5)*.4,
           frame:Math.random()*4|0, ft:Math.random()*.1,
           hp, maxHp:hp,
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
  const hp  = Math.round(DRAGON_HP * enemyHpScale(game.round));
  return { cx:sp.cx+(Math.random()-.5)*.5, cy:sp.cy+(Math.random()-.5)*.5,
           frame:Math.random()*8|0, ft:Math.random()*.1,
           hp, maxHp:hp,
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

// ─── LAVA ZOMBIES ─────────────────────────────────────────────────────────────
const LAVA_ZOMBIES = [];
const LAVA_SHARDS  = [];   // flying molten rocks
const LAVA_POOLS   = [];   // ground lava puddles

const LAVA_SPEED              = 0.015;
const LAVA_CONTACT_DMG        = 15;
const LAVA_ABILITY_COOLDOWN   = 180;  // frames between eruptions
const LAVA_ABILITY_RANGE      = 5.5;  // tiles — must be this close to trigger
const LAVA_CHARGE_FRAMES      = 55;
const LAVA_SHARD_COUNT        = 10;
const LAVA_SHARD_SPEED        = 4.2;
const LAVA_SHARD_RANGE        = 4.5;  // tiles shards travel before pooling
const LAVA_POOL_LIFE          = 420;
const LAVA_POOL_DMG           = 6;
const LAVA_POOL_DMG_INTERVAL  = 30;   // frames between pool damage ticks
const LAVA_INVINC_DURATION    = 240;  // 4 s invincible
const LAVA_INVINC_INTERVAL    = 480;  // 8 s between activations

function spawnLavaZombie() {
  const pts = getSpawnTiles();
  const sp  = pts[Math.floor(Math.random() * pts.length)];
  const hp  = Math.round((300 + game.round * 50) * enemyHpScale(game.round));
  return {
    cx: sp.cx + (Math.random()-.5)*.4, cy: sp.cy + (Math.random()-.5)*.4,
    frame: Math.random()*8|0, ft: Math.random()*.1,
    hp, maxHp: hp,
    dead: false, deathTimer: 0, hitFlash: 0, vx: 0, vy: 0,
    abilityTimer: Math.random() * 80 | 0,
    chargeTimer: 0,
    state: 'walk',
    invincTimer: 0,
    invincCooldown: Math.random() * 300 | 0,
  };
}

function hitLavaZombie(z, wkey, papMult) {
  papMult = papMult || 1;
  if (z.invincTimer > 0) {
    spawnDmgNum(z.cx*TW, z.cy*TH - TH*.5, 0, '#ff8800');
    return;
  }
  const {dmg:rawDmg, crit} = rollDamage(WEAPONS[wkey].baseDmg);
  const dmg = Math.round(rawDmg * papMult);
  z.hp -= dmg; z.hitFlash = 7;
  const nc = papMult > 1 ? `hsl(${(performance.now()/4)%360},100%,65%)` : crit ? '#cc44ff' : '#ff8800';
  spawnDmgNum(z.cx*TW, z.cy*TH - TH*.4, dmg, nc);
  if (z.hp <= 0) {
    z.dead = true; z.deathTimer = 28;
    game.kills++; game.score += 20;
    spawnCoin(z.cx + (Math.random()-.5)*.4, z.cy + (Math.random()-.5)*.4, 30 + game.round * 6);
    spawnPerk(z.cx, z.cy);
    // Death puddle
    LAVA_POOLS.push({ cx: z.cx, cy: z.cy, life: 200, maxLife: 200, dmgTimer: 0, radius: 0.8 });
    if (player.perks.lifesteal > 0 && !player.dead) {
      const heal = LIFESTEAL_HP[player.perks.lifesteal];
      player.hp = Math.min(player.maxHp, player.hp + heal);
      spawnDmgNum(player.cx*TW, player.cy*TH - TH*.6, heal, '#44ff88');
    }
  }
}

function eruptLava(z) {
  // Large central pool
  LAVA_POOLS.push({ cx: z.cx, cy: z.cy, life: LAVA_POOL_LIFE, maxLife: LAVA_POOL_LIFE, dmgTimer: 0, radius: 1.1 });
  // 10 shards in a ring with slight random spread
  for (let i = 0; i < LAVA_SHARD_COUNT; i++) {
    const angle = (i / LAVA_SHARD_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const maxLife = Math.round((LAVA_SHARD_RANGE * TW) / LAVA_SHARD_SPEED);
    LAVA_SHARDS.push({
      x: z.cx * TW, y: z.cy * TH,
      vx: Math.cos(angle) * LAVA_SHARD_SPEED,
      vy: Math.sin(angle) * LAVA_SHARD_SPEED,
      life: maxLife, maxLife,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.25,
      size: 5 + Math.random() * 5
    });
  }
}

function updateLavaZombies() {
  LAVA_ZOMBIES.forEach(z => {
    if (z.dead) { if (z.deathTimer > 0) z.deathTimer--; return; }
    if (z.vx || z.vy) {
      const nx = z.cx + z.vx, ny = z.cy + z.vy;
      if (!isBlocked(nx, z.cy)) z.cx = nx; else z.vx = 0;
      if (!isBlocked(z.cx, ny)) z.cy = ny; else z.vy = 0;
      z.vx *= 0.78; z.vy *= 0.78;
      if (Math.abs(z.vx) < 0.005) z.vx = 0;
      if (Math.abs(z.vy) < 0.005) z.vy = 0;
    }
    const tgt = nearestPlayerTo(z.cx, z.cy);
    const dx = tgt.cx - z.cx, dy = tgt.cy - z.cy, dist = Math.hypot(dx, dy);

    if (z.state === 'charging') {
      z.chargeTimer++;
      if (z.chargeTimer >= LAVA_CHARGE_FRAMES) {
        eruptLava(z);
        z.state = 'walk';
        z.abilityTimer = 0;
        z.chargeTimer = 0;
      }
    } else {
      // Invincibility cycle
      if (z.invincTimer > 0) {
        z.invincTimer--;
      } else {
        z.invincCooldown++;
        if (z.invincCooldown >= LAVA_INVINC_INTERVAL) {
          z.invincCooldown = 0;
          z.invincTimer = LAVA_INVINC_DURATION;
        }
      }
      const spd = LAVA_SPEED + game.round * 0.0006;
      if (dist > 0.4) { z.cx += (dx/dist)*spd; z.cy += (dy/dist)*spd; }
      const lavaContactDmg = LAVA_CONTACT_DMG + Math.floor(game.round / 4) * 3;
      if (dist < 0.65 && tgt.hurtTimer <= 0 && !tgt.dead && !tgt.downed && game.state === 'playing') {
        applyDamage(tgt, lavaContactDmg);
        if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
        else { if (tgt.hp <= 0) remoteGoDown(tgt); }
      }
      z.abilityTimer++;
      if (z.abilityTimer >= LAVA_ABILITY_COOLDOWN && dist < LAVA_ABILITY_RANGE) {
        z.state = 'charging';
        z.chargeTimer = 0;
      }
      z.ft += 1/60; if (z.ft >= .11) { z.frame = (z.frame+1)%8; z.ft = 0; }
    }
    if (z.hitFlash > 0) z.hitFlash--;
  });
  for (let i = LAVA_ZOMBIES.length-1; i >= 0; i--) {
    if (LAVA_ZOMBIES[i].dead && LAVA_ZOMBIES[i].deathTimer <= 0) LAVA_ZOMBIES.splice(i, 1);
  }
}

function updateLavaShards() {
  for (let i = LAVA_SHARDS.length-1; i >= 0; i--) {
    const s = LAVA_SHARDS[i];
    s.x += s.vx; s.y += s.vy; s.life--; s.rot += s.rotSpd;
    const tr = Math.floor(s.y/TH), tc = Math.floor(s.x/TW);
    const wallHit = tr<0||tr>=MAP_H||tc<0||tc>=MAP_W||MAP[tr]?.[tc]===T.WALL||MAP[tr]?.[tc]===T.PILLAR;
    if (s.life <= 0 || wallHit) {
      LAVA_POOLS.push({ cx: s.x/TW, cy: s.y/TH, life: LAVA_POOL_LIFE, maxLife: LAVA_POOL_LIFE, dmgTimer: 0, radius: 0.65 });
      LAVA_SHARDS.splice(i, 1);
    }
  }
}

function updateLavaPools() {
  for (let i = LAVA_POOLS.length-1; i >= 0; i--) {
    const p = LAVA_POOLS[i];
    p.life--; p.dmgTimer++;
    if (p.life <= 0) { LAVA_POOLS.splice(i, 1); continue; }
    if (p.dmgTimer >= LAVA_POOL_DMG_INTERVAL) {
      p.dmgTimer = 0;
      const tgt = nearestPlayerTo(p.cx, p.cy);
      if (!tgt.dead && !tgt.downed && Math.hypot(tgt.cx-p.cx, tgt.cy-p.cy) < p.radius + 0.45) {
        applyDamage(tgt, LAVA_POOL_DMG);
        if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
        else { if (tgt.hp <= 0) remoteGoDown(tgt); }
      }
    }
  }
}

function drawLavaPools() {
  const now = performance.now();
  LAVA_POOLS.forEach(p => {
    const lifeFrac = p.life / p.maxLife;
    const baseA = Math.min(lifeFrac * 4, 1) * 0.82;
    const px2 = p.cx * TW, py2 = p.cy * TH;
    const r = TW * p.radius;
    ctx.save();
    ctx.globalAlpha = baseA;
    // Base lava gradient
    const g = ctx.createRadialGradient(px2, py2, 0, px2, py2, r * 1.5);
    g.addColorStop(0,   'rgba(255,210,40,0.95)');
    g.addColorStop(0.3, 'rgba(255,80,0,0.8)');
    g.addColorStop(0.65,'rgba(180,20,0,0.45)');
    g.addColorStop(1,   'rgba(80,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px2, py2, r * 1.5, r * 0.6, 0, 0, Math.PI*2); ctx.fill();
    // Animated lava bubbles
    for (let b = 0; b < 4; b++) {
      const bAng = now/700 + b * Math.PI/2;
      const bx = px2 + Math.cos(bAng) * r * 0.38;
      const by = py2 + Math.sin(bAng) * r * 0.15;
      const br = 2 + Math.abs(Math.sin(now/180 + b * 2.3)) * 3;
      ctx.globalAlpha = baseA * 0.9;
      ctx.fillStyle = 'rgba(255,230,80,0.95)';
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

function drawLavaShards() {
  LAVA_SHARDS.forEach(s => {
    const lf = s.life / s.maxLife;
    ctx.save();
    // Glow trail
    ctx.globalAlpha = lf * 0.45;
    const tg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
    tg.addColorStop(0, 'rgba(255,180,0,0.9)');
    tg.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(s.x, s.y, s.size*3, 0, Math.PI*2); ctx.fill();
    // Tumbling rock
    ctx.globalAlpha = lf * 0.95;
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.fillStyle = '#4a1800';
    ctx.fillRect(-s.size, -s.size*0.65, s.size*2, s.size*1.3);
    const cg = ctx.createRadialGradient(0,0,0, 0,0, s.size*0.9);
    cg.addColorStop(0,   'rgba(255,240,80,1)');
    cg.addColorStop(0.45,'rgba(255,100,0,0.85)');
    cg.addColorStop(1,   'rgba(180,30,0,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0,0,s.size*0.9,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

function drawLavaChargeFX(px, py, progress) {
  const now = performance.now();
  ctx.save();
  const cracksCount = 8;
  const maxLen = TW * 1.8 * progress;
  for (let i = 0; i < cracksCount; i++) {
    const baseAng = (i / cracksCount) * Math.PI * 2;
    const j1 = Math.sin(i * 7.3 + now * 0.003) * 0.22;
    const j2 = Math.sin(i * 3.7 + now * 0.004) * 0.18;
    const ang = baseAng + j1;
    const len = maxLen * (0.65 + Math.cos(i * 5.7) * 0.35);
    const col = Math.round(180 - progress * 160);
    ctx.strokeStyle = `rgba(255,${col},0,${0.4 + progress * 0.55})`;
    ctx.lineWidth = 1.5 + progress * 2;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 4 + progress * 10;
    const sx2 = px, sy2 = py + TH * 0.26;
    const m1x = sx2 + Math.cos(ang)*len*0.33 + Math.sin(ang)*len*j2;
    const m1y = sy2 + Math.sin(ang)*len*0.33*0.5 - Math.cos(ang)*len*j2*0.5;
    const m2x = sx2 + Math.cos(ang)*len*0.67 - Math.sin(ang)*len*j2*0.7;
    const m2y = sy2 + Math.sin(ang)*len*0.67*0.5 + Math.cos(ang)*len*j2*0.35;
    const ex = sx2 + Math.cos(ang)*len, ey = sy2 + Math.sin(ang)*len*0.5;
    ctx.beginPath(); ctx.moveTo(sx2, sy2);
    ctx.lineTo(m1x, m1y); ctx.lineTo(m2x, m2y); ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,220,0,${0.7*progress})`;
    ctx.beginPath(); ctx.arc(ex, ey, 2 + progress*3, 0, Math.PI*2); ctx.fill();
  }
  // Central eruption buildup
  ctx.globalAlpha = progress * 0.55;
  const cg = ctx.createRadialGradient(px, py+TH*0.26, 0, px, py+TH*0.26, TW*progress*1.2);
  cg.addColorStop(0,   'rgba(255,220,0,0.95)');
  cg.addColorStop(0.4, 'rgba(255,80,0,0.65)');
  cg.addColorStop(1,   'rgba(200,20,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(px, py+TH*0.26, TW*progress*1.2, TW*progress*0.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawLavaZombie(z) {
  if (z.dead && z.deathTimer <= 0) return;
  const px = z.cx*TW, py = z.cy*TH, sz = TW*1.5;
  const alpha = z.dead ? (z.deathTimer/28) : 1;
  const now = performance.now();
  const facing = dir8(player.cx-z.cx, player.cy-z.cy);
  const img = lavaWalk[facing]?.[z.frame];

  // Ground lava aura
  const auraA = z.state === 'charging'
    ? 0.35 + Math.abs(Math.sin(now/70)) * 0.3
    : 0.12 + Math.sin(now/400) * 0.06;
  ctx.save();
  ctx.globalAlpha = auraA * alpha;
  const ag = ctx.createRadialGradient(px, py+sz*0.38, 0, px, py+sz*0.38, sz*1.0);
  ag.addColorStop(0,   'rgba(255,120,0,0.95)');
  ag.addColorStop(0.45,'rgba(200,40,0,0.5)');
  ag.addColorStop(1,   'rgba(120,0,0,0)');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.ellipse(px, py+sz*0.38, sz*1.0, sz*0.38, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Shadow
  ctx.save(); ctx.globalAlpha = .4*alpha; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px, py+sz*.44, sz*.3, sz*.1, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();

  // Invincibility shield glow
  if (z.invincTimer > 0) {
    const invFrac = z.invincTimer / LAVA_INVINC_DURATION;
    const shieldPulse = 0.7 + Math.sin(performance.now() / 80) * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.55 * invFrac * shieldPulse * alpha;
    const sg = ctx.createRadialGradient(px, py, sz*0.3, px, py, sz*0.95);
    sg.addColorStop(0, 'rgba(255,255,100,0.8)');
    sg.addColorStop(0.5, 'rgba(255,200,0,0.4)');
    sg.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(px, py, sz*0.95, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(255,240,0,${0.9 * invFrac * shieldPulse})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(px, py, sz*0.72, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    // IMMUNE label
    ctx.save();
    ctx.globalAlpha = invFrac * (0.7 + shieldPulse * 0.3);
    ctx.fillStyle = '#ffee00';
    ctx.font = `bold ${Math.round(TH*0.24)}px Segoe UI`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
    ctx.fillText('⚡ IMMUNE', px, py - sz*0.72);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Charge ground FX (drawn under sprite)
  if (z.state === 'charging') drawLavaChargeFX(px, py, z.chargeTimer/LAVA_CHARGE_FRAMES);

  // Sprite
  ctx.save(); ctx.globalAlpha = alpha;
  if (z.hitFlash > 0) ctx.filter = 'brightness(5) sepia(1) saturate(6) hue-rotate(10deg)';
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, px-sz/2, py-sz/2, sz, sz);
  ctx.filter = 'none';
  // Charging orange tint overlay
  if (z.state === 'charging') {
    const chargePct = z.chargeTimer / LAVA_CHARGE_FRAMES;
    ctx.globalAlpha = alpha * (0.2 + chargePct * 0.35);
    ctx.fillStyle = `rgba(255,${Math.round(100 - chargePct*80)},0,1)`;
    if (img && img.complete && img.naturalWidth) ctx.fillRect(px-sz/2, py-sz/2, sz, sz);
  }
  ctx.restore();

  // HP bar
  if (!z.dead && z.hp < z.maxHp) {
    const bw = sz*.8, bh = Math.max(3, TH*.09), bx = px-bw/2, by = py-sz*.62;
    ctx.fillStyle = '#1a0000'; ctx.fillRect(bx, by, bw, bh);
    const f = z.hp/z.maxHp;
    ctx.fillStyle = f>.5?'#ff6600':f>.25?'#ff2200':'#aa0000';
    ctx.fillRect(bx, by, bw*f, bh);
  }
  // Name tag
  if (!z.dead) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,100,0,0.95)';
    ctx.font = `bold ${Math.round(TH*.22)}px Segoe UI`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
    ctx.fillText('\uD83C\uDF0B LAVA', px, py - sz*.62);
    ctx.restore();
  }
}

// ─── EXPLODERS ─────────────────────────────────────────────────────────────────
// Fast suicide bombers — chase player and explode on contact
const EXPLODERS = [];
const EXPLODER_SPEED         = 0.030;
const EXPLODER_EXPLODE_RADIUS = 2.6;  // tiles AoE
const EXPLODER_TRIGGER_DIST  = 0.85; // tiles — explode when this close
const EXPLODER_DMG           = 50;

function exploderCount(round) {
  if (round < 8) return 0;
  return Math.floor((round - 8) / 5) + 1;  // r8:1  r13:2  r18:3 ...
}

function spawnExploder() {
  const pts = getSpawnTiles();
  const sp  = pts[Math.floor(Math.random() * pts.length)];
  const hp  = Math.round((30 + game.round * 8) * enemyHpScale(game.round));
  return {
    cx: sp.cx + (Math.random()-.5)*.4, cy: sp.cy + (Math.random()-.5)*.4,
    hp, maxHp: hp,
    dead: false, deathTimer: 0, hitFlash: 0, vx: 0, vy: 0,
    exploded: false,
  };
}

function triggerExplosion(e) {
  if (e.exploded) return;
  e.exploded = true; e.dead = true; e.deathTimer = 30;
  const falloffMin = 0.3;
  if (!player.dead && !player.downed) {
    const d = Math.hypot(player.cx - e.cx, player.cy - e.cy);
    if (d < EXPLODER_EXPLODE_RADIUS) {
      const falloff = Math.max(falloffMin, 1 - d / EXPLODER_EXPLODE_RADIUS);
      const dmg = Math.round(EXPLODER_DMG * falloff);
      applyDamage(player, dmg);
      if (player.hp <= 0) playerGoDown();
    }
  }
  spawnEffect('explosion', e.cx * TW, e.cy * TH, { radius: EXPLODER_EXPLODE_RADIUS * TW });
}

function hitExploder(e, wkey, papMult) {
  papMult = papMult || 1;
  if (e.exploded) return;
  const { dmg: rawDmg, crit } = rollDamage(WEAPONS[wkey].baseDmg);
  const dmg = Math.round(rawDmg * papMult);
  e.hp -= dmg; e.hitFlash = 7;
  spawnDmgNum(e.cx*TW, e.cy*TH - TH*.4, dmg, crit ? '#cc44ff' : '#ff6600');
  if (e.hp <= 0) {
    triggerExplosion(e);
    game.kills++; game.score += 25;
    spawnCoin(e.cx + (Math.random()-.5)*.4, e.cy + (Math.random()-.5)*.4, 20 + game.round * 5);
    spawnPerk(e.cx, e.cy);
    if (player.perks.lifesteal > 0 && !player.dead) {
      const heal = LIFESTEAL_HP[player.perks.lifesteal];
      player.hp = Math.min(player.maxHp, player.hp + heal);
      spawnDmgNum(player.cx*TW, player.cy*TH - TH*.6, heal, '#44ff88');
    }
  }
}

function updateExploders() {
  EXPLODERS.forEach(e => {
    if (e.dead) { if (e.deathTimer > 0) e.deathTimer--; return; }
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.vx || e.vy) {
      const nx = e.cx + e.vx, ny = e.cy + e.vy;
      if (!isBlocked(nx, e.cy)) e.cx = nx; else e.vx = 0;
      if (!isBlocked(e.cx, ny)) e.cy = ny; else e.vy = 0;
      e.vx *= 0.78; e.vy *= 0.78;
      if (Math.abs(e.vx) < 0.005) e.vx = 0;
      if (Math.abs(e.vy) < 0.005) e.vy = 0;
    }
    const tgt = nearestPlayerTo(e.cx, e.cy);
    const dx = tgt.cx - e.cx, dy = tgt.cy - e.cy, dist = Math.hypot(dx, dy) || 1;
    const spd = EXPLODER_SPEED + game.round * 0.001;
    if (dist > 0.4) { e.cx += (dx/dist)*spd; e.cy += (dy/dist)*spd; }
    if (dist < EXPLODER_TRIGGER_DIST && !tgt.dead && !tgt.downed && game.state === 'playing') {
      triggerExplosion(e);
    }
  });
  for (let i = EXPLODERS.length-1; i >= 0; i--) {
    if (EXPLODERS[i].dead && EXPLODERS[i].deathTimer <= 0) EXPLODERS.splice(i, 1);
  }
}

function drawExploder(e) {
  if (e.dead && e.deathTimer <= 0) return;
  const px = e.cx * TW, py = e.cy * TH;

  // Expanding explosion ring on death
  if (e.dead && e.exploded) {
    const p2 = 1 - e.deathTimer / 30;
    const r  = p2 * EXPLODER_EXPLODE_RADIUS * TW * 1.4;
    const a2 = e.deathTimer / 30;
    ctx.save();
    const g2 = ctx.createRadialGradient(px, py, r*0.2, px, py, r);
    g2.addColorStop(0,   `rgba(255,220,60,${a2*0.95})`);
    g2.addColorStop(0.4, `rgba(255,100,0,${a2*0.7})`);
    g2.addColorStop(1,   'rgba(200,30,0,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(255,180,0,${a2*0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    return;
  }

  const dist   = Math.hypot(player.cx - e.cx, player.cy - e.cy);
  const fuse   = Math.max(0, 1 - dist / 5.0);       // 0→1 as it closes in
  const pulse  = 0.85 + Math.sin(performance.now() / Math.max(20, 120 - fuse*100)) * 0.15;
  const alpha2 = e.dead ? (e.deathTimer / 25) : 1;

  ctx.save();
  ctx.globalAlpha = alpha2;

  // Danger glow — intensifies as it approaches
  const glowR = TW * (0.9 + fuse*1.8) * pulse;
  const glow2 = ctx.createRadialGradient(px, py, 0, px, py, glowR);
  glow2.addColorStop(0, `rgba(255,160,0,${0.25 + fuse*0.55})`);
  glow2.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.beginPath(); ctx.arc(px, py, glowR, 0, Math.PI*2); ctx.fill();

  // Body
  const bodyR = TW * 0.50;
  const bg2 = ctx.createRadialGradient(px - TW*.1, py - TH*.1, 0, px, py, bodyR);
  bg2.addColorStop(0, `rgb(255,${Math.round(180 - fuse*160)},0)`);
  bg2.addColorStop(1, `rgb(${Math.round(180 - fuse*100)},0,0)`);
  ctx.fillStyle = bg2;
  ctx.beginPath(); ctx.arc(px, py, bodyR, 0, Math.PI*2); ctx.fill();

  // Shadow
  ctx.globalAlpha = 0.35 * alpha2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px, py + bodyR*0.8, bodyR*0.65, bodyR*0.18, 0, 0, Math.PI*2); ctx.fill();

  // Warning label
  ctx.globalAlpha = (0.8 + fuse*0.2) * alpha2;
  ctx.fillStyle = fuse > 0.5 ? '#fff' : '#ffdd44';
  ctx.font = `bold ${Math.round(TW * 0.42)}px monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(fuse > 0.6 ? '!!!' : '!', px, py);

  // HP bar
  if (e.hp < e.maxHp) {
    const bw = TW, bh = Math.max(3, TH*.09), bx = px - bw/2, by = py - bodyR - bh - 3;
    ctx.globalAlpha = alpha2;
    ctx.fillStyle = '#1a0000'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ff4400'; ctx.fillRect(bx, by, bw*(e.hp/e.maxHp), bh);
  }

  ctx.restore();
}


// ─── PHANTOMS ──────────────────────────────────────────────────────────────────
// Ghostly enemies that phase through walls and go temporarily invincible
const PHANTOMS = [];
const PHANTOM_SPEED           = 0.024;
const PHANTOM_INVINC_INTERVAL = 220;  // frames between phase shifts
const PHANTOM_INVINC_DURATION = 90;   // 1.5 s invincible

function phantomCount(round) {
  if (round < 13) return 0;
  return Math.floor((round - 13) / 5) + 1;  // r13:1  r18:2  r23:3 ...
}

function spawnPhantom() {
  const pts = getSpawnTiles();
  const sp  = pts[Math.floor(Math.random() * pts.length)];
  const hp  = Math.round((70 + game.round * 15) * enemyHpScale(game.round));
  return {
    cx: sp.cx, cy: sp.cy,
    hp, maxHp: hp,
    dead: false, deathTimer: 0, hitFlash: 0,
    invincTimer: 0,
    phaseTimer: Math.random() * PHANTOM_INVINC_INTERVAL | 0,
  };
}

function hitPhantom(ph, wkey, papMult) {
  papMult = papMult || 1;
  if (ph.invincTimer > 0) return;  // phasing — untouchable
  const { dmg: rawDmg, crit } = rollDamage(WEAPONS[wkey].baseDmg);
  const dmg = Math.round(rawDmg * papMult);
  ph.hp -= dmg; ph.hitFlash = 7;
  spawnDmgNum(ph.cx*TW, ph.cy*TH - TH*.4, dmg, crit ? '#cc44ff' : '#aaddff');
  if (ph.hp <= 0) {
    ph.dead = true; ph.deathTimer = 25;
    game.kills++; game.score += 30;
    spawnCoin(ph.cx, ph.cy, 25 + game.round * 6);
    spawnPerk(ph.cx, ph.cy);
    if (player.perks.lifesteal > 0 && !player.dead) {
      const heal = LIFESTEAL_HP[player.perks.lifesteal];
      player.hp = Math.min(player.maxHp, player.hp + heal);
      spawnDmgNum(player.cx*TW, player.cy*TH - TH*.6, heal, '#44ff88');
    }
  }
}

function updatePhantoms() {
  PHANTOMS.forEach(ph => {
    if (ph.dead) { if (ph.deathTimer > 0) ph.deathTimer--; return; }
    if (ph.hitFlash > 0) ph.hitFlash--;
    // Invincibility cycle
    if (ph.invincTimer > 0) {
      ph.invincTimer--;
    } else {
      ph.phaseTimer++;
      if (ph.phaseTimer >= PHANTOM_INVINC_INTERVAL) {
        ph.phaseTimer = 0;
        ph.invincTimer = PHANTOM_INVINC_DURATION;
      }
    }
    // Moves through walls (no isBlocked)
    const tgt = nearestPlayerTo(ph.cx, ph.cy);
    const dx = tgt.cx - ph.cx, dy = tgt.cy - ph.cy, dist = Math.hypot(dx, dy) || 1;
    const spd = PHANTOM_SPEED + game.round * 0.0007;
    if (dist > 0.35) { ph.cx += (dx/dist)*spd; ph.cy += (dy/dist)*spd; }
    // Contact: damage player then teleport away
    if (dist < 0.6 && tgt.hurtTimer <= 0 && !tgt.dead && !tgt.downed && game.state === 'playing') {
      const dmg = 15 + Math.floor(game.round / 3) * 3;
      applyDamage(tgt, dmg);
      if (tgt === player && tgt.hp <= 0) playerGoDown();
      // Teleport to random spawn point
      const spPts = getSpawnTiles();
      const sp2 = spPts[Math.floor(Math.random() * spPts.length)];
      ph.cx = sp2.cx + (Math.random()-.5)*.6;
      ph.cy = sp2.cy + (Math.random()-.5)*.6;
    }
  });
  for (let i = PHANTOMS.length-1; i >= 0; i--) {
    if (PHANTOMS[i].dead && PHANTOMS[i].deathTimer <= 0) PHANTOMS.splice(i, 1);
  }
}

function drawPhantom(ph) {
  if (ph.dead && ph.deathTimer <= 0) return;
  const px = ph.cx * TW, py = ph.cy * TH;
  const sz = TW * 1.3;
  const isInvinc = ph.invincTimer > 0;
  const baseAlpha = ph.dead
    ? (ph.deathTimer / 25)
    : isInvinc
      ? 0.22 + Math.abs(Math.sin(performance.now() / 55)) * 0.20
      : 0.88;

  ctx.save();
  ctx.globalAlpha = baseAlpha;

  // Ethereal outer glow
  const eg = ctx.createRadialGradient(px, py, 0, px, py, sz*1.2);
  eg.addColorStop(0, isInvinc ? 'rgba(200,240,255,0.35)' : 'rgba(120,160,255,0.28)');
  eg.addColorStop(1, 'rgba(40,60,200,0)');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.arc(px, py, sz*1.2, 0, Math.PI*2); ctx.fill();

  // Ghost body
  const bg3 = ctx.createRadialGradient(px, py - sz*.1, 0, px, py + sz*.15, sz*.55);
  bg3.addColorStop(0, isInvinc ? 'rgba(230,245,255,0.98)' : 'rgba(170,200,255,0.95)');
  bg3.addColorStop(0.55, isInvinc ? 'rgba(140,200,255,0.65)' : 'rgba(80,120,255,0.7)');
  bg3.addColorStop(1, 'rgba(20,40,180,0)');
  ctx.fillStyle = bg3;
  ctx.beginPath(); ctx.ellipse(px, py, sz*0.38, sz*0.55, 0, 0, Math.PI*2); ctx.fill();

  // Wispy tail (three wavy bumps at bottom)
  ctx.fillStyle = isInvinc ? 'rgba(200,230,255,0.45)' : 'rgba(80,120,255,0.35)';
  const tailY = py + sz * 0.42;
  for (let t = 0; t < 3; t++) {
    const tx2 = px + (t - 1) * sz * 0.28;
    const wobble = Math.sin(performance.now() / 180 + t * 1.5) * sz * 0.06;
    ctx.beginPath(); ctx.ellipse(tx2, tailY + wobble, sz*0.12, sz*0.16, 0, 0, Math.PI*2); ctx.fill();
  }

  if (!isInvinc) {
    // Dark hollow eyes
    ctx.fillStyle = 'rgba(5,0,35,0.95)';
    ctx.beginPath(); ctx.ellipse(px - sz*0.12, py - sz*0.05, sz*0.07, sz*0.09, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + sz*0.12, py - sz*0.05, sz*0.07, sz*0.09, 0, 0, Math.PI*2); ctx.fill();
    // Eye glow
    ctx.fillStyle = 'rgba(150,80,255,0.6)';
    ctx.beginPath(); ctx.ellipse(px - sz*0.12, py - sz*0.05, sz*0.03, sz*0.04, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + sz*0.12, py - sz*0.05, sz*0.03, sz*0.04, 0, 0, Math.PI*2); ctx.fill();
  } else {
    // IMMUNE label while phasing
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#c0e8ff';
    ctx.font = `bold ${Math.round(TH*0.22)}px Segoe UI`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#80c0ff'; ctx.shadowBlur = 8;
    ctx.fillText('PHASING', px, py - sz*0.65);
    ctx.shadowBlur = 0;
  }

  // HP bar (only when not phasing)
  if (!ph.dead && ph.hp < ph.maxHp && !isInvinc) {
    const bw = sz*.9, bh = Math.max(3, TH*.09), bx = px-bw/2, by = py-sz*.75;
    ctx.globalAlpha = baseAlpha;
    ctx.fillStyle = '#0a0a20'; ctx.fillRect(bx, by, bw, bh);
    const f = ph.hp/ph.maxHp;
    ctx.fillStyle = f>.5 ? '#6699ff' : f>.25 ? '#9966ff' : '#cc44ff';
    ctx.fillRect(bx, by, bw*f, bh);
  }

  ctx.restore();
}

// ─── MERCENARY ────────────────────────────────────────────────────────────────
const MERC_COST      = 5000;
const MERC_SPEED     = 0.030;
const MERC_RANGE     = 9;
const MERC_HP        = 300;
const MERC_FIRE_RATE = 25;

const mercenary = {
  active: false,
  cx: PLAYER_START.cx, cy: PLAYER_START.cy,
  hp: MERC_HP, maxHp: MERC_HP,
  frame: 0, ft: 0,
  hitFlash: 0,
  shootTimer: 0,
};

function resetMercenary() {
  mercenary.active = false;
  mercenary.cx = PLAYER_START.cx;
  mercenary.cy = PLAYER_START.cy;
  mercenary.hp = MERC_HP;
  mercenary.frame = 0; mercenary.ft = 0;
  mercenary.hitFlash = 0; mercenary.shootTimer = 0;
}

function updateMercenary() {
  if (!player.upgrades || !player.upgrades.mercenary) return;
  // Spawn at player position the first frame after being hired
  if (!mercenary.active) {
    mercenary.active = true;
    mercenary.cx = player.cx;
    mercenary.cy = player.cy;
    mercenary.hp = MERC_HP;
  }

  const dx = player.cx - mercenary.cx;
  const dy = player.cy - mercenary.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > 1.4) {
    const spd = MERC_SPEED * Math.min(1 + (dist - 1.4) * 0.4, 2.8);
    const nx = mercenary.cx + (dx / dist) * spd;
    const ny = mercenary.cy + (dy / dist) * spd;
    if (!isBlocked(nx, mercenary.cy)) mercenary.cx = nx;
    if (!isBlocked(mercenary.cx, ny)) mercenary.cy = ny;
  }

  let nearestDist = MERC_RANGE;
  let nearestTarget = null;
  const allEnemies = [
    ...ZOMBIES, ...SKELETONS, ...DRAGONS,
    ...LAVA_ZOMBIES, ...EXPLODERS, ...PHANTOMS,
    ...BOSS_DEMONS, ...SPIDER_BOSSES, ...SPIDER_MINIONS,
  ];
  for (const en of allEnemies) {
    if (en.dead) continue;
    const ed = Math.hypot(en.cx - mercenary.cx, en.cy - mercenary.cy);
    if (ed < nearestDist) { nearestDist = ed; nearestTarget = en; }
  }

  if (mercenary.shootTimer > 0) mercenary.shootTimer--;
  if (nearestTarget && mercenary.shootTimer <= 0) {
    const angle = Math.atan2(
      nearestTarget.cy - mercenary.cy,
      nearestTarget.cx - mercenary.cx
    );
    spawnBullet(mercenary.cx * TW, mercenary.cy * TH, angle, 'pistol');
    mercenary.shootTimer = MERC_FIRE_RATE;
  }

  mercenary.ft += 1 / 60;
  if (mercenary.ft >= 0.13) { mercenary.frame = (mercenary.frame + 1) % 6; mercenary.ft = 0; }
  if (mercenary.hitFlash > 0) mercenary.hitFlash--;
}

function drawMercenary() {
  if (!mercenary.active) return;
  const px = mercenary.cx * TW, py = mercenary.cy * TH;
  const sz = TW * 1.4;

  ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px, py + sz * 0.44, sz * 0.28, sz * 0.10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const aura = ctx.createRadialGradient(px, py, 0, px, py, sz * 0.9);
  aura.addColorStop(0, 'rgba(60,130,255,0.22)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(px, py, sz * 0.9, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  if (mercenary.hitFlash > 0) ctx.filter = 'brightness(4) saturate(0.2)';
  if (knightImg.complete && knightImg.naturalWidth) {
    ctx.drawImage(knightImg, px - sz / 2, py - sz / 2, sz, sz);
  } else {
    ctx.fillStyle = '#4488ff';
    ctx.beginPath(); ctx.arc(px, py, sz * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = 'none';
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = `bold ${Math.round(TH * 0.22)}px Segoe UI`;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText('MERC', px + 1, py - sz * 0.62 + 1);
  ctx.fillStyle = '#88ccff'; ctx.fillText('MERC', px, py - sz * 0.62);
  ctx.restore();

  const bw = sz * 0.85, bh = Math.max(3, TH * 0.09), bx = px - bw / 2, by = py - sz * 0.70;
  ctx.fillStyle = '#0a1428'; ctx.fillRect(bx, by, bw, bh);
  const f = mercenary.hp / mercenary.maxHp;
  ctx.fillStyle = f > 0.5 ? '#3388ff' : f > 0.25 ? '#1155cc' : '#cc2244';
  ctx.fillRect(bx, by, bw * f, bh);
}
