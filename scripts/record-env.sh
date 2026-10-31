#!/bin/sh
# Records the test environment next to the results: host, Docker limits, versions, data volume.
# Usage: scripts/record-env.sh > results/environment-<date>.md
set -eu
SUT_ENV=${SUT_ENV_FILE:-../shop-sut/.generated/sut.env}
val() { grep "^$1=" "$SUT_ENV" | cut -d= -f2-; }

cpu_model() {
  case "$(uname -s)" in
    Darwin) sysctl -n machdep.cpu.brand_string ;;
    Linux) grep -m1 'model name' /proc/cpuinfo | cut -d: -f2- | sed 's/^ //' ;;
    *) powershell.exe -NoProfile -Command '(Get-CimInstance Win32_Processor).Name' 2>/dev/null | tr -d '\r' ;;
  esac | sed 's/ *$//'
}
host_os() {
  case "$(uname -s)" in
    Darwin) echo "macOS $(sw_vers -productVersion)" ;;
    Linux) echo "Linux $(uname -r)" ;;
    *) powershell.exe -NoProfile -Command '"Windows build " + (Get-CimInstance Win32_OperatingSystem).Version' 2>/dev/null | tr -d '\r' ;;
  esac
}
host_ram() {
  case "$(uname -s)" in
    Darwin) echo "$(( $(sysctl -n hw.memsize) / 1073741824 )) GiB" ;;
    Linux) awk '/MemTotal/ { printf "%d GiB\n", $2 / 1048576 }' /proc/meminfo ;;
    *) powershell.exe -NoProfile -Command '[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)' 2>/dev/null | tr -d '\r' | sed 's/$/ GiB/' ;;
  esac
}
api() { curl -s -H "x-publishable-api-key: $(val SUT_PUBLISHABLE_KEY)" "$(val SUT_BACKEND_URL)$1"; }

cat <<EOF
# Test environment — $(date +%Y-%m-%d)

| Item | Value |
|---|---|
| Host CPU | $(cpu_model) |
| Host RAM | $(host_ram) |
| Host OS | $(host_os) ($(uname -m)) |
| Docker | $(docker version --format '{{.Server.Version}}') · VM: $(docker info --format '{{.OperatingSystem}}, {{.Architecture}}, {{.NCPU}} CPUs, {{.MemTotal}}' | awk -F', ' '{ printf "%s, %s, %s, %.1f GiB", $1, $2, $3, $4 / 1073741824 }') |
| Container limits | none set (shop containers share the Docker VM) |
| Shop | Medusa $(docker exec qa-shop-sut-medusa-1 node -p "require('@medusajs/medusa/package.json').version" 2>/dev/null | tr -d '\r'), production build, $(docker exec qa-shop-sut-medusa-1 sh -c 'echo ${SHOP_MEDUSA_CLUSTER:-1}' | tr -d '\r') Node process(es) |
| Database | $(docker exec qa-shop-sut-postgres-1 postgres --version | tr -d '\r'), Redis $(docker exec qa-shop-sut-redis-1 redis-server --version | awk '{ print $3 }' | sed 's/^v=//' | tr -d '\r') |
| Load generator | $(docker image inspect --format '{{index .RepoTags 0}}' grafana/k6:2.3.0), same machine as the shop |
| Catalog | $(api "/store/products?limit=1&region_id=$(val SUT_REGION_ID)" | sed -n 's/.*"count":\([0-9]*\).*/\1/p') products |
| Orders in DB before the run | $(docker exec qa-shop-sut-postgres-1 psql -U postgres -d medusa -tAc 'select count(*) from "order"' 2>/dev/null | tr -d '\r') |
EOF
