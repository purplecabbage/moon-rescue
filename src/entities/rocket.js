import Phaser from 'phaser';
import { COLD, HOT_AMBER } from '../theme.js';

// Hull geometry: a nose-cone triangle sitting over a 3-port thruster
// cluster — two side (RCS) wings plus a center diamond (main engine). The
// hull dominates the silhouette; the thruster cluster is a small detail
// tucked at its base, not a second shape competing with it.
const NOSE = [0, -18];
const HULL_L = [-13, 12];
const HULL_R = [13, 12];
const DIA_TOP = [0, 5]; // base notch — pulled up/inward, not a flat bottom edge
const DIA_L = [-6, 17];
const DIA_R = [6, 17];
const DIA_BOTTOM = [0, 22];

// Local-space port positions, exported so GameScene can place the RCS burn
// trail particles at the actual thruster locations.
export const LEFT_PORT = DIA_L;
export const RIGHT_PORT = DIA_R;

function strokeLayers(g, color, layers, segments){
  layers.forEach((layer) => {
    g.lineStyle(layer.w, color, layer.a);
    g.beginPath();
    segments.forEach(([a, b]) => { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); });
    g.strokePath();
  });
}

// Always-visible wireframe: nose cone plus a base that notches inward to a
// point (an arrowhead cut, not a flat bottom edge) — DIA_TOP is that notch
// point, and also where the thruster ports (below) mount. The ports
// themselves have no permanent outline at all — they only exist, outline
// and fill both, while actually firing, so nothing sticks out of the
// bottom when idle.
export function drawHull(g){
  g.clear();
  g.setBlendMode(Phaser.BlendModes.ADD);
  const layers = [{ w: 6, a: 0.10 }, { w: 3, a: 0.22 }, { w: 1.2, a: 1 }];
  strokeLayers(g, COLD, layers, [[NOSE, HULL_L], [NOSE, HULL_R], [HULL_L, DIA_TOP], [DIA_TOP, HULL_R]]);
}

function fillTriangle(g, p1, p2, p3){
  g.clear();
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.fillStyle(HOT_AMBER, 0.85);
  g.beginPath();
  g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.2, HOT_AMBER, 1);
  g.strokePath();
}

export function drawLeftThruster(g){ fillTriangle(g, HULL_L, DIA_TOP, DIA_L); }
export function drawRightThruster(g){ fillTriangle(g, HULL_R, DIA_TOP, DIA_R); }

// The center (main engine) port is the whole diamond — both halves fill
// together as one unit when thrusting, even though the wireframe shows the
// dividing line down the middle.
export function drawCenterThruster(g){
  g.clear();
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.fillStyle(HOT_AMBER, 0.85);
  g.beginPath();
  g.moveTo(DIA_TOP[0], DIA_TOP[1]);
  g.lineTo(DIA_R[0], DIA_R[1]);
  g.lineTo(DIA_BOTTOM[0], DIA_BOTTOM[1]);
  g.lineTo(DIA_L[0], DIA_L[1]);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.2, HOT_AMBER, 1);
  g.strokePath();
}

// Builds the physics-driven rocket: an invisible circular body (rotation-
// invariant, so it never fights the Arcade body's own transform) plus the
// hull wireframe and three thruster-port fills, all kept in sync with it
// each frame.
export function createRocket(scene, x, y){
  const zone = scene.add.zone(x, y, 28, 28);
  scene.physics.add.existing(zone);
  zone.body.setCircle(14, 0, 0);
  zone.body.setCollideWorldBounds(true);
  zone.body.setAllowGravity(true);

  const gfx = scene.add.graphics();
  drawHull(gfx);

  const leftThrustGfx = scene.add.graphics();
  drawLeftThruster(leftThrustGfx);
  leftThrustGfx.setVisible(false);

  const rightThrustGfx = scene.add.graphics();
  drawRightThruster(rightThrustGfx);
  rightThrustGfx.setVisible(false);

  const centerThrustGfx = scene.add.graphics();
  drawCenterThruster(centerThrustGfx);
  centerThrustGfx.setVisible(false);

  return { zone, gfx, leftThrustGfx, rightThrustGfx, centerThrustGfx, angle: 0 };
}
