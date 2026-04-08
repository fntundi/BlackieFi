# BlackieFi 3.0

Production-grade microservices architecture for financial asset management.

## Quick Start

```bash
# Start everything with one command
make up

# Access the application
# Frontend: http://localhost:3000
# Gateway:  http://localhost:8080
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx Gateway                            │
│                         (Port 8080)                              │
│  - TLS termination, Rate limiting, CORS, Request logging        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway App (Node.js)                       │
│                         (Port 8000)                              │
│  - JWT validation, Request enrichment, Correlation IDs          │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│   Auth    │ │   Core    │ │  Entity   │ │ Portfolio │ │  Assets   │
│  Service  │ │  Service  │ │  Service  │ │  Service  │ │  Service  │
│   :8001   │ │   :8002   │ │   :8003   │ │   :8004   │ │   :8005   │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
        │           │           │           │           │
        └───────────┴───────────┴───────────┴───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    MongoDB    │     │     Redis     │     │    ChromaDB   │
│    :27017     │     │     :6379     │     │     :8000     │
└───────────────┘     └───────────────┘     └───────────────┘
                                │
                                ▼
                      ┌───────────────┐
                      │    Ollama     │
                      │    :11434     │
                      └───────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 8080 | API Gateway - TLS, rate limiting, CORS |
| gateway-app | 8000 | App Gateway - Auth enforcement, routing |
| auth | 8001 | Authentication - JWT, sessions |
| core | 8002 | Core API - Legacy routes, AI features |
| entity | 8003 | Entity Management - LLCs, trusts |
| portfolio | 8004 | Portfolio - Accounts, holdings |
| assets | 8005 | Assets - Real estate, metals |

## Commands

```bash
make up        # Start all services
make down      # Stop all services
make logs      # Stream all logs
make reset     # Wipe data and restart clean
make status    # Check service health
make test-api  # Quick API test
```

## API Routes

All API routes go through the gateway at `http://localhost:8080`:

- `/api/auth/*` - Authentication endpoints
- `/api/entities/*` - Entity management
- `/api/accounts/*` - Portfolio/account management
- `/api/assets/*` - Asset management
- `/api/*` - Core/legacy endpoints

## Data Persistence

Data is persisted in the `./data` directory:
- `./data/mongo` - MongoDB data
- `./data/redis` - Redis data
- `./data/chroma` - ChromaDB embeddings
- `./data/ollama` - Ollama models

## Environment Configuration

Configuration is managed via `.env` file (auto-created from `.env.template`):

```bash
# Key configuration options
JWT_SECRET=your-secret-key
MONGO_DB=blackiefi
OLLAMA_MODEL=phi
```

## Build Lifecycle

Dockerfiles install all dependencies on **first build** (no lock files required):

```bash
make up          # First run: builds images, installs deps, starts services
make up          # Subsequent runs: uses cached layers, updates only changed deps
make build       # Build images without starting containers
make clean       # Full teardown — removes images, volumes, and local data
```

- **Python services**: `pip install -r requirements.txt` (shared across services)
- **Gateway app**: `npm install` from `package.json`
- **Frontend**: `yarn install` from `package.json`

No `yarn.lock`, `package-lock.json`, or `--frozen-lockfile` flags are used in any Dockerfile.

## Development

The system is designed for local development with zero external dependencies:
- All services run in Docker
- Hot reload not available in containerized mode
- Use `make logs-service SERVICE=auth` to debug specific services
- Use `make shell-<service>` to open a shell in any running container

## Tech Stack

- **Backend**: Python 3.11 (FastAPI + Uvicorn)
- **Gateway**: Node.js 20 (Express + TypeScript)
- **Frontend**: React (CRA + Tailwind CSS)
- **Database**: MongoDB 7.0
- **Cache**: Redis 7 (Alpine)
- **Vector DB**: ChromaDB
- **AI Runtime**: Ollama (phi model)
- **Edge Gateway**: Nginx (Alpine)
