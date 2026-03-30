
// Timer logic for public/index.html
let timerInterval = null;
let timerSeconds = 0;

function updateTimerDisplay() {
  const timerEl = document.getElementById('timer');
  if (!timerEl) return;
  const min = Math.floor(timerSeconds / 60);
  const sec = timerSeconds % 60;
  timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
}

function startMatch() {
  if (timerInterval) return; // already running
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }, 1000);
}

function pauseMatch() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function finishMatch() {
  pauseMatch();
  timerSeconds = 0;
  updateTimerDisplay();
}

function restartMatch() {
  pauseMatch();
  const minInput = document.getElementById('match-min');
  const secInput = document.getElementById('match-sec');
  const min = parseInt(minInput?.value) || 0;
  const sec = parseInt(secInput?.value) || 0;
  timerSeconds = min * 60 + sec;
  updateTimerDisplay();
}

window.addEventListener('DOMContentLoaded', () => {
  // Set initial timer value from inputs
  restartMatch();

  document.getElementById('start-match')?.addEventListener('click', () => {
    startMatch();
  });
  document.getElementById('pause-match')?.addEventListener('click', () => {
    pauseMatch();
  });
  document.getElementById('finish-match')?.addEventListener('click', () => {
    finishMatch();
  });
  document.getElementById('restart-match')?.addEventListener('click', () => {
    restartMatch();
  });
  document.getElementById('plus30')?.addEventListener('click', () => {
    timerSeconds += 30;
    updateTimerDisplay();
  });
  document.getElementById('minus30')?.addEventListener('click', () => {
    timerSeconds = Math.max(0, timerSeconds - 30);
    updateTimerDisplay();
  });

  // Update timer if inputs change
  document.getElementById('match-min')?.addEventListener('change', restartMatch);
  document.getElementById('match-sec')?.addEventListener('change', restartMatch);
});
