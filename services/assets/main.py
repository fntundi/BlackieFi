"""
BlackieFi Asset Management Service
Manages all asset types including Real Estate, Tax Liens, Private Equity, and Precious Metals.
Provides asset valuation, depreciation tracking, and performance analytics.

Features:
- General assets (equipment, vehicles, furniture)
- Real estate properties with rental income
- Property tax liens with ROI tracking
- Private equity investments
- Precious metals (gold, silver, platinum)
- Depreciation calculations
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
SERVICE_NAME = os.environ.get("SERVICE_NAME", "asset-service")
PORT = int(os.environ.get("PORT", 8005))
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/blackiefi")
DB_NAME = os.environ.get("DB_NAME", "blackiefi")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/5")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Database clients
mongo_client: Optional[AsyncIOMotorClient] = None
db = None
redis_client: Optional[redis.Redis] = None

security = HTTPBearer(auto_error=False)


# =============================================================================
# ENUMS & MODELS
# =============================================================================

class AssetType(str, Enum):
    PROPERTY = "property"
    VEHICLE = "vehicle"
    EQUIPMENT = "equipment"
    FURNITURE = "furniture"
    TECHNOLOGY = "technology"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    OTHER = "other"


class DepreciationMethod(str, Enum):
    NONE = "none"
    STRAIGHT_LINE = "straight_line"
    DECLINING_BALANCE = "declining_balance"
    UNITS_OF_PRODUCTION = "units_of_production"


class PropertyType(str, Enum):
    SINGLE_FAMILY = "single_family"
    MULTI_FAMILY = "multi_family"
    COMMERCIAL = "commercial"
    LAND = "land"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    INDUSTRIAL = "industrial"
    MIXED_USE = "mixed_use"
    OTHER = "other"


class LienStatus(str, Enum):
    ACTIVE = "active"
    REDEEMED = "redeemed"
    FORECLOSED = "foreclosed"
    EXPIRED = "expired"


class MetalType(str, Enum):
    GOLD = "gold"
    SILVER = "silver"
    PLATINUM = "platinum"
    PALLADIUM = "palladium"


# General Asset Models
class AssetInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    type: AssetType = AssetType.OTHER
    description: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    depreciation_method: DepreciationMethod = DepreciationMethod.NONE
    useful_life_years: Optional[int] = None
    salvage_value: Optional[float] = None
    location: Optional[str] = None
    serial_number: Optional[str] = None
    vendor: Optional[str] = None
    warranty_expiration: Optional[str] = None
    maintenance_schedule: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AssetType] = None
    description: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    depreciation_method: Optional[DepreciationMethod] = None
    useful_life_years: Optional[int] = None
    salvage_value: Optional[float] = None
    location: Optional[str] = None
    serial_number: Optional[str] = None
    vendor: Optional[str] = None
    warranty_expiration: Optional[str] = None
    maintenance_schedule: Optional[str] = None


class AssetResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    type: str
    description: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    depreciation_method: str = "none"
    useful_life_years: Optional[int] = None
    salvage_value: Optional[float] = None
    accumulated_depreciation: float = 0.0
    book_value: float = 0.0
    location: Optional[str] = None
    serial_number: Optional[str] = None
    vendor: Optional[str] = None
    warranty_expiration: Optional[str] = None
    maintenance_schedule: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str


# Real Estate Models
class RealEstateInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    property_type: PropertyType = PropertyType.SINGLE_FAMILY
    address: dict  # {street, city, state, zip, country}
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    square_footage: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    monthly_rent: Optional[float] = None
    monthly_expenses: Optional[float] = None
    mortgage_balance: Optional[float] = None
    property_tax_annual: Optional[float] = None
    insurance_annual: Optional[float] = None
    notes: Optional[str] = None


class RealEstateResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    property_type: str
    address: dict
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    equity: float = 0.0
    square_footage: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    monthly_rent: Optional[float] = None
    monthly_expenses: Optional[float] = None
    monthly_cash_flow: float = 0.0
    annual_cash_flow: float = 0.0
    cap_rate: float = 0.0
    mortgage_balance: Optional[float] = None
    property_tax_annual: Optional[float] = None
    insurance_annual: Optional[float] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str


# Tax Lien Models
class TaxLienInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    parcel_id: str
    jurisdiction: str  # County/State
    property_address: dict
    lien_amount: float
    purchase_date: str
    interest_rate: float
    redemption_period_months: int
    status: LienStatus = LienStatus.ACTIVE
    notes: Optional[str] = None


class TaxLienResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    parcel_id: str
    jurisdiction: str
    property_address: dict
    lien_amount: float
    purchase_date: str
    interest_rate: float
    redemption_period_months: int
    status: str
    accrued_interest: float = 0.0
    current_value: float = 0.0
    expected_return: float = 0.0
    redemption_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str


# Private Equity Models
class PrivateEquityInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    company_name: str
    investment_date: str
    investment_amount: float
    ownership_percentage: Optional[float] = None
    shares: Optional[int] = None
    current_valuation: Optional[float] = None
    fund_name: Optional[str] = None
    investment_stage: Optional[str] = None  # seed, series_a, growth, buyout
    exit_date: Optional[str] = None
    exit_proceeds: Optional[float] = None
    notes: Optional[str] = None


class PrivateEquityResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    company_name: str
    investment_date: str
    investment_amount: float
    ownership_percentage: Optional[float] = None
    shares: Optional[int] = None
    current_valuation: Optional[float] = None
    current_value: float = 0.0
    unrealized_gain_loss: float = 0.0
    moic: float = 1.0  # Multiple on Invested Capital
    fund_name: Optional[str] = None
    investment_stage: Optional[str] = None
    exit_date: Optional[str] = None
    exit_proceeds: Optional[float] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str


# Precious Metals Models
class PreciousMetalInput(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    metal_type: MetalType
    form: str  # coin, bar, bullion, jewelry
    weight_oz: float
    purity: float = 0.999  # e.g., 0.999 for 99.9% pure
    purchase_date: Optional[str] = None
    purchase_price_per_oz: Optional[float] = None
    current_price_per_oz: Optional[float] = None
    storage_location: Optional[str] = None
    certification: Optional[str] = None
    notes: Optional[str] = None


class PreciousMetalResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    metal_type: str
    form: str
    weight_oz: float
    purity: float
    purchase_date: Optional[str] = None
    purchase_price_per_oz: Optional[float] = None
    total_cost: float = 0.0
    current_price_per_oz: Optional[float] = None
    current_value: float = 0.0
    gain_loss: float = 0.0
    gain_loss_percent: float = 0.0
    storage_location: Optional[str] = None
    certification: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global mongo_client, db, redis_client
    
    print(f"[{SERVICE_NAME}] Starting Asset Management Service...")
    
    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Create indexes
    await db.assets.create_index("entity_id")
    await db.assets.create_index([("entity_id", 1), ("is_active", 1)])
    await db.real_estate_assets.create_index("entity_id")
    await db.tax_liens.create_index("entity_id")
    await db.tax_liens.create_index("status")
    await db.private_equity.create_index("entity_id")
    await db.precious_metals.create_index("entity_id")
    await db.precious_metals.create_index("metal_type")
    
    print(f"[{SERVICE_NAME}] Connected to MongoDB")
    
    # Connect to Redis
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print(f"[{SERVICE_NAME}] Connected to Redis")
    except Exception as e:
        print(f"[{SERVICE_NAME}] Warning: Redis connection failed: {e}")
        redis_client = None
    
    print(f"[{SERVICE_NAME}] Asset Management Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    print(f"[{SERVICE_NAME}] Shutting down...")
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="BlackieFi Asset Management Service",
    description="Asset Management Service - Real Estate, Tax Liens, Private Equity, Precious Metals",
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


def calculate_depreciation(asset: dict) -> dict:
    """Calculate accumulated depreciation and book value"""
    method = asset.get("depreciation_method", "none")
    purchase_price = asset.get("purchase_price", 0) or 0
    purchase_date = asset.get("purchase_date")
    useful_life = asset.get("useful_life_years", 0) or 0
    salvage_value = asset.get("salvage_value", 0) or 0
    
    if method == "none" or not purchase_date or useful_life == 0:
        return {
            "accumulated_depreciation": 0,
            "book_value": asset.get("current_value", purchase_price)
        }
    
    try:
        purchase_dt = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        years_elapsed = (now - purchase_dt).days / 365.25
        years_elapsed = min(years_elapsed, useful_life)
        
        depreciable_amount = purchase_price - salvage_value
        
        if method == "straight_line":
            annual_depreciation = depreciable_amount / useful_life
            accumulated = annual_depreciation * years_elapsed
        elif method == "declining_balance":
            rate = 2 / useful_life  # Double declining
            accumulated = purchase_price * (1 - (1 - rate) ** years_elapsed) - salvage_value
            accumulated = max(0, min(accumulated, depreciable_amount))
        else:
            accumulated = 0
        
        book_value = purchase_price - accumulated
        
        return {
            "accumulated_depreciation": round(accumulated, 2),
            "book_value": round(max(book_value, salvage_value), 2)
        }
    except Exception:
        return {
            "accumulated_depreciation": 0,
            "book_value": asset.get("current_value", purchase_price)
        }


def serialize_asset(asset: dict) -> dict:
    """Serialize asset document for response"""
    depreciation = calculate_depreciation(asset)
    
    return {
        "id": asset["_id"],
        "entity_id": asset["entity_id"],
        "name": asset["name"],
        "type": asset["type"],
        "description": asset.get("description"),
        "purchase_date": asset.get("purchase_date"),
        "purchase_price": asset.get("purchase_price"),
        "current_value": asset.get("current_value"),
        "depreciation_method": asset.get("depreciation_method", "none"),
        "useful_life_years": asset.get("useful_life_years"),
        "salvage_value": asset.get("salvage_value"),
        "accumulated_depreciation": depreciation["accumulated_depreciation"],
        "book_value": depreciation["book_value"],
        "location": asset.get("location"),
        "serial_number": asset.get("serial_number"),
        "vendor": asset.get("vendor"),
        "warranty_expiration": asset.get("warranty_expiration"),
        "maintenance_schedule": asset.get("maintenance_schedule"),
        "is_active": asset.get("is_active", True),
        "created_at": asset["created_at"],
        "updated_at": asset["updated_at"]
    }


def serialize_real_estate(prop: dict) -> dict:
    """Serialize real estate document for response"""
    current_value = prop.get("current_value", 0) or 0
    mortgage = prop.get("mortgage_balance", 0) or 0
    equity = current_value - mortgage
    
    monthly_rent = prop.get("monthly_rent", 0) or 0
    monthly_expenses = prop.get("monthly_expenses", 0) or 0
    monthly_cash_flow = monthly_rent - monthly_expenses
    annual_cash_flow = monthly_cash_flow * 12
    
    cap_rate = (annual_cash_flow / current_value * 100) if current_value > 0 else 0
    
    return {
        "id": prop["_id"],
        "entity_id": prop["entity_id"],
        "name": prop["name"],
        "property_type": prop["property_type"],
        "address": prop["address"],
        "purchase_date": prop.get("purchase_date"),
        "purchase_price": prop.get("purchase_price"),
        "current_value": current_value,
        "equity": equity,
        "square_footage": prop.get("square_footage"),
        "lot_size_acres": prop.get("lot_size_acres"),
        "year_built": prop.get("year_built"),
        "bedrooms": prop.get("bedrooms"),
        "bathrooms": prop.get("bathrooms"),
        "monthly_rent": monthly_rent,
        "monthly_expenses": monthly_expenses,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": annual_cash_flow,
        "cap_rate": round(cap_rate, 2),
        "mortgage_balance": mortgage,
        "property_tax_annual": prop.get("property_tax_annual"),
        "insurance_annual": prop.get("insurance_annual"),
        "notes": prop.get("notes"),
        "is_active": prop.get("is_active", True),
        "created_at": prop["created_at"],
        "updated_at": prop["updated_at"]
    }


def serialize_tax_lien(lien: dict) -> dict:
    """Serialize tax lien document for response"""
    lien_amount = lien.get("lien_amount", 0)
    interest_rate = lien.get("interest_rate", 0) / 100
    purchase_date = lien.get("purchase_date")
    
    accrued_interest = 0
    if purchase_date:
        try:
            purchase_dt = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            days_held = (now - purchase_dt).days
            accrued_interest = lien_amount * interest_rate * (days_held / 365)
        except Exception:
            pass
    
    current_value = lien_amount + accrued_interest
    expected_return = accrued_interest / lien_amount * 100 if lien_amount > 0 else 0
    
    return {
        "id": lien["_id"],
        "entity_id": lien["entity_id"],
        "name": lien["name"],
        "parcel_id": lien["parcel_id"],
        "jurisdiction": lien["jurisdiction"],
        "property_address": lien["property_address"],
        "lien_amount": lien_amount,
        "purchase_date": purchase_date,
        "interest_rate": lien.get("interest_rate", 0),
        "redemption_period_months": lien.get("redemption_period_months", 0),
        "status": lien.get("status", "active"),
        "accrued_interest": round(accrued_interest, 2),
        "current_value": round(current_value, 2),
        "expected_return": round(expected_return, 2),
        "redemption_date": lien.get("redemption_date"),
        "notes": lien.get("notes"),
        "is_active": lien.get("is_active", True),
        "created_at": lien["created_at"],
        "updated_at": lien["updated_at"]
    }


def serialize_private_equity(pe: dict) -> dict:
    """Serialize private equity document for response"""
    investment = pe.get("investment_amount", 0)
    valuation = pe.get("current_valuation", investment)
    ownership = pe.get("ownership_percentage", 0) or 0
    
    current_value = valuation * (ownership / 100) if ownership > 0 else valuation
    unrealized = current_value - investment
    moic = current_value / investment if investment > 0 else 1.0
    
    return {
        "id": pe["_id"],
        "entity_id": pe["entity_id"],
        "name": pe["name"],
        "company_name": pe["company_name"],
        "investment_date": pe["investment_date"],
        "investment_amount": investment,
        "ownership_percentage": ownership,
        "shares": pe.get("shares"),
        "current_valuation": valuation,
        "current_value": round(current_value, 2),
        "unrealized_gain_loss": round(unrealized, 2),
        "moic": round(moic, 2),
        "fund_name": pe.get("fund_name"),
        "investment_stage": pe.get("investment_stage"),
        "exit_date": pe.get("exit_date"),
        "exit_proceeds": pe.get("exit_proceeds"),
        "notes": pe.get("notes"),
        "is_active": pe.get("is_active", True),
        "created_at": pe["created_at"],
        "updated_at": pe["updated_at"]
    }


def serialize_precious_metal(metal: dict) -> dict:
    """Serialize precious metal document for response"""
    weight = metal.get("weight_oz", 0)
    purchase_price = metal.get("purchase_price_per_oz", 0) or 0
    current_price = metal.get("current_price_per_oz", purchase_price)
    
    total_cost = weight * purchase_price
    current_value = weight * current_price
    gain_loss = current_value - total_cost
    gain_loss_pct = (gain_loss / total_cost * 100) if total_cost > 0 else 0
    
    return {
        "id": metal["_id"],
        "entity_id": metal["entity_id"],
        "name": metal["name"],
        "metal_type": metal["metal_type"],
        "form": metal["form"],
        "weight_oz": weight,
        "purity": metal.get("purity", 0.999),
        "purchase_date": metal.get("purchase_date"),
        "purchase_price_per_oz": purchase_price,
        "total_cost": round(total_cost, 2),
        "current_price_per_oz": current_price,
        "current_value": round(current_value, 2),
        "gain_loss": round(gain_loss, 2),
        "gain_loss_percent": round(gain_loss_pct, 2),
        "storage_location": metal.get("storage_location"),
        "certification": metal.get("certification"),
        "notes": metal.get("notes"),
        "is_active": metal.get("is_active", True),
        "created_at": metal["created_at"],
        "updated_at": metal["updated_at"]
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
# GENERAL ASSET ENDPOINTS
# =============================================================================

@app.get("/api/assets", response_model=List[AssetResponse])
async def list_assets(
    request: Request,
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
):
    """List general assets"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        query["entity_id"] = entity_id
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        query["entity_id"] = {"$in": [e["_id"] for e in entities]}
    
    assets = await db.assets.find(query).sort("name", 1).to_list(500)
    return [serialize_asset(a) for a in assets]


@app.post("/api/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(data: AssetInput, request: Request):
    """Create a general asset"""
    user = get_user_context(request)
    
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    from bson import ObjectId
    asset_id = str(ObjectId())
    
    asset_doc = {
        "_id": asset_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "type": data.type.value,
        "description": data.description,
        "purchase_date": data.purchase_date,
        "purchase_price": data.purchase_price,
        "current_value": data.current_value,
        "depreciation_method": data.depreciation_method.value,
        "useful_life_years": data.useful_life_years,
        "salvage_value": data.salvage_value,
        "location": data.location,
        "serial_number": data.serial_number,
        "vendor": data.vendor,
        "warranty_expiration": data.warranty_expiration,
        "maintenance_schedule": data.maintenance_schedule,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.assets.insert_one(asset_doc)
    return serialize_asset(asset_doc)


@app.get("/api/assets/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, request: Request):
    """Get a general asset"""
    user = get_user_context(request)
    
    asset = await db.assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if not await verify_entity_access(asset["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_asset(asset)


@app.put("/api/assets/{asset_id}", response_model=AssetResponse)
async def update_asset(asset_id: str, data: AssetUpdate, request: Request):
    """Update a general asset"""
    user = get_user_context(request)
    
    asset = await db.assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if not await verify_entity_access(asset["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    
    for field in ["name", "description", "purchase_date", "purchase_price", 
                  "current_value", "useful_life_years", "salvage_value",
                  "location", "serial_number", "vendor", "warranty_expiration",
                  "maintenance_schedule"]:
        value = getattr(data, field, None)
        if value is not None:
            updates[field] = value
    
    if data.type is not None:
        updates["type"] = data.type.value
    if data.depreciation_method is not None:
        updates["depreciation_method"] = data.depreciation_method.value
    
    await db.assets.update_one({"_id": asset_id}, {"$set": updates})
    updated = await db.assets.find_one({"_id": asset_id})
    return serialize_asset(updated)


@app.delete("/api/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, request: Request):
    """Soft delete a general asset"""
    user = get_user_context(request)
    
    asset = await db.assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if not await verify_entity_access(asset["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.assets.update_one(
        {"_id": asset_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return None


# =============================================================================
# REAL ESTATE ENDPOINTS
# =============================================================================

@app.get("/api/real-estate", response_model=List[RealEstateResponse])
async def list_real_estate(
    request: Request,
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
):
    """List real estate properties"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        query["entity_id"] = entity_id
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        query["entity_id"] = {"$in": [e["_id"] for e in entities]}
    
    properties = await db.real_estate_assets.find(query).sort("name", 1).to_list(500)
    return [serialize_real_estate(p) for p in properties]


@app.post("/api/real-estate", response_model=RealEstateResponse, status_code=status.HTTP_201_CREATED)
async def create_real_estate(data: RealEstateInput, request: Request):
    """Create a real estate property"""
    user = get_user_context(request)
    
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    from bson import ObjectId
    prop_id = str(ObjectId())
    
    prop_doc = {
        "_id": prop_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "property_type": data.property_type.value,
        "address": data.address,
        "purchase_date": data.purchase_date,
        "purchase_price": data.purchase_price,
        "current_value": data.current_value,
        "square_footage": data.square_footage,
        "lot_size_acres": data.lot_size_acres,
        "year_built": data.year_built,
        "bedrooms": data.bedrooms,
        "bathrooms": data.bathrooms,
        "monthly_rent": data.monthly_rent,
        "monthly_expenses": data.monthly_expenses,
        "mortgage_balance": data.mortgage_balance,
        "property_tax_annual": data.property_tax_annual,
        "insurance_annual": data.insurance_annual,
        "notes": data.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.real_estate_assets.insert_one(prop_doc)
    return serialize_real_estate(prop_doc)


@app.get("/api/real-estate/{property_id}", response_model=RealEstateResponse)
async def get_real_estate(property_id: str, request: Request):
    """Get a real estate property"""
    user = get_user_context(request)
    
    prop = await db.real_estate_assets.find_one({"_id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if not await verify_entity_access(prop["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_real_estate(prop)


@app.delete("/api/real-estate/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_real_estate(property_id: str, request: Request):
    """Soft delete a real estate property"""
    user = get_user_context(request)
    
    prop = await db.real_estate_assets.find_one({"_id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if not await verify_entity_access(prop["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.real_estate_assets.update_one(
        {"_id": property_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return None


# =============================================================================
# TAX LIEN ENDPOINTS
# =============================================================================

@app.get("/api/tax-liens", response_model=List[TaxLienResponse])
async def list_tax_liens(
    request: Request,
    entity_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_active: bool = Query(True),
):
    """List tax liens"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    if status:
        query["status"] = status
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        query["entity_id"] = entity_id
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        query["entity_id"] = {"$in": [e["_id"] for e in entities]}
    
    liens = await db.tax_liens.find(query).sort("purchase_date", -1).to_list(500)
    return [serialize_tax_lien(lien) for lien in liens]


@app.post("/api/tax-liens", response_model=TaxLienResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_lien(data: TaxLienInput, request: Request):
    """Create a tax lien"""
    user = get_user_context(request)
    
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    from bson import ObjectId
    lien_id = str(ObjectId())
    
    lien_doc = {
        "_id": lien_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "parcel_id": data.parcel_id,
        "jurisdiction": data.jurisdiction,
        "property_address": data.property_address,
        "lien_amount": data.lien_amount,
        "purchase_date": data.purchase_date,
        "interest_rate": data.interest_rate,
        "redemption_period_months": data.redemption_period_months,
        "status": data.status.value,
        "notes": data.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.tax_liens.insert_one(lien_doc)
    return serialize_tax_lien(lien_doc)


@app.get("/api/tax-liens/{lien_id}", response_model=TaxLienResponse)
async def get_tax_lien(lien_id: str, request: Request):
    """Get a tax lien"""
    user = get_user_context(request)
    
    lien = await db.tax_liens.find_one({"_id": lien_id})
    if not lien:
        raise HTTPException(status_code=404, detail="Tax lien not found")
    
    if not await verify_entity_access(lien["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_tax_lien(lien)


@app.delete("/api/tax-liens/{lien_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tax_lien(lien_id: str, request: Request):
    """Soft delete a tax lien"""
    user = get_user_context(request)
    
    lien = await db.tax_liens.find_one({"_id": lien_id})
    if not lien:
        raise HTTPException(status_code=404, detail="Tax lien not found")
    
    if not await verify_entity_access(lien["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.tax_liens.update_one(
        {"_id": lien_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return None


# =============================================================================
# PRIVATE EQUITY ENDPOINTS
# =============================================================================

@app.get("/api/private-equity", response_model=List[PrivateEquityResponse])
async def list_private_equity(
    request: Request,
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
):
    """List private equity investments"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        query["entity_id"] = entity_id
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        query["entity_id"] = {"$in": [e["_id"] for e in entities]}
    
    investments = await db.private_equity.find(query).sort("investment_date", -1).to_list(500)
    return [serialize_private_equity(pe) for pe in investments]


@app.post("/api/private-equity", response_model=PrivateEquityResponse, status_code=status.HTTP_201_CREATED)
async def create_private_equity(data: PrivateEquityInput, request: Request):
    """Create a private equity investment"""
    user = get_user_context(request)
    
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    from bson import ObjectId
    pe_id = str(ObjectId())
    
    pe_doc = {
        "_id": pe_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "company_name": data.company_name,
        "investment_date": data.investment_date,
        "investment_amount": data.investment_amount,
        "ownership_percentage": data.ownership_percentage,
        "shares": data.shares,
        "current_valuation": data.current_valuation,
        "fund_name": data.fund_name,
        "investment_stage": data.investment_stage,
        "exit_date": data.exit_date,
        "exit_proceeds": data.exit_proceeds,
        "notes": data.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.private_equity.insert_one(pe_doc)
    return serialize_private_equity(pe_doc)


@app.get("/api/private-equity/{pe_id}", response_model=PrivateEquityResponse)
async def get_private_equity(pe_id: str, request: Request):
    """Get a private equity investment"""
    user = get_user_context(request)
    
    pe = await db.private_equity.find_one({"_id": pe_id})
    if not pe:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    if not await verify_entity_access(pe["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_private_equity(pe)


@app.delete("/api/private-equity/{pe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_private_equity(pe_id: str, request: Request):
    """Soft delete a private equity investment"""
    user = get_user_context(request)
    
    pe = await db.private_equity.find_one({"_id": pe_id})
    if not pe:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    if not await verify_entity_access(pe["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.private_equity.update_one(
        {"_id": pe_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return None


# =============================================================================
# PRECIOUS METALS ENDPOINTS
# =============================================================================

@app.get("/api/precious-metals", response_model=List[PreciousMetalResponse])
async def list_precious_metals(
    request: Request,
    entity_id: Optional[str] = Query(None),
    metal_type: Optional[str] = Query(None),
    is_active: bool = Query(True),
):
    """List precious metals"""
    user = get_user_context(request)
    
    query = {"is_active": is_active}
    if metal_type:
        query["metal_type"] = metal_type
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        query["entity_id"] = entity_id
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        query["entity_id"] = {"$in": [e["_id"] for e in entities]}
    
    metals = await db.precious_metals.find(query).sort("name", 1).to_list(500)
    return [serialize_precious_metal(m) for m in metals]


@app.post("/api/precious-metals", response_model=PreciousMetalResponse, status_code=status.HTTP_201_CREATED)
async def create_precious_metal(data: PreciousMetalInput, request: Request):
    """Create a precious metal holding"""
    user = get_user_context(request)
    
    if not await verify_entity_access(data.entity_id, user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    from bson import ObjectId
    metal_id = str(ObjectId())
    
    metal_doc = {
        "_id": metal_id,
        "entity_id": data.entity_id,
        "name": data.name,
        "metal_type": data.metal_type.value,
        "form": data.form,
        "weight_oz": data.weight_oz,
        "purity": data.purity,
        "purchase_date": data.purchase_date,
        "purchase_price_per_oz": data.purchase_price_per_oz,
        "current_price_per_oz": data.current_price_per_oz,
        "storage_location": data.storage_location,
        "certification": data.certification,
        "notes": data.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.precious_metals.insert_one(metal_doc)
    return serialize_precious_metal(metal_doc)


@app.get("/api/precious-metals/{metal_id}", response_model=PreciousMetalResponse)
async def get_precious_metal(metal_id: str, request: Request):
    """Get a precious metal holding"""
    user = get_user_context(request)
    
    metal = await db.precious_metals.find_one({"_id": metal_id})
    if not metal:
        raise HTTPException(status_code=404, detail="Precious metal not found")
    
    if not await verify_entity_access(metal["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_precious_metal(metal)


@app.delete("/api/precious-metals/{metal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_precious_metal(metal_id: str, request: Request):
    """Soft delete a precious metal holding"""
    user = get_user_context(request)
    
    metal = await db.precious_metals.find_one({"_id": metal_id})
    if not metal:
        raise HTTPException(status_code=404, detail="Precious metal not found")
    
    if not await verify_entity_access(metal["entity_id"], user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.precious_metals.update_one(
        {"_id": metal_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return None


# =============================================================================
# ASSET SUMMARY ENDPOINTS
# =============================================================================

@app.get("/api/assets/summary")
async def get_assets_summary(
    request: Request,
    entity_id: Optional[str] = Query(None),
):
    """Get a summary of all assets across categories"""
    user = get_user_context(request)
    
    if entity_id:
        if not await verify_entity_access(entity_id, user["user_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        entity_ids = [entity_id]
    else:
        entities = await db.entities.find({"owner_id": user["user_id"]}).to_list(100)
        entity_ids = [e["_id"] for e in entities]
    
    base_query = {"entity_id": {"$in": entity_ids}, "is_active": True}
    
    # General assets
    assets = await db.assets.find(base_query).to_list(500)
    general_value = sum(a.get("current_value", 0) or 0 for a in assets)
    
    # Real estate
    properties = await db.real_estate_assets.find(base_query).to_list(500)
    real_estate_value = sum(p.get("current_value", 0) or 0 for p in properties)
    real_estate_equity = sum(
        (p.get("current_value", 0) or 0) - (p.get("mortgage_balance", 0) or 0)
        for p in properties
    )
    
    # Tax liens
    liens = await db.tax_liens.find({**base_query, "status": "active"}).to_list(500)
    liens_value = sum(serialize_tax_lien(lien)["current_value"] for lien in liens)
    
    # Private equity
    pe_investments = await db.private_equity.find(base_query).to_list(500)
    pe_value = sum(serialize_private_equity(pe)["current_value"] for pe in pe_investments)
    
    # Precious metals
    metals = await db.precious_metals.find(base_query).to_list(500)
    metals_value = sum(serialize_precious_metal(m)["current_value"] for m in metals)
    
    total_value = general_value + real_estate_value + liens_value + pe_value + metals_value
    
    return {
        "general_assets": {
            "count": len(assets),
            "value": round(general_value, 2)
        },
        "real_estate": {
            "count": len(properties),
            "value": round(real_estate_value, 2),
            "equity": round(real_estate_equity, 2)
        },
        "tax_liens": {
            "count": len(liens),
            "value": round(liens_value, 2)
        },
        "private_equity": {
            "count": len(pe_investments),
            "value": round(pe_value, 2)
        },
        "precious_metals": {
            "count": len(metals),
            "value": round(metals_value, 2)
        },
        "total_assets_value": round(total_value, 2),
        "total_assets_count": len(assets) + len(properties) + len(liens) + len(pe_investments) + len(metals)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
