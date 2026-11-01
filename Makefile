# shop-performance-k6 — GNU Make 3.81+ (macOS default) compatible.
SHELL := /bin/sh
SUT_DIR ?= ../shop-sut
MONITORING := docker compose -f monitoring/compose.yaml

.PHONY: help install check sut-up monitoring-up monitoring-down env smoke load stress spike soak breakpoint

help: ## Show targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-16s %s\n", $$1, $$2}'

install: ## Install locked Node dev dependencies (types, lint)
	npm ci

check: ## Typecheck, lint and format check of scenarios and scripts
	npx tsc --noEmit
	npx eslint .
	npx prettier --check .

sut-up: ## Start the shop from the sibling repository
	$(MAKE) -C $(SUT_DIR) up

monitoring-up: ## Prometheus, Grafana (http://localhost:3300), cAdvisor, exporters
	$(MONITORING) up -d --wait

monitoring-down: ## Stop the monitoring stack (keeps its data)
	$(MONITORING) down

env: ## Record the test environment into results/
	@mkdir -p results
	sh scripts/record-env.sh > results/environment-$$(date +%Y%m%d-%H%M%S).md

smoke: ## 1 VU for 30 s
	sh scripts/k6.sh smoke

load: ## 5 journeys/s for 10 minutes (TARGET_RATE, RAMP, HOLD)
	sh scripts/k6.sh load

stress: ## 2 -> 16 journeys/s in steps (STEP_RATE, MAX_RATE, STEP_DURATION)
	sh scripts/k6.sh stress

spike: ## 5 -> 50 journeys/s for 1 minute (BASE_RATE, SPIKE_DURATION)
	sh scripts/k6.sh spike

soak: ## 4 journeys/s for 30 minutes (RATE, DURATION)
	sh scripts/k6.sh soak

breakpoint: ## Ramp until errors > 5 % or catalog p95 > 3 s, then abort
	sh scripts/k6.sh breakpoint
