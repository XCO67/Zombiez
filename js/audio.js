
// ─── AUDIO ────────────────────────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.8;
masterGain.connect(audioCtx.destination);
function resumeAudio() { if (audioCtx.state === 'suspended') audioCtx.resume(); }
document.addEventListener('mousedown', resumeAudio);
document.addEventListener('keydown',   resumeAudio);

function playOverheatSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Rising sawtooth buzz — harsh alarm feel
  const osc1 = audioCtx.createOscillator(), g1 = audioCtx.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(180, now);
  osc1.frequency.exponentialRampToValueAtTime(900, now + 0.28);
  g1.gain.setValueAtTime(0.18, now);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  osc1.connect(g1); g1.connect(masterGain);
  osc1.start(now); osc1.stop(now + 0.32);
  // Sharp click on top
  const osc2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(440, now);
  g2.gain.setValueAtTime(0.22, now);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc2.connect(g2); g2.connect(masterGain);
  osc2.start(now); osc2.stop(now + 0.07);
}

function playCooledSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Soft descending whoosh
  const osc1 = audioCtx.createOscillator(), g1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(700, now);
  osc1.frequency.exponentialRampToValueAtTime(260, now + 0.22);
  g1.gain.setValueAtTime(0.16, now);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  osc1.connect(g1); g1.connect(masterGain);
  osc1.start(now); osc1.stop(now + 0.24);
  // Clean "ready" ping slightly after
  const osc2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1400, now + 0.14);
  g2.gain.setValueAtTime(0, now); g2.gain.setValueAtTime(0.18, now + 0.14);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  osc2.connect(g2); g2.connect(masterGain);
  osc2.start(now + 0.14); osc2.stop(now + 0.38);
}

function playThundergunSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Wind rush — filtered noise burst
  const bufLen = Math.floor(audioCtx.sampleRate * 0.65);
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource(); noise.buffer = buf;
  const bpf = audioCtx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.Q.value = 1.2;
  bpf.frequency.setValueAtTime(200, now);
  bpf.frequency.exponentialRampToValueAtTime(1400, now + 0.28);
  bpf.frequency.exponentialRampToValueAtTime(400, now + 0.6);
  const gn = audioCtx.createGain();
  gn.gain.setValueAtTime(0, now);
  gn.gain.linearRampToValueAtTime(0.55, now + 0.07);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.connect(bpf); bpf.connect(gn); gn.connect(masterGain);
  noise.start(now); noise.stop(now + 0.65);
  // Deep boom underneath
  const osc = audioCtx.createOscillator(); const gb = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(55, now);
  osc.frequency.exponentialRampToValueAtTime(22, now + 0.5);
  gb.gain.setValueAtTime(0.4, now); gb.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  osc.connect(gb); gb.connect(masterGain); osc.start(now); osc.stop(now + 0.55);
}

function playXenoblasterSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  // Organic "blorp" — low warbling alien pulse
  const osc1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(280, now);
  osc1.frequency.exponentialRampToValueAtTime(55, now + 0.15);
  osc1.frequency.exponentialRampToValueAtTime(200, now + 0.32);
  g1.gain.setValueAtTime(0.30, now);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  osc1.connect(g1); g1.connect(masterGain); osc1.start(now); osc1.stop(now + 0.4);
  // High alien harmonic shimmer
  const osc2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(2200, now);
  osc2.frequency.exponentialRampToValueAtTime(700, now + 0.28);
  g2.gain.setValueAtTime(0.13, now);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
  osc2.connect(g2); g2.connect(masterGain); osc2.start(now); osc2.stop(now + 0.32);
  // Wet plasma splat — short noise burst
  const bufLen = Math.floor(audioCtx.sampleRate * 0.10);
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const noise = audioCtx.createBufferSource(); noise.buffer = buf;
  const bpf = audioCtx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.Q.value = 4.0; bpf.frequency.value = 900;
  const gn = audioCtx.createGain();
  gn.gain.setValueAtTime(0.20, now); gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
  noise.connect(bpf); bpf.connect(gn); gn.connect(masterGain);
  noise.start(now); noise.stop(now + 0.12);
  // Sub-bass thump for weight
  const osc3 = audioCtx.createOscillator(); const g3 = audioCtx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(90, now); osc3.frequency.exponentialRampToValueAtTime(28, now + 0.22);
  g3.gain.setValueAtTime(0.24, now); g3.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc3.connect(g3); g3.connect(masterGain); osc3.start(now); osc3.stop(now + 0.28);
}

function playPistolSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;

  // Main ray tone: high-pitched sine sweeping down fast
  const osc1  = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1200, now);
  osc1.frequency.exponentialRampToValueAtTime(180, now + 0.16);
  gain1.gain.setValueAtTime(0.22, now);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc1.connect(gain1); gain1.connect(masterGain);
  osc1.start(now); osc1.stop(now + 0.16);

  // Harmonic layer: triangle an octave up, shorter, gives the "zap" edge
  const osc2  = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(2200, now);
  osc2.frequency.exponentialRampToValueAtTime(350, now + 0.10);
  gain2.gain.setValueAtTime(0.10, now);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
  osc2.connect(gain2); gain2.connect(masterGain);
  osc2.start(now); osc2.stop(now + 0.10);
}
