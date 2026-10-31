// Minimal shape of k6's handleSummary() argument used by summary.ts.
export interface SummaryMetric {
  type: string;
  values: Record<string, number>;
  thresholds?: Record<string, { ok: boolean }>;
}

export interface SummaryData {
  metrics: Record<string, SummaryMetric>;
}
