# BlackieFi 3.0 - Product Requirements Document

## Original Problem Statement
Transform BlackieFi into a comprehensive personal/business finance management platform with microservices architecture, AI-powered financial assistant, multi-currency support, MFA, notification system, data import/export, and RAG-based document Q&A.

## Architecture
- **Frontend**: React (Recharts, Lucide React, date-fns)
- **Backend (Preview)**: FastAPI monolith on port 8001 (server.py ~2600 lines)
- **Backend (Docker)**: 5 Python microservices + Node.js gateway + Nginx edge
- **Database**: MongoDB | **Cache**: Redis | **Vector DB**: ChromaDB | **AI**: Ollama
- **Theme**: Dark navy blue + amber/gold accent | **Font**: Plus Jakarta Sans

## Microservices Architecture
```
Nginx (8080) -> Gateway App (Node.js 8000) -> Auth (8001) | Core (8002) | Entity (8003) | Portfolio (8004) | Assets (8005)
All services -> MongoDB (27017) + Redis (6379) + ChromaDB (8000) | Core -> Ollama (11434)
```

## Service Responsibilities
- **Auth (8001)**: Login, register, logout, password reset/change, MFA (TOTP)
- **Core (8002)**: Health, dashboard, AI chat/insights/categorize, notifications, currency, data import/export, RAG Q&A, categories, roles, calendar, onboarding, WebSocket
- **Entity (8003)**: Entity CRUD, user invitation, role management
- **Portfolio (8004)**: Accounts, income, expenses, debts, transactions, budgets, savings, investments (vehicles + holdings), debt payoff estimator, budget variance
- **Assets (8005)**: Physical asset CRUD + summary

## Implemented Features

### Phase 1 - Core Financial (Complete)
- [x] JWT auth with login/register/logout
- [x] Auto-create personal entity on registration
- [x] 3 default roles (Admin, Power User, Regular User) with 20+ permissions
- [x] Entity switcher (personal + business)
- [x] Income tracking, expense tracking, debt management
- [x] Account management, investment tracking
- [x] Monthly budgets, savings goals, calendar view
- [x] Transaction history with search/filter/sort
- [x] Debt payoff estimator (avalanche/snowball)
- [x] Budget variance reporting
- [x] Password reset flow

### Phase 2 - Microservices Architecture (Complete)
- [x] Docker Compose with 13 services
- [x] Nginx edge gateway (rate limiting, CORS, TLS)
- [x] Node.js gateway (JWT validation, correlation IDs, proxy routing)
- [x] All Dockerfiles lock-file-free
- [x] Makefile lifecycle (up, down, build, reset, clean, etc.)

### Phase 3 - New Features (Complete - Feb 2026)
- [x] **AI/Ollama Integration**: Chat assistant, financial insights, auto-categorization; default OFF; Ollama as fallback LLM
- [x] **MFA/TOTP**: Enable/disable via Settings; QR code for Google Authenticator; MFA-guarded login flow
- [x] **Notification System**: In-app bell with unread count; mark read/all-read; upcoming bill reminders; WebSocket real-time push
- [x] **Data Import/Export**: CSV import (transactions, expenses, income); CSV/JSON export per type; full data export
- [x] **Multi-Currency**: 34 currencies (incl. BTC/ETH); static exchange rates; user-configurable base currency; built-in converter
- [x] **RAG Document Q&A**: Upload .txt/.csv/.md/.json; chunk-based indexing (MongoDB fallback + ChromaDB when available); AI-powered Q&A
- [x] **WebSocket Notifications**: Real-time push via WebSocket; polling fallback for preview

### Phase 3 - Business Logic Migration (Complete)
- [x] All financial CRUD migrated to portfolio service (income, expenses, debts, transactions, budgets, savings, investments)
- [x] Auth service with full MFA support
- [x] Core service with AI, notifications, currency, data, RAG, dashboard
- [x] Entity service with user management
- [x] Assets service with CRUD + summary
- [x] Gateway routing for all new service endpoints

## Testing Status
- Backend: 31/31 API tests pass (iteration_4) + 28/28 new feature tests pass (iteration_5) + 14/14 bill pay & roles tests (iteration_6) = 100%
- Frontend: All 24 pages verified (100%)
- Test reports: /app/test_reports/iteration_4.json, /app/test_reports/iteration_5.json, /app/test_reports/iteration_6.json
- No regressions in existing features

## Demo Credentials
- Email: demo@blackiefi.com | Password: Demo123!

## Frontend Pages (24 total)
Dashboard, Income, Expenses, Debts, Transactions, Accounts, Investments, Portfolio Analytics, Budget, Budget Variance, Debt Payoff, Recurring, Bill Pay, Calendar, Savings Goals, Multi-Entity, AI Assistant, Document Q&A, Notifications, Import/Export, PDF Reports, Audit Log, Settings (7 tabs), Onboarding

## Maintenance (Dec 2025)
- [x] Fixed pydantic dependency conflict (`pydantic[email]>=2.9.0` for google-genai compatibility)
- [x] Fixed httpx dependency (`httpx>=0.28.1` for google-genai compatibility)
- [x] Added deprecation notice to monolithic server.py with microservices migration guide
- [x] Server.py now clearly documented as preview-only; production uses docker-compose microservices

## Feature Release (April 2026) - P1/P2 Features Complete
### Portfolio Analytics (P1) - COMPLETE
- [x] Line chart: Net worth over time (configurable 6/12/24 months)
- [x] Pie chart: Asset allocation breakdown (checking, savings, investment vehicles)
- [x] Bar chart: Monthly income vs expenses comparison
- [x] Summary cards: Net worth, total cash, investments, investment gain/loss percentage

### Recurring Transaction Auto-Generation (P1) - COMPLETE
- [x] Status dashboard showing due income, expenses, and debt payments
- [x] One-click "Process All Due" button to auto-generate transactions
- [x] Auto-advance next due dates based on frequency
- [x] Settings: Enable auto-processing at midnight UTC, configurable notification days

### Audit Log Viewer (P1) - COMPLETE
- [x] Filterable by action type, resource type, date range
- [x] Pagination with 25 items per page
- [x] User name/email enrichment
- [x] Action badges (color-coded: create=green, delete=red, update=blue, auto=amber)

### Multi-Tenancy Improvements (P2) - COMPLETE
- [x] Cross-entity summary with combined net worth
- [x] Entity comparison chart (horizontal bar) showing monthly income/expenses
- [x] Entity cards with cash/investments/debt/net worth breakdown
- [x] One-click entity switching from cross-entity view

### PDF Export with Charts (P2) - COMPLETE
- [x] Dashboard PDF: Summary table + asset allocation pie chart
- [x] Transactions PDF: Filterable by date range + income/expense summary
- [x] Portfolio PDF: Holdings table + vehicle allocation pie chart
- [x] Server-side generation using reportlab + matplotlib

### Mobile PWA Wrapper (P2) - COMPLETE
- [x] manifest.json with app name, icons, theme colors, shortcuts
- [x] Service worker with network-first caching strategy
- [x] Offline fallback for cached static assets
- [x] Apple/Android meta tags for install prompt

### Automated Bill Pay Scheduling (P2) - COMPLETE (April 2026)
- [x] CRUD for bill pay schedules (create, read, update, delete)
- [x] Toggle enable/disable per schedule
- [x] Pay Now: Execute immediate payment from schedule
- [x] Process Due: Batch process all due bill payments
- [x] Payment history tracking with auto/manual badges
- [x] Stats cards: active schedules, due now, monthly total
- [x] Link schedules to accounts and categories
- [x] Configurable frequency (weekly, bi-weekly, monthly, quarterly, annually)

### Advanced Role Permission Editing UI (P1) - COMPLETE (April 2026)
- [x] Permission toggles grouped by category (Financial, Budgets & Savings, Investments, Administration, Other)
- [x] Toggle all permissions per group
- [x] Edit/Save/Cancel flow per role card
- [x] Create custom roles with default permissions
- [x] Delete custom (non-default) roles with safety checks
- [x] Visual glow effect on editing role card

### Server.py Cleanup (April 2026) - COMPLETE
- [x] Fixed 6 lint errors: multi-import split, unused variables removed, f-string placeholder fix
- [x] 0 lint errors remaining (ruff verified)

## P0 Backlog
- Integrate live exchange rate API (optional upgrade from static rates)
- Add email delivery for password reset tokens

## P1 Backlog (Cleared)
- ~~Portfolio analytics with historical charts~~ DONE
- ~~Recurring transaction auto-generation~~ DONE
- ~~Advanced role permission editing UI~~ DONE
- ~~Audit log viewer~~ DONE

## P2 Backlog (Cleared)
- ~~Multi-tenancy improvements~~ DONE
- ~~Advanced PDF export with charts~~ DONE
- ~~Mobile-optimized PWA wrapper~~ DONE
- ~~Automated bill pay scheduling~~ DONE

## Frontend Pages (24 total)
Dashboard, Income, Expenses, Debts, Transactions, Accounts, Investments, Portfolio Analytics, Budget, Budget Variance, Debt Payoff, Recurring, Bill Pay, Calendar, Savings Goals, Multi-Entity, AI Assistant, Document Q&A, Notifications, Import/Export, PDF Reports, Audit Log, Settings (7 tabs), Onboarding
