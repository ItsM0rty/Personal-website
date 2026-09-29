const COLS = 24;
const ROWS = 14;
const KEY = "pixel-transition";
const VALUE = "arriving";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function readFlag() {
  try {
    return sessionStorage.getItem(KEY) === VALUE;
  } catch {
    return false;
  }
}

function clearFlag() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

function setFlag() {
  try {
    sessionStorage.setItem(KEY, VALUE);
  } catch {}
}

function buildGrid(grid) {
  grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < COLS * ROWS; index += 1) {
    const cell = document.createElement("div");
    cell.className = "load_grid-item";
    fragment.appendChild(cell);
  }
  grid.replaceChildren(fragment);
  return grid.querySelectorAll(".load_grid-item");
}

function isNavbarLink(anchor) {
  if (!anchor.closest(".nav") || anchor.hasAttribute("data-no-pixel-transition")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  try {
    return new URL(href, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function initPixelTransition(onReady) {
  const grid = document.querySelector(".load_grid");
  const arriving = readFlag();
  clearFlag();

  if (!grid || reducedMotion() || typeof gsap === "undefined") {
    document.documentElement.classList.remove("is-pixel-covered");
    if (grid) grid.style.display = "none";
    return false;
  }

  const items = buildGrid(grid);
  if (arriving) {
    gsap.set(items, { opacity: 1 });
    gsap.set(grid, { display: "grid", backgroundColor: "transparent" });
    gsap.to(items, {
      opacity: 0,
      duration: 0.001,
      stagger: { amount: 0.5, from: "random" },
      onComplete: () => {
        gsap.set(grid, { display: "none" });
        document.documentElement.classList.remove("is-pixel-covered");
        onReady();
      },
    });
  } else {
    document.documentElement.classList.remove("is-pixel-covered");
    gsap.set(grid, { display: "none" });
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a");
    if (!anchor || !isNavbarLink(anchor) || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setFlag();
    gsap.set(grid, { display: "grid" });
    gsap.fromTo(items, { opacity: 0 }, {
      opacity: 1,
      duration: 0.001,
      stagger: { amount: 0.5, from: "random" },
      onComplete: () => window.location.assign(anchor.href),
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    clearFlag();
    document.documentElement.classList.remove("is-pixel-covered", "is-quick-arrival");
    gsap.killTweensOf(items);
    gsap.set(grid, { display: "none" });
  });
  return arriving;
}
