import { TUNABLE_FIELDS } from '../tuning.js';
import { AUDIO_FIELDS, WAVEFORM_TYPES, DRONE_VOICE_FIELDS, MIN_DRONE_VOICES, MAX_DRONE_VOICES } from '../audio/audioConfig.js';
import { sfx } from '../audio/soundfx.js';
import { createBlankLevel, ensureAudioConfig, setCell, resizeGrid, findNearestEntity, levelToJSON } from './levelState.js';
import { render, canvasSize, eventToCell } from './grid.js';

const PLAYTEST_KEY = 'moonrescue_playtest_level';
const MIN_ENTITY_SEPARATION = 30; // matches MIN_MINER_SEPARATION in GameScene.js

let level = createBlankLevel();
let fileHandle = null;
let tool = 'wall';
let painting = false;
let hover = null;
let dirty = false;
let previewEnabled = false;

const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status-line');

function setStatus(text){ statusLine.textContent = text; }
function markDirty(){ dirty = true; setStatus((level.id || 'untitled') + ' — unsaved changes'); }

function redraw(){
  const size = canvasSize(level);
  canvas.width = size.width;
  canvas.height = size.height;
  render(ctx, level, hover);
}

function refreshFormFromLevel(){
  document.getElementById('meta-id').value = level.id;
  document.getElementById('meta-name').value = level.name;
  document.getElementById('grid-cols').value = level.tiles[0].length;
  document.getElementById('grid-rows').value = level.tiles.length;
  document.getElementById('grid-cellsize').value = level.cellSize;
  buildTuneFields();
  ensureAudioConfig(level);
  buildDroneVoices();
  buildAudioFields();
  if (previewEnabled) sfx.applyAudioConfig(level.audio);
  redraw();
}

function buildTuneFields(){
  const container = document.getElementById('tune-fields-editor');
  container.innerHTML = '';
  TUNABLE_FIELDS.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'tune-row';

    const label = document.createElement('span');
    label.className = 'tune-label';
    label.textContent = f.label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = f.min; slider.max = f.max; slider.step = f.step;
    slider.value = level[f.key];

    const num = document.createElement('input');
    num.type = 'number';
    num.min = f.min; num.max = f.max; num.step = f.step;
    num.value = level[f.key];

    const unit = document.createElement('span');
    unit.className = 'tune-unit';
    unit.textContent = f.unit || '';

    const apply = (raw) => {
      let val = parseFloat(raw);
      if (Number.isNaN(val)) return;
      val = Math.min(f.max, Math.max(f.min, val));
      level[f.key] = val;
      slider.value = val;
      num.value = val;
      markDirty();
    };
    slider.addEventListener('input', () => apply(slider.value));
    num.addEventListener('input', () => apply(num.value));

    row.appendChild(label); row.appendChild(slider); row.appendChild(num); row.appendChild(unit);
    container.appendChild(row);
  });
}

// --- drone / audio panel ---
function buildDroneVoices(){
  const container = document.getElementById('drone-voices');
  container.innerHTML = '';
  const voices = level.audio.droneVoices;

  voices.forEach((v, i) => {
    const row = document.createElement('div');
    row.className = 'voice-row';

    const num = document.createElement('span');
    num.className = 'voice-num';
    num.textContent = i + 1;

    const freq = document.createElement('input');
    freq.type = 'number';
    freq.min = DRONE_VOICE_FIELDS.freq.min; freq.max = DRONE_VOICE_FIELDS.freq.max; freq.step = DRONE_VOICE_FIELDS.freq.step;
    freq.value = v.freq;
    freq.title = 'Frequency (Hz)';

    const type = document.createElement('select');
    type.title = 'Waveform';
    WAVEFORM_TYPES.forEach((wt) => {
      const opt = document.createElement('option');
      opt.value = wt; opt.textContent = wt;
      if (wt === v.type) opt.selected = true;
      type.appendChild(opt);
    });

    const gain = document.createElement('input');
    gain.type = 'range';
    gain.min = DRONE_VOICE_FIELDS.gain.min; gain.max = DRONE_VOICE_FIELDS.gain.max; gain.step = DRONE_VOICE_FIELDS.gain.step;
    gain.value = v.gain;
    gain.title = 'Volume';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'voice-remove';
    remove.textContent = '✕';
    remove.title = 'Remove voice';
    remove.disabled = voices.length <= MIN_DRONE_VOICES;

    freq.addEventListener('input', () => {
      const val = parseFloat(freq.value);
      if (Number.isNaN(val)) return;
      v.freq = val;
      if (previewEnabled) sfx.setDroneVoiceParam(i, 'freq', val);
      markDirty();
    });
    type.addEventListener('change', () => {
      v.type = type.value;
      if (previewEnabled) sfx.setDroneVoiceParam(i, 'type', v.type);
      markDirty();
    });
    gain.addEventListener('input', () => {
      const val = parseFloat(gain.value);
      v.gain = val;
      if (previewEnabled) sfx.setDroneVoiceParam(i, 'gain', val);
      markDirty();
    });
    remove.addEventListener('click', () => {
      voices.splice(i, 1);
      if (previewEnabled) sfx.applyAudioConfig(level.audio);
      markDirty();
      buildDroneVoices();
    });

    row.appendChild(num); row.appendChild(freq); row.appendChild(type); row.appendChild(gain); row.appendChild(remove);
    container.appendChild(row);
  });

  document.getElementById('btn-add-voice').disabled = voices.length >= MAX_DRONE_VOICES;
}

function applyAudioFieldLive(key, val){
  if (key === 'delayTime') sfx.setDelay({ time: val });
  else if (key === 'delayFeedback') sfx.setDelay({ feedback: val });
  else if (key === 'reverbWet') sfx.setReverbWet(val);
  // tempo/hihatBeats/bassBeats are read fresh off sfx.audio each time the
  // percussive loops schedule their next hit, so just keep that in sync —
  // no dedicated setter needed.
  else if (sfx.ctx) sfx.audio[key] = val;
}

function buildAudioFields(){
  const container = document.getElementById('audio-fields-editor');
  container.innerHTML = '';
  AUDIO_FIELDS.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'tune-row';

    const label = document.createElement('span');
    label.className = 'tune-label';
    label.textContent = f.label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = f.min; slider.max = f.max; slider.step = f.step;
    slider.value = level.audio[f.key];

    const num = document.createElement('input');
    num.type = 'number';
    num.min = f.min; num.max = f.max; num.step = f.step;
    num.value = level.audio[f.key];

    const unit = document.createElement('span');
    unit.className = 'tune-unit';
    unit.textContent = f.unit || '';

    const apply = (raw) => {
      let val = parseFloat(raw);
      if (Number.isNaN(val)) return;
      val = Math.min(f.max, Math.max(f.min, val));
      level.audio[f.key] = val;
      slider.value = val;
      num.value = val;
      if (previewEnabled) applyAudioFieldLive(f.key, val);
      markDirty();
    };
    slider.addEventListener('input', () => apply(slider.value));
    num.addEventListener('input', () => apply(num.value));

    row.appendChild(label); row.appendChild(slider); row.appendChild(num); row.appendChild(unit);
    container.appendChild(row);
  });
}

document.getElementById('btn-add-voice').addEventListener('click', () => {
  if (level.audio.droneVoices.length >= MAX_DRONE_VOICES) return;
  level.audio.droneVoices.push({ freq: 110, type: 'sine', gain: 0.05 });
  if (previewEnabled) sfx.applyAudioConfig(level.audio);
  markDirty();
  buildDroneVoices();
});

document.getElementById('btn-audio-toggle').addEventListener('click', () => {
  const btn = document.getElementById('btn-audio-toggle');
  previewEnabled = !previewEnabled;
  if (previewEnabled){
    sfx.init(level.audio);       // first click: builds the whole graph; later clicks just resume it
    sfx.applyAudioConfig(level.audio); // make sure it reflects whatever's in the form right now
    if (sfx.ctx) sfx.master.gain.setValueAtTime(0.5, sfx.ctx.currentTime);
    btn.textContent = '🔇 Disable Audio Preview';
    btn.classList.add('active');
  } else {
    if (sfx.ctx) sfx.master.gain.setValueAtTime(0, sfx.ctx.currentTime);
    btn.textContent = '🔊 Enable Audio Preview';
    btn.classList.remove('active');
  }
});

document.getElementById('btn-test-hihat').addEventListener('click', () => {
  if (!previewEnabled){ setStatus('Enable audio preview first'); return; }
  sfx.previewHihat();
});
document.getElementById('btn-test-bass').addEventListener('click', () => {
  if (!previewEnabled){ setStatus('Enable audio preview first'); return; }
  sfx.previewBass();
});

// --- toolbar ---
document.querySelectorAll('.tool-group button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-group button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    tool = btn.dataset.tool;
  });
});

// --- canvas painting ---
function applyToolAt(pt){
  const { row, col, x, y } = pt;
  if (tool === 'wall'){ setCell(level, row, col, true); markDirty(); return; }
  if (tool === 'open'){ setCell(level, row, col, false); markDirty(); return; }
  if (tool === 'home'){
    if (row < 0 || row >= level.tiles.length) return;
    level.homeRow = row; markDirty(); return;
  }
  const cx = (col + 0.5) * level.cellSize, cy = (row + 0.5) * level.cellSize;
  if (tool === 'start'){ level.start = { x: cx, y: cy }; markDirty(); return; }
  if (tool === 'miner'){
    const existing = findNearestEntity(level.miners, x, y, level.cellSize * 0.6);
    if (existing){
      level.miners.splice(level.miners.indexOf(existing), 1);
    } else {
      if (findNearestEntity(level.miners, cx, cy, MIN_ENTITY_SEPARATION)){
        setStatus('Too close to another miner — leave more space between them');
        return;
      }
      level.miners.push({ x: cx, y: cy });
    }
    markDirty(); return;
  }
  if (tool === 'fuel'){
    const existing = findNearestEntity(level.fuelPickups, x, y, level.cellSize * 0.6);
    if (existing){
      level.fuelPickups.splice(level.fuelPickups.indexOf(existing), 1);
    } else {
      if (findNearestEntity(level.fuelPickups, cx, cy, MIN_ENTITY_SEPARATION)){
        setStatus('Too close to another fuel canister — leave more space between them');
        return;
      }
      level.fuelPickups.push({ x: cx, y: cy, amount: 40 });
    }
    markDirty(); return;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  const pt = eventToCell(canvas, level, e);
  applyToolAt(pt);
  if (tool === 'wall' || tool === 'open') painting = true;
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  const pt = eventToCell(canvas, level, e);
  hover = { row: pt.row, col: pt.col };
  if (painting && (tool === 'wall' || tool === 'open')) applyToolAt(pt);
  redraw();
});
window.addEventListener('pointerup', () => { painting = false; });
canvas.addEventListener('pointerleave', () => { hover = null; redraw(); });

// --- metadata / grid size fields ---
document.getElementById('meta-id').addEventListener('input', (e) => { level.id = e.target.value; markDirty(); });
document.getElementById('meta-name').addEventListener('input', (e) => { level.name = e.target.value; markDirty(); });
document.getElementById('grid-cellsize').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  if (!Number.isNaN(v) && v > 0){ level.cellSize = v; markDirty(); redraw(); }
});
document.getElementById('btn-resize').addEventListener('click', () => {
  const cols = parseInt(document.getElementById('grid-cols').value, 10);
  const rows = parseInt(document.getElementById('grid-rows').value, 10);
  if (!cols || !rows) return;
  resizeGrid(level, cols, rows);
  markDirty();
  redraw();
});

// --- file operations ---
const hasFSAccess = typeof window.showSaveFilePicker === 'function';

async function writeToHandle(handle, text){
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

function downloadFallback(text, filename){
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function saveAs(){
  const json = levelToJSON(level);
  const filename = (level.id || 'level') + '.json';
  if (hasFSAccess){
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Level JSON', accept: { 'application/json': ['.json'] } }]
      });
      await writeToHandle(fileHandle, json);
      dirty = false;
      setStatus('Saved ' + filename);
    } catch (err){
      if (err.name !== 'AbortError') setStatus('Save failed: ' + err.message);
    }
  } else {
    downloadFallback(json, filename);
    setStatus('Downloaded ' + filename + ' — move it into src/levels/');
  }
}

async function save(){
  if (!fileHandle) return saveAs();
  try {
    await writeToHandle(fileHandle, levelToJSON(level));
    dirty = false;
    setStatus('Saved ' + (level.id || 'level') + '.json');
  } catch (err){
    setStatus('Save failed: ' + err.message);
  }
}

async function openLevel(){
  if (hasFSAccess){
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Level JSON', accept: { 'application/json': ['.json'] } }]
      });
      const file = await handle.getFile();
      level = JSON.parse(await file.text());
      fileHandle = handle;
      dirty = false;
      refreshFormFromLevel();
      setStatus('Opened ' + file.name);
    } catch (err){
      if (err.name !== 'AbortError') setStatus('Open failed: ' + err.message);
    }
  } else {
    document.getElementById('file-input').click();
  }
}

document.getElementById('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  level = JSON.parse(await file.text());
  fileHandle = null;
  dirty = false;
  refreshFormFromLevel();
  setStatus('Opened ' + file.name + ' (save will prompt for a location)');
});

document.getElementById('btn-new').addEventListener('click', () => {
  if (dirty && !window.confirm('Discard unsaved changes?')) return;
  level = createBlankLevel();
  fileHandle = null;
  dirty = false;
  refreshFormFromLevel();
  setStatus('New level');
});
document.getElementById('btn-open').addEventListener('click', openLevel);
document.getElementById('btn-save').addEventListener('click', save);
document.getElementById('btn-save-as').addEventListener('click', saveAs);
document.getElementById('btn-playtest').addEventListener('click', () => {
  sessionStorage.setItem(PLAYTEST_KEY, JSON.stringify(level));
  window.open('/index.html?playtest=1', '_blank');
});

window.addEventListener('beforeunload', (e) => {
  if (dirty){ e.preventDefault(); e.returnValue = ''; }
});

refreshFormFromLevel();
setStatus('Ready' + (hasFSAccess ? '' : ' — your browser lacks File System Access, saves will download instead'));

window.__editor = { get level(){ return level; }, get tool(){ return tool; }, get dirty(){ return dirty; }, get previewEnabled(){ return previewEnabled; } }; // debug hook
window.__sfx = sfx; // debug hook
