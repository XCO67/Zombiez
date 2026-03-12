
// ─── SPRITES ──────────────────────────────────────────────────────────────────
const DIRS = ['east','south-east','south','south-west','west','north-west','north','north-east'];

function loadFrames(base, dir, n) {
  return Array.from({length: n}, (_, i) => {
    const img = new Image();
    img.src = `${base}/${dir}/frame_${String(i).padStart(3,'0')}.png`;
    return img;
  });
}

const charWalk = {}, charIdle = {};
DIRS.forEach(d => {
  charWalk[d] = loadFrames('wizard/animations/walk-1', d, 6);
  const img = new Image(); img.src = `wizard/rotations/${d}.png`; charIdle[d] = img;
});

const zWalk = {};
DIRS.forEach(d => { zWalk[d] = loadFrames('zombies/animations/scary-walk', d, 8); });

const dragonWalk = {};
DIRS.forEach(d => { dragonWalk[d] = loadFrames('dragon/animations/scary-walk', d, 8); });

const skelWalk = {};
DIRS.forEach(d => { skelWalk[d] = loadFrames('skeleton/animations/running-4-frames', d, 4); });

const lavaWalk = {};
DIRS.forEach(d => { lavaWalk[d] = loadFrames('LavaZombie/animations/scary-walk', d, 8); });

function dir8(dx, dy) {
  let a = Math.atan2(dy, dx) * 180 / Math.PI;
  if (a < 0) a += 360;
  return DIRS[Math.round(a / 45) % 8];
}

const knightImg = new Image();
knightImg.src = 'css/knight.png';
