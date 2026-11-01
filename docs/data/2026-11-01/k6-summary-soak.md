## k6 · soak

Gate: **PASS**

Requests: 17483 · throughput 9.7 req/s · failed 0.01 % · checks 99.99 % · orders 688
Iterations: 7201 completed · 0 dropped by the load generator

| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| catalog | 28 | 46 | 57 | 86 | 250 |
| search | 19 | 30 | 37 | 65 | 125 |
| cart | 91 | 154 | 188 | 294 | 833 |
| checkout | 120 | 255 | 314 | 490 | 1112 |

checkout journey p95: 1332 ms
