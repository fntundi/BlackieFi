# BlackieFi 3.0 - Product Requirements Document

## Original Problem Statement
Transform BlackieFi into a comprehensive personal/business finance management platform that helps individuals and small businesses track recurring expenses, total debt, income, investments, and budgets, with a calendar view of financial events and role-based access control. Mobile-first UI with responsive web/desktop support. Single-currency (USD), no bank integrations; all data user-entered.

## Architecture
- **Frontend**: React (with Recharts, Lucide React, date-fns)
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB
- **Theme**: Dark navy blue + amber/gold accent (inspired by faithntundi.com)
- **Auth**: JWT token-based, bcrypt password hashing
- **Fonts**: Plus Jakarta Sans

## Code Structure
```
/app
├── backend/server.py          # Complete FastAPI backend (~1600 lines)
├── frontend/src/
│   ├── App.js                 # Main shell: auth, sidebar nav, entity switcher
│   ├── App.css                # Dark navy/amber theme (~600 lines)
│   ├── lib/api.js             # Axios client with auth interceptor
│   └── pages/                 # Feature pages
│       ├── DashboardPage.jsx  # Unified + entity dashboards with charts
│       ├── IncomePage.jsx     # Income source CRUD + mark received
│       ├── ExpensesPage.jsx   # Expense CRUD + mark paid
│       ├── DebtsPage.jsx      # Debt CRUD + make payment + progress bars
│       ├── AccountsPage.jsx   # Account CRUD
│       ├── InvestmentsPage.jsx# Vehicles + holdings with pie chart
│       ├── BudgetPage.jsx     # Monthly budgets with bar chart + copy
│       ├── CalendarPage.jsx   # Month view with color-coded event dots
│       ├── SavingsFundsPage.jsx # Savings goals with progress bars
│       ├── SettingsPage.jsx   # Categories, roles, entity users, entities
│       └── OnboardingPage.jsx # 5-step setup wizard for new users
├── services/                  # Microservices scaffolding (Docker-based)
├── docker-compose.yml
└── Makefile
```

## What's Been Implemented (April 2026)

### Authentication & RBAC
- [x] JWT-based login/register/logout
- [x] Auto-create personal entity on registration
- [x] Three default roles: Admin, Power User, Regular User
- [x] Per-entity role assignment
- [x] Permission-based access control (20+ permissions)
- [x] Demo user auto-seeding (demo@blackiefi.com / Demo123!)

### Entity Management
- [x] Personal entity (auto-created)
- [x] Business entity creation
- [x] Entity switcher in sidebar
- [x] Invite users to entities
- [x] Role assignment per entity
- [x] User deactivation per entity

### Income Tracking
- [x] Add income sources (salary, freelance, rental, other)
- [x] Frequency: weekly, biweekly, semimonthly, monthly, quarterly, yearly
- [x] Mark income as received (creates transaction, advances next date)
- [x] Variable amount flag
- [x] CRUD operations

### Expense Tracking
- [x] Recurring and one-off expenses
- [x] Category assignment
- [x] Mark as paid (creates transaction, advances next date)
- [x] Monthly total displayed
- [x] CRUD operations

### Debt Management
- [x] Loan, credit card, line of credit tracking
- [x] Original amount, current balance, interest rate, minimum payment
- [x] Make payment (reduces balance, creates transaction)
- [x] Progress bar showing payoff %
- [x] CRUD operations

### Account Management
- [x] Checking, savings, credit card, investment, loan accounts
- [x] Balance tracking with auto-updates from transactions
- [x] Total balance display
- [x] CRUD operations

### Investment Tracking
- [x] Investment vehicles (401k, IRA, brokerage, crypto)
- [x] Holdings per vehicle (asset name, quantity, cost basis, current price)
- [x] Portfolio value calculation
- [x] Gain/loss display
- [x] Pie chart breakdown by vehicle
- [x] CRUD operations

### Budgeting
- [x] Monthly budgets per entity
- [x] Category-based planned spending
- [x] Year navigation + month selection grid
- [x] Copy budget to another month
- [x] Bar chart visualization
- [x] CRUD operations

### Calendar View
- [x] Month grid with day cells
- [x] Color-coded event dots (green=income, red=expense, orange=debt)
- [x] Auto-generated events from recurring items
- [x] Manual event creation
- [x] Day detail panel on click
- [x] Month navigation + Today button
- [x] Event type filters

### Savings Goals
- [x] Target amount + current amount tracking
- [x] Progress bars with percentage
- [x] Contribute to fund (creates transaction)
- [x] Target date tracking
- [x] CRUD operations

### Dashboard
- [x] Unified view (all entities) + per-entity view toggle
- [x] Net worth, total balance, total debt, investments stat cards
- [x] Income vs expenses summary
- [x] Upcoming paydays + upcoming bills
- [x] Budget utilization bar chart
- [x] Debt breakdown pie chart
- [x] Recent transactions list

### Settings & Admin
- [x] Categories management (view defaults, add custom, delete)
- [x] Roles & permissions display (admin, power_user, regular_user)
- [x] Entity users management (invite, change role)
- [x] Entity management (create business, delete)

### Onboarding
- [x] 5-step wizard for new users
- [x] Add income sources, expenses, debts, optional business
- [x] Skip option
- [x] Auto-marks onboarding complete

### Audit Trail
- [x] Logs creation of entities, accounts, income, expenses, debts

## Seeded Demo Data
- 3 accounts (Chase Checking, Marcus Savings, Amex Credit Card)
- 2 income sources (Employer Salary, Freelance Gigs)
- 5 expenses (Rent, Car Insurance, Netflix, Gym, Groceries)
- 2 debts (Auto Loan, Credit Card Balance)
- 1 investment vehicle (Fidelity 401k) with 2 holdings (AAPL, VTI)
- 1 savings fund (Vacation Fund)
- Current month budget with 6 categories
- 13 default categories

## Testing Status
- Backend: 42/42 tests pass (100%)
- Frontend: All navigation, CRUD, mobile, auth flows pass
- Test report: /app/test_reports/iteration_2.json

## P0 Backlog (Next Priority)
- Transaction history page with filtering/sorting
- Password reset flow
- Debt payoff estimator (with interest calculations)

## P1 Backlog
- Implement Ollama/AI integration in core service
- Advanced budget variance reporting (planned vs actual per category)
- Notification/reminder system for upcoming bills
- Data export (CSV/PDF)

## P2 Backlog
- Multi-currency support
- Portfolio analytics with historical charts
- MFA/TOTP authentication
- RAG-based document Q&A using ChromaDB
- Real-time notifications via WebSocket
- Audit log viewer UI
- Advanced role permission editing UI
