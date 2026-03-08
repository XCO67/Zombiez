const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html and game assets

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET || 'deadsurge_dev_secret';

// ── Bootstrap tables ──────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(30)  UNIQUE NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      round      INTEGER NOT NULL DEFAULT 0,
      kills      INTEGER NOT NULL DEFAULT 0,
      gold       INTEGER NOT NULL DEFAULT 0,
      score      INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[DB] tables ready');
}
initDB().catch(err => console.error('[DB] init error', err));

// ── Auth middleware ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── POST /api/register ────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username.trim(), email.toLowerCase().trim(), hash]
    );
    const user  = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.code === '23505') {
      const field = e.constraint?.includes('email') ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} is already taken` });
    }
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)  return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/me ───────────────────────────────────────────────────────────────
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/scores ──────────────────────────────────────────────────────────
app.post('/api/scores', authMiddleware, async (req, res) => {
  const { round, kills, gold, score } = req.body || {};
  try {
    await pool.query(
      'INSERT INTO scores (user_id, round, kills, gold, score) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, round|0, kills|0, gold|0, score|0]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.username, s.round, s.kills, s.gold, s.score,
             to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
      FROM   scores s
      JOIN   users  u ON s.user_id = u.id
      ORDER  BY s.round DESC, s.kills DESC, s.score DESC
      LIMIT  20
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GAME CONSTANTS (30tps — tick every 33ms, all durations = real_seconds × 30) ──
const T_S     = { WALL:0, FLOOR:1, PILLAR:2, SPAWN:3, DOOR:4 };
const MAP_W_S = 40, MAP_H_S = 28;
const TW_S = 48, TH_S = 48;
const PLAYER_R_S = 0.28;
const PLAYER_SPEED_S = 0.055 * 2;   // tiles/tick  (0.055 tiles/frame × 60fps / 30tps)
const ZOMBIE_SPEED_S  = 0.018 * 2;
const SKEL_SPEED_S    = 0.032 * 2;
const DRAGON_SPEED_S  = 0.012 * 2;
const FLAME_SPEED_S   = 5.5 * 2;    // px/tick
const SKEL_HP_S       = 110;
const DRAGON_HP_S     = 200;
const SKEL_STEAL_S    = 20;
const FLAME_DMG_S     = 20;
const DRAGON_FIRE_RANGE_S    = 10;   // tiles
const DRAGON_FIRE_INTERVAL_S = 45;   // ticks  (1.5s × 30)
const FLAME_LIFE_S    = 100;   // ticks  (3.33s × 30)
const HURT_TICKS_S    = 22;    // ticks  (0.75s × 30)
const DOWNED_TICKS_S  = 900;   // ticks  (30s × 30)
const REVIVE_TICKS_S  = 120;   // ticks  (4s × 30)
const WAVE_CLEAR_TICKS_S = 90; // ticks  (3s × 30)
const SPAWN_INT_S     = 13;    // ticks  (0.45s × 30)
const PROJ_LIFE_S     = 45;    // ticks  (1.5s × 30)
const WAVE_RANGE_S    = 10;    // tiles (thundergun cone)
const WAVE_HALFANG_S  = 0.72;
const BOX_COST_S      = 750;
const BOX_POOL_S      = ['smg','shotgun','thundergun'];
const PLAYER_START_S  = { cx: 19.5, cy: 13.5 };
const AMMO_POS_S      = { cx: 19.5, cy: 10 };
const AMMO_RADIUS_S   = 2.0;
const BOX_POS_S       = { cx: 24, cy: 3 };
const BOX_RADIUS_S    = 2.0;
const DEV_CHEST_POS_S = { cx: 19.5, cy: 16 };
const DEV_CHEST_RADIUS_S = 2.0;

const WEAPONS_S = {
  pistol:     { fireRate:11, baseDmg:10,    ammoMax:Infinity, pellets:1, spread:0,    speed:16*2, hitR:.55, pierce:false },
  smg:        { fireRate:3,  baseDmg:8,     ammoMax:120,      pellets:1, spread:0.12, speed:22*2, hitR:.45, pierce:false, ammoCost:30 },
  shotgun:    { fireRate:19, baseDmg:18,    ammoMax:64,       pellets:7, spread:0.36, speed:18*2, hitR:.45, pierce:false, ammoCost:75 },
  thundergun: { fireRate:38, baseDmg:90,    ammoMax:16,       pellets:1, spread:0,    speed:0,    hitR:0,   pierce:false, wave:true, ammoCost:200 },
  devgun:     { fireRate:1,  baseDmg:99999, ammoMax:Infinity, pellets:3, spread:0.08, speed:28*2, hitR:1.8, pierce:true },
};

const SHOP_ITEMS_S = [
  { key:'damage',    max:5, costs:[150,250,400,600,900] },
  { key:'atkSpeed',  max:5, costs:[150,250,400,600,900] },
  { key:'crit',      max:5, costs:[200,350,550,800,1100] },
  { key:'moveSpeed', max:5, costs:[100,200,350,550,800] },
  { key:'hpRegen',   max:5, costs:[200,350,550,800,1100] },
  { key:'maxHp',     max:5, costs:[200,350,500,700,1000] },
];

const DOORS_S = [
  { name:'East Wing',   tiles:[{r:3,c:23},{r:4,c:23},{r:5,c:23}], cx:23, cy:4, cost:750 },
  { name:'West Cellar', tiles:[{r:22,c:16},{r:23,c:16},{r:24,c:16}], cx:16, cy:23, cost:750 },
];

function buildMapS() {
  const m = Array.from({length: MAP_H_S}, () => new Uint8Array(MAP_W_S));
  const fill = (r1,r2,c1,c2,v) => { for(let r=r1;r<=r2;r++) for(let c=c1;c<=c2;c++) m[r][c]=v; };
  fill(8,19,10,29,1); fill(1,7,17,22,1); fill(20,26,17,22,1);
  fill(12,15,1,9,1);  fill(12,15,30,38,1);
  fill(10,11,13,14,2); fill(10,11,25,26,2);
  fill(16,17,13,14,2); fill(16,17,25,26,2);
  fill(1,2,17,22,3); fill(25,26,17,22,3);
  fill(12,15,1,2,3);  fill(12,15,37,38,3);
  fill(2,6,24,38,1);
  fill(3,5,23,23,4);
  fill(21,25,1,15,1);
  fill(22,24,16,16,4);
  return m;
}

function isBlockedS(map, cx, cy) {
  const minC=Math.floor(cx-PLAYER_R_S), maxC=Math.floor(cx+PLAYER_R_S);
  const minR=Math.floor(cy-PLAYER_R_S), maxR=Math.floor(cy+PLAYER_R_S);
  for(let row=minR;row<=maxR;row++) for(let col=minC;col<=maxC;col++){
    if(row<0||row>=MAP_H_S||col<0||col>=MAP_W_S) return true;
    const t=map[row][col];
    if(t===0||t===2||t===4) return true; // WALL, PILLAR, DOOR
  }
  return false;
}

function dir8S(dx, dy) {
  const DIRS=['east','south-east','south','south-west','west','north-west','north','north-east'];
  let a=Math.atan2(dy,dx)*180/Math.PI;
  if(a<0) a+=360;
  return DIRS[Math.round(a/45)%8];
}

function getSpawnTilesS(map) {
  const pts=[];
  for(let r=0;r<MAP_H_S;r++) for(let c=0;c<MAP_W_S;c++)
    if(map[r][c]===3) pts.push({cx:c+0.5, cy:r+0.5});
  if(!pts.length) {
    pts.push({cx:MAP_W_S*.5,cy:.5},{cx:MAP_W_S*.5,cy:MAP_H_S-.5},
             {cx:.5,cy:MAP_H_S*.5},{cx:MAP_W_S-.5,cy:MAP_H_S*.5});
  }
  return pts;
}

function makeCode() {
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code=Array.from({length:6},()=>chars[Math.random()*chars.length|0]).join(''); }
  while(rooms.has(code));
  return code;
}

const rooms = new Map();

class GameRoom {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // slot -> playerState
    this.nextSlot = 0;
    this.playerNames = new Map(); // slot -> name
    this.playerSockets = new Map(); // slot -> socketId
    this.inputs = new Map(); // slot -> inputState
    this.map = buildMapS();
    this.doors = DOORS_S.map(d => ({ ...d, tiles: d.tiles.map(t=>({...t})), unlocked: false }));

    // Game entities
    this.zombies    = [];
    this.skeletons  = [];
    this.dragons    = [];
    this.flames     = [];
    this.projectiles = [];
    this.coins      = [];
    this.perks      = [];

    // Game state
    this.game = { round:1, kills:0, score:0, state:'playing', waveTimer:0, scoreSaved:false };
    this.spawnRemaining = 0;
    this.spawnTimer = 0;
    this.boxState = 'idle'; // idle | spinning
    this.boxSpinTimer = 0;
    this.boxResult = null;
    this.devChestUsed = false;

    this.tickInterval = null;
  }

  addPlayer(socketId, name) {
    const slot = this.nextSlot++;
    const ps = this._makePlayer(slot);
    this.players.set(slot, ps);
    this.playerNames.set(slot, name || 'Player');
    this.playerSockets.set(slot, socketId);
    this.inputs.set(slot, {});
    return slot;
  }

  removePlayer(slot) {
    this.players.delete(slot);
    this.playerNames.delete(slot);
    this.playerSockets.delete(slot);
    this.inputs.delete(slot);
  }

  _makePlayer(slot) {
    return {
      cx: PLAYER_START_S.cx + (slot%2===1 ? 1.5 : 0),
      cy: PLAYER_START_S.cy + (slot > 1 ? 1.5 : 0),
      facing: 'south', frame: 0, ft: 0, moving: false,
      speed: PLAYER_SPEED_S,
      hp: 100, maxHp: 100, hurtTimer: 0,
      dead: false, downed: false, downedTimer: 0, reviveProgress: 0,
      money: 0, goldEarned: 0,
      upgrades: { damage:0, atkSpeed:0, crit:0, moveSpeed:0, hpRegen:0, maxHp:0 },
      weaponKey: 'pistol', ammo: Infinity,
      secondaryKey: null, secondaryAmmo: 0,
      shootCooldown: 0, regenTimer: 0, regenAccum: 0,
      heat: 0, overheated: false,
      slot,
    };
  }

  startGame() {
    this._startWave(1);
    this.tickInterval = setInterval(() => this.tick(), 33);
  }

  stop() {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  tick() {
    try {
      const g = this.game;
      if (g.state === 'game_over') {
        this._broadcast();
        return;
      }
      this._processInputs();
      this._updateProjectiles();
      this._updateZombies();
      this._updateSkeletons();
      this._updateDragons();
      this._updateFlames();
      this._updateCoins();
      this._updatePerks();
      this._updateWave();
      this._cleanupDead();
      this._broadcast();
    } catch(err) {
      console.error('[GameRoom] tick error:', err);
    }
  }

  _processInputs() {
    const g = this.game;
    for (const [slot, ps] of this.players) {
      if (ps.dead) continue;
      const inp = this.inputs.get(slot) || {};

      if (ps.downed) {
        if (--ps.downedTimer <= 0) { ps.dead = true; ps.downed = false; this._checkAllDead(); }
        // Other players reviving
        for (const [os, op] of this.players) {
          if (os === slot || op.dead || op.downed) continue;
          const dist = Math.hypot(op.cx - ps.cx, op.cy - ps.cy);
          const opInp = this.inputs.get(os) || {};
          if (dist < 2 && opInp.f) {
            ps.reviveProgress = Math.min(REVIVE_TICKS_S, ps.reviveProgress + 1);
            if (ps.reviveProgress >= REVIVE_TICKS_S) {
              ps.downed = false; ps.hp = Math.ceil(ps.maxHp * 0.35);
              ps.reviveProgress = 0; ps.downedTimer = 0;
            }
          } else {
            ps.reviveProgress = Math.max(0, ps.reviveProgress - 0.67);
          }
        }
        this._checkAllDead();
        continue;
      }

      ps.reviveProgress = 0;

      // Movement
      let dx = 0, dy = 0;
      if (inp.w) dy -= 1; if (inp.s) dy += 1;
      if (inp.a) dx -= 1; if (inp.d) dx += 1;
      // Click-to-move when no WASD
      if (dx === 0 && dy === 0 && inp.ctx != null && inp.cty != null) {
        const cdx = inp.ctx - ps.cx, cdy = inp.cty - ps.cy;
        const dist = Math.hypot(cdx, cdy);
        if (dist > 0.12) { dx = cdx / dist; dy = cdy / dist; }
      } else if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      ps.moving = dx !== 0 || dy !== 0;
      const sp = PLAYER_SPEED_S * (1 + Math.min(ps.upgrades.moveSpeed, 5) * 0.10);
      ps.speed = sp;
      if (ps.moving) {
        const nx = ps.cx + dx * sp, ny = ps.cy + dy * sp;
        if (!isBlockedS(this.map, nx, ps.cy)) ps.cx = nx;
        if (!isBlockedS(this.map, ps.cx, ny)) ps.cy = ny;
        ps.ft += 1/30; if (ps.ft >= 0.28) { ps.ft = 0; ps.frame = (ps.frame + 1) % 6; }
      }
      if (inp.mx !== undefined && inp.my !== undefined) {
        ps.facing = dir8S(inp.mx - ps.cx * TW_S, inp.my - ps.cy * TH_S);
      }

      // Hurt timer
      if (ps.hurtTimer > 0) { ps.hurtTimer--; ps.regenTimer = 0; ps.regenAccum = 0; }
      else if (ps.upgrades.hpRegen > 0 && ps.hp < ps.maxHp) {
        ps.regenTimer++;
        if (ps.regenTimer >= 100) { // ~5s at 20tps
          const rates = [0, 2, 5, 8, 11, 15];
          ps.regenAccum += rates[ps.upgrades.hpRegen] / 20;
          if (ps.regenAccum >= 1) {
            ps.hp = Math.min(ps.maxHp, ps.hp + Math.floor(ps.regenAccum));
            ps.regenAccum -= Math.floor(ps.regenAccum);
          }
        }
      }

      // Heat
      if (ps.heat > 0) {
        const coolRate = ps.overheated ? 100/100 : 1.2;
        ps.heat = Math.max(0, ps.heat - coolRate);
        if (ps.overheated && ps.heat <= 0) ps.overheated = false;
      }

      // Shooting cooldown
      if (ps.shootCooldown > 0) ps.shootCooldown--;

      // Shoot
      if (inp.shooting && ps.shootCooldown <= 0 && g.state === 'playing') {
        const w = WEAPONS_S[ps.weaponKey];
        const hasAmmo = ps.weaponKey === 'pistol' || ps.ammo > 0;
        if (hasAmmo && !(ps.weaponKey === 'pistol' && ps.overheated)) {
          ps.shootCooldown = this._getFireRate(ps);
          if (ps.ammo !== Infinity) ps.ammo = Math.max(0, ps.ammo - 1);
          if (w.wave) {
            this._fireWindWave(ps, inp);
          } else if (inp.mx !== undefined) {
            const ang = Math.atan2(inp.my - ps.cy * TH_S, inp.mx - ps.cx * TW_S);
            const fired = [];
            for (let i = 0; i < w.pellets; i++) {
              const a = ang + (Math.random() - 0.5) * w.spread * 2;
              const bul = {
                x: ps.cx * TW_S, y: ps.cy * TH_S,
                vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
                life: PROJ_LIFE_S, wkey: ps.weaponKey, slot,
                pierce: !!w.pierce, hitR: w.hitR,
                upgDmg: ps.upgrades.damage, upgCrit: ps.upgrades.crit,
              };
              this.projectiles.push(bul);
              fired.push({ sl: slot, wk: bul.wkey, x: bul.x|0, y: bul.y|0, vx: +bul.vx.toFixed(1), vy: +bul.vy.toFixed(1) });
            }
            // Immediately tell ALL clients about these bullets so they spawn from the correct position
            if (fired.length) io.to(this.code).emit('bullet_fired', fired);
          }
          if (ps.weaponKey === 'pistol') {
            ps.heat = Math.min(100, ps.heat + 8);
            if (ps.heat >= 100) ps.overheated = true;
          }
        }
      }

      // Weapon swap
      if (inp.q && !inp._qprev) {
        if (ps.secondaryKey) {
          if (ps.weaponKey === 'pistol') { ps.weaponKey = ps.secondaryKey; ps.ammo = ps.secondaryAmmo; }
          else { ps.secondaryAmmo = ps.ammo; ps.weaponKey = 'pistol'; ps.ammo = Infinity; }
        }
      }
      inp._qprev = inp.q;

      // Interact (E key)
      if (inp.e && !inp._eprev && g.state === 'playing') {
        this._handleInteract(slot, ps);
      }
      inp._eprev = inp.e;
    }
  }

  _getFireRate(ps) {
    const base = WEAPONS_S[ps.weaponKey].fireRate;
    return Math.max(1, Math.round(base * Math.pow(0.85, ps.upgrades.atkSpeed)));
  }

  _rollDamage(baseDmg, upgDmg, upgCrit) {
    const total = Math.round(baseDmg * (1 + upgDmg * 0.20));
    const crit = Math.random() < upgCrit * 0.1;
    return crit ? total * 2 : total;
  }

  _fireWindWave(ps, inp) {
    if (inp.mx === undefined) return;
    const sx = ps.cx * TW_S, sy = ps.cy * TH_S;
    const angle = Math.atan2(inp.my - sy, inp.mx - sx);
    const hitEnt = (ent, knockback) => {
      const dx = ent.cx * TW_S - sx, dy = ent.cy * TH_S - sy;
      const dist = Math.hypot(dx, dy);
      if (dist > WAVE_RANGE_S * TW_S) return false;
      let diff = Math.atan2(dy, dx) - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > WAVE_HALFANG_S) return false;
      const dmg = this._rollDamage(WEAPONS_S.thundergun.baseDmg, ps.upgrades.damage, ps.upgrades.crit);
      ent.hp -= dmg; ent.hitFlash = 10;
      const nd = dist || 1;
      ent.vx = (dx / nd) * knockback; ent.vy = (dy / nd) * knockback;
      return true;
    };
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i]; if (z.dead) continue;
      if (hitEnt(z, 0.9)) {
        if (z.hp <= 0) {
          this.game.kills++; this.game.score += 10;
          this._spawnCoin(z.cx, z.cy, 20 + this.game.round * 5);
          this._spawnPerk(z.cx, z.cy);
          this.zombies.splice(i, 1);
        }
      }
    }
    this.dragons.forEach(d => { if (!d.dead) hitEnt(d, 0.7); this._checkDragonDeath(d); });
    this.skeletons.forEach(s => { if (!s.dead) hitEnt(s, 0.9); this._checkSkelDeath(s); });
  }

  _handleInteract(slot, ps) {
    // Ammo station
    const da = Math.hypot(ps.cx - AMMO_POS_S.cx, ps.cy - AMMO_POS_S.cy);
    if (da < AMMO_RADIUS_S && ps.secondaryKey) {
      const w = WEAPONS_S[ps.secondaryKey];
      const cost = w.ammoCost || 0;
      const cur = ps.weaponKey === ps.secondaryKey ? ps.ammo : ps.secondaryAmmo;
      if (cur < w.ammoMax && ps.money >= cost) {
        ps.money -= cost;
        if (ps.weaponKey === ps.secondaryKey) ps.ammo = w.ammoMax;
        else ps.secondaryAmmo = w.ammoMax;
        return;
      }
    }
    // Mystery box
    const db = Math.hypot(ps.cx - BOX_POS_S.cx, ps.cy - BOX_POS_S.cy);
    if (db < BOX_RADIUS_S && this.boxState === 'idle' && ps.money >= BOX_COST_S) {
      ps.money -= BOX_COST_S;
      this.boxState = 'spinning';
      this.boxSpinTimer = 90; // 4.5s at 20tps
      this.boxResult = { slot, weapon: BOX_POOL_S[Math.random() * BOX_POOL_S.length | 0] };
      return;
    }
    // Dev chest
    const dd = Math.hypot(ps.cx - DEV_CHEST_POS_S.cx, ps.cy - DEV_CHEST_POS_S.cy);
    if (dd < DEV_CHEST_RADIUS_S && !this.devChestUsed) {
      this.devChestUsed = true;
      ps.secondaryKey = 'devgun'; ps.secondaryAmmo = Infinity;
      return;
    }
    // Doors
    for (const door of this.doors) {
      if (door.unlocked) continue;
      const dist = Math.hypot(ps.cx - door.cx, ps.cy - door.cy);
      if (dist < 3 && ps.money >= door.cost) {
        ps.money -= door.cost;
        door.unlocked = true;
        door.tiles.forEach(({r, c}) => { this.map[r][c] = 1; }); // FLOOR
        break;
      }
    }
  }

  _updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      const tc = p.x / TW_S | 0, tr = p.y / TH_S | 0;
      const wallHit = p.life <= 0 || tr < 0 || tr >= MAP_H_S || tc < 0 || tc >= MAP_W_S
        || this.map[tr]?.[tc] === 0 || this.map[tr]?.[tc] === 2;
      if (wallHit) { this.projectiles.splice(i, 1); continue; }
      let hit = false;
      // Zombies
      for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
        const z = this.zombies[zi]; if (z.dead) continue;
        if (Math.hypot(p.x - z.cx * TW_S, p.y - z.cy * TH_S) < TW_S * p.hitR) {
          const dmg = this._rollDamage(WEAPONS_S[p.wkey].baseDmg, p.upgDmg, p.upgCrit);
          z.hp -= dmg; z.hitFlash = 7;
          if (z.hp <= 0) {
            this.game.kills++; this.game.score += 10;
            this._spawnCoin(z.cx, z.cy, 5 + Math.random() * this.game.round * 3 + 10 | 0);
            this._spawnPerk(z.cx, z.cy);
            this.zombies.splice(zi, 1);
          }
          if (!p.pierce) { this.projectiles.splice(i, 1); hit = true; break; }
        }
      }
      if (hit) continue;
      // Dragons
      for (let di = this.dragons.length - 1; di >= 0; di--) {
        const d = this.dragons[di]; if (d.dead) continue;
        if (Math.hypot(p.x - d.cx * TW_S, p.y - d.cy * TH_S) < TW_S * (p.hitR + 0.3)) {
          const dmg = this._rollDamage(WEAPONS_S[p.wkey].baseDmg, p.upgDmg, p.upgCrit);
          d.hp -= dmg; d.hitFlash = 9;
          this._checkDragonDeath(d);
          if (!p.pierce) { this.projectiles.splice(i, 1); hit = true; break; }
        }
      }
      if (hit) continue;
      // Skeletons
      for (let si = this.skeletons.length - 1; si >= 0; si--) {
        const s = this.skeletons[si]; if (s.dead) continue;
        if (Math.hypot(p.x - s.cx * TW_S, p.y - s.cy * TH_S) < TW_S * p.hitR) {
          const dmg = this._rollDamage(WEAPONS_S[p.wkey].baseDmg, p.upgDmg, p.upgCrit);
          s.hp -= dmg; s.hitFlash = 7;
          this._checkSkelDeath(s);
          if (!p.pierce) { this.projectiles.splice(i, 1); hit = true; break; }
        }
      }
    }
  }

  _nearestPlayerTo(cx, cy) {
    let best = null, bestD = Infinity;
    for (const ps of this.players.values()) {
      if (ps.dead || ps.downed) continue;
      const d = Math.hypot(ps.cx - cx, ps.cy - cy);
      if (d < bestD) { bestD = d; best = ps; }
    }
    return best;
  }

  _damagePlayer(ps, dmg, slot) {
    if (ps.dead || ps.downed || ps.hurtTimer > 0) return;
    ps.hp = Math.max(0, ps.hp - dmg);
    ps.hurtTimer = HURT_TICKS_S;
    if (ps.hp <= 0) {
      if (this.players.size > 1) {
        ps.downed = true; ps.hp = 1; ps.downedTimer = DOWNED_TICKS_S;
      } else {
        ps.dead = true; this.game.state = 'game_over';
      }
      this._checkAllDead();
    }
  }

  _updateZombies() {
    const g = this.game;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.dead) { if (--z.deathTimer <= 0) this.zombies.splice(i, 1); continue; }
      if (z.vx || z.vy) {
        const nx = z.cx + z.vx, ny = z.cy + z.vy;
        if (!isBlockedS(this.map, nx, z.cy)) z.cx = nx; else z.vx = 0;
        if (!isBlockedS(this.map, z.cx, ny)) z.cy = ny; else z.vy = 0;
        z.vx *= 0.78; z.vy *= 0.78;
        if (Math.abs(z.vx) < 0.005) z.vx = 0;
        if (Math.abs(z.vy) < 0.005) z.vy = 0;
      }
      const tgt = this._nearestPlayerTo(z.cx, z.cy); if (!tgt) continue;
      const spd = ZOMBIE_SPEED_S + g.round * 0.0008 * 3;
      const dx = tgt.cx - z.cx, dy = tgt.cy - z.cy, dist = Math.hypot(dx, dy);
      if (dist > 0.4) {
        const nx = z.cx + (dx / dist) * spd, ny = z.cy + (dy / dist) * spd;
        if (!isBlockedS(this.map, nx, z.cy)) z.cx = nx;
        if (!isBlockedS(this.map, z.cx, ny)) z.cy = ny;
        z.facing = dir8S(dx, dy);
      }
      z.ft += 1/30; if (z.ft >= 0.33) { z.frame = (z.frame + 1) % 8; z.ft = 0; }
      if (z.hitFlash > 0) z.hitFlash--;
      if (dist < 0.65 && tgt.hurtTimer <= 0 && g.state === 'playing') {
        this._damagePlayer(tgt, 8, tgt.slot);
      }
    }
  }

  _updateSkeletons() {
    const g = this.game;
    for (let i = this.skeletons.length - 1; i >= 0; i--) {
      const s = this.skeletons[i];
      if (s.dead) { if (--s.deathTimer <= 0) this.skeletons.splice(i, 1); continue; }
      if (s.vx || s.vy) {
        const nx = s.cx + s.vx, ny = s.cy + s.vy;
        if (!isBlockedS(this.map, nx, s.cy)) s.cx = nx; else s.vx = 0;
        if (!isBlockedS(this.map, s.cx, ny)) s.cy = ny; else s.vy = 0;
        s.vx *= 0.78; s.vy *= 0.78;
        if (Math.abs(s.vx) < 0.005) s.vx = 0;
        if (Math.abs(s.vy) < 0.005) s.vy = 0;
      }
      const tgt = this._nearestPlayerTo(s.cx, s.cy); if (!tgt) continue;
      const spd = SKEL_SPEED_S + g.round * 0.001 * 3;
      const dx = tgt.cx - s.cx, dy = tgt.cy - s.cy, dist = Math.hypot(dx, dy);
      if (dist > 0.4) {
        const nx = s.cx + (dx / dist) * spd, ny = s.cy + (dy / dist) * spd;
        if (!isBlockedS(this.map, nx, s.cy)) s.cx = nx;
        if (!isBlockedS(this.map, s.cx, ny)) s.cy = ny;
        s.facing = dir8S(dx, dy);
      }
      s.ft += 1/30; if (s.ft >= 0.27) { s.frame = (s.frame + 1) % 4; s.ft = 0; }
      if (s.hitFlash > 0) s.hitFlash--;
      if (dist < 0.62 && tgt.hurtTimer <= 0 && g.state === 'playing') {
        const stolen = Math.min(tgt.money, SKEL_STEAL_S);
        tgt.money = Math.max(0, tgt.money - stolen);
        this._damagePlayer(tgt, 4, tgt.slot);
      }
    }
  }

  _updateDragons() {
    const g = this.game;
    for (let i = this.dragons.length - 1; i >= 0; i--) {
      const d = this.dragons[i];
      if (d.dead) { if (--d.deathTimer <= 0) this.dragons.splice(i, 1); continue; }
      if (d.vx || d.vy) {
        const nx = d.cx + d.vx, ny = d.cy + d.vy;
        if (!isBlockedS(this.map, nx, d.cy)) d.cx = nx; else d.vx = 0;
        if (!isBlockedS(this.map, d.cx, ny)) d.cy = ny; else d.vy = 0;
        d.vx *= 0.75; d.vy *= 0.75;
        if (Math.abs(d.vx) < 0.005) d.vx = 0;
        if (Math.abs(d.vy) < 0.005) d.vy = 0;
      }
      const tgt = this._nearestPlayerTo(d.cx, d.cy); if (!tgt) continue;
      const dx = tgt.cx - d.cx, dy = tgt.cy - d.cy, dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        d.cx += (dx / dist) * DRAGON_SPEED_S;
        d.cy += (dy / dist) * DRAGON_SPEED_S;
        d.facing = dir8S(dx, dy);
      }
      d.ft += 1/30; if (d.ft >= 0.33) { d.frame = (d.frame + 1) % 8; d.ft = 0; }
      if (d.hitFlash > 0) d.hitFlash--;
      if (dist < 0.9 && tgt.hurtTimer <= 0 && g.state === 'playing') {
        this._damagePlayer(tgt, 12, tgt.slot);
      }
      d.fireTimer++;
      if (d.fireTimer >= DRAGON_FIRE_INTERVAL_S && dist < DRAGON_FIRE_RANGE_S) {
        d.fireTimer = 0;
        const sx = d.cx * TW_S, sy = d.cy * TH_S;
        const dtx = tgt.cx * TW_S - sx, dty = tgt.cy * TH_S - sy;
        const dl = Math.hypot(dtx, dty) || 1;
        this.flames.push({
          x: sx, y: sy,
          vx: (dtx/dl) * FLAME_SPEED_S, vy: (dty/dl) * FLAME_SPEED_S,
          life: FLAME_LIFE_S, maxLife: FLAME_LIFE_S
        });
      }
    }
  }

  _updateFlames() {
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.x += f.vx; f.y += f.vy; f.life--;
      const tr = f.y / TH_S | 0, tc = f.x / TW_S | 0;
      const wallHit = f.life <= 0 || tr < 0 || tr >= MAP_H_S || tc < 0 || tc >= MAP_W_S
        || this.map[tr]?.[tc] === 0 || this.map[tr]?.[tc] === 2;
      if (wallHit) { this.flames.splice(i, 1); continue; }
      const ftgt = this._nearestPlayerTo(f.x / TW_S, f.y / TH_S);
      if (ftgt && !ftgt.dead && !ftgt.downed && ftgt.hurtTimer <= 0
          && Math.hypot(f.x - ftgt.cx * TW_S, f.y - ftgt.cy * TH_S) < TW_S * 0.55) {
        this._damagePlayer(ftgt, FLAME_DMG_S, ftgt.slot);
        this.flames.splice(i, 1);
      }
    }
  }

  _updateCoins() {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      let picked = false;
      for (const ps of this.players.values()) {
        if (ps.dead || ps.downed) continue;
        const dist = Math.hypot(ps.cx - c.cx, ps.cy - c.cy);
        const range = 0.7;
        if (dist < range) {
          ps.money += c.amount;
          ps.goldEarned += c.amount;
          this.game.score += c.amount;
          this.coins.splice(i, 1);
          picked = true;
          break;
        }
      }
    }
  }

  _updatePerks() {
    for (let i = this.perks.length - 1; i >= 0; i--) {
      const pk = this.perks[i];
      pk.life--;
      if (pk.life <= 0) { this.perks.splice(i, 1); continue; }
      for (const ps of this.players.values()) {
        if (ps.dead || ps.downed) continue;
        if (Math.hypot(ps.cx - pk.cx, ps.cy - pk.cy) < 0.6) {
          this.perks.splice(i, 1);
          break;
        }
      }
    }
  }

  _updateWave() {
    const g = this.game;
    if (g.state === 'game_over') return;

    // Mystery box spin
    if (this.boxState === 'spinning') {
      this.boxSpinTimer--;
      if (this.boxSpinTimer <= 0) {
        this.boxState = 'idle';
        if (this.boxResult) {
          const ps = this.players.get(this.boxResult.slot);
          if (ps) {
            ps.secondaryKey = this.boxResult.weapon;
            ps.secondaryAmmo = WEAPONS_S[this.boxResult.weapon].ammoMax;
          }
          this.boxResult = null;
        }
      }
    }

    if (g.state === 'wave_clear') {
      if (--g.waveTimer <= 0) { g.round++; this._startWave(g.round); g.state = 'playing'; }
      return;
    }
    // Spawn queue
    if (this.spawnRemaining > 0) {
      this.spawnTimer++;
      if (this.spawnTimer >= SPAWN_INT_S) {
        this.spawnTimer = 0; this.spawnRemaining--;
        this.zombies.push(this._spawnZombie());
      }
    }
    // Wave clear check
    if (this.spawnRemaining === 0
      && this.zombies.every(z => z.dead)
      && this.dragons.every(d => d.dead)
      && this.skeletons.every(s => s.dead)) {
      g.state = 'wave_clear'; g.waveTimer = WAVE_CLEAR_TICKS_S;
    }
  }

  _checkAllDead() {
    const all = Array.from(this.players.values());
    if (all.every(ps => ps.dead || ps.downed)) {
      this.game.state = 'game_over';
    }
  }

  _checkDragonDeath(d) {
    if (d.hp <= 0 && !d.dead) {
      d.dead = true; d.deathTimer = 10; this.game.kills++; this.game.score += 50;
      this._spawnCoin(d.cx, d.cy, 60 + this.game.round * 10);
      this._spawnPerk(d.cx, d.cy);
    }
  }

  _checkSkelDeath(s) {
    if (s.hp <= 0 && !s.dead) {
      s.dead = true; s.deathTimer = 7; this.game.kills++; this.game.score += 15;
      this._spawnCoin(s.cx, s.cy, 15 + this.game.round * 3);
      this._spawnPerk(s.cx, s.cy);
    }
  }

  _startWave(round) {
    this.zombies.length = 0; this.dragons.length = 0;
    this.skeletons.length = 0; this.flames.length = 0;
    this.projectiles.length = 0;
    this.spawnRemaining = 5 + round * 2; this.spawnTimer = 0;
    // Dragons
    const nd = round === 5 ? 1 : round < 10 ? 0 : Math.floor((round - 10) / 5);
    for (let i = 0; i < nd; i++) this.dragons.push(this._spawnDragon());
    // Skeletons
    const ns = round < 7 ? 0 : Math.floor((round - 7) / 3) + 1;
    for (let i = 0; i < ns; i++) this.skeletons.push(this._spawnSkeleton());
  }

  _spawnZombie() {
    const pts = getSpawnTilesS(this.map);
    const sp = pts[Math.random() * pts.length | 0];
    const hp = 20 + this.game.round * 20;
    return { cx: sp.cx + (Math.random()-.5)*.4, cy: sp.cy + (Math.random()-.5)*.4,
             frame: Math.random()*8|0, ft: 0, hp, maxHp: hp,
             dead: false, deathTimer: 0, hitFlash: 0, vx: 0, vy: 0, facing: 'south' };
  }

  _spawnSkeleton() {
    const pts = getSpawnTilesS(this.map);
    const sp = pts[Math.random() * pts.length | 0];
    return { cx: sp.cx + (Math.random()-.5)*.4, cy: sp.cy + (Math.random()-.5)*.4,
             frame: Math.random()*4|0, ft: 0, hp: SKEL_HP_S, maxHp: SKEL_HP_S,
             dead: false, deathTimer: 0, hitFlash: 0, vx: 0, vy: 0, facing: 'south' };
  }

  _spawnDragon() {
    const pts = getSpawnTilesS(this.map);
    const sp = pts[Math.random() * pts.length | 0];
    return { cx: sp.cx + (Math.random()-.5)*.5, cy: sp.cy + (Math.random()-.5)*.5,
             frame: Math.random()*8|0, ft: 0, hp: DRAGON_HP_S, maxHp: DRAGON_HP_S,
             dead: false, deathTimer: 0, hitFlash: 0, vx: 0, vy: 0, facing: 'south',
             fireTimer: Math.random() * DRAGON_FIRE_INTERVAL_S | 0 };
  }

  _spawnCoin(cx, cy, amount) {
    this.coins.push({ cx: cx + (Math.random()-.5)*.4, cy: cy + (Math.random()-.5)*.4, amount: amount|0 });
  }

  _spawnPerk(cx, cy) {
    if (Math.random() > 0.08) return; // 8% chance
    const type = Math.random() < 0.5 ? 'doublePoints' : 'magnet';
    this.perks.push({ cx, cy, type, life: 200 }); // 10s at 20tps
  }

  _cleanupDead() {
    // Already cleaned in update loops
  }

  _serialize() {
    const ps_arr = [];
    for (const [slot, ps] of this.players) {
      ps_arr.push({
        sl: slot, nm: this.playerNames.get(slot) || 'Player',
        cx: +ps.cx.toFixed(2), cy: +ps.cy.toFixed(2),
        hp: ps.hp, mhp: ps.maxHp,
        f: ps.facing, fr: ps.frame, mv: ps.moving ? 1 : 0,
        dead: ps.dead ? 1 : 0, dn: ps.downed ? 1 : 0,
        dt: ps.downedTimer | 0, rvp: +(ps.reviveProgress / REVIVE_TICKS_S).toFixed(2),
        wk: ps.weaponKey, am: ps.ammo === Infinity ? -1 : ps.ammo | 0,
        mo: ps.money | 0, sc: ps.goldEarned | 0,
        upg: ps.upgrades, sk: ps.secondaryKey, sa: ps.secondaryAmmo === Infinity ? -1 : ps.secondaryAmmo | 0,
        ht: ps.heat | 0, oh: ps.overheated ? 1 : 0,
      });
    }
    return {
      p: ps_arr,
      z:  this.zombies.filter(z=>!z.dead||z.deathTimer>0).map(z=>[+z.cx.toFixed(1),+z.cy.toFixed(1),z.hp,z.maxHp,z.facing,z.frame,z.dead?1:0]),
      sk: this.skeletons.filter(s=>!s.dead||s.deathTimer>0).map(s=>[+s.cx.toFixed(1),+s.cy.toFixed(1),s.hp,s.facing,s.frame,s.dead?1:0]),
      dr: this.dragons.filter(d=>!d.dead||d.deathTimer>0).map(d=>[+d.cx.toFixed(1),+d.cy.toFixed(1),d.hp,d.facing,d.frame,d.dead?1:0]),
      fl: this.flames.map(f=>[f.x|0,f.y|0,+f.vx.toFixed(1),+f.vy.toFixed(1),f.life|0]),
      pr: this.projectiles.map(p=>[p.x|0,p.y|0,+p.vx.toFixed(1),+p.vy.toFixed(1),p.wkey,p.life|0,p.slot]),
      co: this.coins.map(c=>[+c.cx.toFixed(1),+c.cy.toFixed(1),c.amount]),
      pk: this.perks.map(pk=>[+pk.cx.toFixed(1),+pk.cy.toFixed(1),pk.type,pk.life|0]),
      g: { r: this.game.round, k: this.game.kills, sc: this.game.score,
           st: this.game.state, wt: this.game.waveTimer | 0, sp: this.spawnRemaining | 0 },
      drs: this.doors.map(d => d.unlocked ? 1 : 0),
      bx: this.boxState === 'spinning' ? 1 : 0,
    };
  }

  _broadcast() {
    if (!this._broadcastCount) {
      this._broadcastCount = 0;
      console.log('[GameRoom] first broadcast for room', this.code);
    }
    this._broadcastCount++;
    const st = this._serialize();
    io.to(this.code).emit('game_state', st);
  }

  handleBuyUpgrade(slot, key) {
    const ps = this.players.get(slot); if (!ps) return;
    const item = SHOP_ITEMS_S.find(i => i.key === key); if (!item) return;
    const lvl = ps.upgrades[key] || 0;
    if (lvl >= item.max) return;
    const cost = item.costs[lvl];
    if (ps.money < cost) return;
    ps.money -= cost;
    ps.upgrades[key]++;
    if (key === 'maxHp') ps.maxHp = 100 + ps.upgrades.maxHp * 25;
  }

  handleRestart(slot) {
    // Only first player (slot 0) can restart
    if (slot !== 0) return;
    // Reset all players
    for (const [s, ps] of this.players) {
      const fresh = this._makePlayer(s);
      Object.assign(ps, fresh);
    }
    this.zombies.length = 0; this.skeletons.length = 0;
    this.dragons.length = 0; this.flames.length = 0;
    this.projectiles.length = 0; this.coins.length = 0; this.perks.length = 0;
    this.doors.forEach((d, i) => { d.unlocked = false; DOORS_S[i].tiles.forEach(({r,c}) => { this.map[r][c] = 4; }); });
    this.boxState = 'idle'; this.boxSpinTimer = 0; this.boxResult = null; this.devChestUsed = false;
    Object.assign(this.game, { round:1, kills:0, score:0, state:'playing', waveTimer:0 });
    this._startWave(1);
  }
}

// ── SOCKET EVENTS ─────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('[MP] connect', socket.id);

  socket.on('create_room', ({ name }) => {
    const code = makeCode();
    const room = new GameRoom(code);
    rooms.set(code, room);
    const slot = room.addPlayer(socket.id, name);
    socket.join(code);
    socket.data.code = code;
    socket.data.slot = slot;
    socket.emit('room_created', { code, slot, players: _lobbyPlayers(room) });
    console.log('[MP] room created', code);
  });

  socket.on('join_room', ({ code, name }) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return socket.emit('mp_error', 'Room not found');
    if (room.players.size >= 4) return socket.emit('mp_error', 'Room is full (max 4)');
    if (room.tickInterval) return socket.emit('mp_error', 'Game already in progress');
    const slot = room.addPlayer(socket.id, name);
    socket.join(room.code);
    socket.data.code = room.code;
    socket.data.slot = slot;
    socket.emit('room_joined', { code: room.code, slot, players: _lobbyPlayers(room) });
    io.to(room.code).emit('lobby_update', _lobbyPlayers(room));
    console.log('[MP] join', room.code, 'slot', slot);
  });

  socket.on('start_game', () => {
    const room = rooms.get(socket.data.code);
    if (!room || socket.data.slot !== 0) return;
    room.startGame();
    io.to(room.code).emit('game_start', { players: _lobbyPlayers(room) });
    console.log('[MP] start', room.code);
  });

  socket.on('player_input', inp => {
    const room = rooms.get(socket.data.code);
    if (!room) return;
    const slot = socket.data.slot;
    const cur = room.inputs.get(slot) || {};
    room.inputs.set(slot, { ...inp, _qprev: cur._qprev, _eprev: cur._eprev });
  });

  socket.on('buy_upgrade', ({ key }) => {
    const room = rooms.get(socket.data.code);
    if (room) room.handleBuyUpgrade(socket.data.slot, key);
  });

  socket.on('restart_game', () => {
    const room = rooms.get(socket.data.code);
    if (room) room.handleRestart(socket.data.slot);
  });

  socket.on('ping_mp', () => socket.emit('pong_mp'));

  socket.on('disconnect', () => {
    const code = socket.data.code;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    const slot = socket.data.slot;
    room.removePlayer(slot);
    if (room.players.size === 0) {
      room.stop();
      rooms.delete(code);
      console.log('[MP] room', code, 'empty, closed');
    } else {
      io.to(code).emit('lobby_update', _lobbyPlayers(room));
      io.to(code).emit('player_left', { slot });
      console.log('[MP] slot', slot, 'left', code);
    }
  });
});

function _lobbyPlayers(room) {
  return Array.from(room.players.entries()).map(([slot, ps]) => ({
    slot, name: room.playerNames.get(slot) || 'Player', id: room.playerSockets.get(slot)
  }));
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`[Dead Surge] server listening on port ${PORT}`));
