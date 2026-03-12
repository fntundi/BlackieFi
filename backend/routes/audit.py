"""
Audit Log Routes - API endpoints for audit log management
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import os
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel

from database import get_db
from routes.auth import get_current_user
from services.audit_service import get_audit_service, AuditAction, AuditSeverity

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


class AuditLogQuery(BaseModel):
    """Query parameters for audit logs"""
    user_id: Optional[str] = None
    entity_id: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    severity: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    success_only: Optional[bool] = None
    limit: int = 100
    offset: int = 0


def get_user_id(current_user: dict) -> str:
    """Get user ID from current_user dict"""
    return current_user.get("id") or current_user.get("_id") or current_user.get("user_id")


def is_admin(current_user: dict) -> bool:
    """Check if user is admin"""
    return current_user.get("role") == "admin"


# =============================================================================
# AUDIT LOG ENDPOINTS
# =============================================================================

@router.get("/logs")
async def get_audit_logs(
    user_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    success_only: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Query audit logs with filters.
    Admin users can see all logs, regular users only see their own.
    """
    audit_service = get_audit_service(db)
    
    # Non-admin users can only see their own logs
    if not is_admin(current_user):
        user_id = get_user_id(current_user)
    
    result = await audit_service.query(
        user_id=user_id,
        entity_id=entity_id,
        action=action,
        resource_type=resource_type,
        severity=severity,
        start_date=start_date,
        end_date=end_date,
        success_only=success_only,
        limit=limit,
        offset=offset,
    )
    
    return result


@router.get("/logs/{entry_id}")
async def get_audit_log_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get a specific audit log entry"""
    collection = db.audit_logs
    entry = await collection.find_one({"_id": entry_id})
    
    if not entry:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    
    # Non-admin users can only see their own logs
    if not is_admin(current_user) and entry.get("user_id") != get_user_id(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    entry["id"] = entry.pop("_id")
    return entry


@router.get("/logs/{entry_id}/verify")
async def verify_audit_log_integrity(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Verify the integrity of an audit log entry.
    Checks if the entry has been tampered with.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    audit_service = get_audit_service(db)
    result = await audit_service.verify_integrity(entry_id)
    
    return result


@router.get("/my-activity")
async def get_my_activity(
    days: int = Query(30, le=90),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get current user's recent activity"""
    audit_service = get_audit_service(db)
    user_id = get_user_id(current_user)
    
    logs = await audit_service.get_user_activity(user_id, days, limit)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "activity": logs,
    }


@router.get("/security-events")
async def get_security_events(
    hours: int = Query(24, le=168),  # Max 7 days
    limit: int = Query(100, le=500),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Get recent security-related events.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    audit_service = get_audit_service(db)
    events = await audit_service.get_security_events(hours, limit)
    
    return {
        "period_hours": hours,
        "events": events,
        "count": len(events),
    }


@router.get("/entity/{entity_id}/trail")
async def get_entity_audit_trail(
    entity_id: str,
    limit: int = Query(100, le=500),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get complete audit trail for an entity"""
    # Verify user has access to entity
    entity = await db.entities.find_one({"_id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    if not is_admin(current_user) and entity.get("owner_id") != get_user_id(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    audit_service = get_audit_service(db)
    trail = await audit_service.get_entity_audit_trail(entity_id, limit)
    
    return {
        "entity_id": entity_id,
        "entity_name": entity.get("name"),
        "audit_trail": trail,
        "count": len(trail),
    }


@router.get("/statistics")
async def get_audit_statistics(
    days: int = Query(7, le=30),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Get audit log statistics.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    audit_service = get_audit_service(db)
    stats = await audit_service.get_statistics(days)
    
    return stats


@router.get("/actions")
async def get_audit_actions(
    current_user: dict = Depends(get_current_user),
):
    """Get list of all audit action types"""
    actions = {}
    for action in AuditAction:
        category = action.value.split(".")[0]
        if category not in actions:
            actions[category] = []
        actions[category].append({
            "value": action.value,
            "name": action.name,
        })
    
    return {
        "actions": actions,
        "severities": [s.value for s in AuditSeverity],
    }
