
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

function playMysteryBoxSpinSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;

  // Carnival music-box jingle — triangle waves, fast attack, medium decay
  // Melody: ascending run → descending variation (CoD mystery box feel)
  const melody = [
    // [freq Hz, startOffset, duration, gain]
    [784,  0.00, 0.14, 0.20],  // G5
    [988,  0.11, 0.14, 0.20],  // B5
    [1175, 0.22, 0.14, 0.22],  // D6
    [1319, 0.33, 0.16, 0.24],  // E6
    [1568, 0.46, 0.18, 0.26],  // G6
    [1319, 0.60, 0.14, 0.22],  // E6
    [1175, 0.71, 0.14, 0.20],  // D6
    [988,  0.82, 0.14, 0.18],  // B5
    [880,  0.93, 0.14, 0.18],  // A5
    [1047, 1.04, 0.14, 0.20],  // C6
    [1319, 1.15, 0.16, 0.22],  // E6
    [1047, 1.28, 0.14, 0.20],  // C6
    [880,  1.39, 0.14, 0.18],  // A5
    [784,  1.50, 0.14, 0.18],  // G5
    [988,  1.61, 0.14, 0.20],  // B5
    [1175, 1.72, 0.18, 0.22],  // D6
    [1568, 1.87, 0.30, 0.28],  // G6 — held ending note
  ];
  melody.forEach(([freq, t, dur, gainVal]) => {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + t);
    g.gain.linearRampToValueAtTime(gainVal, now + t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(now + t); osc.stop(now + t + dur + 0.02);
  });

  // Twinkle shimmer — rapid high-freq sine burst underneath the melody
  const shimmer = [784, 1047, 1319, 1568, 1319, 1047, 784];
  shimmer.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * 2; // two octaves up
    const t = i * 0.09;
    g.gain.setValueAtTime(0, now + t);
    g.gain.linearRampToValueAtTime(0.06, now + t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.09);
    osc.connect(g); g.connect(masterGain);
    osc.start(now + t); osc.stop(now + t + 0.10);
  });
}

function playMysteryBoxResultSound() {
  if (audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;

  // Magical reveal — sparkling ascending arpeggio then a warm chord swell
  const sparkle = [
    [1047, 0.00, 0.12, 0.18],  // C6
    [1319, 0.08, 0.12, 0.20],  // E6
    [1568, 0.16, 0.14, 0.22],  // G6
    [2093, 0.25, 0.18, 0.24],  // C7
    [2637, 0.36, 0.22, 0.26],  // E7
    [3136, 0.50, 0.30, 0.22],  // G7
  ];
  sparkle.forEach(([freq, t, dur, gainVal]) => {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + t);
    g.gain.linearRampToValueAtTime(gainVal, now + t + 0.010);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(now + t); osc.stop(now + t + dur + 0.02);
  });

  // Warm chord swell underneath (G major: G3, B3, D4, G4)
  [[196, 0.38], [247, 0.40], [294, 0.42], [392, 0.44]].forEach(([freq, t]) => {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + t);
    g.gain.linearRampToValueAtTime(0.12, now + t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.70);
    osc.connect(g); g.connect(masterGain);
    osc.start(now + t); osc.stop(now + t + 0.75);
  });

  // Bright noise sparkle burst
  const bufLen = Math.floor(audioCtx.sampleRate * 0.15);
  const buf  = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const noise = audioCtx.createBufferSource(); noise.buffer = buf;
  const hpf = audioCtx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 4000;
  const gn = audioCtx.createGain();
  gn.gain.setValueAtTime(0.18, now + 0.30);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.50);
  noise.connect(hpf); hpf.connect(gn); gn.connect(masterGain);
  noise.start(now + 0.30); noise.stop(now + 0.55);
}
