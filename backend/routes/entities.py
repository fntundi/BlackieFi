"""
Entity routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
from bson import ObjectId
from typing import List

from database import get_db
from models import EntityInput, EntityResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[EntityResponse])
async def list_entities(current_user: dict = Depends(get_current_user)):
    """List all entities for the current user"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    entities = await db.entities.find({"owner_id": user_id}).to_list(length=100)
    
    return [{
        "id": e["_id"],
        "owner_id": e["owner_id"],
        "name": e["name"],
        "type": e["type"],
        "created_at": e["created_at"],
        "updated_at": e["updated_at"]
    } for e in entities]

@router.post("", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(input: EntityInput, current_user: dict = Depends(get_current_user)):
    """Create a new entity"""
    db = get_db()
    user_id = current_user.get("user_id")
    now = datetime.now(timezone.utc).isoformat()
    
    entity_id = str(ObjectId())
    entity_doc = {
        "_id": entity_id,
        "owner_id": user_id,
        "name": input.name,
        "type": input.type,
        "created_at": now,
        "updated_at": now
    }
    
    await db.entities.insert_one(entity_doc)
    
    return {
        "id": entity_id,
        "owner_id": user_id,
        "name": input.name,
        "type": input.type,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific entity"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    entity = await db.entities.find_one({"_id": entity_id, "owner_id": user_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    return {
        "id": entity["_id"],
        "owner_id": entity["owner_id"],
        "name": entity["name"],
        "type": entity["type"],
        "created_at": entity["created_at"],
        "updated_at": entity["updated_at"]
    }

@router.put("/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, input: EntityInput, current_user: dict = Depends(get_current_user)):
    """Update an entity"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    entity = await db.entities.find_one({"_id": entity_id, "owner_id": user_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.entities.update_one(
        {"_id": entity_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "updated_at": now
        }}
    )
    
    return {
        "id": entity_id,
        "owner_id": user_id,
        "name": input.name,
        "type": input.type,
        "created_at": entity["created_at"],
        "updated_at": now
    }

@router.delete("/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entity(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an entity"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    result = await db.entities.delete_one({"_id": entity_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    return None
