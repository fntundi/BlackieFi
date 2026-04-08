"""
BlackieFi Entity Service - Port 8003
Handles: entity CRUD, entity user management (invite, roles, deactivate)
"""
import sys, os
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.database import get_mongo_db
from shared.config import settings
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid, jwt, logging

app = FastAPI(title="BlackieFi Entity Service", version="3.0.0")
router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

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

class EntityCreate(BaseModel):
    name: str; entity_type: str = "personal"; business_type: Optional[str] = None
    jurisdiction: Optional[str] = None; description: Optional[str] = None

class InviteRequest(BaseModel):
    email: str; role_name: str = "regular_user"

class HealthCheck(BaseModel):
    status: str = "healthy"; service: str = "entity"; version: str = "3.0.0"

@router.get("/health", response_model=HealthCheck)
async def health():
    return HealthCheck()

@router.get("/")
async def list_entities(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    eids = [eu["entity_id"] for eu in eus]
    entities = await db.entities.find({"id": {"$in": eids}}, {"_id": 0}).to_list(100)
    return entities

@router.post("/", status_code=201)
async def create_entity(data: EntityCreate, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eid = new_id()
    n = now_str()
    doc = {"id": eid, "name": data.name, "entity_type": data.entity_type,
           "business_type": data.business_type, "jurisdiction": data.jurisdiction,
           "description": data.description, "owner_id": user_id, "status": "active",
           "is_personal": data.entity_type == "personal", "created_at": n, "updated_at": n}
    await db.entities.insert_one(doc)
    admin_role = await db.roles.find_one({"name": "admin"}, {"_id": 0})
    if admin_role:
        await db.entity_users.insert_one({
            "id": new_id(), "entity_id": eid, "user_id": user_id,
            "role_id": admin_role["id"], "role_name": "admin", "is_active": True,
            "invited_by": user_id, "created_at": n
        })
    return {k: v for k, v in doc.items() if k != "_id"}

@router.get("/{eid}")
async def get_entity(eid: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    entity = await db.entities.find_one({"id": eid}, {"_id": 0})
    if not entity:
        raise HTTPException(404, "Entity not found")
    return entity

@router.delete("/{eid}")
async def delete_entity(eid: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    entity = await db.entities.find_one({"id": eid}, {"_id": 0})
    if not entity:
        raise HTTPException(404, "Entity not found")
    if entity.get("is_personal"):
        raise HTTPException(400, "Cannot delete personal entity")
    await db.entities.delete_one({"id": eid})
    await db.entity_users.delete_many({"entity_id": eid})
    return {"status": "ok"}

@router.get("/{eid}/users")
async def list_entity_users(eid: str, entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eid = entity_id or eid
    eus = await db.entity_users.find({"entity_id": eid}, {"_id": 0}).to_list(200)
    enriched = []
    for eu in eus:
        user = await db.users.find_one({"id": eu["user_id"]}, {"_id": 0})
        role = await db.roles.find_one({"id": eu.get("role_id")}, {"_id": 0})
        enriched.append({
            **eu, "user_name": user.get("full_name", "") if user else "",
            "user_email": user.get("email", "") if user else "",
            "role_name": role.get("name", "") if role else eu.get("role_name", ""),
        })
    return enriched

@router.post("/{eid}/invite")
async def invite_user(eid: str, data: InviteRequest, entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eid = entity_id or eid
    target = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    existing = await db.entity_users.find_one({"entity_id": eid, "user_id": target["id"]})
    if existing:
        raise HTTPException(400, "User already in entity")
    role = await db.roles.find_one({"name": data.role_name}, {"_id": 0})
    await db.entity_users.insert_one({
        "id": new_id(), "entity_id": eid, "user_id": target["id"],
        "role_id": role["id"] if role else None, "role_name": data.role_name,
        "is_active": True, "invited_by": user_id, "created_at": now_str()
    })
    return {"status": "ok", "message": f"Invited {data.email}"}

@router.put("/{eid}/users/{uid}/role")
async def change_user_role(eid: str, uid: str, role_name: str = Query(...), entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eid = entity_id or eid
    role = await db.roles.find_one({"name": role_name}, {"_id": 0})
    await db.entity_users.update_one(
        {"entity_id": eid, "user_id": uid},
        {"$set": {"role_id": role["id"] if role else None, "role_name": role_name}}
    )
    return {"status": "ok"}

app.include_router(router, prefix="/api/entities", tags=["entities"])

from starlette.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
