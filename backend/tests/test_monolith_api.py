"""
BlackieFi Monolith API Tests
Tests for existing monolith backend endpoints to verify they still work
after Phase 2 microservices code creation.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo",
            "password": "user123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "demo"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid",
            "password": "wrongpass"
        })
        assert response.status_code == 401


@pytest.fixture
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "demo",
        "password": "user123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestEntitiesEndpoint:
    """Entity endpoint tests"""
    
    def test_list_entities(self, auth_headers):
        """Test GET /api/entities returns list"""
        response = requests.get(f"{BASE_URL}/api/entities", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least one entity (Personal)
        assert len(data) >= 1
        # Verify entity structure
        entity = data[0]
        assert "id" in entity
        assert "name" in entity
        assert "type" in entity
    
    def test_entities_unauthorized(self):
        """Test entities endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/entities")
        assert response.status_code == 401


class TestAccountsEndpoint:
    """Account endpoint tests"""
    
    def test_list_accounts(self, auth_headers):
        """Test GET /api/accounts returns list"""
        response = requests.get(f"{BASE_URL}/api/accounts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_accounts_unauthorized(self):
        """Test accounts endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 401


class TestAssetsEndpoint:
    """Asset endpoint tests"""
    
    def test_list_assets(self, auth_headers):
        """Test GET /api/assets returns list"""
        response = requests.get(f"{BASE_URL}/api/assets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_assets_unauthorized(self):
        """Test assets endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 401


class TestCategoriesEndpoint:
    """Categories endpoint tests"""
    
    def test_list_categories(self, auth_headers):
        """Test GET /api/categories returns list"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTransactionsEndpoint:
    """Transactions endpoint tests"""
    
    def test_list_transactions(self, auth_headers):
        """Test GET /api/transactions returns list"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestBudgetsEndpoint:
    """Budgets endpoint tests"""
    
    def test_list_budgets(self, auth_headers):
        """Test GET /api/budgets returns list"""
        response = requests.get(f"{BASE_URL}/api/budgets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestGoalsEndpoint:
    """Goals endpoint tests"""
    
    def test_list_goals(self, auth_headers):
        """Test GET /api/goals returns list"""
        response = requests.get(f"{BASE_URL}/api/goals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDebtsEndpoint:
    """Debts endpoint tests"""
    
    def test_list_debts(self, auth_headers):
        """Test GET /api/debts returns list"""
        response = requests.get(f"{BASE_URL}/api/debts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestInvestmentsEndpoint:
    """Investments endpoint tests"""
    
    def test_list_investments(self, auth_headers):
        """Test GET /api/investments returns list"""
        response = requests.get(f"{BASE_URL}/api/investments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestBillsEndpoint:
    """Bills endpoint tests"""
    
    def test_list_bills(self, auth_headers):
        """Test GET /api/bills returns list"""
        response = requests.get(f"{BASE_URL}/api/bills", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestNotificationsEndpoint:
    """Notifications endpoint tests"""
    
    def test_list_notifications(self, auth_headers):
        """Test GET /api/notifications returns list"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
