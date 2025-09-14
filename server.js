// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const originalSafeZone = { x: 400, y: 300, radius: 250 };
let safeZone = { ...originalSafeZone };
let players = {};
let bullets = [];
let bulletSpeed = 6;
let zoneShrinkStarted = false;
let gameStartTime = Date.now();

function resetGame() {
  players = {};
  bullets = [];
  safeZone = { ...originalSafeZone };
  zoneShrinkStarted = false;
  gameStartTime = Date.now();
}

io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  players[socket.id] = {
    x: Math.random() * 600 + 100,
    y: Math.random() * 400 + 100,
    health: 100,
    id: socket.id,
  };

  socket.emit("updateSafeZone", safeZone);
  io.emit("updatePlayers", players);

  socket.on("move", ({ dx, dy }) => {
    const p = players[socket.id];
    if (!p) return;
    const speed = 3;
    p.x += dx * speed;
    p.y += dy * speed;
    io.emit("updatePlayers", players);
  });

  socket.on("shoot", ({ dx, dy }) => {
    const p = players[socket.id];
    if (!p) return;
    bullets.push({ x: p.x, y: p.y, dx, dy, owner: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    delete players[socket.id];
    io.emit("updatePlayers", players);
    if (Object.keys(players).length === 0) resetGame();
  });
});

setInterval(() => {
  bullets.forEach((b, i) => {
    b.x += b.dx * bulletSpeed;
    b.y += b.dy * bulletSpeed;

    for (let id in players) {
      const p = players[id];
      if (id !== b.owner) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) {
          p.health -= 25;
          bullets.splice(i, 1);
          if (p.health <= 0) {
            io.to(id).emit("playerEliminated");
            delete players[id];
          }
          break;
        }
      }
    }
  });
  bullets = bullets.filter(b => b.x >= 0 && b.y >= 0);
  io.emit("updateBullets", bullets);
}, 1000 / 30);

setInterval(() => {
  const shrinkDelay = 10000; // 10 seconds
  const shrinkRate = 0.2; // slower

  if (!zoneShrinkStarted && Date.now() - gameStartTime > shrinkDelay) {
    zoneShrinkStarted = true;
  }

  if (zoneShrinkStarted && safeZone.radius > 100) {
    safeZone.radius -= shrinkRate;
    io.emit("updateSafeZone", safeZone);
  }

  for (let id in players) {
    const p = players[id];
    const dx = p.x - safeZone.x;
    const dy = p.y - safeZone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > safeZone.radius) {
      p.health -= 0.3; // Gradual damage
      if (p.health <= 0) {
        io.to(id).emit("playerEliminated");
        delete players[id];
      }
    }
  }
  io.emit("updatePlayers", players);
}, 100);