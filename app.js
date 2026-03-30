console.log('App.js loaded');

const socket = io();
console.log('Socket.io initialized');

let pageUsername = null;

function joinRoom() {
  if (!pageUsername) return;
  socket.emit('join', pageUsername);
  const overlayUrl = `${window.location.origin}/overlay?username=${encodeURIComponent(pageUsername)}`;
  const obsUrlElement = document.getElementById('obs-url');
  if (obsUrlElement) obsUrlElement.textContent = overlayUrl;
}

socket.on('update', (bids) => {
  const board = document.getElementById('leaderboard');
  board.innerHTML = '';

  const sorted = Object.entries(bids).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.innerHTML = `
      <div class="empty-state-icon">🎁</div>
      <div class="empty-state-title">No Contributions Yet</div>
      <div class="empty-state-text">Send some tikstream coins to see the leaderboard come alive!</div>
    `;
    board.appendChild(li);
    return;
  }

  sorted.forEach(([user, amount], index) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    const rank = index + 1;

    let rankClass = 'rank-other';
    let rankDisplay = rank.toString();

    if (rank === 1) {
      rankClass = 'rank-1';
      rankDisplay = '🥇';
    } else if (rank === 2) {
      rankClass = 'rank-2';
      rankDisplay = '🥈';
    } else if (rank === 3) {
      rankClass = 'rank-3';
      rankDisplay = '🥉';
    }

    li.innerHTML = `
      <div class="rank-badge ${rankClass}">${rankDisplay}</div>
      <div class="user-info">
        <div class="user-name">${user}</div>
        <div class="user-stats">Rank #${rank}</div>
      </div>
      <div class="coin-display">
        <span class="coin-icon">💎</span>
        ${amount.toLocaleString()}
      </div>
    `;
    board.appendChild(li);
  });
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  updateStatus('server', '🟢', 'Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  updateStatus('server', '🔴', 'Connection failed: ' + error.message);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
  updateStatus('server', '🔴', 'Disconnected from server');
});

socket.on('tiktok-connected', (data) => {
  updateStatus('tiktok', '🎯', `tikstream: Connected (${data.username})`);
});

socket.on('tiktok-disconnected', () => {
  updateStatus('tiktok', '🎯', 'tikstream: Disconnected');
});

socket.on('tiktok-error', (data) => {
  updateStatus('tiktok', '⚠️', `tikstream: ${data.message}`);
});

socket.on('tiktok-status', (data) => {
  updateStatus('tiktok', data.icon, data.text);
});

function updateStatus(type, icon, text) {
  const iconElement = document.getElementById(`${type}-status-icon`);
  const textElement = document.getElementById(`${type}-status-text`);

  if (iconElement && textElement) {
    iconElement.textContent = icon;
    textElement.textContent = text;
  }
}

// Timer Functions
function setTimer() {
  const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
  const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;
  const totalSeconds = (minutes * 60) + seconds;

  if (totalSeconds > 0) {
    socket.emit('set-timer', { username: pageUsername, time: totalSeconds });
    showNotification(`Timer set to ${minutes}:${seconds.toString().padStart(2, '0')}`, 'success');
  } else {
    showNotification('Please enter a valid time', 'error');
  }
}

function startTimer() {
  socket.emit('start-timer', { username: pageUsername });
  showNotification('Timer started!', 'success');
}

function stopTimer() {
  socket.emit('stop-timer', { username: pageUsername });
  showNotification('Timer stopped!', 'info');
}

function addTime(seconds) {
  socket.emit('add-time', { username: pageUsername, seconds });
  const action = seconds > 0 ? 'added' : 'removed';
  const absSeconds = Math.abs(seconds);
  let timeDisplay;

  if (absSeconds < 60) {
    timeDisplay = `${absSeconds} second${absSeconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(absSeconds / 60);
    const remainingSeconds = absSeconds % 60;
    timeDisplay = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  showNotification(`${timeDisplay} ${action} from timer`, 'info');
}

// Minimum Coins Functions
function setMinCoins() {
  const value = parseInt(document.getElementById('min-coins').value) || 0;
  socket.emit('set-min-coins', { username: pageUsername, minCoins: value });
  showNotification(`Minimum coins set to ${value}`, 'success');
}

function normalizeTikTokUsername(raw) {
  if (!raw) return '';
  let clean = raw.trim();

  // accept full URL
  if (clean.startsWith('https://') || clean.startsWith('http://')) {
    try {
      const parsed = new URL(clean);
      clean = parsed.pathname.replace(/^\/+/, '');
      if (clean.startsWith('@')) clean = clean.slice(1);
    } catch {
      // keep raw
    }
  }

  if (clean.startsWith('@')) clean = clean.slice(1);
  clean = clean.replace(/\/live\/?$/i, '');
  if (clean.includes('/')) {
    clean = clean.split('/')[0];
  }
  return clean.trim();
}

function submitTikTokUsername() {
  const usernameInput = document.getElementById('tiktok-username');
  const username = normalizeTikTokUsername(usernameInput ? usernameInput.value : '');

  if (!username) {
    showNotification('Please enter a TikTok username', 'error');
    return;
  }

  fetch('/config/tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
    .then((res) => {
      if (!res.ok) {
        return res.text().then((text) => { throw new Error(`HTTP ${res.status}: ${text}`); });
      }
      return res.json();
    })
    .then((data) => {
      if (data.success) {
        pageUsername = data.username;
        history.replaceState(null, '', `/u/${encodeURIComponent(pageUsername)}`);
        joinRoom();
        showNotification(`TikTok username set: ${data.username}`, 'success');
        updateStatus('tiktok', '🎯', `tikstream: Connecting (${data.username})`);
        document.getElementById('disconnect-btn').style.display = '';
        document.getElementById('tiktok-username').disabled = true;
      } else {
        showNotification(data.message || 'Could not set TikTok username', 'error');
      }
    })
    .catch((err) => {
      showNotification(`Error setting TikTok username: ${err.message}`, 'error');
      console.error('TikTok config error:', err);
    });
}

function disconnectTikTok() {
  pageUsername = null;
  document.getElementById('disconnect-btn').style.display = 'none';
  document.getElementById('tiktok-username').disabled = false;
  document.getElementById('tiktok-username').value = '';
  showNotification('Disconnected from TikTok session', 'info');
  updateStatus('tiktok', '🎯', 'tikstream: Not Connected');
  // Optionally, leave the room or reset leaderboard
  document.getElementById('leaderboard').innerHTML = `<li class="empty-state"><div class="empty-state-icon">🎁</div><div class="empty-state-title">No Contributions Yet</div><div class="empty-state-text">Send some tikstream coins to see the leaderboard come alive!</div></li>`;
}

function clearLeaderboard() {
  if (!pageUsername) {
    showNotification('Set a username first', 'error');
    return;
  }
  if (confirm('Are you sure you want to clear all leaderboard data?')) {
    socket.emit('clear-leaderboard', { username: pageUsername });
    showNotification('Leaderboard cleared!', 'success');
  }
}

function addTestData() {
  if (!pageUsername) {
    showNotification('Set a username first', 'error');
    return;
  }

  const testUsers = [
    { user: 'StreamerFan123', amount: 500 },
    { user: 'CoinMaster', amount: 250 },
    { user: 'TikTokLegend', amount: 100 },
    { user: 'DanceQueen', amount: 75 },
    { user: 'MusicLover', amount: 50 },
  ];

  testUsers.forEach((bid, index) => {
    setTimeout(() => {
      socket.emit('bid', { username: pageUsername, ...bid });
    }, index * 500);
  });

  showNotification('Adding test data...', 'info');
}

function openOverlay() {
  const username = pageUsername || normalizeTikTokUsername(document.getElementById('tiktok-username')?.value || '');
  if (!username) {
    showNotification('Set a username first', 'error');
    return;
  }
  const overlayUrl = `${window.location.origin}/overlay?username=${encodeURIComponent(username)}`;
  const obsUrlElement = document.getElementById('obs-url');
  if (obsUrlElement) obsUrlElement.textContent = overlayUrl;
  window.open(overlayUrl, '_blank', 'width=800,height=600');
}

function getOverlayUrl(username) {
  if (!username) {
    return `${window.location.origin}/overlay?username=<your_username>`;
  }
  return `${window.location.origin}/overlay?username=${encodeURIComponent(username)}`;
}

function updateObsUrl() {
  const username = pageUsername || document.getElementById('tiktok-username').value.trim();
  const obsUrl = getOverlayUrl(username);
  const obsUrlElement = document.getElementById('obs-url');
  if (obsUrlElement) obsUrlElement.textContent = obsUrl;
}

function showNotification(message, type) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;

  if (type === 'success') {
    notification.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
  } else {
    notification.style.background = 'linear-gradient(45deg, #2196F3, #1976D2)';
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize status on page load
document.addEventListener('DOMContentLoaded', () => {
  updateStatus('server', '🔴', 'Connecting to server...');
  updateStatus('tiktok', '🎯', 'tikstream: Not Connected');
  updateObsUrl();
});
