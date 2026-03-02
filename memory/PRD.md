# BlackieFi 3.0 - Institutional-Grade Wealth Management Platform

## Vision Statement
BlackieFi 3.0 is a secure, institutional-grade wealth management and research platform built on a microservices architecture with an AI Investment Co-Pilot to support rigorous research, analysis, monitoring, and governance of multi-asset portfolios.

## Original Problem Statement
Migrate an existing application from the `base44` platform to a new technology stack (Python/FastAPI, React, MongoDB). Build a premium personal finance management app with a luxury dark theme featuring 18K gold (#D4AF37), silver/chrome, and obsidian black (#050505).

## Product Requirements
1. **Microservices Architecture:** Containerized services with API Gateway, Auth, Core Domain services
2. **Institutional Security:** MFA, RBAC, encrypted secrets, audit logging, rate limiting
3. **AI Co-Pilot:** Multi-provider LLM support (Emergent, OpenRouter), Knowledge Lab, Strategy Studio
4. **Entity-Centric:** All data scoped to legal/organizational entities (LLCs, LPs)
5. **Multi-Asset Support:** Real Estate, Tax Liens, Private Equity, Precious Metals, Stocks
6. **Theme:** Luxury gold/black dark theme applied consistently

---

## Architecture (Phase 1 Implemented)

```
┌──────────────────────────────────────────────────────────────┐
│                    API GATEWAY (8080)                         │
│  Rate Limiting • Auth Enforcement • Request Routing           │
└──────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ AUTH (8001) │  │ CORE (8002) │  │  FRONTEND   │
    │   MFA/JWT   │  │  Business   │  │   React     │
    └─────────────┘  └─────────────┘  └─────────────┘
           │               │
           ▼               ▼
    ┌─────────────────────────────────────────────────────────┐
    │  MongoDB (27017)  │  Redis (6379)  │  ChromaDB (8000)   │
    └─────────────────────────────────────────────────────────┘
```

### Services Created (Phase 1)
- **API Gateway** (`/app/services/gateway/`) - Centralized routing, auth, rate limiting
- **Auth Service** (`/app/services/auth/`) - MFA (TOTP), JWT tokens, RBAC foundation
- **Core Service** (`/app/services/core/`) - Domain logic (entities, portfolios, assets)
- **Shared Config** (`/app/services/shared/`) - Secrets management pattern

### Infrastructure
- **docker-compose.microservices.yml** - Full containerized deployment
- **MongoDB** - Primary database (keeping existing for Phase 1)
- **Redis** - Caching, sessions, rate limiting
- **ChromaDB** - Vector store for AI/RAG

---

## What's Been Implemented

### February 28, 2026 - Enhanced Budget Planner ✅

Complete rewrite of the Budgets page with EveryDollar-inspired features for zero-based budgeting:

#### Zero-Based Budgeting Dashboard:
- **Income Tracking**: Monthly income displayed at top
- **Total Budgeted**: Sum of all category budgets
- **Left to Budget**: Income minus budgeted = $0 goal (every dollar has a job)
- **Visual indicator**: Green when balanced, blue when positive, red when over

#### Category-Based Budget Breakdown:
- **Grouped Categories**: Housing, Transportation, Food, Utilities, Healthcare, Personal, Entertainment, Debt Payments, Savings & Goals, Business, Other
- **Expandable Groups**: Click to expand/collapse category details
- **Progress Bars**: Visual spending vs planned with color coding (green → yellow → red)
- **Inline Editing**: Click on amount to edit budget directly

#### Drag-and-Drop Transaction Assignment:
- **Uncategorized Transactions**: "Needs Attention" section shows transactions without categories
- **Drag to Categorize**: Drag transactions to budget categories to assign them
- **Real-time Updates**: Spending updates immediately after categorization

#### Linked Data from Other Sections:
- **Savings Goals**: Shows active goals with monthly contribution amounts
- **Debt Payments**: Shows debts with minimum payment amounts
- **Upcoming Bills**: Shows bills with due dates and amounts
- **Available Funds**: Shows total balance across all accounts

#### Budget Templates:
- **50/30/20 Rule**: Quick budget based on needs (50%), wants (30%), savings (20%)
- **Copy Previous Month**: Start from last month's budget
- **Start Fresh**: Begin with blank budget

#### Modern Tile UI:
- Elevated cards with layered shadows
- Gold accent lines on featured elements
- Collapsible category groups with icons
- Consistent with Dashboard and Transactions styling

### February 28, 2026 - UI Enhancements ✅

#### Dashboard Enhancements:
- Elevated stat cards with layered shadows and gradient backgrounds
- Gold accent lines on featured Net Worth card with corner glow effect
- Refined pill badges ("This Month", "Positive/Negative")
- Inner tiles for transactions and goals with inset shadows

#### Transactions Page Enhancements:
- Added summary stat tiles (Total Income, Expenses, Net Flow)
- Modernized search and filter bar with consistent styling
- Transaction rows with raised inner-tile effect
- Color-coded type selector in modal (Expense/Income/Transfer)
- Backdrop blur on modal overlay

### December 27, 2025 - Notifications & Alert System ✅

#### New Pages Created:
- **Notifications** (`/notifications`) - Full notifications management UI with two tabs:
  - **Notifications Tab:** Lists all notifications with mark read/delete actions
  - **Settings Tab:** Comprehensive notification preferences

#### Notification Features:
- **Email Notifications:** Enable/disable toggle, test email functionality
- **Budget Alerts:** Toggle with configurable threshold slider (50-100%)
- **Bill Reminders:** Toggle with days-before-due-date dropdown (1/3/7/14/30 days)
- **Goal Milestones:** Toggle for 25%, 50%, 75%, 100% milestone notifications
- **Weekly Summary:** Toggle for weekly financial overview (Sundays)
- **Monthly Report:** Toggle for detailed monthly report (1st of month)

#### Backend Services:
- **Alert Service** (`/app/backend/services/alert_service.py`):
  - `check_budget_alerts()` - Monitors budgets vs spending, respects user threshold
  - `check_bill_reminders()` - Checks upcoming bills, respects user reminder days
  - `check_goal_milestones()` - Tracks goal progress for milestone notifications
  - `run_all_checks()` - Runs all alert checks at once

- **Notification Service** (`/app/backend/services/notification_service.py`):
  - Email templates for budget alerts, bill reminders, goal milestones, welcome
  - Resend integration for email delivery
  - Push notification storage in MongoDB

- **Automatic Budget Alerts:** When expense transactions are created, budget alerts automatically trigger in background

#### API Endpoints:
- `GET /api/notifications` - List notifications with filters
- `GET /api/notifications/unread-count` - Get unread notification count
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update user preferences
- `POST /api/notifications/check-alerts` - Manually trigger alert checks
- `POST /api/notifications/mark-read` - Mark specific notifications as read
- `POST /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/{id}` - Delete a notification
- `POST /api/notifications/send-test-email` - Send test email

#### Code Cleanup:
- ✅ Removed `/app/functions/` directory (old base44 TypeScript functions)
- ✅ Removed `/app/frontend-new/` empty directory
- ✅ Previously removed obsolete Go files

### December 27, 2025 - Complete Feature Migration ✅

#### New Pages Created:
1. **Calendar** (`/calendar`) - Financial calendar showing recurring transactions, debt payments, and bills
2. **Reports** (`/reports`) - 4 report types: Profit & Loss, Balance Sheet, Cash Flow, Budget vs Actual
3. **Import** (`/import`) - CSV and PDF bank statement import with auto-categorization
4. **Tax Planning** (`/tax-planning`) - AI-powered tax estimation and scenario planning
5. **Groups** (`/groups`) - Admin-only group management with member and entity access control
6. **Financial Settings** (`/financial-settings`) - Admin-only investment profile configuration

#### Backend Routes Created:
- `/api/bills` - Bill tracking and reminders
- `/api/reports` - Report generation and filter presets
- `/api/tax` - Tax scenario management
- `/api/groups` - Group-based access control (admin only)
- `/api/financial-profiles` - Investment settings (admin only)
- `/api/imports` - CSV/PDF import functionality
- `/api/ai` - AI functions (anomaly detection, forecasting, cost savings, etc.)
- `/api/notifications` - Notification management and alerts

#### AI Functions Implemented:
- `POST /api/ai/detect-anomalies` - Spending anomaly detection
- `POST /api/ai/forecast-cash-flow` - Cash flow forecasting
- `POST /api/ai/identify-cost-savings` - Cost saving opportunities
- `POST /api/ai/generate-budget` - AI budget generation
- `POST /api/ai/categorize-transaction` - Auto-categorization
- `POST /api/ai/generate-tags` - Tag generation
- `POST /api/ai/goal-recommendations` - Financial goal recommendations
- `POST /api/ai/estimate-tax` - Tax liability estimation
- `POST /api/ai/forecast-budget` - Budget forecasting
- `POST /api/ai/detect-bills` - Auto-detect recurring bills

### December 27, 2025 - Multi-LLM Integration System ✅
- LLM Service supporting OpenRouter, Emergent (Universal Key), Ollama
- Admin UI for provider configuration
- AI features use configurable LLM providers

### Previous Implementation
- ✅ Complete RESTful API with all CRUD operations
- ✅ JWT-based authentication
- ✅ 15 default financial categories seeded
- ✅ Luxury gold/black theme applied to all pages
- ✅ Modern card-based login page

---

## Testing Status
- **Backend:** 100% (15/15 notification tests passed)
- **Frontend:** 100% (all pages load and function correctly)
- **Test Reports:** `/app/test_reports/iteration_5.json`

---

## LLM Providers Supported

| Provider | Description | API Key Required | Local |
|----------|-------------|-----------------|-------|
| **Emergent** | Universal Key - GPT-5.2, Claude, Gemini | Yes (pre-configured) | No |
| **OpenRouter** | 300+ models via unified API | Yes | No |
| **Ollama** | Local LLMs, privacy-focused | No | Yes |

---

## Test Credentials
- **Admin User:** demo / user123 (role: admin)
- **Email:** demo@example.com

---

## Architecture
```
/app/backend/
├── server.py              # FastAPI main application
├── database.py            # MongoDB connection & seeding
├── models.py              # Pydantic models
├── auth.py                # JWT & password utilities
├── services/
│   ├── llm_service.py     # Multi-provider LLM service
│   ├── alert_service.py   # Budget/bill/goal alert monitoring
│   └── notification_service.py # Email & push notifications
└── routes/
    ├── admin_llm.py       # Admin LLM configuration
    ├── ai_functions.py    # AI-powered features
    ├── bills.py           # Bill management
    ├── reports.py         # Report generation
    ├── tax.py             # Tax planning
    ├── groups.py          # Group access control
    ├── financial_profiles.py # Investment settings
    ├── imports.py         # CSV/PDF import
    ├── notifications.py   # Notification management
    └── ... other routes

/app/frontend/
├── src/
│   ├── App.jsx            # Router with all routes
│   ├── api/client.js      # API client (750+ lines)
│   ├── components/
│   │   ├── Layout.jsx     # Sidebar with notification badge
│   │   └── AIInsights.jsx # Conditional AI insights widget
│   └── pages/
│       ├── Calendar.jsx       # Financial calendar
│       ├── Reports.jsx        # Report generation
│       ├── Import.jsx         # CSV/PDF import
│       ├── TaxPlanning.jsx    # Tax estimation
│       ├── Groups.jsx         # Group management
│       ├── FinancialSettings.jsx # Investment profile
│       ├── AdminSettings.jsx  # LLM configuration
│       ├── Notifications.jsx  # Notification management
│       └── ... 12 other pages
```

---

## Completed Tasks ✅
- [x] Multi-LLM Integration (OpenRouter, Emergent, Ollama)
- [x] Calendar page with recurring transactions/debts/bills
- [x] Reports page with 4 report types and CSV export
- [x] Import page with CSV/PDF upload functionality
- [x] Tax Planning page with AI estimation
- [x] Groups page for admin access control
- [x] Financial Settings page for investment profiles
- [x] All AI function endpoints with LLM integration
- [x] Complete navigation sidebar with admin section
- [x] **Notifications UI with full settings management**
- [x] **Budget alert logic with automatic triggering**
- [x] **Weekly summary and monthly report preferences**
- [x] **Goal milestone notification support**
- [x] **Code cleanup - removed obsolete base44 code**
- [x] **Notification bell with unread count in sidebar**

## Remaining Tasks

### P1 - High Priority
- [ ] Wire up AI Insights to fetch real data when AI is enabled
- [ ] Configure Resend API key for actual email delivery
- [ ] Password recovery email flow

### P2 - Medium Priority
- [ ] Implement scheduled job for weekly/monthly summary emails
- [ ] Push notification infrastructure (web push or mobile)
- [ ] More comprehensive budget threshold levels

### P3 - Future Enhancements
- [ ] Multi-currency support
- [ ] Investment portfolio tracking integration
- [ ] Mobile app version
