// Breakpoint: keeps increasing the arrival rate until the error-rate SLO breaks, then aborts.
import type { Options } from 'k6/options';

import { type TestData, discover, shopper } from '../lib/journeys.ts';
import { makeSummary } from '../lib/summary.ts';
import { summaryTrendStats } from '../lib/thresholds.ts';

export const options: Options = {
  summaryTrendStats,
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 3000,
      stages: [{ duration: __ENV.DURATION ?? '10m', target: Number(__ENV.MAX_RATE ?? '200') }],
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    'http_req_duration{group:catalog}': [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '30s' }],
    // k6 creates a sub-metric only for a threshold; these always-true ones keep per-group latency in the summary.
    'http_req_duration{group:search}': ['max>=0'],
    'http_req_duration{group:cart}': ['max>=0'],
    'http_req_duration{group:checkout}': ['max>=0'],
  },
};

export function setup(): TestData {
  return discover();
}

export default function (data: TestData): void {
  shopper(data);
}

export const handleSummary = makeSummary('breakpoint');
