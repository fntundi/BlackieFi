"""
BlackieFi 3.0 - Portfolio Service
Manages accounts and holdings.
"""
import sys
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from shared.config import settings
from shared.database import get_db, MongoDB
from shared.auth_utils import decode_token, is_token_blacklisted
from shared.models import HealthCheck, AccountCreate, AccountResponse

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BlackieFi Portfolio Service",
    version="3.0.0",
    description="Portfolio management service for accounts and holdings"
)

router = APIRouter()
security = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    if await is_token_blacklisted(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalidated")
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user_id


@router.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(service="portfolio", status="healthy")


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(account: AccountCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new account."""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    account_doc = {
        "id": str(uuid.uuid4()),
        "name": account.name,
        "account_type": account.account_type,
        "institution": account.institution,
        "balance": account.balance,
        "currency": account.currency,
        "owner_id": user_id,
        "entity_id": account.entity_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.accounts.insert_one(account_doc)
    
    return AccountResponse(
        id=account_doc["id"],
        name=account_doc["name"],
        account_type=account_doc["account_type"],
        institution=account_doc["institution"],
        balance=account_doc["balance"],
        currency=account_doc["currency"],
        owner_id=account_doc["owner_id"],
        entity_id=account_doc["entity_id"],
        created_at=now,
        updated_at=now
    )


@router.get("/", response_model=List[AccountResponse])
async def list_accounts(entity_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    """List all accounts for the current user."""
    db = get_db()
    
    query = {"owner_id": user_id}
    if entity_id:
        query["entity_id"] = entity_id
    
    accounts = await db.accounts.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for a in accounts:
        created_at = a.get("created_at")
        updated_at = a.get("updated_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        result.append(AccountResponse(
            id=a["id"],
            name=a["name"],
            account_type=a["account_type"],
            institution=a.get("institution"),
            balance=a.get("balance", 0.0),
            currency=a.get("currency", "USD"),
            owner_id=a["owner_id"],
            entity_id=a.get("entity_id"),
            created_at=created_at or datetime.now(timezone.utc),
            updated_at=updated_at or datetime.now(timezone.utc)
        ))
    
    return result


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific account."""
    db = get_db()
    account = await db.accounts.find_one({"id": account_id, "owner_id": user_id}, {"_id": 0})
    
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    created_at = account.get("created_at")
    updated_at = account.get("updated_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
    
    return AccountResponse(
        id=account["id"],
        name=account["name"],
        account_type=account["account_type"],
        institution=account.get("institution"),
        balance=account.get("balance", 0.0),
        currency=account.get("currency", "USD"),
        owner_id=account["owner_id"],
        entity_id=account.get("entity_id"),
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=updated_at or datetime.now(timezone.utc)
    )


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, account: AccountCreate, user_id: str = Depends(get_current_user_id)):
    """Update an account."""
    db = get_db()
    
    existing = await db.accounts.find_one({"id": account_id, "owner_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "name": account.name,
        "account_type": account.account_type,
        "institution": account.institution,
        "balance": account.balance,
        "currency": account.currency,
        "entity_id": account.entity_id,
        "updated_at": now.isoformat()
    }
    
    await db.accounts.update_one({"id": account_id}, {"$set": update_data})
    
    created_at = existing.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    return AccountResponse(
        id=account_id,
        name=account.name,
        account_type=account.account_type,
        institution=account.institution,
        balance=account.balance,
        currency=account.currency,
        owner_id=user_id,
        entity_id=account.entity_id,
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=now
    )


@router.delete("/{account_id}")
async def delete_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete an account."""
    db = get_db()
    
    result = await db.accounts.delete_one({"id": account_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    return {"message": "Account deleted successfully"}


@router.get("/summary/total")
async def get_portfolio_summary(user_id: str = Depends(get_current_user_id)):
    """Get portfolio summary with total balances."""
    db = get_db()
    accounts = await db.accounts.find({"owner_id": user_id}, {"_id": 0}).to_list(100)
    
    total_balance = sum(a.get("balance", 0) for a in accounts)
    by_currency = {}
    by_type = {}
    
    for a in accounts:
        currency = a.get("currency", "USD")
        acc_type = a.get("account_type", "other")
        balance = a.get("balance", 0)
        
        by_currency[currency] = by_currency.get(currency, 0) + balance
        by_type[acc_type] = by_type.get(acc_type, 0) + balance
    
    return {
        "total_accounts": len(accounts),
        "total_balance": total_balance,
        "by_currency": by_currency,
        "by_type": by_type
    }


# Include router
app.include_router(router, prefix="/api/accounts", tags=["accounts"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    await MongoDB.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
