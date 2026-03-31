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
// Public overlay route for TikTok Studio compatibility (token check removed for testing)
app.get('/overlay/:token', (req, res) => {
  // TikTok Studio compatibility headers
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *;');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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

    // INSTANT feedback for dashboard connect
    socket.emit('tiktok-connected');

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
