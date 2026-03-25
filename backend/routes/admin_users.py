"""Admin user management and RBAC routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
from bson import ObjectId
import secrets

from database import get_db
from models import (
    AdminUserCreateInput,
    AdminUserInviteInput,
    UserRoleUpdate,
    UserSummaryResponse,
    EntityAccessGrantInput,
    EntityAccessResponse
)
from auth import get_current_user, hash_password
from services.notification_service import NotificationService

router = APIRouter()


def _user_summary(user: dict) -> dict:
    return {
        "id": user["_id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user.get("full_name"),
        "role": user.get("role", "user"),
        "ai_enabled": user.get("ai_enabled", False),
        "created_at": user.get("created_at")
    }


def _entity_access_response(access: dict, entity_name: str = None) -> dict:
    return {
        "id": access["_id"],
        "entity_id": access["entity_id"],
        "entity_name": entity_name,
        "user_id": access["user_id"],
        "role": access["role"],
        "created_at": access.get("created_at"),
        "updated_at": access.get("updated_at")
    }


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    db = get_db()
    user = await db.users.find_one({"_id": current_user.get("user_id")})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/users", response_model=list[UserSummaryResponse])
async def list_users(current_user: dict = Depends(require_admin)):
    db = get_db()
    users = await db.users.find({}, {"password_hash": 0}).to_list(length=1000)
    return [_user_summary(u) for u in users]


@router.post("/users", response_model=UserSummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_user(input: AdminUserCreateInput, current_user: dict = Depends(require_admin)):
    db = get_db()

    existing_user = await db.users.find_one({"username": input.username})
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already exists")
    existing_email = await db.users.find_one({"email": input.email})
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already exists")

    now = datetime.now(timezone.utc).isoformat()
    user_id = str(ObjectId())
    await db.users.insert_one({
        "_id": user_id,
        "username": input.username,
        "email": input.email,
        "password_hash": hash_password(input.password),
        "full_name": input.full_name or "",
        "role": input.role,
        "ai_enabled": False,
        "preferred_llm_provider": None,
        "password_reset_token": None,
        "password_reset_expires": None,
        "created_at": now,
        "updated_at": now
    })

    # Create default personal entity
    entity_id = str(ObjectId())
    await db.entities.insert_one({
        "_id": entity_id,
        "owner_id": user_id,
        "name": "Personal",
        "type": "personal",
        "created_at": now,
        "updated_at": now
    })
    await db.personal_entities.insert_one({
        "_id": str(ObjectId()),
        "entity_id": entity_id,
        "owner_id": user_id,
        "created_at": now,
        "updated_at": now
    })

    user = await db.users.find_one({"_id": user_id})
    return _user_summary(user)


@router.post("/users/invite", response_model=UserSummaryResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(input: AdminUserInviteInput, current_user: dict = Depends(require_admin)):
    db = get_db()

    existing_email = await db.users.find_one({"email": input.email})
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already exists")

    base_username = input.email.split("@")[0]
    username = base_username
    while await db.users.find_one({"username": username}):
        username = f"{base_username}{secrets.randbelow(9999)}"

    temp_password = secrets.token_urlsafe(8)
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(ObjectId())

    await db.users.insert_one({
        "_id": user_id,
        "username": username,
        "email": input.email,
        "password_hash": hash_password(temp_password),
        "full_name": input.full_name or "",
        "role": input.role,
        "ai_enabled": False,
        "preferred_llm_provider": None,
        "password_reset_token": None,
        "password_reset_expires": None,
        "created_at": now,
        "updated_at": now
    })

    entity_id = str(ObjectId())
    await db.entities.insert_one({
        "_id": entity_id,
        "owner_id": user_id,
        "name": "Personal",
        "type": "personal",
        "created_at": now,
        "updated_at": now
    })
    await db.personal_entities.insert_one({
        "_id": str(ObjectId()),
        "entity_id": entity_id,
        "owner_id": user_id,
        "created_at": now,
        "updated_at": now
    })

    notification_service = NotificationService()
    await notification_service.send_email(
        to_email=input.email,
        subject="You have been invited to BlackieFi",
        html_content=f"""
        <div style=\"font-family: Arial, sans-serif; color: #111;\">
          <h2>Welcome to BlackieFi</h2>
          <p>An administrator created an account for you.</p>
          <p><strong>Username:</strong> {username}</p>
          <p><strong>Temporary password:</strong> {temp_password}</p>
          <p>Please log in and update your password immediately.</p>
        </div>
        """
    )

    user = await db.users.find_one({"_id": user_id})
    return _user_summary(user)


@router.put("/users/{user_id}/role", response_model=UserSummaryResponse)
async def update_user_role(user_id: str, input: UserRoleUpdate, current_user: dict = Depends(require_admin)):
    db = get_db()
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": {"role": input.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = await db.users.find_one({"_id": user_id})
    return _user_summary(user)


@router.get("/users/{user_id}/entity-access", response_model=list[EntityAccessResponse])
async def list_entity_access(user_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    accesses = await db.entity_access.find({"user_id": user_id}).to_list(length=1000)
    entity_ids = [a["entity_id"] for a in accesses]
    entities = await db.entities.find({"_id": {"$in": entity_ids}}).to_list(length=1000) if entity_ids else []
    entity_map = {e["_id"]: e.get("name") for e in entities}

    return [_entity_access_response(a, entity_map.get(a["entity_id"])) for a in accesses]


@router.post("/users/{user_id}/entity-access", response_model=EntityAccessResponse, status_code=status.HTTP_201_CREATED)
async def grant_entity_access(user_id: str, input: EntityAccessGrantInput, current_user: dict = Depends(require_admin)):
    db = get_db()
    entity = await db.entities.find_one({"_id": input.entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.entity_access.update_one(
        {"user_id": user_id, "entity_id": input.entity_id},
        {"$set": {"role": input.role, "updated_at": now}, "$setOnInsert": {"_id": str(ObjectId()), "created_at": now}},
        upsert=True
    )

    access = await db.entity_access.find_one({"user_id": user_id, "entity_id": input.entity_id})
    return _entity_access_response(access, entity.get("name"))


@router.delete("/users/{user_id}/entity-access/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_entity_access(user_id: str, entity_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    await db.entity_access.delete_one({"user_id": user_id, "entity_id": entity_id})
    return None


@router.get("/entities", response_model=list[dict])
async def list_all_entities(current_user: dict = Depends(require_admin)):
    db = get_db()
    entities = await db.entities.find({}, {"_id": 1, "name": 1, "type": 1, "owner_id": 1}).to_list(length=1000)
    return [{"id": e["_id"], "name": e.get("name"), "type": e.get("type"), "owner_id": e.get("owner_id")} for e in entities]
