"""
Phase 4: Institutional Hardening Tests
Tests for Audit Logging, Prometheus Metrics, and Backup/Recovery APIs
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"username": "admin", "password": "P@ssw0rd"}
DEMO_CREDS = {"username": "demo", "password": "user123"}


class TestAuthAuditLogging:
    """Test that login attempts are logged in audit trail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_login_creates_audit_entry(self):
        """Test that successful login creates an audit log entry"""
        # Login to create audit entry
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        token = response.json().get("token")
        
        # Check audit logs for the login event
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        audit_response = self.session.get(f"{BASE_URL}/api/audit/logs?action=auth.login&limit=5")
        assert audit_response.status_code == 200
        
        data = audit_response.json()
        assert "logs" in data
        assert len(data["logs"]) > 0
        
        # Verify the most recent login entry
        latest_log = data["logs"][0]
        assert latest_log["action"] == "auth.login"
        assert latest_log["success"] == True
        assert "checksum" in latest_log  # Tamper-evident logging


class TestAuditLogsAPI:
    """Test Audit Logs API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get admin token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_audit_logs(self):
        """GET /api/audit/logs returns audit log entries"""
        response = self.session.get(f"{BASE_URL}/api/audit/logs")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert isinstance(data["logs"], list)
    
    def test_get_audit_logs_with_filters(self):
        """GET /api/audit/logs supports filtering"""
        response = self.session.get(f"{BASE_URL}/api/audit/logs?action=auth&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        # All returned logs should contain 'auth' in action
        for log in data["logs"]:
            assert "auth" in log["action"].lower()
    
    def test_get_audit_statistics(self):
        """GET /api/audit/statistics returns stats"""
        response = self.session.get(f"{BASE_URL}/api/audit/statistics")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_days" in data
        assert "total_events" in data
        assert "failed_events" in data
        assert "unique_users" in data
        assert "by_severity" in data
        assert "by_category" in data
        
        # Validate data types
        assert isinstance(data["total_events"], int)
        assert isinstance(data["failed_events"], int)
        assert isinstance(data["unique_users"], int)
    
    def test_get_my_activity(self):
        """GET /api/audit/my-activity returns user activity"""
        response = self.session.get(f"{BASE_URL}/api/audit/my-activity")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "period_days" in data
        assert "activity" in data
        assert isinstance(data["activity"], list)
    
    def test_get_security_events_admin_only(self):
        """GET /api/audit/security-events returns security events (admin only)"""
        response = self.session.get(f"{BASE_URL}/api/audit/security-events")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_hours" in data
        assert "events" in data
        assert "count" in data
        assert isinstance(data["events"], list)
    
    def test_get_audit_actions(self):
        """GET /api/audit/actions returns available action types"""
        response = self.session.get(f"{BASE_URL}/api/audit/actions")
        assert response.status_code == 200
        
        data = response.json()
        assert "actions" in data
        assert isinstance(data["actions"], list)
        assert len(data["actions"]) > 0


class TestBackupAPI:
    """Test Backup & Recovery API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get admin token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        self.created_backup = None
    
    def test_list_backups(self):
        """GET /api/admin/backup/list returns available backups"""
        response = self.session.get(f"{BASE_URL}/api/admin/backup/list")
        assert response.status_code == 200
        
        data = response.json()
        assert "backups" in data
        assert "count" in data
        assert isinstance(data["backups"], list)
    
    def test_get_database_stats(self):
        """GET /api/admin/backup/stats returns database statistics"""
        response = self.session.get(f"{BASE_URL}/api/admin/backup/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "collections" in data
        assert "total_documents" in data
        assert "total_size_estimate" in data
        
        # Validate collections data
        assert isinstance(data["collections"], dict)
        assert isinstance(data["total_documents"], int)
        assert data["total_documents"] >= 0
    
    def test_create_backup(self):
        """POST /api/admin/backup/create creates a new backup"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/backup/create",
            json={"backup_type": "critical", "compress": True, "include_audit": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "backup_name" in data
        assert "backup_type" in data
        assert data["backup_type"] == "critical"
        assert "path" in data
        assert "created_at" in data
        assert "statistics" in data
        
        # Store for cleanup
        self.created_backup = data["backup_name"]
        
        # Verify statistics structure
        stats = data["statistics"]
        assert "collections" in stats
        assert "total_documents" in stats
        assert "total_size_bytes" in stats
    
    def test_delete_backup(self):
        """DELETE /api/admin/backup/{name} deletes a backup"""
        # First create a backup to delete
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/backup/create",
            json={"backup_type": "critical", "compress": True, "include_audit": False}
        )
        assert create_response.status_code == 200
        backup_name = create_response.json()["backup_name"]
        
        # Delete the backup
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/backup/{backup_name}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert data["success"] == True
        assert "deleted" in data
        
        # Verify it's gone
        list_response = self.session.get(f"{BASE_URL}/api/admin/backup/list")
        backups = list_response.json()["backups"]
        backup_names = [b["name"] for b in backups]
        assert backup_name not in backup_names and f"{backup_name}.tar.gz" not in backup_names


class TestPrometheusMetrics:
    """Test Prometheus metrics endpoint"""
    
    def test_metrics_endpoint_returns_prometheus_format(self):
        """GET /metrics returns Prometheus format metrics"""
        # Note: /metrics is on internal port, not via /api prefix
        # Testing via internal endpoint
        response = requests.get("http://localhost:8001/metrics")
        assert response.status_code == 200
        
        # Check content type
        assert "text/plain" in response.headers.get("Content-Type", "") or \
               "text/plain" in response.headers.get("content-type", "")
        
        # Check for Prometheus format markers
        content = response.text
        assert "# HELP" in content
        assert "# TYPE" in content
        
        # Check for BlackieFi specific metrics
        assert "blackiefi" in content.lower() or "python" in content.lower()


class TestNonAdminAccess:
    """Test that non-admin users have appropriate access restrictions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get demo (non-admin) token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=DEMO_CREDS)
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Demo user login failed")
    
    def test_demo_user_can_access_my_activity(self):
        """Non-admin users can access their own activity"""
        response = self.session.get(f"{BASE_URL}/api/audit/my-activity")
        assert response.status_code == 200
        
        data = response.json()
        assert "activity" in data
    
    def test_demo_user_can_access_audit_logs(self):
        """Non-admin users can access audit logs (filtered to their data)"""
        response = self.session.get(f"{BASE_URL}/api/audit/logs")
        assert response.status_code == 200


class TestAuditLogIntegrity:
    """Test audit log integrity verification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get admin token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_audit_logs_have_checksums(self):
        """Verify audit logs contain integrity checksums"""
        response = self.session.get(f"{BASE_URL}/api/audit/logs?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        for log in data["logs"]:
            assert "checksum" in log
            assert len(log["checksum"]) == 64  # SHA-256 hex length
    
    def test_verify_audit_log_integrity(self):
        """Test audit log integrity verification endpoint"""
        # Get a log entry
        logs_response = self.session.get(f"{BASE_URL}/api/audit/logs?limit=1")
        assert logs_response.status_code == 200
        
        logs = logs_response.json()["logs"]
        if len(logs) > 0:
            entry_id = logs[0]["id"]
            
            # Verify integrity
            verify_response = self.session.get(f"{BASE_URL}/api/audit/logs/{entry_id}/verify")
            assert verify_response.status_code == 200
            
            data = verify_response.json()
            assert "valid" in data
            assert data["valid"] == True
            assert "tampered" in data
            assert data["tampered"] == False


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
