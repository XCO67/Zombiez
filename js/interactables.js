
// ─── AMMO STATION ─────────────────────────────────────────────────────────────
const AMMO_POS = { cx:19.5, cy:10 };
const AMMO_RADIUS = 2.0;

function drawAmmoStation() {
  const px = AMMO_POS.cx*TW, py = AMMO_POS.cy*TH;
  const sz = Math.min(TW,TH)*.55, tt = _tt;
  const pulse = Math.sin(tt*2.2)*.5+.5;

  // Outer glow (green-yellow ammo crate vibe)
  const g = ctx.createRadialGradient(px,py,0,px,py,sz*3.5);
  g.addColorStop(0,`rgba(80,200,80,${0.13+pulse*.1})`);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*3.5,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.shadowColor='#44cc44'; ctx.shadowBlur=10+pulse*6;

  // Crate body
  ctx.fillStyle='#1a2a0e'; roundRect(ctx,px-sz,py-sz*.65,sz*2,sz*1.3,sz*.12,true,false);
  ctx.fillStyle='#253a14'; roundRect(ctx,px-sz+3,py-sz*.65+3,sz*2-6,sz*1.3-6,sz*.1,true,false);

  // Yellow cross stripes
  ctx.fillStyle='rgba(200,200,30,0.55)';
  ctx.fillRect(px-sz*.12, py-sz*.62, sz*.24, sz*1.24);
  ctx.fillRect(px-sz*.97, py-sz*.1,  sz*1.94, sz*.2);

  // Bullet icons (three vertical rects)
  for(let b=-1;b<=1;b++){
    ctx.fillStyle=`rgba(220,200,80,${0.7+pulse*.3})`;
    ctx.fillRect(px+b*sz*.28-sz*.07, py-sz*.28, sz*.14, sz*.38);
    ctx.fillStyle='rgba(255,240,120,0.9)';
    ctx.beginPath();
    ctx.arc(px+b*sz*.28, py-sz*.28, sz*.07, Math.PI, 0);
    ctx.fill();
  }

  // AMMO label
  ctx.fillStyle=`rgba(180,255,130,${0.8+pulse*.2})`; ctx.font=`bold ${Math.round(TH*.28)}px Segoe UI`;
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillText('AMMO',px+1,py-sz*.8+1);
  ctx.fillStyle=`rgba(150,255,100,${0.8+pulse*.2})`; ctx.fillText('AMMO',px,py-sz*.8);
  ctx.restore();

  // [E] prompt when near
  const dist = Math.hypot(player.cx-AMMO_POS.cx, player.cy-AMMO_POS.cy);
  if (dist < AMMO_RADIUS && player.secondaryKey) {
    const sec = WEAPONS[player.secondaryKey];
    const curAmmo = player.weaponKey===player.secondaryKey ? player.ammo : player.secondaryAmmo;
    const full = curAmmo >= sec.ammoMax;
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.font=`${Math.round(TH*.26)}px Segoe UI`;
    const label = full ? `${sec.name} — FULL` : `[E] Refill ${sec.name}  $${sec.ammoCost}`;
    const col   = full ? '#888' : (player.money >= sec.ammoCost ? '#aaff88' : '#ff5555');
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillText(label,px+1,py-sz*1.4+1);
    ctx.fillStyle=col; ctx.fillText(label,px,py-sz*1.4);
    ctx.restore();
  }
}

// ─── DEV CHEST ────────────────────────────────────────────────────────────────
const DEV_CHEST_POS = { cx:19.5, cy:16 };  // centre of main floor
const DEV_CHEST_RADIUS = 2.0;

function drawDevChest() {
  const px=DEV_CHEST_POS.cx*TW, py=DEV_CHEST_POS.cy*TH;
  const sz=Math.min(TW,TH)*.58, tt=_tt;
  const pulse=Math.sin(tt*4)*.5+.5;
  const hue=Math.round(tt*60)%360;

  // Rainbow glow
  const g=ctx.createRadialGradient(px,py,0,px,py,sz*3);
  g.addColorStop(0,`hsla(${hue},100%,60%,${0.35+pulse*.2})`);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*3,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.shadowColor=`hsl(${hue},100%,65%)`; ctx.shadowBlur=14+pulse*8;

  // Chest body
  ctx.fillStyle='#1a0a2e'; roundRect(ctx,px-sz,py-sz*.7,sz*2,sz*1.4,sz*.12,true,false);
  ctx.fillStyle='#2a1048'; roundRect(ctx,px-sz+3,py-sz*.7+3,sz*2-6,sz*1.4-6,sz*.1,true,false);
  // Chest lid line
  ctx.strokeStyle=`hsl(${hue},100%,65%)`; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(px-sz,py-sz*.08); ctx.lineTo(px+sz,py-sz*.08); ctx.stroke();
  // Lock
  ctx.fillStyle=`hsl(${hue},100%,70%)`;
  ctx.beginPath(); ctx.arc(px,py-sz*.05,sz*.16,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#0a0020';
  ctx.beginPath(); ctx.arc(px,py-sz*.05,sz*.09,0,Math.PI*2); ctx.fill();

  // DEV label
  ctx.fillStyle=`hsl(${hue},100%,70%)`;
  ctx.font=`bold ${Math.round(TH*.28)}px Segoe UI`;
  ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.shadowBlur=0;
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillText('DEV',px+1,py-sz*.82+1);
  ctx.fillStyle=`hsl(${hue},100%,72%)`; ctx.fillText('DEV',px,py-sz*.82);
  ctx.restore();

  // [E] prompt
  const dist=Math.hypot(player.cx-DEV_CHEST_POS.cx,player.cy-DEV_CHEST_POS.cy);
  if(dist<DEV_CHEST_RADIUS){
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.font=`${Math.round(TH*.26)}px Segoe UI`;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillText('[E] Take DEV GUN',px+1,py-sz*1.4+1);
    ctx.fillStyle='#ff88ff'; ctx.fillText('[E] Take DEV GUN',px,py-sz*1.4);
    ctx.restore();
  }
}

// ─── PACK-A-PUNCH ─────────────────────────────────────────────────────────────
const PAP_POS = { cx:7, cy:13.5 };  // west side, symmetric to shop
const PAP_RADIUS = 2.0;
const PAP_COST = 2500;

function playPapSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Deep resonant bass thud
  const osc1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
  osc1.type = 'sine'; osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(30, now + 0.5);
  g1.gain.setValueAtTime(0.38, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc1.connect(g1); g1.connect(masterGain); osc1.start(now); osc1.stop(now + 0.5);
  // Mid punch
  const osc2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
  osc2.type = 'square'; osc2.frequency.setValueAtTime(220, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(60, now + 0.35);
  g2.gain.setValueAtTime(0.22, now + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc2.connect(g2); g2.connect(masterGain); osc2.start(now + 0.05); osc2.stop(now + 0.45);
  // Bright metallic ping
  const osc3 = audioCtx.createOscillator(); const g3 = audioCtx.createGain();
  osc3.type = 'triangle'; osc3.frequency.setValueAtTime(1200, now + 0.1);
  osc3.frequency.exponentialRampToValueAtTime(400, now + 0.8);
  g3.gain.setValueAtTime(0.18, now + 0.1); g3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc3.connect(g3); g3.connect(masterGain); osc3.start(now + 0.1); osc3.stop(now + 0.9);
  // Magical shimmer sweep
  const osc4 = audioCtx.createOscillator(); const g4 = audioCtx.createGain();
  osc4.type = 'sawtooth'; osc4.frequency.setValueAtTime(600, now + 0.15);
  osc4.frequency.exponentialRampToValueAtTime(2400, now + 0.6);
  g4.gain.setValueAtTime(0.10, now + 0.15); g4.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc4.connect(g4); g4.connect(masterGain); osc4.start(now + 0.15); osc4.stop(now + 0.7);
  // Choir-like pad
  const osc5 = audioCtx.createOscillator(); const g5 = audioCtx.createGain();
  osc5.type = 'sine'; osc5.frequency.setValueAtTime(440, now + 0.2);
  osc5.frequency.setValueAtTime(880, now + 0.5);
  g5.gain.setValueAtTime(0, now + 0.2); g5.gain.linearRampToValueAtTime(0.18, now + 0.4);
  g5.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc5.connect(g5); g5.connect(masterGain); osc5.start(now + 0.2); osc5.stop(now + 1.2);
}

function drawPapMachine() {
  const px = PAP_POS.cx * TW, py = PAP_POS.cy * TH;
  const sz = Math.min(TW,TH) * 0.6, tt = _tt;
  const pulse = Math.sin(tt * 2.5) * 0.5 + 0.5;
  const hue = (tt * 60) % 360; // rainbow cycle

  ctx.save();

  // Rainbow outer glow
  for (let ring = 2; ring >= 0; ring--) {
    const rh = (hue + ring * 40) % 360;
    const rr = sz * (1.6 + ring * 0.4 + pulse * 0.25);
    const rg = ctx.createRadialGradient(px, py, sz * 0.3, px, py, rr);
    rg.addColorStop(0, `hsla(${rh},100%,60%,${0.18 - ring * 0.04})`);
    rg.addColorStop(1, `hsla(${rh},100%,60%,0)`);
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
  }

  // Machine body — deep purple/black box
  const bw = sz * 1.1, bh = sz * 1.4, bx = px - bw / 2, by = py - bh / 2;
  ctx.fillStyle = '#1a0030';
  roundRect(ctx, bx, by, bw, bh, sz * 0.12, true, false);

  // Gold trim border
  ctx.strokeStyle = `hsl(${hue},100%,55%)`;
  ctx.lineWidth = 2.5;
  roundRect(ctx, bx + 1, by + 1, bw - 2, bh - 2, sz * 0.12, false, true);

  // Inner screen glow — animated rainbow
  const screenH = bh * 0.38, screenW = bw * 0.75;
  const sx2 = px - screenW / 2, sy2 = by + bh * 0.12;
  const scg = ctx.createLinearGradient(sx2, sy2, sx2 + screenW, sy2 + screenH);
  scg.addColorStop(0, `hsl(${hue},100%,45%)`);
  scg.addColorStop(0.5, `hsl(${(hue+120)%360},100%,55%)`);
  scg.addColorStop(1, `hsl(${(hue+240)%360},100%,45%)`);
  ctx.fillStyle = scg;
  ctx.globalAlpha = 0.7 + pulse * 0.25;
  roundRect(ctx, sx2, sy2, screenW, screenH, sz * 0.06, true, false);
  ctx.globalAlpha = 1;

  // "PaP" text on screen
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(sz * 0.38)}px Segoe UI`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = `hsl(${hue},100%,70%)`; ctx.shadowBlur = 8;
  ctx.fillText('PaP', px, sy2 + screenH * 0.5);
  ctx.shadowBlur = 0;

  // Bottom label
  ctx.font = `bold ${Math.round(sz * 0.2)}px Segoe UI`;
  ctx.fillStyle = `hsl(${hue},100%,70%)`;
  ctx.fillText('PACK-A-PUNCH', px, by + bh * 0.78);

  // Fist icon
  ctx.font = `${Math.round(sz * 0.32)}px serif`;
  ctx.fillText('✊', px, by + bh * 0.62);

  ctx.restore();

  // [E] prompt when near and has a secondary weapon to upgrade
  const dist = Math.hypot(player.cx - PAP_POS.cx, player.cy - PAP_POS.cy);
  if (dist < PAP_RADIUS) {
    const wk = player.weaponKey;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = `${Math.round(TH * 0.26)}px Segoe UI`;
    if (!player.packedWeapons.has(wk)) {
      const label = `[E] Pack ${WEAPONS[wk].name}  $${PAP_COST}`;
      const canAfford = player.money >= PAP_COST;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(label, px+1, py - sz * 1.5 + 1);
      ctx.fillStyle = canAfford ? `hsl(${hue},100%,72%)` : '#888'; ctx.fillText(label, px, py - sz * 1.5);
    } else if (!player.doublePapWeapons.has(wk) && wk !== 'thundergun') {
      const label = `[E] Pack II — Wall Bounce  $${PAP_COST}`;
      const canAfford = player.money >= PAP_COST;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(label, px+1, py - sz * 1.5 + 1);
      ctx.fillStyle = canAfford ? `hsl(${hue},100%,72%)` : '#888'; ctx.fillText(label, px, py - sz * 1.5);
    } else {
      const label = wk === 'thundergun' ? 'Thunder cannot ricochet!' : 'MAX — Double Packed!';
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(label, px+1, py - sz*1.5+1);
      ctx.fillStyle = `hsl(${hue},100%,70%)`; ctx.fillText(label, px, py - sz*1.5);
    }
    ctx.restore();
  }
}

// ─── RICOCHET VENDOR ──────────────────────────────────────────────────────────
const RICOCHET_POS    = { cx:26, cy:13.5 };
const RICOCHET_RADIUS = 2.0;
const RICOCHET_COST   = 10000;

function drawRicochetVendor() {
  const px = RICOCHET_POS.cx * TW, py = RICOCHET_POS.cy * TH;
  const sz = Math.min(TW,TH) * 0.58, tt = _tt;
  const pulse = Math.sin(tt * 3.0) * 0.5 + 0.5;

  ctx.save();

  // Outer glow — cyan/teal
  const gg = ctx.createRadialGradient(px,py,sz*.2,px,py,sz*2.6);
  gg.addColorStop(0, `rgba(0,240,220,${0.18+pulse*0.12})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(px,py,sz*2.6,0,Math.PI*2); ctx.fill();

  // Machine body
  ctx.fillStyle='#001a1a';
  roundRect(ctx, px-sz, py-sz*.7, sz*2, sz*1.4, sz*.12, true, false);
  ctx.strokeStyle=`rgba(0,220,210,${0.5+pulse*0.35})`; ctx.lineWidth=2;
  roundRect(ctx, px-sz, py-sz*.7, sz*2, sz*1.4, sz*.12, false, true);

  // Bouncing bullet animation
  const bangle = tt * 2.4;
  const bx = px + Math.cos(bangle) * sz * 0.42;
  const by = py - sz * 0.1 + Math.sin(bangle * 2) * sz * 0.22;
  const bg = ctx.createRadialGradient(bx,by,0,bx,by,sz*.22);
  bg.addColorStop(0,'rgba(180,255,255,1)');
  bg.addColorStop(0.5,`rgba(0,200,220,${0.8+pulse*0.2})`);
  bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(bx,by,sz*.22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(bx,by,sz*.06,0,Math.PI*2); ctx.fill();

  // Ricochet trail lines
  ctx.strokeStyle=`rgba(0,220,210,${0.4+pulse*0.3})`; ctx.lineWidth=1.5;
  ctx.setLineDash([3,4]);
  ctx.beginPath();
  ctx.moveTo(px-sz*.55, py-sz*.35); ctx.lineTo(px, py-sz*.08); ctx.lineTo(px+sz*.55, py-sz*.35);
  ctx.stroke(); ctx.setLineDash([]);

  // Label
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.font=`bold ${Math.round(sz*.21)}px Segoe UI`;
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillText('RICOCHET',px+1,py+sz*.55+1);
  ctx.fillStyle=`rgba(0,220,210,${0.85+pulse*0.15})`; ctx.fillText('RICOCHET',px,py+sz*.55);

  ctx.restore();

  // [E] prompt when near
  const dist = Math.hypot(player.cx-RICOCHET_POS.cx, player.cy-RICOCHET_POS.cy);
  if (dist < RICOCHET_RADIUS) {
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.font=`${Math.round(TH*.26)}px Segoe UI`;
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillText('[E] Pistol Upgrades',px+1,py-sz*1.35+1);
    ctx.fillStyle='#44ffee'; ctx.fillText('[E] Pistol Upgrades',px,py-sz*1.35);
    ctx.restore();
  }
}

// ─── PERK VENDOR ──────────────────────────────────────────────────────────────
function drawPerkVendor() {
  const px = PERK_VENDOR_POS.cx * TW, py = PERK_VENDOR_POS.cy * TH;
  const sz = Math.min(TW,TH) * 0.58, tt = _tt;
  const pulse = Math.sin(tt * 2.8) * 0.5 + 0.5;

  ctx.save();

  // Outer glow — soft teal/green
  const gg = ctx.createRadialGradient(px,py,sz*.2,px,py,sz*2.4);
  gg.addColorStop(0, `rgba(40,255,160,${0.15+pulse*0.1})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(px,py,sz*2.4,0,Math.PI*2); ctx.fill();

  // Body
  ctx.fillStyle='#071a12';
  roundRect(ctx, px-sz, py-sz*.7, sz*2, sz*1.4, sz*.12, true, false);
  ctx.strokeStyle=`rgba(40,220,130,${0.5+pulse*0.3})`; ctx.lineWidth=2;
  roundRect(ctx, px-sz, py-sz*.7, sz*2, sz*1.4, sz*.12, false, true);

  // Crystal orb in centre
  const og = ctx.createRadialGradient(px, py-sz*.08, sz*.05, px, py-sz*.08, sz*.38);
  og.addColorStop(0, 'rgba(200,255,230,1)');
  og.addColorStop(0.4, 'rgba(40,220,150,0.85)');
  og.addColorStop(1, 'rgba(0,80,40,0)');
  ctx.fillStyle=og; ctx.beginPath(); ctx.arc(px, py-sz*.08, sz*.38, 0, Math.PI*2); ctx.fill();

  // Inner sparkle
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(px-sz*.1, py-sz*.18, sz*.07, 0, Math.PI*2); ctx.fill();

  // Orbiting perk icons
  ['🧲','🛡','🩸'].forEach((icon, k) => {
    const a = tt * 0.9 + k * (Math.PI*2/3);
    const ix = px + Math.cos(a)*sz*.72, iy = py-sz*.08 + Math.sin(a)*sz*.38;
    ctx.font = `${Math.round(sz*.28)}px Segoe UI`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.globalAlpha = 0.75 + Math.sin(tt*2+k)*0.2;
    ctx.fillText(icon, ix, iy);
    ctx.globalAlpha = 1;
  });

  // Label
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.font=`bold ${Math.round(sz*.22)}px Segoe UI`;
  ctx.fillStyle=`rgba(60,255,160,${0.7+pulse*0.25})`;
  ctx.shadowColor='#20ff90'; ctx.shadowBlur=6;
  ctx.fillText('PERK SHOP', px, py+sz*.72);
  ctx.shadowBlur=0;

  ctx.restore();

  // [E] prompt
  const dist = Math.hypot(player.cx-PERK_VENDOR_POS.cx, player.cy-PERK_VENDOR_POS.cy);
  if (dist < PERK_VENDOR_RADIUS) {
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.font=`${Math.round(TH*.26)}px Segoe UI`;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillText('[E] Perk Shop', px+1, py-sz*.78+1);
    ctx.fillStyle='#44ffaa'; ctx.fillText('[E] Perk Shop', px, py-sz*.78);
    ctx.restore();
  }
}

// ─── MYSTERY BOX ──────────────────────────────────────────────────────────────
const BOX_POS = { cx:28.5, cy:13.5 };
const BOX_RADIUS = 2.0, BOX_COST = 500;
const box = { state:'idle', spinTimer:0, result:null, notifTimer:0, notifWeapon:'' };
const SPIN_FRAMES = 100; // how long the spin lasts
const BOX_SPIN_NAMES = ['SMG','Shotgun','Thundergun','Lasergun','Xenoblaster','Pistol','SMG','Thundergun','Shotgun','Xenoblaster'];

function tryOpenBox() {
  if (box.state!=='idle') return;
  if (player.money<BOX_COST) { box.notifWeapon='Need $'+BOX_COST; box.notifTimer=80; return; }
  player.money -= BOX_COST;
  box.state = 'spinning';
  box.spinTimer = SPIN_FRAMES;
  box.result = BOX_POOL[Math.floor(Math.random()*BOX_POOL.length)];
  playMysteryBoxSpinSound();
}

function updateBox() {
  if (box.state==='spinning') {
    box.spinTimer--;
    if (box.spinTimer<=0) {
      box.state = 'idle';
      // Box gives secondary slot — if currently holding old secondary, switch to pistol
      if (player.weaponKey !== 'pistol') {
        player.weaponKey = 'pistol';
        player.ammo = Infinity;
      }
      player.secondaryKey = box.result;
      player.secondaryAmmo = WEAPONS[box.result].ammoMax;
      box.notifWeapon = WEAPONS[box.result].name;
      box.notifTimer = 180;
      playMysteryBoxResultSound();
    }
  }
  if (box.notifTimer>0) box.notifTimer--;
}

// Visual effects pool
const effects = [];
function spawnEffect(type,x,y,extra) { effects.push({type,x,y,life:40,maxLife:40,...extra}); }
function updateEffects() {
  for(let i=effects.length-1;i>=0;i--){effects[i].life--;if(effects[i].life<=0)effects.splice(i,1);}
}
function drawEffects() {
  effects.forEach(e=>{
    const p=1-e.life/e.maxLife, a=e.life/e.maxLife;
    if(e.type==='explosion') {
      const p2=1-e.life/e.maxLife, a2=e.life/e.maxLife;
      const r=p2*e.radius*1.3;
      ctx.save();
      const g2=ctx.createRadialGradient(e.x,e.y,r*0.1,e.x,e.y,r);
      g2.addColorStop(0,`rgba(255,220,60,${a2*0.9})`);
      g2.addColorStop(0.45,`rgba(255,100,0,${a2*0.6})`);
      g2.addColorStop(1,'rgba(200,20,0,0)');
      ctx.fillStyle=g2;
      ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=`rgba(255,180,0,${a2*0.7})`;
      ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    if(e.type==='thunder') {
      // Legacy ring (unused now, kept for safety)
      const r1=p*TW*3.5, r2=p*TW*5;
      ctx.save(); ctx.globalAlpha=a*.85;
      const g=ctx.createRadialGradient(e.x,e.y,r1*.7,e.x,e.y,r2);
      g.addColorStop(0,'rgba(255,255,100,0)'); g.addColorStop(.3,'rgba(255,220,60,0.9)');
      g.addColorStop(.6,'rgba(255,140,0,0.4)'); g.addColorStop(1,'rgba(255,80,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(e.x,e.y,r2,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(e.type==='windwave') {
      // Expanding wind cone — drawn in world coords
      ctx.save();
      const maxR = e.range * TW;           // max radius in pixels
      const r    = p * maxR;               // current radius
      const halfAng = e.halfAng;           // cone half-angle
      const a1 = e.ang - halfAng, a2 = e.ang + halfAng;

      // Layered wind bands
      for(let band=0;band<4;band++){
        const br = r * (0.55 + band*0.15);
        const ba = a * (0.7 - band*0.14);
        ctx.globalAlpha = ba;
        const gr = ctx.createRadialGradient(e.x,e.y,br*.35,e.x,e.y,br);
        gr.addColorStop(0,'rgba(160,230,255,0.0)');
        gr.addColorStop(0.4,'rgba(120,210,255,0.55)');
        gr.addColorStop(0.75,'rgba(60,180,255,0.3)');
        gr.addColorStop(1,'rgba(20,140,220,0.0)');
        ctx.beginPath();
        ctx.moveTo(e.x,e.y);
        ctx.arc(e.x,e.y,br,a1,a2);
        ctx.closePath();
        ctx.fillStyle=gr; ctx.fill();
      }

      // Wind streak lines
      ctx.globalAlpha = a * 0.6;
      ctx.strokeStyle='rgba(200,240,255,0.7)';
      ctx.lineWidth=1.5;
      for(let k=0;k<8;k++){
        const la = a1 + (a2-a1)*(k+0.5)/8 + Math.sin(p*12+k)*0.08;
        const len = r*(0.5 + 0.5*Math.sin(p*5+k*1.3));
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(la)*r*0.15, e.y + Math.sin(la)*r*0.15);
        ctx.lineTo(e.x + Math.cos(la)*len,     e.y + Math.sin(la)*len);
        ctx.stroke();
      }

      // Leading edge arc
      ctx.globalAlpha = a * 0.5;
      ctx.strokeStyle='rgba(180,230,255,0.9)';
      ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(e.x,e.y,r,a1,a2); ctx.stroke();

      ctx.restore();
    }
  });
}

function drawMysteryBox() {
  const px=BOX_POS.cx*TW, py=BOX_POS.cy*TH;
  const sz=Math.min(TW,TH)*.6, tt=_tt;
  const pulse=Math.sin(tt*3)*.5+.5;
  const spin=(box.state==='spinning');

  // Outer glow (question mark purple when idle, gold when spinning)
  const glowColor=spin?`rgba(255,200,30,${0.2+pulse*.15})`:`rgba(155,50,255,${0.15+pulse*.12})`;
  const g=ctx.createRadialGradient(px,py,0,px,py,sz*4);
  g.addColorStop(0,glowColor); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*4,0,Math.PI*2); ctx.fill();

  // Box body
  ctx.save();
  ctx.shadowColor=spin?'#ffd700':'#aa44ff'; ctx.shadowBlur=14+pulse*8;
  // Dark wood box
  ctx.fillStyle='#2a1a08'; roundRect(ctx,px-sz,py-sz*.7,sz*2,sz*1.4,sz*.15,true,false);
  ctx.fillStyle='#3d2510'; roundRect(ctx,px-sz+3,py-sz*.7+3,sz*2-6,sz*1.4-6,sz*.12,true,false);
  // Question mark lid stripe + corner bolts
  ctx.fillStyle=spin?'rgba(255,200,30,0.6)':'rgba(155,50,255,0.5)';
  roundRect(ctx,px-sz,py-sz*.08,sz*2,sz*.18,4,true,false);
  [[-.75,-.55],[.75,-.55],[-.75,.6],[.75,.6]].forEach(([ox,oy])=>{
    ctx.fillStyle='#f5c518'; ctx.beginPath();
    ctx.arc(px+ox*sz,py+oy*sz,sz*.1,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();

  // Floating label above box
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  const labelY=py-sz*.85-Math.sin(tt*2)*TH*.06;
  if (spin) {
    // Cycle through weapon names
    const nameIdx=Math.floor((1-box.spinTimer/SPIN_FRAMES)*BOX_SPIN_NAMES.length);
    const displayName=BOX_SPIN_NAMES[nameIdx%BOX_SPIN_NAMES.length];
    ctx.font=`bold ${Math.round(TH*.32)}px Segoe UI`;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(displayName,px+1,labelY+1);
    ctx.fillStyle='#ffd700'; ctx.fillText(displayName,px,labelY);
  } else {
    ctx.font=`bold ${Math.round(TH*.35)}px Segoe UI`;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText('?',px+1,labelY+1);
    ctx.fillStyle=`rgba(180,80,255,${0.7+pulse*.3})`; ctx.fillText('?',px,labelY);
  }
  ctx.restore();

  // Cost label
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.font=`${Math.round(TH*.22)}px Segoe UI`;
  const dist=Math.hypot(player.cx-BOX_POS.cx,player.cy-BOX_POS.cy);
  if (dist<BOX_RADIUS&&!spin) {
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillText(`[E]  $${BOX_COST}`,px+1,py+sz*.78+1);
    ctx.fillStyle='#f5c518'; ctx.fillText(`[E]  $${BOX_COST}`,px,py+sz*.78);
  }
  ctx.restore();

  // Got weapon notification
  if (box.notifTimer>0) {
    const na=Math.min(1,box.notifTimer/30)*Math.min(1,(box.notifTimer>20?1:(box.notifTimer/20)));
    ctx.save(); ctx.globalAlpha=na;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`bold ${Math.round(TH*.45)}px Segoe UI`;
    const ny=py-sz*1.8-Math.sin((1-box.notifTimer/140)*Math.PI)*TH*.5;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillText('Got: '+box.notifWeapon,px+2,ny+2);
    ctx.fillStyle='#ffd700'; ctx.fillText('Got: '+box.notifWeapon,px,ny);
    ctx.restore();
  }
}

// ─── PISTOL UPGRADE VENDOR ────────────────────────────────────────────────────
function drawPistolVendor() {
  const px = PISTOL_VENDOR_POS.cx * TW, py = PISTOL_VENDOR_POS.cy * TH;
  const sz = Math.min(TW, TH) * 0.56, tt = _tt;
  const pulse = Math.sin(tt * 2.6) * 0.5 + 0.5;
  const hue = 200; // fixed steel-blue theme

  ctx.save();

  // Outer glow
  const gg = ctx.createRadialGradient(px, py, sz * 0.2, px, py, sz * 2.6);
  gg.addColorStop(0, `rgba(60,160,255,${0.18 + pulse * 0.12})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, sz * 2.6, 0, Math.PI * 2); ctx.fill();

  // Body — dark steel box
  ctx.shadowColor = '#3399ff'; ctx.shadowBlur = 10 + pulse * 6;
  ctx.fillStyle = '#0a1622';
  roundRect(ctx, px - sz, py - sz * 0.7, sz * 2, sz * 1.4, sz * 0.12, true, false);
  ctx.strokeStyle = `rgba(60,160,255,${0.5 + pulse * 0.3})`; ctx.lineWidth = 2;
  roundRect(ctx, px - sz, py - sz * 0.7, sz * 2, sz * 1.4, sz * 0.12, false, true);

  // Bullet icons (3 vertical lines showing spread levels)
  const spread = player.pistolSpread;
  const bulletOffsets = [-sz * 0.32, 0, sz * 0.32];
  bulletOffsets.forEach((ox, k) => {
    const unlocked = k < spread + 1;
    ctx.fillStyle = unlocked ? `rgba(80,180,255,${0.7 + pulse * 0.25})` : 'rgba(50,80,110,0.5)';
    ctx.beginPath();
    ctx.ellipse(px + ox, py - sz * 0.08, sz * 0.085, sz * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    if (unlocked) {
      ctx.fillStyle = 'rgba(200,230,255,0.9)';
      ctx.beginPath();
      ctx.arc(px + ox, py - sz * 0.22, sz * 0.05, Math.PI, 0);
      ctx.fill();
    }
  });

  // Label
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `bold ${Math.round(sz * 0.22)}px Segoe UI`;
  ctx.fillStyle = `rgba(80,180,255,${0.7 + pulse * 0.25})`;
  ctx.fillText('GUN UPGRADE', px, py + sz * 0.72);

  // Spread level indicator below label
  ctx.font = `${Math.round(sz * 0.18)}px Segoe UI`;
  ctx.fillStyle = 'rgba(150,200,255,0.6)';
  const lvlLabel = spread >= 2 ? 'MAXED' : `Spread Lv.${spread}`;
  ctx.fillText(lvlLabel, px, py + sz * 0.96);

  ctx.restore();

  // [E] prompt when near
  const dist = Math.hypot(player.cx - PISTOL_VENDOR_POS.cx, player.cy - PISTOL_VENDOR_POS.cy);
  if (dist < PISTOL_VENDOR_RADIUS) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = `${Math.round(TH * 0.26)}px Segoe UI`;
    let label, col;
    if (player.pistolSpread >= 2) {
      label = 'Spread MAXED!'; col = '#888';
    } else if (player.spreadOrbs <= 0) {
      label = 'Need Pistol Orb  (from Eye Demon)'; col = '#ff8844';
    } else if (player.money < PISTOL_UPGRADE_COST) {
      label = `[E] Upgrade  $${PISTOL_UPGRADE_COST}  — need more gold`; col = '#ff5555';
    } else {
      label = `[E] Upgrade Spread  $${PISTOL_UPGRADE_COST}  (${player.spreadOrbs} orb${player.spreadOrbs>1?'s':''})`; col = '#80c8ff';
    }
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(label, px + 1, py - sz * 1.0 + 1);
    ctx.fillStyle = col; ctx.fillText(label, px, py - sz * 1.0);
    ctx.restore();
  }
}

// ─── GOLD BUTTONS (Dev Testing) ───────────────────────────────────────────────
function drawGoldButtons() {
  const tt = _tt;
  GOLD_BUTTONS.forEach(g => {
    const px = g.cx * TW, py = g.cy * TH;
    const sz = Math.min(TW,TH) * 0.46;
    const pulse = Math.sin(tt * 3.5) * 0.5 + 0.5;

    // Glow
    const gg = ctx.createRadialGradient(px,py,0,px,py,sz*3.2);
    gg.addColorStop(0, `rgba(255,200,0,${0.22+pulse*0.14})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(px,py,sz*3.2,0,Math.PI*2); ctx.fill();

    ctx.save();
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=10+pulse*10;

    // Body
    ctx.fillStyle='#1a1200';
    roundRect(ctx, px-sz, py-sz*.75, sz*2, sz*1.5, sz*.22, true, false);
    ctx.strokeStyle=`rgba(255,200,0,${0.7+pulse*0.3})`; ctx.lineWidth=2;
    roundRect(ctx, px-sz, py-sz*.75, sz*2, sz*1.5, sz*.22, false, true);

    // $ icon
    ctx.font = `bold ${Math.round(sz*1.0)}px Segoe UI`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowBlur=0;
    ctx.fillStyle=`rgba(255,215,0,${0.9+pulse*0.1})`;
    ctx.fillText('$', px, py);

    // Label
    ctx.font = `bold ${Math.round(sz*.32)}px Segoe UI`;
    ctx.textBaseline='top';
    ctx.fillStyle=`rgba(255,200,0,${0.7+pulse*0.2})`;
    ctx.fillText('DEV GOLD', px, py+sz*.78);

    ctx.restore();

    // [E] prompt when near
    const dist = Math.hypot(player.cx-g.cx, player.cy-g.cy);
    if (dist < 2.0) {
      ctx.save(); ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.font=`${Math.round(TH*.26)}px Segoe UI`;
      ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillText('[E] +$99,999,999',px+1,py-sz*1.8+1);
      ctx.fillStyle='#ffd700'; ctx.fillText('[E] +$99,999,999',px,py-sz*1.8);
      ctx.restore();
    }
  });
}

// ─── MERCENARY VENDOR ─────────────────────────────────────────────────────────
const MERC_CHEST_POS    = { cx: 13, cy: 18 }; // overridden by editor placement
const MERC_CHEST_RADIUS = 2.0;

function drawMercenaryVendor() {
  const px = MERC_CHEST_POS.cx * TW, py = MERC_CHEST_POS.cy * TH;
  const sz = Math.min(TW, TH) * 0.58, tt = _tt;
  const pulse = Math.sin(tt * 2.2) * 0.5 + 0.5;

  // Outer glow — golden military theme
  const gg = ctx.createRadialGradient(px, py, sz * 0.2, px, py, sz * 2.8);
  gg.addColorStop(0, `rgba(255,160,40,${0.20 + pulse * 0.12})`);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, sz * 2.8, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.shadowColor = '#cc8820'; ctx.shadowBlur = 12 + pulse * 8;

  // Body
  ctx.fillStyle = '#1a1000';
  roundRect(ctx, px - sz, py - sz * 0.7, sz * 2, sz * 1.4, sz * 0.12, true, false);
  ctx.strokeStyle = `rgba(220,150,40,${0.55 + pulse * 0.35})`; ctx.lineWidth = 2;
  roundRect(ctx, px - sz, py - sz * 0.7, sz * 2, sz * 1.4, sz * 0.12, false, true);

  // Knight icon
  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(sz * 0.9)}px Segoe UI`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⚔', px, py - sz * 0.06);

  // Label
  ctx.font = `bold ${Math.round(sz * 0.22)}px Segoe UI`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgba(255,180,60,${0.75 + pulse * 0.2})`;
  ctx.fillText('MERCENARY', px, py + sz * 0.72);

  ctx.restore();

  // [E] prompt when near
  const dist = Math.hypot(player.cx - MERC_CHEST_POS.cx, player.cy - MERC_CHEST_POS.cy);
  if (dist < MERC_CHEST_RADIUS) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = `${Math.round(TH * 0.26)}px Segoe UI`;
    let label, col;
    if (mercenary.active) {
      label = '[E] Upgrade Familiar'; col = '#44ddff';
    } else if (player.money >= MERC_COST) {
      label = `[E] Hire Mercenary  $${MERC_COST}`; col = '#ffcc44';
    } else {
      label = `[E] Hire Mercenary  $${MERC_COST}  — need more gold`; col = '#ff5555';
    }
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(label, px + 1, py - sz * 1.35 + 1);
    ctx.fillStyle = col; ctx.fillText(label, px, py - sz * 1.35);
    ctx.restore();
  }
}

// ─── MERCENARY UPGRADE PANEL ──────────────────────────────────────────────────
let mercUpgradeOpen = false;

function drawMercUpgradePanel() {
  if (!mercUpgradeOpen || !mercenary.active) return;

  const W = canvas.width, H = canvas.height;
  // Pixel-art panel: dimensions snap to integer pixels, NO rounded corners
  const panW = Math.round(W * 0.42);
  const panH = Math.round(H * 0.56);
  const panX = Math.round((W - panW) / 2);
  const panY = Math.round((H - panH) / 2);
  const px1 = Math.round(Math.max(1, W * 0.0014)); // 1-2 px border

  ctx.save();
  ctx.imageSmoothingEnabled = false; // crisp pixel rendering

  // ── Dim backdrop ──────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, H);

  // ── Panel shadow (offset solid rect) ─────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(panX + px1*4, panY + px1*4, panW, panH);

  // ── Panel body ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0b0818';
  ctx.fillRect(panX, panY, panW, panH);

  // ── Outer border: double-pixel teal ───────────────────────────────────────
  ctx.fillStyle = '#00ccdd';
  ctx.fillRect(panX,            panY,            panW, px1*2); // top
  ctx.fillRect(panX,            panY+panH-px1*2, panW, px1*2); // bottom
  ctx.fillRect(panX,            panY,            px1*2, panH); // left
  ctx.fillRect(panX+panW-px1*2, panY,            px1*2, panH); // right

  // ── Inner border: 1px dark inset ─────────────────────────────────────────
  ctx.fillStyle = '#003344';
  ctx.fillRect(panX+px1*2,          panY+px1*2,          panW-px1*4, px1);
  ctx.fillRect(panX+px1*2,          panY+panH-px1*3,     panW-px1*4, px1);
  ctx.fillRect(panX+px1*2,          panY+px1*2,          px1, panH-px1*4);
  ctx.fillRect(panX+panW-px1*3,     panY+px1*2,          px1, panH-px1*4);

  // ── Header strip ──────────────────────────────────────────────────────────
  const hdrH = Math.round(panH * 0.17);
  ctx.fillStyle = '#0d1a22';
  ctx.fillRect(panX+px1*2, panY+px1*2, panW-px1*4, hdrH);
  // header bottom divider: 2px teal + 1px dark
  ctx.fillStyle = '#00ccdd';
  ctx.fillRect(panX+px1*2, panY+px1*2+hdrH, panW-px1*4, px1*2);
  ctx.fillStyle = '#003344';
  ctx.fillRect(panX+px1*2, panY+px1*2+hdrH+px1*2, panW-px1*4, px1);

  // ── Mini pixel familiar in header (12×12 pixel art, 3px per pixel) ───────
  const sprSz = Math.round(panH * 0.026); // size of one "pixel" in the sprite
  const sprX  = Math.round(panX + panW * 0.09);
  const sprY  = Math.round(panY + px1*2 + hdrH/2);
  function SP(gx, gy, col) {
    ctx.fillStyle = col;
    ctx.fillRect(sprX + gx*sprSz, sprY + gy*sprSz, sprSz, sprSz);
  }
  // horns
  SP(-1,-4,'#aa30cc'); SP(1,-4,'#aa30cc');
  // head
  SP(-1,-3,'#eda0ff'); SP(0,-3,'#f0b0ff'); SP(1,-3,'#eda0ff');
  // eyes
  SP(-1,-2,'#f0b0ff'); SP(0,-2,'#f0b0ff'); SP(1,-2,'#f0b0ff');
  SP(-1,-2,'#1a001a'); SP(1,-2,'#1a001a');
  // body
  SP(-1,-1,'#c060ee'); SP(0,-1,'#ffc0ff'); SP(1,-1,'#c060ee');
  SP(-1, 0,'#9030cc'); SP(0, 0,'#9030cc'); SP(1, 0,'#9030cc');
  // tail
  SP(2,0,'#7020aa'); SP(3,0,'#9030cc');

  // ── Title text ────────────────────────────────────────────────────────────
  const titleSz = Math.round(hdrH * 0.38);
  ctx.font = `900 ${titleSz}px "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // shadow
  ctx.fillStyle = '#001122';
  ctx.fillText('FAMILIAR UPGRADES', panX + panW/2 + px1, panY + px1*2 + hdrH/2 + px1);
  // main
  ctx.fillStyle = '#00eeff';
  ctx.fillText('FAMILIAR UPGRADES', panX + panW/2, panY + px1*2 + hdrH/2);

  // ── Upgrade rows ──────────────────────────────────────────────────────────
  const upgKeys  = ['dmg', 'rate', 'range', 'hp'];
  const upgIcons = ['⚔', '⚡', '◎', '❤'];
  const upgNames = ['DAMAGE', 'FIRE RATE', 'RANGE', 'HP'];
  const upgDescs = [
    MERC_DMG_MULTS.map(m => `${Math.round(MERC_BASE_DMG * m)} DMG`),
    MERC_RATES.map(r  => `${r} FR`),
    MERC_RANGES.map(r => `${r} TILES`),
    MERC_MAX_HPS.map(h => `${h} HP`),
  ];

  const rowsTop  = panY + px1*2 + hdrH + px1*3 + Math.round(panH * 0.022);
  const rowGap   = Math.round(panH * 0.018);
  const rowH     = Math.round((panH - (rowsTop - panY) - Math.round(panH*0.1)) / 4 - rowGap);
  const rowFont  = Math.round(rowH * 0.34);

  upgKeys.forEach((key, idx) => {
    const level    = mercenary.upgrades[key];
    const maxLevel = MERC_UPG_COSTS[key].length;
    const ry  = rowsTop + idx * (rowH + rowGap);
    const rx  = panX + Math.round(panW * 0.04);
    const rw  = panW - Math.round(panW * 0.08);
    const isMax = level >= maxLevel;

    // Row bg — darker stripe, pixel-sharp
    ctx.fillStyle = idx % 2 === 0 ? '#0f1a24' : '#0a1520';
    ctx.fillRect(rx, ry, rw, rowH);

    // Left accent bar (teal if any levels bought, dark otherwise)
    ctx.fillStyle = level > 0 ? '#00bbcc' : '#224455';
    ctx.fillRect(rx, ry, px1*2, rowH);

    // Key hint box
    const khW = Math.round(rowH * 0.82), khH = rowH - px1*2;
    const khX = rx + px1*3;
    const khY = ry + px1;
    ctx.fillStyle = '#0d2233';
    ctx.fillRect(khX, khY, khW, khH);
    ctx.fillStyle = '#00aacc';
    ctx.fillRect(khX, khY, khW, px1);
    ctx.fillRect(khX, khY+khH-px1, khW, px1);
    ctx.fillRect(khX, khY, px1, khH);
    ctx.fillRect(khX+khW-px1, khY, px1, khH);
    ctx.font = `900 ${Math.round(khH * 0.6)}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#44ddff';
    ctx.fillText(`${idx+1}`, khX + khW/2, khY + khH/2);

    // Icon + name
    const nameX = khX + khW + Math.round(rw * 0.04);
    ctx.font = `900 ${rowFont}px "Courier New", monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#cceeff';
    ctx.fillText(`${upgIcons[idx]} ${upgNames[idx]}`, nameX, ry + rowH/2);

    // Level pips (pixel-art squares)
    const pipSz  = Math.round(rowH * 0.24);
    const pipGap = Math.round(pipSz * 0.45);
    const pipsW  = 4 * pipSz + 3 * pipGap;
    const pipX0  = rx + rw * 0.52 - pipsW / 2;
    const pipY0  = ry + (rowH - pipSz) / 2;
    for (let p = 0; p < 4; p++) {
      const filled = p < level;
      const px0 = Math.round(pipX0 + p * (pipSz + pipGap));
      // pip border
      ctx.fillStyle = filled ? '#009988' : '#223344';
      ctx.fillRect(px0, Math.round(pipY0), pipSz, pipSz);
      // pip fill (inset 1px)
      ctx.fillStyle = filled ? '#00eebb' : '#0d1e28';
      ctx.fillRect(px0+px1, Math.round(pipY0)+px1, pipSz-px1*2, pipSz-px1*2);
    }

    // Current stat value
    const statX = rx + rw * 0.72;
    ctx.font = `bold ${Math.round(rowFont * 0.85)}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#55ffdd';
    ctx.fillText(upgDescs[idx][level], statX, ry + rowH/2);

    // Cost / MAX
    const costX = rx + rw - px1*4;
    if (isMax) {
      ctx.font = `900 ${Math.round(rowFont * 0.8)}px "Courier New", monospace`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#44ff88';
      ctx.fillText('MAX', costX, ry + rowH/2);
    } else {
      const cost      = MERC_UPG_COSTS[key][level];
      const canAfford = player.money >= cost;
      // coin icon square
      const coinSz = Math.round(rowH * 0.28);
      const coinX  = Math.round(costX - coinSz);
      const coinY  = Math.round(ry + (rowH - coinSz) / 2);
      ctx.fillStyle = canAfford ? '#997700' : '#553333';
      ctx.fillRect(coinX - coinSz - px1*2, coinY, coinSz, coinSz);
      ctx.fillStyle = canAfford ? '#ffdd00' : '#aa5555';
      ctx.fillRect(coinX - coinSz - px1*2 + px1, coinY + px1, coinSz - px1*2, coinSz - px1*2);
      // price text
      ctx.font = `900 ${Math.round(rowFont * 0.82)}px "Courier New", monospace`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = canAfford ? '#ffd700' : '#cc4444';
      ctx.fillText(`$${cost}`, coinX - coinSz - px1*4, ry + rowH/2);
    }

    // Bottom separator (1px dark line)
    ctx.fillStyle = '#112233';
    ctx.fillRect(rx, ry + rowH, rw, px1);
  });

  // ── Footer close hint ─────────────────────────────────────────────────────
  const footY = panY + panH - Math.round(panH * 0.075);
  ctx.fillStyle = '#071018';
  ctx.fillRect(panX+px1*2, footY, panW-px1*4, panY+panH-px1*2-footY);
  ctx.fillStyle = '#003344';
  ctx.fillRect(panX+px1*2, footY, panW-px1*4, px1*2);
  ctx.font = `bold ${Math.round(panH * 0.038)}px "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,200,220,0.55)';
  ctx.fillText('[E] CLOSE', panX + panW/2, footY + (panY+panH-px1*2-footY)/2);

  ctx.restore();
}
