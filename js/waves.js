
// ─── WAVE / GAME STATE ────────────────────────────────────────────────────────
const game = { round:1, kills:0, score:0, state:'playing', waveTimer:0, scoreSaved:false, playTimeFrames:0 };
let spawnRemaining=0, spawnTimer=0;

function dragonCount(round) {
  if (round === 5) return 1;                      // special debut: 1 dragon
  if (round < 10) return 0;                       // quiet rounds 6–9
  return Math.floor((round - 10) / 5);            // r10-14:0  r15-19:1  r20-24:2  r25-29:3 …
}

function bossCount(round) {
  if (round === 15) return 1;                        // Eye Demon debut
  if (round > 20 && round % 5 === 0) return 1;      // every 5 rounds: r25, r30, r35...
  return 0;
}
function spiderBossCount(round) {
  if (round === 20) return 1;                        // Venom Queen debut
  if (round > 20 && round % 10 === 0) return 1;     // every 10 rounds paired with Eye Demon
  return 0;
}

function lavaZombieCount(round) {
  if (round < 12) return 0;
  return Math.floor((round - 12) / 4) + 1; // r12:1  r16:2  r20:3 ...
}

function startWave(round) {
  ZOMBIES.length=0; DRAGONS.length=0; SKELETONS.length=0; FLAMES.length=0; LAVA_ZOMBIES.length=0; LAVA_SHARDS.length=0; LAVA_POOLS.length=0;
  BOSS_DEMONS.length=0; BOSS_SHOTS.length=0;
  SPIDER_BOSSES.length=0; SPIDER_WEB_SHOTS.length=0; SPIDER_MINIONS.length=0;
  EXPLODERS.length=0; PHANTOMS.length=0;
  projectiles.length=0; dmgNums.length=0;
  spawnRemaining=5+round*2; spawnTimer=20;
  const nd=dragonCount(round);
  for(let i=0;i<nd;i++) DRAGONS.push(spawnDragon());
  const ns=skeletonCount(round);
  for(let i=0;i<ns;i++) SKELETONS.push(spawnSkeleton());
  if(bossCount(round)>0) BOSS_DEMONS.push(spawnBossDemon());
  if(spiderBossCount(round)>0) SPIDER_BOSSES.push(spawnSpiderBoss());
  const nlv=lavaZombieCount(round);
  for(let i=0;i<nlv;i++) LAVA_ZOMBIES.push(spawnLavaZombie());
  const ne=exploderCount(round);
  for(let i=0;i<ne;i++) EXPLODERS.push(spawnExploder());
  const np=phantomCount(round);
  for(let i=0;i<np;i++) PHANTOMS.push(spawnPhantom());
}

function updateWave() {
  if (game.state==='game_over') return;
  game.playTimeFrames++; // counts real play time (paused & game_over excluded)
  if (game.state==='wave_clear'){
    game.waveTimer--;
    if(game.waveTimer<=0){game.round++;startWave(game.round);game.state='playing';mercUpgradeOpen=false;}
    return;
  }
  // Spawn queue — faster spawn rate at higher rounds (min 12 frames)
  const spawnInterval = Math.max(12, 28 - Math.floor(game.round / 3));
  if(spawnRemaining>0){
    spawnTimer++;
    if(spawnTimer>=spawnInterval){spawnTimer=0;spawnRemaining--;ZOMBIES.push(spawnZombie());}
  }
  // Check clear — all enemies and bosses must be dead (spiderlings don't count)
  if(spawnRemaining===0&&ZOMBIES.every(z=>z.dead)&&DRAGONS.every(d=>d.dead)&&SKELETONS.every(s=>s.dead)&&BOSS_DEMONS.every(b=>b.dead)&&LAVA_ZOMBIES.every(z=>z.dead)&&SPIDER_BOSSES.every(b=>b.dead)&&EXPLODERS.every(e=>e.dead)&&PHANTOMS.every(p=>p.dead)){
    game.state='wave_clear';game.waveTimer=600;
  }
}

function restartGame() {
  Object.assign(player,{cx:PLAYER_START.cx,cy:PLAYER_START.cy,hp:100,hurtTimer:0,dead:false,moving:false,speed:PLAYER_SPEED,facing:'south',frame:0,ft:0,
    money:0, goldEarned:0, upgrades:{damage:0,atkSpeed:0,crit:0,moveSpeed:0,hpRegen:0}, weaponKey:'pistol', ammo:Infinity,
    secondaryKey:null, secondaryAmmo:0, regenTimer:0, regenAccum:0, heat:0, overheated:false,
    downed:false, downedTimer:0, reviveProgress:0});
  player.packedWeapons = new Set();
  player.doublePapWeapons = new Set();
  player.ricochets = 0;
  stopLaserChargeSound(); laserChargeTimer = 0; laserBeam = null; laserWasMouseDown = false;
  player.pistolSpread = 0;
  player.spreadOrbs = 0;
  player.webSlowTimer = 0;
  player.dashCooldown = 0; player.dashTimer = 0; player.dashTrail = [];
  player.fireCooldown = 0; player.fireRingTimer = 0; player.fireRingAngle = 0;
  player.barrierCooldown = 0; player.barrierTimer = 0;
  player.speedBoostCooldown = 0; player.speedBoostTimer = 0; player.speedBoostTrail = [];
  player.perks = { magnet:0, shield:0, lifesteal:0, moveSpeed:0, hpRegen:0 };
  player.shield = 0; player.shieldRechargeTimer = 0;
  perkShopOpen = false;
  Object.assign(game,{round:1,kills:0,score:0,state:'playing',waveTimer:0,scoreSaved:false,playTimeFrames:0});
  Object.assign(box,{state:'idle',spinTimer:0,result:null,notifTimer:0,notifWeapon:''});
  DOORS.forEach(d=>{ if(!d.unlocked) return; d.unlocked=false; d.tiles.forEach(({r,c})=>{ MAP[r][c]=T.DOOR; }); });
  shopOpen=false; pistolUpgradeOpen=false; mercUpgradeOpen=false; COINS.length=0; DROPPED_PERKS.length=0; effects.length=0;
  DRAGONS.length=0; SKELETONS.length=0; FLAMES.length=0; LAVA_ZOMBIES.length=0; LAVA_SHARDS.length=0; LAVA_POOLS.length=0;
  BOSS_DEMONS.length=0; BOSS_SHOTS.length=0; SPREAD_DROPS.length=0; firstBossDropped=false;
  SPIDER_BOSSES.length=0; SPIDER_WEB_SHOTS.length=0; SPIDER_MINIONS.length=0; secondSpiderDropped=false;
  EXPLODERS.length=0; PHANTOMS.length=0; mercBullets.length=0;
  activePerkTimers.doublePoints=0; activePerkTimers.magnet=0;
  resetMercenary();
  startWave(1);
}
