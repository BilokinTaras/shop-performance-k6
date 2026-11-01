## k6 · spike

Gate: **FAIL** — breached: http_req_duration{group:checkout}, checks, http_req_duration{group:catalog}, http_req_failed, http_req_duration{group:search}, http_req_duration{group:cart}, cart_errors, checkout_duration

Requests: 8291 · throughput 20.2 req/s · failed 6.67 % · checks 95.47 % · orders 127
Iterations: 3409 completed · 1378 dropped by the load generator

| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| catalog | 11910 | 26344 | 27061 | 27436 | 27556 |
| search | 6294 | 16332 | 17059 | 17452 | 17479 |
| cart | 33789 | 59997 | 59998 | 59998 | 59999 |
| checkout | 13902 | 59998 | 59998 | 59999 | 60000 |

checkout journey p95: 187254 ms
