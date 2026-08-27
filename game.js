(function () {
  const OBJ_SIZE = 76; // держим в синхроне с .game-obj в CSS
  const OBJ_HALF = OBJ_SIZE / 2;

  const trigger = document.getElementById("logoGameTrigger");
  const logoImg = trigger?.querySelector(".brand-logo");
  const overlay = document.getElementById("bugGame");
  if (!trigger || !overlay) return;

  const field = document.getElementById("gameField");
  const closeBtn = document.getElementById("gameClose");
  const rulesPanel = document.getElementById("gameRules");
  const startBtn = document.getElementById("gameStartBtn");
  const winPanel = document.getElementById("gameWin");
  const winAgainBtn = document.getElementById("gameWinAgain");
  const overPanel = document.getElementById("gameOver");
  const overAgainBtn = document.getElementById("gameOverAgain");
  const scoreVal = document.getElementById("gameScoreVal");
  const livesVal = document.getElementById("gameLivesVal");
  const overScoreVal = document.getElementById("gameOverScoreVal");

  const WIN_SCORE = 100;
  const MISS_PENALTY = 10;
  const START_LIVES = 3;

  const BUGS = [
    { emoji: "🐛" },
    { emoji: "🐛" },
    { label: "404" },
    { label: "500" },
  ];
  const FEATURES = [
    { emoji: "✅" },
    { emoji: "🧑‍🚀" },
    { label: "200 OK" },
  ];

  let score = 0;
  let lives = START_LIVES;
  let running = false;
  let hasWon = false;
  let spawnTimeout = null;
  let objId = 0;
  const liveObjects = new Map();

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function updateHud() {
    scoreVal.textContent = String(score);
    livesVal.textContent = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(START_LIVES - Math.max(0, lives));
  }

  // Сложность растёт вместе со счётом: чаще спавн, быстрее падение.
  function currentDifficulty() {
    const t = Math.min(1, score / WIN_SCORE);
    return {
      spawnMs: 1100 - t * 650, // 1100 → 450
      fallMs: 4200 - t * 2200, // 4200 → 2000
    };
  }

  function spawnObject() {
    if (!running) return;
    const { fallMs } = currentDifficulty();
    const isBug = Math.random() < 0.58;
    const data = pick(isBug ? BUGS : FEATURES);

    const el = document.createElement("div");
    const id = ++objId;
    el.className = "game-obj " + (isBug ? "is-bug" : "is-feature");
    el.dataset.id = String(id);
    if (data.emoji) {
      el.textContent = data.emoji;
    } else {
      const span = document.createElement("span");
      span.className = "game-obj-label";
      span.textContent = data.label;
      el.appendChild(span);
    }

    const leftPct = 8 + Math.random() * 84;
    el.style.left = `calc(${leftPct}% - ${OBJ_HALF}px)`;
    field.appendChild(el);

    // Принудительный reflow между начальным (top:-90px из CSS) и целевым
    // состоянием — иначе на некоторых мобильных рендерерах браузер схлопывает
    // оба изменения в один кадр, и transition не проигрывается: объект
    // мгновенно "прыгает" из-за верхнего края экрана за нижний, ни разу не
    // попав в видимую область. requestAnimationFrame одного кадра для этого
    // недостаточно надёжен; offsetHeight гарантированно фиксирует layout.
    void el.offsetHeight;
    el.style.transitionDuration = fallMs + "ms";
    el.style.top = "calc(100% + 90px)";

    const cleanup = () => {
      liveObjects.delete(id);
      // Баг долетел до низа непойманным — штраф. Фичи пропускать можно бесплатно.
      if (isBug) {
        score = Math.max(0, score - MISS_PENALTY);
        floatText(el, "−" + MISS_PENALTY, "#ff8a8a");
        updateHud();
      }
      el.remove();
    };
    const missTimer = setTimeout(cleanup, fallMs + 60);

    liveObjects.set(id, { el, isBug, missTimer });

    // pointerdown вместо click — объект движется, и к моменту "up" он часто уже
    // не под пальцем/курсором, из-за чего click не срабатывает. pointerdown бьёт мгновенно.
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      // На тач-устройствах элемент неявно получает pointer capture. Если он
      // удаляется из DOM (onHit → remove через 300мс) с активным захватом,
      // некоторые мобильные браузеры перестают доставлять pointerdown другим
      // объектам — игра выглядит "замёрзшей" после первого пойманного объекта.
      if (el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      onHit(id, isBug, el);
    });

    const { spawnMs } = currentDifficulty();
    spawnTimeout = setTimeout(spawnObject, spawnMs + Math.random() * 250);
  }

  function floatText(el, text, color) {
    const rect = el.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const f = document.createElement("span");
    f.className = "game-float";
    f.textContent = text;
    f.style.color = color;
    f.style.left = rect.left - fieldRect.left + rect.width / 2 - 14 + "px";
    f.style.top = rect.top - fieldRect.top + "px";
    field.appendChild(f);
    setTimeout(() => f.remove(), 750);
  }

  function onHit(id, isBug, el) {
    const entry = liveObjects.get(id);
    if (!entry) return; // уже поймали/пропустили
    clearTimeout(entry.missTimer);
    liveObjects.delete(id);

    if (isBug) {
      score += 10;
      floatText(el, "+10", "#8fe0a0");
    } else {
      lives -= 1;
      floatText(el, "−1 жизнь", "#ff8a8a");
    }

    el.classList.add("is-popping");
    setTimeout(() => el.remove(), 300);

    updateHud();

    if (!hasWon && score >= WIN_SCORE) {
      endGame("win");
    } else if (lives <= 0) {
      endGame("over");
    }
  }

  function clearField() {
    liveObjects.forEach(({ el, missTimer }) => {
      clearTimeout(missTimer);
      el.remove();
    });
    liveObjects.clear();
    if (spawnTimeout) clearTimeout(spawnTimeout);
    spawnTimeout = null;
  }

  function startRound() {
    score = 0;
    lives = START_LIVES;
    hasWon = false;
    running = true;
    updateHud();
    rulesPanel.hidden = true;
    winPanel.hidden = true;
    overPanel.hidden = true;
    clearField();
    spawnObject();
  }

  // «Играть ещё» после победы — продолжаем с тем же счётом и жизнями,
  // просто без повторного показа экрана ачивки (hasWon остаётся true).
  function continueRound() {
    running = true;
    winPanel.hidden = true;
    clearField();
    spawnObject();
  }

  function endGame(kind) {
    running = false;
    clearField();
    if (kind === "win") {
      hasWon = true;
      winPanel.hidden = false;
    } else {
      overScoreVal.textContent = String(score);
      overPanel.hidden = false;
    }
  }

  function openGame() {
    overlay.hidden = false;
    document.body.classList.add("game-open");
    running = false;
    hasWon = false;
    clearField();
    rulesPanel.hidden = false;
    winPanel.hidden = true;
    overPanel.hidden = true;
    score = 0;
    lives = START_LIVES;
    updateHud();
  }

  function closeGame() {
    running = false;
    clearField();
    overlay.hidden = true;
    document.body.classList.remove("game-open");
  }

  trigger.addEventListener("click", () => {
    if (!logoImg) return;
    if (logoImg.classList.contains("is-spinning")) return;
    logoImg.classList.add("is-spinning");
    logoImg.addEventListener(
      "animationend",
      () => {
        logoImg.classList.remove("is-spinning");
        openGame();
      },
      { once: true }
    );
  });

  closeBtn.addEventListener("click", closeGame);
  startBtn.addEventListener("click", startRound);
  winAgainBtn.addEventListener("click", continueRound);
  overAgainBtn.addEventListener("click", startRound);

  window.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") closeGame();
  });
})();
