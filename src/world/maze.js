// Procedural mine-shaft maze generation.
//
// Not used by the game anymore — levels are hand-authored static JSON now
// (see src/levels/ and src/world/levelLoader.js). Kept around as the basis
// for a possible future "random mission" mode (see ROADMAP.md).
//
// A perfect maze is grown with a recursive-backtracker over a coarse grid of
// "rooms" (mazeCols x mazeRows), then rasterized onto the fine collision/render
// grid as uniform-width corridors with solid walls between them — this is what
// gives the underground its maze-like structure, as opposed to an organic cave.
import { computeWallSegments } from './gridEdges.js';

function buildMazeGraph(mazeRows, mazeCols, startRow, startCol){
  const cells = [];
  for (let r = 0; r < mazeRows; r++){
    const row = [];
    for (let c = 0; c < mazeCols; c++) row.push({ r, c, links: new Set(), visited: false });
    cells.push(row);
  }
  function neighborsOf(cell){
    const list = [];
    if (cell.r > 0) list.push(cells[cell.r - 1][cell.c]);
    if (cell.r < mazeRows - 1) list.push(cells[cell.r + 1][cell.c]);
    if (cell.c > 0) list.push(cells[cell.r][cell.c - 1]);
    if (cell.c < mazeCols - 1) list.push(cells[cell.r][cell.c + 1]);
    return list;
  }
  const start = cells[startRow][startCol];
  start.visited = true;
  const stack = [start];
  while (stack.length){
    const cur = stack[stack.length - 1];
    const unvisited = neighborsOf(cur).filter((n) => !n.visited);
    if (unvisited.length === 0){ stack.pop(); continue; }
    const next = unvisited[Math.floor(Math.random() * unvisited.length)];
    cur.links.add(next);
    next.links.add(cur);
    next.visited = true;
    stack.push(next);
  }
  return cells;
}

function bfsDistances(cells, startRow, startCol){
  const start = cells[startRow][startCol];
  start.dist = 0;
  const queue = [start];
  while (queue.length){
    const cur = queue.shift();
    cur.links.forEach((n) => {
      if (n.dist === undefined){
        n.dist = cur.dist + 1;
        queue.push(n);
      }
    });
  }
}

export function generateLevelWorld(level){
  const CELL = level.cellSize;
  const passage = level.passageWidth;
  const wall = level.wallThickness;
  const block = passage + wall;
  const mazeRows = level.mazeRows;
  const mazeCols = level.mazeCols;

  const underCols = mazeCols * block + wall;
  const underRows = mazeRows * block + wall;
  const surfaceRow = level.surfaceRow;
  const cols = underCols;
  // +wall reserves one solid roof row under the sky, across the whole width,
  // so there's an actual continuous surface to land on — without it, every
  // top-row maze room would open straight into the sky along its full span.
  const rows = surfaceRow + wall + underRows;

  const grid = [];
  for (let r = 0; r < rows; r++){
    const row = new Array(cols).fill(r >= surfaceRow);
    grid.push(row);
  }

  const entryCol = Math.floor(mazeCols / 2);
  const entryRow = 0;
  const cells = buildMazeGraph(mazeRows, mazeCols, entryRow, entryCol);
  bfsDistances(cells, entryRow, entryCol);

  function roomRowStart(mr){ return surfaceRow + wall + mr * block; }
  function roomColStart(mc){ return mc * block; }

  function carveRect(r0, c0, w, h){
    for (let r = r0; r < r0 + h; r++){
      for (let c = c0; c < c0 + w; c++){
        if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = false;
      }
    }
  }

  for (let mr = 0; mr < mazeRows; mr++){
    for (let mc = 0; mc < mazeCols; mc++){
      const cell = cells[mr][mc];
      const r0 = roomRowStart(mr), c0 = roomColStart(mc);
      carveRect(r0, c0, passage, passage);
      cell.links.forEach((n) => {
        if (n.c === mc + 1 && n.r === mr) carveRect(r0, c0 + passage, wall, passage);
        if (n.r === mr + 1 && n.c === mc) carveRect(r0 + passage, c0, passage, wall);
      });
    }
  }

  // punch the mine shaft through the roof row, right above the entry room,
  // so there's a way down from the surface into the maze
  const shaftColStart = roomColStart(entryCol);
  const shaftColEnd = shaftColStart + passage;
  carveRect(surfaceRow, shaftColStart, passage, wall);

  // surface base, offset just beside the shaft so the lander has solid
  // ground to rest on right next to it
  const padWidth = level.padWidth;
  let padColEnd = shaftColStart - 1;
  let padColStart = padColEnd - padWidth;
  if (padColStart < 1){ padColStart = shaftColEnd + 1; padColEnd = padColStart + padWidth; }
  const padY = surfaceRow * CELL;
  const padCenterX = ((padColStart + padColEnd) / 2) * CELL;

  // collect every room as a candidate for a trapped miner, biased toward the
  // deeper half of the mine (by graph distance from the shaft)
  const rooms = [];
  for (let mr = 0; mr < mazeRows; mr++){
    for (let mc = 0; mc < mazeCols; mc++){
      if (mr === entryRow && mc === entryCol) continue;
      const cell = cells[mr][mc];
      rooms.push({
        dist: cell.dist,
        x: (roomColStart(mc) + passage / 2) * CELL,
        y: (roomRowStart(mr) + passage / 2) * CELL
      });
    }
  }
  rooms.sort((a, b) => b.dist - a.dist);
  const deepHalf = rooms.slice(0, Math.max(level.minersTotal, Math.ceil(rooms.length / 2)));
  for (let i = deepHalf.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [deepHalf[i], deepHalf[j]] = [deepHalf[j], deepHalf[i]];
  }
  const miners = deepHalf.slice(0, level.minersTotal).map((r) => ({ x: r.x, y: r.y }));

  const wallSegs = computeWallSegments(grid, rows, cols, CELL);

  return {
    cols, rows, cellSize: CELL,
    worldW: cols * CELL, worldH: rows * CELL,
    grid, wallSegs,
    padColStart, padColEnd, padY, padCenterX,
    startX: padCenterX, startY: CELL * 1.3,
    miners
  };
}
