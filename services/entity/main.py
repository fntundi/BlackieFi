"""
BlackieFi Entity Service
Manages legal/organizational entities (LLCs, LPs, etc.) that own portfolios, assets, and strategies.
Entity-aware scoping for all domain services.

Features:
- Full CRUD for entities
- Entity types (LLC, LP, Personal, Trust, Corporation)
- Jurisdiction tracking
- Entity archiving (soft delete preserving history)
- Entity-level settings and preferences
- Default entity per user
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
SERVICE_NAME = os.environ.get("SERVICE_NAME", "entity-service")
PORT = int(os.environ.get("PORT", 8003))
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/blackiefi")
DB_NAME = os.environ.get("DB_NAME", "blackiefi")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/3")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Database clients
mongo_client: Optional[AsyncIOMotorClient] = None
db = None
redis_client: Optional[redis.Redis] = None

security = HTTPBearer(auto_error=False)


# =============================================================================
# ENUMS & MODELS
# =============================================================================

class EntityType(str, Enum):
    PERSONAL = "personal"
    LLC = "llc"
    LP = "lp"
    TRUST = "trust"
    CORPORATION = "corporation"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    NON_PROFIT = "non_profit"


class EntityStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    SUSPENDED = "suspended"


class EntityInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    legal_name: Optional[str] = None
    type: EntityType = EntityType.PERSONAL
    jurisdiction: Optional[str] = None  # e.g., "Delaware", "Wyoming", "California"
    ein_ssn: Optional[str] = None  # Tax ID (encrypted at rest)
    formation_date: Optional[str] = None
    fiscal_year_end: Optional[str] = None  # e.g., "12-31"
    description: Optional[str] = None
    address: Optional[dict] = None  # {street, city, state, zip, country}
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    settings: Optional[dict] = None  # Entity-specific settings


class EntityUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    type: Optional[EntityType] = None
    jurisdiction: Optional[str] = None
    ein_ssn: Optional[str] = None
    formation_date: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    description: Optional[str] = None
    address: Optional[dict] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    settings: Optional[dict] = None


class EntityResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    legal_name: Optional[str] = None
    type: str
    jurisdiction: Optional[str] = None
    formation_date: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    description: Optional[str] = None
    address: Optional[dict] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "active"
    settings: Optional[dict] = None
    # Computed fields
    portfolio_count: int = 0
    asset_count: int = 0
    total_value: float = 0.0
    created_at: str
    updated_at: str


class EntitySummary(BaseModel):
    id: str
    name: str
    type: str
    status: str
    portfolio_count: int = 0
    asset_count: int = 0
    total_value: float = 0.0


class SetDefaultEntityInput(BaseModel):
    entity_id: str


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global mongo_client, db, redis_client
    
    print(f"[{SERVICE_NAME}] Starting Entity Service...")
    
    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Create indexes
    await db.entities.create_index("owner_id")
    await db.entities.create_index([("owner_id", 1), ("status", 1)])
    await db.entities.create_index("type")
    await db.entities.create_index("jurisdiction")
    await db.user_entity_defaults.create_index("user_id", unique=True)
    
    print(f"[{SERVICE_NAME}] Connected to MongoDB")
    
    # Connect to Redis
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print(f"[{SERVICE_NAME}] Connected to Redis")
    except Exception as e:
        print(f"[{SERVICE_NAME}] Warning: Redis connection failed: {e}")
        redis_client = None
    
    print(f"[{SERVICE_NAME}] Entity Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    print(f"[{SERVICE_NAME}] Shutting down...")
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="BlackieFi Entity Service",
    description="Entity Management Service - Legal/organizational entities for portfolios and assets",
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


async def get_entity_stats(entity_id: str) -> dict:
    """Get computed statistics for an entity"""
    # Count portfolios/accounts
    portfolio_count = await db.accounts.count_documents({"entity_id": entity_id, "is_active": True})
    
    # Count assets
    asset_count = await db.assets.count_documents({"entity_id": entity_id, "is_active": True})
    asset_count += await db.real_estate_assets.count_documents({"entity_id": entity_id, "is_active": True})
    asset_count += await db.tax_liens.count_documents({"entity_id": entity_id, "is_active": True})
    asset_count += await db.private_equity.count_documents({"entity_id": entity_id, "is_active": True})
    asset_count += await db.precious_metals.count_documents({"entity_id": entity_id, "is_active": True})
    
    # Calculate total value (simplified)
    accounts = await db.accounts.find({"entity_id": entity_id, "is_active": True}).to_list(1000)
    total_value = sum(float(a.get("balance", 0)) for a in accounts)
    
    return {
        "portfolio_count": portfolio_count,
        "asset_count": asset_count,
        "total_value": total_value
    }


def serialize_entity(entity: dict, stats: dict = None) -> dict:
    """Serialize entity document for response"""
    result = {
        "id": entity["_id"],
        "owner_id": entity["owner_id"],
        "name": entity["name"],
        "legal_name": entity.get("legal_name"),
        "type": entity["type"],
        "jurisdiction": entity.get("jurisdiction"),
        "formation_date": entity.get("formation_date"),
        "fiscal_year_end": entity.get("fiscal_year_end"),
        "description": entity.get("description"),
        "address": entity.get("address"),
        "contact_email": entity.get("contact_email"),
        "contact_phone": entity.get("contact_phone"),
        "status": entity.get("status", "active"),
        "settings": entity.get("settings"),
        "portfolio_count": 0,
        "asset_count": 0,
        "total_value": 0.0,
        "created_at": entity["created_at"],
        "updated_at": entity["updated_at"]
    }
    
    if stats:
        result.update(stats)
    
    return result


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
# ENTITY ENDPOINTS
# =============================================================================

@app.get("/api/entities", response_model=List[EntityResponse])
async def list_entities(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    type: Optional[str] = Query(None, description="Filter by entity type"),
    include_stats: bool = Query(False, description="Include computed statistics"),
):
    """List all entities for the current user"""
    user = get_user_context(request)
    
    query = {"owner_id": user["user_id"]}
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "archived"}  # Exclude archived by default
    
    if type:
        query["type"] = type
    
    entities = await db.entities.find(query).sort("name", 1).to_list(500)
    
    results = []
    for entity in entities:
        stats = await get_entity_stats(entity["_id"]) if include_stats else None
        results.append(serialize_entity(entity, stats))
    
    return results


@app.post("/api/entities", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(data: EntityInput, request: Request):
    """Create a new entity"""
    user = get_user_context(request)
    now = datetime.now(timezone.utc).isoformat()
    
    from bson import ObjectId
    entity_id = str(ObjectId())
    
    entity_doc = {
        "_id": entity_id,
        "owner_id": user["user_id"],
        "name": data.name,
        "legal_name": data.legal_name or data.name,
        "type": data.type.value,
        "jurisdiction": data.jurisdiction,
        "formation_date": data.formation_date,
        "fiscal_year_end": data.fiscal_year_end,
        "description": data.description,
        "address": data.address,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "status": "active",
        "settings": data.settings or {},
        "created_at": now,
        "updated_at": now
    }
    
    await db.entities.insert_one(entity_doc)
    
    # Set as default if it's the user's first entity
    existing_default = await db.user_entity_defaults.find_one({"user_id": user["user_id"]})
    if not existing_default:
        await db.user_entity_defaults.insert_one({
            "user_id": user["user_id"],
            "entity_id": entity_id,
            "updated_at": now
        })
    
    # Log audit event
    await db.audit_log.insert_one({
        "action": "entity.create",
        "actor_id": user["user_id"],
        "entity_id": entity_id,
        "details": {"name": data.name, "type": data.type.value},
        "timestamp": now
    })
    
    return serialize_entity(entity_doc)


@app.get("/api/entities/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, request: Request, include_stats: bool = Query(True)):
    """Get a specific entity with optional statistics"""
    user = get_user_context(request)
    
    entity = await db.entities.find_one({
        "_id": entity_id,
        "owner_id": user["user_id"]
    })
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    stats = await get_entity_stats(entity_id) if include_stats else None
    return serialize_entity(entity, stats)


@app.put("/api/entities/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, data: EntityUpdate, request: Request):
    """Update an entity"""
    user = get_user_context(request)
    
    entity = await db.entities.find_one({
        "_id": entity_id,
        "owner_id": user["user_id"]
    })
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    if entity.get("status") == "archived":
        raise HTTPException(status_code=400, detail="Cannot update archived entity")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    
    # Only update provided fields
    if data.name is not None:
        updates["name"] = data.name
    if data.legal_name is not None:
        updates["legal_name"] = data.legal_name
    if data.type is not None:
        updates["type"] = data.type.value
    if data.jurisdiction is not None:
        updates["jurisdiction"] = data.jurisdiction
    if data.ein_ssn is not None:
        updates["ein_ssn"] = data.ein_ssn  # Should be encrypted
    if data.formation_date is not None:
        updates["formation_date"] = data.formation_date
    if data.fiscal_year_end is not None:
        updates["fiscal_year_end"] = data.fiscal_year_end
    if data.description is not None:
        updates["description"] = data.description
    if data.address is not None:
        updates["address"] = data.address
    if data.contact_email is not None:
        updates["contact_email"] = data.contact_email
    if data.contact_phone is not None:
        updates["contact_phone"] = data.contact_phone
    if data.settings is not None:
        updates["settings"] = data.settings
    
    await db.entities.update_one({"_id": entity_id}, {"$set": updates})
    
    # Log audit event
    await db.audit_log.insert_one({
        "action": "entity.update",
        "actor_id": user["user_id"],
        "entity_id": entity_id,
        "details": {"fields_updated": list(updates.keys())},
        "timestamp": now
    })
    
    updated = await db.entities.find_one({"_id": entity_id})
    stats = await get_entity_stats(entity_id)
    return serialize_entity(updated, stats)


@app.post("/api/entities/{entity_id}/archive")
async def archive_entity(entity_id: str, request: Request):
    """Archive an entity (soft delete - preserves history)"""
    user = get_user_context(request)
    
    entity = await db.entities.find_one({
        "_id": entity_id,
        "owner_id": user["user_id"]
    })
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    if entity.get("status") == "archived":
        raise HTTPException(status_code=400, detail="Entity is already archived")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.entities.update_one(
        {"_id": entity_id},
        {"$set": {"status": "archived", "archived_at": now, "updated_at": now}}
    )
    
    # If this was the default entity, clear the default
    default = await db.user_entity_defaults.find_one({"user_id": user["user_id"]})
    if default and default.get("entity_id") == entity_id:
        # Find another active entity to set as default
        other_entity = await db.entities.find_one({
            "owner_id": user["user_id"],
            "status": "active",
            "_id": {"$ne": entity_id}
        })
        if other_entity:
            await db.user_entity_defaults.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"entity_id": other_entity["_id"], "updated_at": now}}
            )
        else:
            await db.user_entity_defaults.delete_one({"user_id": user["user_id"]})
    
    # Log audit event
    await db.audit_log.insert_one({
        "action": "entity.archive",
        "actor_id": user["user_id"],
        "entity_id": entity_id,
        "details": {"name": entity["name"]},
        "timestamp": now
    })
    
    return {"message": "Entity archived successfully", "entity_id": entity_id}


@app.post("/api/entities/{entity_id}/restore")
async def restore_entity(entity_id: str, request: Request):
    """Restore an archived entity"""
    user = get_user_context(request)
    
    entity = await db.entities.find_one({
        "_id": entity_id,
        "owner_id": user["user_id"]
    })
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    if entity.get("status") != "archived":
        raise HTTPException(status_code=400, detail="Entity is not archived")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.entities.update_one(
        {"_id": entity_id},
        {"$set": {"status": "active", "updated_at": now}, "$unset": {"archived_at": ""}}
    )
    
    # Log audit event
    await db.audit_log.insert_one({
        "action": "entity.restore",
        "actor_id": user["user_id"],
        "entity_id": entity_id,
        "details": {"name": entity["name"]},
        "timestamp": now
    })
    
    return {"message": "Entity restored successfully", "entity_id": entity_id}


@app.delete("/api/entities/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entity(entity_id: str, request: Request, force: bool = Query(False)):
    """
    Delete an entity permanently.
    Use force=true to delete even if entity has associated data.
    Recommended: Use archive endpoint instead.
    """
    user = get_user_context(request)
    
    entity = await db.entities.find_one({
        "_id": entity_id,
        "owner_id": user["user_id"]
    })
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Check for associated data
    if not force:
        stats = await get_entity_stats(entity_id)
        if stats["portfolio_count"] > 0 or stats["asset_count"] > 0:
            raise HTTPException(
                status_code=400,
                detail="Entity has associated portfolios or assets. Use ?force=true to delete anyway, or archive instead."
            )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Log audit event before deletion
    await db.audit_log.insert_one({
        "action": "entity.delete",
        "actor_id": user["user_id"],
        "entity_id": entity_id,
        "details": {"name": entity["name"], "force": force},
        "timestamp": now
    })
    
    # Delete the entity
    await db.entities.delete_one({"_id": entity_id})
    
    # Clear default if needed
    await db.user_entity_defaults.delete_one({"user_id": user["user_id"], "entity_id": entity_id})
    
    return None


# =============================================================================
# DEFAULT ENTITY ENDPOINTS
# =============================================================================

@app.get("/api/entities/default/current")
async def get_default_entity(request: Request):
    """Get the user's default entity"""
    user = get_user_context(request)
    
    default = await db.user_entity_defaults.find_one({"user_id": user["user_id"]})
    
    if not default:
        # Return the first active entity
        entity = await db.entities.find_one({
            "owner_id": user["user_id"],
            "status": "active"
        })
        if entity:
            return {"entity_id": entity["_id"], "name": entity["name"]}
        raise HTTPException(status_code=404, detail="No entities found")
    
    entity = await db.entities.find_one({"_id": default["entity_id"]})
    if not entity:
        raise HTTPException(status_code=404, detail="Default entity not found")
    
    return {"entity_id": entity["_id"], "name": entity["name"]}


@app.post("/api/entities/default/set")
async def set_default_entity(data: SetDefaultEntityInput, request: Request):
    """Set the user's default entity"""
    user = get_user_context(request)
    
    # Verify entity exists and belongs to user
    entity = await db.entities.find_one({
        "_id": data.entity_id,
        "owner_id": user["user_id"],
        "status": "active"
    })
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found or not active")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.user_entity_defaults.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"entity_id": data.entity_id, "updated_at": now}},
        upsert=True
    )
    
    return {"message": "Default entity set", "entity_id": data.entity_id, "name": entity["name"]}


# =============================================================================
# ENTITY SUMMARY ENDPOINTS
# =============================================================================

@app.get("/api/entities/summary")
async def get_entities_summary(request: Request):
    """Get a summary of all user's entities with key metrics"""
    user = get_user_context(request)
    
    entities = await db.entities.find({
        "owner_id": user["user_id"],
        "status": {"$ne": "archived"}
    }).to_list(100)
    
    summaries = []
    total_value = 0.0
    
    for entity in entities:
        stats = await get_entity_stats(entity["_id"])
        summaries.append({
            "id": entity["_id"],
            "name": entity["name"],
            "type": entity["type"],
            "status": entity.get("status", "active"),
            **stats
        })
        total_value += stats["total_value"]
    
    return {
        "entities": summaries,
        "total_entities": len(summaries),
        "total_combined_value": total_value
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
