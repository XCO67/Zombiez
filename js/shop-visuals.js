
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
  ctx.font=`bold ${Math.round(TH*.35)}px Segoe UI`;
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
  const pw=Math.min(460,W*.44), ph=Math.min(310,H*.50);
  const px=W/2-pw/2, py=H-ph-HUD_H-12;

  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.78)';
  roundRect(ctx,px,py,pw,ph,12,true,false);
  ctx.strokeStyle='rgba(40,220,130,0.55)'; ctx.lineWidth=1.5;
  roundRect(ctx,px,py,pw,ph,12,false,true);

  // Title
  ctx.fillStyle='#44ffaa'; ctx.font=`bold ${Math.round(H*.027)}px Segoe UI`;
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.shadowColor='#20ee80'; ctx.shadowBlur=8;
  ctx.fillText('✨  PERK SHOP  ✨', px+pw/2, py+14);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(px+16,py+44,pw-32,1);

  // Money
  ctx.fillStyle='#f5c518'; ctx.font=`bold ${Math.round(H*.022)}px Segoe UI`;
  ctx.textAlign='center'; ctx.fillText(`$${player.money}`, px+pw/2, py+52);

  const itemH=(ph-108)/PERK_SHOP_ITEMS.length;
  PERK_SHOP_ITEMS.forEach((item,i)=>{
    const lvl=player.perks[item.key];
    const maxed=lvl>=item.maxLevel;
    const cost=maxed?0:item.price(lvl);
    const canAfford=!maxed&&player.money>=cost;
    const iy=py+88+i*itemH;

    ctx.fillStyle=canAfford?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.025)';
    roundRect(ctx,px+12,iy,pw-24,itemH-8,8,true,false);
    ctx.strokeStyle=canAfford?item.color+'88':'rgba(255,255,255,0.1)'; ctx.lineWidth=1;
    roundRect(ctx,px+12,iy,pw-24,itemH-8,8,false,true);

    // Key hint
    ctx.fillStyle=canAfford?item.color:'#555'; ctx.font=`bold ${Math.round(H*.022)}px Segoe UI`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(`[${i+1}]`, px+22, iy+itemH*.35);

    // Icon + name
    ctx.fillStyle=maxed?'#888':item.color;
    ctx.fillText(`${item.icon} ${item.name}`, px+58, iy+itemH*.35);

    // Level pips
    for (let l=0;l<item.maxLevel;l++) {
      ctx.fillStyle=l<lvl?item.color:'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.arc(px+pw-28-l*16,iy+itemH*.35,5,0,Math.PI*2); ctx.fill();
    }

    // Description
    ctx.fillStyle=maxed?'#555':'#aaa'; ctx.font=`${Math.round(H*.017)}px Segoe UI`;
    ctx.textAlign='left';
    ctx.fillText(maxed?'MAX LEVEL':item.desc(lvl), px+22, iy+itemH*.72);

    // Price
    if (!maxed) {
      ctx.fillStyle=canAfford?'#f5c518':'#c84444'; ctx.textAlign='right';
      ctx.fillText(`$${cost}`, px+pw-20, iy+itemH*.72);
    }
  });

  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font=`${Math.round(H*.016)}px Segoe UI`;
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('[E] Close', px+pw/2, py+ph-8);
  ctx.restore();
}

function drawShopUI() {
  if (!shopOpen) return;
  const W=canvas.width, H=canvas.height;
  const pw=Math.min(480,W*.46), ph=Math.min(340,H*.52);
  const px=W/2-pw/2, py=H-ph-HUD_H-12; // centered, sits above bottom bar

  // Backdrop
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.72)';
  roundRect(ctx,px,py,pw,ph,12,true,false);
  ctx.strokeStyle='rgba(80,220,255,0.5)'; ctx.lineWidth=1.5;
  roundRect(ctx,px,py,pw,ph,12,false,true);

  // Title
  ctx.fillStyle='#44ccff'; ctx.font=`bold ${Math.round(H*.028)}px Segoe UI`;
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('⚙  SHOP  ⚙', px+pw/2, py+14);
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(px+16,py+44,pw-32,1);

  // Money display
  ctx.fillStyle='#f5c518'; ctx.font=`bold ${Math.round(H*.022)}px Segoe UI`;
  ctx.textAlign='center';
  ctx.fillText(`$${player.money}`, px+pw/2, py+52);

  // Items
  const itemH=(ph-110)/SHOP_ITEMS.length;
  SHOP_ITEMS.forEach((item,i)=>{
    const lvl=player.upgrades[item.key];
    const maxed=lvl>=item.maxLevel;
    const cost=maxed?0:item.price(lvl);
    const canAfford=!maxed&&player.money>=cost;
    const iy=py+90+i*itemH;
    // Item bg
    ctx.fillStyle=canAfford?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.025)';
    roundRect(ctx,px+12,iy,pw-24,itemH-8,8,true,false);
    ctx.strokeStyle=canAfford?item.color+'88':'rgba(255,255,255,0.1)'; ctx.lineWidth=1;
    roundRect(ctx,px+12,iy,pw-24,itemH-8,8,false,true);
    // Key hint
    ctx.fillStyle=canAfford?item.color:'#555'; ctx.font=`bold ${Math.round(H*.022)}px Segoe UI`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(`[${i+1}]`, px+22, iy+itemH*.35);
    // Icon + name
    ctx.fillStyle=maxed?'#888':item.color;
    ctx.fillText(`${item.icon} ${item.name}`, px+58, iy+itemH*.35);
    // Level pips
    for (let l=0;l<item.maxLevel;l++) {
      ctx.fillStyle=l<lvl?item.color:'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.arc(px+pw-28-l*16,iy+itemH*.35,5,0,Math.PI*2); ctx.fill();
    }
    // Description
    ctx.fillStyle=maxed?'#555':'#aaa'; ctx.font=`${Math.round(H*.017)}px Segoe UI`;
    ctx.textAlign='left';
    ctx.fillText(maxed?'MAX LEVEL':item.desc(lvl), px+22, iy+itemH*.72);
    // Price
    if (!maxed) {
      ctx.fillStyle=canAfford?'#f5c518':'#c84444'; ctx.textAlign='right';
      ctx.fillText(`$${cost}`, px+pw-20, iy+itemH*.72);
    }
  });

  // Close hint
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font=`${Math.round(H*.016)}px Segoe UI`;
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('[E] Close', px+pw/2, py+ph-8);
  ctx.restore();
}
