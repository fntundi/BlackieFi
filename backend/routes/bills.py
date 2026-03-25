"""
Bills routes - Bill tracking and reminders
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

from database import get_db
from models import BillInput, BillResponse
from auth import get_current_user
from services.rbac_service import ensure_entity_access, get_accessible_entity_ids

router = APIRouter()

@router.get("", response_model=List[BillResponse])
async def list_bills(entity_id: str = None, current_user: dict = Depends(get_current_user)):
    """List all bills, optionally filtered by entity"""
    db = get_db()
    query = {}
    if entity_id:
        await ensure_entity_access(db, current_user.get("user_id"), entity_id, "bills")
        query["entity_id"] = entity_id
    else:
        entity_ids = await get_accessible_entity_ids(db, current_user.get("user_id"), feature="bills")
        if not entity_ids:
            return []
        query["entity_id"] = {"$in": entity_ids}
    
    bills = await db.bills.find(query).sort("due_date", 1).to_list(100)
    return [{**b, "id": b["_id"]} for b in bills]

@router.post("", response_model=BillResponse)
async def create_bill(bill: BillInput, current_user: dict = Depends(get_current_user)):
    """Create a new bill"""
    db = get_db()
    await ensure_entity_access(db, current_user.get("user_id"), bill.entity_id, "bills")
    now = datetime.now(timezone.utc).isoformat()
    
    bill_data = {
        "_id": str(ObjectId()),
        **bill.model_dump(),
        "status": "pending",
        "payment_history": [],
        "last_paid_date": None,
        "last_paid_amount": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.bills.insert_one(bill_data)
    return {**bill_data, "id": bill_data["_id"]}

@router.put("/{bill_id}")
async def update_bill(bill_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update a bill"""
    db = get_db()
    bill = await db.bills.find_one({"_id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    await ensure_entity_access(db, current_user.get("user_id"), bill["entity_id"], "bills")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.bills.update_one({"_id": bill_id}, {"$set": updates})
    
    return {"success": True, "message": "Bill updated"}

@router.delete("/{bill_id}")
async def delete_bill(bill_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a bill"""
    db = get_db()
    bill = await db.bills.find_one({"_id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    await ensure_entity_access(db, current_user.get("user_id"), bill["entity_id"], "bills")

    await db.bills.delete_one({"_id": bill_id})
    
    return {"success": True, "message": "Bill deleted"}

@router.post("/{bill_id}/mark-paid")
async def mark_bill_paid(bill_id: str, amount: float = None, current_user: dict = Depends(get_current_user)):
    """Mark a bill as paid"""
    db = get_db()
    
    bill = await db.bills.find_one({"_id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    await ensure_entity_access(db, current_user.get("user_id"), bill["entity_id"], "bills")

    today = datetime.now(timezone.utc).date().isoformat()
    payment_amount = amount or bill.get("typical_amount", 0)
    
    # Calculate next due date based on frequency
    from dateutil.relativedelta import relativedelta
    current_due = datetime.fromisoformat(bill["due_date"])
    
    if bill["frequency"] == "monthly":
        next_due = current_due + relativedelta(months=1)
    elif bill["frequency"] == "quarterly":
        next_due = current_due + relativedelta(months=3)
    elif bill["frequency"] == "yearly":
        next_due = current_due + relativedelta(years=1)
    else:
        next_due = current_due + relativedelta(months=1)
    
    payment = {
        "date": today,
        "amount": payment_amount,
        "transaction_id": None
    }
    
    await db.bills.update_one(
        {"_id": bill_id},
        {
            "$set": {
                "status": "pending",
                "due_date": next_due.date().isoformat(),
                "last_paid_date": today,
                "last_paid_amount": payment_amount,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"payment_history": payment}
        }
    )
    
    return {"success": True, "next_due_date": next_due.date().isoformat()}
