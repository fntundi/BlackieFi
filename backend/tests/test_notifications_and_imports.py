"""
Test suite for BlackieFi new features:
- Notifications API (GET, unread-count, preferences, check-alerts)
- PDF Import endpoint
- Verifies code cleanup (no Go files)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "demo"
TEST_PASSWORD = "user123"


class TestSetup:
    """Setup tests - verify environment and authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def entity_id(self, auth_headers):
        """Get or create test entity"""
        response = requests.get(f"{BASE_URL}/api/entities", headers=auth_headers)
        assert response.status_code == 200
        entities = response.json()
        if entities:
            return entities[0]["id"]
        # Create entity if none exists
        response = requests.post(
            f"{BASE_URL}/api/entities",
            headers=auth_headers,
            json={"name": "TEST_Entity", "type": "personal"}
        )
        assert response.status_code in [200, 201]
        return response.json()["id"]
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health check passed")


class TestNotificationsAPI:
    """Test Notifications API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def entity_id(self, auth_headers):
        """Get entity ID for testing"""
        response = requests.get(f"{BASE_URL}/api/entities", headers=auth_headers)
        assert response.status_code == 200
        entities = response.json()
        if entities:
            return entities[0]["id"]
        return None
    
    def test_get_notifications(self, auth_headers):
        """Test GET /api/notifications returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/notifications returned {len(data)} notifications")
    
    def test_get_notifications_with_params(self, auth_headers):
        """Test GET /api/notifications with query params"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=10&unread_only=false",
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✓ GET /api/notifications with params works")
    
    def test_get_unread_count(self, auth_headers):
        """Test GET /api/notifications/unread-count returns count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        print(f"✓ GET /api/notifications/unread-count returned count: {data['unread_count']}")
    
    def test_get_notification_preferences(self, auth_headers):
        """Test GET /api/notifications/preferences returns defaults"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Check default preferences exist
        assert "email_notifications" in data, "Should have email_notifications"
        assert "push_notifications" in data, "Should have push_notifications"
        assert "budget_alerts" in data, "Should have budget_alerts"
        assert "bill_reminders" in data, "Should have bill_reminders"
        print(f"✓ GET /api/notifications/preferences returned defaults: {list(data.keys())}")
    
    def test_update_notification_preferences(self, auth_headers):
        """Test PUT /api/notifications/preferences updates prefs"""
        new_prefs = {
            "email_notifications": True,
            "push_notifications": False,
            "budget_alert_threshold": 90
        }
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers,
            json=new_prefs
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Update should return success"
        print("✓ PUT /api/notifications/preferences updated successfully")
    
    def test_check_alerts(self, auth_headers, entity_id):
        """Test POST /api/notifications/check-alerts triggers alert checks"""
        if not entity_id:
            pytest.skip("No entity available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/check-alerts?entity_id={entity_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data, "Response should contain success"
        assert "alerts_triggered" in data, "Response should contain alerts_triggered"
        print(f"✓ POST /api/notifications/check-alerts triggered {data.get('alerts_triggered', 0)} alerts")
    
    def test_mark_all_read(self, auth_headers):
        """Test POST /api/notifications/mark-all-read"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/mark-all-read",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ POST /api/notifications/mark-all-read updated {data.get('updated_count', 0)} notifications")


class TestImportsAPI:
    """Test Import API endpoints including PDF"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def entity_and_account(self, auth_token):
        """Get entity and account IDs for testing"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # Get entity
        response = requests.get(f"{BASE_URL}/api/entities", headers=headers)
        assert response.status_code == 200
        entities = response.json()
        if not entities:
            return None, None
        entity_id = entities[0]["id"]
        
        # Get account
        response = requests.get(f"{BASE_URL}/api/accounts?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        accounts = response.json()
        if not accounts:
            # Create test account
            response = requests.post(
                f"{BASE_URL}/api/accounts",
                headers=headers,
                json={
                    "entity_id": entity_id,
                    "name": "TEST_Import_Account",
                    "type": "checking",
                    "balance": 1000
                }
            )
            if response.status_code in [200, 201]:
                account_id = response.json()["id"]
            else:
                return entity_id, None
        else:
            account_id = accounts[0]["id"]
        
        return entity_id, account_id
    
    def test_get_import_batches(self, auth_headers):
        """Test GET /api/imports/batches returns list"""
        response = requests.get(
            f"{BASE_URL}/api/imports/batches",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/imports/batches returned {len(data)} batches")
    
    def test_pdf_endpoint_exists(self, auth_token, entity_and_account):
        """Test POST /api/imports/pdf endpoint exists and accepts requests"""
        entity_id, account_id = entity_and_account
        if not entity_id or not account_id:
            pytest.skip("No entity/account available for testing")
        
        # Create a minimal PDF-like file for testing
        # This tests that the endpoint exists and handles the request
        import io
        
        # Create a simple test file (not a real PDF, just to test endpoint)
        test_content = b"%PDF-1.4\nTest PDF content"
        files = {
            'file': ('test.pdf', io.BytesIO(test_content), 'application/pdf')
        }
        data = {
            'entity_id': entity_id,
            'account_id': account_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/imports/pdf",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        
        # The endpoint should exist - it may return 200 (success) or 400 (invalid PDF)
        # but NOT 404 (not found) or 405 (method not allowed)
        assert response.status_code not in [404, 405], f"PDF endpoint should exist, got {response.status_code}"
        print(f"✓ POST /api/imports/pdf endpoint exists (status: {response.status_code})")
    
    def test_csv_endpoint_exists(self, auth_token, entity_and_account):
        """Test POST /api/imports/csv endpoint exists"""
        entity_id, account_id = entity_and_account
        if not entity_id or not account_id:
            pytest.skip("No entity/account available for testing")
        
        import io
        
        # Create a simple CSV file
        csv_content = "date,description,amount\n2025-01-15,Test Transaction,100.00"
        files = {
            'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')
        }
        data = {
            'entity_id': entity_id,
            'account_id': account_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/imports/csv",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        
        # Should return 200 for successful import
        assert response.status_code == 200, f"CSV import should work, got {response.status_code}: {response.text}"
        result = response.json()
        assert result.get("success") == True
        print(f"✓ POST /api/imports/csv imported {result.get('transactions_imported', 0)} transactions")


class TestCodeCleanup:
    """Test that obsolete Go files have been removed"""
    
    def test_no_go_files_in_backend(self):
        """Verify no .go files exist in /app/backend"""
        import subprocess
        result = subprocess.run(
            ["find", "/app/backend", "-name", "*.go", "-type", "f"],
            capture_output=True,
            text=True
        )
        go_files = result.stdout.strip()
        assert go_files == "", f"Found Go files that should be removed: {go_files}"
        print("✓ No Go files found in /app/backend - cleanup verified")


class TestREADME:
    """Test README.md exists with demo credentials"""
    
    def test_readme_exists(self):
        """Verify README.md exists at /app/README.md"""
        import os
        assert os.path.exists("/app/README.md"), "README.md should exist at /app/README.md"
        print("✓ README.md exists")
    
    def test_readme_has_demo_credentials(self):
        """Verify README.md contains demo credentials"""
        with open("/app/README.md", "r") as f:
            content = f.read()
        
        assert "demo" in content.lower(), "README should mention demo username"
        assert "user123" in content, "README should contain password user123"
        print("✓ README.md contains demo credentials")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
