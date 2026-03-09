
// ─── ABILITIES ────────────────────────────────────────────────────────────────

// ── Fire Ring ─────────────────────────────────────────────────────────────────
const FIRE_RING_COOLDOWN = 1200; // 20 s at 60 fps
const FIRE_RING_DURATION = 180;  // 3 s active
const FIRE_RING_RADIUS   = 2.6;  // tiles — damage / visual radius
const FIRE_RING_TICK     = 20;   // frames between damage ticks
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
