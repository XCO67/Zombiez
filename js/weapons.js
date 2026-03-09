
// ─── WEAPONS ──────────────────────────────────────────────────────────────────
// ammoCost: SMG $30/120 shots, Shotgun $75/64 shells, Thundergun $200/16 waves
const WEAPONS = {
  pistol:     { name:'Pistol',     fireRate:30, baseDmg:10,    ammoMax:Infinity, pellets:1,  spread:0,    speed:16, hitR:.55, pierce:false, color:'#60c0ff', trail:'#3080ff' },
  smg:        { name:'SMG',        fireRate:6,  baseDmg:8,     ammoMax:120,      pellets:1,  spread:0.12, speed:22, hitR:.45, pierce:false, color:'#ff8844', trail:'#ff5500', ammoCost:30  },
  shotgun:    { name:'Shotgun',    fireRate:38, baseDmg:18,    ammoMax:64,       pellets:7,  spread:0.36, speed:18, hitR:.45, pierce:false, color:'#ffcc44', trail:'#ff8800', ammoCost:75  },
  thundergun: { name:'Thundergun', fireRate:75, baseDmg:90,    ammoMax:16,       pellets:1,  spread:0,    speed:0,  hitR:0,   pierce:false, color:'#ffe044', trail:'#ffa500', wave:true,    ammoCost:200 },
  devgun:     { name:'DEV GUN',    fireRate:2,  baseDmg:99999, ammoMax:Infinity, pellets:3,  spread:0.08, speed:28, hitR:1.8, pierce:true,  color:'#ff00ff', trail:'#cc00ff', dev:true },
};
const BOX_POOL = ['smg','shotgun','thundergun'];

// ─── PLAYER ───────────────────────────────────────────────────────────────────
const PLAYER_SPEED = 0.032;
const player = {
  cx:PLAYER_START.cx, cy:PLAYER_START.cy, facing:'south',
  frame:0, ft:0, moving:false, speed:PLAYER_SPEED,
  hp:100, maxHp:100, hurtTimer:0, dead:false, downed:false, downedTimer:0, reviveProgress:0,
  money:0, goldEarned:0,
  upgrades:{ damage:0, atkSpeed:0, crit:0, moveSpeed:0, hpRegen:0 },
  weaponKey:'pistol', ammo:Infinity,
  secondaryKey:null, secondaryAmmo:0,
  regenTimer:0, regenAccum:0,
  heat:0, overheated:false,
  pistolSpread: 0,        // 0=1 bullet, 1=2 bullets, 2=3 bullets (unlocked via boss drops)
  spreadOrbs: 0,          // collected orbs waiting to be spent at Pistol Upgrade Vendor
  webSlowTimer: 0,        // frames remaining of Venom Queen web slow effect
  packedWeapons: new Set(),
  perks: { magnet:0, shield:0, lifesteal:0, moveSpeed:0, hpRegen:0 },
  shield:0, shieldRechargeTimer:0,
  dashCooldown: 0,   // frames remaining on cooldown (360 = 6s)
  dashTimer: 0,      // frames remaining in active dash burst
  dashTrail: [],     // [{cx,cy,facing,frame,a}] afterimage positions
};
