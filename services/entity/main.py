"""
BlackieFi 3.0 - Entity Service
Manages LLCs, trusts, and corporations.
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
from shared.models import (
    HealthCheck, EntityCreate, EntityResponse
)

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BlackieFi Entity Service",
    version="3.0.0",
    description="Entity management service for LLCs, trusts, and corporations"
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
    return HealthCheck(service="entity", status="healthy")


@router.post("/", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(entity: EntityCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new entity."""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    entity_doc = {
        "id": str(uuid.uuid4()),
        "name": entity.name,
        "entity_type": entity.entity_type,
        "jurisdiction": entity.jurisdiction,
        "description": entity.description,
        "owner_id": user_id,
        "status": "active",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.entities.insert_one(entity_doc)
    
    return EntityResponse(
        id=entity_doc["id"],
        name=entity_doc["name"],
        entity_type=entity_doc["entity_type"],
        jurisdiction=entity_doc["jurisdiction"],
        description=entity_doc["description"],
        owner_id=entity_doc["owner_id"],
        status=entity_doc["status"],
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[EntityResponse])
async def list_entities(user_id: str = Depends(get_current_user_id)):
    """List all entities for the current user."""
    db = get_db()
    entities = await db.entities.find({"owner_id": user_id}, {"_id": 0}).to_list(100)
    
    result = []
    for e in entities:
        created_at = e.get("created_at")
        updated_at = e.get("updated_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        result.append(EntityResponse(
            id=e["id"],
            name=e["name"],
            entity_type=e["entity_type"],
            jurisdiction=e.get("jurisdiction"),
            description=e.get("description"),
            owner_id=e["owner_id"],
            status=e.get("status", "active"),
            created_at=created_at or datetime.now(timezone.utc),
            updated_at=updated_at or datetime.now(timezone.utc)
        ))
    
    return result


@router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific entity."""
    db = get_db()
    entity = await db.entities.find_one({"id": entity_id, "owner_id": user_id}, {"_id": 0})
    
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")
    
    created_at = entity.get("created_at")
    updated_at = entity.get("updated_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
    
    return EntityResponse(
        id=entity["id"],
        name=entity["name"],
        entity_type=entity["entity_type"],
        jurisdiction=entity.get("jurisdiction"),
        description=entity.get("description"),
        owner_id=entity["owner_id"],
        status=entity.get("status", "active"),
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=updated_at or datetime.now(timezone.utc)
    )


@router.put("/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, entity: EntityCreate, user_id: str = Depends(get_current_user_id)):
    """Update an entity."""
    db = get_db()
    
    existing = await db.entities.find_one({"id": entity_id, "owner_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "name": entity.name,
        "entity_type": entity.entity_type,
        "jurisdiction": entity.jurisdiction,
        "description": entity.description,
        "updated_at": now.isoformat()
    }
    
    await db.entities.update_one({"id": entity_id}, {"$set": update_data})
    
    created_at = existing.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return EntityResponse(
        id=entity_id,
        name=entity.name,
        entity_type=entity.entity_type,
        jurisdiction=entity.jurisdiction,
        description=entity.description,
        owner_id=user_id,
        status=existing.get("status", "active"),
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=now
    )


@router.delete("/{entity_id}")
async def delete_entity(entity_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete an entity."""
    db = get_db()
    
    result = await db.entities.delete_one({"id": entity_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")
    
    return {"message": "Entity deleted successfully"}


# Include router
app.include_router(router, prefix="/api/entities", tags=["entities"])

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
    uvicorn.run(app, host="0.0.0.0", port=8003)
