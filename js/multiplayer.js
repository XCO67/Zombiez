
// ─── MULTIPLAYER ──────────────────────────────────────────────────────────────
const canWalk = (cx, cy) => !isBlocked(cx, cy);
const PLAYER_COLORS = ['#60c0ff','#ff6b6b','#6bff6b','#ffcc44'];
const mp = {
  socket:null, active:false, room:null, slot:-1, players:[],
  firstState:false, ping:0, _pingTime:0
};
// REMOTE_PLAYERS_MAP: Map(slot -> object) for stable lerp state
const REMOTE_PLAYERS_MAP = new Map();
// REMOTE_PLAYERS: array view kept in sync for any legacy rendering code
const REMOTE_PLAYERS = [];

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
function mpColor(slot) { return PLAYER_COLORS[slot] || '#fff'; }
function mpPlayerColor(slot) { return mpColor(slot); }

function createRemotePlayer(name, slot) {
  return { cx:PLAYER_START.cx+slot*1.5, cy:PLAYER_START.cy,
    _tx:PLAYER_START.cx+slot*1.5, _ty:PLAYER_START.cy,
    facing:'south', frame:0, ft:0, moving:false, speed:PLAYER_SPEED,
    hp:100, maxHp:100, hurtTimer:0, dead:false, downed:false, downedTimer:0, reviveProgress:0,
    weaponKey:'pistol', ammo:Infinity, secondaryKey:null, secondaryAmmo:0,
    name, slot, color:mpColor(slot) };
}

// Apply server snapshot
function applyServerSnapshot(st) {
  if (!mp.firstState) console.log('[MP] first game_state received, slot=', mp.slot);
  mp.firstState = true;
  const L = 0.25;

  // Players
  const seenSlots = new Set();
  st.p.forEach(pd => {
    seenSlots.add(pd.sl);
    if (pd.sl === mp.slot) {
      // Our player — apply authoritative stats but NOT position (we predict)
      player.hp = pd.hp; player.maxHp = pd.mhp;
      player.dead = !!pd.dead; player.downed = !!pd.dn;
      player.downedTimer = pd.dt;
      player.reviveProgress = (pd.rvp || 0) * 240;
      player.weaponKey = pd.wk;
      // Take the lower of server/client ammo to avoid snapshot restoring spent ammo
      const srvAmmo = pd.am === -1 ? Infinity : pd.am;
      player.ammo = (player.ammo === Infinity || srvAmmo === Infinity) ? srvAmmo : Math.min(player.ammo, srvAmmo);
      player.money = pd.mo || 0;
      player.goldEarned = pd.sc || 0;
      if (pd.upg) player.upgrades = pd.upg;
      if (pd.sk !== undefined) player.secondaryKey = pd.sk || null;
      if (pd.sa !== undefined) player.secondaryAmmo = pd.sa === -1 ? Infinity : pd.sa;
      player.heat = pd.ht || 0;
      player.overheated = !!pd.oh;
      // Ability state from server (cooldowns/timers drive local visual effects)
      player.fireCooldown    = pd.fc  || 0; player.fireRingTimer   = pd.frt || 0;
      player.barrierCooldown = pd.bc  || 0; player.barrierTimer    = pd.bt  || 0;
      player.speedBoostCooldown = pd.sc2 || 0; player.speedBoostTimer = pd.sbt || 0;
      // Position reconciliation — only snap/correct when idle to avoid fighting prediction
      if (!player._snapped) { player.cx = pd.cx; player.cy = pd.cy; player._snapped = true; }
      else {
        const ex = pd.cx - player.cx, ey = pd.cy - player.cy;
        const d = Math.hypot(ex, ey);
        if (d > 4) { player.cx = pd.cx; player.cy = pd.cy; }                         // large gap: snap
        else if (!player.moving && d > 0.05) { player.cx += ex * 0.25; player.cy += ey * 0.25; } // idle drift correction only
      }
    } else {
      let rp = REMOTE_PLAYERS_MAP.get(pd.sl);
      if (!rp) {
        rp = createRemotePlayer(pd.nm, pd.sl);
        rp.cx = pd.cx; rp.cy = pd.cy;
        REMOTE_PLAYERS_MAP.set(pd.sl, rp);
      }
      rp._tx = pd.cx; rp._ty = pd.cy;
      rp.hp = pd.hp; rp.maxHp = pd.mhp;
      rp.facing = pd.f; rp.moving = !!pd.mv;
      rp.dead = !!pd.dead; rp.downed = !!pd.dn;
      rp.downedTimer = pd.dt;
      rp.reviveProgress = (pd.rvp || 0) * 240;
      rp.weaponKey = pd.wk; rp.ammo = pd.am === -1 ? Infinity : pd.am;
      rp.name = pd.nm;
    }
  });
  // Remove disconnected remote players
  for (const [slot] of REMOTE_PLAYERS_MAP) {
    if (!seenSlots.has(slot)) REMOTE_PLAYERS_MAP.delete(slot);
  }
  // Sync REMOTE_PLAYERS array
  REMOTE_PLAYERS.length = 0;
  REMOTE_PLAYERS_MAP.forEach(rp => REMOTE_PLAYERS.push(rp));

  // Enemies — update in place, never recreate
  // maxHpIdx: which array index holds maxHp (only zombies have variable maxHp)
  function syncEnts(local, remote, factory, maxHpIdx) {
    while (local.length > remote.length) local.pop();
    remote.forEach((rd, i) => {
      if (!local[i]) { local[i] = factory(rd); return; }
      local[i]._tx = rd[0]; local[i]._ty = rd[1];
      if (maxHpIdx !== undefined && rd[maxHpIdx] > 0) local[i].maxHp = rd[maxHpIdx];
      const prevHp = local[i].hp;
      local[i].hp = rd[2]; local[i].dead = rd[rd.length-1] === 1;
      // Client-side hit feedback: detect HP drops and show damage number + hit flash
      if (rd[2] < prevHp && !local[i].dead) {
        local[i].hitFlash = 8;
        spawnDmgNum(rd[0]*TW, rd[1]*TH - TH*0.35, prevHp - rd[2], '#ff4444');
      }
    });
  }
  syncEnts(ZOMBIES, st.z,
    z => ({ cx:z[0],cy:z[1],_tx:z[0],_ty:z[1],hp:z[2],maxHp:z[3]||100,facing:z[4],frame:z[5],dead:!!z[6],hitFlash:0,deathTimer:0 }), 3);
  syncEnts(SKELETONS, st.sk,
    s => ({ cx:s[0],cy:s[1],_tx:s[0],_ty:s[1],hp:s[2],maxHp:SKEL_HP,facing:s[3],frame:s[4],dead:!!s[5],hitFlash:0,deathTimer:0 }));
  syncEnts(DRAGONS, st.dr,
    d => ({ cx:d[0],cy:d[1],_tx:d[0],_ty:d[1],hp:d[2],maxHp:DRAGON_HP,facing:d[3],frame:d[4],dead:!!d[5],hitFlash:0,deathTimer:0,fireTimer:0 }));

  // Lava zombies: [cx,cy,hp,maxHp,facing,frame,dead(6),inv(7)]
  // syncEnts uses rd[rd.length-1] for dead, but lz has extra inv at end — fix dead+inv in post-pass
  syncEnts(LAVA_ZOMBIES, st.lz || [],
    z => ({ cx:z[0],cy:z[1],_tx:z[0],_ty:z[1],hp:z[2],maxHp:z[3]||300,dead:z[6]===1,hitFlash:0,deathTimer:0,
            invincTimer:z[7]?60:0,abilityTimer:0,chargeTimer:0,state:'walk',vx:0,vy:0,frame:z[5]||0,ft:0 }), 3);
  LAVA_ZOMBIES.forEach((z, i) => {
    const rd = (st.lz || [])[i]; if (!rd) return;
    z.dead = rd[6] === 1;        // correct the dead field (syncEnts used rd[7]=inv by mistake)
    z.invincTimer = rd[7] ? 60 : 0;
  });

  // Lava shards & pools (replace-array like FLAMES)
  LAVA_SHARDS.length = 0;
  (st.ls || []).forEach(s => {
    const scale = TW / 48;
    LAVA_SHARDS.push({ x:s[0]*scale, y:s[1]*scale, vx:s[2]*scale/2, vy:s[3]*scale/2, life:s[4] });
  });
  LAVA_POOLS.length = 0;
  (st.lp || []).forEach(p => LAVA_POOLS.push({ cx:p[0], cy:p[1], life:p[2], dmgTimer:0 }));

  // Exploders: [cx,cy,hp,maxHp,facing,frame,dead(6)]
  syncEnts(EXPLODERS, st.ex || [],
    e => ({ cx:e[0],cy:e[1],_tx:e[0],_ty:e[1],hp:e[2],maxHp:e[3]||30,dead:e[6]===1,hitFlash:0,deathTimer:0,exploded:false,vx:0,vy:0 }), 3);

  // Phantoms: [cx,cy,hp,maxHp,facing,frame,dead(6),phase(7)]
  // Extra phase field at end — fix dead + invincTimer in post-pass
  syncEnts(PHANTOMS, st.ph || [],
    p => ({ cx:p[0],cy:p[1],_tx:p[0],_ty:p[1],hp:p[2],maxHp:p[3]||70,dead:p[6]===1,hitFlash:0,deathTimer:0,invincTimer:0,phaseTimer:0 }), 3);
  PHANTOMS.forEach((p, i) => {
    const rd = (st.ph || [])[i]; if (!rd) return;
    p.dead = rd[6] === 1;        // correct dead (syncEnts used rd[7]=phase)
    p.invincTimer = rd[7] ? 45 : 0;
  });

  // Boss demons: [cx,cy,hp,maxHp,facing,frame,dead(6)]
  syncEnts(BOSS_DEMONS, st.bd || [],
    b => ({ cx:b[0],cy:b[1],_tx:b[0],_ty:b[1],hp:b[2],maxHp:b[3]||7000,dead:b[6]===1,hitFlash:0,deathTimer:0,shootTimer:0,shootPhase:0 }), 3);

  // Boss shots (replace-array like FLAMES)
  BOSS_SHOTS.length = 0;
  (st.bs || []).forEach(b => {
    const scale = TW / 48;
    BOSS_SHOTS.push({ x:b[0]*scale, y:b[1]*scale, vx:b[2]*scale/2, vy:b[3]*scale/2, life:b[4] });
  });

  // Flames
  FLAMES.length = 0;
  st.fl.forEach(f => FLAMES.push({ x:f[0], y:f[1], vx:f[2], vy:f[3], life:f[4], maxLife:f[4] }));

  // Projectiles: managed by bullet_fired events (other players) and _local (own).
  // Snapshot does NOT touch bullets — they advance freely until life expires.
  // Only clear snapshot projectile data (st.pr) — nothing to do here.

  // Coins
  COINS.length = 0;
  st.co.forEach(c => COINS.push({ cx:c[0], cy:c[1], amount:c[2], bob:0 }));

  // Perks
  if (st.pk) {
    DROPPED_PERKS.length = 0;
    st.pk.forEach(pk => DROPPED_PERKS.push({ cx:pk[0], cy:pk[1], type:pk[2], life:pk[3], bob:0 }));
  }

  // Door state
  if (st.drs) {
    st.drs.forEach((unlocked, i) => {
      if (unlocked && DOORS[i] && !DOORS[i].unlocked) {
        DOORS[i].unlocked = true;
        DOORS[i].tiles.forEach(({r,c}) => { MAP[r][c] = T.FLOOR; });
      }
    });
  }

  // Game state
  const g = st.g;
  game.round = g.r; game.kills = g.k; game.score = g.sc;
  game.state = g.st; game.waveTimer = g.wt; spawnRemaining = g.sp;
}

// Client-side interpolation between server snapshots
function mpAnimate() {
  const L = 0.35;

  // Client-side predict own movement
  if (!player.dead && !player.downed && game.state === 'playing') {
    let dx=0, dy=0;
    if (keys['w']||keys['arrowup'])    dy -= 1;
    if (keys['s']||keys['arrowdown'])  dy += 1;
    if (keys['a']||keys['arrowleft'])  dx -= 1;
    if (keys['d']||keys['arrowright']) dx += 1;
    // Right-click move (when no WASD) — identical logic to solo updatePlayer()
    if (dx===0 && dy===0 && clickTarget) {
      const cdx=clickTarget.cx-player.cx, cdy=clickTarget.cy-player.cy;
      const dist=Math.hypot(cdx,cdy);
      if (dist<0.12) { clickTarget=null; }
      else { dx=cdx/dist; dy=cdy/dist; }
    } else if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    player.moving = dx !== 0 || dy !== 0;
    player.speed = PLAYER_SPEED * (1 + Math.min(player.upgrades.moveSpeed, 5) * 0.12);
    if (player.moving) {
      const nx = player.cx + dx * player.speed, ny = player.cy + dy * player.speed;
      if (canWalk(nx, player.cy)) player.cx = nx;
      if (canWalk(player.cx, ny)) player.cy = ny;
      player.ft += 1/60;
      if (player.ft >= 0.095) { player.frame = (player.frame + 1) % 6; player.ft = 0; }
    }
    player.facing = dir8((mouse.x + camX) - player.cx * TW, (mouse.y + camY) - player.cy * TH);
    if (player.hurtTimer > 0) player.hurtTimer--;

    // Local shooting — immediate visual feedback, no waiting for server RTT
    if (!player._mpShootCD) player._mpShootCD = 0;
    if (player._mpShootCD > 0) player._mpShootCD--;
    if (mouse.down && player._mpShootCD <= 0 && !shopOpen) {
      const w = WEAPONS[player.weaponKey];
      const hasAmmo = player.weaponKey === 'pistol' || player.ammo > 0;
      if (hasAmmo && !(player.weaponKey === 'pistol' && player.overheated)) {
        player._mpShootCD = w.fireRate;
        const sx=player.cx*TW, sy=player.cy*TH;
        const ang=Math.atan2((mouse.y+camY)-sy,(mouse.x+camX)-sx);
        if (!w.wave) {
          for (let i=0;i<w.pellets;i++){
            const a=ang+(Math.random()-.5)*w.spread*2;
            projectiles.push({x:sx,y:sy,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,
              trail:[],life:90,wkey:player.weaponKey,_local:true});
          }
          muzzleFlash=6; muzzleColor=w.color;
        } else {
          spawnEffect('windwave',sx,sy,{ang,halfAng:WAVE_HALFANG,range:WAVE_RANGE});
          muzzleFlash=10; muzzleColor='#60e8ff';
        }
        // Immediate ammo + heat feedback
        if (player.weaponKey!=='pistol' && player.ammo>0) player.ammo--;
        if (player.weaponKey==='pistol') {
          player.heat=Math.min(100,player.heat+15);
          if (player.heat>=100) player.overheated=true;
          playPistolSound();
        }
      }
    }
  }

  // Lerp remote players
  REMOTE_PLAYERS_MAP.forEach(rp => {
    if (rp._tx !== undefined) {
      const ex = rp._tx - rp.cx, ey = rp._ty - rp.cy;
      const d = Math.hypot(ex, ey);
      if (d > 3) { rp.cx = rp._tx; rp.cy = rp._ty; }
      else { rp.cx += ex * L; rp.cy += ey * L; }
    }
    if (rp.moving) {
      rp.ft = (rp.ft || 0) + 1;
      if (rp.ft >= 8) { rp.ft = 0; rp.frame = (rp.frame + 1) % 6; }
    }
  });

  // Lerp enemies
  ZOMBIES.forEach(z => {
    if (z._tx !== undefined) { z.cx += (z._tx - z.cx) * L; z.cy += (z._ty - z.cy) * L; }
    z._ft = (z._ft || 0) + 1/60;
    if (z._ft >= 0.11) { z._ft = 0; z.frame = (z.frame + 1) % 8; }
    if (z.hitFlash > 0) z.hitFlash--;
  });
  SKELETONS.forEach(s => {
    if (s._tx !== undefined) { s.cx += (s._tx - s.cx) * L; s.cy += (s._ty - s.cy) * L; }
    s._ft = (s._ft || 0) + 1/60;
    if (s._ft >= 0.09) { s._ft = 0; s.frame = (s.frame + 1) % 4; }
    if (s.hitFlash > 0) s.hitFlash--;
  });
  DRAGONS.forEach(d => {
    if (d._tx !== undefined) { d.cx += (d._tx - d.cx) * L; d.cy += (d._ty - d.cy) * L; }
    d._ft = (d._ft || 0) + 1/60;
    if (d._ft >= 0.11) { d._ft = 0; d.frame = (d.frame + 1) % 8; }
    if (d.hitFlash > 0) d.hitFlash--;
  });
  LAVA_ZOMBIES.forEach(z => {
    if (z._tx !== undefined) { z.cx += (z._tx - z.cx) * L; z.cy += (z._ty - z.cy) * L; }
    z._ft = (z._ft || 0) + 1/60;
    if (z._ft >= 0.11) { z._ft = 0; z.frame = (z.frame + 1) % 8; }
    if (z.hitFlash > 0) z.hitFlash--;
    if (z.deathTimer > 0) z.deathTimer--;
  });
  EXPLODERS.forEach(e => {
    if (e._tx !== undefined) { e.cx += (e._tx - e.cx) * L; e.cy += (e._ty - e.cy) * L; }
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.deathTimer > 0) e.deathTimer--;
  });
  PHANTOMS.forEach(p => {
    if (p._tx !== undefined) { p.cx += (p._tx - p.cx) * L; p.cy += (p._ty - p.cy) * L; }
    if (p.hitFlash > 0) p.hitFlash--;
    if (p.deathTimer > 0) p.deathTimer--;
  });
  BOSS_DEMONS.forEach(b => {
    if (b._tx !== undefined) { b.cx += (b._tx - b.cx) * L; b.cy += (b._ty - b.cy) * L; }
    if (b.hitFlash > 0) b.hitFlash--;
    if (b.deathTimer > 0) b.deathTimer--;
  });

  // Advance projectiles locally between snapshots
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.trail = p.trail || [];
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 8) p.trail.pop();
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) { projectiles.splice(i, 1); continue; }
    const tr = p.y / TH | 0, tc = p.x / TW | 0;
    if (tr < 0 || tr >= MAP_H || tc < 0 || tc >= MAP_W || MAP[tr]?.[tc] === T.WALL || MAP[tr]?.[tc] === T.PILLAR) {
      projectiles.splice(i, 1);
    }
  }

  // Advance flames
  FLAMES.forEach(f => { f.x += f.vx; f.y += f.vy; f.life--; });
  for (let i = FLAMES.length - 1; i >= 0; i--) { if (FLAMES[i].life <= 0) FLAMES.splice(i, 1); }
  // Advance lava shards & boss shots between snapshots
  LAVA_SHARDS.forEach(s => { s.x += s.vx; s.y += s.vy; s.life--; });
  for (let i = LAVA_SHARDS.length - 1; i >= 0; i--) { if (LAVA_SHARDS[i].life <= 0) LAVA_SHARDS.splice(i, 1); }
  BOSS_SHOTS.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
  for (let i = BOSS_SHOTS.length - 1; i >= 0; i--) { if (BOSS_SHOTS[i].life <= 0) BOSS_SHOTS.splice(i, 1); }

  COINS.forEach(c => { c.bob = (c.bob || 0) + 0.08; });
  updateDmgNums();
  updateEffects();
}

// Draw remote players
function drawRemotePlayers() {
  REMOTE_PLAYERS_MAP.forEach(rp => {
    if (rp.dead) return;
    const px = rp.cx * TW, py = rp.cy * TH, sz = TW * 1.45;
    const img = rp.moving ? charWalk[rp.facing]?.[rp.frame % 6] : charIdle[rp.facing];
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, px-sz/2, py-sz/2, sz, sz);
    else { ctx.fillStyle = rp.color; ctx.beginPath(); ctx.arc(px, py, TW*.38, 0, Math.PI*2); ctx.fill(); }
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillStyle = rp.color; ctx.font = `bold ${Math.round(TW*.26)}px Segoe UI`;
    ctx.fillText(rp.name, px, py - sz*.56);
    const bw=sz*.72, bh=Math.max(3,TH*.08), bx=px-bw/2, by=py-sz*.52;
    ctx.fillStyle='#300'; ctx.fillRect(bx, by, bw, bh);
    const hf = rp.hp / rp.maxHp;
    ctx.fillStyle = hf>.5 ? '#2ecc40' : hf>.25 ? '#e6c020' : '#e74c3c';
    ctx.fillRect(bx, by, bw*hf, bh);
    if (rp.downed) {
      ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(bx,by,bw,bh);
      ctx.textBaseline='middle'; ctx.fillStyle='#ff4444';
      ctx.font=`bold ${Math.round(TW*.22)}px Segoe UI`;
      ctx.fillText('DOWN', px, py);
      if (rp.reviveProgress > 0) {
        ctx.strokeStyle='#00ffaa'; ctx.lineWidth=3;
        ctx.beginPath();
        ctx.arc(px, py, TW*.6, -Math.PI/2, -Math.PI/2 + Math.PI*2*(rp.reviveProgress/240));
        ctx.stroke();
      }
    }
  });
  if (player.downed) {
    const px=player.cx*TW, py=player.cy*TH;
    ctx.fillStyle='rgba(255,40,40,.12)'; ctx.beginPath(); ctx.arc(px,py,TW*.65,0,Math.PI*2); ctx.fill();
    if (player.reviveProgress > 0) {
      ctx.strokeStyle='#00ffaa'; ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(px, py, TW*.75, -Math.PI/2, -Math.PI/2 + Math.PI*2*(player.reviveProgress/240));
      ctx.stroke();
    }
  }
}

// Downed overlay
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
  ctx.fillText(`A teammate can revive you  •  ${Math.ceil(player.downedTimer/60)}s remaining`, W/2, H/2+2);
  if (player.reviveProgress > 0) {
    const bw=260, bh=10, bx=W/2-bw/2, by=H/2+30;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='#00ffaa'; ctx.fillRect(bx,by,bw*(player.reviveProgress/240),bh);
    ctx.fillStyle='#00ffaa'; ctx.font=`${Math.round(W*.013)}px Segoe UI`;
    ctx.fillText('Being revived...', W/2, by+bh+14);
  }
}

// Ping HUD
function drawPingHUD() {
  if (!mp.active) return;
  const W=canvas.width, ping=mp.ping;
  const col = ping<80 ? '#00ff88' : ping<150 ? '#ffcc00' : '#ff4444';
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(W-120, 4, 116, 22);
  ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillStyle=col; ctx.font='bold 12px Segoe UI';
  ctx.fillText(`MP  ${ping}ms`, W-8, 15);
  ctx.restore();
}

// Send input to server
function sendMpInput() {
  if (!mp.socket || !mp.active) return;
  mp.socket.emit('player_input', {
    w: !!(keys['w']||keys['arrowup']),   s: !!(keys['s']||keys['arrowdown']),
    a: !!(keys['a']||keys['arrowleft']), d: !!(keys['d']||keys['arrowright']),
    mx: mouse.x + camX, my: mouse.y + camY,
    shooting: !!mouse.down, q: !!keys['q'], f: !!keys['f'], e: !!keys['e'],
    ctx: clickTarget ? clickTarget.cx : null, cty: clickTarget ? clickTarget.cy : null,
    ab1: !!(keys[KB.fireRing]),
    ab2: !!(keys[KB.barrier]),
    ab3: !!(keys[KB.speedBoost]),
  });
}

// Socket connection & lobby UI
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
  // bullet_fired: server tells us exactly where/when another player fired
  // This spawns the bullet at the character's position immediately — no mid-air appearance
  mp.socket.on('bullet_fired', bullets => {
    if (!mp.active || !mp.firstState) return;
    bullets.forEach(b => {
      if (b.sl === mp.slot) return; // skip own — we already have _local bullets
      // Server uses TW_S=48px/tile; client TW is dynamic. Scale to client pixel space.
      const scale = TW / 48;
      const px = b.x * scale, py = b.y * scale;
      const cvx = b.vx * scale / 2, cvy = b.vy * scale / 2; // px/tick→px/frame (30→60fps)
      projectiles.push({ x:px, y:py, vx:cvx, vy:cvy, wkey:b.wk,
        life:90, trail:[], prevX:px, prevY:py, slot:b.sl });
    });
  });
  mp.socket.on('game_start', ({ players }) => {
    console.log('[MP] game_start received, slot=', mp.slot);
    mp.players = players;
    REMOTE_PLAYERS_MAP.clear();
    REMOTE_PLAYERS.length = 0;
    mp.active = true; // set BEFORE startGame so startWave(1) is skipped
    player._snapped = false; // reset so reconciliation works fresh
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
  const name = (getUser()?.username) || 'Player' + Math.floor(Math.random()*999);
  document.getElementById('mpMsg').textContent = 'Connecting...';
  mpConnect(() => {
    mp.socket.emit('create_room', { name });
    mp.socket.once('room_created', ({ code, slot, players }) => {
      mp.room = code; mp.slot = slot; mp.players = players;
      document.getElementById('mpMsg').textContent = '';
      document.getElementById('mpLobbySetup').style.display = 'none';
      document.getElementById('mpLobbyRoom').style.display = 'block';
      document.getElementById('mpRoomCode').textContent = code;
      document.getElementById('mpStartBtn').style.display = 'block';
      document.getElementById('mpWaitMsg').style.display = 'none';
      renderMpLobby();
    });
  });
}

function mpJoin() {
  const code = document.getElementById('mpJoinCode').value.trim().toUpperCase();
  if (!code) { document.getElementById('mpMsg').textContent = 'Enter a room code'; return; }
  const name = (getUser()?.username) || 'Player' + Math.floor(Math.random()*999);
  document.getElementById('mpMsg').textContent = 'Connecting...';
  mpConnect(() => {
    mp.socket.emit('join_room', { code, name });
    mp.socket.once('room_joined', ({ code:c, slot, players }) => {
      mp.room = c; mp.slot = slot; mp.players = players;
      document.getElementById('mpMsg').textContent = '';
      document.getElementById('mpLobbySetup').style.display = 'none';
      document.getElementById('mpLobbyRoom').style.display = 'block';
      document.getElementById('mpRoomCode').textContent = c;
      document.getElementById('mpStartBtn').style.display = 'none';
      document.getElementById('mpWaitMsg').style.display = 'block';
      renderMpLobby();
    });
  });
}

function mpStartGame() {
  if (mp.socket) mp.socket.emit('start_game');
}

function mpClose() {
  document.getElementById('mpLobbySetup').style.display = 'block';
  document.getElementById('mpLobbyRoom').style.display = 'none';
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
