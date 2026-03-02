"""
Backup & Disaster Recovery Service
Provides automated backup and recovery procedures.
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import os
import json
import gzip
import shutil
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from pathlib import Path
import subprocess
from motor.motor_asyncio import AsyncIOMotorDatabase


class BackupService:
    """
    Backup and disaster recovery service.
    Handles database backups, exports, and recovery procedures.
    """
    
    # Collections to backup
    CRITICAL_COLLECTIONS = [
        "users",
        "entities",
        "accounts",
        "transactions",
        "budgets",
        "investments",
        "investment_holdings",
        "assets",
        "real_estate",
        "tax_liens",
        "private_equity",
        "precious_metals",
        "debts",
        "goals",
        "recurring_transactions",
        "bills",
    ]
    
    SUPPORTING_COLLECTIONS = [
        "categories",
        "notifications",
        "notification_preferences",
        "system_settings",
        "groups",
        "financial_profiles",
        "tax_scenarios",
        "import_batches",
    ]
    
    AI_COLLECTIONS = [
        "knowledge_documents",
        "knowledge_chat_history",
        "strategy_analyses",
        "strategy_comparisons",
        "analysis_lab_history",
    ]
    
    AUDIT_COLLECTIONS = [
        "audit_logs",
    ]
    
    def __init__(self, db: AsyncIOMotorDatabase, backup_dir: str = "/app/backups"):
        self.db = db
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    async def create_backup(
        self,
        backup_type: str = "full",
        compress: bool = True,
        include_audit: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a database backup.
        
        Args:
            backup_type: "full", "critical", "incremental"
            compress: Whether to compress the backup
            include_audit: Whether to include audit logs
            
        Returns:
            Backup metadata including path and statistics
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_name = f"blackiefi_backup_{backup_type}_{timestamp}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)
        
        # Determine collections to backup
        collections = []
        if backup_type == "full":
            collections = (
                self.CRITICAL_COLLECTIONS + 
                self.SUPPORTING_COLLECTIONS + 
                self.AI_COLLECTIONS
            )
            if include_audit:
                collections += self.AUDIT_COLLECTIONS
        elif backup_type == "critical":
            collections = self.CRITICAL_COLLECTIONS
        
        # Backup each collection
        stats = {
            "collections": {},
            "total_documents": 0,
            "total_size_bytes": 0,
        }
        
        for collection_name in collections:
            collection = self.db[collection_name]
            
            # Export collection to JSON
            documents = []
            async for doc in collection.find({}):
                # Convert ObjectId to string for JSON serialization
                doc["_id"] = str(doc["_id"])
                documents.append(doc)
            
            # Write to file
            collection_file = backup_path / f"{collection_name}.json"
            with open(collection_file, "w") as f:
                json.dump(documents, f, default=str, indent=2)
            
            file_size = collection_file.stat().st_size
            stats["collections"][collection_name] = {
                "documents": len(documents),
                "size_bytes": file_size,
            }
            stats["total_documents"] += len(documents)
            stats["total_size_bytes"] += file_size
        
        # Create metadata file
        metadata = {
            "backup_name": backup_name,
            "backup_type": backup_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "collections_count": len(collections),
            "statistics": stats,
            "compressed": compress,
        }
        
        metadata_file = backup_path / "metadata.json"
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)
        
        # Compress if requested
        final_path = str(backup_path)
        if compress:
            archive_path = f"{backup_path}.tar.gz"
            shutil.make_archive(
                str(backup_path),
                "gztar",
                backup_path.parent,
                backup_path.name
            )
            shutil.rmtree(backup_path)
            final_path = archive_path
            stats["total_size_bytes"] = Path(archive_path).stat().st_size
        
        return {
            "success": True,
            "backup_name": backup_name,
            "backup_type": backup_type,
            "path": final_path,
            "created_at": metadata["created_at"],
            "statistics": stats,
            "compressed": compress,
        }
    
    async def restore_backup(
        self,
        backup_path: str,
        collections: Optional[List[str]] = None,
        drop_existing: bool = False,
    ) -> Dict[str, Any]:
        """
        Restore from a backup.
        
        Args:
            backup_path: Path to backup file or directory
            collections: Specific collections to restore (None = all)
            drop_existing: Whether to drop existing collections before restore
            
        Returns:
            Restore statistics
        """
        backup_path = Path(backup_path)
        
        # Handle compressed backups
        if backup_path.suffix == ".gz" or str(backup_path).endswith(".tar.gz"):
            extract_dir = self.backup_dir / "temp_restore"
            shutil.unpack_archive(backup_path, extract_dir)
            # Find the backup directory inside
            dirs = list(extract_dir.iterdir())
            if dirs:
                backup_path = dirs[0]
        
        # Read metadata
        metadata_file = backup_path / "metadata.json"
        if not metadata_file.exists():
            return {"success": False, "error": "Invalid backup: metadata.json not found"}
        
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
        
        # Restore collections
        restore_stats = {
            "collections": {},
            "total_documents": 0,
        }
        
        for json_file in backup_path.glob("*.json"):
            if json_file.name == "metadata.json":
                continue
            
            collection_name = json_file.stem
            
            # Skip if not in requested collections
            if collections and collection_name not in collections:
                continue
            
            with open(json_file, "r") as f:
                documents = json.load(f)
            
            collection = self.db[collection_name]
            
            # Drop existing if requested
            if drop_existing:
                await collection.drop()
            
            # Insert documents
            if documents:
                # Convert string IDs back (they'll get new ObjectIds)
                for doc in documents:
                    doc.pop("_id", None)
                
                await collection.insert_many(documents)
            
            restore_stats["collections"][collection_name] = len(documents)
            restore_stats["total_documents"] += len(documents)
        
        # Cleanup temp directory
        temp_dir = self.backup_dir / "temp_restore"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        
        return {
            "success": True,
            "backup_name": metadata["backup_name"],
            "backup_type": metadata["backup_type"],
            "original_date": metadata["created_at"],
            "restored_at": datetime.now(timezone.utc).isoformat(),
            "statistics": restore_stats,
        }
    
    async def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups"""
        backups = []
        
        for item in self.backup_dir.iterdir():
            if item.name.startswith("blackiefi_backup_"):
                backup_info = {
                    "name": item.name,
                    "path": str(item),
                    "compressed": item.suffix == ".gz" or str(item).endswith(".tar.gz"),
                    "size_bytes": item.stat().st_size,
                    "created": datetime.fromtimestamp(
                        item.stat().st_mtime,
                        tz=timezone.utc
                    ).isoformat(),
                }
                
                # Try to extract type from name
                parts = item.stem.replace(".tar", "").split("_")
                if len(parts) >= 3:
                    backup_info["type"] = parts[2]
                
                backups.append(backup_info)
        
        # Sort by creation time, newest first
        backups.sort(key=lambda x: x["created"], reverse=True)
        
        return backups
    
    async def delete_backup(self, backup_name: str) -> Dict[str, Any]:
        """Delete a backup"""
        for item in self.backup_dir.iterdir():
            if item.name.startswith(backup_name):
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
                
                return {
                    "success": True,
                    "deleted": str(item),
                }
        
        return {
            "success": False,
            "error": f"Backup not found: {backup_name}",
        }
    
    async def cleanup_old_backups(
        self,
        retention_days: int = 30,
        keep_minimum: int = 5,
    ) -> Dict[str, Any]:
        """
        Clean up old backups based on retention policy.
        
        Args:
            retention_days: Delete backups older than this
            keep_minimum: Always keep at least this many backups
        """
        backups = await self.list_backups()
        
        if len(backups) <= keep_minimum:
            return {
                "success": True,
                "deleted": [],
                "message": f"Keeping minimum {keep_minimum} backups",
            }
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        deleted = []
        
        # Keep the most recent backups
        backups_to_check = backups[keep_minimum:]
        
        for backup in backups_to_check:
            backup_date = datetime.fromisoformat(backup["created"].replace("Z", "+00:00"))
            if backup_date < cutoff_date:
                result = await self.delete_backup(backup["name"])
                if result["success"]:
                    deleted.append(backup["name"])
        
        return {
            "success": True,
            "deleted": deleted,
            "retention_days": retention_days,
            "kept_minimum": keep_minimum,
        }
    
    async def export_user_data(
        self,
        user_id: str,
        include_ai_data: bool = True,
    ) -> Dict[str, Any]:
        """
        Export all data for a specific user (GDPR compliance).
        
        Args:
            user_id: User ID to export data for
            include_ai_data: Whether to include AI/chat history
            
        Returns:
            Path to exported data file
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        export_name = f"user_export_{user_id}_{timestamp}"
        export_path = self.backup_dir / export_name
        export_path.mkdir(parents=True, exist_ok=True)
        
        user_data = {}
        
        # Export user profile
        user = await self.db.users.find_one({"_id": user_id})
        if user:
            user["_id"] = str(user["_id"])
            user.pop("password_hash", None)  # Don't export password
            user_data["profile"] = user
        
        # Export user's entities
        entities = []
        async for entity in self.db.entities.find({"owner_id": user_id}):
            entity["_id"] = str(entity["_id"])
            entities.append(entity)
        user_data["entities"] = entities
        
        # Get entity IDs for related data
        entity_ids = [e["_id"] for e in entities]
        
        # Export related data
        collections_to_export = [
            ("accounts", {"entity_id": {"$in": entity_ids}}),
            ("transactions", {"entity_id": {"$in": entity_ids}}),
            ("budgets", {"entity_id": {"$in": entity_ids}}),
            ("investments", {"entity_id": {"$in": entity_ids}}),
            ("assets", {"entity_id": {"$in": entity_ids}}),
            ("debts", {"entity_id": {"$in": entity_ids}}),
            ("goals", {"entity_id": {"$in": entity_ids}}),
            ("bills", {"entity_id": {"$in": entity_ids}}),
        ]
        
        if include_ai_data:
            collections_to_export.extend([
                ("knowledge_documents", {"user_id": user_id}),
                ("knowledge_chat_history", {"user_id": user_id}),
                ("analysis_lab_history", {"user_id": user_id}),
            ])
        
        for collection_name, query in collections_to_export:
            documents = []
            async for doc in self.db[collection_name].find(query):
                doc["_id"] = str(doc["_id"])
                documents.append(doc)
            user_data[collection_name] = documents
        
        # Write to file
        export_file = export_path / "user_data.json"
        with open(export_file, "w") as f:
            json.dump(user_data, f, default=str, indent=2)
        
        # Compress
        archive_path = f"{export_path}.zip"
        shutil.make_archive(str(export_path), "zip", export_path)
        shutil.rmtree(export_path)
        
        return {
            "success": True,
            "user_id": user_id,
            "export_path": archive_path,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "collections_exported": len(user_data),
        }
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics for monitoring"""
        stats = {
            "collections": {},
            "total_documents": 0,
            "total_size_estimate": 0,
        }
        
        all_collections = (
            self.CRITICAL_COLLECTIONS +
            self.SUPPORTING_COLLECTIONS +
            self.AI_COLLECTIONS +
            self.AUDIT_COLLECTIONS
        )
        
        for collection_name in all_collections:
            try:
                collection = self.db[collection_name]
                count = await collection.count_documents({})
                
                # Estimate size (sample first 100 docs)
                sample_size = 0
                sample_count = 0
                async for doc in collection.find({}).limit(100):
                    sample_size += len(json.dumps(doc, default=str))
                    sample_count += 1
                
                avg_doc_size = sample_size / sample_count if sample_count > 0 else 0
                estimated_size = int(avg_doc_size * count)
                
                stats["collections"][collection_name] = {
                    "documents": count,
                    "estimated_size_bytes": estimated_size,
                }
                stats["total_documents"] += count
                stats["total_size_estimate"] += estimated_size
                
            except Exception:
                stats["collections"][collection_name] = {
                    "documents": 0,
                    "error": "Collection may not exist",
                }
        
        return stats


# Singleton instance
_backup_service: Optional[BackupService] = None


def get_backup_service(db: AsyncIOMotorDatabase) -> BackupService:
    """Get or create backup service instance"""
    global _backup_service
    if _backup_service is None:
        _backup_service = BackupService(db)
    return _backup_service
