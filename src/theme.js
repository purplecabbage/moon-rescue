// Shared thermal-camera / neon-wireframe palette (Phaser hex numbers).
export const COLD = 0x2ad2ff;
export const COLD_DIM = 0x0d4a68;
export const HOT = 0xff3131;
export const HOT_AMBER = 0xff9240;
export const HOT_WHITE = 0xfff2df;

// Doors and the switches that operate them are wired together by circuit
// number (1–4); each circuit gets its own color so a switch and its doors
// read as a pair at a glance. Chosen to sit apart from both the cold-blue
// rock and the hot red/amber of miners and thrust. Color is never the only
// cue — doors and switches also show their circuit number as a row of pips.
export const CIRCUIT_COLORS = [0x5dff8f, 0xff5de1, 0xffe14a, 0xa98bff];
export const CIRCUIT_COUNT = CIRCUIT_COLORS.length;

// Level files are hand-editable, so anything that isn't a whole number in
// range falls back to circuit 1 rather than breaking the level.
export function normalizeCircuit(circuit){
  return Number.isInteger(circuit) && circuit >= 1 && circuit <= CIRCUIT_COUNT ? circuit : 1;
}

export function circuitColor(circuit){
  return CIRCUIT_COLORS[normalizeCircuit(circuit) - 1];
}

// Same color as a CSS string, for the level editor's 2D canvas and buttons.
export function circuitCss(circuit){
  return '#' + circuitColor(circuit).toString(16).padStart(6, '0');
}
