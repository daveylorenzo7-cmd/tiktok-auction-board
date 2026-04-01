

const path = require("path");
const activeTokens = new Map();
app.use(express.json());


// New /generate endpoint for overlay tokens

app.get("/generate", (req, res) => {
  try {
    const token = Math.random().toString(36).substring(2, 10);
    activeTokens.set(token, {
      created: Date.now()
    });
    const url = `${req.protocol}://${req.get("host")}/overlay/${token}`;
    res.json({ url });
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Failed to generate URL" });
  }
});

// Overlay route with token validation
app.get("/overlay/:token", (req, res) => {
  const token = req.params.token;
  if (!activeTokens.has(token)) {
    return res.send("Invalid or expired link");
  }
  res.sendFile(path.join(__dirname, "public", "overlay.html"));
});
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Listen for auction updates from dashboard
  socket.on('update-auction', (data) => {
    io.emit('auction-update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
