from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr
from passlib.context import CryptContext
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import os, logging, uuid, jwt
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'blackiefi-super-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="BlackieFi API", version="3.0.0")
security = HTTPBearer()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== DEFAULT DATA ====================
DEFAULT_ROLE_PERMISSIONS = {
    "admin": {
        "view_transactions": True, "create_transaction": True, "edit_transaction": True, "delete_transaction": True,
        "view_budgets": True, "manage_budgets": True, "view_investments": True, "manage_investments": True,
        "manage_categories": True, "manage_entities": True, "manage_users": True, "manage_roles": True,
        "view_reports": True, "manage_income": True, "manage_expenses": True, "manage_debts": True,
        "manage_accounts": True, "manage_savings_funds": True, "manage_calendar": True,
    },
    "power_user": {
        "view_transactions": True, "create_transaction": True, "edit_transaction": True, "delete_transaction": True,
        "view_budgets": True, "manage_budgets": True, "view_investments": True, "manage_investments": True,
        "manage_categories": False, "manage_entities": False, "manage_users": False, "manage_roles": False,
        "view_reports": True, "manage_income": True, "manage_expenses": True, "manage_debts": True,
        "manage_accounts": True, "manage_savings_funds": True, "manage_calendar": True,
    },
    "regular_user": {
        "view_transactions": True, "create_transaction": False, "edit_transaction": False, "delete_transaction": False,
        "view_budgets": True, "manage_budgets": False, "view_investments": True, "manage_investments": False,
        "manage_categories": False, "manage_entities": False, "manage_users": False, "manage_roles": False,
        "view_reports": True, "manage_income": False, "manage_expenses": False, "manage_debts": False,
        "manage_accounts": False, "manage_savings_funds": False, "manage_calendar": False,
    },
}

DEFAULT_CATEGORIES = [
    {"name": "Home", "icon": "home", "color": "#3b82f6"},
    {"name": "Vehicle", "icon": "car", "color": "#8b5cf6"},
    {"name": "Savings", "icon": "piggy-bank", "color": "#22c55e"},
    {"name": "Retirement", "icon": "sunset", "color": "#f97316"},
    {"name": "Investments", "icon": "trending-up", "color": "#06b6d4"},
    {"name": "Food & Dining", "icon": "utensils", "color": "#ec4899"},
    {"name": "Healthcare", "icon": "heart-pulse", "color": "#ef4444"},
    {"name": "Entertainment", "icon": "tv", "color": "#a855f7"},
    {"name": "Utilities", "icon": "zap", "color": "#eab308"},
    {"name": "Insurance", "icon": "shield", "color": "#14b8a6"},
    {"name": "Education", "icon": "graduation-cap", "color": "#6366f1"},
    {"name": "Subscriptions", "icon": "repeat", "color": "#f43f5e"},
    {"name": "Other", "icon": "more-horizontal", "color": "#64748b"},
]

# ==================== MODELS ====================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    is_admin: bool
    personal_entity_id: Optional[str] = None
    onboarding_complete: bool = False
    created_at: datetime

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EntityCreate(BaseModel):
    name: str
    entity_type: str = "business"
    business_type: Optional[str] = None
    jurisdiction: Optional[str] = None
    description: Optional[str] = None

class EntityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    entity_type: str
    business_type: Optional[str] = None
    jurisdiction: Optional[str] = None
    description: Optional[str] = None
    owner_id: str
    status: str
    is_personal: bool = False
    created_at: datetime
    updated_at: datetime

class RoleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    display_name: str = ""
    permissions: Dict[str, bool] = {}
    is_default: bool = True

class AccountCreate(BaseModel):
    name: str
    account_type: str
    institution: Optional[str] = None
    balance: float = 0.0
    currency: str = "USD"

class AccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    account_type: str
    institution: Optional[str] = None
    balance: float
    currency: str
    owner_id: str
    entity_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class IncomeSourceCreate(BaseModel):
    name: str
    income_type: str = "salary"
    amount: float
    is_variable: bool = False
    frequency: str = "monthly"
    next_pay_date: Optional[str] = None
    account_id: Optional[str] = None

class IncomeSourceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    name: str
    income_type: str
    amount: float
    is_variable: bool
    frequency: str
    next_pay_date: Optional[str] = None
    account_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ExpenseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    amount: float
    is_variable: bool = False
    is_recurring: bool = True
    frequency: Optional[str] = "monthly"
    next_due_date: Optional[str] = None
    category_id: Optional[str] = None
    account_id: Optional[str] = None

class ExpenseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    amount: float
    is_variable: bool
    is_recurring: bool
    frequency: Optional[str] = None
    next_due_date: Optional[str] = None
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class DebtCreate(BaseModel):
    name: str
    debt_type: str = "loan"
    original_amount: float
    current_balance: float
    interest_rate: float = 0.0
    minimum_payment: Optional[float] = None
    due_date: Optional[str] = None
    frequency: str = "monthly"
    account_id: Optional[str] = None

class DebtResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    name: str
    debt_type: str
    original_amount: float
    current_balance: float
    interest_rate: float
    minimum_payment: Optional[float] = None
    due_date: Optional[str] = None
    frequency: str
    account_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class TransactionCreate(BaseModel):
    transaction_type: str
    amount: float
    description: str
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    source_id: Optional[str] = None
    source_type: Optional[str] = None
    date: Optional[str] = None

class TransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    transaction_type: str
    amount: float
    description: str
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    source_id: Optional[str] = None
    source_type: Optional[str] = None
    date: str
    created_at: datetime

class VehicleCreate(BaseModel):
    name: str
    vehicle_type: str = "brokerage"
    provider: Optional[str] = None

class VehicleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    name: str
    vehicle_type: str
    provider: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class HoldingCreate(BaseModel):
    vehicle_id: str
    asset_name: str
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None

class HoldingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    vehicle_id: str
    entity_id: str
    owner_id: str
    asset_name: str
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None
    created_at: datetime
    updated_at: datetime

class BudgetCategoryItem(BaseModel):
    category_id: str
    category_name: Optional[str] = None
    planned_amount: float

class BudgetCreate(BaseModel):
    month: int
    year: int
    items: List[BudgetCategoryItem] = []

class BudgetResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    month: int
    year: int
    items: List[dict] = []
    created_at: datetime
    updated_at: datetime

class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "tag"
    color: Optional[str] = "#64748b"

class CategoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    entity_id: Optional[str] = None
    is_default: bool = False
    created_at: datetime

class SavingsFundCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None

class SavingsFundResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    name: str
    target_amount: float
    current_amount: float
    target_date: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CalendarEventCreate(BaseModel):
    title: str
    event_type: str = "custom"
    date: str
    description: Optional[str] = None
    color: Optional[str] = None

class CalendarEventResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    owner_id: str
    title: str
    event_type: str
    date: str
    source_id: Optional[str] = None
    source_type: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_manual: bool = True

class EntityUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_id: str
    user_id: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    role_id: str
    role_name: Optional[str] = None
    is_active: bool
    created_at: datetime

class InviteRequest(BaseModel):
    email: str
    role_name: str = "regular_user"

class HealthCheck(BaseModel):
    status: str = "healthy"
    service: str
    version: str = "3.0.0"


# ==================== HELPERS ====================
def now_str():
    return datetime.now(timezone.utc).isoformat()

def now_dt():
    return datetime.now(timezone.utc)

def new_id():
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(subject: str) -> str:
    expire = now_dt() + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode({"sub": subject, "exp": expire, "iat": now_dt()}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(401, "Invalid token")
    return uid

def parse_dt(val):
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace('Z', '+00:00'))
        except Exception:
            return now_dt()
    return val or now_dt()

async def _resolve_entity_access(eid, user_id):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    eid = eid or user.get("personal_entity_id")
    if not eid:
        raise HTTPException(400, "No entity context")
    if eid == user.get("personal_entity_id"):
        return {"entity_id": eid, "user_id": user_id, "permissions": DEFAULT_ROLE_PERMISSIONS["admin"]}
    eu = await db.entity_users.find_one({"entity_id": eid, "user_id": user_id, "is_active": True}, {"_id": 0})
    if not eu:
        raise HTTPException(403, "No access to this entity")
    role = await db.roles.find_one({"id": eu["role_id"]}, {"_id": 0})
    perms = role.get("permissions", {}) if role else DEFAULT_ROLE_PERMISSIONS["regular_user"]
    return {"entity_id": eid, "user_id": user_id, "permissions": perms}

async def get_entity_access(entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    return await _resolve_entity_access(entity_id, user_id)

def check_perm(ctx, perm):
    if not ctx["permissions"].get(perm):
        raise HTTPException(403, f"Permission denied: {perm}")

async def log_audit(entity_id, user_id, action, resource_type, resource_id, details=None):
    await db.audit_log.insert_one({
        "id": new_id(), "entity_id": entity_id, "user_id": user_id,
        "action": action, "resource_type": resource_type, "resource_id": resource_id,
        "details": details or {}, "created_at": now_str()
    })


# ==================== ROUTERS ====================
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
entities_router = APIRouter(prefix="/api/entities", tags=["entities"])
roles_router = APIRouter(prefix="/api/roles", tags=["roles"])
accounts_router = APIRouter(prefix="/api/accounts", tags=["accounts"])
income_router = APIRouter(prefix="/api/income", tags=["income"])
expenses_router = APIRouter(prefix="/api/expenses", tags=["expenses"])
debts_router = APIRouter(prefix="/api/debts", tags=["debts"])
transactions_router = APIRouter(prefix="/api/transactions", tags=["transactions"])
vehicles_router = APIRouter(prefix="/api/investments/vehicles", tags=["investments"])
holdings_router = APIRouter(prefix="/api/investments/holdings", tags=["investments"])
budgets_router = APIRouter(prefix="/api/budgets", tags=["budgets"])
categories_router = APIRouter(prefix="/api/categories", tags=["categories"])
savings_router = APIRouter(prefix="/api/savings-funds", tags=["savings-funds"])
calendar_router = APIRouter(prefix="/api/calendar", tags=["calendar"])
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
onboarding_router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


# ==================== AUTH ROUTES ====================
@auth_router.get("/health", response_model=HealthCheck)
async def auth_health():
    return HealthCheck(service="auth")

@auth_router.post("/register", response_model=LoginResponse, status_code=201)
async def register(req: UserCreate):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    uid = new_id()
    eid = new_id()
    n = now_dt()
    user_doc = {
        "id": uid, "email": req.email, "full_name": req.full_name, "phone": req.phone,
        "hashed_password": hash_password(req.password), "is_active": True, "is_admin": False,
        "personal_entity_id": eid, "onboarding_complete": False,
        "created_at": n.isoformat(), "updated_at": n.isoformat()
    }
    entity_doc = {
        "id": eid, "name": f"{req.full_name}'s Personal", "entity_type": "personal",
        "business_type": None, "jurisdiction": None, "description": "Personal finance",
        "owner_id": uid, "status": "active", "is_personal": True,
        "created_at": n.isoformat(), "updated_at": n.isoformat()
    }
    await db.users.insert_one(user_doc)
    await db.entities.insert_one(entity_doc)
    admin_role = await db.roles.find_one({"name": "admin", "entity_id": None}, {"_id": 0})
    if admin_role:
        await db.entity_users.insert_one({
            "id": new_id(), "entity_id": eid, "user_id": uid,
            "role_id": admin_role["id"], "is_active": True,
            "invited_by": uid, "created_at": n.isoformat()
        })
    return LoginResponse(
        access_token=create_access_token(uid),
        user=UserResponse(id=uid, email=req.email, full_name=req.full_name, phone=req.phone,
                         is_active=True, is_admin=False, personal_entity_id=eid,
                         onboarding_complete=False, created_at=n)
    )

@auth_router.post("/login", response_model=LoginResponse)
async def login(req: UserLogin):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    return LoginResponse(
        access_token=create_access_token(user["id"]),
        user=UserResponse(
            id=user["id"], email=user["email"], full_name=user["full_name"],
            phone=user.get("phone"), is_active=user.get("is_active", True),
            is_admin=user.get("is_admin", False),
            personal_entity_id=user.get("personal_entity_id"),
            onboarding_complete=user.get("onboarding_complete", False),
            created_at=parse_dt(user.get("created_at"))
        )
    )

@auth_router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {"message": "Logged out"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse(
        id=user["id"], email=user["email"], full_name=user["full_name"],
        phone=user.get("phone"), is_active=user.get("is_active", True),
        is_admin=user.get("is_admin", False),
        personal_entity_id=user.get("personal_entity_id"),
        onboarding_complete=user.get("onboarding_complete", False),
        created_at=parse_dt(user.get("created_at"))
    )


# ==================== ENTITY ROUTES ====================
@entities_router.get("/", response_model=List[EntityResponse])
async def list_entities(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    entity_ids = [user.get("personal_entity_id")] if user else []
    eu_list = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    entity_ids.extend([eu["entity_id"] for eu in eu_list if eu["entity_id"] not in entity_ids])
    entities = await db.entities.find({"id": {"$in": entity_ids}}, {"_id": 0}).to_list(100)
    return [EntityResponse(**{**e, "created_at": parse_dt(e.get("created_at")),
                              "updated_at": parse_dt(e.get("updated_at"))}) for e in entities]

@entities_router.post("/", response_model=EntityResponse, status_code=201)
async def create_entity(data: EntityCreate, user_id: str = Depends(get_current_user_id)):
    n = now_dt()
    eid = new_id()
    doc = {
        "id": eid, "name": data.name, "entity_type": data.entity_type or "business",
        "business_type": data.business_type, "jurisdiction": data.jurisdiction,
        "description": data.description, "owner_id": user_id, "status": "active",
        "is_personal": False, "created_at": n.isoformat(), "updated_at": n.isoformat()
    }
    await db.entities.insert_one(doc)
    admin_role = await db.roles.find_one({"name": "admin", "entity_id": None}, {"_id": 0})
    if admin_role:
        await db.entity_users.insert_one({
            "id": new_id(), "entity_id": eid, "user_id": user_id,
            "role_id": admin_role["id"], "is_active": True,
            "invited_by": user_id, "created_at": n.isoformat()
        })
    await log_audit(eid, user_id, "create", "entity", eid, {"name": data.name})
    return EntityResponse(**{**doc, "created_at": n, "updated_at": n})

@entities_router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, user_id: str = Depends(get_current_user_id)):
    e = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Entity not found")
    return EntityResponse(**{**e, "created_at": parse_dt(e.get("created_at")),
                             "updated_at": parse_dt(e.get("updated_at"))})

@entities_router.put("/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, data: EntityCreate, user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    check_perm(ctx, "manage_entities")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = now_str()
    await db.entities.update_one({"id": entity_id}, {"$set": updates})
    e = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    return EntityResponse(**{**e, "created_at": parse_dt(e.get("created_at")),
                             "updated_at": parse_dt(e.get("updated_at"))})

@entities_router.delete("/{entity_id}")
async def delete_entity(entity_id: str, user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    check_perm(ctx, "manage_entities")
    e = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    if e and e.get("is_personal"):
        raise HTTPException(400, "Cannot delete personal entity")
    await db.entities.delete_one({"id": entity_id})
    await db.entity_users.delete_many({"entity_id": entity_id})
    return {"message": "Entity deleted"}

@entities_router.post("/{entity_id}/invite", response_model=EntityUserResponse)
async def invite_user(entity_id: str, req: InviteRequest, user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    check_perm(ctx, "manage_users")
    target = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found. They must register first.")
    existing = await db.entity_users.find_one({"entity_id": entity_id, "user_id": target["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(400, "User already has access")
    role = await db.roles.find_one({"name": req.role_name, "entity_id": None}, {"_id": 0})
    if not role:
        raise HTTPException(400, "Invalid role")
    n = now_str()
    eu_id = new_id()
    doc = {"id": eu_id, "entity_id": entity_id, "user_id": target["id"],
           "role_id": role["id"], "is_active": True, "invited_by": user_id, "created_at": n}
    await db.entity_users.insert_one(doc)
    return EntityUserResponse(id=eu_id, entity_id=entity_id, user_id=target["id"],
                              user_email=target["email"], user_name=target["full_name"],
                              role_id=role["id"], role_name=role["name"],
                              is_active=True, created_at=parse_dt(n))

@entities_router.get("/{entity_id}/users", response_model=List[EntityUserResponse])
async def list_entity_users(entity_id: str, user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    eus = await db.entity_users.find({"entity_id": entity_id}, {"_id": 0}).to_list(100)
    results = []
    for eu in eus:
        user = await db.users.find_one({"id": eu["user_id"]}, {"_id": 0})
        role = await db.roles.find_one({"id": eu["role_id"]}, {"_id": 0})
        results.append(EntityUserResponse(
            id=eu["id"], entity_id=entity_id, user_id=eu["user_id"],
            user_email=user.get("email", "") if user else "", user_name=user.get("full_name", "") if user else "",
            role_id=eu["role_id"], role_name=role.get("name", "") if role else "",
            is_active=eu.get("is_active", True), created_at=parse_dt(eu.get("created_at"))
        ))
    return results

@entities_router.put("/{entity_id}/users/{target_user_id}/role")
async def change_user_role(entity_id: str, target_user_id: str, role_name: str = Query(...), user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    check_perm(ctx, "manage_users")
    role = await db.roles.find_one({"name": role_name, "entity_id": None}, {"_id": 0})
    if not role:
        raise HTTPException(400, "Invalid role")
    await db.entity_users.update_one(
        {"entity_id": entity_id, "user_id": target_user_id},
        {"$set": {"role_id": role["id"]}}
    )
    return {"message": "Role updated"}

@entities_router.put("/{entity_id}/users/{target_user_id}/deactivate")
async def deactivate_user(entity_id: str, target_user_id: str, user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    check_perm(ctx, "manage_users")
    await db.entity_users.update_one(
        {"entity_id": entity_id, "user_id": target_user_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "User deactivated"}


# ==================== ROLES ROUTES ====================
@roles_router.get("/", response_model=List[RoleResponse])
async def list_roles(user_id: str = Depends(get_current_user_id)):
    roles = await db.roles.find({"entity_id": None}, {"_id": 0}).to_list(20)
    return [RoleResponse(**r) for r in roles]

@roles_router.put("/{role_id}/permissions")
async def update_role_permissions(role_id: str, permissions: Dict[str, bool], ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_roles")
    await db.roles.update_one({"id": role_id}, {"$set": {"permissions": permissions}})
    return {"message": "Permissions updated"}


# ==================== ACCOUNTS ROUTES ====================
@accounts_router.get("/", response_model=List[AccountResponse])
async def list_accounts(ctx: dict = Depends(get_entity_access)):
    accs = await db.accounts.find({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}, {"_id": 0}).to_list(100)
    return [AccountResponse(**{**a, "created_at": parse_dt(a.get("created_at")),
                               "updated_at": parse_dt(a.get("updated_at"))}) for a in accs]

@accounts_router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(data: AccountCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_accounts")
    n = now_dt()
    doc = {"id": new_id(), "name": data.name, "account_type": data.account_type,
           "institution": data.institution, "balance": data.balance, "currency": data.currency,
           "owner_id": ctx["user_id"], "entity_id": ctx["entity_id"],
           "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.accounts.insert_one(doc)
    await log_audit(ctx["entity_id"], ctx["user_id"], "create", "account", doc["id"])
    return AccountResponse(**{**doc, "created_at": n, "updated_at": n})

@accounts_router.put("/{aid}", response_model=AccountResponse)
async def update_account(aid: str, data: AccountCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_accounts")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.accounts.update_one({"id": aid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    a = await db.accounts.find_one({"id": aid}, {"_id": 0})
    return AccountResponse(**{**a, "created_at": parse_dt(a.get("created_at")), "updated_at": parse_dt(a.get("updated_at"))})

@accounts_router.delete("/{aid}")
async def delete_account(aid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_accounts")
    r = await db.accounts.delete_one({"id": aid, "entity_id": ctx["entity_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Account not found")
    return {"message": "Account deleted"}


# ==================== INCOME ROUTES ====================
@income_router.get("/", response_model=List[IncomeSourceResponse])
async def list_income(ctx: dict = Depends(get_entity_access)):
    items = await db.income_sources.find({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}, {"_id": 0}).to_list(100)
    return [IncomeSourceResponse(**{**i, "created_at": parse_dt(i.get("created_at")),
                                    "updated_at": parse_dt(i.get("updated_at"))}) for i in items]

@income_router.post("/", response_model=IncomeSourceResponse, status_code=201)
async def create_income(data: IncomeSourceCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_income")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "name": data.name, "income_type": data.income_type, "amount": data.amount,
           "is_variable": data.is_variable, "frequency": data.frequency,
           "next_pay_date": data.next_pay_date, "account_id": data.account_id,
           "is_active": True, "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.income_sources.insert_one(doc)
    await log_audit(ctx["entity_id"], ctx["user_id"], "create", "income", doc["id"])
    return IncomeSourceResponse(**{**doc, "created_at": n, "updated_at": n})

@income_router.put("/{iid}", response_model=IncomeSourceResponse)
async def update_income(iid: str, data: IncomeSourceCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_income")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.income_sources.update_one({"id": iid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    i = await db.income_sources.find_one({"id": iid}, {"_id": 0})
    return IncomeSourceResponse(**{**i, "created_at": parse_dt(i.get("created_at")), "updated_at": parse_dt(i.get("updated_at"))})

@income_router.delete("/{iid}")
async def delete_income(iid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_income")
    await db.income_sources.delete_one({"id": iid, "entity_id": ctx["entity_id"]})
    return {"message": "Income source deleted"}

@income_router.post("/{iid}/receive")
async def receive_income(iid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "create_transaction")
    inc = await db.income_sources.find_one({"id": iid, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not inc:
        raise HTTPException(404, "Income not found")
    n = now_dt()
    tx = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
          "transaction_type": "income", "amount": inc["amount"],
          "description": f"Received: {inc['name']}", "account_id": inc.get("account_id"),
          "source_id": iid, "source_type": "income", "date": n.isoformat(),
          "category_id": None, "created_at": n.isoformat()}
    await db.transactions.insert_one(tx)
    if inc.get("account_id"):
        await db.accounts.update_one({"id": inc["account_id"]}, {"$inc": {"balance": inc["amount"]}})
    next_date = _advance_date(inc.get("next_pay_date"), inc.get("frequency", "monthly"))
    await db.income_sources.update_one({"id": iid}, {"$set": {"next_pay_date": next_date, "updated_at": n.isoformat()}})
    return {"message": "Income received", "transaction_id": tx["id"]}


# ==================== EXPENSE ROUTES ====================
@expenses_router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(ctx: dict = Depends(get_entity_access)):
    items = await db.expenses.find({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}, {"_id": 0}).to_list(200)
    return [ExpenseResponse(**{**i, "created_at": parse_dt(i.get("created_at")),
                               "updated_at": parse_dt(i.get("updated_at"))}) for i in items]

@expenses_router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(data: ExpenseCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_expenses")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "name": data.name, "description": data.description, "amount": data.amount,
           "is_variable": data.is_variable, "is_recurring": data.is_recurring,
           "frequency": data.frequency, "next_due_date": data.next_due_date,
           "category_id": data.category_id, "account_id": data.account_id,
           "is_active": True, "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.expenses.insert_one(doc)
    await log_audit(ctx["entity_id"], ctx["user_id"], "create", "expense", doc["id"])
    return ExpenseResponse(**{**doc, "created_at": n, "updated_at": n})

@expenses_router.put("/{eid}", response_model=ExpenseResponse)
async def update_expense(eid: str, data: ExpenseCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_expenses")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.expenses.update_one({"id": eid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    i = await db.expenses.find_one({"id": eid}, {"_id": 0})
    return ExpenseResponse(**{**i, "created_at": parse_dt(i.get("created_at")), "updated_at": parse_dt(i.get("updated_at"))})

@expenses_router.delete("/{eid}")
async def delete_expense(eid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_expenses")
    await db.expenses.delete_one({"id": eid, "entity_id": ctx["entity_id"]})
    return {"message": "Expense deleted"}

@expenses_router.post("/{eid}/pay")
async def pay_expense(eid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "create_transaction")
    exp = await db.expenses.find_one({"id": eid, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not exp:
        raise HTTPException(404, "Expense not found")
    n = now_dt()
    tx = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
          "transaction_type": "expense", "amount": exp["amount"],
          "description": f"Paid: {exp['name']}", "account_id": exp.get("account_id"),
          "source_id": eid, "source_type": "expense", "date": n.isoformat(),
          "category_id": exp.get("category_id"), "created_at": n.isoformat()}
    await db.transactions.insert_one(tx)
    if exp.get("account_id"):
        await db.accounts.update_one({"id": exp["account_id"]}, {"$inc": {"balance": -exp["amount"]}})
    if exp.get("is_recurring"):
        next_date = _advance_date(exp.get("next_due_date"), exp.get("frequency", "monthly"))
        await db.expenses.update_one({"id": eid}, {"$set": {"next_due_date": next_date, "updated_at": n.isoformat()}})
    return {"message": "Expense paid", "transaction_id": tx["id"]}


# ==================== DEBT ROUTES ====================
@debts_router.get("/", response_model=List[DebtResponse])
async def list_debts(ctx: dict = Depends(get_entity_access)):
    items = await db.debts.find({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}, {"_id": 0}).to_list(100)
    return [DebtResponse(**{**i, "created_at": parse_dt(i.get("created_at")),
                            "updated_at": parse_dt(i.get("updated_at"))}) for i in items]

@debts_router.post("/", response_model=DebtResponse, status_code=201)
async def create_debt(data: DebtCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_debts")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "name": data.name, "debt_type": data.debt_type,
           "original_amount": data.original_amount, "current_balance": data.current_balance,
           "interest_rate": data.interest_rate, "minimum_payment": data.minimum_payment,
           "due_date": data.due_date, "frequency": data.frequency,
           "account_id": data.account_id, "is_active": True,
           "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.debts.insert_one(doc)
    await log_audit(ctx["entity_id"], ctx["user_id"], "create", "debt", doc["id"])
    return DebtResponse(**{**doc, "created_at": n, "updated_at": n})

@debts_router.put("/{did}", response_model=DebtResponse)
async def update_debt(did: str, data: DebtCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_debts")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.debts.update_one({"id": did, "entity_id": ctx["entity_id"]}, {"$set": updates})
    d = await db.debts.find_one({"id": did}, {"_id": 0})
    return DebtResponse(**{**d, "created_at": parse_dt(d.get("created_at")), "updated_at": parse_dt(d.get("updated_at"))})

@debts_router.delete("/{did}")
async def delete_debt(did: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_debts")
    await db.debts.delete_one({"id": did, "entity_id": ctx["entity_id"]})
    return {"message": "Debt deleted"}

@debts_router.post("/{did}/payment")
async def make_debt_payment(did: str, amount: float = Query(...), ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "create_transaction")
    debt = await db.debts.find_one({"id": did, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not debt:
        raise HTTPException(404, "Debt not found")
    n = now_dt()
    new_balance = max(0, debt["current_balance"] - amount)
    await db.debts.update_one({"id": did}, {"$set": {"current_balance": new_balance, "updated_at": n.isoformat()}})
    if debt.get("due_date"):
        next_date = _advance_date(debt["due_date"], debt.get("frequency", "monthly"))
        await db.debts.update_one({"id": did}, {"$set": {"due_date": next_date}})
    tx = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
          "transaction_type": "debt_payment", "amount": amount,
          "description": f"Payment: {debt['name']}", "account_id": debt.get("account_id"),
          "source_id": did, "source_type": "debt", "date": n.isoformat(),
          "category_id": None, "created_at": n.isoformat()}
    await db.transactions.insert_one(tx)
    if debt.get("account_id"):
        await db.accounts.update_one({"id": debt["account_id"]}, {"$inc": {"balance": -amount}})
    return {"message": "Payment recorded", "new_balance": new_balance}


# ==================== TRANSACTIONS ROUTES ====================
@transactions_router.get("/", response_model=List[TransactionResponse])
async def list_transactions(
    transaction_type: Optional[str] = None,
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    limit: int = Query(100, le=500),
    ctx: dict = Depends(get_entity_access)
):
    q = {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}
    if transaction_type:
        q["transaction_type"] = transaction_type
    if start_date:
        q["date"] = q.get("date", {})
        q["date"]["$gte"] = start_date
    if end_date:
        q.setdefault("date", {})
        q["date"]["$lte"] = end_date
    items = await db.transactions.find(q, {"_id": 0}).sort("date", -1).to_list(limit)
    return [TransactionResponse(**{**t, "created_at": parse_dt(t.get("created_at"))}) for t in items]

@transactions_router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(data: TransactionCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "create_transaction")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "transaction_type": data.transaction_type, "amount": data.amount,
           "description": data.description, "category_id": data.category_id,
           "account_id": data.account_id, "source_id": data.source_id,
           "source_type": data.source_type, "date": data.date or n.isoformat(),
           "created_at": n.isoformat()}
    await db.transactions.insert_one(doc)
    if data.account_id:
        delta = data.amount if data.transaction_type == "income" else -data.amount
        await db.accounts.update_one({"id": data.account_id}, {"$inc": {"balance": delta}})
    return TransactionResponse(**{**doc, "created_at": n})

@transactions_router.delete("/{tid}")
async def delete_transaction(tid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "delete_transaction")
    await db.transactions.delete_one({"id": tid, "entity_id": ctx["entity_id"]})
    return {"message": "Transaction deleted"}


# ==================== INVESTMENT ROUTES ====================
@vehicles_router.get("/", response_model=List[VehicleResponse])
async def list_vehicles(ctx: dict = Depends(get_entity_access)):
    items = await db.investment_vehicles.find({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}, {"_id": 0}).to_list(50)
    return [VehicleResponse(**{**v, "created_at": parse_dt(v.get("created_at")),
                               "updated_at": parse_dt(v.get("updated_at"))}) for v in items]

@vehicles_router.post("/", response_model=VehicleResponse, status_code=201)
async def create_vehicle(data: VehicleCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_investments")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "name": data.name, "vehicle_type": data.vehicle_type, "provider": data.provider,
           "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.investment_vehicles.insert_one(doc)
    return VehicleResponse(**{**doc, "created_at": n, "updated_at": n})

@vehicles_router.put("/{vid}", response_model=VehicleResponse)
async def update_vehicle(vid: str, data: VehicleCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_investments")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.investment_vehicles.update_one({"id": vid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    v = await db.investment_vehicles.find_one({"id": vid}, {"_id": 0})
    return VehicleResponse(**{**v, "created_at": parse_dt(v.get("created_at")), "updated_at": parse_dt(v.get("updated_at"))})

@vehicles_router.delete("/{vid}")
async def delete_vehicle(vid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_investments")
    await db.investment_vehicles.delete_one({"id": vid, "entity_id": ctx["entity_id"]})
    await db.investment_holdings.delete_many({"vehicle_id": vid})
    return {"message": "Vehicle and holdings deleted"}

@holdings_router.get("/", response_model=List[HoldingResponse])
async def list_holdings(vehicle_id: Optional[str] = None, ctx: dict = Depends(get_entity_access)):
    q = {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}
    if vehicle_id:
        q["vehicle_id"] = vehicle_id
    items = await db.investment_holdings.find(q, {"_id": 0}).to_list(200)
    return [HoldingResponse(**{**h, "created_at": parse_dt(h.get("created_at")),
                               "updated_at": parse_dt(h.get("updated_at"))}) for h in items]

@holdings_router.post("/", response_model=HoldingResponse, status_code=201)
async def create_holding(data: HoldingCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_investments")
    n = now_dt()
    doc = {"id": new_id(), "vehicle_id": data.vehicle_id, "entity_id": ctx["entity_id"],
           "owner_id": ctx["user_id"], "asset_name": data.asset_name,
           "quantity": data.quantity, "cost_basis": data.cost_basis,
           "current_price": data.current_price,
           "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.investment_holdings.insert_one(doc)
    return HoldingResponse(**{**doc, "created_at": n, "updated_at": n})

@holdings_router.put("/{hid}", response_model=HoldingResponse)
async def update_holding(hid: str, data: HoldingCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_investments")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.investment_holdings.update_one({"id": hid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    h = await db.investment_holdings.find_one({"id": hid}, {"_id": 0})
    return HoldingResponse(**{**h, "created_at": parse_dt(h.get("created_at")), "updated_at": parse_dt(h.get("updated_at"))})

@holdings_router.delete("/{hid}")
async def delete_holding(hid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_investments")
    await db.investment_holdings.delete_one({"id": hid, "entity_id": ctx["entity_id"]})
    return {"message": "Holding deleted"}


# ==================== BUDGET ROUTES ====================
@budgets_router.get("/", response_model=List[BudgetResponse])
async def list_budgets(year: Optional[int] = None, ctx: dict = Depends(get_entity_access)):
    q = {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}
    if year:
        q["year"] = year
    items = await db.budgets.find(q, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(24)
    return [BudgetResponse(**{**b, "created_at": parse_dt(b.get("created_at")),
                              "updated_at": parse_dt(b.get("updated_at"))}) for b in items]

@budgets_router.post("/", response_model=BudgetResponse, status_code=201)
async def create_budget(data: BudgetCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_budgets")
    existing = await db.budgets.find_one({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
                                          "month": data.month, "year": data.year}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Budget already exists for this month")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "month": data.month, "year": data.year,
           "items": [item.model_dump() for item in data.items],
           "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.budgets.insert_one(doc)
    return BudgetResponse(**{**doc, "created_at": n, "updated_at": n})

@budgets_router.put("/{bid}", response_model=BudgetResponse)
async def update_budget(bid: str, data: BudgetCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_budgets")
    updates = {"items": [item.model_dump() for item in data.items],
               "month": data.month, "year": data.year, "updated_at": now_str()}
    await db.budgets.update_one({"id": bid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    b = await db.budgets.find_one({"id": bid}, {"_id": 0})
    return BudgetResponse(**{**b, "created_at": parse_dt(b.get("created_at")), "updated_at": parse_dt(b.get("updated_at"))})

@budgets_router.delete("/{bid}")
async def delete_budget(bid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_budgets")
    await db.budgets.delete_one({"id": bid, "entity_id": ctx["entity_id"]})
    return {"message": "Budget deleted"}

@budgets_router.post("/{bid}/copy")
async def copy_budget(bid: str, target_month: int = Query(...), target_year: int = Query(...), ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_budgets")
    src = await db.budgets.find_one({"id": bid, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Source budget not found")
    existing = await db.budgets.find_one({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
                                          "month": target_month, "year": target_year})
    if existing:
        raise HTTPException(400, "Budget already exists for target month")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "month": target_month, "year": target_year, "items": src["items"],
           "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.budgets.insert_one(doc)
    return {"message": "Budget copied", "id": doc["id"]}


# ==================== CATEGORY ROUTES ====================
@categories_router.get("/", response_model=List[CategoryResponse])
async def list_categories(ctx: dict = Depends(get_entity_access)):
    cats = await db.categories.find(
        {"$or": [{"entity_id": None}, {"entity_id": ctx["entity_id"]}]}, {"_id": 0}
    ).to_list(100)
    return [CategoryResponse(**{**c, "created_at": parse_dt(c.get("created_at"))}) for c in cats]

@categories_router.post("/", response_model=CategoryResponse, status_code=201)
async def create_category(data: CategoryCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_categories")
    n = now_dt()
    doc = {"id": new_id(), "name": data.name, "icon": data.icon, "color": data.color,
           "entity_id": ctx["entity_id"], "is_default": False, "created_at": n.isoformat()}
    await db.categories.insert_one(doc)
    return CategoryResponse(**{**doc, "created_at": n})

@categories_router.put("/{cid}", response_model=CategoryResponse)
async def update_category(cid: str, data: CategoryCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_categories")
    await db.categories.update_one({"id": cid}, {"$set": {"name": data.name, "icon": data.icon, "color": data.color}})
    c = await db.categories.find_one({"id": cid}, {"_id": 0})
    return CategoryResponse(**{**c, "created_at": parse_dt(c.get("created_at"))})

@categories_router.delete("/{cid}")
async def delete_category(cid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_categories")
    cat = await db.categories.find_one({"id": cid}, {"_id": 0})
    if cat and cat.get("is_default"):
        raise HTTPException(400, "Cannot delete default category")
    await db.categories.delete_one({"id": cid})
    return {"message": "Category deleted"}


# ==================== SAVINGS FUND ROUTES ====================
@savings_router.get("/", response_model=List[SavingsFundResponse])
async def list_savings_funds(ctx: dict = Depends(get_entity_access)):
    items = await db.savings_funds.find({"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}, {"_id": 0}).to_list(50)
    return [SavingsFundResponse(**{**s, "created_at": parse_dt(s.get("created_at")),
                                   "updated_at": parse_dt(s.get("updated_at"))}) for s in items]

@savings_router.post("/", response_model=SavingsFundResponse, status_code=201)
async def create_savings_fund(data: SavingsFundCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_savings_funds")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "name": data.name, "target_amount": data.target_amount,
           "current_amount": data.current_amount, "target_date": data.target_date,
           "is_active": True, "created_at": n.isoformat(), "updated_at": n.isoformat()}
    await db.savings_funds.insert_one(doc)
    return SavingsFundResponse(**{**doc, "created_at": n, "updated_at": n})

@savings_router.put("/{sid}", response_model=SavingsFundResponse)
async def update_savings_fund(sid: str, data: SavingsFundCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_savings_funds")
    updates = data.model_dump()
    updates["updated_at"] = now_str()
    await db.savings_funds.update_one({"id": sid, "entity_id": ctx["entity_id"]}, {"$set": updates})
    s = await db.savings_funds.find_one({"id": sid}, {"_id": 0})
    return SavingsFundResponse(**{**s, "created_at": parse_dt(s.get("created_at")), "updated_at": parse_dt(s.get("updated_at"))})

@savings_router.delete("/{sid}")
async def delete_savings_fund(sid: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_savings_funds")
    await db.savings_funds.delete_one({"id": sid, "entity_id": ctx["entity_id"]})
    return {"message": "Savings fund deleted"}

@savings_router.post("/{sid}/contribute")
async def contribute_to_fund(sid: str, amount: float = Query(...), ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_savings_funds")
    fund = await db.savings_funds.find_one({"id": sid, "entity_id": ctx["entity_id"]}, {"_id": 0})
    if not fund:
        raise HTTPException(404, "Fund not found")
    new_amount = fund["current_amount"] + amount
    await db.savings_funds.update_one({"id": sid}, {"$set": {"current_amount": new_amount, "updated_at": now_str()}})
    n = now_dt()
    tx = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
          "transaction_type": "transfer", "amount": amount,
          "description": f"Contribution: {fund['name']}", "source_id": sid,
          "source_type": "savings_fund", "date": n.isoformat(),
          "account_id": None, "category_id": None, "created_at": n.isoformat()}
    await db.transactions.insert_one(tx)
    return {"message": "Contribution recorded", "new_amount": new_amount}


# ==================== CALENDAR ROUTES ====================
@calendar_router.get("/events")
async def get_calendar_events(
    start: str = Query(...), end: str = Query(...),
    ctx: dict = Depends(get_entity_access)
):
    events = []
    eid = ctx["entity_id"]
    uid = ctx["user_id"]

    manual = await db.calendar_events.find(
        {"entity_id": eid, "owner_id": uid, "date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(200)
    for e in manual:
        events.append({"id": e["id"], "title": e["title"], "date": e["date"],
                       "event_type": e.get("event_type", "custom"), "color": e.get("color", "#64748b"),
                       "description": e.get("description"), "source_id": None, "is_manual": True})

    incomes = await db.income_sources.find(
        {"entity_id": eid, "owner_id": uid, "is_active": True,
         "next_pay_date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(50)
    for inc in incomes:
        events.append({"id": f"inc-{inc['id']}", "title": f"Payday: {inc['name']}",
                       "date": inc["next_pay_date"], "event_type": "income",
                       "color": "#22c55e", "description": f"${inc['amount']:,.2f}",
                       "source_id": inc["id"], "is_manual": False})

    expenses = await db.expenses.find(
        {"entity_id": eid, "owner_id": uid, "is_active": True,
         "next_due_date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(100)
    for exp in expenses:
        events.append({"id": f"exp-{exp['id']}", "title": f"Due: {exp['name']}",
                       "date": exp["next_due_date"], "event_type": "expense",
                       "color": "#ef4444", "description": f"${exp['amount']:,.2f}",
                       "source_id": exp["id"], "is_manual": False})

    debts = await db.debts.find(
        {"entity_id": eid, "owner_id": uid, "is_active": True,
         "due_date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(50)
    for d in debts:
        events.append({"id": f"debt-{d['id']}", "title": f"Payment: {d['name']}",
                       "date": d["due_date"], "event_type": "debt",
                       "color": "#f97316", "description": f"Min: ${d.get('minimum_payment', 0):,.2f}",
                       "source_id": d["id"], "is_manual": False})

    return events

@calendar_router.post("/events", status_code=201)
async def create_calendar_event(data: CalendarEventCreate, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_calendar")
    n = now_dt()
    doc = {"id": new_id(), "entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
           "title": data.title, "event_type": data.event_type, "date": data.date,
           "description": data.description, "color": data.color or "#64748b",
           "source_id": None, "source_type": None, "is_manual": True,
           "created_at": n.isoformat()}
    await db.calendar_events.insert_one(doc)
    doc.pop("_id", None)  # Remove MongoDB _id before returning
    return doc

@calendar_router.delete("/events/{event_id}")
async def delete_calendar_event(event_id: str, ctx: dict = Depends(get_entity_access)):
    check_perm(ctx, "manage_calendar")
    await db.calendar_events.delete_one({"id": event_id, "entity_id": ctx["entity_id"]})
    return {"message": "Event deleted"}


# ==================== DASHBOARD ROUTES ====================
@dashboard_router.get("/unified")
async def unified_dashboard(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    entity_ids = [user.get("personal_entity_id")]
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(50)
    entity_ids.extend([eu["entity_id"] for eu in eus if eu["entity_id"] not in entity_ids])
    entity_ids = [e for e in entity_ids if e]

    accounts = await db.accounts.find({"entity_id": {"$in": entity_ids}, "owner_id": user_id}, {"_id": 0}).to_list(200)
    total_balance = sum(a.get("balance", 0) for a in accounts)

    debts = await db.debts.find({"entity_id": {"$in": entity_ids}, "owner_id": user_id, "is_active": True}, {"_id": 0}).to_list(200)
    total_debt = sum(d.get("current_balance", 0) for d in debts)

    holdings = await db.investment_holdings.find({"entity_id": {"$in": entity_ids}, "owner_id": user_id}, {"_id": 0}).to_list(200)
    total_investments = sum((h.get("current_price") or h.get("cost_basis", 0)) * h.get("quantity", 0) for h in holdings)

    income_sources = await db.income_sources.find({"entity_id": {"$in": entity_ids}, "owner_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    monthly_income = sum(i.get("amount", 0) for i in income_sources)

    expenses_list = await db.expenses.find({"entity_id": {"$in": entity_ids}, "owner_id": user_id, "is_active": True}, {"_id": 0}).to_list(200)
    monthly_expenses = sum(e.get("amount", 0) for e in expenses_list)

    n = now_dt()
    next_7 = (n + timedelta(days=7)).isoformat()
    next_30 = (n + timedelta(days=30)).isoformat()
    today = n.isoformat()[:10]

    upcoming_income = [{"name": i["name"], "amount": i["amount"], "date": i.get("next_pay_date")}
                       for i in income_sources if i.get("next_pay_date") and i["next_pay_date"] <= next_30]
    upcoming_expenses = [{"name": e["name"], "amount": e["amount"], "date": e.get("next_due_date")}
                         for e in expenses_list if e.get("next_due_date") and e["next_due_date"] <= next_30]
    upcoming_debts = [{"name": d["name"], "amount": d.get("minimum_payment", 0), "date": d.get("due_date")}
                      for d in debts if d.get("due_date") and d["due_date"] <= next_30]

    savings = await db.savings_funds.find({"entity_id": {"$in": entity_ids}, "owner_id": user_id, "is_active": True}, {"_id": 0}).to_list(50)
    total_savings_target = sum(s.get("target_amount", 0) for s in savings)
    total_savings_current = sum(s.get("current_amount", 0) for s in savings)

    recent_txns = await db.transactions.find(
        {"entity_id": {"$in": entity_ids}, "owner_id": user_id}, {"_id": 0}
    ).sort("date", -1).to_list(10)

    month_start = n.replace(day=1).isoformat()
    month_txns = await db.transactions.find(
        {"entity_id": {"$in": entity_ids}, "owner_id": user_id,
         "date": {"$gte": month_start}}, {"_id": 0}
    ).to_list(500)
    actual_income = sum(t["amount"] for t in month_txns if t.get("transaction_type") == "income")
    actual_expenses = sum(t["amount"] for t in month_txns if t.get("transaction_type") in ("expense", "debt_payment"))

    return {
        "total_balance": total_balance,
        "total_debt": total_debt,
        "total_investments": total_investments,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "net_worth": total_balance + total_investments - total_debt,
        "upcoming_income": sorted(upcoming_income, key=lambda x: x.get("date", ""))[:5],
        "upcoming_expenses": sorted(upcoming_expenses, key=lambda x: x.get("date", ""))[:5],
        "upcoming_debts": sorted(upcoming_debts, key=lambda x: x.get("date", ""))[:5],
        "savings_target": total_savings_target,
        "savings_current": total_savings_current,
        "recent_transactions": recent_txns[:10],
        "actual_income_this_month": actual_income,
        "actual_expenses_this_month": actual_expenses,
        "entities_count": len(entity_ids),
        "accounts_count": len(accounts),
        "debts_count": len(debts),
    }

@dashboard_router.get("/entity/{entity_id}")
async def entity_dashboard(entity_id: str, user_id: str = Depends(get_current_user_id)):
    ctx = await _resolve_entity_access(entity_id, user_id)
    eid = entity_id
    uid = ctx["user_id"]
    accounts = await db.accounts.find({"entity_id": eid, "owner_id": uid}, {"_id": 0}).to_list(100)
    debts = await db.debts.find({"entity_id": eid, "owner_id": uid, "is_active": True}, {"_id": 0}).to_list(100)
    holdings = await db.investment_holdings.find({"entity_id": eid, "owner_id": uid}, {"_id": 0}).to_list(100)
    incomes = await db.income_sources.find({"entity_id": eid, "owner_id": uid, "is_active": True}, {"_id": 0}).to_list(50)
    expenses = await db.expenses.find({"entity_id": eid, "owner_id": uid, "is_active": True}, {"_id": 0}).to_list(100)

    n = now_dt()
    month_start = n.replace(day=1).isoformat()
    month_txns = await db.transactions.find(
        {"entity_id": eid, "owner_id": uid, "date": {"$gte": month_start}}, {"_id": 0}
    ).to_list(500)

    budget = await db.budgets.find_one(
        {"entity_id": eid, "owner_id": uid, "month": n.month, "year": n.year}, {"_id": 0}
    )

    actual_by_cat = {}
    for t in month_txns:
        if t.get("transaction_type") in ("expense", "debt_payment"):
            cid = t.get("category_id") or "uncategorized"
            actual_by_cat[cid] = actual_by_cat.get(cid, 0) + t["amount"]

    budget_summary = []
    if budget:
        for item in budget.get("items", []):
            cid = item.get("category_id", "")
            budget_summary.append({
                "category_id": cid,
                "category_name": item.get("category_name", ""),
                "planned": item.get("planned_amount", 0),
                "actual": actual_by_cat.get(cid, 0),
                "variance": item.get("planned_amount", 0) - actual_by_cat.get(cid, 0)
            })

    return {
        "total_balance": sum(a.get("balance", 0) for a in accounts),
        "total_debt": sum(d.get("current_balance", 0) for d in debts),
        "total_investments": sum((h.get("current_price") or h.get("cost_basis", 0)) * h.get("quantity", 0) for h in holdings),
        "monthly_income": sum(i.get("amount", 0) for i in incomes),
        "monthly_expenses": sum(e.get("amount", 0) for e in expenses),
        "actual_income": sum(t["amount"] for t in month_txns if t.get("transaction_type") == "income"),
        "actual_expenses": sum(t["amount"] for t in month_txns if t.get("transaction_type") in ("expense", "debt_payment")),
        "budget_summary": budget_summary,
        "accounts": len(accounts),
        "debts_list": [{"name": d["name"], "balance": d["current_balance"], "type": d["debt_type"]} for d in debts[:5]],
    }


# ==================== ONBOARDING ROUTES ====================
@onboarding_router.post("/complete")
async def complete_onboarding(user_id: str = Depends(get_current_user_id)):
    await db.users.update_one({"id": user_id}, {"$set": {"onboarding_complete": True}})
    return {"message": "Onboarding complete"}


# ==================== HELPERS ====================
def _advance_date(date_str, frequency):
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00')) if isinstance(date_str, str) else date_str
        if frequency == "weekly":
            dt += timedelta(weeks=1)
        elif frequency == "biweekly":
            dt += timedelta(weeks=2)
        elif frequency == "semimonthly":
            dt += timedelta(days=15)
        elif frequency == "monthly":
            dt += relativedelta(months=1)
        elif frequency == "quarterly":
            dt += relativedelta(months=3)
        elif frequency == "yearly":
            dt += relativedelta(years=1)
        else:
            dt += relativedelta(months=1)
        return dt.isoformat()
    except Exception:
        return date_str


# ==================== CORE ROUTES ====================
@api_router.get("/")
async def root():
    return {"message": "Welcome to BlackieFi 3.0", "version": "3.0.0"}

@api_router.get("/health", response_model=HealthCheck)
async def health():
    return HealthCheck(service="core")


# ==================== STARTUP ====================
@app.on_event("startup")
async def startup():
    for role_name, perms in DEFAULT_ROLE_PERMISSIONS.items():
        existing = await db.roles.find_one({"name": role_name, "entity_id": None})
        if not existing:
            display = role_name.replace("_", " ").title()
            await db.roles.insert_one({
                "id": new_id(), "name": role_name, "display_name": display,
                "permissions": perms, "entity_id": None, "is_default": True,
                "created_at": now_str(), "updated_at": now_str()
            })
    for cat in DEFAULT_CATEGORIES:
        existing = await db.categories.find_one({"name": cat["name"], "entity_id": None})
        if not existing:
            await db.categories.insert_one({
                "id": new_id(), "name": cat["name"], "icon": cat["icon"],
                "color": cat["color"], "entity_id": None, "is_default": True,
                "created_at": now_str()
            })

    demo_email = "demo@blackiefi.com"
    demo = await db.users.find_one({"email": demo_email})
    if not demo:
        uid = new_id()
        eid = new_id()
        n = now_dt()
        hashed = hash_password("Demo123!")
        await db.users.insert_one({
            "id": uid, "email": demo_email, "full_name": "Demo User",
            "phone": None, "hashed_password": hashed, "is_active": True,
            "is_admin": False, "personal_entity_id": eid,
            "onboarding_complete": True, "created_at": n.isoformat(), "updated_at": n.isoformat()
        })
        await db.entities.insert_one({
            "id": eid, "name": "Demo User's Personal", "entity_type": "personal",
            "business_type": None, "jurisdiction": None, "description": "Personal finance",
            "owner_id": uid, "status": "active", "is_personal": True,
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })
        admin_role = await db.roles.find_one({"name": "admin", "entity_id": None}, {"_id": 0})
        if admin_role:
            await db.entity_users.insert_one({
                "id": new_id(), "entity_id": eid, "user_id": uid,
                "role_id": admin_role["id"], "is_active": True,
                "invited_by": uid, "created_at": n.isoformat()
            })
        checking_id = new_id()
        savings_id = new_id()
        cc_id = new_id()
        for acc in [
            {"id": checking_id, "name": "Chase Checking", "account_type": "checking", "institution": "Chase", "balance": 5420.50, "currency": "USD"},
            {"id": savings_id, "name": "Marcus Savings", "account_type": "savings", "institution": "Goldman Sachs", "balance": 15000.00, "currency": "USD"},
            {"id": cc_id, "name": "Amex Credit Card", "account_type": "credit_card", "institution": "American Express", "balance": -2340.00, "currency": "USD"},
        ]:
            await db.accounts.insert_one({**acc, "owner_id": uid, "entity_id": eid,
                                           "created_at": n.isoformat(), "updated_at": n.isoformat()})

        cats = await db.categories.find({"entity_id": None}, {"_id": 0}).to_list(20)
        cat_map = {c["name"]: c["id"] for c in cats}

        d15 = (n.replace(day=15) if n.day < 15 else n.replace(day=15) + relativedelta(months=1)).isoformat()
        d1 = (n.replace(day=1) + relativedelta(months=1)).isoformat()

        await db.income_sources.insert_one({
            "id": new_id(), "entity_id": eid, "owner_id": uid, "name": "Employer Salary",
            "income_type": "salary", "amount": 6500.00, "is_variable": False,
            "frequency": "biweekly", "next_pay_date": d15,
            "account_id": checking_id, "is_active": True,
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })
        await db.income_sources.insert_one({
            "id": new_id(), "entity_id": eid, "owner_id": uid, "name": "Freelance Gigs",
            "income_type": "freelance", "amount": 1200.00, "is_variable": True,
            "frequency": "monthly", "next_pay_date": d1,
            "account_id": checking_id, "is_active": True,
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })

        for exp in [
            {"name": "Rent", "amount": 2200.00, "frequency": "monthly", "category": "Home", "recurring": True},
            {"name": "Car Insurance", "amount": 180.00, "frequency": "monthly", "category": "Vehicle", "recurring": True},
            {"name": "Netflix", "amount": 15.99, "frequency": "monthly", "category": "Subscriptions", "recurring": True},
            {"name": "Gym Membership", "amount": 49.99, "frequency": "monthly", "category": "Healthcare", "recurring": True},
            {"name": "Groceries", "amount": 600.00, "frequency": "monthly", "category": "Food & Dining", "recurring": True},
        ]:
            await db.expenses.insert_one({
                "id": new_id(), "entity_id": eid, "owner_id": uid,
                "name": exp["name"], "description": None, "amount": exp["amount"],
                "is_variable": False, "is_recurring": exp["recurring"],
                "frequency": exp["frequency"], "next_due_date": d1,
                "category_id": cat_map.get(exp["category"]), "account_id": checking_id,
                "is_active": True, "created_at": n.isoformat(), "updated_at": n.isoformat()
            })

        await db.debts.insert_one({
            "id": new_id(), "entity_id": eid, "owner_id": uid,
            "name": "Auto Loan", "debt_type": "loan", "original_amount": 28000.00,
            "current_balance": 18500.00, "interest_rate": 4.5,
            "minimum_payment": 450.00, "due_date": d15, "frequency": "monthly",
            "account_id": checking_id, "is_active": True,
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })
        await db.debts.insert_one({
            "id": new_id(), "entity_id": eid, "owner_id": uid,
            "name": "Credit Card Balance", "debt_type": "credit_card", "original_amount": 5000.00,
            "current_balance": 2340.00, "interest_rate": 19.9,
            "minimum_payment": 75.00, "due_date": d1, "frequency": "monthly",
            "account_id": cc_id, "is_active": True,
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })

        veh_id = new_id()
        await db.investment_vehicles.insert_one({
            "id": veh_id, "entity_id": eid, "owner_id": uid,
            "name": "Fidelity 401(k)", "vehicle_type": "401k", "provider": "Fidelity",
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })
        for hold in [
            {"asset_name": "AAPL", "quantity": 15, "cost_basis": 142.50, "current_price": 178.30},
            {"asset_name": "VTI", "quantity": 50, "cost_basis": 195.00, "current_price": 228.40},
        ]:
            await db.investment_holdings.insert_one({
                "id": new_id(), "vehicle_id": veh_id, "entity_id": eid, "owner_id": uid,
                **hold, "created_at": n.isoformat(), "updated_at": n.isoformat()
            })

        await db.savings_funds.insert_one({
            "id": new_id(), "entity_id": eid, "owner_id": uid,
            "name": "Vacation Fund", "target_amount": 5000.00, "current_amount": 1850.00,
            "target_date": (n + relativedelta(months=6)).isoformat(),
            "is_active": True, "created_at": n.isoformat(), "updated_at": n.isoformat()
        })

        budget_items = [
            {"category_id": cat_map.get("Home", ""), "category_name": "Home", "planned_amount": 2200},
            {"category_id": cat_map.get("Food & Dining", ""), "category_name": "Food & Dining", "planned_amount": 700},
            {"category_id": cat_map.get("Vehicle", ""), "category_name": "Vehicle", "planned_amount": 650},
            {"category_id": cat_map.get("Entertainment", ""), "category_name": "Entertainment", "planned_amount": 200},
            {"category_id": cat_map.get("Utilities", ""), "category_name": "Utilities", "planned_amount": 250},
            {"category_id": cat_map.get("Savings", ""), "category_name": "Savings", "planned_amount": 500},
        ]
        await db.budgets.insert_one({
            "id": new_id(), "entity_id": eid, "owner_id": uid,
            "month": n.month, "year": n.year, "items": budget_items,
            "created_at": n.isoformat(), "updated_at": n.isoformat()
        })

        logger.info("Demo user seeded: demo@blackiefi.com / Demo123!")


# ==================== REGISTER ROUTERS ====================
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(entities_router)
app.include_router(roles_router)
app.include_router(accounts_router)
app.include_router(income_router)
app.include_router(expenses_router)
app.include_router(debts_router)
app.include_router(transactions_router)
app.include_router(vehicles_router)
app.include_router(holdings_router)
app.include_router(budgets_router)
app.include_router(categories_router)
app.include_router(savings_router)
app.include_router(calendar_router)
app.include_router(dashboard_router)
app.include_router(onboarding_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
