// Plain data operations on a level object — the same JSON shape the game
// loads via src/world/levelLoader.js. No rendering or DOM here.
import { cloneDefaultAudio } from '../audio/audioConfig.js';
import { CIRCUIT_COUNT } from '../theme.js';

export function createBlankLevel(){
  const cols = 21, rows = 24, cellSize = 32, homeRow = 2;
  const tiles = [];
  for (let r = 0; r < rows; r++) tiles.push(r >= homeRow ? '#'.repeat(cols) : '.'.repeat(cols));
  return {
    id: 'new-level',
    name: 'NEW LEVEL',
    cellSize,
    homeRow,
    gravity: 55,
    thrustAccel: 165,
    rotSpeed: 85,
    maxSpeed: 240,
    wallTolerance: 90,
    wallDamage: 0.6,
    shieldMax: 100,
    strandedTimeToExplode: 4,
    minerFallLimit: 2.5,
    fuelMax: 140,
    fuelBurn: 9,
    fuelRegen: 36,
    capacity: 4,
    lives: 3,
    startFallSpeed: 40,
    tiles,
    start: { x: (Math.floor(cols / 2) + 0.5) * cellSize, y: cellSize * 1.3 },
    miners: [],
    fuelPickups: [],
    doors: [],
    switches: [],
    audio: cloneDefaultAudio()
  };
}

// Levels saved before the drone editor existed have no "audio" block at
// all — the game already defaults gracefully (see mergeAudioConfig), but
// the editor needs real data to show and edit, so this fills it in the
// first time such a level is opened.
export function ensureAudioConfig(level){
  if (!level.audio) level.audio = cloneDefaultAudio();
  return level.audio;
}

// Same idea for levels saved before doors and switches existed.
export function ensureDoorData(level){
  if (!Array.isArray(level.doors)) level.doors = [];
  if (!Array.isArray(level.switches)) level.switches = [];
}

export function findDoor(level, row, col){
  return level.doors.find((d) => d.row === row && d.col === col) || null;
}

export function removeDoor(level, row, col){
  level.doors = level.doors.filter((d) => !(d.row === row && d.col === col));
}

// Puts a door in a cell, replacing any door already there. The tile under a
// door is always open space: the door is the only thing that blocks the cell,
// and only while it's closed.
export function placeDoor(level, row, col, { circuit, startsOpen }){
  if (row < 0 || row >= level.tiles.length) return;
  if (col < 0 || col >= level.tiles[row].length) return;
  removeDoor(level, row, col);
  setCell(level, row, col, false);
  level.doors.push({ row, col, circuit, startsOpen });
}

// Wiring mistakes that would leave a door or switch doing nothing in play,
// as short messages for the editor to show. An empty list means every
// circuit in use has both ends.
export function describeCircuitIssues(level){
  const issues = [];
  for (let n = 1; n <= CIRCUIT_COUNT; n++){
    const doorCount = level.doors.filter((d) => d.circuit === n).length;
    const switchCount = level.switches.filter((s) => s.circuit === n).length;
    if (doorCount > 0 && switchCount === 0) issues.push('Circuit ' + n + ' has doors but no switch');
    if (switchCount > 0 && doorCount === 0) issues.push('Circuit ' + n + ' has a switch but no doors');
  }
  return issues;
}

export function cloneLevel(level){
  return JSON.parse(JSON.stringify(level));
}

export function setCell(level, row, col, solid){
  if (row < 0 || row >= level.tiles.length) return;
  const line = level.tiles[row];
  if (col < 0 || col >= line.length) return;
  const ch = solid ? '#' : '.';
  if (line[col] === ch) return;
  level.tiles[row] = line.slice(0, col) + ch + line.slice(col + 1);
}

export function isSolid(level, row, col){
  if (row < 0 || row >= level.tiles.length) return false;
  const line = level.tiles[row];
  if (col < 0 || col >= line.length) return false;
  return line[col] === '#';
}

export function resizeGrid(level, newCols, newRows){
  const oldRows = level.tiles.length;
  const tiles = [];
  for (let r = 0; r < newRows; r++){
    let rowStr = '';
    for (let c = 0; c < newCols; c++){
      if (r < oldRows && c < level.tiles[r].length){
        rowStr += level.tiles[r][c];
      } else {
        rowStr += r >= level.homeRow ? '#' : '.';
      }
    }
    tiles.push(rowStr);
  }
  level.tiles = tiles;
  if (level.doors) level.doors = level.doors.filter((d) => d.row < newRows && d.col < newCols);
}

// Find the nearest entity of a list (miners/fuelPickups) within radius px,
// used so a single tool click can both place and remove.
export function findNearestEntity(list, x, y, radius){
  let best = null, bestDist = radius * radius;
  for (const entity of list){
    const d = (entity.x - x) ** 2 + (entity.y - y) ** 2;
    if (d <= bestDist){ best = entity; bestDist = d; }
  }
  return best;
}

export function levelToJSON(level){
  return JSON.stringify(level, null, 2) + '\n';
}
