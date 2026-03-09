
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
