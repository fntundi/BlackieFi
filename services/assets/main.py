"""
BlackieFi 3.0 - Assets Service
Manages real estate, precious metals, and other assets.
"""
import sys
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from shared.config import settings
from shared.database import get_db, MongoDB
from shared.auth_utils import decode_token, is_token_blacklisted
from shared.models import HealthCheck, AssetCreate, AssetResponse

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BlackieFi Assets Service",
    version="3.0.0",
    description="Asset management service for real estate, precious metals, etc."
)

router = APIRouter()
security = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    if await is_token_blacklisted(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalidated")
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user_id


@router.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(service="assets", status="healthy")


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(asset: AssetCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new asset."""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    asset_doc = {
        "id": str(uuid.uuid4()),
        "name": asset.name,
        "asset_type": asset.asset_type,
        "value": asset.value,
        "description": asset.description,
        "location": asset.location,
        "owner_id": user_id,
        "entity_id": asset.entity_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.assets.insert_one(asset_doc)
    
    return AssetResponse(
        id=asset_doc["id"],
        name=asset_doc["name"],
        asset_type=asset_doc["asset_type"],
        value=asset_doc["value"],
        description=asset_doc["description"],
        location=asset_doc["location"],
        owner_id=asset_doc["owner_id"],
        entity_id=asset_doc["entity_id"],
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[AssetResponse])
async def list_assets(
    entity_id: Optional[str] = None,
    asset_type: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """List all assets for the current user."""
    db = get_db()
    
    query = {"owner_id": user_id}
    if entity_id:
        query["entity_id"] = entity_id
    if asset_type:
        query["asset_type"] = asset_type
    
    assets = await db.assets.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for a in assets:
        created_at = a.get("created_at")
        updated_at = a.get("updated_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        result.append(AssetResponse(
            id=a["id"],
            name=a["name"],
            asset_type=a["asset_type"],
            value=a.get("value", 0.0),
            description=a.get("description"),
            location=a.get("location"),
            owner_id=a["owner_id"],
            entity_id=a.get("entity_id"),
            created_at=created_at or datetime.now(timezone.utc),
            updated_at=updated_at or datetime.now(timezone.utc)
        ))
    
    return result


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific asset."""
    db = get_db()
    asset = await db.assets.find_one({"id": asset_id, "owner_id": user_id}, {"_id": 0})
    
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    
    created_at = asset.get("created_at")
    updated_at = asset.get("updated_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
    
    return AssetResponse(
        id=asset["id"],
        name=asset["name"],
        asset_type=asset["asset_type"],
        value=asset.get("value", 0.0),
        description=asset.get("description"),
        location=asset.get("location"),
        owner_id=asset["owner_id"],
        entity_id=asset.get("entity_id"),
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=updated_at or datetime.now(timezone.utc)
    )


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(asset_id: str, asset: AssetCreate, user_id: str = Depends(get_current_user_id)):
    """Update an asset."""
    db = get_db()
    
    existing = await db.assets.find_one({"id": asset_id, "owner_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "name": asset.name,
        "asset_type": asset.asset_type,
        "value": asset.value,
        "description": asset.description,
        "location": asset.location,
        "entity_id": asset.entity_id,
        "updated_at": now.isoformat()
    }
    
    await db.assets.update_one({"id": asset_id}, {"$set": update_data})
    
    created_at = existing.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return AssetResponse(
        id=asset_id,
        name=asset.name,
        asset_type=asset.asset_type,
        value=asset.value,
        description=asset.description,
        location=asset.location,
        owner_id=user_id,
        entity_id=asset.entity_id,
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=now
    )


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete an asset."""
    db = get_db()
    
    result = await db.assets.delete_one({"id": asset_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    
    return {"message": "Asset deleted successfully"}


@router.get("/summary/total")
async def get_assets_summary(user_id: str = Depends(get_current_user_id)):
    """Get assets summary with total values."""
    db = get_db()
    assets = await db.assets.find({"owner_id": user_id}, {"_id": 0}).to_list(100)
    
    total_value = sum(a.get("value", 0) for a in assets)
    by_type = {}
    
    for a in assets:
        asset_type = a.get("asset_type", "other")
        value = a.get("value", 0)
        by_type[asset_type] = by_type.get(asset_type, 0) + value
    
    return {
        "total_assets": len(assets),
        "total_value": total_value,
        "by_type": by_type
    }


# Include router
app.include_router(router, prefix="/api/assets", tags=["assets"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    await MongoDB.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
