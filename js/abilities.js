
// ─── ABILITIES ────────────────────────────────────────────────────────────────

// ── Fire Ring ─────────────────────────────────────────────────────────────────
const FIRE_RING_COOLDOWN = 1800; // 30 s at 60 fps
const FIRE_RING_DURATION = 360;  // 6 s active
const FIRE_RING_RADIUS   = 1.8;  // tiles — damage / visual radius
const FIRE_RING_TICK     = 30;   // frames between damage ticks
const FIRE_RING_ORBS     = 8;

let fireRingDmgTimer = 0;

function updateFireRing() {
  if (player.fireCooldown > 0) player.fireCooldown--;
  if (player.fireRingTimer <= 0) return;

  player.fireRingTimer--;
  player.fireRingAngle = (player.fireRingAngle || 0) + 0.065;

  fireRingDmgTimer++;
  if (fireRingDmgTimer < FIRE_RING_TICK) return;
  fireRingDmgTimer = 0;

  const range = FIRE_RING_RADIUS;

  // Zombies
  for (let i = ZOMBIES.length - 1; i >= 0; i--) {
    const z = ZOMBIES[i]; if (z.dead) continue;
    if (Math.hypot(z.cx - player.cx, z.cy - player.cy) < range)
      hitZombie(z, 'pistol', z.cx * TW, z.cy * TH);
  }
  // Skeletons
  for (let i = SKELETONS.length - 1; i >= 0; i--) {
    const s = SKELETONS[i]; if (s.dead) continue;
    if (Math.hypot(s.cx - player.cx, s.cy - player.cy) < range)
      hitSkeleton(s, 'pistol');
  }
  // Dragons
  DRAGONS.forEach(d => {
    if (d.dead) return;
    if (Math.hypot(d.cx - player.cx, d.cy - player.cy) < range)
      hitDragon(d, 'pistol');
  });
  // Lava Zombies
  LAVA_ZOMBIES.forEach(lz => {
    if (lz.dead) return;
    if (Math.hypot(lz.cx - player.cx, lz.cy - player.cy) < range)
      hitLavaZombie(lz, 'pistol');
  });
  // Exploders
  for (let i = EXPLODERS.length - 1; i >= 0; i--) {
    const ex = EXPLODERS[i]; if (ex.dead) continue;
    if (Math.hypot(ex.cx - player.cx, ex.cy - player.cy) < range)
      hitExploder(ex, 'pistol');
  }
  // Phantoms
  for (let i = PHANTOMS.length - 1; i >= 0; i--) {
    const ph = PHANTOMS[i]; if (ph.dead) continue;
    if (Math.hypot(ph.cx - player.cx, ph.cy - player.cy) < range)
      hitPhantom(ph, 'pistol');
  }
  // Boss demons
  BOSS_DEMONS.forEach(b => {
    if (b.dead) return;
    if (Math.hypot(b.cx - player.cx, b.cy - player.cy) < range)
      hitBoss(b, 'pistol', 1);
  });
  // Spider boss + minions
  SPIDER_BOSSES.forEach(b => {
    if (b.dead) return;
    if (Math.hypot(b.cx - player.cx, b.cy - player.cy) < range)
      hitSpiderBoss(b, 'pistol', 1);
  });
  SPIDER_MINIONS.forEach(m => {
    if (m.dead) return;
    if (Math.hypot(m.cx - player.cx, m.cy - player.cy) < range)
      hitSpiderMinion(m, 'pistol', 1);
  });
}

// ── Barrier ───────────────────────────────────────────────────────────────────
const BARRIER_COOLDOWN = 2100; // 35 s at 60 fps
const BARRIER_DURATION = 360;  // 6 s active

function updateBarrier() {
  if (player.barrierCooldown > 0) player.barrierCooldown--;
}

function drawBarrier() {
  if (player.barrierTimer <= 0) return;
  player.barrierTimer--;

  const cx  = player.cx * TW;
  const cy  = player.cy * TH;
  const R   = TW * 1.12;
  const now = performance.now();
  const frac  = player.barrierTimer / BARRIER_DURATION;
  const pulse = 0.82 + Math.sin(now / 160) * 0.18;
  const expiring = player.barrierTimer < 90;
  const blinkOn  = !expiring || Math.floor(now / 100) % 2 === 0;

  ctx.save();

  // ── 1. Volumetric inner glow ───────────────────────────────────
  const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
  innerGlow.addColorStop(0,   `rgba(100,210,255,${0.04 * pulse})`);
  innerGlow.addColorStop(0.55,`rgba(60,160,255,${0.07 * frac})`);
  innerGlow.addColorStop(0.85,`rgba(30,100,255,${0.13 * frac * pulse})`);
  innerGlow.addColorStop(1,   'rgba(10,40,180,0)');
  ctx.fillStyle = innerGlow;
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.fill();

  // ── 2. Outer halo bloom ────────────────────────────────────────
  const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.55);
  halo.addColorStop(0,   `rgba(80,200,255,${0.18 * frac * pulse})`);
  halo.addColorStop(0.4, `rgba(40,120,255,${0.10 * frac})`);
  halo.addColorStop(1,   'rgba(0,40,160,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2); ctx.fill();

  if (blinkOn) {
    // ── 3. Main barrier ring (thick glowing edge) ──────────────────
    ctx.shadowColor = expiring ? '#ff6060' : '#40d0ff';
    ctx.shadowBlur  = 18 * frac * pulse;
    ctx.strokeStyle = expiring
      ? `rgba(255,120,120,${0.90 * frac})`
      : `rgba(140,230,255,${0.88 * frac * pulse})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // ── 4. Inner bright ring ───────────────────────────────────────
    ctx.strokeStyle = `rgba(220,248,255,${0.30 * frac})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.88, 0, Math.PI * 2); ctx.stroke();
  }

  // ── 5. Rotating energy bands (3 bands, different speeds) ──────
  const bands = [
    { speed: 0.0008, span: 0.55, width: 2.5, alpha: 0.55 },
    { speed:-0.0013, span: 0.38, width: 1.8, alpha: 0.40 },
    { speed: 0.0020, span: 0.22, width: 1.2, alpha: 0.30 },
  ];
  bands.forEach(b => {
    const rot = now * b.speed;
    const col = expiring ? `rgba(255,160,160,${b.alpha * frac})` : `rgba(160,240,255,${b.alpha * frac})`;
    ctx.strokeStyle = col;
    ctx.lineWidth = b.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R, rot, rot + Math.PI * b.span);
    ctx.stroke();
    // Opposite arc for symmetry
    ctx.beginPath();
    ctx.arc(cx, cy, R, rot + Math.PI, rot + Math.PI + Math.PI * b.span * 0.6);
    ctx.stroke();
  });

  // ── 6. Nodes (6 glowing anchor points on the ring) ────────────
  const nodeCount = 6;
  for (let i = 0; i < nodeCount; i++) {
    const ang = (i / nodeCount) * Math.PI * 2 + now * 0.0005;
    const nx  = cx + Math.cos(ang) * R;
    const ny  = cy + Math.sin(ang) * R;
    const ng  = ctx.createRadialGradient(nx, ny, 0, nx, ny, 7);
    ng.addColorStop(0, `rgba(240,255,255,${0.95 * frac * pulse})`);
    ng.addColorStop(0.4, expiring ? `rgba(255,100,100,${0.7 * frac})` : `rgba(60,200,255,${0.7 * frac})`);
    ng.addColorStop(1, 'rgba(0,80,200,0)');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(nx, ny, 7, 0, Math.PI * 2); ctx.fill();
  }

  // ── 7. Crackle arcs between adjacent nodes ────────────────────
  if (frac > 0.15) {
    for (let i = 0; i < nodeCount; i++) {
      if (Math.sin(now * 0.003 + i * 1.7) < 0.3) continue; // random flicker per node
      const a1  = (i / nodeCount) * Math.PI * 2 + now * 0.0005;
      const a2  = ((i + 1) / nodeCount) * Math.PI * 2 + now * 0.0005;
      const x1  = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
      const x2  = cx + Math.cos(a2) * R, y2 = cy + Math.sin(a2) * R;
      const mx  = (x1 + x2) / 2 + (Math.sin(now * 0.007 + i) * R * 0.08);
      const my  = (y1 + y2) / 2 + (Math.cos(now * 0.009 + i) * R * 0.08);
      ctx.strokeStyle = `rgba(200,245,255,${0.35 * frac})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Speed Boost ───────────────────────────────────────────────────────────────
const SPEED_BOOST_COOLDOWN = 900; // 15 s at 60 fps
const SPEED_BOOST_DURATION = 360; // 6 s active
const SPEED_BOOST_MULT     = 1.65; // movement speed multiplier

// Persistent offscreen canvas so source-atop tinting stays isolated from the main canvas
const _spdOff = document.createElement('canvas');
const _spdPC  = _spdOff.getContext('2d');

function updateSpeedBoost() {
  if (player.speedBoostCooldown > 0) player.speedBoostCooldown--;

  // Always fade trail first — prevents ghost images getting stuck when timer expires
  for (let i = player.speedBoostTrail.length - 1; i >= 0; i--) {
    player.speedBoostTrail[i].a -= 0.04;
    if (player.speedBoostTrail[i].a <= 0) player.speedBoostTrail.splice(i, 1);
  }

  if (player.speedBoostTimer <= 0) return;
  player.speedBoostTimer--;

  // Record trail position every 3 frames while moving
  if (player.moving && player.speedBoostTimer % 3 === 0) {
    player.speedBoostTrail.push({ cx: player.cx, cy: player.cy, facing: player.facing, a: 0.75 });
    if (player.speedBoostTrail.length > 20) player.speedBoostTrail.shift();
  }
}

function drawSpeedBoostTrail() {
  if (!player.speedBoostTrail || player.speedBoostTrail.length === 0) return;
  const sz = Math.round(TW * 1.5);
  if (_spdOff.width !== sz) { _spdOff.width = sz; _spdOff.height = sz; }

  for (const t of player.speedBoostTrail) {
    const img = charIdle[t.facing];
    if (!img || !img.complete || !img.naturalWidth) continue;

    // Render tinted silhouette onto the isolated offscreen canvas
    _spdPC.clearRect(0, 0, sz, sz);
    _spdPC.drawImage(img, 0, 0, sz, sz);
    _spdPC.globalCompositeOperation = 'source-atop';
    _spdPC.fillStyle = 'rgba(170,40,255,1)';
    _spdPC.fillRect(0, 0, sz, sz);
    _spdPC.globalCompositeOperation = 'source-over';

    // Blit purple silhouette onto the main canvas — no floor bleed possible
    ctx.save();
    ctx.globalAlpha = t.a * 0.52;
    ctx.drawImage(_spdOff, t.cx * TW - sz / 2, t.cy * TH - sz / 2);
    ctx.restore();
  }
}

function drawFireRing() {
  if (player.fireRingTimer <= 0) return;

  const cx   = player.cx * TW;
  const cy   = player.cy * TH;
  const ringR = FIRE_RING_RADIUS * TW * 0.72;
  const frac  = player.fireRingTimer / FIRE_RING_DURATION;
  const pulse = 0.85 + Math.sin(performance.now() / 80) * 0.15;

  ctx.save();

  // Soft ground glow beneath ring
  const glow = ctx.createRadialGradient(cx, cy, ringR * 0.3, cx, cy, ringR * 1.25);
  glow.addColorStop(0,   `rgba(255,80,0,${0.10 * frac * pulse})`);
  glow.addColorStop(0.6, `rgba(255,40,0,${0.08 * frac})`);
  glow.addColorStop(1,   'rgba(200,20,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, ringR * 1.25, 0, Math.PI * 2); ctx.fill();

  // Dashed orbit ring
  ctx.strokeStyle = `rgba(255,120,20,${0.4 * frac})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.lineDashOffset = -performance.now() * 0.04;
  ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Orbiting fire orbs
  for (let i = 0; i < FIRE_RING_ORBS; i++) {
    const angle = player.fireRingAngle + (i / FIRE_RING_ORBS) * Math.PI * 2;
    const ox = cx + Math.cos(angle) * ringR;
    const oy = cy + Math.sin(angle) * ringR;

    // Trailing ember (slightly behind each orb)
    const trailAngle = angle - 0.3;
    const tx2 = cx + Math.cos(trailAngle) * ringR;
    const ty2 = cy + Math.sin(trailAngle) * ringR;
    const tg = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, 9);
    tg.addColorStop(0, `rgba(255,160,40,${0.45 * frac})`);
    tg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(tx2, ty2, 9, 0, Math.PI * 2); ctx.fill();

    // Main orb outer glow
    const og = ctx.createRadialGradient(ox - 2, oy - 2, 0, ox, oy, 15);
    og.addColorStop(0,   'rgba(255,245,200,1)');
    og.addColorStop(0.25, 'rgba(255,160,40,0.95)');
    og.addColorStop(0.6,  `rgba(255,60,0,${0.6 * frac * pulse})`);
    og.addColorStop(1,    'rgba(180,20,0,0)');
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(ox, oy, 15, 0, Math.PI * 2); ctx.fill();

    // Bright inner core
    ctx.fillStyle = `rgba(255,255,230,${0.95 * frac})`;
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ── Monkey Bomb ────────────────────────────────────────────────────────────────
const MONKEY_BOMB_COOLDOWN = 1800; // 30 s at 60 fps
const MONKEY_BOMB_DURATION = 300;  // 5 s active
const MONKEY_BOMB_TRAVEL   = 22;   // frames to reach target
const MONKEY_BOMB_RADIUS   = 5.0;  // explosion radius in tiles
const MONKEY_BOMB_DMG      = 300;  // max damage at centre
const monkeyBombs          = [];

// Returns nearest active bomb as a bait target (with dummy player-like props),
// or falls back to the nearest real player. Used in enemy update functions.
function getBaitOrPlayer(cx, cy) {
  if (monkeyBombs.length > 0 && monkeyBombs[0].travelTimer <= 0) {
    const b = monkeyBombs[0];
    return { cx: b.cx, cy: b.cy, hurtTimer: Infinity, dead: false, downed: false, hp: Infinity };
  }
  return nearestPlayerTo(cx, cy);
}

function throwMonkeyBomb() {
  const angle = Math.atan2((mouse.y + camY) - player.cy * TH, (mouse.x + camX) - player.cx * TW);
  const range  = 8; // tiles
  const tx = Math.max(0.5, Math.min(MAP_W - 0.5, player.cx + Math.cos(angle) * range));
  const ty = Math.max(0.5, Math.min(MAP_H - 0.5, player.cy + Math.sin(angle) * range));
  monkeyBombs.push({
    startCx: player.cx, startCy: player.cy,
    cx: player.cx, cy: player.cy,
    targetCx: tx, targetCy: ty,
    travelTimer: MONKEY_BOMB_TRAVEL, travelFrames: MONKEY_BOMB_TRAVEL,
    timer: MONKEY_BOMB_DURATION, maxTimer: MONKEY_BOMB_DURATION,
    bobAngle: 0,
  });
  player.monkeyBombCooldown = MONKEY_BOMB_COOLDOWN;
}

function _explodeMonkeyBomb(b) {
  spawnEffect('explosion', b.cx * TW, b.cy * TH, { radius: MONKEY_BOMB_RADIUS * TW * 0.9 });
  spawnEffect('explosion', b.cx * TW, b.cy * TH, { radius: MONKEY_BOMB_RADIUS * TW * 0.5 });
  const allEnemies = [
    ...ZOMBIES, ...SKELETONS, ...DRAGONS, ...LAVA_ZOMBIES,
    ...EXPLODERS, ...PHANTOMS, ...BOSS_DEMONS, ...SPIDER_BOSSES, ...SPIDER_MINIONS,
  ];
  for (const en of allEnemies) {
    if (en.dead) continue;
    const dist = Math.hypot(en.cx - b.cx, en.cy - b.cy);
    if (dist >= MONKEY_BOMB_RADIUS) continue;
    const falloff = Math.max(0.3, 1 - dist / MONKEY_BOMB_RADIUS);
    const dmg = Math.round(MONKEY_BOMB_DMG * falloff);
    en.hp -= dmg; en.hitFlash = 12;
    spawnDmgNum(en.cx * TW, en.cy * TH - TH * 0.4, dmg, '#ffcc00');
    if (en.hp <= 0 && !en.dead) {
      en.dead = true; en.deathTimer = 25;
      game.kills++; game.score += 20;
      spawnCoin(en.cx + (Math.random()-.5)*.4, en.cy + (Math.random()-.5)*.4, 20 + game.round * 4);
      spawnPerk(en.cx, en.cy);
    }
  }
}

function updateMonkeyBombs() {
  if (player.monkeyBombCooldown > 0) player.monkeyBombCooldown--;
  for (let i = monkeyBombs.length - 1; i >= 0; i--) {
    const b = monkeyBombs[i];
    b.bobAngle += 0.10;
    if (b.travelTimer > 0) {
      b.travelTimer--;
      const t = 1 - b.travelTimer / b.travelFrames;
      b.cx = b.startCx + (b.targetCx - b.startCx) * t;
      b.cy = b.startCy + (b.targetCy - b.startCy) * t;
    } else {
      b.timer--;
      if (b.timer <= 0) { _explodeMonkeyBomb(b); monkeyBombs.splice(i, 1); }
    }
  }
}

function drawMonkeyBombs() {
  if (!monkeyBombs.length) return;
  const now = performance.now();
  monkeyBombs.forEach(b => {
    const inFlight  = b.travelTimer > 0;
    const groundPx  = b.cx * TW;
    const groundPy  = b.cy * TH;

    // Visual centre (arc up while thrown, bob when landed)
    let vcx = Math.round(groundPx);
    let vcy = Math.round(groundPy);
    if (inFlight) {
      const arcT = 1 - b.travelTimer / b.travelFrames;
      vcy -= Math.round(Math.sin(arcT * Math.PI) * TH * 2.5);
    } else {
      vcy += Math.round(Math.sin(b.bobAngle) * 3);
    }

    const ps   = Math.max(2, Math.round(TW / 9)); // 1 "pixel" in screen pixels
    const sprW = 14 * ps;
    const sprH = 12 * ps;
    const ox   = vcx - Math.round(sprW / 2); // sprite top-left
    const oy   = vcy - Math.round(sprH / 2);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Flat pixel shadow on ground
    const sh = inFlight
      ? Math.max(0.2, 1 - Math.sin((1 - b.travelTimer / b.travelFrames) * Math.PI) * 0.85)
      : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(
      Math.round(groundPx - sprW * 0.42 * sh), Math.round(groundPy + sprH * 0.38),
      Math.round(sprW * 0.84 * sh), Math.round(ps * 2)
    );

    // Binary danger flash (blinks faster as timer runs out)
    if (!inFlight) {
      const frac = b.timer / b.maxTimer;
      if (frac < 0.45) {
        const blinkRate = Math.round(120 * frac + 15);
        if (Math.floor(now / blinkRate) % 2 === 0) {
          ctx.fillStyle = '#ff2200';
          ctx.globalAlpha = 0.38;
          ctx.fillRect(ox - ps * 2, oy - ps * 2, sprW + ps * 4, sprH + ps * 4);
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Pixel art colours ───────────────────────────────────────
    const DK = '#0c1808'; // dark outline
    const BG = '#2a7518'; // body green
    const HG = '#3da820'; // highlight green
    const TN = '#d49060'; // tan face patch
    const DT = '#9a5f2a'; // dark tan (mouth shadow)
    const EW = '#f2f0f0'; // eye white
    const eyeFrac = (!inFlight && b.timer) ? b.timer / b.maxTimer : 1;
    const PU = eyeFrac < 0.25 ? '#ee1111' : '#080808'; // pupil (red when low)
    const EI = '#e8aa78'; // ear inner pink
    const BR = '#1a3a0c'; // ear outer / body shadow

    // helper — fill one sprite "pixel"
    const d = (col, row, col_) => {
      ctx.fillStyle = col_;
      ctx.fillRect(ox + col * ps, oy + row * ps, ps, ps);
    };

    // Row 0 — top outline
    for (let c = 2; c <= 11; c++) d(c, 0, DK);
    // Row 1 — head top
    d(1,1,DK);
    for (let c = 2; c <= 11; c++) d(c, 1, (c===4||c===9) ? HG : BG);
    d(12,1,DK);
    // Row 2 — head with ear bases
    d(0,2,DK); d(1,2,BR);
    for (let c = 2; c <= 11; c++) d(c, 2, BG);
    d(12,2,BR); d(13,2,DK);
    // Row 3 — ears + start of face patch
    d(0,3,DK); d(1,3,EI); d(2,3,BG);
    for (let c = 3; c <= 10; c++) d(c, 3, TN);
    d(11,3,BG); d(12,3,EI); d(13,3,DK);
    // Row 4 — ears + eyes (upper whites)
    d(0,4,DK); d(1,4,EI); d(2,4,BG);
    d(3,4,TN); d(4,4,EW); d(5,4,EW); d(6,4,TN); d(7,4,TN); d(8,4,EW); d(9,4,EW); d(10,4,TN);
    d(11,4,BG); d(12,4,EI); d(13,4,DK);
    // Row 5 — ears + pupils
    d(0,5,DK); d(1,5,BR); d(2,5,BG);
    d(3,5,TN); d(4,5,EW); d(5,5,PU); d(6,5,TN); d(7,5,TN); d(8,5,EW); d(9,5,PU); d(10,5,TN);
    d(11,5,BG); d(12,5,BR); d(13,5,DK);
    // Row 6 — below eyes
    d(0,6,DK); d(1,6,DK); d(2,6,BG);
    for (let c = 3; c <= 10; c++) d(c, 6, TN);
    d(11,6,BG); d(12,6,DK); d(13,6,DK);
    // Row 7 — grin upper (dark corners)
    d(1,7,DK); d(2,7,BG);
    d(3,7,TN); d(4,7,DT); d(5,7,TN); d(6,7,TN); d(7,7,TN); d(8,7,TN); d(9,7,DT); d(10,7,TN);
    d(11,7,BG); d(12,7,DK);
    // Row 8 — grin lower (mouth curve)
    d(1,8,DK); d(2,8,BG);
    d(3,8,TN); d(4,8,TN); d(5,8,DT); d(6,8,DT); d(7,8,DT); d(8,8,DT); d(9,8,TN); d(10,8,TN);
    d(11,8,BG); d(12,8,DK);
    // Row 9 — lower head
    d(1,9,DK);
    for (let c = 2; c <= 11; c++) d(c, 9, BG);
    d(12,9,DK);
    // Row 10 — chin
    d(2,10,DK);
    for (let c = 3; c <= 10; c++) d(c, 10, BG);
    d(11,10,DK);
    // Row 11 — bottom outline
    for (let c = 3; c <= 10; c++) d(c, 11, DK);

    // ── Pixelated zigzag fuse above head ────────────────────────
    // Fuse base exits from top-centre of head (col 7)
    const fc = 7;
    d(fc,   -1, '#7a5820');
    d(fc+1, -2, '#7a5820');
    d(fc,   -3, '#7a5820');
    d(fc+1, -4, '#7a5820');
    // Spark alternates every 120 ms for flicker
    const spk = Math.floor(now / 120) % 2;
    if (spk === 0) {
      d(fc+1, -5, '#ffee44');
      d(fc+2, -5, '#ff9900');
      d(fc+1, -6, '#ff5500');
    } else {
      d(fc+2, -5, '#ffee44');
      d(fc+1, -5, '#ff9900');
      d(fc+2, -4, '#ff5500');
    }

    // ── Timer bar (landed only) ──────────────────────────────────
    if (!inFlight) {
      const frac = b.timer / b.maxTimer;
      ctx.fillStyle = '#111';
      ctx.fillRect(ox, oy - ps * 2, sprW, ps);
      const col = frac > 0.5 ? '#44ff88' : frac > 0.25 ? '#ffcc00' : '#ff3300';
      ctx.fillStyle = col;
      ctx.fillRect(ox, oy - ps * 2, Math.round(sprW * frac), ps);
    }

    ctx.restore();
  });
}
