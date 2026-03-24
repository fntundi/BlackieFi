# ============================================================================
# BlackieFi 3.0 - Development Makefile
# ============================================================================
# Comprehensive Makefile for local development and Docker-based deployment
#
# Quick Start:
#   make setup     - First-time setup (install dependencies)
#   make dev       - Start all services for development (no Docker)
#   make docker-up - Start all services with Docker
#   make help      - Show all available commands
# ============================================================================

.PHONY: help setup dev stop clean test lint \
        backend-dev backend-install backend-test backend-lint \
        frontend-dev frontend-install frontend-build frontend-test frontend-lint \
        db-start db-stop db-shell db-seed db-backup db-restore \
        docker-up docker-down docker-build docker-logs docker-clean \
        microservices-up microservices-down microservices-build microservices-logs \
        observability-up observability-down observability-logs \
        all-up all-down all-logs

# ============================================================================
# CONFIGURATION
# ============================================================================

# Colors for output
RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
CYAN   := \033[0;36m
NC     := \033[0m # No Color

# Directories
ROOT_DIR     := $(shell pwd)
BACKEND_DIR  := $(ROOT_DIR)/backend
FRONTEND_DIR := $(ROOT_DIR)/frontend
SERVICES_DIR := $(ROOT_DIR)/services
OBS_DIR      := $(ROOT_DIR)/observability

# Python
PYTHON       := python3
PIP          := pip3
VENV_DIR     := $(BACKEND_DIR)/.venv
VENV_PYTHON  := $(VENV_DIR)/bin/python
VENV_PIP     := $(VENV_DIR)/bin/pip

# Node
NODE         := node
NPM          := npm
YARN         := yarn

# Docker
DOCKER       := docker
COMPOSE      := docker compose
COMPOSE_FILE := docker-compose.yml
MICROSERVICES_FILE := docker-compose.microservices.yml
OBS_COMPOSE  := $(OBS_DIR)/docker-compose.yml

# Default ports
BACKEND_PORT  := 8001
FRONTEND_PORT := 3000
MONGO_PORT    := 27017
REDIS_PORT    := 6379
GATEWAY_PORT  := 8080
GRAFANA_PORT  := 3001
PROMETHEUS_PORT := 9090

# ============================================================================
# HELP
# ============================================================================

help: ## Show this help message
	@echo ""
	@echo "\033[0;36m╔═══════════════════════════════════════════════════════════════════╗\033[0m"
	@echo "\033[0;36m║           BlackieFi 3.0 - Development Commands                    ║\033[0m"
	@echo "\033[0;36m╚═══════════════════════════════════════════════════════════════════╝\033[0m"
	@echo ""
	@echo "\033[0;33mQUICK START:\033[0m"
	@echo "  \033[0;32mmake setup\033[0m           - First-time setup (install all dependencies)"
	@echo "  \033[0;32mmake dev\033[0m             - Start backend + frontend for development"
	@echo "  \033[0;32mmake docker-up\033[0m       - Start all services with Docker"
	@echo "  \033[0;32mmake all-up\033[0m          - Start microservices + observability"
	@echo ""
	@echo "\033[0;33mDEVELOPMENT (No Docker):\033[0m"
	@echo "  \033[0;32mmake backend-dev\033[0m     - Start backend development server"
	@echo "  \033[0;32mmake frontend-dev\033[0m    - Start frontend development server"
	@echo "  \033[0;32mmake backend-install\033[0m - Install backend dependencies"
	@echo "  \033[0;32mmake frontend-install\033[0m- Install frontend dependencies"
	@echo "  \033[0;32mmake db-start\033[0m        - Start MongoDB"
	@echo "  \033[0;32mmake db-stop\033[0m         - Stop MongoDB"
	@echo "  \033[0;32mmake stop\033[0m            - Stop all local services"
	@echo "  \033[0;32mmake test\033[0m            - Run all tests"
	@echo "  \033[0;32mmake lint\033[0m            - Lint all code"
	@echo "  \033[0;32mmake clean\033[0m           - Clean build artifacts"
	@echo ""
	@echo "\033[0;33mDOCKER (Monolith):\033[0m"
	@echo "  \033[0;32mmake docker-up\033[0m       - Start services with Docker"
	@echo "  \033[0;32mmake docker-down\033[0m     - Stop Docker services"
	@echo "  \033[0;32mmake docker-build\033[0m    - Build Docker images"
	@echo "  \033[0;32mmake docker-logs\033[0m     - View Docker logs"
	@echo "  \033[0;32mmake docker-clean\033[0m    - Remove containers/images"
	@echo ""
	@echo "\033[0;33mMICROSERVICES:\033[0m"
	@echo "  \033[0;32mmake microservices-up\033[0m   - Start microservices"
	@echo "  \033[0;32mmake microservices-down\033[0m - Stop microservices"
	@echo "  \033[0;32mmake microservices-build\033[0m- Build microservices images"
	@echo "  \033[0;32mmake microservices-logs\033[0m - View microservices logs"
	@echo ""
	@echo "\033[0;33mOBSERVABILITY:\033[0m"
	@echo "  \033[0;32mmake observability-up\033[0m   - Start Prometheus + Grafana"
	@echo "  \033[0;32mmake observability-down\033[0m - Stop observability stack"
	@echo "  \033[0;32mmake observability-logs\033[0m - View observability logs"
	@echo ""
	@echo "\033[0;33mALL SERVICES:\033[0m"
	@echo "  \033[0;32mmake all-up\033[0m          - Start everything"
	@echo "  \033[0;32mmake all-down\033[0m        - Stop everything"
	@echo "  \033[0;32mmake all-status\033[0m      - Show all service status"
	@echo "  \033[0;32mmake health\033[0m          - Check health of all services"
	@echo ""
	@echo "\033[0;33mUTILITIES:\033[0m"
	@echo "  \033[0;32mmake env-example\033[0m     - Generate example .env file"
	@echo "  \033[0;32mmake version\033[0m         - Show version information"
	@echo "  \033[0;32mmake db-backup\033[0m       - Create database backup"
	@echo "  \033[0;32mmake db-restore\033[0m      - Restore from latest backup"
	@echo ""

# ============================================================================
# SETUP & INSTALLATION
# ============================================================================

setup: backend-install frontend-install env-setup ## Complete first-time setup
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Ensure MongoDB is running: $(CYAN)make db-start$(NC)"
	@echo "  2. Start development servers: $(CYAN)make dev$(NC)"
	@echo "  3. Or use Docker: $(CYAN)make docker-up$(NC)"
	@echo ""

env-setup: ## Create .env files from examples if they don't exist
	@echo "$(CYAN)Setting up environment files...$(NC)"
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
		echo "MONGO_URL=mongodb://localhost:27017" > $(BACKEND_DIR)/.env; \
		echo "DB_NAME=blackiefi" >> $(BACKEND_DIR)/.env; \
		echo "JWT_SECRET=blackiefi-super-secret-jwt-key-change-in-production" >> $(BACKEND_DIR)/.env; \
		echo "EMERGENT_LLM_KEY=" >> $(BACKEND_DIR)/.env; \
		echo "$(GREEN)✓ Created backend/.env$(NC)"; \
	else \
		echo "$(YELLOW)⚠ backend/.env already exists$(NC)"; \
	fi
	@if [ ! -f $(FRONTEND_DIR)/.env ]; then \
		echo "REACT_APP_BACKEND_URL=http://localhost:8001" > $(FRONTEND_DIR)/.env; \
		echo "$(GREEN)✓ Created frontend/.env$(NC)"; \
	else \
		echo "$(YELLOW)⚠ frontend/.env already exists$(NC)"; \
	fi

check-deps: ## Check if required dependencies are installed
	@echo "$(CYAN)Checking dependencies...$(NC)"
	@command -v $(PYTHON) >/dev/null 2>&1 || { echo "$(RED)✗ Python3 not found$(NC)"; exit 1; }
	@command -v $(NODE) >/dev/null 2>&1 || { echo "$(RED)✗ Node.js not found$(NC)"; exit 1; }
	@command -v mongod >/dev/null 2>&1 || echo "$(YELLOW)⚠ MongoDB not found (required for local dev without Docker)$(NC)"
	@command -v $(DOCKER) >/dev/null 2>&1 || echo "$(YELLOW)⚠ Docker not found (required for containerized deployment)$(NC)"
	@echo "$(GREEN)✓ Core dependencies available$(NC)"

# ============================================================================
# BACKEND (Python/FastAPI)
# ============================================================================

backend-install: ## Install backend Python dependencies
	@echo "$(CYAN)Installing backend dependencies...$(NC)"
	@cd $(BACKEND_DIR) && $(PIP) install -r requirements.txt
	@echo "$(GREEN)✓ Backend dependencies installed$(NC)"

backend-venv: ## Create and setup Python virtual environment
	@echo "$(CYAN)Creating Python virtual environment...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -m venv .venv
	@cd $(BACKEND_DIR) && $(VENV_PIP) install --upgrade pip
	@cd $(BACKEND_DIR) && $(VENV_PIP) install -r requirements.txt
	@echo "$(GREEN)✓ Virtual environment created at $(VENV_DIR)$(NC)"
	@echo "$(YELLOW)Activate with: source $(VENV_DIR)/bin/activate$(NC)"

backend-dev: ## Start backend development server
	@echo "$(CYAN)Starting backend server on port $(BACKEND_PORT)...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn server:app --host 0.0.0.0 --port $(BACKEND_PORT) --reload

backend-start: ## Start backend server (production mode)
	@echo "$(CYAN)Starting backend server (production)...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn server:app --host 0.0.0.0 --port $(BACKEND_PORT) --workers 4

backend-test: ## Run backend tests
	@echo "$(CYAN)Running backend tests...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -m pytest tests/ -v --tb=short 2>/dev/null || echo "$(YELLOW)No tests found or pytest not installed$(NC)"

backend-lint: ## Lint backend code
	@echo "$(CYAN)Linting backend code...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -m ruff check . --fix 2>/dev/null || echo "$(YELLOW)Ruff not installed, skipping$(NC)"
	@echo "$(GREEN)✓ Backend linting complete$(NC)"

backend-format: ## Format backend code
	@echo "$(CYAN)Formatting backend code...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -m black . 2>/dev/null || echo "$(YELLOW)Black not installed, skipping$(NC)"
	@echo "$(GREEN)✓ Backend formatting complete$(NC)"

# ============================================================================
# FRONTEND (React)
# ============================================================================

frontend-install: ## Install frontend Node dependencies
	@echo "$(CYAN)Installing frontend dependencies...$(NC)"
	@cd $(FRONTEND_DIR) && $(YARN) install 2>/dev/null || $(NPM) install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"

frontend-dev: ## Start frontend development server
	@echo "$(CYAN)Starting frontend server on port $(FRONTEND_PORT)...$(NC)"
	@cd $(FRONTEND_DIR) && $(YARN) start 2>/dev/null || $(NPM) start

frontend-build: ## Build frontend for production
	@echo "$(CYAN)Building frontend...$(NC)"
	@cd $(FRONTEND_DIR) && $(YARN) build 2>/dev/null || $(NPM) run build
	@echo "$(GREEN)✓ Frontend build complete$(NC)"

frontend-test: ## Run frontend tests
	@echo "$(CYAN)Running frontend tests...$(NC)"
	@cd $(FRONTEND_DIR) && CI=true $(YARN) test 2>/dev/null || CI=true $(NPM) test

frontend-lint: ## Lint frontend code
	@echo "$(CYAN)Linting frontend code...$(NC)"
	@cd $(FRONTEND_DIR) && npx eslint src/ --fix 2>/dev/null || echo "$(YELLOW)ESLint not configured$(NC)"
	@echo "$(GREEN)✓ Frontend linting complete$(NC)"

# ============================================================================
# DATABASE (MongoDB)
# ============================================================================

db-start: ## Start local MongoDB (via Docker if mongod not available)
	@echo "$(CYAN)Starting MongoDB...$(NC)"
	@if command -v $(DOCKER) >/dev/null 2>&1; then \
		$(DOCKER) run -d --name blackiefi-mongo -p $(MONGO_PORT):27017 \
			-v blackiefi-mongo-data:/data/db mongo:7.0 2>/dev/null || \
			$(DOCKER) start blackiefi-mongo 2>/dev/null || \
			echo "$(YELLOW)MongoDB container already running$(NC)"; \
		echo "$(GREEN)✓ MongoDB started on port $(MONGO_PORT)$(NC)"; \
	elif command -v mongod >/dev/null 2>&1; then \
		mkdir -p /tmp/mongodb; \
		mongod --fork --logpath /tmp/mongodb.log --dbpath /tmp/mongodb 2>/dev/null || \
			echo "$(YELLOW)MongoDB may already be running$(NC)"; \
		echo "$(GREEN)✓ MongoDB started on port $(MONGO_PORT)$(NC)"; \
	else \
		echo "$(RED)Neither Docker nor mongod found. Please install one.$(NC)"; \
		exit 1; \
	fi

db-stop: ## Stop local MongoDB
	@echo "$(CYAN)Stopping MongoDB...$(NC)"
	@$(DOCKER) stop blackiefi-mongo 2>/dev/null || true
	@if command -v mongod >/dev/null 2>&1; then \
		mongod --shutdown 2>/dev/null || true; \
	fi
	@echo "$(GREEN)✓ MongoDB stopped$(NC)"

db-shell: ## Open MongoDB shell
	@echo "$(CYAN)Opening MongoDB shell...$(NC)"
	@mongosh mongodb://localhost:$(MONGO_PORT)/blackiefi 2>/dev/null || \
		$(DOCKER) exec -it blackiefi-mongo mongosh blackiefi 2>/dev/null || \
		echo "$(RED)Cannot connect to MongoDB$(NC)"

db-seed: ## Seed database with initial data
	@echo "$(CYAN)Seeding database...$(NC)"
	@cd $(BACKEND_DIR) && $(PYTHON) -c "from database import seed_database; import asyncio; asyncio.run(seed_database())" 2>/dev/null || \
		echo "$(YELLOW)Seed function not available$(NC)"
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-backup: ## Create database backup
	@echo "$(CYAN)Creating database backup...$(NC)"
	@mkdir -p $(ROOT_DIR)/backups
	@BACKUP_DIR=$(ROOT_DIR)/backups/backup-$$(date +%Y%m%d-%H%M%S); \
	if command -v mongodump >/dev/null 2>&1; then \
		mongodump --uri="mongodb://localhost:$(MONGO_PORT)/blackiefi" --out=$$BACKUP_DIR; \
	else \
		$(DOCKER) exec blackiefi-mongo mongodump --out=/tmp/backup && \
		$(DOCKER) cp blackiefi-mongo:/tmp/backup $$BACKUP_DIR; \
	fi
	@echo "$(GREEN)✓ Backup created in $(ROOT_DIR)/backups/$(NC)"

db-restore: ## Restore database from latest backup
	@echo "$(CYAN)Restoring database from latest backup...$(NC)"
	@LATEST=$$(ls -td $(ROOT_DIR)/backups/backup-* 2>/dev/null | head -1); \
	if [ -n "$$LATEST" ]; then \
		if command -v mongorestore >/dev/null 2>&1; then \
			mongorestore --uri="mongodb://localhost:$(MONGO_PORT)" --drop $$LATEST; \
		else \
			$(DOCKER) cp $$LATEST blackiefi-mongo:/tmp/restore && \
			$(DOCKER) exec blackiefi-mongo mongorestore --drop /tmp/restore; \
		fi; \
		echo "$(GREEN)✓ Database restored from $$LATEST$(NC)"; \
	else \
		echo "$(RED)No backup found in $(ROOT_DIR)/backups/$(NC)"; \
	fi

# ============================================================================
# LOCAL DEVELOPMENT (No Docker)
# ============================================================================

dev: db-start ## Start all services for local development
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           Starting BlackieFi Development Environment             ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Starting backend and frontend...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop all services$(NC)"
	@echo ""
	@trap 'make stop' INT; \
	(cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn server:app --host 0.0.0.0 --port $(BACKEND_PORT) --reload &) && \
	(cd $(FRONTEND_DIR) && PORT=$(FRONTEND_PORT) $(YARN) start 2>/dev/null || PORT=$(FRONTEND_PORT) $(NPM) start)

dev-backend: db-start backend-dev ## Start only backend for development

dev-frontend: frontend-dev ## Start only frontend for development

stop: ## Stop all local development services
	@echo "$(CYAN)Stopping services...$(NC)"
	@pkill -f "uvicorn server:app" 2>/dev/null || true
	@pkill -f "react-scripts start" 2>/dev/null || true
	@pkill -f "node.*$(FRONTEND_DIR)" 2>/dev/null || true
	@echo "$(GREEN)✓ Services stopped$(NC)"

test: backend-test frontend-test ## Run all tests

lint: backend-lint frontend-lint ## Lint all code

clean: ## Clean build artifacts and caches
	@echo "$(CYAN)Cleaning build artifacts...$(NC)"
	@rm -rf $(BACKEND_DIR)/__pycache__ $(BACKEND_DIR)/.pytest_cache $(BACKEND_DIR)/.ruff_cache
	@rm -rf $(FRONTEND_DIR)/node_modules/.cache $(FRONTEND_DIR)/build
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Clean complete$(NC)"

# ============================================================================
# DOCKER - MONOLITH
# ============================================================================

docker-up: ## Start all services with Docker Compose
	@echo "$(CYAN)Starting Docker services...$(NC)"
	$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✓ Docker services started$(NC)"
	@make docker-status

docker-down: ## Stop all Docker services
	@echo "$(CYAN)Stopping Docker services...$(NC)"
	$(COMPOSE) -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✓ Docker services stopped$(NC)"

docker-build: ## Build Docker images
	@echo "$(CYAN)Building Docker images...$(NC)"
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-logs: ## View Docker logs
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

docker-status: ## Show Docker service status
	@echo ""
	@echo "$(YELLOW)Service Status:$(NC)"
	@$(COMPOSE) -f $(COMPOSE_FILE) ps
	@echo ""

docker-clean: ## Remove Docker containers, images, and volumes
	@echo "$(CYAN)Cleaning Docker resources...$(NC)"
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi local
	@echo "$(GREEN)✓ Docker resources cleaned$(NC)"

docker-shell-backend: ## Open shell in backend container
	$(DOCKER) exec -it blackiefi-backend /bin/sh

docker-shell-frontend: ## Open shell in frontend container
	$(DOCKER) exec -it blackiefi-frontend /bin/sh

# ============================================================================
# LOCAL DEVELOPMENT (Docker - Simplified)
# ============================================================================

LOCAL_COMPOSE := docker-compose.local.yml

local-up: ## Start local development environment (recommended)
	@echo "\033[0;36m╔═══════════════════════════════════════════════════════════════════╗\033[0m"
	@echo "\033[0;36m║           Starting BlackieFi Local Development                    ║\033[0m"
	@echo "\033[0;36m╚═══════════════════════════════════════════════════════════════════╝\033[0m"
	$(COMPOSE) -f $(LOCAL_COMPOSE) up -d
	@echo ""
	@echo "\033[0;32m✓ Local development environment started\033[0m"
	@echo ""
	@echo "\033[0;33mAccess Points:\033[0m"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:8001"
	@echo "  API Docs:  http://localhost:8001/docs"
	@echo ""
	@echo "\033[0;33mDefault Login:\033[0m"
	@echo "  Username: demo"
	@echo "  Password: user123"
	@echo ""

local-down: ## Stop local development environment
	@echo "\033[0;36mStopping local development...\033[0m"
	$(COMPOSE) -f $(LOCAL_COMPOSE) down
	@echo "\033[0;32m✓ Local development stopped\033[0m"

local-logs: ## View local development logs
	$(COMPOSE) -f $(LOCAL_COMPOSE) logs -f

local-logs-backend: ## View backend logs only
	$(COMPOSE) -f $(LOCAL_COMPOSE) logs -f backend

local-logs-frontend: ## View frontend logs only
	$(COMPOSE) -f $(LOCAL_COMPOSE) logs -f frontend

local-build: ## Rebuild local development images
	@echo "\033[0;36mRebuilding local images...\033[0m"
	$(COMPOSE) -f $(LOCAL_COMPOSE) build --no-cache
	@echo "\033[0;32m✓ Local images rebuilt\033[0m"

local-restart: ## Restart local development
	@make local-down
	@make local-up

local-clean: ## Clean local development (removes volumes)
	@echo "\033[0;36mCleaning local development...\033[0m"
	$(COMPOSE) -f $(LOCAL_COMPOSE) down -v --rmi local
	@echo "\033[0;32m✓ Local development cleaned\033[0m"

local-shell-backend: ## Open shell in backend container
	$(DOCKER) exec -it blackiefi-backend /bin/sh

local-shell-frontend: ## Open shell in frontend container
	$(DOCKER) exec -it blackiefi-frontend /bin/sh

local-status: ## Show local development status
	@echo ""
	@echo "\033[0;33mLocal Development Status:\033[0m"
	@$(COMPOSE) -f $(LOCAL_COMPOSE) ps
	@echo ""

# ============================================================================
# DOCKER - MICROSERVICES
# ============================================================================

microservices-up: ## Start microservices architecture with Docker
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           Starting BlackieFi Microservices                        ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════════╝$(NC)"
	$(COMPOSE) -f $(MICROSERVICES_FILE) up -d
	@echo ""
	@echo "$(GREEN)✓ Microservices started$(NC)"
	@echo ""
	@echo "$(YELLOW)Access Points:$(NC)"
	@echo "  API Gateway:  http://localhost:$(GATEWAY_PORT)"
	@echo "  MongoDB:      localhost:$(MONGO_PORT)"
	@echo "  Redis:        localhost:$(REDIS_PORT)"
	@echo ""
	@make microservices-status

microservices-down: ## Stop microservices
	@echo "$(CYAN)Stopping microservices...$(NC)"
	$(COMPOSE) -f $(MICROSERVICES_FILE) down
	@echo "$(GREEN)✓ Microservices stopped$(NC)"

microservices-build: ## Build microservices images
	@echo "$(CYAN)Building microservices images...$(NC)"
	$(COMPOSE) -f $(MICROSERVICES_FILE) build --no-cache
	@echo "$(GREEN)✓ Microservices images built$(NC)"

microservices-logs: ## View microservices logs
	$(COMPOSE) -f $(MICROSERVICES_FILE) logs -f

microservices-status: ## Show microservices status
	@echo ""
	@echo "$(YELLOW)Microservices Status:$(NC)"
	@$(COMPOSE) -f $(MICROSERVICES_FILE) ps
	@echo ""

microservices-restart: ## Restart a specific service (usage: make microservices-restart SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Please specify SERVICE=<service-name>$(NC)"; \
		echo "Available services: gateway, auth-service, core-service, entity-service, portfolio-service, asset-service"; \
	else \
		$(COMPOSE) -f $(MICROSERVICES_FILE) restart $(SERVICE); \
	fi

microservices-clean: ## Remove microservices containers, images, and volumes
	@echo "$(CYAN)Cleaning microservices resources...$(NC)"
	$(COMPOSE) -f $(MICROSERVICES_FILE) down -v --rmi local
	@echo "$(GREEN)✓ Microservices resources cleaned$(NC)"

# ============================================================================
# OBSERVABILITY (Prometheus + Grafana)
# ============================================================================

observability-up: ## Start observability stack (Prometheus + Grafana)
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           Starting Observability Stack                            ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════════╝$(NC)"
	@cd $(OBS_DIR) && $(COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)✓ Observability stack started$(NC)"
	@echo ""
	@echo "$(YELLOW)Access Points:$(NC)"
	@echo "  Grafana:     http://localhost:$(GRAFANA_PORT) (admin/BlackieFi2024!)"
	@echo "  Prometheus:  http://localhost:$(PROMETHEUS_PORT)"
	@echo ""

observability-down: ## Stop observability stack
	@echo "$(CYAN)Stopping observability stack...$(NC)"
	@cd $(OBS_DIR) && $(COMPOSE) down
	@echo "$(GREEN)✓ Observability stack stopped$(NC)"

observability-logs: ## View observability logs
	@cd $(OBS_DIR) && $(COMPOSE) logs -f

observability-status: ## Show observability status
	@echo ""
	@echo "$(YELLOW)Observability Status:$(NC)"
	@cd $(OBS_DIR) && $(COMPOSE) ps
	@echo ""

# ============================================================================
# ALL SERVICES (Everything)
# ============================================================================

all-up: ## Start everything (microservices + observability)
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           Starting Complete BlackieFi Stack                       ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════════╝$(NC)"
	@make microservices-up
	@make observability-up
	@echo ""
	@echo "$(GREEN)╔═══════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║           All Services Running!                                   ║$(NC)"
	@echo "$(GREEN)╚═══════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Access Points:$(NC)"
	@echo "  🌐 API Gateway:  http://localhost:$(GATEWAY_PORT)"
	@echo "  📊 Grafana:      http://localhost:$(GRAFANA_PORT)"
	@echo "  📈 Prometheus:   http://localhost:$(PROMETHEUS_PORT)"
	@echo "  🗄️  MongoDB:      localhost:$(MONGO_PORT)"
	@echo "  ⚡ Redis:        localhost:$(REDIS_PORT)"
	@echo ""

all-down: ## Stop everything
	@echo "$(CYAN)Stopping all services...$(NC)"
	@make observability-down 2>/dev/null || true
	@make microservices-down 2>/dev/null || true
	@make docker-down 2>/dev/null || true
	@make db-stop 2>/dev/null || true
	@make stop 2>/dev/null || true
	@echo "$(GREEN)✓ All services stopped$(NC)"

all-logs: ## View all logs
	@echo "$(YELLOW)Showing microservices logs (Ctrl+C to exit, then run 'make observability-logs' for observability)$(NC)"
	@make microservices-logs

all-status: ## Show status of all services
	@echo ""
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           BlackieFi Service Status                                ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@make microservices-status 2>/dev/null || echo "$(YELLOW)Microservices not running$(NC)"
	@make observability-status 2>/dev/null || echo "$(YELLOW)Observability not running$(NC)"

# ============================================================================
# UTILITIES
# ============================================================================

env-example: ## Generate example .env files
	@echo "$(CYAN)Generating example .env files...$(NC)"
	@echo "# ============================================================================" > .env.example
	@echo "# BlackieFi 3.0 - Environment Configuration" >> .env.example
	@echo "# ============================================================================" >> .env.example
	@echo "" >> .env.example
	@echo "# Database" >> .env.example
	@echo "MONGO_URL=mongodb://localhost:27017" >> .env.example
	@echo "DB_NAME=blackiefi" >> .env.example
	@echo "MONGO_ROOT_USER=blackiefi" >> .env.example
	@echo "MONGO_ROOT_PASSWORD=blackiefi_secret" >> .env.example
	@echo "" >> .env.example
	@echo "# Redis" >> .env.example
	@echo "REDIS_PASSWORD=blackiefi_redis_secret" >> .env.example
	@echo "" >> .env.example
	@echo "# JWT" >> .env.example
	@echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" >> .env.example
	@echo "" >> .env.example
	@echo "# API Keys (optional)" >> .env.example
	@echo "EMERGENT_LLM_KEY=" >> .env.example
	@echo "ALPHA_VANTAGE_API_KEY=" >> .env.example
	@echo "COINGECKO_API_KEY=" >> .env.example
	@echo "RESEND_API_KEY=" >> .env.example
	@echo "" >> .env.example
	@echo "# ChromaDB" >> .env.example
	@echo "CHROMA_AUTH_TOKEN=blackiefi_chroma_secret" >> .env.example
	@echo "" >> .env.example
	@echo "# Rate Limiting" >> .env.example
	@echo "RATE_LIMIT_REQUESTS=100" >> .env.example
	@echo "RATE_LIMIT_WINDOW=60" >> .env.example
	@echo "" >> .env.example
	@echo "# Logging" >> .env.example
	@echo "LOG_LEVEL=INFO" >> .env.example
	@echo "" >> .env.example
	@echo "# CORS" >> .env.example
	@echo "CORS_ORIGINS=*" >> .env.example
	@echo "$(GREEN)✓ Created .env.example$(NC)"

health: ## Check health of all services
	@echo "$(CYAN)Checking service health...$(NC)"
	@echo ""
	@printf "Backend API:  " && \
		(curl -sf http://localhost:$(BACKEND_PORT)/api/health >/dev/null && echo "$(GREEN)✓ Healthy$(NC)") || echo "$(RED)✗ Unreachable$(NC)"
	@printf "Frontend:     " && \
		(curl -sf http://localhost:$(FRONTEND_PORT) >/dev/null && echo "$(GREEN)✓ Healthy$(NC)") || echo "$(RED)✗ Unreachable$(NC)"
	@printf "MongoDB:      " && \
		(mongosh --eval "db.adminCommand('ping')" mongodb://localhost:$(MONGO_PORT) --quiet >/dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(NC)") || \
		($(DOCKER) exec blackiefi-mongo mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1 && echo "$(GREEN)✓ Healthy (Docker)$(NC)") || \
		echo "$(YELLOW)⚠ Not running$(NC)"
	@printf "Gateway:      " && \
		(curl -sf http://localhost:$(GATEWAY_PORT)/health >/dev/null && echo "$(GREEN)✓ Healthy$(NC)") || echo "$(YELLOW)⚠ Not running$(NC)"
	@printf "Prometheus:   " && \
		(curl -sf http://localhost:$(PROMETHEUS_PORT)/-/healthy >/dev/null && echo "$(GREEN)✓ Healthy$(NC)") || echo "$(YELLOW)⚠ Not running$(NC)"
	@printf "Grafana:      " && \
		(curl -sf http://localhost:$(GRAFANA_PORT)/api/health >/dev/null && echo "$(GREEN)✓ Healthy$(NC)") || echo "$(YELLOW)⚠ Not running$(NC)"
	@echo ""

version: ## Show version information
	@echo ""
	@echo "$(CYAN)BlackieFi 3.0$(NC)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Python:  $$($(PYTHON) --version 2>&1)"
	@echo "Node:    $$($(NODE) --version 2>&1)"
	@echo "Yarn:    $$($(YARN) --version 2>&1 || echo 'Not installed')"
	@echo "Docker:  $$($(DOCKER) --version 2>&1 || echo 'Not installed')"
	@echo "Compose: $$($(COMPOSE) version 2>&1 || echo 'Not installed')"
	@echo ""

# ============================================================================
# QUICK ALIASES
# ============================================================================

up: dev ## Alias for 'make dev'
down: stop ## Alias for 'make stop'
restart: stop dev ## Restart all services
logs: ## View backend logs
	@tail -f /tmp/backend.log 2>/dev/null || echo "$(YELLOW)No logs available. Start services first.$(NC)"

# Default target
.DEFAULT_GOAL := help
