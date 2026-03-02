"""
Audit Logging Service - Institutional-Grade Audit Trail
Tracks all user actions for compliance and forensic analysis.
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import os
import uuid
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase


class AuditAction(str, Enum):
    """Standardized audit action types"""
    # Authentication
    LOGIN = "auth.login"
    LOGIN_FAILED = "auth.login_failed"
    LOGOUT = "auth.logout"
    MFA_ENABLED = "auth.mfa_enabled"
    MFA_DISABLED = "auth.mfa_disabled"
    PASSWORD_CHANGED = "auth.password_changed"
    PASSWORD_RESET = "auth.password_reset"
    
    # User Management
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    ROLE_CHANGED = "user.role_changed"
    
    # Entity Operations
    ENTITY_CREATED = "entity.created"
    ENTITY_UPDATED = "entity.updated"
    ENTITY_DELETED = "entity.deleted"
    ENTITY_ARCHIVED = "entity.archived"
    
    # Financial Operations
    ACCOUNT_CREATED = "account.created"
    ACCOUNT_UPDATED = "account.updated"
    ACCOUNT_DELETED = "account.deleted"
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_UPDATED = "transaction.updated"
    TRANSACTION_DELETED = "transaction.deleted"
    BUDGET_CREATED = "budget.created"
    BUDGET_UPDATED = "budget.updated"
    
    # Investment Operations
    INVESTMENT_CREATED = "investment.created"
    INVESTMENT_UPDATED = "investment.updated"
    INVESTMENT_SOLD = "investment.sold"
    ASSET_CREATED = "asset.created"
    ASSET_UPDATED = "asset.updated"
    ASSET_DELETED = "asset.deleted"
    
    # AI Operations
    AI_ANALYSIS_REQUESTED = "ai.analysis_requested"
    AI_CHAT_MESSAGE = "ai.chat_message"
    DOCUMENT_UPLOADED = "ai.document_uploaded"
    DOCUMENT_DELETED = "ai.document_deleted"
    
    # Data Operations
    DATA_EXPORTED = "data.exported"
    DATA_IMPORTED = "data.imported"
    REPORT_GENERATED = "report.generated"
    
    # Admin Operations
    SETTINGS_UPDATED = "admin.settings_updated"
    LLM_CONFIG_CHANGED = "admin.llm_config_changed"
    GROUP_CREATED = "admin.group_created"
    GROUP_UPDATED = "admin.group_updated"
    
    # Security Events
    SUSPICIOUS_ACTIVITY = "security.suspicious_activity"
    RATE_LIMIT_EXCEEDED = "security.rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "security.unauthorized_access"


class AuditSeverity(str, Enum):
    """Audit event severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLogEntry(BaseModel):
    """Structured audit log entry"""
    id: str
    timestamp: str
    action: str
    severity: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    entity_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    details: Dict[str, Any] = {}
    changes: Optional[Dict[str, Any]] = None  # Before/after for updates
    success: bool = True
    error_message: Optional[str] = None
    checksum: str  # Integrity verification


class AuditService:
    """
    Institutional-grade audit logging service.
    Provides tamper-evident logging with integrity verification.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.audit_logs
        
    async def initialize(self):
        """Create indexes for efficient querying"""
        await self.collection.create_index("timestamp")
        await self.collection.create_index("user_id")
        await self.collection.create_index("action")
        await self.collection.create_index("entity_id")
        await self.collection.create_index("resource_type")
        await self.collection.create_index("severity")
        await self.collection.create_index([("timestamp", -1), ("action", 1)])
        
    def _generate_checksum(self, data: Dict[str, Any]) -> str:
        """Generate SHA-256 checksum for integrity verification"""
        # Create deterministic JSON string
        canonical = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    def _get_severity(self, action: AuditAction) -> AuditSeverity:
        """Determine severity based on action type"""
        critical_actions = {
            AuditAction.USER_DELETED,
            AuditAction.ENTITY_DELETED,
            AuditAction.SUSPICIOUS_ACTIVITY,
            AuditAction.UNAUTHORIZED_ACCESS,
        }
        warning_actions = {
            AuditAction.LOGIN_FAILED,
            AuditAction.PASSWORD_CHANGED,
            AuditAction.MFA_DISABLED,
            AuditAction.ROLE_CHANGED,
            AuditAction.RATE_LIMIT_EXCEEDED,
            AuditAction.ACCOUNT_DELETED,
            AuditAction.TRANSACTION_DELETED,
        }
        
        if action in critical_actions:
            return AuditSeverity.CRITICAL
        elif action in warning_actions:
            return AuditSeverity.WARNING
        return AuditSeverity.INFO
    
    async def log(
        self,
        action: AuditAction,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        entity_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        changes: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        severity: Optional[AuditSeverity] = None,
    ) -> str:
        """
        Create an audit log entry.
        
        Args:
            action: The type of action being logged
            user_id: ID of the user performing the action
            user_email: Email of the user (for readability)
            entity_id: ID of the entity context
            resource_type: Type of resource affected (account, transaction, etc.)
            resource_id: ID of the specific resource
            ip_address: Client IP address
            user_agent: Client user agent string
            request_id: Correlation ID for request tracing
            details: Additional context about the action
            changes: Before/after values for update operations
            success: Whether the action succeeded
            error_message: Error details if action failed
            severity: Override auto-detected severity
            
        Returns:
            ID of the created audit log entry
        """
        entry_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Build entry data (excluding checksum for calculation)
        entry_data = {
            "id": entry_id,
            "timestamp": timestamp,
            "action": action.value if isinstance(action, AuditAction) else action,
            "severity": (severity or self._get_severity(action)).value if isinstance(severity or self._get_severity(action), AuditSeverity) else (severity or self._get_severity(action)),
            "user_id": user_id,
            "user_email": user_email,
            "entity_id": entity_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_id": request_id,
            "details": details or {},
            "changes": changes,
            "success": success,
            "error_message": error_message,
        }
        
        # Generate checksum for integrity
        checksum = self._generate_checksum(entry_data)
        entry_data["checksum"] = checksum
        entry_data["_id"] = entry_id
        
        # Store in database
        await self.collection.insert_one(entry_data)
        
        return entry_id
    
    async def verify_integrity(self, entry_id: str) -> Dict[str, Any]:
        """
        Verify the integrity of an audit log entry.
        
        Returns:
            Dict with verification status and details
        """
        entry = await self.collection.find_one({"_id": entry_id})
        if not entry:
            return {"valid": False, "error": "Entry not found"}
        
        stored_checksum = entry.pop("checksum", None)
        entry.pop("_id", None)
        entry["id"] = entry_id
        
        calculated_checksum = self._generate_checksum(entry)
        
        return {
            "valid": stored_checksum == calculated_checksum,
            "entry_id": entry_id,
            "stored_checksum": stored_checksum,
            "calculated_checksum": calculated_checksum,
            "tampered": stored_checksum != calculated_checksum,
        }
    
    async def query(
        self,
        user_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        severity: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        success_only: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Query audit logs with filters.
        
        Returns:
            Dict with logs and pagination info
        """
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        if entity_id:
            query["entity_id"] = entity_id
        if action:
            query["action"] = {"$regex": action, "$options": "i"}
        if resource_type:
            query["resource_type"] = resource_type
        if severity:
            query["severity"] = severity
        if success_only is not None:
            query["success"] = success_only
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get logs
        cursor = self.collection.find(query).sort("timestamp", -1).skip(offset).limit(limit)
        logs = []
        async for doc in cursor:
            doc["id"] = doc.pop("_id")
            logs.append(doc)
        
        return {
            "logs": logs,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }
    
    async def get_user_activity(
        self,
        user_id: str,
        days: int = 30,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get recent activity for a specific user"""
        from datetime import timedelta
        
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        cursor = self.collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": start_date},
        }).sort("timestamp", -1).limit(limit)
        
        logs = []
        async for doc in cursor:
            doc["id"] = doc.pop("_id")
            logs.append(doc)
        
        return logs
    
    async def get_security_events(
        self,
        hours: int = 24,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get recent security-related events"""
        from datetime import timedelta
        
        start_date = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        security_actions = [
            AuditAction.LOGIN_FAILED.value,
            AuditAction.SUSPICIOUS_ACTIVITY.value,
            AuditAction.RATE_LIMIT_EXCEEDED.value,
            AuditAction.UNAUTHORIZED_ACCESS.value,
            AuditAction.PASSWORD_CHANGED.value,
            AuditAction.MFA_DISABLED.value,
        ]
        
        cursor = self.collection.find({
            "action": {"$in": security_actions},
            "timestamp": {"$gte": start_date},
        }).sort("timestamp", -1).limit(limit)
        
        logs = []
        async for doc in cursor:
            doc["id"] = doc.pop("_id")
            logs.append(doc)
        
        return logs
    
    async def get_entity_audit_trail(
        self,
        entity_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get complete audit trail for an entity"""
        cursor = self.collection.find({
            "entity_id": entity_id,
        }).sort("timestamp", -1).limit(limit)
        
        logs = []
        async for doc in cursor:
            doc["id"] = doc.pop("_id")
            logs.append(doc)
        
        return logs
    
    async def get_statistics(
        self,
        days: int = 7,
    ) -> Dict[str, Any]:
        """Get audit log statistics"""
        from datetime import timedelta
        
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        # Total events
        total = await self.collection.count_documents({
            "timestamp": {"$gte": start_date}
        })
        
        # Events by severity
        severity_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        ]
        severity_counts = {}
        async for doc in self.collection.aggregate(severity_pipeline):
            severity_counts[doc["_id"]] = doc["count"]
        
        # Events by action category
        action_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {"_id": {"$substr": ["$action", 0, {"$indexOfBytes": ["$action", "."]}]}, "count": {"$sum": 1}}},
        ]
        action_counts = {}
        async for doc in self.collection.aggregate(action_pipeline):
            action_counts[doc["_id"]] = doc["count"]
        
        # Failed operations
        failed = await self.collection.count_documents({
            "timestamp": {"$gte": start_date},
            "success": False,
        })
        
        # Unique users
        unique_users = len(await self.collection.distinct("user_id", {
            "timestamp": {"$gte": start_date},
            "user_id": {"$ne": None},
        }))
        
        return {
            "period_days": days,
            "total_events": total,
            "failed_events": failed,
            "unique_users": unique_users,
            "by_severity": severity_counts,
            "by_category": action_counts,
        }


# Singleton instance
_audit_service: Optional[AuditService] = None


def get_audit_service(db: AsyncIOMotorDatabase) -> AuditService:
    """Get or create audit service instance"""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService(db)
    return _audit_service
