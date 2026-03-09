
// ─── WAVE / GAME STATE ────────────────────────────────────────────────────────
const game = { round:1, kills:0, score:0, state:'playing', waveTimer:0, scoreSaved:false };
let spawnRemaining=0, spawnTimer=0;

function dragonCount(round) {
  if (round === 5) return 1;                      // special debut: 1 dragon
  if (round < 10) return 0;                       // quiet rounds 6–9
  return Math.floor((round - 10) / 5);            // r10-14:0  r15-19:1  r20-24:2  r25-29:3 …
}

function startWave(round) {
  ZOMBIES.length=0; DRAGONS.length=0; SKELETONS.length=0; FLAMES.length=0;
  projectiles.length=0; dmgNums.length=0;
  spawnRemaining=5+round*2; spawnTimer=20;
  const nd=dragonCount(round);
  for(let i=0;i<nd;i++) DRAGONS.push(spawnDragon());
  const ns=skeletonCount(round);
  for(let i=0;i<ns;i++) SKELETONS.push(spawnSkeleton());
}

function updateWave() {
  if (game.state==='game_over') return;
  if (game.state==='wave_clear'){
    game.waveTimer--;
    if(game.waveTimer<=0){game.round++;startWave(game.round);game.state='playing';}
    return;
  }
  // Spawn queue
  if(spawnRemaining>0){
    spawnTimer++;
    if(spawnTimer>=28){spawnTimer=0;spawnRemaining--;ZOMBIES.push(spawnZombie());}
  }
  // Check clear — all zombies, dragons AND skeletons must be dead
  if(spawnRemaining===0&&ZOMBIES.every(z=>z.dead)&&DRAGONS.every(d=>d.dead)&&SKELETONS.every(s=>s.dead)){
    game.state='wave_clear';game.waveTimer=180;
  }
}

function restartGame() {
  Object.assign(player,{cx:PLAYER_START.cx,cy:PLAYER_START.cy,hp:100,hurtTimer:0,dead:false,moving:false,speed:PLAYER_SPEED,facing:'south',frame:0,ft:0,
    money:0, goldEarned:0, upgrades:{damage:0,atkSpeed:0,crit:0,moveSpeed:0,hpRegen:0}, weaponKey:'pistol', ammo:Infinity,
    secondaryKey:null, secondaryAmmo:0, regenTimer:0, regenAccum:0, heat:0, overheated:false,
    downed:false, downedTimer:0, reviveProgress:0});
  player.packedWeapons = new Set();
  player.perks = { magnet:0, shield:0, lifesteal:0 };
  player.shield = 0; player.shieldRechargeTimer = 0;
  perkShopOpen = false;
  Object.assign(game,{round:1,kills:0,score:0,state:'playing',waveTimer:0,scoreSaved:false});
  Object.assign(box,{state:'idle',spinTimer:0,result:null,notifTimer:0,notifWeapon:''});
  DOORS.forEach(d=>{ if(!d.unlocked) return; d.unlocked=false; d.tiles.forEach(({r,c})=>{ MAP[r][c]=T.DOOR; }); });
  shopOpen=false; COINS.length=0; DROPPED_PERKS.length=0; effects.length=0;
  DRAGONS.length=0; SKELETONS.length=0; FLAMES.length=0;
  activePerkTimers.doublePoints=0; activePerkTimers.magnet=0;
  startWave(1);
}
