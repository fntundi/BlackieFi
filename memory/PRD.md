# BlackieFi - Personal Finance Management Platform

## Original Problem Statement
Migrate an existing application from the `base44` platform to a new technology stack consisting of a FastAPI backend, React frontend, and MongoDB database.

## Product Requirements
1. **AI Integration:** System-wide and per-account toggles for AI features (default: off). Support for OpenRouter LLM integration.
2. **Authentication:** Username/password based with mandatory email for password recovery.
3. **Seed Data:** Default categories for testing.
4. **Dark Mode:** Not required.

---

## What's Been Implemented (Feb 26, 2026)

### Backend (FastAPI + MongoDB)
- ✅ Complete RESTful API with all CRUD operations
- ✅ JWT-based authentication (register, login, profile, password reset)
- ✅ 15 default financial categories seeded on startup
- ✅ All entity routes: entities, accounts, categories, transactions
- ✅ Additional routes: recurring transactions, budgets, debts, investments, assets, inventory, goals
- ✅ Settings routes with system-wide and user-level AI toggles
- ✅ Proper MongoDB integration with indexes

### Frontend (React)
- ✅ Complete React frontend with all pages
- ✅ Environment variable configuration for API URL
- ✅ Authentication context and API client

### API Endpoints
| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/profile` | PUT | Update profile |
| `/api/auth/password-reset/*` | POST | Password reset flow |
| `/api/entities` | GET, POST | Entity management |
| `/api/entities/{id}` | GET, PUT, DELETE | Single entity |
| `/api/accounts` | GET, POST | Account management |
| `/api/categories` | GET, POST | Category management |
| `/api/transactions` | GET, POST | Transaction management |
| `/api/recurring` | GET, POST | Recurring transactions |
| `/api/budgets` | GET, POST | Budget management |
| `/api/debts` | GET, POST | Debt tracking |
| `/api/investments/vehicles` | GET, POST | Investment vehicles |
| `/api/investments/holdings` | GET, POST | Investment holdings |
| `/api/assets` | GET, POST | Asset management |
| `/api/inventory` | GET, POST | Inventory tracking |
| `/api/goals` | GET, POST | Financial goals |
| `/api/settings` | GET, PUT | System settings |
| `/api/settings/ai-status` | GET | AI status check |

---

## Test Credentials
- **Username:** demo
- **Password:** demo12345
- **Email:** demo@example.com

---

## Current Status
- ✅ Backend API fully functional (verified via curl)
- ✅ Frontend compiling and running
- ⚠️ External preview URL having platform routing issues

---

## Architecture
```
/app/backend/
├── server.py          # FastAPI main application
├── database.py        # MongoDB connection & seeding
├── models.py          # Pydantic request/response models
├── auth.py            # JWT & password utilities
└── routes/
    ├── auth.py        # Authentication routes
    ├── entities.py    # Entity CRUD
    ├── accounts.py    # Account CRUD
    ├── categories.py  # Category CRUD
    ├── transactions.py # Transaction CRUD
    ├── recurring.py   # Recurring transactions
    ├── budgets.py     # Budget management
    ├── debts.py       # Debt tracking
    ├── investments.py # Investment vehicles & holdings
    ├── assets.py      # Asset management
    ├── inventory.py   # Inventory tracking
    ├── goals.py       # Financial goals
    └── settings.py    # System & AI settings

/app/frontend/
├── src/
│   ├── api/client.js  # API client
│   ├── pages/         # React page components
│   └── contexts/      # State management
└── .env               # Environment configuration
```

---

## Remaining Tasks

### P0 - Critical
- [ ] Verify external preview URL routing (platform infrastructure)

### P1 - High Priority
- [ ] End-to-end testing via testing agent
- [ ] OpenRouter LLM integration for AI features

### P2 - Medium Priority
- [ ] Password recovery email sending
- [ ] Frontend polish and UX improvements
- [ ] Remove old base44 code from /app/src

### P3 - Future
- [ ] AI-powered transaction categorization
- [ ] Budget recommendations
- [ ] Financial goal tracking with AI insights
