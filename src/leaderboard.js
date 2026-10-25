const STORAGE_PREFIX = 'moonrescue.leaderboard.';
const MAX_ENTRIES = 10;

function key(levelId){ return STORAGE_PREFIX + levelId; }

export function formatTime(ms){
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return m + ':' + s.toFixed(2).padStart(5, '0');
}

export function getLeaderboard(levelId){
  try {
    const raw = localStorage.getItem(key(levelId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

// A time qualifies if the board has room, or it beats the current worst entry.
export function qualifiesForLeaderboard(levelId, timeMs){
  const board = getLeaderboard(levelId);
  if (board.length < MAX_ENTRIES) return true;
  return timeMs < board[board.length - 1].timeMs;
}

export function addLeaderboardEntry(levelId, initials, timeMs){
  const board = getLeaderboard(levelId);
  board.push({ initials: initials.slice(0, 3).toUpperCase(), timeMs, date: Date.now() });
  board.sort((a, b) => a.timeMs - b.timeMs);
  board.length = Math.min(board.length, MAX_ENTRIES);
  try { localStorage.setItem(key(levelId), JSON.stringify(board)); } catch (e) { /* storage unavailable */ }
  return board;
}
