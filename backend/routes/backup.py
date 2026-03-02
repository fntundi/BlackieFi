"""
Backup & Recovery Routes - API endpoints for backup management
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import os
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import get_db
from routes.auth import get_current_user
from services.backup_service import get_backup_service
from services.backup_scheduler_service import get_backup_scheduler_service, BackupFrequency
from services.audit_service import get_audit_service, AuditAction

router = APIRouter(prefix="/api/admin/backup", tags=["Backup & Recovery"])


class BackupRequest(BaseModel):
    """Request to create a backup"""
    backup_type: str = "full"  # full, critical
    compress: bool = True
    include_audit: bool = True


class RestoreRequest(BaseModel):
    """Request to restore from backup"""
    backup_name: str
    collections: Optional[List[str]] = None
    drop_existing: bool = False


class CleanupRequest(BaseModel):
    """Request to cleanup old backups"""
    retention_days: int = 30
    keep_minimum: int = 5


def is_admin(current_user: dict) -> bool:
    """Check if user is admin"""
    return current_user.get("role") == "admin"


def get_user_id(current_user: dict) -> str:
    """Get user ID from current_user dict"""
    return current_user.get("id") or current_user.get("_id") or current_user.get("user_id")


# =============================================================================
# BACKUP ENDPOINTS (Admin Only)
# =============================================================================

@router.post("/create")
async def create_backup(
    request: BackupRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Create a database backup.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_service = get_backup_service(db)
    audit_service = get_audit_service(db)
    
    # Create backup
    result = await backup_service.create_backup(
        backup_type=request.backup_type,
        compress=request.compress,
        include_audit=request.include_audit,
    )
    
    # Log the action
    await audit_service.log(
        action=AuditAction.DATA_EXPORTED,
        user_id=get_user_id(current_user),
        user_email=current_user.get("email"),
        resource_type="backup",
        resource_id=result.get("backup_name"),
        details={
            "backup_type": request.backup_type,
            "compressed": request.compress,
            "statistics": result.get("statistics"),
        },
    )
    
    return result


@router.get("/list")
async def list_backups(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    List all available backups.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_service = get_backup_service(db)
    backups = await backup_service.list_backups()
    
    return {
        "backups": backups,
        "count": len(backups),
    }


@router.post("/restore")
async def restore_backup(
    request: RestoreRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Restore from a backup.
    Admin only. Use with caution!
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_service = get_backup_service(db)
    audit_service = get_audit_service(db)
    
    # Find the backup
    backups = await backup_service.list_backups()
    backup_path = None
    for backup in backups:
        if backup["name"].startswith(request.backup_name):
            backup_path = backup["path"]
            break
    
    if not backup_path:
        raise HTTPException(status_code=404, detail=f"Backup not found: {request.backup_name}")
    
    # Restore
    result = await backup_service.restore_backup(
        backup_path=backup_path,
        collections=request.collections,
        drop_existing=request.drop_existing,
    )
    
    # Log the action
    await audit_service.log(
        action=AuditAction.DATA_IMPORTED,
        user_id=get_user_id(current_user),
        user_email=current_user.get("email"),
        resource_type="backup",
        resource_id=request.backup_name,
        details={
            "collections_restored": request.collections,
            "drop_existing": request.drop_existing,
            "statistics": result.get("statistics"),
        },
    )
    
    return result


@router.delete("/{backup_name}")
async def delete_backup(
    backup_name: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Delete a backup.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_service = get_backup_service(db)
    audit_service = get_audit_service(db)
    
    result = await backup_service.delete_backup(backup_name)
    
    if result["success"]:
        await audit_service.log(
            action=AuditAction.SETTINGS_UPDATED,
            user_id=get_user_id(current_user),
            user_email=current_user.get("email"),
            resource_type="backup",
            resource_id=backup_name,
            details={"action": "deleted"},
        )
    
    return result


@router.post("/cleanup")
async def cleanup_old_backups(
    request: CleanupRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Clean up old backups based on retention policy.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_service = get_backup_service(db)
    audit_service = get_audit_service(db)
    
    result = await backup_service.cleanup_old_backups(
        retention_days=request.retention_days,
        keep_minimum=request.keep_minimum,
    )
    
    await audit_service.log(
        action=AuditAction.SETTINGS_UPDATED,
        user_id=get_user_id(current_user),
        user_email=current_user.get("email"),
        resource_type="backup",
        details={
            "action": "cleanup",
            "retention_days": request.retention_days,
            "deleted": result.get("deleted", []),
        },
    )
    
    return result


@router.get("/stats")
async def get_database_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Get database statistics for monitoring.
    Admin only.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_service = get_backup_service(db)
    stats = await backup_service.get_database_stats()
    
    return stats


# =============================================================================
# USER DATA EXPORT (GDPR)
# =============================================================================

@router.post("/export-my-data")
async def export_my_data(
    include_ai_data: bool = Query(True),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Export all data for the current user (GDPR compliance).
    Available to all users for their own data.
    """
    user_id = get_user_id(current_user)
    
    backup_service = get_backup_service(db)
    audit_service = get_audit_service(db)
    
    result = await backup_service.export_user_data(
        user_id=user_id,
        include_ai_data=include_ai_data,
    )
    
    await audit_service.log(
        action=AuditAction.DATA_EXPORTED,
        user_id=user_id,
        user_email=current_user.get("email"),
        resource_type="user_data",
        resource_id=user_id,
        details={
            "include_ai_data": include_ai_data,
            "export_path": result.get("export_path"),
        },
    )
    
    return result


@router.get("/download/{backup_name}")
async def download_backup(
    backup_name: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Download a backup file.
    Admin only for full backups, users can download their own exports.
    """
    user_id = get_user_id(current_user)
    
    backup_service = get_backup_service(db)
    backups = await backup_service.list_backups()
    
    # Find the backup
    backup_path = None
    for backup in backups:
        if backup["name"].startswith(backup_name):
            backup_path = backup["path"]
            break
    
    if not backup_path:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Check permissions
    is_user_export = f"user_export_{user_id}" in backup_name
    if not is_admin(current_user) and not is_user_export:
        raise HTTPException(status_code=403, detail="Access denied")
    
    import os
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    return FileResponse(
        path=backup_path,
        filename=os.path.basename(backup_path),
        media_type="application/octet-stream",
    )
