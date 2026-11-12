const byId = (id) => document.getElementById(id);
const usd = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-US");
const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});
const formatDate = (iso, formatter = fullDate) => formatter.format(new Date(iso + "T00:00:00Z"));
const dollars = (value) => usd.format(value);
const percent = (value, digits = 1) => (value * 100).toFixed(digits) + "%";
const COLORS = { hedge: "#226f47", baseline: "#77849d", threshold: "#a24d32" };

function fillRows(id, records) {
  byId(id).replaceChildren(...records.map((values) => {
    const row = document.createElement("tr");
    for (const [index, value] of values.entries()) {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      cell.textContent = value;
      row.append(cell);
    }
    return row;
  }));
}

function makeChart(canvas, readout, series, formatValue, extra = {}) {
  const ctx = canvas.getContext("2d");
  let rows = [];
  let selected = null;
  const visibleColumns = series.map(({ column }) => column).concat(extra.band ?? []);

  function render() {
    if (!rows.length) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 100 || height < 100) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const plot = { left: width < 460 ? 47 : 61, right: width - 13, top: 15, bottom: height - 26 };
    const values = rows.flatMap((row) => visibleColumns.map((column) => row[column]));
    const low = Math.min(0, ...values);
    const high = Math.max(0, ...values);
    const margin = (high - low || 1) * 0.05;
    const lower = low - margin;
    const upper = high + margin;
    const x = (index) => plot.left + index * (plot.right - plot.left) / Math.max(rows.length - 1, 1);
    const y = (value) => plot.bottom - (value - lower) * (plot.bottom - plot.top) / (upper - lower);

    ctx.font = "11px system-ui";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let tick = 0; tick <= 4; tick++) {
      const value = low + tick * (high - low) / 4;
      const coordinate = y(value);
      ctx.strokeStyle = "#dedbd4";
      ctx.beginPath();
      ctx.moveTo(plot.left, coordinate);
      ctx.lineTo(plot.right, coordinate);
      ctx.stroke();
      ctx.fillStyle = "#55534e";
      ctx.fillText(formatValue(value), plot.left - 7, coordinate);
    }
    ctx.textAlign = "center";
    for (let tick = 0; tick <= 4; tick++) {
      const index = Math.round(tick * (rows.length - 1) / 4);
      const coordinate = Math.min(width - 18, x(index));
      ctx.fillText(formatDate(rows[index][0], month), coordinate, height - 11);
    }
    if (extra.band) {
      const [lowerColumn, upperColumn] = extra.band;
      ctx.beginPath();
      rows.forEach((row, index) => ctx.lineTo(x(index), y(row[upperColumn])));
      for (let index = rows.length - 1; index >= 0; index--) {
        ctx.lineTo(x(index), y(rows[index][lowerColumn]));
      }
      ctx.closePath();
      ctx.fillStyle = "#8097bd42";
      ctx.fill();
    }
    for (const { column, color, dash } of series) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash ?? []);
      ctx.beginPath();
      rows.forEach((row, index) => ctx.lineTo(x(index), y(row[column])));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (extra.breach) {
      ctx.fillStyle = COLORS.threshold;
      rows.forEach((row, index) => {
        if (!row[4]) return;
        ctx.beginPath();
        ctx.arc(x(index), y(row[1]), 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (selected !== null) {
      ctx.strokeStyle = "#55534e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x(selected), plot.top);
      ctx.lineTo(x(selected), plot.bottom);
      ctx.stroke();
    }
  }

  function select(index) {
    if (!rows.length) return;
    selected = Math.max(0, Math.min(rows.length - 1, index));
    readout.textContent = extra.describe(rows[selected]);
    render();
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const left = rect.width < 460 ? 47 : 61;
    const share = (event.clientX - rect.left - left) / Math.max(1, rect.width - left - 13);
    select(Math.round(share * (rows.length - 1)));
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select((selected ?? rows.length - 1) + (event.key === "ArrowRight" ? 1 : -1));
  });
  new ResizeObserver(render).observe(canvas);

  return (points) => {
    rows = points;
    select(rows.length - 1);
  };
}

async function main() {
  const response = await fetch(new URL("./run.json", import.meta.url));
  if (!response.ok) throw new Error("The saved risk run could not be loaded.");
  const run = await response.json();

  const setRisk = makeChart(byId("risk-chart"), byId("risk-readout"), [
    { column: 2, color: COLORS.baseline },
    { column: 1, color: COLORS.hedge },
    { column: 3, color: COLORS.threshold, dash: [4, 3] },
  ], (value) => value === 0 ? "$0" : (value < 0 ? "−" : "") + "$" + Math.round(Math.abs(value) / 1000) + "k", {
    breach: true,
    describe: ([day, pnl, base, threshold, breach]) =>
      [formatDate(day), dollars(pnl) + " selected", dollars(base) + " unhedged",
        dollars(threshold) + " threshold", breach ? "Breach" : ""].filter(Boolean).join(" · "),
  });
  const setForecast = makeChart(byId("forecast-chart"), byId("forecast-readout"), [
    { column: 3, color: COLORS.baseline, dash: [4, 3] },
    { column: 1, color: COLORS.hedge },
  ], (value) => percent(value), {
    band: [2, 4],
    describe: ([day, actual, low, median, high]) =>
      [formatDate(day), percent(actual, 2) + " observed", percent(median, 2) + " median",
        percent(low, 2) + " to " + percent(high, 2) + " interval"].join(" · "),
  });

  const policyButtons = [...document.querySelectorAll("[data-hedge]")];
  const unhedged = run.policies.find(({ hedge_pct }) => hedge_pct === 0);
  function updatePolicy(ratio) {
    const selected = run.policies.find(({ hedge_pct }) => hedge_pct === ratio);
    byId("var-value").textContent = dollars(selected.next_var);
    byId("es-value").textContent = dollars(selected.next_es);
    byId("breach-value").textContent = percent(selected.breach_rate, 2);
    byId("breach-count").textContent =
      number.format(selected.breaches) + " of " + number.format(selected.observations) + " days";
    byId("fee-value").textContent = dollars(selected.mean_daily_fee);
    fillRows("coverage-table", [
      ["Kupiec p-value", selected.kupiec_p.toFixed(3)],
      ["Independence p-value", selected.independence_p.toFixed(3)],
      ["Conditional coverage p-value", selected.conditional_coverage_p.toFixed(3)],
      ["Worst observed day", dollars(selected.worst_day)],
    ]);
    for (const button of policyButtons) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.hedge) === ratio));
    }
    setRisk(run.risk_series[ratio]);
  }

  byId("var-baseline").textContent = dollars(unhedged.next_var) + " unhedged";
  byId("es-baseline").textContent = dollars(unhedged.next_es) + " unhedged";
  byId("fee-note").textContent = run.hedge_fee_bps + " bps of covered notional";
  byId("risk-window").textContent = run.risk_window;
  byId("as-of").textContent = formatDate(run.as_of);
  fillRows("positions-table", run.positions.map((position) => [
    position.pair, number.format(position.quantity), dollars(position.quantity * position.usd_mark),
  ]));
  for (const button of policyButtons) {
    button.disabled = false;
    button.addEventListener("click", () => updatePolicy(Number(button.dataset.hedge)));
  }

  const scores = run.forecast.final_year;
  fillRows("forecast-table", [
    ["80% interval coverage", percent(scores.coverage), percent(scores.baseline_coverage)],
    ["Mean interval width", percent(scores.mean_width, 2), percent(scores.baseline_width, 2)],
    ...run.forecast.quantiles.map((q, index) => [
      "P" + Math.round(q * 100) + " pinball loss (bps)",
      (scores.pinball[index] * 10000).toFixed(2), (scores.baseline_pinball[index] * 10000).toFixed(2),
    ]),
  ]);
  byId("holdout-note").textContent =
    number.format(scores.observations) + " observations · " + run.forecast.baseline_window + "-observation baseline";
  const optionForm = byId("option-form");
  function updateOption() {
    const fields = new FormData(optionForm);
    const key = ["kind", "days", "volatility", "strike"].map((name) => fields.get(name)).join(":");
    const option = run.option_presets[key];
    byId("option-premium").textContent = dollars(option.premium_usd);
    byId("option-delta").textContent = option.greeks.delta.toFixed(3);
    byId("option-strike").textContent = option.strike.toFixed(4);
    fillRows("shocks-table", option.shocks.map(({ shock_pct, value_usd, pnl_usd }) => [
      (shock_pct > 0 ? "+" : "") + shock_pct + "%", dollars(value_usd), dollars(pnl_usd),
    ]));
  }
  optionForm.addEventListener("change", updateOption);

  const payout = run.nrb_payout;
  byId("payout-date").textContent = formatDate(payout.date);
  fillRows("payout-table", [
    ["NPR payout", number.format(payout.npr_amount) + " NPR"],
    ["USD required at bank buy rate", dollars(payout.usd_at_buy)],
    ["USD required at midpoint", dollars(payout.usd_at_mid)],
  ]);
  byId("source-count").textContent = number.format(run.ecb_observations);
  byId("run-id").textContent = run.run_id;
  byId("demo-status").hidden = true;
  byId("desk").hidden = false;
  updatePolicy(75);
  setForecast(run.forecast_series);
  updateOption();
}

main().catch((error) => {
  byId("desk").hidden = true;
  const status = byId("demo-status");
  status.hidden = false;
  status.textContent = error.message || "The saved risk run could not be loaded.";
});
