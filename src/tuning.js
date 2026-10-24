// Declarative registry of every live-tunable gameplay parameter. The Tuning
// Console (src/ui/tunePanel.js) generates its sliders from this list, so
// adding a new tunable here is the only step needed to expose it in-game.
export const TUNABLE_FIELDS = [
  { key: 'gravity', label: 'Gravity', min: 10, max: 200, step: 1, unit: 'px/s²' },
  { key: 'thrustAccel', label: 'Thrust Power', min: 40, max: 400, step: 5, unit: 'px/s²' },
  { key: 'rotSpeed', label: 'Turn Rate', min: 20, max: 300, step: 5, unit: '°/s' },
  { key: 'maxSpeed', label: 'Max Speed', min: 60, max: 500, step: 5, unit: 'px/s' },
  { key: 'wallTolerance', label: 'Wall Tolerance', min: 20, max: 250, step: 5, unit: 'px/s' },
  { key: 'wallDamage', label: 'Wall Damage', min: 0, max: 3, step: 0.05, unit: '/px/s' },
  { key: 'shieldMax', label: 'Shield Capacity', min: 20, max: 300, step: 10, unit: 'hp' },
  { key: 'strandedTimeToExplode', label: 'Stranded Fuse', min: 1, max: 15, step: 0.5, unit: 's' },
  { key: 'minerFallLimit', label: 'Miner Fall Limit', min: 0.5, max: 10, step: 0.5, unit: 's' },
  { key: 'fuelMax', label: 'Fuel Tank Size', min: 40, max: 400, step: 10, unit: 'L' },
  { key: 'fuelBurn', label: 'Fuel Burn Rate', min: 1, max: 40, step: 1, unit: 'L/s' },
  { key: 'fuelRegen', label: 'Refuel Rate', min: 5, max: 100, step: 5, unit: 'L/s' },
  { key: 'capacity', label: 'Rescue Capacity', min: 1, max: 10, step: 1, unit: 'crew' },
  { key: 'lives', label: 'Lives', min: 1, max: 9, step: 1, unit: '' },
  { key: 'startFallSpeed', label: 'Initial Fall Speed', min: 0, max: 150, step: 5, unit: 'px/s' }
];
