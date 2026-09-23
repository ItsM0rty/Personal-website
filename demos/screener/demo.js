import init, { ScreenerEngine } from "./pkg/screener_wasm.js";

const byId = (id) => document.getElementById(id);
const search = byId("search");
const searchShell = byId("search-shell");
const suggestions = byId("suggestions");
const results = byId("results");
const status = byId("status");
const latency = byId("latency");
const categoryFacets = byId("category-facets");
const monthFacets = byId("month-facets");
const selectedCategories = new Set();
const selectedMonths = new Set();
const examples = ["transformer attention mechanism", "reinforcement learning policy", "neural machine translation", "informtion retrieval ranking"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let engine;
let mode = "hybrid";
let timer;
let resultTween;
let suggestionTween;
let pulseTween;

function text(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function marked(value) { return text(value).replaceAll("&lt;&lt;", "<mark>").replaceAll("&gt;&gt;", "</mark>"); }
function ratio() { return Number(byId("ratio").value) / 100; }

function updateClearButton() {
  byId("search-clear").hidden = !search.value.length;
}

function hideSuggestions(animate = true) {
  if (suggestions.hidden) return;
  if (suggestionTween) suggestionTween.kill();
  if (!animate || reducedMotion) {
    suggestions.hidden = true;
    suggestions.innerHTML = "";
    return;
  }
  suggestionTween = gsap.to(suggestions, {
    opacity: 0,
    y: -6,
    duration: 0.15,
    ease: "power2.in",
    onComplete: () => {
      suggestions.hidden = true;
      suggestions.innerHTML = "";
      gsap.set(suggestions, { clearProps: "opacity,y" });
    },
  });
}

function showSuggestions(value) {
  if (!value) {
    hideSuggestions();
    return;
  }
  suggestions.innerHTML = `<p class="screener-suggestions-label">Did you mean</p><button type="button" class="screener-suggestion-item" role="option">${text(value)}</button>`;
  suggestions.hidden = false;
  suggestions.querySelector(".screener-suggestion-item").addEventListener("click", (event) => {
    applySuggestion(value, event.currentTarget);
  });
  if (suggestionTween) suggestionTween.kill();
  if (reducedMotion) return;
  gsap.fromTo(suggestions, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" });
}

function pulseSearchShell() {
  if (pulseTween) pulseTween.kill();
  if (reducedMotion) return;
  searchShell.classList.add("is-pulse");
  pulseTween = gsap.delayedCall(0.45, () => searchShell.classList.remove("is-pulse"));
}

function animateResults() {
  if (resultTween) resultTween.kill();
  const items = results.querySelectorAll(".screener-result");
  if (!items.length || reducedMotion) return;
  resultTween = gsap.from(items, {
    opacity: 0,
    y: 10,
    duration: 0.32,
    stagger: 0.035,
    ease: "power2.out",
  });
}

function applySuggestion(value, source) {
  if (reducedMotion) {
    search.value = value;
    hideSuggestions(false);
    updateClearButton();
    searchNow();
    return;
  }
  if (suggestionTween) suggestionTween.kill();
  const sourceRect = source.getBoundingClientRect();
  const inputRect = search.getBoundingClientRect();
  const ghost = document.createElement("span");
  ghost.className = "screener-suggestion-ghost";
  ghost.textContent = value;
  document.body.appendChild(ghost);
  gsap.set(ghost, {
    left: sourceRect.left,
    top: sourceRect.top + (sourceRect.height - ghost.offsetHeight) / 2,
    opacity: 1,
  });
  suggestionTween = gsap.timeline({
    onComplete: () => {
      ghost.remove();
      search.value = value;
      updateClearButton();
      hideSuggestions();
      searchNow();
    },
  });
  suggestionTween
    .to(suggestions, { opacity: 0, y: -6, duration: 0.15, ease: "power2.in" }, 0)
    .to(ghost, {
      left: inputRect.left + 16,
      top: inputRect.top + (inputRect.height - ghost.offsetHeight) / 2,
      opacity: 0,
      duration: 0.28,
      ease: "power2.inOut",
    }, 0)
    .add(pulseSearchShell, 0.18);
}

function searchNow() {
  if (!engine || !search.value.trim()) return;
  const start = performance.now();
  const raw = engine.query(search.value.trim(), mode, 10, ratio(), byId("fusion").value, `${[...selectedCategories].join(",")}|${[...selectedMonths].join(",")}`);
  const response = JSON.parse(raw);
  latency.textContent = `${(performance.now() - start).toFixed(1)} ms`;
  renderFacets(response.facets);
  showSuggestions(response.suggestion);
  results.innerHTML = response.hits.length
    ? response.hits.map((hit) => `<article class="screener-result"><h2>${text(hit.title)}</h2><p>${marked(hit.snippet)}</p><div class="screener-score"><span>${text(hit.category)} ${text(hit.published.slice(0, 7))}</span><span>score ${hit.score.toFixed(3)}</span><span>keyword ${hit.breakdown.bm25_score.toFixed(3)}</span><span>semantic ${hit.breakdown.vector_score.toFixed(3)}</span></div></article>`).join("")
    : "<p>No papers matched these filters.</p>";
  animateResults();
}

function renderFacetGroup(root, items, selected, kind) {
  root.innerHTML = items.map((item) => `<button type="button" data-kind="${kind}" data-value="${text(item.value)}" aria-pressed="${selected.has(item.value)}">${text(item.value)} (${item.count})</button>`).join("");
  root.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    const value = button.dataset.value;
    selected.has(value) ? selected.delete(value) : selected.add(value);
    searchNow();
  }));
}

function renderFacets(facets) {
  const categories = [...facets.categories].sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)).slice(0, 6);
  renderFacetGroup(categoryFacets, categories, selectedCategories, "category");
  renderFacetGroup(monthFacets, facets.months, selectedMonths, "month");
}

byId("clear-facets").addEventListener("click", (event) => {
  event.preventDefault();
  selectedCategories.clear();
  selectedMonths.clear();
  searchNow();
});
byId("chips").innerHTML = examples.map((item) => `<button type="button">${text(item)}</button>`).join("");
byId("chips").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
  search.value = button.textContent;
  updateClearButton();
  hideSuggestions(false);
  searchNow();
}));
byId("mode").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
  mode = button.dataset.mode;
  byId("mode").querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  searchNow();
}));
byId("ratio").addEventListener("input", () => {
  byId("ratio-out").textContent = `${byId("ratio").value}%`;
  searchNow();
});
byId("fusion").addEventListener("change", searchNow);
byId("search-submit").addEventListener("click", () => {
  clearTimeout(timer);
  searchNow();
});
byId("search-clear").addEventListener("click", () => {
  search.value = "";
  updateClearButton();
  hideSuggestions(false);
  results.innerHTML = "";
  latency.textContent = "";
  search.focus();
});
search.addEventListener("input", () => {
  updateClearButton();
  clearTimeout(timer);
  timer = setTimeout(searchNow, 180);
});
search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    clearTimeout(timer);
    hideSuggestions();
    searchNow();
  }
  if (event.key === "Escape") hideSuggestions();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".screener-search-shell")) hideSuggestions();
});

async function boot() {
  try {
    await init();
    const load = async (name) => {
      const response = await fetch(`./demos/screener/data/${name}`);
      if (!response.ok) throw new Error(name);
      if (name === "model.json") return response.text();
      if (!name.endsWith(".gz")) return response.arrayBuffer();
      const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).arrayBuffer();
    };
    const [index, model, weights, tokenizer] = await Promise.all(
      ["index.postcard.gz", "model.json", "model.weights.bin.gz", "tokenizer.json"].map(load)
    );
    engine = new ScreenerEngine(new Uint8Array(index), model, new Uint8Array(weights), new Uint8Array(tokenizer));
    status.textContent = "Ready";
    search.value = examples[0];
    updateClearButton();
    searchNow();
  } catch (error) {
    status.textContent = "Could not load the search assets.";
    console.error(error);
  }
}
boot();
