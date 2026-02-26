"""
Account routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import AccountInput, AccountResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[AccountResponse])
async def list_accounts(
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """List accounts with optional filters"""
    db = get_db()
    
    query = {"is_active": is_active}
    if entity_id:
        query["entity_id"] = entity_id
    
    accounts = await db.accounts.find(query).to_list(length=1000)
    
    return [{
        "id": a["_id"],
        "entity_id": a["entity_id"],
        "name": a["name"],
        "type": a["type"],
        "balance": a["balance"],
        "currency": a["currency"],
        "is_active": a.get("is_active", True),
        "created_at": a["created_at"],
        "updated_at": a["updated_at"]
    } for a in accounts]

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(input: AccountInput, current_user: dict = Depends(get_current_user)):
    """Create a new account"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    account_id = str(ObjectId())
    account_doc = {
        "_id": account_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "balance": input.balance,
        "currency": input.currency or "USD",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.accounts.insert_one(account_doc)
    
    return {
        "id": account_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "balance": input.balance,
        "currency": input.currency or "USD",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific account"""
    db = get_db()
    
    account = await db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "id": account["_id"],
        "entity_id": account["entity_id"],
        "name": account["name"],
        "type": account["type"],
        "balance": account["balance"],
        "currency": account["currency"],
        "is_active": account.get("is_active", True),
        "created_at": account["created_at"],
        "updated_at": account["updated_at"]
    }

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, input: AccountInput, current_user: dict = Depends(get_current_user)):
    """Update an account"""
    db = get_db()
    
    account = await db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.accounts.update_one(
        {"_id": account_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "balance": input.balance,
            "currency": input.currency or "USD",
            "updated_at": now
        }}
    )
    
    return {
        "id": account_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "balance": input.balance,
        "currency": input.currency or "USD",
        "is_active": account.get("is_active", True),
        "created_at": account["created_at"],
        "updated_at": now
    }

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) an account"""
    db = get_db()
    
    result = await db.accounts.update_one(
        {"_id": account_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return None
