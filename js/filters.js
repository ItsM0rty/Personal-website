function prefersReducedMotion() {

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;

}



function categories(card) {

  return (card.dataset.category || "").trim().split(/\s+/).filter(Boolean);

}



function matches(card, filter) {

  return filter === "all" || categories(card).includes(filter);

}



export function initFilters() {

  const filtersEl = document.querySelector(".filters");

  const grid = document.querySelector(".project-grid");

  if (!filtersEl || !grid) return;



  const buttons = [...filtersEl.querySelectorAll(".filter")];

  const cards = [...grid.querySelectorAll(".project-card")];

  let timeline;



  function updateCounts() {

    buttons.forEach((button) => {

      const count = button.dataset.filter === "all"

        ? cards.length

        : cards.filter((card) => categories(card).includes(button.dataset.filter)).length;

      const countEl = button.querySelector(".filter__count");

      if (countEl) countEl.textContent = String(count);

    });

  }



  function updateUrl(filter) {

    const url = new URL(window.location.href);

    if (filter === "all") url.searchParams.delete("filter");

    else url.searchParams.set("filter", filter);

    history.replaceState(null, "", url);

  }



  function setActive(filter) {

    buttons.forEach((button) => {

      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));

    });

  }



  function setVisibility(filter) {

    cards.forEach((card) => {

      card.classList.toggle("is-filtered-out", !matches(card, filter));

      gsap.set(card, { clearProps: "opacity" });

    });

  }



  function reset() {

    if (timeline) timeline.kill();

    gsap.killTweensOf(cards);

    gsap.set(cards, { clearProps: "opacity" });

  }



  function applyFilter(filter, animate = true) {

    reset();

    setActive(filter);

    updateUrl(filter);



    const leaving = cards.filter((card) => !matches(card, filter) && !card.classList.contains("is-filtered-out"));

    const entering = cards.filter((card) => matches(card, filter) && card.classList.contains("is-filtered-out"));



    if (!animate || prefersReducedMotion()) {

      setVisibility(filter);

      return;

    }



    timeline = gsap.timeline({

      onComplete: () => {

        cards.forEach((card) => {

          if (matches(card, filter)) gsap.set(card, { opacity: 1, clearProps: "opacity" });

        });

      },

    });



    if (leaving.length) {

      timeline.to(leaving, { opacity: 0, duration: 0.18, ease: "power2.in" });

    }



    timeline.call(() => {

      leaving.forEach((card) => card.classList.add("is-filtered-out"));

      entering.forEach((card) => card.classList.remove("is-filtered-out"));

      gsap.set(leaving, { clearProps: "opacity" });

      if (entering.length) {

        gsap.set(entering, { opacity: 0 });

      }

    });



    if (entering.length) {

      timeline.to(entering, {

        opacity: 1,

        duration: 0.25,

        ease: "power2.out",

        stagger: 0.02,

        clearProps: "opacity",

      });

    }

  }



  updateCounts();

  const validFilters = new Set(buttons.map((button) => button.dataset.filter));

  const queryFilter = new URLSearchParams(window.location.search).get("filter");

  const initial = validFilters.has(queryFilter) ? queryFilter : "all";

  setActive(initial);

  setVisibility(initial);



  buttons.forEach((button) => {

    button.addEventListener("click", () => {

      if (button.getAttribute("aria-pressed") !== "true") applyFilter(button.dataset.filter);

    });

  });

}


