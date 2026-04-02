# =============================================================================
# BlackieFi - Makefile
# =============================================================================
# Simple commands for local development with Docker
#
# Quick Start:
#   make up      - Start the application
#   make down    - Stop the application
#   make logs    - View logs
# =============================================================================

.PHONY: up down logs build clean health shell-backend shell-frontend help

# Default target
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# MAIN COMMANDS
# ---------------------------------------------------------------------------

up: ## Start all services
        @echo "Starting BlackieFi..."
		docker compose --env-file .env.dev up -d
        @echo ""
        @echo "✓ Services started"
        @echo ""
        @echo "Access:"
        @echo "  Frontend: http://localhost:3000"
        @echo "  Backend:  http://localhost:8001"
        @echo "  API Docs: http://localhost:8001/docs"
        @echo ""
        @echo "Login: demo / user123"

down: ## Stop all services
		docker compose --env-file .env.dev down

logs: ## View logs (all services)
		docker compose --env-file .env.dev logs -f

logs-backend: ## View backend logs only
		docker compose --env-file .env.dev logs -f backend

logs-frontend: ## View frontend logs only
		docker compose --env-file .env.dev logs -f frontend

build: ## Rebuild all images
	docker compose --env-file .env.dev build --no-cache


# ---------------------------------------------------------------------------
# PRODUCTION COMMANDS
# ---------------------------------------------------------------------------

up-prod: ## Start production services
	docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

build-prod: ## Build production images
	docker compose --env-file .env.prod -f docker-compose.prod.yml build --no-cache

down-prod: ## Stop production services
	docker compose --env-file .env.prod -f docker-compose.prod.yml down

restart: ## Restart all services
	docker compose --env-file .env.dev restart

# ---------------------------------------------------------------------------
# UTILITIES
# ---------------------------------------------------------------------------

health: ## Check service health
        @echo "Checking services..."
        @curl -sf http://localhost:8001/api/health && echo "Backend: ✓" || echo "Backend: ✗"
        @curl -sf http://localhost:3000 > /dev/null && echo "Frontend: ✓" || echo "Frontend: ✗"

shell-backend: ## Open shell in backend container
        docker exec -it blackiefi-backend /bin/sh

shell-frontend: ## Open shell in frontend container
        docker exec -it blackiefi-frontend /bin/sh

shell-mongo: ## Open MongoDB shell
        docker exec -it blackiefi-mongo mongosh blackiefi

clean: ## Remove containers, images, and volumes
	docker compose --env-file .env.dev down -v --rmi local
        @echo "✓ Cleaned"

status: ## Show container status
	docker compose --env-file .env.dev ps

# ---------------------------------------------------------------------------
# HELP
# ---------------------------------------------------------------------------

help: ## Show this help
        @echo ""
        @echo "BlackieFi - Development Commands"
        @echo "================================="
        @echo ""
        @echo "Usage: make [command]"
        @echo ""
        @echo "Commands:"
        @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
        @echo ""
