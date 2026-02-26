"""
Recurring transaction routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import RecurringTransactionInput, RecurringTransactionResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[RecurringTransactionResponse])
async def list_recurring(
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """List recurring transactions with optional filters"""
    db = get_db()
    
    query = {"is_active": is_active}
    if entity_id:
        query["entity_id"] = entity_id
    
    recurring = await db.recurring_transactions.find(query).to_list(length=1000)
    
    return [{
        "id": r["_id"],
        "entity_id": r["entity_id"],
        "account_id": r.get("account_id"),
        "category_id": r.get("category_id"),
        "name": r["name"],
        "type": r["type"],
        "amount": r["amount"],
        "frequency": r["frequency"],
        "next_date": r["next_date"],
        "is_active": r.get("is_active", True),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"]
    } for r in recurring]

@router.post("", response_model=RecurringTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring(input: RecurringTransactionInput, current_user: dict = Depends(get_current_user)):
    """Create a new recurring transaction"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    recurring_id = str(ObjectId())
    recurring_doc = {
        "_id": recurring_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "category_id": input.category_id,
        "name": input.name,
        "type": input.type,
        "amount": input.amount,
        "frequency": input.frequency,
        "next_date": input.next_date,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.recurring_transactions.insert_one(recurring_doc)
    
    return {
        "id": recurring_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "category_id": input.category_id,
        "name": input.name,
        "type": input.type,
        "amount": input.amount,
        "frequency": input.frequency,
        "next_date": input.next_date,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{recurring_id}", response_model=RecurringTransactionResponse)
async def get_recurring(recurring_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific recurring transaction"""
    db = get_db()
    
    recurring = await db.recurring_transactions.find_one({"_id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    return {
        "id": recurring["_id"],
        "entity_id": recurring["entity_id"],
        "account_id": recurring.get("account_id"),
        "category_id": recurring.get("category_id"),
        "name": recurring["name"],
        "type": recurring["type"],
        "amount": recurring["amount"],
        "frequency": recurring["frequency"],
        "next_date": recurring["next_date"],
        "is_active": recurring.get("is_active", True),
        "created_at": recurring["created_at"],
        "updated_at": recurring["updated_at"]
    }

@router.put("/{recurring_id}", response_model=RecurringTransactionResponse)
async def update_recurring(recurring_id: str, input: RecurringTransactionInput, current_user: dict = Depends(get_current_user)):
    """Update a recurring transaction"""
    db = get_db()
    
    recurring = await db.recurring_transactions.find_one({"_id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.recurring_transactions.update_one(
        {"_id": recurring_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "amount": input.amount,
            "frequency": input.frequency,
            "next_date": input.next_date,
            "account_id": input.account_id,
            "category_id": input.category_id,
            "updated_at": now
        }}
    )
    
    return {
        "id": recurring_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "category_id": input.category_id,
        "name": input.name,
        "type": input.type,
        "amount": input.amount,
        "frequency": input.frequency,
        "next_date": input.next_date,
        "is_active": recurring.get("is_active", True),
        "created_at": recurring["created_at"],
        "updated_at": now
    }

@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring(recurring_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) a recurring transaction"""
    db = get_db()
    
    result = await db.recurring_transactions.update_one(
        {"_id": recurring_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    return None
