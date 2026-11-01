// Per-interval timeline of one run from its k6 web-dashboard export: throughput, errors, dropped iterations and
// per-period p95 latency. Used for spike recovery and soak drift.
// Usage: node scripts/run-timeline.mjs <dashboard.html> [bucket-seconds=60]
import { readDashboard } from './lib/dashboard.mjs';

const [html, bucket = '60'] = process.argv.slice(2);
if (!html) {
  console.error('usage: node scripts/run-timeline.mjs <dashboard.html> [bucket-seconds]');
  process.exit(2);
}
const { periods } = readDashboard(html);
const t0 = periods.find((p) => (p.get('vus') ?? 0) > 0).t - 10;
const size = Number(bucket);

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const max = (xs) => (xs.length ? Math.max(...xs) : NaN);
const values = (rows, pick) => rows.map(pick).filter(Number.isFinite);
const f = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');

console.log(
  '| From s | VUs | it/s | req/s | Failed % | Dropped it/s | Catalog p95 ms (max of periods) | Checkout p95 ms (max of periods) |',
);
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|');
for (let from = 0; ; from += size) {
  const win = periods.filter((p) => p.t - t0 > from && p.t - t0 <= from + size);
  if (win.length === 0) break;
  console.log(
    `| ${from} | ${f(max(values(win, (p) => p.get('vus'))))} | ${f(avg(values(win, (p) => p.get('iterations'))), 1)} | ` +
      `${f(avg(values(win, (p) => p.get('http_reqs'))), 1)} | ${f(100 * avg(values(win, (p) => p.get('http_req_failed'))), 2)} | ` +
      `${f(avg(values(win, (p) => p.get('dropped_iterations') ?? 0)), 1)} | ` +
      `${f(max(values(win, (p) => p.get('http_req_duration{group:catalog}'))))} | ` +
      `${f(max(values(win, (p) => p.get('http_req_duration{group:checkout}'))))} |`,
  );
}
