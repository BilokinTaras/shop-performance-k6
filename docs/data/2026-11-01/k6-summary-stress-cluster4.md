## k6 · stress

Gate: **PASS**

Requests: 14157 · throughput 21.0 req/s · failed 0.00 % · checks 100.00 % · orders 555
Iterations: 5849 completed · 0 dropped by the load generator

| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| catalog | 32 | 59 | 77 | 126 | 244 |
| search | 22 | 39 | 53 | 83 | 207 |
| cart | 103 | 195 | 247 | 409 | 635 |
| checkout | 133 | 316 | 393 | 612 | 1040 |

checkout journey p95: 1601 ms
