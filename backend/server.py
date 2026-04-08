"""
================================================================================
DEPRECATED - PREVIEW ENVIRONMENT ONLY
================================================================================
This monolithic server.py is DEPRECATED and maintained solely for the Emergent 
preview environment (supervisor-managed). 

For production deployments, use the microservices architecture:
  - /app/services/auth/main.py      -> Auth Service (Port 8001)
  - /app/services/core/main.py      -> Core Service (Port 8002)  
  - /app/services/entity/main.py    -> Entity Service (Port 8003)
  - /app/services/portfolio/main.py -> Portfolio Service (Port 8004)
  - /app/services/assets/main.py    -> Assets Service (Port 8005)
  - /app/services/gateway-app/      -> Node.js Gateway (Port 8000)
  - /app/infrastructure/nginx.conf  -> Nginx Edge Gateway (Port 8080)

To run production: docker-compose up -d
================================================================================
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from passlib.context import CryptContext
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import os, logging, uuid, jwt, math, secrets, hashlib, json, csv, io, base64, asyncio
from pathlib import Path
import httpx
import pyotp
import qrcode

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'blackiefi-super-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(
    title="BlackieFi API", 
    version="3.0.0",
    description="DEPRECATED: Preview-only monolith. Use docker-compose for production microservices."
)
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

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class DebtPayoffRequest(BaseModel):
    extra_monthly: float = 0.0
    strategy: str = "avalanche"


# ==================== NEW FEATURE MODELS ====================
class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    uri: str

class MFAVerifyRequest(BaseModel):
    code: str

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "info"
    link: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    link: Optional[str] = None
    read: bool = False
    created_at: str

class AISettingsUpdate(BaseModel):
    ai_enabled: bool = False
    ollama_model: str = "phi"

class AIChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

class CurrencySettingsUpdate(BaseModel):
    base_currency: str = "USD"
    display_currencies: List[str] = ["USD", "EUR", "GBP"]

class RAGUploadResponse(BaseModel):
    id: str
    filename: str
    status: str

class RAGQueryRequest(BaseModel):
    question: str

EXCHANGE_RATES = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.50, "CAD": 1.36,
    "AUD": 1.53, "CHF": 0.88, "CNY": 7.24, "INR": 83.12, "MXN": 17.15,
    "BRL": 4.97, "KRW": 1320.0, "SGD": 1.34, "HKD": 7.82, "NOK": 10.55,
    "SEK": 10.42, "DKK": 6.87, "NZD": 1.64, "ZAR": 18.63, "TRY": 30.25,
    "RUB": 89.50, "PLN": 4.02, "THB": 35.20, "IDR": 15450.0, "PHP": 55.80,
    "CZK": 22.85, "ILS": 3.65, "CLP": 880.0, "AED": 3.67, "SAR": 3.75,
    "NGN": 780.0, "EGP": 30.90, "BTC": 0.000016, "ETH": 0.00032,
}

SUPPORTED_CURRENCIES = list(EXCHANGE_RATES.keys())
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
ai_router = APIRouter(prefix="/api/ai", tags=["ai"])
notifications_router = APIRouter(prefix="/api/notifications", tags=["notifications"])
data_router = APIRouter(prefix="/api/data", tags=["data"])
currency_router = APIRouter(prefix="/api/currency", tags=["currency"])
rag_router = APIRouter(prefix="/api/rag", tags=["rag"])


# ==================== WEBSOCKET MANAGER ====================
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active:
            self.active[user_id] = []
        self.active[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            self.active[user_id] = [ws for ws in self.active[user_id] if ws != websocket]
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active:
            dead = []
            for ws in self.active[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws, user_id)

ws_manager = ConnectionManager()


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
    if user.get("mfa_enabled"):
        return {"mfa_required": True, "email": user["email"], "message": "MFA code required"}
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


# ==================== PASSWORD RESET ROUTES ====================
@auth_router.post("/password-reset/request")
async def request_password_reset(req: PasswordResetRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = (now_dt() + timedelta(hours=1)).isoformat()
    await db.password_resets.delete_many({"user_id": user["id"]})
    await db.password_resets.insert_one({
        "id": new_id(), "user_id": user["id"], "token_hash": token_hash,
        "expires_at": expires, "used": False, "created_at": now_str()
    })
    logger.info(f"Password reset token for {req.email}: {token}")
    return {"message": "If that email exists, a reset link has been sent.", "reset_token": token}

@auth_router.post("/password-reset/confirm")
async def confirm_password_reset(req: PasswordResetConfirm):
    token_hash = hashlib.sha256(req.token.encode()).hexdigest()
    reset = await db.password_resets.find_one({"token_hash": token_hash, "used": False}, {"_id": 0})
    if not reset:
        raise HTTPException(400, "Invalid or expired reset token")
    if reset.get("expires_at", "") < now_str():
        raise HTTPException(400, "Reset token has expired")
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    await db.users.update_one(
        {"id": reset["user_id"]},
        {"$set": {"hashed_password": hash_password(req.new_password), "updated_at": now_str()}}
    )
    await db.password_resets.update_one({"id": reset["id"]}, {"$set": {"used": True}})
    return {"message": "Password has been reset successfully"}

@auth_router.post("/password-change")
async def change_password(req: PasswordChangeRequest, user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not verify_password(req.current_password, user["hashed_password"]):
        raise HTTPException(400, "Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"hashed_password": hash_password(req.new_password), "updated_at": now_str()}}
    )
    return {"message": "Password changed successfully"}


# ==================== ENHANCED TRANSACTIONS ROUTES ====================
@transactions_router.get("/search")
async def search_transactions(
    q: Optional[str] = Query(None, alias="search"),
    transaction_type: Optional[str] = None,
    category_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    sort_by: str = Query("date", regex="^(date|amount|description)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    ctx: dict = Depends(get_entity_access),
):
    query = {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"]}
    if transaction_type:
        query["transaction_type"] = transaction_type
    if category_id:
        query["category_id"] = category_id
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    if min_amount is not None or max_amount is not None:
        query["amount"] = {}
        if min_amount is not None:
            query["amount"]["$gte"] = min_amount
        if max_amount is not None:
            query["amount"]["$lte"] = max_amount
    if q:
        query["description"] = {"$regex": q, "$options": "i"}

    direction = 1 if sort_order == "asc" else -1
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * page_size
    items = await db.transactions.find(query, {"_id": 0}).sort(sort_by, direction).skip(skip).limit(page_size).to_list(page_size)

    total_income = 0
    total_expense = 0
    all_for_summary = await db.transactions.find(query, {"_id": 0, "transaction_type": 1, "amount": 1}).to_list(5000)
    for t in all_for_summary:
        if t.get("transaction_type") == "income":
            total_income += t.get("amount", 0)
        else:
            total_expense += t.get("amount", 0)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 0,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expense,
            "net": total_income - total_expense,
            "count": total,
        },
    }


# ==================== DEBT PAYOFF ESTIMATOR ====================
@debts_router.post("/payoff-estimate")
async def debt_payoff_estimate(req: DebtPayoffRequest, ctx: dict = Depends(get_entity_access)):
    debts = await db.debts.find(
        {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"], "is_active": True}, {"_id": 0}
    ).to_list(100)
    if not debts:
        return {"debts": [], "total_interest": 0, "total_months": 0, "total_paid": 0}

    strategy = req.strategy
    extra = req.extra_monthly

    results = []
    for debt in debts:
        balance = debt.get("current_balance", 0)
        rate = debt.get("interest_rate", 0) / 100 / 12
        min_pay = debt.get("minimum_payment") or (balance * 0.02 if balance > 0 else 0)
        min_pay = max(min_pay, 25)

        schedule = _amortize(balance, rate, min_pay, 0)
        results.append({
            "id": debt["id"],
            "name": debt["name"],
            "debt_type": debt["debt_type"],
            "current_balance": balance,
            "interest_rate": debt.get("interest_rate", 0),
            "minimum_payment": round(min_pay, 2),
            "months_to_payoff": schedule["months"],
            "total_interest": round(schedule["total_interest"], 2),
            "total_paid": round(schedule["total_paid"], 2),
            "payoff_date": schedule["payoff_date"],
            "schedule": schedule["monthly"][:60],
        })

    if strategy == "avalanche":
        sorted_debts = sorted(results, key=lambda d: -d["interest_rate"])
    else:
        sorted_debts = sorted(results, key=lambda d: d["current_balance"])

    accelerated = []
    remaining_extra = extra
    debt_balances = {d["id"]: d["current_balance"] for d in sorted_debts}
    debt_rates = {d["id"]: d["interest_rate"] / 100 / 12 for d in sorted_debts}
    debt_minpay = {d["id"]: d["minimum_payment"] for d in sorted_debts}
    order = [d["id"] for d in sorted_debts]

    max_months = 360
    month = 0
    total_interest_accel = 0
    total_paid_accel = 0
    per_debt_accel = {did: {"months": 0, "interest": 0, "paid": 0, "schedule": []} for did in order}

    while any(debt_balances[d] > 0.01 for d in order) and month < max_months:
        month += 1
        leftover = remaining_extra
        for did in order:
            bal = debt_balances[did]
            if bal <= 0.01:
                continue
            rate = debt_rates[did]
            interest = bal * rate
            total_interest_accel += interest
            per_debt_accel[did]["interest"] += interest
            payment = min(debt_minpay[did], bal + interest)
            bal_after_interest = bal + interest
            payment = min(payment + leftover, bal_after_interest)
            leftover = max(0, (debt_minpay[did] + leftover) - payment) if leftover > 0 else 0
            new_bal = max(0, bal_after_interest - payment)
            total_paid_accel += payment
            per_debt_accel[did]["paid"] += payment
            debt_balances[did] = new_bal
            if len(per_debt_accel[did]["schedule"]) < 60:
                per_debt_accel[did]["schedule"].append({
                    "month": month,
                    "payment": round(payment, 2),
                    "interest": round(interest, 2),
                    "principal": round(payment - interest, 2),
                    "balance": round(new_bal, 2),
                })
            if new_bal <= 0.01:
                per_debt_accel[did]["months"] = month
                leftover += debt_minpay[did]

    for did in order:
        if per_debt_accel[did]["months"] == 0 and debt_balances[did] <= 0.01:
            per_debt_accel[did]["months"] = month

    n = now_dt()
    for r in results:
        accel = per_debt_accel[r["id"]]
        payoff = n + relativedelta(months=accel["months"])
        r["accelerated"] = {
            "months_to_payoff": accel["months"],
            "total_interest": round(accel["interest"], 2),
            "total_paid": round(accel["paid"], 2),
            "payoff_date": payoff.isoformat(),
            "schedule": accel["schedule"],
            "months_saved": r["months_to_payoff"] - accel["months"],
            "interest_saved": round(r["total_interest"] - accel["interest"], 2),
        }

    original_total_interest = sum(r["total_interest"] for r in results)
    original_total_months = max((r["months_to_payoff"] for r in results), default=0)
    accel_total_months = max((r["accelerated"]["months_to_payoff"] for r in results), default=0)

    return {
        "strategy": strategy,
        "extra_monthly": extra,
        "debts": results,
        "summary": {
            "original_total_interest": round(original_total_interest, 2),
            "original_total_months": original_total_months,
            "accelerated_total_interest": round(total_interest_accel, 2),
            "accelerated_total_months": accel_total_months,
            "total_interest_saved": round(original_total_interest - total_interest_accel, 2),
            "total_months_saved": original_total_months - accel_total_months,
        },
    }


def _amortize(balance, monthly_rate, payment, extra=0):
    months = 0
    total_interest = 0
    total_paid = 0
    schedule = []
    bal = balance
    n = now_dt()
    while bal > 0.01 and months < 360:
        months += 1
        interest = bal * monthly_rate
        total_interest += interest
        pay = min(payment + extra, bal + interest)
        total_paid += pay
        bal = max(0, bal + interest - pay)
        if len(schedule) < 60:
            schedule.append({
                "month": months, "payment": round(pay, 2),
                "interest": round(interest, 2), "principal": round(pay - interest, 2),
                "balance": round(bal, 2),
            })
    payoff = n + relativedelta(months=months)
    return {"months": months, "total_interest": total_interest, "total_paid": total_paid,
            "payoff_date": payoff.isoformat(), "monthly": schedule}


# ==================== BUDGET VARIANCE REPORTING ====================
@budgets_router.get("/variance")
async def budget_variance_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    months_back: int = Query(6, ge=1, le=24),
    ctx: dict = Depends(get_entity_access),
):
    n = now_dt()
    target_month = month or n.month
    target_year = year or n.year

    reports = []
    for i in range(months_back):
        dt = datetime(target_year, target_month, 1, tzinfo=timezone.utc) - relativedelta(months=i)
        m, y = dt.month, dt.year
        budget = await db.budgets.find_one(
            {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"], "month": m, "year": y}, {"_id": 0}
        )
        month_start = dt.isoformat()
        month_end = (dt + relativedelta(months=1) - timedelta(seconds=1)).isoformat()
        txns = await db.transactions.find(
            {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
             "date": {"$gte": month_start, "$lte": month_end},
             "transaction_type": {"$in": ["expense", "debt_payment"]}},
            {"_id": 0}
        ).to_list(1000)

        actual_by_cat = {}
        total_actual = 0
        for t in txns:
            cid = t.get("category_id") or "uncategorized"
            actual_by_cat[cid] = actual_by_cat.get(cid, 0) + t.get("amount", 0)
            total_actual += t.get("amount", 0)

        income_txns = await db.transactions.find(
            {"entity_id": ctx["entity_id"], "owner_id": ctx["user_id"],
             "date": {"$gte": month_start, "$lte": month_end},
             "transaction_type": "income"},
            {"_id": 0}
        ).to_list(1000)
        total_income = sum(t.get("amount", 0) for t in income_txns)

        categories = []
        total_planned = 0
        if budget:
            for item in budget.get("items", []):
                cid = item.get("category_id", "")
                planned = item.get("planned_amount", 0)
                actual = actual_by_cat.pop(cid, 0)
                total_planned += planned
                variance = planned - actual
                pct = (actual / planned * 100) if planned > 0 else (100 if actual > 0 else 0)
                categories.append({
                    "category_id": cid,
                    "category_name": item.get("category_name", "Other"),
                    "planned": round(planned, 2),
                    "actual": round(actual, 2),
                    "variance": round(variance, 2),
                    "utilization_pct": round(pct, 1),
                    "status": "over" if actual > planned else ("warning" if pct > 80 else "on_track"),
                })

        for cid, actual in actual_by_cat.items():
            if actual > 0:
                cat = await db.categories.find_one({"id": cid}, {"_id": 0})
                categories.append({
                    "category_id": cid,
                    "category_name": cat.get("name", "Uncategorized") if cat else "Uncategorized",
                    "planned": 0, "actual": round(actual, 2),
                    "variance": round(-actual, 2), "utilization_pct": 100,
                    "status": "unbudgeted",
                })

        reports.append({
            "month": m, "year": y,
            "month_name": dt.strftime("%B"),
            "has_budget": budget is not None,
            "total_planned": round(total_planned, 2),
            "total_actual": round(total_actual, 2),
            "total_variance": round(total_planned - total_actual, 2),
            "total_income": round(total_income, 2),
            "savings_rate": round(((total_income - total_actual) / total_income * 100) if total_income > 0 else 0, 1),
            "categories": categories,
        })

    return {
        "reports": reports,
        "trend": {
            "months": [r["month_name"][:3] for r in reversed(reports)],
            "planned": [r["total_planned"] for r in reversed(reports)],
            "actual": [r["total_actual"] for r in reversed(reports)],
            "income": [r["total_income"] for r in reversed(reports)],
        },
    }


# ==================== MFA ROUTES ====================
@auth_router.get("/mfa/status")
async def mfa_status(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "mfa_enabled": 1})
    return {"mfa_enabled": user.get("mfa_enabled", False) if user else False}

@auth_router.post("/mfa/setup")
async def mfa_setup(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA already enabled")
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user["email"], issuer_name="BlackieFi")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    await db.users.update_one({"id": user_id}, {"$set": {"mfa_secret": secret}})
    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_b64}", "uri": uri}

@auth_router.post("/mfa/verify")
async def mfa_verify(req: MFAVerifyRequest, user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("mfa_secret"):
        raise HTTPException(status_code=400, detail="MFA not set up")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user_id}, {"$set": {"mfa_enabled": True}})
    return {"status": "ok", "message": "MFA enabled successfully"}

@auth_router.post("/mfa/disable")
async def mfa_disable(req: MFAVerifyRequest, user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA not enabled")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user_id}, {"$set": {"mfa_enabled": False}, "$unset": {"mfa_secret": ""}})
    return {"status": "ok", "message": "MFA disabled"}

@auth_router.post("/mfa/validate")
async def mfa_validate_login(req: MFAVerifyRequest, email: str = Query(...)):
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("mfa_enabled") or not user.get("mfa_secret"):
        raise HTTPException(status_code=400, detail="MFA not configured")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    token = create_access_token(user["id"])
    u = {k: user.get(k) for k in ["id","email","full_name","role","onboarding_complete","personal_entity_id"]}
    return {"access_token": token, "user": u}


# ==================== AI ROUTES ====================
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "localhost")
OLLAMA_PORT = os.environ.get("OLLAMA_PORT", "11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "phi")
OLLAMA_URL = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}"

async def _ollama_available():
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False

async def _ollama_generate(prompt, model=None):
    model = model or OLLAMA_MODEL
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{OLLAMA_URL}/api/generate", json={"model": model, "prompt": prompt, "stream": False})
            if r.status_code == 200:
                return r.json().get("response", "")
    except Exception as e:
        logger.warning(f"Ollama call failed: {e}")
    return None

@ai_router.get("/settings")
async def get_ai_settings(user_id: str = Depends(get_current_user_id)):
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    ai_enabled = settings.get("ai_enabled", False) if settings else False
    ai_model = settings.get("ai_model", OLLAMA_MODEL) if settings else OLLAMA_MODEL
    available = await _ollama_available()
    return {"ai_enabled": ai_enabled, "ai_model": ai_model, "ai_available": available}

@ai_router.put("/settings")
async def update_ai_settings(data: AISettingsUpdate, user_id: str = Depends(get_current_user_id)):
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {"ai_enabled": data.ai_enabled, "ai_model": data.ollama_model, "updated_at": now_str()}},
        upsert=True
    )
    return {"status": "ok"}

@ai_router.post("/chat")
async def ai_chat(req: AIChatRequest, user_id: str = Depends(get_current_user_id)):
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings or not settings.get("ai_enabled"):
        raise HTTPException(status_code=400, detail="AI features are disabled. Enable in Settings.")
    if not await _ollama_available():
        raise HTTPException(status_code=503, detail="AI service unavailable")
    entity_id = None
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if eus:
        entity_id = eus[0]["entity_id"]
    ctx_parts = []
    if entity_id:
        accounts = await db.accounts.find({"entity_id": entity_id}, {"_id": 0}).to_list(20)
        if accounts:
            ctx_parts.append("Accounts: " + ", ".join(f'{a["name"]}({a["type"]}): ${a["balance"]}' for a in accounts))
        expenses = await db.expenses.find({"entity_id": entity_id}, {"_id": 0}).to_list(20)
        if expenses:
            total_exp = sum(e["amount"] for e in expenses)
            ctx_parts.append(f"Total monthly expenses: ${total_exp:.2f}")
        debts = await db.debts.find({"entity_id": entity_id}, {"_id": 0}).to_list(20)
        if debts:
            total_debt = sum(d["current_balance"] for d in debts)
            ctx_parts.append(f"Total debt: ${total_debt:.2f}")
    context_str = ". ".join(ctx_parts) if ctx_parts else "No financial data available yet."
    prompt = f"""You are BlackieFi AI, a helpful financial assistant. Be concise and practical.
User's financial context: {context_str}
{f'Additional context: {req.context}' if req.context else ''}
User question: {req.message}
Provide a clear, actionable response:"""
    response = await _ollama_generate(prompt, settings.get("ai_model"))
    if not response:
        raise HTTPException(status_code=503, detail="AI generation failed")
    msg_id = new_id()
    await db.ai_messages.insert_one({
        "id": msg_id, "user_id": user_id, "role": "user", "content": req.message, "created_at": now_str()
    })
    await db.ai_messages.insert_one({
        "id": new_id(), "user_id": user_id, "role": "assistant", "content": response, "created_at": now_str()
    })
    return {"response": response, "message_id": msg_id}

@ai_router.get("/history")
async def ai_history(limit: int = 50, user_id: str = Depends(get_current_user_id)):
    msgs = await db.ai_messages.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return list(reversed(msgs))

@ai_router.post("/insights")
async def ai_insights(user_id: str = Depends(get_current_user_id)):
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings or not settings.get("ai_enabled"):
        raise HTTPException(status_code=400, detail="AI features are disabled")
    if not await _ollama_available():
        raise HTTPException(status_code=503, detail="AI service unavailable")
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    entity_id = eus[0]["entity_id"] if eus else None
    data_summary = []
    if entity_id:
        accounts = await db.accounts.find({"entity_id": entity_id}, {"_id": 0}).to_list(50)
        expenses = await db.expenses.find({"entity_id": entity_id}, {"_id": 0}).to_list(50)
        income = await db.income_sources.find({"entity_id": entity_id}, {"_id": 0}).to_list(50)
        debts = await db.debts.find({"entity_id": entity_id}, {"_id": 0}).to_list(50)
        total_balance = sum(a.get("balance", 0) for a in accounts)
        total_expense = sum(e.get("amount", 0) for e in expenses)
        total_income = sum(i.get("amount", 0) for i in income)
        total_debt = sum(d.get("current_balance", 0) for d in debts)
        data_summary.append(f"Total account balance: ${total_balance:.2f}")
        data_summary.append(f"Monthly income: ${total_income:.2f}")
        data_summary.append(f"Monthly expenses: ${total_expense:.2f}")
        data_summary.append(f"Total debt: ${total_debt:.2f}")
        savings_rate = ((total_income - total_expense) / total_income * 100) if total_income > 0 else 0
        data_summary.append(f"Savings rate: {savings_rate:.1f}%")
    prompt = f"""Analyze this financial data and provide 3-5 actionable insights. Be specific and practical.
Financial Summary: {'; '.join(data_summary) if data_summary else 'No data available'}
Format as numbered list. Each insight should be 1-2 sentences."""
    response = await _ollama_generate(prompt)
    if not response:
        raise HTTPException(status_code=503, detail="AI generation failed")
    return {"insights": response, "generated_at": now_str()}

@ai_router.post("/categorize")
async def ai_categorize(description: str = Query(...), amount: float = Query(0), user_id: str = Depends(get_current_user_id)):
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings or not settings.get("ai_enabled"):
        raise HTTPException(status_code=400, detail="AI features are disabled")
    if not await _ollama_available():
        return {"category": "Other", "confidence": 0, "ai_available": False}
    prompt = f"""Categorize this financial transaction into exactly one category.
Transaction: "{description}", Amount: ${amount}
Categories: Housing, Transportation, Food, Utilities, Insurance, Healthcare, Entertainment, Shopping, Education, Personal, Savings, Debt, Income, Other
Respond with ONLY the category name, nothing else."""
    response = await _ollama_generate(prompt)
    cat = (response or "Other").strip().split("\n")[0].strip()
    return {"category": cat, "confidence": 0.8 if response else 0, "ai_available": True}


# ==================== NOTIFICATION ROUTES ====================
async def _create_notification(user_id, title, message, ntype="info", link=None):
    nid = new_id()
    doc = {
        "id": nid, "user_id": user_id, "title": title, "message": message,
        "notification_type": ntype, "link": link, "read": False, "created_at": now_str()
    }
    await db.notifications.insert_one(doc)
    await ws_manager.send_to_user(user_id, {"type": "notification", "data": {k: doc[k] for k in doc if k != "_id"}})
    return nid

@notifications_router.get("/")
async def list_notifications(unread_only: bool = False, limit: int = 50, user_id: str = Depends(get_current_user_id)):
    q = {"user_id": user_id}
    if unread_only:
        q["read"] = False
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items

@notifications_router.get("/unread-count")
async def unread_count(user_id: str = Depends(get_current_user_id)):
    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"count": count}

@notifications_router.put("/{nid}/read")
async def mark_read(nid: str, user_id: str = Depends(get_current_user_id)):
    await db.notifications.update_one({"id": nid, "user_id": user_id}, {"$set": {"read": True}})
    return {"status": "ok"}

@notifications_router.put("/read-all")
async def mark_all_read(user_id: str = Depends(get_current_user_id)):
    await db.notifications.update_many({"user_id": user_id, "read": False}, {"$set": {"read": True}})
    return {"status": "ok"}

@notifications_router.delete("/{nid}")
async def delete_notification(nid: str, user_id: str = Depends(get_current_user_id)):
    await db.notifications.delete_one({"id": nid, "user_id": user_id})
    return {"status": "ok"}

@notifications_router.get("/upcoming")
async def upcoming_reminders(days: int = 7, user_id: str = Depends(get_current_user_id)):
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    entity_ids = [eu["entity_id"] for eu in eus]
    upcoming = []
    for eid in entity_ids:
        expenses = await db.expenses.find({"entity_id": eid, "is_recurring": True}, {"_id": 0}).to_list(100)
        for exp in expenses:
            ndate = exp.get("next_date")
            if ndate:
                try:
                    nd = datetime.fromisoformat(ndate.replace("Z", "+00:00")) if isinstance(ndate, str) else ndate
                    if nd <= now_dt() + timedelta(days=days):
                        upcoming.append({"type": "expense", "name": exp["name"], "amount": exp["amount"],
                                        "date": ndate, "entity_id": eid})
                except Exception:
                    pass
        debts = await db.debts.find({"entity_id": eid}, {"_id": 0}).to_list(100)
        for debt in debts:
            upcoming.append({"type": "debt_payment", "name": debt["name"],
                            "amount": debt.get("min_payment", 0), "entity_id": eid})
    return upcoming


# ==================== DATA IMPORT / EXPORT ROUTES ====================
@data_router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), data_type: str = Query("transactions"), user_id: str = Depends(get_current_user_id)):
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if not eus:
        raise HTTPException(status_code=400, detail="No active entity")
    entity_id = eus[0]["entity_id"]
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty")
    imported = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            if data_type == "transactions":
                doc = {
                    "id": new_id(), "entity_id": entity_id,
                    "amount": float(row.get("amount", row.get("Amount", 0))),
                    "type": row.get("type", row.get("Type", "expense")),
                    "category": row.get("category", row.get("Category", "Other")),
                    "description": row.get("description", row.get("Description", "")),
                    "date": row.get("date", row.get("Date", now_str())),
                    "account_id": row.get("account_id", ""),
                    "created_at": now_str(),
                }
                await db.transactions.insert_one(doc)
                imported += 1
            elif data_type == "expenses":
                doc = {
                    "id": new_id(), "entity_id": entity_id,
                    "name": row.get("name", row.get("Name", "Imported")),
                    "amount": float(row.get("amount", row.get("Amount", 0))),
                    "category": row.get("category", row.get("Category", "Other")),
                    "frequency": row.get("frequency", row.get("Frequency", "monthly")),
                    "is_recurring": row.get("is_recurring", "true").lower() == "true",
                    "next_date": row.get("next_date", row.get("Next Date", now_str())),
                    "created_at": now_str(),
                }
                await db.expenses.insert_one(doc)
                imported += 1
            elif data_type == "income":
                doc = {
                    "id": new_id(), "entity_id": entity_id,
                    "name": row.get("name", row.get("Name", "Imported")),
                    "amount": float(row.get("amount", row.get("Amount", 0))),
                    "type": row.get("type", row.get("Type", "salary")),
                    "frequency": row.get("frequency", row.get("Frequency", "monthly")),
                    "is_active": True,
                    "next_date": row.get("next_date", row.get("Next Date", now_str())),
                    "created_at": now_str(),
                }
                await db.income_sources.insert_one(doc)
                imported += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
    await _create_notification(user_id, "Import Complete", f"Imported {imported} {data_type} records" + (f" with {len(errors)} errors" if errors else ""), "info")
    return {"imported": imported, "errors": errors, "total_rows": len(rows)}

@data_router.get("/export/{data_type}")
async def export_data(data_type: str, fmt: str = Query("csv"), user_id: str = Depends(get_current_user_id)):
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if not eus:
        raise HTTPException(status_code=400, detail="No active entity")
    entity_id = eus[0]["entity_id"]
    collection_map = {
        "transactions": "transactions", "expenses": "expenses", "income": "income_sources",
        "debts": "debts", "accounts": "accounts", "budgets": "budgets",
        "investments": "investment_vehicles", "savings": "savings_funds",
    }
    if data_type not in collection_map:
        raise HTTPException(status_code=400, detail=f"Invalid data type. Choose from: {list(collection_map.keys())}")
    coll = collection_map[data_type]
    docs = await db[coll].find({"entity_id": entity_id}, {"_id": 0}).to_list(10000)
    if not docs:
        raise HTTPException(status_code=404, detail="No data found")
    if fmt == "json":
        content = json.dumps(docs, indent=2, default=str)
        return StreamingResponse(io.BytesIO(content.encode()), media_type="application/json",
                                 headers={"Content-Disposition": f"attachment; filename={data_type}_export.json"})
    output = io.StringIO()
    if docs:
        fieldnames = list(docs[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for doc in docs:
            writer.writerow({k: str(v) if not isinstance(v, (str, int, float, bool)) else v for k, v in doc.items()})
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={data_type}_export.csv"})

@data_router.get("/export-all")
async def export_all(fmt: str = Query("json"), user_id: str = Depends(get_current_user_id)):
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if not eus:
        raise HTTPException(status_code=400, detail="No active entity")
    entity_id = eus[0]["entity_id"]
    all_data = {}
    for dtype, coll in {"transactions": "transactions", "expenses": "expenses", "income": "income_sources",
                        "debts": "debts", "accounts": "accounts"}.items():
        docs = await db[coll].find({"entity_id": entity_id}, {"_id": 0}).to_list(10000)
        all_data[dtype] = docs
    content = json.dumps(all_data, indent=2, default=str)
    return StreamingResponse(io.BytesIO(content.encode()), media_type="application/json",
                             headers={"Content-Disposition": "attachment; filename=blackiefi_full_export.json"})


# ==================== CURRENCY ROUTES ====================
@currency_router.get("/rates")
async def get_exchange_rates():
    return {"base": "USD", "rates": EXCHANGE_RATES, "currencies": SUPPORTED_CURRENCIES}

@currency_router.get("/convert")
async def convert_currency(amount: float = Query(...), from_currency: str = Query("USD"), to_currency: str = Query("EUR")):
    fr = EXCHANGE_RATES.get(from_currency.upper())
    to = EXCHANGE_RATES.get(to_currency.upper())
    if fr is None or to is None:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    usd_amount = amount / fr
    result = usd_amount * to
    return {"amount": amount, "from": from_currency.upper(), "to": to_currency.upper(), "result": round(result, 4), "rate": round(to / fr, 6)}

@currency_router.get("/settings")
async def get_currency_settings(user_id: str = Depends(get_current_user_id)):
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "base_currency": settings.get("base_currency", "USD") if settings else "USD",
        "display_currencies": settings.get("display_currencies", ["USD", "EUR", "GBP"]) if settings else ["USD", "EUR", "GBP"],
        "supported": SUPPORTED_CURRENCIES,
    }

@currency_router.put("/settings")
async def update_currency_settings(data: CurrencySettingsUpdate, user_id: str = Depends(get_current_user_id)):
    for c in [data.base_currency] + data.display_currencies:
        if c not in EXCHANGE_RATES:
            raise HTTPException(status_code=400, detail=f"Unsupported currency: {c}")
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {"base_currency": data.base_currency, "display_currencies": data.display_currencies, "updated_at": now_str()}},
        upsert=True
    )
    return {"status": "ok"}


# ==================== RAG Q&A ROUTES ====================
RAG_AVAILABLE = False

async def _check_chroma():
    global RAG_AVAILABLE
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get("http://localhost:8000/api/v1/heartbeat")
            RAG_AVAILABLE = r.status_code == 200
    except Exception:
        RAG_AVAILABLE = False
    return RAG_AVAILABLE

@rag_router.get("/status")
async def rag_status(user_id: str = Depends(get_current_user_id)):
    available = await _check_chroma()
    docs = await db.rag_documents.count_documents({"user_id": user_id})
    return {"available": available, "documents_count": docs}

@rag_router.post("/upload")
async def rag_upload(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    doc_id = new_id()
    chunks = [text[i:i+1000] for i in range(0, len(text), 800)]
    await db.rag_documents.insert_one({
        "id": doc_id, "user_id": user_id, "filename": file.filename,
        "chunk_count": len(chunks), "content_preview": text[:500],
        "status": "indexed_local", "created_at": now_str()
    })
    for i, chunk in enumerate(chunks):
        await db.rag_chunks.insert_one({
            "id": new_id(), "document_id": doc_id, "user_id": user_id,
            "chunk_index": i, "content": chunk, "created_at": now_str()
        })
    if await _check_chroma():
        try:
            import chromadb
            chroma_client = chromadb.HttpClient(host="localhost", port=8000)
            collection = chroma_client.get_or_create_collection(f"user_{user_id}")
            collection.add(documents=chunks, ids=[f"{doc_id}_chunk_{i}" for i in range(len(chunks))],
                          metadatas=[{"document_id": doc_id, "filename": file.filename}] * len(chunks))
            await db.rag_documents.update_one({"id": doc_id}, {"$set": {"status": "indexed_chroma"}})
        except Exception as e:
            logger.warning(f"ChromaDB indexing failed: {e}")
    return {"id": doc_id, "filename": file.filename, "chunks": len(chunks), "status": "indexed"}

@rag_router.get("/documents")
async def rag_list_documents(user_id: str = Depends(get_current_user_id)):
    docs = await db.rag_documents.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs

@rag_router.delete("/documents/{doc_id}")
async def rag_delete_document(doc_id: str, user_id: str = Depends(get_current_user_id)):
    await db.rag_documents.delete_one({"id": doc_id, "user_id": user_id})
    await db.rag_chunks.delete_many({"document_id": doc_id, "user_id": user_id})
    return {"status": "ok"}

@rag_router.post("/query")
async def rag_query(req: RAGQueryRequest, user_id: str = Depends(get_current_user_id)):
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings or not settings.get("ai_enabled"):
        raise HTTPException(status_code=400, detail="AI features are disabled. Enable in Settings.")
    relevant_chunks = []
    if await _check_chroma():
        try:
            import chromadb
            chroma_client = chromadb.HttpClient(host="localhost", port=8000)
            collection = chroma_client.get_or_create_collection(f"user_{user_id}")
            results = collection.query(query_texts=[req.question], n_results=5)
            if results and results.get("documents"):
                relevant_chunks = results["documents"][0]
        except Exception as e:
            logger.warning(f"ChromaDB query failed: {e}")
    if not relevant_chunks:
        chunks = await db.rag_chunks.find({"user_id": user_id}, {"_id": 0, "content": 1}).to_list(20)
        relevant_chunks = [c["content"] for c in chunks[:5]]
    if not relevant_chunks:
        return {"answer": "No documents uploaded yet. Upload documents to ask questions.", "sources": []}
    if not await _ollama_available():
        return {"answer": "AI service is currently unavailable. Please try later.", "sources": []}
    context = "\n---\n".join(relevant_chunks)
    prompt = f"""Based on the following document excerpts, answer the user's question.
Document excerpts:
{context}
Question: {req.question}
Provide a clear, accurate answer based only on the provided documents. If the answer isn't in the documents, say so."""
    response = await _ollama_generate(prompt)
    if not response:
        return {"answer": "Could not generate a response. AI service may be overloaded.", "sources": []}
    return {"answer": response, "sources": [c[:200] + "..." for c in relevant_chunks]}


# ==================== WEBSOCKET NOTIFICATIONS ====================
@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4001)
        return
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)


# ==================== NOTIFICATION GENERATION (BACKGROUND) ====================
async def generate_bill_reminders():
    """Generate notifications for upcoming bills - called periodically or on demand."""
    users = await db.users.find({}, {"_id": 0, "id": 1}).to_list(1000)
    for user in users:
        user_id = user["id"]
        eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
        for eu in eus:
            entity_id = eu["entity_id"]
            expenses = await db.expenses.find({"entity_id": entity_id, "is_recurring": True}, {"_id": 0}).to_list(100)
            for exp in expenses:
                ndate = exp.get("next_date")
                if ndate:
                    try:
                        nd = datetime.fromisoformat(ndate.replace("Z", "+00:00")) if isinstance(ndate, str) else ndate
                        days_until = (nd - now_dt()).days
                        if 0 <= days_until <= 3:
                            existing = await db.notifications.find_one({
                                "user_id": user_id, "title": f"Bill Due: {exp['name']}",
                                "created_at": {"$gte": (now_dt() - timedelta(days=1)).isoformat()}
                            })
                            if not existing:
                                await _create_notification(
                                    user_id, f"Bill Due: {exp['name']}",
                                    f"${exp['amount']:.2f} due in {days_until} day(s)", "warning"
                                )
                    except Exception:
                        pass


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
app.include_router(ai_router)
app.include_router(notifications_router)
app.include_router(data_router)
app.include_router(currency_router)
app.include_router(rag_router)

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
