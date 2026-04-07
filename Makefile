# BlackieFi 3.0 - Makefile
# Streamlined developer experience commands

.PHONY: up down logs logs-service reset build clean pull shell help status test-api

.DEFAULT_GOAL := help

# -----------------------------
# Colors
# -----------------------------
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

DATA_DIRS := data/mongo data/redis data/chroma data/ollama

# -----------------------------
# Ensure .env exists
# -----------------------------
.env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.template...$(NC)"; \
		cp .env.template .env; \
		echo "$(GREEN).env file created$(NC)"; \
	fi

# -----------------------------
# Start services
# -----------------------------
up: .env
	@echo "$(GREEN)Starting BlackieFi 3.0...$(NC)"
	@docker compose up -d --build
	@echo ""
	@echo "$(GREEN)BlackieFi 3.0 is starting!$(NC)"
	@echo "Services:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Gateway:  http://localhost:8080"
	@echo "  API:      http://localhost:8080/api"
	@echo ""
	@echo "Use 'make logs' to view logs, 'make status' for health checks"

# -----------------------------
# Stop services
# -----------------------------
down:
	@echo "$(YELLOW)Stopping BlackieFi 3.0...$(NC)"
	@docker compose down
	@echo "$(GREEN)All services stopped$(NC)"

# -----------------------------
# Logs
# -----------------------------
logs:
	@docker compose logs -f

logs-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Please specify SERVICE variable. Example: make logs-service SERVICE=auth$(NC)"; \
	else \
		docker compose logs -f $(SERVICE); \
	fi

# -----------------------------
# Status / Health
# -----------------------------
status:
	@echo "$(GREEN)Service Status:$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(GREEN)Health Checks:$(NC)"
	@for service in "Nginx Gateway:http://localhost:8080/health" \
	               "Gateway App:http://localhost:8080/api/health" \
	               "Auth Service:http://localhost:8080/api/auth/health"; do \
		name=$$(echo $$service | cut -d':' -f1); \
		url=$$(echo $$service | cut -d':' -f2); \
		status=$$(curl -s $$url | jq -r '.status' 2>/dev/null || echo "$(RED)unavailable$(NC)"); \
		echo -e "$$name: $$status"; \
	done

# -----------------------------
# Reset services and data
# -----------------------------
reset:
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@echo "Press Ctrl+C to cancel or wait 5 seconds..."
	@sleep 5
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker compose down -v
	@echo "$(YELLOW)Clearing data directories...$(NC)"
	@for dir in $(DATA_DIRS); do \
		rm -rf $$dir/*; \
		mkdir -p $$dir; \
	done
	@echo "$(GREEN)Restarting services clean...$(NC)"
	@$(MAKE) up

# -----------------------------
# Build
# -----------------------------
build: .env
	@echo "$(GREEN)Building Docker images...$(NC)"
	@docker compose build
	@echo "$(GREEN)Build complete$(NC)"

# -----------------------------
# Clean everything
# -----------------------------
clean:
	@echo "$(RED)WARNING: This will remove containers, images, and volumes!$(NC)"
	@echo "Press Ctrl+C to cancel or wait 5 seconds..."
	@sleep 5
	@docker compose down -v --rmi all
	@for dir in $(DATA_DIRS); do rm -rf $$dir/*; done
	@echo "$(GREEN)Cleanup complete$(NC)"

# -----------------------------
# Pull latest images
# -----------------------------
pull:
	@echo "$(GREEN)Pulling latest images...$(NC)"
	@docker compose pull
	@echo "$(GREEN)Pull complete$(NC)"

# -----------------------------
# Service shells
# -----------------------------
shell-auth:   ; @docker compose exec auth /bin/sh
shell-core:   ; @docker compose exec core /bin/sh
shell-mongo:  ; @docker compose exec mongo mongosh blackiefi
shell-redis:  ; @docker compose exec redis redis-cli

# -----------------------------
# API test
# -----------------------------
test-api:
	@echo "$(GREEN)Testing API endpoints...$(NC)"
	@echo ""
	@echo "Gateway Health:" && curl -s http://localhost:8080/health | jq .
	@echo ""
	@echo "API Root:" && curl -s http://localhost:8080/api/ | jq .
	@echo ""
	@echo "Auth Health:" && curl -s http://localhost:8080/api/auth/health | jq .

# -----------------------------
# Help
# -----------------------------
help:
	@echo ""
	@echo "$(GREEN)BlackieFi 3.0 - Microservices Architecture$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Primary Commands:"
	@echo "  $(YELLOW)make up$(NC)        - Start all services"
	@echo "  $(YELLOW)make down$(NC)      - Stop all services"
	@echo "  $(YELLOW)make logs$(NC)      - Stream all logs"
	@echo "  $(YELLOW)make reset$(NC)     - Wipe data and restart clean"
	@echo ""
	@echo "Other Commands:"
	@echo "  $(YELLOW)make status$(NC)    - Check service health"
	@echo "  $(YELLOW)make build$(NC)     - Build images without starting"
	@echo "  $(YELLOW)make clean$(NC)     - Remove containers, images, volumes"
	@echo "  $(YELLOW)make pull$(NC)      - Pull latest images"
	@echo "  $(YELLOW)make test-api$(NC)  - Quick API test"
	@echo "  $(YELLOW)make shell-auth$(NC)  - Shell in auth service"
	@echo "  $(YELLOW)make shell-core$(NC)  - Shell in core service"
	@echo "  $(YELLOW)make shell-mongo$(NC) - Mongo shell"
	@echo "  $(YELLOW)make shell-redis$(NC) - Redis CLI"
	@echo ""
	@echo "After running 'make up', access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Gateway:  http://localhost:8080"
	@echo ""