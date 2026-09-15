const DESKTOP_QUERY = "(min-width: 861px)";
const mql = matchMedia(DESKTOP_QUERY);

// ═══ Диафильм: слайд-навигация (только десктоп) ═══════════════════════════

const track = document.querySelector(".slides-track");
const slides = track ? Array.from(track.children) : [];
const dots = Array.from(document.querySelectorAll(".slide-dot"));
const prevBtns = Array.from(document.querySelectorAll("[data-slide-prev]"));
const nextBtns = Array.from(document.querySelectorAll("[data-slide-next]"));
const gotoEls = Array.from(document.querySelectorAll("[data-slide-goto]"));
const counterEl = document.querySelector("[data-slide-counter-current]");

let current = 0;
let animating = false;
const TRANSITION_MS = 650;
const WHEEL_COOLDOWN_MS = 750;
let wheelLocked = false;

function isDesktop() {
  return mql.matches;
}

function pad(n) {
  return String(n + 1).padStart(2, "0");
}

function updateUI() {
  dots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === current);
  });
  if (counterEl) counterEl.textContent = pad(current);
  prevBtns.forEach((btn) => (btn.disabled = current === 0));
  nextBtns.forEach((btn) => (btn.disabled = current === slides.length - 1));
}

function goToSlide(index) {
  if (!isDesktop() || !track || !slides.length) return;
  const clamped = Math.max(0, Math.min(slides.length - 1, index));
  if (clamped === current && track.style.transform) return;
  if (animating) return;
  animating = true;
  current = clamped;
  track.style.transform = `translateY(-${current * 100}%)`;
  updateUI();
  setTimeout(() => {
    animating = false;
  }, TRANSITION_MS);
}

function next() {
  goToSlide(current + 1);
}

function prev() {
  goToSlide(current - 1);
}

// ── Клики ───────────────────────────────────────────────────────────────

gotoEls.forEach((el) => {
  el.addEventListener("click", (e) => {
    const idx = Number(el.dataset.slideGoto);
    if (isDesktop()) {
      e.preventDefault();
      goToSlide(idx);
    } else if (el.tagName === "BUTTON") {
      // На мобильном ссылки (<a href="#...">) прыгают сами, а вот кнопки (без href) нужно доскроллить вручную
      e.preventDefault();
      slides[idx]?.scrollIntoView({ behavior: "smooth" });
    }
  });
});

nextBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    if (isDesktop()) {
      next();
    } else {
      window.scrollBy({ top: window.innerHeight * 0.9, behavior: "smooth" });
    }
  })
);
prevBtns.forEach((btn) => btn.addEventListener("click", () => isDesktop() && prev()));

// ── Колесо мыши: скроллим содержимое слайда, а на границе — листаем ──────

const viewport = document.querySelector(".slides-viewport");

if (viewport) {
  viewport.addEventListener(
    "wheel",
    (e) => {
      if (!isDesktop() || !slides.length) return;
      const activeSlide = slides[current];
      const atTop = activeSlide.scrollTop <= 1;
      const atBottom =
        activeSlide.scrollTop + activeSlide.clientHeight >= activeSlide.scrollHeight - 2;

      if (e.deltaY > 0 && atBottom && current < slides.length - 1) {
        e.preventDefault();
        if (!wheelLocked) {
          wheelLocked = true;
          next();
          setTimeout(() => (wheelLocked = false), WHEEL_COOLDOWN_MS);
        }
      } else if (e.deltaY < 0 && atTop && current > 0) {
        e.preventDefault();
        if (!wheelLocked) {
          wheelLocked = true;
          prev();
          setTimeout(() => (wheelLocked = false), WHEEL_COOLDOWN_MS);
        }
      }
      // иначе — отдаём событие браузеру, пусть скроллит содержимое слайда как обычно
    },
    { passive: false }
  );
}

// ── Клавиатура ─────────────────────────────────────────────────────────

window.addEventListener("keydown", (e) => {
  if (!isDesktop()) return;
  if (document.body.classList.contains("game-open")) return; // мини-игра поверх — слайды не листаем
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.key === "ArrowDown" || e.key === "PageDown") {
    e.preventDefault();
    next();
  } else if (e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault();
    prev();
  }
});

// ── Реакция на смену брейкпоинта ──────────────────────────────────────

function handleBreakpointChange() {
  if (!track) return;
  if (isDesktop()) {
    current = 0;
    animating = false;
    track.style.transform = "translateY(0)";
    updateUI();
  } else {
    track.style.transform = "";
  }
}

mql.addEventListener("change", handleBreakpointChange);
handleBreakpointChange();

// ═══ Плавное появление секций при скролле (только мобильный режим) ═══════

if (!isDesktop()) {
  const revealTargets = document.querySelectorAll(".section, .hero-inner");
  revealTargets.forEach((el) => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealTargets.forEach((el) => observer.observe(el));
}

// ═══ Подсветка активного пункта навигации при скролле (мобильный режим) ══
// На десктопе активный пункт ставит goToSlide(); на мобильном слайдов как
// состояния нет (обычный скролл), поэтому следим сами через видимость секций.

if (!isDesktop() && dots.length && slides.length) {
  const mobileNextBtn = document.querySelector(".mobile-next-btn");
  // el → доля видимости. Два соседних раздела часто видны одновременно
  // (один уходит, другой приходит) — раньше побеждал тот, чья запись в
  // entries шла последней, что могло быть не тем разделом, который реально
  // виднее. Теперь берём среди всех пересекающихся тот, у кого ratio больше.
  const visibleRatios = new Map();

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleRatios.set(entry.target, entry.intersectionRatio);
        } else {
          visibleRatios.delete(entry.target);
        }
      });
      if (!visibleRatios.size) return;

      let bestEl = null;
      let bestRatio = -1;
      visibleRatios.forEach((ratio, el) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestEl = el;
        }
      });
      const idx = slides.indexOf(bestEl);
      if (idx === -1) return;
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === idx));
      // На последнем разделе больше некуда листать — прячем стрелку вниз
      mobileNextBtn?.classList.toggle("is-hidden", idx === slides.length - 1);
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] }
  );
  slides.forEach((slide) => navObserver.observe(slide));
}

// ═══ Анимированные картинки, которые «оживают» только при наведении ══════
// <img> не умеет play/pause — поэтому реально подменяем src: наведение
// ставит анимацию, уход курсора возвращает статичный кадр (без него анимация
// в фоне не проигрывается вовсе, не просто прячется под opacity).

document.querySelectorAll("[data-hover-src]").forEach((img) => {
  const defaultSrc = img.getAttribute("src");
  const hoverSrc = img.dataset.hoverSrc;
  const card = img.closest(".infra-card") || img.parentElement;
  if (!card) return;

  card.addEventListener("mouseenter", () => {
    img.src = hoverSrc;
  });
  card.addEventListener("mouseleave", () => {
    img.src = defaultSrc;
  });
});

// ═══ Обратный отсчёт до релиза на кнопках инфраструктуры ══════════════════
// Пока не наступила дата из data-release, кнопка вместо ссылки показывает
// таймер и не кликается; как только время истекло — возвращается обычной
// кликабельной кнопкой с исходным текстом (без перезагрузки страницы).

const countdownBtns = Array.from(document.querySelectorAll("[data-release]")).map((el) => ({
  el,
  releaseTime: new Date(el.dataset.release).getTime(),
  originalText: el.textContent,
  originalHref: el.getAttribute("href"),
}));

function pad2(n) {
  return String(n).padStart(2, "0");
}

function tickCountdowns() {
  const now = Date.now();
  let stillCounting = false;

  countdownBtns.forEach((btn) => {
    const diff = btn.releaseTime - now;

    if (diff <= 0) {
      if (btn.el.classList.contains("is-countdown")) {
        btn.el.classList.remove("is-countdown");
        btn.el.textContent = btn.originalText;
        btn.el.setAttribute("href", btn.originalHref);
      }
      return;
    }

    stillCounting = true;
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const clock = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

    btn.el.classList.add("is-countdown");
    btn.el.removeAttribute("href");
    btn.el.textContent = days > 0 ? `До выхода: ${days}д ${clock}` : `До выхода: ${clock}`;
  });

  if (!stillCounting) clearInterval(countdownInterval);
}

let countdownInterval;
if (countdownBtns.length) {
  tickCountdowns();
  countdownInterval = setInterval(tickCountdowns, 1000);
}
