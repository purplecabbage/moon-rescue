// Phaser pins a level to the left edge when the viewport is wider than the
// level, leaving all the spare room as a dead strip on the right. Widening the
// camera bounds to the viewport width — with the extra split evenly either
// side of the level — centers it instead. Levels wider than the viewport are
// unaffected (bounds stay the level's own), and the vertical axis is left
// alone so the surface stays anchored to the top of the screen.
export function centeredCameraBounds(worldW, worldH, viewW){
  const width = Math.max(worldW, viewW);
  return { x: (worldW - width) / 2, y: 0, width, height: worldH };
}
