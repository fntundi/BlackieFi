"""
Backend Authentication API Tests for BlackieFi 3.0
Tests login, registration, profile, and password reset endpoints
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://wealth-microservices.preview.emergentagent.com"


class TestAuthLogin:
    """Test login endpoint /api/auth/login"""
    
    def test_login_demo_user_success(self):
        """Test login with demo user credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "demo", "password": "user123"},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == "demo", "Username should be 'demo'"
        assert data["user"]["email"] == "demo@example.com", "Email should match"
        assert isinstance(data["token"], str), "Token should be a string"
        assert len(data["token"]) > 50, "Token should be a valid JWT"
    
    def test_login_admin_user_success(self):
        """Test login with admin user credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "P@ssw0rd"},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == "admin", "Username should be 'admin'"
        assert data["user"]["role"] == "admin", "Role should be 'admin'"
    
    def test_login_invalid_username(self):
        """Test login with invalid username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "nonexistent_user", "password": "wrongpass"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_login_invalid_password(self):
        """Test login with valid username but wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "demo", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_login_empty_credentials(self):
        """Test login with empty credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "", "password": ""},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 or 422
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"


class TestAuthMe:
    """Test /api/auth/me endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for demo user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "demo", "password": "user123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")
    
    def test_get_me_authenticated(self, auth_token):
        """Test getting current user profile with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert "username" in data, "Response should contain username"
        assert "email" in data, "Response should contain email"
        assert data["username"] == "demo", "Username should be 'demo'"
    
    def test_get_me_unauthenticated(self):
        """Test getting current user profile without token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
    
    def test_get_me_invalid_token(self):
        """Test getting current user profile with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid_token_here"
            }
        )
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"


class TestAuthRegister:
    """Test /api/auth/register endpoint"""
    
    def test_register_new_user(self):
        """Test registering a new user"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": f"TEST_user_{unique_id}",
                "email": f"TEST_user_{unique_id}@test.com",
                "password": "TestPass123!",
                "full_name": "Test User"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == f"TEST_user_{unique_id}", "Username should match"
        assert data["user"]["email"] == f"TEST_user_{unique_id}@test.com", "Email should match"
    
    def test_register_duplicate_username(self):
        """Test registering with existing username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": "demo",  # Already exists
                "email": "new_email@test.com",
                "password": "TestPass123!",
                "full_name": "Test User"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 409 Conflict
        assert response.status_code == 409, f"Expected 409, got {response.status_code}"
    
    def test_register_duplicate_email(self):
        """Test registering with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": "new_unique_user",
                "email": "demo@example.com",  # Already exists
                "password": "TestPass123!",
                "full_name": "Test User"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 409 Conflict
        assert response.status_code == 409, f"Expected 409, got {response.status_code}"


class TestAuthProfile:
    """Test /api/auth/profile endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for demo user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "demo", "password": "user123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")
    
    def test_update_profile_full_name(self, auth_token):
        """Test updating user profile full name"""
        response = requests.put(
            f"{BASE_URL}/api/auth/profile",
            json={"full_name": "Demo User Updated"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["full_name"] == "Demo User Updated", "Full name should be updated"
        
        # Revert the change
        requests.put(
            f"{BASE_URL}/api/auth/profile",
            json={"full_name": "Demo User"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )


class TestPasswordReset:
    """Test password reset endpoints"""
    
    def test_request_password_reset(self):
        """Test requesting password reset"""
        response = requests.post(
            f"{BASE_URL}/api/auth/password-reset/request",
            json={"email": "demo@example.com"},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "message" in data, "Response should contain message"
    
    def test_request_password_reset_nonexistent_email(self):
        """Test requesting password reset for non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/password-reset/request",
            json={"email": "nonexistent@example.com"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should still return 200 to prevent email enumeration
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_reset_password_invalid_token(self):
        """Test resetting password with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/password-reset",
            json={"token": "invalid_token", "new_password": "NewPass123!"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
