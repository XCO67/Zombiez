
// ─── RENDER LOOP ──────────────────────────────────────────────────────────────
let t = 0;
let gameStarted = false; // true once player clicks PLAY
const FRAME_MS = 1000 / 60; // fixed physics step (60 Hz)
let lastFrameTime = 0;
let accumulated   = 0;    // ms of unprocessed time

function _runGameLogic() {
  // All physics/game-state updates — runs at fixed 60fps step
  if (mp.active) {
    sendMpInput();
    updateCamera();
  } else if (game.state !== 'paused') {
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

function render(now) {
  requestAnimationFrame(render);

  _tt = now / 1000; // wall-clock seconds for visuals

  if (!gameStarted) return;

  const dt = Math.min(now - lastFrameTime, 100); // cap: ignore >100ms gaps (tab hidden)
  lastFrameTime = now;
  accumulated += dt;

  // Run physics in fixed steps — up to 3 catch-up steps to avoid spiral of death
  let steps = 0;
  while (accumulated >= FRAME_MS && steps < 3) {
    accumulated -= FRAME_MS;
    t += 0.04;
    _runGameLogic();
    steps++;
  }

  // ── Multiplayer waiting screen ────────────────────────────────────────────────
  if (mp.active && !mp.firstState) {
    ctx.fillStyle='#060410'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#00ffaa'; ctx.font=`bold ${Math.round(canvas.width*.026)}px Segoe UI`;
    ctx.fillText('Waiting for server...', canvas.width/2, canvas.height/2);
    ctx.fillStyle='rgba(255,255,255,.3)'; ctx.font=`${Math.round(canvas.width*.014)}px Segoe UI`;
    ctx.fillText('Room: '+mp.room, canvas.width/2, canvas.height/2+44);
    return;
  }
  if (mp.active) mpAnimate();

  // ── Fill background ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#0c0b12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── World rendering (camera transform) ───────────────────────────────────────
  ctx.save();
  ctx.translate(-camX, -camY);

  for (let r=0;r<MAP_H;r++) for (let c=0;c<MAP_W;c++) {
    const type=MAP[r][c];
    if      (type===T.WALL)         drawWall(r,c);
    else if (type===T.PILLAR)       drawPillar(r,c);
    else if (type===T.DOOR)         drawDoor(r,c);
    else if (type===T.BOSS_SPAWN)   drawBossSpawnTile(r,c);
    else if (type===T.SPIDER_SPAWN) drawSpiderSpawnTile(r,c);
    else if (type===T.FLOOR2)        drawFloor(r,c,T.FLOOR2);
    else if (type===T.COLOR_FLOOR)   drawColorFloor(r,c);
    else if (type===T.LAVA_FLOOR)    drawLavaFloor(r,c);
    else if (type===T.ICE_FLOOR)     drawIceFloor(r,c);
    else if (type===T.ANCIENT_STONE) drawAncientStone(r,c);
    else if (type===T.WOOD_FLOOR)    drawWoodFloor(r,c);
    else if (type===T.MOSSY_FLOOR)   drawMossyFloor(r,c);
    else                             drawFloor(r,c,type);
  }
  drawWallShadows();
  drawDoorPrompts();

  // Torches
  const flickers=TORCHES.map((_,i)=>Math.sin(t*2.8+i*1.87)*.5+.5);
  TORCHES.forEach(([r,c,color,opacity],i)=>drawTorch(r,c,flickers[i],color,opacity));

  // Decorations — drawn on the ground before entities
  drawDecorations();

  // Entities — Y-sorted
  drawFlames();
  drawLavaPools();
  drawFireRing();
  drawBarrier();
  const entities=[
    {y:player.cy*TH, draw:drawPlayer},
    ...ZOMBIES.map(z=>({y:z.cy*TH, draw:()=>drawZombie(z)})),
    ...SKELETONS.map(s=>({y:s.cy*TH, draw:()=>drawSkeleton(s)})),
    ...DRAGONS.map(d=>({y:d.cy*TH, draw:()=>drawDragon(d)})),
    ...BOSS_DEMONS.map(b=>({y:b.cy*TH, draw:()=>drawBossDemon(b)})),
    ...SPIDER_BOSSES.map(b=>({y:b.cy*TH, draw:()=>drawSpiderBoss(b)})),
    ...SPIDER_MINIONS.map(m=>({y:m.cy*TH, draw:()=>drawSpiderMinion(m)})),
    ...LAVA_ZOMBIES.map(z=>({y:z.cy*TH, draw:()=>drawLavaZombie(z)})),
    ...EXPLODERS.map(e=>({y:e.cy*TH, draw:()=>drawExploder(e)})),
    ...PHANTOMS.map(ph=>({y:ph.cy*TH, draw:()=>drawPhantom(ph)}))
  ];
  entities.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
  drawRemotePlayers();

  // World-space interactables
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

  ctx.restore(); // end camera transform

  // ── Screen-space overlays ─────────────────────────────────────────────────────
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
  drawPingHUD();
  drawCursor();
}

render(0);
