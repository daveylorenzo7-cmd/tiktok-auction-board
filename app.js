const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ✅ THIS FIXES YOUR OVERLAY URL
app.get('/overlay/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-auction', (token) => {
    console.log('Joined auction:', token);

    setInterval(() => {
      socket.emit('update', {
        timer: Math.floor(Math.random() * 120),
        minimum: 0,
        snipeDelay: 3,
        bidders: [
          { name: "User1", coins: Math.floor(Math.random() * 200) },
          { name: "User2", coins: Math.floor(Math.random() * 150) }
        ]
      });
    }, 2000);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});