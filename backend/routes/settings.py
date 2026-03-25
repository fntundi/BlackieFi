"""
Settings routes - system and user settings
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from database import get_db
from models import SystemSettingsUpdate, SystemSettingsResponse, AIStatusResponse, ObjectStorageConfigUpdate, ObjectStorageConfigResponse
from auth import get_current_user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user is an admin"""
    db = get_db()
    user_id = current_user.get("user_id")
    user = await db.users.find_one({"_id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _storage_response(settings: dict) -> dict:
    config = settings.get("object_storage", {}) if settings else {}
    return {
        "provider": config.get("provider", "minio"),
        "endpoint_url": config.get("endpoint_url", ""),
        "bucket": config.get("bucket", ""),
        "access_key": config.get("access_key", ""),
        "region": config.get("region"),
        "secure": config.get("secure", True),
        "path_prefix": config.get("path_prefix", ""),
        "enabled": config.get("enabled", False),
        "secret_key_set": bool(config.get("secret_key"))
    }

router = APIRouter()

@router.get("", response_model=SystemSettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get system settings"""
    db = get_db()
    
    settings = await db.system_settings.find_one({"_id": "system"})
    if not settings:
        # Create default settings if not exists
        settings = {
            "_id": "system",
            "ai_enabled": False,
            "default_llm_provider": "openrouter"
        }
        await db.system_settings.insert_one(settings)
    
    return {
        "ai_enabled": settings.get("ai_enabled", False),
        "default_llm_provider": settings.get("default_llm_provider", "openrouter")
    }

@router.put("", response_model=SystemSettingsResponse)
async def update_settings(input: SystemSettingsUpdate, current_user: dict = Depends(get_current_user)):
    """Update system settings (admin only)"""
    db = get_db()
    
    # Check if user is admin
    user_id = current_user.get("user_id")
    user = await db.users.find_one({"_id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {}
    if input.ai_enabled is not None:
        update_data["ai_enabled"] = input.ai_enabled
    if input.default_llm_provider is not None:
        update_data["default_llm_provider"] = input.default_llm_provider
    
    if update_data:
        await db.system_settings.update_one(
            {"_id": "system"},
            {"$set": update_data},
            upsert=True
        )
    
    settings = await db.system_settings.find_one({"_id": "system"})
    
    return {
        "ai_enabled": settings.get("ai_enabled", False),
        "default_llm_provider": settings.get("default_llm_provider", "openrouter")
    }

@router.get("/ai-status", response_model=AIStatusResponse)
async def get_ai_status(current_user: dict = Depends(get_current_user)):
    """Get effective AI status for current user"""
    db = get_db()
    user_id = current_user.get("user_id")

@router.get("/storage", response_model=ObjectStorageConfigResponse)
async def get_storage_settings(current_user: dict = Depends(require_admin)):
    db = get_db()
    settings = await db.system_settings.find_one({"_id": "system"})
    return _storage_response(settings or {})


@router.put("/storage", response_model=ObjectStorageConfigResponse)
async def update_storage_settings(
    input: ObjectStorageConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    db = get_db()
    settings = await db.system_settings.find_one({"_id": "system"})
    current = settings.get("object_storage", {}) if settings else {}

    update_data = {**current}
    if input.provider is not None:
        update_data["provider"] = input.provider
    if input.endpoint_url is not None:
        update_data["endpoint_url"] = input.endpoint_url
    if input.bucket is not None:
        update_data["bucket"] = input.bucket
    if input.access_key is not None:
        update_data["access_key"] = input.access_key
    if input.secret_key is not None:
        update_data["secret_key"] = input.secret_key
    if input.region is not None:
        update_data["region"] = input.region
    if input.secure is not None:
        update_data["secure"] = input.secure
    if input.path_prefix is not None:
        update_data["path_prefix"] = input.path_prefix
    if input.enabled is not None:
        update_data["enabled"] = input.enabled

    await db.system_settings.update_one(
        {"_id": "system"},
        {"$set": {"object_storage": update_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    settings = await db.system_settings.find_one({"_id": "system"})
    return _storage_response(settings or {})

    
    # Get system settings
    system_settings = await db.system_settings.find_one({"_id": "system"})
    system_ai_enabled = system_settings.get("ai_enabled", False) if system_settings else False
    system_llm_provider = system_settings.get("default_llm_provider", "emergent") if system_settings else "emergent"
    system_model = system_settings.get("default_model") if system_settings else None
    
    # Get user settings
    user = await db.users.find_one({"_id": user_id})
    user_ai_enabled = user.get("ai_enabled", False) if user else False
    user_llm_provider = user.get("preferred_llm_provider") if user else None
    
    # Effective AI is enabled only if both system AND user have it enabled
    effective_ai_enabled = system_ai_enabled and user_ai_enabled
    
    # Use user's preferred provider if set, otherwise system default
    effective_provider = user_llm_provider or system_llm_provider
    
    return {
        "system_ai_enabled": system_ai_enabled,
        "user_ai_enabled": user_ai_enabled,
        "effective_ai_enabled": effective_ai_enabled,
        "llm_provider": effective_provider,
        "llm_model": system_model
    }
