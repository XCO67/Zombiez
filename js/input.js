
// ─── INPUT ────────────────────────────────────────────────────────────────────
const keys = {};
const mouse = { x:0, y:0, down:false };
let clickTarget = null;    // {cx, cy} tile coords for right-click movement
let clickIndicator = null; // {x, y, life} screen pixel coords for visual feedback

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  // ESC toggles pause (single-player only)
  if (e.key === 'Escape' && !mp.active && gameStarted && (game.state === 'playing' || game.state === 'wave_clear' || game.state === 'paused')) {
    game.state = game.state === 'paused' ? game._prevState || 'playing' : (game._prevState = game.state, 'paused');
    shopOpen = false; perkShopOpen = false; weaponInfoOpen = false;
    return;
  }
  if (game.state === 'paused') return; // block all other keys while paused
  if (e.key.toLowerCase() === 'r' && game.state === 'game_over') {
    if (mp.active) { mp.socket.emit('restart_game'); } else { restartGame(); }
  }
  if (e.key.toLowerCase() === 'm' && game.state === 'game_over') goToMenu();
  if (e.key.toLowerCase() === 'q' && game.state === 'playing' && !shopOpen) swapWeapon();
  if (e.key.toLowerCase() === 'i' && gameStarted && (game.state === 'playing' || game.state === 'wave_clear'))
    weaponInfoOpen = !weaponInfoOpen;
  // WASD cancels click-to-move
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))
    clickTarget = null;
  // Shop, mystery box & door interaction
  if (e.key.toLowerCase() === 'e') {
    if (shopOpen) { shopOpen=false; return; }
    if (perkShopOpen) { perkShopOpen=false; return; }
    if (!player.dead && game.state==='playing') {
      const distShop=Math.hypot(player.cx-SHOP_POS.cx,player.cy-SHOP_POS.cy);
      const distBox =Math.hypot(player.cx-BOX_POS.cx, player.cy-BOX_POS.cy);
      if (distShop<SHOP_RADIUS) { shopOpen=true; return; }
      if (distBox<BOX_RADIUS)   { tryOpenBox(); return; }
      const distDev = Math.hypot(player.cx-DEV_CHEST_POS.cx, player.cy-DEV_CHEST_POS.cy);
      if (distDev<DEV_CHEST_RADIUS) {
        if (player.weaponKey!=='pistol') { player.secondaryAmmo=player.ammo; player.weaponKey='pistol'; player.ammo=Infinity; }
        player.secondaryKey='devgun'; player.secondaryAmmo=Infinity;
        return;
      }
      const distPap = Math.hypot(player.cx-PAP_POS.cx, player.cy-PAP_POS.cy);
      if (distPap < PAP_RADIUS) {
        const wk = player.weaponKey;
        if (!player.packedWeapons.has(wk)) {
          if (player.money < PAP_COST) return;
          player.money -= PAP_COST;
          player.packedWeapons.add(wk);
          playPapSound();
        }
        return;
      }
      const distPerk = Math.hypot(player.cx-PERK_VENDOR_POS.cx, player.cy-PERK_VENDOR_POS.cy);
      if (distPerk < PERK_VENDOR_RADIUS) { perkShopOpen=true; return; }
      const distAmmo = Math.hypot(player.cx-AMMO_POS.cx, player.cy-AMMO_POS.cy);
      if (distAmmo<AMMO_RADIUS && player.secondaryKey) {
        const sec = WEAPONS[player.secondaryKey];
        const curAmmo = player.weaponKey===player.secondaryKey ? player.ammo : player.secondaryAmmo;
        if (curAmmo < sec.ammoMax && player.money >= sec.ammoCost) {
          player.money -= sec.ammoCost;
          if (player.weaponKey===player.secondaryKey) player.ammo = sec.ammoMax;
          else player.secondaryAmmo = sec.ammoMax;
        }
        return;
      }
      // Check doors
      for (const door of DOORS) {
        if (door.unlocked) continue;
        const dist=Math.hypot(player.cx-door.cx, player.cy-door.cy);
        if (dist<3) {
          if (player.money>=door.cost) { player.money-=door.cost; unlockDoor(door); }
          return;
        }
      }
    }
  }
  // Buy items while shop open
  if (shopOpen) {
    const idx=parseInt(e.key)-1;
    if (idx>=0&&idx<SHOP_ITEMS.length) {
      const item=SHOP_ITEMS[idx];
      if (mp.active) {
        mp.socket.emit('buy_upgrade', { key: item.key }); // server applies & sends back in snapshot
      } else {
        const lvl=player.upgrades[item.key];
        if (lvl<item.maxLevel) {
          const cost=item.price(lvl);
          if (player.money>=cost) { player.money-=cost; player.upgrades[item.key]++; }
        }
      }
    }
  }
  if (perkShopOpen) {
    const idx=parseInt(e.key)-1;
    if (idx>=0&&idx<PERK_SHOP_ITEMS.length) {
      const item=PERK_SHOP_ITEMS[idx];
      const lvl=player.perks[item.key];
      if (lvl<item.maxLevel) {
        const cost=item.price(lvl);
        if (player.money>=cost) {
          player.money-=cost;
          player.perks[item.key]++;
          // Immediately apply shield max when buying shield
          if (item.key==='shield') player.shield=SHIELD_MAXHP[player.perks.shield];
        }
      }
    }
  }
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', e => {
  if (e.button===0) mouse.down=true;
  if (e.button===2) {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    // Convert screen → world
    const wx = mouse.x + camX, wy = mouse.y + camY;
    const tcx = wx / TW, tcy = wy / TH;
    const tc = tcx|0, tr = tcy|0;
    if (tr>=0&&tr<MAP_H&&tc>=0&&tc<MAP_W&&MAP[tr][tc]!==T.WALL&&MAP[tr][tc]!==T.PILLAR&&MAP[tr][tc]!==T.DOOR) {
      clickTarget = { cx: tcx, cy: tcy };
      clickIndicator = { wx, wy, life: 30 }; // world coords, drawn inside world transform
    }
  }
});
canvas.addEventListener('mouseup',   e => { if (e.button===0) mouse.down=false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  // scroll up = zoom in (fewer tiles), scroll down = zoom out (more tiles)
  VIEW_W = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, VIEW_W + (e.deltaY > 0 ? 2 : -2)));
  resize();
}, { passive: false });

function updatePlayer() {
  if (player.dead || player.downed) return;
  let dx=0, dy=0;

  // WASD input
  if (keys['w']||keys['arrowup'])    dy-=1;
  if (keys['s']||keys['arrowdown'])  dy+=1;
  if (keys['a']||keys['arrowleft'])  dx-=1;
  if (keys['d']||keys['arrowright']) dx+=1;

  // Click-to-move (only if no WASD pressed)
  if (dx===0&&dy===0&&clickTarget) {
    const cdx=clickTarget.cx-player.cx, cdy=clickTarget.cy-player.cy;
    const dist=Math.hypot(cdx,cdy);
    if (dist<0.12) {
      clickTarget=null; // reached destination
    } else {
      dx=cdx/dist; dy=cdy/dist;
    }
  } else if (dx&&dy) {
    dx*=.7071; dy*=.7071;
  }

  player.moving = dx!==0||dy!==0;
  // Apply move speed upgrade (capped at +50% = level 5)
  player.speed = PLAYER_SPEED * (1 + Math.min(player.upgrades.moveSpeed, 5) * 0.15);
  if (player.moving) {
    const nx=player.cx+dx*player.speed, ny=player.cy+dy*player.speed;
    if (!isBlocked(nx,player.cy)) player.cx=nx;
    if (!isBlocked(player.cx,ny)) player.cy=ny;
    player.ft+=1/60;
    if (player.ft>=.095){player.frame=(player.frame+1)%6;player.ft=0;}
  }
  player.facing = dir8((mouse.x+camX)-player.cx*TW, (mouse.y+camY)-player.cy*TH);
  if (player.hurtTimer>0) {
    player.hurtTimer--;
    player.regenTimer = 0;
    player.regenAccum = 0;
  } else if (player.upgrades.hpRegen > 0 && player.hp < player.maxHp) {
    player.regenTimer++;
    if (player.regenTimer >= 300) { // 5 seconds at 60fps
      const rates = [0, 2, 5, 8, 11, 15];
      player.regenAccum += rates[player.upgrades.hpRegen] / 60;
      if (player.regenAccum >= 1) {
        player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.regenAccum));
        player.regenAccum -= Math.floor(player.regenAccum);
      }
    }
  }
  // Shield recharge
  if (player.perks.shield > 0) {
    const sMax = SHIELD_MAXHP[player.perks.shield];
    if (player.shield < sMax) {
      if (player.shieldRechargeTimer > 0) {
        player.shieldRechargeTimer--;
      } else {
        player.shield = Math.min(sMax, player.shield + SHIELD_RATE[player.perks.shield] / 60);
      }
    }
  }
  // Pistol heat cooldown
  if (player.heat > 0) {
    // overheated: drain 100→0 in exactly 5s (300 frames); idle: faster passive bleed
    const coolRate = player.overheated ? 100 / 300 : 0.7;
    player.heat = Math.max(0, player.heat - coolRate);
    if (player.overheated && player.heat <= 0) {
      player.overheated = false;
      playCooledSound();
    }
  }
}

function drawPlayer() {
  const px=player.cx*TW, py=player.cy*TH, sz=TW*1.5;
  const img = player.moving ? charWalk[player.facing]?.[player.frame] : charIdle[player.facing];
  // Shadow
  ctx.save(); ctx.globalAlpha=0.45; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(px,py+sz*.44,sz*.28,sz*.1,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  // Sprite
  if (img&&img.complete&&img.naturalWidth) ctx.drawImage(img,px-sz/2,py-sz/2,sz,sz);
  // Hurt flash (red overlay)
  if (player.hurtTimer>0) {
    ctx.save(); ctx.globalAlpha=(player.hurtTimer/45)*0.45; ctx.fillStyle='#ff2020';
    ctx.beginPath(); ctx.arc(px,py,sz*.42,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}
