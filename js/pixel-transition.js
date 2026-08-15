const PIXEL_COLS = 24;

const PIXEL_ROWS = 14;

const PIXEL_KEY = "pixel-transition";

const PIXEL_ARRIVING = "arriving";



function prefersReducedMotion() {

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;

}



function isArriving() {

  try {

    return sessionStorage.getItem(PIXEL_KEY) === PIXEL_ARRIVING;

  } catch {

    return false;

  }

}



function clearArriving() {

  try {

    sessionStorage.removeItem(PIXEL_KEY);

  } catch {}

}



function buildPixelGrid(container) {

  container.style.gridTemplateColumns = `repeat(${PIXEL_COLS}, 1fr)`;

  container.style.gridTemplateRows = `repeat(${PIXEL_ROWS}, 1fr)`;



  const fragment = document.createDocumentFragment();

  for (let i = 0; i < PIXEL_COLS * PIXEL_ROWS; i++) {

    const cell = document.createElement("div");

    cell.className = "load_grid-item";

    fragment.appendChild(cell);

  }

  container.appendChild(fragment);



  return container.querySelectorAll(".load_grid-item");

}



function isInternalNavLink(anchor) {

  if (anchor.getAttribute("data-transition") === "expand") {

    return false;

  }

  if (anchor.hasAttribute("data-no-pixel-transition")) {

    return false;

  }



  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {

    return false;

  }

  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {

    return false;

  }



  try {

    const url = new URL(href, window.location.href);

    return url.origin === window.location.origin;

  } catch {

    return false;

  }

}



function revealPage(grid, items) {

  gsap.to(items, {

    opacity: 0,

    duration: 0.001,

    stagger: { amount: 0.5, from: "random" },

    onComplete: () => {

      gsap.set(grid, { display: "none" });

      document.documentElement.classList.remove("is-pixel-covered");

    },

  });

}



function coverPage(grid, items, destination) {

  try {

    sessionStorage.setItem(PIXEL_KEY, PIXEL_ARRIVING);

  } catch {}



  gsap.set(grid, { display: "grid" });

  gsap.fromTo(

    items,

    { opacity: 0 },

    {

      opacity: 1,

      duration: 0.001,

      stagger: { amount: 0.5, from: "random" },

      onComplete: () => {

        window.location.href = destination;

      },

    }

  );

}



export function initPixelTransition(options = {}) {

  const grid = document.querySelector(".load_grid");

  if (!grid) return;



  const arriving = isArriving() && !options.skipReveal;

  if (arriving) clearArriving();



  const items = buildPixelGrid(grid);



  if (prefersReducedMotion() || options.skipReveal || !arriving) {

    document.documentElement.classList.remove("is-pixel-covered");

    gsap.set(grid, { display: "none" });

  } else {

    gsap.set(grid, { display: "grid" });

    gsap.set(items, { opacity: 1 });

    revealPage(grid, items);

  }



  document.addEventListener("click", (event) => {

    const anchor = event.target.closest("a");

    if (!anchor || !isInternalNavLink(anchor)) return;



    event.preventDefault();

    coverPage(grid, items, anchor.href);

  });



  window.addEventListener("pageshow", (event) => {

    if (event.persisted) {

      window.location.reload();

    }

  });

}


