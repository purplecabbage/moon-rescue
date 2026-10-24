import { computeWallSegments } from './gridEdges.js';

// Turns a static level definition (see src/levels/*.json, built with the
// level editor at /editor.html) into the runtime `world` object GameScene
// operates on. No randomness here — the whole point of static levels is
// that the same file always plays the same way.
export function loadLevelWorld(level){
  const cellSize = level.cellSize;
  const tiles = level.tiles;
  const rows = tiles.length;
  const cols = tiles[0].length;

  const grid = tiles.map((row) => {
    const cells = new Array(cols);
    for (let c = 0; c < cols; c++) cells[c] = row[c] === '#';
    return cells;
  });

  const wallSegs = computeWallSegments(grid, rows, cols, cellSize);

  return {
    cols, rows, cellSize,
    worldW: cols * cellSize, worldH: rows * cellSize,
    grid, wallSegs,
    homeRow: level.homeRow, homeY: level.homeRow * cellSize,
    startX: level.start.x, startY: level.start.y,
    miners: level.miners.map((m) => ({ x: m.x, y: m.y })),
    fuelPickups: (level.fuelPickups || []).map((f) => ({ x: f.x, y: f.y, amount: f.amount || 40 }))
  };
}
