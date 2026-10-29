import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { sfx } from './audio/soundfx.js';
import { firstIncompleteLevel } from './progress.js';

const PLAYTEST_KEY = 'moonrescue_playtest_level';

async function resolveBootData(){
  const params = new URLSearchParams(location.search);

  // ?levelFile=/src/levels/whatever.json — load any saved level file by path,
  // without needing to register it in src/levels.js first. Dev/editor route:
  // skips the level-select screen and boots straight into the level.
  const levelFile = params.get('levelFile');
  if (levelFile){
    try {
      const res = await fetch(levelFile);
      if (res.ok) return { levelData: await res.json() };
      console.warn('levelFile fetch failed:', res.status, levelFile);
    } catch (err){ console.warn('levelFile fetch error:', err); }
  }

  // ?playtest=1 — launched from the level editor's "Playtest" button, which
  // stashes the in-progress (possibly unsaved) level in sessionStorage.
  if (params.get('playtest') === '1'){
    try {
      const raw = sessionStorage.getItem(PLAYTEST_KEY);
      if (raw) return { levelData: JSON.parse(raw) };
    } catch (err){ /* fall through to the default level below */ }
  }

  // Normal boot: open on the level-select screen rather than dropping
  // straight into a mission. The level it preloads in the background is
  // just a sensible default (first incomplete one) in case the player picks
  // it; GameScene shows panel-select on top until they actually choose.
  return { levelId: firstIncompleteLevel().id, showSelect: true };
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // RESIZE (rather than a fixed 960x600 FIT) lets the canvas always fill
  // #stage exactly, whatever shape that is. The camera follows the rocket
  // and derives its bounds from the level's world size (see GameScene),
  // not from this resolution, so a portrait phone just reveals more of the
  // shaft vertically instead of letterboxing down to a tiny landscape rect.
  width: 960,
  height: 600,
  backgroundColor: '#040406',
  scale: { mode: Phaser.Scale.RESIZE },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } }
};

const game = new Phaser.Game(config);
window.__game = game; // debug hook
window.__sfx = sfx; // debug hook

resolveBootData().then((bootData) => {
  game.scene.add('game', GameScene, true, bootData);
});

// Music mute toggle — lives outside the scene entirely (sfx is a standalone
// singleton), so it's wired up once here rather than rebuilt on every
// scene.restart() the way scene-owned buttons are.
const musicBtn = document.getElementById('btn-music');
function refreshMusicBtn(){
  musicBtn.textContent = sfx.musicEnabled ? '🎵' : '🔇';
  musicBtn.classList.toggle('muted', !sfx.musicEnabled);
}
refreshMusicBtn();
musicBtn.addEventListener('click', () => {
  sfx.toggleMusic();
  refreshMusicBtn();
});
window.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key.toLowerCase() === 'm'){
    sfx.toggleMusic();
    refreshMusicBtn();
  }
});
