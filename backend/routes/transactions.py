"""
Transaction routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import TransactionInput, TransactionResponse
from auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    entity_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    limit: int = Query(100, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """List transactions with optional filters"""
    db = get_db()
    
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if category_id:
        query["category_id"] = category_id
    if type:
        query["type"] = type
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if min_amount is not None:
        query["amount"] = {"$gte": min_amount}
    if max_amount is not None:
        if "amount" in query:
            query["amount"]["$lte"] = max_amount
        else:
            query["amount"] = {"$lte": max_amount}
    
    transactions = await db.transactions.find(query).sort("date", -1).limit(limit).to_list(length=limit)
    
    return [{
        "id": t["_id"],
        "entity_id": t["entity_id"],
        "account_id": t.get("account_id"),
        "category_id": t.get("category_id"),
        "type": t["type"],
        "amount": t["amount"],
        "date": t["date"],
        "description": t.get("description", ""),
        "linked_asset_id": t.get("linked_asset_id"),
        "linked_inventory_id": t.get("linked_inventory_id"),
        "ai_tags": t.get("ai_tags", []),
        "created_at": t["created_at"],
        "updated_at": t["updated_at"]
    } for t in transactions]

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(input: TransactionInput, current_user: dict = Depends(get_current_user)):
    """Create a new transaction"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    transaction_id = str(ObjectId())
    transaction_doc = {
        "_id": transaction_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "category_id": input.category_id,
        "type": input.type,
        "amount": input.amount,
        "date": input.date,
        "description": input.description or "",
        "linked_asset_id": input.linked_asset_id,
        "linked_inventory_id": input.linked_inventory_id,
        "ai_tags": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.transactions.insert_one(transaction_doc)
    
    # Update account balance if account is specified
    if input.account_id:
        balance_change = input.amount if input.type == "income" else -input.amount
        await db.accounts.update_one(
            {"_id": input.account_id},
            {"$inc": {"balance": balance_change}}
        )
    
    return {
        "id": transaction_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "category_id": input.category_id,
        "type": input.type,
        "amount": input.amount,
        "date": input.date,
        "description": input.description or "",
        "linked_asset_id": input.linked_asset_id,
        "linked_inventory_id": input.linked_inventory_id,
        "ai_tags": [],
        "created_at": now,
        "updated_at": now
    }

@router.post("/bulk", response_model=List[TransactionResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_transactions(transactions: List[TransactionInput], current_user: dict = Depends(get_current_user)):
    """Create multiple transactions at once"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    result = []
    for input in transactions:
        transaction_id = str(ObjectId())
        transaction_doc = {
            "_id": transaction_id,
            "entity_id": input.entity_id,
            "account_id": input.account_id,
            "category_id": input.category_id,
            "type": input.type,
            "amount": input.amount,
            "date": input.date,
            "description": input.description or "",
            "linked_asset_id": input.linked_asset_id,
            "linked_inventory_id": input.linked_inventory_id,
            "ai_tags": [],
            "created_at": now,
            "updated_at": now
        }
        
        await db.transactions.insert_one(transaction_doc)
        
        # Update account balance if account is specified
        if input.account_id:
            balance_change = input.amount if input.type == "income" else -input.amount
            await db.accounts.update_one(
                {"_id": input.account_id},
                {"$inc": {"balance": balance_change}}
            )
        
        result.append({
            "id": transaction_id,
            "entity_id": input.entity_id,
            "account_id": input.account_id,
            "category_id": input.category_id,
            "type": input.type,
            "amount": input.amount,
            "date": input.date,
            "description": input.description or "",
            "linked_asset_id": input.linked_asset_id,
            "linked_inventory_id": input.linked_inventory_id,
            "ai_tags": [],
            "created_at": now,
            "updated_at": now
        })
    
    return result

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific transaction"""
    db = get_db()
    
    transaction = await db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "id": transaction["_id"],
        "entity_id": transaction["entity_id"],
        "account_id": transaction.get("account_id"),
        "category_id": transaction.get("category_id"),
        "type": transaction["type"],
        "amount": transaction["amount"],
        "date": transaction["date"],
        "description": transaction.get("description", ""),
        "linked_asset_id": transaction.get("linked_asset_id"),
        "linked_inventory_id": transaction.get("linked_inventory_id"),
        "ai_tags": transaction.get("ai_tags", []),
        "created_at": transaction["created_at"],
        "updated_at": transaction["updated_at"]
    }

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(transaction_id: str, input: TransactionInput, current_user: dict = Depends(get_current_user)):
    """Update a transaction"""
    db = get_db()
    
    transaction = await db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse old account balance change
    if transaction.get("account_id"):
        old_balance_change = transaction["amount"] if transaction["type"] == "income" else -transaction["amount"]
        await db.accounts.update_one(
            {"_id": transaction["account_id"]},
            {"$inc": {"balance": -old_balance_change}}
        )
    
    now = datetime.now(timezone.utc).isoformat()
    await db.transactions.update_one(
        {"_id": transaction_id},
        {"$set": {
            "entity_id": input.entity_id,
            "account_id": input.account_id,
            "category_id": input.category_id,
            "type": input.type,
            "amount": input.amount,
            "date": input.date,
            "description": input.description or "",
            "linked_asset_id": input.linked_asset_id,
            "linked_inventory_id": input.linked_inventory_id,
            "updated_at": now
        }}
    )
    
    # Apply new account balance change
    if input.account_id:
        new_balance_change = input.amount if input.type == "income" else -input.amount
        await db.accounts.update_one(
            {"_id": input.account_id},
            {"$inc": {"balance": new_balance_change}}
        )
    
    return {
        "id": transaction_id,
        "entity_id": input.entity_id,
        "account_id": input.account_id,
        "category_id": input.category_id,
        "type": input.type,
        "amount": input.amount,
        "date": input.date,
        "description": input.description or "",
        "linked_asset_id": input.linked_asset_id,
        "linked_inventory_id": input.linked_inventory_id,
        "ai_tags": transaction.get("ai_tags", []),
        "created_at": transaction["created_at"],
        "updated_at": now
    }

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a transaction"""
    db = get_db()
    
    transaction = await db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse account balance change
    if transaction.get("account_id"):
        balance_change = transaction["amount"] if transaction["type"] == "income" else -transaction["amount"]
        await db.accounts.update_one(
            {"_id": transaction["account_id"]},
            {"$inc": {"balance": -balance_change}}
        )
    
    await db.transactions.delete_one({"_id": transaction_id})
    
    return None
