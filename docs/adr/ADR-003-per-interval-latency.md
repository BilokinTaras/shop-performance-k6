# ADR-003: Per-interval latency from the k6 web-dashboard export

- Status: accepted
- Date: 2026-11-01

## Context

The analysis needs latency **per stress step** and **per minute** (spike recovery, soak drift). The first
version took it from the trend gauges that k6 sends through Prometheus remote write
(`k6_http_req_duration_p95` etc., `K6_PROMETHEUS_RW_TREND_STATS`). During the spike run the catalog p95 gauge
stayed at 27 s for three minutes after the load had dropped and kept moving only by a few milliseconds — the
gauges behave as percentiles over the whole run so far, not over the last interval. Step tables built on them
understate the latency of late steps and hide recovery.

## Decision

- Whole-run percentiles: the k6 end-of-test summary (exact).
- Per-interval percentiles: the k6 web-dashboard export (`K6_WEB_DASHBOARD_EXPORT`, enabled in `scripts/k6.sh`),
  which keeps one snapshot per 10 s period with that period's own percentiles; parsed by
  `scripts/lib/dashboard.mjs`. A step's latency = median of the period p95 values in its hold window.
- Resources (CPU, memory, connections, locks, Redis ops): Prometheus, exported per run by
  `scripts/export-metrics.mjs`.
- Grafana keeps the official k6 dashboard for live monitoring; the report says its latency panels are cumulative.

## Alternatives considered

| Option | Pros | Cons | Why not now |
|---|---|---|---|
| Remote-write trend gauges | Already in Prometheus, shown in Grafana | Cumulative over the run | Wrong for per-interval analysis |
| Native histograms (`K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM`) | True per-window quantiles in PromQL | Needs Prometheus native-histogram support enabled and different dashboards; runs would have to be repeated | Roadmap |
| k6 CSV/JSON output of every request | Exact per-window percentiles | Large files for long runs; extra output to manage | The dashboard export already holds 10 s aggregates |
| Grafana Cloud k6 | Built-in per-interval analysis | External service, account | The project stays local and self-hosted |

## Consequences

- Every number in the performance report names its source; step and timeline tables are reproducible from the
  committed HTML exports.
- A 10 s period with few requests gives a noisy p95; medians over the hold window smooth that.
- `scripts/lib/dashboard.mjs` depends on the export format of k6 2.3.0 (snapshot values in alphabetical
  metric order); a k6 upgrade must re-check it.

## Links

- k6 web dashboard: https://grafana.com/docs/k6/latest/results-output/web-dashboard/
- Prometheus remote write output: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
