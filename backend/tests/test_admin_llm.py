"""
Backend API tests for Multi-LLM Integration System
Tests admin LLM configuration endpoints, provider management, and access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "http://localhost:8001"

# Test credentials
ADMIN_CREDENTIALS = {"username": "demo", "password": "user123"}
REGULAR_USER_CREDENTIALS = {"username": "TEST_llm_user", "email": "TEST_llm@example.com", "password": "testpass123"}


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self, api_client):
        """Test admin user can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "demo"
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self, api_client):
        """Test login fails with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestLLMProvidersEndpoint:
    """Tests for GET /api/admin/llm/providers"""
    
    def test_get_providers_as_admin(self, authenticated_admin_client):
        """Admin can get list of LLM providers"""
        response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers")
        assert response.status_code == 200
        
        data = response.json()
        assert "providers" in data
        assert "active_provider" in data
        assert "system_ai_enabled" in data
        
        # Verify provider structure
        providers = data["providers"]
        assert len(providers) >= 3  # openrouter, emergent, ollama
        
        provider_ids = [p["id"] for p in providers]
        assert "openrouter" in provider_ids
        assert "emergent" in provider_ids
        assert "ollama" in provider_ids
        
        # Verify provider fields
        for provider in providers:
            assert "id" in provider
            assert "name" in provider
            assert "enabled" in provider
            assert "has_api_key" in provider
            assert "default_model" in provider
            assert "requires_api_key" in provider
            assert "is_local" in provider
    
    def test_get_providers_non_admin_forbidden(self, authenticated_regular_client):
        """Non-admin users cannot access providers endpoint"""
        response = authenticated_regular_client.get(f"{BASE_URL}/api/admin/llm/providers")
        assert response.status_code == 403
        assert "Admin access required" in response.json().get("detail", "")
    
    def test_get_providers_unauthenticated(self, api_client):
        """Unauthenticated requests are rejected"""
        response = api_client.get(f"{BASE_URL}/api/admin/llm/providers")
        assert response.status_code == 401


class TestProviderModelsEndpoint:
    """Tests for GET /api/admin/llm/providers/{provider}/models"""
    
    def test_get_emergent_models(self, authenticated_admin_client):
        """Get available models for Emergent provider"""
        response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers/emergent/models")
        assert response.status_code == 200
        
        models = response.json()
        assert isinstance(models, list)
        assert len(models) > 0
        
        # Verify model structure
        for model in models:
            assert "id" in model
            assert "name" in model
        
        # Verify expected models exist
        model_ids = [m["id"] for m in models]
        assert "gpt-5.2" in model_ids
    
    def test_get_openrouter_models(self, authenticated_admin_client):
        """Get available models for OpenRouter provider"""
        response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers/openrouter/models")
        assert response.status_code == 200
        
        models = response.json()
        assert isinstance(models, list)
        assert len(models) > 0
    
    def test_get_ollama_models(self, authenticated_admin_client):
        """Get available models for Ollama provider"""
        response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers/ollama/models")
        assert response.status_code == 200
        
        models = response.json()
        assert isinstance(models, list)
        assert len(models) > 0


class TestUpdateProviderConfig:
    """Tests for PUT /api/admin/llm/providers/{provider}"""
    
    def test_enable_provider(self, authenticated_admin_client):
        """Admin can enable a provider"""
        response = authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/openrouter",
            json={"enabled": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # Verify change persisted
        get_response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers")
        providers = get_response.json()["providers"]
        openrouter = next(p for p in providers if p["id"] == "openrouter")
        assert openrouter["enabled"] is True
    
    def test_disable_provider(self, authenticated_admin_client):
        """Admin can disable a provider"""
        response = authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/openrouter",
            json={"enabled": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_update_default_model(self, authenticated_admin_client):
        """Admin can update default model for a provider"""
        response = authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/emergent",
            json={"default_model": "gpt-4o"}
        )
        assert response.status_code == 200
        
        # Verify change persisted
        get_response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers")
        providers = get_response.json()["providers"]
        emergent = next(p for p in providers if p["id"] == "emergent")
        assert emergent["default_model"] == "gpt-4o"
        
        # Reset to original
        authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/emergent",
            json={"default_model": "gpt-5.2"}
        )
    
    def test_update_invalid_provider(self, authenticated_admin_client):
        """Updating invalid provider returns error"""
        response = authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/invalid_provider",
            json={"enabled": True}
        )
        assert response.status_code == 400
    
    def test_update_provider_non_admin_forbidden(self, authenticated_regular_client):
        """Non-admin cannot update provider config"""
        response = authenticated_regular_client.put(
            f"{BASE_URL}/api/admin/llm/providers/emergent",
            json={"enabled": False}
        )
        assert response.status_code == 403


class TestSetActiveProvider:
    """Tests for POST /api/admin/llm/providers/{provider}/set-active"""
    
    def test_set_active_provider(self, authenticated_admin_client):
        """Admin can set active provider"""
        # First ensure emergent is enabled
        authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/emergent",
            json={"enabled": True}
        )
        
        response = authenticated_admin_client.post(
            f"{BASE_URL}/api/admin/llm/providers/emergent/set-active"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # Verify change persisted
        get_response = authenticated_admin_client.get(f"{BASE_URL}/api/admin/llm/providers")
        assert get_response.json()["active_provider"] == "emergent"
    
    def test_set_active_disabled_provider_fails(self, authenticated_admin_client):
        """Cannot set disabled provider as active"""
        # First disable openrouter
        authenticated_admin_client.put(
            f"{BASE_URL}/api/admin/llm/providers/openrouter",
            json={"enabled": False}
        )
        
        response = authenticated_admin_client.post(
            f"{BASE_URL}/api/admin/llm/providers/openrouter/set-active"
        )
        assert response.status_code == 400
        assert "must be enabled first" in response.json().get("detail", "")
    
    def test_set_active_invalid_provider(self, authenticated_admin_client):
        """Setting invalid provider as active returns error"""
        response = authenticated_admin_client.post(
            f"{BASE_URL}/api/admin/llm/providers/invalid_provider/set-active"
        )
        assert response.status_code == 400
    
    def test_set_active_non_admin_forbidden(self, authenticated_regular_client):
        """Non-admin cannot set active provider"""
        response = authenticated_regular_client.post(
            f"{BASE_URL}/api/admin/llm/providers/emergent/set-active"
        )
        assert response.status_code == 403


class TestSystemSettings:
    """Tests for system AI settings"""
    
    def test_get_settings(self, authenticated_admin_client):
        """Admin can get system settings"""
        response = authenticated_admin_client.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "ai_enabled" in data
    
    def test_toggle_system_ai(self, authenticated_admin_client):
        """Admin can toggle system-wide AI"""
        # Get current state
        get_response = authenticated_admin_client.get(f"{BASE_URL}/api/settings")
        current_state = get_response.json().get("ai_enabled", False)
        
        # Toggle
        response = authenticated_admin_client.put(
            f"{BASE_URL}/api/settings",
            json={"ai_enabled": not current_state}
        )
        assert response.status_code == 200
        
        # Verify change
        verify_response = authenticated_admin_client.get(f"{BASE_URL}/api/settings")
        assert verify_response.json()["ai_enabled"] == (not current_state)
        
        # Reset to original
        authenticated_admin_client.put(
            f"{BASE_URL}/api/settings",
            json={"ai_enabled": current_state}
        )


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture
def regular_user_token(api_client):
    """Get or create regular user and return token"""
    # Try to login first
    login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": REGULAR_USER_CREDENTIALS["username"],
        "password": REGULAR_USER_CREDENTIALS["password"]
    })
    
    if login_response.status_code == 200:
        return login_response.json().get("token")
    
    # Register new user
    register_response = api_client.post(f"{BASE_URL}/api/auth/register", json=REGULAR_USER_CREDENTIALS)
    if register_response.status_code == 201:
        return register_response.json().get("token")
    
    pytest.skip("Could not create regular user - skipping non-admin tests")


@pytest.fixture
def authenticated_regular_client(regular_user_token):
    """Session with regular user auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {regular_user_token}"
    })
    return session
