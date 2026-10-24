import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { LEVELS } from './levels.js';
import { sfx } from './audio/soundfx.js';

const PLAYTEST_KEY = 'moonrescue_playtest_level';

async function resolveBootData(){
  const params = new URLSearchParams(location.search);

  // ?levelFile=/src/levels/whatever.json — load any saved level file by path,
  // without needing to register it in src/levels.js first.
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

  return { levelId: LEVELS[0].id };
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 960,
  height: 600,
  backgroundColor: '#040406',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } }
};

const game = new Phaser.Game(config);
window.__game = game; // debug hook
window.__sfx = sfx; // debug hook

resolveBootData().then((bootData) => {
  game.scene.add('game', GameScene, true, bootData);
});
