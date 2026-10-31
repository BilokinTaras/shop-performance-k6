// SLOs as k6 thresholds (docs/workload-model.md). A breached threshold makes k6 exit with code 99,
// which is the performance gate. THRESHOLD_SCALE relaxes latency limits for noisy CI runners.
import type { Options } from 'k6/options';

const scale = Number(__ENV.THRESHOLD_SCALE ?? '1');
const ms = (value: number): number => Math.round(value * scale);

export const sloThresholds: NonNullable<Options['thresholds']> = {
  'http_req_duration{group:catalog}': [`p(95)<${ms(500)}`, `p(99)<${ms(1000)}`],
  'http_req_duration{group:search}': [`p(95)<${ms(500)}`, `p(99)<${ms(1000)}`],
  'http_req_duration{group:cart}': [`p(95)<${ms(800)}`, `p(99)<${ms(1500)}`],
  'http_req_duration{group:checkout}': [`p(95)<${ms(1500)}`, `p(99)<${ms(3000)}`],
  checkout_duration: [`p(95)<${ms(5000)}`],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  cart_errors: ['rate<0.01'],
};

/** Percentiles shown in the end-of-test summary (p99 is not in k6's default list). */
export const summaryTrendStats: NonNullable<Options['summaryTrendStats']> = [
  'avg',
  'min',
  'med',
  'max',
  'p(90)',
  'p(95)',
  'p(99)',
];
