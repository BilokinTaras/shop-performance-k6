# Shop performance · k6 + Prometheus + Grafana

_README v0 — completed in stage 1.20._

```bash
make -C ../shop-sut up
docker compose -f monitoring/compose.yaml up -d --wait
sh scripts/k6.sh smoke
```
