import { CIRCUIT_COUNT } from '../theme.js';

// Circuit logic for switch-operated doors. Pure data in, pure data out — no
// Phaser, no DOM — so the rules can be read (and tested) on their own:
//
//   - Every circuit is either active or not. All start inactive.
//   - A door is open when its circuit's state differs from how it started:
//     a normally-closed door opens while the circuit is active, and a
//     `startsOpen` door closes while it is.
//   - A plain switch (duration 0) toggles its circuit each time it's pressed.
//   - A timed switch (duration > 0) makes its circuit active for that many
//     seconds, after which it resets by itself. Pressing again restarts the
//     countdown.
//
// `circuits` is a plain object keyed by circuit number:
//   { 1: { active: false, remaining: 0 }, 2: ... }
// `remaining` is the seconds left on a timed activation, or 0 when the
// circuit isn't on a timer.

const IDLE = { active: false, remaining: 0 };

export function createCircuits(){
  const circuits = {};
  for (let n = 1; n <= CIRCUIT_COUNT; n++) circuits[n] = IDLE;
  return circuits;
}

export function pressSwitch(circuits, { circuit, duration }){
  const isTimed = duration > 0;
  const next = isTimed
    ? { active: true, remaining: duration }
    : { active: !circuits[circuit].active, remaining: 0 };
  return { ...circuits, [circuit]: next };
}

function tickCircuit(state, dt){
  const isCountingDown = state.active && state.remaining > 0;
  if (!isCountingDown) return state;
  const remaining = state.remaining - dt;
  return remaining > 0 ? { active: true, remaining } : IDLE;
}

export function tickCircuits(circuits, dt){
  const next = {};
  for (const n of Object.keys(circuits)) next[n] = tickCircuit(circuits[n], dt);
  return next;
}

export function doorShouldBeOpen(door, circuits){
  return door.startsOpen !== circuits[door.circuit].active;
}

// The whole seconds left on a countdown, counting the current partial second
// (4.2s left reads as 5). Used to fire one warning tick per second.
export function secondsLeft(state){
  return Math.ceil(state.remaining);
}
