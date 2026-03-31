"""
Post-Security Fix QA Tests
Tests for: ai-status endpoint, metrics protection, login/register
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
METRICS_TOKEN = os.environ.get('METRICS_TOKEN', 'dev-metrics-token')


class TestAIStatusEndpoint:
    """Tests for GET /api/settings/ai-status"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_ai_status_requires_auth(self):
        """AI status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/ai-status")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("PASS: ai-status requires authentication")
    
    def test_ai_status_returns_expected_structure(self, auth_token):
        """AI status returns all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/settings/ai-status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all expected fields exist
        expected_fields = ["system_ai_enabled", "user_ai_enabled", "effective_ai_enabled", "llm_provider", "llm_model"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify field types
        assert isinstance(data["system_ai_enabled"], bool), "system_ai_enabled should be bool"
        assert isinstance(data["user_ai_enabled"], bool), "user_ai_enabled should be bool"
        assert isinstance(data["effective_ai_enabled"], bool), "effective_ai_enabled should be bool"
        assert isinstance(data["llm_provider"], str), "llm_provider should be string"
        # llm_model can be None or string
        assert data["llm_model"] is None or isinstance(data["llm_model"], str), "llm_model should be string or None"
        
        print(f"PASS: ai-status returns expected structure: {data}")


class TestMetricsEndpoint:
    """Tests for /api/metrics protection"""
    
    def test_metrics_401_without_token(self):
        """Metrics endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/metrics returns 401 without token")
    
    def test_metrics_401_with_wrong_token(self):
        """Metrics endpoint returns 401 with wrong token"""
        response = requests.get(
            f"{BASE_URL}/api/metrics",
            headers={"Authorization": "Bearer wrong-token"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/metrics returns 401 with wrong token")
    
    def test_metrics_200_with_correct_token(self):
        """Metrics endpoint returns 200 with correct METRICS_TOKEN"""
        response = requests.get(
            f"{BASE_URL}/api/metrics",
            headers={"Authorization": f"Bearer {METRICS_TOKEN}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify it returns Prometheus format
        content = response.text
        assert "# HELP" in content or "# TYPE" in content, "Should return Prometheus format"
        print("PASS: /api/metrics returns 200 with correct token")


class TestAuthEndpoints:
    """Tests for login and register endpoints"""
    
    def test_login_success(self):
        """Login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == "admin", "Username should be admin"
        print("PASS: Admin login successful")
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid login returns 401")
    
    def test_register_new_user(self):
        """Register a new test user"""
        import uuid
        test_username = f"TEST_QA_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": test_username,
            "email": f"{test_username}@test.com",
            "password": "TestPass123!",
            "full_name": "Test QA User"
        })
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        
        data = response.json()
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == test_username, "Username should match"
        print(f"PASS: User registration successful for {test_username}")


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Health endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "ok", "Status should be ok"
        print("PASS: Health check returns ok")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
