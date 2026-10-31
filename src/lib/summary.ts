// End-of-test summary: JSON (full k6 data) and a short Markdown table for reports and CI job summaries.
import type { SummaryData } from './summary-types.ts';

const GROUPS = ['catalog', 'search', 'cart', 'checkout'] as const;

function metric(data: SummaryData, name: string): Record<string, number> | undefined {
  return data.metrics[name]?.values;
}

function fmt(value: number | undefined, digits = 0): string {
  return value === undefined ? '—' : value.toFixed(digits);
}

export function makeSummary(name: string) {
  return (data: SummaryData): Record<string, string> => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const failed = Object.entries(data.metrics)
      .filter(([, m]) => m.thresholds && Object.values(m.thresholds).some((t) => !t.ok))
      .map(([metricName]) => metricName);
    const reqs = metric(data, 'http_reqs');
    const lines = [
      `## k6 · ${name}`,
      '',
      `Gate: **${failed.length ? 'FAIL' : 'PASS'}**${failed.length ? ` — breached: ${failed.join(', ')}` : ''}`,
      '',
      `Requests: ${fmt(reqs?.count)} · throughput ${fmt(reqs?.rate, 1)} req/s · ` +
        `failed ${fmt((metric(data, 'http_req_failed')?.rate ?? 0) * 100, 2)} % · ` +
        `checks ${fmt((metric(data, 'checks')?.rate ?? 0) * 100, 2)} % · ` +
        `orders ${fmt(metric(data, 'orders_placed')?.count)}`,
      '',
      '| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |',
      '|---|---:|---:|---:|---:|---:|',
      ...GROUPS.map((g) => {
        const v = metric(data, `http_req_duration{group:${g}}`);
        // A group without requests in this scenario reports zeros; show it as not measured.
        if (!v || !v.max) return `| ${g} | — | — | — | — | — |`;
        return `| ${g} | ${fmt(v.med)} | ${fmt(v['p(90)'])} | ${fmt(v['p(95)'])} | ${fmt(v['p(99)'])} | ${fmt(v.max)} |`;
      }),
      '',
      `checkout journey p95: ${metric(data, 'checkout_duration')?.max ? fmt(metric(data, 'checkout_duration')?.['p(95)']) + ' ms' : 'not measured'}`,
      '',
    ];
    const markdown = lines.join('\n');
    return {
      stdout: `${markdown}\n`,
      [`results/${name}-${stamp}.json`]: JSON.stringify(data, null, 2),
      [`results/${name}-${stamp}.md`]: markdown,
      [`results/${name}-latest.md`]: markdown,
    };
  };
}
