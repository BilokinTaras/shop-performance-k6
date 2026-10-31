# Workload model

All numbers describe a **local** stand: one laptop (AMD Ryzen 5 7600, 12 logical CPUs, Docker Desktop
with 16 GB), the shop and the load generator on the same machine. They are good for finding bottlenecks and
comparing a change before and after, not for predicting production capacity.

## Journeys and mix

The mix is an explicit **assumption** for a small online shop (no production analytics exist for this stand):
most visitors browse, few buy.

| Journey | Share | Requests per iteration | Think time |
|---|---:|---|---|
| Browse — catalog page, then a product page | 60 % | 2 | 1–3 s after each step |
| Search — full-text query | 15 % | 1 | 1–3 s |
| Cart — create a cart, add 1–2 items | 15 % | 2 | 1–3 s |
| Checkout — cart, address, shipping options, shipping method, payment collection, payment session, complete | 10 % | 9 | 1–3 s |

Implemented in `src/lib/journeys.ts` (`shopper()` draws a journey per iteration). Data — product handles,
variant IDs, catalog size — is discovered through the API in `setup()`; no IDs are hard-coded. Every
request carries a route-template `name` tag and a `group` tag (catalog, search, cart, checkout).

## Open model

Scenarios use **arrival-rate executors** (`ramping-arrival-rate`, `constant-arrival-rate`): new iterations
start at the configured rate whether or not the shop keeps up, the way real visitors arrive. A closed model
(fixed number of looping users) would slow down together with the system and hide the problem.
`rate` below means **iterations (journeys) started per second**.

## SLOs (thresholds)

| SLO | Threshold | Why this value |
|---|---|---|
| Catalog and search latency | p95 < 500 ms, p99 < 1 s | Pages that render on the server from these calls must feel instant |
| Cart operations | p95 < 800 ms, p99 < 1.5 s | Interactive but less frequent |
| Checkout steps | p95 < 1.5 s, p99 < 3 s | Heavier workflows (locks, payment collection); tolerated slightly slower |
| Whole checkout journey (custom `checkout_duration`) | p95 < 5 s | Sum of 7 checkout calls without think time |
| Errors | `http_req_failed` < 1 %, `checks` > 99 %, `cart_errors` < 1 % | Errors are worse than slowness |

`THRESHOLD_SCALE` multiplies latency limits (e.g. 2 for noisy CI runners). A breached threshold makes k6
exit with code **99** — the gate.

## Scenarios

| Scenario | Profile | Default | Short version used in checks |
|---|---|---|---|
| smoke | 1 VU, constant | 30 s | same |
| load | ramp to `TARGET_RATE`, hold | 5 it/s, 1 m ramp + 8 m hold | 5 it/s, 20 s + 1 m |
| stress | +`STEP_RATE` every `STEP_DURATION` up to `MAX_RATE` | 10 → 80 it/s, 2 m steps | 10 → 40, 30 s steps |
| spike | `BASE_RATE`, ×10 for `SPIKE_DURATION`, back | 5 → 50 it/s, 1 m | 2 → 20, 30 s |
| soak | constant `RATE` for `DURATION` | 4 it/s, 30 m | 4 it/s, 2 m |
| breakpoint | ramp to `MAX_RATE`, abort when errors > 5 % or catalog p95 > 3 s | 200 it/s, 10 m | 60 it/s, 3 m |

## Calibration (2026-11-01)

A short stress run (10 → 40 it/s in 30 s steps) showed the shop **saturating at about 10 iterations/s**
(≈ 24 requests/s): throughput stopped growing, catalog p95 went from 70 ms to 24 s as requests queued, and
some checkout calls hit the 60 s timeout. At the same time the Medusa container used ~1.5 CPU cores and
stayed there, Postgres ~0.4 cores with a constant 11 connections, Redis ~0.03 cores. The default load
target is therefore set to **5 it/s, about half of the measured capacity**. Analysis and the experiment
are in `performance-test-report.md`.

## Short-run check of every scenario (2026-11-01)

Short versions from the table above, run one after another on the stand described at the top, with
Prometheus remote write on. Exit code 0 = all thresholds held, 99 = the gate failed.

| Scenario | Parameters | Exit | Requests | Failed | Catalog p95 | Checkout p95 | Note |
|---|---|---:|---:|---:|---:|---:|---|
| load | 5 it/s, 20 s ramp + 1 m | 0 | 1017 | 0 % | 83 ms | 550 ms | 39 orders; SLOs hold at half of capacity |
| spike | 2 → 20 it/s for 30 s | 99 | 2956 | 0 % | 6480 ms | 19937 ms | 20 it/s is twice the capacity: no errors, but requests queue and every latency SLO breaks |
| soak | 4 it/s, 2 m | 0 | 1143 | 0 % | 64 ms | 339 ms | 43 orders |
| breakpoint | 1 → 60 it/s over 3 m | 99 | 1476 | 0 % | 3031 ms | — | aborted after 74 s at about 25 it/s: catalog p95 passed 3 s (abort threshold) |
| smoke, `THRESHOLD_SCALE=0.01` | 1 VU, 30 s | 99 | 19 | 0 % | 1292 ms | — | gate proof, see below |
| smoke, normal thresholds | 1 VU, 30 s | 0 | 19 | 0 % | 47 ms | — | thresholds restored |

The checkout p95 column is the `group:checkout` request latency; the breakpoint run did not yet record
per-group sub-metrics for search, cart and checkout (fixed afterwards with always-true thresholds, see
`src/scenarios/breakpoint.ts`).

## Proof that the gate works

1. `scripts/k6.sh smoke -e THRESHOLD_SCALE=0.01` — every latency limit multiplied by 0.01 (catalog p95
   < 5 ms). k6 reported `thresholds on metrics 'http_req_duration{group:cart}, http_req_duration{group:catalog}'
   have been crossed` and exited with **99**; the summary says `Gate: FAIL`.
2. The same smoke with the normal thresholds right after: exit **0**, `Gate: PASS`.

So a CI job that runs `scripts/k6.sh <scenario>` fails the build exactly when an SLO is breached, and
`THRESHOLD_SCALE` is the only knob for noisier runners. Full runs and their analysis:
`performance-test-report.md`.
