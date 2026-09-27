const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
let data;

function path(points) { return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "); }
function renderChart(row) {
  const [date, rate, values] = row;
  const rates = values.flatMap((v) => [rate * (1 + v[0] / 100), rate * (1 + v[2] / 100), v[3]]);
  const lo = Math.min(...rates) * 0.998, hi = Math.max(...rates) * 1.002;
  const x = (i) => 55 + i * 47;
  const y = (v) => 285 - (v - lo) / (hi - lo) * 235;
  const upper = [[x(0), y(rate)], ...values.map((v, i) => [x(i + 1), y(rate * (1 + v[2] / 100))])];
  const lower = [...values].reverse().map((v, ri) => [x(14 - ri), y(rate * (1 + v[0] / 100))]);
  const mid = [[x(0), y(rate)], ...values.map((v, i) => [x(i + 1), y(rate * (1 + v[1] / 100))])];
  const actual = [[x(0), y(rate)], ...values.map((v, i) => [x(i + 1), y(v[3])])];
  $("fan-chart").innerHTML = `<text x="14" y="30" font-family="var(--font-mono)" font-size="11" fill="#55534e">${hi.toFixed(2)}</text><text x="14" y="287" font-family="var(--font-mono)" font-size="11" fill="#55534e">${lo.toFixed(2)}</text><path d="${path(upper)} ${path(lower)} Z" fill="rgba(63,125,79,.23)"/><path d="${path(mid)}" fill="none" stroke="#3f7d4f" stroke-width="2"/><path d="${path(actual)}" fill="none" stroke="#0e0e0e" stroke-width="2"/><text x="55" y="317" font-family="var(--font-mono)" font-size="11" fill="#55534e">0</text><text x="695" y="317" font-family="var(--font-mono)" font-size="11" fill="#55534e">14 business days</text>`;
  $("forecast-title").textContent = `Forecast from ${date}`;
  $("date-out").textContent = date;
  $("rate-out").textContent = `${rate.toFixed(2)} NPR per USD`;
}
function calculate() {
  const row = data.rows[+$("date-scrubber").value], days = +$("days").value;
  const volume = +$("volume").value || 0, tolerance = +$("tolerance").value || 0;
  const costRate = (+$("cost").value || 0) * days / 10000;
  const p10 = row[2][days - 1][0], exposure = volume * days;
  const loss = exposure * Math.max(0, -p10 / 100), hedgeUnit = exposure * costRate;
  const ratio = loss > hedgeUnit ? Math.min(1, Math.max(0, (loss - tolerance) / (loss - hedgeUnit))) : 0;
  const hedgeCost = ratio * hedgeUnit, hedged = (1 - ratio) * loss + hedgeCost;
  $("days-out").textContent = `${days} days`;
  $("hedge-ratio").textContent = `${(ratio * 100).toFixed(0)}%`;
  $("hedge-cost").textContent = money.format(hedgeCost);
  $("loss-open").textContent = money.format(loss);
  $("loss-hedged").textContent = money.format(hedged);
}
function renderMetrics() {
  $("metrics").innerHTML = [1, 7, 14].map((h) => {
    const m = data.metrics[h];
    return `<div class="fx-metric"><strong>${h}d</strong><span>pinball ${m.pinball.toFixed(4)} vs naive ${m.naive_pinball.toFixed(4)}</span><span>${(m.coverage * 100).toFixed(1)}% coverage</span></div>`;
  }).join("");
  $("source-note").textContent = `${data.source.name}. ${data.source.description}`;
}
async function main() {
  data = await fetch("demos/fx/data/forecast.json").then((r) => r.json());
  $("date-scrubber").max = data.rows.length - 1;
  $("date-scrubber").value = data.rows.length - 1;
  $("date-scrubber").addEventListener("input", () => { renderChart(data.rows[+$("date-scrubber").value]); calculate(); });
  ["volume", "days", "cost", "tolerance"].forEach((id) => $(id).addEventListener("input", calculate));
  renderChart(data.rows.at(-1)); renderMetrics(); calculate();
}
main().catch(() => { $("forecast-title").textContent = "Forecast data could not load"; });
