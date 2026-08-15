const EXPAND_KEY = "transition";

const EXPAND_VALUE = "expand";



let arrivedFromExpand = false;



if (sessionStorage.getItem(EXPAND_KEY) === EXPAND_VALUE) {

  window.__expandArrival = true;

}



function prefersReducedMotion() {

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;

}



function isModifiedClick(event) {

  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

}



function getOverlay() {

  return document.querySelector(".expand-overlay");

}



function insetClip(rect) {

  return `inset(${rect.top}px ${window.innerWidth - rect.right}px ${window.innerHeight - rect.bottom}px ${rect.left}px round 8px)`;

}



function prefetch(anchor) {

  const href = anchor.href;

  if (!href || document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;



  const link = document.createElement("link");

  link.rel = "prefetch";

  link.href = href;

  document.head.appendChild(link);

}



export function cameFromExpand() {

  return arrivedFromExpand || window.__expandArrival === true;

}



export function initCaseTransition() {

  const overlay = getOverlay();

  if (!overlay) return;



  if (sessionStorage.getItem(EXPAND_KEY) === EXPAND_VALUE) {

    sessionStorage.removeItem(EXPAND_KEY);

    arrivedFromExpand = true;

    document.documentElement.classList.remove("is-expand-arrival");



    if (prefersReducedMotion()) {

      overlay.classList.remove("is-active");

      gsap.set(overlay, { clearProps: "clipPath" });

    } else {

      overlay.classList.add("is-active");

      gsap.set(overlay, { clipPath: "inset(0 0 0 0)" });

      gsap.to(overlay, {

        clipPath: "inset(0 0 100% 0)",

        duration: 0.22,

        ease: "power3.inOut",

        onComplete: () => {

          overlay.classList.remove("is-active");

          gsap.set(overlay, { clearProps: "clipPath" });

        },

      });

    }

  }



  document.addEventListener("pointerenter", (event) => {

    const anchor = event.target.closest('a[data-transition="expand"]');

    if (anchor) prefetch(anchor);

  }, true);



  document.addEventListener("click", (event) => {

    const anchor = event.target.closest('a[data-transition="expand"]');

    if (!anchor || isModifiedClick(event) || prefersReducedMotion()) return;



    event.preventDefault();

    const card = anchor.closest(".project-card");

    const rect = (card || anchor).getBoundingClientRect();

    const destination = anchor.href;



    gsap.killTweensOf(overlay);

    overlay.classList.add("is-active");

    gsap.set(overlay, { clipPath: insetClip(rect) });



    gsap.to(overlay, {

      clipPath: "inset(0 0 0 0 round 0)",

      duration: 0.38,

      ease: "power2.inOut",

      onComplete: () => {

        sessionStorage.setItem(EXPAND_KEY, EXPAND_VALUE);

        window.location.assign(destination);

      },

    });

  });

}


