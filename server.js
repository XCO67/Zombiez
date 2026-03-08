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

// ── MULTIPLAYER ROOMS ─────────────────────────────────────────────────────────
const rooms = new Map(); // code -> { code, hostId, players:[{id,name,slot}] }

function makeCode() {
  let code;
  do { code = Math.random().toString(36).substr(2,6).toUpperCase(); } while (rooms.has(code));
  return code;
}

io.on('connection', socket => {
  console.log('[MP] connect', socket.id);

  socket.on('create_room', ({ name }) => {
    const code = makeCode();
    const room = { code, hostId: socket.id, players: [{ id: socket.id, name: name || 'Player', slot: 0 }] };
    rooms.set(code, room);
    socket.join(code);
    socket.data.code = code;
    socket.data.slot = 0;
    socket.emit('room_created', { code, slot: 0, players: room.players });
    console.log('[MP] room created', code);
  });

  socket.on('join_room', ({ code, name }) => {
    const room = rooms.get((code||'').toUpperCase());
    if (!room) return socket.emit('mp_error', 'Room not found');
    if (room.players.length >= 4) return socket.emit('mp_error', 'Room is full (max 4)');
    const slot = room.players.length;
    room.players.push({ id: socket.id, name: name || 'Player', slot });
    socket.join(room.code);
    socket.data.code = room.code;
    socket.data.slot = slot;
    socket.emit('room_joined', { code: room.code, slot, players: room.players });
    socket.to(room.code).emit('lobby_update', room.players);
    console.log('[MP] join', room.code, 'slot', slot);
  });

  socket.on('start_game', () => {
    const room = rooms.get(socket.data.code);
    if (!room || room.hostId !== socket.id) return;
    io.to(room.code).emit('game_start', room.players);
    console.log('[MP] start', room.code);
  });

  // Host → guests: full game state
  socket.on('game_state', state => {
    const code = socket.data.code;
    if (!code) return;
    socket.to(code).emit('game_state', state);
  });

  // Guest → host: player input
  socket.on('player_input', input => {
    const code = socket.data.code;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    io.to(room.hostId).emit('player_input', { ...input, slot: socket.data.slot });
  });

  socket.on('ping_mp', () => socket.emit('pong_mp'));

  socket.on('disconnect', () => {
    const code = socket.data.code;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (room.hostId === socket.id) {
      io.to(code).emit('host_left');
      rooms.delete(code);
      console.log('[MP] host left, room', code, 'closed');
    } else {
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(code).emit('lobby_update', room.players);
      io.to(room.hostId).emit('player_left', { slot: socket.data.slot });
      console.log('[MP] guest slot', socket.data.slot, 'left', code);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`[Dead Surge] server listening on port ${PORT}`));
