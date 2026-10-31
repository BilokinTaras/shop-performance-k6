// Smoke: 1 VU for 30 s — catalog, product by handle, cart with one item. Proves scripts and thresholds work.
import { check } from 'k6';
import type { Options } from 'k6/options';

import { type TestData, browse, cart, discover } from '../lib/journeys.ts';
import { makeSummary } from '../lib/summary.ts';
import { sloThresholds, summaryTrendStats } from '../lib/thresholds.ts';

export const options: Options = {
  summaryTrendStats,
  scenarios: { smoke: { executor: 'constant-vus', vus: 1, duration: __ENV.DURATION ?? '30s' } },
  thresholds: sloThresholds,
};

export function setup(): TestData {
  return discover();
}

export default function (data: TestData): void {
  browse(data);
  const cartId = cart(data);
  check(cartId, { 'cart flow completed': (id) => id !== undefined });
}

export const handleSummary = makeSummary('smoke');
