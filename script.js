const game = document.getElementById("game");
const player = document.getElementById("player");
const overlay = document.getElementById("overlay");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const levelEl = document.getElementById("level");
const speedEl = document.getElementById("speed");
const statusBadge = document.getElementById("statusBadge");
const sunMoon = document.getElementById("sunMoon");

const INITIAL_SPEED = 1.15;

const obstacleTypes = [
  { icon: "🌵", className: "cactus", minLevel: 1 },
  { icon: "🪨", className: "rock", minLevel: 1 },
  { icon: "📦", className: "box", minLevel: 2 },
  { icon: "🕊️", className: "pigeon", minLevel: 2 },
  { icon: "🔥", className: "fire", minLevel: 3 },
];

const itemTypes = [
  { icon: "🪙", name: "coin", label: "+250", duration: 0 },
  { icon: "⭐", name: "invincible", label: "INVINCIBLE", duration: 5000 },
  { icon: "⚡", name: "boost", label: "BOOST", duration: 4500 },
  { icon: "❤️", name: "heart", label: "SHIELD +1", duration: 0 },
];

const state = {
  running: false,
  gameOver: false,
  jumping: false,
  sliding: false,
  invincible: false,
  boosted: false,
  shield: 0,
  score: 0,
  bestScore: Number(localStorage.getItem("pixelRunnerBest") || 0),
  level: 1,
  speed: INITIAL_SPEED,
  elapsed: 0,
  lastTime: 0,
  nextObstacleAt: 0,
  nextItemAt: 0,
  obstacleTimer: 0,
  itemTimer: 0,
  entities: [],
  timers: [],
};

bestScoreEl.textContent = state.bestScore;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function setOverlay(title, message, buttonText) {
  overlay.innerHTML = `
    <h1>${title}</h1>
    <p>${message}</p>
    <button id="overlayButton" type="button">${buttonText}</button>
  `;
  overlay.classList.remove("hidden");
  document.getElementById("overlayButton").addEventListener("click", startGame);
}

function showStartScreen() {
  game.classList.add("start-screen");
  setOverlay("Pixel Runner", "오래 달리고, 더 멀리 살아남으세요", "Start");
}

function removeOverlayButton() {
  game.classList.remove("start-screen");
  overlay.innerHTML = "";
  overlay.classList.add("hidden");
}

function clearEntities() {
  state.entities.forEach((entity) => entity.element.remove());
  state.entities = [];
}

function clearTimers() {
  state.timers.forEach((timer) => clearTimeout(timer));
  state.timers = [];
}

function resetPlayer() {
  player.className = "player running";
  state.jumping = false;
  state.sliding = false;
  state.invincible = false;
  state.boosted = false;
}

function startGame() {
  clearEntities();
  clearTimers();
  resetPlayer();

  state.running = true;
  state.gameOver = false;
  state.shield = 0;
  state.score = 0;
  state.level = 1;
  state.speed = INITIAL_SPEED;
  state.elapsed = 0;
  state.lastTime = performance.now();
  state.obstacleTimer = 0;
  state.itemTimer = 0;
  state.nextObstacleAt = 900;
  state.nextItemAt = 2600;

  game.classList.remove("night");
  game.classList.add("day");
  sunMoon.textContent = "☀️";
  removeOverlayButton();
  statusBadge.classList.add("hidden");
  updateHud();
  requestAnimationFrame(gameLoop);
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  bestScoreEl.textContent = state.bestScore;
  levelEl.textContent = state.level;
  speedEl.textContent = `${state.speed.toFixed(1)}x`;
}

function showBadge(text, ms = 900) {
  statusBadge.textContent = text;
  statusBadge.classList.remove("hidden");
  const timer = setTimeout(() => statusBadge.classList.add("hidden"), ms);
  state.timers.push(timer);
}

function jump() {
  if (!state.running || state.jumping || state.sliding) return;

  state.jumping = true;
  player.classList.add("jumping");

  const timer = setTimeout(() => {
    state.jumping = false;
    player.classList.remove("jumping");
  }, 850);
  state.timers.push(timer);
}

function slide() {
  if (!state.running || state.sliding || state.jumping) return;

  state.sliding = true;
  player.classList.add("sliding");
  const timer = setTimeout(() => {
    state.sliding = false;
    player.classList.remove("sliding");
  }, 560);
  state.timers.push(timer);
}

function spawnObstacle() {
  const available = obstacleTypes.filter((type) => type.minLevel <= state.level);
  const type = available[Math.floor(Math.random() * available.length)];
  const element = document.createElement("div");
  element.className = `obstacle ${type.className}`;
  element.textContent = type.icon;
  game.appendChild(element);

  state.entities.push({
    element,
    kind: "obstacle",
    x: game.clientWidth + 80,
    y: 0,
    speed: randomBetween(290, 380) * state.speed,
  });
}

function spawnItem() {
  const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  const element = document.createElement("div");
  element.className = `item ${type.name}`;
  element.textContent = type.icon;
  game.appendChild(element);

  state.entities.push({
    element,
    kind: "item",
    itemType: type,
    x: game.clientWidth + 80,
    y: randomBetween(0, 110),
    speed: randomBetween(230, 320) * state.speed,
  });
}

function applyItem(itemType) {
  if (itemType.name === "coin") {
    state.score += 250;
  }

  if (itemType.name === "heart") {
    state.shield = 1;
    player.classList.add("shielded");
  }

  if (itemType.name === "invincible") {
    state.invincible = true;
    player.classList.add("invincible");
    const timer = setTimeout(() => {
      state.invincible = false;
      player.classList.remove("invincible");
    }, itemType.duration);
    state.timers.push(timer);
  }

  if (itemType.name === "boost") {
    state.boosted = true;
    player.classList.add("boosted");
    state.score += 150;
    const timer = setTimeout(() => {
      state.boosted = false;
      player.classList.remove("boosted");
    }, itemType.duration);
    state.timers.push(timer);
  }

  showBadge(itemType.label);
}

function isColliding(a, b) {
  const playerBox = a.getBoundingClientRect();
  const entityBox = b.getBoundingClientRect();
  const padding = 8;

  return !(
    playerBox.right - padding < entityBox.left + padding ||
    playerBox.left + padding > entityBox.right - padding ||
    playerBox.bottom - padding < entityBox.top + padding ||
    playerBox.top + padding > entityBox.bottom - padding
  );
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  clearTimers();

  const finalScore = Math.floor(state.score);
  if (finalScore > state.bestScore) {
    state.bestScore = finalScore;
    localStorage.setItem("pixelRunnerBest", String(finalScore));
  }

  updateHud();
  setOverlay("GAME OVER", `현재 점수 ${finalScore} / 최고 점수 ${state.bestScore}`, "Restart");
}

function updateDifficulty() {
  state.level = Math.min(10, Math.floor(state.elapsed / 12000) + 1);
  state.speed = INITIAL_SPEED + state.elapsed / 42000 + (state.boosted ? 0.45 : 0);
}

function updateDayNight() {
  const night = Math.floor(state.elapsed / 30000) % 2 === 1;
  game.classList.toggle("night", night);
  game.classList.toggle("day", !night);
  sunMoon.textContent = night ? "🌙" : "☀️";
}

function scheduleSpawns(delta) {
  state.obstacleTimer += delta;
  state.itemTimer += delta;

  if (state.obstacleTimer >= state.nextObstacleAt) {
    spawnObstacle();
    state.obstacleTimer = 0;
    const minDelay = Math.max(520, 1400 - state.level * 85);
    const maxDelay = Math.max(820, 2100 - state.level * 120);
    state.nextObstacleAt = randomBetween(minDelay, maxDelay);
  }

  if (state.itemTimer >= state.nextItemAt) {
    spawnItem();
    state.itemTimer = 0;
    state.nextItemAt = randomBetween(3600, 7600);
  }
}

function updateEntities(delta) {
  const removeQueue = [];

  state.entities.forEach((entity) => {
    entity.x -= entity.speed * (delta / 1000);
    entity.element.style.transform = `translateX(${entity.x}px)`;

    if (entity.kind === "item") {
      entity.element.style.bottom = `${142 + entity.y}px`;
    }

    if (isColliding(player, entity.element)) {
      if (entity.kind === "item") {
        applyItem(entity.itemType);
        removeQueue.push(entity);
      } else if (!state.invincible) {
        if (state.shield > 0) {
          state.shield = 0;
          player.classList.remove("shielded");
          showBadge("SHIELD BLOCKED", 1000);
          removeQueue.push(entity);
        } else {
          endGame();
        }
      }
    }

    if (entity.x < -140) {
      removeQueue.push(entity);
    }
  });

  removeQueue.forEach((entity) => {
    entity.element.remove();
    state.entities = state.entities.filter((item) => item !== entity);
  });
}

function gameLoop(time) {
  if (!state.running) return;

  const delta = Math.min(time - state.lastTime, 32);
  state.lastTime = time;
  state.elapsed += delta;
  state.score += delta * 0.018 * state.speed;

  updateDifficulty();
  updateDayNight();
  scheduleSpawns(delta);
  updateEntities(delta);
  updateHud();

  if (state.running) {
    requestAnimationFrame(gameLoop);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!state.running && !state.gameOver) {
      startGame();
    } else {
      jump();
    }
  }

  if (event.code === "ArrowDown") {
    event.preventDefault();
    slide();
  }

  if (event.code === "KeyR" && state.gameOver) {
    startGame();
  }
});

showStartScreen();
updateHud();
