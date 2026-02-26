"""
Budget routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import BudgetInput, BudgetResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[BudgetResponse])
async def list_budgets(
    entity_id: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List budgets with optional filters"""
    db = get_db()
    
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if month:
        query["month"] = month
    
    budgets = await db.budgets.find(query).to_list(length=1000)
    
    return [{
        "id": b["_id"],
        "entity_id": b["entity_id"],
        "month": b["month"],
        "category_budgets": b.get("category_budgets", []),
        "total_planned": b.get("total_planned", 0),
        "created_at": b["created_at"],
        "updated_at": b["updated_at"]
    } for b in budgets]

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(input: BudgetInput, current_user: dict = Depends(get_current_user)):
    """Create a new budget"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if budget for this entity/month already exists
    existing = await db.budgets.find_one({"entity_id": input.entity_id, "month": input.month})
    if existing:
        raise HTTPException(status_code=409, detail="Budget for this month already exists")
    
    budget_id = str(ObjectId())
    category_budgets = [cb.model_dump() for cb in input.category_budgets]
    
    budget_doc = {
        "_id": budget_id,
        "entity_id": input.entity_id,
        "month": input.month,
        "category_budgets": category_budgets,
        "total_planned": input.total_planned,
        "created_at": now,
        "updated_at": now
    }
    
    await db.budgets.insert_one(budget_doc)
    
    return {
        "id": budget_id,
        "entity_id": input.entity_id,
        "month": input.month,
        "category_budgets": category_budgets,
        "total_planned": input.total_planned,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(budget_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific budget"""
    db = get_db()
    
    budget = await db.budgets.find_one({"_id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {
        "id": budget["_id"],
        "entity_id": budget["entity_id"],
        "month": budget["month"],
        "category_budgets": budget.get("category_budgets", []),
        "total_planned": budget.get("total_planned", 0),
        "created_at": budget["created_at"],
        "updated_at": budget["updated_at"]
    }

@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(budget_id: str, input: BudgetInput, current_user: dict = Depends(get_current_user)):
    """Update a budget"""
    db = get_db()
    
    budget = await db.budgets.find_one({"_id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    now = datetime.now(timezone.utc).isoformat()
    category_budgets = [cb.model_dump() for cb in input.category_budgets]
    
    await db.budgets.update_one(
        {"_id": budget_id},
        {"$set": {
            "month": input.month,
            "category_budgets": category_budgets,
            "total_planned": input.total_planned,
            "updated_at": now
        }}
    )
    
    return {
        "id": budget_id,
        "entity_id": input.entity_id,
        "month": input.month,
        "category_budgets": category_budgets,
        "total_planned": input.total_planned,
        "created_at": budget["created_at"],
        "updated_at": now
    }

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(budget_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a budget"""
    db = get_db()
    
    result = await db.budgets.delete_one({"_id": budget_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return None
