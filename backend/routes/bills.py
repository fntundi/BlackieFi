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

router = APIRouter()

@router.get("", response_model=List[BillResponse])
async def list_bills(entity_id: str = None, current_user: dict = Depends(get_current_user)):
    """List all bills, optionally filtered by entity"""
    db = get_db()
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    
    bills = await db.bills.find(query).sort("due_date", 1).to_list(100)
    return [{**b, "id": b["_id"]} for b in bills]

@router.post("", response_model=BillResponse)
async def create_bill(bill: BillInput, current_user: dict = Depends(get_current_user)):
    """Create a new bill"""
    db = get_db()
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
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.bills.update_one({"_id": bill_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return {"success": True, "message": "Bill updated"}

@router.delete("/{bill_id}")
async def delete_bill(bill_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a bill"""
    db = get_db()
    result = await db.bills.delete_one({"_id": bill_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return {"success": True, "message": "Bill deleted"}

@router.post("/{bill_id}/mark-paid")
async def mark_bill_paid(bill_id: str, amount: float = None, current_user: dict = Depends(get_current_user)):
    """Mark a bill as paid"""
    db = get_db()
    
    bill = await db.bills.find_one({"_id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
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
