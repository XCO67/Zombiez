
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

function drawPerkShopUI() {
  if (!perkShopOpen) return;
  const W=canvas.width, H=canvas.height;
  const pw=500, ph=360;
  const px=W/2-pw/2, py=H-ph-HUD_H-16;

  ctx.save();

  // Main background panel
  pixelPanel(ctx, px, py, pw, ph, '#111120');

  // Top strip (32px)
  const stripH = 32;
  ctx.fillStyle = '#0a0a1e';
  ctx.fillRect(px + 2, py + 2, pw - 4, stripH - 2);
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(px + 2, py + 2 + stripH - 2, pw - 4, 1);

  // Title
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillStyle = '#44ffaa';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('\u2728 PERK SHOP', px + 14, py + 2 + stripH/2);

  // Gold coin right-aligned in strip
  ctx.font = "8px 'Press Start 2P'";
  ctx.fillStyle = '#f5c518';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`$${player.money}`, px + pw - 14, py + 2 + stripH/2);

  // Horizontal divider
  ctx.fillStyle = '#2a2a4e';
  ctx.fillRect(px + 2, py + 2 + stripH, pw - 4, 2);

  const itemAreaY = py + 2 + stripH + 2;
  const itemAreaH = ph - stripH - 6 - 22; // leave room for close hint
  const count = PERK_SHOP_ITEMS.length;
  const rowH = Math.floor(itemAreaH / count);

  PERK_SHOP_ITEMS.forEach((item, i) => {
    const lvl = player.perks[item.key];
    const maxed = lvl >= item.maxLevel;
    const cost = maxed ? 0 : item.price(lvl);
    const canAfford = !maxed && player.money >= cost;
    const iy = itemAreaY + i * rowH;

    // Row background
    const rowBg = canAfford ? item.color + '18' : 'rgba(255,255,255,0.04)';
    ctx.fillStyle = rowBg;
    ctx.fillRect(px + 2, iy, pw - 4, rowH);

    // Row separator
    if (i > 0) {
      ctx.fillStyle = '#1e1e2e';
      ctx.fillRect(px + 2, iy, pw - 4, 1);
    }

    // Key hint on far left
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = canAfford ? item.color : 'rgba(100,100,120,0.6)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`[${i+1}]`, px + 8, iy + rowH/2);

    // Icon slot (40x rowH, left side)
    const iconSlotX = px + 30;
    const iconSlotH = Math.min(40, rowH - 4);
    const iconSlotY = iy + (rowH - iconSlotH) / 2;
    pixelSlot(ctx, iconSlotX, iconSlotY, 40, iconSlotH, maxed ? '#141428' : item.color + '22', !maxed && canAfford);
    ctx.font = '16px Segoe UI';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = maxed ? '#555' : item.color;
    ctx.fillText(item.icon, iconSlotX + 20, iconSlotY + iconSlotH/2);

    // Item name
    const textX = iconSlotX + 48;
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillStyle = maxed ? '#444' : item.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(item.name, textX, iy + 6);

    // Level squares (5 squares, 8x8, 2px gap)
    const sqY = iy + 20;
    for (let l = 0; l < item.maxLevel; l++) {
      ctx.fillStyle = l < lvl ? item.color : 'rgba(255,255,255,0.1)';
      ctx.fillRect(textX + l * 10, sqY, 8, 8);
    }

    // Description
    ctx.font = "10px 'VT323', monospace";
    ctx.fillStyle = maxed ? '#555' : 'rgba(180,170,210,0.75)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(maxed ? 'MAX LEVEL' : item.desc(lvl), textX, iy + 33);

    // Price badge (far right) — pixelPanel 56x22
    if (!maxed) {
      const badgeX = px + pw - 70;
      const badgeY = iy + (rowH - 22) / 2;
      pixelPanel(ctx, badgeX, badgeY, 56, 22, '#1e1e00');
      ctx.font = "7px 'Press Start 2P'";
      ctx.fillStyle = canAfford ? '#f5c518' : '#cc4444';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`$${cost}`, badgeX + 28, badgeY + 11);
    } else {
      // MAX badge
      const badgeX = px + pw - 70;
      const badgeY = iy + (rowH - 22) / 2;
      pixelPanel(ctx, badgeX, badgeY, 56, 22, '#1a1a1a');
      ctx.font = "7px 'Press Start 2P'";
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MAX', badgeX + 28, badgeY + 11);
    }
  });

  // Bottom close hint
  ctx.font = "6px 'Press Start 2P'";
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('[E] CLOSE', px + pw/2, py + ph - 6);

  ctx.restore();
}

function drawShopUI() {
  if (!shopOpen) return;
  const W=canvas.width, H=canvas.height;
  const pw=500, ph=360;
  const px=W/2-pw/2, py=H-ph-HUD_H-16;

  ctx.save();

  // Main background panel
  pixelPanel(ctx, px, py, pw, ph, '#111120');

  // Top strip (32px)
  const stripH = 32;
  ctx.fillStyle = '#0a0a1e';
  ctx.fillRect(px + 2, py + 2, pw - 4, stripH - 2);
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(px + 2, py + 2 + stripH - 2, pw - 4, 1);

  // Title
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillStyle = '#44ccff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('\u2694 WEAPON SHOP', px + 14, py + 2 + stripH/2);

  // Gold coin right-aligned in strip
  ctx.font = "8px 'Press Start 2P'";
  ctx.fillStyle = '#f5c518';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`$${player.money}`, px + pw - 14, py + 2 + stripH/2);

  // Horizontal divider
  ctx.fillStyle = '#2a2a4e';
  ctx.fillRect(px + 2, py + 2 + stripH, pw - 4, 2);

  const itemAreaY = py + 2 + stripH + 2;
  const itemAreaH = ph - stripH - 6 - 22;
  const count = SHOP_ITEMS.length;
  const rowH = Math.floor(itemAreaH / count);

  SHOP_ITEMS.forEach((item, i) => {
    const lvl = player.upgrades[item.key];
    const maxed = lvl >= item.maxLevel;
    const cost = maxed ? 0 : item.price(lvl);
    const canAfford = !maxed && player.money >= cost;
    const iy = itemAreaY + i * rowH;

    // Row background
    const rowBg = canAfford ? item.color + '18' : 'rgba(255,255,255,0.04)';
    ctx.fillStyle = rowBg;
    ctx.fillRect(px + 2, iy, pw - 4, rowH);

    // Row separator
    if (i > 0) {
      ctx.fillStyle = '#1e1e2e';
      ctx.fillRect(px + 2, iy, pw - 4, 1);
    }

    // Key hint on far left
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = canAfford ? item.color : 'rgba(100,100,120,0.6)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`[${i+1}]`, px + 8, iy + rowH/2);

    // Icon slot (40x rowH, left side)
    const iconSlotX = px + 30;
    const iconSlotH = Math.min(40, rowH - 4);
    const iconSlotY = iy + (rowH - iconSlotH) / 2;
    pixelSlot(ctx, iconSlotX, iconSlotY, 40, iconSlotH, maxed ? '#141428' : item.color + '22', !maxed && canAfford);
    ctx.font = '16px Segoe UI';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = maxed ? '#555' : item.color;
    ctx.fillText(item.icon, iconSlotX + 20, iconSlotY + iconSlotH/2);

    // Item name
    const textX = iconSlotX + 48;
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillStyle = maxed ? '#444' : item.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(item.name, textX, iy + 6);

    // Level squares (5 squares, 8x8, 2px gap)
    const sqY = iy + 20;
    for (let l = 0; l < item.maxLevel; l++) {
      ctx.fillStyle = l < lvl ? item.color : 'rgba(255,255,255,0.1)';
      ctx.fillRect(textX + l * 10, sqY, 8, 8);
    }

    // Description
    ctx.font = "10px 'VT323', monospace";
    ctx.fillStyle = maxed ? '#555' : 'rgba(180,170,210,0.75)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(maxed ? 'MAX LEVEL' : item.desc(lvl), textX, iy + 33);

    // Price badge (far right) — pixelPanel 56x22
    if (!maxed) {
      const badgeX = px + pw - 70;
      const badgeY = iy + (rowH - 22) / 2;
      pixelPanel(ctx, badgeX, badgeY, 56, 22, '#1e1e00');
      ctx.font = "7px 'Press Start 2P'";
      ctx.fillStyle = canAfford ? '#f5c518' : '#cc4444';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`$${cost}`, badgeX + 28, badgeY + 11);
    } else {
      // MAX badge
      const badgeX = px + pw - 70;
      const badgeY = iy + (rowH - 22) / 2;
      pixelPanel(ctx, badgeX, badgeY, 56, 22, '#1a1a1a');
      ctx.font = "7px 'Press Start 2P'";
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MAX', badgeX + 28, badgeY + 11);
    }
  });

  // Bottom close hint
  ctx.font = "6px 'Press Start 2P'";
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('[E] CLOSE', px + pw/2, py + ph - 6);

  ctx.restore();
}
