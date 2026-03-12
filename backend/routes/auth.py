"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from database import get_db
from models import (
    UserRegisterInput, UserLoginInput, UserUpdateInput,
    PasswordResetRequestInput, PasswordResetInput, UserResponse
)
from auth import (
    hash_password, verify_password, create_access_token,
    generate_reset_token, get_current_user, get_user_id
)
from services.audit_service import get_audit_service, AuditAction

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(input: UserRegisterInput):
    """Register a new user"""
    db = get_db()
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": input.username})
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already exists")
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": input.email})
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already exists")
    
    # Create user
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(ObjectId())
    
    user_doc = {
        "_id": user_id,
        "username": input.username,
        "email": input.email,
        "password_hash": hash_password(input.password),
        "full_name": input.full_name or "",
        "role": "user",
        "ai_enabled": False,
        "preferred_llm_provider": None,
        "password_reset_token": None,
        "password_reset_expires": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    token = create_access_token({
        "user_id": user_id,
        "username": input.username,
        "role": "user"
    })
    
    # Create default entity for user
    entity_id = str(ObjectId())
    await db.entities.insert_one({
        "_id": entity_id,
        "owner_id": user_id,
        "name": "Personal",
        "type": "personal",
        "created_at": now,
        "updated_at": now
    })
    
    return {
        "user": {
            "id": user_id,
            "username": input.username,
            "email": input.email,
            "full_name": input.full_name or "",
            "role": "user",
            "ai_enabled": False,
            "preferred_llm_provider": None,
            "created_at": now,
            "updated_at": now
        },
        "token": token
    }

@router.post("/login")
async def login(input: UserLoginInput, request: Request):
    """Login user"""
    db = get_db()
    audit = get_audit_service(db)
    
    # Get client info for audit
    ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    user_agent = request.headers.get("User-Agent", "unknown")
    
    user = await db.users.find_one({"username": input.username})
    if not user:
        # Log failed login attempt
        await audit.log(
            action=AuditAction.LOGIN_FAILED,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"username": input.username, "reason": "user_not_found"},
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(input.password, user["password_hash"]):
        # Log failed login attempt
        await audit.log(
            action=AuditAction.LOGIN_FAILED,
            user_id=user["_id"],
            user_email=user.get("email"),
            ip_address=ip_address,
            user_agent=user_agent,
            details={"username": input.username, "reason": "invalid_password"},
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "user_id": user["_id"],
        "username": user["username"],
        "role": user["role"]
    })
    
    # Log successful login
    await audit.log(
        action=AuditAction.LOGIN,
        user_id=user["_id"],
        user_email=user.get("email"),
        ip_address=ip_address,
        user_agent=user_agent,
        details={"username": input.username},
        success=True,
    )
    
    return {
        "user": {
            "id": user["_id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "role": user["role"],
            "ai_enabled": user.get("ai_enabled", False),
            "preferred_llm_provider": user.get("preferred_llm_provider"),
            "created_at": user["created_at"],
            "updated_at": user["updated_at"]
        },
        "token": token
    }

@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user["_id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "role": user["role"],
        "ai_enabled": user.get("ai_enabled", False),
        "preferred_llm_provider": user.get("preferred_llm_provider"),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"]
    }

@router.put("/profile")
async def update_profile(input: UserUpdateInput, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if input.full_name is not None:
        update_data["full_name"] = input.full_name
    if input.email is not None:
        # Check if email is taken by another user
        existing = await db.users.find_one({"email": input.email, "_id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
        update_data["email"] = input.email
    if input.ai_enabled is not None:
        update_data["ai_enabled"] = input.ai_enabled
    if input.preferred_llm_provider is not None:
        update_data["preferred_llm_provider"] = input.preferred_llm_provider
    
    await db.users.update_one({"_id": user_id}, {"$set": update_data})
    
    user = await db.users.find_one({"_id": user_id})
    
    return {
        "id": user["_id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "role": user["role"],
        "ai_enabled": user.get("ai_enabled", False),
        "preferred_llm_provider": user.get("preferred_llm_provider"),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"]
    }

@router.post("/password-reset/request")
async def request_password_reset(input: PasswordResetRequestInput):
    """Request a password reset token"""
    db = get_db()
    
    reset_token = generate_reset_token()
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    result = await db.users.update_one(
        {"email": input.email},
        {"$set": {
            "password_reset_token": reset_token,
            "password_reset_expires": expires
        }}
    )
    
    # Always return success to prevent email enumeration
    if result.matched_count == 0:
        return {"message": "If the email exists, a reset link has been sent"}
    
    # In production, send email here
    # For now, return token for testing
    return {
        "message": "Password reset token generated",
        "reset_token": reset_token  # Remove in production
    }

@router.post("/password-reset")
async def reset_password(input: PasswordResetInput):
    """Reset password using token"""
    db = get_db()
    
    user = await db.users.find_one({
        "password_reset_token": input.token
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    if user.get("password_reset_expires"):
        expires = datetime.fromisoformat(user["password_reset_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": hash_password(input.new_password),
            "password_reset_token": None,
            "password_reset_expires": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Password reset successfully"}
