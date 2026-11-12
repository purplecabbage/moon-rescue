import { computeWallSegments } from './gridEdges.js';
import { normalizeCircuit } from '../theme.js';

// Gameplay always wants a few rows of open sky above the mine entrance — it
// reads as a surface to land on rather than the ship just starting mid-air
// in a wall. The editor shouldn't have to reserve that space itself (it's
// fine, even natural, to paint right up to the top of its canvas), so this
// is enforced here at load time instead of in the level data: whatever the
// author drew, at least MIN_SURFACE_ROWS of guaranteed-open row are
// prepended before the game ever sees the grid. Since these rows are new
// and never touch the author's tiles, the mineshaft can never overlap them.
const MIN_SURFACE_ROWS = 3;

// Key for looking a grid cell up in a Set/Map.
export function cellKey(row, col){ return row + ',' + col; }

function countLeadingOpenRows(tiles){
  let n = 0;
  while (n < tiles.length && !tiles[n].includes('#')) n++;
  return n;
}

// Turns a static level definition (see src/levels/*.json, built with the
// level editor at /editor.html) into the runtime `world` object GameScene
// operates on. No randomness here — the whole point of static levels is
// that the same file always plays the same way.
export function loadLevelWorld(level){
  const cellSize = level.cellSize;
  const cols = level.tiles[0].length;

  const padRows = Math.max(0, MIN_SURFACE_ROWS - countLeadingOpenRows(level.tiles));
  const tiles = padRows > 0
    ? [...new Array(padRows).fill('.'.repeat(cols)), ...level.tiles]
    : level.tiles;
  const yOffset = padRows * cellSize;
  const rows = tiles.length;

  // Door cells are never rock: the door itself is what's solid there, and
  // only while it's closed (GameScene.isSolid), so the static grid — and the
  // wall outline drawn from it — treats them as open.
  const doorCells = (level.doors || [])
    .map((d) => ({ row: d.row + padRows, col: d.col, circuit: normalizeCircuit(d.circuit), startsOpen: !!d.startsOpen }))
    .filter((d) => d.row >= 0 && d.row < rows && d.col >= 0 && d.col < cols);
  const doorKeys = new Set(doorCells.map((d) => cellKey(d.row, d.col)));

  const grid = tiles.map((row, r) => {
    const cells = new Array(cols);
    for (let c = 0; c < cols; c++) cells[c] = row[c] === '#' && !doorKeys.has(cellKey(r, c));
    return cells;
  });

  // A door's panels slide toward whatever it's mounted between: sideways if
  // there's rock or another door to its left or right (the usual case, a
  // door across a vertical shaft), otherwise up and down.
  const isMount = (r, c) => c < 0 || c >= cols || r >= rows || (r >= 0 && (grid[r][c] || doorKeys.has(cellKey(r, c))));
  const doors = doorCells.map((d) => ({
    ...d,
    slideAxis: isMount(d.row, d.col - 1) || isMount(d.row, d.col + 1) ? 'x' : 'y'
  }));

  const wallSegs = computeWallSegments(grid, rows, cols, cellSize);
  const homeRow = level.homeRow + padRows;

  return {
    cols, rows, cellSize,
    worldW: cols * cellSize, worldH: rows * cellSize,
    grid, wallSegs,
    homeRow, homeY: homeRow * cellSize,
    startX: level.start.x, startY: level.start.y + yOffset,
    miners: level.miners.map((m) => ({ x: m.x, y: m.y + yOffset })),
    fuelPickups: (level.fuelPickups || []).map((f) => ({ x: f.x, y: f.y + yOffset, amount: f.amount || 40 })),
    doors,
    switches: (level.switches || []).map((s) => ({
      x: s.x, y: s.y + yOffset, circuit: normalizeCircuit(s.circuit), duration: Math.max(0, Number(s.duration) || 0)
    }))
  };
}
