# BlackieFi - Personal Finance Management Platform

A comprehensive personal/business finance management application built with:
- **Backend**: Go (Gin framework) + PostgreSQL
- **Frontend**: React + TanStack Query
- **Infrastructure**: Docker Compose + Makefile

## Features

- 💰 Multi-entity management (personal & business)
- 💳 Transaction tracking with categorization
- 📊 Budget planning and monitoring
- 📈 Investment portfolio tracking
- 📉 Debt management with payoff tracking
- 🎯 Financial goals with progress tracking
- 🏠 Asset registry with depreciation
- 📦 Inventory management
- 🤖 AI-powered insights (optional, multi-provider)
- 👥 Group/permission-based access control

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Make (optional, but recommended)

### Getting Started

1. **Clone and setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings if needed
   ```

2. **Start all services**:
   ```bash
   make build
   make up
   ```

3. **Seed the database** (optional, creates test data):
   ```bash
   make seed
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8080/api

### Test Credentials
- **Admin**: username=`admin`, password=`admin123`
- **User**: username=`testuser`, password=`user123`

## Make Commands

| Command | Description |
|---------|-------------|
| `make build` | Build Docker images |
| `make up` | Start all services |
| `make down` | Stop all services |
| `make logs` | View all logs |
| `make logs-backend` | View backend logs |
| `make migrate` | Run database migrations |
| `make seed` | Seed database with test data |
| `make clean` | Remove all containers and volumes |
| `make shell-db` | Open PostgreSQL shell |
| `make shell-backend` | Open backend container shell |

## Project Structure

```
blackiefi/
├── backend/                 # Go backend
│   ├── cmd/                 # Application entry point
│   ├── internal/
│   │   ├── config/          # Configuration
│   │   ├── database/        # DB connection, migrations, seed
│   │   ├── handlers/        # HTTP handlers
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic (AI service)
│   │   └── utils/           # Utilities (JWT, password)
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
├── frontend/                # React frontend
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth & Entity contexts
│   │   └── pages/           # Page components
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── Makefile
└── .env.example
```

## AI Integration

AI features are **disabled by default**. To enable:

1. **System-wide**: Admin must enable in Settings > System
2. **Per account**: Each user can enable in Settings > AI

### Supported LLM Providers
- OpenAI (set `OPENAI_API_KEY`)
- Anthropic (set `ANTHROPIC_API_KEY`)
- Google AI (set `GOOGLE_AI_API_KEY`)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset` - Reset password
- `GET /api/auth/me` - Get current user

### Core Resources (all require auth)
- `/api/entities` - Personal/business entities
- `/api/accounts` - Bank accounts
- `/api/categories` - Transaction categories
- `/api/transactions` - Income/expense transactions
- `/api/recurring` - Recurring transactions
- `/api/budgets` - Monthly budgets
- `/api/debts` - Debt tracking
- `/api/investment-vehicles` - Investment accounts
- `/api/investment-holdings` - Investment holdings
- `/api/assets` - Physical assets
- `/api/inventory` - Inventory items
- `/api/goals` - Financial goals
- `/api/settings` - System settings

## Development

### Running locally (without Docker)

1. **Start PostgreSQL**:
   ```bash
   make dev  # Starts only PostgreSQL
   ```

2. **Run backend**:
   ```bash
   cd backend
   go run cmd/main.go serve
   ```

3. **Run frontend**:
   ```bash
   cd frontend
   npm start
   ```

## License

MIT
