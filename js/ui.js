
// ─── CLICK INDICATOR (right-click move target) ────────────────────────────────
function drawClickIndicator() {
  if (!clickIndicator) return;
  clickIndicator.life--;
  if (clickIndicator.life <= 0) { clickIndicator=null; return; }
  const prog = 1 - clickIndicator.life/30;
  const ir = TW * (0.35 + prog * 0.25);
  const a = (clickIndicator.life/30) * 0.9;
  // clickIndicator stores world pixel coords — drawn inside world transform
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 2;
  ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(clickIndicator.wx, clickIndicator.wy, ir, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#88ffaa';
  ctx.beginPath(); ctx.arc(clickIndicator.wx, clickIndicator.wy, TW*0.07, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────────────
// Cursor is a CSS SVG data-URL set in canvas.js — no canvas drawing needed.
function drawCursor() {}

// ─── PIXEL PANEL HELPERS ──────────────────────────────────────────────────────

// Draws a Terraria-style pixel panel
function pixelPanel(ctx, x, y, w, h, bg) {
  bg = bg || '#0e0e1e';
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  // outer dark border
  ctx.fillStyle = '#050510';
  ctx.fillRect(x,     y,     w, 2);
  ctx.fillRect(x,     y,     2, h);
  ctx.fillRect(x,     y+h-2, w, 2);
  ctx.fillRect(x+w-2, y,     2, h);
  // inner highlight (top-left)
  ctx.fillStyle = '#3a3a5e';
  ctx.fillRect(x+2, y+2, w-4, 1);
  ctx.fillRect(x+2, y+2, 1,   h-4);
  // inner shadow (bottom-right)
  ctx.fillStyle = '#09090f';
  ctx.fillRect(x+2,   y+h-3, w-4, 1);
  ctx.fillRect(x+w-3, y+2,   1,   h-4);
}

// Draws a single inventory slot (Terraria style)
function pixelSlot(ctx, x, y, w, h, bg, active) {
  var bgCol = bg || (active ? '#252545' : '#1a1a30');
  ctx.fillStyle = bgCol;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#050510';
  ctx.fillRect(x,     y,     w, 2);
  ctx.fillRect(x,     y,     2, h);
  ctx.fillRect(x,     y+h-2, w, 2);
  ctx.fillRect(x+w-2, y,     2, h);
  var hi = active ? '#6666cc' : '#3a3a5e';
  ctx.fillStyle = hi;
  ctx.fillRect(x+2, y+2, w-4, 1);
  ctx.fillRect(x+2, y+2, 1,   h-4);
  ctx.fillStyle = '#09090f';
  ctx.fillRect(x+2,   y+h-3, w-4, 1);
  ctx.fillRect(x+w-3, y+2,   1,   h-4);
}

// ─── MINIMAP ──────────────────────────────────────────────────────────────────
function drawMinimap() {
  const pad = 10;
  const labelH = 16;
  const mmW = 180, mmH = 135;
  const mmX = pad;
  const mmY = pad;
  const cW = mmW / MAP_W, cH = mmH / MAP_H;

  ctx.save();

  // Outer pixel panel (includes label bar at bottom)
  pixelPanel(ctx, mmX, mmY, mmW, mmH + labelH, '#0e0e1e');

  // Clip to tile area
  ctx.beginPath();
  ctx.rect(mmX + 2, mmY + 2, mmW - 4, mmH - 2);
  ctx.clip();

  const mapOffY = mmY;

  // Draw tiles
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const t = MAP[r][c];
      const x = mmX + c * cW, y = mapOffY + r * cH;
      if (t === T.WALL) {
        ctx.fillStyle = '#131320'; ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.FLOOR) {
        ctx.fillStyle = '#1e1a32'; ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.SPAWN) {
        ctx.fillStyle = '#2a0e0e'; ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.PILLAR) {
        ctx.fillStyle = '#1a1630'; ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.DOOR) {
        ctx.fillStyle = '#5a2e10'; ctx.fillRect(x, y, cW + .5, cH + .5);
      }
    }
  }

  // Door markers (locked = amber)
  DOORS.forEach(door => {
    if (door.unlocked) return;
    door.tiles.forEach(({r, c}) => {
      ctx.fillStyle = 'rgba(255,180,40,0.7)';
      ctx.fillRect(mmX + c * cW, mapOffY + r * cH, cW + .5, cH + .5);
    });
  });

  ctx.restore();
  ctx.save();

  // Restore clip to full minimap for markers
  ctx.beginPath();
  ctx.rect(mmX + 2, mmY + 2, mmW - 4, mmH - 2);
  ctx.clip();

  // Enemies: 2x2 pixel squares
  ZOMBIES.forEach(z => {
    if (z.dead) return;
    const ex = mmX + z.cx * cW - 1;
    const ey = mapOffY + z.cy * cH - 1;
    ctx.fillStyle = '#dd3030';
    ctx.fillRect(ex, ey, 2, 2);
  });

  // Boss marker: blinking red 3x3
  if (typeof BOSS_DEMONS !== 'undefined') {
    BOSS_DEMONS.forEach(b => {
      if (b.dead) return;
      const blink = Math.floor(performance.now() / 300) % 2 === 0;
      if (!blink) return;
      ctx.fillStyle = '#ff2020';
      ctx.fillRect(mmX + b.cx * cW - 1, mapOffY + b.cy * cH - 1, 3, 3);
    });
  }

  // Shop marker: 2x2 cyan
  ctx.fillStyle = '#44ccff';
  ctx.fillRect(mmX + SHOP_POS.cx * cW - 1, mapOffY + SHOP_POS.cy * cH - 1, 2, 2);

  // Mystery box marker: 2x2 purple
  ctx.fillStyle = '#aa44ff';
  ctx.fillRect(mmX + BOX_POS.cx * cW - 1, mapOffY + BOX_POS.cy * cH - 1, 2, 2);

  // Pack-a-Punch marker: 2x2 rainbow
  ctx.fillStyle = `hsl(${(performance.now()/6)%360},100%,60%)`;
  ctx.fillRect(mmX + PAP_POS.cx * cW - 1, mapOffY + PAP_POS.cy * cH - 1, 2, 2);

  // Perk vendor marker: 2x2 green
  ctx.fillStyle = '#44ffaa';
  ctx.fillRect(mmX + PERK_VENDOR_POS.cx * cW - 1, mapOffY + PERK_VENDOR_POS.cy * cH - 1, 2, 2);

  // Pistol vendor marker: 2x2 steel-blue
  ctx.fillStyle = '#60aaff';
  ctx.fillRect(mmX + PISTOL_VENDOR_POS.cx * cW - 1, mapOffY + PISTOL_VENDOR_POS.cy * cH - 1, 2, 2);


  // Player: blinking white 3x3
  const playerBlink = Math.floor(performance.now() / 300) % 2 === 0;
  ctx.fillStyle = playerBlink ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)';
  ctx.fillRect(mmX + player.cx * cW - 1, mapOffY + player.cy * cH - 1, 3, 3);

  // Camera viewport outline
  const vx = mmX + (camX / TW) * cW;
  const vy = mapOffY + (camY / TH) * cH;
  const vw = (canvas.width / TW) * cW;
  const vh = (canvas.height / TH) * cH;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(vx, vy, vw, vh);

  ctx.restore();
  ctx.save();

  // Label bar at bottom of minimap panel
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(mmX + 2, mmY + mmH, mmW - 4, labelH - 2);
  ctx.fillStyle = '#3a3a5e';
  ctx.fillRect(mmX + 2, mmY + mmH, mmW - 4, 1);

  ctx.font = "6px 'Press Start 2P'";
  ctx.fillStyle = 'rgba(160,140,220,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MINIMAP', mmX + mmW / 2, mmY + mmH + labelH / 2 - 1);

  ctx.restore();
}

// ─── WEAPON INFO CARD ─────────────────────────────────────────────────────────
function drawWeaponInfo() {
  if (!weaponInfoOpen) return;
  const W = canvas.width, H = canvas.height;
  const wkey = player.weaponKey;
  const w = WEAPONS[wkey];
  const isPapped = player.packedWeapons && player.packedWeapons.has(wkey);

  // Computed stats
  const dmgMult  = Math.pow(1.3, player.upgrades.damage);
  const papMult  = isPapped ? 3 : 1;
  const baseDmg  = Math.round(w.baseDmg * dmgMult * papMult);
  const critDmg  = baseDmg * 2;
  const critPct  = player.upgrades.crit * 10;
  const rawFR    = w.fireRate;
  const upgFR    = Math.max(Math.round(rawFR * 0.4), Math.round(rawFR * Math.pow(0.85, player.upgrades.atkSpeed)));
  const shotsPerSec = (60 / upgFR).toFixed(1);
  const ammo     = wkey === 'pistol' ? '∞' : `${player.ammo === Infinity ? '∞' : player.ammo} / ${w.ammoMax}`;

  // Stat rows
  const rows = [];
  if (w.wave) {
    rows.push({ icon:'💥', label:'Damage (AoE)', val: `${baseDmg}  (crit: ${critDmg})`, col:'#ffe044' });
    rows.push({ icon:'🌪', label:'Type',         val: 'Wind Wave  •  AoE cone',          col:'#60e8ff' });
  } else {
    rows.push({ icon:'⚔', label:'Damage',        val: `${baseDmg}  (crit: ${critDmg})`, col:'#ff7744' });
    if (w.pellets > 1)
      rows.push({ icon:'💢', label:'Pellets',     val: `${w.pellets} per shot`,           col:'#ffcc44' });
    const spreadLabel = w.spread === 0 ? 'None' : w.spread < 0.15 ? 'Low' : w.spread < 0.28 ? 'Medium' : 'High';
    rows.push({ icon:'🎯', label:'Spread',        val: spreadLabel,                       col:'#88ccff' });
    rows.push({ icon:'🔁', label:'Pierce',        val: w.pierce ? 'Yes' : 'No',           col: w.pierce ? '#44ffaa' : '#888' });
  }
  rows.push({ icon:'⚡', label:'Fire Rate',       val: `${shotsPerSec} shots/sec`,        col:'#ffdd44' });
  rows.push({ icon:'★',  label:'Crit Chance',    val: critPct > 0 ? `${critPct}%  (×2 dmg)` : '0%', col:'#bb44ff' });
  rows.push({ icon:'🔋', label:'Ammo',            val: ammo,                              col:'#66ddff' });
  if (wkey === 'pistol')
    rows.push({ icon:'🌡', label:'Heat / shot',   val: '8  (100 = overheat)',             col:'#ff6633' });
  if (isPapped)
    rows.push({ icon:'✊', label:'Pack-a-Punch',  val: '×3 Damage  •  Rainbow bullets',  col:`hsl(${(performance.now()/4)%360},100%,65%)` });

  const cw = 300, rowH = 22, headerH = 52, footerH = 26;
  const ch = headerH + rows.length * rowH + footerH + 12;
  const cx2 = W / 2, cy2 = H / 2 - ch / 2 - 20; // slightly above center

  ctx.save();

  // Backdrop blur shadow
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  roundRect(ctx, cx2 - cw/2 - 2, cy2 - 2, cw + 4, ch + 4, 12, true, false);

  // Card bg
  ctx.fillStyle = '#09071a';
  roundRect(ctx, cx2 - cw/2, cy2, cw, ch, 10, true, false);

  // Colored top strip
  ctx.fillStyle = w.color + '44';
  roundRect(ctx, cx2 - cw/2, cy2, cw, headerH, 10, true, false);
  ctx.fillStyle = 'rgba(0,0,0,0)'; // clear below strip overlap (just cosmetic)

  // Border
  ctx.strokeStyle = w.color + 'aa';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx2 - cw/2, cy2, cw, ch, 10, false, true);

  // PaP rainbow border override
  if (isPapped) {
    const rh = (performance.now() / 4) % 360;
    ctx.strokeStyle = `hsl(${rh},100%,65%)`;
    ctx.lineWidth = 2;
    roundRect(ctx, cx2 - cw/2, cy2, cw, ch, 10, false, true);
  }

  // Header — weapon name
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(cw * 0.085)}px Segoe UI`;
  ctx.fillStyle = w.color;
  ctx.shadowColor = w.color; ctx.shadowBlur = 10;
  ctx.fillText(w.name.toUpperCase(), cx2, cy2 + headerH * 0.42);
  ctx.shadowBlur = 0;

  // Sub-label
  ctx.font = `10px Segoe UI`;
  ctx.fillStyle = 'rgba(200,190,230,0.5)';
  ctx.fillText('WEAPON STATS  —  [I] to close', cx2, cy2 + headerH * 0.78);

  // Divider
  ctx.fillStyle = w.color + '55';
  ctx.fillRect(cx2 - cw/2 + 14, cy2 + headerH, cw - 28, 1);

  // Stat rows
  rows.forEach((r, i) => {
    const ry = cy2 + headerH + 8 + i * rowH + rowH / 2;
    const lx = cx2 - cw/2 + 14;

    // Icon
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '13px Segoe UI';
    ctx.fillStyle = r.col;
    ctx.fillText(r.icon, lx, ry);

    // Label
    ctx.font = '11px Segoe UI';
    ctx.fillStyle = 'rgba(180,170,210,0.65)';
    ctx.fillText(r.label, lx + 22, ry);

    // Value (right-aligned)
    ctx.textAlign = 'right';
    ctx.font = `bold 11px Segoe UI`;
    ctx.fillStyle = r.col;
    ctx.fillText(r.val, cx2 + cw/2 - 14, ry);

    // Row separator
    if (i < rows.length - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(lx, ry + rowH/2, cw - 28, 1);
    }
  });

  // Footer hint
  const footerY = cy2 + ch - footerH / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(cx2 - cw/2 + 14, cy2 + ch - footerH - 2, cw - 28, 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '9px Segoe UI';
  ctx.fillStyle = 'rgba(180,160,220,0.4)';
  ctx.fillText('Stats include current upgrades & Pack-a-Punch', cx2, footerY);

  ctx.restore();
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
const HUD_H = 100; // bottom bar height

function _fmtTime(frames) {
  const s = Math.floor(frames / 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function drawHUD() {
  const W = canvas.width, H = canvas.height;
  ctx.save();

  const pad = 14;

  // ── Round (top-center)
  const roundW = 160, roundH = 30;
  pixelPanel(ctx, W/2 - roundW/2, pad - 4, roundW, roundH, '#0e0e1e');
  ctx.fillStyle = '#c8a040';
  ctx.font = "9px 'Press Start 2P'";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`ROUND ${game.round}`, W/2, pad - 4 + roundH/2);

  // ── Kills / Score / Time (top-right)
  const killsW = 220, killsH = 48;
  const killsX = W - killsW - pad;
  pixelPanel(ctx, killsX, pad - 4, killsW, killsH, '#0e0e1e');
  ctx.textAlign = 'center';
  ctx.font = "7px 'Press Start 2P'";
  ctx.fillStyle = '#7777cc';
  ctx.textBaseline = 'top';
  ctx.fillText(`KILLS ${game.kills}   SCORE ${game.score}`, killsX + killsW/2, pad + 2);
  ctx.font = "6px 'Press Start 2P'";
  ctx.fillStyle = 'rgba(68,200,255,0.55)';
  ctx.fillText('TIME  ' + _fmtTime(game.playTimeFrames), killsX + killsW/2, pad + 18);

  // ── Wave-clear banner (top of screen, non-blocking, full 10-second shopping window)
  if (game.state==='wave_clear') {
    const TOTAL = 600; // must match waves.js waveTimer start value
    const frac  = game.waveTimer / TOTAL;          // 1→0 over 10 s
    const secsLeft = Math.ceil(game.waveTimer / 60);

    // Fade in quickly, stay solid, fade out last 0.5 s
    const fadeIn  = Math.min(1, (1 - frac) * TOTAL / 30); // full in 0.5 s
    const fadeOut = frac < 0.05 ? frac / 0.05 : 1;        // fade out last 0.5 s
    const alpha   = fadeIn * fadeOut;

    const bH = Math.round(H * 0.085);
    const bY = HUD_H + 6;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Panel background
    pixelPanel(ctx, W * 0.18, bY, W * 0.64, bH, '#080c18');

    // "WAVE CLEAR!" title
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#a0e060';
    ctx.font = `bold ${Math.round(bH * 0.36)}px 'Press Start 2P'`;
    ctx.shadowColor = '#60ff20'; ctx.shadowBlur = 8;
    ctx.fillText('WAVE CLEAR!  SHOP NOW', W / 2, bY + bH * 0.07);
    ctx.shadowBlur = 0;

    // Countdown text
    ctx.fillStyle = secsLeft <= 3 ? '#ff6644' : 'rgba(200,220,180,0.85)';
    ctx.font = `${Math.round(bH * 0.22)}px 'Press Start 2P'`;
    ctx.fillText(`Next wave in ${secsLeft}s  —  press E near shop`, W / 2, bY + bH * 0.52);

    // Countdown bar (fills from full to empty)
    const barX = W * 0.22, barW = W * 0.56, barH = Math.max(4, Math.round(bH * 0.10));
    const barY = bY + bH - barH - 5;
    ctx.fillStyle = '#0a1808'; ctx.fillRect(barX, barY, barW, barH);
    const barCol = secsLeft <= 3 ? '#ff4422' : (secsLeft <= 6 ? '#ffaa22' : '#44dd22');
    ctx.fillStyle = barCol; ctx.fillRect(barX, barY, barW * frac, barH);

    ctx.restore();
  }

  // ── Game over overlay
  if (game.state==='game_over') {
    if (!game.scoreSaved) { game.scoreSaved=true; saveScore(); }
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#cc2222';
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText('GAME OVER', W/2, H/2 - 52);
    ctx.fillStyle='rgba(200,190,220,0.8)';
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillText(`Round ${game.round}  •  Kills: ${game.kills}  •  Score: ${game.score}`, W/2, H/2 + 4);
    ctx.fillStyle='rgba(68,221,255,0.6)';
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText(`Time: ${_fmtTime(game.playTimeFrames)}`, W/2, H/2 + 24);
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText('[R] Restart    [M] Main Menu', W/2, H/2 + 42);
  }

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  {
    const BY = H - HUD_H;

    // Background pixel panel
    pixelPanel(ctx, 0, BY, W, HUD_H, '#0e0e1e');

    const ipd = 8;
    const slotH = HUD_H - 10; // slots fill most of bar height
    const slotY = BY + 5;

    // helper: vertical divider
    function vDiv(x) {
      ctx.fillStyle = '#050510';
      ctx.fillRect(x, BY + 4, 2, HUD_H - 8);
      ctx.fillStyle = '#3a3a5e';
      ctx.fillRect(x + 2, BY + 4, 1, HUD_H - 8);
    }

    // ── 1. HP section ─────────────────────────────
    const hpSecW = 190;
    const hpX = ipd + 2;
    const hf = Math.max(0, player.hp / player.maxHp);
    const hpColor = hf > 0.5 ? '#2ecc40' : hf > 0.25 ? '#e6c020' : '#e74c3c';

    // "HP" label
    ctx.fillStyle = '#aaaacc';
    ctx.font = "13px 'VT323'";
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('HP', hpX, BY + 6);

    const hasShield = player.perks.shield > 0;
    const shieldMax = SHIELD_MAXHP[player.perks.shield] || 0;
    const bw = hpSecW - ipd * 2;

    // HP segmented bar
    const hpBarY = BY + 22;
    const hpBarH = 13;
    const segCount = 10;
    const segGap = 2;
    const segW = Math.floor(bw / segCount) - segGap;
    const filledSegs = Math.round(hf * segCount);

    for (let k = 0; k < segCount; k++) {
      const sx = hpX + k * (segW + segGap);
      if (k < filledSegs) {
        ctx.fillStyle = hpColor;
        ctx.fillRect(sx, hpBarY, segW, hpBarH);
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.fillRect(sx, hpBarY, segW, 2);
      } else {
        ctx.fillStyle = '#1a0808';
        ctx.fillRect(sx, hpBarY, segW, hpBarH);
      }
    }

    // HP text below bar
    ctx.font = "16px 'VT323'";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${player.hp} / ${player.maxHp}`, hpX + bw/2, hpBarY + hpBarH + 3);

    // Shield bar
    if (hasShield) {
      const sby = hpBarY + hpBarH + 22;
      const sbh = 10;
      const sf = Math.max(0, player.shield / shieldMax);
      const recharging = player.shield < shieldMax && player.shieldRechargeTimer <= 0;
      const shieldCol = recharging ? `hsl(${Math.round(performance.now()/30)%360},80%,55%)` : '#4499ff';
      const filledShieldSegs = Math.round(sf * segCount);

      ctx.font = "13px 'VT323'";
      ctx.fillStyle = '#4499ff';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('SHIELD', hpX, sby - 14);

      for (let k = 0; k < segCount; k++) {
        const sx = hpX + k * (segW + segGap);
        if (k < filledShieldSegs) {
          ctx.fillStyle = shieldCol;
          ctx.fillRect(sx, sby, segW, sbh);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(sx, sby, segW, 2);
        } else {
          ctx.fillStyle = '#080820';
          ctx.fillRect(sx, sby, segW, sbh);
        }
      }
    }

    vDiv(hpSecW + ipd * 2);

    // ── 2. Weapon slots ─────────────────────────────
    const wepStartX = hpSecW + ipd * 3 + 4;
    const slotW = 72;
    const slotGap = 5;

    function drawWeaponSlot(slotX, wkey, ammo, isActive) {
      const sw = WEAPONS[wkey];

      const slotBg = isActive ? sw.color + '33' : '#1a1a30';
      pixelSlot(ctx, slotX, slotY, slotW, slotH, slotBg, isActive);

      // weapon name — VT323 for readability, truncate if needed
      ctx.fillStyle = sw.color;
      ctx.font = "16px 'VT323'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const maxChars = Math.floor(slotW / 8);
      const nameStr = sw.name.length > maxChars ? sw.name.substring(0, maxChars - 1) + '.' : sw.name;
      ctx.fillText(nameStr.toUpperCase(), slotX + slotW/2, slotY + 4);

      if (wkey === 'pistol') {
        // heat bar label
        const hbX = slotX + 5, hbY = slotY + 23, hbW = slotW - 10, hbH = 9;
        const heatFrac = player.heat / 100;
        const heatSegs = 6;
        const heatSegW = Math.floor(hbW / heatSegs) - 2;
        const filledHeat = Math.round(heatFrac * heatSegs);
        for (let k = 0; k < heatSegs; k++) {
          const hsx = hbX + k * (heatSegW + 2);
          if (k < filledHeat) {
            ctx.fillStyle = player.overheated ? '#ff2200' : '#ff6600';
            ctx.fillRect(hsx, hbY, heatSegW, hbH);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(hsx, hbY, heatSegW, 2);
          } else {
            ctx.fillStyle = '#1a0808';
            ctx.fillRect(hsx, hbY, heatSegW, hbH);
          }
        }
        // heat label
        ctx.font = "15px 'VT323'";
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = player.overheated ? '#ff4400' : 'rgba(200,160,120,0.7)';
        ctx.fillText(player.overheated ? 'OVERHEAT!' : 'HEAT', slotX + slotW/2, slotY + 35);
      } else {
        // ammo bar
        const hbX = slotX + 5, hbY = slotY + 23, hbW = slotW - 10, hbH = 9;
        if (sw.ammoMax <= 16) {
          const pw2 = Math.max(3, Math.floor(hbW / sw.ammoMax) - 2);
          const totalPipW = sw.ammoMax * (pw2 + 2) - 2;
          const pipStartX = slotX + Math.max(5, (slotW - totalPipW) / 2);
          for (let k = 0; k < sw.ammoMax; k++) {
            ctx.fillStyle = k < ammo ? sw.color : 'rgba(255,255,255,0.1)';
            ctx.fillRect(pipStartX + k*(pw2+2), hbY, pw2, hbH);
          }
        } else {
          const frac = ammo / sw.ammoMax;
          const ammoSegs = 8;
          const ammoSegW = Math.floor(hbW / ammoSegs) - 2;
          const filledAmmo = Math.round(frac * ammoSegs);
          for (let k = 0; k < ammoSegs; k++) {
            const asx = hbX + k * (ammoSegW + 2);
            if (k < filledAmmo) {
              ctx.fillStyle = ammo === 0 ? '#ff3322' : sw.color;
              ctx.fillRect(asx, hbY, ammoSegW, hbH);
              ctx.fillStyle = 'rgba(255,255,255,0.12)';
              ctx.fillRect(asx, hbY, ammoSegW, 2);
            } else {
              ctx.fillStyle = '#0d0d1a';
              ctx.fillRect(asx, hbY, ammoSegW, hbH);
            }
          }
        }
        // ammo count text
        ctx.font = "15px 'VT323'";
        ctx.fillStyle = ammo === 0 ? '#ff4444' : 'rgba(200,200,200,0.85)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`${ammo === Infinity ? '∞' : ammo}/${sw.ammoMax}`, slotX + slotW/2, slotY + 35);
      }

      // key hint at bottom
      ctx.font = "13px 'VT323'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (isActive) {
        ctx.fillStyle = 'rgba(180,180,180,0.4)';
        ctx.fillText('[Q] [I]', slotX + slotW/2, slotY + slotH - 4);
      } else if (wkey !== 'pistol') {
        ctx.fillStyle = 'rgba(150,150,150,0.35)';
        ctx.fillText('[Q] swap', slotX + slotW/2, slotY + slotH - 4);
      }
    }

    const pistolActive = player.weaponKey === 'pistol';
    drawWeaponSlot(wepStartX, 'pistol', Infinity, pistolActive);

    if (player.secondaryKey) {
      const secX = wepStartX + slotW + slotGap;
      const secAmmo = pistolActive ? player.secondaryAmmo : player.ammo;
      drawWeaponSlot(secX, player.secondaryKey, secAmmo, !pistolActive);
      vDiv(secX + slotW + ipd + 2);
    } else {
      const emptySlotX = wepStartX + slotW + slotGap;
      pixelSlot(ctx, emptySlotX, slotY, slotW, slotH, '#141420', false);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#aaaacc';
      ctx.font = "15px 'VT323'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MYSTERY BOX', emptySlotX + slotW/2, slotY + slotH/2 - 6);
      ctx.fillText('2nd weapon', emptySlotX + slotW/2, slotY + slotH/2 + 10);
      ctx.globalAlpha = 1;
      vDiv(emptySlotX + slotW + ipd + 2);
    }

    // ── 3. Stat tiles (weapon shop upgrades only) ──────────
    const stats = [
      { icon:'⚔', label:'DMG',    val:`×${Math.pow(1.3,player.upgrades.damage).toFixed(2)}`,                 col:'#ff7744', lvl:player.upgrades.damage   },
      { icon:'⚡', label:'ATKSPD', val:`+${Math.round((1-Math.pow(0.85,player.upgrades.atkSpeed))*100)}%`,    col:'#ffdd44', lvl:player.upgrades.atkSpeed },
      { icon:'★',  label:'CRIT',   val:`${player.upgrades.crit*10}%`,                                          col:'#bb44ff', lvl:player.upgrades.crit     },
    ];

    const wepEndX = wepStartX + slotW * 2 + slotGap + ipd + 4;
    const moneyW = 100;
    const ABIL_SW   = 70;  // each ability slot width
    const ABIL_GAP  = 6;   // gap between slots
    const abilSecW  = ABIL_SW * 5 + ABIL_GAP * 4; // 5 ability slots
    const statAreaW = W - wepEndX - moneyW - abilSecW - ipd * 7;
    const statTileW = Math.min(76, Math.floor((statAreaW - stats.length * 4) / stats.length));
    const statStartX = wepEndX + 4;

    stats.forEach((s, i) => {
      const sx = statStartX + i * (statTileW + 4);
      const sy = slotY;
      const activeBg = s.lvl > 0 ? s.col + '22' : '#1a1a30';
      pixelSlot(ctx, sx, sy, statTileW, slotH, activeBg, s.lvl > 0);

      // icon (emoji)
      ctx.font = '15px Segoe UI';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = s.lvl > 0 ? s.col : 'rgba(100,90,130,0.6)';
      ctx.fillText(s.icon, sx + statTileW/2, sy + 5);

      // label — VT323 at 14px (readable, compact)
      ctx.font = "14px 'VT323'";
      ctx.fillStyle = 'rgba(170,160,220,0.85)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(s.label, sx + statTileW/2, sy + 24);

      // value — VT323 at 18px (prominent)
      ctx.font = "18px 'VT323'";
      ctx.fillStyle = s.lvl > 0 ? s.col : 'rgba(120,110,150,0.55)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(s.val, sx + statTileW/2, sy + 40);

      // 5 level squares near bottom
      const sqW = 8, sqH = 5, sqGap = 2;
      const totalSqW = 5 * sqW + 4 * sqGap;
      const sqStartX = sx + Math.max(3, (statTileW - totalSqW) / 2);
      const sqY = sy + slotH - sqH - 6;
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k < s.lvl ? s.col : 'rgba(255,255,255,0.12)';
        ctx.fillRect(sqStartX + k * (sqW + sqGap), sqY, sqW, sqH);
      }
    });

    const afterStats = statStartX + stats.length * (statTileW + 4) + ipd;
    vDiv(afterStats);

    // ── 4. Abilities ───────────────────────────────
    const abilX    = afterStats + ipd + 2;
    const abilSlotY = BY + 14;
    const abilSlotH = HUD_H - 18;

    // Section label centred over both slots
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = 'rgba(100,180,255,0.55)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('ABILITIES', abilX + abilSecW / 2, BY + 4);

    // helper: draw one ability slot
    function drawAbilSlot(slotX, icon, labelReady, labelCd, keyhint,
                          ready, active, frac, readyCol, activeCol, cdCol, arcCol) {
      const cx2 = slotX + ABIL_SW / 2;
      const bg  = active ? activeCol + '33' : ready ? readyCol + '18' : '#0d0d18';
      pixelSlot(ctx, slotX, abilSlotY, ABIL_SW, abilSlotH, bg, ready || active);

      // Layout (top→bottom): keyhint | icon | ring+status
      const khY   = abilSlotY + 5;                  // key hint top baseline
      const iconY = abilSlotY + abilSlotH * 0.36;   // icon centre
      const aR    = abilSlotH * 0.175;              // ring radius
      const aCy   = abilSlotY + abilSlotH * 0.73;   // ring centre — well below icon

      // Key hint — top, small, faint
      ctx.font = "9px 'VT323'";
      ctx.fillStyle = 'rgba(180,200,220,0.45)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(keyhint, cx2, khY);

      // Icon
      ctx.font = '18px Segoe UI';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1;
      ctx.fillText(icon, cx2, iconY);

      // Cooldown arc track
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx2, aCy, aR, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = ready ? (active ? activeCol : readyCol) : cdCol;
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx2, aCy, aR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      if (ready) { ctx.shadowColor = readyCol; ctx.shadowBlur = 7; ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.restore();

      // Status text inside ring
      ctx.font = "11px 'VT323'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (active) {
        ctx.fillStyle = activeCol;
        ctx.fillText(labelReady, cx2, aCy);
      } else if (ready) {
        ctx.fillStyle = readyCol;
        ctx.fillText('READY', cx2, aCy);
      } else {
        ctx.fillStyle = cdCol;
        ctx.fillText(labelCd, cx2, aCy);
      }
    }

    // Dash
    const dashReady  = player.dashCooldown <= 0;
    const dashActive = player.dashTimer > 0;
    const dashFrac   = dashReady ? 1 : 1 - player.dashCooldown / DASH_COOLDOWN;
    drawAbilSlot(abilX, '💨', 'DASH!', Math.ceil(player.dashCooldown/60)+'s', '[SPC]',
      dashReady, dashActive, dashFrac, '#44aaff', '#88eeff', '#ff8844', 'rgba(80,140,220,0.8)');

    // Fire Ring
    const fireSlotX  = abilX + ABIL_SW + ABIL_GAP;
    const fireReady  = player.fireCooldown <= 0;
    const fireActive = player.fireRingTimer > 0;
    const fireFrac   = fireReady ? 1 : 1 - player.fireCooldown / FIRE_RING_COOLDOWN;
    drawAbilSlot(fireSlotX, '🔥', 'ACTIVE!', Math.ceil(player.fireCooldown/60)+'s', '[4]',
      fireReady, fireActive, fireFrac, '#ff6622', '#ffaa44', '#ffaa44', 'rgba(200,80,20,0.8)');

    // Barrier
    const barrSlotX  = abilX + (ABIL_SW + ABIL_GAP) * 2;
    const barrReady  = player.barrierCooldown <= 0;
    const barrActive = player.barrierTimer > 0;
    const barrFrac   = barrReady ? 1 : 1 - player.barrierCooldown / BARRIER_COOLDOWN;
    drawAbilSlot(barrSlotX, '🛡', 'ACTIVE!', Math.ceil(player.barrierCooldown/60)+'s', '[5]',
      barrReady, barrActive, barrFrac, '#44ddff', '#aaeeff', '#44ddff', 'rgba(40,160,220,0.8)');

    // Speed Boost
    const spdSlotX  = abilX + (ABIL_SW + ABIL_GAP) * 3;
    const spdReady  = player.speedBoostCooldown <= 0;
    const spdActive = player.speedBoostTimer > 0;
    const spdFrac   = spdReady ? 1 : 1 - player.speedBoostCooldown / SPEED_BOOST_COOLDOWN;
    drawAbilSlot(spdSlotX, '⚡', 'FAST!', Math.ceil(player.speedBoostCooldown/60)+'s', '[6]',
      spdReady, spdActive, spdFrac, '#cc44ff', '#ee99ff', '#9933cc', 'rgba(160,40,220,0.8)');

    // Monkey Bomb
    const mBombSlotX = abilX + (ABIL_SW + ABIL_GAP) * 4;
    const mBombReady  = player.monkeyBombCooldown <= 0 && monkeyBombs.length === 0;
    const mBombActive = monkeyBombs.length > 0;
    const mBombFrac   = mBombReady ? 1 : mBombActive ? 1 : 1 - player.monkeyBombCooldown / MONKEY_BOMB_COOLDOWN;
    drawAbilSlot(mBombSlotX, '🐒', 'THROWN!', Math.ceil(player.monkeyBombCooldown/60)+'s', '[7]',
      mBombReady, mBombActive, mBombFrac, '#ffaa00', '#ffdd55', '#cc8800', 'rgba(200,140,20,0.8)');

    vDiv(abilX + abilSecW + ipd + 2);

    // ── 5. Money ──────────────────────────────────
    const monX = abilX + abilSecW + ipd * 2 + 4;
    ctx.font = "14px 'VT323'";
    ctx.fillStyle = 'rgba(245,197,24,0.65)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('GOLD', monX + moneyW/2, BY + 10);
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = '#f5c518';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`$${player.money}`, monX + moneyW/2, BY + HUD_H/2 + 8);

    // ── 6. Right side: permanent perks + temp perks + orb inventory ────────────
    {
      // Build right-side tile list
      const rightTiles = [];

      // Temporary perks (with countdown)
      const TEMP_DEFS = [
        { key:'doublePoints', icon:'2×', label:'DBL GOLD', col:'#ffd700', temp:true },
        { key:'magnet',       icon:'🧲', label:'MAGNET',   col:'#60ccff', temp:true },
      ];
      TEMP_DEFS.forEach(pd => { if (activePerkTimers[pd.key] > 0) rightTiles.push(pd); });

      // Permanent perks (bought from perk vendor, level > 0)
      const PERM_DEFS = [
        { key:'magnet',    icon:'🧲', label:'MAGNET',  col:'#60ccff', val: l => `R${MAGNET_RADII[l]}` },
        { key:'shield',    icon:'🛡', label:'SHIELD',  col:'#4499ff', val: l => `${SHIELD_MAXHP[l]}HP`  },
        { key:'lifesteal', icon:'🩸', label:'STEAL',   col:'#ff4466', val: l => `${LIFESTEAL_HP[l]}HP`  },
        { key:'moveSpeed', icon:'👟', label:'SPEED',   col:'#44ffaa', val: l => `+${l*20}%`           },
        { key:'hpRegen',   icon:'❤', label:'REGEN',   col:'#ff4d6d', val: l => `${[0,2,5,8,11,15][l]}/s` },
      ];
      PERM_DEFS.forEach(pd => {
        const lvl = player.perks[pd.key];
        if (lvl > 0) rightTiles.push({ ...pd, perm:true, lvl });
      });

      // Pistol spread level tile
      if (player.pistolSpread > 0) {
        rightTiles.push({ icon:'✦', label:'SPREAD', col:'#80c8ff', perm:true, lvl:player.pistolSpread,
          val: l => l===1?'2 bullets':'3 bullets' });
      }

      // Orb inventory slot
      if (player.spreadOrbs > 0) {
        rightTiles.push({ icon:'●', label:'PISTOL ORB', col:'#60aaff', orb:true, count: player.spreadOrbs });
      }

      if (rightTiles.length > 0) {
        const tileW = 66, tileGap = 4;
        const totalW = rightTiles.length * (tileW + tileGap) - tileGap;
        let rx = W - ipd - totalW;
        vDiv(rx - ipd);

        rightTiles.forEach(pd => {
          const tx = rx, ty = slotY;

          if (pd.temp) {
            // Temporary perk tile (countdown)
            const timer = activePerkTimers[pd.key];
            const frac  = timer / PERK_DURATION;
            const lowTime = timer < 180;
            const perkBg = lowTime
              ? (Math.floor(performance.now() / 120) % 2 === 0 ? '#251500' : '#1a0f00')
              : '#1a1a30';
            pixelSlot(ctx, tx, ty, tileW, slotH, perkBg, true);
            ctx.font = '16px Segoe UI';
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillStyle = pd.col; ctx.fillText(pd.icon, tx + tileW/2, ty + 4);
            ctx.font = "13px 'VT323'"; ctx.fillStyle = 'rgba(200,200,200,0.8)';
            ctx.textBaseline = 'top'; ctx.fillText(pd.label, tx + tileW/2, ty + 24);
            ctx.font = "15px 'VT323'";
            ctx.fillStyle = lowTime ? '#ff6644' : 'rgba(255,255,255,0.65)';
            ctx.fillText(Math.ceil(timer/60)+'s', tx + tileW/2, ty + 40);
            // Timer bar
            const bx2=tx+4, bY2=ty+slotH-10, bw2=tileW-8, bh2=5, segs=8;
            const segW2=Math.floor(bw2/segs)-1, filled=Math.round(frac*segs);
            for(let k=0;k<segs;k++){
              const tsx=bx2+k*(segW2+1);
              ctx.fillStyle=k<filled?(lowTime?`hsl(${Math.round(frac*60)},90%,55%)`:pd.col):'rgba(255,255,255,0.08)';
              ctx.fillRect(tsx,bY2,segW2,bh2);
            }

          } else if (pd.orb) {
            // Orb inventory slot
            pixelSlot(ctx, tx, ty, tileW, slotH, '#0a1828', true);
            // Glowing orb
            const orbX = tx + tileW/2, orbY = ty + 28;
            const oG = ctx.createRadialGradient(orbX - 3, orbY - 3, 0, orbX, orbY, 14);
            oG.addColorStop(0, 'rgba(200,230,255,1)');
            oG.addColorStop(0.4, 'rgba(60,140,255,0.9)');
            oG.addColorStop(1, 'rgba(10,60,200,0)');
            ctx.fillStyle = oG; ctx.beginPath(); ctx.arc(orbX, orbY, 14, 0, Math.PI*2); ctx.fill();
            ctx.font = `bold ${Math.round(tileW*0.26)}px Segoe UI`;
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('✦', orbX, orbY);
            ctx.font = "13px 'VT323'"; ctx.fillStyle = '#80c8ff';
            ctx.textBaseline = 'top'; ctx.fillText(pd.label, tx + tileW/2, ty + 46);
            if (pd.count > 1) {
              ctx.font = "bold 11px 'VT323'"; ctx.fillStyle = '#fff';
              ctx.fillText('×'+pd.count, tx + tileW - 10, ty + 8);
            }

          } else {
            // Permanent perk tile
            pixelSlot(ctx, tx, ty, tileW, slotH, pd.col+'18', true);
            ctx.font = '16px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillStyle = pd.col; ctx.fillText(pd.icon, tx + tileW/2, ty + 4);
            ctx.font = "13px 'VT323'"; ctx.fillStyle = 'rgba(200,200,200,0.8)';
            ctx.fillText(pd.label, tx + tileW/2, ty + 24);
            // Stat value
            ctx.font = "15px 'VT323'"; ctx.fillStyle = pd.col;
            ctx.fillText(pd.val(pd.lvl), tx + tileW/2, ty + 40);
            // Level dots
            const sqW=7, sqH=4, sqGap=2;
            const dotMaxLevel = (pd.key === 'magnet'||pd.key==='shield'||pd.key==='lifesteal'||pd.key==='moveSpeed'||pd.key==='hpRegen') ? 5 : 2;
            const totalSqW = dotMaxLevel*(sqW+sqGap)-sqGap;
            const sqX = tx + Math.max(2,(tileW-totalSqW)/2);
            const sqY2 = ty + slotH - sqH - 5;
            for (let k=0; k<dotMaxLevel; k++) {
              ctx.fillStyle = k < pd.lvl ? pd.col : 'rgba(255,255,255,0.1)';
              ctx.fillRect(sqX + k*(sqW+sqGap), sqY2, sqW, sqH);
            }
          }

          rx += tileW + tileGap;
        });
      }
    }
  }

  // ── Screen damage vignette
  if (player.hurtTimer>28) {
    const a=(player.hurtTimer-28)/17*.35;
    const gr=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.9);
    gr.addColorStop(0,'rgba(200,0,0,0)'); gr.addColorStop(1,`rgba(200,0,0,${a})`);
    ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
  }

  ctx.restore();
}

function roundRect(ctx,x,y,w,h,r,fill,stroke) {
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  if(fill)ctx.fill();
  if(stroke)ctx.stroke();
}

// ── Downed / death helpers ────────────────────────────────────────────────────
function playerGoDown() {
  if (player.downed || player.dead) return;
  player.dead=true; game.state='game_over'; shopOpen=false; perkShopOpen=false;
}
function checkAllDead() {
  if (player.dead) { game.state='game_over'; shopOpen=false; perkShopOpen=false; }
}
