"""
Groups routes - Group-based access control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

from database import get_db
from models import (
    GroupInput, GroupResponse,
    GroupMemberInput, GroupMemberResponse,
    GroupEntityAccessInput, GroupEntityAccessResponse
)
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

# Groups
@router.get("", response_model=List[GroupResponse])
async def list_groups(current_user: dict = Depends(require_admin)):
    """List all groups"""
    db = get_db()
    groups = await db.groups.find({"is_active": True}).to_list(100)
    return [{**g, "id": g["_id"]} for g in groups]

@router.post("", response_model=GroupResponse)
async def create_group(group: GroupInput, current_user: dict = Depends(require_admin)):
    """Create a new group"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    group_data = {
        "_id": str(ObjectId()),
        **group.model_dump(),
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.groups.insert_one(group_data)
    return {**group_data, "id": group_data["_id"]}

@router.put("/{group_id}")
async def update_group(group_id: str, updates: dict, current_user: dict = Depends(require_admin)):
    """Update a group"""
    db = get_db()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.groups.update_one({"_id": group_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"success": True}

@router.delete("/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(require_admin)):
    """Delete a group (soft delete)"""
    db = get_db()
    result = await db.groups.update_one(
        {"_id": group_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"success": True}

# Group Members
@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
async def list_group_members(group_id: str, current_user: dict = Depends(require_admin)):
    """List members of a group"""
    db = get_db()
    members = await db.group_members.find({"group_id": group_id}).to_list(100)
    return [{**m, "id": m["_id"]} for m in members]

@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def add_group_member(group_id: str, member: GroupMemberInput, current_user: dict = Depends(require_admin)):
    """Add a member to a group"""
    db = get_db()
    
    # Check if member already exists
    existing = await db.group_members.find_one({
        "group_id": group_id,
        "user_email": member.user_email
    })
    if existing:
        raise HTTPException(status_code=400, detail="Member already in group")
    
    member_data = {
        "_id": str(ObjectId()),
        "group_id": group_id,
        "user_email": member.user_email,
        "role": member.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.group_members.insert_one(member_data)
    return {**member_data, "id": member_data["_id"]}

@router.delete("/{group_id}/members/{member_id}")
async def remove_group_member(group_id: str, member_id: str, current_user: dict = Depends(require_admin)):
    """Remove a member from a group"""
    db = get_db()
    result = await db.group_members.delete_one({"_id": member_id, "group_id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}

# Group Entity Access
@router.get("/{group_id}/access", response_model=List[GroupEntityAccessResponse])
async def list_group_access(group_id: str, current_user: dict = Depends(require_admin)):
    """List entity access for a group"""
    db = get_db()
    access_list = await db.group_entity_access.find({"group_id": group_id}).to_list(100)
    return [{**a, "id": a["_id"]} for a in access_list]

@router.post("/{group_id}/access", response_model=GroupEntityAccessResponse)
async def grant_entity_access(group_id: str, access: GroupEntityAccessInput, current_user: dict = Depends(require_admin)):
    """Grant a group access to an entity"""
    db = get_db()
    
    # Check if access already exists
    existing = await db.group_entity_access.find_one({
        "group_id": group_id,
        "entity_id": access.entity_id
    })
    if existing:
        # Update access level
        await db.group_entity_access.update_one(
            {"_id": existing["_id"]},
            {"$set": {"access_level": access.access_level}}
        )
        return {**existing, "access_level": access.access_level, "id": existing["_id"]}
    
    access_data = {
        "_id": str(ObjectId()),
        "group_id": group_id,
        "entity_id": access.entity_id,
        "access_level": access.access_level,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.group_entity_access.insert_one(access_data)
    return {**access_data, "id": access_data["_id"]}

@router.delete("/{group_id}/access/{access_id}")
async def revoke_entity_access(group_id: str, access_id: str, current_user: dict = Depends(require_admin)):
    """Revoke a group's access to an entity"""
    db = get_db()
    result = await db.group_entity_access.delete_one({"_id": access_id, "group_id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Access not found")
    return {"success": True}
