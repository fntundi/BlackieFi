"""
BlackieFi Portfolio Service - Port 8004
Handles: accounts, income, expenses, debts, transactions, budgets, savings, investments
"""
import sys, os, math
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.database import get_mongo_db
from shared.config import settings
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import uuid, jwt, logging

app = FastAPI(title="BlackieFi Portfolio Service", version="3.0.0")
security = HTTPBearer()
logger = logging.getLogger(__name__)

# ---- Helpers ----
def now_str():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

def decode_token(token: str):
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return decode_token(credentials.credentials)["sub"]
    except Exception:
        raise HTTPException(401, "Invalid token")

async def _resolve_entity_access(eid, user_id, db):
    eu = await db.entity_users.find_one({"entity_id": eid, "user_id": user_id, "is_active": True}, {"_id": 0})
    if not eu:
        raise HTTPException(403, "No access to entity")
    role = await db.roles.find_one({"id": eu.get("role_id")}, {"_id": 0})
    return {"entity_id": eid, "user_id": user_id, "permissions": role.get("permissions", {}) if role else {}}

async def get_entity_access(entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    if entity_id:
        return await _resolve_entity_access(entity_id, user_id, db)
    eu = await db.entity_users.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
    if not eu:
        raise HTTPException(400, "No active entity")
    return await _resolve_entity_access(eu["entity_id"], user_id, db)

# ---- Models ----
class AccountCreate(BaseModel):
    name: str; account_type: str; balance: float = 0.0; currency: str = "USD"
    institution: Optional[str] = None; description: Optional[str] = None

class IncomeSourceCreate(BaseModel):
    name: str; amount: float; type: str = "salary"; frequency: str = "monthly"
    is_active: bool = True; description: Optional[str] = None
    start_date: Optional[str] = None; next_date: Optional[str] = None

class ExpenseCreate(BaseModel):
    name: str; amount: float; category: str = "Other"; frequency: str = "monthly"
    is_recurring: bool = True; description: Optional[str] = None
    next_date: Optional[str] = None; auto_pay: bool = False

class DebtCreate(BaseModel):
    name: str; original_balance: float; current_balance: float; interest_rate: float = 0.0
    min_payment: float = 0.0; debt_type: str = "credit_card"
    lender: Optional[str] = None; due_date: Optional[str] = None

class TransactionCreate(BaseModel):
    amount: float; type: str = "expense"; category: str = "Other"
    description: Optional[str] = None; date: Optional[str] = None
    account_id: Optional[str] = None; related_id: Optional[str] = None

class VehicleCreate(BaseModel):
    name: str; vehicle_type: str = "brokerage"; institution: Optional[str] = None
    current_value: float = 0.0

class HoldingCreate(BaseModel):
    vehicle_id: str; symbol: str; shares: float = 0.0; avg_cost: float = 0.0
    current_price: float = 0.0; name: Optional[str] = None

class BudgetCategoryItem(BaseModel):
    category: str; planned: float; actual: float = 0.0

class BudgetCreate(BaseModel):
    month: int; year: int; categories: List[BudgetCategoryItem]

class SavingsFundCreate(BaseModel):
    name: str; target_amount: float; current_amount: float = 0.0
    target_date: Optional[str] = None; description: Optional[str] = None

class DebtPayoffRequest(BaseModel):
    extra_monthly: float = 0.0; strategy: str = "avalanche"

class HealthCheck(BaseModel):
    status: str = "healthy"; service: str = "portfolio"; version: str = "3.0.0"

# ---- Accounts ----
accounts_router = APIRouter(prefix="/accounts", tags=["accounts"])

@accounts_router.get("/health")
async def accounts_health():
    return HealthCheck()

@accounts_router.get("/")
async def list_accounts(ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    return await db.accounts.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(200)

@accounts_router.post("/", status_code=201)
async def create_account(data: AccountCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    aid = new_id()
    doc = {"id": aid, "entity_id": ctx["entity_id"], "name": data.name, "type": data.account_type,
           "balance": data.balance, "currency": data.currency, "institution": data.institution,
           "description": data.description, "created_at": now_str(), "updated_at": now_str()}
    await db.accounts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@accounts_router.put("/{aid}")
async def update_account(aid: str, data: AccountCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.accounts.update_one({"id": aid, "entity_id": ctx["entity_id"]},
                                  {"$set": {"name": data.name, "type": data.account_type, "balance": data.balance,
                                           "currency": data.currency, "institution": data.institution, "updated_at": now_str()}})
    doc = await db.accounts.find_one({"id": aid}, {"_id": 0})
    return doc

@accounts_router.delete("/{aid}")
async def delete_account(aid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.accounts.delete_one({"id": aid, "entity_id": ctx["entity_id"]})
    return {"status": "ok"}

# ---- Income ----
income_router = APIRouter(prefix="/income", tags=["income"])

@income_router.get("/")
async def list_income(ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    return await db.income_sources.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(200)

@income_router.post("/", status_code=201)
async def create_income(data: IncomeSourceCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    iid = new_id()
    doc = {"id": iid, "entity_id": ctx["entity_id"], **data.model_dump(), "created_at": now_str(), "updated_at": now_str()}
    await db.income_sources.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@income_router.put("/{iid}")
async def update_income(iid: str, data: IncomeSourceCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.income_sources.update_one({"id": iid, "entity_id": ctx["entity_id"]},
                                        {"$set": {**data.model_dump(), "updated_at": now_str()}})
    return await db.income_sources.find_one({"id": iid}, {"_id": 0})

@income_router.delete("/{iid}")
async def delete_income(iid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.income_sources.delete_one({"id": iid, "entity_id": ctx["entity_id"]})
    return {"status": "ok"}

# ---- Expenses ----
expenses_router = APIRouter(prefix="/expenses", tags=["expenses"])

@expenses_router.get("/")
async def list_expenses(ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    return await db.expenses.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(200)

@expenses_router.post("/", status_code=201)
async def create_expense(data: ExpenseCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    eid = new_id()
    doc = {"id": eid, "entity_id": ctx["entity_id"], **data.model_dump(), "created_at": now_str(), "updated_at": now_str()}
    await db.expenses.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@expenses_router.put("/{eid}")
async def update_expense(eid: str, data: ExpenseCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.expenses.update_one({"id": eid, "entity_id": ctx["entity_id"]},
                                  {"$set": {**data.model_dump(), "updated_at": now_str()}})
    return await db.expenses.find_one({"id": eid}, {"_id": 0})

@expenses_router.delete("/{eid}")
async def delete_expense(eid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.expenses.delete_one({"id": eid, "entity_id": ctx["entity_id"]})
    return {"status": "ok"}

# ---- Debts ----
debts_router = APIRouter(prefix="/debts", tags=["debts"])

@debts_router.get("/")
async def list_debts(ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    return await db.debts.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(200)

@debts_router.post("/", status_code=201)
async def create_debt(data: DebtCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    did = new_id()
    doc = {"id": did, "entity_id": ctx["entity_id"], **data.model_dump(), "created_at": now_str()}
    await db.debts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@debts_router.put("/{did}")
async def update_debt(did: str, data: DebtCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.debts.update_one({"id": did, "entity_id": ctx["entity_id"]}, {"$set": {**data.model_dump()}})
    return await db.debts.find_one({"id": did}, {"_id": 0})

@debts_router.delete("/{did}")
async def delete_debt(did: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.debts.delete_one({"id": did, "entity_id": ctx["entity_id"]})
    return {"status": "ok"}

@debts_router.post("/{did}/payment")
async def make_debt_payment(did: str, amount: float = Query(...), ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    debt = await db.debts.find_one({"id": did, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not debt:
        raise HTTPException(404, "Debt not found")
    new_balance = max(0, debt["current_balance"] - amount)
    await db.debts.update_one({"id": did}, {"$set": {"current_balance": new_balance}})
    await db.transactions.insert_one({
        "id": new_id(), "entity_id": ctx["entity_id"], "amount": amount, "type": "debt_payment",
        "category": "Debt", "description": f"Payment: {debt['name']}", "date": now_str(),
        "related_id": did, "created_at": now_str()
    })
    return {"new_balance": new_balance}

@debts_router.post("/payoff-estimate")
async def debt_payoff_estimate(req: DebtPayoffRequest, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    debts = await db.debts.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(100)
    if not debts:
        return {"debts": [], "total_months": 0, "total_interest": 0}
    results = []
    for d in debts:
        bal = d.get("current_balance", 0)
        rate = d.get("interest_rate", 0) / 100 / 12
        payment = d.get("min_payment", 0)
        if bal <= 0 or payment <= 0:
            results.append({"name": d["name"], "months": 0, "total_interest": 0, "total_paid": 0})
            continue
        months, interest = 0, 0.0
        b = bal
        while b > 0 and months < 600:
            mi = b * rate
            interest += mi
            b = b + mi - payment
            months += 1
        results.append({"name": d["name"], "months": months, "total_interest": round(interest, 2), "total_paid": round(bal + interest, 2)})
    return {"debts": results, "strategy": req.strategy,
            "total_months": max((r["months"] for r in results), default=0),
            "total_interest": round(sum(r["total_interest"] for r in results), 2)}

# ---- Transactions ----
tx_router = APIRouter(prefix="/transactions", tags=["transactions"])

@tx_router.get("/")
async def list_transactions(type: Optional[str] = None, category: Optional[str] = None,
                            limit: int = 100, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    q = {"entity_id": ctx["entity_id"]}
    if type:
        q["type"] = type
    if category:
        q["category"] = category
    return await db.transactions.find(q, {"_id": 0}).sort("date", -1).to_list(limit)

@tx_router.post("/", status_code=201)
async def create_transaction(data: TransactionCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    tid = new_id()
    doc = {"id": tid, "entity_id": ctx["entity_id"], **data.model_dump(),
           "date": data.date or now_str(), "created_at": now_str()}
    await db.transactions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@tx_router.delete("/{tid}")
async def delete_transaction(tid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.transactions.delete_one({"id": tid, "entity_id": ctx["entity_id"]})
    return {"status": "ok"}

@tx_router.get("/search")
async def search_transactions(q: Optional[str] = None, type: Optional[str] = None,
                              category: Optional[str] = None, date_from: Optional[str] = None,
                              date_to: Optional[str] = None, sort_by: str = "date",
                              sort_dir: str = "desc", page: int = 1, limit: int = 20,
                              ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    query = {"entity_id": ctx["entity_id"]}
    if q:
        query["$or"] = [{"description": {"$regex": q, "$options": "i"}}, {"category": {"$regex": q, "$options": "i"}}]
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q["$gte"] = date_from
        if date_to:
            date_q["$lte"] = date_to
        query["date"] = date_q
    total = await db.transactions.count_documents(query)
    direction = -1 if sort_dir == "desc" else 1
    items = await db.transactions.find(query, {"_id": 0}).sort(sort_by, direction).skip((page-1)*limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if limit else 1}

# ---- Investments ----
vehicles_router = APIRouter(prefix="/investments/vehicles", tags=["investments"])
holdings_router = APIRouter(prefix="/investments/holdings", tags=["investments"])

@vehicles_router.get("/")
async def list_vehicles(ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    return await db.investment_vehicles.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(200)

@vehicles_router.post("/", status_code=201)
async def create_vehicle(data: VehicleCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    vid = new_id()
    doc = {"id": vid, "entity_id": ctx["entity_id"], **data.model_dump(), "created_at": now_str()}
    await db.investment_vehicles.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@vehicles_router.put("/{vid}")
async def update_vehicle(vid: str, data: VehicleCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.investment_vehicles.update_one({"id": vid}, {"$set": {**data.model_dump(), "updated_at": now_str()}})
    return await db.investment_vehicles.find_one({"id": vid}, {"_id": 0})

@vehicles_router.delete("/{vid}")
async def delete_vehicle(vid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.investment_vehicles.delete_one({"id": vid})
    await db.investment_holdings.delete_many({"vehicle_id": vid})
    return {"status": "ok"}

@holdings_router.get("/")
async def list_holdings(vehicle_id: Optional[str] = None, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    q = {"entity_id": ctx["entity_id"]}
    if vehicle_id:
        q["vehicle_id"] = vehicle_id
    return await db.investment_holdings.find(q, {"_id": 0}).to_list(500)

@holdings_router.post("/", status_code=201)
async def create_holding(data: HoldingCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    hid = new_id()
    doc = {"id": hid, "entity_id": ctx["entity_id"], **data.model_dump(), "created_at": now_str()}
    await db.investment_holdings.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@holdings_router.put("/{hid}")
async def update_holding(hid: str, data: HoldingCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.investment_holdings.update_one({"id": hid}, {"$set": {**data.model_dump()}})
    return await db.investment_holdings.find_one({"id": hid}, {"_id": 0})

@holdings_router.delete("/{hid}")
async def delete_holding(hid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.investment_holdings.delete_one({"id": hid})
    return {"status": "ok"}

# ---- Budgets ----
budgets_router = APIRouter(prefix="/budgets", tags=["budgets"])

@budgets_router.get("/")
async def list_budgets(year: Optional[int] = None, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    q = {"entity_id": ctx["entity_id"]}
    if year:
        q["year"] = year
    return await db.budgets.find(q, {"_id": 0}).to_list(200)

@budgets_router.post("/", status_code=201)
async def create_budget(data: BudgetCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    bid = new_id()
    doc = {"id": bid, "entity_id": ctx["entity_id"], "month": data.month, "year": data.year,
           "categories": [c.model_dump() for c in data.categories], "created_at": now_str()}
    await db.budgets.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@budgets_router.put("/{bid}")
async def update_budget(bid: str, data: BudgetCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.budgets.update_one({"id": bid}, {"$set": {"categories": [c.model_dump() for c in data.categories], "updated_at": now_str()}})
    return await db.budgets.find_one({"id": bid}, {"_id": 0})

@budgets_router.delete("/{bid}")
async def delete_budget(bid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.budgets.delete_one({"id": bid})
    return {"status": "ok"}

@budgets_router.get("/variance")
async def budget_variance(month: Optional[int] = None, year: Optional[int] = None, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year
    budget = await db.budgets.find_one({"entity_id": ctx["entity_id"], "month": m, "year": y}, {"_id": 0})
    if not budget:
        return {"month": m, "year": y, "categories": [], "total_planned": 0, "total_actual": 0}
    return {"month": m, "year": y, "categories": budget.get("categories", []),
            "total_planned": sum(c.get("planned", 0) for c in budget.get("categories", [])),
            "total_actual": sum(c.get("actual", 0) for c in budget.get("categories", []))}

# ---- Savings ----
savings_router = APIRouter(prefix="/savings-funds", tags=["savings"])

@savings_router.get("/")
async def list_savings(ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    return await db.savings_funds.find({"entity_id": ctx["entity_id"]}, {"_id": 0}).to_list(200)

@savings_router.post("/", status_code=201)
async def create_savings(data: SavingsFundCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    sid = new_id()
    doc = {"id": sid, "entity_id": ctx["entity_id"], **data.model_dump(), "created_at": now_str()}
    await db.savings_funds.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@savings_router.put("/{sid}")
async def update_savings(sid: str, data: SavingsFundCreate, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.savings_funds.update_one({"id": sid}, {"$set": {**data.model_dump(), "updated_at": now_str()}})
    return await db.savings_funds.find_one({"id": sid}, {"_id": 0})

@savings_router.delete("/{sid}")
async def delete_savings(sid: str, ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    await db.savings_funds.delete_one({"id": sid})
    return {"status": "ok"}

@savings_router.post("/{sid}/contribute")
async def contribute(sid: str, amount: float = Query(...), ctx: dict = Depends(get_entity_access)):
    db = await get_mongo_db()
    fund = await db.savings_funds.find_one({"id": sid, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not fund:
        raise HTTPException(404, "Fund not found")
    new_amount = fund.get("current_amount", 0) + amount
    await db.savings_funds.update_one({"id": sid}, {"$set": {"current_amount": new_amount}})
    await db.transactions.insert_one({
        "id": new_id(), "entity_id": ctx["entity_id"], "amount": amount, "type": "savings",
        "category": "Savings", "description": f"Contribution: {fund['name']}",
        "date": now_str(), "related_id": sid, "created_at": now_str()
    })
    return {"new_amount": new_amount}


# ---- App Setup ----
app.include_router(accounts_router, prefix="/api", tags=["accounts"])
app.include_router(income_router, prefix="/api", tags=["income"])
app.include_router(expenses_router, prefix="/api", tags=["expenses"])
app.include_router(debts_router, prefix="/api", tags=["debts"])
app.include_router(tx_router, prefix="/api", tags=["transactions"])
app.include_router(vehicles_router, prefix="/api", tags=["investments"])
app.include_router(holdings_router, prefix="/api", tags=["investments"])
app.include_router(budgets_router, prefix="/api", tags=["budgets"])
app.include_router(savings_router, prefix="/api", tags=["savings"])

from starlette.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
