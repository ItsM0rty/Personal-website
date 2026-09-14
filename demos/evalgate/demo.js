import init, {
  compare as compareReports,
  evaluate,
  render_junit as renderJunit,
  render_markdown as renderMarkdown,
} from "./pkg/evalgate_wasm.js";

const SUPPORT_SUITE = `suite:
  name: Support replies
  pass_threshold: 1
  flaky_min_rate: 0.01
  flaky_max_rate: 0.99
cases:
  - name: shipping reply
    input: { order: ORD-12345 }
    checks:
      - { kind: json_valid }
      - { kind: json_shape, value: { required: [intent, message] } }
      - { kind: includes, value: ORD-12345 }
  - name: refund wording
    input: { order: ORD-99999 }
    checks:
      - { kind: includes, value: review }`;

const SUPPORT_OUTPUTS = [
  '{"intent":"shipping","message":"ORD-12345 is in transit."}',
  "I can start a review for ORD-99999.",
];

const PRESETS = {
  support: { config: SUPPORT_SUITE, outputs: SUPPORT_OUTPUTS },
  regression: {
    config: SUPPORT_SUITE,
    outputs: [
      '{"intent":"shipping","message":"Package is moving."}',
      "I guarantee a refund.",
    ],
  },
  flaky: {
    config: `suite:
  name: Recorded reply stability
  pass_threshold: 1
  flaky_min_rate: 0.01
  flaky_max_rate: 0.99
cases:
  - name: concise answer
    checks:
      - { kind: exact, value: ok }
  - name: reference included
    checks:
      - { kind: includes, value: CASE-42 }`,
    outputs: [
      ["ok", "not yet", "ok", "ok", "try again"],
      ["CASE-42 received", "No reference", "CASE-42 queued", "No reference", "CASE-42 closed"],
    ],
  },
};

let wasmReady = false;
const config = document.getElementById("config");
const outputs = document.getElementById("outputs");
const status = document.getElementById("status");
const error = document.getElementById("error");
const results = document.getElementById("results");

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setPreset(name) {
  const item = PRESETS[name];
  config.value = item.config;
  outputs.value = JSON.stringify(item.outputs, null, 2);
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === name);
  });
  results.innerHTML = "";
  error.hidden = true;
  status.textContent = "";
}

async function getReport() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
  return JSON.parse(evaluate(config.value, outputs.value));
}

function verdict(result) {
  if (result.flaky) return "Flaky";
  return result.passed ? "Pass" : "Fail";
}

function renderChecks(checks) {
  return checks
    .map((check) => {
      const state = check.passed ? "pass" : "fail";
      const reason = check.passed ? "" : `<span class="demo-reason">${escapeHtml(check.detail)}</span>`;
      return `<div class="demo-assertion">
        <span class="demo-assertion__type">${escapeHtml(check.kind)}</span>
        <span class="demo-check demo-check--${state}">${state}</span>
        ${reason}
      </div>`;
    })
    .join("");
}

function renderRun(report) {
  const recordedOutputs = JSON.parse(outputs.value);
  const rows = report.cases
    .map((item, index) => {
      const state = item.flaky ? "flaky" : item.passed ? "pass" : "fail";
      const repeated = Array.isArray(recordedOutputs[index]);
      const passRate = repeated ? `${(item.pass_rate * 100).toFixed(0)}%` : "Single run";
      return `<tr class="is-${state}">
        <td>${escapeHtml(item.name)}</td>
        <td>${(item.score * 100).toFixed(1)}%${repeated ? '<span class="demo-reason">last run</span>' : ""}</td>
        <td><span class="demo-badge demo-badge--${state}">${verdict(item)}</span></td>
        <td>${passRate}</td>
        <td><div class="demo-assertions">${renderChecks(item.checks)}</div></td>
      </tr>`;
    })
    .join("");

  return `<div class="demo-summary">
    <div class="demo-summary__item"><span class="label">Cases passed</span><span class="demo-summary__value">${report.passed_cases}/${report.cases.length}</span></div>
    <div class="demo-summary__item"><span class="label">Suite score</span><span class="demo-summary__value">${(report.score * 100).toFixed(1)}%</span></div>
    <div class="demo-summary__item"><span class="label">Flaky</span><span class="demo-summary__value">${report.flaky_cases}</span></div>
  </div>
  <div class="demo-table-wrap">
    <table class="demo-table">
      <thead><tr><th>Case</th><th>Score</th><th>Verdict</th><th>Pass rate</th><th>Checks</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function showError(cause) {
  const message = typeof cause === "string" ? cause : cause.message;
  error.textContent = message || "Unable to run the suite.";
  error.hidden = false;
  status.textContent = "";
}

async function runSuite() {
  error.hidden = true;
  try {
    const report = await getReport();
    results.innerHTML = renderRun(report);
    status.textContent = "Suite complete";
  } catch (cause) {
    showError(cause);
  }
}

async function compareWithBaseline() {
  error.hidden = true;
  try {
    const report = await getReport();
    const baseline = JSON.parse(evaluate(SUPPORT_SUITE, JSON.stringify(SUPPORT_OUTPUTS)));
    const comparisonJson = compareReports(JSON.stringify(baseline), JSON.stringify(report), 0.02);
    const markdown = renderMarkdown(comparisonJson);
    const junit = renderJunit(JSON.stringify(report));
    results.innerHTML = `${renderRun(report)}
      <div class="demo-report">
        <div class="demo-tabs" role="tablist" aria-label="Report format">
          <button class="demo-tab is-active" type="button" role="tab" aria-selected="true" data-report-tab="markdown">Markdown</button>
          <button class="demo-tab" type="button" role="tab" aria-selected="false" data-report-tab="junit">JUnit</button>
        </div>
        <pre class="demo-markdown" data-report-panel="markdown">${escapeHtml(markdown)}</pre>
        <pre class="demo-markdown" data-report-panel="junit" hidden>${escapeHtml(junit)}</pre>
      </div>`;
    status.textContent = "Comparison complete";
  } catch (cause) {
    showError(cause);
  }
}

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
});
document.getElementById("run").addEventListener("click", runSuite);
document.getElementById("compare").addEventListener("click", compareWithBaseline);
results.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-report-tab]");
  if (!tab) return;
  results.querySelectorAll("[data-report-tab]").forEach((item) => {
    const active = item === tab;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
  });
  results.querySelectorAll("[data-report-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.reportPanel !== tab.dataset.reportTab;
  });
});

setPreset("support");
