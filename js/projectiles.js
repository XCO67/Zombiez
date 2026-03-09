
// ─── PROJECTILES ─────────────────────────────────────────────────────────────
let shootTimer=0, muzzleFlash=0, muzzleColor='#fffbe0';
const projectiles = [];

function getW() { return WEAPONS[player.weaponKey]; }
function getFireRate() {
  const base = getW().fireRate;
  // Each atk speed level reduces fire rate by 15%, minimum 40% of base
  return Math.max(Math.round(base * 0.4), Math.round(base * Math.pow(0.85, player.upgrades.atkSpeed)));
}
function rollDamage(baseDmg) {
  // Exponential damage scaling: each level ×1.5 (L1=×1.5, L5=×7.6)
  const total = Math.round(baseDmg * Math.pow(1.5, player.upgrades.damage));
  const crit = Math.random() < player.upgrades.crit * 0.1;
  return { dmg: crit ? total*2 : total, crit };
}

function spawnBullet(sx,sy,angle,wkey) {
  const w=WEAPONS[wkey];
  const papped = player.packedWeapons.has(wkey);
  projectiles.push({
    x:sx, y:sy,
    vx:Math.cos(angle)*w.speed, vy:Math.sin(angle)*w.speed,
    trail:[], life:90, wkey, papped,
  });
}

// Central damage function — routes through shield for the local player
function applyDamage(tgt, amount) {
  if (tgt === player && player.barrierTimer > 0) return; // barrier blocks all damage
  if (tgt === player && player.shield > 0) {
    const absorbed = Math.min(player.shield, amount);
    player.shield = Math.max(0, player.shield - absorbed);
    player.shieldRechargeTimer = SHIELD_DELAY[player.perks.shield] || 0;
    amount -= absorbed;
    if (amount <= 0) { tgt.hurtTimer = 45; return; }
  }
  tgt.hp = Math.max(0, tgt.hp - amount);
  tgt.hurtTimer = 45;
}

function tryShoot() {
  if (player.dead||game.state!=='playing'||shopOpen) return;
  if (shootTimer>0){shootTimer--;return;}
  if (!mouse.down) return;
  const w=getW();
  if (player.ammo<=0) { muzzleFlash=2; return; }
  // Pistol heat: block firing when overheated
  if (player.weaponKey==='pistol' && player.overheated) return;
  shootTimer=getFireRate();
  const sx=player.cx*TW, sy=player.cy*TH;
  const baseAngle=Math.atan2((mouse.y+camY)-sy, (mouse.x+camX)-sx);

  if (w.wave) {
    // Thundergun: wind wave AoE, no projectile
    fireWindWave(sx, sy, baseAngle);
  } else {
    // Pistol spread upgrade: fixed-angle extra bullets (not random spread)
    if (player.weaponKey === 'pistol' && player.pistolSpread >= 1) {
      const offsets = player.pistolSpread >= 2 ? [-0.18, 0, 0.18] : [-0.13, 0.13];
      for (const off of offsets) spawnBullet(sx, sy, baseAngle + off, 'pistol');
    } else {
      for(let i=0;i<w.pellets;i++){
        const ang = baseAngle + (Math.random()-.5)*w.spread*2;
        spawnBullet(sx,sy,ang,player.weaponKey);
      }
    }
    muzzleFlash=6; muzzleColor=w.color;
  }

  if(player.ammo!==Infinity) player.ammo=Math.max(0,player.ammo-1);

  if(player.weaponKey==='pistol') {
    playPistolSound();
    player.heat = Math.min(100, player.heat + 8);
    if (player.heat >= 100) {
      player.overheated = true;
      playOverheatSound();
    }
  }
}

function swapWeapon() {
  if (!player.secondaryKey || player.dead) return;
  if (player.weaponKey === 'pistol') {
    player.weaponKey = player.secondaryKey;
    player.ammo = player.secondaryAmmo;
  } else {
    player.secondaryAmmo = player.ammo;
    player.weaponKey = 'pistol';
    player.ammo = Infinity;
    // heat keeps ticking normally when holstered
  }
}

// Wind wave: instant cone AoE, range in tiles
const WAVE_RANGE   = 10;   // tiles
const WAVE_HALFANG = 0.72; // ±~41° cone half-angle

function fireWindWave(sx, sy, angle) {
  // Hit all zombies inside the cone
  ZOMBIES.forEach(z => {
    const dx = z.cx*TW - sx, dy = z.cy*TH - sy;
    const dist = Math.hypot(dx, dy);
    if (dist > WAVE_RANGE * TW) return;
    const zAng = Math.atan2(dy, dx);
    let diff = zAng - angle;
    // Normalise to [-π, π]
    while (diff >  Math.PI) diff -= Math.PI*2;
    while (diff < -Math.PI) diff += Math.PI*2;
    if (Math.abs(diff) > WAVE_HALFANG) return;

    const {dmg, crit} = rollDamage(WEAPONS.thundergun.baseDmg);
    z.hp -= dmg; z.hitFlash = 10;
    spawnDmgNum(z.cx*TW, z.cy*TH - TH*.35, dmg, crit ? '#cc44ff' : '#60e8ff');
    // Strong knockback away from player
    const nd = dist || 1;
    z.vx = (dx/nd) * 0.9;
    z.vy = (dy/nd) * 0.9;
    if (z.hp <= 0) {
      game.kills++; game.score += 10;
      spawnCoin(z.cx, z.cy, 20 + game.round * 5);
      spawnPerk(z.cx, z.cy);
    }
  });
  // Also hit dragons with the wave
  DRAGONS.forEach(d => {
    if (d.dead) return;
    const dx=d.cx*TW-sx, dy=d.cy*TH-sy, dist=Math.hypot(dx,dy);
    if (dist > WAVE_RANGE*TW) return;
    const zAng=Math.atan2(dy,dx);
    let diff=zAng-angle;
    while(diff> Math.PI) diff-=Math.PI*2;
    while(diff<-Math.PI) diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    const {dmg,crit}=rollDamage(WEAPONS.thundergun.baseDmg);
    d.hp-=dmg; d.hitFlash=9;
    spawnDmgNum(d.cx*TW,d.cy*TH-TW*.7,dmg,crit?'#cc44ff':'#60e8ff');
    const nd=dist||1; d.vx=(dx/nd)*.7; d.vy=(dy/nd)*.7;
    if(d.hp<=0){
      d.dead=true; d.deathTimer=30; game.kills++; game.score+=50;
      spawnCoin(d.cx,d.cy,60+game.round*10);
      const type=Math.random()<.5?'doublePoints':'magnet';
      DROPPED_PERKS.push({cx:d.cx,cy:d.cy,type,bob:0,life:600});
    }
  });
  // Skeletons hit by wave
  SKELETONS.forEach(s=>{
    if(s.dead) return;
    const dx=s.cx*TW-sx,dy=s.cy*TH-sy,dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const zAng=Math.atan2(dy,dx); let diff=zAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    const {dmg,crit}=rollDamage(WEAPONS.thundergun.baseDmg);
    s.hp-=dmg; s.hitFlash=7;
    spawnDmgNum(s.cx*TW,s.cy*TH-TH*.4,dmg,crit?'#cc44ff':'#60e8ff');
    const nd2=dist||1; s.vx=(dx/nd2)*.9; s.vy=(dy/nd2)*.9;
    if(s.hp<=0){s.dead=true;s.deathTimer=22;game.kills++;game.score+=15;
      spawnCoin(s.cx,s.cy,15+game.round*3);spawnPerk(s.cx,s.cy);}
  });
  // Boss hit by wave
  BOSS_DEMONS.forEach(b => {
    if(b.dead) return;
    const dx=b.cx*TW-sx, dy=b.cy*TH-sy, dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const bAng=Math.atan2(dy,dx); let diff=bAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    hitBoss(b,'thundergun',1);
  });
  // Spider boss hit by wave
  SPIDER_BOSSES.forEach(b => {
    if(b.dead) return;
    const dx=b.cx*TW-sx, dy=b.cy*TH-sy, dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const bAng=Math.atan2(dy,dx); let diff=bAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    hitSpiderBoss(b,'thundergun',1);
  });
  // Spider minions hit by wave
  SPIDER_MINIONS.forEach(m=>{
    if(m.dead) return;
    const dx=m.cx*TW-sx,dy=m.cy*TH-sy,dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const mAng=Math.atan2(dy,dx); let diff=mAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    hitSpiderMinion(m,'thundergun',1);
  });
  // Lava zombies hit by wave
  LAVA_ZOMBIES.forEach(lz=>{
    if(lz.dead) return;
    const dx=lz.cx*TW-sx,dy=lz.cy*TH-sy,dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const lAng=Math.atan2(dy,dx); let diff=lAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    hitLavaZombie(lz,'thundergun',1);
    const nd=dist||1; lz.vx=(dx/nd)*.8; lz.vy=(dy/nd)*.8;
  });
  // Exploders hit by wave
  EXPLODERS.forEach(ex=>{
    if(ex.dead) return;
    const dx=ex.cx*TW-sx,dy=ex.cy*TH-sy,dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const eAng=Math.atan2(dy,dx); let diff=eAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    hitExploder(ex,'thundergun',1);
  });
  // Phantoms hit by wave
  PHANTOMS.forEach(ph=>{
    if(ph.dead) return;
    const dx=ph.cx*TW-sx,dy=ph.cy*TH-sy,dist=Math.hypot(dx,dy);
    if(dist>WAVE_RANGE*TW) return;
    const pAng=Math.atan2(dy,dx); let diff=pAng-angle;
    while(diff> Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>WAVE_HALFANG) return;
    hitPhantom(ph,'thundergun',1);
  });
  // Remove dead zombies killed by wave
  for (let i = ZOMBIES.length-1; i >= 0; i--) {
    if (ZOMBIES[i].hp <= 0) ZOMBIES.splice(i, 1);
  }
  // Spawn visual
  spawnEffect('windwave', sx, sy, { ang: angle, halfAng: WAVE_HALFANG, range: WAVE_RANGE });
  muzzleFlash = 10; muzzleColor = '#60e8ff';
}

function hitZombie(z, wkey, px, py, papMult=1) {
  const w=WEAPONS[wkey];
  const {dmg:rawDmg,crit}=rollDamage(w.baseDmg);
  const dmg = Math.round(rawDmg * papMult);
  z.hp-=dmg; z.hitFlash=7;
  const numColor = papMult>1 ? `hsl(${(performance.now()/4)%360},100%,65%)` : (crit?'#cc44ff':'#ff4444');
  spawnDmgNum(z.cx*TW, z.cy*TH-TH*.35, dmg, numColor);
  if(z.hp<=0){
    z.dead=true; z.deathTimer=25; game.kills++; game.score+=10;
    const drop=5+Math.floor(Math.random()*game.round*3+10);
    spawnCoin(z.cx+(.5-Math.random())*.4, z.cy+(.5-Math.random())*.4, drop);
    spawnPerk(z.cx, z.cy);
    if(player.perks.lifesteal>0&&!player.dead){
      const heal=LIFESTEAL_HP[player.perks.lifesteal];
      player.hp=Math.min(player.maxHp,player.hp+heal);
      spawnDmgNum(player.cx*TW,player.cy*TH-TH*.6,heal,'#44ff88');
    }
  }
}

function updateProjectiles() {
  for (let i=projectiles.length-1;i>=0;i--) {
    const p=projectiles[i]; const w=WEAPONS[p.wkey];
    p.trail.unshift({x:p.x,y:p.y}); if(p.trail.length>8) p.trail.pop();
    p.x+=p.vx; p.y+=p.vy; p.life--;
    const tc=p.x/TW|0, tr=p.y/TH|0;
    const wallHit=p.life<=0||tr<0||tr>=MAP_H||tc<0||tc>=MAP_W||MAP[tr]?.[tc]===T.WALL||MAP[tr]?.[tc]===T.PILLAR;
    if(wallHit){
      // (legacy thunder effect removed — thundergun now uses wind wave)
      projectiles.splice(i,1); continue;
    }
    // Zombie hits
    let hitAny=false;
    for(let zi=0;zi<ZOMBIES.length;zi++){
      const z=ZOMBIES[zi]; if(z.dead) continue;
      if(Math.hypot(p.x-z.cx*TW,p.y-z.cy*TH)<TW*w.hitR){
        hitZombie(z,p.wkey,p.x,p.y, p.papped?3:1);
        hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Dragon hits
    for(let di=0;di<DRAGONS.length;di++){
      const d=DRAGONS[di]; if(d.dead) continue;
      if(Math.hypot(p.x-d.cx*TW,p.y-d.cy*TH)<TW*(w.hitR+0.3)){
        hitDragon(d,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Skeleton hits
    for(let si=0;si<SKELETONS.length;si++){
      const s=SKELETONS[si]; if(s.dead) continue;
      if(Math.hypot(p.x-s.cx*TW,p.y-s.cy*TH)<TW*w.hitR){
        hitSkeleton(s,p.wkey,p.papped?3:1);
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Boss hits
    for(let bi=0;bi<BOSS_DEMONS.length;bi++){
      const b=BOSS_DEMONS[bi]; if(b.dead) continue;
      if(Math.hypot(p.x-b.cx*TW,p.y-b.cy*TH)<TW*1.6){
        hitBoss(b,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Spider boss hits
    for(let bi=0;bi<SPIDER_BOSSES.length;bi++){
      const b=SPIDER_BOSSES[bi]; if(b.dead) continue;
      if(Math.hypot(p.x-b.cx*TW,p.y-b.cy*TH)<TW*2.0){
        hitSpiderBoss(b,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Spider minion hits
    for(let mi=0;mi<SPIDER_MINIONS.length;mi++){
      const m=SPIDER_MINIONS[mi]; if(m.dead) continue;
      if(Math.hypot(p.x-m.cx*TW,p.y-m.cy*TH)<TW*w.hitR){
        hitSpiderMinion(m,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Lava zombie hits
    for(let li=0;li<LAVA_ZOMBIES.length;li++){
      const lz=LAVA_ZOMBIES[li]; if(lz.dead) continue;
      if(Math.hypot(p.x-lz.cx*TW,p.y-lz.cy*TH)<TW*w.hitR){
        hitLavaZombie(lz,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Exploder hits
    for(let ei=0;ei<EXPLODERS.length;ei++){
      const ex=EXPLODERS[ei]; if(ex.dead) continue;
      if(Math.hypot(p.x-ex.cx*TW,p.y-ex.cy*TH)<TW*w.hitR){
        hitExploder(ex,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
    if(hitAny) continue;
    // Phantom hits
    for(let phi=0;phi<PHANTOMS.length;phi++){
      const ph=PHANTOMS[phi]; if(ph.dead) continue;
      if(Math.hypot(p.x-ph.cx*TW,p.y-ph.cy*TH)<TW*w.hitR){
        hitPhantom(ph,p.wkey,p.papped?3:1); hitAny=true;
        if(!w.pierce){ projectiles.splice(i,1); break; }
      }
    }
  }
}

function drawProjectiles() {
  // Muzzle flash
  if(muzzleFlash>0){
    const px=player.cx*TW,py=player.cy*TH,a=muzzleFlash/12;
    ctx.save(); ctx.globalAlpha=a*.75;
    const r=getW().wave?TW*2.2:TW*.9;
    const g=ctx.createRadialGradient(px,py,0,px,py,r);
    g.addColorStop(0,'rgba(255,255,220,1)');
    g.addColorStop(.4,muzzleColor+'cc');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
    ctx.restore(); muzzleFlash--;
  }

  projectiles.forEach(p=>{
    const w=WEAPONS[p.wkey];
    ctx.save();
    // Pack-a-Punch: rainbow overrides normal rendering for non-thundergun bullets
    if(p.papped && p.wkey!=='thundergun'){
      const rh=(performance.now()/4+p.x*0.3+p.y*0.3)%360;
      const rh2=(rh+120)%360;
      p.trail.forEach((pos,i)=>{
        ctx.globalAlpha=(1-i/p.trail.length)*.45;
        const th=(rh+i*30)%360;
        ctx.fillStyle=`hsl(${th},100%,60%)`;
        ctx.beginPath(); ctx.arc(pos.x,pos.y,TW*.08,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
      const rg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,TW*.32);
      rg.addColorStop(0,'rgba(255,255,255,1)');
      rg.addColorStop(0.3,`hsla(${rh},100%,65%,0.9)`);
      rg.addColorStop(0.7,`hsla(${rh2},100%,55%,0.5)`);
      rg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.32,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.07,0,Math.PI*2); ctx.fill();
      ctx.restore(); return;
    }
    if(p.wkey==='thundergun'){
      // Thunder: large golden energy ball with electric halo
      const age=1-p.life/90, r=TW*(0.6+age*.3);
      p.trail.forEach((pos,i)=>{
        ctx.globalAlpha=(1-i/p.trail.length)*.4;
        const g2=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,r*.8);
        g2.addColorStop(0,'rgba(255,230,80,0.8)'); g2.addColorStop(1,'rgba(255,120,0,0)');
        ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(pos.x,pos.y,r*.8,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*1.4);
      g.addColorStop(0,'rgba(255,255,200,1)');
      g.addColorStop(.35,'rgba(255,210,50,0.95)');
      g.addColorStop(.7,'rgba(255,120,0,0.5)');
      g.addColorStop(1,'rgba(255,60,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,r*1.4,0,Math.PI*2); ctx.fill();
      // Rotating electric arcs
      const spk=performance.now()/120;
      ctx.strokeStyle='rgba(255,255,150,0.85)'; ctx.lineWidth=1.5;
      for(let k=0;k<5;k++){
        const a=spk+k*1.257;
        ctx.beginPath();
        ctx.moveTo(p.x+Math.cos(a)*r*.4, p.y+Math.sin(a)*r*.4);
        ctx.lineTo(p.x+Math.cos(a+.6)*r, p.y+Math.sin(a+.6)*r);
        ctx.stroke();
      }
      // White core
      ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.14,0,Math.PI*2); ctx.fill();

    } else if(p.wkey==='shotgun'){
      // Shotgun: orange elongated pellet
      p.trail.forEach((pos,i)=>{
        ctx.globalAlpha=(1-i/p.trail.length)*.25;
        ctx.fillStyle=w.trail; ctx.beginPath(); ctx.arc(pos.x,pos.y,TW*.07,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
      const angle=Math.atan2(p.vy,p.vx);
      ctx.translate(p.x,p.y); ctx.rotate(angle);
      const g=ctx.createRadialGradient(0,0,0,0,0,TW*.22);
      g.addColorStop(0,'rgba(255,240,180,1)');g.addColorStop(.5,'rgba(255,180,50,0.8)');g.addColorStop(1,'rgba(255,100,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,TW*.22,TW*.1,0,0,Math.PI*2); ctx.fill();

    } else if(p.wkey==='smg'){
      // SMG: fast thin red tracer
      p.trail.forEach((pos,i)=>{
        ctx.globalAlpha=(1-i/p.trail.length)*.5;
        ctx.fillStyle=w.trail; ctx.beginPath(); ctx.arc(pos.x,pos.y,TW*.05,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,TW*.18);
      g.addColorStop(0,'rgba(255,200,150,1)');g.addColorStop(.5,'rgba(255,120,40,0.7)');g.addColorStop(1,'rgba(255,60,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffeecc'; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.05,0,Math.PI*2); ctx.fill();

    } else {
      // Pistol: blue energy
      p.trail.forEach((pos,i)=>{
        ctx.globalAlpha=(1-i/p.trail.length)*.32;
        ctx.fillStyle=w.trail; ctx.beginPath(); ctx.arc(pos.x,pos.y,TW*.06,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,TW*.28);
      g.addColorStop(0,'rgba(200,240,255,1)');g.addColorStop(.4,'rgba(80,180,255,.7)');g.addColorStop(1,'rgba(40,100,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.28,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,TW*.07,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}
