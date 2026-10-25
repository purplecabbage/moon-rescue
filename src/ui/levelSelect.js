import { LEVELS } from '../levels.js';
import { isLevelUnlocked, isLevelComplete } from '../progress.js';
import { getLeaderboard, formatTime } from '../leaderboard.js';
import * as hud from './hud.js';

function renderRows(onSelect){
  const list = document.getElementById('level-list');
  list.innerHTML = '';
  LEVELS.forEach((level, i) => {
    const unlocked = isLevelUnlocked(level.id);
    const complete = isLevelComplete(level.id);

    const row = document.createElement('button');
    row.className = 'level-row' + (unlocked ? '' : ' locked') + (complete ? ' complete' : '');
    row.disabled = !unlocked;
    row.type = 'button';

    const num = document.createElement('span');
    num.className = 'level-num';
    num.textContent = String(i + 1).padStart(2, '0');

    const name = document.createElement('span');
    name.className = 'level-name';
    name.textContent = level.name;

    const status = document.createElement('span');
    status.className = 'level-status';
    if (!unlocked){
      status.textContent = '🔒 LOCKED';
    } else if (complete){
      const best = getLeaderboard(level.id)[0];
      status.textContent = best ? ('✓ BEST ' + formatTime(best.timeMs)) : '✓ COMPLETE';
    } else {
      status.textContent = 'NOT COMPLETED';
    }

    row.appendChild(num);
    row.appendChild(name);
    row.appendChild(status);
    if (unlocked) row.addEventListener('click', () => onSelect(level));
    list.appendChild(row);
  });
}

// Opens the level-select overlay on top of whatever panel is currently
// showing. Picking an unlocked level restarts the scene on it — the same
// restart path the Relaunch/Next Mission buttons use.
export function openLevelSelect(scene){
  renderRows((level) => {
    hud.hidePanel('panel-select');
    hud.hidePanel('panel-end');
    hud.hidePanel('hud');
    hud.showPanel('panel-intro');
    scene.scene.restart({ levelId: level.id, levelData: null });
  });
  hud.hidePanel('panel-intro');
  hud.hidePanel('panel-end');
  hud.showPanel('panel-select');
}
