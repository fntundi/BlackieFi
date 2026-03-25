"""
Entity routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Response
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import (
    EntityInput,
    EntityResponse,
    EntityDetailsResponse,
    EntityDetailsUpdateInput,
    BusinessEntityDetailsInput,
    PersonalEntityDetailsInput,
    EntityDocumentResponse
)
from auth import get_current_user
from services.storage_service import storage_enabled, put_object, get_object, build_storage_path, normalize_storage_config
from services.rbac_service import ensure_entity_access, get_accessible_entity_ids

router = APIRouter()


def _entity_response(entity: dict) -> dict:
    return {
        "id": entity["_id"],
        "owner_id": entity["owner_id"],
        "name": entity["name"],
        "type": entity["type"],
        "created_at": entity["created_at"],
        "updated_at": entity["updated_at"]
    }

async def _get_storage_config(db) -> dict:
    settings = await db.system_settings.find_one({"_id": "system"})
    config = settings.get("object_storage", {}) if settings else {}
    return normalize_storage_config(config)



def _details_payload(details_doc: Optional[dict]) -> Optional[dict]:
    if not details_doc:
        return None
    excluded = {"_id", "entity_id", "owner_id", "created_at", "updated_at"}
    return {k: v for k, v in details_doc.items() if k not in excluded}


def _document_response(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "entity_id": doc["entity_id"],
        "owner_id": doc["owner_id"],
        "document_type": doc["document_type"],
        "title": doc["title"],
        "original_filename": doc["original_filename"],
        "content_type": doc["content_type"],
        "size": doc["size"],
        "storage_path": doc["storage_path"],
        "uploaded_at": doc["uploaded_at"],
        "notes": doc.get("notes"),
        "tags": doc.get("tags", [])
    }


async def _ensure_details(db, entity: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    owner_id = entity.get("owner_id")
    if entity["type"] == "business":
        details = await db.business_entities.find_one({"entity_id": entity["_id"], "owner_id": owner_id})
        if not details:
            details = {
                "_id": str(ObjectId()),
                "entity_id": entity["_id"],
                "owner_id": owner_id,
                "created_at": now,
                "updated_at": now
            }
            await db.business_entities.insert_one(details)
        return details
    details = await db.personal_entities.find_one({"entity_id": entity["_id"], "owner_id": owner_id})
    if not details:
        details = {
            "_id": str(ObjectId()),
            "entity_id": entity["_id"],
            "owner_id": owner_id,
            "created_at": now,
            "updated_at": now
        }
        await db.personal_entities.insert_one(details)
    return details


@router.get("", response_model=List[EntityResponse])
async def list_entities(current_user: dict = Depends(get_current_user)):
    """List all entities for the current user"""
    db = get_db()
    user_id = current_user.get("user_id")

    entity_ids = await get_accessible_entity_ids(db, user_id, feature="entities")
    if not entity_ids:
        return []

    entities = await db.entities.find({"_id": {"$in": entity_ids}}).to_list(length=100)

    return [_entity_response(e) for e in entities]


@router.post("", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(input: EntityInput, current_user: dict = Depends(get_current_user)):
    """Create a new entity"""
    db = get_db()
    user_id = current_user.get("user_id")
    now = datetime.now(timezone.utc).isoformat()

    if input.type == "business" and input.personal_details:
        raise HTTPException(status_code=400, detail="personal_details not allowed for business entities")
    if input.type == "personal" and input.business_details:
        raise HTTPException(status_code=400, detail="business_details not allowed for personal entities")

    entity_id = str(ObjectId())
    entity_doc = {
        "_id": entity_id,
        "owner_id": user_id,
        "name": input.name,
        "type": input.type,
        "created_at": now,
        "updated_at": now
    }

    await db.entities.insert_one(entity_doc)

    if input.type == "business":
        details_payload = input.business_details.dict() if input.business_details else {}
        await db.business_entities.insert_one({
            "_id": str(ObjectId()),
            "entity_id": entity_id,
            "owner_id": user_id,
            "created_at": now,
            "updated_at": now,
            **details_payload
        })
    else:
        details_payload = input.personal_details.dict() if input.personal_details else {}
        await db.personal_entities.insert_one({
            "_id": str(ObjectId()),
            "entity_id": entity_id,
            "owner_id": user_id,
            "created_at": now,
            "updated_at": now,
            **details_payload
        })

    return _entity_response(entity_doc)


@router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific entity"""
    db = get_db()
    user_id = current_user.get("user_id")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await ensure_entity_access(db, user_id, entity_id, "entities")

    return _entity_response(entity)


@router.put("/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, input: EntityInput, current_user: dict = Depends(get_current_user)):
    """Update an entity"""
    db = get_db()
    user_id = current_user.get("user_id")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    user = await db.users.find_one({"_id": user_id})
    if not user or (user.get("role") != "admin" and entity.get("owner_id") != user_id):
        raise HTTPException(status_code=403, detail="Only the owner or admin can update an entity")

    if input.type != entity["type"]:
        raise HTTPException(status_code=400, detail="Entity type cannot be changed")

    now = datetime.now(timezone.utc).isoformat()
    await db.entities.update_one(
        {"_id": entity_id},
        {"$set": {
            "name": input.name,
            "updated_at": now
        }}
    )

    entity["name"] = input.name
    entity["updated_at"] = now
    return _entity_response(entity)


@router.get("/{entity_id}/details", response_model=EntityDetailsResponse)
async def get_entity_details(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Get entity details"""
    db = get_db()
    user_id = current_user.get("user_id")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await ensure_entity_access(db, user_id, entity_id, "entities")

    details = await _ensure_details(db, entity)

    return {
        "entity": _entity_response(entity),
        "business_details": _details_payload(details) if entity["type"] == "business" else None,
        "personal_details": _details_payload(details) if entity["type"] == "personal" else None
    }


@router.put("/{entity_id}/details", response_model=EntityDetailsResponse)
async def update_entity_details(
    entity_id: str,
    input: EntityDetailsUpdateInput,
    current_user: dict = Depends(get_current_user)
):
    """Update entity details"""
    db = get_db()
    user_id = current_user.get("user_id")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await ensure_entity_access(db, user_id, entity_id, "entities")

    now = datetime.now(timezone.utc).isoformat()

    if entity["type"] == "business":
        if not input.business_details:
            raise HTTPException(status_code=400, detail="business_details required")
        update_data = input.business_details.dict(exclude_unset=True)
        await db.business_entities.update_one(
            {"entity_id": entity_id, "owner_id": user_id},
            {
                "$set": {**update_data, "updated_at": now},
                "$setOnInsert": {
                    "_id": str(ObjectId()),
                    "entity_id": entity_id,
                    "owner_id": user_id,
                    "created_at": now
                }
            },
            upsert=True
        )
    else:
        if not input.personal_details:
            raise HTTPException(status_code=400, detail="personal_details required")
        update_data = input.personal_details.dict(exclude_unset=True)
        await db.personal_entities.update_one(
            {"entity_id": entity_id, "owner_id": user_id},
            {
                "$set": {**update_data, "updated_at": now},
                "$setOnInsert": {
                    "_id": str(ObjectId()),
                    "entity_id": entity_id,
                    "owner_id": user_id,
                    "created_at": now
                }
            },
            upsert=True
        )

    details = await _ensure_details(db, entity)

    return {
        "entity": _entity_response(entity),
        "business_details": _details_payload(details) if entity["type"] == "business" else None,
        "personal_details": _details_payload(details) if entity["type"] == "personal" else None
    }


@router.get("/{entity_id}/documents", response_model=List[EntityDocumentResponse])
async def list_entity_documents(entity_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.get("user_id")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await ensure_entity_access(db, user_id, entity_id, "documents")

    documents = await db.entity_documents.find({
        "entity_id": entity_id,
        "is_deleted": False
    }).to_list(length=200)

    return [_document_response(doc) for doc in documents]


@router.post("/{entity_id}/documents", response_model=EntityDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_entity_document(
    entity_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    title: str = Form(...),
    notes: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_id = current_user.get("user_id")

    storage_config = await _get_storage_config(db)
    if not storage_enabled(storage_config):
        raise HTTPException(status_code=503, detail="Object storage not configured. Update settings in Admin > Object Storage.")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await ensure_entity_access(db, user_id, entity_id, "documents")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "bin"
    storage_path = build_storage_path(storage_config, user_id, entity_id, ext)
    result = put_object(storage_config, storage_path, file_bytes, file.content_type or "application/octet-stream")

    now = datetime.now(timezone.utc).isoformat()
    doc_id = str(ObjectId())
    tag_list = [t.strip() for t in (tags or "").split(",") if t.strip()]

    doc = {
        "_id": doc_id,
        "entity_id": entity_id,
        "owner_id": entity["owner_id"],
        "document_type": document_type,
        "title": title,
        "original_filename": file.filename or title,
        "content_type": file.content_type or "application/octet-stream",
        "size": result.get("size", len(file_bytes)),
        "storage_path": result.get("path", storage_path),
        "uploaded_at": now,
        "notes": notes,
        "tags": tag_list,
        "is_deleted": False
    }

    await db.entity_documents.insert_one(doc)

    return _document_response(doc)


@router.get("/documents/{document_id}/download")
async def download_entity_document(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.get("user_id")

    doc = await db.entity_documents.find_one({"_id": document_id, "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await ensure_entity_access(db, user_id, doc["entity_id"], "documents")

    storage_config = await _get_storage_config(db)
    if not storage_enabled(storage_config):
        raise HTTPException(status_code=503, detail="Object storage not configured. Update settings in Admin > Object Storage.")

    data, content_type = get_object(storage_config, doc["storage_path"])
    return Response(content=data, media_type=doc.get("content_type", content_type))


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entity_document(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.get("user_id")

    doc = await db.entity_documents.find_one({"_id": document_id, "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await ensure_entity_access(db, user_id, doc["entity_id"], "documents")

    result = await db.entity_documents.update_one(
        {"_id": document_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return None


@router.delete("/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entity(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an entity"""
    db = get_db()
    user_id = current_user.get("user_id")

    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    user = await db.users.find_one({"_id": user_id})
    if not user or (user.get("role") != "admin" and entity.get("owner_id") != user_id):
        raise HTTPException(status_code=403, detail="Only the owner or admin can delete an entity")

    await db.entities.delete_one({"_id": entity_id})

    await db.business_entities.delete_many({"entity_id": entity_id})
    await db.personal_entities.delete_many({"entity_id": entity_id})
    await db.entity_access.delete_many({"entity_id": entity_id})
    await db.entity_documents.update_many(
        {"entity_id": entity_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return None
