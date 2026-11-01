// Exports what Prometheus saw during one k6 run: a 5 s time series (CSV) and avg/max per series (JSON).
// The same queries feed the Grafana dashboards; exporting them keeps the numbers in the report reproducible.
// Usage: node scripts/export-metrics.mjs <testid> <from-unix> <to-unix> [out-prefix]
import { writeFileSync } from 'node:fs';

const [testid, from, to, prefix = `results/metrics-${testid}`] = process.argv.slice(2);
if (!testid || !from || !to) {
  console.error('usage: node scripts/export-metrics.mjs <testid> <from-unix> <to-unix> [out-prefix]');
  process.exit(2);
}
const PROM = process.env.PROMETHEUS_URL ?? 'http://127.0.0.1:9090';
const t = `testid="${testid}"`;
const shop = 'name=~"qa-shop-sut-(medusa|postgres|redis|storefront)-1"';

/** label -> PromQL. Multi-series queries are split by their `name` label. */
const QUERIES = {
  k6_req_per_s: `sum(rate(k6_http_reqs_total{${t}}[15s]))`,
  k6_iter_per_s: `sum(rate(k6_iterations_total{${t}}[15s]))`,
  k6_dropped_iter_per_s: `sum(rate(k6_dropped_iterations_total{${t}}[15s]))`,
  k6_vus: `sum(k6_vus{${t}})`,
  k6_failed_ratio: `avg(k6_http_req_failed_rate{${t}})`,
  p95_catalog_ms: `max(k6_http_req_duration_p95{${t},group="catalog"}) * 1000`,
  p95_search_ms: `max(k6_http_req_duration_p95{${t},group="search"}) * 1000`,
  p95_cart_ms: `max(k6_http_req_duration_p95{${t},group="cart"}) * 1000`,
  p95_checkout_ms: `max(k6_http_req_duration_p95{${t},group="checkout"}) * 1000`,
  cpu_cores: `sum by (name) (rate(container_cpu_usage_seconds_total{${shop}}[15s]))`,
  cpu_cores_k6: `sum(rate(container_cpu_usage_seconds_total{image=~"grafana/k6.*"}[15s]))`,
  mem_mib: `max by (name) (container_memory_working_set_bytes{${shop}}) / 1048576`,
  pg_connections: `sum(pg_stat_activity_count{datname="medusa"})`,
  pg_active: `sum(pg_stat_activity_count{datname="medusa",state="active"})`,
  pg_locks: `sum(pg_locks_count{datname="medusa"})`,
  pg_commits_per_s: `sum(rate(pg_stat_database_xact_commit{datname="medusa"}[15s]))`,
  redis_ops_per_s: `sum(rate(redis_commands_processed_total[15s]))`,
};

async function range(query) {
  const url = new URL('/api/v1/query_range', PROM);
  url.search = new URLSearchParams({ query, start: from, end: to, step: '5' }).toString();
  const res = await fetch(url);
  const body = await res.json();
  if (body.status !== 'success') throw new Error(`${query}: ${JSON.stringify(body)}`);
  return body.data.result;
}

const columns = new Map(); // column name -> Map(ts -> value)
for (const [label, query] of Object.entries(QUERIES)) {
  for (const series of await range(query)) {
    const name = series.metric.name
      ? `${label}:${series.metric.name.replace('qa-shop-sut-', '').replace('-1', '')}`
      : label;
    columns.set(name, new Map(series.values.map(([ts, v]) => [Number(ts), Number(v)])));
  }
}

const stamps = [...new Set([...columns.values()].flatMap((m) => [...m.keys()]))].sort((a, b) => a - b);
const names = [...columns.keys()];
const csv = [
  ['time', ...names].join(','),
  ...stamps.map((ts) =>
    [new Date(ts * 1000).toISOString(), ...names.map((n) => columns.get(n).get(ts)?.toFixed(3) ?? '')].join(','),
  ),
];
writeFileSync(`${prefix}.csv`, csv.join('\n') + '\n');

const summary = { testid, from: Number(from), to: Number(to), series: {} };
for (const [name, values] of columns) {
  const nums = [...values.values()].filter((v) => Number.isFinite(v));
  if (nums.length === 0) continue;
  summary.series[name] = {
    avg: Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3)),
    max: Number(Math.max(...nums).toFixed(3)),
  };
}
writeFileSync(`${prefix}.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(`${prefix}.csv: ${stamps.length} rows x ${names.length} series`);
