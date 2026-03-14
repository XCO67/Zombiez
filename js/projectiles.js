
// ─── PROJECTILES ─────────────────────────────────────────────────────────────
let shootTimer=0, muzzleFlash=0, muzzleColor='#fffbe0';
const projectiles = [];
let laserChargeTimer = 0;
let laserBeam = null;
let laserWasMouseDown = false;

function getW() { return WEAPONS[player.weaponKey]; }
function getFireRate() {
  const base = getW().fireRate;
  // Each atk speed level reduces fire rate by 15%, minimum 40% of base
  return Math.max(Math.round(base * 0.4), Math.round(base * Math.pow(0.85, player.upgrades.atkSpeed)));
}
function rollDamage(baseDmg, scaled=true) {
  // Exponential damage scaling: each level ×1.3 (L1=×1.3, L5=×3.71)
  // Box weapons pass scaled=false so they always deal their listed baseDmg.
  const total = scaled ? Math.round(baseDmg * Math.pow(1.3, player.upgrades.damage)) : baseDmg;
  const crit = Math.random() < player.upgrades.crit * 0.1;
  return { dmg: crit ? total*2 : total, crit };
}

// ─── MERC BULLETS — independent teal projectiles, bypass player damage scaling ─
const mercBullets = [];

function spawnMercBullet(sx, sy, angle, dmg) {
  const spd = WEAPONS['pistol'].speed;
  mercBullets.push({ x: sx, y: sy, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, trail: [], life: 90, dmg });
}

function updateMercBullets() {
  const HIT_R = TW * 0.4;
  const isWall = (x,y) => { const r=y/TH|0,c=x/TW|0; return r<0||r>=MAP_H||c<0||c>=MAP_W||MAP[r]?.[c]===T.WALL||MAP[r]?.[c]===T.PILLAR; };
  const allEnemies = [
    ...ZOMBIES, ...SKELETONS, ...DRAGONS, ...LAVA_ZOMBIES,
    ...EXPLODERS, ...PHANTOMS, ...BOSS_DEMONS, ...SPIDER_BOSSES, ...SPIDER_MINIONS,
  ];
  for (let i = mercBullets.length - 1; i >= 0; i--) {
    const p = mercBullets[i];
    p.trail.unshift({x:p.x, y:p.y}); if (p.trail.length > 6) p.trail.pop();
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0 || isWall(p.x, p.y)) { mercBullets.splice(i, 1); continue; }
    let hit = false;
    for (const en of allEnemies) {
      if (en.dead) continue;
      const hitR = BOSS_DEMONS.includes(en) ? TW*1.6 : SPIDER_BOSSES.includes(en) ? TW*2.0 : HIT_R;
      if (Math.hypot(p.x - en.cx*TW, p.y - en.cy*TH) < hitR) {
        en.hp -= p.dmg; en.hitFlash = 7;
        spawnDmgNum(en.cx*TW, en.cy*TH - TH*0.35, p.dmg, '#00eeff');
        if (en.hp <= 0) {
          en.dead = true; en.deathTimer = 25; game.kills++; game.score += 10;
          const drop = 5 + Math.floor(Math.random() * game.round * 3 + 10);
          spawnCoin(en.cx + (.5-Math.random())*.4, en.cy + (.5-Math.random())*.4, drop);
          spawnPerk(en.cx, en.cy);
        }
        mercBullets.splice(i, 1); hit = true; break;
      }
    }
    if (hit) continue;
  }
}

function drawMercBullets() {
  mercBullets.forEach(p => {
    ctx.save();
    p.trail.forEach((pos, i) => {
      ctx.globalAlpha = (1 - i / p.trail.length) * 0.45;
      ctx.fillStyle = '#00ccff';
      ctx.beginPath(); ctx.arc(pos.x, pos.y, TW*.07, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, TW*.24);
    g.addColorStop(0, 'rgba(180,255,255,1)');
    g.addColorStop(0.4, 'rgba(0,200,255,0.85)');
    g.addColorStop(1, 'rgba(0,80,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, TW*.24, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, TW*.065, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

function spawnBullet(sx,sy,angle,wkey) {
  const w=WEAPONS[wkey];
  const papped = player.packedWeapons.has(wkey);
  projectiles.push({
    x:sx, y:sy,
    vx:Math.cos(angle)*w.speed, vy:Math.sin(angle)*w.speed,
    trail:[], life:90, wkey, papped,
    bouncesLeft: player.ricochets + (player.doublePapWeapons.has(wkey) ? 1 : 0),
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

let _laserChargeOscs = [];
function playLaserChargeSound() {
  stopLaserChargeSound();
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Low hum rising over 2 seconds
  const osc1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
  osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(600, now + 2.0);
  g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.22, now + 0.3);
  g1.gain.linearRampToValueAtTime(0.30, now + 1.8);
  osc1.connect(g1); g1.connect(masterGain); osc1.start(now); osc1.stop(now + 2.1);
  // High shimmer layered in
  const osc2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
  osc2.type = 'triangle'; osc2.frequency.setValueAtTime(400, now + 0.2);
  osc2.frequency.exponentialRampToValueAtTime(3200, now + 2.0);
  g2.gain.setValueAtTime(0, now + 0.2); g2.gain.linearRampToValueAtTime(0.12, now + 1.0);
  g2.gain.linearRampToValueAtTime(0.20, now + 2.0);
  osc2.connect(g2); g2.connect(masterGain); osc2.start(now + 0.2); osc2.stop(now + 2.1);
  _laserChargeOscs = [osc1, osc2];
}
function stopLaserChargeSound() {
  _laserChargeOscs.forEach(o => { try { o.stop(); } catch(e) {} });
  _laserChargeOscs = [];
}
function playLaserFireSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Instant high-pitched ZAP
  const osc1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
  osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(4000, now);
  osc1.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  g1.gain.setValueAtTime(0.32, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc1.connect(g1); g1.connect(masterGain); osc1.start(now); osc1.stop(now + 0.35);
  // Sizzle tail
  const osc2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
  osc2.type = 'sine'; osc2.frequency.setValueAtTime(2200, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(400, now + 0.6);
  g2.gain.setValueAtTime(0.18, now + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  osc2.connect(g2); g2.connect(masterGain); osc2.start(now + 0.05); osc2.stop(now + 0.65);
  // Deep thump
  const osc3 = audioCtx.createOscillator(); const g3 = audioCtx.createGain();
  osc3.type = 'sine'; osc3.frequency.setValueAtTime(120, now);
  osc3.frequency.exponentialRampToValueAtTime(40, now + 0.25);
  g3.gain.setValueAtTime(0.28, now); g3.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc3.connect(g3); g3.connect(masterGain); osc3.start(now); osc3.stop(now + 0.3);
}

function fireLaser(sx, sy, angle) {
  const wkey = 'lasergun';
  const papped = player.packedWeapons.has(wkey);
  const doublePapped = player.doublePapWeapons.has(wkey);
  const pm = papped ? 3 : 1;
  const maxDist = (MAP_W + MAP_H) * TW;
  const hitR = TW * 0.55;

  function raycast(ox, oy, ddx, ddy) {
    for (let d = TW * 0.5; d < maxDist; d += TW * 0.5) {
      const tc = (ox + ddx*d)/TW|0, tr = (oy + ddy*d)/TH|0;
      if (tr<0||tr>=MAP_H||tc<0||tc>=MAP_W||MAP[tr]?.[tc]===T.WALL||MAP[tr]?.[tc]===T.PILLAR) return d;
    }
    return maxDist;
  }

  function damageOnSegment(ox, oy, ddx, ddy, len) {
    function onBeam(ex, ey) {
      const rx=ex-ox, ry=ey-oy, proj=rx*ddx+ry*ddy;
      return proj>=0 && proj<=len && Math.abs(rx*ddy - ry*ddx)<=hitR;
    }
    ZOMBIES.forEach(z      => { if (!z.dead  && onBeam(z.cx*TW,  z.cy*TH))  hitZombie(z, wkey, z.cx*TW, z.cy*TH, pm); });
    SKELETONS.forEach(s    => { if (!s.dead  && onBeam(s.cx*TW,  s.cy*TH))  hitSkeleton(s, wkey, pm); });
    DRAGONS.forEach(d      => { if (!d.dead  && onBeam(d.cx*TW,  d.cy*TH))  hitDragon(d, wkey, pm); });
    LAVA_ZOMBIES.forEach(lz=> { if (!lz.dead && onBeam(lz.cx*TW, lz.cy*TH)) hitLavaZombie(lz, wkey, pm); });
    EXPLODERS.forEach(ex   => { if (!ex.dead && onBeam(ex.cx*TW, ex.cy*TH)) hitExploder(ex, wkey, pm); });
    PHANTOMS.forEach(ph    => { if (!ph.dead && onBeam(ph.cx*TW, ph.cy*TH)) hitPhantom(ph, wkey, pm); });
    BOSS_DEMONS.forEach(b  => { if (!b.dead  && onBeam(b.cx*TW,  b.cy*TH))  hitBoss(b, wkey, pm); });
    SPIDER_BOSSES.forEach(b=> { if (!b.dead  && onBeam(b.cx*TW,  b.cy*TH))  hitSpiderBoss(b, wkey, pm); });
    SPIDER_MINIONS.forEach(m=>{ if (!m.dead  && onBeam(m.cx*TW,  m.cy*TH))  hitSpiderMinion(m, wkey, pm); });
  }

  const dx = Math.cos(angle), dy = Math.sin(angle);
  const len1 = raycast(sx, sy, dx, dy);
  const ex1 = sx + dx*len1, ey1 = sy + dy*len1;
  damageOnSegment(sx, sy, dx, dy, len1);

  const segments = [{ sx, sy, ex: ex1, ey: ey1 }];

  if (doublePapped) {
    // Reflect off wall — detect which axis was hit
    const px2 = ex1 - dx*TW*0.5, py2 = ey1 - dy*TW*0.5;
    const hitX = ((px2+dx*TW)/TW|0) !== (px2/TW|0) || (((sx+dx*(len1))/TW|0) !== ((sx+dx*(len1-TW))/TW|0));
    const rdx = hitX ? -dx : dx;
    const rdy = hitX ? dy : -dy;
    const len2 = raycast(ex1, ey1, rdx, rdy);
    const ex2 = ex1 + rdx*len2, ey2 = ey1 + rdy*len2;
    damageOnSegment(ex1, ey1, rdx, rdy, len2);
    segments.push({ sx: ex1, sy: ey1, ex: ex2, ey: ey2 });
  }

  stopLaserChargeSound();
  laserBeam = { segments, life:35, maxLife:35, papped };
  muzzleFlash = 15; muzzleColor = '#ff00cc';
  playLaserFireSound();
}

function tryShoot() {
  if (player.dead||game.state!=='playing'||shopOpen) return;
  // ── Laser: special charge-and-auto-fire mechanic ────────────────────────────
  const wCur = getW();
  if (wCur && wCur.laser) {
    if (shootTimer > 0) shootTimer--;
    const mouseRelease = laserWasMouseDown && !mouse.down;
    laserWasMouseDown = mouse.down;
    if (mouse.down && shootTimer <= 0 && player.ammo > 0) {
      if (laserChargeTimer === 0) playLaserChargeSound(); // start charge sound once
      laserChargeTimer++;
      if (laserChargeTimer >= 120) { // 2 seconds = auto-fire
        const sx=player.cx*TW, sy=player.cy*TH;
        fireLaser(sx, sy, Math.atan2((mouse.y+camY)-sy, (mouse.x+camX)-sx));
        if (player.ammo !== Infinity) player.ammo = Math.max(0, player.ammo - 1);
        shootTimer = 45;
        laserChargeTimer = 0;
      }
    } else if (mouseRelease && laserChargeTimer >= 45 && shootTimer <= 0 && player.ammo > 0) {
      // Early release (≥ 0.75s charged) also fires
      const sx=player.cx*TW, sy=player.cy*TH;
      fireLaser(sx, sy, Math.atan2((mouse.y+camY)-sy, (mouse.x+camX)-sx));
      if (player.ammo !== Infinity) player.ammo = Math.max(0, player.ammo - 1);
      shootTimer = 45;
      laserChargeTimer = 0;
    } else if (!mouse.down) {
      if (laserChargeTimer > 0) stopLaserChargeSound(); // cancelled
      laserChargeTimer = 0;
      laserWasMouseDown = false;
    }
    return;
  }
  laserWasMouseDown = false;
  laserChargeTimer = 0;
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

  if(player.weaponKey==='xenoblaster') {
    playXenoblasterSound();
  } else if(player.weaponKey==='pistol') {
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

    const {dmg, crit} = rollDamage(WEAPONS.thundergun.baseDmg, false);
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
    const {dmg,crit}=rollDamage(WEAPONS.thundergun.baseDmg,false);
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
    const {dmg,crit}=rollDamage(WEAPONS.thundergun.baseDmg,false);
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
  playThundergunSound();
  muzzleFlash = 10; muzzleColor = '#60e8ff';
}

function hitZombie(z, wkey, px, py, papMult=1) {
  const w=WEAPONS[wkey];
  const {dmg:rawDmg,crit}=rollDamage(w.baseDmg, !BOX_POOL.includes(wkey));
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
    const isWall=(x,y)=>{ const r=y/TH|0,c=x/TW|0; return r<0||r>=MAP_H||c<0||c>=MAP_W||MAP[r]?.[c]===T.WALL||MAP[r]?.[c]===T.PILLAR; };
    const wallHit=p.life<=0||isWall(p.x,p.y);
    if(wallHit){
      if(p.life>0&&p.bouncesLeft>0){
        const px2=p.x-p.vx, py2=p.y-p.vy;
        const hitX=isWall(p.x,py2), hitY=isWall(px2,p.y);
        if(hitX) p.vx=-p.vx;
        if(hitY) p.vy=-p.vy;
        if(!hitX&&!hitY){p.vx=-p.vx;p.vy=-p.vy;}
        p.x=px2+p.vx; p.y=py2+p.vy; p.bouncesLeft--;
      } else { projectiles.splice(i,1); continue; }
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
  // Laser beam
  if (laserBeam) {
    const lb = laserBeam;
    const a = lb.life / lb.maxLife;
    const hue = lb.papped ? (performance.now()/3)%360 : 300;
    ctx.save();
    ctx.lineCap = 'round';
    lb.segments.forEach((seg, si) => {
      // Outer wide glow
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = `hsl(${hue},100%,70%)`;
      ctx.lineWidth = TW * 1.2 * a;
      ctx.shadowColor = `hsl(${hue},100%,70%)`; ctx.shadowBlur = 28;
      ctx.beginPath(); ctx.moveTo(seg.sx, seg.sy); ctx.lineTo(seg.ex, seg.ey); ctx.stroke();
      // Mid beam
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = `hsl(${hue},100%,85%)`;
      ctx.lineWidth = TW * 0.38 * a;
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(seg.sx, seg.sy); ctx.lineTo(seg.ex, seg.ey); ctx.stroke();
      // White hot core
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = TW * 0.09;
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(seg.sx, seg.sy); ctx.lineTo(seg.ex, seg.ey); ctx.stroke();
      // Impact flash at final endpoint
      const isLast = si === lb.segments.length - 1;
      if (isLast && a > 0.5) {
        const ig = ctx.createRadialGradient(seg.ex,seg.ey,0,seg.ex,seg.ey,TW*0.9*a);
        ig.addColorStop(0,`hsla(${hue},100%,95%,${a})`);
        ig.addColorStop(0.5,`hsla(${hue},100%,70%,${a*0.6})`);
        ig.addColorStop(1,'rgba(0,0,0,0)');
        ctx.globalAlpha = a;
        ctx.fillStyle=ig; ctx.beginPath(); ctx.arc(seg.ex,seg.ey,TW*0.9*a,0,Math.PI*2); ctx.fill();
      }
    });
    ctx.restore();
    lb.life--;
    if (lb.life <= 0) laserBeam = null;
  }

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
    // Pack-a-Punch: rainbow overrides normal rendering for non-thundergun, non-alien bullets
    if(p.papped && p.wkey!=='thundergun' && p.wkey!=='xenoblaster'){
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

    } else if(p.wkey==='xenoblaster'){
      // ── Xenoblaster: alien plasma orb with helical spiral trail ───────────────
      const tt = performance.now() / 1000;
      const hue = p.papped ? (tt * 110) % 360 : 160; // teal normally, rainbow when papped
      const orb_r = TW * (p.papped ? 0.56 : 0.40);
      const spd = Math.hypot(p.vx, p.vy) || 1;
      const nx = -p.vy / spd, ny = p.vx / spd; // perpendicular to travel direction

      // Helical spiral trail — each dot oscillates perpendicular
      p.trail.forEach((pos, i) => {
        const ta = 1 - i / p.trail.length;
        const th = (hue + i * 28) % 360;
        const sOff = Math.sin(tt * 11 - i * 1.1) * TW * 0.22;
        ctx.globalAlpha = ta * 0.65;
        ctx.fillStyle = `hsl(${th}, 100%, 65%)`;
        ctx.shadowColor = `hsl(${th}, 100%, 70%)`; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pos.x + nx * sOff, pos.y + ny * sOff, TW * (0.20 - i * 0.012), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Wide outer glow halo
      ctx.globalAlpha = 0.28;
      const gHalo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, orb_r * 2.8);
      gHalo.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
      gHalo.addColorStop(0.6, `hsla(${(hue+40)%360}, 100%, 55%, 0.3)`);
      gHalo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gHalo;
      ctx.beginPath(); ctx.arc(p.x, p.y, orb_r * 2.8, 0, Math.PI * 2); ctx.fill();

      // Main plasma body
      ctx.globalAlpha = 1;
      const gOrb = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, orb_r);
      gOrb.addColorStop(0, 'rgba(255,255,255,1)');
      gOrb.addColorStop(0.22, `hsla(${(hue+180)%360}, 80%, 90%, 0.95)`);
      gOrb.addColorStop(0.58, `hsla(${hue}, 100%, 58%, 0.88)`);
      gOrb.addColorStop(1, `hsla(${(hue+60)%360}, 100%, 30%, 0)`);
      ctx.fillStyle = gOrb;
      ctx.beginPath(); ctx.arc(p.x, p.y, orb_r, 0, Math.PI * 2); ctx.fill();

      // 3 spinning dashed rings orbiting the orb
      ctx.save();
      ctx.translate(p.x, p.y);
      const spin = tt * 4.2;
      [0, 1, 2].forEach(ring => {
        const rHue = (hue + ring * 55) % 360;
        ctx.strokeStyle = `hsla(${rHue}, 100%, 82%, ${0.7 - ring * 0.12})`;
        ctx.lineWidth = 2.0 - ring * 0.4;
        ctx.setLineDash([TW * 0.18, TW * 0.10]);
        ctx.lineDashOffset = -(spin + ring * 1.2) * TW * 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, orb_r * (0.52 + ring * 0.18), spin + ring * 2.09, spin + ring * 2.09 + Math.PI * 1.5);
        ctx.stroke();
      });
      ctx.setLineDash([]); ctx.restore();

      // Bright white core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, TW * 0.08, 0, Math.PI * 2); ctx.fill();

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
