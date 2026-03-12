const express  = require('express');
const http     = require('http');
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

  // Maps table (public, shared across all players)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maps (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migration: deduplicate scores (keep best score per user) then enforce one row per user
  await pool.query(`
    DELETE FROM scores
    WHERE id NOT IN (
      SELECT DISTINCT ON (user_id) id
      FROM scores
      ORDER BY user_id, score DESC, id DESC
    );
  `);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scores_user_id_unique'
      ) THEN
        ALTER TABLE scores ADD CONSTRAINT scores_user_id_unique UNIQUE (user_id);
      END IF;
    END $$;
  `);

  // Clean up any previously seeded fake accounts (noreply emails)
  await pool.query(`
    DELETE FROM scores WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@noreply.deadsurge.gg'
    )
  `);
  await pool.query(`DELETE FROM users WHERE email LIKE '%@noreply.deadsurge.gg'`);
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
      `INSERT INTO scores (user_id, round, kills, gold, score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET round=$2, kills=$3, gold=$4, score=$5, created_at=NOW()
         WHERE scores.score < EXCLUDED.score`,
      [req.user.id, round|0, kills|0, gold|0, score|0]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/maps ─────────────────────────────────────────────────────────────
app.get('/api/maps', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, data FROM maps ORDER BY updated_at DESC');
    res.json(rows.map(r => ({ ...r.data, id: r.id, name: r.name })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/maps ────────────────────────────────────────────────────────────
app.post('/api/maps', async (req, res) => {
  const { id, name } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  try {
    await pool.query(
      `INSERT INTO maps (id, name, data) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name=$2, data=$3, updated_at=NOW()`,
      [id, name, JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/maps/:id ──────────────────────────────────────────────────────
app.delete('/api/maps/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM maps WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/editor-auth ─────────────────────────────────────────────────────
app.post('/api/editor-auth', (req, res) => {
  const { password } = req.body || {};
  if (password && password === process.env.EDITER_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

// ── DELETE /api/admin/reset-scores ────────────────────────────────────────────
app.delete('/api/admin/reset-scores', async (req, res) => {
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.EDITER_PASSWORD)
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    await pool.query('DELETE FROM scores');
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
      WHERE  u.email NOT LIKE '%@noreply.deadsurge.gg'
      ORDER  BY s.round DESC, s.score DESC, s.kills DESC
      LIMIT  53
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`[Dead Surge] server listening on port ${PORT}`));
