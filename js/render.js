
// ─── RENDER LOOP ──────────────────────────────────────────────────────────────
let t = 0;
let gameStarted = false; // true once player clicks PLAY
const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function render(now) {
  requestAnimationFrame(render);
  if (now - lastFrameTime < FRAME_MS) return;
  lastFrameTime = now - ((now - lastFrameTime) % FRAME_MS);
  t += 0.04;
  if (!gameStarted) { return; }

  // ── Game logic ───────────────────────────────────────────────────────────────
  if (mp.active) {
    // Send input to server every other frame (30fps is enough)
    sendMpInput();
    if (!mp.firstState) {
      ctx.fillStyle='#060410'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#00ffaa'; ctx.font=`bold ${Math.round(canvas.width*.026)}px Segoe UI`;
      ctx.fillText('Waiting for server...', canvas.width/2, canvas.height/2);
      ctx.fillStyle='rgba(255,255,255,.3)'; ctx.font=`${Math.round(canvas.width*.014)}px Segoe UI`;
      ctx.fillText('Room: '+mp.room, canvas.width/2, canvas.height/2+44);
      return;
    }
    updateCamera();
    mpAnimate();
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
    updateSpreadDrops();
    updateLavaZombies();
    updateLavaShards();
    updateLavaPools();
    updateProjectiles();
    updateDmgNums();
    updateCoins();
    updatePerks();
    updateBox();
    updateEffects();
    updateWave();
  } else {
    updateCamera(); // keep camera steady while paused
  }

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
    else if (type===T.FLOOR2)       drawFloor(r,c,T.FLOOR2);
    else if (type===T.COLOR_FLOOR)  drawColorFloor(r,c);
    else                            drawFloor(r,c,type);
  }
  drawWallShadows();
  drawDoorPrompts();

  // Torches — support optional [r, c, '#color'] format
  const flickers=TORCHES.map((_,i)=>Math.sin(t*2.8+i*1.87)*.5+.5);
  TORCHES.forEach(([r,c,color,opacity],i)=>drawTorch(r,c,flickers[i],color,opacity));

  // Entities — Y-sorted
  drawFlames();
  drawLavaPools();
  drawFireRing();
  const entities=[
    {y:player.cy*TH, draw:drawPlayer},
    ...ZOMBIES.map(z=>({y:z.cy*TH, draw:()=>drawZombie(z)})),
    ...SKELETONS.map(s=>({y:s.cy*TH, draw:()=>drawSkeleton(s)})),
    ...DRAGONS.map(d=>({y:d.cy*TH, draw:()=>drawDragon(d)})),
    ...BOSS_DEMONS.map(b=>({y:b.cy*TH, draw:()=>drawBossDemon(b)})),
    ...SPIDER_BOSSES.map(b=>({y:b.cy*TH, draw:()=>drawSpiderBoss(b)})),
    ...SPIDER_MINIONS.map(m=>({y:m.cy*TH, draw:()=>drawSpiderMinion(m)})),
    ...LAVA_ZOMBIES.map(z=>({y:z.cy*TH, draw:()=>drawLavaZombie(z)}))
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
  // Web slow vignette (Venom Queen)
  if (player.webSlowTimer > 0) {
    const wAlpha = Math.min(1, player.webSlowTimer / 60) * 0.38;
    const wg = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.28, canvas.width/2, canvas.height/2, canvas.height*0.75);
    wg.addColorStop(0, 'rgba(0,0,0,0)');
    wg.addColorStop(1, `rgba(0,180,30,${wAlpha})`);
    ctx.fillStyle = wg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // "WEBBED" text
    const wPulse = Math.sin(performance.now() / 250) * 0.4 + 0.6;
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
  drawDownedHUD();
  drawPingHUD();
  if (game.state === 'paused') drawPauseScreen();
  drawCursor();

}

function drawPauseScreen() {
  const W = canvas.width, H = canvas.height;
  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  // Card
  const cw = Math.round(W * 0.36), ch = Math.round(H * 0.28);
  const cx2 = W/2, cy2 = H/2;
  ctx.save();
  ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 32;
  ctx.fillStyle = 'rgba(8,4,20,0.92)';
  roundRect(ctx, cx2-cw/2, cy2-ch/2, cw, ch, 18, true, false);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,255,170,0.35)'; ctx.lineWidth = 2;
  roundRect(ctx, cx2-cw/2, cy2-ch/2, cw, ch, 18, false, true);
  // Title
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#00ffaa'; ctx.font = `bold ${Math.round(W*0.038)}px Segoe UI`;
  ctx.fillText('PAUSED', cx2, cy2 - ch*0.18);
  // Divider
  ctx.strokeStyle = 'rgba(0,255,170,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx2-cw*.38, cy2+ch*0.02); ctx.lineTo(cx2+cw*.38, cy2+ch*0.02); ctx.stroke();
  // Hint
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${Math.round(W*0.018)}px Segoe UI`;
  ctx.fillText('Press  ESC  to resume', cx2, cy2 + ch*0.22);
}

render(0);
