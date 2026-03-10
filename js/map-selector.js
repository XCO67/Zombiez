
// ─── MAP SELECTOR ─────────────────────────────────────────────────────────────
async function openMapSelect() {
  const modal = document.getElementById('mapSelectModal');
  const list  = document.getElementById('mapSelectList');
  modal.style.display = 'flex';
  list.innerHTML = '<p style="color:rgba(255,255,255,.35);font-size:13px;text-align:center;padding:16px">Loading maps…</p>';

  const maps = await fetchMapsFromServer();
  const activeId = getActiveMapId();
  let html = '';

  maps.forEach(m => {
    const active = activeId === m.id;
    html += `<div class="map-row">
      <span class="map-row-name">${active?'★ ':''}${escHtml(m.name)}</span>
      <span class="map-row-size">${m.mapW}×${m.mapH}</span>
      <button class="play-btn" onclick="selectAndPlay('${m.id}')">▶ Play</button>
      <a href="/editor?id=${m.id}" style="padding:4px 10px;border-radius:5px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#ccc;cursor:pointer;font-size:11px;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center">✏ Edit</a>
    </div>`;
  });

  if (!maps.length) html += `<p style="color:rgba(255,255,255,.35);font-size:13px;text-align:center;padding:16px">No published maps yet.<br>Use the Map Editor to create and publish one.</p>`;
  list.innerHTML = html;
}
function closeMapSelect() { document.getElementById('mapSelectModal').style.display='none'; }
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
async function selectAndPlay(id) {
  setActiveMapId(id);
  if (id === 'default') { applyDefaultMap(); }
  else {
    const m = await fetchMapFromServer(id);
    if (m) applyMapData(m);
  }
  closeMapSelect();
  startGame();
}
function applyDefaultMap() {
  MAP_W=40; MAP_H=28;
  const built = buildMap();
  MAP.length=0; built.forEach(r=>MAP.push(r));
  TORCHES=[[7,16],[7,23],[20,16],[20,23],[11,9],[16,9],[11,30],[16,30],[8,9],[8,30],[19,9],[19,30],[4,16],[4,23],[23,16],[23,23],[3,26],[3,36],[5,26],[5,36],[22,3],[22,13],[24,3],[24,13]];
  PLAYER_START.cx=19.5; PLAYER_START.cy=13.5;
  DOORS.forEach(d=>{ d.unlocked=false; d.tiles.forEach(({r,c})=>{ MAP[r][c]=T.DOOR; }); });
}
async function confirmDeleteMap(id, name) {
  if (confirm(`Delete map "${name}"?`)) {
    try { await fetch(API_URL + '/api/maps/' + id, { method: 'DELETE' }); } catch(e) {}
    deleteMap(id);
    openMapSelect();
  }
}
