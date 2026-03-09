
// ─── COLLISION ────────────────────────────────────────────────────────────────
const PLAYER_R = 0.28;
function isBlocked(cx,cy) {
  const minC=Math.floor(cx-PLAYER_R),maxC=Math.floor(cx+PLAYER_R);
  const minR=Math.floor(cy-PLAYER_R),maxR=Math.floor(cy+PLAYER_R);
  for (let row=minR;row<=maxR;row++) for (let col=minC;col<=maxC;col++) {
    if (row<0||row>=MAP_H||col<0||col>=MAP_W) return true;
    const t=MAP[row][col]; if (t===T.WALL||t===T.PILLAR||t===T.DOOR) return true;
  }
  return false;
}
