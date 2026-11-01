// One Markdown row per stress step, using only the hold part of each step (the ramp between steps is skipped).
// Latency and throughput come from the k6 web-dashboard export (10 s periods); CPU and connections from the
// Prometheus export of the same run (scripts/export-metrics.mjs).
// Usage: node scripts/stress-steps.mjs <dashboard.html> <metrics.csv> [step-rate=2] [max-rate=16] [hold-s=60] [ramp-s=20]
import { readFileSync } from 'node:fs';

import { readDashboard } from './lib/dashboard.mjs';

const [html, csv, step = '2', max = '16', hold = '60', ramp = '20'] = process.argv.slice(2);
if (!html || !csv) {
  console.error('usage: node scripts/stress-steps.mjs <dashboard.html> <metrics.csv> [step] [max] [hold-s] [ramp-s]');
  process.exit(2);
}
const { periods } = readDashboard(html);
const [header, ...lines] = readFileSync(csv, 'utf8').trim().split('\n');
const cols = header.split(',');
const prom = lines.map((l) => {
  const cells = l.split(',');
  return Object.fromEntries([
    ['t', Date.parse(cells[0]) / 1000],
    ...cols.slice(1).map((c, i) => [c, Number(cells[i + 1] || NaN)]),
  ]);
});

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? NaN;
const values = (rows, pick) => rows.map(pick).filter(Number.isFinite);
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');

// The first period with VUs marks the start of the scenario (setup() runs before it).
const t0 = periods.find((p) => (p.get('vus') ?? 0) > 0).t - 10;
const period = Number(hold) + Number(ramp);
console.log(
  '| Offered it/s | Achieved it/s | req/s | Dropped it/s | Failed % | Catalog p95 ms | Checkout p95 ms | Medusa CPU cores | Postgres conns (max active) |',
);
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (let i = 1; i * Number(step) <= Number(max); i++) {
  const from = t0 + (i - 1) * period + Number(ramp);
  const to = t0 + i * period;
  // A dashboard period is stamped at its end, so it belongs to the window when it ends inside it.
  const win = periods.filter((p) => p.t > from + 10 && p.t <= to + 1);
  const res = prom.filter((r) => r.t > from && r.t <= to);
  if (win.length === 0) break;
  console.log(
    `| ${i * Number(step)} | ${f(avg(values(win, (p) => p.get('iterations'))))} | ` +
      `${f(avg(values(win, (p) => p.get('http_reqs'))))} | ${f(avg(values(win, (p) => p.get('dropped_iterations') ?? 0)))} | ` +
      `${f(100 * avg(values(win, (p) => p.get('http_req_failed'))), 2)} | ` +
      `${f(median(values(win, (p) => p.get('http_req_duration{group:catalog}'))), 0)} | ` +
      `${f(median(values(win, (p) => p.get('http_req_duration{group:checkout}'))), 0)} | ` +
      `${f(avg(values(res, (r) => r['cpu_cores:medusa'])), 2)} | ` +
      `${f(Math.max(...values(res, (r) => r.pg_connections)), 0)} (${f(Math.max(...values(res, (r) => r.pg_active)), 0)}) |`,
  );
}
console.log('\nLatency: median of the 10 s period p95 values inside each hold window.');
