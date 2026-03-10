
// ─── SHOP VISUALS ─────────────────────────────────────────────────────────────
function drawShopMarker() {
  const px=SHOP_POS.cx*TW, py=SHOP_POS.cy*TH;
  const sz=Math.min(TW,TH)*.55, t2=performance.now()/1000;
  // Glow pulse
  const pulse=Math.sin(t2*2)*.5+.5;
  const g=ctx.createRadialGradient(px,py,0,px,py,sz*3);
  g.addColorStop(0,`rgba(80,220,255,${0.18+pulse*0.12})`);
  g.addColorStop(1,'rgba(80,180,255,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*3,0,Math.PI*2); ctx.fill();
  // Chest box body
  ctx.save();
  ctx.shadowColor='#44ccff'; ctx.shadowBlur=12+pulse*8;
  ctx.fillStyle='#4a3010'; roundRect(ctx,px-sz,py-sz*.6,sz*2,sz*1.2,sz*.18,true,false);
  ctx.fillStyle='#6b4718'; roundRect(ctx,px-sz+2,py-sz*.6+2,sz*2-4,sz*1.2-4,sz*.14,true,false);
  // Lid stripe
  ctx.fillStyle='#8b5e28'; ctx.fillRect(px-sz,py-sz*.08,sz*2,sz*.18);
  // Lock
  ctx.fillStyle='#f5c518';
  ctx.beginPath(); ctx.arc(px,py+sz*.05,sz*.22,Math.PI,0); ctx.fill();
  ctx.fillStyle='#e5b010'; roundRect(ctx,px-sz*.22,py+sz*.05,sz*.44,sz*.32,sz*.07,true,false);
  ctx.restore();
  // "SHOP" label above
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.font=`bold ${Math.round(TH*.32)}px 'Press Start 2P'`;
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillText('SHOP',px+1,py-sz*.7+1);
  ctx.fillStyle=`rgba(100,220,255,${0.7+pulse*0.3})`; ctx.fillText('SHOP',px,py-sz*.7);
  ctx.restore();
  // "Press E" prompt when near
  const dist=Math.hypot(player.cx-SHOP_POS.cx,player.cy-SHOP_POS.cy);
  if (dist<SHOP_RADIUS&&!shopOpen) {
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.font=`${Math.round(TH*.28)}px Segoe UI`;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillText('[E] Open Shop',px+1,py-sz*1.3+1);
    ctx.fillStyle='#ffffff'; ctx.fillText('[E] Open Shop',px,py-sz*1.3);
    ctx.restore();
  }
}

// Shared helper for both shop UIs
function _drawShopPanel(title, titleCol, items, getLvl, getMaxLevel, getPrice, getDesc) {
  const W=canvas.width, H=canvas.height;
  const pw = Math.min(580, W - 40);
  const ph = Math.min(420, H - HUD_H - 40);
  const px = W/2 - pw/2;
  const py = H - ph - HUD_H - 12;

  ctx.save();
  pixelPanel(ctx, px, py, pw, ph, '#111120');

  // Top strip
  const stripH = 38;
  ctx.fillStyle = '#0a0a1e';
  ctx.fillRect(px + 2, py + 2, pw - 4, stripH - 2);
  ctx.fillStyle = '#1e1e3e';
  ctx.fillRect(px + 2, py + stripH, pw - 4, 1);

  // Title
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = titleCol;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(title, px + 14, py + 2 + stripH/2);

  // Gold display
  ctx.font = "18px 'VT323'";
  ctx.fillStyle = '#f5c518';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`$ ${player.money}`, px + pw - 14, py + 2 + stripH/2);

  const itemAreaY = py + stripH + 3;
  const itemAreaH = ph - stripH - 6 - 24;
  const count = items.length;
  const rowH = Math.floor(itemAreaH / count);

  items.forEach((item, i) => {
    const lvl = getLvl(item);
    const maxLvl = getMaxLevel(item);
    const maxed = lvl >= maxLvl;
    const cost = maxed ? 0 : getPrice(item, lvl);
    const canAfford = !maxed && player.money >= cost;
    const iy = itemAreaY + i * rowH;

    // Row background tint
    ctx.fillStyle = canAfford ? item.color + '16' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(px + 2, iy, pw - 4, rowH);
    if (i > 0) {
      ctx.fillStyle = '#1c1c2e';
      ctx.fillRect(px + 2, iy, pw - 4, 1);
    }

    // Key hint [1][2]...
    ctx.font = "15px 'VT323'";
    ctx.fillStyle = canAfford ? item.color : 'rgba(100,100,130,0.55)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`[${i+1}]`, px + 18, iy + rowH/2);

    // Icon slot
    const iconSize = Math.min(44, rowH - 8);
    const iconSlotX = px + 32;
    const iconSlotY = iy + (rowH - iconSize) / 2;
    pixelSlot(ctx, iconSlotX, iconSlotY, iconSize, iconSize, maxed ? '#141428' : item.color + '22', !maxed && canAfford);
    ctx.font = `${Math.round(iconSize * 0.52)}px Segoe UI`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = maxed ? '#555' : item.color;
    ctx.fillText(item.icon, iconSlotX + iconSize/2, iconSlotY + iconSize/2);

    // Text area
    const textX = iconSlotX + iconSize + 10;
    const textRight = px + pw - 90;

    // Item name — Press Start 2P at 9px (smallest readable)
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillStyle = maxed ? '#555' : item.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(item.name, textX, iy + 6);

    // Level squares (10px each, 2px gap) below name
    const sqY = iy + 20;
    for (let l = 0; l < maxLvl; l++) {
      ctx.fillStyle = l < lvl ? item.color : 'rgba(255,255,255,0.12)';
      ctx.fillRect(textX + l * 12, sqY, 9, 6);
    }

    // Description — VT323 16px
    ctx.font = "16px 'VT323'";
    ctx.fillStyle = maxed ? '#555' : 'rgba(190,180,220,0.85)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const desc = maxed ? 'MAX LEVEL' : getDesc(item, lvl);
    // Clip description to fit
    const maxDescW = textRight - textX;
    let descText = desc;
    ctx.save();
    ctx.beginPath();
    ctx.rect(textX, iy + 30, maxDescW, rowH - 34);
    ctx.clip();
    ctx.fillText(descText, textX, iy + 30);
    ctx.restore();

    // Price badge
    const badgeW = 72, badgeH = 26;
    const badgeX = px + pw - badgeW - 10;
    const badgeY = iy + (rowH - badgeH) / 2;
    if (!maxed) {
      pixelPanel(ctx, badgeX, badgeY, badgeW, badgeH, canAfford ? '#1a1a00' : '#200a0a');
      ctx.font = "18px 'VT323'";
      ctx.fillStyle = canAfford ? '#f5c518' : '#dd4444';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`$${cost}`, badgeX + badgeW/2, badgeY + badgeH/2);
    } else {
      pixelPanel(ctx, badgeX, badgeY, badgeW, badgeH, '#1a1a1a');
      ctx.font = "18px 'VT323'";
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MAX', badgeX + badgeW/2, badgeY + badgeH/2);
    }
  });

  // Close hint
  ctx.font = "15px 'VT323'";
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('[E] CLOSE', px + pw/2, py + ph - 6);

  ctx.restore();
}

// ─── PISTOL UPGRADE PANEL ─────────────────────────────────────────────────────
let pistolUpgradeOpen = false;

function drawPistolUpgradePanel() {
  if (!pistolUpgradeOpen) return;
  const W = canvas.width, H = canvas.height;
  const pw = Math.min(520, W - 40);
  const ph = Math.min(360, H - HUD_H - 40);
  const px = W/2 - pw/2;
  const py = H - ph - HUD_H - 12;

  ctx.save();
  pixelPanel(ctx, px, py, pw, ph, '#0a1622');

  // Top strip
  const stripH = 38;
  ctx.fillStyle = '#060e18';
  ctx.fillRect(px + 2, py + 2, pw - 4, stripH - 2);
  ctx.fillStyle = '#1a2a3e';
  ctx.fillRect(px + 2, py + stripH, pw - 4, 1);

  // Title
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = '#60c0ff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('\uD83D\uDD2B PISTOL UPGRADE', px + 14, py + 2 + stripH/2);

  // Gold display
  ctx.font = "18px 'VT323'";
  ctx.fillStyle = '#f5c518';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`$ ${player.money}`, px + pw - 14, py + 2 + stripH/2);

  const bodyY = py + stripH + 14;
  const spread = player.pistolSpread;
  const orbs = player.spreadOrbs;
  const maxSpread = 2;

  // ─── Current spread visual ────────────────────────────────────────────────
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillStyle = '#5599cc';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('CURRENT SPREAD', px + pw/2, bodyY);

  // Bullet icons
  [-30, 0, 30].forEach((ox, k) => {
    const unlocked = k < spread + 1;
    const bx = px + pw/2 + ox, by = bodyY + 24;
    ctx.fillStyle = unlocked ? 'rgba(80,180,255,0.9)' : 'rgba(60,90,120,0.35)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 16, 7, 19, 0, 0, Math.PI*2);
    ctx.fill();
    if (unlocked) {
      ctx.fillStyle = 'rgba(200,235,255,0.9)';
      ctx.beginPath(); ctx.arc(bx, by + 4, 5, Math.PI, 0); ctx.fill();
    }
  });

  ctx.font = "17px 'VT323'";
  ctx.fillStyle = '#aaddff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`Level ${spread} / ${maxSpread}  —  ${spread + 1} bullet${spread + 1 > 1 ? 's' : ''}`, px + pw/2, bodyY + 78);

  // Divider
  ctx.fillStyle = '#1a2a3e';
  ctx.fillRect(px + 20, bodyY + 100, pw - 40, 1);

  // ─── Requirements ─────────────────────────────────────────────────────────
  const reqY = bodyY + 108;
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillStyle = '#556677';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('REQUIRED TO UPGRADE:', px + 20, reqY);

  const hasOrb = orbs > 0;
  const canAfford = player.money >= PISTOL_UPGRADE_COST;

  ctx.font = "18px 'VT323'";
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // Orb row
  ctx.fillStyle = hasOrb ? '#ff88bb' : '#ff5555';
  ctx.fillText(`\u25C6  Pistol Orb  (Eye Demon drop)  —  have: ${orbs}  ${hasOrb ? '\u2713' : '\u2717'}`, px + 20, reqY + 20);

  // Gold row
  ctx.fillStyle = canAfford ? '#f5c518' : '#dd4444';
  ctx.fillText(`\u25C6  $${PISTOL_UPGRADE_COST.toLocaleString()} gold  —  have: $${player.money.toLocaleString()}  ${canAfford ? '\u2713' : '\u2717'}`, px + 20, reqY + 42);

  // ─── Upgrade levels info ───────────────────────────────────────────────────
  ctx.font = "17px 'VT323'";
  ctx.fillStyle = 'rgba(120,170,210,0.55)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('Lv0: 1 bullet   \u2192   Lv1: 2 bullets   \u2192   Lv2: 3 bullets (MAX)', px + pw/2, reqY + 66);

  // ─── Buy button ───────────────────────────────────────────────────────────
  const btnY = reqY + 92;
  if (spread >= maxSpread) {
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = '#445566';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FULLY UPGRADED', px + pw/2, btnY + 16);
  } else {
    const canBuy = hasOrb && canAfford;
    const btnW = 250, btnH = 34;
    const btnX = px + pw/2 - btnW/2;
    pixelPanel(ctx, btnX, btnY, btnW, btnH, canBuy ? '#0a1f0a' : '#1a0a0a');
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillStyle = canBuy ? '#44ff88' : '#664444';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(canBuy ? `[E] UPGRADE  \u2192  ${spread + 2} BULLETS` : 'CANNOT UPGRADE YET', px + pw/2, btnY + 17);
  }

  // Close hint
  ctx.font = "15px 'VT323'";
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('[E] CLOSE', px + pw/2, py + ph - 6);

  ctx.restore();
}

function drawPerkShopUI() {
  if (!perkShopOpen) return;
  _drawShopPanel(
    '\u2728 PERK SHOP', '#44ffaa',
    PERK_SHOP_ITEMS,
    item => player.perks[item.key],
    item => item.maxLevel,
    (item, lvl) => item.price(lvl),
    (item, lvl) => item.desc(lvl)
  );
}

function drawShopUI() {
  if (!shopOpen) return;
  _drawShopPanel(
    '\u2694 WEAPON SHOP', '#44ccff',
    SHOP_ITEMS,
    item => player.upgrades[item.key],
    item => item.maxLevel,
    (item, lvl) => item.price(lvl),
    (item, lvl) => item.desc(lvl)
  );
}
