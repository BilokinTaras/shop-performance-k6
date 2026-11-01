## k6 · load

Gate: **PASS**

Requests: 6907 · throughput 11.5 req/s · failed 0.00 % · checks 100.00 % · orders 284
Iterations: 2804 completed · 0 dropped by the load generator

| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| catalog | 29 | 40 | 48 | 70 | 133 |
| search | 20 | 27 | 30 | 41 | 66 |
| cart | 93 | 130 | 151 | 215 | 2746 |
| checkout | 113 | 209 | 248 | 310 | 3243 |

checkout journey p95: 893 ms
