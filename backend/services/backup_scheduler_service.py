"""
Backup Scheduler Service - Automated backup scheduling
Part of BlackieFi 3.0 Institutional Hardening
"""
import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from enum import Enum
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.backup_service import get_backup_service
from services.audit_service import get_audit_service, AuditAction


class BackupFrequency(str, Enum):
    """Backup frequency options"""
    DISABLED = "disabled"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class BackupSchedulerService:
    """
    Automated backup scheduler.
    Handles scheduled backups and cleanup.
    """
    
    # Default schedule times
    DEFAULT_SCHEDULES = {
        BackupFrequency.DAILY: {"hour": 2, "minute": 0},      # 2:00 AM
        BackupFrequency.WEEKLY: {"day_of_week": "sun", "hour": 2, "minute": 0},  # Sunday 2:00 AM
        BackupFrequency.MONTHLY: {"day": 1, "hour": 2, "minute": 0},  # 1st of month 2:00 AM
    }
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.scheduler = AsyncIOScheduler()
        self._started = False
    
    async def initialize(self):
        """Initialize scheduler with saved settings"""
        if self._started:
            return
        
        # Get current schedule settings
        settings = await self.get_schedule_settings()
        
        if settings.get("enabled") and settings.get("frequency") != BackupFrequency.DISABLED.value:
            await self._schedule_backup(settings)
        
        # Also schedule cleanup job (runs daily at 3 AM)
        self.scheduler.add_job(
            self._run_cleanup,
            CronTrigger(hour=3, minute=0),
            id="backup_cleanup",
            replace_existing=True,
        )
        
        if not self.scheduler.running:
            self.scheduler.start()
        
        self._started = True
    
    async def get_schedule_settings(self) -> Dict[str, Any]:
        """Get current backup schedule settings"""
        settings = await self.db.backup_schedule.find_one({"_id": "schedule"})
        
        if not settings:
            # Return defaults
            return {
                "enabled": False,
                "frequency": BackupFrequency.DISABLED.value,
                "backup_type": "full",
                "retention_days": 30,
                "keep_minimum": 5,
                "last_backup": None,
                "next_backup": None,
            }
        
        settings.pop("_id", None)
        return settings
    
    async def update_schedule(
        self,
        enabled: bool,
        frequency: str,
        backup_type: str = "full",
        retention_days: int = 30,
        keep_minimum: int = 5,
        custom_hour: Optional[int] = None,
        custom_minute: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Update backup schedule settings"""
        # Validate frequency
        try:
            freq_enum = BackupFrequency(frequency)
        except ValueError:
            return {"error": f"Invalid frequency. Must be one of: {[f.value for f in BackupFrequency]}"}
        
        # Calculate next backup time
        next_backup = None
        if enabled and freq_enum != BackupFrequency.DISABLED:
            schedule_config = self.DEFAULT_SCHEDULES.get(freq_enum, {}).copy()
            if custom_hour is not None:
                schedule_config["hour"] = custom_hour
            if custom_minute is not None:
                schedule_config["minute"] = custom_minute
            
            # Calculate next run time
            trigger = CronTrigger(**schedule_config)
            next_backup = trigger.get_next_fire_time(None, datetime.now(timezone.utc))
            if next_backup:
                next_backup = next_backup.isoformat()
        
        # Save settings
        settings = {
            "enabled": enabled,
            "frequency": frequency,
            "backup_type": backup_type,
            "retention_days": retention_days,
            "keep_minimum": keep_minimum,
            "custom_hour": custom_hour,
            "custom_minute": custom_minute,
            "next_backup": next_backup,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.db.backup_schedule.update_one(
            {"_id": "schedule"},
            {"$set": settings},
            upsert=True
        )
        
        # Update scheduler
        if enabled and freq_enum != BackupFrequency.DISABLED:
            await self._schedule_backup(settings)
        else:
            self._remove_backup_job()
        
        return {
            "success": True,
            "settings": settings,
        }
    
    async def _schedule_backup(self, settings: Dict[str, Any]):
        """Schedule the backup job"""
        freq_enum = BackupFrequency(settings["frequency"])
        
        if freq_enum == BackupFrequency.DISABLED:
            self._remove_backup_job()
            return
        
        schedule_config = self.DEFAULT_SCHEDULES.get(freq_enum, {}).copy()
        
        # Apply custom time if set
        if settings.get("custom_hour") is not None:
            schedule_config["hour"] = settings["custom_hour"]
        if settings.get("custom_minute") is not None:
            schedule_config["minute"] = settings["custom_minute"]
        
        # Add the job
        self.scheduler.add_job(
            self._run_scheduled_backup,
            CronTrigger(**schedule_config),
            id="scheduled_backup",
            replace_existing=True,
        )
    
    def _remove_backup_job(self):
        """Remove scheduled backup job"""
        try:
            self.scheduler.remove_job("scheduled_backup")
        except Exception:
            pass  # Job doesn't exist
    
    async def _run_scheduled_backup(self):
        """Execute scheduled backup"""
        settings = await self.get_schedule_settings()
        backup_type = settings.get("backup_type", "full")
        
        backup_service = get_backup_service(self.db)
        audit_service = get_audit_service(self.db)
        
        try:
            # Create backup
            result = await backup_service.create_backup(
                backup_type=backup_type,
                compress=True,
                include_audit=True,
            )
            
            # Log audit
            await audit_service.log(
                action=AuditAction.DATA_EXPORTED,
                resource_type="scheduled_backup",
                resource_id=result.get("backup_name"),
                details={
                    "type": "scheduled",
                    "backup_type": backup_type,
                    "statistics": result.get("statistics"),
                },
            )
            
            # Update last backup time
            await self.db.backup_schedule.update_one(
                {"_id": "schedule"},
                {"$set": {
                    "last_backup": datetime.now(timezone.utc).isoformat(),
                    "last_backup_name": result.get("backup_name"),
                    "last_backup_success": True,
                }}
            )
            
        except Exception as e:
            # Log failure
            await audit_service.log(
                action=AuditAction.DATA_EXPORTED,
                resource_type="scheduled_backup",
                details={"type": "scheduled", "error": str(e)},
                success=False,
                error_message=str(e),
            )
            
            await self.db.backup_schedule.update_one(
                {"_id": "schedule"},
                {"$set": {
                    "last_backup": datetime.now(timezone.utc).isoformat(),
                    "last_backup_success": False,
                    "last_backup_error": str(e),
                }}
            )
    
    async def _run_cleanup(self):
        """Execute scheduled cleanup"""
        settings = await self.get_schedule_settings()
        
        if not settings.get("enabled"):
            return
        
        retention_days = settings.get("retention_days", 30)
        keep_minimum = settings.get("keep_minimum", 5)
        
        backup_service = get_backup_service(self.db)
        
        try:
            await backup_service.cleanup_old_backups(
                retention_days=retention_days,
                keep_minimum=keep_minimum,
            )
        except Exception:
            pass  # Cleanup failures are non-critical
    
    async def get_backup_history(self, limit: int = 10) -> list:
        """Get recent backup history from audit logs"""
        cursor = self.db.audit_logs.find({
            "action": AuditAction.DATA_EXPORTED.value,
            "resource_type": {"$in": ["backup", "scheduled_backup"]},
        }).sort("timestamp", -1).limit(limit)
        
        history = []
        async for doc in cursor:
            history.append({
                "timestamp": doc.get("timestamp"),
                "type": doc.get("details", {}).get("type", "manual"),
                "backup_name": doc.get("resource_id"),
                "success": doc.get("success", True),
                "error": doc.get("error_message"),
            })
        
        return history
    
    async def trigger_manual_backup(self, backup_type: str = "full") -> Dict[str, Any]:
        """Trigger a manual backup immediately"""
        backup_service = get_backup_service(self.db)
        
        result = await backup_service.create_backup(
            backup_type=backup_type,
            compress=True,
            include_audit=True,
        )
        
        return result


# Singleton instance
_scheduler_service: Optional[BackupSchedulerService] = None


def get_backup_scheduler_service(db: AsyncIOMotorDatabase) -> BackupSchedulerService:
    """Get or create backup scheduler service instance"""
    global _scheduler_service
    if _scheduler_service is None:
        _scheduler_service = BackupSchedulerService(db)
    return _scheduler_service
