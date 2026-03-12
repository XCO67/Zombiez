
// ─── MULTIPLAYER ──────────────────────────────────────────────────────────────
// Cleared — will be rebuilt cleanly.
// Stub keeps mp.active = false so single-player runs as normal.
const mp = { active: false };

// Single-player stubs for functions that enemies still reference
function nearestPlayerTo(cx, cy) { return player; }
function remoteGoDown(tgt) {}
