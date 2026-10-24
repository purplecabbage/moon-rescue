import Phaser from 'phaser';
import { COLD } from '../theme.js';

// A fuel canister reads as a small cold-blue diamond (distinct from the hot
// red/amber of survivors and the thrust flame) with a bright pulsing core.
export function createFuelPickup(scene, x, y, amount){
  const ring = scene.add.graphics();
  ring.setBlendMode(Phaser.BlendModes.ADD);
  ring.lineStyle(1.5, COLD, 0.9);
  ring.beginPath();
  ring.moveTo(0, -9); ring.lineTo(9, 0); ring.lineTo(0, 9); ring.lineTo(-9, 0);
  ring.closePath();
  ring.strokePath();
  ring.setPosition(x, y);

  const core = scene.add.circle(x, y, 3, COLD, 0.95).setBlendMode(Phaser.BlendModes.ADD);

  return { x, y, amount, ring, core, phase: Math.random() * Math.PI * 2, picked: false };
}

export function updateFuelPickupPulse(pickup, t){
  const pulse = Math.sin(t * 3 + pickup.phase) * 0.3 + 0.7;
  pickup.ring.setAlpha(0.6 * pulse + 0.3);
  pickup.core.setAlpha(0.7 * pulse + 0.3);
}

export function destroyFuelPickup(pickup){
  pickup.ring.destroy();
  pickup.core.destroy();
}
