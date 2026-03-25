"""
Financial Goals routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import FinancialGoalInput, FinancialGoalResponse, GoalStatusUpdate
from auth import get_current_user
from services.rbac_service import ensure_entity_access, get_accessible_entity_ids

router = APIRouter()

@router.get("", response_model=List[FinancialGoalResponse])
async def list_goals(
    entity_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List financial goals with optional filters"""
    db = get_db()
    
    user_id = current_user.get("user_id")
    query = {}
    if entity_id:
        await ensure_entity_access(db, user_id, entity_id, "goals")
        query["entity_id"] = entity_id
    else:
        entity_ids = await get_accessible_entity_ids(db, user_id, feature="goals")
        if not entity_ids:
            return []
        query["entity_id"] = {"$in": entity_ids}
    if status:
        query["status"] = status
    
    goals = await db.goals.find(query).to_list(length=1000)
    
    return [{
        "id": g["_id"],
        "entity_id": g["entity_id"],
        "name": g["name"],
        "goal_type": g["goal_type"],
        "target_amount": g["target_amount"],
        "current_amount": g.get("current_amount", 0),
        "deadline": g.get("deadline"),
        "monthly_contribution": g.get("monthly_contribution", 0),
        "priority": g.get("priority", "medium"),
        "status": g.get("status", "active"),
        "notes": g.get("notes", ""),
        "ai_recommendations": g.get("ai_recommendations", []),
        "created_at": g["created_at"],
        "updated_at": g["updated_at"]
    } for g in goals]

@router.post("", response_model=FinancialGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(input: FinancialGoalInput, current_user: dict = Depends(get_current_user)):
    """Create a new financial goal"""
    db = get_db()
    await ensure_entity_access(db, current_user.get("user_id"), input.entity_id, "goals")
    now = datetime.now(timezone.utc).isoformat()
    
    goal_id = str(ObjectId())
    goal_doc = {
        "_id": goal_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "goal_type": input.goal_type,
        "target_amount": input.target_amount,
        "current_amount": input.current_amount,
        "deadline": input.deadline,
        "monthly_contribution": input.monthly_contribution,
        "priority": input.priority,
        "status": "active",
        "notes": input.notes or "",
        "ai_recommendations": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.goals.insert_one(goal_doc)
    
    return {
        "id": goal_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "goal_type": input.goal_type,
        "target_amount": input.target_amount,
        "current_amount": input.current_amount,
        "deadline": input.deadline,
        "monthly_contribution": input.monthly_contribution,
        "priority": input.priority,
        "status": "active",
        "notes": input.notes or "",
        "ai_recommendations": [],
        "created_at": now,
        "updated_at": now
    }

@router.get("/{goal_id}", response_model=FinancialGoalResponse)
async def get_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific financial goal"""
    db = get_db()
    
    goal = await db.goals.find_one({"_id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Financial goal not found")

    await ensure_entity_access(db, current_user.get("user_id"), goal["entity_id"], "goals")

    return {
        "id": goal["_id"],
        "entity_id": goal["entity_id"],
        "name": goal["name"],
        "goal_type": goal["goal_type"],
        "target_amount": goal["target_amount"],
        "current_amount": goal.get("current_amount", 0),
        "deadline": goal.get("deadline"),
        "monthly_contribution": goal.get("monthly_contribution", 0),
        "priority": goal.get("priority", "medium"),
        "status": goal.get("status", "active"),
        "notes": goal.get("notes", ""),
        "ai_recommendations": goal.get("ai_recommendations", []),
        "created_at": goal["created_at"],
        "updated_at": goal["updated_at"]
    }

@router.put("/{goal_id}", response_model=FinancialGoalResponse)
async def update_goal(goal_id: str, input: FinancialGoalInput, current_user: dict = Depends(get_current_user)):
    """Update a financial goal"""
    db = get_db()
    
    goal = await db.goals.find_one({"_id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Financial goal not found")

    await ensure_entity_access(db, current_user.get("user_id"), goal["entity_id"], "goals")
    if input.entity_id != goal["entity_id"]:
        raise HTTPException(status_code=400, detail="Entity cannot be changed for goals")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.goals.update_one(
        {"_id": goal_id},
        {"$set": {
            "name": input.name,
            "goal_type": input.goal_type,
            "target_amount": input.target_amount,
            "current_amount": input.current_amount,
            "deadline": input.deadline,
            "monthly_contribution": input.monthly_contribution,
            "priority": input.priority,
            "notes": input.notes or "",
            "updated_at": now
        }}
    )
    
    return {
        "id": goal_id,
        "entity_id": goal["entity_id"],
        "name": input.name,
        "goal_type": input.goal_type,
        "target_amount": input.target_amount,
        "current_amount": input.current_amount,
        "deadline": input.deadline,
        "monthly_contribution": input.monthly_contribution,
        "priority": input.priority,
        "status": goal.get("status", "active"),
        "notes": input.notes or "",
        "ai_recommendations": goal.get("ai_recommendations", []),
        "created_at": goal["created_at"],
        "updated_at": now
    }

@router.patch("/{goal_id}/status", response_model=FinancialGoalResponse)
async def update_goal_status(goal_id: str, input: GoalStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update the status of a financial goal"""
    db = get_db()
    
    goal = await db.goals.find_one({"_id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Financial goal not found")

    await ensure_entity_access(db, current_user.get("user_id"), goal["entity_id"], "goals")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.goals.update_one(
        {"_id": goal_id},
        {"$set": {
            "status": input.status,
            "updated_at": now
        }}
    )
    
    return {
        "id": goal["_id"],
        "entity_id": goal["entity_id"],
        "name": goal["name"],
        "goal_type": goal["goal_type"],
        "target_amount": goal["target_amount"],
        "current_amount": goal.get("current_amount", 0),
        "deadline": goal.get("deadline"),
        "monthly_contribution": goal.get("monthly_contribution", 0),
        "priority": goal.get("priority", "medium"),
        "status": input.status,
        "notes": goal.get("notes", ""),
        "ai_recommendations": goal.get("ai_recommendations", []),
        "created_at": goal["created_at"],
        "updated_at": now
    }

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a financial goal"""
    db = get_db()
    
    result = await db.goals.delete_one({"_id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Financial goal not found")
    
    return None
