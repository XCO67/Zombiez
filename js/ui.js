
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

// ─── CUSTOM CURSOR (crosshair) ────────────────────────────────────────────────
function drawCursor() {
  const x=mouse.x,y=mouse.y,arm=10,gap=4,thick=1.5;
  ctx.save();ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=thick;ctx.lineCap='round';
  ctx.shadowColor='rgba(100,200,255,0.8)';ctx.shadowBlur=4;
  ctx.beginPath();
  ctx.moveTo(x-arm-gap,y);ctx.lineTo(x-gap,y);
  ctx.moveTo(x+gap,y);ctx.lineTo(x+arm+gap,y);
  ctx.moveTo(x,y-arm-gap);ctx.lineTo(x,y-gap);
  ctx.moveTo(x,y+gap);ctx.lineTo(x,y+arm+gap);
  ctx.stroke();
  ctx.strokeStyle='rgba(255,80,80,0.7)';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

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
  const dmgMult  = 1 + player.upgrades.damage * 0.20;
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
const HUD_H = 86; // bottom bar height — used by minimap positioning too

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

  // ── Kills / score (top-right)
  const killsW = 200, killsH = 30;
  pixelPanel(ctx, W - killsW - pad, pad - 4, killsW, killsH, '#0e0e1e');
  ctx.fillStyle = '#7777cc';
  ctx.font = "7px 'Press Start 2P'";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`KILLS ${game.kills}   SCORE ${game.score}`, W - killsW/2 - pad, pad - 4 + killsH/2);

  // ── Wave-clear overlay
  if (game.state==='wave_clear') {
    const prog=1-(game.waveTimer/180);
    const fadeIn=Math.min(1,prog*4), fadeOut=Math.max(0,1-(prog-.75)*4);
    ctx.globalAlpha=fadeIn*fadeOut;
    const ovW = 380, ovH = 90;
    pixelPanel(ctx, W/2 - ovW/2, H/2 - ovH/2 - 10, ovW, ovH, '#0a0a1e');
    ctx.fillStyle='#a0e060';
    ctx.font = "18px 'Press Start 2P'";
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('WAVE CLEAR!', W/2, H/2 - 14);
    ctx.fillStyle='rgba(180,180,180,0.7)';
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText(`Round ${game.round+1} in ${Math.ceil(game.waveTimer/60)}s`, W/2, H/2 + 18);
    ctx.globalAlpha=1;
  }

  // ── Game over overlay
  if (game.state==='game_over') {
    if (!game.scoreSaved && !mp.active) { game.scoreSaved=true; saveScore(); }
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#cc2222';
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText('GAME OVER', W/2, H/2 - 52);
    ctx.fillStyle='rgba(200,190,220,0.8)';
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillText(`Round ${game.round}  •  Kills: ${game.kills}  •  Score: ${game.score}`, W/2, H/2 + 4);
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText('[R] Restart    [M] Main Menu', W/2, H/2 + 42);
  }

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  {
    const BY = H - HUD_H;

    // Background pixel panel
    pixelPanel(ctx, 0, BY, W, HUD_H, '#0e0e1e');

    const ipd = 10;

    // helper: vertical divider
    function vDiv(x) {
      ctx.fillStyle = '#050510';
      ctx.fillRect(x, BY + 4, 2, HUD_H - 8);
      ctx.fillStyle = '#3a3a5e';
      ctx.fillRect(x + 2, BY + 4, 1, HUD_H - 8);
    }

    // ── 1. HP section ─────────────────────────────
    const hpSecW = 200;
    const hpX = ipd + 4;
    const hf = Math.max(0, player.hp / player.maxHp);
    const hpColor = hf > 0.5 ? '#2ecc40' : hf > 0.25 ? '#e6c020' : '#e74c3c';

    // "HP" label
    ctx.fillStyle = '#8888bb';
    ctx.font = "7px 'Press Start 2P'";
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('HP', hpX, BY + 8);

    const hasShield = player.perks.shield > 0;
    const shieldMax = SHIELD_MAXHP[player.perks.shield] || 0;
    const bw = hpSecW - ipd * 2;

    // HP segmented bar
    const hpBarY = BY + 22;
    const hpBarH = 12;
    const segCount = 10;
    const segGap = 2;
    const segW = Math.floor((bw) / segCount) - segGap;
    const filledSegs = Math.round(hf * segCount);

    for (let k = 0; k < segCount; k++) {
      const sx = hpX + k * (segW + segGap);
      if (k < filledSegs) {
        ctx.fillStyle = hpColor;
        ctx.fillRect(sx, hpBarY, segW, hpBarH);
        // pixel highlight top
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.fillRect(sx, hpBarY, segW, 2);
      } else {
        ctx.fillStyle = '#1a0808';
        ctx.fillRect(sx, hpBarY, segW, hpBarH);
      }
    }

    // HP text below bar
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, hpX + bw/2, hpBarY + hpBarH + 2);

    // Shield bar
    if (hasShield) {
      const sby = hpBarY + hpBarH + 14;
      const sbh = 10;
      const sf = Math.max(0, player.shield / shieldMax);
      const recharging = player.shield < shieldMax && player.shieldRechargeTimer <= 0;
      const shieldCol = recharging ? `hsl(${Math.round(performance.now()/30)%360},80%,55%)` : '#4499ff';
      const filledShieldSegs = Math.round(sf * segCount);

      // "SHIELD" label
      ctx.font = "5px 'Press Start 2P'";
      ctx.fillStyle = '#4499ff';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('SHIELD', hpX, sby - 9);

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
    const slotW = 68, slotH = 66;
    const slotGap = 6;
    const slotY = BY + (HUD_H - slotH) / 2;

    function drawWeaponSlot(slotX, wkey, ammo, isActive) {
      const sw = WEAPONS[wkey];

      // slot background
      const slotBg = isActive ? sw.color + '33' : '#1a1a30';
      pixelSlot(ctx, slotX, slotY, slotW, slotH, slotBg, isActive);

      // weapon name
      ctx.fillStyle = sw.color;
      ctx.font = "6px 'Press Start 2P'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      // Truncate name if too long
      const nameStr = sw.name.length > 9 ? sw.name.substring(0, 8) + '.' : sw.name;
      ctx.fillText(nameStr.toUpperCase(), slotX + slotW/2, slotY + 5);

      if (wkey === 'pistol') {
        // heat segmented bar (6 blocks)
        const heatFrac = player.heat / 100;
        const hbX = slotX + 5, hbY = slotY + 18, hbW = slotW - 10, hbH = 8;
        const heatSegs = 6;
        const heatSegW = Math.floor(hbW / heatSegs) - 2;
        const filledHeat = Math.round(heatFrac * heatSegs);
        for (let k = 0; k < heatSegs; k++) {
          const hsx = hbX + k * (heatSegW + 2);
          if (k < filledHeat) {
            ctx.fillStyle = player.overheated ? '#ff2200' : '#ff4400';
            ctx.fillRect(hsx, hbY, heatSegW, hbH);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(hsx, hbY, heatSegW, 2);
          } else {
            ctx.fillStyle = '#1a0808';
            ctx.fillRect(hsx, hbY, heatSegW, hbH);
          }
        }
        if (player.overheated) {
          ctx.fillStyle = '#ff4400';
          ctx.font = "5px 'Press Start 2P'";
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('OVERHEATED', slotX + slotW/2, slotY + 30);
        } else {
          ctx.fillStyle = 'rgba(180,130,110,0.55)';
          ctx.font = "5px 'Press Start 2P'";
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('HEAT', slotX + slotW/2, slotY + 30);
        }
      } else {
        // ammo display
        const hbX = slotX + 5, hbY = slotY + 18, hbW = slotW - 10, hbH = 8;
        if (sw.ammoMax <= 16) {
          // pip blocks
          const pw2 = Math.max(3, Math.floor(hbW / sw.ammoMax) - 2);
          const totalPipW = sw.ammoMax * (pw2 + 2) - 2;
          const pipStartX = slotX + Math.max(5, (slotW - totalPipW) / 2);
          for (let k = 0; k < sw.ammoMax; k++) {
            ctx.fillStyle = k < ammo ? sw.color : 'rgba(255,255,255,0.1)';
            ctx.fillRect(pipStartX + k*(pw2+2), hbY, pw2, hbH);
          }
        } else {
          // segmented ammo bar
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
        ctx.fillStyle = ammo === 0 ? '#ff4444' : 'rgba(200,200,200,0.7)';
        ctx.font = "5px 'Press Start 2P'";
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`${ammo}/${sw.ammoMax}`, slotX + slotW/2, slotY + 30);
      }

      // hints at bottom
      ctx.font = "5px 'Press Start 2P'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (isActive) {
        ctx.fillStyle = 'rgba(180,180,180,0.35)';
        ctx.fillText('[Q][I]', slotX + slotW/2, slotY + slotH - 4);
      } else if (wkey !== 'pistol') {
        ctx.fillStyle = 'rgba(150,150,150,0.3)';
        ctx.fillText('[Q]', slotX + slotW/2, slotY + slotH - 4);
      }
    }

    const pistolActive = player.weaponKey === 'pistol';
    drawWeaponSlot(wepStartX, 'pistol', Infinity, pistolActive);

    if (player.secondaryKey) {
      const secX = wepStartX + slotW + slotGap;
      const secAmmo = pistolActive ? player.secondaryAmmo : player.ammo;
      drawWeaponSlot(secX, player.secondaryKey, secAmmo, !pistolActive);
      vDiv(secX + slotW + ipd + 4);
    } else {
      // empty secondary slot
      const emptySlotX = wepStartX + slotW + slotGap;
      pixelSlot(ctx, emptySlotX, slotY, slotW, slotH, '#141420', false);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#888';
      ctx.font = "5px 'Press Start 2P'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MYSTERY', emptySlotX + slotW/2, slotY + slotH/2 - 6);
      ctx.fillText('BOX', emptySlotX + slotW/2, slotY + slotH/2 + 4);
      ctx.fillText('2nd wpn', emptySlotX + slotW/2, slotY + slotH/2 + 14);
      ctx.globalAlpha = 1;
      vDiv(emptySlotX + slotW + ipd + 4);
    }

    // ── 3. Stat tiles ─────────────────────────────
    const stats = [
      { icon:'⚔', label:'DAMAGE',   val:`+${player.upgrades.damage*20}%`,                                     col:'#ff7744', lvl:player.upgrades.damage    },
      { icon:'⚡', label:'ATK SPD',  val:`+${Math.round((1-Math.pow(0.85,player.upgrades.atkSpeed))*100)}%`,   col:'#ffdd44', lvl:player.upgrades.atkSpeed  },
      { icon:'★',  label:'CRIT',     val:`${player.upgrades.crit*10}%`,                                         col:'#bb44ff', lvl:player.upgrades.crit      },
      { icon:'👟', label:'MOV SPD',  val:`+${player.upgrades.moveSpeed*15}%`,                                   col:'#44ffaa', lvl:player.upgrades.moveSpeed },
      { icon:'❤',  label:'HP REGEN', val:`${[0,2,5,8,11,15][player.upgrades.hpRegen]}/s`,                       col:'#ff4d6d', lvl:player.upgrades.hpRegen   },
    ];

    const wepEndX = player.secondaryKey
      ? wepStartX + slotW * 2 + slotGap + ipd + 6
      : wepStartX + slotW * 2 + slotGap + ipd + 6;
    const moneyW = 110;
    const statAreaW = W - wepEndX - moneyW - ipd * 4;
    const statTileW = Math.min(80, Math.floor((statAreaW - stats.length * 4) / stats.length));
    const statTileH = slotH;
    const statStartX = wepEndX + 4;

    stats.forEach((s, i) => {
      const sx = statStartX + i * (statTileW + 4);
      const sy = slotY;
      const activeBg = s.lvl > 0 ? s.col + '22' : '#1a1a30';
      pixelSlot(ctx, sx, sy, statTileW, statTileH, activeBg, s.lvl > 0);

      // icon
      ctx.font = '14px Segoe UI';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = s.lvl > 0 ? s.col : 'rgba(100,90,130,0.6)';
      ctx.fillText(s.icon, sx + statTileW/2, sy + 4);

      // label
      ctx.font = "5px 'Press Start 2P'";
      ctx.fillStyle = 'rgba(150,140,200,0.7)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(s.label, sx + statTileW/2, sy + 22);

      // value
      ctx.font = "7px 'Press Start 2P'";
      ctx.fillStyle = s.lvl > 0 ? s.col : 'rgba(120,110,150,0.5)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.val, sx + statTileW/2, sy + statTileH/2 + 4);

      // 5 level squares at bottom
      const sqW = 7, sqH = 4, sqGap = 2;
      const totalSqW = 5 * sqW + 4 * sqGap;
      const sqStartX = sx + (statTileW - totalSqW) / 2;
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k < s.lvl ? s.col : 'rgba(255,255,255,0.1)';
        ctx.fillRect(sqStartX + k * (sqW + sqGap), sy + statTileH - 8, sqW, sqH);
      }
    });

    const afterStats = statStartX + stats.length * (statTileW + 4) + ipd;
    vDiv(afterStats);

    // ── 4. Money ──────────────────────────────────
    const monX = afterStats + ipd;
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = 'rgba(245,197,24,0.6)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('GOLD', monX + moneyW/2, BY + 14);
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = '#f5c518';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`$${player.money}`, monX + moneyW/2, BY + HUD_H/2 + 6);

    // ── 5. Active perk tiles ───────────────────────
    const PERK_DEFS = [
      { key:'doublePoints', icon:'2×', label:'DOUBLE GOLD', col:'#ffd700', glow:'rgba(255,200,0,0.35)' },
      { key:'magnet',       icon:'🧲', label:'MAGNET',      col:'#60ccff', glow:'rgba(50,150,255,0.3)' },
    ];
    const activePerks = PERK_DEFS.filter(pd => activePerkTimers[pd.key] > 0);
    if (activePerks.length > 0) {
      const tileW = 68, tileH = slotH, tileGap = 6;
      const totalW = activePerks.length * (tileW + tileGap) - tileGap;
      let px2 = W - ipd - totalW;

      vDiv(px2 - ipd);

      activePerks.forEach(pd => {
        const timer = activePerkTimers[pd.key];
        const frac  = timer / PERK_DURATION;
        const tx = px2, ty = slotY;
        const lowTime = timer < 180;

        const gp = Math.sin(performance.now() / 400) * 0.5 + 0.5;
        const perkBg = lowTime
          ? (Math.floor(performance.now() / 120) % 2 === 0 ? '#251500' : '#1a0f00')
          : '#1a1a30';
        pixelSlot(ctx, tx, ty, tileW, tileH, perkBg, true);

        // Big icon
        ctx.font = '18px Segoe UI';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const isEmoji = pd.icon.length > 1 || pd.icon.codePointAt(0) > 127;
        ctx.fillStyle = pd.col;
        ctx.fillText(pd.icon, tx + tileW/2, ty + tileH * 0.30);

        // Label
        ctx.font = "5px 'Press Start 2P'";
        ctx.fillStyle = 'rgba(200,200,200,0.65)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pd.label, tx + tileW/2, ty + tileH * 0.58);

        // Segmented timer bar (10 blocks)
        const barX = tx + 5, barY = ty + tileH - 14, barW = tileW - 10, barH = 6;
        const timerSegs = 10;
        const timerSegW = Math.floor(barW / timerSegs) - 1;
        const filledTimer = Math.round(frac * timerSegs);
        for (let k = 0; k < timerSegs; k++) {
          const tsx = barX + k * (timerSegW + 1);
          if (k < filledTimer) {
            ctx.fillStyle = lowTime ? `hsl(${Math.round(frac*60)},90%,55%)` : pd.col;
            ctx.fillRect(tsx, barY, timerSegW, barH);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(tsx, barY, timerSegW, barH);
          }
        }

        // Seconds text
        ctx.font = "5px 'Press Start 2P'";
        ctx.fillStyle = lowTime ? '#ff6644' : 'rgba(255,255,255,0.55)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(Math.ceil(timer / 60) + 's', tx + tileW/2, barY - 1);

        px2 += tileW + tileGap;
      });
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

// ── Downed / revive helpers (single-player; MP uses server-side logic) ────────
function playerGoDown() {
  if (player.downed || player.dead) return;
  if (!mp.active) { player.dead=true; game.state='game_over'; shopOpen=false; perkShopOpen=false; return; }
  // In MP mode the server drives downed state; client just reflects snapshot
}
function remoteGoDown(rp) {
  if (!mp.active) return; // single-player has no remote players
  if (rp.downed || rp.dead) return;
  rp.downed=true; rp.hp=1; rp.downedTimer=1800;
}
function checkAllDead() {
  if (mp.active) return; // server handles in MP
  if (player.dead) { game.state='game_over'; shopOpen=false; perkShopOpen=false; }
}
