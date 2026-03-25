"""
Category routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import CategoryInput, CategoryResponse
from auth import get_current_user
from services.rbac_service import ensure_entity_access, get_accessible_entity_ids

router = APIRouter()

@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    entity_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List categories with optional filters"""
    db = get_db()
    
    user_id = current_user.get("user_id")

    # Get both default categories (entity_id is None) and entity-specific ones
    query = {"$or": [{"entity_id": None}]}
    if entity_id:
        await ensure_entity_access(db, user_id, entity_id, "categories")
        query["$or"].append({"entity_id": entity_id})
    else:
        entity_ids = await get_accessible_entity_ids(db, user_id, feature="categories")
        if entity_ids:
            query["$or"].append({"entity_id": {"$in": entity_ids}})
    
    if type:
        query["type"] = {"$in": [type, "both"]}
    
    categories = await db.categories.find(query).to_list(length=1000)
    
    return [{
        "id": c["_id"],
        "entity_id": c.get("entity_id"),
        "parent_category": c.get("parent_category"),
        "name": c["name"],
        "type": c["type"],
        "auto_categorization_rules": c.get("auto_categorization_rules", []),
        "is_default": c.get("is_default", False),
        "created_at": c["created_at"],
        "updated_at": c["updated_at"]
    } for c in categories]

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(input: CategoryInput, current_user: dict = Depends(get_current_user)):
    """Create a new category"""
    db = get_db()
    if input.entity_id:
        await ensure_entity_access(db, current_user.get("user_id"), input.entity_id, "categories")
    now = datetime.now(timezone.utc).isoformat()
    
    category_id = str(ObjectId())
    category_doc = {
        "_id": category_id,
        "entity_id": input.entity_id,
        "parent_category": input.parent_category,
        "name": input.name,
        "type": input.type,
        "auto_categorization_rules": input.auto_categorization_rules,
        "is_default": input.is_default,
        "created_at": now,
        "updated_at": now
    }
    
    await db.categories.insert_one(category_doc)
    
    return {
        "id": category_id,
        "entity_id": input.entity_id,
        "parent_category": input.parent_category,
        "name": input.name,
        "type": input.type,
        "auto_categorization_rules": input.auto_categorization_rules,
        "is_default": input.is_default,
        "created_at": now,
        "updated_at": now
    }

@router.post("/bulk", response_model=List[CategoryResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_categories(categories: List[CategoryInput], current_user: dict = Depends(get_current_user)):
    """Create multiple categories at once"""
    db = get_db()
    user_id = current_user.get("user_id")
    now = datetime.now(timezone.utc).isoformat()
    
    result = []
    checked_entities = set()
    for input in categories:
        if input.entity_id and input.entity_id not in checked_entities:
            await ensure_entity_access(db, user_id, input.entity_id, "categories")
            checked_entities.add(input.entity_id)
        category_id = str(ObjectId())
        category_doc = {
            "_id": category_id,
            "entity_id": input.entity_id,
            "parent_category": input.parent_category,
            "name": input.name,
            "type": input.type,
            "auto_categorization_rules": input.auto_categorization_rules,
            "is_default": input.is_default,
            "created_at": now,
            "updated_at": now
        }
        
        await db.categories.insert_one(category_doc)
        result.append({
            "id": category_id,
            "entity_id": input.entity_id,
            "parent_category": input.parent_category,
            "name": input.name,
            "type": input.type,
            "auto_categorization_rules": input.auto_categorization_rules,
            "is_default": input.is_default,
            "created_at": now,
            "updated_at": now
        })
    
    return result

@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific category"""
    db = get_db()
    
    category = await db.categories.find_one({"_id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.get("entity_id"):
        await ensure_entity_access(db, current_user.get("user_id"), category["entity_id"], "categories")

    return {
        "id": category["_id"],
        "entity_id": category.get("entity_id"),
        "parent_category": category.get("parent_category"),
        "name": category["name"],
        "type": category["type"],
        "auto_categorization_rules": category.get("auto_categorization_rules", []),
        "is_default": category.get("is_default", False),
        "created_at": category["created_at"],
        "updated_at": category["updated_at"]
    }

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, input: CategoryInput, current_user: dict = Depends(get_current_user)):
    """Update a category"""
    db = get_db()
    
    category = await db.categories.find_one({"_id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.get("entity_id"):
        await ensure_entity_access(db, current_user.get("user_id"), category["entity_id"], "categories")

    now = datetime.now(timezone.utc).isoformat()
    await db.categories.update_one(
        {"_id": category_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "parent_category": input.parent_category,
            "auto_categorization_rules": input.auto_categorization_rules,
            "is_default": input.is_default,
            "updated_at": now
        }}
    )
    
    return {
        "id": category_id,
        "entity_id": category.get("entity_id"),
        "parent_category": input.parent_category,
        "name": input.name,
        "type": input.type,
        "auto_categorization_rules": input.auto_categorization_rules,
        "is_default": input.is_default,
        "created_at": category["created_at"],
        "updated_at": now
    }

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a category"""
    db = get_db()
    
    category = await db.categories.find_one({"_id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.get("entity_id"):
        await ensure_entity_access(db, current_user.get("user_id"), category["entity_id"], "categories")

    await db.categories.delete_one({"_id": category_id})

    return None
