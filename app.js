
// BACKEND ENTRY POINT FOR EXPRESS + SOCKET.IO
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

// Example basic endpoint
app.get('/', (req, res) => {
  res.send('Auction Board backend running.');
});

// Example Socket.IO event
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Backend listening on *:${PORT}`);
});
