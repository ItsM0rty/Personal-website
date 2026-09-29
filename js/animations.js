import { initCaseTransition } from "./case-transition.js";
import { initPixelTransition } from "./pixel-transition.js";
import { initFilters } from "./filters.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let started = false;

function markCurrentNav() {
  const file = (window.location.pathname.split("/").pop() || "index").replace(".html", "");
  const current = file.startsWith("work") ? "work" : file;
  document.querySelectorAll(".nav__links a").forEach((link) => {
    if (link.getAttribute("href").replace(".html", "") === current) link.setAttribute("aria-current", "page");
  });
}

function addCaseBackButton() {
  const hero = document.querySelector(".case-hero");
  const file = window.location.pathname.split("/").pop() || "";
  if (!hero || !file.startsWith("work-") || hero.querySelector(".case-back")) return;
  const back = document.createElement("a");
  back.className = "case-back";
  back.href = "work.html";
  back.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.75 3.5 5.25 8l4.5 4.5M5.5 8h6.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg><span>All work</span>';
  hero.prepend(back);
}

function animateHero() {
  const items = document.querySelectorAll("[data-hero-item]");
  if (!items.length) return;
  gsap.fromTo(items, { autoAlpha: 0, y: 40 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.12,
    immediateRender: true,
  });
}

function animateReveals() {
  gsap.utils.toArray("[data-reveal]").forEach((element) => {
    gsap.fromTo(element, { autoAlpha: 0, y: 32 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      immediateRender: true,
      scrollTrigger: { trigger: element, start: "top 88%", once: true },
    });
  });
}

function autoHideNav() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const hide = gsap.to(nav, { yPercent: -100, duration: 0.35, ease: "power2.out", paused: true });
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (self.direction === 1 && self.scroll() > 120) hide.play();
      else if (self.direction === -1) hide.reverse();
    },
  });
  nav.addEventListener("focusin", () => hide.reverse());
}

function signalReady() {
  window.dispatchEvent(new CustomEvent("page:ready"));
}

function startAnimations() {
  if (started) return;
  started = true;
  document.documentElement.classList.remove("js-anim");
  if (reducedMotion || typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  autoHideNav();
  animateHero();
  animateReveals();
}

window.addEventListener("page:ready", startAnimations);

document.addEventListener("DOMContentLoaded", () => {
  markCurrentNav();
  initFilters();
  addCaseBackButton();
  if (reducedMotion) {
    document.documentElement.classList.remove("js-anim", "is-pixel-covered", "is-quick-arrival");
    signalReady();
    return;
  }
  const quickArrival = initCaseTransition(signalReady);
  const pixelArrival = initPixelTransition(signalReady);
  if (!quickArrival && !pixelArrival) {
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => requestAnimationFrame(signalReady));
  }
});
