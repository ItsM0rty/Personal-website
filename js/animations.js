import { initCaseTransition, cameFromExpand } from "./case-transition.js";
import { initPixelTransition } from "./pixel-transition.js";
import { initFilters } from "./filters.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function markCurrentNav() {
  const file = (window.location.pathname.split("/").pop() || "index").replace(".html", "");
  const current = file.startsWith("work") ? "work" : file;

  document.querySelectorAll(".nav__links a").forEach((link) => {
    if (link.getAttribute("href").replace(".html", "") === current) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function animateHero() {
  const items = document.querySelectorAll("[data-hero-item]");
  if (!items.length) return;

  gsap.from(items, {
    y: 40,
    opacity: 0,
    duration: cameFromExpand() ? 0.35 : 1,
    ease: "power3.out",
    stagger: 0.12,
    delay: cameFromExpand() ? 0 : 0.35,
  });
}

function addCaseBackButton() {
  const hero = document.querySelector(".case-hero");
  const file = window.location.pathname.split("/").pop() || "";
  if (!hero || !file.startsWith("work-") || hero.querySelector(".case-back")) return;

  const back = document.createElement("a");
  back.className = "case-back";
  back.href = "work.html";
  back.setAttribute("data-no-pixel-transition", "");
  back.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.75 3.5 5.25 8l4.5 4.5M5.5 8h6.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg><span>All work</span>';
  back.addEventListener("click", (event) => {
    const referrer = document.referrer;
    const isSameOrigin = referrer && new URL(referrer).origin === window.location.origin;
    if (isSameOrigin && window.history.length > 1) {
      event.preventDefault();
      gsap.to(document.body, {
        opacity: 0,
        duration: 0.16,
        ease: "power2.out",
        onComplete: () => window.history.back(),
      });
    }
  });
  hero.prepend(back);
}

function animateReveals() {
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 32,
      opacity: 0,
      duration: 0.9,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        once: true,
      },
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
      if (self.direction === 1 && self.scroll() > 120) {
        hide.play();
      } else if (self.direction === -1) {
        hide.reverse();
      }
    },
  });

  nav.addEventListener("focusin", () => hide.reverse());
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".project-card__demo")) {
    event.stopPropagation();
  }
}, true);

document.addEventListener("DOMContentLoaded", () => {
  markCurrentNav();
  initCaseTransition();
  initPixelTransition({ skipReveal: cameFromExpand() });
  initFilters();
  addCaseBackButton();

  if (reducedMotion) return;

  gsap.registerPlugin(ScrollTrigger);
  autoHideNav();
  animateHero();
  animateReveals();
});
