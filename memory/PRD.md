# BlackieFi 3.0 - Product Requirements Document

## Original Problem Statement
Transform BlackieFi into a comprehensive personal/business finance management platform that helps individuals and small businesses track recurring expenses, total debt, income, investments, and budgets, with a calendar view of financial events and role-based access control. Mobile-first UI with responsive web/desktop support. Single-currency (USD), no bank integrations; all data user-entered.

## Architecture
- **Frontend**: React (with Recharts, Lucide React, date-fns)
- **Backend (Preview)**: FastAPI (Python) on port 8001 (monolithic server.py)
- **Backend (Docker)**: Microservices architecture with 5 Python services + Node.js gateway
- **Database**: MongoDB
- **Cache**: Redis
- **Vector DB**: ChromaDB
- **AI Runtime**: Ollama (phi model)
- **Edge Gateway**: Nginx
- **Theme**: Dark navy blue + amber/gold accent
- **Auth**: JWT token-based, bcrypt password hashing
- **Fonts**: Plus Jakarta Sans

## Microservices Architecture (Docker)
```
Nginx (8080) -> Gateway App (Node.js, 8000) -> Auth (8001) | Core (8002) | Entity (8003) | Portfolio (8004) | Assets (8005)
                                                All services -> MongoDB (27017) + Redis (6379) + ChromaDB (8000)
                                                Core -> Ollama (11434)
```

## Code Structure
```
/app
├── backend/server.py          # Monolithic backend for preview (~1950 lines)
├── frontend/src/
│   ├── App.js                 # Auth, sidebar nav, entity switcher
│   ├── App.css                # Dark navy/amber theme
│   ├── lib/api.js             # Axios client with auth interceptor
│   └── pages/                 # Feature pages (Dashboard, Income, Expenses, etc.)
├── services/                  # Docker microservices
│   ├── auth/                  # Auth service (port 8001)
│   ├── core/                  # Core service (port 8002)
│   ├── entity/                # Entity service (port 8003)
│   ├── portfolio/             # Portfolio service (port 8004)
│   ├── assets/                # Assets service (port 8005)
│   ├── gateway-app/           # Node.js API gateway (port 8000)
│   └── shared/                # Shared Python modules
├── infrastructure/
│   ├── nginx.conf             # Nginx edge gateway config
│   ├── mongo-init.js          # MongoDB initialization
│   └── ollama-init.sh         # Ollama model pull
├── docker-compose.yml         # Full orchestration (13 services)
├── Makefile                   # Build lifecycle management
├── .env.template              # Environment variable template
└── .dockerignore              # Docker build exclusions
```

## What's Been Implemented

### Authentication & RBAC
- [x] JWT-based login/register/logout
- [x] Auto-create personal entity on registration
- [x] Three default roles: Admin, Power User, Regular User
- [x] Per-entity role assignment
- [x] Permission-based access control (20+ permissions)
- [x] Demo user auto-seeding (demo@blackiefi.com / Demo123!)
- [x] Password reset flow
- [x] Password change

### Entity Management
- [x] Personal entity (auto-created)
- [x] Business entity creation
- [x] Entity switcher in sidebar
- [x] Invite users to entities
- [x] Role assignment per entity

### Financial Features
- [x] Income tracking (salary, freelance, etc.)
- [x] Expense tracking (recurring and one-off)
- [x] Debt management with payments
- [x] Account management (checking, savings, credit card, etc.)
- [x] Investment tracking (vehicles + holdings)
- [x] Monthly budgets with bar chart
- [x] Savings goals with progress bars
- [x] Calendar view with color-coded events
- [x] Transaction history with search/filter/sort
- [x] Debt payoff estimator (avalanche/snowball)
- [x] Budget variance reporting

### Dashboard
- [x] Unified + per-entity views
- [x] Net worth, balances, debt, investments
- [x] Budget utilization, debt breakdown charts
- [x] Recent transactions

### Microservices Architecture (Feb 2026)
- [x] Docker Compose with 13 services
- [x] Nginx edge gateway (rate limiting, CORS, TLS termination)
- [x] Node.js gateway app (JWT validation, correlation IDs, routing)
- [x] 5 Python microservices (auth, core, entity, portfolio, assets)
- [x] MongoDB, Redis, ChromaDB, Ollama data/AI layers
- [x] Dockerfiles with NO lock file dependencies
- [x] Makefile lifecycle management (up, down, build, reset, clean, etc.)
- [x] .env.template with all required variables
- [x] .dockerignore for optimized builds
- [x] Health checks on all services

## Testing Status
- Infrastructure: 25/25 tests pass (100%)
- Preview API: 6/6 tests pass (100%)
- Frontend: Login and dashboard verified working
- Test reports: /app/test_reports/iteration_3.json

## Seeded Demo Data
- 3 accounts, 2 income sources, 5 expenses, 2 debts
- 1 investment vehicle with 2 holdings, 1 savings fund
- Current month budget with 6 categories, 13 default categories

## P0 Backlog (Next Priority)
- Migrate full business logic from server.py into microservices
- Implement Ollama AI integration in core service

## P1 Backlog
- Notification/reminder system for upcoming bills
- Data export (CSV/PDF)
- Settings page improvements

## P2 Backlog
- Multi-currency support
- Portfolio analytics with historical charts
- MFA/TOTP authentication
- RAG-based document Q&A using ChromaDB
- Real-time notifications via WebSocket
- Audit log viewer UI
