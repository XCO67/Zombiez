
// ─── MULTIPLAYER ──────────────────────────────────────────────────────────────
// Architecture: server-authoritative at 30 tps.
//   Client predicts own movement every physics step (fixed 60fps timestep).
//   Server snapshots correct position + drive all enemy/coin/perk state.
//   Remote players and enemies lerp visually between 30fps snapshots at 60fps.

const canWalk = (cx, cy) => !isBlocked(cx, cy);
const PLAYER_COLORS = ['#60c0ff','#ff6b6b','#6bff6b','#ffcc44'];
const mp = {
  socket: null, active: false, room: null, slot: -1,
  players: [], firstState: false, ping: 0, _pingTime: 0,
};
const REMOTE_PLAYERS_MAP = new Map(); // slot → remotePlayer (stable lerp state)
const REMOTE_PLAYERS = [];            // flat array (legacy rendering code)

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAllPlayers() {
  const out = [];
  if (!player.dead && !player.downed) out.push(player);
  REMOTE_PLAYERS_MAP.forEach(r => { if (!r.dead && !r.downed) out.push(r); });
  return out;
}
function nearestPlayerTo(cx, cy) {
  const all = getAllPlayers();
  if (!all.length) return player;
  return all.reduce((b, p) => Math.hypot(p.cx-cx,p.cy-cy) < Math.hypot(b.cx-cx,b.cy-cy) ? p : b);
}
function mpColor(slot)       { return PLAYER_COLORS[slot] || '#fff'; }
function mpPlayerColor(slot) { return mpColor(slot); }

function createRemotePlayer(name, slot) {
  return {
    cx: PLAYER_START.cx + slot*1.5, cy: PLAYER_START.cy,
    _tx: PLAYER_START.cx + slot*1.5, _ty: PLAYER_START.cy,
    _rpFt: 0,
    facing: 'south', frame: 0, moving: false,
    hp: 100, maxHp: 100, hurtTimer: 0,
    dead: false, downed: false, downedTimer: 0, reviveProgress: 0,
    weaponKey: 'pistol', ammo: Infinity, secondaryKey: null, secondaryAmmo: 0,
    fireRingTimer: 0, barrierTimer: 0, speedBoostTimer: 0,
    name, slot, color: mpColor(slot),
  };
}

// ── Apply server snapshot ─────────────────────────────────────────────────────
// Called on every 'game_state' event. Updates all game state from server truth.
function applyServerSnapshot(st) {
  if (!mp.firstState) {
    console.log('[MP] first snapshot slot=', mp.slot);
    mp.firstState = true;
  }

  // S: scale factor from server pixel space (TW_S=48px/tile) → client pixel space
  const S = TW / 48;

  // ── Players ───────────────────────────────────────────────────────────────
  const seenSlots = new Set();
  (st.p || []).forEach(pd => {
    seenSlots.add(pd.sl);

    if (pd.sl === mp.slot) {
      // Own player — server is authoritative for all stats, gentle position reconciliation
      player.hp           = pd.hp;   player.maxHp     = pd.mhp;
      player.dead         = !!pd.dead; player.downed  = !!pd.dn;
      player.downedTimer  = pd.dt;
      player.reviveProgress = (pd.rvp || 0) * 240;
      player.weaponKey    = pd.wk;
      const srvAmmo = pd.am === -1 ? Infinity : pd.am;
      // Take lower of server/client ammo — never restore spent ammo on client
      player.ammo = (player.ammo === Infinity || srvAmmo === Infinity)
        ? srvAmmo : Math.min(player.ammo, srvAmmo);
      player.money      = pd.mo || 0;
      player.goldEarned = pd.sc || 0;
      if (pd.upg) player.upgrades = pd.upg;
      if (pd.sk !== undefined) player.secondaryKey  = pd.sk  || null;
      if (pd.sa !== undefined) player.secondaryAmmo = pd.sa === -1 ? Infinity : pd.sa;
      player.heat       = pd.ht || 0;
      player.overheated = !!pd.oh;
      // Ability state — server drives timers, client renders from them
      player.fireCooldown       = pd.fc  || 0;  player.fireRingTimer   = pd.frt || 0;
      player.barrierCooldown    = pd.bc  || 0;  player.barrierTimer    = pd.bt  || 0;
      player.speedBoostCooldown = pd.sc2 || 0;  player.speedBoostTimer = pd.sbt || 0;

      // Position reconciliation — always correct; soft when moving to avoid fighting prediction
      if (!player._snapped) {
        player.cx = pd.cx; player.cy = pd.cy; player._snapped = true;
      } else {
        const ex = pd.cx - player.cx, ey = pd.cy - player.cy;
        const d  = Math.hypot(ex, ey);
        if (d > 5) {
          player.cx = pd.cx; player.cy = pd.cy;          // large error: hard snap
        } else if (d > 0.02) {
          const rate = player.moving ? 0.08 : 0.3;        // always correct, just gently
          player.cx += ex * rate; player.cy += ey * rate;
        }
      }

    } else {
      // Remote player
      let rp = REMOTE_PLAYERS_MAP.get(pd.sl);
      if (!rp) {
        rp = createRemotePlayer(pd.nm, pd.sl);
        rp.cx = pd.cx; rp.cy = pd.cy;
        REMOTE_PLAYERS_MAP.set(pd.sl, rp);
      }
      rp._tx = pd.cx; rp._ty = pd.cy;
      rp.hp   = pd.hp;  rp.maxHp  = pd.mhp;
      rp.facing = pd.f; rp.moving = !!pd.mv;
      rp.dead = !!pd.dead; rp.downed = !!pd.dn;
      rp.downedTimer    = pd.dt;
      rp.reviveProgress = (pd.rvp || 0) * 240;
      rp.weaponKey = pd.wk;
      rp.ammo = pd.am === -1 ? Infinity : pd.am;
      rp.name = pd.nm;
      // Remote ability state — used to render their visual effects
      rp.fireRingTimer   = pd.frt || 0;
      rp.barrierTimer    = pd.bt  || 0;
      rp.speedBoostTimer = pd.sbt || 0;
    }
  });

  // Remove disconnected players
  for (const [slot] of REMOTE_PLAYERS_MAP) {
    if (!seenSlots.has(slot)) REMOTE_PLAYERS_MAP.delete(slot);
  }
  REMOTE_PLAYERS.length = 0;
  REMOTE_PLAYERS_MAP.forEach(rp => REMOTE_PLAYERS.push(rp));

  // ── Enemy sync helpers ────────────────────────────────────────────────────
  // Updates an entity array in-place. Creates new objects only when needed.
  // This preserves lerp state (_tx/_ty) and hitFlash between snapshots.
  // dmgColor: the color for damage numbers spawned on HP decrease.

  function syncEntArr(local, remote, factory, onUpdate) {
    while (local.length > remote.length) local.pop();
    remote.forEach((rd, i) => {
      if (!local[i]) { local[i] = factory(rd); return; }
      const ent = local[i], prevHp = ent.hp;
      ent._tx = rd[0]; ent._ty = rd[1];
      ent.hp   = rd[2];
      if (onUpdate) onUpdate(ent, rd);
      if (rd[2] < prevHp && !ent.dead) {
        ent.hitFlash = 8;
        spawnDmgNum(rd[0]*TW, rd[1]*TH - TH*0.35, prevHp - rd[2], ent._dmgColor || '#ff4444');
      }
    });
  }

  // Zombies: [cx,cy,hp,maxHp,facing,frame,dead]
  syncEntArr(ZOMBIES, st.z || [],
    rd => ({ cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:rd[3]||100,
             facing:rd[4]||'south',frame:rd[5]||0,dead:rd[6]===1,
             hitFlash:0,deathTimer:0,vx:0,vy:0,_ft:0,_dmgColor:'#ff4444' }),
    (z, rd) => { if (rd[3]>0) z.maxHp=rd[3]; z.dead=rd[6]===1; }
  );

  // Skeletons: [cx,cy,hp,facing,frame,dead]  (no maxHp field — use SKEL_HP constant)
  {
    const arr = st.sk || [];
    while (SKELETONS.length > arr.length) SKELETONS.pop();
    arr.forEach((rd, i) => {
      if (!SKELETONS[i]) {
        SKELETONS[i] = { cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:SKEL_HP,
          facing:rd[3]||'south',frame:rd[4]||0,dead:rd[5]===1,
          hitFlash:0,deathTimer:0,vx:0,vy:0,_ft:0 };
        return;
      }
      const s = SKELETONS[i], prevHp = s.hp;
      s._tx=rd[0]; s._ty=rd[1]; s.hp=rd[2]; s.dead=rd[5]===1;
      if (rd[2] < prevHp && !s.dead) { s.hitFlash=8; spawnDmgNum(rd[0]*TW,rd[1]*TH-TH*.35,prevHp-rd[2],'#aaffcc'); }
    });
  }

  // Dragons: [cx,cy,hp,facing,frame,dead]  (no maxHp field — use DRAGON_HP constant)
  {
    const arr = st.dr || [];
    while (DRAGONS.length > arr.length) DRAGONS.pop();
    arr.forEach((rd, i) => {
      if (!DRAGONS[i]) {
        DRAGONS[i] = { cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:DRAGON_HP,
          facing:rd[3]||'south',frame:rd[4]||0,dead:rd[5]===1,
          hitFlash:0,deathTimer:0,vx:0,vy:0,_ft:0,fireTimer:0 };
        return;
      }
      const d = DRAGONS[i], prevHp = d.hp;
      d._tx=rd[0]; d._ty=rd[1]; d.hp=rd[2]; d.dead=rd[5]===1;
      if (rd[2] < prevHp && !d.dead) { d.hitFlash=8; spawnDmgNum(rd[0]*TW,rd[1]*TH-TH*.35,prevHp-rd[2],'#ff8800'); }
    });
  }

  // Lava Zombies: [cx,cy,hp,maxHp,facing,frame,dead(6),inv(7)]
  {
    const arr = st.lz || [];
    while (LAVA_ZOMBIES.length > arr.length) LAVA_ZOMBIES.pop();
    arr.forEach((rd, i) => {
      if (!LAVA_ZOMBIES[i]) {
        LAVA_ZOMBIES[i] = { cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:rd[3]||300,
          facing:rd[4]||'south',frame:rd[5]||0,dead:rd[6]===1,invincTimer:rd[7]?60:0,
          hitFlash:0,deathTimer:0,vx:0,vy:0,_ft:0,abilityTimer:0,state:'walk' };
        return;
      }
      const z = LAVA_ZOMBIES[i], prevHp = z.hp;
      z._tx=rd[0]; z._ty=rd[1]; if (rd[3]>0) z.maxHp=rd[3];
      z.hp=rd[2]; z.dead=rd[6]===1; z.invincTimer=rd[7]?60:0;
      if (rd[2] < prevHp && !z.dead) { z.hitFlash=8; spawnDmgNum(rd[0]*TW,rd[1]*TH-TH*.35,prevHp-rd[2],'#ff8800'); }
    });
  }

  // Exploders: [cx,cy,hp,maxHp,facing,frame,dead(6)]
  {
    const arr = st.ex || [];
    while (EXPLODERS.length > arr.length) EXPLODERS.pop();
    arr.forEach((rd, i) => {
      if (!EXPLODERS[i]) {
        EXPLODERS[i] = { cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:rd[3]||30,
          facing:rd[4]||'south',frame:rd[5]||0,dead:rd[6]===1,
          hitFlash:0,deathTimer:0,vx:0,vy:0,_ft:0,exploded:false };
        return;
      }
      const e = EXPLODERS[i], prevHp = e.hp;
      e._tx=rd[0]; e._ty=rd[1]; if (rd[3]>0) e.maxHp=rd[3];
      e.hp=rd[2]; e.dead=rd[6]===1;
      if (rd[2] < prevHp && !e.dead) { e.hitFlash=8; spawnDmgNum(rd[0]*TW,rd[1]*TH-TH*.35,prevHp-rd[2],'#ffaa00'); }
    });
  }

  // Phantoms: [cx,cy,hp,maxHp,facing,frame,dead(6),phase(7)]
  {
    const arr = st.ph || [];
    while (PHANTOMS.length > arr.length) PHANTOMS.pop();
    arr.forEach((rd, i) => {
      if (!PHANTOMS[i]) {
        PHANTOMS[i] = { cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:rd[3]||70,
          facing:rd[4]||'south',frame:rd[5]||0,dead:rd[6]===1,invincTimer:rd[7]?45:0,
          hitFlash:0,deathTimer:0,vx:0,vy:0,_ft:0 };
        return;
      }
      const ph = PHANTOMS[i], prevHp = ph.hp;
      ph._tx=rd[0]; ph._ty=rd[1]; if (rd[3]>0) ph.maxHp=rd[3];
      ph.hp=rd[2]; ph.dead=rd[6]===1; ph.invincTimer=rd[7]?45:0;
      if (rd[2] < prevHp && !ph.dead) { ph.hitFlash=8; spawnDmgNum(rd[0]*TW,rd[1]*TH-TH*.35,prevHp-rd[2],'#cc88ff'); }
    });
  }

  // Boss Demons: [cx,cy,hp,maxHp,facing,frame,dead(6)]
  {
    const arr = st.bd || [];
    while (BOSS_DEMONS.length > arr.length) BOSS_DEMONS.pop();
    arr.forEach((rd, i) => {
      if (!BOSS_DEMONS[i]) {
        BOSS_DEMONS[i] = { cx:rd[0],cy:rd[1],_tx:rd[0],_ty:rd[1],hp:rd[2],maxHp:rd[3]||7000,
          facing:rd[4]||'south',frame:rd[5]||0,dead:rd[6]===1,
          hitFlash:0,deathTimer:0,_ft:0,shootTimer:0,shootPhase:0 };
        return;
      }
      const b = BOSS_DEMONS[i], prevHp = b.hp;
      b._tx=rd[0]; b._ty=rd[1]; if (rd[3]>0) b.maxHp=rd[3];
      b.hp=rd[2]; b.dead=rd[6]===1;
      if (rd[2] < prevHp && !b.dead) { b.hitFlash=9; spawnDmgNum(rd[0]*TW,rd[1]*TH-TH*.35,prevHp-rd[2],'#ff2222'); }
    });
  }

  // ── Physics particles: replace entirely each snapshot, advance locally between ──
  // Flames: [x,y,vx,vy,life]  — server pixel space at TW_S=48, must scale to client TW
  FLAMES.length = 0;
  (st.fl || []).forEach(f => FLAMES.push({
    x:f[0]*S, y:f[1]*S, vx:f[2]*S/2, vy:f[3]*S/2, life:f[4], maxLife:f[4],
  }));

  // Lava shards: [x,y,vx,vy,life]
  LAVA_SHARDS.length = 0;
  (st.ls || []).forEach(s => LAVA_SHARDS.push({
    x:s[0]*S, y:s[1]*S, vx:s[2]*S/2, vy:s[3]*S/2, life:s[4],
  }));

  // Lava pools: [cx,cy,life]  — tile coords, no scaling needed
  LAVA_POOLS.length = 0;
  (st.lp || []).forEach(p => LAVA_POOLS.push({ cx:p[0], cy:p[1], life:p[2], dmgTimer:0 }));

  // Boss shots: [x,y,vx,vy,life]
  BOSS_SHOTS.length = 0;
  (st.bs || []).forEach(b => BOSS_SHOTS.push({
    x:b[0]*S, y:b[1]*S, vx:b[2]*S/2, vy:b[3]*S/2, life:b[4],
  }));

  // ── World objects ─────────────────────────────────────────────────────────
  COINS.length = 0;
  (st.co || []).forEach(c => COINS.push({ cx:c[0], cy:c[1], amount:c[2], bob:0 }));

  if (st.pk) {
    DROPPED_PERKS.length = 0;
    st.pk.forEach(pk => DROPPED_PERKS.push({ cx:pk[0], cy:pk[1], type:pk[2], life:pk[3], bob:0 }));
  }

  if (st.drs) {
    st.drs.forEach((unlocked, i) => {
      if (unlocked && DOORS[i] && !DOORS[i].unlocked) {
        DOORS[i].unlocked = true;
        DOORS[i].tiles.forEach(({r,c}) => { MAP[r][c] = T.FLOOR; });
      }
    });
  }

  // ── Game state ────────────────────────────────────────────────────────────
  const g = st.g;
  game.round = g.r; game.kills = g.k; game.score = g.sc;
  game.state  = g.st; game.waveTimer = g.wt; spawnRemaining = g.sp;
}

// ── Client-side movement prediction ──────────────────────────────────────────
// Called every physics step (fixed 60fps timestep via render.js).
// Mirrors the server movement formula so position stays in sync.
function _mpPredictPlayer() {
  if (!player._snapped || player.dead || player.downed || game.state !== 'playing') return;

  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup'])    dy -= 1;
  if (keys['s'] || keys['arrowdown'])  dy += 1;
  if (keys['a'] || keys['arrowleft'])  dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx === 0 && dy === 0 && clickTarget) {
    const cdx = clickTarget.cx - player.cx, cdy = clickTarget.cy - player.cy;
    const dist = Math.hypot(cdx, cdy);
    if (dist < 0.12) { clickTarget = null; }
    else { dx = cdx/dist; dy = cdy/dist; }
  } else if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

  player.moving = dx !== 0 || dy !== 0;

  // Match server speed formula exactly: PLAYER_SPEED_S = PLAYER_SPEED * 2 (30tps)
  // Client step = PLAYER_SPEED (tiles/frame at 60fps) — same tiles/second
  const boostMult = player.speedBoostTimer > 0 ? 1.65 : 1;
  const spd = PLAYER_SPEED * (1 + Math.min(player.upgrades.moveSpeed, 5) * 0.12) * boostMult;

  if (player.moving) {
    const nx = player.cx + dx*spd, ny = player.cy + dy*spd;
    if (canWalk(nx, player.cy)) player.cx = nx;
    if (canWalk(player.cx, ny)) player.cy = ny;
    player._mpFt = (player._mpFt || 0) + 1/60;
    if (player._mpFt >= 0.095) { player.frame = (player.frame+1)%6; player._mpFt = 0; }
  }

  player.facing = dir8((mouse.x+camX) - player.cx*TW, (mouse.y+camY) - player.cy*TH);
  if (player.hurtTimer > 0) player.hurtTimer--;
}

// ── Interpolation + visual step (called every render frame) ──────────────────
// mpAnimate: PURE VISUALS. No authoritative state changes here.
function mpAnimate() {
  const L = 0.35; // lerp coefficient per frame — ~91% closed in 8 frames at 60fps

  // Lerp remote players toward their server target positions
  REMOTE_PLAYERS_MAP.forEach(rp => {
    if (rp._tx !== undefined) {
      const ex = rp._tx - rp.cx, ey = rp._ty - rp.cy;
      const d  = Math.hypot(ex, ey);
      if (d > 3) { rp.cx = rp._tx; rp.cy = rp._ty; }  // large gap: snap
      else       { rp.cx += ex*L;  rp.cy += ey*L; }
    }
    if (rp.moving) {
      rp._rpFt = (rp._rpFt || 0) + 1;
      if (rp._rpFt >= 8) { rp._rpFt = 0; rp.frame = (rp.frame+1)%6; }
    }
  });

  // Lerp + animate all enemy types
  const lerpEnt = (ent, frameTime, maxFrame) => {
    if (ent._tx !== undefined) { ent.cx += (ent._tx-ent.cx)*L; ent.cy += (ent._ty-ent.cy)*L; }
    ent._ft = (ent._ft||0) + 1/60;
    if (ent._ft >= frameTime) { ent._ft = 0; ent.frame = ((ent.frame||0)+1) % maxFrame; }
    if (ent.hitFlash  > 0) ent.hitFlash--;
    if (ent.deathTimer > 0) ent.deathTimer--;
  };

  ZOMBIES.forEach(z    => lerpEnt(z,  0.11, 8));
  SKELETONS.forEach(s  => lerpEnt(s,  0.09, 4));
  DRAGONS.forEach(d    => lerpEnt(d,  0.11, 8));
  LAVA_ZOMBIES.forEach(z => lerpEnt(z, 0.11, 8));
  EXPLODERS.forEach(e  => lerpEnt(e,  0.11, 6));
  PHANTOMS.forEach(p   => lerpEnt(p,  0.11, 8));
  BOSS_DEMONS.forEach(b => lerpEnt(b, 0.14, 8));

  // Advance bullet projectiles locally between snapshots
  for (let i = projectiles.length-1; i >= 0; i--) {
    const p = projectiles[i];
    p.trail = p.trail || [];
    p.trail.unshift({ x:p.x, y:p.y });
    if (p.trail.length > 8) p.trail.pop();
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) { projectiles.splice(i,1); continue; }
    const tr = p.y/TH|0, tc = p.x/TW|0;
    if (tr<0||tr>=MAP_H||tc<0||tc>=MAP_W||MAP[tr]?.[tc]===T.WALL||MAP[tr]?.[tc]===T.PILLAR)
      projectiles.splice(i,1);
  }

  // Advance physics particles between snapshots (overwritten each snapshot)
  const adv = arr => {
    for (let i = arr.length-1; i >= 0; i--) {
      arr[i].x += arr[i].vx; arr[i].y += arr[i].vy; arr[i].life--;
      if (arr[i].life <= 0) arr.splice(i,1);
    }
  };
  adv(FLAMES); adv(LAVA_SHARDS); adv(BOSS_SHOTS);

  // Local shooting — immediate visual feedback (server damage handled server-side)
  _mpShootLocal();

  COINS.forEach(c => { c.bob = (c.bob||0) + 0.08; });
  updateDmgNums();
  updateEffects();
}

// ── Local shooting (visual only) ──────────────────────────────────────────────
// Server processes the actual shot via 'shooting' flag in player_input.
// We spawn local bullets immediately so the player sees their own shots without RTT delay.
// Server echoes other players' shots via 'bullet_fired' event.
let _mpShootCD = 0;
function _mpShootLocal() {
  if (player.dead || player.downed || game.state !== 'playing' || shopOpen) return;
  if (_mpShootCD > 0) { _mpShootCD--; return; }
  if (!mouse.down) return;

  const w = WEAPONS[player.weaponKey];
  const hasAmmo = player.weaponKey === 'pistol' || player.ammo > 0;
  if (!hasAmmo || (player.weaponKey === 'pistol' && player.overheated)) return;

  _mpShootCD = w.fireRate;
  const sx = player.cx*TW, sy = player.cy*TH;
  const ang = Math.atan2((mouse.y+camY)-sy, (mouse.x+camX)-sx);

  if (!w.wave) {
    for (let i = 0; i < w.pellets; i++) {
      const a = ang + (Math.random()-0.5)*w.spread*2;
      projectiles.push({ x:sx, y:sy, vx:Math.cos(a)*w.speed, vy:Math.sin(a)*w.speed,
        trail:[], life:90, wkey:player.weaponKey, _local:true });
    }
    muzzleFlash = 6; muzzleColor = w.color;
  } else {
    spawnEffect('windwave', sx, sy, { ang, halfAng:WAVE_HALFANG, range:WAVE_RANGE });
    muzzleFlash = 10; muzzleColor = '#60e8ff';
  }
  // Immediate feedback (server snapshot reconciles these on next tick)
  if (player.weaponKey !== 'pistol' && player.ammo > 0) player.ammo--;
  if (player.weaponKey === 'pistol') {
    player.heat = Math.min(100, player.heat + 15);
    if (player.heat >= 100) player.overheated = true;
    playPistolSound();
  }
}

// ── Draw remote players ───────────────────────────────────────────────────────
function drawRemotePlayers() {
  REMOTE_PLAYERS_MAP.forEach(rp => {
    if (rp.dead) return;
    const px = rp.cx*TW, py = rp.cy*TH, sz = TW*1.45;

    // Barrier ring (behind player)
    if (rp.barrierTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.2*Math.sin(Date.now()*0.006);
      ctx.strokeStyle = '#64c8ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, TW*0.78, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // Fire ring (behind player)
    if (rp.fireRingTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.25*Math.sin(Date.now()*0.01);
      ctx.strokeStyle = '#ff6414'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(px, py, TW*1.8, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // Character sprite
    const img = rp.moving ? charWalk[rp.facing]?.[rp.frame%6] : charIdle[rp.facing];
    if (img && img.complete && img.naturalWidth)
      ctx.drawImage(img, px-sz/2, py-sz/2, sz, sz);
    else {
      ctx.fillStyle = rp.color; ctx.beginPath();
      ctx.arc(px, py, TW*.38, 0, Math.PI*2); ctx.fill();
    }

    // Name tag
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillStyle=rp.color; ctx.font=`bold ${Math.round(TW*.26)}px Segoe UI`;
    ctx.fillText(rp.name, px, py-sz*.56);

    // HP bar
    const bw=sz*.72, bh=Math.max(3,TH*.08), bx=px-bw/2, by=py-sz*.52;
    ctx.fillStyle='#300'; ctx.fillRect(bx,by,bw,bh);
    const hf = rp.hp/rp.maxHp;
    ctx.fillStyle = hf>.5?'#2ecc40':hf>.25?'#e6c020':'#e74c3c';
    ctx.fillRect(bx,by,bw*hf,bh);

    if (rp.downed) {
      ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(bx,by,bw,bh);
      ctx.textBaseline='middle'; ctx.fillStyle='#ff4444';
      ctx.font=`bold ${Math.round(TW*.22)}px Segoe UI`;
      ctx.fillText('DOWN', px, py);
      if (rp.reviveProgress > 0) {
        ctx.strokeStyle='#00ffaa'; ctx.lineWidth=3;
        ctx.beginPath();
        ctx.arc(px,py,TW*.6,-Math.PI/2,-Math.PI/2+Math.PI*2*(rp.reviveProgress/240));
        ctx.stroke();
      }
    }
  });

  // Own player — downed visual
  if (player.downed) {
    const px=player.cx*TW, py=player.cy*TH;
    ctx.fillStyle='rgba(255,40,40,.12)'; ctx.beginPath();
    ctx.arc(px,py,TW*.65,0,Math.PI*2); ctx.fill();
    if (player.reviveProgress > 0) {
      ctx.strokeStyle='#00ffaa'; ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(px,py,TW*.75,-Math.PI/2,-Math.PI/2+Math.PI*2*(player.reviveProgress/240));
      ctx.stroke();
    }
  }
}

// ── Downed overlay ────────────────────────────────────────────────────────────
function drawDownedHUD() {
  if (!player.downed) return;
  const W=canvas.width, H=canvas.height;
  const g=ctx.createRadialGradient(W/2,H/2,H*.12,W/2,H/2,H*.7);
  g.addColorStop(0,'rgba(150,0,0,0)'); g.addColorStop(1,'rgba(150,0,0,.52)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#ff4444'; ctx.font=`bold ${Math.round(W*.036)}px Segoe UI`;
  ctx.fillText('YOU ARE DOWN', W/2, H/2-40);
  ctx.fillStyle='#ffaaaa'; ctx.font=`${Math.round(W*.015)}px Segoe UI`;
  // downedTimer comes from server in server ticks (30tps)
  ctx.fillText(`A teammate can revive you  •  ${Math.ceil(player.downedTimer/30)}s remaining`, W/2, H/2+2);
  if (player.reviveProgress > 0) {
    const bw=260,bh=10,bx=W/2-bw/2,by=H/2+30;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='#00ffaa'; ctx.fillRect(bx,by,bw*(player.reviveProgress/240),bh);
    ctx.fillStyle='#00ffaa'; ctx.font=`${Math.round(W*.013)}px Segoe UI`;
    ctx.fillText('Being revived...', W/2, by+bh+14);
  }
}

// ── Ping display ──────────────────────────────────────────────────────────────
function drawPingHUD() {
  if (!mp.active) return;
  const W=canvas.width, ping=mp.ping;
  const col = ping<80?'#00ff88':ping<150?'#ffcc00':'#ff4444';
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(W-120,4,116,22);
  ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillStyle=col; ctx.font='bold 12px Segoe UI';
  ctx.fillText(`MP  ${ping}ms`, W-8, 15);
  ctx.restore();
}

// ── Send input to server ──────────────────────────────────────────────────────
// Called every physics step (fixed 60fps timestep) from render.js _runGameLogic.
// Also runs client-side movement prediction here so prediction is fixed-timestep.
function sendMpInput() {
  if (!mp.socket || !mp.active) return;

  // Predict first so prediction and input are always in sync
  _mpPredictPlayer();

  mp.socket.emit('player_input', {
    w: !!(keys['w']||keys['arrowup']),
    s: !!(keys['s']||keys['arrowdown']),
    a: !!(keys['a']||keys['arrowleft']),
    d: !!(keys['d']||keys['arrowright']),
    mx: mouse.x + camX,
    my: mouse.y + camY,
    shooting: !!mouse.down,
    q: !!keys[KEYBINDS.swapWeapon],
    f: !!keys['f'],
    e: !!keys[KEYBINDS.interact],
    ctx: clickTarget ? clickTarget.cx : null,
    cty: clickTarget ? clickTarget.cy : null,
    // Ability keys: server edge-detects via _ab1prev (preserved in socket handler)
    ab1: !!keys[KEYBINDS.fireRing],
    ab2: !!keys[KEYBINDS.barrier],
    ab3: !!keys[KEYBINDS.speedBoost],
  });
}

// ── Socket setup + lobby ──────────────────────────────────────────────────────
function mpConnect(cb) {
  if (mp.socket && mp.socket.connected) { cb(); return; }
  mp.socket = io(API_URL, { transports: ['websocket','polling'] });
  mp.socket.on('connect', cb);
  mp.socket.on('mp_error', msg => { document.getElementById('mpMsg').textContent = msg; });
  mp.socket.on('lobby_update', players => { mp.players = players; renderMpLobby(); });
  mp.socket.on('player_left', ({ slot }) => {
    REMOTE_PLAYERS_MAP.delete(slot);
    REMOTE_PLAYERS.length = 0;
    REMOTE_PLAYERS_MAP.forEach(rp => REMOTE_PLAYERS.push(rp));
  });

  // bullet_fired: server tells ALL clients where + when another player shot.
  // Spawns bullet at the shooter's position immediately — no mid-air pop-in.
  mp.socket.on('bullet_fired', bullets => {
    if (!mp.active || !mp.firstState) return;
    const S = TW / 48; // server TW_S=48 → client TW
    bullets.forEach(b => {
      if (b.sl === mp.slot) return; // own bullets handled by _mpShootLocal
      const px = b.x*S, py = b.y*S;
      const cvx = b.vx*S/2, cvy = b.vy*S/2; // 30tps→60fps: halve velocity per tick
      projectiles.push({ x:px, y:py, vx:cvx, vy:cvy, wkey:b.wk,
        life:90, trail:[], prevX:px, prevY:py, slot:b.sl });
    });
  });

  mp.socket.on('game_start', ({ players }) => {
    console.log('[MP] game_start slot=', mp.slot);
    mp.players = players;
    REMOTE_PLAYERS_MAP.clear();
    REMOTE_PLAYERS.length = 0;
    _mpShootCD = 0;
    player._snapped = false; // reset so first snapshot positions us correctly
    mp.active = true;        // set BEFORE startGame so local _startWave is skipped
    closeModal('mpModal');
    startGame();
  });

  mp.socket.on('game_state', st => {
    if (mp.active) applyServerSnapshot(st);
  });

  mp.socket.on('pong_mp', () => { mp.ping = Date.now() - mp._pingTime; });

  setInterval(() => {
    if (mp.socket && mp.socket.connected && mp.active) {
      mp._pingTime = Date.now(); mp.socket.emit('ping_mp');
    }
  }, 2000);
}

function mpCreate() {
  const name = getUser()?.username || ('Player' + (Math.random()*999|0));
  document.getElementById('mpMsg').textContent = 'Connecting...';
  mpConnect(() => {
    mp.socket.emit('create_room', { name });
    mp.socket.once('room_created', ({ code, slot, players }) => {
      mp.room = code; mp.slot = slot; mp.players = players;
      document.getElementById('mpMsg').textContent = '';
      document.getElementById('mpLobbySetup').style.display = 'none';
      document.getElementById('mpLobbyRoom').style.display  = 'block';
      document.getElementById('mpRoomCode').textContent = code;
      document.getElementById('mpStartBtn').style.display   = 'block';
      document.getElementById('mpWaitMsg').style.display    = 'none';
      renderMpLobby();
    });
  });
}

function mpJoin() {
  const code = document.getElementById('mpJoinCode').value.trim().toUpperCase();
  if (!code) { document.getElementById('mpMsg').textContent = 'Enter a room code'; return; }
  const name = getUser()?.username || ('Player' + (Math.random()*999|0));
  document.getElementById('mpMsg').textContent = 'Connecting...';
  mpConnect(() => {
    mp.socket.emit('join_room', { code, name });
    mp.socket.once('room_joined', ({ code:c, slot, players }) => {
      mp.room = c; mp.slot = slot; mp.players = players;
      document.getElementById('mpMsg').textContent = '';
      document.getElementById('mpLobbySetup').style.display = 'none';
      document.getElementById('mpLobbyRoom').style.display  = 'block';
      document.getElementById('mpRoomCode').textContent = c;
      document.getElementById('mpStartBtn').style.display   = 'none';
      document.getElementById('mpWaitMsg').style.display    = 'block';
      renderMpLobby();
    });
  });
}

function mpStartGame() {
  if (mp.socket) mp.socket.emit('start_game');
}

function mpClose() {
  document.getElementById('mpLobbySetup').style.display = 'block';
  document.getElementById('mpLobbyRoom').style.display  = 'none';
  document.getElementById('mpMsg').textContent = '';
  if (mp.socket) { mp.socket.disconnect(); mp.socket = null; }
  Object.assign(mp, { active:false, room:null, slot:-1, players:[], firstState:false, ping:0 });
  REMOTE_PLAYERS_MAP.clear();
  REMOTE_PLAYERS.length = 0;
  closeModal('mpModal');
}

function renderMpLobby() {
  document.getElementById('mpPlayerList').innerHTML = mp.players.map(p => `
    <div class="mp-player-row">
      <div class="mp-dot" style="background:${mpPlayerColor(p.slot)}"></div>
      <div class="mp-pname">${p.name}</div>
      ${p.slot === 0 ? '<div class="mp-host-badge">HOST</div>' : ''}
    </div>`).join('');
}
