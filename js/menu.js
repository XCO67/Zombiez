
// ─── MENU SYSTEM ──────────────────────────────────────────────────────────────

// ▸ Set this to your Railway deployment URL once deployed
// ▸ For local testing keep it as http://localhost:3000
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://zombiez-production.up.railway.app';

// ── Core helpers ──────────────────────────────────────────────────────────────
function getToken()  { return localStorage.getItem('deadsurge_token'); }
function getUser()   { try { return JSON.parse(localStorage.getItem('deadsurge_authuser')); } catch { return null; } }
function setSession(token, user) {
  localStorage.setItem('deadsurge_token', token);
  localStorage.setItem('deadsurge_authuser', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('deadsurge_token');
  localStorage.removeItem('deadsurge_authuser');
}

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(API_URL + path, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json() };
}
async function apiGet(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(API_URL + path, { headers });
  return { ok: r.ok, data: await r.json() };
}

// ── Game flow ─────────────────────────────────────────────────────────────────
function startGame() {
  resumeAudio();
  document.getElementById('menu').style.display = 'none';
  document.getElementById('mapSelectModal').style.display = 'none';
  document.body.style.cursor = 'none';
  if (!gameStarted) {
    gameStarted = true;
    if (!mp.active) startWave(1); // server handles wave spawning in multiplayer
  }
}

function goToMenu() {
  closePauseMenu();
  if (typeof restartGame !== 'undefined') restartGame();
  gameStarted = false; // stop render loop game logic while on menu
  document.getElementById('menu').style.display = 'flex';
  document.body.style.cursor = 'default';
  menuBgLoop();
  refreshLeaderboard();
  updateLoginLabel();
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(id) {
  if (id === 'lbModal')       refreshLeaderboard();
  if (id === 'loginModal')    renderAuthModal();
  if (id === 'settingsModal') updateKeybindUI();
  document.getElementById(id).style.display = 'flex';
}
function closeModal(id) {
  if (id === 'settingsModal') cancelRebind();
  document.getElementById(id).style.display = 'none';
}

// ── In-game Pause Menu ────────────────────────────────────────────────────────
function openPauseMenu() {
  // Sync volume sliders to current values
  const mv = Math.round(masterGain.gain.value * 100);
  const pmv = document.getElementById('pmVolSlider');
  const pmvl = document.getElementById('pmVolVal');
  if (pmv) { pmv.value = mv; }
  if (pmvl) { pmvl.textContent = mv + '%'; }
  const pmm = document.getElementById('pmMusicSlider');
  const pmml = document.getElementById('pmMusicVal');
  if (pmm) { pmm.value = musicVolume; }
  if (pmml) { pmml.textContent = musicVolume + '%'; }
  updateKeybindUI();
  pmNav('main');
  document.getElementById('pauseMenu').style.display = 'flex';
}
function closePauseMenu() {
  cancelRebind();
  document.getElementById('pauseMenu').style.display = 'none';
}
function resumeFromPause() {
  closePauseMenu();
  if (typeof game !== 'undefined' && game.state === 'paused')
    game.state = game._prevState || 'playing';
}
function pmNav(panel) {
  document.getElementById('pmPanelMain').style.display     = panel === 'main'     ? 'block' : 'none';
  document.getElementById('pmPanelAudio').style.display    = panel === 'audio'    ? 'block' : 'none';
  document.getElementById('pmPanelKeybinds').style.display = panel === 'keybinds' ? 'block' : 'none';
}

document.querySelectorAll('.modal-ov').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.style.display = 'none'; });
});

// ── Auth modal ────────────────────────────────────────────────────────────────
function renderAuthModal() {
  const user = getUser();
  document.getElementById('authLoggedIn').style.display = user ? 'block' : 'none';
  document.getElementById('authForms').style.display     = user ? 'none'  : 'block';
  if (user) {
    document.getElementById('authUsername').textContent = user.username;
    document.getElementById('authEmail').textContent    = user.email;
  }
  clearAuthErrors();
}

function switchTab(tab) {
  document.getElementById('formLogin').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('formRegister').style.display = tab==='register' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active', tab==='login');
  document.getElementById('tabReg').classList.toggle('active',   tab==='register');
  clearAuthErrors();
}
function clearAuthErrors() {
  document.getElementById('liError').textContent  = '';
  document.getElementById('regError').textContent = '';
}

async function doLogin() {
  const email    = document.getElementById('liEmail').value.trim();
  const password = document.getElementById('liPassword').value;
  const errEl    = document.getElementById('liError');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  errEl.textContent = 'Logging in…';
  try {
    const { ok, data } = await apiPost('/api/login', { email, password });
    if (!ok) { errEl.textContent = data.error || 'Login failed.'; return; }
    setSession(data.token, data.user);
    updateLoginLabel();
    renderAuthModal();
    closeModal('loginModal');
  } catch { errEl.textContent = 'Cannot reach server. Is it running?'; }
}

async function doRegister() {
  const username = document.getElementById('regUser').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl    = document.getElementById('regError');
  errEl.textContent = '';
  if (!username || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  errEl.textContent = 'Creating account…';
  try {
    const { ok, data } = await apiPost('/api/register', { username, email, password });
    if (!ok) { errEl.textContent = data.error || 'Registration failed.'; return; }
    setSession(data.token, data.user);
    updateLoginLabel();
    renderAuthModal();
    closeModal('loginModal');
  } catch { errEl.textContent = 'Cannot reach server. Is it running?'; }
}

function logout() {
  clearSession();
  updateLoginLabel();
  renderAuthModal();
}

function updateLoginLabel() {
  const u = getUser();
  document.getElementById('loginLabel').textContent = u ? u.username : 'Login';
}

// ── Score saving ──────────────────────────────────────────────────────────────
async function saveScore() {
  const token = getToken();
  const payload = {
    round: game.round, kills: game.kills,
    gold:  player.goldEarned || 0, score: game.score
  };
  // Always save to localStorage as fallback
  let lb = JSON.parse(localStorage.getItem('deadsurge_lb_local') || '[]');
  const u = getUser();
  lb.push({ name: u ? u.username : 'Guest', ...payload, date: new Date().toLocaleDateString() });
  lb.sort((a,b) => b.round - a.round || b.kills - a.kills || b.score - a.score);
  localStorage.setItem('deadsurge_lb_local', JSON.stringify(lb.slice(0,20)));
  // Also post to API if logged in
  if (token) {
    try { await apiPost('/api/scores', payload, token); } catch {}
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function refreshLeaderboard() {
  const el = document.getElementById('lbContent');
  el.innerHTML = '<div class="lb-empty">Loading…</div>';

  let rows = [];
  try {
    const { ok, data } = await apiGet('/api/leaderboard');
    if (ok && Array.isArray(data)) rows = data;
  } catch {
    // Fallback to local storage
    rows = (JSON.parse(localStorage.getItem('deadsurge_lb_local') || '[]'))
      .map(e => ({ username: e.name, round: e.round, kills: e.kills, gold: e.gold, score: e.score, date: e.date }));
  }

  if (!rows.length) { el.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>'; return; }
  const med = ['gold','silver','bronze'];
  el.innerHTML = `<table class="lb-tbl">
    <tr><th>#</th><th>Player</th><th>Round</th><th>Kills</th><th>Gold</th><th>Score</th><th>Date</th></tr>
    ${rows.map((r,i) => `<tr class="${med[i]||''}">
      <td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
      <td>${r.username||r.name}</td>
      <td>${r.round}</td><td>${r.kills}</td><td>$${r.gold}</td><td>${r.score}</td>
      <td style="font-size:11px;color:rgba(255,255,255,.35)">${r.date||''}</td>
    </tr>`).join('')}
  </table>`;
}

// ── Volume / Fullscreen ───────────────────────────────────────────────────────
function setMasterVol(v) {
  masterGain.gain.value = v / 100;
  ['volSlider','pmVolSlider'].forEach(id => { const el=document.getElementById(id); if(el) el.value=v; });
  ['volVal','pmVolVal'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=v+'%'; });
  localStorage.setItem('deadsurge_vol', v);
}
function toggleFS() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
}

// ── Animated menu background ──────────────────────────────────────────────────
const menuParticles = Array.from({length:72}, () => ({
  x: Math.random(), y: Math.random(),
  r: 0.7 + Math.random() * 2,
  vx: (Math.random()-.5) * 0.00011,
  vy: -0.00006 - Math.random() * 0.00016,
  a: Math.random() * Math.PI * 2,
  col: Math.random()<.38 ? 'rgba(180,0,0,' : Math.random()<.5 ? 'rgba(90,40,170,' : 'rgba(255,255,255,'
}));
let menuBgRunning = false;
function menuBgLoop() {
  if (menuBgRunning) return;
  menuBgRunning = true;
  const mc = document.getElementById('menuBg');
  const mx = mc.getContext('2d');
  function draw() {
    if (document.getElementById('menu').style.display === 'none') { menuBgRunning=false; return; }
    mc.width = window.innerWidth; mc.height = window.innerHeight;
    const g = mx.createRadialGradient(mc.width*.5,mc.height*.55,0,mc.width*.5,mc.height*.5,mc.width*.75);
    g.addColorStop(0,'#130922'); g.addColorStop(.5,'#0a0618'); g.addColorStop(1,'#060410');
    mx.fillStyle=g; mx.fillRect(0,0,mc.width,mc.height);
    menuParticles.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.a+=0.009;
      if(p.y<-0.02){p.y=1.02;p.x=Math.random();}
      mx.beginPath(); mx.arc(p.x*mc.width,p.y*mc.height,p.r,0,Math.PI*2);
      mx.fillStyle=p.col+((Math.sin(p.a)*.5+.5)*.5)+')'; mx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── KEYBIND UI ───────────────────────────────────────────────────────────────
const KB_RESERVED = new Set([
  'w','a','s','d',
  'arrowup','arrowdown','arrowleft','arrowright',
  'escape',
]);

function keyDisplayName(key) {
  if (key === ' ')          return 'SPACE';
  if (key === 'arrowup')    return '↑';
  if (key === 'arrowdown')  return '↓';
  if (key === 'arrowleft')  return '←';
  if (key === 'arrowright') return '→';
  if (key === 'tab')        return 'TAB';
  if (key === 'enter')      return 'ENTER';
  if (key === 'backspace')  return 'BKSP';
  if (key === 'delete')     return 'DEL';
  if (key === 'capslock')   return 'CAPS';
  return key.toUpperCase();
}

function updateKeybindUI() {
  // Update all keybind buttons — both settings modal (id=kbbtn-*) and pause menu (data-kb-action)
  document.querySelectorAll('[data-kb-action]').forEach(btn => {
    if (!btn.classList.contains('kb-listening'))
      btn.textContent = keyDisplayName(KEYBINDS[btn.dataset.kbAction]);
  });
  for (const action of Object.keys(DEFAULT_KEYBINDS)) {
    const btn = document.getElementById('kbbtn-' + action);
    if (btn && !btn.classList.contains('kb-listening')) btn.textContent = keyDisplayName(KEYBINDS[action]);
  }
}

let _rebindAction = null;
let _rebindBtn    = null;

function cancelRebind() {
  if (!_rebindAction) return;
  _rebindBtn.textContent = keyDisplayName(KEYBINDS[_rebindAction]);
  _rebindBtn.style.color = '';
  _rebindBtn.classList.remove('kb-listening');
  _rebindAction = null;
  _rebindBtn    = null;
}

function startRebind(action, btn) {
  if (_rebindAction) cancelRebind();
  _rebindAction = action;
  _rebindBtn    = btn;
  btn.textContent = '...';
  btn.classList.add('kb-listening');
}

function resetKeybind(action) {
  if (_rebindAction === action) cancelRebind();
  KEYBINDS[action] = DEFAULT_KEYBINDS[action];
  saveKeybinds();
  updateKeybindUI();
}

function _kbFeedback(msg, color) {
  _rebindBtn.textContent = msg;
  _rebindBtn.style.color = color;
  setTimeout(() => {
    if (_rebindBtn) { _rebindBtn.textContent = '...'; _rebindBtn.style.color = ''; }
  }, 1100);
}

// Capture phase — fires before game keydown handler so we can block propagation
document.addEventListener('keydown', e => {
  if (!_rebindAction) return;
  e.preventDefault();
  e.stopImmediatePropagation();

  const key = e.key === ' ' ? ' ' : e.key.toLowerCase();

  if (key === 'escape') { cancelRebind(); return; }

  // Block reserved keys (WASD, arrows, escape)
  if (KB_RESERVED.has(key)) { _kbFeedback('RESERVED!', '#ff4444'); return; }

  // Block pure modifier keys
  if (['shift','control','alt','meta'].includes(key)) { _kbFeedback('INVALID', '#ff8844'); return; }

  // Block duplicate — already assigned to another action
  for (const [act, k] of Object.entries(KEYBINDS)) {
    if (act !== _rebindAction && k === key) { _kbFeedback('IN USE!', '#ffaa22'); return; }
  }

  // Apply
  KEYBINDS[_rebindAction] = key;
  saveKeybinds();
  _rebindBtn.textContent = keyDisplayName(key);
  _rebindBtn.style.color = '';
  _rebindBtn.classList.remove('kb-listening');
  _rebindAction = null;
  _rebindBtn    = null;
}, true); // useCapture = true

// ── Boot ─────────────────────────────────────────────────────────────────────
(function boot() {
  updateLoginLabel();
  const sv = localStorage.getItem('deadsurge_vol');
  if (sv !== null) { document.getElementById('volSlider').value=sv; setMasterVol(sv); }
  menuBgLoop();
  updateKeybindUI(); // show saved keybinds on first open
})();
