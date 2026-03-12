
// ─── SHOP ─────────────────────────────────────────────────────────────────────
const SHOP_POS = { cx:12.5, cy:13.5 };
const SHOP_RADIUS = 2.0;
const SHOP_ITEMS = [
  { key:'damage',   name:'DAMAGE',     icon:'⚔', color:'#ff8844',
    desc: l => `×${Math.pow(1.3,l).toFixed(2)} dmg  →  ×${Math.pow(1.3,l+1).toFixed(2)} dmg  (all weapons)`,
    price: l => (l+1)*100, maxLevel:5 },
  { key:'atkSpeed', name:'ATK SPEED',  icon:'⚡', color:'#ffdd44',
    desc: l => `+${Math.round((1-Math.pow(0.85,l))*100)}% speed  →  +${Math.round((1-Math.pow(0.85,l+1))*100)}% speed`,
    price: l => (l+1)*150, maxLevel:5 },
  { key:'crit',      name:'CRIT STRIKE', icon:'★', color:'#aa44ff',
    desc: l => `${l*10}% crit  →  ${(l+1)*10}% crit (×2 dmg)`,
    price: l => (l+1)*200, maxLevel:5 },
  { key:'mercenary', name:'MERCENARY',   icon:'⚔', color:'#88ccff',
    desc: l => l === 0 ? 'Hire a knight companion  •  Follows you  •  Auto-attacks all enemies' : 'Active — your mercenary fights by your side!',
    price: () => 5000, maxLevel:1 },
];
let shopOpen = false;
let perkShopOpen = false;
let weaponInfoOpen = false;

// ─── PERK VENDOR ──────────────────────────────────────────────────────────────
const PERK_VENDOR_POS = { cx:24.5, cy:18 };
const PERK_VENDOR_RADIUS = 2.0;
const SHIELD_MAXHP = [0, 15,  25,  40,  55,  70 ];
const SHIELD_DELAY = [0, 420, 390, 360, 330, 300]; // frames before recharge
const SHIELD_RATE  = [0, 4,   6,   8,   10,  13 ]; // HP regen per second
const LIFESTEAL_HP = [0, 1,   2,   3,   4,   5  ];
const MAGNET_RADII = [8, 10,  12,  14,  16,  18 ]; // index 0 = base (temp perk), 1-5 = bought levels
const PERK_SHOP_ITEMS = [
  { key:'magnet',    name:'MAGNET',    icon:'🧲', color:'#60ccff',
    desc: l => `Radius ${MAGNET_RADII[l]}→${MAGNET_RADII[l+1]} tiles  •  Always active`,
    price: l => (l+1)*200, maxLevel:5 },
  { key:'shield',    name:'SHIELD',    icon:'🛡', color:'#4499ff',
    desc: l => `${SHIELD_MAXHP[l]}→${SHIELD_MAXHP[l+1]} HP shield  •  Recharges after ${['-',7,6.5,6,5.5,5][l+1]}s`,
    price: l => (l+1)*300, maxLevel:5 },
  { key:'lifesteal', name:'LIFESTEAL', icon:'🩸', color:'#ff4466',
    desc: l => `${LIFESTEAL_HP[l]}→${LIFESTEAL_HP[l+1]} HP healed per kill`,
    price: l => (l+1)*250, maxLevel:5 },
  { key:'moveSpeed', name:'MOVE SPEED', icon:'👟', color:'#44ffaa',
    desc: l => `+${l*12}% speed  →  +${(l+1)*12}% speed  (max +60%)`,
    price: l => (l+1)*200, maxLevel:5 },
  { key:'hpRegen',   name:'HP REGEN',   icon:'❤', color:'#ff4d6d',
    desc: l => `${[0,2,5,8,11,15][l]} hp/s  →  ${[0,2,5,8,11,15][l+1]} hp/s  (after 5s no dmg)`,
    price: l => (l+1)*225, maxLevel:5 },
];

// ─── PISTOL UPGRADE VENDOR ────────────────────────────────────────────────────
const PISTOL_VENDOR_POS    = { cx: 17.5, cy: 18 };
const PISTOL_VENDOR_RADIUS = 2.0;
const PISTOL_UPGRADE_COST  = 2500;
