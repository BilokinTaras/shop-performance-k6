// Spike: BASE_RATE iterations/s, a jump to 10 x for SPIKE_DURATION, then back to watch the recovery.
import type { Options } from 'k6/options';

import { type TestData, discover, shopper } from '../lib/journeys.ts';
import { makeSummary } from '../lib/summary.ts';
import { sloThresholds, summaryTrendStats } from '../lib/thresholds.ts';

const base = Number(__ENV.BASE_RATE ?? '5');

export const options: Options = {
  summaryTrendStats,
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: base,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: base * 10 * 25,
      stages: [
        { duration: '2m', target: base },
        { duration: '10s', target: base * 10 },
        { duration: __ENV.SPIKE_DURATION ?? '1m', target: base * 10 },
        { duration: '10s', target: base },
        { duration: '3m', target: base },
      ],
    },
  },
  thresholds: sloThresholds,
};

export function setup(): TestData {
  return discover();
}

export default function (data: TestData): void {
  shopper(data);
}

export const handleSummary = makeSummary('spike');
