
// BACKEND ENTRY POINT FOR EXPRESS + SOCKET.IO
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Example basic endpoint
app.get('/', (req, res) => {
  res.send('Auction Board backend running.');
});

// Example Socket.IO event
app.use(express.static("public"));
// ...existing code...

const PORT = process.env.PORT || 3002;
server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
