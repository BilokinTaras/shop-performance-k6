## k6 · stress

Gate: **FAIL** — breached: checkout_duration, http_req_duration{group:cart}, http_req_duration{group:search}, http_req_duration{group:catalog}, http_req_duration{group:checkout}

Requests: 12831 · throughput 18.3 req/s · failed 0.27 % · checks 99.69 % · orders 430
Iterations: 5217 completed · 486 dropped by the load generator

| Group | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| catalog | 433 | 7969 | 8183 | 8315 | 8380 |
| search | 503 | 4933 | 5032 | 5180 | 5251 |
| cart | 1327 | 23661 | 31649 | 32862 | 33095 |
| checkout | 1038 | 23324 | 39087 | 59997 | 59998 |

checkout journey p95: 132870 ms
