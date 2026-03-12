"""
BlackieFi Core Domain Service
Handles all core business logic:
- Entities
- Portfolios & Accounts
- Transactions
- Budgets
- Assets (Real Estate, Tax Liens, Private Equity, Precious Metals)
- Goals
- Debts
- Categories
- AI Co-Pilot functions
"""
import os
from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

# Configuration
SERVICE_NAME = os.environ.get("SERVICE_NAME", "core-service")
PORT = int(os.environ.get("PORT", 8002))
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/blackiefi")
DB_NAME = os.environ.get("DB_NAME", "blackiefi")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/2")
AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth-service:8001")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
DEFAULT_LLM_PROVIDER = os.environ.get("DEFAULT_LLM_PROVIDER", "emergent")

# ChromaDB Configuration
CHROMADB_URL = os.environ.get("CHROMADB_URL", "http://localhost:8000")
CHROMADB_AUTH_TOKEN = os.environ.get("CHROMADB_AUTH_TOKEN", "")

# Market Data API Keys
ALPHA_VANTAGE_API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY", "")
COINGECKO_API_KEY = os.environ.get("COINGECKO_API_KEY", "")

# Database clients
mongo_client: Optional[AsyncIOMotorClient] = None
db = None
redis_client: Optional[redis.Redis] = None

# Security
security = HTTPBearer(auto_error=False)


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global mongo_client, db, redis_client
    
    print(f"[{SERVICE_NAME}] Starting Core Service...")
    
    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Create indexes (same as existing)
    await create_indexes()
    
    print(f"[{SERVICE_NAME}] Connected to MongoDB")
    
    # Connect to Redis
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print(f"[{SERVICE_NAME}] Connected to Redis")
    except Exception as e:
        print(f"[{SERVICE_NAME}] Warning: Redis connection failed: {e}")
        redis_client = None
    
    # Seed initial data
    await seed_initial_data()
    
    print(f"[{SERVICE_NAME}] Core Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    print(f"[{SERVICE_NAME}] Shutting down...")
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.close()


async def create_indexes():
    """Create database indexes"""
    # Entities
    await db.entities.create_index("owner_id")
    
    # Accounts
    await db.accounts.create_index("entity_id")
    
    # Transactions
    await db.transactions.create_index([("entity_id", 1), ("date", -1)])
    await db.transactions.create_index("category_id")
    
    # Categories
    await db.categories.create_index("entity_id")
    
    # Recurring transactions
    await db.recurring_transactions.create_index("entity_id")
    
    # Budgets
    await db.budgets.create_index([("entity_id", 1), ("month", 1)])
    
    # Debts
    await db.debts.create_index("entity_id")
    
    # Investment vehicles and holdings
    await db.investment_vehicles.create_index("entity_id")
    await db.investment_holdings.create_index("vehicle_id")
    
    # Assets
    await db.assets.create_index("entity_id")
    await db.assets.create_index("asset_type")
    
    # Real Estate specific
    await db.real_estate_assets.create_index("entity_id")
    
    # Tax Liens specific
    await db.tax_liens.create_index("entity_id")
    await db.tax_liens.create_index("redemption_deadline")
    
    # Private Equity specific
    await db.private_equity.create_index("entity_id")
    
    # Precious Metals specific
    await db.precious_metals.create_index("entity_id")
    
    # Financial goals
    await db.goals.create_index("entity_id")
    
    # Bills
    await db.bills.create_index("entity_id")
    
    # Notifications
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    
    # Knowledge sources (for AI)
    await db.knowledge_sources.create_index("entity_id")
    await db.knowledge_sources.create_index("status")
    
    # Investment strategies
    await db.strategies.create_index("entity_id")
    
    # Analysis history
    await db.analyses.create_index([("entity_id", 1), ("asset_id", 1)])


async def seed_initial_data():
    """Seed initial data if database is empty"""
    # System settings
    settings = await db.system_settings.find_one({"_id": "system"})
    if not settings:
        await db.system_settings.insert_one({
            "_id": "system",
            "ai_enabled": False,
            "default_llm_provider": DEFAULT_LLM_PROVIDER
        })
        print(f"[{SERVICE_NAME}] Created initial system settings")
    
    # Default categories
    count = await db.categories.count_documents({})
    if count == 0:
        from bson import ObjectId
        now = datetime.now(timezone.utc).isoformat()
        
        default_categories = [
            {"name": "Salary", "type": "income", "is_default": True},
            {"name": "Freelance", "type": "income", "is_default": True},
            {"name": "Investment Income", "type": "income", "is_default": True},
            {"name": "Rental Income", "type": "income", "is_default": True},
            {"name": "Dividend Income", "type": "income", "is_default": True},
            {"name": "Food & Dining", "type": "expense", "is_default": True},
            {"name": "Transportation", "type": "expense", "is_default": True},
            {"name": "Housing", "type": "expense", "is_default": True},
            {"name": "Utilities", "type": "expense", "is_default": True},
            {"name": "Healthcare", "type": "expense", "is_default": True},
            {"name": "Entertainment", "type": "expense", "is_default": True},
            {"name": "Shopping", "type": "expense", "is_default": True},
            {"name": "Education", "type": "expense", "is_default": True},
            {"name": "Personal Care", "type": "expense", "is_default": True},
            {"name": "Insurance", "type": "expense", "is_default": True},
            {"name": "Property Tax", "type": "expense", "is_default": True},
            {"name": "Property Management", "type": "expense", "is_default": True},
            {"name": "Savings", "type": "both", "is_default": True},
            {"name": "Transfer", "type": "both", "is_default": True},
        ]
        
        for cat in default_categories:
            cat["_id"] = str(ObjectId())
            cat["entity_id"] = None
            cat["parent_category"] = None
            cat["auto_categorization_rules"] = []
            cat["created_at"] = now
            cat["updated_at"] = now
        
        await db.categories.insert_many(default_categories)
        print(f"[{SERVICE_NAME}] Created {len(default_categories)} default categories")


app = FastAPI(
    title="BlackieFi Core Service",
    description="Core Domain Service for BlackieFi Platform",
    version="3.0.0",
    lifespan=lifespan,
)


# =============================================================================
# AUTH HELPERS
# =============================================================================

async def get_user_context(request: Request) -> dict:
    """Extract user context from gateway headers"""
    user_id = request.headers.get("X-User-ID")
    user_role = request.headers.get("X-User-Role", "user")
    request_id = request.headers.get("X-Request-ID", "")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User context not found")
    
    return {
        "user_id": user_id,
        "role": user_role,
        "request_id": request_id
    }


def get_db():
    """Get database instance"""
    return db


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
async def health_check():
    """Service health check"""
    mongo_status = "connected"
    try:
        await mongo_client.admin.command('ping')
    except Exception:
        mongo_status = "disconnected"
    
    redis_status = "connected"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "disconnected"
    else:
        redis_status = "not_configured"
    
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": "3.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "mongodb": mongo_status,
            "redis": redis_status
        }
    }


@app.get("/api/health")
async def api_health():
    """API health check for legacy compatibility"""
    return await health_check()


# =============================================================================
# IMPORT EXISTING ROUTES
# =============================================================================

# Import all existing route handlers from the monolithic backend
# These will be gradually refactored into proper microservices

import sys
sys.path.insert(0, '/app/backend')

try:
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
    from routes.bills import router as bills_router
    from routes.reports import router as reports_router
    from routes.tax import router as tax_router
    from routes.groups import router as groups_router
    from routes.financial_profiles import router as profiles_router
    from routes.imports import router as imports_router
    from routes.ai_functions import router as ai_functions_router
    from routes.notifications import router as notifications_router
    
    # Include all existing routers
    app.include_router(entities_router, prefix="/api/entities", tags=["Entities"])
    app.include_router(accounts_router, prefix="/api/accounts", tags=["Accounts"])
    app.include_router(categories_router, prefix="/api/categories", tags=["Categories"])
    app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
    app.include_router(recurring_router, prefix="/api/recurring", tags=["Recurring Transactions"])
    app.include_router(budgets_router, prefix="/api/budgets", tags=["Budgets"])
    app.include_router(debts_router, prefix="/api/debts", tags=["Debts"])
    app.include_router(investments_router, prefix="/api/investments", tags=["Investments"])
    app.include_router(assets_router, prefix="/api/assets", tags=["Assets"])
    app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
    app.include_router(goals_router, prefix="/api/goals", tags=["Financial Goals"])
    app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
    app.include_router(admin_llm_router, prefix="/api/admin/llm", tags=["Admin - LLM"])
    app.include_router(bills_router, prefix="/api/bills", tags=["Bills"])
    app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
    app.include_router(tax_router, prefix="/api/tax", tags=["Tax Planning"])
    app.include_router(groups_router, prefix="/api/groups", tags=["Groups"])
    app.include_router(profiles_router, prefix="/api/financial-profiles", tags=["Financial Profiles"])
    app.include_router(imports_router, prefix="/api/imports", tags=["Imports"])
    app.include_router(ai_functions_router, prefix="/api/ai", tags=["AI Functions"])
    app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
    
    print(f"[{SERVICE_NAME}] Imported existing routes from monolithic backend")
    
except ImportError as e:
    print(f"[{SERVICE_NAME}] Warning: Could not import existing routes: {e}")
    print(f"[{SERVICE_NAME}] Running in standalone mode")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
