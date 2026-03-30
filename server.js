const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const socketIo = require('socket.io');
const io = socketIo(http, {
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});
const { WebcastPushConnection } = require('tiktok-live-connector');


// Store TikTok sessions: { username: { connection, overlayUrl } }
const tiktokSessions = {};

// API endpoint to generate overlay URL and start TikTok connection
app.post('/api/generate-url', async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username' });
  }
  const cleanUsername = username.trim().replace(/^@/, '');
  // Always use https and the current host for overlay URLs
  const host = req.get('host');
  const overlayUrl = `https://${host}/overlay?username=${encodeURIComponent(cleanUsername)}`;
  if (!tiktokSessions[cleanUsername]) {
    console.log(`[TikTok] Connecting to TikTok for @${cleanUsername}`);
    const tiktokConnection = new WebcastPushConnection(cleanUsername);
    tiktokSessions[cleanUsername] = { connection: tiktokConnection, overlayUrl };
    // Event listeners
    tiktokConnection.on('connect', () => {
      console.log(`[TikTok] Connected successfully for @${cleanUsername}`);
    });
    tiktokConnection.on('gift', (data) => {
      console.log(`[TikTok] Gift received for @${cleanUsername}:`, data);
      // TODO: Update leaderboard and emit via Socket.io
    });
    tiktokConnection.on('error', (err) => {
      console.error(`[TikTok] Error for @${cleanUsername}:`, err);
    });
    try {
      await tiktokConnection.connect();
    } catch (err) {
      console.error(`[TikTok] Connection error for @${cleanUsername}:`, err);
      return res.status(500).json({ error: 'Failed to connect to TikTok' });
    }
  }
  return res.json({ url: overlayUrl });
});
app.use(express.static('public'))



app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

let users = {}
let auctions = []

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id)

  socket.on('register', (nickname) => {
    if (typeof nickname !== 'string' || !nickname.trim()) {
      socket.emit('error', 'Invalid nickname')
      return
    }

    users[socket.id] = nickname
    io.emit('users', Object.values(users))
    socket.emit('auctions', auctions)
  })

  socket.on('new-auction', (item) => {
    if (!item || typeof item !== 'object' || !item.title) {
      socket.emit('error', 'Invalid auction item')
      return
    }

    auctions.push(item)
    io.emit('auctions', auctions)
  })

  socket.on('disconnect', () => {
    delete users[socket.id]
    io.emit('users', Object.values(users))
    console.log('user disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3002;
http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`)
})

// Streams state per username
const streams = {}; // { username: { connection, bids, timerRunning, timerTime, minCoins }}
const premiumTokens = new Set(); // Set of valid overlay tokens

const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getOrCreateStream(username) {
  if (!username || !username.trim()) return null;
  username = username.trim();
  if (!streams[username]) {
    streams[username] = {
      username,
      connection: null,
      bids: {},
      timerRunning: false,
      timerTime: 0,
      timerInterval: null,
      minCoins: 0,
    };
  }
  return streams[username];
}

function getFilteredBids(stream) {
  if (!stream) return {};
  const filtered = {};
  Object.entries(stream.bids).forEach(([user, amount]) => {
    if (amount >= stream.minCoins) filtered[user] = amount;
  });
  return filtered;
}

function emitStreamUpdate(username) {
  const stream = streams[username];
  if (!stream) return;
  io.to(username).emit('update', getFilteredBids(stream));
}

function emitStreamTimer(username) {
  const stream = streams[username];
  if (!stream) return;
  io.to(username).emit('timer-update', { time: stream.timerTime, running: stream.timerRunning });
}

function emitStreamMinCoins(username) {
  const stream = streams[username];
  if (!stream) return;
  io.to(username).emit('min-coins-update', { minCoins: stream.minCoins });
}

function emitTikTokStatus(username, icon, text) {
  const roomUsername = normalizeTikTokUsername(username);
  if (!roomUsername) return;
  io.to(roomUsername).emit('tiktok-status', { icon, text });
}

function stopStreamTimer(stream) {
  if (!stream) return;
  stream.timerRunning = false;
  if (stream.timerInterval) {
    clearInterval(stream.timerInterval);
    stream.timerInterval = null;
  }
  emitStreamTimer(stream.username);
}

function setStreamTimer(stream, time) {
  if (!stream) return;
  stream.timerTime = time;
  emitStreamTimer(stream.username);
}

function startStreamTimer(stream) {
  if (!stream || stream.timerRunning) return;
  stream.timerRunning = true;
  stream.timerInterval = setInterval(() => {
    if (stream.timerTime > 0) {
      stream.timerTime -= 1;
      emitStreamTimer(stream.username);
    } else {
      stopStreamTimer(stream);
    }
  }, 1000);
  emitStreamTimer(stream.username);
}

function addTimeToStream(stream, seconds) {
  if (!stream) return;
  stream.timerTime = Math.max(0, stream.timerTime + seconds);
  emitStreamTimer(stream.username);
}

function normalizeTikTokUsername(raw) {
  if (!raw) return '';
  let clean = raw.trim();

  // accept full URL
  if (clean.startsWith('https://') || clean.startsWith('http://')) {
    try {
      const parsed = new URL(clean);
      clean = parsed.pathname.replace(/^\/+/, ''); // remove leading slash
      if (clean.startsWith('@')) clean = clean.slice(1);
    } catch {
      // fallback to raw
    }
  }

  // strip @ prefix and trailing path parts e.g. "/live" or "/..."
  if (clean.startsWith('@')) clean = clean.slice(1);
  clean = clean.replace(/\/live\/?$/i, '');
  if (clean.includes('/')) {
    clean = clean.split('/')[0];
  }

  return clean.trim();
}

function setupTikTokConnection(username) {
  const normalizedUsername = normalizeTikTokUsername(username);
  if (!normalizedUsername) {
    return { success: false, message: 'Username required' };
  }

  const stream = getOrCreateStream(normalizedUsername);
  if (!stream) return { success: false, message: 'Username required' };

  const roomUsername = normalizedUsername;

  if (stream.connection && stream.connection.disconnect) {
    try {
      stream.connection.disconnect();
    } catch (err) {
      console.warn('Failed to disconnect existing connection', err.message);
    }
    stream.connection = null;
  }

  try {
    const connection = new TikTokLiveConnection(normalizedUsername, {
      connectWithUniqueId: false,
      enableExtendedGiftInfo: true,
      processInitialData: true,
      webClientParams: {
        app_language: 'en-US',
        device_platform: 'web'
      }
    });
    stream.connection = connection;

    connection.connect().then(() => {
      console.log(`✅ Connected TikTok Live Stream for ${roomUsername}`);
      emitTikTokStatus(roomUsername, '🎯', `tikstream: Connected (${roomUsername})`);
      io.to(roomUsername).emit('tiktok-connected', { username: roomUsername });
    }).catch((err) => {
      console.error(`❌ Failed to connect TikTok Live for ${roomUsername}:`, err.message);
      emitTikTokStatus(roomUsername, '⚠️', `tikstream: Connection error: ${err.message}`);
      io.to(roomUsername).emit('tiktok-error', { message: err.message });
    });

    connection.on('gift', (data) => {
      console.log(`🎁 [${roomUsername}] Gift received:`, data);
      const { nickname, giftValue = 0, repeatCount = 1 } = data;
      const totalCoins = giftValue * repeatCount;
      stream.bids[nickname] = (stream.bids[nickname] || 0) + totalCoins;
      emitStreamUpdate(roomUsername);
      // Also emit to the user's own socket room for real-time update
      io.to(roomUsername).emit('update', getFilteredBids(stream));
    });

    connection.on('envelope', (data) => {
      console.log(`💰 [${roomUsername}] Envelope received:`, data);
    });

    connection.on('like', (data) => {
      console.log(`👍 [${roomUsername}] Like received:`, data);
    });

    connection.on('member', (data) => {
      console.log(`[${roomUsername}] Member joined:`, data.nickname || data);
    });

    connection.on('error', (err) => {
      console.error(`❌ [${roomUsername}] TikTok Live error:`, err);
      io.to(roomUsername).emit('tiktok-error', { message: err.message || 'Unknown TikTok error' });
    });

    connection.on('disconnected', () => {
      console.log(`🔌 [${roomUsername}] Disconnected from TikTok Live`);
      io.to(roomUsername).emit('tiktok-disconnected');
    });

    return { success: true, username };
  } catch (error) {
    console.error(`❌ Error setting up TikTok for ${roomUsername}:`, error.message);
    emitTikTokStatus(roomUsername, '⚠️', `tikstream: Setup error: ${error.message}`);
    return { success: false, message: error.message };
  }
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use((req, res, next) => {
  res.header('X-Frame-Options', 'ALLOWALL');
  res.header('Content-Security-Policy', "frame-ancestors *;");
  next();
});

app.use(express.static('.', {
  setHeaders: (res, path) => {
    console.log('Setting headers for path:', path);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (path.endsWith('.html')) {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    }
  },
}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/u/:username', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


// Secure overlay route: /overlay/:token
app.get('/overlay/:token', (req, res) => {
  const token = req.params.token;
  if (!premiumTokens.has(token)) {
    return res.status(404).send('Invalid or expired overlay link.');
  }
  // Serve the overlay HTML (replace with your actual overlay file if needed)
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *;');
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

// For demo: endpoint to generate a token for a username (simulate premium purchase)
app.post('/api/generate-overlay-token', express.json(), (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Username required' });
  }
  const cleanUsername = normalizeTikTokUsername(username);
  // Check if user already has a token
  let token = Object.keys(premiumTokens).find(t => premiumTokens[t] === cleanUsername);
  if (!token) {
    token = generateToken();
    premiumTokens[token] = cleanUsername;
  }
  res.json({ overlayUrl: `${req.protocol}://${req.get('host')}/overlay/${token}` });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    active_connections: io.engine.clientsCount,
    streams: Object.keys(streams).length,
  });
});

app.post('/config/tiktok', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }
  const result = setupTikTokConnection(username.trim());
  if (!result.success) {
    return res.status(500).json(result);
  }
  return res.json(result);
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (username) => {
    if (!username) return;
    const normalizedUsername = normalizeTikTokUsername(username);
    if (!normalizedUsername) return;

    socket.join(normalizedUsername);
    console.log(`Socket ${socket.id} joined room ${normalizedUsername}`);

    const stream = getOrCreateStream(normalizedUsername);
    if (!stream.connection) {
      emitTikTokStatus(normalizedUsername, '⚠️', 'tikstream: Not connected yet');
    }

    // send current state
    socket.emit('update', getFilteredBids(stream));
    socket.emit('timer-update', { time: stream.timerTime, running: stream.timerRunning });
    socket.emit('min-coins-update', { minCoins: stream.minCoins });
  });

  socket.on('bid', (data) => {
    const { username, user, amount } = data;
    if (!username || !user || !amount || amount <= 0) return;
    const stream = getOrCreateStream(username);
    stream.bids[user] = (stream.bids[user] || 0) + amount;
    emitStreamUpdate(username);
  });

  socket.on('clear-leaderboard', (data) => {
    const { username } = data || {};
    if (!username) return;
    const stream = getOrCreateStream(username);
    stream.bids = {}; 
    emitStreamUpdate(username);
  });

  socket.on('set-timer', (data) => {
    const { username, time } = data;
    const stream = getOrCreateStream(username);
    setStreamTimer(stream, time);
  });

  socket.on('start-timer', (data) => {
    const { username } = data;
    const stream = getOrCreateStream(username);
    startStreamTimer(stream);
  });

  socket.on('stop-timer', (data) => {
    const { username } = data;
    const stream = getOrCreateStream(username);
    stopStreamTimer(stream);
  });

  socket.on('add-time', (data) => {
    const { username, seconds } = data;
    const stream = getOrCreateStream(username);
    addTimeToStream(stream, seconds);
  });

  socket.on('set-min-coins', (data) => {
    const { username, minCoins } = data;
    const stream = getOrCreateStream(username);
    stream.minCoins = minCoins;
    emitStreamMinCoins(username);
    emitStreamUpdate(username);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Optionally, handle user leaving room/session cleanup here
  });
});

// Removed duplicate server.listen and PORT declaration

// Add error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Generate random overlay URL endpoint for Render or local
// Overlay URL generator for Render deployment
app.get('/generate', (req, res) => {
  const token = Math.random().toString(36).substring(2, 10);
  premiumTokens.add(token);
  // Always use https for TikTok Live Studio compatibility, regardless of incoming protocol
  const host = req.get('host');
  const url = `https://${host}/overlay/${token}`;
  res.json({ url });
});
