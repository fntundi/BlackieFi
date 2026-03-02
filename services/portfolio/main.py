"""
BlackieFi Portfolio Service
Manages investment portfolios, accounts, vehicles, and holdings.
Provides portfolio analytics and performance tracking.

Features:
- Full CRUD for accounts (checking, savings, credit cards, cash)
- Investment vehicles (401k, IRA, brokerage, crypto)
- Investment holdings with cost basis tracking
- Portfolio performance metrics
- Entity-scoped data access
"""
import os
from datetime import datetime, timezone
from typing import Optional, List
from contextlib import asynccontextmanager
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

# Configuration
SERVICE_NAME = os.environ.get("SERVICE_NAME", "portfolio-service")
PORT = int(os.environ.get("PORT", 8004))
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/blackiefi")
DB_NAME = os.environ.get("DB_NAME", "blackiefi")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/4")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Database clients
mongo_client: Optional[AsyncIOMotorClient] = None
db = None
redis_client: Optional[redis.Redis] = None

security = HTTPBearer(auto_error=False)


# =============================================================================
# ENUMS & MODELS
# =============================================================================

class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    CASH = "cash"
    MONEY_MARKET = "money_market"
    BROKERAGE = "brokerage"
    OTHER = "other"


class VehicleType(str, Enum):
    IRA = "ira"
    ROTH_IRA = "roth_ira"
    FOUR_OH_ONE_K = "401k"
    FOUR_OH_THREE_B = "403b"
    SEP_IRA = "sep_ira"
    BROKERAGE = "brokerage"
    CRYPTO = "crypto"
    HSA = "hsa"
    FIVE_TWO_NINE = "529"
    OTHER = "other"


class AssetClass(str, Enum):
    STOCKS = "stocks"
    BONDS = "bonds"
    REAL_ESTATE = "real_estate"
    CRYPTO = "crypto"
    COMMODITIES = "commodities"
    CASH = "cash"
    ALTERNATIVES = "alternatives"
    OTHER = "other"


# Account Models
class AccountInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    type: AccountType = AccountType.CHECKING
    balance: float = 0.0
    currency: str = "USD"
    institution: Optional[str] = None
    account_number_last4: Optional[str] = None
    notes: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    balance: Optional[float] = None
    currency: Optional[str] = None
    institution: Optional[str] = None
    account_number_last4: Optional[str] = None
    notes: Optional[str] = None


class AccountResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    type: str
    balance: float
    currency: str
    institution: Optional[str] = None
    account_number_last4: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str


# Investment Vehicle Models
class VehicleInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    type: VehicleType = VehicleType.BROKERAGE
    provider: Optional[str] = None
    account_number_last4: Optional[str] = None
    contribution_limit: Optional[float] = None
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[VehicleType] = None
    provider: Optional[str] = None
    account_number_last4: Optional[str] = None
    contribution_limit: Optional[float] = None
    notes: Optional[str] = None


class VehicleResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    type: str
    provider: Optional[str] = None
    account_number_last4: Optional[str] = None
    contribution_limit: Optional[float] = None
    notes: Optional[str] = None
    total_value: float = 0.0
    total_cost_basis: float = 0.0
    total_gain_loss: float = 0.0
    holdings_count: int = 0
    is_active: bool = True
    created_at: str
    updated_at: str


# Investment Holding Models
class HoldingInput(BaseModel):
    vehicle_id: str
    symbol: Optional[str] = None
    asset_name: str = Field(..., min_length=1, max_length=200)
    asset_class: AssetClass = AssetClass.STOCKS
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None
    benchmark_symbol: Optional[str] = None
    notes: Optional[str] = None


class HoldingUpdate(BaseModel):
    symbol: Optional[str] = None
    asset_name: Optional[str] = None
    asset_class: Optional[AssetClass] = None
    quantity: Optional[float] = None
    cost_basis: Optional[float] = None
    current_price: Optional[float] = None
    benchmark_symbol: Optional[str] = None
    notes: Optional[str] = None


class HoldingResponse(BaseModel):
    id: str
    vehicle_id: str
    symbol: Optional[str] = None
    asset_name: str
    asset_class: str
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None
    current_value: float = 0.0
    gain_loss: float = 0.0
    gain_loss_percent: float = 0.0
    benchmark_symbol: Optional[str] = None
    notes: Optional[str] = None
    last_updated: Optional[str] = None
    created_at: str
    updated_at: str


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global mongo_client, db, redis_client
    
    print(f"[{SERVICE_NAME}] Starting Portfolio Service...")
    
    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Create indexes
    await db.accounts.create_index("entity_id")
    await db.accounts.create_index([("entity_id", 1), ("is_active", 1)])
    await db.investment_vehicles.create_index("entity_id")
    await db.investment_vehicles.create_index([("entity_id", 1), ("is_active", 1)])
    await db.investment_holdings.create_index("vehicle_id")
    
    print(f"[{SERVICE_NAME}] Connected to MongoDB")
    
    # Connect to Redis
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print(f"[{SERVICE_NAME}] Connected to Redis")
    except Exception as e:
        print(f"[{SERVICE_NAME}] Warning: Redis connection failed: {e}")
        redis_client = None
    
    print(f"[{SERVICE_NAME}] Portfolio Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    print(f"[{SERVICE_NAME}] Shutting down...")
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="BlackieFi Portfolio Service",
    description="Portfolio Management Service - Accounts, Investment Vehicles, and Holdings",
    version="3.0.0",
    lifespan=lifespan,
)


# =============================================================================
# HELPERS
# =============================================================================

def get_user_context(request: Request) -> dict:
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


async def verify_entity_access(entity_id: str, user_id: str) -> bool:
    """Verify user has access to the entity"""
    entity = await db.entities.find_one({
        "_id": entity_id,
        "owner_id": user_id,
        "status": {"$ne": "archived"}
    })
    return entity is not None


async def get_vehicle_stats(vehicle_id: str) -> dict:
    """Calculate aggregated stats for a vehicle"""
    holdings = await db.investment_holdings.find({"vehicle_id": vehicle_id}).to_list(1000)
    
    total_value = 0.0
    total_cost_basis = 0.0
    
    for h in holdings:
        quantity = h.get("quantity", 0)
        cost_basis = h.get("cost_basis", 0)
        current_price = h.get("current_price", cost_basis / quantity if quantity > 0 else 0)
        
        total_cost_basis += cost_basis
        total_value += quantity * current_price
    
    return {
        "total_value": total_value,
        "total_cost_basis": total_cost_basis,
        "total_gain_loss": total_value - total_cost_basis,
        "holdings_count": len(holdings)
    }


def serialize_account(account: dict) -> dict:
    """Serialize account document for response"""
    return {
        "id": account["_id"],
        "entity_id": account["entity_id"],
        "name": account["name"],
        "type": account["type"],
        "balance": account.get("balance", 0.0),
        "currency": account.get("currency", "USD"),
        "institution": account.get("institution"),
        "account_number_last4": account.get("account_number_last4"),
        "notes": account.get("notes"),
        "is_active": account.get("is_active", True),
        "created_at": account["created_at"],
        "updated_at": account["updated_at"]
    }


def serialize_vehicle(vehicle: dict, stats: dict = None) -> dict:
    """Serialize vehicle document for response"""
    result = {
        "id": vehicle["_id"],
        "entity_id": vehicle["entity_id"],
        "name": vehicle["name"],
        "type": vehicle["type"],
        "provider": vehicle.get("provider"),
        "account_number_last4": vehicle.get("account_number_last4"),
        "contribution_limit": vehicle.get("contribution_limit"),
        "notes": vehicle.get("notes"),
        "total_value": 0.0,
        "total_cost_basis": 0.0,
        "total_gain_loss": 0.0,
        "holdings_count": 0,
        "is_active": vehicle.get("is_active", True),
        "created_at": vehicle["created_at"],
        "updated_at": vehicle["updated_at"]
    }
    
    if stats:
        result.update(stats)
    
    return result


def serialize_holding(holding: dict) -> dict:
    """Serialize holding document for response"""
    quantity = holding.get("quantity", 0)
    cost_basis = holding.get("cost_basis", 0)
    avg_cost = cost_basis / quantity if quantity > 0 else 0
    current_price = holding.get("current_price", avg_cost)
    current_value = quantity * current_price
    gain_loss = current_value - cost_basis
    gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
    
    return {
        "id": holding["_id"],
        "vehicle_id": holding["vehicle_id"],
        "symbol": holding.get("symbol"),
        "asset_name": holding["asset_name"],
        "asset_class": holding["asset_class"],
        "quantity": quantity,
        "cost_basis": cost_basis,
        "current_price": current_price,
        "current_value": current_value,
        "gain_loss": gain_loss,
        "gain_loss_percent": round(gain_loss_percent, 2),
        "benchmark_symbol": holding.get("benchmark_symbol"),
        "notes": holding.get("notes"),
        "last_updated": holding.get("last_updated"),
        "created_at": holding["created_at"],
        "updated_at": holding["updated_at"]
    }


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
    
    redis_status = "connected" if redis_client else "not_configured"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "disconnected"
    
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


# =============================================================================
# ACCOUNT ENDPOINTS
# =============================================================================

@app.get("/api/accounts", response_model=List[AccountResponse])
async def list_accounts(
    request: Request,
    entity_id: Optional[str] = Query(None, description="Filter by entity"),
    is_active: bool = Query(True, description="Filter by active status"),
):
    """List all accounts, optionally filtered by entity"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    
    if entity_id:
        # Verify access to entity
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied to entity")
        query["entity_id"] = entity_id
    else:
        # Get all entities user owns and filter accounts
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        entity_ids = [e["_id"] for e in entities]
        query["entity_id"] = {"$in": entity_ids}
    
    accounts = await db.accounts.find(query).sort("name", 1).to_list(500)
    
    return [serialize_account(a) for a in accounts]


@app.post("/api/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(data: AccountInput, request: Request):
    """Create a new account"""
    user = get_user_context(request)
    
    # Verify access to entity
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied to entity")
    
    now = datetime.now(timezone.utc).isoformat()
    
    from bson import ObjectId
    account_id = str(ObjectId())
    
    account_doc = {
        "_id": account_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "type": data.type.value,
        "balance": data.balance,
        "currency": data.currency,
        "institution": data.institution,
        "account_number_last4": data.account_number_last4,
        "notes": data.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.accounts.insert_one(account_doc)
    
    return serialize_account(account_doc)


@app.get("/api/accounts/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, request: Request):
    """Get a specific account"""
    user = get_user_context(request)
    
    account = await db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify access
    if not await verify_entity_access(account["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_account(account)


@app.put("/api/accounts/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, data: AccountUpdate, request: Request):
    """Update an account"""
    user = get_user_context(request)
    
    account = await db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify access
    if not await verify_entity_access(account["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    
    if data.name is not None:
        updates["name"] = data.name
    if data.type is not None:
        updates["type"] = data.type.value
    if data.balance is not None:
        updates["balance"] = data.balance
    if data.currency is not None:
        updates["currency"] = data.currency
    if data.institution is not None:
        updates["institution"] = data.institution
    if data.account_number_last4 is not None:
        updates["account_number_last4"] = data.account_number_last4
    if data.notes is not None:
        updates["notes"] = data.notes
    
    await db.accounts.update_one({"_id": account_id}, {"$set": updates})
    
    updated = await db.accounts.find_one({"_id": account_id})
    return serialize_account(updated)


@app.delete("/api/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: str, request: Request):
    """Soft delete an account"""
    user = get_user_context(request)
    
    account = await db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify access
    if not await verify_entity_access(account["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.accounts.update_one(
        {"_id": account_id},
        {"$set": {"is_active": False, "updated_at": now}}
    )
    
    return None


# =============================================================================
# INVESTMENT VEHICLE ENDPOINTS
# =============================================================================

@app.get("/api/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(
    request: Request,
    entity_id: Optional[str] = Query(None, description="Filter by entity"),
    is_active: bool = Query(True, description="Filter by active status"),
    include_stats: bool = Query(False, description="Include computed statistics"),
):
    """List all investment vehicles"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied to entity")
        query["entity_id"] = entity_id
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        entity_ids = [e["_id"] for e in entities]
        query["entity_id"] = {"$in": entity_ids}
    
    vehicles = await db.investment_vehicles.find(query).sort("name", 1).to_list(500)
    
    results = []
    for v in vehicles:
        stats = await get_vehicle_stats(v["_id"]) if include_stats else None
        results.append(serialize_vehicle(v, stats))
    
    return results


@app.post("/api/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(data: VehicleInput, request: Request):
    """Create a new investment vehicle"""
    user = get_user_context(request)
    
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied to entity")
    
    now = datetime.now(timezone.utc).isoformat()
    
    from bson import ObjectId
    vehicle_id = str(ObjectId())
    
    vehicle_doc = {
        "_id": vehicle_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "type": data.type.value,
        "provider": data.provider,
        "account_number_last4": data.account_number_last4,
        "contribution_limit": data.contribution_limit,
        "notes": data.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.investment_vehicles.insert_one(vehicle_doc)
    
    return serialize_vehicle(vehicle_doc)


@app.get("/api/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: str, request: Request, include_stats: bool = Query(True)):
    """Get a specific investment vehicle"""
    user = get_user_context(request)
    
    vehicle = await db.investment_vehicles.find_one({"_id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Investment vehicle not found")
    
    if not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    stats = await get_vehicle_stats(vehicle_id) if include_stats else None
    return serialize_vehicle(vehicle, stats)


@app.put("/api/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(vehicle_id: str, data: VehicleUpdate, request: Request):
    """Update an investment vehicle"""
    user = get_user_context(request)
    
    vehicle = await db.investment_vehicles.find_one({"_id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Investment vehicle not found")
    
    if not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    
    if data.name is not None:
        updates["name"] = data.name
    if data.type is not None:
        updates["type"] = data.type.value
    if data.provider is not None:
        updates["provider"] = data.provider
    if data.account_number_last4 is not None:
        updates["account_number_last4"] = data.account_number_last4
    if data.contribution_limit is not None:
        updates["contribution_limit"] = data.contribution_limit
    if data.notes is not None:
        updates["notes"] = data.notes
    
    await db.investment_vehicles.update_one({"_id": vehicle_id}, {"$set": updates})
    
    updated = await db.investment_vehicles.find_one({"_id": vehicle_id})
    stats = await get_vehicle_stats(vehicle_id)
    return serialize_vehicle(updated, stats)


@app.delete("/api/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(vehicle_id: str, request: Request):
    """Soft delete an investment vehicle"""
    user = get_user_context(request)
    
    vehicle = await db.investment_vehicles.find_one({"_id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Investment vehicle not found")
    
    if not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.investment_vehicles.update_one(
        {"_id": vehicle_id},
        {"$set": {"is_active": False, "updated_at": now}}
    )
    
    return None


# =============================================================================
# INVESTMENT HOLDING ENDPOINTS
# =============================================================================

@app.get("/api/holdings", response_model=List[HoldingResponse])
async def list_holdings(
    request: Request,
    vehicle_id: Optional[str] = Query(None, description="Filter by vehicle"),
):
    """List all investment holdings"""
    user = get_user_context(request)
    
    query = {}
    
    if vehicle_id:
        # Verify access to vehicle
        vehicle = await db.investment_vehicles.find_one({"_id": vehicle_id})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        if not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        query["vehicle_id"] = vehicle_id
    else:
        # Get all accessible vehicles
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        entity_ids = [e["_id"] for e in entities]
        vehicles = await db.investment_vehicles.find({"entity_id": {"$in": entity_ids}}).to_list(500)
        vehicle_ids = [v["_id"] for v in vehicles]
        query["vehicle_id"] = {"$in": vehicle_ids}
    
    holdings = await db.investment_holdings.find(query).sort("asset_name", 1).to_list(1000)
    
    return [serialize_holding(h) for h in holdings]


@app.post("/api/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def create_holding(data: HoldingInput, request: Request):
    """Create a new investment holding"""
    user = get_user_context(request)
    
    # Verify access to vehicle
    vehicle = await db.investment_vehicles.find_one({"_id": data.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    
    from bson import ObjectId
    holding_id = str(ObjectId())
    
    holding_doc = {
        "_id": holding_id,
        "vehicle_id": data.vehicle_id,
        "symbol": data.symbol,
        "asset_name": data.asset_name,
        "asset_class": data.asset_class.value,
        "quantity": data.quantity,
        "cost_basis": data.cost_basis,
        "current_price": data.current_price,
        "benchmark_symbol": data.benchmark_symbol,
        "notes": data.notes,
        "last_updated": now,
        "created_at": now,
        "updated_at": now
    }
    
    await db.investment_holdings.insert_one(holding_doc)
    
    return serialize_holding(holding_doc)


@app.get("/api/holdings/{holding_id}", response_model=HoldingResponse)
async def get_holding(holding_id: str, request: Request):
    """Get a specific investment holding"""
    user = get_user_context(request)
    
    holding = await db.investment_holdings.find_one({"_id": holding_id})
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    # Verify access through vehicle
    vehicle = await db.investment_vehicles.find_one({"_id": holding["vehicle_id"]})
    if not vehicle or not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_holding(holding)


@app.put("/api/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(holding_id: str, data: HoldingUpdate, request: Request):
    """Update an investment holding"""
    user = get_user_context(request)
    
    holding = await db.investment_holdings.find_one({"_id": holding_id})
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    vehicle = await db.investment_vehicles.find_one({"_id": holding["vehicle_id"]})
    if not vehicle or not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    
    if data.symbol is not None:
        updates["symbol"] = data.symbol
    if data.asset_name is not None:
        updates["asset_name"] = data.asset_name
    if data.asset_class is not None:
        updates["asset_class"] = data.asset_class.value
    if data.quantity is not None:
        updates["quantity"] = data.quantity
    if data.cost_basis is not None:
        updates["cost_basis"] = data.cost_basis
    if data.current_price is not None:
        updates["current_price"] = data.current_price
        updates["last_updated"] = now
    if data.benchmark_symbol is not None:
        updates["benchmark_symbol"] = data.benchmark_symbol
    if data.notes is not None:
        updates["notes"] = data.notes
    
    await db.investment_holdings.update_one({"_id": holding_id}, {"$set": updates})
    
    updated = await db.investment_holdings.find_one({"_id": holding_id})
    return serialize_holding(updated)


@app.delete("/api/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(holding_id: str, request: Request):
    """Delete an investment holding"""
    user = get_user_context(request)
    
    holding = await db.investment_holdings.find_one({"_id": holding_id})
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    vehicle = await db.investment_vehicles.find_one({"_id": holding["vehicle_id"]})
    if not vehicle or not await verify_entity_access(vehicle["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.investment_holdings.delete_one({"_id": holding_id})
    
    return None


# =============================================================================
# PORTFOLIO SUMMARY ENDPOINTS
# =============================================================================

@app.get("/api/portfolio/summary")
async def get_portfolio_summary(
    request: Request,
    entity_id: Optional[str] = Query(None, description="Filter by entity"),
):
    """Get portfolio summary with aggregate values"""
    user = get_user_context(request)
    
    # Build entity filter
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied to entity")
        entity_ids = [entity_id]
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        entity_ids = [e["_id"] for e in entities]
    
    # Get accounts
    accounts = await db.accounts.find({
        "entity_id": {"$in": entity_ids},
        "is_active": True
    }).to_list(500)
    
    total_cash = sum(a.get("balance", 0) for a in accounts)
    
    # Get investment vehicles and holdings
    vehicles = await db.investment_vehicles.find({
        "entity_id": {"$in": entity_ids},
        "is_active": True
    }).to_list(500)
    
    total_investments = 0.0
    total_cost_basis = 0.0
    
    for v in vehicles:
        stats = await get_vehicle_stats(v["_id"])
        total_investments += stats["total_value"]
        total_cost_basis += stats["total_cost_basis"]
    
    total_gain_loss = total_investments - total_cost_basis
    gain_loss_percent = (total_gain_loss / total_cost_basis * 100) if total_cost_basis > 0 else 0
    
    return {
        "total_cash": total_cash,
        "total_investments": total_investments,
        "total_cost_basis": total_cost_basis,
        "total_gain_loss": total_gain_loss,
        "gain_loss_percent": round(gain_loss_percent, 2),
        "net_worth": total_cash + total_investments,
        "accounts_count": len(accounts),
        "vehicles_count": len(vehicles),
        "entities_count": len(entity_ids)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
