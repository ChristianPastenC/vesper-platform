.PHONY: help verify-env dev-ingestion dev-backend dev-console clean-db

# Default target
.DEFAULT_GOAL := help

# Terminal styling
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

help: ## Muestra este menu de ayuda con los comandos disponibles
	@echo "$(CYAN)V.E.S.P.E.R. Platform - Native DevSecOps Lifecycle Management$(RESET)"
	@echo "Uso: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'

verify-env: ## Diagnostica versiones de herramientas (Go, Node) y puertos del sistema
	@bash scripts/verify_dev_env.sh

dev-ingestion: ## Inicia el servidor de ingestion de telemetria en :8081 (Tier 2 BIA)
	@echo "$(CYAN)==> Levantando vesper-ingestion en :8081...$(RESET)"
	cd apps/vesper-ingestion && go run ./cmd/server

dev-backend: ## Inicia el backend de e-commerce verifier en :8080 (Tier 1 BIA)
	@echo "$(CYAN)==> Levantando demo-backend en :8080...$(RESET)"
	cd examples/demo-backend && go run ./cmd/server

dev-console: ## Inicia la consola administrativa Astro en :4000 (Tier 3 BIA)
	@echo "$(CYAN)==> Levantando vesper-console en :4000...$(RESET)"
	cd apps/vesper-console && npm run dev

clean-db: ## Restablece la base de datos embebida SQLite de telemetria
	@echo "$(CYAN)==> Limpiando telemetry.db en vesper-ingestion...$(RESET)"
	cd apps/vesper-ingestion && go run ./cmd/cli clean-db
