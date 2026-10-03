.PHONY: help verify-env dev-ingestion dev-backend dev-console clean-db test test-ingestion test-backend test-console test-ledger lint

# Default target
.DEFAULT_GOAL := help

# Terminal styling
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

help: ## Display this help menu with available commands
	@echo "$(CYAN)V.E.S.P.E.R. Platform - Native DevSecOps Lifecycle Management$(RESET)"
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'

verify-env: ## Diagnose toolchain versions (Go, Node) and system port allocations
	@bash scripts/verify_dev_env.sh

dev-ingestion: ## Start telemetry ingestion server on :8081 (BIA Tier 2)
	@echo "$(CYAN)==> Starting vesper-ingestion on :8081...$(RESET)"
	cd apps/vesper-ingestion && go run ./cmd/server

dev-backend: ## Start e-commerce verifier backend on :8080 (BIA Tier 1)
	@echo "$(CYAN)==> Starting demo-backend on :8080...$(RESET)"
	cd examples/demo-backend && go run ./cmd/server

dev-console: ## Start Astro management portal on :4000 (BIA Tier 3)
	@echo "$(CYAN)==> Starting vesper-console on :4000...$(RESET)"
	cd apps/vesper-console && npm run dev

clean-db: ## Reset local embedded SQLite telemetry database
	@echo "$(CYAN)==> Cleaning telemetry.db in vesper-ingestion...$(RESET)"
	cd apps/vesper-ingestion && go run ./cmd/cli clean-db

test: test-ingestion test-backend test-console ## Run unit and integration test suites across all services

test-ingestion: ## Run unit tests with coverage in vesper-ingestion
	@echo "$(CYAN)==> Testing vesper-ingestion (Go)...$(RESET)"
	cd apps/vesper-ingestion && go test -v ./... -cover

test-backend: ## Run unit tests with coverage in demo-backend
	@echo "$(CYAN)==> Testing demo-backend (Go)...$(RESET)"
	cd examples/demo-backend && go test -v ./... -cover

test-console: ## Run unit tests in vesper-console (Vitest)
	@echo "$(CYAN)==> Testing vesper-console (Vitest)...$(RESET)"
	cd apps/vesper-console && npm test

test-ledger: ## Run cryptographic engine tests for Ghost Ledger (C++/TS)
	@echo "$(CYAN)==> Testing ghost-ledger...$(RESET)"
	cd packages/ghost-ledger && npm test

lint: ## Run static analysis (go vet, astro check)
	@echo "$(CYAN)==> Linting vesper-ingestion...$(RESET)"
	cd apps/vesper-ingestion && go vet ./...
	@echo "$(CYAN)==> Linting demo-backend...$(RESET)"
	cd examples/demo-backend && go vet ./...
	@echo "$(CYAN)==> Linting vesper-console...$(RESET)"
	cd apps/vesper-console && npx astro check
