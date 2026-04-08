"""
BlackieFi 3.0 - Preview API Regression Tests
Tests that existing preview API endpoints still work
"""
import pytest
import requests
import os

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPreviewAPIHealth:
    """Verify preview API endpoints still work"""
    
    def test_api_health_endpoint(self):
        """GET /api/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health endpoint failed: {response.status_code}"
        
        data = response.json()
        assert 'status' in data, "Health response should have 'status' field"
        print(f"PASS: /api/health returns {data}")
    
    def test_auth_health_endpoint(self):
        """GET /api/auth/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/auth/health", timeout=10)
        assert response.status_code == 200, f"Auth health endpoint failed: {response.status_code}"
        
        data = response.json()
        assert 'status' in data, "Auth health response should have 'status' field"
        print(f"PASS: /api/auth/health returns {data}")


class TestPreviewAPIAuth:
    """Test authentication endpoints"""
    
    def test_login_with_demo_credentials(self):
        """POST /api/auth/login with demo credentials should return token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@blackiefi.com",
                "password": "Demo123!"
            },
            timeout=10
        )
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert 'token' in data or 'access_token' in data, "Login response should have token"
        print(f"PASS: Login successful with demo credentials")
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@test.com",
                "password": "wrongpassword"
            },
            timeout=10
        )
        
        assert response.status_code in [401, 400], f"Expected 401/400 for invalid login, got: {response.status_code}"
        print(f"PASS: Invalid login correctly rejected with status {response.status_code}")


class TestPreviewAPIDashboard:
    """Test dashboard endpoints with authentication"""
    
    @pytest.fixture
    def auth_data(self):
        """Get authentication token and entity_id"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@blackiefi.com",
                "password": "Demo123!"
            },
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get('token') or data.get('access_token')
            # Get personal_entity_id from user object
            user = data.get('user', {})
            entity_id = user.get('personal_entity_id') or data.get('entity_id')
            return {"token": token, "entity_id": entity_id}
        pytest.skip("Could not get auth token")
    
    def test_entities_endpoint(self, auth_data):
        """GET /api/entities/ should return entities list"""
        headers = {"Authorization": f"Bearer {auth_data['token']}"}
        # Use trailing slash to avoid 307 redirect
        response = requests.get(
            f"{BASE_URL}/api/entities/",
            headers=headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"Entities endpoint failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Entities should return a list"
        print(f"PASS: Entities endpoint returns {len(data)} entities")
    
    def test_dashboard_unified_endpoint(self, auth_data):
        """GET /api/dashboard/unified should return unified dashboard data"""
        headers = {
            "Authorization": f"Bearer {auth_data['token']}",
            "X-Entity-ID": auth_data['entity_id'] or ""
        }
        response = requests.get(
            f"{BASE_URL}/api/dashboard/unified",
            headers=headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"Dashboard unified failed: {response.status_code}"
        data = response.json()
        assert 'net_worth' in data or 'total_balance' in data or 'entities' in data, \
            "Dashboard should return financial data"
        print(f"PASS: Dashboard unified endpoint returns data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
