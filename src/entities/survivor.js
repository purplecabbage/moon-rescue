import Phaser from 'phaser';
import { HOT, HOT_AMBER, HOT_WHITE } from '../theme.js';

// Grace period after touching down before a survivor can be picked up again —
// otherwise a ship sitting right where someone just landed (e.g. it's the
// one that landed, triggering the eject in the first place) scoops them
// straight back up the instant they hit the ground.
const LANDING_PICKUP_COOLDOWN = 0.6;

// A trapped survivor reads as a thermal heat-signature blob: a bright core with
// two soft additive haloes, gently pulsing so the world feels alive at rest.
export function createSurvivor(scene, x, y){
  const inner = scene.add.circle(x, y, 5, HOT_WHITE, 0.9).setBlendMode(Phaser.BlendModes.ADD);
  const outer = scene.add.circle(x, y, 10, HOT, 0.45).setBlendMode(Phaser.BlendModes.ADD);
  const amber = scene.add.circle(x, y, 15, HOT_AMBER, 0.18).setBlendMode(Phaser.BlendModes.ADD);
  return {
    x, y, inner, outer, amber, phase: Math.random() * Math.PI * 2, picked: false,
    falling: false, vx: 0, vy: 0, fallTime: 0, pickupCooldown: 0
  };
}

// Pops a survivor out of the ship with a little outward hop, then lets
// gravity carry it down to whatever floor is below — see updateSurvivorFall.
export function ejectSurvivor(survivor, angle){
  survivor.falling = true;
  survivor.fallTime = 0;
  survivor.vx = Math.cos(angle) * Phaser.Math.FloatBetween(40, 90);
  survivor.vy = Math.sin(angle) * Phaser.Math.FloatBetween(-60, -10);
}

export function setVisualPosition(survivor){
  survivor.inner.setPosition(survivor.x, survivor.y);
  survivor.outer.setPosition(survivor.x, survivor.y);
  survivor.amber.setPosition(survivor.x, survivor.y);
}

// Returns 'falling', 'landed', or 'died' (fell for longer than the level's
// fall limit — presumed lost into a chasm with no floor underneath).
export function updateSurvivorFall(survivor, dt, gravity, isSolid, cellSize, fallTimeLimit){
  if (!survivor.falling) return 'resting';
  survivor.vy += gravity * dt;
  survivor.x += survivor.vx * dt;
  survivor.y += survivor.vy * dt;
  survivor.fallTime += dt;
  setVisualPosition(survivor);

  const row = Math.floor(survivor.y / cellSize), col = Math.floor(survivor.x / cellSize);
  if (isSolid(row, col)){
    survivor.y = row * cellSize - 6;
    survivor.falling = false;
    survivor.vx = 0; survivor.vy = 0;
    survivor.pickupCooldown = LANDING_PICKUP_COOLDOWN;
    setVisualPosition(survivor);
    return 'landed';
  }
  if (survivor.fallTime > fallTimeLimit) return 'died';
  return 'falling';
}

export function tickPickupCooldown(survivor, dt){
  if (survivor.pickupCooldown > 0) survivor.pickupCooldown = Math.max(0, survivor.pickupCooldown - dt);
}

export function updateSurvivorPulse(survivor, t){
  const pulse = Math.sin(t * 2.4 + survivor.phase) * 0.22 + 0.68;
  survivor.inner.setAlpha(0.75 * pulse);
  survivor.outer.setAlpha(0.42 * pulse);
  survivor.amber.setAlpha(0.16 * pulse);
}

export function destroySurvivor(survivor){
  survivor.inner.destroy();
  survivor.outer.destroy();
  survivor.amber.destroy();
}
