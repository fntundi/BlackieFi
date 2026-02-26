"""
Asset routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import AssetInput, AssetResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[AssetResponse])
async def list_assets(
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """List assets with optional filters"""
    db = get_db()
    
    query = {"is_active": is_active}
    if entity_id:
        query["entity_id"] = entity_id
    
    assets = await db.assets.find(query).to_list(length=1000)
    
    return [{
        "id": a["_id"],
        "entity_id": a["entity_id"],
        "name": a["name"],
        "type": a["type"],
        "description": a.get("description", ""),
        "purchase_date": a.get("purchase_date"),
        "purchase_price": a.get("purchase_price"),
        "current_value": a.get("current_value"),
        "depreciation_method": a.get("depreciation_method", "none"),
        "useful_life_years": a.get("useful_life_years"),
        "salvage_value": a.get("salvage_value"),
        "location": a.get("location", ""),
        "serial_number": a.get("serial_number", ""),
        "vendor": a.get("vendor", ""),
        "warranty_expiration": a.get("warranty_expiration"),
        "maintenance_schedule": a.get("maintenance_schedule", ""),
        "is_active": a.get("is_active", True),
        "created_at": a["created_at"],
        "updated_at": a["updated_at"]
    } for a in assets]

@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(input: AssetInput, current_user: dict = Depends(get_current_user)):
    """Create a new asset"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    asset_id = str(ObjectId())
    asset_doc = {
        "_id": asset_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "description": input.description or "",
        "purchase_date": input.purchase_date,
        "purchase_price": input.purchase_price,
        "current_value": input.current_value,
        "depreciation_method": input.depreciation_method,
        "useful_life_years": input.useful_life_years,
        "salvage_value": input.salvage_value,
        "location": input.location or "",
        "serial_number": input.serial_number or "",
        "vendor": input.vendor or "",
        "warranty_expiration": input.warranty_expiration,
        "maintenance_schedule": input.maintenance_schedule or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.assets.insert_one(asset_doc)
    
    return {
        "id": asset_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "description": input.description or "",
        "purchase_date": input.purchase_date,
        "purchase_price": input.purchase_price,
        "current_value": input.current_value,
        "depreciation_method": input.depreciation_method,
        "useful_life_years": input.useful_life_years,
        "salvage_value": input.salvage_value,
        "location": input.location or "",
        "serial_number": input.serial_number or "",
        "vendor": input.vendor or "",
        "warranty_expiration": input.warranty_expiration,
        "maintenance_schedule": input.maintenance_schedule or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific asset"""
    db = get_db()
    
    asset = await db.assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return {
        "id": asset["_id"],
        "entity_id": asset["entity_id"],
        "name": asset["name"],
        "type": asset["type"],
        "description": asset.get("description", ""),
        "purchase_date": asset.get("purchase_date"),
        "purchase_price": asset.get("purchase_price"),
        "current_value": asset.get("current_value"),
        "depreciation_method": asset.get("depreciation_method", "none"),
        "useful_life_years": asset.get("useful_life_years"),
        "salvage_value": asset.get("salvage_value"),
        "location": asset.get("location", ""),
        "serial_number": asset.get("serial_number", ""),
        "vendor": asset.get("vendor", ""),
        "warranty_expiration": asset.get("warranty_expiration"),
        "maintenance_schedule": asset.get("maintenance_schedule", ""),
        "is_active": asset.get("is_active", True),
        "created_at": asset["created_at"],
        "updated_at": asset["updated_at"]
    }

@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(asset_id: str, input: AssetInput, current_user: dict = Depends(get_current_user)):
    """Update an asset"""
    db = get_db()
    
    asset = await db.assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.assets.update_one(
        {"_id": asset_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "description": input.description or "",
            "purchase_date": input.purchase_date,
            "purchase_price": input.purchase_price,
            "current_value": input.current_value,
            "depreciation_method": input.depreciation_method,
            "useful_life_years": input.useful_life_years,
            "salvage_value": input.salvage_value,
            "location": input.location or "",
            "serial_number": input.serial_number or "",
            "vendor": input.vendor or "",
            "warranty_expiration": input.warranty_expiration,
            "maintenance_schedule": input.maintenance_schedule or "",
            "updated_at": now
        }}
    )
    
    return {
        "id": asset_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "description": input.description or "",
        "purchase_date": input.purchase_date,
        "purchase_price": input.purchase_price,
        "current_value": input.current_value,
        "depreciation_method": input.depreciation_method,
        "useful_life_years": input.useful_life_years,
        "salvage_value": input.salvage_value,
        "location": input.location or "",
        "serial_number": input.serial_number or "",
        "vendor": input.vendor or "",
        "warranty_expiration": input.warranty_expiration,
        "maintenance_schedule": input.maintenance_schedule or "",
        "is_active": asset.get("is_active", True),
        "created_at": asset["created_at"],
        "updated_at": now
    }

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) an asset"""
    db = get_db()
    
    result = await db.assets.update_one(
        {"_id": asset_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return None
