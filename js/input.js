
// ─── KEYBINDS ─────────────────────────────────────────────────────────────────
// Defaults — stored as e.key.toLowerCase() values (' ' = Space)
const DEFAULT_KEYBINDS = {
  dash:       ' ',
  fireRing:   '4',
  barrier:    '5',
  speedBoost: '6',
  swapWeapon: 'q',
  interact:   'e',
  infoCard:   'i',
};
let KEYBINDS = { ...DEFAULT_KEYBINDS };
(function loadKeybinds() {
  try { Object.assign(KEYBINDS, JSON.parse(localStorage.getItem('deadsurge_keybinds') || '{}')); } catch {}
})();
function saveKeybinds() { localStorage.setItem('deadsurge_keybinds', JSON.stringify(KEYBINDS)); }

// ─── DASH CONSTANTS ───────────────────────────────────────────────────────────
const DASH_COOLDOWN = 360; // 6 s at 60 fps
const DASH_FRAMES   = 10;  // burst duration frames
const DASH_SPEED    = 0.24; // tiles per frame during dash
const FACING_VEC = {
  'east':       [ 1,      0     ],
  'south-east': [ 0.7071, 0.7071],
  'south':      [ 0,      1     ],
  'south-west': [-0.7071, 0.7071],
  'west':       [-1,      0     ],
  'north-west': [-0.7071,-0.7071],
  'north':      [ 0,     -1     ],
  'north-east': [ 0.7071,-0.7071],
};

// ─── INPUT ────────────────────────────────────────────────────────────────────
const keys = {};
const mouse = { x:0, y:0, down:false };
let clickTarget = null;    // {cx, cy} tile coords for right-click movement
let clickIndicator = null; // {x, y, life} screen pixel coords for visual feedback

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  // ESC: pause + open pause menu (single-player only)
  if (e.key === 'Escape' && gameStarted) {
    if (game.state === 'playing' || game.state === 'wave_clear') {
      game._prevState = game.state;
      game.state = 'paused';
      shopOpen = false; perkShopOpen = false; pistolUpgradeOpen = false; weaponInfoOpen = false; mercUpgradeOpen = false;
      openPauseMenu();
      return;
    }
    if (game.state === 'paused') { resumeFromPause(); return; }
  }
  if (game.state === 'paused') return; // block all other keys while paused
  if (e.key.toLowerCase() === 'r' && game.state === 'game_over') {
    restartGame();
  }
  if (e.key.toLowerCase() === 'm' && game.state === 'game_over') goToMenu();
  if (e.key.toLowerCase() === KEYBINDS.swapWeapon && game.state === 'playing' && !shopOpen) swapWeapon();
  if (e.key.toLowerCase() === KEYBINDS.infoCard && gameStarted && (game.state === 'playing' || game.state === 'wave_clear'))
    weaponInfoOpen = !weaponInfoOpen;
  // Dash ability
  if (e.key.toLowerCase() === KEYBINDS.dash && game.state === 'playing' && !player.dead && !player.downed
      && player.dashCooldown <= 0 && player.dashTimer <= 0) {
    player.dashTimer    = DASH_FRAMES;
    player.dashCooldown = DASH_COOLDOWN;
    player.dashTrail    = [];
  }
  // Fire Ring ability
  if (e.key.toLowerCase() === KEYBINDS.fireRing && game.state === 'playing' && !player.dead && !player.downed
      && player.fireCooldown <= 0 && player.fireRingTimer <= 0) {
    player.fireRingTimer = FIRE_RING_DURATION;
    player.fireCooldown  = FIRE_RING_COOLDOWN;
    player.fireRingAngle = 0;
  }
  // Barrier ability
  if (e.key.toLowerCase() === KEYBINDS.barrier && game.state === 'playing' && !player.dead && !player.downed
      && player.barrierCooldown <= 0 && player.barrierTimer <= 0) {
    player.barrierTimer    = BARRIER_DURATION;
    player.barrierCooldown = BARRIER_COOLDOWN;
  }
  // Speed Boost ability
  if (e.key.toLowerCase() === KEYBINDS.speedBoost && game.state === 'playing' && !player.dead && !player.downed
      && player.speedBoostCooldown <= 0 && player.speedBoostTimer <= 0) {
    player.speedBoostTimer    = SPEED_BOOST_DURATION;
    player.speedBoostCooldown = SPEED_BOOST_COOLDOWN;
  }
  // WASD cancels click-to-move
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))
    clickTarget = null;
  // Shop, mystery box & door interaction
  if (e.key.toLowerCase() === KEYBINDS.interact) {
    if (shopOpen) { shopOpen=false; return; }
    if (perkShopOpen) { perkShopOpen=false; return; }
    if (pistolUpgradeOpen) {
      // If upgrade is possible, buy it; always close the panel
      if (player.spreadOrbs > 0 && player.pistolSpread < 2 && player.money >= PISTOL_UPGRADE_COST) {
        player.money -= PISTOL_UPGRADE_COST;
        player.spreadOrbs--;
        player.pistolSpread++;
        playPapSound();
      }
      pistolUpgradeOpen = false;
      return;
    }
    if (!player.dead && (game.state==='playing' || game.state==='wave_clear')) {
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
          // First PAP — 3× damage
          if (player.money < PAP_COST) return;
          player.money -= PAP_COST;
          player.packedWeapons.add(wk);
          playPapSound();
        } else if (!player.doublePapWeapons.has(wk) && wk !== 'thundergun') {
          // Second PAP — adds wall bounce (thundergun excluded, it's a wave)
          if (player.money < PAP_COST) return;
          player.money -= PAP_COST;
          player.doublePapWeapons.add(wk);
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
      // Gold buttons (dev testing — infinite money)
      for (let gi = GOLD_BUTTONS.length - 1; gi >= 0; gi--) {
        const g = GOLD_BUTTONS[gi];
        if (Math.hypot(player.cx-g.cx, player.cy-g.cy) < 2.0) {
          player.money += 99999999;
          GOLD_BUTTONS.splice(gi, 1);
          return;
        }
      }
      // Ricochet Vendor — opens Pistol Upgrade panel
      const distRico = Math.hypot(player.cx-RICOCHET_POS.cx, player.cy-RICOCHET_POS.cy);
      if (distRico < RICOCHET_RADIUS) {
        pistolUpgradeOpen = true;
        return;
      }
      // Pistol Upgrade Vendor — spend an orb + gold to unlock spread
      const distPU = Math.hypot(player.cx - PISTOL_VENDOR_POS.cx, player.cy - PISTOL_VENDOR_POS.cy);
      if (distPU < PISTOL_VENDOR_RADIUS) {
        if (player.spreadOrbs > 0 && player.pistolSpread < 2 && player.money >= PISTOL_UPGRADE_COST) {
          player.money -= PISTOL_UPGRADE_COST;
          player.spreadOrbs--;
          player.pistolSpread++;
        }
        return;
      }
      // Mercenary chest
      const distMerc = Math.hypot(player.cx - MERC_CHEST_POS.cx, player.cy - MERC_CHEST_POS.cy);
      if (distMerc < MERC_CHEST_RADIUS) {
        if (mercenary.active) {
          mercUpgradeOpen = !mercUpgradeOpen;
          return;
        } else if (!player.upgrades.mercenary && player.money >= MERC_COST) {
          player.money -= MERC_COST;
          player.upgrades.mercenary = 1;
          return;
        }
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
  // Buy merc upgrades while panel open
  if (mercUpgradeOpen) {
    const upgKeys = ['dmg', 'rate', 'range', 'hp'];
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < upgKeys.length) {
      const key = upgKeys[idx];
      const level = mercenary.upgrades[key];
      const maxLevel = MERC_UPG_COSTS[key].length;
      if (level < maxLevel) {
        const cost = MERC_UPG_COSTS[key][level];
        if (player.money >= cost) {
          player.money -= cost;
          mercenary.upgrades[key]++;
          // Apply HP upgrade immediately — increase maxHp and heal the difference
          if (key === 'hp') {
            const newMax = MERC_MAX_HPS[mercenary.upgrades.hp];
            const diff = newMax - mercenary.maxHp;
            mercenary.maxHp = newMax;
            mercenary.hp = Math.min(mercenary.hp + diff, newMax);
          }
        }
      }
    }
    return;
  }
  // Buy items while shop open
  if (shopOpen) {
    const idx=parseInt(e.key)-1;
    if (idx>=0&&idx<SHOP_ITEMS.length) {
      const item=SHOP_ITEMS[idx];
      const lvl=player.upgrades[item.key];
      if (lvl<item.maxLevel) {
        const cost=item.price(lvl);
        if (player.money>=cost) { player.money-=cost; player.upgrades[item.key]++; }
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
  _targetViewW = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, _targetViewW + (e.deltaY > 0 ? 2 : -2)));
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
  // Web slow (Venom Queen)
  if (player.webSlowTimer > 0) player.webSlowTimer--;
  // Apply move speed perk (capped at +60% = level 5), reduced by web slow
  const webMult   = player.webSlowTimer > 0 ? 0.38 : 1;
  const boostMult = player.speedBoostTimer > 0 ? SPEED_BOOST_MULT : 1;
  player.speed = PLAYER_SPEED * (1 + Math.min(player.perks.moveSpeed, 5) * 0.12) * webMult * boostMult;
  if (player.moving) {
    const nx=player.cx+dx*player.speed, ny=player.cy+dy*player.speed;
    if (!isBlocked(nx,player.cy)) player.cx=nx;
    if (!isBlocked(player.cx,ny)) player.cy=ny;
    player.ft+=1/60;
    if (player.ft>=.095){player.frame=(player.frame+1)%6;player.ft=0;}
  }
  player.facing = dir8((mouse.x+camX)-player.cx*TW, (mouse.y+camY)-player.cy*TH);

  // ── Dash burst movement
  if (player.dashTimer > 0) {
    player.dashTrail.push({ cx: player.cx, cy: player.cy, facing: player.facing, frame: player.frame,
      a: player.dashTimer / DASH_FRAMES });
    const [ddx, ddy] = FACING_VEC[player.facing] || [0, 0];
    const dnx = player.cx + ddx * DASH_SPEED;
    const dny = player.cy + ddy * DASH_SPEED;
    if (!isBlocked(dnx, player.cy)) player.cx = dnx;
    if (!isBlocked(player.cx, dny)) player.cy = dny;
    player.dashTimer--;
  }
  if (player.dashCooldown > 0) player.dashCooldown--;
  if (player.hurtTimer>0) {
    player.hurtTimer--;
    player.regenTimer = 0;
    player.regenAccum = 0;
  } else if (player.perks.hpRegen > 0 && player.hp < player.maxHp) {
    player.regenTimer++;
    if (player.regenTimer >= 300) { // 5 seconds at 60fps
      const rates = [0, 2, 5, 8, 11, 15];
      player.regenAccum += rates[player.perks.hpRegen] / 60;
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

  // Speed boost purple shadow trail
  drawSpeedBoostTrail();

  // Dash afterimage trail — offscreen canvas prevents bleed onto floors/walls
  if (player.dashTrail && player.dashTrail.length > 0) {
    if (!drawPlayer._dashOff) {
      drawPlayer._dashOff = document.createElement('canvas');
      drawPlayer._dashPC  = drawPlayer._dashOff.getContext('2d');
    }
    const dOff = drawPlayer._dashOff, dPC = drawPlayer._dashPC;
    if (dOff.width !== sz) { dOff.width = sz; dOff.height = sz; }
    for (let i = player.dashTrail.length - 1; i >= 0; i--) {
      const t = player.dashTrail[i];
      const timg = charIdle[t.facing];
      if (timg && timg.complete && timg.naturalWidth) {
        dPC.clearRect(0, 0, sz, sz);
        dPC.drawImage(timg, 0, 0, sz, sz);
        dPC.globalCompositeOperation = 'source-atop';
        dPC.fillStyle = 'rgba(100,180,255,1)';
        dPC.fillRect(0, 0, sz, sz);
        dPC.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.globalAlpha = t.a * 0.45;
        ctx.drawImage(dOff, t.cx*TW - sz/2, t.cy*TH - sz/2);
        ctx.restore();
      }
      t.a -= 0.08;
      if (t.a <= 0) { player.dashTrail.splice(i, 1); }
    }
  }

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
