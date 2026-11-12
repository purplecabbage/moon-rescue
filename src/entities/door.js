import Phaser from 'phaser';
import { circuitColor } from '../theme.js';

// How long the slide animation takes. Collision doesn't wait for it: a door
// becomes solid (or passable) the instant it starts moving, and the panels
// catch up visually.
const DOOR_TRAVEL_SECONDS = 0.25;
const PIP_SPACING = 6;

// A door fills one grid cell. `def` comes from the level loader:
// { row, col, circuit, startsOpen, slideAxis }. It starts in whatever state
// an all-inactive set of circuits puts it in, already fully slid there.
export function createDoor(scene, def){
  const gfx = scene.add.graphics();
  gfx.setBlendMode(Phaser.BlendModes.ADD);
  return { ...def, closed: !def.startsOpen, openness: def.startsOpen ? 1 : 0, gfx };
}

// Moves the door toward where its circuit wants it. A door never closes on
// something: while `isBlocked` it simply waits, open, until the cell clears.
// Returns 'opened' or 'closed' on the frame the door's solidity flips,
// otherwise null.
export function updateDoor(door, shouldBeOpen, isBlocked, dt){
  let change = null;
  if (shouldBeOpen && door.closed){
    door.closed = false;
    change = 'opened';
  } else if (!shouldBeOpen && !door.closed && !isBlocked){
    door.closed = true;
    change = 'closed';
  }
  const target = door.closed ? 0 : 1;
  const step = dt / DOOR_TRAVEL_SECONDS;
  door.openness = target > door.openness
    ? Math.min(target, door.openness + step)
    : Math.max(target, door.openness - step);
  return change;
}

// A closed door is two bright panels meeting in the middle of the cell; they
// slide apart along `slideAxis` as it opens. An open door leaves only a faint
// frame, so a doorway that could close again is still visible. `warningFlash`
// is null normally, or a 0–1 value the scene oscillates while the door is
// about to change on a timer: it blinks the panels of a closed door and
// lights up the frame of an open one, so either kind visibly warns.
export function drawDoor(door, cellSize, warningFlash = null){
  const isWarning = warningFlash !== null;
  const frameAlpha = isWarning ? 0.3 + 0.6 * warningFlash : 0.3;
  const panelBrightness = isWarning ? 0.4 + 0.6 * warningFlash : 1;
  const g = door.gfx;
  const color = circuitColor(door.circuit);
  const x = door.col * cellSize, y = door.row * cellSize;
  g.clear();

  g.lineStyle(1, color, frameAlpha);
  g.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);

  const panelDepth = (cellSize / 2) * (1 - door.openness);
  if (panelDepth > 0.5){
    const panels = door.slideAxis === 'x'
      ? [[x, y, panelDepth, cellSize], [x + cellSize - panelDepth, y, panelDepth, cellSize]]
      : [[x, y, cellSize, panelDepth], [x, y + cellSize - panelDepth, cellSize, panelDepth]];
    g.fillStyle(color, 0.3 * panelBrightness);
    g.lineStyle(1.5, color, 0.95 * panelBrightness);
    panels.forEach(([px, py, w, h]) => { g.fillRect(px, py, w, h); g.strokeRect(px, py, w, h); });
  }

  drawCircuitPips(g, door.circuit, x + cellSize / 2, y + cellSize / 2, 0.9);
}

// The circuit number as a centered row of dots — shared by doors and
// switches, so the pairing doesn't rest on color alone.
export function drawCircuitPips(g, circuit, centerX, centerY, alpha){
  const firstX = centerX - ((circuit - 1) * PIP_SPACING) / 2;
  g.fillStyle(circuitColor(circuit), alpha);
  for (let i = 0; i < circuit; i++) g.fillCircle(firstX + i * PIP_SPACING, centerY, 2);
}
