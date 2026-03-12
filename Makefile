.PHONY: help build up down logs restart clean migrate seed test dev

# Default target
help:
	@echo "BlackieFi - Personal Finance Management"
	@echo ""
	@echo "Usage:"
	@echo "  make build        - Build all Docker images"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-db      - View database logs"
	@echo "  make clean        - Remove all containers and volumes"
	@echo "  make migrate      - Run database migrations"
	@echo "  make seed         - Seed database with test data"
	@echo "  make test         - Run tests"
	@echo "  make dev          - Start development environment"
	@echo "  make shell-backend - Open shell in backend container"
	@echo "  make shell-db     - Open psql shell in database"

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Restart all services
restart:
	docker-compose restart

# View all logs
logs:
	docker-compose logs -f

# View backend logs
logs-backend:
	docker-compose logs -f backend

# View database logs
logs-db:
	docker-compose logs -f postgres

# Clean everything
clean:
	docker-compose down -v --rmi local
	@echo "Cleaned up all containers and volumes"

# Run migrations
migrate:
	docker-compose exec backend /app/blackiefi migrate

# Seed database
seed:
	docker-compose exec backend /app/blackiefi seed

# Run tests
test:
	docker-compose exec backend go test ./...

# Development mode with hot reload
dev:
	docker-compose up postgres -d
	@echo "PostgreSQL started. Run backend and frontend separately for hot reload."
	@echo "Backend: cd backend && go run cmd/main.go"
	@echo "Frontend: cd frontend && npm start"

# Open shell in backend
shell-backend:
	docker-compose exec backend /bin/sh

# Open psql shell
shell-db:
	docker-compose exec postgres psql -U blackiefi -d blackiefi

# Format Go code
fmt:
	cd backend && go fmt ./...

# Lint Go code
lint:
	cd backend && golangci-lint run
