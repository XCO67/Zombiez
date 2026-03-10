
// ─── PISTOL SPREAD DROPS ──────────────────────────────────────────────────────
// Dropped by bosses — player presses E + pays gold to unlock extra pistol bullets
const SPREAD_DROPS      = [];
let   firstBossDropped  = false;     // only drop tier-1 item once per run
const SPREAD_DROP_RADIUS = 1.8;
const SPREAD_DROP_COST   = 3000;     // cost for tier-1 (2-bullet spread)

function spawnSpreadDrop(cx, cy, tier = 1) {
  SPREAD_DROPS.push({ cx, cy, bob: 0, tier });
}

function updateSpreadDrops() {
  for (let i = SPREAD_DROPS.length - 1; i >= 0; i--) {
    const d = SPREAD_DROPS[i];
    d.bob += 0.055;
    // Auto-pickup when player walks close
    if (Math.hypot(player.cx - d.cx, player.cy - d.cy) < 1.2) {
      player.spreadOrbs++;
      SPREAD_DROPS.splice(i, 1);
    }
  }
}

function drawSpreadDrops() {
  const tt = performance.now() / 1000;
  SPREAD_DROPS.forEach(d => {
    const px = d.cx * TW;
    const py = d.cy * TH + Math.sin(d.bob) * TH * 0.13;
    const pulse = Math.sin(tt * 3.5) * 0.5 + 0.5;
    const isGreen = d.tier === 2;
    const c1 = isGreen ? [60,255,120] : [80,160,255];
    const c2 = isGreen ? [20,180,60] : [60,140,255];
    const glowHex = isGreen ? '#40ff80' : '#60aaff';
    const labelCol = isGreen ? `rgba(80,255,140,${0.8+pulse*0.2})` : `rgba(120,190,255,${0.8+pulse*0.2})`;

    // Outer glow
    const g = ctx.createRadialGradient(px, py, 0, px, py, TW * 2.2);
    g.addColorStop(0, `rgba(${c1[0]},${c1[1]},${c1[2]},${0.28 + pulse * 0.18})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, TW * 2.2, 0, Math.PI * 2); ctx.fill();

    // Orb
    const og = ctx.createRadialGradient(px - TW * 0.08, py - TH * 0.09, 0, px, py, TW * 0.42);
    og.addColorStop(0, isGreen ? 'rgba(200,255,220,1)' : 'rgba(220,240,255,1)');
    og.addColorStop(0.35, `rgba(${c2[0]},${c2[1]},${c2[2]},${0.85 + pulse * 0.12})`);
    og.addColorStop(1, isGreen ? 'rgba(0,80,20,0)' : 'rgba(10,60,200,0)');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(px, py, TW * 0.42, 0, Math.PI * 2); ctx.fill();

    // Icon inside
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(TW * 0.38)}px Segoe UI`;
    ctx.fillStyle = '#fff'; ctx.shadowColor = glowHex; ctx.shadowBlur = 8;
    ctx.fillText(isGreen ? '🕷' : '✦', px, py);
    ctx.restore();

    // Floating label
    const label = isGreen ? 'SPIDER UPGRADE' : 'PISTOL UPGRADE';
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = `bold ${Math.round(TH * 0.26)}px Segoe UI`;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(label, px + 1, py - TH * 0.58 + 1);
    ctx.fillStyle = labelCol; ctx.fillText(label, px, py - TH * 0.58);
    ctx.restore();

    // Pickup hint when player is near
    const dist = Math.hypot(player.cx - d.cx, player.cy - d.cy);
    if (dist < SPREAD_DROP_RADIUS) {
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = `${Math.round(TH * 0.26)}px Segoe UI`;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText('Walk over to collect!', px + 1, py - TH * 1.02 + 1);
      ctx.fillStyle = isGreen ? '#80ff80' : '#80c8ff'; ctx.fillText('Walk over to collect!', px, py - TH * 1.02);
      ctx.restore();
    }
  });
}

// ─── PIXEL-ART OFFSCREEN CANVASES ────────────────────────────────────────────
// Bosses are rendered to small canvases then upscaled nearest-neighbor for
// a classic pixel-art look.
const _demonPix  = document.createElement('canvas');
_demonPix.width  = _demonPix.height  = 56;
const _demonPC   = _demonPix.getContext('2d');

const _spiderPix = document.createElement('canvas');
_spiderPix.width = _spiderPix.height = 64;
const _spiderPC  = _spiderPix.getContext('2d');

// Snap semi-transparent pixels to fully opaque/transparent to remove AA blur
function _snapAlpha(pc, w, h) {
  const d = pc.getImageData(0, 0, w, h);
  const b = d.data;
  for (let i = 3; i < b.length; i += 4) b[i] = b[i] > 80 ? 255 : 0;
  pc.putImageData(d, 0, 0);
}

// ─── EYE DEMON BOSS ────────────────────────────────────────────────────────────
const BOSS_DEMONS = [];
const BOSS_SHOTS  = [];

const BOSS_BASE_HP        = 7000;
const BOSS_SHOT_SPEED     = 4.8;
const BOSS_SHOT_DMG       = 35;
const BOSS_SHOOT_INTERVAL = 70;  // frames between waves
const BOSS_SHOT_COUNT     = 8;   // rays per burst

function getBossSpawnTiles() {
  const pts = [];
  for (let r = 0; r < MAP_H; r++)
    for (let c = 0; c < MAP_W; c++)
      if (MAP[r][c] === T.BOSS_SPAWN) pts.push({ cx: c + 0.5, cy: r + 0.5 });
  if (!pts.length) pts.push({ cx: MAP_W * 0.5, cy: MAP_H * 0.5 });
  return pts;
}

function spawnBossDemon() {
  const pts = getBossSpawnTiles();
  const sp  = pts[0];
  const hp  = BOSS_BASE_HP + game.round * 300;
  return {
    cx: sp.cx, cy: sp.cy,
    hp, maxHp: hp,
    dead: false, deathTimer: 0, hitFlash: 0,
    shootTimer: 30, shootPhase: 0,
  };
}

function hitBoss(b, wkey, papMult = 1) {
  const { dmg: rawDmg, crit } = rollDamage(WEAPONS[wkey].baseDmg);
  // Damage cap: bosses have thick armour — no single hit does more than this
  const cap = 500 + game.round * 20;
  const dmg = Math.min(Math.round(rawDmg * papMult), cap);
  b.hp -= dmg;
  b.hitFlash = 9;
  const nc = papMult > 1
    ? `hsl(${(performance.now() / 4) % 360},100%,65%)`
    : crit ? '#cc44ff' : '#ff4444';
  spawnDmgNum(b.cx * TW, b.cy * TH - TH * 1.3, dmg, nc);
  if (b.hp <= 0) {
    b.dead = true;
    b.deathTimer = 60;
    game.kills += 5;
    game.score  += 500;
    for (let i = 0; i < 8; i++) {
      spawnCoin(
        b.cx + (Math.random() - 0.5) * 2.5,
        b.cy + (Math.random() - 0.5) * 2.5,
        120 + game.round * 20
      );
    }
    DROPPED_PERKS.push({ cx: b.cx - 1.0, cy: b.cy, type: 'doublePoints', bob: 0, life: 900 });
    DROPPED_PERKS.push({ cx: b.cx + 1.0, cy: b.cy, type: 'magnet',       bob: 0, life: 900 });
    // First boss ever killed drops the pistol spread upgrade orb
    if (!firstBossDropped) {
      firstBossDropped = true;
      spawnSpreadDrop(b.cx, b.cy + 2.5);
    }
    if (player.perks.lifesteal > 0 && !player.dead) {
      const heal = LIFESTEAL_HP[player.perks.lifesteal] * 3;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      spawnDmgNum(player.cx * TW, player.cy * TH - TH * 0.6, heal, '#44ff88');
    }
  }
}

const BOSS_MOVE_SPEED   = 0.009;  // base tiles/frame
const BOSS_CONTACT_DMG  = 25;
const BOSS_PREFERRED_DIST = 4.5;  // tiles — tries to stay at this range while circling

function updateBossDemons() {
  BOSS_DEMONS.forEach(b => {
    if (b.dead) { if (b.deathTimer > 0) b.deathTimer--; return; }
    b.hitFlash = Math.max(0, b.hitFlash - 1);

    // ── Chase / orbit movement ─────────────────────────────────────────────
    const tgt = nearestPlayerTo(b.cx, b.cy);
    const dx = tgt.cx - b.cx, dy = tgt.cy - b.cy, dist = Math.hypot(dx, dy) || 1;
    const hpFrac = b.hp / b.maxHp;
    // Speed ramps up as HP drops (enrages below 40%)
    const spd = BOSS_MOVE_SPEED * (hpFrac < 0.4 ? 1.8 : 1.0);
    if (dist > BOSS_PREFERRED_DIST) {
      // Move straight at player when far
      const nx = b.cx + (dx / dist) * spd;
      const ny = b.cy + (dy / dist) * spd;
      if (!isBlocked(nx, b.cy)) b.cx = nx;
      if (!isBlocked(b.cx, ny)) b.cy = ny;
    } else if (dist > 1.8) {
      // Orbit player clockwise at preferred distance
      const perpX = -dy / dist, perpY = dx / dist;
      const nx = b.cx + perpX * spd * 1.2;
      const ny = b.cy + perpY * spd * 1.2;
      if (!isBlocked(nx, b.cy)) b.cx = nx;
      if (!isBlocked(b.cx, ny)) b.cy = ny;
    }
    // Contact damage if player runs into the boss
    if (dist < 1.8 && tgt.hurtTimer <= 0 && !tgt.dead && !tgt.downed && game.state === 'playing') {
      applyDamage(tgt, BOSS_CONTACT_DMG);
      if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
      else                { if (tgt.hp <= 0) remoteGoDown(tgt); }
    }

    // ── Rotating shot burst ────────────────────────────────────────────────
    b.shootTimer++;
    const shootInterval = hpFrac < 0.4 ? Math.round(BOSS_SHOOT_INTERVAL * 0.6) : BOSS_SHOOT_INTERVAL;
    if (b.shootTimer >= shootInterval) {
      b.shootTimer = 0;
      const offset = (b.shootPhase * Math.PI / BOSS_SHOT_COUNT);
      for (let i = 0; i < BOSS_SHOT_COUNT; i++) {
        const angle = (i / BOSS_SHOT_COUNT) * Math.PI * 2 + offset;
        BOSS_SHOTS.push({
          x: b.cx * TW, y: b.cy * TH,
          vx: Math.cos(angle) * BOSS_SHOT_SPEED,
          vy: Math.sin(angle) * BOSS_SHOT_SPEED,
          life: 210, maxLife: 210,
        });
      }
      b.shootPhase = (b.shootPhase + 1) % BOSS_SHOT_COUNT;
    }
  });
  for (let i = BOSS_DEMONS.length - 1; i >= 0; i--) {
    if (BOSS_DEMONS[i].dead && BOSS_DEMONS[i].deathTimer <= 0) BOSS_DEMONS.splice(i, 1);
  }
}

function updateBossShots() {
  for (let i = BOSS_SHOTS.length - 1; i >= 0; i--) {
    const s = BOSS_SHOTS[i];
    s.x += s.vx; s.y += s.vy; s.life--;
    const tc = s.x / TW | 0, tr = s.y / TH | 0;
    const wallHit = s.life <= 0 || tr < 0 || tr >= MAP_H || tc < 0 || tc >= MAP_W
      || MAP[tr]?.[tc] === T.WALL || MAP[tr]?.[tc] === T.PILLAR;
    if (wallHit) { BOSS_SHOTS.splice(i, 1); continue; }
    const tgt = nearestPlayerTo(s.x / TW, s.y / TH);
    if (!tgt.dead && !tgt.downed && tgt.hurtTimer <= 0 &&
        Math.hypot(s.x - tgt.cx * TW, s.y - tgt.cy * TH) < TW * 0.62) {
      applyDamage(tgt, BOSS_SHOT_DMG);
      if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
      else                { if (tgt.hp <= 0) remoteGoDown(tgt); }
      BOSS_SHOTS.splice(i, 1);
    }
  }
}

// ── Drawing ───────────────────────────────────────────────────────────────────

function drawBossDemon(b) {
  if (b.dead && b.deathTimer <= 0) return;
  const px = b.cx * TW, py = b.cy * TH;
  const sz = TW * 3.2;
  const alpha = b.dead ? (b.deathTimer / 60) : 1;
  const tt = performance.now() / 1000;
  const pulse = Math.sin(tt * 2.5) * 0.08 + 0.92;

  // ── Render sprite to pixel-art offscreen canvas ───────────────────────────
  const PRES = 56, PSZ = 24;            // offscreen res × inner scale
  const CX = 28, CY = 30;              // sprite origin on offscreen (horn room above)
  _demonPC.clearRect(0, 0, PRES, PRES);
  _demonPC.save();
  _demonPC.translate(CX, CY);
  const c = _demonPC;

  // Ground shadow
  c.save(); c.globalAlpha = 0.45;
  c.fillStyle = '#000'; c.beginPath();
  c.ellipse(0, PSZ * 0.44, PSZ * 0.43, PSZ * 0.12, 0, 0, Math.PI * 2); c.fill();
  c.restore();

  // Pulsing red aura
  const aura = c.createRadialGradient(0, 0, PSZ * 0.2, 0, 0, PSZ * 0.85 * pulse);
  aura.addColorStop(0, 'rgba(160,0,0,0.22)');
  aura.addColorStop(0.6, 'rgba(100,0,0,0.12)');
  aura.addColorStop(1, 'rgba(60,0,0,0)');
  c.fillStyle = aura; c.beginPath(); c.arc(0, 0, PSZ * 0.85, 0, Math.PI * 2); c.fill();

  // Tentacle spikes
  const numSpikes = 20;
  for (let i = 0; i < numSpikes; i++) {
    const angle = (i / numSpikes) * Math.PI * 2 + tt * 0.22;
    const sLen  = PSZ * (0.44 + Math.sin(tt * 1.7 + i * 0.94) * 0.055);
    const sBase = PSZ * 0.27;
    const col   = i % 3 === 0 ? '#7a0000' : i % 3 === 1 ? '#550000' : '#3e0000';
    c.save(); c.rotate(angle); c.fillStyle = col;
    c.beginPath();
    c.moveTo(-PSZ * 0.030, sBase); c.lineTo( PSZ * 0.030, sBase);
    c.lineTo( PSZ * 0.010, sLen);  c.lineTo(-PSZ * 0.010, sLen);
    c.closePath(); c.fill(); c.restore();
  }

  // Main body
  const bodyG = c.createRadialGradient(-PSZ*0.05, -PSZ*0.06, 0, 0, 0, PSZ * 0.34);
  bodyG.addColorStop(0, '#9b1414'); bodyG.addColorStop(0.55, '#6b0808'); bodyG.addColorStop(1, '#3d0000');
  c.fillStyle = bodyG; c.beginPath(); c.arc(0, 0, PSZ * 0.32, 0, Math.PI * 2); c.fill();

  // Web lines
  c.save(); c.strokeStyle = 'rgba(200,50,50,0.28)'; c.lineWidth = Math.max(1, PSZ * 0.014);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a)*PSZ*0.30, Math.sin(a)*PSZ*0.30); c.stroke();
  }
  c.strokeStyle = 'rgba(180,30,30,0.18)';
  [0.10, 0.20, 0.30].forEach(r => { c.beginPath(); c.arc(0,0,PSZ*r,0,Math.PI*2); c.stroke(); });
  c.restore();

  // Left horn
  c.save(); c.strokeStyle = '#090909'; c.lineWidth = Math.max(1, PSZ * 0.072);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-PSZ*0.21,-PSZ*0.16);
  c.bezierCurveTo(-PSZ*0.40,-PSZ*0.41,-PSZ*0.46,-PSZ*0.59,-PSZ*0.20,-PSZ*0.67); c.stroke();
  c.lineWidth = Math.max(1, PSZ * 0.042);
  c.beginPath(); c.moveTo(-PSZ*0.20,-PSZ*0.67); c.lineTo(-PSZ*0.08,-PSZ*0.56); c.stroke();
  c.restore();

  // Right horn
  c.save(); c.strokeStyle = '#090909'; c.lineWidth = Math.max(1, PSZ * 0.072);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(PSZ*0.21,-PSZ*0.16);
  c.bezierCurveTo(PSZ*0.40,-PSZ*0.41,PSZ*0.46,-PSZ*0.59,PSZ*0.20,-PSZ*0.67); c.stroke();
  c.lineWidth = Math.max(1, PSZ * 0.042);
  c.beginPath(); c.moveTo(PSZ*0.20,-PSZ*0.67); c.lineTo(PSZ*0.08,-PSZ*0.56); c.stroke();
  c.restore();

  // Mouth
  c.fillStyle = '#050005'; c.beginPath();
  c.ellipse(0, PSZ*0.10, PSZ*0.255, PSZ*0.135, 0, 0, Math.PI); c.fill();

  // Upper teeth
  const numUT = 7;
  for (let i = 0; i < numUT; i++) {
    const tx   = -PSZ*0.22 + (i/(numUT-1))*PSZ*0.44;
    const tLen = PSZ * (i%2===0 ? 0.185 : 0.115);
    c.fillStyle = i%2===0 ? '#c8d020' : '#a0b018';
    c.beginPath(); c.moveTo(tx-PSZ*0.028,PSZ*0.020); c.lineTo(tx+PSZ*0.028,PSZ*0.020);
    c.lineTo(tx+PSZ*0.010,PSZ*0.020+tLen); c.lineTo(tx-PSZ*0.010,PSZ*0.020+tLen); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,160,0.35)';
    c.beginPath(); c.moveTo(tx-PSZ*0.012,PSZ*0.022); c.lineTo(tx+PSZ*0.005,PSZ*0.022);
    c.lineTo(tx-PSZ*0.010,PSZ*0.022+tLen*0.55); c.closePath(); c.fill();
  }

  // Lower teeth
  const numLT = 6;
  for (let i = 0; i < numLT; i++) {
    const tx   = -PSZ*0.20 + (i/(numLT-1))*PSZ*0.40;
    const tLen = PSZ * (i%2===0 ? 0.14 : 0.09);
    c.fillStyle = i%2===0 ? '#a8b015' : '#88900f';
    c.beginPath(); c.moveTo(tx-PSZ*0.024,PSZ*0.245); c.lineTo(tx+PSZ*0.024,PSZ*0.245);
    c.lineTo(tx+PSZ*0.008,PSZ*0.245-tLen); c.lineTo(tx-PSZ*0.008,PSZ*0.245-tLen); c.closePath(); c.fill();
  }

  // Eye socket
  c.fillStyle = '#200010'; c.beginPath();
  c.ellipse(0,-PSZ*0.050,PSZ*0.138,PSZ*0.108,0,0,Math.PI*2); c.fill();
  // Sclera
  c.fillStyle = '#f5ebe5'; c.beginPath();
  c.ellipse(0,-PSZ*0.052,PSZ*0.102,PSZ*0.082,0,0,Math.PI*2); c.fill();
  // Iris
  c.fillStyle = '#cc1111'; c.beginPath();
  c.ellipse(0,-PSZ*0.052,PSZ*0.066,PSZ*0.066,0,0,Math.PI*2); c.fill();
  // Pupil
  c.fillStyle = '#000'; c.beginPath();
  c.ellipse(0,-PSZ*0.052,PSZ*0.022,PSZ*0.046,0,0,Math.PI*2); c.fill();
  // Eye glow
  const eyeG = c.createRadialGradient(0,-PSZ*0.052,0,0,-PSZ*0.052,PSZ*0.135);
  eyeG.addColorStop(0,'rgba(255,30,30,0.50)'); eyeG.addColorStop(0.5,'rgba(180,0,0,0.18)'); eyeG.addColorStop(1,'rgba(120,0,0,0)');
  c.fillStyle = eyeG; c.beginPath(); c.arc(0,-PSZ*0.052,PSZ*0.135,0,Math.PI*2); c.fill();
  // Glint
  c.fillStyle = 'rgba(255,220,220,0.88)'; c.beginPath();
  c.arc(-PSZ*0.024,-PSZ*0.076,PSZ*0.016,0,Math.PI*2); c.fill();

  // Hit flash
  if (b.hitFlash > 0) {
    c.globalAlpha = (b.hitFlash / 9) * 0.65;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, PSZ*0.35, 0, Math.PI*2); c.fill();
  }

  _demonPC.restore(); // end translate
  _snapAlpha(_demonPC, PRES, PRES);

  // ── Blit pixelated sprite to main canvas ─────────────────────────────────
  const scale = sz / PSZ;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_demonPix, px - CX * scale, py - CY * scale, PRES * scale, PRES * scale);
  ctx.restore();

  // Health bar (smooth, on main canvas)
  if (!b.dead) {
    const bw = sz * 1.18, bh = Math.max(8, TH * 0.20);
    const bx = px - bw / 2, by = py - sz * 0.82;
    ctx.fillStyle = '#1a0000'; ctx.fillRect(bx, by, bw, bh);
    const f    = Math.max(0, b.hp / b.maxHp);
    const hcol = f > 0.5 ? '#cc0000' : f > 0.25 ? '#880000' : '#ff2200';
    ctx.fillStyle = hcol; ctx.fillRect(bx, by, bw * f, bh);
    ctx.strokeStyle = 'rgba(255,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ff2222';
    ctx.font = `bold ${Math.round(TH * 0.28)}px Segoe UI`;
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
    ctx.fillText('👁 EYE DEMON', px, by - 2);
    ctx.restore();
  }
}

function drawBossShots() {
  BOSS_SHOTS.forEach(s => {
    const a = s.life / s.maxLife;
    const r = Math.max(2, TW * 0.22);
    ctx.save();
    ctx.globalAlpha = 0.92 * a;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.8);
    g.addColorStop(0, 'rgba(255,50,50,0.95)');
    g.addColorStop(0.4, 'rgba(200,0,0,0.55)');
    g.addColorStop(1, 'rgba(100,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe0e0';
    ctx.beginPath();
    ctx.arc(s.x - r * 0.12, s.y - r * 0.12, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawBossSpawnTile(r, c) {
  drawFloor(r, c, T.FLOOR);
  const x = c * TW, y = r * TH;
  const cx2 = x + TW / 2, cy2 = y + TH / 2;
  const rad = Math.min(TW, TH) * 0.38;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#8b0000';
  ctx.lineWidth = Math.max(1, TW * 0.08);
  ctx.beginPath(); ctx.arc(cx2, cy2, rad, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(140,0,0,0.5)';
  ctx.lineWidth = Math.max(1, TW * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx2 - rad * 0.7, cy2); ctx.lineTo(cx2 + rad * 0.7, cy2);
  ctx.moveTo(cx2, cy2 - rad * 0.7); ctx.lineTo(cx2, cy2 + rad * 0.7);
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,0,0,0.6)';
  ctx.beginPath(); ctx.arc(cx2, cy2, rad * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── VENOM QUEEN (SPIDER BOSS) — Round 20 ─────────────────────────────────────
const SPIDER_BOSSES    = [];
const SPIDER_WEB_SHOTS = [];
const SPIDER_MINIONS   = [];
let   secondSpiderDropped = false;

const SPIDER_BASE_HP        = 14000;
const SPIDER_SHOT_SPEED     = 3.2;
const SPIDER_WEB_SHOT_DMG   = 25;
const SPIDER_SHOOT_INTERVAL = 65;
const SPIDER_SHOT_COUNT     = 8;
const SPIDER_MINION_INTERVAL = 360; // ~6s at 60fps
const SPIDER_CHARGE_INTERVAL = 300; // ~5s
const SPIDER_CHARGE_DURATION = 55;
const SPIDER_CHARGE_SPEED    = 0.18;

function getSpiderSpawnTiles() {
  const pts = [];
  for (let r = 0; r < MAP_H; r++)
    for (let c = 0; c < MAP_W; c++)
      if (MAP[r][c] === T.SPIDER_SPAWN) pts.push({ cx: c + 0.5, cy: r + 0.5 });
  if (!pts.length) pts.push({ cx: MAP_W * 0.5 + 3, cy: MAP_H * 0.5 + 2 });
  return pts;
}

function spawnSpiderBoss() {
  const pts = getSpiderSpawnTiles();
  const sp = pts[Math.floor(Math.random() * pts.length)];
  const hp = SPIDER_BASE_HP + game.round * 300;
  return {
    cx: sp.cx, cy: sp.cy,
    hp, maxHp: hp,
    dead: false, deathTimer: 0, hitFlash: 0,
    shootTimer: 30, shootPhase: 0,
    minionTimer: 0,
    chargeTimer: 60, chargeActive: false, chargeDuration: 0,
    chargeDx: 0, chargeDy: 0,
    enraged: false,
  };
}

function hitSpiderBoss(b, wkey, papMult = 1) {
  const { dmg: rawDmg, crit } = rollDamage(WEAPONS[wkey].baseDmg);
  const cap = 700 + game.round * 25;
  const dmg = Math.min(Math.round(rawDmg * papMult), cap);
  b.hp -= dmg;
  b.hitFlash = 9;
  const nc = papMult > 1
    ? `hsl(${(performance.now() / 4) % 360},100%,65%)`
    : crit ? '#cc44ff' : '#44ff88';
  spawnDmgNum(b.cx * TW, b.cy * TH - TH * 1.5, dmg, nc);
  if (b.hp <= 0) {
    b.dead = true;
    b.deathTimer = 80;
    game.kills += 10;
    game.score  += 1000;
    for (let i = 0; i < 12; i++) {
      spawnCoin(
        b.cx + (Math.random() - 0.5) * 3.5,
        b.cy + (Math.random() - 0.5) * 3.5,
        180 + game.round * 30
      );
    }
    DROPPED_PERKS.push({ cx: b.cx - 1.8, cy: b.cy, type: 'doublePoints', bob: 0, life: 900 });
    DROPPED_PERKS.push({ cx: b.cx + 1.8, cy: b.cy, type: 'magnet',       bob: 0, life: 900 });
    // Drop tier-2 spread orb (green) for 3rd pistol bullet line
    if (!secondSpiderDropped) {
      secondSpiderDropped = true;
      spawnSpreadDrop(b.cx, b.cy + 3.0, 2);
    }
    if (player.perks.lifesteal > 0 && !player.dead) {
      const heal = LIFESTEAL_HP[player.perks.lifesteal] * 4;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      spawnDmgNum(player.cx * TW, player.cy * TH - TH * 0.6, heal, '#44ff88');
    }
  }
}

function hitSpiderMinion(m, wkey, papMult = 1) {
  const { dmg: rawDmg, crit } = rollDamage(WEAPONS[wkey].baseDmg);
  const dmg = Math.round(rawDmg * papMult);
  m.hp -= dmg;
  m.hitFlash = 7;
  spawnDmgNum(m.cx * TW, m.cy * TH - TH * 0.35, dmg, crit ? '#cc44ff' : '#44ff88');
  if (m.hp <= 0) {
    m.dead = true;
    m.deathTimer = 20;
    game.kills++;
    game.score += 15;
    spawnCoin(m.cx, m.cy, 10 + game.round * 4);
    spawnPerk(m.cx, m.cy);
  }
}

function updateSpiderBosses() {
  SPIDER_BOSSES.forEach(b => {
    if (b.dead) { if (b.deathTimer > 0) b.deathTimer--; return; }
    b.hitFlash = Math.max(0, b.hitFlash - 1);
    if (!b.enraged && b.hp / b.maxHp < 0.30) b.enraged = true;

    const tgt = nearestPlayerTo(b.cx, b.cy);
    const dx = tgt.cx - b.cx, dy = tgt.cy - b.cy;

    // ── Charge attack ─────────────────────────────────────────────────────────
    if (!b.chargeActive) {
      b.chargeTimer++;
      const interval = b.enraged ? 180 : SPIDER_CHARGE_INTERVAL;
      if (b.chargeTimer >= interval) {
        b.chargeTimer = 0;
        b.chargeActive = true;
        b.chargeDuration = SPIDER_CHARGE_DURATION;
        const dist = Math.hypot(dx, dy) || 1;
        b.chargeDx = (dx / dist) * SPIDER_CHARGE_SPEED;
        b.chargeDy = (dy / dist) * SPIDER_CHARGE_SPEED;
      }
    }
    if (b.chargeActive) {
      const nx = b.cx + b.chargeDx, ny = b.cy + b.chargeDy;
      if (!isBlocked(nx, b.cy)) b.cx = nx;
      if (!isBlocked(b.cx, ny)) b.cy = ny;
      b.chargeDuration--;
      // Charge contact damage
      const cdist = Math.hypot(tgt.cx - b.cx, tgt.cy - b.cy);
      if (cdist < 1.9 && !tgt.dead && !tgt.downed && tgt.hurtTimer <= 0) {
        applyDamage(tgt, 45);
        if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
        else                { if (tgt.hp <= 0) remoteGoDown(tgt); }
      }
      if (b.chargeDuration <= 0) b.chargeActive = false;
    } else {
      // Chase player between charges — faster when enraged
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 1.2) {
        const spd = b.enraged ? 0.022 : 0.013;
        const nx = b.cx + (dx / dist) * spd, ny = b.cy + (dy / dist) * spd;
        if (!isBlocked(nx, b.cy)) b.cx = nx;
        if (!isBlocked(b.cx, ny)) b.cy = ny;
      }
      // Contact damage when close
      if (dist < 1.8 && tgt.hurtTimer <= 0 && !tgt.dead && !tgt.downed && game.state === 'playing') {
        applyDamage(tgt, 30);
        if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
        else                { if (tgt.hp <= 0) remoteGoDown(tgt); }
      }
    }

    // ── Web volley ────────────────────────────────────────────────────────────
    b.shootTimer++;
    const shootInterval = b.enraged ? Math.round(SPIDER_SHOOT_INTERVAL * 0.5) : SPIDER_SHOOT_INTERVAL;
    if (b.shootTimer >= shootInterval) {
      b.shootTimer = 0;
      const shotCount = b.enraged ? 12 : SPIDER_SHOT_COUNT;
      const offset = (b.shootPhase * Math.PI / shotCount);
      for (let i = 0; i < shotCount; i++) {
        const angle = (i / shotCount) * Math.PI * 2 + offset;
        SPIDER_WEB_SHOTS.push({
          x: b.cx * TW, y: b.cy * TH,
          vx: Math.cos(angle) * SPIDER_SHOT_SPEED,
          vy: Math.sin(angle) * SPIDER_SHOT_SPEED,
          life: 200, maxLife: 200,
        });
      }
      b.shootPhase = (b.shootPhase + 1) % shotCount;
    }

    // ── Spiderling spawns ─────────────────────────────────────────────────────
    b.minionTimer++;
    const mInterval = b.enraged ? Math.round(SPIDER_MINION_INTERVAL * 0.55) : SPIDER_MINION_INTERVAL;
    if (b.minionTimer >= mInterval) {
      b.minionTimer = 0;
      const count = b.enraged ? 6 : 3;
      for (let i = 0; i < count; i++) {
        const hp = 80 + game.round * 12;
        SPIDER_MINIONS.push({
          cx: b.cx + (Math.random() - 0.5) * 2.5,
          cy: b.cy + (Math.random() - 0.5) * 2.5,
          hp, maxHp: hp,
          dead: false, deathTimer: 0, hitFlash: 0,
          frame: Math.random() * 4 | 0, ft: 0,
        });
      }
    }
  });
  for (let i = SPIDER_BOSSES.length - 1; i >= 0; i--) {
    if (SPIDER_BOSSES[i].dead && SPIDER_BOSSES[i].deathTimer <= 0) SPIDER_BOSSES.splice(i, 1);
  }
}

function updateSpiderMinions() {
  const spd = 0.036 + game.round * 0.0004;
  SPIDER_MINIONS.forEach(m => {
    if (m.dead) { if (m.deathTimer > 0) m.deathTimer--; return; }
    m.hitFlash = Math.max(0, m.hitFlash - 1);
    const tgt = nearestPlayerTo(m.cx, m.cy);
    const dx = tgt.cx - m.cx, dy = tgt.cy - m.cy, dist = Math.hypot(dx, dy);
    if (dist > 0.35) {
      const nx = m.cx + (dx / dist) * spd, ny = m.cy + (dy / dist) * spd;
      if (!isBlocked(nx, m.cy)) m.cx = nx;
      if (!isBlocked(m.cx, ny)) m.cy = ny;
    }
    if (dist < 0.60 && !tgt.dead && !tgt.downed && tgt.hurtTimer <= 0) {
      applyDamage(tgt, 12);
      if (tgt === player) { if (tgt.hp <= 0) playerGoDown(); }
      else                { if (tgt.hp <= 0) remoteGoDown(tgt); }
    }
    m.ft += 1 / 60; if (m.ft >= 0.09) { m.frame = (m.frame + 1) % 4; m.ft = 0; }
  });
  for (let i = SPIDER_MINIONS.length - 1; i >= 0; i--) {
    if (SPIDER_MINIONS[i].dead && SPIDER_MINIONS[i].deathTimer <= 0) SPIDER_MINIONS.splice(i, 1);
  }
}

function updateSpiderWebShots() {
  for (let i = SPIDER_WEB_SHOTS.length - 1; i >= 0; i--) {
    const s = SPIDER_WEB_SHOTS[i];
    s.x += s.vx; s.y += s.vy; s.life--;
    const tc = s.x / TW | 0, tr = s.y / TH | 0;
    const wallHit = s.life <= 0 || tr < 0 || tr >= MAP_H || tc < 0 || tc >= MAP_W
      || MAP[tr]?.[tc] === T.WALL || MAP[tr]?.[tc] === T.PILLAR;
    if (wallHit) { SPIDER_WEB_SHOTS.splice(i, 1); continue; }
    const tgt = nearestPlayerTo(s.x / TW, s.y / TH);
    if (!tgt.dead && !tgt.downed && tgt.hurtTimer <= 0 &&
        Math.hypot(s.x - tgt.cx * TW, s.y - tgt.cy * TH) < TW * 0.62) {
      applyDamage(tgt, SPIDER_WEB_SHOT_DMG);
      if (tgt === player) {
        player.webSlowTimer = 150; // 2.5 sec slow
        if (tgt.hp <= 0) playerGoDown();
      } else {
        if (tgt.hp <= 0) remoteGoDown(tgt);
      }
      SPIDER_WEB_SHOTS.splice(i, 1);
    }
  }
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawSpiderBoss(b) {
  if (b.dead && b.deathTimer <= 0) return;
  const px = b.cx * TW, py = b.cy * TH;
  const sz = TW * 4.4;
  const alpha = b.dead ? (b.deathTimer / 80) : 1;
  const tt = performance.now() / 1000;
  const pulse = Math.sin(tt * 2.2) * 0.07 + 0.93;

  // ── Render sprite to pixel-art offscreen canvas ───────────────────────────
  const PRES = 64, PSZ = 32;            // offscreen res × inner scale
  const CX = 32, CY = 33;              // sprite origin on offscreen
  _spiderPC.clearRect(0, 0, PRES, PRES);
  _spiderPC.save();
  _spiderPC.translate(CX, CY);
  const c = _spiderPC;

  // Ground shadow
  c.save(); c.globalAlpha = 0.38;
  c.fillStyle = '#000'; c.beginPath();
  c.ellipse(0, PSZ*0.40, PSZ*0.54, PSZ*0.10, 0, 0, Math.PI*2); c.fill();
  c.restore();

  // Aura glow
  const auraC = b.enraged ? 'rgba(220,80,0,' : 'rgba(0,180,40,';
  const aura = c.createRadialGradient(0, 0, PSZ*0.15, 0, 0, PSZ*0.92*pulse);
  aura.addColorStop(0, auraC + '0.18)'); aura.addColorStop(0.55, auraC + '0.09)'); aura.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle = aura; c.beginPath(); c.arc(0, 0, PSZ*0.92, 0, Math.PI*2); c.fill();

  // 8 Legs
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const legDefs = [
    [-1,-0.14,0.10],[-1,-0.04,0.22],[-1,0.06,0.22],[-1,0.16,0.10],
    [ 1,-0.14,0.10],[ 1,-0.04,0.22],[ 1,0.06,0.22],[ 1,0.16,0.10],
  ];
  legDefs.forEach(([side, yOff, spread], i) => {
    const legAnim = Math.sin(tt * 5.5 + i * 0.8) * 0.06;
    const ox = side * PSZ * 0.29, oy = yOff * PSZ;
    const mx = side * (PSZ * 0.52 + legAnim * PSZ * 0.08);
    const my = oy - PSZ * (0.16 - spread) + legAnim * PSZ * 0.05;
    const tx = side * (PSZ * 0.62 + spread * PSZ * 0.3);
    const ty = my + PSZ * (0.28 + spread * 0.15);
    c.lineWidth = Math.max(1, PSZ * 0.028); c.strokeStyle = '#0c3d07';
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(mx, my); c.stroke();
    c.lineWidth = Math.max(1, PSZ * 0.022); c.strokeStyle = '#082802';
    c.beginPath(); c.moveTo(mx, my); c.lineTo(tx, ty); c.stroke();
    c.strokeStyle = 'rgba(40,200,60,0.18)'; c.lineWidth = Math.max(1, PSZ * 0.008);
    c.beginPath(); c.moveTo(ox, oy-1); c.lineTo(mx, my-1); c.stroke();
  });
  c.restore();

  // Main body
  const bodyG = c.createRadialGradient(-PSZ*0.07,-PSZ*0.08,0,0,PSZ*0.02,PSZ*0.36);
  if (b.enraged) {
    bodyG.addColorStop(0,'#99ff44'); bodyG.addColorStop(0.5,'#44aa10'); bodyG.addColorStop(1,'#1a5500');
  } else {
    bodyG.addColorStop(0,'#55cc28'); bodyG.addColorStop(0.5,'#228814'); bodyG.addColorStop(1,'#0c4c08');
  }
  c.fillStyle = bodyG; c.beginPath(); c.arc(0, PSZ*0.02, PSZ*0.335, 0, Math.PI*2); c.fill();
  c.strokeStyle = b.enraged ? 'rgba(160,255,40,0.35)' : 'rgba(40,220,60,0.28)';
  c.lineWidth = Math.max(1, PSZ*0.014);
  c.beginPath(); c.arc(0, PSZ*0.02, PSZ*0.335, 0, Math.PI*2); c.stroke();

  // Spike crown
  const crownCx = 0, crownCy = -PSZ*0.13;
  const crownG = c.createRadialGradient(crownCx,crownCy-PSZ*0.04,0,crownCx,crownCy,PSZ*0.23);
  crownG.addColorStop(0,'#66ee44'); crownG.addColorStop(1,'#1a7010');
  c.fillStyle = crownG; c.beginPath(); c.arc(crownCx, crownCy, PSZ*0.22, 0, Math.PI*2); c.fill();
  const spikeCount = 8;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i/spikeCount)*Math.PI*2;
    const r1=PSZ*0.20, r2=PSZ*0.34, w=PSZ*0.032;
    const bxs=crownCx+Math.cos(a)*r1, bys=crownCy+Math.sin(a)*r1;
    const txs=crownCx+Math.cos(a)*r2, tys=crownCy+Math.sin(a)*r2;
    const px2=Math.cos(a+Math.PI/2)*w, py2=Math.sin(a+Math.PI/2)*w;
    c.fillStyle = '#165810';
    c.beginPath(); c.moveTo(bxs-px2,bys-py2); c.lineTo(bxs+px2,bys+py2); c.lineTo(txs,tys); c.closePath(); c.fill();
    c.fillStyle = 'rgba(120,255,80,0.25)';
    c.beginPath(); c.moveTo(bxs-px2*0.5,bys-py2*0.5); c.lineTo(bxs+px2*0.15,bys+py2*0.15); c.lineTo(txs,tys); c.closePath(); c.fill();
  }

  // Abdomen
  const abdG = c.createRadialGradient(0, PSZ*0.10, 0, 0, PSZ*0.18, PSZ*0.20);
  abdG.addColorStop(0,'#1a9010'); abdG.addColorStop(1,'#0a4008');
  c.fillStyle = abdG; c.beginPath(); c.ellipse(0, PSZ*0.20, PSZ*0.19, PSZ*0.17, 0, 0, Math.PI*2); c.fill();
  c.strokeStyle = 'rgba(40,200,40,0.18)'; c.lineWidth = Math.max(1, PSZ*0.010);
  c.beginPath(); c.ellipse(0, PSZ*0.20, PSZ*0.11, PSZ*0.10, 0, 0, Math.PI*2); c.stroke();

  // Chelicera / fangs
  [-1, 1].forEach(side => {
    c.save(); c.strokeStyle = '#b8d060'; c.lineWidth = Math.max(1, PSZ*0.036); c.lineCap = 'round';
    c.beginPath(); c.moveTo(side*PSZ*0.09, PSZ*0.13);
    c.bezierCurveTo(side*PSZ*0.24,PSZ*0.15,side*PSZ*0.32,PSZ*0.24,side*PSZ*0.24,PSZ*0.36); c.stroke();
    c.strokeStyle = '#70880a'; c.lineWidth = Math.max(1, PSZ*0.020);
    c.beginPath(); c.moveTo(side*PSZ*0.24,PSZ*0.32); c.lineTo(side*PSZ*0.19,PSZ*0.40); c.stroke();
    c.restore();
  });

  // 4 pink eyes (2×2)
  const eyePos = [[-PSZ*0.11,-PSZ*0.02],[PSZ*0.11,-PSZ*0.02],[-PSZ*0.11,PSZ*0.11],[PSZ*0.11,PSZ*0.11]];
  eyePos.forEach(([ex, ey], i) => {
    const ep = Math.sin(tt*4.2+i*0.9)*0.12+0.88;
    const eg = c.createRadialGradient(ex,ey,0,ex,ey,PSZ*0.10);
    eg.addColorStop(0,`rgba(255,80,230,${0.55*ep})`); eg.addColorStop(0.5,`rgba(200,0,190,${0.22*ep})`); eg.addColorStop(1,'rgba(140,0,140,0)');
    c.fillStyle = eg; c.beginPath(); c.arc(ex,ey,PSZ*0.10,0,Math.PI*2); c.fill();
    c.fillStyle = '#ffe8ff'; c.beginPath(); c.arc(ex,ey,PSZ*0.050,0,Math.PI*2); c.fill();
    c.fillStyle = `hsl(310,100%,${48+ep*14}%)`; c.beginPath(); c.arc(ex,ey,PSZ*0.032,0,Math.PI*2); c.fill();
    c.fillStyle = '#1a001f'; c.beginPath(); c.arc(ex,ey,PSZ*0.014,0,Math.PI*2); c.fill();
    c.fillStyle = 'rgba(255,220,255,0.90)'; c.beginPath(); c.arc(ex-PSZ*0.013,ey-PSZ*0.015,PSZ*0.010,0,Math.PI*2); c.fill();
  });

  // Charge flash
  if (b.chargeActive) {
    const cf = b.chargeDuration / SPIDER_CHARGE_DURATION;
    c.globalAlpha = cf * 0.3;
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, PSZ*0.02, PSZ*0.36, 0, Math.PI*2); c.fill();
  }

  // Hit flash
  if (b.hitFlash > 0) {
    c.globalAlpha = (b.hitFlash / 9) * 0.58;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, PSZ*0.02, PSZ*0.36, 0, Math.PI*2); c.fill();
  }

  _spiderPC.restore(); // end translate
  _snapAlpha(_spiderPC, PRES, PRES);

  // ── Blit pixelated sprite to main canvas ─────────────────────────────────
  const scale = sz / PSZ;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_spiderPix, px - CX * scale, py - CY * scale, PRES * scale, PRES * scale);
  ctx.restore();

  // Health bar (smooth, on main canvas)
  if (!b.dead) {
    const bw = sz * 1.35, bh = Math.max(9, TH * 0.22);
    const bx = px - bw / 2, by = py - sz * 0.95;
    ctx.fillStyle = '#001800'; ctx.fillRect(bx, by, bw, bh);
    const f = Math.max(0, b.hp / b.maxHp);
    const hcol = b.enraged ? '#ff4400' : (f > 0.5 ? '#00cc22' : f > 0.25 ? '#77cc00' : '#bbff00');
    ctx.fillStyle = hcol; ctx.fillRect(bx, by, bw * f, bh);
    ctx.strokeStyle = b.enraged ? 'rgba(255,100,0,0.55)' : 'rgba(0,255,60,0.45)';
    ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = b.enraged ? '#ff5500' : '#22ff55';
    ctx.font = `bold ${Math.round(TH * 0.28)}px Segoe UI`;
    ctx.shadowColor = b.enraged ? '#ff4400' : '#00ff44'; ctx.shadowBlur = 12;
    ctx.fillText(b.enraged ? '🕷 VENOM QUEEN ⚡ ENRAGED!' : '🕷 VENOM QUEEN', px, by - 3);
    ctx.restore();
  }
}

function drawSpiderMinion(m) {
  const tt = performance.now() / 1000;
  {
    if (m.dead && m.deathTimer <= 0) return;
    const px = m.cx * TW, py = m.cy * TH;
    const sz = TW * 0.90;
    const alpha = m.dead ? (m.deathTimer / 20) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, py);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(0, sz * 0.48, sz * 0.36, sz * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    // 4 legs per side (8 total)
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let j = 0; j < 4; j++) {
        const legAnim = Math.sin(tt * 9 + j * 1.2 + (side < 0 ? 0 : Math.PI)) * 0.06;
        const yOff = (j - 1.5) * sz * 0.12;
        const ox = side * sz * 0.22, oy = yOff;
        const mx = side * sz * (0.42 + legAnim * 0.1), my = yOff - sz * 0.08;
        const tx = side * sz * (0.55 + j * 0.04), ty = sz * 0.28 + j * sz * 0.02;
        ctx.strokeStyle = '#0c3802';
        ctx.lineWidth = Math.max(1, sz * 0.09);
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(mx, my); ctx.stroke();
        ctx.lineWidth = Math.max(1, sz * 0.07);
        ctx.strokeStyle = '#082602';
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
      }
    }

    // Body
    const bg = ctx.createRadialGradient(-sz * 0.05, -sz * 0.06, 0, 0, 0, sz * 0.32);
    bg.addColorStop(0, '#55cc28'); bg.addColorStop(1, '#0c4a08');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, sz * 0.30, 0, Math.PI * 2); ctx.fill();

    // 2 pink eyes
    [[-sz * 0.10, -sz * 0.07], [sz * 0.10, -sz * 0.07]].forEach(([ex, ey]) => {
      ctx.fillStyle = '#ffbbff';
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.075, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cc00cc';
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#150015';
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.020, 0, Math.PI * 2); ctx.fill();
    });

    if (m.hitFlash > 0) {
      ctx.globalAlpha = (m.hitFlash / 9) * 0.55;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, sz * 0.32, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Tiny HP bar when damaged
    if (!m.dead && m.hp < m.maxHp) {
      const bw = sz * 1.25, bh = Math.max(3, TH * 0.09);
      const bx = px - bw / 2, by = py - sz * 0.55;
      ctx.fillStyle = '#001800'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#44cc22'; ctx.fillRect(bx, by, bw * (m.hp / m.maxHp), bh);
    }
  }
}

function drawSpiderWebShots() {
  SPIDER_WEB_SHOTS.forEach(s => {
    const a = s.life / s.maxLife;
    const r = Math.max(2, TW * 0.20);
    ctx.save();
    ctx.globalAlpha = 0.88 * a;
    // Green glow
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.8);
    g.addColorStop(0, 'rgba(80,255,100,0.90)');
    g.addColorStop(0.4, 'rgba(0,180,40,0.48)');
    g.addColorStop(1, 'rgba(0,60,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.8, 0, Math.PI * 2); ctx.fill();
    // Core
    ctx.globalAlpha = a;
    ctx.fillStyle = '#66ff88';
    ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.50, 0, Math.PI * 2); ctx.fill();
    // Web cross detail
    ctx.strokeStyle = 'rgba(40,220,60,0.65)';
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.45, s.y); ctx.lineTo(s.x + r * 0.45, s.y);
    ctx.moveTo(s.x, s.y - r * 0.45); ctx.lineTo(s.x, s.y + r * 0.45);
    ctx.stroke();
    ctx.restore();
  });
}
