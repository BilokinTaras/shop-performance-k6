## k6 · load

Gate: **PASS**

Requests: 6811 · throughput 11.3 req/s · failed 0.00 % · checks 100.00 % · orders 269
Iterations: 2805 completed · 0 dropped by the load generator

| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| catalog | 30 | 55 | 68 | 112 | 233 |
| search | 20 | 34 | 42 | 78 | 104 |
| cart | 99 | 187 | 233 | 430 | 610 |
| checkout | 137 | 298 | 382 | 750 | 1165 |

checkout journey p95: 1760 ms
