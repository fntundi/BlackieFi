# BlackieFi 3.0 - Makefile
# Microservices lifecycle management

.PHONY: up down logs reset build clean help status test-api \
        shell-auth shell-core shell-entity shell-portfolio shell-assets \
        shell-mongo shell-redis shell-gateway logs-service pull

.DEFAULT_GOAL := help

GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
CYAN   := \033[0;36m
NC     := \033[0m

# ── Environment ──────────────────────────────────────────────
.env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.template...$(NC)"; \
		cp .env.template .env; \
		echo "$(GREEN).env file created. Edit it to override defaults.$(NC)"; \
	fi

# ── Primary Commands ─────────────────────────────────────────

## up: Build images (if needed) and start every service
up: .env
	@echo "$(GREEN)Starting BlackieFi 3.0 ...$(NC)"
	@docker compose up -d --build
	@echo ""
	@echo "$(GREEN)BlackieFi 3.0 is starting!$(NC)"
	@echo ""
	@echo "  Frontend    http://localhost:3000  (via Nginx at :8080)"
	@echo "  Gateway     http://localhost:8080"
	@echo "  API         http://localhost:8080/api"
	@echo ""
	@echo "Run $(CYAN)make status$(NC) to verify health"

## down: Stop all services (keep data)
down:
	@echo "$(YELLOW)Stopping BlackieFi 3.0 ...$(NC)"
	@docker compose down
	@echo "$(GREEN)All services stopped$(NC)"

## build: Build all images without starting containers
build: .env
	@echo "$(GREEN)Building Docker images ...$(NC)"
	@docker compose build
	@echo "$(GREEN)Build complete$(NC)"

## logs: Tail logs from all services
logs:
	@docker compose logs -f

## logs-service: Tail a single service (usage: make logs-service SERVICE=auth)
logs-service:
	@docker compose logs -f $(SERVICE)

## status: Health-check every service
status:
	@echo "$(GREEN)=== Container Status ===$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(GREEN)=== Health Checks ===$(NC)"
	@echo -n "  Nginx Gateway  : " && curl -sf http://localhost:8080/health | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "  Gateway App    : " && curl -sf http://localhost:8080/api/health | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','ok'))" 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "  Auth Service   : " && curl -sf http://localhost:8080/api/auth/health | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "  Core Service   : " && curl -sf http://localhost:8080/api/health | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "  MongoDB        : " && docker compose exec -T mongo mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@echo -n "  Redis          : " && docker compose exec -T redis redis-cli ping 2>/dev/null || echo "$(RED)unavailable$(NC)"

## test-api: Quick smoke test of core API endpoints
test-api:
	@echo "$(GREEN)=== API Smoke Test ===$(NC)"
	@echo ""
	@echo "$(CYAN)Nginx /health$(NC)"
	@curl -sf http://localhost:8080/health | python3 -m json.tool 2>/dev/null || echo "$(RED)FAIL$(NC)"
	@echo ""
	@echo "$(CYAN)Gateway /api/$(NC)"
	@curl -sf http://localhost:8080/api/ | python3 -m json.tool 2>/dev/null || echo "$(RED)FAIL$(NC)"
	@echo ""
	@echo "$(CYAN)Auth /api/auth/health$(NC)"
	@curl -sf http://localhost:8080/api/auth/health | python3 -m json.tool 2>/dev/null || echo "$(RED)FAIL$(NC)"

# ── Data Management ──────────────────────────────────────────

## reset: Wipe all data and rebuild from scratch
reset:
	@echo "$(RED)WARNING: This will destroy ALL persisted data!$(NC)"
	@echo "Press Ctrl+C within 5 s to abort ..."
	@sleep 5
	@docker compose down -v
	@rm -rf data/mongo/* data/redis/* data/chroma/* data/ollama/*
	@mkdir -p data/mongo data/redis data/chroma data/ollama
	@$(MAKE) up

## clean: Remove containers, images, volumes, and local data
clean:
	@echo "$(RED)WARNING: Full cleanup — containers, images, volumes, data!$(NC)"
	@echo "Press Ctrl+C within 5 s to abort ..."
	@sleep 5
	@docker compose down -v --rmi all --remove-orphans
	@rm -rf data/mongo/* data/redis/* data/chroma/* data/ollama/*
	@echo "$(GREEN)Cleanup complete$(NC)"

## pull: Pull latest base images
pull:
	@docker compose pull
	@echo "$(GREEN)Pull complete$(NC)"

# ── Debug Shells ─────────────────────────────────────────────

shell-auth:
	@docker compose exec auth /bin/sh

shell-core:
	@docker compose exec core /bin/sh

shell-entity:
	@docker compose exec entity /bin/sh

shell-portfolio:
	@docker compose exec portfolio /bin/sh

shell-assets:
	@docker compose exec assets /bin/sh

shell-gateway:
	@docker compose exec gateway-app /bin/sh

shell-mongo:
	@docker compose exec mongo mongosh blackiefi

shell-redis:
	@docker compose exec redis redis-cli

# ── Help ─────────────────────────────────────────────────────

help:
	@echo ""
	@echo "$(GREEN)BlackieFi 3.0 — Microservices Architecture$(NC)"
	@echo ""
	@echo "Usage:  make [target]"
	@echo ""
	@echo "$(YELLOW)Lifecycle$(NC)"
	@echo "  up          Build & start all services"
	@echo "  down        Stop services (data preserved)"
	@echo "  build       Build images without starting"
	@echo "  reset       Wipe data and rebuild"
	@echo "  clean       Remove everything (images + data)"
	@echo ""
	@echo "$(YELLOW)Observability$(NC)"
	@echo "  logs        Tail all service logs"
	@echo "  logs-service SERVICE=<name>  Tail one service"
	@echo "  status      Health-check all services"
	@echo "  test-api    Quick API smoke test"
	@echo ""
	@echo "$(YELLOW)Debug Shells$(NC)"
	@echo "  shell-auth / shell-core / shell-entity"
	@echo "  shell-portfolio / shell-assets / shell-gateway"
	@echo "  shell-mongo / shell-redis"
	@echo ""
	@echo "$(YELLOW)After 'make up':$(NC)"
	@echo "  Frontend  http://localhost:8080"
	@echo "  API       http://localhost:8080/api"
	@echo ""
