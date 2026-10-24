export function bindTouch(id, state, key){
  const el = document.getElementById(id);
  const set = (v) => (e) => { e.preventDefault(); state[key] = v; el.classList.toggle('active', v); };
  el.addEventListener('pointerdown', set(true));
  el.addEventListener('pointerup', set(false));
  el.addEventListener('pointerleave', set(false));
  el.addEventListener('pointercancel', set(false));
}

export function showMessage(text){
  const el = document.getElementById('hud-message');
  el.textContent = text;
  el.classList.add('show');
}

export function clearMessage(){
  document.getElementById('hud-message').classList.remove('show');
}

export function updateLivesHud(lives){
  document.getElementById('lives-count').textContent = '●'.repeat(Math.max(0, lives));
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
  document.getElementById('carrying-wrap').style.display = carried > 0 ? '' : 'none';
}

export function setLevelInfo(level){
  document.getElementById('total-count').textContent = level.miners.length;
  document.getElementById('carrying-capacity').textContent = level.capacity;
  document.getElementById('carrying-wrap').style.display = 'none';
  document.getElementById('intro-level-name').textContent = level.name;
  document.getElementById('hud-gravity').textContent =
    'SURFACE GRAVITY ' + level.gravity + ' · ' + level.name;
}

export function showPanel(id){ document.getElementById(id).hidden = false; }
export function hidePanel(id){ document.getElementById(id).hidden = true; }
