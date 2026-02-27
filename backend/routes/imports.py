"""
Import routes - Bank statement import functionality
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List
from datetime import datetime, timezone
from bson import ObjectId
import csv
import io

from database import get_db
from models import ImportBatchResponse
from auth import get_current_user

router = APIRouter()

@router.get("/batches", response_model=List[ImportBatchResponse])
async def list_import_batches(entity_id: str = None, current_user: dict = Depends(get_current_user)):
    """List import batches"""
    db = get_db()
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    
    batches = await db.import_batches.find(query).sort("created_date", -1).limit(20).to_list(20)
    return [{**b, "id": b["_id"]} for b in batches]

@router.post("/csv")
async def import_csv(
    entity_id: str = Form(...),
    account_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import transactions from CSV file"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Create import batch record
    batch_id = str(ObjectId())
    batch = {
        "_id": batch_id,
        "entity_id": entity_id,
        "account_id": account_id,
        "file_name": file.filename,
        "file_url": "",
        "file_type": "csv",
        "status": "processing",
        "transactions_imported": 0,
        "error_message": None,
        "created_date": now,
        "updated_at": now
    }
    await db.import_batches.insert_one(batch)
    
    try:
        # Read CSV content
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        transactions_created = 0
        
        # Get categories for auto-categorization
        categories = await db.categories.find().to_list(100)
        
        for row in reader:
            # Parse the row - handle common CSV formats
            date = row.get('date') or row.get('Date') or row.get('DATE') or row.get('Transaction Date') or ''
            description = row.get('description') or row.get('Description') or row.get('DESCRIPTION') or row.get('Memo') or ''
            amount_str = row.get('amount') or row.get('Amount') or row.get('AMOUNT') or '0'
            
            # Handle credit/debit columns
            credit = row.get('credit') or row.get('Credit') or row.get('Deposit') or ''
            debit = row.get('debit') or row.get('Debit') or row.get('Withdrawal') or ''
            
            # Parse amount
            try:
                if credit and debit:
                    credit_val = float(credit.replace(',', '').replace('$', '')) if credit else 0
                    debit_val = float(debit.replace(',', '').replace('$', '')) if debit else 0
                    amount = credit_val - debit_val
                else:
                    amount = float(amount_str.replace(',', '').replace('$', ''))
            except:
                continue
            
            # Determine type
            tx_type = 'income' if amount > 0 else 'expense'
            
            # Auto-categorize based on description
            category_id = None
            desc_lower = description.lower()
            for cat in categories:
                rules = cat.get('auto_categorization_rules', [])
                for rule in rules:
                    if rule.lower() in desc_lower:
                        category_id = str(cat['_id'])
                        break
                if category_id:
                    break
            
            # Create transaction
            transaction = {
                "_id": str(ObjectId()),
                "entity_id": entity_id,
                "account_id": account_id,
                "category_id": category_id,
                "type": tx_type,
                "amount": abs(amount),
                "date": date,
                "description": description,
                "import_source": "csv",
                "import_batch_id": batch_id,
                "ai_tags": [],
                "created_at": now,
                "updated_at": now
            }
            
            await db.transactions.insert_one(transaction)
            transactions_created += 1
        
        # Update batch status
        await db.import_batches.update_one(
            {"_id": batch_id},
            {
                "$set": {
                    "status": "completed",
                    "transactions_imported": transactions_created,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "batch_id": batch_id,
            "transactions_imported": transactions_created
        }
        
    except Exception as e:
        # Update batch with error
        await db.import_batches.update_one(
            {"_id": batch_id},
            {
                "$set": {
                    "status": "failed",
                    "error_message": str(e),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@router.delete("/batches/{batch_id}")
async def delete_import_batch(batch_id: str, delete_transactions: bool = False, current_user: dict = Depends(get_current_user)):
    """Delete an import batch and optionally its transactions"""
    db = get_db()
    
    if delete_transactions:
        await db.transactions.delete_many({"import_batch_id": batch_id})
    
    result = await db.import_batches.delete_one({"_id": batch_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return {"success": True, "message": "Batch deleted"}
