"""
Debt routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import DebtInput, DebtResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[DebtResponse])
async def list_debts(
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """List debts with optional filters"""
    db = get_db()
    
    query = {"is_active": is_active}
    if entity_id:
        query["entity_id"] = entity_id
    
    debts = await db.debts.find(query).to_list(length=1000)
    
    return [{
        "id": d["_id"],
        "entity_id": d["entity_id"],
        "account_id": d.get("account_id"),
        "name": d["name"],
        "type": d["type"],
        "original_amount": d["original_amount"],
        "current_balance": d["current_balance"],
        "interest_rate": d.get("interest_rate"),
        "minimum_payment": d.get("minimum_payment"),
        "payment_frequency": d.get("payment_frequency", "monthly"),
        "next_payment_date": d.get("next_payment_date"),
        "is_active": d.get("is_active", True),
        "created_at": d["created_at"],
        "updated_at": d["updated_at"]
    } for d in debts]

@router.post("", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(input: DebtInput, current_user: dict = Depends(get_current_user)):
    """Create a new debt"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    debt_id = str(ObjectId())
    debt_doc = {
        "_id": debt_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "name": input.name,
        "type": input.type,
        "original_amount": input.original_amount,
        "current_balance": input.current_balance,
        "interest_rate": input.interest_rate,
        "minimum_payment": input.minimum_payment,
        "payment_frequency": input.payment_frequency,
        "next_payment_date": input.next_payment_date,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.debts.insert_one(debt_doc)
    
    return {
        "id": debt_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "name": input.name,
        "type": input.type,
        "original_amount": input.original_amount,
        "current_balance": input.current_balance,
        "interest_rate": input.interest_rate,
        "minimum_payment": input.minimum_payment,
        "payment_frequency": input.payment_frequency,
        "next_payment_date": input.next_payment_date,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{debt_id}", response_model=DebtResponse)
async def get_debt(debt_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific debt"""
    db = get_db()
    
    debt = await db.debts.find_one({"_id": debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    
    return {
        "id": debt["_id"],
        "entity_id": debt["entity_id"],
        "account_id": debt.get("account_id"),
        "name": debt["name"],
        "type": debt["type"],
        "original_amount": debt["original_amount"],
        "current_balance": debt["current_balance"],
        "interest_rate": debt.get("interest_rate"),
        "minimum_payment": debt.get("minimum_payment"),
        "payment_frequency": debt.get("payment_frequency", "monthly"),
        "next_payment_date": debt.get("next_payment_date"),
        "is_active": debt.get("is_active", True),
        "created_at": debt["created_at"],
        "updated_at": debt["updated_at"]
    }

@router.put("/{debt_id}", response_model=DebtResponse)
async def update_debt(debt_id: str, input: DebtInput, current_user: dict = Depends(get_current_user)):
    """Update a debt"""
    db = get_db()
    
    debt = await db.debts.find_one({"_id": debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.debts.update_one(
        {"_id": debt_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "original_amount": input.original_amount,
            "current_balance": input.current_balance,
            "interest_rate": input.interest_rate,
            "minimum_payment": input.minimum_payment,
            "payment_frequency": input.payment_frequency,
            "next_payment_date": input.next_payment_date,
            "account_id": input.account_id,
            "updated_at": now
        }}
    )
    
    return {
        "id": debt_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "name": input.name,
        "type": input.type,
        "original_amount": input.original_amount,
        "current_balance": input.current_balance,
        "interest_rate": input.interest_rate,
        "minimum_payment": input.minimum_payment,
        "payment_frequency": input.payment_frequency,
        "next_payment_date": input.next_payment_date,
        "is_active": debt.get("is_active", True),
        "created_at": debt["created_at"],
        "updated_at": now
    }

@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(debt_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) a debt"""
    db = get_db()
    
    result = await db.debts.update_one(
        {"_id": debt_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Debt not found")
    
    return None
