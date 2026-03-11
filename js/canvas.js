
// ─── CANVAS ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
let ctx = canvas.getContext('2d');
let TW, TH;
const lightCanvas = document.createElement('canvas');
const lx = lightCanvas.getContext('2d');

let VIEW_W = 28;        // tiles visible horizontally (default zoom)
let _targetViewW = 28;  // smooth zoom target
const MIN_VIEW_W = 20;  // most zoomed in  (logical limit)
const MAX_VIEW_W = 38;  // most zoomed out (logical limit)
let camX = 0, camY = 0; // top-left of viewport in world pixels

function resize() {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  TW = canvas.width / VIEW_W;
  TH = TW; // square tiles
  lightCanvas.width = canvas.width; lightCanvas.height = canvas.height;
  // Note: tile cache is NOT invalidated on zoom — it's scaled with drawImage instead
  // Only invalidate on window resize (different screen size, need fresh cache)
  tileCacheDirty = true;
}
resize();
window.addEventListener('resize', resize);

function updateCamera() {
  const maxX = Math.max(0, MAP_W * TW - canvas.width);
  const maxY = Math.max(0, MAP_H * TH - canvas.height);
  camX = Math.max(0, Math.min(maxX, player.cx * TW - canvas.width  / 2));
  camY = Math.max(0, Math.min(maxY, player.cy * TH - canvas.height / 2));
}
