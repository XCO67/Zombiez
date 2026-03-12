
// ─── RENDER LOOP ──────────────────────────────────────────────────────────────
let t = 0;
let gameStarted = false;
const FRAME_MS = 1000 / 60;
let lastFrameTime = 0;
let accumulated   = 0;

// ── Offscreen tile cache ──────────────────────────────────────────────────────
// Tiles are static (walls, floors) — draw them once to an offscreen canvas
// and blit it each frame instead of redrawing 1120+ tiles individually.
var tileCacheDirty = true; // var so map.js can set it before render.js loads
let _tileCanvas = null;
let _tileCtx    = null;

function _buildTileCache() {
  const W = MAP_W * TW, H = MAP_H * TH;
  if (!_tileCanvas || _tileCanvas.width !== W || _tileCanvas.height !== H) {
    _tileCanvas = document.createElement('canvas');
    _tileCanvas.width  = W;
    _tileCanvas.height = H;
    _tileCtx = _tileCanvas.getContext('2d');
  }
  // Temporarily swap the global ctx so tile draw functions render to our cache
  const mainCtx = ctx;
  ctx = _tileCtx;
  _tileCtx.clearRect(0, 0, W, H);

  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const type = MAP[r][c];
      if      (type === T.WALL)          drawWall(r, c);
      else if (type === T.PILLAR)        drawPillar(r, c);
      else if (type === T.DOOR)          drawDoor(r, c);
      else if (type === T.BOSS_SPAWN)    drawBossSpawnTile(r, c);
      else if (type === T.SPIDER_SPAWN)  drawSpiderSpawnTile(r, c);
      else if (type === T.FLOOR2)        drawFloor(r, c, T.FLOOR2);
      else if (type === T.COLOR_FLOOR)   drawColorFloor(r, c);
      else if (type === T.ANCIENT_STONE) drawAncientStone(r, c);
      else if (type === T.WOOD_FLOOR)    drawWoodFloor(r, c);
      else if (type === T.MOSSY_FLOOR)   drawMossyFloor(r, c);
      else if (type === T.LAVA_FLOOR)    drawFloor(r, c, T.FLOOR); // placeholder; drawn live
      else if (type === T.ICE_FLOOR)     drawFloor(r, c, T.FLOOR); // placeholder; drawn live
      else                               drawFloor(r, c, type);
    }
  }
  // Wall shadows baked into cache too
  drawWallShadows();

  ctx = mainCtx;
  tileCacheDirty = false;
}

// ── Physics step ─────────────────────────────────────────────────────────────
function _runGameLogic() {
  if (game.state !== 'paused') {
    updateCamera();
    updatePlayer();
    tryShoot();
    updateZombies();
    updateSkeletons();
    updateDragons();
    updateFlames();
    updateBossDemons();
    updateBossShots();
    updateSpiderBosses();
    updateSpiderMinions();
    updateSpiderWebShots();
    updateFireRing();
    updateBarrier();
    updateSpeedBoost();
    updateSpreadDrops();
    updateLavaZombies();
    updateLavaShards();
    updateLavaPools();
    updateExploders();
    updatePhantoms();
    updateMercenary();
    updateProjectiles();
    updateDmgNums();
    updateCoins();
    updatePerks();
    updateBox();
    updateEffects();
    updateWave();
  } else {
    updateCamera();
  }
}

// ── Reusable entities array (avoid GC pressure from spread operators) ─────────
const _entities = [];

function render(now) {
  requestAnimationFrame(render);

  _tt = now / 1000;

  if (!gameStarted) return;

  // Smooth zoom — must run BEFORE physics so updateCamera() uses correct TW
  if (Math.abs(_targetViewW - VIEW_W) > 0.05) {
    VIEW_W += (_targetViewW - VIEW_W) * 0.18;
    TW = canvas.width / VIEW_W; TH = TW;
    updateCamera(); // resync camera with new TW immediately
  } else if (VIEW_W !== _targetViewW) {
    VIEW_W = _targetViewW;
    TW = canvas.width / VIEW_W; TH = TW;
    tileCacheDirty = true; // settled — rebuild cache at final zoom level
    updateCamera();
  }

  // Fixed-timestep physics — max 2 catch-up steps to avoid spiral of death
  const dt = Math.min(now - lastFrameTime, 100);
  lastFrameTime = now;
  accumulated += dt;
  let steps = 0;
  while (accumulated >= FRAME_MS && steps < 2) {
    accumulated -= FRAME_MS;
    t += 0.04;
    _runGameLogic();
    steps++;
  }

  // ── Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#0c0b12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── World (camera transform) ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camX, -camY);

  // Blit cached tile layer — scaled to current TW (no rebuild on zoom frames)
  if (tileCacheDirty) _buildTileCache();
  ctx.drawImage(_tileCanvas, 0, 0, MAP_W * TW, MAP_H * TH);

  // Animated tiles drawn per-frame on top of cache
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const type = MAP[r][c];
      if      (type === T.LAVA_FLOOR) drawLavaFloor(r, c);
      else if (type === T.ICE_FLOOR)  drawIceFloor(r, c);
    }
  }

  drawDoorPrompts();

  // Torches
  const flickers = TORCHES.map((_, i) => Math.sin(t * 2.8 + i * 1.87) * .5 + .5);
  TORCHES.forEach(([r, c, color, opacity], i) => drawTorch(r, c, flickers[i], color, opacity));

  // Decorations
  drawDecorations();

  // Entities — Y-sorted (reuse array to avoid GC)
  _entities.length = 0;
  _entities.push({ y: player.cy * TH, draw: drawPlayer });
  for (let i = 0; i < ZOMBIES.length;       i++) { const z = ZOMBIES[i];       _entities.push({ y: z.cy * TH,  draw: () => drawZombie(z) }); }
  for (let i = 0; i < SKELETONS.length;     i++) { const s = SKELETONS[i];     _entities.push({ y: s.cy * TH,  draw: () => drawSkeleton(s) }); }
  for (let i = 0; i < DRAGONS.length;       i++) { const d = DRAGONS[i];       _entities.push({ y: d.cy * TH,  draw: () => drawDragon(d) }); }
  for (let i = 0; i < BOSS_DEMONS.length;   i++) { const b = BOSS_DEMONS[i];   _entities.push({ y: b.cy * TH,  draw: () => drawBossDemon(b) }); }
  for (let i = 0; i < SPIDER_BOSSES.length; i++) { const b = SPIDER_BOSSES[i]; _entities.push({ y: b.cy * TH,  draw: () => drawSpiderBoss(b) }); }
  for (let i = 0; i < SPIDER_MINIONS.length;i++) { const m = SPIDER_MINIONS[i];_entities.push({ y: m.cy * TH,  draw: () => drawSpiderMinion(m) }); }
  for (let i = 0; i < LAVA_ZOMBIES.length;  i++) { const z = LAVA_ZOMBIES[i];  _entities.push({ y: z.cy * TH,  draw: () => drawLavaZombie(z) }); }
  for (let i = 0; i < EXPLODERS.length;     i++) { const e = EXPLODERS[i];     _entities.push({ y: e.cy * TH,  draw: () => drawExploder(e) }); }
  for (let i = 0; i < PHANTOMS.length;      i++) { const ph = PHANTOMS[i];     _entities.push({ y: ph.cy * TH, draw: () => drawPhantom(ph) }); }
  if (mercenary.active || (player.upgrades && player.upgrades.mercenary)) _entities.push({ y: mercenary.cy * TH, draw: drawMercenary });
  _entities.sort((a, b) => a.y - b.y);
  for (let i = 0; i < _entities.length; i++) _entities[i].draw();

  // World-space interactables & effects
  drawFlames();
  drawLavaPools();
  drawFireRing();
  drawBarrier();
  drawClickIndicator();
  drawShopMarker();
  drawAmmoStation();
  drawDevChest();
  drawPapMachine();
  drawPerkVendor();
  drawPistolVendor();
  drawRicochetVendor();
  drawGoldButtons();
  drawMysteryBox();
  drawCoins();
  drawPerks();
  drawEffects();
  drawProjectiles();
  drawBossShots();
  drawSpiderWebShots();
  drawSpreadDrops();
  drawLavaShards();

  ctx.restore();

  // ── Screen-space overlays ────────────────────────────────────────────────
  applyLighting(flickers);
  if (player.webSlowTimer > 0) {
    const wAlpha = Math.min(1, player.webSlowTimer / 60) * 0.38;
    const wg = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.28, canvas.width/2, canvas.height/2, canvas.height*0.75);
    wg.addColorStop(0, 'rgba(0,0,0,0)');
    wg.addColorStop(1, `rgba(0,180,30,${wAlpha})`);
    ctx.fillStyle = wg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const wPulse = Math.sin(_tt * 4) * 0.4 + 0.6;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `bold ${Math.round(canvas.height * 0.026)}px Segoe UI`;
    ctx.fillStyle = `rgba(80,255,100,${wPulse * 0.9})`;
    ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 10;
    ctx.fillText('🕸 WEBBED', Math.round(canvas.width * 0.01), Math.round(canvas.height * 0.60));
    ctx.restore();
  }
  drawDmgNums();
  drawHUD();
  drawWeaponInfo();
  drawMinimap();
  drawShopUI();
  drawPerkShopUI();
  drawPistolUpgradePanel();
  drawDownedHUD();
  drawCursor();
}

render(0);
