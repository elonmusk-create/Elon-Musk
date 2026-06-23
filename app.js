/**
 * Elon Musk RewardRush — Spin to Win
 * WhatsApp number: set in config.js (see config.example.js)
 */
// Fallback WhatsApp number if not provided in config.js
const WHATSAPP_NUMBER = window.APP_CONFIG?.WHATSAPP_NUMBER?.trim() || "15572284687";
const BRAND_NAME = "Elon Musk RewardRush";
const STORAGE_KEY = "emrr_win";

const PRIZES = [
  {
    id: "img1",
    name: "TESLA MODEL 3",
    value: "$42,500",
    image: "assets/img1.jpg",
    isRetry: false,
  },
  {
    id: "img2",
    name: "TESLA MODEL Y",
    value: "$49,990",
    image: "assets/img2.jpg",
    isRetry: false,
  },
  {
    id: "img3",
    name: "CYBERTRUCK",
    value: "$79,990",
    image: "assets/img3.jpg",
    isRetry: false,
  },
  {
    id: "img4",
    name: "$50,000 CASH",
    value: "$50,000",
    image: "assets/img4.jpg",
    isRetry: false,
  },
  {
    id: "img5",
    name: "$100,000 CASH",
    value: "$100,000",
    image: "assets/img5.jpg",
    isRetry: false,
  },
  {
    id: "retry",
    name: "TRY AGAIN",
    value: "Better luck next time",
    image: "assets/retry.png",
    isRetry: true,
  },
];

/** ~2% chance the wheel lands on Try Again */
const RETRY_CHANCE = 0.02;

const SPIN_NOW_LABEL = "SPIN NOW";
const DISCLAIMER_DEFAULT = "Free to play · No purchase required";
const DISCLAIMER_AFTER_SPIN =
  "Spin again! Elon has more Teslas to give away!";

const spinGrid = document.getElementById("spin-grid");
const btnSpin = document.getElementById("btn-spin");
const spinDisclaimer = document.getElementById("spin-disclaimer");
const btnScrollSpin = document.getElementById("btn-scroll-spin");
const modalOverlay = document.getElementById("modal-overlay");
const modalDialog = document.getElementById("modal-dialog");
const modalClose = document.getElementById("modal-close");
const modalWinView = document.getElementById("modal-win-view");
const modalRetryView = document.getElementById("modal-retry-view");
const modalCongrats = document.getElementById("modal-congrats");
const modalImg = document.getElementById("modal-img");
const modalTitle = document.getElementById("modal-title");
const modalValue = document.getElementById("modal-value");
const modalCode = document.getElementById("modal-code");
const modalCodeBlock = document.getElementById("modal-code-block");
const modalClaim = document.getElementById("modal-claim");
const modalRetryBtn = document.getElementById("modal-retry-btn");
const modalRetryWinBtn = document.getElementById("modal-retry-win-btn");
const modalSignature = document.getElementById("modal-signature");

let isSpinning = false;
let spinCells = [];
let hasSpunOnce = false;
let lastSpinWasRetry = false;
let confettiInterval = null;

function animateCounter(element, target, suffix = "") {
  let current = 0;
  const increment = target / 100;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current).toLocaleString() + suffix;
  }, 20);
}

function animateMoney(element, target) {
  let current = 0;
  const increment = target / 100;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = "$" + (current / 1000000).toFixed(1) + "M";
  }, 20);
}

window.addEventListener("load", () => {
  if (!WHATSAPP_NUMBER) {
    console.warn(
      "[RewardRush] Missing WHATSAPP_NUMBER. Copy config.example.js to config.js and set your number."
    );
  }

  const winnerCount = document.getElementById("winnerCount");
  const verifiedCount = document.getElementById("verifiedCount");
  const prizeCount = document.getElementById("prizeCount");

  if (winnerCount) animateCounter(winnerCount, 2400, "+");
  if (verifiedCount) animateCounter(verifiedCount, 100, "%");
  if (prizeCount) animateMoney(prizeCount, 4200000);

  // --- Theme: light/dark toggle and background swap ---
  const THEME_KEY = "site_theme";
  const themeToggleBtn = document.getElementById("theme-toggle");

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }

  function detectPreferredTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      if (themeToggleBtn) themeToggleBtn.setAttribute("aria-pressed", "false");
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (themeToggleBtn) themeToggleBtn.setAttribute("aria-pressed", "true");
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    // apply theme without animation (fast switch)
    applyTheme(next);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
    themeToggleBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  const initialTheme = getSavedTheme() || detectPreferredTheme();
  applyTheme(initialTheme);

  restoreSavedWin();
});

function setSpinBtnLabel(text, spinning = false) {
  btnSpin.innerHTML = `<span class="btn-icon spin-icon" aria-hidden="true">⟳</span> ${text}`;
  btnSpin.classList.toggle("is-spinning", spinning);
}

function updateSpinDisclaimer() {
  if (!spinDisclaimer) return;

  if (hasSpunOnce) {
    spinDisclaimer.textContent = DISCLAIMER_AFTER_SPIN;
    spinDisclaimer.classList.add("is-promo");
  } else {
    spinDisclaimer.textContent = DISCLAIMER_DEFAULT;
    spinDisclaimer.classList.remove("is-promo");
  }
}

function updateMainSpinButton() {
  if (isSpinning) return;

  btnSpin.disabled = false;
  setSpinBtnLabel(SPIN_NOW_LABEL);
}

function markFirstSpinComplete() {
  if (hasSpunOnce) return;
  hasSpunOnce = true;
  updateSpinDisclaimer();
}

function clearWin() {
  localStorage.removeItem(STORAGE_KEY);
}

function createPrizeCard(prize, forSpin = false) {
  const card = document.createElement("article");
  card.className = "prize-card" + (prize.isRetry ? " prize-card--retry" : "");
  card.dataset.prizeId = prize.id;

  const imgWrap = document.createElement("div");
  imgWrap.className = "prize-card__img-wrap";

  const img = document.createElement("img");
  img.src = prize.image;
  img.alt = prize.name;
  img.loading = forSpin ? "eager" : "lazy";
  img.onerror = () => {
    if (!img.dataset.fallback) {
      img.dataset.fallback = "1";
      if (/\.jpe?g$/i.test(img.src)) {
        img.src = img.src.replace(/\.jpe?g$/i, ".png");
        return;
      }
      if (/\.png$/i.test(img.src)) {
        img.src = img.src.replace(/\.png$/i, ".jpg");
        return;
      }
    }
    img.style.display = "none";
    imgWrap.style.background = prize.isRetry ? "#1a0a0a" : "#374151";
  };
  imgWrap.appendChild(img);

  const footer = document.createElement("div");
  footer.className = "prize-card__footer";

  const name = document.createElement("p");
  name.className = "prize-card__name";
  name.textContent = prize.name;
  footer.appendChild(name);

  const value = document.createElement("p");
  value.className =
    "prize-card__value" + (prize.isRetry ? " prize-card__value--retry" : "");
  value.textContent = prize.value;
  footer.appendChild(value);

  card.appendChild(imgWrap);
  card.appendChild(footer);

  return card;
}

function renderSpinGrid() {
  PRIZES.forEach((prize) => {
    const spinCard = createPrizeCard(prize, true);
    spinGrid.appendChild(spinCard);
    spinCells.push(spinCard);
  });
}

function generateClaimCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "EMRR-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildWhatsAppUrl(prize, code) {
  const text = [
    `Hi! I'd like to claim my ${BRAND_NAME} win.`,
    "",
    `Event: ${BRAND_NAME}`,
    `Prize: ${prize.name}`,
    `Value: ${prize.value}`,
    `Claim Code: ${code}`,
  ].join("\n");

  const number = WHATSAPP_NUMBER || "0";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function saveWin(prize, code) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      prizeId: prize.id,
      name: prize.name,
      value: prize.value,
      image: prize.image,
      code,
      wonAt: Date.now(),
    })
  );
}

function loadWin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getPrizeById(id) {
  return PRIZES.find((p) => p.id === id) || PRIZES[0];
}

function pickRandomPrize() {
  const retryPrize = PRIZES.find((p) => p.isRetry);
  const winnable = PRIZES.filter((p) => !p.isRetry);

  if (Math.random() < RETRY_CHANCE) {
    return retryPrize;
  }

  return winnable[Math.floor(Math.random() * winnable.length)];
}

function highlightCell(index) {
  spinCells.forEach((cell, i) => {
    cell.classList.toggle("is-active", i === index);
  });
}

function clearHighlights() {
  spinCells.forEach((cell) => {
    cell.classList.remove("is-active", "is-winner");
  });
}

function stopConfetti() {
  if (confettiInterval) {
    clearInterval(confettiInterval);
    confettiInterval = null;
  }
}

function launchConfetti() {
  if (typeof confetti !== "function") return;

  stopConfetti();

  const colors = ["#facc15", "#fde047", "#ffffff", "#ef4444", "#22c55e", "#3b82f6"];

  confetti({
    particleCount: 120,
    spread: 80,
    startVelocity: 42,
    origin: { y: 0.55 },
    colors,
    zIndex: 10001,
  });

  confetti({
    particleCount: 60,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.65 },
    colors,
    zIndex: 10001,
  });

  confetti({
    particleCount: 60,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.65 },
    colors,
    zIndex: 10001,
  });

  const duration = 2800;
  const end = Date.now() + duration;

  confettiInterval = setInterval(() => {
    if (Date.now() >= end) {
      stopConfetti();
      return;
    }

    confetti({
      particleCount: 18,
      startVelocity: 26,
      spread: 100,
      ticks: 80,
      origin: {
        x: Math.random() * 0.6 + 0.2,
        y: Math.random() * 0.35 + 0.15,
      },
      colors,
      zIndex: 10001,
    });
  }, 220);
}

function resetSpinBoard() {
  clearHighlights();
  lastSpinWasRetry = false;
}

function closeModalOnly() {
  modalOverlay.hidden = true;
  document.body.style.overflow = "";
  stopConfetti();
  modalDialog?.classList.remove("modal--retry");
  if (modalRetryView) modalRetryView.hidden = true;
  if (modalWinView) modalWinView.hidden = false;
}

function restartSpinFromModal() {
  clearWin();
  resetSpinBoard();
  closeModalOnly();

  document.getElementById("spin-section")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  setTimeout(() => {
    if (!isSpinning) handleSpin();
  }, 400);
}

function openModalOverlay() {
  modalOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function showRetryModal() {
  lastSpinWasRetry = true;
  stopConfetti();

  modalDialog?.classList.add("modal--retry");
  modalWinView.hidden = true;
  modalRetryView.hidden = false;

  if (modalTitle) modalTitle.id = "modal-retry-heading";

  openModalOverlay();
}

function showWinModal(prize, code, { withConfetti = false } = {}) {
  lastSpinWasRetry = false;

  modalDialog?.classList.remove("modal--retry");
  modalRetryView.hidden = true;
  modalWinView.hidden = false;

  if (modalTitle) modalTitle.id = "modal-title";

  modalImg.src = prize.image;
  modalImg.alt = prize.name;
  modalTitle.textContent = prize.name;
  modalValue.textContent = prize.value;
  modalCode.textContent = code;
  modalClaim.href = buildWhatsAppUrl(prize, code);

  openModalOverlay();

  if (withConfetti) {
    requestAnimationFrame(() => {
      setTimeout(launchConfetti, 80);
    });
  }
}

function showModal(prize, code, options = {}) {
  if (prize.isRetry) {
    showRetryModal();
  } else {
    showWinModal(prize, code, options);
  }
}

function hideModal({ keepSpinBoard = false } = {}) {
  const wasRetry = lastSpinWasRetry;

  closeModalOnly();

  if (!keepSpinBoard && wasRetry && !loadWin()) {
    resetSpinBoard();
  }

  updateMainSpinButton();
  updateSpinDisclaimer();
}

function restoreSavedWin() {
  const saved = loadWin();
  if (!saved) return;

  const prize = getPrizeById(saved.prizeId);
  const idx = PRIZES.findIndex((p) => p.id === saved.prizeId);
  if (idx >= 0) spinCells[idx]?.classList.add("is-winner");

  hasSpunOnce = true;
  updateSpinDisclaimer();
  updateMainSpinButton();
  showModal(
    { ...prize, image: saved.image || prize.image },
    saved.code,
    { withConfetti: false }
  );
}

function runSpinAnimation(targetIndex) {
  return new Promise((resolve) => {
    const totalSteps = 28 + targetIndex;
    let step = 0;
    let speed = 55;

    function tick() {
      highlightCell(step % PRIZES.length);
      step++;

      if (step >= totalSteps) {
        highlightCell(targetIndex);
        spinCells[targetIndex]?.classList.add("is-winner");
        setTimeout(resolve, 400);
        return;
      }

      if (step > totalSteps - 8) speed += 18;
      setTimeout(tick, speed);
    }

    tick();
  });
}

async function handleSpin() {
  if (isSpinning) return;

  if (modalOverlay && !modalOverlay.hidden) {
    closeModalOnly();
  }

  if (loadWin()) {
    clearWin();
    resetSpinBoard();
  } else if (lastSpinWasRetry) {
    resetSpinBoard();
  }

  isSpinning = true;
  btnSpin.disabled = true;
  setSpinBtnLabel("Arrow is turning…", true);
  clearHighlights();

  const winner = pickRandomPrize();
  const targetIndex = PRIZES.findIndex((p) => p.id === winner.id);
  const code = winner.isRetry ? null : generateClaimCode();

  await runSpinAnimation(targetIndex);

  markFirstSpinComplete();
  btnSpin.classList.remove("is-spinning");
  isSpinning = false;

  if (winner.isRetry) {
    showModal(winner, null);
    updateMainSpinButton();
    return;
  }

  saveWin(winner, code);
  showModal(winner, code, { withConfetti: true });
  updateMainSpinButton();
}

function init() {
  renderSpinGrid();
  setSpinBtnLabel(SPIN_NOW_LABEL);
  btnSpin.disabled = false;

  btnSpin?.addEventListener("click", handleSpin);

  btnScrollSpin?.addEventListener("click", () => {
    document.getElementById("spin-section")?.scrollIntoView({ behavior: "smooth" });
  });

  modalClose?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideModal();
  });

  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) hideModal();
  });

  modalRetryBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    restartSpinFromModal();
  });

  modalRetryWinBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    restartSpinFromModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay && !modalOverlay.hidden) hideModal();
  });
}

init();
