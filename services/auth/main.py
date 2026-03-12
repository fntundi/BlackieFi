"""
BlackieFi Auth & Identity Service
Handles:
- User authentication (login/logout)
- Registration
- MFA (TOTP)
- JWT token management (access + refresh tokens)
- Password reset
- Session management
- RBAC foundation
"""
import os
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
import redis.asyncio as redis
from bson import ObjectId

# Configuration
SERVICE_NAME = os.environ.get("SERVICE_NAME", "auth-service")
PORT = int(os.environ.get("PORT", 8001))
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/blackiefi")
DB_NAME = os.environ.get("DB_NAME", "blackiefi")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
JWT_SECRET = os.environ.get("JWT_SECRET", "blackiefi-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRY_HOURS = int(os.environ.get("JWT_ACCESS_EXPIRY_HOURS", 24))
JWT_REFRESH_EXPIRY_DAYS = int(os.environ.get("JWT_REFRESH_EXPIRY_DAYS", 30))
MFA_ISSUER = os.environ.get("MFA_ISSUER", "BlackieFi")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer(auto_error=False)

# Database clients
mongo_client: Optional[AsyncIOMotorClient] = None
db = None
redis_client: Optional[redis.Redis] = None


# =============================================================================
# MODELS
# =============================================================================

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str
    mfa_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]


class MFAVerify(BaseModel):
    code: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global mongo_client, db, redis_client
    
    print(f"[{SERVICE_NAME}] Starting Auth Service...")
    
    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Create indexes
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.refresh_tokens.create_index("token", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    
    print(f"[{SERVICE_NAME}] Connected to MongoDB")
    
    # Connect to Redis
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print(f"[{SERVICE_NAME}] Connected to Redis")
    except Exception as e:
        print(f"[{SERVICE_NAME}] Warning: Redis connection failed: {e}")
        redis_client = None
    
    print(f"[{SERVICE_NAME}] Auth Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    print(f"[{SERVICE_NAME}] Shutting down...")
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="BlackieFi Auth Service",
    description="Authentication & Identity Management Service",
    version="3.0.0",
    lifespan=lifespan,
)


# =============================================================================
# HELPERS
# =============================================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_EXPIRY_HOURS)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRY_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


def generate_backup_codes(count: int = 10) -> List[str]:
    return [secrets.token_hex(4).upper() for _ in range(count)]


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    payload = decode_token(credentials.credentials)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Check if token is blacklisted
    if redis_client:
        is_blacklisted = await redis_client.get(f"blacklist:{credentials.credentials}")
        if is_blacklisted:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
    
    return payload


def serialize_user(user: dict) -> dict:
    """Serialize user document for response"""
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "display_name": user.get("display_name"),
        "role": user.get("role", "user"),
        "mfa_enabled": user.get("mfa_enabled", False),
        "created_at": user.get("created_at"),
        "last_login": user.get("last_login"),
    }


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
async def health_check():
    mongo_status = "connected"
    try:
        await mongo_client.admin.command('ping')
    except Exception:
        mongo_status = "disconnected"
    
    redis_status = "connected"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "disconnected"
    else:
        redis_status = "not_configured"
    
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": "3.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "mongodb": mongo_status,
            "redis": redis_status
        }
    }


# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    """Register a new user"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if username or email exists
    existing = await db.users.find_one({
        "$or": [
            {"username": data.username},
            {"email": data.email}
        ]
    })
    
    if existing:
        if existing.get("username") == data.username:
            raise HTTPException(status_code=400, detail="Username already exists")
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    user_id = str(ObjectId())
    user = {
        "_id": user_id,
        "username": data.username,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "display_name": data.display_name or data.username,
        "role": "admin",  # First user is admin (for single-user system)
        "mfa_enabled": False,
        "mfa_secret": None,
        "mfa_backup_codes": [],
        "created_at": now,
        "updated_at": now,
        "last_login": now,
    }
    
    await db.users.insert_one(user)
    
    # Generate tokens
    token_data = {
        "user_id": user_id,
        "username": data.username,
        "role": "admin"
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store refresh token
    await db.refresh_tokens.insert_one({
        "token": refresh_token,
        "user_id": user_id,
        "created_at": now,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRY_DAYS)
    })
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_EXPIRY_HOURS * 3600,
        user=serialize_user(user)
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate user and return tokens"""
    # Find user
    user = await db.users.find_one({"username": data.username})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check MFA if enabled
    if user.get("mfa_enabled"):
        if not data.mfa_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA code required",
                headers={"X-MFA-Required": "true"}
            )
        
        totp = pyotp.TOTP(user["mfa_secret"])
        if not totp.verify(data.mfa_code):
            # Check backup codes
            backup_codes = user.get("mfa_backup_codes", [])
            if data.mfa_code.upper() in backup_codes:
                # Remove used backup code
                backup_codes.remove(data.mfa_code.upper())
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"mfa_backup_codes": backup_codes}}
                )
            else:
                raise HTTPException(status_code=401, detail="Invalid MFA code")
    
    # Update last login
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now}}
    )
    
    # Generate tokens
    token_data = {
        "user_id": str(user["_id"]),
        "username": user["username"],
        "role": user.get("role", "user")
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store refresh token
    await db.refresh_tokens.insert_one({
        "token": refresh_token,
        "user_id": str(user["_id"]),
        "created_at": now,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRY_DAYS)
    })
    
    user["last_login"] = now
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_EXPIRY_HOURS * 3600,
        user=serialize_user(user)
    )


@app.post("/api/auth/refresh", response_model=TokenResponse)
async def refresh_tokens(data: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    # Verify refresh token
    payload = decode_token(data.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    # Check if token exists in database
    stored_token = await db.refresh_tokens.find_one({"token": data.refresh_token})
    if not stored_token:
        raise HTTPException(status_code=401, detail="Token not found or revoked")
    
    # Get user
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Revoke old refresh token
    await db.refresh_tokens.delete_one({"token": data.refresh_token})
    
    # Generate new tokens
    token_data = {
        "user_id": str(user["_id"]),
        "username": user["username"],
        "role": user.get("role", "user")
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store new refresh token
    now = datetime.now(timezone.utc).isoformat()
    await db.refresh_tokens.insert_one({
        "token": refresh_token,
        "user_id": str(user["_id"]),
        "created_at": now,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRY_DAYS)
    })
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_EXPIRY_HOURS * 3600,
        user=serialize_user(user)
    )


@app.post("/api/auth/logout")
async def logout(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Logout user and revoke tokens"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
        # Blacklist access token in Redis
        if redis_client:
            ttl = JWT_ACCESS_EXPIRY_HOURS * 3600
            await redis_client.setex(f"blacklist:{token}", ttl, "1")
        
        # Revoke all refresh tokens for user
        await db.refresh_tokens.delete_many({"user_id": current_user["user_id"]})
    
    return {"message": "Logged out successfully"}


# =============================================================================
# MFA ENDPOINTS
# =============================================================================

@app.post("/api/auth/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user: dict = Depends(get_current_user)):
    """Setup MFA for user - generates secret and QR code"""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    
    if user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA is already enabled")
    
    # Generate secret
    secret = pyotp.random_base32()
    
    # Generate QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user["email"],
        issuer_name=MFA_ISSUER
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Generate backup codes
    backup_codes = generate_backup_codes()
    
    # Store secret temporarily (will be confirmed on verify)
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {"$set": {
            "mfa_secret_pending": secret,
            "mfa_backup_codes_pending": backup_codes
        }}
    )
    
    return MFASetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_base64}",
        backup_codes=backup_codes
    )


@app.post("/api/auth/mfa/verify")
async def verify_mfa_setup(data: MFAVerify, current_user: dict = Depends(get_current_user)):
    """Verify MFA setup with code"""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    
    pending_secret = user.get("mfa_secret_pending")
    if not pending_secret:
        raise HTTPException(status_code=400, detail="MFA setup not initiated")
    
    totp = pyotp.TOTP(pending_secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable MFA
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {
            "$set": {
                "mfa_enabled": True,
                "mfa_secret": pending_secret,
                "mfa_backup_codes": user.get("mfa_backup_codes_pending", [])
            },
            "$unset": {
                "mfa_secret_pending": "",
                "mfa_backup_codes_pending": ""
            }
        }
    )
    
    return {"message": "MFA enabled successfully"}


@app.post("/api/auth/mfa/disable")
async def disable_mfa(data: MFAVerify, current_user: dict = Depends(get_current_user)):
    """Disable MFA for user"""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    
    if not user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(data.code):
        # Check backup codes
        if data.code.upper() not in user.get("mfa_backup_codes", []):
            raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Disable MFA
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {
            "$set": {
                "mfa_enabled": False,
                "mfa_secret": None,
                "mfa_backup_codes": []
            }
        }
    )
    
    return {"message": "MFA disabled successfully"}


# =============================================================================
# PASSWORD MANAGEMENT
# =============================================================================

@app.post("/api/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    """Initiate password reset"""
    user = await db.users.find_one({"email": data.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    
    # Store token
    await db.password_reset_tokens.insert_one({
        "token": reset_token,
        "user_id": str(user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
    })
    
    # In production, send email here
    # For now, return token for testing
    if LOG_LEVEL == "DEBUG":
        return {"message": "Reset link sent", "debug_token": reset_token}
    
    return {"message": "If the email exists, a reset link has been sent"}


@app.post("/api/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    """Reset password with token"""
    # Find token
    stored_token = await db.password_reset_tokens.find_one({"token": data.token})
    
    if not stored_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    await db.users.update_one(
        {"_id": stored_token["user_id"]},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Delete used token
    await db.password_reset_tokens.delete_one({"token": data.token})
    
    # Revoke all refresh tokens for security
    await db.refresh_tokens.delete_many({"user_id": stored_token["user_id"]})
    
    return {"message": "Password reset successfully"}


@app.post("/api/auth/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    """Change password for authenticated user"""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Revoke all refresh tokens for security
    await db.refresh_tokens.delete_many({"user_id": current_user["user_id"]})
    
    return {"message": "Password changed successfully"}


# =============================================================================
# USER PROFILE
# =============================================================================

@app.get("/api/auth/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return serialize_user(user)


@app.put("/api/auth/me")
async def update_current_user_profile(
    data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.display_name:
        updates["display_name"] = data.display_name
    
    if data.email:
        # Check if email is taken
        existing = await db.users.find_one({
            "email": data.email,
            "_id": {"$ne": current_user["user_id"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = data.email
    
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {"$set": updates}
    )
    
    user = await db.users.find_one({"_id": current_user["user_id"]})
    return serialize_user(user)


# =============================================================================
# INTERNAL ENDPOINTS (for service-to-service communication)
# =============================================================================

@app.get("/internal/validate-token")
async def validate_token_internal(request: Request):
    """Internal endpoint for gateway to validate tokens"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    return payload


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
