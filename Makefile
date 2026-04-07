# BlackieFi 3.0 - Makefile
# Simple developer experience commands

.PHONY: up down logs reset build clean help status

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Ensure .env exists
.env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.template...$(NC)"; \
		cp .env.template .env; \
		echo "$(GREEN).env file created$(NC)"; \
	fi

## up: Start all services (creates .env if missing)
up: .env
	@echo "$(GREEN)Starting BlackieFi 3.0...$(NC)"
	@docker compose up -d --build
	@echo ""
	@echo "$(GREEN)BlackieFi 3.0 is starting!$(NC)"
	@echo ""
	@echo "Services will be available at:"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  Gateway:     http://localhost:8080"
	@echo "  API:         http://localhost:8080/api"
	@echo ""
	@echo "Use 'make logs' to view service logs"
	@echo "Use 'make status' to check service health"

## down: Stop all services
down:
	@echo "$(YELLOW)Stopping BlackieFi 3.0...$(NC)"
	@docker compose down
	@echo "$(GREEN)All services stopped$(NC)"

## logs: Stream logs from all services
logs:
	@docker compose logs -f

## logs-service: Stream logs from a specific service (usage: make logs-service SERVICE=auth)
logs-service:
	@docker compose logs -f $(SERVICE)

## status: Check status of all services
status:
	@echo "$(GREEN)Service Status:$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(GREEN)Health Checks:$(NC)"
	@echo -n "Nginx Gateway: " && curl -s http://localhost:8080/health | jq -r '.status' 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "Gateway App:   " && curl -s http://localhost:8080/api/health | jq -r '.status' 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "Auth Service:  " && curl -s http://localhost:8080/api/auth/health | jq -r '.status' 2>/dev/null || echo "$(RED)unavailable$(NC)"

## reset: Stop services, wipe all data, and restart clean
reset:
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker compose down -v
	@echo "$(YELLOW)Removing data directories...$(NC)"
	@rm -rf data/mongo/* data/redis/* data/chroma/* data/ollama/*
	@echo "$(YELLOW)Recreating data directories...$(NC)"
	@mkdir -p data/mongo data/redis data/chroma data/ollama
	@echo "$(GREEN)Starting fresh...$(NC)"
	@$(MAKE) up

## build: Build all Docker images without starting
build: .env
	@echo "$(GREEN)Building Docker images...$(NC)"
	@docker compose build
	@echo "$(GREEN)Build complete$(NC)"

## clean: Remove all containers, images, and volumes
clean:
	@echo "$(RED)WARNING: This will remove all containers, images, and volumes!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@docker compose down -v --rmi all
	@rm -rf data/mongo/* data/redis/* data/chroma/* data/ollama/*
	@echo "$(GREEN)Cleanup complete$(NC)"

## pull: Pull latest images
pull:
	@echo "$(GREEN)Pulling latest images...$(NC)"
	@docker compose pull
	@echo "$(GREEN)Pull complete$(NC)"

## shell-auth: Open shell in auth service
shell-auth:
	@docker compose exec auth /bin/sh

## shell-core: Open shell in core service
shell-core:
	@docker compose exec core /bin/sh

## shell-mongo: Open MongoDB shell
shell-mongo:
	@docker compose exec mongo mongosh blackiefi

## shell-redis: Open Redis CLI
shell-redis:
	@docker compose exec redis redis-cli

## test-api: Quick API test
test-api:
	@echo "$(GREEN)Testing API endpoints...$(NC)"
	@echo ""
	@echo "Gateway Health:"
	@curl -s http://localhost:8080/health | jq .
	@echo ""
	@echo "API Root:"
	@curl -s http://localhost:8080/api/ | jq .
	@echo ""
	@echo "Auth Health:"
	@curl -s http://localhost:8080/api/auth/health | jq .

## help: Show this help message
help:
	@echo ""
	@echo "$(GREEN)BlackieFi 3.0 - Microservices Architecture$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Primary Commands:"
	@echo "  $(YELLOW)make up$(NC)      - Start all services"
	@echo "  $(YELLOW)make down$(NC)    - Stop all services"
	@echo "  $(YELLOW)make logs$(NC)    - Stream all logs"
	@echo "  $(YELLOW)make reset$(NC)   - Wipe data and restart clean"
	@echo ""
	@echo "Other Commands:"
	@echo "  $(YELLOW)make status$(NC)  - Check service health"
	@echo "  $(YELLOW)make build$(NC)   - Build images without starting"
	@echo "  $(YELLOW)make clean$(NC)   - Remove all containers and images"
	@echo "  $(YELLOW)make test-api$(NC) - Quick API test"
	@echo ""
	@echo "After running 'make up', access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Gateway:  http://localhost:8080"
	@echo ""
