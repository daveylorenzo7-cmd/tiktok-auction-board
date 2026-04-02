const express = require('express');
const app = express();

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-auction', (token) => {
    console.log('Joined auction:', token);

    // SEND REAL DATA TO OVERLAY
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