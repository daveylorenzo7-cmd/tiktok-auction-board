app.use(express.json());

app.post('/api/generate-overlay-token', (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username' });
  }
  // Generate a random token (for demo, just use a random string)
  const token = Math.random().toString(36).substr(2, 12);
  // Return the overlay URL (customize as needed)
  const overlayUrl = `${req.protocol}://${req.get('host')}/overlay.html?token=${token}&username=${encodeURIComponent(username)}`;
  res.json({ url: overlayUrl, token });
});
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
