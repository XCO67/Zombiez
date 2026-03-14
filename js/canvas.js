
// ─── CANVAS ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
let ctx = canvas.getContext('2d');
let TW, TH;
const lightCanvas = document.createElement('canvas');
const lx = lightCanvas.getContext('2d');

// ── Medieval crosshair CSS cursor (SVG data URL, hotspot at centre 16,16) ──────
(function() {
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>",
    // dark shadow arms
    "<line x1='16' y1='1' x2='16' y2='11' stroke='black' stroke-width='4' stroke-linecap='square' opacity='.7'/>",
    "<line x1='16' y1='21' x2='16' y2='31' stroke='black' stroke-width='4' stroke-linecap='square' opacity='.7'/>",
    "<line x1='1' y1='16' x2='11' y2='16' stroke='black' stroke-width='4' stroke-linecap='square' opacity='.7'/>",
    "<line x1='21' y1='16' x2='31' y2='16' stroke='black' stroke-width='4' stroke-linecap='square' opacity='.7'/>",
    // gold arms
    "<line x1='16' y1='2' x2='16' y2='11' stroke='%23c8961e' stroke-width='2' stroke-linecap='square'/>",
    "<line x1='16' y1='21' x2='16' y2='30' stroke='%23c8961e' stroke-width='2' stroke-linecap='square'/>",
    "<line x1='2' y1='16' x2='11' y2='16' stroke='%23c8961e' stroke-width='2' stroke-linecap='square'/>",
    "<line x1='21' y1='16' x2='30' y2='16' stroke='%23c8961e' stroke-width='2' stroke-linecap='square'/>",
    // arrowhead tips (N/S/E/W)
    "<polygon points='16,0 12,6 20,6' fill='%23ffd040'/>",
    "<polygon points='16,32 12,26 20,26' fill='%23ffd040'/>",
    "<polygon points='0,16 6,12 6,20' fill='%23ffd040'/>",
    "<polygon points='32,16 26,12 26,20' fill='%23ffd040'/>",
    // inner aim ring
    "<circle cx='16' cy='16' r='4' fill='none' stroke='%23c8961e' stroke-width='1' opacity='.55'/>",
    // corner heraldic brackets
    "<path d='M6,6 v5 h5' fill='none' stroke='%23c8961e' stroke-width='1.5' opacity='.7'/>",
    "<path d='M26,6 v5 h-5' fill='none' stroke='%23c8961e' stroke-width='1.5' opacity='.7'/>",
    "<path d='M6,26 v-5 h5' fill='none' stroke='%23c8961e' stroke-width='1.5' opacity='.7'/>",
    "<path d='M26,26 v-5 h-5' fill='none' stroke='%23c8961e' stroke-width='1.5' opacity='.7'/>",
    // centre diamond aim point
    "<polygon points='16,12 20,16 16,20 12,16' fill='%23cc1111'/>",
    "<rect x='15' y='15' width='2' height='2' fill='%23ff8888'/>",
    "</svg>"
  ].join('');
  canvas.style.cursor = "url(\"data:image/svg+xml," + svg + "\") 16 16, crosshair";
})();

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
