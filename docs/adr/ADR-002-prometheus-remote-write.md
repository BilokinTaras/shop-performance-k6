# ADR-002: Prometheus remote write for k6 metrics

- Status: accepted
- Date: 2026-11-01

## Context
The point of the project is to explain *why* latency changes, so k6 results must sit on the same time axis
as container CPU, Postgres connections and Redis operations.

## Decision
k6 streams metrics with `-o experimental-prometheus-rw` to Prometheus 3.15 (started with
`--web.enable-remote-write-receiver`); Prometheus also scrapes cAdvisor, postgres_exporter and redis_exporter.
Grafana 13 is provisioned from files with the official k6 dashboard (19665) plus cAdvisor, PostgreSQL and
Redis dashboards. Trend metrics are exported as p50/p90/p95/p99/min/max/avg.

## Alternatives considered
| Option | Why not |
|---|---|
| InfluxDB output (`-o influxdb`) | A second time-series database next to Prometheus; system metrics would live elsewhere |
| Grafana Cloud k6 | External account; test data leaves the machine |
| Only the k6 HTML web dashboard | Shows k6's view only, nothing about the database or containers (kept as an extra artefact per run) |

## Consequences
- One Grafana shows load, latency and resource usage together; screenshots come from real runs.
- Everything is local (127.0.0.1), the stack joins `qa-shop-net` as an external network.
- The exported trend stats are pre-aggregated per push interval; long-window percentiles in Grafana are
  approximations, the k6 end-of-test summary remains the reference number for reports.
