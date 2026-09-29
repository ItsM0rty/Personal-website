const KEY = "page-transition";
const VALUE = "quick";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const modifiedClick = (event) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

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

function isQuickLink(anchor) {
  if (anchor.closest(".nav") || anchor.hasAttribute("data-no-transition")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  try {
    return new URL(href, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function initCaseTransition(onReady) {
  const arriving = readFlag();
  clearFlag();

  if (arriving) {
    document.documentElement.classList.remove("is-quick-arrival");
    if (reducedMotion() || typeof gsap === "undefined") onReady();
    else {
      gsap.fromTo("main", { autoAlpha: 0, y: 8 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.2,
        ease: "power2.out",
        onComplete: onReady,
      });
    }
  } else {
    document.documentElement.classList.remove("is-quick-arrival");
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a");
    if (!anchor || !isQuickLink(anchor) || event.defaultPrevented || modifiedClick(event)) return;
    event.preventDefault();
    const destination = anchor.href;
    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      setFlag();
      window.location.assign(destination);
    };

    if (reducedMotion() || typeof gsap === "undefined") {
      navigate();
      return;
    }
    window.setTimeout(navigate, 400);
    gsap.to("main", {
      autoAlpha: 0,
      y: -8,
      duration: 0.2,
      ease: "power2.out",
      onComplete: navigate,
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    clearFlag();
    document.documentElement.classList.remove("is-quick-arrival");
    if (typeof gsap !== "undefined") gsap.set("main", { clearProps: "opacity,transform,visibility" });
  });
  return arriving;
}
