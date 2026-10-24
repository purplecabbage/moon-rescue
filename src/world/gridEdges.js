// Shared by both the static level loader and the (now-unused-in-game, but
// kept for a possible future "random mission" mode) procedural generator:
// turns a solid/open boolean grid into the line segments that render as the
// glowing wireframe walls, by finding every solid-cell edge that borders an
// open cell.
export function computeWallSegments(grid, rows, cols, cellSize){
  function isOpen(r, c){
    if (r < 0) return true;
    if (r >= rows || c < 0 || c >= cols) return false;
    return !grid[r][c];
  }
  const segs = [];
  for (let r = 0; r < rows; r++){
    for (let c = 0; c < cols; c++){
      if (!grid[r][c]) continue;
      const x = c * cellSize, y = r * cellSize;
      if (isOpen(r - 1, c)) segs.push([x, y, x + cellSize, y]);
      if (r < rows - 1 && isOpen(r + 1, c)) segs.push([x, y + cellSize, x + cellSize, y + cellSize]);
      if (isOpen(r, c - 1)) segs.push([x, y, x, y + cellSize]);
      if (isOpen(r, c + 1)) segs.push([x + cellSize, y, x + cellSize, y + cellSize]);
    }
  }
  return segs;
}
