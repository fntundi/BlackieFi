# BlackieFi - Self-Hosted Financial Tracker

A comprehensive personal finance management application for tracking income, expenses, budgets, debts, and investments. Originally built on Base44, now fully self-hosted with Supabase (PostgreSQL) backend.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Development Guide](#-development-guide)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Deployment](#-deployment)

---

## ✨ Features

### Core Financial Management
- **Transaction Tracking** - Record income and expenses with categories
- **Recurring Transactions** - Automate regular payments and income
- **Budget Management** - Set and track budgets by category
- **Debt Tracking** - Monitor loans, credit cards, and payment plans
- **Investment Portfolio** - Track holdings across multiple accounts

### Organization
- **Multiple Entities** - Manage personal, business, and investment accounts separately
- **Categories** - Organize transactions with customizable categories
- **Calendar View** - Visualize financial events over time
- **Reports** - Generate insights and analytics

### AI-Powered Features (Optional)
- **Portfolio Analysis** - AI-driven investment recommendations
- **Budget Forecasting** - Predict future spending patterns
- **Debt Repayment Strategies** - Optimal payoff plans (snowball/avalanche)
- **Transaction Categorization** - Auto-categorize transactions
- **Market News Analysis** - Summarize relevant financial news

### Collaboration
- **Groups** - Share access with family members or business partners
- **Role-Based Access** - Owner, admin, member, and viewer roles

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BlackieFi App                            │
│                   (React + Vite + TailwindCSS)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Custom SDK Layer                           │
│              (Base44-compatible API interface)                  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Entities   │  │    Auth     │  │     Integrations        │ │
│  │   (CRUD)    │  │  (Supabase) │  │  (OpenAI, Email, etc.)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Backend                            │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │     Realtime     ││
│  │    DB    │  │ (GoTrue) │  │  (Files) │  │  (Subscriptions) ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, TailwindCSS 3 |
| UI Components | shadcn/ui, Radix UI, Lucide Icons |
| State Management | TanStack Query (React Query) |
| Backend | Supabase (PostgreSQL 15) |
| Authentication | Supabase Auth (GoTrue) |
| AI Integration | OpenAI GPT-4o (optional) |
| Containerization | Docker, Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- 4GB+ RAM available for Docker
- Ports 3000, 3001, 5432, 8000, 9000 available

### 1. Clone and Start

```bash
# Clone the repository
git clone <your-repo-url>
cd blackiefi

# Start all services
docker compose up -d
```

### 2. Wait for Services

```bash
# Check service status (wait until all show "healthy" or "running")
docker compose ps

# Or watch the logs
docker compose logs -f
```

Services typically take 30-60 seconds to fully initialize.

### 3. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **BlackieFi** | http://localhost:3000 | Main application |
| **Supabase Studio** | http://localhost:3001 | Database admin UI |
| **Inbucket** | http://localhost:9000 | Email testing inbox |

### 4. Login

Use the development account:
- **Email**: `dev@localhost.com`
- **Password**: `dev123456`

This account has admin privileges and is auto-created on first login.

---

## 💻 Development Guide

### Development Commands

#### Docker Compose Commands

```bash
# ─────────────────────────────────────────────────────────────────
# STARTING & STOPPING
# ─────────────────────────────────────────────────────────────────

# Start all services in background
docker compose up -d

# Start and watch logs
docker compose up

# Stop all services (preserves data)
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v

# Restart a specific service
docker compose restart app
docker compose restart db

# ─────────────────────────────────────────────────────────────────
# VIEWING LOGS
# ─────────────────────────────────────────────────────────────────

# View all logs (follow mode)
docker compose logs -f

# View specific service logs
docker compose logs -f app          # Frontend app
docker compose logs -f db           # PostgreSQL
docker compose logs -f kong         # API Gateway
docker compose logs -f auth         # Authentication
docker compose logs -f rest         # REST API (PostgREST)

# View last 100 lines
docker compose logs --tail=100 app

# ─────────────────────────────────────────────────────────────────
# SERVICE STATUS
# ─────────────────────────────────────────────────────────────────

# Check all service status
docker compose ps

# Check resource usage
docker stats

# ─────────────────────────────────────────────────────────────────
# DATABASE ACCESS
# ─────────────────────────────────────────────────────────────────

# Connect to PostgreSQL CLI
docker compose exec db psql -U postgres

# Run a SQL file
docker compose exec -T db psql -U postgres < my_script.sql

# Backup database
docker compose exec db pg_dump -U postgres postgres > backup.sql

# Restore database
docker compose exec -T db psql -U postgres < backup.sql

# ─────────────────────────────────────────────────────────────────
# REBUILDING
# ─────────────────────────────────────────────────────────────────

# Rebuild app after code changes
docker compose build app
docker compose up -d app

# Rebuild everything
docker compose build
docker compose up -d

# Force rebuild (no cache)
docker compose build --no-cache app
```

#### NPM Commands (Local Development)

```bash
# ─────────────────────────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────────────────────────

# Install dependencies
npm install

# ─────────────────────────────────────────────────────────────────
# DEVELOPMENT
# ─────────────────────────────────────────────────────────────────

# Start development server (with hot reload)
npm run dev

# Start on specific port
npm run dev -- --port 3000

# ─────────────────────────────────────────────────────────────────
# BUILDING
# ─────────────────────────────────────────────────────────────────

# Build for production
npm run build

# Preview production build locally
npm run preview

# ─────────────────────────────────────────────────────────────────
# CODE QUALITY
# ─────────────────────────────────────────────────────────────────

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

### Development Workflow

#### Making Frontend Changes

The app container mounts your source code, so changes are reflected immediately:

```bash
# 1. Make your code changes in src/

# 2. Changes auto-reload in browser (hot module replacement)

# 3. If HMR fails, restart the app container:
docker compose restart app
```

#### Making Database Schema Changes

```bash
# 1. Create a new migration file
touch supabase/migrations/004_my_changes.sql

# 2. Add your SQL changes to the file

# 3. Apply by resetting the database
docker compose down -v
docker compose up -d

# Or apply manually via Supabase Studio (http://localhost:3001)
```

#### Accessing the Database

```bash
# Option 1: PostgreSQL CLI
docker compose exec db psql -U postgres

# Common psql commands:
\dt                    # List tables
\d table_name          # Describe table
\x                     # Toggle expanded display
SELECT * FROM users;   # Query data
\q                     # Quit

# Option 2: Supabase Studio (recommended)
open http://localhost:3001
```

---

## ⚙️ Configuration

### Environment Variables

Create/edit `.env.local` in the project root:

```bash
# =============================================================================
# SUPABASE CONFIGURATION (Required)
# =============================================================================

# For local development with Docker (default)
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# For Supabase Cloud (production)
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# =============================================================================
# OPENAI CONFIGURATION (Optional - enables AI features)
# =============================================================================

# Set to "true" to enable AI-powered features
VITE_OPENAI_ENABLED=false

# Required when OPENAI_ENABLED=true
# Get your key at: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=

# Model selection (optional, defaults to gpt-4o-mini)
# Options: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
VITE_OPENAI_MODEL=gpt-4o-mini
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | - | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | No | - | Supabase service role key (for admin operations) |
| `VITE_OPENAI_ENABLED` | No | `false` | Enable AI features |
| `VITE_OPENAI_API_KEY` | When AI enabled | - | OpenAI API key |
| `VITE_OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model to use |

### Enabling AI Features

1. Get an OpenAI API key from https://platform.openai.com/api-keys

2. Update `.env.local`:
   ```bash
   VITE_OPENAI_ENABLED=true
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```

3. Restart the app:
   ```bash
   docker compose restart app
   ```

AI features include:
- Portfolio analysis and recommendations
- Budget forecasting
- Debt repayment strategy optimization
- Transaction auto-categorization
- Market news summarization

---

## 📁 Project Structure

```
blackiefi/
├── src/                          # Frontend source code
│   ├── api/
│   │   └── base44Client.js       # SDK client (Supabase wrapper)
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── BillReminders.jsx
│   │   ├── BudgetForecast.jsx
│   │   ├── DebtRepaymentAnalysis.jsx
│   │   ├── MarketNewsFeed.jsx
│   │   ├── PortfolioAnalysis.jsx
│   │   └── ...
│   ├── lib/
│   │   ├── supabase-client.js    # Supabase connection
│   │   ├── custom-sdk.js         # Base44-compatible SDK
│   │   ├── AuthContext.jsx       # Authentication context
│   │   └── utils.js              # Utility functions
│   ├── pages/                    # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Budgets.jsx
│   │   ├── Debts.jsx
│   │   ├── Investments.jsx
│   │   └── ...
│   ├── App.jsx                   # Main app component
│   ├── Layout.jsx                # App layout with navigation
│   └── main.jsx                  # Entry point
│
├── supabase/
│   └── migrations/               # Database migrations
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
│
├── docker/
│   └── kong.yml                  # API gateway configuration
│
├── docker-compose.yml            # Full local stack
├── docker-compose.simple.yml     # Simplified (Supabase Cloud)
├── Dockerfile                    # Production build
├── Dockerfile.dev                # Development build
├── nginx.conf                    # Production web server config
├── docker-entrypoint.sh          # Container startup script
│
├── .env.example                  # Environment template
├── .env.local                    # Local environment (git-ignored)
├── package.json                  # Node.js dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── README.md                     # This file
```

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────────┐
│    users    │       │   groups    │       │   user_memberships  │
├─────────────┤       ├─────────────┤       ├─────────────────────┤
│ id (PK)     │◄──────│ owner_id    │       │ id (PK)             │
│ email       │       │ name        │◄──────│ group_id (FK)       │
│ full_name   │       └─────────────┘       │ user_id (FK)        │
│ role        │◄────────────────────────────│ entity_id (FK)      │
└─────────────┘                             │ role                │
      │                                     └─────────────────────┘
      │
      ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────────────┐
│  entities   │       │ categories  │       │    transactions     │
├─────────────┤       ├─────────────┤       ├─────────────────────┤
│ id (PK)     │◄──────│ entity_id   │       │ id (PK)             │
│ user_id(FK) │       │ name        │◄──────│ category_id (FK)    │
│ name        │◄──────│ type        │       │ entity_id (FK)      │
│ type        │       │ color       │       │ date                │
│ currency    │       └─────────────┘       │ amount              │
└─────────────┘                             │ type                │
      │                                     │ description         │
      │                                     └─────────────────────┘
      │
      ├──────────────┬──────────────┬──────────────┐
      ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────────┐
│  budgets  │  │   debts   │  │recurring_ │  │investment_      │
│           │  │           │  │transactions│  │vehicles         │
├───────────┤  ├───────────┤  ├───────────┤  ├─────────────────┤
│ id (PK)   │  │ id (PK)   │  │ id (PK)   │  │ id (PK)         │
│ entity_id │  │ entity_id │  │ entity_id │  │ entity_id (FK)  │
│ name      │  │ name      │  │ name      │  │ name            │
│ amount    │  │ balance   │  │ amount    │  │ type            │
│ period    │  │ rate      │  │ frequency │  └─────────────────┘
└───────────┘  └───────────┘  └───────────┘          │
                                                     ▼
                                          ┌─────────────────────┐
                                          │ investment_holdings │
                                          ├─────────────────────┤
                                          │ id (PK)             │
                                          │ vehicle_id (FK)     │
                                          │ asset_name          │
                                          │ quantity            │
                                          │ cost_basis          │
                                          └─────────────────────┘
```

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | User accounts and profiles |
| `entities` | Financial entities (personal, business, investment accounts) |
| `categories` | Transaction categories (income/expense types) |
| `transactions` | Individual financial transactions |
| `recurring_transactions` | Scheduled recurring transactions |
| `budgets` | Budget allocations by category |
| `debts` | Debt tracking (loans, credit cards, etc.) |
| `investment_vehicles` | Investment accounts (401k, IRA, brokerage) |
| `investment_holdings` | Individual investment positions |
| `groups` | Shared access groups |
| `user_memberships` | Group membership assignments |

---

## 📡 API Reference

The SDK provides a Base44-compatible API interface:

### Entity Operations

```javascript
import { base44 } from '@/api/base44Client';

// List all records
const transactions = await base44.entities.Transaction.list();
const sorted = await base44.entities.Transaction.list('-date', 100);

// Filter records
const expenses = await base44.entities.Transaction.filter({ type: 'expense' });
const recent = await base44.entities.Transaction.filter(
  { entity_id: 'uuid' },
  '-date',
  50
);

// Get single record
const transaction = await base44.entities.Transaction.get('uuid');

// Create record
const newTransaction = await base44.entities.Transaction.create({
  entity_id: 'uuid',
  amount: 100.00,
  type: 'expense',
  description: 'Groceries',
  date: '2024-01-15'
});

// Update record
const updated = await base44.entities.Transaction.update('uuid', {
  amount: 150.00
});

// Delete record
await base44.entities.Transaction.delete('uuid');
```

### Authentication

```javascript
// Get current user
const user = await base44.auth.me();

// Login (development)
await base44.auth.login('dev');

// Login (OAuth)
await base44.auth.login('google');

// Logout
await base44.auth.logout();

// Check authentication status
const isAuth = await base44.auth.isAuthenticated();
```

### AI Integrations (requires OpenAI enabled)

```javascript
// Invoke LLM
const analysis = await base44.integrations.Core.InvokeLLM({
  prompt: 'Analyze this portfolio...',
  response_json_schema: { type: 'object', properties: {...} }
});

// Generate image
const image = await base44.integrations.Core.GenerateImage({
  prompt: 'A chart showing financial growth'
});

// Check if AI is enabled
const aiEnabled = base44.isOpenAIEnabled();
```

---

## 🔧 Troubleshooting

### Common Issues

#### Services won't start

```bash
# Check which services are failing
docker compose ps

# View logs for failing service
docker compose logs <service-name>

# Common fix: reset and restart
docker compose down -v
docker compose up -d
```

#### "Table does not exist" errors

```bash
# Migrations may not have run - reset database
docker compose down -v
docker compose up -d

# Or manually run migrations via Supabase Studio
open http://localhost:3001
```

#### Authentication issues

```bash
# Clear browser storage and retry
# Or restart auth service
docker compose restart auth
```

#### Port conflicts

```bash
# Check what's using the port
lsof -i :3000

# Use different ports in docker-compose.yml
# Or stop conflicting services
```

#### Database connection refused

```bash
# Wait for database to be healthy
docker compose ps

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Health Checks

```bash
# Check all services
docker compose ps

# Expected output - all should show "healthy" or "running":
# blackiefi-app       running
# blackiefi-db        healthy
# blackiefi-kong      running
# blackiefi-auth      healthy
# blackiefi-rest      healthy
# ...
```

### Getting Help

1. Check the logs: `docker compose logs -f`
2. Verify environment variables in `.env.local`
3. Try a fresh start: `docker compose down -v && docker compose up -d`
4. Check Supabase Studio for database issues: http://localhost:3001

---

## 🚢 Deployment

### Production Build

```bash
# Build production Docker image
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  -t blackiefi:latest .

# Run production container
docker run -d \
  -p 8080:8080 \
  --name blackiefi \
  blackiefi:latest
```

### Runtime Configuration

Override settings at runtime without rebuilding:

```bash
docker run -d \
  -p 8080:8080 \
  -e RUNTIME_SUPABASE_URL=https://prod.supabase.co \
  -e RUNTIME_SUPABASE_ANON_KEY=prod-anon-key \
  blackiefi:latest
```

### Deployment Checklist

- [ ] Create Supabase project (or self-host)
- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Build production image
- [ ] Deploy to your platform (K8s, ECS, Cloud Run, etc.)
- [ ] Configure domain and SSL
- [ ] Set up monitoring and backups

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Originally built on [Base44](https://base44.com)
- Migrated using [base44-to-supabase-sdk](https://github.com/Ai-Automators/base44-to-supabase-sdk)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Backend powered by [Supabase](https://supabase.com)
