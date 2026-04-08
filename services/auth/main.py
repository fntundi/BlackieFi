"""
BlackieFi Auth Service - Port 8001
Handles: login, register, logout, me, password-reset, MFA, password-change
"""
import sys, os
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.database import get_mongo_db
from shared.config import settings
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import uuid, jwt, secrets, logging, io, base64
import pyotp
import qrcode

app = FastAPI(title="BlackieFi Auth Service", version="3.0.0")
router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

# ---- Models ----
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str; email: str; full_name: str; phone: Optional[str] = None
    is_active: bool = True; is_admin: bool = False
    personal_entity_id: Optional[str] = None; onboarding_complete: bool = False
    created_at: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str; user: UserResponse

class HealthCheck(BaseModel):
    status: str = "healthy"; service: str = "auth"; version: str = "3.0.0"

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str; new_password: str

class PasswordChangeRequest(BaseModel):
    current_password: str; new_password: str

class MFAVerifyRequest(BaseModel):
    code: str

# ---- Helpers ----
def now_str():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

def hash_password(pw):
    return pwd_context.hash(pw)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str):
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    return jwt.encode({"sub": subject, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str):
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ---- Routes ----
@router.get("/health", response_model=HealthCheck)
async def health():
    return HealthCheck()

@router.post("/register", response_model=LoginResponse, status_code=201)
async def register(req: UserCreate):
    db = await get_mongo_db()
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    uid, eid = new_id(), new_id()
    n = now_str()
    user_doc = {
        "id": uid, "email": req.email, "full_name": req.full_name, "phone": req.phone,
        "hashed_password": hash_password(req.password), "is_active": True, "is_admin": False,
        "personal_entity_id": eid, "onboarding_complete": False,
        "created_at": n, "updated_at": n
    }
    entity_doc = {
        "id": eid, "name": f"{req.full_name}'s Personal", "entity_type": "personal",
        "business_type": None, "jurisdiction": None, "description": "Personal finance",
        "owner_id": uid, "status": "active", "is_personal": True,
        "created_at": n, "updated_at": n
    }
    await db.users.insert_one(user_doc)
    await db.entities.insert_one(entity_doc)
    admin_role = await db.roles.find_one({"name": "admin", "entity_id": None}, {"_id": 0})
    if admin_role:
        await db.entity_users.insert_one({
            "id": new_id(), "entity_id": eid, "user_id": uid,
            "role_id": admin_role["id"], "is_active": True,
            "invited_by": uid, "created_at": n
        })
    return LoginResponse(
        access_token=create_access_token(uid),
        user=UserResponse(id=uid, email=req.email, full_name=req.full_name, phone=req.phone,
                         is_active=True, personal_entity_id=eid, created_at=n)
    )

@router.post("/login")
async def login(req: UserLogin):
    db = await get_mongo_db()
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
            created_at=user.get("created_at")
        )
    )

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {"message": "Logged out"}

@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse(
        id=user["id"], email=user["email"], full_name=user["full_name"],
        phone=user.get("phone"), is_active=user.get("is_active", True),
        is_admin=user.get("is_admin", False),
        personal_entity_id=user.get("personal_entity_id"),
        onboarding_complete=user.get("onboarding_complete", False),
        created_at=user.get("created_at")
    )

@router.post("/password-reset/request")
async def request_password_reset(req: PasswordResetRequest):
    db = await get_mongo_db()
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user:
        return {"message": "If account exists, reset instructions have been sent."}
    token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one({
        "token": token, "user_id": user["id"], "created_at": now_str(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    })
    return {"message": "Reset token generated", "reset_token": token}

@router.post("/password-reset/confirm")
async def confirm_password_reset(req: PasswordResetConfirm):
    db = await get_mongo_db()
    reset = await db.password_resets.find_one({"token": req.token}, {"_id": 0})
    if not reset:
        raise HTTPException(400, "Invalid token")
    if datetime.fromisoformat(reset["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expired")
    await db.users.update_one({"id": reset["user_id"]}, {"$set": {"hashed_password": hash_password(req.new_password)}})
    await db.password_resets.delete_one({"token": req.token})
    return {"message": "Password reset successfully"}

@router.post("/password-change")
async def change_password(req: PasswordChangeRequest, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not verify_password(req.current_password, user["hashed_password"]):
        raise HTTPException(400, "Current password is incorrect")
    await db.users.update_one({"id": user_id}, {"$set": {"hashed_password": hash_password(req.new_password)}})
    return {"message": "Password changed successfully"}

# ---- MFA Routes ----
@router.get("/mfa/status")
async def mfa_status(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "mfa_enabled": 1})
    return {"mfa_enabled": user.get("mfa_enabled", False) if user else False}

@router.post("/mfa/setup")
async def mfa_setup(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    if user.get("mfa_enabled"):
        raise HTTPException(400, "MFA already enabled")
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user["email"], issuer_name="BlackieFi")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    await db.users.update_one({"id": user_id}, {"$set": {"mfa_secret": secret}})
    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_b64}", "uri": uri}

@router.post("/mfa/verify")
async def mfa_verify(req: MFAVerifyRequest, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("mfa_secret"):
        raise HTTPException(400, "MFA not set up")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(400, "Invalid code")
    await db.users.update_one({"id": user_id}, {"$set": {"mfa_enabled": True}})
    return {"status": "ok", "message": "MFA enabled"}

@router.post("/mfa/disable")
async def mfa_disable(req: MFAVerifyRequest, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("mfa_enabled"):
        raise HTTPException(400, "MFA not enabled")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(400, "Invalid code")
    await db.users.update_one({"id": user_id}, {"$set": {"mfa_enabled": False}, "$unset": {"mfa_secret": ""}})
    return {"status": "ok", "message": "MFA disabled"}

@router.post("/mfa/validate")
async def mfa_validate_login(req: MFAVerifyRequest, email: str = Query(...)):
    db = await get_mongo_db()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("mfa_enabled") or not user.get("mfa_secret"):
        raise HTTPException(400, "MFA not configured")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(401, "Invalid MFA code")
    token = create_access_token(user["id"])
    u = {k: user.get(k) for k in ["id","email","full_name","role","onboarding_complete","personal_entity_id"]}
    return {"access_token": token, "user": u}


# ---- App Setup ----
app.include_router(router, prefix="/api/auth", tags=["auth"])

from starlette.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
