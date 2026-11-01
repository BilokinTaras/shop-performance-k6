#!/bin/sh
# Runs a k6 scenario in Docker on the shop's network and streams metrics to Prometheus (remote write).
# Usage: scripts/k6.sh <smoke|load|stress|spike|soak|breakpoint> [extra k6 args, e.g. -e TARGET_RATE=20]
# Exit code: k6's own — 99 means a threshold (SLO) was breached, which is the performance gate.
set -eu

SCENARIO=${1:?usage: scripts/k6.sh <scenario> [k6 args]}
shift
SUT_ENV=${SUT_ENV_FILE:-../shop-sut/.generated/sut.env}
K6_IMAGE=${K6_IMAGE:-grafana/k6:2.3.0}
[ -f "$SUT_ENV" ] || { echo "k6.sh: $SUT_ENV not found — start the shop: make -C ../shop-sut up" >&2; exit 2; }
val() { grep "^$1=" "$SUT_ENV" | cut -d= -f2-; }
abs() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

PROM_URL=${K6_PROMETHEUS_RW_SERVER_URL:-http://prometheus:9090/api/v1/write}
OUTPUT="-o experimental-prometheus-rw"
if [ "${NO_PROMETHEUS:-0}" = "1" ]; then OUTPUT=""; fi
TESTID=${TESTID:-"${SCENARIO}-$(date +%Y%m%d-%H%M%S)"}
mkdir -p results

# shellcheck disable=SC2086
docker run --rm --network "$(val SUT_DOCKER_NETWORK)" \
  -v "$(abs .):/work" -w /work \
  -e K6_PROMETHEUS_RW_SERVER_URL="$PROM_URL" \
  -e K6_PROMETHEUS_RW_TREND_STATS="p(50),p(90),p(95),p(99),min,max,avg" \
  -e K6_WEB_DASHBOARD=true -e K6_WEB_DASHBOARD_EXPORT="results/${TESTID}-dashboard.html" \
  -e BASE_URL="$(val SUT_INTERNAL_BACKEND_URL)" \
  -e PUBLISHABLE_KEY="$(val SUT_PUBLISHABLE_KEY)" \
  -e REGION_ID="$(val SUT_REGION_ID)" \
  -e COUNTRY="$(val SUT_STOREFRONT_COUNTRY)" \
  "$K6_IMAGE" run $OUTPUT --tag testid="$TESTID" "$@" "src/scenarios/${SCENARIO}.ts"
