// Stress: steps of STEP_RATE iterations/s every STEP_DURATION, up to MAX_RATE, to find where SLOs break.
// Thresholds do not abort the run: the point is to observe the degradation, not to stop at it.
import type { Options } from 'k6/options';

import { type TestData, discover, shopper } from '../lib/journeys.ts';
import { makeSummary } from '../lib/summary.ts';
import { sloThresholds, summaryTrendStats } from '../lib/thresholds.ts';

const step = Number(__ENV.STEP_RATE ?? '2');
const max = Number(__ENV.MAX_RATE ?? '16');
const stepDuration = __ENV.STEP_DURATION ?? '1m';
const stages = [];
for (let rate = step; rate <= max; rate += step) {
  stages.push({ duration: '20s', target: rate }, { duration: stepDuration, target: rate });
}
stages.push({ duration: '30s', target: 0 });

export const options: Options = {
  summaryTrendStats,
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: max * 8,
      maxVUs: max * 25,
      stages,
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

export const handleSummary = makeSummary('stress');
