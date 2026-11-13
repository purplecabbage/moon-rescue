import Phaser from 'phaser';
import { circuitColor } from '../theme.js';
import { drawCircuitPips } from './door.js';

const RING_RADIUS = 10;
const TIMER_RADIUS = 15;
const TOP = Phaser.Math.DegToRad(-90);

// A switch is pressed by flying through it. `def` comes from the level
// loader: { x, y, circuit, duration } — duration 0 is a plain toggle, anything
// more is a timed switch (see src/world/circuits.js). `armed` goes false when
// pressed and true again once the ship has left, so hovering on a switch
// presses it once rather than every frame.
export function createSwitch(scene, def){
  const gfx = scene.add.graphics();
  gfx.setBlendMode(Phaser.BlendModes.ADD);
  return { ...def, armed: true, phase: Math.random() * Math.PI * 2, gfx };
}

// Reads as a ring (distinct from the fuel diamond and the miners' glowing
// blobs) in its circuit's color: hollow while the circuit is idle, with a
// lit core while it's active. Timed switches carry an outer dial that drains
// as their countdown runs.
export function drawSwitch(sw, circuitState, t){
  const g = sw.gfx;
  const color = circuitColor(sw.circuit);
  const pulse = Math.sin(t * 3 + sw.phase) * 0.2 + 0.8;
  g.clear();

  g.lineStyle(5, color, 0.12 * pulse);
  g.strokeCircle(sw.x, sw.y, RING_RADIUS);
  g.lineStyle(1.5, color, 0.95);
  g.strokeCircle(sw.x, sw.y, RING_RADIUS);

  if (circuitState.active){
    g.fillStyle(color, 0.9 * pulse);
    g.fillCircle(sw.x, sw.y, RING_RADIUS - 4);
  }

  if (sw.duration > 0){
    g.lineStyle(1, color, 0.25);
    g.strokeCircle(sw.x, sw.y, TIMER_RADIUS);
    if (circuitState.remaining > 0){
      const fraction = Math.min(1, circuitState.remaining / sw.duration);
      g.lineStyle(2, color, 0.95);
      g.beginPath();
      g.arc(sw.x, sw.y, TIMER_RADIUS, TOP, TOP + fraction * Math.PI * 2);
      g.strokePath();
    }
  }

  drawCircuitPips(g, sw.circuit, sw.x, sw.y + TIMER_RADIUS + 6, 0.9);
}
