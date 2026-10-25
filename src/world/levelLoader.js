import { computeWallSegments } from './gridEdges.js';

// Gameplay always wants a few rows of open sky above the mine entrance — it
// reads as a surface to land on rather than the ship just starting mid-air
// in a wall. The editor shouldn't have to reserve that space itself (it's
// fine, even natural, to paint right up to the top of its canvas), so this
// is enforced here at load time instead of in the level data: whatever the
// author drew, at least MIN_SURFACE_ROWS of guaranteed-open row are
// prepended before the game ever sees the grid. Since these rows are new
// and never touch the author's tiles, the mineshaft can never overlap them.
const MIN_SURFACE_ROWS = 3;

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

  const grid = tiles.map((row) => {
    const cells = new Array(cols);
    for (let c = 0; c < cols; c++) cells[c] = row[c] === '#';
    return cells;
  });

  const wallSegs = computeWallSegments(grid, rows, cols, cellSize);
  const homeRow = level.homeRow + padRows;

  return {
    cols, rows, cellSize,
    worldW: cols * cellSize, worldH: rows * cellSize,
    grid, wallSegs,
    homeRow, homeY: homeRow * cellSize,
    startX: level.start.x, startY: level.start.y + yOffset,
    miners: level.miners.map((m) => ({ x: m.x, y: m.y + yOffset })),
    fuelPickups: (level.fuelPickups || []).map((f) => ({ x: f.x, y: f.y + yOffset, amount: f.amount || 40 }))
  };
}
