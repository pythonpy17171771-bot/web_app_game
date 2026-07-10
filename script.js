const menuScreen = document.getElementById("menuScreen");
const runnerScreen = document.getElementById("runnerScreen");
const swordScreen = document.getElementById("swordScreen");
const openRunnerGame = document.getElementById("openRunnerGame");
const openSwordGame = document.getElementById("openSwordGame");
const backButtons = document.querySelectorAll("[data-back]");

const game = document.getElementById("game");
const player = document.getElementById("player");
const overlay = document.getElementById("overlay");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const levelEl = document.getElementById("level");
const speedEl = document.getElementById("speed");
const statusBadge = document.getElementById("statusBadge");
const sunMoon = document.getElementById("sunMoon");

const swordGoldEl = document.getElementById("swordGold");
const swordLevelEl = document.getElementById("swordLevel");
const swordBestEl = document.getElementById("swordBest");
const swordChanceEl = document.getElementById("swordChance");
const swordVisual = document.getElementById("swordVisual");
const swordMessage = document.getElementById("swordMessage");
const enhanceSword = document.getElementById("enhanceSword");
const sellSword = document.getElementById("sellSword");
const resetSword = document.getElementById("resetSword");

const INITIAL_SPEED = 1.15;
const JUMP_TIME = 850;
const SLIDE_TIME = 560;
const MAX_SWORD_LEVEL = 20;

const swordGrades = [
  { chance: 100, penalty: "none", nextName: "목검" },
  { chance: 100, penalty: "none", nextName: "낡은 목검" },
  { chance: 95, penalty: "keep", nextName: "몽둥이" },
  { chance: 95, penalty: "keep", nextName: "단단한 몽둥이" },
  { chance: 90, penalty: "keep", nextName: "돌검" },
  { chance: 85, penalty: "keep", nextName: "단단한 돌검" },
  { chance: 80, penalty: "down", nextName: "장검" },
  { chance: 75, penalty: "down", nextName: "강철검" },
  { chance: 70, penalty: "down", nextName: "합금검" },
  { chance: 65, penalty: "down", nextName: "명검" },
  { chance: 60, penalty: "down", nextName: "보검" },
  { chance: 55, penalty: "down", nextName: "마검" },
  { chance: 50, penalty: "down", nextName: "불꽃 마검" },
  { chance: 45, penalty: "down", nextName: "빙결 마검" },
  { chance: 40, penalty: "down", nextName: "암흑 마검" },
  { chance: 35, penalty: "down", nextName: "빛의 보검" },
  { chance: 30, penalty: "down", nextName: "전설의 검" },
  { chance: 25, penalty: "down", nextName: "절대자의 검" },
  { chance: 20, penalty: "down", nextName: "신의 검" },
  { chance: 15, penalty: "down", nextName: "다색검" },
];

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
  activeScreen: "menu",
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

const swordState = {
  gold: 1000,
  level: 0,
  best: Math.min(MAX_SWORD_LEVEL, Number(localStorage.getItem("swordBestLevel") || 0)),
};

bestScoreEl.textContent = state.bestScore;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function showScreen(screenName) {
  state.activeScreen = screenName;
  menuScreen.classList.toggle("hidden", screenName !== "menu");
  runnerScreen.classList.toggle("hidden", screenName !== "runner");
  swordScreen.classList.toggle("hidden", screenName !== "sword");
}

function showMenu() {
  stopRunnerGame();
  showScreen("menu");
}

function openRunner() {
  showScreen("runner");
  showStartScreen();
  updateHud();
}

function openSword() {
  stopRunnerGame();
  showScreen("sword");
  updateSwordHud();
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

function stopRunnerGame() {
  state.running = false;
  state.gameOver = false;
  clearTimers();
  clearEntities();
  resetPlayer();
  removeOverlayButton();
  statusBadge.classList.add("hidden");
  game.classList.remove("night");
  game.classList.add("day");
  sunMoon.textContent = "☀️";
}

function startGame() {
  if (state.activeScreen !== "runner") return;

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
  }, JUMP_TIME);
  state.timers.push(timer);
}

function slide() {
  if (!state.running || state.sliding || state.jumping) return;

  state.sliding = true;
  player.classList.add("sliding");
  const timer = setTimeout(() => {
    state.sliding = false;
    player.classList.remove("sliding");
  }, SLIDE_TIME);
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
  if (!state.running || state.activeScreen !== "runner") return;

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

function swordChance() {
  if (swordState.level >= MAX_SWORD_LEVEL) return 100;
  return swordGrades[swordState.level].chance;
}

function swordCost() {
  return 100 + swordState.level * 55;
}

function swordSellValue() {
  if (swordState.level === 0) return 0;
  return 120 + swordState.level * 140 + swordState.level * swordState.level * 35;
}

function updateSwordHud() {
  const chance = swordChance();
  const cost = swordCost();
  const nextName = swordState.level >= MAX_SWORD_LEVEL
    ? "다색검 (+20)"
    : swordGrades[swordState.level].nextName;

  swordGoldEl.textContent = swordState.gold;
  swordLevelEl.textContent = `+${swordState.level}`;
  swordBestEl.textContent = `+${swordState.best}`;
  swordChanceEl.textContent = swordState.level >= MAX_SWORD_LEVEL ? "MAX" : `${chance}%`;
  enhanceSword.textContent = swordState.level >= MAX_SWORD_LEVEL ? "최종 강화 완료" : `${nextName} 강화 (${cost}G)`;
  sellSword.textContent = `검 팔기 (+${swordSellValue()}G)`;
  enhanceSword.disabled = swordState.level >= MAX_SWORD_LEVEL || swordState.gold < cost;
  sellSword.disabled = swordState.level === 0;
  swordVisual.style.transform = `scale(${1 + swordState.level * 0.035}) rotate(${swordState.level % 2 === 0 ? -4 : 4}deg)`;
}

function enhanceSwordGame() {
  if (swordState.level >= MAX_SWORD_LEVEL) {
    swordMessage.textContent = "이미 최종 레벨 +20에 도달했습니다";
    updateSwordHud();
    return;
  }

  const cost = swordCost();
  if (swordState.gold < cost) {
    swordMessage.textContent = "골드가 부족합니다";
    updateSwordHud();
    return;
  }

  swordState.gold -= cost;
  const chance = swordChance();
  const success = Math.random() * 100 < chance;

  if (success) {
    swordState.level = Math.min(MAX_SWORD_LEVEL, swordState.level + 1);
    const currentName = swordState.level >= MAX_SWORD_LEVEL
      ? "다색검"
      : swordGrades[swordState.level - 1].nextName;
    swordMessage.textContent = `강화 성공! ${currentName} +${swordState.level}이 되었습니다`;
    swordVisual.classList.remove("fail");
    swordVisual.classList.add("success");
  } else {
    const grade = swordGrades[swordState.level];
    if (grade.penalty === "down") {
      swordState.level = Math.max(0, swordState.level - 1);
      swordMessage.textContent = `강화 실패... 강화도가 +${swordState.level}로 하락했습니다`;
    } else {
      swordMessage.textContent = "강화 실패... 강화도는 유지됩니다";
    }
    swordVisual.classList.remove("success");
    swordVisual.classList.add("fail");
  }

  if (swordState.level > swordState.best) {
    swordState.best = swordState.level;
    localStorage.setItem("swordBestLevel", String(swordState.best));
  }

  setTimeout(() => swordVisual.classList.remove("success", "fail"), 350);
  updateSwordHud();
}

function sellSwordGame() {
  const value = swordSellValue();
  if (value <= 0) {
    swordMessage.textContent = "판매할 강화 검이 없습니다";
    updateSwordHud();
    return;
  }

  swordState.gold += value;
  swordMessage.textContent = `+${swordState.level} 검을 팔아 ${value}G를 얻었습니다`;
  swordState.level = 0;
  swordVisual.classList.remove("success", "fail");
  updateSwordHud();
}

function resetSwordGame() {
  swordState.gold = 1000;
  swordState.level = 0;
  swordMessage.textContent = "강화 버튼을 눌러 검을 성장시키세요";
  swordVisual.classList.remove("success", "fail");
  updateSwordHud();
}

document.addEventListener("keydown", (event) => {
  if (state.activeScreen !== "runner") return;

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

openRunnerGame.addEventListener("click", openRunner);
openSwordGame.addEventListener("click", openSword);
backButtons.forEach((button) => button.addEventListener("click", showMenu));
enhanceSword.addEventListener("click", enhanceSwordGame);
sellSword.addEventListener("click", sellSwordGame);
resetSword.addEventListener("click", resetSwordGame);

showScreen("menu");
updateHud();
updateSwordHud();
