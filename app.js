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
  console.log("User connected");

  socket.on("join-auction", () => {
    console.log("joined auction");

    setInterval(() => {
      socket.emit("update", [
        { name: "Alice", coins: Math.floor(Math.random() * 200) },
        { name: "Bob", coins: Math.floor(Math.random() * 200) },
        { name: "Charlie", coins: Math.floor(Math.random() * 200) }
      ]);
    }, 2000);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});