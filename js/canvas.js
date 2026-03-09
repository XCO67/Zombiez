
// ─── CANVAS ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let TW, TH;
const lightCanvas = document.createElement('canvas');
const lx = lightCanvas.getContext('2d');

let VIEW_W = 32;        // tiles visible horizontally (default zoom)
const MIN_VIEW_W = 18;  // most zoomed in
const MAX_VIEW_W = 42;  // most zoomed out
let camX = 0, camY = 0; // top-left of viewport in world pixels

function resize() {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  TW = canvas.width / VIEW_W;
  TH = TW; // square tiles
  lightCanvas.width = canvas.width; lightCanvas.height = canvas.height;
}
resize();
window.addEventListener('resize', resize);

function updateCamera() {
  const maxX = Math.max(0, MAP_W * TW - canvas.width);
  const maxY = Math.max(0, MAP_H * TH - canvas.height);
  camX = Math.max(0, Math.min(maxX, player.cx * TW - canvas.width  / 2));
  camY = Math.max(0, Math.min(maxY, player.cy * TH - canvas.height / 2));
}
