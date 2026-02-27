"""
Financial Profile routes - Investment settings and goals
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

from database import get_db
from models import FinancialProfileInput, FinancialProfileResponse
from auth import get_current_user

router = APIRouter()

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user is an admin"""
    db = get_db()
    user_id = current_user.get("user_id")
    user = await db.users.find_one({"_id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("", response_model=List[FinancialProfileResponse])
async def list_profiles(entity_id: str = None, current_user: dict = Depends(require_admin)):
    """List financial profiles"""
    db = get_db()
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    
    profiles = await db.financial_profiles.find(query).to_list(50)
    return [{**p, "id": p["_id"]} for p in profiles]

@router.get("/{entity_id}", response_model=FinancialProfileResponse)
async def get_profile(entity_id: str, current_user: dict = Depends(require_admin)):
    """Get financial profile for an entity"""
    db = get_db()
    profile = await db.financial_profiles.find_one({"entity_id": entity_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {**profile, "id": profile["_id"]}

@router.post("", response_model=FinancialProfileResponse)
async def create_profile(profile: FinancialProfileInput, current_user: dict = Depends(require_admin)):
    """Create or update financial profile"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if profile exists for this entity
    existing = await db.financial_profiles.find_one({"entity_id": profile.entity_id})
    
    if existing:
        # Update existing profile
        update_data = profile.model_dump()
        update_data["updated_at"] = now
        await db.financial_profiles.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        updated = await db.financial_profiles.find_one({"_id": existing["_id"]})
        return {**updated, "id": updated["_id"]}
    
    # Create new profile
    profile_data = {
        "_id": str(ObjectId()),
        **profile.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.financial_profiles.insert_one(profile_data)
    return {**profile_data, "id": profile_data["_id"]}

@router.put("/{profile_id}")
async def update_profile(profile_id: str, updates: dict, current_user: dict = Depends(require_admin)):
    """Update a financial profile"""
    db = get_db()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.financial_profiles.update_one({"_id": profile_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True}

@router.delete("/{profile_id}")
async def delete_profile(profile_id: str, current_user: dict = Depends(require_admin)):
    """Delete a financial profile"""
    db = get_db()
    result = await db.financial_profiles.delete_one({"_id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True}
