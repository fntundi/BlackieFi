"""RBAC and entity access helpers"""
from typing import List, Optional, Set
from fastapi import HTTPException

ROLE_FEATURES = {
    "admin": {"*"},
    "accountant": {
        "entities",
        "accounts",
        "categories",
        "transactions",
        "recurring",
        "budgets",
        "debts",
        "investments",
        "assets",
        "inventory",
        "goals",
        "bills",
        "reports",
        "tax",
        "documents",
        "imports"
    },
    "user": {
        "entities",
        "accounts",
        "categories",
        "transactions",
        "recurring",
        "budgets",
        "debts",
        "investments",
        "assets",
        "inventory",
        "goals",
        "bills",
        "reports",
        "tax",
        "documents",
        "imports",
        "ai",
        "notifications"
    }
}


def _feature_allowed(role: str, feature: str) -> bool:
    features = ROLE_FEATURES.get(role, set())
    return "*" in features or feature in features


async def ensure_entity_access(db, user_id: str, entity_id: str, feature: str) -> dict:
    """Ensure the user can access the entity and feature"""
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=403, detail="Access denied")

    if user.get("role") == "admin":
        return {"role": "admin", "entity_id": entity_id, "user_id": user_id}

    entity = await db.entities.find_one({"_id": entity_id})
    if entity and entity.get("owner_id") == user_id:
        return {"role": "owner", "entity_id": entity_id, "user_id": user_id}

    access = await db.entity_access.find_one({"entity_id": entity_id, "user_id": user_id})
    if not access:
        raise HTTPException(status_code=403, detail="Entity access required")

    role = access.get("role", "user")
    if not _feature_allowed(role, feature):
        raise HTTPException(status_code=403, detail="Insufficient permissions for this feature")

    return access


async def get_accessible_entity_ids(db, user_id: str, feature: Optional[str] = None) -> List[str]:
    """Return entity IDs user can access for a feature"""
    user = await db.users.find_one({"_id": user_id})
    if not user:
        return []

    if user.get("role") == "admin":
        entities = await db.entities.find({}, {"_id": 1}).to_list(length=1000)
        return [e["_id"] for e in entities]

    owned = await db.entities.find({"owner_id": user_id}, {"_id": 1}).to_list(length=1000)
    owned_ids = {e["_id"] for e in owned}

    access_query = {"user_id": user_id}
    access_entries = await db.entity_access.find(access_query).to_list(length=1000)

    allowed_access_ids = set()
    for entry in access_entries:
        role = entry.get("role", "user")
        if feature is None or _feature_allowed(role, feature):
            allowed_access_ids.add(entry["entity_id"])

    return list(owned_ids.union(allowed_access_ids))
