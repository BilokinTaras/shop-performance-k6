// Soak: constant RATE iterations/s for DURATION (30m locally, a few minutes in CI) to expose leaks and drift.
import type { Options } from 'k6/options';

import { type TestData, discover, shopper } from '../lib/journeys.ts';
import { makeSummary } from '../lib/summary.ts';
import { sloThresholds, summaryTrendStats } from '../lib/thresholds.ts';

const rate = Number(__ENV.RATE ?? '4');

export const options: Options = {
  summaryTrendStats,
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration: __ENV.DURATION ?? '30m',
      preAllocatedVUs: rate * 8,
      maxVUs: rate * 20,
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

export const handleSummary = makeSummary('soak');
