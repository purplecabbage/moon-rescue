import { LEVELS } from './levels.js';

const KEY = 'moonrescue.completed';

function readCompleted(){
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

export function isLevelComplete(levelId){
  return readCompleted().includes(levelId);
}

export function markLevelComplete(levelId){
  const completed = readCompleted();
  if (!completed.includes(levelId)){
    completed.push(levelId);
    try { localStorage.setItem(KEY, JSON.stringify(completed)); } catch (e) { /* storage unavailable */ }
  }
}

// The first level is always unlocked; every other level unlocks once the one
// immediately before it (in LEVELS order, i.e. mission order) is completed —
// completed levels stay unlocked and replayable forever after.
export function isLevelUnlocked(levelId){
  const idx = LEVELS.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true;
  return isLevelComplete(LEVELS[idx - 1].id);
}

// The level a fresh or returning player should land on: the first one
// that's unlocked but not yet completed, or the final level if everything
// has been cleared.
export function firstIncompleteLevel(){
  for (const level of LEVELS){
    if (!isLevelComplete(level.id)) return level;
  }
  return LEVELS[LEVELS.length - 1];
}
