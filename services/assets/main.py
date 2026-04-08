"""
BlackieFi Assets Service - Port 8005
Handles: physical assets CRUD + summary
"""
import sys, os
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.database import get_mongo_db
from shared.config import settings
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid, jwt, logging

app = FastAPI(title="BlackieFi Assets Service", version="3.0.0")
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

class AssetCreate(BaseModel):
    name: str; asset_type: str = "real_estate"; purchase_price: float = 0.0
    current_value: float = 0.0; description: Optional[str] = None
    location: Optional[str] = None

class HealthCheck(BaseModel):
    status: str = "healthy"; service: str = "assets"; version: str = "3.0.0"

@router.get("/health", response_model=HealthCheck)
async def health():
    return HealthCheck()

@router.get("/")
async def list_assets(entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    if not entity_id:
        eu = await db.entity_users.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
        entity_id = eu["entity_id"] if eu else None
    if not entity_id:
        return []
    return await db.assets.find({"entity_id": entity_id}, {"_id": 0}).to_list(200)

@router.post("/", status_code=201)
async def create_asset(data: AssetCreate, entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    if not entity_id:
        eu = await db.entity_users.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
        entity_id = eu["entity_id"] if eu else None
    aid = new_id()
    doc = {"id": aid, "entity_id": entity_id, **data.model_dump(), "created_at": now_str()}
    await db.assets.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@router.put("/{aid}")
async def update_asset(aid: str, data: AssetCreate, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.assets.update_one({"id": aid}, {"$set": {**data.model_dump(), "updated_at": now_str()}})
    return await db.assets.find_one({"id": aid}, {"_id": 0})

@router.delete("/{aid}")
async def delete_asset(aid: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.assets.delete_one({"id": aid})
    return {"status": "ok"}

@router.get("/summary")
async def asset_summary(entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    if not entity_id:
        eu = await db.entity_users.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
        entity_id = eu["entity_id"] if eu else None
    assets = await db.assets.find({"entity_id": entity_id}, {"_id": 0}).to_list(200) if entity_id else []
    return {
        "total_assets": len(assets),
        "total_value": sum(a.get("current_value", 0) for a in assets),
        "total_cost": sum(a.get("purchase_price", 0) for a in assets),
    }

app.include_router(router, prefix="/api/assets", tags=["assets"])

from starlette.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
