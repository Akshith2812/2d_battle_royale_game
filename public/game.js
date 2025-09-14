// game.js (client-side)
const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;
canvas.style.border = "2px solid #222";
canvas.style.backgroundColor = "#e3f2fd";
canvas.style.display = "block";
canvas.style.margin = "40px auto";

let playerId = null;
let players = {};
let bullets = [];
let safeZone = { x: 400, y: 300, radius: 250 };
let canShoot = true;
let showDeathScreen = false;
let lastMouse = { x: 0, y: 0 };
let gameStarted = false;

// Scoreboard
const scoreboard = document.createElement("div");
scoreboard.style.position = "absolute";
scoreboard.style.right = "20px";
scoreboard.style.top = "20px";
scoreboard.style.backgroundColor = "rgba(0,0,0,0.7)";
scoreboard.style.color = "white";
scoreboard.style.padding = "10px";
scoreboard.style.fontFamily = "Arial";
scoreboard.style.borderRadius = "8px";
scoreboard.style.fontSize = "14px";
document.body.appendChild(scoreboard);

// Start screen
const startScreen = document.createElement("div");
startScreen.style.position = "absolute";
startScreen.style.top = 0;
startScreen.style.left = 0;
startScreen.style.width = "100%";
startScreen.style.height = "100%";
startScreen.style.backgroundColor = "#111";
startScreen.style.color = "#fff";
startScreen.style.display = "flex";
startScreen.style.flexDirection = "column";
startScreen.style.alignItems = "center";
startScreen.style.justifyContent = "center";
startScreen.innerHTML = `
  <h1 style="margin-bottom: 20px;">🎮 2D Battle Royale</h1>
  <button id="startBtn" style="padding: 10px 20px; font-size: 18px;">Start Game</button>
`;
document.body.appendChild(startScreen);

const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  gameStarted = true;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  lastMouse = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
});

document.addEventListener("keydown", (e) => {
  if (!gameStarted || showDeathScreen) return;
  const p = players[playerId];
  if (!p) return;

  if (e.key === "w") socket.emit("move", { dx: 0, dy: -1 });
  if (e.key === "a") socket.emit("move", { dx: -1, dy: 0 });
  if (e.key === "s") socket.emit("move", { dx: 0, dy: 1 });
  if (e.key === "d") socket.emit("move", { dx: 1, dy: 0 });

  if (e.code === "Space" && canShoot) {
    const dx = lastMouse.x - p.x;
    const dy = lastMouse.y - p.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      socket.emit("shoot", { dx: dx / mag, dy: dy / mag });
      canShoot = false;
      setTimeout(() => (canShoot = true), 500);
    }
  }
});

socket.on("connect", () => {
  playerId = socket.id;
});

socket.on("updatePlayers", (data) => {
  players = data;
});

socket.on("updateBullets", (data) => {
  bullets = data;
});

socket.on("updateSafeZone", (zone) => {
  safeZone = zone;
});

socket.on("playerEliminated", () => {
  showDeathScreen = true;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!gameStarted) return requestAnimationFrame(draw);

  // Draw Safe Zone
  ctx.beginPath();
  ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 128, 0, 0.4)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Safe Zone Warning
  if (players[playerId]) {
    const dx = players[playerId].x - safeZone.x;
    const dy = players[playerId].y - safeZone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > safeZone.radius - 20) {
      ctx.fillStyle = "#ffc107";
      ctx.font = "bold 20px Arial";
      ctx.fillText("⚠️ Return to Safe Zone!", canvas.width / 2 - 100, 30);
    }
  }

  // Draw Players
  let scores = [];
  for (let id in players) {
    const p = players[id];
    ctx.fillStyle = id === playerId ? "#0d47a1" : "#c62828";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar
    ctx.fillStyle = "#222";
    ctx.fillRect(p.x - 15, p.y - 20, 30, 5);
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(p.x - 15, p.y - 20, (p.health / 100) * 30, 5);

    scores.push({ id, health: p.health });
  }

  // Draw Bullets
  ctx.fillStyle = "#ff0000";
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  

  // Update scoreboard
  scoreboard.innerHTML = `<b>Scoreboard</b><br>` +
    scores
      .sort((a, b) => b.health - a.health)
      .map((s, i) => `${i + 1}. ${s.id === playerId ? "<b>You</b>" : "Player"} - ${s.health} HP`)
      .join("<br>");

  if (showDeathScreen) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Arial";
    ctx.fillText("☠️ You Died ☠️", canvas.width / 2 - 120, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press F5 to restart", canvas.width / 2 - 90, canvas.height / 2 + 40);
  }

  requestAnimationFrame(draw);
}

draw();
