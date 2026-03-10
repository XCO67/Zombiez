
// ─── MAP ──────────────────────────────────────────────────────────────────────
let MAP_W = 40, MAP_H = 28;
const T = { WALL: 0, FLOOR: 1, PILLAR: 2, SPAWN: 3, DOOR: 4, BOSS_SPAWN: 5, FLOOR2: 6, COLOR_FLOOR: 7, SPIDER_SPAWN: 8 };

function buildMap() {
  const m = Array.from({ length: MAP_H }, () => new Uint8Array(MAP_W));
  function fill(r1, r2, c1, c2, v) {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) m[r][c] = v;
  }
  fill(8,19,10,29,T.FLOOR); fill(1,7,17,22,T.FLOOR); fill(20,26,17,22,T.FLOOR);
  fill(12,15,1,9,T.FLOOR);  fill(12,15,30,38,T.FLOOR);
  fill(10,11,13,14,T.PILLAR); fill(10,11,25,26,T.PILLAR);
  fill(16,17,13,14,T.PILLAR); fill(16,17,25,26,T.PILLAR);
  fill(1,2,17,22,T.SPAWN); fill(25,26,17,22,T.SPAWN);
  fill(12,15,1,2,T.SPAWN);  fill(12,15,37,38,T.SPAWN);
  fill(2,6,24,38,T.FLOOR);
  fill(3,5,23,23,T.DOOR);
  fill(21,25,1,15,T.FLOOR);
  fill(22,24,16,16,T.DOOR);
  return m;
}
let MAP = buildMap();

let COLOR_FLOORS = []; // [[r, c, '#hexcolor'], ...]

let TORCHES = [
  [7,16],[7,23],[20,16],[20,23],[11,9],[16,9],[11,30],[16,30],
  [8,9],[8,30],[19,9],[19,30],[4,16],[4,23],[23,16],[23,23],
  [3,26],[3,36],[5,26],[5,36],
  [22,3],[22,13],[24,3],[24,13],
];

let PLAYER_START = { cx:19.5, cy:13.5 };
let GOLD_BUTTONS = [];
let DECORATIONS = []; // [{type, cx, cy}, ...]

// ─── DOORS ────────────────────────────────────────────────────────────────────
const DOORS = [
  {
    name: 'East Wing',
    desc: 'Armory & open space',
    tiles: [{r:3,c:23},{r:4,c:23},{r:5,c:23}],
    cx:23, cy:4,
    cost:750, unlocked:false,
  },
  {
    name: 'West Cellar',
    desc: 'Secret underground room',
    tiles: [{r:22,c:16},{r:23,c:16},{r:24,c:16}],
    cx:16, cy:23,
    cost:750, unlocked:false,
  },
];

function unlockDoor(door) {
  door.unlocked = true;
  door.tiles.forEach(({r,c}) => { MAP[r][c] = T.FLOOR; });
}

// ─── MAP STORAGE ──────────────────────────────────────────────────────────────
function getMaps() { return JSON.parse(localStorage.getItem('deadsurge_maps') || '[]'); }
function saveMaps(arr) { localStorage.setItem('deadsurge_maps', JSON.stringify(arr)); }
function getActiveMapId() { return localStorage.getItem('deadsurge_active') || 'default'; }
function setActiveMapId(id) { localStorage.setItem('deadsurge_active', id); }
function upsertMap(m) { const a=getMaps(); const i=a.findIndex(x=>x.id===m.id); if(i>=0)a[i]=m; else a.push(m); saveMaps(a); }
function deleteMap(id) { saveMaps(getMaps().filter(m=>m.id!==id)); if(getActiveMapId()===id)setActiveMapId('default'); }
function getMapById(id) { return getMaps().find(m=>m.id===id) || null; }

async function fetchMapsFromServer() {
  try {
    const res = await fetch(API_URL + '/api/maps');
    if (!res.ok) throw new Error('Server error');
    const maps = await res.json();
    saveMaps(maps); // cache locally
    return maps;
  } catch (e) {
    console.warn('[Dead Surge] Could not fetch maps from server:', e);
    return getMaps();
  }
}

async function fetchMapFromServer(id) {
  const local = getMapById(id);
  if (local) return local;
  try {
    const maps = await fetchMapsFromServer();
    return maps.find(m => m.id === id) || null;
  } catch (e) {
    return null;
  }
}

function applyMapData(data) {
  MAP_W = data.mapW; MAP_H = data.mapH;
  MAP.length = 0;
  for (let r=0;r<MAP_H;r++) {
    const row=new Uint8Array(MAP_W);
    for (let c=0;c<MAP_W;c++) row[c]=data.tiles[r]?.[c]??0;
    MAP.push(row);
  }
  TORCHES = data.torches || [];
  COLOR_FLOORS = data.colorFloors || [];
  if (data.playerStart) { PLAYER_START.cx=data.playerStart[0]; PLAYER_START.cy=data.playerStart[1]; }
  // Rebuild doors from custom markers, or unlock hardcoded ones if no custom doors
  const customDoors = data.doors || data.objects?.doors || [];
  if (customDoors.length > 0) {
    DOORS.length = 0;
    customDoors.forEach(d => {
      const tiles = [];
      for (let r=0;r<MAP_H;r++) for (let c=0;c<MAP_W;c++) {
        if (MAP[r][c]===T.DOOR && Math.hypot(c+0.5-d.cx, r+0.5-d.cy)<5) tiles.push({r,c});
      }
      DOORS.push({ name:d.name||'Door', desc:'', tiles, cx:d.cx, cy:d.cy, cost:d.cost||750, unlocked:false });
    });
  } else {
    DOORS.forEach(d=>{ d.unlocked=true; });
  }
  // Apply vendor/object positions if provided
  if (data.objects) {
    const o = data.objects;
    if (o.shop)       { SHOP_POS.cx=o.shop.cx;             SHOP_POS.cy=o.shop.cy; }
    if (o.ammo)       { AMMO_POS.cx=o.ammo.cx;             AMMO_POS.cy=o.ammo.cy; }
    if (o.pap)        { PAP_POS.cx=o.pap.cx;               PAP_POS.cy=o.pap.cy; }
    if (o.perkvendor)   { PERK_VENDOR_POS.cx=o.perkvendor.cx;     PERK_VENDOR_POS.cy=o.perkvendor.cy; }
    if (o.pistolvendor) { PISTOL_VENDOR_POS.cx=o.pistolvendor.cx; PISTOL_VENDOR_POS.cy=o.pistolvendor.cy; }
    if (o.box)          { BOX_POS.cx=o.box.cx;                    BOX_POS.cy=o.box.cy; }
    if (o.devchest)   { DEV_CHEST_POS.cx=o.devchest.cx;    DEV_CHEST_POS.cy=o.devchest.cy; }
    if (o.goldbuttons)  GOLD_BUTTONS = o.goldbuttons.map(g=>({cx:g.cx,cy:g.cy}));
    if (o.decorations)  DECORATIONS  = o.decorations.map(d=>({...d}));
    if (o.ricochet)   { RICOCHET_POS.cx=o.ricochet.cx;    RICOCHET_POS.cy=o.ricochet.cy; }
  }
}

// Load active map on startup
(async function loadActiveMap() {
  try {
    const id = getActiveMapId();
    if (id === 'default') return; // use buildMap() result
    const m = await fetchMapFromServer(id);
    if (m) { applyMapData(m); console.log('[Dead Surge] Loaded map:', m.name); }
    else { setActiveMapId('default'); }
  } catch(e) { console.warn('[Dead Surge] Map load failed:', e); }
})();
