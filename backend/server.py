from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from passlib.context import CryptContext
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import jwt
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'blackiefi-super-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="BlackieFi API", version="3.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
entities_router = APIRouter(prefix="/api/entities", tags=["entities"])
accounts_router = APIRouter(prefix="/api/accounts", tags=["accounts"])
assets_router = APIRouter(prefix="/api/assets", tags=["assets"])

security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== Models ====================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: datetime

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EntityCreate(BaseModel):
    name: str
    entity_type: str
    jurisdiction: Optional[str] = None
    description: Optional[str] = None

class EntityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    entity_type: str
    jurisdiction: Optional[str]
    description: Optional[str]
    owner_id: str
    status: str
    created_at: datetime
    updated_at: datetime

class AccountCreate(BaseModel):
    name: str
    account_type: str
    institution: Optional[str] = None
    balance: float = 0.0
    currency: str = "USD"
    entity_id: Optional[str] = None

class AccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    account_type: str
    institution: Optional[str]
    balance: float
    currency: str
    owner_id: str
    entity_id: Optional[str]
    created_at: datetime
    updated_at: datetime

class AssetCreate(BaseModel):
    name: str
    asset_type: str
    value: float
    description: Optional[str] = None
    location: Optional[str] = None
    entity_id: Optional[str] = None

class AssetResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    asset_type: str
    value: float
    description: Optional[str]
    location: Optional[str]
    owner_id: str
    entity_id: Optional[str]
    created_at: datetime
    updated_at: datetime

class HealthCheck(BaseModel):
    status: str = "healthy"
    service: str
    version: str = "3.0.0"


# ==================== Helpers ====================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

def parse_datetime(dt):
    if isinstance(dt, str):
        return datetime.fromisoformat(dt.replace('Z', '+00:00'))
    return dt or datetime.now(timezone.utc)


# ==================== Auth Routes ====================
@auth_router.get("/health", response_model=HealthCheck)
async def auth_health():
    return HealthCheck(service="auth")

@auth_router.post("/register", response_model=LoginResponse, status_code=201)
async def register(request: UserCreate):
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "id": user_id,
        "email": request.email,
        "full_name": request.full_name,
        "hashed_password": hash_password(request.password),
        "is_active": True,
        "is_admin": False,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return LoginResponse(
        access_token=create_access_token(user_id),
        user=UserResponse(id=user_id, email=request.email, full_name=request.full_name,
                         is_active=True, is_admin=False, created_at=now)
    )

@auth_router.post("/login", response_model=LoginResponse)
async def login(request: UserLogin):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return LoginResponse(
        access_token=create_access_token(user["id"]),
        user=UserResponse(
            id=user["id"], email=user["email"], full_name=user["full_name"],
            is_active=user.get("is_active", True), is_admin=user.get("is_admin", False),
            created_at=parse_datetime(user.get("created_at"))
        )
    )

@auth_router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {"message": "Successfully logged out"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user["id"], email=user["email"], full_name=user["full_name"],
        is_active=user.get("is_active", True), is_admin=user.get("is_admin", False),
        created_at=parse_datetime(user.get("created_at"))
    )


# ==================== Entity Routes ====================
@entities_router.get("/health", response_model=HealthCheck)
async def entities_health():
    return HealthCheck(service="entity")

@entities_router.post("/", response_model=EntityResponse, status_code=201)
async def create_entity(entity: EntityCreate, user_id: str = Depends(get_current_user_id)):
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()), "name": entity.name, "entity_type": entity.entity_type,
        "jurisdiction": entity.jurisdiction, "description": entity.description,
        "owner_id": user_id, "status": "active",
        "created_at": now.isoformat(), "updated_at": now.isoformat()
    }
    await db.entities.insert_one(doc)
    return EntityResponse(**{**doc, "created_at": now, "updated_at": now})

@entities_router.get("/", response_model=List[EntityResponse])
async def list_entities(user_id: str = Depends(get_current_user_id)):
    entities = await db.entities.find({"owner_id": user_id}, {"_id": 0}).to_list(100)
    return [EntityResponse(**{**e, "created_at": parse_datetime(e.get("created_at")),
                              "updated_at": parse_datetime(e.get("updated_at"))}) for e in entities]

@entities_router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, user_id: str = Depends(get_current_user_id)):
    entity = await db.entities.find_one({"id": entity_id, "owner_id": user_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponse(**{**entity, "created_at": parse_datetime(entity.get("created_at")),
                             "updated_at": parse_datetime(entity.get("updated_at"))})

@entities_router.delete("/{entity_id}")
async def delete_entity(entity_id: str, user_id: str = Depends(get_current_user_id)):
    result = await db.entities.delete_one({"id": entity_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"message": "Entity deleted successfully"}


# ==================== Account Routes ====================
@accounts_router.get("/health", response_model=HealthCheck)
async def accounts_health():
    return HealthCheck(service="portfolio")

@accounts_router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(account: AccountCreate, user_id: str = Depends(get_current_user_id)):
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()), "name": account.name, "account_type": account.account_type,
        "institution": account.institution, "balance": account.balance, "currency": account.currency,
        "owner_id": user_id, "entity_id": account.entity_id,
        "created_at": now.isoformat(), "updated_at": now.isoformat()
    }
    await db.accounts.insert_one(doc)
    return AccountResponse(**{**doc, "created_at": now, "updated_at": now})

@accounts_router.get("/", response_model=List[AccountResponse])
async def list_accounts(entity_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    query = {"owner_id": user_id}
    if entity_id:
        query["entity_id"] = entity_id
    accounts = await db.accounts.find(query, {"_id": 0}).to_list(100)
    return [AccountResponse(**{**a, "created_at": parse_datetime(a.get("created_at")),
                               "updated_at": parse_datetime(a.get("updated_at"))}) for a in accounts]

@accounts_router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    account = await db.accounts.find_one({"id": account_id, "owner_id": user_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountResponse(**{**account, "created_at": parse_datetime(account.get("created_at")),
                              "updated_at": parse_datetime(account.get("updated_at"))})

@accounts_router.delete("/{account_id}")
async def delete_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    result = await db.accounts.delete_one({"id": account_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted successfully"}


# ==================== Asset Routes ====================
@assets_router.get("/health", response_model=HealthCheck)
async def assets_health():
    return HealthCheck(service="assets")

@assets_router.post("/", response_model=AssetResponse, status_code=201)
async def create_asset(asset: AssetCreate, user_id: str = Depends(get_current_user_id)):
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()), "name": asset.name, "asset_type": asset.asset_type,
        "value": asset.value, "description": asset.description, "location": asset.location,
        "owner_id": user_id, "entity_id": asset.entity_id,
        "created_at": now.isoformat(), "updated_at": now.isoformat()
    }
    await db.assets.insert_one(doc)
    return AssetResponse(**{**doc, "created_at": now, "updated_at": now})

@assets_router.get("/", response_model=List[AssetResponse])
async def list_assets(entity_id: Optional[str] = None, asset_type: Optional[str] = None,
                      user_id: str = Depends(get_current_user_id)):
    query = {"owner_id": user_id}
    if entity_id:
        query["entity_id"] = entity_id
    if asset_type:
        query["asset_type"] = asset_type
    assets = await db.assets.find(query, {"_id": 0}).to_list(100)
    return [AssetResponse(**{**a, "created_at": parse_datetime(a.get("created_at")),
                             "updated_at": parse_datetime(a.get("updated_at"))}) for a in assets]

@assets_router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, user_id: str = Depends(get_current_user_id)):
    asset = await db.assets.find_one({"id": asset_id, "owner_id": user_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return AssetResponse(**{**asset, "created_at": parse_datetime(asset.get("created_at")),
                            "updated_at": parse_datetime(asset.get("updated_at"))})

@assets_router.delete("/{asset_id}")
async def delete_asset(asset_id: str, user_id: str = Depends(get_current_user_id)):
    result = await db.assets.delete_one({"id": asset_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted successfully"}


# ==================== Core Routes ====================
@api_router.get("/")
async def root():
    return {"message": "Welcome to BlackieFi 3.0", "version": "3.0.0"}

@api_router.get("/health", response_model=HealthCheck)
async def health():
    return HealthCheck(service="core")


# Include all routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(entities_router)
app.include_router(accounts_router)
app.include_router(assets_router)

# CORS middleware
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
