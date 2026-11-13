import { formatTime } from '../leaderboard.js';
import { splitLevelName } from '../levels.js';

// Assigns the handlers as properties (not addEventListener) because the scene
// calls this again on every restart with a fresh `state` object: assignment
// replaces the previous run's handlers, where addEventListener would stack a
// new set on top of the stale ones each time.
export function bindTouch(id, state, key){
  const el = document.getElementById(id);
  const set = (v) => (e) => { e.preventDefault(); state[key] = v; el.classList.toggle('active', v); };
  el.onpointerdown = set(true);
  el.onpointerup = set(false);
  el.onpointerleave = set(false);
  el.onpointercancel = set(false);
}

export function prefersReducedMotion(){
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function showMessage(text){
  const el = document.getElementById('hud-message');
  el.textContent = text;
  el.classList.add('show');
}

export function clearMessage(){
  document.getElementById('hud-message').classList.remove('show');
}

// Filled dots are ships still available, hollow ones are ships already lost,
// so the row keeps its width and shows how far into the run you are.
export function updateLivesHud(lives, maxLives){
  const remaining = Math.max(0, lives);
  const lost = Math.max(0, maxLives - remaining);
  const el = document.getElementById('lives-count');
  el.textContent = '●'.repeat(remaining) + '○'.repeat(lost);
  el.setAttribute('aria-label', remaining + ' of ' + Math.max(maxLives, remaining));
}

export function updateFuelBar(fuel, fuelMax){
  const fillEl = document.getElementById('hud-fuel-fill');
  const pct = Math.max(0, Math.min(100, (fuel / fuelMax) * 100));
  fillEl.style.width = pct + '%';
  fillEl.classList.toggle('low', pct < 20);
}

export function updateShieldBar(shield, shieldMax){
  const fillEl = document.getElementById('hud-shield-fill');
  const pct = Math.max(0, Math.min(100, (shield / shieldMax) * 100));
  fillEl.style.width = pct + '%';
  fillEl.classList.toggle('low', pct < 25);
}

export function flashDamage(){
  const el = document.getElementById('damage-flash');
  el.style.transition = 'none';
  el.style.opacity = '0.5';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
  });
}

export function updateRescuedCount(count){
  document.getElementById('rescued-count').textContent = count;
}

export function updateTotalCount(count){
  document.getElementById('total-count').textContent = count;
}

export function updateCarrying(carried, capacity){
  document.getElementById('carrying-count').textContent = carried;
  document.getElementById('carrying-capacity').textContent = capacity;
  document.getElementById('hud-carrying').hidden = carried <= 0;
}

// Renders label/value pairs into a <dl class="facts"> — the mission facts on
// the brief and the result stats on the end screen share this one look.
export function renderFacts(listEl, facts){
  listEl.innerHTML = '';
  facts.forEach(({ label, value }) => {
    const item = document.createElement('div');
    item.className = 'fact';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    item.appendChild(dt);
    item.appendChild(dd);
    listEl.appendChild(item);
  });
}

export function setLevelInfo(level){
  document.getElementById('total-count').textContent = level.miners.length;
  document.getElementById('carrying-capacity').textContent = level.capacity;
  document.getElementById('hud-carrying').hidden = true;
  document.getElementById('hud-level').textContent = level.name + ' · GRAVITY ' + level.gravity;

  const { title, subtitle } = splitLevelName(level.name);
  document.getElementById('intro-title').textContent = title;
  document.getElementById('intro-subtitle').textContent = subtitle;
  document.getElementById('intro-site').textContent = title;
  renderFacts(document.getElementById('intro-facts'), [
    { label: 'MINERS', value: level.miners.length },
    { label: 'SEATS', value: level.capacity },
    { label: 'SHIPS', value: level.lives },
    { label: 'GRAVITY', value: level.gravity }
  ]);
}

export function updateTimer(ms){
  document.getElementById('timer-value').textContent = formatTime(ms);
}

export function showPanel(id){ document.getElementById(id).hidden = false; }
export function hidePanel(id){ document.getElementById(id).hidden = true; }
