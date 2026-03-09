
// ─── AMMO STATION ─────────────────────────────────────────────────────────────
const AMMO_POS = { cx:19.5, cy:10 };
const AMMO_RADIUS = 2.0;

function drawAmmoStation() {
  const px = AMMO_POS.cx*TW, py = AMMO_POS.cy*TH;
  const sz = Math.min(TW,TH)*.55, tt = performance.now()/1000;
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
  const sz=Math.min(TW,TH)*.58, tt=performance.now()/1000;
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
  try {
    const ac = new AudioContext();
    const master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    // Deep resonant bass thud
    const osc1 = ac.createOscillator(); const g1 = ac.createGain();
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(80, ac.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.5);
    g1.gain.setValueAtTime(1.2, ac.currentTime); g1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc1.connect(g1); g1.connect(master); osc1.start(); osc1.stop(ac.currentTime + 0.5);
    // Mid punch
    const osc2 = ac.createOscillator(); const g2 = ac.createGain();
    osc2.type = 'square'; osc2.frequency.setValueAtTime(220, ac.currentTime + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.35);
    g2.gain.setValueAtTime(0.6, ac.currentTime + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
    osc2.connect(g2); g2.connect(master); osc2.start(ac.currentTime + 0.05); osc2.stop(ac.currentTime + 0.45);
    // Bright metallic ping
    const osc3 = ac.createOscillator(); const g3 = ac.createGain();
    osc3.type = 'triangle'; osc3.frequency.setValueAtTime(1200, ac.currentTime + 0.1);
    osc3.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.8);
    g3.gain.setValueAtTime(0.4, ac.currentTime + 0.1); g3.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.9);
    osc3.connect(g3); g3.connect(master); osc3.start(ac.currentTime + 0.1); osc3.stop(ac.currentTime + 0.9);
    // Magical shimmer sweep
    const osc4 = ac.createOscillator(); const g4 = ac.createGain();
    osc4.type = 'sawtooth'; osc4.frequency.setValueAtTime(600, ac.currentTime + 0.15);
    osc4.frequency.exponentialRampToValueAtTime(2400, ac.currentTime + 0.6);
    g4.gain.setValueAtTime(0.2, ac.currentTime + 0.15); g4.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.7);
    osc4.connect(g4); g4.connect(master); osc4.start(ac.currentTime + 0.15); osc4.stop(ac.currentTime + 0.7);
    // Choir-like pad
    const osc5 = ac.createOscillator(); const g5 = ac.createGain();
    osc5.type = 'sine'; osc5.frequency.setValueAtTime(440, ac.currentTime + 0.2);
    osc5.frequency.setValueAtTime(880, ac.currentTime + 0.5);
    g5.gain.setValueAtTime(0, ac.currentTime + 0.2); g5.gain.linearRampToValueAtTime(0.35, ac.currentTime + 0.4);
    g5.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.2);
    osc5.connect(g5); g5.connect(master); osc5.start(ac.currentTime + 0.2); osc5.stop(ac.currentTime + 1.2);
    setTimeout(() => ac.close(), 1500);
  } catch(e) {}
}

function drawPapMachine() {
  const px = PAP_POS.cx * TW, py = PAP_POS.cy * TH;
  const sz = Math.min(TW,TH) * 0.6, tt = performance.now() / 1000;
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
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText('Already Packed!', px+1, py - sz*1.5+1);
      ctx.fillStyle = `hsl(${hue},100%,70%)`; ctx.fillText('Already Packed!', px, py - sz*1.5);
    }
    ctx.restore();
  }
}

// ─── PERK VENDOR ──────────────────────────────────────────────────────────────
function drawPerkVendor() {
  const px = PERK_VENDOR_POS.cx * TW, py = PERK_VENDOR_POS.cy * TH;
  const sz = Math.min(TW,TH) * 0.58, tt = performance.now() / 1000;
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
const BOX_SPIN_NAMES = ['SMG','Shotgun','Thundergun','Pistol','SMG','Thundergun','Shotgun'];

function tryOpenBox() {
  if (box.state!=='idle') return;
  if (player.money<BOX_COST) { box.notifWeapon='Need $'+BOX_COST; box.notifTimer=80; return; }
  player.money -= BOX_COST;
  box.state = 'spinning';
  box.spinTimer = SPIN_FRAMES;
  box.result = BOX_POOL[Math.floor(Math.random()*BOX_POOL.length)];
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
  const sz=Math.min(TW,TH)*.6, tt=performance.now()/1000;
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
