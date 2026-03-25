"""
Inventory routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import InventoryInput, InventoryResponse
from auth import get_current_user
from services.rbac_service import ensure_entity_access, get_accessible_entity_ids

router = APIRouter()

@router.get("", response_model=List[InventoryResponse])
async def list_inventory(
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """List inventory items with optional filters"""
    db = get_db()
    
    user_id = current_user.get("user_id")
    query = {"is_active": is_active}
    if entity_id:
        await ensure_entity_access(db, user_id, entity_id, "inventory")
        query["entity_id"] = entity_id
    else:
        entity_ids = await get_accessible_entity_ids(db, user_id, feature="inventory")
        if not entity_ids:
            return []
        query["entity_id"] = {"$in": entity_ids}
    
    items = await db.inventory.find(query).to_list(length=1000)
    
    return [{
        "id": i["_id"],
        "entity_id": i["entity_id"],
        "name": i["name"],
        "sku": i.get("sku", ""),
        "quantity": i.get("quantity", 0),
        "unit_cost": i.get("unit_cost"),
        "selling_price": i.get("selling_price"),
        "reorder_point": i.get("reorder_point", 0),
        "category": i.get("category", ""),
        "location": i.get("location", ""),
        "is_active": i.get("is_active", True),
        "created_at": i["created_at"],
        "updated_at": i["updated_at"]
    } for i in items]

@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory(input: InventoryInput, current_user: dict = Depends(get_current_user)):
    """Create a new inventory item"""
    db = get_db()
    await ensure_entity_access(db, current_user.get("user_id"), input.entity_id, "inventory")
    now = datetime.now(timezone.utc).isoformat()
    
    inventory_id = str(ObjectId())
    inventory_doc = {
        "_id": inventory_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "sku": input.sku or "",
        "quantity": input.quantity,
        "unit_cost": input.unit_cost,
        "selling_price": input.selling_price,
        "reorder_point": input.reorder_point,
        "category": input.category or "",
        "location": input.location or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.inventory.insert_one(inventory_doc)
    
    return {
        "id": inventory_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "sku": input.sku or "",
        "quantity": input.quantity,
        "unit_cost": input.unit_cost,
        "selling_price": input.selling_price,
        "reorder_point": input.reorder_point,
        "category": input.category or "",
        "location": input.location or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{inventory_id}", response_model=InventoryResponse)
async def get_inventory(inventory_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific inventory item"""
    db = get_db()
    
    item = await db.inventory.find_one({"_id": inventory_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    await ensure_entity_access(db, current_user.get("user_id"), item["entity_id"], "inventory")

    return {
        "id": item["_id"],
        "entity_id": item["entity_id"],
        "name": item["name"],
        "sku": item.get("sku", ""),
        "quantity": item.get("quantity", 0),
        "unit_cost": item.get("unit_cost"),
        "selling_price": item.get("selling_price"),
        "reorder_point": item.get("reorder_point", 0),
        "category": item.get("category", ""),
        "location": item.get("location", ""),
        "is_active": item.get("is_active", True),
        "created_at": item["created_at"],
        "updated_at": item["updated_at"]
    }

@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(inventory_id: str, input: InventoryInput, current_user: dict = Depends(get_current_user)):
    """Update an inventory item"""
    db = get_db()
    
    item = await db.inventory.find_one({"_id": inventory_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    await ensure_entity_access(db, current_user.get("user_id"), item["entity_id"], "inventory")
    if input.entity_id != item["entity_id"]:
        raise HTTPException(status_code=400, detail="Entity cannot be changed for inventory items")

    now = datetime.now(timezone.utc).isoformat()
    await db.inventory.update_one(
        {"_id": inventory_id},
        {"$set": {
            "name": input.name,
            "sku": input.sku or "",
            "quantity": input.quantity,
            "unit_cost": input.unit_cost,
            "selling_price": input.selling_price,
            "reorder_point": input.reorder_point,
            "category": input.category or "",
            "location": input.location or "",
            "updated_at": now
        }}
    )
    
    return {
        "id": inventory_id,
        "entity_id": item["entity_id"],
        "name": input.name,
        "sku": input.sku or "",
        "quantity": input.quantity,
        "unit_cost": input.unit_cost,
        "selling_price": input.selling_price,
        "reorder_point": input.reorder_point,
        "category": input.category or "",
        "location": input.location or "",
        "is_active": item.get("is_active", True),
        "created_at": item["created_at"],
        "updated_at": now
    }

@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory(inventory_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) an inventory item"""
    db = get_db()
    
    item = await db.inventory.find_one({"_id": inventory_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    await ensure_entity_access(db, current_user.get("user_id"), item["entity_id"], "inventory")

    await db.inventory.update_one(
        {"_id": inventory_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return None
