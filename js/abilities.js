
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
