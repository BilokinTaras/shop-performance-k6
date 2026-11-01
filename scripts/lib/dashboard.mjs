// Reads the data embedded in a k6 web-dashboard HTML export (K6_WEB_DASHBOARD_EXPORT).
// Unlike the Prometheus remote-write trend gauges, which k6 computes over the whole run so far, the dashboard
// keeps one snapshot per period (10 s by default) with that period's own counts, rates and percentiles.
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { gunzipSync } from 'node:zlib';

const TREND = ['avg', 'max', 'med', 'min', 'p(90)', 'p(95)', 'p(99)'];

/** @returns {{ start: number, stop: number, periods: { t: number, get: (metric: string, stat?: string) => number | undefined }[] }} */
export function readDashboard(file) {
  const html = readFileSync(file, 'utf8');
  const match = html.match(/<script id="data" type="application\/json; charset=utf-8; gzip; base64">([^<]*)<\/script>/);
  if (!match) throw new Error(`${file}: no embedded dashboard data`);
  const events = gunzipSync(Buffer.from(match[1].trim(), 'base64'))
    .toString('utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

  const known = new Map(); // metric name -> type (counter, gauge, rate, trend)
  const periods = [];
  let start = NaN;
  let stop = NaN;
  for (const { event, data } of events) {
    if (event === 'start') start = data[0][0] / 1000;
    if (event === 'stop') stop = data[0][0] / 1000;
    if (event === 'metric') for (const [name, info] of Object.entries(data)) known.set(name, info.type);
    if (event !== 'snapshot') continue;
    // Snapshot values follow the alphabetical order of the metrics known at that moment.
    const index = new Map([...known.keys()].sort().map((name, i) => [name, i]));
    const get = (metric, stat) => {
      const values = data[index.get(metric)];
      if (!values) return undefined;
      const type = known.get(metric);
      if (type === 'trend') return values[TREND.indexOf(stat ?? 'p(95)')];
      if (type === 'counter') return values[stat === 'count' ? 0 : 1];
      return values[0];
    };
    periods.push({ t: get('time') / 1000, get });
  }
  return { start, stop, periods };
}
