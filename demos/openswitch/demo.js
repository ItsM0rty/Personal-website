import init, { run_openswitch_simulation } from "./pkg/openswitch_wasm.js";

const providerDefs = [
  { id: "alpha", latency: 145, error: 12, cost: 1.8 },
  { id: "beta", latency: 210, error: 4, cost: 0.9 },
  { id: "gamma", latency: 95, error: 18, cost: 2.3 },
  { id: "delta", latency: 275, error: 2, cost: 0.6 },
];
const root = document.getElementById("providers");
const status = document.getElementById("status");

function renderProviders() {
  root.innerHTML = providerDefs.map((provider) => `
    <article class="provider-card">
      <div class="provider-card__head"><span>${provider.id}</span><span>$${provider.cost}/1k</span></div>
      <div class="field"><label for="${provider.id}-latency">Mean latency</label><input id="${provider.id}-latency" type="range" min="40" max="400" step="5" value="${provider.latency}"><output>${provider.latency} ms</output></div>
      <div class="field"><label for="${provider.id}-error">Error rate</label><input id="${provider.id}-error" type="range" min="0" max="40" step="1" value="${provider.error}"><output>${provider.error}%</output></div>
    </article>`).join("");
  root.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => {
    const output = input.parentElement.querySelector("output");
    output.textContent = input.id.endsWith("latency") ? `${input.value} ms` : `${input.value}%`;
  }));
}

function providers() {
  return providerDefs.map((provider) => ({
    id: provider.id,
    group: provider.id === "delta" ? "fallback" : "general",
    weight: 1,
    mean_latency_ms: Number(document.getElementById(`${provider.id}-latency`).value),
    latency_jitter_ms: 25,
    error_rate: Number(document.getElementById(`${provider.id}-error`).value) / 100,
    cost_per_1k: provider.cost,
  }));
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function providerEntries(perProvider) {
  if (perProvider instanceof Map) return [...perProvider.entries()];
  return Object.entries(perProvider ?? {});
}

function render(result) {
  document.getElementById("stats").innerHTML = [
    ["Success", `${(result.success_rate * 100).toFixed(1)}%`],
    ["p50", `${result.p50_latency_ms} ms`],
    ["p95", `${result.p95_latency_ms} ms`],
    ["p99", `${result.p99_latency_ms} ms`],
    ["Hedges", result.hedges_fired],
    ["Tail saved", `${result.hedge_tail_saved_ms} ms`],
  ].map(([label, value]) => `<div class="stat-card"><p>${value}</p><span>${label}</span></div>`).join("");
  const max = Math.max(...result.histogram, 1);
  document.getElementById("histogram").innerHTML = result.histogram.map((count, index) =>
    `<div class="histogram__bar"><i style="height:${Math.max(5, count / max * 100)}%"></i><span>${index * 100}+</span></div>`).join("");
  document.getElementById("share").innerHTML = providerEntries(result.per_provider).map(([id, row]) =>
    `<li><span>${id}</span><span>${row.count} requests, ${row.ewma_latency_ms} ms EWMA</span><b class="state state--${row.breaker}">${row.breaker}</b></li>`).join("");
  const isBreakerTrace = (line) => line.includes("breaker") || line.includes("half-open");
  const lifecycle = result.traces.filter(isBreakerTrace).slice(-10);
  const decisions = result.traces.filter((line) => !isBreakerTrace(line)).slice(-40);
  document.getElementById("log").innerHTML = [...lifecycle, ...decisions].map((line) => `<p>${escapeHtml(line)}</p>`).join("") || "<p>No decisions recorded.</p>";
}

async function run() {
  const button = document.getElementById("run");
  button.disabled = true;
  status.textContent = "Running 200 simulated requests.";
  try {
    const result = run_openswitch_simulation({
      providers: providers(),
      strategy: document.getElementById("strategy").value,
      request_count: 200,
      seed: 98127,
      ewma_alpha: 0.28,
      cost_latency_budget_ms: 180,
      hedging_enabled: document.getElementById("hedging").checked,
      breaker_enabled: document.getElementById("breaker").checked,
      hedge_delay_ms: 140,
      failure_threshold: 3,
      probe_limit: 1,
      reset_after_requests: 8,
      key_budget: 200,
    });
    render(result);
    status.textContent = `${result.total} requests completed.`;
  } catch (error) {
    status.textContent = `Simulation error: ${error}`;
  } finally {
    button.disabled = false;
  }
}

renderProviders();
document.getElementById("run").addEventListener("click", run);
init().then(() => {
  status.textContent = "Ready.";
  run();
}).catch((error) => { status.textContent = `Could not load WebAssembly: ${error}`; });
