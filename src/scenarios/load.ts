// Load: ramping arrival rate up to the target iteration rate (TARGET_RATE/s), held for HOLD.
// Arrival-rate executors keep the offered load constant even when the system slows down (open model).
import type { Options } from 'k6/options';

import { type TestData, discover, shopper } from '../lib/journeys.ts';
import { makeSummary } from '../lib/summary.ts';
import { sloThresholds, summaryTrendStats } from '../lib/thresholds.ts';

const target = Number(__ENV.TARGET_RATE ?? '5');

export const options: Options = {
  summaryTrendStats,
  scenarios: {
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: Math.max(20, target * 8),
      maxVUs: target * 20,
      stages: [
        { duration: __ENV.RAMP ?? '1m', target },
        { duration: __ENV.HOLD ?? '8m30s', target },
        { duration: '30s', target: 0 },
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

export const handleSummary = makeSummary('load');
