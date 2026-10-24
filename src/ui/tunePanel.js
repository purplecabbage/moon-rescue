import { TUNABLE_FIELDS } from '../tuning.js';
import { sfx } from '../audio/soundfx.js';

// Parameters that have a live "current value" counterpart (fuel, shield,
// lives) get topped up immediately when their max/value is retuned, so the
// effect of a change is felt right away instead of waiting for the next
// refuel/respawn.
function applySideEffects(scene, key, value){
  if (key === 'fuelMax') scene.fuel = value;
  if (key === 'shieldMax') scene.shield = value;
  if (key === 'lives') scene.lives = value;
  if (key === 'gravity' && scene.started) scene.physics.world.gravity.y = value;
}

function decimalsFor(step){ return step < 1 ? 2 : 0; }

function buildRows(scene){
  const container = document.getElementById('tune-fields');
  container.innerHTML = '';
  TUNABLE_FIELDS.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'tune-row';

    const label = document.createElement('label');
    label.className = 'tune-label';
    label.textContent = f.label;
    label.htmlFor = 'tune-' + f.key;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'tune-slider';
    slider.id = 'tune-' + f.key;
    slider.min = f.min; slider.max = f.max; slider.step = f.step;
    slider.value = scene.level[f.key];

    const num = document.createElement('input');
    num.type = 'number';
    num.className = 'tune-number';
    num.min = f.min; num.max = f.max; num.step = f.step;
    num.value = scene.level[f.key];

    const unit = document.createElement('span');
    unit.className = 'tune-unit';
    unit.textContent = f.unit || '';

    const apply = (raw) => {
      let val = parseFloat(raw);
      if (Number.isNaN(val)) return;
      val = Math.min(f.max, Math.max(f.min, val));
      val = parseFloat(val.toFixed(decimalsFor(f.step)));
      scene.level[f.key] = val;
      slider.value = val;
      num.value = val;
      applySideEffects(scene, f.key, val);
    };

    slider.addEventListener('input', () => apply(slider.value));
    num.addEventListener('input', () => apply(num.value));

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(num);
    row.appendChild(unit);
    container.appendChild(row);
  });
}

function isTypingTarget(e){
  const tag = (e.target && e.target.tagName) || '';
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function toggleTunePanel(scene){
  const panel = document.getElementById('panel-tune');
  const isOpen = !panel.hidden;
  if (isOpen){
    panel.hidden = true;
    if (scene._pausedForTuning){
      scene.scene.resume();
      scene._pausedForTuning = false;
    }
  } else {
    buildRows(scene);
    panel.hidden = false;
    if (scene.started && !scene.ended){
      sfx.stopAllThrust();
      scene.scene.pause();
      scene._pausedForTuning = true;
    }
  }
}

// `currentScene` tracks the live scene across restarts so the single
// window-level keydown listener (bound once, below) always targets the
// scene that's actually running instead of a stale one from a prior run.
let currentScene = null;
let globalListenerBound = false;

export function initTunePanel(scene){
  currentScene = scene;
  document.getElementById('btn-tune').onclick = () => toggleTunePanel(currentScene);
  document.getElementById('btn-tune-close').onclick = () => toggleTunePanel(currentScene);
  if (!globalListenerBound){
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e) || !currentScene) return;
      if (e.key.toLowerCase() === 't') toggleTunePanel(currentScene);
      else if (e.key === 'Escape' && !document.getElementById('panel-tune').hidden) toggleTunePanel(currentScene);
    });
    globalListenerBound = true;
  }
}
