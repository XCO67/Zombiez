
// ─── BACKGROUND MUSIC (YouTube IFrame API) ────────────────────────────────────
// Video: https://youtu.be/sYEl20XYpTs
const MUSIC_VIDEO_ID = 'sYEl20XYpTs';

let ytPlayer       = null;
let musicReady     = false;
let musicVolume    = parseInt(localStorage.getItem('deadsurge_music_vol') ?? '40', 10);
let musicStarted   = false; // true after first user interaction starts playback

// Called automatically by YouTube IFrame API once script loads
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-music-player', {
    height: '1',
    width: '1',
    videoId: MUSIC_VIDEO_ID,
    playerVars: {
      autoplay: 1,
      loop: 1,
      playlist: MUSIC_VIDEO_ID, // required for loop to work
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onMusicReady,
      onStateChange: onMusicStateChange,
    },
  });
}

function onMusicReady(e) {
  musicReady = true;
  e.target.setVolume(musicVolume);
  // Try to play immediately; browsers may block until user interaction
  e.target.playVideo();
}

function onMusicStateChange(e) {
  // If ended (shouldn't happen with loop, but just in case), replay
  if (e.data === YT.PlayerState.ENDED) {
    ytPlayer.playVideo();
  }
  // If paused/cued after first user interaction, resume
  if (musicStarted && (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED)) {
    ytPlayer.playVideo();
  }
}

// Start music on first user interaction (required by browser autoplay policy)
function tryStartMusic() {
  if (musicStarted) return;
  musicStarted = true;
  if (ytPlayer && musicReady) {
    ytPlayer.setVolume(musicVolume);
    ytPlayer.playVideo();
  }
}
document.addEventListener('mousedown', tryStartMusic, { once: false });
document.addEventListener('keydown',   tryStartMusic, { once: false });

// Called from settings slider
function setMusicVol(v) {
  musicVolume = parseInt(v, 10);
  ['musicSlider','pmMusicSlider'].forEach(id => { const el=document.getElementById(id); if(el) el.value=v; });
  ['musicVal','pmMusicVal'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=v+'%'; });
  localStorage.setItem('deadsurge_music_vol', v);
  if (ytPlayer && musicReady) {
    ytPlayer.setVolume(musicVolume);
    if (musicVolume > 0) ytPlayer.unMute();
    else ytPlayer.mute();
  }
}

// Restore saved music volume on load
(function initMusicVol() {
  const saved = localStorage.getItem('deadsurge_music_vol');
  if (saved !== null) {
    musicVolume = parseInt(saved, 10);
    const slider = document.getElementById('musicSlider');
    const label  = document.getElementById('musicVal');
    if (slider) slider.value = musicVolume;
    if (label)  label.textContent = musicVolume + '%';
  }
})();
