import { isSolid } from './levelState.js';
import { circuitCss } from '../theme.js';

const COLORS = {
  bg: '#05060a',
  openSky: '#070a10',
  solid: '#123247',
  solidLine: '#1d5a7d',
  home: 'rgba(42,210,255,0.18)',
  grid: 'rgba(42,210,255,0.06)',
  start: '#fff2df',
  miner: '#ff3131',
  fuel: '#2ad2ff',
  hover: 'rgba(255,255,255,0.12)'
};

export function canvasSize(level){
  return { width: level.tiles[0].length * level.cellSize, height: level.tiles.length * level.cellSize };
}

export function render(ctx, level, hover){
  const cell = level.cellSize;
  const rows = level.tiles.length, cols = level.tiles[0].length;
  const { width, height } = canvasSize(level);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  for (let r = 0; r < rows; r++){
    for (let c = 0; c < cols; c++){
      const solid = isSolid(level, r, c);
      ctx.fillStyle = solid ? COLORS.solid : COLORS.openSky;
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  // home row band
  ctx.fillStyle = COLORS.home;
  ctx.fillRect(0, level.homeRow * cell, width, cell);

  // grid lines
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++){ ctx.moveTo(c * cell, 0); ctx.lineTo(c * cell, height); }
  for (let r = 0; r <= rows; r++){ ctx.moveTo(0, r * cell); ctx.lineTo(width, r * cell); }
  ctx.stroke();

  // solid-cell boundary lines (so walls read clearly against open space)
  ctx.strokeStyle = COLORS.solidLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let r = 0; r < rows; r++){
    for (let c = 0; c < cols; c++){
      if (!isSolid(level, r, c)) continue;
      const x = c * cell, y = r * cell;
      if (!isSolid(level, r - 1, c)){ ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
      if (!isSolid(level, r + 1, c)){ ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); }
      if (!isSolid(level, r, c - 1)){ ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
      if (!isSolid(level, r, c + 1)){ ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); }
    }
  }
  ctx.stroke();

  // doors: a closed door is a filled, hatched cell in its circuit color; one
  // that starts open is just the dashed outline of where it will close.
  for (const d of level.doors || []) drawDoorCell(ctx, d, cell);

  // start marker
  drawDiamond(ctx, level.start.x, level.start.y, 10, COLORS.start);

  // miners
  for (const m of level.miners) drawCircle(ctx, m.x, m.y, 7, COLORS.miner);

  // fuel pickups
  for (const f of level.fuelPickups) drawDiamond(ctx, f.x, f.y, 7, COLORS.fuel);

  // switches: a ring in the circuit color, with a second ring if timed
  for (const s of level.switches || []) drawSwitchMarker(ctx, s);

  if (hover){
    ctx.fillStyle = COLORS.hover;
    ctx.fillRect(hover.col * cell, hover.row * cell, cell, cell);
  }
}

function drawDoorCell(ctx, door, cell){
  const color = circuitCss(door.circuit);
  const x = door.col * cell, y = door.row * cell;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (door.startsOpen){
    ctx.setLineDash([4, 3]);
  } else {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y, cell, cell);
    ctx.globalAlpha = 1;
  }
  ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
  ctx.restore();
  drawCircuitNumber(ctx, door.circuit, x + cell / 2, y + cell / 2);
}

function drawSwitchMarker(ctx, sw){
  const color = circuitCss(sw.circuit);
  ctx.save();
  ctx.fillStyle = COLORS.bg;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sw.x, sw.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (sw.duration > 0){
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  drawCircuitNumber(ctx, sw.circuit, sw.x, sw.y);
}

function drawCircuitNumber(ctx, circuit, x, y){
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(circuit), x, y + 0.5);
  ctx.restore();
}

function drawCircle(ctx, x, y, r, color){
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawDiamond(ctx, x, y, r, color){
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function eventToCell(canvas, level, evt){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const px = (evt.clientX - rect.left) * scaleX;
  const py = (evt.clientY - rect.top) * scaleY;
  return {
    x: px, y: py,
    col: Math.floor(px / level.cellSize),
    row: Math.floor(py / level.cellSize)
  };
}
