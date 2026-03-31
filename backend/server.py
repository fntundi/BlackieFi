"""
BlackieFi - Personal Finance Management API
FastAPI backend for the Emergent platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes.auth import router as auth_router
from routes.entities import router as entities_router
from routes.accounts import router as accounts_router
from routes.categories import router as categories_router
from routes.transactions import router as transactions_router
from routes.recurring import router as recurring_router
from routes.budgets import router as budgets_router
from routes.debts import router as debts_router
from routes.investments import router as investments_router
from routes.assets import router as assets_router
from routes.inventory import router as inventory_router
from routes.goals import router as goals_router
from routes.settings import router as settings_router
from routes.admin_llm import router as admin_llm_router
from routes.admin_users import router as admin_users_router
from routes.bills import router as bills_router
from routes.reports import router as reports_router
from routes.tax import router as tax_router
from routes.groups import router as groups_router
from routes.financial_profiles import router as profiles_router
from routes.imports import router as imports_router
from routes.ai_functions import router as ai_functions_router
from routes.notifications import router as notifications_router
from routes.knowledge import router as knowledge_router
from routes.strategy_studio import router as strategy_router
from routes.analysis_lab import router as analysis_router
from routes.audit import router as audit_router
from routes.metrics import router as metrics_router
from routes.backup import router as backup_router
from routes.market_data import router as market_data_router
from database import init_db, close_db, get_db
from services.metrics_service import get_metrics_service
from services.audit_service import get_audit_service
from services.backup_scheduler_service import get_backup_scheduler_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()

    # Initialize metrics service
    metrics = get_metrics_service()
    metrics.initialize("blackiefi-api", "3.0.0")
    
    # Initialize backup scheduler
    db = get_db()
    scheduler = get_backup_scheduler_service(db)
    await scheduler.initialize()
    
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="BlackieFi API",
    description="Institutional-Grade Wealth Management Platform",
    version="3.0.0",
    lifespan=lifespan
)

# Import middleware
from middleware.observability import MetricsMiddleware, RequestContextMiddleware

# Add observability middleware (order matters - metrics should be outer)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestContextMiddleware)

# CORS middleware
origins_env = os.environ.get("ALLOWED_ORIGINS")
if not origins_env:
    raise RuntimeError("ALLOWED_ORIGINS must be set (comma-separated)")
allowed_origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "blackiefi-api"}

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(entities_router, prefix="/api/entities", tags=["Entities"])
app.include_router(accounts_router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(categories_router, prefix="/api/categories", tags=["Categories"])
app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(admin_users_router, prefix="/api/admin", tags=["Admin - Users"])

app.include_router(recurring_router, prefix="/api/recurring", tags=["Recurring Transactions"])
app.include_router(budgets_router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(debts_router, prefix="/api/debts", tags=["Debts"])
app.include_router(investments_router, prefix="/api/investments", tags=["Investments"])
app.include_router(assets_router, prefix="/api/assets", tags=["Assets"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(goals_router, prefix="/api/goals", tags=["Financial Goals"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(admin_llm_router, prefix="/api/admin/llm", tags=["Admin - LLM Configuration"])
app.include_router(bills_router, prefix="/api/bills", tags=["Bills"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(tax_router, prefix="/api/tax", tags=["Tax Planning"])
app.include_router(groups_router, prefix="/api/groups", tags=["Groups"])
app.include_router(profiles_router, prefix="/api/financial-profiles", tags=["Financial Profiles"])
app.include_router(imports_router, prefix="/api/imports", tags=["Imports"])
app.include_router(ai_functions_router, prefix="/api/ai", tags=["AI Functions"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(knowledge_router, tags=["Knowledge Lab"])
app.include_router(strategy_router, tags=["Strategy Studio"])
app.include_router(analysis_router, tags=["Analysis Lab"])
app.include_router(audit_router, tags=["Audit Logs"])
app.include_router(metrics_router, tags=["Observability"])
app.include_router(backup_router, tags=["Backup & Recovery"])
app.include_router(market_data_router, tags=["Market Data"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
