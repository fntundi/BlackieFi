"""
BlackieFi 3.0 - Auth Service
Handles authentication, JWT tokens, MFA, and session management.
"""
import sys
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from shared.config import settings
from shared.database import get_db, MongoDB, RedisClient
from shared.auth_utils import (
    hash_password, verify_password, create_access_token,
    decode_token, blacklist_token, is_token_blacklisted
)
from shared.models import HealthCheck, UserResponse, Token

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BlackieFi Auth Service",
    version="3.0.0",
    description="Authentication and authorization service"
)

router = APIRouter()
security = HTTPBearer()


# Request/Response Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# Routes
@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(service="auth", status="healthy")


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user."""
    db = get_db()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
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
    
    # Generate token
    access_token = create_access_token(subject=user_id)
    
    user_response = UserResponse(
        id=user_id,
        email=request.email,
        full_name=request.full_name,
        is_active=True,
        is_admin=False,
        created_at=now
    )
    
    return LoginResponse(
        access_token=access_token,
        user=user_response
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login and receive an access token."""
    db = get_db()
    
    # Find user
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(request.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Generate token
    access_token = create_access_token(subject=user_doc["id"])
    
    # Parse created_at
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    elif created_at is None:
        created_at = datetime.now(timezone.utc)
    
    user_response = UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        is_active=user_doc.get("is_active", True),
        is_admin=user_doc.get("is_admin", False),
        created_at=created_at
    )
    
    return LoginResponse(
        access_token=access_token,
        user=user_response
    )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout and invalidate the token."""
    token = credentials.credentials
    await blacklist_token(token)
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user information."""
    token = credentials.credentials
    
    # Check if token is blacklisted
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been invalidated"
        )
    
    # Decode token
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    db = get_db()
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Parse created_at
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    elif created_at is None:
        created_at = datetime.now(timezone.utc)
    
    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        is_active=user_doc.get("is_active", True),
        is_admin=user_doc.get("is_admin", False),
        created_at=created_at
    )


@router.post("/verify")
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify if a token is valid."""
    token = credentials.credentials
    
    # Check if token is blacklisted
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been invalidated"
        )
    
    payload = decode_token(token)
    return {"valid": True, "user_id": payload.get("sub")}


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Change user password."""
    token = credentials.credentials
    
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been invalidated"
        )
    
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    db = get_db()
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify old password
    if not verify_password(request.old_password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid old password"
        )
    
    # Update password
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "hashed_password": hash_password(request.new_password),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Invalidate current token
    await blacklist_token(token)
    
    return {"message": "Password changed successfully. Please login again."}


# Include router
app.include_router(router, prefix="/api/auth", tags=["auth"])

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
    await RedisClient.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
