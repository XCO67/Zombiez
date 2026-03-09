
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

// ─── MINIMAP ──────────────────────────────────────────────────────────────────
function drawMinimap() {
  const pad = 14;
  const barH = 14;
  // Fixed minimap size — never changes regardless of map dimensions
  const mmW = 160, mmH = 120;
  const mmX = pad - 6;
  const mmY = pad - 6;   // top-left, just below screen edge
  // Cell size scales so the full map always fits in the fixed box
  const cW = mmW / MAP_W, cH = mmH / MAP_H;

  ctx.save();

  // Outer background + border (fixed size)
  ctx.fillStyle = 'rgba(4,3,14,0.82)';
  roundRect(ctx, mmX, mmY, mmW, mmH + 14, 5, true, false);
  ctx.strokeStyle = 'rgba(80,60,140,0.55)'; ctx.lineWidth = 1;
  roundRect(ctx, mmX, mmY, mmW, mmH + 14, 5, false, true);

  // Label
  ctx.fillStyle = 'rgba(160,140,220,0.65)';
  ctx.font = `bold 8px Segoe UI`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('MAP', mmX + 5, mmY + 3);

  const mapOffY = mmY + 12;   // tile grid starts here

  // Clip to map area
  ctx.beginPath(); ctx.rect(mmX, mapOffY, mmW, mmH); ctx.clip();

  // Draw tiles
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const t = MAP[r][c];
      const x = mmX + c * cW, y = mapOffY + r * cH;
      if (t === T.WALL) {
        ctx.fillStyle = '#0d0b1a'; ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.FLOOR || t === T.SPAWN) {
        ctx.fillStyle = t === T.SPAWN ? '#3a1010' : '#1e1a30';
        ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.PILLAR) {
        ctx.fillStyle = '#2a2040'; ctx.fillRect(x, y, cW + .5, cH + .5);
      } else if (t === T.DOOR) {
        ctx.fillStyle = '#5a2e10'; ctx.fillRect(x, y, cW + .5, cH + .5);
      }
    }
  }

  // Door markers (locked = amber glow)
  DOORS.forEach(door => {
    if (door.unlocked) return;
    door.tiles.forEach(({r, c}) => {
      ctx.fillStyle = 'rgba(255,180,40,0.7)';
      ctx.fillRect(mmX + c * cW, mapOffY + r * cH, cW + .5, cH + .5);
    });
  });

  // Torch dots
  TORCHES.forEach(([r, c]) => {
    ctx.fillStyle = 'rgba(255,160,40,0.4)';
    ctx.beginPath();
    ctx.arc(mmX + (c + .5) * cW, mapOffY + (r + .5) * cH, Math.max(1, cW * .6), 0, Math.PI * 2);
    ctx.fill();
  });

  // Zombies
  ZOMBIES.forEach(z => {
    if (z.dead) return;
    ctx.fillStyle = '#c83838';
    ctx.beginPath();
    ctx.arc(mmX + z.cx * cW, mapOffY + z.cy * cH, Math.max(1.2, cW * .7), 0, Math.PI * 2);
    ctx.fill();
  });

  // Shop marker
  ctx.fillStyle = '#44ccff';
  ctx.beginPath();
  ctx.arc(mmX + SHOP_POS.cx * cW, mapOffY + SHOP_POS.cy * cH, Math.max(1.5, cW * .8), 0, Math.PI * 2);
  ctx.fill();

  // Mystery box marker
  ctx.fillStyle = '#aa44ff';
  ctx.beginPath();
  ctx.arc(mmX + BOX_POS.cx * cW, mapOffY + BOX_POS.cy * cH, Math.max(1.5, cW * .8), 0, Math.PI * 2);
  ctx.fill();

  // Pack-a-Punch marker (rainbow)
  ctx.fillStyle = `hsl(${(performance.now()/6)%360},100%,60%)`;
  ctx.beginPath();
  ctx.arc(mmX + PAP_POS.cx * cW, mapOffY + PAP_POS.cy * cH, Math.max(1.5, cW * .8), 0, Math.PI * 2);
  ctx.fill();

  // Perk vendor marker (green)
  ctx.fillStyle = '#44ffaa';
  ctx.beginPath();
  ctx.arc(mmX + PERK_VENDOR_POS.cx * cW, mapOffY + PERK_VENDOR_POS.cy * cH, Math.max(1.5, cW * .8), 0, Math.PI * 2);
  ctx.fill();

  // Player dot (bright white with pulse)
  const pulse = Math.sin(performance.now() / 200) * .3 + .7;
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;
  ctx.beginPath();
  ctx.arc(mmX + player.cx * cW, mapOffY + player.cy * cH, Math.max(2, cW * 1.1), 0, Math.PI * 2);
  ctx.fill();
  // Player direction indicator
  const facingAngles = {east:0,'south-east':Math.PI*.25,south:Math.PI*.5,'south-west':Math.PI*.75,
    west:Math.PI,'north-west':Math.PI*1.25,north:Math.PI*1.5,'north-east':Math.PI*1.75};
  const ang = facingAngles[player.facing] || 0;
  const pr = Math.max(2, cW * 1.1);
  ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mmX + player.cx * cW, mapOffY + player.cy * cH);
  ctx.lineTo(mmX + player.cx * cW + Math.cos(ang) * pr * 2.2, mapOffY + player.cy * cH + Math.sin(ang) * pr * 2.2);
  ctx.stroke();

  // Camera viewport rectangle
  const vx = mmX + (camX / TW) * cW;
  const vy = mapOffY + (camY / TH) * cH;
  const vw = (canvas.width / TW) * cW;
  const vh = (canvas.height / TH) * cH;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(vx, vy, vw, vh);

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
const HUD_H = 72; // bottom bar height — used by minimap positioning too

function drawHUD() {
  const W = canvas.width, H = canvas.height;
  ctx.save();

  const pad = 14;

  // ── Round (top-center)
  ctx.fillStyle='rgba(0,0,0,0.55)';
  roundRect(ctx,W/2-65,pad-6,130,32,5,true,false);
  ctx.fillStyle='#c8a040'; ctx.font='bold 14px Segoe UI';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(`ROUND  ${game.round}`, W/2, pad+10);

  // ── Kills / score (top-right)
  ctx.fillStyle='rgba(0,0,0,0.55)';
  roundRect(ctx,W-172-pad,pad-6,176,32,5,true,false);
  ctx.fillStyle='#8888ee'; ctx.font='bold 12px Segoe UI';
  ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillText(`KILLS ${game.kills}   SCORE ${game.score}`, W-pad, pad+10);

  // ── Wave-clear overlay
  if (game.state==='wave_clear') {
    const prog=1-(game.waveTimer/180);
    const fadeIn=Math.min(1,prog*4), fadeOut=Math.max(0,1-(prog-.75)*4);
    ctx.globalAlpha=fadeIn*fadeOut;
    ctx.fillStyle='rgba(0,0,0,0.45)';
    roundRect(ctx,W/2-170,H/2-50,340,90,8,true,false);
    ctx.fillStyle='#a0e060'; ctx.font='bold 30px Segoe UI';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('WAVE CLEAR!',W/2,H/2-15);
    ctx.fillStyle='#888'; ctx.font='14px Segoe UI';
    ctx.fillText(`Round ${game.round+1} begins in ${Math.ceil(game.waveTimer/60)}…`,W/2,H/2+20);
    ctx.globalAlpha=1;
  }

  // ── Game over overlay
  if (game.state==='game_over') {
    if (!game.scoreSaved && !mp.active) { game.scoreSaved=true; saveScore(); }
    ctx.fillStyle='rgba(0,0,0,0.78)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#c83838'; ctx.font=`bold ${Math.round(W*.04)}px Segoe UI`;
    ctx.fillText('GAME  OVER',W/2,H/2-50);
    ctx.fillStyle='#aaa'; ctx.font=`${Math.round(W*.016)}px Segoe UI`;
    ctx.fillText(`Round ${game.round}  •  Kills: ${game.kills}  •  Score: ${game.score}`,W/2,H/2+4);
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font=`${Math.round(W*.013)}px Segoe UI`;
    ctx.fillText('[R] Restart    [M] Main Menu',W/2,H/2+42);
  }

  // ── Bottom bar (LoL-style) ─────────────────────────────────────────────────
  {
    const BY = H - HUD_H;

    // Background
    ctx.fillStyle = 'rgba(5,3,16,0.94)';
    ctx.fillRect(0, BY, W, HUD_H);

    // Top border gradient
    const tb = ctx.createLinearGradient(0,0,W,0);
    tb.addColorStop(0,'rgba(60,40,120,0)');
    tb.addColorStop(0.25,'rgba(90,65,180,0.9)');
    tb.addColorStop(0.75,'rgba(90,65,180,0.9)');
    tb.addColorStop(1,'rgba(60,40,120,0)');
    ctx.fillStyle = tb; ctx.fillRect(0, BY, W, 1);

    const midY = BY + HUD_H / 2;
    const ipd = 18; // inner padding

    // helper: vertical divider
    function vDiv(x) {
      ctx.fillStyle = 'rgba(80,60,140,0.45)';
      ctx.fillRect(x, BY+8, 1, HUD_H-16);
    }

    // ── 1. HP section ─────────────────────────────
    const hpSecW = Math.min(230, W * 0.16);
    const hpX = ipd;
    const hf = Math.max(0, player.hp / player.maxHp);
    const hpColor = hf > 0.5 ? '#2ecc40' : hf > 0.25 ? '#e6c020' : '#e74c3c';

    ctx.fillStyle = 'rgba(160,140,220,0.55)';
    ctx.font = 'bold 9px Segoe UI'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('HEALTH', hpX, BY+10);

    const hasShield = player.perks.shield > 0;
    const shieldMax = SHIELD_MAXHP[player.perks.shield] || 0;
    const bx=hpX, bw=hpSecW-ipd;
    // If shield exists, split vertical space: HP bar on top, shield bar below
    const by2 = hasShield ? BY+20 : BY+22;
    const bh  = hasShield ? 11 : 16;
    // HP track
    ctx.fillStyle='#190808'; ctx.fillRect(bx,by2,bw,bh);
    ctx.fillStyle=hpColor; ctx.fillRect(bx,by2,bw*hf,bh);
    ctx.fillStyle='rgba(255,255,255,0.10)'; ctx.fillRect(bx,by2,bw*hf,bh/3);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
    ctx.strokeRect(bx,by2,bw,bh);
    ctx.fillStyle='#fff'; ctx.font='bold 9px Segoe UI';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${player.hp} / ${player.maxHp}`, bx+bw/2, by2+bh/2);

    // Shield bar
    if (hasShield) {
      const sby = by2 + bh + 3;
      const sbh = 9;
      const sf = Math.max(0, player.shield / shieldMax);
      const recharging = player.shield < shieldMax && player.shieldRechargeTimer <= 0;
      const shieldCol = recharging ? `hsl(${Math.round(performance.now()/30)%360},80%,55%)` : '#4499ff';
      ctx.fillStyle='rgba(0,0,30,0.7)'; ctx.fillRect(bx, sby, bw, sbh);
      if (sf > 0) {
        ctx.fillStyle = shieldCol; ctx.fillRect(bx, sby, bw*sf, sbh);
        ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(bx, sby, bw*sf, sbh/2);
      }
      ctx.strokeStyle='rgba(68,153,255,0.4)'; ctx.lineWidth=1;
      ctx.strokeRect(bx, sby, bw, sbh);
      ctx.fillStyle='rgba(150,200,255,0.7)'; ctx.font='bold 7px Segoe UI';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`🛡 ${Math.ceil(player.shield)} / ${shieldMax}`, bx+bw/2, sby+sbh/2);
    }

    vDiv(hpSecW + ipd*1.5);

    // ── 2. Weapon slots (primary + secondary) ─────
    const wepX = hpSecW + ipd*3;
    const slotW = Math.min(150, W*0.10);
    const slotGap = 6;

    function drawWeaponSlot(slotX, wkey, ammo, isActive) {
      const sw = WEAPONS[wkey];
      const alpha = isActive ? 1 : 0.45;
      ctx.save(); ctx.globalAlpha = alpha;

      // slot background
      ctx.fillStyle = isActive ? sw.color+'28' : 'rgba(255,255,255,0.04)';
      roundRect(ctx, slotX, BY+8, slotW, HUD_H-16, 6, true, false);
      ctx.strokeStyle = isActive ? sw.color+'99' : 'rgba(80,70,120,0.5)';
      ctx.lineWidth = isActive ? 1.5 : 1;
      roundRect(ctx, slotX, BY+8, slotW, HUD_H-16, 6, false, true);

      // weapon name
      ctx.fillStyle = sw.color; ctx.font = `bold 11px Segoe UI`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(sw.name.toUpperCase(), slotX+slotW/2, BY+20);

      if (wkey === 'pistol') {
        // heat bar
        const heatFrac = player.heat / 100;
        const hbX = slotX+7, hbY = BY+30, hbW = slotW-14, hbH = 8;
        ctx.fillStyle = '#160808'; ctx.fillRect(hbX, hbY, hbW, hbH);
        if (heatFrac > 0) {
          const hCol = heatFrac < 0.5
            ? `hsl(${Math.round(120 - heatFrac*2*60)},88%,42%)`
            : `hsl(${Math.round(60  - (heatFrac-0.5)*2*60)},88%,42%)`;
          ctx.fillStyle = player.overheated ? '#ff2200' : hCol;
          ctx.fillRect(hbX, hbY, hbW * heatFrac, hbH);
          ctx.fillStyle='rgba(255,255,255,0.11)';
          ctx.fillRect(hbX, hbY, hbW * heatFrac, hbH/2);
        }
        ctx.strokeStyle = player.overheated ? '#ff5500' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth=1; ctx.strokeRect(hbX, hbY, hbW, hbH);
        if (player.overheated) {
          ctx.fillStyle='#ff4400'; ctx.font='bold 8px Segoe UI';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('OVERHEATED', slotX+slotW/2, BY+46);
        } else {
          ctx.fillStyle='rgba(180,130,110,0.6)'; ctx.font='8px Segoe UI';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('HEAT', slotX+slotW/2, BY+46);
        }
      } else {
        // ammo display — pips for ≤16, bar+number for larger counts
        const hbX = slotX+7, hbY = BY+30, hbW = slotW-14, hbH = 8;
        if (sw.ammoMax <= 16) {
          // pip row
          const pipAreaW = hbW, pw2 = Math.max(3, hbW/sw.ammoMax - 2), ph2 = hbH;
          const totalPipW = sw.ammoMax*(pw2+2)-2;
          const pipStartX = slotX + (slotW-totalPipW)/2;
          for (let k=0;k<sw.ammoMax;k++) {
            ctx.fillStyle = k<ammo ? sw.color : 'rgba(255,255,255,0.1)';
            ctx.fillRect(pipStartX+k*(pw2+2), hbY, pw2, ph2);
          }
        } else {
          // ammo bar
          const frac = ammo / sw.ammoMax;
          ctx.fillStyle = '#0d0d1a'; ctx.fillRect(hbX, hbY, hbW, hbH);
          ctx.fillStyle = ammo===0 ? '#ff3322' : sw.color;
          ctx.fillRect(hbX, hbY, hbW*frac, hbH);
          ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(hbX, hbY, hbW*frac, hbH/2);
          ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
          ctx.strokeRect(hbX, hbY, hbW, hbH);
        }
        ctx.fillStyle = ammo===0 ? '#ff4444' : 'rgba(200,200,200,0.65)';
        ctx.font='9px Segoe UI'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(`${ammo} / ${sw.ammoMax}`, slotX+slotW/2, BY+47);
      }

      // hints row at bottom of slot
      ctx.font='8px Segoe UI'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      if (!isActive && wkey !== 'pistol') {
        ctx.fillStyle='rgba(180,180,180,0.4)';
        ctx.fillText('[Q] swap', slotX+slotW/2, BY+HUD_H-4);
      }
      if (isActive) {
        ctx.fillStyle='rgba(180,180,180,0.35)';
        const swapHint = wkey==='pistol' ? '[Q] swap' : '[Q] pistol';
        ctx.fillText(`${swapHint}  [I] info`, slotX+slotW/2, BY+HUD_H-4);
      }
      ctx.restore();
    }

    const pistolActive = player.weaponKey === 'pistol';
    drawWeaponSlot(wepX, 'pistol', Infinity, pistolActive);

    if (player.secondaryKey) {
      const secX = wepX + slotW + slotGap;
      const secAmmo = pistolActive ? player.secondaryAmmo : player.ammo;
      drawWeaponSlot(secX, player.secondaryKey, secAmmo, !pistolActive);
      vDiv(secX + slotW + ipd);
    } else {
      // empty secondary slot hint
      ctx.save(); ctx.globalAlpha=0.25;
      roundRect(ctx, wepX+slotW+slotGap, BY+8, slotW, HUD_H-16, 6, false, true);
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
      roundRect(ctx, wepX+slotW+slotGap, BY+8, slotW, HUD_H-16, 6, false, true);
      ctx.fillStyle='#888'; ctx.font='9px Segoe UI';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('MYSTERY BOX', wepX+slotW+slotGap+slotW/2, BY+HUD_H/2-6);
      ctx.fillText('for secondary', wepX+slotW+slotGap+slotW/2, BY+HUD_H/2+6);
      ctx.restore();
      vDiv(wepX + slotW*2 + slotGap + ipd);
    }

    // ── 3. Stat tiles ─────────────────────────────
    const stats = [
      { icon:'⚔', label:'DAMAGE',    val:`+${player.upgrades.damage*20}%`,                                     col:'#ff7744', lvl:player.upgrades.damage    },
      { icon:'⚡', label:'ATK SPD',   val:`+${Math.round((1-Math.pow(0.85,player.upgrades.atkSpeed))*100)}%`,  col:'#ffdd44', lvl:player.upgrades.atkSpeed  },
      { icon:'★',  label:'CRIT',      val:`${player.upgrades.crit*10}%`,                                        col:'#bb44ff', lvl:player.upgrades.crit      },
      { icon:'👟', label:'MOV SPD',   val:`+${player.upgrades.moveSpeed*10}%`,                                  col:'#44ffaa', lvl:player.upgrades.moveSpeed },
      { icon:'❤',  label:'HP REGEN',  val:`${[0,2,5,8,11,15][player.upgrades.hpRegen]}/s`,                      col:'#ff4d6d', lvl:player.upgrades.hpRegen   },
    ];
    const statStartX = wepX + slotW*2 + slotGap + ipd*2.5;
    const statTileW  = Math.min(110, (W - statStartX - 160 - ipd*3) / stats.length);

    stats.forEach((s, i) => {
      const sx = statStartX + i * (statTileW + 6);
      const sy = BY + 8;
      const sh = HUD_H - 16;

      // tile bg
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      roundRect(ctx, sx, sy, statTileW, sh, 5, true, false);
      ctx.strokeStyle = s.lvl > 0 ? s.col+'44' : 'rgba(60,50,100,0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, sx, sy, statTileW, sh, 5, false, true);

      // icon
      ctx.font = '13px Segoe UI'; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillStyle = s.col;
      ctx.fillText(s.icon, sx+7, sy+7);

      // label
      ctx.font = 'bold 8px Segoe UI'; ctx.fillStyle='rgba(180,170,210,0.6)';
      ctx.textAlign='right';
      ctx.fillText(s.label, sx+statTileW-6, sy+8);

      // value
      ctx.font = `bold 14px Segoe UI`; ctx.fillStyle = s.lvl>0 ? s.col : 'rgba(120,110,150,0.7)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(s.val, sx+statTileW/2, BY+38);

      // level pips
      const segW=(statTileW-14)/5;
      for(let k=0;k<5;k++){
        ctx.fillStyle = k<s.lvl ? s.col : 'rgba(255,255,255,0.08)';
        ctx.fillRect(sx+7+k*(segW+1), BY+HUD_H-14, segW, 3);
      }
    });

    const afterStats = statStartX + stats.length*(statTileW+6) + ipd;
    vDiv(afterStats);

    // ── 4. Money ──────────────────────────────────
    const monX = afterStats + ipd;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='bold 9px Segoe UI'; ctx.fillStyle='rgba(245,197,24,0.55)';
    ctx.fillText('GOLD', monX + 55, BY+16);
    ctx.font=`bold ${Math.round(HUD_H*.38)}px Segoe UI`;
    ctx.fillStyle='#f5c518';
    ctx.fillText(`$${player.money}`, monX+55, midY+4);

    // ── 5. Active perk tiles (bottom-right) ───────
    const PERK_DEFS = [
      { key:'doublePoints', icon:'2×', label:'DOUBLE GOLD', col:'#ffd700', glow:'rgba(255,200,0,0.35)' },
      { key:'magnet',       icon:'🧲', label:'MAGNET',      col:'#60ccff', glow:'rgba(50,150,255,0.3)' },
    ];
    const activePerks = PERK_DEFS.filter(pd => activePerkTimers[pd.key] > 0);
    if (activePerks.length > 0) {
      const tileW = 68, tileH = HUD_H - 16, tileGap = 6;
      const totalW = activePerks.length * (tileW + tileGap) - tileGap;
      let px2 = W - ipd - totalW;

      vDiv(px2 - ipd);

      activePerks.forEach(pd => {
        const timer = activePerkTimers[pd.key];
        const frac  = timer / PERK_DURATION;
        const tx = px2, ty = BY + 8;

        ctx.save();

        // Glow pulse
        const gp = Math.sin(performance.now() / 400) * 0.5 + 0.5;
        ctx.shadowColor = pd.col; ctx.shadowBlur = 6 + gp * 8;

        // Tile bg — brightens as timer is high
        ctx.fillStyle = `rgba(${pd.col==='#ffd700'?'60,40,0':'0,20,55'},${0.7+gp*0.15})`;
        roundRect(ctx, tx, ty, tileW, tileH, 7, true, false);
        ctx.shadowBlur = 0;

        // Border (flashes when < 3s left)
        const lowTime = timer < 180;
        const flashAlpha = lowTime ? 0.5 + Math.sin(performance.now()/120)*0.5 : 0.7;
        ctx.strokeStyle = pd.col + Math.round(flashAlpha * 255).toString(16).padStart(2,'0');
        ctx.lineWidth = lowTime ? 2 : 1.5;
        roundRect(ctx, tx, ty, tileW, tileH, 7, false, true);

        // Big icon
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const isEmoji = pd.icon.length > 1 || pd.icon.codePointAt(0) > 127;
        ctx.font = isEmoji ? `18px Segoe UI` : `bold 18px Segoe UI`;
        ctx.fillStyle = pd.col;
        ctx.shadowColor = pd.col; ctx.shadowBlur = 8;
        ctx.fillText(pd.icon, tx + tileW / 2, ty + tileH * 0.32);
        ctx.shadowBlur = 0;

        // Label
        ctx.font = 'bold 7px Segoe UI';
        ctx.fillStyle = 'rgba(200,200,200,0.6)';
        ctx.fillText(pd.label, tx + tileW / 2, ty + tileH * 0.58);

        // Timer bar track
        const barX = tx + 5, barY = ty + tileH - 13, barW = tileW - 10, barH = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(barX, barY, barW, barH);

        // Timer bar fill — color shifts red when low
        const barCol = lowTime
          ? `hsl(${Math.round(frac * 60)},90%,55%)`
          : pd.col;
        ctx.fillStyle = barCol;
        ctx.fillRect(barX, barY, barW * frac, barH);

        // Gloss on bar
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barY, barW * frac, barH / 2);

        // Seconds text
        ctx.font = 'bold 8px Segoe UI';
        ctx.fillStyle = lowTime ? barCol : 'rgba(255,255,255,0.55)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(Math.ceil(timer / 60) + 's', tx + tileW / 2, barY - 1);

        ctx.restore();
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
