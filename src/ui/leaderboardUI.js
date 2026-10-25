import { getLeaderboard, formatTime } from '../leaderboard.js';

export function renderLeaderboard(listEl, levelId, highlightRank = -1){
  const board = getLeaderboard(levelId);
  listEl.innerHTML = '';
  if (board.length === 0){
    const row = document.createElement('div');
    row.className = 'lb-row lb-empty';
    row.textContent = 'NO RECORDS YET — BE THE FIRST';
    listEl.appendChild(row);
    return;
  }
  board.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row' + (i === highlightRank ? ' lb-new' : '');
    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = '#' + (i + 1);
    const initials = document.createElement('span');
    initials.className = 'lb-initials';
    initials.textContent = entry.initials;
    const time = document.createElement('span');
    time.className = 'lb-time';
    time.textContent = formatTime(entry.timeMs);
    row.appendChild(rank);
    row.appendChild(initials);
    row.appendChild(time);
    listEl.appendChild(row);
  });
}

// Shows a 3-letter initials entry form, resolving `onSubmit(initials)` when
// the player confirms (button click or Enter). Caller is responsible for
// re-rendering the leaderboard afterward.
export function showInitialsEntry(containerEl, onSubmit){
  containerEl.innerHTML = '';
  containerEl.hidden = false;

  const label = document.createElement('div');
  label.className = 'lb-entry-label';
  label.textContent = 'NEW RECORD — ENTER INITIALS';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'lb-initials-input';
  input.maxLength = 3;
  input.autocomplete = 'off';
  input.autocapitalize = 'characters';
  input.className = 'lb-initials-input';

  const btn = document.createElement('button');
  btn.className = 'cta lb-submit';
  btn.textContent = 'SAVE';

  const submit = () => {
    const initials = (input.value || 'AAA').trim().toUpperCase().padEnd(3, 'A').slice(0, 3);
    containerEl.hidden = true;
    onSubmit(initials);
  };

  input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  btn.addEventListener('click', submit);

  containerEl.appendChild(label);
  containerEl.appendChild(input);
  containerEl.appendChild(btn);
  input.focus();
}

export function hideInitialsEntry(containerEl){
  containerEl.hidden = true;
  containerEl.innerHTML = '';
}
