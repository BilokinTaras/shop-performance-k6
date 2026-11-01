# Test environment — 2026-11-01

| Item | Value |
|---|---|
| Host CPU | AMD Ryzen 5 7600 6-Core Processor |
| Host RAM | 31 GiB |
| Host OS | Windows build 10.0.26200 (x86_64) |
| Docker | 29.7.2 · VM: Docker Desktop, x86_64, 12 CPUs, 15.2 GiB |
| Container limits | none set (shop containers share the Docker VM) |
| Shop | Medusa 2.22.2, production build, 4 Node process(es) |
| Database | postgres (PostgreSQL) 17.11, Redis 7.4.12 |
| Load generator | grafana/k6:2.3.0, same machine as the shop |
| Catalog | 7 products |
| Orders in DB before the run | 284 |
