
// ─── EYE DEMON BOSS ────────────────────────────────────────────────────────────
const BOSS_DEMONS = [];
const BOSS_SHOTS  = [];

const BOSS_BASE_HP        = 3000;
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
  const hp  = BOSS_BASE_HP + game.round * 150;
  return {
    cx: sp.cx, cy: sp.cy,
    hp, maxHp: hp,
    dead: false, deathTimer: 0, hitFlash: 0,
    shootTimer: 30, shootPhase: 0,
  };
}

function hitBoss(b, wkey, papMult = 1) {
  const { dmg: rawDmg, crit } = rollDamage(WEAPONS[wkey].baseDmg);
  const dmg = Math.round(rawDmg * papMult);
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
    if (player.perks.lifesteal > 0 && !player.dead) {
      const heal = LIFESTEAL_HP[player.perks.lifesteal] * 3;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      spawnDmgNum(player.cx * TW, player.cy * TH - TH * 0.6, heal, '#44ff88');
    }
  }
}

function updateBossDemons() {
  BOSS_DEMONS.forEach(b => {
    if (b.dead) { if (b.deathTimer > 0) b.deathTimer--; return; }
    b.hitFlash = Math.max(0, b.hitFlash - 1);
    b.shootTimer++;
    if (b.shootTimer >= BOSS_SHOOT_INTERVAL) {
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

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px, py);

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.45 * alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, sz * 0.44, sz * 0.43, sz * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pulsing red aura
  const aura = ctx.createRadialGradient(0, 0, sz * 0.2, 0, 0, sz * 0.85 * pulse);
  aura.addColorStop(0, 'rgba(160,0,0,0.22)');
  aura.addColorStop(0.6, 'rgba(100,0,0,0.12)');
  aura.addColorStop(1, 'rgba(60,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, sz * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Radiating tentacle spikes (like the image appendages)
  const numSpikes = 20;
  for (let i = 0; i < numSpikes; i++) {
    const angle = (i / numSpikes) * Math.PI * 2 + tt * 0.22;
    const sLen  = sz * (0.44 + Math.sin(tt * 1.7 + i * 0.94) * 0.055);
    const sBase = sz * 0.27;
    const col   = i % 3 === 0 ? '#7a0000' : i % 3 === 1 ? '#550000' : '#3e0000';
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-sz * 0.030, sBase);
    ctx.lineTo( sz * 0.030, sBase);
    ctx.lineTo( sz * 0.010, sLen);
    ctx.lineTo(-sz * 0.010, sLen);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Main body
  const bodyG = ctx.createRadialGradient(-sz*0.05, -sz*0.06, 0, 0, 0, sz * 0.34);
  bodyG.addColorStop(0, '#9b1414');
  bodyG.addColorStop(0.55, '#6b0808');
  bodyG.addColorStop(1, '#3d0000');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.arc(0, 0, sz * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Vein / web lines (spider-web pattern from the image)
  ctx.save();
  ctx.strokeStyle = 'rgba(200,50,50,0.28)';
  ctx.lineWidth = Math.max(1, sz * 0.014);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * sz * 0.30, Math.sin(a) * sz * 0.30);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(180,30,30,0.18)';
  [0.10, 0.20, 0.30].forEach(r => {
    ctx.beginPath(); ctx.arc(0, 0, sz * r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();

  // LEFT HORN
  ctx.save();
  ctx.strokeStyle = '#090909';
  ctx.lineWidth   = Math.max(3, sz * 0.072);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-sz * 0.21, -sz * 0.16);
  ctx.bezierCurveTo(-sz * 0.40, -sz * 0.41, -sz * 0.46, -sz * 0.59, -sz * 0.20, -sz * 0.67);
  ctx.stroke();
  // Left horn tip branch
  ctx.lineWidth = Math.max(2, sz * 0.042);
  ctx.beginPath();
  ctx.moveTo(-sz * 0.20, -sz * 0.67);
  ctx.lineTo(-sz * 0.08, -sz * 0.56);
  ctx.stroke();
  ctx.restore();

  // RIGHT HORN
  ctx.save();
  ctx.strokeStyle = '#090909';
  ctx.lineWidth   = Math.max(3, sz * 0.072);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(sz * 0.21, -sz * 0.16);
  ctx.bezierCurveTo(sz * 0.40, -sz * 0.41, sz * 0.46, -sz * 0.59, sz * 0.20, -sz * 0.67);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, sz * 0.042);
  ctx.beginPath();
  ctx.moveTo(sz * 0.20, -sz * 0.67);
  ctx.lineTo(sz * 0.08, -sz * 0.56);
  ctx.stroke();
  ctx.restore();

  // MOUTH — dark cavity
  ctx.fillStyle = '#050005';
  ctx.beginPath();
  ctx.ellipse(0, sz * 0.10, sz * 0.255, sz * 0.135, 0, 0, Math.PI);
  ctx.fill();

  // Upper teeth — jagged yellow-green like in image
  const numUT = 7;
  for (let i = 0; i < numUT; i++) {
    const tx   = -sz * 0.22 + (i / (numUT - 1)) * sz * 0.44;
    const tLen = sz * (i % 2 === 0 ? 0.185 : 0.115);
    ctx.fillStyle = i % 2 === 0 ? '#c8d020' : '#a0b018';
    ctx.beginPath();
    ctx.moveTo(tx - sz * 0.028, sz * 0.020);
    ctx.lineTo(tx + sz * 0.028, sz * 0.020);
    ctx.lineTo(tx + sz * 0.010, sz * 0.020 + tLen);
    ctx.lineTo(tx - sz * 0.010, sz * 0.020 + tLen);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,160,0.35)';
    ctx.beginPath();
    ctx.moveTo(tx - sz * 0.012, sz * 0.022);
    ctx.lineTo(tx + sz * 0.005, sz * 0.022);
    ctx.lineTo(tx - sz * 0.010, sz * 0.022 + tLen * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  // Lower teeth — jutting upward
  const numLT = 6;
  for (let i = 0; i < numLT; i++) {
    const tx   = -sz * 0.20 + (i / (numLT - 1)) * sz * 0.40;
    const tLen = sz * (i % 2 === 0 ? 0.14 : 0.09);
    ctx.fillStyle = i % 2 === 0 ? '#a8b015' : '#88900f';
    ctx.beginPath();
    ctx.moveTo(tx - sz * 0.024, sz * 0.245);
    ctx.lineTo(tx + sz * 0.024, sz * 0.245);
    ctx.lineTo(tx + sz * 0.008, sz * 0.245 - tLen);
    ctx.lineTo(tx - sz * 0.008, sz * 0.245 - tLen);
    ctx.closePath();
    ctx.fill();
  }

  // EYE — central single eye (key feature from the image)
  // Socket shadow
  ctx.fillStyle = '#200010';
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.050, sz * 0.138, sz * 0.108, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sclera
  ctx.fillStyle = '#f5ebe5';
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.052, sz * 0.102, sz * 0.082, 0, 0, Math.PI * 2);
  ctx.fill();
  // Iris (deep red)
  ctx.fillStyle = '#cc1111';
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.052, sz * 0.066, sz * 0.066, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupil (vertical black slit)
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.052, sz * 0.022, sz * 0.046, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye red glow
  const eyeG = ctx.createRadialGradient(0, -sz*0.052, 0, 0, -sz*0.052, sz * 0.135);
  eyeG.addColorStop(0, 'rgba(255,30,30,0.50)');
  eyeG.addColorStop(0.5, 'rgba(180,0,0,0.18)');
  eyeG.addColorStop(1, 'rgba(120,0,0,0)');
  ctx.fillStyle = eyeG;
  ctx.beginPath();
  ctx.arc(0, -sz * 0.052, sz * 0.135, 0, Math.PI * 2);
  ctx.fill();
  // Glint
  ctx.fillStyle = 'rgba(255,220,220,0.88)';
  ctx.beginPath();
  ctx.arc(-sz * 0.024, -sz * 0.076, sz * 0.016, 0, Math.PI * 2);
  ctx.fill();

  // Hit flash
  if (b.hitFlash > 0) {
    ctx.globalAlpha = (b.hitFlash / 9) * 0.65 * alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, sz * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end translate

  // Health bar
  if (!b.dead) {
    const bw = sz * 1.18, bh = Math.max(8, TH * 0.20);
    const bx = px - bw / 2, by = py - sz * 0.82;
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(bx, by, bw, bh);
    const f    = Math.max(0, b.hp / b.maxHp);
    const hcol = f > 0.5 ? '#cc0000' : f > 0.25 ? '#880000' : '#ff2200';
    ctx.fillStyle = hcol;
    ctx.fillRect(bx, by, bw * f, bh);
    ctx.strokeStyle = 'rgba(255,0,0,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    // Name label
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
